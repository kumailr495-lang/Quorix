// LUMIERE v9 - the world, loaded from the Blender building (tools/blender/arch -> tools/bake -> www/bake). Each room's shell is its baked
// GLB with the Cycles light maps; its emitters, lights and panels come from www/bake/<room>_x.json. The engine adds what moves or what
// you use: doors (one-way where the flow needs it), the two escalators, the lift, the travelator, the hall seats (instanced), the
// screens and the curtains. Floors are computed from building.js and hallmath.js (the numbers the model was built from); the walls you
// bump into are read from the shell itself (every near-vertical face, cut into 0.5 m height bands), so you collide with what you see.
import * as THREE from 'three';
import { dressStreet } from './street12.js';
import { BAKES } from './lightmap.js';
import { Lights } from './bake.js';
import { roomUniforms, G } from './materials.js';
import { Acc, toGeometry, M, MAT, boxGeo } from './geom.js';
import { HALL, L1, ROOMS, DOORS, ESC, escProfile, LIFT, GALLERY, TRAVELATOR, GATE, LOBBY, MEZZ, SPINE, BRIDGE, FLANK_W, LINK_W, PANTRY, FLANK_E, LINK_E, WC, STREET, EXIT_STAIRS } from './building.js';
import { hallSeats, hallFloor, SEAT, SCREEN_GAP, WALL } from './hallmath.js';
import { ASSETS, assetGeometry, placeAsset } from './assets.js';
import { texturesReady, named } from './library.js';
import { makeCanvas, SANS, SERIF } from './textures.js';
import { posterURL } from './films.js';
import { Lift } from './lift9.js';
const frame = () => new Promise((r) => requestAnimationFrame(() => r()));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), IN = (r, x, z, m = 0) => x >= r.x0 - m && x <= r.x1 + m && z >= r.z0 - m && z <= r.z1 + m;
const b64f = (s) => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return new Float32Array(u.buffer); };
const HALLS = Object.values(HALL), HALL_BY_KEY = Object.fromEntries(HALLS.map((h) => [h.key, h])), CORR = [BRIDGE, FLANK_W, LINK_W, PANTRY, FLANK_E, LINK_E];
export const STEP_UP = 0.4, HEAD = 1.75;
// target average light level per room with its house lights up (docs/V9-DESIGN.md section 5: bright spine, dim Dolby corridor)
// ambient fill on top of the light map (dims with the house lights): the dim corridor's dark walls stay readable, the night street too
const FILL = { corridor: 0.42, street: 0.03 };
// v10 softer light per room (materials.js uSoft): how much of the soft curve each room takes; halls less (their dark is the point)
const SOFT = { lobby: 0.85, corridor: 0.8, spine: 0.75, wc: 0.75, street: 0.6 };
export const LEVEL = { hallMax: 0.5, hallCurve: 0.5, hallClassic: 0.55, hall270: 0.5, lobby: 0.42, corridor: 0.22, spine: 0.8, wc: 0.55, street: 0.15 };   // v12 street: 0.25 read black with no fill, 0.3 with a strong fill an evening; midnight is a low fill, darker fronts and 0.15
function scaleLights(L, k) { const A = L.L; for (let i = 0; i < A.length; i += 14) { A[i + 3] *= A[i + 7] ? Math.min(k, 10) : k; A[i + 4] *= A[i + 7] ? Math.min(k, 10) : k; A[i + 5] *= A[i + 7] ? Math.min(k, 10) : k; }
  for (const ch of ['h', 'f']) for (const s of ['up', 'down']) L.amb[ch][s] = L.amb[ch][s].map((v) => v * (ch === 'h' ? k : Math.min(k, 10))); }   // a face lower than STEP_UP above your feet is a step you walk over; above HEAD it is overhead

