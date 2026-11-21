// LUMIERE v12b - the way, drawn in the world (the user, 2026-11-19: "good waypoints like that line guide thing and the light thing which
// also disappears when you sit on it and make sure it does not appear through walls"). Two things, both fed by wayfind.js:
//   line    a ribbon of moving chevrons on the floor from your feet along the walkers' route, following the floor's height (stairs, the
//           rake), up to the farthest route point you can actually see (wayfind.js already finds it with world9.js Walls.sees), so it
//           never runs on behind a wall; it fades out near you and at its end
//   pillar  a soft column of light with a turning ring at the goal (the box office, the gate, the hall door, your seat), parented to the
//           goal's room so it is only drawn when that room is (rooms behind shut doors are not drawn: a light in the scene's root used to
//           shine through them), shown only while the goal is in sight, gone when you reach it or sit down
// Both are additive, depth-tested and never write depth, so walls, people and seats in front of them hide them.
import * as THREE from 'three';

const LINE_VERT = `attribute float aS; varying float vS; varying float vV; void main() { vS = aS; vV = uv.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const LINE_FRAG = `uniform float uTime; uniform vec3 uCol; uniform float uLen; uniform float uA; varying float vS; varying float vV;
void main() {
  float across = 1.0 - abs(vV * 2.0 - 1.0);
  float c = fract((vS - uTime * 1.4) / 0.9 + abs(vV - 0.5) * 0.7);
  float chev = smoothstep(0.0, 0.1, c) * (1.0 - smoothstep(0.42, 0.56, c));
  float a = uA * (0.28 + 0.72 * chev) * smoothstep(0.0, 0.45, across) * (1.0 - smoothstep(uLen - 2.5, uLen, vS)) * smoothstep(0.4, 1.6, vS);
  gl_FragColor = vec4(uCol * a, 1.0);
  #include <colorspace_fragment>
}`;
const PILLAR_VERT = `varying float vY; varying vec3 vN; varying vec3 vV; void main() { vY = uv.y; vec4 w = modelMatrix * vec4(position, 1.0); vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }`;
const PILLAR_FRAG = `uniform float uTime; uniform vec3 uCol; uniform float uA; varying float vY; varying vec3 vN; varying vec3 vV;
void main() {
  float rim = 1.0 - abs(dot(normalize(vN), normalize(vV)));
  float a = uA * pow(1.0 - vY, 1.6) * (0.35 + 0.65 * rim) * (0.85 + 0.15 * sin(uTime * 3.0 - vY * 6.0));
  gl_FragColor = vec4(uCol * a, 1.0);
  #include <colorspace_fragment>
}`;
const RING_FRAG = `uniform float uTime; uniform vec3 uCol; uniform float uA; varying vec2 vUv;
void main() {
  vec2 p = vUv * 2.0 - 1.0; float r = length(p), ang = atan(p.y, p.x);
  float band = smoothstep(0.62, 0.7, r) * (1.0 - smoothstep(0.9, 0.98, r));
  float dash = step(0.5, fract(ang * 2.0 / 3.14159 + uTime * 0.35));
  gl_FragColor = vec4(uCol * uA * band * (0.45 + 0.55 * dash), 1.0);
  #include <colorspace_fragment>
}`;
const RING_VERT = `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const add = (vert, frag, U) => new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });

