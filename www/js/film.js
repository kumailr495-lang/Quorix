// LUMIERE v5 - what each screen is doing. A show goes:
//   idle (house lights up, slate) -> pending (audience arrives, countdown slide) -> preshow (lights at half, "silence your phone")
//   -> dimming (lights down, curtains open) -> playing (picture; reactions follow the film's events) -> ending (credits, lights at half) -> ended (lights up, people leave) -> idle
// One <video> carries your own film (gallery file or link); house films (films.js) play only when you book one. v7: no automatic shows,
// so a hall is empty and its screen shows the slate unless you booked it (phone feedback: films played by themselves, audiences sat in empty halls).
import * as THREE from 'three';
import { makeHouseFilm, makePreshow, PROGRAMME, HOUSE } from './films.js';
import { makeCanvas } from './textures.js';
import { t, fmtTime } from './i18n.js';
const rnd = (a, b) => a + Math.random() * (b - a);
const LIGHT = { idle: 1, pending: 1, preshow: 0.45, dimming: 0.04, playing: 0.025, ending: 0.4, ended: 1 };
export class Shows {
  constructor(world, sound, crowd, director, engine, hooks = {}) {
    this.world = world; this.sound = sound; this.crowd = crowd; this.director = director; this.engine = engine; this.hooks = hooks; this.userHall = null; this.vtex = null; this.objUrl = null; this.now = 0;
    const v = this.video = document.createElement('video'); v.playsInline = true; v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', ''); v.preload = 'auto'; v.crossOrigin = 'anonymous'; v.style.display = 'none'; document.body.appendChild(v);
    v.addEventListener('ended', () => { if (this.userHall) this._finish(this.userHall, true); });
    v.addEventListener('error', () => { if (this.userHall && this.s[this.userHall].mode === 'user' && this.s[this.userHall].state !== 'idle') { this.hooks.onError && this.hooks.onError(); this._abort(this.userHall); } });
    this.s = {}; let k = 0;
    for (const h of world.halls) { const id = h.id; this.s[id] = { id, hall: h, state: 'idle', mode: null, filmId: PROGRAMME[id], house: null, startAt: 0, phaseAt: 0, auto: false, nextAuto: rnd(25, 70) * 1000 + k * 20000, booked: false, light: 1, pre: makePreshow(h.cfg.aspect) }; k++; }
    this.spillC = makeCanvas(8, 4); this.spillG = this.spillC.getContext('2d', { willReadFrequently: true }); this.spillOk = true; this._spillT = 0; this.spill = { r: 0, g: 0, b: 0, lum: 0 }; this.userSpill = { r: 0.3, g: 0.3, b: 0.3, lum: 0.3 };
  }
  loadFile(file) { if (this.objUrl) URL.revokeObjectURL(this.objUrl); this.objUrl = URL.createObjectURL(file); this.video.src = this.objUrl; this.video.load(); }
  loadURL(url) { this.video.src = url; this.video.load(); }
  get(id) { return this.s[id]; }
  isOn(id) { const s = this.s[id]; return !!s && (s.state === 'playing' || s.state === 'dimming'); }
  countdown(id) { const s = this.s[id]; return s && s.state === 'pending' ? Math.max(0, (s.startAt - this.now) / 1000) : 0; }
  title(id) { const s = this.s[id]; return s.mode === 'user' ? (s.userTitle || '') : HOUSE[s.filmId].title; }
  // book: mode 'house' (filmId) or 'user' (the video element); begins after delayMs (plus a short pre-show)
  book(id, mode, filmId, delayMs, playerSeat, userTitle) {
    const s = this.s[id]; if (s.state !== 'idle') this._abort(id);
    if (mode === 'user') { if (this.userHall && this.userHall !== id) this._abort(this.userHall); this.userHall = id; try { this.video.pause(); this.video.currentTime = 0; } catch (e) {} }
    s.mode = mode; s.filmId = filmId || PROGRAMME[id]; s.userTitle = userTitle; s.state = 'pending'; s.startAt = this.now + Math.max(9000, delayMs); s.auto = false; s.booked = true; s.house = null; this.crowd.clearAudience(id);
    const H = s.hall.cfg, n = Math.min(this.engine.preset.crowd, Math.round(s.hall.seats.length * rnd(0.45, 0.7)));
    this.crowd.planAudience(id, n, delayMs < 20000 ? 0.75 : 0.45, Math.max(6000, delayMs * 0.8), new Set([playerSeat]));
    this._slide(s);
  }
  _abort(id) { const s = this.s[id]; if (s.mode === 'user') { try { this.video.pause(); } catch (e) {} if (this.userHall === id) this.userHall = null; } this.director.stop(id); this.sound.stopFilm(s.hall.key); s.state = 'idle'; s.nextAuto = this.now + rnd(60, 120) * 1000; this._idle(s); this.crowd.clearAudience(id); }
  _idle(s) { const h = s.hall; h.picMat.uniforms.map.value = h.slate; h.picMat.uniforms.uRaw.value = 0; h.picMat.uniforms.uGain.value = 0.3; h.picMat.uniforms.uBox.value.set(0, 0, 1, 1); if (h.curtains) h.curtains.target = 0; }
  _slide(s) { const h = s.hall, p = s.pre; h.picMat.uniforms.map.value = p.tex; h.picMat.uniforms.uRaw.value = 0; h.picMat.uniforms.uGain.value = 0.75; h.picMat.uniforms.uBox.value.set(0, 0, 1, 1); }
  _fit(s, aspect) {   // letterbox / pillarbox the picture inside the screen
    const A = s.hall.cfg.aspect, b = s.hall.picMat.uniforms.uBox.value; if (aspect > A) { const hh = A / aspect; b.set(0, (1 - hh) / 2, 1, hh); } else { const ww = aspect / A; b.set((1 - ww) / 2, 0, ww, 1); }
  }
  _begin(id) {   // lights down, curtains open, picture starts
    const s = this.s[id], h = s.hall; s.state = 'dimming'; s.phaseAt = this.now; if (h.curtains) h.curtains.target = 1; this.crowd.onShowPhase(id, 'dimming'); this.hooks.onBegin && this.hooks.onBegin(id);
    if (s.mode === 'user') {
      this.sound.startFilm(h.key, { video: this.video }); const v = this.video; try { v.currentTime = 0; } catch (e) {} const p = v.play(); if (p && p.catch) p.catch(() => { this.hooks.onError && this.hooks.onError(); this._abort(id); });
      const show = () => { if (s.state !== 'dimming' && s.state !== 'playing') return; if (!this.vtex) { const mip = this.engine.preset.detail > 0; this.vtex = new THREE.VideoTexture(v); this.vtex.colorSpace = THREE.SRGBColorSpace; this.vtex.generateMipmaps = mip; this.vtex.minFilter = mip ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter; this.vtex.anisotropy = mip ? 4 : 1; }   // mipmaps: no shimmer when the screen is far
        h.picMat.uniforms.map.value = this.vtex; h.picMat.uniforms.uRaw.value = 1; h.picMat.uniforms.uGain.value = 1; this._fit(s, (v.videoWidth / v.videoHeight) || 16 / 9); s.state = 'playing'; s.phaseAt = this.now; this.director.startLive(id, this.now); this.hooks.onPicture && this.hooks.onPicture(id); };
      if ('requestVideoFrameCallback' in v) v.requestVideoFrameCallback(() => show()); else v.addEventListener('playing', () => setTimeout(show, 200), { once: true });
    } else { s.house = makeHouseFilm(s.filmId, h.cfg.aspect); }
  }
  _finish(id, applause) {
    const s = this.s[id]; if (s.state !== 'playing' && s.state !== 'dimming') return; if (s.mode === 'user') { try { this.video.pause(); } catch (e) {} if (this.userHall === id) this.userHall = null; this.crowd.onFilmEvent(id, { type: 'end', k: 1 }); }
    this.director.stop(id); this.sound.stopFilm(s.hall.key); s.state = 'ending'; s.phaseAt = this.now; this._slide(s); s.pre.draw(t('show.ended').toUpperCase(), null, [this.title(id)]); if (s.hall.curtains) s.hall.curtains.target = 0; this.hooks.onEnd && this.hooks.onEnd(id, applause);
  }
  update(dt, now, room, vis) {
    this.now = now;
    for (const id in this.s) {
      const s = this.s[id], h = s.hall, visible = vis.has(h.key);
      if (s.state === 'idle' && s.auto && now > s.nextAuto) { s.mode = 'house'; s.filmId = PROGRAMME[id]; s.state = 'pending'; s.startAt = now + rnd(45, 75) * 1000; this.crowd.clearAudience(id); this.crowd.planAudience(id, Math.min(this.engine.preset.crowd, Math.round(h.seats.length * rnd(0.3, 0.6))), 0.35, 40000); this._slide(s); }
      else if (s.state === 'pending') { if (visible && now - (s._pd || 0) > 500) { s._pd = now; s.pre.draw(this.title(id), (s.startAt - now) / 1000, [t('kind.' + h.cfg.kind), h.cfg.name]); } if (now >= s.startAt - 8000) { s.state = 'preshow'; s.phaseAt = now; s.pre.draw(t('pre.soon'), null, [this.title(id)]); } }
      else if (s.state === 'preshow') { if (visible && now - (s._pd || 0) > 500) { s._pd = now; s.pre.draw('\u{1F4F5}  ' + (this.hooks.silenceText ? this.hooks.silenceText() : 'Silence your phone'), (s.startAt - now) / 1000, [this.title(id)]); } if (now >= s.startAt) this._begin(id); }
      else if (s.state === 'dimming' && s.mode === 'house' && now - s.phaseAt > 3200) { s.house.start(now); s.house.draw(now); const p = h.picMat.uniforms; p.map.value = s.house.tex; p.uRaw.value = 0; p.uGain.value = 1; p.uBox.value.set(0, 0, 1, 1); s.state = 'playing'; s.phaseAt = now; this.director.startHouse(id, s.house, now); this.sound.startFilm(h.key, { house: s.filmId, t0: now }); this.hooks.onPicture && this.hooks.onPicture(id); }
      else if (s.state === 'playing' && s.mode === 'house') { if (visible && now - (s._hd || 0) > 66) { s._hd = now; s.house.draw(now); } if (now - s.phaseAt > s.house.length * 1000) this._finish(id, true); }
      else if (s.state === 'ending' && now - s.phaseAt > 9000) { s.state = 'ended'; s.phaseAt = now; }
      else if (s.state === 'ended' && now - s.phaseAt > 25000) { s.state = 'idle'; s.booked = false; this._idle(s); }
      // house light level eases toward the phase target
      const want = LIGHT[s.state] ?? 1, rate = s.state === 'dimming' ? 0.6 : s.state === 'ending' || s.state === 'ended' ? 0.35 : 1.2; s.light += (want - s.light) * (1 - Math.exp(-dt * rate * 1.6));
      h.room.U.uHouse.value = s.light;
      // screen light (what the picture throws into the room)
      let sc = [0.05, 0.05, 0.06], g = 1.0; if (s.state === 'playing') { sc = s.mode === 'house' && s.house ? [s.house.avg.r, s.house.avg.g, s.house.avg.b] : [this.userSpill.r, this.userSpill.g, this.userSpill.b]; g = 3.2; } else if (s.state === 'pending' || s.state === 'preshow' || s.state === 'ending') { sc = [0.12, 0.11, 0.14]; g = 1.6; } else { sc = [0.1, 0.1, 0.12]; g = 0.8; }
      h.room.U.uScreen.value.setRGB(sc[0] * g, sc[1] * g, sc[2] * g);
    }
    // your own video: sample its colour asynchronously (never a synchronous GPU read-back: that stalls phones)
    const us = this.userHall && this.s[this.userHall]; if (us && us.state === 'playing' && this.spillOk && !this._spillBusy && now - this._spillT > 400 && this.video.readyState >= 2 && window.createImageBitmap) {
      this._spillT = now; this._spillBusy = true;
      createImageBitmap(this.video, { resizeWidth: 8, resizeHeight: 4, resizeQuality: 'low' }).then((bm) => { try { this.spillG.drawImage(bm, 0, 0); bm.close && bm.close(); const d = this.spillG.getImageData(0, 0, 8, 4).data; let r = 0, g = 0, b = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; } const n = (d.length / 4) * 255; this.userSpill = { r: (r / n) ** 2.2, g: (g / n) ** 2.2, b: (b / n) ** 2.2, lum: (0.2126 * r + 0.7152 * g + 0.0722 * b) / n }; } catch (e) { this.spillOk = false; } this._spillBusy = false; }).catch(() => { this.spillOk = false; this._spillBusy = false; });
    }
  }
  pause(on) { if (this.userHall && this.isOn(this.userHall)) { if (on) this.video.pause(); else this.video.play().catch(() => {}); } }
}
