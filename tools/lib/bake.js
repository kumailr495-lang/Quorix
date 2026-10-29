import { grad } from './surfacenets.js';
const lin = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255].map((c) => Math.pow(c, 2.2)); };
// cheap smooth 3D value noise (deterministic)
const hash = (i, j, k) => { let h = (i * 374761393 + j * 668265263 + k * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
export const noise3 = (x, y, z) => {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi;
  const s = (t) => t * t * (3 - 2 * t); const u = s(xf), v = s(yf), w = s(zf); let r = 0;
  for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) for (let c = 0; c < 2; c++)
    r += hash(xi + a, yi + b, zi + c) * (a ? u : 1 - u) * (b ? v : 1 - v) * (c ? w : 1 - w);
  return r;
};
export function zoneColor(spec, x, y, z, out) {
  const zs = spec._zl || (spec._zl = spec.zones.map((z) => ({ f: z.f, c: lin(z.color), b: z.bias || 0 }))); const tau = spec.tau ?? 0.8;
  let dmin = 1e9; const ds = zs.map((q) => { const d = q.f(x, y, z) - q.b; if (d < dmin) dmin = d; return d; }); let ws = 0, r = 0, g = 0, b = 0;
  zs.forEach((q, i) => { const w = Math.exp(-(ds[i] - dmin) / tau); ws += w; r += q.c[0] * w; g += q.c[1] * w; b += q.c[2] * w; });
  out[0] = r / ws; out[1] = g / ws; out[2] = b / ws; return out;
}
// Bake normals (SDF gradient), vertex colour (soft material zones x ambient occlusion x subtle variation), UVs.
export function bake(mesh, spec) {
  const { P, F } = mesh, n = P.length / 3, f = spec.sdf;
  const zones = spec.zones.map((z) => ({ f: z.f, c: lin(z.color), v: z.var ?? 0.05, mat: z.mat ?? 0, b: z.bias || 0 }));
  const matid = new Float32Array(n), normals = new Float32Array(n * 3), colors = new Float32Array(n * 4), uvs = new Float32Array(n * 2), pos = new Float32Array(n * 3);
  const tau = spec.tau ?? 0.8, ao1 = spec.aoNear ?? 3, ao2 = spec.aoFar ?? 10, tile = spec.tile ?? 40;
  for (let v = 0; v < n; v++) {
    const x = P[3*v], y = P[3*v+1], z = P[3*v+2];
    let g = grad(f, x, y, z, 0.3); let L = Math.hypot(g[0], g[1], g[2]) || 1; g = [g[0]/L, g[1]/L, g[2]/L];
    normals[3*v] = g[0]; normals[3*v+1] = g[1]; normals[3*v+2] = g[2];
    // zone weights
    let wsum = 0, r = 0, gg = 0, b = 0, vv = 0; const ds = zones.map((zz) => zz.f(x, y, z) - zz.b); const dmin = Math.min(...ds);
    zones.forEach((zz, i) => { const w = Math.exp(-(ds[i] - dmin) / tau); wsum += w; r += zz.c[0]*w; gg += zz.c[1]*w; b += zz.c[2]*w; vv += zz.v*w; });
    r /= wsum; gg /= wsum; b /= wsum; vv /= wsum; { let bi = 0; for (let i = 1; i < ds.length; i++) if (ds[i] < ds[bi]) bi = i; matid[v] = zones[bi].mat; }
    const a1 = Math.min(1, Math.max(0, f(x + g[0]*ao1, y + g[1]*ao1, z + g[2]*ao1) / ao1));
    const a2 = Math.min(1, Math.max(0, f(x + g[0]*ao2, y + g[1]*ao2, z + g[2]*ao2) / ao2));
    let ao = 0.45 + 0.55 * (0.55 * a1 + 0.45 * a2);
    if (spec.ground !== false) ao *= 0.72 + 0.28 * Math.min(1, Math.max(0, y / 12));
    const nv = 1 + vv * (noise3(x * 0.18, y * 0.18, z * 0.18) - 0.5) * 2;
    const m = ao * nv;
    colors[4*v] = Math.min(1, r * m); colors[4*v+1] = Math.min(1, gg * m); colors[4*v+2] = Math.min(1, b * m); colors[4*v+3] = 1; // LINEAR floats (glTF COLOR_0 is linear)
    const ax = Math.abs(g[0]), ay = Math.abs(g[1]), az = Math.abs(g[2]);
    let u, w2; if (ax >= ay && ax >= az) { u = z; w2 = y; } else if (ay >= az) { u = x; w2 = z; } else { u = x; w2 = y; }
    uvs[2*v] = u / tile; uvs[2*v+1] = -w2 / tile;
    pos[3*v] = x; pos[3*v+1] = y; pos[3*v+2] = z;
  }
  return { pos, normals, colors, uvs, matid, indices: Int32Array.from(F) };
}
// Mesh health: single connected piece, manifold edges, winding consistency, bbox
export function health(mesh) {
  const { P, F } = mesh, n = P.length / 3, par = Int32Array.from({ length: n }, (_, i) => i);
  const find = (a) => { while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; };
  const ec = new Map(); let vol = 0;
  for (let t = 0; t < F.length; t += 3) {
    for (let k = 0; k < 3; k++) { const a = F[t+k], b = F[t+(k+1)%3]; par[find(a)] = find(b); const key = a < b ? a * n + b : b * n + a; const dir = a < b ? 1 : -1; const e = ec.get(key) || [0, 0]; e[dir > 0 ? 0 : 1]++; ec.set(key, e); }
    const a = F[t], b = F[t+1], c = F[t+2];
    vol += (P[3*a]*(P[3*b+1]*P[3*c+2]-P[3*b+2]*P[3*c+1]) - P[3*a+1]*(P[3*b]*P[3*c+2]-P[3*b+2]*P[3*c]) + P[3*a+2]*(P[3*b]*P[3*c+1]-P[3*b+1]*P[3*c])) / 6;
  }
  let open = 0, nonman = 0, badwind = 0; for (const [, e] of ec) { const tot = e[0] + e[1]; if (tot === 1) open++; else if (tot > 2) nonman++; if (tot === 2 && (e[0] !== 1 || e[1] !== 1)) badwind++; }
  const used = new Set(F); const roots = new Set(); for (const v of used) roots.add(find(v));
  let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9]; for (let v = 0; v < n; v++) for (let a = 0; a < 3; a++) { mn[a] = Math.min(mn[a], P[3*v+a]); mx[a] = Math.max(mx[a], P[3*v+a]); }
  return { tris: F.length / 3, verts: n, pieces: roots.size, openEdges: open, nonManifold: nonman, badWinding: badwind, volume: vol, min: mn, max: mx };
}
