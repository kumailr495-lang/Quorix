// Humanoid skeleton + analytic skin weights. cm, character faces +Z, feet y=0, character's LEFT is +X.
export function skeleton(p) {
  const sh = p.sh, hp = p.hip;
  const J = {  // joint pivots
    hips: [0, 94, 0], spine: [0, 100, 0], chest: [0, 118, 0], neck: [0, 143, 0], head: [0, 153, 0],
    uaL: [sh, 141, 0], faL: [sh + 3, 112, 1], haL: [sh + 5, 87, 3], haLend: [sh + 6, 76, 4],
    thL: [hp, 92, 0], shL: [hp, 50, 2], ftL: [hp, 10, 0], ftLend: [hp, 3, 13],
  };
  const m = (a) => [-a[0], a[1], a[2]];
  const R = { hips: [13, 3], spine: [11.5, 3], chest: [14, 3.5], neck: [4.6, 0], head: [9.5, 0], upperArmL: [4.2, 0], foreArmL: [3.2, 0], handL: [2.6, 0], upperArmR: [4.2, 0], foreArmR: [3.2, 0], handR: [2.6, 0], thighL: [6.6, 0], shinL: [4.2, 0], footL: [4.5, 0], thighR: [6.6, 0], shinR: [4.2, 0], footR: [4.5, 0] };
  const bones = [
    { name: 'hips', parent: -1, pos: J.hips, seg: [[0, 86, 0], [0, 101, 0]] },
    { name: 'spine', parent: 0, pos: J.spine, seg: [[0, 101, 0], J.chest] },
    { name: 'chest', parent: 1, pos: J.chest, seg: [J.chest, J.neck] },
    { name: 'neck', parent: 2, pos: J.neck, seg: [J.neck, J.head] },
    { name: 'head', parent: 3, pos: J.head, seg: [J.head, [0, 175, 1]] },
    { name: 'upperArmL', parent: 2, pos: J.uaL, seg: [J.uaL, J.faL] }, { name: 'foreArmL', parent: 5, pos: J.faL, seg: [J.faL, J.haL] }, { name: 'handL', parent: 6, pos: J.haL, seg: [J.haL, J.haLend] },
    { name: 'upperArmR', parent: 2, pos: m(J.uaL), seg: [m(J.uaL), m(J.faL)] }, { name: 'foreArmR', parent: 8, pos: m(J.faL), seg: [m(J.faL), m(J.haL)] }, { name: 'handR', parent: 9, pos: m(J.haL), seg: [m(J.haL), m(J.haLend)] },
    { name: 'thighL', parent: 0, pos: J.thL, seg: [J.thL, J.shL] }, { name: 'shinL', parent: 11, pos: J.shL, seg: [J.shL, J.ftL] }, { name: 'footL', parent: 12, pos: J.ftL, seg: [J.ftL, J.ftLend] },
    { name: 'thighR', parent: 0, pos: m(J.thL), seg: [m(J.thL), m(J.shL)] }, { name: 'shinR', parent: 14, pos: m(J.shL), seg: [m(J.shL), m(J.ftL)] }, { name: 'footR', parent: 15, pos: m(J.ftL), seg: [m(J.ftL), m(J.ftLend)] },
  ];
  for (const b of bones) { b.r = R[b.name][0]; b.bias = R[b.name][1]; }
  return bones;
}
const segDist = (p, a, b) => { const px = p[0] - a[0], py = p[1] - a[1], pz = p[2] - a[2], bx = b[0] - a[0], by = b[1] - a[1], bz = b[2] - a[2];
  const t = Math.min(1, Math.max(0, (px * bx + py * by + pz * bz) / (bx * bx + by * by + bz * bz + 1e-9))); return Math.hypot(px - bx * t, py - by * t, pz - bz * t); };
// positions: Float32/64 array (cm). skirt(p) optional -> {hipsBlend} for rigid skirts. returns {joints:Uint8Array(n*4), weights:Float32Array(n*4)}
export function skinWeights(P, bones, tau = 2.2, opts = {}) {
  const n = P.length / 3, joints = new Uint8Array(n * 4), weights = new Float32Array(n * 4), d = new Float64Array(bones.length);
  for (let v = 0; v < n; v++) {
    const p = [P[3*v], P[3*v+1], P[3*v+2]]; let dm = 1e9; for (let b = 0; b < bones.length; b++) { d[b] = Math.max(0, segDist(p, bones[b].seg[0], bones[b].seg[1]) - bones[b].r) - bones[b].bias; if (d[b] < dm) dm = d[b]; }
    const w = []; for (let b = 0; b < bones.length; b++) { const e = d[b] - dm; if (e < tau * 6) w.push([b, Math.exp(-e / tau)]); }
    if (opts.skirt && opts.skirt(p)) { // rigid-ish skirt: mostly hips, blending toward the nearest thigh toward the hem
      const t = Math.min(1, Math.max(0, (104 - p[1]) / 55)) * 0.42, th = p[0] >= 0 ? 11 : 14; w.length = 0; w.push([0, 1 - t]); w.push([th, t]); }
    w.sort((a, b) => b[1] - a[1]); const top = w.slice(0, 4); let s = 0; for (const t of top) s += t[1];
    for (let k = 0; k < 4; k++) { joints[4*v+k] = top[k] ? top[k][0] : 0; weights[4*v+k] = top[k] ? top[k][1] / s : 0; }
  }
  return { joints, weights };
}
