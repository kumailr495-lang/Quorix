// LUMIERE - tall planter: glossy black cylinder pot with a brass rim, snake plant of 14 tapered blades. About 1.5 m tall.
const meta = { name: 'LUMIERE tall planter', role: 'prop' };
const MATS = {};
function mat(name, hex, rough = 0.6, metal = 0) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: rough, metalness: metal, name }); m.color.setHex(hex); MATS[name] = m; return m; }
const cyl = (g) => projectUV(g, { projection: 'cylindrical', metersPerUnit: 1 });
const uv = (g) => projectUV(g, { projection: 'box', metersPerUnit: 1 });
async function build() {
  const root = createRoot('PlanterTall'), pot = mat('lacquer_black', 0x141416, 0.2), brass = mat('brass', 0xc9a061, 0.3, 1), soil = mat('soil', 0x2b2119, 0.9), leaf = mat('plant', 0x2f5a2a, 0.6);
  createPart('Pot', cyl(cylinderGeo(0.24, 0.2, 0.7, 28)), pot, { position: [0, 0.35, 0], parent: root });
  createPart('Rim', uv(torusGeo(0.24, 0.012, 6, 28)), brass, { position: [0, 0.7, 0], rotation: [90, 0, 0], parent: root });
  createPart('Soil', cyl(cylinderGeo(0.225, 0.225, 0.02, 24)), soil, { position: [0, 0.67, 0], parent: root });
  const rng = seededRandom(11), r = () => rng.range(0, 1);
  for (let i = 0; i < 14; i++) {
    const a = r() * 360, d = r() * 0.12, h = 0.55 + r() * 0.45, tilt = 4 + r() * 12;
    const blade = await extrudeProfile([[-0.035, 0], [0.035, 0], [0.02, h * 0.7], [0, h], [-0.02, h * 0.7]], { depth: 0.012, axis: 'z' });
    createPart(`Blade${i}`, uv(blade), leaf, { position: [Math.cos((a * Math.PI) / 180) * d, 0.67, Math.sin((a * Math.PI) / 180) * d], rotation: [tilt * Math.sin((a * Math.PI) / 180), -a, tilt * Math.cos((a * Math.PI) / 180)], parent: root });
  }
  return root;
}
