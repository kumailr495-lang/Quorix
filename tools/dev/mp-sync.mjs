// LUMIERE v9.3 - playing together, tested with three headless Chromium pages on one machine through the real public Nostr relays
// (the real engine on a software GPU, not phones). A hosts and B joins; A books a shared web film 12 s ahead and both must start it at
// the same moment and stay within a few hundredths of a second; A leaves and B must take over as host; C joins late and must pick
// the film up where the room is. The film is a generated test pattern served over https with byte ranges (like the app's media server).
// usage: node tools/dev/mp-sync.mjs OUT     (needs ffmpeg and openssl; takes about 10 minutes)
import http from 'node:http'; import https from 'node:https'; import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true }); const WWW = path.resolve('www'); const VID = path.join(OUT, 'testfilm.webm');
if (!fs.existsSync(VID)) execFileSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'testsrc2=s=640x360:r=24', '-t', '300', '-c:v', 'libvpx', '-b:v', '600k', '-an', VID]);
let pwPath = process.env.PW_PATH; if (!pwPath) for (const p of ['/opt/node-tools/node_modules/playwright/index.mjs', '/opt/npm-tools/node_modules/playwright/index.mjs']) if (fs.existsSync(p)) { pwPath = p; break; }
const { chromium } = await import(pwPath || 'playwright');
const KEY = path.join(OUT, 'key.pem'), CERT = path.join(OUT, 'cert.pem');
if (!fs.existsSync(KEY)) execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', KEY, '-out', CERT, '-days', '2', '-subj', '/CN=127.0.0.1', '-addext', 'subjectAltName=IP:127.0.0.1'], { stdio: 'ignore' });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.ogg': 'audio/ogg', '.webp': 'image/webp', '.opus': 'audio/ogg' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(WWW, u === '/' ? 'index.html' : u); if (!f.startsWith(WWW) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise((ok) => srv.listen(0, '127.0.0.1', ok)); const port = srv.address().port;
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const body = fs.readFileSync(VID);
const fsrv = https.createServer({ key: fs.readFileSync(KEY), cert: fs.readFileSync(CERT) }, (q, r) => {
  const H = { 'Content-Type': 'video/webm', 'Access-Control-Allow-Origin': '*', 'Accept-Ranges': 'bytes' }, m = /bytes=(\d*)-(\d*)/.exec(q.headers.range || '');
  if (!m) { r.writeHead(200, { ...H, 'Content-Length': body.length }); r.end(body); return; }
  const a = m[1] ? +m[1] : 0, e = m[2] ? Math.min(+m[2], body.length - 1) : body.length - 1; r.writeHead(206, { ...H, 'Content-Range': `bytes ${a}-${e}/${body.length}`, 'Content-Length': e - a + 1 }); r.end(body.subarray(a, e + 1)); });
await new Promise((ok) => fsrv.listen(0, '127.0.0.1', ok)); const FILM = `https://127.0.0.1:${fsrv.address().port}/testfilm.webm`;
const page = async (name) => { const ctx = await b.newContext({ viewport: { width: 640, height: 360 }, ignoreHTTPSErrors: true });
  await ctx.addInitScript(() => { try { localStorage.setItem('lumiere.settings.v5', JSON.stringify({ lang: 'en', graphics: 'low', tutorialAsked: true, npcs: 'off' })); } catch (e) {} });
  const p = await ctx.newPage(); p.on('pageerror', (e) => console.log(name, '[pageerror]', e.message)); p.on('console', (m) => { if (m.type() === 'error' || /\[mp\]/.test(m.text())) console.log(name, '[console]', m.text().slice(0, 200)); });
  await p.goto(`http://127.0.0.1:${port}/index.html`); await p.waitForFunction(() => window.__lumiere && window.__lumiere.ready, null, { timeout: 300000 }); return p; };
const badge = (P) => P.evaluate(() => { const e = document.querySelector('#mpBadge span'); return e ? e.textContent : null; });
const waitN = async (P, n, s = 60) => { for (let i = 0; i < s; i++) { const t = await badge(P); if (t && t.endsWith('· ' + n)) return i; await P.waitForTimeout(1000); } return -1; };
const seat = (P, k) => P.evaluate((k) => { const L = window.__lumiere, h = L.world.hallById('CLASSIC'), rows = [...new Set(h.seats.map((s) => s.row))].sort((a, b) => a - b), mr = rows[rows.length >> 1];
  const row = h.seats.filter((q) => q.row === mr).sort((a, b) => a.a - b.a), s = row[(row.length >> 1) + k]; L.player.place(s.x, s.z, s.yaw, 0, s.y); return s.id; }, k);
const clock = (P) => P.evaluate(() => { const L = window.__lumiere, s = L.shows.get('CLASSIC'); return { state: s.state, title: s.src && s.src.title, kind: s.src && s.src.kind, start: Math.round(Date.now() + (s.startAt - performance.now())), at: Date.now(), ct: L.shows.video.currentTime, want: (s.seek || 0) + (performance.now() - s.startAt) / 1000, host: L.together.mp.host }; });
const A = await page('A'), B = await page('B'), C = await page('C'); console.log('A, B, C loaded');
await A.click('#mnTogether'); await A.fill('#mpName', 'Alice'); await A.click('#mpAv button:nth-child(3)'); await A.click('#mpHost'); await A.waitForTimeout(300);
const code = ((await A.textContent('#mpStatus')).match(/[A-Z0-9]{6}/) || [])[0]; console.log('room', code);
await B.click('#mnTogether'); await B.fill('#mpName', 'Bob'); await B.click('#mpAv button:nth-child(10)'); await B.fill('#mpCode', code); await B.click('#mpJoin');
console.log('A+B connected after', await waitN(A, 2), 's /', await waitN(B, 2), 's'); await A.waitForTimeout(2500);
console.log('seats', await seat(A, 0), await seat(B, 1));
// 1) the host books a shared link film 12 s ahead
await A.evaluate((u) => { const L = window.__lumiere; const own = L.shows.loadURL(u, 'Test film'); L.shows.book('CLASSIC', own, 12000, null); L.together.onBooked('CLASSIC'); }, FILM);
await A.waitForTimeout(2500); const a1 = await clock(A), b1 = await clock(B);
console.log('booked: A', JSON.stringify(a1), '\n        B', JSON.stringify(b1), '\n  start difference ms', b1.start - a1.start);
await A.waitForFunction(() => window.__lumiere.shows.get('CLASSIC').state === 'playing', null, { timeout: 90000 }).catch(() => {});
await B.waitForFunction(() => window.__lumiere.shows.get('CLASSIC').state === 'playing', null, { timeout: 90000 }).catch(() => {});
await A.waitForTimeout(4000); const [a2, b2] = await Promise.all([clock(A), clock(B)]);
console.log('playing: A want', a2.want.toFixed(2), 'B want', b2.want.toFixed(2), '| A ct', a2.ct.toFixed(2), 'at', a2.at, '| B ct', b2.ct.toFixed(2), 'at', b2.at, '| drift s', ((b2.ct - (b2.at - a2.at) / 1000) - a2.ct).toFixed(2));
await A.waitForTimeout(8000); const [a5, b5] = await Promise.all([clock(A), clock(B)]); console.log('8 s later: A ct', a5.ct.toFixed(2), 'want', a5.want.toFixed(2), '| B ct', b5.ct.toFixed(2), 'want', b5.want.toFixed(2), '| drift s', ((b5.ct - (b5.at - a5.at) / 1000) - a5.ct).toFixed(2));
await A.screenshot({ path: path.join(OUT, 'A-film.png') }); await B.screenshot({ path: path.join(OUT, 'B-film.png') });
// 2) the host leaves: Bob takes over
await A.evaluate(() => window.__lumiere.together.leave()); await B.waitForTimeout(4000);
const b3 = await clock(B); console.log('after Alice left: B host', b3.host, 'badge', await badge(B));
// 3) a late joiner catches up with the film
await C.click('#mnTogether'); await C.fill('#mpName', 'Cara'); await C.click('#mpAv button:nth-child(6)'); await C.fill('#mpCode', code); await C.click('#mpJoin');
console.log('C connected after', await waitN(C, 2), 's'); await seat(C, -1);
await C.waitForFunction(() => window.__lumiere.shows.get('CLASSIC').state === 'playing', null, { timeout: 90000 }).catch(() => {});
await C.waitForTimeout(8000); const [b4, c4] = await Promise.all([clock(B), clock(C)]);
console.log('late joiner: B want', b4.want.toFixed(2), 'C want', c4.want.toFixed(2), '| B ct', b4.ct.toFixed(2), 'B rate', await B.evaluate(() => window.__lumiere.shows.video.playbackRate), '| C ct', c4.ct.toFixed(2), 'state', c4.state, '| drift s', ((c4.ct - (c4.at - b4.at) / 1000) - b4.ct).toFixed(2));
await C.screenshot({ path: path.join(OUT, 'C-film.png') });
await b.close(); srv.close(); fsrv.close();