// ---------------------------------------------------------------- where am I: room, floor height (y = where your feet are now)
export function roomAt(x, y, z) {
  // a hall owns its screen and rear walls' thickness too: the exit and entry doors stand in them (v9 route test: the floor dropped there)
  for (const h of HALLS) { const q = h.toLocal(x, z); if (Math.abs(q.u) <= h.width / 2 + 0.05 && q.d >= -SCREEN_GAP - WALL && q.d <= h.depthIn + WALL) return h.key; }
  if (y > L1 - 1.2) for (const r of CORR) if (IN(r, x, z)) return 'corridor';
  if (IN(SPINE, x, z) && z < SPINE.z1 - 0.02) return 'spine';
  if (IN(LOBBY, x, z)) return 'lobby';
  if (IN(WC, x, z)) return 'wc';
  if (IN(STREET, x, z, 0.5)) return 'street';
  if (x > STREET.x0 - 6.5 && x < STREET.x1 + 6.5 && z > STREET.z0 - 0.5 && z < STREET.far + 0.5) return 'street';   // v12: the street's ends, up to the blocks across them
  for (const r of CORR) if (IN(r, x, z)) return 'corridor';
  return null;
}
// v11: the lift stands in front of the mezzanine, beside the escalators; on the first floor a gallery joins its rear door to the mezzanine
const CAB = { x0: LIFT.x0, x1: LIFT.x1, z0: LIFT.z0 - 0.01, z1: LIFT.z1 + 0.01 };
const onMezz = (x, z) => (z >= MEZZ.z0 && z <= MEZZ.z1 && !IN(MEZZ.void, x, z)) || IN(GALLERY, x, z);
function stairY(x, z, y) {
  for (const s of EXIT_STAIRS) {
    if (x < Math.min(s.x0, s.x1) || x > Math.max(s.x0, s.x1)) continue;
    const t = (z - s.zTop) * s.dir, back = (z - s.zDoor) * s.dir;
    if (t < 0 && back > -s.lh) { if (y > s.y0 - 0.8) return s.y0; continue; }
    if (t >= 0 && t < s.n * s.tread) { const ys = s.y0 - (Math.floor(t / s.tread) + 1) * s.rise; if (y > ys - 0.8) return ys; }
  }
  return null;
}
// ---------------------------------------------------------------- collision: wall segments in 2 m buckets, each with its height range
class Walls {
  constructor() { this.S = []; this.K = []; this.B = new Map(); }
  add(ax, az, bx, bz, y0, y1, solid = 0) {   // solid 1: part of the building (walls, glass, counters); 0: furniture, seats, props
    const i = this.S.length / 6; this.S.push(ax, az, bx, bz, y0, y1); this.K.push(solid);
    for (let gx = Math.floor((Math.min(ax, bx) - 0.4) / 2); gx <= Math.floor((Math.max(ax, bx) + 0.4) / 2); gx++) for (let gz = Math.floor((Math.min(az, bz) - 0.4) / 2); gz <= Math.floor((Math.max(az, bz) + 0.4) / 2); gz++) {
      const k = gx * 4096 + gz; let l = this.B.get(k); if (!l) this.B.set(k, l = []); l.push(i); }
  }
  // every face steeper than ~70 deg, clipped into 0.5 m bands: a band keeps the face's span across the floor within that height only
  fromGeometry(geo, yMax) {
    const P = geo.attributes.position, I = geo.index ? geo.index.array : null, n = I ? I.length : P.count, v = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (let t = 0; t < n; t += 3) {
      for (let k = 0; k < 3; k++) { const j = I ? I[t + k] : t + k; v[k][0] = P.getX(j); v[k][1] = P.getY(j); v[k][2] = P.getZ(j); }
      const e1x = v[1][0] - v[0][0], e1y = v[1][1] - v[0][1], e1z = v[1][2] - v[0][2], e2x = v[2][0] - v[0][0], e2y = v[2][1] - v[0][1], e2z = v[2][2] - v[0][2];
      const nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x, nl = Math.hypot(nx, ny, nz); if (nl < 1e-9 || Math.abs(ny / nl) > 0.34) continue;
      const lo = Math.min(v[0][1], v[1][1], v[2][1]), hi = Math.min(yMax, Math.max(v[0][1], v[1][1], v[2][1])); if (hi - lo < 0.04) continue;
      for (let b = Math.floor(lo / 0.5); b * 0.5 < hi; b++) {
        const y0 = Math.max(lo, b * 0.5), y1 = Math.min(hi, b * 0.5 + 0.5); if (y1 - y0 < 0.02) continue;
        const pts = clipBand(v, y0, y1); if (pts.length < 2) continue;
        let best = -1, pa = null, pb = null; for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) { const d = (pts[i][0] - pts[j][0]) ** 2 + (pts[i][2] - pts[j][2]) ** 2; if (d > best) { best = d; pa = pts[i]; pb = pts[j]; } }
        if (best < 1e-4) continue; this.add(pa[0], pa[2], pb[0], pb[2], y0, y1, 1);
      }
    }
  }
  near(x, z, out) { out.length = 0; const gx = Math.floor(x / 2), gz = Math.floor(z / 2), l = this.B.get(gx * 4096 + gz); if (l) for (const i of l) out.push(i); return out; }
  // v11 line of sight in plan from a to b within the heights y0..y1: false when a wall of the building crosses it (the user: "a Sit button
  // showing through the wall; I sit on the other side of it"). Furniture and seats never block it. The last `back` metres before b are
  // left out, so a thing standing against a wall is still seen from its own side.
  sees(ax, az, bx, bz, y0, y1, back = 0.3) {
    const L = Math.hypot(bx - ax, bz - az); if (L <= back + 0.05) return true; const k = (L - back) / L; bx = ax + (bx - ax) * k; bz = az + (bz - az) * k;
    const S = this.S, K = this.K, done = new Set(), cr = (px, pz, qx, qz, rx, rz) => (qx - px) * (rz - pz) - (qz - pz) * (rx - px);
    for (let gx = Math.floor((Math.min(ax, bx) - 0.4) / 2); gx <= Math.floor((Math.max(ax, bx) + 0.4) / 2); gx++) for (let gz = Math.floor((Math.min(az, bz) - 0.4) / 2); gz <= Math.floor((Math.max(az, bz) + 0.4) / 2); gz++) {
      const l = this.B.get(gx * 4096 + gz); if (!l) continue;
      for (const i of l) { if (!K[i] || done.has(i)) continue; done.add(i); const j = i * 6; if (S[j + 5] <= y0 || S[j + 4] >= y1) continue;
        const o1 = cr(ax, az, bx, bz, S[j], S[j + 1]), o2 = cr(ax, az, bx, bz, S[j + 2], S[j + 3]), o3 = cr(S[j], S[j + 1], S[j + 2], S[j + 3], ax, az), o4 = cr(S[j], S[j + 1], S[j + 2], S[j + 3], bx, bz);
        if (o1 * o2 < 0 && o3 * o4 < 0) return false; } }
    return true;
  }
}
function splitGlass(geo) {
  const mid = geo.attributes.matid; if (!mid || !geo.index) return null; const I = geo.index.array, keep = [], glass = [];
  for (let t = 0; t < I.length; t += 3) (Math.round(mid.getX(I[t])) === MAT.glass ? glass : keep).push(I[t], I[t + 1], I[t + 2]);
  if (!glass.length) return null; geo.clearGroups(); geo.setIndex(keep);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', geo.attributes.position); g.setAttribute('normal', geo.attributes.normal); g.setIndex(glass); return g;
}
function clipBand(tri, y0, y1) {   // Sutherland-Hodgman against y >= y0 and y <= y1
  let poly = tri.map((p) => p.slice());
  for (const [lim, keepAbove] of [[y0, true], [y1, false]]) {
    const out = []; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length], ia = keepAbove ? a[1] >= lim : a[1] <= lim, ib = keepAbove ? b[1] >= lim : b[1] <= lim;
      if (ia) out.push(a); if (ia !== ib) { const t = (lim - a[1]) / (b[1] - a[1]); out.push([a[0] + (b[0] - a[0]) * t, lim, a[2] + (b[2] - a[2]) * t]); } }
    poly = out; if (!poly.length) break;
  }
  return poly;
}
// ---------------------------------------------------------------- doors
// kind: slide (automatic glass), pair (padded double doors into a hall), push (steel exit doors with bars), open (no leaves).
// from: the side you may pass from (+1 / -1 along the door's normal), 0 = both ways. axis 'x': the door lies along x (normal +z).
class Door {
  constructor(world, d) {
    Object.assign(this, { id: d.id, def: d, x: d.x, z: d.z, y: d.y || 0, w: d.w, h: d.h, axis: d.axis, kind: d.kind, rooms: d.rooms, hall: d.hall || null, open: 0, target: 0 });
    this.from = d.hall ? -HALL[d.hall].dir : d.oneWay === 'spine' ? -1 : 0; this.reach = d.kind === 'slide' ? 2.8 : 2.2;
    this.group = new THREE.Group(); this.group.position.set(d.x, this.y, d.z); this.group.rotation.y = d.axis === 'x' ? 0 : Math.PI / 2; this.group.updateMatrixWorld(true);
    if (d.kind === 'open') return;
    const room = world.rooms[d.oneWay && world.rooms[d.oneWay] ? d.oneWay : d.rooms[0]] || world.rooms[d.rooms[1]], half = d.w / 2, into = -(this.from || 1);
    this.leaves = [-1, 1].map((s) => {
      const g = leafGeo(half - 0.01, d.h - 0.01, d.kind, s, s > 0 ? -into : 0), wx = new THREE.Matrix4().makeTranslation(s * half, 0, 0).premultiply(this.group.matrixWorld);
      g.applyMatrix4(wx); room.lights.bake(g); g.applyMatrix4(wx.clone().invert());
      const m = new THREE.Mesh(g, world.mats.litFor(room.U, g)); m.name = 'door-' + d.id; m.position.x = s * half; this.group.add(m); return { m, s }; });
    if (d.kind === 'slide') this.glass = [-1, 1].map((s) => { const q = new THREE.Mesh(new THREE.PlaneGeometry(half - 0.12, d.h - 0.14), world.mats.glassMat()); q.position.set(s * half / 2, d.h / 2, 0); this.group.add(q); return q; });
  }
  local(a) { const dx = a.x - this.x, dz = a.z - this.z; return this.axis === 'x' ? [dx, dz] : [-dz, dx]; }   // [along, normal]
  update(dt, actors) {
    if (this.kind === 'open') return; let want = false;
    for (const a of actors) { if (Math.abs((a.y || 0) - this.y) > 1.6) continue; const [t, n] = this.local(a); if (Math.abs(t) > this.w / 2 + 0.5) continue;
      if (Math.abs(n) < 0.5 && this.open > 0.25) { want = true; break; }
      if (Math.abs(n) < this.reach && (!this.from || Math.sign(n) === this.from)) { want = true; break; } }
    const t = want ? 1 : 0; if (t !== this.target) { this.target = t; this.onToggle && this.onToggle(t, this); }
    this.open += (this.target - this.open) * (1 - Math.exp(-dt * (this.target ? (this.kind === 'slide' ? 5 : 4) : 2.4)));
    if (this.kind === 'slide') { const off = this.open * (this.w / 2 - 0.08); this.leaves[0].m.position.x = -this.w / 2 - off; this.leaves[1].m.position.x = this.w / 2 + off; this.glass[0].position.x = -this.w / 4 - off; this.glass[1].position.x = this.w / 4 + off; }
    else { const e = this.open * this.open * (3 - 2 * this.open), ang = e * 1.55, into = -(this.from || 1); for (const L of this.leaves) L.m.rotation.y = L.s * into * ang; }
  }
  get blocking() { return this.kind !== 'open' && this.open < 0.7; }
  segment() { const h = this.w / 2; return this.axis === 'x' ? [this.x - h, this.z, this.x + h, this.z] : [this.x, this.z - h, this.x, this.z + h]; }
}
// one leaf in its hinge frame: the hinge on local x = 0, the leaf spans towards the door's centre (-s), thickness along z.
// astragal (-1/+1, 0 none): a strip on that face over the meeting edge, on the side away from the swing, so a shut pair shows no gap
function leafGeo(lw, h, kind, s, astragal = 0) {
  const a = new Acc(), t = kind === 'slide' ? 0.045 : 0.06, m = (x, y, z) => M(-s * x, y, z);
  if (kind === 'slide') { const fw = 0.06, fc = '#2a2b30';
    a.add(boxGeo(lw - 2 * fw, fw, t), m(lw / 2, h - fw / 2, 0), fc, { mat: MAT.metal }); a.add(boxGeo(lw - 2 * fw, fw * 1.6, t), m(lw / 2, fw * 0.8, 0), fc, { mat: MAT.metal });   // rails between the stiles
    a.add(boxGeo(fw, h, t), m(fw / 2, h / 2, 0), fc, { mat: MAT.metal }); a.add(boxGeo(fw, h, t), m(lw - fw / 2, h / 2, 0), fc, { mat: MAT.metal });
    a.add(boxGeo(0.03, 0.9, 0.05), m(lw - 0.16, 1.05, t), '#c9a35e', { mat: MAT.brass }); return toGeometry(a); }
  // v9.3 (the user's photo of a ScreenX entrance): hall doors in dark graphite with a tall narrow vision panel and a steel pull
  const exit = kind === 'push', c = exit ? '#2b2e34' : '#26272b';
  a.add(boxGeo(lw, h, t), m(lw / 2, h / 2, 0), c, { mat: MAT.powder });
  if (astragal) a.add(boxGeo(0.05, h - 0.02, 0.012), m(lw + 0.01, h / 2, astragal * (t / 2 + 0.006)), exit ? '#3a3d44' : '#1c1d20', { mat: MAT.powder });
  // v11 (the user: no floating or disconnected parts, no shared faces): the vision panel is glass set 4 mm back in a bronze bead ring (the
  // glass and a plate behind it shared their back faces, the plate's face sat 2 mm behind the glass's); the pull and the push bar stand on
  // posts set into the leaf and the bar (they floated 2 and 1.5 cm off the leaf with nothing holding them)
  const ring = (cx, cy, w, h, b, col) => { for (const z of [-1, 1]) { const zc = z * (t / 2 + 0.0045);   // a bead ring b wide round a w x h opening: 1.5 mm inside the leaf to 10.5 mm out
      a.add(boxGeo(w + 2 * b, b, 0.012), m(cx, cy + h / 2 + b / 2, zc), col, { mat: MAT.powder }); a.add(boxGeo(w + 2 * b, b, 0.012), m(cx, cy - h / 2 - b / 2, zc), col, { mat: MAT.powder });
      a.add(boxGeo(b, h, 0.012), m(cx - w / 2 - b / 2, cy, zc), col, { mat: MAT.powder }); a.add(boxGeo(b, h, 0.012), m(cx + w / 2 + b / 2, cy, zc), col, { mat: MAT.powder }); } };
  const glassIn = (cx, cy, w, h, col) => a.add(boxGeo(w + 0.01, h + 0.01, t + 0.01), m(cx, cy, 0), col, { mat: MAT.glass });   // through the leaf, 5 mm proud each side (5.5 mm back in the ring), its edges 5 mm into the ring
  if (exit) { ring(lw / 2, 1.62, 0.22, 0.38, 0.02, '#3a3d44'); glassIn(lw / 2, 1.62, 0.22, 0.38, '#0a0c0e'); }
  else { ring(lw * 0.62, 1.55, 0.13, 0.78, 0.02, '#3c3e44'); glassIn(lw * 0.62, 1.55, 0.13, 0.78, '#0b0d10'); }
  for (const z of [-1, 1]) {
    if (exit) { const bl = lw - 0.3, bx = lw / 2 + 0.05;   // the push bar on two posts
      a.add(boxGeo(bl, 0.05, 0.05), m(bx, 1.0, z * (t / 2 + 0.04)), '#c9ccd2', { mat: MAT.chrome });
      for (const ex of [bx - bl / 2 + 0.04, bx + bl / 2 - 0.04]) a.add(boxGeo(0.03, 0.036, 0.022), m(ex, 1.0, z * (t / 2 + 0.008)), '#c9ccd2', { mat: MAT.chrome }); }
    else { a.add(boxGeo(0.028, 0.42, 0.03), m(lw - 0.14, 1.05, z * (t / 2 + 0.035)), '#c9ccd2', { mat: MAT.chrome });
      for (const ey of [1.05 - 0.16, 1.05 + 0.16]) a.add(boxGeo(0.018, 0.022, 0.026), m(lw - 0.14, ey, z * (t / 2 + 0.011)), '#c9ccd2', { mat: MAT.chrome });   // the pull's two posts
      a.add(boxGeo(lw - 0.1, 0.16, 0.006), m(lw / 2, 0.11, z * (t / 2 + 0.003)), '#8d9097', { mat: MAT.chrome }); } }
  return toGeometry(a);
}
// ---------------------------------------------------------------- escalators (EN 115: 30 deg, 0.4 m steps), travelator, lift
function instancedParts(acc, n, U, mats, room) {
  const g = toGeometry(acc, 'occ'); if (!g.attributes.occ) g.setAttribute('occ', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count).fill(1), 1));
  const m = new THREE.InstancedMesh(g, mats.litFor(U, g, true), n); m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  for (const [k, w] of [['iLh', 3], ['iLf', 3], ['iLs', 1]]) g.setAttribute(k, new THREE.InstancedBufferAttribute(new Float32Array(n * w), w));
  room.group.add(m); return m;
}
function lightInstances(m, lights, pts) {   // one light value per instance (house, fixed; no screen) from the room's analytic lights
  const H = [0, 0, 0], F = [0, 0, 0], a = m.geometry.attributes;
  pts.forEach((p, i) => { lights.at(p[0], p[1] + 0.3, p[2], 0, 1, 0, H, F); a.iLh.setXYZ(i, H[0] * 0.9, H[1] * 0.9, H[2] * 0.9); a.iLf.setXYZ(i, F[0], F[1], F[2]); a.iLs.setX(i, 0); });
  for (const k of ['iLh', 'iLf', 'iLs']) a[k].needsUpdate = true;
}
class Escalator {
  constructor(world, e, key) {
    const p = escProfile(e); Object.assign(this, { e, key, p, run: p.run, rise: e.y1 - e.y0, phase: 0, x0: e.x0, x1: e.x1, speed: e.speed, up: !e.reverse });
    this.sTop = 2.8 + p.run; this.n = Math.ceil((this.sTop - 1.2 + 0.8) / 0.4) + 1; const room = world.rooms.lobby, w = e.x1 - e.x0 - 0.12;
    const a = new Acc(); a.add(boxGeo(w, 0.035, 0.38), M(0, -0.0175, -0.19), '#8e9299', { mat: MAT.metal }); a.add(boxGeo(w, 0.184, 0.02), M(0, -0.128, -0.01), '#55585e', { mat: MAT.metal });   // the riser stops under the tread (they shared the step's nose)
    a.add(boxGeo(w, 0.004, 0.04), M(0, 0.002, -0.36), '#d9b23a', { mat: MAT.paint }); for (const sx of [-1, 1]) a.add(boxGeo(0.04, 0.004, 0.33), M(sx * (w / 2 - 0.02), 0.002, -0.175), '#d9b23a', { mat: MAT.paint });   // stop at the front strip
    this.mesh = instancedParts(a, this.n, room.U, world.mats, room); this.mesh.name = 'esc-' + key; this.tmp = new THREE.Object3D();
    { const zi0 = p.incline[0] - 0.6, zi1 = p.incline[1] - 0.6, b0 = e.y0 - 0.25, b1 = e.y1 - 1.1, zh = zi0 + (zi1 - zi0) * clamp((HEAD + 0.1 - b0) / (b1 - b0), 0, 1);
      world.walls.add(e.x0, zh, e.x1, zh, e.y0, e.y0 + HEAD + 0.1); }   // no walking in under the truss where its underside (rooms.py escalator(): b0 -> b1) is below head height
    const pts = []; for (let i = 0; i < this.n; i++) pts.push([(e.x0 + e.x1) / 2, e.y0 + this.rise / 2, e.zBot - this.sTop / 2]); lightInstances(this.mesh, room.lights, pts);
  }
  s(z) { return (this.e.zBot - z) * -this.e.dir; }
  zOf(s) { return this.e.zBot + s * this.e.dir; }
  ramp(s) { return this.e.y0 + clamp((s - 2.0) / this.run, 0, 1) * this.rise; }
  contains(x, z, m = 0) { const s = this.s(z); return x > this.x0 + 0.06 - m && x < this.x1 - 0.06 + m && s > -0.05 && s < this.sTop + 1.25; }
  floor(z) { const s = this.s(z); return this.ramp(s + 0.2) + (s > 1.2 && s < this.sTop ? 0.0 : 0.02); }
  carry(out) { out.z = (this.up ? 1 : -1) * this.speed * this.e.dir; return out; }
  update(dt) {
    this.phase = (this.phase + (this.up ? 1 : -1) * this.speed * dt + 0.4 * 1000) % 0.4; const t = this.tmp, cx = (this.x0 + this.x1) / 2, L = this.n * 0.4;
    for (let i = 0; i < this.n; i++) { const s = 0.8 + ((i * 0.4 + this.phase) % L), under = s < 1.2 || s + 0.4 > this.sTop, y = under ? this.e.y0 + (s < 1.2 ? -0.05 : this.rise - 0.05) : this.ramp(s + 0.4) + 0.012;
      t.position.set(cx, y, this.zOf(s)); t.rotation.set(0, this.e.dir > 0 ? Math.PI : 0, 0); t.scale.setScalar(s > this.sTop + 0.4 ? 0.0001 : 1); t.updateMatrix(); this.mesh.setMatrixAt(i, t.matrix); }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
class Travelator {
  constructor(world, T) {
    Object.assign(this, { T, phase: 0, n: Math.ceil((T.z1 - T.z0) / 0.4) }); const room = world.rooms.spine, w = T.x1 - T.x0 - 0.06, a = new Acc();
    a.add(boxGeo(w, 0.02, 0.385), M(0, 0.01, 0.2), '#7d8188', { mat: MAT.metal }); for (let k = -3; k <= 3; k++) a.add(boxGeo(0.012, 0.004, 0.37), M(k * w / 7, 0.022, 0.2), '#a3a7ad', { mat: MAT.metal });
    this.mesh = instancedParts(a, this.n, room.U, world.mats, room); this.mesh.name = 'travelator'; this.tmp = new THREE.Object3D();
    const pts = []; for (let i = 0; i < this.n; i++) pts.push([0, 0.12, T.z0 + i * 0.4]); lightInstances(this.mesh, room.lights, pts);
  }
  contains(x, z) { return x > this.T.x0 - 0.05 && x < this.T.x1 + 0.05 && z > this.T.z0 - 0.6 && z < this.T.z1 + 0.6; }
  carry(out) { out.z = this.T.speed; return out; }
  update(dt) { this.phase = (this.phase + this.T.speed * dt) % 0.4; const t = this.tmp, L = this.n * 0.4;
    for (let i = 0; i < this.n; i++) { t.position.set((this.T.x0 + this.T.x1) / 2, 0.108, this.T.z0 + ((i * 0.4 + this.phase) % L)); t.updateMatrix(); this.mesh.setMatrixAt(i, t.matrix); } this.mesh.instanceMatrix.needsUpdate = true; }
}
// the lift (lift9.js): a through car with its controls in the world
// ---------------------------------------------------------------- panels: LED wall, boards, signs (canvas textures, back-lit)
const DENSE = { cafemenu: 320, cafesign: 256, picto: 256, art: 320, wayfind: 192, kiosk: 640 };   // canvas pixels per metre for boards with text or fine figures
const rng = (a) => () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
function panelTexture(id, w, h, hooks) {
  const ppm = DENSE[id.split('_')[0]] || 128, px = Math.min(2048, Math.max(256, Math.round(w * ppm))), py = Math.round(px * h / w), c = makeCanvas(px, py), g = c.getContext('2d'), tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4; c.__tex = tx;
  const draw = hooks[id.split('_')[0]]; if (draw) draw(g, px, py, id); else { g.fillStyle = '#111'; g.fillRect(0, 0, px, py); }
  return { tex: tx, canvas: c, g };
}
// the builder placed the west-wall boards at the wall's centre line (tools/blender/arch/rooms.py: x0 + 0.21); its face is 0.2 m further in
const NUDGE = { showtimes: 0.22, menu: 0.22 };
// v10 the ticket zone's header (rooms.py: one beam across the zone front): the screens, the escalators and the lift under one sign
function zoneSign(g, w, h) { g.fillStyle = '#121427'; g.fillRect(0, 0, w, h); g.fillStyle = '#e3b25f'; g.fillRect(0, h * 0.92, w, h * 0.08); g.textBaseline = 'middle'; g.textAlign = 'left';
  // v11: the sign hangs over the escalator hall's portal (3.8 m, an 8:1 board); the v10 beam was 7.2 m. Positions in sign heights, measured
  // so nothing overlaps: the title ends at 3.3 h, the escalator icon starts at 0.42 w, the lift at 0.74 w, the arrow at the right edge
  const ls = (v) => { if ('letterSpacing' in g) g.letterSpacing = v; }, wide = w / h > 12;
  g.fillStyle = '#f4efe6'; g.font = `600 ${h * (wide ? 0.4 : 0.36)}px ${SANS}`; ls(`${h * 0.04}px`); g.fillText('SCREENS 1 – 4', h * 0.42, h * 0.36); ls('0px');
  g.fillStyle = 'rgba(244,239,230,.72)'; g.font = `400 ${h * 0.15}px ${SANS}`; ls(`${h * 0.02}px`); g.fillText(wide ? 'TICKETS PLEASE  ·  TICKET HOLDERS BEYOND THIS POINT' : 'TICKET HOLDERS ONLY', h * 0.42, h * 0.74); ls('0px');
  g.strokeStyle = '#f4efe6'; g.fillStyle = '#f4efe6'; g.lineCap = 'round'; g.lineJoin = 'round'; const lab = h * (wide ? 0.3 : 0.19);
  let x = w * (wide ? 0.52 : 0.42); g.lineWidth = h * 0.08; g.beginPath(); g.moveTo(x, h * 0.74); g.lineTo(x + h * 0.22, h * 0.74); g.lineTo(x + h * 0.62, h * 0.26); g.lineTo(x + h * 0.84, h * 0.26); g.stroke();
  g.beginPath(); g.arc(x + h * 0.4, h * 0.22, h * 0.07, 0, Math.PI * 2); g.fill(); g.lineWidth = h * 0.06; g.beginPath(); g.moveTo(x + h * 0.4, h * 0.3); g.lineTo(x + h * 0.34, h * 0.48); g.stroke();
  g.font = `600 ${lab}px ${SANS}`; ls(`${h * 0.03}px`); g.fillText('ESCALATORS', x + h * 0.98, h * 0.5); ls('0px');
  x = w * (wide ? 0.79 : 0.765); g.lineWidth = h * 0.05; g.strokeRect(x, h * 0.16, h * 0.5, h * 0.64); g.beginPath(); g.moveTo(x + h * 0.25, h * 0.24); g.lineTo(x + h * 0.38, h * 0.42); g.lineTo(x + h * 0.12, h * 0.42); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(x + h * 0.25, h * 0.72); g.lineTo(x + h * 0.38, h * 0.54); g.lineTo(x + h * 0.12, h * 0.54); g.closePath(); g.fill();
  g.font = `600 ${lab}px ${SANS}`; ls(`${h * 0.03}px`); g.fillText('LIFT', x + h * 0.68, h * 0.5); ls('0px');
  g.fillStyle = '#e3b25f'; g.font = `700 ${h * 0.6}px ${SANS}`; g.textAlign = 'right'; g.fillText('↑', w - h * 0.3, h * 0.48); }
export const PANEL_DRAW = {
  // v11 a ticket machine's screen (rooms.py: three on the walnut panel between the box office and the concessions)
  kiosk: (g, w, h) => { g.fillStyle = '#101225'; g.fillRect(0, 0, w, h); g.textAlign = 'center'; g.textBaseline = 'middle'; const ls = (v) => { if ('letterSpacing' in g) g.letterSpacing = v; };
    g.fillStyle = '#e3b25f'; g.font = `500 ${h * 0.07}px ${SERIF}`; ls(`${h * 0.022}px`); g.fillText('LUMIÈRE', w / 2, h * 0.12); ls('0px');
    g.strokeStyle = '#f2ebdd'; g.lineWidth = h * 0.012; g.lineJoin = 'round'; const tw = w * 0.46, th = h * 0.2, tx = (w - tw) / 2, ty = h * 0.25; g.strokeRect(tx, ty, tw, th); g.setLineDash([h * 0.02, h * 0.02]); g.beginPath(); g.moveTo(tx + tw * 0.7, ty); g.lineTo(tx + tw * 0.7, ty + th); g.stroke(); g.setLineDash([]);
    g.fillStyle = '#f2ebdd'; g.font = `700 ${h * 0.1}px ${SANS}`; ls(`${h * 0.012}px`); g.fillText('TICKETS', w / 2, h * 0.6); ls('0px');
    g.fillStyle = '#e3b25f'; const bw = w * 0.74, bh = h * 0.15, bx = (w - bw) / 2, by = h * 0.72; g.beginPath(); g.roundRect ? g.roundRect(bx, by, bw, bh, h * 0.02) : g.rect(bx, by, bw, bh); g.fill();
    g.fillStyle = '#241707'; g.font = `700 ${h * 0.062}px ${SANS}`; g.fillText('TOUCH TO BOOK', w / 2, by + bh * 0.54); },
  // v9.3: the showtime header inside each hall portal (the user's corridor photo): a white number cube, then the hall and what is on
  sign: (g, w, h, id) => { const H_ = HALL[id.split('_')[1]]; g.fillStyle = '#050506'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#f4f4f2'; g.fillRect(h * 0.12, h * 0.12, h * 0.76, h * 0.76); g.fillStyle = '#050506'; g.font = `800 ${h * 0.6}px ${SANS}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(H_ ? String(H_.no) : '', h * 0.5, h * 0.54);
    g.fillStyle = '#f4f4f2'; g.textAlign = 'left'; g.font = `700 ${h * 0.4}px ${SANS}`; if ('letterSpacing' in g) g.letterSpacing = `${h * 0.04}px`;
    g.fillText((H_ ? H_.name.replace('LUMIERE ', '') : id) + '  ·  NOW SHOWING', h * 1.1, h * 0.54); if ('letterSpacing' in g) g.letterSpacing = '0px'; },
  // an illuminated exit sign (ISO 7010 E002 look: a white running figure through a door on safety green, then EXIT)
  exitsign: (g, w, h) => { g.fillStyle = '#0a7a3d'; g.fillRect(0, 0, w, h); g.fillStyle = '#f4fff8'; g.strokeStyle = '#f4fff8'; g.lineCap = 'round'; g.lineJoin = 'round';
    const s = h * 0.8, x0 = h * 0.12, y0 = h * 0.1, P = (px, py) => [x0 + px * s, y0 + py * s];
    g.lineWidth = s * 0.07; g.strokeRect(x0 + s * 0.6, y0 + s * 0.04, s * 0.38, s * 0.92);
    g.lineWidth = s * 0.13; g.beginPath(); g.arc(...P(0.47, 0.13), s * 0.095, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(...P(0.42, 0.3)); g.lineTo(...P(0.33, 0.58)); g.stroke();
    g.beginPath(); g.moveTo(...P(0.16, 0.42)); g.lineTo(...P(0.33, 0.33)); g.lineTo(...P(0.56, 0.44)); g.stroke();
    g.beginPath(); g.moveTo(...P(0.1, 0.88)); g.lineTo(...P(0.23, 0.71)); g.lineTo(...P(0.33, 0.58)); g.lineTo(...P(0.52, 0.72)); g.lineTo(...P(0.5, 0.95)); g.stroke();
    g.font = `700 ${h * 0.5}px ${SANS}`; g.textAlign = 'center'; g.textBaseline = 'middle'; if ('letterSpacing' in g) g.letterSpacing = `${h * 0.04}px`;
    const xa = x0 + s * 1.1; g.fillText('EXIT', xa + (w - xa) / 2, h * 0.54); if ('letterSpacing' in g) g.letterSpacing = '0px'; },
  // v9.1 wayfinding: ink ground, gold rule, white caps, an arrow; RESTROOMS gets the two figures
  wayfind: (g, w, h, id) => { const k = id.split('_')[1]; if (k === 'zone') { zoneSign(g, w, h); return; } const T = { screens: ['SCREENS 1 – 4', '↑', 'MAX  ·  CURVE  ·  CLASSIC  ·  X·270'], wc: ['RESTROOMS', '', ''], tickets: ['TICKETS', '', 'BOX OFFICE'], food: ['FOOD & DRINKS', '', 'POPCORN  ·  NACHOS  ·  COFFEE'], out: ['WAY OUT', '↓', 'LOBBY  ·  RESTROOMS  ·  CAFÉ'] }[k] || [k.toUpperCase(), '', ''];
    g.fillStyle = '#121427'; g.fillRect(0, 0, w, h); g.fillStyle = '#e3b25f'; g.fillRect(0, h * 0.92, w, h * 0.08); g.fillStyle = '#f4efe6'; g.textBaseline = 'middle';
    let x = h * 0.35; if (k === 'wc') { const fig = (cx, dress) => { g.beginPath(); g.arc(cx, h * 0.24, h * 0.09, 0, Math.PI * 2); g.fill(); if (dress) { g.beginPath(); g.moveTo(cx - h * 0.15, h * 0.72); g.lineTo(cx + h * 0.15, h * 0.72); g.lineTo(cx, h * 0.36); g.fill(); g.fillRect(cx - h * 0.06, h * 0.7, h * 0.04, h * 0.14); g.fillRect(cx + h * 0.02, h * 0.7, h * 0.04, h * 0.14); } else { g.fillRect(cx - h * 0.09, h * 0.36, h * 0.18, h * 0.3); g.fillRect(cx - h * 0.09, h * 0.62, h * 0.07, h * 0.24); g.fillRect(cx + h * 0.02, h * 0.62, h * 0.07, h * 0.24); } };
      fig(x + h * 0.1, false); fig(x + h * 0.55, true); g.fillRect(x + h * 0.32, h * 0.2, h * 0.02, h * 0.62); x += h * 0.95; }
    g.textAlign = 'left'; g.font = `600 ${h * (T[2] ? 0.36 : 0.46)}px ${SANS}`; if ('letterSpacing' in g) g.letterSpacing = `${h * 0.06}px`; g.fillText(T[0], x, h * (T[2] ? 0.36 : 0.48));
    if (T[2]) { g.font = `400 ${h * 0.17}px ${SANS}`; g.fillStyle = 'rgba(244,239,230,.75)'; g.fillText(T[2], x, h * 0.72); } if ('letterSpacing' in g) g.letterSpacing = '0px';
    if (T[1]) { g.fillStyle = '#e3b25f'; g.font = `700 ${h * 0.62}px ${SANS}`; g.textAlign = 'right'; g.fillText(T[1], w - h * 0.35, h * 0.5); } },
  noentry: (g, w, h) => { g.fillStyle = '#5c1018'; g.fillRect(0, 0, w, h); g.fillStyle = '#f7ece6'; g.font = `600 ${h * 0.4}px ${SANS}`; g.textAlign = 'center'; g.textBaseline = 'middle'; if ('letterSpacing' in g) g.letterSpacing = `${h * 0.06}px`; g.fillText('EXIT ONLY  ·  NO ENTRY', w / 2, h * 0.53); if ('letterSpacing' in g) g.letterSpacing = '0px'; },
  // a lit poster case: the house film's one-sheet (www/films, CC BY), drawn when its image arrives
  poster: (g, w, h, id) => { g.fillStyle = '#0b0b0d'; g.fillRect(0, 0, w, h); const im = new Image(); im.onload = () => { const s_ = Math.max(w / im.width, h / im.height), iw = im.width * s_, ih = im.height * s_; g.drawImage(im, (w - iw) / 2, (h - ih) / 2, iw, ih); if (g.canvas.__tex) g.canvas.__tex.needsUpdate = true; }; im.src = posterURL(id.split('_')[1]); },   // poster_<film>[_<n>]: several cases may show one film
  exitwall: (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#0f3a28'); gr.addColorStop(1, '#14523a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#eafff3'; g.font = `600 ${h * 0.22}px ${SANS}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('THANK YOU FOR WATCHING', w / 2, h * 0.38); g.font = `400 ${h * 0.12}px ${SANS}`; g.fillText('EXIT  ·  LOBBY  ·  RESTROOMS  →', w / 2, h * 0.68); },
  // v10 restroom pictograms (docs/V10-RESEARCH.md source 10: figures two metres tall beside the entrance, known from across the room):
  // a white figure on a blue or rose field, the word under it, an arrow to the door
  picto: (g, w, h, id) => { const f = id.endsWith('_f'), gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, f ? '#c0466a' : '#2f67c4'); gr.addColorStop(1, f ? '#8e2747' : '#1b4592');
    g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(w * 0.06, w * 0.06, w * 0.88, h - w * 0.12);
    g.fillStyle = '#f7f3ec'; const cx = w / 2, s_ = w * 0.34, y0 = h * 0.1 + s_ * 0.98; g.beginPath(); g.arc(cx, h * 0.1 + s_ * 0.42, s_ * 0.36, 0, Math.PI * 2); g.fill();
    if (f) { g.beginPath(); g.moveTo(cx - s_ * 0.42, y0 + s_ * 0.08); g.lineTo(cx + s_ * 0.42, y0 + s_ * 0.08); g.lineTo(cx + s_ * 0.98, y0 + s_ * 2.05); g.lineTo(cx - s_ * 0.98, y0 + s_ * 2.05); g.closePath(); g.fill();
      for (const sx of [-1, 1]) { g.fillRect(cx + sx * s_ * 0.3 - s_ * 0.13, y0 + s_ * 2.0, s_ * 0.26, s_ * 1.2); g.fillRect(cx + sx * s_ * 0.62 - s_ * 0.1, y0 + s_ * 0.15, s_ * 0.2, s_ * 1.05); } }
    else { g.fillRect(cx - s_ * 0.6, y0 + s_ * 0.08, s_ * 1.2, s_ * 1.5);
      for (const sx of [-1, 1]) { g.fillRect(cx + sx * s_ * 0.31 - s_ * 0.27, y0 + s_ * 1.52, s_ * 0.54, s_ * 1.72); g.fillRect(cx + sx * s_ * 0.86 - s_ * 0.11, y0 + s_ * 0.1, s_ * 0.22, s_ * 1.3); } }
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `600 ${w * 0.1}px ${SANS}`; if ('letterSpacing' in g) g.letterSpacing = `${w * 0.012}px`; g.fillText(f ? 'LADIES' : 'GENTLEMEN', cx, h * 0.83); if ('letterSpacing' in g) g.letterSpacing = '0px';
    g.font = `700 ${w * 0.17}px ${SANS}`; g.fillText(f ? '←' : '→', cx, h * 0.92); },
  // v10 the east wall's upper band (research sources 3 and 7: a skyline relief across the upper wall; Art Deco gold on deep colour): a city at
  // night in gold line, searchlights, a film strip through the sky. mural_<n>: three panels of one picture
  mural: (g, w, h, id) => { const n = +id.split('_')[1] || 0, W = w * 3, r = rng(7); g.save(); g.translate(-n * w, 0);
    const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#060a1f'); sky.addColorStop(0.62, '#151b46'); sky.addColorStop(1, '#2c1e4c'); g.fillStyle = sky; g.fillRect(0, 0, W, h);
    for (let i = 0; i < 520; i++) { const x = r() * W, y = r() * h * 0.62, k = r(); g.fillStyle = k < 0.7 ? 'rgba(255,236,190,.85)' : 'rgba(220,230,255,.8)'; g.fillRect(x, y, k > 0.93 ? 2 : 1, k > 0.93 ? 2 : 1); }
    for (const fx of [0.1, 0.31, 0.55, 0.78, 0.93]) { const x0 = W * fx, a = (r() - 0.5) * 0.7, xt = x0 + Math.sin(a) * h * 1.4; g.fillStyle = 'rgba(255,214,140,0.09)'; g.beginPath(); g.moveTo(x0 - 3, h * 0.8); g.lineTo(xt - h * 0.13, -4); g.lineTo(xt + h * 0.13, -4); g.lineTo(x0 + 3, h * 0.8); g.fill(); }
    const strip = (cy, amp) => { const bh = h * 0.15; for (let x = 0; x < W; x += 4) { const y = cy + Math.sin(x / W * Math.PI * 5) * amp; g.fillStyle = '#0c0c10'; g.fillRect(x, y - bh / 2, 4.5, bh); g.fillStyle = '#d9b46a'; g.fillRect(x, y - bh / 2, 4.5, 1.2); g.fillRect(x, y + bh / 2 - 1.2, 4.5, 1.2);
        if (x % 16 < 4) { g.fillStyle = 'rgba(240,232,214,.85)'; g.fillRect(x, y - bh * 0.42, 3, bh * 0.12); g.fillRect(x, y + bh * 0.3, 3, bh * 0.12); }
        if (x % 64 < 56) { const t = (Math.floor(x / 64) * 37) % 100 / 100; g.fillStyle = `rgba(${150 + t * 90},${120 + t * 60},${170 - t * 80},.55)`; g.fillRect(x, y - bh * 0.24, 4.5, bh * 0.48); } } };
    strip(h * 0.3, h * 0.07);
    const tower = (x, bw, bh, fill, edge, lit) => { let y = h - bh, l = x, ww = bw; const st = 1 + Math.floor(r() * 3), tier = bh * 0.06; g.fillStyle = fill; g.strokeStyle = edge; g.lineWidth = Math.max(1, h * 0.005);
      g.fillRect(x, y, bw, bh); g.strokeRect(x + 0.5, y + 0.5, bw - 1, bh);
      for (let k = 0; k < st; k++) { const d = ww * 0.16; l += d; ww -= 2 * d; y -= tier; g.fillRect(l, y, ww, tier + 1); g.strokeRect(l + 0.5, y + 0.5, ww - 1, tier); }
      if (r() < 0.45) { g.beginPath(); g.moveTo(l + ww * 0.4, y); g.lineTo(l + ww / 2, y - bh * 0.2); g.lineTo(l + ww * 0.6, y); g.closePath(); g.fill(); g.stroke(); }
      if (lit) for (let yy = h - bh + 5; yy < h - 4; yy += 6) for (let xx = x + 3; xx < x + bw - 4; xx += 5) if (r() < 0.38) { g.fillStyle = r() < 0.8 ? '#f2c46a' : '#fff1c9'; g.fillRect(xx, yy, 2, 3); } };
    for (const [hmin, hmax, fill, edge, lit] of [[0.3, 0.55, '#1b1f45', 'rgba(217,180,106,.35)', false], [0.2, 0.42, '#121433', 'rgba(217,180,106,.6)', false], [0.1, 0.3, '#08091a', '#d9b46a', true]]) { let x = -10; while (x < W) { const bw = h * (0.1 + r() * 0.18); tower(x, bw, h * (hmin + r() * (hmax - hmin)), fill, edge, lit); x += bw + h * r() * 0.05; } }
    g.fillStyle = '#c9a35e'; g.fillRect(0, 0, W, Math.max(2, h * 0.012)); g.fillRect(0, h - Math.max(2, h * 0.012), W, Math.max(2, h * 0.012)); g.restore(); },
  // v10 art: original pictures drawn here (no outside images): a Deco sunburst, colour fields, a gold fan, the projector's beam, a city at dusk
  art: (g, w, h, id) => { const n = +id.split('_')[1], r = rng(n * 13 + 1);
    if (n === 1) { g.fillStyle = '#0f3b3c'; g.fillRect(0, 0, w, h); const cx = w / 2, cy = h * 0.72;
      for (let i = 0; i < 18; i++) { const a0 = Math.PI + Math.PI * i / 18; g.fillStyle = i % 2 ? '#d9b46a' : '#efe0b3'; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, h, a0, a0 + Math.PI / 36); g.closePath(); g.fill(); }
      g.fillStyle = '#0f3b3c'; g.beginPath(); g.arc(cx, cy, w * 0.27, Math.PI, 0); g.fill(); g.fillStyle = '#d9b46a'; g.beginPath(); g.arc(cx, cy, w * 0.2, Math.PI, 0); g.fill(); g.fillRect(0, cy, w, h - cy);
      g.fillStyle = '#0f3b3c'; for (let k = 0; k < 4; k++) g.fillRect(0, cy + (h - cy) * (0.16 + 0.21 * k), w, (h - cy) * 0.08); }
    else if (n === 2) { g.fillStyle = '#d8c7a8'; g.fillRect(0, 0, w, h); const cols = ['#7a1e2c', '#c9852c', '#1d2340'];
      for (let k = 0; k < 3; k++) { g.fillStyle = cols[k]; g.filter = `blur(${Math.max(1, w * 0.012)}px)`; g.fillRect(w * 0.09, h * (0.07 + k * 0.3), w * 0.82, h * 0.25); } g.filter = 'none'; }
    else if (n === 3) { g.fillStyle = '#121214'; g.fillRect(0, 0, w, h); const cx = w / 2, cy = h * 0.92;
      for (let k = 10; k >= 1; k--) { g.fillStyle = k % 2 ? '#c9a35e' : '#121214'; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, w * 0.088 * k, Math.PI * 1.04, Math.PI * 1.96); g.closePath(); g.fill(); }
      g.strokeStyle = '#efe0b3'; g.lineWidth = Math.max(1, w * 0.006); for (let i = 0; i <= 12; i++) { const a = Math.PI * (1.04 + 0.92 * i / 12); g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * w * 0.88, cy + Math.sin(a) * w * 0.88); g.stroke(); } }
    else if (n === 4) { const bg = g.createLinearGradient(0, 0, w, 0); bg.addColorStop(0, '#05060c'); bg.addColorStop(1, '#151b36'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
      const sx = w * 0.86; g.fillStyle = '#e9e4d6'; g.fillRect(sx, h * 0.2, w * 0.05, h * 0.6);
      const beam = g.createLinearGradient(w * 0.07, 0, sx, 0); beam.addColorStop(0, 'rgba(255,240,200,.8)'); beam.addColorStop(1, 'rgba(255,240,200,.1)'); g.fillStyle = beam; g.beginPath(); g.moveTo(w * 0.07, h * 0.47); g.lineTo(sx, h * 0.2); g.lineTo(sx, h * 0.8); g.lineTo(w * 0.07, h * 0.53); g.fill();
      for (let i = 0; i < 220; i++) { const t = r(), x = w * 0.07 + t * (sx - w * 0.07), y = h * 0.5 + (r() - 0.5) * 2 * (h * 0.03 + t * h * 0.3); g.fillStyle = `rgba(255,245,215,${0.25 + r() * 0.55})`; g.fillRect(x, y, 1.5, 1.5); }
      g.fillStyle = '#2a2a30'; g.fillRect(w * 0.01, h * 0.41, w * 0.07, h * 0.18); g.fillStyle = '#c9a35e'; g.beginPath(); g.arc(w * 0.03, h * 0.38, h * 0.06, 0, Math.PI * 2); g.arc(w * 0.07, h * 0.38, h * 0.06, 0, Math.PI * 2); g.fill(); }
    else { const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#1b1f4a'); sky.addColorStop(0.62, '#b8513a'); sky.addColorStop(1, '#e3b25f'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
      g.fillStyle = '#f2ebdd'; g.beginPath(); g.arc(w * 0.8, h * 0.22, h * 0.08, 0, Math.PI * 2); g.fill();
      let x = 0; while (x < w) { const bw = w * (0.05 + r() * 0.08), bh = h * (0.18 + r() * 0.42); g.fillStyle = '#120f1c'; g.fillRect(x, h - bh, bw + 1, bh); for (let yy = h - bh + 6; yy < h - 6; yy += 7) for (let xx = x + 3; xx < x + bw - 3; xx += 6) if (r() < 0.3) { g.fillStyle = '#f2c46a'; g.fillRect(xx, yy, 2, 3); } x += bw; } } },
  // v10 the cafe's menu board and its name over it (rooms.py places them on the walnut wall)
  cafemenu: (g, w, h) => { g.fillStyle = '#16110d'; g.fillRect(0, 0, w, h); g.strokeStyle = '#c9a35e'; g.lineWidth = Math.max(2, h * 0.012); g.strokeRect(h * 0.05, h * 0.05, w - h * 0.1, h - h * 0.1);
    const cols = [['COFFEE', [['Espresso', 160], ['Americano', 190], ['Cappuccino', 210], ['Café latte', 220], ['Mocha', 240]]], ['TEA & MORE', [['Masala chai', 150], ['Iced tea', 180], ['Hot chocolate', 220], ['Cold coffee', 230]]], ['SWEETS', [['Cheesecake', 260], ['Brownie', 180], ['Croissant', 160], ['Blueberry muffin', 170]]]];
    g.textBaseline = 'middle'; cols.forEach(([head, items], c) => { const x0 = w * (0.05 + c * 0.315), x1 = x0 + w * 0.27; g.fillStyle = '#e3b25f'; g.font = `600 ${h * 0.12}px ${SANS}`; g.textAlign = 'left'; g.fillText(head, x0, h * 0.2);
      g.font = `400 ${h * 0.09}px ${SANS}`; items.forEach(([nm, pr], i) => { const y = h * (0.37 + i * 0.13); g.fillStyle = '#f2ebdd'; g.textAlign = 'left'; g.fillText(nm, x0, y); g.textAlign = 'right'; g.fillStyle = '#e3b25f'; g.fillText('₹' + pr, x1, y); }); }); },
  cafesign: (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#1d140d'); gr.addColorStop(1, '#0d0906'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#e8c27a'; g.font = `500 ${h * 0.52}px ${SERIF}`; g.textAlign = 'center'; g.textBaseline = 'middle'; if ('letterSpacing' in g) g.letterSpacing = `${h * 0.12}px`; g.fillText('CAFÉ LUMIÈRE', w / 2, h * 0.5); if ('letterSpacing' in g) g.letterSpacing = '0px'; g.fillRect(w * 0.28, h * 0.86, w * 0.44, Math.max(2, h * 0.025)); },
  marquee: (g, w, h) => { g.fillStyle = '#0a0a0d'; g.fillRect(0, 0, w, h); g.fillStyle = '#f2ebdd'; g.font = `500 ${h * 0.56}px ${SERIF}`; g.textAlign = 'center'; g.textBaseline = 'middle'; if ('letterSpacing' in g) g.letterSpacing = `${h * 0.3}px`; g.fillText('LUMIÈRE', w / 2, h * 0.54); if ('letterSpacing' in g) g.letterSpacing = '0px'; },
  arrival: (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#120d24'); gr.addColorStop(1, '#2a1640'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#e3b25f'; g.font = `600 ${h * 0.14}px ${SANS}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('SCREENS 1 – 4', w / 2, h * 0.42); g.fillStyle = 'rgba(242,235,221,.8)'; g.font = `400 ${h * 0.07}px ${SANS}`; g.fillText('MAX  ·  CURVE  ←      CLASSIC  ·  270  →', w / 2, h * 0.62); },
};
// ---------------------------------------------------------------- props: the furniture of each room (Kiln / Blender assets), lit per vertex
const RAD = Math.PI / 180, FACADE_Z = LOBBY.z1, DRESS = (() => {
  const L = [], add = (room, name, x, y, z, yaw = 0, o = {}) => L.push({ room, name, x, y, z, yaw, o });
  // the lounge: four curved sofas round the table, each one's concave seat side facing it (sofa_curve sits facing local +z, its arc's centre
  // 2.0 m in front of its origin); yaw -r - 90 deg turns +z towards the table (v9 had them radial, at -r + 180 deg)
  // v9.3 (the user's lounge photos): sapphire velvet, white boucle chairs at the rug's edge, palms between them
  const SAPPHIRE = { velvet_ivory: [MAT.velvet, [0.012, 0.03, 0.17]] }, BOUCLE = { velvet_mustard: [MAT.velvet, [0.72, 0.69, 0.63]] }, EMERALD = { velvet_mustard: [MAT.velvet, [0.012, 0.07, 0.04]] };
  // v11 (the user: "don't leave things in the middle"): the set stood in the main walk between the doors and the escalators; it is now in
  // the front-east corner by the windows (rooms.py LCX, LCZ: its rug), where the two small chair groups were. Pieces are kept apart:
  // sofas on a 2.4 m circle, chairs on 3.4 m at the diagonals (tools/dev/props-overlap.mjs checks every room's furniture)
  const LX = 15.3, LZ = 11.0;
  for (const a of [0, 90, 180, 270]) { const r = a * RAD; add('lobby', 'sofa_curve', LX + 2.4 * Math.cos(r), 0, LZ + 2.4 * Math.sin(r), -r - Math.PI / 2, { swap: SAPPHIRE }); }   // square to the axes: their collision boxes stay tight
  for (const a of [45, 135, 225, 315]) { const r = a * RAD; add('lobby', 'armchair_deco', LX + 3.4 * Math.cos(r), 0, LZ + 3.4 * Math.sin(r), Math.round((-r - Math.PI / 2) / (Math.PI / 2)) * Math.PI / 2, { swap: BOUCLE }); }
  add('lobby', 'table_lounge', LX, 0, LZ); for (const [x, z] of [[-8, 16.4], [8, 16.4], [-20.9, 16.2], [20.9, 16.2], [-20.9, -12.9], [20.9, 9.5], [-6.5, -12.9], [6.5, -12.9]]) add('lobby', 'planter_tall', x, 0, z);
  for (const [x, yaw] of [[-6.0, 0.35], [6.0, -0.35]]) add('lobby', 'poster_totem', x, 0, 16.3, yaw);   // v10: out of the fountain court; v11 its posters: TOTEM_POSTERS
  // the box-office queue: two rope lines guiding you to the counter
  const posts = []; for (const x of [-14.4, -13.0]) for (let z = 5.6; z <= 12.6; z += 1.75) { add('lobby', 'stanchion', x, 0, z); posts.push([x, z]); }
  for (const x of [-14.4, -13.0]) for (let z = 5.6; z < 12.5; z += 1.75) add('lobby', 'rope_velvet', x, 0, z + 0.875, Math.PI / 2, { collide: 0.02 });
  for (const [z, yaw] of [[-7.6, Math.PI / 2], [-6.5, Math.PI / 2], [-3.0, Math.PI / 2], [-1.7, Math.PI / 2]]) add('lobby', z > -5 ? 'drinks_fountain' : 'popcorn_machine', -21.62, 0.92, z, yaw, { collide: false, ground: false });
  add('lobby', 'candy_wall', -21.7, 0, 0.0, Math.PI / 2);
  for (const [x, z] of [[-16.2, -9.6], [6.0, 2.4], [-2.4, -12.6], [19.8, -2.6], [-14.8, 2.6]]) add('lobby', 'bin_brass', x, 0, z);
  add('lobby', 'bench_velvet', 21.25, 0, 5.0, Math.PI / 2); add('lobby', 'bench_velvet', 21.25, 0, -6.5, Math.PI / 2);
  // v9.1 (the user: "eliminate empty spaces ... waiting areas, furniture, plants"): waiting areas by the facade, two east of the doors and one
  // west: deco tub chairs in pairs across a marble side table, a torchere beside them; the ribbon chandelier in the ceiling rings over the
  // lounge; the brand in lit gold letters over the box office and the concessions; planters by the poster wall's benches
  for (const [cx, cz, sw] of [[-11.6, 15.2, EMERALD]]) { add('lobby', 'armchair_deco', cx - 0.85, 0, cz, Math.PI / 2, sw ? { swap: sw } : {}); add('lobby', 'armchair_deco', cx + 0.85, 0, cz, -Math.PI / 2, sw ? { swap: sw } : {}); add('lobby', 'side_table', cx, 0, cz); add('lobby', 'torchere_deco', cx, 0, cz + 1.3, 0, { collide: 0.2 }); }
  add('lobby', 'chandelier_cascade', 0, 8.55, (GATE.z + 14.2) / 2, 0, { collide: false, ground: false });   // v11: at the centre of the ceiling rings, over the fountain (rooms.py RCX, RCZ)
  // v10 (the user: "the lobby is too big and empty: fill it with lighting, paintings, pillars, sofas, a fountain"; docs/V10-RESEARCH.md):
  // a fountain on the brand ring on the entrance axis (walkers part round it: building.js foyerW/E; v11: the four columns round the court
  // are the building's own, full height, tools/blender/arch/rooms.py grand_column), a
  // pendant cloud over the east waiting areas, rugs under the seating groups, a popcorn cart by the box office, film standees facing the
  // doors (their boards are FRAMED panels), a seating corner by the restrooms under its own small cloud
  add('lobby', 'fountain_tier', 0, 0, 10.0, 0, { round: 1.68, grp: 2 });   // grp 2: its lit water shimmers (materials.js GLOW_VERT)
  add('lobby', 'pendant_cloud', LX, LOBBY.ceil - 0.002, LZ, 0, { collide: false, ground: false, detail: 1 });   // over the lounge
  for (const [cx, cz] of [[-11.6, 15.2]]) add('lobby', 'rug_runner', cx, 0, cz + 0.35, Math.PI / 2, { collide: false });
  add('lobby', 'popcorn_cart', -12.6, 0, 2.6, Math.PI / 2 + 0.35);
  // the box office queue and the concessions approach each get a patterned runner (the user: "make the reception and the buy area much defined")
  add('lobby', 'rug_runner', -13.7, 0, 9.1, 0, { collide: false, scale: [0.5, 1, 1.75] }); add('lobby', 'rug_runner', -14.75, 0, -4.0, Math.PI / 2, { collide: false, scale: [0.62, 1, 0.92] });
  for (const [x, yaw] of [[-6.6, 0.885], [6.6, -0.885]]) add('lobby', 'standee_base', x, 0, 12.6, yaw, { collide: 0.02 });
  add('lobby', 'rug_round', 19.4, 0, -10.8, 0, { collide: false }); add('lobby', 'side_table', 19.4, 0, -10.8);
  add('lobby', 'armchair_deco', 18.4, 0, -10.8, Math.PI / 2, { swap: SAPPHIRE.velvet_ivory ? { velvet_mustard: SAPPHIRE.velvet_ivory } : null }); add('lobby', 'armchair_deco', 20.4, 0, -10.8, -Math.PI / 2, { swap: SAPPHIRE.velvet_ivory ? { velvet_mustard: SAPPHIRE.velvet_ivory } : null });
  add('lobby', 'pendant_cloud', 19.4, L1 - 0.322, -10.8, 0.6, { collide: false, ground: false, scale: 0.5, detail: 1 });
  // v10 cafe (the user: "the cafe and the latte much more defined"): the front counter with bar stools, the espresso machine on the back
  // counter facing you, a lit cake case, the card reader, five bistro tables under a small pendant cloud (rooms.py builds the walnut wall,
  // the back counter, the shelves and the menu)
  add('lobby', 'cafe_counter', -19.6, 0, -11.5, Math.PI / 2, { scale: [1.12, 1, 1] });   // 3.9 m: no gap at either end to slip behind it
  add('lobby', 'espresso_machine', -21.25, 0.96, -12.3, Math.PI / 2, { collide: false, ground: false });
  add('lobby', 'cake_case', -19.6, 1.04, -12.55, Math.PI / 2, { collide: false, ground: false });
  add('lobby', 'pos_terminal', -19.62, 1.04, -10.4, -Math.PI / 2, { collide: false, ground: false });
  for (const z of [-12.6, -11.7, -10.8, -9.9]) add('lobby', 'bar_stool', -18.72, 0, z, -Math.PI / 2);
  for (const [tx, tz] of [[-15.4, -12.5], [-12.8, -12.5], [-10.2, -12.5], [-14.1, -10.3], [-11.5, -10.3]]) { add('lobby', 'bistro_table', tx, 0, tz); add('lobby', 'bistro_chair', tx - 0.62, 0, tz, Math.PI / 2); add('lobby', 'bistro_chair', tx + 0.62, 0, tz, -Math.PI / 2); }
  add('lobby', 'pendant_cloud', -12.8, L1 - 0.322, -11.4, 0, { collide: false, ground: false, scale: 0.55, detail: 1 });
  for (const x of [-4.6, 4.6]) add('lobby', 'bench_velvet', x, 0, -13.28);
  // v11 the alcove under the lift's gallery: a bench against the tower's back, a palm at each end
  // v11: the alcove is 3.3 m wide between the escalators' box and the hall's east wall: the 2.06 m bench 17 cm off the wall, one palm at the
  // other end (two did not fit without touching it)
  add('lobby', 'bench_velvet', 14.6, 0, LIFT.z0 - 0.4, Math.PI); add('lobby', 'planter_tall', 12.95, 0, LIFT.z0 - 0.45);
  // the first-floor landing between the gallery and the corridor: two benches and palms along the back wall
  for (const x of [16.6, 19.2]) add('lobby', 'bench_velvet', x, L1, -13.28); for (const x of [15.1, 20.7]) add('lobby', 'planter_tall', x, L1, -13.2);   // velvet benches under the pictures either side of the exit
  add('lobby', 'letters_lumiere_lit', -21.58, 5.25, 4.0, Math.PI / 2, { collide: false, ground: false });
  add('street', 'letters_lumiere_lit', 0, 10.75, FACADE_Z + 0.5, 0, { collide: false, ground: false, scale: 1.6 });   // the brand over the canopy, 2 cm in front of the gold fins (v10)
  // v10 (the user: "improve the overall look from outside"): a premiere carpet from the kerb to the doors, two light columns flanking them
  add('street', 'rug_runner', 0, 0, FACADE_Z + 4.0, 0, { collide: false, scale: [0.62, 1, 1.8], swap: { carpet_deco: [MAT.velvet, [0.34, 0.015, 0.025]] } });
  // v12 (the user: decorations must not block the entrance and the exit; the inside full of them instead): the palms that stood either side
  // of the doors outside now stand either side of them inside
  for (const x of [-3.5, 3.5]) add('lobby', 'planter_tall', x, 0, FACADE_Z - 1.15);
  for (const x of [-40, -33, 33, 40]) add('street', 'planter_tree', x, 0, 21.4);
  for (const z of [7.9, 2.1, -4.1, -8.9]) add('lobby', 'planter_tall', 21.1, 0, z);
  // v11 (the user: "a pole is blocking the view"): none in front of the canopy. v12: each lamp's arm reaches over the kerb (it lay along the
  // pavement); the light and its halo are at the head (tools/blender/arch/rooms.py); a clipped hedge stands in every bronze trough
  for (let x = -40; x <= 40; x += 10) if (Math.abs(x) > 12) add('street', 'lamp_post', x, 0, 25.55, 0, { collide: 0.05 });
  for (let x = -44; x < 42; x += 8) if (Math.abs(x) >= 12) add('street', 'hedge_block', x, 0, 24.9, 0, { collide: false, ground: false });
  for (const x of [-14, -11.2, -8.4, -5.6, 14]) add('street', 'bollard_light', x, 0, 25.6);   // v12: none by the crossing, none along the taxi bay (x 6 to 13)
  add('street', 'planter_hedge', -15, 0, 21.2); add('street', 'planter_hedge', 15, 0, 21.2); add('street', 'planter_tree', -26, 0, 22); add('street', 'planter_tree', 26, 0, 22);
  for (const z of [-16.2, -40, -60]) { add('spine', 'bin_brass', -3.75, 0, z); add('spine', 'planter_tall', 3.75, 0, z); }
  // v9.3 hall entrances (the user's ScreenX entrance photo; tools/blender/arch/rooms.py builds the portals): the hall's name in face-lit
  // letters over each portal, its number beside it, a bin; red armchairs along the bridge
  const WORD = { MAX: 'letters_max', CURVE: 'letters_curve', CLASSIC: 'letters_classic', X270: 'letters_x270' };
  for (const d of DOORS.filter((q) => q.hall && q.id.endsWith('In'))) {
    const h = HALL[d.hall], side = -h.dir, xf = d.x + side * 0.5; let xfront = xf + side * 0.8, zc = d.z, zn = zc + 2.15;
    if (d.hall === 'X270') { xfront = FLANK_E.x0 + 0.3; zc = (LINK_E.z0 + LINK_E.z1) / 2; zn = zc + 2.9; }
    add('corridor', WORD[d.hall], xfront + side * 0.03, L1 + 3.2, zc, side * Math.PI / 2, { collide: false, ground: false, scale: 0.36 });   // just proud of the diamond panels (2.5 cm deep)
    add('corridor', 'num_' + h.no, xfront + side * 0.03, L1 + 1.2, zn, side * Math.PI / 2, { collide: false, ground: false, scale: 0.9 });
    // v11 (the user: "that red line thing barrier"): the ropes along the portals' faces hung between nothing; gone
    add('corridor', 'bin_brass', xf + side * 0.35, L1, zc - 3.4);
  }
  // v11 the corridor's ribbon walls (tools/blender/arch/rooms.py: the walnut lining swells and falls back every 9 m from each wall's
  // start): benches, armchairs and palms stand in the troughs, the poster lightboxes hang on the crests; film standees flank the arrival
  // video wall opposite the mezzanine portal (their boards are FRAMED panels)
  for (const z of [-32, -41, -50]) { add('corridor', 'bench_velvet', BRIDGE.x0 + 0.68, L1, z, Math.PI / 2); add('corridor', 'planter_tall', BRIDGE.x0 + 0.9, L1, z - 1.6); }
  for (const z of [-32, -41]) { add('corridor', 'bench_velvet', BRIDGE.x1 - 0.68, L1, z, -Math.PI / 2); add('corridor', 'planter_tall', BRIDGE.x1 - 0.9, L1, z - 1.6); }
  for (const k of [1, 6, 8]) for (const o of [-0.5, 0.5]) add('corridor', 'armchair_deco', BRIDGE.x1 - 9 * k + o, L1, BRIDGE.z1 - 0.8, Math.PI, { swap: { velvet_mustard: [MAT.velvet, [0.5, 0.018, 0.03]] } });
  for (const k of [2, 4, 5, 7]) add('corridor', 'planter_tall', BRIDGE.x1 - 9 * k, L1, BRIDGE.z1 - 0.68);
  for (const x of [FLANK_W.x1 + 18, PANTRY.x1 + 18]) add('corridor', 'planter_tall', x, L1, BRIDGE.z0 + 0.68);
  for (const x of [6.0, 14.5]) add('corridor', 'standee_base', x, L1, BRIDGE.z0 + 0.8, 0, { collide: 0.02 });
  // a bin inside every hall, at the top of the rear aisle beside the entrance (you leave with your empty cup)
  for (const h of Object.values(HALL)) { const w = h.toWorld(h.entryU - Math.sign(h.entryU) * 1.4, h.depthIn - 0.5); add(h.key, 'bin_brass', w.x, h.y0 + h.total, w.z); }
  return L;
})();
function dressRooms(world) {
  const byRoom = {}; for (const p of DRESS) (byRoom[p.room] || (byRoom[p.room] = [])).push(p);
  // v9.1: the restrooms' fittings at their interaction points (tools/blender/arch/rooms.py fixtures; they were points with no mesh):
  // a vessel basin and a brass tap at each basin, a urinal at each urinal
  for (const u of world.uses) { const L = byRoom[u.room] || (byRoom[u.room] = []);
    if (u.kind === 'basin') { L.push({ room: u.room, name: 'basin_vessel', x: u.x + 0.02, y: u.y, z: u.z, yaw: 0, o: { collide: false, ground: false } }); L.push({ room: u.room, name: 'tap_brass', x: u.x - 0.2, y: u.y, z: u.z, yaw: Math.PI / 2, o: { collide: false, ground: false } }); }
    if (u.kind === 'urinal') L.push({ room: u.room, name: 'urinal', x: u.x, y: 0, z: u.z - 0.245, yaw: 0, o: { collide: 0.05, ground: false } }); }
  for (const key in byRoom) {
    const room = world.rooms[key]; if (!room) continue; const host = { pacc: new Acc(), gacc: new Acc(), bins: [], col: (x0, z0, x1, z1, y0, y1) => { for (const [ax, az, bx, bz] of [[x0, z0, x1, z0], [x1, z0, x1, z1], [x1, z1, x0, z1], [x0, z1, x0, z0]]) world.walls.add(ax, az, bx, bz, y0, y1); },
      ring: (cx, cz, r, y0, y1, n = 16) => { const R = r / Math.cos(Math.PI / n); for (let k = 0; k < n; k++) { const a0 = 2 * Math.PI * k / n, a1 = 2 * Math.PI * (k + 1) / n; world.walls.add(cx + R * Math.cos(a0), cz + R * Math.sin(a0), cx + R * Math.cos(a1), cz + R * Math.sin(a1), y0, y1); } } };
    const framed = FRAMED.filter((f) => f.room === key); for (const f of framed) framePanel(host.pacc, f);
    const det = world.engine && world.engine.preset ? world.engine.preset.detail ?? 1 : 1;   // v10: the low preset skips purely decorative extras (o.detail 1)
    const cen = (world.census || (world.census = {}))[key] = {};   // what each room's furniture costs (triangles per asset): the optimiser's map
    for (const p of byRoom[key]) { const A = ASSETS[p.name]; if (!A || (p.o.detail || 0) > det) continue; const lift = p.o.ground === false ? 0 : -A.box.min.y; placeAsset(host, p.name, p.x, p.y + lift, p.z, p.yaw, p.o);
      const e = cen[p.name] || (cen[p.name] = { n: 0, tris: 0 }), ld = p.o.lod ?? 0; e.n++; for (const q of A.parts) if (q.lod === ld && (!p.o.only || q.name.startsWith(p.o.only))) e.tris += (q.geo.index ? q.geo.index.count : q.geo.attributes.position.count) / 3; }
    if (host.pacc.count) { const g = toGeometry(host.pacc); room.lights.bake(g); const m = new THREE.Mesh(g, world.mats.litFor(room.U, g)); m.matrixAutoUpdate = false; m.name = key + '-props'; room.group.add(m); }
    if (host.gacc.count) { const g = toGeometry(host.gacc, false); const m = new THREE.Mesh(g, world.mats.glowMat(room.U)); m.matrixAutoUpdate = false; m.name = key + '-propglow'; room.group.add(m); }
    for (const b of host.bins) world.bins.push({ ...b, room: key, y: room.def.level || 0 });
    for (const f of framed) addPanel(world, room, f);
    for (const t of TOTEM_POSTERS) if (t.room === key) addPanel(world, room, t);
  }
}
// v10 pictures on boards, framed, placed by the engine (no re-bake): the restroom pictograms, the east wall's mural, art over the cafe and
// by the spine door, the film standees' boards. x, y, z: the picture's centre; yaw: the way it faces; the board and frame sit behind it
// (depth + 4 mm), so a wall picture's centre is that far in front of the wall's face
const ESC_BOX_Z = (() => { const [zi0, zi1] = escProfile(ESC.up).incline; return zi0 - 0.6 - 2.45 / (L1 - 0.85) * (zi0 - zi1); })();   // the back of the boxed-in escalator feet (rooms.py zk1)
const ART = { room: 'lobby', yaw: 0, z: -13.6 + 0.034, frameCol: '#3e2618', frameMat: MAT.wood }, PIC = (o) => ({ room: 'lobby', depth: 0.03, ...o });
const FRAMED = [
  PIC({ id: 'picto_m', x: 21.56 - 0.034, y: 1.35, z: -3.05, yaw: -Math.PI / 2, w: 0.9, h: 2.0, emit: 1, frame: 'thin' }),
  PIC({ id: 'picto_f', x: 21.56 - 0.034, y: 1.35, z: 1.05, yaw: -Math.PI / 2, w: 0.9, h: 2.0, emit: 1, frame: 'thin' }),
  ...[-7.7, 1.8, 11.3].map((z, i) => PIC({ id: 'mural_' + i, x: 21.6 - 0.034, y: 7.6, z, yaw: -Math.PI / 2, w: 9.2, h: 2.4, emit: 0.25, frame: 'thin' })),
  ...[[-15.4, 1], [-12.8, 2], [-10.2, 3]].map(([x, n]) => PIC({ ...ART, id: 'art_' + n, x, y: 2.25, z: ART.z + 0.014, w: 0.8, h: 1.1 })),   // on the cafe's walnut (14 mm)
  PIC({ ...ART, id: 'art_4', x: -4.6, y: 2.0, z: ART.z + 0.014, w: 1.6, h: 1.1, frameCol: '#c9a35e', frameMat: MAT.brass }), PIC({ ...ART, id: 'art_5', x: 4.6, y: 2.0, z: ART.z + 0.014, w: 1.6, h: 1.1, frameCol: '#c9a35e', frameMat: MAT.brass }),   // on the rear wall's walnut (14 mm)
  ...[[-6.6, 0.885, 'cosmos'], [6.6, -0.885, 'agent327']].map(([x, yaw, f]) => PIC({ id: `poster_${f}_s`, x: x + Math.sin(yaw) * 0.018, y: 0.98, z: 12.6 + Math.cos(yaw) * 0.018, yaw, w: 1.1, h: 1.7, emit: 0.6 })),
  ...[[9.85, 'bunny'], [11.55, 'llamigos']].map(([x, f]) => PIC({ id: `poster_${f}_s`, x, y: 1.12, z: ESC_BOX_Z - 0.034, yaw: Math.PI, w: 0.9, h: 1.4, emit: 0.6 })),   // v11 on the walnut under the escalators
  ...[[6.0, 'hero'], [14.5, 'wingit']].map(([x, f]) => PIC({ room: 'corridor', id: `poster_${f}_s`, x, y: L1 + 0.98, z: BRIDGE.z0 + 0.8 + 0.018, yaw: 0, w: 1.1, h: 1.7, emit: 0.6 })),
];
// v11 the lobby's two poster totems (tools/kiln/poster_totem.kiln.js) show a film on each face: inside the totem's brass frame, 7 mm in
// front of its box (2 mm in front of the poster bed, 3 mm behind the frame's face). They stood blank, the frame floating off the box.
const TOTEM_POSTERS = [[-6.0, 0.35, 'sintel', 'cosmos'], [6.0, -0.35, 'hero', 'wingit']].flatMap(([x, yaw, a, b], i) => [[a, 1], [b, -1]].map(([f, s]) =>
  ({ room: 'lobby', id: `poster_${f}_t${i}`, x: x + s * Math.sin(yaw) * 0.087, y: 1.26, z: 16.3 + s * Math.cos(yaw) * 0.087, yaw: s > 0 ? yaw : yaw + Math.PI, w: 0.8, h: 1.22, emit: 0.7 })));
const UP = new THREE.Vector3(0, 1, 0), ONE = new THREE.Vector3(1, 1, 1);
function framePanel(acc, p) {   // the board (front 3 mm behind the picture) and four bars round it, 2.2 cm proud of the picture
  const t = p.frame === 'thin' ? 0.025 : 0.05, d = p.depth ?? 0.03, col = p.frameCol || '#c9a35e', mat = p.frameMat ?? MAT.brass;
  const R = new THREE.Matrix4().compose(new THREE.Vector3(p.x, p.y, p.z), new THREE.Quaternion().setFromAxisAngle(UP, p.yaw), ONE), put = (w, h, dd, x, y, z, c, m) => acc.add(boxGeo(w, h, dd), R.clone().multiply(M(x, y, z)), c, { mat: m });
  put(p.w + 0.004, p.h + 0.004, d, 0, 0, -d / 2 - 0.003, p.board || '#121214', MAT.powder);
  for (const s of [-1, 1]) { put(t, p.h + 0.004 + 2 * t, d + 0.025, s * (p.w / 2 + 0.002 + t / 2), 0, -d / 2 + 0.0095, col, mat); put(p.w + 0.004, t, d + 0.025, 0, s * (p.h / 2 + 0.002 + t / 2), -d / 2 + 0.0095, col, mat); }
}
function addPanel(world, room, p) {   // as buildWorld's bake panels: a canvas picture lit by the room's light where it hangs
  const pt = panelTexture(p.id, p.w, p.h, PANEL_DRAW), H = [0, 0, 0], F = [0, 0, 0], nx = Math.sin(p.yaw), nz = Math.cos(p.yaw); room.lights.at(p.x + nx * 0.1, p.y, p.z + nz * 0.1, nx, 0, nz, H, F);
  const mat = world.mats.texMat(pt.tex, room.U, new THREE.Color(H[0], H[1], H[2]), p.emit ?? 0), m = new THREE.Mesh(new THREE.PlaneGeometry(p.w, p.h), mat);
  m.position.set(p.x, p.y, p.z); m.rotation.y = p.yaw; m.updateMatrix(); m.matrixAutoUpdate = false; m.name = 'panel-' + p.id; room.group.add(m); world.panels[p.id] = { ...p, ...pt, mesh: m, mat };
}
// ---------------------------------------------------------------- halls: seats, picture, curtains
const FAMILY = { rocker: ['seat_rocker', 'arm_rocker'], recliner: ['seat_club', 'arm_club'], sofa: ['seat_club', 'arm_club'], pod: ['seat_club', 'arm_club'] };
const familyOf = (h, kind) => (h.id === 'CLASSIC' && kind === 'rocker' ? ['seat_classic', 'arm_classic'] : FAMILY[kind]);
// per-hall upholstery (v9.2): MAX midnight-blue leather (the large-format hall's colour), X-270 deep red (the ScreenX house colour), Curve dark cognac
const SEAT_SWAP = { MAX: { leather_black: '#1e2846' }, X270: { leather_black: '#3c0b11' }, CURVE: { leather_chocolate: '#1c100a' } };
const seatOver = (h) => { const sw = SEAT_SWAP[h.id]; if (!sw) return null; const o = {}; for (const k in sw) { const nm = named(k); if (nm) o[k] = { id: nm.id, tint: new THREE.Color(sw[k]).toArray() }; } return o; };
function buildHall(world, h, room) {
  const mats = world.mats, U = room.U, L = room.lights, seats = hallSeats(h); seats.forEach((s, i) => { s.i = i; s.hallKey = h.key; });
  const f = h.dir, flip = new THREE.Matrix4().makeRotationY(Math.PI), fams = {}, arms = [];
  const over = seatOver(h);
  // the screen's light reaches a surface facing it (and a little upward): the seat shader's facing term, per hall
  { const a0 = h.toWorld(0, 0), b0 = h.toWorld(0, 10), v = new THREE.Vector3(a0.x - b0.x, 0, a0.z - b0.z).normalize(); U.uScreenN.value.set(v.x * 0.96, 0.29, v.z * 0.96); }
  // seat width: each family's model is stretched across to the seat pitch of its row (minus the arm between seats)
  for (const s of seats) { const [sn, an] = familyOf(h, s.kind), k = sn + '|' + s.kind; (fams[k] || (fams[k] = { sn, an, kind: s.kind, list: [] })).list.push(s); }
  for (const row of h.rows) { const places = row.places, us = new Set(); for (const p of places) { const w = row.sd.w; us.add(Math.round((p.u - w / 2) * 1000)); us.add(Math.round((p.u + w / 2) * 1000)); }
    if (row.pairs) for (let p = 0; p < row.pairs; p++) { const a = places[2 * p], b = places[2 * p + 1]; us.delete(Math.round((a.u + row.sd.w / 2) * 1000)); us.add(Math.round(((a.u + b.u) / 2) * 1000)); }
    const [, an] = familyOf(h, row.seat); for (const u1000 of us) { const q = h.fromRow(u1000 / 1000, row.dHip), w = h.toWorld(q.u, q.d); arms.push({ x: w.x, y: h.y0 + row.y, z: w.z, yaw: h.yawOf(q.yaw), an, row: row.r, a: u1000 / 1000 }); } }
  const P = room.bake && room.bake.probes, lit = new Float32Array(seats.length * 7), H3 = [0, 0, 0], F3 = [0, 0, 0];
  if (P && P.seat && P.seat.length === seats.length * 7) { lit.set(P.seat); const g = room.gain || 1; for (let i = 0; i < lit.length; i += 7) { for (let c = 0; c < 3; c++) { lit[i + c] *= g; lit[i + 3 + c] *= Math.min(g, 10); } } }
  else { if (room.bake) console.warn('bake ' + h.key + ': seat probes missing, analytic seat light'); seats.forEach((s, i) => { const sn = Math.sin(s.yaw), cs = Math.cos(s.yaw); L.at(s.x + sn * 0.2, s.y + 1.1, s.z + cs * 0.2, sn * 0.7, 0.7, cs * 0.7, H3, F3); lit.set([H3[0], H3[1], H3[2], F3[0], F3[1], F3[2], 0.5], i * 7); }); }
  const armLit = new Float32Array(arms.length * 7); arms.forEach((a, i) => { let best = 0, bd = 1e9; for (const s of seats) { if (s.row !== a.row) continue; const d = Math.abs(s.a - a.a); if (d < bd) { bd = d; best = s.i; } } armLit.set(lit.subarray(best * 7, best * 7 + 7), i * 7); });
  const groups = [];
  const instanced = (geo, list, lt, sx) => { const ms = [0, 1].map((l) => { const g = geo[l] && geo[l].attributes.position.count ? geo[l] : l ? null : geo[0]; if (!g) return null; const m = new THREE.InstancedMesh(g, mats.litFor(U, g, true), list.length); m.name = 'seats-' + (list[0] && (list[0].an || list[0].kind)) + '-lod' + l; m.count = 0; m.frustumCulled = false;
    for (const [k, w] of [['iLh', 3], ['iLf', 3], ['iLs', 1]]) g.setAttribute(k, new THREE.InstancedBufferAttribute(new Float32Array(list.length * w), w)); room.group.add(m); return m; }); groups.push({ list, ms, lt, sx, arm: !!(list[0] && list[0].an) }); };
  for (const F of Object.values(fams)) {
    const geo = [0, 1].map((l) => assetGeometry(F.sn, l, flip, toGeometry, Acc, over)); if (!geo[0]) { console.warn('seat model missing: ' + F.sn); continue; }
    geo[0].computeBoundingBox(); const bw = geo[0].boundingBox.max.x - geo[0].boundingBox.min.x, aw = ASSETS[F.an] ? ASSETS[F.an].box.max.x - ASSETS[F.an].box.min.x : 0.06;
    const want = SEAT[F.kind].w - Math.min(0.12, aw), sx = clamp(want / Math.max(0.2, bw), 0.75, 1.7);
    const idx = F.list.map((s) => s.i), sub = new Float32Array(idx.length * 7); idx.forEach((i, k) => sub.set(lit.subarray(i * 7, i * 7 + 7), k * 7)); instanced(geo, F.list, sub, sx);
  }
  const armFam = {}; arms.forEach((a, i) => { (armFam[a.an] || (armFam[a.an] = [])).push(i); });
  for (const an in armFam) { const geo = [0, 1].map((l) => assetGeometry(an, l, flip, toGeometry, Acc, over)); if (!geo[0]) continue; const ids = armFam[an], list = ids.map((i) => arms[i]), sub = new Float32Array(ids.length * 7); ids.forEach((i, k) => sub.set(armLit.subarray(i * 7, i * 7 + 7), k * 7)); instanced(geo, list, sub, 1); }
  // colliders: each seat's footprint (its own frame: across the seat, from the seat front to the back of the backrest)
  for (const s of seats) { const sd = SEAT[s.kind], cs = Math.cos(s.yaw), sn = Math.sin(s.yaw), hw = sd.w / 2 - 0.02, c = [[-hw, -sd.fr], [hw, -sd.fr], [hw, sd.bk], [-hw, sd.bk]].map(([u, v]) => [s.x + u * cs + v * sn, s.z - u * sn + v * cs]);
    for (let k = 0; k < 4; k++) world.walls.add(c[k][0], c[k][1], c[(k + 1) % 4][0], c[(k + 1) % 4][1], s.y + 0.05, s.y + sd.h); }
  // the picture: the screen's own curve (sag), 48 strips across; uv u runs to the viewer's right
  const N = 48, pos = [], uv = [], idx = [], W = h.W, Hh = h.H, yb = h.y0 + h.hB;
  for (let i = 0; i <= N; i++) { const u = -W / 2 + W * i / N, d = h.screenD(u) - 0.004, w = h.toWorld(u, d); pos.push(w.x, yb, w.z, w.x, yb + Hh, w.z); uv.push(i / N, 0, i / N, 1); if (i < N) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); } }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); pg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); pg.setIndex(idx); pg.computeVertexNormals();
  { const nv = pg.attributes.normal; if (nv.getX(N) * -f < 0) { const I = pg.index.array; for (let k = 0; k < I.length; k += 3) { const t = I[k + 1]; I[k + 1] = I[k + 2]; I[k + 2] = t; } pg.computeVertexNormals(); } }
  const slate = slateTexture(h), picMat = pictureMat(slate); picMat.uniforms.uGain.value = 0.55; const pic = new THREE.Mesh(pg, picMat); pic.renderOrder = 1; pic.frustumCulled = false; pic.name = h.key + '-picture'; room.group.add(pic);   // v11: never culled (a picture that blanks when you turn is the one glitch a cinema can't have)
  { const bg = pg.clone(), I = bg.index.array; for (let k = 0; k < I.length; k += 3) { const t = I[k + 1]; I[k + 1] = I[k + 2]; I[k + 2] = t; }   // seen from behind (the passage beside the screen): dark cloth, not a hole into the hall
    const back = new THREE.Mesh(bg, new THREE.MeshBasicMaterial({ color: 0x060607 })); back.name = h.key + '-picture-back'; back.matrixAutoUpdate = false; room.group.add(back); }
  // the analytic screen light (people, held items): six patches across the curve
  const patches = []; for (let i = 0; i < 6; i++) { const ua = -W / 2 + W * i / 6, ub = ua + W / 6, a = h.toWorld(ua, h.screenD(ua)), b = h.toWorld(ub, h.screenD(ub)), tx = (b.x - a.x) / 2, tz = (b.z - a.z) / 2, tl = Math.hypot(tx, tz) || 1, sg = (tz / tl) * -f >= 0 ? 1 : -1;
    patches.push({ c: [(a.x + b.x) / 2, yb + Hh / 2, (a.z + b.z) / 2], u: [tx, 0, tz], v: [0, Hh / 2, 0], n: [sg * tz / tl, 0, -sg * tx / tl], su: 3, sv: 3 }); }
  L.setScreen(patches);
  // curtains (CURVE, CLASSIC): two pleated halves that gather to the sides
  let curtains = null;
  if (h.curtain) { const cw = W / 2 + 0.9, top = yb + Hh + 0.55, dC = h.sagD + 0.5, base = h.toWorld(0, dC), ms = [];
    for (const s of [-1, 1]) { const n = 30, pp = [], ii = []; for (let i = 0; i <= n; i++) { const t = i / n, x = -s * t * cw, fold = (i % 2 ? 1 : -1) * 0.07; pp.push(x, h.y0 + 0.02, fold, x, top, fold); if (i < n) { const k = i * 2; if (s < 0) ii.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); else ii.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } }
      const g0 = new THREE.BufferGeometry(); g0.setAttribute('position', new THREE.Float32BufferAttribute(pp, 3)); g0.setIndex(ii); g0.computeVertexNormals(); const a = new Acc(); a.add(g0, null, h.id === 'CLASSIC' ? '#5a1a24' : '#2a2f4a', { mat: MAT.fabric });
      { const g1 = g0.clone(), I1 = g1.index.array, N1 = g1.attributes.normal; for (let k = 0; k < I1.length; k += 3) { const t = I1[k + 1]; I1[k + 1] = I1[k + 2]; I1[k + 2] = t; }   // cloth has two sides: the back of each pleat
        for (let k = 0; k < N1.count; k++) N1.setXYZ(k, -N1.getX(k), -N1.getY(k), -N1.getZ(k)); a.add(g1, null, h.id === 'CLASSIC' ? '#4a1620' : '#23283f', { mat: MAT.fabric }); }
      const geo = toGeometry(a);
      const m = new THREE.Mesh(geo, mats.litFor(U, geo)); m.name = 'curtain'; m.userData.cw = cw; m.rotation.y = -f * Math.PI / 2; const o = h.toWorld(s * cw, dC); m.position.set(o.x, 0, o.z); m.updateMatrixWorld(true);
      geo.applyMatrix4(m.matrixWorld); L.bake(geo); geo.applyMatrix4(m.matrixWorld.clone().invert()); room.group.add(m); ms.push(m); }
    curtains = { meshes: ms, open: 0.999, target: 1, base }; }   // v9.3: open, gathered at the sides (closed, the screen read as a dark wall: "where is the screen")
  const tmp = new THREE.Object3D(); let last = [1e9, 1e9];
  const hall = { cfg: h, id: h.id, key: h.key, name: h.name, room, seats, arms, pic, picMat, slate, patches, curtains, seatLit: lit,
    updateLOD(cam, force, far = 7) {
      const px = cam.position.x, pz = cam.position.z; if (!force && Math.hypot(px - last[0], pz - last[1]) < 0.5) return; last = [px, pz]; const fin = (far - 0.8) ** 2, fout = (far + 0.8) ** 2;
      for (const G_ of groups) { const cnt = [0, 0], { list, ms, lt, sx, arm } = G_;
        for (let i = 0; i < list.length; i++) { const s = list[i], dx = s.x - px, dz = s.z - pz, d2 = dx * dx + dz * dz; if (arm && d2 > 196) continue;   // arms past 14 m hide behind the seat backs
          const l = (s.lod = force ? (d2 < far * far ? 0 : 1) : s.lod === 1 ? (d2 < fin ? 0 : 1) : (d2 > fout ? 1 : 0)), m = ms[l] || ms[0], k = cnt[ms[l] ? l : 0]++;
          tmp.position.set(s.x, s.y, s.z); tmp.rotation.set(0, s.yaw, 0); tmp.scale.set(sx, 1, 1); tmp.updateMatrix(); m.setMatrixAt(k, tmp.matrix);
          const a = m.geometry.attributes; a.iLh.setXYZ(k, lt[i * 7], lt[i * 7 + 1], lt[i * 7 + 2]); a.iLf.setXYZ(k, lt[i * 7 + 3], lt[i * 7 + 4], lt[i * 7 + 5]); a.iLs.setX(k, lt[i * 7 + 6]); }
        ms.forEach((m, i) => { if (!m) return; m.count = cnt[i]; m.instanceMatrix.needsUpdate = true; for (const n of ['iLh', 'iLf', 'iLs']) m.geometry.attributes[n].needsUpdate = true; }); }
    },
  };
  return hall;
}
// the idle screen: the hall's name on a dark slate (the show system swaps in the countdown, then the film)
export function slateTexture(h) {
  // v9.1b: between shows the screen reads as what it is, a big silver screen under the house lights (it was near black: "the screens look
  // so small"), with the hall's wordmark in ink and a gold rule, like a cinema's own house slide
  const w = 1024, ht = Math.round(w / h.aspect), c = makeCanvas(w, ht), g = c.getContext('2d'), gr = g.createRadialGradient(w / 2, ht * 0.45, 10, w / 2, ht / 2, w * 0.62);
  gr.addColorStop(0, '#e9e6df'); gr.addColorStop(0.6, '#cdcac3'); gr.addColorStop(1, '#8f8c87'); g.fillStyle = gr; g.fillRect(0, 0, w, ht); g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#14162e'; g.font = `500 ${ht * 0.15}px ${SERIF}`; if ('letterSpacing' in g) g.letterSpacing = `${ht * 0.045}px`; g.fillText('LUMIÈRE', w / 2, ht * 0.43);
  g.fillStyle = '#b8873a'; g.fillRect(w / 2 - ht * 0.22, ht * 0.535, ht * 0.44, Math.max(2, ht * 0.006));
  g.fillStyle = 'rgba(20,22,46,.78)'; g.font = `600 ${ht * 0.055}px ${SANS}`; if ('letterSpacing' in g) g.letterSpacing = `${ht * 0.035}px`; g.fillText(h.name.replace('LUMIERE ', '') + '  ·  SCREEN ' + h.no, w / 2, ht * 0.62);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
// the picture: shown exactly as graded (no tone curve, no fog); uBox letterboxes it inside the screen
const PIC_VERT = `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
// uExtOn (the 270 hall in ScreenX mode): beside a narrower frame the screen is not black but carries the frame's edges on, softening
// with distance (uExt: the blurred spill copy, uExtW: the screen's width in metres), exactly as the side screens continue it
const PIC_FRAG = `uniform sampler2D map; uniform vec4 uBox; uniform vec4 uSrc; uniform float uGain; uniform sampler2D uExt; uniform float uExtOn; uniform float uExtW; varying vec2 vUv;
void main() { vec2 q = (vUv - uBox.xy) / uBox.zw; float inside = step(0.0, q.x) * step(q.x, 1.0) * step(0.0, q.y) * step(q.y, 1.0);
  vec3 c = texture2D(map, uSrc.xy + clamp(q, 0.0, 1.0) * uSrc.zw).rgb * inside;
  if (uExtOn > 0.5 && inside < 0.5 && q.y >= 0.0 && q.y <= 1.0) { float xe = clamp(vUv.x, uBox.x + 0.002, uBox.x + uBox.z - 0.002), over = abs(vUv.x - xe) * uExtW;
    c = textureLod(uExt, vec2(xe, vUv.y), 1.5 + over * 0.45).rgb * (1.0 - 0.45 * smoothstep(0.0, 12.0, over)); }
  gl_FragColor = vec4(c * uGain, 1.0);
  #include <colorspace_fragment>
}`;
export function pictureMat(map = null) { return new THREE.ShaderMaterial({ vertexShader: PIC_VERT, fragmentShader: PIC_FRAG, uniforms: { map: { value: map }, uBox: { value: new THREE.Vector4(0, 0, 1, 1) }, uSrc: { value: new THREE.Vector4(0, 0, 1, 1) }, uGain: { value: 1 }, uExt: { value: null }, uExtOn: { value: 0 }, uExtW: { value: 10 } } }); }   // uSrc: the part of the frame shown (the 270 hall's split mode shows the middle third)
// ---------------------------------------------------------------- reflections: one 128 px cube per room
const PROBE_AT = { lobby: [0, 2.2, 6], street: [0, 2.2, 30], wc: [27, 1.6, -4], corridor: [0, L1 + 1.6, -18], spine: [0, 1.6, -40] };
// v12: rooms whose reflections are looked up where the ray meets the room's own box (materials.js uEnvBox): the street (a wet road that
// mirrors the shop fronts where they stand) and the lobby (polished marble under the ceiling's lights); min x y z, max x y z
const ENV_BOX = { street: [STREET.x0 - 6, -0.2, STREET.z0, STREET.x1 + 6, 26, STREET.far], lobby: [LOBBY.x0, 0, LOBBY.z0, LOBBY.x1, LOBBY.ceil, LOBBY.z1] };
// Called again when Settings turns reflections on or widens them: rooms that have their cube are left alone.
function captureReflections(world, engine) {
  if (!('USE_ENV' in world.mats.defines)) return; const r = engine.renderer, prev = new Set(world.vis), room0 = [...prev][0], rtPrev = r.getRenderTarget(); G.uEnvOn.value = 0;
  for (const key in world.rooms) { const room = world.rooms[key]; if (room.probe || (world.mats.heroOnly && !room.U.hero)) continue; const h = HALL_BY_KEY[key], at = h ? (() => { const w = h.toWorld(0, h.depthIn - 1.6); return [w.x, h.y0 + h.total + 1.6, w.z]; })() : PROBE_AT[key] || [0, 2, 0];
    const bx = ENV_BOX[key], rt = new THREE.WebGLCubeRenderTarget(bx ? 256 : 128, { generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter }), cam = new THREE.CubeCamera(0.1, bx ? 130 : 90, rt);
    cam.position.set(...at); world.setVisibility(key, at[0], at[1], at[2], true); cam.update(r, engine.scene); room.U.uEnvMap.value = rt.texture; room.probe = { rt, at };
    if (bx) { room.U.uEnvPos.value.set(...at); room.U.uEnvMin.value.set(bx[0], bx[1], bx[2]); room.U.uEnvMax.value.set(bx[3], bx[4], bx[5]); room.U.uEnvBox.value = 1; } }
  G.uEnvOn.value = 1; r.setRenderTarget(rtPrev); world.vis = prev; for (const k in world.rooms) world.rooms[k].group.visible = prev.has(k); for (const d of world.doors) d.group.visible = d.rooms.some((k) => prev.has(k));
}
// ---------------------------------------------------------------- the world
export async function buildWorld(engine, mats, onProgress = () => {}) {
  const world = { mats, engine, rooms: {}, doors: [], halls: [], walls: new Walls(), vis: new Set(['lobby']), panels: {}, uses: [], bins: [], sitSpots: [], escalators: [], movers: [], dress: DRESS };   // dress: for tools/dev/props-overlap.mjs
  engine.scene.background = new THREE.Color(0x07070a);
  world.hallByKey = (k) => world.halls.find((h) => h.key === k); world.hallById = (id) => world.halls.find((h) => h.id === id);
  const keys = Object.keys(ROOMS); let i = 0;
  const X = Object.fromEntries(await Promise.all(keys.map(async (k) => { try { const r = await fetch(`./bake/${k}_x.json`); return [k, r.ok ? await r.json() : null]; } catch (e) { return [k, null]; } })));
  for (const key of keys) {
    onProgress(0.05 + 0.5 * i++ / keys.length, key); await frame();
    const x = X[key], def = ROOMS[key], U = roomUniforms(), group = new THREE.Group(); group.name = key; engine.scene.add(group); if (key in ENV_BOX) Object.defineProperty(U, 'hero', { value: true });   // not enumerable: U is spread into uniforms
    const lights = new Lights({ ceil: def.ceil || 4, rect: def.rect }); if (x) { lights.L = x.lights.L; lights.shapes = x.lights.shapes; lights.amb = x.lights.amb; }
    const room = { key, def, U, group, lights, x, gain: 1 }; world.rooms[key] = room; U.uFill.value = FILL[key] || 0; U.uSoft.value = SOFT[key] ?? 0.5;
    // spill (materials.js LM_SPILL): a hall samples a small blurred copy of its picture by where a surface is, across and up the screen
    if (def.kind === 'hall') { const h = HALL[def.hall]; U.uSpill = { value: null }; U.uSpillP = { value: new THREE.Vector4(h.zc, h.dir / h.W, h.y0 + h.hB, 1 / h.H) }; U.uSpillA = { value: 0.85 }; }
    const bk = BAKES[key];
    if (bk && x && bk.hash === x.hash) {
      const geo = bk.geo; let m;
      // exposure per room: the bakes keep the lights' authored power; each room is scaled to its target average (house lights up)
      const gain = clamp((LEVEL[key] || 0.5) / Math.max(0.005, bk.avg), 0.5, 30); room.gain = gain; scaleLights(lights, gain);
      if (mats.lightMaps) { const mat = mats.litRoom(U, false, bk); mat.uniforms.uLmK.value.x *= gain; mat.uniforms.uLmK.value.y *= Math.min(gain, 10); m = new THREE.Mesh(geo, mat); room.bake = bk; U.uEnvK.value = 1 / Math.max(0.05, bk.avg * gain); }
      else { const g = geo.clone(); lights.bake(g); m = new THREE.Mesh(g, mats.litFor(U, g)); room.bake = { ...bk, maps: null }; }
      m.matrixAutoUpdate = false; m.name = key + '-shell'; group.add(m); room.solid = m;
      if (!bk._walls) { world.walls.fromGeometry(geo, def.kind === 'street' ? 3 : L1 + 2.2); bk._walls = true;
        // v12: the lanes north at the street's ends carry the traffic in and out; people stop at their mouths (street12.py side_street)
        if (def.kind === 'street') for (const [a, b] of [[STREET.x0 - 6, STREET.x0 + 2], [STREET.x1 - 2, STREET.x1 + 6]]) world.walls.add(a, STREET.far, b, STREET.far, -1, 3, 1); }
      // glass (balustrades, the facade, screens) is drawn see-through on its own: the shell keeps every other face
      const glass = splitGlass(m.geometry); if (glass) { const gm = new THREE.Mesh(glass, mats.glassMat()); gm.renderOrder = 3; gm.matrixAutoUpdate = false; gm.name = key + '-glass'; group.add(gm); }
    } else console.warn(`[lumiere] room ${key}: no matching bake (${bk ? bk.hash : 'none'} vs ${x ? x.hash : 'no extras'}); run tools/bake/bake9.sh`);
    if (x && x.glow) { const P = b64f(x.glow.pos), C = b64f(x.glow.col), g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('color', new THREE.BufferAttribute(C, 3)); g.setAttribute('grp', new THREE.BufferAttribute(new Float32Array(P.length / 3), 1));
      const m = new THREE.Mesh(g, mats.glowMat(U)); m.matrixAutoUpdate = false; m.name = key + '-glow'; group.add(m); }
    for (const p of (x && x.panels) || []) { const pt = panelTexture(p.id, p.w, p.h, PANEL_DRAW), H = [0, 0, 0], F = [0, 0, 0], nx = Math.sin(p.yaw), nz = Math.cos(p.yaw), k = NUDGE[p.id] || 0; lights.at(p.x + nx * 0.1, p.y, p.z + nz * 0.1, nx, 0, nz, H, F);
      const mat = mats.texMat(pt.tex, U, new THREE.Color(H[0], H[1], H[2]), p.emit ? 0.9 : 0), m = new THREE.Mesh(new THREE.PlaneGeometry(p.w, p.h), mat); m.position.set(p.x + nx * k, p.y, p.z + nz * k); m.rotation.y = p.yaw; m.updateMatrix(); m.matrixAutoUpdate = false; m.name = 'panel-' + p.id; group.add(m);
      world.panels[p.id] = { ...p, ...pt, mesh: m, mat }; }
    if (x && x.fixtures) for (const fx of x.fixtures) world.uses.push({ ...fx, room: key, sub: fx.room });
    if (def.kind === 'hall') { const h = buildHall(world, HALL[def.hall], room); world.halls.push(h); room.hall = h; }
  }
  dressRooms(world);
  // street edges: you can't walk off the model
  { const S = STREET; for (const [ax, az, bx, bz] of [[S.x0, S.z0, S.x0, S.z1], [S.x1, S.z0, S.x1, S.z1], [S.x0, S.far, S.x1, S.far]]) world.walls.add(ax, az, bx, bz, -1, 4); }
  onProgress(0.6, 'doors');
  for (const d of DOORS) { const door = new Door(world, d); door.onToggle = (o, dd) => world.onDoor && world.onDoor(o, dd); world.doors.push(door); engine.scene.add(door.group); }
  for (const k of ['up', 'down']) { const e = new Escalator(world, ESC[k], k); world.escalators.push(e); world.movers.push(e); }
  world.travelator = new Travelator(world, TRAVELATOR); world.movers.push(world.travelator);
  world.lift = new Lift(world, LIFT);
  // the ticket gate: one glass leaf in the barrier at the foot of the up escalator, hinged at its west post; the usher opens it for you
  // v11: the leaves hang in the escalator hall's portal (rooms.py core_hall): the ticket leaf on the portal's west jamb, the exit leaves on
  // the gate cabinet and the east jamb. Each leaf has a hinge stile with two pivots on its jamb (the user's photo: frames that hung from
  // nothing); free edges stop 15 mm short of the cabinet and 20 mm short of each other.
  const GH = 1.25, hinge = (a, d, x) => { a.add(boxGeo(0.05, GH - 0.05, 0.05), M(x + d * 0.025, (GH - 0.05) / 2, 0), '#c9a35e', { mat: MAT.brass }); for (const y of [0.18, GH - 0.22]) a.add(new THREE.CylinderGeometry(0.022, 0.022, 0.09, 12), M(x - d * 0.012, y, 0), '#b8893c', { mat: MAT.brass }); };
  { const g = world.gate = { x0: GATE.gate[0], x1: GATE.gate[1], z: GATE.z, open: 0, target: 0 }, w = g.x1 - g.x0 - 0.045, grp = new THREE.Group(), a = new Acc();
    hinge(a, 1, 0); a.add(boxGeo(w, 0.05, 0.05), M(w / 2, GH - 0.025, 0), '#c9a35e', { mat: MAT.brass }); a.add(boxGeo(0.05, GH - 0.05, 0.05), M(w - 0.025, (GH - 0.05) / 2, 0), '#c9a35e', { mat: MAT.brass }); a.add(boxGeo(w - 0.08, 0.04, 0.03), M(w / 2, 0.13, 0), '#c9a35e', { mat: MAT.brass }); const fg = toGeometry(a);   // the kick rail runs 1 cm into both stiles (v11: its end shared the hinge stile's face)
    fg.translate(g.x0 + 0.03, 0, g.z); world.rooms.lobby.lights.bake(fg); fg.translate(-(g.x0 + 0.03), 0, -g.z); { const gm = new THREE.Mesh(fg, mats.litFor(world.rooms.lobby.U, fg)); gm.name = 'gate'; grp.add(gm); }
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.06, GH - 0.2), mats.glassMat()); pane.position.set(w / 2, 0.15 + (GH - 0.2) / 2, 0); grp.add(pane); grp.position.set(g.x0 + 0.03, 0, g.z); world.rooms.lobby.group.add(grp); g.group = grp;
    // v10: the leaf also swings for a walker (they hold tickets) but only the usher's pass (or Quick play, 'always') lets the player through:
    // following someone in is no way past the check
    g.passUntil = 0; g.npcUntil = 0; g.always = false;
    // v11 a light on the leaf's top rail: red while it is shut to you, green once your ticket (or Quick play) opens it
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(w - 0.3, 0.014, 0.03), new THREE.MeshBasicMaterial({ color: 0xff4d5a })); lamp.position.set(w / 2, GH + 0.007, 0); lamp.name = 'gate-lamp'; grp.add(lamp); g.lamp = lamp;
    g.update = (dt, actors) => { const now = performance.now(); if (lamp.material.color) lamp.material.color.setHex(g.always || g.passUntil > now ? 0x3ecf8e : 0xff4d5a);   // (test tools swap materials)
      if (actors) for (const a of actors) if (a.path && a.x > g.x0 - 0.4 && a.x < g.x1 + 0.4 && Math.abs(a.z - g.z) < 1.3 && (a.y || 0) < 1) { g.npcUntil = now + 1200; break; }
      g.target = g.always || g.passUntil > now || g.npcUntil > now ? 1 : 0; g.open += (g.target - g.open) * (1 - Math.exp(-dt * 4)); grp.rotation.y = g.open * 1.5; };   // swings in, towards the escalator
    g.pass = (ms = 9000) => { g.passUntil = performance.now() + ms; };
    g.letsPlayer = () => (g.always || g.passUntil > performance.now()) && g.open >= 0.6; }
  // v10 free exit (the ticket zone's way out, from the down escalator and the lift): two half leaves in the gate line that swing out into the
  // lobby when anyone inside comes near. From the lobby side they never let you in (world.collide).
  { const E = GATE.exit, z = GATE.z, wl = (E[1] - E[0]) / 2 - 0.04, x = world.exitGate = { x0: E[0], x1: E[1], z, open: 0, until: 0, leaves: [] }, grp = new THREE.Group();
    for (const hx of [E[0] + 0.03, E[1] - 0.03]) { const d = hx < (E[0] + E[1]) / 2 ? 1 : -1, a = new Acc();   // d: from the hinge towards the middle
      hinge(a, d, 0); a.add(boxGeo(wl, 0.05, 0.05), M(d * wl / 2, GH - 0.025, 0), '#c9a35e', { mat: MAT.brass }); a.add(boxGeo(0.05, GH - 0.05, 0.05), M(d * (wl - 0.025), (GH - 0.05) / 2, 0), '#c9a35e', { mat: MAT.brass }); a.add(boxGeo(wl - 0.08, 0.04, 0.03), M(d * wl / 2, 0.13, 0), '#c9a35e', { mat: MAT.brass });
      const fg = toGeometry(a); fg.translate(hx, 0, z); world.rooms.lobby.lights.bake(fg); fg.translate(-hx, 0, -z);
      const piv = new THREE.Group(); piv.position.set(hx, 0, z); const m = new THREE.Mesh(fg, mats.litFor(world.rooms.lobby.U, fg)); m.name = 'exit-leaf'; piv.add(m);
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(wl - 0.06, GH - 0.2), mats.glassMat()); pane.position.set(d * wl / 2, 0.15 + (GH - 0.2) / 2, 0); piv.add(pane); grp.add(piv); x.leaves.push({ piv, d }); }
    world.rooms.lobby.group.add(grp);
    x.update = (dt, actors) => { const now = performance.now();
      if (actors) for (const a of actors) if ((a.y || 0) < 1 && a.x > x.x0 - 0.5 && a.x < x.x1 + 0.5 && a.z < z + 0.6 && a.z > z - 1.8) { x.until = now + 1500; break; }
      const t = x.until > now ? 1 : 0; x.open += (t - x.open) * (1 - Math.exp(-dt * 5)); for (const L of x.leaves) L.piv.rotation.y = -L.d * x.open * 1.45; }; }
  // floors, rooms, collision for the player and the walkers
  world.roomAt = roomAt;
  world.floorY = (x, z, y = 0) => {
    const r = roomAt(x, y, z);
    if (r && r.startsWith('hall')) { const h = HALL_BY_KEY[r], q = h.toLocal(x, z); return h.y0 + hallFloor(h, q.u, q.d); }
    if (r === 'corridor') return L1;
    if (r === 'lobby') { for (const e of world.escalators) if (e.contains(x, z)) { const fy = e.floor(z); if (y > fy - 1.0) return fy; }
      if (IN(CAB, x, z)) return world.lift.y; return y > L1 - 1.2 && onMezz(x, z) ? L1 : 0; }
    if (r === 'spine') { const sy = stairY(x, z, y); if (sy !== null) return sy; return world.travelator.contains(x, z) ? 0.12 : 0; }
    if (r === 'street') return z > STREET.kerb && z < STREET.road[1] ? -0.15 : 0;
    return 0;
  };
  // what moves you: escalators and the travelator carry whoever stands on them
  world.carry = (x, z, y, out = { x: 0, z: 0 }) => { out.x = 0; out.z = 0; for (const e of world.escalators) if (e.contains(x, z, -0.05) && Math.abs(y - e.floor(z)) < 0.5) return e.carry(out); if (world.travelator.contains(x, z) && y < 0.5) return world.travelator.carry(out); return out; };
  // circle against the shell's wall bands near your height, closed doors, the lift doors; returns how far it was pushed
  const near = [], W = world.walls.S;
  world.collide = (p, r, y) => {
    let push = 0; const lo = y + STEP_UP, hi = y + HEAD;
    const seg = (ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1e-9, t = clamp(((p.x - ax) * dx + (p.z - az) * dz) / l2, 0, 1), cx = ax + dx * t, cz = az + dz * t; let ex = p.x - cx, ez = p.z - cz; const d2 = ex * ex + ez * ez;
      if (d2 >= r * r) return; const d = Math.sqrt(d2); if (d < 1e-5) { ex = -dz; ez = dx; const el = Math.hypot(ex, ez) || 1; ex /= el; ez /= el; p.x += ex * r; p.z += ez * r; push += r; return; } const k = (r - d) / d; p.x += ex * k; p.z += ez * k; push += r - d; };
    for (let it = 0; it < 3; it++) {
      world.walls.near(p.x, p.z, near); for (const i of near) { const j = i * 6; if (W[j + 5] <= lo || W[j + 4] >= hi) continue; seg(W[j], W[j + 1], W[j + 2], W[j + 3]); }
      for (const d of world.doors) if (d.blocking && Math.abs(d.y - y) < 1.5 && Math.abs(p.x - d.x) < d.w + 1 && Math.abs(p.z - d.z) < d.w + 1) seg(...d.segment());
      for (const s of world.lift.doorSegs()) if (s.on && y > s.y0 - 0.5 && y < s.y1 && Math.abs(p.x - s.seg[0]) < 3 && Math.abs(p.z - s.seg[1]) < 2) seg(...s.seg);
      { const g = world.gate; if (!g.letsPlayer() && y < 1 && Math.abs(p.z - g.z) < 1 && p.x > g.x0 - 1 && p.x < g.x1 + 1) seg(g.x0, g.z, g.x1, g.z); }
      { const g = world.exitGate; if ((g.open < 0.6 || p.z > g.z) && y < 1 && Math.abs(p.z - g.z) < 1 && p.x > g.x0 - 1 && p.x < g.x1 + 1) seg(g.x0, g.z, g.x1, g.z); }   // one way: out only
    }
    return push;
  };
  world.collidersNear = () => [];   // v8 API (box colliders): walls are segments now (world.collide)
  // portal visibility: you see a neighbour while the opening between you is open
  const GLASS = new Set(['lobby|street', 'street|lobby']);   // the lobby's glass front: the street is always in view
  const linkOpen = (a, b) => { if (GLASS.has(a + '|' + b)) return true; let any = false; for (const d of world.doors) if (d.rooms.includes(a) && d.rooms.includes(b)) { any = true; if (d.kind === 'open' || d.open > 0.02) return true; } return !any; };
  world.setVisibility = (room, x, y, z, all = false) => {
    // two links deep: from the street you see through the lobby's glass and on through its open portal into the corridor and through
    // the restroom door; from the spine through the lobby to the street (one link left those rooms undrawn: you saw the void there)
    const v = new Set([room || 'lobby']); let front = [...v];
    for (let hop = 0; hop < (all ? 1 : 2); hop++) { const next = []; for (const r of front) { const def = ROOMS[r]; if (def) for (const k of def.vis) if (!v.has(k) && (all || linkOpen(r, k))) { v.add(k); next.push(k); } } front = next; }
    world.vis = v; for (const k in world.rooms) world.rooms[k].group.visible = v.has(k); for (const d of world.doors) d.group.visible = d.rooms.some((k) => v.has(k));
    // v11 a neighbouring room's furniture is drawn only from the rooms it can be made out from: the corridor's, the restrooms' and the
    // street's from the lobby (and their own room), the lobby's wherever the lobby itself is drawn. It switches only when you pass from
    // one room to another, as the rooms themselves do, never part way across a room (a threshold inside a room would make things pop).
    // From the corridor this hides the street's and the restrooms' furniture, 40 m away through two openings: about 57,000 triangles.
    const here = room || 'lobby', show = { corridor: here === 'corridor' || here === 'lobby', wc: here === 'wc' || here === 'lobby', street: here === 'street' || here === 'lobby' };
    for (const k in show) { const rm = world.rooms[k]; if (!rm) continue; if (!rm.propMeshes || !rm.propMeshes.length) rm.propMeshes = rm.group.children.filter((o) => o.name === k + '-props' || o.name === k + '-propglow');   // looked up again until the props exist (reflections are captured before them)
      for (const m of rm.propMeshes) m.visible = all || world.propCull === false || show[k]; }
  };
  world.update = (dt, actors, now) => {
    for (const d of world.doors) d.update(dt, actors); const lob = world.rooms.lobby.group.visible;
    if (lob) for (const e of world.escalators) e.update(dt); if (world.rooms.spine.group.visible) world.travelator.update(dt); world.lift.update(dt, actors, world.onLift); world.gate.update(dt, actors); world.exitGate.update(dt, actors);
    for (const h of world.halls) if (h.curtains) { const c = h.curtains; if (c.open !== c.target || (c.sway || 0) > 0.002) { c.open += Math.sign(c.target - c.open) * Math.min(Math.abs(c.target - c.open), dt / 4.5); const u = c.open, e = u * u * u * (u * (u * 6 - 15) + 10);
      // v10 (the user's photos: "glitchy lines on the very border"): the open halves used to bunch 10 cm over the picture's edges, their
      // pleats lit by the film. Open, each half now gathers into 0.5 m beside the picture (its inner edge 0.4 m clear) and is put away
      c.sway = c.open !== c.target ? 1 : (c.sway || 0) * Math.exp(-dt * 1.4); c.t = (c.t || 0) + dt;
      for (const m of c.meshes) { const cw = m.userData.cw || 1; m.scale.x = 1 - (1 - 0.5 / cw) * e; m.scale.z = 1 + 2.2 * e; m.visible = c.open < 0.995; } } }
  };
  world.probe = (x, y, z) => { const r = world.rooms[roomAt(x, y, z) || 'lobby']; return r ? r.lights.probe(x, y, z) : null; };
  if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (e) { /* the pictures fall back to system type */ } }
  world.street = dressStreet(world);   // v12: the far side's windows, shop signs and interiors, halos, the night sky (before the reflections are taken)
  onProgress(0.9, 'reflections'); await texturesReady(); await frame(); captureReflections(world, engine); world.captureReflections = () => captureReflections(world, engine);
  world.setVisibility('lobby', 0, 0, 8, true); for (const h of world.halls) { const w = h.cfg.toWorld(0, h.cfg.depthIn); h.updateLOD({ position: { x: w.x, z: w.z } }, true); }
  onProgress(1, 'ready');
  return world;
}
