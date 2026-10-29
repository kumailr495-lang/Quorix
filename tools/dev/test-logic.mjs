// LUMIERE v5 - pure-Node checks (no browser, no GPU; runs in Termux): sh tools/run-dev.sh tools/dev/test-logic.mjs
//   halls    : seat counts, seats inside the hall, aisle steps <= 0.21 m, every row sees the bottom of the screen over the head in front
//   layout   : every passage door sits on its hall's side wall, rooms do not overlap, roomAt agrees on both sides of every door
//   director : house cues fire once and on time; live sound analysis stays quiet on steady sound, fires one scare on a real jump, respects cool-downs
//   i18n     : es / hi / ur cover every English key with the same list shapes and {placeholders}
// run through tools/run-dev.sh (it makes `three` resolvable); LUM_WWW points at the copied www/
import { pathToFileURL } from 'node:url';
const WWW = process.env.LUM_WWW ? pathToFileURL(process.env.LUM_WWW + '/').href : new URL('../../www/', import.meta.url).href, imp = (f) => import(WWW + f);
const { SPECS, calc, makeHall, hallFloorY, hallSeats } = await imp('js/hallmath.js');
const { HALLS, PASSAGES, RECTS, roomAt, DOOR_W, CONC, LOBBY } = await imp('js/layout.js');
const { Director } = await imp('js/react.js'), { HOUSE } = await imp('js/films.js');
const { EN } = await imp('js/lang/en.js'), { ES } = await imp('js/lang/es.js'), { HI } = await imp('js/lang/hi.js'), { UR } = await imp('js/lang/ur.js');
let fails = 0; const ok = (cond, msg) => { if (!cond) { fails++; console.log('  FAIL', msg); } return cond; };
const section = (s) => console.log('== ' + s);

section('halls');
for (const s of SPECS) {
  const h = makeHall(s), k = calc(s), seats = hallSeats(h);
  ok(seats.length === s.rows * s.perRow, `${s.id} seat count ${seats.length}`);
  for (const q of seats) if (!(q.x > h.x0 + 0.5 && q.x < h.x1 - 0.5 && q.z > h.zs && q.z < h.zBack)) { ok(false, `${s.id} seat ${q.id} outside the hall`); break; }
  // side aisles: walk them front to back in 1 cm steps, the floor may only change by stair risers
  let maxStep = 0;
  for (const side of [-1, 1]) { const x = h.cx + side * (h.B / 2 + 0.6); let prev = hallFloorY(h, x, h.zs + 0.3); for (let z = h.zs + 0.31; z < h.zBack - 0.1; z += 0.01) { const y = hallFloorY(h, x, z); maxStep = Math.max(maxStep, Math.abs(y - prev)); prev = y; } }
  ok(maxStep <= 0.21, `${s.id} aisle step ${maxStep.toFixed(3)} m > 0.21`);
  // sightlines (every-row vision): eye of row n to the screen bottom must clear the eye of row n-1 by >= 0.12 m (a head)
  let minC = Infinity; for (let n = 1; n < s.rows; n++) { const e0 = k.rowY[n - 1] + s.eye, e1 = k.rowY[n] + s.eye, X0 = k.X[n - 1], X1 = k.X[n];
    const atFront = k.bottomY + (e1 - k.bottomY) * (X0 / X1); minC = Math.min(minC, atFront - e0); }
  ok(minC >= 0.12, `${s.id} sightline clearance ${minC.toFixed(3)} m < 0.12`);
  ok(h.cross.d1 - h.cross.d0 >= 1.8, `${s.id} crossing aisle ${(h.cross.d1 - h.cross.d0).toFixed(2)} m < 1.8`);
  console.log(`  ${s.id}: ${seats.length} seats, max aisle step ${maxStep.toFixed(3)} m, min sightline clearance ${minC.toFixed(3)} m, crossing lane ${(h.cross.d1 - h.cross.d0).toFixed(2)} m`);
}

section('layout');
const over = (a, b) => a[0] < b[2] - 1e-6 && a[2] > b[0] + 1e-6 && a[1] < b[3] - 1e-6 && a[3] > b[1] + 1e-6;
const keys = Object.keys(RECTS).filter((k) => k !== 'street');
for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) ok(!over(RECTS[keys[i]], RECTS[keys[j]]), `rooms ${keys[i]} and ${keys[j]} overlap`);
for (const p of PASSAGES) for (const d of p.doors) {
  const h = HALLS.find((q) => q.id === d.hall), wallX = d.side < 0 ? h.x1 : h.x0;
  ok(Math.abs(d.x - wallX) < 0.2, `${p.key} door to ${d.hall} at x ${d.x} is not on the hall wall (${wallX})`);
  ok(d.z - DOOR_W / 2 > h.zs && d.z + DOOR_W / 2 < h.zBack, `${p.key} door to ${d.hall} outside the hall depth`);
  ok(d.z - DOOR_W / 2 > p.z0 && d.z + DOOR_W / 2 < p.z1, `${p.key} door to ${d.hall} outside the passage`);
  const inner = roomAt(d.x + (d.side < 0 ? -0.6 : 0.6), d.z), outer = roomAt(d.x + (d.side < 0 ? 0.6 : -0.6), d.z);
  ok(inner === h.key && outer === p.key, `${p.key} door to ${d.hall}: roomAt gives ${outer} | ${inner}`);
}
ok(CONC.z1 === LOBBY.z0, 'concourse meets the lobby');
console.log(`  ${keys.length} rooms, ${PASSAGES.reduce((n, p) => n + p.doors.length, 0)} hall doors`);

