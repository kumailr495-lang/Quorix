"""LUMIERE v12 lobby decor (the user: "make the theatre inside full with decorations, and make sense"). Pieces that tell a cinema's
story, each with a place it belongs (world9.js DRESS):
  projector_vintage  a 1950s 35 mm projector on a lacquered plinth (its caption is an engine panel): the film-heritage exhibit
  reel_wall          four film reels on a walnut plate, wall-mounted (its back at x = 0): behind the exhibit
  directors_chair    oak frame, black canvas: two at the photo spot
  ring_light         a tripod ring light: the photo spot's light
  merch_shelf        an open walnut shelf of collectible popcorn buckets and cups: beside the candy wall
  backdrop_stand     two black posts on foot plates and a top bar: they hold the photo wall's picture (an engine panel)
All original designs, LOD0 only (they are small or seen from inside the lobby: world9.js draws them in the lobby's deep mesh).

    blender --background --factory-startup --python tools/blender/decor12.py -- --out www/models [--only NAME]
    then: blender ... --python tools/blender/glb_check.py -- www/models/<name>.glb

Frame: +X the front (the engine's +Z at yaw 0), +Z up, floor at Z = 0 (reel_wall: its back on the wall at X = 0). Parts embed 1-3 cm
into what they stand on or join, and no two faces of different parts lie in one plane."""
import bpy, bmesh, math, sys, os, argparse, json, random
from mathutils import Vector, Matrix
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lbl
from lbl import T, RY, RZ, lathe, rb, part, material, PARTS

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ap = argparse.ArgumentParser(); ap.add_argument('--out', default='www/models'); ap.add_argument('--only', default='')
A = ap.parse_args(argv)
for k, v in {'enamel_green': ((0.035, 0.07, 0.05), 0.35, 0.0), 'canvas_black': ((0.012, 0.012, 0.013), 0.85, 0.0), 'oak': ((0.36, 0.22, 0.11), 0.5, 0.0),
             'paint_red': ((0.32, 0.02, 0.025), 0.4, 0.0), 'steel': ((0.55, 0.56, 0.58), 0.35, 1.0), 'gloss_black': ((0.006, 0.006, 0.007), 0.12, 0.0),
             'bark': ((0.07, 0.05, 0.035), 0.9, 0.0), 'leaves': ((0.03, 0.07, 0.025), 0.8, 0.0), 'soil': ((0.03, 0.025, 0.02), 1.0, 0.0),
             'bark_olive': ((0.12, 0.10, 0.08), 0.9, 0.0), 'leaves_olive': ((0.10, 0.13, 0.08), 0.8, 0.0), 'travertine_dark': ((0.30, 0.26, 0.21), 0.4, 0.0)}.items():
    lbl.MAT_DEF.setdefault(k, v)
RX = lambda deg: Matrix.Rotation(math.radians(deg), 4, 'X')


def bar(a, b, w, d, mat, name, r=0.006):
    """a straight square-section bar from point a to point b (w across, d deep), as a rounded box turned onto the line"""
    a, b = Vector(a), Vector(b); L = (b - a).length; m = (a + b) / 2; z = (b - a).normalized()
    x = Vector((0, 1, 0)).cross(z) if abs(z.y) < 0.9 else Vector((1, 0, 0)).cross(z); x.normalize(); y = z.cross(x)
    M = Matrix.Identity(4)
    for i in range(3): M[i][0], M[i][1], M[i][2], M[i][3] = x[i], y[i], z[i], m[i]
    part(name, 0, mat, rb((w, d, L), r), M)


