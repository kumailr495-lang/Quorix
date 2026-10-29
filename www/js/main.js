// LUMIERE v5 - boot (temporary dev harness while the rebuild is in progress)
import * as THREE from 'three';
import { Engine } from './engine.js';
import { Materials, G } from './materials.js';
import { buildWorld } from './world.js';
import { Player } from './player.js';
const $ = (s) => document.querySelector(s);
async function boot() {
  const settings = { graphics: 'medium', sensitivity: 1, brightness: 1 };
  try { await Promise.race([Promise.all([document.fonts.load('600 40px Inter'), document.fonts.load('400 14px Inter')]), new Promise((r) => setTimeout(r, 2500))]); } catch (e) {}
  const engine = new Engine($('#gl'), settings), mats = new Materials(); engine.applySettings(settings);
  const t0 = performance.now(); const world = await buildWorld(engine, mats, (p, n) => { const b = $('#barfill'); if (b) b.style.width = (p * 100) + '%'; });
  const player = new Player(engine, world, settings); player.attach($('#gl'), $('#stick'), $('#knob'), $('#sprint'));
  const loader = $('#loader'); if (loader) loader.remove(); const fd = $('#fade'); if (fd) fd.style.opacity = '0'; const hud = $('#hud'); if (hud) hud.hidden = false;
  let last = performance.now();
  function frame(now) { requestAnimationFrame(frame); const dt = Math.min(0.05, (now - last) / 1000); last = now; G.uTime.value = now / 1000;
    player.update(dt); const room = world.roomAt(player.x, player.z); world.setVisibility(room, player.x, player.z); world.update(dt, [player], now);
    for (const h of world.halls) if (world.rooms[h.key].group.visible) h.updateLOD(engine.camera, false, engine.preset.seatLod);
    engine.governor(dt, now); engine.render(); }
  requestAnimationFrame(frame);
  window.__lumiere = { engine, world, player, mats, buildMs: performance.now() - t0, ready: true };
}
boot().catch((e) => { console.error(e); const m = document.querySelector('#loadmsg'); if (m) m.textContent = 'Error: ' + (e && e.message ? e.message : e); });
