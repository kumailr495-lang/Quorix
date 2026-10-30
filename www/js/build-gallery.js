// LUMIERE v7 - the corridor from the ticket check to every screen (Dolby-style, after the user's photo), the IMAX gateway hall, the two
// restrooms. docs/V7-DESIGN.md (v5.20's walnut gallery and LED tunnel were judged "not Dolby" and "cheap"; they are replaced).
import * as THREE from 'three';
import { Room } from './room.js';
import { MAT, M, col, stripGeo, spline, rrectPts } from './geom.js';
import { GAL, TUN, GATE, WC, HALL_DOORS, hallById, DOOR_H } from './layout.js';
import { screenSignTexture, restroomSignTexture, exitSignTexture, printTexture, PRINTS, signTexture, makeCanvas, SANS } from './textures.js';
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
// v7 (docs/V7-DESIGN.md, after the user's Dolby-corridor photo): warm light-grey limestone panels on a 1.2 m module with dark shadow gaps,
// vertical LED slots in every third joint, a recessed black skirting, wall-to-wall blue-grey carpet, a pale ceiling with a recessed
// central light trough, black steel door portals, backlit fluted-glass number totems beside the screen doors, and at the far end the IMAX
// portal (black frame, blue light blades, IMAX letters) into the gateway hall.
export function buildGallery(ctx) {
  const { world } = ctx, room = new Room('gal', { ceil: 4.2, rect: [GAL.x0, GAL.z0, GAL.x1, GAL.z1], soft: 0.35 }), L = room.lights, HC = 4.2, z0 = GAL.z0, z1 = GAL.z1;
  const STONE = '#d8d1c6', STEEL = '#151517', SLOT = '#fff1dc';
  room.flat(GAL.x0, z0, GAL.x1, z1, 0, true, '#ffffff', { mat: MAT.dolby, edge: 0.7 });
  for (const side of [-1, 1]) {
    const x = side < 0 ? GAL.x0 : GAL.x1, dir = -side, ops = openings(side), px = (d) => x + dir * d, face = side < 0 ? 'px' : 'nx', ry = side < 0 ? PI / 2 : -PI / 2;
    room.wall('z', x, z0, z1, 0, HC, dir, '#0a0a0b', ops.map((o) => [o[0], o[1], o[2]]), { mat: MAT.paint, thick: 0.3 });
    // free runs between the openings (each opening keeps 0.14 m for its steel portal)
    const keep = ops.map((o) => [o[0] - 0.14, o[1] + 0.14]).sort((a, b) => a[0] - b[0]), runs = []; let cur = z0 + 0.02;
    for (const [a, b] of keep) { if (a > cur + 0.3) runs.push([cur, a]); cur = Math.max(cur, b); } if (z1 - 0.02 > cur + 0.3) runs.push([cur, z1 - 0.02]);
    let joint = 0;
    for (const [a, b] of runs) { const n = Math.max(1, Math.round((b - a) / 1.2)), w = (b - a) / n;
      for (let i = 0; i < n; i++) { const za = a + i * w + 0.006, zb = a + (i + 1) * w - 0.006;
        room.box(Math.min(x, px(0.022)), 0.1, za, Math.max(x, px(0.022)), HC, zb, STONE, { mat: MAT.stone, faces: `${face} pz nz`, edge: 1.2 });
        if (i > 0 && joint++ % 3 === 1) { const zj = a + i * w;   // a light slot in this joint, set into the shadow gap
          room.glowBox(Math.min(x, px(0.012)), 0.32, zj - 0.006, Math.max(x, px(0.012)), HC - 0.55, zj + 0.006, SLOT, 1.5, 0, face);
          L.line(px(0.1), 0.45, zj, px(0.1), HC - 0.7, zj, '#ffe9cc', 0.55, 3.2, 'h'); } } }
    // openings: black steel portals; screen doors get a fluted number totem on the lobby side and a programme panel over the door
    for (const [a, b, top, kind, data] of ops) {
      const zc = (a + b) / 2;
      for (const zz of [a - 0.12, b]) room.box(Math.min(x, px(0.05)), 0, zz, Math.max(x, px(0.05)), top + 0.12, zz + 0.12, STEEL, { mat: MAT.powder, faces: `${face} pz nz py` });
      room.box(Math.min(x, px(0.05)), top, a, Math.max(x, px(0.05)), top + 0.12, b, STEEL, { mat: MAT.powder, faces: `${face} ny py` });
      const rx0 = Math.min(x, x + side * 0.3), rx1 = Math.max(x, x + side * 0.3);   // reveals inside the wall thickness
      for (const zz of [a, b]) room.box(rx0, 0, zz - (zz === a ? 0.001 : 0), rx1, top, zz + (zz === b ? 0.001 : 0), STEEL, { faces: zz === a ? 'pz' : 'nz', mat: MAT.powder });
      room.box(rx0, top, a, rx1, top + 0.001, b, '#0c0c0e', { faces: 'ny', mat: MAT.paint });
      if (kind === 'entrance') { const h = hallById(data.hall), num = { I: 1, II: 2, III: 3 }[h.id], zt = b + 0.12 + 0.5;
        placeAsset(room, 'number_totem', px(0.045), 0, zt, ry, { glowK: 0.85 }); room.col(Math.min(px(0.02), px(0.2)), zt - 0.27, Math.max(px(0.02), px(0.2)), zt + 0.27);
        room.tex(numberTexture(num), px(0.045 + 0.025), 1.3, zt, ry, 0.41, 2.41, { emit: 1.0, transparent: true });
        L.area(px(0.35), 1.3, zt, [0, 0, 0.2], [0, 1.1, 0], [dir, 0, 0], '#f4f2ec', 1.1, 4, 'h', 1, 3);
        room.tex(screenSignTexture(num, h.name, KIND_SUB[h.kind], h.kind), px(0.03), top + 0.5, zc, ry, 2.0, 0.5, { emit: 1.2 });
        L.spot(px(0.9), HC - 0.1, zc, '#ffe6c8', 3.5, 6, 'h', [0, -1, 0], 22, 55); }
      else if (kind === 'exit') { room.tex(exitSignTexture('EXIT'), px(0.03), top + 0.32, zc, ry, 0.72, 0.27, { emit: 1.6 }); L.point(px(0.4), top + 0.3, zc, '#3dff86', 0.3, 3, 'f'); }
      else { room.tex(restroomSignTexture(WC[data].side < 0 ? 'm' : 'f'), px(0.03), top + 0.42, zc, ry, 1.5, 0.47, { emit: 1.15 }); L.spot(px(0.7), HC - 0.1, zc, '#ffe6c8', 2.6, 5, 'h', [0, -1, 0], 22, 55); }
    }
    // wall signs and the prints (the guests' things to look at), a bench in the longest bay
    const big = runs.filter(([a, b]) => b - a > 5).sort((p, q) => (q[1] - q[0]) - (p[1] - p[0]));
    big.forEach(([a, b], i) => { const zc = (a + b) / 2 + (side < 0 ? -0.6 : 0.6), p = PRINTS[(side < 0 ? 0 : 3) + i];
      placeAsset(room, 'poster_case', px(0.024), 1.25, zc, ry, { scale: 0.8, swap: { brass: [MAT.powder, col('#151517')] } }); room.tex(printTexture(p), px(0.024 + 0.073), 1.97, zc, ry, 0.96, 1.44, { emit: 0.85 });
      (world.pois = world.pois || []).push([px(1.2), zc, side < 0 ? -PI / 2 : PI / 2, -0.05]); L.spot(px(0.9), HC - 0.1, zc, '#fff0dc', 3.0, 6, 'h', [-dir * 0.5, -1, 0], 20, 50);
      if (i === 0) { const zb = zc + (side < 0 ? 2.1 : -2.1);
        placeAsset(room, 'bench_velvet', px(0.5), 0, zb, ry, { swap: { velvet_teal: [MAT.leather, col('#1c1a1a')] } }); room.col(Math.min(px(0.25), px(0.75)), zb - 1.0, Math.max(px(0.25), px(0.75)), zb + 1.0);
        for (const dz of [-0.55, 0.55]) world.sitSpots.push({ id: 'sp' + world.sitSpots.length, kind: 'bench', room: 'gal', x: px(0.5), z: zb + dz, y: 0.47, face: ry, stand: { x: px(1.3), z: zb + dz }, label: 'sit.bench', taken: null }); } });
    room.tex(signTexture('IMMERSIVE  SOUND', 768, 160, { color: '#f2efe8', bg: '#0d0d0f', weight: 600, size: 0.34, spacing: 0.18 }), px(0.03), 2.85, side < 0 ? -6.2 : -12.6, ry, 1.6, 0.33, { emit: 1.0 });
  }
  // ---------- ceiling: pale plaster at 4.2 m with a central recessed light trough and pin spots in it ----------
  for (const [a, b] of [[GAL.x0, -0.16], [0.16, GAL.x1]]) room.flat(a, z0, b, z1, HC, false, '#d2ccc3', { mat: MAT.plaster, edge: 1.5 });
  for (const s of [-1, 1]) room.box(s * 0.16 - 0.001, HC, z0, s * 0.16 + 0.001, HC + 0.2, z1, '#121214', { mat: MAT.paint, faces: s < 0 ? 'px' : 'nx' });
  room.flat(-0.16, z0, 0.16, z1, HC + 0.2, false, '#121214', { mat: MAT.paint });
  room.gacc.add(new THREE.PlaneGeometry(0.05, z1 - z0).rotateX(PI / 2), M(0, HC + 0.19, (z0 + z1) / 2), col(SLOT).map((v) => v * 1.4), { grp: 0 });
  L.line(0, HC + 0.05, z1 - 0.3, 0, HC + 0.05, z0 + 0.3, '#ffeedd', 1.4, 5, 'h', [0, -1, 0]);
  for (let z = z1 - 1.6; z > z0 + 0.8; z -= 2.4) { room.box(-0.05, HC + 0.17, z - 0.05, 0.05, HC + 0.185, z + 0.05, '#fff6ea', { glow: true, faces: 'ny' }); L.spot(0, HC + 0.1, z, '#ffe6c8', 3.2, 6, 'h', [0, -1, 0], 18, 48); }
  // ---------- north end: the IMAX portal (black frame, blue light blades, IMAX letters) into the gateway hall ----------
  const gx = GATE.w / 2, gh = GATE.h;
  for (const [a, b] of [[GAL.x0, -gx - 0.5], [gx + 0.5, GAL.x1]]) room.box(a, 0, z0 - 0.001, b, HC, z0, '#0b0b0d', { mat: MAT.lacquer, faces: 'pz' });
  room.box(-gx - 0.5, gh + 0.9, z0 - 0.001, gx + 0.5, HC, z0, '#0b0b0d', { mat: MAT.lacquer, faces: 'pz' });
  for (const s of [-1, 1]) { const xi = s * gx, xo = s * (gx + 0.5);   // jambs: deep black frame with a blue blade of light down its face
    room.box(Math.min(xi, xo), 0, z0, Math.max(xi, xo), gh, z0 + 0.35, '#0e0e11', { mat: MAT.lacquer, faces: `pz ${s < 0 ? 'px' : 'nx'} ${s < 0 ? 'nx' : 'px'}` });
    room.glowBox(s * (gx + 0.22) - 0.02, 0.15, z0 + 0.35, s * (gx + 0.22) + 0.02, gh + 0.75, z0 + 0.356, '#4c9dff', 1.8, 0, 'pz');
    L.line(s * (gx + 0.22), 0.3, z0 + 0.6, s * (gx + 0.22), gh + 0.6, z0 + 0.6, '#5aa4ff', 1.1, 5, 'h'); }
  room.box(-gx - 0.5, gh, z0, gx + 0.5, gh + 0.9, z0 + 0.35, '#0e0e11', { mat: MAT.lacquer, faces: 'pz ny' });
  placeAsset(room, 'letters_imax', 0, gh + 0.18, z0 + 0.35, 0, { scale: 0.55, glowK: 1.0 });
  L.area(0, gh + 0.45, z0 + 0.8, [1.2, 0, 0], [0, 0.3, 0], [0, 0, 1], '#9cc8ff', 1.4, 7, 'h', 3, 1);
  L.ambient('#fff2e2', '#5a5652', 0.1, 'h');
  world.spots.galleryStart = { x: 0, z: -1.5 };
  return room;
}
// big screen number for the fluted glass of a number totem (0.41 x 2.41 m): white numeral, SCREEN under it
function numberTexture(num) {
  const w = 160, h = 940, c = makeCanvas(w, h), g = c.getContext('2d'); g.clearRect(0, 0, w, h); g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = 'rgba(20,20,24,0.92)'; g.font = `300 150px ${SANS}`; g.fillText(String(num), w / 2, 300);
  g.font = `600 17px ${SANS}`; if ('letterSpacing' in g) g.letterSpacing = '5px'; g.fillText('SCREEN', w / 2 + 2, 400);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// ---------- v7: the IMAX gateway hall (room key 'tunnel'; docs/V7-DESIGN.md). Through the portal at the corridor's end: a dark hall with a
// giant curved panorama wall (after the user's curved-screen photo), polished black terrazzo with blue guide lines that lead left and right
// to the two side entrances of the IMAX (each under its own IMAX sign), curved benches facing the panorama, a pin-light star ceiling. ----------
export function buildTunnel(ctx) {
  const { world } = ctx, room = new Room('tunnel', { ceil: TUN.h, rect: [TUN.x0, TUN.z0, TUN.x1, TUN.z1], soft: 0.3 }), L = room.lights, H = TUN.h, z0 = TUN.z0, z1 = TUN.z1;
  const h = hallById('II'), doors = HALL_DOORS.filter((d) => d.room === 'tunnel');
  room.flat(TUN.x0, z0, TUN.x1, z1, 0, true, '#ffffff', { mat: MAT.tblack, edge: 0.8 });
  room.flat(TUN.x0, z0, TUN.x1, z1, H, false, '#060608', { mat: MAT.paint, edge: 2 });
  room.wall('x', z1, TUN.x0, TUN.x1, 0, H, -1, '#09090b', [[-GATE.w / 2, GATE.w / 2, GATE.h]], { mat: MAT.acoustic, thick: 0.3 });
  room.wall('x', z0, TUN.x0, TUN.x1, 0, H, 1, '#09090b', doors.map((d) => [d.x - d.w / 2, d.x + d.w / 2, 2.8]), { mat: MAT.acoustic, thick: 0.3 });
  for (const s of [-1, 1]) room.wall('z', s * 14, z0, z1, 0, H, -s, '#09090b', [], { mat: MAT.acoustic, thick: 0.3 });
  // the portal's reveal from this side
  for (const s of [-1, 1]) room.box(s * GATE.w / 2 - (s > 0 ? 0 : 0.001), 0, z1 - 0.3, s * GATE.w / 2 + (s > 0 ? 0.001 : 0), GATE.h, z1, '#0e0e11', { faces: s > 0 ? 'nx' : 'px', mat: MAT.lacquer });
  room.box(-GATE.w / 2, GATE.h, z1 - 0.3, GATE.w / 2, GATE.h + 0.001, z1, '#0e0e11', { faces: 'ny', mat: MAT.lacquer });
  // the panorama: a concave wall of picture 20.4 x 4.0 m in front of the IMAX's rear wall, between the two entrances (sagitta 0.9 m)
  const PW = 20.4, PH = 4.0, sag = 0.9, R = (PW * PW / 4 + sag * sag) / (2 * sag), arc = 2 * Math.asin(PW / 2 / R), zc = z0 + 0.25 + sag;
  const n = 64, pos = [], uv = [], idx = [];
  for (let i = 0; i <= n; i++) { const a = -arc / 2 + arc * i / n, x = R * Math.sin(a), z = (R * Math.cos(a) - R) + sag;   // z: 0 at the ends, sag at the centre (local, towards -z)
    pos.push(x, -PH / 2, -z, x, PH / 2, -z); uv.push(i / n, 0, i / n, 1); if (i < n) { const k = 2 * i; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); } }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); pg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); pg.setIndex(idx); pg.computeVertexNormals();
  room.tex(panoramaTexture(), 0, 0.55 + PH / 2, zc - 0.0, 0, PW, PH, { emit: 1.25, geo: pg });
  room.box(-PW / 2 - 0.2, 0, z0, PW / 2 + 0.2, 0.55, zc - sag + 0.05, '#0b0b0d', { mat: MAT.lacquer, faces: 'pz py' });   // plinth under the picture
  room.col(-PW / 2 - 0.2, z0, PW / 2 + 0.2, zc - sag + 0.12);
  for (const x of [-6, 0, 6]) L.area(x, 2.6, zc - sag + 0.6, [3.2, 0, 0], [0, 1.9, 0], [0, 0, 1], '#7fa4ff', 2.0, 10, 'f', 3, 2);
  // blue guide lines in the floor: from the portal, round both sides of the benches, to each entrance
  for (const d of doors) { const s = Math.sign(d.x); for (const off of [-0.35, 0.35]) room.gacc.add(stripGeo(spline([[s * 0.9 + off * 0.3, z1 - 0.4], [s * (3.2 + off), z1 - 1.6], [s * (8.8 + off), z1 - 3.4], [s * (11.4 + off * 0.6), z0 + 2.6], [d.x + off, z0 + 0.4]], 60), 0.035, 0.004), null, col('#4c9dff').map((v) => v * 1.6), { grp: 0 });
    // over each entrance: the IMAX letters and a blue wash on the frame
    placeAsset(room, 'letters_imax', d.x, 3.05, z0, 0, { scale: 0.34, glowK: 1.0 });
    const ja = Math.max(TUN.x0, d.x - d.w / 2 - 0.12), jb = Math.min(TUN.x1, d.x + d.w / 2 + 0.12);   // frame: jambs (inside the room only) under a head
    if (ja < d.x - d.w / 2 - 0.01) room.box(ja, 0, z0, d.x - d.w / 2, 2.8, z0 + 0.12, '#0e0e11', { mat: MAT.lacquer, faces: 'pz px nx' }); if (jb > d.x + d.w / 2 + 0.01) room.box(d.x + d.w / 2, 0, z0, jb, 2.8, z0 + 0.12, '#0e0e11', { mat: MAT.lacquer, faces: 'pz px nx' });
    room.box(ja + 0.001, 2.8, z0, jb - 0.001, 2.92, z0 + 0.12, '#0e0e11', { mat: MAT.lacquer, faces: 'pz ny' });
    room.glowBox(d.x - d.w / 2 - 0.05, 2.83, z0 + 0.12, d.x + d.w / 2 + 0.05, 2.86, z0 + 0.125, '#4c9dff', 1.6, 0, 'pz');
    L.area(d.x, 3.25, z0 + 0.6, [0.7, 0, 0], [0, 0.2, 0], [0, 0, 1], '#9cc8ff', 1.2, 6, 'f', 2, 1); L.spot(d.x, H - 0.1, z0 + 1.4, '#cfe0ff', 3.0, 7, 'f', [0, -1, -0.2], 20, 50); }
  // benches facing the panorama (curved sofas in navy velvet)
  for (const x of [-4.2, 4.2]) { placeAsset(room, 'sofa_curve', x, 0, -34.4, PI, { swap: { velvet_ivory: [MAT.velvet, col('#1e2c4a')] } }); room.col(x - 1.7, -34.6, x + 1.7, -33.6);
    for (const a of [-18, 0, 18]) { const t = a * PI / 180, sx = x + 2.3 * Math.sin(t), sz = -36.4 + 2.3 * Math.cos(t);
      world.sitSpots.push({ id: 'sp' + world.sitSpots.length, kind: 'sofa', room: 'tunnel', x: sx, z: sz, y: 0.44, face: PI + t, stand: { x: x + 1.5 * Math.sin(t), z: -36.4 + 1.5 * Math.cos(t) }, label: 'sit.sofa', taken: null }); } }
  // ceiling: pin-light stars and a soft blue line round the room
  let rs = 911; const rnd = () => (rs = (rs * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 220; i++) { const x = TUN.x0 + 0.4 + rnd() * 27.2, z = z0 + 0.4 + rnd() * 7.5; room.glowBox(x - 0.01, H - 0.005, z - 0.01, x + 0.01, H - 0.001, z + 0.01, '#f2f6ff', 0.6 + rnd() * 1.6, 0, 'ny'); }
  room.gacc.add(stripGeo(rrectPts(0, (z0 + z1) / 2, 27.0, 7.4, 1.2), 0.03, H - 0.006, false, true), null, col('#3d7dff').map((v) => v * 1.3), { grp: 0 });
  L.line(-12.5, H - 0.2, (z0 + z1) / 2, 12.5, H - 0.2, (z0 + z1) / 2, '#5a8cff', 0.5, 9, 'f', [0, -1, 0]);
  L.ambient('#8fb2ff', '#1a2233', 0.06, 'f');
  world.tunnel = { room };
  return room;
}
// the panorama: a night above a planet's limb, a band of nebula, a scatter of stars (2048 x 400, drawn once)
function panoramaTexture() {
  const w = 2048, h = 400, c = makeCanvas(w, h), g = c.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#02040c'); sky.addColorStop(0.55, '#06122c'); sky.addColorStop(1, '#0a2552'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
  let s = 4711; const R = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 60; i++) { const x = R() * w, y = h * (0.15 + 0.35 * R()), r = 60 + R() * 160, gr = g.createRadialGradient(x, y, 0, x, y, r), hue = R() < 0.5 ? '120,90,255' : '60,170,255';
    gr.addColorStop(0, `rgba(${hue},${0.05 + R() * 0.07})`); gr.addColorStop(1, `rgba(${hue},0)`); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
  for (let i = 0; i < 1400; i++) { const x = R() * w, y = R() * h * 0.78, b = R(); g.fillStyle = `rgba(255,255,255,${0.25 + b * 0.75})`; const r = b > 0.97 ? 1.6 : b > 0.85 ? 1.0 : 0.6; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  // the planet: a huge arc along the bottom with a thin bright atmosphere and city lights on the night side
  const cy = h * 3.6, cr = h * 3.0; g.save(); g.beginPath(); g.arc(w * 0.5, cy, cr, 0, 7); g.clip();
  const pl = g.createLinearGradient(0, cy - cr, 0, h); pl.addColorStop(0, '#0b1b33'); pl.addColorStop(1, '#03070f'); g.fillStyle = pl; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 900; i++) { const x = R() * w, y = cy - cr + 6 + R() * (h - (cy - cr)); g.fillStyle = `rgba(255,200,120,${0.15 + R() * 0.45})`; g.fillRect(x, y, 1.2, 1.2); }
  g.restore();
  for (const [lw, a] of [[18, 0.12], [8, 0.3], [3, 0.8]]) { g.strokeStyle = `rgba(110,190,255,${a})`; g.lineWidth = lw; g.beginPath(); g.arc(w * 0.5, cy, cr + 1, Math.PI * 1.25, Math.PI * 1.75); g.stroke(); }
  const sun = g.createRadialGradient(w * 0.72, cy - cr - 4, 0, w * 0.72, cy - cr - 4, 220); sun.addColorStop(0, 'rgba(255,255,255,0.95)'); sun.addColorStop(0.08, 'rgba(200,230,255,0.6)'); sun.addColorStop(1, 'rgba(120,180,255,0)'); g.fillStyle = sun; g.fillRect(0, 0, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
// ---------- restrooms (v5.20 redesign, docs/V6-ENVIRONMENT.md): large-format stone floor with real joints, glazed wall tile to 2.4 m under a
// brass trim, a floating walnut vanity with vessel basins, brass taps and round back-lit mirrors, walnut cubicles, urinals with glass screens.
// The gentlemen's is bottle green over dark stone, the ladies' warm blush over white calacatta. Fittings: tools/blender/fixtures.py.
export function buildRestrooms(ctx) {
  const { world } = ctx;
  return Object.entries(WC).map(([key, r]) => {
    const room = new Room(key, { ceil: r.h, rect: [r.x0, r.z0, r.x1, r.z1], soft: 0.35 }), L = room.lights, H = r.h, s = r.side, xi = s < 0 ? r.x1 : r.x0;   // xi: wall shared with the gallery
    const door = r.door, men = s < 0, TILE = men ? '#244a3e' : '#c49890', STONE = men ? MAT.marble : MAT.calacatta, WARM = '#ffe4c2';
    // floor: a dark grout bed and 600 x 1200 mm stone tiles, 6 mm thick with 3 mm joints (the bake shades the joints)
    room.flat(r.x0, r.z0, r.x1, r.z1, 0, true, '#16161a', { mat: MAT.paint });
    for (let x = r.x0; x < r.x1 - 0.05; x += 0.6) for (let z = r.z0; z < r.z1 - 0.05; z += 1.2) room.box(x + 0.0015, 0, z + 0.0015, Math.min(x + 0.6, r.x1) - 0.0015, 0.006, Math.min(z + 1.2, r.z1) - 0.0015, '#ffffff', { mat: STONE, faces: 'py px nx pz nz', edge: 0 });
    room.flat(r.x0, r.z0, r.x1, r.z1, H, false, '#ebe5da', { mat: MAT.plaster });
    // walls: glazed tile to 2.4 m (a box 12 mm proud: no coplanar faces), brass trim on top, warm plaster above
    room.wall('z', xi, r.z0, r.z1, 0, H, s < 0 ? -1 : 1, '#e4ddd0', [[door.z - door.w / 2, door.z + door.w / 2, 2.4]], { mat: MAT.plaster, thick: 0.3 });
    room.wall('z', s < 0 ? r.x0 : r.x1, r.z0, r.z1, 0, H, s < 0 ? 1 : -1, '#e4ddd0', [], { mat: MAT.plaster, thick: 0.3 });
    room.wall('x', r.z0, r.x0, r.x1, 0, H, 1, '#e4ddd0', [], { mat: MAT.plaster, thick: 0.3 });
    room.wall('x', r.z1, r.x0, r.x1, 0, H, -1, '#e4ddd0', [], { mat: MAT.plaster, thick: 0.3 });
    const tile = (axis, c, a0, a1, d) => { const t = 0.012, u = 0.016;
      if (axis === 'x') { room.box(a0, 0, d > 0 ? c : c - t, a1, 2.4, d > 0 ? c + t : c, TILE, { mat: MAT.walltile, faces: d > 0 ? 'pz' : 'nz' }); room.box(a0, 2.4, d > 0 ? c : c - u, a1, 2.415, d > 0 ? c + u : c, BRASS, { mat: MAT.brass, faces: d > 0 ? 'pz py ny' : 'nz py ny', edge: 0 }); }
      else { room.box(d > 0 ? c : c - t, 0, a0, d > 0 ? c + t : c, 2.4, a1, TILE, { mat: MAT.walltile, faces: d > 0 ? 'px' : 'nx' }); room.box(d > 0 ? c : c - u, 2.4, a0, d > 0 ? c + u : c, 2.415, a1, BRASS, { mat: MAT.brass, faces: d > 0 ? 'px py ny' : 'nx py ny', edge: 0 }); } };
    tile('x', r.z0, r.x0 + 0.016, r.x1 - 0.016, 1); tile('x', r.z1, r.x0 + 0.016, r.x1 - 0.016, -1); tile('z', s < 0 ? r.x0 : r.x1, r.z0, r.z1, s < 0 ? 1 : -1);
    tile('z', xi, r.z0, door.z - door.w / 2, s < 0 ? -1 : 1); tile('z', xi, door.z + door.w / 2, r.z1, s < 0 ? -1 : 1);
    // privacy screen in front of the entrance: walnut slats on a black frame
    const pz = door.z, ix = (d) => xi + s * d;   // ix(d): d metres into the restroom from the gallery wall
    room.box(Math.min(ix(1.55), ix(1.65)), 0, pz - 1.3, Math.max(ix(1.55), ix(1.65)), 2.4, pz + 1.3, WALNUT, { mat: MAT.slats }); room.col(Math.min(ix(1.55), ix(1.65)), pz - 1.3, Math.max(ix(1.55), ix(1.65)), pz + 1.3);
    // floating vanity along the lobby-side wall: walnut cabinet with a warm light line under it, stone top, three vessel basins with brass taps,
    // a round back-lit mirror over each basin
    const vx0 = Math.min(ix(2.4), ix(6.9)), vx1 = Math.max(ix(2.4), ix(6.9)), zw = r.z1 - 0.012, vz = zw - 0.3;
    room.box(vx0, 0.84, zw - 0.6, vx1, 0.88, zw, '#ffffff', { mat: STONE, faces: 'py nz px nx' }); room.box(vx0 + 0.02, 0.2, zw - 0.56, vx1 - 0.02, 0.84, zw, WALNUT, { mat: MAT.wood, faces: 'nz px nx ny' }); room.col(vx0, zw - 0.65, vx1, r.z1);
    room.glowBox(vx0 + 0.08, 0.196, zw - 0.5, vx1 - 0.08, 0.2, zw - 0.47, WARM, 1.1, 0, 'ny'); L.line(vx0 + 0.15, 0.18, zw - 0.45, vx1 - 0.15, 0.18, zw - 0.45, WARM, 0.9, 3, 'f', [0, -1, 0]);
    for (let i = 0; i < 3; i++) { const bx = vx0 + (i + 0.5) * (vx1 - vx0) / 3;
      placeAsset(room, 'basin_vessel', bx, 0.88, vz - 0.03, 0); placeAsset(room, 'tap_brass', bx, 0.88, zw - 0.07, PI);
      placeAsset(room, 'mirror_round', bx, 1.66, zw, PI, { glowK: 1.2 }); L.point(bx, 1.66, zw - 0.05, WARM, 0.45, 2.2, 'f'); }
    L.line(vx0 + 0.2, 2.2, zw - 0.5, vx1 - 0.2, 2.2, zw - 0.5, '#fff0dc', 1.6, 4, 'f', [0, -0.5, -1]);   // face light from above the mirrors
    // cubicles along the far wall: lacquer partitions to 2.25 m on a black rail, walnut doors with a brass pull and the occupancy light
    const nC = s < 0 ? 3 : 5, cw = 1.0, cd = 1.6, cx0 = s < 0 ? r.x0 + 0.012 : r.x1 - 0.012 - nC * cw, cz1 = r.z0 + 0.012 + cd;
    for (let i = 0; i <= nC; i++) { const x = cx0 + i * cw; room.box(x - 0.02, 0.12, r.z0 + 0.012, x + 0.02, 2.25, cz1, '#2c2220', { mat: MAT.lacquer }); }
    room.box(cx0 - 0.02, 2.25, cz1 - 0.02, cx0 + nC * cw + 0.02, 2.29, cz1 + 0.025, '#161618', { mat: MAT.powder });
    for (let i = 0; i < nC; i++) { const x = cx0 + i * cw; room.box(x + 0.03, 0.12, cz1 - 0.02, x + cw - 0.03, 2.22, cz1 + 0.02, WALNUT, { mat: MAT.wood });
      room.box(x + cw - 0.16, 0.95, cz1 + 0.02, x + cw - 0.13, 1.25, cz1 + 0.05, BRASS, { mat: MAT.brass }); room.glowBox(x + cw - 0.22, 1.3, cz1 + 0.02, x + cw - 0.14, 1.34, cz1 + 0.024, '#3dff86', 1.2, 0, 'pz'); }
    room.col(cx0, r.z0, cx0 + nC * cw, cz1 + 0.05);
    // urinals with dark glass privacy screens (brass capped)
    if (men) { for (let i = 0; i < 4; i++) { const z = r.z0 + 2.6 + i * 0.85; placeAsset(room, 'urinal', r.x0 + 0.012, 0, z, PI / 2);
        if (i < 3) { room.box(r.x0 + 0.012, 0.55, z + 0.405, r.x0 + 0.5, 1.55, z + 0.43, '#1c2226', { mat: MAT.glass }); room.box(r.x0 + 0.012, 1.55, z + 0.4, r.x0 + 0.5, 1.565, z + 0.435, BRASS, { mat: MAT.brass, edge: 0 }); } }
      room.col(r.x0, r.z0 + 2.3, r.x0 + 0.5, r.z0 + 5.6); }
    placeAsset(room, 'bin_brass', vx0 > xi ? vx1 + 0.35 : vx0 - 0.35, 0, zw - 0.3, 0);
    // v7 dressing (docs/V7-DESIGN.md): blade hand dryer and towel dispenser at the vanity's ends with pedal bins, soap pumps between the basins,
    // a fold-down baby-change unit, a framed print, a plant, and a cove of warm light round the ceiling (tools/kiln/restroom_set.kiln.js)
    const fit = (name, k, x, y, z, yaw) => placeAsset(room, 'restroom_set', x, y, z, yaw, { only: 'Mesh_' + name, shift: [k, 0, 0], glowK: 1.0 });
    fit('Dryer', 0, ix(7.45), 0, zw, PI); fit('Towel', 1, ix(2.0), 0, zw, PI); fit('Bin', 2, ix(2.0), 0, zw - 0.02, PI); fit('Bin', 2, ix(7.9), 0, zw - 0.02, PI);
    room.col(Math.min(ix(7.25), ix(7.65)), zw - 0.3, Math.max(ix(7.25), ix(7.65)), zw); room.col(Math.min(ix(1.8), ix(2.2)), zw - 0.4, Math.max(ix(1.8), ix(2.2)), zw);
    for (let i = 0; i < 3; i++) { const bx = vx0 + (i + 0.5) * (vx1 - vx0) / 3; fit('Soap', 4, bx + 0.26, 0.88, zw - 0.14, PI); }
    const ox = s < 0 ? r.x0 : r.x1, oz = men ? r.z1 - 1.6 : r.z1 - 2.2;   // the outer side wall
    fit('Baby', 3, ox + (s < 0 ? 0.012 : -0.012), 0, oz, s < 0 ? PI / 2 : -PI / 2); room.col(s < 0 ? ox : ox - 0.12, oz - 0.45, s < 0 ? ox + 0.12 : ox, oz + 0.45);
    if (!men) { placeAsset(room, 'poster_case', ox - 0.014, 1.25, r.z1 - 4.4, -PI / 2, { scale: 0.8 }); room.tex(printTexture(PRINTS[5 % PRINTS.length]), ox - 0.014 - 0.073, 1.97, r.z1 - 4.4, -PI / 2, 0.96, 1.44, { emit: 0.8 }); }
    placeAsset(room, 'planter_tall', ix(8.0), 0, r.z1 - 0.95); room.col(Math.min(ix(7.7), ix(8.3)), r.z1 - 1.25, Math.max(ix(7.7), ix(8.3)), r.z1 - 0.65);
    room.gacc.add(stripGeo(rrectPts((r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2, r.x1 - r.x0 - 0.6, r.z1 - r.z0 - 0.6, 0.4), 0.025, H - 0.004, false, true), null, col('#ffe2bf').map((v) => v * 1.1), { grp: 0 });
    for (const [a, b] of [[[r.x0 + 0.4, r.z0 + 0.3], [r.x1 - 0.4, r.z0 + 0.3]], [[r.x0 + 0.4, r.z1 - 0.3], [r.x1 - 0.4, r.z1 - 0.3]]]) L.line(a[0], H - 0.05, a[1], b[0], H - 0.05, b[1], '#ffe2bf', 0.5, 3, 'f', [0, -1, 0]);
    // light: round downlights in white trims, the vanity's face light, the mirrors' halos
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { const x = r.x0 + (i + 0.5) * (r.x1 - r.x0) / 3, z = r.z0 + (j + 0.5) * (r.z1 - r.z0) / 2;
      placeAsset(room, 'downlight', x, H, z, 0, { glowK: 1.1, swap: { brass: [MAT.paint, col('#e9e3d8')] } }); L.spot(x, H - 0.1, z, '#fff0dc', 6.5, 7, 'f', [0, -1, 0], 25, 65); }
    L.ambient('#fff4e6', '#8a8580', 0.16, 'f');
    room.tex(signTexture(s < 0 ? 'GENTLEMEN' : 'LADIES', 512, 96, { color: '#2a2622', weight: 600, size: 0.42, spacing: 0.2 }), xi + (s < 0 ? -0.015 : 0.015), 2.7, door.z, s < 0 ? -PI / 2 : PI / 2, 1.2, 0.22, { emit: 0, transparent: true });
    world.posts[key] = { x: (r.x0 + r.x1) / 2, z: (r.z0 + r.z1) / 2, room: key };
    return room;
  });
}
