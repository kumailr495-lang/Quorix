// LUMIERE - round side table: Nero Marquina top with a brass edge, brass pedestal on a stepped base. Top at 0.55 m.
const meta = { name: 'LUMIERE side table', role: 'prop' };
const MATS = {};
function mat(name, hex, rough = 0.6, metal = 0) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: rough, metalness: metal, name }); m.color.setHex(hex); MATS[name] = m; return m; }
const cyl = (g) => projectUV(g, { projection: 'cylindrical', metersPerUnit: 1 });
const uv = (g) => projectUV(g, { projection: 'box', metersPerUnit: 1 });
async function build() {
  const root = createRoot('SideTable'), marble = mat('marble_nero', 0xffffff, 0.12), brass = mat('brass', 0xc9a061, 0.3, 1);
  createPart('Top', cyl(cylinderGeo(0.3, 0.3, 0.03, 32)), marble, { position: [0, 0.535, 0], parent: root });
  createPart('Edge', uv(torusGeo(0.3, 0.012, 6, 32)), brass, { position: [0, 0.535, 0], rotation: [90, 0, 0], parent: root });
  createPart('Stem', cyl(cylinderGeo(0.03, 0.04, 0.48, 12)), brass, { position: [0, 0.28, 0], parent: root });
  createPart('Base', cyl(cylinderGeo(0.17, 0.2, 0.04, 24)), brass, { position: [0, 0.02, 0], parent: root });
  return root;
}
