// LUMIERE v14e - eye points and engine meshes on the private floor (the lounge 'vip' and the five screens) for tools/blender/arch/zcheck.py
// (zcheck.sh runs it). The floor is reached by the lift, so seethru.mjs's walked flood fill never puts an eye there (the v14d Suite's lesson).
// usage: node tools/dev/wingz.mjs OUT_DIR   (writes OUT_DIR/wing_eyes.json and OUT_DIR/wing_engine.json)
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const args = process.argv.slice(2), OUT = args[0], opt = (k, d) => { const i = args.indexOf('--' + k); return i < 0 ? d : args[i + 1]; }, has = (k) => args.includes('--' + k);
const WWW = path.resolve('www'); fs.mkdirSync(OUT, { recursive: true });
let pwPath = process.env.PW_PATH; if (!pwPath) for (const p of ['/opt/node-tools/node_modules/playwright/index.mjs', '/opt/npm-tools/node_modules/playwright/index.mjs']) if (fs.existsSync(p)) { pwPath = p; break; }
const { chromium } = await import(pwPath || 'playwright');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.webp': 'image/webp', '.opus': 'audio/ogg', '.css': 'text/css', '.woff2': 'font/woff2', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.ogg': 'audio/ogg', '.mp4': 'video/mp4', '.webm': 'video/webm', '.bin': 'application/octet-stream' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(WWW, u === '/' ? 'index.html' : u); if (!f.startsWith(WWW) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise((ok) => srv.listen(0, '127.0.0.1', ok)); const port = srv.address().port;
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 640, height: 360 }, bypassCSP: true });   // v12c: the page's CSP (index.html) refuses the injected seethru-page.js; this test harness alone bypasses it
await ctx.addInitScript(() => { try { localStorage.setItem('lumiere.settings.v5', JSON.stringify({ lang: 'en', graphics: 'medium', tutorialAsked: true, npcs: 'off' })); } catch (e) {} });
// every screen rented (their doors unlock, their remotes lie on their tables), the player in the lounge; a 0.5 m grid of standing eyes in the
// lounge and the five rooms, seated eyes at every sit spot there
const p = await ctx.newPage(); const log = []; p.on('pageerror', (e) => log.push(`[pageerror] ${e.message}`));
await p.goto(`http://127.0.0.1:${port}/index.html`); await p.waitForFunction(() => window.__lumiere && window.__lumiere.ready, null, { timeout: 300000 });
await p.addScriptTag({ path: path.resolve('tools/dev/seethru-page.js') }); await p.evaluate(() => window.__st.init());
const eyes = await p.evaluate(async () => { const L = window.__lumiere, W = L.world, B = L.B, P = L.privates, keys = ['vip', ...B.PRIVATE.map((q) => q.key)];
  for (const q of B.PRIVATE) P.rent(q.id, null, false); L.player.place(212, -10, Math.PI, 0, 0); await new Promise((r) => setTimeout(r, 2500)); const out = [];
  for (const R of [B.VIP, ...B.PRIVATE]) for (let x = R.x0 + 0.3; x < R.x1 - 0.2; x += 0.5) for (let z = R.z0 + 0.3; z < R.z1 - 0.2; z += 0.5) { const rk = W.roomAt(x, 0.1, z); if (!keys.includes(rk)) continue; const y = W.floorY(x, z, 0.1), q = { x, z }; if (W.collide(q, 0.24, y) > 0.001) continue; out.push({ tag: rk, x: +x.toFixed(3), y: +y.toFixed(3), z: +z.toFixed(3), eye: 1.62 }); }
  for (const s of W.sitSpots) if (keys.includes(s.room)) out.push({ tag: s.room, x: +s.x.toFixed(3), y: +(s.y - 0.45).toFixed(3), z: +s.z.toFixed(3), eye: 1.15 });
  return out; });
fs.writeFileSync(path.join(OUT, 'wing_eyes.json'), JSON.stringify(eyes)); console.log('private floor eye points', eyes.length);
const D = await p.evaluate(() => window.__st.dumpTris()); fs.writeFileSync(path.join(OUT, 'wing_engine.json'), JSON.stringify(D)); console.log('engine triangles', D.n, 'meshes', D.names.length);
if (log.length) console.log(log.slice(0, 8).join('\n')); await b.close(); srv.close();
