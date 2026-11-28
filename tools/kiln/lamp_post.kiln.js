// LUMIERE - street lamp: cast base with a fluted collar, tapered pole, swan-neck arm, lantern head with a glowing lens. 6 m, front +X.
const meta = { name: 'LUMIERE lamp post', role: 'prop' };
const MATS = {};
function mat(name, hex, rough = 0.6, metal = 0) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: rough, metalness: metal, name }); m.color.setHex(hex); MATS[name] = m; return m; }
function glow(name, hex) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: 1, metalness: 0, name, emissive: hex, emissiveIntensity: 1 }); m.color.setHex(hex); MATS[name] = m; return m; }
const uv = (g) => projectUV(g, { projection: 'box', metersPerUnit: 1 });
const cyl = (g) => projectUV(g, { projection: 'cylindrical', metersPerUnit: 1 });
async function rbox(w, h, d, r, seg = 3) { return uv(await roundedBoxGeo(w, h, d, Math.min(r, Math.min(w, h, d) / 2 - 0.0005), { segments: seg })); }
const part = (name, geo, m, position, parent, rotation, scale) => createPart(name, geo, m, { position, parent, ...(rotation ? { rotation } : {}), ...(scale ? { scale } : {}) });
async function build() {
  const root = createRoot('LampPost'), iron = mat('blackmetal', 0x1c1c1f, 0.45, 0.7);
  part('Base', cyl(cylinderGeo(0.18, 0.24, 0.5, 16)), iron, [0, 0.25, 0], root);
  part('Collar', cyl(cylinderGeo(0.12, 0.16, 0.25, 16)), iron, [0, 0.62, 0], root);
  part('Pole', cyl(cylinderGeo(0.055, 0.085, 5.2, 12)), iron, [0, 3.35, 0], root);
  part('Arm', uv(pipeAlongPath([[0, 5.8, 0], [0.15, 6.1, 0], [0.55, 6.15, 0], [0.85, 6.0, 0]], 0.035, { bendRadius: 0.15, tubularSegments: 16, radialSegments: 8 })), iron, null, root);
  part('Head', await rbox(0.5, 0.18, 0.36, 0.05, 2), iron, [0.9, 5.88, 0], root);
  part('Lens', uv(boxGeo(0.4, 0.02, 0.28)), glow('glow_lamp', 0xffd7a0), [0.9, 5.78, 0], root);
  part('Finial', cyl(sphereGeo(0.07, 10, 8)), iron, [0, 5.95, 0], root);
  return root;
}
