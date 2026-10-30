// LUMIERE v5 - shaders. The building uses baked light (bake.js): the fragment work is albedo x light + a cheap procedural surface
// (wood grain, terrazzo flecks, carpet pattern, acoustic ribs...) and a fake sheen. No runtime lights for the building at all.
// People use a per-character probe (ambient + key light); the far audience is one instanced mesh animated in its vertex shader.
// Never put a `//` comment inside a GLSL line that carries code: it swallows the rest of the line (v4 lesson).
import * as THREE from 'three';
import { makeCanvas } from './textures.js';
import { LIB, libArrays, PARAMS } from './library.js';
export function noiseTexture(size = 128) {   // 4 independent tileable value-noise fields in RGBA
  const c = makeCanvas(size, size), g = c.getContext('2d'), img = g.createImageData(size, size); let s = 9173; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const fields = []; for (let k = 0; k < 4; k++) { const cells = [8, 16, 32, 64][k], lat = new Float32Array(cells * cells); for (let i = 0; i < lat.length; i++) lat[i] = rnd(); const f = new Float32Array(size * size);
    const at = (x, y) => lat[((y % cells + cells) % cells) * cells + ((x % cells + cells) % cells)];
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { const u = x / size * cells, v = y / size * cells, xi = Math.floor(u), yi = Math.floor(v), xf = u - xi, yf = v - yi, sx = xf * xf * (3 - 2 * xf), sy = yf * yf * (3 - 2 * yf);
      f[y * size + x] = (at(xi, yi) * (1 - sx) + at(xi + 1, yi) * sx) * (1 - sy) + (at(xi, yi + 1) * (1 - sx) + at(xi + 1, yi + 1) * sx) * sy; } fields.push(f); }
  for (let i = 0; i < size * size; i++) for (let k = 0; k < 4; k++) img.data[i * 4 + k] = Math.round(fields[k][i] * 255); g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.NoColorSpace; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; return t;
}
// shared by every custom shader
export const G = { uEnvOn: { value: 1 }, uNoise: { value: null }, uExposure: { value: 1.0 }, uFogColor: { value: new THREE.Color(0x0b0b0e) }, uFogNear: { value: 45 }, uFogFar: { value: 150 }, uTime: { value: 0 }, uDetail: { value: 1 }, uBright: { value: 1 } };
const COMMON_FRAG = `
uniform float uExposure; uniform vec3 uFogColor; uniform float uFogNear; uniform float uFogFar; uniform float uBright;
vec3 lumTone(vec3 c) { return 1.0 - exp(-c * uExposure * uBright); }
vec3 lumFog(vec3 c, float dist) { return mix(c, uFogColor, smoothstep(uFogNear, uFogFar, dist)); }
`;
// ---------------- static (baked) ----------------
const STATIC_VERT = `
attribute vec3 color; attribute vec3 lh; attribute vec3 lf; attribute float ls; attribute float matid;
uniform float uHouse; uniform vec3 uScreen; uniform float uFix;
varying vec3 vAlb; varying vec3 vLight; varying float vMat; varying vec3 vWP; varying vec3 vN; varying float vDist;
void main() {
  vAlb = color; vMat = matid; vN = normal;
  vLight = lh * uHouse + lf * uFix + ls * uScreen;
  vec4 wp = modelMatrix * vec4(position, 1.0); vWP = wp.xyz;
  vec4 mv = viewMatrix * wp; vDist = -mv.z; gl_Position = projectionMatrix * mv;
}`;
const STATIC_FRAG = COMMON_FRAG + `
uniform sampler2D uNoise; uniform vec3 uEnv; uniform float uDetail;
varying vec3 vAlb; varying vec3 vLight; varying float vMat; varying vec3 vWP; varying vec3 vN; varying float vDist;
void main() {
  vec3 N = normalize(vN); vec3 V = normalize(cameraPosition - vWP); float ndv = clamp(dot(N, V), 0.0, 1.0);
  vec3 alb = vAlb; float gloss = 0.0; float id = floor(vMat + 0.5); vec3 wp = vWP;
  vec4 nA = texture2D(uNoise, wp.xz * 0.21 + wp.y * 0.13);
  vec4 nB = texture2D(uNoise, (abs(N.y) > 0.6 ? wp.xz : (abs(N.x) > 0.6 ? wp.zy : wp.xy)) * 1.7);
  if (id == 1.0) { alb *= 0.86 + 0.28 * nB.a; alb += vAlb * pow(1.0 - ndv, 2.5) * 0.55; }
  else if (id == 2.0) { float gr = sin((dot(wp, vec3(0.7, 0.0, 0.3)) * 3.0 + nA.r * 5.0) * 6.0); alb *= 0.86 + 0.1 * gr + 0.12 * (nB.b - 0.5); gloss = 0.12; }
  else if (id == 3.0) { float f = step(0.78, nB.a) * 0.35 + step(0.83, nB.b) * 0.25; alb = mix(alb * (0.94 + 0.1 * nA.g), vec3(0.18, 0.17, 0.16), f * 0.6); gloss = 0.3; }
  else if (id == 4.0) { alb *= 0.9 + 0.12 * sin(dot(wp, vec3(40.0, 13.0, 40.0)) + nB.r * 3.0); gloss = 0.55; }
  else if (id == 5.0) { vec2 g = wp.xz * 1.6; vec2 u = vec2(g.x + g.y, g.x - g.y); vec2 fr = abs(fract(u) - 0.5); float ln = smoothstep(0.44, 0.48, max(fr.x, fr.y)); alb *= 0.82 + 0.3 * nB.a; alb = mix(alb, alb * 1.9 + vec3(0.03), ln * 0.45); }
  else if (id == 6.0) { alb *= 0.93 + 0.12 * nA.b; }
  else if (id == 7.0) { vec2 q = (abs(N.y) > 0.6 ? wp.xz : (abs(N.x) > 0.6 ? wp.zy : wp.xy)) / 0.6; vec2 fq = fract(q); float gr = 1.0 - step(0.02, fq.x) * step(0.02, fq.y); alb = mix(alb * (0.92 + 0.12 * nA.r), alb * 0.55, gr); gloss = 0.25 * (1.0 - gr); }
  else if (id == 8.0) { alb *= 0.88 + 0.22 * nB.g; gloss = 0.18; }
  else if (id == 9.0) { float rib = smoothstep(0.35, 0.5, abs(fract((abs(N.x) > 0.6 ? wp.z : wp.x) * 22.0) - 0.5)); alb *= 0.84 + 0.18 * rib + 0.06 * nB.r; }
  else if (id == 10.0) { gloss = 0.85; }
  else if (id == 11.0) { float f = step(0.7, nB.a) * 0.5 + step(0.8, nB.r) * 0.4; alb = mix(alb, alb * 2.2 + vec3(0.03), f * 0.5); gloss = 0.45; }
  else if (id == 12.0) { float vv = abs(sin(wp.x * 2.3 + wp.z * 1.9 + wp.y * 1.4 + nA.r * 7.0)); alb *= mix(0.72, 1.0, smoothstep(0.0, 0.12, vv)); gloss = 0.45; }
  else if (id == 14.0) { gloss = 0.95; }
  else if (id == 15.0) { gloss = 0.5; }
  else if (id == 16.0) { vec2 g = wp.xz * 3.0; vec2 fr = abs(fract(g) - 0.5); float d = 1.0 - smoothstep(0.1, 0.16, length(fr)); alb *= 0.85 + 0.25 * nB.a; alb = mix(alb, alb * 2.4, d * 0.35); }
  else if (id == 17.0) { float s = fract((abs(N.x) > 0.6 ? wp.z : wp.x) * 6.0); float gap = smoothstep(0.0, 0.08, s) * smoothstep(1.0, 0.86, s); float gr = sin(wp.y * 9.0 + nA.r * 6.0); alb *= mix(0.25, 0.92 + 0.08 * gr, gap); gloss = 0.08; }
  else if (id == 18.0) { alb *= 0.85 + 0.25 * nA.r * nB.g; }
  alb = mix(vAlb, alb, uDetail);
  vec3 col = alb * vLight;
  float lum = dot(vLight, vec3(0.3, 0.5, 0.2));
  if (gloss > 0.0) {
    vec3 R = reflect(-V, N); float sp = pow(max(R.y, 0.0), 24.0) * 0.5 + pow(max(dot(R, normalize(vec3(0.4, 0.8, 0.2))), 0.0), 40.0);
    float fres = pow(1.0 - ndv, 4.0);
    col += gloss * (vec3(sp * lum * 0.35) + fres * uEnv * 0.9 * (0.6 + 0.8 * nA.a));
  }
  col = lumFog(lumTone(col), vDist);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;
// ---------------- library-lit surfaces (v5.1): albedo + normal maps from library.js, baked light, room reflection probe ----------------
// The baked light has no direction, so the normal map shades it with a fixed "light from above" relief term and drives the reflection.
// Reflections sample the room's own cube capture (world.js) with mip level by roughness, scaled by the local baked light so dark corners
// stay dark and everything dims with the house lights. Velvet gets a rim sheen. Defines: USE_NMAP, USE_ENV (graphics quality).
const LIT_VERT = `
attribute vec3 color; attribute float matid;
#ifdef USE_INSTANCING
attribute float occ; attribute vec3 iLh; attribute vec3 iLf; attribute float iLs;
#elif defined(USE_LIGHTMAP)
attribute vec2 lmuv; varying vec2 vLm;
#else
attribute vec3 lh; attribute vec3 lf; attribute float ls;
#endif
uniform float uHouse; uniform vec3 uScreen; uniform float uFix; uniform vec4 uP[120];
varying vec3 vAlb; varying vec3 vLight; varying vec3 vWP; varying vec3 vN; varying float vDist; varying vec2 vUv; varying vec4 vPA; varying vec4 vPB; varying float vLay; varying float vEm;
void main() {
  int k = int(matid + 0.5) * 3; vPA = uP[k]; vPB = uP[k + 1]; vLay = uP[k + 2].x; vEm = uP[k + 2].y;
  vAlb = color; vUv = uv * vPB.w;
#ifdef USE_INSTANCING
  vec3 n = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
  float hemi = 0.55 + 0.45 * clamp(n.y * 0.6 + n.z * 0.5 + 0.3, 0.0, 1.0);
  vLight = (iLh * uHouse + iLf * uFix) * occ * hemi + iLs * uScreen * occ * clamp(dot(n, vec3(0.0, 0.29, -0.96)) * 0.8 + 0.2, 0.06, 1.0);
  vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
#else
  vec3 n = normalize(mat3(modelMatrix) * normal);
#ifdef USE_LIGHTMAP
  vLm = lmuv; vLight = vec3(0.0);
#else
  vLight = lh * uHouse + lf * uFix + ls * uScreen;
#endif
  vec4 wp = modelMatrix * vec4(position, 1.0);
#endif
  vN = n; vWP = wp.xyz; vec4 mv = viewMatrix * wp; vDist = -mv.z; gl_Position = projectionMatrix * mv;
}`;
// material parameters come per vertex from uP (library.js PARAMS): vPA = rough, metal, normal strength, sheen; vPB = reflection, relief, abs, tiling
const LIT_FRAG = COMMON_FRAG + `
uniform sampler2DArray uMaps; uniform sampler2DArray uNmaps; uniform samplerCube uEnvMap; uniform float uEnvK; uniform float uEnvOn;
varying vec3 vAlb; varying vec3 vLight; varying vec3 vWP; varying vec3 vN; varying float vDist; varying vec2 vUv; varying vec4 vPA; varying vec4 vPB; varying float vLay; varying float vEm;
#ifdef USE_LIGHTMAP
uniform sampler2D uLmH; uniform sampler2D uLmF; uniform sampler2D uLmS; uniform vec3 uLmK; uniform float uHouse; uniform float uFix; uniform vec3 uScreen; varying vec2 vLm;
#endif
vec3 perturb(vec3 p, vec3 n, vec3 m) {
  vec3 q0 = dFdx(p); vec3 q1 = dFdy(p); vec2 st0 = dFdx(vUv); vec2 st1 = dFdy(vUv);
  vec3 q1p = cross(q1, n); vec3 q0p = cross(n, q0); vec3 T = q1p * st0.x + q0p * st1.x; vec3 B = q1p * st0.y + q0p * st1.y;
  float det = max(dot(T, T), dot(B, B)); float sc = det == 0.0 ? 0.0 : inversesqrt(det);
  return normalize(T * (m.x * sc) + B * (m.y * sc) + n * m.z);
}
vec3 envBRDF(vec3 F0, float r, float NoV) {
  vec4 rr = r * vec4(-1.0, -0.0275, -0.572, 0.022) + vec4(1.0, 0.0425, 1.04, -0.04);
  float a = min(rr.x * rr.x, exp2(-9.28 * NoV)) * rr.x + rr.y; vec2 AB = vec2(-1.04, 1.04) * a + rr.zw; return F0 * AB.x + AB.y;
}
void main() {
  vec3 Ng = normalize(vN); vec3 V = normalize(cameraPosition - vWP); vec3 uvl = vec3(vUv, floor(vLay + 0.5));
  vec3 Lt = vLight;
#ifdef USE_LIGHTMAP
  Lt = texture(uLmH, vLm).rgb * (uLmK.x * uHouse);
#ifdef LM_HALL
  Lt += texture(uLmF, vLm).rgb * (uLmK.y * uFix) + texture(uLmS, vLm).r * uLmK.z * uScreen;
#endif
#endif
  float uMetal = vPA.y; float uSheen = vPA.w; float uSpec = vPB.x; float uRelief = vPB.y;
  vec4 t = texture(uMaps, uvl);
  vec3 alb = vPB.z > 0.5 ? t.rgb * vAlb : vAlb * t.rgb * 2.0;
  vec3 N = Ng;
#ifdef USE_NMAP
  vec3 mapN = texture(uNmaps, uvl).xyz * 2.0 - 1.0; mapN.xy *= vPA.z; N = perturb(vWP, Ng, normalize(mapN));
#endif
  float NoV = clamp(dot(N, V), 0.02, 1.0);
  float rough = clamp(vPA.x + (0.5 - dot(t.rgb, vec3(0.33))) * 0.25, 0.03, 1.0);
  float relief = clamp(1.0 + uRelief * dot(N - Ng, vec3(0.25, 0.9, 0.35)) * 1.6, 0.4, 1.6);
  vec3 col = alb * (1.0 - uMetal) * Lt * relief;
  col += alb * Lt * uSheen * pow(1.0 - NoV, 2.2) * 1.4;
  vec3 F0 = mix(vec3(0.04), alb, uMetal);
  float lumL = dot(Lt, vec3(0.3, 0.55, 0.15));
#ifdef USE_ENV
  vec3 R = reflect(-V, N);
  vec3 env = textureLod(uEnvMap, R, rough * 6.0).rgb;
  col += env * envBRDF(F0, rough, NoV) * clamp(lumL * uEnvK, 0.0, 2.0) * uSpec * uEnvOn;
#else
  col += alb * uMetal * Lt * (0.45 + 0.5 * pow(1.0 - NoV, 2.0));
  col += envBRDF(F0, rough, NoV) * lumL * uSpec * 0.35 * pow(max(reflect(-V, N).y, 0.0), 6.0);
#endif
  col += alb * vEm;
  col = lumFog(lumTone(col), vDist);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;
// ---------------- instanced static props (cinema seats): light per instance, shaped per vertex by the normal ----------------
const INST_VERT = `
attribute vec3 color; attribute float matid; attribute float occ; attribute vec3 iLh; attribute vec3 iLf; attribute float iLs;
uniform float uHouse; uniform vec3 uScreen; uniform float uFix;
varying vec3 vAlb; varying vec3 vLight; varying float vMat; varying vec3 vWP; varying vec3 vN; varying float vDist;
void main() {
  vAlb = color; vMat = matid;
  vec3 n = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal); vN = n;
  float hemi = 0.55 + 0.45 * clamp(n.y * 0.6 + n.z * 0.5 + 0.3, 0.0, 1.0);
  vLight = (iLh * uHouse + iLf * uFix) * occ * hemi + iLs * uScreen * occ * clamp(dot(n, vec3(0.0, 0.29, -0.96)) * 0.8 + 0.2, 0.06, 1.0);
  vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0); vWP = wp.xyz;
  vec4 mv = viewMatrix * wp; vDist = -mv.z; gl_Position = projectionMatrix * mv;
}`;
// ---------------- glow (emissive LED strips, signs' light, lenses) ----------------
const GLOW_VERT = `attribute vec3 color; attribute float grp; uniform float uHouse; varying vec3 vC; varying float vDist;
void main() { vC = color * mix(1.0, uHouse, step(0.5, grp)); vec4 mv = modelViewMatrix * vec4(position, 1.0); vDist = -mv.z; gl_Position = projectionMatrix * mv; }`;
const GLOW_FRAG = COMMON_FRAG + `varying vec3 vC; varying float vDist; uniform float uGlow;
void main() { vec3 col = lumFog(lumTone(vC * uGlow), vDist); gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;
// ---------------- textured, lit by one probe value (posters, signs, menu boards); uEmit for back-lit panels ----------------
const TEX_VERT = `uniform vec2 uRep; varying vec2 vUv; varying float vDist; void main() { vUv = uv * uRep; vec4 mv = modelViewMatrix * vec4(position, 1.0); vDist = -mv.z; gl_Position = projectionMatrix * mv; }`;
const TEX_FRAG = COMMON_FRAG + `uniform sampler2D map; uniform vec3 uLight; uniform vec3 uFixL; uniform float uEmit; uniform float uHouse; uniform float uOpacity; varying vec2 vUv; varying float vDist;
void main() { vec4 t = texture2D(map, vUv); vec3 col = t.rgb * (uLight * uHouse + uFixL + vec3(uEmit)); gl_FragColor = vec4(lumFog(lumTone(col), vDist), t.a * uOpacity);
  #include <colorspace_fragment>
}`;
// ---------------- the picture on a screen ----------------
// A projected picture is shown as it was graded: no tone curve. three uploads video frames as raw sRGB bytes (it decodes them only inside
// its own materials), so uRaw = 1 decodes them here; v5.10 skipped that and the picture was gamma-encoded twice (washed out, banded).
// Slides and the house films are sRGB canvas textures the GPU decodes. Output is encoded to sRGB by hand (no tone map, no fog).
const PIC_FRAG = `uniform sampler2D map; uniform float uGain; uniform float uRaw; uniform vec4 uBox; varying vec2 vUv;
vec3 s2l(vec3 c) { return mix(c * 0.0773993808, pow(c * 0.9478672986 + 0.0521327014, vec3(2.4)), step(0.04045, c)); }
vec3 l2s(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(0.41666)) - 0.055, step(0.0031308, c)); }
void main() { vec2 q = (vUv - uBox.xy) / uBox.zw; float inside = step(0.0, q.x) * step(q.x, 1.0) * step(0.0, q.y) * step(q.y, 1.0);
  vec3 c = texture2D(map, clamp(q, 0.0, 1.0)).rgb; c = uRaw > 0.5 ? s2l(c) : c;
  gl_FragColor = vec4(l2s(clamp(c * uGain * inside, 0.0, 1.0)), 1.0);
}`;
// ---------------- LED video wall (the Dolby-style tunnel): moving light ribbons in the film's colours, a fine LED pixel grid that fades out
// with distance (no moire), or the film itself when your own video plays in the IMAX (uVid). Shown as graded: no tone curve.
const LED_VERT = `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const LED_FRAG = `uniform float uTime; uniform vec3 uA; uniform vec3 uB; uniform float uGain; uniform sampler2D uVid; uniform float uVidOn; uniform float uRaw; uniform vec2 uLen; varying vec2 vUv;
vec3 s2l(vec3 c) { return mix(c * 0.0773993808, pow(c * 0.9478672986 + 0.0521327014, vec3(2.4)), step(0.04045, c)); }
vec3 l2s(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(0.41666)) - 0.055, step(0.0031308, c)); }
void main() {
  vec2 p = vec2(vUv.x * uLen.x, vUv.y * uLen.y); float t = uTime;
  float r1 = sin(p.x * 0.9 - t * 0.9 + sin(p.y * 1.7 + t * 0.4) * 1.6);
  float r2 = sin(p.x * 0.43 + p.y * 2.3 - t * 0.55);
  float r3 = sin(p.x * 2.1 - p.y * 0.8 + t * 1.3);
  float band = smoothstep(0.55, 1.0, r1) + 0.55 * smoothstep(0.7, 1.0, r2) + 0.25 * smoothstep(0.85, 1.0, r3);
  vec3 col = mix(uA, uB, 0.5 + 0.5 * sin(p.x * 0.35 - t * 0.3)) * (0.06 + 1.25 * band);
  float sp = fract(sin(dot(floor(p * vec2(9.0, 7.0)), vec2(12.9898, 78.233))) * 43758.5453); col += uB * step(0.985, sp) * (0.5 + 0.5 * sin(t * 3.0 + sp * 40.0)) * 0.6;
  if (uVidOn > 0.5) { vec3 v = texture2D(uVid, vec2(fract(vUv.x * 2.0), vUv.y)).rgb; v = uRaw > 0.5 ? s2l(v) : v; col = mix(col * 0.3, v, 0.85); }
  vec2 g = abs(fract(p * vec2(40.0, 40.0)) - 0.5); float fw = fwidth(p.x * 40.0); float grid = smoothstep(0.5, 0.36, max(g.x, g.y));
  col *= mix(1.0, 0.55 + 0.45 * grid, smoothstep(0.6, 0.15, fw));
  gl_FragColor = vec4(l2s(clamp(col * uGain, 0.0, 1.0)), 1.0);
}`;
// ---------------- people (skinned, probe lit, painted expressive face) ----------------
const PEOPLE_VERT = `
#include <common>
#include <skinning_pars_vertex>
attribute float part; attribute vec2 fuv;
uniform vec3 uPal[8];
varying vec3 vAlb; varying vec3 vWN; varying vec2 vFuv; varying float vDist; varying vec3 vWP;
void main() {
  #include <skinbase_vertex>
  #include <beginnormal_vertex>
  #include <skinnormal_vertex>
  #include <begin_vertex>
  #include <skinning_vertex>
  int pi = int(part + 0.5); vAlb = uPal[0];
  if (pi == 1) vAlb = uPal[1]; else if (pi == 2) vAlb = uPal[2]; else if (pi == 3) vAlb = uPal[3]; else if (pi == 4) vAlb = uPal[4]; else if (pi == 5) vAlb = uPal[5]; else if (pi == 6) vAlb = uPal[6]; else if (pi == 7) vAlb = uPal[7];
  vFuv = fuv; vWN = normalize(mat3(modelMatrix) * objectNormal);
  vec4 wp = modelMatrix * vec4(transformed, 1.0); vWP = wp.xyz; vec4 mv = viewMatrix * wp; vDist = -mv.z; gl_Position = projectionMatrix * mv;
}`;
const PEOPLE_FRAG = COMMON_FRAG + `
uniform sampler2D uFace; uniform vec2 uEyes; uniform vec2 uMouth; uniform vec3 uAmb; uniform vec3 uKey; uniform vec3 uKeyDir; uniform vec3 uScreenL;
varying vec3 vAlb; varying vec3 vWN; varying vec2 vFuv; varying float vDist; varying vec3 vWP;
void main() {
  vec3 N = normalize(vWN); vec3 alb = vAlb;
  if (vFuv.x > 0.004 && vFuv.x < 0.996 && vFuv.y > 0.004 && vFuv.y < 0.996) { vec2 cell = vFuv.y > 0.46 ? uEyes : uMouth; vec4 f = texture2D(uFace, (cell + vFuv) * 0.25); alb = mix(alb, f.rgb, f.a); }
  vec3 V = normalize(cameraPosition - vWP); float rim = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.0);
  float hemi = N.y * 0.5 + 0.5; float k = max(dot(N, uKeyDir) * 0.75 + 0.25, 0.0);
  vec3 L = uAmb * (0.55 + 0.6 * hemi) + uKey * k + uScreenL * max(dot(N, vec3(0.0, 0.2, -1.0)) * 0.6 + 0.4, 0.0);
  vec3 col = alb * L + alb * rim * (uAmb + uKey) * 0.35;
  gl_FragColor = vec4(lumFog(lumTone(col), vDist), 1.0);
  #include <colorspace_fragment>
}`;
// ---------------- hand props (popcorn bucket, cup): vertex colours, lit by their holder's probe (shared uniform objects) ----------------
const PROP_VERT = `attribute vec3 color; varying vec3 vAlb; varying vec3 vWN; varying vec3 vWP; varying float vDist;
void main() { vAlb = color; vWN = normalize(mat3(modelMatrix) * normal); vec4 wp = modelMatrix * vec4(position, 1.0); vWP = wp.xyz; vec4 mv = viewMatrix * wp; vDist = -mv.z; gl_Position = projectionMatrix * mv; }`;
const PROP_FRAG = COMMON_FRAG + `uniform vec3 uAmb; uniform vec3 uKey; uniform vec3 uKeyDir; uniform vec3 uScreenL; varying vec3 vAlb; varying vec3 vWN; varying vec3 vWP; varying float vDist;
void main() { vec3 N = normalize(vWN); float k = max(dot(N, uKeyDir) * 0.75 + 0.25, 0.0); vec3 L = uAmb * (0.6 + 0.4 * (N.y * 0.5 + 0.5)) + uKey * k + uScreenL * 0.6; vec3 V = normalize(cameraPosition - vWP); float sp = pow(max(dot(reflect(-V, N), uKeyDir), 0.0), 24.0) * 0.4;
  gl_FragColor = vec4(lumFog(lumTone(vAlb * L + sp * (uAmb + uKey)), vDist), 1.0);
  #include <colorspace_fragment>
}`;
// ---------------- far audience: instanced seated people, vertex-shader animation ----------------
const CROWD_VERT = `
attribute float part; attribute vec3 pivot;
attribute vec3 iTop; attribute vec3 iBot; attribute vec3 iHair; attribute vec3 iSkin; attribute vec4 iAct; attribute vec4 iLit;
uniform float uTime; uniform float uHouse; uniform vec3 uScreen;
varying vec3 vAlb; varying vec3 vLight; varying float vDist; varying vec3 vN;
mat3 rotX(float a) { float c = cos(a), s = sin(a); return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c); }
mat3 rotZ(float a) { float c = cos(a), s = sin(a); return mat3(c, s, 0.0, -s, c, 0.0, 0.0, 0.0, 1.0); }
mat3 rotY(float a) { float c = cos(a), s = sin(a); return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c); }
void main() {
  int p = int(part + 0.5); float act = iAct.x; float amt = iAct.y; float ph = iAct.z + uTime; float seed = iAct.w;
  vec3 pos = position; vec3 nrm = normal;
  if (p == 0 || p == 5) vAlb = iTop; else if (p == 1) vAlb = iBot; else if (p == 2) vAlb = iHair; else if (p == 3 || p == 6) vAlb = iSkin; else vAlb = vec3(0.03);
  float side = pivot.x > 0.0 ? 1.0 : -1.0;
  mat3 R = mat3(1.0);
  if (p >= 5) {
    float up = 0.0; float fw = 0.0; float tw = 0.0;
    if (act > 0.5 && act < 1.5) { fw = -1.15; tw = side * (0.25 + 0.18 * sin(ph * 15.0)); }
    else if (act > 1.5 && act < 2.5) { up = 2.6 + 0.25 * sin(ph * 7.0 + side); fw = -0.3; }
    else if (act > 2.5 && act < 3.5) { fw = -2.3; tw = side * 0.35; }
    else if (act > 3.5 && act < 4.5) { fw = -0.7; tw = side * 0.2; }
    else if (act > 5.5 && act < 6.5) { fw = -1.7 - 0.25 * sin(ph * 6.0); tw = side * 0.15; }
    R = rotZ(side * up * amt) * rotX(fw * amt) * rotZ(tw * amt);
    pos = pivot + R * (pos - pivot); nrm = R * nrm;
  }
  float lean = 0.0; float bob = 0.0; float turn = sin(uTime * 0.31 + seed * 6.0) * 0.12;
  if (act > 2.5 && act < 3.5) lean = 0.22 * amt;
  if (act > 3.5 && act < 4.5) { lean = 0.12 * amt; bob = 0.02 * amt * sin(ph * 18.0); }
  if (act > 4.5 && act < 5.5) { lean = -0.08 * amt + 0.06 * amt * sin(ph * 9.0); bob = 0.015 * amt * abs(sin(ph * 9.0)); }
  if (act > 1.5 && act < 2.5) bob = 0.03 * amt * abs(sin(ph * 7.0));
  if (p == 3 || p == 2) { if (pos.y > 0.95) { pos = vec3(0.0, 1.05, 0.0) + rotY(turn) * (pos - vec3(0.0, 1.05, 0.0)); } }
  if (p != 1) { mat3 L = rotX(lean); pos = vec3(0.0, 0.5, 0.1) + L * (pos - vec3(0.0, 0.5, 0.1)); nrm = L * nrm; }
  pos.y += bob;
  vec4 wp = modelMatrix * instanceMatrix * vec4(pos, 1.0);
  vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * nrm);
  float hemi = vN.y * 0.4 + 0.6;
  vLight = (iLit.xyz * uHouse + vec3(0.02)) * hemi + iLit.w * uScreen * max(vN.z * -0.6 + 0.4, 0.15);
  vec4 mv = viewMatrix * wp; vDist = -mv.z; gl_Position = projectionMatrix * mv;
}`;
const CROWD_FRAG = COMMON_FRAG + `varying vec3 vAlb; varying vec3 vLight; varying float vDist; varying vec3 vN;
void main() { gl_FragColor = vec4(lumFog(lumTone(vAlb * vLight), vDist), 1.0);
  #include <colorspace_fragment>
}`;
const mk = (vert, frag, uniforms, extra = {}) => { const m = new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms, ...extra }); return m; };
// ---------------- glass (street front, doors): faint tint, fresnel edge, transparent ----------------
const GLASS_VERT = `varying vec3 vWN; varying vec3 vWP; varying float vDist; void main() { vWN = normalize(mat3(modelMatrix) * normal); vec4 wp = modelMatrix * vec4(position, 1.0); vWP = wp.xyz; vec4 mv = viewMatrix * wp; vDist = -mv.z; gl_Position = projectionMatrix * mv; }`;
const GLASS_FRAG = COMMON_FRAG + `uniform vec3 uTint; uniform float uAlpha; varying vec3 vWN; varying vec3 vWP; varying float vDist;
void main() { vec3 V = normalize(cameraPosition - vWP); float f = pow(1.0 - abs(dot(normalize(vWN), V)), 3.0); gl_FragColor = vec4(lumTone(uTint * (0.25 + 1.4 * f)), clamp(uAlpha + 0.45 * f, 0.0, 0.8));
  #include <colorspace_fragment>
}`;
// one set of per-room uniforms: house light level (1 = full), screen light colour, fixed lights multiplier, environment tint for sheen
export function roomUniforms() { return { uHouse: { value: 1 }, uScreen: { value: new THREE.Color(0, 0, 0) }, uFix: { value: 1 }, uEnv: { value: new THREE.Color(0.25, 0.22, 0.2) }, uGlow: { value: 1 }, uEnvMap: { value: null }, uEnvK: { value: 1 } }; }
export class Materials {
  constructor(opts = {}) { G.uNoise.value = noiseTexture(); this.all = []; this.renderer = opts.renderer || null; this.texSize = opts.texSize || 512; this.defines = {}; if (opts.normalMaps !== false) this.defines.USE_NMAP = ''; if (opts.reflections !== false) this.defines.USE_ENV = ''; this._lit = new WeakMap(); }
  // one library material per room (and one for its instanced props): every material id draws in the same call (texture arrays)
  // bake (lightmap.js): the room's solid mesh reads its light from Cycles light maps (house; halls add fixed and screen layers)
  litRoom(U, inst = false, bake = null) {
    let per = this._lit.get(U); if (!per) this._lit.set(U, per = {}); const key = bake ? 'l' : inst ? 'i' : 's'; if (per[key]) return per[key];
    const A = libArrays(this.renderer, this.texSize, 'USE_NMAP' in this.defines), defines = { ...this.defines }, lm = {};
    if (bake) { const [h, f, s] = bake.maps; defines.USE_LIGHTMAP = ''; if (bake.hall) defines.LM_HALL = '';
      Object.assign(lm, { uLmH: { value: h }, uLmF: { value: f || h }, uLmS: { value: s || h }, uLmK: { value: new THREE.Vector3(...bake.scale) } }); }
    const m = mk(LIT_VERT, LIT_FRAG, { ...G, ...U, ...lm, uMaps: { value: A.a }, uNmaps: { value: A.n || A.a }, uP: { value: PARAMS } }, { defines });
    m.name = 'lit-' + key; per[key] = m; return this._t(m);
  }
  litFor(U, geo, inst = false) { return this.litRoom(U, inst); }
  staticMat(U) { return this._t(mk(STATIC_VERT, STATIC_FRAG, { ...G, ...U })); }
  instMat(U) { return this._t(mk(INST_VERT, STATIC_FRAG, { ...G, ...U })); }
  glowMat(U) { return this._t(mk(GLOW_VERT, GLOW_FRAG, { ...G, uHouse: U.uHouse, uGlow: U.uGlow })); }
  texMat(map, U, light = [1, 1, 1], emit = 0, transparent = false) { const L = Array.isArray(light) ? new THREE.Color(...light) : light;
    return this._t(mk(TEX_VERT, TEX_FRAG, { ...G, map: { value: map }, uLight: { value: L }, uFixL: { value: new THREE.Color(0, 0, 0) }, uRep: { value: new THREE.Vector2(1, 1) }, uEmit: { value: emit }, uHouse: U ? U.uHouse : { value: 1 }, uOpacity: { value: 1 } }, { transparent, depthWrite: !transparent, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 })); }
  picMat(map) { return this._t(mk(TEX_VERT, PIC_FRAG, { ...G, uRep: { value: new THREE.Vector2(1, 1) }, map: { value: map }, uGain: { value: 1 }, uRaw: { value: 0 }, uBox: { value: new THREE.Vector4(0, 0, 1, 1) } })); }
  glassMat(tint = 0x8fa3b8, alpha = 0.08) { if (!this._glass) this._glass = this._t(mk(GLASS_VERT, GLASS_FRAG, { ...G, uTint: { value: new THREE.Color(tint) }, uAlpha: { value: alpha } }, { transparent: true, depthWrite: false, side: THREE.DoubleSide })); return this._glass; }
  peopleMat(face) { return this._t(mk(PEOPLE_VERT, PEOPLE_FRAG, { ...G, uFace: { value: face }, uEyes: { value: new THREE.Vector2(0, 3) }, uMouth: { value: new THREE.Vector2(0, 1) }, uAmb: { value: new THREE.Color(0.5, 0.5, 0.5) }, uKey: { value: new THREE.Color(0.6, 0.55, 0.5) }, uKeyDir: { value: new THREE.Vector3(0.3, 0.8, 0.4).normalize() }, uScreenL: { value: new THREE.Color(0, 0, 0) }, uPal: { value: Array.from({ length: 8 }, () => new THREE.Color(0.5, 0.5, 0.5)) } })); }
  propMat(PU) { return this._t(mk(PROP_VERT, PROP_FRAG, { ...G, uAmb: PU.uAmb, uKey: PU.uKey, uKeyDir: PU.uKeyDir, uScreenL: PU.uScreenL })); }
  ledWallMat() { if (!this._led) this._led = this._t(mk(LED_VERT, LED_FRAG, { uTime: G.uTime, uA: { value: new THREE.Color('#0b3cff') }, uB: { value: new THREE.Color('#7fd2ff') }, uGain: { value: 1.0 }, uVid: { value: null }, uVidOn: { value: 0 }, uRaw: { value: 0 }, uLen: { value: new THREE.Vector2(9, 3) } })); return this._led; }
  crowdMat(U) { return this._t(mk(CROWD_VERT, CROWD_FRAG, { ...G, uHouse: U.uHouse, uScreen: U.uScreen })); }
  _t(m) { this.all.push(m); return m; }
}
