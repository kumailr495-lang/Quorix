// LUMIERE v5 - renderer, camera, graphics presets and the resolution governor.
// stencil:true makes the browser allocate a packed 24-bit depth + 8-bit stencil buffer: phones often give only 16-bit depth without it (z-fighting).
import * as THREE from 'three';
import { G } from './materials.js';
export const PRESETS = {
  low: { scale: 0.75, people: 6, crowd: 70, peopleFar: 9, detail: 0, seatLod: 5, aa: false },
  medium: { scale: 1.0, people: 10, crowd: 140, peopleFar: 12, detail: 1, seatLod: 7, aa: false },
  high: { scale: 1.5, people: 16, crowd: 220, peopleFar: 16, detail: 1, seatLod: 9, aa: true },
};
export class Engine {
  constructor(canvas, settings) {
    this.canvas = canvas; this.settings = settings; const P = PRESETS[settings.graphics] || PRESETS.medium; this.preset = P;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: P.aa, stencil: true, depth: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace; this.renderer.setClearColor(0x0b0b0e, 1); this.renderer.sortObjects = true;
    const gl = this.renderer.getContext(); try { this.depthBits = gl.getParameter(gl.DEPTH_BITS); } catch (e) { this.depthBits = 0; }
    this.scene = new THREE.Scene(); this.scene.matrixWorldAutoUpdate = true;
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 160); this.camera.rotation.order = 'YXZ'; this.scene.add(this.camera);
    this.dpr = Math.min(window.devicePixelRatio || 1, 2); this.maxScale = Math.min(P.scale, this.dpr); this.minScale = Math.max(0.5, this.maxScale * 0.6); this.scale = this.maxScale;
    const fs = +new URLSearchParams(location.search).get('fixscale'); this.fixed = fs > 0; if (this.fixed) this.scale = this.maxScale = this.minScale = fs;
    this.ema = 16.7; this._tAdj = 0; this._calm = 0; this.stats = { scale: this.scale, ms: 16.7, cpu: 0, fps: 60 };
    this.resize(); addEventListener('resize', () => this.resize()); addEventListener('orientationchange', () => setTimeout(() => this.resize(), 250));
  }
  applySettings(s) {
    this.settings = s; const P = PRESETS[s.graphics] || PRESETS.medium; this.preset = P; this.maxScale = Math.min(P.scale, this.dpr); this.minScale = Math.max(0.5, this.maxScale * 0.6);
    if (!this.fixed) this.scale = this.maxScale; this.auto = s.autoRes !== false; G.uDetail.value = P.detail; G.uBright.value = s.brightness ?? 1; this.resize();
  }
  resize() {
    const w = innerWidth, h = innerHeight; this.renderer.setPixelRatio(this.scale); this.renderer.setSize(w, h, false);
    const a = w / h; this.camera.aspect = a; this.camera.fov = a >= 1 ? 62 : 80; this.camera.updateProjectionMatrix(); this.stats.scale = this.scale;
  }
  // measures real frame time; steps resolution down quickly, back up slowly (hysteresis, no oscillation)
  governor(dt, now) {
    this.ema = this.ema * 0.94 + Math.min(dt, 0.2) * 1000 * 0.06; this.stats.ms = this.ema; this.stats.fps = 1000 / this.ema; if (this.fixed || this.auto === false) return;
    if (now - this._tAdj < 1500) return;
    if (this.ema > 36 && this.scale > this.minScale) { this.scale = Math.max(this.minScale, this.scale * 0.87); this._tAdj = now; this._calm = 0; this.resize(); }
    else if (this.ema < 22 && this.scale < this.maxScale) { if (++this._calm >= 4) { this.scale = Math.min(this.maxScale, this.scale * 1.08); this._tAdj = now; this._calm = 0; this.resize(); } }
    else this._calm = 0;
  }
  render() { this.renderer.render(this.scene, this.camera); }
}
