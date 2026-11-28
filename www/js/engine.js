// LUMIERE v5 - renderer, camera, graphics presets and the resolution governor.
// stencil:true makes the browser allocate a packed 24-bit depth + 8-bit stencil buffer: phones often give only 16-bit depth without it (z-fighting).
import * as THREE from 'three';
import { G } from './materials.js';
// v14e (the user's 14.2 test: "the app flickers like almost everywhere"): Android Chromium corrupts an MSAA frame when a texture uploads
// between its draws (three.js #33458: video and canvas textures marked dirty every frame, uploaded lazily as their material binds).
// Every texture marked dirty is remembered here and uploaded before the frame's first draw (Engine.render -> initTexture), never mid-pass.
export const DIRTY = new Set();
{ const T = THREE.Texture.prototype, d = Object.getOwnPropertyDescriptor(T, 'needsUpdate');
  if (d && d.set && d.configurable) Object.defineProperty(T, 'needsUpdate', { configurable: true, get: d.get, set(v) { d.set.call(this, v); if (v === true) DIRTY.add(this); } });
  const dispose = T.dispose; T.dispose = function () { DIRTY.delete(this); return dispose.call(this); }; }   // a disposed texture is never uploaded again
// people: three.js poses a skinned mesh's bones while it draws the frame and marks the bone texture dirty there, so every visible person
// uploaded mid-pass (14 uploads a frame in a full lobby). The pose's upload waits for the next frame's start (one frame of animation lag);
// a skeleton gets its bone texture when it binds, so even the first upload happens before a pass
const LATE = new Set();
{ const S = THREE.Skeleton.prototype, up = S.update; S.update = function () { const bt = this.boneTexture; if (!bt) return up.call(this); this.boneTexture = null; try { up.call(this); } finally { this.boneTexture = bt; } LATE.add(bt); };
  const M = THREE.SkinnedMesh.prototype, bind = M.bind; M.bind = function (sk, bm) { const r = bind.call(this, sk, bm); if (sk && sk.boneTexture === null && sk.bones.length) sk.computeBoneTexture(); return r; }; }
