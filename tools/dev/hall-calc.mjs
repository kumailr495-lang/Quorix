// LUMIERE v5 - prints the auditorium geometry the game builds (node tools/dev/hall-calc.mjs [--json]).
// The maths lives in www/js/hallmath.js (one source of truth); docs/V5-DESIGN.md section 3 quotes this output.
import { SPECS, calc, makeHall } from '../../www/js/hallmath.js';
const R2D = 180 / Math.PI, f = (v, n = 2) => +v.toFixed(n);
const rows = SPECS.map((s) => {
  const k = calc(s), h = makeHall(s), X = k.X;
  return { name: s.name, kind: s.kind, screen: `${s.W} x ${f(k.H)} m ${s.aspect}:1`, seats: s.rows * s.perRow, X: X.map((x) => f(x, 1)), front: k.frontY, rowY: k.rowY, risers: k.risers.map((r) => f(r, 3)), steps: k.steps,
    D1overW: f(X[0] / s.W), vCentre: f(Math.atan((k.centreY - (k.frontY + s.eye)) / X[0]) * R2D, 1), vTop: f(Math.atan((k.topY - (k.frontY + s.eye)) / X[0]) * R2D, 1),
    fovFirst: f(2 * Math.atan(s.W / 2 / X[0]) * R2D, 1), fovLast: f(2 * Math.atan(s.W / 2 / X[s.rows - 1]) * R2D, 1), curve: s.sag ? `depth ${f(k.sagD)} m, R ${f(k.R)} m, arc ${f(k.arc * R2D, 1)} deg` : 'flat',
    room: `${s.x1 - s.x0} x ${h.depth} m, ceiling ${h.ceil} m over entrance, front pit ${k.frontY} m`, crossAisle: `row ${String.fromCharCode(65 + h.cross.row)}, lane ${f(h.cross.d1 - h.cross.d0)} m wide` };
});
if (process.argv.includes('--json')) console.log(JSON.stringify(rows, null, 1));
else for (const r of rows) {
  console.log(`\n== ${r.name} (${r.kind})  ${r.screen}  ${r.seats} seats   ${r.curve}`);
  console.log(`  rows at X = ${r.X.join(', ')} m;  floors: front ${r.front} | ${r.rowY.join(', ')}`);
  console.log(`  risers ${r.risers.join(', ')}  steps ${r.steps.join(',')}`);
  console.log(`  D1/W ${r.D1overW}  row1->centre ${r.vCentre} deg  ->top ${r.vTop} deg  FOV first ${r.fovFirst} last ${r.fovLast}`);
  console.log(`  ${r.room};  crossing aisle ${r.crossAisle}`);
}
