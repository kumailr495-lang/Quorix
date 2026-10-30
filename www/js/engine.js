// LUMIERE v5 - renderer, camera, graphics presets and the resolution governor.
// stencil:true makes the browser allocate a packed 24-bit depth + 8-bit stencil buffer: phones often give only 16-bit depth without it (z-fighting).
import * as THREE from 'three';
import { G } from './materials.js';
export const PRESETS = {
  low: { scale: 0.75, people: 6, crowd: 70, peopleFar: 9, detail: 0, seatLod: 5, aa: false },
  medium: { scale: 1.0, people: 10, crowd: 140, peopleFar: 12, detail: 1, seatLod: 7, aa: true },
  high: { scale: 1.3, people: 16, crowd: 220, peopleFar: 16, detail: 1, seatLod: 9, aa: true },
};
const LEVELS = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.15, 1.3, 1.5, 1.75, 2.0];
export class Engine {
  constructor(canvas, settings) {
    this.canvas = canvas; this.settings = settings; const P = PRESETS[settings.graphics] || PRESETS.medium; this.preset = P;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: P.aa, stencil: true, depth: true, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: false });   // alpha: the film's video layer shows through the screen (videolayer.js)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace; this.renderer.setClearColor(0x0b0b0e, 1); this.renderer.sortObjects = true;
    const gl = this.renderer.getContext(); try { this.depthBits = gl.getParameter(gl.DEPTH_BITS); } catch (e) { this.depthBits = 0; }
    this.scene = new THREE.Scene(); this.scene.matrixWorldAutoUpdate = true;
    // held items (popcorn, drink, the tablet) are drawn in a second pass over a cleared depth buffer, so they never sink into a wall or a seat
    // (phone feedback: "items I hold go through walls when I go close")
    this.vm = new THREE.Scene(); this.vmCam = new THREE.PerspectiveCamera(60, 1, 0.02, 5);
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 160); this.camera.rotation.order = 'YXZ'; this.scene.add(this.camera);
    this.dpr = Math.min(window.devicePixelRatio || 1, 2); this.maxScale = Math.min(P.scale, this.dpr); this.minScale = Math.max(0.5, this.maxScale * 0.6); this.scale = this.maxScale;
    const fs = +new URLSearchParams(location.search).get('fixscale'); this.fixed = fs > 0; if (this.fixed) this.scale = this.maxScale = this.minScale = fs;
    this.ema = 16.7; this._tAdj = 0; this._calm = 0; this.stats = { scale: this.scale, ms: 16.7, cpu: 0, fps: 60 };
    this.resize(); addEventListener('resize', () => this.resize()); addEventListener('orientationchange', () => setTimeout(() => this.resize(), 250));
  }
  applySettings(s) {
    this.settings = s; const P = PRESETS[s.graphics] || PRESETS.medium; this.preset = P; this.maxScale = Math.min(P.scale, this.dpr); this.minScale = Math.max(0.5, this.maxScale * 0.6);
    if (!this.fixed) this.scale = this.maxScale; this.auto = s.autoRes !== false; G.uDetail.value = P.detail; G.uBright.value = s.brightness ?? 1;
    // v8 switches: LOD distances, render distance, reflection strength (Off also drops the reflection lookup: Materials.setReflections)
    this.lodK = { aggressive: 0.65, normal: 1, far: 1.45 }[s.lod] || 1; this.viewFar = { near: 70, medium: 120, far: 170 }[s.viewDist] || 120; this.camera.far = this.viewFar;
    G.uReflK.value = { off: 0, soft: 0.45, full: 1 }[s.reflections] ?? 0.45; this.resize();
  }
  resize() {
    const w = innerWidth, h = innerHeight; this.renderer.setPixelRatio(this.scale); this.renderer.setSize(w, h, false);
    const a = w / h; this.camera.aspect = a; this.baseFov = a >= 1 ? 62 : 80; this.camera.fov = this.baseFov * (this.zoom || 1); this.camera.updateProjectionMatrix(); this.stats.scale = this.scale;
    this.vmCam.aspect = a; this.vmCam.fov = this.baseFov; this.vmCam.updateProjectionMatrix();
  }
  // measures real frame time and moves the resolution in fixed steps. Every change reallocates the canvas (a visible hitch on Android),
  // so it changes at most once per 6 s, steps down only after 2 s of slow frames and up only after 12 s of fast ones (v5.10 hopped
  // between 0.90x, 1.05x and 1.13x on the phone)
  governor(dt, now) {
    this.ema = this.ema * 0.94 + Math.min(dt, 0.2) * 1000 * 0.06; this.stats.ms = this.ema; this.stats.fps = 1000 / this.ema; if (this.fixed || this.auto === false) return;
    const lv = LEVELS.filter((l) => l >= this.minScale - 1e-6 && l <= this.maxScale + 1e-6), i = lv.reduce((b, l, k) => (Math.abs(l - this.scale) < Math.abs(lv[b] - this.scale) ? k : b), 0);
    this._slow = this.ema > 36 ? (this._slow || now) : 0; this._fast = this.ema < 21 ? (this._fast || now) : 0;
    if (now - this._tAdj < 6000) return;
    if (this._slow && now - this._slow > 2000 && i > 0) { this.scale = lv[i - 1]; this._tAdj = now; this._slow = 0; this.resize(); }
    else if (this._fast && now - this._fast > 12000 && i < lv.length - 1) { this.scale = lv[i + 1]; this._tAdj = now; this._fast = 0; this.resize(); }
  }
  // seated in a hall the view narrows a little (like your attention does), so the screen fills the picture the way it does in a real cinema
  setZoom(z, dt) { const k = this.zoom || 1, n = k + (z - k) * (1 - Math.exp(-dt * 2.5)); if (Math.abs(n - k) < 1e-4) return; this.zoom = n; this.camera.fov = this.baseFov * n; this.camera.updateProjectionMatrix(); }
  render() {
    const r = this.renderer; r.info.autoReset = false; r.info.reset(); r.render(this.scene, this.camera);   // one info count for both passes (the HUD's draw calls)
    if (this.vm.children.length) { r.autoClear = false; r.clearDepth(); r.render(this.vm, this.vmCam); r.autoClear = true; }
  }
}
