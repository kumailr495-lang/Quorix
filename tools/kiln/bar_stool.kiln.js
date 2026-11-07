// LUMIERE - bar stool: round velvet seat with a welt, brass column and foot ring, weighted black base. Seat top at 0.76 m.
const meta = { name: 'LUMIERE bar stool', role: 'prop' };
const MATS = {};
function mat(name, hex, rough = 0.6, metal = 0) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: rough, metalness: metal, name }); m.color.setHex(hex); MATS[name] = m; return m; }
const cyl = (g) => projectUV(g, { projection: 'cylindrical', metersPerUnit: 1 });
const uv = (g) => projectUV(g, { projection: 'box', metersPerUnit: 1 });
async function build() {
  const root = createRoot('BarStool'), v = mat('velvet_teal', 0x1d5a56, 0.9), brass = mat('brass', 0xc9a061, 0.3, 1), black = mat('blackmetal', 0x1c1c1f, 0.5, 0.6);
  createPart('Base', cyl(cylinderGeo(0.2, 0.22, 0.03, 24)), black, { position: [0, 0.015, 0], parent: root });
  createPart('Column', cyl(cylinderGeo(0.025, 0.03, 0.66, 12)), brass, { position: [0, 0.36, 0], parent: root });
  createPart('FootRing', uv(torusGeo(0.17, 0.012, 6, 24)), brass, { position: [0, 0.3, 0], rotation: [90, 0, 0], parent: root });
  for (let i = 0; i < 4; i++) { const a = (i / 4) * 360; createPart(`Spoke${i}`, cyl(cylinderGeo(0.008, 0.008, 0.15, 6)), brass, { position: [Math.cos((a * Math.PI) / 180) * 0.09, 0.3, Math.sin((a * Math.PI) / 180) * 0.09], rotation: [0, -a, 90], parent: root }); }
  createPart('SeatPan', cyl(cylinderGeo(0.19, 0.17, 0.04, 24)), black, { position: [0, 0.69, 0], parent: root });
  createPart('Cushion', cyl(cylinderGeo(0.2, 0.2, 0.07, 28)), v, { position: [0, 0.735, 0], parent: root });
  createPart('Welt', uv(torusGeo(0.2, 0.012, 6, 28)), v, { position: [0, 0.77, 0], rotation: [90, 0, 0], parent: root });
  return root;
}
