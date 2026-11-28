// LUMIERE v14 - Lumiere Credits (LC), the cinema's own play money (the user, 11-20: "money from jobs ... watching house films could be a good
// option"; the master prompt: earn by watching licensed Lumiere films, jobs, tasks and events; spend on tickets, food, cosmetics, premium
// seats, waiter priority, emotes and theatre decoration; no real-money withdrawal; never for YouTube watch time).
// One LC buys what one rupee bought on the old bill (a Classic ticket is 260 LC), so the cinema's prices keep their sense.
// Kept on this device (localStorage). There is no server of ours, so this is not server-authoritative: a checksum with a per-device salt
// catches casual edits (a mismatch restores the starting balance), a determined player can still edit their own phone. Credits are never
// shared or traded between players, so nobody else is affected by that.
const KEY = 'lumiere.credits.v1', SALT = 'lumiere.credits.k', START = 1500;
export const DAILY_CAP = 2500;
export const LOAN = { amount: 500, fee: 0.1, cut: 0.4 };   // the most anyone can earn in a day (films, jobs and tasks together)
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
function fnv(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36); }
function salt() {
  try { let k = localStorage.getItem(SALT); if (!k) { const r = crypto.getRandomValues(new Uint32Array(4)); k = Array.from(r, (v) => v.toString(36)).join(''); localStorage.setItem(SALT, k); } return k; } catch (e) { return 'x'; }
}
const fresh = () => ({ bal: START, hist: [{ t: Date.now(), n: START, why: 'welcome' }], day: { d: today(), earned: 0 }, inv: {}, films: {} });

export class Credits {
  constructor() { this.k = salt(); this.s = this._load(); this.listeners = new Set(); }
  _load() {
    try {
      const raw = localStorage.getItem(KEY); if (!raw) return fresh();
      const o = JSON.parse(raw); if (!o || typeof o.d !== 'string' || o.c !== fnv(this.k + o.d)) return { ...fresh(), restored: true };
      const s = JSON.parse(o.d); if (!Number.isFinite(s.bal) || !Array.isArray(s.hist)) return fresh();
      s.inv = s.inv && typeof s.inv === 'object' ? s.inv : {}; s.films = s.films && typeof s.films === 'object' ? s.films : {}; s.day = s.day || { d: today(), earned: 0 }; return s;
    } catch (e) { return fresh(); }
  }
  _save() { try { const d = JSON.stringify(this.s); localStorage.setItem(KEY, JSON.stringify({ d, c: fnv(this.k + d) })); } catch (e) { /* storage full or off: the session keeps its numbers */ } }
  _roll() { const d = today(); if (this.s.day.d !== d) this.s.day = { d, earned: 0 }; }
  _emit() { for (const f of this.listeners) { try { f(this); } catch (e) { console.warn('[credits]', e); } } }
  onChange(f) { this.listeners.add(f); return () => this.listeners.delete(f); }
  get bal() { return this.s.bal; }
  get earnedToday() { this._roll(); return this.s.day.earned; }
  fmt(n) { return `${Math.round(n).toLocaleString('en-IN')} LC`; }
  can(n) { return this.s.bal >= n; }
  // earn: capped per day; returns what was actually added (0 once the day's cap is reached)
  earn(n, why) {
    n = Math.max(0, Math.round(n)); this._roll(); const g = Math.min(n, Math.max(0, DAILY_CAP - this.s.day.earned)); if (!g) return 0;
    this.s.bal += g; this.s.day.earned += g; this._log(g, why);
    // v14c a loan is paid back out of what you earn: 40 % of each payment until it is cleared
    const L = this.s.loan; if (L && L.owed > 0) { const back = Math.min(L.owed, Math.max(1, Math.round(g * LOAN.cut)), this.s.bal); if (back > 0) { L.owed -= back; this.s.bal -= back; if (L.owed <= 0) this.s.loan = null; this._log(-back, 'loan:back'); } }
    return g;
  }
  // v14c (the user, 11-26: "they can also take loans"): one loan at a time, 500 LC, 550 LC to pay back (10 %), repaid from earnings or at once
  get loan() { return this.s.loan || null; }
  borrow() { if (this.s.loan) return false; this.s.loan = { owed: LOAN.amount + Math.round(LOAN.amount * LOAN.fee), t: Date.now() }; this.s.bal += LOAN.amount; this._log(LOAN.amount, 'loan'); return true; }
  repay() { const L = this.s.loan; if (!L) return false; const n = Math.min(L.owed, this.s.bal); if (n <= 0) return false; L.owed -= n; this.s.bal -= n; if (L.owed <= 0) this.s.loan = null; this._log(-n, 'loan:back'); return true; }
  spend(n, why) { n = Math.max(0, Math.round(n)); if (!n) return true; if (this.s.bal < n) return false; this.s.bal -= n; this._log(-n, why); return true; }
  _log(n, why) { this.s.hist.unshift({ t: Date.now(), n, why: String(why || '').slice(0, 40) }); if (this.s.hist.length > 80) this.s.hist.length = 80; this._save(); this._emit(); }
  history() { return this.s.hist; }
  owns(id) { return !!this.s.inv[id]; }
  count(id) { return this.s.inv[id] | 0; }
  // buy a shop item: permanent (cosmetics, emotes, themes) or a consumable counted down by use (waiter priority passes)
  buy(id, price, consumable = false) { if (!consumable && this.owns(id)) return true; if (!this.spend(price, 'shop:' + id)) return false; this.s.inv[id] = consumable ? this.count(id) + 1 : 1; this._save(); this._emit(); return true; }
  use(id) { if (!this.count(id)) return false; this.s.inv[id] = this.count(id) - 1; this._save(); this._emit(); return true; }
  // a house film pays once per film per day
  filmPaid(id) { this._roll(); return this.s.films[id] === this.s.day.d; }
  markFilm(id) { this._roll(); this.s.films[id] = this.s.day.d; this._save(); }
  get restored() { return !!this.s.restored; }
}
