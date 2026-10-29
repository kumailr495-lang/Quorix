// LUMIERE - velvet queue rope for a 1.8 m post spacing: burgundy rope sagging in a catenary, brass end snaps. Spans Z from -0.86 to 0.86 at hook height.
const meta = { name: 'LUMIERE velvet rope', role: 'prop' };
const MATS = {};
function mat(name, hex, rough = 0.6, metal = 0) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: rough, metalness: metal, name }); m.color.setHex(hex); MATS[name] = m; return m; }
const cyl = (g) => projectUV(g, { projection: 'box', metersPerUnit: 1 });
async function build() {
  const root = createRoot('RopeVelvet'), v = mat('velvet_burgundy', 0x6e1424, 0.9), brass = mat('brass', 0xc9a061, 0.25, 1);
  const pts = [], half = 0.82, sag = 0.16, y0 = 0.85;
  for (let i = 0; i <= 16; i++) { const t = i / 16, z = -half + 2 * half * t; pts.push([0, y0 - sag * (1 - Math.pow((z / half), 2)), z]); }
  createPart('Rope', uv(pipeAlongPath(pts, 0.016, { tubularSegments: 24, radialSegments: 8 })), v, { parent: root });
  for (const s of [-1, 1]) createPart(`Snap${s}`, cyl(cylinderGeo(0.02, 0.02, 0.06, 10)), brass, { position: [0, y0 - 0.005, s * (half + 0.01)], rotation: [90, 0, 0], parent: root });
  return root;
}
