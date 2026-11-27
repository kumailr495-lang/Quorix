// LUMIERE v14 - the view from your flat's window (home.js; world9.js PANEL_DRAW homeview): the street rendered by the engine itself from the
// Astor's third floor, where the flat would be, looking across the road at the cinema. One frame, 2400 x 1000, the camera's projection
// matching the panel tools/blender/arch/home14.py hangs 27.9 m out (VIEW there: 130 degrees across, turned 14 degrees east, no tilt), so the
// cinema's front sits in the window at its true size and moves right as you walk. Headless Chromium + SwiftShader: the real engine.
// usage: node tools/dev/homeview.mjs [OUT=www/art/homeview.jpg]   (then the panel loads it; JPEG via python3 PIL)
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
const OUT = process.argv[2] || 'www/art/homeview.jpg', WWW = path.resolve('www'), W = 2400, H = 1000;
let pwPath = process.env.PW_PATH; if (!pwPath) for (const p of ['/opt/node-tools/node_modules/playwright/index.mjs', '/opt/npm-tools/node_modules/playwright/index.mjs']) if (fs.existsSync(p)) { pwPath = p; break; }
const { chromium } = await import(pwPath || 'playwright');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.webp': 'image/webp', '.opus': 'audio/ogg', '.css': 'text/css', '.woff2': 'font/woff2', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(WWW, u === '/' ? 'index.html' : u);
  if (!f.startsWith(WWW) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; }
  r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Content-Length': fs.statSync(f).size }); fs.createReadStream(f).pipe(r); });
await new Promise((ok) => srv.listen(0, '127.0.0.1', ok)); const port = srv.address().port;
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 1200, height: 500 } });
await ctx.addInitScript(() => { try { localStorage.setItem('lumiere.settings.v5', JSON.stringify({ lang: 'en', graphics: 'high', tutorialAsked: true, seen: { intro: true } })); } catch (e) { /* none */ } });
const p = await ctx.newPage(); const log = []; p.on('pageerror', (e) => log.push(`[pageerror] ${e.message}`));
await p.goto(`http://127.0.0.1:${port}/index.html?play=quick`);
await p.waitForFunction(() => window.__lumiere && window.__lumiere.ready && window.__lumiere.mode === 'play', null, { timeout: 300000 });
await p.waitForTimeout(6000);   // the textures, the traffic and the crowd settle
const url = await p.evaluate(async ([W, H]) => {
  const L = window.__lumiere, R = L.engine.renderer, cam = L.engine.camera.clone();
  // the eye: x -27 (the hotel's blade sign stands at -30), 11.2 m up (the third floor), 0.5 m out from the facade's line (z = 40: its own
  // mullions and string courses stood in front of an eye inside it), level, turned 14 degrees toward the cinema; 130 degrees across
  const eye = [-27.0, 11.2, 39.5], YAW = -14 * Math.PI / 180, HF = 130 * Math.PI / 180; cam.position.set(...eye); cam.rotation.set(0, YAW, 0, 'YXZ'); cam.aspect = W / H;
  cam.fov = 2 * Math.atan(Math.tan(HF / 2) / (W / H)) * 180 / Math.PI; cam.near = 0.5; cam.far = 600; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  L.player.place(-27.5, 38.6, 0, 0, 0); L.world.setVisibility('street', eye[0], eye[1], eye[2], true);
  for (const k of ['lobby', 'corridor']) if (L.world.rooms[k]) L.world.rooms[k].group.visible = true;
  R.setPixelRatio(1); R.setSize(W, H, false); await new Promise((r) => setTimeout(r, 400));
  R.render(L.engine.scene, cam); return R.domElement.toDataURL('image/png');
}, [W, H]);
const png = OUT.replace(/\.jpg$/, '') + '.tmp.png'; fs.writeFileSync(png, Buffer.from(url.split(',')[1], 'base64'));
execFileSync('python3', ['-c', `import sys; from PIL import Image; Image.open(sys.argv[1]).convert('RGB').resize((2048, 853), Image.LANCZOS).save(sys.argv[2], quality=86)`, png, OUT]); fs.unlinkSync(png);
console.log('homeview:', OUT, fs.statSync(OUT).size, 'bytes'); if (log.length) console.log(log.slice(0, 10).join('\n'));
await b.close(); srv.close();
