// LUMIERE v14e - a third detail tier for the hall seats and arms (the user, 11-27: "the app is laggy"). A full MAX draws ~450 seats; past
// 11 m each one is a few pixels, yet it cost the 528-720 triangles of its LOD1. This adds <part>_LOD2 nodes beside each _LOD1: the LOD1
// mesh copied (its own accessors) and simplified with meshoptimizer (gltf-transform simplifyPrimitive; per primitive, so material
// boundaries stay). world9.js buildHall draws LOD2 past the preset's far distance. Run from the repo root:
//   node tools/lod2.mjs www/models/seat_rocker.glb ...   (writes the files in place; re-running replaces the LOD2 nodes)
import { NodeIO } from './kiln/.kiln-install/node_modules/@gltf-transform/core/dist/index.js';
import { simplifyPrimitive, weld } from './kiln/.kiln-install/node_modules/@gltf-transform/functions/dist/index.js';
import { MeshoptSimplifier } from './kiln/.kiln-install/node_modules/meshoptimizer/index.js';
import { ALL_EXTENSIONS } from './kiln/.kiln-install/node_modules/@gltf-transform/extensions/dist/index.js';

const RATIO = +(process.env.LOD2_RATIO || 0.3), ERR = +(process.env.LOD2_ERR || 0.02);
await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);   // keep KHR_materials_emissive_strength and the rest as they are
for (const f of process.argv.slice(2)) {
  const doc = await io.read(f), root = doc.getRoot();
  for (const n of root.listNodes()) if (/_LOD2$/.test(n.getName())) { const m = n.getMesh(); n.dispose(); if (m && !m.listParents().some((p) => p.propertyType === 'Node')) m.dispose(); }
  let before = 0, after = 0;
  for (const n of root.listNodes()) {
    if (!/_LOD1$/.test(n.getName()) || !n.getMesh()) continue;
    const src = n.getMesh(), mesh = doc.createMesh(src.getName().replace(/LOD1/, 'LOD2'));
    for (const p of src.listPrimitives()) {
      const q = doc.createPrimitive().setMode(p.getMode()).setMaterial(p.getMaterial());
      for (const sem of p.listSemantics()) { const a = p.getAttribute(sem); q.setAttribute(sem, doc.createAccessor().setType(a.getType()).setArray(a.getArray().slice()).setNormalized(a.getNormalized()).setBuffer(a.getBuffer())); }
      const ix = p.getIndices(); if (ix) q.setIndices(doc.createAccessor().setType('SCALAR').setArray(ix.getArray().slice()).setBuffer(ix.getBuffer()));
      const tri = (r) => (r.getIndices() ? r.getIndices().getCount() : r.getAttribute('POSITION').getCount()) / 3; before += tri(q);
      simplifyPrimitive(q, { simplifier: MeshoptSimplifier, ratio: RATIO, error: ERR, lockBorder: false }); after += tri(q); mesh.addPrimitive(q);
    }
    const n2 = doc.createNode(n.getName().replace(/_LOD1$/, '_LOD2')).setMesh(mesh).setTranslation(n.getTranslation()).setRotation(n.getRotation()).setScale(n.getScale());
    const par = n.getParentNode(); if (par) par.addChild(n2); else for (const s of root.listScenes()) if (s.listChildren().includes(n)) s.addChild(n2);
  }
  await io.write(f, doc); console.log(f, 'LOD1', before, '-> LOD2', after, 'triangles');
}
