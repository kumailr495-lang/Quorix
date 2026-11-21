"""LUMIERE v11 - every coplanar face pair a player can see (z-fighting, the user's zero-tolerance rule of 2026-11-15). Runs in Blender
(mathutils BVH ray casts); coplanar.py finds the pairs, this keeps those visible from a player's eye.

  1. build every room from spec.json (all of them: a room is seen from its neighbours through doors and glass)
  2. coplanar.pairs() per room: same-facing triangles whose planes are under 5 mm apart and overlap
  3. a pair counts when a point of its overlap, 3 mm in front of it, has a clear line (glass is see-through) to an eye point in front of it
     far enough away for the two faces to share a depth value (fight_from: any distance for one plane, 20 m for 0.5 mm, 41 m for 2 mm,
     65 m for 5 mm; 24-bit depth, near plane 0.1 m, two steps of margin), up to 90 m; eye points come from the real engine: node tools/dev/seethru.mjs OUT --no-static --step 1 --dump-points eyes.json
     (every reachable floor cell, seated eyes, escalators, lift, the taxi)
  4. --engine FILE: the engine's own meshes (props, panels, signs, the lift, doors, gates, escalators, seats) as world triangles, from
     node tools/dev/seethru.mjs OUT --no-static --grid --dump-tris engine.json; they are occluders too, and every pair with at least one
     engine triangle in it is tested the same way (against the engine and against every room); glow strips only against glow
usage: $BLENDER --background --factory-startup --python tools/blender/arch/zcheck.py -- --eyes eyes.json [room ...] [--engine FILE] [--json OUT]
exit code 1 when a visible coplanar pair (under 2 mm) is left; visible 2-5 mm pairs are listed as distance risks"""
import sys, os, json, math
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import numpy as np
import halls, rooms
from coplanar import _tris, _ccw, _clip, _area, GAP_FIGHT, GAP_SAFE, MIN_AREA, matname
from mathutils import Vector
from mathutils.bvhtree import BVHTree

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
opt = lambda k, d=None: argv[argv.index(k) + 1] if k in argv else d
EYES = json.load(open(opt('--eyes')))
skip = {opt('--eyes'), opt('--json'), opt('--engine')}
want = [a for a in argv if not a.startswith('--') and a not in skip] or ['hallMax', 'hallCurve', 'hallClassic', 'hall270', 'lobby', 'corridor', 'spine', 'wc', 'street', 'home']
if '--engine-only' in argv: want = []   # only the engine's meshes (the rooms are still built: they occlude and pair with them)
S = json.load(open(os.path.join(HERE, 'spec.json')))
ALL = ['hallMax', 'hallCurve', 'hallClassic', 'hall270', 'lobby', 'corridor', 'spine', 'wc', 'street', 'home']
GLASS = 10

built = {}
for key in ALL:
    hall = next((h for h in S['halls'] if h['key'] == key), None)
    if hall: acc, glow, *_ = halls.build_hall(hall, S['L1'])
    else: acc, glow, *_ = rooms.build(key, S)
    built[key] = (acc, glow)

V, F = [], []
for key, (acc, glow) in built.items():   # the occluders: every room's opaque triangles
    P = np.asarray(acc.P, np.float64).reshape(-1, 3, 3); M = np.asarray(acc.M).reshape(-1, 3)[:, 0]
    for t in P[M != GLASS]:
        b = len(V); V.extend(map(tuple, t)); F.append((b, b + 1, b + 2))
ENG = None
if opt('--engine'):   # the engine's meshes: occluders, and the subject of the engine pass below
    import base64
    D = json.load(open(opt('--engine'))); ET = np.frombuffer(base64.b64decode(D['tris']), np.float32).astype(np.float64).reshape(-1, 3, 3)
    EM = np.frombuffer(base64.b64decode(D['meta']), np.int32).reshape(-1, 2); ENG = (ET, EM, D['names'], {int(k): v for k, v in D['mats'].items()})
    for t in ET:
        b = len(V); V.extend(map(tuple, t)); F.append((b, b + 1, b + 2))
