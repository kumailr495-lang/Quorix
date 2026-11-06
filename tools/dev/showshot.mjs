// LUMIERE v9.1 - a film playing in a hall, photographed from a seat (headless Chromium + SwiftShader: the real engine on a software GPU,
// not the phone). Checks what only shows during a show: the picture, its light on the room, the 270 hall's side screens.
// usage: node tools/dev/showshot.mjs OUT [HALL=X270] [VIDEO=generated test film]
// The test film is made with ffmpeg (lavfi mandelbrot, VP8 WebM), served from the scratch folder, and played as "your own video".
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
const OUT = process.argv[2] || 'showshot', HALL = process.argv[3] || 'X270'; fs.mkdirSync(OUT, { recursive: true });
const WWW = path.resolve('www'), VID = path.join(OUT, 'testfilm.webm');
if (!fs.existsSync(VID)) execFileSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'mandelbrot=s=960x408:r=24', '-t', '40', '-c:v', 'libvpx', '-b:v', '1500k', '-an', VID]);
let pwPath = process.env.PW_PATH; if (!pwPath) for (const p of ['/opt/node-tools/node_modules/playwright/index.mjs', '/opt/npm-tools/node_modules/playwright/index.mjs']) if (fs.existsSync(p)) { pwPath = p; break; }
const { chromium } = await import(pwPath || 'playwright');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.ogg': 'audio/ogg', '.webm': 'video/webm' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = u === '/testfilm.webm' ? VID : path.join(WWW, u === '/' ? 'index.html' : u);
  if ((f !== VID && !f.startsWith(WWW)) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; }
  const st = fs.statSync(f), m = /bytes=(\d+)-(\d*)/.exec(q.headers.range || ''), type = MIME[path.extname(f)] || 'application/octet-stream';
  if (m) { const a = +m[1], b = m[2] ? +m[2] : st.size - 1; r.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${a}-${b}/${st.size}`, 'Accept-Ranges': 'bytes', 'Content-Length': b - a + 1 }); fs.createReadStream(f, { start: a, end: b }).pipe(r); return; }
  r.writeHead(200, { 'Content-Type': type, 'Content-Length': st.size, 'Accept-Ranges': 'bytes' }); fs.createReadStream(f).pipe(r); });
await new Promise((ok) => srv.listen(0, '127.0.0.1', ok)); const port = srv.address().port;
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: 960, height: 540 } });
await ctx.addInitScript(() => { try { localStorage.setItem('lumiere.settings.v5', JSON.stringify({ lang: 'en', graphics: 'high', tutorialAsked: true, npcs: 'off' })); } catch (e) {} });
const p = await ctx.newPage(); const log = []; p.on('pageerror', (e) => log.push(`[pageerror] ${e.message}`)); p.on('console', (m) => { if (m.type() === 'error') log.push(`[error] ${m.text()}`); });
await p.goto(`http://127.0.0.1:${port}/index.html?play=quick`);
await p.waitForFunction(() => window.__lumiere && window.__lumiere.ready && window.__lumiere.mode === 'play', null, { timeout: 300000 });
// sit in the middle of the middle row (camera posed there), book your own video in that hall, wait for it to play
const pose = await p.evaluate(async (hid) => {
  const L = window.__lumiere, h = L.world.hallById(hid), seats = h.seats, rows = [...new Set(seats.map((s) => s.row))].sort((a, b) => a - b), mr = rows[rows.length >> 1];
  const s = seats.filter((q) => q.row === mr).reduce((a, q) => (Math.abs(q.a) < Math.abs(a.a) ? q : a)), eye = s.y + 1.05;
  L.player.place(s.x, s.z, s.yaw, 0, s.y); const own = L.shows.loadLocal('/testfilm.webm', 'Test film'); L.shows.book(hid, own, 0, s.id, { replay: true });
  return { x: s.x, y: eye, z: s.z, yaw: s.yaw };
}, HALL);
await p.waitForFunction((hid) => { const s = window.__lumiere.shows.get(hid); return s && s.state === 'playing'; }, HALL, { timeout: 120000 }).catch(() => {});
await p.waitForTimeout(5000);
const shots = [['front', 0, 0.06], ['left', 0.95, 0.04], ['right', -0.95, 0.04]];
for (const [name, dy, pitch] of shots) { await p.evaluate(([q, dy_, pi]) => window.__lumiere.pose([q.x, q.y, q.z, q.yaw + dy_, pi]), [pose, dy, pitch]); await p.waitForTimeout(1500); await p.screenshot({ path: path.join(OUT, `${HALL}-${name}.png`) }); }
const st = await p.evaluate((hid) => { const s = window.__lumiere.shows.get(hid); return { state: s.state, light: s.light, pic: !!s.pic }; }, HALL);
console.log(HALL, JSON.stringify(st)); if (log.length) console.log(log.slice(0, 8).join('\n'));
await b.close(); srv.close();
