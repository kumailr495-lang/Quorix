// LUMIERE - back-lit poster case for a 1.2 x 1.8 m one-sheet: brass frame with a stepped profile, black backbox, glowing perimeter.
// Wall-mounted: the back is at X = 0, the face looks +X; bottom of the frame at Y = 0 (the engine sets the hanging height).
// The poster itself is a separate textured panel the engine places 0.05 m in front of the back.
const meta = { name: 'LUMIERE poster case', role: 'prop' };
const MATS = {};
function mat(name, hex, rough = 0.6, metal = 0) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: rough, metalness: metal, name }); m.color.setHex(hex); MATS[name] = m; return m; }
function glow(name, hex) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: 1, metalness: 0, name, emissive: hex, emissiveIntensity: 1 }); m.color.setHex(hex); MATS[name] = m; return m; }
const uv = (g) => projectUV(g, { projection: 'box', metersPerUnit: 1 });
async function build() {
  const root = createRoot('PosterCase'), brass = mat('brass', 0xc9a061, 0.28, 1), black = mat('lacquer_black', 0x141416, 0.3);
  const W = 1.2, H = 1.8, f = 0.07;
  createPart('Back', uv(boxGeo(0.04, H + 0.1, W + 0.1)), black, { position: [0.02, H / 2, 0], parent: root });
  for (const [n, y, h, z, w] of [['Top', H + f / 2, f, 0, W + 2 * f], ['Bottom', -f / 2, f, 0, W + 2 * f], ['Left', H / 2, H, -(W / 2 + f / 2), f], ['Right', H / 2, H, W / 2 + f / 2, f]]) {
    createPart(n, uv(await roundedBoxGeo(0.07, h, w, 0.012, { segments: 2 })), brass, { position: [0.075, y, z], parent: root });
  }
  for (const [n, y, h, z, w] of [['GlowT', H + 0.004, 0.006, 0, W], ['GlowB', -0.004, 0.006, 0, W]]) createPart(n, uv(boxGeo(0.004, h, w)), glow('glow_white', 0xfff2dc), { position: [0.112, y, z], parent: root });
  return root;
}
