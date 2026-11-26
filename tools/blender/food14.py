"""LUMIERE v14 - the menu as things you hold (the user, 11-21: "make the ... food system huge with each of them having their own identity and
detailed instead of having this blocky view"; "food ... categories and with their own icons"). Each item is a small, detailed model with its
origin at its foot (the hand holds it from below), measured from real cinema servings:
  food_popcorn   a 2.5 l striped paper tub (17 cm, a rolled rim) heaped with popped kernels (the heap is the part 'Fill': it sinks as you eat)
  food_nachos    a black paper boat of corn chips, a cup of cheese sauce, jalapeño rings
  food_hotdog    a split bun in a paper sleeve, the sausage, a zigzag of mustard
  food_burger    sesame bun, patty, a cheese slice drooping at its corners, lettuce, tomato, half in a paper wrap
  food_pizza     a pepperoni slice with a rolled crust on a paper plate
  food_fries     a red carton (its front cut in a curve) of fries
  food_icecream  a waffle cone with a cross-hatched grid, two scoops (strawberry, vanilla) and a wafer
  food_churros   three star-section churros in a paper cup with a chocolate dip
  food_choc      a dark chocolate bar of scored pieces, its foil and sleeve peeled back
  food_gummies   a paper cup of gummy bears in five colours
  food_cup       a 32 oz soda cup with a printed band, a dome lid and a striped straw (cola, lemonade, iced tea: tints)
  food_shake     a milkshake cup with whipped cream, a cherry and a striped straw
  food_slush     a frozen slush in a clear-blue cup with a spoon straw
  food_coffee    a takeaway coffee cup with a kraft sleeve and a sip lid
  food_chai      masala chai in a terracotta kulhad (the clay cup of Indian chai stalls)
  food_water     a 500 ml water bottle with a label and a blue cap
Original models (no outside meshes). Parts embed 1-2 mm into what they rest on; parallel faces of different parts 2 mm or more apart (held
items are seen up close only: zcheck's 5 mm rule is for room-sized distances).

    blender --background --factory-startup --python tools/blender/food14.py -- --out www/models [--only NAME] [--icons OUT_DIR]
"""
import bpy, bmesh, math, sys, os, argparse, random
from mathutils import Vector, Matrix, noise
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lbl
from lbl import T, RY, RZ, lathe, rb, part, PARTS

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ap = argparse.ArgumentParser(); ap.add_argument('--out', default='www/models'); ap.add_argument('--only', default=''); ap.add_argument('--icons', default='')
A = ap.parse_args(argv)
FOOD_MATS = {
    'paper_white': ((0.82, 0.8, 0.76), 0.85, 0.0), 'paint_red': ((0.5, 0.03, 0.04), 0.6, 0.0), 'paint_black': ((0.01, 0.01, 0.012), 0.7, 0.0), 'popcorn': ((0.85, 0.7, 0.36), 0.8, 0.0),
    'nacho': ((0.72, 0.45, 0.1), 0.7, 0.0), 'cheese_sauce': ((0.85, 0.5, 0.04), 0.25, 0.0), 'jalapeno': ((0.12, 0.35, 0.05), 0.4, 0.0), 'bun': ((0.62, 0.3, 0.08), 0.65, 0.0),
    'bun_inner': ((0.85, 0.7, 0.45), 0.85, 0.0), 'sausage': ((0.4, 0.09, 0.04), 0.35, 0.0), 'mustard': ((0.85, 0.62, 0.02), 0.35, 0.0), 'patty': ((0.12, 0.05, 0.025), 0.75, 0.0),
    'cheese_slice': ((0.9, 0.48, 0.03), 0.45, 0.0), 'lettuce': ((0.25, 0.55, 0.08), 0.6, 0.0), 'tomato': ((0.6, 0.06, 0.03), 0.35, 0.0), 'sesame': ((0.9, 0.8, 0.6), 0.6, 0.0),
    'crust': ((0.6, 0.32, 0.1), 0.7, 0.0), 'pizza_cheese': ((0.95, 0.72, 0.28), 0.5, 0.0), 'pepperoni': ((0.48, 0.06, 0.04), 0.45, 0.0), 'fry': ((0.95, 0.74, 0.3), 0.65, 0.0),
    'wafer': ((0.62, 0.36, 0.12), 0.8, 0.0), 'scoop_pink': ((0.95, 0.5, 0.58), 0.55, 0.0), 'scoop_vanilla': ((0.96, 0.9, 0.74), 0.55, 0.0), 'chocolate': ((0.16, 0.07, 0.03), 0.35, 0.0),
    'sugar': ((0.6, 0.33, 0.1), 0.8, 0.0), 'foil': ((0.8, 0.8, 0.82), 0.25, 1.0), 'sleeve_gold': ((0.7, 0.48, 0.15), 0.4, 0.0), 'gummy_red': ((0.8, 0.05, 0.08), 0.3, 0.0),
    'gummy_green': ((0.2, 0.7, 0.1), 0.3, 0.0), 'gummy_yellow': ((0.95, 0.8, 0.1), 0.3, 0.0), 'gummy_orange': ((0.95, 0.45, 0.05), 0.3, 0.0), 'gummy_white': ((0.9, 0.9, 0.85), 0.3, 0.0),
    'plastic_lid': ((0.85, 0.86, 0.88), 0.3, 0.0), 'cup_band': ((0.12, 0.08, 0.06), 0.6, 0.0), 'cup_gold': ((0.75, 0.55, 0.2), 0.5, 0.0), 'straw_red': ((0.75, 0.05, 0.05), 0.4, 0.0),
    'shake_pink': ((0.95, 0.62, 0.68), 0.5, 0.0), 'cream': ((0.97, 0.96, 0.93), 0.7, 0.0), 'cherry': ((0.55, 0.0, 0.03), 0.2, 0.0), 'slush_blue': ((0.05, 0.35, 0.9), 0.3, 0.0),
    'cup_clear': ((0.6, 0.75, 0.9), 0.15, 0.0), 'kraft': ((0.5, 0.33, 0.18), 0.85, 0.0), 'terracotta': ((0.55, 0.23, 0.1), 0.85, 0.0), 'chai': ((0.6, 0.38, 0.2), 0.3, 0.0),
    'bottle_blue': ((0.55, 0.75, 0.9), 0.12, 0.0), 'cap_blue': ((0.05, 0.25, 0.7), 0.4, 0.0), 'label': ((0.9, 0.92, 0.95), 0.6, 0.0), 'water_in': ((0.7, 0.85, 0.95), 0.05, 0.0),
}
for k, v in FOOD_MATS.items(): lbl.MAT_DEF[k] = v
rnd = random.Random(14)
RX = lambda deg: Matrix.Rotation(math.radians(deg), 4, 'X')


