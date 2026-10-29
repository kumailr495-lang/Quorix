// LUMIERE v4 - orchestrator: loads models, creates the shared build context, runs the room builders, merges, wires lights/nav/doors.
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';
import { signTexture, posterTexture, slateTexture } from './textures.js';
import { Arch } from './arch.js';
import { Nav } from './nav.js';
import { glowPoints } from './fx.js';
import { parseNPC, NPC_IDS } from './characters.js';
import { ROOMS, HALLS, ADJ, ROW_LETTERS, roomAt, floorY, visibleSet, visibleRooms, portalDist } from './layout.js';
import { buildLobby } from './build-lobby.js';
import { buildWings } from './build-wings.js';
import { buildHalls } from './build-halls.js';
export { ROW_LETTERS, roomAt, floorY, HALLS, ROOMS, ADJ, visibleSet };
export const D2R = Math.PI / 180;
const LOD1 = new Set(['lumiere-column', 'lumiere-palm-tall', 'lumiere-floor-lamp', 'lumiere-lightbox', 'lumiere-bench', 'lumiere-trash-bin', 'lumiere-bar-stool', 'lumiere-fan-sconce', 'lumiere-standee', 'lumiere-coat-rack', 'lumiere-wall-clock', 'lumiere-ticket-dispenser', 'lumiere-round-table', 'lumiere-console-table', 'lumiere-display-case', 'lumiere-nesting-table-large', 'lumiere-nesting-table-small', 'lumiere-stanchion', 'lumiere-velvet-rope', 'lumiere-door-leaf']);
const PROPS = ['lumiere-theatre-seat', 'lumiere-lounge-sofa', 'lumiere-reception-desk', 'lumiere-console-table', 'lumiere-nesting-table-large', 'lumiere-round-table', 'lumiere-bar-stool', 'lumiere-floor-lamp', 'lumiere-pendant-chandelier',
  'lumiere-potted-plant', 'lumiere-nesting-table-small', 'lumiere-display-case', 'lumiere-ticket-dispenser', 'lumiere-poster-frame-set', 'lumiere-armchair', 'lumiere-coffee-table', 'lumiere-bench', 'lumiere-stanchion', 'lumiere-velvet-rope', 'lumiere-statue-deco', 'lumiere-column',
  'lumiere-wall-mirror', 'lumiere-wall-clock', 'lumiere-popcorn-machine', 'lumiere-concession-counter', 'lumiere-bar-counter', 'lumiere-coat-rack', 'lumiere-trash-bin', 'lumiere-standee', 'lumiere-lightbox', 'lumiere-palm-tall', 'lumiere-door-leaf', 'lumiere-marquee', 'lumiere-candy-cabinet', 'lumiere-fan-sconce'];

