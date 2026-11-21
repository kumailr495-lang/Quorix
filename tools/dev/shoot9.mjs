// Renders the v9 world in headless Chromium (SwiftShader: a CPU renderer, not the phone's GPU) from posed cameras.
// usage: node tools/dev/shoot9.mjs <out-dir> <shots.json>   shots: { page?: 'index.html', query?, list: [{ name, cam: [x, y, z, yawDeg, pitchDeg], eval?, wait? }] }
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const [,, OUT, SHOTS] = process.argv; const WWW = path.resolve('www'); fs.mkdirSync(OUT, { recursive: true });
let pwPath = process.env.PW_PATH; if (!pwPath) for (const p of ['/opt/node-tools/node_modules/playwright/index.mjs', '/opt/npm-tools/node_modules/playwright/index.mjs']) if (fs.existsSync(p)) { pwPath = p; break; }
const { chromium } = await import(pwPath || 'playwright');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.webp': 'image/webp', '.opus': 'audio/ogg', '.css': 'text/css', '.woff2': 'font/woff2', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.ogg': 'audio/ogg', '.mp4': 'video/mp4', '.webm': 'video/webm', '.bin': 'application/octet-stream' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(WWW, u === '/' ? 'index.html' : u); if (!f.startsWith(WWW) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise((ok) => srv.listen(0, '127.0.0.1', ok)); const port = srv.address().port;
const spec = JSON.parse(fs.readFileSync(SHOTS, 'utf8'));
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const VP = (process.env.VIEWPORT || '960x432').split('x').map(Number); const ctx = await b.newContext({ viewport: { width: VP[0], height: VP[1] }, deviceScaleFactor: +(process.env.DPR || 1) });
await ctx.addInitScript((extra) => { try { localStorage.setItem('lumiere.settings.v5', JSON.stringify({ lang: 'en', graphics: 'medium', tutorialAsked: true, ...JSON.parse(localStorage.getItem('lumiere.settings.v5') || '{}'), ...extra })); } catch (e) {} }, spec.settings || {});
const p = await ctx.newPage(); const log = []; p.on('console', (m) => log.push(`[${m.type()}] ${m.text()}`)); p.on('pageerror', (e) => log.push(`[pageerror] ${e.message}`));
const t0 = Date.now(); await p.goto(`http://127.0.0.1:${port}/${spec.page || 'index.html'}${spec.query || ''}`);
try { await p.waitForFunction(() => window.__lumiere && window.__lumiere.ready, null, { timeout: 240000 }); } catch (e) { console.log('BOOT TIMEOUT'); console.log(log.slice(-40).join('\n')); await b.close(); srv.close(); process.exit(1); }
console.log('boot ms', Date.now() - t0, 'build ms', await p.evaluate(() => Math.round(window.__lumiere.buildMs)));
for (const s of spec.list) {
  if (s.eval) { try { const r = await p.evaluate(s.eval); if (r !== undefined && r !== null) console.log('eval', s.name, JSON.stringify(r).slice(0, 3000)); } catch (e) { console.log('eval error', s.name, e.message); } }
  if (s.cam) await p.evaluate((c) => window.__lumiere.pose([c[0], c[1], c[2], (c[3] || 0) * Math.PI / 180, (c[4] || 0) * Math.PI / 180]), s.cam);
  await p.waitForTimeout(s.wait || 900);
  const info = await p.evaluate(() => { const L = window.__lumiere, r = L.engine.renderer.info; return { calls: r.render.calls, tris: r.render.triangles, vis: [...L.world.vis].join(',') }; });
  await p.screenshot({ path: path.join(OUT, s.name + '.jpg'), type: 'jpeg', quality: 84 });
  console.log(s.name.padEnd(18), JSON.stringify(info));
}
const errs = log.filter((l) => /error|warn|fail/i.test(l)); console.log('console', log.length, 'errors/warnings', errs.length); for (const l of errs.slice(0, 40)) console.log('  ', l.slice(0, 300));
await b.close(); srv.close();
