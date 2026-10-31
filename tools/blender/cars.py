"""LUMIERE v8 cars, modelled headless in Blender 5.x (phone feedback: "the car models look shit"; the Story intro needs a taxi).

    blender --background --factory-startup --python tools/blender/cars.py -- --out www/models [--only car_taxi]

One body, two assets: car_sedan (the parked cars; paint car_red, swapped per placement) and car_taxi (the cab that brings you in
Story mode: yellow paint, a lit TAXI roof sign, a chequer band). Front +X, wheels on Z = 0, 4.66 m long, 1.82 m wide, 1.45 m tall.
LOD0 for close views, LOD1 (about a third of the triangles) for the far side of the road.
  * The lower body is lofted: stations along the length (denser at the nose and tail), each a superellipse section (rounder above,
    squarer below) whose top, sill and half-width follow side and plan profiles. The greenhouse is a second loft on the beltline,
    narrower at the roof (tumblehome).
  * Glass is not cut into the greenhouse: each window is its own patch laid 6 mm over the greenhouse surface along its normal, with
    clean outlines (a raked A-pillar edge, B- and C-pillars), so the pillars and roof are the paint left between them.
  * Wheel arches: Exact boolean of a cylinder through the closed body, which also leaves a full-width liner (cutter material).
  * Details: lamp lenses set into the nose and tail, grille, plates, mirrors, door handles, door shut lines, five-spoke rims."""
import bpy, bmesh, math, sys, os, argparse, json
from mathutils import Vector, Matrix
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lbl
from lbl import T, RZ, lathe, box_uv, material, PARTS

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ap = argparse.ArgumentParser(); ap.add_argument('--out', default='www/models'); ap.add_argument('--only', default='')
A = ap.parse_args(argv)

for k, v in {'car_red': ((0.2, 0.012, 0.016), 0.22, 0.0), 'car_yellow': ((0.78, 0.45, 0.02), 0.22, 0.0), 'tyre': ((0.012, 0.012, 0.012), 0.9, 0.0),
             'car_silver': ((0.6, 0.62, 0.65), 0.28, 1.0), 'chrome': ((0.9, 0.9, 0.9), 0.08, 1.0), 'paint_black': ((0.006, 0.006, 0.007), 0.7, 0.0)}.items():
    lbl.MAT_DEF.setdefault(k, v)
lbl.GLOW_DEF.update({'glow_head': ((1.0, 0.92, 0.78), 3.0), 'glow_tail': ((1.0, 0.05, 0.03), 2.4), 'glow_taxi': ((1.0, 0.8, 0.32), 2.6)})


def curve(xs, ys):
    """smooth (cubic Hermite, Catmull-Rom tangents) through keyframes; flat outside them"""
    X, Y = list(xs), list(ys)
    def f(x):
        if x <= X[0]: return Y[0]
        if x >= X[-1]: return Y[-1]
        i = max(k for k in range(len(X) - 1) if X[k] <= x); x0, x1, y0, y1 = X[i], X[i + 1], Y[i], Y[i + 1]; t = (x - x0) / (x1 - x0)
        m0 = (Y[i + 1] - Y[i - 1]) / (X[i + 1] - X[i - 1]) * (x1 - x0) if i > 0 else y1 - y0
        m1 = (Y[i + 2] - Y[i]) / (X[i + 2] - X[i]) * (x1 - x0) if i + 2 < len(X) else y1 - y0
        return (2 * t ** 3 - 3 * t * t + 1) * y0 + (t ** 3 - 2 * t * t + t) * m0 + (-2 * t ** 3 + 3 * t * t) * y1 + (t ** 3 - t * t) * m1
    return f


