// LUMIERE v14d - the Suite's remote control (the user, 11-26: "an actual 3d modelled remote controlling the TV / projector, no tablet in the
// room ones"). A real object: it lies on the coffee table and on the cinema console; picked up, it is in your right hand at the bottom of
// the view, and you press its keys by tapping them (or with the crosshair and the action key on a keyboard). The keys: power (the TV in the
// living room, the projector in the cinema), play/pause, the previous and next film, volume down and up, the lights.
// The body is an extruded rounded slab; the keys are discs standing 2 mm proud of its face, each over its own printed symbol.
import * as THREE from 'three';

export const KEYS = [
  { id: 'power', x: 0, z: -0.062, r: 0.0105, col: '#b3262f', icon: 'power' },
  { id: 'lights', x: -0.016, z: -0.032, r: 0.0085, col: '#2b2b30', icon: 'sun' },
  { id: 'prev', x: -0.017, z: 0.0, r: 0.0095, col: '#2b2b30', icon: 'prev' },
  { id: 'play', x: 0, z: 0.0, r: 0.012, col: '#c9a35e', icon: 'play' },
  { id: 'next', x: 0.017, z: 0.0, r: 0.0095, col: '#2b2b30', icon: 'next' },
  { id: 'voldown', x: -0.013, z: 0.036, r: 0.009, col: '#2b2b30', icon: 'minus' },
  { id: 'volup', x: 0.013, z: 0.036, r: 0.009, col: '#2b2b30', icon: 'plus' },
  { id: 'cine', x: 0.016, z: -0.032, r: 0.0085, col: '#2b2b30', icon: 'film' },
];
const W = 0.05, L = 0.17, T = 0.016;

