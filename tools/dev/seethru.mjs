// LUMIERE v9 - see-through and z-fight test in the real engine: headless Chromium + SwiftShader (the engine's own meshes, culling and
// materials, drawn by a CPU renderer, not the phone's GPU). See tools/dev/seethru-page.js for what is checked.
// usage: node tools/dev/seethru.mjs OUT_DIR [--rooms lobby,spine] [--step 1.5] [--px 64] [--limit N] [--no-static] [--views 16] [--zfight] [--assets] [--grid]
// eye points: every floor cell a player can reach (a flood fill with the game's movement rules) thinned to --step; --grid uses a plain grid
// writes OUT_DIR/static.json, OUT_DIR/views.json, OUT_DIR/summary.md and PNGs of the worst views (test colours and game look side by side)
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const args = process.argv.slice(2), OUT = args[0], opt = (k, d) => { const i = args.indexOf('--' + k); return i < 0 ? d : args[i + 1]; }, has = (k) => args.includes('--' + k);
const WWW = path.resolve('www'); fs.mkdirSync(OUT, { recursive: true });
let pwPath = process.env.PW_PATH; if (!pwPath) for (const p of ['/opt/node-tools/node_modules/playwright/index.mjs', '/opt/npm-tools/node_modules/playwright/index.mjs']) if (fs.existsSync(p)) { pwPath = p; break; }
const { chromium } = await import(pwPath || 'playwright');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.webp': 'image/webp', '.opus': 'audio/ogg', '.css': 'text/css', '.woff2': 'font/woff2', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.ogg': 'audio/ogg', '.mp4': 'video/mp4', '.webm': 'video/webm', '.bin': 'application/octet-stream' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(WWW, u === '/' ? 'index.html' : u); if (!f.startsWith(WWW) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise((ok) => srv.listen(0, '127.0.0.1', ok)); const port = srv.address().port;
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 640, height: 360 } });
await ctx.addInitScript(() => { try { localStorage.setItem('lumiere.settings.v5', JSON.stringify({ lang: 'en', graphics: 'medium', tutorialAsked: true, npcs: 'off' })); } catch (e) {} });
const p = await ctx.newPage(); const log = []; p.on('console', (m) => log.push(`[${m.type()}] ${m.text()}`)); p.on('pageerror', (e) => log.push(`[pageerror] ${e.message}`));
await p.goto(`http://127.0.0.1:${port}/index.html${has('assets') ? '?assetcheck=1' : ''}`);
try { await p.waitForFunction(() => window.__lumiere && window.__lumiere.ready, null, { timeout: 300000 }); } catch (e) { console.log('BOOT TIMEOUT\n' + log.slice(-30).join('\n')); await b.close(); srv.close(); process.exit(1); }
await p.addScriptTag({ path: path.resolve('tools/dev/seethru-page.js') }); await p.evaluate(() => window.__st.init());
const t0 = Date.now();
if (opt('shots', null)) {   // named views: [{ name, x, y, z, eye, k (0..5 = +x -x up down +z -z) }] -> name-game.png, name-mask.png
  const L = opt('shots') === 'standard' ? await p.evaluate(() => window.__st.standardShots()) : JSON.parse(fs.readFileSync(opt('shots'), 'utf8'));
  for (const v of L) for (const mode of ['game', 'mask']) { const url = await p.evaluate(([pt, kk, m, px]) => window.__st.view(pt, kk, px, m), [v, v.k, mode, +opt('px', 384)]); fs.writeFileSync(path.join(OUT, `${v.name}-${mode}.png`), Buffer.from(url.split(',')[1], 'base64')); }
  console.log('shots', L.length); await b.close(); srv.close(); process.exit(0); }
