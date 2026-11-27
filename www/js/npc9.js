// LUMIERE v9 - the people of the cinema: staff at their posts, guests in the lobby, the audience of your show, the usher who walks you
// in, the server who answers your seat bell. v8 phone feedback this answers: eyes that spun (people.js Rig.reset), white flashes on faces
// (screen light is smoothed and capped), people sitting into each other or overlapping (one person per seat, walkers keep their distance
// and wait), everyone spawning at once (arrivals are staggered over the countdown and walk in through the door), the same outfits (every
// person has their own seed), the audience staring at you instead of the film (they watch the screen), voices from far away (people only
// speak when you are near), the slow guide (he walks faster than you and waits only when you fall behind).
// Paths: building.js NAV (lobby, escalators, corridor, spine) and hallmath.seatRoute (door, rear aisle, side aisle, row lane, seat).
import * as THREE from 'three';
import { Person, CrowdRenderer, DATA, randomRecipe, staffRecipe, sitHeight } from './people.js';
import { POSTS, NAV, HALL, L1, ESC, SPINE, ZONE, LOBBY, EXIT_PASSAGES } from './building.js';
import { seatRoute, SEAT, SCREEN_GAP, WALL } from './hallmath.js';
import { pick } from './i18n.js';
import { ASSETS } from './assets.js';
import { makeHeld, setHeldMaterial } from './held.js';
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
// v11 (the user's photo, 2026-11-14: a guest half inside the marble pier by the exit leaves): guests milling round the lobby walked a
// straight line to a random spot, through piers, glass screens, the lift tower, the escalator boxes and sofas. Now they stand only at
// spots checked against the building (a clear straight leg, 0.3 m from every wall and prop, to a public nav node, never in the ticket
// zone; 0.85 m from every public nav edge, out of the walkers' way; 1 m from the next spot; one guest a spot) and drift between
// neighbouring spots along legs checked the same way (Crowd.millNet, mill, millBack).
// tools/dev/npc-clear.mjs proves it: 10 minutes of a full lobby, nobody inside a wall, a prop or another person, nobody stuck.
const PUBLIC = new Set(['doorIn', 'greet', 'foyer', 'foyerW', 'foyerE', 'boxQ', 'boxQ2', 'conQ', 'conQ2', 'lounge', 'loungeN', 'lounge2', 'loungeS', 'gateW', 'gate', 'downOut', 'east', 'eastC', 'lobbyBack']);
const segPt = (px, pz, x0, z0, x1, z1) => { const vx = x1 - x0, vz = z1 - z0, l = vx * vx + vz * vz, t = l > 0 ? clamp(((px - x0) * vx + (pz - z0) * vz) / l, 0, 1) : 0; return Math.hypot(px - x0 - vx * t, pz - z0 - vz * t); };
const segSeg = (ax, az, bx, bz, cx, cz, dx, dz) => { const cr = (px, pz, qx, qz, rx, rz) => (qx - px) * (rz - pz) - (qz - pz) * (rx - px);
  if (cr(ax, az, bx, bz, cx, cz) * cr(ax, az, bx, bz, dx, dz) < 0 && cr(cx, cz, dx, dz, ax, az) * cr(cx, cz, dx, dz, bx, bz) < 0) return 0;
  return Math.min(segPt(ax, az, cx, cz, dx, dz), segPt(bx, bz, cx, cz, dx, dz), segPt(cx, cz, ax, az, bx, bz), segPt(dx, dz, ax, az, bx, bz)); };
