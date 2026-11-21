// LUMIERE v12 - traffic (the user: "make it so the taxi actually came from somewhere and is going somewhere after leaving you, rather
// than blocking the entrance and exit"). Each end of the street has a lane running north (tools/blender/arch/street12.py side_street);
// 16 m up, each lane turns behind its corner block, out of sight of anywhere a player can stand. Cars appear and vanish there.
// A route is a polyline of straight runs, arcs and lane changes (left-hand traffic, as in India). A car is driven by arc length: its
// speed is held under a profile (the route's curvature at 2.4 m/s2 sideways, braking at 2.6 m/s2 into slow parts and to the end) and
// under a stop for whatever is in its path (the player, or the car ahead). The intro's taxi drives the same routes (intro9.js): in down
// the west lane to the TAXI bay, out round the east corner once its door has shut. Passing cars use two through routes, one each way.
import * as THREE from 'three';
import { STREET } from './building.js';
import { assetGeometry } from './assets.js';
import { Acc, toGeometry } from './geom.js';
import { MAT } from './library.js';

const A_LAT = 2.4, A_BRK = 2.6, A_ACC = 1.9, V_MAX = 9.0, ROAD_Y = -0.15;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), ease = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
// heading h: the direction (sin h, cos h); 0 = +z, pi/2 = +x. Left of it: (cos h, -sin h) (facing +z, +x is on your left)
const left = (h) => [Math.cos(h), -Math.sin(h)];

