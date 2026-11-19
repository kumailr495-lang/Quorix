"""LUMIERE v12c - the lobby's three counters in detail (the user, 2026-11-19: "the textures and models you are making is ... lazy, make
them better 3d detailed and animations, also make reception and bar and popcorn area like dedicated areas"). Original designs:
  popcorn_kettle   a cabinet popper: red lacquer base and header (its lettering is an engine panel, world9.js 'popcorn_head'), glass
                   sides, two chrome-framed glass doors, a stainless kettle hung from the roof on two rods, its lid halves pushed open,
                   the tilt handle out through the side glass, a heat lamp, a heap of popped corn on the deck (180 kernels; anim12.js pops kernels
                   out of the kettle onto it: its KETTLE constants are this model's numbers)
  drinks_tower     a six-valve soda tower: a brushed steel body, lit flavour panels over the valves, push levers, a slotted drip tray,
                   a lit merchandiser on top
  espresso_lever   a two-group lever espresso machine: chrome body, brass band and badge, a pressure gauge, two piston towers with
                   lever arms, portafilters with walnut handles, steam and water wands, cups on saucers on the warmer (anim12.js STEAM)
  till_pos         a till for the desk: a screen on a swivel stand (facing the staff, -X), a customer display on its back, a card
                   reader and a receipt printer
  tub_stack        six nested popcorn tubs, red with a white label band, white rolled rims
  bar_walnut       the cafe's bar: a fluted walnut front between brass pilasters, a calacatta top with a warm light line under its
                   nosing, a black plinth, a brass foot rail on brackets
  chandelier_deco  the dome's chandelier: a ceiling rose, three brass rings stepping down (hung on rods and spokes), each carrying a
                   curtain of lit glass rods with a crystal drop at the end: a waterfall of light
  popcorn_case     a heated display for the front counter: a red lacquer frame, glass sides, a lamp in its roof, two glass shelves
                   with filled tubs and striped bags

    blender --background --factory-startup --python tools/blender/zones12.py -- --out www/models [--only NAME]
    then: blender --background --factory-startup --python tools/blender/glb_check.py -- www/models/<name>.glb

Frame: +X the front (the engine's +Z at yaw 0), +Z up, the surface it stands on at Z = 0 (chandelier_deco: the ceiling at Z = 0, the
chandelier hanging below it). Parts embed 2 mm or more into what they join; parallel faces of different parts are 5 mm or more apart."""
import bpy, bmesh, math, sys, os, argparse, random
from mathutils import Vector, Matrix
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lbl
from lbl import T, RY, RZ, lathe, rb, part, PARTS

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ap = argparse.ArgumentParser(); ap.add_argument('--out', default='www/models'); ap.add_argument('--only', default='')
A = ap.parse_args(argv)
for k, v in {'lacquer_red': ((0.30, 0.012, 0.016), 0.16, 0.0), 'lacquer_cream': ((0.75, 0.68, 0.55), 0.2, 0.0), 'popcorn': ((0.85, 0.70, 0.36), 0.8, 0.0),
             'paper_red': ((0.55, 0.02, 0.025), 0.6, 0.0), 'paper_white': ((0.86, 0.83, 0.76), 0.6, 0.0), 'steel': ((0.55, 0.56, 0.58), 0.35, 1.0),
             'marble_calacatta': ((0.80, 0.78, 0.74), 0.1, 0.0), 'fluted_walnut': ((0.15, 0.06, 0.03), 0.5, 0.0), 'paint_black': ((0.006, 0.006, 0.007), 0.7, 0.0)}.items():
    lbl.MAT_DEF.setdefault(k, v)
for k, v in {'glow_red': ((1.0, 0.10, 0.06), 3.0), 'glow_green': ((0.35, 1.0, 0.25), 2.6), 'glow_orange': ((1.0, 0.45, 0.06), 2.8),
             'glow_screen': ((0.45, 0.66, 1.0), 1.5)}.items():
    lbl.GLOW_DEF.setdefault(k, v)
RX = lambda deg: Matrix.Rotation(math.radians(deg), 4, 'X')


# ------------------------------------------------------------------------------------------------ builders
def bx(name, mat, a, b, r=0.0, smooth=False):
    """an axis-aligned box from corner a to corner b; r > 0 rounds its edges"""
    size = tuple(b[i] - a[i] for i in range(3)); c = tuple((a[i] + b[i]) / 2 for i in range(3))
    if r > 0: return part(name, 0, mat, rb(size, r), T(*c))
    def build(bm):
        bmesh.ops.create_cube(bm, size=1.0); bm.transform(Matrix.Diagonal((*size, 1.0)))
    return part(name, 0, mat, build, T(*c), smooth=smooth)


