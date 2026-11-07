// LUMIERE - ring chandelier over the lobby island: a 2.7 m radius brushed-brass ring with a glowing inner diffuser band, hung on four
// cables from a ceiling canopy. Origin at the ring centre; cables rise 0.75 m.
const meta = { name: 'LUMIERE ring chandelier', role: 'prop' };
const MATS = {};
function mat(name, hex, rough = 0.6, metal = 0) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: rough, metalness: metal, name }); m.color.setHex(hex); MATS[name] = m; return m; }
function glow(name, hex) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: 1, metalness: 0, name, emissive: hex, emissiveIntensity: 1 }); m.color.setHex(hex); MATS[name] = m; return m; }
const uv = (g) => projectUV(g, { projection: 'box', metersPerUnit: 1 });
const cyl = (g) => projectUV(g, { projection: 'cylindrical', metersPerUnit: 1 });
async function rbox(w, h, d, r, seg = 3) { return uv(await roundedBoxGeo(w, h, d, Math.min(r, Math.min(w, h, d) / 2 - 0.0005), { segments: seg })); }
const part = (name, geo, m, position, parent, rotation, scale) => createPart(name, geo, m, { position, parent, ...(rotation ? { rotation } : {}), ...(scale ? { scale } : {}) });
async function build() {
  const root = createRoot('ChandelierRing'), brass = mat('brass', 0xc9a061, 0.28, 1), black = mat('blackmetal', 0x1c1c1f, 0.5, 0.6);
  part('Ring', uv(torusGeo(2.7, 0.06, 10, 96)), brass, [0, 0, 0], root, [90, 0, 0]);
  const ring = (r) => Array.from({ length: 96 }, (_, i) => [Math.cos((i / 96) * Math.PI * 2) * r, Math.sin((i / 96) * Math.PI * 2) * r]);
  part('Diffuser', uv(await extrudeProfile(ring(2.66), { holes: [ring(2.5).reverse()], depth: 0.012, axis: 'y', center: false })), glow('glow_warm', 0xffd8a8), [0, -0.05, 0], root);   // a glowing annulus under the ring
  part('InnerLip', uv(torusGeo(2.62, 0.02, 6, 96)), brass, [0, -0.06, 0], root, [90, 0, 0]);
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + Math.PI / 4, x = Math.cos(a) * 2.7, z = Math.sin(a) * 2.7;
    part('Cable' + i, cyl(cylinderGeo(0.004, 0.004, 0.68, 6)), black, [x, 0.39, z], root);
    part('Canopy' + i, cyl(cylinderGeo(0.05, 0.05, 0.02, 12)), brass, [x, 0.74, z], root); }   // top flush under the ceiling, never on its plane
  return root;
}
