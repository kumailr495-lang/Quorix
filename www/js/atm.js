// LUMIERE v8 - the ATM by the entrance (phone feedback: "you can withdraw from the ATM, a certain amount only; rejoin and it resets").
// Insert card -> any four-digit PIN -> pick an amount (up to what is left of this visit's allowance) -> cash out.
import { t } from './i18n.js';
const $ = (s) => document.querySelector(s), el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
export class Atm {
  constructor(wallet, sound, hooks) { this.wallet = wallet; this.sound = sound; this.hooks = hooks; this.pin = ''; $('#atm').addEventListener('click', (e) => { if (e.target === $('#atm')) this.close(); }); }
  open() { $('#atm').hidden = false; this.pin = ''; this.sound.click(); this.screen('card'); this.hooks.onModal(true); }
  close() { $('#atm').hidden = true; this.hooks.onModal(false); }
  screen(kind) {
    const root = $('#atm'); root.innerHTML = ''; const box = el('div', 'atm'), scr = el('div', 'atm-scr'); box.appendChild(el('div', 'atm-brand', 'LUMIÈRE · ATM')); box.appendChild(scr); root.appendChild(box);
    const W = this.wallet, msg = (a, b) => { scr.appendChild(el('h3', null, a)); if (b) scr.appendChild(el('p', 'note', b)); };
    const btn = (lab, fn, cls = 'btn secondary') => { const b = el('button', cls, lab); b.addEventListener('click', (e) => { e.stopPropagation(); this.sound.click(); fn(); }); return b; };
    if (kind === 'card') { msg(t('atm.welcome'), t('atm.left', { amount: W.fmt(W.atmLeft) })); const card = el('div', 'atm-card'); card.appendChild(el('span', null, 'LUMIÈRE')); scr.appendChild(card); scr.appendChild(btn(t('atm.insert'), () => { card.classList.add('in'); this.sound.atm && this.sound.atm('card'); setTimeout(() => this.screen('pin'), 650); }, 'btn primary')); }
    else if (kind === 'pin') { msg(t('atm.pin')); const dots = el('div', 'atm-dots'); for (let i = 0; i < 4; i++) dots.appendChild(el('i', i < this.pin.length ? 'on' : '')); scr.appendChild(dots); const pad = el('div', 'atm-pad');
      for (const k of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']) { if (!k) { pad.appendChild(el('span')); continue; } pad.appendChild(btn(k, () => { if (k === '⌫') this.pin = this.pin.slice(0, -1); else if (this.pin.length < 4) this.pin += k; this.sound.atm && this.sound.atm('key'); if (this.pin.length === 4) setTimeout(() => this.screen('amount'), 300); else this.screen('pin'); }, 'atm-key')); }
      scr.appendChild(pad); }
    else if (kind === 'amount') { msg(t('atm.howMuch'), t('atm.left', { amount: W.fmt(W.atmLeft) })); const g = el('div', 'atm-amts');
      for (const n of W.P.notes) { const b = btn(W.fmt(n), () => this.cash(n), 'btn secondary'); if (n > W.atmLeft) b.disabled = true; g.appendChild(b); }
      const all = btn(t('atm.max', { amount: W.fmt(W.atmLeft) }), () => this.cash(W.atmLeft), 'btn primary'); if (W.atmLeft <= 0) all.disabled = true; g.appendChild(all); scr.appendChild(g);
      if (W.atmLeft <= 0) scr.appendChild(el('p', 'warn', t('atm.limit'))); scr.appendChild(btn(t('atm.cancel'), () => this.close(), 'btn ghost')); }
    else if (kind === 'done') { msg(t('atm.take'), t('atm.balance', { amount: W.fmt(W.cash) })); const notes = el('div', 'atm-notes'); for (let i = 0; i < 3; i++) notes.appendChild(el('i')); scr.appendChild(notes); scr.appendChild(btn(t('atm.done'), () => this.close(), 'btn primary')); }
  }
  cash(n) { if (!this.wallet.withdraw(n)) { this.hooks.toast(t('atm.limit'), 2600, 'error'); return; } this.sound.atm && this.sound.atm('cash'); this.screen('done'); this.hooks.toast(t('atm.got', { amount: this.wallet.fmt(n) }), 2400); }
}
