// LUMIERE v7 - the lobby bar's back wall (docs/V7-DESIGN.md): black lacquer base cabinet with a Nero marble top, three tall backlit honey-onyx
// panels between brass fins, glass shelves with bottles (turned profiles: wine, spirits, gin, liqueur), black header with a brass line.
// 5.6 m long (Z), 3.4 m tall; front = +X; the wall side is at X = -0.55. Origin at the floor, front-centre of the cabinet.
const meta = { name: 'LUMIERE onyx back bar', role: 'prop' };
const MATS = {};
function mat(name, hex, rough = 0.6, metal = 0) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: rough, metalness: metal, name }); m.color.setHex(hex); MATS[name] = m; return m; }
const uv = (g) => projectUV(g, { projection: 'box', metersPerUnit: 1 });
const cyl = (g) => projectUV(g, { projection: 'cylindrical', metersPerUnit: 1 });
const P = { L: 5.6, D: 0.55, baseH: 0.9, top: 3.4, panels: 3, shelves: [1.42, 1.98, 2.54] };
const BOTTLES = {   // [radius, height] profile points of each shape, from the base up to the lip
  wine: [[0, 0], [0.037, 0], [0.038, 0.005], [0.038, 0.2], [0.03, 0.235], [0.014, 0.26], [0.014, 0.31], [0.016, 0.315], [0, 0.315]],
  spirit: [[0, 0], [0.042, 0], [0.044, 0.006], [0.044, 0.17], [0.04, 0.19], [0.018, 0.21], [0.016, 0.255], [0.019, 0.26], [0, 0.26]],
  gin: [[0, 0], [0.05, 0], [0.052, 0.008], [0.052, 0.14], [0.045, 0.16], [0.02, 0.18], [0.02, 0.215], [0.023, 0.22], [0, 0.22]],
  liqueur: [[0, 0], [0.032, 0], [0.034, 0.006], [0.036, 0.11], [0.04, 0.16], [0.03, 0.2], [0.013, 0.24], [0.013, 0.28], [0, 0.28]],
};
const COLORS = ['glass_amber', 'bottle_green', 'bottle_clear', 'glass_amber', 'bottle_clear', 'glass_amber'], HEX = { glass_amber: 0x6a4a22, bottle_green: 0x1f4a2a, bottle_clear: 0x9aa8ae };
async function build() {
  const root = createRoot('BackBarOnyx'), black = mat('lacquer_black', 0x141416, 0.18), marble = mat('marble_nero', 0xffffff, 0.08), brass = mat('brass', 0xc9a061, 0.26, 1);
  const onyx = mat('onyx_lit', 0xffffff, 0.12), glass = mat('glass', 0x2a3036, 0.05);
  createPart('Cabinet', uv(await roundedBoxGeo(P.D - 0.02, P.baseH - 0.08, P.L, 0.012, { segments: 2 })), black, { position: [-P.D / 2 - 0.01, 0.08 + (P.baseH - 0.08) / 2, 0], parent: root });
  createPart('Kick', uv(boxGeo(P.D - 0.08, 0.08, P.L - 0.04)), black, { position: [-P.D / 2 - 0.04, 0.04, 0], parent: root });
  createPart('KickLine', uv(boxGeo(0.008, 0.02, P.L - 0.06)), brass, { position: [-0.075, 0.07, 0], parent: root });
  for (let i = 1; i < 6; i++) createPart('DoorGap' + i, uv(boxGeo(0.004, P.baseH - 0.16, 0.006)), brass, { position: [-0.009, 0.08 + (P.baseH - 0.08) / 2, -P.L / 2 + i * P.L / 6], parent: root });
  createPart('Top', uv(await roundedBoxGeo(P.D + 0.03, 0.04, P.L + 0.04, 0.008, { segments: 2 })), marble, { position: [-P.D / 2 + 0.005, P.baseH + 0.02, 0], parent: root });
  createPart('Back', uv(boxGeo(0.05, P.top - P.baseH - 0.04, P.L)), black, { position: [-P.D + 0.025, P.baseH + 0.04 + (P.top - P.baseH - 0.04) / 2, 0], parent: root });
  const pw = (P.L - 0.06 * (P.panels + 1)) / P.panels, y0 = P.baseH + 0.16, y1 = P.top - 0.3;
  for (let k = 0; k < P.panels; k++) {
    const zc = -P.L / 2 + 0.06 + pw / 2 + k * (pw + 0.06);
    createPart('Onyx' + k, uv(boxGeo(0.02, y1 - y0, pw)), onyx, { position: [-P.D + 0.06, (y0 + y1) / 2, zc], parent: root });
    for (const [j, y] of P.shelves.entries()) {
      createPart(`Shelf${k}_${j}`, uv(boxGeo(0.26, 0.012, pw - 0.02)), glass, { position: [-P.D + 0.2, y, zc], parent: root });
      createPart(`ShelfEdge${k}_${j}`, uv(boxGeo(0.006, 0.016, pw - 0.02)), brass, { position: [-P.D + 0.333, y, zc], parent: root });
      const kinds = Object.keys(BOTTLES), n = 7;
      for (let b = 0; b < n; b++) { const kind = kinds[(k * 5 + j * 3 + b) % kinds.length], c = COLORS[(k + j * 2 + b) % COLORS.length], z = zc - pw / 2 + 0.1 + b * (pw - 0.2) / (n - 1);
        createPart(`Bottle${k}_${j}_${b}`, cyl(lathe(BOTTLES[kind], 14)), mat(c, HEX[c], 0.05), { position: [-P.D + 0.2, y + 0.006, z], parent: root }); }
    }
  }
  for (let k = 0; k <= P.panels; k++) { const z = -P.L / 2 + 0.03 + k * (pw + 0.06);
    createPart('Fin' + k, uv(await roundedBoxGeo(0.12, y1 - y0 + 0.12, 0.05, 0.01, { segments: 2 })), brass, { position: [-P.D + 0.11, (y0 + y1) / 2, z], parent: root }); }
  createPart('Header', uv(await roundedBoxGeo(0.29, 0.3, P.L + 0.04, 0.012, { segments: 2 })), black, { position: [-P.D + 0.155, P.top - 0.15, 0], parent: root });
  createPart('HeaderLine', uv(boxGeo(0.006, 0.018, P.L)), brass, { position: [-P.D + 0.303, P.top - 0.15, 0], parent: root });
  return root;
}
