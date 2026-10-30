// LUMIERE v5 - Kiln-authored props (www/models/*.glb, sources in tools/kiln/*.kiln.js).
// A GLB carries geometry, metre-scaled UVs and material NAMES; library.js turns each name into a texture set + tint.
// Kiln's frame is +X forward; here an asset's front faces +z at yaw 0 (the same convention as the old kits).
// Meshes whose material name starts with "glow" are emitters: they go to the room's glow mesh in the material's colour.
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/addons/GLTFLoader.js';
import { named, MAT } from './library.js';
export const ASSETS = {};
// every GLB the world uses (tools/kiln/<name>.kiln.js or tools/blender/{seats,fixtures}.py -> www/models/<name>.glb)
// (v5.20: the hall seats are the Blender families below; the v5.1 Kiln seats seat_standard, arm_standard, recliner, console_recliner and
// seat_giant stay in tools/kiln and www/models but are no longer loaded; v7 retired the v5 lobby set: column_fluted(_5), chandelier_ring,
// banquette_round, torchere_deco, back_bar, pendant_dish, which also stay in the repo)
export const ASSET_LIST = ['counter_module', 'popcorn_machine', 'bar_stool', 'armchair_deco', 'side_table',
  'seat_club', 'arm_club', 'seat_rocker', 'arm_rocker', 'seat_classic', 'arm_classic', 'sconce_deco', 'downlight', 'speaker_array', 'urinal', 'basin_vessel', 'tap_brass', 'mirror_round', 'stanchion', 'rope_velvet', 'poster_case', 'planter_tall',
  'facade_bay', 'shopfront', 'lamp_post', 'car_sedan', 'drinks_fountain', 'candy_wall', 'kiosk', 'pos_terminal', 'bench_velvet', 'bin_brass', 'usher_podium', 'door_padded',
  // v7 (docs/V7-DESIGN.md): Kiln hero props and Blender signage letters
  'chandelier_cascade', 'sofa_curve', 'table_lounge', 'pendant_ring', 'back_bar_onyx', 'bar_counter', 'poster_totem', 'number_totem', 'planter_hedge', 'bollard_light',
  'letters_lumiere_lit', 'letters_lumiere', 'letters_cinemas', 'letters_imax', 'restroom_set'];
