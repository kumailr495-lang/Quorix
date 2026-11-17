"""LUMIERE v11 - every prop model's parts checked for the user's two rules of 2026-11-15: no part floats (disconnected models: a frame held
5 mm off its box, a body 4 cm over the counter, wheels 2 cm off the cart, door pulls 2 cm off the leaf) and no two faces fight (same-facing
faces under 2 mm apart that overlap). Runs in Blender on the GLBs as the game loads them.

  floating  parts grouped by contact (they touch: their surfaces come within 1.5 mm or they pass into each other); every group must reach
            the model's mounting: the floor (the model's lowest plane), or for a model hung from its origin (pendants, chandeliers: their
            top at y = 0) the ceiling, or for wall-mounted models (letters, numbers, mirrors, sconces, urinals: their back at x = 0)
            the wall. A group that does not is listed with the gap to its nearest neighbour.
  folds     two faces of one part in one plane facing opposite ways, one laid back over the other (see the code below)
  coplanar  same-facing faces of two parts under 2 mm apart that overlap (tools/blender/arch/coplanar.py), skipping the faces that rest on
            the mounting plane (a foot's sole on the floor is never seen) and level-of-detail copies (Kiln's "Part" / "Part.001")
usage: $BLENDER --background --factory-startup --python tools/blender/glb_check.py -- www/models/a.glb [b.glb ...] [--fix OFFSETS.json]
       (exit 1 on findings). --fix: every floating group within 15 mm of the rest is moved into it (2.5 mm past contact, along the line
       between their nearest points), one at a time until none is left; the moves go to OFFSETS.json as glTF node translations for
       tools/dev/glb-offsets.mjs to write into the GLBs (it keeps every material, name and extension as it is). Hall seats hang between their
       arm standards: for seat_* models the largest group is the anchor, not the floor.
The game's view of the same thing, with visibility: tools/dev/zcheck.sh (its engine pass)."""
import bpy, sys, os, re, math
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'arch'))
from coplanar import pairs

TOUCH, MOUNT = 0.0015, 0.002
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
paths = [a for a in argv if a.endswith('.glb')]; bad = 0; FIX = argv[argv.index('--fix') + 1] if '--fix' in argv else None; OFFS = {}
EMBED, REACH = 0.0025, 0.015


def base(n):
    return re.sub(r'\.\d{3}$', '', n)


def nearest(a, b):
    """the closest approach of two parts: (distance, point on a, point on b), from the vertices of each within 5 cm of the other's box"""
    best = (9.0, None, None)
    for u, w, flip in ((a, b, False), (b, a, True)):
        wlo, whi = w['V'].min(0), w['V'].max(0); m = np.all((u['V'] > wlo - 0.05) & (u['V'] < whi + 0.05), axis=1)
        for v in u['V'][m]:
            r = w['bvh'].find_nearest(Vector(v), 0.06)
            if r and r[0] is not None and r[3] < best[0]: best = (r[3], np.asarray(r[0]), v) if flip else (r[3], v, np.asarray(r[0]))
    return best


