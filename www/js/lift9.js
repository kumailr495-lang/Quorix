// LUMIERE v11 - the lift, with its controls in the world (the user, 2026-11-14: "make the escalator and the elevator actually function and
// floor selection like actual 3d selection instead of the ui pasted on face").
// A through car between G and the first floor (building.js LIFT) inside the escalator and lift hall: its door is in the front (z1) wall at G
// and in the rear (z0) wall upstairs. Its controls are things in the world. You press one by tapping it, or by putting the crosshair on it
// and pressing E, A or the mouse (main.js); nothing is offered on the HUD.
//   - a call station beside each landing door (over the flat glow rooms.py bakes on the jamb): a display with the car's floor and one button
//     (up at G, down upstairs) whose ring stays lit from your press until the car stands there with its doors open
//   - a car operating panel on the return beside each car door, on your right as you walk in: a display, 1 · SCREENS, G · LOBBY, door open,
//     door close, alarm. Legends sit left of their buttons; buttons are 38 mm across, at least 9 cm apart (ADA 407, docs/V11-RESEARCH.md)
//   - the indicator in each landing's header shows the car's floor and, while it moves, its direction
// The doors open on a call, the open button or an arrival, and close when their time is up or on the close button; a safety edge keeps
// them open while anyone stands in the doorway. Arriving, the car chimes once at G (it will go up) and twice upstairs (it will go down).
import * as THREE from 'three';
import { Acc, toGeometry, M, MAT, boxGeo } from './geom.js';
import { makeCanvas, SANS } from './textures.js';

const IN = (r, x, z) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;
const R = 0.019, PLATE = 0.010, FACE = PLATE, CAP_H = 0.007,   // v11: the face is the plate's own front (a quad 1 mm off it fought far away)
  PW = 0.36, REACH = 1.9, PPM = 1400, HPPM = 800;
// panel layouts in the panel's own frame: u to the right as you face it, v up, metres from its centre
const COP = { w: 0.22, h: 0.64, disp: { u: 0, v: 0.235, w: 0.17, h: 0.095 }, keys: [
  { id: 'car1', u: 0.05, v: 0.10, label: '1', cap: 'SCREENS' }, { id: 'car0', u: 0.05, v: -0.02, label: 'G', cap: 'LOBBY' },
  { id: 'open', u: -0.045, v: -0.15, glyph: 'open' }, { id: 'close', u: 0.05, v: -0.15, glyph: 'close' }, { id: 'alarm', u: 0.05, v: -0.26, glyph: 'bell' }] };
const STA = { w: 0.13, h: 0.38, disp: { u: 0, v: 0.105, w: 0.1, h: 0.085 }, key: { u: 0, v: -0.045 } };
const HDR = { w: 0.5, h: 0.14 };
const frameOf = (p) => new THREE.Matrix4().makeRotationY(p.yaw).setPosition(p.c[0], p.c[1], p.c[2]);
const at = (p, u, v, d) => new THREE.Vector3(u, v, d).applyMatrix4(frameOf(p));
const V = new THREE.Vector3(), W = new THREE.Vector3(), O = new THREE.Object3D();

