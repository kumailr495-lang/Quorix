"""LUMIERE v12 - street furniture and rooftop clutter (the user, 2026-11-19: "the outside ... the road being so empty"). Original designs:
  bench_street   a park bench: two cast-iron end frames, oak slats on the seat and the back (1.8 m)
  bin_street     a round black steel litter bin with a brass band and a domed lid
  hydrant        a red pillar fire hydrant: flange, barrel, bonnet, two side outlets and a front outlet with caps
  parking_meter  a post with a meter head, its small screen lit
  bike_stand     two steel hoop stands with a bicycle at each (on its kickstand)
  roof_tank      a rooftop water tank on a steel frame, a ladder up its side (on the far buildings' roofs)
  roof_ac        a rooftop condenser unit on rails with a fan grille, and a vent stack beside it
All LOD0 only: small, seen from the street (world9.js DRESS places them; none collides but the bench, the bin and the hydrant).

    blender --background --factory-startup --python tools/blender/street_props12.py -- --out www/models [--only NAME]
    then: blender ... --python tools/blender/glb_check.py -- www/models/<name>.glb

Frame: +X the front (the engine's +Z at yaw 0), +Z up, the ground at Z = 0. Parts embed 2 mm or more into what they stand on or join; the
end frames' members differ in thickness by 5 mm or more, so no two of their faces lie in one plane."""
import bpy, bmesh, math, sys, os, argparse, json
from mathutils import Vector, Matrix
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lbl
from lbl import T, RY, RZ, lathe, rb, part, PARTS

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ap = argparse.ArgumentParser(); ap.add_argument('--out', default='www/models'); ap.add_argument('--only', default='')
A = ap.parse_args(argv)
for k, v in {'oak': ((0.36, 0.22, 0.11), 0.5, 0.0), 'paint_red': ((0.32, 0.02, 0.025), 0.4, 0.0), 'steel': ((0.55, 0.56, 0.58), 0.35, 1.0),
             'galvanized': ((0.42, 0.43, 0.44), 0.55, 1.0), 'enamel_green': ((0.035, 0.07, 0.05), 0.35, 0.0), 'paint_cream': ((0.8, 0.74, 0.63), 0.75, 0.0),
             'paint_grey': ((0.16, 0.16, 0.17), 0.6, 0.0)}.items():
    lbl.MAT_DEF.setdefault(k, v)
RX = lambda deg: Matrix.Rotation(math.radians(deg), 4, 'X')


def box(x0, y0, z0, x1, y1, z1):
    def build(bm):
        r = bmesh.ops.create_cube(bm, size=1.0)
        for v in r['verts']: v.co = Vector((x0 + (v.co.x + 0.5) * (x1 - x0), y0 + (v.co.y + 0.5) * (y1 - y0), z0 + (v.co.z + 0.5) * (z1 - z0)))
    return build


def ctube(pts, radius, sides=8):
    """a round tube along an open polyline, capped at both ends (a closed solid)"""
    def build(bm):
        n = len(pts); rings = []
        for i, p in enumerate(pts):
            a, b = pts[max(0, i - 1)], pts[min(n - 1, i + 1)]
            t = (Vector(b) - Vector(a)).normalized(); up = Vector((0, 0, 1)) if abs(t.z) < 0.9 else Vector((1, 0, 0))
            x = t.cross(up).normalized(); y = t.cross(x).normalized()
            rings.append([bm.verts.new(Vector(p) + (x * math.cos(2 * math.pi * k / sides) + y * math.sin(2 * math.pi * k / sides)) * radius) for k in range(sides)])
        for i in range(n - 1):
            a, b = rings[i], rings[i + 1]
            for k in range(sides): k2 = (k + 1) % sides; bm.faces.new((a[k], a[k2], b[k2], b[k]))
        bm.faces.new(list(reversed(rings[0]))); bm.faces.new(rings[-1])
    return build


def ring(r0, r1, z0, z1):
    return [(r0, z0), (r1, z0), (r1, z1), (r0, z1)]


def cyl(r, z0, z1, seg=16):
    return lambda bm: lathe(bm, [(1e-4, z0), (r, z0), (r, z1), (1e-4, z1)], seg)


def bar(a, b, w, d):
    """a rectangular bar from a to b (3D points) w wide (across, in the XY plane) and d deep (in Z when horizontal)"""
    a, b = Vector(a), Vector(b); L = (b - a).length; c = (a + b) / 2; t = (b - a).normalized()
    M = Matrix.Translation(c) @ t.to_track_quat('X', 'Z').to_matrix().to_4x4()
    def build(bm):
        box(-L / 2, -w / 2, -d / 2, L / 2, w / 2, d / 2)(bm); bm.transform(M)
    return build


