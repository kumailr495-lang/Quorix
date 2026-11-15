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
             'carpet_deco': ((0.25, 0.2, 0.18), 0.9, 0.0), 'oak': ((0.45, 0.28, 0.13), 0.6, 0.0), 'lacquer_black': ((0.01, 0.01, 0.012), 0.2, 0.0), 'paper_red': ((0.55, 0.03, 0.04), 0.7, 0.0), 'candy_red': ((0.6, 0.03, 0.05), 0.4, 0.0), 'candy_yellow': ((0.85, 0.55, 0.05), 0.4, 0.0), 'candy_green': ((0.1, 0.45, 0.12), 0.4, 0.0), 'candy_blue': ((0.05, 0.2, 0.65), 0.4, 0.0), 'ceramic': ((0.8, 0.76, 0.7), 0.3, 0.0), 'velvet_navy': ((0.02, 0.03, 0.1), 0.9, 0.0), 'fluted_plaster': ((0.8, 0.74, 0.62), 0.8, 0.0)}.items():
    lbl.MAT_DEF.setdefault(k, v)


def box(bm, x0, y0, z0, x1, y1, z1):
    """axis box (a closed solid)"""
    r = bmesh.ops.create_cube(bm, size=1.0); vs = r['verts']
    for v in vs: v.co = Vector((x0 + (v.co.x + 0.5) * (x1 - x0), y0 + (v.co.y + 0.5) * (y1 - y0), z0 + (v.co.z + 0.5) * (z1 - z0)))


def sphere(bm, r, n=10):
    lathe(bm, [(1e-4, -r)] + [(r * math.sin(math.pi * i / n), -r * math.cos(math.pi * i / n)) for i in range(1, n)] + [(1e-4, r)], 2 * n)


def ctube(bm, pts, radius, sides=8):
    """a round tube along an open polyline, capped at both ends (a closed solid: lbl.tube leaves its ends open). v11: a polyline that
    ends where it starts is a closed ring: its seam takes its direction from both neighbours and is welded, with no caps (the bistro
    chair's ring had two cross-sections and two caps on one spot there, which fought)"""
    loop = len(pts) > 3 and (Vector(pts[0]) - Vector(pts[-1])).length < 1e-9
    if loop: pts = pts[:-1]
    n = len(pts); rings = []
    for i, p in enumerate(pts):
        a = pts[(i - 1) % n] if loop else pts[max(0, i - 1)]; b = pts[(i + 1) % n] if loop else pts[min(n - 1, i + 1)]
        t = (Vector(b) - Vector(a)).normalized(); up = Vector((0, 0, 1)) if abs(t.z) < 0.9 else Vector((1, 0, 0))
        x = t.cross(up).normalized(); y = t.cross(x).normalized()
        rings.append([bm.verts.new(Vector(p) + (x * math.cos(2 * math.pi * k / sides) + y * math.sin(2 * math.pi * k / sides)) * radius) for k in range(sides)])
    for i in range(n if loop else n - 1):
        a, b = rings[i], rings[(i + 1) % n]
        for k in range(sides): k2 = (k + 1) % sides; bm.faces.new((a[k], a[k2], b[k2], b[k]))
    if not loop: bm.faces.new(list(reversed(rings[0]))); bm.faces.new(rings[-1])


def ring(r0, r1, z0, z1):
    return [(r0, z0), (r1, z0), (r1, z1), (r0, z1)]