section('director');
{ // house films: every cue exactly once, never early, at most one frame late
  for (const [id, film] of Object.entries(HOUSE)) { const got = []; const D = new Director((h, e) => got.push(e)); D.startHouse('X', film, 0); const dt = 1 / 30, end = Math.max(...film.cues.map((c) => c.t)) + 2;
    for (let t = 0; t <= end; t += dt) D.update(dt, t * 1000, null, 0);
    ok(got.length === film.cues.length, `${id}: ${got.length} of ${film.cues.length} cues fired`); for (let i = 0; i < got.length; i++) ok(got[i].t >= film.cues[i].t - 1e-9 && got[i].t - film.cues[i].t < dt * 1.5, `${id}: cue ${i} at ${got[i].t.toFixed(2)} s, wanted ${film.cues[i].t}`); }
}
const live = (levelAt, seconds, lumAt = () => 0.3) => { const ev = []; const D = new Director((h, e) => ev.push(e)); D.startLive('X', 0); const dt = 1 / 30; for (let t = 0; t < seconds; t += dt) D.update(dt, t * 1000, levelAt(t), lumAt(t)); return ev; };
let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
{ const ev = live(() => -30 + (rnd() - 0.5) * 4, 300); ok(ev.length === 0, `steady dialogue-level sound fired ${ev.length} events (${ev.map((e) => e.type).join(',')})`); console.log(`  steady sound, 5 min: ${ev.length} events`); }
{ const ev = live(() => -18 + (rnd() - 0.5) * 3, 300); ok(!ev.some((e) => e.type === 'scare'), 'steady loud music fired a scare'); console.log(`  steady loud music, 5 min: ${ev.map((e) => e.type).join(',') || 'no events'}`); }
{ const ev = live((t) => (t < 10 ? -50 : t < 11.5 ? -10 : -45), 20); const sc = ev.filter((e) => e.type === 'scare'); ok(sc.length === 1 && sc[0].t >= 10 && sc[0].t < 10.5, `quiet then a hit: ${sc.length} scares at ${sc.map((e) => e.t.toFixed(2))}`); console.log(`  quiet -> hit: scare at ${sc[0] ? sc[0].t.toFixed(2) : '-'} s`); }
{ const ev = live((t) => ((t > 10 && t < 10.8) || (t > 16 && t < 16.8) ? -10 : -50), 25); ok(ev.filter((e) => e.type === 'scare').length === 1, 'two hits 6 s apart gave two scares (cool-down ignored)'); }
{ const ev = live((t) => (t < 10 ? -36 : -23.5), 16); ok(ev.length === 1 && ev[0].type === 'gasp', `moderate onset: ${ev.map((e) => e.type).join(',') || 'nothing'} (want one gasp)`); console.log(`  moderate onset: ${ev.map((e) => `${e.type}@${e.t.toFixed(2)}`).join(', ')}`); }
{ const ev = live((t) => -40 + Math.min(25, Math.max(0, t - 5) * 1.25), 30); ok(!ev.some((e) => e.type === 'scare' || e.type === 'gasp'), `slow crescendo fired ${ev.map((e) => e.type).join(',')}`); console.log(`  slow crescendo -40 -> -15 dB over 20 s: ${ev.map((e) => `${e.type}@${e.t.toFixed(1)}`).join(', ') || 'no events'}`); }
{ const ev = live((t) => (t < 8 ? -40 : t < 22 ? -13 + (rnd() - 0.5) * 2 : -42), 30); const cl = ev.filter((e) => e.type === 'climax'); ok(cl.length === 1, `long loud stretch then release: ${cl.length} climax events`); console.log(`  loud 14 s -> release: ${ev.map((e) => `${e.type}@${e.t.toFixed(1)}`).join(', ')}`); }

section('i18n');
for (const [name, T] of [['es', ES], ['hi', HI], ['ur', UR]]) {
  const ph = (s) => (JSON.stringify(s).match(/\{\w+\}/g) || []).sort().join(); let bad = 0;
  for (const k of Object.keys(EN)) { const a = EN[k], b = T[k]; if (b === undefined) { ok(false, `${name}: missing ${k}`); bad++; continue; }
    if (Array.isArray(a) !== Array.isArray(b)) { ok(false, `${name}: ${k} list vs text`); bad++; } else if (!Array.isArray(a) && ph(a) !== ph(b)) { ok(false, `${name}: ${k} placeholders ${ph(b)} != ${ph(a)}`); bad++; }
    else if (Array.isArray(a) && Array.isArray(a[0]) && b.some((x) => !Array.isArray(x))) { ok(false, `${name}: ${k} chat lines must be lists`); bad++; } }
  console.log(`  ${name}: ${Object.keys(EN).length - bad}/${Object.keys(EN).length} keys ok`);
}
console.log(fails ? `${fails} FAILED` : 'all logic checks passed'); process.exit(fails ? 1 : 0);
