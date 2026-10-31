// Build LUMIERE props with Kiln: node tools/kiln/build.mjs [name ...]   (no names = every tools/kiln/*.kiln.js)
// Needs a Kiln authoring workspace (free, MIT, runs on Node 22):
//   mkdir kiln-install && cd kiln-install && npm init -y && npm install @instruktlabs/kiln
//   npx --offline --no -- kiln-init ../kiln-ws --harness claude
//   KILN_WS=/path/to/kiln-ws node tools/kiln/build.mjs
// Writes www/models/<name>.glb and, with REVIEW=dir, Kiln's CPU geometry sheet <dir>/<name>.png. Prints triangles, size, findings.
// Material review with the real library textures: LIB=1 node tools/dev/view-glb.mjs out.png www/models/<name>.glb
import { execFileSync } from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path';
const ROOT = path.resolve(new URL('../..', import.meta.url).pathname), SRC = path.join(ROOT, 'tools/kiln'), OUT = path.join(ROOT, 'www/models');
const WS = process.env.KILN_WS; if (!WS || !fs.existsSync(path.join(WS, 'kiln.mjs'))) { console.error('set KILN_WS to a Kiln workspace (see the header of this file)'); process.exit(2); }
const names = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync(SRC).filter((f) => f.endsWith('.kiln.js')).map((f) => f.replace('.kiln.js', ''));
fs.mkdirSync(OUT, { recursive: true }); let bad = 0;
for (const n of names) {
  const args = [path.join(WS, 'kiln.mjs'), 'render', path.join(SRC, n + '.kiln.js'), '--out', path.join(OUT, n + '.glb'), '--json'];
  if (process.env.REVIEW) { fs.mkdirSync(process.env.REVIEW, { recursive: true }); args.push('--views', path.join(process.env.REVIEW, n + '.png')); }
  let d; try { d = JSON.parse(execFileSync('node', args, { cwd: WS, encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'pipe'] })); }
  catch (e) { const out = (e.stdout || '') + (e.stderr || ''); try { d = JSON.parse(e.stdout); } catch (e2) { console.log(n.padEnd(22), 'FAILED', out.slice(0, 1200)); bad++; continue; } }
  if (!d.ok) { console.log(n.padEnd(22), 'FAILED', JSON.stringify(d.blockers || d.error || d).slice(0, 1500)); bad++; continue; }
  const s = d.bounds.size.map((v) => v.toFixed(2)).join(' x '), f = d.findings ? ` findings ${JSON.stringify(d.findings)}` : '', w = (d.warnings || []).length ? ` warnings ${JSON.stringify(d.warnings).slice(0, 300)}` : '';
  console.log(n.padEnd(22), `tris ${String(d.tris).padStart(6)}  size ${s} m  ${(d.glbBytes / 1024).toFixed(0)} KB  ref ${d.programRef}${f}${w}`);
}
process.exit(bad ? 1 : 0);