def lat(name, mat, profile, M, seg=24, smooth=True):
    """a closed solid of revolution (lbl.lathe: profile of (radius, height) about +Z), placed by M"""
    return part(name, 0, mat, lambda bm: lathe(bm, profile, seg), M, smooth=smooth)


def cyl(name, mat, x, y, z0, z1, r, seg=24, smooth=True):
    """a closed cylinder standing on (x, y) from z0 to z1"""
    return lat(name, mat, [(1e-4, z0), (r, z0), (r, z1), (1e-4, z1)], T(x, y, 0), seg, smooth)


def cylx(name, mat, y, z, x0, x1, r, seg=20):
    """a closed cylinder along X at (y, z) from x0 to x1"""
    return lat(name, mat, [(1e-4, x0), (r, x0), (r, x1), (1e-4, x1)], T(0, y, z) @ RY(90), seg)


def cyly(name, mat, x, z, y0, y1, r, seg=20):
    """a closed cylinder along Y at (x, z) from y0 to y1"""
    return lat(name, mat, [(1e-4, y0), (r, y0), (r, y1), (1e-4, y1)], T(x, 0, z) @ RX(-90), seg)


def ring(name, mat, M, r0, r1, z0, z1, seg=48):
    """a flat band (an annulus from r0 to r1, z0 to z1) about +Z, placed by M"""
    return lat(name, mat, [(r0, z0), (r1, z0), (r1, z1), (r0, z1)], M, seg)


def ball(name, mat, c, r, sub=2):
    return part(name, 0, mat, lambda bm: bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=r), T(*c))


def ctube_build(pts, radius, sides=8):
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


def tube(name, mat, pts, radius, sides=8):
    return part(name, 0, mat, ctube_build(pts, radius, sides))


def loop_build(pts, radius, sides=8):
    """a round tube round a closed polyline (welded: no ends)"""
    return lambda bm: lbl.tube(bm, pts, radius, sides, closed=True)


def half_disc(r, t, seg=16):
    """a half disc on +X of radius r and thickness t (Z 0..t), its straight edge on the Y axis: a closed prism"""
    def build(bm):
        pts = [(r * math.cos(a), r * math.sin(a)) for a in (math.pi * (k / seg - 0.5) for k in range(seg + 1))]
        lo = [bm.verts.new((x, y, 0.0)) for x, y in pts]; hi = [bm.verts.new((x, y, t)) for x, y in pts]
        bm.faces.new(list(reversed(lo))); bm.faces.new(hi)
        for i in range(len(pts)):
            j = (i + 1) % len(pts); bm.faces.new((lo[i], lo[j], hi[j], hi[i]))
    return build


def heightfield(x0, x1, y0, y1, nx, ny, f, zb):
    """a closed solid: its top at z = f(x, y) over a grid, straight sides down to zb, a flat bottom"""
    def build(bm):
        V = [[bm.verts.new((x0 + (x1 - x0) * i / nx, y0 + (y1 - y0) * j / ny, f(x0 + (x1 - x0) * i / nx, y0 + (y1 - y0) * j / ny)))
              for j in range(ny + 1)] for i in range(nx + 1)]
        for i in range(nx):
            for j in range(ny): bm.faces.new((V[i][j], V[i + 1][j], V[i + 1][j + 1], V[i][j + 1]))
        rim = [V[i][0] for i in range(nx + 1)] + [V[nx][j] for j in range(1, ny + 1)] + [V[i][ny] for i in range(nx - 1, -1, -1)] + [V[0][j] for j in range(ny - 1, 0, -1)]
        B = [bm.verts.new((v.co.x, v.co.y, zb)) for v in rim]; m = len(rim)
        for k in range(m): bm.faces.new((rim[k], rim[(k + 1) % m], B[(k + 1) % m], B[k]))
        bm.faces.new(list(reversed(B)))
    return build


def corn(pieces, seed):
    """popped kernels: puffy jittered icosahedra (20 faces each) at (x, y, z, r)"""
    def build(bm):
        rnd = random.Random(seed)
        for (x, y, z, r) in pieces:
            g = bmesh.ops.create_icosphere(bm, subdivisions=1, radius=1.0)
            q = Matrix.Rotation(rnd.uniform(0, 6.28), 3, 'Z') @ Matrix.Rotation(rnd.uniform(0, 6.28), 3, 'X')
            for v in g['verts']: v.co = Vector((x, y, z)) + q @ (v.co * r * rnd.uniform(0.72, 1.3))
    return build


