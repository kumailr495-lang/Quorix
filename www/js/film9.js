// LUMIERE v9 - what each screen is doing, and the picture itself.
// A show: idle (lights up, the hall's slate) -> pending (people arrive; the screen counts down) -> countdown (the last 10 s: big numbers,
// the house lights go down within those 10 s, the curtain opens) -> playing (lights at 2 %) -> credits (a third) -> ended -> idle.
// v9 (phone feedback on v8): the picture is a WebGL video texture on the real, curved screen (no more video layer: no blank picture when
// you turn, no blurred border, no crop, no freeze when you come back); exact colours (no tone curve); new frames are uploaded only when
// the video has one. The picture's light spills into the hall by where it is on the screen (red low, yellow high: materials.js LM_SPILL),
// from a 64 x 32 copy rendered on the GPU (never read back synchronously). The 270 hall's side walls carry the picture's edges.
// YouTube links play in YouTube's own player, placed over the screen in true perspective (CSS3D), the WebGL screen cut out under it.
// Sources: your videos (the app's own server: same origin), the open films (downloaded for offline play, or through the app's
// server so their picture and sound can be processed), any https link.
import * as THREE from 'three';
import { filmById, loadTrack, FEATURED, CATALOG } from './films.js';
import { makeCanvas, SANS, SERIF } from './textures.js';
import { t } from './i18n.js';
const LIGHT = { idle: 1, pending: 1, countdown: 0.06, playing: 0.02, credits: 0.3, ended: 0.85 };
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), ss = (u) => u * u * u * (u * (u * 6 - 15) + 10);
export function youtubeId(u) { const m = String(u || '').match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/); return m ? m[1] : null; }
// where a film is played from: a download, the app's server (proxy), or the web
export function filmURL(f) {
  const M = window.LumiereMedia; if (!M) return { url: f.url, cors: true };
  try { const dl = JSON.parse(M.downloaded() || '[]').find((d) => d.name === f.id + '.mp4' && d.done); if (dl) return { url: dl.url, local: true }; } catch (e) { /* no downloads */ }
  try { const b = M.proxyBase && M.proxyBase(); if (b) return { url: b + encodeURIComponent(f.url), local: true }; } catch (e) { /* older wrapper */ }
  return { url: f.url, cors: true };
}
// ------------------------------------------------------------------ the screen's slides (1024 px wide, the hall's aspect)
function slides(aspect) {
  const w = 1024, h = Math.round(w / aspect), c = makeCanvas(w, h), g = c.getContext('2d', { alpha: false }), tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter;
  const bg = () => { const gr = g.createRadialGradient(w / 2, h * 0.45, 20, w / 2, h / 2, w * 0.7); gr.addColorStop(0, '#1b1726'); gr.addColorStop(1, '#060608'); g.fillStyle = gr; g.fillRect(0, 0, w, h); };
  const sp = (px) => { if ('letterSpacing' in g) g.letterSpacing = px + 'px'; };
  return { tex, aspect: w / h,
    // before the countdown: the film, the hall, when it starts, and a line to read
    waiting(title, hall, secs, line) { bg(); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(227,178,95,.95)'; g.font = `500 ${h * 0.045}px ${SANS}`; sp(h * 0.014); g.fillText(hall.toUpperCase(), w / 2, h * 0.2);
      g.fillStyle = '#f2ebdd'; g.font = `500 ${Math.min(h * 0.12, w * 0.9 / Math.max(8, title.length) * 1.6)}px ${SERIF}`; sp(0); g.fillText(title, w / 2, h * 0.4);
      g.fillStyle = 'rgba(242,235,221,.7)'; g.font = `400 ${h * 0.045}px ${SANS}`; g.fillText(line || '', w / 2, h * 0.58);
      if (secs != null) { const m = Math.floor(secs / 60), s = Math.floor(secs % 60); g.fillStyle = '#fff'; g.font = `600 ${h * 0.09}px ${SANS}`; sp(h * 0.01); g.fillText(`${m}:${String(s).padStart(2, '0')}`, w / 2, h * 0.77); sp(0); }
      tex.needsUpdate = true; },
    // the last 10 s: a ring that empties, the number in the middle
    count(n, frac, title) { g.fillStyle = '#050506'; g.fillRect(0, 0, w, h); const r = h * 0.26, cx = w / 2, cy = h * 0.48;
      g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = h * 0.012; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = '#e3b25f'; g.beginPath(); g.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac); g.stroke();
      g.fillStyle = '#f2ebdd'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `600 ${h * 0.24}px ${SANS}`; g.fillText(String(n), cx, cy + h * 0.01);
      g.font = `500 ${h * 0.04}px ${SANS}`; g.fillStyle = 'rgba(242,235,221,.6)'; sp(h * 0.012); g.fillText(title.toUpperCase(), cx, h * 0.88); sp(0); tex.needsUpdate = true; },
    card(text, sub, a) { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.globalAlpha = clamp(a); g.fillStyle = '#f4efe6'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `500 ${h * 0.11}px ${SERIF}`; sp(h * 0.03); g.fillText(text, w / 2, h * 0.46);
      if (sub) { g.font = `500 ${h * 0.035}px ${SANS}`; sp(h * 0.014); g.fillStyle = 'rgba(244,239,230,.7)'; g.fillText(sub, w / 2, h * 0.6); } sp(0); g.globalAlpha = 1; tex.needsUpdate = true; },
    text(lines) { bg(); g.textAlign = 'center'; g.textBaseline = 'middle'; lines.forEach((l, i) => { g.fillStyle = i ? 'rgba(242,235,221,.7)' : '#f2ebdd'; g.font = `${i ? 400 : 500} ${h * (i ? 0.045 : 0.08)}px ${i ? SANS : SERIF}`; g.fillText(l, w / 2, h * (0.42 + i * 0.12)); }); tex.needsUpdate = true; } };
}
// ------------------------------------------------------------------ GPU helpers: the spill copy and the 270 walls
const QUAD_VERT = `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const SPILL_FRAG = `uniform sampler2D map; uniform vec4 uBox; varying vec2 vUv;
void main() { vec2 q = (vUv - uBox.xy) / uBox.zw; float inside = step(0.0, q.x) * step(q.x, 1.0) * step(0.0, q.y) * step(q.y, 1.0); vec3 c = texture2D(map, clamp(q, 0.0, 1.0)).rgb * inside; gl_FragColor = vec4(c, 1.0); }`;
const AVG_FRAG = `uniform sampler2D map; varying vec2 vUv; void main() { gl_FragColor = vec4(textureLod(map, vec2(0.25 + vUv.x * 0.5, 0.5), 6.0).rgb, 1.0); }`;
const WALL_VERT = `varying vec2 vUv; varying float vDist; void main() { vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vDist = -mv.z; gl_Position = projectionMatrix * mv; }`;
const WALL_FRAG = `uniform sampler2D uSpill; uniform float uSide; uniform float uAmt; varying vec2 vUv;
void main() { float d = vUv.x; float u = uSide < 0.0 ? 0.02 + d * 0.06 : 0.98 - d * 0.06; vec3 c = textureLod(uSpill, vec2(u, vUv.y), 0.5 + d * 2.5).rgb;
  float fade = (1.0 - smoothstep(0.35, 1.0, d)) * smoothstep(0.0, 0.06, vUv.y) * smoothstep(1.0, 0.94, vUv.y); gl_FragColor = vec4(c * uAmt * fade * 0.9, 1.0);
  #include <colorspace_fragment>
}`;
export class Shows {
  constructor(world, sound, crowd, director, engine, hooks = {}) {
    Object.assign(this, { world, sound, crowd, director, engine, hooks, active: null, own: null, now: 0, vis: new Set(), buffering: false, spread: 0, lumV: 0.2 });
    const v = this.video = document.createElement('video'); v.playsInline = true; v.setAttribute('playsinline', ''); v.preload = 'auto'; v.crossOrigin = 'anonymous'; v.style.display = 'none'; document.body.appendChild(v);
    v.addEventListener('ended', () => { const s = this.cur(); if (s && (s.state === 'playing')) this._finish(s.id, !s.credits); });
    v.addEventListener('error', () => { const s = this.cur(); if (s && s.state !== 'idle' && s.state !== 'ended') { this.hooks.onError && this.hooks.onError(s.src && s.src.kind); this._stopPicture(s); s.state = 'ended'; s.phaseAt = this.now; s.slides.text([t('toast.videoError') || 'This video could not be played.']); } });
    v.addEventListener('waiting', () => { this.buffering = true; }); v.addEventListener('playing', () => { this.buffering = false; });
    this.vtex = new THREE.VideoTexture(v); this.vtex.colorSpace = THREE.SRGBColorSpace; this.vtex.minFilter = THREE.LinearFilter; this.vtex.magFilter = THREE.LinearFilter; this.vtex.generateMipmaps = false;
    this.s = {};
    for (const h of world.halls) { const id = h.id; this.s[id] = { id, hall: h, state: 'idle', src: null, startAt: 0, phaseAt: 0, light: 1, lightFrom: 1, lightAt: 0, lightWant: 1, track: null, credits: false, slides: slides(h.cfg.aspect), curtainKeep: false }; }
    // the spill copy (64 x 32, mip-mapped; the rooms read it blurred), and a 2 x 1 average for people and seats (read back without a stall)
    this.spillRT = new THREE.WebGLRenderTarget(64, 32, { generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, colorSpace: THREE.LinearSRGBColorSpace });
    this.avgRT = new THREE.WebGLRenderTarget(2, 1, { generateMipmaps: false }); this.avgBuf = new Uint8Array(8); this._avgT = 0;
    const quad = new THREE.PlaneGeometry(2, 2); this.qcam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.spillMat = new THREE.ShaderMaterial({ vertexShader: QUAD_VERT, fragmentShader: SPILL_FRAG, uniforms: { map: { value: null }, uBox: { value: new THREE.Vector4(0, 0, 1, 1) } }, depthTest: false, depthWrite: false });
    this.avgMat = new THREE.ShaderMaterial({ vertexShader: QUAD_VERT, fragmentShader: AVG_FRAG, uniforms: { map: { value: this.spillRT.texture } }, depthTest: false, depthWrite: false });
    this.spillScene = new THREE.Scene(); this.spillScene.add(new THREE.Mesh(quad, this.spillMat)); this.avgScene = new THREE.Scene(); this.avgScene.add(new THREE.Mesh(quad, this.avgMat));
    for (const h of world.halls) { h.room.U.uSpill.value = this.spillRT.texture; h.room.U.uScreen.value.setRGB(0.25, 0.25, 0.25); }
    this.avg = new THREE.Color(0.2, 0.2, 0.2);
    // 270: the side walls' projection surfaces (hallmath + tools/blender/arch/halls.py: 0.4 m to 72 % of the depth, 1.4 m up to 0.9 m under the ceiling)
    const X = world.hallById('X270'); if (X) { const H = X.cfg; this.walls = [-1, 1].map((sg) => { const d0 = 0.4, d1 = H.depthIn * 0.72, y0 = H.y0 + 1.4, y1 = H.y0 + H.ceil - 0.9, u = sg * (H.width / 2 - 0.056);
      const a = H.toWorld(u, d0), b = H.toWorld(u, d1), g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([a.x, y0, a.z, b.x, y0, b.z, b.x, y1, b.z, a.x, y1, a.z], 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
      g.setIndex(sg * H.dir > 0 ? [0, 2, 1, 0, 3, 2] : [0, 1, 2, 0, 2, 3]); const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ vertexShader: WALL_VERT, fragmentShader: WALL_FRAG, uniforms: { uSpill: { value: this.spillRT.texture }, uSide: { value: sg }, uAmt: { value: 0 } }, side: THREE.DoubleSide }));
      m.renderOrder = 2; X.room.group.add(m); return m; }); }
    this._yt = null;
  }
  cur() { return this.active && this.s[this.active]; }
  get(id) { return this.s[id]; }
  isOn(id) { const s = this.s[id]; return !!s && (s.state === 'playing' || s.state === 'countdown'); }
  countdown(id) { const s = this.s[id]; return s && s.state === 'pending' ? Math.max(0, (s.startAt - this.now) / 1000) : 0; }
  title(id) { const s = this.s[id]; return s && s.src ? s.src.title : ''; }
  // ---------------------------------------------------------- your own video / a link
  loadLocal(url, title) { this.own = { kind: 'own', url, title, label: title }; return this.own; }
  loadFile(file, title) { if (this._obj) URL.revokeObjectURL(this._obj); this._obj = URL.createObjectURL(file); this.own = { kind: 'own', url: this._obj, title, label: title }; return this.own; }
  loadURL(url, title) { const yt = youtubeId(url); this.own = yt ? { kind: 'youtube', ytId: yt, url, title: title || 'YouTube', label: title || 'YouTube' } : { kind: 'link', url, title, label: title }; return this.own; }
  // book: src = { kind: 'film', filmId } | this.own; delayMs before the countdown; replay: keep the curtain open, short wait
  book(id, src, delayMs, playerSeat, o = {}) {
    const s = this.s[id]; if (this.active && this.active !== id) this._abort(this.active); if (s.state !== 'idle') this._stopPicture(s);
    if (src.kind === 'film') { const f = filmById(src.filmId) || filmById(FEATURED[id]) || CATALOG[0]; s.src = { kind: 'film', filmId: f.id, title: f.title, ...filmURL(f) }; s.track = null; loadTrack(f.id).then((tr) => { s.track = tr; }); }
    else s.src = { ...src };
    s.credits = false; s.curtainKeep = !!o.replay; this.active = id; s.startAt = this.now + Math.max(o.replay ? 3000 : 12000, delayMs); s.state = 'pending'; s.phaseAt = this.now; s.booked = true;
    if (s.src.kind !== 'youtube') { const v = this.video; v.pause(); v.src = s.src.url; v.load(); }
    if (!o.replay) { this.crowd.clearAudience(id); const n = Math.min(this.engine.preset.crowd, Math.round(s.hall.seats.length * (0.4 + Math.random() * 0.3))); this.crowd.planAudience(id, n, Math.max(8000, s.startAt - this.now - 6000), new Set([playerSeat])); }
    this._slideWaiting(s);
  }
  replay(id) { const s = this.s[id]; if (!s || !s.src) return false; this.book(id, s.src, 0, null, { replay: true }); return true; }
  _abort(id) { const s = this.s[id]; this._stopPicture(s); if (this.active === id) this.active = null; this.director.stop(id); this.sound.stopFilm(s.hall.key); s.state = 'idle'; s.booked = false; this._idle(s); this.crowd.clearAudience(id); }
  _idle(s) { const u = s.hall.picMat.uniforms; u.map.value = s.hall.slate; u.uGain.value = 0.55; u.uBox.value.set(0, 0, 1, 1); if (s.hall.curtains) s.hall.curtains.target = 0; s.pic = false; }
  _slideWaiting(s) { const u = s.hall.picMat.uniforms; u.map.value = s.slides.tex; u.uGain.value = 0.8; u.uBox.value.set(0, 0, 1, 1); s.pic = false; }
  _stopPicture(s) { try { this.video.pause(); } catch (e) { /* none */ } this._ytStop(); if (s) s.pic = false; }
  _fit(s, aspect) { const A = s.hall.cfg.aspect, b = s.hall.picMat.uniforms.uBox.value; if (aspect > A) { const hh = A / aspect; b.set(0, (1 - hh) / 2, 1, hh); } else { const ww = aspect / A; b.set((1 - ww) / 2, 0, ww, 1); } this.spillMat.uniforms.uBox.value.copy(b); }
  _begin(id) {   // the last 10 s: lights down, curtains open, the count
    const s = this.s[id], h = s.hall; s.state = 'countdown'; s.phaseAt = this.now; if (h.curtains) { h.curtains.target = 1; if (this.sound.listener.room === h.key && !s.curtainKeep) this.sound.curtain(true); }
    this.crowd.onShowPhase(id, 'dimming'); this.hooks.onBegin && this.hooks.onBegin(id); const v = this.video; if (s.src.kind !== 'youtube') { try { v.currentTime = 0; } catch (e) { /* not loaded */ } }
  }
  _roll(id) {
    const s = this.s[id], v = this.video; s.state = 'playing'; s.phaseAt = this.now; s.playStart = this.now;
    if (s.src.kind === 'youtube') { this._ytStart(s); }
    else { const p = v.play(); if (p && p.catch) p.catch((e) => { console.warn('[lumiere] play failed', e); this.hooks.onError && this.hooks.onError(s.src.kind); });
      const show = () => { if (s.state !== 'playing') return; this._fit(s, (v.videoWidth / v.videoHeight) || 16 / 9); s.hall.picMat.uniforms.map.value = this.vtex; s.hall.picMat.uniforms.uGain.value = 1; s.pic = true;
        this.sound.startFilm(s.hall.key, { video: v, hall: s.hall }); this.hooks.onPicture && this.hooks.onPicture(id);
        if (s.src.kind === 'film') { const go = () => s.track && this.director.startTrack(id, s.track.cues, () => v.currentTime); if (s.track) go(); else loadTrack(s.src.filmId).then((tr) => { s.track = tr; go(); }); } else this.director.startLive(id, this.now); };
      if ('requestVideoFrameCallback' in v) v.requestVideoFrameCallback(() => show()); else v.addEventListener('playing', () => setTimeout(show, 120), { once: true }); }
  }
  _finish(id, applause) {
    const s = this.s[id]; if (s.state !== 'playing') return; this._stopPicture(s); if (applause) this.crowd.onFilmEvent(id, { type: 'end', k: 1 });
    this.director.stop(id); this.sound.stopFilm(s.hall.key); s.state = 'ended'; s.phaseAt = this.now; this._slideWaiting(s); s.slides.text([s.src.title, t('show.ended')]);
    this.crowd.onShowPhase(id, 'ended'); if (s.hall.curtains) s.hall.curtains.target = 0; this.hooks.onEnd && this.hooks.onEnd(id, applause || s.credits);
  }
  // ---------------------------------------------------------- per frame (logic)
  update(dt, now, room, vis) {
    this.now = now; this.vis = vis;
    for (const id in this.s) {
      const s = this.s[id], h = s.hall, visible = vis.has(h.key);
      if (s.state === 'pending') { if (visible && now - (s._pd || 0) > 250) { s._pd = now; const left = (s.startAt - now) / 1000, line = Math.floor(now / 4000) % 2 ? t('pre.silence') : t('pre.seats'); s.slides.waiting(s.src.title, h.name, Math.max(0, left - 10), line); } if (now >= s.startAt - 10000) this._begin(id); }
      else if (s.state === 'countdown') { const k = (now - s.phaseAt) / 1000; if (visible && now - (s._cd || 0) > 66) { s._cd = now; s.slides.count(Math.max(1, Math.ceil(10 - k)), clamp(1 - k / 10), s.src.title); } if (k >= 10) this._roll(id); }
      else if (s.state === 'playing' && s.src.kind === 'film' && s.track && !s.credits && s.track.end > 0 && this.video.currentTime >= s.track.end) { s.credits = true; this.crowd.onFilmEvent(id, { type: 'end', k: 1 }); }
      else if (s.state === 'ended' && now - s.phaseAt > 30000) { s.state = 'idle'; s.booked = false; this._idle(s); }
      // house lights: a timed smootherstep to each phase's level (10 s down in the countdown, 5 s up after)
      const want = s.state === 'playing' && s.credits ? LIGHT.credits : LIGHT[s.state] ?? 1;
      if (want !== s.lightWant) { s.lightWant = want; s.lightFrom = s.light; s.lightAt = now; }
      const dur = s.state === 'countdown' ? 9500 : s.state === 'playing' ? 2000 : 5000, u = clamp((now - s.lightAt) / dur); s.light = s.lightFrom + (want - s.lightFrom) * ss(u);
      h.room.U.uHouse.value = s.light; h.room.U.uGlow.value = 0.35 + 0.65 * Math.min(1, s.light * 2.5);
      // screen light gain: the picture's own colour comes from the spill copy
      const g = s.state === 'playing' && s.pic ? 5.5 : s.state === 'countdown' ? 2.2 : s.state === 'pending' || s.state === 'ended' ? 1.2 : 0.5, sc = h.room.U.uScreen.value, k = 1 - Math.exp(-dt * 6);
      sc.r += (g - sc.r) * k; sc.g = sc.r; sc.b = sc.r;
      if (this.walls && h.id === 'X270') { const on = s.state === 'playing' && s.pic ? 0.25 + 0.75 * this.spread : 0; for (const m of this.walls) { const U = m.material.uniforms.uAmt; U.value += (on - U.value) * k; } }
    }
  }
  // ---------------------------------------------------------- per frame (GPU): the spill copy, the average, YouTube placement
  frame(camera, renderer) {
    const s = this.cur(), h = s ? s.hall : null, on = s && this.vis.has(h.key);
    if (on) { const R = renderer, prev = R.getRenderTarget(); this.spillMat.uniforms.map.value = h.picMat.uniforms.map.value; if (!s.pic) this.spillMat.uniforms.uBox.value.set(0, 0, 1, 1);
      R.setRenderTarget(this.spillRT); R.render(this.spillScene, this.qcam); R.setRenderTarget(this.avgRT); R.render(this.avgScene, this.qcam); R.setRenderTarget(prev);
      if (this.now - this._avgT > 300 && !this._avgBusy && R.readRenderTargetPixelsAsync) { this._avgT = this.now; this._avgBusy = true;
        R.readRenderTargetPixelsAsync(this.avgRT, 0, 0, 2, 1, this.avgBuf).then(() => { const b = this.avgBuf, r = (b[0] + b[4]) / 510, g = (b[1] + b[5]) / 510, bl = (b[2] + b[6]) / 510; this.avg.setRGB(r, g, bl); this.lumV = 0.2126 * r + 0.7152 * g + 0.0722 * bl; }).catch(() => {}).finally(() => { this._avgBusy = false; }); } }
    if (this._yt) this._ytPlace(camera);
  }
  get lum() { return this.lumV; }
  // ---------------------------------------------------------- YouTube: its own player on a CSS3D layer, the WebGL screen cut out
  async _ytStart(s) {
    const el = document.getElementById('yt') || (() => { const d = document.createElement('div'); d.id = 'yt'; document.body.insertBefore(d, document.body.firstChild); return d; })();
    el.innerHTML = ''; const f = document.createElement('iframe'); f.allow = 'autoplay; encrypted-media; picture-in-picture'; f.setAttribute('allowfullscreen', '');
    f.src = `https://www.youtube-nocookie.com/embed/${s.src.ytId}?autoplay=1&playsinline=1&controls=0&rel=0&modestbranding=1&enablejsapi=1&origin=${encodeURIComponent(location.origin)}`;
    el.appendChild(f); this._yt = { el, f, s }; const u = s.hall.picMat.uniforms; u.map.value = s.slides.tex; s.slides.card('', '', 0); u.uGain.value = 0; s.pic = true; this.spillMat.uniforms.uBox.value.set(0, 0, 1, 1);
    document.body.classList.add('yt-on'); this.hooks.onPicture && this.hooks.onPicture(s.id);
  }
  _ytStop() { if (!this._yt) return; this._yt.el.innerHTML = ''; this._yt = null; document.body.classList.remove('yt-on'); }
  _ytPlace(camera) {   // the iframe's corners follow the screen's corners in perspective (matrix3d from the four projected points)
    const { el, f, s } = this._yt, H = s.hall.cfg, W = innerWidth, Hh = innerHeight, yb = H.y0 + H.hB, A = 16 / 9, pw = Math.min(H.W, H.H * A), ph = pw / A, u0 = -pw / 2, u1 = pw / 2, y0 = yb + (H.H - ph) / 2, y1 = y0 + ph;
    const P = [[u0, y1], [u1, y1], [u1, y0], [u0, y0]].map(([u, y]) => { const w = H.toWorld(u, H.screenD(u)); return new THREE.Vector3(w.x, y, w.z).project(camera); });
    if (P.some((p) => p.z > 1 || p.z < -1)) { el.style.visibility = 'hidden'; return; } el.style.visibility = 'visible';
    const pts = P.map((p) => [(p.x + 1) / 2 * W, (1 - p.y) / 2 * Hh]), bw = 1280, bh = 720; f.style.width = bw + 'px'; f.style.height = bh + 'px';
    f.style.transform = homography([[0, 0], [bw, 0], [bw, bh], [0, bh]], pts);
  }
  // ---------------------------------------------------------- tablet remote, lifecycle
  control(cmd, arg) {
    const s = this.cur(); if (!s || s.state !== 'playing') return false; const v = this.video;
    if (s.src.kind === 'youtube') { const w = this._yt && this._yt.f.contentWindow; if (w) w.postMessage(JSON.stringify({ event: 'command', func: cmd === 'pause' ? 'pauseVideo' : cmd === 'play' ? 'playVideo' : cmd === 'seek' ? 'seekTo' : 'stopVideo', args: cmd === 'seek' ? [arg, true] : [] }), '*'); if (cmd === 'stop') this._finish(s.id, false); return true; }
    if (cmd === 'pause') v.pause(); else if (cmd === 'play') v.play().catch(() => {}); else if (cmd === 'seek') { try { v.currentTime = clamp(arg, 0, (v.duration || 1) - 0.3); } catch (e) { /* not seekable */ } this.director.seek(s.id); }
    else if (cmd === 'speed') v.playbackRate = arg; else if (cmd === 'stop') this._finish(s.id, false);
    return true;
  }
  playback() { const s = this.cur(); if (!s || !s.src) return null; const v = this.video; return { id: s.id, state: s.state, t: v.currentTime || 0, dur: v.duration || 0, paused: v.paused, rate: v.playbackRate, kind: s.src.kind, src: s.src.kind === 'film' ? 'film' : 'user', film: s.src.filmId, title: s.src.title, url: s.src.url, filmId: s.src.filmId, el: v }; }
  // app to the background and back (wrapper lifecycle): pause, then resume with a seek nudge so the decoder hands over a fresh frame
  pause(on) { const s = this.cur(); if (!s || s.state !== 'playing' || s.src.kind === 'youtube') return; const v = this.video;
    if (on) { s.wasPlaying = !v.paused; v.pause(); } else if (s.wasPlaying) { try { v.currentTime = v.currentTime + 0.001; } catch (e) { /* not seekable */ } v.play().catch(() => {}); this.vtex.needsUpdate = true; } }
}
// a CSS matrix3d mapping the rectangle src (4 points) onto dst (4 points): the projective transform solved from the 8 equations
function homography(src, dst) {
  const A = [], b = []; for (let i = 0; i < 4; i++) { const [x, y] = src[i], [u, v] = dst[i]; A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u); A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v); }
  const n = 8; for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r; [A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]];
    for (let r = 0; r < n; r++) { if (r === c) continue; const f = A[r][c] / A[c][c]; for (let k = c; k < n; k++) A[r][k] -= f * A[c][k]; b[r] -= f * b[c]; } }
  const h = b.map((v, i) => v / A[i][i]); return `matrix3d(${h[0]},${h[3]},0,${h[6]},${h[1]},${h[4]},0,${h[7]},0,0,1,0,${h[2]},${h[5]},0,1)`;
}
