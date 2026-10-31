// LUMIERE v5 - first-person controller: virtual stick + drag-look (sensitivity / invert from settings), keyboard + mouse fallback,
// circle-vs-box collision (spatial buckets), smooth stairs, and animated sitting / standing (never a teleport).
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), ease = (t) => t * t * (3 - 2 * t), easeOut = (t) => 1 - (1 - t) * (1 - t), lerp = (a, b, t) => a + (b - a) * t;
const adiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
export const EYE = 1.62;
export class Player {
  constructor(engine, world, settings) {
    this.cam = engine.camera; this.world = world; this.settings = settings; this.x = 0; this.z = 16.5; this.yaw = 0; this.pitch = 0; this.y = 0; this.eyeY = EYE; this.vx = 0; this.vz = 0;
    this.stick = { x: 0, y: 0 }; this.sprint = false; this.keys = {}; this.seated = null; this.anim = null; this.phase = 0; this.radius = 0.24; this.locked = false; this.onStep = null; this.moving = 0; this._near = []; this.bob = 0;
  }
  attach(canvas, stickEl, knobEl, sprintEl) {
    let lookId = null, lx = 0, ly = 0, stickId = null; const R = 46;
    const setKnob = (dx, dy) => { knobEl.style.transform = `translate(${dx}px,${dy}px)`; };
    const stickMove = (e) => { const r = stickEl.getBoundingClientRect(); let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2); const d = Math.hypot(dx, dy); if (d > R) { dx *= R / d; dy *= R / d; } setKnob(dx, dy); this.stick.x = dx / R; this.stick.y = -dy / R; };
    stickEl.addEventListener('pointerdown', (e) => { stickId = e.pointerId; stickEl.setPointerCapture(e.pointerId); stickEl.classList.add('on'); stickMove(e); e.preventDefault(); });
    stickEl.addEventListener('pointermove', (e) => { if (e.pointerId === stickId) stickMove(e); });
    const stickEnd = (e) => { if (e.pointerId === stickId) { stickId = null; this.stick.x = this.stick.y = 0; setKnob(0, 0); stickEl.classList.remove('on'); } };
    stickEl.addEventListener('pointerup', stickEnd); stickEl.addEventListener('pointercancel', stickEnd);
    canvas.addEventListener('pointerdown', (e) => { if (lookId === null) { lookId = e.pointerId; lx = e.clientX; ly = e.clientY; canvas.setPointerCapture(e.pointerId); } });
    canvas.addEventListener('pointermove', (e) => { if (e.pointerId !== lookId || this.locked) return; const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY; const s = (this.settings.sensitivity ?? 1) * 0.0042; this.turn(dx * s, dy * s * (this.settings.invertY ? -1 : 1)); });
    const lookEnd = (e) => { if (e.pointerId === lookId) lookId = null; }; canvas.addEventListener('pointerup', lookEnd); canvas.addEventListener('pointercancel', lookEnd);
    const hold = (on) => { this.sprint = on; sprintEl.classList.toggle('on', on); };
    sprintEl.addEventListener('pointerdown', (e) => { sprintEl.setPointerCapture(e.pointerId); hold(!this.sprint || e.pointerType !== 'touch' ? true : false); e.preventDefault(); });
    sprintEl.addEventListener('pointerup', (e) => { if (e.pointerType !== 'touch') hold(false); }); sprintEl.addEventListener('pointercancel', () => hold(false));
    addEventListener('keydown', (e) => { this.keys[e.code] = true; if (e.code === 'ShiftLeft') hold(true); }); addEventListener('keyup', (e) => { this.keys[e.code] = false; if (e.code === 'ShiftLeft') hold(false); });
    this.setSprint = hold;
  }
  turn(dyaw, dpitch) {
    if (this.anim) return; this.yaw -= dyaw; const s = this.seated; this.pitch = clamp(this.pitch - dpitch, s ? -0.6 : -1.2, s ? 0.75 : 1.2);
    if (s) { const d = adiff(this.yaw, s.yaw); this.yaw = s.yaw + clamp(d, -1.45, 1.45); }
  }
  get busy() { return !!this.anim; }
  // sit: walk/turn to the seat front, lower with a slight lean, settle back. pose = { x, y (eye height, world), z, yaw (camera yaw) }, standAt = { x, z }
  sit(pose, standAt, onDone) {
    const fx = pose.x - Math.sin(pose.yaw) * 0.35, fz = pose.z - Math.cos(pose.yaw) * 0.35;   // a step in front of the seat (camera yaw 0 looks to -z)
    this.vx = this.vz = 0; this.seated = { yaw: pose.yaw, standAt, pose };
    const y0 = this.y + this.eyeY, fy = this.world.floorY(fx, fz) + EYE, d1 = Math.min(1.1, 0.35 + Math.hypot(fx - this.x, fz - this.z) / 1.6);
    this.anim = { kind: 'sit', t: 0, keys: [
      { d: d1, from: { x: this.x, z: this.z, y: y0, yaw: this.yaw, pitch: this.pitch }, to: { x: fx, z: fz, y: fy, yaw: pose.yaw, pitch: -0.12 }, curve: ease },
      { d: 0.95, to: { x: pose.x - Math.sin(pose.yaw) * 0.04, z: pose.z - Math.cos(pose.yaw) * 0.04, y: pose.y - 0.06, yaw: pose.yaw, pitch: -0.2 }, curve: (t) => t < 0.15 ? t * 0.6 : ease(t) },
      { d: 0.55, to: { x: pose.x, z: pose.z, y: pose.y, yaw: pose.yaw, pitch: 0.02 }, curve: easeOut }], done: onDone };
  }
  // stand: lean forward and rise, then step out to the aisle / lane
  standUp(onDone) {
    if (!this.seated || this.anim) return false; const s = this.seated, p = s.pose, sa = s.standAt, ty = this.world.floorY(sa.x, sa.z) + EYE, yaw = this.yaw;
    const mx = p.x - Math.sin(p.yaw) * 0.32, mz = p.z - Math.cos(p.yaw) * 0.32;
    this.anim = { kind: 'stand', t: 0, keys: [
      { d: 0.45, from: { x: p.x, z: p.z, y: this.cam.position.y, yaw, pitch: this.pitch }, to: { x: p.x - Math.sin(p.yaw) * 0.08, z: p.z - Math.cos(p.yaw) * 0.08, y: p.y - 0.05, yaw, pitch: -0.28 }, curve: ease },
      { d: 0.75, to: { x: mx, z: mz, y: this.world.floorY(mx, mz) + EYE - 0.02, yaw, pitch: -0.05 }, curve: (t) => easeOut(t) },
      { d: 0.6, to: { x: sa.x, z: sa.z, y: ty, yaw: Math.atan2(-(sa.x - mx), -(sa.z - mz)) || yaw, pitch: 0 }, curve: ease }], done: () => { this.seated = null; onDone && onDone(); } };
    return true;
  }
  // instant placement (fade-covered jumps only)
  place(x, z, yaw, pitch = 0) { this.x = x; this.z = z; this.yaw = yaw; this.pitch = pitch; this.y = this.world.floorY(x, z); this.vx = this.vz = 0; this.anim = null; this.seated = null; }
  placeSeated(pose, standAt) { this.seated = { yaw: pose.yaw, standAt, pose }; this.anim = null; this.x = pose.x; this.z = pose.z; this.yaw = pose.yaw; this.pitch = 0; this.camY = pose.y; }
  collide() {
    const near = this.world.collidersNear(this.x, this.z, this._near), r = this.radius;
    for (let it = 0; it < 3; it++) for (const b of near) {
      const cx = clamp(this.x, b.x0, b.x1), cz = clamp(this.z, b.z0, b.z1); let dx = this.x - cx, dz = this.z - cz; const d2 = dx * dx + dz * dz; if (d2 >= r * r) continue;
      if (d2 > 1e-8) { const d = Math.sqrt(d2), k = (r - d) / d; this.x += dx * k; this.z += dz * k; }
      else { const l = this.x - b.x0, rr = b.x1 - this.x, t = this.z - b.z0, bt = b.z1 - this.z, m = Math.min(l, rr, t, bt); if (m === l) this.x = b.x0 - r; else if (m === rr) this.x = b.x1 + r; else if (m === t) this.z = b.z0 - r; else this.z = b.z1 + r; }
    }
    // v8: people are solid too (circles from crowd.bodiesNear)
    if (this.dyn) for (const c of this.dyn) { const dx = this.x - c.x, dz = this.z - c.z, d = Math.hypot(dx, dz), m = r + c.r; if (d < m && d > 1e-4) { this.x = c.x + dx / d * m; this.z = c.z + dz / d * m; if (c.a && this.onBump) this.onBump(c.a); } }
  }
  update(dt) {
    const cam = this.cam; if (!Number.isFinite(this.x + this.z + this.y + this.yaw)) { this.place(0, 16.5, 0); }
    if (this.anim) {
      const a = this.anim; a.t += dt; let acc = 0, from = a.keys[0].from;
      for (let i = 0; i < a.keys.length; i++) { const k = a.keys[i]; if (a.t <= acc + k.d || i === a.keys.length - 1) { const t = clamp((a.t - acc) / k.d, 0, 1), e = k.curve(t);
          this.x = lerp(from.x, k.to.x, e); this.z = lerp(from.z, k.to.z, e); this.camY = lerp(from.y, k.to.y, e); this.yaw = from.yaw + adiff(k.to.yaw, from.yaw) * e; this.pitch = lerp(from.pitch, k.to.pitch, e);
          if (i === a.keys.length - 1 && t >= 1) { this.anim = null; if (a.kind === 'stand') { this.y = this.world.floorY(this.x, this.z); this.camY = null; } a.done && a.done(); } break; }
        acc += k.d; from = k.to; }
      cam.position.set(this.x, this.camY, this.z);
    } else if (this.seated) { const p = this.seated.pose; this.x = p.x; this.z = p.z; cam.position.set(p.x, p.y + Math.sin(performance.now() * 0.0011) * 0.004, p.z); }
    else {
      let sx = this.stick.x, sy = this.stick.y; const k = this.keys; if (k.KeyW || k.ArrowUp) sy += 1; if (k.KeyS || k.ArrowDown) sy -= 1; if (k.KeyD || k.ArrowRight) sx += 1; if (k.KeyA || k.ArrowLeft) sx -= 1;
      const m = Math.hypot(sx, sy); if (m > 1) { sx /= m; sy /= m; } const dead = m < 0.1 ? 0 : 1, sp = (this.sprint ? 3.6 : 1.9) * dead * (this.locked ? 0 : 1);
      const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw), rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
      const tx = (fx * sy + rx * sx) * sp, tz = (fz * sy + rz * sx) * sp, a = 1 - Math.exp(-dt * 9);
      this.vx += (tx - this.vx) * a; this.vz += (tz - this.vz) * a;
      const ox = this.x, oz = this.z, oy = this.world.floorY(ox, oz); this.x += this.vx * dt; this.z += this.vz * dt; this.collide();
      const ny = this.world.floorY(this.x, this.z); if (Math.abs(ny - oy) > 0.42) { this.x = ox; this.z = oz; this.vx *= 0.3; this.vz *= 0.3; }   // risers, stage edges: treat as walls
      const spd = Math.hypot(this.vx, this.vz); this.moving = spd; const ph0 = this.phase; this.phase += spd * dt * 1.9;
      if (spd > 0.5 && Math.floor(this.phase) !== Math.floor(ph0)) this.onStep?.(spd);
      const fy = this.world.floorY(this.x, this.z); this.y += (fy - this.y) * (1 - Math.exp(-dt * (fy > this.y ? 14 : 10)));
      this.bob += ((spd > 0.3 ? 1 : 0) - this.bob) * Math.min(1, dt * 6);
      cam.position.set(this.x, this.y + EYE + Math.sin(this.phase * Math.PI) * 0.022 * this.bob * Math.min(1, spd / 2), this.z); this.camY = null;
    }
    cam.rotation.set(this.pitch, this.yaw, Math.sin(this.phase * Math.PI * 0.5) * 0.003 * this.bob);
  }
}
