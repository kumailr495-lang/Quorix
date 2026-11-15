// LUMIERE v7 - plaza planter: a 2.8 m dark-bronze trough with a brass lip, holding a clipped box hedge (a softly lumpy rounded block:
// two octaves of leaf-clump noise pushed along the surface normal). Front = +X; origin at the floor centre.
const meta = { name: 'LUMIERE hedge planter', role: 'prop' };
const MATS = {};
function mat(name, hex, rough = 0.6, metal = 0) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: rough, metalness: metal, name }); m.color.setHex(hex); MATS[name] = m; return m; }
const uv = (g) => projectUV(g, { projection: 'box', metersPerUnit: 1 });
const P = { L: 2.8, W: 0.62, H: 0.5, hedgeH: 0.55 };
// smooth tileless value noise (hash on a lattice, trilinear, smoothstep)
const hash = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
function vnoise(x, y, z) { const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), f = (t) => t * t * (3 - 2 * t), u = f(x - xi), v = f(y - yi), w = f(z - zi);
  let r = 0; for (let dx = 0; dx < 2; dx++) for (let dy = 0; dy < 2; dy++) for (let dz = 0; dz < 2; dz++) r += hash(xi + dx, yi + dy, zi + dz) * (dx ? u : 1 - u) * (dy ? v : 1 - v) * (dz ? w : 1 - w); return r; }
async function build() {
  const root = createRoot('PlanterHedge'), bronze = mat('bronze', 0x5a4330, 0.45, 1), brass = mat('brass', 0xc9a061, 0.26, 1), hedge = mat('hedge', 0x2a4122, 0.95);
  createPart('Trough', uv(await roundedBoxGeo(P.W, P.H, P.L, 0.02, { segments: 3 })), bronze, { position: [0, P.H / 2, 0], parent: root });
  createPart('Lip', uv(await roundedBoxGeo(P.W + 0.03, 0.035, P.L + 0.03, 0.01, { segments: 2 })), brass, { position: [0, P.H + 0.0075, 0], parent: root });   // its underside sits inside the trough
  // v11: the hedge is one closed surface: a rounded block with two octaves of leaf-clump noise pushed out along it, meshed from the
  // field (Kiln implicitSurface). It was a core plus 105 separate clumps, and neighbouring clumps laid facets 0.2-3 mm apart that the
  // z-fighting gate (tools/dev/zcheck.sh) found from the street and the lobby. Its foot stands 3 cm into the lip.
  const R = 0.12, HW = (P.W - 0.1) / 2, HH = (P.hedgeH + 0.02) / 2, HL = (P.L - 0.12) / 2, cy = P.H - 0.03 + HH;
  const box = (x, y, z) => { const qx = Math.abs(x) - (HW - R), qy = Math.abs(y - cy) - (HH - R), qz = Math.abs(z) - (HL - R);
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - R; };
  const field = ([x, y, z]) => -box(x, y, z) + 0.034 * (vnoise(x * 9 + 3.1, y * 9, z * 9) - 0.5) + 0.016 * (vnoise(x * 14, y * 14 + 5.3, z * 14) - 0.5);
  const geo = await implicitSurface(field, { bounds: { min: [-HW - 0.06, P.H - 0.06, -HL - 0.06], max: [HW + 0.06, cy + HH + 0.06, HL + 0.06] }, edgeLength: 0.05 });
  createPart('Hedge', uv(geo), hedge, { parent: root });
  return root;
}
