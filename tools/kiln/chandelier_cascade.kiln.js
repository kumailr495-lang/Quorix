// LUMIERE v7 - lobby hero chandelier after the Allu Cinemas lobby (docs/V7-DESIGN.md): an elliptical brass halo hung under the coffer,
// thirty-six glowing ribbons that fall from it in long swirling S-curves (two counter-rotating sets, so they weave), gathering into a
// "flame" core of fourteen stacked wavy light rings. Origin = the ceiling attachment; everything hangs below Y = 0 (about 3.9 m drop).
const meta = { name: 'LUMIERE cascade chandelier', role: 'prop' };
const MATS = {};
function mat(name, hex, rough = 0.6, metal = 0) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: rough, metalness: metal, name }); m.color.setHex(hex); MATS[name] = m; return m; }
function glow(name, hex) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: 1, metalness: 0, name, emissive: hex, emissiveIntensity: 1 }); m.color.setHex(hex); MATS[name] = m; return m; }
const uv = (g) => projectUV(g, { projection: 'box', metersPerUnit: 1 });
const cyl = (g) => projectUV(g, { projection: 'cylindrical', metersPerUnit: 1 });
const P = { rx: 3.6, rz: 2.4, haloY: -0.62, ribbons: 44, drop: 2.15, swirl: 0.55, coreTop: -2.0, coreBot: -3.75, rings: 18, coreR: 0.95 };
const TAU = Math.PI * 2;
// a thin band: t thick (profile x), w wide (profile z, along the sweep's up direction)
const band = (w, t = 0.009) => [[-t / 2, -w / 2], [t / 2, -w / 2], [t / 2, w / 2], [-t / 2, w / 2]];
// ribbon i: leaves the halo, bows outward, swirls round the axis and falls into the core
function ribbonPath(i) {
  const n = 44, set = i % 2 ? 1 : -1, phi0 = (i / P.ribbons) * TAU, endR = 0.28 + 0.1 * ((i * 7) % 5) / 4, pts = [];
  const depth = P.drop + 0.35 * (((i * 11) % 7) / 6);
  for (let k = 0; k <= n; k++) {
    const t = k / n, e = t * t * (3 - 2 * t);
    const s = (1 - e) + e * (endR / P.rx), bow = 1 + 0.16 * Math.sin(Math.PI * Math.min(1, t * 1.25));
    const phi = phi0 + set * P.swirl * Math.sin(Math.PI * t) + set * 0.35 * t;
    const y = P.haloY - 0.02 - depth * (0.2 * t + 0.8 * t * t) + 0.12 * Math.sin(TAU * t) * (1 - t);
    pts.push([P.rx * s * bow * Math.cos(phi), y, P.rz * s * bow * Math.sin(phi) * (0.7 + 0.3 * e * (P.rx / P.rz))]);
  }
  return pts;
}
async function build() {
  const root = createRoot('ChandelierCascade');
  const brass = mat('brass', 0xc9a061, 0.26, 1), black = mat('blackmetal', 0x1c1c1f, 0.5, 0.6), light = glow('glow_warm', 0xffe0b0), core = glow('glow_warm', 0xffe0b0);
  // halo: brass band round an ellipse, with a glowing line under it (closed sweeps)
  const ell = (rx, rz, y, n = 128) => Array.from({ length: n }, (_, k) => [rx * Math.cos((k / n) * TAU), y, rz * Math.sin((k / n) * TAU)]);
  createPart('Halo', uv(sweepProfile([[-0.03, -0.05], [0.03, -0.05], [0.03, 0.05], [-0.03, 0.05]], ell(P.rx, P.rz, P.haloY), { closed: true, up: [0, 1, 0], creaseAngle: 50 })), brass, { parent: root });
  createPart('HaloLine', uv(sweepProfile(band(0.012, 0.024), ell(P.rx, P.rz, P.haloY - 0.058), { closed: true, up: [0, 1, 0] })), light, { parent: root });
  // ribbons: 6.5 cm light bands whose broad face looks out and down (the band's width runs round the axis, up = the tangential direction),
  // so from the lobby floor they read as glowing ribbons, not as wires
  for (let i = 0; i < P.ribbons; i++) {
    const pts = ribbonPath(i), phi0 = (i / P.ribbons) * TAU, eph = [-Math.sin(phi0), 0, Math.cos(phi0)];
    createPart('Ribbon' + i, uv(sweepProfile(band(0.065, 0.008), pts, { up: eph, cap: true, creaseAngle: 50 })), light, { parent: root });
  }
  // core: stacked wavy rings, widest in the middle like a flame
  for (let k = 0; k < P.rings; k++) {
    const u = (k + 0.5) / P.rings, y0 = P.coreTop + (P.coreBot - P.coreTop) * u, r0 = 0.22 + P.coreR * Math.pow(Math.sin(Math.PI * Math.pow(u, 0.8)), 0.9);
    const pts = Array.from({ length: 90 }, (_, j) => { const a = (j / 90) * TAU, r = r0 * (1 + 0.16 * Math.sin(4 * a + k * 0.9)); return [r * Math.cos(a), y0 + 0.07 * Math.sin(3 * a + k * 1.3), r * 0.82 * Math.sin(a)]; });
    createPart('CoreRing' + k, uv(sweepProfile(band(0.05, 0.008), pts, { closed: true, up: [0, 1, 0], creaseAngle: 50 })), core, { parent: root });
  }
  // suspension: six fine cables from the halo and a centre cable to the core, each into a small brass ceiling cup
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + Math.PI / 6, x = P.rx * Math.cos(a), z = P.rz * Math.sin(a), len = -P.haloY - 0.07;
    createPart('Cable' + i, cyl(cylinderGeo(0.003, 0.003, len, 6)), black, { position: [x, -len / 2 - 0.02, z], parent: root });
    createPart('Cup' + i, cyl(cylinderGeo(0.035, 0.045, 0.03, 16)), brass, { position: [x, -0.025, z], parent: root }); }
  const cl = -P.coreTop - 0.06;
  createPart('CoreCable', cyl(cylinderGeo(0.004, 0.004, cl, 6)), black, { position: [0, -cl / 2 - 0.03, 0], parent: root });
  createPart('CoreCup', cyl(cylinderGeo(0.05, 0.06, 0.035, 16)), brass, { position: [0, -0.0275, 0], parent: root });
  return root;
}
