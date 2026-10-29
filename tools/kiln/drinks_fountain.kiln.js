// LUMIERE - soft-drink fountain for the back counter: brushed-steel tower, glowing brand panel, six valves with nozzles,
// slotted drip tray, ice chute. Sits on a counter (Y = 0), front +X. 0.9 m wide.
const meta = { name: 'LUMIERE drinks fountain', role: 'prop' };
const MATS = {};
function mat(name, hex, rough = 0.6, metal = 0) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: rough, metalness: metal, name }); m.color.setHex(hex); MATS[name] = m; return m; }
function glow(name, hex) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: 1, metalness: 0, name, emissive: hex, emissiveIntensity: 1 }); m.color.setHex(hex); MATS[name] = m; return m; }
const uv = (g) => projectUV(g, { projection: 'box', metersPerUnit: 1 });
const cyl = (g) => projectUV(g, { projection: 'cylindrical', metersPerUnit: 1 });
async function rbox(w, h, d, r, seg = 3) { return uv(await roundedBoxGeo(w, h, d, Math.min(r, Math.min(w, h, d) / 2 - 0.0005), { segments: seg })); }
const part = (name, geo, m, position, parent, rotation, scale) => createPart(name, geo, m, { position, parent, ...(rotation ? { rotation } : {}), ...(scale ? { scale } : {}) });
async function build() {
  const root = createRoot('DrinksFountain'), steel = mat('steel', 0x9a9ca2, 0.35, 1), black = mat('plastic_black', 0x18181a, 0.4), chrome = mat('chrome', 0xe8e8e8, 0.1, 1);
  part('Tower', await rbox(0.6, 0.8, 0.9, 0.03, 2), steel, [-0.1, 0.4, 0], root);
  part('Panel', uv(boxGeo(0.01, 0.34, 0.82)), glow('glow_red', 0xff3d4a), [0.205, 0.6, 0], root);
  part('PanelFrame', await rbox(0.03, 0.38, 0.86, 0.01, 1), black, [0.19, 0.6, 0], root);
  for (let i = 0; i < 6; i++) { const z = -0.33 + i * 0.132;
    part('Valve' + i, await rbox(0.12, 0.1, 0.1, 0.02, 2), black, [0.24, 0.36, z], root);
    part('Nozzle' + i, cyl(cylinderGeo(0.012, 0.016, 0.05, 8)), chrome, [0.26, 0.29, z], root); }
  part('Tray', await rbox(0.22, 0.03, 0.88, 0.01, 1), black, [0.18, 0.06, 0], root);
  for (let i = 0; i < 10; i++) part('Slot' + i, uv(boxGeo(0.18, 0.004, 0.01)), chrome, [0.18, 0.077, -0.4 + i * 0.089], root);
  part('IceChute', await rbox(0.12, 0.12, 0.16, 0.02, 2), chrome, [0.0, 0.86, 0.3], root);   // on top, beside the brand panel
  return root;
}
