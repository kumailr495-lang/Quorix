// LUMIERE - one eighth of the round lobby banquette: velvet seat ring (outer radius 2.35 m) around a tall channel-tufted back ring,
// brass plinth band. Sitters face outward. The engine places 8 copies around the centre (Y rotation 45 degrees apart).
// Kiln frame: centre of the ring at the origin, the segment spans angles -22.5..22.5 degrees around +X.
const meta = { name: 'LUMIERE banquette segment', role: 'prop' };
const MATS = {};
function mat(name, hex, rough = 0.6, metal = 0) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: rough, metalness: metal, name }); m.color.setHex(hex); MATS[name] = m; return m; }
const uv = (g) => projectUV(g, { projection: 'box', metersPerUnit: 1 });
function sector(r0, r1, a0, a1, n) { const p = []; for (let i = 0; i <= n; i++) { const a = ((a0 + (a1 - a0) * (i / n)) * Math.PI) / 180; p.push([Math.cos(a) * r1, -Math.sin(a) * r1]); } for (let i = n; i >= 0; i--) { const a = ((a0 + (a1 - a0) * (i / n)) * Math.PI) / 180; p.push([Math.cos(a) * r0, -Math.sin(a) * r0]); } return p; }
async function build() {
  const root = createRoot('BanquetteSeg'), v = mat('velvet_teal', 0x1d5a56, 0.9), brass = mat('brass', 0xc9a061, 0.3, 1), black = mat('lacquer_black', 0x141416, 0.3);
  const A = 22.5, gap = 0.35;
  createPart('Plinth', uv(await extrudeProfile(sector(1.6, 2.3, -A + gap, A - gap, 10), { depth: 0.08, axis: 'y', center: false })), black, { parent: root });
  createPart('Band', uv(await extrudeProfile(sector(2.28, 2.31, -A + gap, A - gap, 10), { depth: 0.05, axis: 'y', center: false })), brass, { position: [0, 0.08, 0], parent: root });
  createPart('Seat', uv(await extrudeProfile(sector(1.7, 2.36, -A + gap, A - gap, 10), { depth: 0.36, axis: 'y', center: false, bevel: 0.04, smooth: true })), v, { position: [0, 0.08, 0], parent: root });
  // back ring: three tufted channels per segment
  for (let i = 0; i < 3; i++) { const a0 = -A + gap + ((2 * A - 2 * gap) / 3) * i, a1 = a0 + (2 * A - 2 * gap) / 3 - 0.6;
    createPart(`Back${i}`, uv(await extrudeProfile(sector(1.48, 1.72, a0, a1, 4), { depth: 0.46, axis: 'y', center: false, bevel: 0.05, smooth: true })), v, { position: [0, 0.44, 0], parent: root }); }
  createPart('BackBase', uv(await extrudeProfile(sector(1.46, 1.72, -A + gap, A - gap, 10), { depth: 0.36, axis: 'y', center: false })), v, { position: [0, 0.08, 0], parent: root });
  return root;
}
