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
import { Director } from './react.js';
import { Intro, ARRIVAL } from './intro9.js';
import { treeFor } from './dialogue9.js';
import { makeHeld, setHeldMaterial } from './held.js';
import { cleanTitle } from './films.js';
import { ledWall, showtimes, menuBoard } from './panels9.js';
import { loadSettings, saveSettings, presetFor } from './settings.js';
import { setLang, t, pick, fmtTime } from './i18n.js';
import { SPAWN, GATE, LIFT, ESC, COUNTERS, HALL, L1 } from './building.js';
import { SEAT, CLASSES } from './hallmath.js';
const $ = (s) => document.querySelector(s), clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const BITES = { popcorn: 9, drink: 8, coffee: 6, nachos: 7 }, DENS = { off: 'off', few: 'low', normal: 'medium', many: 'high' };
// the bill (v8 feedback: "remove the money" and "make the prices realistic"): Indian multiplex prices, paid by card, never refused
const PRICES = { salted: 290, caramel: 340, cheese: 340, combo: 460, nachos: 260, cola: 180, coffee: 220, water: 60, tablet: 99, replay: 0 };
class Bill {
  constructor() { this.P = { replay: 0, sym: '₹' }; this.unlimited = false; this.reset(); this.onChange = null; }
  reset() { this.lines = []; this.total = 0; this.cash = Infinity; this._emit(); }
  _emit() { this.onChange && this.onChange(this); }
  fmt(n) { return '₹' + Math.round(n).toLocaleString('en-IN'); }
  ticketPrice(cls) { return (CLASSES[cls] || CLASSES.std).price; }
  itemPrice(kind) { return PRICES[kind] ?? 200; }
  can() { return true; }
  pay(n, what) { if (this.unlimited || !n) return true; this.lines.push({ what, n }); this.total += n; this._emit(); return true; }
}
async function boot() {
  const settings = loadSettings(), Q = new URLSearchParams(location.search), nav = (navigator.language || 'en').slice(0, 2);
  setLang(settings.lang || (['hi', 'ur', 'es'].includes(nav) ? nav : 'en'));
  const portrait = () => $('#rotate').classList.toggle('need', innerHeight > innerWidth * 1.1); portrait(); addEventListener('resize', portrait);
  const prog = (p) => { $('#ldFill').style.width = (p * 100).toFixed(0) + '%'; };
  try { await Promise.race([Promise.all([document.fonts.load('600 40px Inter'), document.fonts.load('400 14px Inter')]), new Promise((r) => setTimeout(r, 2500))]); } catch (e) { /* fonts later */ }
  const engine = new Engine($('#gl'), settings), lowG = settings.graphics === 'low';
  const mats = new Materials({ renderer: engine.renderer, normalMaps: !lowG, reflections: !lowG && settings.reflections !== 'off', texSize: lowG ? 256 : 512 }); engine.applySettings(settings);
  mats.lightMaps = settings.shadows !== 'off' && !Q.get('nobake');
  const t0 = performance.now(); let done = 0; const tick = () => prog(0.05 + 0.4 * (++done / 3));
  await Promise.all([loadAssets(ASSET_LIST).then(tick), loadBakes().then(tick), loadPeople().then(tick).catch((e) => console.warn('[lumiere] people models failed', e))]);
  const world = await buildWorld(engine, mats, (p) => prog(0.45 + 0.5 * p)); await texturesReady(); prog(0.97);
  const sound = new Sound9(); sound.setVolumes({ master: settings.master, film: settings.film, crowd: settings.crowd });
  const bill = new Bill();
  let ticket = null, room = 'street', mode = 'menu', game = null, modal = false, held = null, visits = 0, sitRelease = null, fading = false;
  const player = new Player(engine, world, settings); player.attach($('#gl'), $('#stick'), $('#knob'), $('#sprint')); player.place(SPAWN.quick.x, SPAWN.quick.z, SPAWN.quick.yaw, 0, 0);
  player.onStep = (s) => sound.step(s, /hall|corridor/.test(room));
  const dist = (n) => Math.hypot(n.x - player.x, n.z - player.z), seatOf = (tk) => { const h = tk && world.hallById(tk.hall); return h ? h.seats.find((s) => s.id === tk.seat) : null; };
  // ---------- people and voices: only lines near you are heard (v8: "talking from far away") ----------
  const voice = new Voice(sound, settings); voice.voiceOf = (a) => a.voice || (a.rec && a.rec.kind === 'f' ? 'guestF' : 'guestM'); voice.rate = (a) => (a.role === 'guest' || a.role === 'aud' ? 0.96 + ((a.rec && a.rec.seed) % 9) / 100 : 1);
  { const sp = voice.speak.bind(voice); voice.speak = (a, line, o = {}) => (!o.full && a && Math.hypot(a.x - player.x, a.z - player.z) > 7 ? Promise.resolve(0) : sp(a, line, o)); }
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
    onEnd: (id, applause) => { if (ticket && ticket.hall === id) { if (applause) ui.toast(t('toast.end'), 3600); ticket.watched = true; } },
    onError: (k) => ui.toast(t(k === 'film' ? 'toast9.filmError' : 'toast.videoError'), 5200, 'error'),
  });
  // ---------- conversation, interface, booking, tablet, tutorial, layout ----------
  const talk = new Talk(sound, { action: (a, npc, tk) => action(a, npc, tk), distance: dist, speak: (n, ln, o) => voice.speak(n, ln, o), speaking: (n) => voice.speaking(n),
    closed: (npc) => { crowd.endTalk(npc); if (npc && npc.role === 'server' && npc.state === 'serving' && !tablet.isOpen()) crowd.serverLeave(); onModal(); } }, settings);
  function onModal(m) { modal = !!m || talk.open || ui.modalOpen(); player.locked = modal || mode !== 'play' || intro.active; }
  const ui = new UI(world, shows, sound, settings, {
    onModal, ticketInfo: () => ticket && ui.showTicket(ticketView(ticket), game === 'quick'), jumpToSeat: () => jumpToSeat(), useItem: () => useItem(),
    onSettings: (gfx) => applySettings(gfx), onPreset: (g) => Object.assign(settings, presetFor(g)),
    onPlay: (m) => enterPlay(m === 'story' ? 'flow' : m), onQuit: () => toMenu(), onPause: () => {}, onHide: () => {}, onLangPicked: () => voice.prepare(), onLangChanged: () => { voice.stopAll(); voice.prepare(); },
    openRemote: () => tablet.open('remote'), ringBell: () => ringBell(), onTutorial: (fromAsk) => startTutorial(fromAsk), editLayout: () => layoutEd.open(),
  });
  const booking = new Booking9(world, shows, sound, bill, { onModal, toast: (m, ms, k) => ui.toast(m, ms, k), onTicket: (tk) => bought(tk), pickOwn: () => pickOwn(), useLink: (u) => useLink(u) });
  const led = ledWall(world.panels.ledwall, shows, t, fmtTime), board = showtimes(world.panels.showtimes, shows, t, fmtTime); menuBoard(world.panels.menu, t, (n) => '₹' + n, PRICES);
  const tablet = new Tablet(shows, sound, bill, settings, { onModal, toast: (m, ms, k) => ui.toast(m, ms, k), pickOwn: () => pickOwn(), playFilm: (o) => remotePlay(o), handBack: () => handBack(), quick: () => game === 'quick' || (ticket && ticket.tablet) });
  tablet.onLocal = (url, name) => { shows.loadLocal(url, cleanTitle(name)); ui.toast(t('toast.ownReady'), 2400); if (booking.isOpen()) booking.build(); };
  const layoutEd = new LayoutEditor(settings, sound, { onModal, save: () => { saveSettings(settings); applyLayout(settings); } });
  const tut = new Tutorial(settings, sound, { save: () => saveSettings(settings), state: () => ({ ticket, held, seated: !!player.seated, room, game }) });
  const intro = new Intro(engine, world, mats, sound, { fade: (a, d) => ui.fade(a, d), done: () => arrived(), driver: (k) => { const ln = pick(k); if (ln) { talk.bubble(driverAgent, ln, 2.6); voice.speak(driverAgent, ln, { full: true }); } } });
  const driverAgent = { x: 1.6, y: 0, z: 27.9, name: t('role9.driver'), role: 'driver', voice: 'driver', alive: true, ch: { s: { sit: 1 }, scale: 1 }, group: { visible: true }, crowd };
  // the taxi waits at the kerb: it's solid
  for (const [ax, az, bx, bz] of [[-0.75, 26.92, 3.95, 26.92], [3.95, 26.92, 3.95, 28.8], [3.95, 28.8, -0.75, 28.8], [-0.75, 28.8, -0.75, 26.92]]) world.walls.add(ax, az, bx, bz, -0.2, 1.6);
  bill.onChange = () => ui.setWallet(game === 'flow' && bill.total ? t('hud9.bill', { total: bill.fmt(bill.total) }) : null);
  function applySettings(gfx) {
    saveSettings(settings); engine.applySettings(settings); mats.setReflections && mats.setReflections(settings.reflections !== 'off' && settings.graphics !== 'low'); crowd.setDensity(DENS[settings.npcs] || 'medium');
    sound.setVolumes({ master: settings.master, film: settings.film, crowd: settings.crowd }); talk.setOptions(settings); voice.setOptions(settings); applyLayout(settings);
    if (gfx && (settings.shadows === 'off') === mats.lightMaps) ui.toast(t('set.restartNote'), 3600);
  }
  applyLayout(settings);
  // ---------- your own video and links ----------
  function pickOwn() { if (window.LumiereMedia) { tablet.open('mine'); return; } $('#file').click(); }
  $('#file').addEventListener('change', (e) => { const f = e.target.files && e.target.files[0]; if (!f) return; shows.loadFile(f, cleanTitle(f.name || 'Video')); ui.toast(t('toast.ownReady'), 2400); if (booking.isOpen()) booking.build(); tablet.refresh(); e.target.value = ''; });
  function useLink(u) { const own = shows.loadURL(u, cleanTitle(decodeURIComponent(u.split('/').pop().split('?')[0]) || 'Link')); ui.toast(t(own.kind === 'youtube' ? 'toast9.youtube' : 'toast.ownReady'), 2600); booking.build(); }
  // ---------- conversations ----------
  function action(a, npc, tk) {
    const [verb, arg] = a.split(':');
    if (verb === 'book' || verb === 'bookOwn') { setTimeout(() => { booking.open({ quick: game === 'quick', own: verb === 'bookOwn' }); if (verb === 'bookOwn') pickOwn(); }, 60); return false; }
    if (verb === 'buy') { if (held) { tk.line(pick('bar.bye') || t('ven.full'), [['opt.thanks', 'end']]); ui.toast(t('toast9.handsFull'), 2400); return true; }
      bill.pay(bill.itemPrice(arg), arg); if (game === 'flow') sound.pay();
      if (npc.role === 'server') { npc.say(pick('srv.order')); npc.gesture('give', 1.2); setTimeout(() => { takeItem(arg); npc.say(pick('srv.hand')); }, 1400); tk.line(pick('srv.back'), [['opt9.order', 'menu'], ['opt9.nothing', 'act:serverBye']]); return true; }
      npc.gesture(/cola|coffee|water/.test(arg) ? 'pour' : 'scoop', 2.2); sound.pour(); setTimeout(() => { npc.gesture('give', 1.2); takeItem(arg); npc.say(pick('bar.ready')); }, 2300); return false; }
    if (verb === 'ticket') { if (!ticket) { tk.line(pick('ush.noTicket'), [['opt.thanks', 'end']]); return true; } checkTicket(npc); return false; }
    if (verb === 'escort') { escort(npc); return false; }
    if (verb === 'ownWay') { world.gate.pass(); npc.say(pick('ush.enjoy')); highlightSeat(); return false; }
    if (verb === 'tablet') { npc.gesture('give', 1.2); npc.say(pick('srv.tablet')); setTimeout(() => tablet.open('remote', { server: true }), 700); return false; }
    if (verb === 'trash') { if (held && held.left <= 0) { binItem(); npc.say(pick('srv.trash')); } else npc.say(pick('srv.bye')); return false; }
    if (verb === 'serverBye') { npc.say(pick('srv.bye')); setTimeout(() => crowd.serverLeave(), 600); return false; }
    return false;
  }
  function startTalk(npc) { crowd.startTalk(npc); talk.start(npc, treeFor(npc, { ticket, game, visits, serverBack: npc.role === 'server' && npc._served })); onModal(true); tut.event('talked'); }
  // the usher reads your ticket and tears the stub; the gate opens. The first time he walks you in; later he asks.
  function checkTicket(npc) {
    ticket.shown = true; npc.gesture('read', 1.6); ui.ticketHandoff && ui.ticketHandoff(ticket); sound.ticket();
    setTimeout(() => { npc.say(pick('ush.check.' + ticket.hall)); npc.gesture('give', 1.0); }, 1500);
    setTimeout(() => { npc.say(pick('ush.tear')); ticket.checked = true; tut.event('showed'); world.gate.pass(12000); if (!settings.seen || !settings.seen.escort) escort(npc); else ui.toast(t('toast9.gateOpen'), 2600); }, 3400);
  }
  function escort(npc) { const h = world.hallById(ticket.hall), s = seatOf(ticket); world.gate.pass(20000); if (crowd.guide(npc, h, s, player)) { npc.say(pick('ush.lead')); ui.toast(t('toast.followUsher', { name: npc.name }), 2600); settings.seen = { ...(settings.seen || {}), escort: true }; saveSettings(settings); } }
  // "locate my seat" (no red arrow, v8 feedback): your seat's reading light glows for a few seconds
  let glowSeat = null, glowT = 0; function highlightSeat() { const s = seatOf(ticket); if (!s) return; glowSeat = s; glowT = 8; }
  // ---------- what you hold ----------
  const itemU = { uAmb: { value: new THREE.Color(0.5, 0.5, 0.5) }, uKey: { value: new THREE.Color(0.4, 0.4, 0.4) }, uKeyDir: { value: new THREE.Vector3(-0.35, 0.8, 0.45).normalize() }, uScreenL: { value: new THREE.Color(0, 0, 0) } }, itemLight = { amb: itemU.uAmb.value, key: itemU.uKey.value, dir: itemU.uKeyDir.value, screen: itemU.uScreenL.value };
  const itemMat = mats.propMat(itemU); let itemMesh = null, itemAnim = 0, itemIn = 0, lightT = 0;
  function takeItem(kind) {
    const k = /cola|water/.test(kind) ? 'drink' : kind === 'coffee' ? 'coffee' : kind === 'nachos' ? 'popcorn' : 'popcorn'; held = { kind: k, left: BITES[k], max: BITES[k], name: kind };
    if (itemMesh) engine.vm.remove(itemMesh); itemMesh = makeHeld(k === 'coffee' ? 'coffee' : k); setHeldMaterial(itemMesh, itemMat); itemMesh.userData.setLevel(1); engine.vm.add(itemMesh); itemIn = 0;
    ui.setItem(k, held.left, held.max); sound.pop(); ui.toast(t('toast.gotPopcorn', { item: t('item.' + kind) }), 2400); tut.event('item');
  }
  function useItem() { if (!held || itemAnim > 0) return; if (held.left <= 0) { ui.toast(t('toast.findBin'), 2400); return; } itemAnim = 1; held.left--; if (held.kind === 'popcorn') sound.crunch(); else sound.sip(held.left === 0); itemMesh.userData.setLevel(held.left / held.max); ui.setItem(held.kind, held.left, held.max); }
  function binItem() { if (!held) return; sound.bin(); engine.vm.remove(itemMesh); itemMesh = null; held = null; ui.setItem(null); ui.toast(t('toast.binned'), 1800); tut.event('binned'); }
  const nearBin = () => world.bins.find((b) => Math.hypot(b.x - player.x, b.z - player.z) < 1.3 && Math.abs((b.y || 0) - player.y) < 1);
  // ---------- restrooms ----------
  let washed = false;
  function useFixture(u) {
    const hold = (ms, f) => { player.locked = true; setTimeout(() => { onModal(); f && f(); }, ms); };
    if (u.kind === 'basin') { sound.water(2.4); hold(2600, () => { washed = true; ui.toast(t('toast.washed'), 2000); }); return; }
    if (u.kind === 'dryer') { sound.dryer(2.2); hold(2500, () => { ui.toast(t(washed ? 'toast.dried' : 'toast.dryFirst'), 2000); washed = false; }); return; }
    player.locked = true; ui.fade(1, 0.4); setTimeout(() => sound.lock(), 450); setTimeout(() => sound.flush(), 1300);
    setTimeout(() => { sound.lock(); ui.fade(0, 0.6); onModal(); ui.toast(t('toast.fresh'), 2000); }, 3200);
  }
  // ---------- tickets ----------
  const ticketView = (tk) => ({ ...tk, hall: String(HALL[tk.hall].no) });
  function bought(tk) {
    const prev = seatOf(ticket); if (prev) { prev.player = false; prev.taken = false; }
    ticket = tk; const s = seatOf(tk); s.player = true; s.taken = true; shows.book(tk.hall, tk.src, tk.delay * 1000, tk.seat);
    ui.showTicket(ticketView(tk), game === 'quick'); sound.ticket(); tut.event('ticket');
    if (game === 'flow') { const b = crowd.staff.box1; if (b) setTimeout(() => b.say(pick('box.ticket')), 500); }
  }
  function fadeTo(dur, cb) { if (fading) return; fading = true; ui.fade(1, dur); setTimeout(() => { try { cb(); } finally { setTimeout(() => { ui.fade(0, 0.7); fading = false; }, 200); } }, dur * 1000 + 40); }
  const seatPose = (s) => ({ x: s.x - Math.sin(s.yaw) * 0.04, y: s.y + SEAT[s.kind].eye, z: s.z - Math.cos(s.yaw) * 0.04, yaw: s.yaw });
  function claim(s) { if (sitRelease) sitRelease(); s.npc = s.npc || 'player'; sitRelease = () => { if (s.npc === 'player') s.npc = null; sitRelease = null; }; }
  function jumpToSeat(seat) { const s = seat || seatOf(ticket); if (!s) return; fadeTo(0.45, () => { claim(s); player.placeSeated(seatPose(s), crowd.laneStand(s)); player.y = s.y; tut.event('seated'); }); }
  function sitSeat(s) { if (s.npc && s.npc !== 'player') return; claim(s); player.sit(seatPose(s), crowd.laneStand(s), () => { sound.thud(); tut.event('seated'); if (ticket && ticket.tablet && game === 'flow') ui.toast(t('toast9.tabletArm'), 3000); }); }
  function sitSpot(sp) { sp.taken = 'player'; if (sitRelease) sitRelease(); sitRelease = () => { if (sp.taken === 'player') sp.taken = null; sitRelease = null; }; player.sit({ x: sp.x, y: sp.y + 0.72, z: sp.z, yaw: sp.face }, sp.stand, () => sound.thud()); }
  function stand() { if (player.standUp(() => { if (sitRelease) sitRelease(); })) sound.thud(); }
  // Quick play: the tablet plays in the hall you are in (or your ticket's), on the seat you sit in
  function remotePlay(o) {
    const hk = room && room.startsWith('hall') ? room : ticket ? ticket.hallKey : 'hallMax', h = world.hallByKey(hk);
    const best = Math.round(h.cfg.rows.length * 0.58), s = (player.seated && h.seats.find((q) => q.npc === 'player')) || (ticket && ticket.hallKey === hk && seatOf(ticket)) || h.seats.filter((q) => !q.taken && !q.npc).sort((p, q) => (Math.abs(p.row - best) * 2 + Math.abs(p.a) * 0.8) - (Math.abs(q.row - best) * 2 + Math.abs(q.a) * 0.8))[0] || h.seats[0];
    const src = o.own ? shows.own : { kind: 'film', filmId: o.film }; if (!src) return false;
    const prev = seatOf(ticket); if (prev && prev !== s) { prev.player = false; prev.taken = false; }
    ticket = { hall: h.id, hallKey: hk, hallName: h.name, seat: s.id, row: s.id.replace(/\d+/, ''), col: s.col, src, title: src.title || '', delay: 0, shown: true, checked: true, tablet: true, quick: game === 'quick' };
    s.player = true; s.taken = true; const st = shows.get(h.id); if (st.state === 'ended' && st.src && !o.own && st.src.filmId === o.film) shows.replay(h.id); else shows.book(h.id, src, 0, s.id, { replay: st.state === 'playing' || st.state === 'ended' }); return true;
  }
  // the seat bell: the server comes with his cart (Flow mode, when you didn't buy the armrest tablet)
  function ringBell() { if (!player.seated || game !== 'flow') return; const s = player.seated && seatOf(ticket); sound.bell(); tut.event('bell');
    if (!s || !crowd.callServer(s, (npc) => { npc._served = true; if (dist(npc) < 3.5) startTalk(npc); })) ui.toast(t('srv.busy'), 2400); else ui.toast(t('toast9.serverComing'), 2400); }
  function handBack() { const s = crowd.staff.server; if (s && s.state === 'serving') { s.say(pick('srv.back')); setTimeout(() => crowd.serverLeave(), 2500); } sound.click(); }
  // the best scenes (strong cues only): a seat rumble and a few sparks before the screen, each with its own switch
  const sparks = makeSparks(engine); function bigScene(id, ev) {
    if (!ticket || ticket.hall !== id || room !== ticket.hallKey || !player.seated) return; const strong = (ev.type === 'climax' || ev.type === 'scare') && (ev.k ?? 1) > 0.7; if (!strong) return;
    if (settings.haptics !== false) { try { if (window.LumiereMedia && window.LumiereMedia.vibrate) window.LumiereMedia.vibrate(JSON.stringify([0, 70, 40, 120, 60, 60]), JSON.stringify([0, 140, 0, 220, 0, 120])); else navigator.vibrate && navigator.vibrate([70, 40, 120]); } catch (e) { /* no vibrator */ } }
    if (settings.particles !== false) sparks.burst(world.hallById(id), shows.avg);
  }
  world.onDoor = (open, door) => { const d = Math.hypot(door.x - player.x, door.z - player.z); if (d < 12 && Math.abs(door.y - player.y) < 3) sound.door(open, 1 - d / 12); };
  world.onLift = (ev) => { if (Math.hypot(LIFT.x0 - player.x, LIFT.z0 - player.z) < 8) { if (ev === 'move') sound.liftHum(); else sound.ding(); } };
  addEventListener('pointerdown', () => sound.unlock(), { capture: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { sound.suspend(); shows.pause(true); } else { sound.resume(); shows.pause(false); } });
  window.__lumiereLifecycle = (s) => { if (s === 'pause') { sound.suspend(); shows.pause(true); } else { sound.resume(); shows.pause(false); } };
  window.__lumiereInsets = (l, r, tp, b) => { const s = document.documentElement.style; s.setProperty('--safe-l', l + 'px'); s.setProperty('--safe-r', r + 'px'); s.setProperty('--safe-t', tp + 'px'); s.setProperty('--safe-b', b + 'px'); };
  // ---------- modes ----------
  function newGame(m) {
    game = m; bill.unlimited = m === 'quick'; bill.reset(); if (ticket) { const s = seatOf(ticket); if (s) { s.player = false; s.taken = false; } } ticket = null; if (held) binItem(); if (sitRelease) sitRelease();
    for (const h of world.halls) if (shows.get(h.id).state !== 'idle') shows._abort(h.id); visits++;
    ui.setButton('#bRemote', m === 'quick');
    if (m === 'flow') { player.place(ARRIVAL.x, ARRIVAL.z, ARRIVAL.yaw, ARRIVAL.pitch, 0); if (!intro.start({ skippable: !!(settings.seen && settings.seen.intro) })) arrived(); }
    else { const s = SPAWN.quick; player.place(s.x, s.z, s.yaw, 0, 0); setTimeout(() => ui.toast(t('toast9.quick'), 3600), 900); }
  }
  function arrived() { player.place(ARRIVAL.x, ARRIVAL.z, ARRIVAL.yaw, ARRIVAL.pitch, 0); settings.seen = { ...(settings.seen || {}), intro: true }; saveSettings(settings); onModal(); ui.toast(t('toast.welcome'), 2600); maybeAskTutorial(); }
  function enterPlay(m) {
    if (mode === 'play') return; ui.fade(1, 0.35);
    setTimeout(() => { if (m || !game) newGame(m || 'flow'); mode = 'play'; ui.showMenu(false); onModal(); bill.onChange(); ui.fade(0, 0.8); try { history.pushState({ lum: 1 }, ''); } catch (e) { /* no history */ } if (!intro.active) maybeAskTutorial(); }, 380);
  }
  function toMenu() { if (intro.active) intro.finish(); mode = 'menu'; onModal(); ui.showMenu(true, !!game); talk.close(); tut.stop(); }
  function maybeAskTutorial() { if (mode === 'play' && game === 'flow' && !settings.tutorialAsked && !settings.tutorialDone && settings.lang) setTimeout(() => ui.askTutorial(), 1400); }
  function startTutorial(fromAsk) { settings.tutorialAsked = true; saveSettings(settings); if (mode !== 'play' || game !== 'flow') enterPlay('flow'); setTimeout(() => tut.start(), fromAsk ? 200 : 900); }
  addEventListener('popstate', () => { if (mode === 'play') { if (talk.open) talk.close(); else if (booking.isOpen()) booking.close(); else if (tablet.isOpen()) tablet.close(); else if ($('#pause').hidden) ui.openPause(); else ui.closeModal('#pause'); try { history.pushState({ lum: 1 }, ''); } catch (e) { /* no history */ } } });
  // ---------- frame ----------
  const fwd = new THREE.Vector3(); let last = performance.now(), slowT = 0, errT = -1e9, audT = 0, curFilm = null, dbg = null; const actors = [];
  function frame(now) {
    requestAnimationFrame(frame); const dt = Math.min(0.05, (now - last) / 1000); last = now; G.uTime.value = now / 1000; const c0 = performance.now();
    try { step(dt, now); } catch (e) { if (now - errT > 5000) { errT = now; console.error('[lumiere] frame update failed (rendering anyway):', e); } }
    engine.stats.cpu = engine.stats.cpu * 0.92 + (performance.now() - c0) * 0.08; engine.governor(dt, now);
    shows.frame(engine.camera, engine.renderer); engine.render();
  }
  function menuCam(now) { const k = now / 1000 * 0.04, cam = engine.camera; cam.position.set(Math.sin(k) * 7, 2.6 + Math.sin(k * 2.1) * 0.3, 6 + Math.cos(k) * 5); cam.lookAt(Math.sin(k + 1.4) * 3, 2.2, 0); player.x = cam.position.x; player.z = cam.position.z; player.y = 0; }
  function step(dt, now) {
    if (dbg) { const c = engine.camera; c.position.set(dbg[0], dbg[1], dbg[2]); c.rotation.set(dbg[4] || 0, dbg[3] || 0, 0); player.x = dbg[0]; player.z = dbg[2]; player.y = dbg[1] - 1.62; }
    else if (mode === 'menu') menuCam(now); else if (!intro.active) { player.dyn = crowd.bodiesNear(player.x, player.z, 2.5); player.update(dt); }
    intro.update(dt, player);
    const r = (mode === 'menu' && !dbg) ? 'lobby' : world.roomAt(player.x, player.y, player.z) || room; if (r !== room && r === 'lobby' && room === 'street' && game === 'flow') { const h = crowd.staff.host; if (h) setTimeout(() => h.say(pick(visits > 1 ? 'host.back' : 'host.hello')), 600); } room = r;
    const cam = engine.camera; world.setVisibility(r, cam.position.x, cam.position.y, cam.position.z);
    const watching = mode === 'play' && !!player.seated && r.startsWith('hall') && shows.isOn(world.hallByKey(r).id);
    engine.setZoom(watching ? 0.8 : 1, dt); document.body.classList.toggle('watching', watching); engine.showMode && engine.showMode(watching);
    actors.length = 0; actors.push(player); for (const a of crowd.agents) if (a.path) actors.push(a);
    world.update(dt, actors, now);
    for (const h of world.halls) if (h.room.group.visible) h.updateLOD(cam, false, engine.preset.seatLod * (engine.lodK || 1));
    crowd.update(dt, now, player, world.vis); shows.update(dt, now, r, world.vis);
    const lvl = sound.level(); shows.spread += (clamp(((lvl ?? -60) + 30) / 18) - shows.spread) * Math.min(1, dt * 2); director.update(dt, now, lvl, shows.lum);
    sparks.update(dt);
    // the film follows you: through the hall's doors, quieter and duller outside
    audT -= dt; if (audT <= 0) { audT = 0.25; let want = null; for (const h of world.halls) if (shows.isOn(h.id) && shows.get(h.id).pic) { const a = h.key === r ? 1 : world.vis.has(h.key) ? 0.22 : 0; if (a > 0 && (!want || a > want.a)) want = { a, h }; }
      const key = want ? want.h.key : null; if (key !== curFilm) { curFilm = key; if (!key) sound.stopFilm(); } curFilm && (sound._aud = want.a); }
    const hk = r.startsWith('hall') ? r : null, dark = hk && world.hallByKey(hk).room.U.uHouse.value < 0.5;
    sound.setListener({ room: r, x: player.x, z: player.z, yaw: player.yaw, filmAud: curFilm ? sound._aud || 0 : 0, filmLP: curFilm === hk ? 18000 : 1200, crowdLP: hk ? 18000 : 2500, verb: hk ? 0.45 : r === 'corridor' ? 0.25 : 0.12, dark,
      people: Math.min(1, crowd.agents.filter((a) => a.ch && a.ch.group.visible && dist(a) < 12).length / 10), popcornDist: Math.hypot(player.x - (COUNTERS.concessions.x0 - 1), player.z + 5), escDist: Math.hypot(player.x - 10.7, player.z - (ESC.up.zBot - 4)), seated: !!player.seated });
    sound.setHead(cam.position.x, cam.position.y, cam.position.z, player.yaw, player.pitch);
    // held item
    if (itemMesh) { lightT -= dt; if (lightT <= 0) { lightT = 0.3; crowd.lightAt(player.x, player.y + 1.3, player.z, itemLight); } itemIn = Math.min(1, itemIn + dt * 3); itemAnim = Math.max(0, itemAnim - dt * 1.6); const e = Math.sin(itemAnim * Math.PI);
      itemMesh.position.set(0.27 - e * 0.1, -0.3 - (1 - itemIn) * 0.3 + e * 0.17, -0.55 + e * 0.2); itemMesh.rotation.set(0.22 + e * 0.75, -0.35, e * 0.15); itemMesh.scale.setScalar(1.25); }
    if (glowSeat) { glowT -= dt; if (glowT <= 0) glowSeat = null; }
    prompts(r, hk);
    ui.setButton('#bBell', mode === 'play' && game === 'flow' && !!player.seated && !!hk && !modal && !(ticket && ticket.tablet));
    ui.setButton('#bRemote', mode === 'play' && (game === 'quick' || (!!player.seated && !!ticket && ticket.tablet)));
    talk.update(dt, cam, innerWidth, innerHeight); voice.update(); tut.update(dt); if (world.vis.has('lobby')) { led(now); board(now); }
    slowT -= dt; if (slowT <= 0) { slowT = 0.5;
      const S = (id) => shows.get(id), status = (id) => { const s = S(id); return s.state === 'pending' ? t('show.pending', { time: fmtTime(shows.countdown(id) - 10) }) : s.state === 'countdown' ? t('show9.countdown') : s.state === 'playing' ? (shows.buffering ? t('show.buffering') : t('show.playing')) : s.state === 'ended' ? t('show.ended') : t('show.idle'); };
      if (hk) { const h = world.hallByKey(hk); ui.setWhere(h.name, S(h.id).state === 'idle' ? t('show.none') : `${shows.title(h.id)} · ${status(h.id)}`); } else ui.setWhere(t('room9.' + r), '');
      if (ticket && ticket.title) { const s = S(ticket.hall); ui.setTicketChip(t('ticket9.chip', { screen: ticket.hallName.replace('LUMIERE ', ''), seat: ticket.seat }) + (s.state === 'pending' ? ' · ' + fmtTime(shows.countdown(ticket.hall) - 10) : '')); } else ui.setTicketChip(null);
      ui.setFps(`${engine.stats.fps.toFixed(0)} fps · ${engine.stats.scale.toFixed(2)}x · ${engine.renderer.info.render.calls} dc`); }
  }
  // what can I do here? (the crosshair in the middle picks what you look at)
  function prompts(r, hk) {
    if (mode !== 'play' || talk.open || modal || intro.active) { ui.setPrompt(null); return; }
    if (player.seated) { ui.setPrompt(player.busy ? null : t('hud.stand'), () => stand()); return; }
    if (player.busy) { ui.setPrompt(null); return; }
    engine.camera.getWorldDirection(fwd); const fl = Math.hypot(fwd.x, fwd.z) || 1, fx = fwd.x / fl, fz = fwd.z / fl, ahead = (x, z, k = 0.3) => { const dx = x - player.x, dz = z - player.z, d = Math.hypot(dx, dz) || 1; return (dx * fx + dz * fz) / d > k; };
    const npc = crowd.talkTarget(player.x, player.y, player.z, fx, fz); if (npc && dist(npc) < 2.6) { ui.setPrompt(t('hud.talk', { name: npc.name }), () => startTalk(npc)); return; }
    if (held && held.left <= 0 && nearBin()) { ui.setPrompt(t('hud.bin'), () => binItem()); return; }
    if (r === 'wc') { const u = world.uses.find((q) => Math.hypot(q.x - player.x, q.z - player.z) < 1.0 && ahead(q.x, q.z, 0.2)); if (u) { ui.setPrompt(t('hud.' + u.kind), () => useFixture(u)); return; } }
    const L = world.lift; if (r === 'lobby') { if (L.inside(player.x, player.z)) { const to = L.level ? 0 : 1; ui.setPrompt(t(to ? 'hud9.liftUp' : 'hud9.liftDown'), () => { L.call(to); sound.click(); }); return; }
      for (const k of [0, 1]) if (L.atDoor(player.x, player.y, player.z, k) && (L.level !== k || L.state !== 'idle')) { ui.setPrompt(t('hud9.liftCall'), () => { L.call(k); sound.click(); }); return; } }
    if (hk) { const h = world.hallByKey(hk); let best = null, bd = 1.5;
      for (const s of h.seats) { const d = Math.hypot(s.x - player.x, s.z - player.z); if (d > bd || Math.abs(s.y - player.y) > 0.6 || !ahead(s.x, s.z, 0.2)) continue; const mine = ticket && ticket.seat === s.id && ticket.hall === h.id; if (game === 'flow' && !mine) continue; if (s.npc && s.npc !== 'player') continue; best = s; bd = d; }
      if (best) { const mine = ticket && ticket.seat === best.id && ticket.hall === h.id; ui.setPrompt(mine ? t('hud.yourSeat', { seat: best.id }) : t('hud9.sitHere', { seat: best.id }), () => { if (!mine) { const tk = { hall: h.id, hallKey: hk, hallName: h.name, seat: best.id, row: best.id.replace(/\d+/, ''), col: best.col, src: ticket && ticket.src, title: ticket ? ticket.title : '', delay: 0, shown: true, checked: true, tablet: true, quick: true }; const prev = seatOf(ticket); if (prev) { prev.player = false; prev.taken = false; } ticket = tk; best.player = true; best.taken = true; } sitSeat(best); }); return; } }
    ui.setPrompt(null);
  }
  // warm every room's shaders and textures while the loader is up (no hitch when you walk into a room for the first time)
  { const R = engine.renderer, seen = new Set(), shown = Object.values(world.rooms).map((rm) => [rm, rm.group.visible]); for (const [rm] of shown) rm.group.visible = true;
    try { R.compile(engine.scene, engine.camera); engine.scene.traverse((o) => { for (const m of [].concat(o.material || [])) for (const u of Object.values(m.uniforms || {})) { const v = u && u.value; if (v && v.isTexture && !seen.has(v)) { seen.add(v); R.initTexture(v); } } }); } catch (e) { console.warn('warm-up skipped', e); }
    for (const [rm, v] of shown) rm.group.visible = v; }
  prog(1); const hold = Math.max(0, 2600 - (performance.now() - t0));
  requestAnimationFrame((tt) => { last = tt; frame(tt); setTimeout(() => { $('#loader').classList.add('gone'); ui.fade(0, 0.9); if (mode !== 'play') { ui.showMenu(true, false); onModal(); } if (!settings.lang) ui.openLang(); setTimeout(() => $('#loader') && $('#loader').remove(), 900); }, 120 + hold); });
  if (Q.get('play')) setTimeout(() => enterPlay(Q.get('play') === 'quick' ? 'quick' : 'flow'), 300);
  window.__lumiere = { engine, world, player, shows, sound, voice, intro, ui, crowd, talk, mats, director, settings, bill, booking, tablet, buildMs: performance.now() - t0,
    get ticket() { return ticket; }, get game() { return game; }, get mode() { return mode; }, book: (tk) => bought(tk), jumpToSeat, sitSeat, startTalk, takeItem, useItem, binItem, enterPlay, toMenu, newGame, remotePlay,
    pose: (p) => { dbg = p; }, debugCam: (c) => { dbg = c ? [c.p[0], c.p[1], c.p[2], 0, 0] : null; }, ready: true };
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
