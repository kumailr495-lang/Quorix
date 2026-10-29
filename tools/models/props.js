// LUMIERE props batch 1. cm, +Z front, floor y=0, symmetric in X where noted.
import { box, cylY, cylX, cylZ, sphere, ellipsoid, torusY, lathe, capsule, sunion, sub, union, mirrorX as M, orient, sector, rotX } from '../lib/sdf.js';
export const C = { velvet: '#8f1426', walnut: '#4a2c19', brass: '#c9a24a', gold: '#d1a53a', black: '#202226', cream: '#e8dcc0', teal: '#1f5f66', marble: '#d9d6cf',
  terra: '#a5563a', leaf: '#2f6b3a', leaf2: '#3f7d45', wenge: '#2b1d17', stone: '#a39578', glass: '#0b0d10', led: '#ffd9a0', paper: '#e9e2cf' };
const MATOF = {}; const regMat = () => { const m = { velvet: 1, walnut: 2, wenge: 2, brass: 4, gold: 4, marble: 3, terra: 11, stone: 11, black: 9, cream: 6, teal: 8, glass: 14 }; for (const k in m) MATOF[C[k]] = m[k]; }; regMat();
export const z = (f, color, v = 0.04) => ({ f, color, var: v, mat: MATOF[color] ?? 0 });
const out = (name, sdf, zones, bounds, h, lods, extra = {}) => ({ name, sdf, zones, bounds, h, lods, ...extra });

export function makeSofa() {
  const seat = box(0, 30, 6, 140, 12, 40, 9), baseB = box(0, 14, 4, 142, 14, 42, 5), back = box(0, 62, -26, 138, 28, 13, 11);
  const arms = M(box(147, 40, 2, 15, 26, 46, 11)); let b = sunion(3, back); 
  for (let ix = -10; ix <= 10; ix++) for (const yy of [52, 70]) b = sub(b, sphere(ix * 13, yy, -13.3, 2.4), 1.2);
  const body = sunion(3.5, baseB, seat, b, arms);
  const piping = union(box(0, 42.2, 44.3, 138, 0.9, 0.9, 0.4));
  return out('lumiere-lounge-sofa', union(sunion(0.8, body, piping)), [z(union(seat, b, arms), C.velvet, 0.07), z(baseB, C.walnut), z(piping, C.brass, 0.02)],
    [-168, -3, -50, 168, 96, 52], 1.9, [3200, 1100, 380]);
}
export function makeReceptionDesk() {
  // U-shaped deco desk: customers on the +Z side; the receptionist stands in the 62 cm wide pocket in front of the tall marquee back panel
  const cz = -110, counter = sector(0, cz, 170, 200, 0, 104, 52, 3), top = sector(0, cz, 166, 206, 104, 110, 53, 2.2), kick = sector(0, cz, 168, 202.5, 6, 12, 52, 1.5);
  const panel = sector(0, cz, 100, 108, 0, 181, 56, 3), cap = sector(0, cz, 98, 110, 176, 184, 57, 3), inlay = sector(0, cz, 167, 201.2, 50, 96, 40, 1);
  const pier = (yaw) => orient(sector(0, 0, 100, 204, 0, 108, 4.5, 2), 0, 0, cz, yaw, 0), piers = union(pier(52), pier(-52));
  const body = sunion(1.5, counter, top, panel, cap, piers);
  return out('lumiere-reception-desk', union(sunion(0.6, body, kick), inlay), [z(union(counter, panel, piers), C.walnut, 0.1), z(top, C.marble, 0.05), z(kick, C.brass, 0.02), z(cap, C.gold, 0.03), z(inlay, C.teal, 0.04)],
    [-176, -3, -62, 176, 190, 122], 2.0, [3600, 1200, 400]);
}
export function makeConsoleTable() {
  const top = box(0, 96, 0, 125, 3.5, 22, 1.5), legs = M(sunion(2, box(112, 46, 14, 4, 46, 4, 1.5), box(112, 46, -14, 4, 46, 4, 1.5))), rail = box(0, 70, 0, 112, 1.6, 14, 0.8), brass = box(0, 92, 21.5, 123, 1.2, 0.8, 0.4);
  return out('lumiere-console-table', sunion(1, top, legs, rail, brass), [z(union(top, legs, rail), C.walnut, 0.1), z(brass, C.brass)], [-130, -3, -28, 130, 104, 28], 1.2, [1800, 650, 240]);
}
const nest = (name, w, d, hgt, lo) => () => { const top = box(0, hgt - 2, 0, w / 2, 2, d / 2, 1), legs = M(sunion(1.5, box(w / 2 - 6, (hgt - 4) / 2, d / 2 - 6, 2.2, (hgt - 4) / 2, 2.2, 0.8), box(w / 2 - 6, (hgt - 4) / 2, -d / 2 + 6, 2.2, (hgt - 4) / 2, 2.2, 0.8)));
  return out(name, sunion(0.8, top, legs), [z(union(top, legs), C.walnut, 0.1)], [-w / 2 - 6, -3, -d / 2 - 6, w / 2 + 6, hgt + 4, d / 2 + 6], 0.9, lo); };