if (opt('blob', null)) { const r = await p.evaluate((n) => window.__st.blobCheck(n), opt('blob')); console.log(JSON.stringify(r.slice(0, 12))); const sum = r.reduce((a, x) => [a[0] + x.tris, a[1] + x.windingInward, a[2] + x.normalsInward], [0, 0, 0]); console.log('tris', sum[0], 'winding inward', sum[1], 'normals inward', sum[2]); await b.close(); srv.close(); process.exit(0); }
if (has('assets')) { const A = await p.evaluate(() => window.__st.assets()); fs.writeFileSync(path.join(OUT, 'assets.json'), JSON.stringify(A, null, 1)); for (const [n, r] of Object.entries(A)) console.log(n.padEnd(18), 'parts', r.parts, 'tris', r.tris, 'degen', r.degen, 'flipped', r.flipped, 'open edges', r.open, 'non-manifold', r.nonManifold);
  const CO = await p.evaluate(async () => { const m = await import('/js/assets.js'), o = {}; for (const [k, v] of Object.entries(m.CHECK_OPEN)) { const l = v.filter((x) => x !== null); if (l.length) o[k] = l; } return { open: o, listed: m.TWO_SIDED }; });
  console.log('open parts (TWO_SIDED should be):', JSON.stringify(CO.open)); const same = JSON.stringify(CO.open) === JSON.stringify(CO.listed); console.log(same ? 'TWO_SIDED matches the GLBs' : 'TWO_SIDED is out of date');
  for (const l of log.filter((x) => x.includes('[assetcheck]')).slice(0, 10)) console.log('  ', l); await b.close(); srv.close(); process.exit(0); }
if (!has('no-static')) { const S = await p.evaluate(() => window.__st.static()); fs.writeFileSync(path.join(OUT, 'static.json'), JSON.stringify(S, null, 1)); console.log('static done', ((Date.now() - t0) / 1000).toFixed(0) + ' s'); }
if (!has('grid')) { const t1 = Date.now(), R = await p.evaluate(() => window.__st.reach()); console.log('reachable cells', R.cells, JSON.stringify(R.per), ((Date.now() - t1) / 1000).toFixed(0) + ' s'); fs.writeFileSync(path.join(OUT, 'reach.json'), JSON.stringify(R)); }
const rooms = opt('rooms', null), pts = await p.evaluate((o) => window.__st.points(o), { rooms: rooms ? rooms.split(',') : null, step: +opt('step', 1.5), limit: +opt('limit', 0) || 0, reach: !has('grid') });
console.log('points', pts.length); const px = +opt('px', 64), res = [];
if (has('zfight')) {   // z-fighting as drawn: pixels whose winner changes when the draw order is reversed
  const Z = []; for (let i = 0; i < pts.length; i += 10) { Z.push(...await p.evaluate(([a, q]) => window.__st.zfight(a, q), [pts.slice(i, i + 10), +opt('px', 96)])); if (i % 100 === 0) console.log(' ', i, '/', pts.length, ((Date.now() - t0) / 1000).toFixed(0) + ' s'); }
  fs.writeFileSync(path.join(OUT, 'zfight.json'), JSON.stringify(Z)); const by = {}, rm = {};
  for (const r of Z) { const n = r.faces.reduce((s, v) => s + v, 0), a = rm[r.tag] || (rm[r.tag] = { pts: 0, bad: 0, px: 0 }); a.pts++; a.px += n; if (n) a.bad++;
    for (const h of r.hits) { if (h.coplanar === false) { const o = by['(crease, not coplanar: ignored)'] || (by['(crease, not coplanar: ignored)'] = { n: 0, px: 0, ex: [] }); o.n++; continue; } const k = [h.a, h.b].sort().join(' vs ') + ` [${[h.mat, h.mat2].filter(Boolean).join('/')}]`, o = by[k] || (by[k] = { n: 0, px: 0, ex: [] }); o.n++; o.px += h.px; if (o.ex.length < 4) o.ex.push(`${r.tag} eye ${[r.x, r.eye, r.z].join(',')} ${h.k} at ${h.p} (${h.d} m)`); } }
  let md = `# Z-fight test (${new Date().toISOString().slice(0, 16)}Z)\n\nHeadless Chromium + SwiftShader; ${Z.length} eye points x 6 views; a pixel counts when its front-most face changes with the draw order reversed.\n\n| points | n | with z-fighting | px |\n|---|---|---|---|\n`;
  for (const k of Object.keys(rm).sort()) md += `| ${k} | ${rm[k].pts} | ${rm[k].bad} | ${rm[k].px} |\n`;
  md += '\n## Pairs (sampled pixels)\n\n'; for (const [k, o] of Object.entries(by).sort((a, b) => b[1].px - a[1].px)) md += `- ${k}: ${o.n} samples, ${o.px} px; ${o.ex.join(' / ')}\n`;
  fs.writeFileSync(path.join(OUT, 'zfight.md'), md); console.log(md.slice(0, 7000)); await b.close(); srv.close(); process.exit(0);
}
for (let i = 0; i < pts.length; i += 20) { const r = await p.evaluate(([a, q]) => window.__st.run(a, q), [pts.slice(i, i + 20), px]); res.push(...r); if (i % 200 === 0) console.log(' ', i + r.length, '/', pts.length, ((Date.now() - t0) / 1000).toFixed(0) + ' s'); }
fs.writeFileSync(path.join(OUT, 'views.json'), JSON.stringify(res));
// ---- summary: per room and per tag, the share of views with back faces or holes, and what the rays hit
const N = px * px, agg = {}, objs = {};
for (const r of res) { const k = r.tag, a = agg[k] || (agg[k] = { pts: 0, bad: 0, back: 0, hole: 0, worst: 0 }); a.pts++; const bk = r.faces.reduce((s, f) => s + f[0], 0), hl = r.faces.reduce((s, f) => s + f[1], 0); a.back += bk; a.hole += hl; if (bk + hl > 0) a.bad++; a.worst = Math.max(a.worst, (bk + hl) / (6 * N));
  r.score = bk + hl; for (const h of r.hits) { const key = h.none ? `${h.kind}: nothing drawn${h.hidden.length ? ' (hidden room ' + h.hidden.join(' ') + ')' : ''}` : `${h.kind} (${h.back ? 'back face' : 'front face'} hit): ${h.obj} [${h.mat}]${h.beyondFar ? ' beyond far plane' : ''}`; const o = objs[key] || (objs[key] = { n: 0, px: 0, ex: [] }); o.n++; o.px += h.px; if (o.ex.length < 3) o.ex.push({ tag: r.tag, eye: [r.x, r.eye, r.z], dir: h.k, p: h.p, n: h.n }); } }
