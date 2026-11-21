// LUMIERE v11 - removes folded triangles from GLBs. A fold is two triangles that share an edge, lie in one plane and face opposite ways, one
// laid back over the other (an outline that doubles back in an extrusion, or a simplifier's collapse). Drawn one-sided it hides; drawn from
// both sides (assets.js TWO_SIDED: the letters and hall numbers) each one's back copy fights the other, which the z-fighting gate found as a
// sliver on the hall number 3. Of each fold the triangle that disagrees with its other neighbours goes; the one that agrees stays, so the
// surface keeps no hole. Everything else in the file (materials, names, extensions, other data) stays as gltf-transform read it. A model
// listed in tools/optimize-models.json gets its new checksum there, so the optimiser does not simplify it again.
// usage: node tools/dev/glb-unfold.mjs www/models/a.glb [b.glb ...] [--dry]      (prints the folds found and removed per model)
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
const ROOT = path.resolve(new URL('../..', import.meta.url).pathname);
const { NodeIO } = await import(path.join(ROOT, 'tools/kiln/.kiln-install/node_modules/@gltf-transform/core/dist/index.js'));
let EXT = []; try { EXT = (await import(path.join(ROOT, 'tools/kiln/.kiln-install/node_modules/@gltf-transform/extensions/dist/index.js'))).ALL_EXTENSIONS; } catch (e) { /* core only */ }
const files = process.argv.slice(2).filter((a) => a.endsWith('.glb')), DRY = process.argv.includes('--dry');
const io = new NodeIO().registerExtensions(EXT), DB = path.join(ROOT, 'tools/optimize-models.json'), db = fs.existsSync(DB) ? JSON.parse(fs.readFileSync(DB, 'utf8')) : {};
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], unit = (a) => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
let total = 0;
for (const f of files) {
  const doc = await io.read(f); let removed = 0, maxA = 0;
  for (const mesh of doc.getRoot().listMeshes()) for (const prim of mesh.listPrimitives()) {
    const pos = prim.getAttribute('POSITION'), idx = prim.getIndices(); if (!pos || !idx || prim.getMode() !== 4) continue;
    const I = Array.from(idx.getArray()), nt = I.length / 3, P = (i) => pos.getElement(i, []);
    // welded positions: an edge is shared when its ends are at the same place, whatever the vertex ids (seams split normals and UVs)
    const key = (i) => P(i).map((c) => Math.round(c * 1e5)).join(','), K = I.map(key), N = [], A = [];
    for (let t = 0; t < nt; t++) { const a = P(I[3 * t]), b = P(I[3 * t + 1]), c = P(I[3 * t + 2]), n = cross(sub(b, a), sub(c, a)); A.push(Math.hypot(...n) / 2); N.push(unit(n)); }
    const edges = new Map();
    for (let t = 0; t < nt; t++) for (let e = 0; e < 3; e++) { const u = K[3 * t + e], v = K[3 * t + (e + 1) % 3], k = u < v ? u + '|' + v : v + '|' + u; if (!edges.has(k)) edges.set(k, []); edges.get(k).push(t); }
    const nbr = (t) => { const out = new Set(); for (let e = 0; e < 3; e++) { const u = K[3 * t + e], v = K[3 * t + (e + 1) % 3]; for (const s of edges.get(u < v ? u + '|' + v : v + '|' + u)) if (s !== t) out.add(s); } return out; };
    const drop = new Set();
    for (const [k, ts] of edges) { if (ts.length !== 2) continue; const [s, t] = ts; if (drop.has(s) || drop.has(t) || A[s] < 1e-12 || A[t] < 1e-12) continue;
      if (dot(N[s], N[t]) > -0.999) continue;   // not opposite: an ordinary crease
      // folded only when both third corners lie on the same side of the shared edge (opposite sides = flat, just wound the other way)
      const [ku, kv] = k.split('|'), third = (t_) => { for (let e = 0; e < 3; e++) if (K[3 * t_ + e] !== ku && K[3 * t_ + e] !== kv) return P(I[3 * t_ + e]); return null; };
      const eu = (() => { for (let e = 0; e < 6; e++) { const t_ = e < 3 ? s : t, j = 3 * t_ + (e % 3); if (K[j] === ku) return P(I[j]); } })(), ev = (() => { for (let e = 0; e < 6; e++) { const t_ = e < 3 ? s : t, j = 3 * t_ + (e % 3); if (K[j] === kv) return P(I[j]); } })();
      const ps = third(s), pt = third(t); if (!ps || !pt) continue; const ed = sub(ev, eu), side = (p) => dot(cross(ed, sub(p, eu)), N[s]);
      if (side(ps) * side(pt) <= 0) continue;
      // and only when it lies back on the other within 0.5 mm: a sharper spike (a profile turning back at a small angle) is a shape, not a fold
      if (Math.abs(dot(sub(pt, eu), N[s])) > 0.0005 || Math.abs(dot(sub(ps, eu), N[t])) > 0.0005) continue;
      // keep the one that agrees with the rest of its neighbours
      const agree = (t_, o) => { let sum = 0, n = 0; for (const q of nbr(t_)) if (q !== o) { sum += dot(N[q], N[t_]); n++; } return n ? sum / n : 0; };
      const d_ = agree(s, t) >= agree(t, s) ? t : s; drop.add(d_); maxA = Math.max(maxA, A[d_]);
      if (DRY && A[d_] > 1e-6) { const c = [0, 1, 2].map((e) => P(I[3 * d_ + e])), m = [0, 1, 2].map((a) => +((c[0][a] + c[1][a] + c[2][a]) / 3).toFixed(3)); console.log(`  ${mesh.getName()}: ${(A[d_] * 1e4).toFixed(2)} cm2 at [${m}] (mesh frame)`); } }
    if (!drop.size) continue; removed += drop.size;
    const keep = []; for (let t = 0; t < nt; t++) if (!drop.has(t)) keep.push(I[3 * t], I[3 * t + 1], I[3 * t + 2]);
    if (!DRY) idx.setArray(new (idx.getArray().constructor)(keep));
  }
  total += removed; const model = path.basename(f, '.glb'); console.log(model.padEnd(22), removed, DRY ? 'folds found' : 'folded triangles removed', removed ? `(largest ${(maxA * 1e4).toFixed(3)} cm2)` : '');
  if (!removed || DRY) continue;
  await io.write(f, doc); if (db[model]) db[model] = crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex').slice(0, 16);
}
if (!DRY) fs.writeFileSync(DB, JSON.stringify(Object.fromEntries(Object.entries(db).sort()), null, 1));
console.log('total', total);