def bx(name, mat, a, b, r=0.0, M=None):
    size = tuple(b[i] - a[i] for i in range(3)); c = tuple((a[i] + b[i]) / 2 for i in range(3)); M = M or Matrix.Identity(4)
    if r > 0: return part(name, 0, mat, rb(size, r), M @ T(*c))
    def build(bm): bmesh.ops.create_cube(bm, size=1.0); bm.transform(Matrix.Diagonal((*size, 1.0)))
    return part(name, 0, mat, build, M @ T(*c), smooth=False)


def lat(name, mat, profile, M=None, seg=32, smooth=True):
    return part(name, 0, mat, lambda bm: lathe(bm, profile, seg), M or Matrix.Identity(4), smooth=smooth)


def blob(name, mat, c, r, sq=(1.0, 1.0, 1.0), lumpy=0.18, seed=0, sub=2, M=None):
    """a soft lump: an icosphere pushed in and out by noise (kernels, scoops, gummies)"""
    def build(bm):
        bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=r)
        for v in bm.verts:
            n = noise.noise(v.co * (7.0 / r * 0.05) + Vector((seed * 3.1, seed * 1.7, seed * 0.9)))
            v.co *= (1.0 + lumpy * n); v.co.x *= sq[0]; v.co.y *= sq[1]; v.co.z *= sq[2]
    return part(name, 0, mat, build, (M or Matrix.Identity(4)) @ T(*c))


def tube(name, mat, pts, r, sides=8, cap=True):
    return part(name, 0, mat, lambda bm: lbl.ptube(bm, [Vector(p) for p in pts], r, sides, cap))


