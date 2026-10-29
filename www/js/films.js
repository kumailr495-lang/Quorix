// LUMIERE v5 - the house programme: three short procedural films drawn on a canvas, each with a cue track.
// Cues are what the audience reacts to (react.js) and when the soundtrack plays its effects (sound.js): nobody screams at a random moment.
//   cue types: laugh, gasp, scare (jump scare: screams), tension (lean in, quiet), climax (cheers), aww, sad, end (applause)
import * as THREE from 'three';
import { makeCanvas, SANS, SERIF } from './textures.js';
export const HOUSE = {
  night: { title: 'The Long Night', genre: 'thriller', len: 150, music: 'thriller', cues: [
    { t: 38, type: 'tension', k: 0.6, sfx: 'siren' }, { t: 58, type: 'gasp', k: 0.7, sfx: 'screech' }, { t: 74, type: 'tension', k: 0.9, sfx: 'siren' },
    { t: 92, type: 'scare', k: 0.55, sfx: 'horn' }, { t: 108, type: 'climax', k: 1, sfx: 'boom' }, { t: 121, type: 'cheer', k: 0.7 }, { t: 141, type: 'end', k: 1 }] },
  velvet: { title: 'Velvet Hour', genre: 'romance', len: 150, music: 'romance', cues: [
    { t: 34, type: 'laugh', k: 0.6, sfx: 'squawk' }, { t: 57, type: 'laugh', k: 1, sfx: 'splash' }, { t: 84, type: 'aww', k: 0.6 },
    { t: 100, type: 'climax', k: 0.7, sfx: 'fireworks' }, { t: 116, type: 'aww', k: 1 }, { t: 141, type: 'end', k: 1 }] },
  quiet: { title: 'A Quiet Room', genre: 'horror', len: 150, music: 'horror', cues: [
    { t: 30, type: 'tension', k: 0.7, sfx: 'creak' }, { t: 46, type: 'gasp', k: 0.6, sfx: 'flicker' }, { t: 62, type: 'scare', k: 1, sfx: 'stinger' }, { t: 80, type: 'tension', k: 0.8, sfx: 'creak' },
    { t: 97, type: 'gasp', k: 0.5, sfx: 'thunder' }, { t: 112, type: 'scare', k: 1, sfx: 'stinger' }, { t: 125, type: 'laugh', k: 0.8, sfx: 'meow' }, { t: 141, type: 'end', k: 1 }] },
};
export const PROGRAMME = { I: 'night', II: 'velvet', III: 'quiet' };
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
// a house film instance for one screen (aspect = screen aspect); draw(now) paints the current frame, avg = colour of the picture for light spill
export function makeHouseFilm(id, aspect = 1.85) {
  const F = HOUSE[id], w = 512, h = Math.round(512 / aspect), c = makeCanvas(w, h), g = c.getContext('2d', { alpha: false });
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
  let seed = 7; const R = () => (seed = (seed * 16807) % 2147483647) / 2147483647; const avg = { r: 0, g: 0, b: 0, lum: 0 };
  const card = (text, sub, a, big = 0.11) => { g.globalAlpha = a; g.fillStyle = '#f4efe6'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `600 ${Math.round(h * big)}px ${SANS}`; if ('letterSpacing' in g) g.letterSpacing = `${Math.round(h * big * 0.12)}px`; g.fillText(text, w / 2, h * 0.48); if (sub) { g.font = `500 ${Math.round(h * 0.035)}px ${SANS}`; if ('letterSpacing' in g) g.letterSpacing = `${Math.round(h * 0.012)}px`; g.fillStyle = 'rgba(244,239,230,.7)'; g.fillText(sub, w / 2, h * 0.48 + h * 0.1); } g.globalAlpha = 1; };
  const towers = []; for (let x = -40; x < w * 1.8;) { const bw = 16 + R() * 40, bh = h * (0.18 + R() * 0.5), win = []; for (let wy = 8; wy < bh - 6; wy += 9) for (let wx = 4; wx < bw - 5; wx += 7) if (R() < 0.38) win.push([wx, wy, R() * 6.28]); towers.push([x, bw, bh, win, R()]); x += bw + 2 + R() * 6; }
  const drops = Array.from({ length: 90 }, () => [R() * w, R() * h, 0.6 + R() * 1.4, R()]), stars = Array.from({ length: 60 }, () => [R() * w, R() * h * 0.55, R()]);
  // ---------------- scenes ----------------
  const shake = (k) => (k > 0 ? [(Math.sin(k * 97) * 3), (Math.cos(k * 71) * 2)] : [0, 0]);
  const night = (s) => {   // s = seconds into the story
    const chase = smooth(38, 42, s) * (1 - smooth(104, 108, s)), boom = s > 108 ? Math.max(0, 1 - (s - 108) / 4) : 0, [sx, sy] = shake(chase * 0.6 + boom * 2);
    g.save(); g.translate(sx, sy);
    const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#05081a'); sky.addColorStop(0.7, '#1a2244'); sky.addColorStop(1, '#3b2b3e'); g.fillStyle = sky; g.fillRect(-10, -10, w + 20, h + 20);
    for (const [x, y, k] of stars) { g.fillStyle = `rgba(255,255,255,${0.3 + 0.4 * Math.sin(s * 2 + k * 9)})`; g.fillRect(x, y, 1.5, 1.5); }
    g.fillStyle = '#efe6c8'; g.beginPath(); g.arc(w * 0.78, h * 0.2, h * 0.08, 0, 7); g.fill();
    for (let i = 0; i < 2; i++) { const a = -1.1 + Math.sin(s * 0.4 + i * 2.1) * 0.5; g.save(); g.translate(w * (0.25 + i * 0.5), h); g.rotate(a); const gr = g.createLinearGradient(0, 0, 0, -h * 1.4); gr.addColorStop(0, 'rgba(255,240,200,.28)'); gr.addColorStop(1, 'rgba(255,240,200,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(-5, 0); g.lineTo(5, 0); g.lineTo(40, -h * 1.4); g.lineTo(-40, -h * 1.4); g.fill(); g.restore(); }
    const pan = (s * (8 + chase * 40)) % (w * 0.8);
    for (const [x, bw, bh, win, d] of towers) { const X = x - pan * (0.5 + d * 0.5); if (X > w || X + bw < 0) continue; g.fillStyle = d > 0.5 ? '#0a0c16' : '#10121e'; g.fillRect(X, h - bh, bw, bh); for (const [wx, wy, ph] of win) if (Math.sin(s * 0.5 + ph * 3) > -0.5) { g.fillStyle = `rgba(255,${200 + Math.floor(ph * 8)},120,.7)`; g.fillRect(X + wx, h - bh + wy, 3, 4); } }
    const by = h * 0.82; g.fillStyle = '#04050a'; g.fillRect(-10, by, w + 20, 5); for (let x = -((s * 60 * (1 + chase)) % 40); x < w; x += 40) g.fillRect(x, by, 4, h - by);
    if (chase > 0) { const t = (s - 40) * 0.9, c1 = ((t * 140) % (w + 300)) - 150, c2 = c1 - 70 - Math.sin(s * 2) * 20;   // two cars racing across the bridge
      for (const [cxp, col] of [[c1, '#c2283a'], [c2, '#1d2b55']]) { g.fillStyle = col; g.fillRect(cxp, by - 14, 42, 12); g.fillRect(cxp + 8, by - 22, 24, 9); g.fillStyle = '#fff6c8'; g.fillRect(cxp + 40, by - 11, 4, 3); const hl = g.createLinearGradient(cxp + 44, 0, cxp + 140, 0); hl.addColorStop(0, 'rgba(255,240,190,.5)'); hl.addColorStop(1, 'rgba(255,240,190,0)'); g.fillStyle = hl; g.beginPath(); g.moveTo(cxp + 44, by - 11); g.lineTo(cxp + 140, by - 26); g.lineTo(cxp + 140, by + 4); g.fill(); }
      if (s > 72 && s < 104) { const b = Math.sin(s * 9) > 0; g.fillStyle = b ? 'rgba(255,40,40,.35)' : 'rgba(40,80,255,.35)'; g.fillRect(0, 0, w, h * 0.12); } }
    if (s > 57 && s < 59) { g.fillStyle = `rgba(255,255,255,${0.5 * (1 - Math.abs(s - 58))})`; g.fillRect(0, 0, w, h); }
    if (s > 91.5 && s < 93.5) { const k = 1 - Math.abs(s - 92.2) / 1.3; g.fillStyle = `rgba(255,250,220,${0.85 * clamp(k)})`; g.fillRect(0, 0, w, h); }
    if (boom > 0) { const r = h * (0.2 + (1 - boom) * 0.9), fx = w * 0.55, fy = by - 10, gr = g.createRadialGradient(fx, fy, 2, fx, fy, r); gr.addColorStop(0, `rgba(255,255,220,${boom})`); gr.addColorStop(0.3, `rgba(255,170,60,${boom * 0.9})`); gr.addColorStop(1, 'rgba(120,20,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }
    if (s > 112) { const k = smooth(112, 118, s), x = w * (0.3 + (s - 112) * 0.006); g.fillStyle = `rgba(0,0,0,${0.9 * k})`; g.fillRect(x, by - 40, 9, 30); g.beginPath(); g.arc(x + 4.5, by - 45, 6, 0, 7); g.fill(); g.fillRect(x - 3, by - 38, 15, 14); }
    g.restore(); return [0.13 + boom * 0.7, 0.13 + boom * 0.45, 0.27 + boom * 0.1];
  };
  const velvet = (s) => {
    const sun = s / 150, sky = g.createLinearGradient(0, 0, 0, h * 0.62); sky.addColorStop(0, '#2c1546'); sky.addColorStop(0.5, '#c24f45'); sky.addColorStop(1, '#f5b261'); g.fillStyle = sky; g.fillRect(0, 0, w, h * 0.62);
    const sy = h * (0.35 + sun * 0.3); g.fillStyle = '#ffd98e'; g.beginPath(); g.arc(w * 0.62, sy, h * 0.11, 0, 7); g.fill();
    const sea = g.createLinearGradient(0, h * 0.62, 0, h); sea.addColorStop(0, '#6a3046'); sea.addColorStop(1, '#170b1e'); g.fillStyle = sea; g.fillRect(0, h * 0.62, w, h * 0.38);
    for (let i = 0; i < 18; i++) { const y = h * 0.62 + i * i * 0.35 + 2; g.strokeStyle = `rgba(255,${190 - i * 4},120,${0.3 - i * 0.014})`; g.lineWidth = 1 + i * 0.06; g.beginPath(); for (let x = 0; x <= w; x += 16) { const yy = y + Math.sin(x * 0.03 + s * (1.2 + i * 0.05) + i) * (1 + i * 0.1); x ? g.lineTo(x, yy) : g.moveTo(x, yy); } g.stroke(); }
    g.fillStyle = '#e6b98a'; g.fillRect(0, h * 0.86, w, h * 0.14);   // the beach
    const near = smooth(70, 110, s), ax = w * (0.36 + near * 0.11), bx = w * (0.64 - near * 0.11), base = h * 0.86;
    const person = (x, hat, lean = 0, fall = 0) => { g.save(); g.translate(x, base + fall * h * 0.1); g.rotate(lean); g.fillStyle = '#1a0d16'; g.fillRect(-7, -h * 0.2, 14, h * 0.13); g.beginPath(); g.arc(0, -h * 0.23, h * 0.035, 0, 7); g.fill(); g.fillRect(-6, -h * 0.07, 5, h * 0.07); g.fillRect(1, -h * 0.07, 5, h * 0.07); if (hat) { g.fillRect(-10, -h * 0.265, 20, 3); g.fillRect(-6, -h * 0.29, 12, 8); } g.restore(); };
    const hatGone = s > 33, fell = s > 56 && s < 70 ? Math.sin(Math.min(1, (s - 56) / 1.2) * Math.PI / 2) : 0;
    person(ax, !hatGone, 0, 0); person(bx, false, fell * 1.2, fell);
    if (s > 56 && s < 60) { g.fillStyle = 'rgba(255,255,255,.7)'; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI, r = (s - 56) * h * 0.08; g.beginPath(); g.arc(bx + Math.cos(a) * r, base - Math.sin(a) * r * 0.6, 2.5, 0, 7); g.fill(); } }
    if (s > 30 && s < 46) { const k = (s - 30) / 16, x = ax + k * w * 0.5, y = base - h * 0.27 - Math.sin(k * Math.PI) * h * 0.25; g.strokeStyle = '#1a0d16'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 9, y - Math.sin(s * 12) * 4); g.quadraticCurveTo(x - 3, y - 4, x, y); g.quadraticCurveTo(x + 3, y - 4, x + 9, y - Math.sin(s * 12) * 4); g.stroke(); if (s > 33) { g.fillStyle = '#1a0d16'; g.fillRect(x - 6, y + 4, 12, 3); g.fillRect(x - 3, y, 6, 5); } }
    let fw = 0; if (s > 99 && s < 112) for (let i = 0; i < 4; i++) { const t0 = 99 + i * 2.6, k = (s - t0) / 2.4; if (k < 0 || k > 1) continue; const fx = w * (0.2 + i * 0.2), fy = h * (0.15 + (i % 2) * 0.1); fw = Math.max(fw, 1 - k); for (let j = 0; j < 14; j++) { const a = j / 14 * Math.PI * 2, r = k * h * 0.15; g.fillStyle = `hsla(${i * 80 + 20},100%,70%,${1 - k})`; g.fillRect(fx + Math.cos(a) * r, fy + Math.sin(a) * r, 3, 3); } }
    if (s > 114 && s < 130) { const k = smooth(114, 117, s); g.fillStyle = `rgba(255,120,150,${0.7 * k})`; g.font = `${Math.round(h * 0.08)}px ${SANS}`; g.textAlign = 'center'; g.fillText('♥', (ax + bx) / 2, base - h * 0.33 - Math.sin(s * 2) * 4); }
    return [0.62 + fw * 0.2, 0.36 + fw * 0.2, 0.3 + fw * 0.2];
  };
  const quiet = (s) => {
    const flick = s > 45 && s < 47 ? (Math.sin(s * 40) > 0 ? 1 : 0.1) : s > 47 && s < 52 ? 0.05 : 1, thunder = Math.max(s > 96.5 && s < 97.4 ? 1 : 0, s > 61.6 && s < 63 ? 0.8 : 0);
    g.fillStyle = '#0a1012'; g.fillRect(0, 0, w, h);
    const lamp = g.createRadialGradient(w * 0.22, h * 0.6, 5, w * 0.22, h * 0.6, w * 0.45); lamp.addColorStop(0, `rgba(255,190,110,${0.5 * flick})`); lamp.addColorStop(1, 'rgba(255,190,110,0)'); g.fillStyle = lamp; g.fillRect(0, 0, w, h);
    const wx = w * 0.5, wy = h * 0.12, ww = w * 0.36, wh = h * 0.6, out = g.createLinearGradient(0, wy, 0, wy + wh); out.addColorStop(0, thunder ? '#c8d8ff' : '#132233'); out.addColorStop(1, thunder ? '#8090b0' : '#081018'); g.fillStyle = out; g.fillRect(wx, wy, ww, wh);
    g.strokeStyle = 'rgba(190,215,235,.45)'; g.lineWidth = 1; for (const d of drops) { if (d[0] < wx || d[0] > wx + ww) continue; const y = wy + ((d[1] + s * 70 * d[2]) % wh); g.beginPath(); g.moveTo(d[0], y); g.lineTo(d[0] - 1, y + 6 + d[3] * 10); g.stroke(); }
    // the face in the window (first scare) and the closet door (second)
    if (s > 61.6 && s < 64) { const k = 1 - smooth(62.5, 64, s); g.fillStyle = `rgba(230,235,225,${k})`; g.beginPath(); g.ellipse(wx + ww * 0.5, wy + wh * 0.42, ww * 0.16, wh * 0.24, 0, 0, 7); g.fill(); g.fillStyle = `rgba(0,0,0,${k})`; for (const sx2 of [-1, 1]) { g.beginPath(); g.ellipse(wx + ww * 0.5 + sx2 * ww * 0.06, wy + wh * 0.38, ww * 0.03, wh * 0.05, 0, 0, 7); g.fill(); } g.beginPath(); g.ellipse(wx + ww * 0.5, wy + wh * 0.55, ww * 0.04, wh * 0.06, 0, 0, 7); g.fill(); }
    g.strokeStyle = '#2a1c12'; g.lineWidth = 8; g.strokeRect(wx, wy, ww, wh); g.lineWidth = 5; g.beginPath(); g.moveTo(wx + ww / 2, wy); g.lineTo(wx + ww / 2, wy + wh); g.moveTo(wx, wy + wh / 2); g.lineTo(wx + ww, wy + wh / 2); g.stroke();
    const open = smooth(28, 40, s) * (1 - smooth(110, 111, s)) * 0.5 + (s > 111.6 ? smooth(111.6, 112, s) : 0), dx = w * 0.06, dw = w * 0.16; g.fillStyle = '#05080a'; g.fillRect(dx, h * 0.25, dw, h * 0.75); g.fillStyle = '#2a1e18'; g.fillRect(dx, h * 0.25, dw * (1 - open), h * 0.75);
    if (s > 111.6 && s < 114) { const k = 1 - smooth(112.5, 114, s); g.fillStyle = `rgba(0,0,0,${k})`; g.fillRect(dx + dw * 0.2, h * 0.3, dw * 0.6, h * 0.65); g.fillStyle = `rgba(255,255,255,${k})`; for (const e of [-1, 1]) g.fillRect(dx + dw * 0.5 + e * dw * 0.12 - 2, h * 0.4, 4, 3); }
    if (s > 96 && s < 100) { const x = w * (0.1 + (s - 96) * 0.22); g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(x, h * 0.3, w * 0.06, h * 0.7); }
    if (s > 123) { const k = smooth(123, 125, s), x = dx + dw * 0.5; g.fillStyle = `rgba(20,14,10,${k})`; g.beginPath(); g.ellipse(x, h * 0.92, 18, 10, 0, 0, 7); g.fill(); g.beginPath(); g.arc(x + 14, h * 0.86, 8, 0, 7); g.fill(); g.beginPath(); g.moveTo(x + 9, h * 0.81); g.lineTo(x + 11, h * 0.77); g.lineTo(x + 14, h * 0.81); g.moveTo(x + 15, h * 0.81); g.lineTo(x + 18, h * 0.77); g.lineTo(x + 20, h * 0.81); g.fill(); g.fillStyle = `rgba(255,220,90,${k})`; g.fillRect(x + 10, h * 0.855, 2, 2); g.fillRect(x + 16, h * 0.855, 2, 2); }
    g.fillStyle = '#080605'; g.fillRect(w * 0.16, h * 0.68, w * 0.12, h * 0.03); g.fillRect(w * 0.21, h * 0.4, 4, h * 0.28); g.beginPath(); g.moveTo(w * 0.18, h * 0.4); g.lineTo(w * 0.25, h * 0.4); g.lineTo(w * 0.24, h * 0.33); g.lineTo(w * 0.19, h * 0.33); g.fill();
    if (thunder) { g.fillStyle = `rgba(220,230,255,${0.3 * thunder})`; g.fillRect(0, 0, w, h); }
    const L = 0.12 * flick + thunder * 0.6; return [L * 1.1 + 0.03, L + 0.04, L * 0.9 + 0.05];
  };
  const SCENE = { night, velvet, quiet }[id];
  const grain = (k) => { g.fillStyle = 'rgba(255,255,255,.03)'; for (let i = 0; i < 3; i++) g.fillRect((Math.sin(k * 13.7 + i * 91) * 0.5 + 0.5) * w, 0, 1, h); const v = g.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, w * 0.65); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.45)'); g.fillStyle = v; g.fillRect(0, 0, w, h); };
  let t0 = 0;
  const draw = (now) => {
    const k = (now - t0) / 1000, len = F.len; g.fillStyle = '#000'; g.fillRect(0, 0, w, h); let col = [0.02, 0.02, 0.02];
    if (k < 5) card('LUMIÈRE', 'PRESENTS', Math.min(1, k / 1.2) * Math.min(1, (5 - k) / 0.8), 0.1);
    else if (k < 11) card(F.title.toUpperCase(), '', Math.min(1, (k - 5) / 1.2) * Math.min(1, (11 - k) / 0.8), 0.09);
    else { col = SCENE(k) || col; const left = len - k; if (left < 10) { g.fillStyle = `rgba(0,0,0,${Math.min(0.9, (10 - left) / 3)})`; g.fillRect(0, 0, w, h); card('THE END', left < 5 ? '' : 'A LUMIÈRE PRESENTATION', Math.min(1, (10 - left) / 2) * Math.min(1, left / 1.2), 0.09); col = col.map((v) => v * Math.max(0.1, left / 10)); } }
    grain(k); tex.needsUpdate = true;
    avg.r = clamp(col[0]); avg.g = clamp(col[1]); avg.b = clamp(col[2]); avg.lum = 0.2126 * avg.r + 0.7152 * avg.g + 0.0722 * avg.b;
  };
  return { id, F, tex, canvas: c, length: F.len, avg, start: (now) => { t0 = now; }, draw, aspect: w / h, cues: F.cues };
}
// pre-show slide (pending shows): "please silence your phone", countdown
export function makePreshow(aspect = 1.85) {
  const w = 512, h = Math.round(512 / aspect), c = makeCanvas(w, h), g = c.getContext('2d', { alpha: false }), tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
  const draw = (title, secs, lines) => { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#16141e'); gr.addColorStop(1, '#0a0a0f'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ff4d5a'; g.fillRect(w * 0.08, h * 0.2, 4, h * 0.5); g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillStyle = '#fff'; g.font = `600 ${Math.round(h * 0.09)}px ${SANS}`; g.fillText(title, w * 0.11, h * 0.34);
    g.font = `400 ${Math.round(h * 0.05)}px ${SANS}`; g.fillStyle = 'rgba(255,255,255,.75)'; (lines || []).forEach((l, i) => g.fillText(l, w * 0.11, h * (0.47 + i * 0.08)));
    if (secs != null) { g.textAlign = 'right'; g.font = `600 ${Math.round(h * 0.14)}px ${SANS}`; g.fillStyle = '#fff'; const m = Math.floor(secs / 60), s = Math.floor(secs % 60); g.fillText(`${m}:${String(s).padStart(2, '0')}`, w * 0.92, h * 0.86); }
    tex.needsUpdate = true; };
  return { tex, draw, aspect: w / h };
}
