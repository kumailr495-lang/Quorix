// LUMIERE v4 shows - what each of the three screens is doing.
// One <video> carries the guest's own film (gallery file or link); the other screens run procedural house presentations.
// A show goes: pending (countdown) -> dimming (house lights down, curtains open, cheer) -> playing (picture) -> ended (applause, lights up) -> idle.
import * as THREE from 'three';
import { makeHouseFilm, makeCanvas } from './textures.js';
import { HALL_NEAR } from './sound.js';
export const PROGRAMME = { I: { title: 'The Long Night', scene: 'city' }, II: { title: 'Velvet Hour', scene: 'sea' }, III: { title: 'A Quiet Room', scene: 'rain' } };
const AUTO = { I: { first: 210, crowd: 14, pre: 6 }, II: { first: 75, crowd: 10, pre: 8 }, III: { first: 40, crowd: 14, pre: 9 } };
const rnd = (a, b) => a + Math.random() * (b - a);
export class Shows {
  constructor(world, sound, crowd, hooks = {}) {
    this.world = world; this.sound = sound; this.crowd = crowd; this.hooks = hooks; this.userHall = null; this.vtex = null; this.objUrl = null; this.now = 0;
    const v = this.video = document.createElement('video'); v.playsInline = true; v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', ''); v.preload = 'auto'; v.crossOrigin = 'anonymous'; v.style.display = 'none'; document.body.appendChild(v);
    v.addEventListener('ended', () => { if (this.userHall) this.end(this.userHall, true); });
    v.addEventListener('error', () => { if (this.userHall) { this.hooks.onError && this.hooks.onError(); this.end(this.userHall, false); } });
    this.s = {}; for (const h of world.halls) { const id = h.cfg.id; this.s[id] = { id, hall: h, state: 'idle', mode: null, title: PROGRAMME[id].title, house: null, startAt: 0, phaseAt: 0, auto: true, nextAuto: AUTO[id].first * 1000, booked: false }; }
    // the spill canvas is CPU-backed (willReadFrequently), so reading its 8x4 pixels back is cheap
    this.spillC = makeCanvas(8, 4); this.spillG = this.spillC.getContext('2d', { willReadFrequently: true }); this.spillOk = true; this._spillT = 0; this.spill = { r: 1, g: 0.85, b: 0.7, lum: 0.5 };
  }
  // ---- guest film
  loadFile(file) { if (this.objUrl) URL.revokeObjectURL(this.objUrl); this.objUrl = URL.createObjectURL(file); this.video.src = this.objUrl; this.video.load(); }
  loadURL(url) { this.video.src = url; this.video.load(); }
  // ---- queries
  get(id) { return this.s[id]; }
  isPlaying(id) { const s = this.s[id]; return !!s && (s.state === 'playing' || s.state === 'dimming'); }
  countdown(id) { const s = this.s[id]; return s && s.state === 'pending' ? Math.max(0, (s.startAt - this.now) / 1000) : 0; }
  // seat the opening audience in every hall (called once at boot)
  prime() { for (const id in this.s) this.crowd.fillHall(id, AUTO[id].pre, true); }
  // book a show: mode 'user' (the video element) or 'house'; starts after delayMs. Replaces whatever that screen was doing.
  book(id, mode, title, delayMs, playerSeat) {
    const s = this.s[id]; if (s.state !== 'idle') this._abort(id);
    if (mode === 'user') { if (this.userHall && this.userHall !== id) this._abort(this.userHall); this.userHall = id; try { this.video.pause(); this.video.currentTime = 0; } catch (e) {} }
    s.mode = mode; s.title = title; s.state = 'pending'; s.startAt = this.now + delayMs; s.auto = false; s.booked = true; if (s.house && s.house.title !== title) s.house = null;
    if (this.crowd.viewers(id).length < 10) this.crowd.fillHall(id, AUTO[id].crowd - this.crowd.viewers(id).length, false, playerSeat);
  }
  _abort(id) { const s = this.s[id]; if (s.mode === 'user') { try { this.video.pause(); } catch (e) {} if (this.userHall === id) this.userHall = null; this.sound.setFilm(null, false); } s.state = 'idle'; s.hall.screen.showIdle(); s.hall.setPlaying(false); this.sound.setHallBusy(s.hall.key, false); }
  _begin(id) {
    const s = this.s[id]; s.state = 'dimming'; s.phaseAt = this.now; s.hall.setPlaying(true); this.crowd.onFilmStart(id); this.sound.setHallBusy(s.hall.key, true); this.hooks.onBegin && this.hooks.onBegin(id);
    if (s.mode === 'user') { this.sound.attachVideo(this.video); this.sound.setFilm(s.hall.key, true); const v = this.video; try { v.currentTime = 0; } catch (e) {} const p = v.play(); if (p && p.catch) p.catch(() => { this.hooks.onError && this.hooks.onError(); this.end(id, false); });
      const show = () => { if (s.state !== 'dimming' && s.state !== 'playing') return; if (!this.vtex) { this.vtex = new THREE.VideoTexture(v); this.vtex.colorSpace = THREE.SRGBColorSpace; this.vtex.minFilter = THREE.LinearFilter; this.vtex.generateMipmaps = false; } s.hall.screen.show(this.vtex, (v.videoWidth / v.videoHeight) || 16 / 9); s.state = 'playing'; this.hooks.onPicture && this.hooks.onPicture(id); };
      if ('requestVideoFrameCallback' in v) v.requestVideoFrameCallback(() => show()); else v.addEventListener('playing', () => setTimeout(show, 200), { once: true }); }
    else { const P = PROGRAMME[id]; if (!s.house) { s.house = makeHouseFilm(s.title, s.title === P.title ? P.scene : ['city', 'sea', 'rain'][Object.keys(PROGRAMME).indexOf(id)], 150); s.house.title = s.title; } }
  }
  end(id, applause) {
    const s = this.s[id]; if (s.state === 'idle' || s.state === 'ended') return; const wasUser = s.mode === 'user';
    s.state = 'ended'; s.phaseAt = this.now; s.hall.screen.showIdle(); s.hall.setPlaying(false); this.sound.setHallBusy(s.hall.key, false);
    if (wasUser) { try { this.video.pause(); } catch (e) {} this.sound.setFilm(null, false); if (this.userHall === id) this.userHall = null; }
    if (applause) this.crowd.onFilmEnd(id); this.hooks.onEnd && this.hooks.onEnd(id, applause);
  }
  update(dt, now, room, visible) {
    this.now = now; let scoreHall = null;
    for (const id in this.s) { const s = this.s[id], vis = visible.has(s.hall.key);
      if (s.state === 'idle' && s.auto && now > s.nextAuto) { const want = AUTO[id].crowd - this.crowd.viewers(id).length; if (want > 0) this.crowd.fillHall(id, want, false); s.mode = 'house'; s.title = PROGRAMME[id].title; s.state = 'pending'; s.startAt = now + 40000; }
      else if (s.state === 'pending' && now >= s.startAt) this._begin(id);
      else if (s.state === 'dimming' && s.mode === 'house' && now - s.phaseAt > 2600) { s.house.start(now); s.house.draw(now); s.hall.screen.show(s.house.tex, 640 / 270); s.state = 'playing'; s.phaseAt = now; this.hooks.onPicture && this.hooks.onPicture(id); }
      else if (s.state === 'playing' && s.mode === 'house') { if (vis && now - (s._hd || 0) > 80) { s._hd = now; s.house.draw(now); } if (now - s.phaseAt > s.house.length * 1000) this.end(id, true); }
      else if (s.state === 'ended' && now - s.phaseAt > 12000) { s.state = 'idle'; s.booked = false; s.auto = true; s.nextAuto = now + rnd(35, 70) * 1000; }
      if (s.state === 'playing' && s.mode === 'house' && (room === s.hall.key || room === HALL_NEAR[s.hall.key])) scoreHall = s.hall.key; }
    this.sound.setScore(scoreHall);
    // light spill from the picture of the hall the player is in - never a synchronous GPU readback (that stalls the frame on phones):
    // house films report their average colour, the guest's video is sampled asynchronously through createImageBitmap at 8x4.
    const here = Object.values(this.s).find((s) => s.hall.key === room && s.state === 'playing');
    if (here && here.mode === 'house') { const a = here.house.avg; this.spill = { r: a.r, g: a.g, b: a.b, lum: a.lum }; }
    else if (here && here.mode === 'user' && this.spillOk && !this._spillBusy && now - this._spillT > 500 && this.video.readyState >= 2 && window.createImageBitmap) {
      this._spillT = now; this._spillBusy = true;
      createImageBitmap(this.video, { resizeWidth: 8, resizeHeight: 4, resizeQuality: 'low' }).then((bm) => { try { this.spillG.drawImage(bm, 0, 0); bm.close && bm.close(); const d = this.spillG.getImageData(0, 0, 8, 4).data; let r = 0, g = 0, b = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; } const n = (d.length / 4) * 255; this.spill = { r: r / n, g: g / n, b: b / n, lum: (0.2126 * r + 0.7152 * g + 0.0722 * b) / n }; } catch (e) { this.spillOk = false; } this._spillBusy = false; }).catch(() => { this.spillOk = false; this._spillBusy = false; });
    }
    return here || null;
  }
  pause(on) { if (this.userHall && this.isPlaying(this.userHall)) { if (on) this.video.pause(); else this.video.play().catch(() => {}); } }
}