def striped_lathe(name, mats, profile, n, seg_per=2):
    """a lathe whose faces alternate between two materials in vertical stripes (n stripes round)"""
    seg = n * seg_per
    for k, mat in enumerate(mats):
        def build(bm, k=k):
            rings = [[None] * (seg + 1) for _ in profile]
            for i, (rr, z) in enumerate(profile):
                for j in range(seg + 1):
                    a = 2 * math.pi * j / seg; rings[i][j] = (rr * math.cos(a), rr * math.sin(a), z)
            vs = {}
            def V(i, j):
                key = (i, j % seg)
                if key not in vs: vs[key] = bm.verts.new(rings[i][j % seg])
                return vs[key]
            for i in range(len(profile) - 1):
                for j in range(seg):
                    if (j // seg_per) % 2 != k: continue
                    bm.faces.new((V(i, j), V(i, j + 1), V(i + 1, j + 1), V(i + 1, j)))
        part(name + ('A' if k == 0 else 'B'), 0, mat, build)


# ------------------------------------------------------------------------------------------------ the items
def food_popcorn():
    H, R0, R1 = 0.17, 0.058, 0.084
    lat('Base', 'paper_white', [(1e-4, 0.0), (R0 + 0.0005, 0.0), (R0 + 0.0005, 0.0025), (1e-4, 0.0025)], seg=32)   # its top 2 mm under the tub's inner floor
    striped_lathe('Tub', ('paint_red', 'paper_white'), [(R0, 0.002), (R0 + (R1 - R0) * 0.5, H * 0.5), (R1, H)], 12)
    lat('Inner', 'paper_white', [(R1 - 0.002, H), (R0 - 0.002, 0.004), (1e-4, 0.004), (1e-4, 0.0045), (R0 - 0.0025, 0.0045), (R1 - 0.0025, H - 0.001)], seg=32)
    lat('Rim', 'paper_white', [(R1 - 0.003, H - 0.002), (R1 + 0.003, H - 0.002), (R1 + 0.0045, H + 0.002), (R1 + 0.002, H + 0.005), (R1 - 0.003, H + 0.003)], seg=40)
    # the heap: kernels on a dome above the rim, packed from the rim inward (part 'Fill' sinks as you eat)
    def heap(bm):
        k = 0
        for ring in range(6):
            rr = R1 * (1.0 - ring / 6.0) * 0.95; n = max(1, int(2 * math.pi * rr / 0.022)) if ring < 5 else 3
            for j in range(n):
                a = 2 * math.pi * (j + 0.5 * ring) / n; h = H - 0.012 + 0.055 * (1 - (rr / R1) ** 2) + rnd.uniform(-0.004, 0.004)
                t = bmesh.ops.create_icosphere(bm, subdivisions=1, radius=0.0125)
                vs = t['verts']; c = Vector((rr * math.cos(a), rr * math.sin(a), h)); sd = rnd.random() * 10
                for v in vs:
                    nn = noise.noise(v.co * 90 + Vector((sd, sd * 0.7, sd * 1.3))); v.co = v.co * (1 + 0.35 * nn); v.co.z *= 0.8; v.co += c
                k += 1
    part('Fill', 0, 'popcorn', heap)


def food_nachos():
    # the paper boat: a flared tray (its walls 2 mm thick), chips in it, a cheese cup in one corner
    def boat(bm):
        L, W, H, F = 0.19, 0.13, 0.045, 0.016
        outer = [(-L / 2 + F, -W / 2 + F, 0), (L / 2 - F, -W / 2 + F, 0), (L / 2 - F, W / 2 - F, 0), (-L / 2 + F, W / 2 - F, 0),
                 (-L / 2, -W / 2, H), (L / 2, -W / 2, H), (L / 2, W / 2, H), (-L / 2, W / 2, H)]
        inner = [(x * 0.97, y * 0.96, z + 0.003) for (x, y, z) in outer]
        V = [bm.verts.new(p) for p in outer + inner]
        bm.faces.new((V[3], V[2], V[1], V[0]))                            # bottom (down)
        for i in range(4):
            j = (i + 1) % 4; bm.faces.new((V[i], V[j], V[4 + j], V[4 + i]))  # outer walls
            bm.faces.new((V[12 + i], V[12 + j], V[8 + j], V[8 + i]))       # inner walls
            bm.faces.new((V[4 + i], V[4 + j], V[12 + j], V[12 + i]))       # rim
        bm.faces.new((V[8], V[9], V[10], V[11]))                           # inner floor (up)
    part('Boat', 0, 'paint_black', boat, smooth=False)
    lat('Cup', 'paper_white', [(1e-4, 0.002), (0.022, 0.002), (0.027, 0.04), (0.0255, 0.0405), (0.0205, 0.006), (1e-4, 0.006)], T(0.055, 0.03, 0.0), seg=28)   # 1 mm into the boat's floor, its own floor 3 mm over it
    lat('Cheese', 'cheese_sauce', [(1e-4, 0.03), (0.0255, 0.03), (0.0255, 0.0335), (0.016, 0.0365), (1e-4, 0.037)], T(0.055, 0.03, 0.0), seg=28)
    for i in range(16):   # chips: thin triangles, slightly cupped, piled
        a = rnd.uniform(0, 2 * math.pi); x, y = rnd.uniform(-0.06, 0.03), rnd.uniform(-0.04, 0.04); z = 0.012 + (i % 5) * 0.008 + rnd.uniform(0, 0.006)
        s = rnd.uniform(0.032, 0.042)
        def chip(bm, s=s):
            p = [(s, 0.0), (-s * 0.5, s * 0.87), (-s * 0.5, -s * 0.87)]; top = [bm.verts.new((px, py, 0.0016)) for px, py in p]; bot = [bm.verts.new((px, py, -0.0016)) for px, py in p]
            bm.faces.new(top); bm.faces.new(list(reversed(bot)))
            for k in range(3): bm.faces.new((bot[k], bot[(k + 1) % 3], top[(k + 1) % 3], top[k]))
            bmesh.ops.subdivide_edges(bm, edges=list(bm.edges), cuts=2, use_grid_fill=True)
            for v in bm.verts: v.co.z += 6 * (v.co.x ** 2 + v.co.y ** 2) * 0.6
        part('Chip', 0, 'nacho', chip, T(x, y, z) @ RZ(math.degrees(a)) @ RY(rnd.uniform(-25, 25)))
    for (x, y) in ((0.045, 0.026), (0.062, 0.038), (0.063, 0.02)):   # jalapeño rings floating in the cheese, apart
        lat('Jalapeno', 'jalapeno', [(0.003, 0.0), (0.0065, 0.0), (0.0065, 0.002), (0.003, 0.002)], T(x, y, 0.0345), seg=14)


def food_hotdog():
    # a paper sleeve (a U trough), the bun halves, the sausage, mustard
    L = 0.17
    def sleeve(bm):
        prof = [(math.cos(math.radians(a)) * 0.034, math.sin(math.radians(a)) * 0.03 + 0.032) for a in range(200, 341, 10)]
        rings = []
        for x in (-L / 2, L / 2):
            rings.append([bm.verts.new((x, py, pz)) for (py, pz) in [(p[0], p[1]) for p in prof]])
        inner = [[bm.verts.new((v.co.x, v.co.y * 0.93, (v.co.z - 0.032) * 0.93 + 0.032 + 0.0015)) for v in r] for r in rings]
        n = len(prof)
        for k in range(n - 1):
            bm.faces.new((rings[0][k], rings[1][k], rings[1][k + 1], rings[0][k + 1])); bm.faces.new((inner[0][k + 1], inner[1][k + 1], inner[1][k], inner[0][k]))
        for e in (0, n - 1):
            bm.faces.new((rings[0][e], inner[0][e], inner[1][e], rings[1][e]) if e == 0 else (rings[1][e], inner[1][e], inner[0][e], rings[0][e]))
        for s, rr, ii in ((0, rings[0], inner[0]), (1, rings[1], inner[1])):
            for k in range(n - 1): bm.faces.new((rr[k], rr[k + 1], ii[k + 1], ii[k]) if s == 0 else (ii[k], ii[k + 1], rr[k + 1], rr[k]))
    part('Sleeve', 0, 'paper_white', sleeve, smooth=False)
    for s in (-1, 1):   # bun halves: half-capsules leaning out
        bun = part('Bun', 0, 'bun', lambda bm: lbl.rounded_box(bm, (0.165, 0.03, 0.034), 0.013, (6, 2, 2), 3), T(0, s * 0.0145, 0.022) @ Matrix.Rotation(math.radians(-s * 12), 4, 'X'))   # in the trough, the halves 3 mm into each other
    lat('Sausage', 'sausage', [(1e-4, -0.095), (0.008, -0.093), (0.0115, -0.085), (0.0125, -0.07), (0.0125, 0.07), (0.0115, 0.085), (0.008, 0.093), (1e-4, 0.095)], T(0, 0, 0.04) @ RY(90), seg=20)
    tube('Mustard', 'mustard', [(-0.07 + 0.01 * i, (0.0045 if i % 2 else -0.0045), 0.0518) for i in range(15)], 0.0026, 6)   # 0.7 mm into the sausage's top


def food_burger():
    R = 0.052
    lat('BunLow', 'bun', [(1e-4, 0.0), (R - 0.008, 0.0), (R, 0.006), (R + 0.001, 0.016), (R - 0.004, 0.02), (1e-4, 0.02)], seg=36)
    def patty(bm):
        lathe(bm, [(1e-4, 0.019), (R + 0.002, 0.019), (R + 0.004, 0.026), (R + 0.002, 0.034), (1e-4, 0.034)], 36)
        for v in bm.verts:
            rr = math.hypot(v.co.x, v.co.y)
            if rr > 0.03: k = 1 + 0.04 * noise.noise(Vector((v.co.x * 60, v.co.y * 60, 0.3))); v.co.x *= k; v.co.y *= k
    part('Patty', 0, 'patty', patty)
    def cheese(bm):   # a square slice (a thin rounded slab, evenly divided) with its corners bent down just over the patty's edge
        lbl.rounded_box(bm, (0.084, 0.084, 0.0025), 0.0011, (10, 10, 1), 2)
        for v in bm.verts:
            rr = math.hypot(v.co.x, v.co.y)
            if rr > R - 0.004: v.co.z -= min(0.005, (rr - R + 0.004) * 1.1)
    part('Cheese', 0, 'cheese_slice', cheese, T(0, 0, 0.0352) @ RZ(20))
    def lettuce(bm):   # a ruffled ring: the outer edge waves up and down, top and bottom together (no folds)
        lathe(bm, [(0.012, -0.0005), (R + 0.007, -0.002), (R + 0.007, 0.002), (0.012, 0.004)], 48)
        for v in bm.verts:
            a = math.atan2(v.co.y, v.co.x); rr = math.hypot(v.co.x, v.co.y)
            v.co.z += 0.004 * math.sin(a * 9) * max(0.0, min(1.0, (rr - R + 0.01) / 0.012))
    part('Lettuce', 0, 'lettuce', lettuce, T(0, 0, 0.0395))
    lat('Tomato', 'tomato', [(1e-4, 0.0405), (R - 0.006, 0.0405), (R - 0.006, 0.0465), (1e-4, 0.0465)], seg=32)
    lat('BunTop', 'bun', [(1e-4, 0.0455), (R + 0.001, 0.0455), (R + 0.003, 0.052), (R - 0.004, 0.066), (R * 0.6, 0.076), (1e-4, 0.08)], seg=40)
    prof = [(1e-4, 0.08), (R * 0.6, 0.076), (R - 0.004, 0.066), (R + 0.003, 0.052)]   # the crown's profile (as built above): seeds sit on it
    def crown(rr):
        for (r0, z0), (r1, z1) in zip(prof, prof[1:]):
            if rr <= r1: return z0 + (z1 - z0) * (rr - r0) / (r1 - r0)
        return prof[-1][1]
    for i in range(22):   # sesame seeds on the crown, 0.6 mm into it
        a = rnd.uniform(0, 2 * math.pi); rr = rnd.uniform(0.0, R - 0.014); z = crown(rr) - 0.0006
        blob('Seed', 'sesame', (0, 0, 0), 0.0028, sq=(1.0, 0.5, 0.35), lumpy=0.0, sub=1, M=T(rr * math.cos(a), rr * math.sin(a), z) @ RZ(math.degrees(a)))
    lat('Wrap', 'paper_white', [(R + 0.0025, -0.001), (R + 0.004, -0.001), (R + 0.0055, 0.034), (R + 0.004, 0.034), (R + 0.0025, 0.002)], seg=40)


def food_pizza():
    lat('Plate', 'paper_white', [(1e-4, 0.0), (0.082, 0.0), (0.09, 0.008), (0.087, 0.009), (0.079, 0.0025), (1e-4, 0.0025)], seg=48)
    def slice_(bm):
        a0, a1, R = math.radians(-30), math.radians(30), 0.125; n = 12
        top = [bm.verts.new((0.0, 0.0, 0.009))] + [bm.verts.new((R * math.cos(a0 + (a1 - a0) * i / n), R * math.sin(a0 + (a1 - a0) * i / n), 0.009)) for i in range(n + 1)]
        bot = [bm.verts.new((v.co.x, v.co.y, 0.0035)) for v in top]
        for i in range(1, n + 1): bm.faces.new((top[0], top[i], top[i + 1])); bm.faces.new((bot[0], bot[i + 1], bot[i]))
        ring = list(range(len(top))) + [0]
        for i in range(len(ring) - 1):
            a, b = ring[i], ring[i + 1]; bm.faces.new((bot[a], bot[b], top[b], top[a]))
    part('Slice', 0, 'pizza_cheese', slice_, T(-0.07, 0, 0))
    a0, a1, R = math.radians(-30), math.radians(30), 0.125
    tube('Crust', 'crust', [(-0.07 + R * math.cos(a0 + (a1 - a0) * i / 14), R * math.sin(a0 + (a1 - a0) * i / 14), 0.0095) for i in range(15)], 0.0095, 10)
    for (x, y) in ((-0.01, 0.0), (0.02, 0.02), (0.022, -0.022), (-0.03, -0.006), (0.04, 0.0), (0.0, 0.03)):
        lat('Pepperoni', 'pepperoni', [(1e-4, 0.0085), (0.009, 0.0085), (0.0095, 0.0105), (1e-4, 0.0108)], T(x, y, 0.0), seg=18)


def food_fries():
    W, D, H = 0.085, 0.045, 0.11
    def carton(bm):
        n = 12; V = []
        for i in range(n + 1):
            x = -W / 2 + W * i / n; top = H + 0.018 * (1 - (2 * i / n - 1) ** 2)   # the front's top dips in a curve
            V.append((x, top))
        def wall(y0, outward):
            vs = [(bm.verts.new((x * (0.8 if True else 1), y0 * 0.78, 0.0)), bm.verts.new((x, y0, t))) for (x, t) in V]
            for i in range(n): bm.faces.new((vs[i][0], vs[i + 1][0], vs[i + 1][1], vs[i][1]) if outward > 0 else (vs[i + 1][0], vs[i][0], vs[i][1], vs[i + 1][1]))
            return vs
        f = wall(D / 2, 1); b = wall(-D / 2, -1)
        for (s, i) in ((1, n), (-1, 0)):
            a0, a1, c1, c0 = f[i][0], f[i][1], b[i][1], b[i][0]
            bm.faces.new((a0, a1, c1, c0) if s < 0 else (c0, c1, a1, a0))
        bm.faces.new([b[i][0] for i in range(n + 1)] + [f[i][0] for i in range(n, -1, -1)])
        bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces)); bmesh.ops.solidify(bm, geom=list(bm.faces), thickness=-0.0015)   # card 1.5 mm thick (seen inside too)
    part('Carton', 0, 'paint_red', carton, smooth=False)
    for i in range(34):   # a full carton: fries standing up, fanned, the tallest 6 cm over the rim
        x, y = rnd.uniform(-0.026, 0.026), rnd.uniform(-0.012, 0.012); h = H + rnd.uniform(0.03, 0.06)   # each stands on the carton's floor (1 mm into it)
        bx('Fry', 'fry', (-0.004, -0.004, 0.0), (0.004, 0.004, h), r=0.0014, M=T(x, y, 0.0005) @ RY(x / 0.026 * 7 + rnd.uniform(-2, 2)) @ RX(y / 0.012 * 5) @ RZ(rnd.uniform(0, 90)))


