// LUMIERE v10 - playing together, the user's 2026-11-07 asks, tested with two headless Chromium pages through the real public relays
// (the real engine on a software GPU, not phones): only the host controls the film and the host's pause and play reach the guest in
// step; chat arrives quietly (a log line and a dot, no pop-up); names can be hidden; the host hands the role over; one server, a queue.
// usage: node tools/dev/mp-features.mjs OUT     (needs ffmpeg and openssl; about 6 minutes)
import http from 'node:http'; import https from 'node:https'; import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true }); const WWW = path.resolve('www'); const VID = path.join(OUT, 'testfilm.webm');
if (!fs.existsSync(VID)) execFileSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'testsrc2=s=640x360:r=24', '-t', '120', '-c:v', 'libvpx', '-b:v', '600k', '-an', VID]);
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

// ---- two phones: A hosts, B joins
const A = await page('A'), B = await page('B'); console.log('A, B loaded');
await A.mouse.click(320, 180); await B.mouse.click(320, 180);   // a tap opens each phone's audio, as on the phone
await A.click('#mnTogether'); await A.fill('#mpName', 'Alice'); await A.click('#mpHost'); await A.waitForTimeout(300);
const code = ((await A.textContent('#mpStatus')).match(/[A-Z0-9]{6}/) || [])[0];
await B.click('#mnTogether'); await B.fill('#mpName', 'Bob'); await B.fill('#mpCode', code); await B.click('#mpJoin');
console.log('connected', await waitN(A, 2), await waitN(B, 2)); await A.waitForTimeout(2500); await seat(A, 0); await seat(B, 1);
const res = []; const ok = (k, v, why) => { res.push([k, !!v, why]); };
await A.evaluate((u) => { const L = window.__lumiere; const own = L.shows.loadURL(u, 'Test film'); L.shows.book('CLASSIC', own, 12000, null); L.together.onBooked('CLASSIC'); }, FILM);
for (const P of [A, B]) await P.waitForFunction(() => window.__lumiere.shows.get('CLASSIC').state === 'playing', null, { timeout: 90000 }).catch(() => {});
await A.waitForTimeout(4000);
const st = (P) => P.evaluate(() => { const v = window.__lumiere.shows.video; return { ct: v.currentTime, paused: v.paused, at: Date.now(), host: window.__lumiere.together.mp.host }; });
// guest control is refused
const gc = await B.evaluate(() => window.__lumiere.shows.control('pause')); const b0 = await st(B);
ok('a guest cannot control the film', gc === false && !b0.paused, `control returned ${gc}, paused ${b0.paused}`);
// host pauses: the guest pauses at the same frame
await A.evaluate(() => window.__lumiere.shows.control('pause')); await B.waitForTimeout(2500); const [a1, b1] = await Promise.all([st(A), st(B)]);
ok('host pause reaches the guest', a1.paused && b1.paused && Math.abs(a1.ct - b1.ct) < 0.3, `A ${a1.ct.toFixed(2)} paused ${a1.paused} | B ${b1.ct.toFixed(2)} paused ${b1.paused}`);
// host plays: both run together again
await A.evaluate(() => window.__lumiere.shows.control('play')); await B.waitForTimeout(6000); const [a2, b2] = await Promise.all([st(A), st(B)]);
const drift = (b2.ct - (b2.at - a2.at) / 1000) - a2.ct; ok('host play: guest resumes in step', !a2.paused && !b2.paused && Math.abs(drift) < 0.3, `drift ${drift.toFixed(2)} s`);
// chat: no pop-up, a log line and an unread dot
const toast0 = await A.textContent('#toastText'); await B.evaluate(() => window.__lumiere.together.mp.chat('hello from Bob'));
await A.waitForTimeout(2000); const ch = await A.evaluate(() => { const T = window.__lumiere.together; return { log: T.log.map((m) => m.text), unread: T.unread, dot: T.chatB && T.chatB.classList.contains('unread') }; });
const toast1 = await A.textContent('#toastText');
ok('chat arrives quietly (log + dot, no pop-up)', ch.log.includes('hello from Bob') && ch.unread === 1 && ch.dot && toast1 === toast0, JSON.stringify({ ...ch, toastChanged: toast1 !== toast0 }));
// names off
await A.evaluate(() => { const L = window.__lumiere; L.settings.mpNames = false; }); await A.waitForTimeout(800);
const tags = await A.evaluate(() => [...document.querySelectorAll('#mpTags b')].map((b) => b.style.display)); ok('names can be hidden', tags.length && tags.every((d) => d === 'none'), JSON.stringify(tags));
// host transfer: B becomes host and controls the film for both
const peerB = await A.evaluate(() => [...window.__lumiere.together.mp.peers.keys()][0]);
await A.evaluate((id) => window.__lumiere.together.mp.giveHost(id), peerB); await B.waitForTimeout(3000);
const [a3, b3] = await Promise.all([st(A), st(B)]); ok('host role handed over', !a3.host && b3.host, `A host ${a3.host}, B host ${b3.host}`);
const ac = await A.evaluate(() => window.__lumiere.shows.control('pause')); ok('the old host is now a guest', ac === false, `control returned ${ac}`);
await B.evaluate(() => window.__lumiere.shows.control('pause')); await A.waitForTimeout(2500); const [a4, b4] = await Promise.all([st(A), st(B)]);
ok('new host pause reaches the old host', a4.paused && b4.paused, `A paused ${a4.paused}, B paused ${b4.paused}`);
// one server: a second seat calling while he is out is queued
const q = await A.evaluate(() => { const L = window.__lumiere, h = L.world.hallById('CLASSIC'), s1 = h.seats[10], s2 = h.seats[30]; const r1 = L.crowd.callServer(s1, () => {}), r2 = L.crowd.callServer(s2, () => {}); return { r1, r2, q: (L.crowd.srvQ || []).length }; });
ok('one server: the next caller is queued', q.r1 === true && q.r2 === 'queued' && q.q === 1, JSON.stringify(q));
let fails = 0; for (const [k, v, why] of res) { console.log(`${v ? 'PASS' : 'FAIL'}  ${k}  (${why})`); if (!v) fails++; }
await b.close(); srv.close(); fsrv.close(); process.exit(fails ? 1 : 0);