let md = `# See-through test (${new Date().toISOString().slice(0, 16)}Z)\n\nHeadless Chromium + SwiftShader, the game's meshes and visibility; ${res.length} eye points x 6 views of ${px}x${px} px. back = pixels where a back face is nearer than any front face (culled in the game: see-through); hole = no front face at all (void).\n\n| points | n | with problems | back px | hole px | worst view share |\n|---|---|---|---|---|---|\n`;
for (const k of Object.keys(agg).sort()) { const a = agg[k]; md += `| ${k} | ${a.pts} | ${a.bad} | ${a.back} | ${a.hole} | ${(a.worst * 100).toFixed(2)} % |\n`; }
md += `\n## What the problem pixels hit (sampled rays)\n\n`; for (const [k, o] of Object.entries(objs).sort((a, b) => b[1].px - a[1].px)) md += `- ${k}: ${o.n} rays, ${o.px} px; e.g. ${o.ex.map((e) => `${e.tag} eye ${e.eye.map((v) => v.toFixed(2)).join(',')} ${e.dir}${e.p ? ' at ' + e.p.join(',') : ''}`).join(' / ')}\n`;
const worst = res.filter((r) => r.score > 0).sort((a, b) => b.score - a.score).slice(0, +opt('views', 16));
md += `\n## Worst views (images)\n\n`;
for (const [i, r] of worst.entries()) { const k = r.faces.reduce((bi, f, j, F) => (f[0] + f[1] > F[bi][0] + F[bi][1] ? j : bi), 0);
  for (const mode of ['mask', 'game']) { const url = await p.evaluate(([pt, kk, m]) => window.__st.view(pt, kk, 320, m), [r, k, mode]); fs.writeFileSync(path.join(OUT, `w${String(i).padStart(2, '0')}-${mode}.png`), Buffer.from(url.split(',')[1], 'base64')); }
  md += `- w${String(i).padStart(2, '0')}: ${r.tag} eye ${r.x},${r.eye},${r.z} view ${['+x', '-x', 'up', 'down', '+z', '-z'][k]}: ${r.faces[k][0]} back, ${r.faces[k][1]} hole px (vis ${r.vis})\n`; }
const errs = log.filter((l) => /error|fail/i.test(l)); md += `\nconsole errors: ${errs.length}\n` + errs.slice(0, 10).map((l) => '    ' + l.slice(0, 200)).join('\n') + '\n';
fs.writeFileSync(path.join(OUT, 'summary.md'), md); console.log(md.slice(0, 6000)); console.log('total', ((Date.now() - t0) / 1000).toFixed(0) + ' s');
await b.close(); srv.close();
