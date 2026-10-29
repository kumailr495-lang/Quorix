// Lobby + central corridor: shell, set dressing, lights, sit spots, NPC spawn points.
import * as THREE from 'three';
import { MAT } from './materials.js';
import { ROOMS } from './layout.js';
import { makeCanvas } from './textures.js';
const ST = {
  lobby: { upper: '#cdb98f', lower: '#3b2314', rail: '#c9a24a', wain: 1.15, mat: MAT.plaster, lmat: MAT.wood },
  c0: { upper: '#b39468', lower: '#3b2314', rail: '#c9a24a', wain: 1.1, mat: MAT.plaster, lmat: MAT.wood },
};
const BR = { kind: 'decal', ao: false, mat: MAT.brass };
export function menuBoard(THREEns = THREE) {
  const c = makeCanvas(768, 288), g = c.getContext('2d'); g.fillStyle = '#17110d'; g.fillRect(0, 0, 768, 288); g.strokeStyle = '#c9a24a'; g.lineWidth = 4; g.strokeRect(10, 10, 748, 268);
  g.fillStyle = '#f0cf8a'; g.textAlign = 'center'; g.font = '300 52px Cormorant, Georgia, serif'; g.fillText('REFRESHMENTS', 384, 70);
  g.font = '400 26px Inter, sans-serif'; g.fillStyle = '#efe3c8'; g.textAlign = 'left'; const rows = [['Salted popcorn', '4'], ['Caramel popcorn', '5'], ['Velvet lemonade', '3'], ['Ice-cream in a cup', '3']];
  rows.forEach((r, i) => { g.fillText(r[0], 60, 130 + i * 38); g.textAlign = 'right'; g.fillText(r[1], 708, 130 + i * 38); g.textAlign = 'left'; });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export function buildLobby(ctx) {
  const { A, world, rooms, mats, G, prop, glow, sign, poster, col, sit, lightAt, Door } = ctx, a = A.lobby, st = ST.lobby, hh = ROOMS.lobby.h;
  // ---------- shell ----------
  a.box(-8, -0.2, 2, 8, 0, 18, '#808080', { ao: false, mat: MAT.chequer, tile: 2 });
  a.box(-3.0, 0, 3.0, 3.0, 0.03, 17.0, '#6d1020', { kind: 'decal', ao: false, mat: MAT.carpet, tile: 0.8 });
  for (const [x0, z0, x1, z1] of [[-3.0, 3.0, 3.0, 3.14], [-3.0, 16.86, 3.0, 17.0], [-3.0, 3.0, -2.86, 17.0], [2.86, 3.0, 3.0, 17.0]]) a.box(x0, 0.03, z0, x1, 0.065, z1, '#c9a24a', BR);
  a.wall(-8.3, 2, -8, 18, 0, hh, 1, 0, [[2.3, 5.1, 3.1]], st); a.wall(8, 2, 8.3, 18, 0, hh, -1, 0, [[2.3, 5.1, 3.1]], st);
  a.wall(-8.3, 18, 8.3, 18.3, 0, hh, 0, -1, [[-1.3, 1.3, 2.8]], st); a.wall(-8.3, 1.7, 8.3, 2, 0, hh, 0, 1, [[-2.2, 2.2, 3.1]], st);
  for (const [x0, z0, x1, z1] of [[-8.3, 1.7, 8.3, 6.2], [-8.3, 13.8, 8.3, 18.3], [-8.3, 6.2, -4.2, 13.8], [4.2, 6.2, 8.3, 13.8]]) a.box(x0, hh, z0, x1, hh + 0.25, z1, '#2c1d14', { ao: false, mat: MAT.plaster, tile: 2 });
  a.box(-4.2, hh + 0.7, 6.2, 4.2, hh + 0.9, 13.8, '#b89a70', { ao: false, mat: MAT.plaster });
  for (const [x0, z0, x1, z1] of [[-4.2, 6.2, -4.0, 13.8], [4.0, 6.2, 4.2, 13.8], [-4.0, 6.2, 4.0, 6.4], [-4.0, 13.6, 4.0, 13.8]]) a.box(x0, hh, z0, x1, hh + 0.7, z1, '#8a6a3a', { ao: false, mat: MAT.brass });
  for (const [x0, z0, x1, z1] of [[-3.95, 6.4, 3.95, 6.62], [-3.95, 13.38, 3.95, 13.6], [-3.95, 6.62, -3.73, 13.38], [3.73, 6.62, 3.95, 13.38]]) a.box(x0, hh + 0.64, z0, x1, hh + 0.7, z1, '#ffd9a0', { kind: 'glow', ao: false });
  for (const [x0, z0, x1, z1] of [[-2.4, 8.3, 2.4, 8.36], [-2.4, 11.64, 2.4, 11.7], [-2.4, 8.36, -2.34, 11.64], [2.34, 8.36, 2.4, 11.64]]) a.box(x0, hh + 0.66, z0, x1, hh + 0.7, z1, '#c9a24a', BR);
  for (const sx of [-1, 1]) a.box(sx > 0 ? 7.88 : -7.98, hh - 0.14, 2.4, sx > 0 ? 7.98 : -7.88, hh - 0.06, 17.8, '#ffcf8a', { kind: 'glow', ao: false });
  a.box(-7.9, hh - 0.14, 17.7, 7.9, hh - 0.06, 17.8, '#ffcf8a', { kind: 'glow', ao: false });
  for (const z of [6.0, 10.4, 14.6, 17.3]) for (const sx of [-1, 1]) { const x = sx > 0 ? 8 : -8; a.box(sx > 0 ? x - 0.16 : x, 0, z - 0.28, sx > 0 ? x : x + 0.16, hh, z + 0.28, '#2a1a10', { ref: 0, mat: MAT.wood }); a.box(sx > 0 ? x - 0.2 : x, 2.6, z - 0.3, sx > 0 ? x : x + 0.2, 2.68, z + 0.3, '#c9a24a', BR); }
  for (const sx of [-1, 1]) { const xo = sx > 0 ? 7.94 : -8.1; a.box(xo, 0, 2.15, xo + 0.16, 3.2, 2.3, '#c9a24a', BR); a.box(xo, 0, 5.1, xo + 0.16, 3.2, 5.25, '#c9a24a', BR); a.box(xo, 3.1, 2.15, xo + 0.16, 3.22, 5.25, '#c9a24a', BR); }
  a.box(-1.45, 0, 17.84, -1.3, 2.9, 18, '#c9a24a', BR); a.box(1.3, 0, 17.84, 1.45, 2.9, 18, '#c9a24a', BR); a.box(-1.45, 2.8, 17.84, 1.45, 2.95, 18, '#c9a24a', BR); a.box(-1.3, 0, 17.97, 1.3, 2.8, 18.02, '#1c1410', { ao: false, mat: MAT.glass });
  const ent = new Door(rooms.lobby, G('lumiere-door-leaf'), mats.solid, 0, 17.96, 180, 1.3, 2.8, (open) => world.onDoor && world.onDoor(open, ent)); ent.npcOnly = true; world.entrance = ent; world.doors.push(ent); col(-1.35, 17.95, 1.35, 18.4);
  // ---------- set dressing ----------
  const W = -7.97, E = 7.97;
  prop('lobby', 'lumiere-reception-desk', -5.6, 0, 8.5, 90); col(-6.25, 6.8, -4.55, 10.2);
  ctx.curvedSign('lobby', 'Reception', -6.7, 8.5, 2.024, 0.735, 90, 1.15, 0.34, true);
  // box-office queue lane: two brass stanchion + velvet rope runs framing the approach to the desk (one collider per run so nobody walks under a rope)
  for (const z of [7.2, 9.8]) { for (const x of [-4.35, -2.85]) prop('lobby', 'lumiere-stanchion', x, 0, z, 0); prop('lobby', 'lumiere-velvet-rope', -3.6, 0, z, 0); col(-4.55, z - 0.12, -2.67, z + 0.12); }
  prop('lobby', 'lumiere-lounge-sofa', 7.35, 0, 12.5, -90, { box: [0.6, 1.7] }); for (const z of [11.35, 12.5, 13.65]) sit('Sit on the sofa', 7.12, z, -90, 1.02, 0, 1.1);
  prop('lobby', 'lumiere-console-table', 7.6, 0, 8.2, -90, { box: [0.3, 1.3] }); prop('lobby', 'lumiere-display-case', 7.25, 0, 5.9, -90, { box: [0.4, 0.4] });
  prop('lobby', 'lumiere-round-table', 4.6, 0, 11.0, 0, { box: [0.45, 0.45] }); prop('lobby', 'lumiere-bar-stool', 3.7, 0, 11.0, 0, { box: [0.22, 0.22] }); prop('lobby', 'lumiere-bar-stool', 5.5, 0, 11.0, 0, { box: [0.22, 0.22] });
  prop('lobby', 'lumiere-armchair', -5.8, 0, 13.6, 90, { box: [0.5, 0.5] }); prop('lobby', 'lumiere-armchair', -3.4, 0, 13.6, -90, { box: [0.5, 0.5] }); prop('lobby', 'lumiere-coffee-table', -4.6, 0, 13.6, 0, { box: [0.48, 0.48] });
  sit('Sit in the armchair', -5.74, 13.6, 90, 1.0, 0, 0, { x: -5.3, z: 12.6 }); sit('Sit in the armchair', -3.46, 13.6, -90, 1.0, 0, 0, { x: -3.9, z: 12.6 });
  prop('lobby', 'lumiere-nesting-table-large', -7.1, 0, 15.3, 90, { box: [0.3, 0.65] }); prop('lobby', 'lumiere-nesting-table-small', -6.78, 0, 15.3, 90, { box: [0.2, 0.44] }); prop('lobby', 'lumiere-floor-lamp', -7.3, 0, 10.9, 0, { box: [0.25, 0.25], halo: [[0, 1.75, 0, 1.1]] }); prop('lobby', 'lumiere-floor-lamp', 7.3, 0, 9.9, 0, { box: [0.25, 0.25], halo: [[0, 1.75, 0, 1.1]] });
  for (const sx of [-1, 1]) { prop('lobby', 'lumiere-column', sx * 4.6, 0, 6.4, 0, { box: [0.5, 0.5] }); prop('lobby', 'lumiere-column', sx * 4.6, 0, 13.6, 0, { box: [0.5, 0.5] }); prop('lobby', 'lumiere-statue-deco', sx * 5.5, 0, 3.4, 0, { box: [0.45, 0.45] }); prop('lobby', 'lumiere-palm-tall', sx * 3.6, 0, 3.0, sx * 30, { box: [0.3, 0.3] }); }
  prop('lobby', 'lumiere-pendant-chandelier', 0, hh + 0.7, 10, 0, { halo: [[0, -0.55, 0, 3.4, '#ffd9a0', 1.1]] }); prop('lobby', 'lumiere-pendant-chandelier', -4.2, hh, 15.0, 0, { sc: 0.55 }); prop('lobby', 'lumiere-pendant-chandelier', 4.2, hh, 15.0, 0, { sc: 0.55 });
  glow('lobby', 0, 4.7, 10, 6.5, '#ffe0a8', 0.55); glow('lobby', -4.2, 4.7, 15, 2.2, '#ffd9a0', 0.8); glow('lobby', 4.2, 4.7, 15, 2.2, '#ffd9a0', 0.8);
  prop('lobby', 'lumiere-bar-counter', -4.2, 0, 16.8, 180, {}); col(-6.15, 16.35, -2.25, 18); for (const x of [-5.5, -4.6, -3.7, -2.8]) { prop('lobby', 'lumiere-bar-stool', x, 0, 15.65, 0, { box: [0.2, 0.2] }); sit('Sit at the bar', x, 15.65, 0, 1.25, 0, -0.85); }
  prop('lobby', 'lumiere-concession-counter', 4.2, 0, 16.9, 180, {}); col(2.4, 16.5, 6.05, 18); prop('lobby', 'lumiere-popcorn-machine', 6.7, 0, 17.0, 180, { halo: [[0, 1.75, 0.2, 0.9, '#ffd070', 0.8]] }); col(6.15, 16.6, 7.1, 18);
  prop('lobby', 'lumiere-candy-cabinet', 7.45, 0, 15.4, -90, {}); col(6.9, 14.4, 8, 16.5);
  sign('lobby', 'Bar', -4.2, 3.45, 17.93, 180, 1.3, 0.42, true); const mb = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.98), new THREE.MeshBasicMaterial({ map: menuBoard(), toneMapped: false })); mb.position.set(4.2, 3.3, 17.93); mb.rotation.y = Math.PI; rooms.lobby.add(mb);
  prop('lobby', 'lumiere-wall-clock', 0, 3.55, 17.95, 180); prop('lobby', 'lumiere-wall-mirror', E, 1.0, 12.5, -90); prop('lobby', 'lumiere-wall-mirror', W, 1.0, 16.4, 90);
  prop('lobby', 'lumiere-coat-rack', -7.35, 0, 17.0, 0, { box: [0.45, 0.45] }); prop('lobby', 'lumiere-trash-bin', -6.55, 0, 17.55, 0, { box: [0.25, 0.25] });
  for (const sx of [-1, 1]) prop('lobby', 'lumiere-potted-plant', sx * 1.9, 0, 17.3, sx * 50, { box: [0.3, 0.3] });   // planters framing the street doors
  prop('lobby', 'lumiere-ticket-dispenser', 2.45, 0, 2.6, -45, { box: [0.18, 0.18] });   // ticket-check post beside Marcel at the way to the screens
  prop('lobby', 'lumiere-poster-frame-set', E - 0.02, 0, 8.2, -90); for (let i = 0; i < 3; i++) poster('lobby', i, E - 0.06, 1.2, 8.2 + (i - 1) * 0.7 * 1.0, -90, 0.54, 0.84); prop('lobby', 'lumiere-poster-frame-set', W + 0.02, 0, 12.4, 90); for (let i = 0; i < 3; i++) poster('lobby', i + 3, W + 0.06, 1.2, 12.4 + (i - 1) * 0.7, 90, 0.54, 0.84);
  for (const [x, i] of [[-3.9, 3], [3.9, 4]]) { prop('lobby', 'lumiere-lightbox', x, 1.0, 2.03, 0, { noGlow: true }); poster('lobby', i, x, 1.72, 2.1, 0, 0.9, 1.28); }
  for (const [x, z] of [[-1.9, 4.6], [1.9, 4.6]]) { prop('lobby', 'lumiere-standee', x, 0, z, 0, { box: [0.5, 0.2] }); } poster('lobby', 0, -1.9, 1.3, 4.66, 0, 0.84, 1.3); poster('lobby', 2, 1.9, 1.3, 4.66, 0, 0.84, 1.3);
  prop('lobby', 'lumiere-marquee', 0, 3.2, 2.02, 0); sign('lobby', 'LUMIÈRE', 0, 3.67, 2.12, 0, 2.5, 0.62, false, 640, 160); glow('lobby', 0, 3.7, 2.2, 5.5, '#ffc870', 0.6);
  for (const z of [6.6, 10.4, 14.6]) { prop('lobby', 'lumiere-fan-sconce', W, 1.7, z, 90, { halo: [[0.07, 0.55, 0, 1.0, '#ffc27a', 1]] }); } for (const z of [6.0, 10.0, 14.4]) prop('lobby', 'lumiere-fan-sconce', E, 1.7, z, -90, { halo: [[-0.07, 0.55, 0, 1.0, '#ffc27a', 1]] });
  for (const z of [3.7]) { prop('lobby', 'lumiere-fan-sconce', -7.97, 1.9, z + 1.6, 90); prop('lobby', 'lumiere-fan-sconce', 7.97, 1.9, z + 1.6, -90); }
  // ---------- lights (8 slots, assigned when the player is in the lobby) ----------
  lightAt('lobby', 0, 4.3, 10, '#ffc688', 34, 17); lightAt('lobby', -3.4, 2.9, 8.5, '#ffd29c', 14, 9); lightAt('lobby', 6.2, 2.6, 12.5, '#ffc27c', 12, 8); lightAt('lobby', 0, 3.4, 15.6, '#ffcf9a', 10, 9);
  lightAt('lobby', -4.2, 3.0, 15.4, '#ffbf80', 12, 8); lightAt('lobby', 4.2, 3.0, 15.4, '#ffbf80', 12, 8); lightAt('lobby', 0, 2.8, 3.6, '#ffcf9a', 10, 8); lightAt('lobby', 0, 4.0, 6.0, '#ffd29c', 12, 10);
  // ---------- interact + people ----------
  world.interact.push({ id: 'desk', x: -3.9, z: 8.5, r: 3.0, npc: 'receptionist' });
  world.spawns.push({ id: 'receptionist', model: 'receptionist', name: 'Éloïse', role: 'reception', x: -5.25, z: 8.5, yaw: 90, room: 'lobby' }, { id: 'usher', model: 'usher', name: 'Marcel', role: 'usher', x: 1.7, z: 3.6, yaw: 0, room: 'lobby' },
    { id: 'barkeep', model: 'bartender', name: 'Odette', role: 'barkeep', x: -4.2, z: 17.3, yaw: 180, room: 'lobby' }, { id: 'vendor', model: 'bartender', name: 'Gaston', role: 'vendor', x: 4.2, z: 17.35, yaw: 180, room: 'lobby' },
    { id: 'p1', model: 'patron-m1', name: 'Mr. Hale', role: 'patron', x: -1.6, z: 10.6, yaw: 90, room: 'lobby', chat: 'p2' }, { id: 'p2', model: 'patron-f1', name: 'Mrs. Hale', role: 'patron', x: -0.5, z: 10.6, yaw: -90, room: 'lobby', chat: 'p1' },
    { id: 'p3', model: 'patron-f2', name: 'Lucille', role: 'patron', x: 3.6, z: 7.6, yaw: 0, room: 'lobby', chat: 'p4' }, { id: 'p4', model: 'patron-m3', name: 'Mr. Orsini', role: 'patron', x: 4.6, z: 7.6, yaw: 180, room: 'lobby', chat: 'p3' },
    { id: 'p5', model: 'patron-f3', name: 'Ines', role: 'wanderer', x: -2.2, z: 14.6, yaw: 0, room: 'lobby' }, { id: 'p6', model: 'patron-m2', name: 'Anton', role: 'sitter', x: -4.6, z: 15.65, yaw: 0, room: 'lobby', spot: 'Sit at the bar' }, { id: 'p7', model: 'patron-f1', name: 'Vera', role: 'sitter', x: 7.12, z: 12.5, yaw: -90, room: 'lobby', spot: 'Sit on the sofa' });
  buildCorridor(ctx);
}
function buildCorridor(ctx) {
  const { A, world, rooms, mats, G, prop, glow, sign, poster, col, sit, lightAt, Door } = ctx, a = A.c0, st = ST.c0, hh = ROOMS.c0.h;
  a.box(-2.5, -0.2, -8.8, 2.5, 0, 2, '#808080', { ao: false, mat: MAT.chequer, tile: 2 }); a.box(-0.95, 0, -8.8, 0.95, 0.03, 2, '#7a1424', { kind: 'decal', ao: false, mat: MAT.carpet, tile: 0.8 });
  for (const x of [-0.97, 0.94]) a.box(x, 0.03, -8.8, x + 0.03, 0.065, 2, '#c9a24a', BR);
  a.box(-2.5, hh, -8.8, 2.5, hh + 0.25, 2, '#2a1c13', { ao: false, mat: MAT.plaster }); a.wall(-2.5, -8.8, -2.2, 1.7, 0, hh, 1, 0, [], st); a.wall(2.2, -8.8, 2.5, 1.7, 0, hh, -1, 0, [], st);
  // light strips; the poster lightboxes take the other two bays (-5.1, -0.1) so nothing hangs over a strip
  for (const z of [-7.6, -2.6]) for (const sx of [-1, 1]) { const x = sx > 0 ? 2.17 : -2.2; a.box(x, 1.45, z - 0.07, x + 0.03, 2.75, z + 0.07, '#f0b070', { kind: 'glow', ao: false }); a.box(sx > 0 ? x - 0.02 : x, 1.42, z - 0.1, sx > 0 ? x + 0.03 : x + 0.05, 1.45, z + 0.1, '#c9a24a', BR); a.box(sx > 0 ? x - 0.02 : x, 2.75, z - 0.1, sx > 0 ? x + 0.03 : x + 0.05, 2.78, z + 0.1, '#c9a24a', BR); }
  for (const sx of [-1, 1]) a.box(sx > 0 ? 2.08 : -2.2, hh - 0.1, -8.8, sx > 0 ? 2.2 : -2.08, hh - 0.04, 1.7, '#ffc27a', { kind: 'glow', ao: false });
  // door frame to SCREEN I
  a.box(-1.45, 0, -8.5, -1.25, 2.85, -8.3, '#3b2314', { mat: MAT.wood }); a.box(1.25, 0, -8.5, 1.45, 2.85, -8.3, '#3b2314', { mat: MAT.wood }); a.box(-1.45, 2.7, -8.5, 1.45, 2.88, -8.3, '#c9a24a', BR);
  const d = new Door(rooms.c0, G('lumiere-door-leaf'), mats.solid, 0, -8.66, 180, 1.2, 2.7, (open) => world.onDoor && world.onDoor(open, d)); world.doors.push(d);
  sign('c0', 'SCREEN I', 0, 3.05, -8.4, 0, 1.7, 0.42);
  for (const [sx, yaw] of [[-1, 90], [1, -90]]) { const x = sx * 2.18; for (const [z, pi] of [[-0.1, 3], [-5.1, 4]]) { prop('c0', 'lumiere-lightbox', x, 0.8, z, yaw, { noGlow: true }); poster('c0', (pi + (sx > 0 ? 2 : 0)) % 6, x - sx * 0.075, 1.52, z, yaw, 0.9, 1.28); }
    prop('c0', 'lumiere-bench', sx * 1.82, 0, -2.4, yaw, { box: [0.3, 0.85] }); for (const dz of [-0.4, 0.4]) sit('Sit on the bench', sx * 1.8, -2.4 + dz, yaw, 0.98, 0, 0.9); prop('c0', 'lumiere-palm-tall', sx * 1.65, 0, -7.2, sx * 40, { box: [0.3, 0.3] });
    for (const z of [-6.35, -3.85, -1.35]) prop('c0', 'lumiere-fan-sconce', x, 1.75, z, yaw, { halo: [[-sx * 0.07, 0.55, 0, 0.9, '#ffc27a', 1]] }); }
  prop('c0', 'lumiere-trash-bin', 1.95, 0, 1.0, 0, { box: [0.25, 0.25] });
  lightAt('c0', 0, 2.7, -1.5, '#ffb36a', 15, 10); lightAt('c0', 0, 2.7, -6.2, '#ffb36a', 15, 9); lightAt('c0', 0, 2.8, 1.2, '#ffc27a', 8, 6);
}
