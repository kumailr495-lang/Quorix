// LUMIERE - brass dish pendant (as in the Everyman bars): shallow spun-brass dish, glowing diffuser underneath, cord and canopy.
// Hangs from Y = 0 (ceiling) downwards; the dish rim is 1.2 m below the ceiling.
const meta = { name: 'LUMIERE dish pendant', role: 'prop' };
const MATS = {};
function mat(name, hex, rough = 0.6, metal = 0) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: rough, metalness: metal, name }); m.color.setHex(hex); MATS[name] = m; return m; }
function glow(name, hex) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: 1, metalness: 0, name, emissive: hex, emissiveIntensity: 1 }); m.color.setHex(hex); MATS[name] = m; return m; }
const cyl = (g) => projectUV(g, { projection: 'cylindrical', metersPerUnit: 1 });
const uv = (g) => projectUV(g, { projection: 'box', metersPerUnit: 1 });
async function build() {
  const root = createRoot('PendantDish'), brass = mat('brass', 0xc9a061, 0.28, 1), black = mat('blackmetal', 0x1c1c1f, 0.5, 0.6);
  createPart('Canopy', cyl(cylinderGeo(0.06, 0.06, 0.03, 16)), brass, { position: [0, -0.015, 0], parent: root });
  createPart('Cord', cyl(cylinderGeo(0.004, 0.004, 1.1, 5)), black, { position: [0, -0.58, 0], parent: root });
  createPart('Hub', cyl(cylinderGeo(0.03, 0.05, 0.06, 16)), brass, { position: [0, -1.15, 0], parent: root });
  createPart('Dish', cyl(await revolveProfile([[0.04, 0.03], [0.25, -0.035], [0.252, -0.042], [0.04, 0.018]], { segments: 32 })), brass, { position: [0, -1.2, 0], parent: root });
  createPart('Rim', uv(torusGeo(0.25, 0.006, 5, 32)), brass, { position: [0, -1.235, 0], rotation: [90, 0, 0], parent: root });
  createPart('Diffuser', cyl(cylinderGeo(0.2, 0.2, 0.004, 24)), glow('glow_warm', 0xffd8a0), { position: [0, -1.226, 0], parent: root });
  return root;
}
