// LUMIERE v14 - work, missions and daily tasks (the user, 11-20: "money systems, jobs, missions, tasks ... take this to a whole other level
// without changing the idea and core part"). Everything here happens in the cinema and pays Lumiere Credits (credits.js):
//   jobs      three shifts with real play: the popcorn counter (make up each customer's order from the menu against the clock), the ticket
//             gate (admit or turn away each guest by their ticket: screen, time, date, already torn), cleaning a screen after its show
//             (litter lies in the rows: pick it up, empty the bag into the hall's bin). You go to the place (the floor guide shows the
//             way) and start the shift there.
//   missions  chains of steps told by the game's own events (buy a ticket, take your seat, watch a house film, work a shift ...)
//   tasks     three a day from a pool, the same three for everyone on that date
// Events come from main.js (career.event): ticket item seated bell binned photo lift flush watchMin filmEnd chat emote mpJoin mpWatch,
// and from the jobs: served checked cleaned shift.
import * as THREE from 'three';
import { t } from './i18n.js';

export const MISSIONS = [
  { id: 'first', steps: [['ticket', 1, 100], ['item', 1, 60], ['seated', 1, 60], ['watchMin', 10, 150], ['photo', 1, 60], ['shift', 1, 200]] },
  { id: 'regular', steps: [['filmEnd', 1, 250], ['served', 10, 150], ['cleaned', 20, 150], ['bell', 1, 60], ['lift', 1, 40], ['checked', 8, 120]] },
  { id: 'together', steps: [['mpJoin', 1, 150], ['chat', 3, 80], ['emote', 2, 60], ['mpWatch', 1, 250]] },
];
const POOL = [['watchMin', 20, 120], ['served', 5, 100], ['cleaned', 8, 90], ['photo', 2, 60], ['lift', 1, 40], ['bell', 1, 50], ['flush', 1, 30], ['item', 2, 60], ['checked', 6, 90], ['chat', 1, 40], ['seated', 2, 40]];
// the shop: permanent things (emotes, outfit colours, theatre themes) and passes used up one at a time
export const SHOP = [
  { id: 'emote_dance', price: 300, kind: 'emote' },
  { id: 'look_gold', price: 600, kind: 'look' }, { id: 'look_crimson', price: 450, kind: 'look' }, { id: 'look_ivory', price: 450, kind: 'look' },
  { id: 'theme_crimson', price: 800, kind: 'theme' }, { id: 'theme_emerald', price: 800, kind: 'theme' }, { id: 'theme_gold', price: 1200, kind: 'theme' },
  { id: 'pass_priority', price: 120, kind: 'pass', consumable: true },
];
const KEY = 'lumiere.career.v1';
const today = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
const seeded = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0; return () => { h = (Math.imul(h, 1664525) + 1013904223) >>> 0; return h / 4294967296; }; };
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

