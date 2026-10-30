// LUMIERE v5.20 - the gallery (the spine from the ticket check to every screen), the video tunnel to the IMAX, the two restrooms.
// docs/V6-ENVIRONMENT.md. Construction logic: a portal-frame rhythm (fluted walnut pilasters + ceiling beams every 5 m), coffered ceiling
// with cove light between the beams, fabric acoustic walls over a walnut wainscot, carpet runner with terrazzo borders and brass inlay,
// every opening framed (architrave, reveals, threshold) and signed (screen number, restroom pictogram, exit).
import * as THREE from 'three';
import { Room } from './room.js';
import { MAT, M } from './geom.js';
import { GAL, TUN, WC, HALL_DOORS, hallById, DOOR_H } from './layout.js';
import { screenSignTexture, restroomSignTexture, exitSignTexture, printTexture, PRINTS, signTexture } from './textures.js';
import { placeAsset } from './assets.js';
const PI = Math.PI;
const WALNUT = '#6b4630', BRASS = '#c9a061', FABRIC = '#3a2430', PLASTER = '#1c1719', LACQ = '#141215';
const KIND_SUB = { curved: 'CURVED PREMIUM  ·  RECLINERS', imax: 'IMAX  ·  22 M SCREEN', standard: 'STANDARD  ·  STADIUM' };
// openings along one gallery side wall: [z0, z1, top, kind, data]
function openings(side) {
  const x = side < 0 ? GAL.x0 : GAL.x1, out = [];
  for (const k in WC) if (WC[k].side === side) out.push([WC[k].door.z - WC[k].door.w / 2, WC[k].door.z + WC[k].door.w / 2, 2.4, 'wc', k]);
  for (const d of HALL_DOORS) if (d.room === 'gal' && Math.abs(d.x - (x + side * 0.15)) < 0.3) out.push([d.z - d.w / 2, d.z + d.w / 2, d.h, d.kind, d]);
  return out.sort((a, b) => a[0] - b[0]);
}
export function buildGallery(ctx) {
  const { world } = ctx, room = new Room('gal', { ceil: GAL.h + 0.35, rect: [GAL.x0, GAL.z0, GAL.x1, GAL.z1], soft: 0.35 }), L = room.lights, H = GAL.h, HC = H + 0.35, z0 = GAL.z0, z1 = GAL.z1;
  const BAYS = []; for (let z = 0; z > z0; z -= 5) BAYS.push(z);   // pilaster / beam lines at z = 0 (lobby wall), -5, ... -30
  // ---------- floor: carpet runner, brass inlay, terrazzo borders; marble thresholds in every side opening ----------
  room.flat(-1.45, z0, 1.45, z1, 0, true, '#ffffff', { mat: MAT.deco });
  for (const s of [-1, 1]) { room.flat(s < 0 ? -1.5 : 1.45, z0, s < 0 ? -1.45 : 1.5, z1, 0, true, BRASS, { mat: MAT.brass, edge: 2 }); room.flat(s < 0 ? GAL.x0 : 1.5, z0, s < 0 ? -1.5 : GAL.x1, z1, 0, true, '#ffffff', { mat: MAT.terrazzo }); }
  // ---------- walls: fabric over a walnut wainscot, pilasters, framed openings ----------
  for (const side of [-1, 1]) {
    const x = side < 0 ? GAL.x0 : GAL.x1, dir = -side, ops = openings(side), fo = (a) => (side < 0 ? a : a);   // dir: the way the wall faces
    room.wall('z', x, z0, z1, 0, HC, dir, FABRIC, ops.map((o) => [o[0], o[1], o[2]]), { mat: MAT.acoustic, thick: 0.3 });
    const px = (d) => x + dir * d, faces = side < 0 ? 'px' : 'nx';
    // keep-outs along the wall: openings (with their architraves) and pilasters
    const keep = ops.map((o) => [o[0] - 0.2, o[1] + 0.2]); for (const zp of BAYS) if (zp < 0) keep.push([zp - 0.28, zp + 0.28]); keep.sort((a, b) => a[0] - b[0]);
    const runs = []; let cur = z0; for (const [a, b] of keep) { if (a > cur + 0.05) runs.push([cur, a]); cur = Math.max(cur, b); } if (z1 - 0.15 > cur + 0.05) runs.push([cur, z1 - 0.15]);
    for (const [a, b] of runs) {   // wainscot: walnut panel with a brass cap and a black shadow-gap skirting
      room.box(Math.min(x, px(0.035)), 0.1, a, Math.max(x, px(0.035)), 1.1, b, WALNUT, { mat: MAT.wood, faces: `${faces} py nz pz` });
      room.box(Math.min(x, px(0.045)), 1.1, a, Math.max(x, px(0.045)), 1.125, b, BRASS, { mat: MAT.brass, faces: `${faces} py ny nz pz` });
      room.box(Math.min(x, px(0.02)), 0, a, Math.max(x, px(0.02)), 0.1, b, '#0b0b0c', { mat: MAT.paint, faces: `${faces} py nz pz` });
      room.box(Math.min(x, px(0.02)), 3.55, a, Math.max(x, px(0.02)), HC, b, PLASTER, { mat: MAT.plaster, faces: `${faces} ny nz pz`, edge: 1.5 });   // dark cornice band
    }
    for (const zp of BAYS) { if (zp >= 0) continue;   // fluted walnut pilaster with a brass capital and a black plinth
      room.box(Math.min(x, px(0.14)), 0.12, zp - 0.26, Math.max(x, px(0.14)), 3.45, zp + 0.26, WALNUT, { mat: MAT.fluted, faces: `${faces} pz nz` });
      room.box(Math.min(x, px(0.16)), 0, zp - 0.28, Math.max(x, px(0.16)), 0.12, zp + 0.28, '#0d0c0d', { mat: MAT.lacquer, faces: `${faces} py pz nz` });
      room.box(Math.min(x, px(0.17)), 3.45, zp - 0.29, Math.max(x, px(0.17)), 3.6, zp + 0.29, BRASS, { mat: MAT.brass, faces: `${faces} py ny pz nz` });
      // brass sconce: a half-cylinder glowing up and down, washing the flutes
      room.box(Math.min(px(0.14), px(0.26)), 2.2, zp - 0.07, Math.max(px(0.14), px(0.26)), 2.62, zp + 0.07, BRASS, { mat: MAT.brass, faces: `${faces} py ny pz nz`, edge: 0 });
      room.glowBox(Math.min(px(0.15), px(0.25)), 2.62, zp - 0.06, Math.max(px(0.15), px(0.25)), 2.63, zp + 0.06, '#ffe0b0', 2.2, 1, 'py');
      L.spot(px(0.3), 2.65, zp, '#ffcf96', 1.6, 4, 'h', [0, 1, 0], 25, 70); L.spot(px(0.3), 2.18, zp, '#ffcf96', 1.2, 3.5, 'h', [0, -1, 0], 25, 70); }
    // framed openings: architraves, reveals, signs
    for (const [a, b, top, kind, data] of ops) {
      const zc = (a + b) / 2, rx0 = Math.min(x, x + side * 0.3), rx1 = Math.max(x, x + side * 0.3);   // reveals: inside the wall thickness, away from the gallery
      for (const zz of [a, b]) room.box(rx0, 0, zz - (zz === a ? 0.001 : 0), rx1, top, zz + (zz === b ? 0.001 : 0), kind === 'exit' ? '#26272b' : LACQ, { faces: zz === a ? 'pz' : 'nz', mat: kind === 'exit' ? MAT.powder : MAT.lacquer });
      room.box(rx0, top, a, rx1, top + 0.001, b, '#101012', { faces: 'ny', mat: MAT.paint });
      room.flat(rx0, a, rx1, b, 0.004, true, '#ffffff', { mat: MAT.marble, edge: 2 });   // threshold
      const trim = kind === 'exit' ? '#2a2b2f' : BRASS, tm = kind === 'exit' ? MAT.powder : MAT.brass;
      for (const zz of [a - 0.12, b]) room.box(Math.min(x, px(0.05)), 0, zz, Math.max(x, px(0.05)), top + 0.12, zz + 0.12, trim, { mat: tm, faces: `${faces} pz nz py` });
      room.box(Math.min(x, px(0.05)), top, a, Math.max(x, px(0.05)), top + 0.12, b, trim, { mat: tm, faces: `${faces} ny py` });
      const ry = side < 0 ? PI / 2 : -PI / 2;
      if (kind === 'entrance') { const h = hallById(data.hall), num = { I: 1, II: 2, III: 3 }[h.id];
        room.box(Math.min(x, px(0.08)), top + 0.3, zc - 1.45, Math.max(x, px(0.08)), top + 1.0, zc + 1.45, '#0e0d10', { mat: MAT.lacquer, faces: `${faces} py ny pz nz` });
        room.tex(screenSignTexture(num, h.name, KIND_SUB[h.kind], h.kind), px(0.085), top + 0.65, zc, ry, 2.8, 0.7, { emit: 1.25 });
        L.area(px(0.4), top + 0.65, zc, [0, 0, 1.2], [0, 0.3, 0], [dir, 0, 0], '#ffe2c0', 1.1, 5, 'f', 3, 1);
        L.spot(px(0.9), H - 0.1, zc, '#ffd8a8', 4.5, 6, 'h', [0, -1, 0], 22, 55); }
      else if (kind === 'exit') { room.tex(exitSignTexture('EXIT'), px(0.06), top + 0.32, zc, ry, 0.72, 0.27, { emit: 1.6 }); L.point(px(0.4), top + 0.3, zc, '#3dff86', 0.3, 3, 'f'); }
      else { room.tex(restroomSignTexture(WC[data].side < 0 ? 'm' : 'f'), px(0.06), top + 0.45, zc, ry, 1.5, 0.47, { emit: 1.15 }); L.spot(px(0.7), H - 0.1, zc, '#ffd8a8', 3.2, 5, 'h', [0, -1, 0], 22, 55); }
    }
    // art prints in brass cases with picture lights, and velvet benches, in the bays that have no opening
    let pi = side < 0 ? 0 : 3;
    for (let i = 0; i < BAYS.length; i++) { const za = BAYS[i] - 5, zb = BAYS[i], zc = (za + zb) / 2; if (zc < z0 + 1.5) continue; if (ops.some((o) => o[1] + 0.3 > za + 0.4 && o[0] - 0.3 < zb - 0.4)) continue;
      const ry = side < 0 ? PI / 2 : -PI / 2, p = PRINTS[pi++ % PRINTS.length];
      placeAsset(room, 'poster_case', px(0.002), 1.25, zc, ry, { scale: 0.8 }); room.tex(printTexture(p), px(0.075), 1.97, zc, ry, 0.96, 1.44, { emit: 0.85 }); (world.pois = world.pois || []).push([px(1.2), zc, side < 0 ? -PI / 2 : PI / 2, -0.05]);
      L.area(px(0.35), 1.97, zc, [0, 0, 0.5], [0, 0.7, 0], [dir, 0, 0], '#fff0e0', 0.8, 4, 'f', 2, 2); L.spot(px(0.9), H - 0.1, zc, '#ffd8a8', 3.2, 6, 'h', [-dir * 0.5, -1, 0], 20, 50);
      if (i % 2 === (side < 0 ? 1 : 0)) { placeAsset(room, 'bench_velvet', px(0.55), 0, zc, side < 0 ? PI / 2 : -PI / 2, { swap: { velvet_teal: [MAT.velvet, [0.2, 0.03, 0.05]] } }); room.col(Math.min(px(0.3), px(0.8)), zc - 1.0, Math.max(px(0.3), px(0.8)), zc + 1.0);
        for (const dz of [-0.55, 0.55]) world.sitSpots.push({ id: 'sp' + world.sitSpots.length, kind: 'bench', room: 'gal', x: px(0.55), z: zc + dz, y: 0.47, face: side < 0 ? PI / 2 : -PI / 2, stand: { x: px(1.35), z: zc + dz }, label: 'sit.bench', taken: null }); } }
  }
  // ---------- ceiling: beams on the pilaster lines, perimeter soffits, coffers with cove light ----------
  room.flat(GAL.x0, z0, GAL.x1, z1, HC, false, '#18151a', { mat: MAT.plaster, edge: 2 });
  for (const s of [-1, 1]) { const xa = s < 0 ? GAL.x0 : GAL.x1 - 0.55, xb = s < 0 ? GAL.x0 + 0.55 : GAL.x1;   // perimeter soffits along the walls
    room.box(xa, H, z0, xb, HC, z1, PLASTER, { mat: MAT.plaster, faces: `ny ${s < 0 ? 'px' : 'nx'}`, edge: 2 });
    room.glowBox(s < 0 ? xb : xa - 0.03, HC - 0.04, z0 + 0.1, s < 0 ? xb + 0.03 : xa, HC - 0.03, z1 - 0.1, '#ffd9a6', 1.2, 1, 'py');
    L.line(s < 0 ? xb + 0.2 : xa - 0.2, HC - 0.06, z0 + 0.5, s < 0 ? xb + 0.2 : xa - 0.2, HC - 0.06, z1 - 0.5, '#ffd3a0', 1.6, 4, 'h', [s * -0.3, 1, 0]); }
  for (const zp of BAYS) { if (zp >= 0) continue; room.box(GAL.x0 + 0.55, H, zp - 0.3, GAL.x1 - 0.55, HC - 0.001, zp + 0.3, PLASTER, { mat: MAT.plaster, faces: 'ny pz nz', edge: 2 });
    room.box(GAL.x0 + 0.55, H - 0.02, zp - 0.31, GAL.x1 - 0.55, H, zp + 0.31, BRASS, { mat: MAT.brass, faces: 'ny pz nz', edge: 0 }); }
  for (let i = 0; i < BAYS.length; i++) { const za = Math.max(z0, BAYS[i] - 5) + 0.3, zb = BAYS[i] - (BAYS[i] >= 0 ? 0.15 : 0.3), zc = (za + zb) / 2; if (zb - za < 1) continue;   // two recessed downlights per coffer
    for (const xx of [-1.2, 1.2]) { room.box(xx - 0.07, HC - 0.012, zc - 0.07, xx + 0.07, HC - 0.002, zc + 0.07, '#fff1dc', { glow: true, grp: 1, faces: 'ny' }); L.spot(xx, HC - 0.1, zc, '#ffd2a0', 5.5, 7, 'h', [0, -1, 0], 20, 55); } }
  // ---------- north end: the tunnel mouth, framed in brass, IMAX header ----------
  for (const [a, b] of [[GAL.x0, TUN.x0], [TUN.x1, GAL.x1]]) room.box(a, 0, z0 - 0.001, b, TUN.h, z0, LACQ, { mat: MAT.lacquer, faces: 'pz' });
  room.box(GAL.x0, TUN.h, z0 - 0.001, GAL.x1, HC, z0, '#0c0c10', { mat: MAT.lacquer, faces: 'pz' });
  room.tex(screenSignTexture(2, 'SCREEN 2', 'IMAX  ·  THROUGH THE TUNNEL', 'imax'), 0, TUN.h + 0.55, z0 + 0.01, 0, 3.2, 0.8, { emit: 1.35 });
  for (const x of [TUN.x0, TUN.x1]) room.box(x - 0.06, 0, z0, x + 0.06, TUN.h, z0 + 0.06, BRASS, { mat: MAT.brass, faces: 'pz px nx' });
  room.box(TUN.x0 - 0.06, TUN.h, z0, TUN.x1 + 0.06, TUN.h + 0.06, z0 + 0.06, BRASS, { mat: MAT.brass, faces: 'pz ny py' });
  L.area(0, TUN.h + 0.55, z0 + 0.4, [1.4, 0, 0], [0, 0.35, 0], [0, 0, 1], '#9cc8ff', 1.2, 6, 'f', 3, 1);
  // hanging wayfinding sign over the first bay (seen from the ticket check)
  L.ambient('#ffd7ad', '#4a3630', 0.09, 'h'); L.ambient('#ffd7ad', '#4a3630', 0.02, 'f');
  world.spots.galleryStart = { x: 0, z: -1.5 };
  return room;
}
// ---------- the video tunnel: curved LED walls narrowing to the IMAX's vomitory, black floor with light lines ----------
export function buildTunnel(ctx) {
  const { mats, world } = ctx, room = new Room('tunnel', { ceil: TUN.h, rect: [TUN.x0, TUN.z0, TUN.x1, TUN.z1], soft: 0.3 }), L = room.lights, H = TUN.h, z0 = TUN.z0, z1 = TUN.z1;
  const halfW = (z) => { const t = Math.min(1, Math.max(0, (z1 - z) / (z1 - z0))), k = t * t * (3 - 2 * t); return 2.95 - 1.55 * k; };   // 2.95 m at the gallery, 1.4 m at the IMAX
  room.flat(TUN.x0, z0, TUN.x1, z1, 0, true, '#1a1a1d', { mat: MAT.granite });
  room.flat(TUN.x0, z0, TUN.x1, z1, H, false, '#09090b', { mat: MAT.paint });
  // walls: a strip mesh per side carries the moving picture (ledWallMat); behind it the black structure
  const N = 32, wallMat = mats.ledWallMat ? mats.ledWallMat() : mats.glowMat(room.U);
  for (const s of [-1, 1]) {
    const pos = [], uv = [], idx = [];
    for (let i = 0; i <= N; i++) { const z = z1 - (z1 - z0) * i / N, x = s * halfW(z); pos.push(x, 0.12, z, x, H - 0.25, z); uv.push(i / N, 0, i / N, 1); if (i < N) { const k = i * 2; if (s < 0) idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); else idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, wallMat); m.userData.side = s; room.add(m);
    // light lines on the floor and the ceiling following the curve; the wall's own light (fixed channel, pulsed by uFix with the content)
    for (let i = 0; i < N; i++) { const za = z1 - (z1 - z0) * i / N, zb = z1 - (z1 - z0) * (i + 1) / N, xa = s * (halfW(za) - 0.22), xb = s * (halfW(zb) - 0.22);
      room.glowBox(Math.min(xa, xb) - 0.015, 0.002, zb, Math.max(xa, xb) + 0.015, 0.008, za, '#7fb8ff', 1.6, 0, 'py');
      room.glowBox(Math.min(xa, xb) - 0.012, H - 0.008, zb, Math.max(xa, xb) + 0.012, H - 0.002, za, '#bcd8ff', 1.3, 0, 'ny');
      room.col(s < 0 ? -3.4 : Math.min(xa, xb) + s * 0.2, zb, s < 0 ? Math.max(xa, xb) + s * 0.2 : 3.4, za); }
    L.line(s * 2.2, 1.6, z1 - 0.5, s * 1.1, 1.6, z0 + 0.5, '#86b4ff', 2.6, 5, 'f', null, 8);
  }
  // black structure behind the curved walls (seen where the screens end) and the end wall around the IMAX entrance
  for (const s of [-1, 1]) { room.box(s < 0 ? TUN.x0 : TUN.x1 - 0.01, 0, z0, s < 0 ? TUN.x0 + 0.01 : TUN.x1, H, z1, '#050506', { mat: MAT.paint, faces: s < 0 ? 'px' : 'nx' }); room.box(s < 0 ? TUN.x0 : -s * -1.4, 0, z0, s < 0 ? -1.4 : TUN.x1, H, z0 + 0.01, '#050506', { mat: MAT.paint, faces: 'pz' }); }
  room.box(-1.4, 2.8, z0, 1.4, H, z0 + 0.01, '#050506', { mat: MAT.paint, faces: 'pz' });
  L.ambient('#8fb2ff', '#1a2233', 0.05, 'f'); L.ambient('#ffffff', '#222222', 0.01, 'h');
  world.tunnel = { room, halfW };
  return room;
}
// ---------- restrooms: privacy screen at the entrance, vanity with mirror, cubicles (and urinals in the men's), tiled walls ----------
export function buildRestrooms(ctx) {
  const { world } = ctx;
  return Object.entries(WC).map(([key, r]) => {
    const room = new Room(key, { ceil: r.h, rect: [r.x0, r.z0, r.x1, r.z1], soft: 0.35 }), L = room.lights, H = r.h, s = r.side, xi = s < 0 ? r.x1 : r.x0;   // xi: wall shared with the gallery
    const door = r.door, tileW = '#e8e4dc', tileD = '#2a2a2e';
    room.flat(r.x0, r.z0, r.x1, r.z1, 0, true, '#3a3a3e', { mat: MAT.tile });
    room.flat(r.x0, r.z0, r.x1, r.z1, H, false, '#e6e2da', { mat: MAT.plaster });
    // walls: large-format tile to 2.4 m, paint above (the tile is a box 12 mm proud: no coplanar faces)
    room.wall('z', xi, r.z0, r.z1, 0, H, s < 0 ? -1 : 1, '#d9d4cb', [[door.z - door.w / 2, door.z + door.w / 2, 2.4]], { mat: MAT.plaster, thick: 0.3 });
    room.wall('z', s < 0 ? r.x0 : r.x1, r.z0, r.z1, 0, H, s < 0 ? 1 : -1, '#d9d4cb', [], { mat: MAT.plaster, thick: 0.3 });
    room.wall('x', r.z0, r.x0, r.x1, 0, H, 1, '#d9d4cb', [], { mat: MAT.plaster, thick: 0.3 });
    room.wall('x', r.z1, r.x0, r.x1, 0, H, -1, '#d9d4cb', [], { mat: MAT.plaster, thick: 0.3 });
    const tile = (axis, c, a0, a1, d) => { const t = 0.012; if (axis === 'x') room.box(a0, 0, d > 0 ? c : c - t, a1, 2.4, d > 0 ? c + t : c, tileD, { mat: MAT.tile, faces: d > 0 ? 'pz py' : 'nz py' }); else room.box(d > 0 ? c : c - t, 0, a0, d > 0 ? c + t : c, 2.4, a1, tileD, { mat: MAT.tile, faces: d > 0 ? 'px py' : 'nx py' }); };
    tile('x', r.z0, r.x0 + 0.012, r.x1 - 0.012, 1); tile('x', r.z1, r.x0 + 0.012, r.x1 - 0.012, -1); tile('z', s < 0 ? r.x0 : r.x1, r.z0, r.z1, s < 0 ? 1 : -1);
    tile('z', xi, r.z0, door.z - door.w / 2, s < 0 ? -1 : 1); tile('z', xi, door.z + door.w / 2, r.z1, s < 0 ? -1 : 1);
    // privacy screen in front of the entrance: walnut slats on a black frame
    const pz = door.z, ix = (d) => xi + s * d;   // ix(d): d metres into the restroom from the gallery wall
    room.box(Math.min(ix(1.55), ix(1.65)), 0, pz - 1.3, Math.max(ix(1.55), ix(1.65)), 2.4, pz + 1.3, WALNUT, { mat: MAT.slats }); room.col(Math.min(ix(1.55), ix(1.65)), pz - 1.3, Math.max(ix(1.55), ix(1.65)), pz + 1.3);
    // vanity along the lobby-side wall: marble top, three basins (see the Kiln fixtures), back-lit mirror
    const vx0 = Math.min(ix(2.4), ix(6.9)), vx1 = Math.max(ix(2.4), ix(6.9)), vz = r.z1 - 0.3;
    room.box(vx0, 0.84, vz - 0.32, vx1, 0.88, r.z1 - 0.012, '#ffffff', { mat: MAT.marble }); room.box(vx0, 0.15, vz - 0.3, vx1, 0.84, r.z1 - 0.012, WALNUT, { mat: MAT.wood, faces: 'nz px nx' }); room.col(vx0, vz - 0.35, vx1, r.z1);
    room.box(vx0 + 0.1, 1.1, r.z1 - 0.032, vx1 - 0.1, 2.2, r.z1 - 0.02, '#c9d2d8', { mat: MAT.chrome, faces: 'nz' });
    room.glowBox(vx0 + 0.05, 2.22, r.z1 - 0.04, vx1 - 0.05, 2.25, r.z1 - 0.012, '#fff3e0', 1.6, 0, 'ny nz'); L.line(vx0 + 0.2, 2.15, r.z1 - 0.3, vx1 - 0.2, 2.15, r.z1 - 0.3, '#fff0dc', 2.4, 4, 'f', [0, -0.3, -1]);
    // cubicles along the far wall: full-height lacquer partitions and doors
    const nC = s < 0 ? 3 : 5, cw = 1.0, cd = 1.6, cx0 = s < 0 ? r.x0 + 0.012 : r.x1 - 0.012 - nC * cw, cz1 = r.z0 + 0.012 + cd;
    for (let i = 0; i <= nC; i++) { const x = cx0 + i * cw; room.box(x - 0.02, 0.12, r.z0 + 0.012, x + 0.02, 2.1, cz1, '#3b2a22', { mat: MAT.lacquer }); }
    for (let i = 0; i < nC; i++) { const x = cx0 + i * cw; room.box(x + 0.03, 0.12, cz1 - 0.02, x + cw - 0.03, 2.1, cz1 + 0.02, '#4a3328', { mat: MAT.lacquer }); room.box(x + cw - 0.18, 1.0, cz1 + 0.02, x + cw - 0.1, 1.06, cz1 + 0.05, BRASS, { mat: MAT.brass });
      room.glowBox(x + cw - 0.2, 1.12, cz1 + 0.02, x + cw - 0.12, 1.16, cz1 + 0.024, '#3dff86', 1.2, 0, 'pz'); }
    room.col(cx0, r.z0, cx0 + nC * cw, cz1 + 0.05);
    if (s < 0) { for (let i = 0; i < 4; i++) { const z = r.z0 + 2.6 + i * 0.85; room.box(r.x0 + 0.012, 0.55, z - 0.19, r.x0 + 0.38, 1.25, z + 0.19, '#f4f2ee', { mat: MAT.lacquer }); if (i < 3) room.box(r.x0 + 0.012, 0.6, z + 0.405, r.x0 + 0.55, 1.65, z + 0.445, '#3b2a22', { mat: MAT.lacquer }); }
      room.col(r.x0, r.z0 + 2.3, r.x0 + 0.55, r.z0 + 5.6); }
    // light: downlights, the mirror line, a warm cove over the vanity
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { const x = r.x0 + (i + 0.5) * (r.x1 - r.x0) / 3, z = r.z0 + (j + 0.5) * (r.z1 - r.z0) / 2; room.box(x - 0.08, H - 0.012, z - 0.08, x + 0.08, H - 0.002, z + 0.08, '#fff6ea', { glow: true, faces: 'ny' }); L.spot(x, H - 0.1, z, '#fff0dc', 6.5, 7, 'f', [0, -1, 0], 25, 65); }
    L.ambient('#fff4e6', '#8a8580', 0.18, 'f');
    room.tex(signTexture(s < 0 ? 'GENTLEMEN' : 'LADIES', 512, 96, { color: '#2a2622', weight: 600, size: 0.42, spacing: 0.2 }), xi + (s < 0 ? -0.015 : 0.015), 2.7, door.z, s < 0 ? -PI / 2 : PI / 2, 1.2, 0.22, { emit: 0, transparent: true });
    world.posts[key] = { x: (r.x0 + r.x1) / 2, z: (r.z0 + r.z1) / 2, room: key };
    return room;
  });
}
