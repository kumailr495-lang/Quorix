// LUMIERE - popcorn machine for the counter top: red lacquer cabinet on brass corner posts, a steel kettle hanging inside under a warm
// lamp, a heap of popcorn in the bin, glazing bars, brass crest on top. Sits on a counter (base at Y = 0), front +X.
const meta = { name: 'LUMIERE popcorn machine', role: 'prop' };
const MATS = {};
function mat(name, hex, rough = 0.6, metal = 0) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: rough, metalness: metal, name }); m.color.setHex(hex); MATS[name] = m; return m; }
function glow(name, hex) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: 1, metalness: 0, name, emissive: hex, emissiveIntensity: 1 }); m.color.setHex(hex); MATS[name] = m; return m; }
const uv = (g) => projectUV(g, { projection: 'box', metersPerUnit: 1 });
async function build() {
  const root = createRoot('PopcornMachine'), red = mat('lacquer_red', 0x8a1522, 0.25), brass = mat('brass', 0xc9a061, 0.3, 1), steel = mat('chrome', 0xe8e8e8, 0.1, 1), corn = mat('popcorn', 0xf2dca0, 0.8), black = mat('lacquer_black', 0x141416, 0.3);
  const W = 0.56, D = 0.46, H = 0.86;
  createPart('Base', uv(await roundedBoxGeo(D, 0.2, W, 0.02, { segments: 2 })), red, { position: [0, 0.1, 0], parent: root });
  createPart('BaseDoor', uv(boxGeo(0.01, 0.12, W - 0.12)), black, { position: [D / 2 + 0.002, 0.1, 0], parent: root });
  createPart('Bin', uv(boxGeo(D - 0.04, 0.02, W - 0.04)), steel, { position: [0, 0.212, 0], parent: root });
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) createPart(`Post${x}${z}`, uv(cylinderGeo(0.014, 0.014, H - 0.34, 8)), brass, { position: [x * (D / 2 - 0.02), 0.21 + (H - 0.34) / 2, z * (W / 2 - 0.02)], parent: root });
  createPart('Header', uv(await roundedBoxGeo(D, 0.14, W, 0.02, { segments: 2 })), red, { position: [0, H - 0.05, 0], parent: root });
  createPart('Crest', uv(cylinderGeo(0.09, 0.12, 0.05, 16)), brass, { position: [0, H + 0.045, 0], parent: root });
  createPart('Lamp', uv(boxGeo(D - 0.1, 0.01, W - 0.1)), glow('glow_warm', 0xffd08a), { position: [0, H - 0.125, 0], parent: root });
  createPart('Kettle', uv(cylinderGeo(0.12, 0.09, 0.14, 16)), steel, { position: [0, H - 0.25, 0], parent: root });
  createPart('KettleRod', uv(cylinderGeo(0.008, 0.008, 0.1, 6)), steel, { position: [0, H - 0.13, 0], parent: root });
  // the heap: overlapping low domes of popcorn
  const rng = seededRandom(7), r = () => rng.range(0, 1);
  for (let i = 0; i < 9; i++) createPart(`Heap${i}`, uv(sphereGeo(0.09 + r() * 0.05, 10, 6)), corn, { position: [(r() - 0.5) * (D - 0.18), 0.22 + r() * 0.04, (r() - 0.5) * (W - 0.18)], rotation: [0, r() * 360, r() * 20], scale: [1, 0.55, 1], parent: root });
  for (const [i, y] of [[0, 0.4], [1, 0.62]]) createPart(`Bar${i}`, uv(boxGeo(0.012, 0.012, W - 0.06)), brass, { position: [D / 2 - 0.02, y, 0], parent: root });   // glazing bars across the front
  return root;
}
