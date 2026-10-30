// LUMIERE v8 - boot, game flow (loader -> menu -> Story or Quick -> pause), interaction rules and the frame loop.
// Story: you arrive outside, buy a ticket at the box office (money is limited; the ATM tops it up), show the ticket to the guide, who walks
// you to your own seat (the only seat you can take); the bell by your seat calls a server with the tablet. Quick: unlimited money, you start
// in your seat with the tablet in hand. Every film plays through the phone's own video layer (videolayer.js).
import * as THREE from 'three';
import { Engine } from './engine.js';
import { Materials, G } from './materials.js';
const FOG_OUT = new THREE.Color(0x111724), FOG_IN = new THREE.Color(0x0b0b0e);
import { buildWorld } from './world.js';
import { texturesReady } from './library.js';
import { loadAssets, ASSET_LIST, ASSETS } from './assets.js';
import { loadBakes } from './lightmap.js';
import { makeRain } from './rain.js';
import { Player } from './player.js';
import { Sound } from './sound.js';
import { Shows } from './film.js';
import { Director } from './react.js';
import { UI } from './ui.js';
import { Booking } from './booking.js';
import { Wallet } from './wallet.js';
import { Tablet } from './tablet.js';
import { Atm } from './atm.js';
import { Tutorial } from './tutorial.js';
import { LayoutEditor, applyLayout } from './layoutedit.js';
import { Crowd } from './npc.js';
import { Talk } from './talk.js';
import { treeFor } from './dialogue.js';
import { makeHeld, setHeldMaterial } from './held.js';
import { cleanTitle } from './films.js';
import { loadSettings, saveSettings, presetFor } from './settings.js';
import { setLang, t, fmtTime } from './i18n.js';
import { hallById, hallByKey, HALL_DOORS, roomAt, GAL, PLAYER_START } from './layout.js';
import { makeLedWall } from './ledwall.js';
const $ = (s) => document.querySelector(s), clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), smooth = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
const BITES = { popcorn: 9, drink: 8, coffee: 6 };
async function boot() {
  const settings = loadSettings(), Q = new URLSearchParams(location.search), nav = (navigator.language || 'en').slice(0, 2);
  setLang(settings.lang || (['hi', 'ur', 'es'].includes(nav) ? nav : 'en'));
  const portrait = () => $('#rotate').classList.toggle('need', innerHeight > innerWidth * 1.1); portrait(); addEventListener('resize', portrait);
  const prog = (p) => { $('#ldFill').style.width = (p * 100).toFixed(0) + '%'; };
  try { await Promise.race([Promise.all([document.fonts.load('600 40px Inter'), document.fonts.load('400 14px Inter')]), new Promise((r) => setTimeout(r, 2500))]); } catch (e) {}
  const engine = new Engine($('#gl'), settings), lowG = settings.graphics === 'low', mats = new Materials({ renderer: engine.renderer, normalMaps: !lowG, reflections: !lowG && settings.reflections !== 'off', texSize: lowG ? 256 : 512 }); engine.applySettings(settings);
  // Cycles light maps (lightmap.js, the baked shadows) unless Low or "Shadows: off"; ?nobake=1 builds without them (tools/bake/export.mjs)
  mats.lightMaps = !lowG && settings.shadows !== 'off' && !Q.get('nobake');
  const t0 = performance.now(); await Promise.all([loadAssets(ASSET_LIST), mats.lightMaps ? loadBakes() : null]); const world = await buildWorld(engine, mats, prog); await texturesReady();
  prog(0.97); await new Promise((r) => requestAnimationFrame(r));
  const rain = makeRain(world.rooms.street, { count: lowG ? 1800 : 4000 }); world.rooms.street.U.uWet.value = 1;   // night rain and wet paving outside
  const sound = new Sound(); sound.setVolumes({ master: settings.master, film: settings.film, crowd: settings.crowd });
  const wallet = new Wallet(settings.lang);
  let ticket = null, room = 'street', talk = null, ui = null, shows = null, crowd = null, mode = 'menu', game = null, modal = false, held = null, markerPulse = 0, paused = false;
  const player = new Player(engine, world, settings); player.attach($('#gl'), $('#stick'), $('#knob'), $('#sprint')); player.place(PLAYER_START.x, PLAYER_START.z, PLAYER_START.yaw, PLAYER_START.pitch);
  player.onStep = (s) => sound.step(s, /hall|pass/.test(room));
  const dist = (n) => Math.hypot(n.x - player.x, n.z - player.z), hallOf = (tk) => world.hallById(tk.hall), seatOf = (tk) => hallOf(tk).seats.find((s) => s.id === tk.seat);
  // ---------- hall audibility: continuous, from where you stand (in the hall, at its padded doors in the gallery, in the tunnel to the IMAX) ----------
  const doorOf = (key) => world.doors.find((d) => d.key === key);
  function audibility(hallKey) {
    if (!hallKey) return { g: 0, lp: 400 }; const H = hallByKey(hallKey); if (room === hallKey) return { g: player.seated ? 1 : 0.92, lp: 18000 };
    let best = { g: room === 'lobby' ? 0.004 : 0, lp: 400 };
    for (const d of HALL_DOORS) { if (d.hall !== H.id) continue; const dd = Math.hypot(player.x - d.x, player.z - d.z); let g = 0, lp = 400;
      if (room === d.room && d.open) { const k = smooth(9, 0.6, dd); g = 0.06 + 0.55 * k; lp = 1200 + 9000 * k * k; }
      else if (room === d.room) { const door = doorOf(d.hall + ':' + d.kind), open = door ? door.open : 0; g = (0.01 + 0.22 * open) * smooth(14, 1, dd) + 0.003; lp = 500 + 3500 * open; }
      else if (room === 'gal' && d.room === 'tunnel') { g = 0.035 * smooth(22, 2, Math.hypot(player.x, player.z - GAL.z0)); lp = 700; }
      if (g > best.g) best = { g, lp }; }
    return best;
  }
  // ---------- people ----------
  crowd = new Crowd(world, mats, engine, {
    bubble: (n, text, dur) => settings.bubbles && talk && talk.bubble(n, text, dur),
    crowdSound: (hallId, type, n, k, x, z) => { const a = audibility(hallById(hallId).key); if (a.g > 0.05) sound.crowd(type, n, k * Math.min(1, a.g * 1.3), x, z); },
    guideDone: () => { ui.toast(t('ush.arrive', { row: ticket ? ticket.row : '', seat: ticket ? ticket.col : '' }), 3200); markerPulse = 6; tut.event('escorted'); },
    nearViewer: (vs) => { let best = null, bd = 4.5; for (const v of vs) { if (!v.agent) continue; const d = Math.hypot(v.seat.x - player.x, v.seat.z - player.z); if (d < bd) { bd = d; best = v; } } return best; },
  });
  crowd.init(); crowd.setDensity(settings.npcs);
  const director = new Director((id, ev) => crowd.onFilmEvent(id, ev));
  shows = new Shows(world, sound, crowd, director, engine, {
    onBegin: (id) => { if (ticket && ticket.hall === id) ui.toast(room === ticket.hallKey ? t('toast.lightsDown') : t('toast.starting', { screen: ticket.hallName }), 3200); },
    onEnd: (id, applause) => { if (ticket && ticket.hall === id) { if (applause) ui.toast(t('toast.end'), 3600); endTicket(); } },
    onError: (src) => ui.toast(t(src === 'user' ? 'toast.videoError' : 'toast.streamError'), 5200, 'error'), silenceText: () => t('pre.silence'),
  });
  talk = new Talk(sound, { action: (a, npc, tk) => action(a, npc, tk), distance: dist, closed: (npc) => { crowd.endTalk(npc); if (npc && npc.role === 'server' && !tablet.isOpen()) crowd.serverLeave(); modal = ui.modalOpen(); player.locked = modal || mode !== 'play'; } }, settings);
  const onModal = (m) => { modal = m || talk.open || ui.modalOpen(); player.locked = modal || mode !== 'play'; };
  ui = new UI(world, shows, sound, settings, {
    onModal, ticketInfo: () => ticket && ui.showTicket(ticket, game === 'quick'), jumpToSeat: () => jumpToSeat(), useItem: () => useItem(),
    onSettings: (gfx) => applySettings(gfx), onPreset: (g) => Object.assign(settings, presetFor(g)),
    onPlay: (m) => enterPlay(m), onQuit: () => toMenu(), onPause: (p) => { paused = p; }, onHide: () => {}, onLangPicked: () => maybeAskTutorial(), onLangChanged: () => {},
    openRemote: () => tablet.open('remote'), ringBell: () => ringBell(), onTutorial: (fromAsk) => startTutorial(fromAsk), editLayout: () => layoutEd.open(),
  });
  const booking = new Booking(world, shows, sound, wallet, { onModal, toast: (m, ms, k) => ui.toast(m, ms, k), onTicket: (tk) => bought(tk), pickOwn: () => pickOwn(), useLink: (u) => useLink(u) });
  const tablet = new Tablet(shows, sound, wallet, settings, { onModal, toast: (m, ms, k) => ui.toast(m, ms, k), pickOwn: () => pickOwn(), playFilm: (o) => remotePlay(o), handBack: () => handBack(), quick: () => game === 'quick' });
  const atm = new Atm(wallet, sound, { onModal, toast: (m, ms, k) => ui.toast(m, ms, k) });
  const layoutEd = new LayoutEditor(settings, sound, { onModal, save: () => { saveSettings(settings); applyLayout(settings); } });
  const tut = new Tutorial(settings, sound, { save: () => saveSettings(settings), state: () => ({ ticket, held, seated: !!player.seated, room, game }) });
  wallet.onChange = () => ui.setWallet(game === 'story' ? wallet.fmt(wallet.cash) : null);
  function applySettings(gfx) {
    saveSettings(settings); engine.applySettings(settings); mats.setReflections && mats.setReflections(settings.reflections !== 'off' && settings.graphics !== 'low'); crowd.setDensity(settings.npcs);
    sound.setVolumes({ master: settings.master, film: settings.film, crowd: settings.crowd }); talk.setOptions(settings); applyLayout(settings);
    if (gfx && (settings.shadows === 'off') !== !mats.lightMaps) ui.toast(t('set.restartNote'), 3600);
  }
  applyLayout(settings);
  // ---------- your own video: the tablet's gallery (Android media bridge) or the system picker; links play like the films ----------
  function pickOwn() { if (window.LumiereMedia) { tablet.open('gallery'); return; } $('#file').click(); }
  $('#file').addEventListener('change', (e) => { const f = e.target.files && e.target.files[0]; if (!f) return; const label = cleanTitle(f.name || 'Video'); shows.loadFile(f, label); ui.toast(t('toast.ownReady'), 3000); if (booking.isOpen()) booking.build(); tablet.refresh(); e.target.value = ''; });
  tablet.onLocal = (url, name) => { shows.loadLocal(url, cleanTitle(name)); ui.toast(t('toast.ownReady'), 3000); if (booking.isOpen()) booking.build(); };
  function useLink(u) { shows.loadURL(u, cleanTitle(decodeURIComponent(u.split('/').pop().split('?')[0]) || 'Link')); ui.toast(t('toast.ownReady'), 3000); booking.build(); }
  // ---------- conversations ----------
  function action(a, npc, tk) {
    const [verb, arg] = a.split(':');
    if (verb === 'reserve') { setTimeout(() => booking.open({ quick: game === 'quick' }), 50); return false; }
    if (verb === 'guide') { if (!ticket) { tk.line(t('ush.noTicket'), [['opt.thanks', 'end']]); return true; } showTicketTo(npc); return false; }
    if (verb === 'buy') { const kind = arg; if (held) { tk.line(t(held.left > 0 ? 'ven.full' : 'ven.binFirst'), [['opt.thanks', 'end']]); return true; } const price = wallet.itemPrice(kind);
      if (!wallet.pay(price, kind)) { tk.line(t('ven.short', { price: wallet.fmt(price) }), [['opt.thanks', 'end']]); return true; }
      if (npc.role === 'server') { npc.say(t('srv.order'), 2.2); npc.gesture('give', 1.2, 'smile'); setTimeout(() => { takeItem(kind); crowd.serverLeave(); }, 1300); } else crowd.serve(npc, kind, () => takeItem(kind)); if (game === 'story') ui.toast(t('toast.paid', { price: wallet.fmt(price) }), 2000); return false; }
    if (verb === 'tablet') { setTimeout(() => tablet.open('remote', { server: true }), 60); return false; }
    return false;
  }
  function startTalk(npc) { crowd.startTalk(npc); talk.start(npc, treeFor(npc, { ticket, game, wallet, held })); modal = true; player.locked = true; tut.event('talked'); }
  // the guide reads your ticket, then walks you to your seat (your pace: he waits when you fall behind and never makes you wait)
  function showTicketTo(npc) {
    ticket.shown = true; ui.ticketHandoff && ui.ticketHandoff(ticket); crowd.readTicket && crowd.readTicket(npc, ticket);
    setTimeout(() => { const h = hallOf(ticket), s = seatOf(ticket); if (crowd.guide(npc, h, s)) { ui.toast(t('toast.followUsher', { name: npc.name }), 2600); tut.event('showed'); } else ui.toast(t('ush.blocked'), 3000); }, 1700);
  }
  // ---------- held item (view model, drawn over everything: engine.vm) ----------
  const itemU = { uAmb: { value: new THREE.Color(0.5, 0.5, 0.5) }, uKey: { value: new THREE.Color(0.4, 0.4, 0.4) }, uKeyDir: { value: new THREE.Vector3(-0.35, 0.8, 0.45).normalize() }, uScreenL: { value: new THREE.Color(0, 0, 0) } }, itemLight = { amb: itemU.uAmb.value, key: itemU.uKey.value, dir: new THREE.Vector3(), screen: itemU.uScreenL.value };
  const itemMat = mats.propMat(itemU); let itemMesh = null, itemAnim = 0, itemIn = 0;
  function takeItem(kind) {
    const k = /cola|mocktail|water/.test(kind) ? 'drink' : kind === 'coffee' ? 'coffee' : 'popcorn'; held = { kind: k, left: BITES[k], max: BITES[k], name: kind };
    if (itemMesh) engine.vm.remove(itemMesh); itemMesh = makeHeld(k); setHeldMaterial(itemMesh, itemMat); itemMesh.userData.setLevel(1); engine.vm.add(itemMesh); itemIn = 0;
    ui.setItem(k, held.left, held.max); sound.pop(); ui.toast(t('toast.gotPopcorn', { item: t('item.' + kind) }), 2600); tut.event('item');
  }
  function useItem() {
    if (!held || itemAnim > 0) return; if (held.left <= 0) { ui.toast(t('toast.findBin'), 2400); return; }
    itemAnim = 1; held.left--; if (held.kind === 'popcorn') sound.crunch(); else sound.sip(held.left === 0);
    itemMesh.userData.setLevel(held.left / held.max); ui.setItem(held.kind, held.left, held.max); if (held.left === 0) setTimeout(() => ui.toast(t(held.kind === 'popcorn' ? 'toast.emptyPop' : 'toast.emptyCup'), 2600), 600);
  }
  function binItem() { if (!held) return; sound.bin(); engine.vm.remove(itemMesh); itemMesh = null; held = null; ui.setItem(null); ui.toast(t('toast.binned'), 1800); tut.event('binned'); }
  const nearBin = () => world.bins.find((b) => Math.hypot(b.x - player.x, b.z - player.z) < 1.3);
  // ---------- tickets: bought at the box office, read by the guide, your seat marked in the hall ----------
  const marker = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.fillStyle = '#ff4d5a'; g.beginPath(); g.moveTo(32, 58); g.lineTo(10, 26); g.lineTo(24, 26); g.lineTo(24, 6); g.lineTo(40, 6); g.lineTo(40, 26); g.lineTo(54, 26); g.closePath(); g.fill(); const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, depthWrite: false, depthTest: false, toneMapped: false })); s.scale.set(0.32, 0.32, 1); s.visible = false; s.renderOrder = 20; engine.scene.add(s); return s; })();
  function bought(tk) {
    if (ticket) { const ps = seatOf(ticket); if (ps) { ps.player = false; ps.taken = false; } }
    ticket = tk; const s = seatOf(tk); s.player = true; s.taken = true; shows.book(tk.hall, tk.own ? 'own' : 'film', tk.film, tk.delay * 1000, tk.seat, tk.title);
    ui.showTicket(tk, game === 'quick'); tut.event('ticket');
    if (game === 'story') crowd.staff.eloise && setTimeout(() => crowd.staff.eloise.say(t('rec.booked'), 3.6), 600);
  }
  function endTicket() { if (!ticket) return; const s = seatOf(ticket); if (s) { s.player = false; s.taken = false; } ticket = null; marker.visible = false; }
  let fading = false;
  function fadeTo(dur, cb) { if (fading) return; fading = true; ui.fade(1, dur); setTimeout(() => { try { cb(); } finally { setTimeout(() => { ui.fade(0, 0.7); fading = false; }, 200); } }, dur * 1000 + 40); }
  function seatPose(h, s) { const H = h.cfg, eye = H.seat.eye; return { x: s.x - Math.sin(s.yaw) * 0.04, y: s.y + eye, z: s.z - Math.cos(s.yaw) * 0.04, yaw: s.yaw }; }
  function jumpToSeat() { if (!ticket) return; const h = hallOf(ticket), s = seatOf(ticket); fadeTo(0.45, () => { if (sitRelease) { sitRelease(); sitRelease = null; } player.placeSeated(seatPose(h, s), crowd.laneStand({ seat: s, hall: h })); sitRelease = () => { if (s.npc === 'player') s.npc = null; }; s.npc = s.npc || 'player'; sound.setVolumes({}); }); }
  // ---------- the tablet: remote in Quick mode, the server's tablet in Story ----------
  function remotePlay(o) {   // play another film / your video from the tablet: Quick books it in your current hall and seat, Story charges for it
    const hk = room.startsWith('hall') ? room : ticket ? ticket.hallKey : 'hallII', h = world.hallByKey(hk), s = ticket && ticket.hallKey === hk ? seatOf(ticket) : h.seats.find((q) => q.player) || h.seats[Math.floor(h.seats.length / 2)];
    if (game === 'story' && !wallet.pay(wallet.P.replay, 'replay')) { ui.toast(t('book.short'), 3000, 'error'); return false; }
    const tk = { hall: h.cfg.id, hallKey: h.cfg.key, hallName: h.cfg.name, kind: h.cfg.kind, film: o.own ? null : o.film, own: !!o.own, title: o.own ? (shows.own ? shows.own.label : '') : o.title, seat: s.id, row: s.id.replace(/\d+/, ''), col: s.col, delay: 0, price: 0, shown: true };
    if (ticket) { const ps = seatOf(ticket); if (ps && ps !== s) { ps.player = false; ps.taken = false; } } ticket = tk; s.player = true; s.taken = true; shows.book(tk.hall, tk.own ? 'own' : 'film', tk.film, 0, tk.seat, tk.title); return true;
  }
  function ringBell() { if (!player.seated || game !== 'story') return; sound.bell(); if (!crowd.callServer || !crowd.callServer(player, (npc) => { modal = true; player.locked = true; crowd.startTalk(npc); talk.start(npc, treeFor(npc, { ticket, game, wallet, held, server: true })); })) ui.toast(t('srv.busy'), 2400); tut.event('bell'); }
  function handBack() { crowd.serverLeave && crowd.serverLeave(); sound.click(); }
  // ---------- sitting: only your own seat (phone feedback), sofas and benches anywhere ----------
  let sitRelease = null;
  function sitSeat(h, s) { if (s.npc && s.npc !== 'player') return; s.npc = 'player'; sitRelease = () => { if (s.npc === 'player') s.npc = null; }; player.sit(seatPose(h, s), crowd.laneStand({ seat: s, hall: h }), () => { sound.thud(); tut.event('seated'); }); }
  function sitSpot(sp) { sp.taken = 'player'; sitRelease = () => { if (sp.taken === 'player') sp.taken = null; }; player.sit({ x: sp.x, y: sp.y + 0.72, z: sp.z, yaw: sp.face + Math.PI }, sp.stand, () => sound.thud()); }
  function stand() { if (player.standUp(() => { if (sitRelease) { sitRelease(); sitRelease = null; } })) sound.thud(); }
  world.onDoor = (open, door) => { const d = Math.hypot(door.x - player.x, door.z - player.z); if (d < 12) sound.door(open, 1 - d / 12); };
  addEventListener('pointerdown', () => sound.unlock(), { capture: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { sound.suspend(); shows.pause(true); } else { sound.resume(); shows.pause(false); } });
  // ---------- flow: menu (live flythrough) <-> play. A new Story or Quick game resets money, ticket and item ----------
  function newGame(m) {
    game = m; wallet.unlimited = m === 'quick'; wallet.reset(); endTicket(); if (held) binItem(); if (sitRelease) { sitRelease(); sitRelease = null; }
    for (const h of world.halls) if (shows.get(h.id).state !== 'idle') shows._abort(h.id);
    ui.setButton('#bRemote', m === 'quick');
    if (m === 'story') { player.place(PLAYER_START.x, PLAYER_START.z, PLAYER_START.yaw, PLAYER_START.pitch); ui.toast(t('toast.welcome'), 2600); }
    else { const h = world.hallByKey('hallII'); booking.sel.hall = h.cfg.id; booking.pickSeat(); const s = h.seats.find((q) => q.id === booking.sel.seat) || h.seats[0];
      player.placeSeated(seatPose(h, s), crowd.laneStand({ seat: s, hall: h })); s.npc = 'player'; s.player = true; s.taken = true; sitRelease = () => { if (s.npc === 'player') s.npc = null; };
      ticket = { hall: h.cfg.id, hallKey: h.cfg.key, hallName: h.cfg.name, kind: h.cfg.kind, film: null, own: false, title: '', seat: s.id, row: s.id.replace(/\d+/, ''), col: s.col, delay: 0, price: 0, shown: true, quick: true };
      setTimeout(() => tablet.open('remote'), 700); }
  }
  function enterPlay(m) {
    if (mode === 'play') return; ui.fade(1, 0.35);
    setTimeout(() => { if (m || !game) newGame(m || 'story'); mode = 'play'; ui.showMenu(false); player.locked = false; wallet.onChange(); ui.fade(0, 0.8); try { history.pushState({ lum: 1 }, ''); } catch (e) {} maybeAskTutorial(); }, 380);
  }
  function toMenu() { mode = 'menu'; player.locked = true; ui.showMenu(true, !!game); talk.close(); tut.stop(); }
  function maybeAskTutorial() { if (mode === 'play' && game === 'story' && !settings.tutorialAsked && !settings.tutorialDone && settings.lang) setTimeout(() => ui.askTutorial(), 1200); }
  function startTutorial(fromAsk) { settings.tutorialAsked = true; saveSettings(settings); if (mode !== 'play' || game !== 'story') enterPlay('story'); setTimeout(() => tut.start(), fromAsk ? 200 : 900); }
  addEventListener('popstate', () => { if (mode === 'play') { if (talk.open) talk.close(); else if (booking.isOpen()) booking.close(); else if (tablet.isOpen()) tablet.close(); else if ($('#pause').hidden) ui.openPause(); else ui.closeModal('#pause'); try { history.pushState({ lum: 1 }, ''); } catch (e) {} } });
  // ---------- frame loop ----------
  const fwd = new THREE.Vector3(); let last = performance.now(), slowT = 0, lightT = 0, errT = -1e9, audT = 0, curFilmHall = null;
  const actors = [player]; let dbgCam = null;
  function frame(now) {
    requestAnimationFrame(frame); const dt = Math.min(0.05, (now - last) / 1000); last = now; G.uTime.value = now / 1000; const c0 = performance.now();
    try { step(dt, now); } catch (e) { if (now - errT > 5000) { errT = now; console.error('[lumiere] frame update failed (rendering anyway):', e); } }
    engine.stats.cpu = engine.stats.cpu * 0.92 + (performance.now() - c0) * 0.08; engine.governor(dt, now);
    shows.frame(engine.camera, innerWidth, innerHeight); engine.render();
  }
  function menuCam(now) { const k = now / 1000 * 0.045, cam = engine.camera; cam.position.set(Math.sin(k) * 6.5, 2.3 + Math.sin(k * 2.1) * 0.25, 10.5 + Math.cos(k) * 6); cam.lookAt(Math.sin(k + 1.2) * 2, 1.7, 7.5); player.x = cam.position.x; player.z = cam.position.z; }
  function step(dt, now) {
    if (mode === 'menu') menuCam(now); else { player.dyn = crowd.bodiesNear ? crowd.bodiesNear(player.x, player.z, 2.5) : null; player.update(dt); }
    if (dbgCam) { engine.camera.position.set(...dbgCam.p); engine.camera.lookAt(...dbgCam.t); }   // test tools only (window.__lumiere.debugCam)
    engine.setZoom(mode === 'play' && player.seated && !player.busy && room.startsWith('hall') ? 0.74 : 1, dt);
    document.body.classList.toggle('watching', mode === 'play' && !!player.seated && room.startsWith('hall') && shows.isOn(world.hallByKey(room).id));
    const r = mode === 'menu' ? 'lobby' : roomAt(player.x, player.z); room = r; world.setVisibility(r, player.x, player.z);
    // distance fog: outside, a night rain haze softens the street (and hides the end of the render distance); indoors it stays far away
    { const out = r === 'street', k = 1 - Math.exp(-dt * 1.5), far = Math.min(engine.viewFar - 4, out ? 70 : 150); G.uFogNear.value += ((out ? Math.min(9, far * 0.15) : Math.min(45, far * 0.4)) - G.uFogNear.value) * k; G.uFogFar.value += (far - G.uFogFar.value) * k; G.uFogColor.value.lerp(out ? FOG_OUT : FOG_IN, k); }
    actors.length = 1; for (const a of crowd.agents) if (a.path || a.sideTo) actors.push(a);
    world.update(dt, actors, now); if (rain && world.rooms.street.group.visible) rain.update(now / 1000, engine.camera);
    for (const h of world.halls) if (world.rooms[h.key].group.visible) h.updateLOD(engine.camera, false, engine.preset.seatLod * engine.lodK);
    crowd.update(dt, now, player, world.vis);
    shows.update(dt, now, r, world.vis);
    director.update(dt, now, sound.level(), shows.lum);
    // film audio follows you: route the film of the hall you can hear
    audT -= dt; if (audT <= 0) { audT = 0.3; let want = null; for (const h of world.halls) { if (!shows.isOn(h.id)) continue; const a = audibility(h.key); if (a.g > 0.01 && (!want || a.g > want.g)) want = { g: a.g, h }; }
      const key = want ? want.h.key : null; if (key !== curFilmHall) { curFilmHall = key; if (!key) sound.stopFilm(); else sound.startFilm(key, shows.audioSource(want.h.id)); } }
    const fa = audibility(curFilmHall), hk = r.startsWith('hall') ? r : null, darkHall = hk && world.hallByKey(hk).room.U.uHouse.value < 0.5;
    sound.setListener({ room: r, x: player.x, z: player.z, yaw: player.yaw, filmAud: fa.g, filmLP: fa.lp, crowdLP: hk ? 18000 : r === 'gal' || r === 'tunnel' ? 2500 : 900, verb: hk ? 0.5 : r === 'tunnel' ? 0.3 : r === 'gal' || r.startsWith('wc') ? 0.2 : 0.08, dark: darkHall, people: Math.min(1, crowd.agents.filter((a) => a.group.visible && dist(a) < 12).length / 10), popcornDist: Math.hypot(player.x - 13.4, player.z - 10), seated: !!player.seated });
    // held item: light it like the room, lift to the mouth when eating, slide in when received
    if (itemMesh) { lightT -= dt; if (lightT <= 0) { lightT = 0.3; crowd.lightAt(player.x, player.y + 1.3, player.z, itemLight); } itemIn = Math.min(1, itemIn + dt * 3); itemAnim = Math.max(0, itemAnim - dt * 1.6); const e = Math.sin(itemAnim * Math.PI);
      itemMesh.position.set(0.27 - e * 0.1, -0.3 - (1 - itemIn) * 0.3 + e * 0.17, -0.55 + e * 0.2); itemMesh.rotation.set(0.22 + e * 0.75, -0.35, e * 0.15); itemMesh.scale.setScalar(1.25); }
    // what can I do here?
    if (mode !== 'play' || talk.open || modal) { ui.setPrompt(null); }
    else if (player.seated) { ui.setPrompt(player.busy ? null : t('hud.stand'), () => stand()); }
    else if (!player.busy) {
      engine.camera.getWorldDirection(fwd); const fl = Math.hypot(fwd.x, fwd.z) || 1, fx = fwd.x / fl, fz = fwd.z / fl; let done = false;
      const npc = crowd.talkTarget(player.x, player.z, fx, fz); if (npc && dist(npc) < 2.4) { ui.setPrompt(t('hud.talk', { name: npc.name }), () => startTalk(npc)); done = true; }
      if (!done && held && held.left <= 0 && nearBin()) { ui.setPrompt(t('hud.bin'), () => binItem()); done = true; }
      if (!done && world.atm && game === 'story' && Math.hypot(world.atm.x - player.x, world.atm.z - player.z) < 1.4) { ui.setPrompt(t('hud.atm'), () => atm.open()); done = true; }
      if (!done && hk && ticket && ticket.hallKey === hk) { const h = world.hallByKey(hk), s = seatOf(ticket); const dx = s.x - player.x, dz = s.z - player.z, d = Math.hypot(dx, dz);
        if (d < 1.5 && Math.abs(s.y - player.y) < 0.5 && (dx * fx + dz * fz) / (d || 1) > 0.2) { ui.setPrompt(t('hud.yourSeat', { seat: s.id }), () => sitSeat(h, s)); done = true; } }
      if (!done) { let bsp = null, bd = 1.4; for (const sp of world.sitSpots) { if (sp.taken) continue; const dx = sp.x - player.x, dz = sp.z - player.z, d = Math.hypot(dx, dz); if (d < bd && (dx * fx + dz * fz) / (d || 1) > 0.2) { bsp = sp; bd = d; } } if (bsp) { ui.setPrompt(t('hud.sit'), () => sitSpot(bsp)); done = true; } }
      if (!done) ui.setPrompt(null);
    } else ui.setPrompt(null);
    ui.setButton('#bBell', mode === 'play' && game === 'story' && !!player.seated && !!hk && !modal);
    talk.update(dt, engine.camera, innerWidth, innerHeight); if (world.vis.has('lobby')) led(now); tut.update(dt);
    if (ticket && ticket.title && hk === ticket.hallKey && !player.seated) { const s = seatOf(ticket); marker.visible = true; markerPulse = Math.max(0, markerPulse - dt); marker.material.opacity = 0.55 + 0.45 * Math.sin(now * 0.006) * (markerPulse > 0 ? 1 : 0.4); marker.position.set(s.x, s.y + 1.45 + Math.sin(now * 0.004) * 0.06, s.z); } else marker.visible = false;
    slowT -= dt; if (slowT <= 0) { slowT = 0.5;
      const S = (id) => shows.get(id), status = (id) => { const s = S(id); return s.state === 'pending' ? t('show.pending', { time: fmtTime(shows.countdown(id)) }) : s.state === 'preshow' ? t('show.preshow') : (s.state === 'playing' || s.state === 'dimming') ? (shows.buffering ? t('show.buffering') : t('show.playing')) : s.state === 'ending' || s.state === 'ended' ? t('show.ended') : t('show.idle'); };
      if (hk) { const h = world.hallByKey(hk); ui.setWhere(h.cfg.name, S(h.id).state === 'idle' ? t('show.none') : `${shows.title(h.id)} · ${status(h.id)}`); } else ui.setWhere(t('room.' + r), '');
      if (ticket && ticket.title) { const s = S(ticket.hall); ui.setTicketChip(t('ticket.chip', { screen: ticket.hallName, row: ticket.row, seat: ticket.col }) + (s.state === 'pending' ? ' · ' + fmtTime(shows.countdown(ticket.hall)) : '')); } else ui.setTicketChip(null);
      ui.setFps(`${engine.stats.fps.toFixed(0)} fps · ${engine.stats.scale.toFixed(2)}x · ${engine.renderer.info.render.calls} dc`); }
  }
  const led = makeLedWall(world.ledWall, shows, t, fmtTime);
  for (const h of world.halls) h.updateLOD(engine.camera, true, engine.preset.seatLod * engine.lodK);
  // first frame: drop the loader (after the "LUMIÈRE PRESENTS" card has been seen), show the menu (or the language picker on the very first launch)
  prog(1); const shownFor = performance.now() - t0, hold = Math.max(0, 3200 - shownFor);
  requestAnimationFrame((tt) => { last = tt; frame(tt); setTimeout(() => { $('#loader').classList.add('gone'); ui.fade(0, 0.9); if (mode !== 'play') { ui.showMenu(true, false); player.locked = true; } if (!settings.lang) { ui.openLang(); } setTimeout(() => $('#loader') && $('#loader').remove(), 900); }, 120 + hold); });
  if (Q.get('play')) setTimeout(() => enterPlay(Q.get('play') === 'quick' ? 'quick' : 'story'), 300);
  if (Q.get('bakeExport')) import('./bake-export.js').then((m) => { window.__lumiere.exportRoom = (k) => m.exportRoom(world, k); window.__lumiere.bakeReady = true; });   // tools/bake/export.mjs
  window.__lumiereAssets = ASSETS; window.__lumiere = { engine, world, player, shows, sound, ui, crowd, talk, mats, director, settings, wallet, booking, tablet, buildMs: performance.now() - t0, get ticket() { return ticket; }, get game() { return game; }, book: (tk) => bought(tk), jumpToSeat, sitSeat, startTalk, takeItem, useItem, binItem, enterPlay, toMenu, newGame, get mode() { return mode; }, debugCam: (c) => { dbgCam = c; }, ready: true };
}
boot().catch((e) => { console.error(e); const l = $('#loader'); if (l) { const p = document.createElement('p'); p.className = 'ld-err'; p.textContent = 'Error: ' + (e && e.message ? e.message : e); l.appendChild(p); } });
