"""LUMIERE v10 decorations (the user: "the lobby is too big and empty: fill it with lighting, paintings, pillars, sofas, a fountain"; the
concessions and the cafe "much more defined"). After docs/V10-RESEARCH.md: the lounges under pendant clouds (PVR INOX Whitefield),
round brass-hoop planters and tiered brass (INOX Prism), lit display counters (INOX JTM), a fountain on the entrance axis.

    blender --background --factory-startup --python tools/blender/decor10.py -- --out www/models [--only fountain_tier,...] [--review DIR]

Frame: +X front (the Kiln convention: engine +Z), +Z up, origin on the floor (the pendant cloud: origin at the ceiling, hanging down).
Every part is a closed solid (lathes and boxes), so recalc_face_normals points it outward."""
import bpy, bmesh, math, os, sys, argparse, random
from mathutils import Vector, Matrix
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lbl
from lbl import T, RZ, lathe, disc, tube, part, PARTS

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ap = argparse.ArgumentParser(); ap.add_argument('--out', default='www/models'); ap.add_argument('--only', default=''); ap.add_argument('--review', default='')
A = ap.parse_args(argv)
for k, v in {'stone_light': ((0.62, 0.58, 0.52), 0.4, 0.0), 'marble_nero': ((0.02, 0.02, 0.022), 0.15, 0.0), 'marble_calacatta': ((0.8, 0.78, 0.74), 0.2, 0.0),
             'lacquer_cream': ((0.72, 0.66, 0.55), 0.2, 0.0), 'lacquer_red': ((0.35, 0.02, 0.025), 0.2, 0.0), 'fluted_walnut': ((0.15, 0.07, 0.035), 0.5, 0.0),
             'steel': ((0.55, 0.56, 0.58), 0.3, 1.0), 'candy_pink': ((0.75, 0.3, 0.45), 0.5, 0.0), 'popcorn': ((0.85, 0.72, 0.4), 0.8, 0.0),
             'carpet_deco': ((0.25, 0.2, 0.18), 0.9, 0.0), 'velvet_navy': ((0.02, 0.03, 0.1), 0.9, 0.0)}.items():
    lbl.MAT_DEF.setdefault(k, v)


def box(bm, x0, y0, z0, x1, y1, z1):
    """axis box (a closed solid)"""
    r = bmesh.ops.create_cube(bm, size=1.0); vs = r['verts']
    for v in vs: v.co = Vector((x0 + (v.co.x + 0.5) * (x1 - x0), y0 + (v.co.y + 0.5) * (y1 - y0), z0 + (v.co.z + 0.5) * (z1 - z0)))


def sphere(bm, r, n=10):
    lathe(bm, [(1e-4, -r)] + [(r * math.sin(math.pi * i / n), -r * math.cos(math.pi * i / n)) for i in range(1, n)] + [(1e-4, r)], 2 * n)


def ctube(bm, pts, radius, sides=8):
    """a round tube along an open polyline, capped at both ends (a closed solid: lbl.tube leaves its ends open)"""
    n = len(pts); rings = []
    for i, p in enumerate(pts):
        a = pts[max(0, i - 1)]; b = pts[min(n - 1, i + 1)]
        t = (Vector(b) - Vector(a)).normalized(); up = Vector((0, 0, 1)) if abs(t.z) < 0.9 else Vector((1, 0, 0))
        x = t.cross(up).normalized(); y = t.cross(x).normalized()
        rings.append([bm.verts.new(Vector(p) + (x * math.cos(2 * math.pi * k / sides) + y * math.sin(2 * math.pi * k / sides)) * radius) for k in range(sides)])
    for i in range(n - 1):
        a, b = rings[i], rings[i + 1]
        for k in range(sides): k2 = (k + 1) % sides; bm.faces.new((a[k], a[k2], b[k2], b[k]))
    bm.faces.new(list(reversed(rings[0]))); bm.faces.new(rings[-1])


def ring(r0, r1, z0, z1):
    return [(r0, z0), (r1, z0), (r1, z1), (r0, z1)]


