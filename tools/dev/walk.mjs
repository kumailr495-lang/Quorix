// LUMIERE v9 - scripted walks through the real game (headless Chromium + SwiftShader): the player is steered with the game's own
// controls (forward key + yaw) along waypoints, so walls, steps, doors, escalators and the lift all act as they do when you play.
// A walk fails when the player stops moving for 6 s (stuck on something) or ends in the wrong room or at the wrong height.
// usage: node tools/dev/walk.mjs [OUT_DIR]      (Quick play: the ticket gate is open)
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const OUT = process.argv[2] || null; if (OUT) fs.mkdirSync(OUT, { recursive: true });
const WWW = path.resolve('www');
let pwPath = process.env.PW_PATH; if (!pwPath) for (const p of ['/opt/node-tools/node_modules/playwright/index.mjs', '/opt/npm-tools/node_modules/playwright/index.mjs']) if (fs.existsSync(p)) { pwPath = p; break; }
const { chromium } = await import(pwPath || 'playwright');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.ogg': 'audio/ogg', '.webm': 'video/webm' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(WWW, u === '/' ? 'index.html' : u); if (!f.startsWith(WWW) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise((ok) => srv.listen(0, '127.0.0.1', ok)); const port = srv.address().port;
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 480, height: 270 } });
await ctx.addInitScript(() => { try { localStorage.setItem('lumiere.settings.v5', JSON.stringify({ lang: 'en', graphics: 'low', tutorialAsked: true, npcs: 'off' })); } catch (e) {} });
const p = await ctx.newPage(); const log = []; p.on('pageerror', (e) => log.push(`[pageerror] ${e.message}`)); p.on('console', (m) => { if (m.type() === 'error') log.push(`[error] ${m.text()}`); });
await p.goto(`http://127.0.0.1:${port}/index.html?play=quick`);
await p.waitForFunction(() => window.__lumiere && window.__lumiere.ready && window.__lumiere.mode === 'play', null, { timeout: 300000 });
await p.waitForTimeout(1500);
// the autopilot: steer towards each waypoint with the forward key; [x, z] walk, [x, z, 'wait', ms] stand still, [x, z, 'lift:1'] call the
// lift, [x, z, 'until-lift:1'] stand until it has arrived with its doors open
await p.evaluate(() => {
  window.__auto = (pts, label) => new Promise((done) => {
    const L = window.__lumiere, P = L.player, path_ = []; let i = 0, t0 = performance.now(), lastMove = performance.now(), lx = P.x, lz = P.z, maxDy = 0, prevY = P.y, px = P.x, pz = P.z, tele = 0;
    const step = () => {
      // v9.2 fast exit: stepping from a hall into the spine fades and puts you at the spine's mouth in the lobby; the walk then heads for its last waypoint
      if (Math.hypot(P.x - px, P.z - pz) > 3) { tele++; path_.push(`teleport:${P.x.toFixed(1)},${P.y.toFixed(2)},${P.z.toFixed(1)} ${L.world.roomAt(P.x, P.y, P.z)}`); i = Math.max(i, pts.length - 1); prevY = P.y; lx = P.x; lz = P.z; lastMove = performance.now(); }
      px = P.x; pz = P.z;
      const dy = Math.abs(P.y - prevY); prevY = P.y; maxDy = Math.max(maxDy, dy);
      if (i >= pts.length) { P.keys.KeyW = false; done({ ok: true, label, tele, path: path_, end: [+P.x.toFixed(2), +P.y.toFixed(2), +P.z.toFixed(2), L.world.roomAt(P.x, P.y, P.z)], maxDy: +maxDy.toFixed(2) }); return; }
      const w = pts[i], [x, z, act] = w, dx = x - P.x, dz = z - P.z, d = Math.hypot(dx, dz);
      if (typeof act === 'string' && act.startsWith('until-lift:')) {   // stand still until the lift has arrived at that floor with its doors open (game time, not wall time)
        P.keys.KeyW = false; const f = L.world.lift, k = +act.slice(11); if (!w.t) w.t = performance.now();
        if ((f.level === k && f.state === 'idle' && f.doors[k] > 0.8) || performance.now() - w.t > 90000) { i++; lastMove = performance.now(); } requestAnimationFrame(step); return; }
      if (act === 'wait') { P.keys.KeyW = false; if (!w.t) w.t = performance.now(); if (performance.now() - w.t > (w[3] || 3000)) { i++; lastMove = performance.now(); } requestAnimationFrame(step); return; }
      if (typeof act === 'string' && act.startsWith('lift:')) { L.world.lift.call(+act.slice(5)); w[2] = null; }   // press the lift's call button for that floor
      if (d < 0.35) { path_.push(`${i}:${P.x.toFixed(1)},${P.y.toFixed(2)},${P.z.toFixed(1)} ${L.world.roomAt(P.x, P.y, P.z)}`); i++; requestAnimationFrame(step); return; }
      P.yaw = Math.atan2(-dx, -dz); P.keys.KeyW = true;
      if (Math.hypot(P.x - lx, P.z - lz) > 0.05) { lx = P.x; lz = P.z; lastMove = performance.now(); }
      if (performance.now() - lastMove > 6000) { P.keys.KeyW = false; done({ ok: false, label, stuckAt: i, pos: [+P.x.toFixed(2), +P.y.toFixed(2), +P.z.toFixed(2), L.world.roomAt(P.x, P.y, P.z)], target: [x, z], path: path_ }); return; }
      if (performance.now() - t0 > 300000) { P.keys.KeyW = false; done({ ok: false, label, timeout: true, path: path_ }); return; }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
});
// the walks, built in the page from the building's own numbers (building.js, hallmath.js)
const walks = await p.evaluate(async () => {
  const L = window.__lumiere, B = L.B, HM = await import('/js/hallmath.js'), W = L.world, out = [], pt = (o) => [+o.x.toFixed(3), +o.z.toFixed(3)];
  out.push({ label: 'street to lobby (main doors)', start: [0.6, 0, 25.2], pts: [[0.6, 22], [0, 19], [0, 15.5]], room: 'lobby', y: 0 });
  out.push({ label: 'lobby to restrooms and back', start: [16, 0, -1], pts: [[20.5, -1], [23.4, -1], [26, -2.2], [23.4, -1], [19, -1]], room: 'lobby', y: 0 });
  out.push({ label: 'up escalator to the bridge', start: [9.7, 0, 6], pts: [[9.7, 4.6], [9.7, 2.6], [9.7, 0.6], [9.7, -1], [9.7, -6], [9.7, -10.6], [9.7, -12.3], [10.2, -15.5], [0, -18]], room: 'corridor', y: B.L1 });
  out.push({ label: 'lift up and out on the first floor', start: [14.6, 0, -6.5], pts: [[14.6, -8.8], [14.6, -9.4, 'wait', 4000], [14.6, -11.2], [14.6, -11.4, 'lift:1'], [14.6, -11.4, 'until-lift:1'], [14.6, -9.0], [13, -8.2]], room: 'lobby', y: B.L1 });
  for (const h of Object.values(B.HALL)) {
    const wh = W.hallByKey(h.key), din = B.DOORS.find((d) => d.hall === h.id && d.id.endsWith('In')), side = -h.dir;
    const rows = [...new Set(wh.seats.map((s) => s.row))].sort((a, b) => a - b);
    for (const r of [rows[rows.length >> 1], rows[0]]) {   // a middle row, the front row: the seat nearest the middle
      const seat = wh.seats.filter((s) => s.row === r).reduce((a, s) => (Math.abs(s.a) < Math.abs(a.a) ? s : a));
      const route = HM.seatRoute(h, seat).map((q) => pt(h.toWorld(q.u, q.d))), sg = Math.sign(h.entryU) || 1;
      // round the light-lock baffle 1.25 m inside the door (it hides the hall from the corridor): along the rear wall, then in
      const lock = [pt(h.toWorld(h.entryU, h.depthIn - 0.62)), pt(h.toWorld(h.entryU - sg * 2.0, h.depthIn - 0.62)), pt(h.toWorld(h.entryU - sg * 2.0, h.depthIn - 1.9))];
      out.push({ label: `${h.id}: corridor, entrance, aisle steps, row ${seat.id.replace(/\d+$/, '')} to seat ${seat.id}`, start: [din.x + side * 2.2, B.L1, din.z], pts: [[din.x + side * 0.9, din.z], ...lock, ...route], room: h.key, y: h.y0 + h.rows[r].y });
    }
    // out: from the front row's lane, along the front to the exit portal, through the exit door, down the stairs, along the spine to the lobby
    const ex = h.exits[0], st = B.EXIT_STAIRS.find((s) => s.door === h.id + 'Out0'), a = h.toWorld(ex.u, h.screenD(ex.u) + 1.3), bq = h.toWorld(ex.u, -0.6), c = h.toWorld(ex.u, -2.3);   // in front of the exit portal, through it
    const pts = [pt(bq), pt(c)];
    if (st) { const xs = (st.x0 + st.x1) / 2; pts.push([xs, st.zDoor], [xs, st.zTop + st.dir * 0.2], [xs, st.zBot + st.dir * 0.6], [c.x < 0 ? -1.6 : 1.6, st.zBot + st.dir * 0.6]); }
    else pts.push([c.x < 0 ? -1.6 : 1.6, c.z]);
    pts.push([c.x < 0 ? -1.6 : 1.6, -15.2], [0, -15.2], [0, -12.6], [0, -10]);
    out.push({ label: `${h.id}: front of the hall, exit door, ${st ? 'exit stairs, ' : ''}spine (fast exit), lobby`, start: [a.x, h.y0, a.z], pts, room: 'lobby', y: 0, tele: 1 });
  }
  return out;
});
// v9.1 (advisor): walkers follow the NAV graph, not the collision grid, so furniture on a NAV edge gets walked through. Every level edge must
// keep 0.25 m (a walker's radius) from every collision segment in the band a walker would hit (0.4 to 1.75 m over the edge's floor).
const navHits = await p.evaluate(() => {
  const L = window.__lumiere, W = L.world, B = L.B, S = W.walls.S, out = [], N = B.NAV.nodes;
  const segDist = (ax, az, bx, bz, cx, cz, dx, dz) => { const cr = (px, pz, qx, qz, rx, rz) => (qx - px) * (rz - pz) - (qz - pz) * (rx - px);
    const o1 = cr(ax, az, bx, bz, cx, cz), o2 = cr(ax, az, bx, bz, dx, dz), o3 = cr(cx, cz, dx, dz, ax, az), o4 = cr(cx, cz, dx, dz, bx, bz); if (o1 * o2 < 0 && o3 * o4 < 0) return 0;
    const pd = (px, pz, x0, z0, x1, z1) => { const vx = x1 - x0, vz = z1 - z0, l = vx * vx + vz * vz, t = l > 0 ? Math.max(0, Math.min(1, ((px - x0) * vx + (pz - z0) * vz) / l)) : 0; return Math.hypot(px - x0 - vx * t, pz - z0 - vz * t); };
    return Math.min(pd(ax, az, cx, cz, dx, dz), pd(bx, bz, cx, cz, dx, dz), pd(cx, cz, ax, az, bx, bz), pd(dx, dz, ax, az, bx, bz)); };
  for (const [a, b] of B.NAV.edges) { const A = N[a], Bn = N[b]; if (!A || !Bn || Math.abs(A[1] - Bn[1]) > 0.05) continue;
    const y = A[1]; let worst = 9, at = null;
    for (let i = 0; i < S.length; i += 6) { if (S[i + 5] <= y + 0.4 || S[i + 4] >= y + 1.75) continue; const d = segDist(A[0], A[2], Bn[0], Bn[2], S[i], S[i + 1], S[i + 2], S[i + 3]); if (d < worst) { worst = d; at = [S[i], S[i + 1], S[i + 2], S[i + 3]].map((v) => +v.toFixed(2)); } }
    if (worst < 0.25) out.push({ edge: a + '-' + b, clearance: +worst.toFixed(2), wall: at }); }
  return out; });
console.log(navHits.length ? `NAV edges blocked: ${navHits.length}\n` + navHits.map((h) => `  ${h.edge}  clearance ${h.clearance} m  wall ${JSON.stringify(h.wall)}`).join('\n') : 'NAV edges clear of walls and furniture');
let pass = 0; const results = [], only = process.argv.indexOf('--only') > 0 ? process.argv[process.argv.indexOf('--only') + 1] : null;
for (const w of walks.filter((x) => !only || x.label.includes(only))) {
  const r = await p.evaluate(async (w) => { const L = window.__lumiere; L.player.place(w.start[0], w.start[2], 0, 0, w.start[1]); await new Promise((q) => setTimeout(q, 300)); const res = await window.__auto(w.pts, w.label); return res; }, w);
  const okEnd = r.ok && r.end[3] === w.room && Math.abs(r.end[1] - w.y) < 0.3 && r.tele === (w.tele || 0); if (okEnd) pass++;
  if (!okEnd && process.argv.includes('--debug')) console.log(JSON.stringify(r.path), await p.evaluate(() => { const f = window.__lumiere.world.lift; return JSON.stringify({ y: f.y, level: f.level, state: f.state, doors: f.doors }); }));
  results.push({ ...r, want: [w.room, w.y], okEnd });
  console.log(`${okEnd ? 'PASS' : 'FAIL'}  ${w.label}${r.ok ? `  end ${r.end.join(' ')}` : `  stuck at waypoint ${r.stuckAt} ${JSON.stringify(r.pos)} -> ${JSON.stringify(r.target)}`}${r.ok && !okEnd ? `  (wanted ${w.room} at ${w.y.toFixed(2)}, ${w.tele || 0} fast exit(s); got ${r.tele})` : ''}`);
}
console.log(`walks: ${pass}/${results.length} passed`); if (log.length) console.log(log.slice(0, 10).join('\n'));
if (OUT) fs.writeFileSync(path.join(OUT, 'walks.json'), JSON.stringify(results, null, 1));
await b.close(); srv.close(); process.exit(pass === results.length && !navHits.length ? 0 : 1);
