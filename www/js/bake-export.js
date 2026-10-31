// LUMIERE v5.20 - light-map pipeline, step 1: hand Blender each room exactly as the game builds it (tools/bake/README.md).
// Loaded only with ?bakeExport=1. Exports, per room: the solid mesh (positions, normals, tints, material uvs, material ids), the
// occluders that cast shadows into it (instanced seats and arms, curtains, door leaves), the cinema screen (the screen light layer),
// and the room's light list (bake.js format) so tools/bake/bake_room.py can rebuild the lights in Cycles.
import * as THREE from 'three';
import { geoHash } from './lightmap.js';
const b64 = (ta) => { const u = new Uint8Array(ta.buffer, ta.byteOffset, ta.byteLength); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
const f32 = (a) => b64(a instanceof Float32Array ? a : Float32Array.from(a)), u32 = (a) => b64(a instanceof Uint32Array ? a : Uint32Array.from(a));
// merge meshes (world space) into one occluder soup: positions, indices, linear tints
function soup() { const P = [], C = [], I = []; let n = 0; return { P, C, I,
  add(geo, mtx, tint) { const p = geo.attributes.position, c = geo.attributes.color, v = new THREE.Vector3(), base = n;
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(mtx); P.push(v.x, v.y, v.z); if (c) C.push(c.getX(i), c.getY(i), c.getZ(i)); else C.push(...tint); }
    if (geo.index) for (const k of geo.index.array) I.push(base + k); else for (let k = 0; k < p.count; k++) I.push(base + k); n += p.count; } }; }
export function exportRoom(world, key) {
  const room = world.rooms[key], hall = world.halls.find((h) => h.key === key); if (!room) return null;
  if (hall) hall.updateLOD({ position: { x: hall.cfg.cx, z: hall.cfg.zBack } }, true, 1e6);   // every seat in its detailed tier
  room.group.updateMatrixWorld(true); const occ = soup(), m = new THREE.Matrix4(); let solid = null, props = null;
  room.group.traverse((o) => {
    if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
    if (o.name === key + '-props') { const g = o.geometry; props = { hash: geoHash(g), count: g.attributes.position.count, pos: f32(g.attributes.position.array), nrm: f32(g.attributes.normal.array), col: f32(g.attributes.color.array), mat: f32(g.attributes.matid.array), idx: u32(g.index.array) }; return; }
    if (o.name === key + '-solid') { const g = o.geometry; solid = { hash: geoHash(g), count: g.attributes.position.count, pos: f32(g.attributes.position.array), nrm: f32(g.attributes.normal.array), col: f32(g.attributes.color.array), uv: f32(g.attributes.uv.array), mat: f32(g.attributes.matid.array), idx: u32(g.index.array) }; return; }
    const name = (o.material && o.material.name) || '';
    if (o.isInstancedMesh) { if (!/^lit/.test(name)) return; for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, m); occ.add(o.geometry, m.clone().premultiply(o.matrixWorld), [0.2, 0.2, 0.2]); } return; }
    if (hall && (o === hall.pic || (hall.curtains && hall.curtains.meshes.includes(o)))) return;   // the screen is its own layer; curtains are open during a film
    if (/^lit/.test(name)) occ.add(o.geometry, o.matrixWorld, [0.3, 0.3, 0.3]);
  });
  for (const d of world.doors) if (d.rooms && d.rooms.includes(key)) { d.group.updateMatrixWorld(true); for (const L of d.leaves) occ.add(L.m.geometry, L.m.matrixWorld, [0.2, 0.08, 0.08]); }
  let screen = null; if (hall) { hall.pic.updateMatrixWorld(true); const g = hall.pic.geometry.clone().applyMatrix4(hall.pic.matrixWorld); screen = { pos: f32(g.attributes.position.array), idx: u32(g.index.array) }; }
  const Ls = room.lights, pr = hall && hall.probes ? { pts: f32([...hall.probes.seat, ...hall.probes.arm].flat()), nSeat: hall.probes.seat.length, nArm: hall.probes.arm.length } : null;
  return { key, solid, props, occ: occ.P.length ? { pos: f32(occ.P), col: f32(occ.C), idx: u32(occ.I) } : null, screen, lights: { L: f32(Ls.L), shapes: Ls.shapes, amb: Ls.amb, rect: Ls.rect, ceil: Ls.ceil }, isHall: !!hall, probes: pr };
}
