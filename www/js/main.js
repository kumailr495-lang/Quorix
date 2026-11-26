// LUMIERE v9 - boot, the night out, interaction rules and the frame loop (docs/V9-DESIGN.md section 8).
// Flow mode (v8's Story): the taxi drops you at the kerb; the host greets you; the box office sells your ticket (film or your own video,
// format, time, seat, the armrest tablet add-on); popcorn at the counter; the usher checks the ticket at the gate (the gate opens, the
// first time he walks you all the way to your row); up the escalator or the lift, along the dim corridor, in at the top of your hall;
// the countdown, the lights go down, the film. Out at the bottom beside the screen, down the bright spine, back into the lobby.
// Quick play: you start in the lobby with the tablet; sit in any free seat of any hall; order, change the film, swap or jump to a seat.
import * as THREE from 'three';
import { Engine } from './engine.js';
import { Materials, G } from './materials.js';
import { buildWorld } from './world9.js';
import { texturesReady } from './library.js';
import { loadAssets, ASSET_LIST } from './assets.js';
import { loadBakes } from './lightmap.js';
import { loadPeople } from './people.js';
import { Player } from './player.js';
import { Sound9 } from './sound9.js';
import { Voice } from './voice.js';
import { Talk } from './talk.js';
import { UI } from './ui.js';
import { Booking9 } from './booking9.js';
import { Tablet } from './tablet.js';
import { Tutorial } from './tutorial.js';
import { LayoutEditor, applyLayout } from './layoutedit.js';
import { Crowd } from './npc9.js';
import { Shows } from './film9.js';
import { Together } from './mpui.js';
import { Wayfinder } from './wayfind.js';
import { Guide } from './guide.js';
import { Phone } from './phone.js';
import { LobbyLife } from './anim12.js';
import { Credits } from './credits.js';
import { Career, Jobs } from './career.js';
import { Theatres } from './theatres.js';
import { CATALOG } from './films.js';
import { media } from './bridge.js';
import { Input } from './input.js';
import { Director } from './react.js';
import { Intro, ARRIVAL } from './intro9.js';
import { treeFor } from './dialogue9.js';
import { makeHeld, setHeldMaterial } from './held.js';
import { PRICES as MENU_PRICES, menuItem } from './menu.js';
import { Recliner } from './recline.js';
import { cleanTitle } from './films.js';
import { ledWall, showtimes, menuBoard, attraction } from './panels9.js';
import { makeRain } from './rain.js';
import { Traffic } from './traffic.js';
import { ArmTablet } from './armtab.js';
// v12 medium draws reflections in the rooms that live on them only (the street's wet road, the lobby's floor); high, or Reflections: Full, in every room
const heroRefl = (s) => s.reflections !== 'full';   // v14 High too: reflections only where they matter (the wet street, the lobby floor) unless Full
import { loadSettings, saveSettings, presetFor } from './settings.js';
import { setLang, t, pick, fmtTime } from './i18n.js';
import { SPAWN, GATE, LIFT, ESC, COUNTERS, HALL, L1, EXIT_PASSAGES } from './building.js';
import * as BLD from './building.js';
import { SEAT, CLASSES } from './hallmath.js';
const $ = (s) => document.querySelector(s), clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const BITES = { popcorn: 9, drink: 8, coffee: 6, nachos: 7 }, DENS = { off: 'off', few: 'low', normal: 'medium', many: 'high' };
// the bill (v8 feedback: "remove the money" and "make the prices realistic"): Indian multiplex prices, paid by card, never refused
const PRICES = { ...MENU_PRICES, tablet: 99, replay: 0 };   // v14 the menu's prices (menu.js)   // v10: the cafe's board (world9.js cafemenu)
const HOT = /coffee|latte|cappuccino|espresso|hotchoc/;
// v14 the bill is paid in Lumiere Credits (credits.js): one LC buys what one rupee did, a purchase you cannot afford is refused (Quick play:
// everything free, as before); bill.total is still tonight's spending, the wallet's history lists each payment
class Bill {
  constructor(credits) { this.cr = credits; this.P = { replay: 0, sym: 'LC' }; this.unlimited = false; this.reset(); this.onChange = null; }
  reset() { this.lines = []; this.total = 0; this.cash = Infinity; this._emit(); }
  _emit() { this.onChange && this.onChange(this); }
  fmt(n) { return this.cr ? this.cr.fmt(n) : Math.round(n) + ' LC'; }
  ticketPrice(cls) { return (CLASSES[cls] || CLASSES.std).price; }
  itemPrice(kind) { return PRICES[kind] ?? 200; }
  can(n = 0) { return this.unlimited || !this.cr || this.cr.can(n); }
  pay(n, what) { if (this.unlimited || !n) return true; if (this.cr && !this.cr.spend(n, what)) return false; this.lines.push({ what, n }); this.total += n; this._emit(); return true; }
}
async function boot() {
  const settings = loadSettings(), Q = new URLSearchParams(location.search), nav = (navigator.language || 'en').slice(0, 2);
  setLang(settings.lang || (['hi', 'ur', 'es'].includes(nav) ? nav : 'en'));
  const portrait = () => $('#rotate').classList.toggle('need', innerHeight > innerWidth * 1.1); portrait(); addEventListener('resize', portrait);
  // v14 the loader: five pieces of key art from the game drift and crossfade every 6 s, the step being built and the percentage over a
  // progress line, a tip every 6 s; it all stops when the loader fades
  const LD_STEP = { street: 'load.street', lobby: 'load.lobby', wc: 'load.restrooms', corridor: 'load.gallery', spine: 'load.gallery', doors: 'load.people', reflections: 'load.bake', ready: 'load.ready' };
  // v14c painted key art (tools/art), each with its title; the next picture is loaded before it fades in (no crossfade into black)
  const ldArt = $('#ldArt'), ldTips = [].concat(t('tips') || []), ldCaps = [].concat(t('load.art') || []), ldCap = $('#ldCap'), LD_N = 4; let ldOn = 0;
  const ldShow = (k) => { if (!ldArt || !document.body.contains(ldArt)) return; let i = ldArt.children[k]; if (!i) { i = document.createElement('i'); i.style.backgroundImage = `url(load/${k + 1}.jpg)`; ldArt.appendChild(i); }
    [...ldArt.children].forEach((e, j) => e.classList.toggle('on', j === k)); ldOn = k;
    if (ldCap) { ldCap.classList.add('out'); setTimeout(() => { ldCap.textContent = ldCaps[k] || ''; ldCap.classList.remove('out'); }, 900); } };   // the title turns half way through the picture's crossfade
  if (ldCap) ldCap.textContent = ldCaps[0] || '';
  const ldTimer = setInterval(() => {
    const k = (ldOn + 1) % LD_N, img = new Image(); img.onload = () => ldShow(k); img.src = `load/${k + 1}.jpg`;
    const tp = $('#ldTip'); if (tp && ldTips.length) { tp.classList.add('out'); setTimeout(() => { tp.textContent = ldTips[Math.floor(Math.random() * ldTips.length)]; tp.classList.remove('out'); }, 500); } }, 7000);
  { const tp = $('#ldTip'); if (tp && ldTips.length) tp.textContent = ldTips[Math.floor(Math.random() * ldTips.length)]; }
  const prog = (p, key) => { $('#ldFill').style.width = (p * 100).toFixed(0) + '%'; const pc = $('#ldPct'); if (pc) pc.textContent = Math.round(p * 100) + '%';
    const st = $('#ldStep'), k = key && (LD_STEP[key] || (key.startsWith('hall') ? 'load.halls' : null)); if (st && k) st.textContent = t(k, { room: key }); if (p >= 1) clearInterval(ldTimer); };
  try { await Promise.race([Promise.all([document.fonts.load('600 40px Inter'), document.fonts.load('400 14px Inter')]), new Promise((r) => setTimeout(r, 2500))]); } catch (e) { /* fonts later */ }
  const engine = new Engine($('#gl'), settings), lowG = settings.graphics === 'low';
  const mats = new Materials({ renderer: engine.renderer, normalMaps: !lowG, reflections: !lowG && settings.reflections !== 'off', heroOnly: heroRefl(settings), texSize: lowG ? 256 : 512, macro: !lowG, detile: settings.graphics === 'high' }); engine.applySettings(settings);
  // v9: every room is a baked model; its light maps are its look on every device (the vertex-light fallback stays for ?nobake=1 only)
  mats.lightMaps = !Q.get('nobake');
  const t0 = performance.now(); let done = 0; const tick = () => prog(0.05 + 0.4 * (++done / 3));
  await Promise.all([loadAssets(ASSET_LIST).then(tick), loadBakes().then(tick), loadPeople().then(tick).catch((e) => console.warn('[lumiere] people models failed', e))]);
  const world = await buildWorld(engine, mats, (p, key) => prog(0.45 + 0.5 * p, key)); await texturesReady(); prog(0.97);
  const sound = new Sound9(); sound.surround = !!settings.surround; sound.setVolumes({ master: settings.master, film: settings.film, crowd: settings.crowd });
  const credits = new Credits(), bill = new Bill(credits);
  let ticket = null, room = 'street', mode = 'menu', game = null, modal = false, held = null, visits = 0, sitRelease = null, fading = false;
  const player = new Player(engine, world, settings); player.attach($('#gl'), $('#stick'), $('#knob'), $('#sprint')); player.place(SPAWN.quick.x, SPAWN.quick.z, SPAWN.quick.yaw, 0, 0);
  player.onStep = (s) => sound.step(s, /hall|corridor/.test(room));
  const dist = (n) => Math.hypot(n.x - player.x, n.z - player.z), seatOf = (tk) => { const h = tk && world.hallById(tk.hall); return h ? h.seats.find((s) => s.id === tk.seat) : null; };
  // ---------- people and voices: only lines near you are heard (v8: "talking from far away") ----------
  const voice = new Voice(sound, settings); voice.voiceOf = (a) => a.voice || (a.rec && a.rec.kind === 'f' ? 'guestF' : 'guestM'); voice.rate = (a) => (a.role === 'guest' || a.role === 'aud' ? 0.96 + ((a.rec && a.rec.seed) % 9) / 100 : 1);
  // a guest's second voice falls back to the first for lines recorded with one guest voice per gender (guest.*, aud.*)
  { const sp = voice.speak.bind(voice), vo = voice.voiceOf; voice.voiceOf = (a) => { const v = vo(a), L = voice._line; if (!/2$/.test(v) || !L || !voice.man) return v; const id = `${v}/${L.key}.${L.i}${L.j != null ? '.' + L.j : ''}`; return voice.man.c[id] ? v : v.slice(0, -1); };
    voice.speak = (a, line, o = {}) => { if (!o.full && a && Math.hypot(a.x - player.x, a.z - player.z) > 7) return Promise.resolve(0); voice._line = line; return sp(a, line, o); }; }
  voice.prepare();
  const speak = (n, ln) => { if (typeof ln === 'object' && ln.key) voice.speak(n, ln).then((ms) => { if (!ms && dist(n) < 5) sound.blip((ln.text || '').length, 1 - dist(n) / 5); }); };
  const crowd = new Crowd(world, mats, engine, {
    bubble: (n, ln, dur) => { if (dist(n) > 9) return; if (settings.bubbles) talk.bubble(n, ln, dur); speak(n, ln); },
    crowdSound: (hallId, type, n, k, x, z) => { const h = world.hallById(hallId); if (!h || !world.vis.has(h.key)) return; sound.crowd(type, n, room === h.key ? k : k * 0.3, x, z); },
    guideDone: () => { ui.toast(t('toast9.atRow', { seat: ticket ? ticket.seat : '' }), 3200); tut.event('escorted'); },
  });
  crowd.init(); crowd.setDensity(DENS[settings.npcs] || settings.npcs || 'medium'); player.onBump = (a) => crowd.bumped(a);
  // ---------- shows, director, effects on the best scenes ----------
  const director = new Director((id, ev) => { crowd.onFilmEvent(id, ev); bigScene(id, ev); });
  const shows = new Shows(world, sound, crowd, director, engine, {
    onBegin: (id) => { if (ticket && ticket.hall === id) ui.toast(room === ticket.hallKey ? t('toast.lightsDown') : t('toast.starting', { screen: ticket.hallName }), 3200); },
    onEnd: (id, applause) => { if (ticket && ticket.hall === id) { { const st = shows.get(id), f = st && st.src; if (applause && f && f.kind === 'film' && player.seated) { career.event('filmEnd'); const fid = f.filmId || f.title; if (!credits.filmPaid(fid)) { credits.markFilm(fid); coin(credits.earn(150, 'filmEnd:' + fid)); } } }
      if (applause) { ui.toast(t('toast.end'), 3600); stubs.add({ title: ticket.title, hall: ticket.hallName.replace('LUMIERE ', ''), seat: ticket.seat, date: new Date().toLocaleDateString() }); setTimeout(() => ui.toast(t('toast9.stub'), 3200), 4000); } ticket.watched = true; } },
    onError: (k) => ui.toast(t(k === 'film' ? 'toast9.filmError' : 'toast.videoError'), 5200, 'error'), onNoAudio: () => ui.toast(t('toast14.noAudio'), 7000, 'error'),
  });
  // ---------- conversation, interface, booking, tablet, tutorial, layout ----------
  const talk = new Talk(sound, { action: (a, npc, tk) => action(a, npc, tk), distance: dist, speak: (n, ln, o) => voice.speak(n, ln, o), speaking: (n) => voice.speaking(n),
    closed: (npc) => { crowd.endTalk(npc); if (npc && npc.role === 'server' && npc.state === 'serving' && !tablet.isOpen()) crowd.serverLeave(); onModal(); } }, settings);
  function onModal(m) { modal = !!m || talk.open || ui.modalOpen(); player.locked = modal || mode !== 'play' || intro.active; }
  const ui = new UI(world, shows, sound, settings, {
    onModal, ticketInfo: () => ticket && ui.showTicket(ticketView(ticket), game === 'quick'), jumpToSeat: () => jumpToSeat(), useItem: () => useItem(),
    onSettings: (gfx) => applySettings(gfx), onPreset: (g) => Object.assign(settings, presetFor(g)),
    onPlay: (m) => enterPlay(m === 'story' ? 'flow' : m), stubs: () => stubs.get(), onQuit: () => toMenu(), onPause: () => {}, onHide: () => {}, onLangPicked: () => voice.prepare(), onLangChanged: () => { voice.stopAll(); voice.prepare(); together.text(); },
    openRemote: () => tablet.open('home'), ringBell: () => ringBell(), onTutorial: (fromAsk) => startTutorial(fromAsk), editLayout: () => layoutEd.open(),
  });
  // v9.3 playing together (mp.js, mpui.js): a room code, your look, the other players in the cinema, the host's shows on every phone
  const together = new Together({ liftPress: (b) => world.lift.press(b), tabOpen: () => tablet.isOpen(), ArmTablet, mySpot: () => world.sitSpots.findIndex((q) => q.taken === 'player'), held: () => (held ? held.id || held.kind || null : null), heldMat: () => itemMat, world, crowd, shows, player, engine, settings, sound, save: () => saveSettings(settings), toast: (m, ms) => ui.toast(m, ms), onModal: (m) => onModal(m),
    enterPlay: () => enterPlay('quick'), room: () => room, ev: (n) => career.event(n), owns: (id) => credits.owns(id), mySeat: () => (player.seated && room && room.startsWith('hall') ? world.hallByKey(room).seats.find((q) => q.npc === 'player') : null),
    order: (seat) => crowd.callServer(seat, (npc) => { npc.gesture('give', 1.2); npc.say(pick('srv.hand')); setTimeout(() => crowd.serverLeave(), 2600); }) });
  // the film's controls (tablet remote, keys): the host's in a room, and the host's reach every phone
  // touch, keyboard + mouse, controller, phone VR: whatever you last used (input.js)
  // v11 the lift's buttons are in the world (lift9.js): the one under the crosshair is aimed at (aimBtn); E, A or a click press it, and a tap
  // presses the button under your finger. Every other action stays on the plate.
  let aimBtn = null;
  const input = new Input({ player, engine, canvas: engine.renderer.domElement, action: () => (ui.promptFn && ui.promptFn()), back: () => history.back(), tablet: () => tablet.open('remote'), bell: () => ringBell(),
    pause: () => { if (mode !== 'play') return; if ($('#pause').hidden) ui.openPause(); else ui.closeModal('#pause'); }, chat: () => together.active && together.chatBox(), modal: () => modal || mode !== 'play' });
  input.setVR(!!settings.vr);
  { const ctl0 = shows.control.bind(shows); shows.control = (cmd, arg) => { if (!together.canControl() && cmd !== 'speed') { ui.toast(t('mp.hostOnly'), 2200); return false; } const r = ctl0(cmd, arg); if (r) together.onControl(cmd, arg); return r; }; }
  const booking = new Booking9(world, shows, sound, bill, { onModal, toast: (m, ms, k) => ui.toast(m, ms, k), onTicket: (tk) => bought(tk), pickOwn: () => pickOwn(), useLink: (u) => useLink(u) });
  // a few things nobody asked for: rain on the street (wet paving, the drops stop under the canopy), your film on the marquee once you
  // have a ticket, and a stub for every film you watch to the end (Settings, More keeps your last nights)
  const rain = makeRain(world.rooms.street, { count: lowG ? 1500 : 3500 }); rain.mesh.material.uniforms.uBoxMin.value.z = 25.4; world.rooms.street.U.uWet.value = 1;
  const marq = attraction(world.panels.attraction_f, shows), marquee = (title) => marq.own(title);
  let snapCb = null;   // v13 a photo for the phone's camera: the frame after the next render
  const stubs = { get() { try { return JSON.parse(localStorage.getItem('lumiere.stubs') || '[]'); } catch (e) { return []; } }, add(x) { try { const a = this.get(); a.unshift(x); localStorage.setItem('lumiere.stubs', JSON.stringify(a.slice(0, 20))); } catch (e) { /* private mode */ } } };
  const led = ledWall(world.panels.ledwall, shows, t, fmtTime), board = showtimes(world.panels.showtimes, shows, t, fmtTime); menuBoard(world.panels.menu, t, (n) => n + ' LC', PRICES);
  const tablet = new Tablet(shows, sound, bill, settings, { onModal, toast: (m, ms, k) => ui.toast(m, ms, k), pickOwn: () => pickOwn(), playFilm: (o) => remotePlay(o), handBack: () => handBack(), quick: () => game === 'quick' || (ticket && ticket.tablet),
    order: (k) => orderToSeat(k), canBin: () => !!held, bin: () => binItem() });
  tablet.onLocal = (url, name) => { shows.loadLocal(url, cleanTitle(name)); ui.toast(t('toast.ownReady'), 2400); if (booking.isOpen()) booking.build(); };
  const way = new Wayfinder(world, crowd); let wayT = 0; const guide = new Guide(engine.scene, world);   // v12b the way on the floor and a light at the goal
  // v13 the phone (phone.js): your ticket, the map, your tab, a camera, your photos and stubs, friends, settings; it never stops the game
  const theatres = new Theatres(world); theatres.applyAll();   // v14 My Theatre: each hall's saved look
  const phone = new Phone({ ticket: () => ticket, bill, credits, career: () => career, jobs: () => jobs, theatres: () => theatres, halls: () => world.halls.map((h) => ({ id: h.id, name: h.name.replace('LUMIERE ', '') })), stubs: () => stubs.get(), player, room: () => room, snap: (cb) => { snapCb = (u) => { cb(u); if (u) career.event('photo'); }; },
    guide: () => { settings.goal = true; saveSettings(settings); }, showTicket: () => ticket && ui.showTicket(ticketView(ticket), game === 'quick'),
    together: () => together.open(), settings: () => ui.openSettings(), sound, toast: (m, ms, k) => ui.toast(m, ms, k), native: !!window.LumiereMedia,
   
    jump: () => (game === 'quick' && mode === 'play' ? { halls: world.halls.map((h) => ({ key: h.key, name: h.name.replace('LUMIERE ', '') })), go: (k) => { const h = world.hallByKey(k), best = Math.round(h.cfg.rows.length * 0.58), s = h.seats.filter((q) => !q.taken && !q.npc).sort((p, q) => (Math.abs(p.row - best) * 2 + Math.abs(p.a) * 0.8) - (Math.abs(q.row - best) * 2 + Math.abs(q.a) * 0.8))[0]; if (s) { if (player.seated) stand(); setTimeout(() => jumpToSeat(s), 350); } } } : null),
    upgrades: () => (game === 'flow' && ticket && ticket.seat ? upgrades() : null), renderer: engine.renderer });   // inside the Android app a photo cannot be saved as a file (no picture bridge yet)
  $('#bPhone').addEventListener('click', (e) => { e.stopPropagation(); if (mode === 'play') phone.toggle(); });
  addEventListener('keydown', (e) => { const tag = (e.target && e.target.tagName) || ''; if (e.code === 'KeyF' && mode === 'play' && tag !== 'INPUT' && tag !== 'TEXTAREA') phone.toggle(); });
  const life = new LobbyLife(world, engine);   // v12c the lobby's life: popcorn popping, the fountain's water, steam at the bar, the marquee's bulbs, the boards' sheen
  const layoutEd = new LayoutEditor(settings, sound, { onModal, save: () => { saveSettings(settings); applyLayout(settings); } });
  const tut = new Tutorial(settings, sound, { save: () => saveSettings(settings), state: () => ({ ticket, held, seated: !!player.seated, room, game }) });
  // v14 work, missions and daily tasks (career.js); the game's events reach them through the tutorial's own event hook
  const coin = (n) => { if (n > 0) { ui.toast(t('lc.earned', { n }), 1800); sound.pay && sound.pay(); } };
  const career = new Career(credits, { toast: (m, ms) => ui.toast(m, ms), coin });
  { const te = tut.event.bind(tut); tut.event = (n, d) => { te(n, d); if (['ticket', 'item', 'seated', 'bell', 'binned'].includes(n)) career.event(n); }; }
  const jobs = new Jobs({ credits, career, sound, coin, world, toast: (m, ms) => ui.toast(m, ms), onModal: (m) => onModal(m), nearBin: () => nearBin(), hallState: (id) => { const st = shows.get(id); return st ? st.state : 'idle'; },
    films: () => CATALOG.slice(0, 8).map((f) => f.short || f.title), staffPass: (on) => { world.gate.staff = !!on; } });   // v14b a shift opens the gate for you (this used to overwrite the gate's pass())
  const intro = new Intro(engine, world, mats, sound, { fade: (a, d) => ui.fade(a, d), done: () => arrived(), driver: (k, cx, cz) => { const ln = pick(k); if (cx != null) { driverAgent.x = cx; driverAgent.z = cz; } if (ln) { talk.bubble(driverAgent, ln, 2.6); voice.speak(driverAgent, ln, { full: true }); } } });
  const driverAgent = { x: 1.6, y: 0, z: 27.9, name: t('role9.driver'), role: 'driver', voice: 'driver', alive: true, ch: { s: { sit: 1 }, scale: 1 }, group: { visible: true }, crowd };
  // v12 the street's traffic: the taxi leaves after dropping you (intro9.js), saloons pass now and then (traffic.js); both are solid to you
  const traffic = new Traffic(world, mats, sound, world.rooms.street && world.rooms.street.x && world.rooms.street.x.traffic); intro.traffic = traffic;
  // v14 (the user, 11-21: "the armrest tablet ... appears out of seat"): in your seat the tablet rises out of the armrest on its arm first
  const armTab = new ArmTablet(world);
  { const open0 = tablet.open.bind(tablet), close0 = tablet.close.bind(tablet);
    tablet.open = (tab, o = {}) => { const s = player.seated && ticket ? seatOf(ticket) : null, h = s && world.hallById(ticket.hall);
      if (s && h && room === h.key && !o.server && !armTab.group.visible) { sound.tablet && sound.tablet(true); armTab.show(h, s, () => open0(tab, o)); return; } open0(tab, o); };
    tablet.close = () => { close0(); armTab.hide(); }; }
  bill.onChange = () => ui.setWallet(game === 'flow' ? credits.fmt(credits.bal) : null); credits.onChange(() => bill.onChange());   // v14 the wallet chip: your Lumiere Credits
  function applySettings(gfx) {
    saveSettings(settings); engine.applySettings(settings); { const lo = settings.graphics === 'low'; mats.setQuality({ normalMaps: !lo, macro: settings.graphics === 'high', detile: settings.graphics === 'high', texSize: lo ? 256 : 512 }); }   // v14b macro tone only on High   // v13 the preset at once, as at boot
    { const on = settings.reflections !== 'off' && settings.graphics !== 'low'; mats.setReflections(on, heroRefl(settings)); if (on && world.captureReflections) world.captureReflections(); } crowd.setDensity(DENS[settings.npcs] || 'medium');
    if (settings.npcs === 'off') for (const h of world.halls) crowd.clearAudience(h.id);   // off means an empty hall, now
    sound.setVolumes({ master: settings.master, film: settings.film, crowd: settings.crowd }); sound.surround = !!settings.surround; if (input.vr !== !!settings.vr) input.setVR(!!settings.vr); talk.setOptions(settings); voice.setOptions(settings); applyLayout(settings);
  }
  applyLayout(settings);
  { const oi = ui.openInfo.bind(ui); ui.openInfo = (kind) => { oi(kind); const M = media; if (kind !== 'help' || !M) return; try { const I = JSON.parse(M.info() || '{}'), C = JSON.parse(M.codecs() || '[]'), hw = C.filter((c) => c.hw).map((c) => c.type.replace('video/', '')).filter((v, i, a) => a.indexOf(v) === i);
    $('#infoBody').textContent += `\n\n${t('help9.diag')}\n${I.model || ''} · Android ${I.android || ''} · ${I.webview || ''}\n${t('help9.server')}: ${I.server || ''}\n${t('help9.decoders')}: ${hw.join(', ')}\n${engine.stats.fps.toFixed(0)} fps · ${engine.stats.scale.toFixed(2)}x · ${engine.renderer.info.render.calls} dc`; } catch (e) { /* older wrapper */ } }; }
  // ---------- your own video and links ----------
  function pickOwn() { if (media) { tablet.open('mine'); return; } $('#file').click(); }
  $('#file').addEventListener('change', (e) => { const f = e.target.files && e.target.files[0]; if (!f) return; shows.loadFile(f, cleanTitle(f.name || 'Video')); ui.toast(t('toast.ownReady'), 2400); if (booking.isOpen()) booking.build(); tablet.refresh(); e.target.value = ''; });
  function useLink(u) { const own = shows.loadURL(u, cleanTitle(decodeURIComponent(u.split('/').pop().split('?')[0]) || 'Link')); ui.toast(t(own.kind === 'youtube' ? 'toast9.youtube' : 'toast.ownReady'), 2600); booking.build(); }
  // ---------- conversations ----------
  function action(a, npc, tk) {
    const [verb, arg] = a.split(':');
    if (verb === 'book' || verb === 'bookOwn') { setTimeout(() => { booking.open({ quick: game === 'quick', own: verb === 'bookOwn' }); if (verb === 'bookOwn') pickOwn(); }, 60); return false; }
    if (verb === 'buy') { if (held) { tk.line(pick('bar.bye') || t('ven.full'), [['opt.thanks', 'end']]); ui.toast(t('toast9.handsFull'), 2400); return true; }
      if (!bill.pay(bill.itemPrice(arg), arg)) { ui.toast(t('lc.short', { price: bill.fmt(bill.itemPrice(arg)) }), 2800, 'error'); sound.liftDeny && sound.liftDeny(); return true; } if (game === 'flow') sound.pay();
      if (npc.role === 'server') { npc.say(pick('srv.order')); setTimeout(() => { npc.gesture('give', 1.2); crowd.handProp(npc, menuItem(arg).id); }, 600); setTimeout(() => { crowd.handProp(npc, null); takeItem(arg); npc.say(pick('srv.hand')); }, 1500); tk.line(pick('srv.back'), [['opt9.order', 'menu'], ['opt9.nothing', 'act:serverBye']]); return true; }
      const cafe = npc.role === 'cafe', mi = menuItem(arg); npc.gesture(mi.use !== 'eat' ? 'pour' : 'scoop', cafe ? 4.2 : 2.2); if (cafe && sound.espresso && mi.use === 'hot') { sound.espresso(npc); life.steam(performance.now()); } else sound.pour();
      setTimeout(() => { npc.gesture('give', 1.2); crowd.handProp(npc, mi.id); npc.say(pick(cafe ? 'cafe.ready' : 'bar.ready')); }, cafe ? 4300 : 2300); setTimeout(() => { crowd.handProp(npc, null); takeItem(arg); }, (cafe ? 4300 : 2300) + 900); return false; }
    if (verb === 'ticket') { if (!ticket) { tk.line(pick('ush.noTicket'), [['opt.thanks', 'end']]); return true; } checkTicket(npc); return false; }
    if (verb === 'escort') { escort(npc); return false; }
    if (verb === 'ownWay') { world.gate.pass(); npc.say(pick('ush.enjoy')); highlightSeat(); return false; }
    if (verb === 'tablet') { npc.gesture('give', 1.2); npc.say(pick('srv.tablet')); setTimeout(() => tablet.open('remote', { server: true }), 700); return false; }
    if (verb === 'trash') { if (held && held.left <= 0) { binItem(); npc.say(pick('srv.trash')); } else npc.say(pick('srv.bye')); return false; }
    if (verb === 'serverBye') { npc.say(pick('srv.bye')); setTimeout(() => crowd.serverLeave(), 600); return false; }
    return false;
  }
  function startTalk(npc) { crowd.startTalk(npc); talk.start(npc, treeFor(npc, { ticket, game, visits, serverBack: npc.role === 'server' && npc._served })); onModal(true); tut.event('talked');
    if (npc.role === 'guest' && npc.temper === 'curt') setTimeout(() => { if (talk.open && talk.npc === npc) talk.close(); }, 2800); }   // a curt stranger says one thing and turns away
  // the usher reads your ticket and tears the stub; the gate opens. The first time he walks you in; later he asks.
  function checkTicket(npc) {
    ticket.shown = true; npc.gesture('read', 1.6); crowd.handProp(npc, 'ticket'); setTimeout(() => crowd.handProp(npc, null), 3500); ui.ticketHandoff && ui.ticketHandoff(ticket); sound.ticket();
    setTimeout(() => { npc.say(pick('ush.check.' + ticket.hall)); npc.gesture('give', 1.0); }, 1500);
    setTimeout(() => { npc.say(pick('ush.tear')); ticket.checked = true; tut.event('showed'); world.gate.pass(12000); if (!settings.seen || !settings.seen.escort) escort(npc); else ui.toast(t('toast9.gateOpen'), 2600); }, 3400);
  }
  function escort(npc) { const h = world.hallById(ticket.hall), s = seatOf(ticket); world.gate.pass(20000); if (crowd.guide(npc, h, s, player)) { npc.say(pick('ush.lead')); ui.toast(t('toast.followUsher', { name: npc.nameKey && t(npc.nameKey) !== npc.nameKey ? t(npc.nameKey) : npc.name }), 2600); settings.seen = { ...(settings.seen || {}), escort: true }; saveSettings(settings); } }
  // "locate my seat" (no red arrow, v8 feedback): your seat's reading light glows for a few seconds
  let glowSeat = null, glowT = 0; function highlightSeat() { const s = seatOf(ticket); if (!s) return; glowSeat = s; glowT = 10; seatGlow.position.set(s.x, s.y + 0.02, s.z); seatGlow.visible = true;
    const rm = world.rooms[s.hallKey]; if (rm && seatGlow.parent !== rm.group) { if (seatGlow.parent) seatGlow.parent.remove(seatGlow); rm.group.add(seatGlow); } }   // v12b: drawn with its hall only (in the scene's root it shone through the hall's walls)
  const seatGlow = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.42, 40), new THREE.MeshBasicMaterial({ color: 0xe3b25f, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); seatGlow.rotation.x = -Math.PI / 2; seatGlow.visible = false; engine.scene.add(seatGlow);
  // v14 (the user, 11-20: "I don't know where my seat is"): in your hall, until you sit, your seat keeps its glow and a pin floats over it
  // with its name (G12) and an arrow; both are drawn with the hall, so walls hide them
  const seatPin = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 160; const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, toneMapped: false }));
    sp.scale.set(0.62, 0.39, 1); sp.visible = false; sp.userData = { c, id: '' }; engine.scene.add(sp); return sp; })();
  function pinFor(s) { const u = seatPin.userData; if (u.id !== s.id) { u.id = s.id; const g = u.c.getContext('2d'); g.clearRect(0, 0, 256, 160); g.fillStyle = 'rgba(14,10,8,.82)'; g.beginPath(); g.roundRect(28, 8, 200, 92, 20); g.fill();
      g.strokeStyle = '#e3b25f'; g.lineWidth = 5; g.stroke(); g.fillStyle = '#f6ecd8'; g.font = '700 60px Inter, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s.id, 128, 56);
      g.fillStyle = '#e3b25f'; g.beginPath(); g.moveTo(104, 104); g.lineTo(152, 104); g.lineTo(128, 150); g.closePath(); g.fill(); seatPin.material.map.needsUpdate = true; }
    const rm = world.rooms[s.hallKey]; if (rm && seatPin.parent !== rm.group) { if (seatPin.parent) seatPin.parent.remove(seatPin); rm.group.add(seatPin); } }
  // ---------- what you hold ----------
  const itemU = { uAmb: { value: new THREE.Color(0.5, 0.5, 0.5) }, uKey: { value: new THREE.Color(0.4, 0.4, 0.4) }, uKeyDir: { value: new THREE.Vector3(-0.35, 0.8, 0.45).normalize() }, uScreenL: { value: new THREE.Color(0, 0, 0) } }, itemLight = { amb: itemU.uAmb.value, key: itemU.uKey.value, dir: itemU.uKeyDir.value, screen: itemU.uScreenL.value };
  const itemMat = mats.propMat(itemU); let itemMesh = null, itemAnim = 0, itemIn = 0, lightT = 0;
  // v12 your own recliner (recline.js): it reclines for real, and its consoles' cup holders take what you hold
  const recliner = new Recliner(world, sound, itemMat);
  const giveBack = (st) => { held = st; if (itemMesh) engine.vm.remove(itemMesh); itemMesh = makeHeld(st); setHeldMaterial(itemMesh, itemMat); itemMesh.userData.setLevel(st.left / st.max); engine.vm.add(itemMesh); itemIn = 0; ui.setItem(st.kind, st.left, st.max); };
  const cupAction = () => { if (held) { if (recliner.put(held)) { engine.vm.remove(itemMesh); itemMesh = null; held = null; ui.setItem(null); } else ui.toast(t('toast.cupFull'), 2000); } else { const st = recliner.take(); if (st) giveBack(st); } };
  for (const [sel, fn] of [['#bRecline', () => recliner.toggle()], ['#bCup', cupAction]]) { const el = document.querySelector(sel); if (el) el.addEventListener('click', (e) => { e.stopPropagation(); sound.unlock(); fn(); }); }
  function takeItem(kind) {
    // v14 every menu item is its own thing (menu.js, held.js makeFood): its model, its bites or sips; a combo's drink goes to a cup holder
    const it = menuItem(kind); held = { kind: it.use, id: it.id, left: it.bites, max: it.bites, name: it.id };
    if (itemMesh) engine.vm.remove(itemMesh); itemMesh = makeHeld(held); setHeldMaterial(itemMesh, itemMat); itemMesh.userData.setLevel(1); engine.vm.add(itemMesh); itemIn = 0;
    ui.setItem(it.use, held.left, held.max); sound.pop(); ui.toast(t('toast.gotPopcorn', { item: t('food.' + it.id) }), 2400); tut.event('item');
    if (it.also && recliner.cur) { const a2 = menuItem(it.also); if (!recliner.put({ kind: a2.use, id: a2.id, left: a2.bites, max: a2.bites, name: a2.id })) ui.toast(t('toast.cupFull'), 2000); }
  }
  function useItem() { if (!held || itemAnim > 0) return; if (held.left <= 0) { ui.toast(t('toast.findBin'), 2400); return; } itemAnim = 1; held.left--; if (held.kind === 'eat' || held.kind === 'popcorn') sound.crunch(); else sound.sip(held.left === 0); itemMesh.userData.setLevel(held.left / held.max); ui.setItem(held.kind, held.left, held.max); }
  function binItem() { if (!held) return; sound.bin(); engine.vm.remove(itemMesh); itemMesh = null; held = null; ui.setItem(null); ui.toast(t('toast.binned'), 1800); tut.event('binned'); }
  const nearBin = () => world.bins.find((b) => Math.hypot(b.x - player.x, b.z - player.z) < 1.3 && Math.abs((b.y || 0) - player.y) < 1);
  // ---------- restrooms ----------
  let washed = false;
  function useFixture(u) {
    const hold = (ms, f) => { player.locked = true; setTimeout(() => { onModal(); f && f(); }, ms); };
    if (u.kind === 'basin') { sound.water(2.4); hold(2600, () => { washed = true; ui.toast(t('toast.washed'), 2000); }); return; }
    if (u.kind === 'dryer') { sound.dryer(2.2); hold(2500, () => { ui.toast(t(washed ? 'toast.dried' : 'toast.dryFirst'), 2000); washed = false; }); return; }
    player.locked = true; ui.fade(1, 0.4); setTimeout(() => sound.lock(), 450); setTimeout(() => sound.flush(), 1300); career.event('flush');
    setTimeout(() => { sound.lock(); ui.fade(0, 0.6); onModal(); ui.toast(t('toast.fresh'), 2000); }, 3200);
  }
  // ---------- tickets ----------
  const ticketView = (tk) => ({ ...tk, hall: String(HALL[tk.hall].no) });
  function bought(tk) {
    const prev = seatOf(ticket); if (prev) { prev.player = false; prev.taken = false; }
    ticket = tk; const s = seatOf(tk); s.player = true; s.taken = true;
    if (together.canControl()) { shows.book(tk.hall, tk.src, tk.delay * 1000, tk.seat); together.onBooked(tk.hall); } else ui.toast(t('mp.hostStarts'), 3000); marquee(tk.title);
    ui.showTicket(ticketView(tk), game === 'quick'); sound.ticket(); tut.event('ticket');
    if (game === 'flow') { const b = crowd.staff.box1; if (b) setTimeout(() => b.say(pick('box.ticket')), 500); }
  }
  // v14 (the user, 11-20: "the exit thing is just tping me outside"): no fades and no jumps. Leave = stand up; the guide arrow (wayfind.js
  // goal.exit) points to the exit door beside the screen, the door swings open, the passage steps down to the spine and the spine walks
  // you back to the lobby (its travelator carries you), as the audience does
  // v14b the way out (the user, 11-26: "make it faster much more fun ... people cant go back through exit"): out through a hall's exit door
  // you are in a dark light-lock passage; a few steps in, the lights flash past and you step out by the lobby at the end of the exit way.
  // The exit doors open only from the halls, so nobody comes back in that way; the entrances work both ways
  let lockT = 0, locking = false;
  function exitLock(dt, r) {
    if (mode !== 'play' || locking || r !== 'spine' || player.seated || intro.active) { lockT = 0; return; }
    const inPass = EXIT_PASSAGES.some((p) => player.x > p.x0 && player.x < p.x1 && player.z > p.z0 && player.z < p.z1); lockT = inPass ? lockT + dt : 0;
    if (lockT < 0.7) return; locking = true; lockT = 0; sound.door && sound.door(true, 0.5); ui.fade(1, 0.28);
    setTimeout(() => { player.place(0, -16.8, Math.PI, 0, 0); ui.fade(0, 0.6); locking = false; tut.event && tut.event('exited'); }, 320); }
  function leaveHall() { if (player.seated) stand(); else ui.toast(t('goal.exit'), 2400); }
  function fadeTo(dur, cb) { if (fading) return; fading = true; ui.fade(1, dur); setTimeout(() => { try { cb(); } finally { setTimeout(() => { ui.fade(0, 0.7); fading = false; }, 200); } }, dur * 1000 + 40); }
  // v9.1b: sitting down, you look at the middle of the picture (the IMAX-shaped MAX picture rises 18 m: level eyes saw its lower half)
  const seatPose = (s) => { const H = BLD.HALL[s.hall], eye = s.y + SEAT[s.kind].eye, pitch = H ? Math.max(0, Math.min(0.5, 0.85 * Math.atan2(H.y0 + H.centreY - eye, Math.max(3, s.d)))) : 0.02;
    return { x: s.x - Math.sin(s.yaw) * 0.04, y: eye, z: s.z - Math.cos(s.yaw) * 0.04, yaw: s.yaw, pitch }; };
  function claim(s) { if (sitRelease) sitRelease(); s.npc = s.npc || 'player'; recliner.attach(s.hallKey && world.hallByKey(s.hallKey), s);
    sitRelease = () => { const back = recliner.detach(!held); if (back) giveBack(back); if (s.npc === 'player') s.npc = null; sitRelease = null; }; }
  // v14b the Ticket app's upgrades: the armrest tablet for this show, or a better free seat in the same hall for the difference in price
  function upgrades() {
    const h = world.hallByKey(ticket.hallKey), cur = seatOf(ticket), price = (s) => (CLASSES[s.cls] || { price: 0 }).price, mine = cur ? price(cur) : 0;
    const better = h ? [...new Map(h.seats.filter((s) => !s.taken && !s.npc && price(s) > mine).sort((a, b) => price(a) - price(b) || Math.abs(a.a) - Math.abs(b.a)).map((s) => [s.cls, s])).values()].slice(0, 3) : [];
    return { fmt: (n) => bill.fmt(n), tabletPrice: PRICES.tablet,
      buyTablet: () => { if (!bill.pay(PRICES.tablet, 'tablet')) { ui.toast(t('lc.short', { price: bill.fmt(PRICES.tablet) }), 2800, 'error'); return false; } sound.pay(); ticket.tablet = true; ui.toast(t('up.tabletOk'), 2600); return true; },
      seats: better.map((s) => ({ id: s.id, label: (CLASSES[s.cls] || {}).label || s.cls, extra: price(s) - mine, s })),
      moveTo: (o) => { if (!bill.pay(o.extra, 'ticket')) { ui.toast(t('lc.short', { price: bill.fmt(o.extra) }), 2800, 'error'); return false; } sound.pay();
        if (cur) { cur.player = false; cur.taken = false; if (cur.npc === 'player') cur.npc = null; } const s = o.s; s.player = true; s.taken = true; ticket.seat = s.id; ticket.row = s.id.replace(/\d+/, ''); ticket.col = s.col;
        ui.toast(t('up.moved', { seat: s.id }), 2800); if (player.seated && room === ticket.hallKey) { stand(); setTimeout(() => jumpToSeat(s), 400); } return true; } };
  }
  function jumpToSeat(seat) { const s = seat || seatOf(ticket); if (!s) return; fadeTo(0.45, () => { claim(s); player.placeSeated(seatPose(s), crowd.laneStand(s)); player.y = s.y; tut.event('seated'); }); }
  function sitSeat(s) { if (s.npc && s.npc !== 'player') return; claim(s); player.sit(seatPose(s), crowd.laneStand(s), () => { sound.thud(); tut.event('seated'); if (ticket && ticket.tablet && game === 'flow') ui.toast(t('toast9.tabletArm'), 3000); }); }
  function sitSpot(sp) { sp.taken = 'player'; if (sitRelease) sitRelease(); sitRelease = () => { if (sp.taken === 'player') sp.taken = null; sitRelease = null; }; player.sit({ x: sp.x, y: sp.y + 0.72, z: sp.z, yaw: sp.face }, sp.stand, () => sound.thud()); }
  function stand() { if (player.standUp(() => { if (sitRelease) sitRelease(); })) sound.thud(); }
  // Quick play: the tablet plays in the hall you are in (or your ticket's), on the seat you sit in
  function remotePlay(o) {
    if (!together.canControl()) { ui.toast(t('mp.hostOnly'), 2600); return false; }
    const hk = room && room.startsWith('hall') ? room : ticket ? ticket.hallKey : 'hallMax', h = world.hallByKey(hk);
    const best = Math.round(h.cfg.rows.length * 0.58), s = (player.seated && h.seats.find((q) => q.npc === 'player')) || (ticket && ticket.hallKey === hk && seatOf(ticket)) || h.seats.filter((q) => !q.taken && !q.npc).sort((p, q) => (Math.abs(p.row - best) * 2 + Math.abs(p.a) * 0.8) - (Math.abs(q.row - best) * 2 + Math.abs(q.a) * 0.8))[0] || h.seats[0];
    const src = o.own ? shows.own : { kind: 'film', filmId: o.film }; if (!src) return false;
    const prev = seatOf(ticket); if (prev && prev !== s) { prev.player = false; prev.taken = false; }
    ticket = { hall: h.id, hallKey: hk, hallName: h.name, seat: s.id, row: s.id.replace(/\d+/, ''), col: s.col, src, title: src.title || '', delay: 0, shown: true, checked: true, tablet: true, quick: game === 'quick' };
    s.player = true; s.taken = true; const st = shows.get(h.id); if (st.state === 'ended' && st.src && !o.own && st.src.filmId === o.film) shows.replay(h.id); else shows.book(h.id, src, 0, s.id, { replay: st.state === 'playing' || st.state === 'ended' }); together.onBooked(h.id);
    // picked outside the hall: straight to your seat
    if (room !== hk) setTimeout(() => { tablet.close(); jumpToSeat(s); }, 400);
    return true;
  }
  // the seat bell: the server comes with his cart (Flow mode, when you didn't buy the armrest tablet)
  function mySeatNow() { return player.seated && room && room.startsWith('hall') ? world.hallByKey(room).seats.find((q) => q.npc === 'player') || (ticket && seatOf(ticket)) : null; }
  function ringBell() { if (!player.seated || game !== 'flow') return; const s = player.seated && seatOf(ticket); sound.bell(); tut.event('bell');
    const prio = credits.count('pass_priority') > 0, r = s && crowd.callServer(s, (npc) => { npc._served = true; if (dist(npc) < 3.5) startTalk(npc); }, prio); if (r && room) together.sendOrder(s, room);
    if (r === 'queued' && prio && credits.use('pass_priority')) ui.toast(t('lc.priorityUsed'), 2600);   // v14 a waiter priority pass (the shop) puts your seat first
    ui.toast(t(!r ? 'srv.busy' : r === 'queued' ? 'srv.queued' : 'toast9.serverComing'), 2400); }
  // the armrest tablet: the order goes on the bill; a runner brings it to your seat a little later (Quick: at once)
  function orderToSeat(k) {
    if (held) { ui.toast(t('toast9.handsFull'), 2400); return false; } if (!bill.pay(bill.itemPrice(k), k)) { ui.toast(t('lc.short', { price: bill.fmt(bill.itemPrice(k)) }), 2800, 'error'); return false; } if (game === 'flow') sound.pay();
    const seat = player.seated ? (game === 'flow' && ticket ? seatOf(ticket) : mySeatNow()) : null;
    if (seat) { const r = crowd.callServer(seat, (npc) => { npc.gesture('give', 1.2); crowd.handProp(npc, menuItem(k).id); npc.say(pick('srv.hand')); setTimeout(() => { crowd.handProp(npc, null); takeItem(k); setTimeout(() => crowd.serverLeave(), 1500); }, 900); });
      if (r) { if (room) together.sendOrder(seat, room); ui.toast(t(r === 'queued' ? 'srv.queued' : 'toast9.serverComing'), 2400); return true; } }
    setTimeout(() => takeItem(k), game === 'quick' ? 600 : 2500); return true;
  }
  function handBack() { const s = crowd.staff.server; if (s && s.state === 'serving') { s.say(pick('srv.back')); setTimeout(() => crowd.serverLeave(), 2500); } sound.click(); }
  // the best scenes (strong cues only): a seat rumble and a few sparks before the screen, each with its own switch
  const sparks = makeSparks(engine); function bigScene(id, ev) {
    if (!ticket || ticket.hall !== id || room !== ticket.hallKey || !player.seated) return; const strong = (ev.type === 'climax' || ev.type === 'scare') && (ev.k ?? 1) > 0.7; if (!strong) return;
    if (settings.haptics !== false) { try { if (media && media.vibrate) media.vibrate(JSON.stringify([0, 70, 40, 120, 60, 60]), JSON.stringify([0, 140, 0, 220, 0, 120])); else navigator.vibrate && navigator.vibrate([70, 40, 120]); } catch (e) { /* no vibrator */ } }
    if (settings.particles !== false) sparks.burst(world.hallById(id), shows.avg);
  }
  world.onDoor = (open, door) => { const d = Math.hypot(door.x - player.x, door.z - player.z); if (d < 12 && Math.abs(door.y - player.y) < 3) sound.door(open, 1 - d / 12); };
  // the lift's sounds near it: the motor while it moves; on arrival one chime at G (it goes up from there), two upstairs (it goes down)
  world.onLift = (ev) => { const d = Math.hypot((LIFT.x0 + LIFT.x1) / 2 - player.x, (LIFT.z0 + LIFT.z1) / 2 - player.z); if (d > 9) return;
    if (ev === 'move') sound.liftHum(); else if (ev === 'ding') { sound.ding(); if (world.lift.level) setTimeout(() => sound.ding(), 420); } else sound.door(ev === 'open', 0.5 * (1 - d / 9)); };
  function pressLift(b) {
    if (b.id === 'car1' && game === 'flow' && !(ticket && ticket.checked) && !world.gate.always) { sound.liftDeny && sound.liftDeny(); ui.toast(t('toast9.liftTicket'), 3000); return; }
    world.lift.press(b.id); together.sendLift(b.id); sound.liftBeep ? sound.liftBeep() : sound.click(); if (b.id === 'alarm') setTimeout(() => sound.bell(), 160); if (/^car/.test(b.id)) career.event('lift');
  }
  player.onVRTap = () => { if (mode === 'play' && !modal && !talk.open && !intro.active && ui.promptFn) ui.promptFn(); };   // v14b phone VR: the viewer's button presses what the reticle is on
  player.onTap = (x, y, locked) => { if (mode !== 'play' || modal || talk.open || intro.active || input.vr || player.seated) return;
    const b = locked ? aimBtn : (world.roomAt(player.x, player.y, player.z) === 'lobby' ? world.lift.pick(engine.camera, player.y, x, y, innerWidth, innerHeight, 44) : null); if (b) pressLift(b); };
  addEventListener('pointerdown', () => sound.unlock(), { capture: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { sound.suspend(); shows.pause(true); } else { sound.resume(); shows.pause(false); } });
  window.__lumiereLifecycle = (s) => { if (s === 'pause') { sound.suspend(); shows.pause(true); } else { sound.resume(); shows.pause(false); } };
  window.__lumiereInsets = (l, r, tp, b) => { const s = document.documentElement.style; s.setProperty('--safe-l', l + 'px'); s.setProperty('--safe-r', r + 'px'); s.setProperty('--safe-t', tp + 'px'); s.setProperty('--safe-b', b + 'px'); };
  // ---------- modes ----------
  function newGame(m) {
    game = m; bill.unlimited = m === 'quick'; bill.reset(); if (ticket) { const s = seatOf(ticket); if (s) { s.player = false; s.taken = false; } } ticket = null; if (held) binItem(); if (sitRelease) sitRelease();
    for (const h of world.halls) if (shows.get(h.id).state !== 'idle') shows._abort(h.id); visits++;
    ui.setButton('#bRemote', m === 'quick');
    world.gate.always = m !== 'flow'; world.gate.passUntil = 0; if (m === 'flow') { player.place(ARRIVAL.x, ARRIVAL.z, ARRIVAL.yaw, ARRIVAL.pitch, 0); if (!intro.start({ skippable: !!(settings.seen && settings.seen.intro) })) arrived(); }   // Story starts with the taxi ride to the doors
    else { const s = SPAWN.quick; player.place(s.x, s.z, s.yaw, 0, 0); setTimeout(() => ui.toast(t('toast9.quick'), 3600), 900); }
  }
  function arrived() { player.place(ARRIVAL.x, ARRIVAL.z, ARRIVAL.yaw, ARRIVAL.pitch, 0); settings.seen = { ...(settings.seen || {}), intro: true }; saveSettings(settings); onModal(); ui.toast(t('toast.welcome'), 2600); maybeAskTutorial(); }
  function enterPlay(m) {
    if (mode === 'play') return; ui.fade(1, 0.35);
    setTimeout(() => { if (m || !game) newGame(m || 'flow'); mode = 'play'; ui.showMenu(false); onModal(); bill.onChange(); ui.fade(0, 0.8); try { history.pushState({ lum: 1 }, ''); } catch (e) { /* no history */ } if (!intro.active) maybeAskTutorial(); }, 380);
  }
  function toMenu() { if (intro.active) intro.finish(); if (together.active) together.leave(); mode = 'menu'; onModal(); ui.showMenu(true, !!game); talk.close(); tut.stop(); phone.close(); }
  function maybeAskTutorial() { if (mode === 'play' && game === 'flow' && !settings.tutorialAsked && !settings.tutorialDone && settings.lang) setTimeout(() => ui.askTutorial(), 1400); }
  function startTutorial(fromAsk) { settings.tutorialAsked = true; saveSettings(settings); if (mode !== 'play' || game !== 'flow') enterPlay('flow'); setTimeout(() => tut.start(), fromAsk ? 200 : 900); }
  addEventListener('popstate', () => { if (mode === 'play') { if (talk.open) talk.close(); else if (booking.isOpen()) booking.close(); else if (tablet.isOpen()) tablet.close(); else if ($('#pause').hidden) ui.openPause(); else ui.closeModal('#pause'); try { history.pushState({ lum: 1 }, ''); } catch (e) { /* no history */ } } });
  // ---------- frame ----------
  const SIDE_BTNS = ['#bRemote', '#bBell', '#bRecline', '#bCup'].map((q) => $(q)); let sideKey = '';
  const fwd = new THREE.Vector3(); let last = performance.now(), slowT = 0, errT = -1e9, audT = 0, curFilm = null, dbg = null; const actors = [];
  function frame(now) {
    requestAnimationFrame(frame); if (engine.cap30 && now - last < 28) return;   // v14b steady 30 fps pacing on phones that cannot hold 60 (engine.governor)
    const dt = Math.min(0.05, (now - last) / 1000); last = now; G.uTime.value = now / 1000; const c0 = performance.now();
    try { step(dt, now); } catch (e) { if (now - errT > 5000) { errT = now; console.error('[lumiere] frame update failed (rendering anyway):', e); } }
    engine.stats.cpu = engine.stats.cpu * 0.92 + (performance.now() - c0) * 0.08; engine.governor(dt, now);
    shows.frame(engine.camera, engine.renderer); engine.render(); together.preview(engine.renderer, dt); phone.frame(dt);
    if (snapCb) { const cb = snapCb; snapCb = null; let url = null; try { const c = engine.renderer.domElement, k = Math.min(1, 960 / c.width), o = document.createElement('canvas'); o.width = Math.round(c.width * k); o.height = Math.round(c.height * k); o.getContext('2d').drawImage(c, 0, 0, o.width, o.height); url = o.toDataURL('image/jpeg', 0.85); } catch (e) { /* tainted or lost context */ } cb(url); }
  }
  // v14c (the user, 11-26: heads cut at the frame's edge, the camera through the statue): a slow arc 6.4 m round the muse, 3 m up (over
  // everyone's head), between the doors and the fountain; it looks past her left so she stands to the right of the menu
  function menuCam(now) { const t = now / 1000, th = 0.85 * Math.sin(t * 0.045), R = 6.4, cam = engine.camera; cam.position.set(R * Math.sin(th), 3.0 + 0.25 * Math.sin(t * 0.07), 10 + R * Math.cos(th));
    cam.lookAt(-2.6 * Math.cos(th), 3.3, 10 + 2.6 * Math.sin(th)); player.x = cam.position.x; player.z = cam.position.z; player.y = 0; }
  // v9.1b (the user: "the screens are so small"): a landscape phone shows ~105 deg across, a middle seat sees the picture at ~57 deg, so the
  // picture filled half the phone. While you watch, the view narrows towards the picture (the 270 hall keeps a wider view: its side
  // screens are the point). v14 (the user, 11-20: "the camera zooms a lot to the screen"): at most 14 % narrower, the halls are bigger now
  function fitZoom(hk) { const H = world.hallByKey(hk), c = engine.camera; if (!H) return 0.8; const h = H.cfg, loc = h.toLocal(c.position.x, c.position.z), d = Math.max(2, loc.d - h.sagD);
    const want = 2 * Math.atan((h.W / 2) / d) / (h.format === 'x270' ? 0.6 : 0.92), vw = 2 * Math.atan(Math.tan(want / 2) / c.aspect) * 180 / Math.PI;
    const y0 = h.y0 + h.hB, y1 = h.y0 + h.hB + h.H, ey = c.position.y, vh = (Math.atan2(y1 - ey, loc.d) - Math.atan2(y0 - ey, loc.d)) * 180 / Math.PI * 0.88;   // a tall picture may overflow 12 %
    return Math.max(0.86, Math.min(1, Math.max(vw, vh) / engine.baseFov)); }
  function step(dt, now) {
    if (dbg) { const c = engine.camera; c.position.set(dbg[0], dbg[1], dbg[2]); c.rotation.set(dbg[4] || 0, dbg[3] || 0, 0); player.x = dbg[0]; player.z = dbg[2]; player.y = dbg[1] - 1.62; }
    else if (mode === 'menu') menuCam(now); else if (!intro.active) { player.dyn = crowd.bodiesNear(player.x, player.z, 2.5); traffic.bodiesNear(player.x, player.z, 2.5, player.dyn); intro.bodiesNear(player.x, player.z, 2.5, player.dyn); player.update(dt); }
    input.update(dt);
    intro.update(dt, player); armTab.update(dt);
    { const hear = world.vis.has('street') ? (world.roomAt(player.x, 1, player.z) === 'street' ? 1 : 0.35) : 0; intro.hear = hear; traffic.hear = hear;
      traffic.paused = intro.active && intro.t < intro.SHOT_B; traffic.update(dt, player, intro.carOn && !intro.inCar ? [intro.car] : []); }
    const r = (mode === 'menu' && !dbg) ? 'lobby' : world.roomAt(player.x, player.y, player.z) || room; if (r !== room && r === 'lobby' && room === 'street' && game === 'flow') { const h = crowd.staff.host; if (h) setTimeout(() => h.say(pick(visits > 1 ? 'host.back' : 'host.hello')), 600); } room = r;
    exitLock(dt, r);
    const cam = engine.camera; world.setVisibility(r, cam.position.x, cam.position.y, cam.position.z);
    const watching = mode === 'play' && !!player.seated && r.startsWith('hall') && shows.isOn(world.hallByKey(r).id);
    engine.setZoom(watching ? fitZoom(r) : 1, dt); document.body.classList.toggle('watching', watching); engine.showMode && engine.showMode(watching);
    actors.length = 0; actors.push(player); for (const a of crowd.agents) if (a.path) actors.push(a);
    world.update(dt, actors, now);
    for (const h of world.halls) if (h.room.group.visible) h.updateLOD(cam, false, engine.preset.seatLod * (engine.lodK || 1));
    together.frame(dt); crowd.update(dt, now, player, world.vis); shows.update(dt, now, r, world.vis);
    const lvl = sound.level(); shows.spread += (clamp(((lvl ?? -60) + 30) / 18) - shows.spread) * Math.min(1, dt * 2); director.update(dt, now, lvl, shows.lum);
    if (world.street) world.street.update(dt, cam);
    sparks.update(dt); rain.mesh.visible = !intro.inCar; if (world.rooms.street.group.visible && !intro.inCar) rain.update(now / 1000, cam);   // no rain falls inside the taxi
    // the film follows you: through the hall's doors, quieter and duller outside
    audT -= dt; if (audT <= 0) { audT = 0.25; let want = null; for (const h of world.halls) if (shows.isOn(h.id) && shows.get(h.id).pic) { const a = h.key === r ? 1 : world.vis.has(h.key) ? 0.22 : 0; if (a > 0 && (!want || a > want.a)) want = { a, h }; }
      const key = want ? want.h.key : null; if (key !== curFilm) { curFilm = key; if (!key) sound.stopFilm(); } curFilm && (sound._aud = want.a); }
    const hk = r.startsWith('hall') ? r : null, dark = hk && world.hallByKey(hk).room.U.uHouse.value < 0.5;
    sound.setListener({ room: r, x: player.x, z: player.z, yaw: player.yaw, filmAud: curFilm ? sound._aud || 0 : 0, filmLP: curFilm === hk ? 18000 : 1200, crowdLP: hk ? 18000 : 2500, verb: hk ? 0.45 : r === 'corridor' ? 0.25 : 0.12, dark,
      people: Math.min(1, crowd.agents.filter((a) => a.ch && a.ch.group.visible && dist(a) < 12).length / 10), popcornDist: Math.min(Math.hypot(player.x + 21.3, player.z + 7.1), Math.hypot(player.x + 12.6, player.z - 2.6) + 2), popcornRate: life.popRate(now), cafeDist: Math.hypot(player.x + 18.5, player.z + 11.4), fountainDist: Math.hypot(player.x, player.z - 10), escDist: Math.hypot(player.x - 10.7, player.z - (ESC.up.zBot - 4)), seated: !!player.seated });
    sound.setHead(cam.position.x, cam.position.y, cam.position.z, player.yaw, player.pitch);
    // held item
    if (itemMesh) { lightT -= dt; if (lightT <= 0) { lightT = 0.3; crowd.lightAt(player.x, player.y + 1.3, player.z, itemLight); } itemIn = Math.min(1, itemIn + dt * 3); itemAnim = Math.max(0, itemAnim - dt * 1.6); const e = Math.sin(itemAnim * Math.PI);
      itemMesh.position.set(0.27 - e * 0.1, -0.3 - (1 - itemIn) * 0.3 + e * 0.17, -0.55 + e * 0.2); itemMesh.rotation.set(0.22 + e * 0.75, -0.35, e * 0.15); itemMesh.scale.setScalar(1.25); }
    { const mine = mode === 'play' && ticket && !ticket.watched && !player.seated ? seatOf(ticket) : null, here = mine && room === mine.hallKey;
      if (here) { if (!glowSeat) highlightSeat(); glowT = 1; pinFor(mine); seatPin.position.set(mine.x, mine.y + 1.75 + 0.06 * Math.sin(now * 0.004), mine.z); seatPin.visible = true; } else seatPin.visible = false; }
    if (glowSeat) { glowT -= dt; seatGlow.material.opacity = 0.45 + 0.4 * Math.sin(now * 0.006); if (glowT <= 0 || player.seated) { glowSeat = null; seatGlow.visible = false; } }
    guide.tick(dt, now); life.update(now); filmMeter(dt);
    // v12c bar life (the user picked it): when the lever machine's wand steams (anim12.js: every 21 s, or now when you order a hot drink)
    // the barista steps to it, works the milk and comes back to his counter; never while you are talking to him
    { const b = crowd.staff && crowd.staff.cafe, ph = life.wandPhase(now);
      if (b && b.alive !== false && !(talk.open && talk.npc === b)) {
        if (b.state === 'post' && ph < 0.2) b.go([{ x: -20.42, y: 0, z: -12.3 }], () => { b.state = 'brewing'; b.yaw = -Math.PI / 2; b.gesture('pour', 4.5); }, { speed: 0.8, state: 'tobar' });
        else if (b.state === 'brewing' && ph > 0.3) b.go([{ x: b.home.x, y: 0, z: b.home.z }], () => { b.state = 'post'; b.yaw = b.home.yaw; }, { speed: 0.8, state: 'returning' }); } }
    const nearLift = mode === 'play' && !modal && !talk.open && !intro.active && !player.seated && !player.busy && r === 'lobby' && Math.hypot(player.x - (LIFT.x0 + LIFT.x1) / 2, player.z - (LIFT.z0 + LIFT.z1) / 2) < 4.5;
    aimBtn = nearLift ? world.lift.pick(cam, player.y, innerWidth / 2, innerHeight / 2, innerWidth, innerHeight, 26) : null; world.lift.setHover(aimBtn && aimBtn.id);
    // v14 (the user, 11-20: "instead of having an option to click, we have this weird finger click on the middle crosshair"): near the lift
    // the action button does it: at a landing it calls the car, in the car it takes you to the other floor (the buttons in the world still
    // answer a tap or E on the one you look at)
    if (nearLift) { const L_ = world.lift, inCar = L_.inside(player.x, player.z) && Math.abs(player.y - L_.y) < 0.6, lv = player.y > 2 ? 1 : 0;
      const id = aimBtn ? aimBtn.id : inCar ? 'car' + (1 - lv) : 'hall' + lv, b = L_.buttons.find((q) => q.id === id);
      if (b && !(inCar && L_.state === 'moving')) ui.setPrompt(t(aimBtn ? 'hud.liftPress' : inCar ? (lv ? 'hud.liftDown' : 'hud.liftUp') : 'hud.liftCall'), () => pressLift(b)); else ui.setPrompt(null); }
    else prompts(r, hk);
    // where to next (wayfind.js): the route a few times a second, the arrow every frame
    if (mode !== 'play' || modal || talk.open || intro.active || watching || settings.goal === false || dbg) { way.cur = null; ui.setGoal(null); guide.hide(); }
    else { wayT -= dt; if (wayT <= 0) { wayT = 0.2; way.update({ game, ticket, room: r, player, job: jobs.active ? (w, p) => jobs.goal(w, p) : null }); if (way.cur && !player.seated) guide.set(way.cur.pts, way.cur.ai, player); else guide.hide(); } const g = way.cur;
      if (!g) ui.setGoal(null); else { cam.getWorldDirection(fwd); const dx = g.aim.x - player.x, dz = g.aim.z - player.z, fl = Math.hypot(fwd.x, fwd.z) || 1, fx = fwd.x / fl, fz = fwd.z / fl;
        ui.setGoal(t(g.key, g.vars), Math.atan2(dx * -fz + dz * fx, dx * fx + dz * fz) * 180 / Math.PI, g.dist); } }
    ui.setButton('#bBell', mode === 'play' && !modal && !!player.seated && game === 'flow' && !!hk && !(ticket && ticket.tablet));
    recliner.update(dt, player); const seatCtl = mode === 'play' && !!player.seated && !player.busy && !!recliner.cur && !modal;
    ui.setButton('#bRecline', seatCtl); ui.setButton('#bCup', seatCtl && (held ? !!recliner.freeHolder() : recliner.hasItem()));
    ui.setButton('#bRemote', mode === 'play' && (game === 'quick' || (!!player.seated && !!ticket && ticket.tablet)) && together.canControl());
    // v14 (the user, 11-21: "the armrest tablet button is colliding with the recline button"): the round side buttons share one row, each
    // visible one in the next slot from the action button outward, so two never stand on one spot
    { const vis = SIDE_BTNS.filter((el) => el && !el.hidden), key = vis.map((el) => el.id).join(',') + (document.body.classList.contains('lefty') ? 'L' : 'R');
      if (key !== sideKey) { sideKey = key; const L = key.endsWith('L');
        vis.forEach((el, i) => { const off = `calc(${96 + i * 54}px + var(${L ? '--sal' : '--sar'}))`; if (L) { el.style.insetInlineStart = off; el.style.insetInlineEnd = 'auto'; } else { el.style.insetInlineEnd = off; el.style.insetInlineStart = ''; } }); } }
    talk.update(dt, cam, innerWidth, innerHeight); voice.update(); tut.update(dt); if (world.vis.has('lobby')) { led(now); board(now); } if (world.vis.has('street')) marq.update(now);
    slowT -= dt; if (slowT <= 0) { slowT = 0.5;
      const S = (id) => shows.get(id), status = (id) => { const s = S(id); return s.state === 'pending' ? t('show.pending', { time: fmtTime(shows.countdown(id) - 10) }) : s.state === 'countdown' ? t('show9.countdown') : s.state === 'playing' ? (shows.buffering ? t('show.buffering') : t('show.playing')) : s.state === 'ended' ? t('show.ended') : t('show.idle'); };
      if (hk) { const h = world.hallByKey(hk); ui.setWhere(h.name.replace('LUMIERE ', ''), S(h.id).state === 'idle' ? t('show.none') : `${shows.title(h.id)} · ${status(h.id)}`); } else ui.setWhere(t('room9.' + r), '');
      if (ticket && ticket.title) { const s = S(ticket.hall); ui.setTicketChip(t('ticket9.chip', { screen: ticket.hallName.replace('LUMIERE ', ''), seat: ticket.seat }) + (s.state === 'pending' ? ' · ' + fmtTime(shows.countdown(ticket.hall) - 10) : '')); } else ui.setTicketChip(null);
      ui.setFps(`${engine.stats.fps.toFixed(0)} fps · ${engine.stats.scale.toFixed(2)}x · ${engine.renderer.info.render.calls} dc`); }
  }
  // v14 Lumiere Credits for watching (the master prompt: "watching eligible licensed Lumiere films"; never YouTube, never your own videos):
  // 6 LC a minute while you sit in the hall of a house film that is playing, the app in front, the picture moving (paused or hidden: nothing),
  // at most 300 LC a film; finishing a film pays 150 LC once per film per day. The day's cap is credits.js DAILY_CAP.
  let meterT = 0, meterSec = 0, meterLast = -1, meterFilm = null, meterPaid = 0;
  function filmMeter(dt) {
    meterT += dt; if (meterT < 1) return; meterT = 0; const v = shows.video, id = shows.active, st = id && shows.get(id);
    const ok = mode === 'play' && player.seated && st && st.state === 'playing' && st.src && st.src.kind === 'film' && room === st.hall.key && document.visibilityState === 'visible' && v && !v.paused && v.currentTime > meterLast + 0.5;
    if (v) meterLast = v.currentTime; if (!ok) return; const fid = st.src.filmId || st.src.title; if (fid !== meterFilm) { meterFilm = fid; meterSec = 0; meterPaid = 0; }
    meterSec++; if (meterSec % 60 === 0) { career.event('watchMin'); if (meterPaid < 300) { const g = credits.earn(6, 'film:' + fid); meterPaid += g; if (g && meterSec % 300 === 0) coin(meterPaid); } }
  }
  // what can I do here? (the crosshair in the middle picks what you look at)
  function prompts(r, hk) {
    if (mode !== 'play' || talk.open || modal || intro.active) { ui.setPrompt(null); return; }
    // v11 (the user: "wasn't the exit supposed to be faster"): once your film is over, the plate says Leave and takes you straight to the
    // lobby (seated or standing anywhere in the hall), instead of walking down to the exit doors by the screen
    const over = !!(hk && ticket && ticket.watched && ticket.hallKey === hk);
    if (player.seated) { ui.setPrompt(player.busy ? null : t(over ? 'hud.leave' : 'hud.stand'), () => (over ? leaveHall() : stand())); return; }
    if (player.busy) { ui.setPrompt(null); return; }
    { const jp = jobs.prompt(r, player, hk); if (jp) { ui.setPrompt(jp.label, jp.fn); return; } }   // v14 a shift's next step (career.js)
    { let best = null, bd = 1.05; for (const sp of world.sitSpots) { if (sp.taken || sp.room !== r || Math.abs(sp.y - 0.5 - player.y) > 1.0) continue; const d = Math.hypot(sp.x - player.x, sp.z - player.z); if (d < bd) { bd = d; best = sp; } }
      if (best) { ui.setPrompt(t('hud.sitDown'), () => sitSpot(best)); return; } }   // v14 sofas, armchairs, benches and stools outside the halls
    engine.camera.getWorldDirection(fwd); const fl = Math.hypot(fwd.x, fwd.z) || 1, fx = fwd.x / fl, fz = fwd.z / fl, ahead = (x, z, k = 0.3) => { const dx = x - player.x, dz = z - player.z, d = Math.hypot(dx, dz) || 1; return (dx * fx + dz * fz) / d > k; };
    // v11: nothing is offered through a wall (world9.js Walls.sees): people at eye height (over counters and their glass), seats and
    // fittings at chest height
    const sees = (x, z, lo, hi) => world.walls.sees(player.x, player.z, x, z, player.y + lo, player.y + hi);
    const npc = crowd.talkTarget(player.x, player.y, player.z, fx, fz); if (npc && dist(npc) < 2.6 && sees(npc.x, npc.z, 1.62, 1.78)) { ui.setPrompt(t(npc.role === 'bar' || npc.role === 'cafe' ? 'hud.order' : npc.role === 'box' ? 'hud.buy' : npc.name ? 'hud.talk' : 'hud.hello', { name: npc.nameKey && t(npc.nameKey) !== npc.nameKey ? t(npc.nameKey) : npc.name }), () => startTalk(npc)); return; }
    if (held && held.left <= 0 && nearBin()) { ui.setPrompt(t('hud.bin'), () => binItem()); return; }
    if (r === 'wc') { const u = world.uses.find((q) => Math.hypot(q.x - player.x, q.z - player.z) < 1.0 && ahead(q.x, q.z, 0.2) && sees(q.x, q.z, 1.2, 1.6)); if (u) { ui.setPrompt(t('hud.' + u.kind), () => useFixture(u)); return; } }
    // v11 the ticket machines between the box office and the concessions: the box office sheet without the queue
    if (r === 'lobby' && player.y < 1 && Math.hypot(player.x - (COUNTERS.boxOffice.x1 + 0.5), player.z - (COUNTERS.concessions.z1 + COUNTERS.boxOffice.z0) / 2) < 1.6 && ahead(COUNTERS.boxOffice.x1, (COUNTERS.concessions.z1 + COUNTERS.boxOffice.z0) / 2, 0.35)) { ui.setPrompt(t('goal.ticket'), () => { sound.click(); booking.open({ quick: game === 'quick' }); }); return; }
    if (hk) { const h = world.hallByKey(hk); let best = null, bd = 1.5;
      for (const s of h.seats) { const d = Math.hypot(s.x - player.x, s.z - player.z); if (d > bd || Math.abs(s.y - player.y) > 0.45 || !ahead(s.x, s.z, 0.2) || !sees(s.x, s.z, 1.2, 1.6)) continue; const mine = ticket && ticket.seat === s.id && ticket.hall === h.id; if (game === 'flow' && !mine) continue; if (s.npc && s.npc !== 'player') continue; best = s; bd = d; }
      if (best) { const mine = ticket && ticket.seat === best.id && ticket.hall === h.id; ui.setPrompt(mine ? t('hud.yourSeat', { seat: best.id }) : t('hud9.sitHere', { seat: best.id }), () => { if (!mine) { const tk = { hall: h.id, hallKey: hk, hallName: h.name, seat: best.id, row: best.id.replace(/\d+/, ''), col: best.col, src: ticket && ticket.src, title: ticket ? ticket.title : '', delay: 0, shown: true, checked: true, tablet: true, quick: true }; const prev = seatOf(ticket); if (prev) { prev.player = false; prev.taken = false; } ticket = tk; best.player = true; best.taken = true; } sitSeat(best); }); return; } }
    if (over) { ui.setPrompt(t('hud.leave'), () => leaveHall()); return; }
    ui.setPrompt(null);
  }
  // warm every room's shaders and textures while the loader is up (no hitch when you walk into a room for the first time)
  { const R = engine.renderer, seen = new Set(), shown = Object.values(world.rooms).map((rm) => [rm, rm.group.visible]); for (const [rm] of shown) rm.group.visible = true;
    try { R.compile(engine.scene, engine.camera); engine.scene.traverse((o) => { for (const m of [].concat(o.material || [])) for (const u of Object.values(m.uniforms || {})) { const v = u && u.value; if (v && v.isTexture && !seen.has(v)) { seen.add(v); R.initTexture(v); } } }); } catch (e) { console.warn('warm-up skipped', e); }
    for (const [rm, v] of shown) rm.group.visible = v; }
  prog(1); const hold = Math.max(0, 2600 - (performance.now() - t0));
  requestAnimationFrame((tt) => { last = tt; frame(tt); setTimeout(() => { const ld = $('#loader'); if (ld) ld.classList.add('gone'); clearInterval(ldTimer); ui.fade(0, 0.9); if (mode !== 'play') { ui.showMenu(true, false); onModal(); } if (!settings.lang) ui.openLang(); setTimeout(() => $('#loader') && $('#loader').remove(), 1300); }, 120 + hold); });
  if (Q.get('play')) setTimeout(() => enterPlay(Q.get('play') === 'quick' ? 'quick' : 'flow'), 300);
  window.__lumiere = { engine, world, player, shows, sound, voice, intro, traffic, ui, crowd, together, input, talk, mats, director, settings, bill, booking, tablet, guide, life, credits, phone, career, jobs, buildMs: performance.now() - t0,
    get ticket() { return ticket; }, get game() { return game; }, get mode() { return mode; }, book: (tk) => bought(tk), jumpToSeat, ringBell, sitSeat, sitSpot, startTalk, takeItem, useItem, binItem, enterPlay, toMenu, newGame, remotePlay,
    B: BLD, pose: (p) => { dbg = p; }, debugCam: (c) => { dbg = c ? [c.p[0], c.p[1], c.p[2], 0, 0] : null; }, ready: true };
  // the phone bench (docs/V9-AUDIT.md, "Device check"): a fixed camera route through every room with frame times, draws and triangles
  if (Q.get('bench')) import('./bench.js').then((m) => setTimeout(() => m.runBench(window.__lumiere), 2600)).catch((e) => console.error('[bench]', e));
}
// sparks: a burst of warm points before the screen on the strongest scenes (Settings > Sound > Effects)
function makeSparks(engine) {
  const N = 160, g = new THREE.BufferGeometry(), P = new Float32Array(N * 3), V = new Float32Array(N * 3), life = new Float32Array(N); g.setAttribute('position', new THREE.BufferAttribute(P, 3));
  const m = new THREE.PointsMaterial({ size: 0.06, color: 0xffc070, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }), pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.visible = false; engine.scene.add(pts);
  let on = 0;
  return { burst(h, col) { const H = h.cfg; m.color.copy(col || m.color).multiplyScalar(1.6).lerp(new THREE.Color(1, 0.75, 0.4), 0.5); for (let i = 0; i < N; i++) { const u = (Math.random() - 0.5) * H.W * 0.9, w = H.toWorld(u, 1.5 + Math.random() * 4); P[i * 3] = w.x; P[i * 3 + 1] = H.y0 + 0.2 + Math.random() * 2; P[i * 3 + 2] = w.z; V[i * 3] = (Math.random() - 0.5) * 0.6; V[i * 3 + 1] = 0.8 + Math.random() * 1.6; V[i * 3 + 2] = (Math.random() - 0.5) * 0.6; life[i] = 1 + Math.random() * 1.2; } on = 2.4; pts.visible = true; },
    update(dt) { if (!on) return; on = Math.max(0, on - dt); for (let i = 0; i < N; i++) { life[i] -= dt; if (life[i] <= 0) { P[i * 3 + 1] = -99; continue; } V[i * 3 + 1] -= dt * 0.9; P[i * 3] += V[i * 3] * dt; P[i * 3 + 1] += V[i * 3 + 1] * dt; P[i * 3 + 2] += V[i * 3 + 2] * dt; } g.attributes.position.needsUpdate = true; m.opacity = Math.min(1, on); if (!on) pts.visible = false; } };
}
boot().catch((e) => { console.error(e); const l = $('#loader'); if (l) { const p = document.createElement('p'); p.className = 'ld-err'; p.textContent = 'Error: ' + (e && e.message ? e.message : e); l.appendChild(p); } });
