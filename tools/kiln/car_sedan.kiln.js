// LUMIERE - parked city sedan: bevelled body, glasshouse with pillars, four wheels with tyres and rims, head and tail lights.
// Length 4.5 m along X (front +X), width 1.8 m, wheels on Y = 0. Paint colour comes from the engine tint (car_red / car_blue).
const meta = { name: 'LUMIERE sedan', role: 'vehicle' };
const MATS = {};
function mat(name, hex, rough = 0.6, metal = 0) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: rough, metalness: metal, name }); m.color.setHex(hex); MATS[name] = m; return m; }
function glow(name, hex) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: 1, metalness: 0, name, emissive: hex, emissiveIntensity: 1 }); m.color.setHex(hex); MATS[name] = m; return m; }
const uv = (g) => projectUV(g, { projection: 'box', metersPerUnit: 1 });
const cyl = (g) => projectUV(g, { projection: 'cylindrical', metersPerUnit: 1 });
async function rbox(w, h, d, r, seg = 3) { return uv(await roundedBoxGeo(w, h, d, Math.min(r, Math.min(w, h, d) / 2 - 0.0005), { segments: seg })); }
const part = (name, geo, m, position, parent, rotation, scale) => createPart(name, geo, m, { position, parent, ...(rotation ? { rotation } : {}), ...(scale ? { scale } : {}) });
async function build() {
  const root = createRoot('Sedan'), paint = mat('car_red', 0x7a1c24, 0.25), glass = mat('glass', 0x2a3036, 0.05), tyre = mat('tyre', 0x141414, 0.9), rim = mat('car_silver', 0xb8bcc2, 0.3, 1), black = mat('plastic_black', 0x18181a, 0.4);
  part('Body', await rbox(4.5, 0.62, 1.8, 0.16, 3), paint, [0, 0.6, 0], root);
  // glasshouse: a trapezoid side profile extruded across the car, roof skin on top (no separate pillar slabs)
  part('Cabin', uv(await extrudeProfile([[-1.45, 0], [1.05, 0], [0.5, 0.46], [-1.1, 0.46]], { depth: 1.56, axis: 'z', bevel: 0.05 })), glass, [0, 0.9, 0], root);
  part('Roof', uv(await extrudeProfile([[-1.06, 0], [0.47, 0], [0.43, 0.06], [-1.02, 0.06]], { depth: 1.5, axis: 'z', bevel: 0.025 })), paint, [0, 1.35, 0], root);
  part('Bumper', await rbox(0.18, 0.2, 1.74, 0.06, 2), black, [2.2, 0.4, 0], root); part('BumperR', await rbox(0.18, 0.2, 1.74, 0.06, 2), black, [-2.2, 0.4, 0], root);
  for (const x of [1.4, -1.35]) for (const z of [-0.82, 0.82]) { const s = (x > 0 ? 'F' : 'B') + (z > 0 ? 'R' : 'L');
    part('Tyre' + s, cyl(cylinderGeo(0.33, 0.33, 0.24, 18)), tyre, [x, 0.33, z], root, [90, 0, 0]);
    part('Rim' + s, cyl(cylinderGeo(0.2, 0.2, 0.25, 12)), rim, [x, 0.33, z], root, [90, 0, 0]); }
  for (const z of [-0.6, 0.6]) { part(z < 0 ? 'HeadL' : 'HeadR', uv(boxGeo(0.02, 0.1, 0.36)), glow('glow_head', 0xfff4dc), [2.26, 0.68, z], root);
    part(z < 0 ? 'TailL' : 'TailR', uv(boxGeo(0.02, 0.09, 0.4)), glow('glow_tail', 0xff2a2a), [-2.26, 0.7, z], root); }
  return root;
}
