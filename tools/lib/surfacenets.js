// Naive surface nets on a regular grid + Newton snapping onto the exact SDF surface.
export function surfaceNets(f, b, h, snapIters = 3) {
  const [x0, y0, z0, x1, y1, z1] = b;
  const nx = Math.ceil((x1 - x0) / h) + 1, ny = Math.ceil((y1 - y0) / h) + 1, nz = Math.ceil((z1 - z0) / h) + 1;
  const V = new Float32Array(nx * ny * nz); const idx = (i, j, k) => (i * ny + j) * nz + k;
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) for (let k = 0; k < nz; k++) V[idx(i, j, k)] = f(x0 + i * h, y0 + j * h, z0 + k * h);
  const cx = nx - 1, cy = ny - 1, cz = nz - 1; const cid = (i, j, k) => (i * cy + j) * cz + k;
  const cellV = new Int32Array(cx * cy * cz).fill(-1); const P = [];
  const E = [[0,0,0,1,0,0],[0,1,0,1,1,0],[0,0,1,1,0,1],[0,1,1,1,1,1],[0,0,0,0,1,0],[1,0,0,1,1,0],[0,0,1,0,1,1],[1,0,1,1,1,1],[0,0,0,0,0,1],[1,0,0,1,0,1],[0,1,0,0,1,1],[1,1,0,1,1,1]];
  for (let i = 0; i < cx; i++) for (let j = 0; j < cy; j++) for (let k = 0; k < cz; k++) {
    let neg = 0; const c = new Float32Array(8);
    for (let n = 0; n < 8; n++) { const v = V[idx(i + (n & 1), j + ((n >> 1) & 1), k + ((n >> 2) & 1))]; c[n] = v; if (v < 0) neg++; }
    if (neg === 0 || neg === 8) continue;
    let sx = 0, sy = 0, sz = 0, cnt = 0;
    for (const e of E) {
      const a = (e[0]) | (e[1] << 1) | (e[2] << 2), bb = (e[3]) | (e[4] << 1) | (e[5] << 2); const va = c[a], vb = c[bb];
      if ((va < 0) === (vb < 0)) continue; const t = va / (va - vb);
      sx += e[0] + (e[3] - e[0]) * t; sy += e[1] + (e[4] - e[1]) * t; sz += e[2] + (e[5] - e[2]) * t; cnt++;
    }
    cellV[cid(i, j, k)] = P.length / 3; P.push(x0 + (i + sx / cnt) * h, y0 + (j + sy / cnt) * h, z0 + (k + sz / cnt) * h);
  }
  const Q = [];
  const quad = (a, bq, c, d, flip) => { if (a < 0 || bq < 0 || c < 0 || d < 0) return; Q.push(flip ? [a, d, c, bq] : [a, bq, c, d]); };
  for (let i = 0; i < nx - 1; i++) for (let j = 1; j < ny - 1; j++) for (let k = 1; k < nz - 1; k++) {
    const va = V[idx(i, j, k)], vb = V[idx(i + 1, j, k)]; if ((va < 0) === (vb < 0)) continue;
    quad(cellV[cid(i, j - 1, k - 1)], cellV[cid(i, j, k - 1)], cellV[cid(i, j, k)], cellV[cid(i, j - 1, k)], va >= 0);
  }
  for (let i = 1; i < nx - 1; i++) for (let j = 0; j < ny - 1; j++) for (let k = 1; k < nz - 1; k++) {
    const va = V[idx(i, j, k)], vb = V[idx(i, j + 1, k)]; if ((va < 0) === (vb < 0)) continue;
    quad(cellV[cid(i - 1, j, k - 1)], cellV[cid(i, j, k - 1)], cellV[cid(i, j, k)], cellV[cid(i - 1, j, k)], va < 0);
  }
  for (let i = 1; i < nx - 1; i++) for (let j = 1; j < ny - 1; j++) for (let k = 0; k < nz - 1; k++) {
    const va = V[idx(i, j, k)], vb = V[idx(i, j, k + 1)]; if ((va < 0) === (vb < 0)) continue;
    quad(cellV[cid(i - 1, j - 1, k)], cellV[cid(i, j - 1, k)], cellV[cid(i, j, k)], cellV[cid(i - 1, j, k)], va >= 0);
  }
  snap(f, P, h, snapIters);
  const F = [];
  const d2 = (a, b) => (P[3*a]-P[3*b])**2 + (P[3*a+1]-P[3*b+1])**2 + (P[3*a+2]-P[3*b+2])**2;
  for (const q of Q) { if (d2(q[0], q[2]) <= d2(q[1], q[3])) F.push(q[0], q[1], q[2], q[0], q[2], q[3]); else F.push(q[1], q[2], q[3], q[1], q[3], q[0]); }
  const m = { P: Float64Array.from(P), F: Int32Array.from(F) };
  const flips = orient(f, m, false); m.orientFlips = flips;
  if (flips > F.length / 6) { for (let t = 0; t < F.length; t += 3) { const tmp = F[t+1]; F[t+1] = F[t+2]; F[t+2] = tmp; } m.orientFlips = 'inverted-all'; }
  return m;
}
export function grad(f, x, y, z, e = 0.25) {
  return [(f(x + e, y, z) - f(x - e, y, z)) / (2 * e), (f(x, y + e, z) - f(x, y - e, z)) / (2 * e), (f(x, y, z + e) - f(x, y, z - e)) / (2 * e)];
}
export function snap(f, P, h, iters) {
  const n = P.length / 3;
  for (let it = 0; it < iters; it++) for (let v = 0; v < n; v++) {
    const x = P[3*v], y = P[3*v+1], z = P[3*v+2]; const d = f(x, y, z); const g = grad(f, x, y, z, 0.3); const gg = g[0]*g[0]+g[1]*g[1]+g[2]*g[2] || 1;
    const s = Math.max(-h, Math.min(h, d)) / gg; P[3*v] = x - g[0]*s; P[3*v+1] = y - g[1]*s; P[3*v+2] = z - g[2]*s;
  }
}
// make triangle winding agree with the SDF gradient (outward = CCW)
export function orient(f, m, apply = true) {
  const { P, F } = m; let flips = 0;
  for (let t = 0; t < F.length; t += 3) {
    const a = F[t], b = F[t+1], c = F[t+2];
    const ux = P[3*b]-P[3*a], uy = P[3*b+1]-P[3*a+1], uz = P[3*b+2]-P[3*a+2], vx = P[3*c]-P[3*a], vy = P[3*c+1]-P[3*a+1], vz = P[3*c+2]-P[3*a+2];
    const nx = uy*vz-uz*vy, ny = uz*vx-ux*vz, nz = ux*vy-uy*vx;
    const mx = (P[3*a]+P[3*b]+P[3*c])/3, my = (P[3*a+1]+P[3*b+1]+P[3*c+1])/3, mz = (P[3*a+2]+P[3*b+2]+P[3*c+2])/3;
    const g = grad(f, mx, my, mz, 0.3);
    if (nx*g[0]+ny*g[1]+nz*g[2] < 0) { if (apply) { F[t+1] = c; F[t+2] = b; } flips++; }
  }
  return flips;
}