# ---------------------------------------------------------------- the models
def bench_street():
    """seat 0.45 m high, 0.5 m deep; the back leans 15 degrees; the ends at y +-0.84 (slats run 6 cm past them)"""
    for y in (-0.84, 0.84):
        part('LegFront', 0, 'blackmetal', box(0.18, y - 0.025, -0.02, 0.24, y + 0.025, 0.40))            # 50 mm thick, under the rail
        part('LegRear', 0, 'blackmetal', bar((-0.22, y, -0.02), (-0.16, y, 0.40), 0.05, 0.06))
        part('Rail', 0, 'blackmetal', box(-0.26, y - 0.02, 0.36, 0.27, y + 0.02, 0.42))                   # 40 mm: the seat rail
        part('Post', 0, 'blackmetal', bar((-0.19, y, 0.38), (-0.33, y, 0.92), 0.03, 0.06))               # the back post (30 mm), into the rail
        part('ArmPost', 0, 'blackmetal', box(0.20, y - 0.015, 0.40, 0.235, y + 0.015, 0.65))             # 30 mm, from the rail to the arm
        part('Arm', 0, 'blackmetal', box(-0.24, y - 0.03, 0.62, 0.27, y + 0.03, 0.66))                   # 60 mm: the armrest, into the back post
    for x in (0.215, 0.115, 0.015, -0.085, -0.185):
        part('Slat', 0, 'oak', box(x - 0.042, -0.9, 0.418, x + 0.042, 0.9, 0.448))                       # 2 mm into the rails
    lean = math.degrees(math.atan2(0.14, 0.54))   # the posts' lean
    for z in (0.56, 0.68, 0.80):   # the back slats on the posts' front faces (the post's centre line + 3 cm + the slat's half, 2 mm into it)
        x = -0.19 - (z - 0.38) * 0.14 / 0.54 + 0.03 / math.cos(math.radians(lean)) + 0.015 - 0.002
        part('Back', 0, 'oak', lambda bm, x=x, z=z: (box(-0.015, -0.9, -0.045, 0.015, 0.9, 0.045)(bm), bm.transform(T(x, 0, z) @ RY(-lean))))


def bin_street():
    part('Body', 0, 'blackmetal', lambda bm: lathe(bm, [(1e-4, 0.0), (0.21, 0.0), (0.24, 0.04), (0.24, 0.86), (1e-4, 0.86)], 28))
    part('Band', 0, 'brass', lambda bm: lathe(bm, ring(0.235, 0.25, 0.68, 0.73), 28))                   # 5 mm into the body, 10 mm proud
    part('Mouth', 0, 'paint_black', lambda bm: lathe(bm, ring(0.235, 0.244, 0.76, 0.83), 28))           # the dark opening under the lid
    part('Lid', 0, 'blackmetal', lambda bm: lathe(bm, [(1e-4, 0.855), (0.255, 0.855), (0.255, 0.885), (0.19, 0.95), (0.05, 0.98), (1e-4, 0.985)], 28))


def hydrant():
    part('Body', 0, 'paint_red', lambda bm: lathe(bm, [(1e-4, 0.0), (0.15, 0.0), (0.15, 0.045), (0.115, 0.07), (0.105, 0.10), (0.105, 0.54), (0.125, 0.56),
                                                       (0.125, 0.60), (0.095, 0.63), (0.06, 0.70), (0.03, 0.72), (1e-4, 0.725)], 24))
    part('Nut', 0, 'paint_red', lambda bm: (lathe(bm, [(1e-4, 0.71), (0.026, 0.71), (0.026, 0.76), (1e-4, 0.76)], 5)))
    for k, (dx, dy, L, r) in enumerate(((0, 1, 0.11, 0.035), (0, -1, 0.11, 0.035), (1, 0, 0.12, 0.05))):   # the side outlets and the front one
        M = T(0, 0, 0.40) @ (RX(-90 if dy > 0 else 90) if dy else RY(90))
        part('Outlet', 0, 'paint_red', lambda bm, L=L, r=r, M=M: (lathe(bm, ring(1e-4, r, 0.06, 0.06 + L), 16), bm.transform(M)))
        part('Cap', 0, 'brass' if k == 2 else 'paint_red', lambda bm, L=L, r=r, M=M: (lathe(bm, [(1e-4, 0.05 + L), (r + 0.012, 0.05 + L), (r + 0.012, 0.09 + L), (1e-4, 0.09 + L)], 6), bm.transform(M)))