# ---------------------------------------------------------------- profiles (metres)
L2 = 2.33
BX = [-2.33, -2.29, -2.20, -2.00, -1.60, -1.10, 0.0, 0.95, 1.45, 1.85, 2.12, 2.27, 2.33]
b_top = curve(BX, [0.66, 0.80, 0.90, 0.95, 0.965, 0.962, 0.95, 0.925, 0.875, 0.815, 0.755, 0.69, 0.60])
b_bot = curve(BX, [0.40, 0.30, 0.25, 0.22, 0.21, 0.21, 0.21, 0.21, 0.21, 0.22, 0.24, 0.29, 0.38])
b_hw = curve(BX, [0.62, 0.78, 0.85, 0.885, 0.90, 0.905, 0.91, 0.905, 0.90, 0.885, 0.85, 0.77, 0.62])
GX = [-1.43, -1.30, -1.10, -0.85, -0.55, -0.20, 0.10, 0.35, 0.62, 0.85, 1.06]
g_top = curve(GX, [0.93, 1.12, 1.31, 1.415, 1.44, 1.445, 1.435, 1.385, 1.22, 1.06, 0.895])
WB, WT, NT, NB = 0.86, 0.64, 3.0, 4.5   # greenhouse half-width at the beltline and at the roof; section exponents above / below the middle
WHEELS = [(1.40, 0.34), (-1.36, 0.34)]  # x, radius
TRACK = 0.772


def se(t, n_top, n_bot):
    c, s = math.cos(t), math.sin(t); n = n_top if s >= 0 else n_bot
    return math.copysign(abs(c) ** (2 / n), c), math.copysign(abs(s) ** (2 / n), s)


def body_y(x, z):
    """half-width of the lower body at (x, z) (0 outside it)"""
    top, bot, hw = b_top(x), b_bot(x), b_hw(x); zc, hh = (top + bot) / 2, (top - bot) / 2; S = (z - zc) / hh
    if abs(S) >= 1: return 0.0
    n = 2.8 if S >= 0 else 5.0; return hw * (1 - abs(S) ** n) ** (1 / n)


def gh(x):
    bot = b_top(x) - 0.05; return bot, max(g_top(x), bot + 0.004)


def gh_w(x, z):
    bot, top = gh(x); return WB + (WT - WB) * min(1, max(0, (z - bot) / (top - bot)))


def gh_y(x, z):
    bot, top = gh(x); zc, hh = (top + bot) / 2, (top - bot) / 2; S = max(-1.0, min(1.0, (z - zc) / hh)); n = NT if S >= 0 else NB
    return gh_w(x, z) * (1 - abs(S) ** n) ** (1 / n)


def gh_z(x, y):
    """height of the greenhouse's upper surface over (x, y)"""
    bot, top = gh(x); zc, hh = (top + bot) / 2, (top - bot) / 2; w = WT
    for _ in range(6):
        b = min(0.999, abs(y) / w); S = (1 - b ** NT) ** (1 / NT); z = zc + S * hh; w = gh_w(x, z)
    return z


# ---------------------------------------------------------------- mesh helpers
def obj(name, lod, mats, build, mtx=Matrix.Identity(4), recalc=True, sharp=35, smooth=True):
    """one object: build(bm) adds faces (f.material_index picks from mats)"""
    bm = bmesh.new(); build(bm); bm.transform(mtx)
    if recalc: bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    box_uv(bm); me = bpy.data.meshes.new(f'{name}_LOD{lod}'); bm.to_mesh(me); bm.free()
    if smooth: me.shade_smooth(); me.set_sharp_from_angle(angle=math.radians(sharp))
    else: me.shade_flat()
    for m in mats: me.materials.append(material(m))
    ob = bpy.data.objects.new(f'{name}_LOD{lod}', me); bpy.context.scene.collection.objects.link(ob); PARTS.append(ob); return ob


