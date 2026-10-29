// LUMIERE v4 sound - everything is synthesised or routed here (no audio files):
// room ambience, crowd murmur that follows how many people are around, applause, cheering, laughter, doors, footsteps,
// UI cues, a soft score for house shows, and the film chain (room-filtered, auto-levelled, limited).
const isHall = (r) => !!r && r.startsWith('hall');
const isCorr = (r) => r === 'c0' || r === 'wingW' || r === 'wingE';
export const HALL_NEAR = { hallI: 'c0', hallII: 'wingW', hallIII: 'wingE' };
const rnd = (a, b) => a + Math.random() * (b - a);

export class Sound {
  constructor() { this.ctx = null; this.muted = false; this.room = 'lobby'; this.seated = false; this.ready = false; this.filmHall = null; this.filmPlaying = false; this.murmurK = 0; this.scoreHall = null; this.hallBusy = {}; }
  unlock() {
    if (!this.ctx) { try { this._build(); } catch (e) { console.warn('audio unavailable', e); return; } }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }
  _noise(sec = 2) { const c = this.ctx, b = c.createBuffer(1, c.sampleRate * sec, c.sampleRate), d = b.getChannelData(0); let a = 0; for (let i = 0; i < d.length; i++) { a = a * 0.97 + (Math.random() * 2 - 1) * 0.28; d[i] = a; } return b; }
  _white(sec = 1) { const c = this.ctx, b = c.createBuffer(1, c.sampleRate * sec, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; }
  // pre-rendered loop of a theatre-full of hands: ~35 people clapping at slightly different rates
  _applauseBuffer(sec = 4) {
    const c = this.ctx, sr = c.sampleRate, n = Math.floor(sr * sec), b = c.createBuffer(2, n, sr), L = b.getChannelData(0), R = b.getChannelData(1);
    for (let p = 0; p < 35; p++) { const rate = rnd(4.2, 7.5), pan = Math.random(), amp = rnd(0.25, 0.7), bright = rnd(0.55, 0.9); let t = Math.random() / rate;
      while (t < sec) { const s0 = Math.floor(t * sr), len = Math.floor(sr * rnd(0.008, 0.016)); let hp = 0, prev = 0;
        for (let i = 0; i < len && s0 + i < n; i++) { const w = Math.random() * 2 - 1; hp = bright * (hp + w - prev); prev = w; const e = Math.exp(-i / (len * 0.28)) * amp * rnd(0.6, 1); L[s0 + i] += hp * e * (1 - pan); R[s0 + i] += hp * e * pan; }
        t += (1 / rate) * rnd(0.85, 1.15); } }
    let pk = 0; for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i])); const g = 0.9 / (pk || 1); for (let i = 0; i < n; i++) { L[i] *= g; R[i] *= g; }
    return b;
  }
  _build() {
    const AC = window.AudioContext || window.webkitAudioContext, c = this.ctx = new AC({ latencyHint: 'playback' });
    this.master = c.createGain(); this.master.gain.value = this.muted ? 0 : 0.9; this.comp = c.createDynamicsCompressor(); this.comp.threshold.value = -10; this.comp.ratio.value = 4; this.master.connect(this.comp); this.comp.connect(c.destination);
    const nb = this._noise(), mk = (type, f, q) => { const s = c.createBufferSource(); s.buffer = nb; s.loop = true; const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = c.createGain(); g.gain.value = 0; s.connect(fl); fl.connect(g); g.connect(this.master); s.start(0, Math.random() * 1.5); return g; };
    this.bed = mk('bandpass', 170, 0.5); this.murmurA = mk('bandpass', 380, 1.4); this.murmurB = mk('bandpass', 850, 2.2);
    for (const [g, f] of [[this.murmurA, 0.13], [this.murmurB, 0.21]]) { const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = f; lg.gain.value = 0.004; lfo.connect(lg); lg.connect(g.gain); lfo.start(); }
    this.hum = c.createGain(); this.hum.gain.value = 0; this.hum.connect(this.master); for (const [f, v] of [[54, 1], [108, 0.4], [162, 0.15]]) { const o = c.createOscillator(); o.frequency.value = f; const g = c.createGain(); g.gain.value = v * 0.03; o.connect(g); g.connect(this.hum); o.start(); }
    // soft score for house shows: a four-voice pad stepping through a slow minor progression
    this.score = c.createGain(); this.score.gain.value = 0; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; this.score.connect(lp); lp.connect(this.master); this.scoreOsc = [];
    for (let v = 0; v < 4; v++) { const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = 220; const g = c.createGain(); g.gain.value = 0.18; o.connect(g); g.connect(this.score); o.start(); this.scoreOsc.push(o); }
    const CH = [[110, 164.8, 220, 261.6], [87.3, 130.8, 174.6, 220], [65.4, 130.8, 164.8, 196], [98, 146.8, 196, 246.9]]; let ci = 0;
    this._chord = setInterval(() => { if (!this.ready || this.score.gain.value < 0.001) return; const t = c.currentTime; CH[ci].forEach((f, k) => this.scoreOsc[k].frequency.setTargetAtTime(f, t, 0.6)); ci = (ci + 1) % CH.length; }, 4200);
    this.noiseBuf = nb; this.whiteBuf = this._white(1); this.applauseBuf = this._applauseBuffer(4);
    // crowd bus: everything a crowd makes goes through one room filter so a cheer in Screen II sounds muffled from the wing
    this.crowdLP = c.createBiquadFilter(); this.crowdLP.type = 'lowpass'; this.crowdLP.frequency.value = 20000; this.crowdBus = c.createGain(); this.crowdBus.gain.value = 1; this.crowdBus.connect(this.crowdLP); this.crowdLP.connect(this.master);
    this.ready = true; this.setRoom(this.room, true);
  }
  // relation of the listener to a hall: 'in' / 'near' (its corridor) / 'far'
  rel(hallKey) { return !hallKey ? 'far' : this.room === hallKey ? 'in' : this.room === HALL_NEAR[hallKey] ? 'near' : 'far'; }
  relGain(hallKey) { return { in: 1, near: 0.22, far: 0.05 }[this.rel(hallKey)]; }
  relLP(hallKey) { return { in: 18000, near: 1400, far: 700 }[this.rel(hallKey)]; }
  setRoom(room, force) {
    const changed = room !== this.room; this.room = room; if (!this.ready || (!changed && !force)) return; this._levels(); this._filmRoute();
  }
  setMurmur(k) { this.murmurK = Math.max(0, Math.min(1, k)); if (this.ready) this._levels(); }
  setHallBusy(hallKey, on) { this.hallBusy[hallKey] = on; if (this.ready) this._levels(); }
  _levels() {
    const t = this.ctx.currentTime + 0.05, R = (p, v) => p.gain.setTargetAtTime(v, t, 0.7), r = this.room, k = this.murmurK, film = isHall(r) && this.hallBusy[r];
    const bed = r === 'lobby' ? 0.045 : isCorr(r) ? 0.032 : 0.02, mur = film ? 0.004 * k : (r === 'lobby' ? 0.006 + 0.03 * k : isCorr(r) ? 0.004 + 0.012 * k : 0.004 + 0.026 * k);
    R(this.bed, bed); R(this.murmurA, mur); R(this.murmurB, mur * 0.6); R(this.hum, isHall(r) ? (film ? 0.035 : 0.012) : 0);
    R(this.score, this.scoreHall && r === this.scoreHall ? 0.03 : this.scoreHall && r === HALL_NEAR[this.scoreHall] ? 0.006 : 0);
  }
  setScore(hallKey) { this.scoreHall = hallKey; if (this.ready) this._levels(); }
  // ---------- one-shots ----------
  _env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
  step(speed) { if (!this.ready || this.muted) return; const c = this.ctx, s = c.createBufferSource(); s.buffer = this.noiseBuf; s.playbackRate.value = 0.8 + Math.random() * 0.5; const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = (isHall(this.room) ? 330 : 420) + speed * 90; const g = c.createGain(), t = c.currentTime; this._env(g, t, 0.012, 0.09 * Math.min(1.4, speed / 2), 0.12); s.connect(f); f.connect(g); g.connect(this.master); s.start(t, Math.random()); s.stop(t + 0.16); }
  tone(freq, dur = 0.5, vol = 0.1, type = 'sine', slide = 0, dest = null, when = 0) { if (!this.ready || this.muted) return; const c = this.ctx, o = c.createOscillator(), g = c.createGain(), t = c.currentTime + when; o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur); this._env(g, t, 0.02, vol, dur); o.connect(g); g.connect(dest || this.master); o.start(t); o.stop(t + dur + 0.05); }
  thud() { this.tone(120, 0.28, 0.16, 'sine', 0.45); } click() { this.tone(1500, 0.05, 0.04, 'triangle'); }
  chime() { this.tone(880, 0.9, 0.07); this.tone(1318.5, 1.1, 0.06, 'sine', 0, null, 0.14); this.tone(1760, 1.3, 0.04, 'sine', 0, null, 0.3); }
  clink() { this.tone(2637, 0.5, 0.05); this.tone(3951, 0.4, 0.035, 'sine', 0, null, 0.02); this.tone(2637, 0.35, 0.03, 'sine', 0, null, 0.16); }
  crunch() { if (!this.ready || this.muted) return; for (let i = 0; i < 14; i++) { const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime + i * 0.045 + Math.random() * 0.03; s.buffer = this.whiteBuf; f.type = 'bandpass'; f.frequency.value = rnd(1800, 4200); f.Q.value = 1.2; this._env(g, t, 0.003, rnd(0.03, 0.07), 0.04); s.connect(f); f.connect(g); g.connect(this.master); s.start(t, Math.random() * 0.8); s.stop(t + 0.06); } }
  // soft voiced syllables under a speech bubble ("mm-hm")
  blip(seed = 0, gain = 1) { if (!this.ready || this.muted || gain < 0.05) return; const base = 140 + (seed % 7) * 22; for (let i = 0; i < 2 + (seed % 2); i++) this.tone(base * (1 + 0.12 * Math.sin(seed + i * 2)), 0.09, 0.018 * gain, 'triangle', 1.05, null, i * 0.11); }
  door(open, gain = 1) { if (!this.ready || this.muted || gain < 0.03) return; const c = this.ctx, t = c.currentTime;
    this.tone(open ? 80 : 65, 0.32, 0.12 * gain, 'sine', 0.55, null, open ? 0.0 : 0.25);
    const o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(open ? 150 : 120, t); o.frequency.linearRampToValueAtTime(open ? 118 : 96, t + 0.4); f.type = 'bandpass'; f.frequency.value = 950; f.Q.value = 9; this._env(g, t, 0.06, 0.02 * gain, 0.35); o.connect(f); f.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.5); }
  _crowdRoute(hallKey) { const t = this.ctx.currentTime; this.crowdLP.frequency.setTargetAtTime(hallKey ? this.relLP(hallKey) : 20000, t, 0.05); return hallKey ? this.relGain(hallKey) : 1; }
  applause(hallKey, dur = 6, level = 1) { if (!this.ready || this.muted) return; const c = this.ctx, g0 = this._crowdRoute(hallKey) * level; if (g0 < 0.02) return; const s = c.createBufferSource(), g = c.createGain(), t = c.currentTime; s.buffer = this.applauseBuf; s.loop = true;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.34 * g0, t + 0.5); g.gain.setValueAtTime(0.34 * g0, t + Math.max(0.6, dur - 2)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(g); g.connect(this.crowdBus); s.start(t, Math.random() * 3); s.stop(t + dur + 0.1); }
  cheer(hallKey, dur = 3.5, level = 1) { if (!this.ready || this.muted) return; const c = this.ctx, g0 = this._crowdRoute(hallKey) * level; if (g0 < 0.02) return; this.applause(hallKey, dur + 1.5, level * 0.8);
    for (let v = 0; v < 9; v++) { const t = c.currentTime + rnd(0, dur * 0.6), len = rnd(0.55, 1.2), f0 = rnd(190, 360), o = c.createOscillator(), f1 = c.createBiquadFilter(), f2 = c.createBiquadFilter(), g = c.createGain(), mix = c.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * rnd(1.25, 1.6), t + len * 0.3); o.frequency.exponentialRampToValueAtTime(f0 * rnd(0.7, 0.9), t + len);
      f1.type = 'bandpass'; f1.frequency.value = rnd(420, 560); f1.Q.value = 5; f2.type = 'bandpass'; f2.frequency.value = rnd(850, 1150); f2.Q.value = 7; mix.gain.value = 1;
      o.connect(f1); o.connect(f2); f1.connect(mix); f2.connect(mix); mix.connect(g); this._env(g, t, len * 0.25, 0.05 * g0, len * 0.75); g.connect(this.crowdBus); o.start(t); o.stop(t + len + 0.05); } }
  laugh(hallKey = null, level = 1, voices = 3) { if (!this.ready || this.muted) return; const c = this.ctx, g0 = this._crowdRoute(hallKey) * level; if (g0 < 0.02) return;
    for (let v = 0; v < voices; v++) { const start = c.currentTime + rnd(0, 0.5), f0 = rnd(150, 290), n = 3 + Math.floor(Math.random() * 4), o = c.createOscillator(), f1 = c.createBiquadFilter(), f2 = c.createBiquadFilter(), g = c.createGain();
      o.type = 'sawtooth'; o.frequency.value = f0; f1.type = 'bandpass'; f1.frequency.value = rnd(650, 800); f1.Q.value = 6; f2.type = 'bandpass'; f2.frequency.value = rnd(1100, 1300); f2.Q.value = 8; o.connect(f1); o.connect(f2); f1.connect(g); f2.connect(g); g.connect(this.crowdBus); g.gain.setValueAtTime(0.0001, start);
      const sp = rnd(0.15, 0.2); for (let i = 0; i < n; i++) { const t = start + i * sp, pk = 0.045 * g0 * (1 - i / (n + 1)); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, pk), t + 0.025); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11); o.frequency.setValueAtTime(f0 * (1 - i * 0.04), t); }
      o.start(start); o.stop(start + n * 0.21 + 0.2); } }
  // ---------- film chain: element -> room filter -> automatic level control -> limiter -> master ----------
  attachVideo(video) {
    if (!this.ready || this.film) return; const c = this.ctx; let src; try { src = c.createMediaElementSource(video); } catch (e) { console.warn('film audio routing failed', e); return; }
    this.filmLP = c.createBiquadFilter(); this.filmLP.type = 'lowpass'; this.filmLP.frequency.value = 600; this.filmG = c.createGain(); this.filmG.gain.value = 0; this.agc = c.createGain(); this.agc.gain.value = 1;
    const lim = c.createDynamicsCompressor(); lim.threshold.value = -20; lim.knee.value = 14; lim.ratio.value = 8; lim.attack.value = 0.005; lim.release.value = 0.25;
    this.an = c.createAnalyser(); this.an.fftSize = 1024; src.connect(this.filmLP); this.filmLP.connect(this.an); this.filmLP.connect(this.agc); this.agc.connect(this.filmG); this.filmG.connect(lim); lim.connect(this.master); this.film = src; this._buf = new Float32Array(1024); this._filmRoute();
    this._agcT = setInterval(() => { if (!this.an || !this.filmPlaying) return; this.an.getFloatTimeDomainData(this._buf); let s = 0; for (const v of this._buf) s += v * v; const rms = Math.sqrt(s / this._buf.length); if (rms > 0.004) { const want = Math.max(0.4, Math.min(2.4, 0.11 / rms)); this.agc.gain.setTargetAtTime(want, this.ctx.currentTime, 1.2); } }, 400);
  }
  setFilm(hallKey, playing) { this.filmHall = hallKey; this.filmPlaying = playing; if (this.ready) this._filmRoute(); }
  _filmRoute() { if (!this.filmG) return; const t = this.ctx.currentTime + 0.03, rel = this.rel(this.filmHall), p = rel === 'in' ? (this.seated ? [1.15, 20000] : [1.0, 16000]) : rel === 'near' ? [0.2, 1500] : [0.04, 700];
    this.filmG.gain.setTargetAtTime(this.filmPlaying ? p[0] : 0, t, 0.35); this.filmLP.frequency.setTargetAtTime(p[1], t, 0.35); }
  setSeated(v) { this.seated = v; if (this.ready) this._filmRoute(); }
  setMuted(m) { this.muted = m; if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.1); }
  suspend() { this.ctx?.suspend(); } resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
}
