"""LUMIERE v9 validation gate (docs/V9-DESIGN.md section 8), run on a built room before it is baked:
  see-through: from a grid of standing (1.6 m) and seated (1.1 m) eye points on every floor, rays in 96 directions must hit a FRONT face
               inside the model. A ray that escapes, or that hits a back face (what the engine culls: you would see through it), fails.
               Door openings are plugged for the test (the engine draws the door leaves there).
  thickness:  every edge of the solid must be shared by two triangles that face away from each other's backs: an open (non-manifold)
               edge count is reported per material.
usage: blender --background --factory-startup --python tools/blender/arch/gate.py -- ROOM_JSON SPEC_JSON [--max-fail 0.002]"""
import bpy, sys, json, base64, math, random
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
argv = sys.argv[sys.argv.index('--') + 1:]
D = json.load(open(argv[0])); SPEC = json.load(open(argv[1])); key = D['key']
maxfail = float(argv[argv.index('--max-fail') + 1]) if '--max-fail' in argv else 0.0005
arr = lambda s, dt, w=1: (np.frombuffer(base64.b64decode(s), dtype=dt).reshape(-1, w) if w > 1 else np.frombuffer(base64.b64decode(s), dtype=dt))
P = arr(D['solid']['pos'], np.float32, 3).astype(np.float64); M = arr(D['solid']['mat'], np.float32)
tris = [(3 * i, 3 * i + 1, 3 * i + 2) for i in range(len(P) // 3)]
verts = [Vector(p) for p in P]
# plug door openings of this room (a quad across each opening, both faces, so rays stop there)
plugs = 0
for d in SPEC['DOORS']:
    if key not in d['rooms']: continue
    y0, y1, w = d['y'], d['y'] + d['h'], d['w'] / 2
    if d['axis'] == 'z': q = [(d['x'], y0, d['z'] - w), (d['x'], y0, d['z'] + w), (d['x'], y1, d['z'] + w), (d['x'], y1, d['z'] - w)]
    else: q = [(d['x'] - w, y0, d['z']), (d['x'] + w, y0, d['z']), (d['x'] + w, y1, d['z']), (d['x'] - w, y1, d['z'])]
    b = len(verts); verts += [Vector(p) for p in q]; tris += [(b, b + 1, b + 2), (b, b + 2, b + 3), (b, b + 2, b + 1), (b, b + 3, b + 2)]; plugs += 1
nsolid = len(P) // 3
# neighbouring rooms (--with a.json,b.json): their walls close this room in the game (e.g. the halls' screen walls line the spine)
if '--with' in argv:
    for f in argv[argv.index('--with') + 1].split(','):
        Q = arr(json.load(open(f))['solid']['pos'], np.float32, 3).astype(np.float64); b = len(verts)
        verts += [Vector(p) for p in Q]; tris += [(b + 3 * i, b + 3 * i + 1, b + 3 * i + 2) for i in range(len(Q) // 3)]
T = BVHTree.FromPolygons(verts, tris, epsilon=0.0)
x0, z0, x1, z1 = D['lights']['rect']; ceil = D['lights']['ceil']
rnd = random.Random(1)
dirs = []
for i in range(96):   # Fibonacci sphere
    yv = 1 - (i + 0.5) / 96 * 2; r = math.sqrt(1 - yv * yv); t = math.pi * (3 - math.sqrt(5)) * i
    dirs.append(Vector((math.cos(t) * r, yv, math.sin(t) * r)))
eyes = []
step = 1.5
x = x0 + 0.6
while x < x1 - 0.5:
    z = z0 + 0.6
    while z < z1 - 0.5:
        # every floor under this point: the top-most walkable surface, then further floors only below a closed slab (a downward face)
        o = Vector((x, ceil - 0.15, z)); dn = Vector((0, -1, 0)); guard = 0; need_under = False
        while guard < 6:
            guard += 1; loc, nrm, idx, dist = T.ray_cast(o, dn, 60)
            if loc is None: break
            if idx < nsolid and nrm.y > 0.7:
                if need_under: break
                for hgt in (1.6, 1.1):
                    e = loc + Vector((0, hgt, 0))
                    up, _, _, du = T.ray_cast(loc + Vector((0, 0.05, 0)), Vector((0, 1, 0)), hgt)
                    if up is not None: continue
                    # inside a solid (a wall the grid point fell into)? then most axis rays first meet a back face
                    inside = 0
                    for ax in (Vector((1, 0, 0)), Vector((-1, 0, 0)), Vector((0, 0, 1)), Vector((0, 0, -1)), Vector((0, 1, 0))):
                        l2, n2, i2, d2 = T.ray_cast(e, ax, 60)
                        if l2 is not None and i2 < nsolid and n2.dot(ax) > 0: inside += 1
                    if inside < 3: eyes.append(e)
                need_under = True
            elif idx < nsolid and nrm.y < -0.7: need_under = False
            o = loc + dn * 0.03
        z += step
    x += step
fails, total, worst = 0, 0, {}
mats = {}
for e in eyes:
    for dv in dirs:
        total += 1; loc, nrm, idx, dist = T.ray_cast(e, dv, 400)
        bad = loc is None or (idx < nsolid and nrm.dot(dv) > 1e-4)
        if bad:
            fails += 1; k = (round(e.x, 1), round(e.y, 1), round(e.z, 1)); worst[k] = worst.get(k, 0) + 1
            if loc is not None: m = int(M[3 * idx]); mats[m] = mats.get(m, 0) + 1
            else: mats['escape'] = mats.get('escape', 0) + 1
# open edges (thickness): an edge used by exactly one triangle of the solid
from collections import Counter
q = np.round(P / 0.0005).astype(np.int64)
ec = Counter()
for i in range(nsolid):
    a, b, c = (tuple(q[3 * i]), tuple(q[3 * i + 1]), tuple(q[3 * i + 2]))
    for u, v in ((a, b), (b, c), (c, a)): ec[(u, v) if u < v else (v, u)] += 1
openE = sum(1 for v in ec.values() if v == 1)
rate = fails / max(1, total)
print(f'GATE {key}: {len(eyes)} eye points, {total} rays, see-through {fails} ({rate * 100:.3f}%), plugs {plugs}, open edges {openE}, by material {mats}')
for k_, v in sorted(worst.items(), key=lambda kv: -kv[1])[:8]: print('   worst eye', k_, v)
print('GATE_RESULT', key, 'PASS' if rate <= maxfail else 'FAIL', round(rate, 5))
