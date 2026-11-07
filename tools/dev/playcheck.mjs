// LUMIERE v10 - film playback checks after the user's report (glitchy borders, stutter, sound delay, picture freezing after Continue).
// Headless Chromium + SwiftShader: the real engine on a software GPU, not the phone. A generated test film with sound (a tone that beeps
// once a second over a test pattern with a hard cut every 4 s) is booked as your own video in a hall; then:
//   1. the film plays its own sound (direct output, in step with its picture), unmuted, and the audience's level tap hears the beeps;
//   2. pause for 3 s, Continue: new picture frames arrive within 0.6 s and the clock moves on from where it stopped (no seek back);
//   3. while it plays the canvas is never resized (a resize is a visible hitch);
//   4. the open curtains are put away (nothing hangs over the picture's edges).
// usage: node tools/dev/playcheck.mjs OUT [HALL=CURVE]
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
const OUT = process.argv[2] || 'playcheck', HALL = process.argv[3] || 'CURVE'; fs.mkdirSync(OUT, { recursive: true });
const WWW = path.resolve('www'), VID = path.join(OUT, 'beeps.webm');
if (!fs.existsSync(VID)) execFileSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'testsrc2=s=1280x536:r=24', '-f', 'lavfi', '-i', "sine=f=440:r=48000,volume='if(lt(mod(t,1),0.2),1,0)':eval=frame",
  '-filter_complex', "[0:v]hue=h='floor(t/4)*90'[v]", '-map', '[v]', '-map', '1:a', '-t', '40', '-c:v', 'libvpx', '-b:v', '1500k', '-g', '240', '-c:a', 'libopus', '-b:a', '96k', VID]);
