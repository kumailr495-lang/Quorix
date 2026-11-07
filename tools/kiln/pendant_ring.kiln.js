// LUMIERE v7 - bar pendant: a 0.86 m brushed-brass ring with a glowing inner band, hung on three fine cables from a brass ceiling cup
// DROP m above it (5.2 m: the lobby bar's 7.5 m ceiling puts the ring 1.2 m over the counter). Origin at the ring centre.
const meta = { name: 'LUMIERE ring pendant', role: 'prop' };
const MATS = {};
function mat(name, hex, rough = 0.6, metal = 0) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: rough, metalness: metal, name }); m.color.setHex(hex); MATS[name] = m; return m; }
function glow(name, hex) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: 1, metalness: 0, name, emissive: hex, emissiveIntensity: 1 }); m.color.setHex(hex); MATS[name] = m; return m; }
const uv = (g) => projectUV(g, { projection: 'box', metersPerUnit: 1 });
const cyl = (g) => projectUV(g, { projection: 'cylindrical', metersPerUnit: 1 });
async function build() {
  const root = createRoot('PendantRing'), brass = mat('brass', 0xc9a061, 0.26, 1), black = mat('blackmetal', 0x1c1c1f, 0.5, 0.6), light = glow('glow_warm', 0xffdcaa);
  const R = 0.43, DROP = 5.2, circ = (r, y, n = 64) => Array.from({ length: n }, (_, k) => [r * Math.cos(k / n * Math.PI * 2), y, r * Math.sin(k / n * Math.PI * 2)]);
  createPart('Ring', uv(sweepProfile([[-0.022, -0.03], [0.022, -0.03], [0.022, 0.03], [-0.022, 0.03]], circ(R, 0), { closed: true, up: [0, 1, 0], creaseAngle: 40 })), brass, { parent: root });
  createPart('Band', uv(sweepProfile([[-0.004, -0.024], [0.004, -0.024], [0.004, 0.024], [-0.004, 0.024]], circ(R - 0.026, 0), { closed: true, up: [0, 1, 0] })), light, { parent: root });
  for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2, x = Math.cos(a) * R, z = Math.sin(a) * R;
    createPart('Cable' + i, uv(pipeAlongPath([[x, 0.03, z], [Math.cos(a) * 0.045, DROP - 0.035, Math.sin(a) * 0.045]], 0.0025, { tubularSegments: 2, radialSegments: 5 })), black, { parent: root }); }
  createPart('Cup', cyl(cylinderGeo(0.06, 0.075, 0.035, 20)), brass, { position: [0, DROP - 0.0175, 0], parent: root });
  return root;
}