bvh = BVHTree.FromPolygons(V, F, epsilon=0.0)
E = np.asarray([(e['x'], e['eye'], e['z']) for e in EYES], np.float64)
print(f'occluders {len(F)} triangles, {len(E)} eye points', flush=True)


DEPTH_K = 0.1 * 2 ** 24 / 2   # near plane 0.1 m, 24-bit depth, a margin of two steps: faces g metres apart fight beyond sqrt(g * DEPTH_K) m


def fight_from(gap):
    """the distance beyond which two faces this far apart share a depth value (0 for faces in one plane: they fight at any distance)"""
    return math.sqrt(max(gap, 0.0) * DEPTH_K) if gap > 5e-5 else 0.0


def visible(p, n, dmin=0.0):
    """a clear line from p (on the face, nudged 3 mm out) to any eye in front of the face, from dmin up to 90 m"""
    q = p + n * 0.003; D = E - q; dist = np.linalg.norm(D, axis=1)
    ok = (dist < 90) & (dist >= dmin) & ((D @ n) > 0.02 * dist); idx = np.nonzero(ok)[0]
    for i in idx[np.argsort(dist[idx])]:
        d = D[i] / dist[i]; hit = bvh.ray_cast(Vector(q), Vector(d), dist[i] - 0.05)
        if hit[0] is None: return EYES[int(i)]
    return None


def places(acc, glow_only=False):
    """coplanar pairs grouped by 25 cm cell and material pair, each with sample points on the overlap"""
    T, n, d, idx = _tris(acc.P)
    M = None if glow_only else np.asarray(acc.M).reshape(-1, 3)[:, 0]
    key = np.round(n * 2000).astype(np.int64); groups = {}
    for i, k in enumerate(map(tuple, key)): groups.setdefault(k, []).append(i)
    out = {}
    for k, ids in groups.items():
        if len(ids) < 2: continue
        ids = np.asarray(ids); nn = n[ids[0]]; ax = int(np.abs(nn).argmax()); u, v = [(1, 2), (2, 0), (0, 1)][ax]
        order = ids[np.argsort(d[ids])]; dd = d[order]; T2 = T[order][:, :, [u, v]]; lo = T2.min(1); hi = T2.max(1); j0 = 0
        for a in range(len(order)):
            while dd[a] - dd[j0] >= GAP_SAFE - 1e-6: j0 += 1   # 5 mm and more apart: safe
            for b in range(j0, a):
                if lo[a, 0] >= hi[b, 0] - 1e-9 or lo[b, 0] >= hi[a, 0] - 1e-9 or lo[a, 1] >= hi[b, 1] - 1e-9 or lo[b, 1] >= hi[a, 1] - 1e-9: continue
                poly = _ccw([tuple(p) for p in T2[a]]); c = _ccw([tuple(p) for p in T2[b]])
                for i in range(3):
                    poly = _clip(poly, c[i], c[(i + 1) % 3])
                    if len(poly) < 3: break
                ar = abs(_area(poly)) if len(poly) > 2 else 0.0
                if ar <= MIN_AREA: continue
                pc = np.mean(poly, 0); smp = [pc] + [pc + (np.asarray(p) - pc) * 0.8 for p in poly]   # the middle and near the corners

                def to3(q2):
                    p3 = np.zeros(3); p3[u], p3[v] = q2; p3[ax] = (dd[a] - nn[u] * q2[0] - nn[v] * q2[1]) / nn[ax]; return p3
                ia, ib = order[a], order[b]; g = abs(dd[a] - dd[b])
                mm = ('glow', 'glow') if M is None else tuple(sorted((NM(M[ia]), NM(M[ib]))))
                c3 = to3(pc); cell = tuple(np.round(c3 / 0.25).astype(int)) + tuple(np.round(nn * 20).astype(int)); kind = 'coplanar' if g < GAP_FIGHT else 'close'   # per facing: the samples are pushed off along it
                e = out.setdefault((kind, mm, cell), {'area': 0.0, 'gap': g, 'n': nn, 'pts': [], 'at': c3, 'tris': []})
                e['area'] += ar; e['gap'] = min(e['gap'], g); e['pts'].extend(to3(q) for q in smp); e['tris'].append((int(idx[ia]), int(idx[ib])))
    return out


