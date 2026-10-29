// Material-faithful(ish) multi-angle review of GLB assets: three.js r169 MeshStandardMaterial, a studio room environment, SwiftShader WebGL.
// usage: node tools/dev/view-glb.mjs <out.png> <a.glb> [b.glb ...]   env: VIEWS=front,right,back,left,top,threeq,closeup  SIZE=480  LIB=1 (apply www/js/library materials by name)
// Each GLB becomes one row of the sheet. Not the phone: SwiftShader is a CPU rasteriser, so this says nothing about speed.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const [,, OUT, ...GLBS] = process.argv; const ROOT = path.resolve(new URL('../..', import.meta.url).pathname);
let pwPath = process.env.PW_PATH; if (!pwPath) for (const p of ['/opt/node-tools/node_modules/playwright/index.mjs', '/opt/npm-tools/node_modules/playwright/index.mjs']) if (fs.existsSync(p)) { pwPath = p; break; }
const { chromium } = await import(pwPath || 'playwright');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.glb': 'model/gltf-binary', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
const files = GLBS.map((g) => path.resolve(g));
const page = `<!doctype html><html><head><script type="importmap">{"imports":{"three":"/www/vendor/three.module.js"}}</script></head><body style="margin:0;background:#222">
<canvas id="c"></canvas><script type="module">
import * as THREE from 'three'; import { GLTFLoader } from '/www/vendor/addons/GLTFLoader.js'; import { RoomEnvironment } from '/www/vendor/addons/RoomEnvironment.js';
window.render = async (url, size, views, lib) => {
  const c = document.getElementById('c'), r = new THREE.WebGLRenderer({ canvas: c, antialias: true, preserveDrawingBuffer: true }); r.setSize(size, size); r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.0;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x3a3d44); const pm = new THREE.PMREMGenerator(r); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  const key = new THREE.DirectionalLight(0xfff2e0, 1.6); key.position.set(3, 5, 2); scene.add(key); scene.add(new THREE.HemisphereLight(0xdde6ff, 0x302820, 0.4));
  const g = await new GLTFLoader().loadAsync(url); const m = g.scene; scene.add(m);
  if (lib) { const L = await import('/www/js/library.js'); await L.applyLibrary(m, r); }
  const box = new THREE.Box3().setFromObject(m), ctr = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3()), rad = sz.length() / 2;
  const floor = new THREE.Mesh(new THREE.CircleGeometry(rad * 3, 48), new THREE.MeshStandardMaterial({ color: 0x55585f, roughness: 0.9 })); floor.rotation.x = -Math.PI / 2; floor.position.y = box.min.y - 0.001; scene.add(floor);
  const cam = new THREE.PerspectiveCamera(30, 1, 0.01, 100), d = rad / Math.tan(15 * Math.PI / 180) * 1.05, out = [];
  const dirs = { front: [1, 0.15, 0], right: [0, 0.15, 1], back: [-1, 0.15, 0], left: [0, 0.15, -1], top: [0.001, 1, 0], threeq: [0.8, 0.45, 0.7], rear3q: [-0.8, 0.5, -0.7], low: [0.9, -0.05, 0.5], closeup: [0.6, 0.3, 0.5] };
  let tris = 0; m.traverse((o) => { if (o.isMesh) tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; });
  for (const v of views) { const dv = new THREE.Vector3(...dirs[v]).normalize(), dd = v === 'closeup' ? d * 0.45 : d; cam.position.copy(ctr).addScaledVector(dv, dd); cam.lookAt(ctr); r.render(scene, cam); out.push(c.toDataURL('image/png')); }
  return { shots: out, tris: Math.round(tris), size: sz.toArray().map((x) => +x.toFixed(3)), mats: [...new Set((() => { const a = []; m.traverse((o) => { if (o.isMesh) a.push(o.material.name); }); return a; })())] };
};
window.ready = true;
</script></body></html>`;
const srv = http.createServer((q, res) => { const u = decodeURIComponent(q.url.split('?')[0]);
  if (u === '/') { res.writeHead(200, { 'content-type': 'text/html' }); res.end(page); return; }
  if (u.startsWith('/glb/')) { const f = files[+u.slice(5)]; res.writeHead(200, { 'content-type': MIME['.glb'] }); fs.createReadStream(f).pipe(res); return; }
  const f = path.join(ROOT, u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }); const p = await b.newPage(); const log = [];
p.on('console', (m) => log.push(m.text())); p.on('pageerror', (e) => log.push('pageerror ' + e.message));
await p.goto(`http://127.0.0.1:${srv.address().port}/`); await p.waitForFunction(() => window.ready);
const SIZE = +(process.env.SIZE || 360), VIEWS = (process.env.VIEWS || 'front,right,back,threeq,rear3q,closeup').split(','), rows = [];
for (let i = 0; i < files.length; i++) { const res = await p.evaluate(([u, s, v, l]) => window.render(u, s, v, l), [`/glb/${i}`, SIZE, VIEWS, !!process.env.LIB]); rows.push(res); console.log(path.basename(files[i]), 'tris', res.tris, 'size', res.size.join(' x '), 'materials', res.mats.join(',')); }
// compose the sheet in the page (no image libraries needed in Node)
const png = await p.evaluate(async ([rows, s]) => { const n = rows[0].shots.length, cv = document.createElement('canvas'); cv.width = n * s; cv.height = rows.length * s; const g = cv.getContext('2d');
  for (let r = 0; r < rows.length; r++) for (let i = 0; i < n; i++) { const im = new Image(); im.src = rows[r].shots[i]; await im.decode(); g.drawImage(im, i * s, r * s); }
  return cv.toDataURL('image/png'); }, [rows, SIZE]);
fs.writeFileSync(OUT, Buffer.from(png.split(',')[1], 'base64')); if (log.length) console.log(log.slice(0, 10).join('\n'));
await b.close(); srv.close();
