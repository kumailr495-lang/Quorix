// LUMIERE v11 - the Flow arrival, from inside the taxi (the user: "make the car intro like we are actually sitting in the car, not from
// outside ... an animation-to-game transition so the game doesn't lag"). You ride in the back seat, on the kerb side: the dashboard with
// its lit screen and meter, the wheel and the driver on the right (the kerb is on the car's left, as in India), the wipers going, the
// street passing and the cinema coming up on your left. The car stops at the red carpet; the door opens (a quarter-second fade covers
// the change from the cabin to the taxi seen from outside) and you stand up out of it onto the kerb, turn to the doors, and the camera
// you are left with is the player's own: same place, same heading, no cut. The whole ride draws the street and the lobby behind its
// glass, so everything you are about to walk into is already on the GPU when you get control. The first arrival can't be skipped.
// v12 (the user: the taxi should come from somewhere and go somewhere, not block the doors): it comes in down the lane at the street's
// west end, stops at its own painted bay 9 m east of the doors, and once its door has shut and the lane behind it is clear it pulls out
// and leaves round the east corner (traffic.js routes; the passing cars drive the same roads). The driver says three short things.
import * as THREE from 'three';
import { assetGeometry } from './assets.js';
import { Acc, toGeometry } from './geom.js';
import { MAT } from './library.js';
import { Person, staffRecipe, DATA, setGesture } from './people.js';
import { streetRoutes, drive, carFloor } from './traffic.js';
import { STREET } from './building.js';
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t, ease = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
const KERB = 26.0, STOP_X = 9.0, ROAD_Y = -0.15;   // the TAXI bay's middle (rooms.py paints it at x 9)
export const ARRIVAL = (() => { const x = STOP_X - 1.1, z = 25.2; return { x, z, yaw: Math.atan2(x, z - STREET.z0), pitch: 0.06 }; })();   // by the taxi's rear door on the pavement, turned to the doors
// the cabin, in the car's own frame (nose +z, kerb side +x, up +y, origin on the road under the middle): what you see from the back seat
const SEAT_EYE = [0.07, 1.235, -0.6];   // leaning a little to the middle: you see the road between the front headrests
// v12 the driver (people.js, look 'driver'), seated by the car's measures (tools/blender/cabin.py: cushion top 0.455, roof lining 1.41, the
// wheel's centre at y 0.97, z 0.56, its rim 0.185 m, leaning 23 degrees). The avatars stand 1.9 m with their hair: he is scaled to 1.67 m,
// his hip 0.33 m behind the wheel, his back along the seat's 18 degrees, his head 5 cm under the lining; hands at ten to two on the rim
const DRV = { x: -0.36, y: 0.30, z: 0.28, seat: 0.155, scale: 0.88, recline: 0.3, yaw: 0 };   // measured: hip at z 0.23, head top 1.36, upper back on the seat's back
// v14 (the user, 11-20: "the taxi guy's hands and steering don't even move"): the wheel turns with the taxi's turning (STEER.a, radians; set
// by update from the heading's rate) and his hands go round with the rim: each hand's point (ten to two) turned about the column's axis
// (cabin.py: the axis leans 23 degrees, engine frame (0, 0.39, -0.92); the hands' points sit 0.10 m over the hub, 0.16 m either side)
const STEER = { a: 0, v: 0 }, W_AX = new THREE.Vector3(0, 0.39, -0.92).normalize(), _hv = new THREE.Vector3();
const handAt = (sx, a, w) => { _hv.set(sx * 0.16, 0.10, 0.039).applyAxisAngle(W_AX, a); return [_hv.x, 0.67 + _hv.y + w, 0.559 - DRV.z - 0.039 + _hv.z]; };
setGesture('drive', (t) => { const w = 0.004 * Math.sin(t * 0.9), a = Math.max(-1.1, Math.min(1.1, STEER.a)); return { L: handAt(1, a, w), R: handAt(-1, a, -w), from: 'root' }; });
const NIGHT = [0.17, 0.15, 0.13];   // the cabin's own glow at night (the dash, the meter); the street light comes in through the glass
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
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
// v11 wet glass: the windscreen and the four door windows, drawn over the street. Raindrops land on a 2.2 cm grid at their own size and
// moment; the wipers (the same angle as the blades: 0.15 to 1.4 rad from up, sin(4.2 t)) clear the windscreen and the drops come back
// over the next 1.4 s; on the side glass the drops stretch back with the speed. Each drop catches the light passing through the cabin.
const GLASS_V = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const GLASS_F = `precision highp float;
uniform float uT; uniform float uSide; uniform float uSpeed; uniform vec2 uSize; uniform vec4 uPv; uniform vec3 uLit; uniform vec3 uTint;
varying vec2 vUv;
float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float wipeAge(vec2 q, vec2 pv) {
  vec2 d = q - pv; float r = length(d); if (r > 0.52 || d.y < -0.01) return 99.0;
  float phi = atan(d.x, d.y); float s0 = (phi - 0.15) / 1.25 * 2.0 - 1.0; if (s0 < -1.0 || s0 > 1.0) return 99.0;
  float a = asin(s0); float ph = uT * 4.2; float k1 = floor((ph - a) / 6.28318); float k2 = floor((ph - 3.14159 + a) / 6.28318);
  return uT - max((a + 6.28318 * k1) / 4.2, (3.14159 - a + 6.28318 * k2) / 4.2);
}
void main() {
  vec2 q = vUv * uSize; float age = 99.0;
  if (uSide < 0.5) age = min(wipeAge(q, uPv.xy), wipeAge(q, uPv.zw));
  float st = uSide > 0.5 ? 1.0 + uSpeed * 0.12 : 1.0;
  vec2 g = vec2(q.x / st, q.y) * 45.0; vec2 c = floor(g); vec2 f = fract(g) - 0.5;
  float n = h21(c); float rr = 0.14 + 0.2 * h21(c + 7.1); float land = h21(c + 3.7) * 1.4;
  vec2 o = vec2(h21(c + 1.3), h21(c + 2.9)) - 0.5; vec2 e = f - o * (0.5 - rr); e.x *= st;
  float d = length(e); float on = step(0.4, n) * smoothstep(land, land + 0.15, age);
  float m = (1.0 - smoothstep(rr * 0.62, rr, d)) * on; float rim = smoothstep(rr * 0.4, rr * 0.85, d) * m;
  float hl = (1.0 - smoothstep(0.0, rr * 0.42, length(e - vec2(-0.32, 0.36) * rr))) * m;
  gl_FragColor = vec4(uTint + uLit * max(0.0, 0.5 * m - 0.42 * rim + 1.7 * hl), 0.045 + 0.46 * m + 0.35 * hl);
}`;
function pane(P) {   // four corners in the car's frame (bottom left, bottom right, top right, top left): u runs left to right, v up
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P.flat(), 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2)); g.setIndex([0, 1, 2, 0, 2, 3]); return g;
}
function wetGlass() {
  const mk = (side, size, pv = [0, 0, 0, 0]) => new THREE.ShaderMaterial({ vertexShader: GLASS_V, fragmentShader: GLASS_F, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uT: { value: 0 }, uSide: { value: side }, uSpeed: { value: 0 }, uSize: { value: new THREE.Vector2(...size) }, uPv: { value: new THREE.Vector4(...pv) }, uLit: { value: new THREE.Color(0.5, 0.45, 0.4) }, uTint: { value: new THREE.Color(0.012, 0.016, 0.02) } } });
  const out = [new THREE.Mesh(pane([[-0.70, 0.965, 1.06], [0.70, 0.965, 1.06], [0.62, 1.405, 0.45], [-0.62, 1.405, 0.45]]), mk(0, [1.40, 0.77], [0.38, 0.02, 1.06, 0.02]))];   // the wipers pivot at x -0.32 and 0.36
  for (const x of [0.765, -0.765]) {
    out.push(new THREE.Mesh(pane([[x, 0.965, -1.10], [x, 0.965, -0.03], [x, 1.38, -0.03], [x, 1.38, -1.10]]), mk(1, [1.07, 0.415])));
    out.push(new THREE.Mesh(pane([[x, 0.965, 0.07], [x, 0.965, 1.00], [x, 1.38, 0.43], [x, 1.38, 0.07]]), mk(1, [0.93, 0.415])));
  }
  for (const m of out) { m.frustumCulled = false; m.renderOrder = 5; m.name = 'taxi-glass'; }
  return out;
}
export class Intro {
  constructor(engine, world, mats, sound, hooks = {}) {
    this.engine = engine; this.world = world; this.sound = sound; this.hooks = hooks; this.active = false; this.inCar = false; this.t = 0; this.carOn = false; this.mesh = null;
    const room = world.rooms.street, g = room && assetGeometry('car_taxi', 0, null, toGeometry, Acc); if (!g) return;
    // the ride's timing comes from the route (the door opens 0.9 s after it stops, control 4.3 s later, it leaves 0.9 s after that)
    const plan = (room.x && room.x.traffic) || { zt: 56, zc: 63, sw: [STREET.x0 - 6, STREET.x0 + 2], se: [STREET.x1 - 2, STREET.x1 + 6] };
    this.R = streetRoutes(plan, STOP_X); this.ARRIVE = this.R.taxiIn.dur; this.SHOT_B = this.ARRIVE + 0.9; this.END_T = this.SHOT_B + 4.3; this.LEAVE = this.SHOT_B + 5.2;
    this.car = { route: null, s: 0, v: 0, x: 0, z: 0, h: 0, r: 1.9 }; this.traffic = null; this.snd = null;   // the taxi as the other cars see it; main.js sets traffic
    const inst = (geo) => { for (const [n, k] of [['iLh', 3], ['iLf', 3], ['iLs', 1]]) geo.setAttribute(n, new THREE.InstancedBufferAttribute(new Float32Array(k), k)); return geo; };
    const m = new THREE.InstancedMesh(inst(g), mats.litFor(room.U, g, true), 1); m.frustumCulled = false; m.visible = false; room.group.add(m);
    this.mesh = m; this.room = room; this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._up = new THREE.Vector3(0, 1, 0); this._H = [0, 0, 0]; this._F = [0, 0, 0];
    // the cabin (drawn only while you ride): its lit parts as one instance, its screens as a glow mesh, two wiper blades
    // v11: the modelled cabin (tools/blender/cabin.py, a real driver beside it); the box-built cabin only if that model failed to load
    const WHEEL = /^(Rim|Spoke|Hub)/, ca = assetGeometry('taxi_cabin', 0, null, toGeometry, Acc, null, (n) => !WHEEL.test(n)); this.modelled = !!ca;
    // v14 the steering wheel apart from the cabin, its pivot (the hub, cabin.py C) at its origin, so it can turn on its column
    const wg = ca && assetGeometry('taxi_cabin', 0, new THREE.Matrix4().makeTranslation(0.36, -0.97, -0.56), toGeometry, Acc, null, (n) => WHEEL.test(n));
    if (wg) { this.wheel = new THREE.InstancedMesh(inst(wg), mats.litFor(room.U, wg, true), 1); this.wheel.frustumCulled = false; this.wheel.visible = false; this.wheel.name = 'taxi-wheel'; room.group.add(this.wheel); }
    this._wm = new THREE.Matrix4(); this._wq = new THREE.Quaternion(); this._hPrev = null;
    const cg = inst(ca || cabin()); this.cab = new THREE.InstancedMesh(cg, mats.litFor(room.U, cg, true), 1); this.cab.frustumCulled = false; this.cab.visible = false; this.cab.name = 'taxi-cabin'; room.group.add(this.cab);
    this.rig = new THREE.Group(); this.rig.matrixAutoUpdate = false; this.rig.visible = false; room.group.add(this.rig);
    const gl = new THREE.Mesh(cabinGlow(), mats.glowMat(room.U)); gl.frustumCulled = false; this.rig.add(gl);
    this.wipers = [-0.32, 0.36].map((x) => { const piv = new THREE.Group(); piv.position.set(x, 0.975, 1.04); piv.rotation.x = -1.02; const bl = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.5, 0.012), new THREE.MeshBasicMaterial({ color: 0x050506 })); bl.position.y = 0.25; const arm = new THREE.Group(); arm.add(bl); piv.add(arm); this.rig.add(piv); return arm; });
    this.glass = this.modelled ? wetGlass() : []; for (const g of this.glass) this.rig.add(g);
    this._eye = new THREE.Vector3(); this._look = new THREE.Vector3();
    // the street's screen-light uniforms carry the light sliding through the cabin while you ride (no street surface uses them); kept to restore
    const U = room.U; this._u0 = { s: U.uScreen.value.clone(), d: U.uScreenD.value.clone(), x: U.uScreenX.value.clone(), n: U.uScreenN.value.clone() };
    this._sw = { k: 0, c: new THREE.Color(1, 0.85, 0.65), dir: new THREE.Vector3(0, 1, 0) }; this.driver = null;
    this._dl = { amb: new THREE.Color(), key: new THREE.Color(), dir: new THREE.Vector3(), screen: new THREE.Color(0, 0, 0) };
  }
  // the driver: a seated person with hands on the wheel, riding in the cabin's frame (made when the avatars are ready)
  _mkDriver() {
    if (this.driver || !this.modelled || !DATA.ready) return this.driver;
    const rec = staffRecipe('driver', 23), p = new Person(rec, { staff: true }); p.scale = DRV.scale; p.model.scale.setScalar(DRV.scale);
    p.s.sit = 1; p.s.drop = DRV.seat - p.sitH * DRV.scale; p.s.recline = DRV.recline; p.gestT = 'drive'; p.snap = true;
    p.group.position.set(DRV.x, DRV.y, DRV.z); p.group.rotation.y = DRV.yaw; this.rig.add(p.group); this.driver = p; return p;
  }
  // the strongest street light reaching the cabin through the glass (lights above the windows' sill; spots and signs by their aim): it
  // slides through the cabin as the taxi passes, front to back, along the shader's directional term
  _sweep(x, z, dt) {
    const L = this.room.lights.L, n = L.length / 14, cy = 1.2; let best = 0, j0 = -1, bd = null;
    for (let k = 0; k < n; k++) {
      const j = k * 14; if (L[j + 1] < 1.6) continue; const dx = L[j] - x, dy = L[j + 1] - cy, dz = L[j + 2] - z, d2 = dx * dx + dy * dy + dz * dz, r = L[j + 6]; if (d2 > r * r) continue;
      const d = Math.sqrt(d2) || 1e-4, ux = dx / d, uy = dy / d, uz = dz / d, type = L[j + 13];
      let w = Math.max(L[j + 3], L[j + 4], L[j + 5]) / (1 + d2) * (1 - (d2 / (r * r)) ** 2) ** 2;
      if (type === 1) w *= smoothstep(L[j + 12], L[j + 11], -(ux * L[j + 8] + uy * L[j + 9] + uz * L[j + 10]));
      else if (type === 2) { const c = -(ux * L[j + 8] + uy * L[j + 9] + uz * L[j + 10]); if (c <= 0) continue; w *= c; }
      if (w > best) { best = w; j0 = j; bd = [ux, uy, uz]; }
    }
    const S = this._sw, f = Math.min(1, dt * 9);
    if (j0 >= 0) { const m = Math.max(L[j0 + 3], L[j0 + 4], L[j0 + 5]) || 1; S.c.lerp(new THREE.Color(L[j0 + 3] / m, L[j0 + 4] / m, L[j0 + 5] / m), f); S.dir.lerp(new THREE.Vector3(bd[0], bd[1], bd[2]), f).normalize(); }
    S.k += (Math.min(best, 1.6) - S.k) * f; return S;
  }
  // where the taxi is at time t: the scripted ride in (the same every time), waiting in the bay, then driven out (update moves this.car)
  pose(t) {
    const In = this.R.taxiIn; if (this.car.route === this.R.taxiOut) return this.car;
    return In.at(t < this.ARRIVE ? In.sAt(t) : In.L);
  }
  // round bodies along the taxi while you are outside it (main.js adds them to the crowd's): you walk round it, never through it
  bodiesNear(x, z, r, out = []) { const c = this.car; if (!this.carOn || this.inCar || Math.abs(c.x - x) > r + 3 || Math.abs(c.z - z) > r + 3) return out; for (const k of [-1.45, 0, 1.45]) out.push({ x: c.x + Math.sin(c.h) * k, z: c.z + Math.cos(c.h) * k, r: 0.92 }); return out; }
  _place(t) {
    const P = this.pose(t), x = P.x, z = P.z, yaw = P.h; if (P !== this.car) { this.car.x = x; this.car.z = z; this.car.h = yaw; }   // the car's nose (+z) along its motion
    this._q.setFromAxisAngle(this._up, yaw); this._m.compose(new THREE.Vector3(x, ROAD_Y, z), this._q, new THREE.Vector3(1, 1, 1)); this.mesh.setMatrixAt(0, this._m); this.mesh.instanceMatrix.needsUpdate = true;
    const L = this.room.lights, G = this.mesh.geometry.attributes; L.at(x, 0.9, z, 0, 1, 0, this._H, this._F); carFloor(this._H); G.iLh.array.set(this._H); G.iLf.array.set(this._F); G.iLh.needsUpdate = G.iLf.needsUpdate = true;
    if (this.inCar) { this.cab.setMatrixAt(0, this._m); this.cab.instanceMatrix.needsUpdate = true; this.rig.matrix.copy(this._m); this.rig.matrixWorldNeedsUpdate = true;
      { const dt = this._dt || 0.016, dh = this._hPrev == null ? 0 : Math.atan2(Math.sin(yaw - this._hPrev), Math.cos(yaw - this._hPrev)); this._hPrev = yaw;   // the wheel: about 2.4 turns of the heading's rate, eased
        const want = Math.max(-2.4, Math.min(2.4, (dh / Math.max(dt, 1e-3)) * 2.4)); STEER.v += (want - STEER.a) * Math.min(1, dt * 4) - STEER.v * Math.min(1, dt * 6); STEER.a += STEER.v * Math.min(1, dt * 10);
        if (this.wheel) { this._wq.setFromAxisAngle(W_AX, STEER.a); this._wm.compose(new THREE.Vector3(-0.36, 0.97, 0.56), this._wq, new THREE.Vector3(1, 1, 1)).premultiply(this._m); this.wheel.setMatrixAt(0, this._wm); this.wheel.instanceMatrix.needsUpdate = true;
          const WA = this.wheel.geometry.attributes, CA = this.cab.geometry.attributes; WA.iLh.array.set(CA.iLh.array); WA.iLf.array.set(CA.iLf.array); WA.iLs.array.set(CA.iLs.array); WA.iLh.needsUpdate = WA.iLf.needsUpdate = WA.iLs.needsUpdate = true; } }
      // v11 night: the street's light through the glass (dimmer, it comes in sideways), the cabin's own low glow, and the light of the
      // nearest street lamp or sign sliding through the cabin as you pass it (iLs with the street's screen-light uniforms)
      const C = this.cab.geometry.attributes, S = this._sweep(x, z, this._dt || 0.016), U = this.room.U;
      for (let i = 0; i < 3; i++) { C.iLh.array[i] = this._H[i] * 0.6 + NIGHT[i]; C.iLf.array[i] = this._F[i] * 0.6; } C.iLs.array[0] = S.k; C.iLh.needsUpdate = C.iLf.needsUpdate = C.iLs.needsUpdate = true;
      U.uScreen.value.copy(S.c); U.uScreenD.value.set(0, 0, 0); U.uScreenN.value.copy(S.dir); }
    return [x, z];
  }
  // in the cabin or out of it: the cabin and the taxi's outside are never drawn together
  _ride(on) {
    this.inCar = on; this.cab.visible = on; this.rig.visible = on; this.mesh.visible = !on; if (this.wheel) this.wheel.visible = on; this._hPrev = null;
    if (!on) { const U = this.room.U, o = this._u0; U.uScreen.value.copy(o.s); U.uScreenD.value.copy(o.d); U.uScreenX.value.copy(o.x); U.uScreenN.value.copy(o.n); }
  }
  start(o = {}) {
    if (!this.mesh) { this.hooks.done && this.hooks.done(); return false; }
    this.active = true; this.t = 0; this.skippable = !!o.skippable; this.carOn = true; this._door = 0; this._said = 0; this._cut = false; this.car.route = null; this.car.v = 0; if (this.snd) { this.snd.stop(); this.snd = null; }
    this._mkDriver(); this._ride(true); document.body.classList.add('cutscene');
    this._inside(true);
    const b = document.querySelector('#skipCut'); if (b) { b.hidden = !this.skippable; b.onclick = () => this.finish(); }
    this.hooks.fade && this.hooks.fade(0, 0.9); return true;
  }
  // the ride's sound from inside: the interior recording and the rain on the roof; both stop when the door opens
  _inside(on) { const S = this.sound; if (S.carRide) S.carRide(on); if (S.carRain) S.carRain(on); }
  finish() {
    if (!this.active) return; this.active = false; this._inside(false); document.body.classList.remove('cutscene'); const b = document.querySelector('#skipCut'); if (b) b.hidden = true;
    this._ride(false); this.t = Math.max(this.t, this.SHOT_B + 3.1); this._door = 3; this._place(this.t); if (!this.snd && this.sound.vehicle) this.snd = this.sound.vehicle();   // skipped: the taxi is at its bay and leaves as it would have
    this.hooks.done && this.hooks.done();
  }
  // per frame: the taxi (also after you have control), and the camera while the scene runs
  update(dt, player) {
    if (!this.carOn) return; this.t += dt; this._dt = dt; const t = this.t, [cx, cz] = this._place(t);
    if (this.inCar && !this.driver) this._mkDriver();   // the avatars may finish loading after the ride starts: seat him as soon as they do
    if (this.driver && this.inCar) {   // lit like the cabin: its ambient, and the passing light as the key
      const D = this._dl, S = this._sw, a = (i) => Math.min(0.55, this._H[i] * 0.5 + NIGHT[i] * 1.6); D.amb.setRGB(a(0), a(1), a(2)); D.key.copy(S.c).multiplyScalar(Math.min(0.75, S.k * 0.8)); D.dir.copy(S.dir);
      this.rig.updateMatrixWorld(true); this.driver.update(dt, D); }
    // the leaving: once the door has shut, you have control and nothing is coming along the near lane, it pulls out (and waits for you if
    // you stand in its way); round the east corner it is gone
    if (t > this.LEAVE && this.car.route !== this.R.taxiOut && !this.active && !(this.traffic && this.traffic.comingTo(STOP_X, this.R.lane.near))) { this.car.route = this.R.taxiOut; this.car.s = 0; this.car.v = 0; }
    if (this.car.route === this.R.taxiOut) {
      const obs = [{ x: player.x, z: player.z, r: 1.5 }, ...(this.traffic ? this.traffic.cars : [])];
      if (drive(this.car, dt, obs)) { this.carOn = false; this.mesh.visible = false; if (this.snd) { this.snd.stop(); this.snd = null; } return; }
      this._place(t); }
    // outside the cabin its engine and tyres are heard from where it is (sound9.js vehicle); inside, the cabin recording carries it
    if (this.snd) this.snd.set(cx, cz, this.car.route === this.R.taxiOut ? this.car.v : 0, this.hear ?? 1);
    const say = (k) => this.hooks.driver && this.hooks.driver(k, cx, cz);
    if (t > 2.2 && this._said < 1 && this.active) { this._said = 1; say('drv.ride'); }
    if (t > this.ARRIVE + 0.1 && this._said < 2 && this.active) { this._said = 2; say('drv.arrive'); }
    if (t > this.SHOT_B && this._door < 1) { this._door = 1; this._inside(false); if (!this.snd && this.sound.vehicle) this.snd = this.sound.vehicle(); if (this.sound.carDoor) this.sound.carDoor(true); else this.sound.door(true, 0.9); }
    if (t > this.SHOT_B + 1.75 && this._door < 2) { this._door = 2; if (this.sound.carDoor) this.sound.carDoor(false); else { this.sound.door(false, 1.2); this.sound.thud && this.sound.thud(); } say('drv.bye'); }
    if (t > this.SHOT_B + 3.0 && this._door < 3) this._door = 3;
    if (!this.active) return;
    const cam = this.engine.camera;
    const SHOT_B = this.SHOT_B, ARRIVE = this.ARRIVE;
    if (t < SHOT_B) {
      // the ride: your eye in the back seat (the road's small shudder, a nod as the car brakes); you look ahead between the front seats,
      // then, as the cinema comes up on the kerb side, at its doors through your own window
      const sp = t < ARRIVE ? this.R.taxiIn.vAt(t) / 9 : 0, brake = t < ARRIVE ? Math.sin(Math.PI * clamp((t - ARRIVE + 2.4) / 2.4)) : 0;
      this._eye.set(SEAT_EYE[0], SEAT_EYE[1] + Math.sin(t * 9.1) * 0.004 * sp + Math.sin(t * 2.3) * 0.006 * sp, SEAT_EYE[2] + brake * 0.035).applyMatrix4(this._m); cam.position.copy(this._eye);
      const k = ease((t - (ARRIVE - 4.0)) / 3.2), ax = this._look.set(0.0, 1.16, 9).applyMatrix4(this._m);
      cam.lookAt(lerp(ax.x, 0.6, k), lerp(ax.y, 1.95, k), lerp(ax.z, 18.5, k));
      const w = Math.sin(t * 4.2) * 0.5 + 0.5; this.wipers[0].rotation.z = -0.15 - w * 1.25; this.wipers[1].rotation.z = -0.15 - w * 1.25;
      const spd = t < ARRIVE ? this.R.taxiIn.vAt(t) : 0, S = this._sw;
      for (const g of this.glass) { const u = g.material.uniforms; u.uT.value = t; u.uSpeed.value = spd; u.uLit.value.copy(S.c).multiplyScalar(Math.min(1.2, 0.3 + S.k)); }
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
    if (t >= this.END_T) this.finish();
  }
}
