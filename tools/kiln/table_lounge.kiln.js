// LUMIERE v7 - lounge coffee table: a 1.1 m round Nero marble top with a rounded edge on a fluted brass drum. Origin at the floor centre.
const meta = { name: 'LUMIERE lounge table', role: 'prop' };
const MATS = {};
function mat(name, hex, rough = 0.6, metal = 0) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: rough, metalness: metal, name }); m.color.setHex(hex); MATS[name] = m; return m; }
const cyl = (g) => projectUV(g, { projection: 'cylindrical', metersPerUnit: 1 });
const uv = (g) => projectUV(g, { projection: 'box', metersPerUnit: 1 });
async function build() {
  const root = createRoot('TableLounge'), marble = mat('marble_nero', 0xffffff, 0.08), brass = mat('brass', 0xc9a061, 0.26, 1), black = mat('lacquer_black', 0x141416, 0.2);
  createPart('Top', cyl(lathe([[0, 0.36], [0.53, 0.36], [0.548, 0.368], [0.555, 0.38], [0.548, 0.392], [0.53, 0.4], [0, 0.4]], 64)), marble, { parent: root });
  // fluted drum: 24 shallow round flutes on a 0.3 m drum (radius varies round the axis), brass, between a black plinth and a brass collar
  const n = 24, prof = []; for (let i = 0; i < n * 6; i++) { const a = (i / (n * 6)) * Math.PI * 2, f = (i % 6) / 6; prof.push([(0.3 - 0.012 * Math.sin(Math.PI * f)) * Math.cos(a), -(0.3 - 0.012 * Math.sin(Math.PI * f)) * Math.sin(a)]); }
  createPart('Drum', uv(await extrudeProfile(prof, { depth: 0.3, axis: 'y', center: false })), brass, { position: [0, 0.04, 0], parent: root });
  createPart('Plinth', cyl(lathe([[0, 0], [0.31, 0], [0.31, 0.04], [0, 0.04]], 48)), black, { parent: root });
  createPart('Collar', cyl(lathe([[0, 0.34], [0.32, 0.34], [0.32, 0.36], [0, 0.36]], 48)), brass, { parent: root });
  return root;
}