// the clearance of a straight walk from A to B: the nearest active collision segment in the band a body fills (0.4 to 1.75 m over y)
function walkClear(walls, ax, az, bx, bz, y = 0) {
  const S = walls.S, K = walls.K, G = walls.B; let best = 9; const seen = new Set();
  for (let gx = Math.floor((Math.min(ax, bx) - 1) / 2); gx <= Math.floor((Math.max(ax, bx) + 1) / 2); gx++) for (let gz = Math.floor((Math.min(az, bz) - 1) / 2); gz <= Math.floor((Math.max(az, bz) + 1) / 2); gz++) {
    const l = G.get(gx * 4096 + gz); if (!l) continue;
    for (const i of l) { if ((K && !K[i]) || seen.has(i)) continue; seen.add(i); const j = i * 6; if (S[j + 5] <= y + 0.4 || S[j + 4] >= y + 1.75) continue; best = Math.min(best, segSeg(ax, az, bx, bz, S[j], S[j + 1], S[j + 2], S[j + 3])); } }
  return best;
}
// ------------------------------------------------------------------ one person
class Agent {
  constructor(crowd, o) {
    Object.assign(this, { crowd, id: o.id, role: o.role || 'guest', name: o.name || '', nameKey: o.nameKey || null, voice: o.voice || null, rec: o.rec, x: o.x, y: o.y || 0, z: o.z, yaw: o.yaw || 0, home: o.home || null,
      path: null, pi: 0, speed: o.speed || rnd(1.15, 1.4), ride: false, sit: 0, sitT: 0, seat: null, hall: null, state: o.state || 'idle', look: { yaw: 0, pitch: 0, amt: 0 }, alive: true,
      gest: null, gestUntil: 0, talkUntil: 0, talkable: !!o.talkable, wait: 0, onArrive: null, items: {}, item: null, r: 0.26 });
    // how this person takes to a stranger: fixed per person (from the id), so the same guest is the same every time you try
    { let h = 2166136261; for (const c of String(o.id || '')) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } const u = ((h >>> 0) % 1000) / 1000; this.temper = u < 0.1 ? 'curt' : u < 0.45 ? 'plain' : 'warm'; }   // v14 (the user, 11-20: "almost all of them are rude"): most are warm
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
    const P = POSTS, mk = (id, look, name, role, voice, post, at) => { const p = at || P[post]; const a = this.spawn({ id, rec: staffRecipe(look, id.length * 131 + 17), name, nameKey: 'staff.' + id, role, voice, x: p.x, y: p.y || 0, z: p.z, yaw: p.yaw + Math.PI, home: { ...p, yaw: p.yaw + Math.PI }, state: 'post', talkable: true }); this.staff[id] = a; return a; };
    // behind the counters (the posts in building.js are the customers' side), facing the lobby
    mk('host', 'greeter', 'Clara', 'host', 'host', 'greeter');
    mk('box1', 'receptionist', 'Éloïse', 'box', 'box', null, { x: -18.1, y: 0, z: 9.0, yaw: -Math.PI / 2 }); mk('box2', 'vendor', 'Priya', 'box', 'box', null, { x: -18.1, y: 0, z: 6.2, yaw: -Math.PI / 2 });
    mk('bar1', 'vendor', 'Mia', 'bar', 'barF', null, { x: -17.95, y: 0, z: -6.0, yaw: -Math.PI / 2 }); mk('bar2', 'vendor2', 'Gaston', 'bar', 'barM', null, { x: -17.95, y: 0, z: -2.4, yaw: -Math.PI / 2 });   // v14 at the counter, 0.45 m behind its back edge (they stood 1.5 m back: too far to order)
    mk('cafe', 'vendor', 'Leo', 'cafe', 'barM', null, { x: -20.45, y: 0, z: -11.3, yaw: -Math.PI / 2 });   // v10: the barista behind the cafe counter
    mk('usher', 'usher', 'Marcel', 'usher', 'usher', 'usher'); mk('server', 'server', 'Rahul', 'server', 'server', 'server');
    this.staff.server.cart = true; this.cart = makeCart(this.mats, this.scene);
    this.setDensity(this.density); this.streetFolk(); this.corridorFolk();
  }
  // v14 (the user, 11-21: "the corridors like the upper area felt so empty and dead"): people upstairs between the shows. Three stroll the
  // bridge between the halls' doors, each on a lane 0.9 m off the walking line (so they never meet the audience or the usher head-on), two
  // pairs talk by the posters on the north wall, three sit round the bornes (world9.js BORNES) facing out
  corridorFolk() {
    const Y = L1, folk = this.folk = [], mk = (o) => { const rs = this.seed(), rec = randomRecipe(rs), a = this.spawn({ rec, role: 'guest', voice: rec.kind === 'f' ? 'guestF' : 'guestM', y: Y, talkable: true, ...o }); Object.assign(a, { rs, gn: 1000 + folk.length, gi: 0 }); folk.push(a); return a; };
    for (const [x0, x1, lane] of [[-44, -6, -17.1], [-4, 12, -18.9], [14, 36, -17.1]]) { const a = mk({ x: (x0 + x1) / 2, z: lane, yaw: Math.PI / 2, state: 'street', speed: rnd(1.05, 1.3) }); a.idle = IDLES[0]; a.next = this.now + rnd(800, 5000);
      a.leg = () => { const tx = rnd(x0, x1); a.go([{ x: tx, y: Y, z: lane }], () => { a.yaw = Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2; a.next = this.now + rnd(3000, 11000); }); }; }
    for (const [x, z] of [[-27.5, -15.4], [18.6, -15.4]]) for (const s of [-1, 1]) { const a = mk({ x: x + s * 0.42, z, yaw: s < 0 ? Math.PI / 2 : -Math.PI / 2, state: 'still' }); a.idle = 'Idle_Talking_Loop'; a.gi = 4; }
    const spots = this.world.sitSpots.filter((q) => q.ring && q.room === 'corridor' && !q.taken);
    for (const sp of [spots[1], spots[4], spots[9]]) { if (!sp) continue; sp.taken = 'npc'; const a = mk({ x: sp.x, z: sp.z, y: sp.fy ?? Y, yaw: sp.face - Math.PI, state: 'still' }); a.perch = { h: sp.y - (sp.fy ?? Y) }; a.sit = 1; a.spot = sp; }
  }
  dropFolk() { for (const a of this.folk || []) { if (a.spot && a.spot.taken === 'npc') a.spot.taken = null; this.remove(a); } this.folk = []; }
  // v12 (the user: people on the street): passers-by on the far pavement, each in a stretch of their own (no two ever meet head-on on
  // its narrow walking line, between the tree pits and the cafe's tables), stopping at a shop window now and then; and three who stay
  // put: a doorman at the hotel, a couple at a cafe table, someone outside the ramen bar
  streetFolk() {
    const Z = 38.55, legs = [[-30, -24.2], [-12, 2], [3, 12], [15, 30]];
    legs.forEach(([x0, x1], i) => { const a = this.spawn({ rec: randomRecipe(this.seed()), role: 'street', x: (x0 + x1) / 2, y: 0, z: Z, yaw: Math.PI / 2, state: 'street', speed: rnd(0.95, 1.25) });
      a.idle = IDLES[(i + 2) % IDLES.length]; a.next = this.now + rnd(500, 4000);
      a.leg = () => { const tx = rnd(x0, x1); a.go([{ x: tx, y: 0, z: Z }], () => { a.yaw = 0; a.next = this.now + rnd(2500, 9000); }); }; });
    for (const [x, z, yaw, idle] of [[-30.0, 39.35, Math.PI, 'Idle_FoldArms_Loop'], [-19.2, 38.45, 0.25, 'Idle_Talking_Loop'], [-18.5, 38.5, -0.6, 'Idle_Loop'], [19.1, 39.25, 2.6, 'Idle_TalkingPhone_Loop']]) {
      const a = this.spawn({ rec: randomRecipe(this.seed()), role: 'street', x, y: 0, z, yaw, state: 'still' }); a.idle = idle; }
  }
  // NPC density applies at once (v8: "the NPC setting doesn't change anything until restart"): guests join or leave the lobby now
  setDensity(d) {
    if (this.mirror) { d = { few: 'low', normal: 'medium', many: 'high' }[d] || d; this.density = d in DENSITY ? d : 'medium'; return; }   // the host's guests stand in
    d = { few: 'low', normal: 'medium', many: 'high' }[d] || d; this.density = d in DENSITY ? d : 'medium'; const want = DENSITY[this.density];
    while (this.guests.length > want) { const g = this.guests.pop(); this.remove(g); }
    while (this.guests.length < want) { const g = this.newGuest(this.guests.length); if (!g) break; this.guests.push(g); }
  }
  newGuest(i) {
    const M = this.millNet(), free = M.spots.filter((s) => !s.by); if (!free.length) return null;   // v12b: never two guests on one spot (npc-clear found two)
    const s = free[(i + Math.floor(this.seedBase)) % free.length], rs = this.seed(), rec = randomRecipe(rs), voice = rec.kind === 'f' ? (i % 2 ? 'guestF2' : 'guestF') : (i % 2 ? 'guestM2' : 'guestM');
    const a = this.spawn({ rec, role: 'guest', voice, x: s.x, y: 0, z: s.z, yaw: s.face + rnd(-0.6, 0.6), state: 'mill', talkable: true }); a.spot = [s.x, s.z]; a.millSpot = s; s.by = a; a.next = this.now + rnd(4000, 14000); a.idle = IDLES[i % IDLES.length];
    a.gn = this.gnext = (this.gnext || 0) + 1; a.rs = rs; a.gi = i % IDLES.length; if (i % 4 === 1) this.handProp(a, ['cola', 'latte', 'salted', 'caramel'][i % 3]); return a;
  }
  // v14 play together (the user, 11-21: "it showed an npc at a place and i talked to him ... in other mobile it showed that there is no npc
  // there"): the host's phone runs the lobby's guests and sends who they are (a roster: number, recipe seed, idle) and where they are (four
  // times a second); every other phone drops its own guests and shows the host's, moved between the last two reports (puppets)
  guestRoster() { return this.guests.concat(this.folk || []).filter((g) => g.alive && g.gn).map((g) => [g.gn, g.rs, g.gi]); }
  guestState() { const o = []; for (const g of this.guests.concat(this.folk || [])) if (g.alive && g.gn) o.push(g.gn, Math.round(g.x * 100), Math.round(g.y * 100), Math.round(g.z * 100), Math.round(g.yaw * 100), g.perch && g.sit > 0.5 ? -Math.round(g.perch.h * 100) : Math.round((g.walkT || 0) * 10)); return o; }
  mirrorGuests(on) { on = !!on; if (on === !!this.mirror) return; this.mirror = on; for (const g of this.guests) { if (g.millSpot && g.millSpot.by === g) g.millSpot.by = null; this.remove(g); } this.guests = []; this.dropFolk();
    if (!on) { this.setDensity(this.density); this.corridorFolk(); } }
  applyRoster(list) {
    if (!Array.isArray(list)) return; if (!this.mirror) this.mirrorGuests(true); const want = new Map();
    for (const r of list.slice(0, 60)) if (Array.isArray(r) && r.length >= 3 && Number.isFinite(+r[0]) && Number.isFinite(+r[1])) want.set(Math.round(+r[0]), r);
    this.guests = this.guests.filter((g) => { if (want.has(g.gn)) return true; this.remove(g); return false; });
    for (const [n, r] of want) { if (this.guests.some((g) => g.gn === n)) continue; const rs = Math.abs(Math.round(+r[1])) || 1, gi = Math.abs(Math.round(+r[2]) || 0) % IDLES.length, rec = randomRecipe(rs);
      const a = this.spawn({ id: 'hg' + n, rec, role: 'guest', voice: rec.kind === 'f' ? (gi % 2 ? 'guestF2' : 'guestF') : (gi % 2 ? 'guestM2' : 'guestM'), x: 0, y: 0, z: -999, state: 'puppet', talkable: true });
      Object.assign(a, { gn: n, rs, gi, idle: IDLES[gi], puppet: true, snaps: [] }); this.guests.push(a); } }
  applyGuests(arr) {
    if (!this.mirror || !Array.isArray(arr)) return; const now = performance.now(), num = (v, a, b) => (Number.isFinite(+v) ? Math.max(a, Math.min(b, +v)) : null);
    for (let i = 0; i + 5 < Math.min(arr.length, 600); i += 6) { const g = this.guests.find((q) => q.gn === Math.round(+arr[i])); if (!g) continue;
      const x = num(arr[i + 1] / 100, -900, 900), y = num(arr[i + 2] / 100, -60, 60), z = num(arr[i + 3] / 100, -900, 900), yaw = num(arr[i + 4] / 100, -100, 100), v6 = num(arr[i + 5], -150, 60), v = v6 == null ? 0 : Math.max(0, v6 / 10); if (x == null || y == null || z == null || yaw == null) continue;
      if (v6 != null && v6 < 0) { g.perch = { h: Math.min(1.2, -v6 / 100) }; g.sit = 1; } else if (g.perch) { g.perch = null; g.sit = 0; }   // sitting on a borne or a sofa
      const S = g.snaps; S.push({ t: now, x, y, z, yaw, v: v || 0 }); if (S.length > 6) S.shift(); if (g.z < -900) { g.x = x; g.y = y; g.z = z; g.yaw = yaw; } } }
  // a puppet guest: 350 ms behind the host's reports (they come every 250 ms), between the two either side of that moment
  puppet(a, dt) {
    const S = a.snaps; if (!S.length || a.talking) { a.walkT = 0; return; } const tt = performance.now() - 350; let b = S.length - 1, x, y, z, yaw, v;
    if (S[b].t <= tt || S.length < 2) ({ x, y, z, yaw, v } = S[b]);
    else { while (b > 0 && S[b - 1].t > tt) b--; if (b === 0) ({ x, y, z, yaw, v } = S[0]); else { const A = S[b - 1], B = S[b], k = (tt - A.t) / Math.max(1, B.t - A.t); x = A.x + (B.x - A.x) * k; y = A.y + (B.y - A.y) * k; z = A.z + (B.z - A.z) * k; yaw = A.yaw + adiff(B.yaw, A.yaw) * k; v = B.v; } }
    if (Math.hypot(x - a.x, z - a.z) > 5) { a.x = x; a.y = y; a.z = z; } else { const f = Math.min(1, dt * 12); a.x += (x - a.x) * f; a.y += (y - a.y) * f; a.z += (z - a.z) * f; }
    a.yaw += adiff(yaw, a.yaw) * Math.min(1, dt * 10); a.walkT = v > 0.2 ? v : 0;
  }
  // the host's audience for a shared show (seat, recipe seed, arrival in ms from now, seated now): every phone fills the same seats
  audPlan(hallId) { return (this.viewers[hallId] || []).filter((v) => v.state !== 'gone' && v.rs).map((v) => [v.seat.id, v.rs, v.state === 'due' ? Math.max(0, Math.round(v.at - this.now)) : 0, v.state === 'due' ? 0 : 1]); }
  // the guests' lobby (see PUBLIC): each hand-placed spot is checked against the building; one that fails moves to the nearest place within
  // 1.5 m that passes, or is dropped. The spot faces the open floor (its way in), as people stand with their backs to a wall or a counter.
  millNet() {
    if (this._mill) return this._mill; const W = this.world.walls, edges = [], spots = [], dropped = [];
    for (const [a, b] of NAV.edges) if (PUBLIC.has(a) && PUBLIC.has(b)) edges.push({ A: NODES[a], B: NODES[b] });
    // v11: the staff standing on the lobby floor (the greeter, the usher) are kept clear like a guest's spot (a walker passed 0.24 m from the greeter)
    const posts = Object.values(this.staff).map((a) => a.home).filter((h) => h && this.world.roomAt(h.x, h.y || 0, h.z) === 'lobby');
    const ok = (x, z) => {
      if (this.world.roomAt(x, 0, z) !== 'lobby' || (x > ZONE.x0 - 0.3 && x < ZONE.x1 + 0.3 && z > ZONE.z0 - 0.3 && z < ZONE.z1 + 0.3)) return null;
      for (const r of this.world.keepOut || []) if (x > r[0] && x < r[2] && z > r[1] && z < r[3]) return null;   // v12 the exhibit behind its rope, the photo set (world9.js)
      for (const e of edges) if (segPt(x, z, e.A[0], e.A[2], e.B[0], e.B[2]) < 0.85) return null;
      for (const s of spots) if (Math.hypot(s.x - x, s.z - z) < 1.0 || segPt(x, z, s.x, s.z, NODES[s.node][0], NODES[s.node][2]) < 0.6) return null;
      for (const p of posts) if (Math.hypot(p.x - x, p.z - z) < 1.0) return null;
      let best = null, bd = 7; for (const n of PUBLIC) { const N = NODES[n], d = Math.hypot(N[0] - x, N[2] - z); if (d < bd && walkClear(W, x, z, N[0], N[2]) >= 0.3) { best = n; bd = d; } }
      if (!best) return null; const N = NODES[best];
      for (const s of [...spots, ...posts]) if (segPt(s.x, s.z, x, z, N[0], N[2]) < 0.6) return null;   // nobody stands on this spot's way in
      return best; };
    for (const [x0, z0] of LOBBY_SPOTS) { let got = null;
      for (let r = 0; r <= 1.5 && !got; r += 0.25) for (let k = 0; k < (r ? 12 : 1) && !got; k++) { const x = x0 + r * Math.cos(k * TAU / 12), z = z0 + r * Math.sin(k * TAU / 12), n = ok(x, z); if (n) got = { x, z, node: n, by: null, face: Math.atan2(NODES[n][0] - x, NODES[n][2] - z) }; }
      if (got) spots.push(got); else dropped.push([x0, z0]); }
    // always more spots than guests (DENSITY high is 30): places 0.45 to 1.3 m from a wall, a counter or a sofa, as people stand, spread
    // over the lobby in a fixed shuffle (every run is the same)
    if (spots.length < 48) { const cand = []; for (let x = LOBBY.x0 + 0.6; x < LOBBY.x1 - 0.6; x += 0.75) for (let z = LOBBY.z0 + 0.6; z < LOBBY.z1 - 0.6; z += 0.75) { const c = walkClear(W, x, z, x, z); if (c >= 0.45 && c <= 1.3) cand.push([x, z]); }
      let h = 2166136261; const r2 = () => { h = Math.imul(h ^ (h >>> 13), 0x5bd1e995); h ^= h >>> 15; return (h >>> 0) / 4294967296; };
      for (let i = cand.length - 1; i > 0; i--) { const j = Math.floor(r2() * (i + 1)); [cand[i], cand[j]] = [cand[j], cand[i]]; }
      for (const [x, z] of cand) { if (spots.length >= 48) break; const n = ok(x, z); if (n) spots.push({ x, z, node: n, by: null, face: Math.atan2(NODES[n][0] - x, NODES[n][2] - z) }); } }
    if (dropped.length) console.info(`[crowd] ${dropped.length} lobby spots dropped (no clear way to the walkers' graph): ${JSON.stringify(dropped)}`);
    // the spot graph: two spots are neighbours when a straight walk between them (1.5 to 9 m) keeps 0.35 m from every wall and prop and
    // 0.8 m from every other spot (nobody walks through someone standing there); walkers keep to their right on a leg wide enough for it
    for (const q of spots) q.next = [];
    for (let i = 0; i < spots.length; i++) for (let j = i + 1; j < spots.length; j++) { const A = spots[i], B = spots[j], l = Math.hypot(A.x - B.x, A.z - B.z); if (l > 9 || l < 1.5) continue;
      if (spots.some((q) => q !== A && q !== B && segPt(q.x, q.z, A.x, A.z, B.x, B.z) < 0.8) || posts.some((p) => segPt(p.x, p.z, A.x, A.z, B.x, B.z) < 0.8)) continue;
      const c = walkClear(W, A.x, A.z, B.x, B.z); if (c < 0.35) continue; const lane = clamp(c - 0.3, 0, 0.25); A.next.push({ s: B, lane }); B.next.push({ s: A, lane }); }
    return (this._mill = { spots, dropped });
  }
  // a guest drifts to a free neighbouring spot (a few people on the move at a time, as in a real foyer); the spot they leave stays theirs
  // until they arrive, so a guest kept waiting in someone's way walks back to it (step())
  mill(a, now) {
    this.millNet(); a.next = now + rnd(14000, 40000); const from = a.millSpot; if (!from) return;
    if (Math.hypot(a.x - from.x, a.z - from.z) > 0.3) {   // stopped on a leg (a talk): back to the spot they came from, along the same leg
      if (a.millTo) { a.millTo.by = null; a.millTo = null; } a.go([{ x: from.x, y: 0, z: from.z }], () => { a.yaw = from.face + rnd(-0.6, 0.6); }); return; }
    if (this.guests.filter((g) => g.path).length >= 5) { a.next = now + rnd(3000, 9000); return; }
    const opts = from.next.filter((n) => !n.s.by); if (!opts.length) return; const n = opts[Math.floor(Math.random() * opts.length)], to = n.s;
    const dx = to.x - from.x, dz = to.z - from.z, l = Math.hypot(dx, dz), rx = dz / l * n.lane, rz = -dx / l * n.lane;
    to.by = a; a.millTo = to;
    a.go([{ x: from.x + dx * 0.25 + rx, y: 0, z: from.z + dz * 0.25 + rz }, { x: from.x + dx * 0.75 + rx, y: 0, z: from.z + dz * 0.75 + rz }, { x: to.x, y: 0, z: to.z }],
      () => { from.by = null; a.millSpot = to; a.millTo = null; a.spot = [to.x, to.z]; a.yaw = to.face + rnd(-0.6, 0.6); });
  }
  // kept waiting 1.5 s on a leg: back the way they came, to the spot that is still theirs
  millBack(a, now) {
    const from = a.millSpot; if (!from || !a.millTo) return false; a.millTo.by = null; a.millTo = null; a.next = now + rnd(3000, 8000);
    a.go([...a.path.slice(0, a.pi).reverse(), { x: from.x, y: 0, z: from.z }], () => { a.yaw = from.face + rnd(-0.6, 0.6); }); return true;
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
  planAudience(hallId, n, windowMs, exclude = new Set(), given = null) {
    const h = this.world.hallById(hallId); if (!h) return; this.clearAudience(hallId);
    if (Array.isArray(given)) { const list = this.viewers[hallId] = [];   // v14 the host's plan (audPlan), with this phone's own seat left free
      for (const g of given.slice(0, 400)) { if (!Array.isArray(g)) continue; const s = h.seats.find((q) => q.id === String(g[0])); if (!s || s.taken || s.player || exclude.has(s.id)) continue;
        const rs = Math.abs(Math.round(+g[1])) || 1, rec = randomRecipe(rs), i = list.length, seated = +g[3] === 1; s.taken = true;
        const v = { seat: s, hall: h, rec, rs, state: seated ? 'seated' : 'due', at: seated ? 0 : this.now + Math.max(0, Math.min(600000, +g[2] || 0)), agent: null, clip: 'Sitting_Idle_Loop', t0: Math.random() * 10, clipB: null, t0B: 0, blend: 0, reactUntil: 0, voice: rec.kind === 'f' ? (i % 2 ? 'guestF2' : 'guestF') : (i % 2 ? 'guestM2' : 'guestM') };
        s.npc = v; list.push(v); }
      list.sort((a, b) => a.at - b.at); return; }
    // strangers leave a seat between you and them (and nobody looms right beside your head)
    const mine = h.seats.find((s) => exclude.has(s.id) || s.player), near = mine ? new Set(h.seats.filter((s) => s.row === mine.row && Math.abs(s.col - mine.col) === 1).map((s) => s.id)) : new Set();
    const free = h.seats.filter((s) => !s.taken && !exclude.has(s.id) && !s.player && !near.has(s.id));
    // fill like people do: the middle rows and the middle of each row first, couples together, a few singles
    free.sort((a, b) => (Math.abs(a.row - h.cfg.rows.length * 0.55) + Math.abs(a.a) * 0.35 + Math.random() * 3.5) - (Math.abs(b.row - h.cfg.rows.length * 0.55) + Math.abs(b.a) * 0.35 + Math.random() * 3.5));
    // v14 (the user, 11-21: "they come one by one and too slowly"): people come in parties of one to four (couples most often) that walk in
    // together a second apart; the parties are spread over the first part of the window (at most four minutes), not the whole of it
    const list = this.viewers[hallId] = [], chosen = free.slice(0, n), t0 = this.now + 1200, span = Math.min(windowMs * 0.7, 240000);
    const parties = []; for (let i = 0; i < chosen.length;) { const k = Math.min(chosen.length - i, [1, 2, 2, 2, 3, 4][Math.floor(Math.random() * 6)]); parties.push(k); i += k; }
    const when = []; parties.forEach((k, p) => { const at = t0 + (p / Math.max(1, parties.length)) * span + rnd(0, 1500); for (let j = 0; j < k; j++) when.push(at + j * rnd(700, 1100)); });
    chosen.forEach((s, i) => { const rs = this.seed(), rec = randomRecipe(rs); s.taken = true;
      const v = { item: i % 3 === 0 ? ['salted', 'cola', 'caramel', 'nachos', 'icedtea'][i % 5] : null, seat: s, hall: h, rec, rs, state: 'due', at: when[i], agent: null, clip: 'Sitting_Idle_Loop', t0: Math.random() * 10, clipB: null, t0B: 0, blend: 0, reactUntil: 0, voice: rec.kind === 'f' ? (i % 2 ? 'guestF2' : 'guestF') : (i % 2 ? 'guestM2' : 'guestM') };
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
  // v12b the exits are in the side walls at the front: down your side's aisle to the front, across to the door, through it onto the passage's landing
  exitRoute(h, seat) {
    const H = h.cfg, row = H.rows[seat.row], laneE = (row.lane[0] + row.lane[1]) / 2, sg = seat.a >= 0 ? 1 : -1, sideA = sg * (H.aisle[0] + H.aisle[1]) / 2, ex = H.exits.find((q) => q.sg === sg) || H.exits[0], pts = [];
    let y = seat.y; const add = (a, e) => { const q = H.fromRow(a, e), w = H.toWorld(q.u, q.d); y = this.world.floorY(w.x, w.z, y); pts.push({ x: w.x, y, z: w.z }); };
    const dc = (ex.d0 + ex.d1) / 2; add(seat.a, laneE);
    if (H.rowK) { const n = Math.ceil(Math.abs(sideA - seat.a) / 2); for (let i = 1; i < n; i++) add(seat.a + (sideA - seat.a) * i / n, laneE); }   // v14c along a curved lane in short chords
    add(sideA, laneE);
    if (H.rowK) { const eA = (H.rows[0].lane[0] + H.rows[0].lane[1]) / 2; for (let e = laneE - 2.5; e > eA + 1.2; e -= 2.5) add(sideA, e); if (laneE - eA > 0.05) add(sideA, eA); }   // down the curved aisle to row A's lane, then straight to the door (the aisle's arc runs into the screen in front of row A)
    else add(sideA, dc + 0.6);
    for (const u of [H.width / 2 - 0.6, H.width / 2 + WALL + 0.7]) { const w = H.toWorld(ex.sg * u, dc); pts.push({ x: w.x, y: H.y0, z: w.z }); }
    const o = H.toWorld(ex.sg * (H.width / 2 + WALL + 0.7), ex.d0 + 0.1); pts.push({ x: o.x, y: H.y0, z: o.z });
    return pts;
  }
  // from a hall's exit door down its passage into the spine and along it to the lobby (staff going back to their posts)
  passageOut(door) {
    for (const p of EXIT_PASSAGES) for (const f of p.flights) {
      if (f.door !== door.id) continue; const zc = (f.z0 + f.z1) / 2, toS = p.side < 0 ? 1 : -1, xs = Math.sign(p.xSpine) * 1.6, inn = door.z + door.from * 1.0;
      return [{ x: door.x, y: f.y0, z: inn }, { x: door.x, y: f.y0, z: zc }, { x: f.xTop - toS * 0.2, y: f.y0, z: zc }, { x: f.xTop + toS * (f.n * f.tread + 0.4), y: 0, z: zc },
        { x: p.xSpine + toS * 0.8, y: 0, z: zc }, { x: xs, y: 0, z: zc }, { x: xs, y: 0, z: -15.6 }];
    }
    return [];
  }
  onShowPhase(hallId, phase) {
    const list = this.viewers[hallId] || []; (this.phase || (this.phase = {}))[hallId] = phase;   // v14 'dimming' hushes the pre-show chatter, 'ended' lets it start again
    if (phase === 'ended') list.forEach((v, i) => { if (v.state === 'seated' || v.state === 'walking') { v.leaveAt = this.now + 2500 + i * rnd(350, 700); } });
    if (phase === 'dimming') for (const v of list) if (v.state === 'due') v.at = Math.min(v.at, this.now);   // late arrivals hurry in
  }
  // the show's events -> who reacts, how, when; plus one crowd sound for the hall
  onFilmEvent(hallId, ev) {
    const list = (this.viewers[hallId] || []).filter((v) => v.state === 'seated'); if (!list.length) return;
    const MAP = { laugh: ['laugh', 0.55], gasp: ['gasp', 0.5], scare: ['scream', 0.35], tension: ['lean', 0.35], climax: ['cheer', 0.3], aww: ['aww', 0.4], end: ['clap', 0.85], wow: ['gasp', 0.45], beat: ['clap', 0.16], drop: ['cheer', 0.42] }, m = MAP[ev.type]; if (!m) return;   // v14c beat / drop: Music Night (film9 _music)
    let n = 0; const k = ev.k ?? 1;
    for (const v of list) { if (Math.random() > m[1] * (0.6 + 0.4 * k)) continue; n++; const d = rnd(0, ev.type === 'end' ? 1.4 : ev.type === 'beat' || ev.type === 'drop' ? 0.12 : 0.45), len = ev.type === 'end' ? rnd(4, 7) : ev.type === 'beat' ? rnd(0.9, 1.5) : rnd(1.4, 2.6);
      setTimeout(() => { v.clipB = m[0]; v.t0B = this.now / 1000; v.reactUntil = this.now + len * 1000; if (v.agent) v.agent.gesture(m[0], len, m[0] === 'laugh' ? 'laugh' : m[0] === 'scream' ? 'scream' : null); }, d * 1000); }
    const h = this.world.hallById(hallId), c = h.cfg.toWorld(0, h.cfg.depthIn * 0.5);
    if (n && this.hooks.crowdSound && ev.type !== 'beat' && ev.type !== 'drop') this.hooks.crowdSound(hallId, ev.type === 'end' ? 'applause' : ev.type === 'scare' ? 'scream' : ev.type === 'laugh' ? 'laugh' : ev.type === 'aww' ? 'aww' : 'gasp', n, k, c.x, c.z);
    if (ev.type === 'end') for (const v of list) if (Math.random() < 0.08) { const s = v.seat; setTimeout(() => this.hooks.bubble && v.agent && v.agent.say(pick('aud.end')), rnd(2000, 6000)); }
  }
  // ---------------------------------------------------------- the usher walks you to your seat (first visit) or points the way
  guide(usher, h, seat, player) {
    const from = this.world.roomAt(usher.x, usher.y, usher.z); if (from !== 'lobby') return false;
    const nav = navPath('gate', 'portal'), H = h.cfg, side = H.side < 0 ? (H.id === 'CURVE' ? ['bridgeW', 'flankW1', 'flankW2', 'linkW'] : ['bridgeW', 'flankW1']) : (H.id === 'X270' ? ['bridgeE', 'flankE1', 'flankE2'] : ['bridgeE', 'flankE1']);
    const pts = [...nav.map((n) => ({ x: NODES[n][0], y: NODES[n][1], z: NODES[n][2], ride: false })), ...['bridgeC', ...side].map((n) => ({ x: NODES[n][0], y: NODES[n][1], z: NODES[n][2] }))];
    for (let i = 0; i < pts.length - 1; i++) { const a = nav[i], b = nav[i + 1]; if (a && b && ESC_EDGES.has(a + '>' + b)) pts[i + 1].ride = true; }
    const route = this.hallRoute(h, seat, true); route.pop();   // stop at the row end: the lane in front of your seat is yours to walk
    usher.go([...pts, ...route], () => { usher.state = 'atSeat'; usher.say(pick('ush.seat')); usher.gesture('point', 2.2); this.hooks.guideDone && this.hooks.guideDone(); setTimeout(() => this.sendHome(usher), 6000); }, { speed: 1.95, state: 'guiding' });
    usher.follow = player; return true;
  }
  sendHome(a) { if (!a.home) return; const back = [], r = this.world.roomAt(a.x, a.y, a.z);
    if (r && r.startsWith('hall')) { const d = this.world.doors.find((q) => q.hall === HALL_ID[r] && q.id.includes('Out0')); if (d) back.push(...this.passageOut(d)); }   // v12b through the side exit and its passage
    if (r === 'corridor') for (const n of navPath('spineS', 'lobbyBack')) back.push({ x: NODES[n][0], y: NODES[n][1], z: NODES[n][2] });
    if (r && r.startsWith('hall')) back.push({ x: NODES.lobbyBack[0], y: 0, z: NODES.lobbyBack[2] });
    back.push({ x: a.home.x, y: a.home.y || 0, z: a.home.z }); a.follow = null; a.go(back, () => { a.state = 'post'; a.yaw = a.home.yaw; }, { speed: 1.5, state: 'returning' }); }
  // ---------------------------------------------------------- the seat bell: the server comes with his cart and the tablet
  // v10 (the user: "only one server, and if anyone else calls it he is the next in queue"): one server for every seat; a call while he
  // is out joins the queue and he takes the next one as soon as he is back at his post. Returns true (coming), 'queued' or false
  callServer(seat, onArrive, first = false) {   // v14 first: a waiter priority pass (credits.js shop) puts this seat at the head of the queue
    const s = this.staff.server; if (!s) return false; this.srvQ = this.srvQ || []; const arrive = () => { s.state = 'serving'; s.job = seat; onArrive && onArrive(s); };
    if (s.job && s.job !== seat && s.state !== 'post') { if (!this.srvQ.some((j) => j.seat === seat)) this.srvQ[first ? 'unshift' : 'push']({ seat, onArrive }); return 'queued'; }
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
  // v14b (the user, 11-26: "the guy who checks tickets doesnt actually have ticket in his hand ... the people dont actually hand off the
  // popcorns ... the thing teleports into the hand"): what people hold is a real thing in their palm (people.js attach): the usher your
  // ticket while he reads it, a vendor or the server the item on its way to you, some guests and some of the audience a drink or popcorn
  handProp(a, what) { if (!a) return; a._propWhat = what || null; a.item = what || null; }
  _prop(a, ch) {
    if (a._propCh && (a._propCh !== ch || a._propHas !== a._propWhat)) { a._propCh.detach('prop'); a._propCh = null; a._propHas = null; }
    if (!a._propWhat || a._propCh) return;
    const m = a._propWhat === 'ticket' ? ticketMesh() : makeHeld({ id: a._propWhat }); if (!m) return;
    setHeldMaterial(m, a._pm || (a._pm = this.mats.propMat({ uAmb: { value: a.light.amb }, uKey: { value: a.light.key }, uKeyDir: { value: a.light.dir }, uScreenL: { value: a.light.screen } })));
    if (m.userData.setLevel) m.userData.setLevel(1); ch.attach('prop', m, 'handR'); a._propCh = ch; a._propHas = a._propWhat;
  }
  // v14b the server serves seats in the halls (the bell, the tablet), not people in his pantry
  talkTarget(px, py, pz, fx, fz, looked) {
    let best = null, bs = 0;
    for (const a of this.agents) { if (!a.talkable || !a.alive || a.state === 'guiding' || (a.role === 'server' && a.state === 'post') || Math.abs(a.y - py) > 1.2) continue; const dx = a.x - px, dz = a.z - pz, d = Math.hypot(dx, dz); if (d > 3.2 || d < 0.2 || (looked && !looked(a))) continue;
      const c = (dx * fx + dz * fz) / d; if (c < 0.55) continue; const sc = c / (0.5 + d); if (sc > bs) { bs = sc; best = a; } }
    return best;
  }
  startTalk(a) { a.talking = true; a.stop && a.state !== 'guiding' && a.path && a.role === 'guest' && a.stop(); if (this.now - (a._warm || 0) > 120000) { a._warm = this.now; this.regard(a, 1); } }   // v14 a chat warms staff (once in two minutes)
  endTalk(a) { if (a) a.talking = false; }
  bodiesNear(x, z, r) { const out = this._tmp; out.length = 0; for (const a of this.agents) if (a.alive && a.ch && a.sit < 0.5) { const d = Math.hypot(a.x - x, a.z - z); if (d < r) out.push({ x: a.x, z: a.z, r: a.r, a }); } return out; }
  // v14 (the user, 11-20: "npc interactions ... relationships, npc angry"): people keep a temper. A bump is forgiven once; again within half a
  // minute they turn on you (an annoyed line, palms up), a third time they shake a fist and walk off. Staff remember how you treat them
  // (lumiere.npc.v1: talking warms them, bumping cools them) and greet a regular by name (dialogue9.js via mood()).
  bumped(a) {
    if (this.now - (a._bump || 0) < 1500) return; const fresh = this.now - (a._bump || 0) > 30000; a._bump = this.now; a.anger = fresh ? 1 : Math.min(3, (a.anger || 0) + 1);
    if (a.role !== 'guest') { this.regard(a, -1); if (a.anger >= 2) { a.say(pick('staff.bumped')); a.gesture('angry', 1.6); } return; }
    if (a.anger === 1) { a.say(pick('guest.bump')); a.gesture('gasp', 0.8); }
    else if (a.anger === 2) { a.say(pick('guest.annoyed')); a.gesture('angry', 2.0); a.glare = this.now + 3000; }
    else { a.say(pick('guest.angry')); a.gesture('shake', 2.2); a.glare = this.now + 2500; if (a.state === 'mill' && !a.talking) setTimeout(() => { if (a.alive && a.state === 'mill') { a.next = 0; this.mill(a, this.now); } }, 2300); this.hooks.event && this.hooks.event('angered'); }
  }
  // a horn (vehicles.js): everyone within r looks round; honk again soon and the nearest complains
  startle(x, z, r = 10) {
    let near = null, nd = r; const again = this.now - (this._horn || 0) < 8000; this._horn = this.now;
    for (const a of this.agents) { if (!a.alive || !a.ch || a.sit > 0.5) continue; const d = Math.hypot(a.x - x, a.z - z); if (d > r) continue; a.glareAt = { x, z }; a.glare = this.now + 2200; if (d < nd) { nd = d; near = a; } }
    if (near) { if (again) { near.say(pick('guest.horn')); near.gesture('angry', 1.8); } else near.gesture('gasp', 0.7); }
  }
  // staff regard, kept between sessions: -3 (cold) .. 6 (a friend)
  regard(a, n) { if (!a || a.role === 'guest' || !a.role) return 0; const R = this._regard || (this._regard = (() => { try { return JSON.parse(localStorage.getItem('lumiere.npc.v1') || '{}') || {}; } catch (e) { return {}; } })());
    const k = a.role + ':' + (a.name || ''); R[k] = Math.max(-3, Math.min(6, (R[k] || 0) + n)); try { localStorage.setItem('lumiere.npc.v1', JSON.stringify(R)); } catch (e) { /* storage off */ } return R[k]; }
  mood(a) { return this.regard(a, 0); }
  // ---------------------------------------------------------- the frame
  update(dt, now, player, vis) {
    if (this.srvQ && this.srvQ.length) this._nextJob();   // the server's queue: the next call as soon as he is back at his post
    this.now = now; const cam = this.engine.camera.position, P = this.engine.preset, near = [];
    // audience: arrivals, seated, leaving
    for (const h of this.world.halls) { const list = this.viewers[h.id], inHall = vis.has(h.key);
      for (const v of list) {
        if (v.state === 'due' && now >= v.at) {
          // the door takes a few at a time (a party walks in together), and at most ten people walk at once (each is a skinned figure)
          const door = h.cfg.toWorld(h.cfg.entryU, h.cfg.depthIn), walking = list.filter((o) => o.state === 'walking' && o.agent);
          if (walking.filter((o) => Math.hypot(o.agent.x - door.x, o.agent.z - door.z) < 1.2).length >= 2 || walking.length >= 10) { v.at = now + 500; continue; }
          if (inHall || vis.has('corridor')) { const route = this.hallRoute(h, v.seat, true), a = this.spawn({ rec: v.rec, role: 'aud', voice: v.voice, x: route[0].x, y: route[0].y, z: route[0].z, speed: rnd(1.3, 1.55) }); v.agent = a; a.viewer = v; v.state = 'walking'; if (v.item) this.handProp(a, v.item);
            a.go([...route, { x: v.seat.x, y: v.seat.y, z: v.seat.z, seat: true }], () => { v.state = 'sitting'; a.sitT = 0; a.yaw = v.seat.yaw + Math.PI; }); }
          else v.state = 'seated';   // they came in while you were elsewhere
        }
        if (v.leaveAt && now >= v.leaveAt && (v.state === 'seated' || v.state === 'sitting')) { v.leaveAt = 0; v.state = 'leaving';
          if (inHall) { let a = v.agent; if (!a) { a = v.agent = this.spawn({ rec: v.rec, role: 'aud', voice: v.voice, x: v.seat.x, y: v.seat.y, z: v.seat.z, yaw: v.seat.yaw + Math.PI }); a.viewer = v; a.sit = 1; }
            a.state = 'standing'; a.sitT = 0; a.exitPath = this.exitRoute(h, v.seat); }
          else this.dropViewer(v); }
      }
    }
    // v14 (the user, 11-20: "they don't clap or cry or talk"): before the film and after it, neighbours turn to each other and talk in turns;
    // from the lights going down to the end of the film they are quiet
    if (!this._chatT || now > this._chatT) { this._chatT = now + rnd(700, 1600);
      for (const h of this.world.halls) { if (!vis.has(h.key) || (this.phase && this.phase[h.id] === 'dimming')) continue;
        const sat = (this.viewers[h.id] || []).filter((v) => v.state === 'seated' && v.agent && v.agent.sit > 0.9 && !(now < v.agent.chatUntil)); if (sat.length < 2) continue;
        const v = sat[Math.floor(Math.random() * sat.length)], o = sat.find((q) => q !== v && q.seat.row === v.seat.row && Math.abs(q.seat.col - v.seat.col) === 1); if (!o) continue;
        const A = v.agent, B = o.agent, T = now + rnd(5000, 9000); A.chatWith = B; B.chatWith = A; A.chatUntil = B.chatUntil = T;
        A.talkFrom = now + 300; A.talkUntil = now + rnd(1800, 2800); B.talkFrom = A.talkUntil + 350; B.talkUntil = B.talkFrom + rnd(1500, 2600);
        if (Math.random() < 0.35) setTimeout(() => { if (now < T && A.alive) A.gesture('laugh', 1.6, 'laugh'); }, rnd(800, 2400)); } }
    // people: move, sit, look, animate, draw
    for (const a of [...this.agents]) {
      if (!a.alive) continue; this.step(a, dt, player);
      a.room = this.world.roomAt(a.x, a.y, a.z) || a.room; const vis_ = !!a.room && vis.has(a.room), d = Math.hypot(a.x - cam.x, a.z - cam.z);
      if (vis_ && d < (a.role === 'street' ? 60 : 38)) near.push([a, d]); else if (a.ch) a.ch.group.visible = false;
    }
    // the nearest few seated viewers are full people; everyone else seated is the GPU crowd
    near.sort((p, q) => (p[0].role === 'remote' ? p[1] - 1e3 : p[1]) - (q[0].role === 'remote' ? q[1] - 1e3 : q[1])); let skinned = 0; const cap = P.people + 6;   // v14 real players first
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
    if (a.puppet) { this.puppet(a, dt); return; }   // v14 the host's guest
    if (a.state === 'street' && !a.path && this.now >= a.next && a.leg) a.leg();   // v12 a passer-by's next stretch of window-shopping
    const now = this.now;
    if (a.state === 'standing') { a.sitT += dt; a.sit = Math.max(0, 1 - a.sitT / 1.1); if (a.sit <= 0) { if (a.viewer && a.viewer.seat.npc === a.viewer) { a.viewer.seat.npc = null; a.viewer.seat.taken = false; } a.go(a.exitPath, () => { if (a.viewer) a.viewer.state = 'gone'; this.remove(a); }, { state: 'leavingHall' }); } return; }
    if (a.state === 'sitting') { a.sitT += dt; a.sit = Math.min(1, a.sitT / 1.2); const s = a.viewer.seat; a.x += (s.x - a.x) * Math.min(1, dt * 4); a.z += (s.z - a.z) * Math.min(1, dt * 4); a.y += (s.y - a.y) * Math.min(1, dt * 6);
      if (a.sit >= 1) { a.viewer.state = 'seated'; a.state = 'seated'; } return; }
    if (a.path) {
      // the guide (v14, the user 11-20: "so slow I can't go with him ... keeps standing there until I go back ... doesn't go back to his place
      // if I sit on my chair myself"): he walks at your pace and faster when you are ahead of him, waits only when you fall behind, and
      // when you have sat down, or left him far behind for 20 s, he gives up the walk and goes back to his post
      if (a.follow && a.state === 'guiding') { const f = a.follow, dx = f.x - a.x, dz = f.z - a.z, d = Math.hypot(dx, dz), dy = Math.abs((f.y || 0) - a.y), t0 = a.path[a.pi];
        if (f.seated || (a.lostAt && this.now - a.lostAt > 20000)) { a.follow = null; a.waitFor = false; a.lostAt = 0; if (f.seated) a.say(pick('ush.enjoy')); this.sendHome(a); return; }
        const ahead = !!t0 && (dx * (t0.x - a.x) + dz * (t0.z - a.z)) > 0 && d > 1.2;
        a.speed = ahead ? (d > 4 ? 3.0 : 2.5) : d < 2.5 ? 2.3 : 2.05;   // v14b (the user, 11-26: "he stops even if I am 2 seconds away"): brisker, and he waits only for someone 8 m behind
        if (!ahead && (d > 8 || dy > 2.5)) a.waitFor = true; else if (ahead || d < 4.5) a.waitFor = false;
        a.lostAt = d > 22 || dy > 2.5 ? a.lostAt || this.now : 0;
        if (a.waitFor) { a.walkT = 0; a.yaw += adiff(Math.atan2(dx, dz), a.yaw) * Math.min(1, dt * 3); return; } }
      const t = a.path[a.pi], dx = t.x - a.x, dz = t.z - a.z, d = Math.hypot(dx, dz);
      // keep your distance: wait while someone walks right in front of you
      // v11: "in your way" is inside your 0.9 m wide walking corridor and less than 0.8 m ahead (people passing on the other side of an edge
      // no longer stop each other); a guest kept waiting 1.5 s walks back to the spot they came from, so nobody freezes face to face
      // in your way: someone walking, a guest standing, or you (the player)
      const inWay = (ox, oz, oy) => { const ahead = (ox * dx + oz * dz) / (d || 1), side = Math.abs(ox * dz - oz * dx) / (d || 1); return ahead > 0.05 && ahead < 0.8 && side < 0.45 && Math.abs(oy - a.y) < 0.8; };
      let blocked = false; if (a.role !== 'usher' && a.role !== 'server') { for (const o of this.agents) { if (o === a || !o.alive || o.sit > 0.2 || (!o.path && o.role !== 'guest')) continue; if (inWay(o.x - a.x, o.z - a.z, o.y)) { blocked = true; break; } }
        if (!blocked && player && !player.seated && inWay(player.x - a.x, player.z - a.z, player.y || 0)) blocked = true; }
      a.blockT = blocked ? (a.blockT || 0) + dt : 0;
      if (a.blockT > 1.5 && a.role === 'guest' && a.state === 'mill' && a.millTo) { a.blockT = 0; if (this.millBack(a, now)) return; }
      if (a.blockT > 2 && a.state === 'street' && a.leg) { a.blockT = 0; a.leg(); return; }   // v14 a stroller kept waiting goes somewhere else
      const ride = !!t.ride, sp = ride ? (a.state === 'guiding' ? 1.15 : 0.62) : blocked ? 0 : a.speed;   // the guide walks up the moving steps
      a.walkT = ride || blocked ? 0 : sp;   // v11: this sat at the end of the comment above, so every walker glided in its standing pose
      if (d < 0.08 || (d < sp * dt + 0.02)) { a.x = t.x; a.z = t.z; a.y = t.y ?? a.y; a.pi++; if (a.pi >= a.path.length) { const f = a.onArrive; a.path = null; a.onArrive = null; a.walkT = 0; f && f(); } }
      else { const k = sp * dt / d; a.x += dx * k; a.z += dz * k; const want = Math.atan2(dx, dz); a.yaw += adiff(want, a.yaw) * Math.min(1, dt * 8);
        const fy = ride ? null : this.world.floorY(a.x, a.z, a.y); if (ride) { const p0 = a.path[a.pi - 1] || t, u = 1 - d / (Math.hypot(t.x - p0.x, t.z - p0.z) || 1); a.y = p0.y + (t.y - p0.y) * clamp(u); } else a.y += (fy - a.y) * Math.min(1, dt * 12); }
      return;
    }
    a.walkT = 0;
    if (a.role === 'guest' && a.state === 'mill' && !a.talking && now > a.next) this.mill(a, now);   // lobby life: another spot now and then
  }
  draw(a, dt, d, player) {
    const ch = a.ch; ch.group.position.set(a.x, a.y, a.z); ch.group.rotation.y = a.yaw; ch.walkT = a.walkT || 0; ch.setLOD(d < (ch.lod === 0 ? 6.5 : 5.5) ? 0 : d < (ch.lod === 2 ? 13.5 : 14.5) ? 1 : 2);   /* v14d nearer LOD steps (skinned people were a third of the lobby's triangles), with 1 m of hysteresis */ ch.talking = a.talking || (this.now >= (a.talkFrom || 0) && this.now < a.talkUntil);
    if (a.viewer) { ch.s.sit = a.sit; const sp = this.seatPose(a.viewer.seat, a.rec); ch.s.drop = sp.drop; ch.s.recline = sp.recline + (a.reclineAmt || 0) * 0.6; }   // v14d another player's recline (mpui.js)
    else if (a.perch) { ch.s.sit = a.sit; ch.s.drop = a.perch.h - sitHeight(a.rec); ch.s.recline = 0.12; }   // v14 another player on a sofa or a bench (mpui.js)
    else ch.s.sit = 0;
    this._prop(a, ch); ch.gestT = this.now < a.gestUntil ? a.gest : a.item ? 'hold' : null;
    if (a.danceUntil && performance.now() < a.danceUntil && !a.viewer) { ch.walkT = 0; ch.danceT = 1; } else ch.danceT = 0;   // v14 the dance emote (mpui.js)
    // where they look: the screen when seated in a hall; you, briefly, when you come close and they face you; ahead otherwise
    let ly = 0, lp = 0, amt = 0;
    if (a.viewer && a.sit > 0.5 && this.now < a.chatUntil && a.chatWith && a.chatWith.alive) { const o = a.chatWith; ly = clamp(adiff(Math.atan2(o.x - a.x, o.z - a.z), a.yaw), -1.2, 1.2); lp = 0.05; amt = 0.95; }
    else if (a.viewer && a.sit > 0.5) { const H = a.viewer.hall.cfg, c = H.toWorld(0, 0), yawTo = Math.atan2(c.x - a.x, c.z - a.z); ly = adiff(yawTo, a.yaw); lp = -Math.atan2(H.y0 + H.centreY - (a.y + 1.1), Math.hypot(c.x - a.x, c.z - a.z)); amt = 0.85; }
    else if (a.glare && this.now < a.glare && !(a.viewer && a.sit > 0.5)) { const tx = a.glareAt ? a.glareAt.x : player.x, tz = a.glareAt ? a.glareAt.z : player.z, yawTo = Math.atan2(tx - a.x, tz - a.z); ly = clamp(adiff(yawTo, a.yaw), -1.5, 1.5); lp = 0; amt = 1;
      if (!a.path || a.state === 'mill') a.yaw += adiff(yawTo, a.yaw) * Math.min(1, dt * 2.2); if (this.now >= a.glare - 50) a.glareAt = null; }   // v14 turned on you (a bump) or toward a horn
    else if (player && d < 3.0 && (a.talkable || a.role === 'guest')) { const yawTo = Math.atan2(player.x - a.x, player.z - a.z), rel = adiff(yawTo, a.yaw); if (Math.abs(rel) < 1.6) { ly = rel; lp = -Math.atan2((player.y || 0) + 1.6 - (a.y + 1.6), d) * 0.6; amt = a.talking ? 1 : 0.7; } }
    const L = a.look; L.yaw += (ly - L.yaw) * Math.min(1, dt * 3.5); L.pitch += (lp - L.pitch) * Math.min(1, dt * 3.5); L.amt += (amt - L.amt) * Math.min(1, dt * 2.5); ch.s.lookYaw = L.yaw; ch.s.lookPitch = L.pitch; ch.s.lookAmt = L.amt;
    a.lightT -= dt; if (a.lightT <= 0) { a.lightT = 0.3; const want = this.lightAt(a.x, a.y + 1.2, a.z, a._lw || (a._lw = { amb: new THREE.Color(), key: new THREE.Color(), dir: new THREE.Vector3(), screen: new THREE.Color() })); a.lightWant = want; }   // v14b one light record per person (no garbage every 0.3 s)
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
// v14 the server's trolley (the user, 11-21: "the cart of the guy ... looked so bad"): tools/blender/props14.py service_cart, its parts in
// their own colours under the trolley's own light (lightAt where the server is); the handle at -Z, toward him
function ticketMesh() {
  const g = new THREE.Group(), part = (w, h, y, hex) => { const geo = new THREE.BoxGeometry(w, h, 0.002), n = geo.attributes.position.count, c = new Float32Array(n * 3), col = new THREE.Color(hex); for (let i = 0; i < n; i++) col.toArray(c, i * 3); geo.setAttribute('color', new THREE.BufferAttribute(c, 3)); const m = new THREE.Mesh(geo); m.position.y = y; g.add(m); };
  part(0.064, 0.1, 0.02, '#efe3c6'); part(0.064, 0.036, -0.05, '#8c1d24'); g.userData.setLevel = () => {}; return g;
}
function makeCart(mats, scene) {
  const U = { uAmb: { value: new THREE.Color(0.4, 0.4, 0.4) }, uKey: { value: new THREE.Color(0.3, 0.3, 0.3) }, uKeyDir: { value: new THREE.Vector3(0.2, 1, 0.3).normalize() }, uScreenL: { value: new THREE.Color(0, 0, 0) } }, mat = mats.propMat(U), grp = new THREE.Group(), A = ASSETS.service_cart;
  // v14d one draw for the whole trolley (it was one per part: 87 draws wherever the server walked)
  const geos = []; if (A) for (const p of A.parts) { if (p.lod !== 0 || p.leaf) continue; const g = p.geo.index ? p.geo.toNonIndexed() : p.geo.clone(), n = g.attributes.position.count, c = new Float32Array(n * 3), col = p.glow ? p.glowColor : p.tint;
    for (let i = 0; i < n; i++) c.set(col, i * 3); const o = new THREE.BufferGeometry(); o.setAttribute('position', g.attributes.position); o.setAttribute('normal', g.attributes.normal || g.computeVertexNormals() || g.attributes.normal); o.setAttribute('color', new THREE.BufferAttribute(c, 3)); geos.push(o); }
  if (geos.length) { let n = 0; for (const g of geos) n += g.attributes.position.count; const P = new Float32Array(n * 3), N = new Float32Array(n * 3), C = new Float32Array(n * 3); let k = 0;
    for (const g of geos) { const m = g.attributes.position.count; for (let i = 0; i < m; i++) { const j = (k + i) * 3; P[j] = g.attributes.position.getX(i); P[j + 1] = g.attributes.position.getY(i); P[j + 2] = g.attributes.position.getZ(i); N[j] = g.attributes.normal.getX(i); N[j + 1] = g.attributes.normal.getY(i); N[j + 2] = g.attributes.normal.getZ(i); C[j] = g.attributes.color.getX(i); C[j + 1] = g.attributes.color.getY(i); C[j + 2] = g.attributes.color.getZ(i); } k += m; }
    const all = new THREE.BufferGeometry(); all.setAttribute('position', new THREE.BufferAttribute(P, 3)); all.setAttribute('normal', new THREE.BufferAttribute(N, 3)); all.setAttribute('color', new THREE.BufferAttribute(C, 3)); all.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2)); grp.add(new THREE.Mesh(all, mat)); }
  grp.visible = false; scene.add(grp); const light = { amb: U.uAmb.value, key: U.uKey.value, dir: U.uKeyDir.value, screen: U.uScreenL.value };
  return { group: grp, t: 0, light };
}
function nearestOn(pts, a) { let bi = 0, bd = 1e9; pts.forEach((p, i) => { const d = Math.hypot(p.x - a.x, (p.y - a.y) * 2, p.z - a.z); if (d < bd) { bd = d; bi = i; } }); return bi; }
const HALL_ID = Object.fromEntries(Object.values(HALL).map((h) => [h.key, h.id]));
// where lobby guests stand, sit or queue (x, z)
const LOBBY_SPOTS = [[-12.6, 9.0], [-11.0, 9.4], [-12.8, -4.0], [-11.2, -3.6], [-4.6, 3.5], [2.2, -1.8], [-3.4, -2.6], [1.8, 4.0], [-6.5, 11.0], [6.6, 10.5], [4.5, 13.2], [-8.8, 1.2], [16.5, 3.0], [16.0, -4.5], [-8.0, -9.5], [3.0, -9.0], [11.0, 9.0], [-1.0, 8.5],
  [-13.8, 7.6], [-14.2, -5.2], [19.0, 6.5], [19.2, -0.5], [6.2, -2.8], [-7.0, -4.6], [5.4, 7.0], [-2.6, 12.6], [13.6, 5.2], [-16.0, 12.0], [7.8, -9.6], [-5.2, 15.0]];   // v9.3: queues, poster wall, windows
const IDLES = ['Idle_Loop', 'Idle_Loop', 'Idle_TalkingPhone_Loop', 'Idle_FoldArms_Loop', 'Idle_Talking_Loop'];   // what a waiting guest does with their hands
