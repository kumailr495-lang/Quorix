// LUMIERE v8 - the box office sheet (phone feedback: buy a ticket first, then the ticket plays the film; pick the start time; the house films
// are gone). Four steps: 1 film (the open films, or your own video), 2 screen + start time, 3 seat (middle seats first), 4 pay.
// Quick mode skips the money (Wallet.unlimited) and the last step reads "Start".
import { t } from './i18n.js';
import { CATALOG, filmById, posterURL } from './films.js';
import { ROW_LETTERS } from './layout.js';
const $ = (s) => document.querySelector(s), el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const MINS = [1, 3, 5];
export class Booking {
  constructor(world, shows, sound, wallet, hooks) {
    this.world = world; this.shows = shows; this.sound = sound; this.wallet = wallet; this.hooks = hooks; this.step = 1; this.quick = false;
    this.sel = { film: 'cosmos', own: false, hall: 'I', mins: 1, seat: null }; this.bind();
  }
  hall() { return this.world.hallById(this.sel.hall); }
  isOpen() { return !$('#book').hidden; }
  open(o = {}) { this.quick = !!o.quick; this.step = 1; $('#book').hidden = false; this.sound.click(); if (!this.seatOk()) this.pickSeat(); this.build(); this.hooks.onModal(true); }
  close() { $('#book').hidden = true; this.hooks.onModal(false); }
  go(n) { this.step = Math.max(1, Math.min(4, n)); this.sound.click(); this.build(); }
  seatOk() { const s = this.sel.seat && this.hall().seats.find((q) => q.id === this.sel.seat); return !!s && !((s.taken || s.npc) && !s.player); }
  // the best free seat: the middle of a row a little behind the centre of the hall (where the sound and the picture are balanced)
  pickSeat() { const h = this.hall(), c = h.cfg, row = Math.min(c.rows - 2, Math.round(c.rows * 0.55)); const free = h.seats.filter((s) => (!s.taken && !s.npc) || s.player).sort((a, b) => (Math.abs(a.row - row) * 2.2 + Math.abs(a.u) * 1.4) - (Math.abs(b.row - row) * 2.2 + Math.abs(b.u) * 1.4))[0]; this.sel.seat = free ? free.id : null; }
  price() { return this.wallet.ticketPrice(this.hall().cfg.kind); }
  title() { return this.sel.own ? (this.shows.own ? this.shows.own.label : t('book.ownName')) : filmById(this.sel.film).title; }
  build() {
    const st = this.step; for (let i = 1; i <= 4; i++) $('#bkStep' + i).hidden = i !== st;
    [...$('#bkSteps').children].forEach((li, i) => { li.className = i + 1 === st ? 'on' : i + 1 < st ? 'done' : ''; });
    $('#bkStepLbl').textContent = `${st} / 4`; $('#bkTitle').textContent = t(['book.step1', 'book.step2', 'book.seat', 'book.step4'][st - 1]);
    $('#bkBack').hidden = st === 1; $('#bkWallet').textContent = this.wallet.unlimited ? '' : this.wallet.fmt(this.wallet.cash); $('#bkWallet').hidden = this.wallet.unlimited;
    if (st === 1) this.stepFilm(); else if (st === 2) this.stepHall(); else if (st === 3) this.stepSeat(); else this.stepPay();
    const s = this.seatOk() ? this.hall().seats.find((q) => q.id === this.sel.seat) : null;
    $('#seatSel').textContent = st === 1 ? this.title() : st === 2 ? `${this.hall().cfg.name} · ${t('book.inMins', { n: this.sel.mins })}` : s ? `${this.hall().cfg.name} · ${t('book.selected', { row: ROW_LETTERS[s.row], seat: s.col })}` : '';
    const pay = st === 4 && !this.quick, need = this.price();
    $('#bkNextLbl').textContent = st < 4 ? t('book.next') : this.quick ? t('book.start') : t('book.pay', { price: this.wallet.fmt(need) });
    $('#bkNext').disabled = (st === 1 && this.sel.own && !this.shows.own) || (st >= 3 && !s) || (pay && !this.wallet.can(need));
  }
  stepFilm() {
    const box = $('#films'); box.innerHTML = '';
    for (const f of CATALOG) {
      const d = el('button', 'film' + (!this.sel.own && this.sel.film === f.id ? ' on' : '')); const img = new Image(); img.alt = ''; img.loading = 'lazy'; img.src = posterURL(f.id); d.appendChild(img);
      d.appendChild(el('b', null, f.short || f.title)); d.appendChild(el('small', null, `${t('genre.' + f.genre)} · ${t('book.mins', { n: f.mins })}`));
      d.addEventListener('click', () => { this.sel.film = f.id; this.sel.own = false; this.sound.click(); this.build(); }); box.appendChild(d);
    }
    const o = el('button', 'film own-card' + (this.sel.own ? ' on' : '')); o.appendChild(el('div', 'own-art')); o.firstChild.innerHTML = '<svg class="ic"><use href="#i-film"/></svg>';
    o.appendChild(el('b', null, t('book.ownCard'))); o.appendChild(el('small', null, this.shows.own ? this.shows.own.label : t('book.ownHint')));
    o.addEventListener('click', () => { this.sel.own = true; this.sound.click(); this.build(); if (!this.shows.own) this.hooks.pickOwn(); }); box.appendChild(o);
    $('#ownPanel').hidden = !this.sel.own; $('#ownState').textContent = this.shows.own ? t('book.ownSet', { name: this.shows.own.label }) : t('book.ownNone');
  }
  stepHall() {
    const box = $('#halls'); box.innerHTML = '';
    for (const h of this.world.halls) { const c = h.cfg, free = h.seats.filter((s) => !s.taken && !s.npc).length, d = el('button', 'hallc' + (this.sel.hall === c.id ? ' on' : ''));
      d.appendChild(el('b', null, c.name)); d.appendChild(el('small', null, t('kind.' + c.kind))); d.appendChild(el('em', null, this.wallet.unlimited ? t('book.seatsFree', { n: free }) : `${this.wallet.fmt(this.wallet.ticketPrice(c.kind))} · ${t('book.seatsFree', { n: free })}`));
      d.addEventListener('click', () => { if (this.sel.hall !== c.id) { this.sel.hall = c.id; this.pickSeat(); } this.sound.click(); this.build(); }); box.appendChild(d); }
    const tm = $('#times'); tm.innerHTML = '';
    for (const m of MINS) { const b = el('button', this.sel.mins === m ? 'on' : '', t('book.inMins', { n: m })); b.addEventListener('click', () => { this.sel.mins = m; this.sound.click(); this.build(); }); tm.appendChild(b); }
    $('#tpVal').textContent = t('book.inMins', { n: this.sel.mins });
  }
  stepSeat() {
    const h = this.hall(), c = h.cfg, m = $('#seatmap'); m.innerHTML = ''; $('#hallName').textContent = `${c.name} · ${t('kind.' + c.kind).split(' · ')[0]}`;
    const free = h.seats.some((s) => !s.taken && !s.npc); $('#seatEmpty').hidden = free; m.hidden = !free; if (!free) return;
    const scr = el('div', 'scr'); scr.appendChild(el('span', null, t('book.screen').toUpperCase())); if (c.kind === 'imax') scr.style.margin = '0 1% 10px'; m.appendChild(scr);
    const cols = c.perRow, curve = c.rowR ? (u) => (c.rowR - Math.sqrt(c.rowR * c.rowR - u * u)) * 9 : () => 0;
    const body = $('#book .sh-body'), avail = body.clientHeight - 64, sh = Math.max(9, Math.min(22, avail / (c.rows + 0.7) - 3)); m.style.setProperty('--sh', sh.toFixed(1) + 'px');
    const AIS = c.aisles || [], tpl = ['12px']; for (let col = 1; col <= cols; col++) { tpl.push('1fr'); if (AIS.includes(col)) tpl.push('0.7fr'); } tpl.push('12px');
    const byId = new Map(h.seats.map((q) => [q.id, q]));
    for (let r = 0; r < c.rows; r++) { const row = el('div', 'srow'); row.style.gridTemplateColumns = tpl.join(' '); if (r === c.cross.row) row.style.marginTop = '8px';
      const lab = el('i', null, ROW_LETTERS[r]); row.appendChild(lab);
      for (let col = 1; col <= cols; col++) { const id = ROW_LETTERS[r] + col, s = byId.get(id); if (!s) { row.appendChild(el('span')); continue; } const taken = (s.taken || s.npc) && !s.player, b = el('button', 'seat' + (taken ? ' taken' : '') + (id === this.sel.seat ? ' sel' : ''));
        b.setAttribute('aria-label', id); const y = -curve(s.u); if (y) b.style.transform = `translateY(${y.toFixed(1)}px)`;
        if (!taken) b.addEventListener('click', () => { this.sel.seat = id; this.sound.click(); this.build(); }); row.appendChild(b); if (AIS.includes(col)) row.appendChild(el('span')); }
      row.appendChild(lab.cloneNode(true)); m.appendChild(row); }
  }
  stepPay() {
    const h = this.hall(), c = h.cfg, s = h.seats.find((q) => q.id === this.sel.seat), S = $('#bkSummary'); S.innerHTML = '';
    const img = new Image(); img.alt = ''; img.src = this.sel.own ? '' : posterURL(this.sel.film); if (this.sel.own) img.className = 'own-poster'; S.appendChild(img);
    const tx = el('div'); tx.appendChild(el('h3', null, this.title())); tx.appendChild(el('div', 'note', `${c.name} · ${t('kind.' + c.kind)}`));
    const meta = el('div', 'meta'); for (const txt of [s ? t('book.selected', { row: ROW_LETTERS[s.row], seat: s.col }) : '', t('book.inMins', { n: this.sel.mins })]) if (txt) meta.appendChild(el('span', 'badge', txt)); tx.appendChild(meta);
    if (!this.quick) { const p = this.price(), left = this.wallet.cash - p, pay = el('div', 'paybox');
      pay.appendChild(el('div', 'row', `${t('book.price')}  ${this.wallet.fmt(p)}`)); pay.appendChild(el('div', 'row muted', `${t('book.balance')}  ${this.wallet.fmt(this.wallet.cash)} → ${this.wallet.fmt(Math.max(0, left))}`));
      if (left < 0) pay.appendChild(el('div', 'warn', t('book.short'))); tx.appendChild(pay); }
    if (!this.sel.own) { const f = filmById(this.sel.film); tx.appendChild(el('p', 'note credit', `${f.title} (${f.year}) · ${f.by} · ${f.lic}`)); }
    S.appendChild(tx);
  }
  confirm() {
    const h = this.hall(), s = this.seatOk() && h.seats.find((q) => q.id === this.sel.seat); if (!s) { this.hooks.toast(t('toast.seatTaken'), 2600, 'error'); this.go(3); return; }
    const price = this.quick ? 0 : this.price(); if (!this.quick && !this.wallet.pay(price, 'ticket')) { this.hooks.toast(t('book.short'), 3200, 'error'); return; }
    const c = h.cfg, tk = { hall: c.id, hallKey: c.key, hallName: c.name, kind: c.kind, film: this.sel.own ? null : this.sel.film, own: this.sel.own, title: this.title(), seat: s.id, row: ROW_LETTERS[s.row], col: s.col, delay: this.sel.mins * 60, price, shown: false };
    this.close(); this.sound.chime(); this.hooks.onTicket(tk);
  }
  bind() {
    const tap = (sel, fn) => $(sel).addEventListener('click', (e) => { e.stopPropagation(); this.sound.unlock(); fn(e); });
    tap('#bookX', () => { this.sound.click(); this.close(); }); tap('#bkBack', () => this.go(this.step - 1)); tap('#bkOther', () => this.go(2));
    tap('#bkNext', () => { if (this.step < 4) this.go(this.step + 1); else this.confirm(); });
    tap('#tpMinus', () => { this.sel.mins = Math.max(1, this.sel.mins - 1); this.sound.click(); this.build(); }); tap('#tpPlus', () => { this.sel.mins = Math.min(30, this.sel.mins + 1); this.sound.click(); this.build(); });
    tap('#pick', () => this.hooks.pickOwn()); tap('#urlUse', () => { const u = $('#url').value.trim(); if (!/^https?:\/\//i.test(u)) { this.hooks.toast(t('toast.badLink'), 3000, 'error'); return; } this.hooks.useLink(u); });
    $('#book').addEventListener('click', (e) => { if (e.target === $('#book')) this.close(); });
  }
}
