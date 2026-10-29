import { surfaceNets } from './surfacenets.js';
import { decimate } from './qem.js';
import { bake, health, zoneColor } from './bake.js';
import { snap } from './surfacenets.js';
import { skinWeights } from './skin.js';
// spec: { name, sdf, zones:[{f,color,var}], bounds:[x0,y0,z0,x1,y1,z1], h, lods:[tris...], ground }
export function buildPart(spec, log = () => {}) {
  const t0 = Date.now(); let fine = null, best = Infinity, tries = 0;
  // surface nets can create a rare non-manifold edge where two surfaces nearly touch: retry with a jittered grid origin until clean
  for (let k = 0; k < 8; k++) {
    const o = [k * 0.31, k * 0.17, k * 0.23].map((v) => v * spec.h); const b = spec.bounds;
    const m = surfaceNets(spec.sdf, [b[0] + o[0], b[1] + o[1], b[2] + o[2], b[3] + o[0], b[4] + o[1], b[5] + o[2]], spec.h); tries++;
    const hh = health(m); const bad = hh.nonManifold * 10 + hh.badWinding + hh.openEdges * 10 + (spec.multi ? 0 : (hh.pieces - 1) * 100);
    if (bad < best) { best = bad; fine = m; } if (bad === 0 || (k >= 2 && bad >= best)) break;
  }
  log(`  ${spec.name}: fine mesh ${fine.F.length / 3} tris, grid tries ${tries}, defects ${best} (${Date.now() - t0} ms)`);
  const out = []; let cur = fine;
  for (let i = 0; i < spec.lods.length; i++) {
    let m = cur;
    if (m.F.length / 3 > spec.lods[i]) {
      const n = m.P.length / 3, attr = new Float64Array(n * 3), tmp = [0, 0, 0];
      for (let v = 0; v < n; v++) { zoneColor(spec, m.P[3*v], m.P[3*v+1], m.P[3*v+2], tmp); attr[3*v] = tmp[0]; attr[3*v+1] = tmp[1]; attr[3*v+2] = tmp[2]; }
      let importance = null; if (spec.importance) { importance = new Float64Array(n); for (let v = 0; v < n; v++) importance[v] = spec.importance(m.P[3*v], m.P[3*v+1], m.P[3*v+2]); }
      const d = decimate(m.P, m.F, spec.lods[i], { attr, attrDim: 3, attrWeight: spec.attrWeight ?? 8, importance }); m = { P: d.P, F: d.F };
      snap(spec.sdf, m.P, spec.h * 2, 2);
      if (spec.ground !== false) for (let v = 0; v < m.P.length / 3; v++) if (m.P[3*v+1] < 0.9) m.P[3*v+1] = 0;
    }
    const hl = health(m);
    const baked = bake(m, spec); if (spec.skin) { const sw = skinWeights(m.P, spec.skin.bones, spec.skin.tau ?? 2.2, { skirt: spec.skin.skirt }); baked.joints = sw.joints; baked.weights = sw.weights; baked.scale = spec.exportScale || 1; }
    out.push({ name: `${spec.name}_LOD${i}`, mesh: m, baked, health: hl });
    log(`  LOD${i}: ${hl.tris} tris, ${hl.verts} verts, pieces ${hl.pieces}, open ${hl.openEdges}, nonmanifold ${hl.nonManifold}, minY ${hl.min[1].toFixed(2)}`);
    cur = m;
  }
  return out;
}
