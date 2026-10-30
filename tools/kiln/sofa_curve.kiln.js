// LUMIERE v7 - curved lounge sofa for the lobby lounge (docs/V7-DESIGN.md): a 75-degree arc of channel-tufted ivory velvet with a top
// roll and finished ends, on a black lacquer plinth with a brass line. Sitters face the concave side = Kiln +X (the engine turns it to +z).
// Origin: middle of the seat's front edge, floor at Y = 0. The arc's centre is 2.0 m in front of the origin.
const meta = { name: 'LUMIERE curved lounge sofa', role: 'prop' };
const MATS = {};
function mat(name, hex, rough = 0.6, metal = 0) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: rough, metalness: metal, name }); m.color.setHex(hex); MATS[name] = m; return m; }
const uv = (g) => projectUV(g, { projection: 'box', metersPerUnit: 1 });
const P = { R: 2.0, span: 75, seatTop: 0.44, seatD: 0.6, backT: 0.2, backH: 0.86, channels: 13, n: 40 };
const D2R = Math.PI / 180;
// a point at radius r from the arc centre C = (R, 0, 0), at angle a (degrees) measured from the -X direction
const at = (r, a, y = 0) => [P.R - r * Math.cos(a * D2R), y, r * Math.sin(a * D2R)];
const arc = (r, y, a0 = -P.span / 2, a1 = P.span / 2) => Array.from({ length: P.n + 1 }, (_, k) => at(r, a0 + (a1 - a0) * k / P.n, y));
// rounded rectangle profile (w across, h up), centred across, from z0 to z0 + h
function rrect(w, h, r, z0 = 0, seg = 5) { const pts = [], c = [[w / 2 - r, z0 + h - r, 0], [-w / 2 + r, z0 + h - r, 90], [-w / 2 + r, z0 + r, 180], [w / 2 - r, z0 + r, 270]];
  for (const [cx, cz, a0] of c) for (let i = 0; i <= seg; i++) { const a = (a0 + 90 * i / seg) * D2R; pts.push([cx + r * Math.cos(a), cz + r * Math.sin(a)]); } return pts; }
async function build() {
  const root = createRoot('SofaCurve'), velvet = mat('velvet_ivory', 0xd9cfbf, 0.9), black = mat('lacquer_black', 0x141416, 0.2), brass = mat('brass', 0xc9a061, 0.26, 1);
  const depth = P.seatD + P.backT, rMid = P.R + depth / 2;
  createPart('Plinth', uv(sweepProfile(rrect(depth - 0.04, 0.1, 0.012), arc(rMid, 0), { up: [0, 1, 0], creaseAngle: 40 })), black, { parent: root });
  createPart('BrassLine', uv(sweepProfile(rrect(0.012, 0.012, 0.004), arc(P.R + 0.025, 0.094), { up: [0, 1, 0] })), brass, { parent: root });
  createPart('SeatBase', uv(sweepProfile(rrect(P.seatD + 0.02, 0.2, 0.05, 0.1), arc(P.R + P.seatD / 2 + 0.01, 0), { up: [0, 1, 0], creaseAngle: 70 })), velvet, { parent: root });
  createPart('SeatCushion', uv(sweepProfile(rrect(P.seatD - 0.02, 0.15, 0.065, 0.29), arc(P.R + P.seatD / 2 + 0.005, 0, -P.span / 2 + 1.2, P.span / 2 - 1.2), { up: [0, 1, 0], creaseAngle: 80 })), velvet, { parent: root });
  // back: vertical channels, each a soft rounded box turned to face the arc centre; they overlap 8 mm so the seams read as tufting
  const rb = P.R + P.seatD + P.backT / 2 - 0.02, step = P.span / P.channels, w = 2 * Math.PI * rb * (step / 360) + 0.008, h = P.backH - 0.3;
  for (let i = 0; i < P.channels; i++) { const a = -P.span / 2 + step * (i + 0.5), p = at(rb + (i % 2) * 0.006, a, 0.3 + h / 2);   // alternate channels 6 mm apart: no shared faces at the seams
    createPart('Channel' + i, uv(await roundedBoxGeo(w, h, P.backT, 0.07, { segments: 4 })), velvet, { position: p, rotation: [0, a - 90, 0], parent: root }); }
  createPart('TopRoll', uv(pipeAlongPath(arc(rb + 0.005, P.backH - 0.055), 0.075, { tubularSegments: 48, radialSegments: 12 })), velvet, { parent: root });
  // finished ends: a slim upholstered panel across the full depth at each end of the arc
  for (const s of [-1, 1]) { const a = s * (P.span / 2 - 0.4), p = at(rMid, a, 0.1 + 0.62 / 2);
    createPart('End' + (s < 0 ? 'L' : 'R'), uv(await roundedBoxGeo(0.1, 0.62, depth + 0.02, 0.045, { segments: 4 })), velvet, { position: p, rotation: [0, a - 90, 0], parent: root }); }
  return root;
}
