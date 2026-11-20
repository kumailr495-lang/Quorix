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
import { ROOMS, BRIDGE, FLANK_W, LINK_W, FLANK_E, LINK_E } from './building.js';
const $ = (s) => document.querySelector(s), el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const icon = (id) => `<svg class="ic"><use href="#${id}"/></svg>`;
const store = { get(k, d) { try { return JSON.parse(localStorage.getItem('lumiere.' + k)) ?? d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('lumiere.' + k, JSON.stringify(v)); return true; } catch (e) { return false; } } };
const APPS = [['ticket', 'i-ticket'], ['map', 'i-pin'], ['tab', 'i-cash'], ['camera', 'i-camera'], ['photos', 'i-image'], ['stubs', 'i-film'], ['friends', 'i-people'], ['settings', 'i-gear']];
const two = (n) => String(n).padStart(2, '0');
const LINE = { ticket: 'phone.line.ticket', tablet: 'phone.line.tablet', salted: 'opt9.salted', caramel: 'opt9.caramel', cheese: 'opt9.cheese', nachos: 'opt9.nachos', cola: 'opt9.drink', coffee: 'opt9.coffee', water: 'item.water', combo: 'opt9.combo' };
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
    const r = $('#phone'); r.hidden = false; r.classList.remove('out'); this.h.sound.click();
    if (app) this.show(app); else this.home();
    clearInterval(this._t); this._t = setInterval(() => this.tick(), 1000); this.tick();
  }
  close() { if (!this.isOpen()) return; const r = $('#phone'); r.classList.add('out'); document.body.classList.remove('ph-cam'); clearInterval(this._t); setTimeout(() => { r.hidden = true; r.classList.remove('out'); }, 240); }
  tick() { const d = new Date(), s = `${two(d.getHours())}:${two(d.getMinutes())}`; $('#phClock').textContent = s; const big = $('#phBig'); if (big) big.textContent = s; const n = $('#phNext'); if (n) this.nextShow(n); }
  body(cls) { const B = $('#phBody'); B.innerHTML = ''; B.className = 'ph-body ph-k-' + cls; $('#phone').classList.toggle('viewfinder', cls === 'camera'); document.body.classList.toggle('ph-cam', cls === 'camera'); return B; }
  // ---------------- home ----------------
  home() {
    this.app = null; const B = this.body('home'), d = new Date();
    const top = el('div', 'ph-time'); top.appendChild(el('b', null, '')).id = 'phBig';
    top.appendChild(el('small', null, d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }))); B.appendChild(top);
    const w = el('div', 'ph-widgets'), next = el('button', 'ph-wg next'); next.id = 'phNext'; next.addEventListener('click', (e) => { e.stopPropagation(); this.show('ticket'); }); w.appendChild(next);
    const tab = el('button', 'ph-wg tab'); tab.innerHTML = `${icon('i-cash')}<b>${this.h.bill.fmt(this.h.bill.total || 0)}</b><small>${t('phone.tonight')}</small>`; tab.addEventListener('click', (e) => { e.stopPropagation(); this.show('tab'); }); w.appendChild(tab);
    B.appendChild(w); this.nextShow(next);
    // v14 (the user, 11-20: "the phone UI is so bad"; their reference: a frosted phone with colourful icons and a dock): four apps on the
    // page, four in the dock, each icon its own colour
    const grid = el('div', 'ph-apps'), dock = el('div', 'ph-dock'), DOCK = new Set(['camera', 'photos', 'friends', 'settings']);
    for (const [k, ic] of APPS) { const a = el('button', 'ph-app'); a.dataset.k = k; a.innerHTML = `<i>${icon(ic)}</i><span>${t('phone.app.' + k)}</span>`; a.addEventListener('click', (e) => { e.stopPropagation(); this.h.sound.click(); this.show(k); }); (DOCK.has(k) ? dock : grid).appendChild(a); }
    B.appendChild(grid); B.appendChild(dock); this.tick();
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
  app_ticket(C) {
    const tk = this.h.ticket(); if (!tk) { this.empty(C, t('phone.noShow'), t('phone.bookHint')); return; }
    const c = el('div', 'ph-ticket'); c.appendChild(el('small', null, t('tk.admit'))); c.appendChild(el('b', null, tk.title));
    const row = el('div', 'ph-tk-row'); for (const [lab, v] of [[t('tk.screen'), tk.hallName.replace('LUMIERE ', '')], [t('tk.row'), tk.row], [t('tk.seat'), tk.col ?? tk.seat]]) { const q = el('div'); q.append(el('small', null, lab), el('b', null, String(v ?? ''))); row.appendChild(q); }
    c.appendChild(row); C.appendChild(c);
    const r = el('div', 'ph-row'); this.btn(r, t('phone.showIt'), 'secondary', () => { this.close(); this.h.showTicket(); }); this.btn(r, t('phone.guideMe'), 'primary', () => { this.h.guide(); this.h.toast(t('phone.guiding'), 2200); this.close(); }); C.appendChild(r);
  }
  app_map(C) {
    const cv = el('canvas', 'ph-map'), W = 340, H = 300; cv.width = W; cv.height = H; C.appendChild(cv); const g = cv.getContext('2d');
    const rects = Object.entries(ROOMS).filter(([k, r]) => r.rect && r.level !== undefined && k !== 'street' && k !== 'corridor').map(([k, r]) => [k, r.rect, r.level]);   // the building, not the street
    for (const c of [BRIDGE, FLANK_W, LINK_W, FLANK_E, LINK_E]) rects.unshift(['corridor', [c.x0, c.z0, c.x1, c.z1], 1]);   // the corridor as its legs (its room rect is their bounding box)
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity; for (const [, R] of rects) { x0 = Math.min(x0, R[0]); z0 = Math.min(z0, R[1]); x1 = Math.max(x1, R[2]); z1 = Math.max(z1, R[3]); }
    const k = Math.min((W - 16) / (x1 - x0), (H - 16) / (z1 - z0)), ox = (W - (x1 - x0) * k) / 2 - x0 * k, oz = (H - (z1 - z0) * k) / 2 - z0 * k, X = (x) => ox + x * k, Z = (z) => oz + z * k;
    g.fillStyle = '#0d0b0f'; g.fillRect(0, 0, W, H); const tk = this.h.ticket(), here = this.h.room();
    for (const [key, R, lvl] of rects) { const mine = tk && key === tk.hallKey, now = key === here;
      g.fillStyle = mine ? 'rgba(224,178,90,.30)' : now ? 'rgba(246,236,216,.16)' : lvl ? 'rgba(246,236,216,.05)' : 'rgba(246,236,216,.09)'; g.fillRect(X(R[0]), Z(R[1]), (R[2] - R[0]) * k, (R[3] - R[1]) * k);
      g.strokeStyle = mine ? '#e0b25a' : 'rgba(246,236,216,.35)'; g.lineWidth = mine ? 2 : 1; g.strokeRect(X(R[0]) + 0.5, Z(R[1]) + 0.5, (R[2] - R[0]) * k - 1, (R[3] - R[1]) * k - 1); }
    const p = this.h.player; g.fillStyle = '#ffb84d'; g.beginPath(); g.arc(X(p.x), Z(p.z), 5, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#ffb84d'; g.lineWidth = 2; g.beginPath(); g.moveTo(X(p.x), Z(p.z)); g.lineTo(X(p.x) - Math.sin(p.yaw) * 12, Z(p.z) - Math.cos(p.yaw) * 12); g.stroke();
    const leg = el('div', 'ph-legend'); leg.innerHTML = `<span><i class="you"></i>${t('phone.you')}</span>` + (tk ? `<span><i class="hall"></i>${tk.hallName.replace('LUMIERE ', '')}</span>` : ''); C.appendChild(leg);
    if (tk) { const r = el('div', 'ph-row'); this.btn(r, t('phone.guideMe'), 'primary', () => { this.h.guide(); this.h.toast(t('phone.guiding'), 2200); this.close(); }); C.appendChild(r); }
  }
  app_tab(C) {
    const b = this.h.bill; if (b.unlimited || !b.lines.length) { this.empty(C, t('phone.tabEmpty'), b.unlimited ? t('phone.tabQuick') : null); return; }
    const list = el('div', 'ph-list'); for (const l of b.lines.slice().reverse()) { const r = el('div', 'ph-li'); r.append(el('span', null, LINE[l.what] ? t(LINE[l.what]) : String(l.what)), el('b', null, b.fmt(l.n))); list.appendChild(r); }
    C.appendChild(list); const tot = el('div', 'ph-li total'); tot.append(el('span', null, t('phone.total')), el('b', null, b.fmt(b.total))); C.appendChild(tot);
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