def reel(name, c, R, axis, mat='steel', seg=24, gap=0.06, back=0.0):
    """a film reel: two flanges (an 18 mm rim, six 4 mm spokes set in its middle: 7 mm between their faces and the rim's, so the depth
    buffer never merges them, even seen from the street) either side of the film pack, on a hub 6 mm proud of both; axis 'x' (on a wall)
    or 'y' (on a projector); back: how much further the hub runs out of the back flange (into a wall plate)"""
    t = 0.018
    M = T(*c) @ (RY(90) if axis == 'x' else RX(-90))   # lathe +Z -> the reel's axis
    for s in (-1, 1):
        lo, hi = (gap / 2, gap / 2 + t) if s > 0 else (-gap / 2 - t, -gap / 2)
        part(name + 'Rim', 0, mat, lambda bm, lo=lo, hi=hi: (lathe(bm, [(R - 0.016, lo), (R, lo), (R, hi), (R - 0.016, hi)], seg), bm.transform(M)))
        for k in range(6):
            a = 2 * math.pi * k / 6
            part(name + 'Spoke', 0, mat, rb((R - 0.05, 0.022, 0.004), 0.0015), M @ RZ(math.degrees(a)) @ T((R - 0.05) / 2 + 0.036, 0, (lo + hi) / 2))
    part(name + 'Hub', 0, mat, lambda bm: (lathe(bm, [(1e-4, -gap / 2 - t - 0.006 - back), (0.045, -gap / 2 - t - 0.006 - back), (0.045, gap / 2 + t + 0.006), (1e-4, gap / 2 + t + 0.006)], 16), bm.transform(M)))
    part(name + 'Film', 0, 'plastic_black', lambda bm: (lathe(bm, [(0.04, -gap / 2 + 0.002), (R * 0.72, -gap / 2 + 0.002), (R * 0.72, gap / 2 - 0.002), (0.04, gap / 2 - 0.002)], seg), bm.transform(M)))


def projector_vintage():
    part('Plinth', 0, 'lacquer_black', rb((1.0, 1.0, 0.86), 0.02), T(0, 0, 0.43))
    part('PlinthTop', 0, 'brass', rb((1.03, 1.03, 0.04), 0.008), T(0, 0, 0.86))                                  # 2 cm down into the plinth
    # the caption on the plinth's front is an engine panel in a brass frame (world9.js FRAMED 'plaque_proj'): 3D lettering this small
    # left font T-junctions and an overlapping face
    part('Column', 0, 'charcoal', lambda bm: lathe(bm, [(1e-4, 0.865), (0.15, 0.865), (0.15, 0.905), (0.065, 0.93), (0.06, 1.28), (0.10, 1.30), (0.10, 1.33), (1e-4, 1.33)], 24))
    part('Head', 0, 'enamel_green', rb((0.30, 0.22, 0.32), 0.022), T(0.02, 0, 1.47))                             # 2 cm into the column's top
    part('LampHouse', 0, 'enamel_green', rb((0.27, 0.20, 0.27), 0.03), T(-0.24, 0, 1.47))                        # 1.5 cm into the head's back
    part('Chimney', 0, 'charcoal', lambda bm: (lathe(bm, [(1e-4, 1.585), (0.045, 1.585), (0.045, 1.70), (0.06, 1.71), (0.06, 1.74), (1e-4, 1.74)], 16), bm.transform(T(-0.24, 0, 0))))
    part('Lens', 0, 'chrome', lambda bm: (lathe(bm, [(1e-4, 0.0), (0.05, 0.0), (0.05, 0.17), (0.042, 0.19), (1e-4, 0.19)], 20), bm.transform(T(0.15, 0, 1.46) @ RY(90))))   # 2 cm into the head
    part('LensRing', 0, 'brass', lambda bm: (lathe(bm, [(0.040, 0.15), (0.058, 0.15), (0.058, 0.172), (0.040, 0.172)], 20), bm.transform(T(0.15, 0, 1.46) @ RY(90))))
    part('Knob', 0, 'brass', lambda bm: (lathe(bm, [(1e-4, 0.0), (0.03, 0.0), (0.03, 0.03), (1e-4, 0.03)], 12), bm.transform(T(0.02, -0.10, 1.45) @ RX(90))))   # on the head's side, 1 cm in
    # the reels: the feed reel up front on an arm, the take-up reel low behind; the arms run from inside the head into each hub
    part('ArmUp', 0, 'charcoal', lambda bm: lbl.tube(bm, [(0.06, 0, 1.58), (0.12, 0, 1.80), (0.16, 0, 2.03)], 0.016, 8, closed=False) or _caps(bm))
    part('ArmDown', 0, 'charcoal', lambda bm: lbl.tube(bm, [(-0.30, 0, 1.40), (-0.42, 0, 1.25), (-0.50, 0, 1.12)], 0.016, 8, closed=False) or _caps(bm))
    reel('Feed', (0.16, 0, 2.03), 0.30, 'y')
    reel('Take', (-0.50, 0, 1.12), 0.20, 'y')   # clear of the lamp house (3.5 cm) and of the plinth (4 cm)