def engine_places(T, n, d, src, label, glow):
    """coplanar pairs with at least one engine triangle (src 1); label[i]: the mesh (and material) a triangle belongs to"""
    key = np.round(n * 2000).astype(np.int64); groups = {}
    for i, k in enumerate(map(tuple, key)): groups.setdefault(k, []).append(i)
    out = {}
    for k, ids in groups.items():
        ids = np.asarray(ids)
        if len(ids) < 2 or not src[ids].any(): continue
        nn = n[ids[0]]; ax = int(np.abs(nn).argmax()); u, v = [(1, 2), (2, 0), (0, 1)][ax]
        order = ids[np.argsort(d[ids])]; dd = d[order]; T2 = T[order][:, :, [u, v]]; lo = T2.min(1); hi = T2.max(1); so = src[order]; go = glow[order]; j0 = 0
        for a in range(len(order)):
            while dd[a] - dd[j0] >= GAP_SAFE - 1e-6: j0 += 1
            if a == j0: continue
            w = slice(j0, a); m = (lo[w, 0] < hi[a, 0] - 1e-9) & (lo[a, 0] < hi[w, 0] - 1e-9) & (lo[w, 1] < hi[a, 1] - 1e-9) & (lo[a, 1] < hi[w, 1] - 1e-9) & (so[w] | so[a]) & (go[w] == go[a])
            for b in (np.nonzero(m)[0] + j0):
                poly = _ccw([tuple(p) for p in T2[a]]); c = _ccw([tuple(p) for p in T2[b]])
                for i in range(3):
                    poly = _clip(poly, c[i], c[(i + 1) % 3])
                    if len(poly) < 3: break
                ar = abs(_area(poly)) if len(poly) > 2 else 0.0
                if ar <= MIN_AREA: continue
                pc = np.mean(poly, 0); smp = [pc] + [pc + (np.asarray(p) - pc) * 0.8 for p in poly]
                def to3(q2):
                    p3 = np.zeros(3); p3[u], p3[v] = q2; p3[ax] = (dd[a] - nn[u] * q2[0] - nn[v] * q2[1]) / nn[ax]; return p3
                ia, ib = order[a], order[b]; g = abs(dd[a] - dd[b]); c3 = to3(pc); kind = 'coplanar' if g < GAP_FIGHT else 'close'
                kk = (kind, tuple(sorted((label[ia], label[ib]))), tuple(np.round(c3 / 0.25).astype(int)) + tuple(np.round(nn * 20).astype(int)))   # per facing
                e = out.setdefault(kk, {'area': 0.0, 'gap': g, 'n': nn, 'pts': [], 'at': c3}); e['area'] += ar; e['gap'] = min(e['gap'], g); e['pts'].extend(to3(q) for q in smp)
    return out


