// LUMIERE v8 - the people (phone feedback on v7: "the NPCs look the worst... Minecraft's Steve looks better", "worst animations",
// "better eating and drinking, mouth and eye movements; if they look here their body should move").
// Bodies, faces and hair: Quaternius' CC0 Universal Base Characters; clothes made from the body surface by tools/blender/people.py;
// motion: Quaternius' CC0 Universal Animation Library (anims.glb), played on both bodies by bone name; gestures the library lacks (clap,
// cheer, scream, gasp, laugh, aww, lean in, eat, drink, wave, point, read a ticket, shush) are posed here with two-bone IK on top of the clips.
// Two ways to draw a person:
//   Person (skinned): staff, lobby guests, people walking in, the nearest audience. An AnimationMixer plays the clips with cross-fades;
//                     after it, procedural layers turn the head and eyes to you, open the jaw while talking, and move the arms for gestures.
//   CrowdRenderer (GPU instanced): the seated audience. Every frame of the seated clips and reactions is baked once into a bone texture;
//                     the vertex shader skins each instance from it, so a full IMAX costs a few draw calls.
// Both colour a person from one palette (skin tone, clothes, hair, eyes) on the part ids people.py writes into the mesh.
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/addons/GLTFLoader.js';
import { MeshoptDecoder } from '../vendor/addons/meshopt_decoder.module.js';
import { clone as skClone } from '../vendor/addons/SkeletonUtils.js';
import { G, COMMON_FRAG } from './materials.js';
const TAU = Math.PI * 2, clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const OUTFITS = { m: ['tee', 'shirt', 'sweat', 'jacket', 'staff'], f: ['tee', 'shirt', 'jacket', 'capri', 'staff'] };
export const DATA = { ready: false, kinds: {}, clips: {}, tex: null };
// v9.3 (the user: "glitched, creepy NPCs, wrong textures, clothes, hair"): photographed people from the Microsoft Rocketbox library (MIT,
// tools/blender/rocketbox.py). One atlas per person (one draw call), clips per gender (the Biped skeletons are identical within a gender),
// the same bone names as the v8 rig, so the IK, look, jaw, eye and hand-prop code works unchanged. Without www/models/rb the v8 people stay.
export const RB = { ready: false, avatars: {}, names: { m: [], f: [] }, guests: { m: [], f: [] }, clips: { m: {}, f: {} }, meta: null, refPelvis: { m: 1, f: 1 } };
const RB_ALIAS = { Walk_Formal_Loop: 'Walk_Loop', Walk_Carry_Loop: 'Walk_Loop', Jog_Fwd_Loop: 'Walk_Loop', Sitting_Talking_Loop: 'Sitting_Idle_Loop', Idle_Talking_Loop: 'Idle_Loop', Idle_TalkingPhone_Loop: 'Idle_Loop', Idle_FoldArms_Loop: 'Idle_Loop' };
// this person's skin tone (gamma luma, Cb, Cr, the way FRAG_RB measures it), sampled on the cheeks and nose of the face texture: the
// outfit dye leaves texels of that tone alone (hands, arms, neck), so beige or khaki clothes still take the colour
function skinOf(img) {
  try { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, 64, 64);
    const px = g.getImageData(0, 0, 64, 64).data, lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }, Ys = [], Bs = [], Rs = [];
    for (const [u, v] of [[0.70, 0.67], [0.80, 0.67], [0.75, 0.64], [0.72, 0.62], [0.78, 0.62]]) { const i = (Math.floor(v * 64) * 64 + Math.floor(u * 64)) * 4;
      const r = Math.sqrt(lin(px[i])), gg = Math.sqrt(lin(px[i + 1])), b = Math.sqrt(lin(px[i + 2])), Y = 0.299 * r + 0.587 * gg + 0.114 * b; Ys.push(Y); Bs.push((b - Y) * 0.564); Rs.push((r - Y) * 0.713); }
    const med = (a) => a.sort((x, y) => x - y)[a.length >> 1]; const Y = med(Ys), cb = med(Bs), cr = med(Rs);
    return cr > 0.0 && cb < 0.02 && Y > 0.15 ? [Y, cb, cr] : null; } catch (e) { return null; }
}
async function loadRB(base, ld) {
  const meta = await fetch(base + 'rb/rb.json').then((r) => (r.ok ? r.json() : null)).catch(() => null); if (!meta) return;
  const names = Object.keys(meta.avatars), tl = new THREE.TextureLoader();
  const [am, af, ...gl] = await Promise.all([ld.loadAsync(base + 'rb/rb_anims_m.glb'), ld.loadAsync(base + 'rb/rb_anims_f.glb'), ...names.map((n) => ld.loadAsync(base + 'rb/rb_' + n + '.glb'))]);
  for (const [g, a] of [['m', am], ['f', af]]) { for (const c of a.animations) RB.clips[g][c.name] = c; RB.refPelvis[g] = boneY(a.scene, 'pelvis'); }
  names.forEach((n, i) => { const sc = gl[i].scene, A = meta.avatars[n]; dequantize(sc);
    const tex = tl.load(base + 'rb/' + n + '.webp', (t) => { const av = RB.avatars[n]; if (av) av.skinYCC = skinOf(t.image); }); tex.colorSpace = THREE.SRGBColorSpace; tex.flipY = false; tex.anisotropy = 2;
    const lods = {}; sc.traverse((o) => { if (o.isSkinnedMesh) { o.frustumCulled = false; const m = o.name.match(/L(\d)$/); if (m) lods['L' + m[1]] = o; } });
    RB.avatars[n] = { name: n, kind: A.kind, scene: sc, tex, lods, pelvisY: boneY(sc, 'pelvis'), clips: null }; RB.names[A.kind].push(n); if (!/^Business_/.test(n)) RB.guests[A.kind].push(n); });
  RB.meta = meta; RB.ready = names.length > 0;
}
// the person a recipe becomes: a staff look can name one (STAFF[look].rb); others are picked by seed within their gender
export function rbAvatar(r) {
  if (!RB.ready || !r) return null; if (r.rb && RB.avatars[r.rb]) return RB.avatars[r.rb];
  const L = RB.guests[r.kind] && RB.guests[r.kind].length ? RB.guests[r.kind] : RB.guests.m.concat(RB.guests.f); if (!L.length) return null;   // suits are for staff
  r.rb = L[Math.floor((((r.seed || 1) * 0.6180339887) % 1) * L.length) % L.length]; return RB.avatars[r.rb];
}
function rbClips(av) {
  if (av.clips) return av.clips; const src = RB.clips[av.kind], k = av.pelvisY / (RB.refPelvis[av.kind] || av.pelvisY), out = {};
  for (const n in src) out[n] = adaptClip(src[n], k);
  for (const n in RB_ALIAS) if (!out[n] && out[RB_ALIAS[n]]) out[n] = out[RB_ALIAS[n]];
  return (av.clips = out);
}
// the seat height a person's sitting clips were made for (the engine lowers or raises them onto the real cushion by the difference)
export function sitHeight(r) { const av = rbAvatar(r), c = av && RB.meta.clips[av.kind]; return c && c.seatY ? c.seatY : SIT_H; }
// ------------------------------------------------------------------ palettes (sRGB hex): varied, believable city clothes
const SKIN = ['#f2d0b6', '#e8b996', '#d9a47f', '#c68b62', '#a8704a', '#8a5538', '#6b3f2a', '#4e2d1f'];
const HAIR = ['#1c1410', '#2b1d14', '#3d2817', '#5a3a1f', '#7a5230', '#a07444', '#c9a46a', '#6e6a66', '#d8d2c8', '#1a1a1c'];
const TOPS = ['#f1f0ec', '#1f2a44', '#8a1d2b', '#2f4f3a', '#3b6ea8', '#202022', '#7d6aa8', '#6d7b8a', '#b7c9d6', '#1e5f66', '#5a5f3a', '#9aa3ad', '#2b2f6b', '#c8324a'];   // no skin-like beiges: under warm cinema light they read as bare skin
const BOTS = ['#26324d', '#1b2233', '#3a4660', '#22201f', '#6b5a43', '#4c5560', '#8c8f94', '#2d3a2e', '#5a2f2b'];
const SHOES = ['#f0efea', '#1a1a1b', '#5b3a24', '#2a2c33', '#c8c2b6'];
const OUTER = ['#3a2a20', '#1d2230', '#5a5f45', '#7a1f28', '#202022', '#8a6a48', '#3e4a5c'];
const IRIS = ['#5a3a1f', '#3b2614', '#6b7d4a', '#4a6a8c', '#2e2016', '#7a5a2a'];
export function rng(seed) { let s = Math.floor(seed) % 2147483647; if (s <= 0) s += 2147483646; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
const pick = (R, a) => a[Math.floor(R() * a.length) % a.length];
// a person: body kind, outfit, colours, hair style (0..2, -1 bald), beard, pattern, height
export function randomRecipe(seed, o = {}) {
  const R = rng(seed * 7919 + 13), kind = o.kind || (R() < 0.5 ? 'm' : 'f'), outfit = o.outfit || pick(R, OUTFITS[kind].filter((x) => x !== 'staff'));
  const hairStyle = kind === 'm' ? (R() < 0.12 ? -1 : R() < 0.55 ? 0 : 1) : (R() < 0.6 ? 0 : R() < 0.75 ? 1 : 2);
  return { kind, outfit, seed, skin: pick(R, SKIN), hair: pick(R, HAIR), top: pick(R, TOPS), bottom: pick(R, BOTS), shoes: pick(R, SHOES), outer: pick(R, OUTER), trim: '#2a1d14', iris: pick(R, IRIS),
    hairStyle, beard: kind === 'm' && R() < 0.35, pattern: R() < 0.62 ? 0 : R() < 0.55 ? 1 : R() < 0.6 ? 2 : 3, height: (kind === 'm' ? 1.0 : 0.965) * (0.95 + R() * 0.09), ...o.over };
}
// staff uniforms: black shirt and trousers, a burgundy waistcoat (the server and the guide), or a brand blazer (reception)
export const STAFF = {
  receptionist: { kind: 'f', outfit: 'jacket', over: { rb: 'Business_Female_01', top: '#202022', bottom: '#151518', outer: '#6e1622', shoes: '#141414', hair: '#2b1d14', hairStyle: 1, pattern: 0, skin: '#d9a47f' } },
  usher: { kind: 'm', outfit: 'staff', over: { rb: 'Business_Male_01', top: '#121214', bottom: '#151518', outer: '#6e1622', shoes: '#141414', hair: '#1c1410', hairStyle: 0, beard: false, pattern: 0, skin: '#c68b62' } },
  vendor: { kind: 'f', outfit: 'staff', over: { rb: 'Business_Female_02', top: '#121214', bottom: '#151518', outer: '#7a1f28', shoes: '#141414', hair: '#1c1410', hairStyle: 1, pattern: 0, skin: '#e8b996' } },
  vendor2: { kind: 'm', outfit: 'staff', over: { rb: 'Business_Male_02', top: '#121214', bottom: '#151518', outer: '#7a1f28', shoes: '#141414', hair: '#3d2817', hairStyle: 1, beard: true, pattern: 0, skin: '#a8704a' } },
  bartender: { kind: 'f', outfit: 'staff', over: { rb: 'Business_Female_03', top: '#f1f0ec', bottom: '#151518', outer: '#121214', shoes: '#141414', hair: '#5a3a1f', hairStyle: 0, pattern: 0, skin: '#f2d0b6' } },
  server: { kind: 'm', outfit: 'staff', over: { rb: 'Business_Male_03', top: '#121214', bottom: '#151518', outer: '#6e1622', shoes: '#141414', hair: '#2b1d14', hairStyle: 1, beard: false, pattern: 0, skin: '#8a5538' } },
  greeter: { kind: 'f', outfit: 'staff', over: { rb: 'Business_Female_04', top: '#121214', bottom: '#151518', outer: '#6e1622', shoes: '#141414', hair: '#1c1410', hairStyle: 0, pattern: 0, skin: '#c68b62' } },
};
export const staffRecipe = (look, seed = 7) => randomRecipe(seed, STAFF[look] || STAFF.usher);
// ------------------------------------------------------------------ loading
export async function loadPeople(base = './models/') {
  const ld = new GLTFLoader(); ld.setMeshoptDecoder(MeshoptDecoder);
  const [gm, gf, ga, tj] = await Promise.all([ld.loadAsync(base + 'people_male.glb'), ld.loadAsync(base + 'people_female.glb'), ld.loadAsync(base + 'anims.glb'), fetch(base + 'people/tex.json').then((r) => r.json())]);
  const tl = new THREE.TextureLoader(), tex = (n) => { const t = tl.load(base + 'people/' + n); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 2; return t; };
  DATA.tex = { skin_m: tex('skin_m.jpg'), skin_f: tex('skin_f.jpg'), hair_m: tex('hair_m.jpg'), hair_f: tex('hair_f.jpg'), eye: tex('eye.jpg'), ref: tj };
  const animPelvis = boneY(ga.scene, 'pelvis');
  for (const [k, g] of [['m', gm], ['f', gf]]) {
    const K = { scene: g.scene, variants: {}, pelvisY: boneY(g.scene, 'pelvis') }; DATA.kinds[k] = K;
    g.scene.traverse((o) => { if (o.isSkinnedMesh) { const m = o.name.match(/^[MF]_(\w+)_L(\d)$/); if (m) { (K.variants[m[1]] = K.variants[m[1]] || {})['L' + m[2]] = o; o.frustumCulled = false; } } });
    dequantize(g.scene);
    K.clips = {}; for (const c of ga.animations) K.clips[c.name] = adaptClip(c, K.pelvisY / animPelvis);
    K.templates = {}; for (const v in K.variants) K.templates[v] = makeTemplate(g.scene, k, v);
  }
  try { await loadRB(base, ld); } catch (e) { console.warn('[people] Rocketbox people not loaded, using the v8 people', e); RB.ready = false; }
  DATA.ready = true; return DATA;
}
// the people GLBs are meshopt-compressed: positions are stored as small integers and the skins' inverse bind matrices carry the scale back.
// Re-skin the bind pose once on the CPU so positions are real metres again (clothes patterns, shoe soles and the GPU crowd use them),
// then recompute the inverse bind matrices for those positions.
function dequantize(scene) {
  scene.updateMatrixWorld(true); const v = new THREE.Vector3(), skels = new Set();
  scene.traverse((m) => { if (!m.isSkinnedMesh) return; const P = m.geometry.attributes.position, out = new Float32Array(P.count * 3);
    for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i); m.applyBoneTransform(i, v); out[i * 3] = v.x; out[i * 3 + 1] = v.y; out[i * 3 + 2] = v.z; }
    m.geometry.setAttribute('position', new THREE.BufferAttribute(out, 3)); m.geometry.computeBoundingSphere(); skels.add(m); });
  const done = new Set(); for (const m of skels) { if (!done.has(m.skeleton)) { m.skeleton.calculateInverses(); done.add(m.skeleton); } m.bind(m.skeleton, new THREE.Matrix4()); }
}
function boneY(root, name) { let y = 1; root.updateMatrixWorld(true); root.traverse((o) => { if (o.isBone && o.name === name) { const p = new THREE.Vector3(); o.getWorldPosition(p); y = p.y; } }); return y; }
// the library's clips on another body: every bone's rotation, and only the pelvis's translation (scaled to this body's hip height),
// so the body keeps its own proportions
function adaptClip(clip, k) {
  const tracks = [];
  for (const tr of clip.tracks) { const dot = tr.name.lastIndexOf('.'), node = tr.name.slice(0, dot), prop = tr.name.slice(dot + 1);
    if (prop === 'quaternion') tracks.push(tr);
    else if (prop === 'position' && node === 'pelvis') { const t = tr.clone(); for (let i = 0; i < t.values.length; i++) t.values[i] *= k; tracks.push(t); } }
  return new THREE.AnimationClip(clip.name, clip.duration, tracks);
}
// one template per outfit: the rig and that outfit's three detail levels
function makeTemplate(scene, kind, variant) {
  const c = skClone(scene); const keep = new RegExp('^[MF]_' + variant + '_L\\d$'), drop = [];
  c.traverse((o) => { if (o.isSkinnedMesh && !keep.test(o.name)) drop.push(o); }); for (const o of drop) o.parent.remove(o);
  return c;
}
// ------------------------------------------------------------------ shading (shared by the skinned people and the GPU crowd)
const FRAG = COMMON_FRAG + `
uniform sampler2D uSkinTex; uniform sampler2D uHairTex; uniform sampler2D uEyeTex; uniform vec3 uSkinRef; uniform float uHairRef;
varying float vPart; varying vec2 vUv; varying vec3 vN; varying vec3 vRest; varying float vDist; varying vec3 vLight;
varying vec3 vSkin; varying vec3 vTop; varying vec3 vBot; varying vec3 vHair; varying vec3 vOuter; varying vec3 vShoe; varying vec3 vIris; varying float vPat;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main() {
  int p = int(vPart + 0.5); vec3 alb; float spec = 0.0; float fine = clamp(1.0 - vDist / 14.0, 0.0, 1.0);
  if (p == 0) { vec3 t = texture2D(uSkinTex, vUv).rgb; alb = t / uSkinRef * vSkin; spec = 0.10; }
  else if (p == 1) { alb = vTop; float s = 1.0;
    if (vPat > 0.5 && vPat < 1.5) s = mix(1.0, 0.72, step(0.5, fract(vRest.y * 10.0)));
    else if (vPat > 1.5 && vPat < 2.5) { float a = step(0.5, fract(vRest.y * 7.0)), b = step(0.5, fract(vRest.x * 7.0 + 0.25)); s = 0.72 + 0.14 * a + 0.14 * b; }
    else if (vPat > 2.5) s = abs(vRest.x) > 0.24 ? 0.78 : 1.0;
    alb *= s * (0.94 + 0.06 * hash(floor(vRest.xy * 900.0)) * fine); }
  else if (p == 2) { alb = vBot * (0.9 + 0.1 * fine * (0.5 + 0.5 * sin((vRest.x + vRest.y) * 1400.0))); }
  else if (p == 3) { alb = vRest.y < 0.028 ? vec3(0.92, 0.91, 0.88) * (vShoe.r + vShoe.g < 0.3 ? 0.25 : 1.0) : vShoe; spec = 0.15; }
  else if (p == 4 || p == 6 || p >= 10) { float h = texture2D(uHairTex, vUv).r / uHairRef; alb = vHair * mix(0.55, 1.25, clamp(h, 0.0, 1.4) * 0.7); spec = 0.18; }
  else if (p == 5) { vec3 e = texture2D(uEyeTex, vUv).rgb; float iris = smoothstep(0.55, 0.35, dot(e, vec3(0.333))); alb = mix(e, e * vIris * 2.2, iris * 0.6); spec = 0.6; }
  else if (p == 7) { alb = vec3(0.10, 0.03, 0.03); }
  else if (p == 8) { alb = vOuter; spec = 0.05; }
  else { alb = vec3(0.08, 0.06, 0.05); spec = 0.2; }
  vec3 N = normalize(vN); vec3 col = alb * vLight + spec * vLight * pow(max(N.y * 0.5 + 0.5, 0.0), 4.0) * 0.5;
  gl_FragColor = vec4(lumFog(lumTone(col), vDist), 1.0);
  #include <colorspace_fragment>
}`;
// skinned person: lighting from the room's probe at the person (crowd.lightAt), colours as uniforms
const VERT_SKIN = `
#include <common>
#include <skinning_pars_vertex>
attribute float _part;
uniform vec4 uHide; uniform vec3 uAmb; uniform vec3 uKey; uniform vec3 uKeyDir; uniform vec3 uScreenL;
uniform vec3 uSkin; uniform vec3 uTop; uniform vec3 uBot; uniform vec3 uHair; uniform vec3 uOuter; uniform vec3 uShoe; uniform vec3 uIris; uniform float uPat;
varying float vPart; varying vec2 vUv; varying vec3 vN; varying vec3 vRest; varying float vDist; varying vec3 vLight;
varying vec3 vSkin; varying vec3 vTop; varying vec3 vBot; varying vec3 vHair; varying vec3 vOuter; varying vec3 vShoe; varying vec3 vIris; varying float vPat;
void main() {
  #include <skinbase_vertex>
  #include <beginnormal_vertex>
  #include <skinnormal_vertex>
  #include <begin_vertex>
  #include <skinning_vertex>
  vPart = _part; vUv = uv; vRest = position; vSkin = uSkin; vTop = uTop; vBot = uBot; vHair = uHair; vOuter = uOuter; vShoe = uShoe; vIris = uIris; vPat = uPat;
  vec4 wp = modelMatrix * vec4(transformed, 1.0); vN = normalize(mat3(modelMatrix) * objectNormal);
  float k = max(dot(vN, uKeyDir) * 0.75 + 0.25, 0.0); vLight = uAmb * (0.62 + 0.38 * (vN.y * 0.5 + 0.5)) + uKey * k + uScreenL * 0.7;
  vec4 mv = viewMatrix * wp; vDist = -mv.z; gl_Position = projectionMatrix * mv;
  float hide = (_part > 3.5 && _part < 4.5 ? uHide.x : 0.0) + (_part > 10.5 && _part < 11.5 ? uHide.y : 0.0) + (_part > 11.5 && _part < 12.5 ? uHide.z : 0.0) + (_part > 9.5 && _part < 10.5 ? uHide.w : 0.0);
  if (hide > 0.5) gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
}`;
// a photographed person: the atlas, alpha-tested hair cards, lit like the v8 people (room probe + key + screen light)
const VERT_RB = `
#include <common>
#include <skinning_pars_vertex>
uniform vec3 uAmb; uniform vec3 uKey; uniform vec3 uKeyDir; uniform vec3 uScreenL;
varying vec2 vUv; varying vec3 vN; varying float vDist; varying vec3 vLight;
void main() {
  #include <skinbase_vertex>
  #include <beginnormal_vertex>
  #include <skinnormal_vertex>
  #include <begin_vertex>
  #include <skinning_vertex>
  vUv = uv; vec4 wp = modelMatrix * vec4(transformed, 1.0); vN = normalize(mat3(modelMatrix) * objectNormal);
  float k = max(dot(vN, uKeyDir) * 0.75 + 0.25, 0.0); vLight = uAmb * (0.62 + 0.38 * (vN.y * 0.5 + 0.5)) + uKey * k + uScreenL * 0.7;
  vec4 mv = viewMatrix * wp; vDist = -mv.z; gl_Position = projectionMatrix * mv;
}`;
const FRAG_RB = COMMON_FRAG + `
uniform sampler2D uMap; uniform vec4 uDye; uniform vec4 uHairDye; uniform vec3 uSkinYCC; varying vec2 vUv; varying vec3 vN; varying float vDist; varying vec3 vLight;
bool skinLike(vec3 c) { vec3 g = sqrt(c); float Y = dot(g, vec3(0.299, 0.587, 0.114)), cb = (g.b - Y) * 0.564, cr = (g.r - Y) * 0.713;
  if (uSkinYCC.x > 0.0) return abs(cb - uSkinYCC.y) < 0.045 && abs(cr - uSkinYCC.z) < 0.05 && Y > uSkinYCC.x * 0.35 && Y < uSkinYCC.x * 1.5;
  return cb > -0.2 && cb < 0.0 && cr > 0.02 && cr < 0.18; }
vec3 dye(vec3 c, vec3 to) { float y = dot(c, vec3(0.2126, 0.7152, 0.0722)); return to * clamp(pow(y / 0.2, 0.7), 0.12, 2.2) * 0.9; }
void main() {
  vec4 t = texture2D(uMap, vUv); if (t.a < 0.5) discard; vec3 c = t.rgb;
  if (uDye.a > 0.5 && vUv.x < 0.5 && vUv.y > 0.5 && !skinLike(c)) c = dye(c, uDye.rgb);
  if (uHairDye.a > 0.5) { bool cards = vUv.x < 0.5 && vUv.y < 0.5, scalp = vUv.x > 0.5 && vUv.y > 0.5 && !(vUv.x < 0.67 && vUv.y > 0.76) && dot(c, vec3(0.2126, 0.7152, 0.0722)) < 0.09 && !skinLike(c);
    if (cards || scalp) c = dye(c, uHairDye.rgb); }
  vec3 N = normalize(gl_FrontFacing ? vN : -vN); vec3 col = c * vLight * 1.15 + 0.05 * vLight * pow(max(N.y * 0.5 + 0.5, 0.0), 4.0);
  gl_FragColor = vec4(lumFog(lumTone(col), vDist), 1.0);
  #include <colorspace_fragment>
}`;
function rbMaterial(av) {
  return new THREE.ShaderMaterial({ vertexShader: VERT_RB, fragmentShader: FRAG_RB, side: THREE.DoubleSide, uniforms: {
    uExposure: G.uExposure, uBright: G.uBright, uFogColor: G.uFogColor, uFogNear: G.uFogNear, uFogFar: G.uFogFar, uMap: { value: av.tex }, uDye: { value: new THREE.Vector4(1, 1, 1, 0) }, uHairDye: { value: new THREE.Vector4(1, 1, 1, 0) }, uSkinYCC: { value: new THREE.Vector3(...(av.skinYCC || [0, 0, 0])) },
    uAmb: { value: new THREE.Color(0.4, 0.4, 0.4) }, uKey: { value: new THREE.Color(0.3, 0.3, 0.3) }, uKeyDir: { value: new THREE.Vector3(0.3, 0.8, 0.4).normalize() }, uScreenL: { value: new THREE.Color(0, 0, 0) } } });
}
const lin = (hex) => new THREE.Color(hex);
function hideFor(r) { const h = r.hairStyle; return new THREE.Vector4(h === 0 ? 0 : 1, h === 1 ? 0 : 1, h === 2 ? 0 : 1, r.beard ? 0 : 1); }
export function personMaterial(r) {
  const T = DATA.tex, k = r.kind, ref = T.ref['skin_' + k], href = T.ref['hair_' + k];
  return new THREE.ShaderMaterial({ vertexShader: VERT_SKIN, fragmentShader: FRAG, uniforms: {
    uExposure: G.uExposure, uBright: G.uBright, uFogColor: G.uFogColor, uFogNear: G.uFogNear, uFogFar: G.uFogFar,
    uSkinTex: { value: T['skin_' + k] }, uHairTex: { value: T['hair_' + k] }, uEyeTex: { value: T.eye }, uSkinRef: { value: new THREE.Color().setRGB(ref[0], ref[1], ref[2], THREE.SRGBColorSpace) }, uHairRef: { value: href[0] },
    uSkin: { value: lin(r.skin) }, uTop: { value: lin(r.top) }, uBot: { value: lin(r.bottom) }, uHair: { value: lin(r.hair) }, uOuter: { value: lin(r.outer) }, uShoe: { value: lin(r.shoes) }, uIris: { value: lin(r.iris) }, uPat: { value: r.pattern },
    uHide: { value: hideFor(r) }, uAmb: { value: new THREE.Color(0.4, 0.4, 0.4) }, uKey: { value: new THREE.Color(0.3, 0.3, 0.3) }, uKeyDir: { value: new THREE.Vector3(0.3, 0.8, 0.4).normalize() }, uScreenL: { value: new THREE.Color(0, 0, 0) } } });
}
// ------------------------------------------------------------------ IK and pose helpers (world space, no knowledge of bone axes needed)
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _pq = new THREE.Quaternion(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _d = new THREE.Vector3(), _e = new THREE.Vector3(), _ID = new THREE.Quaternion();
function rotWorld(bone, q, w = 1) {   // apply a world-space rotation q (blended by w) to a bone, keeping its parent
  if (w <= 0) return; bone.parent.getWorldQuaternion(_pq); bone.getWorldQuaternion(_q2); _q.copy(_ID).slerp(q, w); _q2.premultiply(_q); bone.quaternion.copy(_pq.invert().multiply(_q2)); bone.updateMatrixWorld(true);
}
function aim(bone, child, target, w) { bone.getWorldPosition(_a); child.getWorldPosition(_b); _c.subVectors(_b, _a).normalize(); _d.subVectors(target, _a).normalize(); const q = new THREE.Quaternion().setFromUnitVectors(_c, _d); rotWorld(bone, q, w); }
// two-bone arm IK: shoulder (upper), elbow (lower), wrist (hand); pole = where the elbow should point
function armIK(upper, lower, hand, target, pole, w) {
  if (w <= 0) return; upper.getWorldPosition(_a); lower.getWorldPosition(_b); hand.getWorldPosition(_c);
  const la = _a.distanceTo(_b), lb = _b.distanceTo(_c), d = Math.max(0.05, Math.min(la + lb - 0.002, _a.distanceTo(target)));
  const dir = _d.subVectors(target, _a).normalize(), x = (la * la - lb * lb + d * d) / (2 * d), h = Math.sqrt(Math.max(0, la * la - x * x));
  const pp = _e.subVectors(pole, _a); pp.sub(dir.clone().multiplyScalar(pp.dot(dir))).normalize();
  const elbow = _a.clone().addScaledVector(dir, x).addScaledVector(pp, h);
  aim(upper, lower, elbow, w); aim(lower, hand, target, w);
}
// gestures as targets in the person's own frame (x = their left, y = up, z = forward), relative to the chest / head; t = seconds into the gesture
const GEST = {
  clap: (t) => { const s = 0.02 + 0.07 * Math.abs(Math.sin(t * Math.PI * 3.6)); return { L: [s, -0.06, 0.34], R: [-s, -0.06, 0.34], from: 'chest' }; },
  cheer: (t) => ({ L: [0.2, 0.62 + 0.04 * Math.sin(t * 7), 0.08], R: [-0.2, 0.62 + 0.04 * Math.sin(t * 7 + 1), 0.08], from: 'chest', lean: -0.06 }),
  scream: (t) => ({ L: [0.07, 0.2, 0.2], R: [-0.07, 0.2, 0.2], from: 'chest', lean: -0.16, jaw: 0.32, head: -0.12 }),
  gasp: (t) => ({ L: [0.05, 0.05, 0.22], R: [-0.07, 0.1, 0.26], from: 'chest', lean: -0.09, jaw: 0.14 }),
  laugh: (t) => ({ L: [0.06, -0.2, 0.18], from: 'chest', lean: 0.07 * Math.sin(t * 9) - 0.03, jaw: 0.12 + 0.07 * Math.abs(Math.sin(t * 9)), head: -0.1 }),
  aww: (t) => ({ L: [0.04, -0.02, 0.18], R: [-0.04, -0.02, 0.18], from: 'chest', tilt: 0.18 }),
  lean: (t) => ({ L: [0.16, -0.36, 0.3], R: [-0.16, -0.36, 0.3], from: 'chest', lean: 0.2 }),
  eat: (t) => { const k = smooth(0.2, 0.7, t % 2.6) * (1 - smooth(1.5, 2.1, t % 2.6)); return { R: [-0.02 - 0.06 * (1 - k), -0.32 * (1 - k) + 0.17 * k, 0.24 * (1 - k) + 0.08 * k], L: [0.1, -0.36, 0.26], from: 'chest', jaw: k > 0.8 ? 0.06 * Math.abs(Math.sin(t * 12)) : 0 }; },
  drink: (t) => { const k = smooth(0.2, 0.8, t % 3) * (1 - smooth(1.8, 2.5, t % 3)); return { R: [-0.03, -0.3 * (1 - k) + 0.16 * k, 0.25 * (1 - k) + 0.07 * k], from: 'chest', head: -0.1 * k }; },
  shush: (t) => ({ R: [-0.01, 0.17, 0.1], from: 'chest' }),
  wave: (t) => ({ R: [-0.32 + 0.07 * Math.sin(t * 9), 0.52, 0.1], from: 'chest' }),
  read: (t) => ({ L: [0.08, -0.12, 0.3], R: [-0.08, -0.12, 0.3], from: 'chest', head: 0.38 }),
  hold: (t) => ({ R: [-0.17, -0.3, 0.24], from: 'chest' }),
  type: (t) => ({ L: [0.13, -0.3, 0.4 + 0.02 * Math.sin(t * 13)], R: [-0.13, -0.3, 0.4 + 0.02 * Math.sin(t * 11 + 2)], from: 'chest', head: 0.25 }),
  point: (t) => ({ R: [-0.42, 0.06, 0.48], from: 'chest' }),
  give: (t) => ({ R: [-0.08, -0.12, 0.46], from: 'chest' }),
  talk: (t) => ({ R: [-0.16 + 0.05 * Math.sin(t * 2.3), -0.22 + 0.05 * Math.sin(t * 3.1), 0.28], from: 'chest' }),
  pour: (t) => ({ R: [-0.1, -0.12 + 0.03 * Math.sin(t * 2), 0.42], L: [0.08, -0.2, 0.36], from: 'chest', head: 0.3 }),
  scoop: (t) => ({ R: [-0.12, -0.34 + 0.08 * Math.abs(Math.sin(t * 3)), 0.44], from: 'chest', head: 0.32 }),
};
export const GESTURES = Object.keys(GEST);
class Rig {   // bone lookups for one skeleton
  constructor(root) { const B = {}; root.traverse((o) => { if (o.isBone) B[o.name] = o; }); this.B = B; this.root = root;
    // v9 (phone feedback: "their eyes spin"): the clips don't animate the eyes or the jaw, so the per-frame turn added up; they now
    // start every frame from their rest pose
    this.rest = ['eye_l', 'eye_r', 'jaw'].filter((n) => B[n]).map((n) => [B[n], B[n].quaternion.clone()]); }
  reset() { for (const [b, q] of this.rest) b.quaternion.copy(q); }
  get(n) { return this.B[n]; }
}
// apply a gesture (weight w) and the face controls to a posed skeleton. frame: the person's world matrix (for "their" axes)
const _m = new THREE.Matrix4(), _fx = new THREE.Vector3(), _fy = new THREE.Vector3(), _fz = new THREE.Vector3(), _o = new THREE.Vector3(), _t = new THREE.Vector3(), _p = new THREE.Vector3();
function poseLayers(rig, frame, g, gt, w, face) {
  const B = rig.B; frame.extractBasis(_fx, _fy, _fz); _fx.normalize(); _fy.normalize(); _fz.normalize();
  const spec = g && GEST[g] ? GEST[g](gt) : null;
  if (spec && w > 0) {
    if (spec.lean) rotWorld(B.spine_02, new THREE.Quaternion().setFromAxisAngle(_fx, spec.lean), w);
    if (spec.tilt) rotWorld(B.Head, new THREE.Quaternion().setFromAxisAngle(_fz, spec.tilt), w);
    B.spine_03.getWorldPosition(_o); _o.addScaledVector(_fy, 0.05);
    for (const side of ['L', 'R']) { const v = spec[side]; if (!v) continue; const s = side === 'L' ? 'l' : 'r';
      _t.copy(_o).addScaledVector(_fx, v[0]).addScaledVector(_fy, v[1]).addScaledVector(_fz, v[2]);
      const ua = B['upperarm_' + s]; ua.getWorldPosition(_p); _p.addScaledVector(_fx, side === 'L' ? 0.25 : -0.25).addScaledVector(_fy, -0.35).addScaledVector(_fz, -0.1);
      armIK(ua, B['lowerarm_' + s], B['hand_' + s], _t, _p, w); }
  }
  // head: look (yaw relative to the body, pitch), plus a gesture's nod; the neck takes a third, the head the rest
  const look = face.lookAmt || 0, yaw = clamp(face.lookYaw || 0, -1.2, 1.2) * look, pitch = clamp((face.lookPitch || 0) * look + (spec && spec.head ? spec.head * w : 0), -0.6, 0.6);
  if (Math.abs(yaw) > 1e-3) { rotWorld(B.neck_01, new THREE.Quaternion().setFromAxisAngle(_fy, yaw * 0.35)); rotWorld(B.Head, new THREE.Quaternion().setFromAxisAngle(_fy, yaw * 0.55)); }
  if (Math.abs(pitch) > 1e-3) rotWorld(B.Head, new THREE.Quaternion().setFromAxisAngle(_fx, pitch));
  if (Math.abs(yaw) > 0.9) rotWorld(B.spine_03, new THREE.Quaternion().setFromAxisAngle(_fy, (yaw - Math.sign(yaw) * 0.9) * 0.6));   // looking far round turns the shoulders too
  const jaw = (face.jaw || 0) + (spec && spec.jaw ? spec.jaw * w : 0); if (jaw > 0.002 && B.jaw) rotWorld(B.jaw, new THREE.Quaternion().setFromAxisAngle(_fx, jaw));
  if (B.eye_l && (face.eyeYaw || face.eyePitch)) { const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(face.eyePitch || 0, face.eyeYaw || 0, 0, 'YXZ')); _m.extractRotation(frame); const qf = new THREE.Quaternion().setFromRotationMatrix(_m), qw = qf.clone().multiply(q).multiply(qf.clone().invert()); rotWorld(B.eye_l, qw); rotWorld(B.eye_r, qw); }
}
// ------------------------------------------------------------------ a skinned person (same interface as the v5 Character)
// a player's own look (Play together): outfit colour, hair colour and height, each an index into these lists (0 = as photographed).
// The dye keeps the photographed shading: non-skin texels of the body take the colour at their own brightness; hair cards and the dark
// painted hair on the head take the hair colour (the eyes and mouth corner of the head texture are left alone)
export const LOOK = { outfit: [null, '#151518', '#e9e5dd', '#9c1c26', '#1d2c50', '#1f4d31', '#b38b3a', '#4d2b6e', '#c4562a'],
  hair: [null, '#161210', '#4a2c1a', '#8c3c1f', '#c9a25c', '#a3a3a8', '#2c4fa3', '#b33a6e'], height: [0.93, 0.965, 1.0, 1.035, 1.07] };
