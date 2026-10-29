// LUMIERE - arm standard shared by two cinema seats: powder-coated side panel, walnut arm cap, brass-rimmed cup holder.
// Kiln frame: +X = the seats' facing direction, +Y up, +Z right; centred on the seat boundary, floor at Y = 0. LOD1 = panel + cap.
const meta = { name: 'LUMIERE arm standard', role: 'prop' };
const MATS = {};
function mat(name, hex, rough = 0.6, metal = 0) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: rough, metalness: metal, name }); m.color.setHex(hex); MATS[name] = m; return m; }
const uv = (g) => projectUV(g, { projection: 'box', metersPerUnit: 1 });
async function rbox(w, h, d, r, seg = 3) { return uv(await roundedBoxGeo(w, h, d, r, { segments: seg })); }
async function arm(g, lod) {
  const panel = mat('charcoal', 0x26262b, 0.5, 0.6), walnut = mat('walnut', 0x6b4630, 0.4), brass = mat('brass', 0xc9a061, 0.3, 1), black = mat('plastic_black', 0x18181a, 0.4);
  createPart('Panel', await rbox(0.54, 0.58, 0.055, 0.015, lod ? 1 : 3), panel, { position: [-0.04, 0.29, 0], parent: g });
  createPart('Cap', await rbox(0.58, 0.035, 0.085, 0.014, lod ? 1 : 3), walnut, { position: [0.0, 0.6, 0], parent: g });
  if (lod) return;
  createPart('Foot', await rbox(0.42, 0.016, 0.11, 0.005), panel, { position: [-0.05, 0.008, 0], parent: g });
  createPart('CupRim', uv(torusGeo(0.036, 0.006, 6, 18)), brass, { position: [0.19, 0.62, 0], rotation: [90, 0, 0], parent: g });
  createPart('CupWell', uv(cylinderGeo(0.034, 0.03, 0.06, 14)), black, { position: [0.19, 0.6, 0], parent: g });
}
async function build() {
  const root = createRoot('ArmStandard'), tiers = [];
  const coverage = (r, d) => (Math.PI * (r / (2 * d * Math.tan((25 * Math.PI) / 180))) ** 2) / (16 / 9);
  for (const lod of [0, 1]) { const g = new THREE.Group(); g.name = `Body_LOD${lod}`; root.add(g); await arm(g, lod); tiers.push(g); }
  defineLod(tiers, { screenCoverage: [coverage(0.4, 9), coverage(0.4, 60)] });
  return root;
}
