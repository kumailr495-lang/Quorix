// NPC crowd: skinned characters + brains (finite-state machines on a shared A* navigation grid) - work posts, chatting pairs, wanderers, sitters,
// ushering, hall audiences that arrive, react (laugh/cheer/applaud) and leave. Barks and dialogue come from dialogue.js.
import * as THREE from 'three';
import { Character } from './characters.js';
import { roomAt, floorY, HALLS, hallCx, ENTRANCE, aisleX } from './layout.js';
import { CHATS, GREET, IDLE, REACT, pick } from './dialogue.js';
const D2R = Math.PI / 180, TAU = Math.PI * 2, rnd = (a, b) => a + Math.random() * (b - a);
const adiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const VIEWERS = ['patron-m1', 'patron-m2', 'patron-f1', 'patron-f2', 'patron-f3', 'patron-m3'];
const WANDER = [[-2.2, 13.2], [2.4, 14.3], [0.4, 6.0], [-1.0, 4.4], [4.4, 7.4], [-3.4, 11.4], [2.0, 9.0], [5.2, 5.4], [-5.0, 5.0], [0, 12], [3.6, 12.8], [-2.8, 7.0]];
const STAFF = new Set(['reception', 'usher', 'barkeep', 'vendor']);
const GUESTS = ['Mr. Lark', 'Mrs. Dupont', 'Theo', 'Margot', 'Mr. Okafor', 'Celeste', 'Ravi', 'Ada', 'Mr. Brandt', 'Noor', 'Felix', 'Ilse', 'Mr. Sato', 'Yara', 'Hugo', 'Petra'];
class NPC {
  constructor(crowd, spec, def, mat) {
    this.crowd = crowd; this.id = spec.id; this.name = spec.name || 'Guest'; this.role = spec.role; this.model = spec.model; this.spec = spec; this.char = new Character(def, mat); this.group = this.char.group; crowd.root.add(this.group);
    this.x = spec.x; this.z = spec.z; this.yaw = (spec.yaw || 0) * D2R; this.y = floorY(this.x, this.z); this.state = 'idle'; this.t = rnd(1, 4); this.path = null; this.pi = 0; this.after = null; this.v = 0; this.partner = null; this.spot = null; this.seat = null;
    this.home = { x: spec.x, z: spec.z, yaw: this.yaw }; this.alive = true; this.greeted = -99; this.nextBark = rnd(5, 18); this.react = null; this.reactT = 0; this.chat = null; this.hall = spec.hall || null; this.sitFrom = null; this.sitT = 0; this.gT = rnd(2, 6); this.busy = false;
    this.char.seed = Math.random() * 6; this.apply(); this.char.update(0.016);
  }
  apply() { this.group.position.set(this.x, this.y, this.z); this.group.rotation.y = this.yaw; }
  goTo(x, z, after) { if (!Number.isFinite(x + z)) { this.state = 'idle'; this.t = 2; return false; } const p = this.crowd.world.nav.path(this.x, this.z, x, z); if (!p || p.length < 1) { this.state = 'idle'; this.t = 2; return false; } this.path = p; this.pi = p.length > 1 ? 1 : 0; this.after = after || null; this.state = 'walk'; return true; }
  turnTo(tx, tz, rate, dt) { const want = Math.atan2(tx - this.x, tz - this.z), d = adiff(want, this.yaw); this.yaw += Math.max(-rate * dt, Math.min(rate * dt, d)); return Math.abs(d); }
  sitDown(target, drop, after) { this.sitFrom = { x: this.x, z: this.z, y: this.y, yaw: this.yaw }; this.sitTo = target; this.sitT = 0; this.char.sitDrop = Math.max(0.2, 0.94 * this.char.scale - (drop + 0.11)); this.state = 'sitting'; this.afterSit = after; }
  seatedPose(target) { this.x = target.x; this.z = target.z; this.y = target.y; this.yaw = target.yaw; this.state = 'seated'; this.char.base = 'sit'; this.char.snap = true; this.apply(); }
  standUp(after, to = null) { this.sitT = 0; this.state = 'standing'; this.afterStand = after; this.standFrom = { x: this.x, z: this.z }; this.standTo = to; }
  say(text, dur = 3.4) { this.crowd.hooks.bubble && this.crowd.hooks.bubble(this, text, dur); }
  update(dt, now, cx) {
    const c = this.char, W = this.crowd.world; this.t -= dt; this.gT -= dt;
    const dxp = cx.px - this.x, dzp = cx.pz - this.z, dp = Math.hypot(dxp, dzp), rel = adiff(Math.atan2(dxp, dzp), this.yaw); let target = 'stand', gesture = 'none', speed = 0;
    switch (this.state) {
      case 'idle': this.idle(dt, now, cx, dp); if (this.state === 'idle') { gesture = this.gesture || 'none'; } break;
      case 'walk': { const p = this.path, k = p && p[this.pi]; if (!k) { this.finishWalk(); break; } const dx = k[0] - this.x, dz = k[1] - this.z, d = Math.hypot(dx, dz); this.turnTo(k[0], k[1], 7, dt);
        const sp = this.hurry ? 1.55 : 1.2, face = Math.abs(adiff(Math.atan2(dx, dz), this.yaw)); this.v += (Math.min(sp, face > 1.0 ? 0.2 : sp) - this.v) * Math.min(1, dt * 5); const step = Math.min(d, this.v * dt); if (d > 1e-4) { this.x += dx / d * step; this.z += dz / d * step; }
        if (d < 0.2) { this.pi++; if (this.pi >= p.length) this.finishWalk(); } target = 'walk'; speed = this.v; break; }
      case 'sidestep': { const tx = this.sideT.x, dx = tx - this.x, d = Math.abs(dx); this.turnTo(tx, this.z, 8, dt); this.v += (0.75 - this.v) * Math.min(1, dt * 5); const step = Math.min(d, this.v * dt); this.x += Math.sign(dx) * step; this.z += (this.sideT.z - this.z) * Math.min(1, dt * 6); target = 'walk'; speed = 0.75; if (d < 0.05) { this.v = 0; this.sitDown(this.sideT.seat, 0.47, null); } break; }
      case 'sitting': { this.sitT += dt / 0.9; const k = Math.min(1, this.sitT), e = k * k * (3 - 2 * k), a = this.sitFrom, b = this.sitTo; this.x = a.x + (b.x - a.x) * e; this.z = a.z + (b.z - a.z) * e; this.y = a.y + (b.y - a.y) * e; this.yaw = a.yaw + adiff(b.yaw, a.yaw) * e; target = 'sit'; if (k >= 1) { this.state = 'seated'; this.t = this.seatTime || rnd(50, 130); this.afterSit && this.afterSit(); } break; }
      case 'seated': { target = 'sit'; const chatty = this.spot || (this.hall && !(cx.playing && cx.playing(this.hall))); gesture = this.react ? this.react : (chatty && this.gT < 0 ? (this.gT < -3 ? (this.gT = rnd(4, 12), 'none') : 'talk') : 'none'); if (this.hall && chatty && (this.nextBark -= dt) <= 0) { this.nextBark = rnd(18, 45); if (dp < 7 && Math.random() < 0.5) this.say(pick(IDLE.audience), 3); } if (this.react && (this.reactT -= dt) <= 0) this.react = null; if (this.spot && !this.hall && this.t <= 0 && !this.busy) this.leaveSpot(); if (this.hall && this.leaving && now > this.leaveAt) this.leaveSeat(); break; }
      case 'standing': { this.sitT += dt / 0.7; const k = Math.min(1, this.sitT); target = k < 0.5 ? 'sit' : 'stand'; if (this.standTo) { const e = k * k * (3 - 2 * k); this.x = this.standFrom.x + (this.standTo.x - this.standFrom.x) * e; this.z = this.standFrom.z + (this.standTo.z - this.standFrom.z) * e; } if (k >= 1) { this.state = 'idle'; this.t = rnd(0.5, 2); const f = this.afterStand; this.afterStand = null; f && f(); } break; }
      case 'chat': this.chatTick(dt, now, cx); gesture = this.speaking ? 'talk' : (this.laughT > 0 ? 'laugh' : 'none'); if (this.laughT > 0) this.laughT -= dt; this.turnTo(this.partner.x, this.partner.z, 4, dt); break;
      case 'talk': if (this.spot) target = 'sit'; else this.turnTo(cx.px, cx.pz, 4, dt); gesture = 'talk'; break;
      case 'guide': this.guideTick(dt, now, cx, dp); target = this.guideWait ? 'stand' : 'walk'; speed = this.guideWait ? 0 : this.v; gesture = this.guideWait ? 'wave' : 'none'; break;
      case 'leave': { const p = this.path, k = p && p[this.pi]; if (!k) { this.alive = false; break; } const dx = k[0] - this.x, dz = k[1] - this.z, d = Math.hypot(dx, dz); this.turnTo(k[0], k[1], 7, dt); this.v += (1.45 - this.v) * Math.min(1, dt * 5); const step = Math.min(d, this.v * dt); if (d > 1e-4) { this.x += dx / d * step; this.z += dz / d * step; } if (d < 0.25 && ++this.pi >= p.length) { this.alive = false; } target = 'walk'; speed = this.v; break; }
    }
    if (this.state !== 'walk' && this.state !== 'sidestep' && this.state !== 'guide' && this.state !== 'leave') this.v += (0 - this.v) * Math.min(1, dt * 6);
    // look at the player when close and roughly in front
    c.lookYaw = rel; c.lookPitch = 0; const wantLook = dp < 4.2 && Math.abs(rel) < 1.9 && this.state !== 'walk' ? 1 : 0; c.lookAmt += (wantLook - c.lookAmt) * Math.min(1, dt * 4);
    c.base = target; c.gesture = this.reactOverride || gesture; c.speed = speed; if (target === 'walk') c.phase += speed * dt * 4.4; this.y += (this.state === 'sitting' ? 0 : (floorY(this.x, this.z) - this.y)) * Math.min(1, dt * 10);
    this.apply();
  }
  finishWalk() { this.v = 0; this.state = 'idle'; this.t = rnd(1.5, 4); const f = this.after; this.after = null; f && f(this); }
  leaveSpot() { const s = this.spot; if (s) s.taken = null; this.spot = null; this.standUp(() => { this.decide(); }, s ? { x: s.stand.x, z: s.stand.z } : null); }
  leaveSeat() { const sd = this.seat; this.leaving = false; if (sd) { sd.npc = null; sd.taken = false; } this.seat = null; const to = sd ? { x: sd.x, z: sd.z - 0.66 } : null; this.standUp(() => { this.hurry = false; this.state = 'leave'; const p = this.crowd.world.nav.path(this.x, this.z, ENTRANCE.x + rnd(-0.5, 0.5), ENTRANCE.z + 0.3); this.path = p; this.pi = p && p.length > 1 ? 1 : 0; if (!p) this.alive = false; this.hall = null; }, to); }
  idle(dt, now, cx, dp) {
    const R = this.role, cr = this.crowd;
    if (dp < 3.6 && now - this.greeted > 45000 && !this.busy && (STAFF.has(R) || Math.random() < 0.003 * 60 * dt)) { this.greeted = now; this.gesture = STAFF.has(R) ? 'wave' : 'none'; this.gT = 2.2; this.say(pick(GREET), 3.2); cr.hooks.greet && cr.hooks.greet(this); }
    if (this.gT <= 0) { this.gesture = R === 'reception' ? (Math.random() < 0.6 ? 'type' : 'none') : STAFF.has(R) ? (Math.random() < 0.5 ? 'talk' : 'none') : 'none'; this.gT = rnd(3, 8); }
    if (R === 'reception' || R === 'barkeep' || R === 'vendor') { this.turnTo(this.x + Math.sin(this.home.yaw), this.z + Math.cos(this.home.yaw), 3, dt); if (dp < 4 && Math.abs(adiff(Math.atan2(cx.px - this.x, cx.pz - this.z), this.yaw)) < 1.6) this.turnTo(cx.px, cx.pz, 2, dt); }
    this.nextBark -= dt; if (this.nextBark <= 0) { this.nextBark = rnd(14, 34); if (dp < 8 && Math.random() < 0.55) this.say(pick(IDLE[STAFF.has(R) ? R : 'patron'] || IDLE.patron), 3.4); }
    if (this.t > 0) return; this.decide();
  }
  decide() {
    const R = this.role, cr = this.crowd; this.gesture = 'none';
    if (this.partner && this.partner.alive && this.partner.state !== 'walk' && R === 'patron') { this.beginChat(); return; }
    if (R === 'usher') { const pts = [[1.7, 3.6], [-1.4, 4.8], [1.2, 6.2], [0, 3.4]]; const p = pick(pts); this.goTo(p[0], p[1], (n) => { n.t = rnd(5, 12); }); return; }
    if (R === 'wanderer' || R === 'sitter' || R === 'patron') { if (R === 'sitter' || (R === 'wanderer' && Math.random() < 0.28)) { const sp = cr.freeSpot(this); if (sp) { this.goToSpot(sp); return; } } const w = pick(WANDER); this.goTo(w[0], w[1], (n) => { n.t = rnd(3, 9); if (Math.random() < 0.4) n.turnTo(n.x + Math.random() - 0.5, n.z - 1, 5, 0.1); }); return; }
    if (R === 'viewer') { this.t = 5; return; }
    this.t = rnd(3, 7);
  }
  goToSpot(sp) { sp.taken = this.id; this.spot = sp; this.goTo(sp.stand.x, sp.stand.z, (n) => { n.sitDown({ x: sp.x, z: sp.z, y: sp.floor, yaw: sp.face * D2R }, /bar/i.test(sp.label) ? 0.55 : 0.46, null); n.seatTime = rnd(40, 110); }); }
  beginChat() { this.state = 'chat'; this.t = rnd(8, 16); this.chat = { script: pick(CHATS), i: 0, next: 0 }; this.speaking = false; this.laughT = 0; this.leader = this.id < this.partner.id; if (this.partner.state !== 'chat') { this.partner.state = 'chat'; this.partner.partner = this; this.partner.chat = this.chat; this.partner.leader = false; this.partner.speaking = false; this.partner.laughT = 0; this.partner.t = this.t; } }
  chatTick(dt, now, cx) {
    const p = this.partner; if (!p || !p.alive) { this.state = 'idle'; return; } const ch = this.chat; this.speaking = false;
    if (this.leader) { ch.next -= dt; if (ch.next <= 0) { if (ch.i >= ch.script.length) { this.state = 'idle'; p.state = 'idle'; this.t = rnd(10, 26); p.t = this.t + 1; this.partner = p; return; }
        const speaker = (ch.i % 2 === 0) ? this : p, line = ch.script[ch.i++]; ch.speaker = speaker; ch.next = 3.6 + line.length * 0.035; const near = Math.hypot(cx.px - this.x, cx.pz - this.z) < 9; if (near) speaker.say(line, 3.3);
        if (ch.i === ch.script.length && Math.random() < 0.5 && near) { this.laughT = p.laughT = 1.8; this.crowd.hooks.laugh && this.crowd.hooks.laugh(this); } } }
    this.speaking = ch.speaker === this && ch.next > 0.8;
  }
  guideTick(dt, now, cx, dp) {
    const p = this.path, k = p && p[this.pi]; this.guideWait = false; if (dp > 5.0) { this.guideWait = true; this.turnTo(cx.px, cx.pz, 4, dt); if (now - (this.waitSay || 0) > 7000) { this.waitSay = now; this.say('This way, please.', 2.6); } return; }
    if (!k) { this.state = 'idle'; this.t = 3; this.say(this.guideDone || 'Here we are. Enjoy the show.', 4); this.crowd.hooks.guideDone && this.crowd.hooks.guideDone(this); this.busy = false; return; }
    const dx = k[0] - this.x, dz = k[1] - this.z, d = Math.hypot(dx, dz); this.turnTo(k[0], k[1], 6, dt); this.v += (1.1 - this.v) * Math.min(1, dt * 4); const step = Math.min(d, this.v * dt); if (d > 1e-4) { this.x += dx / d * step; this.z += dz / d * step; } if (d < 0.2) this.pi++;
  }
}
export class Crowd {
  constructor(world, mats, hooks = {}) { this.world = world; this.mat = mats.people || mats.solid; this.hooks = hooks; this.root = new THREE.Group(); this.root.name = 'crowd'; world.engineScene && world.engineScene.add(this.root); this.all = []; this.arrivals = []; this.laughT = rnd(10, 25); this.byId = {}; this.t = 0; }
  attach(scene) { scene.add(this.root); }
  spawn(spec) { const def = this.world.npcDefs[spec.model]; if (!def) throw new Error('npc model ' + spec.model); const n = new NPC(this, spec, def, this.mat); this.all.push(n); this.byId[spec.id] = n; return n; }
  init() {
    for (const s of this.world.spawns) { const n = this.spawn(s); if (s.role === 'sitter') { const sp = this.world.sitSpots.find((q) => q.label === s.spot && !q.taken && Math.hypot(q.x - s.x, q.z - s.z) < 0.6); if (sp) { sp.taken = n.id; n.spot = sp; n.seatedPose({ x: sp.x, z: sp.z, y: sp.floor, yaw: sp.face * D2R }); n.char.sitDrop = 0.94 * n.char.scale - ((/bar/i.test(sp.label) ? 0.55 : 0.46) + 0.11); n.t = rnd(30, 90); } } }
    for (const s of this.world.spawns) if (s.chat) { const a = this.byId[s.id], b = this.byId[s.chat]; if (a && b) { a.partner = b; } }
  }
  freeSpot(npc) { const free = this.world.sitSpots.filter((s) => !s.taken && !s.reserved); if (!free.length) return null; return free.map((s) => [s, Math.hypot(s.x - npc.x, s.z - npc.z) + Math.random() * 6]).sort((a, b) => a[1] - b[1])[0][0]; }
  actors(player) { const a = [{ x: player.x, z: player.z }]; for (const n of this.all) if (n.state === 'walk' || n.state === 'guide' || n.state === 'leave' || n.state === 'sidestep') a.push(n); return a; }
  say(npc, text, dur) { npc.say(text, dur); }
  talkTarget(px, pz, fx, fz) { let best = null, bd = 2.7; for (const n of this.all) { if (!n.group.visible || n.role === 'viewer' || n.state === 'leave' || n.state === 'sitting' || n.state === 'standing') continue; const dx = n.x - px, dz = n.z - pz, d = Math.hypot(dx, dz); if (d < bd && (dx * fx + dz * fz) / (d || 1) > 0.45) { bd = d; best = n; } } return best; }
  startTalk(npc, px, pz) { npc.prev = npc.state === 'chat' ? 'idle' : npc.state; if (npc.partner && npc.state === 'chat') npc.partner.state = 'idle'; npc.state = 'talk'; npc.path = null; npc.busy = true; npc.say('', 0.01); }
  endTalk(npc) { if (npc.state === 'talk') { npc.state = npc.spot ? 'seated' : 'idle'; npc.t = rnd(2, 5); } npc.busy = false; }
  guide(usher, hallId, seatId) { const h = this.world.halls.find((q) => q.cfg.id === hallId), s = h.seats.find((q) => q.id === seatId); const ax = h.cx + (s.col <= h.cfg.perBlock ? -0.4 : 0.4); const p = this.world.nav.path(usher.x, usher.z, ax, s.z); if (!p) return false;
    usher.path = p; usher.pi = p.length > 1 ? 1 : 0; usher.state = 'guide'; usher.busy = true; usher.guideDone = `Row ${s.id.replace(/[0-9]/g, '')}, seat ${s.col}. Enjoy the show.`; return true; }
  // ---- audiences
  fillHall(hallId, count, instant, playerSeatId) {
    const h = this.world.halls.find((q) => q.cfg.id === hallId), pool = h.seats.filter((s) => !s.npc && !s.player && s.id !== playerSeatId && s.row >= 1 && s.row <= h.cfg.rows - 2), picks = []; while (picks.length < count && pool.length) picks.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    picks.forEach((s, i) => { s.npc = 'reserved'; s.taken = true; if (instant) this.spawnViewer(h, s, true); else this.arrivals.push({ t: i * 1.3 + rnd(0, 0.8), h, s }); });
  }
  spawnViewer(h, s, seated) {
    const model = pick(VIEWERS), n = this.spawn({ id: 'v' + Math.random().toString(36).slice(2, 7), model, name: pick(GUESTS), role: 'viewer', x: seated ? s.x : ENTRANCE.x + rnd(-0.6, 0.6), z: seated ? s.z + 0.08 : ENTRANCE.z, yaw: 180, hall: h.cfg.id }); n.hall = h.cfg.id; n.seat = s; s.npc = n; s.taken = true;
    if (seated) { n.char.sitDrop = 0.94 * n.char.scale - 0.58; n.seatedPose({ x: s.x, z: s.z + 0.08, y: s.y, yaw: Math.PI }); n.t = 1e9; } else this.goToSeat(n, h, s); return n;
  }
  goToSeat(n, h, s) { const lz = s.z - 0.66; n.goTo(aisleX(h, s), lz, (q) => { q.sideT = { x: s.x, z: lz, seat: { x: s.x, z: s.z + 0.08, y: s.y, yaw: Math.PI } }; q.state = 'sidestep'; q.seatTime = 1e9; }); }
  viewers(hallId) { return this.all.filter((n) => n.role === 'viewer' && n.hall === hallId && n.alive); }
  onFilmStart(hallId) { for (const n of this.viewers(hallId)) if (n.state === 'seated') { n.react = Math.random() < 0.5 ? 'cheer' : 'clap'; n.reactT = rnd(2.2, 4.2); } this.hooks.cheer && this.hooks.cheer(hallId, 3.5); }
  onFilmEnd(hallId) {
    for (let k = this.arrivals.length - 1; k >= 0; k--) { const a = this.arrivals[k]; if (a.h.cfg.id === hallId) { a.s.npc = null; a.s.taken = false; this.arrivals.splice(k, 1); } }
    const vs = this.viewers(hallId), now = this.now || 0; vs.forEach((n, i) => { n.leaving = true; n.leaveAt = now + 8000 + i * 650 + rnd(0, 1500); if (n.state === 'seated') { n.react = Math.random() < 0.55 ? 'clap' : 'cheer'; n.reactT = 7 + rnd(0, 2); } });
    this.hooks.applause && this.hooks.applause(hallId, 7);
  }
  update(dt, now, player, vis) {
    this.t += dt; this.now = now; const cx = { px: player.x, pz: player.z, playing: this.hooks.filmPlaying };
    for (let i = this.arrivals.length - 1; i >= 0; i--) { const a = this.arrivals[i]; a.t -= dt; if (a.t <= 0) { this.arrivals.splice(i, 1); this.spawnViewer(a.h, a.s, false); } }
    // separation + movement bookkeeping
    for (const n of this.all) { n.group.visible = vis.has(roomAt(n.x, n.z)); if (n.state === 'seated' || n.state === 'sitting' || n.state === 'standing') continue;
      for (const o of this.all) { if (o === n || o.state === 'seated' || o.state === 'sitting') continue; const dx = n.x - o.x, dz = n.z - o.z, d = Math.hypot(dx, dz); if (d < 0.62 && d > 1e-4) { const push = (0.62 - d) * 1.4 * dt, nx = n.x + dx / d * push, nz = n.z + dz / d * push; if (this.world.nav.walkable(nx, nz)) { n.x = nx; n.z = nz; } } }
      const pd = Math.hypot(n.x - player.x, n.z - player.z); if (pd < 0.7 && pd > 1e-4) { const push = (0.7 - pd) * 1.6 * dt, nx = n.x + (n.x - player.x) / pd * push, nz = n.z + (n.z - player.z) / pd * push; if (this.world.nav.walkable(nx, nz)) { n.x = nx; n.z = nz; } } }
    for (let i = this.all.length - 1; i >= 0; i--) { const n = this.all[i]; if (!n.alive) { this.root.remove(n.group); if (n.seat) { n.seat.npc = null; n.seat.taken = false; } if (n.spot) n.spot.taken = null; this.all.splice(i, 1); delete this.byId[n.id]; continue; }
      const dpl = Math.hypot(n.x - player.x, n.z - player.z); if (n.group.visible || n.state === 'walk' || n.state === 'leave' || n.state === 'sidestep') { if (n.group.visible) n.char.setLOD(dpl < 6 ? 0 : dpl < 14 ? 1 : 2); n.update(dt, now, cx); n.group.visible = n.group.visible && true; } }
    // laughter in an occupied hall the player can see
    this.laughT -= dt; if (this.laughT <= 0) { this.laughT = rnd(14, 38); const hid = HALLS.find((h) => vis.has(h.key) && this.viewers(h.id).length > 3); if (hid && this.hooks.filmPlaying && this.hooks.filmPlaying(hid.id)) { const vs = this.viewers(hid.id).filter((n) => n.state === 'seated'); for (let k = 0; k < Math.min(3, vs.length); k++) { const n = vs[Math.floor(Math.random() * vs.length)]; n.react = 'laugh'; n.reactT = rnd(1.2, 2.4); } this.hooks.laugh && this.hooks.laugh(null, hid.key); } }
  }
}
