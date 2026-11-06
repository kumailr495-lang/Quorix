// LUMIERE v9 - auditorium geometry, computed from the UNIC cinema-design rules (docs/V9-DESIGN.md, section 3). Pure maths, no THREE:
// the engine (seats, floors, routes, colliders) and the Blender builder (tools/blender/arch, through tools/dev/export-spec.mjs) both
// read it, so the model and the game can never disagree about where a step or a seat is.
// Rules (Gjestland, "How to design a cinema auditorium", UNIC 2nd ed.):
//   first row eye D1 >= 0.5-0.6 W; row 1 eye -> picture centre <= 25-30 deg, -> picture top <= 45 deg; any seat -> centre <= 45 deg sideways
//   sightline clearance c >= 0.20 m ("good"), individual riser per row (UNIC 4.7); row distance >= 1.2 m so people can pass a seated
//   person without standing up, recliners about 1.9 m; aisle steps <= 0.18 m high, >= 0.28 m deep; seated eye 1.2 m (recliners 1.05 m)
// Local frame of a hall: d = distance from the picture's centre line towards the rear, u = across (+u = the viewer's right), y = up from
// the front floor. Rows may be arcs around a point k metres behind the picture (rowK), so every seat faces the screen. Side aisles only
// (continental seating) and an odd number of single seats per row: the middle seat sits on the centre line (v8: "9 <- 1 -> 10").
export const STEP_MAX = 0.18, TREAD = 0.3, ROWS = 'ABCDEFGHIJKLMNOPQ';
// fr: hip -> seat front (seat down), bk: hip -> back of the backrest, eye: seated eye over the row floor, h: backrest top, w: seat pitch across
export const SEAT = {
  rocker: { w: 0.62, fr: 0.32, bk: 0.36, eye: 1.18, h: 1.04 },
  recliner: { w: 0.94, fr: 0.48, bk: 0.5, eye: 1.05, h: 1.08 },
  sofa: { w: 0.82, fr: 0.46, bk: 0.48, eye: 1.02, h: 1.0 },
  pod: { w: 0.86, fr: 0.48, bk: 0.52, eye: 1.02, h: 1.06 },
};
// seat classes and prices (INR, GST included as on Indian tickets; docs/V9-DESIGN.md section 6)
export const CLASSES = {
  std: { label: 'Classic', price: 260 }, prime: { label: 'Prime', price: 320 }, sofa: { label: 'Prime Sofa', price: 420 },
  maxStd: { label: 'MAX', price: 520 }, maxPrime: { label: 'MAX Prime', price: 600 }, pod: { label: 'Balcony Pod', price: 950 },
  recl: { label: 'Recliner', price: 690 }, reclPlus: { label: 'Recliner Plus', price: 790 }, love: { label: 'Love Seat', price: 850 },
  x270: { label: '270', price: 480 }, x270p: { label: '270 Prime', price: 560 },
};
// side: -1 = west of the exit spine (the audience faces +x), +1 = east (faces -x). zc: the hall's centre line (world z). width: inner.
// groups run from the screen to the rear: rows of single seats (n odd) or two-seat sofas (pairs, gap between the sofas).
// v9.1 (user, 2026-11-06: "the theatres' size is not realistic, one is so small no one would see it", "the exit is nonsense"): every
// picture is now nearly wall to wall. The only things beside it are the two exit bays: an open, lit alcove at each front corner
// (BAY m wide) with the exit door in the screen wall and a green EXIT sign readable from every seat. W = width - 2 (BAY + frame + 0.05).
// The halls grew to keep their seats. Middle row, horizontal angle of the picture: MAX 56.7 deg (was 54.4), CURVE 61.9 (a 16:9 film
// 56.2, was 43.7), CLASSIC 54.6 (was 47.0), X-270 54.6 (was 48.5) plus its side screens.
export const BAY = 2.3;
export const HALLS = [
  { id: 'MAX', no: 1, key: 'hallMax', name: 'LUMIERE MAX', format: 'max', side: -1, zc: -37.0, width: 29.2, aspect: 1.9, W: 24.0, hB: 0.95, sag: 0.025, D1: 12.6, c: 0.2,
    aisleW: 1.5, cross: { after: 4, w: 1.7 }, rear: 2.6, rowK: 34, curtain: false, frame: 0.25,
    groups: [{ seat: 'rocker', rows: 11, n: 37, pitch: 1.32, cls: (r) => (r >= 5 && r <= 8 ? 'maxPrime' : 'maxStd') },
      { seat: 'pod', rows: 2, pairs: 9, gap: 0.62, pitch: 2.25, lift: 0.2, cls: () => 'pod' }] },
  { id: 'CURVE', no: 2, key: 'hallCurve', name: 'LUMIERE CURVE', format: 'curve', side: -1, zc: -66.0, width: 25.2, aspect: 2.0, W: 20.0, hB: 1.05, sag: 0.13, D1: 10.9, c: 0.2,
    aisleW: 1.4, cross: null, rear: 2.6, rowK: 9, curtain: true, frame: 0.25,
    groups: [{ seat: 'recliner', rows: 6, n: 19, pitch: 1.92, cls: (r) => (r >= 2 && r <= 4 ? 'reclPlus' : 'recl') },
      { seat: 'sofa', rows: 1, pairs: 8, gap: 0.5, pitch: 2.0, cls: () => 'love' }] },
  { id: 'CLASSIC', no: 3, key: 'hallClassic', name: 'LUMIERE CLASSIC', format: 'classic', side: 1, zc: -32.7, width: 20.8, aspect: 1.85, W: 15.6, hB: 1.0, sag: 0, D1: 8.6, c: 0.2,
    aisleW: 1.25, cross: null, rear: 2.6, rowK: 0, curtain: true, frame: 0.25,
    groups: [{ seat: 'rocker', rows: 10, n: 25, pitch: 1.3, cls: (r) => (r >= 6 ? 'prime' : 'std') },
      { seat: 'sofa', rows: 1, pairs: 8, gap: 0.42, pitch: 1.75, cls: () => 'sofa' }] },
  { id: 'X270', no: 4, key: 'hall270', name: 'LUMIERE X·270', format: 'x270', side: 1, zc: -55.5, width: 21.2, aspect: 1.9, W: 16.0, hB: 1.25, sag: 0, D1: 9.0, c: 0.2,
    aisleW: 1.3, cross: null, rear: 2.6, rowK: 0, curtain: false, frame: 0.25, panels: true,
    groups: [{ seat: 'rocker', rows: 10, n: 25, pitch: 1.3, cls: (r) => (r >= 4 && r <= 7 ? 'x270p' : 'x270') }] },
];
// placement (docs/V9-DESIGN.md section 4): the screen wall stands on the exit spine; the picture plane is SCREEN_GAP in front of it
export const SPINE = { x0: -4.2, x1: 4.2 }, SCREEN_GAP = 1.25, WALL = 0.4;
// one hall, fully derived
export function makeHall(s) {
  const H = s.W / s.aspect, sagD = s.sag * s.W, R = sagD > 0 ? (s.W * s.W / 4 + sagD * sagD) / (2 * sagD) : Infinity, k = s.rowK || 0;
  const rows = []; let X = s.D1;
  for (const g of s.groups) for (let i = 0; i < g.rows; i++) {
    if (rows.length) X += g.pitch + (s.cross && rows.length === s.cross.after + 1 ? s.cross.w : 0);
    const r = rows.length;
    rows.push({ r, letter: ROWS[r], seat: g.seat, sd: SEAT[g.seat], X, pitch: g.pitch, n: g.n || 0, lift: i === 0 && g.lift ? g.lift : 0, pairs: g.pairs || 0, gap: g.gap || 0, cls: g.cls(r) });
  }
  // risers (UNIC 4.7): Y_n = X_n (Y_1 / X_1 + c sum 1/X_m) - c, Y = eye over the picture's bottom edge. A lifted group (the pod tier with
  // its parapet) adds its lift once, which only adds clearance for the rows behind it.
  let sum = 0, extra = 0; const Y1 = rows[0].sd.eye - s.hB;
  for (const row of rows) { sum += 1 / row.X; extra += row.lift; const Y = row.r === 0 ? Y1 : row.X * (Y1 / rows[0].X + s.c * sum) - s.c; row.y = Math.max(0, Math.round((Y + s.hB - row.sd.eye + extra) * 1000) / 1000); }
  for (let i = 1; i < rows.length; i++) rows[i].y = Math.max(rows[i].y, rows[i - 1].y);
  for (const row of rows) { const prev = row.r ? rows[row.r - 1].y : 0; row.riser = Math.round((row.y - prev) * 1000) / 1000; row.steps = row.riser > 0.005 ? Math.ceil(row.riser / STEP_MAX - 1e-6) : 0; }
  // hip (seat cushion centre) and the platform each row stands on: it starts just behind the backrests of the row in front
  for (const row of rows) row.dHip = row.X + 0.06;
  for (const row of rows) row.pf = row.r === 0 ? -Infinity : rows[row.r - 1].dHip + rows[row.r - 1].sd.bk + 0.1;
  for (const row of rows) { row.lane = [row.r === 0 ? row.dHip - row.sd.fr - 1.4 : row.pf, row.dHip - row.sd.fr]; row.clear = Math.round((row.lane[1] - row.lane[0]) * 100) / 100; }
  // aisle step depth: 0.30 m, shortened when a tall riser's steps would not fit on the platform below (they never spill into the row before)
  for (const row of rows) { const below = row.r <= 1 ? 9 : row.pf - rows[row.r - 1].pf - 0.12; row.tread = row.steps > 1 ? Math.min(TREAD, below / (row.steps - 1)) : TREAD; }
  const last = rows[rows.length - 1], rearD = last.dHip + last.sd.bk + 0.1, depthIn = rearD + s.rear;
  // places across a row (arc length from the centre line)
  for (const row of rows) {
    row.places = []; const w = row.sd.w;
    if (row.pairs) { const pw = 2 * w; row.span = row.pairs * pw + (row.pairs - 1) * row.gap; for (let p = 0; p < row.pairs; p++) { const c0 = -row.span / 2 + p * (pw + row.gap); row.places.push({ u: c0 + w / 2, pair: p, side: 0 }, { u: c0 + w * 1.5, pair: p, side: 1 }); } }
    else { row.span = row.n * w; for (let i = 0; i < row.n; i++) row.places.push({ u: -row.span / 2 + (i + 0.5) * w }); }
  }
  const blockHalf = Math.max(...rows.map((r) => r.span / 2)), aisle = [blockHalf + 0.15, blockHalf + 0.15 + s.aisleW];
  const h = { ...s, H, sagD, R, rows, rearD, depthIn, blockHalf, aisle, total: last.y };
  h.ceil = Math.round(Math.max(s.hB + H + 1.6, last.y + last.sd.h + 2.8) * 10) / 10;
  h.topY = s.hB + H; h.centreY = s.hB + H / 2;
  h.screenD = (u) => (Number.isFinite(R) ? R - Math.sqrt(Math.max(0, R * R - u * u)) : 0);
  // row coordinates: (a, e) = (arc length across, distance from the picture); straight rows when rowK = 0
  h.toRow = (u, d) => { if (!k) return { a: u, e: d }; const rr = Math.hypot(u, d + k); return { a: rr * Math.atan2(u, d + k), e: rr - k }; };
  h.fromRow = (a, e) => { if (!k) return { u: a, d: e, yaw: 0 }; const rr = e + k, t = a / rr; return { u: rr * Math.sin(t), d: rr * Math.cos(t) - k, yaw: t }; };
  // world: the audience faces +x (west halls) or -x (east halls); +u is the viewer's right (+z when facing +x)
  const f = -s.side; h.dir = f;
  h.xPic = s.side < 0 ? SPINE.x0 - WALL - SCREEN_GAP : SPINE.x1 + WALL + SCREEN_GAP;
  h.xScreenWall = s.side < 0 ? SPINE.x0 - WALL : SPINE.x1 + WALL; h.xRear = h.xPic - f * depthIn;
  h.toWorld = (u, d) => ({ x: h.xPic - f * d, z: s.zc + f * u });
  h.toLocal = (x, z) => ({ u: (z - s.zc) * f, d: (h.xPic - x) * f });
  // three.js yaw (rotation about +y) of something in the hall facing the screen, turned by t towards +u
  h.yawOf = (t) => (f > 0 ? -Math.PI / 2 : Math.PI / 2) - f * t;
  // entrance: the rear corner on the lobby side (+z for every hall: the bridge is north of them); exits: a door in the screen wall at the
  // back of each front-corner bay (the bay spans |u| = width/2 - BAY .. width/2, in the open beside the picture)
  h.entryU = f * (s.width / 2 - 1.3);
  h.bay = [s.width / 2 - BAY, s.width / 2];
  h.exits = [-1, 1].map((sg) => ({ u: sg * (s.width / 2 - BAY / 2), d: -SCREEN_GAP + 0.2 }));
  h.y0 = 0;   // building.js lifts the smaller halls so every rear aisle is level with the first-floor corridor (y0 = L1 - total)
  // the 270 hall's side screens (ScreenX-style, the user: "where is the Screen-X"): one projection surface on each side wall from just in
  // front of the exit bay to 74 % of the depth, its bottom edge 1.3 m over the rake (a straight line over a convex rake stays above it),
  // its top 0.8 m under the ceiling. Local y (above the front floor); the builder and film9.js both read this.
  if (s.panels) { const d0 = Math.max(0.6, h.screenD(s.width / 2) + 0.25), d1 = depthIn * 0.74, W2 = s.width / 2 - 0.3;
    h.sideScreen = { d0, d1, yb0: hallFloor(h, W2, d0) + 1.3, yb1: hallFloor(h, W2, d1) + 1.3, yt: h.ceil - 0.8 }; }
  return h;
}
export function hallSeats(h) {
  const out = [];
  for (const row of h.rows) row.places.forEach((p, i) => {
    const q = h.fromRow(p.u, row.dHip), w = h.toWorld(q.u, q.d);
    out.push({ id: row.letter + (i + 1), hall: h.id, row: row.r, col: i + 1, kind: row.seat, cls: row.cls, price: CLASSES[row.cls].price, pair: row.pairs ? p.pair : -1, pairSide: p.side ?? -1,
      a: p.u, u: q.u, d: q.d, x: w.x, y: h.y0 + row.y, z: w.z, yaw: h.yawOf(q.yaw), taken: false, npc: null, player: false });
  });
  return out;
}
// floor height (above the hall's front floor) at local (u, d): row platforms, the side aisles' steps (each riser split into equal steps
// taken out of the lower platform, in front of the riser), the rear aisle level with the last row
export function hallFloor(h, u, d) {
  const { a, e } = h.toRow(u, d), rows = h.rows, aa = Math.abs(a), inAisle = aa >= h.aisle[0] - 0.05;
  let r = 0; while (r < rows.length - 1 && e >= rows[r + 1].pf) r++;
  const y = rows[r].y; if (!inAisle || r === rows.length - 1) return y;
  const nx = rows[r + 1], t = nx.pf - e; if (!nx.steps || t >= (nx.steps - 1) * nx.tread) return y;
  return y + (nx.steps - 1 - Math.floor(t / nx.tread)) * nx.riser / nx.steps;
}
// walker route from the entrance to a seat: rear aisle -> nearest side aisle -> down to the row -> along the row's lane -> the seat front
export function seatRoute(h, seat) {
  const row = h.rows[seat.row], sideA = seat.a >= 0 ? (h.aisle[0] + h.aisle[1]) / 2 : -(h.aisle[0] + h.aisle[1]) / 2;
  const laneE = (row.lane[0] + row.lane[1]) / 2, rearE = h.rearD + h.rear * 0.45, P = (a, e) => h.fromRow(a, e);
  const entry = h.toRow(h.entryU, h.depthIn - 0.6);
  return [P(entry.a, rearE), P(sideA, rearE), P(sideA, laneE), P(seat.a, laneE)].map((p) => ({ u: p.u, d: p.d }));
}
// the table printed by tools/dev/hall-calc.mjs and quoted in docs/V9-DESIGN.md
export function hallReport(h) {
  const deg = (r) => Math.round(r * 1800 / Math.PI) / 10, r0 = h.rows[0], rl = h.rows[h.rows.length - 1], side = h.fromRow(-h.blockHalf + 0.3, r0.dHip);
  return { hall: h.id, picture: `${h.W.toFixed(1)} x ${h.H.toFixed(2)} m (${h.aspect}:1)`, curveDepth: +h.sagD.toFixed(2), radius: Number.isFinite(h.R) ? +h.R.toFixed(1) : null,
    rows: h.rows.length, seats: h.rows.reduce((a, r) => a + r.places.length, 0), D1: h.D1, D1overW: +(h.D1 / h.W).toFixed(2), lastRowOverW: +(rl.X / h.W).toFixed(2),
    row1CentreDeg: deg(Math.atan((h.centreY - r0.sd.eye) / r0.X)), row1TopDeg: deg(Math.atan((h.topY - r0.sd.eye) / r0.X)), row1FieldDeg: deg(2 * Math.atan(h.W / 2 / r0.X)),
    lastRowFieldDeg: deg(2 * Math.atan(h.W / 2 / rl.X)), row1EndToCentreDeg: deg(Math.abs(Math.atan2(side.u, side.d))), risers: h.rows.map((r) => r.riser),
    rise: h.total, minLaneClear: Math.min(...h.rows.slice(1).map((r) => r.clear)), depth: +h.depthIn.toFixed(2), ceil: h.ceil };
}
