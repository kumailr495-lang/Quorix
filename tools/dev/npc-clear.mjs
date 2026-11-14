// LUMIERE v11 - nobody stands or walks inside the building (the user's photo, 2026-11-14: a guest half inside the marble pier by the
// exit leaves). Boots the game with a full lobby, parks the frame loop's crowd update and drives the crowd with its own clock for
// SECONDS of game time (10 steps a second), then checks every person on their feet, 5 times a second, against every active collision
// segment in the band a body fills (0.4 to 1.75 m over their feet), and every two people standing still against each other.
// Headless Chromium + SwiftShader: the real game code, not the phone.
// usage: node tools/dev/npc-clear.mjs [SECONDS=600]      exit 1 when anyone is inside a wall, a prop or another person
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const SECONDS = +(process.argv[2] || 600), BODY = 0.2, PAIR = 0.42, CROSS = 0.3, STUCK = 15;
const WWW = path.resolve('www');
let pwPath = process.env.PW_PATH; if (!pwPath) for (const p of ['/opt/node-tools/node_modules/playwright/index.mjs', '/opt/npm-tools/node_modules/playwright/index.mjs']) if (fs.existsSync(p)) { pwPath = p; break; }
const { chromium } = await import(pwPath || 'playwright');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.webp': 'image/webp', '.css': 'text/css', '.woff2': 'font/woff2', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.ogg': 'audio/ogg', '.webm': 'video/webm' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(WWW, u === '/' ? 'index.html' : u); if (!f.startsWith(WWW) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise((ok) => srv.listen(0, '127.0.0.1', ok)); const port = srv.address().port;
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 480, height: 270 } });
await ctx.addInitScript(() => { try { localStorage.setItem('lumiere.settings.v5', JSON.stringify({ lang: 'en', graphics: 'low', tutorialAsked: true, npcs: 'many' })); } catch (e) {} });
const p = await ctx.newPage(); const log = []; p.on('pageerror', (e) => log.push(`[pageerror] ${e.message}`)); p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') log.push(`[${m.type()}] ${m.text()}`); });
await p.goto(`http://127.0.0.1:${port}/index.html?play=quick`);
await p.waitForFunction(() => window.__lumiere && window.__lumiere.ready && window.__lumiere.mode === 'play', null, { timeout: 300000 });
await p.waitForTimeout(1500);
const r = await p.evaluate(({ SECONDS, BODY, PAIR, CROSS, STUCK }) => {
  const L = window.__lumiere, C = L.crowd, W = L.world, S = W.walls.S, K = W.walls.K, G = W.walls.B;
  L.player.place(0, 8.0, Math.PI, 0, 0); C.setDensity('high');
  const pd = (px, pz, x0, z0, x1, z1) => { const vx = x1 - x0, vz = z1 - z0, l = vx * vx + vz * vz, t = l > 0 ? Math.max(0, Math.min(1, ((px - x0) * vx + (pz - z0) * vz) / l)) : 0; return Math.hypot(px - x0 - vx * t, pz - z0 - vz * t); };
  const nearest = (x, z, y) => { let best = 9, at = -1; for (let gx = Math.floor((x - 0.6) / 2); gx <= Math.floor((x + 0.6) / 2); gx++) for (let gz = Math.floor((z - 0.6) / 2); gz <= Math.floor((z + 0.6) / 2); gz++) { const l = G.get(gx * 4096 + gz); if (!l) continue;
    for (const i of l) { if (K && !K[i]) continue; const j = i * 6; if (S[j + 5] <= y + 0.4 || S[j + 4] >= y + 1.75) continue; const d = pd(x, z, S[j], S[j + 1], S[j + 2], S[j + 3]); if (d < best) { best = d; at = j; } } } return [best, at]; };
  const upd = C.update.bind(C); C.update = () => {};   // the frame loop's update is parked: this clock alone moves the crowd
  let now = performance.now(), samples = 0, worst = 9, worstAt = null; const dt = 0.1, walls = new Map(), pairs = new Map(), moved = new Map(), cross = new Map(), last = new Map(), stuck = new Map();
  const onFoot = (a) => a.alive && a.ch && (a.sit || 0) < 0.2 && !(a.path && a.path[a.pi] && (a.path[a.pi].ride || a.path[a.pi].seat)) && !((W.roomAt(a.x, a.y, a.z) || '').startsWith('hall'));
  for (let k = 0, n = Math.round(SECONDS / dt); k < n; k++) {
    now += dt * 1000; upd(dt, now, L.player, W.vis); if (k % 2) continue;
    const live = C.agents.filter(onFoot);
    for (const a of live) { const [d, j] = nearest(a.x, a.z, a.y || 0); samples++; const key0 = a.id; moved.set(key0, (moved.get(key0) || 0) + (a.path ? 1 : 0));
      if (d < worst) { worst = d; worstAt = { role: a.role, at: [+a.x.toFixed(2), +(a.y || 0).toFixed(2), +a.z.toFixed(2)], wall: j >= 0 ? [S[j], S[j + 1], S[j + 2], S[j + 3]].map((v) => +v.toFixed(2)) : null }; }
      if (d < BODY) { const key = `${a.role} at ${a.x.toFixed(1)},${a.z.toFixed(1)} wall ${j >= 0 ? [S[j], S[j + 1], S[j + 2], S[j + 3]].map((v) => v.toFixed(2)).join(',') : '?'}`; walls.set(key, Math.min(walls.get(key) ?? 9, +d.toFixed(2))); } }
    for (const a of live) { const q = last.get(a.id); if (!a.path) { last.delete(a.id); continue; } if (!q || Math.hypot(a.x - q.x, a.z - q.z) > 0.05) last.set(a.id, { x: a.x, z: a.z, t: k * dt }); else if (k * dt - q.t > STUCK) stuck.set(`${a.role} at ${a.x.toFixed(1)},${a.z.toFixed(1)}`, +(k * dt - q.t).toFixed(0)); }
    for (let i = 0; i < live.length; i++) for (let m = i + 1; m < live.length; m++) { const a = live[i], c = live[m]; if (!a.path && !c.path) continue; if (Math.abs((a.y || 0) - (c.y || 0)) > 0.8) continue; const d = Math.hypot(a.x - c.x, a.z - c.z); if (d < CROSS) { const key = `${a.role}${a.path ? '(walking)' : ''}+${c.role}${c.path ? '(walking)' : ''} at ${a.x.toFixed(1)},${a.z.toFixed(1)}`; cross.set(key, Math.min(cross.get(key) ?? 9, +d.toFixed(2))); } }
    const still = live.filter((a) => !a.path);
    for (let i = 0; i < still.length; i++) for (let m = i + 1; m < still.length; m++) { const a = still[i], c = still[m]; if (Math.abs((a.y || 0) - (c.y || 0)) > 0.8) continue; const d = Math.hypot(a.x - c.x, a.z - c.z); if (d < PAIR) { const key = `${a.role}+${c.role} at ${a.x.toFixed(1)},${a.z.toFixed(1)}`; pairs.set(key, Math.min(pairs.get(key) ?? 9, +d.toFixed(2))); } }
  }
  C.update = upd;
  const guests = C.agents.filter((a) => a.role === 'guest'), walked = guests.filter((a) => (moved.get(a.id) || 0) > 0).length;
  const M = C._mill || { spots: [], dropped: [] };
  return { spots: M.spots.length, dropped: M.dropped, cross: [...cross].map(([k, d]) => `${d.toFixed(2)} m  ${k}`).slice(0, 20), crossCount: cross.size, stuck: [...stuck].map(([k, t]) => `${t} s  ${k}`).slice(0, 20), stuckCount: stuck.size, samples, people: C.agents.length, guests: guests.length, walked, worst: +worst.toFixed(3), worstAt, walls: [...walls].map(([k, d]) => `${d.toFixed(2)} m  ${k}`).slice(0, 40), wallCount: walls.size, pairs: [...pairs].map(([k, d]) => `${d.toFixed(2)} m  ${k}`).slice(0, 20), pairCount: pairs.size };
}, { SECONDS, BODY, PAIR, CROSS, STUCK });
console.log(`${r.people} people (${r.guests} guests, ${r.walked} of them walked), ${SECONDS} s of game time, ${r.samples} samples; closest anyone came to a wall or prop: ${r.worst} m ${JSON.stringify(r.worstAt)}`);
console.log(r.wallCount ? `inside a wall or prop (centre closer than ${BODY} m): ${r.wallCount}\n  ` + r.walls.join('\n  ') : `nobody inside a wall or prop (${BODY} m)`);
console.log(`lobby spots: ${r.spots} (hand-placed ones dropped: ${r.dropped.length ? JSON.stringify(r.dropped) : 'none'})`);
console.log(r.crossCount ? `walking through someone (closer than ${CROSS} m): ${r.crossCount}\n  ` + r.cross.join('\n  ') : `nobody walked through anyone (${CROSS} m)`);
console.log(r.stuckCount ? `walkers stuck more than ${STUCK} s: ${r.stuckCount}\n  ` + r.stuck.join('\n  ') : `no walker stuck more than ${STUCK} s`);
console.log(r.pairCount ? `standing inside each other (closer than ${PAIR} m): ${r.pairCount}\n  ` + r.pairs.join('\n  ') : `nobody standing inside anyone else (${PAIR} m)`);
if (log.length) console.log(log.slice(0, 12).join('\n'));
await b.close(); srv.close(); process.exit(r.wallCount || r.pairCount || r.crossCount || r.stuckCount || !r.walked ? 1 : 0);
