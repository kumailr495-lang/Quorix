// LUMIERE v11 - nothing on the HUD may touch anything else. Boots the game once per language, turns every HUD element on at once with
// the longest text that language has for it (place, ticket, wallet, room badge and bar, the way-finding pill, tools, frame counter, stick,
// run, item, tablet, bell, the action plate, a toast, the tutorial's coach), then measures every pair of boxes at several phone sizes,
// right-handed and left-handed. Urdu runs right to left. Headless Chromium + SwiftShader: the real page and stylesheet, not the phone.
// usage: node tools/dev/hudcheck.mjs OUT [--langs en,es,hi,ur] [--sizes 806x360,915x412,740x330,1280x720]     exit code 1 on any overlap
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const OUT = process.argv[2] || 'hudcheck'; fs.mkdirSync(OUT, { recursive: true }); const WWW = path.resolve('www');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const LANGS = arg('langs', 'en,es,hi,ur').split(','), SIZES = arg('sizes', '806x360,915x412,740x330,1280x720').split(',').map((s) => s.split('x').map(Number));
let pwPath = process.env.PW_PATH; if (!pwPath) for (const p of ['/opt/node-tools/node_modules/playwright/index.mjs', '/opt/npm-tools/node_modules/playwright/index.mjs']) if (fs.existsSync(p)) { pwPath = p; break; }
const { chromium } = await import(pwPath || 'playwright');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.ogg': 'audio/ogg', '.opus': 'audio/ogg', '.webp': 'image/webp' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(WWW, u === '/' ? 'index.html' : u); if (!f.startsWith(WWW) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise((ok) => srv.listen(0, '127.0.0.1', ok)); const port = srv.address().port;
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let bad = 0; const rows = [];
for (const lang of LANGS) {
  const ctx = await b.newContext({ viewport: { width: SIZES[0][0], height: SIZES[0][1] }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  await ctx.addInitScript((lang) => { try { localStorage.setItem('lumiere.settings.v5', JSON.stringify({ lang, graphics: 'low', tutorialAsked: true, npcs: 'off', showFps: true, seen: { intro: true } })); } catch (e) {} }, lang);
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`http://127.0.0.1:${port}/index.html`); await p.waitForFunction(() => window.__lumiere && window.__lumiere.ready, null, { timeout: 300000 }); await p.waitForTimeout(2000);
  await p.evaluate(() => document.querySelector('#mnQuick').click()); await p.waitForFunction(() => window.__lumiere.mode === 'play', null, { timeout: 120000 }); await p.waitForTimeout(2500);
  // everything on, with this language's longest words
  await p.evaluate(async () => {
    const L = window.__lumiere, ui = L.ui, I = await import('/js/i18n.js'), M = await import('/js/lang/' + (I.lang() === 'en' ? 'en' : I.lang()) + '.js'), D = Object.values(M)[0] || {}, $ = (s) => document.querySelector(s);
    const longest = (re, vars) => { let best = ''; for (const k in D) if (re.test(k) && typeof D[k] === 'string') { const s = I.t(k, vars); if (s.length > best.length) best = s; } return best; };
    ui.setWhere('LUMIERE CLASSIC', 'Agent 327: Operation Barbershop, ' + I.t('show.pending', { time: '02:10' })); ui.setTicketChip(I.t('ticket9.chip', { screen: 'CLASSIC', seat: 'M12' }) + ', 02:10'); ui.setWallet('₹12,450');
    ui.setGoal(longest(/^goal\./, { name: 'CLASSIC', seat: 'M12' }), 40, 128); ui.setItem('popcorn', 5, 9); ui.setButton('#bRemote', true); ui.setButton('#bBell', true);
    ui.setPrompt(longest(/^hud9?\.(talk|yourSeat|sitHere|lift\w+|stand|bin|urinal|stall|basin|bill)$/, { name: 'Margaret', seat: 'M12' }), () => {}); ui.setFps('60 fps, 1.00x, 99 dc');
    for (const k of ['setWhere', 'setTicketChip', 'setWallet', 'setGoal', 'setItem', 'setButton', 'setPrompt', 'setFps']) ui[k] = () => {};
    ui.toast(longest(/^toast9?\./, { n: 3, name: 'Margaret', seat: 'M12', price: '₹250' }), 3600000);
    const tl = $('#hudTL'), bd = document.createElement('button'); bd.id = 'mpBadge'; bd.className = 'host'; bd.innerHTML = '<i></i><span></span>'; bd.querySelector('span').textContent = I.t('mp.badge', { code: 'WXYZ', n: 8 }); tl.appendChild(bd);
    const bar = document.createElement('div'); bar.id = 'mpBar'; for (const x of ['💬', '🏷', '👋', '👏', '🎉']) { const q = document.createElement('button'); q.textContent = x; bar.appendChild(q); } tl.appendChild(bar);
    $('#coach').hidden = false; document.body.classList.add('coaching'); $('#coachN').textContent = '12'; $('#coachText').textContent = longest(/^tut\.s\d+|^tut\.step/, {}) || longest(/^tut\./, {});
  });
  for (const [W, H] of SIZES) for (const lefty of [false, true]) {
    await p.setViewportSize({ width: W, height: H }); await p.evaluate((l) => document.body.classList.toggle('lefty', l), lefty); await p.waitForTimeout(1200);
    const res = await p.evaluate(() => {
      const ids = ['#where', '#ticketChip', '#walletChip', '#mpBadge', '#mpBar', '#goal', '#tools', '#fps', '#stick', '#sprint', '#itemBtn', '#bRemote', '#bBell', '#prompt', '#toast', '#coach'], R = [], out = { hits: [], off: [], missing: [], clipped: [] };
      for (const s of ids) { const e = document.querySelector(s); if (!e || e.hidden) { out.missing.push(s); continue; } const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) { out.missing.push(s); continue; } R.push([s, r]);
        if (r.left < -0.5 || r.top < -0.5 || r.right > innerWidth + 0.5 || r.bottom > innerHeight + 0.5) out.off.push(`${s} [${r.left.toFixed(0)},${r.top.toFixed(0)},${r.right.toFixed(0)},${r.bottom.toFixed(0)}]`); }
      for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) { const a = R[i][1], c = R[j][1], w = Math.min(a.right, c.right) - Math.max(a.left, c.left), h = Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top); if (w > 1 && h > 1) out.hits.push(`${R[i][0]} x ${R[j][0]} (${w.toFixed(0)} x ${h.toFixed(0)} px)`); }
      // words cut off without an ellipsis to show it (a box narrower than its text and not set to clip)
      for (const s of ['#goalText', '#promptLbl', '#tcText', '#whereA']) { const e = document.querySelector(s); if (e && e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).textOverflow !== 'ellipsis') out.clipped.push(s); }
      return out; });
    const name = `${lang}-${W}x${H}${lefty ? '-lefty' : ''}`; await p.screenshot({ path: path.join(OUT, name + '.png') });
    const ok = !res.hits.length && !res.off.length && !res.clipped.length; if (!ok) bad++;
    rows.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${res.hits.length ? '  overlaps: ' + res.hits.join('; ') : ''}${res.off.length ? '  off screen: ' + res.off.join('; ') : ''}${res.clipped.length ? '  cut text: ' + res.clipped.join(', ') : ''}${res.missing.length ? '  (not shown: ' + res.missing.join(', ') + ')' : ''}`); console.log(rows[rows.length - 1]);
  }
  if (errs.length) console.log(`  page errors (${lang}): ${[...new Set(errs)].slice(0, 3).join(' | ')}`); await ctx.close();
}
console.log(`hudcheck: ${rows.length - bad}/${rows.length} layouts clean`); await b.close(); srv.close(); process.exit(bad ? 1 : 0);
