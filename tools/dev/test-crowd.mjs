import fs from 'node:fs'; import path from 'node:path';
const ctxProxy = () => new Proxy({}, { get(t, p) { if (p === 'createImageData') return (w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }); if (p in t) return t[p]; return () => ({ addColorStop() {} }); }, set(t, p, v) { t[p] = v; return true; } });
globalThis.document = { createElement: () => ({ width: 0, height: 0, style: {}, getContext: () => ctxProxy(), toDataURL: () => '' }) }; globalThis.window = globalThis; globalThis.innerWidth = 1280; globalThis.innerHeight = 720; globalThis.devicePixelRatio = 2; globalThis.addEventListener = () => {};
globalThis.Request = class { constructor(u) { this.url = u; } };
globalThis.fetch = async (req) => { const u = req.url || req; const buf = fs.readFileSync(path.join(process.env.LUM_WWW, u)); return { status: 200, ok: true, headers: { get: () => null }, body: undefined, arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), clone() { return this; } }; };
const THREE = await import('three'); const { buildWorld, HALLS } = await import('./www/js/world.js'); const { Materials } = await import('./www/js/materials.js'); const { Crowd } = await import('./www/js/npc.js'); const { roomAt } = await import('./www/js/layout.js');
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(68, 16 / 9, 0.12, 60);
const engine = { scene, camera, lightScale: 1, _lights: [], addLight(l) { this._lights.push({ l, base: l.intensity }); scene.add(l); return l; }, addGlowMaterial: (m, c) => { m.color.copy(c); return m; } };
const mats = new Materials(engine); const world = await buildWorld(engine, mats, () => {}); const stats = { bubbles: 0, laughs: 0, applause: 0, cheer: 0, greet: 0, guideDone: 0 };
const crowd = new Crowd(world, mats, { bubble: () => stats.bubbles++, laugh: () => stats.laughs++, applause: () => stats.applause++, cheer: () => stats.cheer++, greet: () => stats.greet++, guideDone: () => stats.guideDone++, filmPlaying: (id) => filmOn === id });
crowd.attach(scene); crowd.init(); let filmOn = null; const player = { x: 0, z: 16.4 }, vis = new Set(world.keys);
const hist = () => { const h = {}; for (const n of crowd.all) h[n.state] = (h[n.state] || 0) + 1; return JSON.stringify(h); };
console.log('NPCs at start:', crowd.all.length, hist());
const offWho = {}; let nan = 0, off = 0, t = 0, cpu = 0, steps = 0; const dt = 0.05, stuck = new Map(); const log = [];
const step = () => { const t0 = performance.now(); crowd.update(dt, t * 1000, player, vis); world.update(dt, crowd.actors(player), t * 1000); cpu += performance.now() - t0; steps++; t += dt;
  for (const n of crowd.all) { if (!Number.isFinite(n.x + n.z + n.y + n.yaw)) nan++; if ((n.state === 'walk' || n.state === 'idle') && !['reception', 'barkeep', 'vendor'].includes(n.role) && !world.nav.walkable(n.x, n.z)) { off++; offWho[n.role + ':' + n.name + '@' + n.x.toFixed(1) + ',' + n.z.toFixed(1)] = (offWho[n.role + ':' + n.name + '@' + n.x.toFixed(1) + ',' + n.z.toFixed(1)] || 0) + 1; }
    if (n.state === 'walk') { const s = stuck.get(n.id) || { x: n.x, z: n.z, t: t }; if (Math.hypot(n.x - s.x, n.z - s.z) > 0.5) stuck.set(n.id, { x: n.x, z: n.z, t }); else { stuck.set(n.id, s); if (t - s.t > 12) { log.push(`STUCK ${n.name} ${n.role} at (${n.x.toFixed(1)},${n.z.toFixed(1)}) ${roomAt(n.x, n.z)}`); stuck.set(n.id, { x: n.x, z: n.z, t }); } } } else stuck.delete(n.id); } };
for (; t < 60;) step(); console.log('t=60s lobby life:', hist(), '| bubbles', stats.bubbles, 'greets', stats.greet);
// the player reserves a seat in hall I; audience arrives (player outside) and the film starts
world.halls[0].seats.find((s) => s.id === 'D10').taken = true; crowd.fillHall('I', 12, false, 'D10'); for (; t < 150;) step(); console.log('t=150s arrivals:', 'viewers seated', crowd.viewers('I').filter((n) => n.state === 'seated').length, 'of', crowd.viewers('I').length, '| walking', crowd.viewers('I').filter((n) => n.state === 'walk' || n.state === 'sidestep').length);
filmOn = 'I'; crowd.onFilmStart('I'); for (; t < 180;) step(); console.log('t=180s film running; laughs', stats.laughs, 'cheer', stats.cheer, '| reacts', crowd.viewers('I').filter((n) => n.react).length);
// usher guides the player to D10 (player follows)
const usher = crowd.byId.usher; player.x = usher.x + 1; player.z = usher.z + 1; crowd.startTalk(usher, player.x, player.z); crowd.endTalk(usher); const okg = crowd.guide(usher, 'I', 'D10'); let gs = 0; while (usher.state === 'guide' && gs++ < 4000) { player.x = usher.x + 0.8; player.z = usher.z + 0.8; step(); } console.log('usher guide path ok:', okg, '| reached', usher.state !== 'guide', 'in', (gs * dt).toFixed(0), 's | guideDone', stats.guideDone, '| usher at', usher.x.toFixed(1), usher.z.toFixed(1), roomAt(usher.x, usher.z));
filmOn = null; crowd.onFilmEnd('I'); for (let k = 0; k < 14 / dt; k++) step(); console.log('film end + 14 s: applause', stats.applause, '| viewers still seated', crowd.viewers('I').filter((n) => n.state === 'seated').length, '| leaving', crowd.viewers('I').filter((n) => n.state === 'leave' || n.state === 'standing').length);
for (let k = 0; k < 90 / dt; k++) step(); console.log('film end + 104 s: viewers left in hall', crowd.viewers('I').length, '| total NPCs', crowd.all.length, hist());
for (; t < 360;) step(); console.log('t=6min:', hist(), '| bubbles', stats.bubbles);
console.log('off-grid samples by NPC (top):', Object.entries(offWho).sort((a, b) => b[1] - a[1]).slice(0, 6).map((e) => e.join(' x')).join(' | ')); console.log('NaN positions:', nan, '| NPC off-grid while walking/idle:', off, '| stuck reports:', log.length); if (log.length) console.log(log.slice(0, 6).join('\n'));
console.log('AI CPU per frame (all', crowd.all.length, 'NPCs, incl. skinning prep):', (cpu / steps).toFixed(2), 'ms avg');
// doors: they should have opened at some point and be closed again when nobody is near
console.log('doors:', world.doors.map((d) => d.open.toFixed(2)).join(' '));

// path timings (cold vs cached) from the street doors to the far hall
{ const nav = world.nav; nav.cache = new Map(); let t0 = performance.now(); nav.path(0, 17.45, 24.15, -20); const cold = performance.now() - t0; t0 = performance.now(); for (let i = 0; i < 100; i++) nav.path(0.2, 17.45, 24.15, -20); console.log('path entrance -> hall III aisle: cold', cold.toFixed(2), 'ms | cached', ((performance.now() - t0) / 100).toFixed(3), 'ms'); }
