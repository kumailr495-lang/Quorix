// LUMIERE v5 - interface: loading screen, main menu, HUD (where-chip, ticket chip, hide-UI, menu, stick, sprint, context action, item button),
// booking sheet (film, start time, your own video, seat map per hall), ticket, settings, language picker, help/credits, pause.
import { t, setLang, LANGS, lang, fmtTime } from './i18n.js';
import { FILMS, posterCanvas } from './textures.js';
import { HOUSE, PROGRAMME } from './films.js';
import { ROW_LETTERS } from './layout.js';
const $ = (s) => document.querySelector(s);
const BOOK_FILMS = [{ film: 'night', hall: 'I' }, { film: 'velvet', hall: 'II' }, { film: 'quiet', hall: 'III' }];
const WHEN = [['book.now', 0], ['book.1m', 60], ['book.3m', 180]];
export class UI {
  constructor(world, shows, sound, settings, hooks) {
    this.world = world; this.shows = shows; this.sound = sound; this.settings = settings; this.hooks = hooks; this.promptFn = null; this._toastT = 0; this.own = null; this.hidden = false;
    this.sel = { film: 0, when: 0, seat: null }; this.pickDefaultSeat(); this.bind(); this.posterURL = {};
  }
  // ---------------- loading / menu ----------------
  progress(p, step) { $('#ldFill').style.width = (p * 100).toFixed(0) + '%'; $('#ldPct').textContent = Math.round(p * 100) + '%'; if (step) $('#ldStep').textContent = step; }
  tip() { $('#ldTip').textContent = t('tips'); }
  loaded() { const l = $('#loader'); l.classList.add('gone'); setTimeout(() => l.remove(), 700); }
  showMenu(on, cont) { $('#menu').hidden = !on; $('#mnPlay').textContent = t(cont ? 'menu.continue' : 'menu.play'); $('#hud').hidden = on || this.hidden; $('#bShow').hidden = on || !this.hidden; }
  fade(v, dur = 0.6) { const f = $('#fade'); f.style.transition = `opacity ${dur}s ease`; f.style.opacity = String(v); }
  // ---------------- HUD ----------------
  toast(msg, ms = 2600) { const el = $('#toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(this._toastT); this._toastT = setTimeout(() => el.classList.remove('show'), ms); }
  setPrompt(label, fn) { const p = $('#prompt'); if (!label) { if (!p.hidden) p.hidden = true; this.promptFn = null; return; } if (p.textContent !== label) p.textContent = label; if (p.hidden) p.hidden = false; this.promptFn = fn; }
  setWhere(a, b) { const A = $('#whereA'), B = $('#whereB'); if (A.textContent !== a) A.textContent = a; if (B.textContent !== (b || '')) B.textContent = b || ''; }
  setTicketChip(text) { const c = $('#ticketChip'); if (!text) { c.hidden = true; return; } c.hidden = false; const s = $('#tcText'); if (s.textContent !== text) s.textContent = text; }
  setItem(kind) { const b = $('#itemBtn'); if (!kind) { b.hidden = true; return; } b.hidden = false; $('#itemLbl').textContent = t(kind === 'drink' ? 'hud.sip' : 'hud.eat'); }
  setFps(text) { const f = $('#fps'); f.hidden = !this.settings.showFps; if (!f.hidden) f.textContent = text; }
  setHidden(h) { this.hidden = h; $('#hud').hidden = h; $('#bShow').hidden = !h; if (h) this.toast(t('toast.uiHidden'), 2200); this.hooks.onHide && this.hooks.onHide(h); }
  modalOpen() { return ['#book', '#ticket', '#settings', '#langPick', '#info', '#pause', '#talk'].some((s) => !$(s).hidden) || !$('#menu').hidden; }
  // ---------------- booking ----------------
  hallFor(i) { return this.world.hallById(BOOK_FILMS[i].hall); }
  hall() { return this.hallFor(this.sel.film); }
  pickDefaultSeat() { const h = this.hall(), c = h.cfg, row = Math.min(c.rows - 2, Math.round(c.rows * 0.45)); const free = h.seats.filter((s) => !s.taken && !s.npc).sort((a, b) => (Math.abs(a.row - row) * 3 + Math.abs(a.u)) - (Math.abs(b.row - row) * 3 + Math.abs(b.u)))[0]; this.sel.seat = free ? free.id : null; }
  openBook() { $('#book').hidden = false; this.sound.click(); const s = this.sel.seat && this.hall().seats.find((q) => q.id === this.sel.seat); if (!s || s.taken || s.npc) this.pickDefaultSeat(); this.buildBook(); this.hooks.onModal(true); }
  closeBook() { $('#book').hidden = true; this.hooks.onModal(this.modalOpen()); }
  buildBook() {
    const films = $('#films'); films.innerHTML = '';
    BOOK_FILMS.forEach((bf, i) => { const H = HOUSE[bf.film], hc = this.hallFor(i).cfg, f = FILMS.find((q) => q.id === bf.film), d = document.createElement('div'); d.className = 'film' + (i === this.sel.film ? ' on' : '');
      const img = new Image(); img.alt = ''; img.src = this.posterURL[bf.film] || (this.posterURL[bf.film] = posterCanvas(f, 128, 192).toDataURL('image/jpeg', 0.75)); d.appendChild(img);
      const tx = document.createElement('div'); tx.innerHTML = '<b></b><small></small><em></em>'; tx.querySelector('b').textContent = H.title; tx.querySelector('small').textContent = `${t('genre.' + H.genre)} · ${t('book.mins', { n: f.mins })}`; tx.querySelector('em').textContent = `${hc.name} · ${t('kind.' + hc.kind)}`; d.appendChild(tx);
      d.addEventListener('click', () => { if (this.sel.film !== i) { this.sel.film = i; this.pickDefaultSeat(); } this.sound.click(); this.buildBook(); }); films.appendChild(d); });
    const times = $('#times'); times.innerHTML = ''; WHEN.forEach(([k, v], i) => { const b = document.createElement('button'); b.className = 'chip' + (i === this.sel.when ? ' on' : ''); b.textContent = t(k); b.addEventListener('click', () => { this.sel.when = i; this.sound.click(); this.buildBook(); }); times.appendChild(b); });
    $('#ownState').textContent = this.own ? t('book.ownSet', { name: this.own.label }) : t('book.ownNone');
    this.seatMap();
  }
  seatMap() {
    const h = this.hall(), c = h.cfg, m = $('#seatmap'); m.innerHTML = ''; $('#hallName').textContent = `${c.name} · ${t('kind.' + c.kind)}`;
    const scr = document.createElement('div'); scr.className = 'scr'; scr.textContent = t('book.screen').toUpperCase(); if (c.kind === 'giant') scr.style.margin = '0 2% 10px'; m.appendChild(scr);
    const cols = c.perRow, curve = c.rowR ? (u) => (c.rowR - Math.sqrt(c.rowR * c.rowR - u * u)) * 9 : () => 0;
    for (let r = 0; r < c.rows; r++) { const row = document.createElement('div'); row.className = 'srow'; row.style.gridTemplateColumns = `12px repeat(${cols}, 1fr)`; if (r === c.cross.row) row.style.marginTop = '8px';
      const lab = document.createElement('i'); lab.textContent = ROW_LETTERS[r]; row.appendChild(lab);
      for (let col = 1; col <= cols; col++) { const id = ROW_LETTERS[r] + col, s = h.seats[r * cols + col - 1], b = document.createElement('button'), taken = (s.taken || s.npc) && !s.player;
        b.className = 'seat' + (taken ? ' taken' : '') + (id === this.sel.seat ? ' sel' : ''); b.setAttribute('aria-label', `${ROW_LETTERS[r]}${col}`); const y = -curve(s.u); if (y) b.style.transform = `translateY(${y.toFixed(1)}px)`;
        if (!taken) b.addEventListener('click', () => { this.sel.seat = id; this.sound.click(); this.seatMap(); }); row.appendChild(b); }
      m.appendChild(row); }
    const sel = this.sel.seat && h.seats.find((q) => q.id === this.sel.seat); $('#seatSel').textContent = sel ? t('book.selected', { row: ROW_LETTERS[sel.row], seat: sel.col }) : t('book.full');
  }
  confirm() {
    const bf = BOOK_FILMS[this.sel.film], h = this.hall(), s = this.sel.seat && h.seats.find((q) => q.id === this.sel.seat); if (!s || ((s.taken || s.npc) && !s.player)) { this.toast(t('toast.seatTaken')); return; }
    const tk = { hall: h.cfg.id, hallKey: h.cfg.key, hallName: h.cfg.name, kind: h.cfg.kind, film: bf.film, title: this.own ? this.own.label : HOUSE[bf.film].title, own: !!this.own, seat: s.id, row: ROW_LETTERS[s.row], col: s.col, delay: WHEN[this.sel.when][1] };
    this.closeBook(); this.showTicket(tk); this.sound.chime(); this.hooks.onTicket(tk); this.own = null;
  }
  showTicket(tk) { $('#tkTitle').textContent = tk.title; $('#tkScreen').textContent = tk.hall === 'I' ? '1' : tk.hall === 'II' ? '2' : '3'; $('#tkRow').textContent = tk.row; $('#tkSeat').textContent = tk.col; $('#tkKind').textContent = `${tk.hallName} · ${t('kind.' + tk.kind)}`; $('#ticket').hidden = false; this.hooks.onModal(true); }
  // ---------------- settings / language / info / pause ----------------
  openSettings() { $('#settings').hidden = false; this.syncSettings(); this.hooks.onModal(true); }
  syncSettings() {
    const S = this.settings, setT = (id, v) => $(id).classList.toggle('on', !!v), num = (id, out, v, f = (x) => x.toFixed(2)) => { $(id).value = v; $(out).textContent = f(+v); };
    num('#sSens', '#oSens', S.sensitivity); num('#sBright', '#oBright', S.brightness); num('#sMaster', '#oMaster', S.master, (x) => Math.round(x * 100)); num('#sFilm', '#oFilm', S.film, (x) => Math.round(x * 100)); num('#sCrowd', '#oCrowd', S.crowd, (x) => Math.round(x * 100));
    setT('#sInvert', S.invertY); setT('#sAuto', S.autoRes); setT('#sFps', S.showFps); setT('#sBubbles', S.bubbles);
    for (const b of document.querySelectorAll('#sGfx button')) b.classList.toggle('on', b.dataset.v === S.graphics);
    const L = $('#sLang'); L.innerHTML = ''; for (const l of LANGS) { const b = document.createElement('button'); b.textContent = l.name; b.classList.toggle('on', l.code === lang()); b.addEventListener('click', () => this.chooseLang(l.code)); L.appendChild(b); }
  }
  chooseLang(code) { this.settings.lang = code; setLang(code); this.hooks.onSettings(); this.syncSettings(); this.langList(); if (!$('#book').hidden) this.buildBook(); }
  langList() { const L = $('#langList'); L.innerHTML = ''; for (const l of LANGS) { const b = document.createElement('button'); b.className = 'btn' + (l.code === lang() ? ' on' : ''); b.textContent = l.name; b.addEventListener('click', () => { this.chooseLang(l.code); this.sound.click(); $('#langPick').hidden = true; this.hooks.onModal(this.modalOpen()); this.hooks.onLangPicked && this.hooks.onLangPicked(); }); L.appendChild(b); } }
  openLang() { this.langList(); $('#langPick').hidden = false; this.hooks.onModal(true); }
  openInfo(kind) { $('#infoTitle').textContent = t(kind === 'help' ? 'menu.help' : 'menu.credits'); $('#infoBody').textContent = t(kind === 'help' ? 'help.body' : 'credits.body'); $('#info').hidden = false; this.hooks.onModal(true); }
  openPause() { $('#pause').hidden = false; this.hooks.onModal(true); this.hooks.onPause && this.hooks.onPause(true); }
  closeModal(sel) { $(sel).hidden = true; this.hooks.onModal(this.modalOpen()); }
  bind() {
    const tap = (sel, fn) => $(sel).addEventListener('click', (e) => { e.stopPropagation(); this.sound.unlock(); fn(e); });
    tap('#mnPlay', () => { this.sound.click(); this.hooks.onPlay(); }); tap('#mnSettings', () => { this.sound.click(); this.openSettings(); }); tap('#mnLang', () => { this.sound.click(); this.openLang(); }); tap('#mnHelp', () => this.openInfo('help')); tap('#mnCredits', () => this.openInfo('credits'));
    tap('#bookX', () => { this.sound.click(); this.closeBook(); }); tap('#confirm', () => this.confirm());
    tap('#tkWalk', () => { $('#ticket').hidden = true; this.hooks.onModal(this.modalOpen()); this.hooks.findSeat(); }); tap('#tkJump', () => { $('#ticket').hidden = true; this.hooks.onModal(this.modalOpen()); this.hooks.jumpToSeat(); });
    tap('#pick', () => $('#file').click());
    $('#file').addEventListener('change', (e) => { const f = e.target.files && e.target.files[0]; if (!f) return; this.shows.loadFile(f); this.own = { kind: 'file', label: f.name ? f.name.replace(/\.[^.]+$/, '').slice(0, 40) : 'Video' }; this.toast(t('toast.ownReady'), 3000); this.buildBook(); e.target.value = ''; });
    tap('#urlUse', () => { const u = $('#url').value.trim(); if (!/^https?:\/\//i.test(u)) { this.toast(t('toast.badLink'), 3000); return; } this.shows.loadURL(u); this.own = { kind: 'url', label: u.split('/').pop().slice(0, 32) || 'Link' }; this.toast(t('toast.ownReady'), 3000); this.buildBook(); });
    tap('#ticketChip', () => this.hooks.findSeat());
    tap('#bHide', () => { this.sound.click(); this.setHidden(true); }); tap('#bShow', () => { this.sound.click(); this.setHidden(false); });
    tap('#bMenu', () => { this.sound.click(); this.openPause(); });
    tap('#psResume', () => { this.closeModal('#pause'); this.hooks.onPause && this.hooks.onPause(false); }); tap('#psSettings', () => { $('#pause').hidden = true; this.openSettings(); this._fromPause = true; }); tap('#psQuit', () => { this.closeModal('#pause'); this.hooks.onQuit(); });
    tap('#setX', () => { this.closeModal('#settings'); if (this._fromPause) { this._fromPause = false; $('#pause').hidden = false; this.hooks.onModal(true); } });
    tap('#langX', () => this.closeModal('#langPick')); tap('#infoX', () => this.closeModal('#info'));
    tap('#itemBtn', () => this.hooks.useItem());
    const S = this.settings, live = (id, key, out, f) => $(id).addEventListener('input', (e) => { S[key] = +e.target.value; $(out).textContent = f(S[key]); this.hooks.onSettings(); });
    live('#sSens', 'sensitivity', '#oSens', (x) => x.toFixed(2)); live('#sBright', 'brightness', '#oBright', (x) => x.toFixed(2)); live('#sMaster', 'master', '#oMaster', (x) => Math.round(x * 100)); live('#sFilm', 'film', '#oFilm', (x) => Math.round(x * 100)); live('#sCrowd', 'crowd', '#oCrowd', (x) => Math.round(x * 100));
    for (const [id, key] of [['#sInvert', 'invertY'], ['#sAuto', 'autoRes'], ['#sFps', 'showFps'], ['#sBubbles', 'bubbles']]) tap(id, () => { S[key] = !S[key]; this.sound.click(); this.syncSettings(); this.hooks.onSettings(); });
    for (const b of document.querySelectorAll('#sGfx button')) b.addEventListener('click', () => { S.graphics = b.dataset.v; this.sound.click(); this.syncSettings(); this.hooks.onSettings(true); });
    const p = $('#prompt'); p.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); this.sound.unlock(); this.promptFn && this.promptFn(); });
    for (const m of ['#book', '#ticket', '#settings', '#langPick', '#info']) $(m).addEventListener('click', (e) => { if (e.target === $(m)) { if (m === '#book') this.closeBook(); else this.closeModal(m); } });
  }
}