export const makeNestingLarge = nest('lumiere-nesting-table-large', 125, 55, 59, [1400, 500, 200]);
export const makeNestingSmall = nest('lumiere-nesting-table-small', 88, 40, 43, [1100, 400, 160]);
export function makeRoundTable() {
  const top = cylY(0, 0, 38, 70, 74, 1.6), stem = cylY(0, 0, 4.5, 8, 70, 1), foot = lathe(0, 0, [[0, 0], [26, 0], [26, 3], [8, 8], [0, 8]], 1);
  const ring = torusY(0, 71.5, 0, 36.5, 1.2);
  return out('lumiere-round-table', sunion(2, top, stem, foot), [z(top, C.marble, 0.05), z(union(stem, foot), C.black), z(ring, C.brass)], [-42, -3, -42, 42, 80, 42], 1.1, [1500, 520, 190]);
}
export function makeStool() {
  const seat = cylY(0, 0, 18, 44, 52, 4), stem = cylY(0, 0, 2.2, 6, 46, 0.6), foot = lathe(0, 0, [[0, 0], [20, 0], [20, 2.5], [6, 6], [0, 6]], 0.8), ring = cylY(0, 0, 9.5, 20, 22.5, 1);
  return out('lumiere-bar-stool', sunion(1.5, seat, stem, foot, ring), [z(seat, C.velvet, 0.07), z(union(stem, foot, ring), C.brass, 0.02)], [-24, -3, -24, 24, 58, 24], 0.9, [1200, 420, 160]);
}
export function makeFloorLamp() {
  const base = lathe(0, 0, [[0, 0], [20, 0], [20, 3], [6, 8], [0, 8]], 1), pole = cylY(0, 0, 1.3, 6, 150, 0.4), ring = torusY(0, 150, 0, 2.6, 1.3);
  const shade = lathe(0, 0, [[19, 150], [28, 196], [25, 196], [16, 152]], 0.5);
  return [out('lumiere-floor-lamp', sunion(1, base, pole, ring), [z(base, C.wenge), z(union(pole, ring), C.brass, 0.02)], [-26, -3, -26, 26, 160, 26], 0.8, [900, 340, 140]),
    out('lumiere-floor-lamp-shade', shade, [z(shade, C.led, 0.0)], [-32, 140, -32, 32, 200, 32], 0.8, [700, 260, 120], { glow: true, ground: false })];
}
export function makeSconce() {
  // wall-mounted on the z=0 plane, projecting +z
  const plate = box(0, 30, 0.9, 7, 14, 1.4, 1), arm = capsule(0, 30, 2, 0, 33, 10, 1.6), shellF = lathe(0, 10, [[0, 31], [3, 31], [9, 43], [8, 44], [0, 34]], 0.6);
  const bulb = sphere(0, 40, 10, 3.4);
  return [out('lumiere-wall-sconce-v2', sunion(1, plate, arm, shellF), [z(plate, C.brass, 0.03), z(shellF, C.gold, 0.03), z(arm, C.brass)], [-12, 10, -2, 12, 56, 24], 0.8, [900, 360, 150], { ground: false }),
    out('lumiere-wall-sconce-v2-glow', bulb, [z(bulb, C.led, 0)], [-6, 28, 4, 6, 46, 16], 0.7, [200, 100, 60], { glow: true, ground: false })];
}
export function makeChandelier() {
  // hangs DOWN from the canopy at y=0
  const canopy = cylY(0, 0, 6, -6, 0, 1.5), rod = cylY(0, 0, 1.4, -70, -5, 0.5);
  let ring = (y, R) => torusY(0, y, 0, R, 1.8); const rings = [ring(-76, 22), ring(-86, 45), ring(-108, 70)];
  const arms = M(sunion(1, capsule(1, -66, 0, 45, -86, 0, 1.7), capsule(45, -86, 0, 70, -108, 0, 1.7)));
  const arms4 = union(arms, orient(arms, 0, 0, 0, 90, 0), orient(arms, 0, 0, 0, 45, 0), orient(arms, 0, 0, 0, 135, 0));
  const drop = sphere(0, -77, 0, 7.5); let candles = sphere(0, -999, 0, 1), bulbs = sphere(0, -999, 0, 1);
  for (const [y, R, n] of [[-86, 45, 8], [-108, 70, 12]]) for (let i = 0; i < n; i++) { const a = 2 * Math.PI * i / n, x = R * Math.sin(a), zz = R * Math.cos(a);
    candles = union(candles, cylY(x, zz, 1.9, y + 1, y + 9, 0.4)); bulbs = union(bulbs, sphere(x, y + 12, zz, 2.6)); }
  const solid = sunion(0.8, canopy, rod, ...rings, arms4, drop, candles);
  return [out('lumiere-pendant-chandelier', solid, [z(union(canopy, rod, arms4), C.brass, 0.03), z(union(...rings, drop), C.gold, 0.03), z(candles, C.cream, 0.02)],
    [-76, -112, -76, 76, 2, 76], 1.1, [2600, 900, 320], { ground: false, tau: 0.6 }),
    out('lumiere-pendant-chandelier-glow', bulbs, [z(bulbs, C.led, 0)], [-76, -112, -76, 76, -60, 76], 1.0, [500, 200, 80], { glow: true, ground: false, multi: true })];
}
function leafy(cx, cz, n, seed, hmin, hmax) { let f = sphere(0, -999, 0, 0.5); let s = seed;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < n; i++) { const yaw = (i / n) * 360 + rnd() * 40, pitch = 20 + rnd() * 55, len = hmin + rnd() * (hmax - hmin), w = 6 + rnd() * 5; const y0 = 22 + rnd() * 30;
    f = sunion(1.5, f, orient(ellipsoid(0, 0, len / 2, w, 2.4, len / 2), cx, y0, cz, yaw, pitch)); } return f; }
