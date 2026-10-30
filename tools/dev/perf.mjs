// CPU profile of the real app per subsystem, in headless Chromium (SwiftShader). Walks a route and holds poses; reports per-frame
// JavaScript time of each subsystem (mean / p95 / max), draw calls and triangles. GPU time on SwiftShader says nothing about a phone,
// so only the JavaScript columns are compared; THROTTLE=4 slows the CPU to roughly a mid-range phone.
// usage: node tools/dev/perf.mjs [www-dir]
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const WWW = path.resolve(process.argv[2] || 'www');
let pwPath = process.env.PW_PATH; if (!pwPath) { for (const p of ['/opt/node-tools/node_modules/playwright/index.mjs', '/opt/npm-tools/node_modules/playwright/index.mjs']) if (fs.existsSync(p)) { pwPath = p; break; } }
const { chromium } = await import(pwPath || 'playwright');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(WWW, u === '/' ? 'index.html' : u); if (!f.startsWith(WWW) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: 800, height: 360 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
if (!process.env.FRESH) await ctx.addInitScript(() => { try { localStorage.setItem('lumiere.settings.v5', JSON.stringify({ lang: 'en', graphics: 'medium', ...JSON.parse(localStorage.getItem('lumiere.settings.v5') || '{}') })); } catch (e) {} });   // FRESH=1: first launch (language picker)
const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(`http://127.0.0.1:${srv.address().port}/index.html?play=1&fixscale=1${process.env.Q || ''}`);
await p.waitForFunction(() => window.__lumiere && window.__lumiere.ready && window.__lumiere.mode === 'play', null, { timeout: 180000 });
if (+process.env.THROTTLE > 1) { const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: +process.env.THROTTLE }); }
// wrap subsystems with timers
await p.evaluate(() => {
  const L = window.__lumiere, T = window.__perf = { acc: {}, frames: [] }, wrap = (o, m, name) => { const f = o[m].bind(o); o[m] = (...a) => { const t = performance.now(); const r = f(...a); T.acc[name] = (T.acc[name] || 0) + performance.now() - t; return r; }; };
  wrap(L.crowd, 'update', 'crowd'); wrap(L.world, 'update', 'doors'); wrap(L.shows, 'update', 'shows'); wrap(L.talk, 'update', 'talk'); wrap(L.director, 'update', 'director'); wrap(L.engine, 'render', 'render'); wrap(L.player, 'update', 'player'); wrap(L.world, 'setVisibility', 'vis');
  for (const h of L.world.halls) wrap(h, 'updateLOD', 'seatLOD');
  const raf = window.requestAnimationFrame.bind(window); let last = 0;
  window.requestAnimationFrame = (cb) => raf((t) => { const t0 = performance.now(); cb(t); const tot = performance.now() - t0; T.frames.push({ tot, gap: t - last, ...T.acc }); last = t; T.acc = {}; });
});
const book = `(() => { const L = window.__lumiere, h = L.world.halls[0], s = h.seats[Math.floor(h.seats.length / 2)]; L.book({ hall: h.id, hallKey: h.key, hallName: h.cfg.name, seat: s.id, row: s.row, col: s.col, film: null, delay: 0, own: false, title: '' }); L.shows.get(h.id).startAt = L.shows.now + 1000; })()`;
const route = [
  { name: 'lobby spawn', pose: [0, 18.2, 0, 0], hold: 90 },
  { name: 'lobby looking in', pose: [0, 12, 0, 0], hold: 90 },
  { name: 'concourse', pose: [0, -3, 0, 0], hold: 90 },
  { name: 'walk conc->passW', walk: [[0, -3], [-12.9, -4.5], [-12.9, -12]], hold: 0 },
  { name: 'passage W', pose: [-12.9, -12, 0, 0], hold: 90 },
  { name: 'book + show', eval: book, pose: [-12.9, -12, 0, 0], hold: 30 },
  { name: 'hall I cross aisle', pose: null, evalPose: 'hall', hold: 150 },
  { name: 'walk in hall I', walkHall: true, hold: 0 },
];
const stats = (a) => { if (!a.length) return '-'; const s = [...a].sort((x, y) => x - y); return `${(a.reduce((x, y) => x + y, 0) / a.length).toFixed(2)}/${s[Math.floor(s.length * 0.95)].toFixed(2)}/${s[s.length - 1].toFixed(2)}`; };
for (const r of route) {
  if (r.eval) await p.evaluate(r.eval);
  await p.waitForTimeout(r.eval ? 4000 : 0);
  if (r.pose) await p.evaluate((ps) => window.__lumiere.player.place(ps[0], ps[1], ps[2] * Math.PI / 180, ps[3] * Math.PI / 180), r.pose);
  if (r.evalPose === 'hall') await p.evaluate(() => { const L = window.__lumiere, h = L.world.halls[0].cfg; L.player.place(h.cx, h.zs + h.cross.dDoor, Math.PI, 0); });
  await p.evaluate(() => { window.__perf.frames = []; });
  if (r.walk) { for (let i = 1; i < r.walk.length; i++) { const [ax, az] = r.walk[i - 1], [bx, bz] = r.walk[i], n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.05); for (let k = 0; k <= n; k++) { await p.evaluate(([x, z, yaw]) => window.__lumiere.player.place(x, z, yaw, 0), [ax + (bx - ax) * k / n, az + (bz - az) * k / n, Math.atan2(-(bx - ax), -(bz - az))]); await p.evaluate(() => new Promise((ok) => requestAnimationFrame(() => ok()))); } } }
  else if (r.walkHall) { for (let k = 0; k < 120; k++) { await p.evaluate((k) => { const L = window.__lumiere, h = L.world.halls[0].cfg; L.player.place(h.cx - 4 + k * 0.07, h.zs + h.cross.dDoor, Math.PI, 0); }, k); await p.evaluate(() => new Promise((ok) => requestAnimationFrame(() => ok()))); } }
  else await p.waitForFunction((n) => window.__perf.frames.length >= n, r.hold, { timeout: 120000 });
  const res = await p.evaluate(() => { const F = window.__perf.frames, L = window.__lumiere, keys = new Set(); for (const f of F) for (const k in f) keys.add(k); const o = {}; for (const k of keys) o[k] = F.map((f) => f[k] || 0); return { o, calls: L.engine.renderer.info.render.calls, tris: L.engine.renderer.info.render.triangles, room: L.world.roomAt(L.player.x, L.player.z), vis: [...L.world.vis].join(','), agents: L.crowd.agents.filter((a) => a.group.visible).length }; });
  console.log(`\n${r.name}  [room ${res.room}; drawn ${res.vis}; ${res.calls} draws, ${(res.tris / 1000).toFixed(0)}k tris, ${res.agents} people drawn]   ms mean/p95/max`);
  for (const k of ['tot', 'crowd', 'seatLOD', 'shows', 'doors', 'player', 'vis', 'talk', 'director', 'render']) if (res.o[k]) console.log(`  ${k.padEnd(9)} ${stats(res.o[k])}`);
}
console.log(errs.length ? '\nerrors:\n' + errs.slice(0, 10).join('\n') : '\nno console errors');
await b.close(); srv.close();
