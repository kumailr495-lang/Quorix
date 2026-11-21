// LUMIERE v12 - leaves (the user: the trees looked bad, blobs). The tree models' crowns are cards (tools/blender/decor12.py _cards) mapped
// onto this atlas: a 2 x 2 grid of leaf clusters drawn here once, on a transparent ground. Row 0: broad leaves (the street trees),
// row 1: narrow silver olive leaves. Each cluster is twigs with leaves along them, darker inside and lighter at the tips, so the crown
// reads as layered foliage at midnight; the shader (materials.js foliageMat) cuts at alpha 0.5 and draws both faces.
import * as THREE from 'three';

function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }

function leaf(g, x, y, len, wid, ang, col, rib) {
  g.save(); g.translate(x, y); g.rotate(ang); g.fillStyle = col; g.beginPath(); g.moveTo(0, 0);
  g.bezierCurveTo(wid, len * 0.25, wid * 0.9, len * 0.75, 0, len); g.bezierCurveTo(-wid * 0.9, len * 0.75, -wid, len * 0.25, 0, 0); g.fill();
  if (rib) { g.strokeStyle = rib; g.lineWidth = Math.max(0.6, wid * 0.12); g.beginPath(); g.moveTo(0, len * 0.05); g.lineTo(0, len * 0.9); g.stroke(); }
  g.restore();
}

function cluster(g, cx, cy, S, R, olive) {
  // twigs from near the cell's centre outwards, leaves along each; drawn back (dark) to front (light)
  const twigs = olive ? 9 : 7;
  for (let pass = 0; pass < 3; pass++) {
    for (let t = 0; t < twigs; t++) {
      const a = (t / twigs) * Math.PI * 2 + R() * 0.6, L = S * (0.32 + R() * 0.14), x0 = cx + Math.cos(a) * S * 0.04, y0 = cy + Math.sin(a) * S * 0.04;
      if (pass === 0) { g.strokeStyle = olive ? 'rgba(70,60,48,0.9)' : 'rgba(58,44,30,0.9)'; g.lineWidth = S * 0.008; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x0 + Math.cos(a + 0.3) * L * 0.5, y0 + Math.sin(a + 0.3) * L * 0.5, x0 + Math.cos(a) * L, y0 + Math.sin(a) * L); g.stroke(); }
      const n = olive ? 16 : 9;
      for (let i = 0; i < n; i++) {
        const k = (i + 1) / (n + 1), px = x0 + Math.cos(a) * L * k, py = y0 + Math.sin(a) * L * k, side = i % 2 ? 1 : -1, la = a + side * (olive ? 0.55 : 0.75) + (R() - 0.5) * 0.5 - Math.PI / 2;
        const shade = [0.55, 0.78, 1.0][pass] * (0.8 + R() * 0.3) * (0.75 + 0.35 * k);
        const base = olive ? [96, 112, 84] : [52, 86, 38], col = `rgb(${Math.min(255, base[0] * shade) | 0},${Math.min(255, base[1] * shade) | 0},${Math.min(255, base[2] * shade) | 0})`;
        const len = S * (olive ? 0.085 + R() * 0.03 : 0.1 + R() * 0.045), wid = len * (olive ? 0.16 : 0.42);
        if (R() < (pass === 2 ? 0.55 : 0.85)) leaf(g, px, py, len, wid, la, col, olive ? null : 'rgba(120,150,80,0.45)');
      }
    }
  }
}

export function leafAtlas(size = 512) {
  const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'), h = size / 2, R = rng(4711);
  g.clearRect(0, 0, size, size);
  for (let cy = 0; cy < 2; cy++) for (let cx = 0; cx < 2; cx++) { g.save(); g.beginPath(); g.rect(cx * h, cy * h, h, h); g.clip(); cluster(g, cx * h + h / 2, cy * h + h / 2, h, R, cy === 1); g.restore(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.flipY = false; t.anisotropy = 4; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; return t;
}
