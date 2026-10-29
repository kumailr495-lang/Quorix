// LUMIERE v5 - boot, game flow (loading -> menu -> play / pause), interaction rules and the frame loop.
import * as THREE from 'three';
import { Engine } from './engine.js';
import { Materials, G } from './materials.js';
import { buildWorld } from './world.js';
import { Player, EYE } from './player.js';
import { Sound } from './sound.js';
import { Shows } from './film.js';
import { Director } from './react.js';
import { UI } from './ui.js';
import { Crowd } from './npc.js';
import { Talk } from './talk.js';
import { treeFor } from './dialogue.js';
import { propGeo } from './characters.js';
import { loadSettings, saveSettings } from './settings.js';
import { setLang, t, fmtTime } from './i18n.js';
import { HALLS, hallById, hallByKey, PASSAGES, roomAt } from './layout.js';
import { HOUSE } from './films.js';
import { makeLedWall } from './ledwall.js';
const $ = (s) => document.querySelector(s), clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), smooth = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
const STEP = { lobby: 'load.lobby', concourse: 'load.concourse', street: 'load.street', passages: 'load.passages', halls: 'load.halls' };
async function boot() {
  const settings = loadSettings(), Q = new URLSearchParams(location.search), nav = (navigator.language || 'en').slice(0, 2);
  setLang(settings.lang || (['hi', 'ur', 'es'].includes(nav) ? nav : 'en'));
  const portrait = () => $('#rotate').classList.toggle('need', innerHeight > innerWidth * 1.1); portrait(); addEventListener('resize', portrait);
  const prog = (p, k) => { $('#ldFill').style.width = (p * 100).toFixed(0) + '%'; $('#ldPct').textContent = Math.round(p * 100) + '%'; if (k) $('#ldStep').textContent = k.startsWith('bake:') ? t('load.bake', { room: t('room.' + k.slice(5)) === 'room.' + k.slice(5) ? (hallByKey(k.slice(5)) || {}).name || k.slice(5) : t('room.' + k.slice(5)) }) : t(STEP[k] || 'load.ready'); };
  $('#ldTip').textContent = t('tips'); const tipT = setInterval(() => { $('#ldTip').textContent = t('tips'); }, 4000);
  try { await Promise.race([Promise.all([document.fonts.load('500 40px Inter'), document.fonts.load('400 14px Inter')]), new Promise((r) => setTimeout(r, 2500))]); } catch (e) {}
  const engine = new Engine($('#gl'), settings), mats = new Materials(); engine.applySettings(settings);
  const t0 = performance.now(), world = await buildWorld(engine, mats, prog);
  prog(0.97, 'people'); $('#ldStep').textContent = t('load.people'); await new Promise((r) => requestAnimationFrame(r));
  const sound = new Sound(); sound.setVolumes({ master: settings.master, film: settings.film, crowd: settings.crowd });
  let ticket = null, room = 'lobby', talk = null, ui = null, shows = null, crowd = null, mode = 'menu', modal = false, held = null, markerPulse = 0, paused = false, played = false;
  const player = new Player(engine, world, settings); player.attach($('#gl'), $('#stick'), $('#knob'), $('#sprint')); player.place(0, 18.2, 0);
  player.onStep = (s) => sound.step(s, /hall|pass/.test(room));
  const dist = (n) => Math.hypot(n.x - player.x, n.z - player.z), hallOf = (tk) => world.hallById(tk.hall), seatOf = (tk) => hallOf(tk).seats.find((s) => s.id === tk.seat);
  // ---------- hall audibility: continuous, from where you stand (in the hall, in its light-lock passage, in the concourse behind an automatic door) ----------
  const passFor = (hallId) => PASSAGES.filter((p) => p.doors.some((d) => d.hall === hallId));
  const doorOf = (key) => world.doors.find((d) => d.key === key);
  function audibility(hallKey) {
    if (!hallKey) return { g: 0, lp: 400 }; const H = hallByKey(hallKey); if (room === hallKey) return { g: player.seated ? 1 : 0.92, lp: 18000 };
    for (const p of passFor(H.id)) { const d = p.doors.find((q) => q.hall === H.id), dd = Math.hypot(player.x - d.x, player.z - d.z);
      if (room === p.key) { const k = smooth(8, 0.6, dd); return { g: 0.1 + 0.55 * k, lp: 1100 + 9000 * k * k }; }
      if (room === 'conc') { const door = doorOf(p.key), de = Math.hypot(player.x - (p.x0 + p.x1) / 2, player.z - p.z1), open = door ? door.open : 0; return { g: (0.012 + 0.07 * open) * smooth(16, 1.5, de), lp: 500 + 1200 * open }; } }
    return { g: room === 'lobby' ? 0.004 : 0, lp: 400 };
  }
  // ---------- people ----------
  crowd = new Crowd(world, mats, engine, {
    bubble: (n, text, dur) => settings.bubbles && talk && talk.bubble(n, text, dur),
    crowdSound: (hallId, type, n, k, x, z) => { const a = audibility(hallById(hallId).key); if (a.g > 0.05) sound.crowd(type, n, k * Math.min(1, a.g * 1.3), x, z); },
    guideDone: (u) => { ui.toast(t('ush.arrive', { row: ticket ? ticket.row : '', seat: ticket ? ticket.col : '' }), 3200); markerPulse = 6; },
    nearViewer: (vs) => { let best = null, bd = 4.5; for (const v of vs) { if (!v.agent) continue; const d = Math.hypot(v.seat.x - player.x, v.seat.z - player.z); if (d < bd) { bd = d; best = v; } } return best; },
  });
  crowd.init();
  const director = new Director((id, ev) => { crowd.onFilmEvent(id, ev); if (ev.sfx && sound.filmHall() === hallById(id).key) sound.sfx(ev.sfx); });
  shows = new Shows(world, sound, crowd, director, engine, {
    onBegin: (id) => { if (ticket && ticket.hall === id) ui.toast(room === ticket.hallKey ? t('toast.lightsDown') : t('toast.starting', { screen: ticket.hallName }), 3200); },
    onEnd: (id, applause) => { if (ticket && ticket.hall === id) { if (applause) ui.toast(t('toast.end'), 3600); endTicket(); } },
    onError: () => ui.toast(t('toast.videoError'), 4600), silenceText: () => t('pre.silence'),
  });
  talk = new Talk(sound, { action: (a, npc, tk) => action(a, npc, tk), distance: dist, closed: (npc) => { crowd.endTalk(npc); modal = ui.modalOpen(); player.locked = modal || mode !== 'play'; } });
  ui = new UI(world, shows, sound, settings, {
    onModal: (m) => { modal = m || talk.open; player.locked = modal || mode !== 'play'; },
    onTicket: (tk) => book(tk), findSeat: () => findSeat(), jumpToSeat: () => jumpToSeat(), useItem: () => useItem(),
    onSettings: (gfx) => { saveSettings(settings); engine.applySettings(settings); sound.setVolumes({ master: settings.master, film: settings.film, crowd: settings.crowd }); talk.enabled = settings.bubbles; if (!settings.bubbles) talk.clearBubbles(); },
    onPlay: () => enterPlay(), onQuit: () => toMenu(), onPause: (p) => { paused = p; }, onHide: () => {}, onLangPicked: () => {},
  });
  // ---------- conversations ----------
  function action(a, npc, tk) {
    const [verb, arg] = a.split(':');
    if (verb === 'reserve') { setTimeout(() => ui.openBook(), 50); return false; }
    if (verb === 'guide') { if (!ticket) { tk.line(t('ush.noTicket'), [['opt.thanks', 'end']]); return true; } const h = hallOf(ticket), s = seatOf(ticket); if (crowd.guide(npc, h, s)) { ui.toast(t('toast.followUsher', { name: npc.name }), 2600); startTrail(); return false; } tk.line(t('ush.blocked'), [['opt.thanks', 'end']]); startTrail(); return true; }
    if (verb === 'buy') { if (held) { tk.line(t('ven.full'), [['opt.thanks', 'end']]); return true; } const kind = arg; crowd.serve(npc, kind, (k) => takeItem(kind)); return false; }
    return false;
  }
  function startTalk(npc) { crowd.startTalk(npc); talk.start(npc, treeFor(npc, { ticket })); modal = true; player.locked = true; }
  // ---------- held item (view model in the corner of the screen) ----------
  const itemU = { uAmb: { value: new THREE.Color(0.5, 0.5, 0.5) }, uKey: { value: new THREE.Color(0.4, 0.4, 0.4) }, uKeyDir: { value: new THREE.Vector3(0.3, 0.8, 0.4).normalize() }, uScreenL: { value: new THREE.Color(0, 0, 0) } }, itemLight = { amb: itemU.uAmb.value, key: itemU.uKey.value, dir: itemU.uKeyDir.value, screen: itemU.uScreenL.value };
  const itemMat = mats.propMat(itemU); itemMat.depthTest = true; let itemMesh = null, itemAnim = 0, itemIn = 0;
  function takeItem(kind) {
    const k = /cola|coffee|mocktail/.test(kind) ? 'drink' : kind === 'combo' ? 'popcorn' : 'popcorn'; held = { kind: k, left: k === 'drink' ? 8 : 14, name: kind };
    if (itemMesh) engine.camera.remove(itemMesh); itemMesh = new THREE.Mesh(propGeo(k), itemMat); itemMesh.scale.setScalar(1.6); itemMesh.renderOrder = 10; engine.camera.add(itemMesh); itemIn = 0;
    ui.setItem(k); sound.pop(); ui.toast(t('toast.gotPopcorn', { item: t('item.' + kind) }), 2600);
  }
  function useItem() { if (!held || itemAnim > 0) return; itemAnim = 1; if (held.kind === 'drink') sound.sip(); else sound.crunch(); if (--held.left <= 0) setTimeout(() => { if (itemMesh) engine.camera.remove(itemMesh); itemMesh = null; held = null; ui.setItem(null); ui.toast(t('toast.empty'), 2200); }, 700); }
  // ---------- tickets, seat marker, guiding path, jump to seat ----------
  const marker = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.fillStyle = '#ff4d5a'; g.beginPath(); g.moveTo(32, 58); g.lineTo(10, 26); g.lineTo(24, 26); g.lineTo(24, 6); g.lineTo(40, 6); g.lineTo(40, 26); g.lineTo(54, 26); g.closePath(); g.fill(); const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, depthWrite: false, depthTest: false, toneMapped: false })); s.scale.set(0.32, 0.32, 1); s.visible = false; s.renderOrder = 20; engine.scene.add(s); return s; })();
  function book(tk) {
    if (ticket) { const ps = seatOf(ticket); if (ps) { ps.player = false; ps.taken = false; } }
    ticket = tk; const s = seatOf(tk); s.player = true; s.taken = true; shows.book(tk.hall, tk.own ? 'user' : 'house', tk.film, tk.delay * 1000, tk.seat, tk.title);
    marker.position.set(s.x, s.y + 1.55, s.z); marker.visible = true; crowd.staff.eloise && setTimeout(() => crowd.staff.eloise.say(t('rec.booked'), 3.6), 600);
  }
  function endTicket() { if (!ticket) return; const s = seatOf(ticket); if (s) { s.player = false; s.taken = false; } ticket = null; marker.visible = false; trail.on = false; trail.pts.visible = false; }
  const trail = { on: false, until: 0, next: 0, n: 0, pts: null };
  { const N = 140, g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(N * 3), 3)); g.setDrawRange(0, 0);
    const c = document.createElement('canvas'); c.width = c.height = 32; const gg = c.getContext('2d'), gr = gg.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); gg.fillStyle = gr; gg.fillRect(0, 0, 32, 32);
    trail.pts = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.22, map: new THREE.CanvasTexture(c), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, toneMapped: false })); trail.pts.frustumCulled = false; trail.pts.visible = false; engine.scene.add(trail.pts); trail.N = N; }
  function startTrail() { if (!ticket) return; trail.on = true; trail.until = performance.now() + 90000; trail.next = 0; }
  function updateTrail(now) {
    if (!trail.on) return; if (!ticket || now > trail.until) { trail.on = false; trail.pts.visible = false; return; }
    const h = hallOf(ticket), s = seatOf(ticket), ap = crowd.aislePoint(h, s), lane = crowd.laneStand({ seat: s, hall: h });
    if (Math.hypot(player.x - lane.x, player.z - lane.z) < 1.0 || player.seated) { trail.on = false; trail.pts.visible = false; markerPulse = 4; return; }
    if (now > trail.next) { trail.next = now + 1000; const p = world.nav.path(player.x, player.z, ap.x, ap.z); if (!p) return; p.push([lane.x, lane.z]); const pos = trail.pts.geometry.attributes.position.array; let n = 0, carry = 1.0;
      for (let i = 1; i < p.length && n < trail.N; i++) { const [ax, az] = p[i - 1], [bx, bz] = p[i], L = Math.hypot(bx - ax, bz - az); let k = carry; while (k < L && n < trail.N) { const x = ax + (bx - ax) * k / L, z = az + (bz - az) * k / L; pos[n * 3] = x; pos[n * 3 + 1] = world.floorY(x, z) + 0.04; pos[n * 3 + 2] = z; n++; k += 0.55; } carry = k - L; }
      trail.n = n; trail.pts.geometry.setDrawRange(0, n); trail.pts.geometry.attributes.position.needsUpdate = true; trail.pts.visible = n > 0; }
    const c = trail.pts.geometry.attributes.color.array, ph = now / 1000 * 4; for (let i = 0; i < trail.n; i++) { const k = 0.25 + 0.75 * Math.max(0, Math.sin(ph - i * 0.4)) ** 3; c[i * 3] = 1.0 * k; c[i * 3 + 1] = 0.3 * k; c[i * 3 + 2] = 0.35 * k; } trail.pts.geometry.attributes.color.needsUpdate = true;
  }
  function findSeat() { if (!ticket) { ui.toast(t('toast.noTicket'), 2800); return; } startTrail(); markerPulse = 5; ui.toast(t('toast.follow'), 2600); }
  let fading = false;
  function fadeTo(dur, cb) { if (fading) return; fading = true; ui.fade(1, dur); setTimeout(() => { try { cb(); } finally { setTimeout(() => { ui.fade(0, 0.7); fading = false; }, 200); } }, dur * 1000 + 40); }
  function seatPose(h, s) { const H = h.cfg, eye = H.seat.eye; return { x: s.x - Math.sin(s.yaw) * 0.04, y: s.y + eye, z: s.z - Math.cos(s.yaw) * 0.04, yaw: s.yaw }; }
  function jumpToSeat() { if (!ticket) return; const h = hallOf(ticket), s = seatOf(ticket); fadeTo(0.45, () => { if (sitRelease) { sitRelease(); sitRelease = null; } player.placeSeated(seatPose(h, s), crowd.laneStand({ seat: s, hall: h })); sitRelease = () => { if (s.npc === 'player') s.npc = null; }; s.npc = s.npc || 'player'; sound.setVolumes({}); trail.on = false; trail.pts.visible = false; }); }
  // ---------- sitting ----------
  let sitRelease = null;
  function sitSeat(h, s) { if (s.npc && s.npc !== 'player') return; s.npc = 'player'; sitRelease = () => { if (s.npc === 'player') s.npc = null; }; player.sit(seatPose(h, s), crowd.laneStand({ seat: s, hall: h }), () => sound.thud()); }
  function sitSpot(sp) { sp.taken = 'player'; sitRelease = () => { if (sp.taken === 'player') sp.taken = null; }; player.sit({ x: sp.x, y: sp.y + 0.72, z: sp.z, yaw: sp.face + Math.PI }, sp.stand, () => sound.thud()); }
  function stand() { if (player.standUp(() => { if (sitRelease) { sitRelease(); sitRelease = null; } })) sound.thud(); }
  world.onDoor = (open, door) => { const d = Math.hypot(door.x - player.x, door.z - player.z); if (d < 12) sound.door(open, 1 - d / 12); };
  addEventListener('pointerdown', () => sound.unlock(), { capture: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { sound.suspend(); shows.pause(true); } else { sound.resume(); shows.pause(false); } });
  // ---------- flow: menu (live flythrough) <-> play; Android back button opens the pause menu ----------
  function enterPlay() { if (mode === 'play') return; ui.fade(1, 0.35); setTimeout(() => { mode = 'play'; ui.showMenu(false); player.locked = false; if (!played) { played = true; player.place(0, 18.2, 0); ui.toast(t('toast.welcome'), 2600); } ui.fade(0, 0.8); try { history.pushState({ lum: 1 }, ''); } catch (e) {} }, 380); }
  function toMenu() { mode = 'menu'; player.locked = true; ui.showMenu(true, played); talk.close(); }
  addEventListener('popstate', () => { if (mode === 'play') { if (talk.open) talk.close(); else if (!$('#book').hidden) ui.closeBook(); else if ($('#pause').hidden) ui.openPause(); else ui.closeModal('#pause'); try { history.pushState({ lum: 1 }, ''); } catch (e) {} } });
  // ---------- frame loop ----------
  const fwd = new THREE.Vector3(); let last = performance.now(), frameN = 0, slowT = 0, lightT = 0, errT = -1e9, audT = 0, curFilmHall = null;
  const actors = [player];
  function frame(now) {
    requestAnimationFrame(frame); const dt = Math.min(0.05, (now - last) / 1000); last = now; frameN++; G.uTime.value = now / 1000; const c0 = performance.now();
    try { step(dt, now); } catch (e) { if (now - errT > 5000) { errT = now; console.error('[lumiere] frame update failed (rendering anyway):', e); } }
    engine.stats.cpu = engine.stats.cpu * 0.92 + (performance.now() - c0) * 0.08; engine.governor(dt, now); engine.render();
  }
  function menuCam(now) { const k = now / 1000 * 0.045, cam = engine.camera; cam.position.set(Math.sin(k) * 6.5, 2.3 + Math.sin(k * 2.1) * 0.25, 10.5 + Math.cos(k) * 6); cam.lookAt(Math.sin(k + 1.2) * 2, 1.7, 7.5); player.x = cam.position.x; player.z = cam.position.z; }
  function step(dt, now) {
    if (mode === 'menu') menuCam(now); else player.update(dt);
    engine.setZoom(mode === 'play' && player.seated && !player.busy && room.startsWith('hall') ? 0.74 : 1, dt);
    document.body.classList.toggle('watching', mode === 'play' && !!player.seated && room.startsWith('hall') && shows.isOn(world.hallByKey(room).id));
    const r = mode === 'menu' ? 'lobby' : roomAt(player.x, player.z); room = r; world.setVisibility(r, player.x, player.z);
    actors.length = 1; for (const a of crowd.agents) if (a.path || a.sideTo) actors.push(a);
    world.update(dt, actors, now);
    for (const h of world.halls) if (world.rooms[h.key].group.visible) h.updateLOD(engine.camera, false, engine.preset.seatLod);
    crowd.update(dt, now, player, world.vis);
    shows.update(dt, now, r, world.vis);
    director.update(dt, now, sound.level(), shows.userSpill.lum);
    // film audio follows you: start the score / route the video of the hall you can hear
    audT -= dt; if (audT <= 0) { audT = 0.3; let want = null; for (const h of world.halls) { if (!shows.isOn(h.id)) continue; const a = audibility(h.key); if (a.g > 0.01 && (!want || a.g > want.g)) want = { g: a.g, h }; }
      const key = want ? want.h.key : null; if (key !== curFilmHall) { curFilmHall = key; if (!key) sound.stopFilm(); else { const s = shows.get(want.h.id); sound.startFilm(key, s.mode === 'user' ? { video: shows.video } : { house: s.filmId }); } } }
    const fa = audibility(curFilmHall), hk = r.startsWith('hall') ? r : null, darkHall = hk && world.hallByKey(hk).room.U.uHouse.value < 0.5, pc = world.spots.snackCounter;
    sound.setListener({ room: r, x: player.x, z: player.z, yaw: player.yaw, filmAud: fa.g, filmLP: fa.lp, crowdLP: hk ? 18000 : r.startsWith('pass') ? 2500 : 900, verb: hk ? 0.5 : r.startsWith('pass') ? 0.2 : 0.08, dark: darkHall, people: Math.min(1, crowd.agents.filter((a) => a.group.visible && dist(a) < 12).length / 10), popcornDist: Math.hypot(player.x - 13.4, player.z - 10), seated: !!player.seated });
    // held item: light it like the room, bob when eating, slide in when received
    if (itemMesh) { lightT -= dt; if (lightT <= 0) { lightT = 0.3; crowd.lightAt(player.x, player.y + 1.3, player.z, itemLight); } itemIn = Math.min(1, itemIn + dt * 3); itemAnim = Math.max(0, itemAnim - dt * 1.6); const e = Math.sin(itemAnim * Math.PI);
      itemMesh.position.set(0.3, -0.3 - (1 - itemIn) * 0.3 + e * 0.12, -0.55 + e * 0.12); itemMesh.rotation.set(0.25 + e * 0.6, -0.4, 0); }
    // what can I do here?
    if (mode !== 'play' || talk.open || modal) { ui.setPrompt(null); }
    else if (player.seated) { ui.setPrompt(player.busy ? null : t('hud.stand'), () => stand()); }
    else if (!player.busy) {
      engine.camera.getWorldDirection(fwd); const fl = Math.hypot(fwd.x, fwd.z) || 1, fx = fwd.x / fl, fz = fwd.z / fl; let done = false;
      const npc = crowd.talkTarget(player.x, player.z, fx, fz); if (npc && dist(npc) < 2.4) { ui.setPrompt(t('hud.talk', { name: npc.name }), () => startTalk(npc)); done = true; }
      if (!done && hk) { const h = world.hallByKey(hk); let bs = null, sd = 1.5; for (const s of h.seats) { if ((s.taken || s.npc) && !s.player) continue; const dx = s.x - player.x, dz = s.z - player.z, d = Math.hypot(dx, dz); if (Math.abs(s.y - player.y) > 0.5) continue; if (d < sd && (dx * fx + dz * fz) / (d || 1) > 0.25) { bs = s; sd = d; } }
        if (bs) { ui.setPrompt(t(bs.player ? 'hud.yourSeat' : 'hud.sitSeat', { seat: bs.id }), () => sitSeat(h, bs)); done = true; } }
      if (!done) { let bsp = null, bd = 1.4; for (const sp of world.sitSpots) { if (sp.taken) continue; const dx = sp.x - player.x, dz = sp.z - player.z, d = Math.hypot(dx, dz); if (d < bd && (dx * fx + dz * fz) / (d || 1) > 0.2) { bsp = sp; bd = d; } } if (bsp) { ui.setPrompt(t('hud.sit'), () => sitSpot(bsp)); done = true; } }
      if (!done) ui.setPrompt(null);
    } else ui.setPrompt(null);
    talk.update(dt, engine.camera, innerWidth, innerHeight); updateTrail(now); if (world.vis.has('lobby')) led(now);
    if (marker.visible) { markerPulse = Math.max(0, markerPulse - dt); const s = ticket && seatOf(ticket); if (s) { const near = Math.hypot(s.x - player.x, s.z - player.z) < 0.6 && player.seated; marker.material.opacity = near ? 0 : 0.55 + 0.45 * Math.sin(now * 0.006) * (markerPulse > 0 ? 1 : 0.4); marker.position.y = s.y + 1.45 + Math.sin(now * 0.004) * 0.06; } }
    slowT -= dt; if (slowT <= 0) { slowT = 0.5;
      const S = (id) => shows.get(id), status = (id) => { const s = S(id); return s.state === 'pending' ? t('show.pending', { time: fmtTime(shows.countdown(id)) }) : s.state === 'preshow' ? t('show.preshow') : (s.state === 'playing' || s.state === 'dimming') ? t('show.playing') : s.state === 'ending' || s.state === 'ended' ? t('show.ended') : t('show.idle'); };
      if (hk) { const h = world.hallByKey(hk); ui.setWhere(h.cfg.name, `${shows.title(h.id)} · ${status(h.id)}`); } else ui.setWhere(t('room.' + r), '');
      if (ticket) { const s = S(ticket.hall); ui.setTicketChip(t('ticket.chip', { screen: ticket.hallName, row: ticket.row, seat: ticket.col }) + (s.state === 'pending' ? ' · ' + fmtTime(shows.countdown(ticket.hall)) : '')); } else ui.setTicketChip(null);
      ui.setFps(`${engine.stats.fps.toFixed(0)} fps · ${engine.stats.scale.toFixed(2)}x · ${engine.renderer.info.render.calls} dc`); }
  }
  const led = makeLedWall(world.ledWall, shows, t, fmtTime);
  for (const h of world.halls) h.updateLOD(engine.camera, true, engine.preset.seatLod);
  // first frame: drop the loader, show the menu (or the language picker on the very first launch)
  clearInterval(tipT); prog(1, 'ready'); $('#ldStep').textContent = t('load.ready');
  requestAnimationFrame((tt) => { last = tt; frame(tt); setTimeout(() => { $('#loader').classList.add('gone'); ui.fade(0, 0.9); ui.showMenu(true, false); player.locked = true; if (!settings.lang) { ui.openLang(); } setTimeout(() => $('#loader') && $('#loader').remove(), 800); }, 120); });
  if (Q.get('play')) setTimeout(() => enterPlay(), 300);
  window.__lumiere = { engine, world, player, shows, sound, ui, crowd, talk, mats, director, settings, buildMs: performance.now() - t0, get ticket() { return ticket; }, book: (tk) => book(tk), jumpToSeat, findSeat, sitSeat, startTalk, takeItem, enterPlay, toMenu, get mode() { return mode; }, ready: true };
}
boot().catch((e) => { console.error(e); const m = $('#ldStep'); if (m) m.textContent = 'Error: ' + (e && e.message ? e.message : e); });
