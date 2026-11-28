// LUMIERE v14e - the private screens (the user, 11-26: "private theatres ... home with a remote, jungle, drive-in, space"; 11-27: "the home
// should be in theatre as you can rent it and you should not be able to edit it ... there should be home, jungle, winter, drive in, space";
// "the home is not in the main theatre rather it teleports you there"). A lift in the lobby takes you up to the private floor: a lounge
// (building.js VIP) with five themed screening rooms off it (PRIVATE; tools/blender/arch/vip14.py builds and bakes their shells). The lift is
// a round car with curved sliding doors; there is one in the lobby and one in the lounge, alike inside, and a ride with the doors shut takes
// you from one to the other. Each room is a show hall of its own (film9 addHall: your videos, songs and links, the house films); rent it at
// its door (its leaves stay locked until then); its remote lies on the side table. The furniture is placed here (privateDress -> world9
// DRESS); the themes' living detail (fireflies, snow, stars and a planet, the drive-in's sky and string lights) is drawn here.
import * as THREE from 'three';
import { VIP as LOUNGE, PRIVATE } from './building.js';
import { MAT, Acc, toGeometry, M } from './geom.js';
import { makeCanvas, SANS, SERIF } from './textures.js';
import { makeRemote } from './remote.js';

export const PV_PRICE = Object.fromEntries(PRIVATE.map((p) => [p.id, p.price]));
const VELVET = MAT.velvet, LEATHER = MAT.leather;
const at = (p, u, d) => { const w = p.toWorld(u, d); return { x: w.x, z: w.z }; };
// a prop's front (+z) towards the picture: the picture lies at -d, i.e. along x by -f... toWorld(0, 0) - toWorld(0, 1) = (f, 0)
const faceYaw = (p) => Math.atan2(p.f, 0);
// ---------------------------------------------------------------- furniture: [model, u, d, y, options] per room (d from the picture)
function kit(p) {
  const R = p.riser ? p.riser.y : 0, rd = p.riser ? (p.riser.d0 + p.riser.d1) / 2 : 0;
  switch (p.theme) {
    case 'home': return [['sofa_curve', 0, 5.7, 0, {}], ['scan_coffee_table', 0, 3.9, 0, {}], ['rug_rect', 0, 5.0, 0, { collide: false, yaw: Math.PI / 2 }],
      ['side_table', -2.45, 5.6, 0, {}], ['side_table', 2.45, 5.6, 0, {}], ['table_lamp', -2.45, 5.6, 0.85, { collide: false }], ['table_lamp', 2.45, 5.6, 0.85, { collide: false }],
      ['bed_modern', 0, rd + 0.1, R, { swap: { velvet_charcoal: [LEATHER, [0.46, 0.27, 0.15]], wool_charcoal: [VELVET, [0.6, 0.5, 0.38]] } }], ['speaker_tower', -4.1, 1.15, 0, {}], ['speaker_tower', 4.1, 1.15, 0, {}],
      ['shelf_unit', -4.55, 7.0, 0, { yaw: Math.PI / 2 }], ['shelf_unit', 4.55, 7.0, 0, { yaw: -Math.PI / 2 }], ['planter_tall', -4.3, 12.9, 0, {}], ['planter_tall', 4.3, 12.9, 0, {}],
      ['torchere_deco', -3.7, 11.9, 0, { collide: false }], ['torchere_deco', 3.7, 11.9, 0, { collide: false }],
      ['side_table', -1.55, rd + 0.9, R, {}], ['side_table', 1.55, rd + 0.9, R, {}], ['table_lamp', -1.55, rd + 0.9, R + 0.85, { collide: false }], ['table_lamp', 1.55, rd + 0.9, R + 0.85, { collide: false }],
      ['rug_round', 0, rd, R, { scale: 0.9, collide: false, swap: { velvet_navy: [VELVET, [0.55, 0.42, 0.3]], carpet_deco: [VELVET, [0.42, 0.3, 0.2]] } }],
      ['scan_armchair', -3.6, 3.2, 0, { yaw: 0.6 }], ['planter_tall', -4.3, 2.0, 0, {}], ['planter_tall', 4.3, 2.0, 0, {}], ['planter_tall', 4.3, 8.6, 0, {}]];
    case 'jungle': return [['scan_lounge_chair', -2.1, 5.4, 0, {}], ['scan_lounge_chair', 0, 5.4, 0, {}], ['scan_lounge_chair', 2.1, 5.4, 0, {}],
      ['scan_lounge_chair', -1.1, rd, R, {}], ['scan_lounge_chair', 1.1, rd, R, {}], ['olive_tree', -3.6, 2.2, 0, { scale: 0.8, collide: false }], ['olive_tree', 3.6, 2.2, 0, { scale: 0.8, collide: false }],
      ['planter_tall', -4.4, 4.0, 0, {}], ['planter_tall', 4.4, 4.0, 0, {}], ['planter_tall', -4.4, 7.2, 0, {}], ['planter_tall', 4.4, 7.2, 0, {}], ['planter_tall', -4.4, 12.6, 0, {}], ['planter_tall', 4.4, 12.6, 0, {}],
      ['hedge_block', -3.4, rd, R, { collide: false }], ['hedge_block', 3.4, rd, R, { collide: false }], ['side_table', 3.15, 5.4, 0, {}]];
    case 'winter': return [['scan_armchair', -1.0, 5.6, 0, { swap: { scan_armchair_a: [VELVET, [0.86, 0.86, 0.84]] } }], ['scan_armchair', 1.0, 5.6, 0, { swap: { scan_armchair_a: [VELVET, [0.86, 0.86, 0.84]] } }],
      ['rug_round', 0, 5.2, 0, { scale: 0.85, collide: false, swap: { velvet_navy: [VELVET, [0.82, 0.84, 0.86]], carpet_deco: [VELVET, [0.7, 0.74, 0.8]] } }], ['side_table', 0, 5.75, 0, {}],
      ['scan_chesterfield', 0, rd, R, { swap: { scan_chesterfield_a: [LEATHER, [0.62, 0.42, 0.28]] } }], ['scan_armchair', -2.6, rd, R, { swap: { scan_armchair_a: [VELVET, [0.86, 0.86, 0.84]] } }],
      ['planter_tall', -4.4, 12.6, 0, {}], ['torchere_deco', 4.0, 12.4, 0, { collide: false }]];
    case 'space': return [['scan_lounge_chair', -2.1, 5.4, 0, { swap: { scan_lounge_chair_a: [LEATHER, [0.72, 0.75, 0.8]] } }], ['scan_lounge_chair', 0, 5.4, 0, { swap: { scan_lounge_chair_a: [LEATHER, [0.72, 0.75, 0.8]] } }],
      ['scan_lounge_chair', 2.1, 5.4, 0, { swap: { scan_lounge_chair_a: [LEATHER, [0.72, 0.75, 0.8]] } }], ['side_table', 1.05, 5.4, 0, {}], ['borne_round', 0, rd, R, { swap: { velvet_teal: [VELVET, [0.18, 0.16, 0.42]] } }],
      ['plinth_marble', -4.2, 12.6, 0, {}], ['plinth_marble', 4.2, 12.6, 0, {}], ['scan_bust', -4.2, 12.6, 1.04, { collide: false }]];
    default: return [   // the drive-in: cars in the bays facing the screen, deck chairs and a bench by them, a popcorn cart, lamp posts at the lot's corners
      ['car_sedan', -8, 11.3, 0, {}], ['car_taxi', 4, 11.3, 0, {}], ['car_sedan', -4, 17.3, 0, {}], ['car_sedan', 8, 17.3, 0, {}], ['car_taxi', 0, 23.3, 0, {}],
      ['scan_lounge_chair', -0.9, 10.6, 0, {}], ['scan_lounge_chair', 0.9, 10.6, 0, {}], ['side_table', 0, 10.6, 0, {}], ['bench_velvet', -8, 7.9, 0, { swap: { velvet_teal: [VELVET, [0.34, 0.02, 0.03]] } }],
      ['directors_chair', 3.4, 8.1, 0, {}], ['directors_chair', 4.6, 8.1, 0, {}], ['popcorn_cart', 11.5, 25.0, 0, { yaw: -Math.PI / 2 }],
      ['lamp_post', -13.0, 7.0, 0, {}], ['lamp_post', 13.0, 7.0, 0, {}], ['lamp_post', -13.0, 24.0, 0, {}], ['lamp_post', 13.0, 24.0, 0, {}],
      ['bollard_light', -4.0, 25.6, 0, { collide: false }], ['bollard_light', 4.0, 25.6, 0, { collide: false }]];
  }
}
// the lounge: a seating island in the middle, planters in the corners, a popcorn cart by the drive-in's door
function loungeKit() {
  const L = LOUNGE, cx = (L.x0 + L.x1) / 2, cz = (L.z0 + L.z1) / 2 - 1.0;
  return [['scan_chesterfield', cx, cz + 1.6, Math.PI], ['scan_chesterfield', cx, cz - 1.6, 0], ['armchair_deco', cx - 1.9, cz, Math.PI / 2], ['armchair_deco', cx + 1.9, cz, -Math.PI / 2],
    ['table_lounge', cx, cz, 0], ['planter_tall', L.x0 + 0.8, L.z0 + 0.8, 0], ['planter_tall', L.x1 - 0.8, L.z0 + 0.8, 0], ['planter_tall', L.x0 + 0.8, L.z1 - 0.9, 0], ['planter_tall', L.x1 - 0.8, L.z1 - 0.9, 0],
    ['popcorn_cart', L.x1 - 1.4, L.z0 + 2.2, -Math.PI / 2], ['torchere_deco', cx - 3.6, cz + 3.0, 0], ['torchere_deco', cx + 3.6, cz + 3.0, 0]];
}
export function privateDress() {
  const out = [];
  for (const p of PRIVATE) { const yaw0 = faceYaw(p);
    for (const [name, u, d, y, o] of kit(p)) { const q = at(p, u, d), { yaw, ...rest } = o; out.push({ room: p.key, name, x: q.x, y, z: q.z, yaw: yaw0 + (yaw || 0), o: rest }); } }
  for (const [name, x, z, yaw] of loungeKit()) out.push({ room: 'vip', name, x, y: 0, z, yaw, o: {} });
  return out;
}
// ---------------------------------------------------------------- the panels the builder left on the lounge's walls
const THEME_COL = { home: ['#2a1d14', '#ffb36b'], jungle: ['#0f2416', '#7cff9a'], winter: ['#18232e', '#bfe4ff'], space: ['#0a0b1e', '#9a8cff'], drive: ['#160a0c', '#ff7a8a'] };
export const PV_PANELS = {
  // the room's name over its door: brass serif capitals on black lacquer
  pvsign: (g, w, h, id) => { const p = PRIVATE.find((q) => 'pvsign_' + q.id === id); g.fillStyle = '#0b0a0a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#c9a35e'; g.lineWidth = h * 0.05; g.strokeRect(h * 0.06, h * 0.06, w - h * 0.12, h - h * 0.12);
    g.fillStyle = '#e8c27a'; g.font = `500 ${h * 0.56}px ${SERIF}`; g.textAlign = 'center'; g.textBaseline = 'middle'; if ('letterSpacing' in g) g.letterSpacing = `${h * 0.12}px`; g.__fit = [h * 0.2, w - h * 0.2];
    g.fillText(p ? p.name : '', w / 2, h * 0.54); g.__fit = null; if ('letterSpacing' in g) g.letterSpacing = '0px'; },
  // each room's key art: its colours and an emblem drawn in canvas (original), the name and "private screen"
  pvart: (g, w, h, id) => { const p = PRIVATE.find((q) => 'pvart_' + q.id === id), [bg, ac] = THEME_COL[p ? p.theme : 'home'], gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, bg); gr.addColorStop(1, '#050505'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.save(); g.translate(w / 2, h * 0.42); g.strokeStyle = ac; g.fillStyle = ac; g.lineWidth = w * 0.012; const r = w * 0.28;
    if (p.theme === 'home') { g.beginPath(); g.moveTo(-r, r * 0.3); g.lineTo(0, -r * 0.7); g.lineTo(r, r * 0.3); g.stroke(); g.strokeRect(-r * 0.7, r * 0.3, r * 1.4, r * 0.8); g.fillRect(-r * 0.15, r * 0.6, r * 0.3, r * 0.5); }
    else if (p.theme === 'jungle') { for (let i = 0; i < 7; i++) { g.save(); g.rotate(-1.2 + i * 0.4); g.beginPath(); g.ellipse(0, -r * 0.55, r * 0.16, r * 0.55, 0, 0, Math.PI * 2); g.globalAlpha = 0.55 + 0.06 * i; g.fill(); g.restore(); } }
    else if (p.theme === 'winter') { for (let i = 0; i < 6; i++) { g.save(); g.rotate(i * Math.PI / 3); g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -r); g.moveTo(0, -r * 0.55); g.lineTo(-r * 0.22, -r * 0.78); g.moveTo(0, -r * 0.55); g.lineTo(r * 0.22, -r * 0.78); g.stroke(); g.restore(); } }
    else if (p.theme === 'space') { g.beginPath(); g.arc(0, 0, r * 0.5, 0, Math.PI * 2); g.fill(); g.beginPath(); g.ellipse(0, 0, r * 0.95, r * 0.25, -0.35, 0, Math.PI * 2); g.stroke(); for (let i = 0; i < 40; i++) { g.globalAlpha = 0.4 + Math.random() * 0.6; g.fillRect((Math.random() - 0.5) * w * 0.9, (Math.random() - 0.7) * h * 0.6, 2, 2); } g.globalAlpha = 1; }
    else { g.strokeRect(-r, -r * 0.6, r * 2, r * 1.1); g.beginPath(); g.ellipse(-r * 0.45, r * 0.95, r * 0.45, r * 0.2, 0, Math.PI, 0); g.ellipse(r * 0.45, r * 0.95, r * 0.45, r * 0.2, 0, Math.PI, 0); g.stroke(); }
    g.restore(); g.textAlign = 'center'; g.fillStyle = '#f3e7cf'; g.font = `500 ${w * 0.13}px ${SERIF}`; g.__fit = [w * 0.06, w * 0.94]; g.fillText(p ? p.name : '', w / 2, h * 0.8); g.__fit = null;
    g.fillStyle = ac; g.font = `600 ${w * 0.045}px ${SANS}`; if ('letterSpacing' in g) g.letterSpacing = `${w * 0.012}px`; g.fillText('PRIVATE SCREEN', w / 2, h * 0.88); if ('letterSpacing' in g) g.letterSpacing = '0px'; },
  // the board by the drive-in's door: the five rooms and their prices for a visit
  pvinfo: (g, w, h) => { g.fillStyle = '#0c0b0a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#c9a35e'; g.lineWidth = w * 0.012; g.strokeRect(w * 0.04, w * 0.04, w * 0.92, h - w * 0.08);
    g.textAlign = 'center'; g.fillStyle = '#e8c27a'; g.font = `500 ${w * 0.1}px ${SERIF}`; g.fillText('LUMIÈRE', w / 2, h * 0.14); g.fillStyle = '#b9ab95'; g.font = `600 ${w * 0.04}px ${SANS}`; g.fillText('PRIVATE SCREENS', w / 2, h * 0.2);
    PRIVATE.forEach((p, i) => { const y = h * (0.32 + i * 0.12); g.textAlign = 'left'; g.fillStyle = '#f3e7cf'; g.font = `500 ${w * 0.075}px ${SERIF}`; g.fillText(p.name, w * 0.1, y); g.textAlign = 'right'; g.fillStyle = '#e8c27a'; g.font = `600 ${w * 0.055}px ${SANS}`; g.fillText(p.price + ' LC', w * 0.9, y); });
    g.textAlign = 'center'; g.fillStyle = '#8f8476'; g.font = `500 ${w * 0.04}px ${SANS}`; g.fillText('Rent at the door · your videos, songs and films', w / 2, h * 0.95); },
};
// ---------------------------------------------------------------- the themes' living detail (shaders animated from one clock)
const SNOW_V = `uniform float uT; uniform float uH; uniform float uS; attribute float aS; varying float vA; void main() { vec3 p = position; float t = uT * (0.35 + 0.25 * aS) + aS * 13.0;
  p.y = position.y - mod(t, uH); p.x += 0.12 * sin(t * 1.3 + aS * 6.0); p.z += 0.1 * cos(t * 1.1 + aS * 4.0); vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv; gl_PointSize = (0.022 + 0.014 * aS) * uS / max(0.3, -mv.z); vA = clamp(mod(t, uH) / 0.3, 0.0, 1.0) * clamp((uH - mod(t, uH)) / 0.3, 0.0, 1.0); }`;
