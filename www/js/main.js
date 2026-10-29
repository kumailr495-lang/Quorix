// LUMIERE v4 - boot, interaction rules and the frame loop.
import * as THREE from 'three';
import { Engine } from './engine.js';
import { Materials } from './materials.js';
import { buildWorld } from './world.js';
import { HALLS, roomAt, floorY, aisleX, hallByKey, portalDist } from './layout.js';
import { Player } from './player.js';
import { Sound } from './sound.js';
import { Shows } from './film.js';
import { UI } from './ui.js';
import { Crowd } from './npc.js';
import { Talk } from './talk.js';
import { treeFor } from './dialogue.js';
import { halo } from './fx.js';
const $ = (s) => document.querySelector(s);
const keyOf = (id) => HALLS.find((h) => h.id === id).key;
const fmt = (sec) => { const s = Math.ceil(sec); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

async function boot() {
  const Q = new URLSearchParams(location.search), engine = new Engine($('#gl')), mats = new Materials(engine), sound = new Sound(), bar = $('#barfill'), msg = $('#loadmsg');
  try { await Promise.race([Promise.all([document.fonts.load('300 40px Cormorant'), document.fonts.load('400 14px Inter')]), new Promise((r) => setTimeout(r, 2500))]); } catch (e) {}
  const world = await buildWorld(engine, mats, (p, n) => { bar.style.width = (8 + p * 86) + '%'; msg.textContent = n.replace('lumiere-', '').replace(/-/g, ' '); }, sound);
  msg.textContent = 'Seating the guests';
  const player = new Player(engine, world); player.attach($('#gl'), $('#stick'), $('#knob'), $('#sprint')); player.onStep = (s) => sound.step(s);
  const SPAWN = { hall: [0, -12.6, 0], hallII: [-24.15, -12.6, 0], hallIII: [24.15, -12.6, 0], corridor: [0, -1, 0], wing: [12.15, -2, 0], bar: [-4.2, 14.4, 180] }[Q.get('spawn')];
  if (SPAWN) { player.x = SPAWN[0]; player.z = SPAWN[1]; player.yaw = SPAWN[2] * Math.PI / 180; player.y = floorY(player.x, player.z); }
  let ticket = null, modal = false, room = roomAt(player.x, player.z), talk = null, ui = null, shows = null;
  const dist = (n) => Math.hypot(n.x - player.x, n.z - player.z), hallOf = (t) => world.halls.find((h) => h.cfg.id === t.hall), seatOf = (t) => hallOf(t).seats.find((s) => s.id === t.seat);
  // ---- people
  const crowd = new Crowd(world, mats, {
    bubble: (n, text, dur) => talk && talk.bubble(n, text, dur),
    laugh: (n, hallKey) => { if (hallKey) sound.laugh(hallKey, 1, 5); else if (n) { const d = dist(n); if (d < 10) sound.laugh(null, 1 - d / 10, 2); } },
    cheer: (id, dur) => sound.cheer(keyOf(id), dur), applause: (id, dur) => sound.applause(keyOf(id), dur),
    guideDone: (u) => { ui.toast(`${u.name}: “Here we are — enjoy the show.”`, 3200, true); markerPulse = 6; },
    filmPlaying: (id) => shows && shows.isPlaying(id),
  });
  crowd.attach(engine.scene); crowd.init();
  // ---- the three screens
  shows = new Shows(world, sound, crowd, {
    onBegin: (id) => { if (ticket && ticket.hall === id) ui.toast(room === keyOf(id) ? 'The house lights are going down…' : `${ticket.hallName} is starting — follow the lights to your seat`, 3200, true); },
    onPicture: (id) => { if (room === keyOf(id)) ui.toast('Now showing', 1800); },
    onEnd: (id, applause) => { if (ticket && ticket.hall === id) { if (applause) ui.toast('The End — thank you for coming to the Lumière.', 3600, true); endTicket(); } },
    onError: () => ui.toast('That video could not be decoded — try another file or a direct .mp4 link', 4600),
  });
  shows.prime();
  // ---- conversations
  talk = new Talk(sound, {
    action: (a, npc, t) => action(a, npc, t), distance: dist,
    closed: (npc) => { crowd.endTalk(npc); modal = ui.modalOpen(); player.locked = modal; },
  });
  ui = new UI(world, shows, sound, {
    onModal: (m) => { modal = m || talk.open; player.locked = modal; },
    onTicket: (t) => book(t), findSeat: () => findSeat(), jumpToSeat: () => jumpToSeat(),
    brightness: (v) => { engine.setLightScale(v); for (const h of world.halls) h.screen.mat.color.setScalar(Math.min(1.5, 0.35 + 0.65 * v)); },
  });
  function action(a, npc, t) {
    if (a === 'reserve') { ui.openSheet(); return false; }
    if (a === 'guide') { if (!ticket) { t.line('You will need a ticket first — Éloïse at the reception desk will sort you out.', [['I will be right back', 'end']]); return true; }
      if (crowd.guide(npc, ticket.hall, ticket.seat)) { ui.toast(`Follow ${npc.name}`, 2600); startTrail(); return false; } t.line('Hmm — the way is blocked just now. Follow the lights instead.', [['Thanks', 'end']]); startTrail(); return true; }
    if (a === 'drink') { sound.clink(); ui.toast('A velvet fizz — cheers!', 2400); t.line('Cheers! Enjoy the picture.', [['Thank you', 'end']]); return true; }
    if (a === 'pop') { sound.crunch(); ui.toast('A warm bag of popcorn', 2400); t.line('There you go — mind the butter.', [['Thanks', 'end']]); return true; }
    return false;
  }
  function startTalk(npc) { crowd.startTalk(npc, player.x, player.z); talk.start(npc, treeFor(npc)); modal = true; player.locked = true; }
  // ---- tickets, seat marker, guiding trail, jump-to-seat
  let marker = null, markerPulse = 0;
  function book(t) {
    if (ticket) { const ps = seatOf(ticket); if (ps) { ps.player = false; ps.taken = false; } }
    ticket = t; const s = seatOf(t); s.player = true; s.taken = true; shows.book(t.hall, t.own ? 'user' : 'house', t.own ? t.title : t.film.t, t.delay * 1000, t.seat);
    if (!marker) { marker = new THREE.Group(); const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 3.0, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
      const tag = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.03), new THREE.MeshBasicMaterial({ color: 0xffe2a0, toneMapped: false })); tag.position.y = -1.45; marker.add(beam, tag); marker.beam = beam; }
    const h = hallOf(t); h.group.add(marker); marker.position.set(s.x, s.y + 2.55, s.z + 0.12); marker.visible = true;
  }
  function endTicket() { if (!ticket) return; const s = seatOf(ticket); if (s) { s.player = false; s.taken = false; } ticket = null; if (marker) marker.visible = false; trail.on = false; trail.pts.visible = false; }
  const trail = { on: false, until: 0, next: 0, n: 0, pts: null, col: null };
  { const N = 160, g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(N * 3), 3)); g.setDrawRange(0, 0);
    trail.pts = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.34, map: halo(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, toneMapped: false })); trail.pts.frustumCulled = false; trail.pts.visible = false; engine.scene.add(trail.pts); trail.N = N; }
  function startTrail() { if (!ticket) return; trail.on = true; trail.until = performance.now() + 60000; trail.next = 0; }
  function updateTrail(now) {
    if (!trail.on) return; if (!ticket || now > trail.until) { trail.on = false; trail.pts.visible = false; return; }
    const h = hallOf(ticket), s = seatOf(ticket), gx = aisleX(h, s), gz = s.z;
    if (Math.hypot(player.x - gx, player.z - gz) < 1.3 || player.seated) { trail.on = false; trail.pts.visible = false; markerPulse = 4; return; }
    if (now > trail.next) { trail.next = now + 1200; const p = world.nav.path(player.x, player.z, gx, gz); if (!p) return; const pos = trail.pts.geometry.attributes.position.array; let n = 0, carry = 1.2;
      for (let i = 1; i < p.length && n < trail.N; i++) { const [ax, az] = p[i - 1], [bx, bz] = p[i], L = Math.hypot(bx - ax, bz - az); let t = carry; while (t < L && n < trail.N) { const x = ax + (bx - ax) * t / L, z = az + (bz - az) * t / L; pos[n * 3] = x; pos[n * 3 + 1] = floorY(x, z) + 0.05; pos[n * 3 + 2] = z; n++; t += 0.6; } carry = t - L; }
      trail.n = n; trail.pts.geometry.setDrawRange(0, n); trail.pts.geometry.attributes.position.needsUpdate = true; trail.pts.visible = n > 0; }
    const c = trail.pts.geometry.attributes.color.array, ph = now / 1000 * 5; for (let i = 0; i < trail.n; i++) { const k = 0.25 + 0.75 * Math.max(0, Math.sin(ph - i * 0.45)) ** 3; c[i * 3] = 1.0 * k; c[i * 3 + 1] = 0.78 * k; c[i * 3 + 2] = 0.42 * k; } trail.pts.geometry.attributes.color.needsUpdate = true;
  }
  function findSeat() {
    if (!ticket) { ui.toast('Reserve a screening at the reception first.', 2800); return; } startTrail(); markerPulse = 5;
    ui.toast(room === ticket.hallKey ? `Row ${ticket.row} · Seat ${ticket.col} — follow the light` : `${ticket.hallName} · Row ${ticket.row} · Seat ${ticket.col} — follow the glowing path`, 3400);
  }
  const fadeEl = $('#fade'); let fading = false;
  function fadeTo(dur, cb) { if (fading) return; fading = true; fadeEl.style.transition = `opacity ${dur}s ease`; fadeEl.style.opacity = '1'; setTimeout(() => { try { cb(); } finally { setTimeout(() => { fadeEl.style.transition = 'opacity .7s ease'; fadeEl.style.opacity = '0'; fading = false; }, 180); } }, dur * 1000 + 30); }
  function jumpToSeat() { if (!ticket) return; const h = hallOf(ticket), s = seatOf(ticket); fadeTo(0.45, () => { if (player.seated) stand(true); player.x = aisleX(h, s); player.z = s.z; player.y = floorY(player.x, player.z); player.yaw = 0; player.pitch = 0; sitSeat(h, s); trail.on = false; trail.pts.visible = false; }); }
  // ---- sitting
  let sitRelease = null;
  function sitAt(spot, standAt, release) { player.sit(spot, standAt); sitRelease = release; sound.thud(); sound.setSeated(true); }
  function stand(silent) { player.standUp(); if (sitRelease) { sitRelease(); sitRelease = null; } if (!silent) sound.thud(); sound.setSeated(false); }
  function sitSeat(h, s) { if (s.npc && s.npc !== 'player') return; if (!s.npc) s.npc = 'player'; sitAt({ x: s.x, y: s.y + 1.12, z: s.z + 0.16, yaw: 0 }, { x: aisleX(h, s), z: s.z }, () => { if (s.npc === 'player') s.npc = null; }); }
  function sitSpot(sp) { sp.taken = 'player'; sitAt({ x: sp.x, y: sp.eyeY, z: sp.z, yaw: sp.yaw }, sp.stand, () => { if (sp.taken === 'player') sp.taken = null; }); }
  world.onDoor = (open, door) => { const d = Math.hypot(door.x - player.x, door.z - player.z); if (d < 14) sound.door(open, 1 - d / 14); };
  addEventListener('pointerdown', () => sound.unlock(), { once: true, capture: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { sound.suspend(); shows.pause(true); } else { sound.resume(); shows.pause(false); } });
  // ---- frame loop
  const fwd = new THREE.Vector3(), hl = { house: 1, screen: 1, hemi: 1 }, deskX = -3.9, deskZ = 8.5;
  let last = performance.now(), frameN = 0, lightRoom = null, pendRoom = room, pendT = 9, visKey = '', slowT = 0;
  const perf = document.createElement('small'); perf.className = 'dim'; perf.style.cssText = 'font-size:10px;margin-left:6px'; $('#bright').appendChild(perf);
  let frameErrT = -1e9; const SPILL0 = { r: 1, g: 0.85, b: 0.7, lum: 0.5 };
  // one frame = update everything, then ALWAYS render: an exception in any subsystem is logged (at most every 5 s) and can never freeze the picture
  function frame(now) {
    requestAnimationFrame(frame); const dt = Math.min(0.05, (now - last) / 1000); last = now; frameN++; const cpu0 = performance.now();
    try { step(dt, now); } catch (e) { if (now - frameErrT > 5000) { frameErrT = now; console.error('[lumiere] frame update failed (rendering anyway):', e); } }
    engine.stats.cpu = (engine.stats.cpu || 0) * 0.92 + (performance.now() - cpu0) * 0.08; engine.governor(dt, now); engine.render();
    if (frameN === 90) mats.verify(engine.renderer);
    if (frameN === 2) { $('#loader').classList.add('gone'); $('#hud').hidden = false; fadeEl.style.opacity = '0'; setTimeout(() => $('#loader') && $('#loader').remove(), 900); ui.toast('Welcome to the Lumière', 2600, true); }
  }
  function step(dt, now) {
    player.update(dt);
    const r = roomAt(player.x, player.z); if (r !== room) { room = r; sound.setRoom(room); }
    world.setVisibility(room, player.x, player.z);
    if (r !== pendRoom) { pendRoom = r; pendT = 0; } else pendT += dt;   // light slots follow the room once the player is clearly in it (no flicker on a threshold)
    let vk = ''; for (const k of world.vis) if (k !== room && portalDist(room, k, player.x, player.z) < 6) vk += k + ','; if ((pendRoom !== lightRoom && pendT > 0.25) || vk !== visKey) { lightRoom = pendT > 0.25 ? pendRoom : (lightRoom || room); visKey = vk; world.setLights(lightRoom, world.vis, player.x, player.z); }
    for (const h of world.halls) if (world.rooms[h.key].visible) h.updateLOD(engine.camera);
    world.tickLights(dt); world.update(dt, crowd.actors(player), now); crowd.update(dt, now, player, world.vis);
    const here = shows.update(dt, now, room, world.vis);
    // house lights: down while a film plays in the hall you are in; the screen light takes the picture's colour
    const hs = room.startsWith('hall') ? shows.get(hallByKey(room).id) : null, dark = !!hs && (hs.state === 'playing' || hs.state === 'dimming'), sp = shows.spill || SPILL0, a = 1 - Math.exp(-dt * 1.4);
    const tg = { house: dark ? 0.14 : 1, screen: dark ? (here ? 0.55 + sp.lum * 1.8 : 0.35) : 1, hemi: dark ? 0.4 : 1 }; for (const k in hl) hl[k] += (tg[k] - hl[k]) * a;
    world.house.house = hl.house; world.house.screen = hl.screen; world.hemi.userData.k = hl.hemi;
    for (const s of world.slots) if (s.spec && s.spec.group === 'screen') { if (dark && here) s.l.color.setRGB(0.55 + sp.r * 0.6, 0.5 + sp.g * 0.55, 0.45 + sp.b * 0.6); else s.l.color.set(s.spec.color); }
    engine.applyLights();
    // what can I do here?
    if (talk.open || modal) { ui.setPrompt(null); ui.setCard(false); }
    else if (player.seated) { ui.setPrompt('Stand up', () => stand()); ui.setCard(false); }
    else {
      engine.camera.getWorldDirection(fwd); const fl = Math.hypot(fwd.x, fwd.z) || 1, fx = fwd.x / fl, fz = fwd.z / fl; let done = false;
      const npc = crowd.talkTarget(player.x, player.z, fx, fz); if (npc && dist(npc) < 2.3) { ui.setPrompt(`Talk to ${npc.name}`, () => startTalk(npc)); done = true; }
      if (!done && room.startsWith('hall')) { const h = world.halls.find((q) => q.key === room); let bs = null, sd = 1.7; for (const s of h.seats) { if ((s.taken || s.npc) && !s.player) continue; const dx = s.x - player.x, dz = s.z - player.z, d = Math.hypot(dx, dz); if (d < sd && (dx * fx + dz * fz) / (d || 1) > 0.3) { bs = s; sd = d; } }
        if (bs) { ui.setPrompt(`Sit · ${bs.id}${bs.player ? ' (your seat)' : ''}`, () => sitSeat(h, bs)); done = true; } }
      if (!done) { let bsp = null, bd = 1.5; for (const sp2 of world.sitSpots) { if (sp2.taken) continue; const dx = sp2.x - player.x, dz = sp2.z - player.z, d = Math.hypot(dx, dz); if (d < bd && (dx * fx + dz * fz) / (d || 1) > 0.2) { bsp = sp2; bd = d; } } if (bsp) { ui.setPrompt(bsp.label, () => sitSpot(bsp)); done = true; } }
      if (!done) ui.setPrompt(null);
      ui.setCard(room === 'lobby' && Math.hypot(player.x - deskX, player.z - deskZ) < 3.4);
    }
    talk.update(dt, engine.camera, innerWidth, innerHeight); updateTrail(now);
    if (marker && marker.visible) { markerPulse = Math.max(0, markerPulse - dt); marker.beam.material.opacity = 0.3 + 0.25 * Math.sin(now * 0.004) + 0.25 * Math.min(1, markerPulse); }
    slowT -= dt; if (slowT <= 0) { slowT = 0.5; let near = 0; for (const n of crowd.all) if (n.group.visible && dist(n) < 13) near++; sound.setMurmur(Math.min(1, near / 12));
      let nowText = new Date().toTimeString().slice(0, 5); if (ticket) { const s = shows.get(ticket.hall); nowText = s.state === 'pending' ? `${ticket.hallName} · starts in ${fmt(shows.countdown(ticket.hall))}` : (s.state === 'playing' || s.state === 'dimming') ? `${ticket.hallName} · now showing` : `${ticket.hallName} · Row ${ticket.row} · Seat ${ticket.col}`; }
      else if (room.startsWith('hall')) { const h = hallByKey(room), s = shows.get(h.id); nowText = `${h.name} · ${s.title} · ${(s.state === 'playing' || s.state === 'dimming') ? 'now showing' : s.state === 'pending' ? 'starts in ' + fmt(shows.countdown(h.id)) : 'between shows'}`; }
      ui.setNow(nowText); perf.textContent = `${engine.stats.ms.toFixed(0)} ms · cpu ${engine.stats.cpu.toFixed(1)} · ${engine.stats.scale.toFixed(2)}x · ${crowd.all.length} guests`; }
  }
  for (const h of world.halls) h.updateLOD(engine.camera, true);
  requestAnimationFrame((t) => { last = t; frame(t); });
  window.__lumiere = { engine, world, player, shows, sound, ui, crowd, talk, mats, book: (t) => book(t), get ticket() { return ticket; }, sitSeat, startTalk, jumpToSeat, findSeat, fadeTo };
}
boot().catch((e) => { console.error(e); const m = $('#loadmsg'); if (m) m.textContent = 'Could not open the doors: ' + (e && e.message ? e.message : e); });