def _caps(bm):
    """close a tube's two open ends (lbl.tube leaves them open)"""
    edges = [e for e in bm.edges if e.is_boundary]
    if edges: bmesh.ops.holes_fill(bm, edges=edges, sides=0)


def reel_wall():
    part('Plate', 0, 'walnut', rb((0.03, 1.8, 1.1), 0.01), T(0.015, 0, 1.55))
    part('Rail', 0, 'brass', rb((0.012, 1.84, 0.03), 0.004), T(0.030, 0, 0.995))                                   # under the plate, 1 cm into it, 6 mm proud of its face
    for i, (y, z, R) in enumerate(((-0.52, 1.66, 0.30), (0.12, 1.78, 0.22), (0.52, 1.40, 0.18), (-0.02, 1.30, 0.16))):
        # on a spindle: the back flange 12 mm off the plate, the hub 1 cm into it
        reel(f'Reel{i}', (0.03 + 0.012 + 0.018 + 0.025, y, z), R, 'x', 'steel' if i % 2 == 0 else 'brass', seg=24, gap=0.05, back=0.016)


def directors_chair():
    # bar(a, b, w, d): along X, w is the height and d the width; the legs are 32 mm square, and every bar that meets a leg is at least
    # 12 mm narrower or 18 mm wider, so no side of one lies within 5 mm of the leg's side (zcheck: the depth buffer merges closer layers)
    W, D = 0.56, 0.46
    for s in (-1, 1):
        y = s * W / 2
        bar((D / 2, y, 0.0), (D / 2, y, 0.662), 0.032, 0.032, 'oak', 'LegF')                                # front legs up into the arms
        bar((-D / 2, y, 0.0), (-D / 2, y, 0.92), 0.032, 0.032, 'oak', 'LegB')                               # back legs up to the back's top
        bar((-D / 2 - 0.025, y, 0.66), (D / 2 + 0.03, y, 0.66), 0.024, 0.05, 'oak', 'Arm')                  # the arm: a flat board over both legs
        bar((-D / 2, y, 0.42), (D / 2, y, 0.42), 0.024, 0.020, 'oak', 'SeatRail')                           # the seat's rail between the legs
        bar((-D / 2, y, 0.12), (D / 2, y, 0.12), 0.02, 0.020, 'oak', 'Stretcher')
    for x in (D / 2, -D / 2):   # the X under the seat, front and back: two crossing 12 mm bars, 8 mm apart, both within the legs' depth
        o = 0.004 if x > 0 else -0.004
        bar((x - o, -W / 2, 0.05), (x - o, W / 2, 0.40), 0.012, 0.016, 'oak', 'Cross')
        bar((x + o, W / 2, 0.05), (x + o, -W / 2, 0.40), 0.012, 0.016, 'oak', 'Cross')
    part('Seat', 0, 'canvas_black', rb((D - 0.02, W, 0.012), 0.004), T(0, 0, 0.436))                         # its edges 1 cm into the rails
    part('Back', 0, 'canvas_black', rb((0.012, W + 0.012, 0.20), 0.004), T(-D / 2, 0, 0.80))                 # between the back legs' tops


def ring_light():
    for k in range(3):   # the tripod: three legs from the floor into a hub at 0.62 m
        a = 2 * math.pi * k / 3 + math.pi / 6
        bar((0.34 * math.cos(a), 0.34 * math.sin(a), 0.0), (0.03 * math.cos(a), 0.03 * math.sin(a), 0.64), 0.016, 0.016, 'blackmetal', 'Leg')
        part('Foot', 0, 'rubber', rb((0.05, 0.05, 0.02), 0.005), T(0.335 * math.cos(a), 0.335 * math.sin(a), 0.01))
    part('Hub', 0, 'blackmetal', lambda bm: lathe(bm, [(1e-4, 0.56), (0.045, 0.56), (0.045, 0.68), (1e-4, 0.68)], 12))
    part('Pole', 0, 'blackmetal', lambda bm: lathe(bm, [(1e-4, 0.66), (0.014, 0.66), (0.014, 1.40), (1e-4, 1.40)], 10))
    # the ring (lit) faces the front; a bracket from the pole's top runs up into its lowest point
    M = T(0.04, 0, 1.64) @ RY(90)
    part('Ring', 0, 'glow_white', lambda bm: (lathe(bm, [(0.17, -0.015), (0.23, -0.015), (0.23, 0.015), (0.17, 0.015)], 40), bm.transform(M)))
    part('RingBack', 0, 'blackmetal', lambda bm: (lathe(bm, [(0.162, -0.035), (0.238, -0.035), (0.238, -0.012), (0.162, -0.012)], 40), bm.transform(M)))   # 3 mm into the ring, 8 mm wider each side
    bar((0.0, 0, 1.37), (0.025, 0, 1.44), 0.02, 0.014, 'blackmetal', 'Bracket')   # from inside the pole's top into the ring's back (6 mm narrower than the pole)


