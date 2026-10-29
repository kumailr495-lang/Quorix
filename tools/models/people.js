// LUMIERE people: SDF-sculpted, skinned humanoids. cm, faces +Z, feet y=0, character's left = +X. Poses are driven procedurally in the app.
import { box, sphere, ellipsoid, capsule, cylY, torusY, lathe, sunion, sub, union, inter, mirrorX as M } from '../lib/sdf.js';
import { skeleton } from '../lib/skin.js';
const rcone = (ax, ay, az, bx, by, bz, ra, rb) => (x, y, z) => { const px = x - ax, py = y - ay, pz = z - az, qx = bx - ax, qy = by - ay, qz = bz - az;
  const h = Math.min(1, Math.max(0, (px * qx + py * qy + pz * qz) / (qx * qx + qy * qy + qz * qz))); return Math.hypot(px - qx * h, py - qy * h, pz - qz * h) - (ra + (rb - ra) * h); };
const above = (y0) => box(0, (y0 + 220) / 2, 0, 90, (220 - y0) / 2, 90), below = (y1) => box(0, (y1 - 20) / 2, 0, 90, (y1 + 20) / 2, 90);
const Z = (f, color, mat, v = 0.03) => ({ f, color, mat, var: v });
const MAT = { plain: 0, brass: 4, cloth: 8, leather: 9, skin: 12, hair: 13, satin: 15 };

