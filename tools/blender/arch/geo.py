"""LUMIERE v9 architecture builder - geometry core (pure numpy; runs in plain Python 3 or inside Blender).

Rooms are built as closed solids (every wall, rail, parapet and door frame has real thickness and end caps), in the engine's y-up metres,
then written in the light-map pipeline's room format (tools/bake/bake_room.py bakes them in Cycles). Each vertex carries a library
material id (www/js/library.js MAT) and a linear tint; material uvs are world-planar metres (the engine tiles textures per metre).
Local frames: Acc.frame(T) sets a rigid transform (rotation about y + translation), so a hall can be modelled in its own (u, y, d)
coordinates and placed by the spec. Rotations keep handedness, so counter-clockwise winding seen from the front stays outward."""
import json, math, base64, hashlib
import numpy as np

MAT = dict(paint=0, fabric=1, velvet=1, wood=2, terrazzo=3, metal=4, carpet=5, plaster=6, tile=7, leather=8, acoustic=9, glass=10, granite=11, marble=12,
           rubber=13, chrome=14, lacquer=15, hallCarpet=16, slats=17, concrete=18, matte=19, chevron=20, geotile=21, deco=22, fluted=23, brass=24, powder=25,
           asphalt=26, paving=27, brick=28, porcelain=29, walltile=30, calacatta=31, emit=32, nero=33, rosso=34, onyx=35, stone=36, dolby=37, tblack=38,
           plaza=39, perf=40)

def lin(hexs, k=1.0):
    """sRGB hex (#rrggbb) -> linear rgb, times k"""
    h = hexs.lstrip('#')
    if len(h) == 3: h = ''.join(ch * 2 for ch in h)
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(k * (v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4) for v in c)

def mix(a, b, t): return tuple(a[i] * (1 - t) + b[i] * t for i in range(3))

def norm(v):
    n = math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2) or 1.0; return (v[0] / n, v[1] / n, v[2] / n)

def cross(a, b): return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])

def sub(a, b): return (a[0] - b[0], a[1] - b[1], a[2] - b[2])

def add(a, b): return (a[0] + b[0], a[1] + b[1], a[2] + b[2])

def scl(a, k): return (a[0] * k, a[1] * k, a[2] * k)

