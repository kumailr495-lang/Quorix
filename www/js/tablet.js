// LUMIERE v8 - the tablet (phone feedback: a tablet the receptionist and the seat server hand you; "Netflix-type" seeking that shows the
// picture under your finger; play, pause, speed, stop, play another film for money; your own videos with thumbnails, search, filter,
// albums, collections and favourites instead of the file manager).
//   Remote:    the show you are watching. The seek bar's preview is a second, muted <video> of the same film that jumps to where your finger
//              is (a real frame, no canvas, so streamed films without CORS work too).
//   Films:     the open films; "play" starts one in your hall (Story: costs Wallet.P.replay).
//   My videos: the Android media bridge (window.LumiereMedia, the v8 APK) lists the phone's videos with thumbnails; without it (older APK,
//              desktop) the system picker and a link field stand in.
// Favourites and collections are kept on the device (localStorage).
import { t } from './i18n.js';
import { CATALOG, posterURL, filmById, cleanTitle } from './films.js';
const $ = (s) => document.querySelector(s), el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const fmt = (s) => { s = Math.max(0, Math.floor(s || 0)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); };
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const store = { get(k, d) { try { return JSON.parse(localStorage.getItem('lumiere.' + k)) ?? d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('lumiere.' + k, JSON.stringify(v)); } catch (e) {} } };
export class Tablet {
  constructor(shows, sound, wallet, settings, hooks) {
    this.shows = shows; this.sound = sound; this.wallet = wallet; this.settings = settings; this.hooks = hooks; this.tab = 'remote'; this.server = false; this.onLocal = null;
    this.q = ''; this.sort = 'recent'; this.album = null; this.view = 'all'; this.fav = new Set(store.get('fav', [])); this.cols = store.get('cols', {}); this.items = null; this._raf = 0;
    const root = $('#tablet'); root.innerHTML = `<div class="tab-dev"><div class="tab-scr">
      <header class="tb-head"><div class="tb-title"><small>LUMIÈRE</small><b id="tbTitle"></b></div><nav class="tb-tabs" id="tbTabs"><button data-t="remote">${t('tab.remote')}</button><button data-t="films">${t('tab.films')}</button><button data-t="mine">${t('tab.mine')}</button></nav><button class="btn secondary sm" id="tbClose"></button></header>
      <div class="tb-body" id="tbBody"></div></div></div>`;
    root.addEventListener('click', (e) => { if (e.target === root) this.close(); });
    $('#tbClose').addEventListener('click', (e) => { e.stopPropagation(); this.close(); });
    for (const b of root.querySelectorAll('#tbTabs button')) b.addEventListener('click', (e) => { e.stopPropagation(); this.sound.click(); this.show(b.dataset.t); });
    // the preview player for seeking (a second element; never heard)
    this.pv = document.createElement('video'); this.pv.muted = true; this.pv.playsInline = true; this.pv.preload = 'metadata'; this.pv.setAttribute('playsinline', '');
  }
  isOpen() { return !$('#tablet').hidden; }
  open(tab = 'remote', o = {}) { this.server = !!o.server; $('#tablet').hidden = false; $('#tbClose').textContent = t(this.server ? 'tab.handBack' : 'tab.close'); this.sound.tablet && this.sound.tablet(true); this.show(tab); this.hooks.onModal(true); }
  close() { if (!this.isOpen()) return; $('#tablet').hidden = true; cancelAnimationFrame(this._raf); this.pv.removeAttribute('src'); this.pv.load(); this.sound.tablet && this.sound.tablet(false); if (this.server) { this.server = false; this.hooks.handBack(); } this.hooks.onModal(false); }
  refresh() { if (this.isOpen()) this.show(this.tab); }
  show(tab) {
    this.tab = tab; for (const b of document.querySelectorAll('#tbTabs button')) b.classList.toggle('on', b.dataset.t === tab); cancelAnimationFrame(this._raf);
    const B = $('#tbBody'); B.innerHTML = ''; B.className = 'tb-body ' + tab; if (tab === 'remote') this.remote(B); else if (tab === 'films') this.films(B); else this.mine(B);
  }
  // ---------------- remote ----------------
  remote(B) {
    const pb = this.shows.playback(); $('#tbTitle').textContent = pb ? this.shows.title(pb.id) : t('tab.nothing');
    if (!pb || !this.shows.isOn(pb.id)) { const e = el('div', 'tb-empty'); e.appendChild(el('b', null, t('tab.nothing'))); e.appendChild(el('p', 'note', t(pb ? 'tab.startsSoon' : 'tab.pickFilm'))); const go = el('button', 'btn primary', t('tab.films')); go.addEventListener('click', () => this.show('films')); e.appendChild(go); B.appendChild(e);
      if (pb) { const tick = () => { if (!this.isOpen() || this.tab !== 'remote') return; if (this.shows.isOn(pb.id)) { this.show('remote'); return; } this._raf = requestAnimationFrame(tick); }; this._raf = requestAnimationFrame(tick); } return; }
    const v = pb.el, wrap = el('div', 'rm'), art = el('div', 'rm-art'), img = new Image(); img.alt = ''; if (pb.src === 'film') img.src = posterURL(pb.filmId); art.appendChild(img); wrap.appendChild(art);
    const side = el('div', 'rm-side'); side.appendChild(el('h3', null, this.shows.title(pb.id))); const f = pb.src === 'film' && filmById(pb.filmId); side.appendChild(el('p', 'note', f ? `${f.year} · ${f.by} · ${f.lic}` : t('tab.yourVideo')));
    // seek bar with a picture preview over the thumb
    const bar = el('div', 'rm-bar'), track = el('div', 'rm-track'), fill = el('i'), knob = el('b'), bubble = el('div', 'rm-pv'), ptime = el('span'); track.append(fill, knob); bubble.append(this.pv, ptime); bubble.hidden = true; bar.append(bubble, track);
    const times = el('div', 'rm-times'), cur = el('span'), tot = el('span'); times.append(cur, tot); side.append(bar, times);
    const btns = el('div', 'rm-btns'), mk = (icon, lab, fn, cls = 'icon') => { const b = el('button', cls); b.setAttribute('aria-label', lab); b.innerHTML = `<svg class="ic"><use href="#${icon}"/></svg>`; b.addEventListener('click', (e) => { e.stopPropagation(); this.sound.click(); fn(b); }); btns.appendChild(b); return b; };
    mk('i-back', '-10s', () => this.shows.control('seek', v.currentTime - 10)); const pp = mk(v.paused ? 'i-play' : 'i-pause', 'play', () => { this.shows.control(v.paused ? 'play' : 'pause'); }, 'icon big'); mk('i-chev', '+10s', () => this.shows.control('seek', v.currentTime + 10));
    mk('i-stop', 'stop', () => { this.shows.control('stop'); this.show('remote'); }); side.appendChild(btns);
    const sp = el('div', 'seg rm-speed'); for (const s of SPEEDS) { const b = el('button', v.playbackRate === s ? 'on' : '', s + '×'); b.addEventListener('click', (e) => { e.stopPropagation(); this.sound.click(); this.shows.control('speed', s); for (const q of sp.children) q.classList.toggle('on', q === b); }); sp.appendChild(b); } side.appendChild(sp);
    wrap.appendChild(side); B.appendChild(wrap);
    if (this.pv.getAttribute('src') !== v.currentSrc && v.currentSrc) { this.pv.src = v.currentSrc; this.pv.load(); }
    let drag = false, want = 0, lastSeek = 0;
    const at = (e) => { const r = track.getBoundingClientRect(); return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)); };
    const preview = (k) => { const d = v.duration || pb.dur || 0; want = k * d; bubble.hidden = false; bubble.style.left = (k * 100).toFixed(2) + '%'; ptime.textContent = fmt(want); const now = performance.now(); if (now - lastSeek > 220 && this.pv.readyState >= 1) { lastSeek = now; try { this.pv.currentTime = want; } catch (e) {} } fill.style.width = knob.style.left = (k * 100).toFixed(2) + '%'; };
    track.addEventListener('pointerdown', (e) => { e.stopPropagation(); drag = true; track.setPointerCapture(e.pointerId); preview(at(e)); });
    track.addEventListener('pointermove', (e) => { if (drag) preview(at(e)); });
    const end = (e) => { if (!drag) return; drag = false; bubble.hidden = true; this.shows.control('seek', want); this.sound.click(); }; track.addEventListener('pointerup', end); track.addEventListener('pointercancel', end);
    const tick = () => { if (!this.isOpen() || this.tab !== 'remote') return; const d = v.duration || 0; if (!drag) { const k = d ? v.currentTime / d : 0; fill.style.width = knob.style.left = (k * 100).toFixed(2) + '%'; } cur.textContent = fmt(v.currentTime); tot.textContent = '-' + fmt(d - v.currentTime);
      const icon = v.paused ? '#i-play' : '#i-pause', u = pp.querySelector('use'); if (u.getAttribute('href') !== icon) u.setAttribute('href', icon); this._raf = requestAnimationFrame(tick); };
    this._raf = requestAnimationFrame(tick);
  }
  // ---------------- films ----------------
  films(B) {
    $('#tbTitle').textContent = t('tab.films'); const grid = el('div', 'tb-grid'); const story = !this.hooks.quick();
    for (const f of CATALOG) { const c = el('button', 'tb-film'), img = new Image(); img.alt = ''; img.loading = 'lazy'; img.src = posterURL(f.id); c.appendChild(img); c.appendChild(el('b', null, f.short || f.title)); c.appendChild(el('small', null, `${t('genre.' + f.genre)} · ${t('book.mins', { n: f.mins })}` + (story ? ` · ${this.wallet.fmt(this.wallet.P.replay)}` : '')));
      c.addEventListener('click', (e) => { e.stopPropagation(); this.sound.click(); if (this.hooks.playFilm({ film: f.id, title: f.title })) { this.hooks.toast(t('tab.starting', { title: f.title }), 2600); this.show('remote'); } }); grid.appendChild(c); }
    B.appendChild(grid);
  }
  // ---------------- my videos ----------------
  mine(B) {
    $('#tbTitle').textContent = t('tab.mine'); const M = window.LumiereMedia;
    if (!M) { const e = el('div', 'tb-empty'); e.appendChild(el('b', null, t('tab.noBridge'))); e.appendChild(el('p', 'note', t('tab.noBridgeHint'))); const pick = el('button', 'btn primary', t('book.gallery')); pick.addEventListener('click', (ev) => { ev.stopPropagation(); this.hooks.pickOwn(); }); e.appendChild(pick);
      if (this.shows.own) { const play = el('button', 'btn secondary', t('tab.playOwn', { name: this.shows.own.label })); play.addEventListener('click', (ev) => { ev.stopPropagation(); if (this.hooks.playFilm({ own: true })) this.show('remote'); }); e.appendChild(play); } B.appendChild(e); return; }
    if (!M.hasPermission()) { const e = el('div', 'tb-empty'); e.appendChild(el('b', null, t('tab.permTitle'))); e.appendChild(el('p', 'note', t('tab.permBody'))); const ask = el('button', 'btn primary', t('tab.permAsk')); ask.addEventListener('click', (ev) => { ev.stopPropagation(); window.__lumiereMediaPermission = (ok) => { if (ok) { this.items = null; this.show('mine'); } else this.hooks.toast(t('tab.permDenied'), 3200, 'error'); }; M.requestPermission(); }); e.appendChild(ask); B.appendChild(e); return; }
    if (!this.items) { try { this.items = JSON.parse(M.list() || '[]'); } catch (e) { this.items = []; } }
    const bar = el('div', 'tb-bar'), search = el('div', 'inp'); search.innerHTML = '<svg class="ic"><use href="#i-search"/></svg>'; const q = el('input'); q.placeholder = t('tab.search'); q.value = this.q; search.appendChild(q); bar.appendChild(search);
    const sort = el('div', 'seg'); for (const [k, lab] of [['recent', t('tab.sortRecent')], ['name', t('tab.sortName')], ['long', t('tab.sortLong')]]) { const b = el('button', this.sort === k ? 'on' : '', lab); b.addEventListener('click', (e) => { e.stopPropagation(); this.sort = k; this.sound.click(); this.show('mine'); }); sort.appendChild(b); } bar.appendChild(sort); B.appendChild(bar);
    const views = el('div', 'tb-views'), albums = [...new Set(this.items.map((i) => i.album || '—'))].sort();
    const chip = (lab, on, fn) => { const b = el('button', 'chip' + (on ? ' on' : ''), lab); b.addEventListener('click', (e) => { e.stopPropagation(); this.sound.click(); fn(); this.show('mine'); }); views.appendChild(b); };
    chip(t('tab.all'), this.view === 'all', () => { this.view = 'all'; this.album = null; }); chip('♥ ' + t('tab.favs'), this.view === 'fav', () => { this.view = 'fav'; this.album = null; });
    for (const name of Object.keys(this.cols)) chip('▣ ' + name, this.view === 'col:' + name, () => { this.view = 'col:' + name; this.album = null; });
    for (const a of albums) chip(a, this.view === 'album' && this.album === a, () => { this.view = 'album'; this.album = a; });
    chip('+ ' + t('tab.newCol'), false, () => { const n = (prompt(t('tab.colName')) || '').trim().slice(0, 24); if (n) { this.cols[n] = this.cols[n] || []; store.set('cols', this.cols); this.view = 'col:' + n; } });
    B.appendChild(views);
    let list = this.items.filter((i) => (!this.q || i.name.toLowerCase().includes(this.q.toLowerCase())) && (this.view === 'all' || (this.view === 'fav' && this.fav.has(i.id)) || (this.view === 'album' && (i.album || '—') === this.album) || (this.view.startsWith('col:') && (this.cols[this.view.slice(4)] || []).includes(i.id))));
    list.sort((a, b) => this.sort === 'name' ? a.name.localeCompare(b.name) : this.sort === 'long' ? (b.dur || 0) - (a.dur || 0) : (b.date || 0) - (a.date || 0));
    const grid = el('div', 'tb-vids');
    if (!list.length) grid.appendChild(el('p', 'note', t('tab.noneFound')));
    for (const it of list.slice(0, 240)) { const c = el('div', 'tb-vid'), th = el('div', 'th'), img = new Image(); img.alt = ''; img.loading = 'lazy'; img.src = M.thumbUrl(it.id); th.appendChild(img); th.appendChild(el('span', 'dur', fmt((it.dur || 0) / 1000))); c.appendChild(th);
      c.appendChild(el('b', null, cleanTitle(it.name))); c.appendChild(el('small', null, `${it.h ? it.h + 'p · ' : ''}${Math.round((it.size || 0) / 1e6)} MB`));
      const heart = el('button', 'heart' + (this.fav.has(it.id) ? ' on' : '')); heart.innerHTML = '<svg class="ic"><use href="#i-heart"/></svg>'; heart.addEventListener('click', (e) => { e.stopPropagation(); if (this.fav.has(it.id)) this.fav.delete(it.id); else this.fav.add(it.id); store.set('fav', [...this.fav]); heart.classList.toggle('on'); this.sound.click(); }); c.appendChild(heart);
      if (this.view.startsWith('col:')) { const rm = el('button', 'colrm', '−'); rm.addEventListener('click', (e) => { e.stopPropagation(); const k = this.view.slice(4); this.cols[k] = this.cols[k].filter((x) => x !== it.id); store.set('cols', this.cols); this.show('mine'); }); c.appendChild(rm); }
      else if (Object.keys(this.cols).length) { const add = el('button', 'coladd', '+'); add.addEventListener('click', (e) => { e.stopPropagation(); const names = Object.keys(this.cols), n = names.length === 1 ? names[0] : prompt(t('tab.addTo') + '\n' + names.join(', ')); if (n && this.cols[n] && !this.cols[n].includes(it.id)) { this.cols[n].push(it.id); store.set('cols', this.cols); this.hooks.toast(t('tab.added', { col: n }), 1600); } }); c.appendChild(add); }
      c.addEventListener('click', () => { this.sound.click(); this.onLocal && this.onLocal(M.videoUrl(it.id), it.name); if (this.hooks.quick() || this.server) { if (this.hooks.playFilm({ own: true })) this.show('remote'); } else this.close(); });
      grid.appendChild(c); }
    B.appendChild(grid);
    q.addEventListener('input', () => { this.q = q.value; clearTimeout(this._qt); this._qt = setTimeout(() => { const pos = q.selectionStart; this.show('mine'); const nq = document.querySelector('#tbBody .tb-bar input'); if (nq) { nq.focus(); nq.setSelectionRange(pos, pos); } }, 250); });
  }
}
