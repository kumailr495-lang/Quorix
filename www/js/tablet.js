// LUMIERE v8 - the tablet (phone feedback: a tablet the receptionist and the seat server hand you; "Netflix-type" seeking that shows the
// picture under your finger; play, pause, speed, stop, play another film for money; your own videos with thumbnails, search, filter,
// albums, collections and favourites instead of the file manager).
//   Remote:    the show you are watching. The seek bar's preview is a second, muted <video> of the same film that jumps to where your finger
//              is (a real frame, no canvas, so streamed films without CORS work too).
//   Films:     the open films; "play" starts one in your hall (Story: costs Wallet.P.replay).
//   My videos: the Android media bridge (bridge.js media: window.LumiereMedia with its key) lists the phone's videos with thumbnails; without it (older APK,
//              desktop) the system picker and a link field stand in.
// Favourites and collections are kept on the device (localStorage).
// v9: the app's own server gives each video's address and thumbnail in the list (it.url, it.thumb); the film is a WebGL picture now.
import { t } from './i18n.js';
import { media } from './bridge.js';
import { CATALOG, posterURL, filmById, cleanTitle } from './films.js';
import { renderMenu } from './menuui.js';
const $ = (s) => document.querySelector(s), el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const fmt = (s) => { s = Math.max(0, Math.floor(s || 0)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); };
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const store = { get(k, d) { try { return JSON.parse(localStorage.getItem('lumiere.' + k)) ?? d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('lumiere.' + k, JSON.stringify(v)); } catch (e) {} } };
export class Tablet {
  constructor(shows, sound, wallet, settings, hooks) {
    this.shows = shows; this.sound = sound; this.wallet = wallet; this.settings = settings; this.hooks = hooks; this.tab = 'remote'; this.server = false; this.onLocal = null;
    this.q = ''; this.sort = 'recent'; this.album = null; this.view = 'all'; this.fav = new Set(store.get('fav', [])); this.cols = store.get('cols', {}); this.items = null; this._raf = 0;
    // v14b (the user, 11-26: "the tablet UI sucks, it doesnt feel like tablet"): a status bar, a home screen of apps, each app full screen
    // with a back arrow and the title, a home bar at the bottom
    const root = $('#tablet'); root.innerHTML = `<div class="tab-dev"><i class="tab-cam"></i><div class="tab-scr">
      <div class="tb-status"><b id="tbClock"></b><span>LUMIÈRE</span><span class="tb-sig"><i></i><i></i><i></i><em></em></span></div>
      <header class="tb-head"><button class="tb-back" id="tbBack"><svg class="ic"><use href="#i-back"/></svg></button><div class="tb-title"><small>LUMIÈRE</small><b id="tbTitle"></b></div><nav class="tb-tabs" id="tbTabs" hidden><button data-t="remote">${t('tab.remote')}</button><button data-t="films">${t('tab.films')}</button><button data-t="stream">${t('str.tab')}</button><button data-t="mine">${t('tab.mine')}</button><button data-t="order">${t('tab9.order')}</button></nav><button class="btn secondary sm" id="tbClose"></button></header>
      <div class="tb-body" id="tbBody"></div><button class="tb-homebar" id="tbHomeBar" aria-label="home"></button></div></div>`;
    root.addEventListener('click', (e) => { if (e.target === root) this.close(); });
    $('#tbClose').addEventListener('click', (e) => { e.stopPropagation(); this.close(); });
    for (const id of ['#tbBack', '#tbHomeBar']) $(id).addEventListener('click', (e) => { e.stopPropagation(); this.sound.click(); this.show('home'); });
    for (const b of root.querySelectorAll('#tbTabs button')) b.addEventListener('click', (e) => { e.stopPropagation(); this.sound.click(); this.show(b.dataset.t); });
    // the preview player for seeking (a second element; never heard)
    this.pv = document.createElement('video'); this.pv.muted = true; this.pv.playsInline = true; this.pv.preload = 'metadata'; this.pv.setAttribute('playsinline', '');
  }
  isOpen() { return !$('#tablet').hidden; }
  open(tab = 'home', o = {}) { this.server = !!o.server; $('#tablet').hidden = false; clearInterval(this._clk); const ck = () => { const d = new Date(); $('#tbClock').textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }; ck(); this._clk = setInterval(ck, 15000); $('#tbClose').textContent = t(this.server ? 'tab.handBack' : 'tab.close'); this.sound.tablet && this.sound.tablet(true); this.show(tab); this.hooks.onModal(true); }
  close() { if (!this.isOpen()) return; clearInterval(this._clk); $('#tablet').hidden = true; cancelAnimationFrame(this._raf); this.pv.removeAttribute('src'); this.pv.load(); this.sound.tablet && this.sound.tablet(false); if (this.server) { this.server = false; this.hooks.handBack(); } this.hooks.onModal(false); }
  refresh() { if (this.isOpen()) this.show(this.tab); }
  show(tab) {
    this.tab = tab; for (const b of document.querySelectorAll('#tbTabs button')) b.classList.toggle('on', b.dataset.t === tab); cancelAnimationFrame(this._raf);
    const B = $('#tbBody'); B.innerHTML = ''; B.className = 'tb-body ' + tab; $('#tablet').classList.toggle('at-home', tab === 'home'); if (tab === 'home') this.homeScreen(B); else if (tab === 'remote') this.remote(B); else if (tab === 'films') this.films(B); else if (tab === 'stream') this.stream(B); else if (tab === 'order') this.order(B); else this.mine(B);
  }
  // ---------------- v14b the home screen: the apps, each with its icon and name; what is playing in a strip at the top
  homeScreen(B) {
    $('#tbTitle').textContent = t('tab.home'); const pb = this.shows.playback();
    if (pb && this.shows.isOn(pb.id)) { const np = el('button', 'tb-now'); np.append(el('small', null, t('tab.remote')), el('b', null, this.shows.title(pb.id))); np.addEventListener('click', (e) => { e.stopPropagation(); this.sound.click(); this.show('remote'); }); B.appendChild(np); }
    const grid = el('div', 'tb-apps');
    for (const [k, ic, lab] of [['remote', 'i-play', 'tab.remote'], ['films', 'i-film', 'tab.films'], ['stream', 'i-globe', 'str.tab'], ['mine', 'i-image', 'tab.mine'], ['order', 'i-popcorn', 'tab9.order']]) {
      const b = el('button', 'tb-app'); b.innerHTML = `<i><svg class="ic"><use href="#${ic}"/></svg></i>`; b.appendChild(el('span', null, t(lab))); b.addEventListener('click', (e) => { e.stopPropagation(); this.sound.click(); this.show(k); }); grid.appendChild(b); }
    B.appendChild(grid);
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
    // v9: each open film can be saved to the phone (the app downloads it; it then plays offline, with no Wi-Fi stutter)
    const M = media, saved = (() => { try { return M ? JSON.parse(M.downloaded() || '[]') : []; } catch (e) { return []; } })();
    for (const f of CATALOG) { const c = el('button', 'tb-film'), img = new Image(); img.alt = ''; img.loading = 'lazy'; img.src = posterURL(f.id); c.appendChild(img); c.appendChild(el('b', null, f.short || f.title)); c.appendChild(el('small', null, `${t('genre.' + f.genre)} · ${t('book.mins', { n: f.mins })}` + (story && this.wallet.P.replay ? ` · ${this.wallet.fmt(this.wallet.P.replay)}` : '')));
      c.addEventListener('click', (e) => { e.stopPropagation(); this.sound.click(); if (this.hooks.playFilm({ film: f.id, title: f.title })) { this.hooks.toast(t('tab.starting', { title: f.title }), 2600); this.show('remote'); } });
      if (M && M.download) { const have = saved.find((d) => d.name === f.id + '.mp4' && d.done), dl = el('span', 'tb-dl' + (have ? ' done' : ''), have ? t('tab9.saved') : t('tab9.save'));
        dl.addEventListener('click', (e) => { e.stopPropagation(); this.sound.click(); if (have) return; dl.textContent = '0 %'; this._dl = this._dl || {}; this._dl[f.id + '.mp4'] = dl; M.download(f.url, f.id + '.mp4'); });
        c.appendChild(dl); }
      grid.appendChild(c); }
    B.appendChild(grid);
    window.__lumiereDownload = (name, done, total, state) => { const d = this._dl && this._dl[name]; if (!d) return; d.textContent = state === 'done' ? t('tab9.saved') : String(state).startsWith('error') ? t('tab9.failed') : total > 0 ? Math.floor(done * 100 / total) + ' %' : Math.round(done / 1048576) + ' MB'; if (state === 'done') d.classList.add('done'); };
  }
  // ---------------- v9: order to your seat (the armrest tablet): it goes on your bill; the server brings it, or the counter sends it up
  order(B) {
    $('#tbTitle').textContent = t('tab9.order'); const box = el('div', 'tb-menu'); B.appendChild(box);   // v14 the menu (menuui.js): categories, pictures, prices
    renderMenu(box, { sound: this.sound, free: this.hooks.quick() && this.wallet.unlimited, price: (id) => this.wallet.fmt(this.wallet.itemPrice(id)),
      order: (id) => { const ok = !!(this.hooks.order && this.hooks.order(id)); if (ok) this.hooks.toast(t('tab9.ordered', { item: t('food.' + id) }), 2600); return ok; } });
    if (this.hooks.canBin && this.hooks.canBin()) { const b = el('button', 'btn secondary', t('tab9.bin')); b.addEventListener('click', (e) => { e.stopPropagation(); this.sound.click(); this.hooks.bin && this.hooks.bin(); this.show('order'); }); B.appendChild(b); }
  }
  // ---------------- v14 streaming (the user, 11-20: "actual in-app streaming"): the Internet Archive's public-domain films in rows, with
  // search and a detail sheet, beside the house films. Nothing is downloaded: the film streams from archive.org into your hall like a
  // link (film9.js loadURL). Only legal sources: public-domain collections (each item's own page says its rights) and the Blender films.
  stream(B) {
    $('#tbTitle').textContent = t('str.title'); const bar = el('div', 'tb-bar'), box = el('div', 'inp'); box.innerHTML = '<svg class="ic"><use href="#i-search"/></svg>';
    const q = el('input'); q.placeholder = t('str.search'); q.value = this.sq || ''; q.enterKeyHint = 'search'; box.appendChild(q); bar.appendChild(box); B.appendChild(bar);
    const rows = el('div', 'st-rows'); B.appendChild(rows);
    const go = () => { this.sq = q.value.trim(); rows.innerHTML = ''; if (this.sq) this.stRow(rows, t('str.results', { q: this.sq }), this.sq, true); else this.stHome(rows); };
    q.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') { q.blur(); go(); } }); go();
  }
  stHome(rows) {
    const own = el('section', 'st-row'); own.appendChild(el('h4', null, t('str.originals'))); const strip = el('div', 'st-strip');
    for (const f of CATALOG) { const c = el('button', 'st-card'), img = new Image(); img.alt = ''; img.loading = 'lazy'; img.src = posterURL(f.id); c.append(img, el('b', null, f.short || f.title), el('small', null, `${f.year} · ${f.mins} min`));
      c.addEventListener('click', (e) => { e.stopPropagation(); this.sound.click(); if (this.hooks.playFilm({ film: f.id, title: f.title })) { this.hooks.toast(t('tab.starting', { title: f.title }), 2600); this.show('remote'); } }); strip.appendChild(c); }
    own.appendChild(strip); rows.appendChild(own);
    for (const [k, col] of [['classics', 'feature_films'], ['animation', 'animationandcartoons'], ['scifi', 'SciFi_Horror'], ['noir', 'subject:"film noir"'], ['silent', 'silent_films'], ['comedy', 'Comedy_Films']]) this.stRow(rows, t('str.row.' + k), col.includes(':') ? col : `collection:${col}`, false);
  }
  async stRow(rows, title, q, search) {
    const sec = el('section', 'st-row'); sec.appendChild(el('h4', null, title)); const strip = el('div', 'st-strip'); strip.appendChild(el('small', 'note', t('str.loading'))); sec.appendChild(strip); rows.appendChild(sec);
    const query = search ? `(title:(${q.replace(/[^\p{L}\p{N} '-]/gu, ' ').slice(0, 60)}) AND mediatype:movies AND (collection:feature_films OR collection:animationandcartoons OR collection:SciFi_Horror OR collection:film_noir OR collection:silent_films OR collection:Comedy_Films))` : `${q} AND mediatype:movies`;
    // only items marked public domain by the archive (licenseurl), that carry a playable h.264 / MPEG-4 file, and nothing adult (a cinema for everyone; the archive's exploitation reels rank high)
    const full = `(${query}) AND format:("h.264" OR "MPEG4") AND licenseurl:(*publicdomain*) AND NOT title:(sex OR nude OR nudist OR erotic OR stripper OR burlesque) AND NOT subject:(sex OR erotic OR nudity OR adult OR exploitation OR sexploitation)`;
    this._st = this._st || new Map(); let items = this._st.get(full);
    try {
      if (!items) { const u = 'https://archive.org/advancedsearch.php?' + new URLSearchParams({ q: full, 'fl[]': 'identifier', rows: '24', output: 'json', 'sort[]': 'downloads desc' }) + '&fl[]=title&fl[]=year&fl[]=runtime';
        const r = await fetch(u, { credentials: 'omit' }); const j = await r.json(); items = (j.response && j.response.docs || []).filter((d) => typeof d.identifier === 'string' && /^[\w.-]{1,100}$/.test(d.identifier)).slice(0, 24); this._st.set(full, items); }
    } catch (e) { strip.innerHTML = ''; strip.appendChild(el('small', 'note', t('str.offline'))); return; }
    strip.innerHTML = ''; if (!items.length) { strip.appendChild(el('small', 'note', t('str.none'))); return; }
    for (const d of items) { const c = el('button', 'st-card'), img = new Image(); img.alt = ''; img.loading = 'lazy'; img.referrerPolicy = 'no-referrer'; img.src = `https://archive.org/services/img/${d.identifier}`;
      const name = String(Array.isArray(d.title) ? d.title[0] : d.title || d.identifier).slice(0, 80); c.append(img, el('b', null, name), el('small', null, [d.year, d.runtime].filter(Boolean).join(' · ').slice(0, 40)));
      c.addEventListener('click', (e) => { e.stopPropagation(); this.sound.click(); this.stDetail(d.identifier, name); }); strip.appendChild(c); }
  }
  async stDetail(id, name) {
    const B = $('#tbBody'); B.innerHTML = ''; B.className = 'tb-body stream detail'; const back = el('button', 'btn ghost sm', t('str.back')); back.addEventListener('click', (e) => { e.stopPropagation(); this.show('stream'); }); B.appendChild(back);
    const wrap = el('div', 'st-detail'), img = new Image(); img.alt = ''; img.referrerPolicy = 'no-referrer'; img.src = `https://archive.org/services/img/${id}`; const side = el('div'); side.appendChild(el('h3', null, name));
    const meta = el('p', 'note', t('str.loading')), desc = el('p', 'st-desc'), play = el('button', 'btn primary', t('str.play')); play.disabled = true; side.append(meta, desc, play, el('p', 'note st-lic', t('str.lic'))); wrap.append(img, side); B.appendChild(wrap);
    let file = null;
    try {
      const j = await (await fetch(`https://archive.org/metadata/${encodeURIComponent(id)}`, { credentials: 'omit' })).json(), md = j.metadata || {}, files = Array.isArray(j.files) ? j.files : [];
      const tx = (v) => String(Array.isArray(v) ? v[0] : v || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      meta.textContent = [tx(md.year || md.date).slice(0, 10), tx(md.runtime).slice(0, 20), /publicdomain/i.test(tx(md.licenseurl)) || !tx(md.licenseurl) ? t('str.pd') : t('str.licensed')].filter(Boolean).join(' · '); desc.textContent = tx(md.description).slice(0, 420);
      const rank = (f) => (/h\.264 hd/i.test(f.format) ? 4 : /h\.264/i.test(f.format) ? 3 : /mpeg4/i.test(f.format) ? 2 : /\.mp4$/i.test(f.name) ? 1 : 0);
      file = files.filter((f) => f && typeof f.name === 'string' && rank(f) > 0 && !/\//.test(f.name)).sort((a, b) => rank(b) - rank(a) || (+b.size || 0) - (+a.size || 0))[0] || null;
    } catch (e) { meta.textContent = t('str.offline'); return; }
    if (!file) { meta.textContent = t('str.noVideo'); return; }
    play.disabled = false; play.addEventListener('click', (e) => { e.stopPropagation(); this.sound.click(); const url = `https://archive.org/download/${encodeURIComponent(id)}/${encodeURIComponent(file.name)}`;
      this.shows.loadURL(url, name); if (this.hooks.playFilm({ own: true })) { this.hooks.toast(t('tab.starting', { title: name }), 2600); this.show('remote'); } });
  }
  // ---------------- my videos ----------------
  mine(B) {
    $('#tbTitle').textContent = t('tab.mine'); const M = media;
    if (!M) { const e = el('div', 'tb-empty'); e.appendChild(el('b', null, t('tab.noBridge'))); e.appendChild(el('p', 'note', t('tab.noBridgeHint'))); const pick = el('button', 'btn primary', t('book.gallery')); pick.addEventListener('click', (ev) => { ev.stopPropagation(); this.hooks.pickOwn(); }); e.appendChild(pick);
      if (this.shows.own) { const play = el('button', 'btn secondary', t('tab.playOwn', { name: this.shows.own.label })); play.addEventListener('click', (ev) => { ev.stopPropagation(); if (this.hooks.playFilm({ own: true })) this.show('remote'); }); e.appendChild(play); } B.appendChild(e); return; }
    // v14c Music Night in the app: the gallery lists videos only, so a song comes through the system's file picker (the page's file input,
    // which accepts audio); once one is chosen, play it from here
    { const row = el('div', 'tb-songs'), song = el('button', 'btn secondary sm', '♪ ' + t('tab.pickSong')); song.addEventListener('click', (ev) => { ev.stopPropagation(); this.sound.click(); const f = document.getElementById('file'); if (f) f.click(); }); row.appendChild(song);
      if (this.shows.own) { const play = el('button', 'btn primary sm', t('tab.playOwn', { name: this.shows.own.label })); play.addEventListener('click', (ev) => { ev.stopPropagation(); if (this.hooks.playFilm({ own: true })) this.show('remote'); }); row.appendChild(play); }
      B.appendChild(row); }
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
    for (const it of list.slice(0, 240)) { const c = el('div', 'tb-vid'), th = el('div', 'th'), img = new Image(); img.alt = ''; img.loading = 'lazy'; img.src = (it.thumb || (M.thumbUrl && M.thumbUrl(it.id))); th.appendChild(img); th.appendChild(el('span', 'dur', fmt((it.dur || 0) / 1000))); c.appendChild(th);
      c.appendChild(el('b', null, cleanTitle(it.name))); c.appendChild(el('small', null, `${it.h ? it.h + 'p · ' : ''}${Math.round((it.size || 0) / 1e6)} MB`));
      const heart = el('button', 'heart' + (this.fav.has(it.id) ? ' on' : '')); heart.innerHTML = '<svg class="ic"><use href="#i-heart"/></svg>'; heart.addEventListener('click', (e) => { e.stopPropagation(); if (this.fav.has(it.id)) this.fav.delete(it.id); else this.fav.add(it.id); store.set('fav', [...this.fav]); heart.classList.toggle('on'); this.sound.click(); }); c.appendChild(heart);
      if (this.view.startsWith('col:')) { const rm = el('button', 'colrm', '−'); rm.addEventListener('click', (e) => { e.stopPropagation(); const k = this.view.slice(4); this.cols[k] = this.cols[k].filter((x) => x !== it.id); store.set('cols', this.cols); this.show('mine'); }); c.appendChild(rm); }
      else if (Object.keys(this.cols).length) { const add = el('button', 'coladd', '+'); add.addEventListener('click', (e) => { e.stopPropagation(); const names = Object.keys(this.cols), n = names.length === 1 ? names[0] : prompt(t('tab.addTo') + '\n' + names.join(', ')); if (n && this.cols[n] && !this.cols[n].includes(it.id)) { this.cols[n].push(it.id); store.set('cols', this.cols); this.hooks.toast(t('tab.added', { col: n }), 1600); } }); c.appendChild(add); }
      c.addEventListener('click', () => { this.sound.click(); this.onLocal && this.onLocal((it.url || (M.videoUrl && M.videoUrl(it.id))), it.name); if (this.hooks.quick() || this.server) { if (this.hooks.playFilm({ own: true })) this.show('remote'); } else this.close(); });
      grid.appendChild(c); }
    B.appendChild(grid);
    q.addEventListener('input', () => { this.q = q.value; clearTimeout(this._qt); this._qt = setTimeout(() => { const pos = q.selectionStart; this.show('mine'); const nq = document.querySelector('#tbBody .tb-bar input'); if (nq) { nq.focus(); nq.setSelectionRange(pos, pos); } }, 250); });
  }
}
