// LUMIERE v8 - what you hold: a striped popcorn bucket that visibly empties (four layers of kernels for nine bites, then crumbs),
// a soda cup with a dome lid and straw, a coffee cup with a sleeve. Drawn in the view-model pass (engine.vm), so it never clips into
// walls; lit like the room you stand in (crowd.lightAt). Empty items stay in your hand until you drop them in a bin.
import * as THREE from 'three';
const C = (hex) => new THREE.Color(hex), SRGB = THREE.SRGBColorSpace;   // colours below are sRGB, like the rest of the art
function paint(geo, fn) { const p = geo.attributes.position, c = new Float32Array(p.count * 3), col = new THREE.Color(); for (let i = 0; i < p.count; i++) { fn(p.getX(i), p.getY(i), p.getZ(i), col); c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b; } geo.setAttribute('color', new THREE.BufferAttribute(c, 3)); return geo; }
const solid = (geo, hex) => paint(geo, (x, y, z, c) => c.copy(C(hex)));
function merge(list) {
  let n = 0, idx = 0; for (const g of list) { n += g.attributes.position.count; idx += g.index ? g.index.count : g.attributes.position.count; }
  const P = new Float32Array(n * 3), N = new Float32Array(n * 3), Cc = new Float32Array(n * 3), I = new Uint32Array(idx); let o = 0, io = 0;
  for (const g of list) { const m = g.attributes.position.count; P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3); Cc.set(g.attributes.color.array, o * 3);
    if (g.index) { for (let k = 0; k < g.index.count; k++) I[io++] = g.index.array[k] + o; } else for (let k = 0; k < m; k++) I[io++] = k + o; o += m; }
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(P, 3)); out.setAttribute('normal', new THREE.BufferAttribute(N, 3)); out.setAttribute('color', new THREE.BufferAttribute(Cc, 3)); out.setIndex(new THREE.BufferAttribute(I, 1)); return out;
}
let seed = 11; const R = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
// one popped kernel: a lumpy, slightly flattened blob in cream to butter yellow
function kernel(x, y, z, s) {
  const g = new THREE.IcosahedronGeometry(s, 1), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const k = 0.72 + R() * 0.5; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.85, p.getZ(i) * k); }
  g.computeVertexNormals(); g.rotateX(R() * 6); g.rotateZ(R() * 6); g.translate(x, y, z); const base = R(); return paint(g, (vx, vy, vz, c) => c.setRGB(0.98, 0.9 - base * 0.12, 0.62 - base * 0.3 + (vy - y) * 2, SRGB));
}
export function makePopcorn() {
  const grp = new THREE.Group();
  // bucket: a tapered lathe with red and white stripes, a rolled rim, closed bottom
  const prof = [new THREE.Vector2(0.0, -0.085), new THREE.Vector2(0.052, -0.085), new THREE.Vector2(0.056, -0.08), new THREE.Vector2(0.074, 0.08), new THREE.Vector2(0.079, 0.083), new THREE.Vector2(0.077, 0.088)];
  const bucket = new THREE.LatheGeometry(prof, 36); bucket.computeVertexNormals();
  paint(bucket, (x, y, z, c) => { const a = Math.atan2(z, x), stripe = Math.floor(((a + Math.PI) / (Math.PI * 2)) * 12) % 2; if (y > 0.078 || y < -0.079) c.setRGB(0.95, 0.93, 0.88, SRGB); else if (stripe) c.setRGB(0.78, 0.06, 0.08, SRGB); else c.setRGB(0.96, 0.94, 0.9, SRGB); });
  const inner = new THREE.LatheGeometry(prof.map((v) => new THREE.Vector2(Math.max(0, v.x - 0.003), v.y)).reverse(), 36); inner.computeVertexNormals(); solid(inner, '#e9e1d2');
  const body = new THREE.Mesh(merge([bucket, inner])); grp.add(body);
  // kernels in four layers (low to the dome); the top layers go first as you eat
  const layers = [[-0.02, 0.012, 0.058, 16], [0.02, 0.012, 0.066, 18], [0.058, 0.013, 0.07, 20], [0.092, 0.014, 0.05, 16]];
  grp.userData.layers = layers.map(([y, s, r, n]) => { const ks = []; for (let i = 0; i < n; i++) { const a = R() * Math.PI * 2, rr = Math.sqrt(R()) * r; ks.push(kernel(Math.cos(a) * rr, y + R() * 0.02 + (y > 0.08 ? (1 - rr / r) * 0.03 : 0), Math.sin(a) * rr, s * (0.85 + R() * 0.35))); } const m = new THREE.Mesh(merge(ks)); grp.add(m); return m; });
  const crumbs = []; for (let i = 0; i < 7; i++) { const a = R() * 6.28, rr = R() * 0.045; crumbs.push(kernel(Math.cos(a) * rr, -0.075, Math.sin(a) * rr, 0.009)); } grp.userData.crumbs = new THREE.Mesh(merge(crumbs)); grp.add(grp.userData.crumbs);
  grp.userData.setLevel = (k) => { const L = grp.userData.layers, show = Math.ceil(k * L.length - 1e-6); L.forEach((m, i) => { m.visible = i < show; }); grp.userData.crumbs.visible = k > 0 && show <= 1; };
  return grp;
}
export function makeCup(kind) {
  const grp = new THREE.Group(), coffee = kind === 'coffee';
  const h = coffee ? 0.11 : 0.165, r0 = coffee ? 0.03 : 0.036, r1 = coffee ? 0.042 : 0.047;
  const prof = [new THREE.Vector2(0, -h / 2), new THREE.Vector2(r0, -h / 2), new THREE.Vector2(r1, h / 2), new THREE.Vector2(r1 + 0.002, h / 2 + 0.003)];
  const cup = new THREE.LatheGeometry(prof, 32); cup.computeVertexNormals();
  paint(cup, (x, y, z, c) => { const band = y > -h * 0.12 && y < h * 0.22; if (coffee) c.copy(band ? C('#7a5236') : C('#f1ece4')); else c.copy(band ? C('#141416') : C('#c3121c')); if (!coffee && Math.abs(y - h * 0.05) < 0.006) c.copy(C('#e3bf7f')); });
  const parts = [cup];
  if (coffee) { const lid = new THREE.CylinderGeometry(r1 + 0.004, r1 + 0.004, 0.012, 32); lid.translate(0, h / 2 + 0.008, 0); solid(lid, '#222225'); parts.push(lid); const sip = new THREE.BoxGeometry(0.012, 0.004, 0.006); sip.translate(0, h / 2 + 0.016, r1 * 0.6); solid(sip, '#111'); parts.push(sip); }
  else { const dome = new THREE.SphereGeometry(r1 + 0.003, 28, 8, 0, Math.PI * 2, 0, Math.PI / 2); dome.scale(1, 0.32, 1); dome.translate(0, h / 2 + 0.002, 0); paint(dome, (x, y, z, c) => c.setRGB(0.92, 0.94, 0.96, SRGB)); parts.push(dome);
    const straw = new THREE.CylinderGeometry(0.0035, 0.0035, 0.12, 8); straw.rotateZ(0.12); straw.translate(0.006, h / 2 + 0.05, 0); paint(straw, (x, y, z, c) => (Math.floor(y * 90) % 2 ? c.setRGB(0.95, 0.95, 0.95, SRGB) : c.setRGB(0.85, 0.1, 0.12, SRGB))); parts.push(straw); }
  grp.add(new THREE.Mesh(merge(parts))); grp.userData.setLevel = () => {}; return grp;
}
export function makeHeld(kind) { return kind === 'popcorn' ? makePopcorn() : makeCup(kind); }
export function setHeldMaterial(grp, mat) { grp.traverse((o) => { if (o.isMesh) { o.material = mat; o.frustumCulled = false; } }); }
