// Premium procedural materials on top of MeshLambertMaterial (cheap enough for the Mali class GPU): per-vertex material id -> velvet sheen, wood grain,
// veined marble, brass key-light, deco carpet lattice, chequer floor, cloth, leather, curtain folds, skin/hair/satin rim. Self-heals to plain Lambert if a shader fails.
import * as THREE from 'three';
import { makeCanvas, detailTexture } from './textures.js';
import { faceAtlas } from './faces.js';
export const MAT = { plain: 0, velvet: 1, wood: 2, marble: 3, brass: 4, carpet: 5, plaster: 6, chequer: 7, cloth: 8, leather: 9, curtain: 10, stone: 11, skin: 12, hair: 13, glass: 14, satin: 15 };
function noiseTexture(size = 128) {   // 4 independent tileable value-noise fields in RGBA
  const c = makeCanvas(size, size), g = c.getContext('2d'), img = g.createImageData(size, size); let s = 9173; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const fields = []; for (let k = 0; k < 4; k++) { const cells = [8, 16, 12, 24][k], lat = new Float32Array(cells * cells); for (let i = 0; i < lat.length; i++) lat[i] = rnd(); const f = new Float32Array(size * size);
    const at = (x, y) => lat[((y % cells + cells) % cells) * cells + ((x % cells + cells) % cells)];
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { const u = x / size * cells, v = y / size * cells, xi = Math.floor(u), yi = Math.floor(v), xf = u - xi, yf = v - yi, sx = xf * xf * (3 - 2 * xf), sy = yf * yf * (3 - 2 * yf);
      f[y * size + x] = (at(xi, yi) * (1 - sx) + at(xi + 1, yi) * sx) * (1 - sy) + (at(xi, yi + 1) * (1 - sx) + at(xi + 1, yi + 1) * sx) * sy; } fields.push(f); }
  for (let i = 0; i < size * size; i++) for (let k = 0; k < 4; k++) img.data[i * 4 + k] = Math.round(fields[k][i] * 255); g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.NoColorSpace; t.minFilter = THREE.LinearMipmapLinearFilter; return t;
}
const FRAG_PARS = `varying float vMatId; varying vec3 vWP; uniform sampler2D uNoise; uniform float uK;`;
const FRAG_BODY = `
{
  float id = vMatId; vec3 wp = vWP;
  vec4 nA = texture2D(uNoise, wp.xz * 0.9 + wp.y * 0.37);
  vec4 nB = texture2D(uNoise, wp.zy * 2.3 + wp.x * 0.51);
  vec3 Vv = normalize(vViewPosition);
  float ndv = clamp(dot(normal, Vv), 0.0, 1.0);
  float rim = pow(1.0 - ndv, 3.0);
  vec3 base = diffuseColor.rgb; vec3 extra = vec3(0.0);
  if (id > 0.5 && id < 1.5) {
    diffuseColor.rgb *= 0.78 + 0.44 * nB.r; extra += base * rim * 0.95;
  } else if (id < 2.5 && id > 1.5) {
    float gr = sin((wp.x * 5.0 + wp.z * 2.2 + wp.y * 9.0) * 3.0 + nA.g * 6.0);
    diffuseColor.rgb *= 0.72 + 0.28 * (gr * 0.5 + 0.5) + 0.14 * (nB.b - 0.5); extra += base * rim * 0.14;
  } else if (id < 3.5 && id > 2.5) {
    float vv = abs(sin(wp.x * 2.1 + wp.z * 1.7 + wp.y * 1.1 + nA.r * 6.0 + nB.g * 3.0));
    diffuseColor.rgb *= mix(0.55, 1.0, smoothstep(0.0, 0.10, vv)) * (0.92 + 0.16 * nB.r); extra += base * rim * 0.12;
  } else if (id < 4.5 && id > 3.5) {
    float key = clamp(dot(normal, normalize(vec3(-0.35, 0.8, 0.5))), 0.0, 1.0);
    diffuseColor.rgb *= 0.55 + 0.95 * key * key; extra += vec3(0.5, 0.36, 0.12) * rim * 0.6 * (0.4 + key);
  } else if (id < 5.5 && id > 4.5) {
    vec2 g = wp.xz * 1.35; vec2 u = vec2(g.x + g.y, g.x - g.y); vec2 fr = abs(fract(u) - 0.5);
    float ln = smoothstep(0.46, 0.49, max(fr.x, fr.y)); float dt = 1.0 - smoothstep(0.06, 0.12, length(fr));
    diffuseColor.rgb = base * (0.82 + 0.36 * nB.r);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.5, 0.34, 0.07), ln * 0.85);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.04, 0.17, 0.19), dt * 0.8);
  } else if (id < 6.5 && id > 5.5) {
    diffuseColor.rgb *= 0.84 + 0.32 * nA.r;
  } else if (id < 7.5 && id > 6.5) {
    vec2 q = wp.xz * 1.1; vec2 cell = floor(q); float chk = mod(cell.x + cell.y, 2.0); vec2 fq = fract(q);
    float grout = clamp(step(0.982, max(fq.x, fq.y)) + step(min(fq.x, fq.y), 0.018), 0.0, 1.0);
    float vv = abs(sin(wp.x * 1.9 + wp.z * 1.4 + nA.r * 5.0)); vec3 col = mix(vec3(0.58, 0.54, 0.47), vec3(0.022, 0.02, 0.018), chk);
    col *= mix(0.72, 1.0, smoothstep(0.0, 0.12, vv)); col = mix(col, vec3(0.16, 0.13, 0.09), grout * 0.8);
    diffuseColor.rgb = col; extra += vec3(0.05) * chk * 0.0;
  } else if (id < 8.5 && id > 7.5) {
    diffuseColor.rgb *= 0.86 + 0.28 * nB.r; extra += base * rim * 0.22;
  } else if (id < 9.5 && id > 8.5) {
    diffuseColor.rgb *= 0.84 + 0.32 * nB.g; extra += vec3(0.30) * pow(1.0 - ndv, 4.0) * 0.4;
  } else if (id < 10.5 && id > 9.5) {
    float fold = sin(wp.x * 18.0 + nA.r * 2.0) * 0.5 + 0.5; diffuseColor.rgb *= 0.5 + 0.65 * fold; extra += base * rim * 0.3;
  } else if (id < 11.5 && id > 10.5) {
    diffuseColor.rgb *= 0.76 + 0.48 * nA.r;
  } else if (id < 12.5 && id > 11.5) {
    extra += vec3(0.65, 0.28, 0.2) * base * rim * 0.5;
  } else if (id < 13.5 && id > 12.5) {
    float strand = texture2D(uNoise, vec2(vWP.x * 9.0 + vWP.z * 7.0, vWP.y * 1.3)).r; diffuseColor.rgb *= 0.62 + 0.55 * strand; float sh = pow(clamp(dot(normal, normalize(Vv + vec3(0.0, 0.9, 0.0))), 0.0, 1.0), 14.0); extra += (vec3(0.30, 0.24, 0.18) * sh + base * rim * 0.5);
  } else if (id < 14.5 && id > 13.5) {
    extra += vec3(0.10, 0.13, 0.16) * (0.2 + rim * 1.4);
  } else if (id > 14.5) {
    float key = clamp(dot(normal, normalize(vec3(-0.3, 0.7, 0.6))), 0.0, 1.0); extra += base * (pow(key, 3.0) * 0.55 + rim * 0.4);
  }
  totalEmissiveRadiance += extra * uK;
}`;
const PEOPLE_VERT = `
#ifdef LUM_PEOPLE
vFace = faceinfo.y > 0.0 ? faceinfo.x : -1.0; vObjCm = faceinfo.y > 0.0 ? position / (0.01 * faceinfo.y) : vec3(0.0); vObjN = normal;
#endif`;
const PEOPLE_FRAG = `
#ifdef LUM_PEOPLE
if (vFace > -0.5 && vMatId > 11.5 && vMatId < 13.5) { vec3 o = vObjCm;
  // vFace is a per-character constant, but interpolation can return 2.9999998 for 3.0: round it before picking the atlas cell,
  // otherwise floor() flips per pixel and cells 0/3/6 (Eloise, Mr. Hale, Lucille) scatter neighbouring faces' features as speckles.
  // The alpha is feathered at the cell borders so the paint blends into the sculpted hair instead of ending in a hard edge.
  if (o.z > 2.0 && o.y > 152.0 && o.y < 172.0 && abs(o.x) < 8.0) { vec2 fu = vec2((o.x + 8.0) / 16.0, (o.y - 152.0) / 20.0); float fi = floor(vFace + 0.5), r = floor((fi + 0.5) / 3.0), c = fi - 3.0 * r;
    vec4 fc = texture2D(uFaceMap, vec2((c + fu.x) / 3.0, (2.0 - r + fu.y) / 3.0)); fc.a *= smoothstep(0.18, 0.5, normalize(vObjN).z) * (1.0 - smoothstep(6.9, 8.0, abs(o.x))) * smoothstep(152.0, 153.2, o.y) * (1.0 - smoothstep(170.9, 172.0, o.y));
    diffuseColor.rgb = mix(diffuseColor.rgb, fc.rgb, fc.a); } }
#endif`;
export function patchShader(shader, U) {
  const rep = (src, what, by) => { if (!src.includes(what)) throw new Error('shader hook missing: ' + what); return src.replace(what, by); };
  shader.uniforms.uNoise = U.uNoise; shader.uniforms.uK = U.uK;
  shader.vertexShader = rep(shader.vertexShader, '#include <common>', '#include <common>\nattribute float matid;\nvarying float vMatId;\nvarying vec3 vWP;\n#ifdef LUM_PEOPLE\nattribute vec2 faceinfo; varying vec3 vObjCm; varying vec3 vObjN; varying float vFace;\n#endif');
  shader.vertexShader = rep(shader.vertexShader, '#include <skinning_vertex>', `#include <skinning_vertex>
vMatId = matid;${PEOPLE_VERT}
#ifdef USE_SKINNING
vWP = transformed;
#else
vec4 wp_ = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
wp_ = instanceMatrix * wp_;
#endif
vWP = (modelMatrix * wp_).xyz;
#endif`);
  shader.fragmentShader = rep(shader.fragmentShader, '#include <common>', '#include <common>\n' + FRAG_PARS + '\n#ifdef LUM_PEOPLE\nuniform sampler2D uFaceMap; varying vec3 vObjCm; varying vec3 vObjN; varying float vFace;\n#endif');
  if (U.uFaceMap) shader.uniforms.uFaceMap = U.uFaceMap;
  shader.fragmentShader = rep(shader.fragmentShader, '#include <color_fragment>', '#include <color_fragment>\n' + PEOPLE_FRAG);
  shader.fragmentShader = rep(shader.fragmentShader, '#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n' + FRAG_BODY);
  return shader;
}
export class Materials {
  constructor(engine) {
    this.engine = engine; this.U = { uNoise: { value: noiseTexture() }, uK: { value: 1 } }; this.detail = detailTexture(); this.patched = []; this.healed = false;
    const mk = (extra = {}) => { const m = new THREE.MeshLambertMaterial({ vertexColors: true, map: this.detail, ...extra }); m.onBeforeCompile = (sh) => patchShader(sh, this.U); m.customProgramCacheKey = () => 'lum-pbr-1'; this.patched.push(m); return m; };
    this.solid = mk(); this.decal = mk({ polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    this.U.uFaceMap = { value: faceAtlas() }; this.people = mk(); this.people.defines = { LUM_PEOPLE: '' }; this.people.customProgramCacheKey = () => 'lum-pbr-1-people';
    this.glow = engine.addGlowMaterial(new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }), new THREE.Color(1, 1, 1));
  }
  setK(v) { this.U.uK.value = v; }
  // call a few frames after the first render: if any program failed to link, fall back to plain Lambert (never a black screen)
  verify(renderer) {
    if (this.healed) return true; const progs = renderer.info.programs || []; const bad = progs.some((p) => p.diagnostics && p.diagnostics.runnable === false);
    if (bad) { this.healed = true; for (const m of this.patched) { m.onBeforeCompile = () => {}; m.customProgramCacheKey = () => 'lum-plain'; m.needsUpdate = true; } console.warn('LUMIERE: premium shader rejected by this GPU - using plain materials'); }
    return !bad;
  }
}