def food_icecream():
    def cone(bm):
        lathe(bm, [(1e-4, 0.0), (0.004, 0.003), (0.03, 0.115), (0.033, 0.12), (0.03, 0.121), (0.027, 0.117), (1e-4, 0.117)], 32)
        for v in bm.verts:   # a cross-hatched waffle: little grooves on a diamond grid
            rr = math.hypot(v.co.x, v.co.y)
            if 0.008 < rr < 0.0295 and v.co.z < 0.114: a = math.atan2(v.co.y, v.co.x); g = math.sin(a * 10 + v.co.z * 160) * math.sin(a * 10 - v.co.z * 160); k = 1 - 0.035 * max(0.0, g); v.co.x *= k; v.co.y *= k
    part('Cone', 0, 'wafer', cone)
    blob('ScoopA', 'scoop_pink', (0, 0, 0.13), 0.034, sq=(1.0, 1.0, 0.85), lumpy=0.12, seed=3, sub=3)
    blob('ScoopB', 'scoop_vanilla', (0.006, -0.004, 0.172), 0.029, sq=(1.0, 1.0, 0.85), lumpy=0.12, seed=7, sub=3)
    bx('Wafer', 'wafer', (-0.004, -0.012, 0.0), (0.004, 0.012, 0.05), r=0.0015, M=T(-0.012, 0.01, 0.165) @ RY(-18))


