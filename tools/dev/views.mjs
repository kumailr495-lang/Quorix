// LUMIERE - fixed eye-level "hero views" of every area, for before/after renders (node tools/dev/views.mjs > views.json, then
// node tools/dev/seethru.mjs OUT --shots views.json). Built from the building's own numbers so the views follow the layout.
// Per hall: the middle seat of the middle row, the front row's aisle end looking at the exit corner, and the entrance at the top.
import { HALL, L1, BRIDGE, LIFT, SPAWN } from '../../www/js/building.js';
import { hallSeats, SEAT } from '../../www/js/hallmath.js';
const E = 1.62, out = [], yawTo = (dx, dz) => Math.atan2(-dx, -dz), r3 = (v) => Math.round(v * 1000) / 1000;
const add = (name, x, y, z, yaw, pitch = 0, eye = y + E, fov = 70) => out.push({ name, x: r3(x), y: r3(y), z: r3(z), eye: r3(eye), yaw: r3(yaw), pitch: r3(pitch), fov });
add('street-arrival', -2, 0, 27.5, yawTo(2, -10), 0.06);
add('lobby-entry', 0, 0, 15.6, 0, 0.04);
add('lobby-boxoffice', -6, 0, 9, yawTo(-10, -1.5), 0.02);
add('lobby-concessions', -8, 0, 1, yawTo(-10, -3), 0.02);
add('lobby-lounge', 4.5, 0, 6.5, yawTo(-5.5, -5.5), -0.08);
add('lobby-escalators', 2, 0, 8, yawTo(8, -8), 0.12);
add('lobby-restroom-side', 12, 0, 6, yawTo(10, -4), 0.02);
add('mezzanine', -6, L1, -9.6, yawTo(3, 10), -0.22);
add('lobby-waiting', 7.5, 0, 9.0, yawTo(8, 4), 0.0);
add('lobby-waiting-west', -4.5, 0, 11.5, yawTo(-5, 4), 0.0);
add('street-facade', 12, 0, 32.5, yawTo(-12, -14.5), 0.3);
add('restrooms-men', 26.5, 0, -3.2, yawTo(0, -10), -0.05);
add('restrooms-vanity', 28.5, 0, 1.0, yawTo(-10, 0.5), -0.05);
add('lift-door-G', (LIFT.x0 + LIFT.x1) / 2, 0, LIFT.z1 + 3.2, 0, 0);
add('corridor-bridge', 6, L1, -18, yawTo(-10, 0), 0.02);
add('corridor-west', BRIDGE.x0 + 3, L1, -23.5, 0, 0);
add('corridor-east', BRIDGE.x1 - 3, L1, -23.5, 0, 0);
add('spine', 0, 0, -18, 0, 0.02);
add('restrooms', 23.4, 0, -1, yawTo(10, -3), 0);
for (const h of Object.values(HALL)) {
  const seats = hallSeats(h), rows = [...new Set(seats.map((s) => s.row))].sort((a, b) => a - b), mr = rows[rows.length >> 1];
  const mid = seats.filter((s) => s.row === mr).reduce((b, s) => (Math.abs(s.a) < Math.abs(b.a) ? s : b));
  add(h.key + '-seat', mid.x, mid.y, mid.z, mid.yaw, 0.08, mid.y + SEAT[mid.kind].eye, 75);
  // front row, standing in the side aisle on the exit's side, looking at the exit corner
  const r0 = h.rows[0], aw = (h.aisle[0] + h.aisle[1]) / 2, ex = h.exits.find((e) => e.u > 0) || h.exits[0];
  const p = h.toWorld(aw, r0.dHip - 0.2), q = h.toWorld(ex.u, ex.d);
  add(h.key + '-exit', p.x, h.y0 + r0.y, p.z, yawTo(q.x - p.x, q.z - p.z), 0.05);
  const e = h.toWorld(h.entryU - Math.sign(h.entryU) * 2.4, h.depthIn - 0.7), c = h.toWorld(0, 0);
  add(h.key + '-entry', e.x, h.y0 + h.total, e.z, yawTo(c.x - e.x, c.z - e.z), -0.12);
}
add('spawn-quick', SPAWN.quick.x, 0, SPAWN.quick.z, SPAWN.quick.yaw, 0.02);
console.log(JSON.stringify(out));
