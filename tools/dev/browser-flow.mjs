// Functional test through real DOM clicks: talk -> reserve -> choose film/seat -> confirm -> take me to my seat -> show starts; audio paths exercised.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const [,, WWW_ARG, OUT] = process.argv; const WWW = path.resolve(WWW_ARG || 'www');
 fs.mkdirSync(OUT, { recursive: true }); const { chromium } = await import(process.env.PW_PATH || '/opt/npm-tools/node_modules/playwright/index.mjs');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary', '.woff2': 'font/woff2', '.webm': 'video/webm' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(WWW, u === '/' ? 'index.html' : u); if (!fs.existsSync(f)) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: 800, height: 360 }, deviceScaleFactor: 1, hasTouch: true }); const p = await ctx.newPage(); const log = [];
p.on('console', (m) => log.push(`[${m.type()}] ${m.text()}`)); p.on('pageerror', (e) => log.push(`[pageerror] ${e.message}`));
await p.goto(`http://127.0.0.1:${srv.address().port}/index.html?fixscale=0.6`); await p.waitForFunction(() => window.__lumiere && !document.querySelector('#hud').hidden, null, { timeout: 120000 });
const L = (fn, arg) => p.evaluate(fn, arg); const step = async (name, ms = 800) => { await p.waitForTimeout(ms); await p.screenshot({ path: path.join(OUT, name + '.jpg'), type: 'jpeg', quality: 75 }); const st = await L(() => { const W = window.__lumiere, P = W.player; return { room: W.world.roomAt(P.x, P.z), seated: !!P.seated, talk: W.talk.open, modal: !document.querySelector('#sheet').hidden ? 'sheet' : !document.querySelector('#ticket').hidden ? 'ticket' : '', prompt: document.querySelector('#prompt').hidden ? '' : document.querySelector('#prompt').textContent, now: document.querySelector('#now').textContent, cpu: +(W.engine.stats.cpu || 0).toFixed(2), guests: W.crowd.all.length, ticket: W.ticket ? W.ticket.hall + ' ' + W.ticket.seat : null, shows: Object.values(W.shows.s).map((s) => s.id + ':' + s.state).join(' ') }; }); console.log(name.padEnd(22), JSON.stringify(st)); };
// audio: unlock and fire every one-shot once
await p.mouse.click(400, 180); await L(() => { const S = window.__lumiere.sound; S.unlock(); S.cheer('hallI', 2); S.applause('hallII', 2); S.laugh(null, 1, 3); S.door(true, 1); S.clink(); S.crunch(); S.blip(5, 1); S.chime(); S.step(2); S.setMurmur(0.7); S.setScore('hallIII'); }); await step('a-audio', 600);
// walk to the desk and talk
await L(() => { const P = window.__lumiere.player; P.x = -3.75; P.z = 8.5; P.yaw = Math.PI / 2; P.pitch = 0; }); await step('b-at-desk', 900);
await p.locator('#prompt').dispatchEvent('pointerdown'); await step('c-talk-open', 2500);
await p.locator('.opt', { hasText: 'reserve' }).click(); await step('d-sheet', 800);
await p.locator('.film', { hasText: 'Velvet Hour' }).click(); await p.locator('#begin .chip', { hasText: '10 s' }).click(); await step('e-sheet-velvet', 600);
await p.locator('#confirm').click(); await step('f-ticket', 900);
await p.locator('#tkJump').click(); await step('g-jumped', 4500);
await step('h-show-dimming', 9000);
await step('i-show-playing', 6000);
// talk to the usher and get guided (back in the lobby)
await L(() => { const W = window.__lumiere, P = W.player; if (P.seated) P.standUp(); const u = W.crowd.byId.usher; P.x = u.x + Math.sin(u.yaw) * 1.4; P.z = u.z + Math.cos(u.yaw) * 1.4; P.yaw = Math.atan2(P.x - u.x, P.z - u.z); P.pitch = 0; }); await step('j-near-usher', 1200);
await p.locator('#prompt').dispatchEvent('pointerdown'); await step('k-usher-talk', 2500);
const g = p.locator('.opt', { hasText: 'Show me' }); if (await g.count()) { await g.click(); await step('l-usher-guiding', 1500); const st = await L(() => { const u = window.__lumiere.crowd.byId.usher; return u.state + ' path ' + (u.path ? u.path.length : 0); }); console.log('usher state', st); }
const errs = log.filter((l) => /error|Error|warn/.test(l)); console.log('console lines', log.length, '| errors/warnings', errs.length); for (const l of errs.slice(0, 20)) console.log('  ', l.slice(0, 300));
await b.close(); srv.close();
