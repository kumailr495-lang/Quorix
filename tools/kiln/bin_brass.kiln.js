// LUMIERE - waste bin: walnut-slat cylinder, brass domed top with a push flap, black base. 0.9 m tall.
const meta = { name: 'LUMIERE bin', role: 'prop' };
const MATS = {};
function mat(name, hex, rough = 0.6, metal = 0) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: rough, metalness: metal, name }); m.color.setHex(hex); MATS[name] = m; return m; }
function glow(name, hex) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: 1, metalness: 0, name, emissive: hex, emissiveIntensity: 1 }); m.color.setHex(hex); MATS[name] = m; return m; }
const uv = (g) => projectUV(g, { projection: 'box', metersPerUnit: 1 });
const cyl = (g) => projectUV(g, { projection: 'cylindrical', metersPerUnit: 1 });
async function rbox(w, h, d, r, seg = 3) { return uv(await roundedBoxGeo(w, h, d, Math.min(r, Math.min(w, h, d) / 2 - 0.0005), { segments: seg })); }
const part = (name, geo, m, position, parent, rotation, scale) => createPart(name, geo, m, { position, parent, ...(rotation ? { rotation } : {}), ...(scale ? { scale } : {}) });
async function build() {
  const root = createRoot('BinBrass'), walnut = mat('walnut', 0x6b4630, 0.4), brass = mat('brass', 0xc9a061, 0.28, 1), black = mat('blackmetal', 0x1c1c1f, 0.5, 0.6);
  part('Base', cyl(cylinderGeo(0.2, 0.21, 0.06, 20)), black, [0, 0.03, 0], root);
  const n = 18; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; part('Slat' + i, uv(boxGeo(0.03, 0.7, 0.05)), walnut, [Math.cos(a) * 0.18, 0.42, Math.sin(a) * 0.18], root, [0, (-a * 180) / Math.PI, 0]); }
  part('Core', cyl(cylinderGeo(0.165, 0.165, 0.72, 18)), black, [0, 0.42, 0], root);
  part('Dome', cyl(await revolveProfile([[0, 0.12], [0.08, 0.115], [0.16, 0.08], [0.205, 0.02], [0.205, 0], [0, 0]], { segments: 24 })), brass, [0, 0.78, 0], root);
  part('Flap', await rbox(0.03, 0.08, 0.16, 0.01, 2), black, [0.17, 0.84, 0], root, [0, 0, 35]);
  return root;
}
