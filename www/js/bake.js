// LUMIERE v5 - light baking. Each static vertex gets three light terms at load time, so the GPU never evaluates a light for the building:
//   lh = house light (dimmed with the house lights), lf = fixed light (step lights, exit signs, LED strips, menu screens, street),
//   ls = form factor to the cinema screen (tinted live by the picture colour). Plus cheap ambient occlusion and contact shadows.
import * as THREE from 'three';
const _c = new THREE.Color();
const rgb = (hex) => (Array.isArray(hex) ? hex : _c.set(hex).toArray());
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const STRIDE = 14;   // x y z  r g b  range ch  dx dy dz  cosIn cosOut type(0 omni, 1 spot, 2 emitter)
export class Lights {
  constructor(opts = {}) {
    this.L = []; this.amb = { h: { up: [0, 0, 0], down: [0, 0, 0] }, f: { up: [0, 0, 0], down: [0, 0, 0] } }; this.screen = null; this.occluders = [];
    this.floorAt = opts.floorAt || (() => 0); this.ceil = opts.ceil ?? 3; this.rect = opts.rect || null; this.soft = opts.soft ?? 0.3;
  }
  _push(x, y, z, c, I, r, ch, dx = 0, dy = -1, dz = 0, ci = 1, co = -1, type = 0) { const k = rgb(c); this.L.push(x, y, z, k[0] * I, k[1] * I, k[2] * I, r, ch === 'f' ? 1 : 0, dx, dy, dz, ci, co, type); return this; }
  point(x, y, z, c, I, r = 10, ch = 'h') { return this._push(x, y, z, c, I, r, ch); }
  // downlight / spot: dir (unit), inner/outer cone half-angles in degrees
  spot(x, y, z, c, I, r = 10, ch = 'h', dir = [0, -1, 0], inner = 30, outer = 60) { return this._push(x, y, z, c, I, r, ch, dir[0], dir[1], dir[2], Math.cos(inner * Math.PI / 180), Math.cos(outer * Math.PI / 180), 1); }
  // line light (cove, LED strip, slot): n samples, I per metre; dir optional (emits into a hemisphere)
  line(ax, ay, az, bx, by, bz, c, Ipm, r = 6, ch = 'h', dir = null, n = 0) {
    const L = Math.hypot(bx - ax, by - ay, bz - az), k = n || Math.max(2, Math.ceil(L / 1.2)), I = Ipm * L / k;
    for (let i = 0; i < k; i++) { const t = (i + 0.5) / k, x = ax + (bx - ax) * t, y = ay + (by - ay) * t, z = az + (bz - az) * t; if (dir) this._push(x, y, z, c, I, r, ch, dir[0], dir[1], dir[2], 1, 0, 2); else this._push(x, y, z, c, I, r, ch); }
    return this;
  }
  // rectangular emitter (LED wall, menu board, light box, ceiling panel): centre, half vectors u, v, emitting along n
  area(cx, cy, cz, u, v, n, c, I, r = 10, ch = 'f', su = 3, sv = 2) {
    const k = I / (su * sv);
    for (let i = 0; i < su; i++) for (let j = 0; j < sv; j++) { const a = (i + 0.5) / su * 2 - 1, b = (j + 0.5) / sv * 2 - 1; this._push(cx + u[0] * a + v[0] * b, cy + u[1] * a + v[1] * b, cz + u[2] * a + v[2] * b, c, k, r, ch, n[0], n[1], n[2], 1, 0, 2); }
    return this;
  }
  ambient(up, down, k = 1, ch = 'h') { const a = rgb(up), b = rgb(down); this.amb[ch === 'f' ? 'f' : 'h'] = { up: a.map((v) => v * k), down: b.map((v) => v * k) }; return this; }
  // the picture: centre, half extents along its plane, facing direction; sampled 5 x 3 (curved screens pass several patches)
  setScreen(patches) { this.screen = patches; return this; }
  occluder(x0, z0, x1, z1, y0 = 0, y1 = 1, k = 0.5) { this.occluders.push([x0, z0, x1, z1, y0, y1, k]); return this; }
  // ---- evaluation ----
  // irradiance at one point with a normal: writes house light into H[0..2], fixed light into F[0..2]; returns the occlusion used
  at(x, y, z, nx, ny, nz, H, F, occ = 1) {
    const L = this.L, nl = L.length / STRIDE, A = this.amb, W = this.soft, R = this.rect, OC = this.occluders;
    let o = occ; const fy = this.floorAt(x, z), up = y - fy;
    if (Math.abs(ny) < 0.6) o *= 0.62 + 0.38 * smooth(0, 0.75, up);
    if (ny < -0.6) o *= 0.8 + 0.2 * smooth(0, 1.2, up);
    if (Math.abs(ny) < 0.6 && this.ceil - y < 0.8) o *= 0.86 + 0.14 * smooth(0, 0.8, this.ceil - y);
    if (R) { const dx = Math.min(x - R[0], R[2] - x), dz = Math.min(z - R[1], R[3] - z); if (dx > -0.05 && dz > -0.05) { const m = Math.max(0, Math.min(dx, dz)), M2 = Math.max(0, Math.max(dx, dz));
      if (ny > 0.6) o *= 1 - 0.3 * Math.exp(-m * m / 0.18); else if (Math.abs(ny) < 0.6 && m < 0.05) o *= 1 - 0.28 * Math.exp(-(M2 * M2) / 0.25); } }
    if (ny > 0.6) for (let k = 0; k < OC.length; k++) { const c = OC[k]; if (y < c[4] - 0.05 || y > c[5]) continue; const dx = Math.max(c[0] - x, 0, x - c[2]), dz = Math.max(c[1] - z, 0, z - c[3]), d = Math.hypot(dx, dz); if (d < 0.6) o *= 1 - c[6] * (1 - smooth(0, 0.6, d)); }
    const t = ny * 0.5 + 0.5, Ah = A.h, Af = A.f;
    let hr = Ah.down[0] + (Ah.up[0] - Ah.down[0]) * t, hg = Ah.down[1] + (Ah.up[1] - Ah.down[1]) * t, hb = Ah.down[2] + (Ah.up[2] - Ah.down[2]) * t;
    let fr = Af.down[0] + (Af.up[0] - Af.down[0]) * t, fg = Af.down[1] + (Af.up[1] - Af.down[1]) * t, fb = Af.down[2] + (Af.up[2] - Af.down[2]) * t;
    for (let k = 0; k < nl; k++) {
      const j = k * STRIDE, lx = L[j] - x, ly = L[j + 1] - y, lz = L[j + 2] - z, d2 = lx * lx + ly * ly + lz * lz, r = L[j + 6]; if (d2 > r * r) continue;
      const d = Math.sqrt(d2) || 1e-4, ux = lx / d, uy = ly / d, uz = lz / d, ndl = (nx * ux + ny * uy + nz * uz + W) / (1 + W); if (ndl <= 0) continue;
      let k2 = ndl / (1 + d2) * (1 - (d2 / (r * r)) ** 2) ** 2; const type = L[j + 13];
      if (type === 1) k2 *= smooth(L[j + 12], L[j + 11], -(ux * L[j + 8] + uy * L[j + 9] + uz * L[j + 10]));
      else if (type === 2) { const c = -(ux * L[j + 8] + uy * L[j + 9] + uz * L[j + 10]); if (c <= 0) continue; k2 *= c; }
      if (k2 <= 0) continue;
      if (L[j + 7]) { fr += L[j + 3] * k2; fg += L[j + 4] * k2; fb += L[j + 5] * k2; } else { hr += L[j + 3] * k2; hg += L[j + 4] * k2; hb += L[j + 5] * k2; }
    }
    H[0] = hr * o; H[1] = hg * o; H[2] = hb * o; F[0] = fr * o; F[1] = fg * o; F[2] = fb * o; return o;
  }
  screenAt(x, y, z, nx, ny, nz) {
    const scr = this._ss || (this._ss = this._screenSamples()); let ff = 0;
    for (let k = 0; k < scr.length; k += 7) { const sx = scr[k] - x, sy = scr[k + 1] - y, sz = scr[k + 2] - z, d2 = sx * sx + sy * sy + sz * sz, d = Math.sqrt(d2), cr = (sx * nx + sy * ny + sz * nz) / d, ce = -(sx * scr[k + 3] + sy * scr[k + 4] + sz * scr[k + 5]) / d; if (cr > -0.2 && ce > 0) ff += scr[k + 6] * ce * Math.max(0, (cr + 0.2) / 1.2) / (Math.PI * (d2 + 0.5)); }
    return Math.min(1.2, ff);
  }
  bake(geo) {
    const P = geo.attributes.position.array, N = geo.attributes.normal.array, n = P.length / 3, occ0 = geo.userData.occ, H = [0, 0, 0], F = [0, 0, 0];
    const lh = new Float32Array(n * 3), lf = new Float32Array(n * 3), ls = new Float32Array(n), scr = !!this.screen;
    for (let i = 0; i < n; i++) {
      const x = P[3 * i], y = P[3 * i + 1], z = P[3 * i + 2], nx = N[3 * i], ny = N[3 * i + 1], nz = N[3 * i + 2], o = this.at(x, y, z, nx, ny, nz, H, F, occ0 ? occ0[i] : 1);
      lh[3 * i] = H[0]; lh[3 * i + 1] = H[1]; lh[3 * i + 2] = H[2]; lf[3 * i] = F[0]; lf[3 * i + 1] = F[1]; lf[3 * i + 2] = F[2];
      if (scr) ls[i] = this.screenAt(x, y, z, nx, ny, nz) * o;
    }
    geo.setAttribute('lh', new THREE.BufferAttribute(lh, 3)); geo.setAttribute('lf', new THREE.BufferAttribute(lf, 3)); geo.setAttribute('ls', new THREE.BufferAttribute(ls, 1));
    return geo;
  }
  _screenSamples() {   // patches: {c:[x,y,z], u:[half], v:[half], n:[facing]} -> flat [x y z nx ny nz area]
    const out = []; for (const p of this.screen) { const su = p.su || 5, sv = p.sv || 3, area = 4 * Math.hypot(...p.u) * Math.hypot(...p.v) / (su * sv);
      for (let i = 0; i < su; i++) for (let j = 0; j < sv; j++) { const a = (i + 0.5) / su * 2 - 1, b = (j + 0.5) / sv * 2 - 1; out.push(p.c[0] + p.u[0] * a + p.v[0] * b, p.c[1] + p.u[1] * a + p.v[1] * b, p.c[2] + p.u[2] * a + p.v[2] * b, p.n[0], p.n[1], p.n[2], area); } }
    return out;
  }
  // light probe for people / moving props: ambient + strongest key light (house and fixed separately so halls can dim)
  probe(x, y, z) {
    const L = this.L, nl = L.length / STRIDE, A = this.amb, o = { ah: [0, 0, 0], af: [0, 0, 0], key: [0, 0, 0], keyDir: [0, 1, 0], keyF: 0, s: 0 };
    for (let c = 0; c < 3; c++) { o.ah[c] += (A.h.up[c] + A.h.down[c]) * 0.5; o.af[c] += (A.f.up[c] + A.f.down[c]) * 0.5; }
    let best = 0, sumx = 0, sumy = 0, sumz = 0;
    for (let k = 0; k < nl; k++) {
      const j = k * STRIDE, lx = L[j] - x, ly = L[j + 1] - y, lz = L[j + 2] - z, d2 = lx * lx + ly * ly + lz * lz, r = L[j + 6]; if (d2 > r * r) continue; const d = Math.sqrt(d2) || 1e-4;
      let k2 = 0.5 / (1 + d2) * (1 - (d2 / (r * r)) ** 2) ** 2; const type = L[j + 13];
      if (type === 1) k2 *= 0.4 + 0.6 * smooth(L[j + 12], L[j + 11], -(lx * L[j + 8] + ly * L[j + 9] + lz * L[j + 10]) / d); else if (type === 2) k2 *= Math.max(0, -(lx * L[j + 8] + ly * L[j + 9] + lz * L[j + 10]) / d);
      const e = (L[j + 3] + L[j + 4] + L[j + 5]) * k2; const dst = L[j + 7] ? o.af : o.ah; dst[0] += L[j + 3] * k2 * 0.6; dst[1] += L[j + 4] * k2 * 0.6; dst[2] += L[j + 5] * k2 * 0.6;
      sumx += lx / d * e; sumy += ly / d * e; sumz += lz / d * e; if (e > best) { best = e; o.keyF = L[j + 7]; }
    }
    const m = Math.hypot(sumx, sumy, sumz) || 1; o.keyDir = [sumx / m, sumy / m, sumz / m]; o.s = Math.min(1, m / ((o.ah[0] + o.ah[1] + o.ah[2] + o.af[0] + o.af[1] + o.af[2]) * 2 + 1e-3));
    if (this.screen) { let ff = 0; const scr = this._ss || (this._ss = this._screenSamples()); for (let k = 0; k < scr.length; k += 7) { const sx = scr[k] - x, sy = scr[k + 1] - y, sz = scr[k + 2] - z, d2 = sx * sx + sy * sy + sz * sz, d = Math.sqrt(d2), ce = -(sx * scr[k + 3] + sy * scr[k + 4] + sz * scr[k + 5]) / d; if (ce > 0) ff += scr[k + 6] * ce * 0.6 / (Math.PI * (d2 + 0.5)); } o.ls = Math.min(1, ff); } else o.ls = 0;
    return o;
  }
}