export class Guide {
  constructor(scene, world, col = 0xffcf8a) {
    this.world = world; this.scene = scene; const c = new THREE.Color(col); this.time = { value: 0 };
    this.lineMat = add(LINE_VERT, LINE_FRAG, { uTime: this.time, uCol: { value: c }, uLen: { value: 1 }, uA: { value: 0 } });
    // one buffer of a fixed size, refilled in place (a new attribute each refresh left its GL buffer behind: five a second)
    const N = 400, g = new THREE.BufferGeometry(), idx = new Uint16Array((N / 2 - 1) * 6); for (let i = 0; i < N / 2 - 1; i++) { const k = i * 2; idx.set([k, k + 2, k + 1, k + 1, k + 2, k + 3], i * 6); }
    for (const [n, k] of [['position', 3], ['uv', 2], ['aS', 1]]) g.setAttribute(n, new THREE.BufferAttribute(new Float32Array(N * k), k).setUsage(THREE.DynamicDrawUsage));
    g.setIndex(new THREE.BufferAttribute(idx, 1)); g.setDrawRange(0, 0); this.cap = N;
    this.line = new THREE.Mesh(g, this.lineMat); this.line.frustumCulled = false; this.line.renderOrder = 8; this.line.visible = false; scene.add(this.line);
    this.pillarMat = add(PILLAR_VERT, PILLAR_FRAG, { uTime: this.time, uCol: { value: c }, uA: { value: 0 } }); this.pillarMat.side = THREE.DoubleSide;
    const pg = new THREE.CylinderGeometry(0.3, 0.36, 2.6, 24, 1, true); pg.translate(0, 1.3, 0);
    this.pillar = new THREE.Group(); this.pillar.add(new THREE.Mesh(pg, this.pillarMat));
    this.ringMat = add(RING_VERT, RING_FRAG, { uTime: this.time, uCol: { value: c }, uA: { value: 0 } });
    const ring = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), this.ringMat); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.025; this.pillar.add(ring);
    this.pillar.traverse((o) => { o.renderOrder = 8; o.frustumCulled = false; }); this.pillar.visible = false; this.goal = null; this.a = 0;
  }
  hide() { this.want = 0; }
  // route: [{x, y, z}], ai: the farthest point in sight (wayfind.js), p: the player; seat: the goal is a seat (the pillar sits on it)
  set(route, ai, p) {
    if (!route || !route.length) { this.want = 0; return; }
    const pts = [{ x: p.x, y: p.y, z: p.z }, ...route.slice(0, ai + 1)], W = this.world, g = this.line.geometry, P = g.attributes.position.array, UV = g.attributes.uv.array, S = g.attributes.aS.array, wd = 0.11;
    let s = 0, prev = null, y = p.y, n = 0;
    for (let i = 0; i + 1 < pts.length && s < 26 && n < this.cap / 2; i++) {   // samples every 30 cm along the visible route, on the floor
      const a = pts[i], b = pts[i + 1], L = Math.hypot(b.x - a.x, b.z - a.z);
      const L_ = L, m = Math.max(1, Math.ceil(L_ / 0.3));
      for (let k = i ? 1 : 0; k <= m && n < this.cap / 2; k++) {
        const t = k / m, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t; y = W.floorY ? W.floorY(x, z, Math.max(y, a.y + (b.y - a.y) * t)) : a.y + (b.y - a.y) * t;
        if (prev) s += Math.hypot(x - prev.x, z - prev.z); const dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || 1, nx = -dz / l * wd, nz = dx / l * wd;
        P.set([x - nx, y + 0.035, z - nz, x + nx, y + 0.035, z + nz], n * 6); UV.set([0, 0, 0, 1], n * 4); S[n * 2] = S[n * 2 + 1] = s; prev = { x, z }; n++;
      }
    }
    for (const k of ['position', 'uv', 'aS']) g.attributes[k].needsUpdate = true;
    g.setDrawRange(0, Math.max(0, n - 1) * 6);
    this.lineMat.uniforms.uLen.value = Math.max(1, s);
    // the pillar: on the goal, only while the goal itself is in sight (the last route point is the farthest one you can see)
    const last = route[route.length - 1], seeGoal = ai === route.length - 1, near = Math.hypot(last.x - p.x, last.z - p.z) < 1.1 && Math.abs(last.y - p.y) < 1.2;
    this.want = near ? 0 : 1; this.pillarWant = seeGoal && !near ? 1 : 0;
    const room = W.roomAt ? W.roomAt(last.x, last.y + 0.5, last.z) : null, grp = room && W.rooms[room] ? W.rooms[room].group : this.scene;
    if (this.pillar.parent !== grp) { if (this.pillar.parent) this.pillar.parent.remove(this.pillar); grp.add(this.pillar); }
    this.pillar.position.set(last.x, last.y, last.z);
  }
  tick(dt, now) {
    this.time.value = now / 1000; const k = 1 - Math.exp(-dt * 5);
    this.a += ((this.want || 0) - this.a) * k; this.pa = (this.pa || 0) + (((this.want || 0) * (this.pillarWant || 0)) - (this.pa || 0)) * k;
    this.lineMat.uniforms.uA.value = 0.85 * this.a; this.line.visible = this.a > 0.01;
    this.pillarMat.uniforms.uA.value = 0.32 * this.pa; this.ringMat.uniforms.uA.value = 0.9 * this.pa; this.pillar.visible = this.pa > 0.01;
  }
}
