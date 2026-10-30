// LUMIERE - auditorium geometry, computed (not guessed) from the UNIC cinema-design rules. Pure maths, no THREE.
// Rules used (Gjestland, "How to design a cinema auditorium", UNIC 2nd ed.):
//   D1 >= 0.5-0.6 W; row 1 eye -> picture centre <= 25 deg, -> top <= 45 deg; seated eye 1.1-1.2 m over the row floor
//   riser formula with a fixed sightline clearance c (4.7); row distance >= 1.2 m, recliners 1.6-1.8 m; steps <= 0.20 m
//   curved screen chord depth ~5% (8% in the curved hall so the curve reads on a phone); crossing aisle at entrance level (5.6.1)
// v5.20 plan (docs/V6-ENVIRONMENT.md): SCREEN 1 curved premium west of the gallery, SCREEN 3 standard east of it, SCREEN 2 IMAX
// north of both, with a raised rear balcony. v7 (docs/V7-DESIGN.md): the IMAX's centre trench (it took the middle seats) is gone; the
// IMAX is entered by two side vomitories (level walkways along its side walls from the rear wall to the crossing aisle) and its rows are
// split 6 + 20 + 6 by two stepped aisles; SCREEN 1 (VIP) gets a lit centre staircase. aisles = seat numbers after which an aisle runs.
// tools/dev/hall-calc.mjs prints the resulting table.
// door: 'east' / 'west' = entrance in that side wall at the crossing aisle (from the gallery); 'vom' = through the rear wall and a centre
// trench; 'svom' = through the rear wall at both side walls (side vomitories)
export const SPECS = [
  { id: 'I', key: 'hallI', name: 'SCREEN 1', kind: 'curved', aspect: 2.39, W: 14.0, D1: 8.4, pitch: 1.7, rows: 7, crossAfter: 2, crossW: 1.4, eye: 1.1, hB: 1.0, c: 0.18, seatW: 0.86, perRow: 12, sag: 0.08, rowR: 22,
    x0: -21.0, x1: -3.8, zBack: -8.3, door: 'east', aisles: [6], aisleW: 1.3 },
  { id: 'II', key: 'hallII', name: 'SCREEN 2', kind: 'imax', aspect: 1.90, W: 22.0, D1: 11.5, pitch: 1.25, rows: 13, crossAfter: 4, crossW: 1.6, eye: 1.2, hB: 0.5, c: 0.2, seatW: 0.62, perRow: 32, sag: 0.03, rowR: 0,
    x0: -14.0, x1: 14.0, zBack: -40.3, door: 'svom', aisles: [6, 26], aisleW: 1.1, balcony: 10, balconyLift: 0.75, balconyGap: 1.2 },
  { id: 'III', key: 'hallIII', name: 'SCREEN 3', kind: 'standard', aspect: 1.85, W: 12.0, D1: 7.4, pitch: 1.2, rows: 11, crossAfter: 4, crossW: 1.5, eye: 1.2, hB: 1.0, c: 0.18, seatW: 0.6, perRow: 18, sag: 0, rowR: 0,
    x0: 3.8, x1: 19.0, zBack: -8.3, door: 'west' },
];
// seat footprint relative to the hip point (seat cushion centre): front edge fr, back of the backrest bk
export const SEAT = { standard: { fr: 0.3, bk: 0.32, eye: 1.2 }, curved: { fr: 0.42, bk: 0.42, eye: 1.1 }, imax: { fr: 0.3, bk: 0.32, eye: 1.2 } };
export const BEHIND = 1.0, TREAD = 0.3, MAX_STEP = 0.2;
// riser formula (UNIC 4.7): Y_n = X_n (Y_1 / X_1 + c * sum_{m=1..n} 1/X_m) - c   (Y = eye height above the bottom picture line)
export function calc(s) {
  const H = s.W / s.aspect, X = [], Y = [];
  for (let n = 0; n < s.rows; n++) X.push(s.D1 + n * s.pitch + (n > s.crossAfter ? s.crossW : 0) + (s.balcony && n >= s.balcony ? s.balconyGap : 0));   // the balcony front gets a walkway for its stair
  const Y1 = s.eye - s.hB; let sum = 0;
  for (let n = 0; n < s.rows; n++) { sum += 1 / X[n]; Y.push(n === 0 ? Y1 : X[n] * (Y1 / X[0] + s.c * sum) - s.c); }
  // a balcony tier lifts its rows by an extra step (its front becomes a parapet); the rows behind it keep their clearance
  const lift = (n) => (s.balcony && n >= s.balcony ? s.balconyLift : 0);
  const floor = Y.map((y, n) => y + s.hB - s.eye + lift(n)), y0 = floor[s.crossAfter + 1];   // the crossing aisle is the platform of the first row behind it, at entrance level
  const rowY = floor.map((f) => Math.round((f - y0) * 1000) / 1000), frontY = Math.round(-y0 * 1000) / 1000;
  const risers = rowY.map((y, i) => (i ? y - rowY[i - 1] : y - frontY)), steps = risers.map((r) => Math.max(1, Math.ceil(r / MAX_STEP - 1e-6)));
  const sagD = s.sag * s.W, R = sagD > 0 ? (s.W * s.W / 4 + sagD * sagD) / (2 * sagD) : Infinity;
  return { H, X, rowY, frontY, risers, steps, sagD, R, arc: Number.isFinite(R) ? 2 * Math.asin(s.W / 2 / R) : 0, bottomY: s.hB + frontY, centreY: s.hB + H / 2 + frontY, topY: s.hB + H + frontY };
}
// full hall: placement + every derived dimension the builder, the floor function, the seats and the nav need
export function makeHall(s) {
  const k = calc(s), sd = SEAT[s.kind], cx = (s.x0 + s.x1) / 2, AI = s.aisles || [], aw = s.aisleW || 1.1, B = s.perRow * s.seatW + AI.length * aw;
  const dHip = k.X.map((x) => BEHIND + x + 0.05), pf = [-Infinity];
  for (let n = 1; n < s.rows; n++) pf.push(s.balcony === n ? dHip[n] - sd.fr - 0.55 : dHip[n - 1] + sd.bk + 0.05);   // the balcony parapet stands just in front of its first row: the walkway (and the stair up) is in front of it
  const depth = Math.ceil((dHip[s.rows - 1] + sd.bk + 0.95) * 10) / 10, zs = s.zBack - depth;   // zs = inner face of the screen wall
  const cr = s.crossAfter + 1, laneA = pf[cr], laneB = dHip[cr] - sd.fr;
  const sag = (u) => (s.rowR ? s.rowR - Math.sqrt(Math.max(0, s.rowR * s.rowR - u * u)) : 0);   // curved rows: the ends come forward
  const h = { ...s, ...k, cx, B, dHip, pf, depth, zs, z0: zs, z1: s.zBack, seat: sd, cross: { row: cr, d0: laneA, d1: laneB, dDoor: (laneA + laneB) / 2 }, rowSag: sag,
    ceil: Math.max(k.topY + 1.6, k.rowY[s.rows - 1] + 2.9), stageD: BEHIND + k.sagD + 0.9 };
  h.ceil = Math.round(h.ceil * 10) / 10;
  // seats across a row: u of seat c (1-based) and the stepped aisles between the seat blocks
  h.seatU = (c) => -B / 2 + (c - 0.5) * s.seatW + aw * AI.filter((q) => q < c).length;
  h.innerAisles = AI.map((q, i) => { const a = -B / 2 + q * s.seatW + i * aw; return [a, a + aw]; });
  // vomitories: level walkways at entrance height from the rear wall to the crossing aisle. 'vom': one trench on the centre line (v5.20);
  // 'svom': one along each side wall, outside the seat blocks, behind a parapet
  const e = B / 2 + PARAPET + 0.1;
  h.voms = s.door === 'vom' ? [{ u0: -(s.vomW || 2.4) / 2, u1: (s.vomW || 2.4) / 2, d0: laneA }] : s.door === 'svom' ? [{ u0: s.x0 - cx, u1: -e, d0: laneA }, { u0: e, u1: s.x1 - cx, d0: laneA }] : [];
  h.vom = s.door === 'vom' ? { u: (s.vomW || 2.4) / 2, d0: laneA, d1: depth } : null;
  // entrance: side wall at the crossing aisle, or the rear wall at the trench. exit: side wall near the screen (where the light is)
  const side = s.door === 'east' ? 1 : s.door === 'west' ? -1 : 0;
  h.doorSide = side;
  h.entrance = side ? { x: side > 0 ? s.x1 : s.x0, z: zs + h.cross.dDoor - sag(side > 0 ? s.x1 - cx : s.x0 - cx), side, axis: 'x' } : { x: cx + (h.voms[0].u0 + h.voms[0].u1) / 2, z: s.zBack, side: 0, axis: 'z' };
  h.exit = side ? { x: side > 0 ? s.x1 : s.x0, z: zs + h.stageD + 1.6, side, axis: 'x' } : null;
  // the exit sits at entrance level above the front pit: a landing against the wall, steps along the wall down towards the audience
  // (risers <= 0.18 m), so the side aisle beside them stays clear
  if (side) { const n = Math.max(2, Math.ceil(-k.frontY / 0.18)); h.exitStair = { side, z: h.exit.z, half: 0.9, land: 1.0, n, rise: -k.frontY / n }; }
  return h;
}
// floor height inside a hall: front pit, row platforms, stepped side aisles (one deep step at row level, short steps up to the next row),
// the vomitory trench (level with the crossing aisle all the way to the rear wall)
export function hallFloorY(h, x, z) {
  const u = x - h.cx, d = z - h.zs + h.rowSag(u), n = h.rows;   // row A sits on the front floor (riser 0), so r = 0 covers the pit too
  for (const v of h.voms) if (u > v.u0 && u < v.u1 && d >= v.d0) return h.rowY[h.cross.row];
  const E = h.exitStair; if (E && (E.side > 0 ? h.x1 - x : x - h.x0) < E.land) { const t = z - (E.z + E.half); if (z > E.z - E.half && t <= 0) return 0; const k = Math.floor(t / TREAD); if (t > 0 && k < E.n - 1) return h.frontY + (E.n - 1 - k) * E.rise; }
  let r = 0; while (r < n - 1 && d >= h.pf[r + 1]) r++;
  if ((Math.abs(u) <= h.B / 2 + 0.02 && !inAisle(h, u)) || r === n - 1) return h.rowY[r];
  const k = h.steps[r + 1], R = h.rowY[r + 1] - h.rowY[r], t = h.pf[r + 1] - d;   // t = distance to the next riser
  if (t >= (k - 1) * TREAD) return h.rowY[r];
  return h.rowY[r] + (k - 1 - Math.floor(t / TREAD)) * R / k;
}
export const ROW_LETTERS = 'ABCDEFGHIJKLMNOP';
// behind the crossing aisle the vomitory trench and its 0.12 m parapets take the middle of every row (seat numbers keep counting across it)
export const PARAPET = 0.12;
export const inTrench = (h, r, u, halfWidth) => r >= h.cross.row && h.voms.some((v) => u + halfWidth > v.u0 - PARAPET - 0.04 && u - halfWidth < v.u1 + PARAPET + 0.04);
export const inAisle = (h, u) => h.innerAisles.some(([a, b]) => u > a + 0.02 && u < b - 0.02);
// the aisle a viewer uses for a seat: the nearest stepped aisle that reaches its row (side aisles stop where a side vomitory runs)
export function aisleU(h, s) {
  const c = h.innerAisles.map(([a, b]) => (a + b) / 2); if (!(h.door === 'svom' && s.row >= h.cross.row) || !c.length) c.push(-(h.B / 2 + 0.55), h.B / 2 + 0.55);
  let best = c[0]; for (const u of c) if (Math.abs(u - s.u) < Math.abs(best - s.u)) best = u; return best;
}
export function hallSeats(h) {
  const a = [];
  for (let r = 0; r < h.rows; r++) for (let c = 1; c <= h.perRow; c++) {
    const u = h.seatU(c), dz = h.dHip[r] - h.rowSag(u), yaw = h.rowR ? -Math.asin(u / h.rowR) : 0;   // yaw 0 = facing the screen (-z)
    if (inTrench(h, r, u, h.seatW / 2)) continue;
    a.push({ id: ROW_LETTERS[r] + c, hall: h.id, row: r, col: c, x: h.cx + u, y: h.rowY[r], z: h.zs + dz, yaw, u, taken: false, npc: null, player: false });
  }
  return a;
}
