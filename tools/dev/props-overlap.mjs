// LUMIERE v11 - furniture that passes through other furniture (the user: "renders inside and outside each other"). Boots the game headless,
// takes every prop placed in each room (world9.js DRESS), turns its model's box by the placement (position, turn, scale, floor lift) and
// reports every pair whose boxes overlap by more than 1 cm in all three directions. Rugs (made to lie under furniture), and things that
// stand on a counter or table by design (listed in ON_TOP) are left out. A box is coarse for curved things: read the list, then look.
// usage: node tools/dev/props-overlap.mjs [--rooms lobby,corridor]     exit code 1 when anything overlaps
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const WWW = path.resolve('www'), arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; }, ROOMS = arg('rooms', '');
let pwPath = process.env.PW_PATH; if (!pwPath) for (const p of ['/opt/node-tools/node_modules/playwright/index.mjs', '/opt/npm-tools/node_modules/playwright/index.mjs']) if (fs.existsSync(p)) { pwPath = p; break; }
const { chromium } = await import(pwPath || 'playwright');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.ogg': 'audio/ogg', '.opus': 'audio/ogg', '.webp': 'image/webp' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(WWW, u === '/' ? 'index.html' : u); if (!f.startsWith(WWW) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await (await b.newContext({ viewport: { width: 640, height: 360 } })).newPage();
await p.addInitScript(() => { try { localStorage.setItem('lumiere.settings.v5', JSON.stringify({ lang: 'en', graphics: 'high', tutorialAsked: true, npcs: 'off' })); } catch (e) {} });
await p.goto(`http://127.0.0.1:${srv.address().port}/index.html`); await p.waitForFunction(() => window.__lumiere && window.__lumiere.ready, null, { timeout: 300000 });
const res = await p.evaluate(async (only) => {
  const L = window.__lumiere, A = (await import('/js/assets.js')).ASSETS, THREE = await import('three'), D = L.world.dress || [], want = only ? only.split(',') : null;
  const HOOKED = { rope_velvet: 'stanchion' }, SKIP = /^(rug_)/, ON_TOP = { espresso_machine: 1, cake_case: 1, pos_terminal: 1, popcorn_machine: 1, drinks_fountain: 1, tap_brass: 1, basin_vessel: 1 };   // made to sit on another piece
  const boxes = [];
  for (const q of D) { if (want && !want.includes(q.room)) continue; const a = A[q.name]; if (!a || SKIP.test(q.name) || ON_TOP[q.name]) continue;
    const s = q.o.scale ?? 1, sc = typeof s === 'number' ? new THREE.Vector3(s, s, s) : new THREE.Vector3(...s), lift = q.o.ground === false ? 0 : -a.box.min.y;
    const m = new THREE.Matrix4().compose(new THREE.Vector3(q.x, q.y + lift, q.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, q.yaw, 0)), sc); if (q.o.shift) m.multiply(new THREE.Matrix4().makeTranslation(...q.o.shift));
    boxes.push({ room: q.room, name: q.name, at: [+q.x.toFixed(2), +q.z.toFixed(2)], b: a.box.clone().applyMatrix4(m) }); }
  const out = [];
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) { const P = boxes[i], Q = boxes[j]; if (P.room !== Q.room) continue;
    if (HOOKED[P.name] === Q.name || HOOKED[Q.name] === P.name) continue;   // a queue rope's hook sits in its post's head
    const o = ['x', 'y', 'z'].map((k) => Math.min(P.b.max[k], Q.b.max[k]) - Math.max(P.b.min[k], Q.b.min[k])); if (o.every((v) => v > 0.01)) out.push(`${P.room}: ${P.name} at ${P.at} x ${Q.name} at ${Q.at}  (overlap ${o.map((v) => v.toFixed(2)).join(' x ')} m)`); }
  return { n: boxes.length, out };
}, ROOMS);
console.log(`props checked: ${res.n}`); for (const l of res.out) console.log('OVERLAP  ' + l); console.log(`props-overlap: ${res.out.length} overlapping pairs`);
await b.close(); srv.close(); process.exit(res.out.length ? 1 : 0);
