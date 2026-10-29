// First-person controller: virtual stick + drag-look (portrait & landscape), keyboard fallback, circle-vs-AABB collision, sit/stand.
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export class Player {
  constructor(engine, world) {
    this.cam = engine.camera; this.world = world; this.x = world.spawn.x; this.z = world.spawn.z; this.yaw = world.spawn.yaw * Math.PI / 180; this.pitch = 0;
    this.y = 0; this.eye = 1.62; this.vx = 0; this.vz = 0; this.stick = { x: 0, y: 0 }; this.sprint = false; this.keys = {}; this.seated = null; this.anim = null; this.phase = 0; this.radius = 0.3;
    this.locked = false; this.onStep = null; this.moving = 0;
  }
  attach(canvas, stickEl, knobEl, sprintEl) {
    let lookId = null, lx = 0, ly = 0, stickId = null;
    const R = 44, setKnob = (dx, dy) => { knobEl.style.transform = `translate(${dx}px,${dy}px)`; };
    const stickMove = (e) => { const r = stickEl.getBoundingClientRect(); let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2); const d = Math.hypot(dx, dy); if (d > R) { dx *= R / d; dy *= R / d; } setKnob(dx, dy); this.stick.x = dx / R; this.stick.y = -dy / R; };
    stickEl.addEventListener('pointerdown', (e) => { stickId = e.pointerId; stickEl.setPointerCapture(e.pointerId); stickMove(e); e.preventDefault(); });
    stickEl.addEventListener('pointermove', (e) => { if (e.pointerId === stickId) stickMove(e); });
    const stickEnd = (e) => { if (e.pointerId === stickId) { stickId = null; this.stick.x = this.stick.y = 0; setKnob(0, 0); } };
    stickEl.addEventListener('pointerup', stickEnd); stickEl.addEventListener('pointercancel', stickEnd);
    canvas.addEventListener('pointerdown', (e) => { if (lookId === null) { lookId = e.pointerId; lx = e.clientX; ly = e.clientY; canvas.setPointerCapture(e.pointerId); } });
    canvas.addEventListener('pointermove', (e) => { if (e.pointerId !== lookId || this.locked) return; const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY; this.turn(dx * 0.0046, dy * 0.0040); });
    const lookEnd = (e) => { if (e.pointerId === lookId) lookId = null; }; canvas.addEventListener('pointerup', lookEnd); canvas.addEventListener('pointercancel', lookEnd);
    const hold = (on) => { this.sprint = on; sprintEl.classList.toggle('on', on); };
    sprintEl.addEventListener('pointerdown', (e) => { sprintEl.setPointerCapture(e.pointerId); hold(true); e.preventDefault(); }); sprintEl.addEventListener('pointerup', () => hold(false)); sprintEl.addEventListener('pointercancel', () => hold(false));
    addEventListener('keydown', (e) => { this.keys[e.code] = true; if (e.code === 'ShiftLeft') hold(true); }); addEventListener('keyup', (e) => { this.keys[e.code] = false; if (e.code === 'ShiftLeft') hold(false); });
  }
  turn(dyaw, dpitch) {
    this.yaw -= dyaw; this.pitch = clamp(this.pitch - dpitch, this.seated ? -0.55 : -1.25, this.seated ? 0.6 : 1.25);
    if (this.seated) { const base = this.seated.yaw, d = Math.atan2(Math.sin(this.yaw - base), Math.cos(this.yaw - base)); this.yaw = base + clamp(d, -1.3, 1.3); }
  }
  sit(spot, standAt) {
    const sy = spot.yaw * Math.PI / 180; this.seated = { yaw: sy, standAt };
    this.anim = { t: 0, d: 0.7, from: { x: this.x, y: this.y + this.eye, z: this.z, yaw: this.yaw }, to: { x: spot.x, y: spot.y, z: spot.z, yaw: sy } }; this.vx = this.vz = 0;
  }
  standUp() { if (!this.seated) return; const s = this.seated; this.seated = null; this.x = s.standAt.x; this.z = s.standAt.z; this.y = this.world.floorY(this.x, this.z); this.anim = null; this.pitch = 0; }
  collide() {
    for (let it = 0; it < 3; it++) for (const b of this.world.colliders) {
      const cx = clamp(this.x, b.x0, b.x1), cz = clamp(this.z, b.z0, b.z1); let dx = this.x - cx, dz = this.z - cz; const d2 = dx * dx + dz * dz;
      if (d2 >= this.radius * this.radius) continue;
      if (d2 > 1e-8) { const d = Math.sqrt(d2), k = (this.radius - d) / d; this.x += dx * k; this.z += dz * k; }
      else { const l = this.x - b.x0, r = b.x1 - this.x, t = this.z - b.z0, bt = b.z1 - this.z, m = Math.min(l, r, t, bt); if (m === l) this.x = b.x0 - this.radius; else if (m === r) this.x = b.x1 + this.radius; else if (m === t) this.z = b.z0 - this.radius; else this.z = b.z1 + this.radius; }
    }
  }
  update(dt) {
    const cam = this.cam; if (!Number.isFinite(this.x + this.z + this.y + this.yaw)) { this.x = this.world.spawn.x; this.z = this.world.spawn.z; this.y = 0; this.yaw = 0; this.seated = null; this.anim = null; this.vx = this.vz = 0; }   // safety net
    if (this.seated) {
      if (this.anim) { const a = this.anim; a.t = Math.min(1, a.t + dt / a.d); const k = a.t * a.t * (3 - 2 * a.t);
        this.x = a.from.x + (a.to.x - a.from.x) * k; this.z = a.from.z + (a.to.z - a.from.z) * k; this.camY = a.from.y + (a.to.y - a.from.y) * k;
        const dy = Math.atan2(Math.sin(a.to.yaw - a.from.yaw), Math.cos(a.to.yaw - a.from.yaw)); if (a.t < 1) this.yaw = a.from.yaw + dy * k; else this.anim = null; }
      cam.position.set(this.x, this.camY ?? this.y + this.eye, this.z);
    } else {
      let sx = this.stick.x, sy = this.stick.y; const k = this.keys; if (k.KeyW || k.ArrowUp) sy += 1; if (k.KeyS || k.ArrowDown) sy -= 1; if (k.KeyD || k.ArrowRight) sx += 1; if (k.KeyA || k.ArrowLeft) sx -= 1;
      const m = Math.hypot(sx, sy); if (m > 1) { sx /= m; sy /= m; } const dead = m < 0.12 ? 0 : 1; const sp = (this.sprint ? 3.5 : 2.0) * dead * (this.locked ? 0 : 1);
      const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw), rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
      const tx = (fx * sy + rx * sx) * sp, tz = (fz * sy + rz * sx) * sp, a = 1 - Math.exp(-dt * 10);
      this.vx += (tx - this.vx) * a; this.vz += (tz - this.vz) * a; this.x += this.vx * dt; this.z += this.vz * dt; this.collide();
      const spd = Math.hypot(this.vx, this.vz); this.moving = spd; this.phase += spd * dt * 2.2;
      if (spd > 0.4 && Math.floor(this.phase * 0.5) !== Math.floor((this.phase - spd * dt * 2.2) * 0.5)) this.onStep?.(spd);
      this.y += (this.world.floorY(this.x, this.z) - this.y) * (1 - Math.exp(-dt * 12)); this.camY = null;
      cam.position.set(this.x, this.y + this.eye + Math.sin(this.phase * Math.PI) * 0.018 * Math.min(1, spd / 2), this.z);
    }
    cam.rotation.set(this.pitch, this.yaw, 0);
  }
}
