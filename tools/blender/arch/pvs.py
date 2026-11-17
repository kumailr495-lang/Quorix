"""Which furniture meshes can be seen from which room (the user, 2026-11-17: nothing may disappear while it is still in sight).

world9.js setVisibility hides a room's prop meshes (street-props, lobby-propsdeep, wc-props, corridor-props and their glows) while the
player stands in certain other rooms, to save triangles. A mesh may only be hidden from a room if no part of it can be seen from any
point a player can stand in that room. This ray-tests that, with the same occluders, eye points and engine dump as zcheck.py
(tools/dev/zcheck.sh writes eyes.json and engine.json):

    blender --background --factory-startup --python tools/blender/arch/pvs.py -- --eyes OUT/eyes.json --engine OUT/engine.json [--json PVS.json]

It prints, per prop mesh, the rooms it is seen from (and how many of its sample points), and writes {mesh: [rooms]} with --json."""
import os, sys, json, math, random, re, base64
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import numpy as np
import rooms, halls
from mathutils import Vector
from mathutils.bvhtree import BVHTree

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
opt = lambda k, d=None: argv[argv.index(k) + 1] if k in argv else d
EYES = json.load(open(opt('--eyes'))); S = json.load(open(os.path.join(HERE, 'spec.json')))
ALL = ['hallMax', 'hallCurve', 'hallClassic', 'hall270', 'lobby', 'corridor', 'spine', 'wc', 'street']
GLASS = 10
V, F = [], []
for key in ALL:   # the rooms' opaque triangles occlude
    hall = next((h for h in S['halls'] if h['key'] == key), None)
    acc = halls.build_hall(hall, S['L1'])[0] if hall else rooms.build(key, S)[0]
    P = np.asarray(acc.P, np.float64).reshape(-1, 3, 3); M = np.asarray(acc.M).reshape(-1, 3)[:, 0]
    for t in P[M != GLASS]:
        b = len(V); V.extend(map(tuple, t)); F.append((b, b + 1, b + 2))
D = json.load(open(opt('--engine'))); ET = np.frombuffer(base64.b64decode(D['tris']), np.float32).astype(np.float64).reshape(-1, 3, 3)
EM = np.frombuffer(base64.b64decode(D['meta']), np.int32).reshape(-1, 2); NAMES = [n['name'] for n in D['names']]
for t in ET:   # and so do the engine's own meshes
    b = len(V); V.extend(map(tuple, t)); F.append((b, b + 1, b + 2))
bvh = BVHTree.FromPolygons(V, F, epsilon=0.0)

rnd = random.Random(5)
room_of = lambda tag: tag.split(':')[0]
EYE = {}
for e in EYES: EYE.setdefault(room_of(e['tag']), []).append((e['x'], e['eye'], e['z']))
for k in EYE:   # at most 400 eye points a room, spread over it (a seeded sample)
    pts = EYE[k]; EYE[k] = np.asarray(pts if len(pts) <= 400 else rnd.sample(pts, 400), np.float64)

TARGET = re.compile(r'^(street|lobby|wc|corridor|spine)/\1-(props|propglow|propsdeep|propglowdeep)$')
out = {}
for ni, name in enumerate(NAMES):
    if not TARGET.match(name) or name in out: continue
    T = ET[EM[:, 0] == ni]
    if not len(T): continue
    n = np.cross(T[:, 1] - T[:, 0], T[:, 2] - T[:, 0]); ln = np.linalg.norm(n, axis=1); keep = ln > 1e-9; T, n = T[keep], n[keep] / ln[keep, None]
    idx = list(range(len(T))); rnd.shuffle(idx); idx = idx[:1500]
    C = T[idx].mean(axis=1); N = n[idx]
    seen = {}
    for room, E in EYE.items():
        hits = 0
        for c, nn in zip(C, N):
            q = c + nn * 0.003; Dv = E - q; dist = np.linalg.norm(Dv, axis=1)
            ok = (dist < 90) & ((Dv @ nn) > 0.02 * dist); sel = np.nonzero(ok)[0]
            for i in sel[np.argsort(dist[sel])][:60]:   # the 60 nearest eyes that face it
                if bvh.ray_cast(Vector(q), Vector(Dv[i] / dist[i]), dist[i] - 0.05)[0] is None: hits += 1; break
        if hits: seen[room] = hits
    out[name] = seen
    print(f"{name:32s} {len(T):6d} tris, seen from: " + ', '.join(f'{r} ({h})' for r, h in sorted(seen.items(), key=lambda x: -x[1])), flush=True)
if opt('--json'): json.dump({k: sorted(v) for k, v in out.items()}, open(opt('--json'), 'w'), indent=1)
