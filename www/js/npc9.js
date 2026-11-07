// LUMIERE v9 - the people of the cinema: staff at their posts, guests in the lobby, the audience of your show, the usher who walks you
// in, the server who answers your seat bell. v8 phone feedback this answers: eyes that spun (people.js Rig.reset), white flashes on faces
// (screen light is smoothed and capped), people sitting into each other or overlapping (one person per seat, walkers keep their distance
// and wait), everyone spawning at once (arrivals are staggered over the countdown and walk in through the door), the same outfits (every
// person has their own seed), the audience staring at you instead of the film (they watch the screen), voices from far away (people only
// speak when you are near), the slow guide (he walks faster than you and waits only when you fall behind).
// Paths: building.js NAV (lobby, escalators, corridor, spine) and hallmath.seatRoute (door, rear aisle, side aisle, row lane, seat).
import * as THREE from 'three';
import { Person, CrowdRenderer, DATA, randomRecipe, staffRecipe, sitHeight } from './people.js';
import { POSTS, NAV, HALL, L1, ESC, SPINE } from './building.js';
import { seatRoute, SEAT, SCREEN_GAP } from './hallmath.js';
import { pick } from './i18n.js';
const TAU = Math.PI * 2, clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), adiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b)), rnd = (a, b) => a + Math.random() * (b - a);
const HIDDEN = { visible: false }, SEAT_H = { rocker: 0.44, recliner: 0.5, sofa: 0.5, pod: 0.5 }, RECLINE = { rocker: 0.18, recliner: 0.32, sofa: 0.2, pod: 0.26 };
const DENSITY = { off: 0, low: 10, medium: 20, high: 30 };   // v9.3 (the user: "everything feels so empty"): a busy evening lobby
// ------------------------------------------------------------------ the nav graph: one-way edges only one way; Dijkstra on distance
const NODES = NAV.nodes, ADJ = {};
for (const [a, b] of NAV.edges) { const ab = !NAV.oneWay.some(([p, q]) => p === b && q === a), ba = !NAV.oneWay.some(([p, q]) => p === a && q === b); if (ab) (ADJ[a] || (ADJ[a] = [])).push(b); if (ba) (ADJ[b] || (ADJ[b] = [])).push(a); }
const ND = (a, b) => Math.hypot(NODES[a][0] - NODES[b][0], (NODES[a][1] - NODES[b][1]) * 3, NODES[a][2] - NODES[b][2]);
export function navPath(from, to) {
  const dist = { [from]: 0 }, prev = {}, open = new Set([from]);
  while (open.size) { let u = null; for (const k of open) if (u === null || dist[k] < dist[u]) u = k; open.delete(u); if (u === to) break;
    for (const v of ADJ[u] || []) { const d = dist[u] + ND(u, v); if (dist[v] === undefined || d < dist[v]) { dist[v] = d; prev[v] = u; open.add(v); } } }
  if (dist[to] === undefined) return null; const out = [to]; while (out[0] !== from) out.unshift(prev[out[0]]); return out;
}
const ESC_EDGES = new Set(['escBot>escTop', 'downTop>downBot']);
// ------------------------------------------------------------------ one person
class Agent {
  constructor(crowd, o) {
    Object.assign(this, { crowd, id: o.id, role: o.role || 'guest', name: o.name || '', voice: o.voice || null, rec: o.rec, x: o.x, y: o.y || 0, z: o.z, yaw: o.yaw || 0, home: o.home || null,
      path: null, pi: 0, speed: o.speed || rnd(1.15, 1.4), ride: false, sit: 0, sitT: 0, seat: null, hall: null, state: o.state || 'idle', look: { yaw: 0, pitch: 0, amt: 0 }, alive: true,
      gest: null, gestUntil: 0, talkUntil: 0, talkable: !!o.talkable, wait: 0, onArrive: null, items: {}, item: null, r: 0.26 });
    this.light = { amb: new THREE.Color(0.3, 0.3, 0.3), key: new THREE.Color(0.3, 0.3, 0.3), dir: new THREE.Vector3(0, 1, 0), screen: new THREE.Color(0, 0, 0) }; this.lightT = 0; this.ch = null; this.room = null;
  }
  get group() { return this.ch ? this.ch.group : HIDDEN; }
  ensure() { if (this.ch || !DATA.ready) return this.ch; this.ch = new Person(this.rec, { staff: this.role !== 'guest' && this.role !== 'aud', idle: this.idle || 'Idle_Loop' }); this.crowd.scene.add(this.ch.group); return this.ch; }
  release() { if (!this.ch) return; this.crowd.scene.remove(this.ch.group); this.ch.dispose(); this.ch = null; }
  go(points, onArrive, o = {}) { this.path = points.map((p) => (Array.isArray(p) ? { x: p[0], y: p[1], z: p[2], ride: p[3] } : p)); this.pi = 0; this.onArrive = onArrive || null; if (o.speed) this.speed = o.speed; this.state = o.state || this.state; }
  stop() { this.path = null; this.onArrive = null; }
  say(line, dur) { if (!line) return; this.crowd.hooks.bubble && this.crowd.hooks.bubble(this, line, dur || Math.max(2.2, (line.text || '').length * 0.06)); }
  gesture(g, dur = 1.6, expr) { this.gest = g; this.gestUntil = this.crowd.now + dur * 1000; if (this.ch && expr) this.ch.setExpr(expr); }
  dispose() { this.alive = false; this.release(); }
}
// ------------------------------------------------------------------ the crowd
export class Crowd {
  constructor(world, mats, engine, hooks = {}) {
    Object.assign(this, { world, mats, engine, hooks, scene: engine.scene, agents: [], staff: {}, guests: [], viewers: {}, now: 0, nid: 1, density: 'medium', seedBase: Math.floor(Math.random() * 1e6) });
    for (const h of world.halls) { this.viewers[h.id] = []; h.crowdGPU = new CrowdRenderer(h.room.group, h.room.U, 2); }
    this._p = new THREE.Vector3(); this._tmp = [];
  }
  seed() { return this.seedBase + (this.nid++) * 7919; }
  spawn(o) { const a = new Agent(this, { id: o.id || 'n' + this.nid, ...o }); this.agents.push(a); return a; }
  remove(a) { a.dispose(); const i = this.agents.indexOf(a); if (i >= 0) this.agents.splice(i, 1); }
  // ---------------------------------------------------------- staff and guests
  init() {
    const P = POSTS, mk = (id, look, name, role, voice, post, at) => { const p = at || P[post]; const a = this.spawn({ id, rec: staffRecipe(look, id.length * 131 + 17), name, role, voice, x: p.x, y: p.y || 0, z: p.z, yaw: p.yaw + Math.PI, home: { ...p, yaw: p.yaw + Math.PI }, state: 'post', talkable: true }); this.staff[id] = a; return a; };
    // behind the counters (the posts in building.js are the customers' side), facing the lobby
    mk('host', 'greeter', 'Clara', 'host', 'host', 'greeter');
    mk('box1', 'receptionist', 'Éloïse', 'box', 'box', null, { x: -18.1, y: 0, z: 9.0, yaw: -Math.PI / 2 }); mk('box2', 'vendor', 'Priya', 'box', 'box', null, { x: -18.1, y: 0, z: 6.2, yaw: -Math.PI / 2 });
    mk('bar1', 'vendor', 'Mia', 'bar', 'barF', null, { x: -19.0, y: 0, z: -6.0, yaw: -Math.PI / 2 }); mk('bar2', 'vendor2', 'Gaston', 'bar', 'barM', null, { x: -19.0, y: 0, z: -2.4, yaw: -Math.PI / 2 });
    mk('usher', 'usher', 'Marcel', 'usher', 'usher', 'usher'); mk('server', 'server', 'Rahul', 'server', 'server', 'server');
    this.staff.server.cart = true; this.cart = makeCart(this.mats, this.scene);
    this.setDensity(this.density);
  }
  // NPC density applies at once (v8: "the NPC setting doesn't change anything until restart"): guests join or leave the lobby now
  setDensity(d) {
    d = { few: 'low', normal: 'medium', many: 'high' }[d] || d; this.density = d in DENSITY ? d : 'medium'; const want = DENSITY[this.density];
    while (this.guests.length > want) { const g = this.guests.pop(); this.remove(g); }
    while (this.guests.length < want) this.guests.push(this.newGuest(this.guests.length));
  }
  newGuest(i) {
    const spots = LOBBY_SPOTS, s = spots[(i + Math.floor(this.seedBase)) % spots.length], rec = randomRecipe(this.seed()), voice = rec.kind === 'f' ? (i % 2 ? 'guestF2' : 'guestF') : (i % 2 ? 'guestM2' : 'guestM');
    const a = this.spawn({ rec, role: 'guest', voice, x: s[0] + rnd(-0.4, 0.4), y: 0, z: s[1] + rnd(-0.4, 0.4), yaw: rnd(0, TAU), state: 'mill', talkable: true }); a.spot = s; a.next = this.now + rnd(4000, 14000); a.idle = IDLES[i % IDLES.length]; return a;
  }
  // ---------------------------------------------------------- light on a person: the room's lights, dimmed with the house lights,
  // plus the screen's light (capped and eased: v8 faces flashed white in bright scenes)
  lightAt(x, y, z, out) {
    const k = this.world.roomAt(x, y - 1.2, z), r = this.world.rooms[k]; if (!r) return out; const p = r.lights.probe(x, y, z), hU = r.U.uHouse.value, fU = r.U.uFix.value;
    const ar = p.ah[0] * hU + p.af[0] * fU, ag = p.ah[1] * hU + p.af[1] * fU, ab = p.ah[2] * hU + p.af[2] * fU;
    // capped: next to a wall light the analytic falloff climbs fast (faces flashed orange-white in v8 and in the first v9 renders)
    const m = Math.max(ar, ag, ab, 1e-4), cap = Math.min(1, 0.75 / m); out.amb.setRGB(ar * cap * 0.85, ag * cap * 0.85, ab * cap * 0.85); out.key.setRGB(ar * cap, ag * cap, ab * cap).multiplyScalar(0.45 + 0.4 * p.s); out.dir.set(p.keyDir[0], p.keyDir[1], p.keyDir[2]);
    const sc = r.U.uScreen.value, ls = Math.min(p.ls || 0, 0.6); out.screen.setRGB(Math.min(sc.r * ls, 0.5), Math.min(sc.g * ls, 0.5), Math.min(sc.b * ls, 0.5)); return out;
  }
  // ---------------------------------------------------------- the audience of a show
  planAudience(hallId, n, windowMs, exclude = new Set()) {
    const h = this.world.hallById(hallId); if (!h) return; this.clearAudience(hallId);
    // strangers leave a seat between you and them (and nobody looms right beside your head)
    const mine = h.seats.find((s) => exclude.has(s.id) || s.player), near = mine ? new Set(h.seats.filter((s) => s.row === mine.row && Math.abs(s.col - mine.col) === 1).map((s) => s.id)) : new Set();
    const free = h.seats.filter((s) => !s.taken && !exclude.has(s.id) && !s.player && !near.has(s.id));
    // fill like people do: the middle rows and the middle of each row first, couples together, a few singles
    free.sort((a, b) => (Math.abs(a.row - h.cfg.rows.length * 0.55) + Math.abs(a.a) * 0.35 + Math.random() * 3.5) - (Math.abs(b.row - h.cfg.rows.length * 0.55) + Math.abs(b.a) * 0.35 + Math.random() * 3.5));
    const list = this.viewers[hallId] = [], chosen = free.slice(0, n), t0 = this.now + 1500;
    chosen.sort(() => Math.random() - 0.5).forEach((s, i) => { const rec = randomRecipe(this.seed()); s.taken = true;
      const v = { seat: s, hall: h, rec, state: 'due', at: t0 + (i / Math.max(1, chosen.length)) * windowMs * 0.85 + rnd(0, 1200), agent: null, clip: 'Sitting_Idle_Loop', t0: Math.random() * 10, clipB: null, t0B: 0, blend: 0, reactUntil: 0, voice: rec.kind === 'f' ? (i % 2 ? 'guestF2' : 'guestF') : (i % 2 ? 'guestM2' : 'guestM') };
      s.npc = v; list.push(v); });
    list.sort((a, b) => a.at - b.at);
    // a show that starts soon: most of the audience is already in their seats; only a few still come in, one at a time
    if (windowMs < 40000) list.forEach((v, i) => { if (i % 5 !== 0) { v.state = 'seated'; v.at = 0; } else v.at = t0 + (i / list.length) * Math.max(windowMs, 20000); });
  }
  clearAudience(hallId) { for (const v of this.viewers[hallId] || []) this.dropViewer(v); this.viewers[hallId] = []; }
  dropViewer(v) { if (v.agent) { this.remove(v.agent); v.agent = null; } if (v.seat.npc === v) { v.seat.npc = null; v.seat.taken = false; } v.state = 'gone'; }
  seatPose(s, rec) { return { x: s.x, y: s.y, z: s.z, face: s.yaw + Math.PI, drop: SEAT_H[s.kind] - sitHeight(rec), recline: RECLINE[s.kind] }; }
  laneStand(seat) { const h = HALL[seat.hall], row = h.rows[seat.row], q = h.fromRow(seat.a, (row.lane[0] + row.lane[1]) / 2), w = h.toWorld(q.u, q.d); return { x: w.x, z: w.z }; }
  // a route through the hall: from outside its entry door to the lane in front of a seat (world points with floor heights)
  hallRoute(h, seat, fromOutside = true) {
    const H = h.cfg, pts = [], fy = (x, z, y) => this.world.floorY(x, z, y), door = this.world.doors.find((d) => d.id === H.id + 'In');
    if (fromOutside && door) { const out = door.x - H.dir * 1.2, inn = door.x + H.dir * 1.0; pts.push({ x: out, y: L1, z: door.z }, { x: inn, y: L1, z: door.z }); }
    let y = L1; for (const p of seatRoute(H, seat)) { const w = H.toWorld(p.u, p.d); y = fy(w.x, w.z, y); pts.push({ x: w.x, y, z: w.z }); }
    return pts;
  }
  exitRoute(h, seat) {
    const H = h.cfg, row = H.rows[seat.row], laneE = (row.lane[0] + row.lane[1]) / 2, sideA = (seat.a >= 0 ? 1 : -1) * (H.aisle[0] + H.aisle[1]) / 2, ex = H.exits[seat.a >= 0 ? 1 : 0], pts = [];
    let y = seat.y; const add = (a, e) => { const q = H.fromRow(a, e), w = H.toWorld(q.u, q.d); y = this.world.floorY(w.x, w.z, y); pts.push({ x: w.x, y, z: w.z }); };
    add(seat.a, laneE); add(sideA, laneE); add(sideA, 0.6); const d = H.toWorld(ex.u, 0.3); pts.push({ x: d.x, y: H.y0, z: d.z }); const o = H.toWorld(ex.u, ex.d - 1.2); pts.push({ x: o.x, y: H.y0, z: o.z });
    return pts;
  }
  onShowPhase(hallId, phase) {
    const list = this.viewers[hallId] || [];
    if (phase === 'ended') list.forEach((v, i) => { if (v.state === 'seated' || v.state === 'walking') { v.leaveAt = this.now + 2500 + i * rnd(350, 700); } });
    if (phase === 'dimming') for (const v of list) if (v.state === 'due') v.at = Math.min(v.at, this.now);   // late arrivals hurry in
  }
  // the show's events -> who reacts, how, when; plus one crowd sound for the hall
  onFilmEvent(hallId, ev) {
    const list = (this.viewers[hallId] || []).filter((v) => v.state === 'seated'); if (!list.length) return;
    const MAP = { laugh: ['laugh', 0.55], gasp: ['gasp', 0.5], scare: ['scream', 0.35], tension: ['lean', 0.35], climax: ['cheer', 0.3], aww: ['aww', 0.4], end: ['clap', 0.85], wow: ['gasp', 0.45] }, m = MAP[ev.type]; if (!m) return;
    let n = 0; const k = ev.k ?? 1;
    for (const v of list) { if (Math.random() > m[1] * (0.6 + 0.4 * k)) continue; n++; const d = rnd(0, ev.type === 'end' ? 1.4 : 0.45), len = ev.type === 'end' ? rnd(4, 7) : rnd(1.4, 2.6);
      setTimeout(() => { v.clipB = m[0]; v.t0B = this.now / 1000; v.reactUntil = this.now + len * 1000; if (v.agent) v.agent.gesture(m[0], len, m[0] === 'laugh' ? 'laugh' : m[0] === 'scream' ? 'scream' : null); }, d * 1000); }
    const h = this.world.hallById(hallId), c = h.cfg.toWorld(0, h.cfg.depthIn * 0.5);
    if (n && this.hooks.crowdSound) this.hooks.crowdSound(hallId, ev.type === 'end' ? 'applause' : ev.type === 'scare' ? 'scream' : ev.type === 'laugh' ? 'laugh' : ev.type === 'aww' ? 'aww' : 'gasp', n, k, c.x, c.z);
    if (ev.type === 'end') for (const v of list) if (Math.random() < 0.08) { const s = v.seat; setTimeout(() => this.hooks.bubble && v.agent && v.agent.say(pick('aud.end')), rnd(2000, 6000)); }
  }
  // ---------------------------------------------------------- the usher walks you to your seat (first visit) or points the way
  guide(usher, h, seat, player) {
    const from = this.world.roomAt(usher.x, usher.y, usher.z); if (from !== 'lobby') return false;
    const nav = navPath('gate', 'portal'), H = h.cfg, side = H.side < 0 ? (H.id === 'CURVE' ? ['bridgeW', 'flankW1', 'flankW2', 'linkW'] : ['bridgeW', 'flankW1']) : (H.id === 'X270' ? ['bridgeE', 'flankE1', 'flankE2'] : ['bridgeE', 'flankE1']);
    const pts = [...nav.map((n) => ({ x: NODES[n][0], y: NODES[n][1], z: NODES[n][2], ride: false })), ...['bridgeC', ...side].map((n) => ({ x: NODES[n][0], y: NODES[n][1], z: NODES[n][2] }))];
    for (let i = 0; i < pts.length - 1; i++) { const a = nav[i], b = nav[i + 1]; if (a && b && ESC_EDGES.has(a + '>' + b)) pts[i + 1].ride = true; }
    const route = this.hallRoute(h, seat, true); route.pop();   // stop at the row end: the lane in front of your seat is yours to walk
    usher.go([...pts, ...route], () => { usher.state = 'atSeat'; usher.say(pick('ush.seat')); usher.gesture('point', 2.2); this.hooks.guideDone && this.hooks.guideDone(); setTimeout(() => this.sendHome(usher), 6000); }, { speed: 1.75, state: 'guiding' });
    usher.follow = player; return true;
  }
  sendHome(a) { if (!a.home) return; const back = [], r = this.world.roomAt(a.x, a.y, a.z);
    if (r && r.startsWith('hall')) { const d = this.world.doors.find((q) => q.hall === HALL_ID[r] && q.id.includes('Out0')); if (d) { const H = HALL[HALL_ID[r]]; back.push({ x: d.x + H.dir * 1.0, y: H.y0, z: d.z }, { x: d.x - H.dir * 1.0, y: H.y0, z: d.z }); } }
    if (r === 'corridor' || (r && r.startsWith('hall'))) for (const n of navPath('spineS', 'lobbyBack')) back.push({ x: NODES[n][0], y: NODES[n][1], z: NODES[n][2] });
    back.push({ x: a.home.x, y: a.home.y || 0, z: a.home.z }); a.follow = null; a.go(back, () => { a.state = 'post'; a.yaw = a.home.yaw; }, { speed: 1.5, state: 'returning' }); }
  // ---------------------------------------------------------- the seat bell: the server comes with his cart and the tablet
  // v10 (the user: "only one server, and if anyone else calls it he is the next in queue"): one server for every seat; a call while he
  // is out joins the queue and he takes the next one as soon as he is back at his post. Returns true (coming), 'queued' or false
  callServer(seat, onArrive) {
    const s = this.staff.server; if (!s) return false; this.srvQ = this.srvQ || []; const arrive = () => { s.state = 'serving'; s.job = seat; onArrive && onArrive(s); };
    if (s.job && s.job !== seat && s.state !== 'post') { if (!this.srvQ.some((j) => j.seat === seat)) this.srvQ.push({ seat, onArrive }); return 'queued'; }
    // rung while he walks away: he turns back along the way he came (v8: he ignored the bell once he had left)
    if (s.state === 'leaving' && s.cameBy) { s.say(pick('srv.recall')); const i = nearestOn(s.cameBy, s); s.go(s.cameBy.slice(i), arrive, { state: 'coming' }); return true; }
    if (s.state !== 'post') return s.state === 'serving' || s.state === 'coming';
    const h = this.world.hallById(seat.hall); if (!h) return false;
    const pts = navPath('pantry', 'bridgeC').map((n) => ({ x: NODES[n][0], y: NODES[n][1], z: NODES[n][2] })), H = h.cfg, side = H.side < 0 ? ['bridgeW', 'flankW1'] : ['bridgeE', 'flankE1'];
    if (H.id === 'CURVE') side.push('flankW2', 'linkW'); if (H.id === 'X270') side.push('flankE2');
    for (const n of side) pts.push({ x: NODES[n][0], y: NODES[n][1], z: NODES[n][2] });
    const route = this.hallRoute(h, seat, true); s.cameBy = [...pts, ...route]; s.job = seat; s.go(s.cameBy, arrive, { speed: 1.6, state: 'coming' }); return true;
  }
  // he goes back the way he came, from wherever he is on it
  serverLeave() { const s = this.staff.server; if (!s || s.state === 'post') return; if (!s.cameBy) { s.state = 'leaving'; this.sendHome(s); return; }
    const i = nearestOn(s.cameBy, s), back = s.cameBy.slice(0, i + 1).reverse(); s.go(back, () => { s.state = 'post'; s.yaw = s.home.yaw; s.cameBy = null; s.job = null; this._nextJob(); }, { state: 'leaving' }); }
  _nextJob() { const s = this.staff.server; if (!s || s.state !== 'post' || !this.srvQ || !this.srvQ.length) return; const j = this.srvQ.shift(); this.callServer(j.seat, j.onArrive); }
  // ---------------------------------------------------------- talking
  talkTarget(px, py, pz, fx, fz) {
    let best = null, bs = 0;
    for (const a of this.agents) { if (!a.talkable || !a.alive || a.state === 'guiding' || Math.abs(a.y - py) > 1.2) continue; const dx = a.x - px, dz = a.z - pz, d = Math.hypot(dx, dz); if (d > 3.2 || d < 0.2) continue;
      const c = (dx * fx + dz * fz) / d; if (c < 0.55) continue; const sc = c / (0.5 + d); if (sc > bs) { bs = sc; best = a; } }
    return best;
  }
  startTalk(a) { a.talking = true; a.stop && a.state !== 'guiding' && a.path && a.role === 'guest' && a.stop(); }
  endTalk(a) { if (a) a.talking = false; }
  bodiesNear(x, z, r) { const out = this._tmp; out.length = 0; for (const a of this.agents) if (a.alive && a.ch && a.sit < 0.5) { const d = Math.hypot(a.x - x, a.z - z); if (d < r) out.push({ x: a.x, z: a.z, r: a.r, a }); } return out; }
  bumped(a) { if (a.role === 'guest' && this.now - (a._bump || 0) > 6000) { a._bump = this.now; a.say(pick('guest.bump')); a.gesture('gasp', 0.8); } }
  // ---------------------------------------------------------- the frame
  update(dt, now, player, vis) {
    if (this.srvQ && this.srvQ.length) this._nextJob();   // the server's queue: the next call as soon as he is back at his post
    this.now = now; const cam = this.engine.camera.position, P = this.engine.preset, near = [];
    // audience: arrivals, seated, leaving
    for (const h of this.world.halls) { const list = this.viewers[h.id], inHall = vis.has(h.key);
      for (const v of list) {
        if (v.state === 'due' && now >= v.at) {
          const busy = list.some((o) => o.state === 'walking' && o.agent && Math.hypot(o.agent.x - h.cfg.toWorld(h.cfg.entryU, h.cfg.depthIn).x, o.agent.z - h.cfg.toWorld(h.cfg.entryU, h.cfg.depthIn).z) < 2.2);
          if (busy) { v.at = now + 900; continue; }
          if (inHall || vis.has('corridor')) { const route = this.hallRoute(h, v.seat, true), a = this.spawn({ rec: v.rec, role: 'aud', voice: v.voice, x: route[0].x, y: route[0].y, z: route[0].z, speed: rnd(1.1, 1.35) }); v.agent = a; a.viewer = v; v.state = 'walking';
            a.go([...route, { x: v.seat.x, y: v.seat.y, z: v.seat.z, seat: true }], () => { v.state = 'sitting'; a.sitT = 0; a.yaw = v.seat.yaw + Math.PI; }); }
          else v.state = 'seated';   // they came in while you were elsewhere
        }
        if (v.leaveAt && now >= v.leaveAt && (v.state === 'seated' || v.state === 'sitting')) { v.leaveAt = 0; v.state = 'leaving';
          if (inHall) { let a = v.agent; if (!a) { a = v.agent = this.spawn({ rec: v.rec, role: 'aud', voice: v.voice, x: v.seat.x, y: v.seat.y, z: v.seat.z, yaw: v.seat.yaw + Math.PI }); a.viewer = v; a.sit = 1; }
            a.state = 'standing'; a.sitT = 0; a.exitPath = this.exitRoute(h, v.seat); }
          else this.dropViewer(v); }
      }
    }
    // people: move, sit, look, animate, draw
    for (const a of [...this.agents]) {
      if (!a.alive) continue; this.step(a, dt, player);
      a.room = this.world.roomAt(a.x, a.y, a.z) || a.room; const vis_ = !!a.room && vis.has(a.room), d = Math.hypot(a.x - cam.x, a.z - cam.z);
      if (vis_ && d < 38) near.push([a, d]); else if (a.ch) a.ch.group.visible = false;
    }
    // the nearest few seated viewers are full people; everyone else seated is the GPU crowd
    near.sort((p, q) => p[1] - q[1]); let skinned = 0; const cap = P.people + 6;
    for (const [a, d] of near) { const seatedFar = a.viewer && a.viewer.state === 'seated' && (d > 7 || skinned >= P.people);
      if (seatedFar || skinned >= cap) { if (a.ch) a.ch.group.visible = false; if (a.viewer && a.viewer.state === 'seated' && a.ch && d > 9) { this.remove(a); a.viewer.agent = null; } continue; }
      const ch = a.ensure(); if (!ch) continue; skinned++; ch.group.visible = true; this.draw(a, dt, d, player); }
    for (const h of this.world.halls) this.drawGPU(h, vis.has(h.key), cam);
    // the server pushes his cart in front of him while he is out; at his post it stands beside the pantry counter
    const sv = this.staff.server, C = this.cart; if (sv && C) { const out = sv.state !== 'post', fx = Math.sin(sv.yaw), fz = Math.cos(sv.yaw), seen = !!sv.room && vis.has(sv.room);
      C.group.visible = seen; if (seen) { C.group.position.set(sv.x + (out ? fx * 0.75 : 1.0), sv.y, sv.z + (out ? fz * 0.75 : 0)); C.group.rotation.y = out ? sv.yaw : 0; C.t -= dt; if (C.t <= 0) { C.t = 0.4; this.lightAt(sv.x, sv.y + 1.0, sv.z, C.light); } } }
  }
  step(a, dt, player) {
    if (a.role === 'remote') { a.walkT = a.remoteWalk || 0; return; }   // v9.3: another player (mpui.js moves them from their phone's messages)
    const now = this.now;
    if (a.state === 'standing') { a.sitT += dt; a.sit = Math.max(0, 1 - a.sitT / 1.1); if (a.sit <= 0) { if (a.viewer && a.viewer.seat.npc === a.viewer) { a.viewer.seat.npc = null; a.viewer.seat.taken = false; } a.go(a.exitPath, () => { if (a.viewer) a.viewer.state = 'gone'; this.remove(a); }, { state: 'leavingHall' }); } return; }
    if (a.state === 'sitting') { a.sitT += dt; a.sit = Math.min(1, a.sitT / 1.2); const s = a.viewer.seat; a.x += (s.x - a.x) * Math.min(1, dt * 4); a.z += (s.z - a.z) * Math.min(1, dt * 4); a.y += (s.y - a.y) * Math.min(1, dt * 6);
      if (a.sit >= 1) { a.viewer.state = 'seated'; a.state = 'seated'; } return; }
    if (a.path) {
      // the guide waits for you when you fall more than 5 m behind and walks on when you're within 3 m
      if (a.follow && a.state === 'guiding') { const d = Math.hypot(a.follow.x - a.x, a.follow.z - a.z), dy = Math.abs((a.follow.y || 0) - a.y); if (d > 5.5 || dy > 2.5) { a.waitFor = true; } else if (d < 3.2) a.waitFor = false; if (a.waitFor) { a.walkT = 0; a.yaw += adiff(Math.atan2(a.follow.x - a.x, a.follow.z - a.z), a.yaw) * Math.min(1, dt * 3); return; } }
      const t = a.path[a.pi], dx = t.x - a.x, dz = t.z - a.z, d = Math.hypot(dx, dz);
      // keep your distance: wait while someone walks right in front of you
      let blocked = false; if (a.role !== 'usher' && a.role !== 'server') for (const o of this.agents) { if (o === a || !o.alive || !o.path || o.sit > 0.2) continue; const ox = o.x - a.x, oz = o.z - a.z, od = Math.hypot(ox, oz); if (od < 0.75 && od > 1e-3 && (ox * dx + oz * dz) / (od * (d || 1)) > 0.6 && Math.abs(o.y - a.y) < 0.8) { blocked = true; break; } }
      const ride = !!t.ride, sp = ride ? (a.state === 'guiding' ? 1.15 : 0.62) : blocked ? 0 : a.speed;   // the guide walks up the moving steps a.walkT = ride || blocked ? 0 : sp;
      if (d < 0.08 || (d < sp * dt + 0.02)) { a.x = t.x; a.z = t.z; a.y = t.y ?? a.y; a.pi++; if (a.pi >= a.path.length) { const f = a.onArrive; a.path = null; a.onArrive = null; a.walkT = 0; f && f(); } }
      else { const k = sp * dt / d; a.x += dx * k; a.z += dz * k; const want = Math.atan2(dx, dz); a.yaw += adiff(want, a.yaw) * Math.min(1, dt * 8);
        const fy = ride ? null : this.world.floorY(a.x, a.z, a.y); if (ride) { const p0 = a.path[a.pi - 1] || t, u = 1 - d / (Math.hypot(t.x - p0.x, t.z - p0.z) || 1); a.y = p0.y + (t.y - p0.y) * clamp(u); } else a.y += (fy - a.y) * Math.min(1, dt * 12); }
      return;
    }
    a.walkT = 0;
    if (a.role === 'guest' && a.state === 'mill' && !a.talking && now > a.next) {   // lobby life: move to another spot now and then
      a.next = now + rnd(9000, 22000); const s = LOBBY_SPOTS[Math.floor(Math.random() * LOBBY_SPOTS.length)]; a.go([{ x: s[0] + rnd(-0.5, 0.5), y: 0, z: s[1] + rnd(-0.5, 0.5) }], () => { a.yaw = rnd(0, TAU); }); }
  }
  draw(a, dt, d, player) {
    const ch = a.ch; ch.group.position.set(a.x, a.y, a.z); ch.group.rotation.y = a.yaw; ch.walkT = a.walkT || 0; ch.setLOD(d < 9 ? 0 : d < 20 ? 1 : 2); ch.talking = a.talking || this.now < a.talkUntil;
    if (a.viewer) { ch.s.sit = a.sit; const sp = this.seatPose(a.viewer.seat, a.rec); ch.s.drop = sp.drop; ch.s.recline = sp.recline; } else ch.s.sit = 0;
    ch.gestT = this.now < a.gestUntil ? a.gest : a.item ? 'hold' : null;
    // where they look: the screen when seated in a hall; you, briefly, when you come close and they face you; ahead otherwise
    let ly = 0, lp = 0, amt = 0;
    if (a.viewer && a.sit > 0.5) { const H = a.viewer.hall.cfg, c = H.toWorld(0, 0), yawTo = Math.atan2(c.x - a.x, c.z - a.z); ly = adiff(yawTo, a.yaw); lp = -Math.atan2(H.y0 + H.centreY - (a.y + 1.1), Math.hypot(c.x - a.x, c.z - a.z)); amt = 0.85; }
    else if (player && d < 3.0 && (a.talkable || a.role === 'guest')) { const yawTo = Math.atan2(player.x - a.x, player.z - a.z), rel = adiff(yawTo, a.yaw); if (Math.abs(rel) < 1.6) { ly = rel; lp = -Math.atan2((player.y || 0) + 1.6 - (a.y + 1.6), d) * 0.6; amt = a.talking ? 1 : 0.7; } }
    const L = a.look; L.yaw += (ly - L.yaw) * Math.min(1, dt * 3.5); L.pitch += (lp - L.pitch) * Math.min(1, dt * 3.5); L.amt += (amt - L.amt) * Math.min(1, dt * 2.5); ch.s.lookYaw = L.yaw; ch.s.lookPitch = L.pitch; ch.s.lookAmt = L.amt;
    a.lightT -= dt; if (a.lightT <= 0) { a.lightT = 0.3; const want = this.lightAt(a.x, a.y + 1.2, a.z, { amb: new THREE.Color(), key: new THREE.Color(), dir: new THREE.Vector3(), screen: new THREE.Color() }); a.lightWant = want; }
    if (a.lightWant) { const k = Math.min(1, dt * 4), W = a.lightWant, Lt = a.light; Lt.amb.lerp(W.amb, k); Lt.key.lerp(W.key, k); Lt.dir.lerp(W.dir, k).normalize(); Lt.screen.lerp(W.screen, k); }
    ch.update(dt, a.light);
  }
  drawGPU(h, visible, cam) {
    const R = h.crowdGPU; if (!visible) { R.hide(); return; } R.begin(); const t = this.now / 1000, lit = h.seatLit, hU = h.room.U;
    for (const v of this.viewers[h.id]) { if (v.state !== 'seated' || (v.agent && v.agent.ch && v.agent.ch.group.visible)) continue; const s = v.seat, sp = this.seatPose(s, v.rec), i = s.i * 7;
      const blend = v.clipB && this.now < v.reactUntil ? Math.min(1, (t - v.t0B) / 0.3) * Math.min(1, (v.reactUntil - this.now) / 400) : 0;
      R.add({ rec: v.rec, x: s.x, y: s.y + sp.drop, z: s.z, yaw: sp.face, lit: [Math.min(lit[i] * 0.9, 0.7), Math.min(lit[i + 1] * 0.9, 0.7), Math.min(lit[i + 2] * 0.9, 0.7), Math.min(lit[i + 6], 0.6)], clip: v.clip, t0: v.t0, speed: 1, clipB: blend > 0 ? v.clipB : null, t0B: v.t0B, blend }, 2); }
    R.end();
  }
}
// a service trolley: walnut and brass, two shelves, popcorn tubs and cups on top (lit like the room it is in)
function makeCart(mats, scene) {
  const U = { uAmb: { value: new THREE.Color(0.4, 0.4, 0.4) }, uKey: { value: new THREE.Color(0.3, 0.3, 0.3) }, uKeyDir: { value: new THREE.Vector3(0.2, 1, 0.3).normalize() }, uScreenL: { value: new THREE.Color(0, 0, 0) } }, mat = mats.propMat(U), grp = new THREE.Group();
  const part = (geo, hex, x, y, z) => { const c = new THREE.Color(hex), n = geo.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } geo.setAttribute('color', new THREE.BufferAttribute(a, 3)); const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); grp.add(m); };
  for (const y of [0.32, 0.86]) part(new THREE.BoxGeometry(0.58, 0.04, 0.82), '#5b3a24', 0, y, 0);
  for (const [x, z] of [[-0.27, -0.39], [0.27, -0.39], [-0.27, 0.39], [0.27, 0.39]]) { part(new THREE.CylinderGeometry(0.015, 0.015, 0.84, 8), '#c9a35e', x, 0.5, z); part(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 12).rotateZ(Math.PI / 2), '#151515', x, 0.05, z); }
  part(new THREE.CylinderGeometry(0.015, 0.015, 0.6, 8).rotateZ(Math.PI / 2), '#c9a35e', 0, 0.98, -0.42);
  for (let i = 0; i < 3; i++) { part(new THREE.CylinderGeometry(0.075, 0.06, 0.18, 14), i % 2 ? '#c3121c' : '#f1ece4', -0.15 + i * 0.15, 0.97, 0.18); part(new THREE.CylinderGeometry(0.06, 0.055, 0.04, 14), '#f2d27a', -0.15 + i * 0.15, 1.07, 0.18); }
  for (let i = 0; i < 3; i++) part(new THREE.CylinderGeometry(0.045, 0.036, 0.16, 12), '#141416', -0.12 + i * 0.12, 0.96, -0.12);
  grp.visible = false; scene.add(grp); const light = { amb: U.uAmb.value, key: U.uKey.value, dir: U.uKeyDir.value, screen: U.uScreenL.value };
  return { group: grp, t: 0, light };
}
function nearestOn(pts, a) { let bi = 0, bd = 1e9; pts.forEach((p, i) => { const d = Math.hypot(p.x - a.x, (p.y - a.y) * 2, p.z - a.z); if (d < bd) { bd = d; bi = i; } }); return bi; }
const HALL_ID = Object.fromEntries(Object.values(HALL).map((h) => [h.key, h.id]));
// where lobby guests stand, sit or queue (x, z)
const LOBBY_SPOTS = [[-12.6, 9.0], [-11.0, 9.4], [-12.8, -4.0], [-11.2, -3.6], [-4.6, 3.5], [2.2, -1.8], [-3.4, -2.6], [1.8, 4.0], [-6.5, 11.0], [6.6, 10.5], [4.5, 13.2], [-8.8, 1.2], [16.5, 3.0], [16.0, -4.5], [-8.0, -9.5], [3.0, -9.0], [11.0, 9.0], [-1.0, 8.5],
  [-13.8, 7.6], [-14.2, -5.2], [19.0, 6.5], [19.2, -0.5], [9.5, -3.0], [-7.0, -4.6], [5.4, 7.0], [-2.6, 12.6], [13.6, 5.2], [-16.0, 12.0], [7.8, -9.6], [-5.2, 15.0]];   // v9.3: queues, poster wall, windows
const IDLES = ['Idle_Loop', 'Idle_Loop', 'Idle_TalkingPhone_Loop', 'Idle_FoldArms_Loop', 'Idle_Talking_Loop'];   // what a waiting guest does with their hands
