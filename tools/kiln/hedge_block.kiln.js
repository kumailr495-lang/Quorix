// LUMIERE v12 - a clipped box hedge for the street's bronze planters (tools/blender/arch/rooms.py builds the troughs): one closed surface,
// a rounded block 1.66 m long with two octaves of leaf-clump noise pushed out along it, meshed from the field. It stands from 0.42 m
// (2 cm into the trough's soil) to about 1.0 m; its long axis is Kiln Z (the engine's x at yaw 0). Light on purpose: ten stand on the street.
const meta = { name: 'LUMIERE hedge block', role: 'prop' };
const MATS = {};
function mat(name, hex, rough = 0.6, metal = 0) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: rough, metalness: metal, name }); m.color.setHex(hex); MATS[name] = m; return m; }
const uv = (g) => projectUV(g, { projection: 'box', metersPerUnit: 1 });
const hash = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
function vnoise(x, y, z) { const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), f = (t) => t * t * (3 - 2 * t), u = f(x - xi), v = f(y - yi), w = f(z - zi);
  let r = 0; for (let dx = 0; dx < 2; dx++) for (let dy = 0; dy < 2; dy++) for (let dz = 0; dz < 2; dz++) r += hash(xi + dx, yi + dy, zi + dz) * (dx ? u : 1 - u) * (dy ? v : 1 - v) * (dz ? w : 1 - w); return r; }
async function build() {
  const root = createRoot('HedgeBlock'), hedge = mat('hedge', 0x2a4122, 0.95);
  const R = 0.13, HW = 0.41, HH = 0.29, HL = 0.82, cy = 0.42 + HH;
  const box = (x, y, z) => { const qx = Math.abs(x) - (HW - R), qy = Math.abs(y - cy) - (HH - R), qz = Math.abs(z) - (HL - R);
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - R; };
  const field = ([x, y, z]) => -box(x, y, z) + 0.04 * (vnoise(x * 8 + 3.1, y * 8, z * 8) - 0.5) + 0.018 * (vnoise(x * 15, y * 15 + 5.3, z * 15) - 0.5);
  const geo = await implicitSurface(field, { bounds: { min: [-HW - 0.07, 0.36, -HL - 0.07], max: [HW + 0.07, cy + HH + 0.07, HL + 0.07] }, edgeLength: 0.105 });
  createPart('Hedge', uv(geo), hedge, { parent: root });
  return root;
}
