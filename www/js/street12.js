// LUMIERE v12 - the street's dressing (the user: "don't treat the street area like a side kick, people mostly judge from outside").
// tools/blender/arch/street12.py builds the far side of the road as real buildings and hands back two lists in the room's extras:
//   atlas  self-lit textured quads (window interiors, shop back walls, shop signs, blade signs, billboards, road stencils)
//   halos  soft glows round lamps and neon
// Here: one picture atlas drawn on a canvas (original artwork, no photographs, no brands) and one mesh for every quad (one draw), the
// halos as one mesh of camera-facing quads (one draw), a night sky with a moon, stars, cloud and a skyline (one draw), and what moves:
// the chase of bulbs round the cinema's blade sign (v14d: smooth, and no neon flicker: the user read it as the app flickering).
import * as THREE from 'three';
import { G, COMMON_FRAG } from './materials.js';

const AW = 2048, AH = 2048, SW = 334, SH = 238, SERIF = "'Cormorant Garamond', 'Times New Roman', serif", SANS = "Inter, 'Helvetica Neue', Arial, sans-serif";
const SHOPS = ['books', 'cafe', 'florist', 'records', 'ramen', 'chemist', 'pixel', 'hotel', 'bakery', 'diner', 'jazz', 'gallery'];
// where each picture lives in the atlas (pixels: x, y, w, h)
const CELL = {};
// a shop's back wall is drawn in a 334 x 238 design space and stored at 506 x 360: you can walk up to the glass (at 334 px it was a blur)
SHOPS.forEach((k, i) => { CELL['shop:' + k] = [(i % 4) * 510 + 2, Math.floor(i / 4) * 364 + 2, 506, 360]; CELL['sign:' + k] = [(i % 4) * 510 + 2, 1096 + Math.floor(i / 4) * 68, 506, 64]; });
for (let i = 0; i < 8; i++) CELL['win:' + i] = [310 + i * 114, 1304, 110, 150];
Object.assign(CELL, { 'blade:lumiere': [2, 1304, 150, 710], 'blade:hotel': [158, 1304, 120, 662], 'blade:cross': [1600, 1446, 100, 100],
  'road:zebra': [310, 1460, 124, 154], 'road:taxi': [440, 1460, 420, 126], 'bulbs:row': [870, 1600, 256, 32], 'blocks:glass': [1140, 1650, 160, 310] });

// ------------------------------------------------------------------ small drawing helpers
function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
const rr = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
const glowDot = (g, x, y, r, col) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); };
const wallFill = (g, w, h, top, bot) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, top); gr.addColorStop(1, bot); g.fillStyle = gr; g.fillRect(0, 0, w, h); };
// v12 (the user, 11-18: the glow on the street's names "looks so bad", make them simple): lettering is drawn flat, one colour, no blur and no
// white core; the signs are lit letters on dark fascias, not neon
const neon = (g, text, x, y, font, col) => { g.font = font; g.fillStyle = col; g.fillText(text, x, y); };
function shelves(g, x, y, w, h, n, wood, item, R) {
  const sh = h / n;
  for (let i = 0; i < n; i++) { const yy = y + (i + 1) * sh; g.fillStyle = wood; g.fillRect(x, yy - 3, w, 4); let xx = x + 3; while (xx < x + w - 6) { const iw = item(g, xx, yy - 3, sh - 8, R); xx += iw + 1 + R() * 2; } }
  g.fillStyle = wood; g.fillRect(x - 3, y, 4, h); g.fillRect(x + w - 1, y, 4, h);
}
const book = (cols) => (g, x, y, h, R) => { const w = 3 + R() * 5, bh = h * (0.6 + R() * 0.38); g.fillStyle = cols[Math.floor(R() * cols.length)]; g.fillRect(x, y - bh, w, bh); if (R() < 0.3) { g.fillStyle = 'rgba(255,220,150,0.5)'; g.fillRect(x, y - bh * 0.7, w, 1.5); } return w; };
const jar = (cols) => (g, x, y, h, R) => { const w = 8 + R() * 7, bh = h * (0.4 + R() * 0.4); g.fillStyle = cols[Math.floor(R() * cols.length)]; rr(g, x, y - bh, w, bh, 2); g.fill(); return w + 3; };