def merch_shelf():
    W, D, H = 1.4, 0.42, 1.8
    for s in (-1, 1): part('Side', 0, 'walnut', rb((D, 0.03, H), 0.005), T(0, s * (W / 2 - 0.015), H / 2))
    part('Back', 0, 'walnut_dark', rb((0.02, W - 0.02, H - 0.02), 0.004), T(-D / 2 + 0.02, 0, H / 2))        # between the sides, 1 cm into each, 1 cm in from their backs
    shelves = (0.06, 0.62, 1.16, 1.72)
    for z in shelves: part('Shelf', 0, 'walnut', rb((D - 0.03, W - 0.04, 0.03), 0.004), T(0.005, 0, z))      # 1 cm into the sides and the back, 1 cm behind their fronts
    part('Toe', 0, 'lacquer_black', rb((D - 0.04, W - 0.05, 0.05), 0.004), T(0, 0, 0.025))                    # under the bottom shelf
    for z in shelves[:3]:   # on each shelf: buckets and cups, 3 mm into it
        for i in range(4):
            y = -W / 2 + 0.2 + i * (W - 0.4) / 3
            if (i + int(z * 10)) % 2 == 0:
                part('Bucket', 0, 'paint_red', lambda bm: lathe(bm, [(1e-4, 0.0), (0.075, 0.0), (0.105, 0.24), (0.095, 0.24), (0.068, 0.012), (1e-4, 0.012)], 20), T(0.02, y, z + 0.012))
                part('BucketBand', 0, 'paint_cream', lambda bm: lathe(bm, [(0.098, 0.20), (0.111, 0.20), (0.111, 0.232), (0.098, 0.232)], 20), T(0.02, y, z + 0.012))
            else:
                part('Cup', 0, 'gloss_black', lambda bm: lathe(bm, [(1e-4, 0.0), (0.045, 0.0), (0.055, 0.17), (1e-4, 0.17)], 16), T(0.02, y, z + 0.012))
                part('Lid', 0, 'brass', lambda bm: lathe(bm, [(1e-4, 0.162), (0.058, 0.162), (0.058, 0.18), (0.02, 0.19), (1e-4, 0.19)], 16), T(0.02, y, z + 0.012))


def backdrop_stand():
    W, H = 3.2, 2.5
    for s in (-1, 1):
        part('Foot', 0, 'blackmetal', rb((0.55, 0.32, 0.03), 0.006), T(0, s * W / 2, 0.015))
        part('Post', 0, 'blackmetal', rb((0.06, 0.06, H), 0.008), T(0, s * W / 2, H / 2 + 0.02))              # 1 cm into the foot
    part('Top', 0, 'blackmetal', rb((0.04, W + 0.04, 0.05), 0.006), T(0, 0, H + 0.005))                       # over both posts' tops, 1 cm inside their faces


def _taper(bm, pts, r0, r1, sides=10):
    """a closed, tapering tube along a polyline (a trunk or a branch): radius r0 at the first point to r1 at the last, both ends capped"""
    n = len(pts); rings = []
    for i, p in enumerate(pts):
        a = pts[max(0, i - 1)]; b = pts[min(n - 1, i + 1)]; t = (Vector(b) - Vector(a)).normalized()
        up = Vector((0, 0, 1)) if abs(t.z) < 0.9 else Vector((1, 0, 0)); x = t.cross(up).normalized(); y = t.cross(x).normalized(); r = r0 + (r1 - r0) * i / (n - 1)
        rings.append([bm.verts.new(Vector(p) + (x * math.cos(2 * math.pi * k / sides) + y * math.sin(2 * math.pi * k / sides)) * r) for k in range(sides)])
    for i in range(n - 1):
        for k in range(sides): k2 = (k + 1) % sides; bm.faces.new((rings[i][k], rings[i][k2], rings[i + 1][k2], rings[i + 1][k]))
    bm.faces.new(list(reversed(rings[0]))); bm.faces.new(rings[-1])


