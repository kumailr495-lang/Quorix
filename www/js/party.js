// LUMIERE v14c - Music Night (the user, 11-26: "we can also play mp3 musics and theres this custom ui like the song plays on the theatre
// screen and npcs can dance and throw popcorns or money"). A song chosen as your own show (film9.js _music) turns the screen into a light
// show drawn from the music itself: the spectrum as a ring of bars round a pulsing disc and as a mirrored skyline, the song's title, the
// colours drifting with the bass. The room takes its light from that picture as it does from a film (film9 frame: the spill copy). On the
// beats the audience cheers and claps (npc9 onFilmEvent 'beat' / 'drop') and throws popcorn and confetti into the air (Confetti).
// Cost: one 768 px canvas drawn and uploaded per frame, one instanced mesh of at most 260 small pieces.
import * as THREE from 'three';
import { SANS, SERIF } from './textures.js';

export class MusicScreen {
  constructor(aspect, title) {
    const w = 768, h = Math.max(240, Math.round(w / Math.max(1.3, aspect))); this.w = w; this.h = h;
    this.cv = document.createElement('canvas'); this.cv.width = w; this.cv.height = h; this.g = this.cv.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.cv); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.minFilter = THREE.LinearFilter; this.tex.generateMipmaps = false;
    this.bins = new Uint8Array(512); this.bands = new Float32Array(64); this.avg = 0.15; this.lastBeat = 0; this.beats = 0; this.hue = 34; this.title = title || ''; this.pulse = 0;
  }
  // one frame from the film analyser; returns 1 on a beat, 2 on a strong one (every fourth), else 0
  draw(an, dt, now) {
    const g = this.g, w = this.w, h = this.h, B = this.bins; if (an) an.getByteFrequencyData(B); else B.fill(0);
    // 64 bands on a log scale over the first 448 bins (about 20 Hz to 9.6 kHz at 44.1 kHz)
    for (let i = 0; i < 64; i++) { const a = Math.floor(Math.pow(448, i / 64)), b = Math.max(a + 1, Math.floor(Math.pow(448, (i + 1) / 64))); let s = 0; for (let j = a; j < b; j++) s += B[j]; const v = s / (b - a) / 255; this.bands[i] += (v - this.bands[i]) * Math.min(1, dt * 18); }
    const bass = (this.bands[2] + this.bands[3] + this.bands[4] + this.bands[5]) / 4; this.avg += (bass - this.avg) * Math.min(1, dt * 1.6);
    let beat = 0; if (bass > this.avg * 1.28 + 0.035 && now - this.lastBeat > 300) { this.lastBeat = now; this.beats++; beat = this.beats % 4 === 0 ? 2 : 1; this.pulse = 1; }
    this.pulse = Math.max(0, this.pulse - dt * 3.2); this.hue = (this.hue + dt * (6 + bass * 30)) % 360;
    // the room behind the light show: a deep wash of the current colour, darker at the edges
    const H = this.hue, bg = g.createRadialGradient(w / 2, h * 0.46, 10, w / 2, h * 0.46, w * 0.62);
    bg.addColorStop(0, `hsl(${H},70%,${14 + this.pulse * 10}%)`); bg.addColorStop(0.55, `hsl(${(H + 40) % 360},60%,6%)`); bg.addColorStop(1, '#030205');
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    // the skyline: the spectrum mirrored about the middle along the bottom, with its reflection
    const n = 48, bw = w / (n * 2), base = h * 0.8;
    for (let i = 0; i < n; i++) { const v = this.bands[Math.min(63, i + 2)], bh = 6 + v * v * h * 0.42, c = `hsl(${(H + i * 4) % 360},85%,${45 + v * 25}%)`;
      for (const x of [w / 2 + i * bw, w / 2 - (i + 1) * bw]) { g.fillStyle = c; g.fillRect(x + 1, base - bh, bw - 2, bh); g.globalAlpha = 0.22; g.fillRect(x + 1, base + 3, bw - 2, bh * 0.45); g.globalAlpha = 1; } }
    // the disc: a bass pulse in the middle, a ring of 96 bars round it
    const cx = w / 2, cy = h * 0.44, r0 = h * (0.16 + bass * 0.07 + this.pulse * 0.03);
    const dg = g.createRadialGradient(cx, cy, 0, cx, cy, r0 * 1.6); dg.addColorStop(0, `hsla(${(H + 20) % 360},90%,${60 + this.pulse * 25}%,0.95)`); dg.addColorStop(0.6, `hsla(${H},90%,40%,0.35)`); dg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = dg; g.beginPath(); g.arc(cx, cy, r0 * 1.6, 0, Math.PI * 2); g.fill();
    g.lineWidth = Math.max(2, w / 320); g.lineCap = 'round';
    for (let i = 0; i < 96; i++) { const v = this.bands[Math.min(63, Math.floor((i < 48 ? i : 95 - i) * 1.25) + 1)], a = -Math.PI / 2 + i / 96 * Math.PI * 2, l = r0 * (0.12 + v * 0.95);
      g.strokeStyle = `hsl(${(H + 180 + i * 2) % 360},90%,${55 + v * 25}%)`; g.beginPath(); g.moveTo(cx + Math.cos(a) * (r0 * 1.06), cy + Math.sin(a) * (r0 * 1.06)); g.lineTo(cx + Math.cos(a) * (r0 * 1.06 + l), cy + Math.sin(a) * (r0 * 1.06 + l)); g.stroke(); }
    g.strokeStyle = 'rgba(224,178,90,0.9)'; g.lineWidth = Math.max(2, w / 260); g.beginPath(); g.arc(cx, cy, r0, 0, Math.PI * 2); g.stroke();
    // the words: the night's name in brass, the song's title
    g.textBaseline = 'alphabetic'; g.textAlign = 'left'; g.fillStyle = 'rgba(224,178,90,0.95)'; g.font = `600 ${Math.round(h * 0.05)}px ${SERIF}`; g.fillText('LUMIÈRE  ·  MUSIC NIGHT', w * 0.04, h * 0.1);
    if (this.title) { g.fillStyle = 'rgba(246,236,216,0.95)'; g.font = `600 ${Math.round(h * 0.065)}px ${SANS}`; g.__fit = [w * 0.04, w * 0.96]; g.fillText('♪  ' + this.title, w * 0.04, h * 0.95); g.__fit = null; }
    this.tex.needsUpdate = true; return beat;
  }
  dispose() { this.tex.dispose(); }
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
