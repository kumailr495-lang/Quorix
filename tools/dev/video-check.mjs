// Plays a colour-bar video on a screen in headless Chromium and compares the rendered picture with the video's own colours.
// usage: node tools/dev/video-check.mjs <www-dir> <bars.webm> <bars.png> [out.jpg]   (bars.png: the frame the video was made from)
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const [,, WWW_ARG, VID, PNG, OUT] = process.argv; const WWW = path.resolve(WWW_ARG || 'www');
let pwPath = process.env.PW_PATH; if (!pwPath) { for (const p of ['/opt/node-tools/node_modules/playwright/index.mjs', '/opt/npm-tools/node_modules/playwright/index.mjs']) if (fs.existsSync(p)) { pwPath = p; break; } }
const { chromium } = await import(pwPath || 'playwright');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.webm': 'video/webm', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.png': 'image/png' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = u === '/__test.webm' ? VID : u === '/__bars.png' ? PNG : path.join(WWW, u === '/' ? 'index.html' : u); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: 800, height: 360 } }); await ctx.addInitScript(() => { localStorage.setItem('lumiere.settings.v5', JSON.stringify({ lang: 'en', graphics: 'medium' })); });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto(`http://127.0.0.1:${srv.address().port}/index.html?play=1&fixscale=1`); await p.waitForFunction(() => window.__lumiere && window.__lumiere.mode === 'play', null, { timeout: 180000 });
await p.evaluate(() => { const L = window.__lumiere, h = L.world.halls[2], s = h.seats[h.seats.length - 5]; L.shows.loadURL('/__test.webm'); L.book({ hall: h.id, hallKey: h.key, hallName: h.cfg.name, seat: s.id, row: s.row, col: s.col, film: null, delay: 0, own: true, title: 'bars' }); L.shows.get(h.id).startAt = L.shows.now + 300;
  L.player.place(h.cfg.cx, h.cfg.zBack - 1, 0, 0); L.debugCam({ p: [h.cfg.cx, h.screenY, h.zScreen + 7], t: [h.cfg.cx, h.screenY, h.zScreen] }); });
await p.waitForFunction(() => { const L = window.__lumiere; return L.shows.get(L.world.halls[2].id).state === 'playing'; }, null, { timeout: 60000 });
await p.waitForTimeout(2500); await p.evaluate(() => { document.querySelector('#hud') && (document.querySelector('#hud').style.visibility = 'hidden'); });
const shot = await p.screenshot({ type: 'png' }); if (OUT) fs.writeFileSync(OUT, shot);
// sample the centre of each bar on the canvas, and the same bars in the source frame
const res = await p.evaluate(async ({ png }) => {
  const L = window.__lumiere, cam = L.engine.camera, h = L.world.halls[2], b = h.picMat.uniforms.uBox.value, pic = h.pic; pic.geometry.computeBoundingBox(); const bb = pic.geometry.boundingBox;
  const img = new Image(); img.src = png; await img.decode(); const c = document.createElement('canvas'); c.width = innerWidth; c.height = innerHeight; const g = c.getContext('2d'); g.drawImage(img, 0, 0, c.width, c.height);
  const src = document.createElement('canvas'); const si = new Image(); si.src = '/__bars.png'; await si.decode(); src.width = si.width; src.height = si.height; const sg = src.getContext('2d'); sg.drawImage(si, 0, 0);
  const out = []; for (let i = 0; i < 8; i++) { const u = b.x + b.z * (i + 0.5) / 8, v = b.y + b.w * 0.5;
    const P = new cam.position.constructor(bb.min.x + (bb.max.x - bb.min.x) * u, bb.min.y + (bb.max.y - bb.min.y) * v, (bb.min.z + bb.max.z) / 2).applyMatrix4(pic.matrixWorld).project(cam);
    const x = Math.round((P.x + 1) / 2 * innerWidth), y = Math.round((1 - P.y) / 2 * innerHeight), d = g.getImageData(x - 2, y - 2, 5, 5).data; let r = 0, gg = 0, bl = 0; for (let k = 0; k < d.length; k += 4) { r += d[k]; gg += d[k + 1]; bl += d[k + 2]; }
    const s = sg.getImageData(i * 80 + 40, 180, 1, 1).data; out.push({ want: [s[0], s[1], s[2]], got: [r / 25, gg / 25, bl / 25].map(Math.round) }); }
  return out; }, { png: 'data:image/png;base64,' + shot.toString('base64') });
let worst = 0; for (const r of res) { const e = Math.max(...r.want.map((w, k) => Math.abs(w - r.got[k]))); worst = Math.max(worst, e); console.log(`bar want ${r.want.join(',').padEnd(12)} got ${r.got.join(',').padEnd(12)} max error ${e}`); }
console.log(`worst channel error ${worst} (8-bit levels)`, errs.length ? errs : '');
await b.close(); srv.close();