export class Career {
  constructor(credits, hooks = {}) {
    this.c = credits; this.h = hooks; let s = null; try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { s = null; }
    this.s = s && typeof s === 'object' ? s : { m: 0, step: 0, prog: 0, daily: null, stats: {}, v: 2 }; this.s.stats = this.s.stats || {};
    if (!this.s.v) { if (this.s.m >= 1) this.s.m++; this.s.v = 2; }   // v14 the 'home' chain went in second: an older save past the first mission keeps its place
    if (this.s.v === 2) { if (this.s.m >= 2) this.s.m--; else if (this.s.m === 1) { this.s.m = 1; this.s.step = 0; this.s.got = 0; } this.s.v = 3; }   // v14b the flat's chain is gone: a save on or past it moves back one
    this._daily();
  }
  _save() { try { localStorage.setItem(KEY, JSON.stringify(this.s)); } catch (e) { /* storage off */ } }
  _daily() {
    const d = today(); if (this.s.daily && this.s.daily.d === d) return; const R = seeded('lumiere' + d), pool = POOL.slice(), tasks = [];
    while (tasks.length < 3) { const i = Math.floor(R() * pool.length); const [ev, n, r] = pool.splice(i, 1)[0]; tasks.push({ ev, n, r, got: 0, done: false }); }
    this.s.daily = { d, tasks }; this._save();
  }
  // a thing happened: count it for the mission step and the day's tasks; pay what completes
  event(ev, n = 1) {
    this._daily(); this.s.stats[ev] = (this.s.stats[ev] || 0) + n; let paid = 0;
    const M = MISSIONS[this.s.m];
    if (M) { const [sev, need, rew] = M.steps[this.s.step]; if (sev === ev) { this.s.prog += n; if (this.s.prog >= need) { paid += this.c.earn(rew, `mission:${M.id}:${this.s.step}`); this.h.toast && this.h.toast(t('job.stepDone', { what: this.stepText(sev, need), lc: rew }), 3200);
      this.s.step++; this.s.prog = 0; if (this.s.step >= M.steps.length) { this.h.toast && setTimeout(() => this.h.toast(t('job.missionDone', { name: t('job.m.' + M.id) }), 3600), 3300); this.s.m++; this.s.step = 0; } } } }
    for (const k of this.s.daily.tasks) { if (k.done || k.ev !== ev) continue; k.got = Math.min(k.n, k.got + n); if (k.got >= k.n) { k.done = true; paid += this.c.earn(k.r, `task:${k.ev}`); this.h.toast && this.h.toast(t('job.taskDone', { what: this.stepText(k.ev, k.n), lc: k.r }), 3000); } }
    this._save(); if (paid && this.h.coin) this.h.coin(paid); return paid;
  }
  stepText(ev, n) { return t('job.ev.' + ev, { n }); }
  mission() { const M = MISSIONS[this.s.m]; if (!M) return null; const [ev, need, rew] = M.steps[this.s.step]; return { id: M.id, name: t('job.m.' + M.id), step: this.s.step, of: M.steps.length, text: this.stepText(ev, need), got: this.s.prog, need, rew }; }
  tasks() { this._daily(); return this.s.daily.tasks.map((k) => ({ ...k, text: this.stepText(k.ev, k.n) })); }
}

