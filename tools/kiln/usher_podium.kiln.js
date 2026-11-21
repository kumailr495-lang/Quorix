// LUMIERE - usher's guide podium: walnut lectern with a sloped top, brass edge, a brass reading lamp with a glowing shade,
// black plinth. 1.15 m tall, front +X (the usher stands behind it at -X).
const meta = { name: 'LUMIERE usher podium', role: 'prop' };
const MATS = {};
function mat(name, hex, rough = 0.6, metal = 0) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: rough, metalness: metal, name }); m.color.setHex(hex); MATS[name] = m; return m; }
function glow(name, hex) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: 1, metalness: 0, name, emissive: hex, emissiveIntensity: 1 }); m.color.setHex(hex); MATS[name] = m; return m; }
const uv = (g) => projectUV(g, { projection: 'box', metersPerUnit: 1 });
const cyl = (g) => projectUV(g, { projection: 'cylindrical', metersPerUnit: 1 });
async function rbox(w, h, d, r, seg = 3) { return uv(await roundedBoxGeo(w, h, d, Math.min(r, Math.min(w, h, d) / 2 - 0.0005), { segments: seg })); }
const part = (name, geo, m, position, parent, rotation, scale) => createPart(name, geo, m, { position, parent, ...(rotation ? { rotation } : {}), ...(scale ? { scale } : {}) });
async function build() {
  const root = createRoot('UsherPodium'), walnut = mat('walnut', 0x6b4630, 0.4), brass = mat('brass', 0xc9a061, 0.28, 1), black = mat('lacquer_black', 0x141416, 0.3);
  part('Plinth', await rbox(0.56, 0.06, 0.7, 0.02, 1), black, [0, 0.03, 0], root);
  part('Body', await extrudeProfile([[-0.24, 0], [0.24, 0], [0.2, 1.02], [-0.22, 1.1]], { depth: 0.6, axis: 'z', bevel: 0.02 }), walnut, [0, 0.06, 0], root);
  part('Top', await rbox(0.5, 0.03, 0.66, 0.01, 2), walnut, [-0.01, 1.18, 0], root, [0, 0, -11]);
  part('TopEdge', cyl(cylinderGeo(0.01, 0.01, 0.64, 8)), brass, [0.23, 1.14, 0], root, [90, 0, 0]);
  for (let i = 0; i < 3; i++) part('Band' + i, uv(boxGeo(0.005, 0.015, 0.58)), brass, [0.226 - i * 0.006, 0.3 + i * 0.25, 0], root);
  part('LampStem', uv(pipeAlongPath([[-0.18, 1.16, 0.2], [-0.18, 1.42, 0.2], [-0.02, 1.48, 0.2]], 0.008, { bendRadius: 0.06, tubularSegments: 10, radialSegments: 6 })), brass, null, root);
  part('Shade', cyl(cylinderGeo(0.03, 0.07, 0.07, 14)), brass, [0.02, 1.45, 0.2], root);
  part('Bulb', cyl(cylinderGeo(0.06, 0.06, 0.004, 14)), glow('glow_warm', 0xffc888), [0.02, 1.413, 0.2], root);
  return root;
}
