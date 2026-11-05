// LUMIERE v9 - the box office sheet. Four steps: 1 film (the open films, your own video, any link or YouTube), 2 format and start time
// (MAX, CURVE, CLASSIC, 270, each with its own feel and price), 3 seat (a true top view of the hall: curved rows, sofas in pairs, seat
// classes in their colours, the best free seat picked for you), 4 the bill (ticket, class, the armrest-tablet add-on) and pay by card.
// Quick play skips the bill and reads "Start". Prices are the seat classes in hallmath.js (INR, GST included).
import { t } from './i18n.js';
import { CATALOG, filmById, posterURL } from './films.js';
import { CLASSES } from './hallmath.js';
const $ = (s) => document.querySelector(s), el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const MINS = [1, 3, 5], TABLET = 99;
const CLASS_COL = { std: '#7d8794', prime: '#c9a35e', sofa: '#b8452f', maxStd: '#3f7fd9', maxPrime: '#e3b25f', pod: '#d06b8a', recl: '#8a6a48', reclPlus: '#e3b25f', love: '#d06b8a', x270: '#1f8a8a', x270p: '#e3b25f' };
export class Booking9 {
  constructor(world, shows, sound, bill, hooks) {
    Object.assign(this, { world, shows, sound, bill, hooks, step: 1, quick: false }); this.sel = { film: 'sintel', own: false, hall: 'MAX', mins: 3, seat: null, tablet: false }; this.bind();
  }
  hall() { return this.world.hallById(this.sel.hall); }
  isOpen() { return !$('#book').hidden; }
  open(o = {}) { this.quick = !!o.quick; this.step = 1; if (o.own) this.sel.own = true; $('#book').hidden = false; this.sound.click(); if (!this.seatOk()) this.pickSeat(); this.build(); this.hooks.onModal(true); }
  close() { $('#book').hidden = true; this.hooks.onModal(false); }
  go(n) { this.step = Math.max(1, Math.min(4, n)); this.sound.click(); this.build(); }
  seat() { return this.sel.seat && this.hall().seats.find((q) => q.id === this.sel.seat); }
  seatOk() { const s = this.seat(); return !!s && !((s.taken || s.npc) && !s.player); }
  // the best free seat: a little behind the middle of the hall, in the middle of its row
  pickSeat() { const h = this.hall(), n = h.cfg.rows.length, best = Math.round(n * 0.58); const free = h.seats.filter((s) => (!s.taken && !s.npc) || s.player).sort((a, b) => (Math.abs(a.row - best) * 2 + Math.abs(a.a) * 0.8) - (Math.abs(b.row - best) * 2 + Math.abs(b.a) * 0.8))[0]; this.sel.seat = free ? free.id : null; }
  price() { const s = this.seat(); return s ? CLASSES[s.cls].price : 0; }
  total() { return this.price() + (this.sel.tablet ? TABLET : 0); }
  title() { return this.sel.own ? (this.shows.own ? this.shows.own.title : t('book.ownName')) : filmById(this.sel.film).title; }
  build() {
    const st = this.step; for (let i = 1; i <= 4; i++) $('#bkStep' + i).hidden = i !== st;
    [...$('#bkSteps').children].forEach((li, i) => { li.className = i + 1 === st ? 'on' : i + 1 < st ? 'done' : ''; });
    $('#bkStepLbl').textContent = `${st} / 4`; $('#bkTitle').textContent = t(['book.step1', 'book9.step2', 'book.seat', 'book9.step4'][st - 1]);
    $('#bkBack').hidden = st === 1; $('#bkWallet').hidden = true;
    if (st === 1) this.stepFilm(); else if (st === 2) this.stepHall(); else if (st === 3) this.stepSeat(); else this.stepPay();
    const s = this.seatOk() ? this.seat() : null, h = this.hall();
    $('#seatSel').textContent = st === 1 ? this.title() : st === 2 ? `${h.name.replace('LUMIERE ', '')} · ${t('book.inMins', { n: this.sel.mins })}` : s ? `${s.id} · ${CLASSES[s.cls].label}${this.quick ? '' : ' · ' + this.bill.fmt(CLASSES[s.cls].price)}` : '';
    $('#bkNextLbl').textContent = st < 4 ? t('book.next') : this.quick ? t('book.start') : t('book9.payCard', { price: this.bill.fmt(this.total()) });
    $('#bkNext').disabled = (st === 1 && this.sel.own && !this.shows.own) || (st >= 3 && !s);
  }
  stepFilm() {
    const box = $('#films'); box.innerHTML = '';
    for (const f of CATALOG) { const d = el('button', 'film' + (!this.sel.own && this.sel.film === f.id ? ' on' : '')); const img = new Image(); img.alt = ''; img.loading = 'lazy'; img.src = posterURL(f.id); d.appendChild(img);
      d.appendChild(el('b', null, f.short || f.title)); d.appendChild(el('small', null, `${t('genre.' + f.genre)} · ${t('book.mins', { n: f.mins })}`));
      d.addEventListener('click', () => { this.sel.film = f.id; this.sel.own = false; this.sound.click(); this.build(); }); box.appendChild(d); }
    const o = el('button', 'film own-card' + (this.sel.own ? ' on' : '')); o.appendChild(el('div', 'own-art')); o.firstChild.innerHTML = '<svg class="ic"><use href="#i-film"/></svg>';
    o.appendChild(el('b', null, t('book.ownCard'))); o.appendChild(el('small', null, this.shows.own ? this.shows.own.title : t('book9.ownHint')));
    o.addEventListener('click', () => { this.sel.own = true; this.sound.click(); this.build(); if (!this.shows.own) this.hooks.pickOwn(); }); box.appendChild(o);
    $('#ownPanel').hidden = !this.sel.own; $('#ownState').textContent = this.shows.own ? t('book.ownSet', { name: this.shows.own.title }) : t('book.ownNone');
  }
  stepHall() {
    const box = $('#halls'); box.innerHTML = '';
    for (const h of this.world.halls) { const c = h.cfg, free = h.seats.filter((s) => !s.taken && !s.npc).length, from = Math.min(...h.seats.map((s) => CLASSES[s.cls].price)), d = el('button', 'hallc' + (this.sel.hall === c.id ? ' on' : ''));
      d.appendChild(el('b', null, c.name.replace('LUMIERE ', ''))); d.appendChild(el('small', null, t('fmt9.' + c.id))); d.appendChild(el('em', null, (this.quick ? '' : t('book9.from', { price: this.bill.fmt(from) }) + ' · ') + t('book.seatsFree', { n: free })));
      d.addEventListener('click', () => { if (this.sel.hall !== c.id) { this.sel.hall = c.id; this.pickSeat(); } this.sound.click(); this.build(); }); box.appendChild(d); }
    const tm = $('#times'); tm.innerHTML = ''; for (const m of MINS) { const b = el('button', this.sel.mins === m ? 'on' : '', t('book.inMins', { n: m })); b.addEventListener('click', () => { this.sel.mins = m; this.sound.click(); this.build(); }); tm.appendChild(b); }
    $('#tpVal').textContent = t('book.inMins', { n: this.sel.mins });
  }
  // a true top view: every seat at its own (u, d), the screen along the top, curved rows curve, sofas sit in pairs
  stepSeat() {
    const h = this.hall(), c = h.cfg, m = $('#seatmap'); m.innerHTML = ''; $('#hallName').textContent = `${c.name.replace('LUMIERE ', '')} · ${t('fmt9.' + c.id)}`;
    const free = h.seats.some((s) => !s.taken && !s.npc); $('#seatEmpty').hidden = free; m.hidden = !free; if (!free) return;
    const body = $('#book .sh-body'), W = Math.max(240, (body.clientWidth || 600) - 24), Hh = Math.max(150, (body.clientHeight || 260) - 70);
    const us = h.seats.map((s) => s.u), ds = h.seats.map((s) => s.d), u0 = Math.min(...us) - 0.6, u1 = Math.max(...us) + 0.6, d0 = Math.min(...ds) - 0.8, d1 = Math.max(...ds) + 0.5, k = Math.min(W / (u1 - u0), Hh / (d1 - d0));
    m.style.position = 'relative'; m.style.height = ((d1 - d0) * k + 34) + 'px'; m.style.width = ((u1 - u0) * k) + 'px'; m.style.margin = '0 auto';
    const scr = el('div', 'scr'); scr.appendChild(el('span', null, t('book.screen').toUpperCase())); scr.style.cssText = 'position:absolute;left:4%;right:4%;top:0;margin:0'; m.appendChild(scr);
    for (const s of h.seats) { const taken = (s.taken || s.npc) && !s.player, w = Math.max(8, (s.kind === 'rocker' ? 0.52 : 0.78) * k), b = el('button', 'seat' + (taken ? ' taken' : '') + (s.id === this.sel.seat ? ' sel' : ''));
      b.setAttribute('aria-label', `${s.id} ${CLASSES[s.cls].label}`); b.style.cssText = `position:absolute;left:${((s.u - u0) * k - w / 2).toFixed(1)}px;top:${(26 + (s.d - d0) * k - w / 2).toFixed(1)}px;width:${w.toFixed(1)}px;height:${(w * 0.8).toFixed(1)}px;border-color:${CLASS_COL[s.cls]};${s.pair >= 0 ? 'border-radius:' + (s.pairSide ? '2px 6px 6px 2px' : '6px 2px 2px 6px') : ''}`;
      if (!taken) b.addEventListener('click', () => { this.sel.seat = s.id; this.sound.click(); this.build(); }); m.appendChild(b); }
    // the legend: each class in the hall with its price
    const lg = el('div', 'legend'); lg.style.cssText = 'position:absolute;left:0;right:0;bottom:-2px;display:flex;gap:10px;justify-content:center;font-size:11px;opacity:.85';
    for (const cls of [...new Set(h.seats.map((s) => s.cls))]) { const i = el('span'); i.innerHTML = `<i style="display:inline-block;width:9px;height:9px;border:2px solid ${CLASS_COL[cls]};border-radius:3px;margin-right:4px;vertical-align:-1px"></i>`; i.appendChild(document.createTextNode(CLASSES[cls].label + (this.quick ? '' : ' ' + this.bill.fmt(CLASSES[cls].price)))); lg.appendChild(i); }
    m.appendChild(lg);
  }
  stepPay() {
    const h = this.hall(), c = h.cfg, s = this.seat(), S = $('#bkSummary'); S.innerHTML = '';
    const img = new Image(); img.alt = ''; img.src = this.sel.own ? '' : posterURL(this.sel.film); if (this.sel.own) img.className = 'own-poster'; S.appendChild(img);
    const tx = el('div'); tx.appendChild(el('h3', null, this.title())); tx.appendChild(el('div', 'note', `${c.name.replace('LUMIERE ', '')} · ${t('fmt9.' + c.id)}`));
    const meta = el('div', 'meta'); for (const txt of [s ? `${s.id} · ${CLASSES[s.cls].label}` : '', t('book.inMins', { n: this.sel.mins })]) if (txt) meta.appendChild(el('span', 'badge', txt)); tx.appendChild(meta);
    // the armrest tablet: order from your seat without calling anyone
    const tb = el('button', 'addon' + (this.sel.tablet ? ' on' : '')); tb.innerHTML = '<svg class="ic"><use href="#i-tablet"/></svg>'; tb.appendChild(el('b', null, t('book9.tablet'))); tb.appendChild(el('small', null, this.quick ? t('book9.tabletQuick') : t('book9.tabletNote', { price: this.bill.fmt(TABLET) })));
    tb.addEventListener('click', () => { this.sel.tablet = !this.sel.tablet; this.sound.click(); this.build(); }); if (!this.quick) tx.appendChild(tb);
    if (!this.quick) { const pay = el('div', 'paybox'); pay.appendChild(el('div', 'row', `${t('book9.ticket')}  ${this.bill.fmt(this.price())}`)); if (this.sel.tablet) pay.appendChild(el('div', 'row', `${t('book9.tablet')}  ${this.bill.fmt(TABLET)}`));
      pay.appendChild(el('div', 'row total', `${t('book9.total')}  ${this.bill.fmt(this.total())}`)); pay.appendChild(el('div', 'row muted', t('book9.card'))); tx.appendChild(pay); }
    if (!this.sel.own) { const f = filmById(this.sel.film); tx.appendChild(el('p', 'note credit', `${f.title} (${f.year}) · ${f.by} · ${f.lic}`)); }
    S.appendChild(tx);
  }
  confirm() {
    const h = this.hall(), s = this.seatOk() && this.seat(); if (!s) { this.hooks.toast(t('toast.seatTaken'), 2600, 'error'); this.go(3); return; }
    if (!this.quick) { this.bill.pay(this.price(), 'ticket'); if (this.sel.tablet) this.bill.pay(TABLET, 'tablet'); }
    const c = h.cfg, src = this.sel.own ? this.shows.own : { kind: 'film', filmId: this.sel.film };
    const tk = { hall: c.id, hallKey: c.key, hallName: c.name, kind: c.format, src, title: this.title(), seat: s.id, row: s.id.replace(/\d+/, ''), col: s.col, cls: s.cls, delay: this.sel.mins * 60, price: this.price(), tablet: this.quick || this.sel.tablet, shown: false, checked: this.quick };
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
