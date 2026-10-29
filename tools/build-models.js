import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { buildPart } from './lib/pipeline.js'; import { writeGLB } from './lib/glb.js';
const here = path.dirname(fileURLToPath(import.meta.url)); const outDir = path.join(here, '..', 'www', 'models');
fs.mkdirSync(outDir, { recursive: true });
const only = process.argv.slice(2); const registry = JSON.parse(fs.readFileSync(path.join(here, 'models', 'registry.json'), 'utf8'));
let report = {}; try { report = JSON.parse(fs.readFileSync(path.join(outDir, '_report.json'), 'utf8')); } catch (e) {}
for (const entry of registry) {
  if (only.length && !only.includes(entry.name)) continue;
  const mod = await import(`./models/${entry.module}.js`); const parts = [].concat(mod[entry.fn]());
  const items = []; console.log(`# ${entry.name}`);
  for (const spec of parts) for (const lod of buildPart(spec, console.log)) items.push({ ...lod.baked, name: lod.name, extras: { tris: lod.health.tris, glow: !!spec.glow } });
  const sk = parts.find((q) => q.skin); const skeleton = sk ? { scale: sk.exportScale || 1, bones: sk.skin.bones.map((b) => ({ name: b.name, parent: b.parent, pos: b.pos })) } : undefined;
  const buf = writeGLB(items, { name: entry.name, skeleton, meta: { generator: 'lumiere-v3', units: 'm', front: '+z', floor: 'y=0' } });
  fs.writeFileSync(path.join(outDir, entry.name + '.glb'), buf); report[entry.name] = { bytes: buf.length, lods: items.map((i) => ({ name: i.name, tris: i.extras.tris })) };
  console.log(`  -> ${entry.name}.glb ${(buf.length / 1024).toFixed(0)} KB`);
}
fs.writeFileSync(path.join(outDir, '_report.json'), JSON.stringify(report, null, 1));