NM = matname(); res = {}; bad = 0; risk = 0
for key in want:
    acc, glow = built[key]; rows = []
    for label, src, go in (('', acc, False), (' glow', glow, True)):
        if not len(src.P): continue
        for (kind, mm, cell), e in places(src, go).items():
            eye = None
            for p in e['pts']:
                eye = visible(np.asarray(p), np.asarray(e['n']), fight_from(e['gap']))
                if eye: break
            if not eye: continue
            rows.append({'kind': kind, 'mats': mm, 'at': [round(float(x), 3) for x in e['at']], 'n': [round(float(x), 3) for x in e['n']], 'area_cm2': round(e['area'] * 1e4, 1),
                         'gap_mm': round(e['gap'] * 1000, 1), 'eye': [eye['x'], eye['eye'], eye['z']], 'eye_tag': eye['tag'], 'glow': go})
    rows.sort(key=lambda r: (r['kind'], -r['area_cm2'])); res[key] = rows
    nb = sum(r['kind'] == 'coplanar' for r in rows); nr = len(rows) - nb; bad += nb; risk += nr
    print(f'{key}: {nb} visible coplanar places, {nr} visible 2-5 mm places', flush=True)
    for r in rows[:60]:
        print(f"  {r['kind']}{' glow' if r['glow'] else ''}: {r['mats'][0]}/{r['mats'][1]} {r['area_cm2']} cm2 at {tuple(r['at'])} n {tuple(r['n'])} gap {r['gap_mm']} mm, seen from {r['eye_tag']} {tuple(r['eye'])}")
if ENG:   # the engine's meshes against themselves and against the builder's rooms
    ET, EM, names, mats = ENG; TT = [ET]; LB = [f"{names[i]['name']}:{mats.get(int(m), m)}" for i, m in EM]; SRC = [np.ones(len(ET), bool)]
    GL = [np.asarray([names[i]['glow'] for i, _ in EM], bool)]
    for key, (acc, glow) in built.items():
        P = np.asarray(acc.P, np.float64).reshape(-1, 3, 3); M = np.asarray(acc.M).reshape(-1, 3)[:, 0]; keep = M != GLASS
        TT.append(P[keep]); LB += [f'{key}-shell:{NM(m)}' for m in M[keep]]; SRC.append(np.zeros(int(keep.sum()), bool)); GL.append(np.zeros(int(keep.sum()), bool))
        if len(glow.P): G_ = np.asarray(glow.P, np.float64).reshape(-1, 3, 3); TT.append(G_); LB += [f'{key}-glow:glow'] * len(G_); SRC.append(np.zeros(len(G_), bool)); GL.append(np.ones(len(G_), bool))
    T = np.concatenate(TT); nrm = np.cross(T[:, 1] - T[:, 0], T[:, 2] - T[:, 0]); L = np.linalg.norm(nrm, axis=1); ok = L > 1e-10
    T, nrm, src, glw = T[ok], nrm[ok] / L[ok][:, None], np.concatenate(SRC)[ok], np.concatenate(GL)[ok]; lab = [LB[i] for i in np.nonzero(ok)[0]]
    rows = []
    for (kind, mm, cell), e in engine_places(T, nrm, (nrm * T[:, 0]).sum(1), src, lab, glw).items():
        eye = None
        for p in e['pts']:
            eye = visible(np.asarray(p), np.asarray(e['n']), fight_from(e['gap']))
            if eye: break
        if eye: rows.append({'kind': kind, 'mats': mm, 'at': [round(float(x), 3) for x in e['at']], 'n': [round(float(x), 3) for x in e['n']], 'area_cm2': round(e['area'] * 1e4, 1),
                             'gap_mm': round(e['gap'] * 1000, 1), 'eye': [eye['x'], eye['eye'], eye['z']], 'eye_tag': eye['tag']})
    rows.sort(key=lambda r: (r['kind'], -r['area_cm2'])); res['engine'] = rows
    nb = sum(r['kind'] == 'coplanar' for r in rows); bad += nb; risk += len(rows) - nb
    print(f'engine: {nb} visible coplanar places, {len(rows) - nb} visible 2-5 mm places', flush=True)
    for r in rows[:80]: print(f"  {r['kind']}: {r['mats'][0]} / {r['mats'][1]} {r['area_cm2']} cm2 at {tuple(r['at'])} n {tuple(r['n'])} gap {r['gap_mm']} mm, seen from {r['eye_tag']} {tuple(r['eye'])}")
if opt('--json'): json.dump(res, open(opt('--json'), 'w'), indent=1)
print(f'TOTAL visible coplanar {bad}, visible close {risk}', flush=True)
sys.exit(1 if bad else 0)