// ------------------------------------------------------------------ building a route
export function path(x, z, h) {
  const P = [[x, z]]; let H = h;
  const api = {
    // straight on for L metres
    go(L, step = 0.5) { const [ax, az] = P[P.length - 1], n = Math.max(1, Math.ceil(L / step)); for (let i = 1; i <= n; i++) P.push([ax + Math.sin(H) * L * i / n, az + Math.cos(H) * L * i / n]); return api; },
    // straight on to where x (heading +-x) or z (heading +-z) reaches v
    till(axis, v, step = 0.5) { const [ax, az] = P[P.length - 1], d = axis === 'x' ? (v - ax) / (Math.sin(H) || 1e-9) : (v - az) / (Math.cos(H) || 1e-9); return d > 0.01 ? api.go(d, step) : api; },
    // a turn of radius r onto heading h1 (the centre on the inside of the turn)
    turn(h1, r, step = 0.35) { const d = wrap(h1 - H), sg = Math.sign(d), [px, pz] = P[P.length - 1], l0 = left(H), cx = px + sg * r * l0[0], cz = pz + sg * r * l0[1], n = Math.max(2, Math.ceil(Math.abs(d) * r / step));
      for (let i = 1; i <= n; i++) { const hh = H + d * i / n, l = left(hh); P.push([cx - sg * r * l[0], cz - sg * r * l[1]]); } H = H + d; return api; },
    // a lane change over L metres: d metres to the left (negative: to the right)
    shift(L, d, step = 0.5) { const [ax, az] = P[P.length - 1], l = left(H), n = Math.max(2, Math.ceil(L / step)); for (let i = 1; i <= n; i++) { const u = i / n, e = ease(u) * d; P.push([ax + Math.sin(H) * L * u + l[0] * e, az + Math.cos(H) * L * u + l[1] * e]); } return api; },
    end(o = {}) { return new Route(P, o); },
  };
  return api;
}
export class Route {
  constructor(P, o = {}) {
    this.P = P; const n = P.length, S = this.S = new Float64Array(n); for (let i = 1; i < n; i++) S[i] = S[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); this.L = S[n - 1];
    // the speed profile: the curvature's limit, the route's own limits (o.vmax), its end speed (o.v1), then braking back from all of it
    const V = this.V = new Float64Array(n); const vmax = o.vmax || V_MAX;
    for (let i = 0; i < n; i++) { const a = this.at(Math.max(0, S[i] - 2)), b = this.at(Math.min(this.L, S[i] + 2)), k = Math.abs(wrap(b.h - a.h)) / Math.max(0.5, Math.min(this.L, S[i] + 2) - Math.max(0, S[i] - 2)); V[i] = Math.min(vmax, k > 1e-4 ? Math.sqrt(A_LAT / k) : vmax); }
    if (o.v1 != null) V[n - 1] = Math.min(V[n - 1], o.v1);
    for (let i = n - 2; i >= 0; i--) V[i] = Math.min(V[i], Math.sqrt(V[i + 1] * V[i + 1] + 2 * A_BRK * (S[i + 1] - S[i])));
    // its timing from a standing start or a rolling one (o.v0): accelerating at A_ACC under the profile
    const T = this.T = new Float64Array(n), U = this.U = new Float64Array(n); U[0] = Math.min(o.v0 ?? 0, V[0]);
    for (let i = 1; i < n; i++) { const ds = S[i] - S[i - 1]; U[i] = Math.min(V[i], Math.sqrt(U[i - 1] * U[i - 1] + 2 * A_ACC * ds)); T[i] = T[i - 1] + ds / Math.max(0.15, (U[i] + U[i - 1]) / 2); }
    this.dur = T[n - 1];
  }
  _seg(arr, v) { let lo = 0, hi = arr.length - 1; if (v <= arr[0]) return [0, 0]; if (v >= arr[hi]) return [hi - 1, 1]; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (arr[m] <= v) lo = m; else hi = m; } return [lo, (v - arr[lo]) / Math.max(1e-9, arr[lo + 1] - arr[lo])]; }
  // the point at arc length s and the heading there (from 0.6 m either side: the car turns smoothly through the polyline's corners)
  at(s) { const P = this.P, [i, f] = this._seg(this.S, clamp(s, 0, this.L)), x = P[i][0] + (P[i + 1][0] - P[i][0]) * f, z = P[i][1] + (P[i + 1][1] - P[i][1]) * f;
    const [j, g] = this._seg(this.S, clamp(s - 0.6, 0, this.L)), [k, q] = this._seg(this.S, clamp(s + 0.6, 0, this.L)), ax = P[j][0] + (P[j + 1][0] - P[j][0]) * g, az = P[j][1] + (P[j + 1][1] - P[j][1]) * g, bx = P[k][0] + (P[k + 1][0] - P[k][0]) * q, bz = P[k][1] + (P[k + 1][1] - P[k][1]) * q;
    return { x, z, h: Math.atan2(bx - ax, bz - az) }; }
  vmax(s) { const [i, f] = this._seg(this.S, clamp(s, 0, this.L)); return this.V[i] + (this.V[i + 1] - this.V[i]) * f; }
  // the scripted timing (no obstacles): arc length at time t, and the speed there
  sAt(t) { const [i, f] = this._seg(this.T, t); return this.S[i] + (this.S[i + 1] - this.S[i]) * f; }
  vAt(t) { const [i, f] = this._seg(this.T, t); return this.U[i] + (this.U[i + 1] - this.U[i]) * f; }
}

// ------------------------------------------------------------------ the street's routes (from the lanes' plan in the street's extras)
export function streetRoutes(plan, stopX) {
  const { zt, zc, sw, se } = plan, R0 = STREET.road[0], R1 = STREET.road[1];
  const lane = { bay: 27.85, near: R0 + 1.85, far: R1 - 1.85 };   // the TAXI bay along the kerb, and the two running lanes
  const wS = sw[0] + 2.5, wN = sw[1] - 2.5, eS = se[0] + 2.5, eN = se[1] - 2.5;   // the side lanes' halves: southbound west, northbound east
  const legE = zt + 2.25, legW = zc - 2.25;                                          // the hidden legs: eastbound on the south half, westbound north
  const S = Math.PI, E = Math.PI / 2, W = -Math.PI / 2, N = 0, r = 5.5;
  // east-bound: out of the west leg, down the west lane, right into the near lane, east, right up the east lane, left into the east leg
  const east = (fromX) => path(fromX, legE, E).till('x', wS - 4.2).turn(S, 4.2).till('z', lane.near + r).turn(E, r).till('x', eN - r).turn(N, r).till('z', legE - 4.2).turn(E, 4.2).till('x', se[1] + 15).end();
  // west-bound: out of the east leg, down the east lane, left into the far lane, west, left up the west lane, right into the west leg
  const west = path(se[1] + 15, legW, W).till('x', eS + 4.2).turn(S, 4.2).till('z', lane.far + 4.2).turn(W, 4.2).till('x', wN + 4.2).turn(N, 4.2).till('z', legW - r).turn(W, r).till('x', sw[0] - 15).end();
  // the taxi in: from 18 m up the west lane, right into the near lane, over into the bay 16 m short of the stop, to a halt at stopX
  const taxiIn = path(wS, zt - 2, S).till('z', lane.near + r).turn(E, r).till('x', stopX - 17).shift(11, lane.near - lane.bay).till('x', stopX).end({ v0: 6.5, v1: 0 });
  // the taxi out: from the bay into the near lane, east, right up the east lane, left into the east leg and gone
  const taxiOut = path(stopX, lane.bay, E).go(1.5).shift(10, -(lane.near - lane.bay)).till('x', eN - r).turn(N, r).till('z', legE - 4.2).turn(E, 4.2).till('x', se[1] + 15).end({ vmax: 8 });
  return { east: east(sw[0] - 15), west, taxiIn, taxiOut, lane };
}

