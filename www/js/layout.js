// LUMIERE v5.20 floor plan (metres; +z = street / south, screens at the north). Pure data and helpers, no THREE.
// street -> lobby -> ticket check -> gallery (restrooms off its south end, SCREEN 1 door on the left, SCREEN 3 on the right)
// -> video tunnel -> SCREEN 2 (IMAX). See docs/V6-ENVIRONMENT.md.
import { SPECS, makeHall, hallFloorY, hallSeats, ROW_LETTERS } from './hallmath.js';
export { ROW_LETTERS, hallSeats };
export const HALLS = SPECS.map(makeHall);
export const hallById = (id) => HALLS.find((h) => h.id === id), hallByKey = (k) => HALLS.find((h) => h.key === k);
const H = Object.fromEntries(HALLS.map((h) => [h.id, h]));
export const LOBBY = { x0: -14, x1: 14, z0: 0.15, z1: 20, h: 7 };   // z0 = inner face of the wall to the gallery
export const GAL = { x0: -3.5, x1: 3.5, z0: -32, z1: 0.15, h: 4.6 };  // the gallery: one wide spine to every screen
export const OPEN = { x0: GAL.x0, x1: GAL.x1, h: 4.2 };                // lobby -> gallery opening (ticket check)
export const TUN = { x0: -3.0, x1: 3.0, z0: -40.0, z1: -32.0, h: 3.4 }; // the video tunnel to the IMAX
export const WC = {                                                   // restrooms off the gallery's south end, entered from its side walls
  wcM: { x0: -12.0, x1: -3.8, z0: -8.0, z1: -0.15, h: 3.2, door: { x: GAL.x0, z: -2.2, w: 1.6 }, side: -1 },
  wcF: { x0: 3.8, x1: 12.0, z0: -8.0, z1: -0.15, h: 3.2, door: { x: GAL.x1, z: -2.2, w: 1.6 }, side: 1 },
};
export const DOOR_W = 1.8, DOOR_H = 2.5;
// doors of the halls: entrance (crossing aisle, from the gallery or the tunnel) and exit (near the screen, back into the gallery)
export const HALL_DOORS = [];
for (const h of HALLS) {
  if (h.door === 'vom') HALL_DOORS.push({ hall: h.id, kind: 'entrance', room: 'tunnel', x: h.entrance.x, z: h.zBack, axis: 'z', w: h.vom.u * 2, h: 2.8, open: true });
  else { const e = h.entrance, out = e.side > 0 ? 0.15 : -0.15;
    HALL_DOORS.push({ hall: h.id, kind: 'entrance', room: 'gal', x: e.x + out, z: e.z, axis: 'x', w: DOOR_W, h: DOOR_H, side: e.side });
    HALL_DOORS.push({ hall: h.id, kind: 'exit', room: 'gal', x: h.exit.x + out, z: h.exit.z, axis: 'x', w: 1.5, h: DOOR_H, side: e.side }); }
}
export const ROOM_KEYS = ['lobby', 'gal', 'wcM', 'wcF', 'tunnel', ...HALLS.map((h) => h.key), 'street'];
export const RECTS = { lobby: [LOBBY.x0, LOBBY.z0, LOBBY.x1, LOBBY.z1], gal: [GAL.x0, GAL.z0, GAL.x1, GAL.z1], tunnel: [TUN.x0, TUN.z0, TUN.x1, TUN.z1], street: [-40, 20, 40, 44] };
for (const k in WC) RECTS[k] = [WC[k].x0, WC[k].z0, WC[k].x1, WC[k].z1];
for (const h of HALLS) RECTS[h.key] = [h.x0, h.zs, h.x1, h.zBack];
const inR = (r, x, z) => x >= r[0] && x <= r[2] && z >= r[1] && z <= r[3];
const ORDER = [...HALLS.map((h) => h.key), 'tunnel', 'wcM', 'wcF', 'gal', 'lobby', 'street'];
export function roomAt(x, z) {
  for (const k of ORDER) if (inR(RECTS[k], x, z)) return k;
  // inside a doorway's wall thickness: the nearest room (v5.10 returned 'lobby' here, which hid the hall around a player in its door)
  let best = 'lobby', bd = 1e9; for (const k of ROOM_KEYS) { const r = RECTS[k], dx = Math.max(r[0] - x, 0, x - r[2]), dz = Math.max(r[1] - z, 0, z - r[3]), d = dx * dx + dz * dz; if (d < bd) { bd = d; best = k; } }
  return best;
}
export function floorY(x, z) { for (const h of HALLS) if (inR(RECTS[h.key], x, z)) return hallFloorY(h, x, z); return 0; }
export const roomHeight = (k) => k === 'lobby' ? LOBBY.h : k === 'gal' ? GAL.h : k === 'tunnel' ? TUN.h : WC[k] ? WC[k].h : k === 'street' ? 30 : hallByKey(k).ceil;
// portals: openings between rooms (visibility, sound, navigation through wall thickness). w = opening width, h = height, see = width seen
// through (the glass front), door = key of the door that can shut it, solid = the shut door hides what is behind it
export const PORTALS = [
  { a: 'lobby', b: 'gal', x: 0, z: 0, w: OPEN.x1 - OPEN.x0, h: OPEN.h, axis: 'z', always: true },
  { a: 'lobby', b: 'street', x: 0, z: 20, w: 3.2, see: LOBBY.x1 - LOBBY.x0, h: LOBBY.h, axis: 'z', always: true, door: 'street' },
  { a: 'gal', b: 'tunnel', x: 0, z: GAL.z0, w: TUN.x1 - TUN.x0, h: TUN.h, axis: 'z' },
];
for (const k in WC) PORTALS.push({ a: 'gal', b: k, x: WC[k].door.x + WC[k].side * 0.15, z: WC[k].door.z, w: WC[k].door.w, h: 2.4, axis: 'x' });
for (const d of HALL_DOORS) PORTALS.push({ a: d.room, b: H[d.hall].key, x: d.x, z: d.z, w: d.w, h: d.h, axis: d.axis, hallDoor: d.hall, door: d.open ? null : d.hall + ':' + d.kind, solid: !d.open });
// walkable strips through wall thickness (navigation only)
export const NAV_PASSAGES = PORTALS.filter((p) => p.b !== 'street').map((p) => p.axis === 'z' ? [p.x - p.w / 2 + 0.05, p.z - 0.5, p.x + p.w / 2 - 0.05, p.z + 0.5] : [p.x - 0.5, p.z - p.w / 2 + 0.05, p.x + 0.5, p.z + p.w / 2 - 0.05]);
export const portalDist = (a, b, x, z) => { let d = 1e9; for (const p of PORTALS) if ((p.a === a && p.b === b) || (p.a === b && p.b === a)) d = Math.min(d, Math.hypot(x - p.x, z - p.z)); return d; };
// rooms to draw: the current room, plus neighbours seen through an opening (two hops: lobby <-> gallery <-> hall).
// canSee(portal) is the renderer's test (opening inside the view, door not shut); within 1.5 m of an opening both sides always draw
export function visibleRooms(room, x, z, canSee = () => true) {
  const v = new Set([room]), see = (r, depth) => { for (const p of PORTALS) { const o = p.a === r ? p.b : p.b === r ? p.a : null; if (!o || v.has(o)) continue; const dist = Math.hypot(x - p.x, z - p.z);
    if (!p.always && dist > 40) continue; if (dist > 1.5 && !canSee(p)) continue;
    v.add(o); if (depth < 1 && !o.startsWith('hall')) see(o, depth + 1); } };
  see(room, 0); return v;
}
// people come in from the street and leave through it; the usher's ticket check; staff posts
export const ENTRANCE = { x: 0, z: 21.5 }, STREET_SPAWN = [[-9, 24], [9, 24], [-4, 25], [5, 25]];
export const USHER_POST = { x: 2.6, z: 1.4, yaw: 180 };
export const hallOfSeat = (s) => hallById(s.hall);
export const aisleX = (h, s) => { const left = s.u < 0; return h.cx + (left ? -1 : 1) * (h.B / 2 + 0.6); };   // where a viewer leaves the side aisle for the row
export const hallDoor = (hallId, kind = 'entrance') => HALL_DOORS.find((d) => d.hall === hallId && d.kind === kind);
