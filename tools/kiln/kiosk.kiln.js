// LUMIERE - self-service ticket kiosk: walnut-clad pedestal on a black plinth, angled glowing touch screen in a black bezel,
// brass trim band, card reader. 1.5 m tall, front +X.
const meta = { name: 'LUMIERE kiosk', role: 'prop' };
const MATS = {};
function mat(name, hex, rough = 0.6, metal = 0) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: rough, metalness: metal, name }); m.color.setHex(hex); MATS[name] = m; return m; }
function glow(name, hex) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: 1, metalness: 0, name, emissive: hex, emissiveIntensity: 1 }); m.color.setHex(hex); MATS[name] = m; return m; }
const uv = (g) => projectUV(g, { projection: 'box', metersPerUnit: 1 });
const cyl = (g) => projectUV(g, { projection: 'cylindrical', metersPerUnit: 1 });
async function rbox(w, h, d, r, seg = 3) { return uv(await roundedBoxGeo(w, h, d, Math.min(r, Math.min(w, h, d) / 2 - 0.0005), { segments: seg })); }
const part = (name, geo, m, position, parent, rotation, scale) => createPart(name, geo, m, { position, parent, ...(rotation ? { rotation } : {}), ...(scale ? { scale } : {}) });
async function build() {
  const root = createRoot('Kiosk'), walnut = mat('walnut', 0x6b4630, 0.4), black = mat('lacquer_black', 0x141416, 0.3), brass = mat('brass', 0xc9a061, 0.3, 1);
  part('Plinth', await rbox(0.5, 0.08, 0.6, 0.02, 1), black, [0, 0.04, 0], root);
  part('Body', await rbox(0.36, 1.0, 0.52, 0.04, 3), walnut, [0, 0.58, 0], root);
  part('Trim', uv(boxGeo(0.37, 0.02, 0.53)), brass, [0, 1.06, 0], root);
  const head = createPivot('Head', [0.0, 1.15, 0], root); head.rotation.z = (-24 * Math.PI) / 180;
  part('Bezel', await rbox(0.07, 0.52, 0.58, 0.02, 2), black, [0, 0.2, 0], head);
  part('Screen', uv(boxGeo(0.01, 0.42, 0.48)), glow('glow_screen', 0xbfd8ff), [0.037, 0.2, 0], head);
  part('Reader', await rbox(0.12, 0.08, 0.14, 0.02, 2), black, [0.2, 0.98, 0.14], root);
  return root;
}
