// LUMIERE v5 floor plan (metres; +z = street / south, screens at the north). Pure data and helpers, no THREE.
// Lobby (double height, glass street front) -> concourse -> two light-lock passages -> three halls entered at their crossing aisles.
import { SPECS, makeHall, hallFloorY, hallSeats, ROW_LETTERS, BACK_Z } from './hallmath.js';
export { ROW_LETTERS, hallSeats };
export const HALLS = SPECS.map(makeHall);
export const hallById = (id) => HALLS.find((h) => h.id === id), hallByKey = (k) => HALLS.find((h) => h.key === k);
export const LOBBY = { x0: -14, x1: 14, z0: 0, z1: 20, h: 7 };
export const CONC = { x0: -15, x1: 15, z0: BACK_Z + 0.3, z1: 0, h: 5 };   // concourse; its north wall is the halls' back wall line
export const OPEN = { x0: -7, x1: 7, h: 4.6 };                               // the opening between lobby and concourse
const H = Object.fromEntries(HALLS.map((h) => [h.id, h]));
const passEnd = (a, b) => Math.min(a, b) - 1.3;
// passages: west serves SCREEN 1 (its east wall) and SCREEN 3 (its west wall); east serves SCREEN 3 and SCREEN 2
export const PASSAGES = [
  { key: 'passW', x0: -14.5, x1: -11.3, z0: passEnd(H.I.doorZ(1), H.III.doorZ(-1)), z1: CONC.z0, h: 3.6, doors: [{ hall: 'I', x: -14.65, z: H.I.doorZ(1), side: -1 }, { hall: 'III', x: -11.15, z: H.III.doorZ(-1), side: 1 }] },
  { key: 'passE', x0: 11.3, x1: 14.5, z0: passEnd(H.III.doorZ(1), H.II.doorZ(-1)), z1: CONC.z0, h: 3.6, doors: [{ hall: 'III', x: 11.15, z: H.III.doorZ(1), side: -1 }, { hall: 'II', x: 14.65, z: H.II.doorZ(-1), side: 1 }] },
];
export const DOOR_W = 1.7, DOOR_H = 2.5;
export const ROOM_KEYS = ['lobby', 'conc', 'passW', 'passE', ...HALLS.map((h) => h.key), 'street'];
export const RECTS = { lobby: [LOBBY.x0, LOBBY.z0, LOBBY.x1, LOBBY.z1], conc: [CONC.x0, CONC.z0, CONC.x1, CONC.z1], street: [-40, 20, 40, 44] };
for (const p of PASSAGES) RECTS[p.key] = [p.x0, p.z0, p.x1, p.z1];
for (const h of HALLS) RECTS[h.key] = [h.x0, h.zs, h.x1, h.zBack];
const inR = (r, x, z) => x >= r[0] && x <= r[2] && z >= r[1] && z <= r[3];
export function roomAt(x, z) {
  for (const h of HALLS) if (inR(RECTS[h.key], x, z)) return h.key;
  for (const p of PASSAGES) if (inR(RECTS[p.key], x, z)) return p.key;
  if (inR(RECTS.conc, x, z)) return 'conc'; if (inR(RECTS.lobby, x, z)) return 'lobby'; if (inR(RECTS.street, x, z)) return 'street';
  // inside a doorway's wall thickness: the nearest room. v5.10 returned 'lobby' here, which hid the hall and passage around a
  // player standing in a hall door (the black flash on the phone) and cut the film sound for the same moment
  let best = 'lobby', bd = 1e9; for (const k of ROOM_KEYS) { const r = RECTS[k], dx = Math.max(r[0] - x, 0, x - r[2]), dz = Math.max(r[1] - z, 0, z - r[3]), d = dx * dx + dz * dz; if (d < bd) { bd = d; best = k; } }
  return best;
}
export function floorY(x, z) { for (const h of HALLS) if (inR(RECTS[h.key], x, z)) return hallFloorY(h, x, z); return 0; }
export const roomHeight = (k) => k === 'lobby' ? LOBBY.h : k === 'conc' ? CONC.h : k.startsWith('pass') ? 3.6 : k === 'street' ? 30 : hallByKey(k).ceil;
// portals: openings between rooms (visibility, sound occlusion, navigation through wall thickness). `w` = opening width, `always` = see through at any distance
// h = opening height, see = width seen through (the street is seen through the whole glass front, not just the door); solid doors hide what is behind them when shut
export const PORTALS = [
  { a: 'lobby', b: 'conc', x: 0, z: 0, w: OPEN.x1 - OPEN.x0, h: OPEN.h, axis: 'z', always: true },
  { a: 'lobby', b: 'street', x: 0, z: 20, w: 3.2, see: LOBBY.x1 - LOBBY.x0, h: LOBBY.h, axis: 'z', always: true, door: 'street' },
  { a: 'conc', b: 'passW', x: -12.9, z: CONC.z0 - 0.15, w: 2.8, h: 2.7, axis: 'z', door: 'passW', solid: true },
  { a: 'conc', b: 'passE', x: 12.9, z: CONC.z0 - 0.15, w: 2.8, h: 2.7, axis: 'z', door: 'passE', solid: true },
];
for (const p of PASSAGES) for (const d of p.doors) PORTALS.push({ a: p.key, b: H[d.hall].key, x: d.x, z: d.z, w: DOOR_W, h: DOOR_H, axis: 'x', hallDoor: d.hall });
// walkable strips through wall thickness (navigation only)
export const NAV_PASSAGES = PORTALS.filter((p) => p.b !== 'street').map((p) => p.axis === 'z' ? [p.x - p.w / 2 + 0.05, p.z - 0.5, p.x + p.w / 2 - 0.05, p.z + 0.5] : [p.x - 0.5, p.z - p.w / 2 + 0.05, p.x + 0.5, p.z + p.w / 2 - 0.05]);
export const portalDist = (a, b, x, z) => { let d = 1e9; for (const p of PORTALS) if ((p.a === a && p.b === b) || (p.a === b && p.b === a)) d = Math.min(d, Math.hypot(x - p.x, z - p.z)); return d; };
// rooms to draw: the current room, plus neighbours seen through an opening (two hops for lobby <-> concourse <-> passage).
// canSee(portal) is the renderer's test (opening inside the view, door not shut); within 1.5 m of an opening both sides always draw
export function visibleRooms(room, x, z, canSee = () => true) {
  const v = new Set([room]), see = (r, depth) => { for (const p of PORTALS) { const o = p.a === r ? p.b : p.b === r ? p.a : null; if (!o || v.has(o)) continue; const dist = Math.hypot(x - p.x, z - p.z);
    if (o.startsWith('hall') && depth > 0) continue;   // light locks: a hall is only seen from its own passage
    if (!p.always && dist > 30) continue; if (dist > 1.5 && !canSee(p)) continue;
    v.add(o); if (depth < 1 && !o.startsWith('hall')) see(o, depth + 1); } };
  see(room, 0); return v;
}
// people come in from the street and leave through it; the usher's guide stand; staff posts
export const ENTRANCE = { x: 0, z: 21.5 }, STREET_SPAWN = [[-9, 24], [9, 24], [-4, 25], [5, 25]];
export const USHER_POST = { x: 1.6, z: 1.6, yaw: 180 };
export const hallOfSeat = (s) => hallById(s.hall);
export const aisleX = (h, s) => { const left = s.u < 0; return h.cx + (left ? -1 : 1) * (h.B / 2 + 0.6); };   // where a viewer leaves the side aisle for the row
