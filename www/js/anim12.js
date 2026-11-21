// LUMIERE v12c - the lobby's life (the user, 2026-11-19: "makes them better 3d detailed and animations"; they picked popcorn popping,
// fountain water, bar and cafe life, marquee and menus). Everything moves in vertex shaders from per-particle seeds and one clock, so
// no buffer is uploaded after the first frame:
//   bulbs     the popcorn parlour's marquee: round bulbs in the canopy's sockets (rooms.py extras 'bulbs'), a three-phase chase
//   fountain  drops running down the eight jets (the curves statue12.py builds), splashes where they land, rings spreading on the water
//             (12 mm over it: 8 mm over the glint ring where the jets land)
//   popcorn   kernels popping out of each kettle (zones12.py popcorn_kettle), arcing over and settling on the heap, in batches
//   steam     wisps from the espresso machine's steam wand and spouts (zones12.py espresso_lever), now and then, as an order is made
//   boards    a soft sheen sweeping across the menu boards and the showtimes every few seconds
// The props stand where world9.js LIFE puts them; the particles live in each prop's Blender frame (+X its front, +Z up), placed by the
// same matrix the props are (assets.js: Blender X -> engine Z, Y -> X, Z -> Y, then the yaw). Parented to the lobby's group: drawn only
// when the lobby is. The Low preset keeps the bulbs and the boards (no particles).
import * as THREE from 'three';
import { LIFE } from './world9.js';

const BLENDER = new THREE.Matrix4().set(0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1);
const frame = (x, y, z, yaw) => new THREE.Matrix4().makeTranslation(x, y, z).multiply(new THREE.Matrix4().makeRotationY(yaw)).multiply(BLENDER);
const seeds = (n, f) => { const a = new Float32Array(n * 4); for (let i = 0; i < n; i++) { const s = f(i); a.set(s, i * 4); } return a; };
const rnd = (() => { let s = 1234567; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();

// one sprite per particle: a Points cloud whose positions the shader computes (position holds nothing; three.js needs the attribute)
function cloud(n, aSeed, vert, frag, U, opts = {}) {
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(aSeed, 4));
  const m = new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms: U, transparent: !!opts.add, depthWrite: !opts.add, blending: opts.add ? THREE.AdditiveBlending : THREE.NormalBlending });
  const p = new THREE.Points(g, m); p.frustumCulled = false; p.matrixAutoUpdate = false; if (opts.order) p.renderOrder = opts.order; return p;
}
const SIZE = 'gl_PointSize = SZ * uVH * projectionMatrix[1][1] * 0.5 / max(0.05, -mv.z);';
const SOFT_FRAG = `uniform vec3 uCol; varying float vA;
void main() { vec2 c = gl_PointCoord * 2.0 - 1.0; float r2 = dot(c, c); if (r2 > 1.0) discard; gl_FragColor = vec4(uCol * vA * exp(-3.5 * r2), 1.0);
  #include <colorspace_fragment>
}`;

// ---------------------------------------------------------------- popcorn (zones12.py popcorn_kettle: KC, RIM_Z, RIM_R, DECK, HEAP_*)
const KETTLE_VERT = `uniform float uTime; uniform float uVH; uniform float uPhase; attribute vec4 aSeed; varying float vA; varying float vShade;
void main() {
  float life = 2.6, t = mod(uTime + aSeed.x * life, life), th = aSeed.w * 6.2832; vec2 dir = vec2(cos(th), sin(th));
  vec3 p = vec3(vec2(0.0, -0.05) + dir * 0.105, 0.638) + vec3(dir * (0.12 + 0.3 * aSeed.y), 0.45 + 0.6 * aSeed.z) * t + vec3(0.0, 0.0, -4.9 * t * t);
  p.xy = clamp(p.xy, vec2(-0.205, -0.325), vec2(0.205, 0.325));
  vec2 d = (p.xy - vec2(0.03, 0.0)) / 0.34; p.z = max(p.z, 0.198 + 0.15 * pow(max(0.0, 1.0 - dot(d, d)), 0.8));
  float b = fract(uTime / 33.0 + uPhase), rate = smoothstep(0.0, 0.08, b) * (1.0 - smoothstep(0.62, 0.76, b));   // a batch pops for ~25 s, then the kettle rests
  vA = step(aSeed.y, rate) * (1.0 - smoothstep(life - 0.6, life, t)); vShade = 0.8 + 0.2 * aSeed.x;
  vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; float SZ = (0.026 + 0.012 * aSeed.z) * (1.0 + 0.6 * (1.0 - smoothstep(0.0, 0.1, t))) * smoothstep(0.0, 0.03, t) * step(0.01, vA); ${SIZE}   // a kernel bursts a little larger, then settles (read from 5 m: the guests' side)
}`;
const KETTLE_FRAG = `uniform vec3 uCol; varying float vA; varying float vShade;
void main() { vec2 c = gl_PointCoord * 2.0 - 1.0; float r2 = dot(c, c); if (r2 > 1.0 || vA < 0.01) discard;
  gl_FragColor = vec4(uCol * vShade * (0.72 - 0.28 * c.y) * (1.0 - 0.3 * r2), 1.0);   // lit from the heat lamp above, a darker hull under
  #include <colorspace_fragment>
}`;

