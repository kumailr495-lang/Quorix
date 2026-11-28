"""LUMIERE v11 - coplanar faces in the builder's rooms (z-fighting, the user's zero-tolerance rule of 2026-11-15).

Two front faces that face the same way and overlap within a few millimetres of each other's plane fight for the same pixels: the depth
buffer cannot order them (24 bits, near 0.1 m: about 0.5 mm of depth at 30 m, 1.5 mm at 50 m). This test finds every such pair in a room's
triangles, exhaustively (the render scan, tools/dev/seethru.mjs --zfight, only sees what its eye points see):
  coplanar  same facing, planes under GAP_FIGHT (2 mm) apart, overlapping by more than MIN_AREA: z-fighting at any distance;
  close     same facing, GAP_FIGHT up to GAP_SAFE (2 to under 5 mm) apart: fights beyond ~40 m (reported as risks, fixed when they can be seen that far).
Back-to-back faces (opposite normals) are culled from one side and never fight. Glow strips draw with a polygon offset over the shell, so
glow is only tested against glow.
usage: python3 tools/blender/arch/coplanar.py [room ...] [--all]   (exit 1 when any coplanar pair is found; --all also lists the close ones)"""
import math
import numpy as np

GAP_FIGHT, GAP_SAFE, MIN_AREA = 0.002, 0.005, 2e-6   # metres, metres, square metres (2 mm^2)
MATN = None


def _tris(P):
    T = np.asarray(P, np.float64).reshape(-1, 3, 3)
    n = np.cross(T[:, 1] - T[:, 0], T[:, 2] - T[:, 0]); L = np.linalg.norm(n, axis=1)
    ok = L > 1e-10; T, n, L = T[ok], n[ok], L[ok]; n = n / L[:, None]
    return T, n, (n * T[:, 0]).sum(1), np.nonzero(ok)[0]


def _clip(poly, a, b):
    """Sutherland-Hodgman: keep the part of a convex polygon on the left of a->b (counter-clockwise clip polygon)"""
    out = []
    for i in range(len(poly)):
        p, q = poly[i], poly[(i + 1) % len(poly)]
        sp = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]); sq = (b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0])
        if sp >= 0: out.append(p)
        if (sp >= 0) != (sq >= 0):
            t = sp / (sp - sq); out.append((p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t))
    return out


def _area(poly):
    return 0.5 * sum(poly[i][0] * poly[(i + 1) % len(poly)][1] - poly[(i + 1) % len(poly)][0] * poly[i][1] for i in range(len(poly))) if len(poly) > 2 else 0.0


def _ccw(t):
    return t if _area(t) >= 0 else t[::-1]


def overlap_area(t0, t1):
    poly = _ccw(t0); c = _ccw(t1)
    for i in range(3):
        poly = _clip(poly, c[i], c[(i + 1) % 3])
        if len(poly) < 3: return 0.0
    return abs(_area(poly))


def pairs(P, M, gap=GAP_SAFE, min_area=MIN_AREA):
    """P: flat vertex list (3 per triangle); M: per-vertex material ids (or None). Returns [(area, gap, i, j)] for same-facing triangles
    whose planes are under `gap` apart and which overlap by more than min_area once projected onto the plane."""
    T, n, d, idx = _tris(P)
    if not len(T): return []
    key = np.round(n * 2000).astype(np.int64)   # normals equal to ~5e-4
    groups = {}
    for i, k in enumerate(map(tuple, key)): groups.setdefault(k, []).append(i)
    out = []
    for k, ids in groups.items():
        if len(ids) < 2: continue
        ids = np.asarray(ids); nn = n[ids[0]]; ax = int(np.abs(nn).argmax()); u, v = [(1, 2), (2, 0), (0, 1)][ax]
        order = ids[np.argsort(d[ids])]; dd = d[order]
        T2 = T[order][:, :, [u, v]]; lo = T2.min(1); hi = T2.max(1)
        j0 = 0
        for a in range(len(order)):
            while dd[a] - dd[j0] >= gap - 1e-6: j0 += 1   # 5 mm and more apart: safe (the depth step is 4.9 mm at 90 m)
            for b in range(j0, a):   # every earlier triangle within `gap` of this plane
                if lo[a, 0] >= hi[b, 0] - 1e-9 or lo[b, 0] >= hi[a, 0] - 1e-9 or lo[a, 1] >= hi[b, 1] - 1e-9 or lo[b, 1] >= hi[a, 1] - 1e-9: continue
                ar = overlap_area([tuple(p) for p in T2[a]], [tuple(p) for p in T2[b]])
                if ar > min_area: out.append((ar, abs(dd[a] - dd[b]), int(idx[order[a]]), int(idx[order[b]])))
    return out


def report(key, P, M, names, all_=False, label=''):
    """prints the pairs grouped by place (5 cm cells) and material pair; returns (coplanar, close) counts"""
    hits = pairs(P, M)
    T = np.asarray(P, np.float64).reshape(-1, 3, 3)
    agg = {}
    for ar, g, i, j in hits:
        kind = 'coplanar' if g < GAP_FIGHT else 'close'
        if kind == 'close' and not all_: continue
        ma, mb = (names(M[3 * i]), names(M[3 * j])) if M is not None else ('glow', 'glow')
        c = (T[i].mean(0) + T[j].mean(0)) / 2; cell = tuple(np.round(c / 0.25).astype(int))
        e = agg.setdefault((kind, tuple(sorted((ma, mb))), cell), [0.0, c, g, 0]); e[0] += ar; e[3] += 1
    nco = sum(1 for (kd, _, _) in agg if kd == 'coplanar'); ncl = sum(1 for (kd, _, _) in agg if kd == 'close')
    for (kind, mm, cell), (ar, c, g, cnt) in sorted(agg.items(), key=lambda kv: (kv[0][0], -kv[1][0]))[:80]:
        print(f'  {key}{label} {kind}: {mm[0]}/{mm[1]} {ar * 1e4:.1f} cm2 at ({c[0]:.3f}, {c[1]:.3f}, {c[2]:.3f}) gap {g * 1000:.1f} mm ({cnt} tri pairs)')
    return nco, ncl


def matname():
    from geo import MAT
    inv = {}
    for k, v in MAT.items(): inv.setdefault(v, k)
    return lambda m: inv.get(int(round(m)), str(m))


def check_room(key, S, all_=False, quiet=False):
    import halls, rooms
    hall = next((h for h in S['halls'] if h['key'] == key), None)
    if hall: acc, glow, lit, occ, scr, probes, panels = halls.build_hall(hall, S['L1'])
    else: acc, glow, lit, extra = rooms.build(key, S)
    nm = matname()
    a, b = report(key, acc.P, acc.M, nm, all_)
    g, h = report(key, glow.P, None, nm, all_, ' glow') if len(glow.P) else (0, 0)
    if not quiet: print(f'{key}: {len(acc.P) // 3} triangles, {a + g} coplanar places' + (f', {b + h} close (2-5 mm)' if all_ else ''))
    return a + g, b + h


if __name__ == '__main__':
    import sys, os, json
    HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
    args = [a for a in sys.argv[1:] if not a.startswith('--')]; all_ = '--all' in sys.argv
    S = json.load(open(os.path.join(HERE, 'spec.json')))
    want = args or ['hallMax', 'hallCurve', 'hallClassic', 'hall270', 'lobby', 'corridor', 'spine', 'wc', 'street']
    tot = 0
    for key in want: tot += check_room(key, S, all_)[0]
    sys.exit(1 if tot else 0)
