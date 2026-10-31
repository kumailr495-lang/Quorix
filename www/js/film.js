// LUMIERE v8 - what each screen is doing. A show goes:
//   idle (house lights up, slate) -> pending (audience arrives, countdown slide) -> preshow (lights at half, "silence your phone")
//   -> dimming (lights down, curtains open) -> playing (picture; reactions follow the film) -> [credits: applause, lights to a third]
//   -> ending (lights at half) -> ended (lights up, people leave) -> idle
// Nothing plays by itself (v7): a hall is empty and shows its slate unless you booked it.
// v8: two video elements. `stream` plays the open films and links (no CORS, its sound goes straight out, the audience follows the film's
// offline cue track); `user` plays your own files (same origin: its sound runs through the hall acoustics and the live director).
// Neither picture is copied into WebGL: videolayer.js shows it through a hole in the screen at the video's own resolution.
import * as THREE from 'three';
import { makePreshow, filmById, loadTrack, lightAt, FEATURED } from './films.js';
import { makeCanvas } from './textures.js';
import { t } from './i18n.js';
import { VideoLayer, pictureCorners } from './videolayer.js';
const rnd = (a, b) => a + Math.random() * (b - a);
const LIGHT = { idle: 1, pending: 1, preshow: 0.45, dimming: 0.04, playing: 0.025, credits: 0.3, ending: 0.45, ended: 1 };
function makeVideo(cors) {
  const v = document.createElement('video'); v.playsInline = true; v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', ''); v.preload = 'auto';
  if (cors) v.crossOrigin = 'anonymous'; document.body.insertBefore(v, document.body.firstChild); return v;
}
export class Shows {
  constructor(world, sound, crowd, director, engine, hooks = {}) {
    this.world = world; this.sound = sound; this.crowd = crowd; this.director = director; this.engine = engine; this.hooks = hooks; this.active = null; this.objUrl = null; this.now = 0; this.vis = new Set();
    this.user = makeVideo(true); this.stream = makeVideo(false); this.layers = { user: new VideoLayer(this.user), stream: new VideoLayer(this.stream) }; this.own = null;
    for (const v of [this.user, this.stream]) {
      v.addEventListener('ended', () => { const s = this.active && this.s[this.active]; if (s && this._el(s) === v) this._finish(s.id, !s.credits); });
      v.addEventListener('error', () => { const s = this.active && this.s[this.active]; if (s && this._el(s) === v && s.state !== 'idle') { this.hooks.onError && this.hooks.onError(s.src); this._abort(s.id); } });
      v.addEventListener('waiting', () => { this.buffering = true; }); v.addEventListener('playing', () => { this.buffering = false; });
    }
    this.s = {};
    for (const h of world.halls) { const id = h.id; this.s[id] = { id, hall: h, state: 'idle', src: null, filmId: FEATURED[id], track: null, startAt: 0, phaseAt: 0, booked: false, light: 1, pre: makePreshow(h.cfg.aspect), credits: false, pic: false }; }
    this.spillC = makeCanvas(8, 4); this.spillG = this.spillC.getContext('2d', { willReadFrequently: true }); this.spillOk = true; this._spillT = 0; this.userSpill = { r: 0.3, g: 0.3, b: 0.3, lum: 0.3 };
    this.light = { band: new Float32Array(9), avg: { r: 0, g: 0, b: 0, lum: 0 } }; this._corners = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  }
  _el(s) { return s.src === 'user' ? this.user : this.stream; }
  // your own video: a picked file (blob), a file served by the app's media bridge (same origin) or a web link (any server: plays like the films)
  loadFile(file, label) { if (this.objUrl) URL.revokeObjectURL(this.objUrl); this.objUrl = URL.createObjectURL(file); this.user.src = this.objUrl; this.user.load(); this.own = { src: 'user', label }; return this.own; }
  loadLocal(url, label) { this.user.src = url; this.user.load(); this.own = { src: 'user', label }; return this.own; }
  loadURL(url, label) { this.own = { src: 'link', url, label }; return this.own; }
  get video() { return this.user; }
  audioSource(id) { const s = this.s[id]; return s.src === 'user' ? { video: this.user } : { direct: this.stream }; }
  get(id) { return this.s[id]; }
  isOn(id) { const s = this.s[id]; return !!s && (s.state === 'playing' || s.state === 'dimming'); }
  countdown(id) { const s = this.s[id]; return s && s.state === 'pending' ? Math.max(0, (s.startAt - this.now) / 1000) : 0; }
  title(id) { const s = this.s[id]; if (s.src === 'film') { const f = filmById(s.filmId); return f ? f.title : ''; } return s.userTitle || ''; }
  filmTime() { const s = this.active && this.s[this.active]; return s ? this._el(s).currentTime || 0 : 0; }
  // book a show: src 'film' (filmId from the catalogue) or 'own' (whatever loadFile/loadLocal/loadURL prepared); starts after delayMs
  book(id, src, filmId, delayMs, playerSeat, userTitle) {
    const s = this.s[id]; if (this.active && this.active !== id) this._abort(this.active); if (s.state !== 'idle') this._abort(id);
    s.src = src === 'film' ? 'film' : (this.own && this.own.src) || 'user'; s.filmId = filmId || FEATURED[id]; s.userTitle = userTitle; s.track = null; s.credits = false; s.pic = false;
    if (s.src === 'film') { const f = filmById(s.filmId); this.stream.src = f.url; this.stream.load(); loadTrack(s.filmId).then((tr) => { s.track = tr; }); }
    else if (s.src === 'link') { this.stream.src = this.own.url; this.stream.load(); }
    try { this._el(s).pause(); this._el(s).currentTime = 0; } catch (e) {}
    this.active = id; s.state = 'pending'; s.startAt = this.now + Math.max(9000, delayMs); s.booked = true; this.crowd.clearAudience(id);
    const n = Math.min(this.engine.preset.crowd, Math.round(s.hall.seats.length * rnd(0.45, 0.7)));
    this.crowd.planAudience(id, n, delayMs < 20000 ? 0.75 : 0.45, Math.max(6000, delayMs * 0.8), new Set([playerSeat]));
    this._slide(s);
  }
  _abort(id) { const s = this.s[id]; try { this._el(s).pause(); } catch (e) {} if (this.active === id) this.active = null; this.director.stop(id); this.sound.stopFilm(s.hall.key); s.state = 'idle'; s.booked = false; this._idle(s); this.crowd.clearAudience(id); }
  _idle(s) { const u = s.hall.picMat.uniforms; u.map.value = s.hall.slate; u.uRaw.value = 0; u.uGain.value = 0.3; u.uHole.value = 0; u.uBox.value.set(0, 0, 1, 1); if (s.hall.curtains) s.hall.curtains.target = 0; s.pic = false; }
  _slide(s) { const u = s.hall.picMat.uniforms; u.map.value = s.pre.tex; u.uRaw.value = 0; u.uGain.value = 0.75; u.uHole.value = 0; u.uBox.value.set(0, 0, 1, 1); s.pic = false; }
  _fit(s, aspect) {   // letterbox / pillarbox the picture inside the screen
    const A = s.hall.cfg.aspect, b = s.hall.picMat.uniforms.uBox.value; if (aspect > A) { const hh = A / aspect; b.set(0, (1 - hh) / 2, 1, hh); } else { const ww = aspect / A; b.set((1 - ww) / 2, 0, ww, 1); }
  }
  _begin(id) {   // lights down, curtains open, the opening cards ("LUMIÈRE PRESENTS", the title) while the film buffers, then the picture
    const s = this.s[id], h = s.hall; s.state = 'dimming'; s.phaseAt = this.now; s.opening = this.now; if (h.curtains) { h.curtains.target = 1; if (this.sound.listener.room === h.key) this.sound.curtain(true); } this.crowd.onShowPhase(id, 'dimming'); this.hooks.onBegin && this.hooks.onBegin(id);
    const u = h.picMat.uniforms; u.map.value = s.pre.tex; u.uRaw.value = 0; u.uGain.value = 1; u.uHole.value = 0; u.uBox.value.set(0, 0, 1, 1); s.pre.card('LUMIÈRE', 'PRESENTS', 0);
  }
  _roll(id) {
    const s = this.s[id], v = this._el(s); s.opening = 0; s.pre.card('', '', 0);
    try { v.currentTime = 0; } catch (e) {} const p = v.play(); if (p && p.catch) p.catch(() => { this.hooks.onError && this.hooks.onError(s.src); this._abort(id); });
    const show = () => { if (s.state !== 'dimming' && s.state !== 'playing') return; this._fit(s, (v.videoWidth / v.videoHeight) || 16 / 9); s.pic = true; s.state = 'playing'; s.phaseAt = this.now;
      if (s.src === 'user') this.director.startLive(id, this.now); else { const go = () => { if (s.track) this.director.startTrack(id, s.track.cues, () => v.currentTime); }; if (s.track) go(); else loadTrack(s.filmId).then((tr) => { s.track = tr; go(); }); }
      this.hooks.onPicture && this.hooks.onPicture(id); };
    if ('requestVideoFrameCallback' in v) v.requestVideoFrameCallback(() => show()); else v.addEventListener('playing', () => setTimeout(show, 150), { once: true });
  }
  _finish(id, applause) {
    const s = this.s[id]; if (s.state !== 'playing' && s.state !== 'dimming') return; try { this._el(s).pause(); } catch (e) {} if (applause) this.crowd.onFilmEvent(id, { type: 'end', k: 1 });
    this.director.stop(id); this.sound.stopFilm(s.hall.key); s.state = 'ending'; s.phaseAt = this.now; this._slide(s); s.pre.draw(t('show.ended').toUpperCase(), null, [this.title(id)]); if (s.hall.curtains) { s.hall.curtains.target = 0; if (this.sound.listener.room === s.hall.key) this.sound.curtain(false); } this.hooks.onEnd && this.hooks.onEnd(id, applause || s.credits);
  }
  update(dt, now, room, vis) {
    this.now = now; this.vis = vis;
    for (const id in this.s) {
      const s = this.s[id], h = s.hall, visible = vis.has(h.key);
      if (s.state === 'pending') { if (visible && now - (s._pd || 0) > 500) { s._pd = now; s.pre.draw(this.title(id), (s.startAt - now) / 1000, [t('kind.' + h.cfg.kind), h.cfg.name]); } if (now >= s.startAt - 8000) { s.state = 'preshow'; s.phaseAt = now; s.pre.draw(t('pre.soon'), null, [this.title(id)]); } }
      else if (s.state === 'preshow') { if (visible && now - (s._pd || 0) > 500) { s._pd = now; s.pre.draw('\u{1F4F5}  ' + (this.hooks.silenceText ? this.hooks.silenceText() : 'Silence your phone'), (s.startAt - now) / 1000, [this.title(id)]); } if (now >= s.startAt) this._begin(id); }
      else if (s.state === 'dimming' && s.opening) { const k = (now - s.opening) / 1000; if (k < 5) s.pre.card('LUMIÈRE', 'PRESENTS', Math.min(1, (k - 1) / 1.2) * Math.min(1, (5 - k) / 0.8)); else if (k < 10) s.pre.card(this.title(id).toUpperCase(), '', Math.min(1, (k - 5.4) / 1.2) * Math.min(1, (10 - k) / 0.8), 0.09); else this._roll(id); }
      else if (s.state === 'playing' && s.src === 'film' && s.track && !s.credits && s.track.end > 0 && this.stream.currentTime >= s.track.end) { s.credits = true; this.crowd.onFilmEvent(id, { type: 'end', k: 1 }); this.hooks.onCredits && this.hooks.onCredits(id); }
      else if (s.state === 'ending' && now - s.phaseAt > 9000) { s.state = 'ended'; s.phaseAt = now; }
      else if (s.state === 'ended' && now - s.phaseAt > 25000) { s.state = 'idle'; s.booked = false; this._idle(s); }
      // house light level eases toward the phase target (the credits bring them up to a third)
      const want = s.credits && s.state === 'playing' ? LIGHT.credits : LIGHT[s.state] ?? 1, rate = s.state === 'dimming' ? 0.6 : s.state === 'ending' || s.state === 'ended' || s.credits ? 0.35 : 1.2; s.light += (want - s.light) * (1 - Math.exp(-dt * rate * 1.6));
      h.room.U.uHouse.value = s.light;
      // screen light: what the picture throws into the room (the film's offline light track, or your video's sampled colour)
      let sc = [0.1, 0.1, 0.12], g = 0.8;
      if (s.state === 'playing' && s.pic) { if (s.src === 'film' && s.track) { const L = lightAt(s.track, this.stream.currentTime, this.light).avg; sc = [L.r, L.g, L.b]; } else if (s.src === 'user') sc = [this.userSpill.r, this.userSpill.g, this.userSpill.b]; else sc = [0.18, 0.18, 0.2]; g = 3.2; }
      else if (s.state === 'pending' || s.state === 'preshow' || s.state === 'ending') { sc = [0.12, 0.11, 0.14]; g = 1.6; }
      h.room.U.uScreen.value.setRGB(sc[0] * g, sc[1] * g, sc[2] * g);
    }
    // your own video: sample its colour asynchronously (never a synchronous GPU read-back: that stalls phones)
    const us = this.active && this.s[this.active]; if (us && us.src === 'user' && us.state === 'playing' && this.spillOk && !this._spillBusy && now - this._spillT > 400 && this.user.readyState >= 2 && window.createImageBitmap) {
      this._spillT = now; this._spillBusy = true;
      createImageBitmap(this.user, { resizeWidth: 8, resizeHeight: 4, resizeQuality: 'low' }).then((bm) => { try { this.spillG.drawImage(bm, 0, 0); bm.close && bm.close(); const d = this.spillG.getImageData(0, 0, 8, 4).data; let r = 0, g = 0, b = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; } const n = (d.length / 4) * 255; this.userSpill = { r: (r / n) ** 2.2, g: (g / n) ** 2.2, b: (b / n) ** 2.2, lum: (0.2126 * r + 0.7152 * g + 0.0722 * b) / n }; } catch (e) { this.spillOk = false; } this._spillBusy = false; }).catch(() => { this.spillOk = false; this._spillBusy = false; });
    }
  }
  // per frame, after the camera moved: put the video layer on the screen (or hide it)
  frame(camera, vw, vh) {
    const s = this.active && this.s[this.active], on = s && s.pic && (s.state === 'playing' || s.state === 'dimming'), lay = on ? this.layers[s.src === 'user' ? 'user' : 'stream'] : null;
    for (const k in this.layers) if (this.layers[k] !== lay) this.layers[k].hide();
    if (!lay) return; const u = s.hall.picMat.uniforms;
    const ok = this.vis.has(s.hall.key) && lay.update(camera, pictureCorners(s.hall, u.uBox.value, this._corners), vw, vh);
    if (!ok) lay.hide(); u.uHole.value = ok ? 1 : 0; u.uGain.value = 0;
  }
  // the brightness the director uses to spot white flashes (your own video only)
  get lum() { return this.userSpill.lum; }
  // tablet remote (Quick mode and the seat service): playback controls for the show you booked
  control(cmd, arg) {
    const s = this.active && this.s[this.active]; if (!s || (s.state !== 'playing' && s.state !== 'dimming')) return false; const v = this._el(s);
    if (cmd === 'pause') v.pause(); else if (cmd === 'play') v.play().catch(() => {}); else if (cmd === 'seek') { try { v.currentTime = Math.max(0, Math.min((v.duration || 0) - 0.5, arg)); } catch (e) {} this.director.seek(this.active); }
    else if (cmd === 'speed') v.playbackRate = arg; else if (cmd === 'stop') this._finish(this.active, false);
    return true;
  }
  playback() { const s = this.active && this.s[this.active]; if (!s) return null; const v = this._el(s); return { id: s.id, t: v.currentTime || 0, dur: v.duration || 0, paused: v.paused, rate: v.playbackRate, src: s.src, filmId: s.filmId, el: v }; }
  pause(on) { const s = this.active && this.s[this.active]; if (s && this.isOn(s.id)) { const v = this._el(s); if (on) v.pause(); else v.play().catch(() => {}); } }
}