# ------------------------------------------------------------------------------------------------ popcorn_kettle
# anim12.js KETTLE reads these: the kettle's centre (x, y), its rim's height and radius, the deck, the cabinet's inside, the heap
KC = (0.0, -0.05); RIM_Z, RIM_R, DECK = 0.626, 0.14, 0.18
HEAP_C, HEAP_R, HEAP_H = (0.03, 0.0), 0.34, 0.15


def heap_z(x, y):
    d = math.hypot(x - HEAP_C[0], y - HEAP_C[1]) / HEAP_R
    return DECK + 0.008 + HEAP_H * max(0.0, 1 - d * d) ** 0.8 + 0.006 * math.sin(x * 61) * math.sin(y * 47)


def popcorn_kettle():
    R = 'lacquer_red'
    part('Base', 0, R, rb((0.50, 0.74, 0.14), 0.012), T(0, 0, 0.10))                            # z 0.03 .. 0.17
    for x in (-0.2, 0.2):
        for y in (-0.31, 0.31): cyl('Foot', 'chrome', x, y, -0.01, 0.036, 0.02, 16)              # 1 cm into the counter, 6 mm into the base
    bx('Kick', 'chrome', (0.244, -0.33, 0.052), (0.256, 0.33, 0.068))                          # 6 mm proud of the base's front
    bx('Pull', 'chrome', (0.264, -0.09, 0.118), (0.282, 0.09, 0.134), r=0.005)
    for y in (-0.075, 0.075): cylx('PullPost', 'chrome', y, 0.126, 0.244, 0.268, 0.005, 12)
    bx('Plate', 'plastic_black', (0.244, 0.19, 0.088), (0.257, 0.33, 0.150))                  # the switches, right of the pull
    for y in (0.215, 0.255): cylx('Toggle', 'chrome', y, 0.119, 0.252, 0.274, 0.0045, 10)
    cylx('Pilot', 'glow_red', 0.300, 0.119, 0.252, 0.264, 0.007, 12)
    bx('Deck', 'steel', (-0.236, -0.356, 0.165), (0.236, 0.356, 0.18))                          # 5 mm into the base's top
    for x in (-0.229, 0.229):
        for y in (-0.349, 0.349): bx('Post', R, (x - 0.015, y - 0.015, 0.16), (x + 0.015, y + 0.015, 0.835))   # 6 mm inside the base's faces
    bx('Ceiling', 'chrome', (-0.26, -0.38, 0.815), (0.26, 0.38, 0.828))                         # the cabinet's chrome roof, 5 mm proud all round
    part('Header', 0, R, rb((0.51, 0.75, 0.16), 0.015), T(0, 0, 0.90))                          # z 0.82 .. 0.98
    bx('Crown', 'chrome', (-0.26, -0.38, 0.972), (0.26, 0.38, 0.985))
    bx('SignBed', 'paint_cream', (0.249, -0.29, 0.852), (0.262, 0.29, 0.948))                 # 7 mm proud: world9.js 'popcorn_head' 5 mm in front
    for y in (-0.33, 0.33):
        for z in (0.875, 0.925): ball('Bulb', 'glow_warm', (0.258, y, z), 0.012, 1)             # 9 mm into the header's front
    # glass: the back and the sides between the posts (their ends inside the posts, 5 mm into the deck and 7 mm into the roof)
    bx('Glass', 'glass', (-0.232, -0.342, 0.175), (-0.226, 0.342, 0.822))
    for s in (-1, 1): bx('Glass', 'glass', (-0.222, min(s * 0.346, s * 0.352), 0.175), (0.222, max(s * 0.346, s * 0.352), 0.822))
    # two doors: a glass leaf in a round chrome frame (welded loop), hung on the front posts (the frame 2 mm into them), a knob
    for s in (-1, 1):
        ya, yb = s * 0.328, s * 0.012
        y0, y1 = min(ya, yb), max(ya, yb)
        part('DoorFrame', 0, 'chrome', loop_build([(0.229, y0, 0.196), (0.229, y1, 0.196), (0.229, y1, 0.804), (0.229, y0, 0.804)], 0.008, 8))
        bx('DoorGlass', 'glass', (0.226, y0 + 0.002, 0.198), (0.232, y1 - 0.002, 0.802))
        cylx('KnobStem', 'chrome', s * 0.04, 0.5, 0.230, 0.244, 0.004, 10)
        ball('Knob', 'chrome', (0.247, s * 0.04, 0.5), 0.009, 2)
    # the kettle: a stainless bowl (a 1.2 cm shell), its corn, the lid halves pushed up about a hinge rod, the motor, the drive shaft
    kx, ky = KC
    lat('Kettle', 'steel', [(1e-4, 0.508), (0.07, 0.510), (0.105, 0.522), (0.125, 0.545), (0.135, 0.575), (0.138, 0.60), (0.140, 0.618),
                            (0.140, RIM_Z), (0.128, RIM_Z), (0.127, 0.60), (0.123, 0.575), (0.114, 0.552), (0.096, 0.534), (0.065, 0.524), (1e-4, 0.522)], T(kx, ky, 0), 40)
    lat('KettleCorn', 'popcorn', [(1e-4, 0.565), (0.126, 0.565), (0.126, 0.598), (0.08, 0.612), (1e-4, 0.618)], T(kx, ky, 0), 24)   # into the bowl's walls
    for s, a in ((1, -35), (-1, 35)):
        part('Lid', 0, 'steel', half_disc(0.128, 0.005, 16), T(kx, ky, RIM_Z + 0.006) @ RY(a) @ RZ(0 if s > 0 else 180) @ T(0, 0, -0.0025))
    cyly('Hinge', 'chrome', kx, RIM_Z + 0.006, ky - 0.13, ky + 0.13, 0.006, 12)
    part('Motor', 0, 'plastic_black', rb((0.08, 0.06, 0.05), 0.008), T(kx, ky, RIM_Z + 0.007 + 0.025))   # 5 mm down round the hinge rod
    cyl('Shaft', 'chrome', kx, ky, RIM_Z + 0.05, 0.82, 0.010, 12)                               # into the roof
    for s in (-1, 1):
        cyl('Hanger', 'chrome', kx, ky + s * 0.140, 0.555, 0.82, 0.006, 10)                       # 3 mm into the bowl's wall, up into the roof
        cyly('Pivot', 'chrome', kx, 0.585, ky + s * 0.126, ky + s * 0.152, 0.016, 16) if s > 0 else cyly('Pivot', 'chrome', kx, 0.585, ky - 0.152, ky - 0.126, 0.016, 16)
    cyly('Handle', 'chrome', kx, 0.585, ky + 0.15, 0.40, 0.007, 10)                            # out through the side glass
    cyly('HandleKnob', 'plastic_black', kx, 0.585, 0.395, 0.435, 0.016, 16)
    bx('Lamp', 'glow_warm', (0.10, -0.30, 0.806), (0.20, 0.30, 0.82))                         # the heat lamp, 1 cm up into the roof
    # the heap: a body over the deck (5 mm into it, clear of the glass) and 180 kernels on its surface
    part('Heap', 0, 'popcorn', heightfield(-0.222, 0.222, -0.342, 0.342, 16, 24, lambda x, y: heap_z(x, y) - 0.006, DECK - 0.005))
    rnd = random.Random(7); P = []
    while len(P) < 180:
        x, y = rnd.uniform(-0.198, 0.198), rnd.uniform(-0.318, 0.318); r = rnd.uniform(0.0095, 0.0145)   # 7 mm clear of the glass at their widest
        if rnd.random() > 0.35 + 0.65 * (1 - min(1, math.hypot(x - HEAP_C[0], y - HEAP_C[1]) / HEAP_R)): continue
        P.append((x, y, heap_z(x, y) - 0.002, r))
    part('Corn', 0, 'popcorn', corn(P, 8))


