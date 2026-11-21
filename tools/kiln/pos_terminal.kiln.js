// LUMIERE - counter card terminal: weighted base, swivel neck, angled screen with glow, card reader on the side. Sits on a counter.
const meta = { name: 'LUMIERE card terminal', role: 'prop' };
const MATS = {};
function mat(name, hex, rough = 0.6, metal = 0) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: rough, metalness: metal, name }); m.color.setHex(hex); MATS[name] = m; return m; }
function glow(name, hex) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: 1, metalness: 0, name, emissive: hex, emissiveIntensity: 1 }); m.color.setHex(hex); MATS[name] = m; return m; }
const uv = (g) => projectUV(g, { projection: 'box', metersPerUnit: 1 });
const cyl = (g) => projectUV(g, { projection: 'cylindrical', metersPerUnit: 1 });
async function rbox(w, h, d, r, seg = 3) { return uv(await roundedBoxGeo(w, h, d, Math.min(r, Math.min(w, h, d) / 2 - 0.0005), { segments: seg })); }
const part = (name, geo, m, position, parent, rotation, scale) => createPart(name, geo, m, { position, parent, ...(rotation ? { rotation } : {}), ...(scale ? { scale } : {}) });
async function build() {
  const root = createRoot('PosTerminal'), black = mat('plastic_black', 0x18181a, 0.4), steel = mat('steel', 0x9a9ca2, 0.35, 1);
  part('Base', cyl(cylinderGeo(0.08, 0.09, 0.03, 18)), steel, [0, 0.015, 0], root);
  part('Neck', cyl(cylinderGeo(0.018, 0.022, 0.16, 10)), steel, [0, 0.1, 0], root);
  const head = createPivot('Head', [0, 0.2, 0], root); head.rotation.z = (-30 * Math.PI) / 180;
  part('Housing', await rbox(0.035, 0.2, 0.26, 0.012, 2), black, [0, 0, 0], head);
  part('Screen', uv(boxGeo(0.005, 0.16, 0.22)), glow('glow_screen', 0xbfd8ff), [0.019, 0, 0], head);
  part('Reader', await rbox(0.14, 0.04, 0.08, 0.012, 2), black, [0.04, 0.035, 0.11], root);
  return root;
}
