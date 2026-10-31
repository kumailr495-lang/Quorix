// LUMIERE - pick-and-mix wall: walnut frame, four rows of five clear bins full of brightly coloured sweets, brass scoop rail,
// glowing header. 1.7 m wide (Z), 2.0 m high, wall-mounted with its back at X = -0.3, front +X.
const meta = { name: 'LUMIERE candy wall', role: 'prop' };
const MATS = {};
function mat(name, hex, rough = 0.6, metal = 0) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: rough, metalness: metal, name }); m.color.setHex(hex); MATS[name] = m; return m; }
function glow(name, hex) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: 1, metalness: 0, name, emissive: hex, emissiveIntensity: 1 }); m.color.setHex(hex); MATS[name] = m; return m; }
const uv = (g) => projectUV(g, { projection: 'box', metersPerUnit: 1 });
const cyl = (g) => projectUV(g, { projection: 'cylindrical', metersPerUnit: 1 });
async function rbox(w, h, d, r, seg = 3) { return uv(await roundedBoxGeo(w, h, d, Math.min(r, Math.min(w, h, d) / 2 - 0.0005), { segments: seg })); }
const part = (name, geo, m, position, parent, rotation, scale) => createPart(name, geo, m, { position, parent, ...(rotation ? { rotation } : {}), ...(scale ? { scale } : {}) });
async function build() {
  const root = createRoot('CandyWall'), walnut = mat('walnut', 0x6b4630, 0.4), glass = mat('glass', 0x2a3036, 0.05), brass = mat('brass', 0xc9a061, 0.3, 1), black = mat('lacquer_black', 0x141416, 0.3);
  const W = 1.7, H = 2.0, candies = [['candy_pink', 0xe0558a], ['candy_yellow', 0xf2c230], ['candy_green', 0x4caf50], ['candy_blue', 0x3a7bd5], ['candy_orange', 0xf07a2a], ['candy_red', 0xc62a36]];
  part('Back', uv(boxGeo(0.04, H - 0.01, W - 0.02)), black, [-0.28, (H - 0.01) / 2, 0], root);
  for (const z of [-W / 2 + 0.03, W / 2 - 0.03]) part(z < 0 ? 'SideL' : 'SideR', await rbox(0.32, H, 0.06, 0.01, 1), walnut, [-0.134, H / 2, z], root);
  part('Header', await rbox(0.34, 0.23, W - 0.004, 0.02, 2), walnut, [-0.125, H - 0.12, 0], root);
  part('HeaderGlow', uv(boxGeo(0.01, 0.1, W - 0.2)), glow('glow_white', 0xfff2dc), [0.045, H - 0.12, 0], root);
  const rng = seededRandom(23), r = () => rng.range(0, 1);
  for (let row = 0; row < 4; row++) { const y = 0.35 + row * 0.36; part('Ledge' + row, uv(boxGeo(0.3, 0.025, W - 0.12)), walnut, [-0.13, y - 0.02, 0], root);
    for (let i = 0; i < 5; i++) { const z = -W / 2 + 0.17 + i * ((W - 0.34) / 4), c = candies[Math.floor(r() * candies.length)];
      const m = mat(c[0], c[1], 0.3), fh = 0.08 + r() * 0.05; part(`Fill${row}_${i}`, uv(boxGeo(0.22, fh, 0.25)), m, [-0.12, y + fh / 2, z], root);
      for (let k = 0; k < 3; k++) part(`Heap${row}_${i}_${k}`, uv(sphereGeo(0.075 + r() * 0.02, 8, 5)), m, [-0.12 + (r() - 0.5) * 0.08, y + fh, z + (k - 1) * 0.075], root, [0, r() * 360, 0], [1, 0.55, 1]);   // heaped sweets above the rim
      part(`Lip${row}_${i}`, uv(boxGeo(0.01, 0.07, 0.27)), brass, [0.0, y + 0.035, z], root); } }   // bins open to the front: the sweets show, a brass lip holds them
  part('ScoopRail', cyl(cylinderGeo(0.012, 0.012, W - 0.06, 8)), brass, [0.0, 0.2, 0], root, [90, 0, 0]);
  return root;
}
