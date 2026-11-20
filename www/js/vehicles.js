// LUMIERE v14 - your car and your motorbike (the user, 11-20: "cars, motorcycles"; the master prompt: "working cars, drivable roads").
// A gloss-black saloon waits in the parking bay west of the doors and a motorbike on the kerb by it. Walk up and the action button says
// Drive / Ride: the stick (or W A S D) is throttle, brake / reverse and steering; the car is seen from behind it, the bike from the rider's
// eyes over its bars and tank. They run on the cinema's street (the road and the bays, kerb to kerb, end to end): the kerbs hold them,
// the passing traffic brakes for them (traffic.js treats you as an obstacle wherever you are), a knock into another car stops you.
// Get out where you are and the car or bike stays there.
// Physics: a bicycle model (heading turns at speed / wheelbase x tan(steer)); steering lock falls with speed; throttle, brake, reverse,
// coasting drag. Engine: sound9.js vehicle() (synthesized), its pitch on the speed.
import * as THREE from 'three';
import { assetGeometry } from './assets.js';
import { Acc, toGeometry } from './geom.js';
import { MAT } from './library.js';
import { STREET } from './building.js';
import { carFloor } from './traffic.js';

const ROAD_Y = -0.15, X0 = STREET.x0 + 4, X1 = STREET.x1 - 4, Z0 = STREET.kerb + 1.25, Z1 = STREET.far - 1.25;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const SPECS = {
  car: { model: 'car_sedan', over: { car_red: { id: MAT.lacquer, tint: [0.008, 0.008, 0.01] } }, wb: 2.7, half: [0.95, 2.3], vmax: 17, acc: 3.6, rev: 4, lock: 0.55, y: ROAD_Y },
  moto: { model: 'motorcycle', over: null, wb: 1.45, half: [0.4, 1.05], vmax: 19, acc: 4.4, rev: 1.6, lock: 0.6, y: 0 },
};

