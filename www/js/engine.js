// LUMIERE v4 - renderer, adaptive fps governor and the global light-scale (all brightness goes through here)
import * as THREE from 'three';
export class Engine {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false, alpha: false });
    this.renderer.setClearColor(0x050403, 1);
    this.maxScale = Math.min(window.devicePixelRatio || 1, 1.5); this.minScale = 0.55; this.scale = this.maxScale;
    const fs = +new URLSearchParams(location.search).get('fixscale'); this.fixed = fs > 0; if (this.fixed) this.scale = this.maxScale = this.minScale = fs;   // test hook: pin the render scale
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(68, 1, 0.12, 60); this.camera.rotation.order = 'YXZ';
    this.lightScale = 1; this._lights = []; this._glows = [];
    this.ema = 16.7; this._tAdj = 0; this._calm = 0; this.stats = { scale: this.scale, ms: 16.7, cpu: 0 };
    this.resize(); addEventListener('resize', () => this.resize());
  }
  resize() {
    const w = innerWidth, h = innerHeight; this.renderer.setPixelRatio(this.scale); this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.fov = w / h < 1 ? 78 : 68; this.camera.updateProjectionMatrix();
  }
  addLight(light) { this._lights.push({ l: light, base: light.intensity }); this.scene.add(light); return light; }
  addGlowMaterial(mat, baseColor) { this._glows.push({ m: mat, c: baseColor.clone() }); mat.color.copy(baseColor).multiplyScalar(this.lightScale); return mat; }
  setLightScale(v) {
    this.lightScale = v; for (const e of this._lights) e.l.intensity = e.base * v;
    for (const g of this._glows) g.m.color.copy(g.c).multiplyScalar(Math.min(1.6, 0.35 + 0.65 * v));
  }
  // per-frame light update: base intensity x global light-scale x a per-light factor (userData.k) set by the house-light logic
  applyLights() { for (const e of this._lights) e.l.intensity = (e.l.userData.base ?? e.base) * this.lightScale * (e.l.userData.k ?? 1); }
  // measures real frame time, steps render resolution down quickly and back up slowly (hysteresis -> no oscillation)
  governor(dt, now) {
    this.ema = this.ema * 0.94 + Math.min(dt, 0.2) * 1000 * 0.06; this.stats.ms = this.ema; if (this.fixed) return;
    if (now - this._tAdj < 1200) return;
    if (this.ema > 37 && this.scale > this.minScale) { this.scale = Math.max(this.minScale, this.scale * 0.85); this._apply(now); this._calm = 0; }
    else if (this.ema < 21 && this.scale < this.maxScale) { if (++this._calm >= 4) { this.scale = Math.min(this.maxScale, this.scale * 1.1); this._apply(now); this._calm = 0; } }
    else this._calm = 0;
  }
  _apply(now) { this._tAdj = now; this.stats.scale = this.scale; this.resize(); }
  render() { this.renderer.render(this.scene, this.camera); }
}
