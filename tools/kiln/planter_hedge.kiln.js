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
  // hedge: a rounded core block plus leaf clumps (small flattened blobs) scattered over its top and sides, so the silhouette breaks up
  createPart('HedgeCore', uv(await roundedBoxGeo(P.W - 0.1, P.hedgeH - 0.08, P.L - 0.12, 0.12, { segments: 3 })), hedge, { position: [0, P.H + (P.hedgeH - 0.08) / 2, 0], parent: root });
  const rnd = (k) => hash(k * 1.7, k * 3.1, 0.5), blob = sphereGeo(1, 9, 6); let k = 0;
  for (let z = -P.L / 2 + 0.12; z <= P.L / 2 - 0.1; z += 0.13) for (const [x, y] of [[0, P.hedgeH - 0.06], [-0.18, P.hedgeH - 0.12], [0.18, P.hedgeH - 0.12], [-0.25, 0.22], [0.25, 0.22]]) {
    k++; const r = 0.085 + 0.05 * rnd(k), jx = (rnd(k + 9) - 0.5) * 0.06, jz = (rnd(k + 17) - 0.5) * 0.08, jy = (rnd(k + 23) - 0.5) * 0.05;
    createPart('Clump' + k, uv(blob), hedge, { position: [x + jx, P.H + y + jy, z + jz], scale: [r * (Math.abs(x) > 0.2 ? 0.75 : 1.1), r * 0.8, r * 1.15], rotation: [0, rnd(k + 31) * 180, 0], parent: root }); }
  return root;
}
