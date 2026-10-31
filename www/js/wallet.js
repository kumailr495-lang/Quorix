// LUMIERE v8 - money (phone feedback: "you have a limited amount of money; buy a ticket first, then use that ticket; withdraw from the ATM,
// a certain amount only; rejoin and it resets"). Nothing is saved: every new game starts with the same cash and the same ATM allowance.
// Quick mode has unlimited money (Wallet.unlimited) and never shows prices as a problem.
// Prices follow the player's region: rupees for India (or Hindi/Urdu), dollars elsewhere.
const INR = { sym: '₹', start: 900, atm: 3000, notes: [200, 500, 1000], ticket: { standard: 250, curved: 380, imax: 520 }, own: 1.0, item: { popcorn: 180, combo: 320, nachos: 160, cola: 110, coffee: 150, mocktail: 190, water: 40 }, replay: 150 };
const USD = { sym: '$', start: 40, atm: 120, notes: [20, 40, 60], ticket: { standard: 12, curved: 16, imax: 21 }, own: 1.0, item: { popcorn: 8, combo: 13, nachos: 7, cola: 5, coffee: 6, mocktail: 8, water: 2 }, replay: 6 };
export class Wallet {
  constructor(lang) {
    const reg = (navigator.language || '').split('-')[1] || ''; this.P = reg === 'IN' || reg === 'PK' || lang === 'hi' || lang === 'ur' ? INR : USD;
    this.unlimited = false; this.reset(); this.onChange = null;
  }
  reset() { this.cash = this.P.start; this.atmLeft = this.P.atm; this.spent = 0; this.log = []; this._emit(); }
  _emit() { this.onChange && this.onChange(this); }
  fmt(n) { return this.P.sym + Math.round(n).toLocaleString(); }
  ticketPrice(kind) { return this.P.ticket[kind] || this.P.ticket.standard; }
  itemPrice(kind) { const k = /salted|caramel|popcorn/.test(kind) ? 'popcorn' : kind; return this.P.item[k] ?? this.P.item.popcorn; }
  can(n) { return this.unlimited || this.cash >= n; }
  // pay: false (and nothing changes) when the cash is short
  pay(n, what) { if (this.unlimited) { this.log.push({ what, n: 0 }); return true; } if (this.cash < n) return false; this.cash -= n; this.spent += n; this.log.push({ what, n }); this._emit(); return true; }
  // ATM: notes up to what is left of this visit's allowance
  withdraw(n) { if (n > this.atmLeft) return false; this.atmLeft -= n; this.cash += n; this._emit(); return true; }
}
