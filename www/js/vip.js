// LUMIERE v14e - the VIP boxes (the user, 11-27, with photos of Dubai's IMAX VIP boxes; 11-28: "somewhat premium seat and things in other
// theatres too", not themed). Five boxes on each hall's rear wall over the last rows (hallmath.js vipLayout; halls.py vip_level builds and
// bakes the walnut tubs, the gallery and its stair), each with leather club recliners (and side tables in the MAX's wider boxes). Rented
// for your visit: a velvet rope closes each box's way in from the gallery until it is yours. The recliners are placed here (vipDress ->
// world9 DRESS); the ropes, the boxes' signs and their remotes live here. A rented box watches the hall's show; its remote plays it.
import * as THREE from 'three';
import { HALL } from './building.js';
import { MAT, Acc, toGeometry } from './geom.js';
import { makeCanvas, SANS, SERIF } from './textures.js';
import { makeRemote } from './remote.js';

export const VIP_PRICE = 350;
// a box's recliners: two club seats between three arms facing the picture, 1.04 m apart (the halls' club pitch); the MAX's 4.5 m boxes add
// a side table at each end. [model, du (across, from the box's middle), dd (from the box's front), options]
function boxKit(w) {
  const L = [['seat_club', -0.52, 1.15, {}], ['seat_club', 0.52, 1.15, {}]];
  for (const du of [-1.04, 0, 1.04]) L.push(['arm_club', du, 1.15, { collide: false, lod: 1 }]);   // the arms' LOD1: five boxes a hall add up
  if (w > 4.2) for (const s of [-1, 1]) L.push(['side_table', s * 1.5, 1.2, {}]);
  return L;
}
// a box's point (across from its middle du, back from its front dd) in the world, on the VIP floor
function at(h, b, du, dd) { const w = h.toWorld(b.uc + du, b.d0 + dd); return { x: w.x, y: h.y0 + h.vip.y, z: w.z }; }
// the boxes' furniture and the ropes' brass posts (world9 DRESS entries: static, merged into the hall's props)
export function vipDress() {
  const L = [];
  for (const h of Object.values(HALL)) { const V = h.vip; if (!V) continue; const yaw = h.dir * Math.PI / 2;   // a prop's front (+z) towards the picture
    for (const b of V.boxes) { const w = b.u1 - b.u0;
      for (const [name, du, dd, o] of boxKit(w)) { const p = at(h, b, du, dd); L.push({ room: h.key, name, x: p.x, y: p.y, z: p.z, yaw, o: { ...o, vip: true } }); }
      for (const s of [-1, 1]) { const p = at(h, b, s * (w / 2 - 0.12), V.BD + 0.25); L.push({ room: h.key, name: 'stanchion', x: p.x, y: p.y, z: p.z, yaw, o: { collide: false } }); } } }
  return L;
}
// the box a point stands in (hall-local footprint), or null
export function boxAt(h, x, y, z) {
  const V = h && h.vip; if (!V || y < h.y0 + V.y - 0.6) return null; const q = h.toLocal(x, z);
  return V.boxes.find((b) => q.u >= b.u0 - 0.05 && q.u <= b.u1 + 0.05 && q.d >= b.d0 - 0.35 && q.d <= b.d1 + 0.02) || null;
}

