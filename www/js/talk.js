// LUMIERE v5 - conversation panel (typed text + choices from dialogue.js) and speech bubbles anchored over heads.
import * as THREE from 'three';
import { t } from './i18n.js';
const $ = (s) => document.querySelector(s);
const ROLE = { reception: 'role.reception', usher: 'role.usher', vendor: 'role.vendor', bar: 'role.bar' };
export class Talk {
  constructor(sound, hooks = {}) {
    this.sound = sound; this.hooks = hooks; this.el = $('#talk'); this.nameEl = $('#talkName'); this.roleEl = $('#talkRole'); this.textEl = $('#talkText'); this.optsEl = $('#talkOpts'); this.layer = $('#bubbles');
    this.npc = null; this.tree = null; this.full = ''; this.shown = 0; this.typing = false; this.bubbles = new Map(); this.v = new THREE.Vector3(); this.enabled = true;
    this.el.addEventListener('pointerdown', (e) => { e.stopPropagation(); if (this.typing) this.shown = this.full.length; });
    $('#talkX').addEventListener('click', (e) => { e.stopPropagation(); this.close(); });
  }
  get open() { return !!this.npc; }
  start(npc, tree) { this.npc = npc; this.tree = tree; this.el.hidden = false; this.nameEl.textContent = npc.name; this.roleEl.textContent = t(ROLE[npc.role] || 'role.guest'); this.removeBubble(npc); this.go(tree.start); }
  go(id) {
    if (!this.npc) return; if (id === 'end') { this.close(); return; }
    if (id.startsWith('act:')) { const r = this.hooks.action ? this.hooks.action(id.slice(4), this.npc, this) : null; if (!r) this.close(); return; }
    const node = this.tree.nodes[id]; if (!node) { this.close(); return; } this.line(t(node[0]), node[1]);
  }
  // one line with choices; opts = [[labelKey, target], ...]
  line(text, opts = [['opt.bye', 'end']]) {
    this.full = text; this.shown = 0; this.typing = true; this.textEl.textContent = ''; this.optsEl.innerHTML = ''; this.pending = opts; this._t = 0; if (this.npc) this.npc.talkUntil = (this.npc.crowd ? this.npc.crowd.now : 0) + Math.min(6000, text.length * 45);
    this.sound.blip((this.npc?.name || 'x').length * 7 + text.length, 1);
  }
  _options() { this.optsEl.innerHTML = ''; let n = 0; for (const [label, target] of this.pending) { const b = document.createElement('button'); b.className = 'opt'; const i = document.createElement('i'); i.textContent = String(++n); const s = document.createElement('span'); s.textContent = t(label); b.append(i, s); b.addEventListener('click', (e) => { e.stopPropagation(); this.sound.click(); this.go(target); }); this.optsEl.appendChild(b); } }
  close() { if (!this.npc) return; const n = this.npc; this.npc = null; this.el.hidden = true; this.hooks.closed && this.hooks.closed(n); }
  bubble(npc, text, dur = 3.2) {
    if (!this.enabled || !text) return; if (this.npc === npc) return;
    let b = this.bubbles.get(npc); if (!b) { if (this.bubbles.size >= 4) { const oldest = [...this.bubbles.entries()].sort((a, c) => a[1].t0 - c[1].t0)[0]; this.removeBubble(oldest[0]); } const el = document.createElement('div'); el.className = 'bubble'; this.layer.appendChild(el); b = { el, t0: 0, until: 0 }; this.bubbles.set(npc, b); }
    b.el.textContent = text; b.t0 = performance.now(); b.until = b.t0 + dur * 1000;
    const d = this.hooks.distance ? this.hooks.distance(npc) : 99; if (d < 6) this.sound.blip(text.length + npc.name.length, 1 - d / 6);
  }
  removeBubble(npc) { const b = this.bubbles.get(npc); if (b) { b.el.remove(); this.bubbles.delete(npc); } }
  clearBubbles() { for (const n of [...this.bubbles.keys()]) this.removeBubble(n); }
  update(dt, camera, W, H) {
    if (this.npc && this.typing) { this._t += dt * 46; const n = Math.min(this.full.length, Math.floor(this._t)); if (this.shown < n) this.shown = n; this.textEl.textContent = this.full.slice(0, this.shown); if (this.shown >= this.full.length) { this.typing = false; this._options(); } }
    const now = performance.now();
    for (const [npc, b] of this.bubbles) {
      if (now > b.until || !npc.alive) { this.removeBubble(npc); continue; }
      const seated = npc.ch.s.sit > 0.5, head = (seated ? 1.42 : 2.0) * npc.ch.scale; this.v.set(npc.x, npc.y + head, npc.z).project(camera);
      const dist = Math.hypot(camera.position.x - npc.x, camera.position.y - npc.y - head, camera.position.z - npc.z), on = npc.group.visible && this.v.z < 1 && this.v.z > -1 && Math.abs(this.v.x) < 1.1 && Math.abs(this.v.y) < 1.1 && dist < 12;
      if (!on) { b.el.style.opacity = '0'; continue; }
      const x = (this.v.x * 0.5 + 0.5) * W, y = (-this.v.y * 0.5 + 0.5) * H, fade = Math.min(1, (b.until - now) / 400, (now - b.t0) / 200), sc = Math.max(0.75, Math.min(1, 4 / dist));
      b.el.style.opacity = String(fade * Math.min(1, (12 - dist) / 3)); b.el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-100%) scale(${sc.toFixed(2)})`;
    }
  }
}
