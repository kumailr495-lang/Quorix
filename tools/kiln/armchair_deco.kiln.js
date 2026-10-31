// LUMIERE - art-deco tub armchair: curved velvet shell wrapping a deep cushion, brass tapered legs and toe caps. Sitter faces +X. Seat at 0.45 m.
const meta = { name: 'LUMIERE deco armchair', role: 'prop' };
const MATS = {};
function mat(name, hex, rough = 0.6, metal = 0) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: rough, metalness: metal, name }); m.color.setHex(hex); MATS[name] = m; return m; }
const uv = (g) => projectUV(g, { projection: 'box', metersPerUnit: 1 });
async function build() {
  const root = createRoot('ArmchairDeco'), v = mat('velvet_mustard', 0xa77a25, 0.9), brass = mat('brass', 0xc9a061, 0.3, 1);
  // shell: a thick C in plan (open towards +X), extruded up; profile v maps to -Z for axis y
  const ro = 0.4, ri = 0.31, a0 = 55, a1 = 305, n = 28, prof = [];
  for (let i = 0; i <= n; i++) { const a = ((a0 + (a1 - a0) * (i / n)) * Math.PI) / 180; prof.push([Math.cos(a) * ro, -Math.sin(a) * ro]); }
  for (let i = n; i >= 0; i--) { const a = ((a0 + (a1 - a0) * (i / n)) * Math.PI) / 180; prof.push([Math.cos(a) * ri, -Math.sin(a) * ri]); }
  const shell = await extrudeProfile(prof, { depth: 0.48, axis: 'y', center: false, bevel: 0.035, smooth: true });
  createPart('Shell', uv(shell), v, { position: [0, 0.3, 0], parent: root });
  createPart('Base', uv(cylinderGeo(0.38, 0.36, 0.18, 32)), v, { position: [0, 0.27, 0], parent: root });
  createPart('Cushion', uv(await roundedBoxGeo(0.56, 0.12, 0.6, 0.05, { segments: 3 })), v, { position: [0.03, 0.42, 0], parent: root });
  for (const [x, z] of [[0.24, 0.24], [0.24, -0.24], [-0.24, 0.24], [-0.24, -0.24]]) {
    createPart(`Leg${x > 0 ? 'F' : 'B'}${z > 0 ? 'R' : 'L'}`, uv(cylinderGeo(0.022, 0.012, 0.18, 10)), brass, { position: [x, 0.09, z], parent: root });
  }
  return root;
}