# ---------------------------------------------------------------- the models
def fountain_tier(lod=0):
    seg = 64 if lod == 0 else 28
    part('Basin', lod, 'stone_light', lambda bm: lathe(bm, [(1e-4, 0.0), (1.55, 0.0), (1.62, 0.40), (1.62, 0.46), (1.40, 0.46), (1.40, 0.15), (1e-4, 0.15)], seg))
    # v11 (the user: no floating or disconnected parts): the water fills the basin to its walls and floor (it was a slab 8 mm off the wall and
    # 15 cm over the floor, the stem standing on the slab's underside), the stem stands on the basin's floor, the rim light is set into the
    # wall (2 mm off it), the streams start inside the bowls' rims and end in the water and the lower bowl (5 mm and 6 cm short), the
    # finial rises from the top bowl on a neck (it hung 8 cm over it)
    part('Water', lod, 'glass', lambda bm: lathe(bm, ring(1e-4, 1.405, 0.148, 0.355), seg))
    part('RimLight', lod, 'glow_warm', lambda bm: lathe(bm, ring(1.618, 1.632, 0.405, 0.43), seg), smooth=False)
    part('Stem', lod, 'marble_nero', lambda bm: lathe(bm, [(1e-4, 0.148), (0.34, 0.148), (0.34, 0.30), (0.27, 0.46), (0.17, 0.86), (0.13, 1.22), (1e-4, 1.22)], seg // 2))
    part('Bowl', lod, 'brass', lambda bm: lathe(bm, [(1e-4, 1.18), (0.14, 1.18), (0.78, 1.33), (0.82, 1.39), (0.76, 1.39), (0.14, 1.25), (1e-4, 1.25)], seg))
    part('Stem2', lod, 'marble_nero', lambda bm: lathe(bm, [(1e-4, 1.24), (0.09, 1.24), (0.065, 1.74), (1e-4, 1.74)], seg // 2))
    part('Bowl2', lod, 'brass', lambda bm: lathe(bm, [(1e-4, 1.71), (0.08, 1.71), (0.39, 1.81), (0.42, 1.86), (0.38, 1.86), (0.08, 1.77), (1e-4, 1.77)], seg))
    part('Finial', lod, 'brass', lambda bm: lathe(bm, [(1e-4, 1.76), (0.03, 1.76), (0.03, 1.85), (0.05, 1.86), (0.07, 1.93), (0.03, 2.02), (1e-4, 2.05)], seg // 2))
    # the water falling from each bowl's lip: thin lit streams (the fountain is lit from below, as at night); a solid lit curtain read
    # as a white drum in the review renders
    for k in range(28 if lod == 0 else 14):
        a = 2 * math.pi * (k + 0.5) / (28 if lod == 0 else 14); r1, r2 = 0.83, 0.88
        part('Fall', lod, 'glow_ice', lambda bm, a=a: ctube(bm, [(0.80 * math.cos(a), 0.80 * math.sin(a), 1.385), (r1 * math.cos(a), r1 * math.sin(a), 1.0), (r2 * math.cos(a), r2 * math.sin(a), 0.35)], 0.006, 4), smooth=False)
    for k in range(16 if lod == 0 else 8):
        a = 2 * math.pi * (k + 0.25) / (16 if lod == 0 else 8)
        part('Fall2', lod, 'glow_ice', lambda bm, a=a: ctube(bm, [(0.40 * math.cos(a), 0.40 * math.sin(a), 1.85), (0.44 * math.cos(a), 0.44 * math.sin(a), 1.6), (0.47 * math.cos(a), 0.47 * math.sin(a), 1.32)], 0.005, 4), smooth=False)
    part('Glint', lod, 'glow_ice', lambda bm: lathe(bm, ring(0.875, 0.892, 0.353, 0.36), seg), smooth=False)   # where the streams land (2 mm into the water)


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
    """a two-group espresso machine on the cafe counter: chrome body, red front, group heads with black handles, steam wands, cups.
    v11 (the user: no floating parts, no shared faces): the body stands on the counter on four feet (it hovered 4 cm over it with only the
    drip tray's front under it), the drip tray runs 1 cm into the body, the cups stand on the tray, the cup rail on top is a raised gallery
    set into the top (it was a plate whose face was the top's own)"""
    part('Body', lod, 'chrome', lambda bm: lbl.rounded_box(bm, (0.5, 0.74, 0.40), 0.03, (2, 3, 2), 2), T(0, 0, 0.24))
    for fx in (-0.2, 0.2):
        for fy in (-0.32, 0.32):
            part('Foot', lod, 'paint_black', lambda bm, fx=fx, fy=fy: (lathe(bm, ring(1e-4, 0.022, 0.0, 0.05), 12), bm.transform(T(fx, fy, 0))))   # 1 cm into the body
    part('Front', lod, 'lacquer_red', lambda bm: box(bm, 0.249, -0.33, 0.12, 0.262, 0.33, 0.40))   # 1 mm into the body's face
    part('Tray', lod, 'steel', lambda bm: box(bm, 0.24, -0.33, 0.0, 0.36, 0.33, 0.045))   # 1 cm into the body's front and 5 mm into its foot
    for y in (-0.16, 0.16):
        part('Group', lod, 'chrome', lambda bm, y=y: (lathe(bm, [(1e-4, 0.0), (0.045, 0.0), (0.05, 0.08), (1e-4, 0.09)], 16), bm.transform(T(0.3, y, 0.2))))
        part('Handle', lod, 'paint_black', lambda bm, y=y: box(bm, 0.33, y - 0.014, 0.205, 0.48, y + 0.014, 0.235))
        part('Cup', lod, 'ceramic', lambda bm, y=y: (lathe(bm, [(1e-4, 0.0), (0.035, 0.0), (0.042, 0.065), (1e-4, 0.065)], 14), bm.transform(T(0.3, y, 0.043))))   # 2 mm into the tray
    for y in (-0.31, 0.31):
        part('Wand', lod, 'chrome', lambda bm, y=y: ctube(bm, [(0.26, y, 0.33), (0.36, y, 0.26), (0.38, y, 0.1)], 0.007, 6))
    for i in range(6):
        part('Cup', lod, 'ceramic', lambda bm, i=i: (lathe(bm, [(1e-4, 0.0), (0.035, 0.0), (0.045, 0.07), (1e-4, 0.07)], 14), bm.transform(T(-0.08 + (i % 2) * 0.11, -0.22 + (i // 2) * 0.22, 0.438))))   # 2 mm into the top
    for (x0, y0, x1, y1) in ((-0.2, -0.32, 0.2, -0.31), (-0.2, 0.31, 0.2, 0.32), (-0.2, -0.31, -0.19, 0.31), (0.19, -0.31, 0.2, 0.31)):   # the cup warmer's gallery rail
        part('Rail', lod, 'chrome', lambda bm, a=(x0, y0, x1, y1): box(bm, a[0], a[1], 0.435, a[2], a[3], 0.465))


def wedge(bm, r, z0, z1, a0, a1, seg=20):
    """a cake with a slice taken out (or the slice): a closed cylinder sector from angle a0 to a1 (degrees)"""
    n = max(2, int(seg * (a1 - a0) / 360.0)); cb, ct = bm.verts.new((0, 0, z0)), bm.verts.new((0, 0, z1)); B, Tp = [], []
    for k in range(n + 1):
        a = math.radians(a0 + (a1 - a0) * k / n); B.append(bm.verts.new((r * math.cos(a), r * math.sin(a), z0))); Tp.append(bm.verts.new((r * math.cos(a), r * math.sin(a), z1)))
    for k in range(n):
        bm.faces.new((B[k], B[k + 1], Tp[k + 1], Tp[k])); bm.faces.new((ct, Tp[k], Tp[k + 1])); bm.faces.new((cb, B[k + 1], B[k]))
    bm.faces.new((cb, B[0], Tp[0], ct)); bm.faces.new((cb, ct, Tp[n], B[n]))


def torus(bm, R, r, zc, seg=10, sides=6):
    lathe(bm, [(R + r * math.cos(2 * math.pi * k / sides), zc + r * math.sin(2 * math.pi * k / sides)) for k in range(sides)], seg)


def cake_case(lod=0):
    """v11 (the user: "fix the cake models": they were plain cylinders). A lit pastry case with eight things you can name: a strawberry
    layer cake with a slice out, a chocolate cake with cream rosettes and cherries, a cheesecake, glazed doughnuts; over them cupcakes,
    a two-tier cake on a stand, a fruit tart, three slices on plates. Walnut base, brass frame, a light strip under the lid."""
    part('Base', lod, 'walnut', lambda bm: box(bm, -0.3, -0.58, 0.0, 0.3, 0.58, 0.12))
    for x in (-0.28, 0.28):
        for y in (-0.56, 0.56):
            part('Post', lod, 'brass', lambda bm, x=x, y=y: box(bm, x - 0.012, y - 0.012, 0.12, x + 0.012, y + 0.012, 0.62))
    part('Lid', lod, 'brass', lambda bm: box(bm, -0.3, -0.58, 0.62, 0.3, 0.58, 0.65))
    part('Light', lod, 'glow_warm', lambda bm: box(bm, -0.2, -0.5, 0.607, 0.2, 0.5, 0.622), smooth=False)   # 2 mm into the lid
    part('Shelf', lod, 'lacquer_cream', lambda bm: box(bm, -0.275, -0.555, 0.36, 0.275, 0.555, 0.375))   # v11: 7 mm into the four posts (it hung 8 mm clear of them)
    part('ShelfEdge', lod, 'brass', lambda bm: box(bm, 0.275, -0.555, 0.357, 0.283, 0.555, 0.378))
    def at(x, y, z): return T(x, y, z)
    def ball(name, mat, r, x, y, z, n=4): part(name, lod, mat, lambda bm: (sphere(bm, r, n), bm.transform(at(x, y, z))))
    def cyl(name, mat, r, z0, z1, x, y, z, seg=20, smooth=True): part(name, lod, mat, lambda bm: (lathe(bm, ring(1e-4, r, z0, z1), seg), bm.transform(at(x, y, z))), smooth=smooth)
    def sect(name, mat, r, z0, z1, a0, a1, x, y, z, rot=0.0): part(name, lod, mat, lambda bm: (wedge(bm, r, z0, z1, a0, a1), bm.transform(at(x, y, z) @ RZ(rot))), smooth=False)
    Z0, Z1 = 0.118, 0.373   # v11: 2 mm into the base's top and the shelf's top (1 mm over them, every cake floated)
    # ---- lower shelf
    x, y = 0.02, -0.40   # strawberry layer cake, a slice out towards you
    cyl('Plate', 'ceramic', 0.118, 0.0, 0.008, x, y, Z0, 24)
    sect('Sponge', 'popcorn', 0.095, 0.008, 0.046, 35, 325, x, y, Z0); sect('Cream', 'lacquer_cream', 0.0958, 0.046, 0.052, 35, 325, x, y, Z0)
    sect('Sponge', 'popcorn', 0.095, 0.052, 0.088, 35, 325, x, y, Z0); sect('Icing', 'candy_pink', 0.098, 0.088, 0.098, 35, 325, x, y, Z0)
    for k in range(6): a = math.radians(60 + 48 * k); ball('Berry', 'candy_red', 0.013, x + 0.07 * math.cos(a), y + 0.07 * math.sin(a), Z0 + 0.108)
    x, y = 0.02, -0.13   # chocolate cake: dark glaze, cream rosettes, a cherry on each
    cyl('Plate', 'ceramic', 0.12, 0.0, 0.008, x, y, Z0, 24); cyl('Choc', 'walnut_dark', 0.1, 0.008, 0.09, x, y, Z0, 24); cyl('Glaze', 'lacquer_black', 0.102, 0.09, 0.096, x, y, Z0, 24)
    for k in range(8):
        a = 2 * math.pi * k / 8; ball('Rosette', 'lacquer_cream', 0.015, x + 0.078 * math.cos(a), y + 0.078 * math.sin(a), Z0 + 0.107); ball('Cherry', 'candy_red', 0.008, x + 0.078 * math.cos(a), y + 0.078 * math.sin(a), Z0 + 0.124, 3)
    x, y = 0.02, 0.14    # cheesecake: biscuit base, berry glaze, a slice out
    cyl('Plate', 'ceramic', 0.122, 0.0, 0.008, x, y, Z0, 24); sect('Biscuit', 'oak', 0.105, 0.008, 0.022, 20, 320, x, y, Z0); sect('Cheese', 'lacquer_cream', 0.103, 0.022, 0.064, 20, 320, x, y, Z0)
    sect('BerryGlaze', 'candy_red', 0.094, 0.064, 0.07, 20, 320, x, y, Z0)
    x, y = 0.02, 0.40    # doughnuts on a steel tray
    part('Tray', lod, 'steel', lambda bm: box(bm, x - 0.115, y - 0.115, Z0, x + 0.115, y + 0.115, Z0 + 0.008))
    for k, mat in enumerate(('candy_pink', 'walnut_dark', 'candy_yellow', 'lacquer_cream')):
        dx, dy = (-0.055 if k % 2 == 0 else 0.055), (-0.055 if k < 2 else 0.055)
        part('Doughnut', lod, 'oak', lambda bm, dx=dx, dy=dy: (torus(bm, 0.032, 0.017, 0.0), bm.transform(at(x + dx, y + dy, Z0 + 0.0215))))   # 1.5 mm into the tray
        part('Icing', lod, mat, lambda bm, dx=dx, dy=dy: (lathe(bm, [(0.019, 0.0), (0.045, 0.0), (0.041, 0.012), (0.023, 0.012)], 10), bm.transform(at(x + dx, y + dy, Z0 + 0.0275))))
    # ---- upper shelf
    x, y = 0.02, -0.40   # six cupcakes
    for k in range(6):
        dx, dy = (-0.055 if k % 2 == 0 else 0.055), (-0.085 + 0.085 * (k // 2)); ic = ('candy_pink', 'lacquer_cream', 'candy_yellow')[k % 3]
        part('Cup', lod, 'paper_red', lambda bm, dx=dx, dy=dy: (lathe(bm, [(1e-4, 0.0), (0.022, 0.0), (0.03, 0.036), (1e-4, 0.036)], 10), bm.transform(at(x + dx, y + dy, Z1))))
        ball('Swirl', ic, 0.027, x + dx, y + dy, Z1 + 0.048); ball('Swirl', ic, 0.018, x + dx, y + dy, Z1 + 0.072); ball('Cherry', 'candy_red', 0.007, x + dx, y + dy, Z1 + 0.092, 3)
    x, y = 0.02, -0.13   # two tiers on a stand
    part('Stand', lod, 'ceramic', lambda bm: (lathe(bm, [(1e-4, 0.0), (0.055, 0.0), (0.05, 0.008), (0.014, 0.014), (0.012, 0.05), (0.1, 0.056), (0.1, 0.062), (1e-4, 0.062)], 24), bm.transform(at(x, y, Z1))))
    cyl('Tier', 'lacquer_cream', 0.082, 0.062, 0.122, x, y, Z1, 24); cyl('Band', 'candy_pink', 0.09, 0.061, 0.072, x, y, Z1, 24)   # v11: ribbons 8 mm proud (1.5 mm fought), from 1 mm under the tier's foot
    cyl('Tier', 'lacquer_cream', 0.052, 0.122, 0.17, x, y, Z1, 20); cyl('Band', 'candy_pink', 0.06, 0.121, 0.131, x, y, Z1, 20)
    for k in range(10): a = 2 * math.pi * k / 10; ball('Pearl', 'candy_pink', 0.007, x + 0.068 * math.cos(a), y + 0.068 * math.sin(a), Z1 + 0.126, 3)
    ball('Topper', 'candy_red', 0.014, x, y, Z1 + 0.183)
    x, y = 0.02, 0.14    # fruit tart
    part('Shell', lod, 'oak', lambda bm: (lathe(bm, [(1e-4, 0.0), (0.085, 0.0), (0.098, 0.03), (0.09, 0.03), (0.084, 0.012), (1e-4, 0.012)], 24), bm.transform(at(x, y, Z1 + 0.001))))
    cyl('Custard', 'popcorn', 0.086, 0.012, 0.024, x, y, Z1 + 0.001, 24)
    for k in range(12):
        a = 2 * math.pi * k / 12; rr = 0.066 if k % 2 == 0 else 0.036; ball('Fruit', ('candy_red', 'candy_yellow', 'candy_green', 'candy_blue')[k % 4], 0.012, x + rr * math.cos(a), y + rr * math.sin(a), Z1 + 0.034)
    x, y = 0.02, 0.40    # three slices on plates
    for k, (mat, top) in enumerate((('walnut_dark', 'lacquer_cream'), ('popcorn', 'candy_pink'), ('lacquer_cream', 'candy_red'))):
        dy = -0.085 + 0.085 * k; dx = 0.03 if k == 1 else -0.03
        cyl('Plate', 'ceramic', 0.05, 0.0, 0.006, x + dx, y + dy, Z1, 16)
        sect('Slice', mat, 0.085, 0.006, 0.062, -18, 18, x + dx - 0.04, y + dy, Z1); sect('SliceTop', top, 0.086, 0.062, 0.07, -18, 18, x + dx - 0.04, y + dy, Z1)


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
    part('Border', lod, 'velvet_navy', lambda bm: lathe(bm, ring(1.9, 2.1, 0.0, 0.017), 64))   # v11: 5 mm over the field it laps (2 mm fought far off)


def rug_runner(lod=0):
    part('Field', lod, 'carpet_deco', lambda bm: box(bm, -1.9, -1.15, 0.0, 1.9, 1.15, 0.012))
    for (x0, y0, x1, y1) in ((-2.0, -1.25, 2.0, -1.13), (-2.0, 1.13, 2.0, 1.25), (-2.0, -1.13, -1.88, 1.13), (1.88, -1.13, 2.0, 1.13)):
        part('Border', lod, 'velvet_navy', lambda bm, a=(x0, y0, x1, y1): box(bm, a[0], a[1], 0.0, a[2], a[3], 0.017))   # v11: 5 mm over the field it laps


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
        got = []
        for _ in range(70):
            u, v = rnd.uniform(-0.24, 0.24), rnd.uniform(-0.4, 0.4); h = 1.12 + 0.06 * (1 - (u / 0.26) ** 2) * (1 - (v / 0.42) ** 2) + rnd.uniform(0, 0.03)
            r = rnd.uniform(0.018, 0.03)
            if any((u - a) ** 2 + (v - b) ** 2 + (h - c) ** 2 < (0.7 * (r + q)) ** 2 for a, b, c, q in got): continue   # v11: two on one spot shared facets
            got.append((u, v, h, r)); vs0 = len(bm.verts); sphere(bm, r, 4); bm.verts.ensure_lookup_table()
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
        part('Axle', lod, 'steel', lambda bm, y=y: (lathe(bm, ring(1e-4, 0.016, -0.06, 0.06), 10), bm.transform(T(0, y * 0.93, 0.33) @ Matrix.Rotation(math.radians(90), 4, 'X'))))   # v11: from 2 cm inside the body into the hub
        for k in range(8):
            a = k * math.pi / 8
            part('Spoke', lod, 'brass', lambda bm, y=y, a=a: ctube(bm, [(-0.29 * math.cos(a), y, 0.33 - 0.29 * math.sin(a)), (0.29 * math.cos(a), y, 0.33 + 0.29 * math.sin(a))], 0.008, 6))
    part('Handle', lod, 'brass', lambda bm: ctube(bm, [(-0.32, -0.45, 0.85), (-0.55, -0.45, 0.95), (-0.55, 0.45, 0.95), (-0.32, 0.45, 0.85)], 0.014, 8))


def bistro_table(lod=0):
    """a cafe table: calacatta round top with a brass edge on a black column and a domed cast foot (0.75 m high, 0.65 m across)"""
    seg = 40 if lod == 0 else 20
    part('Top', lod, 'marble_calacatta', lambda bm: lathe(bm, ring(1e-4, 0.32, 0.728, 0.752), seg))
    part('Edge', lod, 'brass', lambda bm: lathe(bm, ring(0.3201, 0.327, 0.726, 0.754), seg))
    part('Column', lod, 'paint_black', lambda bm: lathe(bm, [(1e-4, 0.05), (0.032, 0.05), (0.026, 0.4), (0.03, 0.70), (0.07, 0.712), (0.07, 0.728), (1e-4, 0.728)], 16))
    part('Foot', lod, 'paint_black', lambda bm: lathe(bm, [(1e-4, 0.0), (0.24, 0.0), (0.24, 0.015), (0.16, 0.045), (0.05, 0.06), (1e-4, 0.062)], seg))


def bistro_chair(lod=0):
    """a bentwood cafe chair: walnut seat with a cane panel, four splayed legs on a ring, a hooped back (front +X)"""
    part('Seat', lod, 'walnut_dark', lambda bm: lathe(bm, [(1e-4, 0.43), (0.205, 0.43), (0.215, 0.45), (0.205, 0.47), (1e-4, 0.47)], 32))
    part('Cane', lod, 'fluted_plaster', lambda bm: lathe(bm, ring(1e-4, 0.17, 0.47, 0.474), 32))
    legs = [(0.15 * math.cos(a), 0.15 * math.sin(a)) for a in (math.radians(45), math.radians(135), math.radians(225), math.radians(315))]
    for x, y in legs:
        part('Leg', lod, 'walnut_dark', lambda bm, x=x, y=y: ctube(bm, [(x, y, 0.43), (x * 1.25, y * 1.25, 0.2), (x * 1.45, y * 1.45, 0.0)], 0.016, 8))
    part('Ring', lod, 'walnut_dark', lambda bm: ctube(bm, [(0.19 * math.cos(2 * math.pi * k / 24), 0.19 * math.sin(2 * math.pi * k / 24), 0.2) for k in range(25)], 0.01, 6))
    # the back: one bent hoop from the seat's back edge, up and over, and two spindles inside it
    hoop = [(-0.17 - 0.06 * math.sin(math.pi * t / 20), 0.17 * math.cos(math.pi * t / 20), 0.45 + 0.42 * math.sin(math.pi * t / 20)) for t in range(21)]
    part('Hoop', lod, 'walnut_dark', lambda bm: ctube(bm, hoop, 0.014, 8))
    for y in (-0.05, 0.05):
        part('Spindle', lod, 'walnut_dark', lambda bm, y=y: ctube(bm, [(-0.18, y, 0.46), (-0.215, y, 0.66), (-0.225, y, 0.85)], 0.009, 6))


MODELS = {'bistro_table': bistro_table, 'bistro_chair': bistro_chair, 'fountain_tier': fountain_tier, 'pillar_light': pillar_light, 'pendant_cloud': pendant_cloud, 'espresso_machine': espresso_machine, 'cake_case': cake_case,
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
