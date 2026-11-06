// LUMIERE - the phone bench (?bench=1). A fixed camera route through every room, drawn by the game's own renderer, resolution governor
// and room visibility, so the numbers are the ones you get when you walk there. Per stop: frame rate, the slowest frames, draw calls,
// triangles and the resolution scale; overall: the same plus hitches, memory, the GPU and the screen. Ends with a short code to paste
// back (docs/V9-AUDIT.md, "Device check"). Each stop's first second is reported apart: it is when a room's shaders and textures first
// reach the GPU.
import { HALL, L1, LIFT } from './building.js';
import { SEAT } from './hallmath.js';
const lerp = (a, b, t) => a + (b - a) * t, ease = (t) => t * t * (3 - 2 * t);
const yawTo = (dx, dz) => Math.atan2(-dx, -dz);   // three.js camera yaw that looks along (dx, dz)
function route(L) {
  const S = [], E = 1.62, add = (name, a, b, t = 6) => S.push({ name, a, b, t });
  add('street', [0, E, 34, 0, 0.02], [0, E, 26.6, 0, 0.04]);
  add('lobby', [0, E, 15, -0.5, 0], [0, E, 2, 0.5, 0]);
  add('lobby-up', [-9, L1 + E, -9.2, Math.PI - 0.6, -0.12], [-3, L1 + E, -9.2, Math.PI + 0.6, -0.12]);
  add('corridor', [-6, L1 + E, -18, Math.PI / 2, 0], [-36, L1 + E, -18, Math.PI / 2, 0]);
  add('corridor-west', [-44.5, L1 + E, -24, 0, 0], [-44.5, L1 + E, -46, 0, 0]);
  for (const h of Object.values(HALL)) {
    const r = h.toWorld(0, h.depthIn - 1.2), s = h.toWorld(0, 0.5), y = h.y0 + h.total + E, yaw = yawTo(s.x - r.x, s.z - r.z);
    add(h.key, [r.x, y, r.z, yaw - 0.5, -0.15], [r.x, y, r.z, yaw + 0.5, -0.15]);
    if (h.key === 'hallMax') {   // the middle seat of the middle row, looking round the screen
      const w = L.world.hallByKey(h.key), rows = [...new Set(w.seats.map((q) => q.row))].sort((x, y) => x - y), mr = rows[rows.length >> 1];
      const mid = w.seats.filter((q) => q.row === mr).reduce((b, q) => (Math.abs(q.a) < Math.abs(b.a) ? q : b)), ey = mid.y + SEAT[mid.kind].eye;
      add('hallMax-seat', [mid.x, ey, mid.z, mid.yaw - 0.35, 0.05], [mid.x, ey, mid.z, mid.yaw + 0.35, 0.05]); }
  }
  add('spine', [0, E, -70, Math.PI, 0], [0, E, -20, Math.PI, 0]);
  add('restrooms', [23.2, E, -1, -Math.PI / 2, 0], [27.5, E, -6, -Math.PI / 2 - 0.6, 0]);
  add('lift', [(LIFT.x0 + LIFT.x1) / 2, E, LIFT.z1 + 2.5, 0, 0], [(LIFT.x0 + LIFT.x1) / 2, E, LIFT.z1 + 0.6, 0, 0], 4);
  return S;
}
const pct = (a, p) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const mean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);
function gpuName(r) { try { const gl = r.getContext(), e = gl.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); } catch (e) { return '?'; } }
export async function runBench(L) {
  document.body.classList.add('bench');
  const st = document.createElement('style'); st.textContent = 'body.bench>*:not(#gl):not(#benchbox){display:none!important}#benchbox{position:fixed;left:12px;top:12px;right:12px;max-height:calc(100% - 24px);overflow:auto;z-index:99;background:rgba(8,8,10,.86);color:#f2ebdd;font:12px/1.4 system-ui,sans-serif;padding:10px 12px;border-radius:10px}#benchbox table{border-collapse:collapse;width:100%}#benchbox td,#benchbox th{padding:2px 6px;text-align:right;white-space:nowrap}#benchbox td:first-child,#benchbox th:first-child{text-align:left}#benchbox textarea{width:100%;height:70px;font:11px monospace;margin-top:6px}#benchbox button{background:#e3b25f;color:#111;border:0;border-radius:6px;padding:6px 12px;margin-top:6px;font-weight:600}';
  document.head.appendChild(st); const box = document.createElement('div'); box.id = 'benchbox'; document.body.appendChild(box);
  box.textContent = 'Bench: starting in 3 s. Keep the phone still and the screen on.';
  await new Promise((r) => setTimeout(r, 3000));
  const R = L.engine.renderer, stops = route(L), out = [], all = [], hitches = []; let si = 0, t0 = null, last = null, cur = null;
  const startHeap = performance.memory ? performance.memory.usedJSHeapSize : 0;
  await new Promise((done) => {
    const tick = (now) => {
      if (last !== null && cur) { const dt = now - last, t = (now - t0) / 1000; (t < 1 ? cur.enter : cur.dts).push(dt); if (t >= 1) { all.push(dt); cur.calls.push(R.info.render.calls); cur.tris.push(R.info.render.triangles); cur.scale.push(L.engine.stats.scale); } if (dt > 50) hitches.push([cur.name, Math.round(dt)]); }
      last = now;
      if (!cur || (now - t0) / 1000 >= cur.t) { if (cur) out.push(cur); if (si >= stops.length) { done(); return; } const s = stops[si++]; cur = { ...s, enter: [], dts: [], calls: [], tris: [], scale: [] }; t0 = now; box.textContent = `Bench: ${s.name} (${si}/${stops.length})`; }
      const k = ease(Math.min(1, (now - t0) / 1000 / cur.t)), p = cur.a.map((v, i) => lerp(v, cur.b[i], k)); L.pose(p);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  L.pose(null);
  const rows = out.map((s) => ({ stop: s.name, fps: +(1000 / Math.max(1, mean(s.dts))).toFixed(1), p95: +pct(s.dts, 0.95).toFixed(1), max: +Math.max(0, ...s.dts).toFixed(1), enter: +Math.max(0, ...s.enter).toFixed(0), calls: Math.round(mean(s.calls)), tris: Math.round(mean(s.tris)), scale: +mean(s.scale).toFixed(2) }));
  const res = { v: 1, ua: navigator.userAgent.replace(/^Mozilla\/5\.0 /, ''), gpu: gpuName(R), screen: `${innerWidth}x${innerHeight}@${devicePixelRatio}`, depth: L.engine.depthBits, preset: L.settings.graphics,
    boot: Math.round(L.buildMs), fps: +(1000 / Math.max(1, mean(all))).toFixed(1), p95: +pct(all, 0.95).toFixed(1), p99: +pct(all, 0.99).toFixed(1), worst: +Math.max(0, ...all).toFixed(1), hitches: hitches.length,
    heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null, heapGrowMB: performance.memory ? Math.round((performance.memory.usedJSHeapSize - startHeap) / 1048576) : null,
    gpuMem: { geometries: R.info.memory.geometries, textures: R.info.memory.textures, programs: R.info.programs ? R.info.programs.length : null }, people: L.crowd && L.crowd.agents ? L.crowd.agents.length : null, stops: rows };
  let code = ''; try { code = btoa(unescape(encodeURIComponent(JSON.stringify(res)))); } catch (e) { code = JSON.stringify(res); }
  console.log('[bench]', JSON.stringify(res));
  box.innerHTML = `<b>LUMIÈRE bench</b> · ${res.fps} fps average · slowest 5 % of frames ${res.p95} ms · worst ${res.worst} ms · ${res.hitches} hitches over 50 ms<br>${res.gpu} · ${res.screen} · ${res.preset}${res.heapMB !== null ? ` · JS memory ${res.heapMB} MB` : ''}
    <table><tr><th>stop</th><th>fps</th><th>p95 ms</th><th>max ms</th><th>first s, max ms</th><th>draws</th><th>triangles</th><th>scale</th></tr>${rows.map((r) => `<tr><td>${r.stop}</td><td>${r.fps}</td><td>${r.p95}</td><td>${r.max}</td><td>${r.enter}</td><td>${r.calls}</td><td>${r.tris}</td><td>${r.scale}</td></tr>`).join('')}</table>
    Copy this code and paste it back:<textarea readonly>${code}</textarea><button id="benchcopy">Copy</button>`;
  const ta = box.querySelector('textarea'); box.querySelector('#benchcopy').onclick = async () => { ta.select(); try { await navigator.clipboard.writeText(code); } catch (e) { document.execCommand && document.execCommand('copy'); } };
  window.__bench = res; return res;
}
