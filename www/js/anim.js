// LUMIERE v5 - procedural pose library (no THREE; unit-testable). Bones rest in a straight, world-aligned stance (identity rotations), facing +z.
// X rotation: + swings a hanging limb BACKWARD (limbs forward = negative x) and bends the spine FORWARD; knees bend with +x, elbows with -x.
// Z rotation on the LEFT arm (+x side): + lifts it outward; mirrored (negative) on the right.
const sin = Math.sin, cos = Math.cos, PI = Math.PI, max = Math.max;
export const BONE_NAMES = ['hips', 'spine', 'chest', 'neck', 'head', 'upperArmL', 'foreArmL', 'handL', 'upperArmR', 'foreArmR', 'handR', 'thighL', 'shinL', 'footL', 'thighR', 'shinR', 'footR'];
export const makePose = () => { const o = { hipsY: 0, hipsZ: 0, b: {} }; for (const n of BONE_NAMES) o.b[n] = [0, 0, 0]; return o; };
export const resetPose = (o) => { o.hipsY = 0; o.hipsZ = 0; for (const n of BONE_NAMES) { const a = o.b[n]; a[0] = a[1] = a[2] = 0; } return o; };
const set = (o, n, x, y = 0, z = 0) => { const a = o.b[n]; a[0] = x; a[1] = y; a[2] = z; };
const add = (o, n, x, y = 0, z = 0) => { const a = o.b[n]; a[0] += x; a[1] += y; a[2] += z; };
export function lerpPose(o, a, b, t) { o.hipsY = a.hipsY + (b.hipsY - a.hipsY) * t; o.hipsZ = a.hipsZ + (b.hipsZ - a.hipsZ) * t; for (const n of BONE_NAMES) { const p = a.b[n], q = b.b[n], r = o.b[n]; r[0] = p[0] + (q[0] - p[0]) * t; r[1] = p[1] + (q[1] - p[1]) * t; r[2] = p[2] + (q[2] - p[2]) * t; } return o; }
const ARMS = ['upperArmL', 'foreArmL', 'handL', 'upperArmR', 'foreArmR', 'handR'];
// ---------------- bases ----------------
export function stand(o, t, k = 0) {   // relaxed idle: breathing, slow weight shift, hands slightly forward
  const br = sin(t * 1.6 + k) * 0.012, sw = sin(t * 0.37 + k) * 0.03;
  set(o, 'hips', 0, sw * 0.4, sw * 0.5); set(o, 'spine', 0.02 + br, -sw * 0.3, -sw * 0.6); set(o, 'chest', br, 0, 0); set(o, 'neck', 0.02, 0, 0); set(o, 'head', 0.03 + sin(t * 0.5 + k) * 0.02, sin(t * 0.23 + k * 2) * 0.18, 0);
  set(o, 'upperArmL', -0.05 + br, 0, 0.09); set(o, 'upperArmR', -0.05 + br, 0, -0.09); set(o, 'foreArmL', -0.22, 0, 0); set(o, 'foreArmR', -0.22, 0, 0); set(o, 'handL', 0, 0.2, 0); set(o, 'handR', 0, -0.2, 0);
  set(o, 'thighL', 0.02 + sw * 0.3, 0, -0.02 - sw * 0.5); set(o, 'thighR', 0.02 - sw * 0.3, 0, 0.02 - sw * 0.5); set(o, 'shinL', 0.04); set(o, 'shinR', 0.04); set(o, 'footL', -0.04); set(o, 'footR', -0.04);
  o.hipsY = -0.004 - Math.abs(sw) * 0.03; o.hipsZ = 0;
}
export function walk(o, t, ph, k = 0, speed = 1.2) {   // ph advances with distance; amplitude grows with speed
  const a = Math.min(1.25, 0.35 + speed / 1.6), s = sin(ph), c = cos(ph);
  set(o, 'thighL', -0.48 * a * s, 0, -0.02); set(o, 'thighR', 0.48 * a * s, 0, 0.02);
  set(o, 'shinL', 0.12 + 1.05 * a * max(0, c) ** 2, 0, 0); set(o, 'shinR', 0.12 + 1.05 * a * max(0, -c) ** 2, 0, 0);
  set(o, 'footL', -0.25 * a * max(0, s) + 0.2 * a * max(0, -s) * 0.5, 0, 0); set(o, 'footR', -0.25 * a * max(0, -s) + 0.1 * a * max(0, s), 0, 0);
  set(o, 'upperArmL', 0.42 * a * s, 0, 0.08); set(o, 'upperArmR', -0.42 * a * s, 0, -0.08); set(o, 'foreArmL', -0.32 - 0.3 * a * max(0, -s), 0, 0); set(o, 'foreArmR', -0.32 - 0.3 * a * max(0, s), 0, 0);
  set(o, 'hips', 0, 0.12 * a * s, 0.035 * a * c); set(o, 'spine', 0.05 * a, -0.07 * a * s, -0.02 * a * c); set(o, 'chest', 0.02, -0.08 * a * s, 0); set(o, 'neck', 0.02, 0.04 * a * s, 0); set(o, 'head', -0.02, 0.06 * a * s, 0);
  o.hipsY = -0.012 - 0.028 * a * s * s; o.hipsZ = 0;
}
// seated: pelvis drops to the cushion; thighs forward, shins down; recline leans the back on the backrest
export function sit(o, t, k = 0, drop = 0.4, recline = 0.1) {
  const br = sin(t * 1.4 + k) * 0.01;
  set(o, 'hips', 0, 0, 0); set(o, 'spine', -recline * 0.6 + br, 0, 0); set(o, 'chest', -recline * 0.4 + br, 0, 0); set(o, 'neck', recline * 0.5, 0, 0); set(o, 'head', recline * 0.4 + 0.02 + sin(t * 0.4 + k) * 0.02, sin(t * 0.21 + k) * 0.14, 0);
  set(o, 'thighL', -1.52, 0, -0.1); set(o, 'thighR', -1.52, 0, 0.1); set(o, 'shinL', 1.5, 0, 0); set(o, 'shinR', 1.5, 0, 0); set(o, 'footL', 0.05, 0, 0); set(o, 'footR', 0.05, 0, 0);
  set(o, 'upperArmL', -0.42, 0, 0.32); set(o, 'upperArmR', -0.42, 0, -0.32); set(o, 'foreArmL', -0.95, 0, -0.1); set(o, 'foreArmR', -0.95, 0, 0.1); set(o, 'handL', 0, 0.3, 0); set(o, 'handR', 0, -0.3, 0);
  o.hipsY = -drop; o.hipsZ = -0.03;
}
// sitting down / getting up: u 0 = standing, 1 = seated. Knees bend first, the torso leans forward over the feet, then the pelvis lands and the back settles.
const _a = makePose(), _b = makePose();
export function sitBlend(o, t, k, u, drop, recline) {
  resetPose(_a); stand(_a, t, k); resetPose(_b); sit(_b, t, k, drop, recline);
  const e = u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u); lerpPose(o, _a, _b, e);
  const lean = sin(PI * Math.min(1, u * 1.15)) * 0.55; add(o, 'spine', lean * 0.6, 0, 0); add(o, 'chest', lean * 0.4, 0, 0); add(o, 'head', -lean * 0.5, 0, 0);
  add(o, 'upperArmL', -lean * 0.6, 0, 0.1 * lean); add(o, 'upperArmR', -lean * 0.6, 0, -0.1 * lean); o.hipsZ -= lean * 0.06; o.hipsY = -drop * (u < 0.7 ? u * u * 0.9 : 0.44 + (u - 0.7) / 0.3 * 0.56);
}
// ---------------- gestures (arms / head / torso), weight w blends them over the base ----------------
const G = {
  clap(o, t, k) { const c = 0.5 + 0.5 * sin(t * 12 + k * 0.3); set(o, 'upperArmL', -0.95, 0, -0.18 + 0.2 * c); set(o, 'upperArmR', -0.95, 0, 0.18 - 0.2 * c); set(o, 'foreArmL', -1.25, 0, 0); set(o, 'foreArmR', -1.25, 0, 0); set(o, 'handL', 0, -0.6, 0); set(o, 'handR', 0, 0.6, 0); },
  cheer(o, t, k) { const w = sin(t * 7 + k), u = sin(t * 8.5 + k * 1.7); set(o, 'upperArmL', -0.2 + 0.2 * u, 0, 2.55 + 0.15 * w); set(o, 'upperArmR', -0.2 - 0.2 * u, 0, -2.55 - 0.15 * w); set(o, 'foreArmL', -0.35 - 0.25 * w, 0, 0); set(o, 'foreArmR', -0.35 + 0.25 * w, 0, 0); add(o, 'head', -0.22, 0, 0); add(o, 'chest', -0.08, 0, 0); o.hipsY += 0.012 * Math.abs(w); },
  scream(o, t, k) { const j = sin(t * 23 + k) * 0.03; set(o, 'upperArmL', -1.25, 0, -0.38); set(o, 'upperArmR', -1.25, 0, 0.38); set(o, 'foreArmL', -2.25 + j, 0, 0); set(o, 'foreArmR', -2.25 - j, 0, 0); add(o, 'head', -0.2 + j, 0, 0); add(o, 'chest', -0.12, 0, 0); add(o, 'spine', -0.06, 0, 0); },
  gasp(o, t, k) { set(o, 'upperArmR', -1.05, 0, 0.32); set(o, 'foreArmR', -2.15, 0, 0); set(o, 'upperArmL', -0.55, 0, 0.12); set(o, 'foreArmL', -1.7, 0, 0.3); add(o, 'head', -0.12, 0, 0); add(o, 'chest', -0.12, 0, 0); },
  laugh(o, t, k) { const w = sin(t * 13 + k); set(o, 'upperArmL', -0.35, 0, 0.18); set(o, 'foreArmL', -1.35, 0, 0.5); set(o, 'upperArmR', -0.55 + 0.1 * w, 0, -0.22); set(o, 'foreArmR', -1.0, 0, 0); add(o, 'head', -0.2 + 0.06 * w, 0, 0.05); add(o, 'chest', -0.05 + 0.07 * w, 0, 0); o.hipsY += 0.006 * Math.abs(w); },
  aww(o, t, k) { set(o, 'upperArmL', -0.6, 0, -0.12); set(o, 'upperArmR', -0.6, 0, 0.12); set(o, 'foreArmL', -1.75, 0, 0); set(o, 'foreArmR', -1.75, 0, 0); add(o, 'head', 0.05, 0, 0.18); },
  shush(o, t, k) { set(o, 'upperArmR', -1.15, 0, 0.36); set(o, 'foreArmR', -2.3, 0, 0); set(o, 'handR', 0, 0, 0.3); add(o, 'head', 0.05, 0.25, 0); },
  shrug(o, t, k) { const w = Math.min(1, (t % 3) * 2); set(o, 'upperArmL', -0.25, 0, 0.42 * w); set(o, 'upperArmR', -0.25, 0, -0.42 * w); set(o, 'foreArmL', -1.35, 0.3, 0); set(o, 'foreArmR', -1.35, -0.3, 0); add(o, 'head', 0, 0, 0.16 * w); add(o, 'chest', -0.03, 0, 0); },
  facepalm(o, t, k) { set(o, 'upperArmR', -1.45, 0, 0.3); set(o, 'foreArmR', -2.3, 0, 0); add(o, 'head', 0.28, 0, 0); add(o, 'chest', 0.08, 0, 0); },
  point(o, t) { set(o, 'upperArmR', -1.5, 0, -0.1); set(o, 'foreArmR', -0.12, 0, 0); add(o, 'head', 0, -0.1, 0); },
  wave(o, t) { set(o, 'upperArmR', -0.2, 0, -2.4); set(o, 'foreArmR', -0.35, 0, -0.4 * sin(t * 8)); add(o, 'head', 0.03, 0, 0.06); },
  talk(o, t, k) { set(o, 'upperArmR', -0.55 + 0.18 * sin(t * 2.6 + k), 0, -0.22); set(o, 'foreArmR', -1.2 + 0.35 * sin(t * 3.9 + k), 0, 0.2); set(o, 'upperArmL', -0.25 + 0.1 * sin(t * 2.1 + k), 0, 0.2); set(o, 'foreArmL', -0.75 + 0.2 * sin(t * 3.1 + k), 0, -0.1); add(o, 'head', 0.04 * sin(t * 3.5 + k), 0.08 * sin(t * 1.3 + k), 0); },
  type(o, t, k) { set(o, 'upperArmL', -0.5, 0, 0.15); set(o, 'upperArmR', -0.5, 0, -0.15); set(o, 'foreArmL', -1.0 + 0.08 * sin(t * 13 + k), 0, -0.2); set(o, 'foreArmR', -1.0 + 0.08 * sin(t * 11 + k), 0, 0.2); add(o, 'head', 0.3, 0, 0); },
  hold(o) { set(o, 'upperArmR', -0.35, 0, -0.12); set(o, 'foreArmR', -1.25, 0, 0.15); },
  give(o, t) { set(o, 'upperArmR', -1.25, 0, -0.05); set(o, 'foreArmR', -0.25, 0, 0); add(o, 'chest', 0.08, 0, 0); },
  scoop(o, t) { const c = 0.5 + 0.5 * sin(t * 4); set(o, 'upperArmR', -0.6 - 0.5 * c, 0, -0.15); set(o, 'foreArmR', -0.8 - 0.6 * c, 0, 0); set(o, 'upperArmL', -0.7, 0, 0.1); set(o, 'foreArmL', -1.2, 0, -0.2); add(o, 'head', 0.25, 0, 0); add(o, 'chest', 0.1, 0, 0); },
  pour(o, t) { set(o, 'upperArmR', -0.9, 0, -0.1); set(o, 'foreArmR', -0.7, 0.6, 0); set(o, 'upperArmL', -0.5, 0, 0.15); set(o, 'foreArmL', -1.3, 0, -0.3); add(o, 'head', 0.25, 0, 0); },
  eat(o, t, k) { const c = Math.max(0, sin(t * 2.2 + k)) ** 3; set(o, 'upperArmL', -0.4, 0, 0.2); set(o, 'foreArmL', -1.3, 0, -0.35); set(o, 'upperArmR', -0.55 - 0.5 * c, 0, 0.15 * c); set(o, 'foreArmR', -1.2 - 1.0 * c, 0, 0); },
  drink(o, t, k) { const c = Math.max(0, sin(t * 0.9 + k)) ** 4; set(o, 'upperArmR', -0.45 - 0.7 * c, 0, 0.18 * c); set(o, 'foreArmR', -1.3 - 0.9 * c, 0, 0); add(o, 'head', -0.18 * c, 0, 0); },
  arms(o) { set(o, 'upperArmL', -0.3, 0, -0.22); set(o, 'upperArmR', -0.3, 0, 0.22); set(o, 'foreArmL', -1.65, 0.9, 0); set(o, 'foreArmR', -1.65, -0.9, 0); },
  hips(o) { set(o, 'upperArmL', 0.15, 0, 0.55); set(o, 'upperArmR', 0.15, 0, -0.55); set(o, 'foreArmL', -1.45, 0, -0.6); set(o, 'foreArmR', -1.45, 0, 0.6); },
  phone(o, t, k) { set(o, 'upperArmL', -0.45, 0, -0.08); set(o, 'upperArmR', -0.45, 0, 0.08); set(o, 'foreArmL', -1.45, 0, 0); set(o, 'foreArmR', -1.45, 0, 0); add(o, 'head', 0.35, 0, 0); },
  lean(o, t) { add(o, 'spine', 0.18, 0, 0); add(o, 'chest', 0.08, 0, 0); add(o, 'head', -0.1, 0, 0); },
  bounce(o, t, k) { const w = Math.abs(sin(t * 8 + k)); o.hipsY += 0.02 * w; add(o, 'head', -0.06 * w, 0, 0); set(o, 'upperArmL', -0.6, 0, 0.3); set(o, 'upperArmR', -0.6, 0, -0.3); set(o, 'foreArmL', -1.6, 0, 0); set(o, 'foreArmR', -1.6, 0, 0); },
};
export const GESTURES = Object.keys(G);
const _g = makePose();
// state: { t, ph, seed, speed, walk (0..1), sit (0..1), drop, recline, gesture, gw (0..1), lookYaw, lookPitch, lookAmt }
export function compose(o, s) {
  resetPose(o);
  if (s.sit > 0.001) { if (s.sit < 0.999) sitBlend(o, s.t, s.seed, s.sit, s.drop, s.recline); else sit(o, s.t, s.seed, s.drop, s.recline); }
  else { stand(o, s.t, s.seed); if (s.walk > 0.01) { resetPose(_g); walk(_g, s.t, s.ph, s.seed, s.speed); lerpPose(o, o, _g, Math.min(1, s.walk)); } }
  const f = s.gesture && G[s.gesture]; if (f && s.gw > 0.01) { const keepHead = o.b.head.slice(), keepChest = o.b.chest.slice(); for (const n of BONE_NAMES) _g.b[n] = o.b[n].slice(); _g.hipsY = o.hipsY; _g.hipsZ = o.hipsZ; f(_g, s.t, s.seed);
    for (const n of BONE_NAMES) { const a = o.b[n], b = _g.b[n]; for (let i = 0; i < 3; i++) a[i] += (b[i] - a[i]) * s.gw; } o.hipsY += (_g.hipsY - o.hipsY) * s.gw; }
  if (s.lookAmt > 0.01) applyLook(o, s.lookYaw, s.lookPitch, s.lookAmt);
  return o;
}
// head/torso look-at: yawRel = angle to the target relative to the body's facing (+ = to the character's left)
export function applyLook(o, yawRel, pitch = 0, amount = 1) { const y = Math.max(-1.2, Math.min(1.2, yawRel)) * amount; o.b.head[1] += y * 0.6; o.b.neck[1] += y * 0.22; o.b.chest[1] += y * 0.12; o.b.head[0] += Math.max(-0.45, Math.min(0.45, -pitch)) * amount * 0.7; }