// a button cap: a shallow dome 38 mm across, 7 mm tall, facing +z
function capGeo() { const g = new THREE.LatheGeometry([[0.0005, 0], [R, 0], [R, CAP_H * 0.55], [R * 0.86, CAP_H * 0.9], [R * 0.5, CAP_H], [0.0005, CAP_H]].map(([r, y]) => new THREE.Vector2(r, y)), 20); g.rotateX(Math.PI / 2); return g; }
function capsMesh(mats, U, n) {
  const a = new Acc(); a.add(capGeo(), null, '#c9a35e', { mat: MAT.brass }); const g = toGeometry(a, 'occ');
  const m = new THREE.InstancedMesh(g, mats.litFor(U, g, true), n); m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  for (const [k, w] of [['iLh', 3], ['iLf', 3], ['iLs', 1]]) g.setAttribute(k, new THREE.InstancedBufferAttribute(new Float32Array(n * w), w)); return m;
}
// quads on panels' faces, one geometry for several (one draw): [{ p, w, h, uv: [u0, v0, u1, v1] }]
function quads(list) {
  const P = [], UV = [], I = [];
  list.forEach((q, k) => { for (const [s, t] of [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]]) { const v = at(q.p, s * q.w, t * q.h, FACE); P.push(v.x, v.y, v.z); UV.push(q.uv[0] + (s + 0.5) * (q.uv[2] - q.uv[0]), q.uv[1] + (t + 0.5) * (q.uv[3] - q.uv[1])); }
    I.push(k * 4, k * 4 + 1, k * 4 + 2, k * 4, k * 4 + 2, k * 4 + 3); });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); g.setIndex(I); g.computeBoundingSphere(); return g;
}
// ---------------------------------------------------------------- drawing (canvas; redrawn only when what it shows changes)
const rr = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
function glass(g, x, y, w, h) {   // black glass with a faint reflection and a brass edge
  const gr = g.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, '#17171b'); gr.addColorStop(0.5, '#0b0b0e'); gr.addColorStop(1, '#141418'); g.fillStyle = gr; g.fillRect(x, y, w, h);
  g.fillStyle = 'rgba(255,255,255,0.035)'; g.beginPath(); g.moveTo(x, y + h * 0.18); g.lineTo(x + w, y); g.lineTo(x + w, y + h * 0.06); g.lineTo(x, y + h * 0.3); g.fill();
  const b = Math.max(2, w * 0.014); g.strokeStyle = '#8a6d3f'; g.lineWidth = b; g.strokeRect(x + b / 2, y + b / 2, w - b, h - b);
}
function arrow(g, x, y, s, dir) { g.beginPath(); g.moveTo(x, y - dir * s / 2); g.lineTo(x + s * 0.55, y + dir * s / 2); g.lineTo(x - s * 0.55, y + dir * s / 2); g.closePath(); g.fill(); }
function display(g, x, y, w, h, st) {   // amber LED figures on black
  g.fillStyle = '#030304'; rr(g, x - w / 2, y - h / 2, w, h, h * 0.12); g.fill(); g.strokeStyle = '#2b2b30'; g.lineWidth = Math.max(1, h * 0.03); g.stroke();
  g.save(); g.fillStyle = '#ffb347'; g.shadowColor = 'rgba(255,170,60,0.8)'; g.shadowBlur = h * 0.18; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `700 ${h * 0.7}px ${SANS}`;
  if (st.dir) { g.fillText(st.floor, x - w * 0.16, y + h * 0.04); arrow(g, x + w * 0.2, y, h * 0.48, st.dir); } else g.fillText(st.floor, x, y + h * 0.04); g.restore();
}
function halo(g, x, y, r, lit, hover, alarm) {   // the ring round a button: dark brass, gold under the crosshair, warm white while the call stands
  g.save(); if (lit) { g.shadowColor = alarm ? 'rgba(255,200,80,0.95)' : 'rgba(255,226,170,0.95)'; g.shadowBlur = r * 0.9; }
  g.strokeStyle = lit ? (alarm ? '#ffd27a' : '#fff0cf') : hover ? '#e9bd6a' : alarm ? '#7a5a22' : '#5b4a33'; g.lineWidth = r * (lit || hover ? 0.32 : 0.22);
  g.beginPath(); g.arc(x, y, r * 1.34, 0, Math.PI * 2); g.stroke(); g.restore();
  g.fillStyle = '#050506'; g.beginPath(); g.arc(x, y, r * 1.06, 0, Math.PI * 2); g.fill();   // the well the cap sits in
}
function glyph(g, kind, x, y, r) {
  const s = r * 0.55; g.fillStyle = kind === 'bell' ? '#f2b84b' : '#f2ead8';
  if (kind === 'bell') { const bx = x - r * 2.4; g.beginPath(); g.moveTo(bx - s, y + s * 0.6); g.quadraticCurveTo(bx - s * 0.9, y - s * 0.9, bx, y - s); g.quadraticCurveTo(bx + s * 0.9, y - s * 0.9, bx + s, y + s * 0.6); g.closePath(); g.fill(); g.beginPath(); g.arc(bx, y + s * 0.85, s * 0.22, 0, Math.PI * 2); g.fill(); return; }
  const gy = y + r * 2.05, out = kind === 'open';
  for (const sd of [-1, 1]) { const tip = x + sd * (out ? s * 1.25 : s * 0.25), base = x + sd * (out ? s * 0.35 : s * 1.35); g.beginPath(); g.moveTo(tip, gy); g.lineTo(base, gy - s * 0.5); g.lineTo(base, gy + s * 0.5); g.closePath(); g.fill(); }
  g.fillRect(x - s * 0.06, gy - s * 0.6, s * 0.12, s * 1.2);
}
function drawCop(g, W_, H_, st) {
  const s = W_ / COP.w, X = (u) => (u + COP.w / 2) * s, Y = (v) => (COP.h / 2 - v) * s, r = R * s; glass(g, 0, 0, W_, H_); display(g, X(COP.disp.u), Y(COP.disp.v), COP.disp.w * s, COP.disp.h * s, st);
  for (const k of COP.keys) { const x = X(k.u), y = Y(k.v); halo(g, x, y, r, st.lit.has(k.id), st.hover === k.id, k.id === 'alarm');
    if (k.label) { g.fillStyle = '#f2ead8'; g.textBaseline = 'middle'; g.textAlign = 'right'; g.font = `700 ${r * 1.5}px ${SANS}`; g.fillText(k.label, x - r * 1.9, y + r * 0.06);
      g.fillStyle = 'rgba(242,234,216,0.62)'; g.font = `600 ${r * 0.62}px ${SANS}`; if ('letterSpacing' in g) g.letterSpacing = `${r * 0.08}px`; g.fillText(k.cap, x - r * 3.6, y + r * 0.06); if ('letterSpacing' in g) g.letterSpacing = '0px'; }
    else glyph(g, k.glyph, x, y, r); }
}
function drawStation(g, x0, W_, H_, st, k) {
  const s = W_ / STA.w, X = (u) => x0 + (u + STA.w / 2) * s, Y = (v) => (STA.h / 2 - v) * s, r = R * s; glass(g, x0, 0, W_, H_);
  display(g, X(STA.disp.u), Y(STA.disp.v), STA.disp.w * s, STA.disp.h * s, st); const x = X(STA.key.u), y = Y(STA.key.v), id = 'hall' + k;
  halo(g, x, y, r, st.lit.has(id), st.hover === id); g.fillStyle = '#f2ead8'; arrow(g, x, y + r * 2.3, r * 0.9, k ? -1 : 1);
}
function drawHeader(g, x0, y0, W_, H_, st) { g.fillStyle = '#040405'; g.fillRect(x0, y0, W_, H_); display(g, x0 + W_ / 2, y0 + H_ / 2, W_ * 0.42, H_ * 0.78, st);
  if (st.dir) { g.save(); g.fillStyle = '#ffb347'; g.shadowColor = 'rgba(255,170,60,0.8)'; g.shadowBlur = H_ * 0.15; for (const ax of [x0 + W_ * 0.12, x0 + W_ * 0.88]) arrow(g, ax, y0 + H_ / 2, H_ * 0.42, st.dir); g.restore(); } }