export function makePlant() {
  const pot = lathe(0, 0, [[0, 0], [14, 0], [19, 26], [22, 34], [22, 38], [0, 38]], 1.2), rim = torusY(0, 38, 0, 21.5, 2.2), soil = cylY(0, 0, 19, 34, 39, 0.5);
  const stems = sunion(2, capsule(0, 36, 0, 3, 90, 2, 1.4), capsule(0, 36, 0, -8, 80, 6, 1.4), capsule(0, 36, 0, 8, 75, -6, 1.3));
  const leaves = leafy(0, 0, 18, 7, 34, 62);
  return out('lumiere-potted-plant', sunion(1.2, pot, rim, stems, leaves, soil), [z(pot, C.terra, 0.1), z(rim, C.brass), z(soil, C.wenge), z(union(leaves, stems), C.leaf, 0.12)], [-70, -3, -70, 70, 128, 70], 1.3, [2600, 900, 320], { multi: true });
}
const potMk = (name, s) => () => { const pot = lathe(0, 0, [[0, 0], [12 * s, 0], [16 * s, 22 * s], [19 * s, 30 * s], [19 * s, 34 * s], [0, 34 * s]], 1), rim = torusY(0, 34 * s, 0, 18.6 * s, 2 * s), soil = cylY(0, 0, 16 * s, 30 * s, 35 * s, 0.5);
  return out(name, sunion(1, pot, rim, soil), [z(pot, C.terra, 0.1), z(rim, C.brass), z(soil, C.wenge)], [-22 * s, -3, -22 * s, 22 * s, 38 * s, 22 * s], 0.9, [1200, 420, 160]); };
export const makePotLarge = potMk('lumiere-flowerpot-large', 1.0), makePotSmall = potMk('lumiere-flowerpot-small', 0.65);
export function makeDisplayCase() {
  const plinth = box(0, 45, 0, 28, 45, 28, 2), glassBox = box(0, 118, 0, 26, 28, 26, 1.5), cap = box(0, 148, 0, 29, 3, 29, 1.5), obj = sphere(0, 104, 0, 9), gold = box(0, 91, 0, 29, 1.2, 29, 0.5);
  return out('lumiere-display-case', sunion(1, plinth, glassBox, cap, gold, obj), [z(plinth, C.walnut, 0.1), z(glassBox, C.glass, 0.0), z(union(cap, gold), C.brass), z(obj, C.gold)], [-34, -3, -34, 34, 154, 34], 1.2, [1600, 560, 210]);
}
export function makeTicketDispenser() {
  const foot = lathe(0, 0, [[0, 0], [16, 0], [16, 3], [4, 12], [0, 12]], 0.8), stem = cylY(0, 0, 3.5, 8, 96, 0.8), head = box(0, 104, 0, 11, 11, 8, 3), slot = box(0, 100, 7.5, 7, 1, 2, 0.4);
  return out('lumiere-ticket-dispenser', sunion(1.2, foot, stem, head), [z(union(foot, stem), C.black), z(head, C.brass, 0.03), z(slot, C.glass, 0)], [-20, -3, -20, 20, 118, 20], 0.9, [1200, 420, 160]);
}
export function makePosterFrame() {
  const fr = (x) => sub(box(x, 120, 0, 31, 46, 2.6, 1.2), box(x, 120, 1.4, 27, 42, 2, 0.5), 0.3), paper = (x) => box(x, 120, 0.4, 27, 42, 0.8, 0.3);
  const frames = union(fr(-70), fr(0), fr(70)), papers = union(paper(-70), paper(0), paper(70));
  return out('lumiere-poster-frame-set', union(frames, papers), [z(frames, C.brass, 0.03), z(papers, C.paper, 0.03)], [-106, 70, -4, 106, 172, 8], 0.9, [1600, 600, 240], { ground: false });
}