def _clump(c, r, seed, sub=3):
    """a clump of leaves: an icosphere squashed a little and lumped by smooth noise (closed, so it can be one part)"""
    from mathutils import noise
    def build(bm):
        bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=r)   # sub 3: 320 faces
        off = Vector((seed * 3.1, seed * 1.7, seed * 2.3))
        for v in bm.verts:
            n = v.co.normalized(); k = 1.0 + 0.22 * noise.noise(v.co * 1.6 + off) + 0.08 * noise.noise(v.co * 4.2 + off)
            v.co = Vector((n.x * r * k, n.y * r * k, n.z * r * k * 0.82)) + Vector(c)
    return build


def _crown(ends, per, reach, rad, seed, mat, up=0.55):
    """an airy crown: from each limb's end, twigs out to small leaf clumps (each twig starts 3 cm inside the limb's end and ends 4 cm
    inside its clump; a clump also sits on every limb end), so the crown has gaps and an uneven edge instead of a few big balls"""
    rnd = random.Random(seed)
    for i, e in enumerate(ends):
        e = Vector(e); part('Leaves', 0, mat, _clump(tuple(e), rad[1], seed + i * 17, 2))
        for j in range(per):
            a = rnd.uniform(0, 2 * math.pi); u = rnd.uniform(0.15, 1.0) * up
            d = Vector((math.cos(a), math.sin(a), u)).normalized() * rnd.uniform(*reach); q = e + d; r = rnd.uniform(*rad)
            part('Twig', 0, 'bark' if mat == 'leaves' else 'bark_olive', lambda bm, a_=tuple(e - d.normalized() * 0.03), b_=tuple(q - d.normalized() * (r - 0.04)): _taper(bm, [a_, b_], 0.022, 0.012, 5))
            part('Leaves', 0, mat, _clump(tuple(q), r, seed + i * 17 + j + 1, 2))


def street_tree():
    """a street tree in its pavement pit (v12, the user: trees on the street): a cast-iron grate (its top 8 mm over the paving, 2 cm into
    it), a leaning trunk, four limbs and a crown of leaf clumps. Every clump holds a limb's end or overlaps a neighbour (nothing floats)"""
    # levels (tops): the paving 0, the soil 6 mm, the bars 12 mm, the frame and the ring 18 mm (no two tops within 5 mm)
    for (x0, y0, x1, y1) in ((-0.6, -0.6, 0.6, -0.5), (-0.6, 0.5, 0.6, 0.6), (-0.6, -0.5, -0.5, 0.5), (0.5, -0.5, 0.6, 0.5)):
        part('GrateFrame', 0, 'blackmetal', rb((x1 - x0, y1 - y0, 0.038), 0.003, (1, 1, 1), 1), T((x0 + x1) / 2, (y0 + y1) / 2, -0.001))
    part('GrateRing', 0, 'blackmetal', lambda bm: lathe(bm, [(0.24, -0.02), (0.31, -0.02), (0.31, 0.018), (0.24, 0.018)], 24))
    for k in range(8):   # the radial bars, from inside the ring into the frame (1 cm into both)
        a = math.radians(22.5 + 45 * k); L = (0.52 / max(abs(math.cos(a)), abs(math.sin(a)))) - 0.29
        part('GrateBar', 0, 'blackmetal', rb((L, 0.03, 0.028), 0.003, (1, 1, 1), 1), T(math.cos(a) * (0.30 + L / 2), math.sin(a) * (0.30 + L / 2), -0.002) @ RZ(math.degrees(a)))
    part('Soil', 0, 'soil', lambda bm: lathe(bm, [(1e-4, -0.014), (0.25, -0.014), (0.25, 0.006), (1e-4, 0.006)], 24))   # into the ring and round the trunk
    trunk = [(0, 0, -0.02), (0.04, 0.0, 1.1), (0.02, 0.03, 2.2), (-0.03, 0.02, 3.0)]
    part('Trunk', 0, 'bark', lambda bm: _taper(bm, trunk, 0.15, 0.10, 12))
    limbs = [(math.radians(a), z0, rr, zt) for a, z0, rr, zt in ((25, 2.3, 1.25, 4.3), (115, 2.6, 1.1, 4.7), (205, 2.45, 1.2, 4.4), (295, 2.75, 1.0, 4.9))]
    ends = []
    for i, (a, z0, rr, zt) in enumerate(limbs):   # each limb starts 5 cm inside the trunk and bends up and out
        p0 = (math.cos(a) * 0.04, math.sin(a) * 0.04, z0); pm = (math.cos(a) * rr * 0.55, math.sin(a) * rr * 0.55, (z0 + zt) / 2 + 0.25); p1 = (math.cos(a) * rr, math.sin(a) * rr, zt)
        part('Limb', 0, 'bark', lambda bm, q=(p0, pm, p1): _taper(bm, list(q), 0.075, 0.04, 8)); ends.append(p1)
    _crown(ends + [(0.0, 0.0, 3.0)], 6, (0.55, 1.05), (0.42, 0.62), 40, 'leaves', up=0.9)


