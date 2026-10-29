// LUMIERE - lobby column: walnut drum with 24 real (geometric) flutes, brass plinth and capital bands, warm uplight ring at the top.
// Kiln frame: +Y up, centred on the column axis, floor at Y = 0. Height in P.h (column_fluted_5 is the 5 m concourse copy).
const meta = { name: 'LUMIERE fluted column 5m', role: 'prop' };
const P = { h: 5.0, r: 0.36, flutes: 24, depth: 0.022 };
const MATS = {};
function mat(name, hex, rough = 0.6, metal = 0) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: rough, metalness: metal, name }); m.color.setHex(hex); MATS[name] = m; return m; }
function glow(name, hex) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: 1, metalness: 0, name, emissive: hex, emissiveIntensity: 1 }); m.color.setHex(hex); MATS[name] = m; return m; }
const cyl = (g) => projectUV(g, { projection: 'cylindrical', metersPerUnit: 1 });
const uv = (g) => projectUV(g, { projection: 'box', metersPerUnit: 1 });
async function build() {
  const root = createRoot('ColumnFluted'), walnut = mat('walnut', 0x6b4630, 0.4), brass = mat('brass', 0xc9a061, 0.3, 1);
  const pts = [], N = P.flutes * 8;
  for (let i = 0; i < N; i++) { const t = (i / N) * Math.PI * 2, f = (i % 8) / 8, k = Math.min(1, Math.max(0, (f - 0.1) / 0.8)), r = P.r - P.depth * Math.sin(Math.PI * k); pts.push([Math.cos(t) * r, Math.sin(t) * r]); }
  const shaftH = P.h - 0.5;
  const shaft = await extrudeProfile(pts, { depth: shaftH, axis: 'y', center: false });
  createPart('Shaft', cyl(shaft), walnut, { position: [0, 0.2, 0], parent: root });
  createPart('Plinth', cyl(cylinderGeo(P.r + 0.05, P.r + 0.06, 0.2, 32)), brass, { position: [0, 0.1, 0], parent: root });
  createPart('BaseRing', uv(torusGeo(P.r + 0.005, 0.012, 6, 32)), brass, { position: [0, 0.215, 0], rotation: [90, 0, 0], parent: root });
  createPart('Capital', cyl(cylinderGeo(P.r + 0.07, P.r + 0.03, 0.3, 32)), brass, { position: [0, P.h - 0.15, 0], parent: root });
  createPart('Uplight', uv(torusGeo(P.r + 0.075, 0.012, 6, 32)), glow('glow_warm', 0xffc888), { position: [0, P.h - 0.31, 0], rotation: [90, 0, 0], parent: root });
  return root;
}