def food_churros():
    lat('Cup', 'paper_white', [(1e-4, 0.0), (0.03, 0.0), (0.042, 0.085), (0.0405, 0.0855), (0.0285, 0.0015), (1e-4, 0.0015)], seg=32)
    lat('Band', 'cup_band', [(0.0345, 0.035), (0.0391, 0.035), (0.0402, 0.06), (0.0355, 0.06)], seg=32)
    star = [((0.0115 if k % 2 == 0 else 0.0082) * math.cos(math.pi * k / 6), (0.0115 if k % 2 == 0 else 0.0082) * math.sin(math.pi * k / 6)) for k in range(12)]
    for i, (dx, dy, tilt) in enumerate(((-0.013, 0.0, 9), (0.011, 0.011, 7), (0.007, -0.013, 10))):
        def churro(bm, dx=dx, dy=dy):
            L = 0.17; rings = []
            for j in range(13):
                z = L * j / 12; bend = 0.005 * math.sin(math.pi * j / 12)
                rings.append([bm.verts.new((px + bend, py, z)) for (px, py) in star])
            for j in range(12):
                for k in range(12): k2 = (k + 1) % 12; bm.faces.new((rings[j][k], rings[j][k2], rings[j + 1][k2], rings[j + 1][k]))
            bm.faces.new(list(reversed(rings[0]))); bm.faces.new(rings[-1])
        part('Churro', 0, 'sugar', churro, T(dx, dy, 0.008) @ RZ(i * 120) @ RY(tilt))


