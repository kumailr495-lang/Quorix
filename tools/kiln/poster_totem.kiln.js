// LUMIERE v7 - double-sided poster lightbox for the plaza and the lobby: a black satin-metal box with a brass frame line round each face,
// on a recessed plinth. Faces at +X and -X; the engine lays the lit poster texture on each face (0.80 x 1.20 m, centre at Y = 1.24).
const meta = { name: 'LUMIERE poster totem', role: 'prop' };
const MATS = {};
function mat(name, hex, rough = 0.6, metal = 0) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: rough, metalness: metal, name }); m.color.setHex(hex); MATS[name] = m; return m; }
const uv = (g) => projectUV(g, { projection: 'box', metersPerUnit: 1 });
async function build() {
  const root = createRoot('PosterTotem'), black = mat('blackmetal', 0x1c1c1f, 0.45, 0.6), brass = mat('brass', 0xc9a061, 0.26, 1), screen = mat('screen_black', 0x0a0a0c, 0.3);
  createPart('Plinth', uv(await roundedBoxGeo(0.3, 0.16, 0.86, 0.02, { segments: 3 })), black, { position: [0, 0.08, 0], parent: root });
  createPart('Box', uv(await roundedBoxGeo(0.16, 1.66, 0.96, 0.03, { segments: 4 })), black, { position: [0, 0.16 + 0.83, 0], parent: root });
  for (const s of [-1, 1]) {   // a brass frame line round each face, standing 2 mm proud of the box, and the dark poster bed inside it
    const x = s * 0.0815, y = 1.24, W = 0.86, H = 1.3, t = 0.014;
    for (const [dy, dz, w, h] of [[H / 2 - t / 2, 0, W, t], [-H / 2 + t / 2, 0, W, t], [0, W / 2 - t / 2, t, H - 2 * t], [0, -W / 2 + t / 2, t, H - 2 * t]])
      createPart(`Frame${s}_${dy.toFixed(2)}_${dz.toFixed(2)}`, uv(boxGeo(0.004, h, w)), brass, { position: [x, y + dy, dz], parent: root });
    createPart('Bed' + s, uv(boxGeo(0.002, H - 2 * t, W - 2 * t)), screen, { position: [s * 0.0805, y, 0], parent: root });
  }
  createPart('Cap', uv(await roundedBoxGeo(0.18, 0.03, 0.98, 0.012, { segments: 3 })), brass, { position: [0, 1.82 + 0.015, 0], parent: root });
  return root;
}
