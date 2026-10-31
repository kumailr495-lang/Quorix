// LUMIERE v5 - expressive face atlas (friendly stylised faces, no painted realism). 4 x 4 cells of 128 px.
// Shader rows count from the bottom: rows 3 and 2 hold eyes (+brows), rows 1 and 0 hold mouths. uEyes / uMouth pick a cell.
import * as THREE from 'three';
import { makeCanvas } from './textures.js';
export const EYES = { open: [0, 3], blink: [1, 3], happy: [2, 3], wide: [3, 3], squint: [0, 2], sad: [1, 2], annoyed: [2, 2], scared: [3, 2] };
export const MOUTH = { smile: [0, 1], neutral: [1, 1], talk: [2, 1], scream: [3, 1], laugh: [0, 0], frown: [1, 0], smirk: [2, 0], ooh: [3, 0] };
// expression presets -> [eyes, mouth]
export const EXPR = { neutral: ['open', 'neutral'], smile: ['open', 'smile'], happy: ['happy', 'smile'], talk: ['open', 'talk'], laugh: ['squint', 'laugh'], scream: ['scared', 'scream'], gasp: ['wide', 'ooh'], wow: ['wide', 'smile'],
  sad: ['sad', 'frown'], annoyed: ['annoyed', 'smirk'], smirk: ['open', 'smirk'], shush: ['annoyed', 'ooh'], cheer: ['happy', 'laugh'], aww: ['sad', 'smile'], focus: ['open', 'neutral'] };
let atlas = null;
export function faceAtlas() {
  if (atlas) return atlas;
  const S = 128, c = makeCanvas(S * 4, S * 4), g = c.getContext('2d'); g.clearRect(0, 0, S * 4, S * 4);
  const cell = (col, row, f) => { g.save(); g.translate(col * S, (3 - row) * S); g.beginPath(); g.rect(0, 0, S, S); g.clip(); f(g, S); g.restore(); };
  const ink = '#2a1d18', Y = (fy) => (1 - fy) * S;   // fy: 0 = chin, 1 = top of the face region
  const eyePair = (draw) => { for (const s of [-1, 1]) { g.save(); g.translate(S / 2 + s * S * 0.19, Y(0.6)); g.scale(s * 1.45, 1.45); draw(g); g.restore(); } };
  const brow = (g2, lift = 0, tilt = 0) => { g2.strokeStyle = ink; g2.lineWidth = S * 0.032; g2.lineCap = 'round'; g2.beginPath(); g2.moveTo(-S * 0.07, -S * (0.13 + lift) + tilt * S * 0.03); g2.quadraticCurveTo(0, -S * (0.16 + lift), S * 0.07, -S * (0.13 + lift) - tilt * S * 0.03); g2.stroke(); };
  const eye = (g2, h = 1, pupil = 0.045) => { g2.fillStyle = '#ffffff'; g2.beginPath(); g2.ellipse(0, 0, S * 0.065, S * 0.075 * h, 0, 0, 7); g2.fill(); if (h > 0.25) { g2.fillStyle = '#3a2a22'; g2.beginPath(); g2.ellipse(S * 0.004, S * 0.006, S * pupil, S * Math.min(pupil, 0.06 * h), 0, 0, 7); g2.fill(); g2.fillStyle = '#fff'; g2.beginPath(); g2.arc(S * 0.018, -S * 0.015, S * 0.014, 0, 7); g2.fill(); } g2.strokeStyle = ink; g2.lineWidth = S * 0.02; g2.beginPath(); g2.ellipse(0, 0, S * 0.065, S * 0.075 * h, 0, Math.PI * 1.05, Math.PI * 1.95); g2.stroke(); };
  const arc = (g2, w, bend, lw = 0.03) => { g2.strokeStyle = ink; g2.lineWidth = S * lw; g2.lineCap = 'round'; g2.beginPath(); g2.moveTo(-S * w, 0); g2.quadraticCurveTo(0, S * bend, S * w, 0); g2.stroke(); };
  // eyes
  cell(0, 3, () => eyePair((e) => { eye(e); brow(e); }));
  cell(1, 3, () => eyePair((e) => { arc(e, 0.06, 0.012, 0.028); brow(e, -0.01); }));
  cell(2, 3, () => eyePair((e) => { e.translate(0, S * 0.01); arc(e, 0.06, -0.06, 0.03); brow(e, 0.02); }));
  cell(3, 3, () => eyePair((e) => { eye(e, 1.25, 0.032); brow(e, 0.05); }));
  cell(0, 2, () => eyePair((e) => { arc(e, 0.065, -0.045, 0.034); brow(e, 0.0, 0.5); }));
  cell(1, 2, () => eyePair((e) => { eye(e, 0.85); brow(e, 0.02, -1.4); }));
  cell(2, 2, () => eyePair((e) => { eye(e, 0.55); brow(e, -0.02, 1.2); }));
  cell(3, 2, () => eyePair((e) => { eye(e, 1.3, 0.025); brow(e, 0.07, -1.0); }));
  // mouths (centre at fy 0.28)
  const mouth = (col, row, f) => cell(col, row, (g2) => { g2.save(); g2.translate(S / 2, Y(0.26)); g2.scale(1.5, 1.5); f(g2); g2.restore(); });
  const open = (g2, w, h, tongue = true) => { g2.fillStyle = '#5a1f22'; g2.beginPath(); g2.ellipse(0, 0, S * w, S * h, 0, 0, 7); g2.fill(); if (tongue) { g2.fillStyle = '#d4646a'; g2.beginPath(); g2.ellipse(0, S * h * 0.45, S * w * 0.6, S * h * 0.4, 0, 0, 7); g2.fill(); } g2.fillStyle = '#fff'; g2.fillRect(-S * w * 0.6, -S * h * 0.92, S * w * 1.2, S * h * 0.3); };
  mouth(0, 1, (m) => arc(m, 0.1, 0.06));
  mouth(1, 1, (m) => arc(m, 0.07, 0.008));
  mouth(2, 1, (m) => open(m, 0.06, 0.045));
  mouth(3, 1, (m) => open(m, 0.075, 0.11));
  mouth(0, 0, (m) => { m.fillStyle = '#5a1f22'; m.beginPath(); m.moveTo(-S * 0.11, -S * 0.02); m.quadraticCurveTo(0, S * 0.14, S * 0.11, -S * 0.02); m.closePath(); m.fill(); m.fillStyle = '#fff'; m.fillRect(-S * 0.08, -S * 0.015, S * 0.16, S * 0.03); });
  mouth(1, 0, (m) => arc(m, 0.07, -0.04));
  mouth(2, 0, (m) => { m.rotate(-0.15); arc(m, 0.075, 0.03); });
  mouth(3, 0, (m) => open(m, 0.035, 0.04, false));
  // soft cheeks on every mouth cell (reads as friendly at a distance)
  for (const [col, row] of [[0, 1], [0, 0]]) cell(col, row, (g2) => { g2.fillStyle = 'rgba(235,110,110,0.18)'; for (const s of [-1, 1]) { g2.beginPath(); g2.ellipse(S / 2 + s * S * 0.22, Y(0.42), S * 0.06, S * 0.035, 0, 0, 7); g2.fill(); } });
  atlas = new THREE.CanvasTexture(c); atlas.colorSpace = THREE.SRGBColorSpace; atlas.generateMipmaps = true; atlas.minFilter = THREE.LinearMipmapLinearFilter; atlas.anisotropy = 2; return atlas;
}
