// LUMIERE v5.20 - night rain on the street (an approved idea, docs/PHONE-FEEDBACK.md): thin streaks falling through the street in front
// of the glass front, one instanced draw. Drops sit at world-fixed spots (wrapped into a window that follows the camera along the street),
// so they never slide sideways with you. The rain mesh lives in the street room's group: portal culling hides it whenever the street
// cannot be seen. The wet look of the ground is the street room's uWet (materials.js): darker, glossier paving with puddles.
import * as THREE from 'three';
const VERT = `
attribute vec2 corner; attribute vec4 seed;
uniform float uTime; uniform vec3 uBoxMin; uniform vec3 uBoxSize; uniform float uLen; uniform float uWidth; uniform float uSpeed;
varying float vA; varying float vDist;
void main() {
  vec3 p = uBoxMin + seed.xyz * uBoxSize;
  p.x = uBoxMin.x + mod(seed.x * 211.0 - uBoxMin.x, uBoxSize.x);
  p.y = uBoxMin.y + mod(seed.y * uBoxSize.y - uTime * uSpeed * (0.85 + 0.3 * seed.w), uBoxSize.y);
  float dry = step(p.z, 22.3) * step(abs(p.x), 3.3) * step(p.y, 3.1);
  vec3 toCam = cameraPosition - p; vec3 side = normalize(vec3(-toCam.z, 0.0, toCam.x) + vec3(1e-4, 0.0, 0.0));
  vec3 dir = normalize(vec3(0.07, -1.0, 0.035));
  vec3 wp = p + side * corner.x * uWidth - dir * (corner.y * uLen) * (1.0 - dry);
  vA = corner.y * (1.0 - dry);
  vec4 mv = viewMatrix * vec4(wp, 1.0); vDist = -mv.z; gl_Position = projectionMatrix * mv;
}`;
const FRAG = `
uniform vec3 uColor; uniform float uAlpha; varying float vA; varying float vDist;
void main() { float a = uAlpha * vA * smoothstep(0.8, 3.0, vDist) * (1.0 - smoothstep(24.0, 38.0, vDist)); if (a < 0.003) discard; gl_FragColor = vec4(uColor * a, a); }`;
export function makeRain(street, opts = {}) {
  const N = opts.count || 4000, geo = new THREE.InstancedBufferGeometry(), seeds = new Float32Array(N * 4);
  geo.setAttribute('corner', new THREE.Float32BufferAttribute([-0.5, 0, 0.5, 0, 0.5, 1, -0.5, 1], 2)); geo.setIndex([0, 1, 2, 0, 2, 3]);
  geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(12), 3));   // unused; three requires it
  let s = 4242; const R = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < N * 4; i++) seeds[i] = R();
  geo.setAttribute('seed', new THREE.InstancedBufferAttribute(seeds, 4)); geo.instanceCount = N;
  const U = { uTime: { value: 0 }, uBoxMin: { value: new THREE.Vector3(-14, -0.2, 20.4) }, uBoxSize: { value: new THREE.Vector3(28, 12, 16.6) }, uLen: { value: 0.5 }, uWidth: { value: 0.016 },
    uSpeed: { value: 8.5 }, uColor: { value: new THREE.Color(0.62, 0.7, 0.82) }, uAlpha: { value: 0.32 } };
  const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: U, transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor });
  const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; mesh.renderOrder = -1; mesh.name = 'rain'; street.group.add(mesh);
  // the window follows the camera along the street (x) and covers the street's depth (z)
  return { mesh, update(t, cam) { U.uTime.value = t; U.uBoxMin.value.x = Math.max(-40, Math.min(12, cam.position.x - 14)); } };
}
