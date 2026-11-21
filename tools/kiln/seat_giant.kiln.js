// LUMIERE - Screen 3 (giant screen) seat: tall navy fabric back with four channels, black shell with a brass edge, thick seat.
// Kiln frame: metres, +X = the way the sitter faces, +Y up, +Z right. Floor at Y = 0.
// The arm standards are a separate asset (arm_standard) so a row of n seats shares n + 1 arms.
// Material names are LUMIERE library keys (www/js/library.js NAMED); the engine applies its textures by name.
// LOD0 (near rows) and LOD1 (far rows): LOD1 drops the channels, the apron and the trim into one simple back and cushion.
const meta = { name: 'LUMIERE seat giant', role: 'prop' };
const P = { width: 0.54, seatTop: 0.46, seatDepth: 0.52, backRecline: 13, backHeight: 0.70, channels: 4 };
const MATS = {};
function mat(name, hex, rough = 0.6, metal = 0) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: rough, metalness: metal, name }); m.color.setHex(hex); MATS[name] = m; return m; }
const uv = (g) => projectUV(g, { projection: 'box', metersPerUnit: 1 });
async function rbox(w, h, d, r, seg = 3) { return uv(await roundedBoxGeo(w, h, d, r, { segments: seg })); }

async function body(group, lod) {
  const W = P.width, velvet = mat('velvet_navy', 0x1e2c4a, 0.9), walnut = mat('lacquer_black', 0x141416, 0.3), shell = mat('charcoal', 0x26262b, 0.5, 0.6), brass = mat('brass', 0xc9a061, 0.3, 1);
  const seg = lod ? 1 : 3;
  const seat = createPivot('Seat', [0.02, P.seatTop - 0.07, 0], group);
  seat.rotation.z = (3 * Math.PI) / 180;
  createPart('Cushion', await rbox(P.seatDepth, 0.13, W, 0.055, seg), velvet, { parent: seat });
  if (!lod) {
    createPart('Pan', await rbox(P.seatDepth - 0.06, 0.05, W - 0.04, 0.015), shell, { position: [-0.02, -0.08, 0], parent: seat });
    createPart('Apron', await rbox(0.05, 0.12, W - 0.02, 0.02), velvet, { position: [P.seatDepth / 2 - 0.035, -0.09, 0], parent: seat });
  }
  const back = createPivot('Back', [-P.seatDepth / 2 + 0.07, P.seatTop - 0.11, 0], group);
  back.rotation.z = (P.backRecline * Math.PI) / 180;
  const bh = P.backHeight;
  createPart('Shell', await rbox(0.06, bh + 0.14, W + 0.03, 0.025, seg), walnut, { position: [-0.085, bh / 2 + 0.05, 0], parent: back });
  if (lod) { createPart('BackPad', await rbox(0.12, bh, W - 0.02, 0.05, 1), velvet, { position: [0.0, bh / 2 + 0.02, 0], parent: back }); return; }
  for (const sz of [-1, 1]) createPart(sz < 0 ? 'WingL' : 'WingR', await rbox(0.12, bh + 0.06, 0.03, 0.012), walnut, { position: [-0.03, bh / 2 + 0.04, sz * (W / 2)], parent: back });
  // brass edge along the top of the shell, seen from the row behind
  createPart('ShellTrim', await rbox(0.07, 0.012, W + 0.035, 0.005, 2), brass, { position: [-0.085, bh + 0.12, 0], parent: back });
  const cw = (W - 0.03) / P.channels;
  for (let i = 0; i < P.channels; i++) {
    const z = -W / 2 + 0.015 + cw * (i + 0.5);
    createPart(`Channel${i}`, await rbox(0.11, bh - 0.08, cw - 0.004, 0.05), velvet, { position: [0.0, bh / 2 + 0.01, z], parent: back });
  }
  createPart('Headrest', uv(capsuleZGeo(0.06, W - 0.14, 12)), velvet, { position: [0.0, bh - 0.01, 0], parent: back });
  createPart('Lumbar', await rbox(0.12, 0.12, W - 0.03, 0.05), velvet, { position: [0.0, 0.04, 0], parent: back });
}

async function build() {
  const root = createRoot('SeatGiant');
  const coverage = (r, d) => (Math.PI * (r / (2 * d * Math.tan((25 * Math.PI) / 180))) ** 2) / (16 / 9);
  const tiers = [];
  for (const lod of [0, 1]) { const g = new THREE.Group(); g.name = `Body_LOD${lod}`; root.add(g); await body(g, lod); tiers.push(g); }
  defineLod(tiers, { screenCoverage: [coverage(0.6, 9), coverage(0.6, 60)] });
  return root;
}
