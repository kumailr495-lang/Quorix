// LUMIERE v14 - removes coplanar duplicates inside a GLB's meshes: two triangles of one primitive facing the same way in one plane (within
// 0.6 mm) that overlap. A photoscan often carries such shells (a lens ring captured twice, a base with a skin on it); seen from a distance
// the depth buffer cannot tell them apart and they flicker (the z-fighting gate, tools/dev/zcheck.sh, lists them under "engine"). Of each
// overlapping pair the smaller triangle goes (the larger surface stays, so no hole opens where they overlapped). Everything else in the file
// stays as gltf-transform read it; a model in tools/optimize-models.json gets its new checksum there.
// usage: node tools/dev/glb-coplanar.mjs www/models/a.glb [b.glb ...] [--dry] [--tol 0.0006] [--behind]
//   --behind: layers up to 6 mm apart (a scan's skin over its shell): the hidden one goes instead of the smaller
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
const ROOT = path.resolve(new URL('../..', import.meta.url).pathname);
const { NodeIO } = await import(path.join(ROOT, 'tools/kiln/.kiln-install/node_modules/@gltf-transform/core/dist/index.js'));
let EXT = []; try { EXT = (await import(path.join(ROOT, 'tools/kiln/.kiln-install/node_modules/@gltf-transform/extensions/dist/index.js'))).ALL_EXTENSIONS; } catch (e) { /* core only */ }
const args = process.argv.slice(2), files = args.filter((a) => a.endsWith('.glb')), DRY = args.includes('--dry'), BEHIND = args.includes('--behind'), TOL = args.includes('--tol') ? +args[args.indexOf('--tol') + 1] : BEHIND ? 0.006 : 0.0006;
const io = new NodeIO().registerExtensions(EXT), DB = path.join(ROOT, 'tools/optimize-models.json'), db = fs.existsSync(DB) ? JSON.parse(fs.readFileSync(DB, 'utf8')) : {};
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
// is point p (in the triangle's plane) inside triangle abc, with a small margin inward
function inside(p, a, b, c, n) { for (const [u, v] of [[a, b], [b, c], [c, a]]) if (dot(cross(sub(v, u), sub(p, u)), n) < -1e-10) return false; return true; }
let total = 0;
for (const f of files) {
  const doc = await io.read(f); let removed = 0, area = 0;
  for (const mesh of doc.getRoot().listMeshes()) for (const prim of mesh.listPrimitives()) {
    const pos = prim.getAttribute('POSITION'), idx = prim.getIndices(); if (!pos || !idx || prim.getMode() !== 4) continue;
    const I = Array.from(idx.getArray()), nt = I.length / 3, P = (i) => pos.getElement(i, []), T = [];
    for (let t = 0; t < nt; t++) { const a = P(I[3 * t]), b = P(I[3 * t + 1]), c = P(I[3 * t + 2]), cr = cross(sub(b, a), sub(c, a)), l = Math.hypot(...cr);
      T.push({ a, b, c, n: l > 1e-14 ? cr.map((v) => v / l) : [0, 0, 0], A: l / 2, g: [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3] }); }
    // a grid of 2 cm cells over the centroids; every triangle is compared with those whose centroid lies within its own reach
    const C = 0.02, grid = new Map(), cell = (p) => p.map((v) => Math.floor(v / C)), K = (x, y, z) => x + ',' + y + ',' + z;
    T.forEach((tr, i) => { const [x, y, z] = cell(tr.g); const k = K(x, y, z); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(i); });
    const drop = new Set();
    for (let i = 0; i < nt; i++) { const s = T[i]; if (drop.has(i) || s.A < 1e-12) continue; const [x, y, z] = cell(s.g), r = Math.ceil(Math.max(Math.hypot(...sub(s.a, s.g)), Math.hypot(...sub(s.b, s.g)), Math.hypot(...sub(s.c, s.g))) / C);
      for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) for (let dz = -r; dz <= r; dz++) { const L = grid.get(K(x + dx, y + dy, z + dz)); if (!L) continue;
        for (const j of L) { if (j <= i || drop.has(j)) continue; const t = T[j]; if (t.A < 1e-12 || dot(s.n, t.n) < 0.995) continue;
          if (Math.abs(dot(sub(t.g, s.a), s.n)) > TOL || Math.abs(dot(sub(s.g, t.a), t.n)) > TOL) continue;   // not in one plane
          // they overlap when the smaller one's centroid (or one of its corners pulled 10 % toward it) lies inside the larger
          const [big, sm, smi0] = s.A >= t.A ? [s, t, j] : [t, s, i], pts = [sm.g, ...[sm.a, sm.b, sm.c].map((q) => q.map((v, k) => v * 0.9 + sm.g[k] * 0.1))];
          const proj = (p) => p.map((v, k) => v - big.n[k] * dot(sub(p, big.a), big.n));
          // --behind (a layer a few mm under a skin): the one behind the other along their normal goes, whatever its size
          const smi = BEHIND ? (dot(sub(t.g, s.g), s.n) > 0 ? i : j) : smi0;
          if (pts.some((p) => inside(proj(p), big.a, big.b, big.c, big.n))) { drop.add(smi); area += T[smi].A; if (smi === i) break; } } }
    }
    if (drop.size) { removed += drop.size; if (!DRY) { const keep = []; for (let t = 0; t < nt; t++) if (!drop.has(t)) keep.push(I[3 * t], I[3 * t + 1], I[3 * t + 2]); idx.setArray(new (idx.getArray().constructor)(keep)); } }
  }
  total += removed; console.log(path.basename(f).padEnd(26), removed, 'coplanar duplicates', (area * 1e4).toFixed(2), 'cm2', DRY ? '(dry run)' : 'removed');
  if (removed && !DRY) { await io.write(f, doc); const n = path.basename(f, '.glb'); if (db[n]) { db[n] = crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex').slice(0, 16); fs.writeFileSync(DB, JSON.stringify(db, null, 1)); } }
}
console.log('total', total);
