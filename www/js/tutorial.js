// LUMIERE v8 - the tutorial (phone feedback: ask on the first launch whether you want one; Settings > Tutorial says "Start tutorial" the first
// time and "Start again" after). A coach card at the top walks through one night out; each step ends when you do the thing (or Next).
import { t } from './i18n.js';
const $ = (s) => document.querySelector(s);
// [text key, event that completes it (null = Next only)]
const STEPS = [['tut.s1', 'moved'], ['tut.s2', 'looked'], ['tut.s3', 'talked'], ['tut.s4', 'ticket'], ['tut.s5', 'item'], ['tut.s6', 'showed'], ['tut.s7', 'seated'], ['tut.s8', 'bell'], ['tut.s9', null]];
export class Tutorial {
  constructor(settings, sound, hooks) {
    this.settings = settings; this.sound = sound; this.hooks = hooks; this.i = -1; this.on = false; this.moved = 0; this.looked = 0;
    $('#coachNext').addEventListener('click', (e) => { e.stopPropagation(); this.sound.click(); this.next(); });
    $('#coachSkip').addEventListener('click', (e) => { e.stopPropagation(); this.sound.click(); this.finish(); });
  }
  start() { this.on = true; this.i = -1; this.moved = 0; this.looked = 0; this.next(); }
  stop() { this.on = false; $('#coach').hidden = true; }
  finish() { this.stop(); this.settings.tutorialDone = true; this.settings.tutorialAsked = true; this.hooks.save(); }
  next() { this.i++; if (this.i >= STEPS.length) { this.finish(); return; } const [key] = STEPS[this.i]; $('#coach').hidden = false; $('#coachN').textContent = String(this.i + 1); $('#coachText').textContent = t(key); $('#coachNext').textContent = t(this.i === STEPS.length - 1 ? 'tut.done' : 'tut.next'); }
  event(name) { if (!this.on || this.i < 0) return; if (STEPS[this.i][1] === name) { this.sound.chime && this.sound.chime(); setTimeout(() => this.on && this.next(), 700); } }
  // movement and looking are measured here (the other steps report themselves through event())
  update(dt) {
    if (!this.on || this.i < 0) return; const want = STEPS[this.i][1], p = window.__lumiere && window.__lumiere.player; if (!p) return;
    if (want === 'moved') { this.moved += (p.moving || 0) * dt; if (this.moved > 3) { this.moved = -1e9; this.event('moved'); } }
    if (want === 'looked') { const y = p.yaw; if (this._y != null) this.looked += Math.abs(y - this._y); this._y = y; if (this.looked > 2.2) { this.looked = -1e9; this.event('looked'); } }
  }
}
