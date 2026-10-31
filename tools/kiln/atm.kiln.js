// LUMIERE v8 - freestanding ATM for the plaza (phone feedback: an ATM with a withdrawal limit). Brushed steel and black lacquer tower on a
// plinth, a lit "ATM" header, a recessed hooded screen, a sloped keypad shelf with keys, card and cash slots with green guide lights.
// 1.72 m tall, front +X, floor at Y = 0.
const meta = { name: 'LUMIERE ATM', role: 'prop' };
const MATS = {};
function mat(name, hex, rough = 0.6, metal = 0) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: rough, metalness: metal, name }); m.color.setHex(hex); MATS[name] = m; return m; }
function glow(name, hex) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: 1, metalness: 0, name, emissive: hex, emissiveIntensity: 1 }); m.color.setHex(hex); MATS[name] = m; return m; }
const uv = (g) => projectUV(g, { projection: 'box', metersPerUnit: 1 });
async function rbox(w, h, d, r, seg = 3) { return uv(await roundedBoxGeo(w, h, d, Math.min(r, Math.min(w, h, d) / 2 - 0.0005), { segments: seg })); }
const part = (name, geo, m, position, parent, rotation) => createPart(name, geo, m, { position, parent, ...(rotation ? { rotation } : {}) });
async function build() {
  const root = createRoot('Atm'), steel = mat('steel', 0x9a9ea4, 0.32, 1), black = mat('lacquer_black', 0x121214, 0.28), brass = mat('brass', 0xc9a061, 0.3, 1), rubber = mat('rubber', 0x1b1b1d, 0.8);
  part('Plinth', await rbox(0.62, 0.06, 0.74, 0.015, 1), black, [0, 0.03, 0], root);
  part('Tower', await rbox(0.5, 1.5, 0.66, 0.035, 3), steel, [-0.02, 0.81, 0], root);
  part('Face', await rbox(0.06, 1.3, 0.6, 0.02, 2), black, [0.235, 0.83, 0], root);
  // header lightbox with the ATM sign (the engine lays the text on the glow face)
  part('Header', await rbox(0.52, 0.16, 0.68, 0.02, 2), black, [-0.01, 1.64, 0], root);
  part('glowHeader', uv(boxGeo(0.006, 0.1, 0.56)), glow('glow_sign', 0x7fd0ff), [0.255, 1.64, 0], root);
  part('TrimTop', uv(boxGeo(0.53, 0.012, 0.69)), brass, [-0.01, 1.555, 0], root);
  // hooded screen
  part('Hood', await rbox(0.16, 0.36, 0.5, 0.015, 2), black, [0.31, 1.27, 0], root);
  part('glowScreen', uv(boxGeo(0.006, 0.26, 0.4)), glow('glow_screen', 0x9fd8ff), [0.392, 1.25, 0], root);
  // keypad shelf, tilted toward the user
  const shelf = createPivot('Shelf', [0.32, 1.0, 0], root); shelf.rotation.z = (-18 * Math.PI) / 180;
  part('ShelfTop', await rbox(0.2, 0.03, 0.52, 0.01, 2), steel, [0, 0, 0], shelf);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) part(`Key${r}${c}`, await rbox(0.034, 0.012, 0.042, 0.004, 1), rubber, [0.055 - r * 0.036, 0.0225, -0.06 + c * 0.05 - 0.09], shelf);
  for (let r = 0; r < 3; r++) part(`Fn${r}`, await rbox(0.034, 0.012, 0.06, 0.004, 1), mat(['key_red', 'key_amber', 'key_green'][r], [0xb3262c, 0xd49a2a, 0x2f8f4e][r], 0.6), [0.055 - r * 0.036, 0.0225, 0.115], shelf);
  // card reader and cash slot with guide lights
  part('Reader', await rbox(0.07, 0.07, 0.12, 0.012, 2), black, [0.3, 1.07, 0.2], root);
  part('glowCard', uv(boxGeo(0.004, 0.012, 0.07)), glow('glow_green', 0x4dff9a), [0.338, 1.07, 0.2], root);
  part('CashBox', await rbox(0.06, 0.07, 0.3, 0.012, 2), black, [0.282, 0.86, 0], root);
  part('glowCash', uv(boxGeo(0.004, 0.01, 0.24)), glow('glow_green', 0x4dff9a), [0.315, 0.86, 0], root);
  part('Kick', uv(boxGeo(0.02, 0.1, 0.58)), brass, [0.27, 0.11, 0], root);
  return root;
}
