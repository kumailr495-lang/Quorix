// LUMIERE v7 - the lobby and the arrival plaza in front of it, rebuilt after Allu Cinemas (docs/V7-DESIGN.md; the user's reference photos).
// Lobby: polished Nero Marquina floor with flowing brass inlay lines that lead from the doors round the centre to the portal, a brass star
// at the doors, an elliptical coffer with the cascade chandelier, Rosso Levanto columns with brass fins, a marble feature wall with gold
// LUMIERE letters behind the box office, an open bar (backlit onyx back bar, fluted counter, ring pendants), the candy bar, a lounge, and a
// red carpet between stanchions to the lit portal (ticket check). Plaza: perforated metal facade lit from behind, a deep canopy on four
// bronze columns with face-lit gold letters, red carpet and stanchions from the kerb, poster lightboxes, hedge planters, bollards.
import * as THREE from 'three';
import { Room } from './room.js';
import { MAT, M, col, stripGeo, ellipse, spline, rrectPts, flatShape } from './geom.js';
import * as P from './props.js';
import { LOBBY, OPEN } from './layout.js';
import { menuTexture, shopTexture, makeCanvas, neonTexture, SERIF } from './textures.js';
import { posterURL } from './films.js';
// v8: the lobby advertises the real open films (their posters, tools/films/posters.py); one texture per film, shared by every frame it hangs in
const POSTERS = {};
function posterTexture(id) { if (!POSTERS[id]) { const tx = new THREE.TextureLoader().load(posterURL(id)); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4; POSTERS[id] = tx; } return POSTERS[id]; }
function signTexture(text, color) { const c = makeCanvas(256, 48), g = c.getContext('2d'); g.fillStyle = '#05080c'; g.fillRect(0, 0, 256, 48); g.fillStyle = color; g.font = `600 30px ${SERIF}`; g.textAlign = 'center'; g.textBaseline = 'middle'; if ('letterSpacing' in g) g.letterSpacing = '10px'; g.fillText(text, 133, 26); const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx; }
import { placeAsset } from './assets.js';
const PI = Math.PI;
const BRASS = '#c9a061', CARPET_RED = '#6e0f1a', CHAR = '#19171a';
// seat helper: registers a sit spot (player + NPCs). face = direction the sitter looks (radians, 0 = +z); stand = where you stand up to
function sitSpot(world, room, kind, x, z, face, seatY, stand, label) { world.sitSpots.push({ id: 'sp' + world.sitSpots.length, kind, room, x, z, y: seatY, face, stand, label, taken: null }); }
const starPts = (cx, cz, R, r, n = 8, rot = PI / 8) => Array.from({ length: n * 2 }, (_, k) => { const a = rot + k * PI / n, rr = k % 2 ? r : R; return [cx + rr * Math.sin(a), cz + rr * Math.cos(a)]; });
export function buildLobby(ctx) {
  const { world, mats } = ctx, room = new Room('lobby', { ceil: LOBBY.h, rect: [LOBBY.x0, 0.15, LOBBY.x1, LOBBY.z1], soft: 0.3 }), L = room.lights, H = LOBBY.h, z0 = 0.15;
  const warm = '#ffcf9a', COF = { x: 0, z: 10.0, rx: 6.0, rz: 4.2, top: H + 1.45 };
  // ---------- floor: polished black marble; brass inlay lines (props layer: lit per vertex, too thin for light-map texels) ----------
  room.flat(-14, z0, 14, 20, 0, true, '#ffffff', { mat: MAT.nero, edge: 0.7 });
  const inlay = (pts, w, closed = false) => room.pacc.add(stripGeo(pts, w, 0.003, true, closed), null, BRASS, { mat: MAT.brass });
  for (const s of [-1, 1]) for (const [k, off] of [[0, 1.85], [1, 2.35], [2, 2.85]]) {   // three lines a side: doors -> round the coffer -> the portal
    inlay(spline([[s * (off - 0.2), 19.0], [s * (off + 0.6), 16.0], [s * (5.6 + k * 0.5), 12.4], [s * (5.9 + k * 0.5), 9.6], [s * (4.4 + k * 0.4), 6.2], [s * (off + 0.35), 3.0], [s * (off - 0.05), 0.9]], 90), 0.022);
  }
  inlay(ellipse(COF.x, COF.z, COF.rx - 0.35, COF.rz - 0.3, 120), 0.03, true);   // the coffer's outline repeated on the floor
  // brass star at the doors (8 points, double outline, pale marble inside)
  room.acc.add(flatShape(starPts(0, 16.3, 1.55, 0.62), [], 0.002), null, '#ffffff', { mat: MAT.calacatta });
  inlay(starPts(0, 16.3, 1.55, 0.62), 0.03, true); inlay(starPts(0, 16.3, 1.82, 0.74), 0.022, true);
  // red carpet from the portal to the centre, edged in brass
  room.flat(-1.2, z0, 1.2, 8.6, 0.004, true, CARPET_RED, { mat: MAT.carpet });
  for (const s of [-1, 1]) room.pacc.add(stripGeo([[s * 1.22, z0], [s * 1.22, 8.6]], 0.03, 0.005), null, BRASS, { mat: MAT.brass });
  room.pacc.add(stripGeo([[-1.24, 8.62], [1.24, 8.62]], 0.03, 0.005), null, BRASS, { mat: MAT.brass });
  // ---------- walls ----------
  const skirt = { h: 0.1, color: '#0d0d0f', mat: MAT.lacquer };
  room.wall('x', z0, -14, 14, 0, H, 1, CHAR, [[OPEN.x0, OPEN.x1, OPEN.h]], { mat: MAT.plaster, thick: 0.3, skirt });
  room.wall('z', -14, z0, 20, 0, H, 1, CHAR, [], { mat: MAT.plaster, thick: 0.3, skirt });
  room.wall('z', 14, z0, 20, 0, H, -1, CHAR, [], { mat: MAT.plaster, thick: 0.3, skirt });
  // north wall: black marble panels to 4.6 m between brass strips, with a brass band on top (the portal sits in the middle)
  for (const [a0, a1] of [[-14, OPEN.x0 - 0.62], [OPEN.x1 + 0.62, 14]]) {
    room.box(a0, 0.1, z0, a1, 4.6, z0 + 0.03, '#ffffff', { mat: MAT.nero, faces: 'pz', edge: 1.2 });
    for (let x = a0 + 2.35; x < a1 - 0.5; x += 2.35) room.box(x - 0.012, 0.1, z0 + 0.03, x + 0.012, 4.6, z0 + 0.04, BRASS, { mat: MAT.brass, faces: 'pz px nx' });
    room.box(a0, 4.6, z0 + 0.03, a1, 4.64, z0 + 0.045, BRASS, { mat: MAT.brass, faces: 'pz py ny' });
  }
  // the portal: a deep black-marble frame with a brass reveal, header light line
  for (const s of [-1, 1]) { const xi = s < 0 ? OPEN.x0 : OPEN.x1, xo = xi + s * 0.6;
    room.box(Math.min(xi, xo), 0, z0, Math.max(xi, xo), OPEN.h + 0.6, z0 + 0.12, '#ffffff', { mat: MAT.nero, faces: 'pz py ' + (s < 0 ? 'nx' : 'px') });
    room.box(xi - 0.002, 0, -0.15, xi + 0.002, OPEN.h, z0 + 0.12, BRASS, { faces: s < 0 ? 'px' : 'nx', mat: MAT.brass }); }
  room.box(OPEN.x0, OPEN.h, z0, OPEN.x1, OPEN.h + 0.6, z0 + 0.12, '#ffffff', { mat: MAT.nero, faces: 'pz ny' });
  room.box(OPEN.x0, OPEN.h - 0.001, -0.15, OPEN.x1, OPEN.h + 0.001, z0 + 0.12, '#1a1a1d', { faces: 'ny', mat: MAT.paint });
  room.box(OPEN.x0 + 0.1, OPEN.h - 0.06, z0 + 0.06, OPEN.x1 - 0.1, OPEN.h - 0.03, z0 + 0.13, '#ffe0b4', { glow: true, faces: 'ny pz' });
  L.area(0, OPEN.h - 0.1, 0.5, [3.3, 0, 0], [0, 0, 0.1], [0, -1, 0], '#ffdcae', 2.4, 7, 'h', 4, 1);
  // west feature wall (box office): black marble in brass frames, gold LUMIERE letters and CINEMAS under them
  const FW = { z0: 10.4, z1: 18.6, y1: 6.4 };
  room.box(-14, 0.1, FW.z0, -13.97, FW.y1, FW.z1, '#ffffff', { mat: MAT.nero, faces: 'px pz nz py', edge: 1.2 });
  for (const z of [FW.z0, (FW.z0 * 2 + FW.z1) / 3, (FW.z0 + FW.z1 * 2) / 3, FW.z1]) room.box(-13.97, 0.1, z - 0.012, -13.96, FW.y1, z + 0.012, BRASS, { mat: MAT.brass, faces: 'px pz nz' });
  for (const y of [0.1, FW.y1 - 0.024]) room.box(-13.97, y, FW.z0, -13.958, y + 0.024, FW.z1, BRASS, { mat: MAT.brass, faces: 'px py ny' });
  room.tex(haloTexture('LUMIÈRE'), -13.966, 4.75, 14.5, PI / 2, 5.2, 1.4, { emit: 1.6, transparent: true });   // the warm halo the letters stand in
  placeAsset(room, 'letters_lumiere', -13.97, 4.45, 14.5, PI / 2, { scale: 0.6 });
  placeAsset(room, 'letters_cinemas', -13.97, 3.92, 14.5, PI / 2, { scale: 0.15 });
  for (const z of [12.0, 14.5, 17.0]) L.spot(-12.4, H - 0.15, z, '#ffd6a6', 7, 9, 'h', [-0.55, -1, 0], 16, 42);   // grazers: the marble and the letters
  // east wall (candy bar): black lacquer back panel in a brass frame
  room.box(13.96, 0.1, 3.0, 14, 5.8, 15.25, '#141215', { mat: MAT.lacquer, faces: 'nx pz nz py' });
  for (const y of [0.1, 5.78]) room.box(13.95, y, 3.0, 13.96, y + 0.022, 15.25, BRASS, { mat: MAT.brass, faces: 'nx py ny' });
  // ---------- columns: Rosso Levanto with brass corner fins and a poster screen facing the centre ----------
  const posters = ['cosmos', 'sintel', 'bunny', 'hero'];
  [[-7.6, 5.0], [7.6, 5.0], [-7.6, 15.0], [7.6, 15.0]].forEach(([x, z], i) => { const h = 0.45;
    room.box(x - h, 0, z - h, x + h, H, z + h, '#ffffff', { mat: MAT.rosso, faces: 'px nx pz nz', edge: 1.2 });
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) room.box(x + sx * h - (sx > 0 ? 0.012 : 0.03), 0, z + sz * h - (sz > 0 ? 0.012 : 0.03), x + sx * h + (sx > 0 ? 0.03 : 0.012), H, z + sz * h + (sz > 0 ? 0.03 : 0.012), BRASS, { mat: MAT.brass, faces: 'px nx pz nz' });
    room.box(x - h - 0.02, 0, z - h - 0.02, x + h + 0.02, 0.12, z + h + 0.02, '#0d0d0f', { mat: MAT.lacquer, faces: 'px nx pz nz py' });
    const fx = x < 0 ? x + h + 0.035 : x - h - 0.035; room.tex(posterTexture(posters[i]), fx, 2.1, z, x < 0 ? PI / 2 : -PI / 2, 0.66, 0.99, { emit: 1.15 });
    room.box(Math.min(fx, x < 0 ? x + h : x - h), 1.56, z - 0.36, Math.max(fx, x < 0 ? x + h : x - h), 2.64, z + 0.36, '#0a0a0c', { mat: MAT.lacquer, faces: (x < 0 ? 'px' : 'nx') + ' py ny pz nz' });
    room.col(x - h - 0.05, z - h - 0.05, x + h + 0.05, z + h + 0.05); L.occluder(x - h, z - h, x + h, z + h, 0, H, 0.35);
    L.spot(x + (x < 0 ? 0.75 : -0.75), 0.1, z, '#ffc98e', 2.6, 6, 'h', [x < 0 ? -0.18 : 0.18, 1, 0], 12, 32); });
  // ---------- ceiling: charcoal with an elliptical coffer (red lacquer band, black gloss dome, cove light) and light lines round it ----------
  room.acc.add(flatShape([[-14, z0], [14, z0], [14, 20], [-14, 20]], [ellipse(COF.x, COF.z, COF.rx, COF.rz, 96).reverse()], H, false), null, '#171519', { mat: MAT.paint });
  { const n = 96, pos = [], nrm = [], idx = [];   // coffer band: an elliptical wall from the ceiling up to the dome, facing the axis
    for (let k = 0; k <= n; k++) { const t = k / n * PI * 2, c = Math.cos(t), s = Math.sin(t), nx = -c / COF.rx, nz = -s / COF.rz, l = Math.hypot(nx, nz);
      for (const y of [H, COF.top]) { pos.push(COF.x + COF.rx * c, y, COF.z + COF.rz * s); nrm.push(nx / l, 0, nz / l); } }
    for (let k = 0; k < n; k++) { const a = 2 * k, b = a + 1, c = a + 2, d = a + 3; idx.push(a, c, b, b, c, d); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); g.setIndex(idx);
    room.acc.add(g, null, '#5c0f16', { mat: MAT.lacquer }); }
  room.acc.add(flatShape(ellipse(COF.x, COF.z, COF.rx + 0.01, COF.rz + 0.01, 96), [], COF.top, false), null, '#0c0b0e', { mat: MAT.lacquer });
  for (let k = 0; k < 24; k++) { const t = k / 24 * PI * 2; room.gacc.add(stripGeo([[COF.x + 0.6 * Math.cos(t), COF.z + 0.42 * Math.sin(t)], [COF.x + (COF.rx - 0.25) * Math.cos(t), COF.z + (COF.rz - 0.2) * Math.sin(t)]], 0.012, COF.top - 0.004, false), null, col('#ffd7a0').map((v) => v * 0.55), { grp: 0 }); }
  room.gacc.add(stripGeo(ellipse(COF.x, COF.z, COF.rx - 0.04, COF.rz - 0.04, 120), 0.05, H + 0.02, false, true), null, col('#ffc48a').map((v) => v * 0.9), { grp: 0 });
  for (const [rx, rz] of [[COF.rx + 0.7, COF.rz + 0.6], [COF.rx + 1.35, COF.rz + 1.2]]) room.gacc.add(stripGeo(ellipse(COF.x, COF.z, rx, rz, 140), 0.035, H - 0.004, false, true), null, col('#ffe2bc'), { grp: 0 });
  for (const [w, d] of [[1.7, 4.0], [1.25, 3.55], [0.8, 3.1]]) room.gacc.add(stripGeo(rrectPts(0, 3.1, w, d, Math.min(w, d) / 2 - 0.02), 0.03, H - 0.004, false, true), null, col('#fff0dc'), { grp: 0 });
  for (let k = 0; k < 12; k++) { const t = k / 12 * PI * 2; L.point(COF.x + (COF.rx - 0.6) * Math.cos(t), H + 0.25, COF.z + (COF.rz - 0.5) * Math.sin(t), '#ffbe80', 1.2, 6, 'h'); }
  L.area(0, H - 0.05, 3.1, [0.8, 0, 0], [0, 0, 2.0], [0, -1, 0], '#fff0dc', 3.0, 9, 'h', 2, 3);
  // the chandelier: the hero (tools/kiln/chandelier_cascade.kiln.js); its light as points round the ribbons and the core
  placeAsset(room, 'chandelier_cascade', COF.x, COF.top, COF.z, 0, { glowK: 1.25 });
  for (let k = 0; k < 8; k++) { const t = k / 8 * PI * 2; L.point(COF.x + 2.3 * Math.cos(t), H - 0.5, COF.z + 1.6 * Math.sin(t), '#ffd6a0', 3.2, 12, 'h'); }
  L.point(COF.x, COF.top - 2.9, COF.z, '#ffd9a8', 9, 14, 'h'); L.point(COF.x, COF.top - 3.6, COF.z, '#ffd9a8', 6, 12, 'h');
  // downlights (recessed, glowing discs) over the counters, the lounge, the doors and the portal
  const dl = (x, z, I = 9, r = 9) => { room.box(x - 0.08, H - 0.012, z - 0.08, x + 0.08, H - 0.002, z + 0.08, '#fff1dc', { glow: true, faces: 'ny' }); L.spot(x, H - 0.1, z, warm, I, r, 'h', [0, -1, 0], 18, 46); };
  for (const z of [12.2, 14.2, 16.2]) dl(-11.0, z, 8);
  for (const z of [6.6, 9.0, 11.4, 13.8]) dl(11.5, z, 8);
  for (const [x, z] of [[6.2, 17.2], [9.8, 17.2], [-2.6, 18.6], [2.6, 18.6], [-2.6, 1.4], [2.6, 1.4], [-11.0, 9.0], [11.0, 1.8], [-4.4, 11.4], [4.4, 11.4]]) dl(x, z, 7);
  L.ambient('#ffd7ad', '#4a3226', 0.12, 'h');
  // ---------- the open bar (north-west): onyx back bar, stadium counter, ring pendants, stools; lounge chairs on a rug ----------
  placeAsset(room, 'back_bar_onyx', -13.43, 0, 4.6, PI / 2);
  room.col(-14, 1.75, -13.4, 7.45); L.area(-13.3, 2.1, 4.6, [0, 0, 2.7], [0, 1.0, 0], [1, 0, 0], '#ffb862', 2.4, 7, 'h', 4, 2);
  placeAsset(room, 'bar_counter', -11.35, 0, 4.6, PI / 2);
  room.col(-11.72, 2.15, -10.98, 7.05); L.occluder(-11.72, 2.2, -10.98, 7.0, 0, 1.1, 0.45);
  for (const z of [3.0, 4.6, 6.2]) { placeAsset(room, 'pendant_ring', -11.35, H - 5.2, z, 0, { glowK: 1.0 }); L.point(-11.35, H - 5.25, z, '#ffd09a', 1.6, 4.5, 'h'); L.spot(-11.35, H - 5.3, z, '#ffd09a', 2.6, 4, 'h', [0, -1, 0], 40, 75); }
  for (let i = 0; i < 5; i++) { const z = 2.7 + i * 0.95; placeAsset(room, 'bar_stool', -10.45, 0, z, 0, { swap: { velvet_teal: [MAT.leather, col('#3a1014')] } }); room.col(-10.67, z - 0.22, -10.23, z + 0.22); sitSpot(world, 'lobby', 'stool', -10.5, z, -PI / 2, 0.76, { x: -9.7, z }, 'sit.stool'); }
  room.flat(-9.9, 1.0, -6.6, 7.9, 0.006, true, '#ffffff', { mat: MAT.deco });
  for (const z of [2.2, 6.3]) { const sw = { swap: { velvet_mustard: [MAT.velvet, col('#5e1220')] } };
    placeAsset(room, 'armchair_deco', -8.85, 0, z, PI / 2, sw); placeAsset(room, 'armchair_deco', -7.15, 0, z, -PI / 2, sw); placeAsset(room, 'side_table', -8.0, 0, z);
    room.col(-9.3, z - 0.42, -6.7, z + 0.42); L.occluder(-9.2, z - 0.4, -6.75, z + 0.4, 0, 0.8, 0.3);
    sitSpot(world, 'lobby', 'chair', -8.8, z, PI / 2, 0.45, { x: -8.85, z: z + (z < 4 ? 0.95 : -0.95) }, 'sit.chair'); sitSpot(world, 'lobby', 'chair', -7.2, z, -PI / 2, 0.45, { x: -7.1, z: z + (z < 4 ? 0.95 : -0.95) }, 'sit.chair'); }
  room.tex(neonTexture('Le Bar', '#f0c27a', 1024, 220, { size: 0.55, weight: 500, font: 'serif', spacing: 0.06 }), -13.27, 3.25, 4.6, PI / 2, 2.4, 0.52, { emit: 1.5, transparent: true });
  world.posts.bartender = { x: -12.5, z: 4.6, yaw: PI / 2, room: 'lobby' }; world.spots.bar = { x: -10.3, z: 4.6 };
  // ---------- box office (west, in front of the feature wall) ----------
  for (const z of [12.4, 14.5, 16.6]) placeAsset(room, 'counter_module', -11.6, 0, z, PI / 2, { swap: { walnut: [MAT.fluted, col('#1c1b1d')] } });
  room.col(-12.0, 11.4, -11.2, 17.6); L.occluder(-12.0, 11.4, -11.2, 17.6, 0, 1.1, 0.45);
  for (const z of [13.4, 15.6]) placeAsset(room, 'pos_terminal', -11.5, 1.08, z, PI / 2);
  world.posts.receptionist = { x: -12.45, z: 14.5, yaw: PI / 2, room: 'lobby' }; world.spots.tickets = { x: -10.6, z: 14.5 };
  for (const x of [-10.1, -8.7]) { for (const z of [12.6, 14.4, 16.2]) placeAsset(room, 'stanchion', x, 0, z); for (const z of [13.5, 15.3]) placeAsset(room, 'rope_velvet', x, 0, z, PI / 2); room.col(x - 0.08, 12.5, x + 0.08, 16.3); }
  for (const x of [-8.6, -7.4]) { placeAsset(room, 'kiosk', x, 0, 18.85, PI, { swap: { walnut: [MAT.lacquer, col('#141416')] } }); room.col(x - 0.32, 18.55, x + 0.32, 19.15); }
  // ---------- candy bar (east): black fluted counters, back counter with popcorn and drinks, menu screens, pick-and-mix wall ----------
  for (let i = 0; i < 5; i++) placeAsset(room, 'counter_module', 11.2, 0, 6.35 + i * 1.8, -PI / 2, { scale: [0.9, 1, 1], swap: { walnut: [MAT.fluted, col('#1c1b1d')] } });
  room.col(10.8, 5.45, 11.6, 14.55); L.occluder(10.8, 5.5, 11.6, 14.5, 0, 1.1, 0.45);
  room.kit(P.counterKit(9.0, { depth: 0.6, body: '#141416', front: '#141416', top: '#2b2b30', h: 0.92 }), 13.62, 0, 10, PI / 2); room.col(13.3, 5.45, 14, 14.55);
  for (const z of [7.3, 12.7]) { placeAsset(room, 'popcorn_machine', 13.56, 0.92, z, -PI / 2); L.point(13.25, 1.6, z, '#ffd889', 1.8, 4, 'h'); }
  placeAsset(room, 'drinks_fountain', 13.6, 0.92, 10, -PI / 2); room.kit(P.cupStackKit(3), 13.6, 0.92, 8.8, PI / 2); room.kit(P.cupStackKit(3), 13.6, 0.92, 11.2, PI / 2);
  for (const z of [6.8, 13.2]) placeAsset(room, 'pos_terminal', 11.25, 1.08, z, -PI / 2);
  ['combos', 'popcorn', 'drinks'].forEach((k, i) => { const z = 6.15 + i * 3.85;
    room.box(13.9, 2.62, z - 1.52, 13.955, 4.62, z + 1.52, BRASS, { mat: MAT.brass, faces: 'nx py ny pz nz' });
    room.tex(menuTexture(k), 13.895, 3.62, z, -PI / 2, 2.9, 1.63, { emit: 1.3 });
    L.area(13.6, 3.6, z, [0, 0, 1.3], [0, 0.8, 0], [-1, 0, 0], ['#ff9a90', '#ffd08a', '#a8dcff'][i], 1.1, 8, 'h', 2, 1); });
  room.tex(neonTexture('POPCORN  ·  DRINKS  ·  SWEETS', '#ffcf7a', 2048, 200, { size: 0.42, weight: 600, spacing: 0.16 }), 13.93, 5.25, 9.1, -PI / 2, 9.0, 0.88, { emit: 1.6, transparent: true });
  L.area(13.6, 5.25, 9.1, [0, 0, 4.0], [0, 0.3, 0], [-1, 0, 0], '#ffcf7a', 1.6, 9, 'h', 4, 1);
  placeAsset(room, 'candy_wall', 13.68, 0, 16.6, -PI / 2); room.col(13.45, 15.7, 14, 17.5); L.area(13.5, 1.1, 16.6, [0, 0, 0.8], [0, 0.9, 0], [-1, 0, 0], '#fff0d8', 1.1, 4, 'h', 2, 2);
  for (const z of [6.4, 8.6, 10.8, 13.0, 15.2]) placeAsset(room, 'stanchion', 9.5, 0, z); for (const z of [7.5, 9.7, 11.9, 14.1]) placeAsset(room, 'rope_velvet', 9.5, 0, z, PI / 2); room.col(9.42, 6.3, 9.58, 15.3);
  world.posts.vendor1 = { x: 12.15, z: 8.6, yaw: -PI / 2, room: 'lobby' }; world.posts.vendor2 = { x: 12.15, z: 11.6, yaw: -PI / 2, room: 'lobby' };
  world.spots.snacks = { x: 10.25, z: 10.0 }; world.spots.snackCounter = { x: 11.2, y: 1.09, z: 10.0 };
  // ---------- lounge (south-east, by the glass): curved ivory sofa, two armchairs, marble table on a rug ----------
  room.flat(4.6, 14.9, 11.4, 19.5, 0.006, true, '#3a2c2a', { mat: MAT.carpet });
  placeAsset(room, 'sofa_curve', 8.0, 0, 18.75, PI);   // sitters face north, the arc's centre is 2 m in front of the seat edge (z 16.75)
  placeAsset(room, 'table_lounge', 8.0, 0, 17.0, 0); room.col(7.45, 16.45, 8.55, 17.55);
  room.col(6.3, 18.55, 9.7, 19.45); L.occluder(6.3, 18.55, 9.7, 19.45, 0, 0.86, 0.35);
  for (const a of [-27, -9, 9, 27]) { const r = 2.3, t = a * PI / 180, x = 8.0 + r * Math.sin(t), z = 16.75 + r * Math.cos(t);
    sitSpot(world, 'lobby', 'sofa', x, z, PI + t, 0.44, { x: 8.0 + 1.55 * Math.sin(t), z: 16.75 + 1.55 * Math.cos(t) }, 'sit.sofa'); }
  for (const s of [-1, 1]) { const x = 8.0 + s * 1.55, z = 15.65, sw = { swap: { velvet_mustard: [MAT.velvet, col('#5e1220')] } };
    placeAsset(room, 'armchair_deco', x, 0, z, -s * 0.35, sw); room.col(x - 0.42, z - 0.42, x + 0.42, z + 0.42); sitSpot(world, 'lobby', 'chair', x, z, -s * 0.35, 0.45, { x: x + s * 0.75, z }, 'sit.chair'); }
  // ---------- the red carpet to the portal: brass stanchions with velvet ropes; usher's podium and guide totem ----------
  for (const s of [-1, 1]) { for (const z of [2.6, 4.4, 6.2, 8.0]) placeAsset(room, 'stanchion', s * 1.6, 0, z); for (const z of [3.5, 5.3, 7.1]) placeAsset(room, 'rope_velvet', s * 1.6, 0, z, PI / 2); room.col(s * 1.6 - 0.08, 2.5, s * 1.6 + 0.08, 8.1); }
  placeAsset(room, 'usher_podium', 2.55, 0, 1.05, 0, { swap: { walnut: [MAT.fluted, col('#1c1b1d')] } }); room.col(2.2, 0.7, 2.9, 1.4);
  room.kit(P.totemKit(1.9, 0.6), -2.6, 0, 1.0, PI); room.col(-2.95, 0.8, -2.25, 1.2);
  room.tex(guideTexture(), -2.6, 1.0, 1.048, 0, 0.56, 1.76, { emit: 1.25 });
  world.posts.usher = { x: 1.95, z: 1.5, yaw: 0, room: 'lobby' }; world.spots.usherAsk = { x: 1.0, z: 2.6 };
  // ---------- LED wall over the portal (the programme), planters, bins ----------
  room.box(-6.2, 5.05, z0, 6.2, 7.05, z0 + 0.1, '#121214', { mat: MAT.lacquer, faces: 'pz py ny px nx' });
  const led = makeCanvas(1024, 160); world.ledWall = { canvas: led, texture: null }; const ledTex = new THREE.CanvasTexture(led); ledTex.colorSpace = THREE.SRGBColorSpace; world.ledWall.texture = ledTex;
  room.tex(ledTex, 0, 6.05, z0 + 0.105, 0, 12.0, 1.875, { emit: 1.35 }); L.area(0, 6.0, 0.6, [6, 0, 0], [0, 0.9, 0], [0, 0, 1], '#d8c6ff', 2.6, 12, 'h', 4, 1);
  for (const [x, z] of [[-13.2, 19.2], [13.2, 19.2], [-5.0, 0.95], [5.0, 0.95]]) { placeAsset(room, 'planter_tall', x, 0, z); room.col(x - 0.3, z - 0.3, x + 0.3, z + 0.3); }
  for (const x of [-4.6, 4.6]) { placeAsset(room, 'bin_brass', x, 0, 19.3, 0, { collide: false }); room.col(x - 0.22, 19.08, x + 0.22, 19.52); }
  // ---------- glass street front: slim bronze mullions and transoms, the sliding door in the middle (opens for everyone) ----------
  const bronze = '#3a2e24', bays = 12; for (let i = 0; i <= bays; i++) { const x = -14 + 28 * i / bays; if (Math.abs(x) < 1.7 && i !== bays / 2) continue; room.box(x - 0.04, 0, 19.86, x + 0.04, H, 20.0, bronze, { mat: MAT.brass, faces: 'nz px nx' }); }
  room.box(-14, 0, 19.85, 14, 0.1, 20.0, bronze, { mat: MAT.brass, faces: 'nz py' }); room.box(-14, 3.15, 19.85, 14, 3.25, 20.0, bronze, { mat: MAT.brass, faces: 'nz py ny' }); room.box(-14, H - 0.25, 19.85, 14, H, 20.0, bronze, { mat: MAT.brass, faces: 'nz ny' });
  for (const s of [-1, 1]) room.box(s * 1.65 - 0.06, 0, 19.86, s * 1.65 + 0.06, 3.15, 20.0, bronze, { mat: MAT.brass, faces: 'nz px nx' });
  const glass = mats.glassMat(); for (const [x0, x1, y0, y1] of [[-14, -1.7, 0.1, H - 0.25], [1.7, 14, 0.1, H - 0.25], [-1.7, 1.7, 3.25, H - 0.25]]) { const g = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0), glass); g.position.set((x0 + x1) / 2, (y0 + y1) / 2, 19.93); g.renderOrder = 5; room.add(g); }
  room.col(-14, 19.86, -1.6, 20.3); room.col(1.6, 19.86, 14, 20.3);
  for (let x = -12; x <= 12; x += 4) if (Math.abs(x) > 3) L.spot(x, 0.3, 19.3, '#ffb87a', 1.8, 6, 'h', [0, 1, 0.1], 25, 60);   // floor uplights along the glass front
  world.spots.entrance = { x: 0, z: 18.6 };
  return room;
}
// back-lit channel letters: a blurred copy of the word glowing on the wall behind the 3D letters (5.2 x 1.4 m panel, baseline 0.3 m below its centre)
function haloTexture(word) {
  const w = 2048, h = 551, c = makeCanvas(w, h), g = c.getContext('2d'), fs = 375; g.clearRect(0, 0, w, h); g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.font = `600 ${fs}px ${SERIF}`; if ('letterSpacing' in g) g.letterSpacing = '18px';
  for (const [blur, a] of [[70, 0.55], [34, 0.75], [14, 0.6]]) { g.shadowColor = `rgba(255,186,104,${a})`; g.shadowBlur = blur; g.fillStyle = `rgba(255,196,120,${a * 0.6})`; g.fillText(word, w / 2, 393); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function guideTexture() {
  const w = 192, h = 600, c = makeCanvas(w, h), g = c.getContext('2d'); g.fillStyle = '#141416'; g.fillRect(0, 0, w, h); g.fillStyle = '#b8894a'; g.fillRect(0, 0, w, 150);
  g.fillStyle = '#fff'; g.font = '800 92px Inter, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', w / 2, 78);
  g.font = '700 30px Inter, sans-serif'; g.fillText('GUIDE', w / 2, 210); g.font = '400 19px Inter, sans-serif'; g.fillStyle = 'rgba(255,255,255,.85)';
  ['Ask the usher', 'to walk you', 'to your seat'].forEach((t, i) => g.fillText(t, w / 2, 262 + i * 28));
  g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 6; g.beginPath(); g.moveTo(w / 2, 400); g.lineTo(w / 2, 500); g.moveTo(w / 2 - 30, 430); g.lineTo(w / 2, 400); g.lineTo(w / 2 + 30, 430); g.stroke();
  g.font = '600 22px Inter, sans-serif'; g.fillStyle = '#fff'; g.fillText('SCREENS 1 · 2 · 3', w / 2, 545);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// ---------------------------------------------------------------- the plaza (room key 'street')
export const PLAZA = { kerb: 31.2, road1: 41.4, far: 44.6, canopy: { x: 16, z1: 27.6, y0: 7.6, y1: 9.4 }, top: 16 };
export function buildStreet(ctx) {
  const room = new Room('street', { ceil: 40, rect: null, soft: 0.3, maxEdge: 3 }), L = room.lights, K = PLAZA.kerb, C = PLAZA.canopy;
  // ---------- ground: granite forecourt, pavers beyond the building, kerb, road with a centre line, far pavement ----------
  room.flat(-24, 20.0, 24, K, 0, true, '#ffffff', { mat: MAT.plaza, edge: 1.5 });
  for (const s of [-1, 1]) room.flat(s < 0 ? -40 : 24, 20.0, s < 0 ? -24 : 40, K, 0, true, '#8a8782', { mat: MAT.paving, edge: 1.5 });
  room.box(-40, -0.15, K, 40, 0, K + 0.25, '#a8a49d', { faces: 'pz py', mat: MAT.concrete });
  room.flat(-40, K + 0.25, 40, PLAZA.road1, -0.15, true, '#202125', { mat: MAT.asphalt, edge: 2 }); for (let x = -39; x < 40; x += 4) room.flat(x, 36.25, x + 2, 36.4, -0.14, true, '#d8d6cf', { mat: MAT.paint, edge: 4 });
  room.box(-40, -0.15, PLAZA.road1, 40, 0, PLAZA.road1 + 0.25, '#a8a49d', { faces: 'nz py', mat: MAT.concrete }); room.flat(-40, PLAZA.road1 + 0.25, 40, PLAZA.far + 4, 0, true, '#8a8782', { mat: MAT.paving, edge: 1.5 });
  // red carpet from the kerb to the doors, brass-edged, between stanchions
  room.flat(-1.5, 20.0, 1.5, K - 0.05, 0.004, true, CARPET_RED, { mat: MAT.carpet, edge: 1 });
  for (const s of [-1, 1]) room.flat(s < 0 ? -1.54 : 1.5, 20.0, s < 0 ? -1.5 : 1.54, K - 0.05, 0.005, true, BRASS, { mat: MAT.brass, edge: 4 });   // beside the carpet, not over it
  for (const s of [-1, 1]) { for (let z = 21.6; z <= 29.0; z += 1.8) placeAsset(room, 'stanchion', s * 1.95, 0, z); for (let z = 22.5; z <= 28.0; z += 1.8) placeAsset(room, 'rope_velvet', s * 1.95, 0, z, PI / 2); room.col(s * 1.95 - 0.1, 21.5, s * 1.95 + 0.1, 29.1); }
  // ---------- the building: perforated metal skin lit from behind, glass front under a deep canopy, granite wings with posters ----------
  room.panel('x', 20.0, -22, 22, C.y1, PLAZA.top, 1, '#ffffff', { mat: MAT.perf, edge: 2 });
  for (const s of [-1, 1]) { room.panel('x', 20.0, s < 0 ? -22 : 14, s < 0 ? -14 : 22, 0, C.y1, 1, '#ffffff', { mat: MAT.perf, edge: 2 });
    room.panel('z', s * 22, 6, 20.0, 0, PLAZA.top, s, '#ffffff', { mat: MAT.perf, edge: 2 });
    room.box(s < 0 ? -22.05 : 21.95, PLAZA.top, 6, s < 0 ? -21.95 : 22.05, PLAZA.top + 0.15, 19.95, BRASS, { mat: MAT.brass, faces: 'py ' + (s < 0 ? 'nx' : 'px') }); }
  room.box(-22.05, PLAZA.top, 19.95, 22.05, PLAZA.top + 0.15, 20.05, BRASS, { mat: MAT.brass, faces: 'py pz' });
  room.box(-14, H0(), 19.98, 14, C.y0, 20.0, '#0d0d0f', { mat: MAT.lacquer, faces: 'pz' });
  // big poster lightboxes on the wings
  [[-18, 'sintel'], [18, 'cosmos']].forEach(([x, f]) => { room.box(x - 1.45, 1.0, 20.0, x + 1.45, 5.6, 20.12, '#141416', { mat: MAT.lacquer, faces: 'pz px nx py ny' });
    room.tex(posterTexture(f), x, 3.3, 20.125, 0, 2.6, 3.9, { emit: 1.25 }); L.area(x, 3.3, 20.6, [1.3, 0, 0], [0, 1.9, 0], [0, 0, 1], '#ffe6c8', 2.0, 9, 'f', 2, 3); });
  // canopy: walnut slat soffit with downlights, silver fascia with face-lit gold letters, top flashing
  room.box(-C.x + 0.04, C.y0, 20.0, C.x - 0.04, C.y0 + 0.02, C.z1 - 0.04, '#6b4630', { mat: MAT.slats, faces: 'ny', edge: 2 });   // inside the fascia and the side cheeks
  room.box(-C.x, C.y0, C.z1 - 0.04, C.x, C.y1, C.z1, '#8d9096', { mat: MAT.metal, faces: 'pz ny', edge: 2 });
  for (const s of [-1, 1]) room.box(s < 0 ? -C.x : C.x - 0.04, C.y0, 20.0, s < 0 ? -C.x + 0.04 : C.x, C.y1, C.z1, '#8d9096', { mat: MAT.metal, faces: s < 0 ? 'nx' : 'px', edge: 2 });
  room.box(-C.x, C.y1 - 0.02, 20.0, C.x, C.y1, C.z1, '#4a4c50', { mat: MAT.metal, faces: 'py', edge: 3 });
  placeAsset(room, 'letters_lumiere_lit', 0, C.y0 + 0.36, C.z1, 0, { scale: 0.98, glowK: 1.0 });
  L.area(0, C.y0 + 0.9, C.z1 + 0.5, [3.6, 0, 0], [0, 0.6, 0], [0, 0, 1], '#ffc060', 2.6, 10, 'f', 4, 1);
  for (let x = -12; x <= 12; x += 4) for (const z of [21.7, 24.2, 26.6]) { room.box(x - 0.09, C.y0 - 0.012, z - 0.09, x + 0.09, C.y0 - 0.002, z + 0.09, '#fff1dc', { glow: true, faces: 'ny' }); L.spot(x, C.y0 - 0.1, z, '#ffd2a0', 8, 11, 'f', [0, -1, 0], 22, 55); }
  // four elliptical bronze columns under the canopy front, with uplights in the paving
  for (const x of [-13.5, -6.5, 6.5, 13.5]) { const z = 26.4;
    room.acc.add(new THREE.CylinderGeometry(0.5, 0.5, C.y0, 40, 4, true), M(x, C.y0 / 2, z, 0, 0, 0, 1.1, 1, 0.8), '#8a6440', { mat: MAT.brass });
    room.acc.add(new THREE.CylinderGeometry(0.5, 0.5, 0.12, 40, 1, false), M(x, 0.06, z, 0, 0, 0, 1.18, 1, 0.88), '#141416', { mat: MAT.lacquer });
    room.col(x - 0.6, z - 0.45, x + 0.6, z + 0.45); L.occluder(x - 0.55, z - 0.4, x + 0.55, z + 0.4, 0, C.y0, 0.4);
    L.spot(x, 0.15, z + 0.75, '#ffc98e', 5, 10, 'f', [0, 1, -0.08], 8, 22); room.box(x - 0.12, 0.004, z + 0.68, x + 0.12, 0.012, z + 0.82, '#ffe2bc', { glow: true, faces: 'py' }); }
  // ---------- forecourt furniture: poster totems, hedge planters with bollards between, bins ----------
  [[-5.0, 23.4, 'wingit'], [5.0, 23.4, 'agent327'], [-10.0, 23.4, 'llamigos'], [10.0, 23.4, 'glasshalf']].forEach(([x, z, f]) => {
    placeAsset(room, 'poster_totem', x, 0, z, 0); room.col(x - 0.5, z - 0.17, x + 0.5, z + 0.17);
    for (const s of [-1, 1]) room.tex(posterTexture(f), x, 1.24, z + s * 0.0835, s > 0 ? 0 : PI, 0.8, 1.2, { emit: 1.2 });
    L.area(x, 1.24, z + 0.4, [0.4, 0, 0], [0, 0.6, 0], [0, 0, 1], '#fff0dc', 0.9, 5, 'f', 2, 2); });
  for (const x of [-21.3, -14.6, -7.9, 7.9, 14.6, 21.3]) { placeAsset(room, 'planter_hedge', x, 0, 30.2, 0); room.col(x - 1.45, 29.85, x + 1.45, 30.55); L.occluder(x - 1.4, 29.9, x + 1.4, 30.5, 0, 1.0, 0.4); }
  for (const x of [-18.0, -11.2, -4.2, 4.2, 11.2, 18.0]) { placeAsset(room, 'bollard_light', x, 0, 30.2, 0); room.col(x - 0.1, 30.1, x + 0.1, 30.3); L.point(x, 0.8, 30.2, '#ffd49a', 0.35, 3, 'f'); }
  for (const x of [-3.0, 3.0]) { placeAsset(room, 'bin_brass', x, 0, 20.6, 0, { collide: false }); room.col(x - 0.22, 20.38, x + 0.22, 20.82); }
  // v8: the ATM under the canopy, against the glass (cash for tickets and snacks; a limited allowance per visit, wallet.js)
  // v8: the host greets you on the carpet, just outside the doors (npc.js)
  ctx.world.posts.greeter = { x: 1.25, z: 21.25, yaw: 0, room: 'street' };
  placeAsset(room, 'atm', -7.4, 0, 20.42, 0); room.tex(signTexture('ATM', '#7fd0ff'), -7.41, 1.64, 20.68, 0, 0.5, 0.09, { emit: 1.6 }); ctx.world.atm = { x: -7.4, z: 21.15 };
  // ---------- the street: lamps, parked cars (v8: tools/blender/cars.py, lamps off; the taxi that brings you is intro.js), the buildings ----------
  for (const x of [-30, -20, 20, 30]) { placeAsset(room, 'lamp_post', x, 0, K - 0.35, 0); L.point(x, 5.6, K + 0.55, '#ffd7a0', 8, 15, 'f'); }
  for (const x of [-26, -10, 10, 26]) { placeAsset(room, 'lamp_post', x, 0, PLAZA.road1 + 0.6, PI); L.point(x, 5.6, PLAZA.road1 - 0.3, '#ffd7a0', 8, 15, 'f'); }
  placeAsset(room, 'car_sedan', -6.4, -0.15, K + 1.25, PI / 2, { swap: { car_red: [MAT.lacquer, col('#0c0c0f')] }, glowK: 0.12 });
  for (const [x, c] of [[-24, '#7a1c24'], [9, '#22324a'], [27, '#c9c4b8']]) placeAsset(room, 'car_sedan', x, -0.15, PLAZA.road1 - 1.4, -PI / 2, { swap: { car_red: [MAT.lacquer, col(c)] }, glowK: 0.12, lod: 1 });
  const B = [[-40, -19, 4, 1], [-19, -3, 3, 2], [-3, 15, 4, 3], [15, 40, 3, 4]], shops = [['CAFÉ LUNA', '#1f2b3a', '#ffb547'], ['BOOKS & CO', '#2a1b1b', '#ff6b6b'], ['NOODLE BAR', '#1b2a22', '#7bd389'], ['PHARMACY', '#14262f', '#4cc3ff']];
  let rs = 77; const rnd = () => (rs = (rs * 16807) % 2147483647) / 2147483647, zf = PLAZA.far + 0.4;
  const row = (x0, x1, storeys, i, z, yaw) => { const n = Math.max(1, Math.round((x1 - x0) / 6)), bw = (x1 - x0) / n, sx = bw / 6, dz = yaw === PI ? -1 : 1;
    for (let b = 0; b < n; b++) { const x = x0 + (b + 0.5) * bw;
      if (b === Math.floor(n / 2)) { placeAsset(room, 'shopfront', x, 0, z, yaw, { scale: [sx, 1, 1], glowColor: col(shops[i][2]).map((v) => v * 0.35 + 0.65) }); const [nm, a, c] = shops[i]; room.tex(shopTexture(nm, a, c), x, 3.25, z + dz * 0.1, yaw, Math.min(5.2, bw - 0.8), 0.6, { emit: 1.4 }); L.area(x, 1.6, z + dz * 0.8, [Math.min(2.6, bw / 2 - 0.5), 0, 0], [0, 0.9, 0], [0, 0, dz], c, 1.8, 9, 'f', 3, 1); }
      else placeAsset(room, 'facade_bay', x, 0, z, yaw, { scale: [sx, 1, 1], glowMul: { Mesh_PaneL: rnd() < 0.45 ? 0.9 : 0.06, Mesh_PaneR: rnd() < 0.45 ? 0.9 : 0.06 } });
      for (let f = 1; f < storeys; f++) placeAsset(room, 'facade_bay', x, f * 3.6, z, yaw, { scale: [sx, 1, 1], glowMul: { Mesh_PaneL: rnd() < 0.4 ? 0.5 + rnd() * 0.5 : 0.05, Mesh_PaneR: rnd() < 0.4 ? 0.5 + rnd() * 0.5 : 0.05 } }); }
    room.box(x0, storeys * 3.6, Math.min(z, z + dz * 0.6), x1, storeys * 3.6 + 0.5, Math.max(z, z + dz * 0.6), '#2a2420', { faces: (dz < 0 ? 'nz' : 'pz') + ' py', mat: MAT.concrete }); };
  B.forEach(([x0, x1, storeys], i) => row(x0, x1, storeys, i, zf, PI));
  row(-40, -22.4, 4, 1, 20.0, 0); row(22.4, 40, 3, 3, 20.0, 0);   // neighbours on either side of the cinema, in line with its front
  room.col(-40, 6, -22.0, 20.1); room.col(22.0, 6, 40, 20.1);
  // where you may walk: the forecourt and the pavement; the road is off limits (the kerb), and the street ends
  // v7: you arrive on the far pavement and cross the road on a zebra crossing (the only gap in the kerb), the whole front in view
  room.col(-40, K, -2.2, K + 0.6); room.col(2.2, K, 40, K + 0.6); room.col(-41, 19, -40, PLAZA.far + 1); room.col(40, 19, 41, PLAZA.far + 1);
  for (const s of [-1, 1]) room.col(s * 2.2 - 0.1, K, s * 2.2 + 0.1, PLAZA.road1 + 0.25);
  room.col(-40, PLAZA.road1, -2.2, PLAZA.road1 + 0.2); room.col(2.2, PLAZA.road1, 40, PLAZA.road1 + 0.2); room.col(-40, PLAZA.far + 0.3, 40, PLAZA.far + 1.0);
  room.tex(zebraTexture(), 0, -0.144, (K + PLAZA.road1) / 2 + 0.125, 0, 4.0, PLAZA.road1 - K - 0.25, { transparent: true, geo: new THREE.PlaneGeometry(4.0, PLAZA.road1 - K - 0.25).rotateX(-PI / 2) });
  // light: the perforated skin glows (emissive texture) and throws soft light on the forecourt; night ambient
  L.area(0, 12.7, 20.4, [21, 0, 0], [0, 3.2, 0], [0, 0, 1], '#ffd8a6', 2.2, 18, 'f', 6, 2);
  L.ambient('#3a4766', '#151820', 0.16, 'f');
  return room;
}
const H0 = () => LOBBY.h;
// zebra crossing: white bars across the road, worn a little (transparent between the bars)
function zebraTexture() {
  const w = 128, h = 320, c = makeCanvas(w, h), g = c.getContext('2d'); g.clearRect(0, 0, w, h);
  let s = 5; const R = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 10; i++) { const y = 6 + i * 31.5; g.fillStyle = 'rgba(232,230,222,0.92)'; g.fillRect(6, y, w - 12, 17);
    for (let k = 0; k < 60; k++) { g.fillStyle = `rgba(30,32,36,${0.25 + R() * 0.5})`; g.fillRect(6 + R() * (w - 14), y + R() * 15, 1 + R() * 3, 1 + R() * 2); } }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
