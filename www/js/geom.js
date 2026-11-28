// LUMIERE v5 - geometry accumulation. Everything static is built from crisp primitives (boxes, bevelled boxes, lathes, tubes, extrusions),
// transformed into place and appended to one buffer per room and kind. Light is baked into the vertices later (bake.js).
import * as THREE from 'three';
import { MAT } from './library.js';
export { MAT };
const _c = new THREE.Color(), _v = new THREE.Vector3(), _n = new THREE.Vector3(), _nm = new THREE.Matrix3();
export const col = (hex) => _c.set(hex).toArray();   // linear RGB (three converts sRGB hex to linear)
export class Acc {   // growable vertex soup: position, normal, uv (metres), tint, material id, occlusion, light group (glow only)
  constructor() { this.p = []; this.n = []; this.u = []; this.c = []; this.m = []; this.o = []; this.g = []; this.i = []; this.count = 0; }
  // append a THREE.BufferGeometry transformed by `mtx`; colour may be a hex/number or [r,g,b] (linear); opts: mat, occ (0..1), grp,
  // uv: 'mesh' keeps the geometry's own UVs (Kiln assets, in metres) instead of world-planar UVs; uvScale multiplies them
  add(geo, mtx, color, opts = {}) {
    const P = geo.attributes.position, N = geo.attributes.normal, base = this.count, rgb = Array.isArray(color) ? color : col(color), mat = opts.mat ?? 0, occ = opts.occ ?? 1, grp = opts.grp ?? 0, vc = geo.attributes.color;
    const UV = opts.uv === 'mesh' ? geo.attributes.uv : null, us = opts.uvScale ?? 1;
    if (!N) geo.computeVertexNormals(); const NN = geo.attributes.normal; if (mtx) _nm.getNormalMatrix(mtx);
    for (let i = 0; i < P.count; i++) {
      _v.fromBufferAttribute(P, i); if (mtx) _v.applyMatrix4(mtx); this.p.push(_v.x, _v.y, _v.z);
      _n.fromBufferAttribute(NN, i); if (mtx) _n.applyMatrix3(_nm).normalize(); this.n.push(_n.x, _n.y, _n.z);
      if (UV) this.u.push(UV.getX(i) * us, UV.getY(i) * us);
      else { const ax = Math.abs(_n.x), ay = Math.abs(_n.y), az = Math.abs(_n.z);   // world-planar: floors/ceilings x,z; walls along z use z,y; walls along x use x,y
        if (ay >= ax && ay >= az) this.u.push(_v.x, -_v.z); else if (ax >= az) this.u.push(_n.x > 0 ? -_v.z : _v.z, _v.y); else this.u.push(_n.z > 0 ? _v.x : -_v.x, _v.y); }
      if (vc) this.c.push(vc.getX(i) * rgb[0], vc.getY(i) * rgb[1], vc.getZ(i) * rgb[2]); else this.c.push(rgb[0], rgb[1], rgb[2]);
      this.m.push(mat); this.o.push(geo.attributes.occ ? geo.attributes.occ.getX(i) * occ : occ); this.g.push(grp);
    }
    const flip = mtx && mtx.determinant() < 0;
    if (geo.index) { const I = geo.index.array; for (let k = 0; k < I.length; k += 3) flip ? this.i.push(base + I[k], base + I[k + 2], base + I[k + 1]) : this.i.push(base + I[k], base + I[k + 1], base + I[k + 2]); }
    else for (let k = 0; k < P.count; k += 3) flip ? this.i.push(base + k, base + k + 2, base + k + 1) : this.i.push(base + k, base + k + 1, base + k + 2);
    this.count += P.count; return this;
  }
  get tris() { return this.i.length / 3; }
}
// ---- primitive geometries (centred at the origin unless stated) ----
const cache = new Map(); const memo = (k, f) => { let g = cache.get(k); if (!g) { g = f(); cache.set(k, g); } return g; };
export const seg = (len, max) => Math.max(1, Math.ceil(len / max - 1e-6));
// box with optional face mask (skip faces nobody sees: fewer triangles, no coplanar fights) and subdivision for smooth baked light
export function boxGeo(w, h, d, maxEdge = 0, faces = null) {
  const g = new THREE.BoxGeometry(w, h, d, maxEdge ? seg(w, maxEdge) : 1, maxEdge ? seg(h, maxEdge) : 1, maxEdge ? seg(d, maxEdge) : 1);
  if (!faces) return g;   // BoxGeometry groups: 0 +x, 1 -x, 2 +y, 3 -y, 4 +z, 5 -z
  const keep = ['px', 'nx', 'py', 'ny', 'pz', 'nz'].map((f) => faces.includes(f)), idx = g.index.array, out = [];
  for (const gr of g.groups) if (keep[gr.materialIndex]) for (let k = gr.start; k < gr.start + gr.count; k++) out.push(idx[k]);
  g.setIndex(out); g.clearGroups(); return g;
}
// rounded box: an extruded rounded rectangle with a small bevel on every edge (cushions, counters, tables)
export function rboxGeo(w, h, d, r = 0.03, curve = 3) {
  return memo(`rb${w},${h},${d},${r},${curve}`, () => {
    const rr = Math.min(r, w / 2 - 0.001, h / 2 - 0.001), b = Math.min(r * 0.6, d / 2 - 0.001), s = new THREE.Shape(), x = -w / 2 + b, y = -h / 2 + b, W = w - 2 * b, Hh = h - 2 * b, q = Math.max(0.0005, rr - b);
    s.moveTo(x + q, y); s.lineTo(x + W - q, y); s.quadraticCurveTo(x + W, y, x + W, y + q); s.lineTo(x + W, y + Hh - q); s.quadraticCurveTo(x + W, y + Hh, x + W - q, y + Hh); s.lineTo(x + q, y + Hh); s.quadraticCurveTo(x, y + Hh, x, y + Hh - q); s.lineTo(x, y + q); s.quadraticCurveTo(x, y, x + q, y);
    const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.001, d - 2 * b), bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 2, curveSegments: curve }); g.translate(0, 0, -(d - 2 * b) / 2); g.deleteAttribute('uv'); return g;
  });
}
export const cylGeo = (rt, rb, h, s = 16, open = false) => memo(`cy${rt},${rb},${h},${s},${open}`, () => new THREE.CylinderGeometry(rt, rb, h, s, 1, open));
export const sphGeo = (r, ws = 16, hs = 10) => memo(`sp${r},${ws},${hs}`, () => new THREE.SphereGeometry(r, ws, hs));
export const torGeo = (R, r, rs = 8, ts = 24, arc = Math.PI * 2) => memo(`to${R},${r},${rs},${ts},${arc}`, () => new THREE.TorusGeometry(R, r, rs, ts, arc));
export const latheGeo = (pts, s = 18) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), s);
export function tubeGeo(points, r, segs = 24, rs = 8) { const c = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))); return new THREE.TubeGeometry(c, segs, r, rs, false); }
export function extrudeGeo(pts2d, depth, bevel = 0.004, curve = 4) { const s = new THREE.Shape(pts2d.map(([x, y]) => new THREE.Vector2(x, y))); const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1, curveSegments: curve }); g.deleteAttribute('uv'); return g; }
export const planeGeo = (w, h, sx = 1, sy = 1) => new THREE.PlaneGeometry(w, h, sx, sy);
// matrix helpers
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _t = new THREE.Vector3();
export function M(x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0, sx = 1, sy = sx, sz = sx) { _e.set(rx, ry, rz, 'YXZ'); _q.setFromEuler(_e); return new THREE.Matrix4().compose(_t.set(x, y, z), _q, _s.set(sx, sy, sz)); }
export const mul = (a, b) => new THREE.Matrix4().multiplyMatrices(a, b);
// a "kit" collects the parts of one prop in its local frame; place() stamps it into a room accumulator under a transform
export class Kit {
  constructor() { this.parts = []; this.glows = []; }
  add(geo, mtx, color, opts = {}) { (opts.glow ? this.glows : this.parts).push({ geo, mtx, color, opts }); return this; }
  box(x0, y0, z0, x1, y1, z1, color, opts = {}) { return this.add(boxGeo(x1 - x0, y1 - y0, z1 - z0, 0, opts.faces), M((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), color, opts); }
  rbox(cx, cy, cz, w, h, d, r, color, opts = {}) { return this.add(rboxGeo(w, h, d, r), M(cx, cy, cz, opts.ry || 0, opts.rx || 0, opts.rz || 0), color, opts); }
  cyl(cx, cy, cz, rt, rb, h, color, opts = {}) { return this.add(cylGeo(rt, rb, h, opts.s || 16, opts.open), M(cx, cy, cz, opts.ry || 0, opts.rx || 0, opts.rz || 0), color, opts); }
  emit(acc, gacc, mtx) { for (const p of this.parts) acc.add(p.geo, p.mtx ? mul(mtx, p.mtx) : mtx, p.color, p.opts); if (gacc) for (const p of this.glows) gacc.add(p.geo, p.mtx ? mul(mtx, p.mtx) : mtx, p.color, p.opts); }
  get tris() { let t = 0; for (const p of this.parts) t += (p.geo.index ? p.geo.index.count : p.geo.attributes.position.count) / 3; return t; }
}
// acc -> merged THREE.BufferGeometry (light attributes are added by bake()). Lit geometry is sorted by material id into groups:
// g.userData.mats lists the ids in group order, so a mesh gets one library material per group (one draw each).
export function toGeometry(acc, withLight = true) {
  const g = new THREE.BufferGeometry(), n = acc.count;
  g.setAttribute('position', new THREE.Float32BufferAttribute(acc.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(acc.n, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(acc.c, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(acc.u, 2)); g.setAttribute('matid', new THREE.Float32BufferAttribute(acc.m, 1));
  if (!withLight) g.setAttribute('grp', new THREE.Float32BufferAttribute(acc.g, 1));
  if (withLight === 'occ') g.setAttribute('occ', new THREE.Float32BufferAttribute(acc.o, 1));
  let idx = acc.i;
  if (withLight) {   // bucket triangles by material id
    const by = new Map(); for (let k = 0; k < idx.length; k += 3) { const id = acc.m[idx[k]]; let b = by.get(id); if (!b) by.set(id, b = []); b.push(idx[k], idx[k + 1], idx[k + 2]); }
    const ids = [...by.keys()].sort((a, b) => a - b), out = []; ids.forEach((id, j) => { const b = by.get(id); g.addGroup(out.length, b.length, j); for (const v of b) out.push(v); });
    idx = out; g.userData.mats = ids;
  }
  g.setIndex(n > 65535 ? new THREE.Uint32BufferAttribute(idx, 1) : new THREE.Uint16BufferAttribute(idx, 1)); g.computeBoundingSphere(); g.userData.occ = Float32Array.from(acc.o); return g;
}
// ---- v7 plan-drawing helpers (floor inlays, ceiling light lines, curved guide lines): shapes and bands in the XZ plane ----
// a flat band of width w along a polyline in the XZ plane at height y, facing up (floor inlays) or down (ceiling light lines)
export function stripGeo(pts, w, y, up = true, closed = false) {
  const n = pts.length, pos = [], nrm = [], idx = [], ny = up ? 1 : -1;
  for (let i = 0; i < n; i++) {
    const a = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], b = pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dz = b[1] - a[1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    pos.push(pts[i][0] - dz * w / 2, y, pts[i][1] + dx * w / 2, pts[i][0] + dz * w / 2, y, pts[i][1] - dx * w / 2); nrm.push(0, ny, 0, 0, ny, 0);
  }
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) { const j = (i + 1) % n, A = 2 * i, B = 2 * i + 1, C = 2 * j, D = 2 * j + 1;
    for (const [p, q, r] of [[A, B, C], [B, D, C]]) {   // wind each triangle so its normal points the way the band faces
      const ux = pos[3 * q] - pos[3 * p], uz = pos[3 * q + 2] - pos[3 * p + 2], vx = pos[3 * r] - pos[3 * p], vz = pos[3 * r + 2] - pos[3 * p + 2];
      if ((uz * vx - ux * vz) * ny > 0) idx.push(p, q, r); else idx.push(p, r, q); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); g.setIndex(idx); return g;
}
export const ellipse = (cx, cz, rx, rz, n = 96) => Array.from({ length: n }, (_, k) => [cx + rx * Math.cos(k / n * Math.PI * 2), cz + rz * Math.sin(k / n * Math.PI * 2)]);
export function rrectPts(cx, cz, w, d, r, steps = 6) {
  const out = [], c = [[cx + w / 2 - r, cz + d / 2 - r, 0], [cx - w / 2 + r, cz + d / 2 - r, 90], [cx - w / 2 + r, cz - d / 2 + r, 180], [cx + w / 2 - r, cz - d / 2 + r, 270]];
  for (const [x, z, a0] of c) for (let i = 0; i <= steps; i++) { const a = (a0 + 90 * i / steps) * Math.PI / 180; out.push([x + r * Math.cos(a), z + r * Math.sin(a)]); }
  return out;
}
// smooth open polyline through control points (Catmull-Rom in XZ)
export function spline(ctrl, n = 60) { const c = new THREE.CatmullRomCurve3(ctrl.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal'); return c.getPoints(n).map((v) => [v.x, v.z]); }
// horizontal shape (floor inlay, ceiling with a hole) from 2D points [x, z]: up = normal +y
export function flatShape(outer, holes = [], y = 0, up = true) {
  const s = new THREE.Shape(outer.map(([x, z]) => new THREE.Vector2(x, z))); for (const h of holes) s.holes.push(new THREE.Path(h.map(([x, z]) => new THREE.Vector2(x, z))));
  const g = new THREE.ShapeGeometry(s, 24); g.rotateX(Math.PI / 2); if (up) { g.scale(1, -1, 1); const I = g.index.array; for (let k = 0; k < I.length; k += 3) { const t = I[k + 1]; I[k + 1] = I[k + 2]; I[k + 2] = t; } g.computeVertexNormals(); }
  g.translate(0, y, 0); g.deleteAttribute('uv'); return g;
}
