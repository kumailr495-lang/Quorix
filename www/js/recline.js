// LUMIERE v12 - your own seat reclines, and the cup holders beside it take what you hold (the user: "premium seats with recline and
// everything, actual reclining and sounds"; "a hole where you put the drink or the popcorn").
// The instanced seat you sit in is hidden and a copy made from its model's parts takes its place: the back and headrest turn about the
// cushion's rear edge, the footrest swings up from the seat's front, a motor hums while it moves (sound9.js recliner) and your eye
// settles back and down with it (player.js recline). The consoles either side of a club recliner carry two cup holders each
// (tools/blender/seats.py arm_club: CupA, CupB): what you hold can go into the nearest free one and comes back out to your hand.
import * as THREE from 'three';
import { ASSETS, assetGeometry } from './assets.js';
import { Acc, toGeometry } from './geom.js';
import { makeHeld, setHeldMaterial } from './held.js';

const BACK = /^(Back|Headrest)/, FOOT = /^Footrest/, CUP = /^Cup[AB]Well/, TRAVEL = 2.2;   // seconds, end to end
const BACK_TILT = 0.38, FOOT_LIFT = 1.3;   // radians: about 22 and 75 degrees (v14, the user: "the seat reclines a lot"; it was 32)
const flip = new THREE.Matrix4().makeRotationY(Math.PI);