export const PRESETS = {
  // v12 (the user: "cheap and blocky"): scale is canvas pixels per CSS pixel. A 720 x 1600 phone has 2 device pixels per CSS pixel, so the
  // old ceilings (0.75 / 1.0 / 1.3) drew a quarter to a half of the screen's pixels and the browser stretched them. The ceiling is now the
  // screen's own pixels on High and three quarters of them on Medium; `start` is where the governor begins, `floor` where it stops
  low: { scale: 1.0, start: 0.8, floor: 0.6, people: 6, crowd: 70, peopleFar: 9, detail: 0, seatLod: 3.5, aa: true },   // v14d MSAA on every preset (tile-based phone GPUs resolve it on chip; without it edges crawl)
  medium: { scale: 1.3, start: 1.0, floor: 0.75, people: 8, crowd: 120, peopleFar: 10, detail: 1, seatLod: 4.5, aa: true },   // v14b (the user, 11-26: "it lags"): a lower ceiling, fewer skinned people
  high: { scale: 2.0, start: 1.3, floor: 0.8, people: 10, crowd: 180, peopleFar: 14, detail: 1, seatLod: 6, aa: true },   // v14 the user's itel held 21 fps on High at its 1.0 floor: lower floor, fewer skinned people
};
const LEVELS = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.15, 1.3, 1.5, 1.75, 2.0];
export class Engine {
  constructor(canvas, settings) {
    this.canvas = canvas; this.settings = settings; const P = PRESETS[settings.graphics] || PRESETS.medium; this.preset = P;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: P.aa && settings.msaa !== false, stencil: true, depth: true, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: false });   // alpha: the film's video layer shows through the screen (videolayer.js)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace; this.renderer.setClearColor(0x0b0b0e, 1); this.renderer.sortObjects = true;
    const gl = this.renderer.getContext(); try { this.depthBits = gl.getParameter(gl.DEPTH_BITS); this.samples = gl.getParameter(gl.SAMPLES); } catch (e) { this.depthBits = 0; this.samples = 0; }
    this.scene = new THREE.Scene(); this.scene.matrixWorldAutoUpdate = true;
    // held items (popcorn, drink, the tablet) are drawn in a second pass over a cleared depth buffer, so they never sink into a wall or a seat
    // (phone feedback: "items I hold go through walls when I go close")
    this.vm = new THREE.Scene(); this.vmCam = new THREE.PerspectiveCamera(60, 1, 0.02, 5);
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 160); this.camera.rotation.order = 'YXZ'; this.scene.add(this.camera);
    // v14d a phone that gives a 16-bit depth buffer anyway: a near plane twice as far doubles the depth precision everywhere
    if (this.depthBits > 0 && this.depthBits < 24) this.camera.near = 0.2;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2); this.maxScale = Math.min(P.scale, this.dpr); this.minScale = Math.min(P.floor, this.maxScale); this.scale = Math.min(P.start, this.maxScale);
    const fs = +new URLSearchParams(location.search).get('fixscale'); this.fixed = fs > 0; if (this.fixed) this.scale = this.maxScale = this.minScale = fs;
    this.ema = 16.7; this._tAdj = 0; this._calm = 0; this._born = performance.now(); this._ceil = 0; this._ceilUntil = 0; this._trial = false; this.stats = { scale: this.scale, ms: 16.7, cpu: 0, fps: 60 };
    this.resize(); addEventListener('resize', () => this.resize()); addEventListener('orientationchange', () => setTimeout(() => this.resize(), 250));
  }
  applySettings(s) {
    this.settings = s; const P = PRESETS[s.graphics] || PRESETS.medium, same = this.preset === P; this.preset = P; this.maxScale = Math.min(P.scale, this.dpr); this.minScale = Math.min(P.floor, this.maxScale);
    // a new preset starts its own search for the sharpest smooth level; other settings keep the level found
    if (!this.fixed && !same) { this.scale = Math.min(P.start, this.maxScale); this._ceil = 0; this._born = performance.now(); } this.auto = s.autoRes !== false; G.uDetail.value = P.detail; G.uBright.value = s.brightness ?? 1;
    // v8 switches: LOD distances, render distance, reflection strength (Off also drops the reflection lookup: Materials.setReflections)
    this.lodK = { aggressive: 0.65, normal: 1, far: 1.45 }[s.lod] || 1; this.viewFar = { near: 95, medium: 120, far: 170 }[s.viewDist] || 120;   // near >= the 84 m bridge: at 70 m its far end was cut off
    this.camera.far = this.viewFar; this.camera.updateProjectionMatrix();   // v11: this sat at the end of the comment above (the setting did nothing)
    G.uReflK.value = { off: 0, soft: 0.12, full: 0.3 }[s.reflections] ?? 0.12;   /* v14b (the user, 11-26: "the reflection is just way too strong") */ /* v14 (the user, 11-20: "the reflections are so heavy") */ this.resize();
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
    this.ema = this.ema * 0.94 + Math.min(dt, 0.2) * 1000 * 0.06; this.stats.ms = this.ema; this.stats.fps = 1000 / this.ema;
    // v14b (the user, 11-26: "the whole app is flickering ... it lags"): an uneven 35-45 fps reads as stutter; under ~45 for 3 s the game
    // draws every other display frame, a steady 30. The resolution search below settles in the first minute and afterwards only steps down
    if (!this.cap30 && this.pace !== 60) { this._p30 = this.ema > 22 ? (this._p30 || now) : 0; if (this._p30 && now - this._p30 > 3000) { this.cap30 = true; this._tAdj = now; } }
    if (this.pace === 30) this.cap30 = true;
    if (this.fixed || this.auto === false) return;
    const lv = LEVELS.filter((l) => l >= this.minScale - 1e-6 && l <= this.maxScale + 1e-6), i = lv.reduce((b, l, k) => (Math.abs(l - this.scale) < Math.abs(lv[b] - this.scale) ? k : b), 0);
    const slowMs = this.cap30 ? 40 : 33; this._slow = this.ema > slowMs ? (this._slow || now) : 0;   /* v14 steps down under 30 fps (it waited for 28) */ this._fast = this.ema < 19 ? (this._fast || now) : 0;
    // v12: a step up is a trial. If the new level cannot hold about 50 frames a second for 2.5 s it goes back, and that level is not
    // tried again for five minutes (v5.10 hopped between levels for ever). In the first minute the search is quick (4 s of fast frames
    // per step, mostly behind the menu), afterwards slow (12 s), so the picture settles at the sharpest level the phone holds smoothly
    // v14d (the user, 11-27: "the whole app flickers ... very visible"): every resize reallocates the canvas, which can blink on Android.
    // The search for the sharpest smooth level runs in the first 45 s (loader and menu); after that the level only steps down, after 4 s
    // of slow frames, at most once in 20 s and twice in all
    if (this._trial && !this._show) { if (now - this._tAdj > 9000) this._trial = false; else { this._lag = this.ema > 21.5 ? (this._lag || now) : 0;
      if (this._lag && now - this._lag > 2500 && i > 0) { this._ceil = lv[i - 1]; this._ceilUntil = now + 300000; this.scale = lv[i - 1]; this._tAdj = now; this._trial = false; this._lag = 0; this._fast = 0; this.resize(); } return; } }
    // seated for a film: the scale settles in the show's first 12 s (the countdown, lights going down) and then stays until you stand
    if (this._show) { if (now - this._showAt > 12000 || now - this._tAdj < 2500) return; if (this._slow && now - this._slow > 1500 && i > 0) { this.scale = lv[i - 1]; this._tAdj = now; this._slow = 0; this.resize(); } return; }
    const early = now - (this._born || 0) < 45000, capped = this._ceil && now < this._ceilUntil && i < lv.length - 1 && lv[i + 1] > this._ceil + 1e-6;
    if (early) { if (now - this._tAdj < 3000) return;
      if (this._slow && now - this._slow > 2000 && i > 0) { this.scale = lv[i - 1]; this._tAdj = now; this._slow = 0; this.resize(); }
      else if (!this.cap30 && this._fast && now - this._fast > 4000 && i < lv.length - 1 && !capped) { this.scale = lv[i + 1]; this._tAdj = now; this._fast = 0; this._trial = true; this._lag = 0; this.resize(); }
      return; }
    if ((this._late || 0) >= 2 || now - this._tAdj < 20000) return;
    if (this._slow && now - this._slow > 4000 && i > 0) { this.scale = lv[i - 1]; this._tAdj = now; this._slow = 0; this._late = (this._late || 0) + 1; this.resize(); }
  }
  // v9 show mode: watching the film you get the screen's full resolution (up to the device's pixels); the governor still steps down
  // if the phone can't keep up, and leaving your seat returns to the preset
  showMode(on) { if (on === !!this._show) return; this._show = on; this._showAt = performance.now(); const P = this.preset; if (on) this._preShow = this.scale;
    this.maxScale = on ? Math.min(this.dpr, Math.max(P.scale, 1.5)) : Math.min(P.scale, this.dpr);
    if (!this.fixed) { this.scale = on ? this.maxScale : Math.min(this._preShow || P.start, this.maxScale); this._trial = false; this._tAdj = performance.now(); this.resize(); } }   // leaving the seat: back to the level the governor had found
  // seated in a hall the view narrows a little (like your attention does), so the screen fills the picture the way it does in a real cinema
  setZoom(z, dt) { const k = this.zoom || 1, n = k + (z - k) * (1 - Math.exp(-dt * 2.5)); if (Math.abs(n - k) < 1e-4) return; this.zoom = n; this.camera.fov = this.baseFov * n; this.camera.updateProjectionMatrix(); }
  render() {
    const r = this.renderer; r.info.autoReset = false; r.info.reset();   // one info count for both passes (the HUD's draw calls)
    this.flushTextures();
    if (this.stereo) { this.renderStereo(r); return; }
    r.render(this.scene, this.camera);
    if (this.vm.children.length) { r.autoClear = false; r.clearDepth(); r.render(this.vm, this.vmCam); r.autoClear = true; }
  }
  // every texture that changed since the last frame uploads now, before any draw of this frame (see DIRTY above)
  flushTextures() { if (LATE.size) { for (const t of LATE) t.needsUpdate = true; LATE.clear(); } if (!DIRTY.size) return; const r = this.renderer; for (const t of DIRTY) { if (t.isRenderTargetTexture || !t.image) continue; try { r.initTexture(t); } catch (e) { /* a source that is not ready: it uploads as it binds */ } } DIRTY.clear(); }
  // v10 phone VR (a Cardboard-style viewer): each eye in its half, 64 mm apart, focused at the screen's distance
  renderStereo(r) {
    const sc = this._sc || (this._sc = new THREE.StereoCamera()), cam = this.camera, s = r.getSize(this._sz || (this._sz = new THREE.Vector2())); sc.aspect = 0.5; sc.eyeSep = 0.064; cam.updateMatrixWorld(); sc.update(cam);
    r.setScissorTest(true); r.clear();
    for (const [i, c] of [[0, sc.cameraL], [1, sc.cameraR]]) { r.setScissor(i * s.x / 2, 0, s.x / 2, s.y); r.setViewport(i * s.x / 2, 0, s.x / 2, s.y); r.autoClear = false; r.render(this.scene, c);
      if (this.vm.children.length) { r.clearDepth(); r.render(this.vm, this.vmCam); } r.autoClear = true; }
    r.setScissorTest(false); r.setViewport(0, 0, s.x, s.y);
  }
}
