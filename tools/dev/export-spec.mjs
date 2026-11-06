// writes the v9 building + hall spec as JSON for the Blender architecture builder (tools/blender/arch/build.py)
// usage: node tools/dev/export-spec.mjs [out=tools/blender/arch/spec.json]
import fs from 'node:fs';
import * as B from '../../www/js/building.js';
import { hallSeats, SEAT, TREAD, STEP_MAX } from '../../www/js/hallmath.js';
const halls = Object.values(B.HALL).map((h) => {
  const keep = ['id', 'no', 'key', 'name', 'format', 'side', 'dir', 'zc', 'width', 'aspect', 'W', 'H', 'hB', 'sagD', 'R', 'rowK', 'ceil', 'y0', 'total', 'depthIn', 'rearD', 'rear',
    'xPic', 'xScreenWall', 'xRear', 'entryU', 'exits', 'aisle', 'blockHalf', 'frame', 'curtain', 'panels', 'topY', 'centreY', 'aisleW', 'cross', 'entryStair', 'bay', 'sideScreen'];
  const o = Object.fromEntries(keep.map((k) => [k, h[k] === Infinity ? null : h[k]]));
  o.rows = h.rows.map((r) => ({ r: r.r, letter: r.letter, seat: r.seat, sd: r.sd, X: r.X, dHip: r.dHip, pf: Number.isFinite(r.pf) ? r.pf : null, y: r.y, riser: r.riser, steps: r.steps,
    lane: r.lane, tread: r.tread, pairs: r.pairs, gap: r.gap, lift: r.lift, span: r.span, places: r.places.map((p) => p.u), cls: r.cls }));
  o.seats = hallSeats(h).map((s) => ({ id: s.id, row: s.row, col: s.col, kind: s.kind, a: s.a, u: s.u, d: s.d, x: s.x, y: s.y, z: s.z, yaw: s.yaw, pair: s.pair, pairSide: s.pairSide }));
  return o;
});
const out = { v: 9, TREAD, STEP_MAX, SEAT, L1: B.L1, FACADE: B.FACADE, LOBBY: B.LOBBY, MEZZ: B.MEZZ, SPINE: B.SPINE, BRIDGE: B.BRIDGE, FLANK_W: B.FLANK_W, LINK_W: B.LINK_W,
  FLANK_E: B.FLANK_E, LINK_E: B.LINK_E, PANTRY: B.PANTRY, WC: B.WC, STREET: B.STREET, ESC: Object.fromEntries(Object.entries(B.ESC).map(([k, e]) => [k, { ...e, profile: B.escProfile(e) }])),
  LIFT: B.LIFT, TRAVELATOR: B.TRAVELATOR, GATE: B.GATE, DOORS: B.DOORS, EXIT_STAIRS: B.EXIT_STAIRS, ROOMS: B.ROOMS, COUNTERS: B.COUNTERS, POSTS: B.POSTS, PALETTE: B.PALETTE, halls };
const f = process.argv[2] || 'tools/blender/arch/spec.json'; fs.writeFileSync(f, JSON.stringify(out)); console.log('spec ->', f, (fs.statSync(f).size / 1024).toFixed(0), 'KB');
