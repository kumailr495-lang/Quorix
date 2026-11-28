// LUMIERE - back bar, 5.6 m: walnut base cabinets with a marble top, a mirrored back with three glass shelves lit from below,
// about forty bottles in several shapes and colours, a walnut and brass cornice. Wall-mounted: back at X = -0.45, front +X.
const meta = { name: 'LUMIERE back bar', role: 'prop' };
const MATS = {};
function mat(name, hex, rough = 0.6, metal = 0) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: rough, metalness: metal, name }); m.color.setHex(hex); MATS[name] = m; return m; }
function glow(name, hex) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: 1, metalness: 0, name, emissive: hex, emissiveIntensity: 1 }); m.color.setHex(hex); MATS[name] = m; return m; }
const uv = (g) => projectUV(g, { projection: 'box', metersPerUnit: 1 });
const cyl = (g) => projectUV(g, { projection: 'cylindrical', metersPerUnit: 1 });
async function rbox(w, h, d, r, seg = 3) { return uv(await roundedBoxGeo(w, h, d, Math.min(r, Math.min(w, h, d) / 2 - 0.0005), { segments: seg })); }
const part = (name, geo, m, position, parent, rotation, scale) => createPart(name, geo, m, { position, parent, ...(rotation ? { rotation } : {}), ...(scale ? { scale } : {}) });
async function build() {
  const root = createRoot('BackBar'), walnut = mat('walnut', 0x6b4630, 0.4), marble = mat('marble_nero', 0xffffff, 0.12), brass = mat('brass', 0xc9a061, 0.3, 1), mirror = mat('mirror', 0xd8dce0, 0.08, 1), shelf = mat('glass', 0x2a3036, 0.05), black = mat('lacquer_black', 0x141416, 0.3);
  const L = 5.6, D = 0.45;
  part('Cabinet', await rbox(D, 0.88, L, 0.015, 2), walnut, [-0.225 + 0.0, 0.44, 0], root);
  for (let i = 0; i < 7; i++) part('Door' + i, uv(boxGeo(0.01, 0.66, L / 7 - 0.04)), black, [0.0, 0.48, -L / 2 + (i + 0.5) * L / 7], root);
  part('Top', await rbox(D + 0.04, 0.04, L + 0.02, 0.012, 2), marble, [-0.205, 0.9, 0], root);
  part('Mirror', uv(boxGeo(0.02, 1.7, L - 0.2)), mirror, [-0.43, 1.85, 0], root);
  for (const z of [-L / 2 + 0.05, L / 2 - 0.05]) part(z < 0 ? 'SideL' : 'SideR', uv(boxGeo(0.4, 2.0, 0.08)), walnut, [-0.25, 1.9, z], root);
  part('Cornice', await rbox(0.46, 0.18, L + 0.06, 0.02, 2), walnut, [-0.22, 2.97, 0], root);
  part('CorniceTrim', uv(boxGeo(0.02, 0.025, L + 0.06)), brass, [0.02, 2.9, 0], root);
  const rng = seededRandom(17), r = () => rng.range(0, 1), cols = [['glass_amber', 0x6a4a22], ['glass', 0x2a3036], ['bottle_green', 0x1f4a2a], ['bottle_clear', 0xd8e4e8]];
  for (const [k, y] of [[0, 1.25], [1, 1.75], [2, 2.25]]) {
    part('Shelf' + k, uv(boxGeo(0.28, 0.02, L - 0.3)), shelf, [-0.27, y, 0], root);
    part('ShelfLed' + k, uv(boxGeo(0.01, 0.008, L - 0.34)), glow('glow_warm', 0xffc07a), [-0.15, y - 0.016, 0], root);
    for (let i = 0; i < 14; i++) { const z = -L / 2 + 0.35 + i * ((L - 0.7) / 13) + (r() - 0.5) * 0.08, c = cols[Math.floor(r() * cols.length)], h = 0.22 + r() * 0.12, rad = 0.035 + r() * 0.015, m = mat(c[0], c[1], 0.1);
      part(`Bottle${k}_${i}`, cyl(cylinderGeo(rad, rad, h, 10)), m, [-0.28, y + 0.01 + h / 2, z], root);
      part(`Neck${k}_${i}`, cyl(cylinderGeo(0.012, rad * 0.8, 0.09, 8)), m, [-0.28, y + 0.01 + h + 0.045, z], root); }
  }
  return root;
}