let pwPath = process.env.PW_PATH; if (!pwPath) for (const p of ['/opt/node-tools/node_modules/playwright/index.mjs', '/opt/npm-tools/node_modules/playwright/index.mjs']) if (fs.existsSync(p)) { pwPath = p; break; }
const { chromium } = await import(pwPath || 'playwright');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.ogg': 'audio/ogg', '.opus': 'audio/ogg', '.webp': 'image/webp', '.webm': 'video/webm' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = u === '/beeps.webm' ? VID : path.join(WWW, u === '/' ? 'index.html' : u);
  if ((f !== VID && !f.startsWith(WWW)) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; }
  const st = fs.statSync(f), m = /bytes=(\d+)-(\d*)/.exec(q.headers.range || ''), type = MIME[path.extname(f)] || 'application/octet-stream';
  if (m) { const a = +m[1], b = m[2] ? +m[2] : st.size - 1; r.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${a}-${b}/${st.size}`, 'Accept-Ranges': 'bytes', 'Content-Length': b - a + 1 }); fs.createReadStream(f, { start: a, end: b }).pipe(r); return; }
  r.writeHead(200, { 'Content-Type': type, 'Content-Length': st.size, 'Accept-Ranges': 'bytes' }); fs.createReadStream(f).pipe(r); });
await new Promise((ok) => srv.listen(0, '127.0.0.1', ok)); const port = srv.address().port;
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: 960, height: 540 } });
await ctx.addInitScript(() => { try { localStorage.setItem('lumiere.settings.v5', JSON.stringify({ lang: 'en', graphics: 'medium', tutorialAsked: true, npcs: 'off' })); } catch (e) {} });
const p = await ctx.newPage(); const log = []; p.on('pageerror', (e) => log.push(`[pageerror] ${e.message}`)); p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') log.push(`[${m.type()}] ${m.text().slice(0, 200)}`); });
await p.goto(`http://127.0.0.1:${port}/index.html?play=quick`);
await p.waitForFunction(() => window.__lumiere && window.__lumiere.ready && window.__lumiere.mode === 'play', null, { timeout: 300000 });
await p.mouse.click(480, 300);   // a tap opens the phone's audio, as on the phone
await p.evaluate((hid) => { const L = window.__lumiere, h = L.world.hallById(hid), seats = h.seats, rows = [...new Set(seats.map((s) => s.row))].sort((a, b) => a - b), mr = rows[rows.length >> 1];
  const s = seats.filter((q) => q.row === mr).reduce((a, q) => (Math.abs(q.a) < Math.abs(a.a) ? q : a)); L.player.placeSeated({ x: s.x, y: s.y + 1.05, z: s.z, yaw: s.yaw, pitch: 0.12 }, { x: s.x, z: s.z });
  const own = L.shows.loadLocal('/beeps.webm', 'Beeps'); L.shows.book(hid, own, 0, s.id, { replay: true });
  const E = L.engine, r0 = E.resize.bind(E); window.__resizes = 0; E.resize = (...a) => { if (window.__watch) window.__resizes++; return r0(...a); }; }, HALL);
await p.waitForFunction((hid) => { const s = window.__lumiere.shows.get(hid); return s && s.state === 'playing' && s.pic; }, HALL, { timeout: 120000 });
await p.waitForTimeout(3000); await p.evaluate(() => { window.__watch = true; });   // counted once seated show mode has settled
const res = {}; const ok = (k, v, why) => { res[k] = { pass: !!v, why }; };
// 1. sound: direct output, unmuted, the tap hears the beeps
await p.waitForTimeout(3000);
const snd = await p.evaluate(async () => { const L = window.__lumiere, v = L.shows.video, S = L.sound, lv = []; for (let i = 0; i < 25; i++) { lv.push(S.level()); await new Promise((r) => setTimeout(r, 80)); }
  return { direct: !!(S.film && S.film.direct), routed: !!S.videoSrc, muted: v.muted, vol: +v.volume.toFixed(2), lvMin: Math.min(...lv.filter(Number.isFinite)), lvMax: Math.max(...lv.filter(Number.isFinite)), ctx: S.ctx && S.ctx.state }; });
ok('sound direct (in step with the picture)', snd.direct && !snd.routed && !snd.muted, JSON.stringify(snd));
ok('audience hears the film (level tap)', Number.isFinite(snd.lvMax) && snd.lvMax - snd.lvMin > 10, `level range ${snd.lvMin.toFixed(1)}..${snd.lvMax.toFixed(1)} dB`);
// 2. pause 3 s, Continue
const pr = await p.evaluate(async () => { const L = window.__lumiere, v = L.shows.video; L.shows.pause(true); const t0 = v.currentTime; await new Promise((r) => setTimeout(r, 3000)); const t1 = v.currentTime;
  let frames = 0, first = null; const t = performance.now(); const cb = () => { frames++; if (first == null) first = performance.now() - t; if (frames < 30) v.requestVideoFrameCallback(cb); }; v.requestVideoFrameCallback(cb);
  L.shows.pause(false); await new Promise((r) => setTimeout(r, 1500)); return { t0: +t0.toFixed(2), t1: +t1.toFixed(2), after: +v.currentTime.toFixed(2), frames, firstMs: first && Math.round(first), paused: v.paused }; });
ok('paused clock held still', Math.abs(pr.t1 - pr.t0) < 0.05, JSON.stringify(pr));
ok('Continue: new frames within 0.6 s, no seek back', pr.firstMs != null && pr.firstMs < 600 && pr.after >= pr.t1 && !pr.paused, `first frame ${pr.firstMs} ms, ${pr.frames} frames in 1.5 s, clock ${pr.t1} -> ${pr.after}`);
// 3. no resize while the film plays (12 s window)
await p.waitForTimeout(12000);
const rs = await p.evaluate(() => window.__resizes); ok('no canvas resize during the film', rs === 0, `${rs} resizes in ~19 s of film`);
// 4. curtains away
const cu = await p.evaluate((hid) => { const h = window.__lumiere.world.hallById(hid); return h.curtains ? h.curtains.meshes.map((m) => m.visible) : 'no curtains'; }, HALL);
ok('open curtains put away', cu === 'no curtains' || cu.every((v) => !v), JSON.stringify(cu));
await p.screenshot({ path: path.join(OUT, `${HALL}-playing.png`) });
let fails = 0; for (const [k, v] of Object.entries(res)) { console.log(`${v.pass ? 'PASS' : 'FAIL'}  ${k}  (${v.why})`); if (!v.pass) fails++; }
if (log.length) console.log(log.slice(0, 6).join('\n'));
await b.close(); srv.close(); process.exit(fails ? 1 : 0);
