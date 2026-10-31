// LUMIERE v5 - people with brains.
//  Staff stay at their posts (Tickets, the usher's guide stand, two snack vendors, the bartender), turn to you, greet, serve and guide.
//  Lobby guests arrive from the street, queue for snacks (the vendor really scoops and hands the bucket over), sit, chat in pairs, look at posters, leave.
//  Audiences exist only for a booked / scheduled show: they walk in or are already seated, react to film events (react.js), applaud and leave.
//  Anyone you can't see is simulated cheaply; seated viewers far from you are one instanced mesh per hall (vertex-shader animated).
import * as THREE from 'three';
import { People, randomRecipe as oldRecipe, STAFF_LOOK, crowdGeometry, propGeo, rng } from './characters.js';
// v8: the CC0 people (people.js); the v5 procedural characters stay as the fallback if their models fail to load
import { Person, DATA as PEOPLE, randomRecipe as newRecipe, staffRecipe, CrowdRenderer, SIT_H } from './people.js';
import { makeHeld, setHeldMaterial } from './held.js';
const STAFF_ROLES = new Set(['reception', 'usher', 'vendor', 'bar', 'server', 'greeter']);
import { roomAt, floorY, HALLS, hallById, hallDoor, STREET_SPAWN } from './layout.js';
import { aisleU } from './hallmath.js';
import { pick, lines } from './i18n.js';
const TAU = Math.PI * 2, rnd = (a, b) => a + Math.random() * (b - a), adiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
// v8: names from everywhere, matched to the person (phone feedback: most guests had Hindi or Urdu names)
const NAMES_M = ['Liam', 'Noah', 'Oliver', 'Lucas', 'Mateo', 'Hugo', 'Leo', 'Felix', 'Marco', 'Daniel', 'Ethan', 'Jonas', 'Kenji', 'Diego', 'Samuel', 'Theo', 'Adrian', 'Julien', 'Oscar', 'Rafael', 'Kwame', 'Ivan', 'Tomás', 'Max', 'Arjun'];
const NAMES_F = ['Ava', 'Emma', 'Mia', 'Chloe', 'Sofia', 'Lena', 'Clara', 'Iris', 'Nina', 'Zoe', 'Julia', 'Elena', 'Amelie', 'Grace', 'Hannah', 'Lucia', 'Maya', 'Yuki', 'Ines', 'Freya', 'Amara', 'Isabel', 'Stella', 'Aria', 'Zara'];
const nameFor = (rec, r = Math.random()) => { const L = rec && (rec.kind === 'f' || rec.female) ? NAMES_F : NAMES_M; return L[Math.floor(r * L.length)]; };
const LOBBY_POIS = [   // things guests walk up to and look at: [x, z, lookYaw (0 = +z), pitch (negative = up)]. The gallery adds its art prints (world.pois)
  [0, 3.4, Math.PI, -0.45], [-2.6, 13.6, Math.PI * 0.85, -0.75], [2.8, 6.8, -Math.PI * 0.2, -0.7], [9.4, 6.2, Math.PI / 2, -0.35], [9.4, 13.9, Math.PI / 2, -0.35],
  [-9.6, 18.4, -Math.PI / 2, -0.3], [5.5, 13.6, Math.PI / 2, -0.1], [-5.5, 13.6, -Math.PI / 2, -0.1], [5.5, 18.6, 0, 0], [-5.5, 18.6, 0, 0], [12.2, 16.6, Math.PI / 2, -0.1]];
