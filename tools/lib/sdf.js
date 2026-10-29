// LUMIERE v3 - tiny signed-distance-field kit. Units: centimetres. f(x,y,z) < 0 is inside.
const { abs, max, min, sqrt, sin, cos, PI } = Math;
export const box = (cx, cy, cz, hx, hy, hz, r = 0) => (x, y, z) => {
  const qx = abs(x - cx) - (hx - r), qy = abs(y - cy) - (hy - r), qz = abs(z - cz) - (hz - r);
  const ox = max(qx, 0), oy = max(qy, 0), oz = max(qz, 0);
  return sqrt(ox * ox + oy * oy + oz * oz) + min(max(qx, qy, qz), 0) - r;
};
export const sphere = (cx, cy, cz, r) => (x, y, z) => sqrt((x - cx) ** 2 + (y - cy) ** 2 + (z - cz) ** 2) - r;
export const ellipsoid = (cx, cy, cz, rx, ry, rz) => (x, y, z) => {          // approximate (good for soft domes)
  const k0 = sqrt(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + ((z - cz) / rz) ** 2);
  const k1 = sqrt(((x - cx) / (rx * rx)) ** 2 + ((y - cy) / (ry * ry)) ** 2 + ((z - cz) / (rz * rz)) ** 2);
  return k1 < 1e-9 ? -min(rx, ry, rz) : k0 * (k0 - 1) / k1;
};
// vertical capped cylinder, optional edge rounding
export const cylY = (cx, cz, r, y0, y1, rnd = 0) => (x, y, z) => {
  const d = sqrt((x - cx) ** 2 + (z - cz) ** 2) - (r - rnd), h = abs(y - (y0 + y1) / 2) - ((y1 - y0) / 2 - rnd);
  return sqrt(max(d, 0) ** 2 + max(h, 0) ** 2) + min(max(d, h), 0) - rnd;
};
export const cylX = (cy, cz, r, x0, x1, rnd = 0) => (x, y, z) => cylY(cy, cz, r, x0, x1, rnd)(y, x, z);
export const cylZ = (cx, cy, r, z0, z1, rnd = 0) => (x, y, z) => cylY(cx, cy, r, z0, z1, rnd)(x, z, y);
export const capsule = (ax, ay, az, bx, by, bz, r) => (x, y, z) => {
  const px = x - ax, py = y - ay, pz = z - az, bax = bx - ax, bay = by - ay, baz = bz - az;
  const h = Math.min(1, Math.max(0, (px * bax + py * bay + pz * baz) / (bax * bax + bay * bay + baz * baz)));
  return sqrt((px - bax * h) ** 2 + (py - bay * h) ** 2 + (pz - baz * h) ** 2) - r;
};
export const torusY = (cx, cy, cz, R, r) => (x, y, z) => {
  const q = sqrt((x - cx) ** 2 + (z - cz) ** 2) - R; return sqrt(q * q + (y - cy) ** 2) - r;
};
// solid of revolution about the vertical axis from a closed 2D polygon [[r,y],...] (r>=0), grown by `rad` (rounds corners)
export const lathe = (cx, cz, poly, rad = 0) => (x, y, z) => {
  const px = sqrt((x - cx) ** 2 + (z - cz) ** 2), py = y; let d = 1e9, s = 1; const n = poly.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const ex = poly[j][0] - poly[i][0], ey = poly[j][1] - poly[i][1], wx = px - poly[i][0], wy = py - poly[i][1];
    const t = Math.min(1, Math.max(0, (wx * ex + wy * ey) / (ex * ex + ey * ey + 1e-12)));
    const bx = wx - ex * t, by = wy - ey * t; d = min(d, bx * bx + by * by);
    const c1 = py >= poly[i][1], c2 = py < poly[j][1], c3 = ex * wy > ey * wx;
    if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) s = -s;
  }
  return s * sqrt(d) - rad;
};
export const smin = (a, b, k) => { const h = Math.min(1, Math.max(0, 0.5 + 0.5 * (b - a) / k)); return b * (1 - h) + a * h - k * h * (1 - h); };
export const smax = (a, b, k) => -smin(-a, -b, k);
export const union = (...fs) => (x, y, z) => { let d = fs[0](x, y, z); for (let i = 1; i < fs.length; i++) d = min(d, fs[i](x, y, z)); return d; };
export const sunion = (k, ...fs) => (x, y, z) => { let d = fs[0](x, y, z); for (let i = 1; i < fs.length; i++) d = smin(d, fs[i](x, y, z), k); return d; };
export const sub = (a, b, k = 0) => k ? (x, y, z) => smax(a(x, y, z), -b(x, y, z), k) : (x, y, z) => max(a(x, y, z), -b(x, y, z));
export const inter = (a, b) => (x, y, z) => max(a(x, y, z), b(x, y, z));
export const mirrorX = (f) => (x, y, z) => f(abs(x), y, z);
export const move = (f, dx, dy, dz) => (x, y, z) => f(x - dx, y - dy, z - dz);
// rotate about X through pivot (py,pz) by deg: positive tilts the TOP toward -z (i.e. backwards when front is +z)
export const rotX = (f, py, pz, deg) => { const a = deg * PI / 180, c = cos(a), s = sin(a);
  return (x, y, z) => { const yy = y - py, zz = z - pz; return f(x, py + yy * c - zz * s, pz + yy * s + zz * c); }; };
export const rotY = (f, px, pz, deg) => { const a = deg * PI / 180, c = cos(a), s = sin(a);
  return (x, y, z) => { const xx = x - px, zz = z - pz; return f(px + xx * c + zz * s, y, pz - xx * s + zz * c); }; };
export const scaleUniform = (f, s) => (x, y, z) => f(x / s, y / s, z / s) * s;
// repeat-free helpers
export const slab = (axis, c, half) => (x, y, z) => abs((axis === 'x' ? x : axis === 'y' ? y : z) - c) - half;
// place f in a local frame: origin (cx,cy,cz), local +z points along yaw (about Y) then pitch up (about X)
export const orient = (f, cx, cy, cz, yawDeg, pitchDeg = 0) => {
  const ya = yawDeg * PI / 180, pa = pitchDeg * PI / 180, cw = cos(ya), sw = sin(ya), cp = cos(pa), sp = sin(pa);
  return (x, y, z) => { const dx = x - cx, dy = y - cy, dz = z - cz;
    const x1 = dx * cw - dz * sw, z1 = dx * sw + dz * cw; return f(x1, dy * cp - z1 * sp, dy * sp + z1 * cp); };
};
// box in (radial, y, arc-length) coordinates around a vertical axis at (cx,cz): a curved slab. angle 0 = +z, positive toward +x.
export const sector = (cx, cz, r0, r1, y0, y1, halfDeg, rnd = 0) => {
  const rm = (r0 + r1) / 2, hr = (r1 - r0) / 2, hy = (y1 - y0) / 2, ym = (y0 + y1) / 2, ha = halfDeg * PI / 180;
  return (x, y, z) => { const dx = x - cx, dz = z - cz, r = Math.hypot(dx, dz) + 1e-9, th = Math.atan2(dx, dz);
    const qa = (Math.abs(th) - ha) * rm, qr = Math.abs(r - rm) - (hr - rnd), qy = Math.abs(y - ym) - (hy - rnd), qs = qa - 0 + rnd;
    const a = Math.max(qr, 0), b = Math.max(qy, 0), c = Math.max(qs, 0);
    return Math.sqrt(a * a + b * b + c * c) + Math.min(Math.max(qr, qy, qs), 0) - rnd; };
};
