// LUMIERE v9 - every room's baked model must match the room as built. world9.js draws a room's shell only when its bake hash
// (www/bake/index.json) equals the builder's hash (www/bake/<room>_x.json); a mismatch leaves the room without walls or floor (you would
// see straight through it), so a stale bake must never be committed. Re-bake with: sh tools/bake/bake9.sh <room>
// usage: node tools/dev/check-bakes.mjs [www]
import fs from 'node:fs'; import path from 'node:path';
const WWW = path.resolve(process.argv[2] || 'www'), B = path.join(WWW, 'bake'), idx = JSON.parse(fs.readFileSync(path.join(B, 'index.json'), 'utf8'));
const ROOMS = ['street', 'lobby', 'wc', 'corridor', 'spine', 'hallMax', 'hallCurve', 'hallClassic', 'hall270'];
let bad = 0;
for (const k of ROOMS) {
  const m = idx.rooms && idx.rooms[k], xf = path.join(B, k + '_x.json');
  if (!m) { console.log(`  ${k}: no bake in index.json`); bad++; continue; }
  if (!fs.existsSync(xf)) { console.log(`  ${k}: ${k}_x.json missing`); bad++; continue; }
  const x = JSON.parse(fs.readFileSync(xf, 'utf8'));
  if (x.hash !== m.hash) { console.log(`  ${k}: STALE bake (built ${x.hash}, baked ${m.hash}): the room would not be drawn`); bad++; }
  for (const f of [m.glb, ...(m.maps || []), m.probes].filter(Boolean)) if (!fs.existsSync(path.join(B, f))) { console.log(`  ${k}: ${f} missing`); bad++; }
}
if (bad) { console.log(`bakes: ${bad} problem(s)`); process.exit(1); }
console.log(`bakes: ${ROOMS.length} rooms match their builds`);
