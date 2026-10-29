// Procedural pose library (no THREE dependency, unit-testable). Angles in radians, bones' rest frames are world-aligned.
// X rotation: +x swings a hanging limb BACKWARD (so legs/arms forward = negative x), knees/elbows flex with +x/-x respectively.
// Z rotation on the LEFT (+x side) arm: + raises it outward; on the RIGHT arm the sign is mirrored.
const sin = Math.sin, cos = Math.cos, PI = Math.PI;
export const BONE_NAMES = ['hips', 'spine', 'chest', 'neck', 'head', 'upperArmL', 'foreArmL', 'handL', 'upperArmR', 'foreArmR', 'handR', 'thighL', 'shinL', 'footL', 'thighR', 'shinR', 'footR'];
export const makePose = () => { const o = { hipsY: 0, hipsZ: 0, b: {} }; for (const n of BONE_NAMES) o.b[n] = [0, 0, 0]; return o; };
export const resetPose = (o) => { o.hipsY = 0; o.hipsZ = 0; for (const n of BONE_NAMES) { const a = o.b[n]; a[0] = a[1] = a[2] = 0; } return o; };
const set = (o, n, x, y = 0, z = 0) => { const a = o.b[n]; a[0] = x; a[1] = y; a[2] = z; };
// ---- base layers
export function stand(o, t, ph, k = 0) {   // k = personality seed 0..6.28
  const br = sin(t * 1.7 + k) * 0.014, sw = sin(t * 0.45 + k) * 0.025;
  set(o, 'spine', br, sw * 0.5, sw); set(o, 'chest', br * 1.2, -sw, -sw * 0.5); set(o, 'head', sin(t * 0.6 + k) * 0.03, sin(t * 0.37 + k * 2) * 0.12, 0);
  set(o, 'upperArmL', 0.06 + br, 0, 0.1); set(o, 'upperArmR', 0.06 + br, 0, -0.1); set(o, 'foreArmL', -0.22, 0, 0); set(o, 'foreArmR', -0.22, 0, 0);
  set(o, 'thighL', sw * 0.6, 0, -0.02); set(o, 'thighR', -sw * 0.6, 0, 0.02); set(o, 'shinL', 0.03); set(o, 'shinR', 0.03); o.hipsY = -0.004 * sin(t * 0.9 + k); o.hipsZ = 0;
}
export function walk(o, t, ph, k = 0, speed = 1.3) {
  const a = Math.min(1, speed / 1.3), s = sin(ph), c = cos(ph), s2 = sin(ph + PI), c2 = cos(ph + PI);
  set(o, 'thighL', -0.62 * a * s, 0, 0); set(o, 'thighR', -0.62 * a * s2, 0, 0);
  set(o, 'shinL', 0.12 + 0.95 * a * Math.pow(Math.max(0, c), 1.4), 0, 0); set(o, 'shinR', 0.12 + 0.95 * a * Math.pow(Math.max(0, c2), 1.4), 0, 0);
  set(o, 'footL', -0.1 * a * s, 0, 0); set(o, 'footR', -0.1 * a * s2, 0, 0);
  set(o, 'upperArmL', 0.55 * a * s, 0, 0.08); set(o, 'upperArmR', 0.55 * a * s2, 0, -0.08); set(o, 'foreArmL', -0.3 - 0.25 * a * Math.max(0, -s), 0, 0); set(o, 'foreArmR', -0.3 - 0.25 * a * Math.max(0, -s2), 0, 0);
  set(o, 'hips', 0, 0.09 * a * s, 0.045 * a * s); set(o, 'spine', 0.03, -0.06 * a * s, -0.02 * a * s); set(o, 'chest', 0.02, -0.08 * a * s, 0); set(o, 'head', 0, 0.02 * a * s, 0);
  o.hipsY = -0.012 * a - 0.014 * a * Math.abs(c); o.hipsZ = 0;
}
export function sit(o, t, ph, k = 0, lean = 0.12) {   // seated on a cushion: pelvis ~35 cm lower; thighs forward, shins down
  const br = sin(t * 1.5 + k) * 0.012;
  set(o, 'hips', 0, 0, 0); set(o, 'spine', -lean * 0.5 + br, 0, 0); set(o, 'chest', -lean * 0.5 + br, 0, 0); set(o, 'head', lean * 0.8 + sin(t * 0.5 + k) * 0.03, sin(t * 0.3 + k) * 0.1, 0);
  set(o, 'thighL', -1.5, 0, -0.08); set(o, 'thighR', -1.5, 0, 0.08); set(o, 'shinL', 1.45, 0, 0); set(o, 'shinR', 1.45, 0, 0); set(o, 'footL', 0.05, 0, 0); set(o, 'footR', 0.05, 0, 0);
  set(o, 'upperArmL', -0.32, 0, 0.3); set(o, 'upperArmR', -0.32, 0, -0.3); set(o, 'foreArmL', -0.95, 0, 0); set(o, 'foreArmR', -0.95, 0, 0);
  o.hipsY = -0.36; o.hipsZ = -0.02;
}
// ---- gesture overlays (arms / head only)
export function clap(o, t, ph, k = 0) { const c = 0.5 + 0.5 * sin(t * 11 + k * 0.3), s = 0.22 * c;
  set(o, 'upperArmL', -1.0, 0, -0.22 + s); set(o, 'upperArmR', -1.0, 0, 0.22 - s); set(o, 'foreArmL', -1.35 + 0.1 * c, 0, 0); set(o, 'foreArmR', -1.35 + 0.1 * c, 0, 0); set(o, 'handL', 0, 0, 0); set(o, 'head', 0.04, o.b.head[1], 0); }