function bodyGeo() {
  const s = new THREE.Shape(), w = W / 2, l = L / 2, r = 0.012;
  s.moveTo(-w + r, -l); s.lineTo(w - r, -l); s.quadraticCurveTo(w, -l, w, -l + r); s.lineTo(w, l - r); s.quadraticCurveTo(w, l, w - r, l); s.lineTo(-w + r, l); s.quadraticCurveTo(-w, l, -w, l - r); s.lineTo(-w, -l + r); s.quadraticCurveTo(-w, -l, -w + r, -l);
  const g = new THREE.ExtrudeGeometry(s, { depth: T - 0.004, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 2, curveSegments: 6 });
  g.rotateX(-Math.PI / 2); g.translate(0, 0, 0); return g;   // the face up (+y), its top at y = T - 0.002
}
function faceTex() {
  const c = document.createElement('canvas'); c.width = 160; c.height = 544; const g = c.getContext('2d'), sx = c.width / W, sz = c.height / L, X = (x) => (x + W / 2) * sx, Z = (z) => (z + L / 2) * sz;
  const gr = g.createLinearGradient(0, 0, 0, c.height); gr.addColorStop(0, '#1c1c20'); gr.addColorStop(1, '#0f0f12'); g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = 'rgba(201,163,94,0.55)'; g.lineWidth = 2; g.beginPath(); g.arc(X(0), Z(0), 0.027 * sx, 0, Math.PI * 2); g.stroke();   // the brass ring round the middle keys
  g.fillStyle = '#c9a35e'; g.font = `600 ${Math.round(0.0075 * sz)}px Inter, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('LUMIÈRE', X(0), Z(0.072));
  g.fillStyle = 'rgba(240,226,196,0.7)'; g.font = `500 ${Math.round(0.0045 * sz)}px Inter, sans-serif`; g.fillText('VOL', X(0), Z(0.036)); g.fillText('SUITE', X(0), Z(0.081));
  return new THREE.CanvasTexture(c);
}
function keyTex(icon, col) {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.fillStyle = col; g.beginPath(); g.arc(32, 32, 31, 0, Math.PI * 2); g.fill();
  g.strokeStyle = g.fillStyle = icon === 'play' ? '#1a1206' : '#f2e6cc'; g.lineWidth = 5; g.lineCap = 'round'; g.lineJoin = 'round';
  if (icon === 'power') { g.beginPath(); g.arc(32, 34, 14, -Math.PI * 0.32, Math.PI * 1.32); g.stroke(); g.beginPath(); g.moveTo(32, 14); g.lineTo(32, 32); g.stroke(); }
  else if (icon === 'play') { g.beginPath(); g.moveTo(22, 18); g.lineTo(22, 46); g.lineTo(38, 32); g.closePath(); g.fill(); g.fillRect(41, 18, 5, 28); }
  else if (icon === 'prev' || icon === 'next') { const s = icon === 'next' ? 1 : -1; g.beginPath(); g.moveTo(32 - 10 * s, 20); g.lineTo(32 - 10 * s, 44); g.lineTo(32 + 4 * s, 32); g.closePath(); g.fill(); g.fillRect(icon === 'next' ? 38 : 21, 20, 5, 24); }
  else if (icon === 'minus' || icon === 'plus') { g.beginPath(); g.moveTo(18, 32); g.lineTo(46, 32); if (icon === 'plus') { g.moveTo(32, 18); g.lineTo(32, 46); } g.stroke(); }
  else if (icon === 'sun') { g.beginPath(); g.arc(32, 32, 8, 0, Math.PI * 2); g.fill(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; g.beginPath(); g.moveTo(32 + Math.cos(a) * 13, 32 + Math.sin(a) * 13); g.lineTo(32 + Math.cos(a) * 19, 32 + Math.sin(a) * 19); g.stroke(); } }
  else if (icon === 'film') { g.strokeRect(17, 21, 30, 22); g.beginPath(); g.moveTo(17, 27); g.lineTo(47, 27); g.moveTo(17, 37); g.lineTo(47, 37); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// one remote model: body, its printed face, the keys (meshes named key:<id>)
export function makeRemote() {
  const grp = new THREE.Group(), body = new THREE.Mesh(bodyGeo(), new THREE.MeshBasicMaterial({ color: 0x141417 })); grp.add(body);
  const ft = faceTex(); ft.colorSpace = THREE.SRGBColorSpace; const face = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.004, L - 0.004), new THREE.MeshBasicMaterial({ map: ft }));
  face.rotation.x = -Math.PI / 2; face.position.y = T + 0.0012; grp.add(face);
  const keys = [];
  for (const k of KEYS) { const m = new THREE.Mesh(new THREE.CylinderGeometry(k.r, k.r * 1.04, 0.003, 20), [new THREE.MeshBasicMaterial({ color: 0x2a2a2e }), new THREE.MeshBasicMaterial({ map: keyTex(k.icon, k.col) }), new THREE.MeshBasicMaterial({ color: 0x111111 })]);
    m.position.set(k.x, T + 0.0012 + 0.0035, k.z); m.name = 'key:' + k.id; grp.add(m); keys.push(m);
    const hit = new THREE.Mesh(new THREE.CylinderGeometry(k.r * 1.9, k.r * 1.9, 0.01, 12), new THREE.MeshBasicMaterial({ visible: false })); hit.position.copy(m.position); hit.name = 'hit:' + k.id; grp.add(hit); keys.push(hit); }
  grp.userData.keys = keys; return grp;
}

export class Remote {
  constructor(engine, sound) {
    this.engine = engine; this.sound = sound; this.held = false; this.inHand = makeRemote(); this.inHand.visible = false; this._ray = new THREE.Raycaster(); this._v = new THREE.Vector2(); this.press = null; this.pushT = {};
    this.onKey = null; this.k = 0;
  }
  pickUp() { if (this.held) return; this.held = true; this.k = 0; if (!this.inHand.parent) this.engine.vm.add(this.inHand); this.inHand.visible = true; this.sound && this.sound.click && this.sound.click(); }
  putDown() { if (!this.held) return; this.held = false; this.inHand.visible = false; if (this.inHand.parent) this.inHand.parent.remove(this.inHand); this.sound && this.sound.click && this.sound.click(); }
  // in the right hand at the bottom right of the view, tilted towards you so its face can be read and pressed
  update(dt) { if (!this.held) return; this.k = Math.min(1, this.k + dt * 3); const e = 1 - Math.pow(1 - this.k, 3), cam = this.engine.vmCam, a = cam.aspect || 1.6;
    this.inHand.position.set(0.042 * Math.min(1.8, a), -0.06 - (1 - e) * 0.12, -0.2); this.inHand.rotation.set(0.86, -0.14, 0.05);   // in the lower middle-right, clear of the HUD's corner buttons
    for (const id in this.pushT) { const m = this.inHand.userData.keys.find((q) => q.name === 'key:' + id); this.pushT[id] -= dt; if (m) m.position.y = 0.016 + 0.0012 + 0.0035 - (this.pushT[id] > 0 ? 0.0016 : 0); if (this.pushT[id] <= 0) delete this.pushT[id]; } }
  // a tap at (x, y) CSS pixels: the key under it, pressed; true if a key took the tap
  tap(x, y) {
    if (!this.held) return false; const cam = this.engine.vmCam; this._v.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1); this._ray.setFromCamera(this._v, cam);
    this.inHand.updateMatrixWorld(true); const hits = this._ray.intersectObjects(this.inHand.userData.keys, false); if (!hits.length) return false;
    const id = hits[0].object.name.split(':')[1]; this.pushT[id] = 0.18; if (this.sound && this.sound.click) this.sound.click(); if (this.onKey) this.onKey(id); return true;
  }
}
