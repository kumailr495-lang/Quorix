// LUMIERE v9 - the building, as data (docs/V9-DESIGN.md, section 4). One source for the Blender builder (tools/blender/arch reads it
// through tools/dev/export-spec.mjs), the engine (floors, colliders, doors, escalators, the lift) and the walkers (nav graph).
// Ground floor (G, y = 0): street, plaza, lobby (box office, concessions, lounge, ticket gate), restrooms, and the exit spine between
// the halls. First floor (L1): the mezzanine over the back of the lobby, the bridge and the two flank corridors to the halls' rear doors.
// One-way flow (v8 feedback F2-F6): in through the ticket gate, up the escalator, along the long dim corridor, in at the top of the hall;
// out at the bottom, beside the screen, into the bright spine with a travelator, straight back into the lobby. Entry doors only open
// inwards, exit doors only outwards, and nothing on L1 leads into the spine.
import { HALLS, makeHall, SCREEN_GAP, WALL } from './hallmath.js';
export const HALL = Object.fromEntries(HALLS.map((s) => [s.id, makeHall(s)]));
export const L1 = 4.662;   // the first floor (v9 it was the MAX hall's rake top; v14 the halls grew: every hall, MAX too, is lifted to it)
export const FACADE = 18, LOBBY = { x0: -22, x1: 22, z0: -14, z1: FACADE, ceil: 9.6 }, MEZZ = { z0: -14, z1: -7.4, void: { x0: 8.6, x1: 12.8, z0: -9.8, z1: -7.4 } };
// v12b the exit passages: a flight is PASS_W wide; the spine runs on past the last halls far enough to take the passages south of them
export const PASS_W = 1.4, EXIT_RISE = 0.172, EXIT_TREAD = 0.3;
// the spine is 4.5 m high under the bridge and the pantry (they are its roof) and 6.4 m south of zHi, where the exit passages open
export const SPINE = { x0: -4.2, x1: 4.2, z0: Math.min(HALL.CURVE.zc - HALL.CURVE.width / 2, HALL.X270.zc - HALL.X270.width / 2) - WALL - PASS_W, z1: -14, ceil: 4.5, zHi: -27.0, ceilHi: 6.4 };
const RO = (h) => h.xRear - 0.4 * h.dir;   // a hall's rear wall, outer face
export const BRIDGE = { x0: RO(HALL.MAX) - 6, x1: RO(HALL.CLASSIC) + 6, z0: -22, z1: -14, ceil: 4.2 };
// the flank corridors run behind the front halls' rear walls; a link leads from each to the rear hall's entrance (v9.1: from the halls' sizes)
const ENTRY_Z = (h) => h.zc + h.width / 2 - 1.3;
export const FLANK_W = { x0: BRIDGE.x0, x1: RO(HALL.MAX), z0: HALL.CURVE.zc + HALL.CURVE.width / 2, z1: -22 }, LINK_W = { x0: BRIDGE.x0, x1: RO(HALL.CURVE), z0: HALL.CURVE.zc + HALL.CURVE.width / 2 - 6.2, z1: HALL.CURVE.zc + HALL.CURVE.width / 2 };
export const PANTRY = { x0: -3.6, x1: 3.6, z0: -26.6, z1: -22 };
export const FLANK_E = { x0: RO(HALL.CLASSIC), x1: BRIDGE.x1, z0: ENTRY_Z(HALL.X270) - 3.5, z1: -22 }, LINK_E = { x0: RO(HALL.X270), x1: RO(HALL.CLASSIC), z0: ENTRY_Z(HALL.X270) - 1.9, z1: ENTRY_Z(HALL.X270) + 1.9 };
export const WC = { x0: 22, x1: 32, z0: -14, z1: 6, ceil: 3.4 };
export const STREET = { x0: -48, x1: 44, z0: FACADE, z1: 48, kerb: 26, road: [29.6, 36.6], far: 40 };
// moving things
export const ESC = {
  up: { x0: 8.9, x1: 10.5, zBot: 1.2, y0: 0, y1: L1, dir: -1, speed: 0.62, stepW: 1.0 },   // rises towards -z
  down: { x0: 10.9, x1: 12.5, zBot: 1.2, y0: 0, y1: L1, dir: -1, speed: 0.62, stepW: 1.0, reverse: true },
};
// escalator profile (EN 115): 30 deg, 1.2 m landing plates, 0.8 m flat steps at both ends, incline run = rise / tan 30
export function escProfile(e) {
  const run = (e.y1 - e.y0) / Math.tan(Math.PI / 6), a = e.zBot, b = a - 1.2 - 0.8, c = b - run, d = c - 0.8 - 1.2;
  return { plateBot: [a, a - 1.2], flatBot: [a - 1.2, b], incline: [b, c], flatTop: [c, c - 0.8], plateTop: [c - 0.8, d], zTop: d, run };
}
// v11 the core (the user: "make the escalator and the elevator area connected"): the lift stood at the back wall, 13 m down a side corridor
// from the gate. Now both escalators and the lift stand in one row behind the ticket gate and share one landing (EN 115 asks for 2.5 m
// clear beyond an escalator's newels; a lift landing wants 1.5 m square: the landing is 2.8 m deep). The lift is a glass tower beside the
// down escalator. On the ground floor its door faces the landing (face +1: the z1 end); on the first floor the car opens at its other end
// (face -1) onto a gallery that runs back beside the escalators to the mezzanine. x and z are the tower's clear inside; its side walls
// stand 0.15 m outside x0 and x1, the two door walls 0.15 m inside z0 and z1.
export const LIFT = { x0: 13.3, x1: 15.7, z0: -1.6, z1: 0.8, stops: [0, L1], face: [1, -1], speed: 1.0, doorW: 1.1 };
// v11 (the user, 2026-11-14: "make the escalator and the elevator area one and a separate area rather than it being so open"): the
// escalators and the lift stand in a hall of their own, walled from the floor to the ceiling, from the gate line back to the mezzanine.
// x: outer and inner faces of the west wall (inner 80 mm clear of the up escalator's handrail, EN 115) and of the east wall (inner face
// 50 mm into the lift tower's posts, which it embeds). z: the front wall's outer and inner faces, with the gates in its one portal; the
// west wall runs on to the mezzanine void's back edge (it is the void's side), the east wall to the mezzanine's edge (the gallery's end).
// The NW corner is a marble pier (it takes the place of the court column that stood there). docs/V11-RESEARCH.md section 1.
export const CORE = { x0: 7.95, xi0: 8.78, xi1: 15.80, x1: 16.10, z1: 4.15, zi1: 3.85, zWest: MEZZ.void.z0, zEast: MEZZ.z1, pier: { x: 8.1, z: 4.0, half: 0.42 }, portal: { x0: 8.9, x1: 12.5, h: 3.0 }, cabinet: { x0: 10.5, x1: 10.9 } };
export const GALLERY = { x0: MEZZ.void.x1, x1: CORE.xi1 + 0.05, z0: MEZZ.z1, z1: LIFT.z0 };   // first floor: the lift's rear door back to the mezzanine (its edge beam 5 cm into the hall's east wall)
export const TRAVELATOR = { x0: -0.8, x1: 0.8, z0: SPINE.z0 + 2.1, z1: -16.5, speed: 0.75 };   // carries you north (+z), towards the lobby
// v11 ticket zone: the landing the escalators and the lift share, inside the hall (CORE). The gate line at z, in the hall's portal: the
// usher's ticket leaf 'gate' in front of the up escalator, a gate cabinet, two free-exit half leaves 'exit' in front of the down
// escalator. Behind the landing the escalators' own trusses and the lift tower close it; a marble pier fills the gap between the down
// escalator and the tower. The usher's podium stands outside, beside the ticket leaf.
export const GATE = { z: 4.0, x0: CORE.xi0, x1: CORE.xi1, gate: [8.9, 10.5], exit: [10.9, 12.5], podium: { x: 6.8, z: 4.8 } };
export const ZONE = { x0: CORE.xi0, x1: CORE.xi1, z0: -1.7, z1: GATE.z };   // the landing, the escalators' feet and the lift car on the ground floor
// doors. oneWay: the side you can pass from. kind: slide (auto glass), pair (heavy double doors), push (exit doors with push bars)
export const DOORS = [
  { id: 'main', rooms: ['street', 'lobby'], kind: 'slide', axis: 'x', x: 0, z: FACADE, w: 4.0, h: 3.0, y: 0 },
  { id: 'wc', rooms: ['lobby', 'wc'], kind: 'open', axis: 'z', x: 22, z: -1.0, w: 2.2, h: 2.6, y: 0 },   // v14d the women's (the user, 11-26: "washrooms not separated")
  { id: 'wcM', rooms: ['lobby', 'wc'], kind: 'open', axis: 'z', x: 22, z: -7.0, w: 1.6, h: 2.6, y: 0 },   // v14d the men's: its own door, its own half of the vestibule
  { id: 'spineOut', rooms: ['spine', 'lobby'], kind: 'pair', axis: 'x', x: 0, z: -14, w: 3.2, h: 3.0, y: 0 },
  { id: 'mezzPortal', rooms: ['lobby', 'corridor'], kind: 'open', axis: 'x', x: 10.2, z: -14, w: 5.6, h: 3.4, y: L1 },
];
// every hall: the front floor is lifted so its rear aisle is level with L1 (no stairs on the way in); the rear entry door at L1 (in only).
// v12b (the user, 11-18: "move the exit door to not on the front of the screen and then cover that area with screens"): two exit doors in
// the side walls at the front (out only), in front of the screen's edge, each onto an exit passage outside the wall. The passage keeps the
// hall's front floor level at the door, steps down inside itself towards the spine (a flight PASS_W wide along the hall's wall) and opens
// into the spine at ground level; two halls side by side share the passage between them, each with its own flight on its own side. The
// door stands far enough back from the screen wall for its flight to end 1 m short of the spine.
export const EXIT_PASSAGES = [];
const H_ = Object.values(HALL);
for (const h of H_) {
  h.y0 = Math.round((L1 - h.total) * 1000) / 1000;
  const e = h.toWorld(h.entryU, h.depthIn);
  DOORS.push({ id: h.id + 'In', rooms: ['corridor', h.key], kind: 'pair', axis: 'z', x: h.xRear - 0.2 * h.dir, z: e.z, w: 1.9, h: 2.5, y: L1, oneWay: 'corridor', hall: h.id, from: 0, swing: h.dir });   // v14b both ways
  const n = h.y0 > 0.02 ? Math.ceil(h.y0 / EXIT_RISE - 1e-6) : 0, edge = Math.max(0, h.screenD(h.W / 2));
  const d0 = Math.round(Math.max(edge + 0.6, n * EXIT_TREAD + 0.4 - (SCREEN_GAP + WALL) + 1.0) * 100) / 100;
  // one exit per side wall: sg -1 the wall at u = -width/2, +1 at +width/2; the door spans d0 .. d0 + 1.8 along the wall
  h.exits = [-1, 1].map((sg, i) => {
    const c = h.toWorld(sg * (h.width / 2 + WALL / 2), d0 + 0.9), id = h.id + 'Out' + i, zSide = Math.sign(c.z - h.zc);
    DOORS.push({ id, rooms: [h.key, 'spine'], kind: 'push', axis: 'x', x: c.x, z: c.z, w: 1.8, h: 2.4, y: h.y0, oneWay: h.key, hall: h.id, from: -zSide });
    return { sg, u: sg * (h.width / 2), d0, d1: d0 + 1.8, door: id, zSide, n, rise: n ? h.y0 / n : 0 };
  });
}
// the passages, per side of the spine from north to south: north of the first hall, between each two, south of the last
for (const side of [-1, 1]) {
  const hs = H_.filter((h) => h.side === side).sort((a, b) => b.zc - a.zc), xs = side < 0 ? SPINE.x0 : SPINE.x1, zN = (h) => h.zc + h.width / 2 + WALL, zS = (h) => h.zc - h.width / 2 - WALL;
  const spans = [{ z0: zN(hs[0]), z1: zN(hs[0]) + PASS_W, s: hs[0], n: null }];
  for (let i = 0; i + 1 < hs.length; i++) spans.push({ z0: zN(hs[i + 1]), z1: zS(hs[i]), n: hs[i], s: hs[i + 1] });
  spans.push({ z0: zS(hs[hs.length - 1]) - PASS_W, z1: zS(hs[hs.length - 1]), n: hs[hs.length - 1], s: null });
  for (const sp of spans) {
    const flights = [], toSpine = side < 0 ? 1 : -1;   // the way down: towards the spine along x
    for (const [h, zSide] of [[sp.n, -1], [sp.s, 1]]) {   // the hall north of the passage opens on its south wall (zSide -1), the one south on its north wall
      if (!h) continue; const ex = h.exits.find((q) => q.zSide === zSide), dTop = ex.d0 - 0.4, w = h.toWorld(0, dTop);
      const za = zSide < 0 ? sp.z1 - PASS_W : sp.z0, zb = za + PASS_W;   // the flight runs along its hall's wall
      flights.push({ hall: h.id, door: ex.door, z0: za, z1: zb, zWall: zSide < 0 ? sp.z1 : sp.z0, xTop: w.x, xDoor: h.toWorld(0, ex.d0 + 0.9).x, xFar: h.toWorld(0, ex.d1 + 0.3).x, dir: toSpine, n: ex.n, rise: ex.rise, tread: EXIT_TREAD, y0: h.y0 });
    }
    const far = side < 0 ? Math.min(...flights.map((f) => f.xFar)) : Math.max(...flights.map((f) => f.xFar)), top = Math.max(...flights.map((f) => f.y0));
    const under = sp.z1 > BRIDGE.z0 - 0.5;   // north of the first halls the passage runs under the bridge: its ceiling stays under the bridge's slab
    EXIT_PASSAGES.push({ id: (side < 0 ? 'W' : 'E') + EXIT_PASSAGES.filter((p) => p.side === side).length, side, x0: Math.min(xs, far), x1: Math.max(xs, far), xSpine: xs, z0: sp.z0, z1: sp.z1,
      ceil: Math.round(Math.min(under ? L1 - 0.45 : 99, Math.max(3.2, top + 2.9)) * 100) / 100, flights });
  }
}
// v14e the private screens (the user, 11-27: "the home should be in theatre as you can rent it and you should not be able to edit it ...
// there should be home, jungle, winter, drive in, space"; "the home is not in the main theatre rather it teleports you there"). A wing
// reached from the lobby by its own lift: two identical enclosed cars, the lobby's and the wing's; you ride one with its doors shut and
// step out of the other (private.js), so the wing can stand apart from the building like the floor a real lift takes you to. Five
// screening rooms open off its lounge, each a show hall of its own (film9: your videos, songs, links, house films), rented for your visit.
// Each room's picture is a plane across z at screen.x, like the big halls' (f = +1: the room lies to -x of it, -1: to +x).
export const VIP = { x0: 200, x1: 224, z0: -20, z1: 0, ceil: 4.2, pod: { x: 212, z: -2.3, yaw: 0, r: 1.25 }, lobbyPod: { x: 20.15, z: 15.6, yaw: -Math.PI / 2, r: 1.25 } };
export const PRIVATE = [
  { id: 'HOME', key: 'pvHome', theme: 'home', name: 'HOME', price: 400, x0: 185, x1: 200, z0: -10, z1: 0, ceil: 4.6, f: -1, screen: { x: 185.65, zc: -5, W: 7.2, H: 3.5, hB: 0.9 }, riser: { d0: 8.4, d1: 11.4, y: 0.28 }, door: { x: 200, z: -5, w: 1.8 } },
  { id: 'JUNGLE', key: 'pvJungle', theme: 'jungle', name: 'JUNGLE', price: 450, x0: 185, x1: 200, z0: -20, z1: -10, ceil: 5.2, f: -1, screen: { x: 185.65, zc: -15, W: 7.2, H: 3.5, hB: 1.0 }, riser: { d0: 8.4, d1: 11.4, y: 0.28 }, door: { x: 200, z: -15, w: 1.8 } },
  { id: 'WINTER', key: 'pvWinter', theme: 'winter', name: 'WINTER', price: 450, x0: 224, x1: 239, z0: -10, z1: 0, ceil: 4.8, f: 1, screen: { x: 238.35, zc: -5, W: 7.2, H: 3.5, hB: 0.9 }, riser: { d0: 8.4, d1: 11.4, y: 0.28 }, door: { x: 224, z: -5, w: 1.8 } },
  { id: 'SPACE', key: 'pvSpace', theme: 'space', name: 'SPACE', price: 500, x0: 224, x1: 239, z0: -20, z1: -10, ceil: 5.0, f: 1, screen: { x: 238.35, zc: -15, W: 7.2, H: 3.5, hB: 1.0 }, riser: { d0: 8.4, d1: 11.4, y: 0.28 }, door: { x: 224, z: -15, w: 1.8 } },
  { id: 'DRIVE', key: 'pvDrive', theme: 'drive', name: 'DRIVE-IN', price: 500, x0: 194, x1: 230, z0: -48, z1: -20, ceil: 11.0, f: -1, screen: { x: 195.4, zc: -34, W: 17.0, H: 7.6, hB: 1.8 }, riser: null, door: { x: 222, z: -20, w: 2.4 } },
];
// v14e (the user, 11-28: "the rooms ... should be at the same places the other ones are, in corridors"): no lift. The wing stands behind
// the halls at the spine's far end, walked to through the spine (its lobby door opens both ways now; the halls' exits still only open
// out). The numbers above are the wing's own plan; WING moves it there as one block, its lounge's front against the spine's end wall.
export const WING = { dx: -212, dz: SPINE.z0 - 0.4 };
for (const o of [VIP, ...PRIVATE]) { o.x0 += WING.dx; o.x1 += WING.dx; o.z0 += WING.dz; o.z1 += WING.dz; if (o.screen) { o.screen.x += WING.dx; o.screen.zc += WING.dz; } if (o.door) { o.door.x += WING.dx; o.door.z += WING.dz; } }
VIP.pod.x += WING.dx; VIP.pod.z += WING.dz;
export const PRIVATE_BY_ID = Object.fromEntries(PRIVATE.map((p) => [p.id, p]));
// their doors on the lounge's walls: a pair of leaves each, locked until you rent the room (private.js opens them for you then)
for (const p of PRIVATE) DOORS.push({ id: 'pv' + p.id, rooms: ['vip', p.key], kind: 'pair', axis: p.theme === 'drive' ? 'x' : 'z', x: p.door.x, z: p.door.z, w: p.door.w, h: 2.5, y: 0, priv: p.id });
// v14e the wing's door from the spine: automatic glass in the spine's end wall, the lounge's front
DOORS.push({ id: 'pvEntry', rooms: ['spine', 'vip'], kind: 'slide', axis: 'x', x: VIP.pod.x, z: VIP.z1, w: 2.2, h: 2.7, y: 0 });
// a private room's own frame, as a hall's: u across the picture (to the viewer's right), d from the picture plane into the room
for (const p of PRIVATE) { const f = p.f; p.toWorld = (u, d) => ({ x: p.screen.x - f * d, z: p.screen.zc + f * u }); p.toLocal = (x, z) => ({ u: (z - p.screen.zc) * f, d: (p.screen.x - x) * f }); p.depth = Math.abs((f > 0 ? p.x0 : p.x1) - p.screen.x); }
// rooms: kind drives the Blender builder; level = the lowest floor in it; vis = rooms drawn when you are in it (portal culling)
export const ROOMS = {
  street: { kind: 'street', level: 0, rect: [STREET.x0, STREET.z0, STREET.x1, STREET.z1], outdoor: true, vis: ['lobby'] },
  lobby: { kind: 'lobby', level: 0, rect: [LOBBY.x0, LOBBY.z0, LOBBY.x1, LOBBY.z1], ceil: LOBBY.ceil, vis: ['street', 'wc', 'corridor', 'spine'] },
  wc: { kind: 'wc', level: 0, rect: [WC.x0, WC.z0, WC.x1, WC.z1], ceil: WC.ceil, vis: ['lobby'] },
  corridor: { kind: 'corridor', level: L1, rect: [BRIDGE.x0, LINK_W.z0, BRIDGE.x1, BRIDGE.z1], ceil: L1 + 4.2, vis: ['lobby', 'hallMax', 'hallCurve', 'hallClassic', 'hall270'] },
  vip: { kind: 'vip', level: 0, rect: [VIP.x0, VIP.z0, VIP.x1, VIP.z1], ceil: VIP.ceil, vis: [...PRIVATE.map((p) => p.key), 'spine'] },
  spine: { kind: 'spine', level: 0, rect: [SPINE.x0, SPINE.z0, SPINE.x1, SPINE.z1], ceil: SPINE.ceil, vis: ['lobby', 'hallMax', 'hallCurve', 'hallClassic', 'hall270', 'vip'] },
};
for (const p of PRIVATE) ROOMS[p.key] = { kind: 'private', pid: p.id, level: 0, rect: [p.x0, p.z0, p.x1, p.z1], ceil: p.ceil, vis: ['vip'] };
for (const h of Object.values(HALL)) {
  const a = h.toWorld(-h.width / 2, -1.25), b = h.toWorld(h.width / 2, h.depthIn);
  ROOMS[h.key] = { kind: 'hall', hall: h.id, level: h.y0, rect: [Math.min(a.x, b.x), Math.min(a.z, b.z), Math.max(a.x, b.x), Math.max(a.z, b.z)], ceil: h.ceil, vis: ['corridor', 'spine'] };
}
// staff posts and spawn points (world x, y, z, yaw: three.js rotation about +y, 0 = facing -z)
export const POSTS = {
  greeter: { x: 3.2, y: 0, z: 14.6, yaw: 0.6, room: 'lobby' },
  reception: { x: -15.2, y: 0, z: 9.0, yaw: -Math.PI / 2, room: 'lobby' },
  vendor: { x: -15.4, y: 0, z: -6.0, yaw: -Math.PI / 2, room: 'lobby' },
  vendor2: { x: -15.4, y: 0, z: -2.4, yaw: -Math.PI / 2, room: 'lobby' },
  usher: { x: 6.8, y: 0, z: 5.6, yaw: Math.PI, room: 'lobby' },
  server: { x: -1.3, y: L1, z: -25.4, yaw: 0, room: 'corridor' },   // the service pantry (a niche off the bridge, over the spine): he and the cart wait at its back (v14b: out of the bridge's way)
  driver: { x: -6.0, y: 0, z: 27.8, yaw: Math.PI / 2, room: 'street' },
};
export const SPAWN = { quick: { x: -2, y: 0, z: 9, yaw: 0, room: 'lobby' }, kerb: { x: -6.0, y: 0, z: 25.4, yaw: Math.PI, room: 'street' } };
// counters and fixed furniture the engine needs to know about (the meshes are part of the room models)
export const COUNTERS = {
  boxOffice: { x0: -20.4, x1: -16.6, z0: 4.0, z1: 14.0, top: 1.08, queue: { x: -12.6, z: 9.0 } },
  concessions: { x0: -20.4, x1: -16.6, z0: -9.0, z1: 1.2, top: 1.0, queue: { x: -12.8, z: -4.0 } },
};
// nav graph for walkers: named nodes (world), edges walked straight; halls add their own seat routes (hallmath.seatRoute)
export const NAV = {
  nodes: {
    // v10: the fountain stands on the brand ring (0, 10) on the entrance axis; walkers part round it (foyerW, foyerE)
    kerb: [-2.0, 0, 25.65], plaza: [0, 0, 21.0], doorOut: [0, 0, 19.4], doorIn: [0, 0, 16.6], greet: [2.2, 0, 13.0], foyer: [0, 0, 13.6], foyerW: [-3.2, 0, 10.0], foyerE: [3.2, 0, 10.0],
    boxQ: [-12.6, 0, 9.0], boxQ2: [-10.6, 0, 9.0], conQ: [-12.8, 0, -4.0], conQ2: [-10.8, 0, -4.0],
    // v9.1: four nodes round the middle of the lobby (v11: the lounge moved to the front-east corner; the middle is open floor, so the
    // nodes are also joined straight across it)
    lounge: [-7.0, 0, 1.0], loungeN: [-1.0, 0, 7.0], lounge2: [5.0, 0, 1.0], loungeS: [-1.0, 0, -5.0],
    wcDoor: [20.6, 0, -1.0], wcIn: [23.6, 0, -1.0], wcM: [27.0, 0, -9.0], wcF: [27.0, 0, 1.0], wcMid: [19.8, 0, -4.0], wcDoorM: [20.6, 0, -7.0], wcInM: [23.3, 0, -7.0], wcMg: [24.6, 0, -5.9], wcFg: [24.6, 0, -2.1],
    // v11: walkers cross the lobby in front of the gate line (z 4.0), not through it. Inside the zone: the ticket leaf, the landing, the
    // escalators' feet and the lift's door (liftG); the exit leaves are in front of the down escalator (exitIn). On the first floor the
    // lift opens onto the gallery (liftL1), which meets the mezzanine at galS; galB rounds the escalator void's corner
    gateW: [6.2, 0, 6.6], downOut: [11.7, 0, 5.2], east: [14.5, 0, 5.4], eastC: [18.2, 0, 5.0], exitIn: [11.7, 0, 2.8], liftLob: [14.5, 0, 2.8], flankW3: [BRIDGE.x0 + 3, L1, (LINK_W.z0 + LINK_W.z1) / 2],
    gate: [9.7, 0, 5.4], gateIn: [9.7, 0, 2.8], escBot: [9.7, 0, 0.4], escTop: [9.7, L1, -12.6], mezz: [9.7, L1, -11.6],
    downTop: [11.7, L1, -12.6], downBot: [11.7, 0, 0.6], liftG: [14.5, 0, 1.6], liftL1: [14.5, L1, -2.6], galS: [14.5, L1, -8.4], galB: [13.6, L1, -11.6],
    portal: [10.2, L1, -15.2], bridgeE: [BRIDGE.x1 - 3, L1, -18.0], bridgeW: [BRIDGE.x0 + 3, L1, -18.0], bridgeC: [0, L1, -18.0], pantry: [0, L1, -23.0],
    flankW1: [BRIDGE.x0 + 3, L1, -24.0], flankW2: [BRIDGE.x0 + 3, L1, FLANK_W.z0 + 2.2], linkW: [BRIDGE.x0 + 9, L1, (LINK_W.z0 + LINK_W.z1) / 2], flankE1: [BRIDGE.x1 - 3, L1, -24.0], flankE2: [BRIDGE.x1 - 3, L1, ENTRY_Z(HALL.X270)],
    spineN: [0, 0, -15.6], spineS: [0, 0, SPINE.z0 + 1.6], lobbyBack: [0, 0, -12.0],
  },
  edges: [['kerb', 'plaza'], ['plaza', 'doorOut'], ['doorOut', 'doorIn'], ['doorIn', 'greet'], ['doorIn', 'foyer'], ['greet', 'foyer'], ['foyer', 'boxQ2'], ['boxQ2', 'boxQ'],
    ['foyer', 'foyerW'], ['foyerW', 'loungeN'], ['foyer', 'foyerE'], ['foyerE', 'lounge2'], ['loungeN', 'lounge'], ['loungeN', 'lounge2'], ['lounge', 'loungeS'], ['loungeS', 'lounge2'], ['loungeN', 'loungeS'], ['lounge', 'lounge2'], ['lounge', 'conQ2'], ['conQ2', 'conQ'],
    ['east', 'eastC'], ['eastC', 'wcDoor'], ['wcDoor', 'wcIn'], ['wcDoor', 'wcMid'], ['wcMid', 'wcDoorM'], ['wcDoorM', 'wcInM'], ['wcInM', 'wcMg'], ['wcMg', 'wcM'], ['wcIn', 'wcFg'], ['wcFg', 'wcF'],
    ['lounge2', 'gateW'], ['gateW', 'gate'], ['foyer', 'gate'], ['gate', 'gateIn'], ['gateIn', 'escBot'], ['escBot', 'escTop'], ['escTop', 'mezz'], ['mezz', 'portal'], ['mezz', 'downTop'],
    ['downTop', 'downBot'], ['downBot', 'downOut'], ['downOut', 'gate'], ['downOut', 'east'], ['gate', 'east'], ['gateIn', 'exitIn'], ['exitIn', 'liftLob'], ['liftLob', 'liftG'], ['exitIn', 'downOut'], ['liftG', 'liftL1'],
    ['liftL1', 'galS'], ['galS', 'galB'], ['galB', 'mezz'], ['galB', 'portal'], ['portal', 'bridgeC'], ['portal', 'bridgeE'],
    ['bridgeC', 'pantry'], ['bridgeC', 'bridgeW'], ['bridgeW', 'flankW1'], ['flankW1', 'flankW2'], ['flankW2', 'flankW3'], ['flankW3', 'linkW'], ['bridgeE', 'flankE1'], ['flankE1', 'flankE2'],
    ['lobbyBack', 'loungeS'], ['spineN', 'lobbyBack'], ['spineS', 'spineN']],
  // directed edges (one-way): walkers may only use them in this direction
  oneWay: [['escBot', 'escTop'], ['downTop', 'downBot'], ['downBot', 'downOut'], ['spineN', 'lobbyBack'], ['spineS', 'spineN'], ['gate', 'gateIn'], ['exitIn', 'downOut']],
};
// palettes (3-4 colours each, with their dim variants; docs/V9-DESIGN.md section 5). Linear-ish hex as authored in sRGB.
export const PALETTE = {
  brand: { ink: '#14162e', gold: '#e3b25f', ivory: '#f2ebdd', ember: '#b8452f' },
  lobby: { stone: '#cdbfa8', charcoal: '#1f1d22', champagne: '#c9a66b', velvet: '#5e1c2a' },
  corridor: { indigo: '#161a3c', black: '#0b0b12', gold: '#e3b25f', smoke: '#3a3d55', red: '#ff1a2e', white: '#f4f6ff', charcoal: '#121214', bronze: '#4a382c', bronze2: '#2a1f18' },
  spine: { oak: '#c49a6c', white: '#ece6dc', green: '#2bb673', concrete: '#7d7a76' },
  MAX: { black: '#0b0d12', blueBlack: '#121826', blue: '#2f7cff', walnut: '#5b3a24' },
  CURVE: { navy: '#141b33', cognac: '#7a3f1d', champagne: '#c9a86a', warm: '#ffd59e' },
  CLASSIC: { burgundy: '#5a1a24', charcoal: '#1c1c21', brass: '#b08d57', cream: '#e6d9c2' },
  X270: { graphite: '#1f2227', panel: '#9a9da3', teal: '#1f8a8a', coral: '#b8513a' },
  facade: { bronze: '#3b2f25', sandstone: '#b9a68a', gold: '#c9a35e', glass: '#1d2a33' },
};
