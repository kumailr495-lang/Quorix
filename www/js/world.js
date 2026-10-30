// LUMIERE v5 - world orchestrator: builds every room (geometry + baked light), doors, colliders, navigation, visibility and light probes.
import * as THREE from 'three';
import { HALLS, RECTS, NAV_PASSAGES, PASSAGES, PORTALS, ROOM_KEYS, roomAt, floorY, visibleRooms, hallByKey, CONC } from './layout.js';
import { Nav } from './nav.js';
import { buildHalls } from './build-halls.js';
import { buildPassages } from './build-passages.js';
import { buildLobby, buildConcourse, buildStreet } from './build-lobby.js';
import { Acc, toGeometry, M, MAT, boxGeo } from './geom.js';
import { G } from './materials.js';
import { texturesReady } from './library.js';
const frame = () => new Promise((r) => requestAnimationFrame(() => r()));
// automatic sliding door (two leaves, glass in a slim frame); opens for anyone within reach
export class SlideDoor {
  constructor(world, room, x, z, axis, width, height, o = {}) {
    this.x = x; this.z = z; this.axis = axis; this.w = width; this.open = 0; this.target = 0; this.reach = o.reach ?? 2.4; this.onToggle = o.onToggle; this.key = o.key; this.npcOnly = !!o.npcOnly;
    this.group = new THREE.Group(); this.group.position.set(x, 0, z); this.group.rotation.y = axis === 'z' ? 0 : Math.PI / 2; this.rooms = o.rooms || [room.key]; (o.parent || room.group).add(this.group);
    const half = width / 2, frameC = o.frame || '#2b2c30', mkLeaf = () => { const a = new Acc(), t = 0.04, fw = 0.05;
      a.add(boxGeo(half, fw, t), M(-half / 2, height - fw / 2, 0), frameC, { mat: MAT.metal }); a.add(boxGeo(half, fw, t), M(-half / 2, fw / 2, 0), frameC, { mat: MAT.metal });
      a.add(boxGeo(fw, height, t), M(-fw / 2, height / 2, 0), frameC, { mat: MAT.metal }); a.add(boxGeo(fw, height, t), M(-half + fw / 2, height / 2, 0), frameC, { mat: MAT.metal });
      if (o.solid) a.add(boxGeo(half - 2 * fw, height - 2 * fw, 0.03), M(-half / 2, height / 2, 0), o.solid, { mat: MAT.lacquer });
      const g = toGeometry(a); return g; };
    this.leaves = [-1, 1].map((s) => { const g = mkLeaf(); if (s > 0) g.scale(-1, 1, 1); const wx = new THREE.Matrix4().makeRotationY(this.group.rotation.y).setPosition(x, 0, z); g.applyMatrix4(wx); room.lights.bake(g); g.applyMatrix4(wx.clone().invert());
      const m = new THREE.Mesh(g, world.mats.litFor(room.U, g)); m.position.x = 0; this.group.add(m); return { m, s }; });
    if (!o.solid) { const glass = new THREE.Mesh(new THREE.PlaneGeometry(half - 0.1, height - 0.1), world.mats.glassMat()); this.glass = [-1, 1].map((s) => { const q = glass.clone(); q.position.set(s * (half / 2), height / 2, 0); this.group.add(q); return q; }); }
  }
  update(dt, actors) {
    let near = false; for (let i = this.npcOnly ? 1 : 0; i < actors.length; i++) { const a = actors[i]; if (Math.abs(a.x - this.x) < (this.axis === 'z' ? this.w / 2 + 0.8 : this.reach) && Math.abs(a.z - this.z) < (this.axis === 'z' ? this.reach : this.w / 2 + 0.8)) { near = true; break; } }
    const t = near ? 1 : 0; if (t !== this.target) { this.target = t; this.onToggle && this.onToggle(t, this); }
    this.open += (this.target - this.open) * (1 - Math.exp(-dt * (this.target ? 5 : 3))); const off = this.open * (this.w / 2 - 0.06);
    this.leaves[0].m.position.x = -off; this.leaves[1].m.position.x = off; if (this.glass) { this.glass[0].position.x = -this.w / 4 - off; this.glass[1].position.x = this.w / 4 + off; }
  }
}
const PROBE_AT = { lobby: [0, 2.2, 9], conc: [0, 2.0, -3], street: [0, 2.0, 30], passW: [-12.9, 1.6, -10], passE: [12.9, 1.6, -10] };
export function captureReflections(world, engine) {
  if (!world.mats.defines.USE_ENV) return;
  const r = engine.renderer, scene = engine.scene, prevVis = new Set(world.vis);
  G.uEnvOn.value = 0;
  for (const key in world.rooms) {
    const room = world.rooms[key], h = world.hallByKey && world.hallByKey(key);
    const at = h ? [h.cfg.cx, h.cfg.rowY[h.cfg.cross.row] + 1.6, h.cfg.zs + h.cfg.cross.dDoor] : PROBE_AT[key] || [0, 2, 0];
    const rt = new THREE.WebGLCubeRenderTarget(128, { generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter }), cam = new THREE.CubeCamera(0.1, 80, rt);
    cam.position.set(at[0], at[1], at[2]); world.setVisibility(key, at[0], at[2], true); cam.update(r, scene);
    room.U.uEnvMap.value = rt.texture; room.probe = { rt, at };
  }
  G.uEnvOn.value = 1; world.vis = prevVis;
}
export async function buildWorld(engine, mats, onProgress = () => {}) {
  const world = { mats, engine, rooms: {}, colliders: [], doors: [], halls: [], sitSpots: [], posts: {}, spots: {}, vis: new Set(['lobby']) };
  engine.scene.background = new THREE.Color(0x0b0b0e);
  const ctx = { world, engine, mats };
  world.hallByKey = (k) => world.halls.find((h) => h.key === k); world.hallById = (id) => world.halls.find((h) => h.id === id);
  const steps = [['lobby', () => buildLobby(ctx)], ['concourse', () => buildConcourse(ctx)], ['street', () => buildStreet(ctx)], ['passages', () => buildPassages(ctx)], ['halls', () => buildHalls(ctx)]];
  const rooms = []; let i = 0;
  for (const [name, f] of steps) { onProgress(i / steps.length * 0.5, name); await frame(); const r = f(); if (name === 'halls') { world.halls = r; rooms.push(...r.map((h) => h.room)); } else rooms.push(...[].concat(r)); i++; }
  // bake + finalize, one room per frame so the loader keeps moving
  for (let k = 0; k < rooms.length; k++) { const r = rooms[k]; onProgress(0.5 + 0.45 * k / rooms.length, 'bake:' + r.key); await frame(); r.finalize(mats); world.rooms[r.key] = r; engine.scene.add(r.group); world.colliders.push(...r.colliders); }
  for (const h of world.halls) h.updateLOD({ position: { x: h.cfg.cx, z: h.cfg.zBack } }, true);

  // doors between concourse and passages, street door
  for (const p of PASSAGES) { const d = new SlideDoor(world, world.rooms[p.key], (p.x0 + p.x1) / 2, CONC.z0 - 0.15, 'z', p.x1 - p.x0, 2.6, { solid: '#1c1d22', key: p.key, rooms: [p.key, 'conc'], parent: engine.scene, onToggle: (o, dd) => world.onDoor && world.onDoor(o, dd) }); world.doors.push(d); }
  world.streetDoor = new SlideDoor(world, world.rooms.lobby, 0, 19.93, 'z', 3.3, 2.95, { npcOnly: true, key: 'street', reach: 2.6, onToggle: (o, dd) => world.onDoor && world.onDoor(o, dd) }); world.doors.push(world.streetDoor);
  // navigation
  const rects = ROOM_KEYS.filter((k) => k !== 'street').map((k) => RECTS[k]).concat(NAV_PASSAGES, [[-14, 20.0, 14, 25.4], [-1.5, 19.5, 1.5, 20.5]]);   // guests also walk the pavement and through the street door
  world.nav = new Nav(rects, world.colliders);
  // collision lookup grid (2 m buckets)
  const B = new Map(), key = (i, j) => i * 1000 + j; for (const c of world.colliders) for (let i = Math.floor(c.x0 / 2); i <= Math.floor(c.x1 / 2); i++) for (let j = Math.floor(c.z0 / 2); j <= Math.floor(c.z1 / 2); j++) { const k = key(i, j); if (!B.has(k)) B.set(k, []); B.get(k).push(c); }
  world.collidersNear = (x, z, out) => { out.length = 0; const seen = new Set(); for (let i = Math.floor((x - 1) / 2); i <= Math.floor((x + 1) / 2); i++) for (let j = Math.floor((z - 1) / 2); j <= Math.floor((z + 1) / 2); j++) { const l = B.get(key(i, j)); if (l) for (const c of l) if (!seen.has(c)) { seen.add(c); out.push(c); } } return out; };
  world.floorY = floorY; world.roomAt = roomAt;
  world.probe = (x, y, z) => { const r = world.rooms[roomAt(x, z)]; return r ? r.lights.probe(x, y, z) : null; };
  // portal culling: a neighbour draws only while one of its openings is inside the camera's view and its door is not shut (v5.10 drew the
  // lobby and the concourse behind a closed passage door: 115 draw calls). all = true: every neighbour (reflection captures)
  const frustum = new THREE.Frustum(), pm = new THREE.Matrix4(), cam = engine.camera;
  for (const p of PORTALS) { const w = (p.see || p.w) / 2, h = p.h || 3; p.box = p.axis === 'z' ? new THREE.Box3(new THREE.Vector3(p.x - w, -0.2, p.z - 0.4), new THREE.Vector3(p.x + w, h, p.z + 0.4)) : new THREE.Box3(new THREE.Vector3(p.x - 0.4, -0.2, p.z - w), new THREE.Vector3(p.x + 0.4, h, p.z + w)); }
  const canSee = (p) => { if (p.solid) { const d = world.doors.find((q) => q.key === p.door); if (d && d.open < 0.03) return false; } return frustum.intersectsBox(p.box); };
  world.setVisibility = (room, x, z, all = false) => { if (!all) { cam.updateMatrixWorld(); frustum.setFromProjectionMatrix(pm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse)); }
    const v = visibleRooms(room, x, z, all ? undefined : canSee); world.vis = v; for (const k in world.rooms) world.rooms[k].group.visible = v.has(k); for (const d of world.doors) d.group.visible = d.rooms.some((k) => v.has(k)); };
  world.update = (dt, actors, now) => { for (const d of world.doors) d.update(dt, actors); for (const h of world.halls) if (h.curtains) { const c = h.curtains; if (c.open !== c.target) { c.open += Math.sign(c.target - c.open) * Math.min(Math.abs(c.target - c.open), dt / 3.2); const e = c.open * c.open * (3 - 2 * c.open); for (const m of c.meshes) m.scale.x = 1 - 0.93 * e; } } };
  // reflection probes: one small cube capture per room (what the polished floors, brass and glass reflect), mip-filtered by roughness
  onProgress(0.96, 'reflections'); await texturesReady(); await frame(); captureReflections(world, engine);
  world.setVisibility('lobby', 0, 15, true); onProgress(1, 'ready');
  return world;
}
