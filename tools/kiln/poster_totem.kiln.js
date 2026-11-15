// LUMIERE v7 - double-sided poster lightbox for the plaza and the lobby: a black satin-metal box with a brass frame round each face, on a
// recessed plinth. Faces at +X and -X; the engine hangs a lit poster on each face (world9.js TOTEM_POSTERS: 0.80 x 1.22 m, centre at
// Y = 1.26, 7 mm in front of the box face: 2 mm in front of the poster bed, 3 mm behind the frame's face).
// v11 (the user: no floating or disconnected parts, no shared faces): the box is tall enough for its frame (the frame and its poster bed
// stuck up 7 cm past the box's top), the frame bars are set 8 mm into the box (they hung 5 mm off it) and stand 10 mm proud, the bed stands
// 5 mm proud inside the frame, 2 mm behind the poster, the cap sits on the box (no faces in a plane with any other part)
const meta = { name: 'LUMIERE poster totem', role: 'prop' };
const MATS = {};
function mat(name, hex, rough = 0.6, metal = 0) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: rough, metalness: metal, name }); m.color.setHex(hex); MATS[name] = m; return m; }
const uv = (g) => projectUV(g, { projection: 'box', metersPerUnit: 1 });
async function build() {
  const root = createRoot('PosterTotem'), black = mat('blackmetal', 0x1c1c1f, 0.45, 0.6), brass = mat('brass', 0xc9a061, 0.26, 1), screen = mat('screen_black', 0x0a0a0c, 0.3);
  const BX = 0.08, Y0 = 0.16, Y1 = 1.96, BZ = 0.48;   // the box: x +-0.08, y 0.16..1.96, z +-0.48
  createPart('Plinth', uv(await roundedBoxGeo(0.3, 0.16, 0.86, 0.02, { segments: 3 })), black, { position: [0, 0.08, 0], parent: root });
  createPart('Box', uv(await roundedBoxGeo(2 * BX, Y1 - Y0 + 0.01, 2 * BZ, 0.03, { segments: 4 })), black, { position: [0, (Y0 - 0.01 + Y1) / 2, 0], parent: root });   // 1 cm into the plinth
  for (const s of [-1, 1]) {
    const y = 1.26, W = 0.86, H = 1.30, t = 0.02, x0 = BX - 0.008, x1 = BX + 0.01;   // the frame: 8 mm into the box, 10 mm proud
    for (const [dy, dz, w, h] of [[H / 2 - t / 2, 0, W, t], [-H / 2 + t / 2, 0, W, t], [0, W / 2 - t / 2, t, H - 2 * t], [0, -W / 2 + t / 2, t, H - 2 * t]])
      createPart(`Frame${s}_${dy.toFixed(2)}_${dz.toFixed(2)}`, uv(boxGeo(x1 - x0, h, w)), brass, { position: [s * (x0 + x1) / 2, y + dy, dz], parent: root });
    createPart('Bed' + s, uv(boxGeo(0.008, H - 2 * t + 0.004, W - 2 * t + 0.004)), screen, { position: [s * (BX + 0.001), y, 0], parent: root });   // 3 mm in, 5 mm out; its edges 2 mm into the frame
  }
  createPart('Cap', uv(await roundedBoxGeo(0.18, 0.03, 0.98, 0.012, { segments: 3 })), brass, { position: [0, Y1 + 0.005, 0], parent: root });   // 1 cm into the box's top
  return root;
}