// ------------------------------------------------------------------------------------------------ the shifts
const MENU = ['salted', 'caramel', 'cheese', 'nachos', 'cola', 'water', 'coffee'];
const NAMES = ['Aarav', 'Priya', 'Lucía', 'Omar', 'Mei', 'Zara', 'Daniel', 'Ayesha', 'Kabir', 'Sofía', 'Hamza', 'Ananya', 'Mateo', 'Noor', 'Ishaan', 'Elena'];
const pickOf = (a) => a[Math.floor(Math.random() * a.length)];
export class Jobs {
  // hooks: credits, career, sound, toast, onModal(open), world, player, room(), hallState(hallId) -> 'idle' | 'playing' | ..., route(node) / routeTo(pt)
  constructor(hooks) { this.h = hooks; this.job = null; this.litter = []; this.bag = 0; this._v = new THREE.Vector3(); }
  get active() { return !!this.job; }
  // accept a job from the phone: it starts where it is done
  accept(kind) {
    this.cancel(true); const W = this.h.world;
    if (kind === 'clean') { const hall = W.halls.filter((h) => this.h.hallState(h.id) !== 'playing' && this.h.hallState(h.id) !== 'countdown').sort(() => Math.random() - 0.5)[0]; if (!hall) { this.h.toast(t('job.noHall'), 2600); return false; } this.job = { kind, hall, spawned: false, picked: 0, paid: 0 }; this.h.staffPass && this.h.staffPass(true); }
    else this.job = { kind, started: false, paid: 0 };
    this.h.toast(t('job.go.' + kind, { name: this.job.hall ? this.job.hall.name.replace('LUMIERE ', '') : '' }), 3200); return true;
  }
  cancel(quiet) { if (!this.job) return; if (this.job.kind === 'clean' && this.h.staffPass) this.h.staffPass(false); for (const l of this.litter) l.mesh.removeFromParent(); this.litter = []; this.bag = 0; if (this.panel) { this.panel.remove(); this.panel = null; this.h.onModal(false); } if (!quiet) this.h.toast(t('job.cancelled'), 2200); this.job = null; }
  // where the floor guide should lead (wayfind.js): { key, pts }
  goal(way, p) {
    const j = this.job; if (!j || j.started) return null;
    if (j.kind === 'counter') return { key: 'job.goal.counter', pts: way.route(p, 'conQ') };
    if (j.kind === 'gate') return { key: 'job.goal.gate', pts: way.route(p, 'gateW') };
    if (j.kind === 'clean' && !j.spawned) { const h = j.hall, e = way.toHall(p, h); return e ? { key: 'job.goal.clean', vars: { name: h.name.replace('LUMIERE ', '') }, pts: e } : null; }
    return null;
  }
  // what the action button offers here (main.js prompts): { label, fn } or null
  prompt(room, p, hallKey, look = () => true) {
    const j = this.job; if (!j) return null;
    if (j.kind === 'counter' && !j.started && room === 'lobby' && p.y < 1 && Math.hypot(p.x + 12.8, p.z + 4.0) < 2.4 && look(-12.8, 1.0, -4.0, 1.1, 3.4)) return { label: t('job.start.counter'), fn: () => this.counter() };
    if (j.kind === 'gate' && !j.started && room === 'lobby' && p.y < 1 && Math.hypot(p.x - 6.6, p.z - 5.6) < 2.2 && look(6.6, 1.0, 5.6, 0.9, 3.2)) return { label: t('job.start.gate'), fn: () => this.gate() };
    if (j.kind === 'clean') {
      if (!j.spawned && hallKey === j.hall.key) this.spawnLitter(j.hall);
      if (j.spawned) {
        let best = null, bd = 2.2; for (const l of this.litter) { if (l.got) continue; const d = Math.hypot(l.x - p.x, l.z - p.z); if (d < bd && Math.abs(l.y - p.y) < 1.2 && look(l.x, l.y + 0.05, l.z, 0.2, 2.6)) { bd = d; best = l; } }   // v14d only the piece the crosshair is on (v14b p.y is your feet)
        if (best && this.bag < 8) return { label: t('job.pick'), fn: () => this.pick(best) };
        if (this.bag && this.h.nearBin()) return { label: t('job.empty', { n: this.bag }), fn: () => this.empty() };
      }
    }
    return null;
  }
  // ---------- cleaning
  spawnLitter(h) {
    const j = this.job; j.spawned = true; const seats = h.seats.filter((s) => !s.taken), n = Math.min(10, seats.length), room = h.room;
    const GEO = { cup: new THREE.CylinderGeometry(0.045, 0.035, 0.16, 12), tub: new THREE.CylinderGeometry(0.09, 0.065, 0.2, 14), wrap: new THREE.BoxGeometry(0.16, 0.012, 0.1) };
    const COL = { cup: 0xb81c2c, tub: 0xd8c7a0, wrap: 0x2a3a7a };
    for (let i = 0; i < n; i++) {
      const s = seats.splice(Math.floor(Math.random() * seats.length), 1)[0], kind = pickOf(['cup', 'cup', 'tub', 'wrap']), fx = -Math.sin(s.yaw), fz = -Math.cos(s.yaw);
      const x = s.x + fx * 0.48 + (Math.random() - 0.5) * 0.3, z = s.z + fz * 0.48 + (Math.random() - 0.5) * 0.3, y = s.y;
      const H = [0, 0, 0], F = [0, 0, 0]; room.lights.at(x, y + 0.1, z, 0, 1, 0, H, F); const k = Math.min(1, 0.25 + (H[0] + H[1] + H[2] + F[0] + F[1] + F[2]) * 0.6);
      const m = new THREE.Mesh(GEO[kind], new THREE.MeshBasicMaterial({ color: new THREE.Color(COL[kind]).multiplyScalar(k) }));
      if (kind !== 'wrap') { m.rotation.z = Math.PI / 2; m.rotation.y = Math.random() * 6.28; m.position.set(x, y + (kind === 'cup' ? 0.045 : 0.085), z); } else { m.rotation.y = Math.random() * 6.28; m.position.set(x, y + 0.008, z); }
      room.group.add(m); this.litter.push({ x, y, z, mesh: m, got: false });
    }
    this.h.toast(t('job.litter', { n }), 3000);
  }
  pick(l) { l.got = true; l.mesh.removeFromParent(); this.bag++; this.h.sound.pop && this.h.sound.pop(); }
  empty() {
    const j = this.job, n = this.bag; this.bag = 0; this.h.sound.bin && this.h.sound.bin(); j.picked += n; const pay = this.h.credits.earn(12 * n, 'job:clean'); j.paid += pay; this.h.career.event('cleaned', n); this.h.coin(pay);
    if (this.litter.every((l) => l.got)) { const b = this.h.credits.earn(50, 'job:clean:bonus'); j.paid += b; this.h.career.event('shift'); this.h.toast(t('job.done.clean', { lc: j.paid }), 3800); this.litter = []; this.job = null; this.h.staffPass && this.h.staffPass(false); }
  }
  // ---------- the popcorn counter: six customers, each order made up from the menu against a 20 s clock
  counter() {
    const j = this.job; j.started = true; j.n = 0; j.ok = 0; this.h.onModal(true);
    const P = this.panel = el('div', 'job-panel scrim center'), box = el('div', 'job-box'); P.appendChild(box); document.body.appendChild(P);
    const head = el('header', 'job-head'), title = el('b', null, t('job.title.counter')), prog = el('span', 'job-prog'), quit = el('button', 'icon x'); quit.setAttribute('aria-label', t('job.quit')); quit.innerHTML = '<svg class="ic"><use href="#i-close"/></svg>';
    quit.addEventListener('click', () => this.finishCounter()); head.append(title, prog, quit); box.appendChild(head);
    const who = el('div', 'job-who'), clock = el('i', 'job-clock'), tray = el('div', 'job-tray'), grid = el('div', 'job-menu'), row = el('div', 'job-row');
    box.append(who, clock, tray, grid, row); const serve = el('button', 'btn primary', t('job.serve')), clear = el('button', 'btn ghost', t('job.clear')); row.append(clear, serve);
    let order = null, made = [], t0 = 0, timer = 0;
    const show = () => { tray.innerHTML = ''; if (!made.length) tray.appendChild(el('small', null, t('job.trayEmpty'))); for (let i = 0; i < made.length; i++) { const c = el('button', 'job-chip', t('item.' + made[i])); c.addEventListener('click', () => { made.splice(i, 1); show(); }); tray.appendChild(c); } };
    for (const k of MENU) { const b = el('button', 'job-item'); b.appendChild(el('b', null, t('item.' + k))); b.addEventListener('click', () => { if (made.length < 4) { made.push(k); this.h.sound.click(); show(); } }); grid.appendChild(b); }
    const next = () => {
      if (j.n >= 6) { this.finishCounter(); return; } j.n++; made = []; show(); const k = 1 + Math.floor(Math.random() * 3); order = []; for (let i = 0; i < k; i++) order.push(pickOf(MENU)); order.sort();
      prog.textContent = t('job.of', { n: j.n, of: 6 }); who.innerHTML = ''; who.appendChild(el('b', null, pickOf(NAMES))); who.appendChild(el('span', null, order.map((q) => t('item.' + q)).join(' · ')));
      t0 = performance.now(); clearInterval(timer); timer = setInterval(() => { const left = Math.max(0, 1 - (performance.now() - t0) / 20000); clock.style.transform = `scaleX(${left.toFixed(3)})`; if (left <= 0) { clearInterval(timer); this.h.toast(t('job.tooSlow'), 1800); setTimeout(next, 600); } }, 100);
    };
    clear.addEventListener('click', () => { made = []; show(); });
    serve.addEventListener('click', () => {
      const a = made.slice().sort().join(','), b = order.join(','); if (a !== b) { this.h.toast(t('job.wrong'), 1600); this.h.sound.liftDeny && this.h.sound.liftDeny(); return; }
      clearInterval(timer); const secs = (performance.now() - t0) / 1000, pay = this.h.credits.earn(30 + Math.max(0, Math.round(20 - secs * 1.5)), 'job:counter'); j.paid += pay; j.ok++;
      this.h.career.event('served'); this.h.coin(pay); this.h.sound.pay && this.h.sound.pay(); setTimeout(next, 450);
    });
    this._stopTimer = () => clearInterval(timer); next();
  }
  finishCounter() { const j = this.job; if (this._stopTimer) this._stopTimer(); if (this.panel) { this.panel.remove(); this.panel = null; this.h.onModal(false); } if (!j) return; if (j.ok) this.h.career.event('shift'); this.h.toast(t('job.done.counter', { n: j.ok, lc: j.paid }), 3800); this.job = null; }
  // ---------- the ticket gate: eight guests; admit the ones whose ticket is for this screen, this show, today, not yet torn
  gate() {
    const j = this.job; j.started = true; j.n = 0; j.ok = 0; this.h.onModal(true); const films = this.h.films();
    const P = this.panel = el('div', 'job-panel scrim center'), box = el('div', 'job-box'); P.appendChild(box); document.body.appendChild(P);
    const head = el('header', 'job-head'), prog = el('span', 'job-prog'), quit = el('button', 'icon x'); quit.innerHTML = '<svg class="ic"><use href="#i-close"/></svg>'; quit.addEventListener('click', () => this.finishGate());
    head.append(el('b', null, t('job.title.gate')), prog, quit); box.appendChild(head);
    const hall = 1 + Math.floor(Math.random() * 4), film = pickOf(films), hh = 18 + Math.floor(Math.random() * 4), time = `${hh}:${Math.random() < 0.5 ? '00' : '30'}`;
    const now = el('div', 'job-now'); now.innerHTML = ''; now.append(el('small', null, t('job.admitting')), el('b', null, `${t('tk.screen')} ${hall} · ${film} · ${time}`)); box.appendChild(now);
    const card = el('div', 'job-ticket'), row = el('div', 'job-row'), no = el('button', 'btn ghost', t('job.refuse')), yes = el('button', 'btn primary', t('job.admit')); row.append(no, yes); box.append(card, row);
    let cur = null;
    const next = () => {
      if (j.n >= 8) { this.finishGate(); return; } j.n++; prog.textContent = t('job.of', { n: j.n, of: 8 });
      const bad = Math.random() < 0.4 ? pickOf(['screen', 'time', 'date', 'torn']) : null, tk = { hall, film, time, date: t('job.today'), torn: false };
      if (bad === 'screen') tk.hall = 1 + (hall % 4); if (bad === 'time') tk.time = `${hh + 1}:${time.slice(-2)}`; if (bad === 'date') tk.date = t('job.yesterday'); if (bad === 'torn') tk.torn = true;
      cur = { ok: !bad, why: bad }; card.innerHTML = ''; card.classList.toggle('torn', tk.torn);
      card.append(el('small', null, pickOf(NAMES)), el('b', null, tk.film), el('span', null, `${t('tk.screen')} ${tk.hall} · ${tk.time} · ${tk.date}`), el('em', null, `${t('tk.row')} ${'ABCDEFGH'[Math.floor(Math.random() * 8)]} · ${t('tk.seat')} ${1 + Math.floor(Math.random() * 18)}`));
    };
    const judge = (admit) => { if (admit === cur.ok) { const pay = this.h.credits.earn(15, 'job:gate'); j.paid += pay; j.ok++; this.h.career.event('checked'); this.h.coin(pay); this.h.sound.ticket && this.h.sound.ticket(); }
      else { this.h.toast(t('job.gateWrong.' + (cur.why || 'ok')), 2000); this.h.sound.liftDeny && this.h.sound.liftDeny(); } setTimeout(next, 350); };
    yes.addEventListener('click', () => judge(true)); no.addEventListener('click', () => judge(false)); next();
  }
  finishGate() { const j = this.job; if (this.panel) { this.panel.remove(); this.panel = null; this.h.onModal(false); } if (!j) return; if (j.ok) this.h.career.event('shift'); this.h.toast(t('job.done.gate', { n: j.ok, lc: j.paid }), 3800); this.job = null; }
}