export class Door {   // double door; opens when any actor is close, closes when clear
  constructor(group, geo, mat, x, z, yawDeg, halfW, h, onToggle) {
    this.g = new THREE.Group(); this.g.position.set(x, 0, z); this.g.rotation.y = yawDeg * D2R; group.add(this.g); this.x = x; this.z = z; this.open = 0; this.target = 0; this.onToggle = onToggle;
    const sc = halfW / 1.1; this.pivL = new THREE.Group(); this.pivR = new THREE.Group(); this.pivL.position.x = -halfW; this.pivR.position.x = halfW;
    const mL = new THREE.Mesh(geo, mat), mR = new THREE.Mesh(geo, mat); mL.scale.set(sc, h / 2.4, 1); mR.scale.set(-sc, h / 2.4, 1); this.pivL.add(mL); this.pivR.add(mR); this.g.add(this.pivL, this.pivR);
  }
  update(dt, actors) {
    let near = false; for (let i = this.npcOnly ? 1 : 0; i < actors.length; i++) { const a = actors[i]; if (Math.hypot(a.x - this.x, a.z - this.z) < 2.5) { near = true; break; } }
    const t = near ? 1 : 0; if (t !== this.target) { this.target = t; this.onToggle && this.onToggle(t, this); }
    this.open += (this.target - this.open) * (1 - Math.exp(-dt * 4.5)); const th = this.open * 1.7; this.pivL.rotation.y = -th; this.pivR.rotation.y = th;
  }
}
export function curvedScreen(w, h, bendDeg, segs = 28) {
  const a = bendDeg * D2R, R = w / (2 * Math.sin(a / 2)), pos = [], uv = [], idx = [];
  for (let i = 0; i <= segs; i++) { const t = i / segs, th = (t - 0.5) * a, x = R * Math.sin(th), z = R * (1 - Math.cos(th)); pos.push(x, -h / 2, z, x, h / 2, z); uv.push(t, 0, t, 1); if (i < segs) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}

export async function buildWorld(engine, mats, onProgress = () => {}, sound = null) {
  const world = { colliders: [], interact: [], sitSpots: [], mats, doors: [], halls: [], glowPts: {}, lightSpecs: {}, spawns: [], ready: false, house: { screen: 1, house: 1 } };
  engine.scene.background = new THREE.Color(0x050403); engine.scene.fog = new THREE.Fog(0x070504, 22, 62);
  const keys = ['lobby', 'c0', 'wingW', 'wingE', 'hallI', 'hallII', 'hallIII']; const rooms = {};
  for (const k of keys) { rooms[k] = new THREE.Group(); rooms[k].name = k; engine.scene.add(rooms[k]); world.glowPts[k] = []; world.lightSpecs[k] = []; } world.rooms = rooms; world.keys = keys;
  // ---- models
  const loader = new GLTFLoader(), geo = {}; let done = 0; const total = PROPS.length + NPC_IDS.length; world.npcDefs = {};
  const fix = (g) => { if (g.attributes._matid) { g.setAttribute('matid', g.attributes._matid); g.deleteAttribute('_matid'); } else g.setAttribute('matid', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count), 1)); };
  await Promise.all([...PROPS.map(async (n) => { const gltf = await loader.loadAsync(`models/${n}.glb`); gltf.scene.traverse((o) => { if (o.isMesh) { fix(o.geometry); geo[o.name] = o.geometry; } }); onProgress(++done / total, n); }),
    ...NPC_IDS.map(async (id) => { const gltf = await loader.loadAsync(`models/lumiere-npc-${id}.glb`); gltf.scene.traverse((o) => { if (o.isMesh) fix(o.geometry); }); world.npcDefs[id] = parseNPC(gltf, id); onProgress(++done / total, 'npc ' + id); })]);
  world.geo = geo; const G = (n, lod = 0) => geo[`${n}_LOD${lod}`];
  // ---- shared builders
  const A = {}; for (const k of keys) A[k] = new Arch(); const batch = new Map(), glowBatch = new Map(), mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3();
  const place = (g, x, y, z, yaw, sc = 1) => { const c = g.clone(); e.set(0, yaw * D2R, 0); q.setFromEuler(e); mtx.compose(v3.set(x, y, z), q, s3.set(sc, sc, sc)); c.applyMatrix4(mtx); return c; };
  const col = (x0, z0, x1, z1) => world.colliders.push({ x0, x1, z0, z1, y0: 0, y1: 2 });
  const prop = (room, name, x, y, z, yaw, o = {}) => {
    const lod = o.lod ?? (LOD1.has(name) ? 1 : 0), g = G(name, lod); if (!g) throw new Error('missing geometry ' + name); const sc = o.sc ?? 1; if (!batch.has(room)) batch.set(room, []); batch.get(room).push(place(g, x, y, z, yaw, sc));
    if (!o.noGlow) for (const k of Object.keys(geo)) if (k.startsWith(name + '-') && k.endsWith('_LOD' + lod) && k !== name + '_LOD' + lod) { if (!glowBatch.has(room)) glowBatch.set(room, []); glowBatch.get(room).push(place(geo[k], x, y, z, yaw, sc)); }
    if (o.box) col(x - o.box[0], z - o.box[1], x + o.box[0], z + o.box[1]); if (o.halo) for (const hp of o.halo) glow(room, x + hp[0], y + hp[1], z + hp[2], hp[3] ?? 0.5, hp[4] ?? '#ffc27a', hp[5] ?? 1);
  };
  const glow = (room, x, y, z, size, hex = '#ffc27a', k = 1) => { const c = new THREE.Color(hex); world.glowPts[room].push([x, y, z, size, c.r * k, c.g * k, c.b * k]); };
  const sign = (room, text, x, y, z, yaw, w, h, script = false, cw = 512, ch = 128) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: signTexture(text, cw, ch, script), transparent: true, toneMapped: false, depthWrite: false })); m.position.set(x, y, z); m.rotation.y = yaw * D2R; rooms[room].add(m); return m; };
  const curvedSign = (room, text, cx, cz, r, y, centerDeg, arcLen, h, script = true) => { const th = arcLen / r, g = new THREE.CylinderGeometry(r, r, h, 24, 1, true, centerDeg * D2R - th / 2, th); const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: signTexture(text, 512, 128, script), transparent: true, toneMapped: false, depthWrite: false })); m.position.set(cx, y, cz); rooms[room].add(m); return m; };
  const POST = [['The Long Night', 12, 340, 'a film by D. Verhoef'], ['Velvet Hour', 330, 280, 'with Camille Roux'], ['A Quiet Room', 150, 200, 'a story of the afternoon'], ['Midnight Fanfare', 40, 300, 'the new print'], ['Brass & Rain', 205, 250, 'a city symphony'], ['The Last Reel', 285, 215, 'restored in 4K']], pcache = {};
  const poster = (room, i, x, y, z, yaw, w = 0.9, h = 1.28) => { const P = POST[i % 6]; const tex = pcache[i % 6] || (pcache[i % 6] = posterTexture(P[0], P[1], P[2], P[3])); const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })); m.position.set(x, y, z); m.rotation.y = yaw * D2R; rooms[room].add(m); return m; };
  const sit = (label, x, z, yawProp, eyeY, floor = 0, standDist = 0.95, standAt = null) => { const f = [Math.sin(yawProp * D2R), Math.cos(yawProp * D2R)]; const s = { id: 'spot' + world.sitSpots.length, label, x, z, floor, eyeY: floor + eyeY, yaw: yawProp + 180, face: yawProp, stand: standAt || { x: x + f[0] * standDist, z: z + f[1] * standDist }, taken: null }; world.sitSpots.push(s); return s; };
  const lightAt = (room, x, y, z, color, i, d, group = 'house') => world.lightSpecs[room].push({ x, y, z, color, i, d, group });
  const slate = slateTexture();
  const ctx = { world, engine, mats, rooms, A, G, geo, prop, glow, sign, curvedSign, poster, col, sit, place, lightAt, slate, Door, curvedScreen, THREE, sound };
  buildLobby(ctx); buildWings(ctx); buildHalls(ctx);
  // ---- merge architecture + props
  for (const k of keys) { for (const kind of ['solid', 'decal', 'glow']) { const g = A[k].merged(kind); if (g) { const m = new THREE.Mesh(g, mats[kind]); m.matrixAutoUpdate = false; rooms[k].add(m); } } world.colliders.push(...A[k].col); }
  for (const [room, list] of batch) { const m = new THREE.Mesh(mergeGeometries(list, false), mats.solid); m.matrixAutoUpdate = false; rooms[room].add(m); }
  for (const [room, list] of glowBatch) { for (const g of list) for (const n of Object.keys(g.attributes)) if (!['position', 'normal', 'color', 'uv'].includes(n)) g.deleteAttribute(n); const m = new THREE.Mesh(mergeGeometries(list, false), mats.glow); m.matrixAutoUpdate = false; rooms[room].add(m); }
  world.clouds = []; for (const k of keys) if (world.glowPts[k].length) { const p = glowPoints(world.glowPts[k]); rooms[k].add(p); world.clouds.push(p); }
  world.nav = new Nav(world.colliders);
  // ---- light slots: 8 point lights re-assigned to the current room's specs (fades out, moves, fades in)
  world.hemi = engine.addLight(new THREE.HemisphereLight(0x7a5c40, 0x2a1b13, 2.3));
  world.slots = Array.from({ length: 8 }, () => { const l = new THREE.PointLight(0xffffff, 1, 10, 2); l.userData.k = 0; l.userData.base = 0; engine.addLight(l); return { l, spec: null, want: null, fade: 0 }; });
  // 8 point-light slots: the current room's lights plus the first light of up to 2 portal-visible neighbours; slots that keep their light never flicker
  world.setLights = (room, vis, px = 0, pz = 0) => {
    const own = (world.lightSpecs[room] || []).slice(0, 8), extra = []; if (vis) for (const k of vis) if (k !== room && (world.lightSpecs[k] || [])[0] && portalDist(room, k, px, pz) < 6) extra.push(world.lightSpecs[k][0]);
    const n = Math.min(2, extra.length), want = [...own.slice(0, 8 - n), ...extra.slice(0, n)], free = [];
    for (const s of world.slots) { if (s.want && want.includes(s.want)) continue; s.want = null; free.push(s); }
    for (const sp of want) if (!world.slots.some((s) => s.want === sp)) { const s = free.shift(); if (s) s.want = sp; }
  };
  world.tickLights = (dt) => { for (const s of world.slots) { if (s.want !== s.spec) { s.fade = Math.max(0, s.fade - dt * 4); if (s.fade <= 0.03) { s.spec = s.want; if (s.spec) { s.l.position.set(s.spec.x, s.spec.y, s.spec.z); s.l.color.set(s.spec.color); s.l.distance = s.spec.d; s.l.userData.base = s.spec.i; } else s.l.userData.base = 0; } } else s.fade = Math.min(1, s.fade + dt * 2.4); s.l.userData.k = s.fade * (s.spec ? (world.house[s.spec.group] ?? 1) : 0); } };
  world.setVisibility = (room, x = 0, z = 0) => { const v = visibleRooms(room, x, z); world.vis = v; for (const k of keys) rooms[k].visible = v.has(k); for (const c of world.clouds) c.visible = c.parent.visible; };
  world.update = (dt, actors, now) => { for (const d of world.doors) d.update(dt, actors); for (const h of world.halls) h.update && h.update(dt, now); };
  world.seatById = (hall, id) => world.halls.find((h) => h.cfg.id === hall).seats.find((s) => s.id === id);
  world.floorY = floorY; world.roomAt = roomAt;
  world.spawn = { x: 0, z: 15.6, yaw: 0 }; world.setVisibility('lobby', 0, 15.6); world.setLights('lobby', world.vis); world.ready = true;
  return world;
}
