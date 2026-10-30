// LUMIERE v8 - interface controller ("Noir & Brass", css/app.css): the "LUMIÈRE PRESENTS" loader, the main menu (Story or Quick play),
// HUD (location, ticket chip, wallet, remote / bell / item buttons, context action, toasts), the ticket, tabbed settings (controls with a
// layout editor, graphics with every switch the phone feedback asked for, sound and voices, language, tutorial), help/credits, pause.
// The booking sheet lives in booking.js, the tablet in tablet.js.
import { t, setLang, LANGS, lang } from './i18n.js';
import { CATALOG, posterURL } from './films.js';
const $ = (s) => document.querySelector(s);
const LANG_SUB = { en: 'English', hi: 'Hindi', ur: 'Urdu', es: 'Spanish' }, LANG_CLASS = { hi: 'dev', ur: 'urd' };
// context-action icons for the HUD prompt (talk, sit, stand, give, pay...)
const PROMPT_ICON = (label) => /talk|बात|بات|habla/i.test(label) ? '#i-talk' : /stand|खड़े|کھڑے|levant/i.test(label) ? '#i-run' : /sit|seat|बैठ|بیٹھ|sent|butaca/i.test(label) ? '#i-seat' : '#i-hand';
// graphics switches: [settings key, element id, values]
const CHOICES = [['shadows', '#sShadows', ['off', 'on']], ['reflections', '#sRefl', ['off', 'soft', 'full']], ['lod', '#sLod', ['aggressive', 'normal', 'far']], ['viewDist', '#sView', ['near', 'medium', 'far']], ['npcs', '#sNpcs', ['off', 'few', 'normal', 'many']]];
export class UI {
  constructor(world, shows, sound, settings, hooks) {
    this.world = world; this.shows = shows; this.sound = sound; this.settings = settings; this.hooks = hooks; this.promptFn = null; this._toastT = 0; this.hidden = false; this.tab = 'controls'; this.bind();
  }
  // ---------------- loading / menu ----------------
  progress(p) { $('#ldFill').style.width = (p * 100).toFixed(0) + '%'; }
  showMenu(on, cont) {
    $('#menu').hidden = !on; $('#mnCont').hidden = !cont; $('#hud').hidden = on || this.hidden; $('#bShow').hidden = on || !this.hidden;
    $('#mnTutLbl').textContent = t(this.settings.tutorialDone ? 'tut.again' : 'tut.start'); if (on) this.nowShowing();
  }
  nowShowing() {
    const L = $('#nowList'); L.innerHTML = ''; $('#mnLangCur').textContent = (LANGS.find((l) => l.code === lang()) || LANGS[0]).name;
    for (const f of CATALOG.slice(0, 4)) { const row = document.createElement('div'); row.className = 'now'; const img = new Image(); img.alt = ''; img.src = posterURL(f.id); row.appendChild(img);
      const tx = document.createElement('div'); tx.innerHTML = '<b></b><small><span></span></small>'; tx.querySelector('b').textContent = f.short || f.title;
      tx.querySelector('span').textContent = `${t('genre.' + f.genre)} · ${t('book.mins', { n: f.mins })}`; row.appendChild(tx); L.appendChild(row); }
  }
  fade(v, dur = 0.6) { const f = $('#fade'); f.style.transition = `opacity ${dur}s ease`; f.style.opacity = String(v); }
  // ---------------- HUD ----------------
  toast(msg, ms = 2600, kind = 'info') { const el = $('#toast'); $('#toastText').textContent = msg; el.classList.toggle('err', kind === 'error'); $('#toastIcon').setAttribute('href', kind === 'error' ? '#i-alert' : '#i-check'); el.classList.add('show'); clearTimeout(this._toastT); this._toastT = setTimeout(() => el.classList.remove('show'), ms); }
  setPrompt(label, fn) { const p = $('#prompt'); if (!label) { if (!p.hidden) p.hidden = true; this.promptFn = null; return; } const l = $('#promptLbl'); if (l.textContent !== label) { l.textContent = label; $('#promptIcon').setAttribute('href', PROMPT_ICON(label)); } if (p.hidden) p.hidden = false; this.promptFn = fn; }
  setWhere(a, b) { const A = $('#whereA'), B = $('#whereB'); if (A.textContent !== a) A.textContent = a; if (B.textContent !== (b || '')) B.textContent = b || ''; }
  setTicketChip(text) { const c = $('#ticketChip'); if (!text) { c.hidden = true; return; } c.hidden = false; const s = $('#tcText'); if (s.textContent !== text) s.textContent = text; }
  setWallet(text) { const w = $('#walletChip'); w.hidden = !text; if (text && $('#wcText').textContent !== text) $('#wcText').textContent = text; }
  // held item: label + how full it is (popcorn empties in 9 bites, a drink in 8 sips)
  setItem(kind, left, max) { const b = $('#itemBtn'); if (!kind) { b.hidden = true; return; } b.hidden = false; $('#itemLbl').textContent = t(kind === 'drink' || kind === 'coffee' ? 'hud.sip' : 'hud.eat'); b.style.setProperty('--fill', String(Math.max(0, Math.min(1, left / max)))); }
  setButton(id, on) { const b = $(id); if (b && b.hidden === !!on) b.hidden = !on; }
  setFps(text) { const f = $('#fps'); f.hidden = !this.settings.showFps; if (!f.hidden) f.textContent = text; }
  setHidden(h) { this.hidden = h; $('#hud').hidden = h; $('#bShow').hidden = !h; if (h) this.toast(t('toast.uiHidden'), 2200); this.hooks.onHide && this.hooks.onHide(h); }
  modalOpen() { return ['#book', '#ticket', '#settings', '#langPick', '#info', '#pause', '#talk', '#tablet', '#atm', '#tutAsk', '#layoutEd'].some((s) => $(s) && !$(s).hidden) || !$('#menu').hidden; }
  // ---------------- ticket ----------------
  showTicket(tk, quick) {
    $('#tkTitle').textContent = tk.title; $('#tkScreen').textContent = tk.hall === 'I' ? '1' : tk.hall === 'II' ? '2' : '3'; $('#tkRow').textContent = tk.row; $('#tkSeat').textContent = tk.col; $('#tkKind').textContent = `${tk.hallName} · ${t('kind.' + tk.kind)}`;
    $('#tkHint').textContent = quick ? t('tk.hintQuick') : t('tk.hintStory', { n: Math.round(tk.delay / 60) }); $('#tkJump').hidden = !quick; $('#ticket').hidden = false; this.hooks.onModal(true);
  }
  // ---------------- settings / language / info / pause ----------------
  openSettings(tab) { $('#settings').hidden = false; if (tab) this.tab = tab; this.syncSettings(); this.hooks.onModal(true); }
  setTab(tab) { this.tab = tab; for (const b of document.querySelectorAll('#setTabs button')) b.classList.toggle('on', b.dataset.tab === tab); for (const p of document.querySelectorAll('#settings .tab')) p.hidden = p.dataset.tab !== tab; }
  syncSettings() {
    const S = this.settings, setT = (id, v) => $(id).classList.toggle('on', !!v), num = (id, out, v, f = (x) => x.toFixed(2)) => { const el = $(id); el.value = v; $(out).textContent = f(+v); this.rangeFill(el); };
    num('#sSens', '#oSens', S.sensitivity); num('#sBright', '#oBright', S.brightness); num('#sMaster', '#oMaster', S.master, (x) => Math.round(x * 100)); num('#sFilm', '#oFilm', S.film, (x) => Math.round(x * 100)); num('#sCrowd', '#oCrowd', S.crowd, (x) => Math.round(x * 100)); num('#sHud', '#oHud', S.hudScale, (x) => Math.round(x * 100) + '%');
    setT('#sInvert', S.invertY); setT('#sAuto', S.autoRes); setT('#sFps', S.showFps); setT('#sBubbles', S.bubbles); setT('#sVoices', S.voices); setT('#sSubs', S.subtitles); setT('#sLefty', S.lefty); setT('#sSkip', S.skipSeen);
    for (const b of document.querySelectorAll('#sGfx button')) b.classList.toggle('on', b.dataset.v === S.graphics);
    for (const [key, id] of CHOICES) for (const b of document.querySelectorAll(id + ' button')) b.classList.toggle('on', b.dataset.v === String(S[key]));
    $('#sDevice').textContent = S.deviceNote || ''; $('#tutBtnLbl').textContent = t(S.tutorialDone ? 'tut.again' : 'tut.start');
    this.langButtons($('#sLang'), (code) => this.chooseLang(code)); this.setTab(this.tab);
  }
  rangeFill(el) { const p = (el.value - el.min) / (el.max - el.min) * 100; el.style.setProperty('--p', p.toFixed(1) + '%'); }
  langButtons(L, onPick) { L.innerHTML = ''; for (const l of LANGS) { const b = document.createElement('button'); b.classList.toggle('on', l.code === lang()); const n = document.createElement('b'); n.textContent = l.name; if (LANG_CLASS[l.code]) n.className = LANG_CLASS[l.code]; const s = document.createElement('small'); s.textContent = LANG_SUB[l.code] || l.code; b.append(n, s); b.addEventListener('click', () => { this.sound.click(); onPick(l.code); }); L.appendChild(b); } }
  chooseLang(code) { this.settings.lang = code; setLang(code); this.hooks.onSettings(); if (!$('#settings').hidden) this.syncSettings(); this.langList(); if (!$('#menu').hidden) this.showMenu(true, !$('#mnCont').hidden); this.hooks.onLangChanged && this.hooks.onLangChanged(); }
  langList() { this.langButtons($('#langList'), (code) => { this.chooseLang(code); $('#langPick').hidden = true; this.hooks.onModal(this.modalOpen()); this.hooks.onLangPicked && this.hooks.onLangPicked(); }); }
  openLang() { this.langList(); $('#langPick').hidden = false; this.hooks.onModal(true); }
  openInfo(kind) { $('#infoTitle').textContent = t(kind === 'help' ? 'menu.help' : 'menu.credits'); $('#infoBody').textContent = kind === 'help' ? t('help.body') : t('credits.body') + '\n\n' + t('credits.films') + '\n' + CATALOG.map((f) => `• ${f.title} (${f.year}), ${f.by}, ${f.lic}`).join('\n') + '\n\n' + t('credits.people'); $('#info').hidden = false; this.hooks.onModal(true); }
  openPause() { $('#pause').hidden = false; this.hooks.onModal(true); this.hooks.onPause && this.hooks.onPause(true); }
  closeModal(sel) { $(sel).hidden = true; this.hooks.onModal(this.modalOpen()); }
  askTutorial() { $('#tutAsk').hidden = false; this.hooks.onModal(true); }
  bind() {
    const tap = (sel, fn) => $(sel).addEventListener('click', (e) => { e.stopPropagation(); this.sound.unlock(); fn(e); });
    tap('#mnStory', () => { this.sound.click(); this.hooks.onPlay('story'); }); tap('#mnQuick', () => { this.sound.click(); this.hooks.onPlay('quick'); }); tap('#mnCont', () => { this.sound.click(); this.hooks.onPlay(null); });
    tap('#mnSettings', () => { this.sound.click(); this.openSettings(); }); tap('#mnLang', () => { this.sound.click(); this.openLang(); }); tap('#mnHelp', () => this.openInfo('help')); tap('#mnCredits', () => this.openInfo('credits'));
    tap('#mnTut', () => { this.sound.click(); this.hooks.onTutorial(); });
    tap('#tkOk', () => { this.closeModal('#ticket'); }); tap('#tkJump', () => { $('#ticket').hidden = true; this.hooks.onModal(this.modalOpen()); this.hooks.jumpToSeat(); });
    tap('#ticketChip', () => this.hooks.ticketInfo());
    tap('#bHide', () => { this.sound.click(); this.setHidden(true); }); tap('#bShow', () => { this.sound.click(); this.setHidden(false); });
    tap('#bMenu', () => { this.sound.click(); this.openPause(); }); tap('#bRemote', () => { this.sound.click(); this.hooks.openRemote(); }); tap('#bBell', () => { this.hooks.ringBell(); });
    tap('#psResume', () => { this.closeModal('#pause'); this.hooks.onPause && this.hooks.onPause(false); }); tap('#psSettings', () => { $('#pause').hidden = true; this.openSettings(); this._fromPause = true; }); tap('#psQuit', () => { this.closeModal('#pause'); this.hooks.onQuit(); });
    tap('#setX', () => { this.closeModal('#settings'); if (this._fromPause) { this._fromPause = false; $('#pause').hidden = false; this.hooks.onModal(true); } });
    tap('#infoX', () => this.closeModal('#info'));
    tap('#tutYes', () => { this.closeModal('#tutAsk'); this.hooks.onTutorial(true); }); tap('#tutNo', () => { this.closeModal('#tutAsk'); this.settings.tutorialAsked = true; this.hooks.onSettings(); });
    tap('#tutBtn', () => { this.closeModal('#settings'); this.hooks.onTutorial(); }); tap('#sLayout', () => { this.closeModal('#settings'); this.hooks.editLayout(); });
    for (const b of document.querySelectorAll('#setTabs button')) tap('#setTabs button[data-tab="' + b.dataset.tab + '"]', () => { this.sound.click(); this.setTab(b.dataset.tab); });
    tap('#itemBtn', () => this.hooks.useItem());
    const S = this.settings, live = (id, key, out, f) => $(id).addEventListener('input', (e) => { S[key] = +e.target.value; $(out).textContent = f(S[key]); this.rangeFill(e.target); this.hooks.onSettings(); });
    live('#sSens', 'sensitivity', '#oSens', (x) => x.toFixed(2)); live('#sBright', 'brightness', '#oBright', (x) => x.toFixed(2)); live('#sMaster', 'master', '#oMaster', (x) => Math.round(x * 100)); live('#sFilm', 'film', '#oFilm', (x) => Math.round(x * 100)); live('#sCrowd', 'crowd', '#oCrowd', (x) => Math.round(x * 100)); live('#sHud', 'hudScale', '#oHud', (x) => Math.round(x * 100) + '%');
    for (const [id, key] of [['#sInvert', 'invertY'], ['#sAuto', 'autoRes'], ['#sFps', 'showFps'], ['#sBubbles', 'bubbles'], ['#sVoices', 'voices'], ['#sSubs', 'subtitles'], ['#sLefty', 'lefty'], ['#sSkip', 'skipSeen']]) tap(id, () => { S[key] = !S[key]; this.sound.click(); this.syncSettings(); this.hooks.onSettings(); });
    for (const b of document.querySelectorAll('#sGfx button')) b.addEventListener('click', () => { S.graphics = b.dataset.v; this.sound.click(); this.hooks.onPreset(b.dataset.v); this.syncSettings(); this.hooks.onSettings(true); });
    for (const [key, id] of CHOICES) for (const b of document.querySelectorAll(id + ' button')) b.addEventListener('click', () => { S[key] = b.dataset.v; this.sound.click(); this.syncSettings(); this.hooks.onSettings(true); });
    const p = $('#prompt'); p.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); this.sound.unlock(); this.promptFn && this.promptFn(); });
    for (const m of ['#ticket', '#settings', '#info']) $(m).addEventListener('click', (e) => { if (e.target === $(m)) this.closeModal(m); });
  }
}
