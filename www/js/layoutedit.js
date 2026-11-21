// LUMIERE v8 - customisable controls (phone feedback: "make it so you can customise controls"). Settings > Controls > Edit layout: drag the
// stick and the buttons where your thumbs like them, pinch-free size slider, left-handed swap, reset. Saved as fractions of the screen.
import { t } from './i18n.js';
const $ = (s) => document.querySelector(s);
const PARTS = [['#stick', 'stick'], ['#sprint', 'sprint'], ['#prompt', 'action'], ['#itemBtn', 'item'], ['#bRemote', 'remote'], ['#bBell', 'bell']];
// applies the saved layout (and the HUD size / left-handed swap) to the HUD
export function applyLayout(S) {
  document.documentElement.style.setProperty('--hud-k', String(S.hudScale || 1)); document.body.classList.toggle('lefty', !!S.lefty);
  for (const [sel, key] of PARTS) { const e = $(sel); if (!e) continue; const p = S.layout && S.layout[key];
    if (p) { e.style.left = (p.x * 100).toFixed(2) + 'vw'; e.style.top = (p.y * 100).toFixed(2) + 'vh'; e.style.right = 'auto'; e.style.bottom = 'auto'; e.style.insetInlineStart = 'auto'; e.style.insetInlineEnd = 'auto'; e.style.transform = `translate(-50%,-50%) scale(${S.hudScale || 1})`; }
    else { e.style.left = e.style.top = e.style.right = e.style.bottom = e.style.insetInlineStart = e.style.insetInlineEnd = ''; e.style.transform = S.hudScale && S.hudScale !== 1 ? `scale(${S.hudScale})` : ''; } }
}
export class LayoutEditor {
  constructor(settings, sound, hooks) { this.S = settings; this.sound = sound; this.hooks = hooks; }
  open() {
    const root = $('#layoutEd'); root.hidden = false; root.innerHTML = ''; document.body.classList.add('editing'); $('#hud').hidden = false; for (const [sel] of PARTS) { const e = $(sel); if (e) { e.dataset.wasHidden = e.hidden ? '1' : ''; e.hidden = false; } }
    const bar = document.createElement('div'); bar.className = 'le-bar'; bar.innerHTML = `<b>${t('set.layoutEdit')}</b><span class="note">${t('le.hint')}</span>`;
    const mk = (lab, cls, fn) => { const b = document.createElement('button'); b.className = cls; b.textContent = lab; b.addEventListener('click', (e) => { e.stopPropagation(); this.sound.click(); fn(); }); bar.appendChild(b); };
    mk(t('le.reset'), 'btn ghost sm', () => { this.S.layout = null; this.S.hudScale = 1; applyLayout(this.S); }); mk(t('le.done'), 'btn primary sm', () => this.close()); root.appendChild(bar);
    this.layout = { ...(this.S.layout || {}) }; this.hooks.onModal(true);
    this._down = (e) => { const tgt = PARTS.find(([sel]) => { const el = $(sel); return el && el.contains(e.target); }); if (!tgt) return; e.preventDefault(); e.stopPropagation(); this.drag = { key: tgt[1], el: $(tgt[0]), id: e.pointerId }; };
    this._move = (e) => { const d = this.drag; if (!d || e.pointerId !== d.id) return; e.preventDefault(); const x = Math.max(0.04, Math.min(0.96, e.clientX / innerWidth)), y = Math.max(0.08, Math.min(0.94, e.clientY / innerHeight)); this.layout[d.key] = { x, y }; this.S.layout = this.layout; applyLayout(this.S); };
    this._up = () => { this.drag = null; };
    addEventListener('pointerdown', this._down, { capture: true }); addEventListener('pointermove', this._move, { capture: true }); addEventListener('pointerup', this._up, { capture: true });
  }
  close() {
    removeEventListener('pointerdown', this._down, { capture: true }); removeEventListener('pointermove', this._move, { capture: true }); removeEventListener('pointerup', this._up, { capture: true });
    for (const [sel] of PARTS) { const e = $(sel); if (e && e.dataset.wasHidden) e.hidden = true; }
    $('#layoutEd').hidden = true; document.body.classList.remove('editing'); this.hooks.save(); this.hooks.onModal(false);
  }
}
