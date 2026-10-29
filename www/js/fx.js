// Visual effects: glow halos (additive point sprites, one draw call per room), full-screen fades, projector beam + dust.
import * as THREE from 'three';
import { makeCanvas } from './textures.js';
let haloTex = null;
export function halo() { if (haloTex) return haloTex; const c = makeCanvas(64, 64), g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); haloTex = new THREE.CanvasTexture(c); haloTex.colorSpace = THREE.SRGBColorSpace; return haloTex; }
// pts: [[x,y,z,size(m),r,g,b], ...]
export function glowPoints(pts, engine) {
  const n = pts.length, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), size = new Float32Array(n);
  pts.forEach((p, i) => { pos.set([p[0], p[1], p[2]], i * 3); col.set([p[4], p[5], p[6]], i * 3); size[i] = p[3]; });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('size', new THREE.BufferAttribute(size, 1));
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { map: { value: halo() }, k: { value: 1 }, scale: { value: 520 } },
    vertexShader: 'attribute float size; attribute vec3 color; varying vec3 vC; uniform float scale; void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = clamp(size * scale / max(-mv.z, 0.3), 2.0, 96.0); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform sampler2D map; uniform float k; varying vec3 vC; void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vC * t.rgb * k * 0.9, t.a); }' });
  const p = new THREE.Points(g, m); p.frustumCulled = false; p.userData.mat = m; if (engine) engine.addGlowMaterial = engine.addGlowMaterial; return p;
}
export class Fade {
  constructor(el) { this.el = el; this.t = 0; this.cb = null; }
  to(dur = 0.35, cb = null, hold = 0.05) { this.el.style.transition = `opacity ${dur}s ease`; this.el.style.opacity = '1'; clearTimeout(this._h); this._h = setTimeout(() => { cb && cb(); setTimeout(() => { this.el.style.opacity = '0'; }, hold * 1000); }, dur * 1000); }
  set(v, dur = 0.6) { this.el.style.transition = `opacity ${dur}s ease`; this.el.style.opacity = String(v); }
}
// additive cone of light from the projection booth to the screen + drifting dust motes
export function projectorBeam(from, to, w, h) {
  const g = new THREE.Group(), L = from.distanceTo(to), geo = new THREE.CylinderGeometry(Math.max(w, h) * 0.5, 0.12, L, 4, 1, true); geo.rotateX(Math.PI / 2); geo.rotateZ(Math.PI / 4); geo.scale(w / Math.max(w, h) * 1.0, h / Math.max(w, h), 1);
  const cols = new Float32Array(geo.attributes.position.count * 4); for (let i = 0; i < geo.attributes.position.count; i++) { const z = geo.attributes.position.getZ(i); const t = (z + L / 2) / L; cols.set([1, 0.95, 0.85, 0.012 + 0.045 * (1 - t) * (1 - t)], i * 4); }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 4)); geo.translate(0, 0, L / 2);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false }));
  m.position.copy(from); m.lookAt(to); g.add(m);
  const N = 70, pos = new Float32Array(N * 3), seed = []; for (let i = 0; i < N; i++) { const t = Math.random(), r = (1 - t) * 0.5 + 0.02; seed.push([t, (Math.random() - 0.5) * 2 * r * w * 0.5, (Math.random() - 0.5) * 2 * r * h * 0.5, Math.random() * 6.28]); }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.03, color: 0xfff0d0, transparent: true, opacity: 0.28, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true })); pts.frustumCulled = false; g.add(pts);
  const dir = new THREE.Vector3().subVectors(to, from), up = new THREE.Vector3(0, 1, 0), side = new THREE.Vector3().crossVectors(dir, up).normalize();
  g.userData.update = (t) => { for (let i = 0; i < N; i++) { const s = seed[i]; const k = (s[0] + t * 0.012 * (1 + (i % 3))) % 1; const p = from.clone().addScaledVector(dir, k).addScaledVector(side, s[1] * k * 2).addScaledVector(up, s[2] * k * 2 + Math.sin(t * 0.4 + s[3]) * 0.08); pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z; } pg.attributes.position.needsUpdate = true; };
  g.visible = false; return g;
}
