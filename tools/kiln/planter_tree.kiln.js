// LUMIERE - centre-island tree planter: wide round planter clad in walnut slats with a brass rim, an olive-like tree (forked trunk,
// clustered low-poly canopy). About 3.2 m tall, planter radius 0.9 m (sits inside the banquette ring).
const meta = { name: 'LUMIERE tree planter', role: 'prop' };
const MATS = {};
function mat(name, hex, rough = 0.6, metal = 0) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: rough, metalness: metal, name }); m.color.setHex(hex); MATS[name] = m; return m; }
const cyl = (g) => projectUV(g, { projection: 'cylindrical', metersPerUnit: 1 });
const uv = (g) => projectUV(g, { projection: 'box', metersPerUnit: 1 });
async function build() {
  const root = createRoot('PlanterTree'), walnut = mat('walnut', 0x6b4630, 0.45), brass = mat('brass', 0xc9a061, 0.3, 1), soil = mat('soil', 0x2b2119, 0.9), bark = mat('walnut_dark', 0x3e2618, 0.8), leaf = mat('plant', 0x3d5a35, 0.7);
  createPart('Planter', cyl(cylinderGeo(0.95, 0.9, 0.6, 40)), walnut, { position: [0, 0.3, 0], parent: root });
  createPart('Rim', uv(torusGeo(0.95, 0.02, 6, 40)), brass, { position: [0, 0.6, 0], rotation: [90, 0, 0], parent: root });
  createPart('Soil', cyl(cylinderGeo(0.93, 0.93, 0.02, 32)), soil, { position: [0, 0.58, 0], parent: root });
  createPart('Trunk', uv(pipeAlongPath([[0, 0.55, 0], [0.05, 1.3, 0.02], [0.02, 1.9, -0.03]], 0.07, { tubularSegments: 8, radialSegments: 8 })), bark, { parent: root });
  createPart('Fork1', uv(pipeAlongPath([[0.03, 1.6, 0], [0.4, 2.3, 0.2], [0.55, 2.6, 0.25]], 0.035, { tubularSegments: 6, radialSegments: 6 })), bark, { parent: root });
  createPart('Fork2', uv(pipeAlongPath([[0.02, 1.8, -0.02], [-0.35, 2.4, -0.2], [-0.5, 2.75, -0.2]], 0.035, { tubularSegments: 6, radialSegments: 6 })), bark, { parent: root });
  const rng = seededRandom(5), r = () => rng.range(0, 1), centres = [[0.55, 2.7, 0.25], [-0.5, 2.85, -0.2], [0.0, 2.95, 0.0], [0.3, 2.5, -0.35], [-0.3, 2.55, 0.35], [0.0, 2.25, 0.4]];
  centres.forEach((c, i) => { for (let k = 0; k < 3; k++) createPart(`Leaf${i}_${k}`, cyl(sphereGeo(0.28 + r() * 0.12, 7, 5)), leaf, { position: [c[0] + (r() - 0.5) * 0.3, c[1] + (r() - 0.5) * 0.2, c[2] + (r() - 0.5) * 0.3], scale: [1, 0.7, 1], parent: root }); });
  return root;
}