export const cleanLook = (l) => { const i = (v, n, d) => (Number.isInteger(v) && v >= 0 && v < n ? v : d); l = l && typeof l === 'object' ? l : {};
  return { o: i(l.o, LOOK.outfit.length, 0), h: i(l.h, LOOK.hair.length, 0), s: i(l.s, LOOK.height.length, 2) }; };
export function applyLook(p, look) {
  if (!p || !p.av || !p.mat || !p.mat.uniforms.uDye) return; const L = cleanLook(look), u = p.mat.uniforms, set = (U, hex) => { if (hex) { const c = new THREE.Color(hex); U.value.set(c.r, c.g, c.b, 1); } else U.value.w = 0; };
  set(u.uDye, LOOK.outfit[L.o]); set(u.uHairDye, LOOK.hair[L.h]); if (p.av.skinYCC) u.uSkinYCC.value.set(...p.av.skinYCC); p.scale = LOOK.height[L.s]; p.model.scale.setScalar(p.scale);
}
const SIT_H = 0.47;   // seat height the library's sitting clips were made for
export class Person {
  constructor(r, opts = {}) {
    this.rec = r; const av = rbAvatar(r); this.av = av; this.sitH = SIT_H; this.walkRef = 1.35;
    if (av) { const C = RB.meta.clips[av.kind] || {}; this.K = { clips: rbClips(av) }; this.root = skClone(av.scene); this.mat = rbMaterial(av); this.sitH = C.seatY || SIT_H; this.walkRef = (C.Walk_Loop && C.Walk_Loop.speed) || 1.1; }
    else { const K = DATA.kinds[r.kind]; this.K = K; this.root = skClone(K.templates[r.outfit] || K.templates.tee); this.mat = personMaterial(r); }
    this.meshes = {}; this.root.traverse((o) => { if (o.isSkinnedMesh) { o.material = this.mat; o.frustumCulled = false; this.meshes[o.name.slice(-2)] = o; } });
    // photographed people keep their own build: only a small height spread (the v8 bodies took the recipe's height)
    this.group = new THREE.Group(); this.model = new THREE.Group(); this.model.add(this.root); this.group.add(this.model); this.scale = av ? 0.97 + (((r.seed || 1) * 0.37) % 1) * 0.06 : r.height; this.model.scale.setScalar(this.scale);
    this.rig = new Rig(this.root); this.mixer = new THREE.AnimationMixer(this.root); this.actions = {}; this.base = null; this.lod = -1; this.setLOD(0);
    this.s = { sit: 0, drop: 0, recline: 0.1, lookYaw: 0, lookPitch: 0, lookAmt: 0, t: Math.random() * 100 };
    this.walkT = 0; this.gestT = null; this.snap = true; this.expr = 'neutral'; this.talking = false; this.items = {}; this.staff = !!opts.staff;
    this._g = null; this._gw = 0; this._gt = 0; this.face = { jaw: 0, lookYaw: 0, lookPitch: 0, lookAmt: 0, eyeYaw: 0, eyePitch: 0 }; this._sacc = 0; this._sitDir = 0; this.idleKind = opts.idle || 'Idle_Loop';
    if (r.look) applyLook(this, r.look);
  }
  action(name) { let a = this.actions[name]; if (!a) { const c = this.K.clips[name]; if (!c) return null; a = this.actions[name] = this.mixer.clipAction(c); } return a; }
  play(name, fade = 0.3, scrub = null) {
    const a = this.action(name); if (!a) return; if (this.base === name) { if (scrub != null) { a.time = scrub * a.getClip().duration; a.timeScale = 0; } return; }
    const prev = this.base && this.actions[this.base]; a.reset(); a.enabled = true; a.setEffectiveWeight(1); a.timeScale = scrub != null ? 0 : 1; if (scrub != null) a.time = scrub * a.getClip().duration; a.play();
    if (prev) prev.crossFadeTo(a, this.snap ? 0.01 : fade, false); this.base = name; this.snap = false;
  }
  seatDrop(h) { return h - this.sitH; }
  setExpr(e) { this.expr = e; }
  setLOD(l) { l = Math.min(l, 2); if (l === this.lod) return; this.lod = l; for (const k in this.meshes) this.meshes[k].visible = k === 'L' + l; }
  // a carried thing rides in the palm and stays upright (a bucket of popcorn does not tip with the wrist)
  attach(name, mesh, bone) { this.detach(name); const b = this.rig.get({ handR: 'hand_r', handL: 'hand_l', head: 'Head' }[bone] || bone) || this.rig.get('hand_r'); b.add(mesh); mesh.userData.hand = b; this.items[name] = mesh; }
  detach(name) { const m = this.items[name]; if (m && m.parent) m.parent.remove(m); delete this.items[name]; }
  _items() {
    for (const k in this.items) { const m = this.items[k], b = m.userData.hand; b.getWorldPosition(_a); this.group.matrixWorld.extractBasis(_fx, _fy, _fz);
      _a.addScaledVector(_fy.normalize(), -0.03).addScaledVector(_fz.normalize(), 0.035); b.worldToLocal(m.position.copy(_a));
      this.group.getWorldQuaternion(_q2); b.getWorldQuaternion(_pq); m.quaternion.copy(_pq.invert().multiply(_q2)); }
  }
  update(dt, light) {
    const s = this.s; s.t += dt;
    if (light) { const u = this.mat.uniforms; u.uAmb.value.copy(light.amb); u.uKey.value.copy(light.key); u.uKeyDir.value.copy(light.dir); u.uScreenL.value.copy(light.screen); }
    // base clip from the agent's state: sitting down / up is scrubbed by the agent's own progress, so it lands exactly on the seat
    // (without a stand-up clip, sitting down plays backwards)
    if (s.sit > 0.01 && s.sit < 0.99) { if (this._lastSit != null) this._sitDir = s.sit > this._lastSit ? 1 : s.sit < this._lastSit ? -1 : this._sitDir; if (this._sitDir >= 0 || !this.K.clips.Sitting_Exit) this.play('Sitting_Enter', 0.25, s.sit); else this.play('Sitting_Exit', 0.25, 1 - s.sit); }
    else if (s.sit >= 0.99) this.play(this.talking ? 'Sitting_Talking_Loop' : 'Sitting_Idle_Loop', 0.35);
    else if (this.walkT > 0.05) { const name = this.items.item ? 'Walk_Carry_Loop' : this.staff ? 'Walk_Formal_Loop' : this.walkT > 2.2 ? 'Jog_Fwd_Loop' : 'Walk_Loop'; this.play(name, 0.25); const a = this.actions[name]; if (a) a.timeScale = clamp(this.walkT / (this.av ? this.walkRef : name === 'Jog_Fwd_Loop' ? 3.0 : 1.35), 0.55, 1.6); }
    else this.play(this.talking ? 'Idle_Talking_Loop' : this.gestT === 'phone' ? 'Idle_TalkingPhone_Loop' : this.gestT === 'fold' ? 'Idle_FoldArms_Loop' : this.idleKind, 0.35);
    this._lastSit = s.sit;
    this.mixer.update(dt); this.model.position.y = s.sit * (s.drop || 0); this.model.rotation.x = -s.sit * Math.max(0, (s.recline || 0.1) - 0.1) * 0.6;
    this.root.updateMatrixWorld(true);
    // gesture layer: fades in and out
    const g = GEST[this.gestT] ? this.gestT : null; if (g && g !== this._g) { this._g = g; this._gt = 0; } this._gw += ((g ? 1 : 0) - this._gw) * Math.min(1, dt * 7); if (this._g) this._gt += dt; if (this._gw < 0.01 && !g) this._g = null;
    // face: look at the player with the head, saccades with the eyes, the jaw while talking (the voice clip's envelope when one plays,
    // voice.js sets this.mouth; a syllable rhythm otherwise), wide for screams
    const f = this.face; f.lookYaw = s.lookYaw; f.lookPitch = s.lookPitch; f.lookAmt = s.lookAmt;
    this._sacc -= dt; if (this._sacc <= 0) { this._sacc = 0.4 + Math.random() * 2.2; f.eyeYaw = (Math.random() - 0.5) * 0.35 + clamp(s.lookYaw * s.lookAmt * 0.3, -0.3, 0.3); f.eyePitch = (Math.random() - 0.5) * 0.15; }
    const tj = this.mouth != null ? 0.012 + 0.16 * this.mouth : this.talking ? 0.05 + 0.07 * Math.max(0, Math.sin(s.t * 13.1) * Math.sin(s.t * 4.7 + 1.3)) : this.expr === 'scream' ? 0.3 : this.expr === 'laugh' ? 0.12 : 0; f.jaw += (tj - f.jaw) * Math.min(1, dt * 18);
    this.rig.reset(); this.root.updateMatrixWorld(true); poseLayers(this.rig, this.group.matrixWorld, this._g, this._gt, this._gw, f); this._items();
  }
  dispose() { this.mixer.stopAllAction(); this.mat.dispose(); }
}
// ------------------------------------------------------------------ the GPU crowd: seated audiences, skinned from a baked bone texture
// clips baked per body kind; seated reactions are the sitting idle with a gesture layer on top
const BAKE = [['Sitting_Idle_Loop', null, 0], ['Sitting_Talking_Loop', null, 0], ['clap', 'clap', 2.4], ['cheer', 'cheer', 2.6], ['scream', 'scream', 1.8], ['gasp', 'gasp', 1.6], ['laugh', 'laugh', 2.4], ['aww', 'aww', 2.2], ['lean', 'lean', 3.0], ['eat', 'eat', 2.6], ['drink', 'drink', 3.0], ['shush', 'shush', 1.8], ['look', null, 3.0]];
const FPS = 30;
// fps: frames baked per second; idleCap: longest stretch of a seated loop baked (the photographed people's sitting idles run 30 s and more)
function bakeRig(tpl, clips, fps, idleCap, lookSign) {
  const rig = new Rig(tpl), mixer = new THREE.AnimationMixer(tpl);
  let sk = null; tpl.traverse((o) => { if (o.isSkinnedMesh && !sk) sk = o.skeleton; });
  const bones = sk.bones, nb = bones.length, rows = [], table = {}, frame = new THREE.Matrix4(), M = new THREE.Matrix4(), idle = mixer.clipAction(clips.Sitting_Idle_Loop);
  for (const [name, g, len] of BAKE) {
    const clip = g || name === 'look' ? clips.Sitting_Idle_Loop : clips[name]; if (!clip) continue;
    if (!g && name !== 'look' && name !== 'Sitting_Idle_Loop' && clip === clips.Sitting_Idle_Loop && table.Sitting_Idle_Loop) { table[name] = table.Sitting_Idle_Loop; continue; }   // an alias: share the rows
    const dur = len || Math.min(clip.duration, idleCap), n = Math.max(2, Math.round(dur * fps));
    mixer.stopAllAction(); const a = mixer.clipAction(clip); a.reset().play(); table[name] = { row: rows.length, frames: n };
    for (let i = 0; i < n; i++) {
      const t = i / fps; mixer.setTime(g ? t % clip.duration : t); tpl.updateMatrixWorld(true);
      const w = g ? smooth(0, 0.3, t) * (1 - smooth(dur - 0.35, dur, t)) : 0;
      const face = { jaw: 0, lookYaw: name === 'look' ? 0.9 * Math.sin(Math.PI * t / dur) * lookSign : 0, lookPitch: 0, lookAmt: name === 'look' ? 1 : 0 };
      if (g || name === 'look') { rig.reset(); tpl.updateMatrixWorld(true); poseLayers(rig, frame, g, t, w, face); }
      const row = new Float32Array(nb * 12);
      for (let b = 0; b < nb; b++) { M.multiplyMatrices(bones[b].matrixWorld, sk.boneInverses[b]); const e = M.elements; row.set([e[0], e[4], e[8], e[12], e[1], e[5], e[9], e[13], e[2], e[6], e[10], e[14]], b * 12); }
      rows.push(row); }
  }
  idle.stop();
  const W = nb * 3, H = rows.length, data = new Float32Array(W * H * 4); rows.forEach((r, y) => data.set(r, y * W * 4));
  const tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat, THREE.FloatType); tex.needsUpdate = true; tex.minFilter = tex.magFilter = THREE.NearestFilter; tex.generateMipmaps = false;
  return { tex, table, nb };
}
function bakeKind(k) { const K = DATA.kinds[k]; return bakeRig(skClone(K.templates.tee), K.clips, FPS, 1e9, k === 'm' ? 1 : -1); }
// one bake per gender serves every photographed person of that gender (their skeletons are identical, tools/blender/rocketbox.py checks it)
const RB_FPS = 15;
function bakeRB(g) { const n = RB.names[g][0]; if (!n) return null; const av = RB.avatars[n]; return bakeRig(skClone(av.scene), rbClips(av), RB_FPS, 12, g === 'm' ? 1 : -1); }
const VERT_CROWD = `
attribute vec4 skinIndex; attribute vec4 skinWeight; attribute float _part; attribute vec4 iPose; attribute vec4 iClip; attribute vec4 iClipB; attribute vec4 iCol; attribute vec4 iCol2; attribute vec4 iLit;
uniform sampler2D uBones; uniform float uTime; uniform float uHouse; uniform vec3 uScreen; uniform vec3 uScreenN;
varying float vPart; varying vec2 vUv; varying vec3 vN; varying vec3 vRest; varying float vDist; varying vec3 vLight;
varying vec3 vSkin; varying vec3 vTop; varying vec3 vBot; varying vec3 vHair; varying vec3 vOuter; varying vec3 vShoe; varying vec3 vIris; varying float vPat;
vec3 unpack(float f) { float r = floor(f / 65536.0), g = floor((f - r * 65536.0) / 256.0), b = f - r * 65536.0 - g * 256.0; vec3 c = vec3(r, g, b) / 255.0; return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
mat4 bone(float row, float i) { int x = int(i) * 3, y = int(row); vec4 a = texelFetch(uBones, ivec2(x, y), 0), b = texelFetch(uBones, ivec2(x + 1, y), 0), c = texelFetch(uBones, ivec2(x + 2, y), 0); return mat4(a.x, b.x, c.x, 0.0, a.y, b.y, c.y, 0.0, a.z, b.z, c.z, 0.0, a.w, b.w, c.w, 1.0); }
mat4 skinAt(vec4 clip) { float f = floor(mod(max(uTime - clip.z, 0.0) * clip.w * ${FPS}.0, clip.y)), row = clip.x + f;
  return bone(row, skinIndex.x) * skinWeight.x + bone(row, skinIndex.y) * skinWeight.y + bone(row, skinIndex.z) * skinWeight.z + bone(row, skinIndex.w) * skinWeight.w; }
void main() {
  mat4 S = skinAt(iClip); if (iClipB.w > 0.001) S = S * (1.0 - iClipB.w) + skinAt(vec4(iClipB.xyz, 1.0)) * iClipB.w;
  float c = cos(iPose.w), s = sin(iPose.w); float sc = iCol2.w;
  vec4 lp = S * vec4(position, 1.0); vec3 ln = mat3(S) * normal;
  vec3 p = vec3(c * lp.x + s * lp.z, lp.y, -s * lp.x + c * lp.z) * sc + iPose.xyz; vec3 n = vec3(c * ln.x + s * ln.z, ln.y, -s * ln.x + c * ln.z);
  vPart = _part; vUv = uv; vRest = position; vN = normalize(mat3(modelMatrix) * n);
  vSkin = unpack(iCol.x); vTop = unpack(iCol.y); vBot = unpack(iCol.z); vHair = unpack(iCol.w); vOuter = unpack(iCol2.x); vShoe = unpack(iCol2.y); vIris = vec3(0.35, 0.22, 0.12); vPat = floor(iCol2.z / 16.0);
  float hemi = vN.y * 0.4 + 0.6; vLight = (iLit.xyz * uHouse + vec3(0.02)) * hemi + iLit.w * uScreen * max(dot(vN, normalize(vec3(uScreenN.x, 0.0, uScreenN.z))) * 0.6 + 0.4, 0.15);
  vec4 mv = viewMatrix * modelMatrix * vec4(p, 1.0); vDist = -mv.z; gl_Position = projectionMatrix * mv;
  float hs = mod(iCol2.z, 4.0), hide = (_part > 3.5 && _part < 4.5 && hs != 0.0) || (_part > 10.5 && _part < 11.5 && hs != 1.0) || (_part > 11.5 && _part < 12.5 && hs != 2.0) || (_part > 9.5 && _part < 10.5 && mod(floor(iCol2.z / 4.0), 2.0) < 0.5) ? 1.0 : 0.0;
  if (hide > 0.5) gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
}`;
const VERT_CROWD_RB = `
attribute vec4 skinIndex; attribute vec4 skinWeight; attribute vec4 iPose; attribute vec4 iClip; attribute vec4 iClipB; attribute vec4 iCol2; attribute vec4 iLit;
uniform sampler2D uBones; uniform float uTime; uniform float uHouse; uniform vec3 uScreen; uniform vec3 uScreenN;
varying vec2 vUv; varying vec3 vN; varying float vDist; varying vec3 vLight;
mat4 bone(float row, float i) { int x = int(i) * 3, y = int(row); vec4 a = texelFetch(uBones, ivec2(x, y), 0), b = texelFetch(uBones, ivec2(x + 1, y), 0), c = texelFetch(uBones, ivec2(x + 2, y), 0); return mat4(a.x, b.x, c.x, 0.0, a.y, b.y, c.y, 0.0, a.z, b.z, c.z, 0.0, a.w, b.w, c.w, 1.0); }
mat4 skinAt(vec4 clip) { float f = floor(mod(max(uTime - clip.z, 0.0) * clip.w * ${RB_FPS}.0, clip.y)), row = clip.x + f;
  return bone(row, skinIndex.x) * skinWeight.x + bone(row, skinIndex.y) * skinWeight.y + bone(row, skinIndex.z) * skinWeight.z + bone(row, skinIndex.w) * skinWeight.w; }
void main() {
  mat4 S = skinAt(iClip); if (iClipB.w > 0.001) S = S * (1.0 - iClipB.w) + skinAt(vec4(iClipB.xyz, 1.0)) * iClipB.w;
  float c = cos(iPose.w), s = sin(iPose.w); float sc = iCol2.w;
  vec4 lp = S * vec4(position, 1.0); vec3 ln = mat3(S) * normal;
  vec3 p = vec3(c * lp.x + s * lp.z, lp.y, -s * lp.x + c * lp.z) * sc + iPose.xyz; vec3 n = vec3(c * ln.x + s * ln.z, ln.y, -s * ln.x + c * ln.z);
  vUv = uv; vN = normalize(mat3(modelMatrix) * n);
  float hemi = vN.y * 0.4 + 0.6; vLight = (iLit.xyz * uHouse + vec3(0.02)) * hemi + iLit.w * uScreen * max(dot(vN, normalize(vec3(uScreenN.x, 0.0, uScreenN.z))) * 0.6 + 0.4, 0.15);
  vec4 mv = viewMatrix * modelMatrix * vec4(p, 1.0); vDist = -mv.z; gl_Position = projectionMatrix * mv;
}`;
const packC = (hex) => { const c = new THREE.Color(hex); c.convertLinearToSRGB(); return Math.round(c.r * 255) * 65536 + Math.round(c.g * 255) * 256 + Math.round(c.b * 255); };
export class CrowdRenderer {
  constructor(parent, U, lod = 2) {
    this.parent = parent; this.U = U; this.lod = lod; this.pools = {};
    if (RB.ready) { DATA.bakeRB = DATA.bakeRB || { m: bakeRB('m'), f: bakeRB('f') }; this.RBB = DATA.bakeRB; } else { DATA.bake = DATA.bake || { m: bakeKind('m'), f: bakeKind('f') }; this.B = DATA.bake; }
    this.sN = U.uScreenN || { value: new THREE.Vector3(0, 0.29, -0.96) };
  }
  poolRB(av, lod, cap) {
    const key = 'rb' + av.name + lod; let P = this.pools[key]; if (P && P.cap >= cap) return P; const src = av.lods['L' + lod] || av.lods.L0;
    const g = new THREE.InstancedBufferGeometry(); for (const n of ['position', 'normal', 'uv', 'skinIndex', 'skinWeight']) g.setAttribute(n, src.geometry.attributes[n]); g.setIndex(src.geometry.index);
    for (const n of ['iPose', 'iClip', 'iClipB', 'iCol2', 'iLit']) g.setAttribute(n, new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4).setUsage(THREE.DynamicDrawUsage));
    const m = new THREE.ShaderMaterial({ vertexShader: VERT_CROWD_RB, fragmentShader: FRAG_RB, side: THREE.DoubleSide, uniforms: {
      uExposure: G.uExposure, uBright: G.uBright, uFogColor: G.uFogColor, uFogNear: G.uFogNear, uFogFar: G.uFogFar, uTime: G.uTime, uHouse: this.U.uHouse, uScreen: this.U.uScreen, uScreenN: this.sN,
      uBones: { value: this.RBB[av.kind].tex }, uMap: { value: av.tex } } });
    if (P) { this.parent.remove(P.mesh); P.mesh.geometry.dispose(); }
    const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; g.instanceCount = 0; this.parent.add(mesh); P = this.pools[key] = { mesh, cap, n: 0, kind: av.kind, rb: true }; return P;
  }
  pool(kind, outfit, lod, cap) {
    const key = kind + outfit + lod; let P = this.pools[key]; if (P && P.cap >= cap) return P; const src = DATA.kinds[kind].variants[outfit]['L' + lod];
    const g = new THREE.InstancedBufferGeometry(); for (const n of ['position', 'normal', 'uv', 'skinIndex', 'skinWeight', '_part']) g.setAttribute(n, src.geometry.attributes[n]); g.setIndex(src.geometry.index);
    for (const n of ['iPose', 'iClip', 'iClipB', 'iCol', 'iCol2', 'iLit']) g.setAttribute(n, new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4).setUsage(THREE.DynamicDrawUsage));
    const T = DATA.tex, ref = T.ref['skin_' + kind], m = new THREE.ShaderMaterial({ vertexShader: VERT_CROWD, fragmentShader: FRAG, uniforms: {
      uExposure: G.uExposure, uBright: G.uBright, uFogColor: G.uFogColor, uFogNear: G.uFogNear, uFogFar: G.uFogFar, uTime: G.uTime, uHouse: this.U.uHouse, uScreen: this.U.uScreen, uScreenN: this.sN, uBones: { value: this.B[kind].tex },
      uSkinTex: { value: T['skin_' + kind] }, uHairTex: { value: T['hair_' + kind] }, uEyeTex: { value: T.eye }, uSkinRef: { value: new THREE.Color().setRGB(ref[0], ref[1], ref[2], THREE.SRGBColorSpace) }, uHairRef: { value: T.ref['hair_' + kind][0] } } });
    if (P) { this.parent.remove(P.mesh); P.mesh.geometry.dispose(); }
    const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; g.instanceCount = 0; this.parent.add(mesh); P = this.pools[key] = { mesh, cap, n: 0, kind }; return P;
  }
  begin() { for (const k in this.pools) this.pools[k].n = 0; }
  // one seated person: v = { rec, x, y, z, yaw, lit: [r,g,b,screen], clip, t0, speed, clipB, t0B, blend }
  add(v, lod) {
    const av = this.RBB ? rbAvatar(v.rec) : null;
    if (av) { const B = this.RBB[av.kind], key = 'rb' + av.name + lod; let P = this.pools[key]; if (!P || P.n >= P.cap) P = this.poolRB(av, lod, Math.max(32, P ? P.cap * 2 : 64));
      const i = P.n++, a = P.mesh.geometry.attributes, A = B.table[v.clip] || B.table.Sitting_Idle_Loop, Bc = v.clipB && B.table[v.clipB];
      a.iPose.setXYZW(i, v.x, v.y, v.z, v.yaw); a.iClip.setXYZW(i, A.row, A.frames, v.t0 || 0, v.speed || 1); a.iClipB.setXYZW(i, Bc ? Bc.row : 0, Bc ? Bc.frames : 1, v.t0B || 0, Bc ? v.blend : 0);
      a.iCol2.setXYZW(i, 0, 0, 0, 0.97 + (((v.rec.seed || 1) * 0.37) % 1) * 0.06); a.iLit.setXYZW(i, v.lit[0], v.lit[1], v.lit[2], v.lit[3]); return; }
    const r = v.rec, B = this.B[r.kind], key = r.kind + r.outfit + lod; let P = this.pools[key]; if (!P || P.n >= P.cap) P = this.pool(r.kind, r.outfit, lod, Math.max(32, P ? P.cap * 2 : 64));
    const i = P.n++, a = P.mesh.geometry.attributes, A = B.table[v.clip] || B.table.Sitting_Idle_Loop, Bc = v.clipB && B.table[v.clipB];
    a.iPose.setXYZW(i, v.x, v.y, v.z, v.yaw); a.iClip.setXYZW(i, A.row, A.frames, v.t0 || 0, v.speed || 1); a.iClipB.setXYZW(i, Bc ? Bc.row : 0, Bc ? Bc.frames : 1, v.t0B || 0, Bc ? v.blend : 0);
    if (!r._pk) r._pk = [packC(r.skin), packC(r.top), packC(r.bottom), packC(r.hair), packC(r.outer), packC(r.shoes), (r.pattern || 0) * 16 + (r.beard ? 4 : 0) + (r.hairStyle < 0 ? 3 : r.hairStyle)];
    const pk = r._pk; a.iCol.setXYZW(i, pk[0], pk[1], pk[2], pk[3]); a.iCol2.setXYZW(i, pk[4], pk[5], pk[6], r.height); a.iLit.setXYZW(i, v.lit[0], v.lit[1], v.lit[2], v.lit[3]);
  }
  end() { for (const k in this.pools) { const P = this.pools[k], g = P.mesh.geometry; g.instanceCount = P.n; P.mesh.visible = P.n > 0; if (P.n) for (const n of P.rb ? ['iPose', 'iClip', 'iClipB', 'iCol2', 'iLit'] : ['iPose', 'iClip', 'iClipB', 'iCol', 'iCol2', 'iLit']) { g.attributes[n].needsUpdate = true; g.attributes[n].addUpdateRange && (g.attributes[n].clearUpdateRanges(), g.attributes[n].addUpdateRange(0, P.n * 4)); } } }
  hide() { for (const k in this.pools) this.pools[k].mesh.visible = false; }
}
// the hand props people carry: popcorn bucket, soda cup, coffee (shared geometry, lit like their holder)
export { SIT_H };
