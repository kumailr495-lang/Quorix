// Grid navigation over the whole building: walkable mask from room rectangles minus inflated colliders; A* + line-of-sight smoothing.
// Floors may step (stadium aisles): the grid is 2D, floorY() gives the height. Seat rows are colliders, so paths use the aisles.
export class Nav {
  constructor(rects, colliders, radius = 0.32, cell = 0.4, bounds = [-40, -36, 40, 26]) {
    this.cell = cell; this.x0 = bounds[0]; this.z0 = bounds[1]; this.w = Math.ceil((bounds[2] - bounds[0]) / cell); this.h = Math.ceil((bounds[3] - bounds[1]) / cell); this.ok = new Uint8Array(this.w * this.h);
    for (let j = 0; j < this.h; j++) for (let i = 0; i < this.w; i++) { const x = this.x0 + (i + 0.5) * cell, z = this.z0 + (j + 0.5) * cell; let inside = false;
      for (const [a, b, c, d] of rects) if (x >= a + radius * 0.5 && x <= c - radius * 0.5 && z >= b + radius * 0.5 && z <= d - radius * 0.5) { inside = true; break; } this.ok[j * this.w + i] = inside ? 1 : 0; }
    this.block(colliders, radius);
  }
  block(colliders, r) {
    for (const c of colliders) { if (c.nonav) continue; const i0 = Math.floor((c.x0 - r - this.x0) / this.cell), i1 = Math.ceil((c.x1 + r - this.x0) / this.cell), j0 = Math.floor((c.z0 - r - this.z0) / this.cell), j1 = Math.ceil((c.z1 + r - this.z0) / this.cell);
      for (let j = Math.max(0, j0); j < Math.min(this.h, j1); j++) for (let i = Math.max(0, i0); i < Math.min(this.w, i1); i++) { const x = this.x0 + (i + 0.5) * this.cell, z = this.z0 + (j + 0.5) * this.cell;
        const dx = Math.max(c.x0 - x, 0, x - c.x1), dz = Math.max(c.z0 - z, 0, z - c.z1); if (dx * dx + dz * dz < r * r) this.ok[j * this.w + i] = 0; } }
  }
  idx(x, z) { const i = Math.floor((x - this.x0) / this.cell), j = Math.floor((z - this.z0) / this.cell); return (i < 0 || j < 0 || i >= this.w || j >= this.h) ? -1 : j * this.w + i; }
  walkable(x, z) { const k = this.idx(x, z); return k >= 0 && this.ok[k] === 1; }
  nearest(x, z) {
    if (this.walkable(x, z)) return [x, z]; for (let r = 1; r < 14; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) { if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
      const px = x + di * this.cell, pz = z + dj * this.cell; if (this.walkable(px, pz)) return [px, pz]; } return null;
  }
  los(ax, az, bx, bz) { const d = Math.hypot(bx - ax, bz - az), n = Math.ceil(d / (this.cell * 0.5)); for (let s = 1; s < n; s++) { const t = s / n; if (!this.walkable(ax + (bx - ax) * t, az + (bz - az) * t)) return false; } return true; }
  // A* (octile) on typed arrays + line-of-sight smoothing; results cached by start/end cell
  path(ax, az, bx, bz) {
    const s = this.nearest(ax, az), e = this.nearest(bx, bz); if (!s || !e) return null; const si = this.idx(s[0], s[1]), ei = this.idx(e[0], e[1]), key = si * 131072 + ei;
    this.cache = this.cache || new Map(); const hit = this.cache.get(key); if (hit) { const p = hit.map((q) => q.slice()); p[0] = [s[0], s[1]]; p[p.length - 1] = [e[0], e[1]]; return p; }
    const w = this.w, N = w * this.h; if (!this.G || this.G.length !== N) { this.G = new Float32Array(N); this.FROM = new Int32Array(N); this.STAMP = new Int32Array(N); this.CLOSED = new Int32Array(N); this.HEAP = new Int32Array(N * 4); this.HF = new Float32Array(N * 4); this.stamp = 0; }
    const G = this.G, FROM = this.FROM, ST = this.STAMP, CL = this.CLOSED, H = this.HEAP, HF = this.HF, stamp = ++this.stamp; let n = 0;
    const push = (f, v) => { let i = n++; while (i > 0) { const p = (i - 1) >> 1; if (HF[p] <= f) break; H[i] = H[p]; HF[i] = HF[p]; i = p; } H[i] = v; HF[i] = f; };
    const pop = () => { const top = H[0], lv = H[--n], lf = HF[n]; let i = 0; for (;;) { const a = 2 * i + 1; if (a >= n) break; const c = a + 1 < n && HF[a + 1] < HF[a] ? a + 1 : a; if (HF[c] >= lf) break; H[i] = H[c]; HF[i] = HF[c]; i = c; } H[i] = lv; HF[i] = lf; return top; };
    const ex = ei % w, ey = (ei / w) | 0, hcost = (x, y) => { const dx = Math.abs(x - ex), dy = Math.abs(y - ey); return dx + dy - 0.586 * Math.min(dx, dy); };
    G[si] = 0; ST[si] = stamp; FROM[si] = -1; push(hcost(si % w, (si / w) | 0), si); let found = false;
    const DX = [1, -1, 0, 0, 1, 1, -1, -1], DY = [0, 0, 1, -1, 1, -1, 1, -1], DC = [1, 1, 1, 1, 1.414, 1.414, 1.414, 1.414];
    while (n > 0 && n < H.length - 8) { const c = pop(); if (CL[c] === stamp) continue; CL[c] = stamp; if (c === ei) { found = true; break; } const cx = c % w, cy = (c / w) | 0, gc = G[c];
      for (let k = 0; k < 8; k++) { const nx = cx + DX[k], ny = cy + DY[k]; if (nx < 0 || ny < 0 || nx >= w || ny >= this.h) continue; const ni = ny * w + nx; if (!this.ok[ni] || CL[ni] === stamp) continue;
        if (k >= 4 && (!this.ok[cy * w + nx] || !this.ok[ny * w + cx])) continue; const ng = gc + DC[k]; if (ST[ni] !== stamp || ng < G[ni]) { ST[ni] = stamp; G[ni] = ng; FROM[ni] = c; push(ng + hcost(nx, ny), ni); } } }
    if (!found) return null; const pts = []; for (let c = ei; c !== -1; c = FROM[c]) pts.push([this.x0 + ((c % w) + 0.5) * this.cell, this.z0 + (((c / w) | 0) + 0.5) * this.cell]); pts.reverse(); pts[0] = [s[0], s[1]]; pts[pts.length - 1] = [e[0], e[1]];
    const out = [pts[0]]; let a = 0; while (a < pts.length - 1) { let b = pts.length - 1; while (b > a + 1 && !this.los(pts[a][0], pts[a][1], pts[b][0], pts[b][1])) b--; out.push(pts[b]); a = b; }
    this.cache.set(key, out.map((q) => q.slice())); if (this.cache.size > 800) this.cache.delete(this.cache.keys().next().value); return out;
  }
}
