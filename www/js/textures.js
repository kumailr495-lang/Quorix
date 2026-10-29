// LUMIERE v5 - textures drawn in code (nothing is downloaded): signs, posters, menu boards, the street, the idle screen slate.
import * as THREE from 'three';
export const makeCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
export const SANS = 'Inter, "Noto Sans", system-ui, sans-serif', SERIF = 'Cormorant, Georgia, serif';
const tex = (c, srgb = true) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 2; return t; };
// single-line sign: transparent background, clean sans by default
export function signTexture(text, w = 512, h = 128, o = {}) {
  const c = makeCanvas(w, h), g = c.getContext('2d'); if (o.bg) { g.fillStyle = o.bg; g.fillRect(0, 0, w, h); }
  g.fillStyle = o.color || '#ffffff'; g.textAlign = o.align || 'center'; g.textBaseline = 'middle';
  g.font = `${o.weight || 500} ${Math.round(h * (o.size || 0.55))}px ${o.font === 'serif' ? SERIF : SANS}`; if ('letterSpacing' in g) g.letterSpacing = `${Math.round(h * (o.size || 0.55) * (o.spacing || 0))}px`;
  if (o.glow) { g.shadowColor = o.glow; g.shadowBlur = h * 0.18; }
  g.fillText(text, o.align === 'left' ? h * 0.2 : w / 2, h / 2 + 1); return tex(c);
}
// neon tube lettering: a wide coloured halo, the tube in the colour, a hot near-white core (transparent background, shown emissive)
export function neonTexture(text, color = '#ff4d6d', w = 1024, h = 192, o = {}) {
  const c = makeCanvas(w, h), g = c.getContext('2d'), fs = Math.round(h * (o.size || 0.5)); g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `${o.weight || 600} ${fs}px ${o.font === 'serif' ? SERIF : SANS}`; if ('letterSpacing' in g) g.letterSpacing = `${Math.round(fs * (o.spacing ?? 0.08))}px`;
  const x = w / 2, y = h / 2 + 2; g.lineJoin = 'round';
  g.shadowColor = color; g.shadowBlur = h * 0.22; g.strokeStyle = color; g.lineWidth = fs * 0.09; g.strokeText(text, x, y); g.strokeText(text, x, y);
  g.shadowBlur = h * 0.06; g.lineWidth = fs * 0.05; g.strokeStyle = shade(color, 0.25); g.strokeText(text, x, y);
  g.shadowBlur = 0; g.lineWidth = fs * 0.018; g.strokeStyle = '#fff6ee'; g.strokeText(text, x, y);
  return tex(c);
}
// the programme: three house films + the posters around the building (minimal modern key art, one bold shape each)
export const FILMS = [
  { id: 'night', t: 'The Long Night', genre: 'thriller', mins: 118, a: '#0f1a2e', b: '#e8483b', ink: '#ffffff', shape: 'moon', tag: 'One city. One night. No way out.' },
  { id: 'velvet', t: 'Velvet Hour', genre: 'romance', mins: 104, a: '#2a0f22', b: '#ff8fa3', ink: '#fff3f5', shape: 'sun', tag: 'Some summers never end.' },
  { id: 'quiet', t: 'A Quiet Room', genre: 'horror', mins: 97, a: '#0b0d0c', b: '#9bd27a', ink: '#e9f2e4', shape: 'door', tag: 'Don’t open it. Don’t even breathe.' },
  { id: 'orbit', t: 'Orbit Nine', genre: 'sci-fi', mins: 131, a: '#081428', b: '#56c2ff', ink: '#e8f6ff', shape: 'ring', tag: 'Coming soon' },
  { id: 'paper', t: 'Paper Kings', genre: 'comedy', mins: 92, a: '#fff2d6', b: '#ff6b35', ink: '#2a1b10', shape: 'crown', tag: 'Coming soon' },
  { id: 'tide', t: 'Low Tide', genre: 'drama', mins: 110, a: '#0e2a2c', b: '#f2c46d', ink: '#f8f1e2', shape: 'wave', tag: 'Coming soon' },
];
export function posterCanvas(f, w = 256, h = 384) {
  const c = makeCanvas(w, h), g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, f.a); gr.addColorStop(1, shade(f.a, -0.35)); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.save(); g.translate(w / 2, h * 0.38); g.fillStyle = f.b; g.strokeStyle = f.b; g.lineWidth = w * 0.035;
  if (f.shape === 'moon') { g.beginPath(); g.arc(0, 0, w * 0.26, 0, 7); g.fill(); g.fillStyle = f.a; g.beginPath(); g.arc(w * 0.1, -w * 0.05, w * 0.23, 0, 7); g.fill(); for (let i = 0; i < 9; i++) { g.fillStyle = shade(f.a, 0.15); const bw = w * 0.07, bh = w * (0.15 + (i * 37 % 10) / 22); g.fillRect(-w * 0.45 + i * w * 0.1, h * 0.25 - bh, bw, bh); } }
  else if (f.shape === 'sun') { const s = g.createRadialGradient(0, 0, 2, 0, 0, w * 0.3); s.addColorStop(0, '#fff1d0'); s.addColorStop(0.4, f.b); s.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = s; g.beginPath(); g.arc(0, 0, w * 0.32, 0, 7); g.fill(); g.fillStyle = shade(f.a, 0.08); g.fillRect(-w / 2, w * 0.12, w, h); }
  else if (f.shape === 'door') { g.fillStyle = '#000'; g.fillRect(-w * 0.16, -w * 0.3, w * 0.32, w * 0.55); g.fillStyle = f.b; g.globalAlpha = 0.85; g.fillRect(-w * 0.012, -w * 0.3, w * 0.024, w * 0.55); g.globalAlpha = 0.25; g.beginPath(); g.moveTo(-w * 0.012, w * 0.25); g.lineTo(w * 0.012, w * 0.25); g.lineTo(w * 0.2, w * 0.6); g.lineTo(-w * 0.2, w * 0.6); g.fill(); g.globalAlpha = 1; }
  else if (f.shape === 'ring') { g.beginPath(); g.ellipse(0, 0, w * 0.34, w * 0.1, -0.35, 0, 7); g.stroke(); g.fillStyle = '#e8f6ff'; g.beginPath(); g.arc(0, 0, w * 0.12, 0, 7); g.fill(); }
  else if (f.shape === 'crown') { g.beginPath(); g.moveTo(-w * 0.25, w * 0.12); g.lineTo(-w * 0.25, -w * 0.12); g.lineTo(-w * 0.12, 0); g.lineTo(0, -w * 0.18); g.lineTo(w * 0.12, 0); g.lineTo(w * 0.25, -w * 0.12); g.lineTo(w * 0.25, w * 0.12); g.closePath(); g.fill(); }
  else if (f.shape === 'wave') { for (let k = 0; k < 4; k++) { g.beginPath(); for (let x = -w / 2; x <= w / 2; x += 4) { const y = k * w * 0.07 + Math.sin(x * 0.05 + k) * w * 0.03; x === -w / 2 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke(); } }
  g.restore();
  g.fillStyle = f.ink; g.textAlign = 'center'; g.font = `700 ${Math.round(w * 0.105)}px ${SANS}`; if ('letterSpacing' in g) g.letterSpacing = `${Math.round(w * 0.006)}px`;
  wrap(g, f.t.toUpperCase(), w / 2, h * 0.75, w * 0.86, w * 0.115);
  g.font = `400 ${Math.round(w * 0.042)}px ${SANS}`; g.globalAlpha = 0.75; g.fillText(f.tag, w / 2, h * 0.93); g.globalAlpha = 1;
  g.font = `600 ${Math.round(w * 0.036)}px ${SANS}`; if ('letterSpacing' in g) g.letterSpacing = `${Math.round(w * 0.012)}px`; g.fillStyle = f.b; g.fillText('LUMIÈRE', w / 2, h * 0.07);
  return c;
}
export const posterTexture = (f) => tex(posterCanvas(f));
function wrap(g, text, x, y, maxW, lh) { const words = text.split(' '), lines = ['']; for (const wd of words) { const t = (lines[lines.length - 1] + ' ' + wd).trim(); if (g.measureText(t).width > maxW && lines[lines.length - 1]) lines.push(wd); else lines[lines.length - 1] = t; } lines.forEach((l, i) => g.fillText(l, x, y + (i - (lines.length - 1) / 2) * lh)); }
export function shade(hex, k) { const c = new THREE.Color(hex); const hsl = {}; c.getHSL(hsl); c.setHSL(hsl.h, hsl.s, Math.max(0, Math.min(1, hsl.l + k))); return '#' + c.getHexString(); }
// concession menu screens: three panels (combos, popcorn, drinks), dark background, big prices
export function menuTexture(kind) {
  const w = 512, h = 288, c = makeCanvas(w, h), g = c.getContext('2d'); const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#16161b'); bg.addColorStop(1, '#0c0c10'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
  const acc = { combos: '#ff4d5a', popcorn: '#ffb547', drinks: '#4cc3ff' }[kind]; g.fillStyle = acc; g.fillRect(0, 0, w, 6);
  g.fillStyle = '#fff'; g.font = `700 34px ${SANS}`; g.textAlign = 'left'; g.fillText({ combos: 'COMBOS', popcorn: 'POPCORN', drinks: 'DRINKS' }[kind], 28, 54);
  const rows = { combos: [['Duo · 2 popcorn + 2 drinks', '14'], ['Solo · popcorn + drink', '8'], ['Family bucket', '19']], popcorn: [['Salted · S / M / L', '4 · 5 · 6'], ['Caramel · S / M / L', '5 · 6 · 7'], ['Cheese drizzle', '+1']], drinks: [['Cola · Lemon · Orange', '3'], ['Iced tea', '3'], ['Water', '2']] }[kind];
  g.font = `400 22px ${SANS}`; rows.forEach(([a, b], i) => { const y = 112 + i * 56; g.fillStyle = 'rgba(255,255,255,.9)'; g.fillText(a, 28, y); g.textAlign = 'right'; g.fillStyle = acc; g.font = `700 24px ${SANS}`; g.fillText(b, w - 28, y); g.textAlign = 'left'; g.font = `400 22px ${SANS}`; g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(28, y + 18, w - 56, 1); });
  // a bucket illustration on the popcorn board
  if (kind === 'popcorn') { g.save(); g.translate(w - 90, 48); g.fillStyle = '#ff4d5a'; g.beginPath(); g.moveTo(-26, -10); g.lineTo(26, -10); g.lineTo(18, 34); g.lineTo(-18, 34); g.fill(); g.fillStyle = '#fff'; for (let i = -1; i <= 1; i += 2) g.fillRect(i * 9 - 3, -10, 6, 44); g.fillStyle = '#ffe9b0'; for (let i = 0; i < 7; i++) { g.beginPath(); g.arc(-22 + i * 7.5, -12 - (i % 2) * 5, 7, 0, 7); g.fill(); } g.restore(); }
  return tex(c);
}
// building facades across the street: lit windows on dark masonry (repeating)
export function facadeTexture(seed = 1, hue = 30) {
  const w = 256, h = 256, c = makeCanvas(w, h), g = c.getContext('2d'); let s = seed * 9301 + 49297; const R = () => (s = (s * 16807) % 2147483647) / 2147483647;
  g.fillStyle = `hsl(${hue},10%,${9 + R() * 5}%)`; g.fillRect(0, 0, w, h);
  for (let y = 10; y < h; y += 32) for (let x = 8; x < w; x += 28) { const on = R() < 0.3; g.fillStyle = on ? `hsl(${32 + R() * 22},${55 + R() * 25}%,${42 + R() * 22}%)` : `hsl(215,18%,${10 + R() * 6}%)`; g.fillRect(x, y, 16, 20); }
  const t = tex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
// shop front / sign strip at street level across the road
export function shopTexture(name, a, b) { const w = 512, h = 128, c = makeCanvas(w, h), g = c.getContext('2d'); g.fillStyle = a; g.fillRect(0, 0, w, h); g.fillStyle = b; g.fillRect(0, h - 10, w, 10); g.fillStyle = '#fff'; g.font = `700 52px ${SANS}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(name, w / 2, h / 2 - 4); return tex(c); }
// idle screen slate (house lights up, nothing booked): soft gradient, logo, screen name
export function slateTexture(name = '', w = 640, h = 340) {
  const c = makeCanvas(w, h), g = c.getContext('2d'), gr = g.createRadialGradient(w / 2, h * 0.5, 10, w / 2, h * 0.5, w * 0.7); gr.addColorStop(0, '#1e2230'); gr.addColorStop(1, '#07080b'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.textAlign = 'center'; g.fillStyle = '#ffffff'; g.font = `600 ${Math.round(h * 0.13)}px ${SANS}`; if ('letterSpacing' in g) g.letterSpacing = `${Math.round(h * 0.03)}px`; g.fillText('LUMIÈRE', w / 2, h * 0.5);
  g.font = `500 ${Math.round(h * 0.045)}px ${SANS}`; g.fillStyle = '#ff4d5a'; if ('letterSpacing' in g) g.letterSpacing = `${Math.round(h * 0.015)}px`; g.fillText(name, w / 2, h * 0.62);
  return tex(c);
}