# ------------------------------------------------------------------------------------------------ drinks_tower
def drinks_tower():
    part('Body', 0, 'steel', rb((0.54, 0.60, 0.63), 0.012), T(0, 0, 0.305))                     # z -0.01 .. 0.62 (1 cm into the counter)
    part('Merch', 0, 'lacquer_black', rb((0.558, 0.61, 0.19), 0.01), T(0.003, 0, 0.71))         # x -0.276 .. 0.282, z 0.615 .. 0.805: 5 mm into the body, 6 mm proud of its back
    bx('MerchLight', 'glow_white', (0.277, -0.27, 0.64), (0.288, 0.27, 0.78))                   # 6 mm proud of its front
    flav = ('glow_red', 'glow_orange', 'glow_green', 'glow_blue', 'glow_ice', 'glow_gold')
    for k, y in enumerate((-0.225, -0.135, -0.045, 0.045, 0.135, 0.225)):
        bx('Flavour', flav[k], (0.268, y - 0.034, 0.53), (0.276, y + 0.034, 0.60))              # 6 mm proud of the body's front
        part('Valve', 0, 'plastic_black', rb((0.075, 0.06, 0.09), 0.01), T(0.2925, y, 0.465))  # x 0.255 .. 0.33, 1.5 cm into the body
        cyl('Nozzle', 'chrome', 0.30, y, 0.395, 0.425, 0.009, 14)                              # 5 mm up into the valve
        bx('Lever', 'chrome', (0.327, y - 0.022, 0.38), (0.336, y + 0.022, 0.452), r=0.003)     # 3 mm into the valve's front
    bx('Tray', 'steel', (0.20, -0.29, 0.13), (0.40, 0.29, 0.16))                                # 7 cm into the body
    for k in range(9):
        x = 0.282 + 0.0135 * k; bx('Grate', 'chrome', (x, -0.28, 0.157), (x + 0.007, 0.28, 0.166))   # 3 mm into the tray, 6 mm over it
    bx('Splash', 'chrome', (0.266, -0.28, 0.155), (0.275, 0.28, 0.36))                           # a splash plate behind the cups, 4 mm into the body