export class Recliner {
  constructor(world, sound, itemMat) { this.world = world; this.sound = sound; this.itemMat = itemMat; this.cur = null; this.t = 0; this.target = 0; this.cups = []; this._wells = null; }
  // which seats recline: the club recliners (CURVE's rows and sofas, MAX's pods)
  can(seat) { return !!seat && seat.fam === 'seat_club'; }
  attach(hall, seat) {
    this.detach(); if (!hall || !this.can(seat)) return false;
    const U = hall.room.U, mats = this.world.mats, lt = hall.seatLit.subarray(seat.i * 7, seat.i * 7 + 7);
    const piece = (pick) => {
      const g = assetGeometry('seat_club', 0, flip, toGeometry, Acc, hall.over, pick); if (!g || !g.attributes.position.count) return null;
      for (const [k, w, o] of [['iLh', 3, 0], ['iLf', 3, 3], ['iLs', 1, 6]]) g.setAttribute(k, new THREE.InstancedBufferAttribute(Float32Array.from(lt.subarray(o, o + w)), w));
      const m = new THREE.InstancedMesh(g, mats.litFor(U, g, true), 1); m.setMatrixAt(0, new THREE.Matrix4()); m.frustumCulled = false; g.computeBoundingBox(); return m; };
    const rest = piece((n) => !BACK.test(n) && !FOOT.test(n)), back = piece((n) => BACK.test(n)), foot = piece((n) => FOOT.test(n));
    if (!rest || !back || !foot) { [rest, back, foot].forEach((m) => m && m.geometry.dispose()); return false; }
    const bb = back.geometry.boundingBox, fb = foot.geometry.boundingBox;
    const fwd = Math.sign((fb.min.z + fb.max.z) - (bb.min.z + bb.max.z)) || -1;   // the seat's front along local z
    const backPivot = new THREE.Group(), footPivot = new THREE.Group();
    backPivot.position.set(0, bb.min.y + 0.04, fwd > 0 ? bb.max.z : bb.min.z); back.position.copy(backPivot.position).negate(); backPivot.add(back);
    footPivot.position.set(0, fb.max.y, (fb.min.z + fb.max.z) / 2); foot.position.copy(footPivot.position).negate(); footPivot.add(foot);
    const root = new THREE.Group(); root.name = 'recliner'; root.position.set(seat.x, seat.y, seat.z); root.rotation.y = seat.yaw; root.scale.set(seat.sx || 1, 1, 1); root.add(rest, backPivot, footPivot);
    hall.room.group.add(root); hall.hideSeat(seat, true);
    this.cur = { hall, seat, root, backPivot, footPivot, fwd, holders: this._holders(hall, seat) }; this.t = this.target = 0; this.cups = [];
    return true;
  }
  // leaving the seat: the seat comes back upright, whatever is in the holders comes back to you (the first, if your hands are free)
  detach(handsFree = true) {
    const c = this.cur; if (!c) return null; let back = null;
    for (const cup of this.cups) { if (handsFree && !back) back = cup.held; c.hall.room.group.remove(cup.mesh); }
    this.cups = []; c.hall.room.group.remove(c.root); c.root.traverse((o) => { if (o.isMesh) o.geometry.dispose(); }); c.hall.hideSeat(c.seat, false); this.cur = null; this.t = this.target = 0;
    return back;
  }
  toggle() { if (!this.cur) return; this.target = this.target > 0.5 ? 0 : 1; this.sound.recliner && this.sound.recliner(TRAVEL * Math.abs(this.target - this.t)); }
  get reclined() { return this.target > 0.5; }
  update(dt, player) {
    const c = this.cur; if (!c) { player.recline = 0; return; }
    const d = this.target - this.t; this.t += Math.sign(d) * Math.min(Math.abs(d), dt / TRAVEL); const e = this.t * this.t * (3 - 2 * this.t);
    c.backPivot.rotation.x = -c.fwd * BACK_TILT * e; c.footPivot.rotation.x = -c.fwd * FOOT_LIFT * e; player.recline = e;
  }
  // the cup holders of the consoles either side of the seat, in world space: [{ p: Vector3, used }]
  _holders(hall, seat) {
    const W = this._wellsLocal(); if (!W.length) return [];
    const near = hall.arms.filter((a) => a.row === seat.row && a.an === 'arm_club').sort((a, b) => Math.abs(a.a - seat.a) - Math.abs(b.a - seat.a)).slice(0, 2);
    const out = [], m = new THREE.Matrix4(), q = new THREE.Quaternion();
    for (const a of near) { m.compose(new THREE.Vector3(a.x, a.y, a.z), q.setFromEuler(new THREE.Euler(0, a.yaw, 0)), new THREE.Vector3(1, 1, 1)).multiply(flip);
      for (const w of W) out.push({ p: w.clone().applyMatrix4(m), used: false }); }
    const me = new THREE.Vector3(seat.x, seat.y, seat.z); return out.sort((a, b) => a.p.distanceTo(me) - b.p.distanceTo(me));
  }
  // the wells' top centres in the console model's own frame (engine axes, before the instancing turn)
  _wellsLocal() {
    if (this._wells) return this._wells; const A = ASSETS.arm_club; this._wells = [];
    if (A) for (const p of A.parts) { if (p.lod !== 0 || !CUP.test(p.name)) continue; p.geo.computeBoundingBox(); const b = p.geo.boundingBox; this._wells.push(new THREE.Vector3((b.min.x + b.max.x) / 2, b.max.y, (b.min.z + b.max.z) / 2)); }
    return this._wells;
  }
  freeHolder() { return this.cur ? this.cur.holders.find((h) => !h.used) || null : null; }
  hasItem() { return this.cups.length > 0; }
  // put what you hold (held: main.js's { kind, left, max, name }) into the nearest free holder; false if there is none
  put(held) {
    const h = this.freeHolder(); if (!h || !held) return false;
    const mesh = makeHeld(held); setHeldMaterial(mesh, this.itemMat); if (mesh.userData.setLevel) mesh.userData.setLevel(held.left / held.max);
    mesh.position.copy(h.p); mesh.position.y += held.kind === 'eat' || held.kind === 'popcorn' ? 0.04 : 0.06; mesh.rotation.y = this.cur.seat.yaw; this.cur.hall.room.group.add(mesh);
    h.used = true; this.cups.push({ held: { ...held }, mesh, h }); this.sound.cupKnock && this.sound.cupKnock(false); return true;
  }
  // take the last thing put down back into your hand
  take() {
    const cup = this.cups.pop(); if (!cup) return null; cup.h.used = false; this.cur.hall.room.group.remove(cup.mesh); this.sound.cupKnock && this.sound.cupKnock(true); return cup.held;
  }
}