export class Vehicles {
  constructor(world, mats, sound) {
    this.world = world; this.sound = sound; this.list = []; this.cur = null; this.camPos = new THREE.Vector3(); this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._up = new THREE.Vector3(0, 1, 0);
    this._H = [0, 0, 0]; this._F = [0, 0, 0]; const room = world.rooms.street; this.room = room; if (!room) return;
    const add = (kind, x, z, h) => {
      const S = SPECS[kind], g = assetGeometry(S.model, 0, null, toGeometry, Acc, S.over); if (!g) return;
      for (const [n, k] of [['iLh', 3], ['iLf', 3], ['iLs', 1]]) g.setAttribute(n, new THREE.InstancedBufferAttribute(new Float32Array(k), k));
      const mesh = new THREE.InstancedMesh(g, mats.litFor(room.U, g, true), 1); mesh.frustumCulled = false; mesh.name = 'vehicle-' + kind; room.group.add(mesh);
      const v = { kind, S, mesh, x, z, h, v: 0, steer: 0, snd: null, lean: 0 }; this.list.push(v); this._place(v);
    };
    add('car', -15.5, 27.85, Math.PI / 2); add('moto', -20.4, 27.6, Math.PI / 2);
  }
  _place(v) {
    this._q.setFromAxisAngle(this._up, v.h); if (v.kind === 'moto') this._q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -v.lean));
    this._m.compose(new THREE.Vector3(v.x, v.S.y, v.z), this._q, new THREE.Vector3(1, 1, 1)); v.mesh.setMatrixAt(0, this._m); v.mesh.instanceMatrix.needsUpdate = true;
    this.room.lights.at(v.x, 0.9, v.z, 0, 1, 0, this._H, this._F); carFloor(this._H); const G = v.mesh.geometry.attributes; G.iLh.array.set(this._H); G.iLf.array.set(this._F); G.iLh.needsUpdate = G.iLf.needsUpdate = true;
  }
  // the car or bike within reach of someone standing at (x, z), not the one you are in
  near(x, z) { let best = null, bd = 9; for (const v of this.list) { if (v === this.cur) continue; const d = Math.hypot(v.x - x, v.z - z); if (d < (v.kind === 'car' ? 2.9 : 1.9) && d < bd) { bd = d; best = v; } } return best; }
  enter(v) { this.cur = v; v.v = 0; v.steer = 0; this.camPos.set(v.x - Math.sin(v.h) * 6.5, 2.4, v.z - Math.cos(v.h) * 6.5); if (this.sound.vehicle && !v.snd) v.snd = this.sound.vehicle(); if (this.sound.carDoor && v.kind === 'car') this.sound.carDoor(false); return v; }
  // out on the kerb side (toward the cinema) if there is room, else on the far side
  exit(player) {
    const v = this.cur; if (!v) return; this.cur = null; v.v = 0; if (v.snd) { v.snd.stop(); v.snd = null; } if (this.sound.carDoor && v.kind === 'car') this.sound.carDoor(false);
    const sx = Math.cos(v.h), sz = -Math.sin(v.h), side = sz < 0 ? 1 : -1, off = v.kind === 'car' ? 1.6 : 0.9;
    let px = v.x + sx * off * side, pz = v.z + sz * off * side; if (pz > STREET.far - 0.6 || pz < STREET.z0 + 0.6) { px = v.x - sx * off * side; pz = v.z - sz * off * side; }
    player.place(px, pz, v.h + Math.PI, 0, 0); player.locked = false;
  }
  get driving() { return !!this.cur; }
  // per frame while driving: input (stick and keys), physics, collisions, camera; obstacles: other cars as {x, z, r}
  update(dt, player, cam, obstacles = []) {
    if (!this.cur) return; const v = this.cur, S = v.S, k = player.keys;
    let thr = player.stick.y, st = player.stick.x; if (k.KeyW || k.ArrowUp) thr = 1; if (k.KeyS || k.ArrowDown) thr = -1; if (k.KeyA || k.ArrowLeft) st = -1; if (k.KeyD || k.ArrowRight) st = 1;
    thr = Math.abs(thr) < 0.12 ? 0 : clamp(thr, -1, 1); st = Math.abs(st) < 0.1 ? 0 : clamp(st, -1, 1);
    let a = 0; if (thr > 0) a = v.v < -0.2 ? 9 : S.acc * thr * (1 - Math.max(0, v.v) / S.vmax); else if (thr < 0) a = v.v > 0.3 ? -10 * -thr : -2.4 * -thr * (1 - Math.max(0, -v.v) / S.rev); else a = -Math.sign(v.v) * Math.min(Math.abs(v.v) / dt, 1.4 + 0.04 * v.v * v.v);
    v.v = clamp(v.v + a * dt, -S.rev, S.vmax);
    const lock = S.lock / (1 + Math.abs(v.v) * 0.09); v.steer += (st * lock - v.steer) * Math.min(1, dt * 5);
    v.h = wrap(v.h + (v.v / S.wb) * Math.tan(v.steer) * dt); if (v.kind === 'moto') v.lean += (clamp(-v.steer * Math.abs(v.v) * 0.09, -0.45, 0.45) - v.lean) * Math.min(1, dt * 4);
    let nx = v.x + Math.sin(v.h) * v.v * dt, nz = v.z + Math.cos(v.h) * v.v * dt;
    // the kerbs and the street's ends hold it (the half-length along the heading, the half-width across it)
    const ex = Math.abs(Math.sin(v.h)) * S.half[1] + Math.abs(Math.cos(v.h)) * S.half[0], ez = Math.abs(Math.cos(v.h)) * S.half[1] + Math.abs(Math.sin(v.h)) * S.half[0];
    if (nx < X0 + ex || nx > X1 - ex || nz < Z0 + ez - 1.2 || nz > Z1 - ez + 1.2) { nx = clamp(nx, X0 + ex, X1 - ex); nz = clamp(nz, Z0 + ez - 1.2, Z1 - ez + 1.2); if (Math.abs(v.v) > 2 && this.sound.thud) this.sound.thud(); v.v *= -0.2; }
    for (const o of obstacles) { const d = Math.hypot(nx - o.x, nz - o.z), r = (o.r || 1.9) + (v.kind === 'car' ? 1.7 : 0.9); if (d < r) { const ux = (nx - o.x) / (d || 1), uz = (nz - o.z) / (d || 1); nx = o.x + ux * r; nz = o.z + uz * r; if (Math.abs(v.v) > 2 && this.sound.thud) this.sound.thud(); v.v *= -0.15; } }
    for (const w of this.list) if (w !== v) { const d = Math.hypot(nx - w.x, nz - w.z), r = (v.kind === 'car' ? 1.7 : 0.9) + (w.kind === 'car' ? 1.9 : 0.9); if (d < r) { nx = w.x + (nx - w.x) / (d || 1) * r; nz = w.z + (nz - w.z) / (d || 1) * r; v.v *= -0.15; } }
    v.x = nx; v.z = nz; this._place(v); if (v.snd) v.snd.set(v.x, v.z, Math.abs(v.v), 1.6);
    // you: where the car is (the rooms, the traffic, the sounds follow), facing its way
    player.x = v.x; player.z = v.z; player.y = 0; player.yaw = v.h + Math.PI; player.vx = player.vz = 0; player.locked = true;
    if (v.kind === 'car') {   // behind and above, looking a little ahead of the bonnet
      const want = new THREE.Vector3(v.x - Math.sin(v.h) * 6.4, 2.35 + Math.abs(v.v) * 0.025, v.z - Math.cos(v.h) * 6.4); this.camPos.lerp(want, 1 - Math.exp(-dt * 5));
      cam.position.copy(this.camPos); cam.lookAt(v.x + Math.sin(v.h) * 3.2, 1.05, v.z + Math.cos(v.h) * 3.2);
    } else {   // the rider's eyes: 1.42 m up, 0.38 m behind the bars' centre, leaning with the bike
      const fx = Math.sin(v.h), fz = Math.cos(v.h); cam.position.set(v.x - fx * 0.12 + Math.cos(v.h) * Math.sin(v.lean) * 1.4, 1.42 * Math.cos(v.lean), v.z - fz * 0.12 - Math.sin(v.h) * Math.sin(v.lean) * 1.4);
      cam.rotation.set(-0.12, v.h + Math.PI, v.lean * 0.9, 'YXZ');
    }
  }
}
