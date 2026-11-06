// LUMIERE v9 - the world, loaded from the Blender building (tools/blender/arch -> tools/bake -> www/bake). Each room's shell is its baked
// GLB with the Cycles light maps; its emitters, lights and panels come from www/bake/<room>_x.json. The engine adds what moves or what
// you use: doors (one-way where the flow needs it), the two escalators, the lift, the travelator, the hall seats (instanced), the
// screens and the curtains. Floors are computed from building.js and hallmath.js (the numbers the model was built from); the walls you
// bump into are read from the shell itself (every near-vertical face, cut into 0.5 m height bands), so you collide with what you see.
import * as THREE from 'three';
import { BAKES } from './lightmap.js';
import { Lights } from './bake.js';
import { roomUniforms, G } from './materials.js';
import { Acc, toGeometry, M, MAT, boxGeo } from './geom.js';
import { HALL, L1, ROOMS, DOORS, ESC, escProfile, LIFT, TRAVELATOR, GATE, LOBBY, MEZZ, SPINE, BRIDGE, FLANK_W, LINK_W, PANTRY, FLANK_E, LINK_E, WC, STREET, EXIT_STAIRS } from './building.js';
import { hallSeats, hallFloor, SEAT, SCREEN_GAP, WALL } from './hallmath.js';
import { ASSETS, assetGeometry, placeAsset } from './assets.js';
import { texturesReady, named } from './library.js';
import { makeCanvas, SANS, SERIF } from './textures.js';
import { posterURL } from './films.js';
const frame = () => new Promise((r) => requestAnimationFrame(() => r()));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), IN = (r, x, z, m = 0) => x >= r.x0 - m && x <= r.x1 + m && z >= r.z0 - m && z <= r.z1 + m;
const b64f = (s) => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return new Float32Array(u.buffer); };
const HALLS = Object.values(HALL), HALL_BY_KEY = Object.fromEntries(HALLS.map((h) => [h.key, h])), CORR = [BRIDGE, FLANK_W, LINK_W, PANTRY, FLANK_E, LINK_E];
export const STEP_UP = 0.4, HEAD = 1.75;
// target average light level per room with its house lights up (docs/V9-DESIGN.md section 5: bright spine, dim Dolby corridor)
// ambient fill on top of the light map (dims with the house lights): the dim corridor's dark walls stay readable, the night street too
const FILL = { corridor: 0.3, street: 0.03 };
export const LEVEL = { hallMax: 0.5, hallCurve: 0.5, hallClassic: 0.55, hall270: 0.5, lobby: 0.42, corridor: 0.22, spine: 0.8, wc: 0.55, street: 0.25 };
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
  for (const r of CORR) if (IN(r, x, z)) return 'corridor';
  return null;
}
const SHAFT = { x0: LIFT.x0 - 0.15, x1: LIFT.x1 + 0.15, z0: LIFT.z0 - 0.15, z1: LIFT.z1 }, CAB = { x0: LIFT.x0, x1: LIFT.x1, z0: LIFT.z0, z1: LIFT.z1 + 0.01 };
const onMezz = (x, z) => z >= MEZZ.z0 && z <= MEZZ.z1 && !IN(MEZZ.void, x, z) && !IN(SHAFT, x, z);
function stairY(x, z, y) {
  for (const s of EXIT_STAIRS) {
    if (x < Math.min(s.x0, s.x1) || x > Math.max(s.x0, s.x1)) continue;
    const t = (z - s.zTop) * s.dir, back = (z - s.zDoor) * s.dir;
    if (t < 0 && back > -0.95) { if (y > s.y0 - 0.8) return s.y0; continue; }
    if (t >= 0 && t < s.n * s.tread) { const ys = s.y0 - (Math.floor(t / s.tread) + 1) * s.rise; if (y > ys - 0.8) return ys; }
  }
  return null;
}
// ---------------------------------------------------------------- collision: wall segments in 2 m buckets, each with its height range
class Walls {
  constructor() { this.S = []; this.B = new Map(); }
  add(ax, az, bx, bz, y0, y1) {
    const i = this.S.length / 6; this.S.push(ax, az, bx, bz, y0, y1);
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
        if (best < 1e-4) continue; this.add(pa[0], pa[2], pb[0], pb[2], y0, y1);
      }
    }
  }
  near(x, z, out) { out.length = 0; const gx = Math.floor(x / 2), gz = Math.floor(z / 2), l = this.B.get(gx * 4096 + gz); if (l) for (const i of l) out.push(i); return out; }
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
  const exit = kind === 'push', c = exit ? '#2b2e34' : '#4a141c';
  a.add(boxGeo(lw, h, t), m(lw / 2, h / 2, 0), c, { mat: exit ? MAT.powder : MAT.leather });
  if (astragal) a.add(boxGeo(0.05, h - 0.02, 0.012), m(lw + 0.01, h / 2, astragal * (t / 2 + 0.006)), exit ? '#3a3d44' : '#c9a061', { mat: exit ? MAT.powder : MAT.brass });
  for (const z of [-1, 1]) {
    if (exit) { a.add(boxGeo(lw - 0.3, 0.05, 0.05), m(lw / 2 + 0.05, 1.0, z * (t / 2 + 0.04)), '#c9ccd2', { mat: MAT.chrome }); a.add(boxGeo(0.24, 0.4, 0.006), m(lw / 2, 1.62, z * (t / 2 + 0.002)), '#0a0c0e', { mat: MAT.glass }); }
    else { for (let r = 0; r < 6; r++) for (let q = 0; q < 3; q++) { const y = 0.45 + r * 0.32 + (q % 2 ? 0.16 : 0), x = lw * (0.22 + q * 0.28); if (y > h - 0.35) continue; a.add(boxGeo(0.022, 0.022, 0.012), m(x, y, z * (t / 2 + 0.004)), '#c9a061', { mat: MAT.brass }); }
      a.add(boxGeo(0.4, 0.06, 0.03), m(lw - 0.3, 1.06, z * (t / 2 + 0.02)), '#c9a061', { mat: MAT.brass }); a.add(boxGeo(lw - 0.1, 0.18, 0.006), m(lw / 2, 0.12, z * (t / 2 + 0.003)), '#c9a061', { mat: MAT.brass }); } }
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
// the lift: a glass-backed cab between G and L1; its doors open at the floor it stands at while someone is near or inside
class Lift {
  constructor(world, Lf) {
    Object.assign(this, { L: Lf, y: 0, level: 0, target: 0, state: 'idle', doors: [0, 0], hold: 0, t: 0 }); const room = world.rooms.lobby, U = room.U;
    const a = new Acc(), x0 = Lf.x0 + 0.02, x1 = Lf.x1 - 0.02, z0 = Lf.z0 + 0.02, z1 = Lf.z1 - 0.18, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, W = x1 - x0, D = z1 - z0, H = 2.45;
    a.add(boxGeo(W, 0.06, D), M(cx, -0.025, cz), '#2a2522', { mat: MAT.granite });   // 5 mm proud of the shaft floor a.add(boxGeo(W, 0.05, D), M(cx, H + 0.025, cz), '#d9d2c5', { mat: MAT.metal });
    a.add(boxGeo(0.03, H, D), M(x0 + 0.015, H / 2, cz), '#b9bcc2', { mat: MAT.chrome }); a.add(boxGeo(0.03, H, D), M(x1 - 0.015, H / 2, cz), '#b9bcc2', { mat: MAT.chrome });
    a.add(boxGeo(W, H, 0.03), M(cx, H / 2, z0 + 0.015), '#3b2f25', { mat: MAT.wood }); a.add(boxGeo(W - 0.2, 1.1, 0.01), M(cx, 1.45, z0 + 0.035), '#a8b4bc', { mat: MAT.chrome });
    a.add(boxGeo(0.05, 0.05, D - 0.1), M(x0 + 0.06, 0.95, cz), '#c9a35e', { mat: MAT.brass }); a.add(boxGeo(0.05, 0.05, D - 0.1), M(x1 - 0.06, 0.95, cz), '#c9a35e', { mat: MAT.brass });
    for (const sx of [-1, 1]) a.add(boxGeo(0.5, H, 0.06), M(sx < 0 ? x0 + 0.25 : x1 - 0.25, H / 2, z1 - 0.03), '#3b2f25', { mat: MAT.powder });
    const g = toGeometry(a); room.lights.bake(g); const lh = g.attributes.lh.array; for (let i = 0; i < lh.length; i++) lh[i] = lh[i] * 0.4 + 0.35;   // the cab's own ceiling light
    this.cab = new THREE.Mesh(g, world.mats.litFor(U, g)); this.cab.name = 'lift-cab'; room.group.add(this.cab);
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.3, D - 0.3), world.mats.glowMat(U)); gl.rotation.x = Math.PI / 2; gl.position.set(cx, H - 0.01, cz);
    gl.geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(12).fill(2.2), 3)); gl.geometry.setAttribute('grp', new THREE.BufferAttribute(new Float32Array(4), 1)); this.cab.add(gl); this.cab.position.y = 0;
    this.cx = cx; this.zDoor = Lf.z1 - 0.07; this.dw = 1.4;
    this.leaves = Lf.stops.map((ly) => [-1, 1].map((s) => { const q = new Acc(); q.add(boxGeo(this.dw / 2, 2.3, 0.04), M(0, 1.15, 0), '#9ea2a8', { mat: MAT.metal }); const lg = toGeometry(q); lg.translate(cx, ly, this.zDoor); room.lights.bake(lg); lg.translate(-cx, -ly, -this.zDoor);
      const m = new THREE.Mesh(lg, world.mats.litFor(U, lg)); m.name = 'lift-door'; m.position.set(cx + s * this.dw / 4, ly, this.zDoor); room.group.add(m); return { m, s }; }));
    this.inner = { x0: x0 + 0.1, x1: x1 - 0.1, z0: z0 + 0.1, z1: Lf.z1 - 0.1 };
  }
  inside(x, z) { return IN(this.inner, x, z); }
  atDoor(x, y, z, k) { return Math.abs(y - this.L.stops[k]) < 1.2 && Math.abs(x - this.cx) < 1.0 && z > this.L.z1 - 0.2 && z < this.L.z1 + 1.6; }
  call(k) { if (this.state === 'idle' && this.level === k) { this.hold = 5; return; } if (this.state === 'idle') { this.target = k; this.state = 'closing'; this.t = 0; } }
  update(dt, actors, onEvent) {
    const lv = this.level, near = actors.some((a) => (this.inside(a.x, a.z) && Math.abs((a.y || 0) - this.y) < 1.2) || this.atDoor(a.x, a.y || 0, a.z, lv));
    if (this.state === 'idle') { const want = near || this.hold > 0 ? 1 : 0; this.hold -= dt; this.doors[lv] += (want - this.doors[lv]) * (1 - Math.exp(-dt * 3)); }
    else if (this.state === 'closing') { this.doors[lv] = Math.max(0, this.doors[lv] - dt * 0.9); if (this.doors[lv] <= 0) { this.state = 'moving'; this.t = 0; this.from = this.y; onEvent && onEvent('move'); } }
    else if (this.state === 'moving') { const d = this.L.stops[this.target] - this.from, T = Math.abs(d) / this.L.speed + 1.2; this.t += dt; const u = Math.min(1, this.t / T), e = u * u * (3 - 2 * u); this.y = this.from + d * e;
      if (u >= 1) { this.level = this.target; this.state = 'idle'; this.hold = 5; onEvent && onEvent('ding'); } }
    this.cab.position.y = this.y;
    this.leaves.forEach((pair, k) => { const o = this.doors[k]; for (const L of pair) L.m.position.x = this.cx + L.s * (this.dw / 4 + o * this.dw * 0.47); });
  }
  doorSegs() { return this.L.stops.map((ly, k) => ({ seg: [this.cx - this.dw / 2, this.L.z1 - 0.07, this.cx + this.dw / 2, this.L.z1 - 0.07], y0: ly, y1: ly + 2.3, on: this.doors[k] < 0.75 || this.level !== k || this.state !== 'idle' })); }
}
// ---------------------------------------------------------------- panels: LED wall, boards, signs (canvas textures, back-lit)
function panelTexture(id, w, h, hooks) {
  const px = Math.min(2048, Math.max(256, Math.round(w * 128))), py = Math.round(px * h / w), c = makeCanvas(px, py), g = c.getContext('2d'), tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4; c.__tex = tx;
  const draw = hooks[id.split('_')[0]]; if (draw) draw(g, px, py, id); else { g.fillStyle = '#111'; g.fillRect(0, 0, px, py); }
  return { tex: tx, canvas: c, g };
}
// the builder placed the west-wall boards at the wall's centre line (tools/blender/arch/rooms.py: x0 + 0.21); its face is 0.2 m further in
const NUDGE = { showtimes: 0.22, menu: 0.22 };
export const PANEL_DRAW = {
  sign: (g, w, h, id) => { const H_ = HALL[id.split('_')[1]]; g.fillStyle = '#07080c'; g.fillRect(0, 0, w, h); g.fillStyle = '#e3b25f'; g.font = `600 ${h * 0.5}px ${SANS}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    if ('letterSpacing' in g) g.letterSpacing = `${h * 0.08}px`; g.fillText(H_ ? H_.name.replace('LUMIERE ', '') : id, w / 2, h * 0.52); if ('letterSpacing' in g) g.letterSpacing = '0px'; g.fillRect(w * 0.3, h * 0.86, w * 0.4, h * 0.03); },
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
  wayfind: (g, w, h, id) => { const k = id.split('_')[1], T = { screens: ['SCREENS 1 – 4', '↑', 'MAX  ·  CURVE  ·  CLASSIC  ·  X·270'], wc: ['RESTROOMS', '', ''], tickets: ['TICKETS', '', 'BOX OFFICE'], food: ['FOOD & DRINKS', '', 'POPCORN  ·  NACHOS  ·  COFFEE'] }[k] || [k.toUpperCase(), '', ''];
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
  marquee: (g, w, h) => { g.fillStyle = '#0a0a0d'; g.fillRect(0, 0, w, h); g.fillStyle = '#f2ebdd'; g.font = `500 ${h * 0.56}px ${SERIF}`; g.textAlign = 'center'; g.textBaseline = 'middle'; if ('letterSpacing' in g) g.letterSpacing = `${h * 0.3}px`; g.fillText('LUMIÈRE', w / 2, h * 0.54); if ('letterSpacing' in g) g.letterSpacing = '0px'; },
  arrival: (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#120d24'); gr.addColorStop(1, '#2a1640'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#e3b25f'; g.font = `600 ${h * 0.14}px ${SANS}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('SCREENS 1 – 4', w / 2, h * 0.42); g.fillStyle = 'rgba(242,235,221,.8)'; g.font = `400 ${h * 0.07}px ${SANS}`; g.fillText('MAX  ·  CURVE  ←      CLASSIC  ·  270  →', w / 2, h * 0.62); },
};
// ---------------------------------------------------------------- props: the furniture of each room (Kiln / Blender assets), lit per vertex
const RAD = Math.PI / 180, FACADE_Z = LOBBY.z1, DRESS = (() => {
  const L = [], add = (room, name, x, y, z, yaw = 0, o = {}) => L.push({ room, name, x, y, z, yaw, o });
  // the lounge: four curved sofas round the table, each one's concave seat side facing it (sofa_curve sits facing local +z, its arc's centre
  // 2.0 m in front of its origin); yaw -r - 90 deg turns +z towards the table (v9 had them radial, at -r + 180 deg)
  for (const a of [0, 90, 180, 270]) { const r = a * RAD; add('lobby', 'sofa_curve', -1 + 2.4 * Math.cos(r), 0, 1 + 2.4 * Math.sin(r), -r - Math.PI / 2); }   // square to the axes: their collision boxes stay tight
  add('lobby', 'table_lounge', -1, 0, 1); for (const [x, z] of [[-8, 16.4], [8, 16.4], [-20.9, 16.2], [20.9, 16.2], [-20.9, -12.9], [20.9, 9.5], [-6.5, -12.9], [6.5, -12.9]]) add('lobby', 'planter_tall', x, 0, z);
  add('lobby', 'poster_totem', -5.2, 0, 14.2, 0.35); add('lobby', 'poster_totem', 5.2, 0, 14.2, -0.35); add('lobby', 'poster_totem', 5.0, 0, 7.6, 0.3);
  // the box-office queue: two rope lines guiding you to the counter
  const posts = []; for (const x of [-14.4, -13.0]) for (let z = 5.6; z <= 12.6; z += 1.75) { add('lobby', 'stanchion', x, 0, z); posts.push([x, z]); }
  for (const x of [-14.4, -13.0]) for (let z = 5.6; z < 12.5; z += 1.75) add('lobby', 'rope_velvet', x, 0, z + 0.875, Math.PI / 2, { collide: 0.02 });
  for (const [z, yaw] of [[-7.6, Math.PI / 2], [-6.5, Math.PI / 2], [-3.0, Math.PI / 2], [-1.7, Math.PI / 2]]) add('lobby', z > -5 ? 'drinks_fountain' : 'popcorn_machine', -21.62, 0.92, z, yaw, { collide: false, ground: false });
  add('lobby', 'candy_wall', -21.7, 0, 0.0, Math.PI / 2);
  for (const [x, z] of [[-14.8, -10.3], [6.0, 2.4], [-2.4, -12.6], [19.8, -2.6], [-14.8, 2.6]]) add('lobby', 'bin_brass', x, 0, z);
  add('lobby', 'bench_velvet', 21.25, 0, 5.0, Math.PI / 2); add('lobby', 'bench_velvet', 21.25, 0, -6.5, Math.PI / 2);
  // v9.1 (the user: "eliminate empty spaces ... waiting areas, furniture, plants"): waiting areas by the facade, two east of the doors and one
  // west: deco tub chairs in pairs across a marble side table, a torchere beside them; the ribbon chandelier in the ceiling rings over the
  // lounge; the brand in lit gold letters over the box office and the concessions; planters by the poster wall's benches
  for (const [cx, cz] of [[11.5, 12.6], [16.5, 12.6], [-9.5, 15.2]]) { add('lobby', 'armchair_deco', cx - 0.85, 0, cz, Math.PI / 2); add('lobby', 'armchair_deco', cx + 0.85, 0, cz, -Math.PI / 2); add('lobby', 'side_table', cx, 0, cz); add('lobby', 'torchere_deco', cx, 0, cz + 1.3, 0, { collide: 0.2 }); }
  add('lobby', 'chandelier_cascade', 0, 8.55, 4.0, 0, { collide: false, ground: false });
  add('lobby', 'letters_lumiere_lit', -21.58, 5.25, 4.0, Math.PI / 2, { collide: false, ground: false });
  add('street', 'letters_lumiere_lit', 0, 10.75, FACADE_Z + 0.42, 0, { collide: false, ground: false, scale: 1.6 });   // the brand over the canopy, on the stone band
  for (const x of [-40, -33, 33, 40]) add('street', 'planter_tree', x, 0, 21.4);
  for (const z of [7.9, 2.1, -4.1, -8.9]) add('lobby', 'planter_tall', 21.1, 0, z);
  for (let x = -40; x <= 40; x += 10) add('street', 'lamp_post', x, 0, 25.55, Math.PI / 2, { collide: 0.05 });
  for (let x = -14; x <= 14; x += 2.8) if (Math.abs(x) > 2.5) add('street', 'bollard_light', x, 0, 25.6);
  add('street', 'planter_hedge', -15, 0, 21.2); add('street', 'planter_hedge', 15, 0, 21.2); add('street', 'planter_tree', -26, 0, 22); add('street', 'planter_tree', 26, 0, 22);
  for (const z of [-16.2, -40, -60]) { add('spine', 'bin_brass', -3.75, 0, z); add('spine', 'planter_tall', 3.75, 0, z); }
  for (const [x, z, yaw] of [[BRIDGE.x0 + 1.0, -30, Math.PI / 2], [BRIDGE.x1 - 1.0, -30, -Math.PI / 2]]) add('corridor', 'bench_velvet', x, L1, z, yaw);
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
    const room = world.rooms[key]; if (!room) continue; const host = { pacc: new Acc(), gacc: new Acc(), bins: [], col: (x0, z0, x1, z1, y0, y1) => { for (const [ax, az, bx, bz] of [[x0, z0, x1, z0], [x1, z0, x1, z1], [x1, z1, x0, z1], [x0, z1, x0, z0]]) world.walls.add(ax, az, bx, bz, y0, y1); } };
    for (const p of byRoom[key]) { const A = ASSETS[p.name]; if (!A) continue; const lift = p.o.ground === false ? 0 : -A.box.min.y; placeAsset(host, p.name, p.x, p.y + lift, p.z, p.yaw, p.o); }
    if (host.pacc.count) { const g = toGeometry(host.pacc); room.lights.bake(g); const m = new THREE.Mesh(g, world.mats.litFor(room.U, g)); m.matrixAutoUpdate = false; m.name = key + '-props'; room.group.add(m); }
    if (host.gacc.count) { const g = toGeometry(host.gacc, false); const m = new THREE.Mesh(g, world.mats.glowMat(room.U)); m.matrixAutoUpdate = false; m.name = key + '-propglow'; room.group.add(m); }
    for (const b of host.bins) world.bins.push({ ...b, room: key, y: room.def.level || 0 });
  }
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
  const slate = slateTexture(h), picMat = pictureMat(slate); picMat.uniforms.uGain.value = 0.55; const pic = new THREE.Mesh(pg, picMat); pic.renderOrder = 1; pic.name = h.key + '-picture'; room.group.add(pic);
  { const bg = pg.clone(), I = bg.index.array; for (let k = 0; k < I.length; k += 3) { const t = I[k + 1]; I[k + 1] = I[k + 2]; I[k + 2] = t; }   // seen from behind (the passage beside the screen): dark cloth, not a hole into the hall
    const back = new THREE.Mesh(bg, new THREE.MeshBasicMaterial({ color: 0x060607 })); back.name = h.key + '-picture-back'; back.matrixAutoUpdate = false; room.group.add(back); }
  // the analytic screen light (people, held items): six patches across the curve
  const patches = []; for (let i = 0; i < 6; i++) { const ua = -W / 2 + W * i / 6, ub = ua + W / 6, a = h.toWorld(ua, h.screenD(ua)), b = h.toWorld(ub, h.screenD(ub)), tx = (b.x - a.x) / 2, tz = (b.z - a.z) / 2, tl = Math.hypot(tx, tz) || 1, sg = (tz / tl) * -f >= 0 ? 1 : -1;
    patches.push({ c: [(a.x + b.x) / 2, yb + Hh / 2, (a.z + b.z) / 2], u: [tx, 0, tz], v: [0, Hh / 2, 0], n: [sg * tz / tl, 0, -sg * tx / tl], su: 3, sv: 3 }); }
  L.setScreen(patches);
  // curtains (CURVE, CLASSIC): two pleated halves that gather to the sides
  let curtains = null;
  if (h.curtain) { const cw = W / 2 + 0.7, top = yb + Hh + 0.55, dC = h.sagD + 0.5, base = h.toWorld(0, dC), ms = [];
    for (const s of [-1, 1]) { const n = 30, pp = [], ii = []; for (let i = 0; i <= n; i++) { const t = i / n, x = -s * t * cw, fold = (i % 2 ? 1 : -1) * 0.07; pp.push(x, h.y0 + 0.02, fold, x, top, fold); if (i < n) { const k = i * 2; if (s < 0) ii.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); else ii.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } }
      const g0 = new THREE.BufferGeometry(); g0.setAttribute('position', new THREE.Float32BufferAttribute(pp, 3)); g0.setIndex(ii); g0.computeVertexNormals(); const a = new Acc(); a.add(g0, null, h.id === 'CLASSIC' ? '#5a1a24' : '#2a2f4a', { mat: MAT.fabric });
      { const g1 = g0.clone(), I1 = g1.index.array, N1 = g1.attributes.normal; for (let k = 0; k < I1.length; k += 3) { const t = I1[k + 1]; I1[k + 1] = I1[k + 2]; I1[k + 2] = t; }   // cloth has two sides: the back of each pleat
        for (let k = 0; k < N1.count; k++) N1.setXYZ(k, -N1.getX(k), -N1.getY(k), -N1.getZ(k)); a.add(g1, null, h.id === 'CLASSIC' ? '#4a1620' : '#23283f', { mat: MAT.fabric }); }
      const geo = toGeometry(a);
      const m = new THREE.Mesh(geo, mats.litFor(U, geo)); m.name = 'curtain'; m.rotation.y = -f * Math.PI / 2; const o = h.toWorld(s * cw, dC); m.position.set(o.x, 0, o.z); m.updateMatrixWorld(true);
      geo.applyMatrix4(m.matrixWorld); L.bake(geo); geo.applyMatrix4(m.matrixWorld.clone().invert()); room.group.add(m); ms.push(m); }
    curtains = { meshes: ms, open: 0, target: 0, base }; }
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
const PIC_FRAG = `uniform sampler2D map; uniform vec4 uBox; uniform vec4 uSrc; uniform float uGain; varying vec2 vUv;
void main() { vec2 q = (vUv - uBox.xy) / uBox.zw; float inside = step(0.0, q.x) * step(q.x, 1.0) * step(0.0, q.y) * step(q.y, 1.0);
  vec3 c = texture2D(map, uSrc.xy + clamp(q, 0.0, 1.0) * uSrc.zw).rgb; gl_FragColor = vec4(c * uGain * inside, 1.0);
  #include <colorspace_fragment>
}`;
export function pictureMat(map = null) { return new THREE.ShaderMaterial({ vertexShader: PIC_VERT, fragmentShader: PIC_FRAG, uniforms: { map: { value: map }, uBox: { value: new THREE.Vector4(0, 0, 1, 1) }, uSrc: { value: new THREE.Vector4(0, 0, 1, 1) }, uGain: { value: 1 } } }); }   // uSrc: the part of the frame shown (the 270 hall's split mode shows the middle third)
// ---------------------------------------------------------------- reflections: one 128 px cube per room
const PROBE_AT = { lobby: [0, 2.2, 6], street: [0, 2, 24], wc: [27, 1.6, -4], corridor: [0, L1 + 1.6, -18], spine: [0, 1.6, -40] };
function captureReflections(world, engine) {
  if (!('USE_ENV' in world.mats.defines)) return; const r = engine.renderer, prev = new Set(world.vis); G.uEnvOn.value = 0;
  for (const key in world.rooms) { const room = world.rooms[key], h = HALL_BY_KEY[key], at = h ? (() => { const w = h.toWorld(0, h.depthIn - 1.6); return [w.x, h.y0 + h.total + 1.6, w.z]; })() : PROBE_AT[key] || [0, 2, 0];
    const rt = new THREE.WebGLCubeRenderTarget(128, { generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter }), cam = new THREE.CubeCamera(0.1, 90, rt);
    cam.position.set(...at); world.setVisibility(key, at[0], at[1], at[2], true); cam.update(r, engine.scene); room.U.uEnvMap.value = rt.texture; room.probe = { rt, at }; }
  G.uEnvOn.value = 1; world.vis = prev;
}
// ---------------------------------------------------------------- the world
export async function buildWorld(engine, mats, onProgress = () => {}) {
  const world = { mats, engine, rooms: {}, doors: [], halls: [], walls: new Walls(), vis: new Set(['lobby']), panels: {}, uses: [], bins: [], sitSpots: [], escalators: [], movers: [] };
  engine.scene.background = new THREE.Color(0x07070a);
  world.hallByKey = (k) => world.halls.find((h) => h.key === k); world.hallById = (id) => world.halls.find((h) => h.id === id);
  const keys = Object.keys(ROOMS); let i = 0;
  const X = Object.fromEntries(await Promise.all(keys.map(async (k) => { try { const r = await fetch(`./bake/${k}_x.json`); return [k, r.ok ? await r.json() : null]; } catch (e) { return [k, null]; } })));
  for (const key of keys) {
    onProgress(0.05 + 0.5 * i++ / keys.length, key); await frame();
    const x = X[key], def = ROOMS[key], U = roomUniforms(), group = new THREE.Group(); group.name = key; engine.scene.add(group);
    const lights = new Lights({ ceil: def.ceil || 4, rect: def.rect }); if (x) { lights.L = x.lights.L; lights.shapes = x.lights.shapes; lights.amb = x.lights.amb; }
    const room = { key, def, U, group, lights, x, gain: 1 }; world.rooms[key] = room; U.uFill.value = FILL[key] || 0;
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
      if (!bk._walls) { world.walls.fromGeometry(geo, def.kind === 'street' ? 3 : L1 + 2.2); bk._walls = true; }
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
  { const g = world.gate = { x0: GATE.gate[0], x1: GATE.gate[1], z: GATE.z, open: 0, target: 0 }, w = g.x1 - g.x0 - 0.06, grp = new THREE.Group(), a = new Acc();
    a.add(boxGeo(w, 0.05, 0.05), M(w / 2, 1.0, 0), '#c9a35e', { mat: MAT.brass }); a.add(boxGeo(0.05, 1.0, 0.05), M(w - 0.025, 0.5, 0), '#c9a35e', { mat: MAT.brass }); const fg = toGeometry(a);
    fg.translate(g.x0 + 0.03, 0, g.z); world.rooms.lobby.lights.bake(fg); fg.translate(-(g.x0 + 0.03), 0, -g.z); { const gm = new THREE.Mesh(fg, mats.litFor(world.rooms.lobby.U, fg)); gm.name = 'gate'; grp.add(gm); }
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.06, 0.9), mats.glassMat()); pane.position.set(w / 2, 0.52, 0); grp.add(pane); grp.position.set(g.x0 + 0.03, 0, g.z); world.rooms.lobby.group.add(grp); g.group = grp;
    g.update = (dt) => { g.open += (g.target - g.open) * (1 - Math.exp(-dt * 4)); grp.rotation.y = g.open * 1.5; };   // swings in, towards the escalator
    g.pass = (ms = 9000) => { g.target = 1; clearTimeout(g._t); g._t = setTimeout(() => { g.target = 0; }, ms); }; }
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
      { const g = world.gate; if (g.open < 0.6 && y < 1 && Math.abs(p.z - g.z) < 1 && p.x > g.x0 - 1 && p.x < g.x1 + 1) seg(g.x0, g.z, g.x1, g.z); }
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
  };
  world.update = (dt, actors, now) => {
    for (const d of world.doors) d.update(dt, actors); const lob = world.rooms.lobby.group.visible;
    if (lob) for (const e of world.escalators) e.update(dt); if (world.rooms.spine.group.visible) world.travelator.update(dt); world.lift.update(dt, actors, world.onLift); world.gate.update(dt);
    for (const h of world.halls) if (h.curtains) { const c = h.curtains; if (c.open !== c.target || (c.sway || 0) > 0.002) { c.open += Math.sign(c.target - c.open) * Math.min(Math.abs(c.target - c.open), dt / 4.5); const u = c.open, e = u * u * u * (u * (u * 6 - 15) + 10);
      c.sway = c.open !== c.target ? 1 : (c.sway || 0) * Math.exp(-dt * 1.4); c.t = (c.t || 0) + dt; for (const m of c.meshes) { m.scale.x = 1 - 0.93 * e; m.scale.z = 1 + 3.2 * e; } } }
  };
  world.probe = (x, y, z) => { const r = world.rooms[roomAt(x, y, z) || 'lobby']; return r ? r.lights.probe(x, y, z) : null; };
  onProgress(0.9, 'reflections'); await texturesReady(); await frame(); captureReflections(world, engine);
  world.setVisibility('lobby', 0, 0, 8, true); for (const h of world.halls) { const w = h.cfg.toWorld(0, h.cfg.depthIn); h.updateLOD({ position: { x: w.x, z: w.z } }, true); }
  onProgress(1, 'ready');
  return world;
}
