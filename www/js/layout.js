// LUMIERE floor plan (metres, +z = south/lobby side, screens at the north). Pure data + helpers, no THREE.
export const ROOMS = {
  lobby: { rects: [[-8, 2, 8, 18]], h: 5.2 }, c0: { rects: [[-2.2, -8.8, 2.2, 2]], h: 3.4 },
  wingW: { rects: [[-13.5, 2, -8, 5.4], [-13.5, -13, -10.8, 2]], h: 3.4 }, wingE: { rects: [[8, 2, 13.5, 5.4], [10.8, -13, 13.5, 2]], h: 3.4 },
};
export const HALLS = [
  { id: 'I', key: 'hallI', name: 'SCREEN I', kind: 'Grand Hall', x0: -10.5, x1: 10.5, z0: -31.5, z1: -8.8, h: 8.2, rows: 8, perBlock: 9, seatPitch: 0.9, aisle: 0.8, row0z: -24.5, pitch: 1.5, rise: 0.2,
    screen: { type: 'flat', w: 15.4, h: 6.3, cy: 3.35 }, door: { wall: 'south', c: 0 }, theme: { wall: '#4c372b', slat: '#7a5230', curtain: '#7a1224', step: '#3d1620', led: '#ff9a3c', trim: '#c9a24a' } },
  { id: 'II', key: 'hallII', name: 'SCREEN II', kind: 'Curved Premium', x0: -34.5, x1: -13.8, z0: -31.5, z1: -8.8, h: 7.8, rows: 7, perBlock: 7, seatPitch: 0.9, aisle: 0.8, row0z: -25.2, pitch: 1.5, rise: 0.22,
    screen: { type: 'curved', w: 14.4, h: 5.7, cy: 3.2, bend: 34 }, door: { wall: 'east', c: -10.4 }, theme: { wall: '#2f4a4c', slat: '#4f7a78', curtain: '#12404a', step: '#14323a', led: '#ffb066', trim: '#d6b65a' } },
  { id: 'III', key: 'hallIII', name: 'SCREEN III', kind: 'IMAX Arc', x0: 13.8, x1: 34.5, z0: -31.5, z1: -8.8, h: 9.8, rows: 9, perBlock: 8, seatPitch: 0.9, aisle: 0.8, row0z: -27.3, pitch: 1.5, rise: 0.26,
    screen: { type: 'curved', w: 19.2, h: 8.5, cy: 4.4, bend: 46 }, door: { wall: 'west', c: -10.4 }, theme: { wall: '#3d3324', slat: '#8a6a30', curtain: '#4a1a10', step: '#2a1a10', led: '#ffd070', trim: '#e0b84a' } },
];
export const ADJ = { lobby: ['c0', 'wingW', 'wingE'], c0: ['lobby', 'hallI'], wingW: ['lobby', 'hallII'], wingE: ['lobby', 'hallIII'], hallI: ['c0'], hallII: ['wingW'], hallIII: ['wingE'] };
export const ROW_LETTERS = 'ABCDEFGHIJ';
export const rowZ = (h, i) => h.row0z + i * h.pitch;
export const rowFloorY = (h, i) => -(h.rows - 1 - i) * h.rise;
export const frontY = (h) => -h.rows * h.rise;
export const hallCx = (h) => (h.x0 + h.x1) / 2;
export const seatX = (h, c) => (c <= h.perBlock ? -(h.aisle + h.seatPitch / 2 + (h.perBlock - c) * h.seatPitch) : (h.aisle + h.seatPitch / 2 + (c - h.perBlock - 1) * h.seatPitch));
export const inHall = (h, x, z) => x >= h.x0 && x <= h.x1 && z >= h.z0 && z <= h.z1;
export function hallFloorY(h, x, z) { if (z >= h.z1) return 0; if (z < rowZ(h, 0) - h.pitch / 2) return frontY(h); for (let i = 0; i < h.rows; i++) if (z < rowZ(h, i) + h.pitch / 2) return rowFloorY(h, i); return 0; }
export function floorY(x, z) { for (const h of HALLS) if (inHall(h, x, z)) return hallFloorY(h, x, z); return 0; }
export function roomAt(x, z) {
  for (const h of HALLS) if (inHall(h, x, z)) return h.key;
  for (const k in ROOMS) for (const [x0, z0, x1, z1] of ROOMS[k].rects) if (x >= x0 && x <= x1 && z >= z0 && z <= z1) return k;
  return 'lobby';
}
export const roomRects = (k) => ROOMS[k] ? ROOMS[k].rects : (() => { const h = HALLS.find((q) => q.key === k); return [[h.x0, h.z0, h.x1, h.z1]]; })();
export function hallSeats(h) {
  const taken = new Set(['A4', 'A5', 'B6', 'C7', 'C8', 'D3', 'E9', 'F5', 'G10', 'H2']), a = [];
  for (let i = 0; i < h.rows; i++) for (let c = 1; c <= h.perBlock * 2; c++) { const id = ROW_LETTERS[i] + c; a.push({ id, hall: h.id, row: i, col: c, x: hallCx(h) + seatX(h, c), y: rowFloorY(h, i), z: rowZ(h, i), taken: taken.has(id) }); }
  return a;
}
export const hallById = (id) => HALLS.find((h) => h.id === id);
export const visibleSet = (room) => new Set([room, ...(ADJ[room] || [])]);

// doorways between rooms: used for portal visibility (draw a neighbour only when you are near the opening) and for navigation across wall thickness
export const PORTALS = [{ a: 'lobby', b: 'c0', x: 0, z: 2 }, { a: 'lobby', b: 'wingW', x: -8, z: 3.7 }, { a: 'lobby', b: 'wingE', x: 8, z: 3.7 }, { a: 'c0', b: 'hallI', x: 0, z: -8.8 }, { a: 'wingW', b: 'hallII', x: -13.5, z: -10.4 }, { a: 'wingE', b: 'hallIII', x: 13.5, z: -10.4 }];
export const PASSAGES = [[-13.9, -11.6, -13.4, -9.2], [13.4, -11.6, 13.9, -9.2], [-1.2, -8.9, 1.2, -8.4]];
export function visibleRooms(room, x, z, R = 9.5) { const v = new Set([room]); for (const p of PORTALS) { const other = p.a === room ? p.b : p.b === room ? p.a : null; if (!other) continue; const always = room === 'lobby' && !other.startsWith('hall'); if (always || Math.hypot(x - p.x, z - p.z) < R) v.add(other); } return v; }
export const portalDist = (a, b, x, z) => { let d = 1e9; for (const p of PORTALS) if ((p.a === a && p.b === b) || (p.a === b && p.b === a)) d = Math.min(d, Math.hypot(x - p.x, z - p.z)); return d; };

// where arriving guests appear / leaving guests vanish (just inside the street doors), and the corridor point outside each hall door
export const ENTRANCE = { x: 0, z: 17.45 };
export const OUTSIDE = { I: { x: 0, z: -7.4 }, II: { x: -12.15, z: -10.4 }, III: { x: 12.15, z: -10.4 } };
export const hallByKey = (k) => HALLS.find((h) => h.key === k);
export const aisleX = (h, s) => { const c = h.cfg || h; return hallCx(c) + (s.col <= c.perBlock ? -0.4 : 0.4); };   // accepts a layout hall or a built hall
// curved screens bow toward the audience: depth of the arc at its edges (m)
export const screenBulge = (S) => S.type === 'flat' ? 0 : (S.w / (2 * Math.sin(S.bend * Math.PI / 360))) * (1 - Math.cos(S.bend * Math.PI / 360));
