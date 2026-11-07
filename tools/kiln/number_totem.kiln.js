// LUMIERE v7 - screen-number totem beside each hall door (after the Dolby corridor picture): a black steel frame holding backlit fluted
// glass, 0.5 x 2.5 m, 0.12 m deep, standing on the floor in front of the wall. Front = +X; the engine lays the big number on the glass.
const meta = { name: 'LUMIERE number totem', role: 'prop' };
const MATS = {};
function mat(name, hex, rough = 0.6, metal = 0) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: rough, metalness: metal, name }); m.color.setHex(hex); MATS[name] = m; return m; }
function glow(name, hex) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: 1, metalness: 0, name, emissive: hex, emissiveIntensity: 1 }); m.color.setHex(hex); MATS[name] = m; return m; }
const uv = (g) => projectUV(g, { projection: 'box', metersPerUnit: 1 });
const P = { W: 0.5, H: 2.5, D: 0.12, bar: 0.045, flutes: 14 };
async function build() {
  const root = createRoot('NumberTotem'), steel = mat('blackmetal', 0x18181b, 0.4, 0.7), opal = glow('glow_opal', 0xf2f0ea);
  const iw = P.W - 2 * P.bar, ih = P.H - 2 * P.bar;
  for (const s of [-1, 1]) createPart('Stile' + s, uv(await roundedBoxGeo(P.D, P.H, P.bar, 0.006, { segments: 2 })), steel, { position: [0, P.H / 2, s * (P.W / 2 - P.bar / 2)], parent: root });
  for (const [n, y] of [['Head', P.H - P.bar / 2], ['Sill', P.bar / 2]]) createPart(n, uv(await roundedBoxGeo(P.D, P.bar, iw + 0.004, 0.006, { segments: 2 })), steel, { position: [0, y, 0], parent: root });
  // fluted glass: a scalloped section (round flutes on the front, flat back) extruded the height of the opening
  const prof = [], k = P.flutes, fw = iw / k;
  for (let f = 0; f < k; f++) for (let j = 0; j <= 6; j++) { const t = j / 6, z = -iw / 2 + (f + t) * fw; prof.push([0.012 + 0.008 * Math.sin(Math.PI * t), z]); }
  prof.push([-0.012, iw / 2], [-0.012, -iw / 2]);
  const glass = await extrudeProfile(prof.map(([x, z]) => [x, -z]), { depth: ih, axis: 'y', center: false });   // axis y: (u, v) -> (X, d, -v)
  createPart('Glass', uv(glass), opal, { position: [0, P.bar, 0], parent: root });
  return root;
}
