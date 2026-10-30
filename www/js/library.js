// LUMIERE v5 - the material library. Every surface in the building (room shells and Kiln-authored props) uses one of these.
// Textures: CC0 scans converted by tools/textures/fetch_cc0.py over the tools/textures/gen.py baseline (www/tex/<tex>_a.jpg albedo,
// <tex>_n.jpg normal); mpt is each scan's physical size (tools/textures/SOURCES.md). They tile per metre in world space
// (room shells) or per metre of the prop's own box-projected UVs (Kiln assets use projectUV metersPerUnit: 1).
//   mode 'rel': the map is detail around mid-grey stored as linear data; the shader multiplies it by the vertex tint x 2.
//   mode 'abs': the map has its own colours (parquet, geometric tile, carpet, marble); the tint multiplies it (white = as painted).
import * as THREE from 'three';
export const MAT = { paint: 0, fabric: 1, wood: 2, terrazzo: 3, metal: 4, carpet: 5, plaster: 6, tile: 7, leather: 8, acoustic: 9, glass: 10, granite: 11, marble: 12, rubber: 13, chrome: 14, lacquer: 15, hallCarpet: 16, slats: 17, concrete: 18, screen: 19,
  chevron: 20, geotile: 21, deco: 22, fluted: 23, brass: 24, powder: 25, asphalt: 26, paving: 27, brick: 28, porcelain: 29, walltile: 30, calacatta: 31, emit: 32, velvet: 1 };
