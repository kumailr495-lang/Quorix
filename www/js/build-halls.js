// The three auditoria, data-driven from layout.js: raked carpeted steps, slat walls, cove/step lighting, proscenium, curtains, flat/curved screens, projector beam, instanced seats (3 LODs).
import * as THREE from 'three';
import { MAT } from './materials.js';
import { HALLS, rowZ, rowFloorY, frontY, hallCx, hallSeats, screenBulge } from './layout.js';
import { projectorBeam } from './fx.js';
const BR = { kind: 'decal', ao: false, mat: MAT.brass };
export function buildHalls(ctx) { for (const h of HALLS) world_add(ctx, buildHall(ctx, h)); }
const world_add = (ctx, hall) => ctx.world.halls.push(hall);
function curtain(w, hgt, outerSign, hex) {
  const g = new THREE.BoxGeometry(w, hgt, 0.45, 18, 1, 1); g.translate(outerSign * w / 2, hgt / 2, 0); const pos = g.attributes.position, n = pos.count, c = new THREE.Color(hex), cl = new Float32Array(n * 3), mid = new Float32Array(n).fill(MAT.curtain);
  for (let i = 0; i < n; i++) { const f = 0.7 + 0.3 * Math.sin(pos.getX(i) * 14.0); cl[3 * i] = c.r * f; cl[3 * i + 1] = c.g * f; cl[3 * i + 2] = c.b * f; pos.setZ(i, pos.getZ(i) + Math.sin(pos.getX(i) * 14.0) * 0.07); }
  g.setAttribute('color', new THREE.BufferAttribute(cl, 3)); g.setAttribute('matid', new THREE.BufferAttribute(mid, 1)); const uv = new Float32Array(n * 2); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return g;
}
function buildHall(ctx, h) {
  const { A, world, rooms, mats, G, glow, sign, slate, curvedScreen, lightAt } = ctx, a = A[h.key], g = rooms[h.key], T = h.theme, cx = hallCx(h), y0 = frontY(h) - 0.1, hh = h.h, rows = h.rows, S = h.screen;
  const WH = { upper: T.wall, lower: '#1c120e', rail: T.trim, wain: 0.9, mat: MAT.plaster, lmat: MAT.wood };
  // ---- floor: front pit, one carpeted block per row (with an LED nosing), back landing
  a.box(h.x0, y0, h.z0, h.x1, frontY(h), rowZ(h, 0) - h.pitch / 2, '#2a1214', { ao: false, mat: MAT.carpet, tile: 1.6, ref: y0 });
  for (let i = 0; i < rows; i++) { const zc = rowZ(h, i), fy = rowFloorY(h, i); a.box(h.x0, y0, zc - h.pitch / 2, h.x1, fy, zc + h.pitch / 2, T.step, { ao: false, mat: MAT.carpet, tile: 1.4, ref: y0 }); a.box(h.x0 + 0.1, fy - 0.05, zc - h.pitch / 2 - 0.02, h.x1 - 0.1, fy - 0.005, zc - h.pitch / 2, T.led, { kind: 'glow', ao: false }); }
  a.box(h.x0, y0, rowZ(h, rows - 1) + h.pitch / 2, h.x1, 0, h.z1, '#2d1316', { ao: false, mat: MAT.carpet, tile: 1.8, ref: y0 });
  a.box(h.x0 - 0.3, hh, h.z0 - 0.3, h.x1 + 0.3, hh + 0.3, h.z1 + 0.3, '#17100d', { ao: false, mat: MAT.plaster });
  // ---- walls (the door sits in the south wall for hall I, in the corridor-side wall for II/III)
  const dw = h.door.wall, dc = h.door.c, gapZ = [[dc - 1.2, dc + 1.2, 2.7]], gapX = [[cx + dc - 1.2, cx + dc + 1.2, 2.7]];
  a.wall(h.x0 - 0.3, h.z0, h.x0, h.z1, y0, hh, 1, 0, dw === 'west' ? gapZ : [], WH); a.wall(h.x1, h.z0, h.x1 + 0.3, h.z1, y0, hh, -1, 0, dw === 'east' ? gapZ : [], WH);
  a.wall(h.x0 - 0.3, h.z0 - 0.3, h.x1 + 0.3, h.z0, y0, hh, 0, 1, [], WH); a.wall(h.x0 - 0.3, h.z1, h.x1 + 0.3, h.z1 + 0.3, 0, hh, 0, -1, dw === 'south' ? gapX : [], WH);
  for (const sx of [-1, 1]) { const wx = sx > 0 ? h.x1 : h.x0, doorHere = (sx > 0 && dw === 'east') || (sx < 0 && dw === 'west');
    for (let z = h.z0 + 0.4; z < h.z1 - 0.3; z += 0.26) { if (doorHere && z > dc - 1.6 && z < dc + 1.6) continue; a.box(sx > 0 ? wx - 0.09 : wx, y0 + 0.95, z, sx > 0 ? wx : wx + 0.09, hh - 0.6, z + 0.1, T.slat, { ref: y0 + 0.95, mat: MAT.wood, tile: 0.8 }); }
    a.box(sx > 0 ? wx - 0.12 : wx + 0.02, hh - 0.3, h.z0, sx > 0 ? wx - 0.02 : wx + 0.12, hh - 0.24, h.z1, T.led, { kind: 'glow', ao: false });
    for (let z = h.z0 + 3; z < h.z1 - 2; z += 5) { if (doorHere && Math.abs(z - dc) < 2.2) continue; a.box(sx > 0 ? wx - 0.12 : wx + 0.09, 1.4, z - 0.05, sx > 0 ? wx - 0.09 : wx + 0.12, hh - 1.6, z + 0.05, T.led, { kind: 'glow', ao: false }); glow(h.key, sx > 0 ? wx - 0.3 : wx + 0.3, (1.4 + hh - 1.6) / 2, z, 1.2, T.led, 0.5); }
    for (let i = 0; i < rows; i++) { const zc = rowZ(h, i), fy = rowFloorY(h, i); a.box(sx > 0 ? wx - 0.1 : wx + 0.085, fy + 0.16, zc - 0.22, sx > 0 ? wx - 0.085 : wx + 0.1, fy + 0.24, zc + 0.22, T.led, { kind: 'glow', ao: false }); } }
  for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) { const x = cx + (j - 1.5) * (h.x1 - h.x0) / 5, z = h.z0 + 5.5 + i * 6.5; a.box(x - 0.16, hh - 0.05, z - 0.16, x + 0.16, hh, z + 0.16, '#ffe2b0', { kind: 'glow', ao: false }); }
  // ---- projection booth window + exit light over the door
  a.box(cx - 0.7, hh - 1.75, h.z1 - 0.05, cx + 0.7, hh - 1.15, h.z1, '#050505', { mat: MAT.glass, ao: false }); a.box(cx - 0.6, hh - 1.5, h.z1 - 0.07, cx + 0.6, hh - 1.46, h.z1 - 0.05, '#fff0cc', { kind: 'glow', ao: false });
  const ds = dw === 'south' ? { x: cx + dc, z: h.z1 - 1.3 } : dw === 'east' ? { x: h.x1 - 1.3, z: dc } : { x: h.x0 + 1.3, z: dc };
  const ex = dw === 'south' ? [cx + dc - 0.3, 2.95, h.z1 - 0.07, cx + dc + 0.3, 3.15, h.z1] : dw === 'east' ? [h.x1 - 0.07, 2.95, dc - 0.3, h.x1, 3.15, dc + 0.3] : [h.x0, 2.95, dc - 0.3, h.x0 + 0.07, 3.15, dc + 0.3];
  a.box(ex[0], ex[1], ex[2], ex[3], ex[4], ex[5], '#38ff77', { kind: 'glow', ao: false }); glow(h.key, (ex[0] + ex[3]) / 2, 3.05, (ex[2] + ex[5]) / 2, 0.9, '#38ff77', 0.6);
  // ---- screen wall, proscenium, curtains, picture
  const sw = S.w / 2, cy = S.cy, sh = S.h / 2, zs = h.z0, bul = screenBulge(S), zc0 = zs + 0.3 + bul;
  a.box(cx - sw - 1.6, y0, zs, cx + sw + 1.6, cy + sh + 1.2, zs + 0.12, '#050404', { ao: false });
  a.box(cx - sw - 1.2, cy + sh + 0.55, zs + 0.1, cx + sw + 1.2, cy + sh + 1.0, zc0 + 0.55, T.curtain, { ao: false, mat: MAT.curtain }); a.box(cx - sw - 1.25, cy + sh + 0.5, zc0 + 0.45, cx + sw + 1.25, cy + sh + 0.58, zc0 + 0.57, T.trim, BR);
  a.box(cx - sw - 1.2, y0, zs, cx + sw + 1.2, frontY(h) + 0.35, zc0 + 0.55, '#120a08', { mat: MAT.wood, ref: y0, collide: true }); a.box(cx - sw - 1.2, frontY(h) + 0.3, zc0 + 0.53, cx + sw + 1.2, frontY(h) + 0.34, zc0 + 0.56, T.led, { kind: 'glow', ao: false });
  if (S.type === 'flat') a.box(cx - sw - 0.25, cy - sh - 0.25, zs + 0.12, cx + sw + 0.25, cy + sh + 0.25, zs + 0.22, '#030303', { ao: false });
  const picGeo = S.type === 'flat' ? new THREE.PlaneGeometry(S.w, S.h) : curvedScreen(S.w, S.h, S.bend), picMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), pic = new THREE.Mesh(picGeo, picMat); pic.position.set(cx, cy, zs + 0.3); pic.visible = false; g.add(pic);
  if (S.type !== 'flat') { const back = new THREE.Mesh(picGeo, new THREE.MeshBasicMaterial({ color: 0x020202, side: THREE.DoubleSide })); back.position.set(cx, cy, zs + 0.27); back.scale.set(1.04, 1.06, 1); g.add(back); }
  const cw = sw + 0.9, cuH = cy + sh + 0.7 - y0; const curL = new THREE.Mesh(curtain(cw, cuH, 1, T.curtain), mats.solid), curR = new THREE.Mesh(curtain(cw, cuH, -1, T.curtain), mats.solid);
  curL.position.set(cx - sw - 1.0, y0, zc0 + 0.3); curR.position.set(cx + sw + 1.0, y0, zc0 + 0.3); g.add(curL, curR);
  const from = new THREE.Vector3(cx, hh - 1.45, h.z1 - 0.15), to = new THREE.Vector3(cx, cy, zs + 0.4), beam = projectorBeam(from, to, S.w, S.h); g.add(beam);
  const screen = { mat: picMat, pic, w: S.w, h: S.h, playing: false, tex: null,
    show(tex, aspect) { picMat.map = tex; picMat.needsUpdate = true; const k = Math.min(1, (S.w / S.h) / aspect), ww = k < 1 ? S.w : S.h * aspect, hh2 = k < 1 ? S.w / aspect : S.h; pic.scale.set(Math.min(1, ww / S.w), Math.min(1, hh2 / S.h), 1); if (S.type === 'flat') pic.scale.set(Math.min(1, ww / S.w), Math.min(1, hh2 / S.h), 1); pic.visible = true; this.tex = tex; },
    showIdle() { this.show(slate, 640 / 270); }, hide() { this.showIdle(); } };
  screen.showIdle();
  // ---- seats: 3 instanced LODs + collision blocks
  const seats = hallSeats(h), meshes = [0, 1, 2].map((l) => { const m = new THREE.InstancedMesh(G('lumiere-theatre-seat', l), mats.solid, seats.length); m.frustumCulled = false; m.count = 0; g.add(m); return m; });
  for (let i = 0; i < rows; i++) for (const sx of [-1, 1]) world.colliders.push({ x0: sx < 0 ? cx - h.aisle - h.perBlock * h.seatPitch : cx + h.aisle, x1: sx < 0 ? cx - h.aisle : cx + h.aisle + h.perBlock * h.seatPitch, z0: rowZ(h, i) - 0.47, z1: rowZ(h, i) + 0.64, y0: -3, y1: 3, seats: true });
  const tmp = new THREE.Object3D(); tmp.rotation.y = Math.PI; let last = [1e9, 1e9, 9]; const fw = new THREE.Vector3();
  const hall = { cfg: h, key: h.key, seats, group: g, screen, cx, doorSpot: ds, curtains: { open: 0, target: 0 }, beam, meshes, playing: false,
    updateLOD(cam, force) {
      let fx = 0, fz = -1; if (cam.getWorldDirection) { cam.getWorldDirection(fw); const l = Math.hypot(fw.x, fw.z) || 1; fx = fw.x / l; fz = fw.z / l; } const yaw = Math.atan2(fx, fz);
      if (!force && Math.hypot(cam.position.x - last[0], cam.position.z - last[1]) < 0.9 && Math.abs(Math.atan2(Math.sin(yaw - last[2]), Math.cos(yaw - last[2]))) < 0.16) return; last = [cam.position.x, cam.position.z, yaw];
      const cnt = [0, 0, 0], wide = (cam.aspect || 1.78) < 1 ? 0.62 : 0.4;
      for (const s of seats) { const dx = s.x - cam.position.x, dz = s.z - cam.position.z, d = Math.hypot(dx, dz); if (d > 2.6 && (dx * fx + dz * fz) / d < wide) continue; const l = d < 5 ? 0 : d < 10.5 ? 1 : 2; tmp.position.set(s.x, s.y, s.z); tmp.updateMatrix(); meshes[l].setMatrixAt(cnt[l]++, tmp.matrix); }
      meshes.forEach((m, i) => { m.count = cnt[i]; m.instanceMatrix.needsUpdate = true; });
    },
    setPlaying(on) { this.playing = on; this.curtains.target = on ? 1 : 0; beam.visible = on; },
    update(dt, now) { const c = this.curtains; if (c.open !== c.target) { c.open += Math.sign(c.target - c.open) * Math.min(Math.abs(c.target - c.open), dt / 2.4); const e = c.open * c.open * (3 - 2 * c.open), s = 1 - 0.9 * e; curL.scale.x = s; curR.scale.x = s; } if (beam.visible && g.visible) beam.userData.update(now / 1000); },
  };
  hall.updateLOD({ position: { x: cx, z: h.z1 } }, true);
  // ---- lights for this hall (8 slots); 'screen' group follows the film, 'house' group dims when the show starts
  lightAt(h.key, cx, 5.2, h.z0 + 4, '#ffe2c2', 34, 24, 'screen'); lightAt(h.key, cx - 6.5, 4.5, h.z0 + 7, '#ffb77a', 12, 14); lightAt(h.key, cx + 6.5, 4.5, h.z0 + 7, '#ffb77a', 12, 14); lightAt(h.key, cx, hh - 1.4, (h.z0 + h.z1) / 2, '#ffb77a', 30, 22);
  lightAt(h.key, cx - 7, 4, (h.z0 + h.z1) / 2 + 2, '#ffb77a', 14, 14); lightAt(h.key, cx + 7, 4, (h.z0 + h.z1) / 2 + 2, '#ffb77a', 14, 14); lightAt(h.key, cx, hh - 2, h.z1 - 3, '#ffb77a', 16, 14); lightAt(h.key, ds.x, 3.0, ds.z, '#ffc58a', 10, 8);
  return hall;
}
