// LUMIERE v14 - your cars and motorbikes (the user, 11-20: "cars, motorcycles", "buy ... cars, motorcycles", "car physics just like gta 6").
// The garage: the motorbike is yours from the start; the saloon and the classic cab are bought in the phone's Garage app, each in paints you
// buy once and swap freely (kept on this device: lumiere.garage.v1). What you own waits in the parking bays west of the cinema's doors.
// Handling (per frame while you drive): the body has its own velocity, so it can slide. Throttle, brake and reverse act along the heading;
// the tyres hold the car against sliding sideways (grip), a handbrake lets the rear go (a drift: grip drops, the yaw rate builds); the
// steering lock falls with speed; the body pitches under throttle and braking and rolls in turns on springs; the kerbs, the street's ends and
// the street's solid things (world.collide: posts, bins, trees, cars) stop you with a knock you hear. Tyres squeal and leave skid marks
// when they slide. The camera follows on a spring and widens with speed; the motorbike is ridden from the rider's eyes and leans.
// Sound: sound9.js vehicle, screech and horn (an engine on a five-speed box, tyre hiss and squeal); a horn makes the people near you look (npc9.js startle).
import * as THREE from 'three';
import { assetGeometry } from './assets.js';
import { Acc, toGeometry } from './geom.js';
import { MAT } from './library.js';
import { STREET } from './building.js';
import { carFloor } from './traffic.js';

const ROAD_Y = -0.15, X0 = STREET.x0 + 4, X1 = STREET.x1 - 4, Z0 = STREET.kerb + 1.25, Z1 = STREET.far - 1.25;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const KEY = 'lumiere.garage.v1', HEX = /^#[0-9a-f]{6}$/i, PAINT_PRICE = 500;
// what can be owned: the model, its paint's material (swapped per paint), handling numbers (wheelbase m, half extents, top speed m/s,
// acceleration m/s2, reverse top m/s, steering lock rad, grip 1/s, mass feel), where it parks
export const GARAGE = [
  { id: 'moto', kind: 'moto', model: 'motorcycle', price: 0, paintMat: 'lacquer_red', paints: ['#7a1c24', '#141416', '#1e2c4a', '#d8d4cc', '#c9a35e'],
    wb: 1.45, half: [0.4, 1.05], vmax: 21, acc: 5.2, rev: 1.6, lock: 0.6, grip: 9, y: 0, park: [-20.4, 27.6, Math.PI / 2] },
  { id: 'sedan', kind: 'car', model: 'car_sedan', price: 8000, paintMat: 'car_red', paints: ['#0a0a0c', '#5a0d14', '#9a9ca2', '#14213d', '#e8e4da', '#123222'],
    wb: 2.7, half: [0.95, 2.3], vmax: 24, acc: 4.4, rev: 4.5, lock: 0.55, grip: 7.5, y: ROAD_Y, park: [-15.5, 27.85, Math.PI / 2] },
  { id: 'cab', kind: 'car', model: 'car_taxi', price: 6000, paintMat: 'car_yellow', paints: ['#d9a514', '#0a0a0c', '#f2efe6', '#3a5a3a'],
    wb: 2.75, half: [0.95, 2.35], vmax: 22, acc: 4.0, rev: 4.2, lock: 0.55, grip: 7.2, y: ROAD_Y, park: [-9.9, 27.85, Math.PI / 2] },
];
const lin = (hex) => new THREE.Color(hex).toArray();

