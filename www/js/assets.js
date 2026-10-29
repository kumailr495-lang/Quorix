// LUMIERE v5 - Kiln-authored props (www/models/*.glb, sources in tools/kiln/*.kiln.js).
// A GLB carries geometry, metre-scaled UVs and material NAMES; library.js turns each name into a texture set + tint.
// Kiln's frame is +X forward; here an asset's front faces +z at yaw 0 (the same convention as the old kits).
// Meshes whose material name starts with "glow" are emitters: they go to the room's glow mesh in the material's colour.
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/addons/GLTFLoader.js';
import { named } from './library.js';
export const ASSETS = {};
// every GLB the world uses (tools/kiln/<name>.kiln.js -> www/models/<name>.glb)
export const ASSET_LIST = ['seat_standard', 'arm_standard', 'recliner', 'console_recliner', 'seat_giant'];
const PRE = new THREE.Matrix4().makeRotationY(-Math.PI / 2);   // Kiln +X -> engine +Z
export async function loadAssets(names, base = './models/', onEach = () => {}) {
  const ld = new GLTFLoader(); let done = 0;
  await Promise.all(names.map(async (n) => {
    try { const g = await ld.loadAsync(base + n + '.glb'); ASSETS[n] = prepare(g.scene, n); } catch (e) { console.warn('asset ' + n + ' failed: ' + e.message); }
    onEach(++done / names.length, n);
  }));
  return ASSETS;
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
    parts.push({ geo, id: nm.id, tint: nm.tint, glow, glowColor: em.some((v) => v > 0) ? em : c, lod, name: o.name });
    if (lod === 0) { geo.computeBoundingBox(); box.union(geo.boundingBox); }
  });
  return { name, parts, box, lods: Math.max(...parts.map((p) => p.lod)) + 1 };
}
// stamp an asset into a room's accumulators. o: { lod, scale, grp (glow light group: 1 dims with the house lights), glowK, tint (override, linear rgb), collide: true|pad }
export function placeAsset(room, name, x, y, z, yaw = 0, o = {}) {
  const A = ASSETS[name]; if (!A) { console.warn('missing asset ' + name); return null; }
  const s = o.scale ?? 1, mtx = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)), typeof s === 'number' ? new THREE.Vector3(s, s, s) : new THREE.Vector3(...s));
  const lod = o.lod ?? 0;
  for (const p of A.parts) {
    if (p.lod !== lod) continue;
    if (p.glow) { const k = o.glowK ?? 1; room.gacc.add(p.geo, mtx, p.glowColor.map((v) => v * k), { grp: o.grp ?? 0 }); continue; }
    room.acc.add(p.geo, mtx, o.tints && o.tints[p.name] ? o.tints[p.name] : p.tint, { mat: p.id, uv: 'mesh', occ: o.occ ?? 1 });
  }
  const b = A.box.clone().applyMatrix4(mtx);
  if (o.collide) { const pad = typeof o.collide === 'number' ? o.collide : 0; room.col(b.min.x - pad, b.min.z - pad, b.max.x + pad, b.max.z + pad, b.min.y, b.max.y); }
  return b;
}
// one merged geometry (per material groups, 'occ' attribute) for instancing, e.g. hall seats. extra: matrix applied after the Kiln->engine turn
export function assetGeometry(name, lod = 0, extra = null, toGeometry, Acc, over = null) {   // over: { meshName: { id?, tint? } } per-hall material swaps
  const A = ASSETS[name]; if (!A) return null; const acc = new Acc(), m = extra || new THREE.Matrix4();
  for (const p of A.parts) { if (p.lod !== lod || p.glow) continue;
    // cheap baked occlusion for an instanced prop: undersides and low parts darker
    const g = p.geo.clone(), P = g.attributes.position, N = g.attributes.normal, occ = new Float32Array(P.count);
    for (let i = 0; i < P.count; i++) { const y = P.getY(i), ny = N.getY(i); occ[i] = (0.55 + 0.45 * Math.min(1, Math.max(0, (y - 0.05) / 0.7))) * (ny < -0.5 ? 0.6 : 1); }
    const o = over && over[p.name]; g.setAttribute('occ', new THREE.BufferAttribute(occ, 1)); acc.add(g, m, o && o.tint ? o.tint : p.tint, { mat: o && o.id != null ? o.id : p.id, uv: 'mesh' }); }
  return toGeometry(acc, 'occ');
}
