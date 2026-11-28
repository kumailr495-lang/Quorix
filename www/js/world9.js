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
import { HALL, L1, ROOMS, DOORS, ESC, escProfile, LIFT, GALLERY, TRAVELATOR, GATE, LOBBY, MEZZ, SPINE, BRIDGE, FLANK_W, LINK_W, PANTRY, FLANK_E, LINK_E, WC, STREET, EXIT_PASSAGES, CORE, COUNTERS , PRIVATE, VIP as LOUNGE } from './building.js';
import { hallSeats, hallFloor, vipFloor, SEAT, SCREEN_GAP, WALL } from './hallmath.js';
import { vipDress } from './vip.js';
import { privateDress, PV_PANELS } from './private.js';
import { ASSETS, assetGeometry, placeAsset } from './assets.js';
import { texturesReady, named, LEAF_IDS } from './library.js';
import { makeCanvas, SANS, SERIF, readerBoard } from './textures.js';
import { leafAtlas } from './foliage.js';
import { posterURL, filmById } from './films.js';
import { Lift } from './lift9.js';
const frame = () => new Promise((r) => requestAnimationFrame(() => r()));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), IN = (r, x, z, m = 0) => x >= r.x0 - m && x <= r.x1 + m && z >= r.z0 - m && z <= r.z1 + m;
const b64f = (s) => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return new Float32Array(u.buffer); };
export const BORNES = [-36.0, -15.5, 26.5], BORNE_Z = -20.4;   // v14 the corridor's round banquettes (x along the bridge, z)
const HALLS = Object.values(HALL), HALL_BY_KEY = Object.fromEntries(HALLS.map((h) => [h.key, h])), CORR = [BRIDGE, FLANK_W, LINK_W, PANTRY, FLANK_E, LINK_E];
export const STEP_UP = 0.4, HEAD = 1.75;
// target average light level per room with its house lights up (docs/V9-DESIGN.md section 5: bright spine, dim Dolby corridor)
// ambient fill on top of the light map (dims with the house lights): the dim corridor's dark walls stay readable, the night street too
// v14 (the user, 11-20: "increase a bit of light bounce and the lights to be more dim"): the halls' lamps dimmer (LEVEL) with a soft fill
// lifting the shadows and a softer curve (SOFT), so the light reads as bounced round the room rather than pooled under each lamp
const FILL = { corridor: 0.42, street: 0.03, hallMax: 0.035, hallCurve: 0.035, hallClassic: 0.04, hall270: 0.035 };
// v10 softer light per room (materials.js uSoft): how much of the soft curve each room takes; halls less (their dark is the point)
const SOFT = { lobby: 0.85, corridor: 0.8, spine: 0.75, wc: 0.75, street: 0.6, hallMax: 0.8, hallCurve: 0.8, hallClassic: 0.8, hall270: 0.8 };
// v12c where the lobby's living props stand (anim12.js puts its particles in the same frames): [x, y, z, yaw]
export const LIFE = {
  kettles: [[-21.30, 0.96, -7.55, Math.PI / 2], [-21.30, 0.96, -6.65, Math.PI / 2]],   // tools/blender/zones12.py popcorn_kettle, on the parlour's back counter
  espresso: [-21.12, 0.96, -12.3, Math.PI / 2],   // zones12.py espresso_lever, its back 3.4 cm under the bottle shelves' ends, 4.4 cm under their lips
  fountain: [0, 0, 10.0, 0],   // statue12.py fountain_muse
};
export const LEVEL = { vip: 0.62, pvHome: 0.5, pvJungle: 0.42, pvWinter: 0.5, pvSpace: 0.4, pvDrive: 0.34, hallMax: 0.4, hallCurve: 0.4, hallClassic: 0.44, hall270: 0.4, lobby: 0.42, corridor: 0.22, spine: 0.8, wc: 0.55, street: 0.15 };   // v12 street: 0.25 read black with no fill, 0.3 with a strong fill an evening; midnight is a low fill, darker fronts and 0.15
function scaleLights(L, k) { const A = L.L; for (let i = 0; i < A.length; i += 14) { A[i + 3] *= A[i + 7] ? Math.min(k, 10) : k; A[i + 4] *= A[i + 7] ? Math.min(k, 10) : k; A[i + 5] *= A[i + 7] ? Math.min(k, 10) : k; }
  for (const ch of ['h', 'f']) for (const s of ['up', 'down']) L.amb[ch][s] = L.amb[ch][s].map((v) => v * (ch === 'h' ? k : Math.min(k, 10))); }   // a face lower than STEP_UP above your feet is a step you walk over; above HEAD it is overhead

