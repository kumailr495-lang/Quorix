// LUMIERE - street building bay seen through the lobby glass: dark brick, two tall windows with stone sills and lintels,
// recessed glowing panes behind black mullions, a stone cornice band. 6 m wide (Z), one 3.6 m storey; the engine stacks storeys
// and turns some windows dark with per-part glow multipliers (PaneL, PaneR). Front (+X) faces the street.
const meta = { name: 'LUMIERE facade bay', role: 'building' };
const MATS = {};
function mat(name, hex, rough = 0.6, metal = 0) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: rough, metalness: metal, name }); m.color.setHex(hex); MATS[name] = m; return m; }
function glow(name, hex) { if (MATS[name]) return MATS[name]; const m = pbrMaterial({ roughness: 1, metalness: 0, name, emissive: hex, emissiveIntensity: 1 }); m.color.setHex(hex); MATS[name] = m; return m; }
const uv = (g) => projectUV(g, { projection: 'box', metersPerUnit: 1 });
const cyl = (g) => projectUV(g, { projection: 'cylindrical', metersPerUnit: 1 });
async function rbox(w, h, d, r, seg = 3) { return uv(await roundedBoxGeo(w, h, d, Math.min(r, Math.min(w, h, d) / 2 - 0.0005), { segments: seg })); }
const part = (name, geo, m, position, parent, rotation, scale) => createPart(name, geo, m, { position, parent, ...(rotation ? { rotation } : {}), ...(scale ? { scale } : {}) });
async function build() {
  const root = createRoot('FacadeBay'), brick = mat('brick', 0xffffff, 0.9), stone = mat('stone', 0x8a7d6c, 0.8), black = mat('blackmetal', 0x1c1c1f, 0.5, 0.6);
  const W = 6, H = 3.6, T = 0.3, ww = 1.5, wh = 2.1, sill = 0.75, zs = [-1.5, 1.5];
  // wall pieces around the two openings (no boolean needed)
  part('WallBelow', uv(boxGeo(T, sill, W)), brick, [-T / 2, sill / 2, 0], root);
  part('WallAbove', uv(boxGeo(T, H - sill - wh, W)), brick, [-T / 2, sill + wh + (H - sill - wh) / 2, 0], root);
  for (const [n, z0, z1] of [['PierL', -W / 2, zs[0] - ww / 2], ['PierM', zs[0] + ww / 2, zs[1] - ww / 2], ['PierR', zs[1] + ww / 2, W / 2]]) part(n, uv(boxGeo(T, wh, z1 - z0)), brick, [-T / 2, sill + wh / 2, (z0 + z1) / 2], root);
  for (let i = 0; i < zs.length; i++) { const z = zs[i], s = i ? 'R' : 'L';
    part('Sill' + s, await rbox(0.16, 0.07, ww + 0.2, 0.015, 2), stone, [0.02, sill + 0.005, z], root);   // sill top above the wall below (no shared plane)
    part('Lintel' + s, await rbox(0.1, 0.18, ww + 0.16, 0.01, 1), stone, [0.0, sill + wh + 0.1, z], root);
    for (const [n, dz] of [['RevealA', -ww / 2], ['RevealB', ww / 2]]) part(n + s, uv(boxGeo(0.2, wh, 0.02)), stone, [-0.12, sill + wh / 2, z + dz + (dz < 0 ? 0.01 : -0.01)], root);
    part('Pane' + s, uv(boxGeo(0.01, wh - 0.04, ww - 0.04)), glow('glow_window', 0xffc98a), [-0.2, sill + wh / 2, z], root);
    part('MullV' + s, uv(boxGeo(0.04, wh - 0.04, 0.04)), black, [-0.18, sill + wh / 2, z], root);
    part('MullH' + s, uv(boxGeo(0.03, 0.035, ww - 0.1)), black, [-0.18, sill + wh * 0.62, z], root);   // thinner than the uprights: no shared faces where they cross
    for (const [n, dz] of [['FrameA', -ww / 2 + 0.03], ['FrameB', ww / 2 - 0.03]]) part(n + s, uv(boxGeo(0.05, wh - 0.02, 0.05)), black, [-0.18, sill + wh / 2, z + dz], root);
  }
  part('Cornice', await rbox(0.22, 0.16, W + 0.02, 0.02, 2), stone, [0.04, H - 0.09, 0], root);
  return root;
}
