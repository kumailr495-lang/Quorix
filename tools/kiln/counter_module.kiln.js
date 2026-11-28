// LUMIERE - 2 m service counter module (concession, box office, bar): walnut slat front on a black carcass, Nero Marquina top with
// a front overhang, brass kick strip, warm LED line under the overhang. Customers stand on the +X side. Modules butt end to end.
const meta = { name: 'LUMIERE counter module', role: 'prop' };
const P = { len: 2.0, depth: 0.7, h: 1.08, slat: 0.05 };
const MATS = {};
function mat(name, hex, rough = 0.6, metal = 0) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: rough, metalness: metal, name }); m.color.setHex(hex); MATS[name] = m; return m; }
function glow(name, hex) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: 1, metalness: 0, name, emissive: hex, emissiveIntensity: 1 }); m.color.setHex(hex); MATS[name] = m; return m; }
const uv = (g) => projectUV(g, { projection: 'box', metersPerUnit: 1 });
async function build() {
  const root = createRoot('CounterModule'), black = mat('lacquer_black', 0x141416, 0.3), walnut = mat('walnut', 0x6b4630, 0.42), marble = mat('marble_nero', 0xffffff, 0.12), brass = mat('brass', 0xc9a061, 0.3, 1);
  const L = P.len, D = P.depth, front = D / 2;
  createPart('Plinth', uv(boxGeo(D - 0.1, 0.1, L)), black, { position: [-0.05, 0.05, 0], parent: root });
  createPart('Carcass', uv(await roundedBoxGeo(D - 0.04, P.h - 0.14, L, 0.01, { segments: 1 })), black, { position: [-0.02, 0.1 + (P.h - 0.14) / 2, 0], parent: root });
  const n = Math.floor(L / P.slat);
  for (let i = 0; i < n; i++) { const z = -L / 2 + (i + 0.5) * (L / n); createPart(`Slat${i}`, uv(boxGeo(0.03, P.h - 0.24, L / n - 0.012)), walnut, { position: [front - 0.02 + 0.015, 0.16 + (P.h - 0.24) / 2, z], parent: root }); }
  createPart('Kick', uv(boxGeo(0.012, 0.06, L)), brass, { position: [front - 0.06, 0.07, 0], parent: root });
  createPart('Top', uv(await roundedBoxGeo(D + 0.12, 0.04, L, 0.012, { segments: 2 })), marble, { position: [0.06, P.h - 0.02, 0], parent: root });
  createPart('TopEdge', uv(boxGeo(0.008, 0.01, L)), brass, { position: [D / 2 + 0.122, P.h - 0.045, 0], parent: root });
  createPart('LedLine', uv(boxGeo(0.01, 0.008, L - 0.04)), glow('glow_warm', 0xffc07a), { position: [front + 0.05, P.h - 0.05, 0], parent: root });
  return root;
}
