// LUMIERE v7 - plaza bollard light: a 0.9 m turned bronze post with a glowing ring under its cap. Origin at the floor centre.
const meta = { name: 'LUMIERE bollard light', role: 'prop' };
const MATS = {};
function mat(name, hex, rough = 0.6, metal = 0) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: rough, metalness: metal, name }); m.color.setHex(hex); MATS[name] = m; return m; }
function glow(name, hex) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: 1, metalness: 0, name, emissive: hex, emissiveIntensity: 1 }); m.color.setHex(hex); MATS[name] = m; return m; }
const cyl = (g) => projectUV(g, { projection: 'cylindrical', metersPerUnit: 1 });
async function build() {
  const root = createRoot('Bollard'), bronze = mat('bronze', 0x5a4330, 0.45, 1), light = glow('glow_warm', 0xffd49a);
  createPart('Post', cyl(lathe([[0, 0], [0.085, 0], [0.085, 0.02], [0.07, 0.04], [0.07, 0.76], [0, 0.76]], 32)), bronze, { parent: root });
  createPart('Ring', cyl(lathe([[0.066, 0.765], [0.069, 0.765], [0.069, 0.83], [0.066, 0.83]], 32)), light, { parent: root });
  createPart('Cap', cyl(lathe([[0, 0.835], [0.09, 0.835], [0.092, 0.85], [0.06, 0.9], [0, 0.905]], 32)), bronze, { parent: root });
  return root;
}