const PRE = new THREE.Matrix4().makeRotationY(-Math.PI / 2);   // Kiln +X -> engine +Z
export async function loadAssets(names, base = './models/', onEach = () => {}) {
  const ld = new GLTFLoader(); let done = 0;
  await Promise.all(names.map(async (n) => {
    try { const g = await ld.loadAsync(base + n + '.glb'); await lodTiers(g); ASSETS[n] = prepare(g.scene, n); } catch (e) { console.warn('asset ' + n + ' failed: ' + e.message); }
    onEach(++done / names.length, n);
  }));
  return ASSETS;
}
// Kiln stores the lower detail tiers with MSFT_lod (they are not children in the scene graph) and GLTFLoader builds only the first
// tier, so v5.1 to v5.11 had no LOD1 at all: every seat and arm beyond 7 m was an empty mesh. Build the other tiers next to it.
async function lodTiers(g) {
  const nodes = g.parser.json.nodes || [];
  for (let i = 0; i < nodes.length; i++) { const ids = nodes[i].extensions && nodes[i].extensions.MSFT_lod && nodes[i].extensions.MSFT_lod.ids; if (!ids) continue;
    let host = null; g.scene.traverse((o) => { const a = g.parser.associations.get(o); if (a && a.nodes === i) host = o; });
    if (host && host.parent) for (const id of ids) host.parent.add(await g.parser.getDependency('node', id)); }
}
function prepare(scene, name) {
  scene.updateMatrixWorld(true); const parts = [], box = new THREE.Box3();
  scene.traverse((o) => {
    if (!o.isMesh || !o.visible) return;
    const lod = (() => { for (let p = o; p; p = p.parent) { const m = /LOD(\d)/.exec(p.name || ''); if (m) return +m[1]; } return 0; })();
    const geo = o.geometry.clone(); geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(PRE, o.matrixWorld));
    if (!geo.attributes.normal) geo.computeVertexNormals();
    const mn = (o.material && o.material.name) || '', glow = /^glow/i.test(mn);
    const nm = named(mn) || { id: 0, tint: (o.material && o.material.color ? o.material.color.toArray() : [0.5, 0.5, 0.5]) };
    const c = o.material && o.material.color ? o.material.color.toArray() : [1, 1, 1], ei = o.material && o.material.emissiveIntensity != null ? o.material.emissiveIntensity : 1;
    const em = o.material && o.material.emissive ? o.material.emissive.toArray().map((v) => v * ei) : c;
    parts.push({ geo, id: nm.id, tint: nm.tint, glow, glowColor: em.some((v) => v > 0) ? em : c, lod, name: o.name.replace(/_\d+$/, ''), matName: mn });   // LOD tiers repeat names (loader adds _2)
    if (lod === 0) { geo.computeBoundingBox(); box.union(geo.boundingBox); }
  });
  return { name, parts, box, lods: Math.max(...parts.map((p) => p.lod)) + 1 };
}
// stamp an asset into a room's accumulators. o: { lod, scale, grp (glow light group: 1 dims with the house lights), glowK, glowMul { meshName: k },
// glowColor (linear rgb), swap { materialName: [id, rgb] }, tints { meshName: rgb }, collide: true|pad,
// only: a mesh-name prefix (one fitting out of a set GLB, e.g. 'Mesh_Dryer'), shift: [x, y, z] moved in the asset's own frame first }
export function placeAsset(room, name, x, y, z, yaw = 0, o = {}) {
  const A = ASSETS[name]; if (!A) { console.warn('missing asset ' + name); return null; }
  const s = o.scale ?? 1, mtx = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)), typeof s === 'number' ? new THREE.Vector3(s, s, s) : new THREE.Vector3(...s));
  if (o.shift) mtx.multiply(new THREE.Matrix4().makeTranslation(...o.shift));
  const lod = o.lod ?? 0;
  for (const p of A.parts) {
    if (p.lod !== lod || (o.only && !p.name.startsWith(o.only))) continue;
    if (p.glow) { const k = (o.glowK ?? 1) * (o.glowMul && o.glowMul[p.name] != null ? o.glowMul[p.name] : 1); if (k <= 0) continue; room.gacc.add(p.geo, mtx, (o.glowColor || p.glowColor).map((v) => v * k), { grp: o.grp ?? 0 }); continue; }
    const sw = o.swap && o.swap[p.matName];   // swap a named material for this placement: { velvet_teal: [libraryId, linearRgb] }
    (room.pacc || room.acc).add(p.geo, mtx, sw ? sw[1] : o.tints && o.tints[p.name] ? o.tints[p.name] : p.tint, { mat: sw ? sw[0] : p.id, uv: 'mesh', occ: o.occ ?? 1 });
  }
  const b = A.box.clone().applyMatrix4(mtx);
  if (o.collide) { const pad = typeof o.collide === 'number' ? o.collide : 0; room.col(b.min.x - pad, b.min.z - pad, b.max.x + pad, b.max.z + pad, b.min.y, b.max.y); }
  return b;
}
// one merged geometry (per material groups, 'occ' attribute) for instancing, e.g. hall seats. extra: matrix applied after the Kiln->engine turn
// over = per-hall material swaps keyed by mesh name, each with an optional library id and tint
export function assetGeometry(name, lod = 0, extra = null, toGeometry, Acc, over = null) {
  const A = ASSETS[name]; if (!A) return null; const acc = new Acc(), m = extra || new THREE.Matrix4();
  for (const p of A.parts) { if (p.lod !== lod) continue;
    if (p.glow) { const g = p.geo.clone(); g.setAttribute('occ', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count).fill(1), 1)); acc.add(g, m, p.glowColor, { mat: MAT.emit, uv: 'mesh' }); continue; }   // seat LEDs, cup-holder rings
    // cheap baked occlusion for an instanced prop: undersides and low parts darker
    const g = p.geo.clone(), P = g.attributes.position, N = g.attributes.normal, occ = new Float32Array(P.count);
    for (let i = 0; i < P.count; i++) { const y = P.getY(i), ny = N.getY(i); occ[i] = (0.55 + 0.45 * Math.min(1, Math.max(0, (y - 0.05) / 0.7))) * (ny < -0.5 ? 0.6 : 1); }
    const o = over && over[p.name]; g.setAttribute('occ', new THREE.BufferAttribute(occ, 1)); acc.add(g, m, o && o.tint ? o.tint : p.tint, { mat: o && o.id != null ? o.id : p.id, uv: 'mesh' }); }
  return toGeometry(acc, 'occ');
}
