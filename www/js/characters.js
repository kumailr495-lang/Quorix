// LUMIERE v5 - stylised people generated in code: rigid-skinned body parts (every LOD uses the same 17-bone skeleton, so walking and
// sitting work at any distance), outfits, hair styles, accessories, an expressive face (faces.js), blinking and lip-flap.
// Colours come from a per-character palette uniform, so people with the same shape share geometry.
import * as THREE from 'three';
import { BONE_NAMES, makePose, compose } from './anim.js';
import { faceAtlas, EXPR, EYES, MOUTH } from './faces.js';
import { Acc } from './geom.js';
const V = (x, y, z) => new THREE.Vector3(x, y, z), BI = Object.fromEntries(BONE_NAMES.map((n, i) => [n, i]));
const PART = { skin: 0, hair: 1, top: 2, bottom: 3, shoes: 4, accent: 5, inner: 6, dark: 7 };
// rest skeleton for scale 1 (about 1.74 m tall); bw = shoulder/torso width factor
export function restBones(bw = 1) {
  const p = { hips: [0, 0.95, 0], spine: [0, 1.06, 0], chest: [0, 1.24, 0], neck: [0, 1.45, 0], head: [0, 1.52, 0], upperArmL: [0.19 * bw, 1.41, 0], foreArmL: [0.215 * bw, 1.13, 0], handL: [0.225 * bw, 0.885, 0.0],
    upperArmR: [-0.19 * bw, 1.41, 0], foreArmR: [-0.215 * bw, 1.13, 0], handR: [-0.225 * bw, 0.885, 0], thighL: [0.095, 0.93, 0], shinL: [0.1, 0.51, 0], footL: [0.1, 0.085, 0], thighR: [-0.095, 0.93, 0], shinR: [-0.1, 0.51, 0], footR: [-0.1, 0.085, 0] };
  const parent = { hips: -1, spine: 'hips', chest: 'spine', neck: 'chest', head: 'neck', upperArmL: 'chest', foreArmL: 'upperArmL', handL: 'foreArmL', upperArmR: 'chest', foreArmR: 'upperArmR', handR: 'foreArmR', thighL: 'hips', shinL: 'thighL', footL: 'shinL', thighR: 'hips', shinR: 'thighR', footR: 'shinR' };
  return BONE_NAMES.map((n) => ({ name: n, pos: p[n], parent: parent[n] === -1 ? -1 : BI[parent[n]] }));
}
// ---------- shape helpers: every piece is tagged with a bone, a palette part and (head only) face UVs ----------
class Builder {
  constructor(q) { this.q = q; this.pos = []; this.nrm = []; this.bone = []; this.part = []; this.fuv = []; this.idx = []; this.n = 0; }
  put(geo, bone, part, fuvFn = null) {
    const g = geo.index ? geo : geo, P = g.attributes.position, N = g.attributes.normal, base = this.n;
    for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i); this.pos.push(x, y, z); this.nrm.push(N.getX(i), N.getY(i), N.getZ(i)); this.bone.push(BI[bone]); this.part.push(part); const f = fuvFn ? fuvFn(x, y, z) : null; this.fuv.push(f ? f[0] : -1, f ? f[1] : -1); }
    if (g.index) for (const k of g.index.array) this.idx.push(base + k); else for (let k = 0; k < P.count; k++) this.idx.push(base + k);
    this.n += P.count;
  }
  geometry() {
    const g = new THREE.BufferGeometry(), n = this.n; g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4); for (let i = 0; i < n; i++) { si[i * 4] = this.bone[i]; sw[i * 4] = 1; } g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
    g.setAttribute('part', new THREE.Float32BufferAttribute(this.part, 1)); g.setAttribute('fuv', new THREE.Float32BufferAttribute(this.fuv, 2)); g.setIndex(this.idx); g.computeBoundingSphere(); g.boundingSphere.radius = 1.3; g.boundingSphere.center.set(0, 0.9, 0); return g;
  }
}
const seg = (q, n) => Math.max(3, Math.round(n * q));
// tapered capsule between a (bottom) and b (top): lathe profile rotated to the a->b direction
function capsule(a, b, ra, rb, q, flatZ = 1) {
  const L = a.distanceTo(b), h = Math.max(0.001, L), cs = seg(q, 4), pts = [];
  for (let i = 0; i <= cs; i++) { const t = -PI2 + (i / cs) * PI2; pts.push(new THREE.Vector2(Math.max(0.0005, ra * Math.cos(t)), ra * Math.sin(t))); }
  for (let i = 0; i <= cs; i++) { const t = (i / cs) * PI2; pts.push(new THREE.Vector2(Math.max(0.0005, rb * Math.cos(t)), h + rb * Math.sin(t))); }
  const g = new THREE.LatheGeometry(pts, seg(q, 12)); if (flatZ !== 1) g.scale(1, 1, flatZ);
  const dir = new THREE.Vector3().subVectors(b, a).normalize(), qt = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), dir); g.applyQuaternion(qt); g.translate(a.x, a.y, a.z); g.computeVertexNormals(); return g;
}
const PI2 = Math.PI / 2;
function ellipsoid(c, rx, ry, rz, q, ws = 14, hs = 10) { const g = new THREE.SphereGeometry(1, seg(q, ws), seg(q, hs)); g.scale(rx, ry, rz); g.translate(c.x, c.y, c.z); return g; }
function lathe(prof, q, segs = 14, sx = 1, sz = 1, ty = 0, thetaStart = 0, thetaLen = Math.PI * 2) { const g = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(Math.max(0.0005, r), y)), seg(q, segs), thetaStart, thetaLen); g.scale(sx, 1, sz); g.translate(0, ty, 0); g.computeVertexNormals(); return g; }
function rbox(c, w, h, d, q) { const g = new THREE.BoxGeometry(w, h, d, 1, 1, 1); const s = new THREE.SphereGeometry(1, seg(q, 10), seg(q, 8)); s.scale(w / 2, h / 2, d / 2); s.translate(c.x, c.y, c.z); return s; }
// ---------- body ----------
// recipe: { bw (build), hips (pelvis width), outfit: 'shirt'|'tee'|'jacket'|'dress'|'hoodie'|'uniform', bottom: 'pants'|'shorts'|'skirt', hair, hat, beard, glasses, apron, tie }
export function buildBody(r, q) {
  const B = new Builder(q), bones = restBones(r.bw), P = Object.fromEntries(bones.map((b) => [b.name, V(...b.pos)])), bw = r.bw, hw = r.hips ?? 1;
  const sleeve = r.outfit === 'tee' || r.outfit === 'dress' ? (r.outfit === 'dress' ? 'none' : 'short') : 'long';
  const legs = r.bottom === 'skirt' || r.outfit === 'dress' ? 'skirt' : r.bottom === 'shorts' ? 'shorts' : 'pants';
  const topPart = r.outfit === 'dress' ? PART.bottom : PART.top;
  // pelvis + torso
  B.put(ellipsoid(V(0, 0.95, 0), 0.155 * hw, 0.11, 0.11, q), 'hips', legs === 'skirt' ? topPart : PART.bottom);
  B.put(lathe([[0.001, 0.975], [0.13 * hw, 0.98], [0.128 * bw, 1.1], [0.132 * bw, 1.2], [0.001, 1.22]], q, 14, 1, 0.74), 'spine', topPart);
  B.put(lathe([[0.001, 1.17], [0.14 * bw, 1.18], [0.165 * bw, 1.33], [0.15 * bw, 1.42], [0.075, 1.48], [0.001, 1.485]], q, 14, 1, 0.7), 'chest', topPart);
  for (const s of [-1, 1]) B.put(ellipsoid(V(s * 0.175 * bw, 1.395, 0), 0.068, 0.07, 0.068, q, 10, 8), 'chest', sleeve === 'none' ? PART.skin : topPart);
  if (r.outfit === 'jacket' || r.outfit === 'uniform') { B.put(lathe([[0.001, 1.27], [0.035, 1.33], [0.012, 1.44], [0.001, 1.44]], q, 6, 1, 0.25, 0, -0.5, 1.0).translate(0, 0, 0.098), 'chest', PART.inner);
    if (r.tie) { const t = new THREE.BoxGeometry(0.03, 0.15, 0.01); t.translate(0, 1.33, 0.118); B.put(t, 'chest', PART.accent); } }
  if (r.outfit === 'hoodie') B.put(lathe([[0.09, 1.41], [0.14, 1.45], [0.12, 1.52], [0.06, 1.5]], q, 12, 1, 0.9, 0, Math.PI * 0.7, Math.PI * 1.6), 'chest', topPart);
  if (r.apron) { const a = new THREE.BoxGeometry(0.3 * bw, 0.5, 0.012); a.translate(0, 0.98, 0.115); B.put(a, 'spine', PART.accent); }
  if (r.belt && legs !== 'skirt') B.put(lathe([[0.135 * hw, 0.995], [0.137 * hw, 1.03]], q, 14, 1, 0.78), 'hips', PART.dark);
  // neck + head + face
  B.put(capsule(V(0, 1.44, 0), V(0, 1.56, 0), 0.046, 0.044, q), 'neck', PART.skin);
  const hc = V(0, 1.645, 0.005), rx = 0.108, ry = 0.128, rz = 0.115, fw = rx * 1.62, fy0 = hc.y - ry * 0.74, fh = ry * 1.52;
  B.put(ellipsoid(hc, rx, ry, rz, q, 20, 14), 'head', PART.skin, (x, y, z) => (z - hc.z > rz * 0.12 ? [x / fw + 0.5, (y - fy0) / fh] : null));
  B.put(ellipsoid(V(0, hc.y - 0.018, hc.z + rz * 0.96), 0.017, 0.026, 0.02, q, 8, 6), 'head', PART.skin);
  for (const s of [-1, 1]) B.put(ellipsoid(V(s * rx * 0.97, hc.y - 0.005, -0.005), 0.018, 0.032, 0.024, q, 8, 6), 'head', PART.skin);
  hair(B, r, hc, rx, ry, rz, q);
  if (r.glasses) for (const s of [-1, 1]) { const t = new THREE.TorusGeometry(0.03, 0.005, 5, seg(q, 14)); t.translate(s * 0.045, hc.y + 0.02, hc.z + rz * 0.93); B.put(t, 'head', PART.dark); }
  if (r.beard) B.put(ellipsoid(V(0, hc.y - 0.075, hc.z + 0.045), rx * 0.82, 0.06, 0.08, q, 12, 8), 'head', PART.hair);
  // arms (shoulder -> elbow -> wrist), mitten hands with a thumb
  for (const s of ['L', 'R']) { const sx = s === 'L' ? 1 : -1, sh = P['upperArm' + s], el = P['foreArm' + s], wr = P['hand' + s];
    B.put(capsule(el, sh, 0.043, 0.052, q), 'upperArm' + s, sleeve === 'none' ? PART.skin : PART.top === topPart ? topPart : topPart);
    B.put(capsule(wr, el, 0.035, 0.042, q), 'foreArm' + s, sleeve === 'long' ? topPart : PART.skin);
    if (sleeve === 'short') B.put(capsule(V(el.x, el.y + 0.12, 0), sh, 0.05, 0.056, q), 'upperArm' + s, topPart);
    B.put(ellipsoid(V(wr.x + sx * 0.005, wr.y - 0.07, 0.012), 0.032, 0.066, 0.046, q, 10, 8), 'hand' + s, PART.skin);
    B.put(ellipsoid(V(wr.x - sx * 0.012, wr.y - 0.04, 0.045), 0.014, 0.03, 0.016, q, 6, 5), 'hand' + s, PART.skin); }
  // legs + shoes (+ skirt flares on the thighs so sitting and walking both work)
  for (const s of ['L', 'R']) { const sx = s === 'L' ? 1 : -1, th = P['thigh' + s], kn = P['shin' + s], an = P['foot' + s];
    B.put(capsule(kn, th, 0.055, 0.078 * hw, q), 'thigh' + s, legs === 'pants' || legs === 'shorts' ? PART.bottom : PART.skin);
    B.put(capsule(an, kn, 0.041, 0.054, q), 'shin' + s, legs === 'pants' ? PART.bottom : PART.skin);
    if (legs === 'skirt') B.put(lathe([[0.1 * hw, 0.97], [0.12 * hw, 0.86], [0.15 * hw, 0.6], [0.145 * hw, 0.585]], q, 12, 1, 1, 0).translate(th.x * 0.55, 0, 0), 'thigh' + s, topPart === PART.bottom ? PART.bottom : PART.bottom);
    B.put(rbox(V(an.x, 0.045, 0.05), 0.095, 0.085, 0.25, q), 'foot' + s, PART.shoes); }
  return B.geometry();
}
function hair(B, r, hc, rx, ry, rz, q) {
  const H = PART.hair, cap = (scale = 1.07, theta = 1.35, back = -0.012) => { const g = new THREE.SphereGeometry(1, seg(q, 18), seg(q, 10), 0, Math.PI * 2, 0, theta); g.scale(rx * scale, ry * scale, rz * scale); g.rotateX(-0.28); g.translate(hc.x, hc.y + 0.008, hc.z + back); return g; };
  switch (r.hair) {
    case 'bald': break;
    case 'short': B.put(cap(1.07, 1.3), 'head', H); break;
    case 'buzz': B.put(cap(1.03, 1.25), 'head', H); break;
    case 'quiff': B.put(cap(1.07, 1.3), 'head', H); B.put(ellipsoid(V(0, hc.y + ry * 0.95, hc.z + rz * 0.45), rx * 0.8, 0.05, 0.08, q, 10, 6), 'head', H); break;
    case 'bob': B.put(cap(1.09, 1.45), 'head', H); B.put(lathe([[rx * 1.12, hc.y + 0.02], [rx * 1.2, hc.y - 0.07], [rx * 1.15, hc.y - 0.1]], q, 16, 1, 1.05, 0, Math.PI * 0.62, Math.PI * 1.76), 'head', H); break;
    case 'long': B.put(cap(1.09, 1.45), 'head', H); B.put(lathe([[rx * 1.12, hc.y + 0.03], [rx * 1.22, hc.y - 0.1], [rx * 1.1, hc.y - 0.26], [rx * 0.9, hc.y - 0.3]], q, 16, 1, 1.0, 0, Math.PI * 0.66, Math.PI * 1.68).translate(0, 0, -0.012), 'head', H); break;
    case 'bun': B.put(cap(1.07, 1.35), 'head', H); B.put(ellipsoid(V(0, hc.y + ry * 0.85, hc.z - rz * 0.55), 0.06, 0.055, 0.06, q, 10, 8), 'head', H); break;
    case 'ponytail': B.put(cap(1.07, 1.35), 'head', H); B.put(capsule(V(0, hc.y - 0.17, hc.z - rz * 1.15), V(0, hc.y + 0.03, hc.z - rz * 1.0), 0.03, 0.04, q), 'head', H); break;
    case 'afro': B.put(ellipsoid(V(0, hc.y + 0.06, hc.z - 0.055), rx * 1.4, ry * 1.2, rz * 1.22, q, 16, 12), 'head', H); break;
    case 'curly': { B.put(cap(1.08, 1.35), 'head', H); for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; B.put(ellipsoid(V(Math.cos(a) * rx * 0.9, hc.y + 0.06 + (i % 2) * 0.02, hc.z - 0.02 + Math.sin(a) * rz * 0.85), 0.045, 0.045, 0.045, q, 8, 6), 'head', H); } break; }
    default: B.put(cap(), 'head', H);
  }
  if (r.hat === 'cap') { const d = new THREE.SphereGeometry(1, seg(q, 16), seg(q, 8), 0, Math.PI * 2, 0, Math.PI / 2); d.scale(rx * 1.12, ry * 0.85, rz * 1.12); d.translate(hc.x, hc.y + 0.035, hc.z); B.put(d, 'head', PART.accent); const b = new THREE.CylinderGeometry(0.075, 0.075, 0.01, seg(q, 14), 1, false, -Math.PI / 2, Math.PI); b.scale(1.2, 1, 1.25); b.translate(0, hc.y + 0.04, hc.z + 0.1); B.put(b, 'head', PART.accent); }
  if (r.hat === 'fedora') { B.put(new THREE.CylinderGeometry(0.17, 0.17, 0.012, seg(q, 18)).translate(0, hc.y + 0.075, hc.z), 'head', PART.accent); B.put(lathe([[0.1, hc.y + 0.075], [0.105, hc.y + 0.16], [0.08, hc.y + 0.19], [0.001, hc.y + 0.18]], q, 14), 'head', PART.accent); }
}
// ---------- palettes and recipes ----------
export const SKIN = ['#f3cfb3', '#e8b892', '#d29b74', '#b47a55', '#8d5a3b', '#62402a', '#4a2f1f'];
export const HAIR = ['#1b1612', '#2e1f16', '#4a2f1d', '#6e4524', '#8f3d22', '#c79a55', '#e0c58d', '#a9a39b', '#e6e2da'];
const TOPS = ['#ece6db', '#283042', '#b23a48', '#3a6b5b', '#e3a33b', '#6a4c93', '#2f6f9f', '#c96f53', '#f2b5c4', '#30343b', '#8fb8a6', '#f4f1ea', '#d95d39'];
const BOTS = ['#262a33', '#3b4a66', '#5b4a3a', '#1c1c20', '#c9bfae', '#4b5563', '#2e3a4f'];
const SHOES = ['#1a1a1c', '#3a2a20', '#efefea', '#5a3a28', '#20222a'];
export function rng(seed) { let s = (Math.floor(seed * 2654435761) % 2147483647 + 2147483647) % 2147483647 || 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
const pick = (R, a) => a[Math.floor(R() * a.length)];
export function randomRecipe(seed) {
  const R = rng(seed), fem = R() < 0.5, age = R(), outfit = fem ? pick(R, ['dress', 'tee', 'shirt', 'jacket', 'hoodie', 'dress']) : pick(R, ['tee', 'shirt', 'jacket', 'hoodie', 'shirt']);
  const hairS = age > 0.85 ? (fem ? pick(R, ['bob', 'bun', 'short']) : pick(R, ['bald', 'short', 'buzz'])) : fem ? pick(R, ['long', 'bob', 'bun', 'ponytail', 'curly', 'afro']) : pick(R, ['short', 'quiff', 'buzz', 'curly', 'afro', 'short']);
  const skin = pick(R, SKIN), hairC = age > 0.85 ? pick(R, ['#a9a39b', '#e6e2da', '#cfc9bf']) : pick(R, HAIR.slice(0, 7));
  return { bw: fem ? 0.9 + R() * 0.08 : 1.0 + R() * 0.1, hips: fem ? 1.08 + R() * 0.06 : 0.96 + R() * 0.05, scale: fem ? 0.92 + R() * 0.07 : 0.98 + R() * 0.08, outfit, bottom: outfit === 'dress' ? 'skirt' : fem && R() < 0.3 ? 'skirt' : R() < 0.12 ? 'shorts' : 'pants',
    hair: hairS, hat: !fem && age > 0.8 && R() < 0.4 ? 'fedora' : null, beard: !fem && R() < 0.22, glasses: R() < 0.22, belt: R() < 0.5, tie: outfit === 'jacket' && !fem && R() < 0.5,
    pal: { skin, hair: hairC, top: pick(R, TOPS), bottom: pick(R, BOTS), shoes: pick(R, SHOES), accent: pick(R, ['#2a2b30', '#b23a48', '#d9b45a', '#3a6b5b']), inner: pick(R, ['#f4f1ea', '#e8e1d2', '#c9d6e3']), dark: '#18181b' } };
}
export const STAFF_LOOK = { // LUMIERE uniform: charcoal + coral accent
  receptionist: { bw: 0.92, hips: 1.08, scale: 0.95, outfit: 'jacket', bottom: 'skirt', hair: 'bun', tie: false, pal: { skin: '#d29b74', hair: '#2e1f16', top: '#2a2b31', bottom: '#2a2b31', shoes: '#1a1a1c', accent: '#ff4d5a', inner: '#f4f1ea', dark: '#18181b' } },
  usher: { bw: 1.04, hips: 0.98, scale: 1.02, outfit: 'uniform', bottom: 'pants', hair: 'quiff', tie: true, belt: true, pal: { skin: '#8d5a3b', hair: '#1b1612', top: '#2a2b31', bottom: '#22232a', shoes: '#111', accent: '#ff4d5a', inner: '#f4f1ea', dark: '#18181b' } },
  vendor: { bw: 0.95, hips: 1.04, scale: 0.96, outfit: 'tee', bottom: 'pants', hair: 'ponytail', hat: 'cap', apron: true, pal: { skin: '#e8b892', hair: '#6e4524', top: '#ff4d5a', bottom: '#22232a', shoes: '#1a1a1c', accent: '#2a2b31', inner: '#f4f1ea', dark: '#18181b' } },
  vendor2: { bw: 1.02, hips: 0.98, scale: 1.0, outfit: 'tee', bottom: 'pants', hair: 'short', hat: 'cap', apron: true, pal: { skin: '#b47a55', hair: '#1b1612', top: '#ff4d5a', bottom: '#22232a', shoes: '#1a1a1c', accent: '#2a2b31', inner: '#f4f1ea', dark: '#18181b' } },
  bartender: { bw: 0.94, hips: 1.05, scale: 0.97, outfit: 'shirt', bottom: 'pants', hair: 'long', apron: true, belt: true, pal: { skin: '#f3cfb3', hair: '#8f3d22', top: '#1d1e22', bottom: '#1d1e22', shoes: '#1a1a1c', accent: '#5b3a28', inner: '#f4f1ea', dark: '#18181b' } },
};
// ---------- factory: geometry cache by shape ----------
const SHAPE_KEYS = ['bw', 'hips', 'outfit', 'bottom', 'hair', 'hat', 'beard', 'glasses', 'apron', 'belt', 'tie'];
const LOD_Q = [1, 0.55, 0.32];
export class People {
  constructor(mats) { this.mats = mats; this.cache = new Map(); this.face = faceAtlas(); }
  geoms(r) { const k = SHAPE_KEYS.map((n) => { const v = r[n]; return typeof v === 'number' ? v.toFixed(2) : String(v); }).join('|'); let g = this.cache.get(k); if (!g) { g = LOD_Q.map((q) => buildBody(r, q)); this.cache.set(k, g); } return g; }
  make(r) { return new Character(this, r); }
}
const _palOrder = ['skin', 'hair', 'top', 'bottom', 'shoes', 'accent', 'inner', 'dark'];
export class Character {
  constructor(factory, r) {
    this.r = r; this.geo = factory.geoms(r); this.group = new THREE.Group(); const sc = this.scale = r.scale || 1;
    const bones = restBones(r.bw); this.bones = bones.map((b) => { const o = new THREE.Bone(); o.name = b.name; return o; }); this.by = {};
    bones.forEach((b, i) => { const pp = b.parent >= 0 ? bones[b.parent].pos : [0, 0, 0]; this.bones[i].position.set(b.pos[0] - pp[0], b.pos[1] - pp[1], b.pos[2] - pp[2]); if (b.parent >= 0) this.bones[b.parent].add(this.bones[i]); this.by[b.name] = this.bones[i]; });
    this.hipsBase = this.by.hips.position.clone();
    this.mat = factory.mats.peopleMat(factory.face); if (this.mat.uniforms) _palOrder.forEach((n, i) => this.mat.uniforms.uPal.value[i].set(r.pal[n] || '#808080'));
    this.mesh = new THREE.SkinnedMesh(this.geo[0], this.mat); this.mesh.add(this.bones[0]); this.mesh.scale.setScalar(sc); this.group.add(this.mesh); this.mesh.updateMatrixWorld(true);
    this.skeleton = new THREE.Skeleton(this.bones); this.mesh.bind(this.skeleton); this.mesh.frustumCulled = true; this.mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.9, 0), 1.3);
    this.pose = makePose(); this.cur = {}; for (const n of BONE_NAMES) this.cur[n] = [0, 0, 0]; this.hy = 0; this.hz = 0; this.lod = 0;
    this.s = { t: Math.random() * 100, ph: 0, seed: Math.random() * 6.28, speed: 0, walk: 0, sit: 0, drop: 0.42, recline: 0.1, gesture: null, gw: 0, lookYaw: 0, lookPitch: 0, lookAmt: 0 };
    this.walkT = 0; this.gestT = null; this.snap = true; this.expr = 'neutral'; this.blinkT = 2 + Math.random() * 3; this.talking = false; this.talkT = 0; this.items = {};
  }
  setLOD(i) { if (i !== this.lod && this.geo[i]) { this.lod = i; this.mesh.geometry = this.geo[i]; } }
  setExpr(e) { this.expr = EXPR[e] ? e : 'neutral'; }
  // seated drop for a seat of height h (cushion top above the floor)
  seatDrop(h) { return Math.max(0.2, 0.95 * this.scale - (h + 0.05)); }
  attach(name, mesh, bone = 'handR', pos = [0, -0.1, 0.03]) { this.detach(name); mesh.position.set(...pos); this.by[bone].add(mesh); this.items[name] = mesh; }
  detach(name) { const m = this.items[name]; if (m) { m.parent && m.parent.remove(m); delete this.items[name]; } }
  // update the pose from the state (walk/sit/gesture targets set by the brain), smooth toward it, then face + light
  update(dt, light) {
    const s = this.s; s.t += dt; s.walk += ((this.walkT > 0.05 ? 1 : 0) - s.walk) * Math.min(1, dt * 6); s.speed = this.walkT; s.ph += this.walkT * dt * (Math.PI * 2 / 1.25);
    const gw = this.gestT ? 1 : 0; if (this.gestT && this.gestT !== s.gesture) { if (s.gw < 0.05) s.gesture = this.gestT; else s.gw = Math.max(0, s.gw - dt * 6); } else s.gw += (gw - s.gw) * Math.min(1, dt * 7);
    if (!this.gestT && s.gw < 0.02) s.gesture = null;
    compose(this.pose, s);
    const a = this.snap ? 1 : 1 - Math.exp(-dt * 12); this.snap = false;
    for (let i = 0; i < BONE_NAMES.length; i++) { const n = BONE_NAMES[i], g = this.pose.b[n], c = this.cur[n]; c[0] += (g[0] - c[0]) * a; c[1] += (g[1] - c[1]) * a; c[2] += (g[2] - c[2]) * a; this.by[n].rotation.set(c[0], c[1], c[2]); }
    this.hy += (this.pose.hipsY - this.hy) * a; this.hz += (this.pose.hipsZ - this.hz) * a; this.by.hips.position.set(this.hipsBase.x, this.hipsBase.y + this.hy / this.scale, this.hipsBase.z + this.hz / this.scale);
    // face: expression, blinking, lip flap while talking
    const ex = EXPR[this.expr] || EXPR.neutral; let eyes = EYES[ex[0]], mouth = MOUTH[ex[1]];
    this.blinkT -= dt; if (this.blinkT < 0.12 && ex[0] !== 'happy' && ex[0] !== 'squint') eyes = EYES.blink; if (this.blinkT < 0) this.blinkT = 2.2 + Math.random() * 4;
    if (this.talking) { this.talkT += dt * 9; const k = Math.floor(this.talkT) % 3; mouth = k === 0 ? MOUTH.talk : k === 1 ? MOUTH[ex[1]] : MOUTH.ooh; }
    const u = this.mat.uniforms; if (!u) return; u.uEyes.value.set(eyes[0], eyes[1]); u.uMouth.value.set(mouth[0], mouth[1]);
    if (light) { u.uAmb.value.copy(light.amb); u.uKey.value.copy(light.key); u.uKeyDir.value.copy(light.dir); u.uScreenL.value.copy(light.screen); }
  }
}
// ---------- hand props: popcorn bucket, drink cup (vertex colours, lit like their holder) ----------
export function propGeo(kind) {
  const a = new Acc();
  if (kind === 'popcorn') { const g = new THREE.CylinderGeometry(0.07, 0.05, 0.15, 14, 1, true); const c = new Float32Array(g.attributes.position.count * 3); for (let i = 0; i < g.attributes.position.count; i++) { const ang = Math.atan2(g.attributes.position.getZ(i), g.attributes.position.getX(i)), red = Math.floor((ang + Math.PI) / (Math.PI * 2) * 10) % 2; c.set(red ? [1, 0.12, 0.16] : [1, 1, 1], i * 3); } g.setAttribute('color', new THREE.BufferAttribute(c, 3)); a.add(g, null, [1, 1, 1]);
    const bot = new THREE.CircleGeometry(0.05, 12); bot.rotateX(Math.PI / 2); bot.translate(0, -0.075, 0); a.add(bot, null, '#ffffff'); for (let i = 0; i < 12; i++) { const s = new THREE.SphereGeometry(0.022, 6, 4); const ang = i * 2.4, rr = (i % 4) * 0.018; s.translate(Math.cos(ang) * rr, 0.08 + (i % 3) * 0.012, Math.sin(ang) * rr); a.add(s, null, i % 3 ? '#ffe7a3' : '#f2cf72'); } }
  if (kind === 'drink') { const g = new THREE.CylinderGeometry(0.042, 0.033, 0.15, 12); a.add(g, null, '#ff4d5a'); const l = new THREE.CylinderGeometry(0.044, 0.044, 0.012, 12); l.translate(0, 0.08, 0); a.add(l, null, '#f4f1ea'); const s = new THREE.CylinderGeometry(0.004, 0.004, 0.09, 5); s.translate(0.01, 0.12, 0); a.add(s, null, '#ffffff'); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(a.p, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(a.n, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(a.c, 3)); geo.setIndex(a.i); return geo;
}
// ---------- far audience: a seated low-poly person baked from the same generator (CPU-skinned once), for the instanced crowd ----------
const CROWD_PART = { 0: 3, 1: 2, 2: 0, 3: 1, 4: 4, 5: 0, 6: 0, 7: 4 };   // people part -> crowd colour slot (0 top, 1 bottom, 2 hair, 3 skin, 4 dark)
export function crowdGeometry(r, seatH = 0.45, recline = 0.1) {
  const ch = new Character({ geoms: () => [buildBody(r, 0.34)], mats: { peopleMat: () => new THREE.MeshBasicMaterial() }, face: null }, { ...r, scale: 1 });
  ch.s.sit = 1; ch.s.drop = ch.seatDrop(seatH); ch.s.recline = recline; ch.snap = true; ch.update(0); ch.mesh.updateMatrixWorld(true);
  const g = ch.geo[0], P = g.attributes.position, N = g.attributes.normal, SI = g.attributes.skinIndex, PT = g.attributes.part, n = P.count;
  const pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3), part = new Float32Array(n), piv = new Float32Array(n * 3), v = new THREE.Vector3(), nm = new THREE.Vector3(), m3 = new THREE.Matrix3();
  const shoulder = { upperArmL: ch.by.upperArmL, upperArmR: ch.by.upperArmR }, sp = {}; for (const k in shoulder) sp[k] = new THREE.Vector3().setFromMatrixPosition(shoulder[k].matrixWorld);
  ch.skeleton.update(); const bm = ch.skeleton.boneMatrices;
  for (let i = 0; i < n; i++) { const bi = SI.getX(i), M = new THREE.Matrix4().fromArray(bm, bi * 16); v.fromBufferAttribute(P, i).applyMatrix4(M); nm.fromBufferAttribute(N, i).applyMatrix3(m3.getNormalMatrix(M)).normalize();
    pos.set([v.x, v.y, v.z], i * 3); nrm.set([nm.x, nm.y, nm.z], i * 3); const name = BONE_NAMES[bi], pp = PT.getX(i); let cp = CROWD_PART[pp] ?? 0;
    if (/Arm|hand/.test(name)) { const side = name.endsWith('L') ? 'upperArmL' : 'upperArmR'; cp = pp === 0 ? 6 : 5; piv.set([sp[side].x, sp[side].y, sp[side].z], i * 3); } part[i] = cp; }
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nrm, 3)); out.setAttribute('part', new THREE.BufferAttribute(part, 1)); out.setAttribute('pivot', new THREE.BufferAttribute(piv, 3)); out.setIndex(g.index.clone()); out.computeBoundingSphere(); return out;
}