export function makePerson(v) {
  const f = v.sex === 'f', sh = f ? 17.5 : 19.5, hp = f ? 9.8 : 9.2, P = { sh, hip: hp };
  // ---- body
  const pel = ellipsoid(0, 92, 0, f ? 16.6 : 15.2, 10.5, 10.8), wst = ellipsoid(0, 106, 0, f ? 11.4 : 13.2, 12, f ? 8.8 : 9.8), chs = ellipsoid(0, 127, 0, f ? 13.8 : 15.8, 15, f ? 10 : 11.4);
  const shld = M(capsule(sh - 5.5, 141.5, 0, sh, 140.8, 0, 5.2)), bust = f ? M(ellipsoid(5.6, 128, 7.4, 5.4, 5, 5.2)) : null;
  let torso = sunion(5, pel, wst, chs, shld); if (bust) torso = sunion(3, torso, bust);
  const neck = capsule(0, 143, 0.2, 0, 154, 1.2, 5.0);
  // smooth sculpted head: skull + lower face + brow ridge + chin + lips; eyes, brows and lip colour are painted in the app (faces.js)
  const head = sunion(3, ellipsoid(0, 164, 1.2, 9.2, 11.2, 10), ellipsoid(0, 158, 3.6, 6.8, 6.2, 6.8), sunion(1.6, ellipsoid(0, 167.4, 7.4, 6.3, 1.5, 2.6), ellipsoid(0, 154.6, 6.2, 3.3, 2.3, 3.0), ellipsoid(0, 157.4, 8.9, 2.5, 1.05, 1.1)));
  const nose = ellipsoid(0, 161.5, 10.6, 1.6, 3, 2.2), ears = M(ellipsoid(9.0, 163, 0.5, 1.2, 3, 2.2));
  const ua = M(rcone(sh, 141, 0, sh + 3, 112, 1, f ? 4.2 : 4.7, f ? 3.4 : 3.9)), fa = M(rcone(sh + 3, 112, 1, sh + 5, 87, 3, f ? 3.3 : 3.7, f ? 2.5 : 2.8)), hand = M(ellipsoid(sh + 5.6, 80.5, 3.6, 2.3, 5.6, 3.3));
  const thigh = M(rcone(hp, 92, 0, hp, 50, 2, f ? 7.8 : 7.4, 5.2)), shin = M(rcone(hp, 50, 2, hp, 10, 0, 4.9, 3.3));
  const shoe = M(sunion(2, ellipsoid(hp, 4.3, 4.6, 4.7, 4.3, 9.4), ellipsoid(hp, 7.2, -0.6, 3.9, 5, 4.3)));
  // ---- outfit geometry (extra volume) + zone regions
  const top = v.top, long = top !== 'tshirt';
  const hemY = { jacket: 86, uniform: 84, coat: 52, shirt: 100, vest: 100, tshirt: 100, dress: 100 }[top] ?? 100;
  const extra = [];
  let skirt = null;
  if (top === 'jacket' || top === 'uniform') extra.push(ellipsoid(0, 98, 0, f ? 18 : 17.2, 13.5, f ? 12 : 12.6));
  if (top === 'coat') { skirt = lathe(0, 0, [[0, 110], [15, 110], [18, 98], [22.5, 70], [24.5, 50], [0, 50]], 1.0); extra.push(skirt); }
  if (top === 'dress') { skirt = lathe(0, 0, [[0, 106], [13.5, 106], [17, 98], [23, 74], [26.5, v.hem ?? 58], [0, v.hem ?? 58]], 1.0); extra.push(skirt); }
  const body = sunion(3, torso, neck, head, nose, ears, ua, fa, hand, thigh, shin, shoe, ...extra);
  // hair
  const H = v.hair || {}; let hair = null; const shell = ellipsoid(0, 166, 0.2, 10.0, 11.9, 10.7);
  const faceCut = box(0, 160, 11, 30, 11, 8, 2);   // keeps the face clear of hair
  if (H.style === 'short') hair = sub(shell, faceCut, 0.5);
  else if (H.style === 'slick') hair = sub(sunion(2, shell, ellipsoid(0, 164, -2.5, 9.6, 11, 8.6)), faceCut, 0.5);
  else if (H.style === 'bob') hair = sub(sunion(3, shell, ellipsoid(0, 158, -1.5, 10.8, 11.6, 10.2)), box(0, 152, 8, 30, 12, 10, 2), 0.5);
  else if (H.style === 'long') hair = sub(sunion(4, shell, capsule(0, 165, -6.5, 0, 128, -8.5, 9.0), ellipsoid(0, 150, -4, 11, 20, 9.4)), box(0, 150, 12, 30, 24, 9, 2), 0.5);
  else if (H.style === 'bun') hair = sub(sunion(2.5, shell, sphere(0, 177, -6.5, 5.2)), faceCut, 0.5);
  const cap = v.cap ? sunion(1.2, cylY(0, 1.2, 9.9, 171, 179, 1.5), cylY(0, 1.2, 10.6, 170.5, 172, 0.5)) : null;
  const hat = v.hat ? sunion(1.5, cylY(0, 0.5, 8.6, 172, 184, 3), ellipsoid(0, 172.2, 1, 15.5, 1.4, 15.5)) : null;
  const bodyAll = sunion(1.2, ...[body, hair, cap, hat].filter(Boolean));
  // accessories
  const acc = [];
  if (top === 'uniform' || top === 'jacket') for (const [y, zz] of [[132, 10.4], [125, 11.2], [118, 10.8], [111, 9.7]]) acc.push(sphere(0, y, zz + 0.6, 1.25));
  const bow = v.bow ? sunion(0.5, M(ellipsoid(3.0, 140.2, 6.4, 2.8, 1.9, 1.7)), sphere(0, 140.2, 6.8, 1.5)) : null;
  const belt = v.belt ? sub(ellipsoid(0, 105, 0, 13.4, 1.8, 10.4), ellipsoid(0, 105, 0, 11.4, 3, 8.4)) : null;
  const scarf = v.scarf ? torusY(0, 143.5, 0.6, 6.3, 2.4) : null;
  const apron = v.apron ? box(0, 92, 10.6, 11.5, 25, 1.1, 0.6) : null;
  const all = sunion(0.8, bodyAll, ...[bow, belt, scarf, apron, ...acc].filter(Boolean));
  // ---- zones
  const slab = (s, y0) => inter(s, above(y0)), under = (s, y1) => inter(s, below(y1));
  const clothTop = union(slab(sunion(2, torso, ...extra.filter((e) => e !== skirt)), hemY), long ? ua : under(ua, 0), long ? slab(fa, v.cuffY ?? 90) : sphere(0, -999, 0, 1));
  const sleeveTop = long ? union(ua, slab(fa, v.cuffY ?? 90)) : slab(ua, 126);
  const topZone = top === 'dress' ? union(slab(torso, 104), sleeveTop, skirt) : top === 'coat' ? union(slab(torso, 100), skirt, sleeveTop) : union(slab(sunion(2, torso, ...extra.filter((e) => e !== skirt)), hemY), sleeveTop);
  const botZone = (top === 'dress' || top === 'coat') ? (v.legs === 'skin' ? sphere(0, -999, 0, 1) : under(union(thigh, shin), v.hem ?? 58)) : under(union(sunion(2, pel, thigh), shin), 102);
  const skinParts = [neck, head, nose, ears, hand]; if (!long) skinParts.push(under(fa, 1000)); if (top === 'dress' && v.legs === 'skin') skinParts.push(thigh, shin);
  const skinZone = union(...skinParts, long ? sphere(0, -999, 0, 1) : fa);
  const zones = [
    Z(skinZone, v.skin, MAT.skin, 0.02), Z(topZone, v.topColor, top === 'dress' ? MAT.satin : MAT.cloth, 0.05), Z(botZone, v.bottomColor || v.topColor, MAT.cloth, 0.05), Z(shoe, v.shoe || '#181412', MAT.leather, 0.02),
  ];
  // hair wins cleanly over the scalp just beneath it (bias 1.4 cm); a cap or hat sits on top of the hair, so it gets a larger bias and wins over both
  if (hair) zones.push({ ...Z(hair, H.color, MAT.hair, 0.12), bias: 1.4 });
  if (cap) zones.push({ ...Z(cap, v.capColor || v.topColor, MAT.cloth), bias: 2.0 }); if (hat) zones.push({ ...Z(hat, v.hatColor || '#8a7452', MAT.cloth), bias: 2.0 });
  if (acc.length) zones.push(Z(union(...acc), '#d1a53a', MAT.brass, 0.02)); if (bow) zones.push(Z(bow, v.bowColor || '#14100e', MAT.cloth)); if (belt) zones.push(Z(belt, '#d1a53a', MAT.brass, 0.02));
  if (scarf) zones.push(Z(scarf, v.scarfColor || '#8f1426', MAT.cloth)); if (apron) zones.push(Z(apron, v.apronColor || '#ece6d6', MAT.cloth));
  if (v.vest) zones.push(Z(inter(sunion(2, chs, wst), above(100)), v.vest, MAT.cloth));
  const bones = skeleton(P);
  return { name: v.id, sdf: all, zones, bounds: [-40, -2, -31, 40, 188, 31], h: 1.0, lods: [6500, 2200, 700], attrWeight: 14,
    importance: (x, y, z) => (y > 145 ? (z > 2 && y < 172 ? 16 : 9) : 1) * (Math.abs(Math.abs(x) - (sh + 5.5)) < 5 && y < 92 && y > 70 ? 3 : 1), tau: 0.7, aoNear: 2.2, aoFar: 7, tile: 30, ground: true, exportScale: v.height / 176,
    skin: { bones, tau: 2.2, skirt: skirt ? (p) => skirt(p[0], p[1], p[2]) < 1.5 && p[1] < 108 : null } };
}
const V = (o) => ({ sex: 'm', bottomColor: null, ...o });
export const PEOPLE = [
  V({ id: 'lumiere-npc-receptionist', sex: 'f', height: 168, skin: '#d9a688', topColor: '#1f6068', top: 'dress', hem: 56, belt: true, hair: { style: 'bob', color: '#1c130f' }, lips: '#a63a40', shoe: '#14100e' }),
  V({ id: 'lumiere-npc-usher', sex: 'm', height: 178, skin: '#b8795a', topColor: '#6d1020', bottomColor: '#17171b', top: 'uniform', bow: true, cap: true, capColor: '#6d1020', hair: { style: 'short', color: '#1d1511' } }),
  V({ id: 'lumiere-npc-bartender', sex: 'm', height: 176, skin: '#d2a07c', topColor: '#e9e3d4', bottomColor: '#17171b', top: 'shirt', vest: '#2a2a30', bow: true, apron: true, hair: { style: 'slick', color: '#14100e' } }),
  V({ id: 'lumiere-npc-patron-m1', sex: 'm', height: 180, skin: '#c58f6c', topColor: '#2e3542', bottomColor: '#2a303c', top: 'jacket', bow: false, hair: { style: 'short', color: '#2a1d14' } }),
  V({ id: 'lumiere-npc-patron-m2', sex: 'm', height: 174, skin: '#e2b896', topColor: '#6a4a2e', bottomColor: '#38322c', top: 'coat', scarf: true, scarfColor: '#9c1a2a', hair: { style: 'short', color: '#3a2414' } }),
  V({ id: 'lumiere-npc-patron-f1', sex: 'f', height: 166, skin: '#c98e6a', topColor: '#8f1426', top: 'dress', hem: 62, belt: true, hair: { style: 'long', color: '#241710' }, lips: '#8e2430' }),
  V({ id: 'lumiere-npc-patron-f2', sex: 'f', height: 163, skin: '#e6bf9f', topColor: '#b9923c', top: 'coat', legs: 'skin', hair: { style: 'bob', color: '#5a2c16' }, lips: '#a64a50' }),
  V({ id: 'lumiere-npc-patron-f3', sex: 'f', height: 170, skin: '#a8714f', topColor: '#2e6a45', top: 'dress', hem: 52, belt: false, hair: { style: 'bun', color: '#14100e' }, lips: '#7e2a30' }),
  V({ id: 'lumiere-npc-patron-m3', sex: 'm', height: 172, skin: '#d8ad8a', topColor: '#8c7a58', bottomColor: '#7a6a4a', top: 'jacket', hat: true, hatColor: '#4a3c28', hair: { style: 'short', color: '#cfcac0' } }),
];
export const personFns = Object.fromEntries(PEOPLE.map((p) => [p.id, () => makePerson(p)]));

export const npc_receptionist = personFns['lumiere-npc-receptionist'];
export const npc_usher = personFns['lumiere-npc-usher'];
export const npc_bartender = personFns['lumiere-npc-bartender'];
export const npc_patron_m1 = personFns['lumiere-npc-patron-m1'];
export const npc_patron_m2 = personFns['lumiere-npc-patron-m2'];
export const npc_patron_f1 = personFns['lumiere-npc-patron-f1'];
export const npc_patron_f2 = personFns['lumiere-npc-patron-f2'];
export const npc_patron_f3 = personFns['lumiere-npc-patron-f3'];
export const npc_patron_m3 = personFns['lumiere-npc-patron-m3'];