// ------------------------------------------------------------------ the pictures (each draws in its own cell, origin at the cell's corner)
const SHOP_DRAW = {
  books: (g, w, h, R) => { wallFill(g, w, h, '#7a5636', '#4a3220'); shelves(g, 8, 6, w - 16, h - 22, 6, '#3a2616', book(['#8c2f2a', '#2f5d8c', '#c9a35e', '#3d6b4a', '#6b3d6b', '#d8cdb8', '#1e2c4a', '#a8552a']), R); glowDot(g, w * 0.3, 0, 90, 'rgba(255,214,150,0.5)'); glowDot(g, w * 0.72, 0, 90, 'rgba(255,214,150,0.5)'); },
  cafe: (g, w, h, R) => { wallFill(g, w, h, '#4a3c30', '#2a211a'); g.fillStyle = '#16191a'; rr(g, w * 0.08, h * 0.1, w * 0.42, h * 0.42, 4); g.fill(); g.fillStyle = '#e8e2d2'; g.font = `600 13px ${SANS}`; g.fillText('TODAY', w * 0.11, h * 0.2);
    for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(232,226,210,0.75)'; g.fillRect(w * 0.11, h * (0.25 + i * 0.04), w * (0.18 + R() * 0.14), 2); g.fillRect(w * 0.42, h * (0.25 + i * 0.04), w * 0.05, 2); }
    shelves(g, w * 0.56, h * 0.12, w * 0.38, h * 0.42, 3, '#6a4a30', jar(['#e8e0d0', '#c9a35e', '#7a4a2a', '#2a2a2e']), R);
    for (const x of [0.2, 0.5, 0.8]) { g.strokeStyle = '#111'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(w * x, 0); g.lineTo(w * x, h * 0.07); g.stroke(); glowDot(g, w * x, h * 0.09, 46, 'rgba(255,196,120,0.85)'); } },
  florist: (g, w, h, R) => { wallFill(g, w, h, '#2e3a32', '#1c241f');   // v12 (11-18): a dim green room, not a white wall of blobs
    const pot = (gg, x, y, hh, RR) => { const pw = 12 + RR() * 8; gg.fillStyle = ['#8a6a4a', '#d8d2c6', '#2a2a2e'][Math.floor(RR() * 3)]; gg.fillRect(x, y - hh * 0.35, pw, hh * 0.35);
      gg.fillStyle = ['#3d5a38', '#4a6a40', '#2f4a30'][Math.floor(RR() * 3)]; gg.beginPath(); gg.ellipse(x + pw / 2, y - hh * 0.5, pw * 0.62, hh * 0.24, 0, 0, 7); gg.fill(); return pw + 6; };
    shelves(g, w * 0.06, h * 0.12, w * 0.88, h * 0.5, 2, '#5a4632', pot, R);
    for (let i = 0; i < 7; i++) { const x = w * (0.08 + i * 0.13), y = h * 0.8; g.fillStyle = '#6a6e72'; g.fillRect(x, y, 20, h * 0.2);
      g.fillStyle = '#34502e'; g.fillRect(x + 4, y - 18, 12, 18); g.fillStyle = ['#a8323e', '#e8e0d2', '#c87a86', '#d8a040'][i % 4]; g.beginPath(); g.ellipse(x + 10, y - 20, 13, 7, 0, 0, 7); g.fill(); }
    glowDot(g, w * 0.5, 0, 120, 'rgba(255,236,200,0.25)'); },
  records: (g, w, h, R) => { wallFill(g, w, h, '#2a2036', '#16101e'); const cols = ['#d24a3a', '#e8c040', '#3a8ad2', '#e8e8e8', '#9a4ad2', '#40c0a0', '#f07a2a', '#1a1a1e'];
    for (let j = 0; j < 4; j++) for (let i = 0; i < 9; i++) { const x = 10 + i * (w - 20) / 9, y = 12 + j * (h - 60) / 4, s = (w - 20) / 9 - 6; g.fillStyle = cols[Math.floor(R() * cols.length)]; g.fillRect(x, y, s, s); g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.arc(x + s / 2, y + s / 2, s * (0.2 + R() * 0.15), 0, 7); g.fill(); }
    g.shadowColor = '#b070ff'; g.shadowBlur = 14; g.strokeStyle = '#d0a8ff'; g.lineWidth = 3; g.beginPath(); g.moveTo(8, h - 34); g.lineTo(w - 8, h - 34); g.stroke(); g.shadowBlur = 0; },
  ramen: (g, w, h, R) => { wallFill(g, w, h, '#4a2418', '#1e0e0a'); g.fillStyle = '#f2c98a'; rr(g, w * 0.2, h * 0.3, w * 0.6, h * 0.34, 3); g.fill(); glowDot(g, w * 0.5, h * 0.47, 150, 'rgba(255,190,110,0.55)');
    for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? '#8a1a1a' : '#16161a'; g.fillRect(w * (0.2 + i * 0.1), h * 0.22, w * 0.095, h * 0.16); g.fillStyle = '#f0e6d0'; g.font = `700 15px ${SANS}`; g.fillText(['麺', '湯', '夜', '味', '火', '一'][i], w * (0.223 + i * 0.1), h * 0.34); }
    for (let i = 0; i < 8; i++) { g.fillStyle = '#e8dcc0'; g.fillRect(w * 0.05 + (i % 2) * (w * 0.84), h * (0.12 + Math.floor(i / 2) * 0.17), w * 0.06, h * 0.13); }
    for (const x of [0.12, 0.88]) { glowDot(g, w * x, h * 0.1, 40, 'rgba(255,80,50,0.9)'); g.fillStyle = '#d83a2a'; g.beginPath(); g.ellipse(w * x, h * 0.1, 12, 16, 0, 0, 7); g.fill(); } },
  chemist: (g, w, h, R) => { wallFill(g, w, h, '#f4f7f8', '#dfe5e8'); shelves(g, 8, 8, w - 16, h - 30, 5, '#c8d0d4', jar(['#2a8a5a', '#3a7ad2', '#ffffff', '#e8eef2', '#d24a4a', '#8ad2b0']), R);
    g.fillStyle = '#18a860'; g.fillRect(w * 0.47, h * 0.36, w * 0.06, h * 0.26); g.fillRect(w * 0.4, h * 0.44, w * 0.2, h * 0.1); },
  pixel: (g, w, h, R) => { wallFill(g, w, h, '#16181e', '#0c0d11'); for (let i = 0; i < 4; i++) { const x = w * (0.05 + i * 0.235), gr = g.createLinearGradient(x, 0, x + w * 0.2, h * 0.5); const hue = [210, 280, 190, 330][i];
      gr.addColorStop(0, `hsl(${hue},80%,60%)`); gr.addColorStop(1, `hsl(${hue + 40},70%,28%)`); g.fillStyle = gr; rr(g, x, h * 0.14, w * 0.2, h * 0.46, 5); g.fill(); g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillRect(x + 6, h * 0.5, w * 0.08, 3); }
    g.shadowColor = '#58b0ff'; g.shadowBlur = 12; g.fillStyle = '#9fd0ff'; g.fillRect(0, h * 0.06, w, 3); g.fillRect(0, h * 0.7, w, 3); g.shadowBlur = 0; },
  hotel: (g, w, h, R) => { wallFill(g, w, h, '#3a2e26', '#201814'); for (let i = 0; i < 7; i++) { g.strokeStyle = 'rgba(201,163,94,0.55)'; g.lineWidth = 1.5; g.strokeRect(w * (0.03 + i * 0.137), h * 0.08, w * 0.12, h * 0.72); }
    g.fillStyle = '#1e2c4a'; g.fillRect(w * 0.38, h * 0.16, w * 0.24, h * 0.36); g.strokeStyle = '#c9a35e'; g.lineWidth = 4; g.strokeRect(w * 0.38, h * 0.16, w * 0.24, h * 0.36); glowDot(g, w * 0.5, h * 0.3, 40, 'rgba(255,200,120,0.5)');
    for (const x of [0.2, 0.8]) { glowDot(g, w * x, h * 0.26, 60, 'rgba(255,205,140,0.9)'); g.fillStyle = '#ffe6b8'; g.fillRect(w * x - 4, h * 0.2, 8, 22); } },
  bakery: (g, w, h, R) => { wallFill(g, w, h, '#f4ead6', '#d8c8a8'); const loaf = (gg, x, y, hh) => { const lw = 16 + R() * 14; gg.fillStyle = ['#c88a48', '#b06a30', '#d8a868', '#9a5a28'][Math.floor(R() * 4)]; gg.beginPath(); gg.ellipse(x + lw / 2, y - 7, lw / 2, 7 + R() * 3, 0, 0, 7); gg.fill(); return lw + 4; };
    shelves(g, w * 0.04, h * 0.3, w * 0.56, h * 0.5, 4, '#8a6238', loaf, R); g.fillStyle = '#1c2220'; rr(g, w * 0.66, h * 0.12, w * 0.28, h * 0.5, 4); g.fill(); g.fillStyle = '#efe6d0'; g.font = `italic 600 15px ${SERIF}`; g.fillText('fresh daily', w * 0.69, h * 0.24);
    for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(239,230,208,0.7)'; g.fillRect(w * 0.69, h * (0.3 + i * 0.045), w * (0.1 + R() * 0.1), 2); } glowDot(g, w * 0.3, 0, 120, 'rgba(255,220,160,0.5)'); },
  // the all-night diner: mint tiles over a chequered dado, menu boards, the pass to the kitchen, pies under glass
  diner: (g, w, h, R) => { wallFill(g, w, h, '#cfe0d8', '#a8c0b6'); const ts = 9; for (let y = 0; y < h * 0.62; y += ts) for (let x = 0; x < w; x += ts) { g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 0.6; g.strokeRect(x, y, ts, ts); }
    for (let y = 0; y < 3; y++) for (let x = 0; x < w / 10 + 1; x++) { g.fillStyle = (x + y) % 2 ? '#16181a' : '#eef2ee'; g.fillRect(x * 10, h * 0.62 + y * 10, 10, 10); }
    g.fillStyle = '#7a8a84'; g.fillRect(0, h * 0.62 + 30, w, h);
    for (let i = 0; i < 3; i++) { const x = w * (0.05 + i * 0.2); g.fillStyle = '#15191a'; rr(g, x, h * 0.07, w * 0.17, h * 0.26, 3); g.fill(); g.fillStyle = '#ffd98a'; g.font = `700 9px ${SANS}`; g.fillText(['BURGERS', 'PIES', 'SHAKES'][i], x + 6, h * 0.07 + 13);
      for (let k = 0; k < 5; k++) { g.fillStyle = 'rgba(238,242,238,0.8)'; g.fillRect(x + 6, h * 0.07 + 20 + k * 8, w * (0.07 + R() * 0.05), 1.6); g.fillRect(x + w * 0.14, h * 0.07 + 20 + k * 8, 8, 1.6); } }
    g.fillStyle = '#2a2420'; rr(g, w * 0.66, h * 0.12, w * 0.29, h * 0.3, 3); g.fill(); glowDot(g, w * 0.8, h * 0.27, 70, 'rgba(255,170,90,0.75)'); g.fillStyle = '#c8ccd0'; g.fillRect(w * 0.65, h * 0.42, w * 0.31, 4);
    for (let i = 0; i < 4; i++) { const x = w * (0.1 + i * 0.13); g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(x, h * 0.52, 15, 13, 0, Math.PI, 0); g.fill(); g.fillStyle = ['#c88a48', '#d24a3a', '#e8d8a8', '#8a4a2a'][i]; g.beginPath(); g.ellipse(x, h * 0.53, 12, 5, 0, 0, 7); g.fill(); g.fillStyle = '#c8ccd0'; g.fillRect(x - 15, h * 0.54, 30, 2); }
    g.textAlign = 'center'; neon(g, 'OPEN 24 HRS', w * 0.5, h * 0.5, `700 15px ${SANS}`, '#ff5a6a', 9); g.textAlign = 'left'; },
  // the jazz room: a small stage against indigo drapes, a piano and a bass in outline, footlights
  jazz: (g, w, h, R) => { wallFill(g, w, h, '#1a1640', '#0c0a1e'); for (let x = 0; x < w; x += 7) { g.fillStyle = `rgba(${40 + R() * 30},${30 + R() * 25},${110 + R() * 50},0.35)`; g.fillRect(x, 0, 3.5, h); }
    for (const sx of [0, 1]) { g.fillStyle = '#5a1420'; g.beginPath(); g.moveTo(sx ? w : 0, 0); g.lineTo(sx ? w * 0.84 : w * 0.16, 0); g.quadraticCurveTo(sx ? w * 0.9 : w * 0.1, h * 0.5, sx ? w * 0.93 : w * 0.07, h); g.lineTo(sx ? w : 0, h); g.fill(); }
    const sp = g.createLinearGradient(0, 0, 0, h * 0.8); sp.addColorStop(0, 'rgba(255,214,150,0.55)'); sp.addColorStop(1, 'rgba(255,214,150,0)'); g.fillStyle = sp; g.beginPath(); g.moveTo(w * 0.44, 0); g.lineTo(w * 0.56, 0); g.lineTo(w * 0.74, h * 0.8); g.lineTo(w * 0.26, h * 0.8); g.fill();
    g.fillStyle = '#0a0810'; g.fillRect(w * 0.14, h * 0.78, w * 0.72, h * 0.22); g.fillStyle = '#08070c'; g.beginPath(); g.moveTo(w * 0.24, h * 0.78); g.lineTo(w * 0.24, h * 0.56); g.quadraticCurveTo(w * 0.33, h * 0.5, w * 0.43, h * 0.58); g.lineTo(w * 0.43, h * 0.78); g.fill(); g.fillRect(w * 0.26, h * 0.5, 2, h * 0.08);
    g.beginPath(); g.ellipse(w * 0.66, h * 0.62, 13, 21, 0, 0, 7); g.fill(); g.fillRect(w * 0.656, h * 0.33, 4, h * 0.3); g.beginPath(); g.arc(w * 0.662, h * 0.32, 5, 0, 7); g.fill();
    for (let i = 0; i < 9; i++) glowDot(g, w * (0.18 + i * 0.08), h * 0.785, 7, 'rgba(255,200,120,0.9)');
    g.textAlign = 'center'; neon(g, 'live tonight', w * 0.5, h * 0.2, `italic 600 19px ${SERIF}`, '#ff7ad0', 10); g.textAlign = 'left'; },
  // the gallery: white walls, five canvases under picture lights
  gallery: (g, w, h, R) => { wallFill(g, w, h, '#f2f0ea', '#d8d4ca'); const P = [['#c8402a', '#1e2c4a'], ['#e6b83c', '#2a2a2e'], ['#2f5d8c', '#e8e0d0'], ['#3d6b4a', '#d86a3a'], ['#16161a', '#c9a35e']];
    for (let i = 0; i < 5; i++) { const pw = w * (0.11 + (i % 2) * 0.04), ph = h * (0.36 + ((i + 1) % 2) * 0.1), x = w * (0.045 + i * 0.19), y = h * 0.24; glowDot(g, x + pw / 2, y - 6, pw * 0.9, 'rgba(255,240,210,0.55)');
      g.fillStyle = '#1a1a1c'; g.fillRect(x - 3, y - 3, pw + 6, ph + 6); g.fillStyle = P[i][0]; g.fillRect(x, y, pw, ph); g.fillStyle = P[i][1];
      if (i % 3 === 0) g.fillRect(x, y + ph * 0.55, pw, ph * 0.45); else if (i % 3 === 1) { g.beginPath(); g.arc(x + pw / 2, y + ph * 0.45, pw * 0.3, 0, 7); g.fill(); } else { g.beginPath(); g.moveTo(x, y + ph); g.lineTo(x + pw, y + ph * 0.3); g.lineTo(x + pw, y + ph); g.fill(); }
      g.fillStyle = '#2a2a2e'; g.fillRect(x + pw / 2 - 9, y - 12, 18, 3); g.fillStyle = 'rgba(40,40,44,0.7)'; g.fillRect(x + pw + 8, y + ph - 9, 12, 7); } g.fillStyle = '#b8b2a6'; g.fillRect(0, h * 0.93, w, h * 0.07); },
};
const SIGN_DRAW = {   // v12 (11-18): plain names in cream, bone or brass on the dark fascia; one quiet accent at most
  books: (g, w, h) => { g.fillStyle = '#e2cfa4'; g.font = `600 ${h * 0.52}px ${SERIF}`; g.textAlign = 'center'; g.fillText('PAGES & CO.', w / 2, h * 0.58); g.font = `500 ${h * 0.16}px ${SANS}`; g.fillStyle = '#a89470'; g.fillText('B O O K S E L L E R S', w / 2, h * 0.86); },
  cafe: (g, w, h) => { g.textAlign = 'center'; neon(g, 'Café Noir', w / 2, h * 0.7, `italic 600 ${h * 0.66}px ${SERIF}`, '#e8d2aa'); },
  florist: (g, w, h) => { g.textAlign = 'center'; if ('letterSpacing' in g) g.letterSpacing = `${h * 0.12}px`; neon(g, 'PETAL', w / 2, h * 0.6, `400 ${h * 0.5}px ${SANS}`, '#ece4d8'); if ('letterSpacing' in g) g.letterSpacing = '0px'; g.font = `500 ${h * 0.15}px ${SANS}`; g.fillStyle = '#a8a094'; g.fillText('FLOWERS  ·  PLANTS', w / 2, h * 0.88); },
  records: (g, w, h) => { g.textAlign = 'center'; neon(g, 'RECORD ROOM', w / 2, h * 0.68, `700 ${h * 0.5}px ${SANS}`, '#e8e4dc'); },
  ramen: (g, w, h) => { g.textAlign = 'center'; neon(g, 'MIDNIGHT RAMEN', w / 2, h * 0.68, `700 ${h * 0.46}px ${SANS}`, '#efe6d6'); g.fillStyle = '#b8402e'; g.fillRect(w * 0.44, h * 0.8, w * 0.12, h * 0.035); },
  chemist: (g, w, h) => { g.fillStyle = '#2f9a64'; g.fillRect(w * 0.06, h * 0.24, h * 0.16, h * 0.52); g.fillRect(w * 0.06 - h * 0.18, h * 0.42, h * 0.52, h * 0.16); g.textAlign = 'center'; g.fillStyle = '#eceee8'; g.font = `600 ${h * 0.46}px ${SANS}`; g.fillText('24 H  CHEMIST', w * 0.55, h * 0.66); },
  pixel: (g, w, h) => { g.textAlign = 'center'; g.fillStyle = '#eef0f2'; g.font = `700 ${h * 0.56}px ${SANS}`; g.fillText('PIXEL', w / 2, h * 0.6); g.font = `500 ${h * 0.15}px ${SANS}`; g.fillStyle = '#9aa4b0'; g.fillText('PHONES  ·  SOUND  ·  PLAY', w / 2, h * 0.9); },
  hotel: (g, w, h) => { g.textAlign = 'center'; g.fillStyle = '#e2cfa4'; g.font = `600 ${h * 0.52}px ${SERIF}`; if ('letterSpacing' in g) g.letterSpacing = `${h * 0.14}px`; g.fillText('HOTEL ASTOR', w / 2, h * 0.68); if ('letterSpacing' in g) g.letterSpacing = '0px'; },
  bakery: (g, w, h) => { g.textAlign = 'center'; g.fillStyle = '#efe4cc'; g.font = `italic 600 ${h * 0.58}px ${SERIF}`; g.fillText('Daily Bread', w / 2, h * 0.64); g.font = `500 ${h * 0.15}px ${SANS}`; g.fillStyle = '#b0a284'; g.fillText('B A K E R Y', w / 2, h * 0.9); },
  diner: (g, w, h) => { g.textAlign = 'center'; neon(g, 'ALL NIGHT DINER', w / 2, h * 0.68, `700 ${h * 0.5}px ${SANS}`, '#efe8e0'); g.fillStyle = '#b8323e'; g.fillRect(w * 0.42, h * 0.8, w * 0.16, h * 0.035); },
  jazz: (g, w, h) => { g.textAlign = 'center'; neon(g, 'Indigo Room', w * 0.42, h * 0.7, `italic 600 ${h * 0.66}px ${SERIF}`, '#e4dcf0'); g.font = `500 ${h * 0.17}px ${SANS}`; g.fillStyle = '#a8a0c0'; g.fillText('JAZZ  ·  SUPPER', w * 0.8, h * 0.62); },
  gallery: (g, w, h) => { g.textAlign = 'center'; g.fillStyle = '#ece8de'; g.font = `300 ${h * 0.46}px ${SANS}`; if ('letterSpacing' in g) g.letterSpacing = `${h * 0.22}px`; g.fillText('GALERIE NORD', w / 2, h * 0.66); if ('letterSpacing' in g) g.letterSpacing = '0px'; },
};
// eight windows of other people's evenings: each picture is the back wall of a room; street12.js ATLAS_FRAG (fx 4) puts it 3.6 m behind
// the glass and builds the side walls, floor and ceiling round it from its edges (interior mapping), with curtains, blinds or a sheer
// in the window plane and the glass's reflection over all of it
function winDraw(g, v, w, h, R) {
  const warm = ['#ffd08a', '#ffc070', '#ffe0a8'][v % 3];
  if (v === 4) { wallFill(g, w, h, '#2a4a78', '#101c34'); glowDot(g, w * 0.5, h * 0.7, w * 0.7, 'rgba(120,170,255,0.8)'); }
  else if (v === 2) { wallFill(g, w, h, '#e8f0f4', '#b8c8d0'); glowDot(g, w * 0.5, h * 0.2, w * 0.5, 'rgba(255,255,255,0.9)'); g.fillStyle = '#7a8a90'; g.fillRect(0, h * 0.62, w, h * 0.06); g.fillStyle = '#5a6a70'; g.fillRect(w * 0.1, h * 0.68, w * 0.8, h * 0.32); }
  else if (v === 7) { wallFill(g, w, h, '#8a6238', '#4a3220'); shelves(g, 4, 4, w - 8, h - 8, 5, '#2a1a0e', book(['#8c2f2a', '#2f5d8c', '#c9a35e', '#3d6b4a', '#d8cdb8']), R); }
  else { wallFill(g, w, h, warm, '#9a6a3a'); glowDot(g, w * (0.3 + R() * 0.4), h * 0.25, w * 0.6, 'rgba(255,236,190,0.9)'); }
  if (v === 3) { g.fillStyle = '#1e3a22'; for (let k = 0; k < 7; k++) { g.beginPath(); g.ellipse(w * 0.2 + (R() - 0.5) * 20, h * 0.75 - R() * 40, 5, 16, (R() - 0.5) * 1.6, 0, 7); g.fill(); } g.fillStyle = '#2a2018'; g.fillRect(w * 0.13, h * 0.8, w * 0.14, h * 0.2); g.fillStyle = '#2a1c10'; g.fillRect(w * 0.7, h * 0.4, 3, h * 0.6); g.beginPath(); g.moveTo(w * 0.6, h * 0.4); g.lineTo(w * 0.82, h * 0.4); g.lineTo(w * 0.76, h * 0.26); g.lineTo(w * 0.66, h * 0.26); g.fill(); }
  if (v === 6) { g.fillStyle = 'rgba(20,14,10,0.85)'; g.beginPath(); g.arc(w * 0.55, h * 0.5, w * 0.1, 0, 7); g.fill(); g.fillRect(w * 0.43, h * 0.58, w * 0.24, h * 0.42); }
}
function bladeDraw(g, k, w, h) {
  if (k === 'cross') { g.fillStyle = '#0c100e'; g.fillRect(0, 0, w, h); g.fillStyle = '#2f9a64'; g.fillRect(w * 0.38, h * 0.14, w * 0.24, h * 0.72); g.fillRect(w * 0.14, h * 0.38, w * 0.72, h * 0.24); return; }
  const lum = k === 'lumiere'; wallFill(g, w, h, lum ? '#0c1630' : '#141416', lum ? '#080e20' : '#0a0a0c');
  g.strokeStyle = lum ? '#c9a35e' : '#8a8a90'; g.lineWidth = 2; g.strokeRect(w * 0.1, w * 0.1, w * 0.8, h - w * 0.2);
  // the bulbs round the edge: the chase in the shader brightens them in a wave travelling up
  const nb = Math.round(h / (w * 0.115)), col = lum ? '#ffe2a8' : '#ffd0a0';
  if (lum) { for (let i = 0; i <= nb; i++) for (const x of [0.05, 0.95]) glowDot(g, w * x, w * 0.05 + i * (h - w * 0.1) / nb, w * 0.045, col);
    for (let i = 1; i < 8; i++) for (const y of [w * 0.05, h - w * 0.05]) glowDot(g, w * i / 8, y, w * 0.045, col); }   // v12 (11-18): only the cinema's own blade keeps its bulbs
  const word = lum ? 'LUMIÈRE' : 'HOTEL', n = word.length, y0 = h * (lum ? 0.14 : 0.2), dy = (h * (lum ? 0.78 : 0.62)) / n;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let i = 0; i < n; i++) neon(g, word[i], w / 2, y0 + (i + 0.5) * dy, `600 ${Math.min(dy * 0.86, w * 0.74)}px ${SERIF}`, lum ? '#ffcf8a' : '#e2cfa4');
  if (!lum) { g.fillStyle = '#a8946a'; g.fillRect(w * 0.3, h * 0.105, w * 0.4, 2); g.fillStyle = '#e2cfa4'; g.font = `600 ${w * 0.26}px ${SERIF}`; g.fillText('ASTOR', w / 2, h * 0.9); }
  else { g.fillStyle = '#c9a35e'; g.font = `600 ${w * 0.4}px ${SERIF}`; g.fillText('✦', w / 2, h * 0.075); g.font = `500 ${w * 0.13}px ${SANS}`; if ('letterSpacing' in g) g.letterSpacing = `${w * 0.03}px`; g.fillText('CINEMAS', w / 2, h * 0.955); if ('letterSpacing' in g) g.letterSpacing = '0px'; }
  g.textBaseline = 'alphabetic';
}
function roadDraw(g, k, w, h) {
  g.clearRect(0, 0, w, h);
  if (k === 'zebra') { g.fillStyle = '#e8e6de'; const n = 7; for (let i = 0; i < n; i++) g.fillRect(i * w / n + w / n * 0.2, 0, w / n * 0.6, h); }
  else { g.fillStyle = '#e6c84a'; g.textAlign = 'center'; g.font = `800 ${h * 0.9}px ${SANS}`; if ('letterSpacing' in g) g.letterSpacing = `${h * 0.2}px`; g.fillText('TAXI', w / 2 + h * 0.1, h * 0.84); if ('letterSpacing' in g) g.letterSpacing = '0px'; }
}
// v12 the marquee's chaser bulbs: eight warm bulbs on a dark brass rail (a quad is 0.96 x 0.12 m: 8 bulbs 12 cm apart)
function bulbsDraw(g, w, h) {
  g.fillStyle = '#1c150d'; g.fillRect(0, 0, w, h); g.fillStyle = '#3a2c18'; g.fillRect(0, h * 0.42, w, h * 0.16);
  for (let i = 0; i < 8; i++) { const x = (i + 0.5) * w / 8, y = h / 2; glowDot(g, x, y, h * 0.5, 'rgba(255,190,110,0.55)'); g.fillStyle = '#ffe9c0'; g.beginPath(); g.arc(x, y, h * 0.27, 0, 7); g.fill(); glowDot(g, x - h * 0.06, y - h * 0.06, h * 0.16, 'rgba(255,255,250,0.95)'); }
}
// v12 the cinema's wings (the user: "no design for the theatre outside, just a front"): glass-block windows lit from inside, five blocks
// across and ten up, each a soft amber square with a brighter heart in dark mortar
function blocksDraw(g, w, h) {
  g.fillStyle = '#2a2018'; g.fillRect(0, 0, w, h); const nx = 5, ny = 10, bw = w / nx, bh = h / ny;
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const x = i * bw + 2, y = j * bh + 2, ww = bw - 4, hh = bh - 4, gr = g.createRadialGradient(x + ww / 2, y + hh / 2, 1, x + ww / 2, y + hh / 2, ww * 0.75);
    const k = 0.82 + 0.18 * Math.sin(i * 1.7 + j * 0.9); gr.addColorStop(0, `rgba(255,${Math.round(214 * k)},${Math.round(150 * k)},1)`); gr.addColorStop(1, `rgba(${Math.round(190 * k)},${Math.round(130 * k)},70,1)`);
    g.fillStyle = gr; rr(g, x, y, ww, hh, 3); g.fill(); g.fillStyle = 'rgba(255,248,230,0.35)'; g.fillRect(x + 3, y + 3, ww * 0.35, 2); }
}
function drawAtlas(k = 1) {
  // k: the canvas's share of the design size (the low preset draws it at half: a quarter of the memory)
  const c = document.createElement('canvas'); c.width = AW * k; c.height = AH * k; const g = c.getContext('2d'); g.clearRect(0, 0, c.width, c.height); g.scale(k, k);
  const cell = (key, fn) => { const [x, y, w, h] = CELL[key]; g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.translate(x, y); g.__fit = [x, x + w]; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; fn(w, h); g.__fit = null; g.restore(); };
  SHOPS.forEach((k, i) => { cell('shop:' + k, (w, h) => { g.scale(w / SW, h / SH); SHOP_DRAW[k](g, SW, SH, rng(101 + i * 7)); }); cell('sign:' + k, (w, h) => { g.fillStyle = '#121316'; g.fillRect(0, 0, w, h); SIGN_DRAW[k](g, w, h); }); });
  for (let i = 0; i < 8; i++) cell('win:' + i, (w, h) => winDraw(g, i, w, h, rng(977 + i * 13)));
  for (const k of ['lumiere', 'hotel', 'cross']) cell('blade:' + k, (w, h) => bladeDraw(g, k, w, h));
  for (const k of ['zebra', 'taxi']) cell('road:' + k, (w, h) => roadDraw(g, k, w, h));
  cell('bulbs:row', (w, h) => bulbsDraw(g, w, h)); cell('blocks:glass', (w, h) => blocksDraw(g, w, h));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.flipY = false; return t;
}