// id -> texture set and surface response. mpt = metres per texture tile; rough/metal scalars; nstr = normal strength; sheen = velvet rim light;
// spec = how strongly the room reflection shows (glossy floors, glass); relief = how much the normal map shades the baked light
export const LIB = {
  0: { tex: 'flat', mode: 'rel', mpt: 1.0, rough: 0.75, metal: 0, nstr: 0.4 },
  1: { tex: 'velvet', mode: 'rel', mpt: 0.28, rough: 0.9, metal: 0, nstr: 0.8, sheen: 0.55 },
  2: { tex: 'walnut', mode: 'rel', mpt: 1.8, rough: 0.42, metal: 0, nstr: 0.6 },
  3: { tex: 'terrazzo', mode: 'abs', mpt: 2.0, rough: 0.2, metal: 0, nstr: 0.3, spec: 1.2 },
  4: { tex: 'brushed', mode: 'rel', mpt: 0.5, rough: 0.35, metal: 1, nstr: 0.4 },
  5: { tex: 'carpet_hall', mode: 'rel', mpt: 0.5, rough: 1, metal: 0, nstr: 0.6 },
  6: { tex: 'plaster', mode: 'rel', mpt: 2.0, rough: 0.85, metal: 0, nstr: 0.5 },
  7: { tex: 'squaretile', mode: 'rel', mpt: 3.0, rough: 0.3, metal: 0, nstr: 1, spec: 1 },
  8: { tex: 'leather', mode: 'rel', mpt: 0.3, rough: 0.45, metal: 0, nstr: 1, sheen: 0.15 },
  9: { tex: 'woven', mode: 'rel', mpt: 0.27, rough: 0.95, metal: 0, nstr: 0.8 },
  10: { tex: 'flat', mode: 'rel', mpt: 1.0, rough: 0.04, metal: 0, nstr: 0, spec: 2.2 },
  11: { tex: 'granite', mode: 'rel', mpt: 0.8, rough: 0.28, metal: 0, nstr: 0.3, spec: 1.1 },
  12: { tex: 'marble', mode: 'abs', mpt: 1.6, rough: 0.12, metal: 0, nstr: 0.2, spec: 1.3 },
  13: { tex: 'flat', mode: 'rel', mpt: 1.0, rough: 0.9, metal: 0, nstr: 0.3 },
  14: { tex: 'flat', mode: 'rel', mpt: 1.0, rough: 0.08, metal: 1, nstr: 0 },
  15: { tex: 'flat', mode: 'rel', mpt: 1.0, rough: 0.16, metal: 0, nstr: 0, spec: 1.2 },
  16: { tex: 'carpet_hall', mode: 'rel', mpt: 0.5, rough: 1, metal: 0, nstr: 0.6 },
  17: { tex: 'slats', mode: 'rel', mpt: 0.4, rough: 0.45, metal: 0, nstr: 1, relief: 0.6 },
  18: { tex: 'concrete', mode: 'rel', mpt: 2.0, rough: 0.85, metal: 0, nstr: 0.8 },
  19: { tex: 'flat', mode: 'rel', mpt: 1.0, rough: 0.95, metal: 0, nstr: 0 },
  20: { tex: 'chevron', mode: 'abs', mpt: 3.4, rough: 0.32, metal: 0, nstr: 0.8, spec: 1.1, relief: 0.4 },
  21: { tex: 'geotile', mode: 'abs', mpt: 1.2, rough: 0.22, metal: 0, nstr: 0.8, spec: 1.1 },
  22: { tex: 'carpet_deco', mode: 'abs', mpt: 2.4, rough: 1, metal: 0, nstr: 0.6 },
  23: { tex: 'fluted', mode: 'rel', mpt: 0.4, rough: 0.5, metal: 0, nstr: 1, relief: 0.8 },
  24: { tex: 'brushed', mode: 'rel', mpt: 0.5, rough: 0.28, metal: 1, nstr: 0.3 },
  25: { tex: 'powder', mode: 'rel', mpt: 0.5, rough: 0.5, metal: 0.6, nstr: 0.3 },
  26: { tex: 'asphalt', mode: 'rel', mpt: 2.35, rough: 0.9, metal: 0, nstr: 0.6 },
  27: { tex: 'paving', mode: 'rel', mpt: 1.8, rough: 0.8, metal: 0, nstr: 0.8 },
  28: { tex: 'brick', mode: 'abs', mpt: 1.6, rough: 0.9, metal: 0, nstr: 1, relief: 0.5 },
  29: { tex: 'porcelain', mode: 'abs', mpt: 1.9, rough: 0.18, metal: 0, nstr: 0.5, spec: 1.1 },
  30: { tex: 'walltile', mode: 'rel', mpt: 1.27, rough: 0.12, metal: 0, nstr: 0.8, spec: 1.2 },
  31: { tex: 'calacatta', mode: 'abs', mpt: 1.6, rough: 0.1, metal: 0, nstr: 0.2, spec: 1.3 },
  // light emitters inside instanced props (seat under-glow, cup-holder rings): the tint is the light colour, drawn at full strength
  32: { tex: 'flat', mode: 'rel', mpt: 1.0, rough: 1, metal: 0, nstr: 0, spec: 0, emit: 1 },
};
export const NUM_IDS = 40;   // uP holds NUM_IDS x 3 vec4 (materials.js)
// Kiln assets name their materials; the name picks a library entry and the tint (sRGB hex)
export const NAMED = {
  velvet_teal: [1, '#1d5a56'], velvet_burgundy: [1, '#6e1424'], velvet_navy: [1, '#1e2c4a'], velvet_charcoal: [1, '#2d2f36'], velvet_mustard: [1, '#a77a25'], velvet_rose: [1, '#9a4f5a'],
  leather_caramel: [8, '#8a5430'], leather_cognac: [8, '#6a3a1e'], leather_chocolate: [8, '#3b2216'], leather_black: [8, '#1c1a1a'], leather_oxblood: [8, '#4e1418'],
  walnut: [2, '#6b4630'], walnut_dark: [2, '#3e2618'], oak: [2, '#b08458'], slats_walnut: [17, '#6b4630'], fluted_walnut: [23, '#6b4630'], fluted_plaster: [23, '#d8cbb8'],
  brass: [24, '#c9a061'], bronze: [24, '#8a6440'], chrome: [14, '#e8e8e8'], blackmetal: [25, '#1c1c1f'], charcoal: [25, '#26262b'], steel: [4, '#9a9ca2'],
  marble_nero: [12, '#ffffff'], marble_calacatta: [31, '#ffffff'], porcelain: [29, '#ffffff'], wall_tile: [30, '#e8e4dc'], terrazzo: [3, '#ffffff'], granite: [11, '#3a3a3c'], lacquer_black: [15, '#141416'], lacquer_red: [15, '#8a1522'], lacquer_cream: [15, '#e9e1d2'],
  glass: [10, '#2a3036'], glass_amber: [10, '#6a4a22'], bottle_green: [10, '#1f4a2a'], bottle_clear: [10, '#9aa8ae'], rubber: [13, '#1a1a1a'], plastic_black: [15, '#18181a'], paint_black: [0, '#121214'], paint_cream: [0, '#e7dfd0'], paint_red: [0, '#9e1c26'],
  fabric_black: [9, '#141416'], brick: [28, '#ffffff'], stone: [18, '#8a7d6c'], stone_dark: [18, '#4a4038'], awning_red: [1, '#7a1622'], awning_green: [1, '#1d4a3a'], tyre: [13, '#141414'], car_red: [15, '#7a1c24'], car_blue: [15, '#22324a'], car_silver: [4, '#b8bcc2'], mirror: [14, '#d8dce0'],
  candy_pink: [15, '#e0558a'], candy_yellow: [15, '#f2c230'], candy_green: [15, '#4caf50'], candy_blue: [15, '#3a7bd5'], candy_orange: [15, '#f07a2a'], candy_red: [15, '#c62a36'], screen_black: [15, '#0a0a0c'], acoustic: [9, '#2a2a30'], carpet_deco: [22, '#ffffff'], plant: [0, '#2f5a2a'], soil: [18, '#2b2119'], ceramic: [15, '#e6e0d6'], popcorn: [6, '#f2dca0'], paper_red: [0, '#c4202c'],
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
// ---- v5.20: every texture set in two texture arrays (albedo, normal), so one room draws in one call instead of one per material ----
// Albedo layers are stored sRGB-encoded (hardware decode, correct filtering); 'rel' detail maps are linear data, so their bytes are
// encoded on the way in and come back out of the sampler as the same linear values. Layers are resampled to one size.
export const LAYERS = [...new Set(Object.values(LIB).map((L) => L.tex))];
// per material id, three vec4: (rough, metal, normal strength, sheen), (reflection, relief, abs, 1 / metres per tile), (layer, emission)
export const PARAMS = (() => { const a = []; for (let id = 0; id < NUM_IDS; id++) { const L = LIB[id] || LIB[0]; a.push(new THREE.Vector4(L.rough, L.metal, L.nstr ?? 0.6, L.sheen || 0), new THREE.Vector4(L.spec ?? 0.8, L.relief ?? 0.25, L.mode === 'abs' ? 1 : 0, 1 / L.mpt), new THREE.Vector4(LAYERS.indexOf(L.tex), L.emit || 0, 0, 0)); } return a; })();
let arrays = null;
export function libArrays(renderer, size = 512, normals = true) {
  if (arrays) return arrays;
  const n = LAYERS.length, an = renderer ? Math.min(4, renderer.capabilities.getMaxAnisotropy()) : 1;
  const mk = (srgb, fill) => { const d = new Uint8Array(size * size * 4 * n); for (let i = 0; i < d.length; i += 4) d.set(fill, i); const t = new THREE.DataArrayTexture(d, size, size, n);
    t.format = THREE.RGBAFormat; t.type = THREE.UnsignedByteType; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = true; t.anisotropy = an; t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.needsUpdate = true; return t; };
  const enc = new Uint8Array(256); for (let i = 0; i < 256; i++) { const v = i / 255; enc[i] = Math.round(255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055)); }
  arrays = { a: mk(true, [enc[128], enc[128], enc[128], 255]), n: normals ? mk(false, [128, 128, 255, 255]) : null, size };
  const rel = new Set(Object.values(LIB).filter((L) => L.mode === 'rel').map((L) => L.tex)), c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d', { willReadFrequently: true }); g.imageSmoothingQuality = 'high';
  const load = (url) => new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => no(new Error('texture ' + url)); im.src = url; });
  arrays.ready = Promise.all(LAYERS.flatMap((name, i) => [['a', arrays.a], ['n', arrays.n]].filter(([, T]) => T).map(async ([kind, T]) => {
    try { const im = await load(base + name + '_' + kind + '.jpg'); g.clearRect(0, 0, size, size); g.drawImage(im, 0, 0, size, size); const px = g.getImageData(0, 0, size, size).data;
      if (kind === 'a' && rel.has(name)) for (let k = 0; k < px.length; k += 4) { px[k] = enc[px[k]]; px[k + 1] = enc[px[k + 1]]; px[k + 2] = enc[px[k + 2]]; }
      T.image.data.set(px, i * size * size * 4); } catch (e) { console.warn(e.message); } }))).then(() => { arrays.a.needsUpdate = true; if (arrays.n) arrays.n.needsUpdate = true; });
  return arrays;
}
// wait until every texture used so far has decoded (so the first frame is not half-loaded)
export function texturesReady() { const ps = []; for (const e of cache.values()) for (const t of [e.a, e.n]) if (!t.image) ps.push(new Promise((ok) => { const f = () => (t.image ? ok() : setTimeout(f, 30)); f(); })); if (arrays && arrays.ready) ps.push(arrays.ready); return Promise.all(ps); }
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
