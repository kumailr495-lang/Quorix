// Runs the real app in headless Chromium (SwiftShader software WebGL) and takes posed screenshots.
// usage: node tools/dev/shoot.mjs <www-dir> <out-dir> <shots.json>   shots: { query?, list: [{ name, pose?: [x, z, yawDeg, pitchDeg], eval?: "js", wait? }] }
// NOTE: SwiftShader is a CPU renderer; frame times say nothing about a phone.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
const [,, WWW_ARG, OUT, SHOTS] = process.argv; const WWW = path.resolve(WWW_ARG || 'www'); fs.mkdirSync(OUT, { recursive: true });
const req = createRequire(import.meta.url); let pwPath = process.env.PW_PATH; if (!pwPath) { for (const p of ['/opt/node-tools/node_modules/playwright/index.mjs', '/opt/npm-tools/node_modules/playwright/index.mjs']) if (fs.existsSync(p)) { pwPath = p; break; } }
const { chromium } = await import(pwPath || 'playwright');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.webm': 'video/webm' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(WWW, u === '/' ? 'index.html' : u); if (!f.startsWith(WWW) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise((ok) => srv.listen(0, '127.0.0.1', ok)); const port = srv.address().port;
const spec = SHOTS ? JSON.parse(fs.readFileSync(SHOTS, 'utf8')) : { list: [{ name: 'spawn' }] };
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const VP = (process.env.VIEWPORT || '800x360').split('x').map(Number); const ctx = await b.newContext({ viewport: { width: VP[0], height: VP[1] }, deviceScaleFactor: +(process.env.DPR || 2), hasTouch: true, isMobile: true });
const p = await ctx.newPage(); const log = []; p.on('console', (m) => log.push(`[${m.type()}] ${m.text()}`)); p.on('pageerror', (e) => log.push(`[pageerror] ${e.message}`));
const t0 = Date.now(); await p.goto(`http://127.0.0.1:${port}/index.html${spec.query || ''}`);
try { await p.waitForFunction(() => window.__lumiere && window.__lumiere.ready, null, { timeout: 180000 }); } catch (e) { console.log('BOOT TIMEOUT'); console.log(log.slice(-30).join('\n')); await b.close(); srv.close(); process.exit(1); }
console.log('boot ms', Date.now() - t0, await p.evaluate(() => JSON.stringify({ build: Math.round(window.__lumiere.buildMs || 0), depth: window.__lumiere.engine.depthBits })));
for (const s of spec.list) {
  if (s.eval) { try { await p.evaluate(s.eval); } catch (e) { console.log('eval error', s.name, e.message); } }
  if (s.pose) await p.evaluate((ps) => { const L = window.__lumiere, P = L.player; P.place(ps[0], ps[1], (ps[2] || 0) * Math.PI / 180, (ps[3] || 0) * Math.PI / 180); }, s.pose);
  await p.waitForTimeout(s.wait || 1200);
  const info = await p.evaluate(() => { const L = window.__lumiere, r = L.engine.renderer.info; return { calls: r.render.calls, tris: r.render.triangles, progs: (r.programs || []).length, room: L.world.roomAt(L.player.x, L.player.z), vis: [...L.world.vis].join(','), pos: [+L.player.x.toFixed(2), +L.player.z.toFixed(2), +L.player.y.toFixed(2)] }; });
  await p.screenshot({ path: path.join(OUT, s.name + '.jpg'), type: 'jpeg', quality: 82 });
  console.log(s.name.padEnd(20), JSON.stringify(info));
}
const errs = log.filter((l) => /error|warn|Error|fail/i.test(l)); console.log('console lines', log.length, '| errors/warnings', errs.length); for (const l of errs.slice(0, 30)) console.log('  ', l.slice(0, 400));
fs.writeFileSync(path.join(OUT, 'console.txt'), log.join('\n')); await b.close(); srv.close();