def food_choc():
    # the bar: 3 x 6 scored pieces on a base, the foil peeled back at the top, the sleeve over the rest
    for i in range(3):
        for j in range(1, 4):   # the pieces out of the sleeve, the first 5 mm clear of its end
            bx('Piece', 'chocolate', (-0.0115, -0.0115, 0.0), (0.0115, 0.0115, 0.006), r=0.0025, M=T(-0.025 + 0.025 * i, 0.062 + 0.025 * j, 0.008))
    bx('Slab', 'chocolate', (-0.036, 0.045, 0.002), (0.036, 0.157, 0.009))
    bx('Sleeve', 'sleeve_gold', (-0.039, -0.06, 0.0), (0.039, 0.07, 0.0175), r=0.002)
    def foil(bm):
        n = 8; V = [[bm.verts.new((-0.0385 + 0.077 * i / n, 0.07 + 0.03 * j / 4, 0.0135 + 0.012 * (j / 4) ** 2)) for j in range(5)] for i in range(n + 1)]
        for i in range(n):
            for j in range(4): bm.faces.new((V[i][j], V[i + 1][j], V[i + 1][j + 1], V[i][j + 1]))
        bmesh.ops.solidify(bm, geom=list(bm.faces), thickness=0.0006)
    part('Foil', 0, 'foil', foil)