// ---------------------------------------------------------------- where am I: room, floor height (y = where your feet are now)
const PV_BY_KEY = Object.fromEntries(PRIVATE.map((p) => [p.key, p]));
export function roomAt(x, y, z) {
  // a hall owns its screen and rear walls' thickness too: the exit and entry doors stand in them (v9 route test: the floor dropped there)
  for (const h of HALLS) { const q = h.toLocal(x, z); if (Math.abs(q.u) <= h.width / 2 + 0.05 && q.d >= -SCREEN_GAP - WALL && q.d <= h.depthIn + WALL) return h.key; }
  if (y > L1 - 1.2) for (const r of CORR) if (IN(r, x, z)) return 'corridor';
  if (IN(SPINE, x, z) && z < SPINE.z1 - 0.02) return 'spine';
  for (const p of EXIT_PASSAGES) if (IN(p, x, z, WALL + 0.05) && y < p.ceil) return 'spine';   // v12b the exit passages (and their doors' thresholds in the halls' walls) belong to the spine (before the corridor's ground-floor fallback: two run under the bridge)
  if (IN(LOBBY, x, z)) return 'lobby';
  if (x > 150) { if (IN(LOUNGE, x, z, 0.05)) return 'vip'; for (const p of PRIVATE) if (IN(p, x, z, 0.05)) return p.key; }   // v14e the private floor (private.js)
  if (IN(WC, x, z)) return 'wc';
  if (IN(STREET, x, z, 0.5)) return 'street';
  if (x > STREET.x0 - 6.5 && x < STREET.x1 + 6.5 && z > STREET.z0 - 0.5 && z < STREET.far + 0.5) return 'street';   // v12: the street's ends, up to the blocks across them
  for (const r of CORR) if (IN(r, x, z)) return 'corridor';
  return null;
}
// v11: the lift stands in front of the mezzanine, beside the escalators; on the first floor a gallery joins its rear door to the mezzanine
const CAB = { x0: LIFT.x0, x1: LIFT.x1, z0: LIFT.z0 - 0.01, z1: LIFT.z1 + 0.01 };
const onMezz = (x, z) => (z >= MEZZ.z0 && z <= MEZZ.z1 && !IN(MEZZ.void, x, z)) || IN(GALLERY, x, z);
// v12b the exit passages' floors: level with the hall at its door, a flight down towards the spine along the hall's wall, then ground level
function stairY(x, z, y) {
  for (const p of EXIT_PASSAGES) {
    if (!IN(p, x, z, WALL + 0.05)) continue;
    for (const f of p.flights) {   // a flight reaches on through its hall's wall to the door (the threshold is level with the landing)
      if (z < f.z0 - (f.zWall === f.z0 ? WALL + 0.05 : 0.02) || z > f.z1 + (f.zWall === f.z1 ? WALL + 0.05 : 0.02)) continue;
      const t = (x - f.xTop) * f.dir;   // metres down the flight from its top edge (negative: on the landing at the door)
      if (t < 0) { if (y > f.y0 - 0.8) return f.y0; continue; }
      if (f.n && t < f.n * f.tread) { const ys = f.y0 - (Math.floor(t / f.tread) + 1) * f.rise; if (y > ys - 0.8) return ys; }
    }
    return 0;
  }
  return null;
}
// ---------------------------------------------------------------- collision: wall segments in 2 m buckets, each with its height range
class Walls {
  constructor() { this.S = []; this.K = []; this.B = new Map(); }
  off(i0, i1) { for (let i = i0; i < i1; i++) { this.S[6 * i + 4] = -1e4; this.S[6 * i + 5] = -1e4 + 0.01; } }   // v14 retire segments (home.js rebuilds its furniture's)
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
// v14 the scanned plants' alpha-tested leaves (library.js LEAF_IDS) out of a room's prop mesh into their own (materials.js leafRoom)
export function splitIds(geo, ids) {
  const mid = geo.attributes.matid; if (!mid || !geo.index || !ids.size) return null; const I = geo.index.array, keep = [], out = [];
  for (let t = 0; t < I.length; t += 3) (ids.has(Math.round(mid.getX(I[t]))) ? out : keep).push(I[t], I[t + 1], I[t + 2]);
  if (!out.length) return null; geo.clearGroups(); geo.setIndex(keep);
  const g = new THREE.BufferGeometry(); for (const [k, v] of Object.entries(geo.attributes)) g.setAttribute(k, v); g.setIndex(out); return g;
}
export function splitGlass(geo) {
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
    this.from = d.from ?? (d.hall ? -HALL[d.hall].dir : d.oneWay === 'spine' ? -1 : 0); this.reach = d.kind === 'slide' ? 2.8 : 2.2;   // v12b the side exits say which side they open from
    this.group = new THREE.Group(); this.group.position.set(d.x, this.y, d.z); this.group.rotation.y = d.axis === 'x' ? 0 : Math.PI / 2; this.group.updateMatrixWorld(true);
    if (d.kind === 'open') return;
    const room = world.rooms[d.oneWay && world.rooms[d.oneWay] ? d.oneWay : d.rooms[0]] || world.rooms[d.rooms[1]], half = d.w / 2, into = d.swing ?? -(this.from || 1); this.into = into;
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
    if (this.locked) want = false;   // v14e a private screen's doors until you rent it
    const t = want ? 1 : 0; if (t !== this.target) { this.target = t; this.onToggle && this.onToggle(t, this); }
    this.open += (this.target - this.open) * (1 - Math.exp(-dt * (this.target ? (this.kind === 'slide' ? 5 : 4) : 2.4)));
    if (this.kind === 'slide') { const off = this.open * (this.w / 2 - 0.08); this.leaves[0].m.position.x = -this.w / 2 - off; this.leaves[1].m.position.x = this.w / 2 + off; this.glass[0].position.x = -this.w / 4 - off; this.glass[1].position.x = this.w / 4 + off; }
    else { const e = this.open * this.open * (3 - 2 * this.open), ang = e * 1.55, into = this.into ?? -(this.from || 1); for (const L of this.leaves) L.m.rotation.y = L.s * into * ang; }
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
    // v14e (the user, 11-27: "the escalators ... their starting point is glitched"): a step's tread runs 0.38 m ahead of its nose, so it was
    // still in sight when it dropped 6 cm at each comb plate. The steps now keep the landing's height under the plates (the plate hides them)
    for (let i = 0; i < this.n; i++) { const s = 0.8 + ((i * 0.4 + this.phase) % L), y = this.ramp(s + 0.4) + 0.012;
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
const DENSE = { zone: 300, roundel: 900, seatplan: 900, kettlehead: 1280, cafemenu: 320, cafesign: 256, picto: 256, art: 640, wayfind: 192, kiosk: 640, plaque: 1280, photowall: 640, vintage: 512, attraction: 150 };   // canvas pixels per metre for boards with text or fine figures
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
export const PANEL_DRAW = { ...PV_PANELS,
  // v14 the flat's window (home14.py: 28 m out, 97 x 40 m): the street from the Astor's third floor, the cinema across the road. The picture
  // is the engine's own render (tools/dev/homeview.mjs); till it loads, a night sky over dark roofs with lit windows
  homeview: (g, w, h) => { const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#05070d'); sky.addColorStop(0.55, '#0c1220'); sky.addColorStop(1, '#151018'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
    let r = 7; const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647); g.fillStyle = '#07080c';
    for (let x = 0; x < w;) { const bw = 40 + rnd() * 120, bh = h * (0.18 + rnd() * 0.3); g.fillRect(x, h * 0.62 - bh, bw, bh + h); for (let k = 0; k < 14; k++) { if (rnd() < 0.45) continue; g.fillStyle = rnd() < 0.7 ? '#ffcf8a' : '#9fc1ff'; g.globalAlpha = 0.35 + rnd() * 0.5; g.fillRect(x + 4 + rnd() * (bw - 10), h * 0.62 - bh + 6 + rnd() * bh * 0.9, 4, 6); g.globalAlpha = 1; g.fillStyle = '#07080c'; } x += bw + 4; }
    const im = new Image(); im.onload = () => { g.drawImage(im, 0, 0, w, h); if (g.canvas.__tex) g.canvas.__tex.needsUpdate = true; }; /* v14d the Suite looks out over the city: the drawn skyline only (the old render showed the cinema from across the road) */ void im; },
  // v14 the home cinema's screen while nothing plays (home.js puts a film's video on it)
  homescreen: (g, w, h) => { const gr = g.createRadialGradient(w / 2, h * 0.45, 10, w / 2, h / 2, w * 0.7); gr.addColorStop(0, '#1d1828'); gr.addColorStop(1, '#060608'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#e8c27a'; g.font = `500 ${h * 0.14}px ${SERIF}`; if ('letterSpacing' in g) g.letterSpacing = `${h * 0.03}px`; g.fillText('LUMIÈRE', w / 2, h * 0.42); if ('letterSpacing' in g) g.letterSpacing = '0px';
    g.fillStyle = '#b9ab95'; g.font = `500 ${h * 0.055}px ${SANS}`; if ('letterSpacing' in g) g.letterSpacing = `${h * 0.012}px`; g.fillText('HOME CINEMA', w / 2, h * 0.58); if ('letterSpacing' in g) g.letterSpacing = '0px'; },
  // v12c the cabinet poppers' headers (zones12.py popcorn_kettle): POPCORN in red on cream, a red rule above and below
  kettlehead: (g, w, h) => { g.fillStyle = '#efe4c8'; g.fillRect(0, 0, w, h); g.fillStyle = '#a3141e'; g.fillRect(0, h * 0.06, w, h * 0.07); g.fillRect(0, h * 0.87, w, h * 0.07);
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `700 ${h * 0.62}px ${SERIF}`; if ('letterSpacing' in g) g.letterSpacing = `${h * 0.12}px`; g.fillText('POPCORN', w / 2, h * 0.53); if ('letterSpacing' in g) g.letterSpacing = '0px'; },
  // v12 the heritage corner's two posters: original 1950s-style cinema bills (no real film, no real studio)
  // v12 the bills' lines keep inside their gold border (g.__fit, textures.js)
  vintage: (g, w, h, id) => { const b = /_b$/.test(id); g.__fit = [w * 0.07, w * 0.93]; const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, b ? '#2a1a12' : '#0e1a2c'); bg.addColorStop(1, b ? '#120a06' : '#05080f'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.textAlign = 'center'; g.textBaseline = 'middle'; const ls = (v) => { if ('letterSpacing' in g) g.letterSpacing = v; };
    if (!b) { const beam = g.createLinearGradient(w / 2, h * 0.18, w / 2, h * 0.7); beam.addColorStop(0, 'rgba(255,224,160,0.85)'); beam.addColorStop(1, 'rgba(255,224,160,0)'); g.fillStyle = beam; g.beginPath(); g.moveTo(w * 0.47, h * 0.2); g.lineTo(w * 0.53, h * 0.2); g.lineTo(w * 0.85, h * 0.68); g.lineTo(w * 0.15, h * 0.68); g.closePath(); g.fill();
      for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(255,240,210,0.7)'; g.fillRect((i * 97) % w, (i * 53) % (h * 0.16), 2, 2); }
      g.fillStyle = '#d8b46a'; g.font = `600 ${h * 0.05}px ${SERIF}`; ls(`${h * 0.012}px`); g.fillText('LUMIÈRE PRESENTS', w / 2, h * 0.76); ls('0px'); g.fillStyle = '#f2ebdd'; g.font = `700 ${h * 0.085}px ${SERIF}`; g.fillText('The Midnight Show', w / 2, h * 0.85); g.font = `500 ${h * 0.028}px ${SANS}`; g.fillStyle = '#b8a07a'; g.fillText('IN GLORIOUS 35 MM', w / 2, h * 0.93); }
    else { g.fillStyle = '#c9a35e'; for (let i = 0; i < 9; i++) { const y = h * (0.12 + i * 0.065); g.fillRect(w * 0.12, y, w * 0.05, h * 0.03); g.fillRect(w * 0.83, y, w * 0.05, h * 0.03); }
      g.strokeStyle = '#c9a35e'; g.lineWidth = Math.max(2, w * 0.008); g.strokeRect(w * 0.2, h * 0.1, w * 0.6, h * 0.58); g.fillStyle = 'rgba(201,163,94,0.15)'; g.fillRect(w * 0.2, h * 0.1, w * 0.6, h * 0.58);
      g.fillStyle = '#f2ebdd'; g.font = `700 ${h * 0.14}px ${SERIF}`; g.fillText('1952', w / 2, h * 0.39); g.fillStyle = '#d8b46a'; g.font = `600 ${h * 0.05}px ${SERIF}`; ls(`${h * 0.01}px`); g.fillText('A HOUSE OF PICTURES', w / 2, h * 0.79); ls('0px'); g.font = `500 ${h * 0.03}px ${SANS}`; g.fillStyle = '#b8a07a'; g.fillText('SINCE THE FIRST REEL', w / 2, h * 0.87); }
    g.strokeStyle = 'rgba(216,180,106,0.6)'; g.lineWidth = Math.max(2, h * 0.005); g.strokeRect(h * 0.015, h * 0.015, w - h * 0.03, h - h * 0.03); g.__fit = null; },
  // v12 the projector's caption on its plinth: engraved lettering on brushed brass
  plaque: (g, w, h, id) => { const bg = g.createLinearGradient(0, 0, w, h); bg.addColorStop(0, '#b8914f'); bg.addColorStop(0.5, '#d9b878'); bg.addColorStop(1, '#a8803f'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.globalAlpha = 0.08; g.fillStyle = '#000'; for (let y = 0; y < h; y += 2) g.fillRect(0, y, w, 1); g.globalAlpha = 1; g.textAlign = 'center'; g.textBaseline = 'middle'; const ls = (v) => { if ('letterSpacing' in g) g.letterSpacing = v; };
    const T = id === 'plaque_muse' ? ['THALIA · MUSE OF COMEDY', 'From the Royal Cast Collection · SMK, Copenhagen'] : ['35 MM PROJECTOR · 1952', 'It ran in this house until the last reel of 1998'];
    g.fillStyle = '#2a1d0c'; g.font = `700 ${h * 0.20}px ${SERIF}`; ls(`${h * 0.03}px`); g.fillText(T[0], w / 2, h * 0.38); ls('0px');
    g.fillStyle = '#3b2a12'; g.font = `500 ${h * 0.17}px ${SERIF}`; g.fillText(T[1], w / 2, h * 0.72); },
  // v12 the photo spot's step-and-repeat: the wordmark and a star in gold on deep navy, offset row by row, a soft light in the middle
  photowall: (g, w, h) => { const bg = g.createRadialGradient(w / 2, h * 0.45, 0, w / 2, h * 0.45, w * 0.7); bg.addColorStop(0, '#1a2a52'); bg.addColorStop(1, '#0a1128'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
    // five whole marks a row, the wordmark and the star swapping places row by row (the user: no word cut off at the edges)
    g.textAlign = 'center'; g.textBaseline = 'middle'; const rows = 6, rh = h / rows;
    for (let r = 0; r < rows; r++) for (let c = 0; c < 5; c++) { const x = (c + 1) * w / 6, y = (r + 0.5) * rh;
      if ((r + c) % 2 === 0) { g.fillStyle = '#d8b46a'; g.font = `600 ${rh * 0.26}px ${SERIF}`; if ('letterSpacing' in g) g.letterSpacing = `${rh * 0.05}px`; g.fillText('LUMIÈRE', x, y); if ('letterSpacing' in g) g.letterSpacing = '0px'; }
      else { g.fillStyle = '#b8954f'; g.font = `400 ${rh * 0.34}px ${SERIF}`; g.fillText('✦', x, y); } }
    g.strokeStyle = 'rgba(216,180,106,0.5)'; g.lineWidth = Math.max(2, h * 0.006); g.strokeRect(h * 0.02, h * 0.02, w - h * 0.04, h - h * 0.04); },
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
  // v13 the zones' names (the user: "make the reception and the areas separated and much more defined"): lit letters on black in each
  // zone's own voice: the ticket bay plain and bright, the popcorn bay a bulb marquee, the bar brass serif
  zone: (g, w, h, id) => { const k = id.split('_')[1], ls = (v) => { if ('letterSpacing' in g) g.letterSpacing = v; }; g.fillStyle = '#060607'; g.fillRect(0, 0, w, h); g.textAlign = 'center'; g.textBaseline = 'middle';
    if (k === 'popcorn') { const r = h * 0.032, step = h * 0.11; g.fillStyle = '#ffd98a';
      for (let x = step / 2; x < w; x += step) { for (const y of [h * 0.07, h * 0.93]) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); } }
      for (let y = h * 0.07 + step; y < h * 0.93 - step / 2; y += step) for (const x of [h * 0.07, w - h * 0.07]) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#f6ecd8'; g.font = `800 ${h * 0.46}px ${SANS}`; ls(`${h * 0.06}px`); g.fillText('POPCORN', w / 2, h * 0.44); ls('0px');
      g.fillStyle = '#e0b25a'; g.font = `600 ${h * 0.12}px ${SANS}`; ls(`${h * 0.04}px`); g.fillText('SNACKS  ·  DRINKS  ·  SWEETS', w / 2, h * 0.75); ls('0px'); return; }
    if (k === 'bar') { g.fillStyle = '#e0b25a'; g.font = `500 ${h * 0.56}px ${SERIF}`; ls(`${h * 0.08}px`); g.fillText('BAR · CAFÉ', w / 2, h * 0.47); ls('0px');
      g.fillStyle = '#9a8f7c'; g.font = `500 ${h * 0.13}px ${SANS}`; ls(`${h * 0.03}px`); g.fillText('COFFEE  ·  COCKTAILS  ·  DESSERTS', w / 2, h * 0.86); ls('0px'); return; }
    const big = k === 'tickets' ? 'TICKETS' : 'SELF CHECK-IN', sub = k === 'tickets' ? 'BOX OFFICE  ·  TONIGHT\'S SHOWS' : 'CARD  ·  UPI  ·  WALLET';
    g.fillStyle = '#f6f1e6'; g.font = `700 ${h * (k === 'tickets' ? 0.5 : 0.36)}px ${SANS}`; ls(`${h * 0.1}px`); g.fillText(big, w / 2, h * 0.42); ls('0px');
    g.fillStyle = '#e0b25a'; g.fillRect(w * 0.5 - h * 1.2, h * 0.71, h * 2.4, Math.max(1, h * 0.012)); g.font = `600 ${h * 0.13}px ${SANS}`; ls(`${h * 0.04}px`); g.fillText(sub, w / 2, h * 0.85); ls('0px'); },
  // v13 (the user's corridor photo) a blade roundel's face: the hall's number in gold inside a thin gold ring, on the disc's black
  roundel: (g, w, h, id) => { const H_ = HALL[id.split('_')[1]]; g.fillStyle = '#0b0b0c'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#c9a35e'; g.lineWidth = w * 0.025; g.beginPath(); g.arc(w / 2, h / 2, w * 0.44, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#e3b25f'; g.font = `500 ${h * 0.62}px ${SERIF}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(H_ ? String(H_.no) : '', w / 2, h * 0.54); },
  // v13 the hall's seat plan beside its door (hallmath.js hallSeats: the real seats, rows lettered, premium rows in gold, the screen on top)
  seatplan: (g, w, h, id) => { const H_ = HALL[id.split('_')[1]]; g.fillStyle = '#0d0d10'; g.fillRect(0, 0, w, h); if (!H_) return;
    const S_ = hallSeats(H_), m = w * 0.1, top = h * 0.24, bot = h * 0.86; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#e3b25f'; g.font = `500 ${h * 0.05}px ${SERIF}`; g.fillText(`${H_.no}  ·  ${H_.name.replace('LUMIERE ', '')}`, w / 2, h * 0.07);
    g.fillStyle = '#9a917f'; g.font = `600 ${h * 0.022}px ${SANS}`; if ('letterSpacing' in g) g.letterSpacing = `${h * 0.006}px`; g.fillText('SEATING PLAN', w / 2, h * 0.115); if ('letterSpacing' in g) g.letterSpacing = '0px';
    g.strokeStyle = '#f2ebdd'; g.lineWidth = h * 0.008; g.beginPath(); g.moveTo(m * 1.4, h * 0.165); g.quadraticCurveTo(w / 2, h * 0.145, w - m * 1.4, h * 0.165); g.stroke();
    g.fillStyle = '#f2ebdd'; g.font = `600 ${h * 0.018}px ${SANS}`; g.fillText('SCREEN', w / 2, h * 0.19);
    let u0 = Infinity, u1 = -Infinity, d0 = Infinity, d1 = -Infinity, p0 = Infinity; for (const s of S_) { u0 = Math.min(u0, s.u); u1 = Math.max(u1, s.u); d0 = Math.min(d0, s.d); d1 = Math.max(d1, s.d); p0 = Math.min(p0, s.price); }
    const k = Math.min((w - 2 * m) / Math.max(u1 - u0, 1), (bot - top) / Math.max(d1 - d0, 1)), cx = w / 2 - (u0 + u1) / 2 * k, cy = top + (bot - top) / 2 - (d0 + d1) / 2 * k, r = Math.max(2, k * 0.26);
    const rowY = {}; for (const s of S_) { const x = cx + s.u * k, y = cy + s.d * k; rowY[s.row] = [y, s.id.replace(/\d+$/, '')];
      g.fillStyle = s.price > p0 ? '#d4a656' : '#6f6a62'; g.beginPath(); g.roundRect ? g.roundRect(x - r, y - r, 2 * r, 2 * r, r * 0.35) : g.rect(x - r, y - r, 2 * r, 2 * r); g.fill(); }
    g.fillStyle = '#9a917f'; g.font = `600 ${Math.min(h * 0.02, k * 0.5)}px ${SANS}`; for (const [y, L_] of Object.values(rowY)) { g.fillText(L_, m * 0.45, y); g.fillText(L_, w - m * 0.45, y); }
    g.font = `500 ${h * 0.02}px ${SANS}`; g.textAlign = 'left'; g.fillStyle = '#d4a656'; g.fillRect(m, h * 0.925, h * 0.02, h * 0.02); g.fillStyle = '#cfc8ba'; g.fillText('PREMIUM', m + h * 0.03, h * 0.936);
    g.fillStyle = '#6f6a62'; g.fillRect(w / 2, h * 0.925, h * 0.02, h * 0.02); g.fillStyle = '#cfc8ba'; g.fillText('STANDARD', w / 2 + h * 0.03, h * 0.936); },
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
  wayfind: (g, w, h, id) => { const k = id.split('_')[1]; if (k === 'zone') { zoneSign(g, w, h); return; } const T = { screens: ['SCREENS 1 – 4', '↑', 'MAX  ·  CURVE  ·  CLASSIC  ·  X·270'], wc: ['RESTROOMS', '', ''], wcf: ['WOMEN', '', ''], wcm: ['MEN', '', ''], tickets: ['TICKETS', '', 'BOX OFFICE'], food: ['FOOD & DRINKS', '', 'POPCORN  ·  NACHOS  ·  COFFEE'], out: ['WAY OUT', '↓', 'LOBBY  ·  RESTROOMS  ·  CAFÉ'] }[k] || [k.toUpperCase(), '', ''];
    g.fillStyle = '#121427'; g.fillRect(0, 0, w, h); g.fillStyle = '#e3b25f'; g.fillRect(0, h * 0.92, w, h * 0.08); g.fillStyle = '#f4efe6'; g.textBaseline = 'middle';
    let x = h * 0.35; if (k === 'wcf' || k === 'wcm') { const dress = k === 'wcf', cx = x + h * 0.12; g.beginPath(); g.arc(cx, h * 0.24, h * 0.09, 0, Math.PI * 2); g.fill();
      if (dress) { g.beginPath(); g.moveTo(cx - h * 0.15, h * 0.72); g.lineTo(cx + h * 0.15, h * 0.72); g.lineTo(cx, h * 0.36); g.fill(); g.fillRect(cx - h * 0.06, h * 0.7, h * 0.04, h * 0.14); g.fillRect(cx + h * 0.02, h * 0.7, h * 0.04, h * 0.14); } else { g.fillRect(cx - h * 0.08, h * 0.36, h * 0.16, h * 0.34); g.fillRect(cx - h * 0.08, h * 0.68, h * 0.06, h * 0.18); g.fillRect(cx + h * 0.02, h * 0.68, h * 0.06, h * 0.18); }
      x += h * 0.55; } else if (k === 'wc') { const fig = (cx, dress) => { g.beginPath(); g.arc(cx, h * 0.24, h * 0.09, 0, Math.PI * 2); g.fill(); if (dress) { g.beginPath(); g.moveTo(cx - h * 0.15, h * 0.72); g.lineTo(cx + h * 0.15, h * 0.72); g.lineTo(cx, h * 0.36); g.fill(); g.fillRect(cx - h * 0.06, h * 0.7, h * 0.04, h * 0.14); g.fillRect(cx + h * 0.02, h * 0.7, h * 0.04, h * 0.14); } else { g.fillRect(cx - h * 0.09, h * 0.36, h * 0.18, h * 0.3); g.fillRect(cx - h * 0.09, h * 0.62, h * 0.07, h * 0.24); g.fillRect(cx + h * 0.02, h * 0.62, h * 0.07, h * 0.24); } };
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
  // v12 (the user: "paintings"): public-domain masterpieces from the Art Institute of Chicago (CC0 images, docs/LICENSES.md), each panel
  // at its painting's own proportions so nothing is cropped; drawn when the picture arrives (a dark ground until then)
  art: (g, w, h, id) => { const A = ARTWORK[id.replace(/_h$/, '')]; g.fillStyle = '#16120e'; g.fillRect(0, 0, w, h); if (!A) return;
    const im = new Image(); im.onload = () => { g.drawImage(im, 0, 0, w, h); if (g.canvas.__tex) g.canvas.__tex.needsUpdate = true; }; im.src = 'art/' + A[0] + '.jpg'; },
  // v10 the cafe's menu board and its name over it (rooms.py places them on the walnut wall)
  cafemenu: (g, w, h) => { g.fillStyle = '#16110d'; g.fillRect(0, 0, w, h); g.strokeStyle = '#c9a35e'; g.lineWidth = Math.max(2, h * 0.012); g.strokeRect(h * 0.05, h * 0.05, w - h * 0.1, h - h * 0.1);
    const cols = [['COFFEE', [['Espresso', 160], ['Americano', 190], ['Cappuccino', 210], ['Café latte', 220], ['Mocha', 240]]], ['TEA & MORE', [['Masala chai', 150], ['Iced tea', 180], ['Hot chocolate', 220], ['Cold coffee', 230]]], ['SWEETS', [['Cheesecake', 260], ['Brownie', 180], ['Croissant', 160], ['Blueberry muffin', 170]]]];
    g.textBaseline = 'middle'; cols.forEach(([head, items], c) => { const x0 = w * (0.05 + c * 0.315), x1 = x0 + w * 0.27; g.fillStyle = '#e3b25f'; g.font = `600 ${h * 0.12}px ${SANS}`; g.textAlign = 'left'; g.fillText(head, x0, h * 0.2);
      g.font = `400 ${h * 0.09}px ${SANS}`; items.forEach(([nm, pr], i) => { const y = h * (0.37 + i * 0.13); g.fillStyle = '#f2ebdd'; g.textAlign = 'left'; g.fillText(nm, x0, y); g.textAlign = 'right'; g.fillStyle = '#e3b25f'; g.fillText(pr + ' LC', x1, y); }); }); },
  cafesign: (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#1d140d'); gr.addColorStop(1, '#0d0906'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#e8c27a'; g.font = `500 ${h * 0.52}px ${SERIF}`; g.textAlign = 'center'; g.textBaseline = 'middle'; if ('letterSpacing' in g) g.letterSpacing = `${h * 0.12}px`; g.fillText('CAFÉ LUMIÈRE', w / 2, h * 0.5); if ('letterSpacing' in g) g.letterSpacing = '0px'; g.fillRect(w * 0.28, h * 0.86, w * 0.44, Math.max(2, h * 0.025)); },
  // v12 the marquee's boards; the front is redrawn with tonight's films by panels9.js attraction()
  attraction: (g, w, h, id) => readerBoard(g, w, h, id === 'attraction_f' ? ['SINTEL · COSMOS LAUNDROMAT · BIG BUCK BUNNY · HERO', 'MAX · CURVE · CLASSIC · 270'] : id === 'attraction_w' ? ['NOW SHOWING', 'FOUR SCREENS'] : ['LATE SHOWS', 'EVERY NIGHT']),
  arrival: (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#120d24'); gr.addColorStop(1, '#2a1640'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#e3b25f'; g.font = `600 ${h * 0.14}px ${SANS}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('SCREENS 1 – 4', w / 2, h * 0.42); g.fillStyle = 'rgba(242,235,221,.8)'; g.font = `400 ${h * 0.07}px ${SANS}`; g.fillText('MAX  ·  CURVE  ←      CLASSIC  ·  270  →', w / 2, h * 0.62); },
};
// ---------------------------------------------------------------- props: the furniture of each room (Kiln / Blender assets), lit per vertex
// v12 where no guest stands: inside the heritage exhibit's rope, on the photo set (npc9.js millNet reads world.keepOut)
const KEEP_OUT = [[CORE.x0 - 2.3, -4.2, CORE.x0, -1.8], [-8.9, -5.9, -5.1, -4.1], [LOUNGE.lobbyPod.x - 1.7, LOUNGE.lobbyPod.z - 1.7, LOUNGE.lobbyPod.x + 1.7, LOUNGE.lobbyPod.z + 1.7]];   // v14e the private lift
// v13 the lobby's ceiling (tools/blender/arch/lobby12.py FIELD_DROP and STEP): the dropped field 0.75 m under the roof, the halo's dome two 0.32 m steps above it
const LOBBY_FIELD = LOBBY.ceil - 0.75, LOBBY_DOME = LOBBY.ceil - 0.75 + 2 * 0.32;
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
  // v12 (the user: "the curved seats are not placed rightly"): the sofas' origins stood on a 2.4 m circle but each arc is 2.0 m round its own
  // centre, so the four arcs curved round four points 0.4 m past the table and read as scattered pieces. Now three sofas sit on the table's
  // own 2.0 m circle (seat fronts on it, square to the axes) in a C open to the lobby (west), two boucle chairs close the C facing the
  // table, and the table is half again as wide for a 4 m circle
  // v14 (the user, 11-20: "every single model extra high quality, GTA 5-6 level"): the lounge in CC0 photoscanned leather (Poly Haven, built by
  // tools/blender/scans14.py): two black chesterfields face each other across a marble-and-chrome table, a leather armchair at each end
  add('lobby', 'scan_concrete_table', LX, 0, LZ, Math.PI / 2, { deep: true });   // v14 concrete and oak, long side to the sofas (the round scan's base has a 4 mm layer that fought from the street)
  add('lobby', 'scan_chesterfield', LX, 0, LZ - 1.62, 0); add('lobby', 'scan_chesterfield', LX, 0, LZ + 1.62, Math.PI);
  add('lobby', 'scan_armchair', LX - 1.8, 0, LZ, Math.PI / 2); add('lobby', 'scan_armchair', LX + 1.8, 0, LZ, -Math.PI / 2);
  for (const [x, z] of [[-8, 16.4], [8, 16.4], [-20.85, -13.55], [20.9, 9.5], [-6.5, -12.9], [6.5, -12.9]]) add('lobby', 'planter_tall', x, 0, z);
  // v12 (the user: "trees inside like a medieval tree"): an old olive tree in a travertine bowl in each front corner, by the glass (seen
  // from the street too); they replace the corner palms
  for (const x of [-20.5, 16.2]) add('lobby', 'olive_tree', x, 0, 16.0, x < 0 ? 0.6 : 2.4, { collide: false, round: 0.8 });   // v14e the east one 4.3 m in: the private lift stands in that corner (private.js)
  for (const [x, yaw] of [[-6.0, 0.35], [6.0, -0.35]]) add('lobby', 'poster_totem', x, 0, 16.3, yaw);   // v10: out of the fountain court; v11 its posters: TOTEM_POSTERS
  // the box-office queue: two rope lines guiding you to the counter
  const posts = []; for (const x of [-14.4, -13.0]) for (let z = 5.6; z <= 12.6; z += 1.75) { add('lobby', 'stanchion', x, 0, z); posts.push([x, z]); }
  for (const x of [-14.4, -13.0]) for (let z = 5.6; z < 12.5; z += 1.75) add('lobby', 'rope_velvet', x, 0, z + 0.875, Math.PI / 2, { collide: 0.02 });
  // v12c (the user: "make reception and bar and popcorn area like dedicated areas", "make them better 3d detailed and animations"): the
  // parlour's back counter (rooms.py: 0.75 m deep in front of the wall's face at x -21.6; the old machines stood half inside the wall)
  // carries two cabinet poppers, two soda towers and stacks of tubs (tools/blender/zones12.py); the front counter two heated cases and two
  // tills; the ticket desk four tills; the candy wall stands in its own bay at the back counter's north end
  for (const k of LIFE.kettles) add('lobby', 'popcorn_kettle', k[0], k[1], k[2], k[3], { collide: false, ground: false });
  for (const z of [-4.6, -3.75]) add('lobby', 'drinks_tower', -21.30, 0.96, z, Math.PI / 2, { collide: false, ground: false });
  for (const z of [-8.65, -8.38, -5.7, -5.43]) add('lobby', 'tub_stack', -21.42, 0.96, z, 0, { collide: false, ground: false });
  for (const z of [-7.3, -1.9]) add('lobby', 'popcorn_case', -17.15, 1.0, z, Math.PI / 2, { collide: false, ground: false });
  for (const z of [-5.0, -0.3]) add('lobby', 'till_pos', -17.2, 1.0, z, Math.PI / 2, { collide: false, ground: false });   // their screens face the staff
  for (const z of [5.6, 7.6, 9.6, 11.6]) add('lobby', 'till_pos', -17.0, 1.06, z, Math.PI / 2, { collide: false, ground: false });
  add('lobby', 'candy_wall', -21.42, 0, 0.0, Math.PI / 2);   // 1 cm off the wall's face
  // v14 (the user: "bins are not placed on random places"; cinemas and food courts put them where people leave with something to throw
  // away: the ends of the counters, the exits, the restroom doors): each stands against a wall or a fin, out of every walking line
  for (const [x, z] of [[-15.9, 0.66], [-8.4, -13.72], [CORE.x0 - 0.25, 1.0], [-2.75, -13.72], [2.75, -13.72]]) add('lobby', 'bin_brass', x, 0, z);
  add('lobby', 'bench_velvet', 21.25, 0, 5.0, Math.PI / 2);   /* v14d the second bench stood where the men's restroom door is now */
  // v9.1 (the user: "eliminate empty spaces ... waiting areas, furniture, plants"): waiting areas by the facade, two east of the doors and one
  // west: deco tub chairs in pairs across a marble side table, a torchere beside them; the ribbon chandelier in the ceiling rings over the
  // lounge; the brand in lit gold letters over the box office and the concessions; planters by the poster wall's benches
  for (const [cx, cz, sw] of [[-11.6, 15.2, EMERALD]]) { add('lobby', 'armchair_deco', cx - 0.85, 0, cz, Math.PI / 2, sw ? { swap: sw } : {}); add('lobby', 'armchair_deco', cx + 0.85, 0, cz, -Math.PI / 2, sw ? { swap: sw } : {}); add('lobby', 'side_table', cx, 0, cz); add('lobby', 'torchere_deco', cx, 0, cz + 1.3, 0, { collide: 0.2 }); }
  { const kx = COUNTERS.boxOffice.x1 - 0.12, kz = (COUNTERS.concessions.z1 + COUNTERS.boxOffice.z0) / 2;   // v13 three ticket kiosks (zones12.py, the user's kiosk photo) on the walnut panel between the counters (rooms.py: their screens)
    for (const dz of [-0.66, 0, 0.66]) add('lobby', 'ticket_kiosk', kx - 0.01, 0, kz + dz, Math.PI / 2); }
  add('lobby', 'chandelier_deco', 0, LOBBY_DOME, (GATE.z + 14.2) / 2, 0, { collide: false, ground: false });   // v12c a waterfall of lit glass rods on three brass rings (zones12.py); v13 its rose 2 cm up into the halo's dome, at its centre (rooms.py RCX, RCZ)
  // v10 (the user: "the lobby is too big and empty: fill it with lighting, paintings, pillars, sofas, a fountain"; docs/V10-RESEARCH.md):
  // a fountain on the brand ring on the entrance axis (walkers part round it: building.js foyerW/E; v11: the four columns round the court
  // are the building's own, full height, tools/blender/arch/rooms.py grand_column), a
  // pendant cloud over the east waiting areas, rugs under the seating groups, a popcorn cart by the box office, film standees facing the
  // doors (their boards are FRAMED panels), a seating corner by the restrooms under its own small cloud
  // v12 (the user: "a statue"): the fountain holds Thalia, the muse of comedy, gilded on a red marble plinth (tools/blender/statue12.py,
  // public domain: docs/LICENSES.md); her caption is a brass plaque on the plinth's front flat (PIC 'plaque_muse')
  add('lobby', 'fountain_muse', ...LIFE.fountain, { round: 1.68, grp: 2 });   // grp 2: its lit jets shimmer (materials.js GLOW_VERT)
  add('lobby', 'pendant_cloud', LX, LOBBY_FIELD + 0.002, LZ, 0, { collide: false, ground: false, detail: 1 });   // over the lounge, its plate 2 mm up into the dropped field (v13 lobby12.py)
  // v12 (the user: "the carpet ... extends so badly and looks so bad"): no patterned rugs; a plain crimson pile with a charcoal edge where
  // people sit, and a crimson runner from the doors to the brand ring (floor only: no ropes on the door axis)
  const CRIMSON = { carpet_deco: [MAT.velvet, [0.20, 0.011, 0.019]], velvet_navy: [MAT.velvet, [0.022, 0.022, 0.026]] };
  // v14 (the user, 11-20: "the lobby feels so open"): a second lounge island on the court's west side, between its columns: a chesterfield
  // each side of a marble table, mid-century lounge chairs at its ends, palms on plant stands, on a crimson rug; every walking line (NAV)
  // passes 1.3 m or more from it
  { const WX = -6.2, WZ = 6.6;
    add('lobby', 'rug_round', WX, 0, WZ, 0, { collide: false, swap: CRIMSON }); add('lobby', 'scan_concrete_table', WX, 0, WZ, 0, { deep: true });   // its long side to the sofas (they face each other across x)
    add('lobby', 'scan_chesterfield', WX - 1.62, 0, WZ, Math.PI / 2); add('lobby', 'scan_chesterfield', WX + 1.62, 0, WZ, -Math.PI / 2);
    add('lobby', 'scan_lounge_chair', WX, 0, WZ + 1.75, Math.PI); add('lobby', 'scan_lounge_chair', WX, 0, WZ - 1.75, 0);
    // v14c tall planters (the scanned potted plants' leaf cards overlapped in one plane: the z-fighting gate found 3,672 places, seen from the menu camera)
    for (const [dx, dz] of [[-1.75, -1.75], [1.75, 1.75]]) add('lobby', 'planter_tall', WX + dx, 0, WZ + dz); }
  for (const [cx, cz] of [[-11.6, 15.2]]) add('lobby', 'rug_runner', cx, 0, cz + 0.35, Math.PI / 2, { collide: false, swap: CRIMSON });
  // v13 the entrance runner is floor now (rooms.py lobby12.runner_to_ring: its end cut to the brand ring's arc; this prop stopped 0.22 m short)
  add('lobby', 'popcorn_cart', -12.6, 0, 2.6, Math.PI / 2 + 0.35);
  for (const [x, yaw] of [[-6.6, 0.885], [6.6, -0.885]]) add('lobby', 'standee_base', x, 0, 12.6, yaw, { collide: 0.02 });
  add('lobby', 'rug_round', 19.4, 0, -10.8, 0, { collide: false, swap: CRIMSON }); add('lobby', 'side_table', 19.4, 0, -10.8);
  add('lobby', 'armchair_deco', 18.4, 0, -10.8, Math.PI / 2, { swap: SAPPHIRE.velvet_ivory ? { velvet_mustard: SAPPHIRE.velvet_ivory } : null }); add('lobby', 'armchair_deco', 20.4, 0, -10.8, -Math.PI / 2, { swap: SAPPHIRE.velvet_ivory ? { velvet_mustard: SAPPHIRE.velvet_ivory } : null });
  add('lobby', 'pendant_cloud', 19.4, L1 - 0.322, -10.8, 0.6, { collide: false, ground: false, scale: 0.5, detail: 1 });
  // v10 cafe (the user: "the cafe and the latte much more defined"): the front counter with bar stools, the espresso machine on the back
  // counter facing you, a lit cake case, the card reader, five bistro tables under a small pendant cloud (rooms.py builds the walnut wall,
  // the back counter, the shelves and the menu)
  add('lobby', 'bar_walnut', -19.6, 0, -11.5, Math.PI / 2);   // v12c zones12.py: 3.9 m, no gap at either end to slip behind it
  add('lobby', 'espresso_lever', ...LIFE.espresso, { collide: false, ground: false });
  add('lobby', 'cake_case', -19.6, 1.04, -12.55, Math.PI / 2, { collide: false, ground: false });
  add('lobby', 'till_pos', -19.78, 1.04, -10.15, Math.PI / 2, { collide: false, ground: false });
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
  add('lobby', 'letters_lumiere_lit', -21.58, 6.05, 9.3, Math.PI / 2, { collide: false, ground: false });   // v13 (the user: "the lumiere name getting stuck and cropped"): its foot at 5.97, 24 cm over the showtimes board (it ran behind it), centred over the desk
  // v12 the brand on the Streamline band's flat middle (rooms.py front12: its face at FACADE_Z + 4.5), its back 2 cm into the band
  add('street', 'letters_lumiere_lit', 0, 11.9, FACADE_Z + 4.48, 0, { collide: false, ground: false, scale: 1.6 });
  // v10 (the user: "improve the overall look from outside"): a premiere carpet from the kerb to the doors, two light columns flanking them
  add('street', 'rug_runner', 0, 0, FACADE_Z + 4.0, 0, { collide: false, scale: [0.62, 1, 1.8], swap: { carpet_deco: [MAT.velvet, [0.34, 0.015, 0.025]] } });
  // v12 (the user: decorations must not block the entrance and the exit; the inside full of them instead): the palms that stood either side
  // of the doors outside now stand either side of them inside
  // v14: marble busts on Nero Marquina plinths greet you either side of the doors (a scanned CC0 bust), turned a little toward the doors
  for (const x of [-3.5, 3.5]) { add('lobby', 'plinth_marble', x, 0, FACADE_Z - 1.15); add('lobby', 'scan_bust', x, 1.042, FACADE_Z - 1.15, x < 0 ? 0.35 : -0.35, { collide: false }); }
  // v12 the lobby told as a cinema (tools/blender/decor12.py): the film-heritage exhibit on the escalator hall's long blank west wall (four
  // reels on walnut, a 1950s projector on a plinth before it); the photo spot on the open floor west of the fountain court, seen as you
  // come in (a step-and-repeat wall between two posts, two director's chairs, a ring light where the camera stands); a shelf of
  // collectible buckets and cups beside the candy wall
  add('lobby', 'reel_wall', CORE.x0 + 0.005, 0, -3.0, -Math.PI / 2, { collide: false, ground: false, scale: 1.5 });
  add('lobby', 'projector_vintage', CORE.x0 - 1.2, 0, -3.0, -Math.PI / 2);
  add('lobby', 'plinth_marble', CORE.x0 - 0.62, 0, -2.05); add('lobby', 'scan_cine_camera', CORE.x0 - 0.62, 1.042, -2.05, -Math.PI / 2, { collide: false });   // v14 a scanned (CC0) cine camera on a plinth (the scanned projector's layered faces fought)
  for (const z of [-3.875, -2.125]) add('lobby', 'stanchion', CORE.x0 - 2.1, 0, z);   // a rope before the exhibit, as in a museum
  add('lobby', 'rope_velvet', CORE.x0 - 2.1, 0, -3.0, Math.PI / 2);
  add('lobby', 'backdrop_stand', -7.0, 0, -5.51, 0);
  for (const x of [-7.9, -6.1]) add('lobby', 'directors_chair', x, 0, -4.7, 0);
  add('lobby', 'ring_light', -7.0, 0, -2.7, Math.PI);
  add('lobby', 'merch_shelf', -21.35, 0, 2.1, Math.PI / 2);
  for (const x of [-40, -34, 34, 40]) add('street', 'olive_tree', x, 0, 22.8, (x * 1.7) % 6.28, { collide: false, round: 0.8 });   // v12: between the wings' showcases, 1.8 m off their faces; the potted olives of the lobby (leaf cards, not the old blob crown)
  for (const z of [7.9, 2.1, -4.1, -8.9]) add('lobby', 'planter_tall', 21.1, 0, z);
  // v11 (the user: "a pole is blocking the view"): none in front of the canopy. v12: each lamp's arm reaches over the kerb (it lay along the
  // pavement); the light and its halo are at the head (tools/blender/arch/rooms.py); a clipped hedge stands in every bronze trough
  for (let x = -40; x <= 40; x += 10) if (Math.abs(x) > 12) add('street', 'lamp_post', x, 0, 25.55, 0, { collide: 0.05 });
  for (let x = -44; x < 42; x += 8) if (Math.abs(x) >= 12 && Math.abs(Math.abs(x) - 20) >= 1) add('street', 'hedge_block', x, 0, 24.9, 0, { collide: false, ground: false });   // none under the lamps at +-20
  for (const x of [-14, -11.2, -8.4, -5.6, 14]) add('street', 'bollard_light', x, 0, 25.6);   // v12: none by the crossing, none along the taxi bay (x 6 to 13)
  add('street', 'planter_hedge', -15, 0, 21.2); add('street', 'planter_hedge', 15, 0, 21.2); 
  // v12 (the user: "balconies, an outer extension of shops, people, crosswalks, lamps, trees, plants"): the far pavement gets street trees
  // in grated pits between its lamps (none on the crossing's landing), Café Noir's tables out under its awning, and box planters by the
  // open door of the ramen bar (the hotel's door has its canopy). The trees' trunks collide (a round 0.3 m), the crowns stand over the walkers' heads
  for (const x of [-42.5, -34.5, -9.6, 5.4, 13.6, 33.0]) add('street', 'street_tree', x, 0, 37.6, (x * 7.3) % 6.28, { ground: false, collide: false, round: 0.3 });
  for (const tx of [-22.4, -19.2, -16.0]) { add('street', 'bistro_table', tx, 0, 39.05); add('street', 'bistro_chair', tx - 0.62, 0, 39.05, Math.PI / 2); add('street', 'bistro_chair', tx + 0.62, 0, 39.05, -Math.PI / 2); }
  for (const x of [17.6, 20.6]) add('street', 'planter_hedge', x, 0, 39.2, 0, { scale: 0.7 });
  // v12b (the user, 11-19: "the outside ... the road being so empty"): the street furnished (tools/blender/street_props12.py). Near pavement:
  // a bench facing the road in front of each wing with a bin beside it, a hydrant by the kerb each side of the forecourt, parking meters
  // on the kerb along the lay-by where cars park, a bike stand by the cinema's west glass (clear of the doors' axis). Far pavement: a
  // bench by the chemist, two bins and two hydrants, all off the walkers' line (z 38.55, npc9.js streetFolk)
  for (const x of [-24.5, 24.5]) { add('street', 'bench_street', x, 0, 23.55, 0); add('street', 'bin_street', x + Math.sign(x) * 1.6, 0, 23.75, 0); }
  for (const x of [-17.5, 17.5]) add('street', 'hydrant', x, 0, 25.45, Math.PI);
  for (const x of [-43.5, -33.5, -23.5, 23.5, 33.5, 42.5]) add('street', 'parking_meter', x, 0, 25.75, 0, { collide: 0.02 });
  add('street', 'bike_stand', -9.0, 0, 20.6, Math.PI / 2);
  add('street', 'bench_street', 25.5, 0, 39.3, Math.PI); add('street', 'bin_street', -11.0, 0, 39.4, 0); add('street', 'bin_street', 23.7, 0, 39.45, 0);
  for (const x of [-28.0, 10.6]) add('street', 'hydrant', x, 0, 37.0, 0);
  // parked cars in the lay-by (lights off, facing the near lane's way), clear of the taxi's bay and its way in and out (x -8 to 21): one
  // more each side on the medium and high presets
  const PARKED = [[-34.5, [0.86, 0.86, 0.84]], [30.0, [0.012, 0.012, 0.014]], [-41.0, [0.05, 0.09, 0.2], 1], [37.0, [0.3, 0.03, 0.035], 1]];
  for (const [x, rgb, d] of PARKED) add('street', 'car_sedan', x, 0, STREET.road[0] - 1.75, Math.PI / 2, { lod: 1, glowK: 0, swap: { car_red: [MAT.lacquer, rgb] }, detail: d || 0 });
  for (const z of [-16.2, -40, -60]) { add('spine', 'bin_brass', -3.95, 0, z); add('spine', 'planter_tall', 3.75, 0, z); }
  // v9.3 hall entrances (the user's ScreenX entrance photo; tools/blender/arch/rooms.py builds the portals): the hall's name in face-lit
  // letters over each portal, its number beside it, a bin; red armchairs along the bridge
  const WORD = { MAX: 'letters_max', CURVE: 'letters_curve', CLASSIC: 'letters_classic', X270: 'letters_x270' };
  for (const d of DOORS.filter((q) => q.hall && q.id.endsWith('In'))) {
    const h = HALL[d.hall], side = -h.dir, xf = d.x + side * 0.5; let xfront = xf + side * 0.8, zc = d.z, zn = zc + 2.15;
    if (d.hall === 'X270') { xfront = FLANK_E.x0 + 0.3; zc = (LINK_E.z0 + LINK_E.z1) / 2; zn = zc + 2.9; }
    add('corridor', WORD[d.hall], xfront + side * 0.03, L1 + 3.2, zc, side * Math.PI / 2, { collide: false, ground: false, scale: 0.36 });   // just proud of the diamond panels (2.5 cm deep)
    // v13 the number is on a blade roundel over the pier now (rooms.py corridor_signs, panels 'roundel_*'): the flat numeral is gone
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
  // v14 (the user, 11-21: "the corridors like the upper area felt so empty and dead"): three round bornes in wine velvet on the bridge's
  // south side, a snake plant on each; people sit round them, stroll and talk up here between the shows (npc9.js corridorFolk)
  for (const x of BORNES) { add('corridor', 'borne_round', x, L1, BORNE_Z, 0, { collide: false, round: 0.82, swap: { velvet_teal: [MAT.velvet, [0.21, 0.012, 0.03]] } });
    add('corridor', 'planter_tall', x, L1 + 0.842, BORNE_Z, 0.4, { collide: false }); }
  // a bin inside every hall, at the top of the rear aisle beside the entrance (you leave with your empty cup). v14d: in a hall with curved
  // rows the way in runs from the door along the rear wall (hallmath seatRoute), so its bin stands against the side wall in front of the door
  for (const h of Object.values(HALL)) { const sg = Math.sign(h.entryU) || 1, u = h.rowK ? sg * (h.width / 2 - 0.3) : h.entryU - sg * 1.4, d = h.rowK ? h.depthIn - 1.6 : h.depthIn - 0.5;
    const w = h.toWorld(u, d), q = h.toWorld(u - sg, d); add(h.key, 'bin_brass', w.x, h.y0 + h.total, w.z, h.rowK ? Math.atan2(q.x - w.x, q.z - w.z) : 0); }
  // v12b Dolby Atmos: the overhead speakers, hung from each hall's ceiling in two rows, each turned to face across the seats
  L.push(...vipDress(), ...privateDress());   // v14e the VIP boxes' furniture and their ropes' posts (vip.js)
  return L;
})();
export const SIT_ON = { seat_club: { h: 0.46, n: 1 }, bed_modern: { h: 0.52, w: 0.9 }, borne_round: { h: 0.45, ring: 6, r: 0.6 }, scan_chesterfield: { h: 0.46, w: 0.6 }, scan_armchair: { h: 0.45, n: 1 }, scan_lounge_chair: { h: 0.43, n: 1 }, sofa_curve: { h: 0.44, w: 0.7 }, armchair_deco: { h: 0.44, n: 1 }, bench_velvet: { h: 0.45, w: 0.62 }, bench_street: { h: 0.45, w: 0.62 }, bar_stool: { h: 0.76, n: 1 }, directors_chair: { h: 0.6, n: 1 } };
function dressRooms(world) {
  const byRoom = {}; for (const p of DRESS) (byRoom[p.room] || (byRoom[p.room] = [])).push(p);
  // v9.1: the restrooms' fittings at their interaction points (tools/blender/arch/rooms.py fixtures; they were points with no mesh):
  // a vessel basin and a brass tap at each basin, a urinal at each urinal
  for (const u of world.uses) { const L = byRoom[u.room] || (byRoom[u.room] = []);
    if (u.kind === 'basin') { L.push({ room: u.room, name: 'basin_vessel', x: u.x + 0.02, y: u.y, z: u.z, yaw: 0, o: { collide: false, ground: false } }); L.push({ room: u.room, name: 'tap_brass', x: u.x - 0.2, y: u.y, z: u.z, yaw: Math.PI / 2, o: { collide: false, ground: false } }); }
    if (u.kind === 'urinal') L.push({ room: u.room, name: 'urinal', x: u.x, y: 0, z: u.z - 0.245, yaw: 0, o: { collide: 0.05, ground: false } }); }
  // v12b rooftop plant on the far side's flat decks (street12.py extras.roofs): a water tank 1.5 m behind the parapet, where the street
  // sees it over the parapet, its ladder towards the street; a condenser with its vent further back, clear of the lot's stair bulkhead
  const SX = world.rooms.street && world.rooms.street.x; for (const r of (SX && SX.roofs) || []) { const L = byRoom.street || (byRoom.street = []);
    L.push({ room: 'street', name: 'roof_tank', x: r.x1 - 3.2, y: r.y, z: r.z + 1.5, yaw: Math.PI, o: { collide: false, ground: false } });
    L.push({ room: 'street', name: 'roof_ac', x: r.bulk[1] + 2.4, y: r.y, z: r.z + 3.4, yaw: Math.PI, o: { collide: false, ground: false } }); }
  for (const key in byRoom) {
    const room = world.rooms[key]; if (!room) continue; const host = { pacc: new Acc(), gacc: new Acc(), facc: new Acc(), bins: [], col: (x0, z0, x1, z1, y0, y1) => { for (const [ax, az, bx, bz] of [[x0, z0, x1, z0], [x1, z0, x1, z1], [x1, z1, x0, z1], [x0, z1, x0, z0]]) world.walls.add(ax, az, bx, bz, y0, y1); },
      poly: (pts, y0, y1) => { for (let k = 0; k < pts.length; k++) { const a = pts[k], b = pts[(k + 1) % pts.length]; world.walls.add(a[0], a[1], b[0], b[1], y0, y1); } },   // v12b an oriented footprint (assets.js placeAsset)
      ring: (cx, cz, r, y0, y1, n = 16) => { const R = r / Math.cos(Math.PI / n); for (let k = 0; k < n; k++) { const a0 = 2 * Math.PI * k / n, a1 = 2 * Math.PI * (k + 1) / n; world.walls.add(cx + R * Math.cos(a0), cz + R * Math.sin(a0), cx + R * Math.cos(a1), cz + R * Math.sin(a1), y0, y1); } } };
    const framed = FRAMED.filter((f) => f.room === key); for (const f of framed) framePanel(host.pacc, f);
    const det = world.engine && world.engine.preset ? world.engine.preset.detail ?? 1 : 1;   // v10: the low preset skips purely decorative extras (o.detail 1)
    const cen = (world.census || (world.census = {}))[key] = {};   // what each room's furniture costs (triangles per asset): the optimiser's map
    // v12 the lobby's furniture in two meshes: what the street sees through the glass, and the deep set (the mezzanine, and small things more
    // than 14 m behind the glass, a few pixels from the pavement) drawn only from inside. The review: the lobby's props were 147k of the
    // street's 339k triangles, and the inside is about to get fuller
    const deep = key === 'lobby' ? { ...host, pacc: new Acc(), gacc: new Acc(), facc: new Acc() } : null;
    // v14d (the user, 11-27: "the app lags a lot"): the big rooms' furniture in cells (lobby 2 x 2, street and corridor 3 along their length),
    // each its own mesh, so what is behind you or out to the side is not drawn (one mesh per room drew all of it from anywhere)
    const NC = { lobby: [2, 2], street: [3, 1], corridor: [3, 1] }[key] || [1, 1], RR = room.def.rect || [0, 0, 1, 1], cells = new Map([[host, host], ...(deep ? [[deep, deep]] : [])]), cellKeys = new Map();
    const cellOf = (base, x, z) => { if (NC[0] * NC[1] === 1) return base; const i = Math.max(0, Math.min(NC[0] - 1, Math.floor((x - RR[0]) / (RR[2] - RR[0]) * NC[0]))), j = Math.max(0, Math.min(NC[1] - 1, Math.floor((z - RR[1]) / (RR[3] - RR[1]) * NC[1])));
      const k = (base === deep ? 'd' : 'h') + i + '_' + j; let c = cellKeys.get(k); if (!c) { c = { ...base, pacc: new Acc(), gacc: new Acc(), facc: new Acc(), deepCell: base === deep }; cellKeys.set(k, c); cells.set(c, c); } return c; };
    for (const p of byRoom[key]) { const A = ASSETS[p.name]; if (!A || (p.o.detail || 0) > det) continue; const lift = p.o.ground === false ? 0 : -A.box.min.y;
      const sz = A.box.getSize(new THREE.Vector3()), small = Math.max(sz.x, sz.z) * (typeof p.o.scale === 'number' ? p.o.scale : 1) < 1.6;
      (world.placed || (world.placed = [])).push({ room: key, name: p.name, x: p.x, y: p.y, z: p.z });   /* what stands where (tests) */ const tgt = cellOf(deep && (p.y > L1 - 1 || (small && p.z < 4) || p.o.deep) ? deep : host, p.x, p.z); placeAsset(tgt, p.name, p.x, p.y + lift, p.z, p.yaw, p.y > 0.5 ? { ...p.o, floorY: p.y } : p.o);
      // v14 (the user, 11-20: "I can't sit on most of the sofas outside"): seating props give sit spots (local +z is their front)
      const sd = SIT_ON[p.name]; if (sd && sd.ring) for (let i = 0; i < sd.ring; i++) { const t = p.yaw + (i + 0.5) / sd.ring * Math.PI * 2, sx = Math.sin(t), sz = Math.cos(t), x = p.x + sx * sd.r, z = p.z + sz * sd.r;   // v14 round seats: facing out
        world.sitSpots.push({ x, y: p.y + sd.h, fy: p.y, z, face: t + Math.PI, stand: { x: x + sx * 0.62, z: z + sz * 0.62 }, room: key, taken: null, ring: true }); }
      else if (sd) { const bx = A.box, wx = bx.max.x - bx.min.x, cx = (bx.max.x + bx.min.x) / 2, cz = (bx.max.z + bx.min.z) / 2 + (bx.max.z - bx.min.z) * 0.06, n = sd.n || Math.max(1, Math.round(wx / sd.w)), cs = Math.cos(p.yaw), sn = Math.sin(p.yaw);
        for (let i = 0; i < n; i++) { const lx = cx + (i - (n - 1) / 2) * (wx / n), x = p.x + lx * cs + cz * sn, z = p.z - lx * sn + cz * cs;
          world.sitSpots.push({ x, y: p.y + sd.h, fy: p.y, z, face: p.yaw + Math.PI, stand: { x: x + sn * 0.62, z: z + cs * 0.62 }, room: key, taken: null }); } }
      const e = cen[p.name] || (cen[p.name] = { n: 0, tris: 0 }), ld = p.o.lod ?? 0; e.n++; for (const q of A.parts) if (q.lod === ld && (!p.o.only || q.name.startsWith(p.o.only))) e.tris += (q.geo.index ? q.geo.index.count : q.geo.attributes.position.count) / 3; }
    // v12c the lobby's props draw their glass see-through (the poppers' cabinets, the heated cases, the fountain's water); the street keeps
    // its cars' glass dark (they have no cabins)
    const propGlass = (g, nm) => {
      const lf = splitIds(g, LEAF_IDS); if (lf) { const lm = new THREE.Mesh(lf, world.mats.leafRoom(room.U)); lm.matrixAutoUpdate = false; lm.name = nm.replace('glass', 'leaves'); room.group.add(lm); }
      if (key !== 'lobby') return; const gl = splitGlass(g); if (!gl) return; const gm = new THREE.Mesh(gl, world.mats.glassMat()); gm.renderOrder = 3; gm.matrixAutoUpdate = false; gm.name = nm; room.group.add(gm); };
    for (const h_ of cells.values()) { const dp = h_ === deep || h_.deepCell, sfx = dp ? 'deep' : '';
      if (h_.pacc.count) { const g = toGeometry(h_.pacc); room.lights.bake(g); propGlass(g, key + '-propglass' + sfx); const m = new THREE.Mesh(g, world.mats.litFor(room.U, g)); m.matrixAutoUpdate = false; m.name = key + (dp ? '-propsdeep' : '-props'); room.group.add(m); }
      if (h_.gacc.count) { const g = toGeometry(h_.gacc, false); const m = new THREE.Mesh(g, world.mats.glowMat(room.U)); m.matrixAutoUpdate = false; m.name = key + '-propglow' + sfx; room.group.add(m); }
      if (h_.facc.count) {   // v12 leaf cards (foliage.js)
        const g = toGeometry(h_.facc); room.lights.bake(g); const m = new THREE.Mesh(g, world.mats.foliageMat(room.U, world.leafTex || (world.leafTex = leafAtlas(world.mats.texSize < 512 ? 256 : 512))));
        m.matrixAutoUpdate = false; m.name = key + '-foliage' + sfx; room.group.add(m); } }
    for (const b of host.bins) world.bins.push({ ...b, room: key, y: b.y != null ? b.y : room.def.level || 0 });   // v14d its own floor (a hall's bin is at the top, not on the hall's lowest floor)
    for (const f of framed) addPanel(world, room, f);
    for (const t of TOTEM_POSTERS) if (t.room === key) addPanel(world, room, t);
  }
}
// v10 pictures on boards, framed, placed by the engine (no re-bake): the restroom pictograms, the east wall's mural, art over the cafe and
// by the spine door, the film standees' boards. x, y, z: the picture's centre; yaw: the way it faces; the board and frame sit behind it
// (depth + 4 mm), so a wall picture's centre is that far in front of the wall's face
const ESC_BOX_Z = (() => { const [zi0, zi1] = escProfile(ESC.up).incline; return zi0 - 0.6 - 2.45 / (L1 - 0.85) * (zi0 - zi1); })();   // the back of the boxed-in escalator feet (rooms.py zk1)
const ART = { room: 'lobby', yaw: 0, z: -13.6 + 0.034, frameCol: '#3e2618', frameMat: MAT.wood }, PIC = (o) => ({ room: 'lobby', depth: 0.03, ...o });
// v12 the paintings: file (www/art), width / height; a slot's size is the largest at that proportion inside its box (fit: max w, max h)
const ARTWORK = { art_1: ['vangogh_self', 0.785], art_2: ['two_sisters', 0.806], art_3: ['childs_bath', 0.659], art_4: ['rainy_day', 1.287], art_5: ['nocturne', 1.513], art_6: ['grande_jatte', 1.492], art_7: ['bedroom', 1.277] };
export const fitArt = (id, mw, mh) => { const a = ARTWORK[id][1]; return mw / mh > a ? { w: +(mh * a).toFixed(3), h: mh } : { w: mw, h: +(mw / a).toFixed(3) }; };
const FRAMED = [
  ...LIFE.kettles.map((k, i) => PIC({ id: 'kettlehead_' + i, x: k[0] + 0.268, y: k[1] + 0.90, z: k[2], yaw: Math.PI / 2, w: 0.56, h: 0.085, emit: 0.85, frame: 'none' })),   // v12c
  PIC({ id: 'photowall', x: -7.0, y: 1.30, z: -5.48, yaw: 0, w: 3.10, h: 2.36, emit: 0.35, frame: 'thin' }),   // v12 between the backdrop stand's posts (7 mm into each, and into its top bar)
  PIC({ id: 'plaque_muse', x: 0, y: 0.86, z: 10.0 + 1.082 * Math.cos(Math.PI / 8) + 0.034, yaw: 0, w: 0.62, h: 0.19, emit: 0.2, frame: 'thin', depth: 0.03 }),   // v12 on the fountain plinth's front flat (statue12.py PA)
  PIC({ id: 'plaque_proj', x: CORE.x0 - 1.2 - 0.5 - 0.034, y: 0.62, z: -3.0, yaw: -Math.PI / 2, w: 0.42, h: 0.12, emit: 0.2, frame: 'thin', depth: 0.03 }),   // v12 on the projector's plinth (world9.js DRESS)
  ...[['a', -5.6], ['b', -0.4]].map(([v, z]) => PIC({ id: 'vintage_' + v, x: CORE.x0 - 0.034, y: 1.75, z, yaw: -Math.PI / 2, w: 1.0, h: 1.45, emit: 0.45 })),   // v12 either side of the reel wall
  PIC({ id: 'picto_m', x: 21.56 - 0.034, y: 1.35, z: -5.05, yaw: -Math.PI / 2, w: 0.9, h: 2.0, emit: 1, frame: 'thin' }),   // v14d beside the men's own door
  PIC({ id: 'picto_f', x: 21.56 - 0.034, y: 1.35, z: 1.05, yaw: -Math.PI / 2, w: 0.9, h: 2.0, emit: 1, frame: 'thin' }),
  ...[-7.7, 1.8, 11.3].map((z, i) => PIC({ id: 'mural_' + i, x: 21.6 - 0.034, y: 7.5, z, yaw: -Math.PI / 2, w: 9.2, h: 2.2, emit: 0.25, frame: 'thin' })),   // v12 under the cove band (rooms.py lobby12: its underside at 8.85)
  ...[[-15.4, 1], [-12.8, 2], [-10.2, 3]].map(([x, n]) => PIC({ ...ART, id: 'art_' + n, x, y: 2.25, z: ART.z + 0.014, ...fitArt('art_' + n, 0.8, 1.1), emit: 0.12 })),   // on the cafe's walnut (14 mm)
  PIC({ ...ART, id: 'art_4', x: -4.6, y: 2.0, z: ART.z + 0.014, ...fitArt('art_4', 1.6, 1.1), emit: 0.12, frameCol: '#c9a35e', frameMat: MAT.brass }), PIC({ ...ART, id: 'art_5', x: 4.6, y: 2.0, z: ART.z + 0.014, ...fitArt('art_5', 1.6, 1.1), emit: 0.12, frameCol: '#c9a35e', frameMat: MAT.brass }),   // on the rear wall's walnut (14 mm)
  // v12 a gallery wall: two more over the east wall's velvet benches, on its stone panels (the pictograms' depth)
  ...[['art_6', 5.0, 2.0, 1.4]].map(([id, z, mw, mh]) => PIC({ id, x: 21.56 - 0.034, y: 2.35, z, yaw: -Math.PI / 2, ...fitArt(id, mw, mh), emit: 0.24, frameCol: '#c9a35e', frameMat: MAT.brass })),
  ...[[-6.6, 0.885, 'cosmos'], [6.6, -0.885, 'agent327']].map(([x, yaw, f]) => PIC({ id: `poster_${f}_s`, x: x + Math.sin(yaw) * 0.018, y: 0.98, z: 12.6 + Math.cos(yaw) * 0.018, yaw, w: 1.1, h: 1.7, emit: 0.6 })),
  ...[[9.85, 'bunny'], [11.55, 'llamigos']].map(([x, f]) => PIC({ id: `poster_${f}_s`, x, y: 1.12, z: ESC_BOX_Z - 0.034, yaw: Math.PI, w: 0.9, h: 1.4, emit: 0.6 })),   // v11 on the walnut under the escalators
  ...[[6.0, 'hero'], [14.5, 'wingit']].map(([x, f]) => PIC({ room: 'corridor', id: `poster_${f}_s`, x, y: L1 + 0.98, z: BRIDGE.z0 + 0.8 + 0.018, yaw: 0, w: 1.1, h: 1.7, emit: 0.6 })),
];
// v11 the lobby's two poster totems (tools/kiln/poster_totem.kiln.js) show a film on each face: inside the totem's brass frame, 7 mm in
// front of its box (2 mm in front of the poster bed, 3 mm behind the frame's face). They stood blank, the frame floating off the box.
const TOTEM_POSTERS = [[-6.0, 0.35, 'sintel', 'cosmos'], [6.0, -0.35, 'hero', 'wingit']].flatMap(([x, yaw, a, b], i) => [[a, 1], [b, -1]].map(([f, s]) =>
  ({ room: 'lobby', id: `poster_${f}_t${i}`, x: x + s * Math.sin(yaw) * 0.087, y: 1.26, z: 16.3 + s * Math.cos(yaw) * 0.087, yaw: s > 0 ? yaw : yaw + Math.PI, w: 0.8, h: 1.22, emit: 0.7 })));
const UP = new THREE.Vector3(0, 1, 0), ONE = new THREE.Vector3(1, 1, 1);
export function framePanel(acc, p) {   // the board (front 3 mm behind the picture) and four bars round it, 2.2 cm proud of the picture
  if (p.frame === 'none') return;   // v12c a picture on a bed its prop already has (the poppers' headers)
  const t = p.frame === 'thin' ? 0.025 : 0.05, d = p.depth ?? 0.03, col = p.frameCol || '#c9a35e', mat = p.frameMat ?? MAT.brass;
  const R = new THREE.Matrix4().compose(new THREE.Vector3(p.x, p.y, p.z), new THREE.Quaternion().setFromAxisAngle(UP, p.yaw), ONE), put = (w, h, dd, x, y, z, c, m) => acc.add(boxGeo(w, h, dd), R.clone().multiply(M(x, y, z)), c, { mat: m });
  put(p.w + 0.004, p.h + 0.004, d, 0, 0, -d / 2 - 0.003, p.board || '#121214', MAT.powder);
  for (const s of [-1, 1]) { put(t, p.h + 0.004 + 2 * t, d + 0.025, s * (p.w / 2 + 0.002 + t / 2), 0, -d / 2 + 0.0095, col, mat); put(p.w + 0.004, t, d + 0.025, 0, s * (p.h / 2 + 0.002 + t / 2), -d / 2 + 0.0095, col, mat); }
}
export function addPanel(world, room, p) {   // as buildWorld's bake panels: a canvas picture lit by the room's light where it hangs
  const pt = panelTexture(p.id, p.w, p.h, PANEL_DRAW), H = [0, 0, 0], F = [0, 0, 0], nx = Math.sin(p.yaw), nz = Math.cos(p.yaw); room.lights.at(p.x + nx * 0.1, p.y, p.z + nz * 0.1, nx, 0, nz, H, F);
  const mat = world.mats.texMat(pt.tex, room.U, new THREE.Color(H[0], H[1], H[2]), p.emit ?? 0), m = new THREE.Mesh(new THREE.PlaneGeometry(p.w, p.h), mat);
  m.position.set(p.x, p.y, p.z); m.rotation.y = p.yaw; m.updateMatrix(); m.matrixAutoUpdate = false; m.name = 'panel-' + p.id; room.group.add(m); world.panels[p.id] = { ...p, ...pt, mesh: m, mat };
}
// ---------------------------------------------------------------- halls: seats, picture, curtains
const FAMILY = { rocker: ['seat_rocker', 'arm_rocker'], recliner: ['seat_club', 'arm_club'], sofa: ['seat_club', 'arm_club'], pod: ['seat_club', 'arm_club'] };
const familyOf = (h, kind) => (h.id === 'CLASSIC' && kind === 'rocker' ? ['seat_classic', 'arm_classic'] : FAMILY[kind]);
// per-hall upholstery (v9.2): MAX midnight-blue leather (the large-format hall's colour), X-270 deep red (the ScreenX house colour), Curve dark cognac
const SEAT_SWAP = { MAX: { leather_black: '#1e2846' }, X270: { leather_chocolate: '#7a0f18', walnut: '#1a1a1c' }, CURVE: { leather_chocolate: '#1c100a' } };   // v14 X-270: red leather recliners (the user's ScreenX photo)
const seatOver = (h) => { const sw = SEAT_SWAP[h.id]; if (!sw) return null; const o = {}; for (const k in sw) { const nm = named(k); if (nm) o[k] = { id: nm.id, tint: new THREE.Color(sw[k]).toArray() }; } return o; };
// v14 (the user, 11-20: "name every one of them correctly"): each seat carries its number on a brass plate at the top of its backrest,
// facing the row behind (row and number: G12), and each row's letter glows on a small amber plate at both aisle ends (UNIC
// 7.2: lit row letters). One instanced quad per kind and hall, the characters from one glyph atlas; the plates follow the house lights,
// the aisle letters stay lit. Ids run A (the front row) to the back, 1 at the left as you face the screen (hallmath.js hallSeats)
const GLYPHS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'; let glyphTex = null;
function glyphAtlas() {
  if (glyphTex) return glyphTex; const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d'); g.__noFit = true;
  g.fillStyle = '#000'; g.fillRect(0, 0, 512, 512); g.fillStyle = '#fff'; g.font = `700 50px ${SANS}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let i = 0; i < GLYPHS.length; i++) g.fillText(GLYPHS[i], (i % 8) * 64 + 32, Math.floor(i / 8) * 64 + 35);
  glyphTex = new THREE.CanvasTexture(c); glyphTex.minFilter = THREE.LinearMipmapLinearFilter; glyphTex.anisotropy = 4; return glyphTex;
}
const LABEL_VERT = `attribute vec4 iGl; varying vec2 vUv; varying vec4 vGl;
void main() { vUv = uv; vGl = iGl; gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0); }`;
const LABEL_FRAG = `uniform sampler2D uAtlas; uniform vec3 uPlate; uniform vec3 uInk; uniform float uLit; uniform float uHouse; uniform float uSlots; varying vec2 vUv; varying vec4 vGl;
void main() {
  float n = vGl.w, x = vUv.x * uSlots - (uSlots - n) * 0.5, slot = floor(x), m = 0.0;
  if (slot >= 0.0 && slot < n) { float gi = slot < 0.5 ? vGl.x : slot < 1.5 ? vGl.y : vGl.z; vec2 lu = vec2(fract(x), vUv.y * 1.12 - 0.06);
    vec2 cell = vec2(mod(gi, 8.0), floor(gi / 8.0)); m = texture2D(uAtlas, (cell + vec2(0.08 + lu.x * 0.84, 1.0 - (0.06 + lu.y * 0.88))) / 8.0).r; }
  float edge = step(0.05, vUv.x) * step(vUv.x, 0.95) * step(0.08, vUv.y) * step(vUv.y, 0.92);
  vec3 c = mix(uPlate * (0.55 + 0.45 * edge), uInk, m) * mix(uLit, 1.0, uHouse);
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`;
function seatLabels(h, room, seats) {
  const atlas = glyphAtlas(), code = (t) => { const q = [...t].slice(0, 3).map((ch) => GLYPHS.indexOf(ch)); return [q[0] ?? 0, q[1] ?? 0, q[2] ?? 0, q.length]; };
  const make = (list, w, ht, plate, ink, litDark, slots) => {
    const g = new THREE.PlaneGeometry(w, ht), gl = new Float32Array(list.length * 4), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0);
    const mat = new THREE.ShaderMaterial({ vertexShader: LABEL_VERT, fragmentShader: LABEL_FRAG, uniforms: { uAtlas: { value: atlas }, uPlate: { value: new THREE.Color(plate) }, uInk: { value: new THREE.Color(ink) }, uLit: { value: litDark }, uSlots: { value: slots }, uHouse: room.U.uHouse } });
    const m = new THREE.InstancedMesh(g, mat, list.length); m.name = h.key + '-labels'; m.frustumCulled = false;
    list.forEach((o, i) => { M.compose(new THREE.Vector3(o.x, o.y, o.z), Q.setFromAxisAngle(Y, o.yaw), new THREE.Vector3(1, 1, 1)); m.setMatrixAt(i, M); gl.set(code(o.text), i * 4); });
    g.setAttribute('iGl', new THREE.InstancedBufferAttribute(gl, 4)); room.group.add(m); return m;
  };
  // the number plate: on the back of the backrest, 2 cm behind it, 7 cm under its top (local +z is the seat's back)
  const plates = seats.map((s) => { const sd = SEAT[s.kind], b = sd.bk + 0.012, sn = Math.sin(s.yaw), cs = Math.cos(s.yaw); return { x: s.x + sn * b, y: s.y + sd.h - 0.07, z: s.z + cs * b, yaw: s.yaw, text: s.id }; });
  room.seatPlates = make(plates, 0.15, 0.05, '#b8893c', '#1a120a', 0.22, 3);
  // the row letter at both ends of every row, on the side of the end seat towards the aisle, 0.3 m up, facing along the row outwards
  const ends = []; for (const row of h.rows) { const rs = seats.filter((s) => s.row === row.r); if (!rs.length) continue; rs.sort((a, b) => a.a - b.a);
    for (const [s, sg] of [[rs[0], -1], [rs[rs.length - 1], 1]]) { const sd = SEAT[s.kind], off = sd.w / 2 + 0.035, cs = Math.cos(s.yaw), sn = Math.sin(s.yaw);
      ends.push({ x: s.x + sg * off * cs, y: s.y + 0.32, z: s.z - sg * off * sn, yaw: s.yaw + sg * Math.PI / 2, text: row.letter }); } }
  room.rowLetters = make(ends, 0.09, 0.11, '#1a1410', '#ffb347', 1.0, 1);
}
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
  const instanced = (geo, list, lt, sx) => { const ms = [0, 1, 2].map((l) => { const g = geo[l] && geo[l].attributes.position.count ? geo[l] : l ? null : geo[0]; if (!g) return null; const m = new THREE.InstancedMesh(g, mats.litFor(U, g, true), list.length); m.name = 'seats-' + (list[0] && (list[0].an || list[0].kind)) + '-lod' + l; m.count = 0; m.frustumCulled = false;
    for (const [k, w] of [['iLh', 3], ['iLf', 3], ['iLs', 1]]) g.setAttribute(k, new THREE.InstancedBufferAttribute(new Float32Array(list.length * w), w)); room.group.add(m); return m; }); groups.push({ list, ms, lt, sx, arm: !!(list[0] && list[0].an) }); };
  for (const F of Object.values(fams)) {
    const geo = [0, 1, 2].map((l) => assetGeometry(F.sn, l, flip, toGeometry, Acc, over)); if (!geo[0]) { console.warn('seat model missing: ' + F.sn); continue; }   // v14e LOD2 (tools/lod2.mjs) for the far rows
    geo[0].computeBoundingBox(); const bw = geo[0].boundingBox.max.x - geo[0].boundingBox.min.x, aw = ASSETS[F.an] ? ASSETS[F.an].box.max.x - ASSETS[F.an].box.min.x : 0.06;
    // v14c curved rows: neighbours turn towards each other, so the seats' fronts close up by fr x pitch / radius; the seat is that much
    // narrower (row A of CURVE: 3 cm) so its front corners stay clear of the arms
    const rrMin = h.rowK ? Math.min(...h.rows.filter((r) => r.seat === F.kind).map((r) => r.dHip + h.rowK)) : Infinity;
    const want = SEAT[F.kind].w - Math.min(0.12, aw) - (Number.isFinite(rrMin) ? SEAT[F.kind].fr * SEAT[F.kind].w / rrMin : 0), sx = clamp(want / Math.max(0.2, bw), 0.75, 1.7);
    const idx = F.list.map((s) => s.i), sub = new Float32Array(idx.length * 7); idx.forEach((i, k) => sub.set(lit.subarray(i * 7, i * 7 + 7), k * 7)); instanced(geo, F.list, sub, sx);
    for (const s of F.list) { s.sx = sx; s.fam = F.sn; }   // v12 recline.js copies your own seat at the same width
  }
  const armFam = {}; arms.forEach((a, i) => { (armFam[a.an] || (armFam[a.an] = [])).push(i); });
  for (const an in armFam) { const geo = [0, 1, 2].map((l) => assetGeometry(an, l, flip, toGeometry, Acc, over)); if (!geo[0]) continue; const ids = armFam[an], list = ids.map((i) => arms[i]), sub = new Float32Array(ids.length * 7); ids.forEach((i, k) => sub.set(armLit.subarray(i * 7, i * 7 + 7), k * 7)); instanced(geo, list, sub, 1); }
  seatLabels(h, room, seats);   // v14 every seat named: a brass number on its back, the row's letter lit at each aisle end
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
  const hall = { cfg: h, id: h.id, key: h.key, name: h.name, room, seats, arms, pic, picMat, slate, patches, curtains, seatLit: lit, over,
    // v12 recline.js: your own seat drops out of the instances while its moving copy stands in for it
    hideSeat(s, on) { s.hidden = !!on; this.updateLOD(null, true); },
    updateLOD(cam, force, far = 7) {
      const px = cam ? cam.position.x : last[0], pz = cam ? cam.position.z : last[1]; if (!force && Math.hypot(px - last[0], pz - last[1]) < 0.5) return; last = [px, pz]; const fin = (far - 0.8) ** 2, fout = (far + 0.8) ** 2;
      const far2 = far * 2.4 + 0.5, f2in = (far2 - 1) ** 2, f2out = (far2 + 1) ** 2;   // v14e the third tier past about 11 m (medium)
      for (const G_ of groups) { const cnt = [0, 0, 0], { list, ms, lt, sx, arm } = G_;
        for (let i = 0; i < list.length; i++) { const s = list[i], dx = s.x - px, dz = s.z - pz, d2 = dx * dx + dz * dz; if ((arm && d2 > 196) || s.hidden) continue;   // arms past 14 m hide behind the seat backs
          let l = s.lod ?? 0; if (force) l = d2 < far * far ? 0 : d2 < far2 * far2 ? 1 : 2; else if (l === 0) { if (d2 > fout) l = 1; } else if (l === 1) { if (d2 < fin) l = 0; else if (d2 > f2out) l = 2; } else if (d2 < f2in) l = 1;
          s.lod = l; const li = ms[l] ? l : ms[1] && l === 2 ? 1 : 0, m = ms[li], k = cnt[li]++;
          tmp.position.set(s.x, s.y, s.z); tmp.rotation.set(0, s.yaw, 0); tmp.scale.set(sx, 1, 1); tmp.updateMatrix(); m.setMatrixAt(k, tmp.matrix);
          const a = m.geometry.attributes; a.iLh.setXYZ(k, lt[i * 7], lt[i * 7 + 1], lt[i * 7 + 2]); a.iLf.setXYZ(k, lt[i * 7 + 3], lt[i * 7 + 4], lt[i * 7 + 5]); a.iLs.setX(k, lt[i * 7 + 6]); }
        ms.forEach((m, i) => { if (!m) return; m.count = cnt[i]; m.instanceMatrix.needsUpdate = true; for (const n of ['iLh', 'iLf', 'iLs']) m.geometry.attributes[n].needsUpdate = true; }); }
    },
  };
  return hall;
}
// the idle screen (the show system swaps in the countdown, then the film)
// v12 (the user: "the inside of the theatre sucks"): a pre-show card instead of a plain silver sheet: the hall's feature poster whole on
// the left in a gold rule, the same poster blurred and dimmed to fill the screen behind it, LUMIERE, the hall and tonight's title in
// gold and ivory. It stays bright and coloured, so the screen's size still reads under the house lights (v9.1b: a near-black slate made
// the screens look small)
const SLATE_FILM = { max: 'sintel', curve: 'cosmos', classic: 'bunny', x270: 'hero' };
// v14 My Theatre (phone.js app_theatre, the shop's themes): a hall recoloured live. Each part is the vertices of one library material in the
// hall's own meshes: the seats' upholstery (leather 8, velvet 1), the walls' acoustic fabric (9), the hall carpet (16), the drapes and
// curtains (velvet 1 in the shell, the curtain meshes). A colour of null puts the hall's own back (kept the first time a part changes).
// The light maps were baked with the hall's own colours, so a theme changes the colour of the cloth, not the light's bounce off it.
// v14 recolour a baked room's shell by library material id (home.js: the flat's walls, kitchen fronts, floor); hex null puts the baked tints back
export function tintShell(room, ids, hex) {
  const mesh = room && room.solid; if (!mesh) return false; const a = mesh.geometry.attributes, c = a.color, m = a.matid; if (!c || !m) return false;
  if (!mesh.userData.c0) mesh.userData.c0 = c.array.slice(); const c0 = mesh.userData.c0, col = hex ? new THREE.Color(hex) : null;
  // the baked tints go back as the attribute's raw values (a light-mapped shell's colours are normalised 16-bit: setXYZ would scale them again)
  for (let i = 0; i < c.count; i++) { if (!ids.includes(Math.round(m.getX(i)))) continue; if (col) c.setXYZ(i, col.r, col.g, col.b); else { c.array[3 * i] = c0[3 * i]; c.array[3 * i + 1] = c0[3 * i + 1]; c.array[3 * i + 2] = c0[3 * i + 2]; } }
  c.needsUpdate = true; return true;
}
export function themeHall(world, hallId, th = {}) {
  const h = world.hallById(hallId); if (!h) return false;
  const paint = (mesh, ids, hex) => { const a = mesh.geometry.attributes, c = a.color, m = a.matid; if (!c || !m) return; if (!mesh.userData.c0) mesh.userData.c0 = c.array.slice(); if (hex === undefined) return;
    const c0 = mesh.userData.c0, col = hex ? new THREE.Color(hex) : null;
    for (let i = 0; i < c.count; i++) { if (!ids.includes(Math.round(m.getX(i)))) continue; if (col) c.setXYZ(i, col.r, col.g, col.b); else { c.array[3 * i] = c0[3 * i]; c.array[3 * i + 1] = c0[3 * i + 1]; c.array[3 * i + 2] = c0[3 * i + 2]; } }   // v14 raw values back (setXYZ normalises)
    c.needsUpdate = true; };
  h.room.group.traverse((o) => { if (!o.isMesh) return;
    if (/^seats-/.test(o.name)) paint(o, [8, 1], th.seat ?? null);
    else if (/-shell$/.test(o.name)) { paint(o, [9], th.wall ?? null); paint(o, [16], th.carpet ?? null); paint(o, [1], th.curtain ?? null); }
    else if (o.name === 'curtain') paint(o, [1], th.curtain ?? null); });
  return true;
}
export function slateTexture(h) {
  const w = 1024, ht = Math.round(w / h.aspect), c = makeCanvas(w, ht), g = c.getContext('2d'), t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const F = filmById(SLATE_FILM[h.format] || 'sintel'), ls = (v) => { if ('letterSpacing' in g) g.letterSpacing = v + 'px'; };
  const draw = (im) => {
    g.fillStyle = '#12121a'; g.fillRect(0, 0, w, ht);
    if (im) { const s = Math.max(w / im.width, ht / im.height) * 1.12; g.save(); g.filter = 'blur(16px) brightness(0.6) saturate(1.15)'; g.drawImage(im, (w - im.width * s) / 2, (ht - im.height * s) / 2, im.width * s, im.height * s); g.restore(); }
    const vg = g.createLinearGradient(0, 0, w, 0); vg.addColorStop(0, 'rgba(8,8,14,0.1)'); vg.addColorStop(0.5, 'rgba(8,8,14,0.5)'); vg.addColorStop(1, 'rgba(8,8,14,0.78)'); g.fillStyle = vg; g.fillRect(0, 0, w, ht);
    const ph = ht * 0.8, pw = im ? ph * im.width / im.height : ph * 2 / 3, px = w * 0.07, py = (ht - ph) / 2;
    g.fillStyle = '#c9a35e'; g.fillRect(px - 3, py - 3, pw + 6, ph + 6); if (im) g.drawImage(im, px, py, pw, ph); else { g.fillStyle = '#1c1c26'; g.fillRect(px, py, pw, ph); }
    const x0 = px + pw + w * 0.04, tx = (x0 + w * 0.97) / 2; g.textAlign = 'center'; g.textBaseline = 'middle'; g.__fit = [x0, w * 0.97];
    g.fillStyle = '#e8c27a'; g.font = `500 ${ht * 0.15}px ${SERIF}`; ls(ht * 0.04); g.fillText('LUMIÈRE', tx, ht * 0.35); ls(0);
    g.fillStyle = '#c9a35e'; g.fillRect(tx - ht * 0.2, ht * 0.455, ht * 0.4, Math.max(2, ht * 0.006));
    g.fillStyle = 'rgba(242,235,221,.94)'; g.font = `600 ${ht * 0.052}px ${SANS}`; ls(ht * 0.03); g.fillText(h.name.replace('LUMIERE ', '') + '  ·  SCREEN ' + h.no, tx, ht * 0.56);
    if (F) { g.fillStyle = 'rgba(242,235,221,.72)'; g.font = `500 ${ht * 0.044}px ${SANS}`; g.fillText('TONIGHT  ·  ' + F.title.toUpperCase(), tx, ht * 0.665); }
    ls(0); g.__fit = null; t.needsUpdate = true;
  };
  draw(null); if (F) { const im = new Image(); im.onload = () => draw(im); im.src = posterURL(F.id); }
  return t;
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
  if (!('USE_ENV' in world.mats.defines)) return; const r = engine.renderer, prev = new Set(world.vis), rtPrev = r.getRenderTarget(); G.uEnvOn.value = 0;
  for (const key in world.rooms) { const room = world.rooms[key]; if (room.probe || (world.mats.heroOnly && !room.U.hero)) continue; const h = HALL_BY_KEY[key], at = h ? (() => { const w = h.toWorld(0, h.depthIn - 1.6); return [w.x, h.y0 + h.total + 1.6, w.z]; })() : PROBE_AT[key] || [0, 2, 0];
    const bx = ENV_BOX[key], rt = new THREE.WebGLCubeRenderTarget(bx ? 256 : 128, { generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter }), cam = new THREE.CubeCamera(0.1, bx ? 130 : 90, rt);
    cam.position.set(...at); world.setVisibility(key, at[0], at[1], at[2], true); cam.update(r, engine.scene); room.U.uEnvMap.value = rt.texture; room.probe = { rt, at };
    if (bx) { room.U.uEnvPos.value.set(...at); room.U.uEnvMin.value.set(bx[0], bx[1], bx[2]); room.U.uEnvMax.value.set(bx[3], bx[4], bx[5]); room.U.uEnvBox.value = 1; } }
  G.uEnvOn.value = 1; r.setRenderTarget(rtPrev);
  // put back what the player's place shows (rooms, doors and which rooms' furniture): the capture drew everything
  if (world._visArgs) world.setVisibility(...world._visArgs); else { world.vis = prev; for (const k in world.rooms) world.rooms[k].group.visible = prev.has(k); for (const d of world.doors) d.group.visible = d.rooms.some((k) => prev.has(k)); }
}
// ---------------------------------------------------------------- the world
export async function buildWorld(engine, mats, onProgress = () => {}) {
  const world = { mats, engine, rooms: {}, doors: [], halls: [], walls: new Walls(), vis: new Set(['lobby']), panels: {}, uses: [], bins: [], sitSpots: [], escalators: [], movers: [], dress: DRESS, keepOut: KEEP_OUT };   // dress: for tools/dev/props-overlap.mjs
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
      if (mats.lightMaps) { const mat = mats.litRoom(U, false, bk); mat.uniforms.uLmK.value.x *= gain; mat.uniforms.uLmK.value.y *= Math.min(gain, 10); m = new THREE.Mesh(geo, mat); room.bake = bk; U.uEnvK.value = (key.startsWith('hall') ? 0.4 : 1) / Math.max(0.05, bk.avg * gain); }   // v14 halls: dark, matte rooms; their reflections stay faint
      else { const g = geo.clone(); lights.bake(g); m = new THREE.Mesh(g, mats.litFor(U, g)); room.bake = { ...bk, maps: null }; }
      m.matrixAutoUpdate = false; m.name = key + '-shell'; group.add(m); room.solid = m;
      if (!bk._walls) { world.walls.fromGeometry(geo, def.kind === 'street' ? 3 : def.kind === 'hall' ? L1 + 5.2 : L1 + 2.2); bk._walls = true;   // v14e a hall's walls up to its VIP level's head height
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
    g.update = (dt, actors) => { const now = performance.now(); if (lamp.material.color) lamp.material.color.setHex(g.always || g.staff || g.passUntil > now ? 0x3ecf8e : 0xff4d5a);   // (test tools swap materials)
      if (actors) for (const a of actors) if (a.path && a.x > g.x0 - 0.4 && a.x < g.x1 + 0.4 && Math.abs(a.z - g.z) < 1.3 && (a.y || 0) < 1) { g.npcUntil = now + 1200; break; }
      g.target = g.always || g.staff || g.passUntil > now || g.npcUntil > now ? 1 : 0; g.open += (g.target - g.open) * (1 - Math.exp(-dt * 4)); grp.rotation.y = g.open * 1.5; };   // swings in, towards the escalator
    g.pass = (ms = 9000) => { g.passUntil = performance.now() + ms; };
    g.letsPlayer = () => (g.always || g.staff || g.passUntil > performance.now()) && g.open >= 0.6; }
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
    if (r && r.startsWith('hall')) { const h = HALL_BY_KEY[r], q = h.toLocal(x, z), v = vipFloor(h, q.u, q.d, y - h.y0); return h.y0 + (v !== null ? v : hallFloor(h, q.u, q.d)); }   // v14e the VIP stair, gallery and boxes
    if (r === 'corridor') return L1;
    if (r === 'lobby') { for (const e of world.escalators) if (e.contains(x, z)) { const fy = e.floor(z); if (y > fy - 1.0) return fy; }
      if (IN(CAB, x, z)) return world.lift.y; return y > L1 - 1.2 && onMezz(x, z) ? L1 : 0; }
    if (r === 'spine') { const sy = stairY(x, z, y); if (sy !== null) return sy; return world.travelator.contains(x, z) ? 0.12 : 0; }
    if (r === 'street') return z > STREET.kerb && z < STREET.road[1] ? -0.15 : 0;
    { const p = PV_BY_KEY[r]; if (p) { const q = p.toLocal(x, z); if (p.riser && q.d >= p.riser.d0 - 0.02 && q.d <= p.riser.d1 + 0.02) return p.riser.y; return p.theme !== 'drive' && q.d < 0.77 ? 0.18 : 0; } }   // v14e a private screen's riser and stage
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
      for (const s of world.segs) if (s.on && y > s.y0 - 0.5 && y < s.y1 && Math.abs(p.x - s.seg[0]) < 3 && Math.abs(p.z - s.seg[1]) < 3) seg(...s.seg);
      { const g = world.gate; if (!g.letsPlayer() && y < 1 && Math.abs(p.z - g.z) < 1 && p.x > g.x0 - 1 && p.x < g.x1 + 1) seg(g.x0, g.z, g.x1, g.z); }
      { const g = world.exitGate; if ((g.open < 0.6 || p.z > g.z) && y < 1 && Math.abs(p.z - g.z) < 1 && p.x > g.x0 - 1 && p.x < g.x1 + 1) seg(g.x0, g.z, g.x1, g.z); }   // one way: out only
    }
    return push;
  };
  world.collidersNear = () => [];   // v8 API (box colliders): walls are segments now (world.collide)
  // v14 movable barriers (home.js: the home cinema's door while it is shut)
  world.segs = []; world.addSegment = (ax, az, bx, bz, y0, y1) => { world.segs.push({ seg: [ax, az, bx, bz], y0, y1, on: true }); return world.segs.length - 1; }; world.segmentOn = (i, on) => { if (world.segs[i]) world.segs[i].on = !!on; };
  // portal visibility: you see a neighbour while the opening between you is open
  const GLASS = new Set(['lobby|street', 'street|lobby']);   // the lobby's glass front: the street is always in view
  const linkOpen = (a, b) => { if (GLASS.has(a + '|' + b)) return true; let any = false; for (const d of world.doors) if (d.rooms.includes(a) && d.rooms.includes(b)) { any = true; if (d.kind === 'open' || d.open > 0.02) return true; } return !any; };
  world.setVisibility = (room, x, y, z, all = false) => {
    if (!all) world._visArgs = [room, x, y, z];   // what the reflections' capture puts back
    // two links deep: from the street you see through the lobby's glass and on through its open portal into the corridor and through
    // the restroom door; from the spine through the lobby to the street (one link left those rooms undrawn: you saw the void there)
    // v14d (the user, 11-27: "the app lags a lot"): a hall is a big draw (its seats, its audience). Through a door you see into the room
    // behind it only from near the door: from a seat the hall drew the corridor, the spine, the lobby and the other halls (1M triangles).
    // A hall is drawn from outside while its door is within 25 m (15 m two rooms away); from inside a hall the rooms beyond the corridor
    // and the spine are drawn only within 7 m of the door you would look through
    const here0 = room || 'lobby', inHall = ROOMS[here0] && ROOMS[here0].kind === 'hall';
    const doorNear = (a, b, lim) => { for (const d of world.doors) if (d.rooms.includes(a) && d.rooms.includes(b)) { const w = d._wp || (d._wp = d.group.getWorldPosition(new THREE.Vector3())); if (Math.hypot(w.x - x, w.z - z) < lim) return true; } return false; };
    const v = new Set([here0]); let front = [...v];
    for (let hop = 0; hop < (all ? 1 : 2); hop++) { const next = []; for (const r of front) { const def = ROOMS[r]; if (!def) continue; if (!all && hop === 1 && inHall && !doorNear(here0, r, 7)) continue;
      for (const k of def.vis) if (!v.has(k) && (all || linkOpen(r, k)) && (all || ROOMS[k].kind !== 'hall' || doorNear(r, k, hop ? 15 : 25))) { v.add(k); next.push(k); } } front = next; }
    world.vis = v; for (const k in world.rooms) world.rooms[k].group.visible = v.has(k); for (const d of world.doors) d.group.visible = d.rooms.some((k) => v.has(k));
    // v11 a neighbouring room's furniture is drawn only from the rooms it can be made out from: the corridor's, the restrooms' and the
    // street's from the lobby (and their own room), the lobby's wherever the lobby itself is drawn. It switches only when you pass from
    // one room to another, as the rooms themselves do, never part way across a room (a threshold inside a room would make things pop).
    // v12 (the user: nothing may disappear while still in sight): which room sees which furniture is measured, not guessed:
    // tools/blender/arch/pvs.py ray-tests every prop mesh from every room's eye points. The street's is seen from the corridor (through
    // the lobby glass) and once from the restrooms' door, so it is hidden only in the spine and the halls; the lobby's deep props are seen
    // from the street through the glass (the chandelier among them), so they are never hidden
    const here = room || 'lobby', show = { corridor: here === 'corridor' || here === 'lobby', wc: here === 'wc' || here === 'lobby', street: here === 'street' || here === 'lobby' || here === 'corridor' || here === 'wc' };
    for (const k in show) { const rm = world.rooms[k]; if (!rm) continue; if (!rm.propMeshes || !rm.propMeshes.length) rm.propMeshes = rm.group.children.filter((o) => o.name === k + '-props' || o.name === k + '-propglow' || o.name === k + '-foliage');   // looked up again until the props exist (reflections are captured before them)
      for (const m of rm.propMeshes) m.visible = all || world.propCull === false || show[k]; }
    const lob = world.rooms.lobby; if (lob) { if (!lob.deepMeshes || !lob.deepMeshes.length) lob.deepMeshes = lob.group.children.filter((o) => o.name === 'lobby-propsdeep' || o.name === 'lobby-propglowdeep' || o.name === 'lobby-foliagedeep');
      for (const m of lob.deepMeshes) m.visible = true; }
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