# ------------------------------------------------------------------------------------------------ espresso_lever
# anim12.js STEAM reads these: the steam wand's tip, the portafilters' spouts
WAND_TIP, SPOUTS = (0.29, 0.40, 0.112), ((0.235, -0.19, 0.15), (0.235, 0.19, 0.15))


def espresso_lever():
    part('Body', 0, 'chrome', rb((0.40, 0.74, 0.35), 0.025), T(0, 0, 0.265))                    # z 0.09 .. 0.44
    for x in (-0.15, 0.15):
        for y in (-0.32, 0.32): cyl('Foot', 'blackmetal', x, y, -0.01, 0.10, 0.022, 16)
    bx('Band', 'brass', (-0.205, -0.375, 0.395), (0.205, 0.375, 0.41))                         # 5 mm proud all round
    bx('Badge', 'brass', (0.197, -0.085, 0.215), (0.206, 0.085, 0.255))
    lat('GaugeBezel', 'chrome', [(0.036, 0.195), (0.047, 0.195), (0.047, 0.224), (0.036, 0.224)], T(0, 0, 0.33) @ RY(90), 32)
    lat('GaugeFace', 'paint_cream', [(1e-4, 0.19), (0.0365, 0.19), (0.0365, 0.217), (1e-4, 0.217)], T(0, 0, 0.33) @ RY(90), 32)
    bx('Needle', 'plastic_black', (0.213, -0.002, 0.33), (0.223, 0.002, 0.358))
    for y in (-0.19, 0.19):
        cylx('Boss', 'chrome', y, 0.31, 0.18, 0.27, 0.05, 28)                                   # 2 cm into the body's front
        cyl('Group', 'chrome', 0.235, y, 0.205, 0.30, 0.042, 28)
        cyl('Basket', 'chrome', 0.235, y, 0.17, 0.21, 0.038, 28)
        tube('PfHandle', 'walnut', [(0.27, y, 0.19), (0.34, y, 0.186), (0.40, y, 0.18)], 0.012, 10)
        for d in (-0.012, 0.012): cyl('Spout', 'chrome', 0.235, y + d, 0.148, 0.175, 0.005, 10)
        cyl('Tower', 'chrome', 0.235, y, 0.32, 0.55, 0.045, 28)                                     # its foot well down into the round boss
        lat('TowerCap', 'brass', [(1e-4, 0.545), (0.05, 0.545), (0.05, 0.56), (0.035, 0.578), (1e-4, 0.586)], T(0.235, y, 0), 28)
        cyly('LeverPivot', 'chrome', 0.27, 0.53, y - 0.03, y + 0.03, 0.018, 16)
        tube('Lever', 'chrome', [(0.27, y, 0.53), (0.305, y, 0.74), (0.34, y, 0.94)], 0.011, 10)
        ball('LeverKnob', 'plastic_black', (0.345, y, 0.965), 0.028, 2)
    for s in (-1, 1):   # the steam valve (+Y) and the water valve (-Y): a chrome valve, a black knob
        cylx('Valve', 'chrome', s * 0.33, 0.30, 0.18, 0.235, 0.02, 20)
        cylx('ValveKnob', 'plastic_black', s * 0.33, 0.30, 0.233, 0.255, 0.024, 20)
    tube('Wand', 'chrome', [(0.215, 0.345, 0.29), (0.25, 0.39, 0.25), (0.29, 0.40, 0.12)], 0.0065, 8)
    ball('WandTip', 'chrome', (0.29, 0.40, 0.118), 0.009, 2)
    tube('Spout', 'chrome', [(0.215, -0.345, 0.29), (0.26, -0.37, 0.24), (0.28, -0.375, 0.20)], 0.0075, 8)
    bx('Tray', 'steel', (0.15, -0.36, 0.083), (0.27, 0.36, 0.115))                              # 7 mm under the body's bottom
    for k in range(5):
        x = 0.204 + 0.013 * k; bx('Grate', 'chrome', (x, -0.35, 0.112), (x + 0.006, 0.35, 0.120))
    for y in (-0.24, -0.08, 0.08, 0.24):   # cups on saucers on the warmer (front half: the bottle shelves overhang its back)
        lat('Saucer', 'ceramic', [(1e-4, 0.438), (0.055, 0.438), (0.058, 0.446), (0.05, 0.449), (1e-4, 0.448)], T(0.07, y, 0), 24)
        lat('Cup', 'ceramic', [(1e-4, 0.446), (0.026, 0.446), (0.034, 0.47), (0.036, 0.50), (0.031, 0.50), (0.029, 0.476), (1e-4, 0.476)], T(0.07, y, 0), 24)
        lat('Coffee', 'walnut_dark', [(1e-4, 0.474), (0.0295, 0.474), (0.0305, 0.488), (1e-4, 0.488)], T(0.07, y, 0), 20)   # into the cup's walls