def food_gummies():
    lat('Cup', 'paper_white', [(1e-4, 0.0), (0.033, 0.0), (0.043, 0.07), (0.0415, 0.0705), (0.0315, 0.0015), (1e-4, 0.0015)], seg=32)
    lat('Band', 'paint_red', [(0.0355, 0.025), (0.0402, 0.025), (0.0412, 0.05), (0.0365, 0.05)], seg=32)
    cols = ['gummy_red', 'gummy_green', 'gummy_yellow', 'gummy_orange', 'gummy_white']
    lat('Floor', 'paper_white', [(1e-4, 0.05), (0.0395, 0.05), (0.0397, 0.0525), (1e-4, 0.0525)], seg=32)   # a card insert the bears lie on (into the cup's wall)
    spots = [(0.0, 0.0, 0)] + [(0.013 * math.cos(math.pi * k / 3), 0.013 * math.sin(math.pi * k / 3), 0) for k in range(6)] + [(0.026 * math.cos(math.pi * k / 6 + 0.26), 0.026 * math.sin(math.pi * k / 6 + 0.26), 0) for k in range(12)]
    spots += [(0.0065 * math.cos(math.pi * k / 1.5), 0.0065 * math.sin(math.pi * k / 1.5), 1) for k in range(3)]
    for i, (x, y, layer) in enumerate(spots):   # packed 13 mm apart (each 12-14 mm across): neighbours touch; the top three on the first layer
        z = 0.059 + layer * 0.011
        m = cols[i % 5]; M = T(x, y, z) @ RZ(rnd.uniform(0, 360)) @ RY(rnd.uniform(-25, 25) + 90)
        blob('Bear', m, (0, 0, 0), 0.008, sq=(0.75, 0.55, 1.0), lumpy=0.08, seed=i, sub=2, M=M)
        blob('Head', m, (0, 0, 0.009), 0.0058, sq=(0.85, 0.65, 0.8), lumpy=0.05, seed=i + 40, sub=1, M=M)


def soda_cup(top_mat='plastic_lid', band='cup_band', straw='straw_red', R0=0.038, R1=0.052, H=0.17):
    lat('Cup', 'paper_white', [(1e-4, 0.0), (R0, 0.0), (R1, H), (R1 - 0.002, H + 0.0005), (R0 - 0.002, 0.0015), (1e-4, 0.0015)], seg=40)
    rr = lambda z: R0 + (R1 - R0) * z / H
    lat('Band', band, [(rr(0.05) - 0.001, 0.05), (rr(0.05) + 0.0024, 0.05), (rr(0.12) + 0.0024, 0.12), (rr(0.12) - 0.001, 0.12)], seg=40)
    lat('Gold', 'cup_gold', [(rr(0.046) - 0.001, 0.046), (rr(0.046) + 0.0028, 0.046), (rr(0.0495) + 0.0028, 0.0495), (rr(0.0495) - 0.001, 0.0495)], seg=40)   # under the band, not over it
    lat('Lid', top_mat, [(R1 - 0.004, H - 0.006), (R1 + 0.003, H - 0.006), (R1 + 0.004, H + 0.004), (R1 - 0.004, H + 0.008), (R1 * 0.7, H + 0.026), (0.012, H + 0.033), (0.0045, H + 0.034), (0.0045, H + 0.03), (R1 * 0.6, H + 0.022), (R1 - 0.008, H + 0.004), (R1 - 0.004, H - 0.004)], seg=40)
    # the straw: a red tube through the lid's cross, bent at the top
    tube('Straw', straw, [(0.0, 0.0, H - 0.05), (0.0, 0.0, H + 0.07), (0.004, 0.0, H + 0.085), (0.02, 0.0, H + 0.098)], 0.0035, 10)


def food_cup(): soda_cup()


def food_shake():
    soda_cup(top_mat='plastic_lid', band='shake_pink', straw='straw_red', R0=0.036, R1=0.047, H=0.15)
    # whipped cream under the dome: a swirl seen through the lid's top (the lid is open at its crown) and a cherry
    def swirl(bm):
        lathe(bm, [(1e-4, 0.15), (0.04, 0.152), (0.034, 0.166), (0.028, 0.168), (0.022, 0.178), (0.015, 0.18), (0.008, 0.19), (1e-4, 0.193)], 28)
        for v in bm.verts: a = math.atan2(v.co.y, v.co.x); v.co.z += 0.003 * math.sin(a * 6 + v.co.z * 120)
    part('Cream', 0, 'cream', swirl)
    blob('Cherry', 'cherry', (0.0, 0.0, 0.197), 0.008, lumpy=0.02, sub=2)


def food_slush():
    soda_cup(top_mat='plastic_lid', band='slush_blue', straw='slush_blue', R0=0.036, R1=0.05, H=0.16)


def food_coffee():
    R0, R1, H = 0.03, 0.043, 0.13
    lat('Cup', 'paper_white', [(1e-4, 0.0), (R0, 0.0), (R1, H), (R1 - 0.002, H + 0.0005), (R0 - 0.002, 0.0015), (1e-4, 0.0015)], seg=40)
    rr = lambda z: R0 + (R1 - R0) * z / H
    lat('Sleeve', 'kraft', [(rr(0.035) - 0.001, 0.035), (rr(0.035) + 0.0022, 0.035), (rr(0.095) + 0.0022, 0.095), (rr(0.095) - 0.001, 0.095)], seg=40)
    lat('Lid', 'paint_black', [(R1 - 0.003, H - 0.005), (R1 + 0.003, H - 0.005), (R1 + 0.004, H + 0.004), (R1 - 0.003, H + 0.008), (R1 - 0.006, H + 0.012), (1e-4, H + 0.012)], seg=40)
    bx('Sip', 'paint_black', (-0.006, R1 - 0.016, H + 0.0118), (0.006, R1 - 0.01, H + 0.0145), r=0.0012)