// ------------------------------------------------------------------ one mesh for every atlas quad
const ATLAS_VERT = `attribute vec2 aL; attribute vec3 aE; attribute vec3 aT; attribute vec4 aW; attribute vec4 aR; varying vec2 vUv; varying vec2 vL; varying vec3 vE; varying vec3 vT; varying float vDist;
varying vec3 vV; varying vec2 vS; varying vec4 vR;
void main() { vUv = uv; vL = aL; vE = aE; vT = aT; vS = aW.xy; vR = aR; vec4 wp = modelMatrix * vec4(position, 1.0); vec3 V = wp.xyz - cameraPosition;
  vV = vec3(dot(V, vec3(aW.w, 0.0, -aW.z)), V.y, -dot(V, vec3(aW.z, 0.0, aW.w)));
  vec4 mv = viewMatrix * wp; vDist = -mv.z; gl_Position = projectionMatrix * mv; }`;
// v12 interior mapping for the windows (fx 4): the ray from the eye through the glass meets the room behind it (a box 0.9 m wider than
// the window each side, 0.95 m below the sill, 0.55 m over the head, 3.6 m deep); the back wall is the window's picture, the side walls,
// floor and ceiling take the picture's edge colours, darker towards the glass. textureGrad keeps the flat picture's mip level (the
// jumps at the room's corners would pick the smallest mip: seams)
const INTERIOR = `
vec3 interior(vec3 d, vec2 S, out float face) {
  vec3 o = vec3(vL * S, 0.0), lo = vec3(-0.9, -0.95, 0.0), hi = vec3(S.x + 0.9, S.y + 0.55, 3.6);
  vec3 tt = (mix(lo, hi, step(0.0, d)) - o) / d; float t = min(min(tt.x, tt.y), tt.z); vec3 h = o + d * t; vec3 l = (h - lo) / (hi - lo);
  vec2 gx = dFdx(vUv), gy = dFdy(vUv); vec2 uv; float k;
  if (t == tt.z) { uv = l.xy; k = 1.0; face = 0.0; }
  else if (t == tt.x) { uv = vec2(step(0.5, l.x) * 0.96 + 0.02, l.y); k = mix(0.42, 0.8, l.z); face = 1.0; }
  else { uv = vec2(l.x, step(0.5, l.y) * 0.96 + 0.02); k = l.y > 0.5 ? mix(0.5, 0.85, l.z) : mix(0.3, 0.6, l.z); face = 2.0; }
  return textureGrad(map, vR.xy + clamp(uv, 0.01, 0.99) * vR.zw, gx, gy).rgb * k;
}
vec3 nearLayer(vec3 col, float v, float e) {
  vec2 q = vL; float fold = 0.72 + 0.28 * sin(q.x * 70.0 + sin(q.y * 9.0) * 0.6) * (1.0 - clamp(fwidth(q.x * 70.0) * 0.6, 0.0, 1.0));
  if (v < 0.5 || abs(v - 6.0) < 0.5) { float cw = mix(0.1, 0.3, q.y); if (q.x < cw || q.x > 1.0 - cw) col = (v < 0.5 ? vec3(0.32, 0.05, 0.05) : vec3(0.06, 0.09, 0.2)) * fold * (0.35 + 0.65 * e); }
  else if (abs(v - 1.0) < 0.5) { float sl = q.y * 16.0, bl = mix(step(fract(sl), 0.45), 0.45, clamp(fwidth(sl) * 1.5, 0.0, 1.0)); col = mix(col, vec3(0.16, 0.09, 0.04) * (0.4 + 0.6 * e), 0.8 * bl); }
  else if (abs(v - 5.0) < 0.5) col = mix(col, vec3(0.55, 0.32, 0.15) * fold * (0.3 + 0.7 * e), 0.55);
  return col;
}`;
const ATLAS_FRAG = COMMON_FRAG + `uniform sampler2D map; uniform float uTime; varying vec2 vUv; varying vec2 vL; varying vec3 vE; varying vec3 vT; varying float vDist;
varying vec3 vV; varying vec2 vS; varying vec4 vR;` + INTERIOR + `
void main() {
  if (vE.y > 3.5) { vec3 d = normalize(vV); float face; vec3 room = interior(d, vS, face) * vT * vE.x; room = nearLayer(room, vE.z, vE.x);
    float fr = pow(1.0 - abs(d.z), 4.0); room += vec3(0.012, 0.016, 0.026) * (1.0 + 6.0 * fr);
    gl_FragColor = vec4(lumFog(lumTone(room), vDist), 1.0);
    #include <colorspace_fragment>
    return; }
  vec4 t = texture2D(map, vUv); if (t.a < 0.5 && vE.y < 2.5) discard; float e = vE.x;
  if (vE.y > 2.5) { float b = floor(vL.x * 8.0) + vE.z * 8.0; e *= 0.74 + 0.42 * pow(0.5 + 0.5 * cos(6.2832 * (b - uTime * 2.4) / 3.0), 2.0); }
  if (vE.y > 1.5 && vE.y < 2.5) { float edge = min(min(vL.x, 1.0 - vL.x) * 5.0, min(vL.y, 1.0 - vL.y) * 24.0); float f = vL.y * 9.0 - uTime * 1.3, wave = mix(0.8 + 0.4 * (0.5 + 0.5 * sin(6.2832 * f)), 1.0, clamp(fwidth(f) * 1.5, 0.0, 1.0)); e *= edge < 0.62 ? wave : 1.0; }
  vec3 col = t.rgb * vT * e; gl_FragColor = vec4(lumFog(lumTone(col), vDist), 1.0);
  #include <colorspace_fragment>
}`;
function atlasMesh(list, tex) {
  const P = [], UV = [], L = [], E = [], T = [], W = [], R = [], I = []; let n = 0; const c = new THREE.Color();
  for (const q of list) {
    const cell = CELL[q.k + ':' + q.v]; if (!cell) continue; const [cx, cy, cw, ch] = cell, hw = q.w / 2, hh = q.h / 2, s = Math.sin(q.yaw || 0), co = Math.cos(q.yaw || 0);
    // corners: a wall quad faces +z at yaw 0 (as the engine's panels); a flat one lies on the road, its picture's top to -z
    const at = q.flat ? (u, v) => [q.x + u * hw * co - v * hh * s, q.y, q.z - u * hw * s - v * hh * co] : (u, v) => [q.x + u * hw * co, q.y + v * hh, q.z - u * hw * s];
    const u0 = (cx + 1) / AW, u1 = (cx + cw - 1) / AW, v0 = (cy + 1) / AH, v1 = (cy + ch - 1) / AH; c.set(1, 1, 1); if (q.tint) c.setRGB(q.tint[0], q.tint[1], q.tint[2]);
    const fx = q.k === 'win' && !q.flat ? 4 : q.fx || 0, ez = fx === 4 ? +q.v : fx === 3 ? q.i || 0 : (n * 0.37) % 1;   // v12 windows: interior mapped
    for (const [u, v, tu, tv] of [[-1, -1, u0, v1], [1, -1, u1, v1], [1, 1, u1, v0], [-1, 1, u0, v0]]) { P.push(...at(u, v)); UV.push(tu, tv); L.push((u + 1) / 2, (v + 1) / 2); E.push(q.e ?? 1, fx, ez); T.push(c.r, c.g, c.b);
      W.push(q.w, q.h, s, co); R.push(u0, v1, u1 - u0, v0 - v1); }
    I.push(n * 4, n * 4 + 1, n * 4 + 2, n * 4, n * 4 + 2, n * 4 + 3); n++;
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); g.setAttribute('aL', new THREE.Float32BufferAttribute(L, 2));
  g.setAttribute('aE', new THREE.Float32BufferAttribute(E, 3)); g.setAttribute('aT', new THREE.Float32BufferAttribute(T, 3)); g.setAttribute('aW', new THREE.Float32BufferAttribute(W, 4)); g.setAttribute('aR', new THREE.Float32BufferAttribute(R, 4)); g.setIndex(I);
  const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ vertexShader: ATLAS_VERT, fragmentShader: ATLAS_FRAG, uniforms: { map: { value: tex }, uTime: G.uTime, uExposure: G.uExposure, uFogColor: G.uFogColor, uFogNear: G.uFogNear, uFogFar: G.uFogFar, uBright: G.uBright } }));
  m.name = 'street-atlas'; m.frustumCulled = false; return m;
}

