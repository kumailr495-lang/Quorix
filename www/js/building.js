// LUMIERE v9 - the building, as data (docs/V9-DESIGN.md, section 4). One source for the Blender builder (tools/blender/arch reads it
// through tools/dev/export-spec.mjs), the engine (floors, colliders, doors, escalators, the lift) and the walkers (nav graph).
// Ground floor (G, y = 0): street, plaza, lobby (box office, concessions, lounge, ticket gate), restrooms, and the exit spine between
// the halls. First floor (L1): the mezzanine over the back of the lobby, the bridge and the two flank corridors to the halls' rear doors.
// One-way flow (v8 feedback F2-F6): in through the ticket gate, up the escalator, along the long dim corridor, in at the top of the hall;
// out at the bottom, beside the screen, into the bright spine with a travelator, straight back into the lobby. Entry doors only open
// inwards, exit doors only outwards, and nothing on L1 leads into the spine.
import { HALLS, makeHall } from './hallmath.js';
export const HALL = Object.fromEntries(HALLS.map((s) => [s.id, makeHall(s)]));
export const L1 = HALL.MAX.total;   // the first floor = the MAX hall's rear aisle (its rake top)
export const FACADE = 18, LOBBY = { x0: -22, x1: 22, z0: -14, z1: FACADE, ceil: 9.6 }, MEZZ = { z0: -14, z1: -7.4, void: { x0: 8.6, x1: 12.8, z0: -9.8, z1: -7.4 } };
// the spine is 4.5 m high under the bridge and the pantry (they are its roof) and 6.4 m south of zHi, where the raised halls' exit doors open
export const SPINE = { x0: -4.2, x1: 4.2, z0: -72.6, z1: -14, ceil: 4.5, zHi: -27.0, ceilHi: 6.4 };
const RO = (h) => h.xRear - 0.4 * h.dir;   // a hall's rear wall, outer face
export const BRIDGE = { x0: RO(HALL.MAX) - 6, x1: RO(HALL.CLASSIC) + 6, z0: -22, z1: -14, ceil: 4.2 };
export const FLANK_W = { x0: BRIDGE.x0, x1: RO(HALL.MAX), z0: -50.2, z1: -22 }, LINK_W = { x0: BRIDGE.x0, x1: RO(HALL.CURVE), z0: -56.4, z1: -50.2 };
export const PANTRY = { x0: -3.6, x1: 3.6, z0: -26.6, z1: -22 };
export const FLANK_E = { x0: RO(HALL.CLASSIC), x1: BRIDGE.x1, z0: -46.6, z1: -22 }, LINK_E = { x0: RO(HALL.X270), x1: RO(HALL.CLASSIC), z0: -45.0, z1: -41.2 };
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
export const LIFT = { x0: 13.4, x1: 15.8, z0: -12.6, z1: -10.2, doorZ: -10.2, stops: [0, L1], speed: 1.0, doorW: 1.1 };
export const TRAVELATOR = { x0: -0.8, x1: 0.8, z0: -70.5, z1: -16.5, speed: 0.75 };   // carries you north (+z), towards the lobby
// ticket gate at the foot of the up escalator: glass panels, one gate leaf, the usher's podium
export const GATE = { z: 3.2, x0: 7.4, x1: 10.7, gate: [8.9, 10.5], podium: { x: 7.0, z: 3.9 }, sides: [[8.7, 1.4], [10.7, 1.4]] };   // the down escalator lands outside the gate
// doors. oneWay: the side you can pass from. kind: slide (auto glass), pair (heavy double doors), push (exit doors with push bars)
export const DOORS = [
  { id: 'main', rooms: ['street', 'lobby'], kind: 'slide', axis: 'x', x: 0, z: FACADE, w: 4.0, h: 3.0, y: 0 },
  { id: 'wc', rooms: ['lobby', 'wc'], kind: 'open', axis: 'z', x: 22, z: -1.0, w: 2.2, h: 2.6, y: 0 },
  { id: 'spineOut', rooms: ['spine', 'lobby'], kind: 'pair', axis: 'x', x: 0, z: -14, w: 3.2, h: 3.0, y: 0, oneWay: 'spine' },
  { id: 'mezzPortal', rooms: ['lobby', 'corridor'], kind: 'open', axis: 'x', x: 10.2, z: -14, w: 5.6, h: 3.4, y: L1 },
];
// every hall: the front floor is lifted so its rear aisle is level with L1 (no stairs on the way in); the rear entry door at L1 (in only);
// two exit doors in the screen wall at the front corners (out only), each onto a landing in the spine with a stair down to G along the
// spine wall, running towards the hall's centre line so it never passes another hall's door
export const EXIT_STAIRS = [];
for (const h of Object.values(HALL)) {
  h.y0 = Math.round((L1 - h.total) * 1000) / 1000;
  const e = h.toWorld(h.entryU, h.depthIn);
  DOORS.push({ id: h.id + 'In', rooms: ['corridor', h.key], kind: 'pair', axis: 'z', x: h.xRear - 0.2 * h.dir, z: e.z, w: 1.9, h: 2.5, y: L1, oneWay: 'corridor', hall: h.id });
  h.exits.forEach((x, i) => {
    const w = h.toWorld(x.u, 0), id = h.id + 'Out' + i;
    DOORS.push({ id, rooms: [h.key, 'spine'], kind: 'push', axis: 'z', x: h.xScreenWall + 0.2 * h.dir, z: w.z, w: 1.8, h: 2.4, y: h.y0, oneWay: h.key, hall: h.id });
    if (h.y0 > 0.02) {
      const n = Math.ceil(h.y0 / 0.172 - 1e-6), toC = Math.sign(h.zc - w.z), wallX = h.side < 0 ? SPINE.x0 : SPINE.x1, inX = -Math.sign(wallX);
      EXIT_STAIRS.push({ door: id, hall: h.id, x0: wallX, x1: wallX + inX * 1.7, zDoor: w.z, landing: 1.7, dir: toC, n, rise: h.y0 / n, tread: 0.3, y0: h.y0,
        zTop: w.z + toC * 0.85, zBot: w.z + toC * (0.85 + n * 0.3) });
    }
  });
}
// rooms: kind drives the Blender builder; level = the lowest floor in it; vis = rooms drawn when you are in it (portal culling)
export const ROOMS = {
  street: { kind: 'street', level: 0, rect: [STREET.x0, STREET.z0, STREET.x1, STREET.z1], outdoor: true, vis: ['lobby'] },
  lobby: { kind: 'lobby', level: 0, rect: [LOBBY.x0, LOBBY.z0, LOBBY.x1, LOBBY.z1], ceil: LOBBY.ceil, vis: ['street', 'wc', 'corridor', 'spine'] },
  wc: { kind: 'wc', level: 0, rect: [WC.x0, WC.z0, WC.x1, WC.z1], ceil: WC.ceil, vis: ['lobby'] },
  corridor: { kind: 'corridor', level: L1, rect: [BRIDGE.x0, LINK_W.z0, BRIDGE.x1, BRIDGE.z1], ceil: L1 + 4.2, vis: ['lobby', 'hallMax', 'hallCurve', 'hallClassic', 'hall270'] },
  spine: { kind: 'spine', level: 0, rect: [SPINE.x0, SPINE.z0, SPINE.x1, SPINE.z1], ceil: SPINE.ceil, vis: ['lobby', 'hallMax', 'hallCurve', 'hallClassic', 'hall270'] },
};
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
  usher: { x: 7.0, y: 0, z: 4.6, yaw: Math.PI, room: 'lobby' },
  server: { x: 0, y: L1, z: -23.6, yaw: 0, room: 'corridor' },   // the service pantry (a niche off the bridge, over the spine): the cart waits here
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
    kerb: [-4.0, 0, 25.0], plaza: [0, 0, 21.0], doorOut: [0, 0, 19.4], doorIn: [0, 0, 16.6], greet: [2.2, 0, 13.0], foyer: [0, 0, 9.0],
    boxQ: [-12.6, 0, 9.0], boxQ2: [-10.6, 0, 9.0], conQ: [-12.8, 0, -4.0], conQ2: [-10.8, 0, -4.0], lounge: [-3.0, 0, 2.0], lounge2: [3.6, 0, -1.0],
    wcDoor: [20.6, 0, -1.0], wcIn: [23.6, 0, -1.0], wcM: [27.0, 0, -9.0], wcF: [27.0, 0, 1.0],
    gate: [9.7, 0, 4.6], gateIn: [9.7, 0, 2.2], escBot: [9.7, 0, 0.4], escTop: [9.7, L1, -12.6], mezz: [9.7, L1, -11.6],
    downTop: [11.7, L1, -12.6], downBot: [11.7, 0, 0.6], liftG: [14.6, 0, -9.2], liftL1: [14.6, L1, -9.2],
    portal: [10.2, L1, -15.2], bridgeE: [BRIDGE.x1 - 3, L1, -18.0], bridgeW: [BRIDGE.x0 + 3, L1, -18.0], bridgeC: [0, L1, -18.0], pantry: [0, L1, -23.0],
    flankW1: [BRIDGE.x0 + 3, L1, -24.0], flankW2: [BRIDGE.x0 + 3, L1, -48.0], linkW: [BRIDGE.x0 + 9, L1, -53.2], flankE1: [BRIDGE.x1 - 3, L1, -24.0], flankE2: [BRIDGE.x1 - 3, L1, -43.1],
    spineN: [0, 0, -15.6], spineS: [0, 0, -71.0], lobbyBack: [0, 0, -12.0],
  },
  edges: [['kerb', 'plaza'], ['plaza', 'doorOut'], ['doorOut', 'doorIn'], ['doorIn', 'greet'], ['doorIn', 'foyer'], ['greet', 'foyer'], ['foyer', 'boxQ2'], ['boxQ2', 'boxQ'],
    ['foyer', 'lounge'], ['lounge', 'lounge2'], ['lounge', 'conQ2'], ['conQ2', 'conQ'], ['lounge2', 'wcDoor'], ['wcDoor', 'wcIn'], ['wcIn', 'wcM'], ['wcIn', 'wcF'],
    ['lounge2', 'gate'], ['foyer', 'gate'], ['gate', 'gateIn'], ['gateIn', 'escBot'], ['escBot', 'escTop'], ['escTop', 'mezz'], ['mezz', 'portal'], ['mezz', 'downTop'],
    ['downTop', 'downBot'], ['downBot', 'lounge2'], ['lounge2', 'liftG'], ['liftG', 'liftL1'], ['liftL1', 'mezz'], ['portal', 'bridgeC'], ['portal', 'bridgeE'],
    ['bridgeC', 'pantry'], ['bridgeC', 'bridgeW'], ['bridgeW', 'flankW1'], ['flankW1', 'flankW2'], ['flankW2', 'linkW'], ['bridgeE', 'flankE1'], ['flankE1', 'flankE2'],
    ['lobbyBack', 'lounge'], ['lobbyBack', 'lounge2'], ['spineN', 'lobbyBack'], ['spineS', 'spineN']],
  // directed edges (one-way): walkers may only use them in this direction
  oneWay: [['escBot', 'escTop'], ['downTop', 'downBot'], ['spineN', 'lobbyBack'], ['spineS', 'spineN'], ['gate', 'gateIn']],
};
// palettes (3-4 colours each, with their dim variants; docs/V9-DESIGN.md section 5). Linear-ish hex as authored in sRGB.
export const PALETTE = {
  brand: { ink: '#14162e', gold: '#e3b25f', ivory: '#f2ebdd', ember: '#b8452f' },
  lobby: { stone: '#cdbfa8', charcoal: '#1f1d22', champagne: '#c9a66b', velvet: '#5e1c2a' },
  corridor: { indigo: '#161a3c', black: '#0b0b12', gold: '#e3b25f', smoke: '#3a3d55' },
  spine: { oak: '#c49a6c', white: '#ece6dc', green: '#2bb673', concrete: '#7d7a76' },
  MAX: { black: '#0b0d12', blueBlack: '#121826', blue: '#2f7cff', walnut: '#5b3a24' },
  CURVE: { navy: '#141b33', cognac: '#7a3f1d', champagne: '#c9a86a', warm: '#ffd59e' },
  CLASSIC: { burgundy: '#5a1a24', charcoal: '#1c1c21', brass: '#b08d57', cream: '#e6d9c2' },
  X270: { graphite: '#1f2227', panel: '#9a9da3', teal: '#1f8a8a', coral: '#b8513a' },
  facade: { bronze: '#3b2f25', sandstone: '#b9a68a', gold: '#c9a35e', glass: '#1d2a33' },
};