export class VIP {
  constructor(world, o = {}) {
    this.world = world; this.o = o; this.rented = {}; this.boxes = [];
    for (const hall of world.halls) { const h = hall.cfg, V = h && h.vip; if (!V) continue; const room = hall.room;
      for (const b of V.boxes) { const box = { hall, h, b, room, key: hall.id + ':' + b.i, w: b.u1 - b.u0 }; this.boxes.push(box); this._rope(box); this._sign(box); this._remote(box); } }
  }
  isRented(box) { return !!this.rented[box.key]; }
  price() { return VIP_PRICE; }
  label(box) { return this.o.name ? this.o.name(box) : 'VIP ' + box.b.n; }
  // a velvet rope across the box's way in from the gallery: a crimson catenary between the brass posts (vipDress), solid until rented
  _rope(box) {
    const { h, b, room } = box, V = h.vip, a = at(h, b, -(box.w / 2 - 0.12), V.BD + 0.25), c = at(h, b, box.w / 2 - 0.12, V.BD + 0.25), y = a.y + 0.86, pts = [];
    for (let i = 0; i <= 16; i++) { const t = i / 16; pts.push(new THREE.Vector3(a.x + (c.x - a.x) * t, y - 0.16 * Math.sin(Math.PI * t), a.z + (c.z - a.z) * t)); }
    const g0 = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 32, 0.028, 8, false), acc = new Acc(); acc.add(g0, null, '#5a0f17', { mat: MAT.velvet });
    const geo = toGeometry(acc); room.lights.bake(geo); const m = new THREE.Mesh(geo, this.world.mats.litFor(room.U, geo)); m.name = 'vip-rope'; m.frustumCulled = false; room.group.add(m);
    const i0 = this.world.walls.S.length / 6; this.world.walls.add(a.x, a.z, c.x, c.z, a.y + 0.05, a.y + 1.4); box.rope = { m, i0, i1: this.world.walls.S.length / 6, mid: { x: (a.x + c.x) / 2, y: y - 0.1, z: (a.z + c.z) / 2 } };
  }
  // the box's plate on the rear wall behind it (backlit brass: VIP and the box's number), seen from the gallery and from the box
  _sign(box) {
    const { h, b, room } = box, w = h.toWorld(b.uc, h.depthIn - 0.008), c = makeCanvas(512, 160), g = c.getContext('2d'), name = 'BOX ' + b.n;
    const gr = g.createLinearGradient(0, 0, 0, 160); gr.addColorStop(0, '#1c1714'); gr.addColorStop(1, '#0c0a09'); g.fillStyle = gr; g.fillRect(0, 0, 512, 160);
    g.strokeStyle = '#c9a35e'; g.lineWidth = 6; g.strokeRect(8, 8, 496, 144); g.fillStyle = '#c9a35e'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `600 30px ${SANS}`; if ('letterSpacing' in g) g.letterSpacing = '10px'; g.fillText('VIP', 256, 50); if ('letterSpacing' in g) g.letterSpacing = '4px';
    g.fillStyle = '#f3e7cf'; g.font = `500 56px ${SERIF}`; g.__fit = [24, 488]; g.fillText(name, 256, 106); g.__fit = null;
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.47), new THREE.MeshBasicMaterial({ map: t, toneMapped: false }));
    m.position.set(w.x, h.y0 + h.vip.y + 2.05, w.z); m.name = 'vip-sign'; room.group.add(m); box.sign = m;
    m.rotation.y = Math.atan2(h.toWorld(b.uc, 0).x - w.x, h.toWorld(b.uc, 0).z - w.z);   // facing the picture (into the box)
  }
  // a remote on the box's side (it plays the hall's show for you once the box is yours)
  _remote(box) {
    // on the box's right-hand ledge (the parapet's cap, 0.89 m up), along it, half way back
    const { h, b, room } = box, r = makeRemote({ flat: true }), q = at(h, b, box.w / 2, 1.5); r.visible = false; r.position.set(q.x, q.y + 0.893, q.z); r.rotation.y = h.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    r.traverse((o) => { if (o.material && o.name.startsWith('hit:')) o.visible = false; }); r.name = 'vip-remote'; room.group.add(r); box.remote = { m: r, at: { x: q.x, y: q.y + 0.91, z: q.z } };
  }
  // keep: a Story rental, kept on this phone until midnight (Quick play's free boxes are not kept)
  rent(box, pay, keep = false) {
    if (this.rented[box.key]) return true; if (pay && !pay(VIP_PRICE)) return false;
    this.rented[box.key] = true; this._rope1(box); if (keep) this._save(); return true;
  }
  // the rope up (solid) or down (put away) for the box's state
  _rope1(box) { const W = this.world.walls, R = box.rope, on = !this.rented[box.key]; R.m.visible = on; if (box.remote) box.remote.m.visible = !on && !box.remote.m.userData.away;   // the remote lies there only in a rented box
    if (!R.ys) { R.ys = []; for (let i = R.i0; i < R.i1; i++) R.ys.push(W.S[6 * i + 4], W.S[6 * i + 5]); }
    if (on) for (let i = R.i0, k = 0; i < R.i1; i++, k += 2) { W.S[6 * i + 4] = R.ys[k]; W.S[6 * i + 5] = R.ys[k + 1]; } else W.off(R.i0, R.i1); }
  // a new game: Story brings back today's kept rentals, Quick starts with every box roped (opened free on the spot)
  setMode(story) { this.rented = {}; if (story) for (const k of this._load()) this.rented[k] = true; for (const box of this.boxes) this._rope1(box); }
  _day() { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  _load() { try { const o = JSON.parse(localStorage.getItem('lumiere.vip.v1') || 'null'); return o && o.day === this._day() && Array.isArray(o.keys) ? o.keys.filter((k) => typeof k === 'string' && this.boxes.some((b) => b.key === k)) : []; } catch (e) { return []; } }
  _save() { try { localStorage.setItem('lumiere.vip.v1', JSON.stringify({ day: this._day(), keys: Object.keys(this.rented).filter((k) => this.rented[k]) })); } catch (e) { /* storage off */ } }
  // the box you stand in and own (null outside one)
  // where the phone's VIP app puts you: inside the box by its open back, facing the picture
  entry(box) { const p = at(box.h, box.b, 0, box.h.vip.BD - 0.7); return { ...p, yaw: box.h.dir * Math.PI / 2 + Math.PI }; }
  mine(hallKey, x, y, z) { const box = this.boxes.find((q) => q.hall.key === hallKey && q.b === boxAt(q.h, x, y, z)); return box && this.isRented(box) ? box : null; }
  // what the crosshair offers on the VIP level: rent a box at its rope, pick up its remote once it is yours
  prompt(room, player, lookAt, t, quick) {
    if (!room || !room.startsWith('hall')) return null;
    for (const box of this.boxes) { if (box.hall.key !== room) continue; const R = box.rope.mid;
      if (!this.isRented(box) && Math.abs(player.y - (R.y - 0.76)) < 1.0 && lookAt(R.x, R.y, R.z, 0.9, 2.8)) { const nm = this.label(box), price = VIP_PRICE;
        return { label: quick ? t('vip.open', { name: nm }) : t('vip.rent', { name: nm, price: price.toLocaleString() }), fn: () => this.o.onRent && this.o.onRent(box) }; }
      const M = box.remote.at; if (this.isRented(box) && box.remote.m.visible && lookAt(M.x, M.y, M.z, 0.3, 2.2)) return { label: t('vip.remote'), fn: () => this.o.onRemote && this.o.onRemote(box) }; }
    return null;
  }
}
