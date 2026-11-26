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
  // v12b (the user, 11-18: "premium and big comfortable seats"): wider centres everywhere (rockers 0.62 -> 0.70 m, recliners 0.94 -> 1.0,
  // sofas 0.82 -> 0.9, pods 0.86 -> 0.92); rows keep their pitch, so the rake and the sightlines do not change
  rocker: { w: 0.70, fr: 0.32, bk: 0.36, eye: 1.18, h: 1.04 },
  recliner: { w: 1.0, fr: 0.48, bk: 0.5, eye: 1.05, h: 1.08 },
  sofa: { w: 0.9, fr: 0.46, bk: 0.48, eye: 1.02, h: 1.0 },
  pod: { w: 0.92, fr: 0.48, bk: 0.52, eye: 1.02, h: 1.06 },
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
// v14 (the user, 11-20: "the theatres are so small"; "seats ... in circular motion"): every hall about 3.5 m wider and 3 m deeper, a row or
// two more, every hall's rows on arcs facing the picture (rowK); X-270 has red leather recliners like the user's ScreenX photo. v9.1b (the user, 2026-11-06: "the screens are so small"): every picture runs nearly wall to wall. v12b (the user, 11-18: "move the exit
// door to not on the front of the screen and then cover that area with screens"): the exits left the screen wall for the side walls
// (building.js EXIT_PASSAGES), so the screen now runs from side wall to side wall (W = width - 0.3, the frame's margin). The height H stays
// what it was (row A's view of the picture's top is held at 45 deg, UNIC), so the shape widens: aspect = W / H. A 16:9 film keeps its size
// and the screen's wider sides take the 2.39:1 ones. MAX was IMAX-GT shaped (1.43:1); v11 made it 13.4 m high. X-270's screen already ran
// corner to corner (hB 2.8: the band of three screens keeps its bottom edge).
export const HALLS = [
  { id: 'MAX', no: 1, key: 'hallMax', name: 'LUMIERE MAX', format: 'max', side: -1, zc: -38.9, width: 33.0, W: 32.7, H: 14.6, hB: 0.95, sag: 0.0215, D1: 14.4, c: 0.2,
    aisleW: 1.5, cross: { after: 4, w: 1.7 }, rear: 2.6, rowK: 0, curtain: false, frame: 0.25,   // v14 straight stadium rows (the user, 11-21: "curved for no reason")
    groups: [{ seat: 'rocker', rows: 11, n: 37, pitch: 1.36, cls: (r) => (r >= 5 && r <= 8 ? 'maxPrime' : 'maxStd') },
      { seat: 'pod', rows: 2, pairs: 10, gap: 0.62, pitch: 2.25, lift: 0.2, cls: () => 'pod' }] },
  { id: 'CURVE', no: 2, key: 'hallCurve', name: 'LUMIERE CURVE', format: 'curve', side: -1, zc: -73.3, width: 28.6, W: 28.3, H: 12.0, hB: 1.05, sag: 0.1547, D1: 12.2, c: 0.2,
    aisleW: 1.4, cross: null, rear: 2.6, rowK: 9, curtain: true, frame: 0.25,
    groups: [{ seat: 'recliner', rows: 7, n: 21, pitch: 1.92, cls: (r) => (r >= 2 && r <= 4 ? 'reclPlus' : 'recl') },
      { seat: 'sofa', rows: 1, pairs: 9, gap: 0.5, pitch: 2.0, cls: () => 'love' }] },
  { id: 'CLASSIC', no: 3, key: 'hallClassic', name: 'LUMIERE CLASSIC', format: 'classic', side: 1, zc: -34.7, width: 24.6, W: 24.3, H: 11.0, hB: 1.0, sag: 0, D1: 11.0, c: 0.2,
    aisleW: 1.25, cross: null, rear: 2.6, rowK: 0, curtain: true, frame: 0.25,   // v14 straight rows, as a picture palace
    groups: [{ seat: 'rocker', rows: 11, n: 27, pitch: 1.3, cls: (r) => (r >= 6 ? 'prime' : 'std') },
      { seat: 'sofa', rows: 1, pairs: 8, gap: 0.42, pitch: 1.75, cls: () => 'sofa' }] },
  // v9.3 (the user, photo of a real ScreenX hall: "it's connected"): the front screen runs corner to corner and the side screens start at
  // the corners with the same top and bottom, one band round three walls (its bottom edge 2.8 m up: v12b the exits are in the side walls under it)
  { id: 'X270', no: 4, key: 'hall270', name: 'LUMIERE X·270', format: 'x270', side: 1, zc: -63.0, width: 24.8, W: 24.7, H: 12.0, hB: 2.8, rakeHB: 1.25, sag: 0, D1: 11.4, c: 0.2,
    aisleW: 1.3, cross: null, rear: 2.6, rowK: 0, curtain: false, frame: 0.25, panels: true,   // v14 straight rows (the user, 11-26: "why is every theatre curved rather than the curved one"): only CURVE has arcs
    groups: [{ seat: 'recliner', rows: 8, n: 19, pitch: 1.92, cls: (r) => (r >= 3 && r <= 5 ? 'x270p' : 'x270') }] },
];
// placement (docs/V9-DESIGN.md section 4): the screen wall stands on the exit spine; the picture plane is SCREEN_GAP in front of it
export const SPINE = { x0: -4.2, x1: 4.2 }, SCREEN_GAP = 1.25, WALL = 0.4;
// one hall, fully derived
export function makeHall(s) {
  const H = s.H || s.W / s.aspect, aspect = s.W / H, sagD = s.sag * s.W, R = sagD > 0 ? (s.W * s.W / 4 + sagD * sagD) / (2 * sagD) : Infinity, k = s.rowK || 0;
  const rows = []; let X = s.D1;
  for (const g of s.groups) for (let i = 0; i < g.rows; i++) {
    if (rows.length) X += g.pitch + (s.cross && rows.length === s.cross.after + 1 ? s.cross.w : 0);
    const r = rows.length;
    rows.push({ r, letter: ROWS[r], seat: g.seat, sd: SEAT[g.seat], X, pitch: g.pitch, n: g.n || 0, lift: i === 0 && g.lift ? g.lift : 0, pairs: g.pairs || 0, gap: g.gap || 0, cls: g.cls(r) });
  }
  // risers (UNIC 4.7): Y_n = X_n (Y_1 / X_1 + c sum 1/X_m) - c, Y = eye over the picture's bottom edge. A lifted group (the pod tier with
  // its parapet) adds its lift once, which only adds clearance for the rows behind it.
  // rakeHB: the bottom edge the rake is designed for (X-270 raised its screen over the exit doors in v9.3 and keeps its v9.2 rake)
  const rB = s.rakeHB != null ? s.rakeHB : s.hB;
  let sum = 0, extra = 0; const Y1 = rows[0].sd.eye - rB;
  for (const row of rows) { sum += 1 / row.X; extra += row.lift; const Y = row.r === 0 ? Y1 : row.X * (Y1 / rows[0].X + s.c * sum) - s.c; row.y = Math.max(0, Math.round((Y + rB - row.sd.eye + extra) * 1000) / 1000); }
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
  const h = { ...s, H, aspect, sagD, R, rows, rearD, depthIn, blockHalf, aisle, total: last.y };
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
  // entrance: the rear corner on the lobby side (+z for every hall: the bridge is north of them). Exits (v12b): one door in each side wall
  // at the front; building.js places them along the wall (h.exits, from the stairs their passages need) once it knows the hall's floor
  h.entryU = f * (s.width / 2 - 1.3);
  h.exits = [];
  h.y0 = 0;   // building.js lifts the smaller halls so every rear aisle is level with the first-floor corridor (y0 = L1 - total)
  // the 270 hall's side screens (ScreenX): one projection surface on each side wall from the front corner, where it meets the front
  // screen's edge, to 74 % of the depth. At the corner its bottom and top are the front screen's; further back the bottom keeps 2.4 m over
  // the rake (people walking the side aisles stay below the picture). Local y (above the front floor); halls.py and film9.js read this.
  if (s.panels) { const d0 = Math.max(0, h.screenD(s.width / 2)), d1 = depthIn * 0.74, W2 = s.width / 2 - 0.3;
    h.sideScreen = { d0, d1, yb0: s.hB, yb1: Math.max(s.hB, hallFloor(h, W2, d1) + 2.4), yt: s.hB + H }; }
  return h;
}
// v12b Dolby Atmos (the user, 11-18: "make sure about ... dolby atmos"): two rows of overhead speakers over the seats, clear of each
// hall's ceiling features (MAX's baffles, CURVE's coves, CLASSIC's coffers, X-270's clouds). world9.js hangs a speaker array at each
// spot; sound9.js puts the film's height layer through them (Settings: surround)
export function atmosSpots(h) {
  const out = [], d0 = h.rows[0].X - 1, d1 = h.depthIn - 3, U = Math.min(h.blockHalf * 0.5, h.width / 2 - 2.5), push = (u, d) => { if (d >= d0 && d <= d1) out.push({ u, d }); };
  if (h.format === 'max') for (let i = 0; i < 12; i++) { const d = 3 + 4.2 * i + 2.1; push(-U, d); push(U, d); }
  else if (h.format === 'curve') for (const e of [8.5, 12.5, 16.5, 20.5, 24.5]) for (const u of [-U, U]) push(u, e + h.screenD(u));
  else if (h.format === 'classic') for (let j = 0; j < 12; j++) { const d = 4 + 4 * j; push(-3.2, d); push(3.2, d); }
  else for (let i = 0; i < 12; i++) { const d = 4.0 + 4.6 * i + 2.3; push(-U, d); push(U, d); }
  return out;
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
  return { hall: h.id, picture: `${h.W.toFixed(1)} x ${h.H.toFixed(2)} m (${h.aspect.toFixed(2)}:1)`, curveDepth: +h.sagD.toFixed(2), radius: Number.isFinite(h.R) ? +h.R.toFixed(1) : null,
    rows: h.rows.length, seats: h.rows.reduce((a, r) => a + r.places.length, 0), D1: h.D1, D1overW: +(h.D1 / h.W).toFixed(2), lastRowOverW: +(rl.X / h.W).toFixed(2),
    row1CentreDeg: deg(Math.atan((h.centreY - r0.sd.eye) / r0.X)), row1TopDeg: deg(Math.atan((h.topY - r0.sd.eye) / r0.X)), row1FieldDeg: deg(2 * Math.atan(h.W / 2 / r0.X)),
    lastRowFieldDeg: deg(2 * Math.atan(h.W / 2 / rl.X)), row1EndToCentreDeg: deg(Math.abs(Math.atan2(side.u, side.d))), risers: h.rows.map((r) => r.riser),
    rise: h.total, minLaneClear: Math.min(...h.rows.slice(1).map((r) => r.clear)), depth: +h.depthIn.toFixed(2), ceil: h.ceil };
}
