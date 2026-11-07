// LUMIERE v8 - recorded voices (made offline by tools/tts/make_voices.py): every spoken line has a clip per speaker voice, plus its length
// and a mouth envelope, so jaws move with the words. Staff speak with their own voice; guests with one of two, detuned per person so no two
// sound alike. Lines in the world play from the speaker's position (pan, distance, the crowd bus and its room occlusion), at most three at
// once; the conversation panel's lines play at full level. Urdu uses the Hindi clips (both files carry the same Hindustani sentences).
import { lang } from './i18n.js';
const ROLE = { greeter: 'greeter', reception: 'reception', usher: 'usher', bar: 'bar', server: 'server' };
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/', MAX_LIVE = 3, MAX_BUFS = 48;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export class Voice {
  constructor(sound, settings) { this.sound = sound; this.on = settings.voices !== false; this.dir = null; this.man = null; this._load = null; this.bufs = new Map(); this.live = []; }
  setOptions(s) { this.on = s.voices !== false; if (!this.on) this.stopAll(); }
  // the manifest for the current language (fetched once per language)
  prepare() { const d = lang() === 'ur' ? 'hi' : lang(); if (this.dir === d && this._load) return this._load; this.dir = d; this.man = null; this.bufs.clear();
    this._load = fetch(`voice/${d}/index.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null).then((m) => { if (this.dir === d) this.man = m; return m; }); return this._load; }
  voiceOf(a) { if (ROLE[a.role]) return ROLE[a.role]; const f = a.rec && a.rec.kind === 'f'; return a.role === 'vendor' ? (f ? 'vendorF' : 'vendorM') : f ? 'guestF' : 'guestM'; }
  rate(a) { if (ROLE[a.role] || a.role === 'vendor') return 1; const s = Math.sin(((a.rec && a.rec.seed) || 7) * 12.9898) * 43758.5453; return 0.94 + 0.12 * (s - Math.floor(s)); }
  async _buf(id) {
    if (this.bufs.has(id)) { const b = this.bufs.get(id); this.bufs.delete(id); this.bufs.set(id, b); return b; }
    const r = await fetch(`voice/${this.dir}/${id}.ogg`); if (!r.ok) return null; const b = await this.sound.ctx.decodeAudioData(await r.arrayBuffer());
    this.bufs.set(id, b); if (this.bufs.size > MAX_BUFS) this.bufs.delete(this.bufs.keys().next().value); return b;
  }
  // a: the speaking agent; line: { key, i, j? } from i18n.pick; o.full: the conversation panel (no falloff). Resolves to the clip length in ms (0: silent)
  async speak(a, line, o = {}) {
    const S = this.sound; if (!this.on || !line || !line.key || !S.ready || S.muted || !a) return 0;
    if (!o.full) { const L = S.listener; if (Math.hypot(a.x - L.x, a.z - L.z) > 14 || this.live.filter((v) => !v.full).length >= MAX_LIVE) return 0; }
    const man = await this.prepare(); if (!man) return 0;
    const id = `${this.voiceOf(a)}/${line.key}.${line.i}${line.j != null ? '.' + line.j : ''}`, m = man.c[id]; if (!m) return 0;
    let buf; try { buf = await this._buf(id); } catch (e) { return 0; } if (!buf || !this.on) return 0;
    this.stop(a); const c = S.ctx, src = c.createBufferSource(), g = c.createGain(), p = c.createStereoPanner ? c.createStereoPanner() : null, rate = this.rate(a);
    src.buffer = buf; src.playbackRate.value = rate; g.gain.value = 0; src.connect(g);
    // world lines go through the crowd bus (room occlusion, reverb send); the conversation panel straight to the crowd volume
    const dest = o.full ? S.crowdVol : S.crowdIn; if (p) { g.connect(p); p.connect(dest); } else g.connect(dest);
    const v = { a, src, g, p, full: !!o.full, t0: c.currentTime + 0.02, ms: m[0] / rate, env: m[1], hz: man.hz || 25, rate };
    src.start(v.t0); src.onended = () => this._end(v); this.live.push(v); this._place(v, true);
    if (a.crowd) a.talkUntil = Math.max(a.talkUntil || 0, a.crowd.now + v.ms);
    return v.ms;
  }
  _place(v, now) { const S = this.sound, L = S.listener, a = v.a, d = Math.hypot(a.x - L.x, a.z - L.z), k = v.full ? 1 : Math.pow(clamp(1 - (d - 1.2) / 12.8), 1.4) * 0.9, t = S.ctx.currentTime;
    if (now) v.g.gain.setValueAtTime(k, t); else v.g.gain.setTargetAtTime(k, t, 0.08); if (v.p) v.p.pan.setTargetAtTime(v.full ? S._panFor(a.x, a.z) * 0.4 : S._panFor(a.x, a.z), t, 0.08); }
  _end(v) { const i = this.live.indexOf(v); if (i < 0) return; this.live.splice(i, 1); try { v.g.disconnect(); } catch (e) { /* already gone */ } if (v.a.ch) v.a.ch.mouth = null; }
  stop(a) { for (const v of this.live.filter((x) => x.a === a)) { try { v.src.stop(); } catch (e) { /* not started */ } this._end(v); } }
  stopAll() { for (const v of [...this.live]) { try { v.src.stop(); } catch (e) { /* not started */ } this._end(v); } }
  speaking(a) { return this.live.some((v) => v.a === a); }
  // per frame: mouths follow the envelopes, levels and pans follow the listener
  update() {
    if (!this.live.length) return; const t = this.sound.ctx.currentTime;
    for (const v of [...this.live]) { if (!v.a.alive) { this.stop(v.a); continue; } const s = (t - v.t0) * v.rate, i = Math.floor(s * v.hz); if (v.a.ch) v.a.ch.mouth = s < 0 || i >= v.env.length ? 0 : B64.indexOf(v.env[i]) / 63; this._place(v, false); }
  }
}