// ------------------------------------------------------------------ what is ahead of a car on its route
// the nearest point of its route ahead (up to 34 m) that passes within 1.7 m of an obstacle: the distance to it along the route
function clearAhead(route, s, obstacles, self) {
  const hit = (d) => { const p = route.at(s + d); for (const o of obstacles) { if (o === self) continue; if (Math.abs(p.x - o.x) < 2.2 && Math.abs(p.z - o.z) < 2.2 && Math.hypot(p.x - o.x, p.z - o.z) < (o.r || 1.7)) return true; } return false; };
  // metre steps to find it, then halving to the centimetre (with whole metres the stop point jumped and the car crept on and stopped again)
  for (let d = 1; d < 34 && s + d <= route.L; d += 1) if (hit(d)) { let a = d - 1, b = d; for (let k = 0; k < 7; k++) { const m = (a + b) / 2; if (hit(m)) b = m; else a = m; } return b; }
  return Infinity;
}
// a car's speed this frame: under the route's profile and under a stop (its centre 4.5 m short of anything in its path: about a car's
// length and a half of space), at the car's own limits
export function drive(car, dt, obstacles) {
  const R = car.route, ahead = clearAhead(R, car.s, obstacles, car), cap = ahead < Infinity ? Math.sqrt(Math.max(0, 2 * A_BRK * (ahead - 4.5))) : Infinity;
  const want = Math.min(R.vmax(car.s + Math.max(0, car.v * 0.4)), cap);
  car.v = want > car.v ? Math.min(want, car.v + A_ACC * dt) : Math.max(want, car.v - A_BRK * 1.6 * dt);
  car.s = Math.min(R.L, car.s + car.v * dt); const p = R.at(car.s); car.x = p.x; car.z = p.z; car.h = p.h; return car.s >= R.L - 0.01;
}

// a car's light never drops under the night's own (a moonlit blue): between two lamps the street's light list gives almost nothing, and
// the taxi's yellow roof went black there
const FLOOR = [0.085, 0.095, 0.13];
export function carFloor(H) { for (let i = 0; i < 3; i++) H[i] = Math.max(H[i], FLOOR[i]); return H; }

// ------------------------------------------------------------------ passing cars
// saloons in five paints (one instanced mesh per paint: one draw each), out of a hidden leg every 6 to 14 s, never more than five (v12b,
// the user: the road "so empty"; it was three, every 9 to 20 s)
const PAINTS = [null, { car_red: { id: MAT.lacquer, tint: [0.56, 0.58, 0.62] } }, { car_red: { id: MAT.lacquer, tint: [0.035, 0.05, 0.11] } },
  { car_red: { id: MAT.lacquer, tint: [0.78, 0.78, 0.76] } }, { car_red: { id: MAT.lacquer, tint: [0.02, 0.06, 0.035] } }];   // red, silver, navy, pearl, racing green (assets.js swaps by material name)