def olive_tree():
    """an old olive tree in a stone planter (v12, the user: "trees inside like a medieval tree"): three stems twisting round each other
    out of the soil, a knotted trunk where they meet, five limbs and a silver-green crown. The planter is a turned travertine bowl on a
    foot; the stems start 6 cm under the soil, the limbs inside the trunk, every clump holds a limb's end or overlaps a neighbour"""
    part('PlanterFoot', 0, 'travertine_dark', lambda bm: lathe(bm, [(1e-4, 0.0), (0.46, 0.0), (0.46, 0.08), (0.40, 0.12), (1e-4, 0.12)], 40))
    part('Planter', 0, 'travertine_dark', lambda bm: lathe(bm, [(1e-4, 0.10), (0.42, 0.10), (0.66, 0.42), (0.74, 0.62), (0.76, 0.70), (0.68, 0.70), (0.66, 0.66), (1e-4, 0.66)], 48))   # its floor 2 cm into the foot
    part('Soil', 0, 'soil', lambda bm: lathe(bm, [(1e-4, 0.62), (0.665, 0.62), (0.66, 0.672), (1e-4, 0.672)], 40))   # 6 mm over the bowl's inner floor, into its wall
    for k in range(3):   # the stems: helices round the axis, from under the soil up into the trunk's knot
        a0 = 2 * math.pi * k / 3
        pts = [(0.16 * math.cos(a0 + t * 2.4), 0.16 * math.sin(a0 + t * 2.4), 0.60 + t * 1.1) for t in [i / 6 for i in range(7)]]
        part('Stem', 0, 'bark_olive', lambda bm, q=pts: _taper(bm, q, 0.11, 0.08, 10))
    part('Knot', 0, 'bark_olive', _clump((0.0, 0.0, 1.72), 0.24, 3, 2))   # where the stems meet: a lumpy burl
    ends = []
    for i, (a, rr, zt) in enumerate(((10, 1.0, 2.75), (82, 0.85, 3.05), (154, 1.05, 2.8), (226, 0.9, 3.1), (298, 1.0, 2.9))):
        a = math.radians(a); p0 = (math.cos(a) * 0.05, math.sin(a) * 0.05, 1.70); pm = (math.cos(a) * rr * 0.5, math.sin(a) * rr * 0.5, (1.7 + zt) / 2 + 0.15); p1 = (math.cos(a) * rr, math.sin(a) * rr, zt)
        part('Limb', 0, 'bark_olive', lambda bm, q=(p0, pm, p1): _taper(bm, list(q), 0.06, 0.03, 8)); ends.append(p1)
    _crown(ends, 6, (0.35, 0.7), (0.26, 0.4), 70, 'leaves_olive', up=0.6)


BUILD = {'projector_vintage': projector_vintage, 'street_tree': street_tree, 'olive_tree': olive_tree, 'reel_wall': reel_wall, 'directors_chair': directors_chair, 'ring_light': ring_light, 'merch_shelf': merch_shelf, 'backdrop_stand': backdrop_stand}


def reset():
    for o in list(bpy.data.objects): bpy.data.objects.remove(o)
    for m in list(bpy.data.meshes): bpy.data.meshes.remove(m)
    PARTS.clear()


bpy.ops.wm.read_factory_settings(use_empty=True)
os.makedirs(A.out, exist_ok=True); report = []
for name, fn in BUILD.items():
    if A.only and name not in A.only.split(','): continue
    reset(); fn(); report.append(lbl.export(name, A.out))
print(json.dumps([{k: r[k] for k in ('asset', 'tris', 'parts', 'bytes')} for r in report], indent=1))
