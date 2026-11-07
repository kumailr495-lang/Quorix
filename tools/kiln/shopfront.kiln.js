// LUMIERE - ground-floor shop across the road: stone pilasters, a deep fabric awning, full-height glazing on a black frame with a
// glowing interior, a recessed door and a blank sign band (the engine paints the shop name on it). 6 m wide (Z), 3.6 m high, front +X.
const meta = { name: 'LUMIERE shopfront', role: 'building' };
const MATS = {};
function mat(name, hex, rough = 0.6, metal = 0) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: rough, metalness: metal, name }); m.color.setHex(hex); MATS[name] = m; return m; }
function glow(name, hex) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: 1, metalness: 0, name, emissive: hex, emissiveIntensity: 1 }); m.color.setHex(hex); MATS[name] = m; return m; }
const uv = (g) => projectUV(g, { projection: 'box', metersPerUnit: 1 });
const cyl = (g) => projectUV(g, { projection: 'cylindrical', metersPerUnit: 1 });
async function rbox(w, h, d, r, seg = 3) { return uv(await roundedBoxGeo(w, h, d, Math.min(r, Math.min(w, h, d) / 2 - 0.0005), { segments: seg })); }
const part = (name, geo, m, position, parent, rotation, scale) => createPart(name, geo, m, { position, parent, ...(rotation ? { rotation } : {}), ...(scale ? { scale } : {}) });
async function build() {
  const root = createRoot('Shopfront'), stone = mat('stone_dark', 0x4a4038, 0.8), black = mat('blackmetal', 0x1c1c1f, 0.5, 0.6), awn = mat('awning_green', 0x1d4a3a, 0.9), brass = mat('brass', 0xc9a061, 0.3, 1);
  const W = 6, H = 3.6;
  for (const z of [-W / 2 + 0.25, W / 2 - 0.25]) part(z < 0 ? 'PilasterL' : 'PilasterR', await rbox(0.4, H, 0.5, 0.02, 2), stone, [-0.05, H / 2, z], root);
  part('SignBand', await rbox(0.3, 0.68, W - 0.5, 0.02, 2), stone, [-0.08, H - 0.35, 0], root);
  part('Plinth', uv(boxGeo(0.3, 0.35, W - 0.5)), stone, [-0.15, 0.175, 0], root);
  part('Interior', uv(boxGeo(0.01, H - 1.05, W - 0.5)), glow('glow_shop', 0xffd9a0), [-0.3, 0.35 + (H - 1.05) / 2, 0], root);
  const n = 4; for (let i = 0; i <= n; i++) { const z = -W / 2 + 0.5 + i * (W - 1) / n; part('Mullion' + i, uv(boxGeo(0.06, H - 1.05, 0.06)), black, [-0.12, 0.35 + (H - 1.05) / 2, z], root); }
  part('Transom', uv(boxGeo(0.045, 0.05, W - 0.52)), black, [-0.12, 2.3, 0], root);
  part('Awning', await rbox(1.1, 0.06, W - 0.3, 0.02, 2), awn, [0.45, H - 0.85, 0], root, [0, 0, -14]);
  part('Valance', uv(boxGeo(0.02, 0.22, W - 0.3)), awn, [0.98, H - 1.08, 0], root);
  for (const z of [-2, 0, 2]) part('AwnArm' + (z + 2), uv(cylinderGeo(0.012, 0.012, 1.1, 6)), black, [0.45, H - 0.95, z], root, [0, 0, 76]);
  part('DoorHandle', uv(cylinderGeo(0.012, 0.012, 0.5, 8)), brass, [-0.09, 1.1, 0.04], root);   // on the mullion beside the door
  return root;
}