# ------------------------------------------------------------------------------------------------ till_pos
def till_pos():
    part('Base', 0, 'blackmetal', rb((0.18, 0.22, 0.03), 0.008), T(0, 0, 0.01))                # 5 mm into the desk
    cyl('Stem', 'steel', 0, 0, 0.02, 0.20, 0.018, 16)
    cyly('Hinge', 'blackmetal', 0, 0.21, -0.05, 0.05, 0.02, 16)
    M = T(-0.012, 0, 0.29) @ RY(15)                                                             # the screen faces the staff (-X), tipped up 15 degrees
    part('Screen', 0, 'plastic_black', rb((0.025, 0.31, 0.21), 0.008), M)
    part('ScreenLit', 0, 'glow_screen', lambda bm: (bmesh.ops.create_cube(bm, size=1.0), bm.transform(Matrix.Diagonal((0.008, 0.27, 0.17, 1.0)))), M @ T(-0.0145, 0, 0.004), smooth=False)   # 5.5 mm proud of its face
    part('Customer', 0, 'glow_screen', lambda bm: (bmesh.ops.create_cube(bm, size=1.0), bm.transform(Matrix.Diagonal((0.008, 0.14, 0.07, 1.0)))), M @ T(0.0145, 0, 0.03), smooth=False)
    cyly('Neck', 'blackmetal', -0.004, 0.235, -0.012, 0.012, 0.035, 16)                        # the screen's mount, into the hinge and the screen
    # the card reader on its cradle (+Y) and the receipt printer (-Y)
    part('Cradle', 0, 'blackmetal', rb((0.09, 0.08, 0.03), 0.006), T(-0.01, 0.22, 0.01))
    part('Reader', 0, 'plastic_black', rb((0.11, 0.07, 0.022), 0.008), T(-0.01, 0.22, 0.045) @ RY(-25))
    part('ReaderLit', 0, 'glow_screen', lambda bm: (bmesh.ops.create_cube(bm, size=1.0), bm.transform(Matrix.Diagonal((0.04, 0.045, 0.006, 1.0)))), T(-0.01, 0.22, 0.045) @ RY(-25) @ T(-0.015, 0, 0.0135), smooth=False)
    part('Printer', 0, 'plastic_black', rb((0.15, 0.13, 0.11), 0.015), T(-0.02, -0.25, 0.05))  # 5 mm into the desk
    bx('Slot', 'paint_black', (-0.08, -0.29, 0.096), (0.03, -0.21, 0.11))
    part('Receipt', 0, 'paper_white', lambda bm: (bmesh.ops.create_cube(bm, size=1.0), bm.transform(Matrix.Diagonal((0.004, 0.06, 0.07, 1.0)))), T(-0.03, -0.25, 0.135) @ RY(-20), smooth=False)


