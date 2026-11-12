// LUMIERE v10 - the game's screens as a phone shows them (the itel P65: 1612 x 720 px at about 2x, so 806 x 360 CSS px): the menu,
// settings tabs, the HUD, booking steps, the pause menu, the tablet, a conversation. Headless Chromium + SwiftShader, not the phone.
// usage: node tools/dev/uishots.mjs OUT [--size 806x360] [--scale 2]
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const OUT = process.argv[2] || 'uishots'; fs.mkdirSync(OUT, { recursive: true }); const WWW = path.resolve('www');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; }; const [W, H] = arg('size', '806x360').split('x').map(Number), DPR = +arg('scale', '2');
let pwPath = process.env.PW_PATH; if (!pwPath) for (const p of ['/opt/node-tools/node_modules/playwright/index.mjs', '/opt/npm-tools/node_modules/playwright/index.mjs']) if (fs.existsSync(p)) { pwPath = p; break; }
const { chromium } = await import(pwPath || 'playwright');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.ogg': 'audio/ogg', '.opus': 'audio/ogg', '.webp': 'image/webp' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(WWW, u === '/' ? 'index.html' : u); if (!f.startsWith(WWW) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise((ok) => srv.listen(0, '127.0.0.1', ok)); const port = srv.address().port;
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DPR, hasTouch: true, isMobile: true });
await ctx.addInitScript(() => { try { localStorage.setItem('lumiere.settings.v5', JSON.stringify({ lang: 'en', graphics: 'low', tutorialAsked: true, npcs: 'medium' })); } catch (e) {} });
const p = await ctx.newPage(); const log = []; p.on('pageerror', (e) => log.push(`[pageerror] ${e.message}`));
const shot = async (n) => { await p.waitForTimeout(700); await p.screenshot({ path: path.join(OUT, n + '.png') }); console.log('shot', n); };
await p.goto(`http://127.0.0.1:${port}/index.html`); await p.waitForFunction(() => window.__lumiere && window.__lumiere.ready, null, { timeout: 300000 }); await p.waitForTimeout(3000);
await shot('01-menu');
await p.evaluate(() => window.__lumiere.ui.openSettings()); await shot('02-settings');
const tabs = await p.evaluate(() => [...document.querySelectorAll('#settings [data-tab]')].map((e) => e.dataset.tab));
for (const t of [...new Set(tabs)].slice(1)) { await p.evaluate((t) => document.querySelector(`#settings [data-tab="${t}"]`).click(), t); await shot('02-settings-' + t); }
await p.evaluate(() => { const L = window.__lumiere; L.ui.closeModal ? L.ui.closeModal('#settings') : (document.querySelector('#settings').hidden = true); });
await p.evaluate(() => document.querySelector('#mnQuick').click()); await p.waitForFunction(() => window.__lumiere.mode === 'play', null, { timeout: 120000 }); await p.waitForTimeout(4000);
await shot('03-hud');
await p.evaluate(() => { const L = window.__lumiere; L.player.place(-17.6, -11.4, Math.PI / 2, 0, 0); }); await p.waitForTimeout(2500); await shot('04-cafe-prompt');
await p.evaluate(async () => { const L = window.__lumiere, D = await import('/js/dialogue9.js'), npc = L.crowd.staff.cafe; if (npc) L.talk.start(npc, D.treeFor(npc, {})); }); await shot('05-talk-barista');
await p.evaluate(() => { const L = window.__lumiere; L.talk.close && L.talk.close(); }); await p.waitForTimeout(400);
await p.evaluate(() => window.__lumiere.booking.open({ quick: true })); await shot('06-book1');
for (let i = 2; i <= 4; i++) { const ok = await p.evaluate(() => { const n = document.querySelector('#bkNext'); if (!n || n.disabled) { const c = document.querySelector('#booking .card, #booking [data-pick], #booking button.pick'); if (c) c.click(); } const m = document.querySelector('#bkNext'); if (m && !m.disabled) { m.click(); return true; } return false; }); await shot('06-book' + i + (ok ? '' : '-stuck')); }
await p.evaluate(() => { const L = window.__lumiere; L.booking.close && L.booking.close(); document.querySelectorAll('.scrim').forEach((e) => { e.hidden = true; }); });
await p.evaluate(() => window.__lumiere.tablet.open('remote')); await shot('07-tablet');
await p.evaluate(() => { const L = window.__lumiere; L.tablet.close && L.tablet.close(); });
await p.keyboard.press('KeyP'); await shot('08-pause');
console.log(log.slice(0, 6).join('\n')); await b.close(); srv.close();
