// LUMIERE v7 - restroom dressing (docs/V7-DESIGN.md: "the restroom looks so empty"), five fittings side by side in one GLB, each its own
// named part group the engine stamps separately (prefix = fitting): Dryer (wall blade hand dryer), Towel (paper towel dispenser), Bin
// (pedal bin), Baby (fold-down baby-change unit), Soap (deck soap pump). Wall-mounted fittings have their back at X = 0 and face +X; each
// fitting's origin is its own floor point, so the engine places them by name (assets.js partsOf). They are spaced 1 m apart along Z here.
const meta = { name: 'LUMIERE restroom fittings', role: 'prop' };
const MATS = {};
function mat(name, hex, rough = 0.6, metal = 0) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: rough, metalness: metal, name }); m.color.setHex(hex); MATS[name] = m; return m; }
function glow(name, hex) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: 1, metalness: 0, name, emissive: hex, emissiveIntensity: 1 }); m.color.setHex(hex); MATS[name] = m; return m; }
const uv = (g) => projectUV(g, { projection: 'box', metersPerUnit: 1 });
const cyl = (g) => projectUV(g, { projection: 'cylindrical', metersPerUnit: 1 });
async function build() {
  const root = createRoot('RestroomSet'), steel = mat('steel', 0x9a9ca2, 0.3, 1), chrome = mat('chrome', 0xe8e8e8, 0.08, 1), black = mat('plastic_black', 0x18181a, 0.35), white = mat('paint_cream', 0xe7dfd0, 0.5);
  const brass = mat('brass', 0xc9a061, 0.26, 1), led = glow('glow_white', 0xdfe8ff);
  // Dryer: brushed steel blade body 0.30 x 0.66 x 0.24 m, hands go into the slot from the top; a thin status light
  createPart('DryerBody', uv(await roundedBoxGeo(0.24, 0.66, 0.3, 0.05, { segments: 4 })), steel, { position: [0.12, 1.18, 0], parent: root });
  createPart('DryerSlot', uv(await roundedBoxGeo(0.07, 0.02, 0.26, 0.008, { segments: 2 })), black, { position: [0.16, 1.512, 0], parent: root });
  createPart('DryerLed', uv(boxGeo(0.004, 0.01, 0.05)), led, { position: [0.2405, 1.02, 0], parent: root });
  // Towel: stainless dispenser with a curved front and a paper slot underneath
  createPart('TowelBody', uv(await roundedBoxGeo(0.13, 0.42, 0.29, 0.03, { segments: 3 })), steel, { position: [0.065, 1.45, 1.0], parent: root });
  createPart('TowelPaper', uv(boxGeo(0.05, 0.05, 0.2)), white, { position: [0.07, 1.215, 1.0], parent: root });
  createPart('TowelWindow', uv(boxGeo(0.004, 0.06, 0.12)), black, { position: [0.1315, 1.52, 1.0], parent: root });
  // Bin: round pedal bin, chrome lid with a rim, black pedal
  createPart('BinBody', cyl(lathe([[0, 0.02], [0.13, 0.02], [0.14, 0.04], [0.14, 0.58], [0.142, 0.6], [0, 0.6]], 32)), chrome, { position: [0.2, 0, 2.0], parent: root });
  createPart('BinLid', cyl(lathe([[0, 0.6], [0.145, 0.6], [0.145, 0.615], [0.12, 0.64], [0, 0.645]], 32)), chrome, { position: [0.2, 0, 2.0], parent: root });
  createPart('BinBase', cyl(lathe([[0, 0], [0.135, 0], [0.135, 0.02], [0, 0.02]], 32)), black, { position: [0.2, 0, 2.0], parent: root });
  createPart('BinPedal', uv(await roundedBoxGeo(0.07, 0.015, 0.09, 0.006, { segments: 2 })), black, { position: [0.36, 0.03, 2.0], parent: root });
  // Baby: fold-down unit, cream with a grey edge band and a handle
  createPart('BabyBody', uv(await roundedBoxGeo(0.11, 0.56, 0.86, 0.04, { segments: 3 })), white, { position: [0.055, 1.2, 3.0], parent: root });
  createPart('BabyBand', uv(boxGeo(0.006, 0.04, 0.8)), steel, { position: [0.111, 1.43, 3.0], parent: root });
  createPart('BabyHandle', uv(await roundedBoxGeo(0.03, 0.03, 0.22, 0.01, { segments: 2 })), steel, { position: [0.125, 1.4, 3.0], parent: root });
  // Soap: deck-mounted brass pump (stands on the vanity top)
  createPart('SoapPump', cyl(lathe([[0, 0], [0.025, 0], [0.026, 0.006], [0.02, 0.012], [0.016, 0.16], [0.012, 0.17], [0, 0.172]], 24)), brass, { position: [0.0, 0, 4.0], parent: root });
  createPart('SoapSpout', uv(pipeAlongPath([[0.004, 0.15, 4.0], [0.035, 0.172, 4.0], [0.08, 0.16, 4.0]], 0.006, { tubularSegments: 8, radialSegments: 8 })), brass, { parent: root });
  return root;
}
