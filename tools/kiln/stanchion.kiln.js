// LUMIERE - classic cinema queue post: brass post with a ball finial and a rope hook, weighted black-and-brass base. 0.95 m tall.
const meta = { name: 'LUMIERE stanchion', role: 'prop' };
const MATS = {};
function mat(name, hex, rough = 0.6, metal = 0) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: rough, metalness: metal, name }); m.color.setHex(hex); MATS[name] = m; return m; }
const cyl = (g) => projectUV(g, { projection: 'cylindrical', metersPerUnit: 1 });
const uv = (g) => projectUV(g, { projection: 'box', metersPerUnit: 1 });
async function build() {
  const root = createRoot('Stanchion'), brass = mat('brass', 0xc9a061, 0.25, 1), black = mat('blackmetal', 0x1c1c1f, 0.5, 0.6);
  createPart('Base', cyl(cylinderGeo(0.15, 0.17, 0.035, 24)), black, { position: [0, 0.0175, 0], parent: root });
  createPart('BaseCap', cyl(cylinderGeo(0.08, 0.13, 0.04, 24)), brass, { position: [0, 0.055, 0], parent: root });
  createPart('Post', cyl(cylinderGeo(0.022, 0.026, 0.82, 12)), brass, { position: [0, 0.48, 0], parent: root });
  createPart('Collar', cyl(cylinderGeo(0.032, 0.032, 0.04, 12)), brass, { position: [0, 0.88, 0], parent: root });
  createPart('Ball', cyl(sphereGeo(0.045, 14, 10)), brass, { position: [0, 0.94, 0], parent: root });
  for (const z of [-1, 1]) createPart(`Hook${z}`, uv(torusGeo(0.02, 0.005, 5, 10)), brass, { position: [0, 0.85, z * 0.035], parent: root });
  return root;
}
