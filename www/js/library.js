// LUMIERE v5 - the material library. Every surface in the building (room shells and Kiln-authored props) uses one of these.
// Textures come from tools/textures/gen.py (www/tex/<tex>_a.jpg albedo, <tex>_n.jpg normal), tile per metre in world space
// (room shells) or per metre of the prop's own box-projected UVs (Kiln assets use projectUV metersPerUnit: 1).
//   mode 'rel': the map is detail around mid-grey stored as linear data; the shader multiplies it by the vertex tint x 2.
//   mode 'abs': the map has its own colours (parquet, geometric tile, carpet, marble); the tint multiplies it (white = as painted).
import * as THREE from 'three';
export const MAT = { paint: 0, fabric: 1, wood: 2, terrazzo: 3, metal: 4, carpet: 5, plaster: 6, tile: 7, leather: 8, acoustic: 9, glass: 10, granite: 11, marble: 12, rubber: 13, chrome: 14, lacquer: 15, hallCarpet: 16, slats: 17, concrete: 18, screen: 19,
  chevron: 20, geotile: 21, deco: 22, fluted: 23, brass: 24, powder: 25, asphalt: 26, paving: 27, velvet: 1 };
// id -> texture set and surface response. mpt = metres per texture tile; rough/metal scalars; nstr = normal strength; sheen = velvet rim light;
// spec = how strongly the room reflection shows (glossy floors, glass); relief = how much the normal map shades the baked light
export const LIB = {
  0: { tex: 'flat', mode: 'rel', mpt: 1.0, rough: 0.75, metal: 0, nstr: 0.4 },
  1: { tex: 'velvet', mode: 'rel', mpt: 0.6, rough: 0.9, metal: 0, nstr: 0.8, sheen: 0.55 },
  2: { tex: 'walnut', mode: 'rel', mpt: 1.2, rough: 0.42, metal: 0, nstr: 0.6 },
  3: { tex: 'terrazzo', mode: 'abs', mpt: 1.0, rough: 0.2, metal: 0, nstr: 0.3, spec: 1.2 },
  4: { tex: 'brushed', mode: 'rel', mpt: 0.6, rough: 0.35, metal: 1, nstr: 0.4 },
  5: { tex: 'carpet_hall', mode: 'rel', mpt: 1.0, rough: 1, metal: 0, nstr: 0.6 },
  6: { tex: 'plaster', mode: 'rel', mpt: 2.0, rough: 0.85, metal: 0, nstr: 0.5 },
  7: { tex: 'squaretile', mode: 'rel', mpt: 1.2, rough: 0.3, metal: 0, nstr: 1, spec: 1 },
  8: { tex: 'leather', mode: 'rel', mpt: 0.4, rough: 0.45, metal: 0, nstr: 1, sheen: 0.15 },
  9: { tex: 'woven', mode: 'rel', mpt: 0.3, rough: 0.95, metal: 0, nstr: 0.8 },
  10: { tex: 'flat', mode: 'rel', mpt: 1.0, rough: 0.04, metal: 0, nstr: 0, spec: 2.2 },
  11: { tex: 'granite', mode: 'rel', mpt: 0.8, rough: 0.28, metal: 0, nstr: 0.3, spec: 1.1 },
  12: { tex: 'marble', mode: 'abs', mpt: 1.6, rough: 0.12, metal: 0, nstr: 0.2, spec: 1.3 },
  13: { tex: 'flat', mode: 'rel', mpt: 1.0, rough: 0.9, metal: 0, nstr: 0.3 },
  14: { tex: 'flat', mode: 'rel', mpt: 1.0, rough: 0.08, metal: 1, nstr: 0 },
  15: { tex: 'flat', mode: 'rel', mpt: 1.0, rough: 0.16, metal: 0, nstr: 0, spec: 1.2 },
  16: { tex: 'carpet_hall', mode: 'rel', mpt: 1.0, rough: 1, metal: 0, nstr: 0.6 },
  17: { tex: 'slats', mode: 'rel', mpt: 0.4, rough: 0.45, metal: 0, nstr: 1, relief: 0.6 },
  18: { tex: 'concrete', mode: 'rel', mpt: 2.5, rough: 0.85, metal: 0, nstr: 0.8 },
  19: { tex: 'flat', mode: 'rel', mpt: 1.0, rough: 0.95, metal: 0, nstr: 0 },
  20: { tex: 'chevron', mode: 'abs', mpt: 1.6, rough: 0.32, metal: 0, nstr: 0.8, spec: 1.1, relief: 0.4 },
  21: { tex: 'geotile', mode: 'abs', mpt: 1.2, rough: 0.22, metal: 0, nstr: 0.8, spec: 1.1 },
  22: { tex: 'carpet_deco', mode: 'abs', mpt: 2.4, rough: 1, metal: 0, nstr: 0.6 },
  23: { tex: 'fluted', mode: 'rel', mpt: 0.4, rough: 0.5, metal: 0, nstr: 1, relief: 0.8 },
  24: { tex: 'brushed', mode: 'rel', mpt: 0.6, rough: 0.28, metal: 1, nstr: 0.3 },
  25: { tex: 'powder', mode: 'rel', mpt: 0.5, rough: 0.5, metal: 0.6, nstr: 0.3 },
  26: { tex: 'asphalt', mode: 'rel', mpt: 3.0, rough: 0.9, metal: 0, nstr: 0.6 },
  27: { tex: 'paving', mode: 'rel', mpt: 2.4, rough: 0.8, metal: 0, nstr: 0.8 },
};
// Kiln assets name their materials; the name picks a library entry and the tint (sRGB hex)
export const NAMED = {
  velvet_teal: [1, '#1d5a56'], velvet_burgundy: [1, '#6e1424'], velvet_navy: [1, '#1e2c4a'], velvet_charcoal: [1, '#2d2f36'], velvet_mustard: [1, '#a77a25'], velvet_rose: [1, '#9a4f5a'],
  leather_caramel: [8, '#8a5430'], leather_black: [8, '#1c1a1a'], leather_oxblood: [8, '#4e1418'],
  walnut: [2, '#6b4630'], walnut_dark: [2, '#3e2618'], oak: [2, '#b08458'], slats_walnut: [17, '#6b4630'], fluted_walnut: [23, '#6b4630'], fluted_plaster: [23, '#d8cbb8'],
  brass: [24, '#c9a061'], bronze: [24, '#8a6440'], chrome: [14, '#e8e8e8'], blackmetal: [25, '#1c1c1f'], charcoal: [25, '#26262b'], steel: [4, '#9a9ca2'],
  marble_nero: [12, '#ffffff'], terrazzo: [3, '#ffffff'], granite: [11, '#3a3a3c'], lacquer_black: [15, '#141416'], lacquer_red: [15, '#8a1522'], lacquer_cream: [15, '#e9e1d2'],
  glass: [10, '#2a3036'], glass_amber: [10, '#6a4a22'], rubber: [13, '#1a1a1a'], plastic_black: [15, '#18181a'], paint_black: [0, '#121214'], paint_cream: [0, '#e7dfd0'], paint_red: [0, '#9e1c26'],
  fabric_black: [9, '#141416'], acoustic: [9, '#2a2a30'], carpet_deco: [22, '#ffffff'], plant: [0, '#2f5a2a'], soil: [18, '#2b2119'], ceramic: [15, '#e6e0d6'], popcorn: [6, '#f2dca0'], paper_red: [0, '#c4202c'],
};
const _c = new THREE.Color();
export function named(name) { const k = String(name || '').toLowerCase().replace(/[^a-z_]/g, '').replace(/_+$/, ''); const e = NAMED[k] || NAMED[k.replace(/_lod\d$/, '')]; return e ? { id: e[0], tint: _c.set(e[1]).toArray() } : null; }
// ---- textures ----
const cache = new Map();
let base = './tex/';
export function setTexBase(b) { base = b; }
export function libTextures(id, renderer) {
  const L = LIB[id] || LIB[0], key = L.tex;
  if (cache.has(key)) return cache.get(key);
  const ld = new THREE.TextureLoader(), an = renderer ? Math.min(4, renderer.capabilities.getMaxAnisotropy()) : 1;
  const prep = (t, srgb) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = an; t.minFilter = THREE.LinearMipmapLinearFilter; return t; };
  const e = { a: prep(ld.load(base + key + '_a.jpg'), L.mode === 'abs'), n: prep(ld.load(base + key + '_n.jpg'), false) };
  cache.set(key, e); return e;
}
// wait until every texture used so far has decoded (so the first frame is not half-loaded)
export function texturesReady() { const ps = []; for (const e of cache.values()) for (const t of [e.a, e.n]) if (!t.image) ps.push(new Promise((ok) => { const f = () => (t.image ? ok() : setTimeout(f, 30)); f(); })); return Promise.all(ps); }
// review tool (tools/dev/view-glb.mjs LIB=1): put library maps on a plain glTF scene as MeshStandardMaterial
export async function applyLibrary(root, renderer) {
  setTexBase('/www/tex/');
  root.traverse((o) => { if (!o.isMesh) return; const n = named(o.material.name); if (!n) return; const L = LIB[n.id], T = libTextures(n.id, renderer);
    const m = new THREE.MeshStandardMaterial({ name: o.material.name, roughness: L.rough, metalness: L.metal, normalMap: L.nstr ? T.n : null });
    m.color.setRGB(n.tint[0], n.tint[1], n.tint[2]); if (L.mode === 'rel') { m.color.multiplyScalar(2); m.onBeforeCompile = (s) => { s.fragmentShader = s.fragmentShader.replace('#include <map_fragment>', 'diffuseColor.rgb *= texture2D( map, vMapUv ).rgb;'); }; }
    m.map = T.a; m.normalScale.set(L.nstr, L.nstr);
    const g = o.geometry; if (g.attributes.uv) { const uv = g.attributes.uv.clone(); for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / L.mpt, uv.getY(i) / L.mpt); g.setAttribute('uv', uv); }
    o.material = m; });
  await texturesReady();
}
