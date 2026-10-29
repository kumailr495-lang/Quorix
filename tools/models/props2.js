// LUMIERE props batch 2: decor for lobby, corridors and halls. cm, +Z front, floor y=0 (wall pieces: back on z=0 plane).
import { box, cylY, cylZ, sphere, ellipsoid, torusY, lathe, capsule, sunion, sub, union, inter, mirrorX as M, orient } from '../lib/sdf.js';
import { C, z } from './props.js';
const out = (name, sdf, zones, bounds, h, lods, extra = {}) => ({ name, sdf, zones, bounds, h, lods, ...extra });
const guard = (f, cx, cy, cz, hx, hy, hz) => (x, y, zz) => { const dx = Math.abs(x - cx) - hx, dy = Math.abs(y - cy) - hy, dz = Math.abs(zz - cz) - hz; const d = Math.hypot(Math.max(dx, 0), Math.max(dy, 0), Math.max(dz, 0)); return d > 8 ? d : f(x, y, zz); };
const ring = (n, R, fn) => { const a = []; for (let i = 0; i < n; i++) { const t = 2 * Math.PI * i / n; a.push(fn(R * Math.sin(t), R * Math.cos(t), t)); } return a; };

export function makeArmchair() {
  const base = box(0, 14, 0, 34, 12, 34, 6), seat = box(0, 32, 4, 33, 11, 31, 8), back = box(0, 64, -28, 34, 36, 9, 9), wings = M(box(32, 58, -14, 5, 28, 22, 6)), arms = M(box(33, 44, 4, 6, 15, 32, 6));
  let b = sunion(3, back, wings); for (const [x, y] of [[-14, 62], [0, 62], [14, 62], [-7, 76], [7, 76], [-7, 48], [7, 48]]) b = sub(b, sphere(x, y, -19, 2.2), 1);
  const body = sunion(3, base, seat, b, arms), legs = M(union(cylY(28, 28, 3.2, 0, 9, 1), cylY(28, -28, 3.2, 0, 9, 1)));
  return out('lumiere-armchair', union(sunion(1, body, legs)), [z(union(seat, b, arms), '#1f5f66', 0.08), z(base, C.walnut), z(legs, C.brass, 0.02)], [-46, -2, -42, 46, 112, 42], 1.5, [2400, 900, 320]);
}
export function makeCoffeeTable() {
  const top = cylY(0, 0, 44, 40, 44.5, 1.8), rim = torusY(0, 42.3, 0, 43, 1.3), stem = cylY(0, 0, 4.2, 5, 40, 1), foot = lathe(0, 0, [[0, 0], [30, 0], [30, 2], [10, 6], [0, 6]], 1), shelf = cylY(0, 0, 28, 14, 16, 1);
  return out('lumiere-coffee-table', sunion(1.5, top, stem, foot, shelf, rim), [z(top, C.marble, 0.05), z(union(rim, stem, foot, shelf), C.brass, 0.02)], [-48, -2, -48, 48, 50, 48], 1.2, [1500, 520, 200]);
}
export function makeBench() {
  const seat = box(0, 38, 0, 72, 8, 25, 6), base = box(0, 24, 0, 66, 5, 21, 3), legs = M(union(box(62, 11, 17, 3.5, 11, 3.5, 1.5), box(62, 11, -17, 3.5, 11, 3.5, 1.5))), rail = box(0, 24, 0, 68, 1.2, 22.5, 0.6);
  return out('lumiere-bench', sunion(1.5, seat, base, legs, rail), [z(seat, C.velvet, 0.08), z(union(base, legs), C.walnut), z(rail, C.brass, 0.02)], [-80, -2, -34, 80, 50, 34], 1.4, [1500, 520, 200]);
}
export function makeStanchion() {
  const foot = lathe(0, 0, [[0, 0], [17, 0], [17, 2], [5, 6], [0, 6]], 1), pole = cylY(0, 0, 2.2, 5, 92, 0.5), ball = sphere(0, 96, 0, 4.4), collar = torusY(0, 84, 0, 2.6, 1.3);
  return out('lumiere-stanchion', sunion(1, foot, pole, ball, collar), [z(sunion(1, foot, pole, ball, collar), C.brass, 0.02)], [-21, -2, -21, 21, 104, 21], 0.8, [800, 320, 130]);
}
export function makeRope() {
  let r = sphere(0, -999, 0, 1); const n = 14; for (let i = 0; i < n; i++) { const t0 = i / n, t1 = (i + 1) / n, f = (t) => [-74 + 148 * t, 84 - 16 * Math.sin(Math.PI * t) ** 1 * 1.0]; const [x0, y0] = f(t0), [x1, y1] = f(t1); r = sunion(1, r, capsule(x0, y0, 0, x1, y1, 0, 1.9)); }
  return out('lumiere-velvet-rope', r, [z(r, C.velvet, 0.06)], [-80, 60, -6, 80, 92, 6], 0.7, [500, 240, 100], { ground: false });
}
export function makeStatue() {
  const plinth = box(0, 28, 0, 30, 28, 30, 2), cap = box(0, 58, 0, 34, 2.5, 34, 1.2), robe = lathe(0, 0, [[0, 60], [16, 60], [15, 80], [11, 105], [9.5, 128], [6.5, 140], [0, 143]], 1.2), head = sphere(0, 153, 0, 7.6), hair = ellipsoid(0, 155, -2, 8.2, 8, 7.5);
  const arm = capsule(6, 134, 0, 21, 172, 4, 3.3), armL = capsule(-6, 134, 0, -14, 112, 8, 3), sun = torusY(21, 180, 4, 9, 1.4); const sunV = orient(torusY(0, 0, 0, 9, 1.4), 21, 180, 4, 90, 90);
  let rays = sphere(0, -999, 0, 1); for (let i = 0; i < 10; i++) { const a = 2 * Math.PI * i / 10; rays = union(rays, capsule(21, 180 + 4 * Math.cos(a), 4 + 4 * Math.sin(a), 21, 180 + 16 * Math.cos(a), 4 + 16 * Math.sin(a), 1.3)); }
  const fig = sunion(2, robe, head, hair, arm, armL, rays); const disc = sphere(21, 180, 4, 5);
  return out('lumiere-statue-deco', union(sunion(1.5, plinth, cap), sunion(1, fig, disc)), [z(union(plinth, cap), C.marble, 0.05), z(sunion(1, fig, disc), '#b08a3c', 0.05)].map((q, i) => (i ? { ...q, mat: 4 } : q)), [-48, -2, -40, 48, 205, 40], 1.5, [2800, 1000, 340]);
}
export function makeColumn() {
  const base = union(cylY(0, 0, 33, 0, 14, 2), torusY(0, 18, 0, 26.5, 3.6), cylY(0, 0, 30, 14, 20, 1)), shaft0 = cylY(0, 0, 24, 18, 452, 1.5), flutes = ring(16, 25.2, (x, zz) => cylY(x, zz, 3.1, 40, 430, 1.5));
  const shaft = flutes.reduce((a, f) => sub(a, f, 0.8), shaft0), bands = union(torusY(0, 120, 0, 24.5, 2.4), torusY(0, 390, 0, 24.5, 2.4)), cap = lathe(0, 0, [[0, 452], [26, 452], [30, 462], [40, 485], [40, 498], [0, 498]], 1.5), abacus = box(0, 505, 0, 44, 5, 44, 1.5);
  const g = guard(sunion(1.2, base, shaft, bands, cap, abacus), 0, 250, 0, 46, 260, 46);
  return out('lumiere-column', g, [z(union(base, shaft, cap, abacus), '#c9b995', 0.06), z(bands, C.brass, 0.02)].map((q, i) => ({ ...q, mat: i ? 4 : 11 })), [-50, -2, -50, 50, 515, 50], 2.2, [3000, 1100, 360]);
}
export function makeMirror() {
  const arch = (r, d) => union(box(0, 90, 2, r, 90, d, 1), cylZ(0, 180, r, 0, d + 2.5)), outer = arch(55, 2.5), inner = (r, zz) => union(box(0, 92, 2, r, 88, zz, 1), cylZ(0, 180, r, 0, zz * 2 + 0.5));
  const frame = sub(outer, inner(46, 1.2), 0.6), glass = sub(inner(46.4, 1.6), box(0, 92, 4.6, 70, 120, 2), 0); const crest = sphere(0, 238, 2.6, 6);
  return out('lumiere-wall-mirror', sunion(0.6, frame, glass, crest), [z(frame, C.gold, 0.03), z(glass, '#1a2733', 0.0), z(crest, C.gold)].map((q, i) => ({ ...q, mat: i === 1 ? 14 : 4 })), [-62, -4, -4, 62, 245, 12], 1.4, [1800, 650, 240], { ground: false });
}
export function makeClock() {
  const rimR = cylZ(0, 0, 30, 0, 5, 1.5), face = cylZ(0, 0, 25, 4, 6, 0.8), tick = union(box(0, 20, 6.4, 1, 4, 0.6, 0.3), box(0, -20, 6.4, 1, 4, 0.6, 0.3), box(20, 0, 6.4, 4, 1, 0.6, 0.3), box(-20, 0, 6.4, 4, 1, 0.6, 0.3)), h1 = capsule(0, 0, 7, 8, 12, 7, 1.1), h2 = capsule(0, 0, 7.6, -3, 20, 7.6, 0.8);
  const rays = union(...ring(16, 1, (a, b, t) => capsule(26 * Math.sin(t), 26 * Math.cos(t), 1.6, 41 * Math.sin(t), 41 * Math.cos(t), 1.6, 1.3)));
  const all = union(sunion(0.6, rimR, rays), face, tick, h1, h2); const off = (f) => (x, y, zz) => f(x, y - 60, zz);
  return out('lumiere-wall-clock', off(all), [z(off(rimR), C.gold, 0.03), z(off(face), '#efe3c8', 0.03), z(off(union(tick, h1, h2)), '#14100e', 0)].map((q, i) => ({ ...q, mat: i === 0 ? 4 : 0 })), [-46, 10, -3, 46, 110, 12], 1.0, [1000, 380, 160], { ground: false });
}
export function makePopcornMachine() {
  const base = box(0, 42, 0, 38, 42, 30, 3), trim = box(0, 86, 0, 40, 2.4, 32, 1.2), cab = box(0, 116, 0, 36, 28, 27, 2.5), roof = box(0, 150, 0, 40, 4, 30, 2), dome = ellipsoid(0, 156, 0, 22, 12, 18), pc = (() => { let a = sphere(0, -999, 0, 1); for (let i = 0; i < 26; i++) { const t = i * 2.4; a = union(a, sphere(-24 + (i % 7) * 8, 91 + 4.5 * Math.sin(t) ** 2 + (i % 3) * 3, -12 + ((i * 5) % 7) * 4, 5.2)); } return a; })();
  const wheel = M(cylY(36, 0, 12, 12, 16, 2)); const sign = box(0, 172, -2, 34, 12, 2, 1.5);
  const body = sunion(1.5, base, trim, cab, roof, dome, sign, pc);
  return out('lumiere-popcorn-machine', sunion(0.8, body, wheel), [z(base, '#a3162a', 0.06), z(union(trim, roof, sign), C.gold, 0.02), z(cab, '#2a1d14', 0.04), z(pc, '#f1e2b4', 0.1), z(wheel, C.black)].map((q, i) => ({ ...q, mat: i === 0 ? 9 : i === 1 ? 4 : i === 3 ? 8 : q.mat })), [-48, -2, -38, 48, 188, 38], 1.5, [2300, 800, 280]);
}
export function makeConcession() {
  const body = box(0, 52, 0, 182, 52, 34, 4), top = box(0, 106, 4, 186, 3, 38, 2), kick = box(0, 6, 4, 178, 3, 32, 1.5), glass = box(0, 66, 34.8, 166, 26, 1.6, 1), jar = (x) => sunion(1, cylY(x, 8, 9, 107, 135, 3), cylY(x, 8, 7.4, 135, 140, 1), sphere(x, 142, 8, 3.6));
  const jars = union(...[-150, -100, -50, 0, 50, 100, 150].map(jar)), till = box(120, 118, -8, 22, 12, 18, 3), frontTrim = box(0, 100, 34.6, 180, 1.2, 1.1, 0.5);
  const g = sunion(1.4, body, top, kick, glass, jars, till, frontTrim);
  return out('lumiere-concession-counter', g, [z(body, C.walnut, 0.1), z(top, C.marble, 0.05), z(union(kick, frontTrim), C.brass, 0.02), z(glass, '#162028', 0), z(jars, '#d9c9a0', 0.1), z(till, C.black)].map((q, i) => ({ ...q, mat: i === 3 ? 14 : i === 4 ? 14 : q.mat })), [-196, -2, -46, 196, 150, 50], 2.0, [3200, 1100, 360]);
}
export function makeBar() {
  const body = box(0, 55, 0, 190, 55, 30, 4), flutes = union(...Array.from({ length: 19 }, (_, i) => box(-171 + i * 19, 52, 31, 1.4, 44, 1.6, 0.7))), top = box(0, 112, 2, 195, 3.2, 36, 2), rail = box(0, 12, 36, 182, 1.4, 1.4, 0.7);
  const back = box(0, 118, -102, 190, 118, 10, 3), shelf = (y) => box(0, y, -88, 184, 1.8, 15, 0.8), shelves = union(shelf(90), shelf(135), shelf(180));
  const bott = (x, y, zz, h) => sunion(0.8, cylY(x, zz, 3.6, y, y + h, 1.4), cylY(x, zz, 1.4, y + h - 2, y + h + 9, 0.6)); let bs = sphere(0, -999, 0, 1), bs2 = sphere(0, -999, 0, 1);
  for (let r = 0; r < 3; r++) for (let i = 0; i < 17; i++) { const x = -168 + i * 21 + (r % 2) * 8, y = 91.2 + r * 45; (i + r) % 2 ? (bs = union(bs, bott(x, y, -88, 22))) : (bs2 = union(bs2, bott(x, y, -88, 25))); }
  const bots = guard(union(bs, bs2), 0, 140, -88, 196, 60, 18), cornice = box(0, 240, -100, 194, 6, 14, 2);
  const g = sunion(1.4, body, top, rail, back, shelves, cornice, flutes); const G = union(g, bots);
  return out('lumiere-bar-counter', G, [z(union(body, flutes, back), C.walnut, 0.1), z(top, C.marble, 0.05), z(union(rail, cornice, shelves), C.brass, 0.02), z(bs, '#2f5a38', 0.05), z(bs2, '#a8741f', 0.05)].map((q, i) => ({ ...q, mat: i > 2 ? 14 : q.mat })), [-204, -2, -120, 204, 252, 48], 2.0, [4200, 1500, 460]);
}
export function makeCoatRack() {
  const foot = lathe(0, 0, [[0, 0], [24, 0], [24, 3], [6, 8], [0, 8]], 1), pole = cylY(0, 0, 2.2, 6, 175, 0.6), arms = union(...ring(6, 1, (a, b, t) => capsule(0, 168, 0, 20 * Math.sin(t), 178, 20 * Math.cos(t), 1.5))), top = sphere(0, 181, 0, 3.2);
  const coat = (t, y) => ellipsoid(17 * Math.sin(t), y - 40, 17 * Math.cos(t), 11, 40, 9); const c1 = coat(0, 177, 0), c2 = coat(2.0944, 177, 0), c3 = coat(4.1888, 177, 0);
  const coats = union(c1, c2, c3);
  return out('lumiere-coat-rack', sunion(1, foot, pole, arms, top, coats), [z(union(foot, pole, arms, top), C.brass, 0.02), z(c1, '#3a2d4a', 0.06), z(c2, '#6a4a2e', 0.06), z(c3, '#26323a', 0.06)].map((q, i) => ({ ...q, mat: i ? 8 : 4 })), [-46, -2, -46, 46, 188, 46], 1.5, [1900, 700, 260], { multi: true });
}
export function makeTrashBin() {
  const drum = lathe(0, 0, [[0, 0], [18, 0], [20, 6], [20, 62], [18, 68], [0, 68]], 1.2), band = torusY(0, 40, 0, 20.6, 1.4), lid = sub(cylY(0, 0, 20, 66, 72, 3), cylY(0, 0, 12, 66.4, 80, 2), 0.6);
  return out('lumiere-trash-bin', sunion(1, drum, band, lid), [z(sunion(1, drum, lid), '#2a2a30', 0.04), z(band, C.brass, 0.02)].map((q, i) => ({ ...q, mat: i ? 4 : 9 })), [-26, -2, -26, 26, 80, 26], 1.0, [900, 330, 140]);
}
export function makeStandee() {
  const panel = box(0, 114, 0, 44, 100, 1.6, 1), frame = sub(box(0, 114, 0, 47, 103, 2.2, 1.5), box(0, 114, 1.4, 41, 97, 2, 1), 0.3), feet = M(box(26, 7, 14, 5, 7, 18, 2)), foot2 = box(0, 5, -14, 22, 5, 12, 1.5), brace = capsule(0, 8, -14, 0, 150, -1.2, 1.8);
  return out('lumiere-standee', sunion(0.8, panel, frame, feet, foot2, brace), [z(frame, C.brass, 0.03), z(panel, C.paper, 0.03), z(union(feet, brace, foot2), C.black)].map((q, i) => ({ ...q, mat: i === 0 ? 4 : q.mat })), [-54, -2, -34, 54, 222, 40], 1.2, [900, 360, 150]);
}
export function makeLightbox() {
  const fr = sub(box(0, 70, 5, 50, 70, 5, 2), box(0, 70, 8, 44, 64, 4, 1), 0.4), pan = box(0, 70, 6.2, 44, 64, 0.8, 0.4);
  // v4: no separate glow panel any more - the poster plane placed in the recess at runtime covers the opening completely, and the panel
  // (which never decimated below 1742 tris) only showed through the poster at grazing angles. `pan` is kept for reference.
  void pan;
  return [out('lumiere-lightbox', fr, [z(fr, C.brass, 0.03)].map((q) => ({ ...q, mat: 4 })), [-58, -4, -4, 58, 150, 16], 1.1, [900, 360, 150], { ground: false })];
}
export function makePalm() {
  const pot = lathe(0, 0, [[0, 0], [16, 0], [22, 30], [26, 42], [26, 46], [0, 46]], 1.2), rim = torusY(0, 46, 0, 25.4, 2.4), trunk = capsule(0, 40, 0, 4, 120, -3, 3.6), trunk2 = capsule(4, 120, -3, 6, 200, 0, 3);
  let fr = sphere(0, -999, 0, 0.5); for (let i = 0; i < 11; i++) { const yaw = i * 33 + (i % 3) * 8, pitch = 4 + (i % 4) * 13, len = 80 + (i % 3) * 18; fr = sunion(2, fr, orient(ellipsoid(0, 0, len / 2, 6.5, 3.8, len / 2), 6, 200 - (i % 2) * 14, 0, yaw, pitch)); }
  return out('lumiere-palm-tall', sunion(1.5, pot, rim, trunk, trunk2, fr), [z(pot, C.terra, 0.1), z(rim, C.brass), z(union(trunk, trunk2), '#6a5232', 0.1), z(fr, '#2f6b3a', 0.12)].map((q, i) => ({ ...q, mat: i === 0 ? 11 : i === 1 ? 4 : 0 })), [-150, -2, -150, 150, 300, 150], 2.1, [2600, 900, 320], { multi: true });
}
export function makeDoorLeaf() {   // hinge on the left edge (x=0), leaf extends to +x, 110 wide x 240 tall
  const slab = box(55, 120, 3, 55, 120, 3, 1.5), panels = union(...[[55, 58, 38, 42], [55, 166, 38, 50]].map(([x, y, hx, hy]) => sub(box(x, y, 6, hx, hy, 0.9, 0.6), box(x, y, 7, hx - 3, hy - 3, 0.9, 0.5), 0.2))), sun = union(...ring(9, 1, (a, b, t) => capsule(55, 166, 6.8, 55 + 26 * Math.sin(t), 166 + 26 * Math.cos(t), 6.8, 1, 1.0))), kick = box(55, 12, 6.2, 52, 12, 0.7, 0.4);
  const handle = orient(torusY(0, 0, 0, 7, 1.4), 94, 112, 8, 90, 90), plateH = box(94, 112, 6.4, 3, 12, 0.7, 0.5);
  const all = union(sunion(0.6, slab, panels, sun, kick), handle, plateH);
  return out('lumiere-door-leaf', all, [z(slab, '#3a2416', 0.1), z(union(panels, sun, kick, handle, plateH), C.brass, 0.02)].map((q, i) => ({ ...q, mat: i ? 4 : 2 })), [-6, -2, -8, 118, 246, 24], 1.2, [1800, 650, 240]);
}
export function makeMarquee() {
  const base = box(0, 40, 3, 140, 40, 3, 2), top = union(...[-100, -50, 0, 50, 100].map((x) => cylZ(x, 80, 26, 0, 6, 1.5))), frame = sub(sunion(2, base, top), box(0, 40, 6, 130, 30, 3, 1), 0.5);
  let bulbs = sphere(0, -999, 0, 1); for (let i = 0; i <= 26; i++) bulbs = union(bulbs, sphere(-130 + i * 10, 4, 6.8, 2.4), sphere(-130 + i * 10, 76, 6.8, 2.4)); for (let j = 1; j < 7; j++) bulbs = union(bulbs, sphere(-135, 4 + j * 12, 6.8, 2.4), sphere(135, 4 + j * 12, 6.8, 2.4));
  return [out('lumiere-marquee', frame, [z(frame, C.gold, 0.03)].map((q) => ({ ...q, mat: 4 })), [-150, -2, -2, 150, 112, 14], 1.4, [1500, 520, 200], { ground: false }),
    out('lumiere-marquee-glow', bulbs, [z(bulbs, '#ffe6b0', 0)], [-146, -2, 2, 146, 90, 14], 1.0, [700, 300, 120], { glow: true, ground: false, multi: true })];
}
export function makeCandyCabinet() {
  const body = sub(box(0, 105, 0, 98, 105, 42, 4), box(0, 100, 20, 90, 90, 30, 2), 0.8), glass = box(0, 100, 38, 93, 92, 1.2, 0.6), shelves = union(...[50, 90, 130, 170].map((y) => box(0, y, 8, 93, 1.6, 31, 0.6))), crown = sunion(2, box(0, 214, 0, 102, 4, 44, 2), box(0, 222, -4, 60, 8, 20, 3)), jars = union(...[-60, -20, 20, 60].flatMap((x) => [50, 90, 130, 170].map((y) => sunion(0.8, cylY(x, 8, 9, y, y + 16, 3), sphere(x, y + 18, 8, 4.5)))));
  const g = guard(jars, 0, 120, 8, 100, 80, 14);
  return out('lumiere-candy-cabinet', union(sunion(1.2, body, glass, shelves, crown), g), [z(body, C.walnut, 0.1), z(union(crown, shelves), C.brass, 0.02), z(glass, '#162028', 0), z(jars, '#c8527a', 0.12)].map((q, i) => ({ ...q, mat: i === 2 ? 14 : i === 3 ? 8 : q.mat })), [-108, -2, -50, 108, 232, 50], 1.8, [2600, 900, 300]);
}
export function makeFanSconce() {
  const plate = box(0, 40, 1.5, 9, 22, 1.5, 1), fan = (r) => inter(cylZ(0, 20, r, 2, 10, 1), box(0, 45, 6, 60, 25, 8)), ribs = union(...[0, 1, 2, 3, 4, 5].map((i) => sub(fan(26 - i * 4), fan(24.4 - i * 4), 0.2))), cup = lathe(0, 6, [[0, 38], [4, 38], [9, 50], [8, 51], [0, 41]], 0.6);
  const body = sunion(1, plate, ribs, cup), bulb = sphere(0, 47, 6, 3.6);
  return [out('lumiere-fan-sconce', body, [z(body, C.gold, 0.03)].map((q) => ({ ...q, mat: 4 })), [-32, 8, -2, 32, 80, 24], 1.0, [1000, 380, 160], { ground: false, multi: true }),
    out('lumiere-fan-sconce-glow', bulb, [z(bulb, '#ffd9a0', 0)], [-8, 38, 0, 8, 56, 14], 0.8, [160, 80, 40], { glow: true, ground: false })];
}
