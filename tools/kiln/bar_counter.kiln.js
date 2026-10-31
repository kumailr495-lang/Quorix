// LUMIERE v7 - lobby bar counter: a 4.8 m stadium-shaped counter (round ends), fluted black front, Nero marble top with a rounded nose,
// warm LED line under the overhang, brass foot rail on brackets. Customers' side = +X; origin at the floor centre of the counter.
const meta = { name: 'LUMIERE bar counter', role: 'prop' };
const MATS = {};
function mat(name, hex, rough = 0.6, metal = 0) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: rough, metalness: metal, name }); m.color.setHex(hex); MATS[name] = m; return m; }
function glow(name, hex) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: 1, metalness: 0, name, emissive: hex, emissiveIntensity: 1 }); m.color.setHex(hex); MATS[name] = m; return m; }
const uv = (g) => projectUV(g, { projection: 'box', metersPerUnit: 1 });
const P = { L: 4.8, D: 0.66, H: 1.1, top: 0.05, over: 0.05 };
// stadium outline in the XZ plan: straight along Z, semicircles at both ends (radius D/2)
function stadium(L, D, n = 18) { const r = D / 2, h = L / 2 - r, pts = [];
  for (let i = 0; i <= n; i++) { const a = Math.PI * i / n; pts.push([r * Math.cos(a), h + r * Math.sin(a)]); }              // +Z end, from the +X side round to -X
  for (let i = 0; i <= n; i++) { const a = Math.PI + Math.PI * i / n; pts.push([r * Math.cos(a), -h + r * Math.sin(a)]); }    // -Z end, back to the +X side
  return pts; }
async function build() {
  const root = createRoot('BarCounter'), fluted = mat('fluted_black', 0x1c1b1d, 0.35), black = mat('lacquer_black', 0x141416, 0.2), marble = mat('marble_nero', 0xffffff, 0.08);
  const brass = mat('brass', 0xc9a061, 0.26, 1), led = glow('glow_warm', 0xffcf96);
  const plan = (L, D) => stadium(L, D).map(([x, z]) => [x, -z]);   // axis y maps (u, v) to (X, d, -v)
  createPart('Plinth', uv(await extrudeProfile(plan(P.L - 0.1, P.D - 0.1), { depth: 0.1, axis: 'y', center: false })), black, { parent: root });
  createPart('Body', uv(await extrudeProfile(plan(P.L, P.D), { depth: P.H - P.top - 0.1, axis: 'y', center: false })), fluted, { position: [0, 0.1, 0], parent: root });
  createPart('Led', uv(await extrudeProfile(plan(P.L + 0.02, P.D + 0.02), { depth: 0.012, axis: 'y', center: false })), led, { position: [0, P.H - P.top - 0.016, 0], parent: root });
  createPart('Top', uv(await extrudeProfile(plan(P.L + 2 * P.over, P.D + 2 * P.over), { depth: P.top, axis: 'y', center: false, bevel: 0.015, segments: 4 })), marble, { position: [0, P.H - P.top, 0], parent: root });
  // foot rail on the customers' side (+X): straight run plus the curve round each end, on five brackets
  const r = P.D / 2 + 0.13, h = P.L / 2 - P.D / 2, rail = [];
  for (let i = 0; i <= 8; i++) { const a = -Math.PI / 2 + (Math.PI / 2) * i / 8; rail.push([r * Math.cos(a), 0.2, -h + r * Math.sin(a)]); }
  for (let i = 0; i <= 8; i++) { const a = (Math.PI / 2) * i / 8; rail.push([r * Math.cos(a), 0.2, h + r * Math.sin(a)]); }
  createPart('FootRail', uv(pipeAlongPath(rail, 0.024, { tubularSegments: 64, radialSegments: 10 })), brass, { parent: root });
  for (const z of [-h, -h / 2, 0, h / 2, h]) createPart('Bracket' + z.toFixed(1), uv(pipeAlongPath([[P.D / 2 - 0.01, 0.2, z], [r - 0.01, 0.2, z]], 0.012, { tubularSegments: 2, radialSegments: 8 })), brass, { parent: root });
  return root;
}
