// LUMIERE theatre seat: a plush, sofa-style luxury recliner (one fused solid). cm, +Z front, floor y=0, symmetric in X.
import { box, cylY, ellipsoid, mirrorX as M, sunion, sub, union, rotX } from '../lib/sdf.js';
const TILT = 12;
export function makeSeat() {
  const plinth = box(0, 4, -2, 36, 4, 38, 2);
  const base = box(0, 16, -4, 40, 10, 42, 6);
  const fascia = box(0, 17, 38, 27, 11, 6, 4);
  const plate = box(0, 20, 43.9, 8, 2.6, 0.9, 0.5);
  const holeAt = (r) => M(cylY(35, 16, r, 52, 90));
  const arm0 = M(box(35, 44, -2, 10, 20, 45, 8));
  const inlay0 = M(box(35, 63.0, 10, 7.0, 1.4, 24, 1.0));
  const arm = sub(arm0, holeAt(3.9), 0.8);
  const inlay = sub(inlay0, holeAt(3.9), 0.5);
  const ring = sub(M(cylY(35, 16, 5.0, 61.2, 65.1, 0.6)), holeAt(3.9), 0.3);
  const liner = sub(M(cylY(35, 16, 4.6, 52, 62.4)), holeAt(3.1), 0.2);
  const cushion0 = sunion(2.5, box(0, 38, 4, 26, 10, 38, 8), ellipsoid(0, 47, 4, 22, 3.6, 32));
  const cushion = sub(cushion0, M(box(10, 49, 4, 1.3, 2.8, 30, 1)), 1.0);
  let bc = sunion(2.5, box(0, 78, -30, 26, 29, 10, 9), box(0, 103, -26, 17, 8, 8, 6), M(box(30, 70, -30, 6, 24, 14, 5)));
  for (const yg of [68, 80, 92]) bc = sub(bc, box(0, yg, -19.2, 21, 1.3, 2.8, 1.0), 1.0);
  const backCush = rotX(bc, 48, -26, TILT);
  const shell = rotX(box(0, 74, -44, 38, 32, 8, 7), 48, -26, TILT);
  const leather = union(plinth, base, fascia, shell);
  const velvet = union(cushion, backCush, arm);
  const body = sunion(3.2, plinth, base, fascia, arm, cushion, backCush, shell);
  const sdf = union(sunion(0.6, body, inlay, plate, ring), liner);
  return {
    name: 'lumiere-theatre-seat', sdf, bounds: [-52, -3, -72, 52, 118, 54], h: 1.2, lods: [2600, 1000, 380],
    zones: [
      { f: velvet, color: '#8f1426', var: 0.07, mat: 1 }, { f: leather, color: '#2a2a30', var: 0.04, mat: 9 },
      { f: inlay, color: '#4a2c19', var: 0.10, mat: 2 }, { f: plate, color: '#d1a53a', var: 0.02, mat: 4 },
      { f: ring, color: '#b9bcc4', var: 0.02, mat: 4 }, { f: liner, color: '#111114', var: 0.0, mat: 9 },
    ],
  };
}
