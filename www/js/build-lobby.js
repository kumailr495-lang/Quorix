// LUMIERE v5 - lobby (double height, glass street front), concourse to the screens, and the night street outside.
// Zones: box office (west), bar-cafe behind an oak screen (north-west), concession stand (east), round sofa island under a ring light (centre),
// LED video wall over the opening to the concourse, usher's guide stand at that opening.
import * as THREE from 'three';
import { Room } from './room.js';
import { MAT, M, Kit } from './geom.js';
import * as P from './props.js';
import { C } from './props.js';
import { LOBBY, CONC, OPEN, PASSAGES } from './layout.js';
import { signTexture, posterTexture, FILMS, menuTexture, facadeTexture, shopTexture, makeCanvas } from './textures.js';
const PI = Math.PI;
// seat helper: registers a sit spot (player + NPCs). face = direction the sitter looks (radians, 0 = +z); stand = where you stand up to
function sitSpot(world, room, kind, x, z, face, seatY, stand, label) { world.sitSpots.push({ id: 'sp' + world.sitSpots.length, kind, room, x, z, y: seatY, face, stand, label, taken: null }); }
export function buildLobby(ctx) {
  const { world, mats } = ctx, room = new Room('lobby', { ceil: LOBBY.h, rect: [LOBBY.x0, 0.15, LOBBY.x1, LOBBY.z1], soft: 0.3 }), L = room.lights, H = LOBBY.h, z0 = 0.15;
  const wallC = '#eeeae3', skirt = { h: 0.12, color: '#2a2b30', mat: MAT.lacquer };
  // ---------- floors (non-overlapping zones) ----------
  room.flat(-14, z0, -6.5, 8.5, 0, true, '#7a5236', { mat: MAT.wood });                   // bar-cafe: dark oak
  room.flat(-3, 18.2, 3, 20, 0, true, '#34312d', { mat: MAT.carpet });                    // entrance mat
  for (const r of [[-6.5, z0, 14, 18.2], [-14, 8.5, -6.5, 18.2], [-14, 18.2, -3, 20], [3, 18.2, 14, 20]]) room.flat(r[0], r[1], r[2], r[3], 0, true, C.terrazzo, { mat: MAT.terrazzo });
  const rug = new THREE.CircleGeometry(3.5, 56); rug.rotateX(-PI / 2); room.acc.add(rug, M(0, 0.008, 10), '#244b52', { mat: MAT.carpet });
  // ---------- walls ----------
  room.wall('x', z0, -14, 14, 0, H, 1, wallC, [[OPEN.x0, OPEN.x1, OPEN.h]], { mat: MAT.plaster, thick: 0.3, skirt });
  room.wall('z', -14, z0, 20, 0, H, 1, wallC, [], { mat: MAT.plaster, thick: 0.3, skirt });
  room.wall('z', 14, z0, 20, 0, H, -1, wallC, [], { mat: MAT.plaster, thick: 0.3, skirt });
  // opening to the concourse: reveals inside the wall thickness
  for (const x of [OPEN.x0, OPEN.x1]) room.box(x - 0.001, 0, -0.15, x + 0.001, OPEN.h, z0, wallC, { faces: x < 0 ? 'px' : 'nx', mat: MAT.plaster });
  room.box(OPEN.x0, OPEN.h - 0.001, -0.15, OPEN.x1, OPEN.h + 0.001, z0, wallC, { faces: 'ny', mat: MAT.plaster });
  // glass street front: mullions, transoms, sill; transparent panes; door bay in the middle
  const bays = 12; for (let i = 0; i <= bays; i++) { const x = -14 + 28 * i / bays; if (Math.abs(x) < 1.7 && i !== bays / 2) continue; room.box(x - 0.05, 0, 19.86, x + 0.05, H, 20.0, '#2a2b30', { mat: MAT.metal, faces: 'nz px nx' }); }
  room.box(-14, 0, 19.86, 14, 0.1, 20.0, '#2a2b30', { mat: MAT.metal, faces: 'nz py' }); room.box(-14, 3.15, 19.86, 14, 3.25, 20.0, '#2a2b30', { mat: MAT.metal, faces: 'nz py ny' }); room.box(-14, H - 0.25, 19.86, 14, H, 20.0, '#2a2b30', { mat: MAT.metal, faces: 'nz ny' });
  for (const s of [-1, 1]) room.box(s * 1.65 - 0.06, 0, 19.86, s * 1.65 + 0.06, 3.15, 20.0, '#2a2b30', { mat: MAT.metal, faces: 'nz px nx' });
  const glass = mats.glassMat(); for (const [x0, x1, y0, y1] of [[-14, -1.7, 0.1, H - 0.25], [1.7, 14, 0.1, H - 0.25], [-1.7, 1.7, 3.25, H - 0.25]]) { const g = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0), glass); g.position.set((x0 + x1) / 2, (y0 + y1) / 2, 19.93); g.renderOrder = 5; room.add(g); }
  room.col(-14, 19.86, -1.6, 20.3); room.col(1.6, 19.86, 14, 20.3); room.col(-1.6, 19.95, 1.6, 20.2, 0, 3);   // the street door is for NPCs only
  // ---------- ceiling: light lines, downlights, ring light over the island ----------
  room.flat(-14, z0, 14, 20, H, false, '#f3f0eb', { mat: MAT.plaster });
  for (const z of [4.2, 15.8]) { room.glowBox(-13.8, H - 0.012, z - 0.04, 13.8, H - 0.002, z + 0.04, '#fff1de', 2.2, 1, 'ny'); L.line(-13.5, H - 0.15, z, 13.5, H - 0.15, z, '#ffe8cc', 0.9, 9, 'h', [0, -1, 0]); }
  for (const x of [-10.5, -7, -3.5, 0, 3.5, 7, 10.5]) for (const z of [2.2, 6.8, 13.2, 18.4]) { if (x < -6 && z < 8.5) continue; if (Math.abs(x) < 4 && z > 6 && z < 14) continue;
    room.box(x - 0.1, H - 0.012, z - 0.1, x + 0.1, H - 0.002, z + 0.1, '#fff6e6', { glow: true, grp: 1, faces: 'ny' }); L.spot(x, H - 0.1, z, '#ffe2bf', 15, 12, 'h', [0, -1, 0], 30, 70); }
  room.kit(P.ringLightKit(2.7, 0.7), 0, H - 0.75, 10); for (let i = 0; i < 16; i++) { const a = i / 16 * PI * 2; L.point(Math.cos(a) * 2.7, H - 0.85, 10 + Math.sin(a) * 2.7, '#ffeedd', 1.5, 9, 'h'); }
  L.ambient('#fff3e6', '#e7dccd', 0.26, 'h');
  // ---------- centre island: round sofa, palm, rug ----------
  room.kit(P.ringSofaKit(2.3, '#2f5d62'), 0, 0, 10); room.kit(P.planterKit(0.75, 0.62, 'palm'), 0, 0, 10); room.col(-2.25, 7.75, 2.25, 12.25); L.occluder(-2.3, 7.7, 2.3, 12.3, 0, 0.9, 0.35);
  for (let i = 0; i < 8; i++) { const a = (i + 0.5) / 8 * PI * 2, sx = Math.sin(a), sz = Math.cos(a); sitSpot(world, 'lobby', 'sofa', sx * 1.98, 10 + sz * 1.98, a, 0.44, { x: sx * 2.95, z: 10 + sz * 2.95 }, 'sit.sofa'); }
  // ---------- columns ----------
  for (const [x, z] of [[-5.2, 3.6], [5.2, 3.6], [-7.2, 13.2], [7.2, 13.2]]) { room.kit(P.columnKit(H), x, 0, z); room.col(x - 0.35, z - 0.35, x + 0.35, z + 0.35); L.occluder(x - 0.33, z - 0.33, x + 0.33, z + 0.33, 0, 3, 0.3); }
  // ---------- box office (west wall) ----------
  room.box(-13.99, 0.12, 10.4, -13.95, 4.4, 17.9, C.oak, { faces: 'px', mat: MAT.slats });
  room.kit(P.counterKit(5.0, { ledge: true, body: C.white, front: C.oak }), -11.6, 0, 14.2, -PI / 2); room.col(-12.0, 11.65, -11.2, 16.75); L.occluder(-12.0, 11.7, -11.2, 16.7, 0, 1.1, 0.45);
  for (const z of [13.0, 15.4]) room.kit(P.posKit(), -11.55, 1.05, z, PI / 2);
  room.tex(signTexture('TICKETS', 1024, 160, { weight: 700, size: 0.62, spacing: 0.22 }), -13.93, 3.55, 14.2, PI / 2, 3.4, 0.53, { emit: 1.6, transparent: true });
  L.area(-13.6, 3.55, 14.2, [0, 0, 1.7], [0, 0.26, 0], [1, 0, 0], '#ffffff', 2.2, 8, 'f', 3, 1);
  for (const z of [12.8, 15.6]) L.spot(-10.6, H - 0.2, z, '#fff0dc', 10, 9, 'h', [-0.25, -1, 0], 20, 55);
  for (const x of [-10.1, -8.7]) { for (const z of [12.4, 14.2, 16.0]) room.kit(P.stanchionKit(), x, 0, z); room.kit(P.beltKit(1.8), x, 0, 13.3, PI / 2); room.kit(P.beltKit(1.8), x, 0, 15.1, PI / 2); room.col(x - 0.06, 12.35, x + 0.06, 16.05); }
  for (const x of [-8.4, -7.2]) { room.kit(P.kioskKit(), x, 0, 18.7, PI); room.col(x - 0.32, 18.5, x + 0.32, 18.95); }
  world.posts.receptionist = { x: -12.45, z: 14.2, yaw: PI / 2, room: 'lobby' }; world.spots.tickets = { x: -10.6, z: 14.2 };
  // ---------- bar-cafe (north-west, behind an oak screen) ----------
  room.box(-14, 3.4, z0, -6.6, 3.5, 8.4, C.oak, { mat: MAT.slats, faces: 'ny px pz' });
  for (const [x0, z0b, x1, z1] of [[-14, 8.46, -9.8, 8.54], [-6.54, z0, -6.46, 3.9]]) { room.box(x0, 0, z0b, x1, 2.5, z1, C.oak, { mat: MAT.slats }); room.col(x0, z0b - 0.02, x1, z1 + 0.02); }
  room.kit(P.planterKit(0.5, 0.36, 'bush'), -9.4, 0, 8.5); room.kit(P.planterKit(0.5, 0.36, 'bush'), -6.5, 0, 4.3); room.col(-9.8, 8.15, -9.0, 8.85); room.col(-6.9, 3.95, -6.1, 4.7);
  room.kit(P.counterKit(5.2, { body: '#26262b', front: C.walnut, top: '#f0ece6', topMat: MAT.marble }), -11.4, 0, 3.8, -PI / 2); room.col(-11.8, 1.15, -11.0, 6.45); L.occluder(-11.8, 1.2, -11.0, 6.4, 0, 1.1, 0.45);
  room.kit(P.backBarKit(5.6), -13.7, 0, 3.8, -PI / 2); room.col(-14, 0.9, -13.4, 6.7);
  for (let i = 0; i < 5; i++) { const z = 1.7 + i * 1.05; room.kit(P.stoolKit(0.76), -10.5, 0, z); room.col(-10.72, z - 0.22, -10.28, z + 0.22); sitSpot(world, 'lobby', 'stool', -10.55, z, -PI / 2, 0.76, { x: -9.75, z }, 'sit.stool'); }
  for (const z of [2.2, 6.3]) { room.kit(P.armchairKit('#c46a3c'), -8.8, 0, z, -PI / 2); room.kit(P.armchairKit('#c46a3c'), -7.15, 0, z, PI / 2); room.kit(P.lowTableKit(0.36, 0.42), -7.98, 0, z); room.col(-9.25, z - 0.42, -6.7, z + 0.42); L.occluder(-9.2, z - 0.4, -6.75, z + 0.4, 0, 0.8, 0.3);
    sitSpot(world, 'lobby', 'chair', -8.78, z, PI / 2, 0.45, { x: -8.85, z: z + (z < 4 ? 0.95 : -0.95) }, 'sit.chair'); sitSpot(world, 'lobby', 'chair', -7.17, z, -PI / 2, 0.45, { x: -7.1, z: z + (z < 4 ? 0.95 : -0.95) }, 'sit.chair'); }
  for (const z of [1.8, 3.8, 5.8]) { room.kit(P.pendantKit(0.9), -11.4, 3.4, z); L.point(-11.4, 2.3, z, '#ffc98f', 2.4, 4.5, 'h'); }
  L.area(-13.55, 2.15, 3.8, [0, 0, 2.6], [0, 0.8, 0], [1, 0, 0], '#ffb069', 2.6, 6, 'f', 4, 2);
  for (const z of [2.2, 6.3]) L.spot(-8, 3.3, z, '#ffd2a0', 3.4, 6, 'h', [0, -1, 0], 35, 75);
  room.tex(signTexture('BAR · CAFÉ', 1024, 160, { weight: 600, size: 0.5, spacing: 0.2, color: '#ffffff' }), -11.9, 1.9, 8.56, 0, 2.2, 0.34, { emit: 1.4, transparent: true });
  world.posts.bartender = { x: -12.35, z: 3.8, yaw: PI / 2, room: 'lobby' }; world.spots.bar = { x: -10.4, z: 3.8 };
  // ---------- concession stand (east) ----------
  room.kit(P.counterKit(9.0, { body: '#ff4d5a', front: '#ff4d5a', top: '#f3efe9', topMat: MAT.marble, led: '#ffd7a8' }), 11.2, 0, 10, PI / 2); room.col(10.8, 5.45, 11.6, 14.55); L.occluder(10.8, 5.5, 11.6, 14.5, 0, 1.1, 0.45);
  room.kit(P.counterKit(9.0, { depth: 0.6, body: C.white, front: C.white, top: '#2b2b30', h: 0.92 }), 13.68, 0, 10, PI / 2); room.col(13.35, 5.45, 14, 14.55);
  for (const z of [7.3, 12.7]) { room.kit(P.popcornKit(), 13.6, 0.92, z, PI / 2); L.point(13.4, 2.1, z, '#ffd889', 1.6, 4, 'f'); }
  room.kit(P.fountainKit(), 13.62, 0.92, 10, PI / 2); room.kit(P.cupStackKit(3), 13.65, 0.92, 8.8, PI / 2); room.kit(P.cupStackKit(3), 13.65, 0.92, 11.2, PI / 2);
  for (const z of [6.8, 13.2]) room.kit(P.posKit(), 11.3, 1.05, z, -PI / 2);
  ['combos', 'popcorn', 'drinks'].forEach((k, i) => { const z = 7.1 + i * 2.9; room.box(13.9, 2.78, z - 1.38, 13.97, 4.42, z + 1.38, '#1b1b1f', { mat: MAT.lacquer, faces: 'nx py ny pz nz' }); room.tex(menuTexture(k), 13.895, 3.6, z, -PI / 2, 2.6, 1.46, { emit: 1.3 });
    L.area(13.6, 3.6, z, [0, 0, 1.2], [0, 0.7, 0], [-1, 0, 0], ['#ff8a90', '#ffd08a', '#9fd8ff'][i], 1.4, 8, 'f', 2, 1); });
  room.tex(signTexture('SNACKS & POPCORN', 1024, 128, { weight: 800, size: 0.62, spacing: 0.12, color: '#ff4d5a' }), 13.93, 5.35, 10, -PI / 2, 6.4, 0.8, { emit: 1.8, transparent: true });
  for (const z of [6.6, 9.0, 11.4, 13.8]) L.spot(11.6, H - 0.2, z, '#fff4e6', 10, 9, 'h', [0.2, -1, 0], 22, 55);
  room.kit(P.candyKit(1.7, 2.0), 13.75, 0, 16.4, PI / 2); room.col(13.45, 15.5, 14, 17.3); L.area(13.5, 1.1, 16.4, [0, 0, 0.8], [0, 0.9, 0], [-1, 0, 0], '#fff0d8', 1.1, 4, 'f', 2, 2);
  for (const z of [6.4, 8.6, 10.8, 13.0, 15.2]) room.kit(P.stanchionKit(), 9.5, 0, z); for (const z of [7.5, 9.7, 11.9, 14.1]) room.kit(P.beltKit(2.2), 9.5, 0, z, PI / 2); room.col(9.44, 6.35, 9.56, 15.25);
  world.posts.vendor1 = { x: 12.15, z: 8.6, yaw: -PI / 2, room: 'lobby' }; world.posts.vendor2 = { x: 12.15, z: 11.6, yaw: -PI / 2, room: 'lobby' };
  world.spots.snacks = { x: 10.25, z: 10.0 }; world.spots.snackCounter = { x: 11.2, y: 1.06, z: 10.0 };
  // ---------- by the windows: benches, plants, bins ----------
  for (const x of [-9.5, 8.6]) { room.kit(P.benchKit(2.0, '#2f5d62'), x, 0, 17.4); room.col(x - 1.0, 17.15, x + 1.0, 17.65); for (const dx of [-0.55, 0.55]) sitSpot(world, 'lobby', 'bench', x + dx, 17.4, PI, 0.47, { x: x + dx, z: 16.55 }, 'sit.bench'); }
  for (const [x, z] of [[-13.2, 19.2], [13.2, 19.2], [-6.6, 0.95], [6.6, 0.95]]) { room.kit(P.planterKit(0.6, 0.38, 'palm'), x, 0, z); room.col(x - 0.4, z - 0.4, x + 0.4, z + 0.4); }
  for (const x of [-4.6, 4.6]) { room.kit(P.binKit(), x, 0, 19.3); room.col(x - 0.22, 19.08, x + 0.22, 19.52); }
  // ---------- LED video wall over the opening, usher's guide stand ----------
  room.box(-6.2, 4.82, z0, 6.2, 6.82, z0 + 0.1, '#16161a', { mat: MAT.lacquer, faces: 'pz py ny px nx' });
  const led = makeCanvas(1024, 160); world.ledWall = { canvas: led, texture: null }; const ledTex = new THREE.CanvasTexture(led); ledTex.colorSpace = THREE.SRGBColorSpace; world.ledWall.texture = ledTex;
  room.tex(ledTex, 0, 5.82, z0 + 0.105, 0, 12.0, 1.875, { emit: 1.35 }); L.area(0, 5.8, 0.6, [6, 0, 0], [0, 0.9, 0], [0, 0, 1], '#b9c6ff', 5.5, 14, 'f', 4, 1);
  room.kit(P.podiumKit(), 2.5, 0, 1.25, PI); room.col(2.15, 1.0, 2.85, 1.5);
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
export function buildConcourse(ctx) {
  const { world } = ctx, room = new Room('conc', { ceil: CONC.h, rect: [CONC.x0, CONC.z0, CONC.x1, -0.15], soft: 0.3 }), L = room.lights, H = CONC.h, zN = CONC.z0, zS = -0.15, wallC = '#eeeae3', skirt = { h: 0.12, color: '#2a2b30', mat: MAT.lacquer };
  room.flat(CONC.x0, zN, CONC.x1, zS, 0, true, C.terrazzo, { mat: MAT.terrazzo }); room.flat(OPEN.x0, zS, OPEN.x1, 0.15, 0, true, C.terrazzo, { mat: MAT.terrazzo });
  room.flat(-11, zN + 0.6, 11, zN + 2.6, 0.006, true, '#2a2c33', { mat: MAT.carpet });
  room.flat(CONC.x0, zN, CONC.x1, zS, H, false, '#f3f0eb', { mat: MAT.plaster });
  const pg = PASSAGES.map((p) => [p.x0, p.x1, 2.6]);
  room.wall('x', zN, CONC.x0, CONC.x1, 0, H, 1, wallC, pg, { mat: MAT.plaster, thick: 0.3, skirt });
  room.wall('x', zS, CONC.x0, CONC.x1, 0, H, -1, wallC, [[OPEN.x0, OPEN.x1, OPEN.h]], { mat: MAT.plaster, thick: 0.3, skirt });
  for (const [x, d] of [[CONC.x0, 1], [CONC.x1, -1]]) room.wall('z', x, zN, zS, 0, H, d, wallC, [], { mat: MAT.plaster, thick: 0.3, skirt });
  // passage openings: dark reveals + header signs
  for (const p of PASSAGES) { for (const x of [p.x0, p.x1]) room.box(x - 0.001, 0, zN - 0.3, x + 0.001, 2.6, zN, '#2a2b30', { faces: x === p.x0 ? 'px' : 'nx', mat: MAT.metal }); room.box(p.x0, 2.599, zN - 0.3, p.x1, 2.601, zN, '#2a2b30', { faces: 'ny', mat: MAT.metal });
    const [a, b] = p.key === 'passW' ? ['1', '3'] : ['3', '2']; room.tex(screensSign(a, b), (p.x0 + p.x1) / 2, 3.3, zN + 0.012, 0, 2.6, 0.62, { emit: 1.5, transparent: true });
    L.point((p.x0 + p.x1) / 2, 3.0, zN + 0.8, '#ffffff', 1.4, 5, 'f'); }
  // poster light boxes along the north wall
  FILMS.forEach((f, i) => { const x = -8.75 + i * 3.5; room.kit(P.lightboxKit(1.2, 1.8), x, 0.95, zN, 0); room.tex(posterTexture(f), x, 1.85, zN + 0.07, 0, 1.2, 1.8, { emit: 1.25 }); L.area(x, 1.85, zN + 0.3, [0.6, 0, 0], [0, 0.9, 0], [0, 0, 1], '#fff0e0', 1.1, 5, 'f', 2, 2); });
  // light slots along the ceiling
  for (const z of [-1.6, -4.4]) { room.glowBox(-14.6, H - 0.012, z - 0.04, 14.6, H - 0.002, z + 0.04, '#fff1de', 2.2, 1, 'ny'); L.line(-14.4, H - 0.15, z, 14.4, H - 0.15, z, '#ffe8cc', 1.0, 8, 'h', [0, -1, 0]); }
  L.ambient('#fff3e6', '#e7dccd', 0.22, 'h');
  for (const x of [-4.5, 4.5]) { room.kit(P.benchKit(1.8, '#2f5d62'), x, 0, -1.2, PI); room.col(x - 0.9, -1.45, x + 0.9, -0.95); for (const dx of [-0.5, 0.5]) sitSpot(world, 'conc', 'bench', x + dx, -1.2, PI, 0.47, { x: x + dx, z: -2.1 }, 'sit.bench'); }
  for (const x of [-10.0, 10.0]) { room.kit(P.planterKit(0.6, 0.38, 'bush'), x, 0, -5.4); room.col(x - 0.4, -5.8, x + 0.4, -5.0); }
  // restrooms at the ends (doors only)
  for (const [x, s, label] of [[CONC.x0, 1, 'RESTROOMS'], [CONC.x1, -1, 'RESTROOMS']]) { room.kit(P.doorSlabKit(1.0, 2.2), x + s * 0.001, 0, -3.1, s > 0 ? PI / 2 : -PI / 2); room.tex(signTexture(label, 512, 96, { weight: 600, size: 0.42, spacing: 0.2 }), x + s * 0.04, 2.6, -3.1, s > 0 ? PI / 2 : -PI / 2, 1.4, 0.26, { emit: 1.2, transparent: true }); }
  return room;
}
function screensSign(a, b) {
  const w = 1024, h = 244, c = makeCanvas(w, h), g = c.getContext('2d'); g.fillStyle = '#16161a'; g.fillRect(0, 0, w, h); g.fillStyle = '#ff4d5a'; g.fillRect(0, h - 10, w, 10);
  g.fillStyle = '#fff'; g.textBaseline = 'middle'; g.font = '700 70px Inter, sans-serif'; g.textAlign = 'left'; g.fillText('← ' + a, 50, h / 2); g.textAlign = 'right'; g.fillText(b + ' →', w - 50, h / 2);
  g.textAlign = 'center'; g.font = '500 38px Inter, sans-serif'; g.fillStyle = 'rgba(255,255,255,.75)'; g.fillText('SCREENS', w / 2, h / 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export function buildStreet(ctx) {
  const room = new Room('street', { ceil: 40, rect: null, soft: 0.3, maxEdge: 3 }), L = room.lights;
  room.flat(-40, 20.0, 40, 26, 0, true, '#8a8782', { mat: MAT.tile, edge: 1.5 }); room.box(-40, -0.15, 26, 40, 0, 26.25, '#a8a49d', { faces: 'pz py', mat: MAT.concrete });
  room.flat(-40, 26.25, 40, 33.2, -0.15, true, '#202125', { mat: MAT.concrete, edge: 2 }); for (let x = -39; x < 40; x += 4) room.flat(x, 29.65, x + 2, 29.8, -0.14, true, '#d8d6cf', { mat: MAT.paint, edge: 4 });
  room.box(-40, -0.15, 33.2, 40, 0, 33.45, '#a8a49d', { faces: 'nz py', mat: MAT.concrete }); room.flat(-40, 33.45, 40, 37, 0, true, '#8a8782', { mat: MAT.tile, edge: 1.5 });
  // canopy over the entrance
  room.box(-3.2, 3.05, 20.0, 3.2, 3.25, 22.2, '#2a2b30', { mat: MAT.metal, faces: 'ny py pz px nx' }); for (const x of [-2, 0, 2]) { room.box(x - 0.12, 3.04, 21.0, x + 0.12, 3.05, 21.24, '#fff3df', { glow: true, faces: 'ny' }); L.spot(x, 3.0, 21.1, '#ffe0b8', 3.0, 6, 'f', [0, -1, 0], 30, 70); }
  // buildings across the road: lit windows, shop fronts
  const B = [[-40, -19, 14, 1, 25], [-19, -3, 10, 2, 210], [-3, 15, 16, 3, 35], [15, 40, 12, 4, 200]], shops = [['CAFÉ LUNA', '#1f2b3a', '#ffb547'], ['BOOKS & CO', '#2a1b1b', '#ff6b6b'], ['NOODLE BAR', '#1b2a22', '#7bd389'], ['PHARMACY', '#14262f', '#4cc3ff']];
  B.forEach(([x0, x1, h, seed, hue], i) => { const t = facadeTexture(seed, hue); room.tex(t, (x0 + x1) / 2, 3.4 + (h - 3.4) / 2, 37.0, PI, x1 - x0, h - 3.4, { emit: 0.55, repeat: [(x1 - x0) / 5, (h - 3.4) / 5] });
    room.box(x0, 0, 37.0, x1, 3.4, 37.3, '#15161a', { faces: 'nz', mat: MAT.paint }); const [n, a, b] = shops[i]; room.tex(shopTexture(n, a, b), (x0 + x1) / 2, 2.0, 36.97, PI, Math.min(8, x1 - x0 - 2), 2.0, { emit: 1.4 });
    L.area((x0 + x1) / 2, 1.6, 36.4, [Math.min(4, (x1 - x0) / 2 - 1), 0, 0], [0, 0.9, 0], [0, 0, -1], b, 2.2, 10, 'f', 3, 1); room.box(x0, h, 37.0, x1, h + 0.4, 37.4, '#121316', { faces: 'nz py', mat: MAT.paint }); });
  for (const z of [25.6, 33.7]) for (const x of [-26, -13, 13, 26]) { room.kit(P.lampPostKit(6), x, 0, z, z < 30 ? PI : 0); L.point(x, 5.7, z + (z < 30 ? 0.9 : -0.9), '#ffd7a0', 9, 15, 'f'); }
  for (const [x, c] of [[-9, '#7a1c24'], [10.5, '#22324a'], [-22, '#c9c4b8']]) room.kit(P.carKit(c), x, -0.15, 27.4, PI / 2);
  L.ambient('#3a4766', '#151820', 0.16, 'f');
  return room;
}