def ear_clip(pts):
    """triangulate a simple 2D polygon (list of (x, y), any winding) -> list of index triples, counter-clockwise"""
    n = len(pts)
    if n < 3: return []
    area = sum(pts[i][0] * pts[(i + 1) % n][1] - pts[(i + 1) % n][0] * pts[i][1] for i in range(n)) / 2
    idx = list(range(n)) if area > 0 else list(range(n))[::-1]
    out, guard = [], 0
    def inside(p, a, b, c):
        d1 = (p[0] - b[0]) * (a[1] - b[1]) - (a[0] - b[0]) * (p[1] - b[1]); d2 = (p[0] - c[0]) * (b[1] - c[1]) - (b[0] - c[0]) * (p[1] - c[1]); d3 = (p[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (p[1] - a[1])
        return not ((d1 < 0 or d2 < 0 or d3 < 0) and (d1 > 0 or d2 > 0 or d3 > 0))
    while len(idx) > 3 and guard < 10000:
        guard += 1; m = len(idx); found = False
        for i in range(m):
            a, b, c = idx[(i - 1) % m], idx[i], idx[(i + 1) % m]; A, Bp, C = pts[a], pts[b], pts[c]
            if (Bp[0] - A[0]) * (C[1] - A[1]) - (Bp[1] - A[1]) * (C[0] - A[0]) <= 1e-12: continue
            if any(inside(pts[j], A, Bp, C) for j in idx if j not in (a, b, c)): continue
            out.append((a, b, c)); idx.pop(i); found = True; break
        if not found: break
    if len(idx) == 3: out.append(tuple(idx))
    return out

class Acc:
    """triangle soup with flat or given normals, per-vertex tint and material id"""
    def __init__(s):
        s.P, s.N, s.C, s.M = [], [], [], []; s.T = None
    # ---- frames: T maps local (x, y, z) -> world; R rotates normals
    def frame(s, T=None, R=None): s.T, s.R = T, R
    def _tp(s, p): return s.T(p) if s.T else p
    def _tn(s, n): return s.R(n) if s.T else n
    def tri(s, a, b, c, mat, col, na=None, nb=None, nc=None):
        if na is None:
            n = cross(sub(b, a), sub(c, a)); L = math.sqrt(n[0] ** 2 + n[1] ** 2 + n[2] ** 2)
            if L < 1e-12: return
            n = (n[0] / L, n[1] / L, n[2] / L); na = nb = nc = n
        for p, n in ((a, na), (b, nb), (c, nc)): s.P.append(s._tp(p)); s.N.append(s._tn(n)); s.C.append(col); s.M.append(mat)
    def quad(s, a, b, c, d, mat, col):
        s.tri(a, b, c, mat, col); s.tri(a, c, d, mat, col)
    def poly(s, pts, mat, col, normal=None):
        """planar polygon (3D points, counter-clockwise seen from the side it faces)"""
        if len(pts) < 3: return
        n = normal or norm(cross(sub(pts[1], pts[0]), sub(pts[2], pts[0])))
        if normal is None:   # Newell normal for robustness
            nx = ny = nz = 0.0
            for i in range(len(pts)):
                p, q = pts[i], pts[(i + 1) % len(pts)]; nx += (p[1] - q[1]) * (p[2] + q[2]); ny += (p[2] - q[2]) * (p[0] + q[0]); nz += (p[0] - q[0]) * (p[1] + q[1])
            n = norm((nx, ny, nz))
        ax = max(range(3), key=lambda i: abs(n[i])); ui, vi = [(1, 2), (2, 0), (0, 1)][ax]
        p2 = [(p[ui], p[vi]) for p in pts]
        if n[ax] < 0: p2 = [(x, -y) for x, y in p2]
        for a, b, c in ear_clip(p2): s.tri(pts[a], pts[b], pts[c], mat, col)
    def box(s, x0, y0, z0, x1, y1, z1, mat, col, skip='', top=None, topcol=None):
        if x1 - x0 < 1e-5 or y1 - y0 < 1e-5 or z1 - z0 < 1e-5: return
        P = [(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0), (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)]
        F = {'nz': (1, 0, 3, 2), 'pz': (4, 5, 6, 7), 'nx': (0, 4, 7, 3), 'px': (5, 1, 2, 6), 'ny': (0, 1, 5, 4), 'py': (3, 7, 6, 2)}
        for k, (a, b, c, d) in F.items():
            if k in skip: continue
            m, cc = (top if (k == 'py' and top is not None) else mat), (topcol if (k == 'py' and topcol is not None) else col)
            s.quad(P[a], P[b], P[c], P[d], m, cc)
    def prism(s, poly, y0, y1, mat, col, caps=True, capmat=None, capcol=None, bottom=True):
        """vertical extrusion of a 2D polygon [(x, z)] from y0 to y1: walls outward, caps on top (and bottom)"""
        n = len(poly); area = sum(poly[i][0] * poly[(i + 1) % n][1] - poly[(i + 1) % n][0] * poly[i][1] for i in range(n)) / 2
        pts = poly if area < 0 else poly[::-1]   # clockwise in (x, z) seen from +y = counter-clockwise seen from above (z points to the viewer)
        for i in range(n):
            a, b = pts[i], pts[(i + 1) % n]
            s.quad((a[0], y0, a[1]), (b[0], y0, b[1]), (b[0], y1, b[1]), (a[0], y1, a[1]), mat, col)
        if caps:
            cm, cc = capmat if capmat is not None else mat, capcol or col
            s.poly([(x, y1, z) for x, z in pts], cm, cc)
            if bottom: s.poly([(x, y0, z) for x, z in pts[::-1]], cm, cc)
    def prism_x(s, poly, x0, x1, mat, col):
        """extrusion along x of a polygon given in (z, y): closed, faces outward"""
        n = len(poly); area = sum(poly[i][0] * poly[(i + 1) % n][1] - poly[(i + 1) % n][0] * poly[i][1] for i in range(n))
        pts = poly if area > 0 else poly[::-1]   # counter-clockwise in (z, y) = seen from -x looking to +x... sides checked below
        for i in range(n):
            (za, ya), (zb, yb) = pts[i], pts[(i + 1) % n]
            s.quad((x0, ya, za), (x1, ya, za), (x1, yb, zb), (x0, yb, zb), mat, col)
        s.poly([(x1, y, z) for z, y in pts[::-1]], mat, col); s.poly([(x0, y, z) for z, y in pts], mat, col)
    def wall(s, a, b, y0, y1, t, mat, col, openings=(), side=0, capmat=None, capcol=None, inner=None):
        """straight wall from a to b (2D x, z) of thickness t, centred (side 0) or offset to the left (+1) / right (-1) of a->b;
        openings: (s0, s1, top, bottom=y0) along the wall from a; each opening gets real reveals (jambs, head, sill)"""
        dx, dz = b[0] - a[0], b[1] - a[1]; L = math.hypot(dx, dz)
        if L < 1e-4: return
        ux, uz = dx / L, dz / L; nx, nz = -uz, ux   # left normal
        o0 = {0: -t / 2, 1: 0, -1: -t}[side]; o1 = o0 + t
        P = lambda u, o, y: (a[0] + ux * u + nx * o, y, a[1] + uz * u + nz * o)
        segs, cur = [], 0.0
        for op in sorted(openings):
            s0, s1, top = op[0], op[1], op[2]; bot = op[3] if len(op) > 3 else y0
            if s0 > cur: segs.append((cur, s0, y0, y1))
            if bot > y0 + 1e-4: segs.append((s0, s1, y0, bot))
            if top < y1 - 1e-4: segs.append((s0, s1, top, y1))
            cur = s1
        if cur < L: segs.append((cur, L, y0, y1))
        cm, cc = capmat if capmat is not None else mat, capcol or col
        for u0, u1, ya, yb in segs:
            q = [P(u0, o0, ya), P(u1, o0, ya), P(u1, o1, ya), P(u0, o1, ya), P(u0, o0, yb), P(u1, o0, yb), P(u1, o1, yb), P(u0, o1, yb)]
            s.quad(q[1], q[0], q[4], q[5], mat, col)   # right face (o0)
            s.quad(q[3], q[2], q[6], q[7], mat, col)   # left face (o1)
            s.quad(q[0], q[3], q[7], q[4], cm, cc); s.quad(q[2], q[1], q[5], q[6], cm, cc)   # ends
            s.quad(q[4], q[7], q[6], q[5], cm, cc); s.quad(q[0], q[1], q[2], q[3], cm, cc)   # top, bottom
    def cyl(s, cx, cz, r, y0, y1, mat, col, n=16, caps=True, a0=0.0, a1=2 * math.pi, smooth=True):
        full = abs(a1 - a0 - 2 * math.pi) < 1e-6
        for i in range(n):
            t0, t1 = a0 + (a1 - a0) * i / n, a0 + (a1 - a0) * (i + 1) / n
            p0, p1 = (cx + r * math.cos(t0), cz + r * math.sin(t0)), (cx + r * math.cos(t1), cz + r * math.sin(t1))
            n0, n1 = (math.cos(t0), 0, math.sin(t0)), (math.cos(t1), 0, math.sin(t1))
            A, Bp, C, D = (p0[0], y0, p0[1]), (p1[0], y0, p1[1]), (p1[0], y1, p1[1]), (p0[0], y1, p0[1])
            if smooth: s.tri(A, D, C, mat, col, n0, n0, n1); s.tri(A, C, Bp, mat, col, n0, n1, n1)
            else: s.quad(A, D, C, Bp, mat, col)
        if caps and full:
            pts = [(cx + r * math.cos(a0 + 2 * math.pi * i / n), cz + r * math.sin(a0 + 2 * math.pi * i / n)) for i in range(n)]
            s.poly([(x, y1, z) for x, z in pts[::-1]], mat, col); s.poly([(x, y0, z) for x, z in pts], mat, col)
    def tube(s, path, r, mat, col, n=8, caps=True):
        """round bar along a 3D polyline (handrails, posts)"""
        rings = []
        for i, p in enumerate(path):
            t = norm(sub(path[min(i + 1, len(path) - 1)], path[max(i - 1, 0)]))
            up = (0, 1, 0) if abs(t[1]) < 0.9 else (1, 0, 0); a = norm(cross(t, up)); b = cross(a, t)
            rings.append([add(p, add(scl(a, r * math.cos(2 * math.pi * k / n)), scl(b, r * math.sin(2 * math.pi * k / n)))) for k in range(n)])
            rings[-1] = (rings[-1], [norm(add(scl(a, math.cos(2 * math.pi * k / n)), scl(b, math.sin(2 * math.pi * k / n)))) for k in range(n)])
        for i in range(len(rings) - 1):
            (A, NA), (Bq, NB) = rings[i], rings[i + 1]
            for k in range(n):
                k1 = (k + 1) % n
                s.tri(A[k], Bq[k], Bq[k1], mat, col, NA[k], NB[k], NB[k1]); s.tri(A[k], Bq[k1], A[k1], mat, col, NA[k], NB[k1], NA[k1])
        if caps:
            s.poly(rings[0][0][::-1], mat, col); s.poly(rings[-1][0], mat, col)
    def sweep(s, path, profile, mat, col, closed=False, cap=True):
        """sweep a 2D profile [(o, y)] (o = offset to the left of the path, y = height) along a horizontal 2D path [(x, z)]"""
        rings = []
        for i in range(len(path)):
            p0, p1 = path[max(i - 1, 0)], path[min(i + 1, len(path) - 1)]
            tx, tz = p1[0] - p0[0], p1[1] - p0[1]; L = math.hypot(tx, tz) or 1; nx, nz = -tz / L, tx / L
            rings.append([(path[i][0] + nx * o, y, path[i][1] + nz * o) for o, y in profile])
        m = len(profile)
        for i in range(len(rings) - 1):
            A, Bq = rings[i], rings[i + 1]
            for k in range(m - 1 + (1 if closed else 0)):
                k1 = (k + 1) % m; s.quad(A[k], Bq[k], Bq[k1], A[k1], mat, col)
        if cap and closed: s.poly(rings[0][::-1], mat, col); s.poly(rings[-1], mat, col)
    # ---- export
    def arrays(s):
        P = np.asarray(s.P, np.float32).reshape(-1, 3); N = np.asarray(s.N, np.float32).reshape(-1, 3)
        C = np.asarray(s.C, np.float32).reshape(-1, 3); M = np.asarray(s.M, np.float32)
        # world-planar metre uvs by the dominant axis of each triangle's normal
        UV = np.zeros((len(P), 2), np.float32)
        if len(P):
            FN = N.reshape(-1, 3, 3).mean(1); ax = np.abs(FN).argmax(1)
            for t in range(len(FN)):
                i = slice(3 * t, 3 * t + 3); a = ax[t]
                if a == 1: UV[i, 0], UV[i, 1] = P[i, 0], P[i, 2]
                elif a == 0: UV[i, 0], UV[i, 1] = P[i, 2], P[i, 1]
                else: UV[i, 0], UV[i, 1] = P[i, 0], P[i, 1]
        return P, N, C, M, UV

class Glow:
    """emissive strips (LED lines, signs, step nosings): drawn by the engine's glow material at their tint x intensity, not baked"""
    def __init__(s): s.P, s.C = [], []; s.T = None; s.R = None
    def frame(s, T=None, R=None): s.T, s.R = T, R
    def quad(s, a, b, c, d, col, k=1.0):
        cc = (col[0] * k, col[1] * k, col[2] * k)
        for p in (a, b, c, a, c, d): s.P.append(s.T(p) if s.T else p); s.C.append(cc)

STRIDE = 14
class Lights:
    """the engine's light list (www/js/bake.js Lights): x y z  r g b  range ch  dx dy dz  cosIn cosOut type"""
    def __init__(s, rect, ceil):
        s.L, s.shapes = [], []; s.rect, s.ceil = rect, ceil; s.amb = {'h': {'up': [0, 0, 0], 'down': [0, 0, 0]}, 'f': {'up': [0, 0, 0], 'down': [0, 0, 0]}}
        s.T = None; s.R = None
    def frame(s, T=None, R=None): s.T, s.R = T, R
    def _p(s, p): return s.T(p) if s.T else p
    def _d(s, d): return s.R(d) if s.T else d
    def _push(s, p, c, I, r, ch, d=(0, -1, 0), ci=1, co=-1, typ=0):
        p = s._p(p); d = s._d(d); s.L += [p[0], p[1], p[2], c[0] * I, c[1] * I, c[2] * I, r, 1 if ch == 'f' else 0, d[0], d[1], d[2], ci, co, typ]
    def point(s, p, c, I, r=10, ch='h'): s._push(p, c, I, r, ch)
    def spot(s, p, c, I, r=10, ch='h', d=(0, -1, 0), inner=30, outer=60):
        s._push(p, c, I, r, ch, norm(d), math.cos(math.radians(inner)), math.cos(math.radians(outer)), 1)
    def line(s, a, b, c, Ipm, r=6, ch='h', d=None, n=0):
        L = math.dist(a, b); k = n or max(2, math.ceil(L / 1.2)); I = Ipm * L / k
        s.shapes.append({'kind': 'line', 'i0': len(s.L) // STRIDE, 'n': k, 'a': list(s._p(a)), 'b': list(s._p(b)), 'dir': list(s._d(d)) if d else None, 'c': list(c), 'I': Ipm * L, 'ch': 1 if ch == 'f' else 0})
        for i in range(k):
            t = (i + 0.5) / k; p = tuple(a[j] + (b[j] - a[j]) * t for j in range(3))
            if d: s._push(p, c, I, r, ch, norm(d), 1, 0, 2)
            else: s._push(p, c, I, r, ch)
    def area(s, c0, u, v, n, c, I, r=10, ch='f', su=3, sv=2):
        k = I / (su * sv); w = lambda q: s._d(q)
        s.shapes.append({'kind': 'rect', 'i0': len(s.L) // STRIDE, 'n': su * sv, 'c0': list(s._p(c0)), 'u': list(w(u)), 'v': list(w(v)), 'dir': list(w(n)), 'c': list(c), 'I': I, 'ch': 1 if ch == 'f' else 0})
        for i in range(su):
            for j in range(sv):
                a, b = (i + 0.5) / su * 2 - 1, (j + 0.5) / sv * 2 - 1
                s._push(tuple(c0[q] + u[q] * a + v[q] * b for q in range(3)), c, k, r, ch, norm(n), 1, 0, 2)
    def ambient(s, up, down, k=1.0, ch='h'): s.amb['f' if ch == 'f' else 'h'] = {'up': [x * k for x in up], 'down': [x * k for x in down]}

def b64(a): return base64.b64encode(np.ascontiguousarray(a).tobytes()).decode()

def frame_y(ox, oy, oz, yaw):
    """rigid frame: rotate local (x, y, z) by yaw about +y (three.js convention), then translate"""
    c, s_ = math.cos(yaw), math.sin(yaw)
    T = lambda p: (ox + c * p[0] + s_ * p[2], oy + p[1], oz - s_ * p[0] + c * p[2])
    R = lambda n: (c * n[0] + s_ * n[2], n[1], -s_ * n[0] + c * n[2])
    return T, R

def export_room(key, acc, lights, out_json, glow=None, occ=None, screen=None, probes=None, is_hall=False, extra=None, tag='v9'):
    P, N, C, M, UV = acc.arrays(); n = len(P)
    I = np.arange(n, dtype=np.uint32)
    h = hashlib.sha1(P.tobytes()).hexdigest()[:12]
    D = {'key': key, 'isHall': is_hall, 'solid': {'hash': f'{tag}.{h}', 'count': n, 'pos': b64(P), 'nrm': b64(N), 'col': b64(C), 'uv': b64(UV), 'mat': b64(M), 'idx': b64(I)},
         'props': None, 'occ': None, 'screen': None, 'lights': {'L': b64(np.asarray(lights.L, np.float32)), 'shapes': lights.shapes, 'amb': lights.amb, 'rect': lights.rect, 'ceil': lights.ceil},
         'probes': None}
    if occ is not None and len(occ.P):
        OP, _, OC, _, _ = occ.arrays(); D['occ'] = {'pos': b64(OP), 'col': b64(OC), 'idx': b64(np.arange(len(OP), dtype=np.uint32))}
    if screen is not None and len(screen.P):
        SP, _, _, _, _ = screen.arrays(); D['screen'] = {'pos': b64(SP), 'idx': b64(np.arange(len(SP), dtype=np.uint32))}
    if probes: D['probes'] = {'pts': b64(np.asarray(probes, np.float32).ravel()), 'nSeat': len(probes), 'nArm': 0}
    json.dump(D, open(out_json, 'w'))
    x = {'v': 9, 'key': key, 'hash': D['solid']['hash'], 'lights': {'L': list(map(float, lights.L)), 'shapes': lights.shapes, 'amb': lights.amb, 'rect': lights.rect, 'ceil': lights.ceil}}
    if glow is not None and len(glow.P):
        GP = np.asarray(glow.P, np.float32); GC = np.asarray(glow.C, np.float32); x['glow'] = {'pos': b64(GP), 'col': b64(GC)}
    if extra: x.update(extra)
    return D, x, n
