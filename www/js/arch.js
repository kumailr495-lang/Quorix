// Architecture builder: merged vertex-coloured boxes (one draw call per material kind per room). Each box carries a material id for the procedural shader.
import * as THREE from 'three';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';
const clamp01 = (v) => Math.max(0, Math.min(1, v));
export class Arch {
  constructor() { this.g = { solid: [], decal: [], glow: [] }; this.col = []; }
  box(x0, y0, z0, x1, y1, z1, hex, o = {}) {
    const kind = o.kind || 'solid', g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    const pos = g.attributes.position, nor = g.attributes.normal, n = pos.count, c = new THREE.Color(hex), cl = new Float32Array(n * 3), uv = new Float32Array(n * 2), mid = new Float32Array(n).fill(o.mat ?? 0), tile = o.tile || 1.2, ref = o.ref ?? 0;
    for (let i = 0; i < n; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), ax = Math.abs(nor.getX(i)), ay = Math.abs(nor.getY(i)), az = Math.abs(nor.getZ(i)); let u, v;
      if (ax >= ay && ax >= az) { u = z; v = y; } else if (ay >= az) { u = x; v = z; } else { u = x; v = y; } uv[2 * i] = u / tile; uv[2 * i + 1] = v / tile;
      const m = (o.ao === false || kind !== 'solid' ? 1 : 0.7 + 0.3 * clamp01((y - ref + 0.1) / 1.0)) * (o.shade ?? 1); cl[3 * i] = c.r * m; cl[3 * i + 1] = c.g * m; cl[3 * i + 2] = c.b * m;
    }
    g.setAttribute('color', new THREE.BufferAttribute(cl, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setAttribute('matid', new THREE.BufferAttribute(mid, 1));
    this.g[kind].push(g); if (o.collide) this.col.push({ x0, x1, z0, z1, y0, y1 });
  }
  // wall slab with door gaps along its running axis; gaps = [[a0,a1,topY]]; st = {upper,lower,rail,wain,mat,lmat}
  wall(x0, z0, x1, z1, y0, y1, inx, inz, gaps, st) {
    const alongX = (x1 - x0) > (z1 - z0), a0 = alongX ? x0 : z0, a1 = alongX ? x1 : z1, segs = []; let cur = a0;
    for (const [g0, g1, top] of [...(gaps || [])].sort((p, q) => p[0] - q[0])) { if (g0 > cur) segs.push([cur, g0, y0, y1]); segs.push([g0, g1, top, y1]); cur = g1; }
    if (cur < a1) segs.push([cur, a1, y0, y1]);
    for (const [s0, s1, ya, yb] of segs) {
      const full = ya === y0, o = { collide: full, ref: y0, mat: st.mat ?? 6 };
      if (alongX) this.box(s0, ya, z0, s1, yb, z1, st.upper, o); else this.box(x0, ya, s0, x1, yb, s1, st.upper, o);
      if (full && st.lower) { const wy = Math.min(yb, y0 + st.wain), lo = { ref: y0, mat: st.lmat ?? 2, tile: 1.0 }, ro = { kind: 'decal', ao: false, mat: 4 };
        if (alongX) { const zf = inz > 0 ? z1 : z0 - 0.04, zt = inz > 0 ? z1 + 0.04 : z0; this.box(s0, y0, zf, s1, wy, zt, st.lower, lo); this.box(s0, wy, zf - (inz > 0 ? 0 : 0.01), s1, wy + 0.05, zt + (inz > 0 ? 0.01 : 0), st.rail, ro); }
        else { const xf = inx > 0 ? x1 : x0 - 0.04, xt = inx > 0 ? x1 + 0.04 : x0; this.box(xf, y0, s0, xt, wy, s1, st.lower, lo); this.box(xf - (inx > 0 ? 0 : 0.01), wy, s0, xt + (inx > 0 ? 0.01 : 0), wy + 0.05, s1, st.rail, ro); } }
    }
  }
  merged(kind) { return this.g[kind].length ? mergeGeometries(this.g[kind], false) : null; }
}
