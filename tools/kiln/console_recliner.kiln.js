// LUMIERE - console between two recliners: black leather sides, velvet arm pad, brass cup holder, warm LED underglow (aisle light).
// Kiln frame: +X = facing direction, +Y up, +Z right; centred on the seat boundary, floor at Y = 0. 0.16 m wide.
const meta = { name: 'LUMIERE recliner console', role: 'prop' };
const MATS = {};
function mat(name, hex, rough = 0.6, metal = 0) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: rough, metalness: metal, name }); m.color.setHex(hex); MATS[name] = m; return m; }
function glow(name, hex) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: 1, metalness: 0, name, emissive: hex, emissiveIntensity: 1 }); m.color.setHex(hex); MATS[name] = m; return m; }
const uv = (g) => projectUV(g, { projection: 'box', metersPerUnit: 1 });
async function rbox(w, h, d, r, seg = 3) { return uv(await roundedBoxGeo(w, h, d, r, { segments: seg })); }
async function con(g, lod) {
  const lea = mat('leather_black', 0x1c1a1a, 0.45), v = mat('velvet_burgundy', 0x6e1424, 0.9), brass = mat('brass', 0xc9a061, 0.3, 1), black = mat('plastic_black', 0x18181a, 0.4), plinth = mat('blackmetal', 0x1c1c1f, 0.5, 0.6);
  createPart('Body', await rbox(0.78, 0.5, 0.16, 0.03, lod ? 1 : 3), lea, { position: [0.0, 0.31, 0], parent: g });
  createPart('Pad', await rbox(0.72, 0.07, 0.17, 0.03, lod ? 1 : 3), v, { position: [-0.02, 0.595, 0], parent: g });
  if (lod) return;
  createPart('Plinth', await rbox(0.74, 0.06, 0.13, 0.01, 1), plinth, { position: [0.0, 0.03, 0], parent: g });
  createPart('CupRim', uv(torusGeo(0.038, 0.006, 6, 18)), brass, { position: [0.27, 0.632, 0], rotation: [90, 0, 0], parent: g });
  createPart('CupWell', uv(cylinderGeo(0.036, 0.032, 0.07, 14)), black, { position: [0.27, 0.6, 0], parent: g });
  for (const sz of [-1, 1]) createPart(sz < 0 ? 'GlowL' : 'GlowR', uv(boxGeo(0.6, 0.012, 0.004)), glow('glow_warm', 0xffb070), { position: [0.0, 0.065, sz * 0.081], parent: g });
}
async function build() {
  const root = createRoot('ConsoleRecliner'), tiers = [];
  const coverage = (r, d) => (Math.PI * (r / (2 * d * Math.tan((25 * Math.PI) / 180))) ** 2) / (16 / 9);
  for (const lod of [0, 1]) { const g = new THREE.Group(); g.name = `Body_LOD${lod}`; root.add(g); await con(g, lod); tiers.push(g); }
  defineLod(tiers, { screenCoverage: [coverage(0.4, 9), coverage(0.4, 60)] });
  return root;
}
