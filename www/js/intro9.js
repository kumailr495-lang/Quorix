// LUMIERE v11 - the Flow arrival, from inside the taxi (the user: "make the car intro like we are actually sitting in the car, not from
// outside ... an animation-to-game transition so the game doesn't lag"). You ride in the back seat, on the kerb side: the dashboard with
// its lit screen and meter, the wheel and the driver on the right (the kerb is on the car's left, as in India), the wipers going, the
// street passing and the cinema coming up on your left. The car stops at the red carpet; the door opens (a quarter-second fade covers
// the change from the cabin to the taxi seen from outside) and you stand up out of it onto the kerb, turn to the doors, and the camera
// you are left with is the player's own: same place, same heading, no cut. The whole ride draws the street and the lobby behind its
// glass, so everything you are about to walk into is already on the GPU when you get control. The first arrival can't be skipped.
// The taxi stays at the kerb afterwards ("the taxi always present"); real car recordings (sound9.js); the driver says three short things.
import * as THREE from 'three';
import { assetGeometry } from './assets.js';
import { Acc, toGeometry } from './geom.js';
import { MAT } from './library.js';
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t, ease = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
const KERB = 26.0, LANE_IN = 27.85, LANE_OUT = 31.6, STOP_X = 1.6, ROAD_Y = -0.15, ARRIVE = 8.4, LEAVE = 1e9;
const SHOT_B = 9.3, END_T = SHOT_B + 4.3;   // the door opens and you get out; hand over control
export const ARRIVAL = { x: 0.6, z: 25.2, yaw: 0, pitch: 0.06 };   // on the pavement at the kerb, facing the doors
// the cabin, in the car's own frame (nose +z, kerb side +x, up +y, origin on the road under the middle): what you see from the back seat
const SEAT_EYE = [0.07, 1.235, -0.6];   // leaning a little to the middle: you see the road between the front headrests
function cabin() {
  const acc = new Acc(), E = (rx = 0, ry = 0, rz = 0) => new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), ONE = new THREE.Vector3(1, 1, 1), Y = new THREE.Vector3(0, 1, 0);
  // the instanced lit shader shades by an 'occ' attribute (assets.js assetGeometry): undersides a little darker
  const a = { add: (g, m, col, o) => { const N = g.attributes.normal, oc = new Float32Array(N.count); for (let i = 0; i < N.count; i++) oc[i] = N.getY(i) < -0.5 ? 0.6 : 1; g.setAttribute('occ', new THREE.BufferAttribute(oc, 1)); acc.add(g, m, col, o); } };
  const box = (w, h, d, x, y, z, col, mat, rx = 0, ry = 0, rz = 0) => a.add(new THREE.BoxGeometry(w, h, d), new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), E(rx, ry, rz), ONE), col, { mat });
  const beam = (p, q, w, col, mat) => { const P = new THREE.Vector3(...p), Q = new THREE.Vector3(...q), d = Q.clone().sub(P), L = d.length(); a.add(new THREE.BoxGeometry(w, L, w), new THREE.Matrix4().compose(P.clone().add(Q).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(Y, d.normalize()), ONE), col, { mat }); };
  const ball = (r, x, y, z, col, mat, sy = 1) => a.add(new THREE.SphereGeometry(r, 14, 10), new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), E(), new THREE.Vector3(1, sy, 1)), col, { mat });
  const ell = (rx_, ry_, rz_, x, y, z, col, mat, tilt = 0) => a.add(new THREE.SphereGeometry(1, 16, 12), new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), E(tilt), new THREE.Vector3(rx_, ry_, rz_)), col, { mat });
  const cap = (r, len, x, y, z, col, mat, rx = 0, rz = 0) => a.add(new THREE.CapsuleGeometry(r, len, 6, 12), new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), E(rx, 0, rz), ONE), col, { mat });
  const PL = '#3a3a40', LE = '#7a6652', HL = '#9a9388', CH = '#c2c6cc';   // charcoal plastics, tan leather, a pale headliner
  box(1.5, 0.04, 2.7, 0, 0.3, -0.1, '#2c2c30', MAT.carpet); box(1.46, 0.04, 1.95, 0, 1.47, -0.48, HL, MAT.fabric);   // floor, headliner
  box(1.32, 0.06, 0.16, 0, 1.44, 0.45, HL, MAT.fabric, 0.35);   // the header over the windscreen
  for (const sx of [-1, 1]) {
    beam([sx * 0.7, 0.97, 1.02], [sx * 0.61, 1.45, 0.4], 0.075, PL, MAT.powder);   // A-pillar
    box(0.08, 0.06, 1.95, sx * 0.71, 1.45, -0.48, HL, MAT.fabric); box(0.07, 0.54, 0.13, sx * 0.735, 1.2, 0.02, PL, MAT.powder); box(0.07, 0.54, 0.34, sx * 0.72, 1.2, -1.22, PL, MAT.powder);   // roof rail, B and C pillars
    box(0.05, 0.62, 2.25, sx * 0.76, 0.62, -0.1, PL, MAT.powder); box(0.07, 0.04, 2.25, sx * 0.745, 0.945, -0.1, '#2a2a2e', MAT.leather);   // door card and its sill
    box(0.09, 0.05, 0.5, sx * 0.71, 0.74, -0.55, LE, MAT.leather); box(0.09, 0.05, 0.5, sx * 0.71, 0.74, 0.45, LE, MAT.leather); box(0.34, 0.02, 0.15, sx * 0.36, 1.435, 0.36, HL, MAT.fabric, 0.12);   // armrests, sun visor
  }
  // dashboard: body, pad, the binnacle in front of the driver, the centre screen, the taxi meter, vents
  box(1.44, 0.34, 0.44, 0, 0.8, 0.86, PL, MAT.powder); box(1.44, 0.05, 0.52, 0, 0.97, 0.84, '#26262a', MAT.leather, -0.07); box(0.36, 0.1, 0.16, -0.36, 1.03, 0.7, PL, MAT.powder, -0.1);
  box(0.28, 0.18, 0.025, 0.0, 0.98, 0.628, '#0a0a0c', MAT.tblack, 0.16); box(0.13, 0.055, 0.05, 0.25, 1.03, 0.66, '#0a0a0c', MAT.tblack); for (const x of [-0.62, 0.48, 0.62]) box(0.1, 0.05, 0.02, x, 0.92, 0.635, '#141416', MAT.tblack);
  box(0.22, 0.24, 0.95, 0, 0.5, 0.26, PL, MAT.powder); box(0.2, 0.05, 0.36, 0, 0.645, -0.02, LE, MAT.leather); box(0.03, 0.09, 0.03, 0, 0.67, 0.42, CH, MAT.chrome);   // console, armrest, gear lever
  // steering wheel (right-hand drive) on its column
  a.add(new THREE.TorusGeometry(0.185, 0.017, 8, 28), new THREE.Matrix4().compose(new THREE.Vector3(-0.36, 0.97, 0.56), E(-0.4), ONE), '#0d0d0f', { mat: MAT.leather });
  for (const an of [0.35, Math.PI - 0.35, -Math.PI / 2]) { const c = Math.cos(an) * 0.09, s2 = Math.sin(an) * 0.09; a.add(new THREE.BoxGeometry(0.185, 0.03, 0.02), new THREE.Matrix4().compose(new THREE.Vector3(-0.36 + c, 0.97 + s2 * Math.cos(0.4), 0.56 + s2 * Math.sin(0.4)), E(-0.4, 0, an), ONE), '#101012', { mat: MAT.powder }); }
  box(0.09, 0.09, 0.05, -0.36, 0.97, 0.565, '#101012', MAT.powder, -0.4); beam([-0.36, 0.97, 0.57], [-0.36, 0.9, 0.78], 0.06, PL, MAT.powder);
  // front seats (seen from behind): cushion, back with bolsters, a pocket, headrest on two posts
  for (const x of [-0.36, 0.36]) {
    box(0.5, 0.14, 0.5, x, 0.52, 0.44, LE, MAT.leather); box(0.42, 0.6, 0.11, x, 0.86, 0.135, LE, MAT.leather, -0.2); for (const sx of [-1, 1]) cap(0.06, 0.5, x + sx * 0.215, 0.865, 0.135, '#6f5b47', MAT.leather, -0.2);   // the back between two rolled bolsters
    cap(0.062, 0.3, x, 1.155, 0.075, LE, MAT.leather, -0.2, Math.PI / 2); ell(0.135, 0.1, 0.058, x, 1.3, 0.028, LE, MAT.leather, -0.12);   // the shoulder roll and a rounded headrest
    for (const sx of [-1, 1]) beam([x + sx * 0.07, 1.14, 0.05], [x + sx * 0.07, 1.22, 0.035], 0.014, CH, MAT.chrome); box(0.36, 0.3, 0.02, x, 0.84, 0.055, '#5c4b3a', MAT.leather, -0.2);
  }
  box(1.4, 0.14, 0.52, 0, 0.52, -0.76, LE, MAT.leather); cap(0.07, 1.24, 0, 0.555, -0.51, LE, MAT.leather, 0, Math.PI / 2); box(1.4, 0.6, 0.12, 0, 0.86, -1.06, LE, MAT.leather, 0.22);   // the rear seat you sit on
  // the driver: back of the head, cap, neck, shoulders, arms to the wheel
  ball(0.1, -0.36, 1.31, 0.13, '#6b4a3a', MAT.fabric, 1.12); ball(0.106, -0.36, 1.345, 0.125, '#121214', MAT.fabric, 0.72); box(0.2, 0.012, 0.1, -0.36, 1.355, 0.25, '#121214', MAT.fabric, 0.2);
  box(0.46, 0.2, 0.2, -0.36, 1.08, 0.2, '#1e2430', MAT.fabric, -0.15); box(0.09, 0.1, 0.09, -0.36, 1.2, 0.16, '#6b4a3a', MAT.fabric);
  for (const sx of [-1, 1]) beam([-0.36 + sx * 0.21, 1.08, 0.24], [-0.36 + sx * 0.16, 1.0, 0.53], 0.075, '#1e2430', MAT.fabric);
  box(0.22, 0.065, 0.03, 0, 1.37, 0.5, '#141416', MAT.tblack);   // rear-view mirror
  box(1.58, 0.05, 1.5, 0, 0.9, 1.84, '#d9a514', MAT.lacquer, 0.045); box(1.5, 0.03, 0.12, 0, 0.955, 1.06, '#141416', MAT.tblack);   // the bonnet ahead of the glass, the scuttle
  return toGeometry(acc, 'occ');
}
// what glows in the cabin: the map on the centre screen and its roads, the dials, the meter's red digits
function cabinGlow() {
  const pos = [], col = [], quad = (x, y, z, w, h, rx, c) => { const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, Math.PI, 0)), new THREE.Vector3(1, 1, 1));
    for (const [u, v] of [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]]) { const p = new THREE.Vector3(u * w / 2, v * h / 2, 0).applyMatrix4(m); pos.push(p.x, p.y, p.z); col.push(...c); } };
  quad(0, 0.98, 0.612, 0.25, 0.15, -0.16, [0.1, 0.42, 0.62]); for (let i = 0; i < 4; i++) quad(-0.09 + i * 0.06, 0.965 + (i % 2) * 0.03, 0.611, 0.05, 0.006, -0.16, [0.9, 0.8, 0.5]);
  quad(-0.43, 1.03, 0.618, 0.1, 0.065, 0.1, [0.5, 0.55, 0.6]); quad(-0.29, 1.03, 0.618, 0.1, 0.065, 0.1, [0.5, 0.55, 0.6]); quad(0.25, 1.03, 0.634, 0.1, 0.03, 0, [1.6, 0.12, 0.08]);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('grp', new THREE.Float32BufferAttribute(new Float32Array(pos.length / 3), 1)); return g;
}
export class Intro {
  constructor(engine, world, mats, sound, hooks = {}) {
    this.engine = engine; this.world = world; this.sound = sound; this.hooks = hooks; this.active = false; this.inCar = false; this.t = 0; this.carOn = false; this.mesh = null;
    const room = world.rooms.street, g = room && assetGeometry('car_taxi', 0, null, toGeometry, Acc); if (!g) return;
    const inst = (geo) => { for (const [n, k] of [['iLh', 3], ['iLf', 3], ['iLs', 1]]) geo.setAttribute(n, new THREE.InstancedBufferAttribute(new Float32Array(k), k)); return geo; };
    const m = new THREE.InstancedMesh(inst(g), mats.litFor(room.U, g, true), 1); m.frustumCulled = false; m.visible = false; room.group.add(m);
    this.mesh = m; this.room = room; this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._up = new THREE.Vector3(0, 1, 0); this._H = [0, 0, 0]; this._F = [0, 0, 0];
    // the cabin (drawn only while you ride): its lit parts as one instance, its screens as a glow mesh, two wiper blades
    const cg = inst(cabin()); this.cab = new THREE.InstancedMesh(cg, mats.litFor(room.U, cg, true), 1); this.cab.frustumCulled = false; this.cab.visible = false; this.cab.name = 'taxi-cabin'; room.group.add(this.cab);
    this.rig = new THREE.Group(); this.rig.matrixAutoUpdate = false; this.rig.visible = false; room.group.add(this.rig);
    const gl = new THREE.Mesh(cabinGlow(), mats.glowMat(room.U)); gl.frustumCulled = false; this.rig.add(gl);
    this.wipers = [-0.32, 0.36].map((x) => { const piv = new THREE.Group(); piv.position.set(x, 0.975, 1.04); piv.rotation.x = -1.02; const bl = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.5, 0.012), new THREE.MeshBasicMaterial({ color: 0x050506 })); bl.position.y = 0.25; const arm = new THREE.Group(); arm.add(bl); piv.add(arm); this.rig.add(piv); return arm; });
    this._eye = new THREE.Vector3(); this._look = new THREE.Vector3();
  }
  // the taxi's ground point at time t: in on the outer lane from the west, across into the kerb lane, a gentle stop at the carpet
  pos(t) {
    if (t < ARRIVE) { const u = t / ARRIVE, s = 1 - (1 - u) ** 2.4, x = lerp(-48, STOP_X, s); return [x, lerp(LANE_OUT, LANE_IN, ease((x - (STOP_X - 15)) / 11))]; }
    if (t < LEAVE) return [STOP_X, LANE_IN];
    const u = t - LEAVE, x = STOP_X + 1.1 * u * u + 0.4 * u; return [x, lerp(LANE_IN, LANE_OUT, ease((x - STOP_X - 4) / 14))];
  }
  _place(t) {
    const [x, z] = this.pos(t), [x2, z2] = this.pos(t + 0.06), yaw = Math.hypot(x2 - x, z2 - z) > 1e-4 ? Math.atan2(x2 - x, z2 - z) : Math.PI / 2;   // the car's nose (+z) along its motion
    this._q.setFromAxisAngle(this._up, yaw); this._m.compose(new THREE.Vector3(x, ROAD_Y, z), this._q, new THREE.Vector3(1, 1, 1)); this.mesh.setMatrixAt(0, this._m); this.mesh.instanceMatrix.needsUpdate = true;
    const L = this.room.lights, G = this.mesh.geometry.attributes; L.at(x, 0.9, z, 0, 1, 0, this._H, this._F); G.iLh.array.set(this._H); G.iLf.array.set(this._F); G.iLh.needsUpdate = G.iLf.needsUpdate = true;
    if (this.inCar) { this.cab.setMatrixAt(0, this._m); this.cab.instanceMatrix.needsUpdate = true; this.rig.matrix.copy(this._m); this.rig.matrixWorldNeedsUpdate = true;
      const C = this.cab.geometry.attributes; const DOME = [0.3, 0.26, 0.21]; for (let i = 0; i < 3; i++) { C.iLh.array[i] = this._H[i] * 0.7 + DOME[i]; C.iLf.array[i] = this._F[i] * 0.7; } C.iLh.needsUpdate = C.iLf.needsUpdate = true; }   // the street's light through the glass plus the cabin's own low warm glow
    return [x, z];
  }
  // in the cabin or out of it: the cabin and the taxi's outside are never drawn together
  _ride(on) { this.inCar = on; this.cab.visible = on; this.rig.visible = on; this.mesh.visible = !on; }
  start(o = {}) {
    if (!this.mesh) { this.hooks.done && this.hooks.done(); return false; }
    this.active = true; this.t = 0; this.skippable = !!o.skippable; this.carOn = true; this._door = 0; this._said = 0; this._cut = false; this._ride(true); document.body.classList.add('cutscene');
    const b = document.querySelector('#skipCut'); if (b) { b.hidden = !this.skippable; b.onclick = () => this.finish(); }
    this.hooks.fade && this.hooks.fade(0, 0.9); return true;
  }
  finish() {
    if (!this.active) return; this.active = false; document.body.classList.remove('cutscene'); const b = document.querySelector('#skipCut'); if (b) b.hidden = true;
    this._ride(false); this.t = Math.max(this.t, SHOT_B + 3.1); this._door = 3; this.sound.carOff && this.sound.carOff(); this._place(this.t);   // skipped: the taxi waits at the kerb
    this.hooks.done && this.hooks.done();
  }
  // per frame: the taxi (also after you have control), and the camera while the scene runs
  update(dt, player) {
    if (!this.carOn) return; this.t += dt; const t = this.t, [cx, cz] = this._place(t);
    const rev = t < ARRIVE ? 0.5 + 0.5 * (1 - t / ARRIVE) : 0.3; if (this._door < 3) this.sound.car && this.sound.car(rev, cx, cz);
    const say = (k) => this.hooks.driver && this.hooks.driver(k, cx, cz);
    if (t > 2.2 && this._said < 1 && this.active) { this._said = 1; say('drv.ride'); }
    if (t > ARRIVE + 0.1 && this._said < 2 && this.active) { this._said = 2; say('drv.arrive'); }
    if (t > SHOT_B && this._door < 1) { this._door = 1; if (this.sound.carDoor) this.sound.carDoor(true); else this.sound.door(true, 0.9); }
    if (t > SHOT_B + 1.75 && this._door < 2) { this._door = 2; if (this.sound.carDoor) this.sound.carDoor(false); else { this.sound.door(false, 1.2); this.sound.thud && this.sound.thud(); } say('drv.bye'); }
    if (t > SHOT_B + 3.0 && this._door < 3) { this._door = 3; this.sound.carOff && this.sound.carOff(); }
    if (!this.active) return;
    const cam = this.engine.camera;
    if (t < SHOT_B) {
      // the ride: your eye in the back seat (the road's small shudder, a nod as the car brakes); you look ahead between the front seats,
      // then, as the cinema comes up on the kerb side, at its doors through your own window
      const sp = t < ARRIVE ? (1 - t / ARRIVE) : 0, brake = t < ARRIVE ? Math.sin(Math.PI * clamp((t - ARRIVE + 2.4) / 2.4)) : 0;
      this._eye.set(SEAT_EYE[0], SEAT_EYE[1] + Math.sin(t * 9.1) * 0.004 * sp + Math.sin(t * 2.3) * 0.006 * sp, SEAT_EYE[2] + brake * 0.035).applyMatrix4(this._m); cam.position.copy(this._eye);
      const k = ease((t - 4.4) / 3.2), ax = this._look.set(0.0, 1.16, 9).applyMatrix4(this._m);
      cam.lookAt(lerp(ax.x, 0.6, k), lerp(ax.y, 1.95, k), lerp(ax.z, 18.5, k));
      const w = Math.sin(t * 4.2) * 0.5 + 0.5; this.wipers[0].rotation.z = -0.15 - w * 1.25; this.wipers[1].rotation.z = -0.15 - w * 1.25;
      if (t > SHOT_B - 0.3 && !this._cut) { this._cut = true; this.hooks.fade && this.hooks.fade(1, 0.26); }
    } else {
      if (this._cut) { this._cut = false; this._ride(false); this.hooks.fade && this.hooks.fade(0, 0.5); }
      // out of the rear door: low beside the taxi looking back at it, standing up while turning to the doors, a step onto the carpet
      // (the door shuts behind you); it ends on the player's own eye, so control arrives without a cut
      const u = t - SHOT_B, A = ARRIVAL, up = ease((u - 0.5) / 1.5), turn = ease((u - 0.3) / 2.5), step = ease((u - 1.6) / 1.8), bob = Math.sin(u * 7.5) * 0.012 * up * (1 - step * 0.6);
      cam.position.set(lerp(STOP_X - 0.45, A.x, ease(u / 3)), lerp(1.02, 1.62, up) + bob, lerp(KERB + 0.08, A.z, step));
      const yaw = lerp(2.45, A.yaw, turn), pitch = lerp(-0.1, A.pitch, ease((u - 0.8) / 2.4));
      cam.rotation.set(pitch, yaw, 0);
    }
    player.x = cam.position.x; player.z = cam.position.z; player.yaw = t < SHOT_B ? 0 : cam.rotation.y;
    if (t >= END_T) this.finish();
  }
}
