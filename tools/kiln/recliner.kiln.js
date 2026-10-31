// LUMIERE - Screen 2 recliner: burgundy velvet, deep seat box on a recessed black plinth, quilted back with three horizontal rolls
// and a headrest pillow, stowed footrest panel. The consoles between recliners are console_recliner (n + 1 per row).
// Kiln frame: +X = facing direction, +Y up, +Z right, floor at Y = 0. Body 0.70 m wide (0.86 m centre to centre with 0.16 m consoles).
const meta = { name: 'LUMIERE recliner', role: 'prop' };
const MATS = {};
function mat(name, hex, rough = 0.6, metal = 0) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: rough, metalness: metal, name }); m.color.setHex(hex); MATS[name] = m; return m; }
const uv = (g) => projectUV(g, { projection: 'box', metersPerUnit: 1 });
async function rbox(w, h, d, r, seg = 3) { return uv(await roundedBoxGeo(w, h, d, r, { segments: seg })); }
const W = 0.70;
async function body(g, lod) {
  const v = mat('velvet_burgundy', 0x6e1424, 0.9), plinth = mat('blackmetal', 0x1c1c1f, 0.5, 0.6), s = lod ? 1 : 3;
  createPart('Plinth', await rbox(0.74, 0.1, W - 0.04, 0.02, 1), plinth, { position: [-0.03, 0.05, 0], parent: g });
  createPart('Box', await rbox(0.8, 0.27, W, 0.05, s), v, { position: [0.0, 0.235, 0], parent: g });
  createPart('Cushion', await rbox(0.62, 0.15, W - 0.06, 0.065, s), v, { position: [0.07, 0.43, 0], parent: g });
  const back = createPivot('Back', [-0.3, 0.36, 0], g); back.rotation.z = (14 * Math.PI) / 180;
  createPart('BackBody', await rbox(0.2, 0.78, W, 0.07, s), v, { position: [-0.04, 0.39, 0], parent: back });
  if (lod) return;
  createPart('Footrest', await rbox(0.07, 0.24, W - 0.08, 0.03), v, { position: [0.415, 0.24, 0], parent: g });
  for (let i = 0; i < 3; i++) createPart(`Roll${i}`, await rbox(0.09, 0.2, W - 0.08, 0.04), v, { position: [0.09, 0.13 + i * 0.205, 0], parent: back });
  createPart('Pillow', await rbox(0.12, 0.17, W - 0.16, 0.055), v, { position: [0.1, 0.72, 0], parent: back });
}
async function build() {
  const root = createRoot('Recliner'), tiers = [];
  const coverage = (r, d) => (Math.PI * (r / (2 * d * Math.tan((25 * Math.PI) / 180))) ** 2) / (16 / 9);
  for (const lod of [0, 1]) { const g = new THREE.Group(); g.name = `Body_LOD${lod}`; root.add(g); await body(g, lod); tiers.push(g); }
  defineLod(tiers, { screenCoverage: [coverage(0.7, 10), coverage(0.7, 60)] });
  return root;
}