# ------------------------------------------------------------------------------------------------ tub_stack
def tub_stack(n=6):
    rad = lambda z, z0: 0.075 + 0.035 * (z - z0) / 0.22   # a tub's radius at height z (its base at z0)
    top = 0.22 + 0.03 * (n - 1)
    # the outside of the stack: each tub's wall from the rim of the one under it up to its own rim
    prof = [(1e-4, 0.0), (0.075, 0.0)]
    for k in range(n):
        z0 = 0.03 * k; za = 0.22 + 0.03 * (k - 1) if k else 0.0
        if k: prof.append((rad(za, z0) - 0.002, za))
        prof.append((rad(0.22 + z0 - 0.004, z0), 0.22 + z0 - 0.004))
    zt = 0.03 * (n - 1); prof += [(rad(top - 0.004, zt) - 0.004, top - 0.004), (rad(zt + 0.06, zt) - 0.004, zt + 0.06), (1e-4, zt + 0.06)]   # the top tub's inside, 6 cm deep
    lat('Tub', 'paper_red', prof, Matrix.Identity(4), 20)
    for k in range(n):   # the white rolled rims, 5 mm proud of the wall they top
        z = 0.22 + 0.03 * k - 0.004; r = rad(z, 0.03 * k)
        lat('Rim', 'paper_white', [(r - 0.006, z - 0.008), (r + 0.005, z - 0.008), (r + 0.007, z - 0.002), (r + 0.004, z + 0.006), (r - 0.006, z + 0.006)], Matrix.Identity(4), 20)
    lat('Label', 'paper_white', [(rad(0.06, 0) - 0.003, 0.06), (rad(0.06, 0) + 0.005, 0.06), (rad(0.15, 0) + 0.005, 0.15), (rad(0.15, 0) - 0.003, 0.15)], Matrix.Identity(4), 20)


# ------------------------------------------------------------------------------------------------ bar_walnut
def bar_walnut():
    L = 1.95
    bx('Core', 'walnut_dark', (-0.36, -L + 0.03, 0.10), (0.30, L - 0.03, 1.0))
    bx('Plinth', 'paint_black', (-0.33, -L + 0.06, -0.01), (0.25, L - 0.06, 0.11))               # 5 cm behind the front, into the floor
    bx('Front', 'fluted_walnut', (0.295, -L + 0.08, 0.12), (0.33, L - 0.08, 0.98))
    for y in (-L + 0.075, -0.63, 0.63, L - 0.075):
        bx('Pilaster', 'brass', (0.29, y - 0.025, 0.105), (0.342, y + 0.025, 1.006))              # 12 mm proud of the flutes, up into the top (past the core's)
    part('Top', 0, 'marble_calacatta', rb((0.88, 2 * L, 0.045), 0.012), T(0.04, 0, 1.0175))        # x -0.40 .. 0.48, z 0.995 .. 1.04
    bx('NosingLight', 'glow_warm', (0.40, -L + 0.12, 0.985), (0.44, L - 0.12, 1.0))               # under the overhang, 5 mm up into the top
    tube('FootRail', 'brass', [(0.50, -L + 0.18, 0.20), (0.50, L - 0.18, 0.20)], 0.025, 16)
    for y in (-L + 0.18, L - 0.18): ball('RailEnd', 'brass', (0.50, y, 0.20), 0.03, 2)
    for y in (-1.3, 0.0, 1.3):
        tube('RailBracket', 'brass', [(0.32, y, 0.24), (0.42, y, 0.225), (0.50, y, 0.20)], 0.012, 10)


# ------------------------------------------------------------------------------------------------ chandelier_deco
def chandelier_deco():
    lat('Rose', 'brass', [(1e-4, -0.06), (0.22, -0.06), (0.30, -0.035), (0.36, -0.02), (0.36, 0.02), (1e-4, 0.02)], Matrix.Identity(4), 48)   # 2 cm into the ceiling
    cyl('Stem', 'brass', 0, 0, -2.36, -0.05, 0.022, 16)
    rnd = random.Random(12)
    RINGS = ((1.6, -1.30, 96, (0.55, 0.85)), (1.1, -1.75, 66, (0.6, 0.95)), (0.6, -2.20, 36, (0.7, 1.05)))
    for k, (R, z, n, (l0, l1)) in enumerate(RINGS):
        ring('Ring', 'brass', Matrix.Identity(4), R - 0.012, R + 0.012, z - 0.035, z + 0.035, 96)
        for i in range(8):
            a = 2 * math.pi * (i + 0.5 * k) / 8; ca, sa = math.cos(a), math.sin(a)
            if k == 0: tube('Rod', 'brass', [(0.28 * ca, 0.28 * sa, -0.04), (R * ca, R * sa, z + 0.02)], 0.006, 8)   # from the rose to the top ring
            else: tube('Spoke', 'brass', [(0.012 * ca, 0.012 * sa, z), (R * ca, R * sa, z)], 0.007, 8)               # from inside the stem (8 sides: no level faces shared)
        for i in range(n):   # the curtain: lit glass rods from the ring's underside, longer towards the middle, a crystal drop on each
            a = 2 * math.pi * (i + 0.5) / n; ca, sa = math.cos(a), math.sin(a); L = rnd.uniform(l0, l1)
            z0 = z - 0.025; z1 = z0 - L
            tube('Glass', 'glow_opal', [(R * ca, R * sa, z0 + 0.03), (R * ca, R * sa, z1)], 0.0095, 6)
            part('Drop', 0, 'glow_white', lambda bm, c=(R * ca, R * sa, z1 - 0.012): (bmesh.ops.create_icosphere(bm, subdivisions=1, radius=0.016), bm.transform(T(*c) @ Matrix.Diagonal((0.8, 0.8, 1.4, 1.0)))), smooth=False)
    lat('Finial', 'brass', [(1e-4, -2.50), (0.03, -2.46), (0.065, -2.40), (0.06, -2.35), (0.03, -2.33), (1e-4, -2.33)], Matrix.Identity(4), 24)
    ball('FinialDrop', 'glow_white', (0, 0, -2.53), 0.035, 2)


