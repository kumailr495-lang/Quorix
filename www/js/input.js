// LUMIERE v10 - every way in (the user: "support for VR, keyboard and mouse, controller, mobile; auto-detect it, and nothing breaks if
// someone comes from those inputs"). The last thing you touched decides the mode (body[data-input] = touch | kbm | pad), the HUD shows
// what fits it, and switching is instant: pick up a controller mid-film, or tap the screen again.
//   keyboard + mouse: WASD / arrows to walk, Shift to run, the mouse to look (click the view to capture it, Esc to let go), E or Enter
//     for the action on screen, Esc or P for the pause menu, T to chat in a room
//   controller (standard mapping): left stick walk, right stick look, A action, B back, Start pause, Y tablet, X seat bell, LT/RT run;
//     in menus the d-pad moves between buttons and A presses
//   phone VR (a Cardboard-style viewer): the picture in two halves for the two eyes and your head turns the view (the phone's motion
//     sensor); a controller walks you. Settings or the VR button switch it on; a tap with two fingers or B leaves it.
import * as THREE from 'three';
const DEAD = 0.18, dz = (v) => (Math.abs(v) < DEAD ? 0 : (v - Math.sign(v) * DEAD) / (1 - DEAD));

export class Input {
  // c: { player, engine, canvas, ui, action(), pause(), back(), tablet(), bell(), chat(), modal() }
  constructor(c) {
    this.c = c; this.mode = 'touch'; this.pad = null; this.prev = []; this.vr = false; this._q = new THREE.Quaternion(); this._e = new THREE.Euler();
    this.setMode(matchMedia('(pointer: fine)').matches && !('ontouchstart' in window) ? 'kbm' : 'touch');
    addEventListener('pointerdown', (e) => this.setMode(e.pointerType === 'touch' || e.pointerType === 'pen' ? 'touch' : 'kbm'), { capture: true });
    addEventListener('keydown', (e) => this.key(e));
    addEventListener('gamepadconnected', (e) => { this.pad = e.gamepad.index; this.setMode('pad'); });
    addEventListener('gamepaddisconnected', (e) => { if (this.pad === e.gamepad.index) { this.pad = null; this.setMode('touch'); } });
    // the mouse looks once the view has it (pointer lock); a drag still works without
    c.canvas.addEventListener('click', () => { if (this.mode === 'kbm' && !this.c.modal() && !this.vr && document.pointerLockElement !== c.canvas) c.canvas.requestPointerLock?.(); });
    addEventListener('mousemove', (e) => { if (document.pointerLockElement !== c.canvas || this.c.modal()) return; const s = (c.player.settings.sensitivity ?? 1) * 0.0026; c.player.turn(e.movementX * s, e.movementY * s * (c.player.settings.invertY ? -1 : 1)); });
    document.addEventListener('pointerlockchange', () => document.body.classList.toggle('mouselook', document.pointerLockElement === c.canvas));
    // phone VR: the head's turn from the motion sensor
    this._ori = null; addEventListener('deviceorientation', (e) => { if (e.alpha != null) this._ori = e; });
    addEventListener('touchstart', (e) => { if (this.vr && e.touches.length >= 2) this.setVR(false); }, { passive: true });
  }
  setMode(m) { if (m === this.mode) return; this.mode = m; document.body.dataset.input = m; if (m !== 'kbm' && document.pointerLockElement) document.exitPointerLock?.(); }
  key(e) {
    const tag = (e.target && e.target.tagName) || ''; if (tag === 'INPUT' || tag === 'TEXTAREA') return; this.setMode('kbm'); const c = this.c;
    if (e.code === 'KeyE' || e.code === 'Enter') { if (!c.modal()) { c.action(); e.preventDefault(); } }
    else if (e.code === 'KeyP' || (e.code === 'Escape' && !document.pointerLockElement)) c.pause();
    else if (e.code === 'KeyT') { c.chat(); e.preventDefault(); }
  }
  // per frame, after the player has moved: the controller, and the head in VR
  update(dt) {
    const pads = navigator.getGamepads ? navigator.getGamepads() : []; let g = this.pad != null ? pads[this.pad] : null;
    if (!g) for (const p of pads) if (p && p.connected) { g = p; this.pad = p.index; break; }
    if (g) this.padFrame(g, dt);
    if (this.vr) this.head();
  }
  padFrame(g, dt) {
    const c = this.c, P = c.player, a = g.axes, b = g.buttons.map((x) => !!(x && (x.pressed || x.value > 0.5))), down = (i) => b[i] && !this.prev[i];
    const lx = dz(a[0] || 0), ly = dz(a[1] || 0), rx = dz(a[2] || 0), ry = dz(a[3] || 0);
    if (lx || ly || rx || ry || b.some(Boolean)) this.setMode('pad');
    if (this.mode === 'pad') {
      if (c.modal()) { this.menuNav(g, down); }
      else { P.stick.x = lx; P.stick.y = -ly; const s = (P.settings.sensitivity ?? 1) * 2.4 * dt; if (rx || ry) P.turn(rx * s, ry * s * (P.settings.invertY ? -1 : 1)); P.setSprint && P.setSprint(b[6] || b[7] || b[10]);
        if (down(0)) c.action(); if (down(3)) c.tablet(); if (down(2)) c.bell(); }
      if (down(9)) c.pause(); if (down(1)) { if (this.vr) this.setVR(false); else c.back(); }
    }
    this.prev = b;
  }
  // the d-pad walks the buttons of the open menu or panel; A presses the focused one
  menuNav(g, down) {
    const root = [...document.querySelectorAll('.scrim:not([hidden]), #menu:not([hidden]), #tablet:not([hidden])')].pop(); if (!root) return;
    const list = [...root.querySelectorAll('button, [role=button], input, select, a[href]')].filter((e) => e.offsetParent && !e.disabled); if (!list.length) return;
    let i = list.indexOf(document.activeElement); const step = (d) => { i = i < 0 ? 0 : (i + d + list.length) % list.length; list[i].focus({ preventScroll: false }); list[i].scrollIntoView?.({ block: 'nearest' }); };
    if (down(12) || down(14)) step(-1); else if (down(13) || down(15)) step(1); else if (down(0) && i >= 0) list[i].click();
  }
  // ---------------------------------------------------------------- phone VR
  setVR(on) {
    if (on && typeof DeviceOrientationEvent !== 'undefined' && DeviceOrientationEvent.requestPermission) DeviceOrientationEvent.requestPermission().catch(() => {});
    this.vr = !!on; this.c.engine.stereo = this.vr; document.body.classList.toggle('vr', this.vr); this._yaw0 = null; if (this.vr && document.pointerLockElement) document.exitPointerLock?.();
    this.c.engine.resize && this.c.engine.resize();
  }
  head() {
    const o = this._ori; if (!o) return; const cam = this.c.engine.camera, P = this.c.player, d = THREE.MathUtils.DEG2RAD, orient = ((screen.orientation && screen.orientation.angle) || window.orientation || 0) * d;
    // the sensor's frame to the camera's (as three.js's old DeviceOrientationControls did): beta x, alpha y, -gamma z, then the screen's turn
    this._e.set(o.beta * d, o.alpha * d, -o.gamma * d, 'YXZ'); this._q.setFromEuler(this._e); this._q.multiply(Q1); this._q.multiply(new THREE.Quaternion().setFromAxisAngle(Z, -orient));
    const e = new THREE.Euler().setFromQuaternion(this._q, 'YXZ'); if (this._yaw0 == null) this._yaw0 = e.y - P.yaw;   // where you face when VR starts stays ahead
    P.yaw = e.y - this._yaw0; P.pitch = THREE.MathUtils.clamp(e.x, -1.3, 1.3); cam.rotation.set(P.pitch, P.yaw, e.z, 'YXZ');
  }
}
const Q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)), Z = new THREE.Vector3(0, 0, 1);
