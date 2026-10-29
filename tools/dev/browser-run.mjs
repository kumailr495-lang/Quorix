// Runs the real app in headless Chromium (SwiftShader WebGL) and takes screenshots from scripted camera positions.
// usage: node tools/dev/browser-run.mjs <www-dir> <out-dir> [shots.json]   (needs playwright + a chromium build)
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const [,, WWW_ARG, OUT, SHOTS] = process.argv; const WWW = path.resolve(WWW_ARG || 'www');   // absolute, so the path guard below also works for relative arguments
 fs.mkdirSync(OUT, { recursive: true });
const PW = process.env.PW_PATH || '/opt/npm-tools/node_modules/playwright/index.mjs'; const { chromium } = await import(PW);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary', '.woff2': 'font/woff2', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.webm': 'video/webm' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(WWW, u === '/' ? 'index.html' : u); if (!f.startsWith(path.resolve(WWW)) || !fs.existsSync(f)) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise((ok) => srv.listen(0, '127.0.0.1', ok)); const port = srv.address().port;
const shots = SHOTS ? JSON.parse(fs.readFileSync(SHOTS, 'utf8')) : [{ name: 'spawn', wait: 1500 }];
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const VP = (process.env.VIEWPORT || '800x360').split('x').map(Number); const ctx = await b.newContext({ viewport: { width: VP[0], height: VP[1] }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const p = await ctx.newPage(); const log = []; p.on('console', (m) => log.push(`[${m.type()}] ${m.text()}`)); p.on('pageerror', (e) => log.push(`[pageerror] ${e.message}`));
const t0 = Date.now(); await p.goto(`http://127.0.0.1:${port}/index.html${shots.query || ''}`); await p.waitForFunction(() => window.__lumiere && document.querySelector('#hud') && !document.querySelector('#hud').hidden, null, { timeout: 120000 });
console.log('boot ms', Date.now() - t0);
for (const s of (shots.list || shots)) {
  if (s.eval) await p.evaluate(s.eval);
  if (s.pose) await p.evaluate((ps) => { const L = window.__lumiere, P = L.player; if (P.seated) P.standUp(); P.x = ps[0]; P.z = ps[1]; P.yaw = (ps[2] || 0) * Math.PI / 180; P.pitch = (ps[3] || 0) * Math.PI / 180; P.y = L.world.floorY(P.x, P.z); P.vx = P.vz = 0; }, s.pose);
  await p.waitForTimeout(s.wait || 1200);
  const info = await p.evaluate(() => { const L = window.__lumiere, r = L.engine.renderer.info; return { ms: +L.engine.stats.ms.toFixed(1), calls: r.render.calls, tris: r.render.triangles, progs: (r.programs || []).length, guests: L.crowd.all.length, room: L.world.roomAt(L.player.x, L.player.z), pos: [+L.player.x.toFixed(2), +L.player.z.toFixed(2), +L.player.y.toFixed(2)], seated: !!L.player.seated, prompt: document.querySelector('#prompt').hidden ? '' : document.querySelector('#prompt').textContent, shows: Object.values(L.shows.s).map((s) => s.id + ':' + s.state).join(' ') }; });
  await p.screenshot({ path: path.join(OUT, s.name + '.jpg'), type: 'jpeg', quality: 80 });
  console.log(s.name.padEnd(18), JSON.stringify(info));
}
const errs = log.filter((l) => /error|warn|Error/.test(l)); console.log('console lines', log.length, '| errors/warnings', errs.length); for (const l of errs.slice(0, 25)) console.log('  ', l.slice(0, 300));
fs.writeFileSync(path.join(OUT, 'console.txt'), log.join('\n')); await b.close(); srv.close();