def parking_meter():
    part('Post', 0, 'paint_grey', cyl(0.035, -0.02, 1.12, 12))
    part('Head', 0, 'blackmetal', rb((0.14, 0.17, 0.27), 0.03, (2, 2, 2), 2), T(0, 0, 1.25))                # 1.115 to 1.385: the post 5 mm in
    part('Dome', 0, 'galvanized', lambda bm: lathe(bm, [(1e-4, 1.37), (0.06, 1.37), (0.05, 1.42), (1e-4, 1.44)], 16))
    part('Screen', 0, 'glow_white', box(0.068, -0.05, 1.27, 0.076, 0.05, 1.33), smooth=False)              # 2 mm into the head's front
    part('Slot', 0, 'brass', box(0.066, -0.03, 1.18, 0.074, 0.03, 1.21))


def bicycle(y, paint):
    """a bicycle along X at y, its wheels on the ground (2 mm into it), standing on a kickstand"""
    R, rr = 0.335, 0.017
    for x in (-0.52, 0.52):
        M = T(x, y, R - 0.004) @ RX(90)
        part('Tyre', 0, 'rubber', lambda bm, M=M: (lathe(bm, ring(R - 0.036, R, -0.016, 0.016), 28), bm.transform(M)))
        part('Rim', 0, 'steel', lambda bm, M=M: (lathe(bm, ring(R - 0.06, R - 0.034, -0.011, 0.011), 28), bm.transform(M)))
        part('Hub', 0, 'steel', lambda bm, M=M: (lathe(bm, ring(1e-4, 0.03, -0.055, 0.055), 12), bm.transform(M)))
        for k in range(12):
            a = 2 * math.pi * k / 12
            part('Spoke', 0, 'steel', bar((x + 0.025 * math.cos(a), y, R - 0.004 + 0.025 * math.sin(a)), (x + (R - 0.05) * math.cos(a), y, R - 0.004 + (R - 0.05) * math.sin(a)), 0.004, 0.004))
    bb, st, ht, hb = (-0.05, y, 0.30), (-0.20, y, 0.80), (0.40, y, 0.80), (0.45, y, 0.64)
    ra, fa = (-0.52, y, R - 0.004), (0.52, y, R - 0.004)
    for a, b in ((bb, st), (st, ht), (bb, hb), (ht, hb)):
        part('Frame', 0, paint, ctube([a, b], rr, 8))
    for s in (-0.04, 0.04):
        part('Stay', 0, paint, ctube([(bb[0], y + s * 0.5, bb[2]), (ra[0], y + s, ra[2])], 0.011, 6))
        part('Stay', 0, paint, ctube([(st[0] + 0.01, y + s * 0.4, st[2] - 0.04), (ra[0], y + s, ra[2])], 0.01, 6))
        part('Fork', 0, paint, ctube([(hb[0] - 0.006, y + s * 0.2, hb[2] + 0.02), (fa[0], y + s, fa[2])], 0.012, 6))
    part('Stem', 0, 'steel', ctube([(0.406, y, 0.78), (0.37, y, 0.95)], 0.012, 6))                   # from inside the head tube
    part('Bar', 0, 'steel', ctube([(0.33, y - 0.25, 0.97), (0.37, y - 0.24, 0.95), (0.37, y + 0.24, 0.95), (0.33, y + 0.25, 0.97)], 0.011, 6))
    part('Saddle', 0, 'leather_black', rb((0.26, 0.13, 0.05), 0.02, (2, 2, 1), 1), T(-0.23, y, 0.86))
    part('SeatPost', 0, 'steel', ctube([(st[0] + 0.012, y, st[2] - 0.05), (-0.225, y, 0.85)], 0.011, 6))
    part('Axle', 0, 'steel', lambda bm: (lathe(bm, ring(1e-4, 0.022, -0.065, 0.065), 12), bm.transform(T(bb[0], y, bb[2]) @ RX(90))))   # the bottom bracket
    part('Crank', 0, 'steel', bar((bb[0] - 0.08, y + 0.055, bb[2] - 0.12), (bb[0] + 0.08, y + 0.055, bb[2] + 0.12), 0.025, 0.012))
    part('Ring', 0, 'steel', lambda bm: (lathe(bm, ring(1e-4, 0.09, -0.004, 0.004), 24), bm.transform(T(bb[0], y + 0.035, bb[2]) @ RX(90))))
    part('Kick', 0, 'steel', ctube([(bb[0] - 0.01, y - 0.05, bb[2]), (bb[0] - 0.12, y - 0.18, -0.004 + 0.008)], 0.008, 6))   # from the bracket to the ground, the far side


