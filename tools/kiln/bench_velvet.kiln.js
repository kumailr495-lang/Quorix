// LUMIERE - lobby bench: channel-tufted velvet seat cushion on a walnut box base, brass tapered legs, slim brass end rails.
// 2.0 m long (Z), seat at 0.46 m. Sitters face +X.
const meta = { name: 'LUMIERE velvet bench', role: 'prop' };
const MATS = {};
function mat(name, hex, rough = 0.6, metal = 0) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: rough, metalness: metal, name }); m.color.setHex(hex); MATS[name] = m; return m; }
function glow(name, hex) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: 1, metalness: 0, name, emissive: hex, emissiveIntensity: 1 }); m.color.setHex(hex); MATS[name] = m; return m; }
const uv = (g) => projectUV(g, { projection: 'box', metersPerUnit: 1 });
const cyl = (g) => projectUV(g, { projection: 'cylindrical', metersPerUnit: 1 });
async function rbox(w, h, d, r, seg = 3) { return uv(await roundedBoxGeo(w, h, d, Math.min(r, Math.min(w, h, d) / 2 - 0.0005), { segments: seg })); }
const part = (name, geo, m, position, parent, rotation, scale) => createPart(name, geo, m, { position, parent, ...(rotation ? { rotation } : {}), ...(scale ? { scale } : {}) });
async function build() {
  const root = createRoot('BenchVelvet'), v = mat('velvet_teal', 0x1d5a56, 0.9), walnut = mat('walnut', 0x6b4630, 0.4), brass = mat('brass', 0xc9a061, 0.3, 1);
  const L = 2.0, D = 0.5;
  part('Base', await rbox(D, 0.16, L, 0.02, 2), walnut, [0, 0.27, 0], root);
  const n = 6; for (let i = 0; i < n; i++) part('Cushion' + i, await rbox(D - 0.04, 0.12, L / n - 0.008, 0.05, 3), v, [0, 0.4, -L / 2 + (i + 0.5) * L / n], root);
  for (const x of [-D / 2 + 0.06, D / 2 - 0.06]) for (const z of [-L / 2 + 0.08, L / 2 - 0.08]) part(`Leg${x > 0 ? 'F' : 'B'}${z > 0 ? 'R' : 'L'}`, cyl(cylinderGeo(0.022, 0.012, 0.19, 10)), brass, [x, 0.095, z], root);
  for (const z of [-L / 2 - 0.004, L / 2 + 0.004]) part(z < 0 ? 'EndL' : 'EndR', uv(boxGeo(D - 0.02, 0.012, 0.008)), brass, [0, 0.35, z], root);
  return root;
}
