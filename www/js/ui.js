// HUD, reception card, booking sheet (three films -> three halls, each with its own seat map), ticket, now-showing line.
import { posterCanvas } from './textures.js';
import { ROW_LETTERS, HALLS } from './layout.js';
export const FILMS = [
  { t: 'The Long Night', hall: 'I', m: 'a film by D. Verhoef · 112 min · drama · 1958', h: [12, 340] },
  { t: 'Velvet Hour', hall: 'II', m: 'with Camille Roux · 94 min · romance · 1961', h: [330, 280] },
  { t: 'A Quiet Room', hall: 'III', m: 'fiction from the afternoon · 88 min · mystery · 1952', h: [150, 200] },
];
const TIMES = ['19:30', '21:45'], BEGIN = [['Now', 0], ['10 s', 10], ['1 min', 60], ['Custom…', -1]];
export class UI {
  constructor(world, shows, sound, hooks) {
    this.world = world; this.shows = shows; this.sound = sound; this.hooks = hooks; this.q = (s) => document.querySelector(s); this.promptFn = null; this._toastT = 0; this.own = null;
    this.sel = { film: 0, time: TIMES[0], seat: null, begin: 0, custom: 30 }; this.pickDefaultSeat(); this.buildSheet(); this.bind();
  }
  hall() { return this.world.halls.find((h) => h.cfg.id === FILMS[this.sel.film].hall); }
  pickDefaultSeat() { const h = this.hall(), c = h.cfg, row = Math.min(c.rows - 2, 3); const best = h.seats.filter((s) => !s.taken && !s.npc).sort((a, b) => Math.abs(a.row - row) * 3 + Math.abs(a.col - (c.perBlock + 0.5)) - (Math.abs(b.row - row) * 3 + Math.abs(b.col - (c.perBlock + 0.5))))[0]; this.sel.seat = best ? best.id : null; }
  toast(msg, ms = 2600, quote = false) { const t = this.q('#toast'); t.textContent = msg; t.classList.toggle('quote', quote); t.classList.add('show'); clearTimeout(this._toastT); this._toastT = setTimeout(() => t.classList.remove('show'), ms); }
  setPrompt(label, fn) { const p = this.q('#prompt'); if (!label) { if (!p.hidden) p.hidden = true; this.promptFn = null; return; } if (p.textContent !== label) p.textContent = label; if (p.hidden) p.hidden = false; this.promptFn = fn; }
  setCard(on) { const c = this.q('#card'), want = on && !this.modalOpen(); if (c.hidden === want) c.hidden = !want; }
  modalOpen() { return !this.q('#sheet').hidden || !this.q('#ticket').hidden || !this.q('#talk').hidden; }
  openSheet() { this.q('#sheet').hidden = false; this.q('#card').hidden = true; this.sound.click(); const s = this.sel.seat && this.hall().seats.find((q) => q.id === this.sel.seat); if (!s || s.taken || s.npc) this.pickDefaultSeat(); this.buildSheet(); this.hooks.onModal && this.hooks.onModal(true); }
  closeSheet() { this.q('#sheet').hidden = true; this.hooks.onModal && this.hooks.onModal(this.modalOpen()); }
  buildSheet() {
    const films = this.q('#films'); films.innerHTML = '';
    FILMS.forEach((f, i) => { const hc = HALLS.find((h) => h.id === f.hall), d = document.createElement('div'); d.className = 'film' + (i === this.sel.film ? ' on' : ''); const img = new Image(); img.alt = ''; img.src = posterCanvas(f.t, f.h[0], f.h[1], '').toDataURL('image/jpeg', 0.7); d.appendChild(img);
      const tx = document.createElement('div'); tx.innerHTML = `<b></b><small></small><em></em>`; tx.querySelector('b').textContent = f.t; tx.querySelector('small').textContent = f.m; tx.querySelector('em').textContent = `${hc.name} · ${hc.kind}`; d.appendChild(tx);
      const b = document.createElement('button'); b.className = 'chip' + (i === this.sel.film ? ' on' : ''); b.textContent = i === this.sel.film ? 'SELECTED' : 'SELECT'; d.appendChild(b);
      d.addEventListener('click', () => { if (this.sel.film !== i) { this.sel.film = i; this.pickDefaultSeat(); } this.sound.click(); this.buildSheet(); }); films.appendChild(d); });
    const chips = (id, items, cur, fn) => { const el = this.q(id); el.innerHTML = ''; items.forEach(([label, val]) => { const b = document.createElement('button'); b.className = 'chip' + (val === cur ? ' on' : ''); b.textContent = label; b.addEventListener('click', () => { fn(val); this.sound.click(); this.buildSheet(); }); el.appendChild(b); }); };
    chips('#times', TIMES.map((t) => [t, t]), this.sel.time, (v) => { this.sel.time = v; }); chips('#begin', BEGIN, this.sel.begin, (v) => { this.sel.begin = v; });
    if (this.sel.begin === -1) { const el = this.q('#begin'), inp = document.createElement('input'); inp.type = 'number'; inp.min = 1; inp.value = this.sel.custom; inp.className = 'num'; inp.addEventListener('input', () => { this.sel.custom = Math.max(1, +inp.value || 1); }); el.appendChild(inp); const s = document.createElement('small'); s.textContent = ' seconds'; s.className = 'dim'; el.appendChild(s); }
    this.q('#ownState').textContent = this.own ? `Ready: ${this.own.label}` : 'Nothing threaded yet — the house presentation will play.';
    this.refreshSeatMap();
  }
  refreshSeatMap() {
    const h = this.hall(), c = h.cfg, m = this.q('#seatmap'); m.innerHTML = ''; this.q('#hallName').textContent = `${c.name} · ${c.kind}`;
    const scr = document.createElement('div'); scr.className = 'scr'; scr.textContent = 'SCREEN'; m.appendChild(scr);
    for (let r = 0; r < c.rows; r++) { const row = document.createElement('div'); row.className = 'srow'; const lab = document.createElement('i'); lab.textContent = ROW_LETTERS[r]; row.appendChild(lab);
      for (let col = 1; col <= c.perBlock * 2; col++) { if (col === c.perBlock + 1) { const g = document.createElement('span'); g.className = 'seat gap'; row.appendChild(g); } const id = ROW_LETTERS[r] + col, s = h.seats.find((q) => q.id === id), b = document.createElement('button'), taken = (s.taken || s.npc) && !s.player;
        b.className = 'seat' + (taken ? ' taken' : '') + (id === this.sel.seat ? ' sel' : ''); b.setAttribute('aria-label', `Row ${ROW_LETTERS[r]} seat ${col}${taken ? ' taken' : ''}`);
        if (!taken) b.addEventListener('click', () => { this.sel.seat = id; this.sound.click(); this.refreshSeatMap(); }); row.appendChild(b); }
      m.appendChild(row); }
    const sel = this.sel.seat ? h.seats.find((q) => q.id === this.sel.seat) : null; this.q('#seatSel').textContent = sel ? `Selected: Row ${ROW_LETTERS[sel.row]} · Seat ${sel.col}` : 'This screen is full — choose another film';
  }
  reserve() {
    const f = FILMS[this.sel.film], h = this.hall(), s = this.sel.seat && h.seats.find((q) => q.id === this.sel.seat); if (!s) { this.toast('Choose a free seat first.', 2400); return null; }
    const delay = this.sel.begin === -1 ? this.sel.custom : this.sel.begin, t = { hall: h.cfg.id, hallKey: h.cfg.key, hallName: h.cfg.name, kind: h.cfg.kind, film: f, title: this.own ? this.own.label : f.t, own: !!this.own, seat: s.id, row: ROW_LETTERS[s.row], col: s.col, time: this.sel.time, delay };
    this.closeSheet(); this.showTicket(t); this.sound.chime(); this.hooks.onTicket && this.hooks.onTicket(t, this.own); this.own = null; return t;
  }
  showTicket(t) { this.q('#tkTitle').textContent = t.title; this.q('#tkScreen').textContent = t.hall; this.q('#tkRow').textContent = t.row; this.q('#tkSeat').textContent = t.col; this.q('#tkKind').textContent = `${t.hallName} · ${t.kind}`; this.q('#ticket').hidden = false; this.hooks.onModal && this.hooks.onModal(true); }
  setNow(text) { const n = this.q('#now'); if (n.textContent !== text) n.textContent = text; }
  bind() {
    const $ = (s) => this.q(s), tap = (el, fn) => el.addEventListener('click', fn);
    tap($('#cardGo'), () => this.openSheet()); tap($('#sheetX'), () => { this.sound.click(); this.closeSheet(); }); tap($('#confirm'), () => this.reserve());
    tap($('#tkGo'), () => { $('#ticket').hidden = true; this.hooks.onModal && this.hooks.onModal(this.modalOpen()); this.hooks.findSeat && this.hooks.findSeat(); });
    tap($('#tkJump'), () => { $('#ticket').hidden = true; this.hooks.onModal && this.hooks.onModal(this.modalOpen()); this.hooks.jumpToSeat && this.hooks.jumpToSeat(); });
    tap($('#pick'), () => $('#file').click());
    $('#file').addEventListener('change', (e) => { const f = e.target.files && e.target.files[0]; if (!f) return; this.sound.unlock(); this.shows.loadFile(f); this.own = { kind: 'file', label: f.name ? f.name.replace(/\.[^.]+$/, '').slice(0, 40) : 'From your gallery' }; this.toast('Your film is threaded — confirm your seat', 3000); this.buildSheet(); e.target.value = ''; });
    tap($('#urlPlay'), () => { const u = $('#url').value.trim(); if (!/^https?:\/\//i.test(u)) { this.toast('Paste a direct link that starts with http(s)://', 3000); return; } this.sound.unlock(); this.shows.loadURL(u); this.own = { kind: 'url', label: 'From a link' }; this.toast('Your film is threaded — confirm your seat', 3000); this.buildSheet(); });
    tap($('#findSeat'), () => this.hooks.findSeat && this.hooks.findSeat());
    tap($('#bBright'), () => { const b = $('#bright'); b.hidden = !b.hidden; });
    $('#brightRange').addEventListener('input', (e) => this.hooks.brightness && this.hooks.brightness(+e.target.value / 100));
    tap($('#bMute'), () => { const m = !document.body.classList.contains('muted'); document.body.classList.toggle('muted', m); this.sound.unlock(); this.sound.setMuted(m); });
    tap($('#bFull'), () => { try { const d = document; if (d.fullscreenElement) d.exitFullscreen(); else d.documentElement.requestFullscreen && d.documentElement.requestFullscreen({ navigationUI: 'hide' }); } catch (e) {} });
    const p = $('#prompt'); p.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); this.sound.unlock(); this.promptFn && this.promptFn(); });
  }
}