def bike_stand():
    """two Sheffield stands 0.9 m apart along Y (each a hoop along X), a bicycle beside each, 9 cm off the hoop"""
    for y in (-0.45, 0.45):
        part('Hoop', 0, 'steel', ctube([(-0.38, y, -0.004), (-0.38, y, 0.62)] + [(-0.38 + 0.38 * (1 - math.cos(math.pi * k / 8)), y, 0.62 + 0.14 * math.sin(math.pi * k / 8)) for k in range(1, 8)]
                                       + [(0.38, y, 0.62), (0.38, y, -0.004)], 0.024, 10))
    bicycle(-0.33, 'enamel_green'); bicycle(0.57, 'paint_red')


def roof_tank():
    """a 2,000 l black water tank (r 0.7, 1.6 m) on a galvanised frame 1.2 m high; a ladder on its front"""
    for x, y in ((-0.6, -0.6), (0.6, -0.6), (-0.6, 0.6), (0.6, 0.6)):
        part('Leg', 0, 'galvanized', box(x - 0.035, y - 0.035, -0.02, x + 0.035, y + 0.035, 1.22))
    for y in (-0.6, 0.6):
        part('Beam', 0, 'galvanized', box(-0.64, y - 0.03, 0.32, 0.64, y + 0.03, 0.38))                  # 60 mm through the 70 mm legs
    part('Deck', 0, 'galvanized', box(-0.66, -0.66, 1.17, 0.66, 0.66, 1.23))
    part('Tank', 0, 'plastic_black', lambda bm: lathe(bm, [(1e-4, 1.22), (0.68, 1.22), (0.72, 1.3), (0.72, 2.6), (0.6, 2.75), (0.2, 2.8), (1e-4, 2.8)], 32))
    for z in (1.55, 1.9, 2.25):
        part('Rib', 0, 'plastic_black', lambda bm, z=z: lathe(bm, ring(0.715, 0.735, z, z + 0.04), 32))
    part('Hatch', 0, 'plastic_black', lambda bm: lathe(bm, ring(1e-4, 0.17, 2.77, 2.86), 20))
    for s in (-0.18, 0.18):
        part('Ladder', 0, 'galvanized', box(0.69, s - 0.015, -0.02, 0.75, s + 0.015, 2.5))                # 7 mm into the tank's side
    for z in [0.11 + 0.25 * k for k in range(1, 10)]:   # clear of the ribs (2 cm)
        part('Rung', 0, 'galvanized', box(0.72, -0.2, z, 0.745, 0.2, z + 0.02))


def roof_ac():
    """a condenser on two steel rails, its fan grille on top; a vent stack beside it"""
    for y in (-0.35, 0.35):
        part('Rail', 0, 'galvanized', box(-0.62, y - 0.04, -0.02, 0.62, y + 0.04, 0.12))
    part('Case', 0, 'paint_cream', rb((1.1, 0.9, 0.82), 0.02, (2, 2, 2), 1), T(0, 0, 0.52))                    # 0.11 to 0.93: 1 cm into the rails
    part('Grille', 0, 'paint_grey', lambda bm: lathe(bm, ring(1e-4, 0.33, 0.92, 0.95), 32))
    part('Fan', 0, 'paint_black', lambda bm: lathe(bm, ring(0.06, 0.31, 0.945, 0.958), 32))
    for k in range(4):
        z = 0.955 + 0.006 * k   # each 6 mm over the last where they cross (one height, their faces fought)
        part('Guard', 0, 'galvanized', bar((0.33 * math.cos(math.pi * k / 4), 0.33 * math.sin(math.pi * k / 4), z), (-0.33 * math.cos(math.pi * k / 4), -0.33 * math.sin(math.pi * k / 4), z), 0.012, 0.012))
    part('Vent', 0, 'galvanized', lambda bm: (lathe(bm, [(1e-4, -0.02), (0.09, -0.02), (0.09, 1.4), (0.2, 1.42), (0.2, 1.47), (0.06, 1.55), (1e-4, 1.56)], 16), bm.transform(T(-0.95, 0.0, 0))))


BUILD = {'bench_street': bench_street, 'bin_street': bin_street, 'hydrant': hydrant, 'parking_meter': parking_meter, 'bike_stand': bike_stand,
         'roof_tank': roof_tank, 'roof_ac': roof_ac}


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
