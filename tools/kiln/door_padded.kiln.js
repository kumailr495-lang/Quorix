// LUMIERE - padded cinema door (restrooms, staff): diamond-quilted leather leaf in a walnut frame, brass push plate and kick plate,
// round porthole window. 1.0 x 2.2 m leaf; wall-mounted with its back at X = 0, front +X.
const meta = { name: 'LUMIERE padded door', role: 'prop' };
const MATS = {};
function mat(name, hex, rough = 0.6, metal = 0) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: rough, metalness: metal, name }); m.color.setHex(hex); MATS[name] = m; return m; }
function glow(name, hex) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: 1, metalness: 0, name, emissive: hex, emissiveIntensity: 1 }); m.color.setHex(hex); MATS[name] = m; return m; }
const uv = (g) => projectUV(g, { projection: 'box', metersPerUnit: 1 });
const cyl = (g) => projectUV(g, { projection: 'cylindrical', metersPerUnit: 1 });
async function rbox(w, h, d, r, seg = 3) { return uv(await roundedBoxGeo(w, h, d, Math.min(r, Math.min(w, h, d) / 2 - 0.0005), { segments: seg })); }
const part = (name, geo, m, position, parent, rotation, scale) => createPart(name, geo, m, { position, parent, ...(rotation ? { rotation } : {}), ...(scale ? { scale } : {}) });
async function build() {
  const root = createRoot('DoorPadded'), walnut = mat('walnut', 0x6b4630, 0.4), lea = mat('leather_oxblood', 0x4e1418, 0.45), brass = mat('brass', 0xc9a061, 0.28, 1), glass = mat('glass', 0x2a3036, 0.05);
  const W = 1.0, H = 2.2;
  for (const [n, y, h, z, w] of [['Head', H + 0.04, 0.08, 0, W + 0.16], ['JambL', H / 2, H, -W / 2 - 0.04, 0.08], ['JambR', H / 2, H, W / 2 + 0.04, 0.08]]) part(n, await rbox(0.1, h, w, 0.015, 2), walnut, [0.05, y, z], root);
  part('Leaf', await rbox(0.05, H - 0.02, W - 0.01, 0.015, 2), lea, [0.03, H / 2, 0], root);
  for (let r = 0; r < 6; r++) for (let c = 0; c < 3; c++) { const y = 0.35 + r * 0.26 + (c % 2 ? 0.13 : 0), z = -0.3 + c * 0.3; if (y > 1.9 || (y > 1.3 && y < 1.75 && Math.abs(z) < 0.2)) continue;
    part(`Tuft${r}_${c}`, uv(sphereGeo(0.012, 6, 4)), brass, [0.058, y, z], root); }
  part('Porthole', cyl(cylinderGeo(0.15, 0.15, 0.012, 24)), glass, [0.056, 1.55, 0], root, [0, 0, 90]);
  part('PortRim', uv(torusGeo(0.15, 0.015, 6, 24)), brass, [0.058, 1.55, 0], root, [0, 90, 0]);
  part('PushPlate', await rbox(0.008, 0.32, 0.1, 0.003, 1), brass, [0.06, 1.05, 0.34], root);
  part('KickPlate', uv(boxGeo(0.006, 0.22, W - 0.08)), brass, [0.058, 0.13, 0], root);
  return root;
}
