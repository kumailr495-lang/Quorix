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
// v9: only what the v9 rooms use (world9.js DRESS and the hall seat families, intro9.js's taxi); the v7/v8 props stay in www/models
export const ASSET_LIST = ['seat_rocker', 'arm_rocker', 'seat_club', 'arm_club', 'seat_classic', 'arm_classic', 'sofa_curve', 'table_lounge', 'planter_tall', 'planter_hedge', 'planter_tree',
  'poster_totem', 'stanchion', 'rope_velvet', 'popcorn_machine', 'drinks_fountain', 'candy_wall', 'bin_brass', 'bench_velvet', 'lamp_post', 'bollard_light', 'car_taxi',
  'armchair_deco', 'side_table', 'torchere_deco', 'chandelier_cascade', 'letters_lumiere_lit', 'sconce_deco', 'mirror_round', 'basin_vessel', 'tap_brass', 'urinal', 'restroom_set'];
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
    const geo = o.geometry.clone(), mw = new THREE.Matrix4().multiplyMatrices(PRE, o.matrixWorld); geo.applyMatrix4(mw);
    if (!geo.attributes.normal) geo.computeVertexNormals();
    solidify(geo, mw.determinant() < 0, (TWO_SIDED[name] || []).includes(parts.length), name + '#' + parts.length);
    const mn = (o.material && o.material.name) || '', glow = /^glow/i.test(mn);
    const nm = named(mn) || { id: 0, tint: (o.material && o.material.color ? o.material.color.toArray() : [0.5, 0.5, 0.5]) };
    const c = o.material && o.material.color ? o.material.color.toArray() : [1, 1, 1], ei = o.material && o.material.emissiveIntensity != null ? o.material.emissiveIntensity : 1;
    const em = o.material && o.material.emissive ? o.material.emissive.toArray().map((v) => v * ei) : c;
    parts.push({ geo, id: nm.id, tint: nm.tint, glow, glowColor: em.some((v) => v > 0) ? em : c, lod, name: o.name.replace(/_\d+$/, ''), matName: mn });   // LOD tiers repeat names (loader adds _2)
    if (lod === 0) { geo.computeBoundingBox(); box.union(geo.boundingBox); }
  });
  return { name, parts, box, lods: Math.max(...parts.map((p) => p.lod)) + 1 };
}
// v9 see-through fixes, per part as loaded (tools/dev/seethru.mjs --assets): a mirrored node (negative scale) baked into the geometry
// keeps its index order, so its winding would turn inside out; a face whose winding disagrees with its own normals is turned to match
// them (the hedge planters' leaf clumps: Kiln wound about half their faces inwards, so you saw through them) and a zero-area face is
// dropped. The parts listed in TWO_SIDED are open shells (an edge used by one face only: the taxi's body panels and glass, rope ends,
// bollard rings): they get their back faces too, as the GLBs' double-sided materials meant. The list is measured offline, not on the
// phone: ?assetcheck=1 recomputes it and warns when a GLB changed (tools/dev/seethru.mjs --assets runs that check).
export const TWO_SIDED = { sofa_curve: [17], planter_tree: [3, 4, 5], rope_velvet: [0], lamp_post: [3], bollard_light: [1], car_taxi: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 56, 57] };
const CHECK = typeof location !== 'undefined' && /[?&]assetcheck=1/.test(location.search);
function solidify(g, mirrored, twoSided, label) {
  const P = g.attributes.position, N = g.attributes.normal; if (!g.index) g.setIndex([...Array(P.count).keys()]);
  const I0 = g.index.array, I = [], a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
  for (let t = 0; t + 2 < I0.length; t += 3) {
    let i0 = I0[t], i1 = I0[t + 1], i2 = I0[t + 2]; if (mirrored) [i1, i2] = [i2, i1];
    a.fromBufferAttribute(P, i0); b.fromBufferAttribute(P, i1).sub(a); c.fromBufferAttribute(P, i2).sub(a); b.cross(c); if (b.lengthSq() < 1e-20) continue;   // zero-area face: drawn as nothing
    n.set(N.getX(i0) + N.getX(i1) + N.getX(i2), N.getY(i0) + N.getY(i1) + N.getY(i2), N.getZ(i0) + N.getZ(i1) + N.getZ(i2));
    if (n.lengthSq() > 1e-12 && b.normalize().dot(n.normalize()) < -0.2) [i1, i2] = [i2, i1];
    I.push(i0, i1, i2);
  }
  if (CHECK) { const E = new Map(), key = (j) => `${Math.round(P.getX(j) * 1e4)},${Math.round(P.getY(j) * 1e4)},${Math.round(P.getZ(j) * 1e4)}`;
    for (let t = 0; t < I.length; t += 3) { const ks = [key(I[t]), key(I[t + 1]), key(I[t + 2])]; for (let e = 0; e < 3; e++) { const p = ks[e], q = ks[(e + 1) % 3], k = p < q ? p + '|' + q : q + '|' + p; E.set(k, (E.get(k) || 0) + 1); } }
    let open = 0; for (const v of E.values()) if (v === 1) open++;
    if (!!open !== !!twoSided) console.warn(`[assetcheck] ${label}: ${open} open edges, ${twoSided ? 'listed' : 'not listed'} in TWO_SIDED`);
    (CHECK_OPEN[label.split('#')[0]] || (CHECK_OPEN[label.split('#')[0]] = [])).push(open ? +label.split('#')[1] : null); }
  if (twoSided) {   // back faces: a copy of every vertex with its normal flipped, the triangles in reverse order (attributes may be interleaved)
    const n0 = P.count, GET = ['getX', 'getY', 'getZ', 'getW'];
    for (const name of Object.keys(g.attributes)) { const A = g.attributes[name], w = A.itemSize, k = name === 'normal' ? -1 : 1, out = new Float32Array(n0 * 2 * w);
      for (let i = 0; i < n0; i++) for (let c = 0; c < w; c++) { const v = A[GET[c]](i); out[i * w + c] = v; out[(n0 + i) * w + c] = v * k; }
      g.setAttribute(name, new THREE.BufferAttribute(out, w)); }
    const m = I.length; for (let t = 0; t < m; t += 3) I.push(I[t] + n0, I[t + 2] + n0, I[t + 1] + n0); }
  g.setIndex(I);
}
export const CHECK_OPEN = {};   // ?assetcheck=1: asset -> the indices of its open parts (the TWO_SIDED entry it should have)
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
  else if (o.collide !== false && solidProp(name, b)) room.col(b.min.x + 0.03, b.min.z + 0.03, b.max.x - 0.03, b.max.z - 0.03, b.min.y, b.max.y);
  if (name.startsWith('bin')) (room.bins || (room.bins = [])).push({ x: (b.min.x + b.max.x) / 2, z: (b.min.z + b.max.z) / 2 });   // bins you can drop empty cups into
  return b;
}
// v8 (phone feedback: "I am able to go through or in between them"): furniture standing on the floor blocks you and the people; hanging,
// wall-mounted, flat and walk-through things don't. Footprints over 14 m2 (counters with walk-in gaps, facades) keep their own colliders.
const NO_COLLIDE = /^(letters|chandelier|pendant|downlight|sconce|speaker|rug|door|seat|arm_|stair|facade|shopfront|torchere|restroom_set|poster|frame|sign|led|light|tap|mirror|basin|urinal|lamp_post)/;
function solidProp(name, b) { const h = b.max.y - b.min.y, w = b.max.x - b.min.x, d = b.max.z - b.min.z; return !NO_COLLIDE.test(name) && b.min.y < 0.35 && h > 0.35 && w > 0.12 && d > 0.12 && w * d < 14; }
// one merged geometry (per material groups, 'occ' attribute) for instancing, e.g. hall seats. extra: matrix applied after the Kiln->engine turn
// over = per-hall material swaps keyed by mesh name or material name, each with an optional library id and tint
export function assetGeometry(name, lod = 0, extra = null, toGeometry, Acc, over = null) {
  const A = ASSETS[name]; if (!A) return null; const acc = new Acc(), m = extra || new THREE.Matrix4();
  for (const p of A.parts) { if (p.lod !== lod) continue;
    if (p.glow) { const g = p.geo.clone(); g.setAttribute('occ', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count).fill(1), 1)); acc.add(g, m, p.glowColor, { mat: MAT.emit, uv: 'mesh' }); continue; }   // seat LEDs, cup-holder rings
    // cheap baked occlusion for an instanced prop: undersides and low parts darker
    const g = p.geo.clone(), P = g.attributes.position, N = g.attributes.normal, occ = new Float32Array(P.count);
    for (let i = 0; i < P.count; i++) { const y = P.getY(i), ny = N.getY(i); occ[i] = (0.55 + 0.45 * Math.min(1, Math.max(0, (y - 0.05) / 0.7))) * (ny < -0.5 ? 0.6 : 1); }
    // a per-hall swap matches the mesh name or the material name
    const o = over && (over[p.name] || over[p.matName]); g.setAttribute('occ', new THREE.BufferAttribute(occ, 1)); acc.add(g, m, o && o.tint ? o.tint : p.tint, { mat: o && o.id != null ? o.id : p.id, uv: 'mesh' }); }
  return toGeometry(acc, 'occ');
}
