// LUMIERE v10 - the hero views (tools/dev/views.mjs) as the player sees them: the game camera, full lighting, 16:9, HUD hidden.
// Headless Chromium + SwiftShader: the real engine on a software GPU, not the phone.
// usage: node tools/dev/views.mjs > views.json; node tools/dev/hero.mjs OUT views.json [name,name...] [--size 1280x720] [--gfx high]
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const OUT = process.argv[2] || 'hero', VIEWS = JSON.parse(fs.readFileSync(process.argv[3], 'utf8')), only = (process.argv[4] && !process.argv[4].startsWith('--')) ? process.argv[4].split(',') : null;
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; }; const [W, H] = arg('size', '1280x720').split('x').map(Number), GFX = arg('gfx', 'high');
fs.mkdirSync(OUT, { recursive: true }); const WWW = path.resolve('www');
let pwPath = process.env.PW_PATH; if (!pwPath) for (const p of ['/opt/node-tools/node_modules/playwright/index.mjs', '/opt/npm-tools/node_modules/playwright/index.mjs']) if (fs.existsSync(p)) { pwPath = p; break; }
const { chromium } = await import(pwPath || 'playwright');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.ogg': 'audio/ogg', '.opus': 'audio/ogg', '.webp': 'image/webp' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(WWW, u === '/' ? 'index.html' : u); if (!f.startsWith(WWW) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise((ok) => srv.listen(0, '127.0.0.1', ok)); const port = srv.address().port;
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H } });
await ctx.addInitScript((g) => { try { localStorage.setItem('lumiere.settings.v5', JSON.stringify({ lang: 'en', graphics: g, tutorialAsked: true, npcs: 'medium' })); } catch (e) {} }, GFX);
const p = await ctx.newPage(); const log = []; p.on('pageerror', (e) => log.push(`[pageerror] ${e.message}`)); p.on('console', (m) => { if (m.type() === 'error' || /stale|warn/i.test(m.text())) log.push(`[${m.type()}] ${m.text().slice(0, 160)}`); });
await p.goto(`http://127.0.0.1:${port}/index.html?play=quick&fixscale=1`); await p.waitForFunction(() => window.__lumiere && window.__lumiere.ready && window.__lumiere.mode === 'play', null, { timeout: 300000 });
await p.addStyleTag({ content: '#hud,#bShow,#mpBadge,#mpBar,#toast,#coach{display:none!important}' }); await p.waitForTimeout(6000);
for (const v of VIEWS) { if (only && !only.includes(v.name)) continue;
  await p.evaluate((v) => { const L = window.__lumiere; L.player.x = v.x; L.player.z = v.z; L.pose([v.x, v.eye != null ? v.eye : v.y + 1.62, v.z, v.yaw || 0, v.pitch || 0]); if (v.fov) { L.engine.baseFov = v.fov; L.engine.camera.fov = v.fov; L.engine.camera.updateProjectionMatrix(); } }, v);
  await p.waitForTimeout(2600); await p.screenshot({ path: path.join(OUT, `${v.name}.png`) }); }
console.log('hero views', fs.readdirSync(OUT).filter((f) => f.endsWith('.png')).length); if (log.length) console.log([...new Set(log)].slice(0, 8).join('\n'));
await b.close(); srv.close();