def food_chai():
    lat('Kulhad', 'terracotta', [(1e-4, 0.0), (0.022, 0.0), (0.026, 0.004), (0.036, 0.06), (0.037, 0.075), (0.0345, 0.0755), (0.0335, 0.061), (0.0235, 0.0055), (1e-4, 0.0055)], seg=32)
    lat('Chai', 'chai', [(1e-4, 0.064), (0.0338, 0.064), (0.034, 0.0665), (1e-4, 0.0668)], seg=32)


def food_water():
    lat('Bottle', 'bottle_blue', [(1e-4, 0.0), (0.03, 0.0), (0.033, 0.006), (0.033, 0.15), (0.029, 0.17), (0.013, 0.19), (0.0125, 0.198), (1e-4, 0.198)], seg=36)
    lat('Label', 'label', [(0.032, 0.05), (0.0355, 0.05), (0.0355, 0.11), (0.032, 0.11)], seg=36)
    lat('Cap', 'cap_blue', [(1e-4, 0.196), (0.014, 0.196), (0.0145, 0.212), (0.0135, 0.215), (1e-4, 0.215)], seg=24)


BUILD = {k: v for k, v in globals().items() if k.startswith('food_') and callable(v)}


def reset():
    for o in list(bpy.data.objects): bpy.data.objects.remove(o)
    for m in list(bpy.data.meshes): bpy.data.meshes.remove(m)
    PARTS.clear()


def icon(name, out):
    """a 256 px picture of the item for the menus: Eevee, a soft key and rim on a transparent ground, three quarters from above"""
    sc = bpy.context.scene; sc.render.engine = 'BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items] else 'BLENDER_EEVEE'
    sc.render.resolution_x = sc.render.resolution_y = 256; sc.render.film_transparent = True; sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
    lo = Vector((min(v.co[i] + o.location[i] for o in PARTS for v in o.data.vertices) for i in range(3))); hi = Vector((max(v.co[i] + o.location[i] for o in PARTS for v in o.data.vertices) for i in range(3)))
    c = (lo + hi) / 2; r = (hi - lo).length / 2
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam; cam.data.lens = 70
    d = r / math.tan(cam.data.angle / 2) * 1.08; dirv = Vector((1.0, -0.55, 0.62)).normalized(); cam.location = c + dirv * d
    cam.rotation_euler = (c - cam.location).to_track_quat('-Z', 'Y').to_euler()
    for (loc, e, col) in (((2, -2, 3), 3.0, (1, 0.95, 0.88)), ((-2, 2, 1.5), 1.5, (0.75, 0.82, 1.0)), ((0, 3, 2), 2.0, (1, 0.85, 0.7))):
        L = bpy.data.objects.new('L', bpy.data.lights.new('L', 'SUN')); L.data.energy = e; L.data.color = col; sc.collection.objects.link(L); L.rotation_euler = (c - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs[0].default_value = (0.2, 0.19, 0.18, 1); w.node_tree.nodes['Background'].inputs[1].default_value = 0.6
    sc.render.filepath = os.path.join(out, name + '.png'); bpy.ops.render.render(write_still=True)


# menu variants drawn from a model with other colours (www/js/menu.js: the item's picture is its own id)
VARIANTS = {'food_popcorn': {'caramel': {'popcorn': (0.45, 0.22, 0.06)}, 'cheese': {'popcorn': (0.85, 0.52, 0.05)}, 'truffle': {'popcorn': (0.75, 0.66, 0.42)}},
            'food_cup': {'lemonade': {'cup_band': (0.85, 0.65, 0.03)}, 'icedtea': {'cup_band': (0.3, 0.14, 0.05)}},
            'food_coffee': {'hotchoc': {'kraft': (0.12, 0.05, 0.02)}}}


def variant_icons(name, out):
    for vid, sw in VARIANTS.get(name, {}).items():
        keep = {}
        for mat, col in sw.items():
            m = bpy.data.materials.get(mat)
            if m: b = m.node_tree.nodes['Principled BSDF']; keep[mat] = tuple(b.inputs['Base Color'].default_value); b.inputs['Base Color'].default_value = (*col, 1)
        sc = bpy.context.scene; sc.render.filepath = os.path.join(out, 'food_' + vid + '.png'); bpy.ops.render.render(write_still=True)
        for mat, col in keep.items(): bpy.data.materials[mat].node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = col


bpy.ops.wm.read_factory_settings(use_empty=True)
os.makedirs(A.out, exist_ok=True)
report = []
for name, fn in BUILD.items():
    if A.only and name not in A.only.split(','): continue
    reset(); fn(); report.append(lbl.export(name, A.out))
    if A.icons: os.makedirs(A.icons, exist_ok=True); icon(name, A.icons); variant_icons(name, A.icons)
for r in report: print('FOOD14', r['asset'], r['tris'][0], 'tris', r['parts'], 'parts', r['bytes'] // 1024, 'KB', [[round(v, 3) for v in c] for c in r['bbox_blender']])
