// LUMIERE v5.1 - interface controller ("Noir & Brass", see css/app.css): loading screen, cinematic main menu with a now-showing strip,
// HUD (location, ticket chip, hide-UI, menu, stick, sprint, context action, item button, toasts), three-step booking sheet
// (film + start time -> seat -> confirm with your own video), ticket, tabbed settings, language picker, help/credits, pause.
import { t, setLang, LANGS, lang } from './i18n.js';
import { FILMS, posterCanvas } from './textures.js';
import { HOUSE } from './films.js';
import { ROW_LETTERS } from './layout.js';
const $ = (s) => document.querySelector(s);
const BOOK_FILMS = [{ film: 'night', hall: 'I' }, { film: 'velvet', hall: 'II' }, { film: 'quiet', hall: 'III' }];
const WHEN = [['book.now', 0], ['book.1m', 60], ['book.3m', 180]];
const LANG_SUB = { en: 'English', hi: 'Hindi', ur: 'Urdu', es: 'Spanish' }, LANG_CLASS = { hi: 'dev', ur: 'urd' };
// context-action icons for the HUD prompt (talk, sit, stand, find seat...)
const PROMPT_ICON = (label) => /talk|बात|بات|habla/i.test(label) ? '#i-talk' : /stand|खड़े|کھڑے|levant/i.test(label) ? '#i-run' : /sit|seat|बैठ|بیٹھ|sent|butaca/i.test(label) ? '#i-seat' : '#i-hand';
export class UI {
  constructor(world, shows, sound, settings, hooks) {
    this.world = world; this.shows = shows; this.sound = sound; this.settings = settings; this.hooks = hooks; this.promptFn = null; this._toastT = 0; this.own = null; this.hidden = false; this.step = 1; this.tab = 'controls'; this.posterURL = {};
    this.sel = { film: 0, when: 0, seat: null }; this.pickDefaultSeat(); this.bind();
  }
  poster(id, w = 128, h = 192) { const f = FILMS.find((q) => q.id === id); return this.posterURL[id + w] || (this.posterURL[id + w] = posterCanvas(f, w, h).toDataURL('image/jpeg', 0.8)); }
  // ---------------- loading / menu ----------------
  progress(p, step) { $('#ldFill').style.width = (p * 100).toFixed(0) + '%'; $('#ldPct').textContent = Math.round(p * 100) + '%'; if (step) $('#ldStep').textContent = step; }
  tip() { $('#ldTip').textContent = t('tips'); }
  loaded() { const l = $('#loader'); l.classList.add('gone'); setTimeout(() => l.remove(), 800); }
  showMenu(on, cont) { $('#menu').hidden = !on; $('#mnPlayLbl').textContent = t(cont ? 'menu.continue' : 'menu.play'); $('#hud').hidden = on || this.hidden; $('#bShow').hidden = on || !this.hidden; if (on) this.nowShowing(); }
  nowShowing() {
    const L = $('#nowList'); L.innerHTML = ''; $('#mnLangCur').textContent = (LANGS.find((l) => l.code === lang()) || LANGS[0]).name;
    for (const bf of BOOK_FILMS) { const H = HOUSE[bf.film], s = this.shows.get(bf.hall), hc = this.world.hallById(bf.hall).cfg, live = s && (s.state === 'playing' || s.state === 'dimming' || s.state === 'preshow'), soon = s && s.state === 'pending';
      const row = document.createElement('div'); row.className = 'now'; const img = new Image(); img.alt = ''; img.src = this.poster(bf.film, 64, 96); row.appendChild(img);
      const tx = document.createElement('div'); tx.innerHTML = '<b></b><small><i></i><span></span></small>'; tx.querySelector('b').textContent = H.title; tx.querySelector('i').className = live ? 'live' : 'soon';
      tx.querySelector('span').textContent = `${hc.name} · ${live ? t('show.playing') : soon ? t('show.pending', { time: '' }).trim() : t('kind.' + hc.kind).split(' · ')[0]}`; row.appendChild(tx); L.appendChild(row); }
  }
  fade(v, dur = 0.6) { const f = $('#fade'); f.style.transition = `opacity ${dur}s ease`; f.style.opacity = String(v); }
  // ---------------- HUD ----------------
  toast(msg, ms = 2600, kind = 'info') { const el = $('#toast'); $('#toastText').textContent = msg; el.classList.toggle('err', kind === 'error'); $('#toastIcon').setAttribute('href', kind === 'error' ? '#i-alert' : '#i-check'); el.classList.add('show'); clearTimeout(this._toastT); this._toastT = setTimeout(() => el.classList.remove('show'), ms); }
  setPrompt(label, fn) { const p = $('#prompt'); if (!label) { if (!p.hidden) p.hidden = true; this.promptFn = null; return; } const l = $('#promptLbl'); if (l.textContent !== label) { l.textContent = label; $('#promptIcon').setAttribute('href', PROMPT_ICON(label)); } if (p.hidden) p.hidden = false; this.promptFn = fn; }
  setWhere(a, b) { const A = $('#whereA'), B = $('#whereB'); if (A.textContent !== a) A.textContent = a; if (B.textContent !== (b || '')) B.textContent = b || ''; }
  setTicketChip(text) { const c = $('#ticketChip'); if (!text) { c.hidden = true; return; } c.hidden = false; const s = $('#tcText'); if (s.textContent !== text) s.textContent = text; }
  setItem(kind) { const b = $('#itemBtn'); if (!kind) { b.hidden = true; return; } b.hidden = false; $('#itemLbl').textContent = t(kind === 'drink' ? 'hud.sip' : 'hud.eat'); }
  setFps(text) { const f = $('#fps'); f.hidden = !this.settings.showFps; if (!f.hidden) f.textContent = text; }
  setHidden(h) { this.hidden = h; $('#hud').hidden = h; $('#bShow').hidden = !h; if (h) this.toast(t('toast.uiHidden'), 2200); this.hooks.onHide && this.hooks.onHide(h); }
  modalOpen() { return ['#book', '#ticket', '#settings', '#langPick', '#info', '#pause', '#talk'].some((s) => !$(s).hidden) || !$('#menu').hidden; }
  // ---------------- booking: 1 film + time, 2 seat, 3 confirm ----------------
  hallFor(i) { return this.world.hallById(BOOK_FILMS[i].hall); }
  hall() { return this.hallFor(this.sel.film); }
  pickDefaultSeat() { const h = this.hall(), c = h.cfg, row = Math.min(c.rows - 2, Math.round(c.rows * 0.45)); const free = h.seats.filter((s) => !s.taken && !s.npc).sort((a, b) => (Math.abs(a.row - row) * 3 + Math.abs(a.u)) - (Math.abs(b.row - row) * 3 + Math.abs(b.u)))[0]; this.sel.seat = free ? free.id : null; }
  openBook() { $('#book').hidden = false; this.sound.click(); this.step = 1; const s = this.sel.seat && this.hall().seats.find((q) => q.id === this.sel.seat); if (!s || s.taken || s.npc) this.pickDefaultSeat(); this.buildBook(); this.hooks.onModal(true); }
  closeBook() { $('#book').hidden = true; this.hooks.onModal(this.modalOpen()); }
  goStep(n) { this.step = Math.max(1, Math.min(3, n)); this.sound.click(); this.buildBook(); }
  buildBook() {
    const st = this.step; for (let i = 1; i <= 3; i++) $('#bkStep' + i).hidden = i !== st;
    [...$('#bkSteps').children].forEach((li, i) => { li.className = i + 1 === st ? 'on' : i + 1 < st ? 'done' : ''; });
    $('#bkStepLbl').textContent = `${st} / 3`; $('#bkStepLbl').dir = 'ltr'; $('#bkTitle').textContent = t(st === 1 ? 'book.step1' : st === 2 ? 'book.seat' : 'book.step3');
    $('#bkBack').hidden = st === 1; $('#times').hidden = st !== 1; $('#bkNextLbl').textContent = t(st === 3 ? 'book.confirm' : 'book.next');
    if (st === 1) this.filmsStep(); else if (st === 2) this.seatMap(); else this.summary();
    const sel = this.sel.seat && this.hall().seats.find((q) => q.id === this.sel.seat), hc = this.hall().cfg;
    $('#seatSel').textContent = st === 1 ? '' : sel ? `${hc.name} · ${t('book.selected', { row: ROW_LETTERS[sel.row], seat: sel.col })}` : '';
    $('#bkNext').disabled = st >= 2 && !sel;
  }
  filmsStep() {
    const films = $('#films'); films.innerHTML = '';
    BOOK_FILMS.forEach((bf, i) => { const H = HOUSE[bf.film], hc = this.hallFor(i).cfg, f = FILMS.find((q) => q.id === bf.film), d = document.createElement('button'); d.className = 'film' + (i === this.sel.film ? ' on' : '');
      const img = new Image(); img.alt = ''; img.src = this.poster(bf.film); d.appendChild(img);
      for (const [tag, txt] of [['b', H.title], ['small', `${t('genre.' + H.genre)} · ${t('book.mins', { n: f.mins })}`], ['em', `${hc.name} · ${t('kind.' + hc.kind).split(' · ')[0]}`]]) { const e = document.createElement(tag); e.textContent = txt; d.appendChild(e); }
      d.addEventListener('click', () => { if (this.sel.film !== i) { this.sel.film = i; this.pickDefaultSeat(); } this.sound.click(); this.buildBook(); }); films.appendChild(d); });
    const times = $('#times'); times.innerHTML = ''; WHEN.forEach(([k], i) => { const b = document.createElement('button'); b.className = i === this.sel.when ? 'on' : ''; b.textContent = t(k); b.addEventListener('click', () => { this.sel.when = i; this.sound.click(); this.buildBook(); }); times.appendChild(b); });
  }
  seatMap() {
    const h = this.hall(), c = h.cfg, m = $('#seatmap'); m.innerHTML = ''; $('#hallName').textContent = `${c.name} · ${t('kind.' + c.kind).split(' · ')[0]}`;
    const free = h.seats.some((s) => !s.taken && !s.npc); $('#seatEmpty').hidden = free; m.hidden = !free; if (!free) return;
    const scr = document.createElement('div'); scr.className = 'scr'; scr.innerHTML = '<span></span>'; scr.firstChild.textContent = t('book.screen').toUpperCase(); if (c.kind === 'giant') scr.style.margin = '0 1% 10px'; m.appendChild(scr);
    const cols = c.perRow, curve = c.rowR ? (u) => (c.rowR - Math.sqrt(c.rowR * c.rowR - u * u)) * 9 : () => 0;
    const body = $('#book .sh-body'), avail = body.clientHeight - 64, sh = Math.max(9, Math.min(22, avail / (c.rows + 0.7) - 3)); m.style.setProperty('--sh', sh.toFixed(1) + 'px');   // fit every row without scrolling
    for (let r = 0; r < c.rows; r++) { const row = document.createElement('div'); row.className = 'srow'; row.style.gridTemplateColumns = `12px repeat(${cols}, 1fr) 12px`; if (r === c.cross.row) row.style.marginTop = '8px';
      const lab = document.createElement('i'); lab.textContent = ROW_LETTERS[r]; row.appendChild(lab);
      for (let col = 1; col <= cols; col++) { const id = ROW_LETTERS[r] + col, s = h.seats[r * cols + col - 1], b = document.createElement('button'), taken = (s.taken || s.npc) && !s.player;
        b.className = 'seat' + (taken ? ' taken' : '') + (id === this.sel.seat ? ' sel' : ''); b.setAttribute('aria-label', `${ROW_LETTERS[r]}${col}`); const y = -curve(s.u); if (y) b.style.transform = `translateY(${y.toFixed(1)}px)`;
        if (!taken) b.addEventListener('click', () => { this.sel.seat = id; this.sound.click(); this.buildBook(); }); row.appendChild(b); }
      const lab2 = lab.cloneNode(true); row.appendChild(lab2); m.appendChild(row); }
  }
  summary() {
    const bf = BOOK_FILMS[this.sel.film], H = HOUSE[bf.film], h = this.hall(), c = h.cfg, s = this.sel.seat && h.seats.find((q) => q.id === this.sel.seat), S = $('#bkSummary'); S.innerHTML = '';
    const img = new Image(); img.alt = ''; img.src = this.poster(bf.film); S.appendChild(img);
    const tx = document.createElement('div'), h3 = document.createElement('h3'); h3.textContent = this.own ? this.own.label : H.title; tx.appendChild(h3);
    const sm = document.createElement('div'); sm.className = 'note'; sm.textContent = `${c.name} · ${t('kind.' + c.kind)}`; tx.appendChild(sm);
    const meta = document.createElement('div'); meta.className = 'meta'; for (const txt of [s ? t('book.selected', { row: ROW_LETTERS[s.row], seat: s.col }) : '', t(WHEN[this.sel.when][0])]) { if (!txt) continue; const b = document.createElement('span'); b.className = 'badge'; b.textContent = txt; meta.appendChild(b); }
    tx.appendChild(meta); S.appendChild(tx);
    $('#ownState').textContent = this.own ? t('book.ownSet', { name: this.own.label }) : t('book.ownNone');
  }
  confirm() {
    const bf = BOOK_FILMS[this.sel.film], h = this.hall(), s = this.sel.seat && h.seats.find((q) => q.id === this.sel.seat); if (!s || ((s.taken || s.npc) && !s.player)) { this.toast(t('toast.seatTaken'), 2600, 'error'); this.goStep(2); return; }
    const tk = { hall: h.cfg.id, hallKey: h.cfg.key, hallName: h.cfg.name, kind: h.cfg.kind, film: bf.film, title: this.own ? this.own.label : HOUSE[bf.film].title, own: !!this.own, seat: s.id, row: ROW_LETTERS[s.row], col: s.col, delay: WHEN[this.sel.when][1] };
    this.closeBook(); this.showTicket(tk); this.sound.chime(); this.hooks.onTicket(tk); this.own = null;
  }
  showTicket(tk) { $('#tkTitle').textContent = tk.title; $('#tkScreen').textContent = tk.hall === 'I' ? '1' : tk.hall === 'II' ? '2' : '3'; $('#tkRow').textContent = tk.row; $('#tkSeat').textContent = tk.col; $('#tkKind').textContent = `${tk.hallName} · ${t('kind.' + tk.kind)}`; $('#ticket').hidden = false; this.hooks.onModal(true); }
  // ---------------- settings / language / info / pause ----------------
  openSettings() { $('#settings').hidden = false; this.syncSettings(); this.hooks.onModal(true); }
  setTab(tab) { this.tab = tab; for (const b of document.querySelectorAll('#setTabs button')) b.classList.toggle('on', b.dataset.tab === tab); for (const p of document.querySelectorAll('#settings .tab')) p.hidden = p.dataset.tab !== tab; }
  syncSettings() {
    const S = this.settings, setT = (id, v) => $(id).classList.toggle('on', !!v), num = (id, out, v, f = (x) => x.toFixed(2)) => { const el = $(id); el.value = v; $(out).textContent = f(+v); this.rangeFill(el); };
    num('#sSens', '#oSens', S.sensitivity); num('#sBright', '#oBright', S.brightness); num('#sMaster', '#oMaster', S.master, (x) => Math.round(x * 100)); num('#sFilm', '#oFilm', S.film, (x) => Math.round(x * 100)); num('#sCrowd', '#oCrowd', S.crowd, (x) => Math.round(x * 100));
    setT('#sInvert', S.invertY); setT('#sAuto', S.autoRes); setT('#sFps', S.showFps); setT('#sBubbles', S.bubbles);
    for (const b of document.querySelectorAll('#sGfx button')) b.classList.toggle('on', b.dataset.v === S.graphics);
    this.langButtons($('#sLang'), (code) => this.chooseLang(code)); this.setTab(this.tab);
  }
  rangeFill(el) { const p = (el.value - el.min) / (el.max - el.min) * 100; el.style.setProperty('--p', p.toFixed(1) + '%'); }
  langButtons(L, onPick) { L.innerHTML = ''; for (const l of LANGS) { const b = document.createElement('button'); b.classList.toggle('on', l.code === lang()); const n = document.createElement('b'); n.textContent = l.name; if (LANG_CLASS[l.code]) n.className = LANG_CLASS[l.code]; const s = document.createElement('small'); s.textContent = LANG_SUB[l.code] || l.code; b.append(n, s); b.addEventListener('click', () => { this.sound.click(); onPick(l.code); }); L.appendChild(b); } }
  chooseLang(code) { this.settings.lang = code; setLang(code); this.hooks.onSettings(); if (!$('#settings').hidden) this.syncSettings(); this.langList(); if (!$('#book').hidden) this.buildBook(); if (!$('#menu').hidden) this.nowShowing(); }
  langList() { this.langButtons($('#langList'), (code) => { this.chooseLang(code); $('#langPick').hidden = true; this.hooks.onModal(this.modalOpen()); this.hooks.onLangPicked && this.hooks.onLangPicked(); }); }
  openLang() { this.langList(); $('#langPick').hidden = false; this.hooks.onModal(true); }
  openInfo(kind) { $('#infoTitle').textContent = t(kind === 'help' ? 'menu.help' : 'menu.credits'); $('#infoBody').textContent = t(kind === 'help' ? 'help.body' : 'credits.body'); $('#info').hidden = false; this.hooks.onModal(true); }
  openPause() { $('#pause').hidden = false; this.hooks.onModal(true); this.hooks.onPause && this.hooks.onPause(true); }
  closeModal(sel) { $(sel).hidden = true; this.hooks.onModal(this.modalOpen()); }
  bind() {
    const tap = (sel, fn) => $(sel).addEventListener('click', (e) => { e.stopPropagation(); this.sound.unlock(); fn(e); });
    tap('#mnPlay', () => { this.sound.click(); this.hooks.onPlay(); }); tap('#mnSettings', () => { this.sound.click(); this.openSettings(); }); tap('#mnLang', () => { this.sound.click(); this.openLang(); }); tap('#mnHelp', () => this.openInfo('help')); tap('#mnCredits', () => this.openInfo('credits'));
    tap('#bookX', () => { this.sound.click(); this.closeBook(); }); tap('#bkBack', () => this.goStep(this.step - 1)); tap('#bkOther', () => this.goStep(1));
    tap('#bkNext', () => { if (this.step < 3) this.goStep(this.step + 1); else this.confirm(); });
    tap('#tkWalk', () => { $('#ticket').hidden = true; this.hooks.onModal(this.modalOpen()); this.hooks.findSeat(); }); tap('#tkJump', () => { $('#ticket').hidden = true; this.hooks.onModal(this.modalOpen()); this.hooks.jumpToSeat(); });
    tap('#pick', () => $('#file').click());
    $('#file').addEventListener('change', (e) => { const f = e.target.files && e.target.files[0]; if (!f) return; this.shows.loadFile(f); this.own = { kind: 'file', label: f.name ? f.name.replace(/\.[^.]+$/, '').slice(0, 40) : 'Video' }; this.toast(t('toast.ownReady'), 3000); this.buildBook(); e.target.value = ''; });
    tap('#urlUse', () => { const u = $('#url').value.trim(); if (!/^https?:\/\//i.test(u)) { this.toast(t('toast.badLink'), 3000, 'error'); return; } this.shows.loadURL(u); this.own = { kind: 'url', label: u.split('/').pop().slice(0, 32) || 'Link' }; this.toast(t('toast.ownReady'), 3000); this.buildBook(); });
    tap('#ticketChip', () => this.hooks.findSeat());
    tap('#bHide', () => { this.sound.click(); this.setHidden(true); }); tap('#bShow', () => { this.sound.click(); this.setHidden(false); });
    tap('#bMenu', () => { this.sound.click(); this.openPause(); });
    tap('#psResume', () => { this.closeModal('#pause'); this.hooks.onPause && this.hooks.onPause(false); }); tap('#psSettings', () => { $('#pause').hidden = true; this.openSettings(); this._fromPause = true; }); tap('#psQuit', () => { this.closeModal('#pause'); this.hooks.onQuit(); });
    tap('#setX', () => { this.closeModal('#settings'); if (this._fromPause) { this._fromPause = false; $('#pause').hidden = false; this.hooks.onModal(true); } });
    tap('#infoX', () => this.closeModal('#info'));
    for (const b of document.querySelectorAll('#setTabs button')) tap('#setTabs button[data-tab="' + b.dataset.tab + '"]', () => { this.sound.click(); this.setTab(b.dataset.tab); });
    tap('#itemBtn', () => this.hooks.useItem());
    const S = this.settings, live = (id, key, out, f) => $(id).addEventListener('input', (e) => { S[key] = +e.target.value; $(out).textContent = f(S[key]); this.rangeFill(e.target); this.hooks.onSettings(); });
    live('#sSens', 'sensitivity', '#oSens', (x) => x.toFixed(2)); live('#sBright', 'brightness', '#oBright', (x) => x.toFixed(2)); live('#sMaster', 'master', '#oMaster', (x) => Math.round(x * 100)); live('#sFilm', 'film', '#oFilm', (x) => Math.round(x * 100)); live('#sCrowd', 'crowd', '#oCrowd', (x) => Math.round(x * 100));
    for (const [id, key] of [['#sInvert', 'invertY'], ['#sAuto', 'autoRes'], ['#sFps', 'showFps'], ['#sBubbles', 'bubbles']]) tap(id, () => { S[key] = !S[key]; this.sound.click(); this.syncSettings(); this.hooks.onSettings(); });
    for (const b of document.querySelectorAll('#sGfx button')) b.addEventListener('click', () => { S.graphics = b.dataset.v; this.sound.click(); this.syncSettings(); this.hooks.onSettings(true); });
    const p = $('#prompt'); p.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); this.sound.unlock(); this.promptFn && this.promptFn(); });
    for (const m of ['#book', '#ticket', '#settings', '#info']) $(m).addEventListener('click', (e) => { if (e.target === $(m)) { if (m === '#book') this.closeBook(); else this.closeModal(m); } });
  }
}
