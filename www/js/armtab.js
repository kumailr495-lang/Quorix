// LUMIERE v14 - the armrest tablet as a thing in the seat (the user, 11-21: "the armrest tablet ... appears out of seat"). When you open the
// tablet in your seat, a tablet on a chrome swivel arm rises out of the armrest at your right hand, turns to you and lights up; the screen
// you use (tablet.js) comes up as it arrives, and when you close it the tablet folds back down into the armrest. Seen in the hall like
// anything else (other people's tablets stay down). The screen shows the LUMIERE start page drawn on a canvas; the body is dark aluminium.
import * as THREE from 'three';
import { SEAT } from './hallmath.js';

const RISE = 0.55;   // seconds up (and down)
const ease = (t) => t * t * (3 - 2 * t);

export class ArmTablet {
  constructor(world) {
    this.world = world; this.t = 0; this.want = 0; this.seat = null; this.group = null; this.onUp = null;
    const g = new THREE.Group(); g.name = 'armtab'; g.visible = false;
    const metal = new THREE.MeshBasicMaterial({ color: 0x2a2c31 }), chrome = new THREE.MeshBasicMaterial({ color: 0x9aa0a8 }), black = new THREE.MeshBasicMaterial({ color: 0x050506 });
    // the arm: a post out of the armrest, a knuckle, a short boom to the tablet's back plate
    this.post = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.3, 16), chrome); this.post.position.y = -0.15; g.add(this.post);
    const knuckle = new THREE.Mesh(new THREE.SphereGeometry(0.019, 16, 12), chrome); g.add(knuckle);
    this.head = new THREE.Group(); g.add(this.head);
    const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.12, 12), chrome); boom.rotation.z = Math.PI / 2; boom.position.x = -0.06; this.head.add(boom);
    // the tablet: a rounded slab (an extruded rounded rectangle), a black glass face 1 mm proud, the canvas screen on it
    const W = 0.26, H = 0.175, R = 0.014, sh = new THREE.Shape(); sh.moveTo(-W / 2 + R, -H / 2); sh.lineTo(W / 2 - R, -H / 2); sh.quadraticCurveTo(W / 2, -H / 2, W / 2, -H / 2 + R); sh.lineTo(W / 2, H / 2 - R);
    sh.quadraticCurveTo(W / 2, H / 2, W / 2 - R, H / 2); sh.lineTo(-W / 2 + R, H / 2); sh.quadraticCurveTo(-W / 2, H / 2, -W / 2, H / 2 - R); sh.lineTo(-W / 2, -H / 2 + R); sh.quadraticCurveTo(-W / 2, -H / 2, -W / 2 + R, -H / 2);
    const body = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.009, bevelEnabled: true, bevelSize: 0.003, bevelThickness: 0.003, bevelSegments: 3, curveSegments: 8 }), metal); body.position.set(-0.12, 0, -0.0105);
    this.tab = new THREE.Group(); this.tab.add(body); this.head.add(this.tab);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.006, H - 0.006), black); glass.position.set(-0.12, 0, 0.0028); this.tab.add(glass);
    const c = document.createElement('canvas'); c.width = 512; c.height = 344; this.canvas = c; this.tex = new THREE.CanvasTexture(c); this.tex.colorSpace = THREE.SRGBColorSpace; this.draw();
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.018, H - 0.018), new THREE.MeshBasicMaterial({ map: this.tex, toneMapped: false })); scr.position.set(-0.12, 0, 0.0032); this.tab.add(scr); this.scr = scr;
    this.group = g;
  }
  draw() {
    const g = this.canvas.getContext('2d'), w = this.canvas.width, h = this.canvas.height, bg = g.createLinearGradient(0, 0, w, h); bg.addColorStop(0, '#191522'); bg.addColorStop(1, '#2a1a10'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = '#c9a35e'; g.fillRect(0, 0, w, 5); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#f0e2c4'; g.font = '600 46px "Cormorant Garamond", serif'; g.fillText('LUMIÈRE', w / 2, 92);
    const tiles = [['#e2564a', 'ORDER'], ['#3d8bfd', 'FILMS'], ['#c9a35e', 'REMOTE'], ['#4cbf7a', 'STREAM']];
    tiles.forEach(([col, lab], i) => { const x = 40 + i * 112, y = 170; g.fillStyle = 'rgba(255,255,255,0.07)'; g.fillRect(x, y, 96, 110); g.fillStyle = col; g.beginPath(); g.arc(x + 48, y + 44, 24, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#e8dcc6'; g.font = '600 15px Inter, sans-serif'; g.fillText(lab, x + 48, y + 92); });
    this.tex.needsUpdate = true;
  }
  // show at a seat (the hall's seat record): the tablet rises at the right armrest; onUp runs once it is up
  show(hall, seat, onUp) {
    if (!hall || !seat) { onUp && onUp(); return; } const sd = SEAT[seat.kind] || SEAT.rocker, g = this.group; if (g.parent !== hall.room.group) hall.room.group.add(g);
    const cs = Math.cos(seat.yaw), sn = Math.sin(seat.yaw), u = sd.w / 2 + 0.06, v = 0.02;   // seat local: +x across (the sitter's right is -x), +z the front
    g.position.set(seat.x - u * cs + v * sn, seat.y + 0.62, seat.z + u * sn + v * cs); g.rotation.set(0, seat.yaw, 0);
    this.seat = seat; this.want = 1; this.onUp = onUp; g.visible = true; this.t = Math.min(this.t, 1);
  }
  hide() { this.want = 0; this.onUp = null; }
  get busy() { return this.want === 1 && this.t < 1; }
  update(dt) {
    if (!this.group.visible) return; const was = this.t; this.t = Math.max(0, Math.min(1, this.t + (this.want ? dt : -dt) / RISE)); const k = ease(this.t);
    // up out of the armrest (it sinks 30 cm into it), then the head swings toward you and tilts back
    this.post.scale.y = 0.15 + 0.85 * k; this.post.position.y = -0.15 * this.post.scale.y; this.head.position.y = -0.3 + 0.3 * Math.min(1, k * 1.25);
    const s = ease(Math.max(0, (k - 0.45) / 0.55)); this.head.rotation.set(-0.55 * s, 0.9 * s, 0); this.scr.material.opacity = 1;
    if (was < 1 && this.t >= 1 && this.onUp) { const f = this.onUp; this.onUp = null; f(); }
    if (this.t <= 0 && !this.want) { this.group.visible = false; this.seat = null; }
  }
}