// ------------------------------------------------------------------ halos: camera-facing soft glows (additive, no depth write)
const HALO_VERT = `attribute vec3 aC; attribute vec2 aQ; attribute vec3 aK; varying vec2 vQ; varying vec3 vK; varying float vDist;
void main() { vec4 mv = modelViewMatrix * vec4(aC, 1.0); vDist = -mv.z; float r = max(abs(aQ.x), abs(aQ.y)); vQ = r > 0.0 ? aQ / r : vec2(0.0); mv.xy += aQ; mv.z += 0.35; vK = aK; gl_Position = projectionMatrix * mv; }`;
const HALO_FRAG = COMMON_FRAG + `varying vec2 vQ; varying vec3 vK; varying float vDist;
void main() { float r = length(vQ); if (r > 1.0) discard; float a = pow(1.0 - r, 2.4); vec3 col = vK * a * (1.0 - smoothstep(uFogNear, uFogFar, vDist)); gl_FragColor = vec4(col * uBright, 1.0);
  #include <colorspace_fragment>
}`;
function haloMesh(list, extra = 16) {
  const N = list.length + extra, C = new Float32Array(N * 12), Q = new Float32Array(N * 8), K = new Float32Array(N * 12), I = [];
  for (let i = 0; i < N; i++) { I.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('aC', new THREE.BufferAttribute(C, 3)); g.setAttribute('aQ', new THREE.BufferAttribute(Q, 2)); g.setAttribute('aK', new THREE.BufferAttribute(K, 3)); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 12), 3)); g.setIndex(I);
  const set = (i, x, y, z, r, cr, cg, cb) => { for (let k = 0; k < 4; k++) { C.set([x, y, z], (i * 4 + k) * 3); Q.set([[-1, -1], [1, -1], [1, 1], [-1, 1]][k].map((v) => v * r), (i * 4 + k) * 2); K.set([cr, cg, cb], (i * 4 + k) * 3); } };
  list.forEach((h, i) => set(i, h.x, h.y, h.z, h.r, h.c[0] * h.k, h.c[1] * h.k, h.c[2] * h.k)); for (let i = list.length; i < N; i++) set(i, 0, -99, 0, 0, 0, 0, 0);
  const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ vertexShader: HALO_VERT, fragmentShader: HALO_FRAG,
    uniforms: { uExposure: G.uExposure, uFogColor: G.uFogColor, uFogNear: G.uFogNear, uFogFar: G.uFogFar, uBright: G.uBright }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  m.name = 'street-halos'; m.frustumCulled = false; m.renderOrder = 6;
  return { mesh: m, set: (i, ...a) => { set(i, ...a); g.attributes.aC.needsUpdate = g.attributes.aQ.needsUpdate = g.attributes.aK.needsUpdate = true; }, base: list.length, n: N };
}