def loft(bm, rings, cap0=None, cap1=None):
    """quads between consecutive rings (same vertex count); optional end-cap centres (fans)"""
    vs = [[bm.verts.new(p) for p in r] for r in rings]; K = len(rings[0]); fs = []
    for a, b in zip(vs, vs[1:]):
        for k in range(K): fs.append(bm.faces.new((a[k], a[(k + 1) % K], b[(k + 1) % K], b[k])))
    for cap, ring, rev in ((cap0, vs[0], True), (cap1, vs[-1], False)):
        if cap is None: continue
        c = bm.verts.new(cap)
        for k in range(K): fs.append(bm.faces.new((ring[(k + 1) % K], ring[k], c) if rev else (ring[k], ring[(k + 1) % K], c)))
    return fs


def patch(bm, P, nu, nv):
    """a grid patch: P(u, v) -> point; returns its faces"""
    g = [[bm.verts.new(P(i / nu, j / nv)) for i in range(nu + 1)] for j in range(nv + 1)]
    return [bm.faces.new((g[j][i], g[j][i + 1], g[j + 1][i + 1], g[j + 1][i])) for j in range(nv) for i in range(nu)]


def rb(size, r, at, rot=Matrix.Identity(4)):
    def build(bm): lbl.rounded_box(bm, size, r, (1, 1, 1), 1); bm.transform(T(*at) @ rot)
    return build


def gh_normal_side(x, y, z):
    """outward normal of the greenhouse side at (x, y, z): gradient of the section in (y, z), plus the slope along x"""
    e = 0.004; dy = (gh_y(x, z + e) - gh_y(x, z - e)) / (2 * e); dx = (gh_y(x + e, z) - gh_y(x - e, z)) / (2 * e)
    n = Vector((-dx, 1.0, -dy)); n.normalize(); return Vector((n.x, math.copysign(n.y, y), n.z))


def gh_normal_top(x, y):
    e = 0.004; dzx = (gh_z(x + e, y) - gh_z(x - e, y)) / (2 * e); dzy = (gh_z(x, y + e) - gh_z(x, y - e)) / (2 * e)
    n = Vector((-dzx, -dzy, 1.0)); n.normalize(); return n


def body_normal(x, y, z):
    e = 0.004; dz = (body_y(x, z + e) - body_y(x, z - e)) / (2 * e); dx = (body_y(x + e, z) - body_y(x - e, z)) / (2 * e)
    n = Vector((-dx, 1.0, -dz)); n.normalize(); return Vector((n.x, math.copysign(n.y, y), n.z))


def on_body(x, z, s, lift):
    y = body_y(x, z); n = body_normal(x, s * y, z); return Vector((x, s * y, z)) + n * lift


def nose_x(y, z, front=True):
    """the body surface along x at (y, z): the first station (from the end) wide enough to reach |y| at height z"""
    x = L2 if front else -L2; step = -0.002 if front else 0.002
    while abs(x) > 1.2 and body_y(x, z) < abs(y): x += step
    return x


