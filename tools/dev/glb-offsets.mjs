// LUMIERE v11 - writes the part moves found by tools/blender/glb_check.py --fix into the GLBs: each move is added to that part's node
// translation (glTF y-up metres), and the same move to its level-of-detail sibling (Part_LOD0 -> Part_LOD1). Everything else in the file
// (materials, names, extensions, mesh data) is kept as gltf-transform read it. Blender renames a repeated node name Name.001, Name.002: those
// map to the second, third node of that name in file order. A model listed in tools/optimize-models.json gets its new checksum there, so the
// optimiser does not simplify it a second time.
// usage: node tools/dev/glb-offsets.mjs OFFSETS.json [www/models]
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
const ROOT = path.resolve(new URL('../..', import.meta.url).pathname);
const { NodeIO } = await import(path.join(ROOT, 'tools/kiln/.kiln-install/node_modules/@gltf-transform/core/dist/index.js'));
let EXT = []; try { EXT = (await import(path.join(ROOT, 'tools/kiln/.kiln-install/node_modules/@gltf-transform/extensions/dist/index.js'))).ALL_EXTENSIONS; } catch (e) { /* core only */ }
const [, , file, dir = path.join(ROOT, 'www/models')] = process.argv, OFF = JSON.parse(fs.readFileSync(file, 'utf8'));
const io = new NodeIO().registerExtensions(EXT), DB = path.join(ROOT, 'tools/optimize-models.json'), db = fs.existsSync(DB) ? JSON.parse(fs.readFileSync(DB, 'utf8')) : {};
for (const [model, moves] of Object.entries(OFF)) {
  const f = path.join(dir, model + '.glb'), doc = await io.read(f), nodes = doc.getRoot().listNodes(), byName = new Map();
  for (const n of nodes) { const k = n.getName(); if (!byName.has(k)) byName.set(k, []); byName.get(k).push(n); }
  const pick = (nm) => { const m = /^(.*)\.(\d{3})$/.exec(nm), list = byName.get(nm) || (m && byName.get(m[1])); if (!list) return null; return byName.has(nm) ? list[0] : list[+m[2]] || null; };
  let done = 0;
  for (const [nm, d] of Object.entries(moves)) {
    for (const k of new Set([nm, nm.replace('_LOD0', '_LOD1')])) { const n = pick(k); if (!n) { if (k === nm) console.log('  no node', model, nm); continue; }
      const t = n.getTranslation(); n.setTranslation([t[0] + d[0], t[1] + d[1], t[2] + d[2]]); done++; } }
  await io.write(f, doc);
  if (db[model]) { db[model] = crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex').slice(0, 16); }
  console.log(model.padEnd(20), done, 'nodes moved');
}
fs.writeFileSync(DB, JSON.stringify(Object.fromEntries(Object.entries(db).sort()), null, 1));