const REACT = { scare: 'scream', gasp: 'gasp', laugh: 'laugh', aww: 'aww', climax: 'cheer', cheer: 'clap', end: 'clap', tension: 'lean' };
const EXPR_OF = { scream: 'scream', gasp: 'gasp', laugh: 'laugh', aww: 'aww', cheer: 'cheer', clap: 'happy', lean: 'focus', eat: 'smile' };
const CROWD_ACT = { clap: 1, cheer: 2, scream: 3, gasp: 4, laugh: 5, eat: 6, lean: 4, aww: 0 };
const REACT_CLIP = { clap: 'clap', cheer: 'cheer', scream: 'scream', gasp: 'gasp', laugh: 'laugh', aww: 'aww', lean: 'lean', eat: 'eat', drink: 'drink', shush: 'shush', look: 'look' };   // v8 baked crowd clips (people.js BAKE)
const _c = new THREE.Color();
// ---------------------------------------------------------------- agent: one physical character with movement helpers
class Agent {
  constructor(crowd, o) {
    this.crowd = crowd; this.id = o.id; this.name = o.name; this.role = o.role; this.rec = o.rec; this.ch = crowd.people.make(o.rec, { staff: STAFF_ROLES.has(o.role), idle: o.role === 'guest' ? (Math.random() < 0.2 ? 'Idle_TalkingPhone_Loop' : Math.random() < 0.25 ? 'Idle_FoldArms_Loop' : 'Idle_Loop') : 'Idle_Loop' }); this.group = this.ch.group; crowd.root.add(this.group);
    this.x = o.x; this.z = o.z; this.y = floorY(o.x, o.z); this.yaw = o.yaw || 0; this.v = 0; this.path = null; this.pi = 0; this.onArrive = null; this.state = o.state || 'idle'; this.t = rnd(1, 4); this.alive = true;
    this.light = { amb: new THREE.Color(0.4, 0.4, 0.4), key: new THREE.Color(0.3, 0.3, 0.3), dir: new THREE.Vector3(0.3, 0.8, 0.4).normalize(), screen: new THREE.Color(0, 0, 0) }; this.lightT = Math.random() * 0.3;
    this.speedMax = o.speed || rnd(1.05, 1.35); this.seat = null; this.spot = null; this.reactUntil = 0; this.talkUntil = 0; this.lookT = null; this.home = o.home || null; this.busy = false; this.gUntil = 0; this.invisibleT = 0;
    this.apply(); this.ch.update(0.016, this.light);
  }
  apply() { this.group.position.set(this.x, this.y, this.z); this.group.rotation.y = this.yaw; }
  goTo(x, z, then, run = false) { const p = this.crowd.world.nav.path(this.x, this.z, x, z); if (!p) { this.path = null; return false; } this.path = p; this.pi = p.length > 1 ? 1 : 0; this.onArrive = then || null; this.run = run; return true; }
  turnTo(tx, tz, rate, dt) { const want = Math.atan2(tx - this.x, tz - this.z), d = adiff(want, this.yaw); this.yaw += Math.max(-rate * dt, Math.min(rate * dt, d)); return Math.abs(d); }
  turnYaw(want, rate, dt) { const d = adiff(want, this.yaw); this.yaw += Math.max(-rate * dt, Math.min(rate * dt, d)); return Math.abs(d); }
  // follow the current path; returns true while moving
  walk(dt) {
    const p = this.path; if (!p) { this.v += (0 - this.v) * Math.min(1, dt * 6); return false; } const k = p[this.pi]; if (!k) { this.path = null; const f = this.onArrive; this.onArrive = null; f && f(this); return false; }
    const dx = k[0] - this.x, dz = k[1] - this.z, d = Math.hypot(dx, dz), off = this.turnTo(k[0], k[1], 6, dt), vmax = (this.run ? 1.7 : 1) * this.speedMax * (this.waitFor ? 0.8 : 1);
    this.v += (Math.min(vmax, off > 1.1 ? 0.15 : vmax) - this.v) * Math.min(1, dt * 4); const st = Math.min(d, this.v * dt); if (d > 1e-4) { this.x += dx / d * st; this.z += dz / d * st; }
    if (d < 0.18) { this.pi++; if (this.pi >= p.length) { this.path = null; this.v *= 0.5; const f = this.onArrive; this.onArrive = null; f && f(this); } } return true;
  }
  // sit: back into a spot (x, z = hip point, y = floor, face = facing yaw, h = cushion height, recline)
  sitDown(sp, then) { this.sitFrom = { x: this.x, z: this.z, yaw: this.yaw }; this.sitTo = sp; this.sitU = 0; this.state = 'sitting'; this.path = null; this.afterSit = then; this.ch.s.drop = this.ch.seatDrop(sp.h); this.ch.s.recline = sp.recline ?? 0.1; }
  standUp(to, then) { this.state = 'standing'; this.sitU = 1; this.standTo = to; this.standFrom = { x: this.x, z: this.z }; this.afterStand = then; }
  say(line, dur = 3.2) { if (!line) return; this.talkUntil = this.crowd.now + Math.min(2600, dur * 700); this.crowd.hooks.bubble && this.crowd.hooks.bubble(this, line, dur); }   // line: an i18n pick (voiced) or text
  gesture(g, secs, expr) { this.ch.gestT = g; this.gUntil = this.crowd.now + secs * 1000; if (expr) this.ch.setExpr(expr); }
  react(kind, secs) { this.gesture(kind, secs, EXPR_OF[kind] || 'neutral'); this.reactUntil = this.crowd.now + secs * 1000; }
  // physical update: locomotion, sitting transitions, pose, face, light
  tick(dt, now, player, visible) {
    const ch = this.ch; let walking = false;
    if (this.state === 'sitting') { this.sitU = Math.min(1, this.sitU + dt / 1.25); const u = this.sitU, a = this.sitFrom, b = this.sitTo, e = u < 0.6 ? u / 0.6 : 1; const m = e * e * (3 - 2 * e);
      this.x = a.x + (b.x - a.x) * m; this.z = a.z + (b.z - a.z) * m; this.yaw = a.yaw + adiff(b.face, a.yaw) * Math.min(1, u * 2.2); ch.s.sit = u; this.y += (b.y - this.y) * Math.min(1, dt * 10);
      if (u >= 1) { this.state = 'seated'; const f = this.afterSit; this.afterSit = null; f && f(this); } }
    else if (this.state === 'standing') { this.sitU = Math.max(0, this.sitU - dt / 1.0); ch.s.sit = this.sitU; if (this.sitU < 0.5 && this.standTo) { const k = 1 - this.sitU / 0.5; this.x += (this.standTo.x - this.x) * Math.min(1, dt * 4 * k); this.z += (this.standTo.z - this.z) * Math.min(1, dt * 4 * k); }
      if (this.sitU <= 0) { this.state = 'idle'; ch.s.sit = 0; const f = this.afterStand; this.afterStand = null; f && f(this); } }
    else if (this.state === 'seated') { ch.s.sit = 1; if (this.sitTo) { this.x = this.sitTo.x; this.z = this.sitTo.z; this.y = this.sitTo.y; } }
    else { ch.s.sit = 0; walking = this.walk(dt); if (this.sideTo) { const s = this.sideTo, dx = s.x - this.x, dz = s.z - this.z, d = Math.hypot(dx, dz); this.turnYaw(s.faceWhile, 6, dt); const st = Math.min(d, 0.6 * dt); if (d > 1e-3) { this.x += dx / d * st; this.z += dz / d * st; } this.v = 0.6; walking = true; if (d < 0.02) { const f = s.then; this.sideTo = null; this.v = 0; f && f(this); } } }
    if (this.state !== 'sitting' && this.state !== 'seated') this.y += (floorY(this.x, this.z) - this.y) * Math.min(1, dt * 12);
    ch.walkT = walking ? Math.max(0.3, this.v) : 0;
    if (this.gUntil && now > this.gUntil) { this.gUntil = 0; ch.gestT = this.holdGesture || null; if (!this.holdExpr) ch.setExpr('neutral'); else ch.setExpr(this.holdExpr); }
    ch.talking = now < this.talkUntil;
    // look at the player when close and roughly in front
    const dxp = player.x - this.x, dzp = player.z - this.z, dp = Math.hypot(dxp, dzp), rel = adiff(Math.atan2(dxp, dzp), this.yaw);
    const want = this.forceLook != null ? 1 : dp < 3.6 && Math.abs(rel) < 1.7 && !walking ? 1 : 0; ch.s.lookAmt += (want - ch.s.lookAmt) * Math.min(1, dt * 3);
    ch.s.lookYaw = this.forceLook != null ? this.forceLook : rel; ch.s.lookPitch = this.lookPitch || 0;
    if (visible) { this.lightT -= dt; if (this.lightT <= 0) { this.lightT = 0.25; this.crowd.lightAt(this.x, this.y + 1.2, this.z, this.light); } ch.update(dt, this.light); }
    this.apply();
  }
  dispose() { this.alive = false; this.crowd.root.remove(this.group); for (const k in this.ch.items) this.ch.detach(k); this.ch.mat.dispose(); }
}
// ---------------------------------------------------------------- the crowd
export class Crowd {
  constructor(world, mats, engine, hooks = {}) {
    this.world = world; this.mats = mats; this.engine = engine; this.hooks = hooks; this.root = new THREE.Group(); this.root.name = 'people'; engine.scene.add(this.root);
    this.v8 = PEOPLE.ready; this.people = this.v8 ? { make: (r, o) => new Person(r, o) } : new People(mats);
    this.recipe = (seed) => (this.v8 ? newRecipe(seed) : oldRecipe(seed)); this.staffRec = (look, seed) => (this.v8 ? staffRecipe(look, seed) : STAFF_LOOK[look] || STAFF_LOOK.usher);
    this.agents = []; this.staff = {}; this.viewers = {}; this.now = 0; this.nid = 0; this.inst = {}; this.queue = []; this.propMat = new Map(); this.pois = LOBBY_POIS.concat(world.pois || []);
    for (const h of world.halls) this.viewers[h.id] = [];
  }
  get preset() { return this.engine.preset; }
  lightAt(x, y, z, out) {
    const k = roomAt(x, z), r = this.world.rooms[k]; if (!r) return out; const p = r.lights.probe(x, y, z), hU = r.U.uHouse.value;
    const ar = p.ah[0] * hU + p.af[0], ag = p.ah[1] * hU + p.af[1], ab = p.ah[2] * hU + p.af[2];
    out.amb.setRGB(ar * 0.85, ag * 0.85, ab * 0.85); out.key.setRGB(ar, ag, ab).multiplyScalar(0.5 + 0.6 * p.s); out.dir.set(p.keyDir[0], p.keyDir[1], p.keyDir[2]); out.screen.copy(r.U.uScreen.value).multiplyScalar(p.ls * 1.6); return out;
  }
  spawn(o) { const a = new Agent(this, { id: o.id || 'n' + (this.nid++), ...o }); this.agents.push(a); return a; }
  // ---------------------------------------------------------- staff + opening guests
  init() {
    const P = this.world.posts, mk = (id, look, name, role, post) => { const p = P[post]; const a = this.spawn({ id, rec: this.staffRec(look, id.length * 131), name, role, x: p.x, z: p.z, yaw: p.yaw, home: p, state: 'post' }); a.talkable = true; a.post = post; this.staff[id] = a; return a; };
    mk('eloise', 'receptionist', 'Éloïse', 'reception', 'receptionist'); mk('marcel', 'usher', 'Marcel', 'usher', 'usher'); mk('gaston', 'vendor2', 'Gaston', 'vendor', 'vendor1'); mk('mia', 'vendor', 'Mia', 'vendor', 'vendor2'); mk('odette', 'bartender', 'Odette', 'bar', 'bartender'); if (P.greeter) mk('clara', 'greeter', 'Clara', 'greeter', 'greeter');
    this.setDensity(this.engine.settings.npcs);
    for (let i = 0; i < this.target; i++) this.spawnGuest(true);
  }
  // v8 Settings > NPCs (off / few / normal / many) scales lobby guests and audiences; the staff always stay (they run the night).
  // Lowering it sends the extra guests home on foot instead of deleting them in view.
  setDensity(level) {
    this.density = { off: 0, few: 0.4, normal: 0.75, many: 1 }[level] ?? 0.75; this.target = Math.round(({ low: 6, medium: 10, high: 14 }[this.engine.settings.graphics] || 10) * this.density * 1.3);
    let extra = this.agents.filter((a) => a.role === 'guest').length - this.target; for (const a of this.agents) if (extra > 0 && a.role === 'guest' && a.plan && a.plan[0] !== 'leave') { a.plan = ['leave']; a.t = 0; extra--; }
  }
  // bodies the player bumps into (v8: you can no longer walk through people)
  bodiesNear(x, z, r) { const out = this._bodies || (this._bodies = []); out.length = 0; for (const a of this.agents) { if (!a.alive || !a.group.visible) continue; const d = Math.hypot(a.x - x, a.z - z); if (d < r) out.push({ x: a.x, z: a.z, r: a.state === 'seated' ? 0.22 : 0.26, a }); } return out; }
  // you walked into someone: they say so (once in a while, not every frame you touch)
  bumped(a) { if (!a.alive || a.mission || a.talkingToPlayer || a.state === 'sitting' || a.state === 'standing' || this.now - (a._bump || -1e9) < 9000 || this.now - (this._bumpAny || -1e9) < 2500) return; a._bump = this._bumpAny = this.now; a.say(pick('guest.bump'), 2); a.gesture(a.role === 'guest' || a.role === 'viewer' ? 'gasp' : 'talk', 0.9, 'surprise'); }
  // the guide reads your ticket: looks down at it, then names screen, row and seat
  readTicket(a, tk) { a.path = null; a.gesture('read', 1.6, 'focus'); setTimeout(() => a.say(pick('ush.read'), 2.8), 700); }
  // the seat bell: a server comes from the hall's entrance to the end of your row, talks, hands the tablet, leaves when you hand it back
  callServer(player, onArrive) {
    if (this.server && this.server.alive) return false; const hk = roomAt(player.x, player.z), hall = this.world.halls.find((h) => h.key === hk); if (!hall || !player.seated) return false;
    const seat = hall.seats.find((s) => s.npc === 'player') || hall.seats.reduce((b, s) => (Math.hypot(s.x - player.x, s.z - player.z) < Math.hypot(b.x - player.x, b.z - player.z) ? s : b)), door = this._hallDoor(hall, 'entrance'), ap = this.aislePoint(hall, seat), lane = this.laneStand({ seat, hall });
    const a = this.spawn({ id: 'server', rec: this.staffRec('server', 77), name: 'Rémy', role: 'server', x: door.x, z: door.z, yaw: 0, state: 'post', speed: 1.7 }); a.talkable = false; a.home = { x: door.x, z: door.z, yaw: 0 }; this.server = a;
    a.mission = { kind: 'serve', hall, seat, phase: 'go' }; a.goTo(ap.x, ap.z, () => a.goTo(lane.x, lane.z, () => { a.mission.phase = 'at'; a.turnTo(player.x, player.z, 10, 1); a.gesture('wave', 1.2, 'smile'); a.say(pick('srv.hello'), 2.6); onArrive && onArrive(a); }));
    return true;
  }
  serverLeave(key = 'srv.bye') { const a = this.server; if (!a || !a.alive) return; a.say(pick(key), 2.4); a.mission = { kind: 'serve', phase: 'leave' }; setTimeout(() => { if (!a.alive) return; if (!a.goTo(a.home.x, a.home.z, () => { a.dispose(); this.server = null; })) { a.dispose(); this.server = null; } }, 900); }
  spawnGuest(placed) {
    const seed = Math.random() * 1e6, rec = this.recipe(seed), name = nameFor(rec);
    let x, z; if (placed) { const p = this.pois[Math.floor(Math.random() * this.pois.length)]; x = p[0] + rnd(-1.5, 1.5); z = p[1] + rnd(0.5, 2); const n = this.world.nav.nearest(x, z) || [0, 15]; x = n[0]; z = n[1]; } else { const s = STREET_SPAWN[Math.floor(Math.random() * STREET_SPAWN.length)]; x = s[0] + rnd(-1, 1); z = s[1] - 1.5; }
    const a = this.spawn({ rec, name, role: 'guest', x, z, yaw: Math.PI, state: 'idle' }); a.talkable = true; a.plan = this.makePlan(); if (Math.random() < 0.3) this.giveItem(a, Math.random() < 0.7 ? 'popcorn' : 'drink');
    if (!placed) a.goTo(0, 17.5, (n) => { n.t = 0.5; });
    return a;
  }
  makePlan() { const steps = []; const n = 2 + Math.floor(Math.random() * 3); for (let i = 0; i < n; i++) steps.push(['wander', 'sit', 'chat', 'snack', 'wander', 'sit'][Math.floor(Math.random() * 6)]); steps.push('leave'); return steps; }
  giveItem(a, kind) {
    if (this.v8) { const mesh = makeHeld(kind === 'popcorn' ? 'popcorn' : 'drink'); setHeldMaterial(mesh, this.itemMat(a)); mesh.userData.setLevel && mesh.userData.setLevel(0.5 + Math.random() * 0.5); a.ch.attach('item', mesh, 'handR'); a.item = kind; a.holdGesture = 'hold'; a.ch.gestT = a.ch.gestT || 'hold'; return; }
    if (!this.propMat.has(kind)) this.propMat.set(kind, propGeo(kind)); const mesh = new THREE.Mesh(this.propMat.get(kind), this.itemMat(a)); a.ch.attach('item', mesh, 'handR', kind === 'popcorn' ? [0.005, -0.12, 0.06] : [0.0, -0.11, 0.05]); a.item = kind; a.holdGesture = 'hold'; a.ch.gestT = a.ch.gestT || 'hold'; }
  itemMat(a) { const m = this.mats.propMat ? this.mats.propMat(a.ch.mat.uniforms) : new THREE.MeshBasicMaterial({ vertexColors: true }); return m; }
  // ---------------------------------------------------------- talking with the player
  talkTarget(px, pz, fx, fz) { let best = null, bd = 2.6; for (const a of this.agents) { if (!a.talkable || !a.group.visible || a.state === 'sitting' || a.state === 'standing' || a.mission) continue; const dx = a.x - px, dz = a.z - pz, d = Math.hypot(dx, dz); if (d < bd && (dx * fx + dz * fz) / (d || 1) > 0.35) { bd = d; best = a; } } return best; }
  startTalk(a) { a.prevState = a.state; a.talkingToPlayer = true; a.path = null; if (a.partner) { a.partner.partner = null; a.partner = null; } if (a.state === 'chat') a.state = 'idle'; }
  endTalk(a) { a.talkingToPlayer = false; a.forceLook = null; a.t = rnd(1.5, 3); }
  // ---------------------------------------------------------- serving: vendor / bartender make it, hand it over
  serve(staff, kind, onGiven) {
    if (staff.serving) return false; staff.serving = { kind, onGiven, t: 0, phase: 'turn' }; staff.say(pick(staff.role === 'bar' ? 'bar.serve' : 'ven.serve'), 2.2); return true;
  }
  _serveTick(a, dt, player) {
    const s = a.serving, home = a.home; s.t += dt; const back = home.yaw + Math.PI, isDrink = /cola|coffee|mocktail/.test(s.kind);
    if (s.phase === 'turn') { a.turnYaw(back, 5, dt); if (s.t > 0.6) { s.phase = 'make'; s.t = 0; a.gesture(isDrink ? 'pour' : 'scoop', 1.8, 'focus'); this.giveItem(a, isDrink ? 'drink' : 'popcorn'); a.holdGesture = null; } }
    else if (s.phase === 'make') { a.turnYaw(back, 5, dt); if (s.t > 1.8) { s.phase = 'back'; s.t = 0; a.ch.gestT = 'hold'; } }
    else if (s.phase === 'back') { a.turnTo(s.to ? s.to.x : player.x, s.to ? s.to.z : player.z, 5, dt); if (s.t > 0.7) { s.phase = 'give'; s.t = 0; a.gesture('give', 1.0, 'smile'); } }
    else if (s.phase === 'give') { a.turnTo(s.to ? s.to.x : player.x, s.to ? s.to.z : player.z, 5, dt); if (s.t > 0.75) { a.ch.detach('item'); a.item = null; a.ch.gestT = null; a.holdGesture = null; const f = s.onGiven; a.serving = null; a.say(pick(a.role === 'bar' ? 'bar.give' : 'ven.give'), 3); f && f(s.kind); } }
  }
  // ---------------------------------------------------------- the usher walks you to your row, then walks back
  guide(usher, hall, seat) {
    const H = hall.cfg, aisle = this.aislePoint(hall, seat); if (!usher.goTo(aisle.x, aisle.z)) return false;
    usher.mission = { kind: 'guide', hall, seat, aisle, said: 0 }; usher.state = 'guide'; usher.say(pick('ush.follow'), 2.6); return true;
  }
  aislePoint(hall, seat) { const H = hall.cfg, au = aisleU(H, seat), left = au < seat.u, ax = H.cx + au, r = seat.row, laneD = (H.pf[r] === -Infinity ? H.dHip[r] - H.seat.fr - 0.5 : (H.pf[r] + H.dHip[r] - H.seat.fr) / 2); return { x: ax, z: H.zs + laneD - H.rowSag(ax - H.cx), laneD, left }; }
  // ---------------------------------------------------------- audiences
  planAudience(hallId, n, seatedShare, spreadMs, avoid = new Set()) {
    n = Math.round(n * (this.density ?? 0.75) / 0.75); if (n <= 0) return;
    const hall = this.world.hallById(hallId), H = hall.cfg, list = this.viewers[hallId], taken = new Set(list.filter((v) => v.state !== 'gone').map((v) => v.seat.id));
    const pool = hall.seats.filter((s) => !taken.has(s.id) && !avoid.has(s.id) && !s.player);
    // people like the middle: weight seats by closeness to the centre and to the middle rows
    const w = pool.map((s) => { const c = 1 - Math.abs(s.u) / (H.B / 2), rr = 1 - Math.abs(s.row - H.rows * 0.55) / H.rows; return Math.random() * 0.6 + c * 0.9 + rr * 0.7; });
    const idx = pool.map((_, i) => i).sort((a, b) => w[b] - w[a]).slice(0, n);
    for (const i of idx) { const s = pool[i], seed = Math.random() * 1e6, rec = this.recipe(seed), R = rng(seed + 3);
      const v = { id: 'v' + (this.nid++), hall, seat: s, rec, arch: Math.floor(R() * 4), name: nameFor(rec, R()), state: Math.random() < seatedShare ? 'seated' : 'planned', arriveAt: this.now + Math.random() * spreadMs, agent: null,
        act: 0, amt: 0, until: 0, phase: R() * 10, talky: R() < 0.3, pers: { excite: R(), humor: R(), delay: 0.12 + R() * 0.55, popcorn: R() < 0.45 }, inst: -1, leaveAt: 0 };
      s.taken = true; s.npc = v; list.push(v); }
  }
  clearAudience(hallId) { for (const v of this.viewers[hallId]) this.dropViewer(v); this.viewers[hallId] = []; }
  dropViewer(v) { if (v.agent) { v.agent.dispose(); this.agents.splice(this.agents.indexOf(v.agent), 1); v.agent = null; } if (v.seat.npc === v) { v.seat.npc = null; v.seat.taken = false; } v.state = 'gone'; }
  seatPose(v) { const s = v.seat, H = v.hall.cfg, h = H.kind === 'curved' ? 0.52 : 0.46; return { x: s.x, z: s.z, y: s.y, face: s.yaw + Math.PI, h, recline: H.kind === 'curved' ? 0.3 : 0.2 }; }
  laneStand(v) { const s = v.seat, H = v.hall.cfg, laneD = H.dHip[s.row] - H.seat.fr - 0.24; return { x: s.x, z: H.zs + laneD - H.rowSag(s.u) }; }
  // the show's events -> who reacts, how, when; plus the matching crowd sound
  onFilmEvent(hallId, ev) {
    const vs = this.viewers[hallId].filter((v) => v.state === 'seated'); if (!vs.length) return; let n = 0, sx = 0, sz = 0;
    const kind = REACT[ev.type]; if (!kind) return; const now = this.now;
    for (const v of vs) { const p = v.pers; let prob = 0.5;
      if (ev.type === 'scare') prob = 0.35 + 0.55 * p.excite; else if (ev.type === 'laugh') prob = 0.25 + 0.65 * p.humor; else if (ev.type === 'gasp') prob = 0.3 + 0.5 * p.excite; else if (ev.type === 'aww') prob = 0.35 + 0.4 * (1 - p.excite); else if (ev.type === 'climax') prob = 0.45 + 0.5 * p.excite; else if (ev.type === 'end') prob = 0.92; else if (ev.type === 'cheer') prob = 0.5; else if (ev.type === 'tension') prob = 0.6;
      prob *= 0.6 + 0.4 * ev.k; if (Math.random() > prob) continue;
      let k2 = kind; if (ev.type === 'scare') k2 = p.excite > 0.55 ? 'scream' : 'gasp'; if (ev.type === 'climax') k2 = p.excite > 0.4 ? 'cheer' : 'clap'; if (ev.type === 'end') k2 = p.excite > 0.75 ? 'cheer' : 'clap';
      const dur = { scream: 1.6 + Math.random(), gasp: 1.4, laugh: 1.8 + Math.random() * 1.5, aww: 2.2, cheer: 2.5 + Math.random() * 1.5, clap: ev.type === 'end' ? 6 + Math.random() * 4 : 2.6, lean: 6 }[k2] || 2;
      v.pending = { kind: k2, at: now + p.delay * 1000 * (ev.type === 'end' ? 2 : 1) + Math.random() * 250, dur }; n++; sx += v.seat.x; sz += v.seat.z; }
    if (n && this.hooks.crowdSound) this.hooks.crowdSound(hallId, ev.type, n, ev.k, sx / n, sz / n);
    // a seated viewer near you sometimes says something (only some events, rate-limited)
    if (this.hooks.nearViewer && (ev.type === 'scare' || ev.type === 'laugh' || ev.type === 'tension' || ev.type === 'aww' || ev.type === 'climax' || ev.type === 'end') && now - (this._quip || 0) > 25000) { const v = this.hooks.nearViewer(vs); if (v && v.agent) { this._quip = now; setTimeout(() => v.agent && v.agent.say(pick({ scare: 'aud.scare', laugh: 'aud.laugh', tension: 'aud.tension', aww: 'aud.aww', climax: 'aud.climax', end: 'aud.end' }[ev.type]), 2.6), 900); } }
    if ((ev.type === 'scare' || ev.type === 'laugh') && Math.random() < 0.35) { const v = vs[Math.floor(Math.random() * vs.length)]; v.shushAt = now + 2500; }
    if (ev.type === 'end') for (const v of vs) v.leaveAt = now + 7000 + Math.random() * 22000;
  }
  onShowPhase(hallId, phase) { if (phase === 'dimming') for (const v of this.viewers[hallId]) { v.talky = false; if (v.state === 'seated' && Math.random() < 0.35) v.pending = { kind: 'clap', at: this.now + 300 + Math.random() * 900, dur: 2 }; } }
  // ---------------------------------------------------------- per-frame
  update(dt, now, player, vis, ctx) {
    this.now = now; const room = roomAt(player.x, player.z);
    // lobby population: replace guests who left; staff brains; guest brains
    const guests = this.agents.filter((a) => a.role === 'guest'); if (guests.length < this.target && Math.random() < dt * 0.06) this.spawnGuest(false);   // v8: newcomers always walk in from the street (no popping in), one at a time
    for (const a of this.agents) { if (!a.alive) continue; const rk = roomAt(a.x, a.z), visible = vis.has(rk) && Math.hypot(a.x - player.x, a.z - player.z) < 45; a.group.visible = visible;
      if (a.role === 'guest') this.guestBrain(a, dt, now, player, visible); else if (a.role === 'viewer') this.viewerBrain(a, dt, now, player, visible); else this.staffBrain(a, dt, now, player, ctx);
      if (visible) a.ch.setLOD(Math.hypot(a.x - player.x, a.z - player.z) < 7 ? 0 : Math.hypot(a.x - player.x, a.z - player.z) < 16 ? 1 : 2);
      if (visible || a.path || a.state === 'sitting' || a.state === 'standing' || a.sideTo) a.tick(visible ? dt : dt, now, player, visible); }
    // separation between walkers, and from the player
    for (const a of this.agents) { if (!a.alive || a.state === 'seated' || a.state === 'sitting' || a.role !== 'guest' && a.role !== 'viewer' && a.role !== 'usher') continue;
      for (const b of this.agents) { if (b === a || b.state === 'seated' || b.state === 'sitting') continue; const dx = a.x - b.x, dz = a.z - b.z, d = Math.hypot(dx, dz); if (d < 0.55 && d > 1e-4) { const push = (0.55 - d) * 1.2 * dt, nx = a.x + dx / d * push, nz = a.z + dz / d * push; if (this.world.nav.walkable(nx, nz)) { a.x = nx; a.z = nz; } } }
      const dx = a.x - player.x, dz = a.z - player.z, d = Math.hypot(dx, dz); if (d < 0.6 && d > 1e-4 && !a.sideTo) { const push = (0.6 - d) * 1.5 * dt, nx = a.x + dx / d * push, nz = a.z + dz / d * push; if (this.world.nav.walkable(nx, nz)) { a.x = nx; a.z = nz; } } }
    for (let i = this.agents.length - 1; i >= 0; i--) if (!this.agents[i].alive) this.agents.splice(i, 1);
    // audiences
    for (const h of this.world.halls) this.audienceTick(h, dt, now, player, vis, room);
  }
  staffBrain(a, dt, now, player, ctx) {
    const home = a.home, dp = Math.hypot(player.x - a.x, player.z - a.z);
    if (a.serving) { this._serveTick(a, dt, player); return; }
    if (a.mission) { this._missionTick(a, dt, now, player); return; }
    if (a.state === 'return') { if (!a.path) { if (Math.hypot(a.x - home.x, a.z - home.z) < 0.3) a.state = 'post'; else if (!a.goTo(home.x, home.z, (n) => { n.state = 'post'; })) { a.x = home.x; a.z = home.z; a.state = 'post'; } } return; }
    if (a.talkingToPlayer) { a.turnTo(player.x, player.z, 4, dt); return; }
    // at the post: face the customer side, turn to you when you come close, greet once per approach
    if (Math.hypot(a.x - home.x, a.z - home.z) > 0.4 && !a.path) { a.state = 'return'; return; }
    if (dp < 3.8) a.turnTo(player.x, player.z, 3, dt); else a.turnYaw(home.yaw, 2.5, dt);
    if (dp < (a.role === 'greeter' ? 5 : 3.4) && !a.greeted) { a.greeted = true; a.say(pick(a.role === 'greeter' && !a.welcomed ? 'gre.hello' : 'greet'), 3.4); a.welcomed = true; if (a.role === 'usher' || a.role === 'reception' || a.role === 'greeter') a.gesture('wave', 1.6, 'smile'); } if (dp > 7) a.greeted = false;
    a.t -= dt; if (a.t <= 0) { a.t = rnd(4, 9); const r = Math.random();
      if (a.role === 'reception') a.gesture(r < 0.6 ? 'type' : 'talk', rnd(2.5, 4), r < 0.6 ? 'focus' : 'smile');
      else if (a.role === 'usher') { a.holdGesture = r < 0.5 ? 'hips' : 'arms'; a.ch.gestT = a.holdGesture; if (r > 0.75) { a.gesture('point', 2, 'smile'); if (dp < 9) a.say(pick('bark.usher'), 2.6); } }
      else if (a.role === 'vendor') { if (r < 0.35) a.gesture('scoop', 2.2, 'focus'); else if (r > 0.85 && dp < 9) a.say(pick('bark.vendor'), 2.8); }
      else if (a.role === 'bar') { if (r < 0.4) a.gesture('pour', 2.0, 'focus'); else if (r > 0.85 && dp < 8) a.say(pick('bark.bar'), 2.6); }
      else if (a.role === 'greeter') { a.holdGesture = r < 0.5 ? 'hips' : null; a.ch.gestT = a.holdGesture; if (r > 0.8 && dp < 10) { a.gesture('wave', 1.6, 'smile'); a.say(pick('gre.bark'), 2.6); } }
      if (a.role === 'reception' && r > 0.9 && dp < 9) a.say(pick('bark.reception'), 3); }
    // serve a guest waiting at the counter
    if ((a.role === 'vendor' || a.role === 'bar') && !a.serving) { const q = this.queue.find((g) => g.alive && g.waitFor === (a.role === 'bar' ? 'bar' : 'snacks') && !g.servedBy && Math.hypot(g.x - a.x, g.z - a.z) < 3.2 && !g.path);
      if (q) { q.servedBy = a; a.serving = { kind: a.role === 'bar' ? 'drink' : 'salted', t: 0, phase: 'turn', to: q, onGiven: () => { this.giveItem(q, a.role === 'bar' ? 'drink' : 'popcorn'); q.waitFor = null; q.servedBy = null; this.queue.splice(this.queue.indexOf(q), 1); q.t = 0.5; q.ch.setExpr('happy'); } }; } }
  }
  _missionTick(a, dt, now, player) {
    const m = a.mission, dp = Math.hypot(player.x - a.x, player.z - a.z);
    if (m.kind === 'serve') { if (m.phase === 'at') a.turnTo(player.x, player.z, 4, dt); return; }
    if (m.kind !== 'guide') return;
    a.speedMax = dp < 2.2 ? 2.0 : dp < 3.6 ? 1.6 : 1.15;   // v8: "the guide is so slow, I can outrun him": he keeps your pace
    if (m.phase === 'point') { m.t -= dt; a.turnTo(m.seat.x, m.seat.z, 4, dt); if (m.t <= 0) { a.mission = null; a.ch.gestT = null; a.state = 'return'; a.goTo(a.home.x, a.home.z, (n) => { n.state = 'post'; }); } return; }
    if (dp > 5.5 && a.path && !a.pausedPath) { a.pausedPath = a.path; a.pausedPi = a.pi; a.path = null; }
    if (a.pausedPath) { if (dp < 3.2) { a.path = a.pausedPath; a.pi = a.pausedPi; a.pausedPath = null; a.ch.gestT = null; } else { a.turnTo(player.x, player.z, 4, dt); a.ch.gestT = 'wave'; if (now - m.said > 7000) { m.said = now; a.say(pick('ush.wait'), 2.4); } return; } }
    if (!a.path) { m.phase = 'point'; m.t = 3.4; a.gesture('point', 3.2, 'happy'); a.say(pick('ush.arrive'), 4); this.hooks.guideDone && this.hooks.guideDone(a); }
  }
  guestBrain(a, dt, now, player, visible) {
    if (a.talkingToPlayer || a.state === 'sitting' || a.state === 'standing') { if (a.talkingToPlayer) a.turnTo(player.x, player.z, 4, dt); return; }
    // you stand right in front of someone for a while: they notice
    if (visible && !a.path && a.state === 'idle' && Math.hypot(player.x - a.x, player.z - a.z) < 1.3) { a._stareT = (a._stareT || 0) + dt; if (a._stareT > 2.6 && now - (a._stare || -1e9) > 30000) { a._stare = now; a._stareT = 0; a.turnTo(player.x, player.z, 10, 1); a.say(pick('guest.stare'), 2.4); } } else a._stareT = 0;
    if (a.state === 'seated') { a.t -= dt; if (a.item && Math.random() < dt * 0.15) a.gesture(a.item === 'popcorn' ? 'eat' : 'drink', 2.5); if (!a.item && Math.random() < dt * 0.05) a.gesture('phone', 5, 'focus'); if (a.t <= 0) { const sp = a.spot; a.standUp(sp ? sp.stand : null, (n) => { if (sp) sp.taken = null; n.spot = null; n.t = 0.5; n.state = 'idle'; }); } return; }
    if (a.state === 'chat') { this._chatTick(a, dt, now, player); return; }
    if (a.waitFor) { a.t -= dt; const spot = this.world.spots[a.waitFor]; if (spot) a.turnTo(spot.x + (a.waitFor === 'bar' ? -1 : 1), spot.z, 3, dt); if (a.t < -40) { a.waitFor = null; a.servedBy = null; const i = this.queue.indexOf(a); if (i >= 0) this.queue.splice(i, 1); } return; }
    if (a.path) return;
    if (a.lookT != null) { a.lookT -= dt; if (a.yawWant != null) a.turnYaw(a.yawWant, 3, dt); if (a.lookT > 0) return; a.lookT = null; a.yawWant = null; a.forceLook = null; a.lookPitch = 0; }
    a.t -= dt; if (a.t > 0) return;
    const next = a.plan.shift() || 'leave';
    if (next === 'wander') { const p = this.pois[Math.floor(Math.random() * this.pois.length)]; if (!a.goTo(p[0] + rnd(-0.6, 0.6), p[1] + rnd(-0.3, 0.3), (n) => { n.lookYaw = p[2]; n.lookT = rnd(3, 7); n.yawWant = p[2]; n.lookPitch = p[3]; n.t = 0.3; })) a.t = 1; else a.lookPitch = 0; return; }
    if (next === 'sit') { const sp = this.freeSpot(a); if (!sp) { a.t = 1; return; } sp.taken = a.id; a.spot = sp; a.goTo(sp.stand.x, sp.stand.z, (n) => { n.sitDown({ x: sp.x, z: sp.z, y: 0, face: sp.face, h: sp.y, recline: sp.kind === 'stool' ? 0 : 0.12 }, (m) => { m.t = rnd(25, 70); }); }); return; }
    if (next === 'chat') { const b = this.agents.find((o) => o !== a && o.role === 'guest' && o.alive && !o.partner && !o.path && o.state === 'idle' && !o.talkingToPlayer && Math.hypot(o.x - a.x, o.z - a.z) < 12); if (!b) { a.t = 1; return; } a.partner = b; b.partner = a; const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2, ang = Math.atan2(b.x - a.x, b.z - a.z), n0 = this.world.nav.nearest(mx - Math.sin(ang) * 0.55, mz - Math.cos(ang) * 0.55), n1 = this.world.nav.nearest(mx + Math.sin(ang) * 0.55, mz + Math.cos(ang) * 0.55);
      if (!n0 || !n1) { a.partner = b.partner = null; a.t = 1; return; } const both = () => { if (a.path || b.path || a.partner !== b) return; a.state = b.state = 'chat'; const script = lines('chat'), ci = Math.floor(Math.random() * script.length); a.chat = b.chat = { lines: script[ci], ci, i: 0, next: 0.6, lead: a }; };
      a.goTo(n0[0], n0[1], both); b.goTo(n1[0], n1[1], both); return; }
    if (next === 'snack') { const where = Math.random() < 0.75 ? 'snacks' : 'bar', s = this.world.spots[where], k = this.queue.filter((g) => g.waitFor === where).length; const qx = where === 'snacks' ? s.x - 0.1 - k * 0.0 : s.x + 0.1, qz = where === 'snacks' ? s.z + (k ? (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 1.6 : 0) : s.z + (k ? (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 1.05 : 0);
      if (a.goTo(qx, qz, (n) => { n.waitFor = where; n.t = 0; this.queue.push(n); })) return; a.t = 1; return; }
    if (next === 'leave') { const s = STREET_SPAWN[Math.floor(Math.random() * STREET_SPAWN.length)]; if (!a.goTo(s[0], s[1], (n) => n.dispose())) a.dispose(); return; }
  }
  _chatTick(a, dt, now, player) {
    const b = a.partner; if (!b || !b.alive || b.state !== 'chat') { a.state = 'idle'; a.partner = null; a.chat = null; a.t = rnd(1, 3); return; }
    a.turnTo(b.x, b.z, 4, dt); const ch = a.chat; if (ch.lead !== a) return; ch.next -= dt;
    if (ch.next <= 0) { if (ch.i >= ch.lines.length) { a.state = b.state = 'idle'; a.partner = b.partner = null; a.chat = b.chat = null; a.t = rnd(2, 5); b.t = rnd(3, 6); if (Math.random() < 0.5) { a.gesture('laugh', 1.6, 'laugh'); b.gesture('laugh', 1.6, 'laugh'); } return; }
      const sp = ch.i % 2 === 0 ? a : b, j = ch.i++, line = ch.lines[j]; ch.next = 2.2 + line.length * 0.045; if (Math.hypot(player.x - a.x, player.z - a.z) < 9) sp.say({ text: line, key: 'chat', i: ch.ci, j }, ch.next - 0.3); sp.gesture('talk', ch.next - 0.4, ch.i === ch.lines.length ? 'smirk' : 'talk'); }
  }
  freeSpot(a) { const f = this.world.sitSpots.filter((s) => !s.taken); if (!f.length) return null; f.sort((p, q) => Math.hypot(p.x - a.x, p.z - a.z) + Math.random() * 8 - (Math.hypot(q.x - a.x, q.z - a.z) + Math.random() * 8)); return f[0]; }
  // ---------------------------------------------------------- audience per hall
  audienceTick(h, dt, now, player, vis, room) {
    const list = this.viewers[h.id]; if (!list.length) { this._inst(h, null); return; }
    const inHall = room === h.key, near = vis.has(h.key), budget = this.preset.people;
    // arrivals and leaving
    for (const v of list) {
      if (v.state === 'planned' && now >= v.arriveAt) { v.state = 'enroute'; v.seatedAt = now + 30000; }
      if (v.state === 'enroute' && !v.agent) { if (near && now < v.seatedAt) this._walkIn(v, true); else if (vis.has('lobby') && Math.random() < 0.02 && this.agents.length < 30) this._walkIn(v, false); else if (now >= v.seatedAt) v.state = 'seated'; }
      if (v.state === 'enroute' && v.agent && !v.agent.group.visible) { v.agent.invisibleT += dt; if (v.agent.invisibleT > 2.5) { this._release(v); v.seatedAt = now + 9000; } } else if (v.agent) v.agent.invisibleT = 0;
      if (v.pending && now >= v.pending.at) { const p = v.pending; v.pending = null; v.act = p.kind; v.until = now + p.dur * 1000; if (v.agent && v.state === 'seated') v.agent.react(p.kind, p.dur); }
      if (v.act && now > v.until) v.act = 0; v.amt += ((v.act ? 1 : 0) - v.amt) * Math.min(1, dt * 6);
      if (!v.act && v.state === 'seated' && v.pers.popcorn && Math.random() < dt * 0.04) { v.act = 'eat'; v.until = now + 2500; if (v.agent) v.agent.react('eat', 2.5); }
      if (v.shushAt && now > v.shushAt) { v.shushAt = 0; if (v.agent) { v.agent.gesture('shush', 1.8, 'shush'); v.agent.say(pick('aud.shush'), 1.8); } }
      if (v.leaveAt && now > v.leaveAt && v.state === 'seated') { v.leaveAt = 0; if (!inHall) { this.dropViewer(v); continue; } if (!v.agent && this.agents.filter((x) => x.role === 'viewer').length < budget + 6) this._toAgent(v, player); if (v.agent) { v.state = 'leaving'; this._leave(v); } else v.leaveAt = now + 1500; }
    }
    for (let i = list.length - 1; i >= 0; i--) if (list[i].state === 'gone') list.splice(i, 1);
    // before the lights go down, people near you chat about the film
    if (inHall && now > (h._preT || 0)) { h._preT = now + 12000 + Math.random() * 14000; const v = this.hooks.nearViewer && this.hooks.nearViewer(list.filter((q) => q.talky && q.agent && q.state === 'seated')); if (v) v.agent.say(pick('aud.pre'), 2.4); }
    // who is drawn as a full character: the nearest seated viewers while you are in the hall
    if (near && (!h._repT || now > h._repT)) { h._repT = now + 400; const seated = list.filter((v) => v.state === 'seated'); const far = (this.preset.peopleFar || 12) ** 2;
      seated.sort((p, q) => ((p.seat.x - player.x) ** 2 + (p.seat.z - player.z) ** 2) - ((q.seat.x - player.x) ** 2 + (q.seat.z - player.z) ** 2));
      const walking = this.agents.filter((x) => x.role === 'viewer' && x.state !== 'seated').length; let n = Math.max(0, budget - walking);
      for (const v of seated) { const d2 = (v.seat.x - player.x) ** 2 + (v.seat.z - player.z) ** 2, want = inHall && n > 0 && d2 < far; if (want) { n--; if (!v.agent) this._toAgent(v, player); } else if (v.agent && v.agent.state === 'seated') this._release(v); } }
    if (!near) for (const v of list) if (v.agent && v.state === 'seated') this._release(v);
    this._inst(h, near ? list : null);
  }
  _walkIn(v, fromDoor) {
    const h = v.hall, H = h.cfg, door = this._hallDoor(h); let x, z;
    if (fromDoor) { x = door.x; z = door.z; } else { const s = STREET_SPAWN[Math.floor(Math.random() * STREET_SPAWN.length)]; x = s[0]; z = s[1] - 1; }
    const a = this.spawn({ rec: v.rec, name: v.name, role: 'viewer', x, z, yaw: Math.PI, state: 'idle' }); a.viewer = v; v.agent = a; if (v.pers.popcorn) this.giveItem(a, 'popcorn');
    const ap = this.aislePoint(h, v.seat), toSeat = () => { const st = this.laneStand(v); a.sideTo = { x: st.x, z: st.z, faceWhile: v.seat.yaw + Math.PI, then: (n) => { n.sitDown(this.seatPose(v), () => { v.state = 'seated'; n.state = 'seated'; }); } }; };
    const go = () => { if (!a.goTo(ap.x, ap.z, toSeat)) { this._release(v); v.state = 'seated'; } };
    if (fromDoor) go(); else if (!a.goTo(door.x, door.z, go)) { this._release(v); v.seatedAt = this.now + 8000; }
  }
  // a point just outside a hall door (the gallery side, or the tunnel side of the IMAX trench); kind 'exit' for leaving after the film
  _hallDoor(h, kind = 'entrance') { const d = hallDoor(h.id, kind) || hallDoor(h.id); if (!d) return { x: h.cfg.cx, z: h.cfg.zBack - 1 }; return d.axis === 'z' ? { x: d.x, z: d.z + 0.9 } : { x: d.x + d.side * 0.9, z: d.z }; }
  _toAgent(v, player) { const sp = this.seatPose(v); const a = this.spawn({ rec: v.rec, name: v.name, role: 'viewer', x: sp.x, z: sp.z, yaw: sp.face, state: 'seated' }); a.viewer = v; v.agent = a; a.sitTo = sp; a.y = sp.y; a.ch.s.sit = 1; a.ch.s.drop = a.ch.seatDrop(sp.h); a.ch.s.recline = sp.recline; a.ch.snap = true; if (v.pers.popcorn) this.giveItem(a, 'popcorn'); a.holdGesture = v.pers.popcorn ? 'hold' : null; if (v.act) a.react(v.act, Math.max(0.5, (v.until - this.now) / 1000)); a.talkable = false; }
  _release(v) { const a = v.agent; if (!a) return; a.dispose(); const i = this.agents.indexOf(a); if (i >= 0) this.agents.splice(i, 1); v.agent = null; }
  _leave(v) {
    const a = v.agent, h = v.hall, door = this._hallDoor(h, 'exit'), ap = this.aislePoint(h, v.seat), st = this.laneStand(v);
    a.standUp(st, (n) => { if (v.seat.npc === v) { v.seat.npc = null; v.seat.taken = false; } n.sideTo = { x: ap.x, z: st.z, faceWhile: v.seat.yaw + Math.PI, then: (m) => { if (!m.goTo(door.x, door.z, (q) => { const s = STREET_SPAWN[Math.floor(Math.random() * STREET_SPAWN.length)]; if (!q.goTo(s[0], s[1], () => { this._release(v); v.state = 'gone'; })) { this._release(v); v.state = 'gone'; } })) { this._release(v); v.state = 'gone'; } } }; });
  }
  viewerBrain(a, dt, now, player, visible) {
    const v = a.viewer; if (!v) return;
    if (a.sideTo && player.seated && Math.hypot(a.x - player.x, a.z - player.z) < 0.9 && now - (a._ex || 0) > 6000) { a._ex = now; a.say(pick('aud.excuse'), 1.8); }
    if (v.state === 'leaving' && !visible && roomAt(a.x, a.z) !== v.hall.key) { a.invisibleT += dt; if (a.invisibleT > 1.5) { this._release(v); v.state = 'gone'; } }
    if (a.state === 'seated') { if (!a.gUntil && a.holdGesture && a.ch.gestT !== a.holdGesture) a.ch.gestT = a.holdGesture; }
  }
  // ---------------------------------------------------------- instanced far audience (one mesh per body archetype)
  _inst(h, list) {
    if (!this.v8) return this._instV5(h, list);
    let R = this.inst[h.id]; if (!list) { if (R) R.hide(); return; }
    if (!R) R = this.inst[h.id] = new CrowdRenderer(h.room.group, h.room.U);
    R.begin(); const lit = h.seatLit, cam = this.engine.camera.position, t = this.now / 1000, near2 = (9 * (this.engine.lodK || 1)) ** 2;
    for (const v of list) { if (v.state !== 'seated' || (v.agent && v.agent.state === 'seated')) continue;
      const sp = this.seatPose(v), s = v.seat, i7 = s.i * 7, d2 = (s.x - cam.x) ** 2 + (s.z - cam.z) ** 2;
      if (v.act && v.act !== v._act) { v._act = v.act; v._actT = t; } else if (!v.act && v._act && v.amt < 0.02) v._act = null;
      const react = v._act ? REACT_CLIP[v._act] : null;
      R.add({ rec: v.rec, x: sp.x, y: sp.y + sp.h - SIT_H, z: sp.z, yaw: sp.face, lit: [lit[i7] * 0.9, lit[i7 + 1] * 0.9, lit[i7 + 2] * 0.9, lit[i7 + 6]], clip: v.talky ? 'Sitting_Talking_Loop' : 'Sitting_Idle_Loop', t0: -v.phase, speed: 1, clipB: react, t0B: v._actT, blend: react ? v.amt : 0 }, d2 < near2 ? 1 : 2); }
    R.end();
  }
  _instV5(h, list) {
    let I = this.inst[h.id];
    if (!list) { if (I) for (const m of I.meshes) m.count = 0; return; }
    if (!I) { const H = h.cfg, seatH = H.kind === 'curved' ? 0.52 : 0.46, rec = H.kind === 'curved' ? 0.3 : 0.2, cap = h.seats.length;
      const mat = this.mats.crowdMat(h.room.U), arche = [11, 22, 33, 44].map((s) => { const r = randomRecipe(s); r.glasses = false; r.hat = null; return crowdGeometry(r, seatH, rec); });
      I = this.inst[h.id] = { meshes: arche.map((g) => { const m = new THREE.InstancedMesh(g, mat, cap); m.count = 0; m.frustumCulled = false; for (const [n, k] of [['iTop', 3], ['iBot', 3], ['iHair', 3], ['iSkin', 3], ['iAct', 4], ['iLit', 4]]) g.setAttribute(n, new THREE.InstancedBufferAttribute(new Float32Array(cap * k), k)); h.room.group.add(m); return m; }), obj: new THREE.Object3D() }; }
    const cnt = [0, 0, 0, 0], o = I.obj, lit = h.seatLit;
    for (const v of list) { if (v.state !== 'seated' || (v.agent && v.agent.state === 'seated')) continue; const m = I.meshes[v.arch], k = cnt[v.arch]++, s = v.seat, g = m.geometry.attributes, p = v.rec.pal;
      o.position.set(s.x, s.y, s.z); o.rotation.set(0, s.yaw + Math.PI, 0); o.updateMatrix(); m.setMatrixAt(k, o.matrix);
      _c.set(p.top); g.iTop.setXYZ(k, _c.r, _c.g, _c.b); _c.set(p.bottom); g.iBot.setXYZ(k, _c.r, _c.g, _c.b); _c.set(p.hair); g.iHair.setXYZ(k, _c.r, _c.g, _c.b); _c.set(p.skin); g.iSkin.setXYZ(k, _c.r, _c.g, _c.b);
      g.iAct.setXYZW(k, v.act ? (CROWD_ACT[v.act] ?? 0) : 0, v.amt, v.phase, v.phase * 0.37); const i7 = s.i * 7; g.iLit.setXYZW(k, lit[i7] * 0.9, lit[i7 + 1] * 0.9, lit[i7 + 2] * 0.9, lit[i7 + 6]); }
    I.meshes.forEach((m, i) => { m.count = cnt[i]; m.instanceMatrix.needsUpdate = true; for (const n of ['iTop', 'iBot', 'iHair', 'iSkin', 'iAct', 'iLit']) m.geometry.attributes[n].needsUpdate = true; });
  }
  get all() { return this.agents; }
}