// ------------------------------------------------------------------ the night sky: a dome that follows the camera
function skyTexture() {
  const w = 2048, h = 512, c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'), R = rng(4242);
  // v runs from the zenith (0) down to a little under the horizon (h): deep blue overhead, the city's glow low down
  // midnight: near black overhead, the city's glow only low down
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#020309'); gr.addColorStop(0.45, '#050913'); gr.addColorStop(0.75, '#0c1020'); gr.addColorStop(0.9, '#1c1824'); gr.addColorStop(1, '#2a2024'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 520; i++) { const y = Math.pow(R(), 1.6) * h * 0.8, a = 0.25 + R() * 0.75; g.fillStyle = `rgba(${220 + R() * 35},${220 + R() * 35},255,${a * (1 - y / h)})`; const s = R() < 0.06 ? 2 : 1; g.fillRect(R() * w, y, s, s); }
  // thin cloud, lit from below
  for (let i = 0; i < 70; i++) { const x = R() * w, y = h * (0.45 + R() * 0.42), rw = 80 + R() * 220, rh = 8 + R() * 22; const cg = g.createRadialGradient(x, y, 0, x, y, rw); cg.addColorStop(0, `rgba(${90 + R() * 40},${78 + R() * 30},${84 + R() * 30},0.10)`); cg.addColorStop(1, 'rgba(0,0,0,0)'); g.save(); g.translate(x, y); g.scale(1, rh / rw); g.translate(-x, -y); g.fillStyle = cg; g.fillRect(x - rw, y - rw, 2 * rw, 2 * rw); g.restore(); }
  // the moon over the cinema (north = the picture's middle), a halo round it
  const mx = w * 0.5 + 70, my = h * 0.42; glowDot(g, mx, my, 120, 'rgba(190,205,240,0.22)'); glowDot(g, mx, my, 40, 'rgba(220,230,255,0.5)'); g.fillStyle = '#eef0f6'; g.beginPath(); g.arc(mx, my, 13, 0, 7); g.fill(); g.fillStyle = 'rgba(150,160,185,0.5)'; g.beginPath(); g.arc(mx - 4, my - 3, 3, 0, 7); g.arc(mx + 5, my + 4, 2, 0, 7); g.fill();
  // the skyline all round: towers and blocks against the glow, a few lit windows, red lamps on the tallest
  let x = 0; while (x < w) { const bw = 14 + R() * 46, bh = 16 + Math.pow(R(), 2.2) * 120, y = h * 0.93 - bh; g.fillStyle = `rgb(${10 + R() * 8},${11 + R() * 8},${16 + R() * 10})`; g.fillRect(x, y, bw, h - y);
    for (let j = 0; j < bw * bh / 60; j++) if (R() < 0.3) { g.fillStyle = R() < 0.75 ? 'rgba(255,214,150,0.8)' : 'rgba(170,210,255,0.8)'; g.fillRect(x + 2 + Math.floor(R() * (bw - 4) / 3) * 3, y + 3 + Math.floor(R() * (bh - 4) / 4) * 4, 1.6, 2); }
    if (bh > 100) { glowDot(g, x + bw / 2, y - 2, 6, 'rgba(255,60,40,0.95)'); } x += bw + R() * 4; }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; t.wrapS = THREE.RepeatWrapping; t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; return t;
}
// drawn at the far plane (z = w) whatever the camera's far distance is: as an ordinary sphere of 120 m the far plane cut a round hole in it.
// v14 (the user, 11-20: "the sky looks boxy"): the painted 2048 px band was magnified four times on a phone (square stars, block towers).
// The sky is worked out per pixel now from the view direction: midnight blue to near black, the city's glow low down, crisp round stars,
// the moon over the cinema with its halo, thin cloud lit from below, and a far skyline of soft-edged towers with a few lit windows
const SKY_VERT = `varying vec3 vDir; void main() { vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`;
const SKY_FRAG = `uniform float uBright; uniform float uTime; varying vec3 vDir;
float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float n2(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * n2(p); p *= 2.03; a *= 0.5; } return s; }
void main() {
  vec3 d = normalize(vDir); float h = d.y, az = atan(d.x, d.z);
  vec3 zen = vec3(0.0035, 0.005, 0.016), mid = vec3(0.012, 0.016, 0.036), hor = vec3(0.055, 0.045, 0.065);
  vec3 c = mix(hor, mix(mid, zen, smoothstep(0.25, 0.9, h)), smoothstep(-0.02, 0.35, h));
  c += vec3(0.20, 0.11, 0.08) * exp(-max(h + 0.02, 0.0) * 14.0) * 0.55;
  vec2 sp = vec2(az * 140.0, h * 140.0), cell = floor(sp), f = fract(sp); float r = h21(cell);
  if (r > 0.972) { vec2 o = vec2(h21(cell + 3.7), h21(cell + 9.1)) * 0.6 + 0.2; float dd = length(f - o), b = (r - 0.972) / 0.028;
    float tw = 0.75 + 0.25 * sin(uTime * (1.5 + 3.0 * h21(cell + 1.3)) + r * 40.0); c += vec3(0.85, 0.9, 1.0) * smoothstep(0.16, 0.0, dd) * b * b * tw * smoothstep(0.06, 0.35, h); }
  vec3 md = normalize(vec3(0.12, 0.42, -0.9)); float m = dot(d, md);
  c += vec3(0.92, 0.94, 1.0) * smoothstep(0.99962, 0.99975, m) * (0.85 + 0.15 * n2(d.xy * 900.0)) + vec3(0.16, 0.18, 0.25) * pow(max(m, 0.0), 900.0) + vec3(0.05, 0.06, 0.09) * pow(max(m, 0.0), 60.0);
  float cl = smoothstep(0.52, 0.85, fbm(vec2(az * 2.2, h * 7.0) + vec2(uTime * 0.004, 0.0))) * smoothstep(0.03, 0.18, h) * smoothstep(0.75, 0.3, h);
  c = mix(c, vec3(0.09, 0.07, 0.085) + vec3(0.05, 0.03, 0.02) * (1.0 - h), cl * 0.55);
  float bx = az * 46.0, bi = floor(bx), top = 0.012 + 0.05 * pow(h21(vec2(bi, 7.0)), 2.6) + 0.006 * n2(vec2(bx * 0.5, 2.0)), edge = fwidth(h) * 1.5;
  float tower = smoothstep(top + edge, top - edge, h) * smoothstep(-0.03, -0.005, h + 0.03);
  vec2 win = vec2(fract(bx * 6.0), fract(h * 320.0)); float lit = step(0.82, h21(floor(vec2(bx * 6.0, h * 320.0)))) * step(0.3, win.x) * step(win.x, 0.7) * step(0.35, win.y) * step(win.y, 0.75);
  c = mix(c, vec3(0.012, 0.012, 0.018) + vec3(0.9, 0.7, 0.45) * lit * 0.35 * step(0.004, top - h), tower);
  gl_FragColor = vec4(c * uBright, 1.0);
}`;
function skyDome() {
  // from straight up down to 8 degrees under the horizon
  const geo = new THREE.SphereGeometry(40, 48, 20, 0, Math.PI * 2, 0, Math.PI / 2 + 0.14);
  const m = new THREE.Mesh(geo, new THREE.ShaderMaterial({ vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, uniforms: { uBright: G.uBright, uTime: G.uTime }, side: THREE.BackSide, depthWrite: false, depthTest: false, extensions: { derivatives: true } }));
  m.name = 'street-sky'; m.frustumCulled = false; m.renderOrder = -10; return m;
}

// ------------------------------------------------------------------ put it all on the street
export function dressStreet(world) {
  const room = world.rooms.street; if (!room || !room.x) return null; const x = room.x, out = { halos: null, sky: null, atlas: null };
  if (x.atlas && x.atlas.length) { out.tex = drawAtlas(world.mats.texSize < 512 ? 0.5 : 1); out.atlas = atlasMesh(x.atlas, out.tex); room.group.add(out.atlas); }
  out.halos = haloMesh(x.halos || [], 24); room.group.add(out.halos.mesh);
  out.sky = skyDome(); room.group.add(out.sky);
  out.update = (dt, cam) => { out.sky.position.copy(cam.position); out.sky.position.y -= 2; };
  return out;
}
