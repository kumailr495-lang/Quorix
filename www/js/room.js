// LUMIERE v5 - per-room builder. A room owns: one baked solid mesh, one glow mesh, textured panels (posters, signs, screens), its lights and colliders.
// Walls are built as single inward-facing panels (each room draws only its own side), so two rooms never draw coplanar faces.
import * as THREE from 'three';
import { Acc, Kit, boxGeo, planeGeo, seg, M, toGeometry, MAT } from './geom.js';
import { Lights } from './bake.js';
import { roomUniforms } from './materials.js';
import { bakeFor, propLight } from './lightmap.js';
export class Room {
  constructor(key, opts = {}) {
    // acc: the room's shell (light-mapped when baked); gacc: emitters; pacc: placed props (Kiln / Blender assets), lit per vertex
    this.key = key; this.acc = new Acc(); this.gacc = new Acc(); this.pacc = new Acc(); this.lights = new Lights({ floorAt: opts.floorAt, ceil: opts.ceil, rect: opts.rect, soft: opts.soft });
    this.colliders = []; this.panels = []; this.group = new THREE.Group(); this.group.name = key; this.U = roomUniforms(); this.maxEdge = opts.maxEdge ?? 1.0; this.extra = [];
  }
  // axis-aligned box; faces: subset of 'px nx py ny pz nz' to draw; o.edge = max edge for light subdivision
  box(x0, y0, z0, x1, y1, z1, color, o = {}) {
    if (x1 - x0 < 1e-4 || y1 - y0 < 1e-4 || z1 - z0 < 1e-4) return this;
    const g = boxGeo(x1 - x0, y1 - y0, z1 - z0, o.edge ?? (o.glow ? 0 : this.maxEdge), o.faces || null);
    (o.glow ? this.gacc : this.acc).add(g, M((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), color, o);
    if (o.collide) this.col(x0, z0, x1, z1, y0, y1);
    return this;
  }
  glowBox(x0, y0, z0, x1, y1, z1, color, k = 1, grp = 0, faces = null) { const c = new THREE.Color(color).multiplyScalar(k).toArray(); return this.box(x0, y0, z0, x1, y1, z1, c, { glow: true, grp, faces }); }
  // flat panel facing +/- along an axis: axis 'x' = panel lies along x at z = c, facing dir (+1 -> +z); axis 'z' = along z at x = c
  panel(axis, c, a0, a1, y0, y1, dir, color, o = {}) {
    if (a1 - a0 < 1e-4 || y1 - y0 < 1e-4) return this;
    const e = o.edge ?? this.maxEdge, g = planeGeo(a1 - a0, y1 - y0, seg(a1 - a0, e), seg(y1 - y0, e)), m = (a0 + a1) / 2, y = (y0 + y1) / 2;
    const mtx = axis === 'x' ? M(m, y, c, dir > 0 ? 0 : Math.PI) : M(c, y, m, dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    (o.glow ? this.gacc : this.acc).add(g, mtx, color, o); return this;
  }
  // horizontal rectangle facing up (floor) or down (ceiling)
  flat(x0, z0, x1, z1, y, up, color, o = {}) {
    if (x1 - x0 < 1e-4 || z1 - z0 < 1e-4) return this;
    const e = o.edge ?? (up ? 0.5 : 1.0), g = planeGeo(x1 - x0, z1 - z0, seg(x1 - x0, e), seg(z1 - z0, e));
    (o.glow ? this.gacc : this.acc).add(g, M((x0 + x1) / 2, y, (z0 + z1) / 2, 0, up ? -Math.PI / 2 : Math.PI / 2), color, o); return this;
  }
  // a wall face with openings: gaps = [[a0, a1, top]] along the wall; the solid wall thickness becomes a collider on request
  wall(axis, c, a0, a1, y0, y1, dir, color, gaps = [], o = {}) {
    let cur = a0; const segs = [];
    for (const [g0, g1, top] of [...gaps].sort((p, q) => p[0] - q[0])) { if (g0 > cur) segs.push([cur, g0, y0]); segs.push([g0, g1, top]); cur = g1; }
    if (cur < a1) segs.push([cur, a1, y0]);
    for (const [s0, s1, from] of segs) { this.panel(axis, c, s0, s1, from, y1, dir, color, o);
      if (o.skirt && from === y0) { const t = 0.015, h = o.skirt.h || 0.1, sc = o.skirt.color; if (axis === 'x') this.box(s0, y0, dir > 0 ? c : c - t, s1, y0 + h, dir > 0 ? c + t : c, sc, { faces: dir > 0 ? 'pz py px nx' : 'nz py px nx', mat: o.skirt.mat ?? MAT.paint, edge: 0 }); else this.box(dir > 0 ? c : c - t, y0, s0, dir > 0 ? c + t : c, y0 + h, s1, sc, { faces: dir > 0 ? 'px py pz nz' : 'nx py pz nz', mat: o.skirt.mat ?? MAT.paint, edge: 0 }); }
      if (o.thick && from === y0) { const t = o.thick; if (axis === 'x') this.col(s0, dir > 0 ? c - t : c, s1, dir > 0 ? c : c + t); else this.col(dir > 0 ? c - t : c, s0, dir > 0 ? c : c + t, s1); } }
    return this;
  }
  col(x0, z0, x1, z1, y0 = -5, y1 = 20) { this.colliders.push({ x0: Math.min(x0, x1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), z1: Math.max(z0, z1), y0, y1 }); return this; }
  kit(kit, x, y, z, yaw = 0, s = 1) { kit.emit(this.acc, this.gacc, M(x, y, z, yaw, 0, 0, s)); return this; }
  // textured panel (poster, sign, menu board): lit by the room's baked light at its centre unless emit > 0 (back-lit)
  tex(texture, x, y, z, yaw, w, h, o = {}) { this.panels.push({ texture, x, y, z, yaw, w, h, o }); return this; }
  add(obj) { this.extra.push(obj); return this; }
  finalize(mats) {
    const out = { solid: null, glow: null, props: null };
    if (this.acc.count) { const built = toGeometry(this.acc), bk = mats.lightMaps ? bakeFor(this.key, built) : null;
      // a matching Cycles bake (lightmap.js) replaces the per-vertex light; reflection strength scale: 1 / the room's typical light level
      if (bk) { const m = new THREE.Mesh(bk.geo, mats.litRoom(this.U, false, bk)); m.matrixAutoUpdate = false; m.name = this.key + '-solid'; this.group.add(m); out.solid = m; this.bake = bk; built.dispose();
        this.U.uEnvK.value = 1 / Math.max(0.05, bk.avg); }
      else { const g = this.lights.bake(built); const m = new THREE.Mesh(g, mats.litFor(this.U, g)); m.matrixAutoUpdate = false; m.name = this.key + '-solid'; this.group.add(m); out.solid = m;
        const lh = g.attributes.lh.array, lf = g.attributes.lf.array; let sum = 0; for (let i = 0; i < lh.length; i += 3) sum += 0.3 * (lh[i] + lf[i]) + 0.55 * (lh[i + 1] + lf[i + 1]) + 0.15 * (lh[i + 2] + lf[i + 2]);
        this.U.uEnvK.value = 1 / Math.max(0.05, sum / (lh.length / 3)); } }
    // placed props: their small curved faces (flutes, cushions, slats) are too fine for light-map texels, so they keep per-vertex light,
    // baked in Cycles with the room when a bake carries it (lightmap.js propLight), else from the analytic lights
    if (this.pacc.count) { const g = toGeometry(this.pacc), pv = this.bake && propLight(this.bake, g);
      if (!pv) this.lights.bake(g); const m = new THREE.Mesh(g, mats.litFor(this.U, g)); m.matrixAutoUpdate = false; m.name = this.key + '-props'; this.group.add(m); out.props = m; }
    if (this.gacc.count) { const g = toGeometry(this.gacc, false); const m = new THREE.Mesh(g, mats.glowMat(this.U)); m.matrixAutoUpdate = false; m.name = this.key + '-glow'; this.group.add(m); out.glow = m; }
    const H = [0, 0, 0], F = [0, 0, 0];
    for (const p of this.panels) {
      const nx = Math.sin(p.yaw), nz = Math.cos(p.yaw); this.lights.at(p.x + nx * 0.05, p.y, p.z + nz * 0.05, nx, 0, nz, H, F);
      const mat = mats.texMat(p.texture, this.U, new THREE.Color(H[0], H[1], H[2]), p.o.emit || 0, !!p.o.transparent); mat.uniforms.uFixL.value.setRGB(F[0], F[1], F[2]); if (p.o.repeat) mat.uniforms.uRep.value.set(p.o.repeat[0], p.o.repeat[1]);
      const geo = p.o.geo || new THREE.PlaneGeometry(p.w, p.h), m = new THREE.Mesh(geo, mat); m.position.set(p.x, p.y, p.z); m.rotation.y = p.yaw; m.updateMatrix(); m.matrixAutoUpdate = false; if (p.o.order) m.renderOrder = p.o.order; this.group.add(m); p.mesh = m;
    }
    for (const e of this.extra) this.group.add(e);
    this.tris = (this.acc.i.length + this.gacc.i.length + this.pacc.i.length) / 3; this.acc = null; this.gacc = null; this.pacc = null; return out;
  }
}
export { Kit, MAT };