export function cheer(o, t, ph, k = 0) { const w = sin(t * 8 + k), u = sin(t * 9 + k * 1.7);
  set(o, 'upperArmL', -0.1 + 0.25 * u, 0, 2.55 + 0.12 * w); set(o, 'upperArmR', -0.1 - 0.25 * u, 0, -2.55 - 0.12 * w); set(o, 'foreArmL', -0.25 - 0.2 * w, 0, 0); set(o, 'foreArmR', -0.25 + 0.2 * w, 0, 0); set(o, 'head', -0.25, o.b.head[1], 0); set(o, 'chest', -0.12 + 0.05 * w, o.b.chest[1], 0); o.hipsY += 0.012 * Math.abs(w); }
export function wave(o, t) { set(o, 'upperArmR', -0.15, 0, -2.3); set(o, 'foreArmR', -0.3, 0, -0.35 * sin(t * 7)); set(o, 'head', 0.03, o.b.head[1], 0.05); }
export function talk(o, t, ph, k = 0) { set(o, 'upperArmR', -0.7 + 0.2 * sin(t * 3 + k), 0, -0.25); set(o, 'foreArmR', -1.15 + 0.35 * sin(t * 4.3 + k), 0, 0); set(o, 'upperArmL', -0.25 + 0.12 * sin(t * 2.4 + k), 0, 0.22); set(o, 'foreArmL', -0.8 + 0.2 * sin(t * 3.1 + k), 0, 0); set(o, 'head', 0.05 * sin(t * 4 + k) + 0.02, o.b.head[1], 0); }
export function laugh(o, t, ph, k = 0) { const w = sin(t * 14 + k); set(o, 'head', -0.18 + 0.05 * w, o.b.head[1], 0); set(o, 'chest', -0.06 + 0.07 * w, o.b.chest[1], 0); set(o, 'upperArmL', -0.3, 0, 0.2); set(o, 'upperArmR', -0.3, 0, -0.2); set(o, 'foreArmL', -1.0, 0, 0); set(o, 'foreArmR', -1.0, 0, 0); o.hipsY += 0.008 * Math.abs(w); }
export function point(o, t) { set(o, 'upperArmR', -1.45, 0, -0.1); set(o, 'foreArmR', -0.1, 0, 0); }
export function type(o, t, ph, k = 0) { set(o, 'upperArmL', -0.55, 0, 0.18); set(o, 'upperArmR', -0.55, 0, -0.18); set(o, 'foreArmL', -1.0 + 0.1 * sin(t * 13 + k), 0, 0); set(o, 'foreArmR', -1.0 + 0.1 * sin(t * 11 + k), 0, 0); set(o, 'head', 0.28, o.b.head[1], 0); }
export function hold(o) { set(o, 'upperArmR', -0.8, 0, -0.1); set(o, 'foreArmR', -1.2, 0, 0); }
export const BASES = { stand, walk, sit };
export const GESTURES = { none: null, clap, cheer, wave, talk, laugh, point, type, hold };
// head/torso look-at: yawRel = angle to target relative to the body's facing (rad, + = to the character's left)
export function applyLook(o, yawRel, pitch = 0, amount = 1) {
  const y = Math.max(-1.1, Math.min(1.1, yawRel)) * amount; o.b.head[1] += y * 0.62; o.b.neck[1] += y * 0.2; o.b.chest[1] += y * 0.12; o.b.head[0] += Math.max(-0.4, Math.min(0.4, -pitch)) * amount * 0.7; }
export function compose(o, base, gesture, t, ph, k, speed) { resetPose(o); BASES[base](o, t, ph, k, speed); const g = GESTURES[gesture]; if (g) g(o, t, ph, k); return o; }