# ---------------------------------------------------------------- the models
def fountain_tier(lod=0):
    seg = 64 if lod == 0 else 28
    part('Basin', lod, 'stone_light', lambda bm: lathe(bm, [(1e-4, 0.0), (1.55, 0.0), (1.62, 0.40), (1.62, 0.46), (1.40, 0.46), (1.40, 0.15), (1e-4, 0.15)], seg))
    part('Water', lod, 'glass', lambda bm: lathe(bm, ring(1e-4, 1.392, 0.30, 0.355), seg))
    part('RimLight', lod, 'glow_warm', lambda bm: lathe(bm, ring(1.622, 1.632, 0.405, 0.43), seg), smooth=False)
    part('Stem', lod, 'marble_nero', lambda bm: lathe(bm, [(1e-4, 0.30), (0.34, 0.30), (0.27, 0.46), (0.17, 0.86), (0.13, 1.22), (1e-4, 1.22)], seg // 2))
    part('Bowl', lod, 'brass', lambda bm: lathe(bm, [(1e-4, 1.18), (0.14, 1.18), (0.78, 1.33), (0.82, 1.39), (0.76, 1.39), (0.14, 1.25), (1e-4, 1.25)], seg))
    part('Stem2', lod, 'marble_nero', lambda bm: lathe(bm, [(1e-4, 1.24), (0.09, 1.24), (0.065, 1.74), (1e-4, 1.74)], seg // 2))
    part('Bowl2', lod, 'brass', lambda bm: lathe(bm, [(1e-4, 1.71), (0.08, 1.71), (0.39, 1.81), (0.42, 1.86), (0.38, 1.86), (0.08, 1.77), (1e-4, 1.77)], seg))
    part('Finial', lod, 'brass', lambda bm: lathe(bm, [(1e-4, 1.85), (0.05, 1.86), (0.07, 1.93), (0.03, 2.02), (1e-4, 2.05)], seg // 2))
    # the water falling from each bowl's lip: thin lit streams (the fountain is lit from below, as at night); a solid lit curtain read
    # as a white drum in the review renders
    for k in range(28 if lod == 0 else 14):
        a = 2 * math.pi * (k + 0.5) / (28 if lod == 0 else 14); r1, r2 = 0.83, 0.88
        part('Fall', lod, 'glow_ice', lambda bm, a=a: ctube(bm, [(0.81 * math.cos(a), 0.81 * math.sin(a), 1.37), (r1 * math.cos(a), r1 * math.sin(a), 1.0), (r2 * math.cos(a), r2 * math.sin(a), 0.36)], 0.006, 4), smooth=False)
    for k in range(16 if lod == 0 else 8):
        a = 2 * math.pi * (k + 0.25) / (16 if lod == 0 else 8)
        part('Fall2', lod, 'glow_ice', lambda bm, a=a: ctube(bm, [(0.41 * math.cos(a), 0.41 * math.sin(a), 1.84), (0.44 * math.cos(a), 0.44 * math.sin(a), 1.6), (0.47 * math.cos(a), 0.47 * math.sin(a), 1.385)], 0.005, 4), smooth=False)
    part('Glint', lod, 'glow_ice', lambda bm: lathe(bm, ring(0.875, 0.892, 0.356, 0.359), seg), smooth=False)   # where the streams land


def pillar_light(lod=0):
    seg = 32 if lod == 0 else 16
    part('Plinth', lod, 'marble_nero', lambda bm: box(bm, -0.42, -0.42, 0.0, 0.42, 0.42, 0.12))
    part('Shaft', lod, 'marble_nero', lambda bm: lathe(bm, ring(1e-4, 0.3, 0.12, 3.9), seg))
    for z0 in (0.12, 1.10, 3.86):
        part('Ring', lod, 'brass', lambda bm, z0=z0: lathe(bm, ring(1e-4, 0.318, z0, z0 + 0.04), seg))
    part('Crown', lod, 'glow_warm', lambda bm: lathe(bm, ring(1e-4, 0.305, 3.9, 4.1), seg), smooth=False)
    part('Cap', lod, 'brass', lambda bm: lathe(bm, [(1e-4, 4.1), (0.36, 4.1), (0.36, 4.16), (1e-4, 4.17)], seg))


def pendant_cloud(lod=0):
    """a cloud of 21 warm globes on brass rods under a round ceiling plate; origin at the ceiling, hanging 0.8 to 3.0 m down"""
    rnd = random.Random(7); pts = []
    while len(pts) < 21:
        a, r = rnd.uniform(0, 2 * math.pi), 1.65 * math.sqrt(rnd.random())
        x, y = r * math.cos(a), r * math.sin(a)
        if all(math.hypot(x - p[0], y - p[1]) > 0.42 for p in pts): pts.append((x, y, -rnd.uniform(0.8, 3.0), rnd.uniform(0.1, 0.16)))
    part('Plate', lod, 'brass', lambda bm: lathe(bm, ring(1e-4, 1.85, -0.04, 0.0), 48))
    for x, y, z, r in pts:
        part('Rod', lod, 'brass', lambda bm, x=x, y=y, z=z, r=r: (lathe(bm, ring(1e-4, 0.006, z + r, -0.04), 6), bm.transform(T(x, y, 0))))
        part('Globe', lod, 'glow_warm', lambda bm, x=x, y=y, z=z, r=r: (sphere(bm, r, 8 if lod == 0 else 5), bm.transform(T(x, y, z))), smooth=True)
        part('Cap', lod, 'brass', lambda bm, x=x, y=y, z=z, r=r: (lathe(bm, [(1e-4, z + r - 0.01), (0.035, z + r - 0.01), (0.02, z + r + 0.04), (1e-4, z + r + 0.04)], 10), bm.transform(T(x, y, 0))))


def espresso_machine(lod=0):
    """a two-group espresso machine on the cafe counter: chrome body, red front, group heads with black handles, steam wands, cups"""
    part('Body', lod, 'chrome', lambda bm: lbl.rounded_box(bm, (0.5, 0.74, 0.40), 0.03, (2, 3, 2), 2), T(0, 0, 0.24))
    part('Front', lod, 'lacquer_red', lambda bm: box(bm, 0.25, -0.33, 0.12, 0.262, 0.33, 0.40))
    part('Tray', lod, 'steel', lambda bm: box(bm, 0.08, -0.33, 0.0, 0.34, 0.33, 0.035))
    for y in (-0.16, 0.16):
        part('Group', lod, 'chrome', lambda bm, y=y: (lathe(bm, [(1e-4, 0.0), (0.045, 0.0), (0.05, 0.08), (1e-4, 0.09)], 16), bm.transform(T(0.3, y, 0.2))))
        part('Handle', lod, 'paint_black', lambda bm, y=y: box(bm, 0.33, y - 0.014, 0.205, 0.48, y + 0.014, 0.235))
        part('Cup', lod, 'ceramic', lambda bm, y=y: (lathe(bm, [(1e-4, 0.0), (0.035, 0.0), (0.042, 0.065), (1e-4, 0.065)], 14), bm.transform(T(0.3, y, 0.04))))
    for y in (-0.31, 0.31):
        part('Wand', lod, 'chrome', lambda bm, y=y: ctube(bm, [(0.26, y, 0.33), (0.36, y, 0.26), (0.38, y, 0.1)], 0.007, 6))
    for i in range(6):
        part('Cup', lod, 'ceramic', lambda bm, i=i: (lathe(bm, [(1e-4, 0.0), (0.035, 0.0), (0.045, 0.07), (1e-4, 0.07)], 14), bm.transform(T(-0.08 + (i % 2) * 0.11, -0.22 + (i // 2) * 0.22, 0.44))))
    part('Rail', lod, 'chrome', lambda bm: box(bm, -0.24, -0.36, 0.435, 0.24, 0.36, 0.44))


def cake_case(lod=0):
    """a lit pastry case: walnut base, brass frame, two shelves of cakes, a light strip under its lid"""
    part('Base', lod, 'walnut', lambda bm: box(bm, -0.3, -0.58, 0.0, 0.3, 0.58, 0.12))
    for x in (-0.28, 0.28):
        for y in (-0.56, 0.56):
            part('Post', lod, 'brass', lambda bm, x=x, y=y: box(bm, x - 0.012, y - 0.012, 0.12, x + 0.012, y + 0.012, 0.62))
    part('Lid', lod, 'brass', lambda bm: box(bm, -0.3, -0.58, 0.62, 0.3, 0.58, 0.65))
    part('Light', lod, 'glow_warm', lambda bm: box(bm, -0.2, -0.5, 0.605, 0.2, 0.5, 0.618), smooth=False)
    part('Shelf', lod, 'lacquer_cream', lambda bm: box(bm, -0.26, -0.54, 0.36, 0.26, 0.54, 0.375))
    for row, z in ((0, 0.12), (1, 0.375)):
        for i, (y, mat, rr, hh) in enumerate([(-0.38, 'candy_pink', 0.09, 0.09), (-0.12, 'walnut_dark', 0.1, 0.1), (0.14, 'lacquer_cream', 0.085, 0.08), (0.38, 'candy_pink' if row else 'walnut_dark', 0.09, 0.07)]):
            part('Cake', lod, mat, lambda bm, y=y, z=z, rr=rr, hh=hh: (lathe(bm, ring(1e-4, rr, 0.0, hh), 16), bm.transform(T(0.02, y, z + 0.001))))


def cafe_counter(lod=0):
    """3.4 m cafe counter: fluted walnut front, calacatta top with a 4 cm edge, a recessed black kick, a brass foot rail"""
    part('Front', lod, 'fluted_walnut', lambda bm: box(bm, -0.36, -1.7, 0.1, 0.34, 1.7, 1.0))
    part('Kick', lod, 'paint_black', lambda bm: box(bm, -0.3, -1.65, 0.0, 0.28, 1.65, 0.1))
    part('Top', lod, 'marble_calacatta', lambda bm: box(bm, -0.4, -1.74, 1.0, 0.42, 1.74, 1.04))
    part('Rail', lod, 'brass', lambda bm: ctube(bm, [(0.47, -1.6, 0.2), (0.47, 1.6, 0.2)], 0.022, 10))
    for y in (-1.2, 0.0, 1.2):
        part('RailPost', lod, 'brass', lambda bm, y=y: box(bm, 0.34, y - 0.012, 0.19, 0.48, y + 0.012, 0.215))


def rug_round(lod=0):
    part('Field', lod, 'carpet_deco', lambda bm: lathe(bm, ring(1e-4, 1.92, 0.0, 0.012), 64))
    part('Border', lod, 'velvet_navy', lambda bm: lathe(bm, ring(1.9, 2.1, 0.0, 0.014), 64))


def rug_runner(lod=0):
    part('Field', lod, 'carpet_deco', lambda bm: box(bm, -1.9, -1.15, 0.0, 1.9, 1.15, 0.012))
    for (x0, y0, x1, y1) in ((-2.0, -1.25, 2.0, -1.13), (-2.0, 1.13, 2.0, 1.25), (-2.0, -1.13, -1.88, 1.13), (1.88, -1.13, 2.0, 1.13)):
        part('Border', lod, 'velvet_navy', lambda bm, a=(x0, y0, x1, y1): box(bm, a[0], a[1], 0.0, a[2], a[3], 0.014))


def standee_base(lod=0):
    """the foot of a film standee (the picture board is an engine panel standing on it)"""
    part('Foot', lod, 'paint_black', lambda bm: lbl.rounded_box(bm, (0.36, 1.32, 0.08), 0.02, (2, 3, 1), 2), T(0, 0, 0.04))
    part('Edge', lod, 'brass', lambda bm: box(bm, 0.18, -0.66, 0.012, 0.19, 0.66, 0.07))


def popcorn_cart(lod=0):
    """a vintage popcorn cart for the lobby: red body with brass trim, a lit popcorn box on top, two spoked wheels, a canopy"""
    part('Body', lod, 'lacquer_red', lambda bm: box(bm, -0.32, -0.5, 0.32, 0.32, 0.5, 0.95))
    part('Trim', lod, 'brass', lambda bm: box(bm, -0.335, -0.515, 0.93, 0.335, 0.515, 0.96))
    part('Trim', lod, 'brass', lambda bm: box(bm, -0.335, -0.515, 0.31, 0.335, 0.515, 0.34))
    part('Corn', lod, 'popcorn', lambda bm: box(bm, -0.26, -0.42, 0.96, 0.26, 0.42, 1.12))
    rnd = random.Random(3)
    def kernels(bm):   # a heap of popped kernels on top (the flat block read as cream)
        for _ in range(70):
            u, v = rnd.uniform(-0.24, 0.24), rnd.uniform(-0.4, 0.4); h = 1.12 + 0.06 * (1 - (u / 0.26) ** 2) * (1 - (v / 0.42) ** 2) + rnd.uniform(0, 0.03)
            r = rnd.uniform(0.018, 0.03); vs0 = len(bm.verts); sphere(bm, r, 4); bm.verts.ensure_lookup_table()
            for vv in bm.verts[vs0:]: vv.co += Vector((u, v, h))
    part('Kernels', lod, 'popcorn', kernels)
    for x in (-0.28, 0.28):
        for y in (-0.46, 0.46):
            part('Post', lod, 'brass', lambda bm, x=x, y=y: box(bm, x - 0.012, y - 0.012, 0.96, x + 0.012, y + 0.012, 1.62))
    part('Roof', lod, 'lacquer_red', lambda bm: box(bm, -0.36, -0.56, 1.62, 0.36, 0.56, 1.68))
    part('Finial', lod, 'brass', lambda bm: (lathe(bm, [(1e-4, 1.68), (0.06, 1.68), (0.03, 1.78), (1e-4, 1.8)], 12)))
    for y in (-0.56, 0.56):
        part('Wheel', lod, 'paint_black', lambda bm, y=y: (lathe(bm, ring(0.29, 0.33, -0.025, 0.025), 32), bm.transform(T(0, y, 0.33) @ Matrix.Rotation(math.radians(90), 4, 'X'))))
        part('Hub', lod, 'brass', lambda bm, y=y: (lathe(bm, ring(1e-4, 0.05, -0.04, 0.04), 12), bm.transform(T(0, y, 0.33) @ Matrix.Rotation(math.radians(90), 4, 'X'))))
        for k in range(8):
            a = k * math.pi / 8
            part('Spoke', lod, 'brass', lambda bm, y=y, a=a: ctube(bm, [(-0.29 * math.cos(a), y, 0.33 - 0.29 * math.sin(a)), (0.29 * math.cos(a), y, 0.33 + 0.29 * math.sin(a))], 0.008, 6))
    part('Handle', lod, 'brass', lambda bm: ctube(bm, [(-0.32, -0.45, 0.85), (-0.55, -0.45, 0.95), (-0.55, 0.45, 0.95), (-0.32, 0.45, 0.85)], 0.014, 8))


MODELS = {'fountain_tier': fountain_tier, 'pillar_light': pillar_light, 'pendant_cloud': pendant_cloud, 'espresso_machine': espresso_machine, 'cake_case': cake_case,
          'cafe_counter': cafe_counter, 'rug_round': rug_round, 'rug_runner': rug_runner, 'standee_base': standee_base, 'popcorn_cart': popcorn_cart}


def reset():
    for o in list(bpy.data.objects): bpy.data.objects.remove(o)
    for m in list(bpy.data.meshes): bpy.data.meshes.remove(m)
    del PARTS[:]


os.makedirs(A.out, exist_ok=True)
for name, fn in MODELS.items():
    if A.only and name not in A.only.split(','): continue
    reset(); fn(0); info = lbl.export(name, A.out)
    print(f"{name}: {info['tris']} tris, {info['parts']} parts, {info['bytes'] // 1024} KB")