// ---------------------------------------------------------------- fountain (statue12.py: jets from R_IN + 5 mm at 0.42 through (1.26, 0.86) to (1.16, 0.33); water 0.36)
const JET = `float k = floor(aSeed.y * 8.0); float an = 0.3927 + k * 0.7854; vec2 u = vec2(cos(an), sin(an));`;
const DROP_VERT = `uniform float uTime; uniform float uVH; attribute vec4 aSeed; varying float vA;
void main() { ${JET}
  float s = fract(uTime * 1.35 + aSeed.x), q = 1.0 - s;
  vec3 p = q * q * vec3(u * 1.405, 0.42) + 2.0 * q * s * vec3(u * 1.26, 0.86) + s * s * vec3(u * 1.16, 0.33);
  p += vec3(-u.y, u.x, 0.0) * (aSeed.z - 0.5) * 0.024 * s + vec3(0.0, 0.0, (aSeed.w - 0.5) * 0.016 * s);
  vA = smoothstep(0.0, 0.06, s) * (1.0 - smoothstep(0.9, 1.0, s)) * (0.55 + 0.45 * aSeed.w);
  vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; float SZ = 0.016 + 0.01 * aSeed.w; ${SIZE}
}`;
const SPLASH_VERT = `uniform float uTime; uniform float uVH; attribute vec4 aSeed; varying float vA;
void main() { ${JET}
  float life = 0.42, t = mod(uTime + aSeed.x * 3.0, life), th = aSeed.z * 6.2832; vec2 h = vec2(cos(th), sin(th)) * (0.12 + 0.3 * aSeed.w);
  vec3 p = vec3(u * 1.16, 0.362) + vec3(h * t, (0.6 + 0.7 * aSeed.w) * t - 4.9 * t * t); p.z = max(p.z, 0.364);
  vA = (1.0 - t / life) * 0.8; vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; float SZ = 0.011 + 0.007 * aSeed.w; ${SIZE}
}`;
const RIPPLE_VERT = `attribute float aPh; varying vec2 vUv; varying float vPh; void main() { vUv = uv; vPh = aPh; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const RIPPLE_FRAG = `uniform float uTime; uniform vec3 uCol; varying vec2 vUv; varying float vPh;
void main() { float d = length(vUv * 2.0 - 1.0), a = 0.0;
  for (int i = 0; i < 3; i++) { float r = fract(uTime * 0.8 + vPh + float(i) / 3.0), e = (d - r) / 0.045; a += exp(-e * e) * (1.0 - r) * (1.0 - r); }   // e * e: pow() of a negative base is undefined in GLSL
  gl_FragColor = vec4(uCol * a * 0.42 * (1.0 - smoothstep(0.75, 1.0, d)), 1.0);
  #include <colorspace_fragment>
}`;

// ---------------------------------------------------------------- steam (zones12.py espresso_lever: WAND_TIP, SPOUTS)
const STEAM_VERT = `uniform float uTime; uniform float uVH; uniform float uSteamOff; attribute vec4 aSeed; varying float vA;
void main() {
  float life = 2.4, t = mod(uTime + aSeed.x * life, life), wand = step(aSeed.y, 0.6);
  vec3 src = wand > 0.5 ? vec3(0.30, 0.40, 0.10) : (aSeed.y < 0.8 ? vec3(0.235, -0.19, 0.15) : vec3(0.235, 0.19, 0.15));
  vec3 p = src + vec3(sin(t * 2.1 + aSeed.z * 6.3) * 0.035 * t, cos(t * 1.6 + aSeed.w * 6.3) * 0.035 * t, 0.16 * t + 0.04 * t * t);
  float tw = (uTime + uSteamOff) / 21.0, ts = (uTime + uSteamOff) / 15.0;   // LobbyLife.steam() starts both cycles now (an order at the bar)
  float g = wand > 0.5 ? step(fract(tw), 0.28) : step(fract(ts), 0.22);   // the wand steams milk now and then; the spouts while a shot pulls
  float e = wand > 0.5 ? fract(tw) / 0.28 : fract(ts) / 0.22;
  vA = g * smoothstep(0.0, 0.25, t) * (1.0 - t / life) * smoothstep(0.0, 0.1, e) * (1.0 - smoothstep(0.85, 1.0, e)) * (wand > 0.5 ? 0.16 : 0.09);
  vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; float SZ = (0.03 + 0.13 * t) * step(0.001, vA); ${SIZE}
}`;

// ---------------------------------------------------------------- the marquee's bulbs
const BULB_VERT = `uniform float uTime; attribute float aI; varying float vOn; varying vec3 vN; varying vec3 vV;
void main() { float ph = fract((aI - uTime * 4.0) / 3.0); vOn = 0.16 + 0.84 * smoothstep(0.0, 0.06, ph) * (1.0 - smoothstep(0.6, 0.66, ph));
  vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal); vV = normalize(cameraPosition - w.xyz);
  gl_Position = projectionMatrix * viewMatrix * w; }`;
const BULB_FRAG = `varying float vOn; varying vec3 vN; varying vec3 vV;
void main() { float f = pow(max(dot(normalize(vN), normalize(vV)), 0.0), 1.5);
  vec3 c = mix(vec3(0.55, 0.28, 0.1), vec3(1.0, 0.86, 0.6), f) * (0.25 + 1.1 * vOn); gl_FragColor = vec4(min(c, vec3(1.0)), 1.0);
  #include <colorspace_fragment>
}`;
const HALO_VERT = `uniform float uTime; uniform float uVH; attribute vec4 aSeed; varying float vA;
void main() { float ph = fract((aSeed.x - uTime * 4.0) / 3.0); vA = smoothstep(0.0, 0.06, ph) * (1.0 - smoothstep(0.6, 0.66, ph)) * 0.55;
  vec4 mv = modelViewMatrix * vec4(position, 1.0); mv.xyz += normalize(-mv.xyz) * 0.06;   // drawn just in front of its bulb: the canopy's face never cuts it
  gl_Position = projectionMatrix * mv; float SZ = 0.13 * step(0.01, vA); ${SIZE} }`;

// ---------------------------------------------------------------- the boards' sheen
const SHEEN_VERT = `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const SHEEN_FRAG = `uniform float uTime; uniform float uSeed; uniform vec3 uCol; varying vec2 vUv;
void main() { float cyc = 11.0, t = mod(uTime + uSeed * cyc, cyc) / 1.8, x = vUv.x + (vUv.y - 0.5) * 0.4;
  float e = (x - (t * 1.7 - 0.35)) / 0.07, a = exp(-e * e) * step(t, 1.0); gl_FragColor = vec4(uCol * a * 0.2, 1.0);
  #include <colorspace_fragment>
}`;

