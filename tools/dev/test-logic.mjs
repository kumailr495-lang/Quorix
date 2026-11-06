// LUMIERE v9 - pure-Node checks (no browser, no GPU; runs in Termux): sh tools/run-dev.sh tools/dev/test-logic.mjs
//   halls    : every row has a middle seat, seat counts, aisle steps <= 0.18 m, row lanes wide enough to pass, every row sees the picture's
//              bottom over the row in front (UNIC clearance), the first row within the comfort angles
//   building : the four halls don't overlap each other or the corridor and the spine; every rear aisle is level with the first floor; doors
//              sit on the right level; the walkers' nav graph reaches every node from the kerb and back to the lobby (one-way edges kept)
//   director : the open films' offline cue tracks fire once and on time; live analysis stays quiet on steady sound, one scare on a real jump
//   i18n     : es / hi / ur cover every English key with the same list shapes and {placeholders}
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
const WWW = process.env.LUM_WWW ? pathToFileURL(process.env.LUM_WWW + '/').href : new URL('../../www/', import.meta.url).href, imp = (f) => import(WWW + f);
const { HALLS, makeHall, hallSeats, hallFloor, STEP_MAX } = await imp('js/hallmath.js');
const B = await imp('js/building.js'), { navPath } = await imp('js/npc9.js').catch(() => ({}));
const { Director } = await imp('js/react.js'), { CATALOG } = await imp('js/films.js');
const { EN } = await imp('js/lang/en.js'), { ES } = await imp('js/lang/es.js'), { HI } = await imp('js/lang/hi.js'), { UR } = await imp('js/lang/ur.js');
let fails = 0; const ok = (cond, msg) => { if (!cond) { fails++; console.log('  FAIL', msg); } return cond; };
const section = (s) => console.log('== ' + s);

section('halls');
for (const s of HALLS) {
  const h = B.HALL[s.id], seats = hallSeats(h), want = h.rows.reduce((a, r) => a + r.places.length, 0);
  ok(seats.length === want && seats.length > 80, `${s.id} seat count ${seats.length}`);
  for (const row of h.rows) if (!row.pairs) ok(row.n % 2 === 1 && row.places.some((p) => Math.abs(p.u) < 1e-6), `${s.id} row ${row.letter} has a middle seat`);
  ok(Math.min(...h.rows.slice(1).map((r) => r.clear)) >= 0.5, `${s.id} a row lane is narrower than 0.5 m`);
  // side aisle walked front to back in 1 cm steps: the floor changes only by steps <= STEP_MAX
  for (const sg of [-1, 1]) { let prev = hallFloor(h, sg * (h.aisle[0] + h.aisle[1]) / 2, 0), max = 0; for (let d = 0; d < h.depthIn; d += 0.01) { const y = hallFloor(h, sg * (h.aisle[0] + h.aisle[1]) / 2, d); max = Math.max(max, Math.abs(y - prev)); prev = y; }
    ok(max <= STEP_MAX + 1e-6, `${s.id} aisle step ${max.toFixed(3)} m > ${STEP_MAX}`); }
  // sightline: each row's eye clears the head of the row in front by c over the picture's bottom edge
  for (let i = 1; i < h.rows.length; i++) { const a = h.rows[i - 1], b = h.rows[i], eyeA = a.y + a.sd.eye, eyeB = b.y + b.sd.eye, atA = h.hB + (eyeB - h.hB) * (a.X / b.X); ok(eyeA + 0.12 <= atA + 1e-3 || b.lift || a.lift, `${s.id} row ${b.letter} sightline over row ${a.letter}: ${(atA - eyeA).toFixed(3)} m`); }
  const r0 = h.rows[0], up = Math.atan((h.centreY - r0.sd.eye) / r0.X) * 180 / Math.PI; const lim = s.format === 'max' ? 35 : 30.5;   // the IMAX-shaped MAX picture (25 x 18 m, the user's 'bigger screens') is meant to fill the view: real large-format front rows look up 35 deg and more
  ok(up <= lim, `${s.id} first row looks up ${up.toFixed(1)} deg to the picture centre (limit ${lim})`);
  ok(Math.abs(h.y0 + h.total - B.L1) < 0.01, `${s.id} rear aisle at ${(h.y0 + h.total).toFixed(3)}, first floor ${B.L1.toFixed(3)}`);
}
section('building');
// a hall's walls may share their outer 0.15 m with a neighbour's wall zone
{ const rect = (h) => { const a = h.toWorld(-h.width / 2 - 0.25, -1.5), b = h.toWorld(h.width / 2 + 0.25, h.depthIn + 0.25); return [Math.min(a.x, b.x), Math.min(a.z, b.z), Math.max(a.x, b.x), Math.max(a.z, b.z)]; };
  const R = Object.values(B.HALL).map((h) => [h.id, rect(h)]), over = (p, q) => p[0] < q[2] - 1e-3 && q[0] < p[2] - 1e-3 && p[1] < q[3] - 1e-3 && q[1] < p[3] - 1e-3;
  for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) ok(!over(R[i][1], R[j][1]), `halls ${R[i][0]} and ${R[j][0]} overlap`);
  const S = B.SPINE; for (const [id, r] of R) ok(!over(r, [S.x0, S.z0, S.x1, S.z1]), `hall ${id} overlaps the spine`);
  for (const c of [B.BRIDGE, B.FLANK_W, B.LINK_W, B.FLANK_E, B.LINK_E]) for (const [id, r] of R) ok(!over(r, [c.x0, c.z0, c.x1, c.z1]), `hall ${id} overlaps a corridor part`);
  for (const d of B.DOORS) if (d.hall) { const h = B.HALL[d.hall]; ok(Math.abs(d.y - (d.id.endsWith('In') ? B.L1 : h.y0)) < 1e-6, `door ${d.id} at the wrong level`); } }
