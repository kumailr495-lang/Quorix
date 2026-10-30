// LUMIERE v5 - the three auditoria, built from the computed geometry in hallmath.js:
// front pit + stadium rows (curved rows in SCREEN 2), stepped side aisles with nosing lights, crossing aisle at entrance level with a guard rail,
// black screen wall and masking, flat / curved / giant screen, stage with LED edge, acoustic side walls with dimmable LED slots,
// downlights, exit signs, surround speakers, projector porthole, instanced seats (2 LODs) with per-seat baked light.
import * as THREE from 'three';
import { Room } from './room.js';
import { Acc, toGeometry, M, MAT, col } from './geom.js';
import { railKit, speakerKit } from './props.js';
import { assetGeometry } from './assets.js';
import { HALLS, DOOR_W, DOOR_H, PASSAGES } from './layout.js';
import { hallFloorY, hallSeats, BEHIND, TREAD } from './hallmath.js';
import { slateTexture } from './textures.js';
export const THEME = {   // docs/V5-ART-DIRECTION.md: I = Everyman teal and red velvet, II = walnut and burgundy romance, III = Dolby-style black with blue light lines
  I: { seat: '#1d5a56', wall: '#18403f', wall2: '#0d1416', led: '#ffb066', carpet: '#4a1a22', riser: '#121215', curtain: '#6f1520', ceil: '#0e0e10', accent: '#ff8a3d' },
  II: { seat: '#6e1424', wall: '#6b4630', wall2: '#1a1210', led: '#ffb877', carpet: '#3a1418', riser: '#100c0c', curtain: '#3a0e16', ceil: '#0a0b10', accent: '#e8a25a', stars: true, slats: true },
  III: { seat: '#1e2c4a', wall: '#141418', wall2: '#0c0c0f', led: '#4c9dff', carpet: '#1a1d26', riser: '#0e0e11', curtain: null, ceil: '#0b0b0e', accent: '#4c9dff', cove: true },
};
// quads -> geometry (pos, normal); each quad [a, b, c, d] counter-clockwise seen from the front
function quadGeo(quads) {
  const pos = [], nrm = [], idx = []; let v = 0; const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), n = new THREE.Vector3();
  for (const q of quads) { e1.subVectors(new THREE.Vector3(...q[1]), new THREE.Vector3(...q[0])); e2.subVectors(new THREE.Vector3(...q[3]), new THREE.Vector3(...q[0])); n.crossVectors(e1, e2).normalize();
    for (const p of q) { pos.push(...p); nrm.push(n.x, n.y, n.z); } idx.push(v, v + 1, v + 2, v, v + 2, v + 3); v += 4; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); g.setIndex(idx); return g;
}
// floor profile of one row strip along d (distance from the screen wall): [[d0, d1, y], ...]
function rowProfile(h, r, aisle) {
  const d0 = r === 0 ? 0 : h.pf[r], d1 = r === h.rows - 1 ? h.depth : h.pf[r + 1], y = h.rowY[r];
  if (!aisle || r === h.rows - 1) return [[d0, d1, y]];
  const k = h.steps[r + 1], R = h.rowY[r + 1] - y, out = [[d0, d1 - (k - 1) * TREAD, y]];
  for (let j = 1; j < k; j++) out.push([d1 - (k - j) * TREAD, d1 - (k - j - 1) * TREAD, y + j * R / k]);
  return out;
}
export function buildHalls(ctx) { return HALLS.map((h) => buildHall(ctx, h)); }
function buildHall(ctx, h) {
  const { mats } = ctx, T = THEME[h.id], room = new Room(h.key, { floorAt: (x, z) => hallFloorY(h, x, z), ceil: h.ceil, rect: [h.x0, h.zs, h.x1, h.zBack], soft: 0.35 });
  const zs = h.zs, Z = (d, u) => zs + d - h.rowSag(u), cx = h.cx, hb = h.B / 2, L = room.lights, top = h.ceil, yF = h.frontY;
  // ---------- stadium floor ----------
  const cols = []; const addCols = (a, b, step) => { const n = Math.max(1, Math.ceil((b - a) / step)); for (let i = 0; i < n; i++) cols.push([a + (b - a) * i / n, a + (b - a) * (i + 1) / n, false]); };
  addCols(h.x0, cx - hb, 0.8); cols.forEach((c) => (c[2] = true)); const nA = cols.length; addCols(cx - hb, cx + hb, h.rowR ? 0.6 : 1.2); const nB = cols.length; addCols(cx + hb, h.x1, 0.8); for (let i = nB; i < cols.length; i++) cols[i][2] = true;
  const tops = [], risers = [], nosing = [], sides = [];
  for (const [xa, xb, aisle] of cols) {
    const ua = xa - cx, ub = xb - cx; let prevY = null;
    for (let r = 0; r < h.rows; r++) for (const [d0, d1, y] of rowProfile(h, r, aisle)) {
      const dd = d1 - d0, n = Math.max(1, Math.ceil(dd / 0.6));
      for (let i = 0; i < n; i++) { const a = d0 + dd * i / n, b = d0 + dd * (i + 1) / n; tops.push([[xa, y, Z(a, ua)], [xa, y, Z(b, ua)], [xb, y, Z(b, ub)], [xb, y, Z(a, ub)]]); }
      if (prevY !== null && y > prevY + 1e-4) { risers.push([[xa, prevY, Z(d0, ua)], [xb, prevY, Z(d0, ub)], [xb, y, Z(d0, ub)], [xa, y, Z(d0, ua)]]); if (aisle) nosing.push([xa, xb, y, d0]); }
      prevY = y;
    }
  }
  // side faces where an aisle tread stands above the row platform next to it
  for (const side of [-1, 1]) { const x = cx + side * hb, u = side * hb; for (let r = 0; r < h.rows - 1; r++) for (const [d0, d1, y] of rowProfile(h, r, true).slice(1)) { const yb = h.rowY[r]; if (y <= yb + 1e-4) continue;
    sides.push(side < 0 ? [[x, yb, Z(d0, u)], [x, yb, Z(d1, u)], [x, y, Z(d1, u)], [x, y, Z(d0, u)]] : [[x, yb, Z(d1, u)], [x, yb, Z(d0, u)], [x, y, Z(d0, u)], [x, y, Z(d1, u)]]); } }
  room.acc.add(quadGeo(tops), null, T.carpet, { mat: MAT.hallCarpet }); room.acc.add(quadGeo(risers), null, T.riser, { mat: MAT.paint }); if (sides.length) room.acc.add(quadGeo(sides), null, T.riser, { mat: MAT.paint });
  for (const [xa, xb, y, d] of nosing) { const za = Z(d, xa - cx) - 0.012, zb = Z(d, xb - cx) - 0.012; room.glowBox(xa + 0.05, y - 0.035, Math.min(za, zb) - 0.004, xb - 0.05, y - 0.02, Math.max(za, zb), '#ffcf96', 1.8, 0, 'nz ny');
    L.point((xa + xb) / 2, y - 0.05, (za + zb) / 2 - 0.1, '#ffc88a', 0.05, 0.9, 'f'); }
  // ---------- walls (inward faces), colliders behind them ----------
  const doorSides = h.doorSide === 0 ? [-1, 1] : [h.doorSide];
  const gapFor = (side) => doorSides.includes(side) ? [[h.doorZ(side) - DOOR_W / 2, h.doorZ(side) + DOOR_W / 2, DOOR_H]] : [];
  const blackD = h.pf[1] - 0.6;   // from the screen to row A the walls are black (stray light)
  for (const side of [-1, 1]) { const x = side < 0 ? h.x0 : h.x1, dir = -side, gaps = gapFor(side);
    room.wall('z', x, zs, zs + blackD, yF, top, dir, T.wall2, [], { mat: MAT.acoustic, thick: 0.3 });
    room.wall('z', x, zs + blackD, h.zBack, yF, top, dir, T.slats ? T.wall : T.wall, gaps, { mat: T.slats ? MAT.slats : MAT.acoustic, thick: 0.3 });
    // dimmable LED slots and surround speakers along the audience zone
    for (let d = blackD + 1.2; d < h.depth - 1.0; d += T.slats ? 2.4 : 3.0) { const z = zs + d; if (gaps.length && Math.abs(z - h.doorZ(side)) < DOOR_W / 2 + 0.5) continue; const fy = hallFloorY(h, side < 0 ? h.x0 + 0.3 : h.x1 - 0.3, z);
      room.glowBox(side < 0 ? x : x - 0.03, fy + 1.1, z - 0.025, side < 0 ? x + 0.03 : x, top - 0.7, z + 0.025, T.led, 1.6, 1, side < 0 ? 'px' : 'nx');
      L.line(x - side * 0.15, fy + 1.3, z, x - side * 0.15, top - 0.9, z, T.led, 0.35, 5, 'h');
      if (Math.round(d / 3) % 2 === 0) room.kit(speakerKit(), x - side * 0.17, Math.max(fy + 2.9, 2.6), z + 1.5, side < 0 ? Math.PI / 2 : -Math.PI / 2); }
  }
  room.wall('x', zs, h.x0, h.x1, yF, top, 1, '#08080a', [], { mat: MAT.acoustic, thick: 0.3 });
  room.wall('x', h.zBack, h.x0, h.x1, yF, top, -1, T.wall2, [], { mat: MAT.acoustic, thick: 0.3 });
  if (T.cove) for (const [x, d] of [[h.x0, 1], [h.x1, -1]]) { room.glowBox(d > 0 ? x : x - 0.05, top - 0.42, zs + 0.5, d > 0 ? x + 0.05 : x, top - 0.38, h.zBack - 0.3, T.led, 2.2, 1, d > 0 ? 'px ny' : 'nx ny'); L.line(x + d * 0.3, top - 0.5, zs + 1, x + d * 0.3, top - 0.5, h.zBack - 1, T.led, 0.5, 6, 'h', [d * 0.3, -0.9, 0]); }   // Dolby-style light line along the walls
  // projector porthole (the only trace of the projector: no fake beam)
  room.box(cx - 0.6, top - 1.9, h.zBack - 0.06, cx + 0.6, top - 1.35, h.zBack - 0.001, '#050608', { mat: MAT.glass, faces: 'nz' }); room.glowBox(cx - 0.18, top - 1.72, h.zBack - 0.07, cx + 0.18, top - 1.55, h.zBack - 0.06, '#dfe8ff', 2.2, 0, 'nz');
  // ceiling: black, recessed downlights (dimmable), star field over the premium hall
  room.flat(h.x0, zs, h.x1, h.zBack, top, false, T.ceil, { mat: MAT.paint });
  const nx = Math.max(3, Math.round((h.x1 - h.x0) / 3.6)), nzz = Math.max(4, Math.round(h.depth / 3.4)), dlI = 2.2 * top * top / 6;
  for (let i = 0; i < nx; i++) for (let j = 1; j < nzz; j++) { const x = h.x0 + (i + 0.5) * (h.x1 - h.x0) / nx, z = zs + j * h.depth / nzz; if (j * h.depth / nzz < h.stageD + 1) continue;
    room.box(x - 0.09, top - 0.012, z - 0.09, x + 0.09, top - 0.004, z + 0.09, '#fff1dc', { glow: true, grp: 1, faces: 'ny' }); L.spot(x, top - 0.1, z, '#ffd8a8', dlI, top + 5, 'h', [0, -1, 0], 28, 62); }
  if (T.stars) { let s = 77; const R = () => (s = (s * 16807) % 2147483647) / 2147483647; for (let i = 0; i < 260; i++) { const x = h.x0 + 0.4 + R() * (h.x1 - h.x0 - 0.8), z = zs + 3 + R() * (h.depth - 4); room.glowBox(x - 0.012, top - 0.006, z - 0.012, x + 0.012, top - 0.002, z + 0.012, '#fff6e0', 0.6 + R() * 1.6, 0, 'ny'); } }
  L.ambient('#ffe6c8', '#ffdcb8', 0.07, 'h'); L.ambient('#9aa6c8', '#7a7f99', 0.012, 'f');
  // ---------- screen, masking, stage, curtains ----------
  const sd = BEHIND, W = h.W, Hh = h.H, cy = h.centreY, curved = h.sag > 0, R = h.R, arc = h.arc, zc = zs + sd + (curved ? R : 0);
  const ptAt = (t, y) => curved ? [cx + R * Math.sin((t - 0.5) * arc), y, zc - R * Math.cos((t - 0.5) * arc)] : [cx + (t - 0.5) * W, y, zs + sd];
  // picture surface (also used for the screen light patches)
  const S = 48, pPos = [], pUv = [], pIdx = [];
  for (let i = 0; i <= (curved ? S : 1); i++) { const t = i / (curved ? S : 1), a = ptAt(t, cy - Hh / 2), b = ptAt(t, cy + Hh / 2); pPos.push(...a, ...b); pUv.push(t, 0, t, 1); if (i < (curved ? S : 1)) { const k = i * 2; pIdx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); } }
  const picGeo = new THREE.BufferGeometry(); picGeo.setAttribute('position', new THREE.Float32BufferAttribute(pPos, 3)); picGeo.setAttribute('uv', new THREE.Float32BufferAttribute(pUv, 2)); picGeo.setIndex(pIdx); picGeo.computeVertexNormals();
  const patches = []; const NP = curved ? 5 : 1; for (let i = 0; i < NP; i++) { const t0 = i / NP, t1 = (i + 1) / NP, a = ptAt(t0, cy), b = ptAt(t1, cy), c = [(a[0] + b[0]) / 2, cy, (a[2] + b[2]) / 2], u = [(b[0] - a[0]) / 2, 0, (b[2] - a[2]) / 2], ul = Math.hypot(u[0], u[2]), nrm = [-u[2] / ul, 0, u[0] / ul];
    patches.push({ c, u, v: [0, Hh / 2, 0], n: [nrm[0], 0, nrm[2]], su: curved ? 2 : 5, sv: 3 }); }
  for (const p of patches) if (p.n[2] < 0) { p.n[0] *= -1; p.n[2] *= -1; }
  L.setScreen(patches);
  // masking: black velvet border hugging the picture (follows the curve)
  const mk = new Acc(), bw = 0.35, bandQuads = [];
  for (let i = 0; i < (curved ? S : 1); i++) { const t0 = i / (curved ? S : 1), t1 = (i + 1) / (curved ? S : 1);
    for (const [y0, y1] of [[cy + Hh / 2, cy + Hh / 2 + bw], [cy - Hh / 2 - bw, cy - Hh / 2]]) { const a = ptAt(t0, y0), b = ptAt(t1, y0), c = ptAt(t1, y1), d = ptAt(t0, y1); const off = (p) => [p[0], p[1], p[2] + 0.01]; bandQuads.push([off(a), off(b), off(c), off(d)]); } }
  for (const t of [0, 1]) { const e = ptAt(t, 0), s = t === 0 ? -1 : 1; bandQuads.push(s < 0 ? [[e[0] - bw, cy - Hh / 2 - bw, e[2] + 0.01], [e[0], cy - Hh / 2 - bw, e[2] + 0.01], [e[0], cy + Hh / 2 + bw, e[2] + 0.01], [e[0] - bw, cy + Hh / 2 + bw, e[2] + 0.01]] : [[e[0], cy - Hh / 2 - bw, e[2] + 0.01], [e[0] + bw, cy - Hh / 2 - bw, e[2] + 0.01], [e[0] + bw, cy + Hh / 2 + bw, e[2] + 0.01], [e[0], cy + Hh / 2 + bw, e[2] + 0.01]]); }
  room.acc.add(quadGeo(bandQuads), null, '#060607', { mat: MAT.fabric });
  // wall behind the picture edges (curved screens stand off the wall at their edges): black side cheeks
  if (curved) for (const t of [0, 1]) { const e = ptAt(t, 0), s = t === 0 ? -1 : 1; room.box(s < 0 ? h.x0 : e[0] + bw, yF, zs, s < 0 ? e[0] - bw : h.x1, top, e[2] + 0.02, '#08080a', { mat: MAT.acoustic, faces: 'pz' }); }
  // stage with LED edge (curved for the curved hall)
  const stQ = [], stF = [], stH = yF + 0.32, NS = curved ? 24 : 1;
  for (let i = 0; i < NS; i++) { const t0 = i / NS, t1 = (i + 1) / NS, a = ptAt(t0 - 0.03 * (i === 0), 0), b = ptAt(t1 + 0.03 * (i === NS - 1), 0), ex = 0.9;
    const fa = [a[0], stH, a[2] + ex], fb = [b[0], stH, b[2] + ex]; stQ.push([[a[0], stH, a[2] - 0.2], [fa[0], stH, fa[2]], [fb[0], stH, fb[2]], [b[0], stH, b[2] - 0.2]]); stF.push([[fa[0], yF, fa[2]], [fb[0], yF, fb[2]], [fb[0], stH, fb[2]], [fa[0], stH, fa[2]]]);
    const za = Math.min(fa[2], fb[2]), zb = Math.max(fa[2], fb[2]); room.glowBox(Math.min(fa[0], fb[0]), stH - 0.03, zb + 0.004, Math.max(fa[0], fb[0]), stH - 0.015, zb + 0.016, T.accent, 1.4, 1, 'pz ny'); }
  room.acc.add(quadGeo(stQ), null, '#141416', { mat: MAT.lacquer }); room.acc.add(quadGeo(stF), null, '#0d0d0f', { mat: MAT.paint });
  room.col(h.x0, zs, h.x1, zs + sd + h.sagD + 0.9);
  // curtain wash light (house) so the closed curtain glows warmly before the show
  L.spot(cx, top - 0.3, zs + sd + 5, '#ffcf9e', 3.2 * top, top + 8, 'h', [0, -0.55, -0.83], 25, 55);
  // ---------- crossing aisle guard rail (the riser in front of it is high) ----------
  const cr = h.cross.row, railD = h.pf[cr] + 0.05;
  const glass = mats.glassMat(), pane = (x0, z0, x1, z1) => { const len = Math.hypot(x1 - x0, z1 - z0), m = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.72), glass); m.position.set((x0 + x1) / 2, h.rowY[cr] + 0.41, (z0 + z1) / 2); m.rotation.y = -Math.atan2(z1 - z0, x1 - x0); m.renderOrder = 5; room.add(m); };
  if (!h.rowR) { room.kit(railKit(h.B), cx, h.rowY[cr], Z(railD, 0), 0); room.col(cx - hb, Z(railD, 0) - 0.05, cx + hb, Z(railD, 0) + 0.05); pane(cx - hb, Z(railD, 0), cx + hb, Z(railD, 0)); }
  else for (let i = 0; i < 6; i++) { const u0 = -hb + h.B * i / 6, u1 = -hb + h.B * (i + 1) / 6, um = (u0 + u1) / 2, len = Math.hypot(u1 - u0, h.rowSag(u1) - h.rowSag(u0)), yaw = -Math.atan2(h.rowSag(u1) - h.rowSag(u0), u1 - u0);
    room.kit(railKit(len - 0.006, 0.8, i === 5), cx + um, h.rowY[cr], Z(railD, um), yaw); room.col(cx + u0, Math.min(Z(railD, u0), Z(railD, u1)) - 0.05, cx + u1, Math.max(Z(railD, u0), Z(railD, u1)) + 0.05); pane(cx + u0, Z(railD, u0), cx + u1, Z(railD, u1)); }
  // ---------- doors: exit sign above each, light from the passage spills in ----------
  for (const side of doorSides) { const x = side < 0 ? h.x0 : h.x1, z = h.doorZ(side), inX = x - side * 0.02;
    room.glowBox(side < 0 ? x : x - 0.04, DOOR_H + 0.25, z - 0.28, side < 0 ? x + 0.04 : x, DOOR_H + 0.47, z + 0.28, '#27e36b', 1.8, 0, side < 0 ? 'px' : 'nx');
    L.point(inX - side * 0.3, DOOR_H + 0.3, z, '#3dff86', 0.35, 3.5, 'f'); L.point(inX - side * 0.6, 1.5, z, '#ffd2a0', 0.5, 4, 'h');
    // door reveal inside the wall thickness (black) so the opening reads as a portal
    for (const s2 of [-1, 1]) room.box(side < 0 ? x - 0.3 : x, 0, z + s2 * DOOR_W / 2 - (s2 > 0 ? 0 : 0.001), side < 0 ? x : x + 0.3, DOOR_H, z + s2 * DOOR_W / 2 + (s2 > 0 ? 0.001 : 0), '#0b0b0d', { faces: s2 > 0 ? 'nz' : 'pz', mat: MAT.paint });
    room.box(side < 0 ? x - 0.3 : x, DOOR_H, z - DOOR_W / 2, side < 0 ? x : x + 0.3, DOOR_H + 0.001, z + DOOR_W / 2, '#0b0b0d', { faces: 'ny', mat: MAT.paint }); }
  // ---------- seats and arms: Kiln assets (tools/kiln), two instanced LODs each, light baked per instance ----------
  const seats = hallSeats(h), curvedK = h.kind === 'curved', seatName = { standard: 'seat_standard', curved: 'recliner', giant: 'seat_giant' }[h.kind], armName = curvedK ? 'console_recliner' : 'arm_standard';
  const flip = new THREE.Matrix4().makeRotationY(Math.PI);   // assets face +z; a seat with yaw 0 faces the screen (-z)
  const armOver = h.kind === 'standard' ? { Mesh_Panel: { id: MAT.velvet, tint: col('#1d5a56') } } : h.kind === 'giant' ? { Mesh_Cap: { id: MAT.leather, tint: col('#1c1a1a') } } : null;
  const seatGeo = [0, 1].map((l) => assetGeometry(seatName, l, flip, toGeometry, Acc)), armGeo = [0, 1].map((l) => assetGeometry(armName, l, flip, toGeometry, Acc, armOver));
  // arm positions: every seat boundary of every row (n + 1 per row), following curved rows like the seats do
  const arms = [];
  for (let r = 0; r < h.rows; r++) for (let c = 0; c <= h.perRow; c++) { const u = -h.B / 2 + c * h.seatW; arms.push({ x: h.cx + u, y: h.rowY[r], z: zs + h.dHip[r] - h.rowSag(u), yaw: h.rowR ? -Math.asin(u / h.rowR) : 0 }); }
  const H3 = [0, 0, 0], F3 = [0, 0, 0], litOf = (list) => { const a = new Float32Array(list.length * 7); list.forEach((s, i) => { L.at(s.x, s.y + 0.9, s.z + 0.2, 0, 0.6, 0.8, H3, F3); a.set([H3[0], H3[1], H3[2], F3[0], F3[1], F3[2], L.screenAt(s.x, s.y + 0.8, s.z - 0.3, 0, 0.29, -0.96)], i * 7); }); return a; };
  const lit = litOf(seats), armLit = litOf(arms), seatU = room.U;
  const instanced = (geos, n) => geos.map((g) => { const m = new THREE.InstancedMesh(g, mats.litFor(seatU, g, true), n); m.count = 0; m.frustumCulled = false;
    m.geometry.setAttribute('iLh', new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3)); m.geometry.setAttribute('iLf', new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3)); m.geometry.setAttribute('iLs', new THREE.InstancedBufferAttribute(new Float32Array(n), 1)); room.add(m); return m; });
  const meshes = instanced(seatGeo, seats.length), armMeshes = instanced(armGeo, arms.length);
  // colliders: one per row (straight) or per seat (curved)
  if (!h.rowR) for (let r = 0; r < h.rows; r++) { const d = h.dHip[r]; room.col(cx - hb - 0.05, zs + d - h.seat.fr, cx + hb + 0.05, zs + d + h.seat.bk); }
  else for (const s of seats) room.col(s.x - h.seatW / 2, s.z - h.seat.fr, s.x + h.seatW / 2, s.z + h.seat.bk);
  const tmp = new THREE.Object3D(); let last = [1e9, 1e9, 9];
  seats.forEach((s, i) => { s.i = i; });
  const hall = { cfg: h, key: h.key, id: h.id, room, seats, meshes, theme: T, picGeo, patches, ptAt, curtains: null, seatLit: lit,
    // seats near you use the detailed tier; a seat changes tier only 0.8 m past the line (no flicker while you stand near it)
    updateLOD(cam, force, far = 7) {
      const px = cam.position.x, pz = cam.position.z; if (!force && Math.hypot(px - last[0], pz - last[1]) < 0.5) return; last = [px, pz];
      const fin = (far - 0.8) ** 2, fout = (far + 0.8) ** 2;
      for (const [list, ms, lt] of [[seats, meshes, lit], [arms, armMeshes, armLit]]) {
        const cnt = [0, 0];
        for (let i = 0; i < list.length; i++) { const s = list[i], dx = s.x - px, dz = s.z - pz, d2 = dx * dx + dz * dz, l = s.lod = force ? (d2 < far * far ? 0 : 1) : s.lod === 1 ? (d2 < fin ? 0 : 1) : (d2 > fout ? 1 : 0), m = ms[l], k = cnt[l]++;
          tmp.position.set(s.x, s.y, s.z); tmp.rotation.y = s.yaw; tmp.updateMatrix(); m.setMatrixAt(k, tmp.matrix);
          const a = m.geometry.attributes; a.iLh.setXYZ(k, lt[i * 7], lt[i * 7 + 1], lt[i * 7 + 2]); a.iLf.setXYZ(k, lt[i * 7 + 3], lt[i * 7 + 4], lt[i * 7 + 5]); a.iLs.setX(k, lt[i * 7 + 6]); }
        ms.forEach((m, i) => { m.count = cnt[i]; m.instanceMatrix.needsUpdate = true; for (const n of ['iLh', 'iLf', 'iLs']) m.geometry.attributes[n].needsUpdate = true; });
      }
    },
  };
  // ---------- curtains (H1, H2): separate baked meshes that slide open ----------
  if (T.curtain) {
    const cw = W / 2 + 0.6, zC = zs + sd + h.sagD + 0.35, ch = cy + Hh / 2 + 0.5;
    const mkCurtain = (s) => {   // s = -1 left half (outer edge on the left), +1 right half; local origin at the outer edge, spans toward the centre
      const a = new Acc(), n = 28, pos = [], idx = [];
      for (let i = 0; i <= n; i++) { const t = i / n, x = -s * t * cw, fold = (i % 2 ? 1 : -1) * 0.07; pos.push(x, yF + 0.33, fold, x, ch, fold); if (i < n) { const k = i * 2; if (s < 0) idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); else idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); a.add(g, null, T.curtain, { mat: MAT.fabric }); return toGeometry(a); };
    const cms = [-1, 1].map((s) => { const geo = mkCurtain(s), px = cx + s * cw; geo.translate(px, 0, zC); L.bake(geo); geo.translate(-px, 0, -zC); const m = new THREE.Mesh(geo, mats.litFor(room.U, geo)); m.position.set(px, 0, zC); room.add(m); return m; });
    hall.curtains = { meshes: cms, open: 0, target: 0 };
  }
  const slate = slateTexture(h.name, 768, Math.round(768 / h.aspect)), picMat = mats.picMat(slate), pic = new THREE.Mesh(picGeo, picMat); pic.renderOrder = 1; room.add(pic);
  hall.pic = pic; hall.picMat = picMat; hall.slate = slate; picMat.uniforms.uGain.value = 0.3;
  hall.zScreen = zs + sd; hall.screenY = cy; hall.curved = curved;
  return hall;
}
export { quadGeo };