# ------------------------------------------------------------------------------------------------ popcorn_case
def popcorn_case():
    R = 'lacquer_red'
    part('Base', 0, R, rb((0.46, 0.62, 0.08), 0.01), T(0, 0, 0.035))                           # z -0.005 .. 0.075
    for x in (-0.205, 0.205):
        for y in (-0.285, 0.285): bx('Post', R, (x - 0.012, y - 0.012, 0.06), (x + 0.012, y + 0.012, 0.50))
    part('Roof', 0, R, rb((0.47, 0.63, 0.06), 0.01), T(0, 0, 0.515))                            # z 0.485 .. 0.545
    bx('Lamp', 'glow_warm', (-0.15, -0.24, 0.475), (0.15, 0.24, 0.49))
    for s in (-1, 1):
        bx('Glass', 'glass', (-0.196, min(s * 0.278, s * 0.284), 0.07), (0.196, max(s * 0.278, s * 0.284), 0.49))
        bx('Glass', 'glass', (min(s * 0.198, s * 0.204), -0.276, 0.07), (max(s * 0.198, s * 0.204), 0.276, 0.49))
    bx('Shelf', 'glass', (-0.195, -0.275, 0.072), (0.195, 0.275, 0.080))                      # the floor pane, 3 mm into the base
    bx('Shelf', 'glass', (-0.199, -0.279, 0.270), (0.199, 0.279, 0.278))                      # a middle shelf, 1 mm into the four panes
    rnd = random.Random(3)
    for z in (0.078, 0.276):   # 2 mm into the shelf under them
        for x in (-0.09, 0.09):
            for y in (-0.18, 0.0, 0.18):
                if rnd.random() < 0.5:   # a small tub, heaped
                    lat('MiniTub', 'paper_red', [(1e-4, z - 0.002), (0.045, z - 0.002), (0.06, z + 0.13), (0.052, z + 0.13), (1e-4, z + 0.125)], T(x, y, 0), 20)
                    lat('MiniCorn', 'popcorn', [(1e-4, z + 0.12), (0.056, z + 0.12), (0.05, z + 0.16), (0.02, z + 0.178), (1e-4, z + 0.18)], T(x, y, 0), 16)
                else:   # a striped bag, folded over
                    bx('Bag', 'paper_white', (x - 0.035, y - 0.055, z - 0.002), (x + 0.035, y + 0.055, z + 0.16))
                    for k in (-1, 0, 1): bx('BagStripe', 'paper_red', (x - 0.041, y + 0.03 * k - 0.009, z + 0.01), (x + 0.041, y + 0.03 * k + 0.009, z + 0.15))
                    bx('BagCorn', 'popcorn', (x - 0.03, y - 0.05, z + 0.155), (x + 0.03, y + 0.05, z + 0.185), r=0.012)


BUILD = {'popcorn_kettle': popcorn_kettle, 'drinks_tower': drinks_tower, 'espresso_lever': espresso_lever, 'till_pos': till_pos,
         'tub_stack': tub_stack, 'bar_walnut': bar_walnut, 'chandelier_deco': chandelier_deco, 'popcorn_case': popcorn_case}


def reset():
    for o in list(bpy.data.objects): bpy.data.objects.remove(o)
    for m in list(bpy.data.meshes): bpy.data.meshes.remove(m)
    PARTS.clear()


bpy.ops.wm.read_factory_settings(use_empty=True)
os.makedirs(A.out, exist_ok=True)
report = []
for name, fn in BUILD.items():
    if A.only and name not in A.only.split(','): continue
    reset(); fn(); report.append(lbl.export(name, A.out))
for r in report: print('ZONES12', r['asset'], r['tris'][0], 'tris', r['parts'], 'parts', r['bytes'] // 1024, 'KB', [[round(v, 3) for v in c] for c in r['bbox_blender']])
