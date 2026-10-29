// LUMIERE v5 - auditorium geometry, computed (not guessed) from the UNIC cinema-design rules. Pure maths, no THREE.
// Rules used (Gjestland, "How to design a cinema auditorium", UNIC 2nd ed.):
//   D1 >= 0.6 W; row 1 eye -> picture centre <= 25 deg, -> top <= 45 deg; seated eye 1.2 m over the row floor
//   riser formula with a fixed sightline clearance c (4.7); row distance >= 1.2 m, recliners 1.6-1.8 m; steps <= 0.20 m
//   curved screen chord depth ~5% (8% here so the curve reads on a phone); crossing aisle at entrance level (5.6.1)
// tools/dev/hall-calc.mjs prints the resulting table; docs/V5-DESIGN.md section 3 quotes it.
export const SPECS = [
  { id: 'I', key: 'hallI', name: 'SCREEN 1', kind: 'standard', aspect: 1.85, W: 12.0, D1: 7.4, pitch: 1.2, rows: 11, crossAfter: 5, crossW: 1.5, eye: 1.2, hB: 1.0, c: 0.18, seatW: 0.6, perRow: 18, sag: 0, rowR: 0, x0: -28, x1: -14 },
  { id: 'II', key: 'hallII', name: 'SCREEN 2', kind: 'curved', aspect: 2.39, W: 14.0, D1: 8.4, pitch: 1.7, rows: 7, crossAfter: 3, crossW: 1.3, eye: 1.1, hB: 1.1, c: 0.18, seatW: 0.86, perRow: 14, sag: 0.08, rowR: 24, x0: 14, x1: 30 },
  { id: 'III', key: 'hallIII', name: 'SCREEN 3', kind: 'giant', aspect: 1.90, W: 20.0, D1: 9.0, pitch: 1.2, rows: 9, crossAfter: 3, crossW: 1.6, eye: 1.2, hB: 0.6, c: 0.18, seatW: 0.62, perRow: 30, sag: 0.025, rowR: 0, x0: -11, x1: 11 },
];
// seat footprint relative to the hip point (seat cushion centre): front edge fr, back of the backrest bk
export const SEAT = { standard: { fr: 0.3, bk: 0.32, eye: 1.15 }, curved: { fr: 0.42, bk: 0.42, eye: 1.05 }, giant: { fr: 0.3, bk: 0.32, eye: 1.15 } };
export const BACK_Z = -6.3, BEHIND = 1.0, TREAD = 0.3, MAX_STEP = 0.2;
// riser formula (UNIC 4.7): Y_n = X_n (Y_1 / X_1 + c * sum_{m=1..n} 1/X_m) - c   (Y = eye height above the bottom picture line)
export function calc(s) {
  const H = s.W / s.aspect, X = [], Y = [];
  for (let n = 0; n < s.rows; n++) X.push(s.D1 + n * s.pitch + (n > s.crossAfter ? s.crossW : 0));
  const Y1 = s.eye - s.hB; let sum = 0;
  for (let n = 0; n < s.rows; n++) { sum += 1 / X[n]; Y.push(n === 0 ? Y1 : X[n] * (Y1 / X[0] + s.c * sum) - s.c); }
  const floor = Y.map((y) => y + s.hB - s.eye), y0 = floor[s.crossAfter + 1];   // the crossing aisle is the platform of the first row behind it, at entrance level
  const rowY = floor.map((f) => Math.round((f - y0) * 1000) / 1000), frontY = Math.round(-y0 * 1000) / 1000;
  const risers = rowY.map((y, i) => (i ? y - rowY[i - 1] : y - frontY)), steps = risers.map((r) => Math.max(1, Math.ceil(r / MAX_STEP - 1e-6)));
  const sagD = s.sag * s.W, R = sagD > 0 ? (s.W * s.W / 4 + sagD * sagD) / (2 * sagD) : Infinity;
  return { H, X, rowY, frontY, risers, steps, sagD, R, arc: Number.isFinite(R) ? 2 * Math.asin(s.W / 2 / R) : 0, bottomY: s.hB + frontY, centreY: s.hB + H / 2 + frontY, topY: s.hB + H + frontY };
}
// full hall: placement + every derived dimension the builder, the floor function, the seats and the nav need
export function makeHall(s) {
  const k = calc(s), sd = SEAT[s.kind], cx = (s.x0 + s.x1) / 2, B = s.perRow * s.seatW;
  const dHip = k.X.map((x) => BEHIND + x + 0.05), pf = [-Infinity];
  for (let n = 1; n < s.rows; n++) pf.push(dHip[n - 1] + sd.bk + 0.05);
  const depth = Math.ceil((dHip[s.rows - 1] + sd.bk + 0.95) * 10) / 10, zs = BACK_Z - depth;   // zs = inner face of the screen wall
  const cr = s.crossAfter + 1, laneA = pf[cr], laneB = dHip[cr] - sd.fr;
  const sag = (u) => (s.rowR ? s.rowR - Math.sqrt(Math.max(0, s.rowR * s.rowR - u * u)) : 0);   // curved rows: the ends come forward
  const h = { ...s, ...k, cx, B, dHip, pf, depth, zs, zBack: BACK_Z, z0: zs, z1: BACK_Z, seat: sd, cross: { row: cr, d0: laneA, d1: laneB, dDoor: (laneA + laneB) / 2 }, rowSag: sag,
    ceil: Math.max(k.topY + 1.25, k.rowY[s.rows - 1] + 2.7), stageD: BEHIND + k.sagD + 0.9 };
  h.ceil = Math.round(h.ceil * 10) / 10;
  // door into the passage at the crossing aisle (the passage sits on the side facing the giant hall / its neighbour)
  h.doorSide = s.id === 'I' ? 1 : s.id === 'II' ? -1 : 0;   // +1 east wall, -1 west wall, 0 both
  h.doorZ = (side) => zs + h.cross.dDoor - sag(side > 0 ? s.x1 - cx : s.x0 - cx);
  return h;
}
// floor height inside a hall: front pit, row platforms, stepped side aisles (one deep step at row level, short steps up to the next row)
export function hallFloorY(h, x, z) {
  const u = x - h.cx, d = z - h.zs + h.rowSag(u), n = h.rows;   // row A sits on the front floor (riser 0), so r = 0 covers the pit too
  let r = 0; while (r < n - 1 && d >= h.pf[r + 1]) r++;
  if (Math.abs(u) <= h.B / 2 + 0.02 || r === n - 1) return h.rowY[r];
  const k = h.steps[r + 1], R = h.rowY[r + 1] - h.rowY[r], t = h.pf[r + 1] - d;   // t = distance to the next riser
  if (t >= (k - 1) * TREAD) return h.rowY[r];
  return h.rowY[r] + (k - 1 - Math.floor(t / TREAD)) * R / k;
}
export const ROW_LETTERS = 'ABCDEFGHIJKLMNOP';
export function hallSeats(h) {
  const a = [];
  for (let r = 0; r < h.rows; r++) for (let c = 1; c <= h.perRow; c++) {
    const u = -h.B / 2 + (c - 0.5) * h.seatW, dz = h.dHip[r] - h.rowSag(u), yaw = h.rowR ? -Math.asin(u / h.rowR) : 0;   // yaw 0 = facing the screen (-z)
    a.push({ id: ROW_LETTERS[r] + c, hall: h.id, row: r, col: c, x: h.cx + u, y: h.rowY[r], z: h.zs + dz, yaw, u, taken: false, npc: null, player: false });
  }
  return a;
}
