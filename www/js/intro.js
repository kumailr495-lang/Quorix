// LUMIERE v8 - the Story arrival (phone feedback: "there is no taxi drop-off intro of stepping out of the car"). A taxi (tools/blender/
// cars.py) comes along the cinema's side of the road and pulls in at the red carpet; you watch it from the far pavement, then step out of
// it onto the kerb in first person, the door shuts and it drives off. The very first arrival can't be skipped; later ones can.
import * as THREE from 'three';
import { assetGeometry } from './assets.js';
import { Acc, toGeometry } from './geom.js';
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t, ease = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
const KERB = 31.2, LANE_IN = KERB + 1.25, LANE_OUT = KERB + 3.9, STOP_X = 0.95, ROAD_Y = -0.15, ARRIVE = 4.2, LEAVE = 6.7;
const SHOT_B = 4.5, END_T = 8.8;   // cut to first person; hand over control
export const ARRIVAL = { x: 0.55, z: 30.5, yaw: 0, pitch: 0.1 };   // on the carpet at the kerb, facing the doors
export class Intro {
  constructor(engine, world, mats, sound, hooks = {}) {
    this.engine = engine; this.world = world; this.sound = sound; this.hooks = hooks; this.active = false; this.t = 0; this.carOn = false; this.mesh = null;
    const room = world.rooms.street, g = room && assetGeometry('car_taxi', 0, null, toGeometry, Acc); if (!g) return;
    for (const [n, k] of [['iLh', 3], ['iLf', 3], ['iLs', 1]]) g.setAttribute(n, new THREE.InstancedBufferAttribute(new Float32Array(k), k));
    const m = new THREE.InstancedMesh(g, mats.litFor(room.U, g, true), 1); m.frustumCulled = false; m.visible = false; room.group.add(m);
    this.mesh = m; this.room = room; this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._up = new THREE.Vector3(0, 1, 0); this._H = [0, 0, 0]; this._F = [0, 0, 0];
  }
  // the taxi's ground point at time t: in on the outer lane from the west, across into the kerb lane, a gentle stop at the carpet; after the
  // door shuts, away to the east and back out to the outer lane
  pos(t) {
    if (t < ARRIVE) { const u = t / ARRIVE, s = 1 - (1 - u) ** 2.4, x = lerp(-48, STOP_X, s); return [x, lerp(LANE_OUT, LANE_IN, ease((x - (STOP_X - 15)) / 11))]; }
    if (t < LEAVE) return [STOP_X, LANE_IN];
    const u = t - LEAVE, x = STOP_X + 1.1 * u * u + 0.4 * u; return [x, lerp(LANE_IN, LANE_OUT, ease((x - STOP_X - 4) / 14))];
  }
  _place(t) {
    const [x, z] = this.pos(t), [x2, z2] = this.pos(t + 0.06), yaw = Math.hypot(x2 - x, z2 - z) > 1e-4 ? Math.atan2(x2 - x, z2 - z) : Math.PI / 2;   // the car's nose (+z) along its motion
    this._q.setFromAxisAngle(this._up, yaw); this._m.compose(new THREE.Vector3(x, ROAD_Y, z), this._q, new THREE.Vector3(1, 1, 1)); this.mesh.setMatrixAt(0, this._m); this.mesh.instanceMatrix.needsUpdate = true;
    const L = this.room.lights, G = this.mesh.geometry.attributes; L.at(x, 0.9, z, 0, 1, 0, this._H, this._F); G.iLh.array.set(this._H); G.iLf.array.set(this._F); G.iLh.needsUpdate = G.iLf.needsUpdate = true;
    return [x, z];
  }
  start(o = {}) {
    if (!this.mesh) { this.hooks.done && this.hooks.done(); return false; }
    this.active = true; this.t = 0; this.skippable = !!o.skippable; this.mesh.visible = true; this.carOn = true; this._door = 0; document.body.classList.add('cutscene');
    const b = document.querySelector('#skipCut'); if (b) { b.hidden = !this.skippable; b.onclick = () => this.finish(); }
    this.hooks.fade && this.hooks.fade(0, 0.9); return true;
  }
  finish() {
    if (!this.active) return; this.active = false; document.body.classList.remove('cutscene'); const b = document.querySelector('#skipCut'); if (b) b.hidden = true;
    if (this.t < LEAVE) { this.mesh.visible = false; this.carOn = false; this.sound.carOff && this.sound.carOff(); }   // skipped: no taxi left standing
    this.hooks.done && this.hooks.done();
  }
  // per frame: the taxi (also after you have control, until it has gone), and the camera while the scene runs
  update(dt, player) {
    if (!this.carOn) return; this.t += dt; const t = this.t, [cx, cz] = this._place(t);
    const rev = t < ARRIVE ? 0.55 + 0.45 * (1 - t / ARRIVE) : t < LEAVE ? 0.3 : Math.min(1, 0.45 + (t - LEAVE) * 0.4); this.sound.car && this.sound.car(rev, cx, cz);
    if (t > SHOT_B && this._door < 1) { this._door = 1; this.sound.door(true, 0.9); }
    if (t > 6.25 && this._door < 2) { this._door = 2; this.sound.door(false, 1.2); this.sound.thud && this.sound.thud(); }
    if (cx > 60) { this.carOn = false; this.mesh.visible = false; this.sound.carOff && this.sound.carOff(); }
    if (!this.active) return;
    const cam = this.engine.camera;
    if (t < SHOT_B) {
      // shot A: from the far pavement, the taxi crosses the frame and stops at the carpet; the camera drifts and settles on the entrance
      const k = ease((t - 1.2) / 3.0); cam.position.set(lerp(-4.2, -1.6, t / SHOT_B), 1.72, 42.7);
      cam.lookAt(lerp(cx + 2.5, 0.9, k), lerp(1.2, 2.4, k), lerp(cz, 24, k));
      if (t > SHOT_B - 0.32 && !this._cut) { this._cut = true; this.hooks.fade && this.hooks.fade(1, 0.28); }
    } else {
      if (this._cut) { this._cut = false; this.hooks.fade && this.hooks.fade(0, 0.55); }
      // shot B: first person, just out of the rear door: low beside the taxi looking back at it, standing up while turning to the doors,
      // a step onto the carpet (the door shuts behind you, the taxi pulls away)
      const u = t - SHOT_B, A = ARRIVAL, up = ease((u - 0.5) / 1.5), turn = ease((u - 0.3) / 2.5), step = ease((u - 1.6) / 1.8), bob = Math.sin(u * 7.5) * 0.012 * up * (1 - step * 0.6);
      cam.position.set(lerp(STOP_X - 0.45, A.x, ease(u / 3)), lerp(1.02, 1.62, up) + bob, lerp(KERB + 0.08, A.z, step));
      const yaw = lerp(2.45, A.yaw, turn), pitch = lerp(-0.1, A.pitch, ease((u - 0.8) / 2.4));
      cam.rotation.set(pitch, yaw, 0);
    }
    player.x = cam.position.x; player.z = cam.position.z; player.yaw = t < SHOT_B ? 0 : cam.rotation.y;
    if (t >= END_T) this.finish();
  }
}
