// Side wings: connector from the lobby + a corridor to SCREEN II (west) / SCREEN III (east). Designed for the east side and mirrored for the west.
import { MAT } from './materials.js';
import { HALLS } from './layout.js';
const BR = { kind: 'decal', ao: false, mat: MAT.brass };
const ST = { wingW: { upper: '#8fa59d', lower: '#2d2018', rail: '#d6b65a', wain: 1.1, mat: MAT.plaster, lmat: MAT.wood }, wingE: { upper: '#c4a46c', lower: '#2d2018', rail: '#e0b84a', wain: 1.1, mat: MAT.plaster, lmat: MAT.wood } };
export function buildWings(ctx) { wing(ctx, 1, 'wingE', HALLS[2]); wing(ctx, -1, 'wingW', HALLS[1]); }
function wing(ctx, s, key, hall) {
  const { A, world, rooms, mats, G, prop, glow, sign, poster, col, sit, lightAt, Door } = ctx, a = A[key], st = ST[key], hh = 3.4, M = (x0, x1) => (s > 0 ? [x0, x1] : [-x1, -x0]);
  const box = (x0, y0, z0, x1, y1, z1, hex, o) => { const [p, q] = M(x0, x1); a.box(p, y0, z0, q, y1, z1, hex, o); };
  const wall = (x0, z0, x1, z1, y0, y1, inx, inz, gaps, sty) => { const [p, q] = M(x0, x1); a.wall(p, z0, q, z1, y0, y1, s * inx, inz, gaps, sty); };
  const P = (name, x, y, z, yaw, o) => prop(key, name, s * x, y, z, s > 0 ? yaw : -yaw, o), X = (x) => s * x, Y = (yaw) => (s > 0 ? yaw : -yaw);
  // floors, carpets, ceiling
  box(8, -0.2, 2, 13.5, 0, 5.4, '#808080', { ao: false, mat: MAT.chequer, tile: 2 }); box(10.8, -0.2, -13, 13.5, 0, 2, '#808080', { ao: false, mat: MAT.chequer, tile: 2 });
  box(8.3, 0, 3.0, 12.9, 0.03, 4.4, '#6d1020', { kind: 'decal', ao: false, mat: MAT.carpet, tile: 0.8 }); box(11.5, 0, -12.2, 12.8, 0.03, 3.0, '#6d1020', { kind: 'decal', ao: false, mat: MAT.carpet, tile: 0.8 });
  box(8, hh, 2, 13.8, hh + 0.25, 5.7, '#2a1c13', { ao: false, mat: MAT.plaster }); box(10.5, hh, -13.3, 13.8, hh + 0.25, 2, '#2a1c13', { ao: false, mat: MAT.plaster });
  // walls
  wall(8, 1.7, 10.5, 2.0, 0, hh, 0, 1, [], st); wall(8, 5.4, 13.8, 5.7, 0, hh, 0, -1, [], st); wall(13.5, -8.5, 13.8, 5.7, 0, hh, -1, 0, [], st); wall(10.5, -8.5, 10.8, 2.0, 0, hh, 1, 0, [], st); wall(10.5, -13.3, 13.8, -13.0, 0, hh, 0, 1, [], st);
  wall(13.45, -13.0, 13.5, -8.5, 0, hh, -1, 0, [[-11.6, -9.2, 2.7]], { ...st, o: {} }); wall(10.8, -13.0, 10.85, -8.5, 0, hh, 1, 0, [], st);   // skins over the hall walls seen from the corridor
  // glowing wall panels + cove
  for (const z of [0.7, -1.8, -4.3, -6.8]) for (const [x0, x1, bx0, bx1] of [[13.43, 13.46, 13.41, 13.5], [10.84, 10.87, 10.8, 10.89]]) { box(x0, 1.45, z - 0.07, x1, 2.75, z + 0.07, '#f0b070', { kind: 'glow', ao: false }); box(bx0, 1.42, z - 0.1, bx1, 1.45, z + 0.1, '#d6b65a', BR); box(bx0, 2.75, z - 0.1, bx1, 2.78, z + 0.1, '#d6b65a', BR); }
  for (const x of [9.4, 11.8]) box(x - 0.07, 1.45, 5.36, x + 0.07, 2.75, 5.39, '#f0b070', { kind: 'glow', ao: false }); box(10.9, hh - 0.1, -13, 11.02, hh - 0.04, 2.0, '#ffc27a', { kind: 'glow', ao: false }); box(13.28, hh - 0.1, -13, 13.4, hh - 0.04, 5.4, '#ffc27a', { kind: 'glow', ao: false }); box(8.0, hh - 0.1, 5.28, 13.28, hh - 0.04, 5.4, '#ffc27a', { kind: 'glow', ao: false });
  // door frame + animated double door into the hall + sign
  box(13.38, 0, -11.75, 13.5, 2.85, -11.6, '#3b2314', { mat: MAT.wood }); box(13.38, 0, -9.2, 13.5, 2.85, -9.05, '#3b2314', { mat: MAT.wood }); box(13.38, 2.7, -11.75, 13.5, 2.88, -9.05, '#c9a24a', BR);
  const d = new Door(rooms[key], G('lumiere-door-leaf'), mats.solid, X(13.65), -10.4, s > 0 ? 90 : -90, 1.2, 2.7, (open) => world.onDoor && world.onDoor(open, d)); world.doors.push(d);
  sign(key, hall.name, X(13.4), 3.15, -10.4, s > 0 ? -90 : 90, 1.7, 0.42); sign(key, hall.kind, X(13.4), 2.88, -10.4, s > 0 ? -90 : 90, 1.2, 0.22, true);
  // set dressing
  // poster lightboxes: two on the outer wall in the bays between strip/sconce pairs, one on the inner wall opposite the bench
  const lbY = [[-3.05, 0], [-5.5, 1], [-2.5, 2]]; lbY.forEach(([z, i], k) => { const onOuter = k < 2, x = onOuter ? 13.44 : 10.9, yaw = onOuter ? -90 : 90; P('lumiere-lightbox', x, 0.8, z, yaw, { noGlow: true }); poster(key, (i + (s > 0 ? 3 : 0)) % 6, X(x + (onOuter ? -0.075 : 0.075)), 1.52, z, Y(yaw), 0.9, 1.28); });
  P('lumiere-bench', 11.3, 0, -4.2, 90, { box: [0.3, 0.85] }); for (const dz of [-0.4, 0.4]) { const sp = sit('Sit on the bench', X(11.28), -4.2 + dz, Y(90), 0.98, 0, 0.9); }
  P('lumiere-potted-plant', 11.2, 0, -5.45, 20, { box: [0.3, 0.3] });
  P('lumiere-bench', 9.8, 0, 5.15, 180, { box: [0.85, 0.3] }); sit('Sit on the bench', X(9.8 - 0.4), 5.13, Y(180), 0.98, 0, 0.9); sit('Sit on the bench', X(9.8 + 0.4), 5.13, Y(180), 0.98, 0, 0.9);
  P('lumiere-palm-tall', 12.95, 0, 1.0, 0, { box: [0.3, 0.3] }); P('lumiere-palm-tall', 11.2, 0, -12.4, 30, { box: [0.3, 0.3] }); P('lumiere-statue-deco', 12.5, 0, -12.5, 0, { box: [0.45, 0.45] }); P('lumiere-trash-bin', 13.1, 0, 5.0, 0, { box: [0.25, 0.25] });
  P('lumiere-wall-mirror', 11.1, 1.0, 5.37, 180); P('lumiere-wall-clock', 9.6, 2.0, 1.97, 0);
  for (const z of [0.7, -1.8, -6.8]) P('lumiere-fan-sconce', 13.42, 1.75, z - 0.0, -90, { halo: [[0, 0.55, 0, 0.9, '#ffc27a', 1]] }); for (const z of [-0.5, -5.5]) P('lumiere-fan-sconce', 10.88, 1.75, z, 90, { halo: [[0, 0.55, 0, 0.9, '#ffc27a', 1]] });
  glow(key, X(12.5), 2.2, -12.0, 1.8, '#ffd9a0', 0.7);
  lightAt(key, X(10.9), 2.7, 3.7, '#ffbf80', 14, 9); lightAt(key, X(12.15), 2.7, -3.0, '#ffbf80', 14, 10); lightAt(key, X(12.15), 2.7, -8.8, '#ffbf80', 14, 9); lightAt(key, X(12.4), 2.4, -11.4, '#ffd9a0', 12, 7); lightAt(key, X(12.0), 2.6, 0.5, '#ffc27a', 8, 7);
}
