// LUMIERE v5 - procedural prop library. Crisp, bevelled, modern shapes built from primitives (no blobby SDF meshes).
// Every function returns a Kit in its local frame: origin on the floor at the object's footprint centre, front facing -z unless stated.
import * as THREE from 'three';
import { Kit, M, MAT, rboxGeo, boxGeo, cylGeo, sphGeo, torGeo, latheGeo, tubeGeo, extrudeGeo, col } from './geom.js';
const D = Math.PI / 180;
export const C = {   // palette (sRGB hex; geom converts to linear)
  black: '#121214', charcoal: '#26262b', graphite: '#3a3b40', white: '#f1efea', warmWhite: '#e9e3d8', oak: '#b98a5b', walnut: '#5b3a28', brass: '#c9a45c', steel: '#9ea3a8', chrome: '#d8dbe0',
  red: '#a3202c', coral: '#ff4d5a', terrazzo: '#d9d4cb', stone: '#8f8a83', green: '#3d6b45', leaf: '#3f7a3c', leafDark: '#2b5a2c', pot: '#d8d2c8', glass: '#1d2830',
};
// ---------------- auditorium ----------------
// standard cinema seat: fabric cushion + reclined back, black shell, one shared armrest (left) with a cup holder; origin = floor under the hip point, faces -z
export function seatKit(fabric = '#8e1b24', lod = 0, w = 0.6) {
  const k = new Kit(), sh = '#18181b', arm = '#202024', hw = w / 2;
  if (lod > 0) {
    k.box(-hw + 0.04, 0.3, -0.3, hw - 0.04, 0.46, 0.2, fabric, { mat: MAT.fabric });
    k.add(boxGeo(w - 0.08, 0.6, 0.12), M(0, 0.78, 0.25, 0, -12 * D), fabric, { mat: MAT.fabric });
    k.box(-hw - 0.035, 0, -0.2, -hw + 0.035, 0.66, 0.3, arm, {});
    return k;
  }
  k.rbox(0, 0.4, -0.05, w - 0.09, 0.13, 0.5, 0.05, fabric, { mat: MAT.fabric });                     // cushion
  k.rbox(0, 0.31, -0.03, w - 0.1, 0.06, 0.46, 0.02, sh, { mat: MAT.rubber, occ: 0.7 });            // seat pan
  k.add(rboxGeo(w - 0.08, 0.66, 0.13, 0.05), M(0, 0.8, 0.22, 0, -12 * D), fabric, { mat: MAT.fabric });            // back cushion
  k.add(rboxGeo(w - 0.06, 0.7, 0.05, 0.02), M(0, 0.79, 0.3, 0, -12 * D), sh, { mat: MAT.lacquer, occ: 0.85 });  // back shell
  k.rbox(0, 1.1, 0.29, w - 0.14, 0.05, 0.06, 0.02, sh, { mat: MAT.lacquer });
  // shared armrest + pedestal + cup holder
  k.rbox(-hw, 0.64, 0.02, 0.075, 0.05, 0.56, 0.02, arm, { mat: MAT.leather });
  k.box(-hw - 0.03, 0, -0.08, -hw + 0.03, 0.62, 0.22, sh, { mat: MAT.lacquer, occ: 0.8 });
  k.add(torGeo(0.042, 0.009, 6, 16), M(-hw, 0.665, -0.2, 0, Math.PI / 2), '#3a3a3e', { mat: MAT.metal });
  k.add(cylGeo(0.04, 0.035, 0.1, 12, true), M(-hw, 0.62, -0.2), '#0d0d0f', { mat: MAT.rubber, occ: 0.5 });
  return k;
}
// the armrest that closes each row on the right
export function armKit(lod = 0) { const k = new Kit(); if (lod > 0) return k.box(-0.035, 0, -0.2, 0.035, 0.66, 0.3, '#202024', {}); k.rbox(0, 0.64, 0.02, 0.075, 0.05, 0.56, 0.02, '#202024', { mat: MAT.leather }); k.box(-0.03, 0, -0.08, 0.03, 0.62, 0.22, '#18181b', { mat: MAT.lacquer, occ: 0.8 }); return k; }
// premium recliner (curved hall): leather, double padded arms, headrest, closed base
export function reclinerKit(leather = '#3b3c42', lod = 0, w = 0.86) {
  const k = new Kit(), base = '#151517', hw = w / 2;
  if (lod > 0) { k.box(-hw + 0.02, 0, -0.42, hw - 0.02, 0.5, 0.3, leather, { mat: MAT.leather }); k.add(boxGeo(w - 0.26, 0.62, 0.22), M(0, 0.84, 0.28, 0, -10 * D), leather, { mat: MAT.leather }); k.box(-hw, 0, -0.38, -hw + 0.12, 0.66, 0.42, leather, {}); k.box(hw - 0.12, 0, -0.38, hw, 0.66, 0.42, leather, {}); return k; }
  k.rbox(0, 0.17, -0.02, w - 0.1, 0.34, 0.74, 0.04, base, { mat: MAT.rubber, occ: 0.75 });
  k.rbox(0, 0.43, -0.06, w - 0.28, 0.18, 0.66, 0.07, leather, { mat: MAT.leather });                  // seat
  k.rbox(0, 0.26, -0.43, w - 0.3, 0.3, 0.08, 0.035, leather, { mat: MAT.leather, occ: 0.85 });       // folded footrest
  k.add(rboxGeo(w - 0.28, 0.62, 0.22, 0.08), M(0, 0.86, 0.3, 0, -10 * D), leather, { mat: MAT.leather });   // back
  k.add(rboxGeo(w - 0.36, 0.2, 0.12, 0.06), M(0, 1.2, 0.27, 0, -14 * D), leather, { mat: MAT.leather });   // headrest pillow
  for (const s of [-1, 1]) { k.rbox(s * (hw - 0.07), 0.36, 0.0, 0.13, 0.62, 0.8, 0.05, leather, { mat: MAT.leather }); k.add(torGeo(0.04, 0.008, 6, 16), M(s * (hw - 0.07), 0.675, -0.27, 0, Math.PI / 2), '#a07a52', { mat: MAT.metal }); k.add(cylGeo(0.037, 0.033, 0.09, 12, true), M(s * (hw - 0.07), 0.63, -0.27), '#0d0d0f', { mat: MAT.rubber, occ: 0.5 }); }
  k.box(-0.15, 0.02, -0.395, 0.15, 0.035, -0.385, '#ffb36b', { glow: true, grp: 1 });   // under-seat courtesy light
  return k;
}
// guard rail along the crossing aisle (posts + two rails), length along x
export function railKit(len, h = 0.8, endPost = true) {   // low glass balustrade with a slim top rail: guards the high riser without cutting the picture
  const k = new Kit(), n = Math.max(2, Math.round(len / 1.6) + 1);
  for (let i = 0; i < (endPost ? n : n - 1); i++) { const x = -len / 2 + len * i / (n - 1); k.box(x - 0.015, 0, -0.02, x + 0.015, h, 0.02, C.steel, { mat: MAT.metal }); }
  k.cyl(0, h, 0, 0.022, 0.022, len, C.steel, { mat: MAT.metal, rz: Math.PI / 2, s: 10 });
  k.box(-len / 2, 0.02, -0.004, len / 2, 0.06, 0.004, '#ffb066', { glow: true, grp: 0, faces: 'pz nz' });
  return k;
}
export function speakerKit() { const k = new Kit(); k.rbox(0, 0, 0, 0.42, 0.62, 0.3, 0.03, '#141416', { mat: MAT.lacquer }); k.box(-0.17, -0.27, -0.155, 0.17, 0.27, -0.15, '#1d1d20', { mat: MAT.acoustic, faces: 'nz' }); return k; }
// ---------------- lobby furniture ----------------
export function planterKit(h = 0.55, r = 0.32, plant = 'palm', lod = 0) {
  const k = new Kit(); k.add(latheGeo([[0.001, 0], [r * 0.82, 0], [r, h * 0.12], [r, h], [r - 0.03, h], [r - 0.03, h - 0.04], [0.001, h - 0.04]], 20), null, C.pot, { mat: MAT.concrete });
  k.add(cylGeo(r - 0.035, r - 0.035, 0.02, 16), M(0, h - 0.04), '#2a2018', { mat: MAT.carpet, occ: 0.6 });
  if (plant === 'palm') {
    const stems = 3, H = 1.6; for (let s = 0; s < stems; s++) { const a = s * 2.1, lean = 0.08 + s * 0.04, top = [Math.sin(a) * lean * 2, h + H - s * 0.25, Math.cos(a) * lean * 2];
      k.add(tubeGeo([[Math.sin(a) * 0.04, h, Math.cos(a) * 0.04], [top[0] * 0.5, (h + top[1]) / 2, top[2] * 0.5], top], 0.022, 6, 5), null, '#6b5a3a', { mat: MAT.wood });
      const leaves = lod ? 5 : 8; for (let i = 0; i < leaves; i++) { const b = i / leaves * Math.PI * 2 + s, L = 0.55 + 0.15 * Math.sin(i * 3.1 + s); const pts = [top, [top[0] + Math.sin(b) * L * 0.45, top[1] + 0.1, top[2] + Math.cos(b) * L * 0.45], [top[0] + Math.sin(b) * L, top[1] - 0.25, top[2] + Math.cos(b) * L]];
        k.add(leafGeo(pts, 0.09), null, i % 2 ? C.leaf : C.leafDark, { mat: MAT.paint }); } }
  } else if (plant === 'bush') {
    for (let i = 0; i < (lod ? 4 : 9); i++) { const a = i * 2.4, rr = 0.12 + (i % 3) * 0.07; k.add(sphGeo(0.17 + (i % 2) * 0.05, 10, 7), M(Math.sin(a) * rr, h + 0.12 + (i % 4) * 0.09, Math.cos(a) * rr), i % 2 ? C.leaf : C.leafDark, { mat: MAT.paint }); }
  }
  return k;
}
// a strap-shaped leaf along 3 points (double-sided ribbon)
function leafGeo(pts, w) {
  const P = pts.map((p) => new THREE.Vector3(...p)), pos = [], idx = [], n = 6;
  const curve = new THREE.QuadraticBezierCurve3(P[0], P[1], P[2]); const side = new THREE.Vector3().subVectors(P[2], P[0]).cross(new THREE.Vector3(0, 1, 0)).normalize();
  for (let i = 0; i <= n; i++) { const t = i / n, c = curve.getPoint(t), ww = w * Math.sin(Math.PI * Math.min(1, t * 1.15)) + 0.004; pos.push(c.x - side.x * ww, c.y - side.y * ww, c.z - side.z * ww, c.x + side.x * ww, c.y + side.y * ww, c.z + side.z * ww); if (i < n) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3, a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
export function benchKit(len = 1.8, fabric = '#5b6b78') {
  const k = new Kit(); k.rbox(0, 0.42, 0, len, 0.12, 0.5, 0.05, fabric, { mat: MAT.fabric });
  k.rbox(0, 0.18, 0, len - 0.1, 0.36, 0.42, 0.02, C.oak, { mat: MAT.wood, occ: 0.85 }); return k;
}
export function armchairKit(fabric = '#c46a3c') {
  const k = new Kit(); k.rbox(0, 0.42, 0.02, 0.62, 0.14, 0.6, 0.06, fabric, { mat: MAT.fabric }); k.rbox(0, 0.64, 0.3, 0.74, 0.5, 0.14, 0.06, fabric, { mat: MAT.fabric });
  for (const s of [-1, 1]) k.rbox(s * 0.35, 0.5, 0.02, 0.1, 0.32, 0.7, 0.05, fabric, { mat: MAT.fabric });
  k.rbox(0, 0.24, 0.02, 0.78, 0.24, 0.72, 0.04, fabric, { mat: MAT.fabric, occ: 0.85 }); for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.cyl(sx * 0.33, 0.06, sz * 0.28, 0.02, 0.015, 0.12, C.walnut, { mat: MAT.wood, s: 8 });
  return k;
}
export function lowTableKit(r = 0.42, h = 0.42, top = C.white) { const k = new Kit(); k.cyl(0, h - 0.02, 0, r, r, 0.04, top, { mat: MAT.marble, s: 28 }); k.cyl(0, h / 2, 0, 0.05, 0.05, h - 0.04, C.brass, { mat: MAT.metal, s: 12 }); k.cyl(0, 0.015, 0, r * 0.55, r * 0.6, 0.03, C.brass, { mat: MAT.metal, s: 20 }); return k; }
export function stoolKit(h = 0.76, seat = '#2d2d31') {
  const k = new Kit(); k.cyl(0, h - 0.04, 0, 0.19, 0.18, 0.08, seat, { mat: MAT.leather, s: 20 }); k.cyl(0, h / 2, 0, 0.025, 0.025, h - 0.08, C.chrome, { mat: MAT.chrome, s: 10 });
  k.add(torGeo(0.16, 0.012, 6, 20), M(0, 0.3, 0, 0, Math.PI / 2), C.chrome, { mat: MAT.chrome }); k.cyl(0, 0.012, 0, 0.2, 0.21, 0.024, C.chrome, { mat: MAT.chrome, s: 20 }); return k;
}
// modular round sofa ring around a planter (centre island); r = outer radius
export function ringSofaKit(r = 2.0, fabric = '#2f5d62') {
  const k = new Kit(), seat = 0.62, segs = 36;
  const ring = (r0, r1, y0, y1, color, mat, occ = 1) => { const g = latheGeo([[r0, y0], [r1, y0], [r1, y1], [r0, y1], [r0, y0]], segs); k.add(g, null, color, { mat, occ }); };
  ring(r - seat, r, 0.0, 0.3, '#1d1d20', MAT.rubber, 0.8); ring(r - seat + 0.02, r - 0.02, 0.3, 0.44, fabric, MAT.fabric); ring(r - seat - 0.02, r - seat + 0.16, 0.3, 0.86, fabric, MAT.fabric);
  return k;
}
export function stanchionKit(belt = '#c42032') { const k = new Kit(); k.cyl(0, 0.015, 0, 0.16, 0.17, 0.03, C.chrome, { mat: MAT.chrome, s: 20 }); k.cyl(0, 0.48, 0, 0.03, 0.03, 0.93, C.chrome, { mat: MAT.chrome, s: 12 }); k.cyl(0, 0.96, 0, 0.04, 0.035, 0.05, C.chrome, { mat: MAT.chrome, s: 12 }); return k; }
export function beltKit(len, belt = '#c42032') { const k = new Kit(); k.box(-len / 2, 0.86, -0.004, len / 2, 0.91, 0.004, belt, { mat: MAT.fabric }); return k; }
export function binKit() { const k = new Kit(); k.cyl(0, 0.45, 0, 0.2, 0.18, 0.9, C.graphite, { mat: MAT.metal, s: 20 }); k.cyl(0, 0.91, 0, 0.21, 0.21, 0.03, C.steel, { mat: MAT.metal, s: 20 }); return k; }
export function columnKit(h, r = 0.32) { const k = new Kit(); k.cyl(0, h / 2, 0, r, r, h, C.white, { mat: MAT.plaster, s: 28 }); k.cyl(0, 0.05, 0, r + 0.03, r + 0.03, 0.1, C.graphite, { mat: MAT.lacquer, s: 28 }); k.add(torGeo(r + 0.02, 0.015, 6, 32), M(0, 2.6, 0, 0, Math.PI / 2), '#ffd7a6', { glow: true, grp: 1 }); return k; }
// pendant lamp: thin cable + shade (glow lens underneath)
export function pendantKit(drop = 1.2, shade = '#1d1d20') { const k = new Kit(); k.cyl(0, -drop / 2, 0, 0.004, 0.004, drop, '#111', { s: 4 }); k.add(latheGeo([[0.02, 0], [0.16, -0.18], [0.17, -0.2], [0.001, -0.2]], 20), M(0, -drop), shade, { mat: MAT.lacquer }); k.cyl(0, -drop - 0.19, 0, 0.13, 0.13, 0.01, '#ffd9a8', { glow: true, grp: 1, s: 16 }); return k; }
export function kioskKit() { const k = new Kit(); k.rbox(0, 0.75, 0, 0.55, 1.5, 0.12, 0.04, C.white, { mat: MAT.lacquer }); k.rbox(0, 0.02, 0, 0.6, 0.04, 0.4, 0.02, C.graphite, { mat: MAT.metal }); k.box(-0.23, 0.85, -0.064, 0.23, 1.38, -0.061, '#1b2a3a', { glow: true, grp: 0 }); return k; }
// ---------------- counters (front faces -z; the room builder turns them) ----------------
// modern service counter: lacquer body, fluted oak front, stone top, recessed plinth with an LED line, optional raised transaction ledge
export function counterKit(len, o = {}) {
  const k = new Kit(), d = o.depth ?? 0.7, h = o.h ?? 1.05, body = o.body || C.white, front = o.front || C.oak, top = o.top || '#2b2b30';
  k.rbox(0, 0.06, 0.05, len - 0.12, 0.12, d - 0.16, 0.02, '#111113', { mat: MAT.rubber, occ: 0.6 });
  k.rbox(0, (h - 0.05 + 0.12) / 2, 0, len, h - 0.17, d, 0.03, body, { mat: MAT.lacquer });
  k.rbox(0, (h - 0.05 + 0.14) / 2, -d / 2 - 0.012, len - 0.06, h - 0.24, 0.03, 0.012, front, { mat: MAT.slats });
  k.box(-len / 2 + 0.08, 0.115, -d / 2 + 0.06, len / 2 - 0.08, 0.125, -d / 2 + 0.075, o.led || '#ffcf9a', { glow: true, grp: 1, faces: 'ny nz' });
  k.rbox(0, h - 0.025, -0.02, len + 0.06, 0.05, d + 0.06, 0.012, top, { mat: o.topMat ?? MAT.granite });
  if (o.ledge) { k.rbox(0, h + 0.18, -d / 2 + 0.1, len - 0.1, 0.035, 0.26, 0.01, top, { mat: MAT.granite }); for (const x of [-len / 2 + 0.25, 0, len / 2 - 0.25]) k.cyl(x, h + 0.08, -d / 2 + 0.12, 0.012, 0.012, 0.18, C.steel, { mat: MAT.metal, s: 8 }); }
  return k;
}
export function posKit() { const k = new Kit(); k.cyl(0, 0.04, 0, 0.06, 0.07, 0.08, C.graphite, { mat: MAT.metal, s: 12 }); k.add(boxGeo(0.3, 0.22, 0.02), M(0, 0.2, 0, 0, -0.3), '#141416', { mat: MAT.lacquer }); k.add(boxGeo(0.27, 0.19, 0.004), M(0, 0.2, -0.012, 0, -0.3), '#3d6db5', { glow: true, grp: 0 }); return k; }
// glass-cabinet popcorn machine on its cart (cabinet light is part of the glow pass)
export function popcornKit() {
  const k = new Kit(), red = '#c8202e';
  k.rbox(0, 0.45, 0, 0.82, 0.9, 0.56, 0.03, red, { mat: MAT.lacquer }); k.box(-0.38, 0.9, -0.26, 0.38, 0.93, 0.26, '#d9d9dd', { mat: MAT.chrome });
  for (const [x, z] of [[-0.39, -0.26], [0.39, -0.26], [-0.39, 0.26], [0.39, 0.26]]) k.box(x - 0.02, 0.93, z - 0.02, x + 0.02, 1.68, z + 0.02, red, { mat: MAT.lacquer });
  k.rbox(0, 1.73, 0, 0.88, 0.1, 0.6, 0.03, red, { mat: MAT.lacquer }); k.box(-0.3, 1.7, -0.31, 0.3, 1.77, -0.305, '#ffe9a8', { glow: true, grp: 0 });
  k.cyl(0, 1.5, 0, 0.13, 0.11, 0.14, '#cfd2d6', { mat: MAT.chrome, s: 16 }); k.cyl(0, 1.62, 0, 0.01, 0.01, 0.12, '#cfd2d6', { mat: MAT.chrome, s: 6 });
  let s = 5; const R = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 34; i++) k.add(sphGeo(0.045 + R() * 0.03, 7, 5), M(-0.32 + R() * 0.64, 0.97 + R() * 0.12 * (1 - Math.abs(i % 7 - 3) / 3), -0.2 + R() * 0.4), i % 5 ? '#ffe7a3' : '#f5d27a', { mat: MAT.paint });
  k.box(-0.36, 1.66, -0.24, 0.36, 1.672, 0.24, '#fff0c8', { glow: true, grp: 0, faces: 'ny' });
  return k;
}
export function fountainKit() {
  const k = new Kit(); k.rbox(0, 0.42, 0, 0.72, 0.84, 0.52, 0.02, '#202024', { mat: MAT.lacquer }); const cols = ['#e3262f', '#ffb000', '#2a9df4', '#43b02a'];
  cols.forEach((c, i) => { k.box(-0.33 + i * 0.168, 0.5, -0.262, -0.19 + i * 0.168, 0.78, -0.26, c, { glow: true, grp: 0, faces: 'nz' }); k.cyl(-0.26 + i * 0.168, 0.44, -0.2, 0.012, 0.016, 0.06, '#9a9ea3', { mat: MAT.chrome, s: 8 }); });
  k.box(-0.34, 0.12, -0.27, 0.34, 0.15, -0.1, '#3a3b40', { mat: MAT.metal }); return k;
}
export function cupStackKit(n = 3) { const k = new Kit(); for (let i = 0; i < n; i++) { const x = (i - (n - 1) / 2) * 0.13; k.cyl(x, 0.2, 0, 0.045, 0.035, 0.4, ['#ff4d5a', '#ffffff', '#ffb547'][i % 3], { mat: MAT.lacquer, s: 12 }); } return k; }
// candy wall: backlit shelves of colourful boxes
export function candyKit(len = 1.6, h = 2.0) {
  const k = new Kit(); k.rbox(0, h / 2, 0.1, len, h, 0.32, 0.02, '#1a1a1e', { mat: MAT.lacquer }); k.box(-len / 2 + 0.05, 0.12, -0.04, len / 2 - 0.05, h - 0.06, -0.035, '#fff2dc', { glow: true, grp: 0, faces: 'nz' });
  const cols = ['#ff4d5a', '#ffb547', '#4cc3ff', '#7bd389', '#c77dff', '#ffffff', '#ff8fab']; let s = 11; const R = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let sh = 0; sh < 4; sh++) { const y = 0.2 + sh * (h - 0.3) / 4; k.box(-len / 2 + 0.04, y - 0.02, -0.1, len / 2 - 0.04, y, 0.0, '#d8d8dc', { mat: MAT.chrome });
    for (let x = -len / 2 + 0.1; x < len / 2 - 0.1; x += 0.12) { const bh = 0.12 + R() * 0.12; k.box(x - 0.045, y, -0.09, x + 0.045, y + bh, -0.02, cols[Math.floor(R() * cols.length)], { mat: MAT.lacquer }); } }
  return k;
}
// back bar: wall cabinet, three back-lit shelves of bottles, an espresso machine
export function backBarKit(len = 5) {
  const k = new Kit(); k.rbox(0, 0.45, 0, len, 0.9, 0.55, 0.02, C.walnut, { mat: MAT.wood }); k.rbox(0, 0.92, 0, len + 0.04, 0.04, 0.58, 0.01, '#2b2b30', { mat: MAT.granite });
  k.box(-len / 2, 1.3, 0.12, len / 2, 3.0, 0.16, '#ffb86b', { glow: true, grp: 1, faces: 'nz' });
  let s = 3; const R = () => (s = (s * 16807) % 2147483647) / 2147483647; const bc = ['#3d6b45', '#7a3b1e', '#d9c27a', '#9a2b3a', '#cfd8dc', '#5a3d8a', '#2f4f7a'];
  for (let sh = 0; sh < 3; sh++) { const y = 1.35 + sh * 0.55; k.box(-len / 2, y - 0.025, -0.08, len / 2, y, 0.12, '#e8e3da', { mat: MAT.glass });
    for (let x = -len / 2 + 0.12; x < len / 2 - 0.1; x += 0.14 + R() * 0.06) { const H = 0.24 + R() * 0.1, r = 0.035 + R() * 0.012;
      k.add(latheGeo([[0.001, 0], [r, 0], [r, H * 0.62], [r * 0.4, H * 0.8], [r * 0.32, H], [0.001, H]], 8), M(x, y, 0.02), bc[Math.floor(R() * bc.length)], { mat: MAT.glass }); } }
  k.rbox(len / 2 - 0.6, 1.12, -0.02, 0.62, 0.36, 0.42, 0.03, '#c9cdd2', { mat: MAT.chrome }); k.box(len / 2 - 0.85, 1.05, -0.235, len / 2 - 0.35, 1.07, -0.22, '#ff4d5a', { glow: true, grp: 0 });
  return k;
}
export function podiumKit() { const k = new Kit(); k.add(extrudeGeo([[-0.32, 0], [0.32, 0], [0.26, 1.1], [-0.26, 1.1]], 0.4, 0.01), M(0, 0, -0.2), C.white, { mat: MAT.lacquer }); k.rbox(0, 1.13, 0.0, 0.66, 0.05, 0.48, 0.01, '#2b2b30', { mat: MAT.granite }); k.box(-0.24, 0.98, -0.212, 0.24, 1.0, -0.205, '#ff4d5a', { glow: true, grp: 0 }); return k; }
// free-standing sign totem; the printed face is a textured panel added by the room
export function totemKit(h = 1.9, w = 0.55) { const k = new Kit(); k.rbox(0, 0.03, 0, w + 0.1, 0.06, 0.4, 0.02, C.graphite, { mat: MAT.metal }); k.rbox(0, h / 2, 0, w, h, 0.08, 0.02, '#1b1b1f', { mat: MAT.lacquer }); return k; }
export function lightboxKit(w, h) { const k = new Kit(), t = 0.04; k.box(-w / 2 - t, -t, 0, w / 2 + t, 0, 0.08, '#2a2b2f', { mat: MAT.metal }); k.box(-w / 2 - t, h, 0, w / 2 + t, h + t, 0.08, '#2a2b2f', { mat: MAT.metal }); k.box(-w / 2 - t, 0, 0, -w / 2, h, 0.08, '#2a2b2f', { mat: MAT.metal }); k.box(w / 2, 0, 0, w / 2 + t, h, 0.08, '#2a2b2f', { mat: MAT.metal }); return k; }
export function doorSlabKit(w = 0.95, h = 2.2, color = '#d9d4cb') { const k = new Kit(); k.box(-w / 2 - 0.06, 0, 0, w / 2 + 0.06, h + 0.06, 0.03, '#2a2b2f', { mat: MAT.metal, faces: 'pz px nx py' }); k.box(-w / 2, 0, 0.03, w / 2, h, 0.06, color, { mat: MAT.lacquer, faces: 'pz px nx py' }); k.cyl(w / 2 - 0.12, 1.05, 0.09, 0.012, 0.012, 0.3, C.chrome, { mat: MAT.chrome, s: 8 }); return k; }
export function carKit(color = '#7a1c24') {
  const k = new Kit(); k.rbox(0, 0.55, 0, 1.8, 0.55, 4.3, 0.18, color, { mat: MAT.lacquer }); k.rbox(0, 1.02, 0.25, 1.6, 0.45, 2.3, 0.2, '#1a1f26', { mat: MAT.glass });
  for (const sx of [-0.82, 0.82]) for (const sz of [-1.35, 1.35]) k.add(cylGeo(0.33, 0.33, 0.24, 14), M(sx, 0.33, sz, 0, 0, Math.PI / 2), '#111', { mat: MAT.rubber });
  for (const sx of [-0.6, 0.6]) { k.box(sx - 0.22, 0.6, -2.16, sx + 0.22, 0.7, -2.14, '#fff6dc', { glow: true, grp: 0 }); k.box(sx - 0.22, 0.62, 2.14, sx + 0.22, 0.7, 2.16, '#ff2a2a', { glow: true, grp: 0 }); }
  return k;
}
export function lampPostKit(h = 6) { const k = new Kit(); k.cyl(0, h / 2, 0, 0.06, 0.09, h, '#2b2d31', { mat: MAT.metal, s: 10 }); k.rbox(0, h, -0.5, 0.18, 0.08, 1.2, 0.03, '#2b2d31', { mat: MAT.metal }); k.box(-0.07, h - 0.045, -1.0, 0.07, h - 0.035, -0.4, '#ffe2b8', { glow: true, grp: 0, faces: 'ny' }); return k; }
export function ringLightKit(r = 2.6, drop = 0.7) { const k = new Kit(); k.add(torGeo(r, 0.05, 8, 64), M(0, 0, 0, 0, Math.PI / 2), '#fff3e2', { glow: true, grp: 1 }); k.add(torGeo(r * 0.72, 0.035, 8, 56), M(0, -0.12, 0, 0, Math.PI / 2), '#fff3e2', { glow: true, grp: 1 }); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; k.cyl(Math.cos(a) * r, drop / 2, Math.sin(a) * r, 0.004, 0.004, drop, '#222', { s: 4 }); } return k; }
