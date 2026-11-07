// LUMIERE v10 - the inputs (input.js), headless (the real engine on a software GPU, not a phone): keyboard walks, a controller (a fake
// standard gamepad injected into navigator.getGamepads) walks and turns and the HUD switches to it, phone VR draws two eyes, a touch
// switches back to touch. usage: node tools/dev/inputcheck.mjs OUT
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const OUT = process.argv[2] || 'inputcheck'; fs.mkdirSync(OUT, { recursive: true }); const WWW = path.resolve('www');
let pwPath = process.env.PW_PATH; if (!pwPath) for (const p of ['/opt/node-tools/node_modules/playwright/index.mjs', '/opt/npm-tools/node_modules/playwright/index.mjs']) if (fs.existsSync(p)) { pwPath = p; break; }
const { chromium } = await import(pwPath || 'playwright');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.ogg': 'audio/ogg', '.opus': 'audio/ogg', '.webp': 'image/webp' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(WWW, u === '/' ? 'index.html' : u); if (!f.startsWith(WWW) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise((ok) => srv.listen(0, '127.0.0.1', ok)); const port = srv.address().port;
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 960, height: 540 } });
await ctx.addInitScript(() => { try { localStorage.setItem('lumiere.settings.v5', JSON.stringify({ lang: 'en', graphics: 'low', tutorialAsked: true, npcs: 'off' })); } catch (e) {}
  window.__pad = null; navigator.getGamepads = () => [window.__pad]; });
const p = await ctx.newPage(); const log = []; p.on('pageerror', (e) => log.push(`[pageerror] ${e.message}`));
await p.goto(`http://127.0.0.1:${port}/index.html?play=quick`); await p.waitForFunction(() => window.__lumiere && window.__lumiere.ready && window.__lumiere.mode === 'play', null, { timeout: 300000 });
await p.waitForTimeout(2500); const res = []; const ok = (k, v, why) => res.push([k, !!v, why]);
const pos = () => p.evaluate(() => { const P = window.__lumiere.player; return { x: P.x, z: P.z, yaw: P.yaw, mode: document.body.dataset.input }; });
// keyboard
const k0 = await pos(); await p.keyboard.down('KeyW'); await p.waitForTimeout(1500); await p.keyboard.up('KeyW'); const k1 = await pos();
ok('keyboard: W walks, mode kbm', Math.hypot(k1.x - k0.x, k1.z - k0.z) > 0.5 && k1.mode === 'kbm', `moved ${Math.hypot(k1.x - k0.x, k1.z - k0.z).toFixed(2)} m, mode ${k1.mode}`);
// controller: left stick forward, right stick right
await p.evaluate(() => { window.__pad = { index: 0, connected: true, mapping: 'standard', axes: [0, -1, 0.9, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) }; });
const g0 = await pos(); await p.waitForTimeout(1500); const g1 = await pos(); await p.evaluate(() => { window.__pad.axes = [0, 0, 0, 0]; });
ok('controller: walks and turns, mode pad', Math.hypot(g1.x - g0.x, g1.z - g0.z) > 0.5 && Math.abs(g1.yaw - g0.yaw) > 0.3 && g1.mode === 'pad', `moved ${Math.hypot(g1.x - g0.x, g1.z - g0.z).toFixed(2)} m, turned ${(g1.yaw - g0.yaw).toFixed(2)} rad, mode ${g1.mode}`);
const stickShown = await p.evaluate(() => getComputedStyle(document.querySelector('#stick')).display); ok('controller: the touch stick is hidden', stickShown === 'none', `#stick display ${stickShown}`);
// controller in a menu: Start opens the pause menu, the d-pad moves focus, B closes it
const press = async (i) => { await p.evaluate((i) => { window.__pad.buttons[i] = { pressed: true, value: 1 }; }, i); await p.waitForTimeout(250); await p.evaluate((i) => { window.__pad.buttons[i] = { pressed: false, value: 0 }; }, i); await p.waitForTimeout(250); };
await press(9); const paused = await p.evaluate(() => !document.querySelector('#pause').hidden); await press(13); const focus = await p.evaluate(() => document.activeElement && document.activeElement.tagName);
await press(1); await p.waitForTimeout(500); const closed = await p.evaluate(() => document.querySelector('#pause').hidden);
ok('controller: Start opens pause, d-pad focuses, B closes', paused && focus === 'BUTTON' && closed, `opened ${paused}, focus ${focus}, closed ${closed}`);
// phone VR
await p.evaluate(() => { window.dispatchEvent(Object.assign(new Event('deviceorientation'), { alpha: 10, beta: 90, gamma: 0 })); window.__lumiere.settings.vr = true; window.__lumiere.input && window.__lumiere.input.setVR(true); });
await p.waitForTimeout(1500); await p.screenshot({ path: path.join(OUT, 'vr.png') }); const vr = await p.evaluate(() => ({ stereo: !!window.__lumiere.engine.stereo, cls: document.body.classList.contains('vr') }));
ok('phone VR: two eyes', vr.stereo && vr.cls, JSON.stringify(vr)); await p.evaluate(() => window.__lumiere.input && window.__lumiere.input.setVR(false));
// touch again
await p.dispatchEvent('canvas', 'pointerdown', { pointerType: 'touch', clientX: 600, clientY: 200, pointerId: 7, isPrimary: true }); const t1 = await pos();
ok('a touch switches back to touch', t1.mode === 'touch', `mode ${t1.mode}`);
let fails = 0; for (const [k, v, why] of res) { console.log(`${v ? 'PASS' : 'FAIL'}  ${k}  (${why})`); if (!v) fails++; }
if (log.length) console.log(log.slice(0, 5).join('\n')); await b.close(); srv.close(); process.exit(fails ? 1 : 0);
