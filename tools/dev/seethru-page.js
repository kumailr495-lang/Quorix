// LUMIERE v9 - in-page side of tools/dev/seethru.mjs (a classic script, injected after the game has booted). It installs window.__st:
//   static()        every mesh as the engine drew it: triangles, degenerate faces, faces whose winding disagrees with their normals,
//                   same-facing coplanar overlaps (z-fighting) inside each room, and every material that is transparent, double-sided
//                   or skips depth writes
//   points(o)       player eye points: a grid on every walkable floor, seated eyes in the halls, along the escalators, in the lift, the
//                   menu camera's orbit and the taxi intro's camera
//   run(pts, px)    from each point, six 90-degree views drawn twice as depth: front faces only (what the game draws, it culls back
//                   faces) and both sides (what is really nearest). A pixel where a back face is nearer than every front face is one you
//                   see through; a pixel with no front face at all shows the void; one with nothing at all is a hole. A wall made of
//                   two opposite faces in one plane is fine (same depth both ways). Doors, the lift and room visibility react to a player
//                   standing there, as in the game. Problem pixels are ray-cast to name the object, material and face behind them.
//   view(pt, k, px, mode)  one view as a PNG data URL: 'mask' (grey depth, magenta see-through, orange void behind back faces, red hole)
//                   or 'game' (the game's own materials)
(() => {
  const st = (window.__st = {});
  let T = null, GM = null, HM = null, BLD = null;
  const DIRS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]], UPS = [[0, 1, 0], [0, 1, 0], [0, 0, -1], [0, 0, 1], [0, 1, 0], [0, 1, 0]];
  const DNAME = ['+x', '-x', 'up', 'down', '+z', '-z'];
  const pathOf = (o) => { const n = []; for (let p = o; p && !p.isScene; p = p.parent) n.push(p.name || p.type); return n.reverse().join('/'); };
  st.init = async () => {
    if (T) return true;
    T = await import('/vendor/three.module.js'); GM = await import('/js/geom.js'); HM = await import('/js/hallmath.js'); BLD = await import('/js/building.js');
    const L = window.__lumiere, E = L.engine; Object.assign(st, { L, W: L.world, E, R: E.renderer, S: E.scene });
    if (!E._render0) { E._render0 = E.render.bind(E); E.render = () => {}; }
    st.MATN = Object.fromEntries(Object.entries(GM.MAT).map(([k, v]) => [v, k]));
    st.face = new T.MeshBasicMaterial({ side: T.DoubleSide, fog: false, toneMapped: false });
    // depth materials: the view depth in mm as 24-bit colour; front faces only (what the game draws) and both sides (what is really nearest)
    const depthMat = (side) => { const m = new T.MeshBasicMaterial({ side, fog: false, toneMapped: false }); m.onBeforeCompile = (sh) => {
      sh.vertexShader = 'varying float vDepthMM;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n\tvDepthMM = -mvPosition.z * 1000.0;');
      sh.fragmentShader = 'varying float vDepthMM;\n' + sh.fragmentShader.replace('#include <dithering_fragment>', '#include <dithering_fragment>\n\tfloat v_ = floor(vDepthMM + 0.5); gl_FragColor = vec4(mod(floor(v_ / 65536.0), 256.0) / 255.0, mod(floor(v_ / 256.0), 256.0) / 255.0, mod(v_, 256.0) / 255.0, 1.0);'); };
      m.customProgramCacheKey = () => 'lumiere-depth-' + side; return m; };
    st.depthF = depthMat(T.FrontSide); st.depthD = depthMat(T.DoubleSide);
    return true;
  };
  // ------------------------------------------------------------------ static checks
  function triList(o, out, src, world = true) {
    const g = o.geometry, P = g.attributes.position, N = g.attributes.normal, MI = g.attributes.matid, I = g.index ? g.index.array : null;
    const n = I ? I.length : P.count, mw = o.matrixWorld, v = [new T.Vector3(), new T.Vector3(), new T.Vector3()], nv = new T.Vector3(), nm = new T.Matrix3().getNormalMatrix(mw);
    const st0 = { tris: 0, degen: 0, flipped: 0, flippedArea: 0 };
    let r0 = 0, r1 = n; if (g.drawRange && g.drawRange.count !== Infinity) { r0 = g.drawRange.start; r1 = Math.min(n, r0 + g.drawRange.count); }
    for (let t = r0; t + 2 < r1; t += 3) {
      const id = [0, 1, 2].map((k) => (I ? I[t + k] : t + k));
      for (let k = 0; k < 3; k++) { v[k].fromBufferAttribute(P, id[k]); if (world) v[k].applyMatrix4(mw); }
      const e1 = new T.Vector3().subVectors(v[1], v[0]), e2 = new T.Vector3().subVectors(v[2], v[0]), fn = new T.Vector3().crossVectors(e1, e2), a2 = fn.length();
      st0.tris++; if (a2 < 2e-8) { st0.degen++; continue; } fn.divideScalar(a2);
      if (N) { nv.set(0, 0, 0); for (let k = 0; k < 3; k++) nv.add(new T.Vector3().fromBufferAttribute(N, id[k])); if (world) nv.applyMatrix3(nm); if (nv.lengthSq() > 1e-12 && nv.normalize().dot(fn) < -0.2) { st0.flipped++; st0.flippedArea += a2 / 2; } }
      if (out) out.push({ a: v[0].toArray(), b: v[1].toArray(), c: v[2].toArray(), n: fn.toArray(), d: fn.dot(v[0]), area: a2 / 2, mat: MI ? st.MATN[Math.round(MI.getX(id[0]))] : null, src });
    }
    return st0;
  }
  // 2D convex clip (Sutherland-Hodgman), both counter-clockwise
  const area2 = (p) => { let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };
  function clip(subj, cl) {
    let out = subj;
    for (let i = 0; i < cl.length && out.length; i++) {
      const A = cl[i], B = cl[(i + 1) % cl.length], inp = out; out = [];
      const side = (p) => (B[0] - A[0]) * (p[1] - A[1]) - (B[1] - A[1]) * (p[0] - A[0]);
      for (let j = 0; j < inp.length; j++) { const P = inp[j], Q = inp[(j + 1) % inp.length], sp = side(P), sq = side(Q);
        if (sp >= 0) out.push(P); if ((sp >= 0) !== (sq >= 0)) { const t = sp / (sp - sq); out.push([P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t]); } }
    }
    return out;
  }
  function zfights(tris, gap = 0.002, minArea = 1e-4) {
    const B = new Map(), Q = 0.004;
    tris.forEach((t, i) => { const k = `${Math.round(t.n[0] * 30)},${Math.round(t.n[1] * 30)},${Math.round(t.n[2] * 30)},${Math.floor(t.d / Q)}`; let l = B.get(k); if (!l) B.set(k, (l = [])); l.push(i); });
    const found = [], proj = (t) => { const ax = Math.abs(t.n[0]) > Math.abs(t.n[1]) ? (Math.abs(t.n[0]) > Math.abs(t.n[2]) ? 0 : 2) : Math.abs(t.n[1]) > Math.abs(t.n[2]) ? 1 : 2, u = (ax + 1) % 3, w = (ax + 2) % 3;
      let p = [[t.a[u], t.a[w]], [t.b[u], t.b[w]], [t.c[u], t.c[w]]]; if (area2(p) < 0) p = [p[0], p[2], p[1]]; return p; };
    for (const [k, l] of B) {
      const kk = k.split(','), nb = B.get(`${kk[0]},${kk[1]},${kk[2]},${+kk[3] + 1}`) || [], all = l.concat(nb); if (all.length < 2) continue;
      // grid in the plane (0.5 m cells) so big floors do not compare every pair
      const cells = new Map(), C = 0.5;
      for (const i of all) { const t = tris[i], p = proj(t); t._p = p; const xs = p.map((q) => q[0]), ys = p.map((q) => q[1]); t._bb = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
        for (let gx = Math.floor(t._bb[0] / C); gx <= Math.floor(t._bb[2] / C); gx++) for (let gy = Math.floor(t._bb[1] / C); gy <= Math.floor(t._bb[3] / C); gy++) { const ck = gx * 100003 + gy; let c = cells.get(ck); if (!c) cells.set(ck, (c = [])); c.push(i); } }
      const seen = new Set(), inL = new Set(l);
      for (const c of cells.values()) for (let x = 0; x < c.length; x++) for (let y = x + 1; y < c.length; y++) {
        const i = c[x], j = c[y]; if (!inL.has(i) && !inL.has(j)) continue; const pk = i < j ? i * 1e7 + j : j * 1e7 + i; if (seen.has(pk)) continue; seen.add(pk);
        const a = tris[i], b = tris[j]; if (Math.abs(a.d - b.d) > gap) continue; if (a.n[0] * b.n[0] + a.n[1] * b.n[1] + a.n[2] * b.n[2] < 0.999) continue;
        if (a._bb[2] < b._bb[0] || b._bb[2] < a._bb[0] || a._bb[3] < b._bb[1] || b._bb[3] < a._bb[1]) continue;
        const ov = Math.abs(area2(clip(a._p, b._p))); if (ov < minArea) continue;
        found.push({ ov, gap: Math.abs(a.d - b.d), at: a.a.map((v, q) => +((v + a.b[q] + a.c[q]) / 3).toFixed(2)), n: a.n.map((v) => +v.toFixed(2)), A: a.src + ':' + a.mat, B: b.src + ':' + b.mat });
      }
    }
    return found;
  }
  st.static = () => {
    const { W, S } = st; S.updateMatrixWorld(true); const rep = { rooms: {}, materials: [], meshes: [] };
    S.traverse((o) => { if (!o.isMesh) return; const m = o.material;
      for (const mm of [].concat(m)) if (mm && (mm.transparent || mm.side !== T.FrontSide || mm.depthWrite === false || mm.alphaTest > 0 || mm.depthTest === false))
        rep.materials.push({ mesh: pathOf(o), type: mm.type, transparent: !!mm.transparent, side: ['front', 'back', 'double'][mm.side], depthWrite: mm.depthWrite, depthTest: mm.depthTest, alphaTest: mm.alphaTest, renderOrder: o.renderOrder, polygonOffset: mm.polygonOffset ? [mm.polygonOffsetFactor, mm.polygonOffsetUnits] : null }); });
    for (const key in W.rooms) {
      const room = W.rooms[key], tris = [], per = [];
      room.group.updateMatrixWorld(true);
      room.group.traverse((o) => { if (!o.isMesh || o.isSkinnedMesh) return; const nm = pathOf(o);
        if (o.isInstancedMesh) { const s = triList(o, null, nm, false); per.push({ mesh: nm, instanced: o.count, ...s }); return; }
        const s = triList(o, tris, nm); per.push({ mesh: nm, ...s }); });
      const zf = zfights(tris); const by = {}; for (const z of zf) { const k = [z.A, z.B].sort().join(' | '); (by[k] || (by[k] = { n: 0, area: 0, ex: [] })).n++; by[k].area += z.ov; if (by[k].ex.length < 4) by[k].ex.push({ at: z.at, n: z.n, ov: +z.ov.toFixed(4), gap: +z.gap.toFixed(4) }); }
      rep.rooms[key] = { meshes: per, zfight: { pairs: zf.length, area: +zf.reduce((s, z) => s + z.ov, 0).toFixed(3), by } };
    }
    for (const d of W.doors) d.group.traverse((o) => { if (o.isMesh) { d.group.updateMatrixWorld(true); rep.meshes.push({ mesh: 'door ' + d.id + ' ' + pathOf(o), ...triList(o, null, '') }); } });
    return rep;
  };

  // ------------------------------------------------------------------ where a player can really be: a flood fill over a 0.4 m grid from
  // the arrival and the Quick-play spawn, moving like player.js (the game's own wall bands, closed doors opened, the ticket gate open,
  // a floor change over 0.42 m per step is a wall, the escalators as ramps, the lift between its floors). Returns the reached cells.
  st.reach = (o = {}) => {
    const { W } = st, C = o.cell || 0.4, R = 0.24, lf = W.lift, segs0 = lf.doorSegs; const saved = W.doors.map((d) => [d, d.open, d.target]);
    for (const d of W.doors) { d.open = 1; d.target = 1; } const g0 = W.gate.open; W.gate.open = 1; lf.doorSegs = () => [];
    const key = (ix, iz, y) => `${ix},${iz},${Math.round(y * 4)}`, seen = new Map(), out = [], Q = [];
    const settle = (x, z, y) => { const p = { x, z }; W.collide(p, R, y); const fy = W.floorY(p.x, p.z, y); return { x: p.x, z: p.z, y: fy, push: Math.hypot(p.x - x, p.z - z) }; };
    const visit = (ix, iz, y, from) => { const k = key(ix, iz, y); if (seen.has(k)) return; const c = settle((ix + 0.5) * C, (iz + 0.5) * C, y);
      if (c.push > 0.3 || Math.abs(c.y - y) > 0.42 || !W.roomAt(c.x, c.y, c.z)) return; if (from && !walk(from, c)) return; seen.set(k, c); c.ix = ix; c.iz = iz; out.push(c); Q.push(c); };
    function walk(a, b) { const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.1)), p = { x: a.x, z: a.z }; let y = a.y;
      for (let i = 1; i <= n; i++) { const tx = a.x + (b.x - a.x) * i / n, tz = a.z + (b.z - a.z) * i / n, oy = W.floorY(p.x, p.z, y); p.x = tx; p.z = tz; W.collide(p, R, y);
        const ny = W.floorY(p.x, p.z, y); if (Math.abs(ny - oy) > 0.42 || Math.hypot(p.x - tx, p.z - tz) > 0.06) return false; y = ny; }
      return Math.abs(y - b.y) < 0.05; }
    try {
      for (const [x, z, y] of o.starts || [[0.6, 25.2, 0], [-2, 9, 0]]) visit(Math.floor(x / C), Math.floor(z / C), y, null);
      const Lf = BLD.LIFT, inLift = (c) => c.x > Lf.x0 + 0.1 && c.x < Lf.x1 - 0.1 && c.z > Lf.z0 + 0.1 && c.z < Lf.z1 - 0.1;
      while (Q.length) { const a = Q.shift();
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) visit(a.ix + dx, a.iz + dz, a.y, a);
        if (inLift(a)) for (const ly of Lf.stops) if (Math.abs(ly - a.y) > 1) { lf.y = ly; lf.cab.position.y = ly; visit(a.ix, a.iz, ly, null); lf.y = 0; lf.cab.position.y = 0; }
        if (out.length > (o.max || 400000)) break; }
    } finally { for (const [d, op, tg] of saved) { d.open = op; d.target = tg; } W.gate.open = g0; lf.doorSegs = segs0; }
    const per = {}; for (const c of out) { const r = W.roomAt(c.x, c.y, c.z) || '?'; per[r] = (per[r] || 0) + 1; }
    st.reached = out; return { cells: out.length, per };
  };
  // ------------------------------------------------------------------ viewpoints
  st.points = (o = {}) => {
    const { W } = st, step = o.step || 1.5, pts = [], rooms = o.rooms || Object.keys(W.rooms), EYE = 1.62;
    const add = (tag, x, y, z, eye = y + EYE) => pts.push({ tag, x: +x.toFixed(3), y: +y.toFixed(3), z: +z.toFixed(3), eye: +eye.toFixed(3) });
    if (o.reach && st.reached) { const keep = new Map(), k2 = (c) => `${Math.floor(c.x / step)},${Math.floor(c.z / step)},${Math.round(c.y * 2)}`;
      for (const c of st.reached) { const r = W.roomAt(c.x, c.y, c.z); if (!rooms.includes(r)) continue; const k = k2(c); if (!keep.has(k)) keep.set(k, { c, r }); }
      for (const { c, r } of keep.values()) add(r, c.x, c.y, c.z); }
    for (const key of o.reach ? [] : rooms) {
      const def = BLD.ROOMS[key]; if (!def) continue; const [x0, z0, x1, z1] = def.rect, hints = key === 'lobby' ? [0, BLD.L1] : [def.level || 0], st_ = def.kind === 'hall' ? Math.min(step, 1.2) : step;
      for (let x = x0 + st_ / 2; x < x1; x += st_) for (let z = z0 + st_ / 2; z < z1; z += st_) for (const yh of hints) {
        const fy = W.floorY(x, z, yh); if (W.roomAt(x, fy, z) !== key) continue; if (key === 'lobby' && yh > 1 && fy < 1) continue; if (key === 'lobby' && yh < 1 && fy > 1) continue;
        const p = { x, z }; const push = W.collide(p, 0.24, fy); if (push > 0.35) continue; const fy2 = W.floorY(p.x, p.z, fy); if (Math.abs(fy2 - fy) > 0.45 || W.roomAt(p.x, fy2, p.z) !== key) continue;
        add(key, p.x, fy2, p.z);
      }
    }
    for (const key of rooms) { const def = BLD.ROOMS[key]; if (!def) continue;
      if (def.kind === 'hall') { const h = W.hallByKey(key); h.seats.forEach((s, i) => { if (i % (o.seatEvery || 6)) return; add(key + ':seat', s.x - Math.sin(s.yaw) * 0.04, s.y, s.z - Math.cos(s.yaw) * 0.04, s.y + HM.SEAT[s.kind].eye); }); }
    }
    if (!o.rooms || o.rooms.includes('lobby')) {
      for (const e of W.escalators) for (let s = 0.3; s < e.sTop + 1.1; s += 0.7) { const z = e.zOf(s), x = (e.x0 + e.x1) / 2; add('lobby:esc-' + e.key, x, e.floor(z), z); }
      const Lf = BLD.LIFT; add('lobby:lift', (Lf.x0 + Lf.x1) / 2, 0, (Lf.z0 + Lf.z1) / 2 - 0.1);
      for (let i = 0; i < 8; i++) { const k = i / 8 * Math.PI * 2; add('lobby:menu', Math.sin(k) * 7, 2.6 - 1.62, 6 + Math.cos(k) * 5); }
    }
    if (!o.rooms || o.rooms.includes('lobby')) { const Lf = BLD.LIFT; for (const f of [0.25, 0.5, 0.75]) { const y = Lf.stops[1] * f; pts.push({ tag: 'lobby:lift-moving', x: (Lf.x0 + Lf.x1) / 2, y, z: (Lf.z0 + Lf.z1) / 2 - 0.1, eye: y + EYE, liftY: y }); } }
    if (!o.rooms || o.rooms.includes('street')) { for (let i = 0; i <= 4; i++) add('street:intro', -4.2 + 2.6 * i / 4, 0, 38.2, 1.72);
      // shot B: you step out of the taxi (eye 1.02 m beside its door) onto the pavement; the taxi stands at the kerb
      for (let i = 0; i <= 4; i++) { const t = i / 4; pts.push({ tag: 'street:step-out', x: 1.15 + (0.6 - 1.15) * t, y: 0, z: 26.08 + (25.2 - 26.08) * t, eye: 1.02 + 0.6 * t, taxi: true }); } }
    // halfway through sitting down or standing up (between the standing eye in front of the seat and the seated eye)
    for (const h of st.W.halls) { if (o.rooms && !o.rooms.includes(h.key)) continue; h.seats.forEach((s, i) => { if (i % ((o.seatEvery || 6) * 3)) return; const sn = Math.sin(s.yaw), cs = Math.cos(s.yaw), fx = s.x - sn * 0.42, fz = s.z - cs * 0.42, fy = st.W.floorY(fx, fz, s.y);
      pts.push({ tag: h.key + ':sitting', x: (s.x + fx) / 2, y: fy, z: (s.z + fz) / 2, eye: (s.y + HM.SEAT[s.kind].eye + fy + EYE) / 2 }); }); }
    if (o.limit) return pts.filter((p, i) => i % Math.ceil(pts.length / o.limit) === 0);
    return pts;
  };
  // ------------------------------------------------------------------ the rendered test
  function testMode(on) {
    const { W, S } = st;
    if (on) { const keep = new Set([...Object.values(W.rooms).map((r) => r.group), ...W.doors.map((d) => d.group)]); st.hid = [];
      for (const o of S.children) if (!keep.has(o) && !o.isCamera && o.visible) { o.visible = false; st.hid.push(o); }
      S.traverse((o) => { if (!o.visible || !(o.isMesh || o.isPoints || o.isLine || o.isSprite)) return; const m = [].concat(o.material)[0]; if (o.isPoints || o.isSprite || o.isLine || o.isSkinnedMesh || (m && m.transparent)) { o.visible = false; st.hid.push(o); } });
      st.bg = S.background; S.background = new T.Color(1, 0, 0); st.fog = S.fog; S.fog = null; S.overrideMaterial = st.face; }
    else { for (const o of st.hid || []) o.visible = true; st.hid = []; S.background = st.bg; S.fog = st.fog; S.overrideMaterial = null; }
  }
  function place(pt) {
    const { W, L } = st, actor = { x: pt.x, y: pt.y, z: pt.z }, lf = W.lift;
    for (let i = 0; i < 3; i++) W.update(1.0, [actor], 0);
    if (pt.liftY !== undefined) { lf.y = pt.liftY; lf.state = 'idle'; lf.doors = [0, 0]; lf.cab.position.y = lf.y; for (const pair of lf.leaves) for (const q of pair) q.m.position.x = lf.cx + q.s * lf.dw / 4; }
    else if (lf.y !== lf.L.stops[lf.level]) { lf.y = lf.L.stops[lf.level]; lf.cab.position.y = lf.y; }
    const it = L.intro; if (it && it.mesh) { if (pt.taxi) { it._place(4.2 + 1); if (!it.mesh.visible) { it.mesh.visible = true; st.taxiOn = true; } } else if (st.taxiOn) { it.mesh.visible = false; st.taxiOn = false; } }
    const r = W.roomAt(pt.x, pt.y, pt.z) || 'lobby'; W.setVisibility(r, pt.x, pt.eye, pt.z);
    for (const h of W.halls) if (h.room.group.visible) h.updateLOD({ position: { x: pt.x, z: pt.z } }, true, 7);
    st.S.updateMatrixWorld(true); return r;
  }
  function camFor(pt, k, px) {
    if (!st.cam) st.cam = new T.PerspectiveCamera(90, 1, 0.1, st.E.camera.far);
    const cam = st.cam; cam.far = st.E.camera.far; cam.updateProjectionMatrix(); cam.position.set(pt.x, pt.eye, pt.z); cam.up.set(...UPS[k]);
    cam.lookAt(pt.x + DIRS[k][0], pt.eye + DIRS[k][1], pt.z + DIRS[k][2]); cam.updateMatrixWorld(true); return cam;
  }
  function visibleMeshes() { const L = []; st.S.traverseVisible((o) => { if (o.isMesh && !o.isSkinnedMesh) L.push(o); }); return L; }
  function castAt(cam, i, px, meshes) {
    const ix = i % px, iy = Math.floor(i / px), rc = new T.Raycaster(); rc.setFromCamera(new T.Vector2((ix + 0.5) / px * 2 - 1, (iy + 0.5) / px * 2 - 1), cam);
    const saved = meshes.map((m) => m.material); meshes.forEach((m) => { m.material = st.face; });
    let hits; try { hits = rc.intersectObjects(meshes, false); } finally { meshes.forEach((m, k) => { m.material = saved[k]; }); }
    const dir = rc.ray.direction.toArray().map((v) => +v.toFixed(3));
    if (!hits.length) {
      // nothing drawn there: is a hidden room behind it (visibility), or is it the void (a hole)?
      const hidden = []; for (const key in st.W.rooms) { const rm = st.W.rooms[key]; if (rm.group.visible || !rm.solid) continue; const sv = rm.solid.material; rm.solid.material = st.face; const h = rc.intersectObject(rm.solid, false); rm.solid.material = sv; if (h.length) hidden.push(key + '@' + h[0].distance.toFixed(1)); }
      return { dir, none: true, hidden };
    }
    const h = hits[0], o = h.object, g = o.geometry, P = g.attributes.position, mw = o.matrixWorld.clone(); if (h.instanceId !== undefined && o.isInstancedMesh) { const im = new T.Matrix4(); o.getMatrixAt(h.instanceId, im); mw.multiply(im); }
    const v = [h.face.a, h.face.b, h.face.c].map((j) => new T.Vector3().fromBufferAttribute(P, j).applyMatrix4(mw)), fn = new T.Vector3().crossVectors(new T.Vector3().subVectors(v[1], v[0]), new T.Vector3().subVectors(v[2], v[0])).normalize();
    const MI = g.attributes.matid;
    return { dir, obj: pathOf(o), mat: MI ? st.MATN[Math.round(MI.getX(h.face.a))] : o.material && o.material.type, face: h.faceIndex, inst: h.instanceId, d: +h.distance.toFixed(2), p: h.point.toArray().map((x) => +x.toFixed(2)), n: fn.toArray().map((x) => +x.toFixed(2)), back: fn.dot(rc.ray.direction) > 0, beyondFar: h.distance > cam.far };
  }
  // per pixel: 0 fine, 1 a back face is nearer than any front face (the game culls it: you see what is behind), 2 only back faces along
  // the ray (the game shows the void colour), 3 nothing at all (a hole into the void)
  const NONE = 16000000;
  function depthPair(cam, px, bufF, bufD) { const { R, S } = st; R.setRenderTarget(st.rt);
    S.overrideMaterial = st.depthF; R.render(S, cam); R.readRenderTargetPixels(st.rt, 0, 0, px, px, bufF);
    S.overrideMaterial = st.depthD; R.render(S, cam); R.readRenderTargetPixels(st.rt, 0, 0, px, px, bufD); R.setRenderTarget(null); }
  const dec = (b, q) => b[q] * 65536 + b[q + 1] * 256 + b[q + 2];
  function classify(bufF, bufD, i) { const q = i * 4, dF = dec(bufF, q), dD = dec(bufD, q);
    if (dD >= NONE) return 3; if (dF >= NONE) return 2; return dF > dD + 12 + dD * 0.002 ? 1 : 0; }
  st.run = (pts, px = 64, samples = 3) => {
    const { R, S } = st; if (!st.rt || st.rt.width !== px) { st.rt = new T.WebGLRenderTarget(px, px); st.bufF = new Uint8Array(px * px * 4); st.bufD = new Uint8Array(px * px * 4); }
    testMode(true); const res = [];
    try {
      for (const pt of pts) {
        const room = place(pt), faces = [], hits = []; let meshes = null;
        for (let k = 0; k < 6; k++) {
          const cam = camFor(pt, k, px); depthPair(cam, px, st.bufF, st.bufD);
          const cnt = [0, 0, 0, 0], lists = [[], [], [], []];
          for (let i = 0; i < px * px; i++) { const c = classify(st.bufF, st.bufD, i); cnt[c]++; if (c) lists[c].push(i); }
          faces.push([cnt[1], cnt[2] + cnt[3]]);
          for (const c of [1, 2, 3]) { const list = lists[c]; if (!list.length) continue; if (!meshes) meshes = visibleMeshes();
            for (let s = 0; s < samples; s++) { const i = list[Math.floor((s + 0.5) / samples * list.length)]; hits.push({ k: DNAME[k], kind: ['', 'back', 'back-void', 'hole'][c], px: list.length, ...castAt(cam, i, px, meshes) }); } }
        }
        res.push({ ...pt, room, vis: [...st.W.vis].join(','), faces, hits });
      }
    } finally { testMode(false); st.R.setRenderTarget(null); }
    return res;
  };

  // ------------------------------------------------------------------ z-fighting, as drawn: every opaque mesh gets an id material (the
  // game's own culling and polygon offset), the view is drawn twice with the draw order reversed (meshes and the triangles inside each);
  // where two front faces share a depth, the later one wins, so a pixel whose winner changes is a visible z-fight
  const ID_VERT = `#include <common>
flat varying uint vId; uniform uint uMesh;
void main() {
  #include <begin_vertex>
  #include <project_vertex>
  vId = (uMesh << 16u) | (uint(gl_VertexID + gl_InstanceID * 7919) & 65535u);
}`;
  const ID_FRAG = `flat varying uint vId;
void main() { gl_FragColor = vec4(float((vId >> 16u) & 255u), float((vId >> 8u) & 255u), float(vId & 255u), 255.0) / 255.0; }`;
  function idSwap(on, reverse) {
    if (on) { const { W } = st; st.idList = []; const roots = [...Object.values(W.rooms).map((r) => r.group), ...W.doors.map((d) => d.group)];
      for (const r of roots) r.traverse((o) => { if (!o.isMesh || o.isSkinnedMesh) return; const m = [].concat(o.material)[0]; if (!m || m.transparent || m.depthWrite === false) return;
        const i = st.idList.length; if (i > 254) return; const im = new T.ShaderMaterial({ vertexShader: ID_VERT, fragmentShader: ID_FRAG, uniforms: { uMesh: { value: i + 1 } }, side: m.side, polygonOffset: !!m.polygonOffset, polygonOffsetFactor: m.polygonOffsetFactor || 0, polygonOffsetUnits: m.polygonOffsetUnits || 0 });
        st.idList.push({ o, mat: o.material, ro: o.renderOrder, im, name: pathOf(o) }); o.material = im; }); return; }
    for (const e of st.idList || []) { e.o.material = e.mat; e.o.renderOrder = e.ro; e.im.dispose(); if (e.idx0 !== undefined) { e.o.geometry.setIndex(e.idx0); delete e.idx0; } } st.idList = [];
  }
  function idOrder(reverse) {
    for (const [k, e] of (st.idList || []).entries()) { e.o.renderOrder = reverse ? 1000 - k : k; const g = e.o.geometry;
      if (reverse) { if (e.idx0 === undefined) { e.idx0 = g.index; const n = g.index ? g.index.count : g.attributes.position.count, src = g.index ? g.index.array : null, out = new Uint32Array(n);
          for (let t = 0; t < n; t += 3) for (let q = 0; q < 3; q++) out[n - 3 - t + q] = src ? src[t + q] : t + q; e.rev = new T.BufferAttribute(out, 1); } g.setIndex(e.rev); }
      else if (e.idx0 !== undefined) g.setIndex(e.idx0); }
  }
  st.zfight = (pts, px = 96, samples = 2) => {
    const { R, S } = st; const rt = new T.WebGLRenderTarget(px, px), A = new Uint8Array(px * px * 4), Bf = new Uint8Array(px * px * 4), res = [];
    st.hid = []; S.traverse((o) => { if (!o.visible || !(o.isPoints || o.isSprite || o.isLine || o.isSkinnedMesh)) return; o.visible = false; st.hid.push(o); });
    for (const o of S.children) if (o.visible && !o.isCamera && !Object.values(st.W.rooms).some((r) => r.group === o) && !st.W.doors.some((d) => d.group === o)) { o.visible = false; st.hid.push(o); }
    const bg = S.background, fog = S.fog; S.background = new T.Color(0, 0, 0); S.fog = null; idSwap(true);
    try {
      for (const pt of pts) {
        const room = place(pt), out = { ...pt, room, faces: [], hits: [] };
        for (let k = 0; k < 6; k++) { const cam = camFor(pt, k, px); R.setRenderTarget(rt);
          idOrder(false); R.render(S, cam); R.readRenderTargetPixels(rt, 0, 0, px, px, A); idOrder(true); R.render(S, cam); R.readRenderTargetPixels(rt, 0, 0, px, px, Bf); R.setRenderTarget(null);
          const bad = []; for (let i = 0, q = 0; i < px * px; i++, q += 4) if ((A[q] !== Bf[q] || A[q + 1] !== Bf[q + 1] || A[q + 2] !== Bf[q + 2]) && A[q] && Bf[q]) bad.push(i);
          out.faces.push(bad.length);
          for (let s = 0; s < samples && bad.length; s++) { const i = bad[Math.floor((s + 0.5) / samples * bad.length)], q = i * 4, ma = A[q] - 1, mb = Bf[q] - 1;
            const ix = i % px, iy = Math.floor(i / px), rc = new T.Raycaster(); rc.setFromCamera(new T.Vector2((ix + 0.5) / px * 2 - 1, (iy + 0.5) / px * 2 - 1), cam);
            const ea = st.idList[ma], eb = st.idList[mb], hits = rc.intersectObjects(st.idList.map((e) => e.o).filter((o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; }), false);
            const h = hits[0], MI = h && h.object.geometry.attributes.matid, nrm = (x) => { const g = x.object.geometry, P = g.attributes.position, m = x.object.matrixWorld, v = [x.face.a, x.face.b, x.face.c].map((j) => new T.Vector3().fromBufferAttribute(P, j).applyMatrix4(m)); return new T.Vector3().crossVectors(v[1].sub(v[0]), v[2].sub(v[0])).normalize(); };
            // coplanar: the two nearest faces facing the camera lie in one plane (normals parallel, within a few mm); anything else is a crease
            const fr = hits.filter((x) => nrm(x).dot(rc.ray.direction) < 0), h2 = fr[1], cop = !!(fr[0] && h2 && Math.abs(h2.distance - fr[0].distance) < 0.004 + fr[0].distance * 0.0005 && Math.abs(nrm(fr[0]).dot(nrm(h2))) > 0.995);
            out.hits.push({ k: DNAME[k], px: bad.length, coplanar: cop, a: ea && ea.name, b: eb && eb.name, p: h ? h.point.toArray().map((x) => +x.toFixed(2)) : null, mat: h && MI ? st.MATN[Math.round(MI.getX(h.face.a))] : null, mat2: cop && h2.object.geometry.attributes.matid ? st.MATN[Math.round(h2.object.geometry.attributes.matid.getX(h2.face.a))] : null, d: h ? +h.distance.toFixed(2) : null, gap: h2 && fr[0] ? +(h2.distance - fr[0].distance).toFixed(4) : null }); }
        }
        res.push(out);
      }
    } finally { idOrder(false); idSwap(false); for (const o of st.hid) o.visible = true; st.hid = []; S.background = bg; S.fog = fog; R.setRenderTarget(null); rt.dispose(); }
    return res;
  };

  // ------------------------------------------------------------------ props as loaded (assets.js parts, LOD 0 and 1): degenerate faces,
  // faces whose winding disagrees with their normals, and open edges (an edge used by one face only, positions welded at 0.1 mm)
  st.assets = async () => {
    const AS = (await import('/js/assets.js')).ASSETS, out = {};
    for (const [name, A] of Object.entries(AS)) {
      const r = out[name] = { parts: 0, tris: 0, degen: 0, flipped: 0, open: 0, nonManifold: 0, worst: [] };
      for (const p of A.parts) { if (p.lod > 1) continue; r.parts++;
        const g = p.geo, P = g.attributes.position, N = g.attributes.normal, I = g.index ? g.index.array : null, n = I ? I.length : P.count, E = new Map(); let fl = 0, dg = 0;
        const key = (j) => `${Math.round(P.getX(j) * 1e4)},${Math.round(P.getY(j) * 1e4)},${Math.round(P.getZ(j) * 1e4)}`;
        for (let t = 0; t + 2 < n; t += 3) { const id = [0, 1, 2].map((k) => (I ? I[t + k] : t + k)), v = id.map((j) => new T.Vector3().fromBufferAttribute(P, j));
          const fn = new T.Vector3().crossVectors(new T.Vector3().subVectors(v[1], v[0]), new T.Vector3().subVectors(v[2], v[0])), a2 = fn.length(); if (a2 < 1e-10) { dg++; continue; } fn.divideScalar(a2);
          if (N) { const nv = new T.Vector3(); for (const j of id) nv.add(new T.Vector3().fromBufferAttribute(N, j)); if (nv.lengthSq() > 1e-12 && nv.normalize().dot(fn) < -0.2) fl++; }
          const ks = id.map(key); for (let e = 0; e < 3; e++) { const a = ks[e], b = ks[(e + 1) % 3], k = a < b ? a + '|' + b : b + '|' + a; E.set(k, (E.get(k) || 0) + 1); } }
        let open = 0, nm = 0; for (const c of E.values()) { if (c === 1) open++; else if (c > 2) nm++; }
        r.tris += n / 3; r.degen += dg; r.flipped += fl; r.open += open; r.nonManifold += nm;
        if (fl || open) r.worst.push({ part: p.name, mat: p.matName, lod: p.lod, tris: n / 3, flipped: fl, open, glow: p.glow }); }
      r.worst.sort((a, b) => b.flipped + b.open - a.flipped - a.open); r.worst = r.worst.slice(0, 8);
    }
    return out;
  };

  // which is wrong on a closed blob, the winding or the normals? (outward = away from the part's centre)
  st.blobCheck = async (name) => {
    const A = (await import('/js/assets.js')).ASSETS[name], out = [];
    for (const p of A.parts) { if (p.lod) continue; const g = p.geo, P = g.attributes.position, N = g.attributes.normal, I = g.index ? g.index.array : null, n = I ? I.length : P.count;
      const c = new T.Vector3(); for (let i = 0; i < P.count; i++) c.add(new T.Vector3().fromBufferAttribute(P, i)); c.divideScalar(P.count);
      let wIn = 0, nIn = 0, tot = 0; for (let t = 0; t + 2 < n; t += 3) { const id = [0, 1, 2].map((k) => (I ? I[t + k] : t + k)), v = id.map((j) => new T.Vector3().fromBufferAttribute(P, j));
        const fn = new T.Vector3().crossVectors(new T.Vector3().subVectors(v[1], v[0]), new T.Vector3().subVectors(v[2], v[0])); if (fn.lengthSq() < 1e-14) continue; tot++;
        const out_ = new T.Vector3().addVectors(v[0], v[1]).add(v[2]).divideScalar(3).sub(c); if (fn.dot(out_) < 0) wIn++;
        const nv = new T.Vector3(); for (const j of id) nv.add(new T.Vector3().fromBufferAttribute(N, j)); if (nv.dot(out_) < 0) nIn++; }
      out.push({ part: p.name, tris: tot, windingInward: wIn, normalsInward: nIn }); }
    return out;
  };
  st.view = (pt, k, px = 320, mode = 'mask') => {
    const { R, S } = st, rt = new T.WebGLRenderTarget(px, px), buf = new Uint8Array(px * px * 4), bufD = new Uint8Array(px * px * 4); place(pt);
    const keep = st.rt; st.rt = rt;
    try { const cam = camFor(pt, k, px); if (mode === 'mask') { testMode(true); try { depthPair(cam, px, buf, bufD); } finally { testMode(false); } }
      else { R.setRenderTarget(rt); R.render(S, cam); R.readRenderTargetPixels(rt, 0, 0, px, px, buf); } }
    finally { st.rt = keep; R.setRenderTarget(null); rt.dispose(); }
    const c = document.createElement('canvas'); c.width = c.height = px; const g = c.getContext('2d'), im = g.createImageData(px, px);
    const f = (v) => { v /= 255; v = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055; return Math.round(Math.max(0, Math.min(1, v)) * 255); };
    for (let y = 0; y < px; y++) for (let x = 0; x < px; x++) { const i = (px - 1 - y) * px + x, s = i * 4, d = (y * px + x) * 4; let r, gg, b;
      if (mode === 'mask') { const cl = classify(buf, bufD, i), dd = dec(bufD, s); const grey = cl === 3 ? 0 : Math.round(230 / (1 + dd / 4000)); [r, gg, b] = [[grey, grey, grey], [255, 0, 255], [255, 140, 0], [255, 0, 0]][cl]; }
      else { r = f(buf[s]); gg = f(buf[s + 1]); b = f(buf[s + 2]); }
      im.data[d] = r; im.data[d + 1] = gg; im.data[d + 2] = b; im.data[d + 3] = 255; }
    g.putImageData(im, 0, 0); return c.toDataURL('image/png');
  };
})();
