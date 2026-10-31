// Light-map pipeline, step 1: export rooms from the real game (headless Chromium) for Blender. See tools/bake/README.md.
// usage: node tools/bake/export.mjs [room ...]     -> tools/bake/.work/<room>.json
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..'), WWW = path.join(ROOT, 'www'), WORK = path.join(ROOT, 'tools/bake/.work');
let pwPath = process.env.PW_PATH; if (!pwPath) { for (const p of ['/opt/node-tools/node_modules/playwright/index.mjs', '/opt/npm-tools/node_modules/playwright/index.mjs']) if (fs.existsSync(p)) { pwPath = p; break; } }
const { chromium } = await import(pwPath || 'playwright');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.glb': 'model/gltf-binary' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(WWW, u === '/' ? 'index.html' : u); if (!f.startsWith(WWW) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 400, height: 240 } }); await ctx.addInitScript(() => { try { localStorage.setItem('lumiere.settings.v5', JSON.stringify({ lang: 'en', graphics: 'medium' })); } catch (e) {} });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto(`http://127.0.0.1:${srv.address().port}/index.html?bakeExport=1&nobake=1`);
await p.waitForFunction(() => window.__lumiere && window.__lumiere.bakeReady, null, { timeout: 180000 });
const keys = process.argv.slice(2).length ? process.argv.slice(2) : await p.evaluate(() => Object.keys(window.__lumiere.world.rooms));
fs.mkdirSync(WORK, { recursive: true });
for (const k of keys) { const json = await p.evaluate((k) => JSON.stringify(window.__lumiere.exportRoom(k)), k); fs.writeFileSync(path.join(WORK, k + '.json'), json); console.log(k.padEnd(8), (json.length / 1e6).toFixed(1) + ' MB'); }
if (errs.length) console.log('page errors:', errs.slice(0, 5));
await b.close(); srv.close();
