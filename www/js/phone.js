// LUMIERE v13 - the phone in your pocket (the user's two phone photos, 11-20: a phone held up in a night street with the time, health, a
// torch and money; a see-through phone over an open-world game with widgets and an app grid). It slides up at the right side of the
// screen, the cinema stays in view and you keep walking and looking (only the phone itself takes taps). Home: the time, your next show, your tab; eight apps, each a real view of something the game has:
//   Ticket   your booking (film, screen, row, seat), "show it" opens the ticket, "guide me" turns the floor guide on
//   Map      the building's plan (building.js ROOMS) with you on it and your screen marked
//   Tab      what you have spent tonight (the bill's lines)
//   Camera   a photo of the view (the frame after the next render), kept on this device (lumiere.photos, the last 12)
//   Photos   those photos; on a desktop browser one can be saved as a file (the Android app has no picture bridge yet, so no button there)
//   Stubs    the films you watched to the end (main.js stubs)
//   Friends  the play-together panel (mpui.js)
//   Settings the settings
// Nothing here pretends: an app shows what exists or says plainly that it is empty.
import { t } from './i18n.js';
import { SHOP } from './career.js';
import { DAILY_CAP, LOAN } from './credits.js';
import { THEMES, SWATCH } from './theatres.js';
import { BRIDGE, FLANK_W, LINK_W, FLANK_E, LINK_E, PANTRY, HALL, LOBBY, MEZZ, WC, SPINE, STREET, CORE, COUNTERS } from './building.js';
import { itemById } from './menu.js';
import { SLOTS, PAINT } from './home.js';
const $ = (s) => document.querySelector(s), el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const icon = (id) => `<svg class="ic"><use href="#${id}"/></svg>`;
const store = { get(k, d) { try { return JSON.parse(localStorage.getItem('lumiere.' + k)) ?? d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('lumiere.' + k, JSON.stringify(v)); return true; } catch (e) { return false; } } };
// v14 Wallet (Lumiere Credits, credits.js), Jobs, Tasks and Shop (career.js) join the apps; the old Tab is the wallet's history now
const APPS = [['ticket', 'i-ticket'], ['map', 'i-pin'], ['home', 'i-home'], ['wallet', 'i-cash'], ['jobs', 'i-bolt'], ['tasks', 'i-check'], ['shop', 'i-star'], ['theatre', 'i-seat'], ['stubs', 'i-film'], ['camera', 'i-camera'], ['photos', 'i-image'], ['friends', 'i-people'], ['settings', 'i-gear']];
const two = (n) => String(n).padStart(2, '0');
const LINE = { loan: 'loan.got', ticket: 'phone.line.ticket', tablet: 'phone.line.tablet', salted: 'opt9.salted', caramel: 'opt9.caramel', cheese: 'opt9.cheese', nachos: 'opt9.nachos', cola: 'opt9.drink', coffee: 'opt9.coffee', water: 'item.water', combo: 'opt9.combo' };
export class Phone {
  // hooks: ticket (the booking or null), bill, stubs, player, room, snap (hands back the photo after the next frame), guide, showTicket,
  // together, settings, sound, toast, native (true inside the Android app)
  constructor(hooks) {
    this.h = hooks; this.app = null; this._t = 0; this.photos = store.get('photos', []);
    const root = $('#phone'); root.innerHTML = `<div class="ph-dev" role="dialog" aria-modal="false"><i class="ph-island"></i><div class="ph-scr">
      <div class="ph-bar"><b id="phClock"></b><span class="ph-sig"><i></i><i></i><i></i><i></i></span><span class="ph-bat"><i></i></span></div>
      <div class="ph-body" id="phBody"></div>
      <button class="ph-home" id="phHome" aria-label="${t('phone.home')}"></button></div></div>`;
    $('#phHome').addEventListener('click', (e) => { e.stopPropagation(); this.h.sound.click(); if (this.app) this.home(); else this.close(); });
  }
  isOpen() { return !$('#phone').hidden; }
  toggle() { if (this.isOpen()) this.close(); else this.open(); }
  open(app = null) {
    const r = $('#phone'); r.hidden = false; r.classList.remove('out'); document.body.classList.add('ph-open'); this.h.sound.click();
    if (app) this.show(app); else this.home();
    clearInterval(this._t); this._t = setInterval(() => this.tick(), 1000); this.tick();
  }
  close() { if (!this.isOpen()) return; const r = $('#phone'); r.classList.add('out'); document.body.classList.remove('ph-cam', 'ph-open'); clearInterval(this._t); setTimeout(() => { r.hidden = true; r.classList.remove('out'); }, 240); }
  tick() { const d = new Date(), s = `${two(d.getHours())}:${two(d.getMinutes())}`; $('#phClock').textContent = s; const big = $('#phBig'); if (big) big.textContent = s; const n = $('#phNext'); if (n) this.nextShow(n); }
  body(cls) { const B = $('#phBody'); B.innerHTML = ''; B.className = 'ph-body ph-k-' + cls; $('#phone').classList.toggle('viewfinder', cls === 'camera'); document.body.classList.toggle('ph-cam', cls === 'camera'); return B; }
  // ---------------- home ----------------
  home() {
    this.app = null; const B = this.body('home'), d = new Date(); this._quickJump = this.h.jump ? this.h.jump() : null;
    const top = el('div', 'ph-time'); top.appendChild(el('b', null, '')).id = 'phBig';
    top.appendChild(el('small', null, d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }))); B.appendChild(top);
    const w = el('div', 'ph-widgets'), next = el('button', 'ph-wg next'); next.id = 'phNext'; next.addEventListener('click', (e) => { e.stopPropagation(); this.show('ticket'); }); w.appendChild(next);
    const C = this.h.credits, tab = el('button', 'ph-wg tab'); tab.innerHTML = `${icon('i-cash')}<b>${C.fmt(C.bal)}</b><small>${t('wallet.today', { n: C.earnedToday })}</small>`; tab.addEventListener('click', (e) => { e.stopPropagation(); this.show('wallet'); }); w.appendChild(tab);
    B.appendChild(w); this.nextShow(next);
    // v14 (the user, 11-20: "the phone UI is so bad"; their reference: a frosted phone with colourful icons and a dock): four apps on the
    // page, four in the dock, each icon its own colour
    const grid = el('div', 'ph-apps'), dock = el('div', 'ph-dock'), DOCK = new Set(['camera', 'photos', 'friends', 'settings']);
    for (const [k, ic] of APPS) { const a = el('button', 'ph-app'); a.dataset.k = k; a.innerHTML = `<i>${icon(ic)}</i><span>${t('phone.app.' + k)}</span>`; a.addEventListener('click', (e) => { e.stopPropagation(); this.h.sound.click(); this.show(k); }); (DOCK.has(k) ? dock : grid).appendChild(a); }
    B.appendChild(grid); B.appendChild(dock); this.tick();
    // v14b (the user, 11-26: "in quick play add it so that you can directly tp to theatres"): the four screens, one tap each
    if (this._quickJump) { const row = el('div', 'ph-chips ph-jump'); for (const h of this._quickJump.halls) { const b = el('button', 'ph-chip', h.name); b.addEventListener('click', (e) => { e.stopPropagation(); this.h.sound.click(); this.close(); this._quickJump.go(h.key); }); row.appendChild(b); } B.insertBefore(row, B.children[2] || null); }
  }
  nextShow(n) {
    const tk = this.h.ticket(); if (!tk) { n.innerHTML = `${icon('i-ticket')}<b>${t('phone.noShow')}</b><small>${t('phone.bookHint')}</small>`; return; }
    n.innerHTML = `${icon('i-ticket')}<b>${tk.title}</b><small>${tk.hallName.replace('LUMIERE ', '')} · ${t('phone.seatShort', { seat: tk.seat })}</small>`;
  }
  // ---------------- apps ----------------
  show(k) {
    this.app = k; const B = this.body(k), head = el('header', 'ph-head');
    const back = el('button', 'ph-back'); back.innerHTML = icon('i-back'); back.setAttribute('aria-label', t('phone.home')); back.addEventListener('click', (e) => { e.stopPropagation(); this.h.sound.click(); this.home(); });
    head.append(back, el('b', null, t('phone.app.' + k))); B.appendChild(head);
    const C = el('div', 'ph-view'); B.appendChild(C); this['app_' + k](C);
  }
  empty(C, title, note) { const e = el('div', 'ph-empty'); e.appendChild(el('b', null, title)); if (note) e.appendChild(el('p', 'note', note)); C.appendChild(e); return e; }
  btn(C, label, cls, fn) { const b = el('button', 'btn ' + cls + ' sm', label); b.addEventListener('click', (e) => { e.stopPropagation(); this.h.sound.click(); fn(); }); C.appendChild(b); return b; }
  app_home(C) {
    const H = this.h.home(), W = this.h.credits; if (!H || !H.room) { this.empty(C, t('home.none')); return; }
    // v14d the LUMIÈRE Suite: going up (a visit costs SUITE_PRICE; free in Quick play) or coming down, then furnishing and colours
    { const here = this.h.room && this.h.room() === 'home', c = el('div', 'ph-shop own'); c.append(el('b', null, t('suite.title')), el('small', null, t('suite.desc'))); const r = el('div', 'ph-row');
      this.btn(r, here ? t('suite.back') : t('suite.go', { price: this.h.suitePrice ? this.h.suitePrice() : '' }), 'primary', () => { this.close(); if (here) H.goOut(); else if (this.h.goSuite) this.h.goSuite(); }); c.appendChild(r); C.appendChild(c); }
    const tabs = ['furnish', 'colours']; if (!tabs.includes(this.homeTab)) this.homeTab = 'furnish';
    const chips = el('div', 'ph-chips'); for (const k of tabs) { const b = el('button', 'ph-chip' + (k === this.homeTab ? ' on' : ''), t('home.tab.' + k)); b.addEventListener('click', (e) => { e.stopPropagation(); this.h.sound.click(); this.homeTab = k; this.show('home'); }); chips.appendChild(b); }
    C.appendChild(chips); C.appendChild(el('p', 'ph-shopbal', W.fmt(W.bal)));
    const short = () => this.h.toast(t('home.short'), 2200, 'error');
    if (this.homeTab === 'furnish') {
      for (const sl of SLOTS) { C.appendChild(el('h4', 'ph-sub', t('home.slot.' + sl.id))); const row = el('div', 'ph-opts');
        for (const o of sl.opts) { const cur = H.pick(sl.id) === o.id, own = H.owns(sl.id, o.id), b = el('button', 'ph-opt' + (cur ? ' on' : '') + (own ? '' : ' buy')), nm = t('home.opt.' + sl.id + '.' + o.id);
          b.append(el('b', null, nm), el('small', null, cur ? t('home.inUse') : own ? t('home.owned') : W.fmt(o.price)));
          b.addEventListener('click', (e) => { e.stopPropagation(); if (cur) return; if (!H.choose(sl.id, o.id)) { short(); return; } this.h.toast(t(own ? 'home.placed' : 'home.bought', { name: nm }), 1800); this.show('home'); }); row.appendChild(b); }
        C.appendChild(row); }
      C.appendChild(el('p', 'note', t('home.furnishNote')));
    } else if (this.homeTab === 'colours') {
      for (const part of Object.keys(PAINT)) { C.appendChild(el('h4', 'ph-sub', t('home.paint.' + part) + '  ·  ' + W.fmt(H.paintPrice(part)))); const row = el('div', 'ph-swrow');
        for (const hex of PAINT[part]) { const cur = H.colour(part) === hex, b = el('button', 'ph-sw' + (cur ? ' on' : '') + (H.ownsColour(part, hex) ? '' : ' buy')); b.style.background = hex; b.setAttribute('aria-label', hex);
          b.addEventListener('click', (e) => { e.stopPropagation(); this.h.sound.click(); if (cur) return; if (!H.paint(part, hex)) { short(); return; } this.show('home'); }); row.appendChild(b); }
        C.appendChild(row); }
      C.appendChild(el('p', 'note', t('home.paintNote')));
    } else {
      const own = H.cinemaOwned, c = el('div', 'ph-shop' + (own ? ' own' : '')); c.append(el('b', null, t('home.cinema')), el('small', null, t('home.cinemaD'))); const r = el('div', 'ph-row');
      if (own) c.appendChild(el('small', 'ph-owned', t('home.owned'))); else this.btn(r, t('home.buyFor', { price: W.fmt(CINEMA_PRICE) }), 'primary', () => { if (!H.buyCinema()) { short(); return; } this.h.toast(t('home.cinemaBought'), 2800); this.show('home'); });
      c.appendChild(r); C.appendChild(c);
      if (own) { C.appendChild(el('h4', 'ph-sub', t('home.films'))); const seated = this.h.homeSeat();
        if (H.film) { const rr = el('div', 'ph-row'); rr.appendChild(el('small', null, t('home.nowPlaying', { title: H.film.src.title }))); this.btn(rr, t('home.stopFilm'), 'secondary', () => { H.stopFilm(); this.show('home'); }); C.appendChild(rr); }
        for (const f of H.films()) { const li = el('div', 'ph-film'); li.append(el('b', null, f.title), el('small', null, t('home.mins', { n: f.mins })));
          this.btn(li, t('home.play'), seated ? 'primary' : 'ghost', () => { if (!this.h.homeSeat()) { this.h.toast(t('home.sitFirst'), 2400); return; } if (H.playFilm(f)) this.close(); }); C.appendChild(li); }
        C.appendChild(el('p', 'note', t(seated ? 'home.filmsNote' : 'home.sitFirst'))); }
    }
  }
  app_ticket(C) {
    const tk = this.h.ticket(); if (!tk) { this.empty(C, t('phone.noShow'), t('phone.bookHint')); return; }
    const c = el('div', 'ph-ticket'); c.appendChild(el('small', null, t('tk.admit'))); c.appendChild(el('b', null, tk.title));
    const row = el('div', 'ph-tk-row'); for (const [lab, v] of [[t('tk.screen'), tk.hallName.replace('LUMIERE ', '')], [t('tk.row'), tk.row], [t('tk.seat'), tk.col ?? tk.seat]]) { const q = el('div'); q.append(el('small', null, lab), el('b', null, String(v ?? ''))); row.appendChild(q); }
    c.appendChild(row); C.appendChild(c);
    const r = el('div', 'ph-row'); this.btn(r, t('phone.showIt'), 'secondary', () => { this.close(); this.h.showTicket(); }); this.btn(r, t('phone.guideMe'), 'primary', () => { this.h.guide(); this.h.toast(t('phone.guiding'), 2200); this.close(); }); C.appendChild(r);
    // v14b (the user, 11-26: "theres no option to change or upgrade your seat or like upgrade to armrest tablet"): upgrades on your ticket
    const up = this.h.upgrades ? this.h.upgrades() : null; if (!up) return; C.appendChild(el('h4', 'ph-sub', t('up.title')));
    if (!tk.tablet) { const c2 = el('div', 'ph-job'); c2.append(el('b', null, t('up.tablet')), el('small', null, t('up.tabletD')), el('em', null, up.fmt(up.tabletPrice))); const b = el('button', 'btn primary sm', t('up.buy')); b.addEventListener('click', (e) => { e.stopPropagation(); if (up.buyTablet()) this.show('ticket'); }); c2.appendChild(b); C.appendChild(c2); }
    for (const o of up.seats) { const c2 = el('div', 'ph-job'); c2.append(el('b', null, t('up.seat', { cls: o.label, seat: o.id })), el('small', null, t('up.seatD')), el('em', null, '+' + up.fmt(o.extra))); const b = el('button', 'btn primary sm', t('up.move')); b.addEventListener('click', (e) => { e.stopPropagation(); if (up.moveTo(o)) this.close(); }); c2.appendChild(b); C.appendChild(c2); }
  }
  // v14b (the user, 11-26: "look at the map, i dont understand shit"): a plan you can read: the floor you are on (the other a tap away),
  // every place named, the four screens by name, your screen in gold with its door, you as an arrow
  app_map(C) {
    const P = this.h.player, up = this.mapUp ?? (P.y > 2.5), tk = this.h.ticket();
    const chips = el('div', 'ph-chips'); for (const [k, lab] of [[false, 'map.ground'], [true, 'map.upstairs']]) { const b = el('button', 'ph-chip' + (k === up ? ' on' : ''), t(lab)); b.addEventListener('click', (e) => { e.stopPropagation(); this.h.sound.click(); this.mapUp = k; this.show('map'); }); chips.appendChild(b); }
    C.appendChild(chips); const cv = el('canvas', 'ph-map'), W = 320, H = up ? 330 : 250; cv.width = W; cv.height = H; C.appendChild(cv); const g = cv.getContext('2d');
    const x0 = up ? -52 : -23, x1 = up ? 44 : 33, z0 = up ? -92 : -19, z1 = up ? -10 : 24, k = Math.min((W - 12) / (x1 - x0), (H - 12) / (z1 - z0)), ox = (W - (x1 - x0) * k) / 2 - x0 * k, oz = (H - (z1 - z0) * k) / 2 - z0 * k, X = (x) => ox + x * k, Z = (z) => oz + z * k;
    g.fillStyle = '#0e0b10'; g.fillRect(0, 0, W, H);
    const box = (r, fill, stroke, lw = 1) => { g.fillStyle = fill; g.fillRect(X(r[0]), Z(r[1]), (r[2] - r[0]) * k, (r[3] - r[1]) * k); if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.strokeRect(X(r[0]) + 0.5, Z(r[1]) + 0.5, (r[2] - r[0]) * k - 1, (r[3] - r[1]) * k - 1); } };
    const label = (txt, x, z, o = {}) => { g.font = `${o.w || 600} ${o.s || 12}px Inter, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 3; g.strokeStyle = 'rgba(14,11,16,.9)'; g.strokeText(txt, X(x), Z(z)); g.fillStyle = o.c || '#f6ecd8'; g.fillText(txt, X(x), Z(z)); };
    const dim = 'rgba(246,236,216,.07)', line = 'rgba(246,236,216,.3)', gold = '#e0b25a';
    if (!up) {
      box([STREET.x0 + 4, 18, STREET.x1 - 4, 28], 'rgba(130,140,160,.10)', null); label(t('map.street'), 26, 23, { c: '#99846f', s: 11 });
      box([LOBBY.x0, LOBBY.z0, LOBBY.x1, LOBBY.z1], 'rgba(246,236,216,.10)', line); box([WC.x0, WC.z0, WC.x1, WC.z1], dim, line); box([SPINE.x0, SPINE.z0, SPINE.x1, SPINE.z1], dim, line);
      box([CORE.x0, -9.8, CORE.x1, CORE.z1], 'rgba(224,178,90,.12)', 'rgba(224,178,90,.5)');
      const B = COUNTERS.boxOffice, F = COUNTERS.concessions; box([B.x0, B.z0, B.x1, B.z1], 'rgba(224,178,90,.18)', null); box([F.x0, F.z0, F.x1, F.z1], 'rgba(224,178,90,.18)', null);
      label(t('map.tickets'), -12.5, 9.6, { s: 14 }); label(t('map.food'), -11.5, -3.6, { s: 14 }); label(t('map.cafe'), -15.5, -11.4, { s: 13 }); label(t('map.lobby'), 1, 6, { s: 17, w: 700, c: gold });
      label(t('map.escalators'), 12, -4.2, { s: 12 }); label(t('map.lift'), 12, 2.2, { s: 12 }); label(t('map.wc'), 27, -4, { s: 13 }); label(t('map.entrance') + ' ⇩', 0, 16.4, { s: 12, c: '#99846f' });
      label('⇧ ' + t('map.exitWay'), 0, -16.6, { s: 11, c: '#cdbba6' });
    } else {
      for (const c of [BRIDGE, FLANK_W, LINK_W, FLANK_E, LINK_E, PANTRY]) box([c.x0, c.z0, c.x1, c.z1], 'rgba(246,236,216,.12)', null);
      box([LOBBY.x0, MEZZ.z0, LOBBY.x1, MEZZ.z1], dim, line); label(t('map.mezz'), -6, (MEZZ.z0 + MEZZ.z1) / 2, { s: 10, c: '#cdbba6' }); label(t('map.corridor'), -24, -18, { s: 11, c: '#cdbba6' });
      for (const h of Object.values(HALL)) { const r = [Math.min(h.xPic, h.xRear), h.zc - h.width / 2, Math.max(h.xPic, h.xRear), h.zc + h.width / 2], mine = tk && tk.hallKey === h.key, cx = (r[0] + r[2]) / 2, cz = (r[1] + r[3]) / 2;
        box(r, mine ? 'rgba(224,178,90,.22)' : dim, mine ? gold : line, mine ? 2.5 : 1); label(h.name.replace('LUMIERE ', ''), cx, cz - 2, { s: 15, w: 700, c: mine ? gold : '#f6ecd8' }); label(t('map.screen', { n: h.no }), cx, cz + 3.6, { s: 10, c: '#cdbba6' });
        const d = h.toWorld(h.entryU, h.depthIn); g.fillStyle = mine ? gold : '#cdbba6'; g.beginPath(); g.arc(X(d.x), Z(d.z), mine ? 4.5 : 3, 0, Math.PI * 2); g.fill(); }
    }
    if ((P.y > 2.5) === up) { const x = X(P.x), z = Z(P.z), fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw);   // you: an arrow the way you face
      g.fillStyle = '#ffb84d'; g.strokeStyle = '#0e0b10'; g.lineWidth = 2; g.beginPath(); g.moveTo(x + fx * 11, z + fz * 11); g.lineTo(x - fz * 6 - fx * 6, z + fx * 6 - fz * 6); g.lineTo(x + fz * 6 - fx * 6, z - fx * 6 - fz * 6); g.closePath(); g.stroke(); g.fill(); }
    const leg = el('div', 'ph-legend'); leg.innerHTML = `<span><i class="you"></i>${t('phone.you')}</span>` + (tk ? `<span><i class="hall"></i>${tk.hallName.replace('LUMIERE ', '')}</span>` : ''); C.appendChild(leg);
    if (tk) { const r = el('div', 'ph-row'); this.btn(r, t('phone.guideMe'), 'primary', () => { this.h.guide(); this.h.toast(t('phone.guiding'), 2200); this.close(); }); C.appendChild(r); }
  }
  // v14 the wallet: your Lumiere Credits, what you earned today against the day's cap, every payment in and out
  app_wallet(C) {
    const W = this.h.credits, top = el('div', 'ph-bal'); top.append(el('small', null, t('wallet.balance')), el('b', null, W.fmt(W.bal)));
    const cap = el('div', 'ph-cap'), bar = el('i'); bar.style.transform = `scaleX(${Math.min(1, W.earnedToday / DAILY_CAP).toFixed(3)})`; cap.append(el('small', null, t('wallet.cap', { n: W.earnedToday, cap: DAILY_CAP })), bar); top.appendChild(cap); C.appendChild(top);
    if (W.restored) C.appendChild(el('p', 'note', t('wallet.restored')));
    // v14c a loan: 500 LC now, 550 back out of what you earn (40 % of each payment) or at once
    { const L = W.loan, box = el('div', 'ph-card ph-loan'); box.appendChild(el('b', null, t('loan.title')));
      if (L) { box.appendChild(el('small', null, t('loan.owed', { n: W.fmt(L.owed) }))); const b = el('button', 'btn sm secondary', t('loan.repay')); b.disabled = W.bal <= 0; b.addEventListener('click', (e) => { e.stopPropagation(); this.h.sound.click(); W.repay(); this.show('wallet'); }); box.appendChild(b); }
      else { box.appendChild(el('small', null, t('loan.offer', { n: W.fmt(LOAN.amount), back: W.fmt(LOAN.amount * (1 + LOAN.fee)) }))); const b = el('button', 'btn sm primary', t('loan.take', { n: W.fmt(LOAN.amount) })); b.addEventListener('click', (e) => { e.stopPropagation(); this.h.sound.click(); W.borrow(); this.show('wallet'); }); box.appendChild(b); }
      C.appendChild(box); }
    const list = el('div', 'ph-list'); for (const h of W.history().slice(0, 40)) { const r = el('div', 'ph-li ' + (h.n >= 0 ? 'in' : 'out')); const a = el('div'); a.append(el('span', null, this.why(h.why)), el('small', null, new Date(h.t).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))); r.append(a, el('b', null, (h.n >= 0 ? '+' : '−') + W.fmt(Math.abs(h.n)))); list.appendChild(r); }
    C.appendChild(list);
  }
  why(w) { const [k, a] = String(w).split(':'); if (k === 'loan') return t(a === 'back' ? 'loan.paid' : 'loan.got'); if (itemById(k)) return t('food.' + k); if (LINE[k]) return t(LINE[k]); if (k === 'film' || k === 'filmEnd') return t('wallet.why.' + k); if (k === 'job') return t('wallet.why.job', { job: t('job.title.' + a) }); if (k === 'shop') return t('shop.' + a); if (['mission', 'task', 'welcome', 'tablet', 'ticket'].includes(k)) return t('wallet.why.' + k); return String(w); }
  // jobs: three shifts; taking one shows the way there (career.js Jobs)
  app_jobs(C) {
    const J = this.h.jobs(); if (J.active) { const k = J.job.kind, card = el('div', 'ph-job on'); card.append(el('b', null, t('job.title.' + k)), el('small', null, t('job.active'))); C.appendChild(card); const r = el('div', 'ph-row'); this.btn(r, t('job.cancel'), 'ghost', () => { J.cancel(); this.show('jobs'); }); C.appendChild(r); return; }
    for (const k of ['counter', 'gate', 'clean']) { const card = el('div', 'ph-job'); card.append(el('b', null, t('job.title.' + k)), el('small', null, t('job.desc.' + k)), el('em', null, t('job.pay.' + k)));
      const b = el('button', 'btn primary sm', t('job.take')); b.addEventListener('click', (e) => { e.stopPropagation(); this.h.sound.click(); if (J.accept(k)) this.close(); }); card.appendChild(b); C.appendChild(card); }
  }
  // tasks: the mission you are on and the day's three tasks
  app_tasks(C) {
    const K = this.h.career(), m = K.mission(), bar = (got, need) => { const i = el('i', 'ph-prog'), f = el('b'); f.style.transform = `scaleX(${Math.min(1, got / need).toFixed(3)})`; i.appendChild(f); return i; };
    if (m) { const c = el('div', 'ph-mission'); c.append(el('small', null, t('job.missionN', { n: m.step + 1, of: m.of })), el('b', null, m.name), el('span', null, m.text), bar(m.got, m.need), el('em', null, `+${m.rew} LC`)); C.appendChild(c); }
    else C.appendChild(el('p', 'note', t('job.allMissions')));
    C.appendChild(el('h4', 'ph-sub', t('job.daily')));
    for (const k of K.tasks()) { const c = el('div', 'ph-task' + (k.done ? ' done' : '')); c.append(el('span', null, k.text), bar(k.got, k.n), el('em', null, k.done ? t('job.doneMark') : `+${k.r} LC`)); C.appendChild(c); }
  }
  // v14 My Theatre: pick a hall, put a theme or your own colours on it (it changes as you tap), save looks as presets, share them as codes
  app_theatre(C) {
    const T = this.h.theatres(), W = this.h.credits, halls = this.h.halls(); if (!this.thHall || !halls.some((h) => h.id === this.thHall)) this.thHall = halls[0].id;
    const hid = this.thHall, cur = T.get(hid), chips = el('div', 'ph-chips');
    for (const h of halls) { const b = el('button', 'ph-chip' + (h.id === hid ? ' on' : ''), h.name); b.addEventListener('click', (e) => { e.stopPropagation(); this.h.sound.click(); this.thHall = h.id; this.show('theatre'); }); chips.appendChild(b); }
    C.appendChild(chips); C.appendChild(el('h4', 'ph-sub', t('th.themes')));
    const grid = el('div', 'ph-themes'), card = (key, th) => { const locked = th && th.shop && !W.owns(th.shop), b = el('button', 'ph-theme' + (locked ? ' locked' : '')), strip = el('span', 'ph-strip');
      for (const p of ['seat', 'wall', 'carpet', 'curtain']) { const i = el('i'); i.style.background = th ? th[p] : 'linear-gradient(135deg,#3b2216,#1e2846)'; strip.appendChild(i); }
      b.append(strip, el('b', null, t('th.theme.' + key)), el('small', null, locked ? t('th.locked') : ''));
      b.addEventListener('click', (e) => { e.stopPropagation(); this.h.sound.click(); if (locked) { this.h.toast(t('th.lockedHint'), 2400); this.show('shop'); return; } T.apply(hid, th || {}); this.h.toast(t('th.applied', { name: t('th.theme.' + key) }), 1800); this.show('theatre'); });
      grid.appendChild(b); };
    card('original', null); for (const [k, th] of Object.entries(THEMES)) card(k, th); C.appendChild(grid);
    C.appendChild(el('h4', 'ph-sub', t('th.custom')));
    for (const part of ['seat', 'wall', 'carpet', 'curtain']) { const row = el('div', 'ph-swrow'); row.appendChild(el('small', null, t('th.part.' + part)));
      const o = el('button', 'ph-sw orig' + (!cur[part] ? ' on' : '')); o.setAttribute('aria-label', t('th.theme.original')); o.addEventListener('click', (e) => { e.stopPropagation(); T.setPart(hid, part, null); this.show('theatre'); }); row.appendChild(o);
      for (const hex of SWATCH[part]) { const b = el('button', 'ph-sw' + (cur[part] === hex ? ' on' : '')); b.style.background = hex; b.setAttribute('aria-label', hex); b.addEventListener('click', (e) => { e.stopPropagation(); this.h.sound.click(); T.setPart(hid, part, hex); this.show('theatre'); }); row.appendChild(b); }
      C.appendChild(row); }
    C.appendChild(el('h4', 'ph-sub', t('th.presets')));
    const r0 = el('div', 'ph-row'); this.btn(r0, t('th.save'), 'primary', () => { T.savePreset(t('th.presetName', { n: T.presets().length + 1 }), cur); this.h.toast(t('th.saved'), 1800); this.show('theatre'); }); C.appendChild(r0);
    for (const p of T.presets()) { const li = el('div', 'ph-preset'), sw = el('span', 'ph-strip'); for (const k of ['seat', 'wall', 'carpet', 'curtain']) { const i = el('i'); i.style.background = p.th[k] || '#444'; sw.appendChild(i); }
      li.append(sw, el('b', null, p.name)); const r = el('div', 'ph-row');
      this.btn(r, t('th.apply'), 'secondary', () => { T.apply(hid, p.th); this.h.toast(t('th.applied', { name: p.name }), 1800); this.show('theatre'); });
      this.btn(r, t('th.share'), 'ghost', () => { const code = T.code(p.th); (navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(code) : Promise.reject()).then(() => this.h.toast(t('th.copied'), 2000), () => { const i = el('input', 'ph-code'); i.value = code; i.readOnly = true; li.appendChild(i); i.select(); }); });
      this.btn(r, t('th.delete'), 'ghost', () => { T.deletePreset(p.id); this.show('theatre'); }); li.appendChild(r); C.appendChild(li); }
    const imp = el('div', 'ph-row'), inp = el('input', 'ph-code'); inp.placeholder = t('th.importHint'); inp.addEventListener('keydown', (e) => e.stopPropagation()); imp.appendChild(inp);
    this.btn(imp, t('th.import'), 'secondary', () => { const th = T.fromCode(inp.value); if (!th) { this.h.toast(t('th.badCode'), 2200, 'error'); return; } T.savePreset(t('th.imported'), th); this.h.toast(t('th.saved'), 1800); this.show('theatre'); }); C.appendChild(imp);
    C.appendChild(el('p', 'note', t('th.note')));
  }
  frame() {}
  // the shop: emotes, outfit colours, theatre themes, passes
  app_shop(C) {
    const W = this.h.credits; C.appendChild(el('p', 'ph-shopbal', W.fmt(W.bal)));
    for (const it of SHOP) { const own = !it.consumable && W.owns(it.id), c = el('div', 'ph-shop' + (own ? ' own' : '')); c.append(el('b', null, t('shop.' + it.id)), el('small', null, t('shop.d.' + it.id)));
      const b = el('button', 'btn sm ' + (own ? 'ghost' : 'primary'), own ? t('shop.owned') : it.consumable && W.count(it.id) ? t('shop.buyMore', { n: W.count(it.id), price: it.price }) : t('shop.buy', { price: it.price })); b.disabled = own;
      b.addEventListener('click', (e) => { e.stopPropagation(); if (own) return; if (!W.buy(it.id, it.price, !!it.consumable)) { this.h.toast(t('lc.short', { price: W.fmt(it.price) }), 2600, 'error'); return; } this.h.sound.pay ? this.h.sound.pay() : this.h.sound.click(); this.h.toast(t('shop.bought', { item: t('shop.' + it.id) }), 2400); this.show('shop'); });
      c.appendChild(b); C.appendChild(c); }
  }
  app_camera(C) {
    const frame = el('div', 'ph-viewfinder'); frame.appendChild(el('small', null, t('phone.camHint'))); C.appendChild(frame);   // the screen is see-through here: the view behind it is the picture
    const r = el('div', 'ph-row'), shot = el('button', 'ph-shutter'); shot.setAttribute('aria-label', t('phone.take')); r.appendChild(shot); C.appendChild(r);
    shot.addEventListener('click', (e) => { e.stopPropagation();
      this.h.snap((url) => { if (!url) { this.h.toast(t('phone.camFail'), 2400, 'error'); return; } this.h.sound.shutter ? this.h.sound.shutter() : this.h.sound.click();
        const flash = el('i', 'ph-flash'); document.body.appendChild(flash); setTimeout(() => flash.remove(), 420);
        this.photos.unshift({ url, at: Date.now(), room: this.h.room() }); this.photos = this.photos.slice(0, 12); while (!store.set('photos', this.photos) && this.photos.length > 1) this.photos.pop();
        this.h.toast(t('phone.saved'), 1800); }); });
  }
  app_photos(C) {
    if (!this.photos.length) { this.empty(C, t('phone.noPhotos'), t('phone.photosHint')); return; }
    const grid = el('div', 'ph-photos'); this.photos.forEach((p, i) => { const b = el('button', 'ph-ph'), im = new Image(); im.alt = ''; im.src = p.url; b.appendChild(im); b.addEventListener('click', (e) => { e.stopPropagation(); this.photo(C, i); }); grid.appendChild(b); }); C.appendChild(grid);
  }
  photo(C, i) {
    const p = this.photos[i]; C.innerHTML = ''; const im = new Image(); im.className = 'ph-big'; im.alt = ''; im.src = p.url; C.appendChild(im);
    const r = el('div', 'ph-row'); this.btn(r, t('phone.back'), 'ghost', () => this.show('photos'));
    if (!this.h.native) { const a = el('a', 'btn secondary sm', t('phone.saveFile')); a.href = p.url; a.download = `lumiere-${p.at}.jpg`; r.appendChild(a); }
    this.btn(r, t('phone.delete'), 'ghost', () => { this.photos.splice(i, 1); store.set('photos', this.photos); this.show('photos'); }); C.appendChild(r);
  }
  app_stubs(C) {
    const s = this.h.stubs(); if (!s.length) { this.empty(C, t('phone.noStubs'), t('phone.stubsHint')); return; }
    const list = el('div', 'ph-list'); for (const x of s) { const r = el('div', 'ph-li stub'); const a = el('div'); a.append(el('b', null, x.title), el('small', null, `${x.hall} · ${t('phone.seatShort', { seat: x.seat })}`)); r.append(a, el('span', null, x.date)); list.appendChild(r); } C.appendChild(list);
  }
  app_friends(C) { this.empty(C, t('phone.friendsTitle'), t('phone.friendsHint')); this.btn(C.lastChild, t('phone.openRoom'), 'primary', () => { this.close(); this.h.together(); }); }
  app_settings(C) { this.close(); this.h.settings(); }
}