const add = (vert, frag, U) => new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });

export class LobbyLife {
  constructor(world, engine) {
    this.engine = engine; this.on = false; const room = world.rooms && world.rooms.lobby; if (!room || !room.group) return;
    const full = !engine.preset || (engine.preset.detail ?? 1) > 0; this.U = { uTime: { value: 0 }, uVH: { value: 720 } }; const U = this.U, G = room.group;
    const put = (obj, m) => { obj.matrix.copy(m); obj.matrixAutoUpdate = false; G.add(obj); return obj; };
    // the bulbs (and their halos on Medium and High)
    const B = (room.x && room.x.bulbs) || [];
    if (B.length) {
      const geo = new THREE.IcosahedronGeometry(0.026, 1), idx = new Float32Array(B.length), M = new THREE.Matrix4(), rows = {};
      for (let i = 0; i < B.length; i++) { const key = B[i][1].toFixed(2); rows[key] = (rows[key] ?? -1) + 1; idx[i] = rows[key]; }
      geo.setAttribute('aI', new THREE.InstancedBufferAttribute(idx, 1));
      const mesh = new THREE.InstancedMesh(geo, new THREE.ShaderMaterial({ vertexShader: BULB_VERT, fragmentShader: BULB_FRAG, uniforms: U }), B.length);
      B.forEach((b, i) => mesh.setMatrixAt(i, M.makeTranslation(b[0], b[1], b[2]))); mesh.frustumCulled = false; mesh.name = 'lobby-bulbs'; G.add(mesh);
      if (full) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(Float32Array.from(B.flat()), 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(seeds(B.length, (i) => [idx[i], 0, 0, 0]), 4));
        const h = new THREE.Points(g, add(HALO_VERT, SOFT_FRAG, { ...U, uCol: { value: new THREE.Color(1.0, 0.62, 0.3) } })); h.frustumCulled = false; h.renderOrder = 4; G.add(h); }
    }
    // the boards' sheen: a quad 6 mm in front of each board, the same size
    for (const [id, seed] of [['menu', 0.0], ['cafemenu', 0.37], ['showtimes', 0.71]]) {
      const p = world.panels && world.panels[id]; if (!p || !p.mesh) continue;
      const q = new THREE.Mesh(new THREE.PlaneGeometry(p.w, p.h), add(SHEEN_VERT, SHEEN_FRAG, { ...U, uSeed: { value: seed }, uCol: { value: new THREE.Color(1.0, 0.86, 0.66) } }));
      q.position.copy(p.mesh.position).add(new THREE.Vector3(Math.sin(p.yaw), 0, Math.cos(p.yaw)).multiplyScalar(0.006)); q.rotation.y = p.yaw; q.renderOrder = 4; q.name = 'sheen-' + id; G.add(q);
    }
    if (!full) { this.on = true; return; }
    // the fountain: drops down the jets (8 x 18), splashes (8 x 7), rings on the water (8 quads, 12 mm over it)
    const F = LIFE.fountain, fm = frame(F[0], F[1], F[2], F[3]);
    put(cloud(144, seeds(144, (i) => [rnd(), (Math.floor(i / 18) + 0.5) / 8, rnd(), rnd()]), DROP_VERT, SOFT_FRAG, { ...U, uCol: { value: new THREE.Color(0.75, 0.88, 1.0) } }, { add: true, order: 4 }), fm).name = 'fountain-drops';
    put(cloud(56, seeds(56, (i) => [rnd(), (Math.floor(i / 7) + 0.5) / 8, rnd(), rnd()]), SPLASH_VERT, SOFT_FRAG, { ...U, uCol: { value: new THREE.Color(0.8, 0.9, 1.0) } }, { add: true, order: 4 }), fm).name = 'fountain-splash';
    { const pos = [], uv = [], ph = [], ix = [];
      for (let k = 0; k < 8; k++) { const a = 0.3927 + k * 0.7854, cx = Math.cos(a) * 1.16, cy = Math.sin(a) * 1.16, r = 0.36, b = pos.length / 3;
        for (const [dx, dy, u, v] of [[-r, -r, 0, 0], [r, -r, 1, 0], [r, r, 1, 1], [-r, r, 0, 1]]) { pos.push(cx + dx, cy + dy, 0.372); uv.push(u, v); ph.push(k * 0.37); }
        ix.push(b, b + 1, b + 2, b, b + 2, b + 3); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('aPh', new THREE.Float32BufferAttribute(ph, 1)); g.setIndex(ix);
      const m = new THREE.Mesh(g, add(RIPPLE_VERT, RIPPLE_FRAG, { ...U, uCol: { value: new THREE.Color(0.7, 0.85, 1.0) } })); m.frustumCulled = false; m.renderOrder = 4; m.name = 'fountain-rings'; put(m, fm); }
    // popcorn: 64 kernels a kettle, the kettles out of step
    LIFE.kettles.forEach((k, i) => put(cloud(64, seeds(64, () => [rnd(), rnd(), rnd(), rnd()]), KETTLE_VERT, KETTLE_FRAG, { ...U, uPhase: { value: i * 0.43 }, uCol: { value: new THREE.Color(0.98, 0.86, 0.58) } }), frame(...k)).name = 'popcorn-' + i);
    // steam at the bar
    this.uSteamOff = { value: 0 };
    if (LIFE.espresso) put(cloud(40, seeds(40, () => [rnd(), rnd(), rnd(), rnd()]), STEAM_VERT, SOFT_FRAG, { ...U, uSteamOff: this.uSteamOff, uCol: { value: new THREE.Color(1.0, 0.95, 0.88) } }, { add: true, order: 4 }), frame(...LIFE.espresso)).name = 'espresso-steam';
    this.on = true;
  }
  // an order at the bar: the steam wand's and the spouts' cycles start now (main.js, when the barista makes a hot drink)
  steam(now) { if (!this.uSteamOff) return; const t = (now / 1000) % 3600; this.uSteamOff.value = 105 * Math.ceil(t / 105) - t + 0.4; }   // 105 s: both cycles (21 s, 15 s) at their start
  // where the steam wand's cycle is (0..1; it steams while under 0.28): the barista works the machine then (main.js)
  wandPhase(now) { const t = (now / 1000) % 3600 + (this.uSteamOff ? this.uSteamOff.value : 0); return ((t / 21) % 1 + 1) % 1; }
  // how hard the poppers are popping now (0..1, the busier of the two): the popcorn sound follows it (sound9.js)
  popRate(now) { const t = (now / 1000) % 3600; let r = 0; LIFE.kettles.forEach((k, i) => { const b = ((t / 33 + i * 0.43) % 1 + 1) % 1, s = (e0, e1, x) => { const u = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return u * u * (3 - 2 * u); };
    r = Math.max(r, s(0, 0.08, b) * (1 - s(0.62, 0.76, b))); }); return this.on ? r : 1; }
  update(now) {
    if (!this.on) return; this.U.uTime.value = (now / 1000) % 3600;
    const r = this.engine.renderer; if (r) { r.getDrawingBufferSize(this._v || (this._v = new THREE.Vector2())); this.U.uVH.value = this._v.y; }
  }
}
