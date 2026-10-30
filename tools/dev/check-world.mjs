// Boots the real app in headless Chromium (SwiftShader) and checks the built world:
//   z-fight : triangles of the same room that lie in the same plane, face the same way and overlap (they would flicker)
//   nav     : every staff post, service spot, lobby seat and cinema seat aisle can be reached on foot from the entrance
// usage: node tools/dev/check-world.mjs [www]      exits 1 on any finding. Needs Playwright + Chromium (not in Termux).
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const WWW = path.resolve(process.argv[2] || 'www');
let pwPath = process.env.PW_PATH; if (!pwPath) for (const p of ['/opt/node-tools/node_modules/playwright/index.mjs', '/opt/npm-tools/node_modules/playwright/index.mjs']) if (fs.existsSync(p)) { pwPath = p; break; }
const { chromium } = await import(pwPath || 'playwright');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.glb': 'model/gltf-binary', '.jpg': 'image/jpeg', '.png': 'image/png' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(WWW, u === '/' ? 'index.html' : u); if (!f.startsWith(WWW) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }), p = await b.newPage({ viewport: { width: 800, height: 360 } });
const log = []; p.on('pageerror', (e) => log.push(e.message));
await p.goto(`http://127.0.0.1:${srv.address().port}/index.html`); await p.waitForFunction(() => window.__lumiere && window.__lumiere.ready, null, { timeout: 180000 });
const res = await p.evaluate(() => {
  const L = window.__lumiere, W = L.world, out = { zfight: {}, zsamples: [], zplanes: {}, zat: {}, nav: { checked: 0, failed: [] } };
  // ---- coplanar overlaps per room solid mesh ----
  const cross2 = (ax, ay, bx, by) => ax * by - ay * bx;
  const triOverlap = (A, B) => {   // separating axis test on two 2D triangles, shrunk slightly so shared edges do not count
    const shrink = (T) => { const cx = (T[0] + T[2] + T[4]) / 3, cy = (T[1] + T[3] + T[5]) / 3; return T.map((v, i) => (i % 2 ? cy + (v - cy) * 0.97 : cx + (v - cx) * 0.97)); };
    const a = shrink(A), c = shrink(B);
    for (const T of [a, c]) for (let e = 0; e < 3; e++) { const x0 = T[e * 2], y0 = T[e * 2 + 1], x1 = T[(e * 2 + 2) % 6], y1 = T[(e * 2 + 3) % 6], nx = y0 - y1, ny = x1 - x0;
      let amin = Infinity, amax = -Infinity, cmin = Infinity, cmax = -Infinity; for (let k = 0; k < 3; k++) { const pa = a[k * 2] * nx + a[k * 2 + 1] * ny, pc = c[k * 2] * nx + c[k * 2 + 1] * ny; amin = Math.min(amin, pa); amax = Math.max(amax, pa); cmin = Math.min(cmin, pc); cmax = Math.max(cmax, pc); }
      if (amax <= cmin + 1e-9 || cmax <= amin + 1e-9) return false; }
    return true; };
  for (const key in W.rooms) {
    const room = W.rooms[key]; let found = 0;
    room.group.traverse((o) => {
      if (!o.isMesh || o.isInstancedMesh || !o.geometry.index || !/solid/.test(o.name)) return;
      const P = o.geometry.attributes.position.array, I = o.geometry.index.array, buckets = new Map();
      for (let t = 0; t < I.length; t += 3) {
        const a = I[t] * 3, b2 = I[t + 1] * 3, c = I[t + 2] * 3, ux = P[b2] - P[a], uy = P[b2 + 1] - P[a + 1], uz = P[b2 + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
        let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const len = Math.hypot(nx, ny, nz); if (len < 1e-8) continue; nx /= len; ny /= len; nz /= len;
        if (ny < -0.9 && Math.max(P[a + 1], P[b2 + 1], P[c + 1]) < 0.5) continue;   // undersides below knee height can never be seen
        const d = nx * P[a] + ny * P[a + 1] + nz * P[a + 2], k = `${Math.round(nx * 50)},${Math.round(ny * 50)},${Math.round(nz * 50)},${Math.round(d * 500)}`;
        const ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz), pj = (i) => (ay >= ax && ay >= az ? [P[i], P[i + 2]] : ax >= az ? [P[i + 2], P[i + 1]] : [P[i], P[i + 1]]);
        const T = [...pj(a), ...pj(b2), ...pj(c)]; let L2 = buckets.get(k); if (!L2) buckets.set(k, L2 = []); L2.push(T);
      }
      for (const [k, list] of buckets) { if (list.length < 2) continue; const grid = new Map(), cell = 0.5;
        list.forEach((T, i) => { const xs = [T[0], T[2], T[4]], ys = [T[1], T[3], T[5]]; for (let gx = Math.floor(Math.min(...xs) / cell); gx <= Math.floor(Math.max(...xs) / cell); gx++) for (let gy = Math.floor(Math.min(...ys) / cell); gy <= Math.floor(Math.max(...ys) / cell); gy++) { const g = gx + ',' + gy; let c = grid.get(g); if (!c) grid.set(g, c = []); c.push(i); } });
        const seen = new Set(); for (const ids of grid.values()) for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) { const pk = ids[i] * 1e6 + ids[j]; if (seen.has(pk)) continue; seen.add(pk);
          if (triOverlap(list[ids[i]], list[ids[j]])) { found++; out.zplanes[key + ' ' + k] = (out.zplanes[key + ' ' + k] || 0) + 1; if (!out.zat[key + ' ' + k]) out.zat[key + ' ' + k] = list[ids[i]].slice(0, 2).map((v) => +v.toFixed(2)); } } }
    });
    out.zfight[key] = found;
  }
  // ---- per asset (Kiln GLBs), LOD0 only ----
  out.assets = {};
  const A = window.__lumiereAssets || {};
  for (const [name, asset] of Object.entries(A)) { const tris = []; for (const part of asset.parts) { if (part.lod !== 0 || part.glow) continue; const g = part.geo, PA = g.attributes.position, I = g.index ? g.index.array : [...Array(PA.count).keys()]; for (let t = 0; t < I.length; t += 3) tris.push([I[t], I[t + 1], I[t + 2]].map((i) => [PA.getX(i), PA.getY(i), PA.getZ(i)])); }
    const buckets = new Map(); for (const [a, b2, c] of tris) { const ux = b2[0] - a[0], uy = b2[1] - a[1], uz = b2[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2]; let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const len = Math.hypot(nx, ny, nz); if (len < 1e-9) continue; nx /= len; ny /= len; nz /= len;
      if (ny < -0.9 && Math.max(a[1], b2[1], c[1]) < 0.5) continue;
      const d = nx * a[0] + ny * a[1] + nz * a[2], k = `${Math.round(nx * 50)},${Math.round(ny * 50)},${Math.round(nz * 50)},${Math.round(d * 500)}`, ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz), pj = (q) => (ay >= ax && ay >= az ? [q[0], q[2]] : ax >= az ? [q[2], q[1]] : [q[0], q[1]]);
      let l = buckets.get(k); if (!l) buckets.set(k, l = []); l.push([...pj(a), ...pj(b2), ...pj(c)]); }
    let n = 0; const where = []; for (const [k, list] of buckets) for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) if (triOverlap(list[i], list[j])) { n++; if (where.length < 3) where.push(k); }
    out.assets[name] = { n, where }; }
  // ---- navigation reachability from the entrance ----
  const N = W.nav, from = W.spots.entrance, check = (label, x, z) => { out.nav.checked++; const pth = N.path(from.x, from.z, x, z); if (!pth) out.nav.failed.push(label); };
  for (const [k, s] of Object.entries(W.spots)) if (s.x != null) check('spot ' + k, s.x, s.z);
  for (const s of W.sitSpots) check('sit ' + s.id + ' ' + s.kind, s.stand.x, s.stand.z);
  for (const h of W.halls) { const c = h.cfg; for (const side of [-1, 1]) check(`${h.key} aisle ${side}`, c.cx + side * (c.B / 2 + 0.6), c.zs + c.dHip[c.rows - 1]); check(`${h.key} cross aisle`, c.cx, c.zs + c.cross.dDoor);
    check(`${h.key} front row`, c.cx, c.zs + c.dHip[0] - c.seat.fr - 0.5);
    if (c.exitStair) { const E = c.exitStair; check(`${h.key} exit landing`, (E.side > 0 ? c.x1 : c.x0) - E.side * 0.5, E.z); }
    if (c.vom) check(`${h.key} vomitory end`, c.cx, c.zBack - 0.5);
    if (c.balcony) check(`${h.key} balcony walkway`, c.cx + c.B / 2 - 1, c.zs + c.pf[c.balcony] - 0.4); }
  for (const [k, p] of Object.entries(W.posts)) if (p && p.x != null) check('post ' + k, p.x, p.z);
  check('tunnel', 0, -36); for (const pp of W.pois || []) check('poi', pp[0], pp[1]);
  return out;
});
await b.close(); srv.close();
let bad = 0;
for (const [k, n] of Object.entries(res.zfight)) { console.log(`z-fight ${k.padEnd(8)} ${n} overlapping coplanar triangle pairs`); bad += n; }
for (const [k, n] of Object.entries(res.zplanes).sort((a, b) => b[1] - a[1]).slice(0, 14)) console.log(`   ${String(n).padStart(5)} pairs  ${k}  near ${res.zat[k]}`);
for (const [k, v] of Object.entries(res.assets || {})) if (v.n) console.log(`asset ${k.padEnd(18)} ${v.n} coplanar overlapping pairs  planes ${v.where.join(' | ')}`);
console.log(`nav: ${res.nav.checked - res.nav.failed.length}/${res.nav.checked} targets reachable from the entrance`); for (const f of res.nav.failed) console.log('   unreachable:', f);
if (log.length) console.log('page errors:', log.join(' | '));
process.exit(bad || res.nav.failed.length || log.length ? 1 : 0);
