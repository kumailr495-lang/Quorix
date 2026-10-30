// LUMIERE v5 - lobby (double height, glass street front) and the night street outside. The gallery to the screens: build-gallery.js.
// Art direction (docs/V5-ART-DIRECTION.md): warm modern-deco cinema, after Everyman / Dolby Cinema references: chevron oak, geometric tile, fluted walnut,
// dark plum plaster, brass, velvet, neon. Zones: box office (west), bar-cafe (north-west), concession (east), banquette island under a cove ring (centre),
// LED video wall over the opening to the concourse, usher's guide stand at that opening.
import * as THREE from 'three';
import { Room } from './room.js';
import { MAT, M, Kit, col } from './geom.js';
import * as P from './props.js';
import { C } from './props.js';
import { LOBBY, OPEN } from './layout.js';
import { menuTexture, shopTexture, makeCanvas, neonTexture } from './textures.js';
import { placeAsset } from './assets.js';
const PI = Math.PI;
// seat helper: registers a sit spot (player + NPCs). face = direction the sitter looks (radians, 0 = +z); stand = where you stand up to
function sitSpot(world, room, kind, x, z, face, seatY, stand, label) { world.sitSpots.push({ id: 'sp' + world.sitSpots.length, kind, room, x, z, y: seatY, face, stand, label, taken: null }); }
export function buildLobby(ctx) {
  const { world, mats } = ctx, room = new Room('lobby', { ceil: LOBBY.h, rect: [LOBBY.x0, 0.15, LOBBY.x1, LOBBY.z1], soft: 0.3 }), L = room.lights, H = LOBBY.h, z0 = 0.15;
  const wallC = '#2c2226', upperC = '#1d1a1e', skirt = { h: 0.1, color: '#121214', mat: MAT.lacquer }, warm = '#ffcf9a';
  // ---------- floors (non-overlapping zones): chevron oak parquet, geometric tile at the bar and the entrance, deco carpet under the island ----------
  room.flat(-14, z0, -6.5, 8.5, 0, true, '#ffffff', { mat: MAT.geotile });
  for (const r of [[-14, 17.6, -3, 20], [3, 17.6, 14, 20]]) room.flat(r[0], r[1], r[2], r[3], 0, true, '#ffffff', { mat: MAT.geotile });
  room.flat(-3, 17.6, 3, 18.2, 0, true, '#ffffff', { mat: MAT.geotile }); room.flat(-3, 18.2, 3, 20, 0, true, '#2a2426', { mat: MAT.carpet });
  for (const r of [[-6.5, z0, 14, 17.6], [-14, 8.5, -6.5, 17.6]]) room.flat(r[0], r[1], r[2], r[3], 0, true, '#ffffff', { mat: MAT.chevron });
  const rug = new THREE.CircleGeometry(3.45, 64); rug.rotateX(-PI / 2); room.acc.add(rug, M(0, 0.008, 10), '#ffffff', { mat: MAT.deco });
  // ---------- walls: dark plum plaster, fluted walnut wainscot with a brass cap, brass picture rail ----------
  room.wall('x', z0, -14, 14, 0, H, 1, wallC, [[OPEN.x0, OPEN.x1, OPEN.h]], { mat: MAT.plaster, thick: 0.3, skirt });
  room.wall('z', -14, z0, 20, 0, H, 1, wallC, [], { mat: MAT.plaster, thick: 0.3, skirt });
  room.wall('z', 14, z0, 20, 0, H, -1, wallC, [], { mat: MAT.plaster, thick: 0.3, skirt });
  const wains = (axis, c, a0, a1, dir) => { if (a1 - a0 < 0.3) return; const t = 0.04;
    if (axis === 'x') { room.box(a0, 0.1, dir > 0 ? c : c - t, a1, 1.2, dir > 0 ? c + t : c, '#6b4630', { mat: MAT.fluted, faces: dir > 0 ? 'pz py px nx' : 'nz py px nx' }); room.box(a0, 1.2, dir > 0 ? c : c - t - 0.01, a1, 1.23, dir > 0 ? c + t + 0.01 : c, '#c9a061', { mat: MAT.brass, faces: dir > 0 ? 'pz py ny px nx' : 'nz py ny px nx' }); }
    else { room.box(dir > 0 ? c : c - t, 0.1, a0, dir > 0 ? c + t : c, 1.2, a1, '#6b4630', { mat: MAT.fluted, faces: dir > 0 ? 'px py pz nz' : 'nx py pz nz' }); room.box(dir > 0 ? c : c - t - 0.01, 1.2, a0, dir > 0 ? c + t + 0.01 : c, 1.23, a1, '#c9a061', { mat: MAT.brass, faces: dir > 0 ? 'px py ny pz nz' : 'nx py ny pz nz' }); } };
  const rail = (axis, c, a0, a1, dir, y) => { if (axis === 'x') room.box(a0, y, dir > 0 ? c : c - 0.02, a1, y + 0.03, dir > 0 ? c + 0.02 : c, '#c9a061', { mat: MAT.brass, faces: dir > 0 ? 'pz py ny px nx' : 'nz py ny px nx' }); else room.box(dir > 0 ? c : c - 0.02, y, a0, dir > 0 ? c + 0.02 : c, y + 0.03, a1, '#c9a061', { mat: MAT.brass, faces: dir > 0 ? 'px py ny pz nz' : 'nx py ny pz nz' }); };
  wains('x', z0, 7, 13.94, 1); wains('z', 14, z0 + 0.06, 5.3, -1); wains('z', 14, 17.4, 19.86, -1); wains('z', -14, 8.6, 10.35, 1); wains('z', -14, 17.95, 19.86, 1);
  for (const [a0, a1] of [[-14, OPEN.x0 - 0.02], [OPEN.x1 + 0.02, 14]]) rail('x', z0, a0, a1, 1, 4.55);
  rail('z', 14, z0 + 0.02, 19.86, -1, 4.55); rail('z', -14, z0 + 0.02, 19.86, 1, 4.55);
  room.box(-14, 4.58, z0, 14, H, z0 + 0.012, upperC, { faces: 'pz ny', mat: MAT.plaster, edge: 2 });   // darker upper band, 12 mm proud of the wall (no coplanar faces)
  // opening to the concourse: reveals inside the wall thickness, brass-lined
  for (const x of [OPEN.x0, OPEN.x1]) room.box(x - 0.001, 0, -0.15, x + 0.001, OPEN.h, z0, '#c9a061', { faces: x < 0 ? 'px' : 'nx', mat: MAT.brass });
  room.box(OPEN.x0, OPEN.h - 0.001, -0.15, OPEN.x1, OPEN.h + 0.001, z0, '#1a1a1d', { faces: 'ny', mat: MAT.paint });
  // glass street front: slim dark bronze mullions and transoms; transparent panes; door bay in the middle
  const bronze = '#3a2e24', bays = 12; for (let i = 0; i <= bays; i++) { const x = -14 + 28 * i / bays; if (Math.abs(x) < 1.7 && i !== bays / 2) continue; room.box(x - 0.04, 0, 19.86, x + 0.04, H, 20.0, bronze, { mat: MAT.brass, faces: 'nz px nx' }); }
  room.box(-14, 0, 19.85, 14, 0.1, 20.0, bronze, { mat: MAT.brass, faces: 'nz py' }); room.box(-14, 3.15, 19.85, 14, 3.25, 20.0, bronze, { mat: MAT.brass, faces: 'nz py ny' }); room.box(-14, H - 0.25, 19.85, 14, H, 20.0, bronze, { mat: MAT.brass, faces: 'nz ny' });   // transoms 1 cm proud of the mullions where they cross
  for (const s of [-1, 1]) room.box(s * 1.65 - 0.06, 0, 19.86, s * 1.65 + 0.06, 3.15, 20.0, bronze, { mat: MAT.brass, faces: 'nz px nx' });
  const glass = mats.glassMat(); for (const [x0, x1, y0, y1] of [[-14, -1.7, 0.1, H - 0.25], [1.7, 14, 0.1, H - 0.25], [-1.7, 1.7, 3.25, H - 0.25]]) { const g = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0), glass); g.position.set((x0 + x1) / 2, (y0 + y1) / 2, 19.93); g.renderOrder = 5; room.add(g); }
  room.col(-14, 19.86, -1.6, 20.3); room.col(1.6, 19.86, 14, 20.3); room.col(-1.6, 19.95, 1.6, 20.2, 0, 3); room.colliders[room.colliders.length - 1].nonav = true;   // the street door is for NPCs only: blocks the player, not the guests' paths
  // ---------- ceiling: deep charcoal, warm recessed downlights, cove ring over the island ----------
  room.flat(-14, z0, 14, 20, H, false, '#1a181b', { mat: MAT.paint });
  for (const x of [-10.5, -7, -3.5, 0, 3.5, 7, 10.5]) for (const z of [2.2, 6.8, 13.2, 18.4]) { if (x < -6 && z < 8.5) continue; if (Math.abs(x) < 4 && z > 6 && z < 14) continue;
    room.box(x - 0.09, H - 0.012, z - 0.09, x + 0.09, H - 0.002, z + 0.09, '#fff1dc', { glow: true, grp: 1, faces: 'ny' }); L.spot(x, H - 0.1, z, warm, 23, 11, 'h', [0, -1, 0], 16, 48); }
  placeAsset(room, 'chandelier_ring', 0, H - 0.75, 10); for (let i = 0; i < 16; i++) { const a = i / 16 * PI * 2; L.point(Math.cos(a) * 2.7, H - 0.85, 10 + Math.sin(a) * 2.7, '#ffd9a8', 1.3, 9, 'h'); }
  // wall washers graze the fluted wainscot and the plaster, so the walls read as material instead of flat colour
  for (const x of [-12, -8.5, 8.5, 12]) L.spot(x, H - 0.4, z0 + 0.9, '#ffc68a', 7, 8, 'h', [0, -1, -0.4], 18, 50);
  for (let x = -12; x <= 12; x += 4) L.spot(x, 0.3, 19.2, '#ffb87a', 2.2, 6, 'h', [0, 1, 0.1], 25, 60);   // floor uplights along the glass front
  for (const z of [2.5, 18.5]) L.spot(13.1, H - 0.4, z, '#ffc68a', 5, 8, 'h', [0.4, -1, 0], 18, 50);
  L.ambient('#ffd7ad', '#5a4236', 0.13, 'h');
  // ---------- centre island: eight banquette segments round a tree planter on a deco rug ----------
  for (let i = 0; i < 8; i++) placeAsset(room, 'banquette_seg', 0, 0, 10, (i + 0.5) / 8 * PI * 2);
  placeAsset(room, 'planter_tree', 0, 0, 10, 0.4); room.col(-2.3, 7.7, 2.3, 12.3); L.occluder(-2.3, 7.7, 2.3, 12.3, 0, 0.9, 0.35);
  for (let i = 0; i < 8; i++) { const a = (i + 0.5) / 8 * PI * 2, sx = Math.sin(a), sz = Math.cos(a); sitSpot(world, 'lobby', 'sofa', sx * 1.98, 10 + sz * 1.98, a, 0.44, { x: sx * 2.95, z: 10 + sz * 2.95 }, 'sit.sofa'); }
  // ---------- fluted walnut columns ----------
  for (const [x, z] of [[-5.2, 3.6], [5.2, 3.6], [-7.2, 13.2], [7.2, 13.2]]) { placeAsset(room, 'column_fluted', x, 0, z); room.col(x - 0.45, z - 0.45, x + 0.45, z + 0.45); L.occluder(x - 0.4, z - 0.4, x + 0.4, z + 0.4, 0, 3, 0.3); L.point(x, H - 0.45, z, '#ffc888', 0.9, 4, 'h'); }
  // ---------- box office (west wall): walnut slat wall, three counter modules, neon TICKETS, brass queue posts ----------
  room.box(-13.99, 0.1, 10.4, -13.95, 4.4, 17.9, '#6b4630', { faces: 'px', mat: MAT.slats });
  for (const z of [12.2, 14.2, 16.2]) placeAsset(room, 'counter_module', -11.6, 0, z, PI / 2);
  room.col(-12.0, 11.2, -11.2, 17.2); L.occluder(-12.0, 11.2, -11.2, 17.2, 0, 1.1, 0.45);
  for (const z of [13.0, 15.4]) placeAsset(room, 'pos_terminal', -11.5, 1.08, z, PI / 2);
  room.tex(neonTexture('TICKETS', '#ff5a6e', 1024, 200, { size: 0.5, weight: 700, spacing: 0.22 }), -13.93, 3.55, 14.2, PI / 2, 3.6, 0.7, { emit: 1.8, transparent: true });
  L.area(-13.6, 3.55, 14.2, [0, 0, 1.6], [0, 0.25, 0], [1, 0, 0], '#ff6c80', 1.6, 8, 'f', 3, 1);
  for (const z of [12.8, 15.6]) L.spot(-10.6, H - 0.2, z, '#ffe2bd', 10, 9, 'h', [-0.25, -1, 0], 20, 55);
  for (const x of [-10.1, -8.7]) { for (const z of [12.4, 14.2, 16.0]) placeAsset(room, 'stanchion', x, 0, z); for (const z of [13.3, 15.1]) placeAsset(room, 'rope_velvet', x, 0, z, PI / 2); room.col(x - 0.08, 12.3, x + 0.08, 16.1); }
  for (const x of [-8.4, -7.2]) { placeAsset(room, 'kiosk', x, 0, 18.7, PI); room.col(x - 0.32, 18.4, x + 0.32, 19.0); }
  world.posts.receptionist = { x: -12.45, z: 14.2, yaw: PI / 2, room: 'lobby' }; world.spots.tickets = { x: -10.6, z: 14.2 };
  // ---------- bar-cafe (north-west): walnut slat ceiling and screens, marble counter, velvet stools, deco armchairs, brass dish pendants ----------
  room.box(-14, 3.4, z0, -6.6, 3.5, 8.4, '#6b4630', { mat: MAT.slats, faces: 'ny px pz' });
  for (const [x0, z0b, x1, z1] of [[-14, 8.46, -9.8, 8.54], [-6.54, z0, -6.46, 3.9]]) { room.box(x0, 0, z0b, x1, 2.5, z1, '#6b4630', { mat: MAT.slats }); room.col(x0, z0b - 0.02, x1, z1 + 0.02); }
  placeAsset(room, 'planter_tall', -9.4, 0, 8.5); placeAsset(room, 'planter_tall', -6.5, 0, 4.3); room.col(-9.7, 8.2, -9.1, 8.8); room.col(-6.8, 4.0, -6.2, 4.6);
  for (const z of [1.8, 3.8, 5.8]) placeAsset(room, 'counter_module', -11.4, 0, z, PI / 2);
  room.col(-11.8, 0.8, -11.0, 6.8); L.occluder(-11.8, 0.8, -11.0, 6.8, 0, 1.1, 0.45);
  placeAsset(room, 'back_bar', -13.54, 0, 3.8, PI / 2); room.col(-14, 0.9, -13.4, 6.7);
  for (let i = 0; i < 5; i++) { const z = 1.7 + i * 1.05; placeAsset(room, 'bar_stool', -10.5, 0, z); room.col(-10.72, z - 0.22, -10.28, z + 0.22); sitSpot(world, 'lobby', 'stool', -10.55, z, -PI / 2, 0.76, { x: -9.75, z }, 'sit.stool'); }
  for (const z of [2.2, 6.3]) { placeAsset(room, 'armchair_deco', -8.8, 0, z, PI / 2); placeAsset(room, 'armchair_deco', -7.15, 0, z, -PI / 2); placeAsset(room, 'side_table', -7.98, 0, z); room.col(-9.25, z - 0.42, -6.7, z + 0.42); L.occluder(-9.2, z - 0.4, -6.75, z + 0.4, 0, 0.8, 0.3);
    sitSpot(world, 'lobby', 'chair', -8.78, z, PI / 2, 0.45, { x: -8.85, z: z + (z < 4 ? 0.95 : -0.95) }, 'sit.chair'); sitSpot(world, 'lobby', 'chair', -7.17, z, -PI / 2, 0.45, { x: -7.1, z: z + (z < 4 ? 0.95 : -0.95) }, 'sit.chair'); }
  for (const z of [1.8, 3.8, 5.8]) { placeAsset(room, 'pendant_dish', -11.3, 3.4, z); L.point(-11.3, 2.0, z, '#ffc98f', 2.2, 4.5, 'h'); }
  for (const z of [2.2, 6.3]) { placeAsset(room, 'pendant_dish', -7.98, 3.4, z); L.spot(-7.98, 2.1, z, '#ffc98f', 3.0, 5, 'h', [0, -1, 0], 40, 80); }
  L.area(-13.55, 2.15, 3.8, [0, 0, 2.6], [0, 0.8, 0], [1, 0, 0], '#ffb069', 2.6, 6, 'f', 4, 2);
  room.tex(neonTexture('Bar & Café', '#ffb35c', 1024, 200, { size: 0.5, weight: 500, font: 'serif', spacing: 0.04 }), -11.9, 2.0, 8.56, 0, 2.6, 0.5, { emit: 1.7, transparent: true });
  world.posts.bartender = { x: -12.35, z: 3.8, yaw: PI / 2, room: 'lobby' }; world.spots.bar = { x: -10.4, z: 3.8 };
  // ---------- concession stand (east): five walnut-slat modules, popcorn machines glowing on the back counter, menu screens, neon POPCORN ----------
  for (let i = 0; i < 5; i++) placeAsset(room, 'counter_module', 11.2, 0, 6.35 + i * 1.8, -PI / 2, { scale: [0.9, 1, 1] });
  room.col(10.8, 5.45, 11.6, 14.55); L.occluder(10.8, 5.5, 11.6, 14.5, 0, 1.1, 0.45);
  room.kit(P.counterKit(9.0, { depth: 0.6, body: '#1c1c1f', front: '#1c1c1f', top: '#2b2b30', h: 0.92 }), 13.68, 0, 10, PI / 2); room.col(13.35, 5.45, 14, 14.55);
  for (const z of [7.3, 12.7]) { placeAsset(room, 'popcorn_machine', 13.62, 0.92, z, -PI / 2); L.point(13.3, 1.6, z, '#ffd889', 1.8, 4, 'f'); }
  placeAsset(room, 'drinks_fountain', 13.66, 0.92, 10, -PI / 2); room.kit(P.cupStackKit(3), 13.65, 0.92, 8.8, PI / 2); room.kit(P.cupStackKit(3), 13.65, 0.92, 11.2, PI / 2);
  for (const z of [6.8, 13.2]) placeAsset(room, 'pos_terminal', 11.25, 1.08, z, -PI / 2);
  ['combos', 'popcorn', 'drinks'].forEach((k, i) => { const z = 7.1 + i * 2.9; room.box(13.9, 2.78, z - 1.38, 13.97, 4.42, z + 1.38, '#121214', { mat: MAT.lacquer, faces: 'nx py ny pz nz' }); room.tex(menuTexture(k), 13.895, 3.6, z, -PI / 2, 2.6, 1.46, { emit: 1.3 });
    L.area(13.6, 3.6, z, [0, 0, 1.2], [0, 0.7, 0], [-1, 0, 0], ['#ff8a90', '#ffd08a', '#9fd8ff'][i], 1.2, 8, 'f', 2, 1); });
  room.tex(neonTexture('POPCORN', '#ff3d5a', 1024, 200, { size: 0.55, weight: 800, spacing: 0.18 }), 13.93, 5.35, 10, -PI / 2, 5.2, 1.0, { emit: 1.9, transparent: true });
  L.area(13.6, 5.35, 10, [0, 0, 2.4], [0, 0.35, 0], [-1, 0, 0], '#ff4d6a', 1.8, 9, 'f', 4, 1);
  for (const z of [6.6, 9.0, 11.4, 13.8]) L.spot(11.6, H - 0.2, z, '#ffe8cc', 9, 9, 'h', [0.2, -1, 0], 22, 55);
  placeAsset(room, 'candy_wall', 13.68, 0, 16.4, -PI / 2); room.col(13.45, 15.5, 14, 17.3); L.area(13.5, 1.1, 16.4, [0, 0, 0.8], [0, 0.9, 0], [-1, 0, 0], '#fff0d8', 1.1, 4, 'f', 2, 2);
  for (const z of [6.4, 8.6, 10.8, 13.0, 15.2]) placeAsset(room, 'stanchion', 9.5, 0, z); for (const z of [7.5, 9.7, 11.9, 14.1]) placeAsset(room, 'rope_velvet', 9.5, 0, z, PI / 2); room.col(9.42, 6.3, 9.58, 15.3);
  world.posts.vendor1 = { x: 12.15, z: 8.6, yaw: -PI / 2, room: 'lobby' }; world.posts.vendor2 = { x: 12.15, z: 11.6, yaw: -PI / 2, room: 'lobby' };
  world.spots.snacks = { x: 10.25, z: 10.0 }; world.spots.snackCounter = { x: 11.2, y: 1.09, z: 10.0 };
  // ---------- by the windows: velvet benches, planters, bins ----------
  for (const x of [-9.5, 8.6]) { placeAsset(room, 'bench_velvet', x, 0, 17.4, PI); room.col(x - 1.0, 17.15, x + 1.0, 17.65); for (const dx of [-0.55, 0.55]) sitSpot(world, 'lobby', 'bench', x + dx, 17.4, PI, 0.47, { x: x + dx, z: 16.55 }, 'sit.bench'); }
  for (const [x, z] of [[-13.2, 19.2], [13.2, 19.2], [-6.6, 0.95], [6.6, 0.95]]) { placeAsset(room, 'planter_tall', x, 0, z); room.col(x - 0.3, z - 0.3, x + 0.3, z + 0.3); }
  for (const x of [-4.6, 4.6]) { placeAsset(room, 'bin_brass', x, 0, 19.3); room.col(x - 0.22, 19.08, x + 0.22, 19.52); }
  // ---------- LED video wall over the opening, usher's guide stand ----------
  room.box(-6.2, 4.82, z0, 6.2, 6.82, z0 + 0.1, '#121214', { mat: MAT.lacquer, faces: 'pz py ny px nx' });
  const led = makeCanvas(1024, 160); world.ledWall = { canvas: led, texture: null }; const ledTex = new THREE.CanvasTexture(led); ledTex.colorSpace = THREE.SRGBColorSpace; world.ledWall.texture = ledTex;
  room.tex(ledTex, 0, 5.82, z0 + 0.105, 0, 12.0, 1.875, { emit: 1.35 }); L.area(0, 5.8, 0.6, [6, 0, 0], [0, 0.9, 0], [0, 0, 1], '#c9b6ff', 3.5, 14, 'f', 4, 1);
  placeAsset(room, 'usher_podium', 2.5, 0, 1.25, 0); room.col(2.15, 0.9, 2.85, 1.6);
  room.kit(P.totemKit(1.9, 0.6), 3.55, 0, 1.15, PI); room.col(3.2, 0.95, 3.9, 1.35);
  room.tex(guideTexture(), 3.55, 1.0, 1.198, 0, 0.56, 1.76, { emit: 1.25 });
  world.posts.usher = { x: 1.75, z: 1.75, yaw: 0, room: 'lobby' }; world.spots.usherAsk = { x: 1.75, z: 3.0 };
  // entrance: where people come in, the welcome mat
  world.spots.entrance = { x: 0, z: 18.6 };
  return room;
}
function guideTexture() {
  const w = 192, h = 600, c = makeCanvas(w, h), g = c.getContext('2d'); g.fillStyle = '#1b1b1f'; g.fillRect(0, 0, w, h); g.fillStyle = '#ff4d5a'; g.fillRect(0, 0, w, 150);
  g.fillStyle = '#fff'; g.font = '800 92px Inter, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', w / 2, 78);
  g.font = '700 30px Inter, sans-serif'; g.fillText('GUIDE', w / 2, 210); g.font = '400 19px Inter, sans-serif'; g.fillStyle = 'rgba(255,255,255,.85)';
  ['Ask the usher', 'to walk you', 'to your seat'].forEach((t, i) => g.fillText(t, w / 2, 262 + i * 28));
  g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 6; g.beginPath(); g.moveTo(w / 2, 400); g.lineTo(w / 2, 500); g.moveTo(w / 2 - 30, 430); g.lineTo(w / 2, 400); g.lineTo(w / 2 + 30, 430); g.stroke();
  g.font = '600 22px Inter, sans-serif'; g.fillStyle = '#fff'; g.fillText('SCREENS 1 · 2 · 3', w / 2, 545);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export function buildStreet(ctx) {
  const room = new Room('street', { ceil: 40, rect: null, soft: 0.3, maxEdge: 3 }), L = room.lights;
  room.flat(-40, 20.0, 40, 26, 0, true, '#8a8782', { mat: MAT.tile, edge: 1.5 }); room.box(-40, -0.15, 26, 40, 0, 26.25, '#a8a49d', { faces: 'pz py', mat: MAT.concrete });
  room.flat(-40, 26.25, 40, 33.2, -0.15, true, '#202125', { mat: MAT.concrete, edge: 2 }); for (let x = -39; x < 40; x += 4) room.flat(x, 29.65, x + 2, 29.8, -0.14, true, '#d8d6cf', { mat: MAT.paint, edge: 4 });
  room.box(-40, -0.15, 33.2, 40, 0, 33.45, '#a8a49d', { faces: 'nz py', mat: MAT.concrete }); room.flat(-40, 33.45, 40, 37, 0, true, '#8a8782', { mat: MAT.tile, edge: 1.5 });
  // canopy over the entrance
  room.box(-3.2, 3.05, 20.0, 3.2, 3.25, 22.2, '#2a2b30', { mat: MAT.metal, faces: 'ny py pz px nx' }); for (const x of [-2, 0, 2]) { room.box(x - 0.12, 3.04, 21.0, x + 0.12, 3.05, 21.24, '#fff3df', { glow: true, faces: 'ny' }); L.spot(x, 3.0, 21.1, '#ffe0b8', 3.0, 6, 'f', [0, -1, 0], 30, 70); }
  // buildings across the road (Kiln facade bays over Kiln shopfronts): dark brick, stone sills, windows lit or dark at random
  const B = [[-40, -19, 4, 1], [-19, -3, 3, 2], [-3, 15, 4, 3], [15, 40, 3, 4]], shops = [['CAFÉ LUNA', '#1f2b3a', '#ffb547'], ['BOOKS & CO', '#2a1b1b', '#ff6b6b'], ['NOODLE BAR', '#1b2a22', '#7bd389'], ['PHARMACY', '#14262f', '#4cc3ff']];
  let rs = 77; const rnd = () => (rs = (rs * 16807) % 2147483647) / 2147483647;
  B.forEach(([x0, x1, storeys], i) => { const n = Math.max(1, Math.round((x1 - x0) / 6)), bw = (x1 - x0) / n, sx = bw / 6;
    for (let b = 0; b < n; b++) { const x = x0 + (b + 0.5) * bw;
      if (b === Math.floor(n / 2)) { placeAsset(room, 'shopfront', x, 0, 37.0, PI, { scale: [sx, 1, 1], glowColor: col(shops[i][2]).map((v) => v * 0.35 + 0.65) }); const [nm, a, c] = shops[i]; room.tex(shopTexture(nm, a, c), x, 3.25, 36.9, PI, Math.min(5.2, bw - 0.8), 0.6, { emit: 1.4 }); L.area(x, 1.6, 36.2, [Math.min(2.6, bw / 2 - 0.5), 0, 0], [0, 0.9, 0], [0, 0, -1], c, 1.8, 9, 'f', 3, 1); }
      else placeAsset(room, 'facade_bay', x, 0, 37.0, PI, { scale: [sx, 1, 1], glowMul: { Mesh_PaneL: rnd() < 0.45 ? 0.9 : 0.06, Mesh_PaneR: rnd() < 0.45 ? 0.9 : 0.06 } });
      for (let f = 1; f < storeys; f++) placeAsset(room, 'facade_bay', x, f * 3.6, 37.0, PI, { scale: [sx, 1, 1], glowMul: { Mesh_PaneL: rnd() < 0.4 ? 0.5 + rnd() * 0.5 : 0.05, Mesh_PaneR: rnd() < 0.4 ? 0.5 + rnd() * 0.5 : 0.05 } }); }
    room.box(x0, storeys * 3.6, 37.0, x1, storeys * 3.6 + 0.5, 37.6, '#2a2420', { faces: 'nz py', mat: MAT.concrete }); });
  for (const z of [25.6, 33.7]) for (const x of [-26, -13, 13, 26]) { placeAsset(room, 'lamp_post', x, 0, z, z < 30 ? 0 : PI); L.point(x, 5.6, z + (z < 30 ? 0.9 : -0.9), '#ffd7a0', 9, 15, 'f'); }
  for (const [x, c] of [[-9, '#7a1c24'], [10.5, '#22324a'], [-22, '#c9c4b8']]) placeAsset(room, 'car_sedan', x, -0.15, 27.4, PI / 2, { swap: { car_red: [MAT.lacquer, col(c)] } });
  L.ambient('#3a4766', '#151820', 0.16, 'f');
  return room;
}
