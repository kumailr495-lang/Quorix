// LUMIERE v5 sound - all synthesised or routed here, no audio files.
//  * film channel: the hall you are in / next to is heard through a continuous occlusion model (distance to the door, the light-lock passage,
//    the automatic door's opening), not a room switch: walking in, the film grows smoothly.
//  * house film scores + effects per genre (thriller, romance, horror), triggered by the same cues the audience reacts to.
//  * crowd voices (screams, gasps, cheers, laughter, "aww", applause) from formant synthesis, spatialised and sent to a hall reverb.
//  * lobby: soft lounge music, murmur that follows the number of people around, the popcorn machine, the street through the glass.
const rnd = (a, b) => a + Math.random() * (b - a), clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const VOWEL = { a: [800, 1200, 2600], e: [500, 1800, 2600], o: [450, 800, 2500], u: [330, 900, 2300], i: [300, 2300, 3000] };
export class Sound {
  constructor() { this.ctx = null; this.ready = false; this.vol = { master: 0.9, film: 1, crowd: 0.8 }; this.muted = false; this.listener = { x: 0, z: 0, yaw: 0, room: 'lobby' }; this.film = null; this.filmAud = 0; this.seated = false; }
  unlock() { if (!this.ctx) { try { this._build(); } catch (e) { console.warn('audio unavailable', e); return; } } if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
  setVolumes(v) { Object.assign(this.vol, v); if (!this.ready) return; const t = this.ctx.currentTime; this.master.gain.setTargetAtTime(this.muted ? 0 : this.vol.master, t, 0.1); this.filmVol.gain.setTargetAtTime(this.vol.film, t, 0.1); this.crowdVol.gain.setTargetAtTime(this.vol.crowd, t, 0.1); }
  setMuted(m) { this.muted = m; this.setVolumes({}); }
  suspend() { this.ctx?.suspend(); } resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
  _noiseBuf(sec, k = 0.97) { const c = this.ctx, b = c.createBuffer(1, Math.floor(c.sampleRate * sec), c.sampleRate), d = b.getChannelData(0); let a = 0; for (let i = 0; i < d.length; i++) { a = a * k + (Math.random() * 2 - 1) * (1 - k) * 4; d[i] = a; } return b; }
  _whiteBuf(sec) { const c = this.ctx, b = c.createBuffer(1, Math.floor(c.sampleRate * sec), c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; }
  _ir(sec = 1.6, decay = 3) { const c = this.ctx, n = Math.floor(c.sampleRate * sec), b = c.createBuffer(2, n, c.sampleRate); for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); let lp = 0; for (let i = 0; i < n; i++) { lp = lp * 0.6 + (Math.random() * 2 - 1) * 0.4; d[i] = lp * Math.pow(1 - i / n, decay); } } return b; }
  _applauseBuf(sec = 4) { const c = this.ctx, sr = c.sampleRate, n = Math.floor(sr * sec), b = c.createBuffer(2, n, sr), L = b.getChannelData(0), R = b.getChannelData(1);
    for (let p = 0; p < 40; p++) { const rate = rnd(4, 7.5), pan = Math.random(), amp = rnd(0.25, 0.7), br = rnd(0.55, 0.9); let t = Math.random() / rate;
      while (t < sec) { const s0 = Math.floor(t * sr), len = Math.floor(sr * rnd(0.008, 0.016)); let hp = 0, prev = 0; for (let i = 0; i < len && s0 + i < n; i++) { const w = Math.random() * 2 - 1; hp = br * (hp + w - prev); prev = w; const e = Math.exp(-i / (len * 0.28)) * amp * rnd(0.6, 1); L[s0 + i] += hp * e * (1 - pan); R[s0 + i] += hp * e * pan; } t += (1 / rate) * rnd(0.85, 1.15); } }
    let pk = 0; for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i])); const g = 0.9 / (pk || 1); for (let i = 0; i < n; i++) { L[i] *= g; R[i] *= g; } return b; }
  _build() {
    const AC = window.AudioContext || window.webkitAudioContext, c = this.ctx = new AC({ latencyHint: 'playback' });
    this.master = c.createGain(); this.master.gain.value = this.muted ? 0 : this.vol.master; const comp = c.createDynamicsCompressor(); comp.threshold.value = -12; comp.ratio.value = 4; comp.attack.value = 0.005; this.master.connect(comp); comp.connect(c.destination);
    this.noise = this._noiseBuf(3); this.white = this._whiteBuf(2); this.applauseBuf = this._applauseBuf(4);
    // reverb send (hall acoustics) shared by the crowd and the film effects
    this.verb = c.createConvolver(); this.verb.buffer = this._ir(1.5, 2.6); this.verbIn = c.createGain(); this.verbIn.gain.value = 0; this.verbIn.connect(this.verb); this.verb.connect(this.master);
    // film channel: source(s) -> filmIn -> lowpass (occlusion) -> gain (occlusion) -> filmVol -> master (+ reverb send)
    this.filmIn = c.createGain(); this.filmLP = c.createBiquadFilter(); this.filmLP.type = 'lowpass'; this.filmLP.frequency.value = 800; this.filmG = c.createGain(); this.filmG.gain.value = 0; this.filmVol = c.createGain(); this.filmVol.gain.value = this.vol.film;
    this.filmIn.connect(this.filmLP); this.filmLP.connect(this.filmG); this.filmG.connect(this.filmVol); this.filmVol.connect(this.master); const fs = c.createGain(); fs.gain.value = 0.12; this.filmG.connect(fs); fs.connect(this.verbIn);
    this.an = c.createAnalyser(); this.an.fftSize = 1024; this.filmIn.connect(this.an); this._buf = new Float32Array(1024);
    // crowd bus (spatialised voices) -> crowdLP (occlusion of the hall they are in) -> crowdVol
    this.crowdIn = c.createGain(); this.crowdLP = c.createBiquadFilter(); this.crowdLP.type = 'lowpass'; this.crowdLP.frequency.value = 18000; this.crowdVol = c.createGain(); this.crowdVol.gain.value = this.vol.crowd; this.crowdIn.connect(this.crowdLP); this.crowdLP.connect(this.crowdVol); this.crowdVol.connect(this.master); const cs = c.createGain(); cs.gain.value = 0.3; this.crowdLP.connect(cs); cs.connect(this.verbIn);
    // ambience: murmur, lounge music, street, popcorn crackle
    const loop = (buf, type, f, q, g0, dest) => { const s = c.createBufferSource(); s.buffer = buf; s.loop = true; const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = c.createGain(); g.gain.value = g0; s.connect(fl); fl.connect(g); g.connect(dest || this.master); s.start(0, Math.random() * 2); return g; };
    this.murA = loop(this.noise, 'bandpass', 420, 1.6, 0); this.murB = loop(this.noise, 'bandpass', 1050, 2.4, 0); this.street = loop(this.noise, 'lowpass', 260, 0.5, 0); this.hvac = loop(this.noise, 'lowpass', 140, 0.4, 0);
    for (const [g, f] of [[this.murA, 0.17], [this.murB, 0.29]]) { const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = f; lg.gain.value = 0.006; lfo.connect(lg); lg.connect(g.gain); lfo.start(); }
    this.music = c.createGain(); this.music.gain.value = 0; const mlp = c.createBiquadFilter(); mlp.type = 'lowpass'; mlp.frequency.value = 2400; this.music.connect(mlp); mlp.connect(this.master); this._lounge();
    this.ready = true; this.setVolumes({});
    this._tick = setInterval(() => this._ambientTick(), 250);
  }
  // ---------------- listener + occlusion ----------------
  // a: { room, x, z, yaw, seated, filmHall (key), audibility 0..1, lp (Hz), crowd near, lobbyPeople, popcorn distance, streetDist, verb 0..1 }
  setListener(a) {
    this.listener = a; if (!this.ready) return; const t = this.ctx.currentTime, k = 0.09;
    this.filmG.gain.setTargetAtTime(this.film ? a.filmAud * (this.film.gain || 1) : 0, t, k); this.filmLP.frequency.setTargetAtTime(a.filmLP, t, k);
    this.crowdLP.frequency.setTargetAtTime(a.crowdLP, t, k); this.verbIn.gain.setTargetAtTime(a.verb, t, 0.3);
  }
  _ambientTick() {
    if (!this.ready || this.muted) return; const a = this.listener, t = this.ctx.currentTime, inHall = a.room && a.room.startsWith('hall'), open = a.room === 'lobby' || a.room === 'conc' || a.room === 'street', dark = a.dark;
    const mur = (a.people || 0) * (dark ? 0.15 : 1); this.murA.gain.setTargetAtTime(0.004 + 0.022 * mur, t, 0.8); this.murB.gain.setTargetAtTime(0.0025 + 0.014 * mur, t, 0.8);
    this.music.gain.setTargetAtTime(open ? 0.05 : a.room && a.room.startsWith('pass') ? 0.012 : 0, t, 1.2); this.street.gain.setTargetAtTime(a.room === 'lobby' ? 0.03 * smooth(14, 4, Math.abs(20 - a.z)) + 0.006 : 0.002, t, 0.8);
    this.hvac.gain.setTargetAtTime(inHall ? (dark ? 0.006 : 0.012) : 0.008, t, 1);
    if (a.popcornDist < 7 && Math.random() < 0.55) this._pops(1 - a.popcornDist / 7);
  }
  // ---------------- film ----------------
  // { video } routes the element; { house, t0 } synthesises that film's score; sfx() plays its cue effects
  startFilm(hallKey, src) {
    if (!this.ready) { this._pendingFilm = [hallKey, src]; return; } this.stopFilm(); this.film = { hall: hallKey, gain: 1, nodes: [] };
    if (src.video) { if (!this.videoSrc) { try { this.videoSrc = this.ctx.createMediaElementSource(src.video); } catch (e) { console.warn('film audio routing failed', e); } } if (this.videoSrc) { this.videoSrc.disconnect(); this.agc = this.agc || this.ctx.createGain(); this.videoSrc.connect(this.agc); this.agc.connect(this.filmIn); this.film.video = true; this._agcT = setInterval(() => this._agc(), 400); } }
    else this._score(src.house);
  }
  stopFilm(hallKey) { if (!this.film || (hallKey && this.film.hall !== hallKey)) return; for (const n of this.film.nodes) { try { n.stop ? n.stop() : n.disconnect(); } catch (e) {} } clearInterval(this.film.loop); clearInterval(this._agcT); if (this.film.video && this.agc) { try { this.agc.disconnect(); } catch (e) {} } this.film = null; }
  filmHall() { return this.film ? this.film.hall : null; }
  _agc() { if (!this.an || !this.film || !this.film.video) return; const rms = this._rms(); if (rms > 0.004) this.agc.gain.setTargetAtTime(clamp(0.12 / rms, 0.4, 2.6), this.ctx.currentTime, 1.2); }
  _rms() { this.an.getFloatTimeDomainData(this._buf); let s = 0; for (const v of this._buf) s += v * v; return Math.sqrt(s / this._buf.length); }
  level() { if (!this.ready || !this.film) return null; const r = this._rms(); return 20 * Math.log10(r + 1e-6); }
  _osc(type, f, g0, dest) { const c = this.ctx, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.value = f; g.gain.value = g0; o.connect(g); g.connect(dest); o.start(); this.film && this.film.nodes.push(o); return { o, g }; }
  _score(id) {
    const c = this.ctx, bus = c.createGain(); bus.gain.value = 0.9; bus.connect(this.filmIn); this.film.bus = bus; this.film.nodes.push(bus); this.film.genre = id;
    const pad = (freqs, type, g0, lp) => { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; f.connect(bus); this.film.nodes.push(f); return freqs.map((fr) => this._osc(type, fr, g0, f)); };
    let step = 0;
    if (id === 'night') { const v = pad([55, 82.4, 110], 'sawtooth', 0.05, 380); this.film.loop = setInterval(() => { const t = c.currentTime; step++; const pulse = this.film && this.film.tension ? 1 : 0.4; this._kick(bus, 0.25 * pulse); if (step % 2 === 0) this._tone(bus, [110, 98, 123.5, 82.4][step / 2 % 4], 0.25, 0.05 * pulse, 'square', 800); v[2].o.frequency.setTargetAtTime([110, 98, 123.5, 82.4][Math.floor(step / 8) % 4], t, 0.3); }, 520); }
    if (id === 'velvet') { const CH = [[261.6, 329.6, 392], [220, 261.6, 329.6], [174.6, 220, 261.6], [196, 246.9, 293.7]], v = pad(CH[0], 'triangle', 0.05, 1800); this.film.loop = setInterval(() => { const t = c.currentTime, ch = CH[Math.floor(step / 8) % 4]; ch.forEach((f, i) => v[i].o.frequency.setTargetAtTime(f, t, 0.4)); if (step % 2 === 0) this._tone(bus, ch[(step / 2) % 3] * 2, 0.9, 0.035, 'sine', 3000); step++; }, 450); }
    if (id === 'quiet') { const v = pad([61.7, 65.4, 92.5], 'sawtooth', 0.04, 260); const rain = c.createBufferSource(); rain.buffer = this.white; rain.loop = true; const rf = c.createBiquadFilter(); rf.type = 'highpass'; rf.frequency.value = 2500; const rg = c.createGain(); rg.gain.value = 0.035; rain.connect(rf); rf.connect(rg); rg.connect(bus); rain.start(); this.film.nodes.push(rain);
      this.film.loop = setInterval(() => { const t = c.currentTime; step++; v[1].o.frequency.setTargetAtTime(65.4 + Math.sin(step * 0.3) * 2, t, 1); if (this.film && this.film.tension && step % 2 === 0) { this._kick(bus, 0.18); setTimeout(() => this.film && this._kick(bus, 0.12), 180); } }, 700); }
  }
  // cue effects; scares are loud on purpose (that is what makes a hall jump)
  sfx(name) {
    if (!this.ready || !this.film || !this.film.bus) return; const c = this.ctx, bus = this.film.bus, t = c.currentTime;
    if (name === 'siren') { this.film.tension = true; const o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; for (let i = 0; i < 6; i++) { o.frequency.setValueAtTime(620, t + i * 0.6); o.frequency.linearRampToValueAtTime(880, t + i * 0.6 + 0.3); } this._env(g, t, 0.2, 0.06, 3.4); o.connect(g); g.connect(bus); o.start(t); o.stop(t + 3.8); }
    if (name === 'screech') this._noiseHit(bus, 2600, 6, 0.35, 1.3, 1200);
    if (name === 'horn') { for (const f of [311, 370]) this._tone(bus, f, 1.1, 0.25, 'square', 2200); }
    if (name === 'boom') { this.film.tension = false; this._noiseHit(bus, 180, 0.7, 0.9, 2.8); this._tone(bus, 60, 2.2, 0.5, 'sine', 400, 0.3); }
    if (name === 'squawk') for (let i = 0; i < 3; i++) this._tone(bus, 1400, 0.16, 0.08, 'sawtooth', 3000, 0.6, i * 0.2);
    if (name === 'splash') this._noiseHit(bus, 1800, 0.8, 0.4, 1.1, 600);
    if (name === 'fireworks') for (let i = 0; i < 6; i++) { setTimeout(() => this.film && this._noiseHit(bus, 900, 0.9, 0.35, 0.9), i * 520); }
    if (name === 'creak') { this.film.tension = true; const o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(70, t); o.frequency.linearRampToValueAtTime(110, t + 1.8); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 14; this._env(g, t, 0.4, 0.25, 1.6); o.connect(f); f.connect(g); g.connect(bus); o.start(t); o.stop(t + 2.2); }
    if (name === 'flicker') for (let i = 0; i < 5; i++) this._tone(bus, 120, 0.06, 0.08, 'square', 3000, 1, i * 0.18 + Math.random() * 0.1);
    if (name === 'stinger') { this.film.tension = false; this._noiseHit(bus, 3000, 0.5, 1.0, 0.9); for (const f of [233, 247, 262, 466]) this._tone(bus, f, 1.4, 0.22, 'sawtooth', 5000, 0.7); this._tone(bus, 55, 1.2, 0.6, 'sine', 300); }
    if (name === 'thunder') this._noiseHit(bus, 140, 0.5, 0.8, 3.2);
    if (name === 'meow') { const o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.setValueAtTime(520, t); o.frequency.linearRampToValueAtTime(760, t + 0.25); o.frequency.linearRampToValueAtTime(430, t + 0.7); f.type = 'bandpass'; f.frequency.value = 1300; f.Q.value = 3; this._env(g, t, 0.05, 0.16, 0.7); o.connect(f); f.connect(g); g.connect(bus); o.start(t); o.stop(t + 0.8); }
  }
  _env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
  _tone(dest, f, dur, vol, type = 'sine', lp = 3000, slide = 1, when = 0) { const c = this.ctx, o = c.createOscillator(), g = c.createGain(), fl = c.createBiquadFilter(), t = c.currentTime + when; o.type = type; o.frequency.setValueAtTime(f, t); if (slide !== 1) o.frequency.exponentialRampToValueAtTime(f * slide, t + dur); fl.type = 'lowpass'; fl.frequency.value = lp; this._env(g, t, 0.01, vol, dur); o.connect(fl); fl.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.1); }
  _noiseHit(dest, f, q, vol, dur, sweepTo = 0) { const c = this.ctx, s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime; s.buffer = this.white; fl.type = q > 2 ? 'bandpass' : 'lowpass'; fl.frequency.setValueAtTime(f, t); if (sweepTo) fl.frequency.exponentialRampToValueAtTime(sweepTo, t + dur); fl.Q.value = q; this._env(g, t, 0.005, vol, dur); s.connect(fl); fl.connect(g); g.connect(dest); s.start(t, Math.random()); s.stop(t + dur + 0.1); }
  _kick(dest, vol) { this._tone(dest, 110, 0.28, vol, 'sine', 800, 0.35); }
  // ---------------- crowd voices ----------------
  // type: scream / gasp / laugh / cheer / clap / aww / shush; n voices; pan from the listener's view
  _panFor(x, z) { const L = this.listener, ang = Math.atan2(x - L.x, z - L.z), rel = Math.atan2(Math.sin(ang - (L.yaw + Math.PI)), Math.cos(ang - (L.yaw + Math.PI))); return clamp(-Math.sin(rel), -1, 1) * 0.7; }
  _voiceOut(pan, g0) { const c = this.ctx, p = c.createStereoPanner ? c.createStereoPanner() : null, g = c.createGain(); g.gain.value = g0; if (p) { p.pan.value = pan; g.connect(p); p.connect(this.crowdIn); } else g.connect(this.crowdIn); return g; }
  _voice(vowel, f0, dur, peak, pan, glide = 1, when = 0, vib = 0) {
    const c = this.ctx, t = c.currentTime + when, src = c.createOscillator(), out = this._voiceOut(pan, 1), mix = c.createGain(); src.type = 'sawtooth'; src.frequency.setValueAtTime(f0, t); src.frequency.exponentialRampToValueAtTime(Math.max(40, f0 * glide), t + dur);
    if (vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 5.5 + Math.random() * 2; lg.gain.value = f0 * vib; l.connect(lg); lg.connect(src.frequency); l.start(t); l.stop(t + dur + 0.1); }
    const F = VOWEL[vowel] || VOWEL.a; F.forEach((fq, i) => { const b = c.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = fq * rnd(0.92, 1.1); b.Q.value = [6, 9, 12][i]; const g = c.createGain(); g.gain.value = [1, 0.6, 0.25][i]; src.connect(b); b.connect(g); g.connect(mix); });
    const n = c.createBufferSource(), nf = c.createBiquadFilter(), ng = c.createGain(); n.buffer = this.white; nf.type = 'bandpass'; nf.frequency.value = F[1]; nf.Q.value = 1.5; ng.gain.value = 0.25; n.connect(nf); nf.connect(ng); ng.connect(mix);
    const env = c.createGain(); mix.connect(env); env.connect(out); this._env(env, t, Math.min(0.08, dur * 0.2), peak, dur); src.start(t); src.stop(t + dur + 0.1); n.start(t, Math.random()); n.stop(t + dur + 0.1);
  }
  crowd(type, n, k, x, z, inRoom) {
    if (!this.ready || this.muted) return; const v = Math.min(12, Math.max(1, Math.round(n * (type === 'scream' ? 0.35 : 0.25)))), pan = this._panFor(x, z), lvl = 0.6 + 0.4 * k;
    if (type === 'scare' || type === 'scream') { for (let i = 0; i < v; i++) { const fem = Math.random() < 0.55, f0 = fem ? rnd(420, 680) : rnd(220, 360); this._voice('a', f0, rnd(0.6, 1.3), 0.09 * lvl, pan + rnd(-0.3, 0.3), rnd(0.75, 1.05), rnd(0, 0.35), 0.03); } for (let i = 0; i < v; i++) this._gasp(pan, 0.05 * lvl, rnd(0, 0.15)); }
    else if (type === 'gasp') for (let i = 0; i < v + 2; i++) this._gasp(pan + rnd(-0.4, 0.4), 0.06 * lvl, rnd(0, 0.3));
    else if (type === 'laugh') for (let i = 0; i < v + 1; i++) { const f0 = Math.random() < 0.5 ? rnd(200, 320) : rnd(120, 190), when = rnd(0, 0.5), pulses = 3 + Math.floor(Math.random() * 5); for (let p = 0; p < pulses; p++) this._voice('a', f0 * (1 - p * 0.03), 0.13, 0.05 * lvl * (1 - p / (pulses + 1)), pan + rnd(-0.4, 0.4), 0.95, when + p * rnd(0.15, 0.2)); }
    else if (type === 'climax' || type === 'cheer') { this.applause(pan, 4 + 3 * k, 0.6 * lvl); for (let i = 0; i < v + 2; i++) { const f0 = Math.random() < 0.5 ? rnd(300, 480) : rnd(160, 260); this._voice(Math.random() < 0.5 ? 'u' : 'e', f0, rnd(0.6, 1.2), 0.06 * lvl, pan + rnd(-0.5, 0.5), rnd(1.2, 1.5), rnd(0, 1.2), 0.02); } }
    else if (type === 'end') { this.applause(pan, 9, 0.9); for (let i = 0; i < 5; i++) this._voice('u', rnd(250, 420), 0.9, 0.05, pan + rnd(-0.5, 0.5), 1.3, rnd(0.5, 3)); }
    else if (type === 'aww') for (let i = 0; i < v + 2; i++) this._voice('o', Math.random() < 0.6 ? rnd(300, 420) : rnd(170, 230), rnd(0.8, 1.2), 0.035 * lvl, pan + rnd(-0.4, 0.4), 0.78, rnd(0, 0.3));
    else if (type === 'shush') { const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime; s.buffer = this.white; f.type = 'bandpass'; f.frequency.value = 3200; f.Q.value = 2; this._env(g, t, 0.05, 0.04, 0.8); s.connect(f); f.connect(g); g.connect(this._voiceOut(pan, 1)); s.start(t); s.stop(t + 1); }
    else if (type === 'clap') this.applause(pan, 2.5, 0.4 * lvl);
  }
  _gasp(pan, vol, when) { const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime + when; s.buffer = this.white; f.type = 'bandpass'; f.frequency.setValueAtTime(rnd(900, 1500), t); f.frequency.linearRampToValueAtTime(rnd(1800, 2600), t + 0.25); f.Q.value = 3; this._env(g, t, 0.03, vol, 0.28); s.connect(f); f.connect(g); g.connect(this._voiceOut(pan, 1)); s.start(t, Math.random()); s.stop(t + 0.4); }
  applause(pan, dur = 6, level = 1) { if (!this.ready || this.muted) return; const c = this.ctx, s = c.createBufferSource(), g = c.createGain(), t = c.currentTime; s.buffer = this.applauseBuf; s.loop = true; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.32 * level, t + 0.6); g.gain.setValueAtTime(0.32 * level, t + Math.max(0.8, dur - 2)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(g); g.connect(this._voiceOut(pan * 0.5, 1)); s.start(t, Math.random() * 3); s.stop(t + dur + 0.1); }
  // ---------------- small one-shots ----------------
  step(speed, soft) { if (!this.ready || this.muted) return; const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime; s.buffer = this.noise; s.playbackRate.value = 0.8 + Math.random() * 0.5; f.type = 'lowpass'; f.frequency.value = soft ? 380 + speed * 60 : 900 + speed * 200; this._env(g, t, 0.008, (soft ? 0.07 : 0.05) * Math.min(1.4, speed / 2), soft ? 0.12 : 0.07); s.connect(f); f.connect(g); g.connect(this.master); s.start(t, Math.random()); s.stop(t + 0.16); }
  click() { if (this.ready && !this.muted) this._tone(this.master, 1500, 0.05, 0.035, 'triangle', 6000); }
  pop() { if (this.ready && !this.muted) { this._tone(this.master, 660, 0.12, 0.06, 'sine', 4000, 1.6); this._tone(this.master, 990, 0.18, 0.04, 'sine', 4000, 1.3, 0.08); } }
  chime() { if (!this.ready || this.muted) return; this._tone(this.master, 880, 0.8, 0.06); this._tone(this.master, 1318.5, 1.0, 0.05, 'sine', 3000, 1, 0.12); this._tone(this.master, 1760, 1.2, 0.035, 'sine', 3000, 1, 0.26); }
  crunch() { if (!this.ready || this.muted) return; for (let i = 0; i < 12; i++) { const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime + i * 0.045 + Math.random() * 0.03; s.buffer = this.white; f.type = 'bandpass'; f.frequency.value = rnd(1800, 4200); f.Q.value = 1.2; this._env(g, t, 0.003, rnd(0.03, 0.06), 0.04); s.connect(f); f.connect(g); g.connect(this.master); s.start(t, Math.random()); s.stop(t + 0.06); } }
  sip() { if (!this.ready || this.muted) return; this._noiseHit(this.master, 2200, 2, 0.04, 0.35, 900); }
  thud() { if (this.ready && !this.muted) this._tone(this.master, 120, 0.25, 0.1, 'sine', 600, 0.5); }
  door(open, gain = 1) { if (!this.ready || this.muted || gain < 0.03) return; this._noiseHit(this.master, open ? 700 : 500, 0.8, 0.05 * gain, 0.7, open ? 1800 : 300); this._tone(this.master, 80, 0.25, 0.05 * gain, 'sine', 300, 0.7, open ? 0 : 0.55); }
  blip(seed = 0, gain = 1) { if (!this.ready || this.muted || gain < 0.05) return; const base = 150 + (seed % 7) * 20; for (let i = 0; i < 2 + (seed % 2); i++) this._voice(['a', 'e', 'o'][(seed + i) % 3], base * (1 + 0.1 * Math.sin(seed + i * 2)), 0.09, 0.03 * gain, 0, 1.05, i * 0.11); }
  _pops(k) { const c = this.ctx, t = c.currentTime; for (let i = 0; i < 3; i++) { const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), w = t + Math.random() * 0.25; s.buffer = this.white; f.type = 'bandpass'; f.frequency.value = rnd(1200, 2600); f.Q.value = 4; this._env(g, w, 0.002, 0.02 * k, 0.03); s.connect(f); f.connect(g); g.connect(this.master); s.start(w, Math.random()); s.stop(w + 0.05); } }
  // soft lobby music: electric-piano chords and a slow melody, low in the mix
  _lounge() {
    const c = this.ctx, CH = [[220, 277.2, 329.6, 415.3], [196, 246.9, 293.7, 370], [174.6, 220, 261.6, 329.6], [207.7, 261.6, 311.1, 392]], MEL = [659.3, 587.3, 554.4, 493.9, 554.4, 659.3, 739.99, 659.3]; let i = 0;
    const play = () => { if (!this.ready) return; const t = c.currentTime; if (this.music.gain.value > 0.002) { const ch = CH[Math.floor(i / 4) % 4]; if (i % 4 === 0) ch.forEach((f, k) => this._tone(this.music, f, 2.6, 0.06, 'triangle', 1500, 1, k * 0.02)); if (i % 2 === 1) this._tone(this.music, MEL[(i >> 1) % MEL.length], 0.9, 0.035, 'sine', 3000); } i++; };
    this._loungeT = setInterval(play, 650);
  }
}
