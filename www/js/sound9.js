// LUMIERE v9 sound, on top of the v8 synthesis (sound.js):
//  * a low-latency context (v8 used 'playback': taps and picture drifted from the sound on phones);
//  * the film through "Lumière Sphere": the picture's stereo is spread over virtual speakers placed in the hall (screen left, centre and
//    right, both side walls, the rear corners and four overhead), heard from where your head is and how it is turned, so turning your
//    head moves the sound like in a real room;
//  * volume up to 250 %: the gain goes before a brick-wall limiter, so loud never means clipped;
//  * real recordings (BigSoundBank, CC0) for applause, cheering, the lobby murmur, the street, escalators, the lift, the popcorn machine,
//    toilets, taps and the taxi; the v8 formant voices stay only for laughs and screams, quieter (no CC0 recordings of those were reachable).
import { Sound } from './sound.js';
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), rnd = (a, b) => a + Math.random() * (b - a);
const FILES = ['applause_s', 'applause_m', 'applause_l', 'cheer1', 'cheer2', 'murmur', 'gasp_f', 'flush', 'tap', 'lid', 'car_door', 'car_door_in', 'car_ride', 'car_start', 'escalator', 'lift', 'beep', 'ticket', 'popcorn', 'street', 'lounge'];
export class Sound9 extends Sound {
  constructor() { super(); this.buf = {}; this.loops = {}; this.sphere = null; this.boost = 1; }
  _build() {
    this.latency = 'interactive'; super._build(); const c = this.ctx;
    // limiter after the master: -1 dBFS ceiling, so the film's boost (up to 2.5x) never clips
    const lim = c.createDynamicsCompressor(); lim.threshold.value = -1.5; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.002; lim.release.value = 0.12;
    this.master.disconnect(); const pre = c.createDynamicsCompressor(); pre.threshold.value = -14; pre.ratio.value = 3; pre.attack.value = 0.008; pre.release.value = 0.25; this.master.connect(pre); pre.connect(lim); lim.connect(c.destination);
    // the synth murmur and lounge tones give way to the recordings
    for (const g of [this.murA, this.murB]) g.disconnect();
    this._loadAll();
  }
  async _loadAll() {
    await Promise.all(FILES.map(async (n) => { try { const r = await fetch(`snd/${n}.ogg`); if (!r.ok) return; this.buf[n] = await this.ctx.decodeAudioData(await r.arrayBuffer()); } catch (e) { /* the synth stands in */ } }));
    for (const [n, dest] of [['murmur', this.master], ['lounge', this.master], ['street', this.master], ['escalator', this.master], ['popcorn', this.master]]) this._loop(n, dest);
  }
  _loop(n, dest) { const b = this.buf[n]; if (!b || this.loops[n]) return; const c = this.ctx, s = c.createBufferSource(), g = c.createGain(); s.buffer = b; s.loop = true; g.gain.value = 0; s.connect(g); g.connect(dest); s.start(0, Math.random() * b.duration); this.loops[n] = g; }
  _ambientTick() {
    super._ambientTick(); if (!this.ready || this.muted) return; const a = this.listener, t = this.ctx.currentTime, L = this.loops, inHall = a.room && a.room.startsWith('hall'), dark = a.dark;
    const set = (n, v, tau = 0.8) => { if (L[n]) L[n].gain.setTargetAtTime(v, t, tau); };
    set('murmur', a.room === 'lobby' ? 0.08 + 0.22 * (a.people || 0) : a.room === 'corridor' ? 0.03 : inHall && !dark ? 0.1 * (a.people || 0) : 0);
    set('lounge', a.room === 'lobby' ? 0.05 : a.room === 'wc' ? 0.015 : 0, 1.5);
    set('street', a.room === 'street' ? 0.5 : a.room === 'lobby' ? 0.08 * clamp(1 - Math.abs(18 - a.z) / 14) : 0);
    set('escalator', a.room === 'lobby' ? 0.12 * clamp(1 - (a.escDist ?? 99) / 9) : 0, 0.4);
    set('popcorn', a.room === 'lobby' ? 0.25 * clamp(1 - (a.popcornDist ?? 99) / 8) : 0, 0.5);
    this.music.gain.setTargetAtTime(0, t, 0.5);   // the recorded bar ambience replaces the synth lounge chords
  }
  _pops() {}
  // ---------------- one-shots from recordings (fall back to the synth) ----------------
  play(n, o = {}) {
    if (!this.ready || this.muted) return null; const b = this.buf[n]; if (!b) return null; const c = this.ctx, s = c.createBufferSource(), g = c.createGain(), t = c.currentTime + (o.when || 0);
    s.buffer = b; s.playbackRate.value = o.rate || 1; g.gain.value = o.gain ?? 0.6; s.connect(g);
    if (o.x != null && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = this._panFor(o.x, o.z); g.connect(p); p.connect(o.bus || this.master); } else g.connect(o.bus || this.master);
    if (o.fadeIn) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.gain ?? 0.6, t + o.fadeIn); }
    s.start(t, o.offset || 0); if (o.dur) { g.gain.setTargetAtTime(0.0001, t + o.dur, 0.4); s.stop(t + o.dur + 2); } return { s, g };
  }
  flush() { if (!this.play('flush', { gain: 0.5, dur: 9 })) super.flush(); }
  water(sec = 2.6) { if (!this.play('tap', { gain: 0.5, dur: sec })) super.water(sec); }
  lock() { if (!this.play('lid', { gain: 0.35, dur: 1.2 })) super.lock(); }
  pay() { if (!this.play('beep', { gain: 0.35 })) super.pay(); }
  ticket() { if (!this.play('ticket', { gain: 0.45 })) super.ticket(); }
  carDoor(inside) { this.play(inside ? 'car_door_in' : 'car_door', { gain: 0.6 }); }
  carRide(on) { if (on && !this._ride) this._ride = this.play('car_ride', { gain: 0.35, fadeIn: 1.2, dur: 22 }); else if (!on && this._ride) { try { this._ride.g.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.5); } catch (e) { /* ended */ } this._ride = null; } }
  liftHum() { this.play('lift', { gain: 0.35, dur: 6 }); }
  ding() { this.chime(); }
  // ---------------- crowd: recorded applause and cheering, a recorded gasp; laughs and screams stay synthetic and quieter ----------------
  crowd(type, n, k, x, z, inRoom) {
    if (!this.ready || this.muted) return; const lvl = 0.6 + 0.4 * (k ?? 1), bus = this.crowdIn;
    if (type === 'applause' || type === 'end') { const name = n < 25 ? 'applause_s' : n < 110 ? 'applause_m' : 'applause_l'; if (this.play(name, { gain: 0.55 * lvl, x, z, bus, fadeIn: 0.25, rate: rnd(0.97, 1.03) })) return; }
    if (type === 'cheer' || type === 'climax') { if (this.play(Math.random() < 0.5 ? 'cheer1' : 'cheer2', { gain: 0.35 * lvl, x, z, bus, rate: rnd(0.95, 1.05) })) { this.play('applause_s', { gain: 0.3 * lvl, x, z, bus, when: 0.4 }); return; } }
    if (type === 'gasp' || type === 'wow') { for (let i = 0; i < Math.min(4, 1 + Math.floor(n / 25)); i++) this.play('gasp_f', { gain: 0.12 * lvl, x: x + rnd(-6, 6), z: z + rnd(-6, 6), bus, rate: rnd(0.8, 1.15), when: rnd(0, 0.25) }); return; }
    super.crowd(type, Math.max(1, Math.round(n * 0.55)), (k ?? 1) * 0.75, x, z, inRoom);
  }
  // ---------------- the film: "Lumière Sphere" ----------------
  // speakers: [x, y, z, feed] in world metres; feed L, R, C (mid), S (side difference, decorrelated), T (overhead, high band)
  sphereFor(hall) {
    const H = hall.cfg, y0 = H.y0, W = H.W, w = H.width, S = [], P = (u, d, y, f, g = 1) => { const p = H.toWorld(u, d); S.push([p.x, y0 + y, p.z, f, g]); };
    P(-W * 0.4, 0, H.hB + H.H * 0.5, 'L'); P(0, 0, H.hB + H.H * 0.5, 'C'); P(W * 0.4, 0, H.hB + H.H * 0.5, 'R');
    for (const s of [-1, 1]) { P(s * w / 2, H.depthIn * 0.35, H.total * 0.6 + 2.6, s < 0 ? 'SL' : 'SR', 0.8); P(s * w / 2, H.depthIn * 0.7, H.total * 0.8 + 2.6, s < 0 ? 'SL' : 'SR', 0.8); P(s * w * 0.42, H.depthIn, H.total + 2.4, s < 0 ? 'SL' : 'SR', 0.7); }
    for (const [u, d] of [[-0.3, 0.25], [0.3, 0.25], [-0.3, 0.7], [0.3, 0.7]]) P(u * w, d * H.depthIn, H.ceil - 0.4, u < 0 ? 'TL' : 'TR', 0.45);
    return S;
  }
  startFilm(hallKey, src) {
    if (!this.ready) { this._pendingFilm = [hallKey, src]; return; }
    if (!src || !src.video || !src.hall) return super.startFilm(hallKey, src);
    // v10 (the user: "the sound has a delay"): routed through Web Audio, the film's sound reaches the speaker after the phone's audio
    // output latency (often 100-250 ms on Android) while its picture does not wait for it. By default the film plays its own sound,
    // which the media pipeline keeps in step with the picture; its level follows the room (volume) and a captured copy feeds the
    // audience's ears (level, reactions). The speaker sphere stays as an option (Settings, surround), and once a film has been routed
    // through it this session the element's sound stays there.
    if (!this.surround && !this.videoSrc) { super.startFilm(hallKey, { direct: src.video }); this.film.video = src.video; this._tap(src.video); return; }
    this.stopFilm(); this.film = { hall: hallKey, gain: 1, nodes: [], video: src.video };
    const c = this.ctx; if (!this.videoSrc || this.videoSrc._el !== src.video) { try { this.videoSrc = c.createMediaElementSource(src.video); this.videoSrc._el = src.video; } catch (e) { console.warn('[lumiere] film audio routing failed', e); return; } }
    this.videoSrc.disconnect(); const split = c.createChannelSplitter(2), L = c.createGain(), R = c.createGain(); this.videoSrc.connect(split); split.connect(L, 0); split.connect(R, 1);
    // the hall's speakers around the listener; their mix: L R C from the front, the difference (L - R) delayed to the sides and back,
    // the high band of the mid overhead
    const sum = c.createGain(); L.connect(sum); R.connect(sum); sum.gain.value = 0.5; const diff = c.createGain(), inv = c.createGain(); inv.gain.value = -1; L.connect(diff); R.connect(inv); inv.connect(diff); diff.gain.value = 0.6;
    const dl = c.createDelay(0.05); dl.delayTime.value = 0.018; diff.connect(dl); const dr = c.createDelay(0.05); dr.delayTime.value = 0.024; const dinv = c.createGain(); dinv.gain.value = -1; diff.connect(dinv); dinv.connect(dr);
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2400; sum.connect(hp);
    const feed = { L, R, C: sum, SL: dl, SR: dr, TL: hp, TR: hp }, out = c.createGain(); out.gain.value = 1; this.film.nodes.push(split, L, R, sum, diff, inv, dl, dr, dinv, hp, out);
    for (const [x, y, z, f, g] of this.sphereFor(src.hall)) { const p = c.createPanner(); p.panningModel = 'equalpower'; p.distanceModel = 'inverse'; p.refDistance = 6; p.rolloffFactor = 0.35; p.positionX ? (p.positionX.value = x, p.positionY.value = y, p.positionZ.value = z) : p.setPosition(x, y, z);
      const gg = c.createGain(); gg.gain.value = g * (f === 'C' ? 0.75 : 0.62); feed[f].connect(gg); gg.connect(p); p.connect(out); this.film.nodes.push(p, gg); }
    // low end straight to the front (no panning: bass has no direction)
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 110; sum.connect(lp); const lg = c.createGain(); lg.gain.value = 0.8; lp.connect(lg); lg.connect(out); this.film.nodes.push(lp, lg);
    out.connect(this.filmIn); this.film.out = out; this.sphere = true;
    clearInterval(this._agcT); this._agcT = setInterval(() => this._agc(), 500);
  }
  // the audience listens to a captured copy of the film's sound (the element keeps its own output); no copy, no live reactions
  _tap(v) {
    try { if (this._tapSrc) this._tapSrc.disconnect(); this._tapSrc = null; const st = v.captureStream ? v.captureStream() : v.mozCaptureStream ? v.mozCaptureStream() : null;
      if (!st || !st.getAudioTracks().length) return; this._tapSrc = this.ctx.createMediaStreamSource(st); this._tapSrc.connect(this.an); } catch (e) { console.warn('[lumiere] film level tap unavailable', e); }
  }
  stopFilm(hallKey) { if (this._tapSrc && (!hallKey || (this.film && this.film.hall === hallKey))) { try { this._tapSrc.disconnect(); } catch (e) { /* gone */ } this._tapSrc = null; }
    if (this.film && this.film.out) { try { this.film.out.disconnect(); } catch (e) { /* gone */ } if (this.videoSrc) try { this.videoSrc.disconnect(); } catch (e) { /* gone */ } } this.sphere = null; super.stopFilm(hallKey); }
  // the listener: your head (position and turn) for the virtual speakers
  setHead(x, y, z, yaw, pitch) {
    if (!this.ready) return; const L = this.ctx.listener, fx = -Math.sin(yaw) * Math.cos(pitch), fy = Math.sin(pitch), fz = -Math.cos(yaw) * Math.cos(pitch), t = this.ctx.currentTime;
    if (L.positionX) { L.positionX.setTargetAtTime(x, t, 0.03); L.positionY.setTargetAtTime(y, t, 0.03); L.positionZ.setTargetAtTime(z, t, 0.03); L.forwardX.setTargetAtTime(fx, t, 0.03); L.forwardY.setTargetAtTime(fy, t, 0.03); L.forwardZ.setTargetAtTime(fz, t, 0.03); L.upX.value = 0; L.upY.value = 1; L.upZ.value = 0; }
    else { L.setPosition(x, y, z); L.setOrientation(fx, fy, fz, 0, 1, 0); }
  }
  // film level: 0..2.5 (250 %); the limiter keeps it clean
  setVolumes(v) { if (v && v.film != null) v.film = clamp(v.film, 0, 2.5); super.setVolumes(v); }
}