export class Lift {
  constructor(world, Lf) {
    Object.assign(this, { world, L: Lf, y: 0, level: 0, target: 0, state: 'idle', doors: [0, 0], hold: 0, t: 0, reopen: false, hallCall: [false, false], carCall: [false, false], hover: null, flash: {}, push: {}, keyL: '' });
    const room = world.rooms.lobby, U = room.U, mats = world.mats;
    const a = new Acc(), x0 = Lf.x0 + 0.02, x1 = Lf.x1 - 0.02, z0 = Lf.z0 + 0.18, z1 = Lf.z1 - 0.18, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, W_ = x1 - x0, D = z1 - z0, H = 2.45;
    a.add(boxGeo(W_, 0.06, D), M(cx, -0.025, cz), '#2a2522', { mat: MAT.granite });   // the floor, 5 mm proud of the shaft's
    a.add(boxGeo(W_, 0.05, D), M(cx, H + 0.025, cz), '#d9d2c5', { mat: MAT.metal });   // the ceiling
    // v11 (the user: no part may share a face with another or float beside it): the walls stand on the floor (from its top, 5 mm) up to the
    // ceiling; the returns run from the side walls' inner faces to the door openings; the mirror hangs over the handrails; each handrail is
    // a bar 40 mm off its wall on three brackets set into the wall and the bar, its ends 9 cm clear of the returns
    const hW = H - 0.005, yW = 0.005 + hW / 2;
    a.add(boxGeo(0.03, hW, D), M(x0 + 0.015, yW, cz), '#b9bcc2', { mat: MAT.chrome }); a.add(boxGeo(0.03, hW, D), M(x1 - 0.015, yW, cz), '#b9bcc2', { mat: MAT.chrome });
    a.add(boxGeo(0.012, 1.0, D - 0.5), M(x0 + 0.036, 1.65, cz), '#a8b4bc', { mat: MAT.chrome });   // a mirror panel on one side, over the rail
    for (const sx of [-1, 1]) { const xw = sx < 0 ? x0 + 0.03 : x1 - 0.03;   // the wall's inner face
      a.add(boxGeo(0.04, 0.04, D - 0.3), M(xw - sx * 0.06, 0.95, cz), '#c9a35e', { mat: MAT.brass });
      for (const zb of [cz - D / 2 + 0.2, cz, cz + D / 2 - 0.2]) a.add(boxGeo(0.055, 0.026, 0.012), M(xw - sx * 0.0225, 0.95, zb), '#c9a35e', { mat: MAT.brass }); }
    for (const zr of [z0 + 0.03, z1 - 0.03]) for (const sx of [-1, 1]) a.add(boxGeo(0.47, hW, 0.06), M(sx < 0 ? x0 + 0.265 : x1 - 0.265, yW, zr), '#3b2f25', { mat: MAT.powder });   // the returns beside both doors
    // the car operating panels on the returns (their plates are the cab's; faces and buttons are the cab's children)
    this.cops = [{ c: [x1 - 0.24, 1.13, z1 - 0.06], yaw: Math.PI }, { c: [x0 + 0.24, 1.13, z0 + 0.06], yaw: 0 }];
    for (const p of this.cops) a.add(boxGeo(COP.w, COP.h, PLATE, 0, ['px', 'nx', 'py', 'ny', 'nz']), frameOf(p).multiply(new THREE.Matrix4().makeTranslation(0, 0, PLATE / 2)), '#b8893c', { mat: MAT.brass });
    const g = toGeometry(a); room.lights.bake(g); const lh = g.attributes.lh.array; for (let i = 0; i < lh.length; i++) lh[i] = lh[i] * 0.4 + 0.35;   // the cab's own ceiling light
    this.cab = new THREE.Mesh(g, mats.litFor(U, g)); this.cab.name = 'lift-cab'; room.group.add(this.cab);
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(W_ - 0.3, D - 0.3), mats.glowMat(U)); gl.rotation.x = Math.PI / 2; gl.position.set(cx, H - 0.01, cz);
    gl.geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(12).fill(2.2), 3)); gl.geometry.setAttribute('grp', new THREE.BufferAttribute(new Float32Array(4), 1)); this.cab.add(gl);
    this.cx = cx; this.dw = 1.4; this.face = Lf.face || Lf.stops.map(() => 1); this.zDoor = this.face.map((f) => (f > 0 ? Lf.z1 - 0.07 : Lf.z0 + 0.07));
    // v11 two-speed centre-opening landing doors: per side a fast panel on the landing side and a slow one 3 cm behind it, each 0.36 m (0.35
    // plus 1 cm of overlap). Closed they overlap 1 cm at the middle (the east fast panel 6 mm prouder) and 5 mm into the jambs; open both
    // stack inside the jamb. One 0.7 m leaf a side could not retract into a 0.5 m jamb: open, it stuck out of the tower's post
    this.leaves = Lf.stops.map((ly, k) => { const zd = this.zDoor[k], f = this.face[k], out = [];
      for (const sd of [-1, 1]) for (const fast of [true, false]) { const q = new Acc(), nw = fast ? 0.012 : 0;
        q.add(boxGeo(PW - nw, 2.3, 0.04), M(sd * nw / 2, 1.15, 0), '#9ea2a8', { mat: MAT.metal });
        if (fast) q.add(boxGeo(nw, 2.3, 0.03), M(-sd * (PW - nw) / 2, 1.15, 0), '#151517', { mat: MAT.metal });   // a dark nosing on the meeting edge, 5 mm back from both faces (closed, the middle reads as two doors); same material, no extra draw
        const lg = toGeometry(q); lg.translate(cx, ly, zd); room.lights.bake(lg); lg.translate(-cx, -ly, -zd);
        const m = new THREE.Mesh(lg, mats.litFor(U, lg)); m.name = 'lift-door'; m.position.set(cx, ly, zd + f * (fast ? (sd > 0 ? 0.006 : 0) : -0.03)); room.group.add(m); out.push({ m, s: sd, fast }); }
      return out; });
    this.placeLeaves(0); this.placeLeaves(1);
    this.inner = { x0: x0 + 0.1, x1: x1 - 0.1, z0: Lf.z0 + 0.1, z1: Lf.z1 - 0.1 };
    // ---- the landing call stations (on the right jamb of each landing door, over rooms.py's glow) and the header indicators
    const lcx = (Lf.x0 + Lf.x1) / 2;
    this.stations = Lf.stops.map((ly, k) => ({ c: [Lf.x1 - 0.25, ly + 1.13, this.face[k] > 0 ? Lf.z1 : Lf.z0], yaw: this.face[k] > 0 ? 0 : Math.PI }));
    this.headers = Lf.stops.map((ly, k) => ({ c: [lcx, ly + 2.61, (this.face[k] > 0 ? Lf.z1 : Lf.z0) + this.face[k] * 0.03], yaw: this.face[k] > 0 ? 0 : Math.PI }));   // on the indicator box's face (rooms.py: 3 cm proud)
    const sp = new Acc(), open5 = ['px', 'nx', 'py', 'ny', 'nz'];   // plates without a front: the display is their face
    for (const p of this.stations) sp.add(boxGeo(STA.w, STA.h, PLATE, 0, open5), frameOf(p).multiply(new THREE.Matrix4().makeTranslation(0, 0, PLATE / 2)), '#b8893c', { mat: MAT.brass });
    for (const p of this.headers) sp.add(boxGeo(HDR.w, HDR.h, PLATE, 0, open5), frameOf(p).multiply(new THREE.Matrix4().makeTranslation(0, 0, PLATE / 2)), '#141416', { mat: MAT.powder });
    const sg = toGeometry(sp); room.lights.bake(sg); const sm = new THREE.Mesh(sg, mats.litFor(U, sg)); sm.name = 'lift-stations'; room.group.add(sm);
    // one canvas for the landings: the two stations, then the two headers
    const sw = Math.round(STA.w * PPM), sh = Math.round(STA.h * PPM), hw = Math.round(HDR.w * HPPM), hh = Math.round(HDR.h * HPPM), gap = 4;
    this.lc = makeCanvas(2 * sw + 2 * hw + 3 * gap, Math.max(sh, hh)); this.lg = this.lc.getContext('2d'); this.lt = new THREE.CanvasTexture(this.lc); this.lt.colorSpace = THREE.SRGBColorSpace; this.lt.anisotropy = 4;
    const CW = this.lc.width, CH = this.lc.height, reg = (x, w, h) => [x / CW, 1 - h / CH, (x + w) / CW, 1];
    this.lay = { sw, sh, hw, hh, xs: [0, sw + gap], xh: [2 * sw + 2 * gap, 2 * sw + hw + 3 * gap] };
    const lq = quads([...this.stations.map((p, k) => ({ p, w: STA.w, h: STA.h, uv: reg(this.lay.xs[k], sw, sh) })), ...this.headers.map((p, k) => ({ p: { c: p.c, yaw: p.yaw }, w: HDR.w, h: HDR.h, uv: reg(this.lay.xh[k], hw, hh) }))]);
    const Hl = [0, 0, 0], Fl = [0, 0, 0]; room.lights.at(Lf.x1 - 0.25, 1.2, Lf.z1 + 0.4, 0, 0, 1, Hl, Fl);
    const lm = new THREE.Mesh(lq, mats.texMat(this.lt, U, new THREE.Color(Hl[0] * 0.6, Hl[1] * 0.6, Hl[2] * 0.6), 0.75)); lm.name = 'lift-displays'; room.group.add(lm);
    // the car panels' faces (one canvas, two quads) and every cap
    this.cc = makeCanvas(Math.round(COP.w * PPM), Math.round(COP.h * PPM)); this.cg = this.cc.getContext('2d'); this.ct = new THREE.CanvasTexture(this.cc); this.ct.colorSpace = THREE.SRGBColorSpace; this.ct.anisotropy = 4;
    const cm = new THREE.Mesh(quads(this.cops.map((p) => ({ p, w: COP.w, h: COP.h, uv: [0, 0, 1, 1] }))), mats.texMat(this.ct, U, new THREE.Color(0.5, 0.48, 0.45), 0.7)); cm.name = 'lift-cop'; this.cab.add(cm);
    this.buttons = [];
    this.stations.forEach((p, k) => this.buttons.push({ id: 'hall' + k, k, car: false, p, u: STA.key.u, v: STA.key.v }));
    for (const p of this.cops) for (const key of COP.keys) this.buttons.push({ id: key.id, k: key.id.startsWith('car') ? +key.id.slice(3) : -1, car: true, p, u: key.u, v: key.v });
    this.capsL = capsMesh(mats, U, 2); this.capsL.name = 'lift-caps'; room.group.add(this.capsL);
    this.capsC = capsMesh(mats, U, this.buttons.length - 2); this.capsC.name = 'lift-car-caps'; this.cab.add(this.capsC);
    let iL = 0, iC = 0; const Hh = [0, 0, 0], Ff = [0, 0, 0];
    for (const b of this.buttons) { const p = at(b.p, b.u, b.v, PLATE + CAP_H); b.pos = p; b.n = new THREE.Vector3(Math.sin(b.p.yaw), 0, Math.cos(b.p.yaw));
      if (b.car) { b.mesh = this.capsC; b.i = iC++; const A = this.capsC.geometry.attributes; A.iLh.setXYZ(b.i, 0.9, 0.86, 0.8); A.iLf.setXYZ(b.i, 0, 0, 0); A.iLs.setX(b.i, 0); }
      else { b.mesh = this.capsL; b.i = iL++; room.lights.at(p.x + b.n.x * 0.1, p.y, p.z + b.n.z * 0.1, b.n.x, 0, b.n.z, Hh, Ff); const A = this.capsL.geometry.attributes; A.iLh.setXYZ(b.i, Hh[0], Hh[1], Hh[2]); A.iLf.setXYZ(b.i, Ff[0], Ff[1], Ff[2]); A.iLs.setX(b.i, 0); }
      this.placeCap(b, 0); }
    for (const m of [this.capsL, this.capsC]) for (const k of ['iLh', 'iLf', 'iLs']) m.geometry.attributes[k].needsUpdate = true;
    this.redraw(true);
  }
  placeCap(b, push) { const p = at(b.p, b.u, b.v, PLATE - push); O.position.copy(p); O.rotation.set(0, b.p.yaw, 0); O.updateMatrix(); b.mesh.setMatrixAt(b.i, O.matrix); b.mesh.instanceMatrix.needsUpdate = true; }
  inside(x, z) { return IN(this.inner, x, z); }
  // in front of stop k's door, outside the car (up to 1.6 m from it)
  atDoor(x, y, z, k) { const f = this.face[k], d = f > 0 ? z - this.L.z1 : this.L.z0 - z; return Math.abs(y - this.L.stops[k]) < 1.2 && Math.abs(x - this.cx) < 1.0 && d > -0.2 && d < 1.6; }
  // ---- calls. call(k): bring the car to floor k and open there (a landing call; tools/dev/walk.mjs uses it)
  request(k, car) { if (this.state === 'idle' && this.level === k) { this.hold = Math.max(this.hold, 6); this.flash[(car ? 'car' : 'hall') + k] = 0.4; return; }
    (car ? this.carCall : this.hallCall)[k] = true; if (car && this.state === 'idle') this.hold = Math.min(this.hold, 1.5); }
  call(k) { this.request(k, false); }
  press(id) {
    this.push[id] = 0.22;
    if (id === 'open') { if (this.state === 'closing') this.reopen = true; else if (this.state === 'idle') this.hold = Math.max(this.hold, 5); this.flash.open = 0.5; return; }
    if (id === 'close') { if (this.state === 'idle') this.hold = 0; this.flash.close = 0.5; return; }
    if (id === 'alarm') { this.flash.alarm = 1.4; return; }
    this.request(+id.slice(-1), id.startsWith('car'));
  }
  setHover(id) { this.hover = id || null; }
  // the button you point at (screen px, py; CSS pixels), within maxPx of it on screen, within arm's reach, on your side of the wall and
  // facing you: the car's buttons from inside the car, a landing's from that landing
  pick(cam, feetY, px, py, w, h, maxPx) {
    const e = cam.position, inCar = this.inside(e.x, e.z) && Math.abs(feetY - this.y) < 0.6; let best = null, bd = maxPx;
    for (const b of this.buttons) {
      V.copy(b.pos); if (b.car) V.y += this.y;
      if (b.car ? !inCar : inCar || Math.abs(feetY - this.L.stops[b.k]) > 0.8) continue;
      W.copy(e).sub(V); if (W.x * b.n.x + W.z * b.n.z < 0.03 || W.lengthSq() > REACH * REACH) continue;
      if (!b.car && !this.world.walls.sees(e.x, e.z, V.x + b.n.x * 0.06, V.z + b.n.z * 0.06, feetY + 0.9, feetY + 1.3, 0.02)) continue;
      V.project(cam); if (V.z > 1) continue; const d = Math.hypot((V.x + 1) / 2 * w - px, (1 - V.y) / 2 * h - py); if (d < bd) { bd = d; best = b; }
    }
    return best;
  }
  update(dt, actors, onEvent) {
    const lv = this.level, zd = this.zDoor[lv], ly = this.L.stops[lv];
    const inDoor = this.doors[lv] > 0.05 && actors.some((a) => Math.abs((a.y || 0) - ly) < 1.2 && Math.abs(a.x - this.cx) < this.dw / 2 + 0.1 && Math.abs(a.z - zd) < 0.35);   // the safety edge
    if (this.state === 'idle') {
      this.hold = Math.max(0, this.hold - dt); const want = this.hold > 0 || inDoor ? 1 : 0, d0 = this.doors[lv];
      this.doors[lv] = want > d0 ? Math.min(1, d0 + dt * 0.6) : Math.max(0, d0 - dt * 0.6);
      if (onEvent && d0 === 0 && this.doors[lv] > 0) onEvent('open'); if (onEvent && d0 === 1 && this.doors[lv] < 1) onEvent('close');
      const o = 1 - lv; if ((this.hallCall[o] || this.carCall[o]) && this.hold <= 0 && !inDoor) { this.target = o; this.state = 'closing'; }
    } else if (this.state === 'closing') {
      if (inDoor || this.reopen) { this.reopen = false; this.state = 'idle'; this.hold = 3; }
      else { this.doors[lv] = Math.max(0, this.doors[lv] - dt * 0.6); if (this.doors[lv] <= 0) { this.state = 'moving'; this.t = 0; this.from = this.y; onEvent && onEvent('move'); } }
    } else if (this.state === 'moving') {
      const d = this.L.stops[this.target] - this.from, T = Math.abs(d) / this.L.speed + 1.2; this.t += dt; const u = Math.min(1, this.t / T), e = u * u * (3 - 2 * u); this.y = this.from + d * e;
      if (u >= 1) { this.level = this.target; this.state = 'idle'; this.hold = 7; this.hallCall[this.level] = this.carCall[this.level] = false; onEvent && onEvent('ding'); }
    }
    this.cab.position.y = this.y;
    this.placeLeaves(0); this.placeLeaves(1);
    for (const k in this.flash) { this.flash[k] -= dt; if (this.flash[k] <= 0) delete this.flash[k]; }
    for (const b of this.buttons) { const t = this.push[b.id]; if (t === undefined) continue; const nt = t - dt; this.placeCap(b, nt > 0 ? 0.0035 * Math.min(1, nt / 0.07) : 0); if (nt > 0) this.push[b.id] = nt; else delete this.push[b.id]; }
    this.redraw(false);
  }
  // what the displays and rings show, and a redraw only when it changes
  view() { const lit = new Set(); this.hallCall.forEach((c, k) => c && lit.add('hall' + k)); this.carCall.forEach((c, k) => c && lit.add('car' + k)); for (const k in this.flash) lit.add(k);
    const dir = this.state === 'idle' ? 0 : this.target > this.level ? 1 : -1; return { floor: this.y < (this.L.stops[0] + this.L.stops[1]) / 2 ? 'G' : '1', dir, lit, hover: this.hover }; }
  redraw(force) {
    const st = this.view(), key = `${st.floor}${st.dir}|${[...st.lit].sort().join()}|${st.hover}`; if (!force && key === this.keyL) return; this.keyL = key;
    const { sw, sh, hw, hh, xs, xh } = this.lay, g = this.lg; g.clearRect(0, 0, this.lc.width, this.lc.height);
    xs.forEach((x, k) => drawStation(g, x, sw, sh, st, k)); xh.forEach((x) => drawHeader(g, x, 0, hw, hh, st)); this.lt.needsUpdate = true;
    drawCop(this.cg, this.cc.width, this.cc.height, st); this.ct.needsUpdate = true;
  }
  // the closed doors as walls: each stop's own door while it is shut or the car is elsewhere; the car's other end is always shut there
  placeLeaves(k) { const o = this.doors[k]; for (const L of this.leaves[k]) L.m.position.x = this.cx + L.s * ((L.fast ? 0.175 : 0.525) + o * (L.fast ? 0.71 : 0.36)); }   // open: both at 0.705..1.065 from the middle, inside the jamb
  doorSegs() { const S = (z, ly, on) => ({ seg: [this.cx - this.dw / 2, z, this.cx + this.dw / 2, z], y0: ly, y1: ly + 2.3, on }), out = [];
    this.L.stops.forEach((ly, k) => { out.push(S(this.zDoor[k], ly, this.doors[k] < 0.75 || this.level !== k || this.state !== 'idle')); for (const z of this.zDoor) if (z !== this.zDoor[k]) out.push(S(z, ly, true)); }); return out; }
}
