// LUMIERE v11 - where to next. The HUD's way-finding pill (ui.js setGoal): an arrow that turns with you, the next thing to do, how far.
// Flow mode walks you through an evening: inside, the box office, the usher at the gate, the escalator, your screen, your seat, the way
// out. Quick play only shows it once you have picked a seat. The route is the walkers' own nav graph (building.js NAV, npc9.js navPath)
// and the arrow aims at the farthest point of it you can see (world9.js Walls.sees), so it never points through a wall.
import { NAV, DOORS, L1 } from './building.js';
import { navPath } from './npc9.js';
const N = NAV.nodes, P = (n) => ({ x: N[n][0], y: N[n][1], z: N[n][2] });
const SIDE = (H) => H.side < 0 ? (H.id === 'CURVE' ? ['bridgeW', 'flankW1', 'flankW2', 'linkW'] : ['bridgeW', 'flankW1']) : (H.id === 'X270' ? ['bridgeE', 'flankE1', 'flankE2'] : ['bridgeE', 'flankE1']);
export class Wayfinder {
  constructor(world, crowd) { this.world = world; this.crowd = crowd; this.cur = null; this._t = 0; }
  // the nav node to start from: the nearest one on your level that you can see
  near(p) { let best = null, bd = 1e9; for (const k in N) { const n = N[k]; if (Math.abs(n[1] - p.y) > 1.3) continue; const d = Math.hypot(n[0] - p.x, n[2] - p.z); if (d < bd && (d < 1.2 || this.world.walls.sees(p.x, p.z, n[0], n[2], p.y + 0.5, p.y + 1.7))) { bd = d; best = k; } } return best; }
  route(p, to, extra = []) { const from = this.near(p); if (!from) return null; const path = from === to ? [to] : navPath(from, to); if (!path) return null; return [...path.map(P), ...extra]; }
  // what the player should do now: { key, vars, pts } or null
  plan(st) {
    const { game, ticket: tk, room: r, player: p } = st; if (!r || p.seated) return null; const has = tk && tk.title !== undefined && tk.seat, up = p.y > 2;
    if (game === 'flow' && !has) return r === 'street' ? { key: 'goal.enter', pts: this.route(p, 'doorIn') } : r === 'lobby' && !up ? { key: 'goal.ticket', pts: this.route(p, 'boxQ') } : null;
    if (!has) return null;
    const h = this.world.hallById(tk.hall); if (!h) return null; const H = h.cfg;
    if (r === h.key) { if (tk.watched) { const d = this.world.doors.find((q) => q.hall === H.id && q.id.includes('Out0')); return d ? { key: 'goal.exit', pts: [{ x: d.x, y: H.y0, z: d.z }] } : null; }
      const s = h.seats.find((q) => q.id === tk.seat); if (!s) return null; let pts = null; try { pts = this.crowd.hallRoute(h, s, false); } catch (e) { pts = null; } return { key: 'goal.seat', vars: { seat: tk.seat }, pts: pts && pts.length ? pts : [{ x: s.x, y: s.y, z: s.z }], inHall: true }; }
    if (r === 'spine' || (r.startsWith('hall') && tk.watched)) return { key: 'goal.lobby', pts: this.route(p, 'lobbyBack') };   // v14 no jump to the lobby: the way back down the spine
    if (tk.watched || r.startsWith('hall')) return null;
    if (r === 'street') return { key: 'goal.enter', pts: this.route(p, 'doorIn') };
    if (game === 'flow' && !tk.checked) { if (r !== 'lobby' || up) return null; const u = this.crowd.staff && this.crowd.staff.usher, at = u && u.state !== 'guiding' && Math.abs(u.y) < 1 ? [{ x: u.x, y: 0, z: u.z }] : []; return { key: 'goal.gate', pts: this.route(p, 'gate', at) }; }
    const side = SIDE(H), door = DOORS.find((d) => d.id === H.id + 'In'), end = door ? [{ x: door.x, y: L1, z: door.z }] : [];
    if (!up && r === 'lobby') return { key: 'goal.up', pts: this.route(p, 'escBot') };
    return { key: 'goal.hall', vars: { name: H.name.replace('LUMIERE ', '') }, pts: this.route(p, side[side.length - 1], end) };
  }
  // call a few times a second; returns { key, vars, aim: {x, z}, dist } or null
  update(st) {
    const g = this.plan(st); if (!g || !g.pts || !g.pts.length) { this.cur = null; return null; }
    const p = st.player, pts = g.pts, W = this.world.walls; let ai = 0;
    if (g.inHall) { let bd = 1e9; for (let i = 0; i < pts.length; i++) { const d = Math.hypot(pts[i].x - p.x, pts[i].y - p.y, pts[i].z - p.z); if (d < bd) { bd = d; ai = i; } } if (bd < 2.5 && ai < pts.length - 1) ai++; }   // a raked hall: follow the aisle, then the row
    else for (let i = pts.length - 1; i >= 0; i--) { const q = pts[i]; if (Math.abs(q.y - p.y) > 1.3) continue; if (W.sees(p.x, p.z, q.x, q.z, p.y + 0.5, p.y + 1.7)) { ai = i; break; } }
    // close to the point you were sent to and more to come: look to the next one
    if (ai < pts.length - 1 && Math.hypot(pts[ai].x - p.x, pts[ai].z - p.z) < 1.0) ai++;
    let dist = Math.hypot(pts[ai].x - p.x, pts[ai].z - p.z); for (let i = ai; i < pts.length - 1; i++) dist += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y, pts[i + 1].z - pts[i].z);
    this.cur = { key: g.key, vars: g.vars, aim: pts[ai], dist, pts, ai }; return this.cur;   // v12b pts/ai: guide.js draws the way to the farthest point in sight
  }
}