export class Traffic {
  constructor(world, mats, sound, plan) {
    this.world = world; this.sound = sound; this.cars = []; this.meshes = []; this.t = 0; this.next = 6 + Math.random() * 6; this.blockers = []; this.paused = false;
    const room = world.rooms.street; this.room = room; this.routes = plan && streetRoutes(plan, 9.0); if (!room || !this.routes) return;
    for (const over of PAINTS) {
      const g = assetGeometry('car_sedan', 1, null, toGeometry, Acc, over) || assetGeometry('car_sedan', 0, null, toGeometry, Acc, over); if (!g) continue;
      for (const [n, k] of [['iLh', 3], ['iLf', 3], ['iLs', 1]]) g.setAttribute(n, new THREE.InstancedBufferAttribute(new Float32Array(2 * k), k));
      const m = new THREE.InstancedMesh(g, mats.litFor(room.U, g, true), 2); m.count = 0; m.frustumCulled = false; m.name = 'traffic'; room.group.add(m); this.meshes.push(m);
    }
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._up = new THREE.Vector3(0, 1, 0); this._H = [0, 0, 0]; this._F = [0, 0, 0];
  }
  // round bodies along each car, for the player's collisions (main.js adds them to the crowd's)
  bodiesNear(x, z, r, out = []) { for (const c of this.cars) if (Math.abs(c.x - x) < r + 3 && Math.abs(c.z - z) < r + 3) for (const k of [-1.45, 0, 1.45]) out.push({ x: c.x + Math.sin(c.h) * k, z: c.z + Math.cos(c.h) * k, r: 0.92 }); return out; }
  // is anything coming along the near lane towards x (the taxi checks before it pulls out of the bay)
  comingTo(x, lane, within = 26) { return this.cars.some((c) => Math.abs(c.z - lane) < 1.2 && x - c.x > -3 && x - c.x < within && Math.abs(Math.sin(c.h) - 1) < 0.2); }
  update(dt, player, extra = []) {
    if (!this.routes || !this.meshes.length) return; this.t += dt;
    if (!this.paused && this.t > this.next && this.cars.length < 5) {
      const way = Math.random() < 0.55 ? 'east' : 'west', R = this.routes[way], used = new Set(this.cars.map((c) => c.mesh.id + ':' + c.slot));
      const busy = this.cars.some((c) => c.route === R && c.s < 18); if (!busy) {
        let mesh = null, slot = -1; for (const m of this.meshes.slice().sort(() => Math.random() - 0.5)) { for (let k = 0; k < 2; k++) if (!used.has(m.id + ':' + k)) { mesh = m; slot = k; break; } if (mesh) break; }
        if (mesh) { const c = { route: R, s: 0, v: 6, x: 0, z: 0, h: 0, mesh, slot, r: 1.9, snd: this.sound.vehicle ? this.sound.vehicle() : null }; this.cars.push(c); }
        this.next = this.t + 6 + Math.random() * 8; }
    }
    const obs = [{ x: player.x, z: player.z, r: 1.5 }, ...extra, ...this.cars];
    for (let i = this.cars.length - 1; i >= 0; i--) { const c = this.cars[i]; if (drive(c, dt, obs)) { if (c.snd) c.snd.stop(); this.cars.splice(i, 1); } else if (c.snd) c.snd.set(c.x, c.z, c.v, this.hear ?? 1); }
    for (const m of this.meshes) m.count = 0;
    for (const m of this.meshes) { const mine = this.cars.filter((c) => c.mesh === m); m.count = mine.length ? 2 : 0;
      for (let k = 0; k < 2; k++) { const c = mine.find((q) => q.slot === k); if (c) { this._q.setFromAxisAngle(this._up, c.h); this._m.compose(new THREE.Vector3(c.x, ROAD_Y, c.z), this._q, new THREE.Vector3(1, 1, 1)); }
        else this._m.makeScale(0, 0, 0);
        m.setMatrixAt(k, this._m); if (c) { this.room.lights.at(c.x, 0.9, c.z, 0, 1, 0, this._H, this._F); carFloor(this._H); const G = m.geometry.attributes; G.iLh.array.set(this._H, k * 3); G.iLf.array.set(this._F, k * 3); G.iLh.needsUpdate = G.iLf.needsUpdate = true; } }
      m.instanceMatrix.needsUpdate = true; }
  }
}