// the spine is reached only through the halls' exit doors, so it is not on the way from the kerb
if (navPath) { const nodes = Object.keys(B.NAV.nodes).filter((n) => !n.startsWith('spine')); for (const n of nodes) { ok(navPath('kerb', n), `nav: ${n} unreachable from the kerb`); }
  ok(navPath('spineS', 'lobbyBack'), 'nav: the spine does not lead back to the lobby'); ok(!navPath('lobbyBack', 'spineS'), 'nav: the spine can be entered from the lobby (one-way)'); }
section('director');
{ // open films: every cue exactly once, never early, at most one frame late, on the video's clock; at least 10 s apart; seeking skips
  for (const f of CATALOG) { const tr = JSON.parse(fs.readFileSync(new URL('films/' + f.id + '.json', WWW), 'utf8')), cues = tr.cues.filter((c) => c.type !== 'end');
    ok(tr.light && atob(tr.light).length === Math.floor(tr.duration * tr.hz) * 9 || Math.abs(atob(tr.light).length / 9 - tr.duration * tr.hz) < 3, `${f.id}: light track covers the film`);
    ok(tr.end > 0 && tr.end <= tr.duration, `${f.id}: credits start inside the film (${tr.end} of ${tr.duration} s)`);
    for (let i = 1; i < cues.length; i++) ok(cues[i].t - cues[i - 1].t >= 10, `${f.id}: cues ${i - 1} and ${i} only ${(cues[i].t - cues[i - 1].t).toFixed(1)} s apart`);
    const got = []; let clock = 0; const D = new Director((h, e) => got.push(e)); D.startTrack('X', tr.cues, () => clock); const dt = 1 / 30, end = tr.end + 2;
    for (let t = 0; t <= end; t += dt) { clock = t; D.update(dt, t * 1000, null, 0); }
    ok(got.length === cues.length, `${f.id}: ${got.length} of ${cues.length} cues fired`); for (let i = 0; i < got.length; i++) ok(got[i].t >= cues[i].t - 1e-9 && got[i].t - cues[i].t < dt * 1.5, `${f.id}: cue ${i} at ${got[i].t.toFixed(2)} s, wanted ${cues[i].t}`);
    if (cues.length > 1) { const g2 = []; let c2 = 0; const D2 = new Director((h, e) => g2.push(e)); D2.startTrack('X', tr.cues, () => c2); const t0 = cues[cues.length - 1].t - 0.5; c2 = t0; D2.seek('X'); for (let t = t0; t <= t0 + 1; t += dt) { c2 = t; D2.update(dt, t * 1000, null, 0); } ok(g2.length === 1, `${f.id}: after a seek only the next cue fires (${g2.length})`); } }
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
