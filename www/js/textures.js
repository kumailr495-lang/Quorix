// All textures are generated in code - nothing is downloaded.
import * as THREE from 'three';
export const makeCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
// tileable micro-detail shared by every model and every wall (multiplies the vertex colours)
export function detailTexture(size = 128) {
  const c = makeCanvas(size, size), g = c.getContext('2d'), img = g.createImageData(size, size);
  const rnd = (() => { let s = 1337; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const lat = new Float32Array(size * size); for (let i = 0; i < lat.length; i++) lat[i] = rnd();
  const at = (x, y) => lat[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const b = (at(x, y) + at(x + 1, y) + at(x, y + 1) + at(x - 1, y) + at(x, y - 1)) / 5, f = at(x, y), i = (y * size + x) * 4;
    const v = 241 + (b - 0.5) * 30 + (f - 0.5) * 18; img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.max(0, Math.min(255, v)); img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 2; return t;
}
const deco = (g, w, h, col) => { g.strokeStyle = col; g.lineWidth = Math.max(1, w / 400);
  for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; g.beginPath(); g.moveTo(w / 2, h * 0.22); g.lineTo(w / 2 + Math.cos(a) * w * 0.55, h * 0.22 + Math.sin(a) * w * 0.55); g.stroke(); } };
export function posterCanvas(title, hueA, hueB, sub = '') {
  const w = 256, h = 384, c = makeCanvas(w, h), g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, `hsl(${hueA},55%,22%)`); gr.addColorStop(1, `hsl(${hueB},60%,8%)`); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.save(); g.beginPath(); g.rect(0, 0, w, h * 0.5); g.clip(); deco(g, w, h, 'rgba(240,207,138,0.22)'); g.restore();
  g.fillStyle = 'rgba(240,207,138,0.9)'; g.beginPath(); g.arc(w / 2, h * 0.3, w * 0.13, 0, 7); g.fill();
  g.strokeStyle = '#c9a24a'; g.lineWidth = 3; g.strokeRect(8, 8, w - 16, h - 16);
  g.fillStyle = '#f3e3b5'; g.textAlign = 'center'; g.font = '600 30px Cormorant, Georgia, serif';
  title.split(' ').reduce((a, wd) => { const l = a[a.length - 1]; if ((l + ' ' + wd).length > 12 && l) a.push(wd); else a[a.length - 1] = (l + ' ' + wd).trim(); return a; }, ['']).forEach((ln, i) => g.fillText(ln.toUpperCase(), w / 2, h * 0.68 + i * 34));
  g.font = '400 14px Inter, sans-serif'; g.fillStyle = 'rgba(243,227,181,.7)'; g.fillText(sub, w / 2, h - 28);
  return c;
}
export function posterTexture(title, hueA, hueB, sub = '') { const t = new THREE.CanvasTexture(posterCanvas(title, hueA, hueB, sub)); t.colorSpace = THREE.SRGBColorSpace; return t; }
export function signTexture(text, w = 512, h = 128, script = false) {
  const c = makeCanvas(w, h), g = c.getContext('2d'); g.clearRect(0, 0, w, h);
  g.fillStyle = '#e9c777'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = script ? `italic 300 ${h * 0.7}px Cormorant, Georgia, serif` : `300 ${h * 0.56}px Cormorant, Georgia, serif`;
  if (!script) { g.letterSpacing = `${h * 0.12}px`; }
  g.shadowColor = 'rgba(255,190,90,.85)'; g.shadowBlur = h * 0.28; g.fillText(text, w / 2, h / 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// the house film: an animated procedural title sequence shown when nobody picked their own video
// House presentations: a short procedural "film" per programme (title cards, an animated scene with film grain, FIN).
// scene: 'city' (night skyline, searchlights, a train on a bridge), 'sea' (sunset, waves, a sailboat, birds), 'rain' (a window in the rain, lamp, lightning)
export function makeHouseFilm(title = 'LUMIÈRE', scene = 'city', length = 150) {
  const w = 640, h = 270, c = makeCanvas(w, h), g = c.getContext('2d'); const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
  let t0 = 0, seed = 7; const R = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const towers = []; for (let x = -60; x < w * 1.6; ) { const bw = 18 + R() * 46, bh = 50 + R() * 140, win = []; for (let wy = 8; wy < bh - 6; wy += 9) for (let wx = 4; wx < bw - 5; wx += 7) if (R() < 0.42) win.push([wx, wy, R() * 6.28]); towers.push([x, bw, bh, win, R()]); x += bw + 2 + R() * 6; }
  const drops = Array.from({ length: 70 }, () => [R() * w, R() * h, 0.6 + R() * 1.4, R()]);
  const birds = Array.from({ length: 6 }, () => [R(), 0.18 + R() * 0.2, 0.6 + R() * 0.6]);
  const card = (text, sub, a) => { g.globalAlpha = a; g.fillStyle = '#f3dfa6'; g.textAlign = 'center'; g.font = '300 52px Cormorant, Georgia, serif'; g.fillText(text, w / 2, h * 0.52); if (sub) { g.font = '400 12px Inter, sans-serif'; g.fillStyle = 'rgba(243,223,166,.75)'; g.fillText(sub, w / 2, h * 0.52 + 30); } g.globalAlpha = 1; };
  const city = (k) => {
    const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#060a1c'); sky.addColorStop(0.7, '#1b2140'); sky.addColorStop(1, '#3a2a3a'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
    g.fillStyle = '#efe6c8'; g.beginPath(); g.arc(470 - k * 0.6, 64, 26, 0, 7); g.fill(); g.fillStyle = 'rgba(239,230,200,.12)'; g.beginPath(); g.arc(470 - k * 0.6, 64, 46, 0, 7); g.fill();
    for (let i = 0; i < 2; i++) { const a = -1.2 + Math.sin(k * 0.35 + i * 2.1) * 0.55, x0 = 160 + i * 300; g.save(); g.translate(x0, h); g.rotate(a); const gr = g.createLinearGradient(0, 0, 0, -h * 1.4); gr.addColorStop(0, 'rgba(255,240,200,.32)'); gr.addColorStop(1, 'rgba(255,240,200,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(-5, 0); g.lineTo(5, 0); g.lineTo(40, -h * 1.4); g.lineTo(-40, -h * 1.4); g.fill(); g.restore(); }
    const pan = (k * 2.2) % (w * 0.6);
    for (const [x, bw, bh, win, d] of towers) { const X = x - pan * (0.6 + d * 0.4); if (X > w || X + bw < 0) continue; g.fillStyle = d > 0.5 ? '#0b0d16' : '#11131f'; g.fillRect(X, h - bh, bw, bh);
      for (const [wx, wy, ph] of win) { const on = Math.sin(k * 0.7 + ph * 3) > -0.6; if (!on) continue; g.fillStyle = `rgba(255,${200 + Math.floor(ph * 8)},120,${0.55 + 0.35 * Math.sin(ph + k)})`; g.fillRect(X + wx, h - bh + wy, 3, 4); } }
    const by = h - 40; g.fillStyle = '#05060b'; g.fillRect(0, by, w, 5); for (let x = 0; x < w; x += 40) g.fillRect(x, by, 4, 40);
    const tx = ((k * 60) % (w + 400)) - 300; for (let i = 0; i < 8; i++) { g.fillStyle = '#0a0b10'; g.fillRect(tx + i * 34, by - 13, 31, 12); g.fillStyle = 'rgba(255,214,140,.9)'; for (let j = 0; j < 4; j++) g.fillRect(tx + i * 34 + 3 + j * 7, by - 10, 4, 4); }
  };
  const sea = (k) => {
    const sky = g.createLinearGradient(0, 0, 0, h * 0.6); sky.addColorStop(0, '#2a1440'); sky.addColorStop(0.55, '#c0503a'); sky.addColorStop(1, '#f2b45a'); g.fillStyle = sky; g.fillRect(0, 0, w, h * 0.6);
    const sy = h * 0.42 + k * 0.25; g.fillStyle = '#ffd88a'; g.beginPath(); g.arc(w * 0.62, sy, 30, 0, 7); g.fill();
    const sea0 = g.createLinearGradient(0, h * 0.6, 0, h); sea0.addColorStop(0, '#5a2a3a'); sea0.addColorStop(1, '#120a18'); g.fillStyle = sea0; g.fillRect(0, h * 0.6, w, h * 0.4);
    for (let i = 0; i < 26; i++) { const y = h * 0.6 + i * i * 0.16 + 2, a = 0.35 - i * 0.011; g.strokeStyle = `rgba(255,${190 - i * 3},120,${a})`; g.lineWidth = 1 + i * 0.05; g.beginPath(); for (let x = 0; x <= w; x += 16) { const yy = y + Math.sin(x * 0.03 + k * (1.2 + i * 0.05) + i) * (1 + i * 0.1); x ? g.lineTo(x, yy) : g.moveTo(x, yy); } g.stroke(); }
    const bx = ((k * 9) % (w + 200)) - 100, by = h * 0.62 + Math.sin(k * 1.3) * 2; g.fillStyle = '#140a12'; g.beginPath(); g.moveTo(bx - 26, by); g.lineTo(bx + 28, by); g.lineTo(bx + 18, by + 8); g.lineTo(bx - 18, by + 8); g.fill(); g.beginPath(); g.moveTo(bx, by - 2); g.lineTo(bx, by - 46); g.lineTo(bx + 22, by - 4); g.fill(); g.beginPath(); g.moveTo(bx - 2, by - 40); g.lineTo(bx - 20, by - 4); g.lineTo(bx - 2, by - 4); g.fill();
    g.strokeStyle = '#1a0c14'; g.lineWidth = 1.6; for (const [bxx, byy, sp] of birds) { const x = ((bxx * w + k * 14 * sp) % (w + 40)) - 20, y = byy * h + Math.sin(k * 2 * sp + bxx * 9) * 4, f = Math.sin(k * 6 * sp + bxx * 20) * 4; g.beginPath(); g.moveTo(x - 7, y - f); g.quadraticCurveTo(x - 3, y - 3, x, y); g.quadraticCurveTo(x + 3, y - 3, x + 7, y - f); g.stroke(); }
  };
  const rain = (k) => {
    const flash = Math.max(0, Math.sin(k * 0.21) > 0.985 ? 1 : 0) + Math.max(0, 1 - ((k * 0.21) % 7)) * 0;
    g.fillStyle = '#0c1416'; g.fillRect(0, 0, w, h); const lamp = g.createRadialGradient(140, 150, 5, 140, 150, 220); lamp.addColorStop(0, 'rgba(255,190,110,.55)'); lamp.addColorStop(1, 'rgba(255,190,110,0)'); g.fillStyle = lamp; g.fillRect(0, 0, w, h);
    const wx = 300, wy = 30, ww = 260, wh = 200, out = g.createLinearGradient(0, wy, 0, wy + wh); out.addColorStop(0, flash ? '#c8d8ff' : '#16263a'); out.addColorStop(1, flash ? '#8090b0' : '#0a1420'); g.fillStyle = out; g.fillRect(wx, wy, ww, wh);
    g.fillStyle = '#05080a'; for (let i = 0; i < 9; i++) g.fillRect(wx + i * 30, wy + wh - 40 - (i * 37 % 60), 26, 80); 
    g.strokeStyle = 'rgba(190,215,235,.5)'; g.lineWidth = 1; for (const d of drops) { if (d[0] < wx || d[0] > wx + ww) continue; const y = wy + ((d[1] + k * 60 * d[2]) % wh), len = 6 + d[3] * 10; g.beginPath(); g.moveTo(d[0], y); g.lineTo(d[0] - 1, y + len); g.stroke(); }
    g.strokeStyle = '#2a1c12'; g.lineWidth = 8; g.strokeRect(wx, wy, ww, wh); g.lineWidth = 5; g.beginPath(); g.moveTo(wx + ww / 2, wy); g.lineTo(wx + ww / 2, wy + wh); g.moveTo(wx, wy + wh / 2); g.lineTo(wx + ww, wy + wh / 2); g.stroke();
    const sway = Math.sin(k * 0.8) * 6; g.fillStyle = '#3a1418'; g.beginPath(); g.moveTo(wx - 30, 0); g.quadraticCurveTo(wx - 10 + sway, h * 0.5, wx - 26, h); g.lineTo(wx - 70, h); g.lineTo(wx - 70, 0); g.fill(); g.beginPath(); g.moveTo(wx + ww + 30, 0); g.quadraticCurveTo(wx + ww + 10 - sway, h * 0.5, wx + ww + 26, h); g.lineTo(wx + ww + 70, h); g.lineTo(wx + ww + 70, 0); g.fill();
    g.fillStyle = '#080605'; g.fillRect(90, 170, 90, 12); g.fillRect(96, 182, 8, 60); g.fillRect(166, 182, 8, 60); g.fillRect(130, 80, 6, 92); g.beginPath(); g.moveTo(108, 80); g.lineTo(158, 80); g.lineTo(148, 60); g.lineTo(118, 60); g.fill();
    if (flash) { g.fillStyle = 'rgba(220,230,255,.25)'; g.fillRect(0, 0, w, h); }
  };
  const SC = { city, sea, rain }[scene] || city; const AVG = { city: [0.16, 0.17, 0.30], sea: [0.62, 0.36, 0.30], rain: [0.14, 0.20, 0.22] }[scene] || [0.3, 0.3, 0.3]; const avg = { r: 0, g: 0, b: 0, lum: 0 };
  const grain = (k) => { g.fillStyle = 'rgba(255,255,255,.035)'; for (let i = 0; i < 3; i++) { const x = (Math.sin(k * 13.7 + i * 91) * 0.5 + 0.5) * w; g.fillRect(x, 0, 1, h); } const v = g.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, w * 0.62); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.55)'); g.fillStyle = v; g.fillRect(0, 0, w, h); g.globalAlpha = 0.04 + 0.03 * Math.sin(k * 23); g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.globalAlpha = 1; };
  const draw = (t) => {
    const k = (t - t0) / 1000; g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    if (k < 5) card('LUMIÈRE', 'P  R  E  S  E  N  T  S', Math.min(1, k / 1.5) * Math.min(1, (5 - k) / 1)); else if (k < 12) card(title, '', Math.min(1, (k - 5) / 1.5) * Math.min(1, (12 - k) / 1));
    else { SC(k - 12); const left = length - k; if (left < 10) { g.fillStyle = `rgba(0,0,0,${Math.min(0.85, (10 - left) / 4)})`; g.fillRect(0, 0, w, h); card('FIN', left < 6 ? '' : 'a LUMIÈRE presentation', Math.min(1, (10 - left) / 2) * Math.min(1, left / 1.5)); } }
    grain(k); tex.needsUpdate = true;
    let a = k < 12 ? 0.08 : 1; const left = length - k; if (left < 10) a *= Math.max(0.1, left / 10); if (scene === 'rain' && Math.sin((k - 12) * 0.21) > 0.985) a *= 3.2;
    avg.r = Math.min(1, AVG[0] * a); avg.g = Math.min(1, AVG[1] * a); avg.b = Math.min(1, AVG[2] * a); avg.lum = 0.2126 * avg.r + 0.7152 * avg.g + 0.0722 * avg.b; };
  return { tex, canvas: c, length, avg, start: (t) => { t0 = t; }, draw };
}

// idle slate shown on the screen whenever no film is playing (so the hall is never a black void)
export function slateTexture() {
  const w = 640, h = 270, c = makeCanvas(w, h), g = c.getContext('2d'); const gr = g.createRadialGradient(w / 2, h * 0.55, 10, w / 2, h * 0.55, w * 0.65);
  gr.addColorStop(0, '#2c1710'); gr.addColorStop(1, '#080504'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.save(); g.translate(w / 2, h * 0.5); g.strokeStyle = 'rgba(240,207,138,.10)'; g.lineWidth = 1.2; for (let i = 0; i < 36; i++) { g.rotate(Math.PI / 18); g.beginPath(); g.moveTo(40, 0); g.lineTo(w, 0); g.stroke(); } g.restore();
  g.textAlign = 'center'; g.fillStyle = 'rgba(240,207,138,.78)'; g.font = '300 54px Cormorant, Georgia, serif'; g.fillText('LUMIÈRE', w / 2, h * 0.5);
  g.font = '400 11px Inter, sans-serif'; g.fillStyle = 'rgba(240,207,138,.5)'; g.fillText('RESERVE  A  SEAT  AT  THE  RECEPTION', w / 2, h * 0.5 + 34);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