const DOT_F = `uniform vec3 uC; varying float vA; void main() { vec2 c = gl_PointCoord - 0.5; float d = dot(c, c); if (d > 0.25) discard; gl_FragColor = vec4(uC, (1.0 - d * 4.0) * 0.85 * vA); }`;
const FLY_V = `uniform float uT; uniform float uS; attribute float aS; varying float vA; void main() { vec3 p = position; float t = uT * (0.4 + 0.3 * aS) + aS * 20.0;
  p += vec3(0.35 * sin(t * 0.9 + aS * 7.0), 0.2 * sin(t * 1.4 + aS * 3.0), 0.35 * cos(t * 0.7 + aS * 5.0)); vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv; gl_PointSize = 0.035 * uS / max(0.3, -mv.z); vA = 0.35 + 0.65 * pow(0.5 + 0.5 * sin(t * 3.0 + aS * 9.0), 3.0); }`;
const STAR_V = `uniform float uT; uniform float uS; attribute float aS; varying float vA; void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
  gl_PointSize = max(1.5, (0.035 + 0.04 * aS) * uS / max(0.3, -mv.z)); vA = 0.45 + 0.55 * (0.5 + 0.5 * sin(uT * (1.0 + 2.0 * aS) + aS * 40.0)); }`;
const PLANET_V = `varying vec3 vN; varying vec3 vP; void main() { vN = normalize(normalMatrix * normal); vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const PLANET_F = `uniform float uT; uniform vec3 uA; uniform vec3 uB; varying vec3 vN; varying vec3 vP; void main() { float b = sin(vP.y * 18.0 + sin(vP.x * 6.0 + uT * 0.3) * 1.5) * 0.5 + 0.5;
  vec3 c = mix(uA, uB, b * 0.7); float rim = pow(1.0 - abs(vN.z), 2.2); c += vec3(0.4, 0.55, 1.0) * rim * 0.9;
  c *= 0.45 + 0.55 * clamp(dot(vN, normalize(vec3(0.6, 0.5, 0.6))), 0.0, 1.0); gl_FragColor = vec4(c, 1.0); }`;
const pointsMat = (vs, col) => new THREE.ShaderMaterial({ vertexShader: vs, fragmentShader: DOT_F, uniforms: { uT: { value: 0 }, uH: { value: 2.4 }, uS: { value: 500 }, uC: { value: new THREE.Color(col) } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
// ---------------------------------------------------------------- the lift car: a round walnut cab in a bronze shell, curved sliding doors
const POD_R = 1.25, POD_H = 2.55, GAP = 0.9;   // the opening: +-GAP rad round the front (+z)
function arc(acc, r, y0, y1, a0, a1, col, mat, inward, n = 24) {   // a curved strip of quads; angle 0 is +z, +pi/2 is +x
  const P = [], I = [], N = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n, s = Math.sin(a), c = Math.cos(a); P.push(r * s, y0, r * c, r * s, y1, r * c); const k = inward ? -1 : 1; N.push(k * s, 0, k * c, k * s, 0, k * c); }
  for (let i = 0; i < n; i++) { const b = i * 2; if (inward) I.push(b, b + 1, b + 2, b + 2, b + 1, b + 3); else I.push(b, b + 2, b + 1, b + 1, b + 2, b + 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setIndex(I); acc.add(g, null, col, { mat });
}
function ring(acc, r0, r1, y, a0, a1, col, mat, up, n = 24) {   // a flat annulus sector at height y facing up (or down)
  const P = [], I = [], N = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n, s = Math.sin(a), c = Math.cos(a); P.push(r0 * s, y, r0 * c, r1 * s, y, r1 * c); N.push(0, up ? 1 : -1, 0, 0, up ? 1 : -1, 0); }
  for (let i = 0; i < n; i++) { const b = i * 2; if (up) I.push(b, b + 1, b + 2, b + 2, b + 1, b + 3); else I.push(b, b + 2, b + 1, b + 1, b + 2, b + 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setIndex(I); acc.add(g, null, col, { mat });
}
function podShell() {
  const a = new Acc(), BR = '#c9a35e', OUT = '#7a4c2c', WN = '#5a3a24', a0 = GAP, a1 = Math.PI * 2 - GAP;   // walnut out and in (bronze metal read black in the lobby), brass bands
  arc(a, POD_R + 0.04, 0, POD_H + 0.12, a0, a1, OUT, MAT.wood, false, 32); arc(a, POD_R - 0.02, 0.02, POD_H, a0, a1, WN, MAT.wood, true, 32);
  for (const [y0, y1] of [[0.04, 0.12], [POD_H - 0.02, POD_H + 0.06], [1.3, 1.33]]) { arc(a, POD_R + 0.055, y0, y1, a0, a1, BR, MAT.brass, false, 32); ring(a, POD_R + 0.04, POD_R + 0.055, y1, a0, a1, BR, MAT.brass, true, 32); ring(a, POD_R + 0.04, POD_R + 0.055, y0, a0, a1, BR, MAT.brass, false, 32); }   // three brass bands, 15 mm proud
  for (const s of [-1, 1]) { const g = new THREE.PlaneGeometry(0.06, POD_H + 0.1); const ang = s > 0 ? a0 : a1, r = POD_R + 0.01, x = r * Math.sin(ang), z = r * Math.cos(ang); a.add(g, M(x, (POD_H + 0.1) / 2, z, ang + (s > 0 ? -Math.PI / 2 : Math.PI / 2)), BR, { mat: MAT.brass }); }   // the jambs' edges
  ring(a, 0, POD_R + 0.04, 0.012, 0, Math.PI * 2, '#5a0f17', MAT.carpet, true, 40);   // the floor: crimson carpet, 12 mm proud of the room's
  ring(a, 0, POD_R - 0.02, POD_H, 0, Math.PI * 2, '#efe6d4', MAT.paint, false, 40); ring(a, 0, POD_R + 0.04, POD_H + 0.12, 0, Math.PI * 2, '#2a1d12', MAT.metal, true, 40);   // ceiling inside, the roof outside
  arc(a, POD_R - 0.025, 0.98, 1.02, a0 + 0.1, a1 - 0.1, '#c9a35e', MAT.brass, true, 32);   // a brass handrail line round the inside
  return a;
}
function leafGeo(open) {   // one door leaf in its own frame: a curved bronze panel at the shell's outer radius plus 25 mm, GAP wide
  const a = new Acc(); arc(a, POD_R + 0.081, 0.015, POD_H + 0.05, GAP * 0.45, GAP * 0.55, '#d9b46a', MAT.brass, false, 2); /* a brass line down its middle, 6 mm proud */ arc(a, POD_R + 0.075, 0.015, POD_H + 0.05, 0, GAP, '#b89466', MAT.lacquer, false, 10); arc(a, POD_R + 0.065, 0.015, POD_H + 0.05, 0, GAP, '#3a2818', MAT.wood, true, 10);
  return a;
}
export class Privates {
  constructor(world, engine, mats, o = {}) {
    this.world = world; this.engine = engine; this.o = o; this.rented = {}; this.halls = []; this.mats = []; this.t = 0; this.fx = [];
    world.privates = this.halls; const hb = world.hallById, hk = world.hallByKey;
    world.hallById = (id) => hb(id) || this.halls.find((h) => h.id === id); world.hallByKey = (k) => hk(k) || this.halls.find((h) => h.key === k);
    for (const p of PRIVATE) { const room = world.rooms[p.key]; if (!room) continue; this.halls.push(this._hall(p, room)); this._effect(p, room); }
    this.doors = Object.fromEntries(world.doors.filter((d) => d.def.priv).map((d) => [d.def.priv, d])); for (const d of Object.values(this.doors)) d.locked = true;
    this.remotes = {}; for (const h of this.halls) this._remote(h);
    // the two lift cars: the lobby's (its doors to the lobby) and the lounge's (to the lounge)
    const LP = LOUNGE.lobbyPod, WP = LOUNGE.pod;
    this.pods = [this._pod('lobby', LP.x, LP.z, LP.yaw, 'up'), this._pod('vip', WP.x, WP.z, Math.PI, 'down')];   // the lounge's car faces north, into the lounge
    { const W = world.walls; for (const s of [-1, 1]) W.add(WP.x + s * (POD_R + 0.1), WP.z, WP.x + s * (POD_R + 0.1), LOUNGE.z1 - 0.2, -0.1, POD_H + 0.2, 1); }   // no way round behind it to the wall
    this.ride = null;
  }
  // a private room as a show hall (film9 reads id, key, name, room, picMat, slate, curtains, seats and cfg: W, H, aspect)
  _hall(p, room) {
    const sc = p.screen, f = p.f, slate = this._slate(p), picMat = this.o.pictureMat(slate); picMat.uniforms.uGain.value = 0.55;
    const g = new THREE.PlaneGeometry(sc.W, sc.H), pic = new THREE.Mesh(g, picMat); pic.position.set(sc.x, sc.hB + sc.H / 2, sc.zc); pic.rotation.y = -f * Math.PI / 2; pic.renderOrder = 1; pic.frustumCulled = false; pic.name = p.key + '-picture'; room.group.add(pic);
    room.lights.setScreen && room.lights.setScreen([{ c: [sc.x, sc.hB + sc.H / 2, sc.zc], u: [0, 0, sc.W / 2], v: [0, sc.H / 2, 0], n: [-f, 0, 0], su: 3, sv: 3 }]);
    const cfg = { id: 'PV_' + p.id, key: p.key, name: p.name, W: sc.W, H: sc.H, hB: sc.hB, aspect: sc.W / sc.H, y0: 0, width: p.z1 - p.z0 - 0.4, depthIn: p.depth, ceil: p.ceil, toWorld: p.toWorld, toLocal: p.toLocal, dir: f, private: true };
    return { cfg, id: cfg.id, key: p.key, name: p.name, room, seats: [], arms: null, pic, picMat, slate, patches: [], curtains: null, private: true, p };
  }
  _slate(p) { const c = makeCanvas(1024, 512), g = c.getContext('2d'), [bg, ac] = THEME_COL[p.theme], gr = g.createRadialGradient(512, 230, 20, 512, 256, 600); gr.addColorStop(0, bg); gr.addColorStop(1, '#030303'); g.fillStyle = gr; g.fillRect(0, 0, 1024, 512);
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#e8c27a'; g.font = `500 70px ${SERIF}`; if ('letterSpacing' in g) g.letterSpacing = '14px'; g.fillText('LUMIÈRE', 512, 200);
    g.fillStyle = ac; g.font = `600 30px ${SANS}`; if ('letterSpacing' in g) g.letterSpacing = '8px'; g.__fit = [40, 984]; g.fillText(p.name + ' · PRIVATE SCREEN', 512, 290); g.__fit = null; if ('letterSpacing' in g) g.letterSpacing = '0px';
    g.fillStyle = '#b9ab95'; g.font = `500 26px ${SANS}`; g.fillText('Pick up the remote or open the tablet', 512, 360);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
  _effect(p, room) {
    const group = new THREE.Group(); group.name = p.key + '-fx'; room.group.add(group);
    const scatter = (n, u0, u1, d0, d1, y0, y1) => { const P = new Float32Array(n * 3), S = new Float32Array(n); for (let i = 0; i < n; i++) { const w = p.toWorld(u0 + Math.random() * (u1 - u0), d0 + Math.random() * (d1 - d0)); P.set([w.x, y0 + Math.random() * (y1 - y0), w.z], i * 3); S[i] = Math.random(); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('aS', new THREE.BufferAttribute(S, 1)); return g; };
    const add = (vs, col, g, fx) => { const m = pointsMat(vs, col); if (fx) fx(m); const P = new THREE.Points(g, m); P.frustumCulled = false; group.add(P); this.mats.push(m); return P; };
    const W2 = (p.z1 - p.z0) / 2 - 0.4, D = p.depth;
    if (p.theme === 'winter') add(SNOW_V, '#ffffff', scatter(260, -W2, W2, 1.5, D - 1, 0.6, p.ceil - 0.3), (m) => { m.uniforms.uH.value = p.ceil - 0.6; });
    if (p.theme === 'jungle') add(FLY_V, '#c8ff6a', scatter(70, -W2, W2, 1.5, D - 1, 0.5, 3.2));
    if (p.theme === 'space' || p.theme === 'drive') add(STAR_V, '#e8eeff', scatter(p.theme === 'drive' ? 900 : 420, -W2 - 0.2, W2 + 0.2, 0.5, D, p.ceil - 0.08, p.ceil - 0.02));
    if (p.theme === 'space') { const pm = new THREE.ShaderMaterial({ vertexShader: PLANET_V, fragmentShader: PLANET_F, uniforms: { uT: { value: 0 }, uA: { value: new THREE.Color(0.28, 0.16, 0.42) }, uB: { value: new THREE.Color(0.95, 0.62, 0.38) } } });
      const pl = new THREE.Mesh(new THREE.SphereGeometry(0.6, 32, 20), pm), w = p.toWorld(-3.4, 9.5); pl.position.set(w.x, p.ceil - 1.4, w.z); pl.name = 'pv-planet'; group.add(pl); this.mats.push(pm); this.fx.push(pl);
      const rg = new THREE.Mesh(new THREE.RingGeometry(0.82, 1.12, 48), new THREE.MeshBasicMaterial({ color: 0xc8b8ff, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false })); rg.rotation.x = -1.2; pl.add(rg); }
    if (p.theme === 'drive') {   // the moon over the lot, string lights from the lamp posts to the screen's towers
      const moon = new THREE.Mesh(new THREE.CircleGeometry(1.1, 40), new THREE.MeshBasicMaterial({ color: 0xf4ecd8, toneMapped: false })), w = p.toWorld(9, 22); moon.position.set(w.x, p.ceil - 0.05, w.z); moon.rotation.x = Math.PI / 2; group.add(moon);
      const bulbs = [], geo = new THREE.SphereGeometry(0.05, 10, 8), mat = new THREE.MeshBasicMaterial({ color: 0xffc47a, toneMapped: false });
      for (const [u0, d0, u1, d1] of [[-13, 7, -13, 24], [13, 7, 13, 24], [-13, 24, 13, 24], [-13, 7, 13, 7]]) { const a = p.toWorld(u0, d0), b = p.toWorld(u1, d1), n = Math.round(Math.hypot(b.x - a.x, b.z - a.z) / 0.8);
        for (let i = 0; i <= n; i++) { const t = i / n; bulbs.push([a.x + (b.x - a.x) * t, 5.6 - 0.9 * Math.sin(Math.PI * t), a.z + (b.z - a.z) * t]); } }
      const im = new THREE.InstancedMesh(geo, mat, bulbs.length), M4 = new THREE.Matrix4(); bulbs.forEach((q, i) => { M4.makeTranslation(q[0], q[1], q[2]); im.setMatrixAt(i, M4); }); im.name = 'pv-bulbs'; group.add(im); }
  }
  // the remote on a side table near the front row (or on the coffee table)
  _remote(h) { const p = h.p, spot = { home: [0, 3.9, 0.49], jungle: [3.15, 5.4, 0.85], winter: [0, 5.75, 0.85], space: [1.05, 5.4, 0.85], drive: [0, 10.6, 0.85] }[p.theme], w = p.toWorld(spot[0], spot[1]);
    const r = makeRemote({ flat: true }); r.visible = false; r.position.set(w.x, spot[2] + 0.003, w.z); r.rotation.y = faceYaw(p) + 0.4; r.name = 'pv-remote'; h.room.group.add(r); this.remotes[p.id] = { m: r, at: { x: w.x, y: spot[2] + 0.02, z: w.z }, h }; }
  // ---------------------------------------------------------------- the lift cars
  _pod(roomKey, x, z, yaw, dir) {
    const room = this.world.rooms[roomKey], grp = new THREE.Group(); grp.position.set(x, 0, z); grp.rotation.y = yaw; grp.updateMatrixWorld(true); grp.name = 'pv-lift-' + roomKey; room.group.add(grp);
    const bake = (acc) => { const g = toGeometry(acc); g.applyMatrix4(grp.matrixWorld); room.lights.bake(g); g.applyMatrix4(grp.matrixWorld.clone().invert()); return new THREE.Mesh(g, this.world.mats.litFor(room.U, g)); };
    grp.add(bake(podShell()));
    const glow = new THREE.Mesh(new THREE.RingGeometry(POD_R - 0.4, POD_R - 0.3, 48), new THREE.MeshBasicMaterial({ color: 0xffd6a0, toneMapped: false })); glow.rotation.x = Math.PI / 2; glow.position.y = POD_H - 0.006; grp.add(glow);
    const fl = new THREE.Mesh(new THREE.RingGeometry(POD_R + 0.35, POD_R + 0.45, 64, 1, -(Math.PI - GAP - 0.25), 2 * (Math.PI - GAP - 0.25)), new THREE.MeshBasicMaterial({ color: 0xffc070, toneMapped: false })); fl.rotation.x = -Math.PI / 2; fl.rotation.z = Math.PI / 2; fl.position.y = 0.008; grp.add(fl);   // a lit ring on the floor round the car (open in front of its doors)
    { const c2 = makeCanvas(512, 128), g2 = c2.getContext('2d'); g2.fillStyle = '#050505'; g2.fillRect(0, 0, 512, 128); g2.fillStyle = '#ffb347'; g2.font = `600 52px ${SANS}`; g2.textAlign = 'center'; g2.textBaseline = 'middle'; g2.__fit = [12, 500]; g2.fillText(dir === 'up' ? '\u25B2  PRIVATE FLOOR' : '\u25BC  LOBBY', 256, 66); g2.__fit = null;
      const t2 = new THREE.CanvasTexture(c2); t2.colorSpace = THREE.SRGBColorSpace; const ind = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.2), new THREE.MeshBasicMaterial({ map: t2, toneMapped: false })); ind.position.set(0, POD_H - 0.32, -1.15); grp.add(ind);
      const bz = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.26, 0.06), new THREE.MeshBasicMaterial({ color: 0x0b0a0a })); bz.position.set(0, POD_H - 0.32, -1.185); grp.add(bz); }   // a display in a black bezel set into the back wall (a flat panel's ends would sink into the curve)   // inside, on the back wall: where this car goes
    for (const sg of [-1, 1]) { const ang = sg * (GAP + 0.09), r = POD_R + 0.046, st = new THREE.Mesh(new THREE.PlaneGeometry(0.05, POD_H - 0.1), new THREE.MeshBasicMaterial({ color: 0xffc98a, toneMapped: false }));
      st.position.set(r * Math.sin(ang), POD_H / 2, r * Math.cos(ang)); st.rotation.y = ang; grp.add(st); }   // 6 mm off the bronze, facing out
    const leaves = [-1, 1].map((s) => { const m = bake(leafGeo()); const piv = new THREE.Group(); piv.add(m); m.rotation.y = s > 0 ? 0 : -GAP; grp.add(piv); return { piv, s }; });
    // the sign over the doors, outside: where the car goes
    const c = makeCanvas(512, 96), g = c.getContext('2d'); g.fillStyle = '#0b0a0a'; g.fillRect(0, 0, 512, 96); g.fillStyle = '#e8c27a'; g.font = `500 44px ${SERIF}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    if ('letterSpacing' in g) g.letterSpacing = '8px'; g.__fit = [16, 496]; g.fillText(dir === 'up' ? 'PRIVATE SCREENS' : 'LOBBY', 256, 50); g.__fit = null;
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.375), new THREE.MeshBasicMaterial({ map: tx, toneMapped: false })); sign.position.set(0, POD_H + 0.32, POD_R + 0.125); grp.add(sign);   // 1 cm in front of its board
    const post = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.44, 0.06), new THREE.MeshBasicMaterial({ color: 0x2a1d12 })); post.position.set(0, POD_H + 0.32, POD_R + 0.085); grp.add(post);
    // walls: the shell's arc (outside it, a thick ring of segments) and the doors' chord while they are shut
    const W = this.world.walls, i0 = W.S.length / 6, wp = (a) => { const r = POD_R + 0.1; const lx = r * Math.sin(a), lz = r * Math.cos(a); return [x + lx * Math.cos(yaw) + lz * Math.sin(yaw), z - lx * Math.sin(yaw) + lz * Math.cos(yaw)]; };
    for (let k = 0; k < 12; k++) { const a = GAP + (Math.PI * 2 - 2 * GAP) * k / 12, b = GAP + (Math.PI * 2 - 2 * GAP) * (k + 1) / 12, [ax, az] = wp(a), [bx, bz] = wp(b); W.add(ax, az, bx, bz, -0.1, POD_H + 0.2, 1); }
    const d0 = W.S.length / 6; { const [ax, az] = wp(-GAP), [bx, bz] = wp(GAP); W.add(ax, az, bx, bz, -0.1, POD_H + 0.2, 1); } const d1 = W.S.length / 6;
    const pod = { roomKey, room, x, z, yaw, dir, grp, leaves, open: 0, target: 0, i0, d0, d1, ys: [W.S[6 * d0 + 4], W.S[6 * d0 + 5]] }; return pod;
  }
  _podDoor(pod, on) { const W = this.world.walls; if (on) { W.S[6 * pod.d0 + 4] = pod.ys[0]; W.S[6 * pod.d0 + 5] = pod.ys[1]; } else W.off(pod.d0, pod.d1); }
  podAt(x, z, r = POD_R - 0.15) { return this.pods.find((q) => Math.hypot(x - q.x, z - q.z) < r) || null; }
  // where a point in one car is in the other (same place and heading relative to the car)
  _transfer(a, b, x, z, yaw) { const dx = x - a.x, dz = z - a.z, dy = b.yaw - a.yaw, c = Math.cos(dy), s = Math.sin(dy); return { x: b.x + dx * c + dz * s, z: b.z - dx * s + dz * c, yaw: yaw + dy }; }
  startRide(player, sound) { const a = this.podAt(player.x, player.z); if (!a || this.ride) return false; const b = this.pods.find((q) => q !== a); this.ride = { a, b, t: 0, moved: false }; a.target = 0; sound && sound.liftBeep && sound.liftBeep(); return true; }
  // ---------------------------------------------------------------- renting
  isRented(id) { return !!this.rented[id]; }
  price(id) { return PV_PRICE[id]; }
  rent(id, pay, keep = false) { if (this.rented[id]) return true; if (pay && !pay(PV_PRICE[id])) return false; this.rented[id] = true; this._doors(); if (keep) this._save(); return true; }
  _doors() { for (const [id, d] of Object.entries(this.doors)) d.locked = !this.rented[id]; for (const [id, R] of Object.entries(this.remotes || {})) R.m.visible = !!this.rented[id] && !R.m.userData.away; }   // a remote only in a rented room
  setMode(story) { this.rented = {}; if (story) for (const k of this._load()) this.rented[k] = true; this._doors(); }
  _day() { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  _load() { try { const o = JSON.parse(localStorage.getItem('lumiere.pv.v1') || 'null'); return o && o.day === this._day() && Array.isArray(o.keys) ? o.keys.filter((k) => typeof k === 'string' && PV_PRICE[k]) : []; } catch (e) { return []; } }
  _save() { try { localStorage.setItem('lumiere.pv.v1', JSON.stringify({ day: this._day(), keys: Object.keys(this.rented).filter((k) => this.rented[k]) })); } catch (e) { /* storage off */ } }
  byKey(k) { return this.halls.find((h) => h.key === k) || null; }
  mine(k) { const h = this.byKey(k); return h && this.rented[h.p.id] ? h : null; }
  // where the phone puts you: in the room by its door, facing the picture
  entry(h) { const p = h.p, w = p.toWorld(0, p.depth - 1.6); return { x: w.x, z: w.z, yaw: faceYaw(p) + Math.PI, y: 0 }; }
  // ---------------------------------------------------------------- what the crosshair offers here
  prompt(room, player, lookAt, t, quick, name) {
    if (this.ride) return { label: null };
    const pod = this.podAt(player.x, player.z); if (pod && pod.roomKey === room) return { label: t(pod.dir === 'up' ? 'pv.rideUp' : 'pv.rideDown'), fn: () => this.o.onRide && this.o.onRide() };
    if (room === 'vip') for (const p of PRIVATE) { const d = this.doors[p.id]; if (!d || this.rented[p.id]) continue; if (Math.hypot(player.x - d.x, player.z - d.z) > 3.2 || !lookAt(d.x, 1.4, d.z, 1.3, 3.2)) continue;
      return { label: quick ? t('pv.open', { name: name(p) }) : t('pv.rent', { name: name(p), price: p.price.toLocaleString() }), fn: () => this.o.onRent && this.o.onRent(p.id) }; }
    const h = this.mine(room); if (h) { const R = this.remotes[h.p.id]; if (R && R.m.visible && lookAt(R.at.x, R.at.y, R.at.z, 0.3, 2.2)) return { label: t('vip.remote'), fn: () => this.o.onRemote && this.o.onRemote(R) }; }
    return null;
  }
  update(dt, player, sound) {
    this.t += dt; const E = this.engine, cam = E.camera; E.renderer.getDrawingBufferSize(this._v2 || (this._v2 = new THREE.Vector2())); const uS = this._v2.y / (2 * Math.tan(cam.fov * Math.PI / 360));   // px per metre at 1 m
    for (const m of this.mats) if (m.uniforms) { if (m.uniforms.uT) m.uniforms.uT.value = this.t; if (m.uniforms.uS) m.uniforms.uS.value = uS; } for (const pl of this.fx) pl.rotation.y += dt * 0.15;
    for (const pod of this.pods) {
      if (!this.ride || (this.ride.a !== pod && this.ride.b !== pod)) { const dx = player.x - pod.x, dz = player.z - pod.z, fz = dx * Math.sin(pod.yaw) + dz * Math.cos(pod.yaw), d = Math.hypot(dx, dz); pod.target = d < POD_R - 0.1 || (d < 3.2 && fz > 0.4) ? 1 : 0; }
      pod.open += (pod.target - pod.open) * (1 - Math.exp(-dt * (pod.target ? 4 : 3))); const e = pod.open * pod.open * (3 - 2 * pod.open);
      for (const L of pod.leaves) L.piv.rotation.y = L.s * e * (GAP + 0.12); this._podDoor(pod, pod.open < 0.75);
    }
    const R = this.ride; if (!R) return;
    R.t += dt; if (R.t > 1.2 && !R.moved && R.a.open < 0.05) { R.moved = true; const q = this._transfer(R.a, R.b, player.x, player.z, player.yaw); q.yaw = R.b.yaw + Math.PI; /* you step out facing the doors */ R.b.open = 0; R.b.target = 0; this.o.onArrive && this.o.onArrive(q, R.b); R.t2 = 0; sound && sound.liftHum && sound.liftHum(); }
    if (R.moved) { R.t2 += dt; if (R.t2 > 2.4) { sound && sound.liftBeep && sound.liftBeep(); R.b.target = 1; this.ride = null; } }
  }
}
