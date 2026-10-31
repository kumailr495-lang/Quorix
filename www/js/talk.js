// LUMIERE v5 - conversation panel (typed text + choices from dialogue.js) and speech bubbles anchored over heads.
// v8: lines are { text, key, i } picks (i18n.pick), so the speaker's recorded voice plays (hooks.speak) and the text types in step with it;
// a wave by the name shows who is speaking; the subtitles switch hides the panel text, the bubbles switch the bubbles.
import * as THREE from 'three';
import { t, pick } from './i18n.js';
const $ = (s) => document.querySelector(s);
const ROLE = { reception: 'role.reception', usher: 'role.usher', vendor: 'role.vendor', bar: 'role.bar', server: 'role.server', greeter: 'role.greeter' };
export class Talk {
  constructor(sound, hooks = {}, settings = {}) {
    this.sound = sound; this.hooks = hooks; this.el = $('#talk'); this.nameEl = $('#talkName'); this.roleEl = $('#talkRole'); this.textEl = $('#talkText'); this.optsEl = $('#talkOpts'); this.layer = $('#bubbles');
    this.npc = null; this.tree = null; this.full = ''; this.shown = 0; this.typing = false; this.bubbles = new Map(); this.v = new THREE.Vector3(); this.enabled = true; this.cps = 46;
    this.el.addEventListener('pointerdown', (e) => { e.stopPropagation(); if (this.typing) this.shown = this.full.length; });
    $('#talkX').addEventListener('click', (e) => { e.stopPropagation(); this.close(); });
    this.setOptions(settings);
  }
  setOptions(s) { this.enabled = s.bubbles !== false; this.subs = s.subtitles !== false; this.el.classList.toggle('nosubs', !this.subs); if (!this.enabled) this.clearBubbles(); }
  get open() { return !!this.npc; }
  start(npc, tree) { this.npc = npc; this.tree = tree; this.el.hidden = false; document.body.classList.add('talking'); this.nameEl.textContent = npc.name; this.roleEl.textContent = t(ROLE[npc.role] || 'role.guest'); this.removeBubble(npc); this.go(tree.start); }
  go(id) {
    if (!this.npc) return; if (id === 'end') { this.close(); return; }
    if (id.startsWith('act:')) { const r = this.hooks.action ? this.hooks.action(id.slice(4), this.npc, this) : null; if (!r) this.close(); return; }
    const node = this.tree.nodes[id]; if (!node) { this.close(); return; } this.line(pick(node[0]) || t(node[0]), node[1]);
  }
  // one line with choices; ln = a pick ({ text, key, i }) or plain text; opts = [[labelKey, target], ...]
  line(ln, opts = [['opt.bye', 'end']]) {
    const text = typeof ln === 'string' ? ln : ln.text, npc = this.npc;
    this.full = text; this.shown = 0; this.typing = true; this.textEl.textContent = ''; this.optsEl.innerHTML = ''; this.pending = opts; this._t = 0; this.cps = 46;
    if (npc) npc.talkUntil = (npc.crowd ? npc.crowd.now : 0) + Math.min(6000, text.length * 45);
    const voiced = typeof ln === 'object' && this.hooks.speak ? this.hooks.speak(npc, ln, { full: true }) : null;
    if (voiced) voiced.then((ms) => { if (this.full !== text) return; if (ms > 0) this.cps = Math.max(18, Math.min(60, text.length / (ms * 0.00085))); else this.sound.blip((npc?.name || 'x').length * 7 + text.length, 1); });
    else this.sound.blip((npc?.name || 'x').length * 7 + text.length, 1);
  }
  _options() { this.optsEl.innerHTML = ''; let n = 0; for (const [label, target] of this.pending) { const b = document.createElement('button'); b.className = 'opt'; const i = document.createElement('i'); i.textContent = String(++n); const s = document.createElement('span'); s.textContent = t(label); b.append(i, s); b.addEventListener('click', (e) => { e.stopPropagation(); this.sound.click(); this.go(target); }); this.optsEl.appendChild(b); } }
  close() { if (!this.npc) return; const n = this.npc; this.npc = null; this.el.hidden = true; document.body.classList.remove('talking'); this.el.classList.remove('speaking'); this.hooks.closed && this.hooks.closed(n); }
  // ln: a pick or plain text
  bubble(npc, ln, dur = 3.2) {
    const text = typeof ln === 'string' ? ln : ln && ln.text; if (!this.enabled || !text) return; if (this.npc === npc) return;
    let b = this.bubbles.get(npc); if (!b) { if (this.bubbles.size >= 4) { const oldest = [...this.bubbles.entries()].sort((a, c) => a[1].t0 - c[1].t0)[0]; this.removeBubble(oldest[0]); }
      const el = document.createElement('div'); el.className = 'bubble'; const nm = document.createElement('small'), who = document.createElement('span'), wv = document.createElement('i'), tx = document.createElement('span'); wv.className = 'wv'; wv.innerHTML = '<b></b><b></b><b></b>'; nm.append(who, wv); el.append(nm, tx); this.layer.appendChild(el); b = { el, who, tx, t0: 0, until: 0 }; this.bubbles.set(npc, b); }
    b.who.textContent = npc.name || ''; b.tx.textContent = text; b.t0 = performance.now(); b.until = b.t0 + dur * 1000;
  }
  removeBubble(npc) { const b = this.bubbles.get(npc); if (b) { b.el.remove(); this.bubbles.delete(npc); } }
  clearBubbles() { for (const n of [...this.bubbles.keys()]) this.removeBubble(n); }
  update(dt, camera, W, H) {
    if (this.npc && this.typing) { this._t += dt * this.cps; const n = Math.min(this.full.length, Math.floor(this._t)); if (this.shown < n) this.shown = n; this.textEl.textContent = this.full.slice(0, this.shown); if (this.shown >= this.full.length) { this.typing = false; this._options(); } }
    if (this.npc) this.el.classList.toggle('speaking', !!(this.hooks.speaking && this.hooks.speaking(this.npc)));
    const now = performance.now();
    for (const [npc, b] of this.bubbles) {
      if (now > b.until || !npc.alive) { this.removeBubble(npc); continue; }
      const seated = npc.ch.s.sit > 0.5, head = (seated ? 1.42 : 2.0) * npc.ch.scale; this.v.set(npc.x, npc.y + head, npc.z).project(camera);
      const dist = Math.hypot(camera.position.x - npc.x, camera.position.y - npc.y - head, camera.position.z - npc.z), on = npc.group.visible && this.v.z < 1 && this.v.z > -1 && Math.abs(this.v.x) < 1.1 && Math.abs(this.v.y) < 1.1 && dist < 12;
      if (!on) { b.el.style.opacity = '0'; continue; }
      b.el.classList.toggle('speaking', !!(this.hooks.speaking && this.hooks.speaking(npc)));
      const x = (this.v.x * 0.5 + 0.5) * W, y = (-this.v.y * 0.5 + 0.5) * H, fade = Math.min(1, (b.until - now) / 400, (now - b.t0) / 200), sc = Math.max(0.75, Math.min(1, 4 / dist));
      b.el.style.opacity = String(fade * Math.min(1, (12 - dist) / 3)); b.el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-100%) scale(${sc.toFixed(2)})`;
    }
  }
}
