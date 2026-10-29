// Painted faces for the cast: one 256x256 cell per character in a 3x3 atlas. The people shader projects a cell onto the front of the
// head in the character's own (bind-pose) space: u = (x + 8 cm) / 16 cm, v = (y - 152 cm) / 20 cm, in the 176 cm template the models are sculpted in.
import * as THREE from 'three';
import { makeCanvas } from './textures.js';
export const FACE_IDS = ['receptionist', 'usher', 'bartender', 'patron-m1', 'patron-m2', 'patron-f1', 'patron-f2', 'patron-f3', 'patron-m3'];
const F = {
  receptionist: { f: 1, eye: '#4a2e1a', lips: '#b0404a', hair: '#1c130f', style: 'bob', liner: 1 },
  usher: { f: 0, eye: '#2a1a10', lips: '#9a5a4a', hair: '#1d1511', style: 'short' },
  bartender: { f: 0, eye: '#3b2a1c', lips: '#a06456', hair: '#14100e', style: 'slick', tache: 1 },
  'patron-m1': { f: 0, eye: '#3c5a78', lips: '#a8705e', hair: '#2a1d14', style: 'short', stubble: 1 },
  'patron-m2': { f: 0, eye: '#5a4a2a', lips: '#b07a66', hair: '#3a2414', style: 'short' },
  'patron-f1': { f: 1, eye: '#3a2414', lips: '#9a2a36', hair: '#241710', style: 'long', liner: 1 },
  'patron-f2': { f: 1, eye: '#4a6a3a', lips: '#b24e58', hair: '#5a2c16', style: 'bob' },
  'patron-f3': { f: 1, eye: '#1e140c', lips: '#8a2e36', hair: '#14100e', style: 'bun', liner: 1 },
  'patron-m3': { f: 0, eye: '#5a5a5a', lips: '#a87868', hair: '#cfcac0', style: 'short', tache: 1, old: 1 },
};
export function faceAtlas() {
  const C = 256, c = makeCanvas(C * 3, C * 3), g = c.getContext('2d');
  FACE_IDS.forEach((id, i) => { g.save(); g.translate((i % 3) * C, Math.floor(i / 3) * C); g.beginPath(); g.rect(0, 0, C, C); g.clip(); paint(g, C, F[id]); g.restore(); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 2; return t;
}
function paint(g, C, p) {
  const X = (x) => (x + 8) * (C / 16), Y = (y) => (172 - y) * (C / 20), S = C / 16, SY = C / 20;   // template cm -> cell px (16 cm wide, 20 cm tall)
  const ell = (x, y, rx, ry, col, a = 1, rot = 0) => { g.globalAlpha = a; g.fillStyle = col; g.beginPath(); g.ellipse(X(x), Y(y), rx * S, ry * SY, rot, 0, 7); g.fill(); g.globalAlpha = 1; };
  const soft = (x, y, r, col, a) => { const gr = g.createRadialGradient(X(x), Y(y), 0, X(x), Y(y), r * S); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.globalAlpha = a; g.fillStyle = gr; g.fillRect(X(x) - r * S, Y(y) - r * S, 2 * r * S, 2 * r * S); g.globalAlpha = 1; };
  const line = (pts, w, col, a = 1) => { g.globalAlpha = a; g.strokeStyle = col; g.lineWidth = w * S; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); pts.forEach(([x, y], k) => (k ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y)))); g.stroke(); g.globalAlpha = 1; };
  // cheeks, nose and jaw shading (subtle, so the sculpt reads as a face under flat-ish lighting)
  soft(4.4, 161.4, 2.2, p.f ? '#e07a70' : '#c07a62', p.f ? 0.22 : 0.1); soft(-4.4, 161.4, 2.2, p.f ? '#e07a70' : '#c07a62', p.f ? 0.22 : 0.1);
  for (const s of [-1, 1]) { soft(s * 1.15, 162.4, 0.9, '#6a3a26', 0.10); soft(s * 0.75, 160.3, 0.55, '#3a1a12', 0.35); }
  soft(0, 161.4, 0.9, '#ffffff', 0.12);
  if (p.stubble) { g.globalAlpha = 0.16; g.fillStyle = '#3a3440'; g.beginPath(); g.ellipse(X(0), Y(155.4), 4.6 * S, 3.2 * SY, 0, 0, 7); g.fill(); g.globalAlpha = 1; }
  if (p.old) for (const s of [-1, 1]) { line([[s * 1.6, 158.6], [s * 2.4, 160.4], [s * 2.6, 161.8]], 0.16, '#4a2a1c', 0.25); line([[s * 5.0, 165.6], [s * 5.7, 165.0]], 0.12, '#4a2a1c', 0.3); line([[-2.4, 169.4], [2.4, 169.4]], 0.12, '#4a2a1c', 0.18); }
  // lips
  const lc = p.lips, mw = p.f ? 2.25 : 2.1; g.globalAlpha = p.f ? 0.95 : 0.6; g.fillStyle = lc; g.beginPath();
  g.moveTo(X(-mw), Y(157.45)); g.quadraticCurveTo(X(-1.0), Y(158.35), X(-0.3), Y(158.05)); g.quadraticCurveTo(X(0), Y(157.9), X(0.3), Y(158.05)); g.quadraticCurveTo(X(1.0), Y(158.35), X(mw), Y(157.45));
  g.quadraticCurveTo(X(0.8), Y(156.3), X(0), Y(156.35)); g.quadraticCurveTo(X(-0.8), Y(156.3), X(-mw), Y(157.45)); g.fill(); g.globalAlpha = 1;
  line([[-mw * 0.92, 157.45], [-0.6, 157.32], [0.6, 157.32], [mw * 0.92, 157.45]], 0.16, '#3a1214', 0.7); soft(0.5, 156.75, 0.6, '#ffffff', p.f ? 0.18 : 0.08);
  if (p.tache) { g.fillStyle = p.hair; g.beginPath(); g.moveTo(X(-2.3), Y(158.2)); g.quadraticCurveTo(X(0), Y(159.6), X(2.3), Y(158.2)); g.quadraticCurveTo(X(0), Y(158.8), X(-2.3), Y(158.2)); g.fill(); }
  // eyes: sclera, iris, pupil, catch-light, lids, lashes
  for (const s of [-1, 1]) { const ex = s * 3.6, ey = 165.2;
    g.save(); g.beginPath(); g.moveTo(X(ex - 1.45), Y(ey)); g.quadraticCurveTo(X(ex), Y(ey + 1.05), X(ex + 1.45), Y(ey)); g.quadraticCurveTo(X(ex), Y(ey - 0.85), X(ex - 1.45), Y(ey)); g.closePath(); g.fillStyle = '#f2ede4'; g.fill(); g.clip();
    ell(ex + s * 0.05, ey + 0.05, 0.62, 0.62, p.eye); ell(ex + s * 0.05, ey + 0.05, 0.28, 0.28, '#0a0606'); ell(ex + s * 0.05 - 0.22, ey + 0.28, 0.13, 0.13, '#ffffff', 0.9);
    g.globalAlpha = 0.35; g.fillStyle = '#5a3a2a'; g.fillRect(X(ex - 1.6), Y(ey + 1.1), 3.2 * S, 0.35 * SY); g.globalAlpha = 1; g.restore();
    line([[ex - 1.5, ey - 0.02], [ex - 0.6, ey + 0.82], [ex + 0.5, ey + 0.86], [ex + 1.5, ey + 0.05]], p.f ? 0.3 : 0.22, '#1a0e0a', 0.95);
    if (p.liner) line([[ex + s * 1.45, ey + 0.08], [ex + s * 1.95, ey + 0.45]], 0.22, '#1a0e0a', 0.9);
    line([[ex - 1.2, ey - 0.45], [ex, ey - 0.78], [ex + 1.2, ey - 0.45]], 0.12, '#4a2a1c', 0.35);
    line([[ex - 1.6, ey + 1.5], [ex - 0.4, ey + 1.62], [ex + 1.3, ey + 1.4]], 0.18, '#7a4a3a', 0.18);
    const bw = p.f ? 0.32 : 0.5; line([[s * 1.35, 167.5], [s * 2.9, 168.25], [s * 4.6, 168.3], [s * 5.7, 167.7]], bw, p.style === 'short' && p.old ? '#8a8478' : p.hair, p.f ? 0.85 : 0.9); }
  // hairline / fringe in the hair colour
  g.fillStyle = p.hair; g.beginPath();
  if (p.style === 'bob') { g.moveTo(X(-8), Y(152)); g.lineTo(X(-6.7), Y(152)); g.quadraticCurveTo(X(-7.0), Y(161), X(-6.2), Y(165.6)); g.quadraticCurveTo(X(-3.6), Y(167.6), X(0), Y(167.0)); g.quadraticCurveTo(X(3.6), Y(167.6), X(6.2), Y(165.6)); g.quadraticCurveTo(X(7.0), Y(161), X(6.7), Y(152)); g.lineTo(X(8), Y(152)); g.lineTo(X(8), Y(172)); g.lineTo(X(-8), Y(172)); }
  else if (p.style === 'long') { g.moveTo(X(-8), Y(152)); g.lineTo(X(-6.3), Y(152)); g.quadraticCurveTo(X(-6.6), Y(163), X(-4.5), Y(169.6)); g.quadraticCurveTo(X(0), Y(171.4), X(4.5), Y(169.6)); g.quadraticCurveTo(X(6.6), Y(163), X(6.3), Y(152)); g.lineTo(X(8), Y(152)); g.lineTo(X(8), Y(172)); g.lineTo(X(-8), Y(172)); }
  else { const top = p.style === 'slick' ? 170.9 : p.style === 'bun' ? 170.4 : 170.2; g.moveTo(X(-8), Y(164)); g.lineTo(X(-7.0), Y(164)); g.quadraticCurveTo(X(-6.6), Y(top - 0.6), X(-4.6), Y(top)); g.quadraticCurveTo(X(0), Y(top + 0.9), X(4.6), Y(top)); g.quadraticCurveTo(X(6.6), Y(top - 0.6), X(7.0), Y(164)); g.lineTo(X(8), Y(164)); g.lineTo(X(8), Y(172)); g.lineTo(X(-8), Y(172)); }
  g.closePath(); g.fill();
  // strands: fine light/dark lines combed down from the crown so hair reads as hair, not paint
  g.save(); g.clip(); g.beginPath(); g.rect(X(-6.4), 0, 12.8 * S, C); g.clip(); for (let k = 0; k < 70; k++) { const x0 = -8 + k * 16 / 70, wob = Math.sin(k * 2.3) * 0.5; g.globalAlpha = 0.18 + 0.12 * Math.sin(k * 7.1) ** 2; g.strokeStyle = k % 3 ? '#000000' : '#ffffff'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(X(x0 * 0.6), Y(172)); g.quadraticCurveTo(X(x0 * 0.85 + wob), Y(166), X(x0), Y(152)); g.stroke(); } g.restore(); g.globalAlpha = 1;
}
