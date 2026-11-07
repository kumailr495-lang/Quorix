// LUMIERE v5.20 - baked light maps (tools/bake/README.md). tools/bake rebuilds each room in Blender and bakes its light in Cycles (soft
// shadows, bounce light, contact shadows); www/bake/index.json lists the rooms that have a bake. A baked room swaps its solid mesh for
// the baked copy (the same triangles plus a light-map uv set) and reads its light from the maps instead of per-vertex light: house light
// (dims with the house lights), fixed light (steps, signs, LED lines) and, in the halls, the screen's light (tinted live by the picture).
// Each bake stores a fingerprint of the geometry it was made from. A room built differently (code changed, not re-baked) ignores its bake
// and keeps the per-vertex light, with a console warning, so a stale bake can never put light in the wrong place.
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/addons/GLTFLoader.js';
export const BAKES = {};
// fingerprint: vertex and index counts plus sums of quantised positions, material ids and indices, weighted by position in the buffer
export function geoHash(g) {
  const P = g.attributes.position.array, I = g.index ? g.index.array : [], Mt = g.attributes.matid ? g.attributes.matid.array : [], MOD = 2147483647;
  let a = 0, b = 0, c = 0;
  for (let i = 0; i < P.length; i++) a = ((a + Math.round(P[i] * 1000) * ((i % 251) + 1)) % MOD + MOD) % MOD;
  for (let i = 0; i < Mt.length; i++) b = (b + Math.round(Mt[i]) * ((i % 241) + 1)) % MOD;
  for (let i = 0; i < I.length; i++) c = (c + I[i] * ((i % 239) + 1)) % MOD;
  return `${P.length / 3}.${I.length}.${a}.${b}.${c}`;
}
// load every listed bake (geometry + maps) before the world is built; rooms without one, or a missing index, simply use vertex light
export async function loadBakes(base = './bake/', onEach = () => {}) {
  let idx = null;
  try { const r = await fetch(base + 'index.json', { cache: 'no-cache' }); if (r.ok) idx = await r.json(); } catch (e) { idx = null; }
  if (!idx || !idx.rooms) return BAKES;
  const ld = new GLTFLoader(), tl = new THREE.TextureLoader(), keys = Object.keys(idx.rooms); let done = 0;
  await Promise.all(keys.map(async (key) => {
    const m = idx.rooms[key];
    try {
      const [gl, probes, pv, ...maps] = await Promise.all([ld.loadAsync(base + m.glb), m.probes ? fetch(base + m.probes).then((r) => r.json()) : null, m.pv ? fetch(base + m.pv.file).then((r) => r.arrayBuffer()) : null, ...m.maps.map((f) => tl.loadAsync(base + f))]);
      let geo = null; gl.scene.traverse((o) => { if (o.isMesh && !geo) geo = o.geometry; });
      if (!geo || !geo.attributes.uv1 || !geo.attributes._matid) throw new Error('baked mesh is missing its light-map uvs or material ids');
      // glTF stores v flipped: material uvs go back to the engine's convention; light-map uvs already match the PNG rows (flipY off)
      const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i));
      geo.setAttribute('lmuv', geo.attributes.uv1); geo.deleteAttribute('uv1');
      geo.setAttribute('matid', geo.attributes._matid); geo.deleteAttribute('_matid');
      for (const t of maps) { t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.needsUpdate = true; }
      BAKES[key] = { ...m, geo, maps, probes, pvData: pv ? new Uint8Array(pv) : null };
    } catch (e) { console.warn('bake ' + key + ' not used: ' + e.message); }
    onEach(++done / keys.length, key);
  }));
  return BAKES;
}
// the bake for a room whose built geometry matches it, or null
export function bakeFor(key, g) {
  const b = BAKES[key]; if (!b) return null;
  const h = geoHash(g); if (h === b.hash) return b;
  console.warn(`bake ${key} is stale (built ${h}, baked ${b.hash}): using vertex light. Re-run tools/bake.`); return null;
}
// per-vertex light of a room's placed props, baked in Cycles (7 bytes a vertex: house rgb, fixed rgb, screen; sRGB curve, one scale per
// layer): written as the lh / lf / ls attributes the vertex-lit shader reads. False when the bake has none or the props changed.
const DEC = (() => { const t = new Float32Array(256); for (let i = 0; i < 256; i++) { const v = i / 255; t[i] = v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); } return t; })();
export function propLight(b, g) {
  const P = b.pv, d = b.pvData; if (!P || !d) return false;
  const n = g.attributes.position.count, h = geoHash(g); if (P.hash !== h || d.length !== n * 7) { console.warn(`bake ${b.glb} props are stale (built ${h}, baked ${P.hash}): analytic light`); return false; }
  const lh = new Float32Array(n * 3), lf = new Float32Array(n * 3), ls = new Float32Array(n), [sh, sf, ss] = P.scale;
  for (let i = 0; i < n; i++) { const o = i * 7; lh[i * 3] = DEC[d[o]] * sh; lh[i * 3 + 1] = DEC[d[o + 1]] * sh; lh[i * 3 + 2] = DEC[d[o + 2]] * sh;
    lf[i * 3] = DEC[d[o + 3]] * sf; lf[i * 3 + 1] = DEC[d[o + 4]] * sf; lf[i * 3 + 2] = DEC[d[o + 5]] * sf; ls[i] = DEC[d[o + 6]] * ss; }
  g.setAttribute('lh', new THREE.BufferAttribute(lh, 3)); g.setAttribute('lf', new THREE.BufferAttribute(lf, 3)); g.setAttribute('ls', new THREE.BufferAttribute(ls, 1)); return true;
}