export class Vehicles {
  constructor(world, mats, sound, hooks = {}) {
    this.world = world; this.mats = mats; this.sound = sound; this.hooks = hooks; this.list = []; this.cur = null; this.camPos = new THREE.Vector3(); this.camLook = new THREE.Vector3();
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(0, 0, 0, 'YXZ'); this._H = [0, 0, 0]; this._F = [0, 0, 0]; this.hand = false; this.speed = 0; this.listeners = new Set();
    let s = null; try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { s = null; } this.s = this._clean(s);
    const room = world.rooms.street; this.room = room; if (!room) return;
    this._skids(); this.spawnAll();
  }
  _clean(s) {
    const o = { own: { moto: 1 }, paint: {}, paints: {} }; if (!s || typeof s !== 'object') return o;
    if (s.own && typeof s.own === 'object') for (const g of GARAGE) if (s.own[g.id]) o.own[g.id] = 1;
    if (s.paint && typeof s.paint === 'object') for (const g of GARAGE) { const p = s.paint[g.id]; if (typeof p === 'string' && HEX.test(p) && g.paints.includes(p.toLowerCase())) o.paint[g.id] = p.toLowerCase(); }
    if (s.paints && typeof s.paints === 'object') { o.paints = {}; for (const k of Object.keys(s.paints)) if (/^[a-z]+\.#[0-9a-f]{6}$/i.test(k)) o.paints[k] = 1; } else o.paints = {};
    return o;
  }
  _save() { try { localStorage.setItem(KEY, JSON.stringify(this.s)); } catch (e) { /* storage off */ } for (const f of this.listeners) { try { f(this); } catch (e) { console.warn('[garage]', e); } } }
  onChange(f) { this.listeners.add(f); return () => this.listeners.delete(f); }
  // ---------------------------------------------------------------- the garage (the phone's Garage app)
  owns(id) { return !!this.s.own[id]; }
  paintOf(id) { const g = GARAGE.find((q) => q.id === id); return this.s.paint[id] || (g ? g.paints[0] : null); }
  ownsPaint(id, hex) { const g = GARAGE.find((q) => q.id === id); return !!g && (hex === g.paints[0] || !!this.s.paints[id + '.' + hex]); }
  paintPrice() { return PAINT_PRICE; }
  buy(id, credits) { const g = GARAGE.find((q) => q.id === id); if (!g || this.owns(id)) return !!g; if (!credits.spend(g.price, 'garage:' + id)) return false; this.s.own[id] = 1; this._save(); this.spawnAll(); this.hooks.event && this.hooks.event('carBuy'); return true; }
  paint(id, hex, credits) {
    const g = GARAGE.find((q) => q.id === id); if (!g || !this.owns(id) || !g.paints.includes(hex)) return false;
    if (!this.ownsPaint(id, hex)) { if (!credits.spend(PAINT_PRICE, 'garage:paint')) return false; this.s.paints[id + '.' + hex] = 1; }
    this.s.paint[id] = hex; this._save(); this.spawnAll(); return true;
  }
  // ---------------------------------------------------------------- the owned vehicles in their bays (rebuilt when you buy or repaint)
  spawnAll() {
    if (!this.room) return; const keep = new Map(this.list.map((v) => [v.id, v]));
    for (const v of this.list) { if (v === this.cur) continue; this.room.group.remove(v.mesh); v.mesh.geometry.dispose(); if (v.snd) { v.snd.stop(); v.snd = null; } }
    this.list = this.cur ? [this.cur] : [];
    for (const G of GARAGE) {
      if (!this.owns(G.id) || (this.cur && this.cur.id === G.id)) continue; const old = keep.get(G.id), at = old ? [old.x, old.z, old.h] : G.park;
      const over = { [G.paintMat]: { id: MAT.lacquer, tint: lin(this.paintOf(G.id)) } }, g = assetGeometry(G.model, 0, null, toGeometry, Acc, over); if (!g) continue;
      for (const [n, k] of [['iLh', 3], ['iLf', 3], ['iLs', 1]]) g.setAttribute(n, new THREE.InstancedBufferAttribute(new Float32Array(k), k));
      const mesh = new THREE.InstancedMesh(g, this.mats.litFor(this.room.U, g, true), 1); mesh.frustumCulled = false; mesh.name = 'vehicle-' + G.id; this.room.group.add(mesh);
      const v = { id: G.id, kind: G.kind, S: G, mesh, x: at[0], z: at[1], h: at[2], vx: 0, vz: 0, w: 0, steer: 0, snd: null, lean: 0, pitch: 0, roll: 0, dp: 0, dr: 0, slip: 0 }; this.list.push(v); this._place(v);
    }
  }
  _place(v) {
    this._e.set(v.kind === 'car' ? v.pitch : 0, v.h, v.kind === 'moto' ? -v.lean : -v.roll, 'YXZ'); this._q.setFromEuler(this._e);
    this._m.compose(new THREE.Vector3(v.x, v.S.y, v.z), this._q, new THREE.Vector3(1, 1, 1)); v.mesh.setMatrixAt(0, this._m); v.mesh.instanceMatrix.needsUpdate = true;
    this.room.lights.at(v.x, 0.9, v.z, 0, 1, 0, this._H, this._F); carFloor(this._H); const G = v.mesh.geometry.attributes; G.iLh.array.set(this._H); G.iLf.array.set(this._F); G.iLh.needsUpdate = G.iLf.needsUpdate = true;
  }
  // ---------------------------------------------------------------- skid marks: a ring of dark quads on the asphalt (1 cm up, offset in depth)
  _skids() {
    const N = 240; this.skN = N; this.skI = 0; this.skLast = new Map(); const P = new Float32Array(N * 4 * 3), A = new Float32Array(N * 4), I = [];
    for (let i = 0; i < N; i++) I.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('alpha', new THREE.BufferAttribute(A, 1)); g.setIndex(I);
    const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4,
      vertexShader: 'attribute float alpha; varying float vA; void main() { vA = alpha; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'varying float vA; void main() { gl_FragColor = vec4(0.012, 0.012, 0.014, vA * 0.55); }' });
    const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = 1; mesh.name = 'skids'; this.room.group.add(mesh); this.sk = { g, P, A };
  }
  _skid(key, x, z, hx, hz, a) {   // a quad from the wheel's last point to this one, 10 cm wide
    const last = this.skLast.get(key); this.skLast.set(key, { x, z, a }); if (!last || a <= 0.02 || Math.hypot(x - last.x, z - last.z) > 1.5) return;
    const i = this.skI++ % this.skN, P = this.sk.P, A = this.sk.A, w = 0.06, rx = hz * w, rz = -hx * w, y = ROAD_Y + 0.008, o = i * 12;
    P.set([last.x - rx, y, last.z - rz, last.x + rx, y, last.z + rz, x + rx, y, z + rz, x - rx, y, z - rz], o); A.set([last.a, last.a, a, a], i * 4);
    this.sk.g.attributes.position.needsUpdate = true; this.sk.g.attributes.alpha.needsUpdate = true;
  }
  // ---------------------------------------------------------------- getting in and out
  near(x, z) { let best = null, bd = 9; for (const v of this.list) { if (v === this.cur) continue; const d = Math.hypot(v.x - x, v.z - z); if (d < (v.kind === 'car' ? 2.9 : 1.9) && d < bd) { bd = d; best = v; } } return best; }
  enter(v) { this.cur = v; v.vx = v.vz = v.w = 0; v.steer = 0; this.camPos.set(v.x - Math.sin(v.h) * 6.5, 2.4, v.z - Math.cos(v.h) * 6.5); this.camLook.set(v.x, 1, v.z); this.fov = null;
    if (this.sound.vehicle && !v.snd) v.snd = this.sound.vehicle(); if (this.sound.carDoor && v.kind === 'car') this.sound.carDoor(false); this.hooks.event && this.hooks.event('drive'); return v; }
  exit(player) {   // out on the kerb side (toward the cinema) if there is room, else on the far side
    const v = this.cur; if (!v) return; this.cur = null; v.vx = v.vz = v.w = 0; v.pitch = v.roll = v.lean = 0; this._place(v); if (v.snd) { v.snd.stop(); v.snd = null; } if (this._scr) this._scr.set(0);
    if (this.sound.carDoor && v.kind === 'car') this.sound.carDoor(false); this.hand = false;
    const sx = Math.cos(v.h), sz = -Math.sin(v.h), side = sz < 0 ? 1 : -1, off = v.kind === 'car' ? 1.6 : 0.9;
    let px = v.x + sx * off * side, pz = v.z + sz * off * side; if (pz > STREET.far - 0.6 || pz < STREET.z0 + 0.6) { px = v.x - sx * off * side; pz = v.z - sz * off * side; }
    player.place(px, pz, v.h + Math.PI, 0, 0); player.locked = false; if (this.restore) { this.restore(); this.restore = null; }
  }
  get driving() { return !!this.cur; }
  horn() { if (!this.cur) return; if (this.sound.horn) this.sound.horn(this.cur.kind); this.hooks.horn && this.hooks.horn(this.cur.x, this.cur.z); }
  // ---------------------------------------------------------------- per frame while driving: input, handling, collisions, camera
  update(dt, player, cam, obstacles = []) {
    if (!this.cur) return; const v = this.cur, S = v.S, k = player.keys;
    let thr = player.stick.y, st = player.stick.x; if (k.KeyW || k.ArrowUp) thr = 1; if (k.KeyS || k.ArrowDown) thr = -1; if (k.KeyA || k.ArrowLeft) st = -1; if (k.KeyD || k.ArrowRight) st = 1;
    thr = Math.abs(thr) < 0.12 ? 0 : clamp(thr, -1, 1); st = Math.abs(st) < 0.1 ? 0 : clamp(st, -1, 1); const hand = this.hand || !!k.Space;
    // the physics in steps of 1/30 s or less (a slow frame takes several), the camera once
    const n = Math.min(6, Math.max(1, Math.ceil(dt / 0.034))); for (let i = 0; i < n; i++) this._step(v, S, dt / n, thr, st, hand, obstacles);
    this._view(v, S, dt, player, cam);
  }
  _step(v, S, dt, thr, st, hand, obstacles) {
    const fx = Math.sin(v.h), fz = Math.cos(v.h), rx = Math.cos(v.h), rz = -Math.sin(v.h);
    let vF = v.vx * fx + v.vz * fz, vL = v.vx * rx + v.vz * rz;
    // along the heading: engine (falls off toward top speed), brakes, reverse, rolling drag and air drag; the handbrake drags too
    let a = 0; if (thr > 0) a = vF < -0.2 ? 10 : S.acc * thr * (1 - Math.max(0, vF) / S.vmax); else if (thr < 0) a = vF > 0.3 ? -11 * -thr : -2.6 * -thr * (1 - Math.max(0, -vF) / S.rev);
    else a = -Math.sign(vF) * Math.min(Math.abs(vF) / dt, 0.9 + 0.012 * vF * vF); if (hand) a -= Math.sign(vF) * Math.min(Math.abs(vF) / dt, 3.2);
    vF = clamp(vF + a * dt, -S.rev, S.vmax);
    // steering: the lock narrows with speed; the bicycle model's yaw rate, more of it under the handbrake (the rear lets go)
    const lock = S.lock / (1 + Math.abs(vF) * 0.075); v.steer += (st * lock - v.steer) * Math.min(1, dt * 6);
    const wTarget = (vF / S.wb) * Math.tan(v.steer) * (hand && v.kind === 'car' ? 1.45 : 1); v.w += (wTarget - v.w) * Math.min(1, dt * (hand ? 3 : 8));
    v.h = wrap(v.h + v.w * dt);
    // sideways: the tyres pull the slide out (grip), much less with the handbrake on; the turn itself throws the body outward a little
    const grip = hand ? S.grip * 0.22 : S.grip; vL += (-vL * (1 - Math.exp(-grip * dt))) + (hand ? -v.w * vF * 0.03 * dt * 10 : 0);
    const nfx = Math.sin(v.h), nfz = Math.cos(v.h), nrx = Math.cos(v.h), nrz = -Math.sin(v.h); v.vx = nfx * vF + nrx * vL; v.vz = nfz * vF + nrz * vL; v.slip = Math.abs(vL);
    let nx = v.x + v.vx * dt, nz = v.z + v.vz * dt, hit = 0;
    // the kerbs and the street's ends (half-length along the heading, half-width across it)
    const ex = Math.abs(nfx) * S.half[1] + Math.abs(nfz) * S.half[0], ez = Math.abs(nfz) * S.half[1] + Math.abs(nfx) * S.half[0];
    if (nx < X0 + ex || nx > X1 - ex) { nx = clamp(nx, X0 + ex, X1 - ex); hit = Math.max(hit, Math.abs(v.vx)); v.vx *= -0.25; }
    if (nz < Z0 + ez - 1.2 || nz > Z1 - ez + 1.2) { nz = clamp(nz, Z0 + ez - 1.2, Z1 - ez + 1.2); hit = Math.max(hit, Math.abs(v.vz)); v.vz *= -0.25; }
    // the street's solid things and other vehicles: two circles along the body (front and back) pushed out by world.collide
    const r = v.kind === 'car' ? 0.95 : 0.45, off = v.kind === 'car' ? 1.25 : 0.45;
    for (const s of [1, -1]) { const p = { x: nx + nfx * off * s, z: nz + nfz * off * s }, px = p.x, pz = p.z; const push = this.world.collide(p, r, 0); if (push > 0.01) { nx += p.x - px; nz += p.z - pz; const sp = Math.hypot(v.vx, v.vz); hit = Math.max(hit, sp * Math.min(1, push * 6)); } }
    for (const o of obstacles) { const d = Math.hypot(nx - o.x, nz - o.z), rr = (o.r || 1.9) + (v.kind === 'car' ? 1.7 : 0.9); if (d < rr) { const ux = (nx - o.x) / (d || 1), uz = (nz - o.z) / (d || 1); nx = o.x + ux * rr; nz = o.z + uz * rr; hit = Math.max(hit, Math.hypot(v.vx, v.vz)); v.vx *= 0.3; v.vz *= 0.3; } }
    for (const w of this.list) if (w !== v) { const d = Math.hypot(nx - w.x, nz - w.z), rr = (v.kind === 'car' ? 1.7 : 0.9) + (w.kind === 'car' ? 1.9 : 0.9); if (d < rr) { nx = w.x + (nx - w.x) / (d || 1) * rr; nz = w.z + (nz - w.z) / (d || 1) * rr; hit = Math.max(hit, Math.hypot(v.vx, v.vz)); v.vx *= 0.3; v.vz *= 0.3; } }
    if (hit > 2.2) { if (this.sound.thud) this.sound.thud(); this.shake = Math.min(0.35, hit * 0.03); }
    v.x = nx; v.z = nz;
    // the body on its springs: nose up under throttle, down under braking, rolled out of the turn; the bike leans into it
    const accF = a, latA = v.w * vF; v.dp += ((-accF * 0.006) - v.pitch) * 60 * dt - v.dp * 9 * dt; v.pitch += v.dp * dt; v.pitch = clamp(v.pitch, -0.06, 0.06);
    v.dr += ((latA * 0.004) - v.roll) * 55 * dt - v.dr * 8 * dt; v.roll += v.dr * dt; v.roll = clamp(v.roll, -0.07, 0.07);
    if (v.kind === 'moto') v.lean += (clamp(-v.steer * Math.abs(vF) * 0.09, -0.5, 0.5) - v.lean) * Math.min(1, dt * 4);
    this._hand = hand; this._acc = a;
  }
  _view(v, S, dt, player, cam) {
    const hand = this._hand, vF = v.vx * Math.sin(v.h) + v.vz * Math.cos(v.h), nfx = Math.sin(v.h), nfz = Math.cos(v.h), nrx = Math.cos(v.h), nrz = -Math.sin(v.h);
    this._place(v); const spd = Math.hypot(v.vx, v.vz); this.speed = spd; if (v.snd) v.snd.set(v.x, v.z, spd, 1.6, this.gear(spd, S));
    // tyres: squeal and marks when the slide passes 1.6 m/s (or the handbrake locks them at speed)
    const sq = clamp((v.slip - 1.6) / 4, 0, 1) + (hand && Math.abs(vF) > 4 ? 0.35 : 0); if (this.sound.screech) { if (!this._scr) this._scr = this.sound.screech(); if (this._scr) this._scr.set(Math.min(1, sq), v.x, v.z); }
    if (v.kind === 'car') for (const s of [-1, 1]) { const wx = v.x - nfx * S.wb * 0.5 + nrx * 0.78 * s, wz = v.z - nfz * S.wb * 0.5 + nrz * 0.78 * s; this._skid(v.id + s, wx, wz, nfx, nfz, Math.min(1, sq)); }
    // you: where the vehicle is (the rooms, the traffic, the sounds follow), facing its way
    player.x = v.x; player.z = v.z; player.y = 0; player.yaw = v.h + Math.PI; player.vx = player.vz = 0; player.locked = true;
    if (this.fov == null) this.fov = cam.fov; const sh = (this.shake || 0) * (Math.random() - 0.5); this.shake = Math.max(0, (this.shake || 0) - dt * 1.2);
    if (v.kind === 'car') {   // behind and above on a spring, looking a little ahead of the bonnet; wider with speed
      const back = 6.2 + spd * 0.045, want = new THREE.Vector3(v.x - nfx * back, 2.3 + spd * 0.02, v.z - nfz * back); this.camPos.lerp(want, 1 - Math.exp(-dt * 4.5));
      this.camLook.lerp(new THREE.Vector3(v.x + nfx * 3.4 + v.vx * 0.12, 1.0, v.z + nfz * 3.4 + v.vz * 0.12), 1 - Math.exp(-dt * 8));
      cam.position.copy(this.camPos); cam.position.y += sh; cam.lookAt(this.camLook); cam.fov = this.fov + clamp(spd * 0.55, 0, 13); cam.updateProjectionMatrix();
      if (!this.restore) { const f0 = this.fov; this.restore = () => { cam.fov = f0; cam.updateProjectionMatrix(); this.fov = null; }; }
    } else {   // the rider's eyes: 1.42 m up, 0.12 m behind the bars' centre, leaning with the bike
      cam.position.set(v.x - nfx * 0.12 + nrx * Math.sin(v.lean) * 1.4, 1.42 * Math.cos(v.lean) + sh, v.z - nfz * 0.12 + nrz * Math.sin(v.lean) * 1.4);
      cam.rotation.set(-0.12, v.h + Math.PI, v.lean * 0.9, 'YXZ'); cam.fov = this.fov + clamp(spd * 0.4, 0, 10); cam.updateProjectionMatrix();
      if (!this.restore) { const f0 = this.fov; this.restore = () => { cam.fov = f0; cam.updateProjectionMatrix(); this.fov = null; }; }
    }
  }
  // a five-speed box for the engine's note: the gear from the speed, the revs within it (an upshift drops them)
  gear(spd, S) { const top = S.vmax, bands = [0.18, 0.36, 0.56, 0.78, 1.0]; let g = 0; while (g < 4 && spd > top * bands[g]) g++; const lo = g ? top * bands[g - 1] : 0, hi = top * bands[g]; return { g: g + 1, rpm: 900 + 5200 * clamp((spd - lo) / Math.max(0.1, hi - lo), 0, 1) * (g ? 0.85 : 1) + (g ? 1100 : 0) }; }
  kmh() { return Math.round(this.speed * 3.6); }
  // ---------------------------------------------------------------- the Garage app's 3D preview: the real model and material on a turntable
  preview(R, canvas, id, dt) {
    const G = GARAGE.find((q) => q.id === id); if (!G || !this.room || !canvas) return; const r = canvas.getBoundingClientRect(), sz = R.getSize(this._sz || (this._sz = new THREE.Vector2()));
    if (r.width < 8 || r.left < 0 || r.top < 0 || r.right > sz.x || r.bottom > sz.y) return;
    const P = this._pv || (this._pv = { scene: new THREE.Scene(), cam: new THREE.PerspectiveCamera(32, 1, 0.1, 50), mesh: null, key: '', yaw: 0.6 });
    const key = id + this.paintOf(id); if (P.key !== key) { if (P.mesh) { P.scene.remove(P.mesh); P.mesh.geometry.dispose(); }
      const over = { [G.paintMat]: { id: MAT.lacquer, tint: lin(this.paintOf(id)) } }, g = assetGeometry(G.model, 0, null, toGeometry, Acc, over); if (!g) return;
      for (const [n, k, v] of [['iLh', 3, [1.0, 0.95, 0.9]], ['iLf', 3, [0.25, 0.27, 0.32]], ['iLs', 1, [0]]]) g.setAttribute(n, new THREE.InstancedBufferAttribute(new Float32Array(v), k));
      P.mesh = new THREE.InstancedMesh(g, this.mats.litFor(this.room.U, g, true), 1); P.mesh.frustumCulled = false; P.scene.add(P.mesh); P.key = key; }
    P.yaw += dt * 0.5; this._m.compose(new THREE.Vector3(0, 0, 0), this._q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), P.yaw), new THREE.Vector3(1, 1, 1)); P.mesh.setMatrixAt(0, this._m); P.mesh.instanceMatrix.needsUpdate = true;
    const big = G.kind === 'car'; P.cam.position.set(0, big ? 1.9 : 1.2, big ? 6.4 : 3.4); P.cam.lookAt(0, big ? 0.55 : 0.55, 0); P.cam.aspect = r.width / r.height; P.cam.updateProjectionMatrix();
    const vp = R.getViewport(new THREE.Vector4()), sc = R.getScissor(new THREE.Vector4()), st = R.getScissorTest(), cc = R.getClearColor(new THREE.Color()), ca = R.getClearAlpha(), rt = R.getRenderTarget();
    const x = r.left, y = sz.y - r.bottom; R.setRenderTarget(null); R.setViewport(x, y, r.width, r.height); R.setScissor(x, y, r.width, r.height); R.setScissorTest(true); R.setClearColor(0x15131a, 1); R.clear(true, true, false);
    const vis = this.room.group.visible; R.render(P.scene, P.cam);
    const pr = R.domElement.width / sz.x, ctx = canvas.getContext('2d'); try { ctx.drawImage(R.domElement, r.left * pr, r.top * pr, r.width * pr, r.height * pr, 0, 0, canvas.width, canvas.height); } catch (e) { /* busy */ }
    R.setViewport(vp); R.setScissor(sc); R.setScissorTest(st); R.setClearColor(cc, ca); R.setRenderTarget(rt); void vis;
  }
}