for path in paths:
    name = os.path.basename(path)[:-4]
    bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=path)
    dg = bpy.context.evaluated_depsgraph_get(); parts = []
    for ob in bpy.context.scene.objects:
        if ob.type != 'MESH' or re.search(r'_LOD[1-9]', ob.name): continue
        me = ob.evaluated_get(dg).to_mesh(); me.calc_loop_triangles(); mw = ob.matrix_world
        V = [tuple(mw @ v.co) for v in me.vertices]; F = [tuple(t.vertices) for t in me.loop_triangles]
        if not F: continue
        parts.append({'name': ob.name, 'V': np.asarray(V), 'F': F, 'bvh': BVHTree.FromPolygons(V, F, epsilon=0.0)})
    # Kiln writes a model's level-of-detail copies as "Part" and "Part.001": keep the first of each (Blender-built ones say _LOD1)
    if not any('_LOD' in p['name'] for p in parts):
        seen = set(); keep = []
        for p in parts:
            if base(p['name']) in seen and base(p['name']) != p['name']: continue
            seen.add(base(p['name'])); keep.append(p)
        parts = keep
    if not parts: continue
    allV = np.concatenate([p['V'] for p in parts]); lo, hi = allV.min(0), allV.max(0)   # glTF frame: y up; front +x (Kiln and the builders)
    hung = abs(hi[2]) < 0.02 and lo[2] < -0.05   # Blender imports y-up glTF as z-up: the model's up is z here
    wall = name.startswith(('letters_', 'num_', 'mirror_', 'sconce_', 'urinal', 'reel_wall'))
    mount = (lambda p: p['V'][:, 0].min() < lo[0] + MOUNT) if wall else ((lambda p: p['V'][:, 2].max() > hi[2] - MOUNT) if hung else (lambda p: p['V'][:, 2].min() < lo[2] + MOUNT))
    n = len(parts); seat = name.startswith('seat_')
    def analyse():
        par = list(range(n))
        def find(i):
            while par[i] != i: par[i] = par[par[i]]; i = par[i]
            return i
        near = {}
        for i in range(n):
            a = parts[i]; alo, ahi = a['V'].min(0), a['V'].max(0)
            for j in range(i + 1, n):
                b = parts[j]; blo, bhi = b['V'].min(0), b['V'].max(0)
                if np.any(alo > bhi + 0.05) or np.any(blo > ahi + 0.05): continue
                d = 0.0 if a['bvh'].overlap(b['bvh']) else nearest(a, b)[0]
                if d <= TOUCH: par[find(i)] = find(j)
                else:
                    for k, m in ((i, j), (j, i)):
                        if d < near.get(k, (9, ''))[0]: near[k] = (d, parts[m]['name'])
        groups = {}
        for i in range(n): groups.setdefault(find(i), []).append(i)
        gl = list(groups.values())
        if seat:   # the largest group is the anchor; a tip-up seat hangs on its pivots from the arm standards (another model)
            anchor = max(gl, key=lambda g: sum(len(parts[i]['V']) for i in g)); floating = [g for g in gl if g is not anchor and not any('Pivot' in parts[i]['name'] for i in g)]
        else: floating = [g for g in gl if not any(mount(parts[i]) for i in g)]
        return gl, floating, near
    groups_l, floating, near = analyse()
    while FIX and floating:   # move the floating group nearest to the rest into it, then look again
        fixed = set(i for g in groups_l for i in g) - set(i for g in floating for i in g); best = None
        for g in floating:
            for i in g:
                for j in fixed:
                    d, p_, q_ = nearest(parts[i], parts[j])
                    if best is None or d < best[0]: best = (d, g, p_, q_)
        if not best or best[0] > REACH: break
        d, g, p_, q_ = best; v = (q_ - p_); v = v / (np.linalg.norm(v) or 1) * (d + EMBED)
        for i in g:
            parts[i]['V'] = parts[i]['V'] + v; parts[i]['bvh'] = BVHTree.FromPolygons([tuple(x) for x in parts[i]['V']], parts[i]['F'], epsilon=0.0)
            o = OFFS.setdefault(name, {}).setdefault(parts[i]['name'], [0.0, 0.0, 0.0])
            o[0] += float(v[0]); o[1] += float(v[2]); o[2] += float(-v[1])   # Blender z-up -> glTF y-up
        print(f'   moved {", ".join(parts[i]["name"] for i in g)[:90]} by {(d + EMBED) * 1000:.1f} mm')
        groups_l, floating, near = analyse()
    groups = {k: g for k, g in enumerate(groups_l)}
    # coplanar faces between different parts (not the soles on the mounting plane)
    P, own = [], []
    for k, p in enumerate(parts):
        for f in p['F']:
            P.extend(tuple(p['V'][v]) for v in f); own.append(k)
    hits = pairs(P, None, gap=0.002, min_area=1e-6); T = np.asarray(P).reshape(-1, 3, 3); cop = {}
    for ar, g, i, j in hits:
        if own[i] == own[j]: continue
        c = (T[i].mean(0) + T[j].mean(0)) / 2
        if (not hung and not wall and c[2] < lo[2] + MOUNT) or (hung and c[2] > hi[2] - MOUNT) or (wall and c[0] < lo[0] + MOUNT): continue   # resting on the mount
        key = tuple(sorted((parts[own[i]]['name'], parts[own[j]]['name']))); e = cop.setdefault(key, [0.0, c, g]); e[0] += ar
    # folds inside a part: two faces in one plane facing opposite ways, one laid back over the other (an outline doubling back, a sweep
    # turning tighter than its width). Hidden when drawn one-sided; drawn from both sides (assets.js TWO_SIDED) they fight. Fix the source,
    # or remove the folded face with tools/dev/glb-unfold.mjs
    folds = []
    for p in parts:
        T = [tuple(tuple(p['V'][v]) for v in f) for f in p['F']]; m = len(T)
        if not m: continue
        Q = [c for t in T for c in t] + [c for t in T for c in (t[0], t[2], t[1])]
        for ar, g, i, j in pairs(Q, None, gap=0.0005, min_area=1e-9):
            if (i < m) != (j < m) and i % m != j % m and i < j: folds.append((ar, p['name'], [sum(c[k] for c in T[i % m]) / 3 for k in range(3)]))   # where: the first face's centre
    nf = sum(len(g) for g in floating); bad += nf + len(cop) + len(folds)
    print(f'== {name}: {n} parts, {len(groups)} groups, {nf} floating, {len(cop)} coplanar pairs, {len(folds)} folds' + (' (hung)' if hung else ' (wall)' if wall else ''))
    for ar, pn, g in sorted(folds, key=lambda q: -q[0])[:6]: print(f'   fold: {pn} {ar * 1e4:.3f} cm2 at ({g[0]:.3f}, {g[1]:.3f}, {g[2]:.3f})')
    for g in floating:
        names = [parts[i]['name'] for i in g]; d = min((near.get(i, (9, ''))) for i in g)
        print(f'   floating: {", ".join(names if "--long" in argv else names[:6])}{" ..." if len(names) > 6 and "--long" not in argv else ""} (nearest: {d[1]} {d[0] * 1000:.1f} mm)')
    for (a, b), (ar, c, g) in sorted(cop.items(), key=lambda kv: -kv[1][0])[:12]:
        print(f'   coplanar: {a} | {b} {ar * 1e4:.1f} cm2, gap {g * 1000:.1f} mm at ({c[0]:.3f}, {c[1]:.3f}, {c[2]:.3f})')
if FIX:
    import json; json.dump(OFFS, open(FIX, 'w'), indent=1); print('offsets for', len(OFFS), 'models ->', FIX)
sys.exit(1 if bad else 0)