# ---------------------------------------------------------------- the car
def build_car(name, lod, taxi):
    del PARTS[:]
    paint = 'car_yellow' if taxi else 'car_red'; NS, K = (44, 40) if lod == 0 else (22, 20); NG = 30 if lod == 0 else 14
    # lower body: stations denser at the ends (sine spacing), superellipse rings, cones capping the nose and tail
    xs = [L2 * math.sin(math.pi / 2 * (-1 + 2 * i / NS)) for i in range(NS + 1)]
    def ring(x):
        top, bot, hw = b_top(x), b_bot(x), b_hw(x); zc, hh = (top + bot) / 2, (top - bot) / 2
        return [(x, hw * c, zc + hh * s) for c, s in (se(2 * math.pi * k / K, 2.8, 5.0) for k in range(K))]
    def body(bm):
        rings = [ring(x) for x in xs]; fs = loft(bm, rings, cap0=(-L2 - 0.012, 0, (b_top(-L2) + b_bot(-L2)) / 2), cap1=(L2 + 0.012, 0, (b_top(L2) + b_bot(L2)) / 2))
        for f in fs:
            c = f.calc_center_median()
            f.material_index = 1 if (c.z < 0.27 or (abs(c.x) > 1.98 and c.z < 0.43 + (0.04 if c.x < 0 else 0))) else 0
    ob = obj('Body', lod, [paint, 'plastic_black'], body, sharp=40)
    # wheel arches: Exact boolean (cutter material on the new faces: the liner)
    for wx, wr in WHEELS:
        cut = obj('Cut', lod, ['plastic_black'], lambda bm: lathe(bm, [(1e-4, -1.3), (wr + 0.065, -1.3), (wr + 0.065, 1.3), (1e-4, 1.3)], 48 if lod == 0 else 24),
                  T(wx, 0, wr) @ Matrix.Rotation(math.radians(90), 4, 'X'), smooth=False)
        PARTS.remove(cut); m = ob.modifiers.new('arch', 'BOOLEAN'); m.operation = 'DIFFERENCE'; m.solver = 'EXACT'; m.object = cut
        try: m.material_mode = 'TRANSFER'
        except Exception: pass
        bpy.context.view_layer.objects.active = ob; ob.select_set(True); bpy.ops.object.modifier_apply(modifier=m.name); bpy.data.objects.remove(cut)
    ob.data.shade_smooth(); ob.data.set_sharp_from_angle(angle=math.radians(40))
    # greenhouse: superellipse rings with tumblehome; its ends sink into the body
    gxs = [GX[0] + (GX[-1] - GX[0]) * i / NG for i in range(NG + 1)]
    def gring(x):
        bot, top = gh(x); zc, hh = (top + bot) / 2, (top - bot) / 2; out = []
        for k in range(K):
            c, s = se(2 * math.pi * k / K, NT, NB); z = zc + hh * s; out.append((x, gh_w(x, z) * c, z))
        return out
    obj('Cabin', lod, [paint], lambda bm: loft(bm, [gring(x) for x in gxs]), recalc=False, sharp=50)
    # glass: side windows (front and rear door), windscreen, rear screen; each 6 mm over the greenhouse
    zb, zt = 1.0, 1.335; nu, nv = (16, 6) if lod == 0 else (6, 2)
    def side(bm, s, xf_b, xf_t, xr_b, xr_t):
        def P(u, v):
            z = zb + (zt - zb) * v; xf = xf_b + (xf_t - xf_b) * v; xr = xr_b + (xr_t - xr_b) * v; x = xr + (xf - xr) * u; y = gh_y(x, z)
            return Vector((x, s * y, z)) + gh_normal_side(x, s * y, z) * 0.006
        fs = patch(bm, P, nu, nv)   # u runs along +x and v up: the faces point to -y, so the left side (+y) flips
        if s > 0:
            for f in fs: f.normal_flip()
    def glass(bm):
        for s in (1, -1):
            side(bm, s, 0.80, 0.33, -0.15, -0.15); side(bm, s, -0.27, -0.27, -1.08, -0.87)
        def screen(x0, x1, w0, w1):
            def P(u, v):
                x = x0 + (x1 - x0) * v; w = w0 + (w1 - w0) * v; y = -w + 2 * w * u; z = gh_z(x, y)
                return Vector((x, y, z)) + gh_normal_top(x, y) * 0.006
            return patch(bm, P, nu, nv)
        screen(0.975, 0.375, 0.70, 0.565); screen(-0.925, -1.375, 0.565, 0.67)   # u along +y, v toward -x: the faces point up
    obj('Glass', lod, ['glass'], glass, recalc=False, sharp=60)
    # lamps set into the nose and tail, a grille, plates
    for s in (1, -1):
        y = s * 0.60; x = nose_x(y, 0.73); obj('Head', lod, ['glow_head'], rb((0.07, 0.30, 0.085), 0.025, (x - 0.018, y, 0.73), RZ(s * 14)))
        y = s * 0.64; x = nose_x(y, 0.81, False); obj('Tail', lod, ['glow_tail'], rb((0.06, 0.34, 0.07), 0.022, (x + 0.016, y, 0.81), RZ(-s * 12)))
    obj('Grille', lod, ['plastic_black'], rb((0.05, 0.66, 0.13), 0.03, (nose_x(0.0, 0.585) - 0.012, 0, 0.585)))
    obj('Plate', lod, ['paint_cream'], rb((0.016, 0.42, 0.10), 0.004, (nose_x(0.0, 0.43) + 0.006, 0, 0.43)))
    obj('PlateR', lod, ['paint_cream'], rb((0.016, 0.42, 0.10), 0.004, (nose_x(0.0, 0.62, False) - 0.006, 0, 0.62)))
    # mirrors on stalks, door handles, door shut lines (close views only)
    for s in (1, -1):
        yb = body_y(0.88, 0.89)
        obj('MirrorStalk', lod, ['plastic_black'], rb((0.06, 0.08, 0.03), 0.01, (0.88, s * (yb + 0.03), 0.985)))
        obj('Mirror', lod, [paint], rb((0.11, 0.18, 0.10), 0.035, (0.86, s * (yb + 0.12), 1.0)))
        if lod == 0:
            for hx in (0.30, -0.66):
                p = on_body(hx, 0.865, s, 0.006); obj('Handle', lod, ['chrome'], rb((0.13, 0.016, 0.026), 0.007, tuple(p)))
            def shut(bm, s=s):
                for lx, z0 in ((0.96, 0.30), (-0.205, 0.30), (-1.30, 0.78)):   # the rear door's edge starts above the arch
                    def P(u, v, lx=lx, z0=z0): z1 = b_top(lx) - 0.015; z = z0 + (z1 - z0) * v; x = lx - 0.0025 + 0.005 * u; return on_body(x, z, s, 0.0028)
                    fs = patch(bm, P, 1, 8)
                    if s > 0:
                        for f in fs: f.normal_flip()
            obj('Shut', lod, ['plastic_black'], shut, recalc=False, smooth=False)
    # wheels: tyre (rounded shoulders), five-spoke rim with a dark barrel behind the spokes, chrome hub
    seg = 32 if lod == 0 else 14
    for wx, wr in WHEELS:
        for s in (1, -1):
            M = T(wx, s * TRACK, wr) @ Matrix.Rotation(math.radians(-90 * s), 4, 'X')   # lathe +Z -> outward (+y on the left, -y on the right)
            obj('Tyre', lod, ['tyre'], lambda bm: lathe(bm, [(0.215, -0.11), (0.305, -0.113), (0.333, -0.096), (wr, -0.05), (wr, 0.05), (0.333, 0.096), (0.305, 0.113), (0.215, 0.11)], seg), M)
            obj('Barrel', lod, ['plastic_black'], lambda bm: lathe(bm, [(1e-4, 0.03), (0.212, 0.03), (0.212, 0.07), (1e-4, 0.07)], seg), M)
            obj('Lip', lod, ['car_silver'], lambda bm: lathe(bm, [(0.19, 0.088), (0.218, 0.088), (0.222, 0.1), (0.2, 0.106), (0.19, 0.1)], seg), M)
            if lod == 0:
                for k in range(5):
                    a = 2 * math.pi * k / 5
                    obj('Spoke', lod, ['car_silver'], rb((0.15, 0.034, 0.016), 0.006, (0.0, 0.0, 0.0)), M @ RZ(math.degrees(a)) @ T(0.118, 0, 0.096))
            else:
                obj('Spoke', lod, ['car_silver'], lambda bm: lathe(bm, [(1e-4, 0.09), (0.19, 0.09), (0.19, 0.1), (1e-4, 0.1)], 10), M)
            obj('Hub', lod, ['chrome'], lambda bm: lathe(bm, [(1e-4, 0.092), (0.05, 0.092), (0.045, 0.108), (1e-4, 0.112)], 16), M)
    if taxi:
        # roof sign: black base, a lit box, TAXI in dark strokes on its front and back
        rz = gh_z(-0.32, 0.0)
        obj('SignBase', lod, ['plastic_black'], rb((0.20, 0.52, 0.03), 0.01, (-0.32, 0, rz + 0.012)))
        obj('Sign', lod, ['glow_taxi'], rb((0.15, 0.48, 0.11), 0.03, (-0.32, 0, rz + 0.08)))
        if lod == 0:
            def letters(bm):
                h, w, st = 0.058, 0.042, 0.0095
                nb = [0]
                def bar(x, y0, z0, y1, z1):   # crossing strokes get different depths, so their faces never share a plane
                    L = math.hypot(y1 - y0, z1 - z0); a = math.atan2(z1 - z0, y1 - y0); b = bmesh.new(); nb[0] += 1
                    lbl.rounded_box(b, (0.004 + 0.0024 * (nb[0] % 3), L + st * 0.6, st), 0.0015, (1, 1, 1), 1)   # ends stop inside the crossing stroke
                    b.transform(T(x, (y0 + y1) / 2, (z0 + z1) / 2) @ Matrix.Rotation(a, 4, 'X'))
                    me = bpy.data.meshes.new('tmp'); b.to_mesh(me); b.free(); bm.from_mesh(me); bpy.data.meshes.remove(me)
                for fx in (-0.32 + 0.0775, -0.32 - 0.0775):
                    d = 1 if fx > -0.32 else -1; z0, z1 = rz + 0.08 - h / 2, rz + 0.08 + h / 2
                    ys = [-0.105, -0.035, 0.035, 0.1]; ys = ys if d > 0 else [-v for v in ys]   # read left to right from either end
                    yT, yA, yX, yI = ys
                    bar(fx, yT - w / 2, z1, yT + w / 2, z1); bar(fx, yT, z0, yT, z1)
                    bar(fx, yA - w / 2, z0, yA, z1); bar(fx, yA, z1, yA + w / 2, z0); bar(fx, yA - w / 4, (z0 + z1) / 2, yA + w / 4, (z0 + z1) / 2)
                    bar(fx, yX - w / 2, z0, yX + w / 2, z1); bar(fx, yX - w / 2, z1, yX + w / 2, z0)
                    bar(fx, yI, z0, yI, z1)
            obj('SignText', lod, ['plastic_black'], letters, smooth=False)
            # chequer band along both sides under the beltline
            def checks(bm, colour):
                sq = 0.046; x0 = -1.05; n = int(2.0 / sq)
                for s in (1, -1):
                    for row in range(2):
                        z0 = 0.755 + row * sq
                        for i in range(n):
                            if (i + row) % 2 != colour: continue
                            def P(u, v, i=i, z0=z0): x = x0 + (i + u) * sq; z = z0 + v * sq; return on_body(x, z, s, 0.0045)
                            fs = patch(bm, P, 2, 1)
                            if s > 0:
                                for f in fs: f.normal_flip()
            obj('CheckB', lod, ['paint_black'], lambda bm: checks(bm, 0), recalc=False, smooth=False)
            obj('CheckW', lod, ['paint_cream'], lambda bm: checks(bm, 1), recalc=False, smooth=False)


def reset():
    for o in list(bpy.data.objects): bpy.data.objects.remove(o)
    for m in list(bpy.data.meshes): bpy.data.meshes.remove(m)


os.makedirs(A.out, exist_ok=True); report = []
for name, taxi in (('car_sedan', False), ('car_taxi', True)):
    if A.only and name not in A.only.split(','): continue
    reset(); allp = []
    for lod in (0, 1): build_car(name, lod, taxi); allp += PARTS
    PARTS[:] = allp; report.append(lbl.export(name, A.out))
print(json.dumps(report, indent=1))
