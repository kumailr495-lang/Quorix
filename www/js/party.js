// LUMIERE v14c - Music Night (the user, 11-26: "we can also play mp3 musics and theres this custom ui like the song plays on the theatre
// screen and npcs can dance and throw popcorns or money"). A song chosen as your own show (film9.js _music) turns the screen into a light
// show drawn from the music itself: the spectrum as a ring of bars round a pulsing disc and as a mirrored skyline, the song's title, the
// colours drifting with the bass. The room takes its light from that picture as it does from a film (film9 frame: the spill copy). On the
// beats the audience cheers and claps (npc9 onFilmEvent 'beat' / 'drop') and throws popcorn and confetti into the air (Confetti).
// Cost: one 768 px canvas drawn and uploaded per frame, one instanced mesh of at most 260 small pieces.
import * as THREE from 'three';
import { SANS, SERIF } from './textures.js';

// v14d (the user, 11-27: "it does not show custom UI for them with them having their own pics"): the song's own cover, big on the left with
// a record turning out from behind it, its title, artist and album, the time and a progress bar; behind it the cover blurred and the
// spectrum along the bottom, coloured from the cover. A song without a picture gets a cover drawn from its title.
export class MusicScreen {
  constructor(aspect, title, meta = {}) {
    const w = 768, h = Math.max(240, Math.round(w / Math.max(1.3, aspect))); this.w = w; this.h = h;
    this.cv = document.createElement('canvas'); this.cv.width = w; this.cv.height = h; this.g = this.cv.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.cv); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.minFilter = THREE.LinearFilter; this.tex.generateMipmaps = false;
    this.bins = new Uint8Array(512); this.bands = new Float32Array(64); this.avg = 0.15; this.lastBeat = 0; this.beats = 0; this.pulse = 0; this.spin = 0;
    this.title = (meta.title || title || '').slice(0, 80); this.artist = (meta.artist || '').slice(0, 60); this.album = (meta.album || '').slice(0, 60);
    let hs = 0; for (const c of this.title) hs = (hs * 31 + c.charCodeAt(0)) % 360; this.hue = hs; this.sat = 70;
    this.cover = this._drawnCover(); this.bg = null; this._vinyl();
    if (meta.art) { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => { if (!this.g) return; this.cover = im; this._fromCover(im); }; im.src = meta.art; }
    this._backdrop(this.cover);
  }
  _drawnCover() { const n = 256, c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d'), H = this.hue;
    const gr = g.createLinearGradient(0, 0, n, n); gr.addColorStop(0, `hsl(${H},55%,32%)`); gr.addColorStop(1, `hsl(${(H + 50) % 360},60%,12%)`); g.fillStyle = gr; g.fillRect(0, 0, n, n);
    g.strokeStyle = 'rgba(224,178,90,0.5)'; g.lineWidth = 3; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(n * 0.7, n * 0.32, 18 + i * 22, 0, Math.PI * 2); g.stroke(); }
    g.fillStyle = 'rgba(246,236,216,0.92)'; g.font = `600 ${n * 0.42}px ${SERIF}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('♪', n * 0.32, n * 0.62); return c; }
  _vinyl() { const n = 256, c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d'), r = n / 2;
    g.fillStyle = '#0b0b0d'; g.beginPath(); g.arc(r, r, r - 1, 0, Math.PI * 2); g.fill();
    for (let i = 0; i < 34; i++) { g.strokeStyle = `rgba(255,255,255,${0.025 + (i % 3) * 0.012})`; g.lineWidth = 1; g.beginPath(); g.arc(r, r, r * 0.36 + i * (r * 0.6 / 34), 0, Math.PI * 2); g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,0.07)'; g.beginPath(); g.moveTo(r, r); g.arc(r, r, r - 2, -0.5, 0.1); g.fill(); g.beginPath(); g.moveTo(r, r); g.arc(r, r, r - 2, 2.64, 3.24); g.fill();
    g.fillStyle = `hsl(${this.hue},60%,45%)`; g.beginPath(); g.arc(r, r, r * 0.3, 0, Math.PI * 2); g.fill(); g.fillStyle = '#0b0b0d'; g.beginPath(); g.arc(r, r, r * 0.04, 0, Math.PI * 2); g.fill(); this.vinyl = c; }
  // the cover's own colour leads the light show; the backdrop is the cover blurred (drawn once, not every frame)
  _fromCover(im) { try { const c = document.createElement('canvas'); c.width = c.height = 16; const g = c.getContext('2d'); g.drawImage(im, 0, 0, 16, 16); const d = g.getImageData(0, 0, 16, 16).data; let r = 0, gg = 0, b = 0, n = 0;
      for (let i = 0; i < d.length; i += 4) { const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]); const wgt = 0.2 + (mx - mn) / 255; r += d[i] * wgt; gg += d[i + 1] * wgt; b += d[i + 2] * wgt; n += wgt; }
      const col = new THREE.Color(r / n / 255, gg / n / 255, b / n / 255), hsl = {}; col.getHSL(hsl); this.hue = Math.round(hsl.h * 360); this.sat = Math.round(Math.max(35, Math.min(85, hsl.s * 100 + 20))); } catch (e) { /* a picture from elsewhere: keep the title's colour */ }
    this._vinyl(); this._backdrop(im); }
  _backdrop(src) { const w = this.w, h = this.h, c = document.createElement('canvas'); c.width = w / 4; c.height = h / 4; const g = c.getContext('2d');
    const sc = Math.max(c.width / (src.width || 1), c.height / (src.height || 1)); try { g.filter = 'blur(6px)'; } catch (e) { /* no canvas filters */ }
    try { g.drawImage(src, (c.width - src.width * sc) / 2, (c.height - src.height * sc) / 2, src.width * sc, src.height * sc); } catch (e) { /* not loaded */ }
    g.filter = 'none'; g.fillStyle = 'rgba(4,3,6,0.62)'; g.fillRect(0, 0, c.width, c.height); this.bg = c; }
  // one frame from the film analyser; returns 1 on a beat, 2 on a strong one (every fourth), else 0
  draw(an, dt, now, time = 0, dur = 0) {
    const g = this.g, w = this.w, h = this.h, B = this.bins; if (an) an.getByteFrequencyData(B); else B.fill(0);
    for (let i = 0; i < 64; i++) { const a = Math.floor(Math.pow(448, i / 64)), b = Math.max(a + 1, Math.floor(Math.pow(448, (i + 1) / 64))); let s = 0; for (let j = a; j < b; j++) s += B[j]; const v = s / (b - a) / 255; this.bands[i] += (v - this.bands[i]) * Math.min(1, dt * 18); }
    const bass = (this.bands[2] + this.bands[3] + this.bands[4] + this.bands[5]) / 4; this.avg += (bass - this.avg) * Math.min(1, dt * 1.6);
    let beat = 0; if (bass > this.avg * 1.28 + 0.035 && now - this.lastBeat > 300) { this.lastBeat = now; this.beats++; beat = this.beats % 4 === 0 ? 2 : 1; this.pulse = 1; }
    this.pulse = Math.max(0, this.pulse - dt * 3.2); this.spin = (this.spin + dt * 3.46) % (Math.PI * 2);   // 33 rpm
    const H = this.hue, S = this.sat;
    // the backdrop: the cover blurred, a glow in its colour that breathes with the bass
    g.drawImage(this.bg, 0, 0, w, h); const glow = g.createRadialGradient(w * 0.3, h * 0.5, 10, w * 0.3, h * 0.5, w * 0.6);
    glow.addColorStop(0, `hsla(${H},${S}%,${30 + this.pulse * 12}%,${0.35 + bass * 0.3})`); glow.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = glow; g.fillRect(0, 0, w, h);
    // the spectrum along the bottom, mirrored about the middle, with its reflection
    const n = 48, bw = w / (n * 2), base = h * 0.94;
    for (let i = 0; i < n; i++) { const v = this.bands[Math.min(63, i + 2)], bh = 3 + v * v * h * 0.2;
      g.fillStyle = `hsla(${(H + i * 3) % 360},${S}%,${50 + v * 25}%,0.55)`; for (const x of [w / 2 + i * bw, w / 2 - (i + 1) * bw]) g.fillRect(x + 1, base - bh, bw - 2, bh); }
    // the record turning out from behind the cover, then the cover with its shadow and a brass edge
    const C = Math.round(h * 0.6), cx = Math.round(w * 0.07), cy = Math.round((h - C) / 2 - h * 0.03), out = C * (0.3 + 0.04 * this.pulse);
    g.save(); g.translate(cx + C / 2 + out, cy + C / 2); g.rotate(this.spin); g.drawImage(this.vinyl, -C * 0.48, -C * 0.48, C * 0.96, C * 0.96); g.restore();
    g.save(); g.shadowColor = 'rgba(0,0,0,0.7)'; g.shadowBlur = 24; g.shadowOffsetY = 8; g.fillStyle = '#000'; g.fillRect(cx, cy, C, C); g.restore();
    try { g.drawImage(this.cover, cx, cy, C, C); } catch (e) { /* not decoded yet */ }
    g.strokeStyle = `rgba(224,178,90,${0.6 + this.pulse * 0.4})`; g.lineWidth = 2; g.strokeRect(cx + 1, cy + 1, C - 2, C - 2);
    // the words: the night's name, the title, the artist and album, the time
    const tx = cx + C + C * 0.42 + w * 0.04, tw = w - tx - w * 0.04; g.textBaseline = 'alphabetic'; g.textAlign = 'left';
    g.fillStyle = 'rgba(224,178,90,0.95)'; g.font = `600 ${Math.round(h * 0.045)}px ${SERIF}`; g.__fit = [tx, tx + tw]; g.fillText('LUMIÈRE  ·  MUSIC NIGHT', tx, cy + h * 0.05);
    g.fillStyle = 'rgba(248,240,224,0.98)'; g.font = `700 ${Math.round(h * 0.095)}px ${SANS}`; g.fillText(this.title || '♪', tx, cy + C * 0.42);
    if (this.artist) { g.fillStyle = `hsl(${H},${Math.min(80, S + 10)}%,72%)`; g.font = `600 ${Math.round(h * 0.06)}px ${SANS}`; g.fillText(this.artist, tx, cy + C * 0.58); }
    if (this.album) { g.fillStyle = 'rgba(220,210,196,0.7)'; g.font = `500 ${Math.round(h * 0.042)}px ${SANS}`; g.fillText(this.album, tx, cy + C * 0.7); }
    g.__fit = null; const by = cy + C * 0.86, f = dur > 0 && isFinite(dur) ? Math.min(1, time / dur) : 0;
    g.fillStyle = 'rgba(255,255,255,0.16)'; g.fillRect(tx, by, tw, 4); g.fillStyle = `hsl(${H},${S}%,62%)`; g.fillRect(tx, by, tw * f, 4); g.beginPath(); g.arc(tx + tw * f, by + 2, 5 + this.pulse * 2, 0, Math.PI * 2); g.fill();
    const mm = (x) => (isFinite(x) && x > 0 ? `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, '0')}` : '0:00');
    g.fillStyle = 'rgba(230,222,208,0.8)'; g.font = `500 ${Math.round(h * 0.04)}px ${SANS}`; g.fillText(mm(time), tx, by + h * 0.07); g.textAlign = 'right'; g.fillText(mm(dur), tx + tw, by + h * 0.07); g.textAlign = 'left';
    this.tex.needsUpdate = true; return beat;
  }
  dispose() { this.tex.dispose(); this.g = null; }
}

// popcorn and confetti thrown up from the seats: ballistic pieces in one instanced mesh (unlit: they catch the light show)
const CAP = 260, COLS = [[0.62, 0.56, 0.42], [0.95, 0.72, 0.25], [0.95, 0.25, 0.55], [0.25, 0.75, 0.95], [0.95, 0.92, 0.85]];
export class Confetti {
  constructor(scene) {
    // pieces bigger than life, so one reads across a hall
    const geo = new THREE.IcosahedronGeometry(0.024, 0); this.mesh = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff }), CAP);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(CAP * 3), 3); this.mesh.count = 0; this.mesh.frustumCulled = false; this.mesh.name = 'party-confetti'; scene.add(this.mesh);
    this.p = []; this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(); this._s = new THREE.Vector3(); this._v = new THREE.Vector3();
  }
  // n pieces from each of the points (x, y, z: hands over a seat); popcorn is cream, confetti flat and bright
  burst(points, n = 6) {
    for (const o of points) for (let i = 0; i < n && this.p.length < CAP; i++) { const pop = Math.random() < 0.55, a = Math.random() * Math.PI * 2, sp = 0.5 + Math.random() * 0.9;
      this.p.push({ x: o.x, y: o.y, z: o.z, vx: Math.cos(a) * sp, vy: 2.6 + Math.random() * 1.8, vz: Math.sin(a) * sp, floor: o.floor ?? o.y - 1.2, r: Math.random() * 6, w: (Math.random() - 0.5) * 14, pop, c: pop ? COLS[0] : COLS[1 + Math.floor(Math.random() * 4)], life: 0 }); }
  }
  update(dt) {
    const P = this.p; let k = 0;
    for (let i = 0; i < P.length; i++) { const q = P[i]; q.life += dt; const drag = q.pop ? 0.4 : 2.2; q.vx *= 1 - drag * dt; q.vz *= 1 - drag * dt; q.vy -= (q.pop ? 9.8 : 4.0) * dt; if (!q.pop && q.vy < -1.1) q.vy = -1.1;
      q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt; q.r += q.w * dt;
      if (q.y < q.floor || q.life > 7) continue; P[k++] = q; }
    P.length = k; const M = this.mesh, C = M.instanceColor.array;
    for (let i = 0; i < k; i++) { const q = P[i]; this._e.set(q.r, q.r * 0.7, 0); this._q.setFromEuler(this._e); this._s.set(q.pop ? 1 : 1.7, q.pop ? 1 : 0.12, q.pop ? 1 : 1.15);
      this._m.compose(this._v.set(q.x, q.y, q.z), this._q, this._s); M.setMatrixAt(i, this._m); C[i * 3] = q.c[0]; C[i * 3 + 1] = q.c[1]; C[i * 3 + 2] = q.c[2]; }
    M.count = k; if (k) { M.instanceMatrix.needsUpdate = true; M.instanceColor.needsUpdate = true; }
  }
  clear() { this.p.length = 0; this.mesh.count = 0; }
}
