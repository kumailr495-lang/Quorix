"""LUMIERE v11 - the taxi's cabin as you see it from the back seat during the Story arrival (www/js/intro9.js). It replaces the cabin
intro9.js built out of plain boxes, capsules and a ball-headed driver (the user, 2026-11-15: "i wont accept a single mistake for poor model
makings ... remake those you have made poorly"). The driver is now a real person (people.js, seated, hands on the wheel); this file is the car.

    blender --background --factory-startup --python tools/blender/cabin.py -- --out www/models

Frame: the intro's car frame. Blender +X = the car's nose (engine +Z), +Y = its left, the kerb side (engine +X), +Z up; origin on the road
under the middle of the car (assets.js turns Blender +X into engine +Z). Right-hand drive: the driver sits at Y = -0.36. Positions match
intro9.js: the eye at (-0.6, 0.07, 1.235), the wheel's centre (0.56, -0.36, 0.97), the centre screen (0.628, 0, 0.98), the meter
(0.66, 0.25, 1.03), the dials on the binnacle's face at X = 0.618 (their light is intro9.js cabinGlow, drawn just proud of the faces here).
Parts follow the house rules (CLAUDE.md, v11): every part touches the floor slab through its neighbours (set 2 mm or more into them, never
ending in their planes), layered faces stand 5 mm or more apart. Upholstery is lbl.pillow (subdivided cages); the dashboard is a loft of
one section along the car's width with a slight plan curve; the bonnet beyond the glass follows the taxi's own profile (cars.py b_top)."""
import bpy, bmesh, math, sys, os, argparse, json
from mathutils import Vector, Matrix
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lbl
from lbl import part, rb, pillow, lathe, disc, T, RY, PARTS

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ap = argparse.ArgumentParser(); ap.add_argument('--out', default='www/models'); A = ap.parse_args(argv)
for k, v in {'leather_tan': ((0.19, 0.13, 0.085), 0.45, 0.0), 'plastic_matte': ((0.042, 0.042, 0.05), 0.85, 0.0),
             'plastic_dark': ((0.013, 0.013, 0.015), 0.85, 0.0), 'headliner': ((0.32, 0.29, 0.25), 0.95, 0.0),
             'carpet_cabin': ((0.025, 0.025, 0.028), 1.0, 0.0), 'gloss_black': ((0.004, 0.004, 0.005), 0.12, 0.0),
             'car_yellow': ((0.78, 0.45, 0.02), 0.22, 0.0)}.items():
    lbl.MAT_DEF.setdefault(k, v)
L0 = 0
RX = lambda deg: Matrix.Rotation(math.radians(deg), 4, 'X')


def frame(o, z, x_hint=(0.0, 1.0, 0.0)):
    """a placement whose local +Z runs along z (a lathe's axis) and local +X along x_hint made square to it"""
    z = Vector(z).normalized(); x = Vector(x_hint)
    if abs(x.normalized().dot(z)) > 0.95: x = Vector((1.0, 0.0, 0.0)) if abs(z.x) < 0.9 else Vector((0.0, 0.0, 1.0))   # a hint along the axis gives no side
    x = (x - z * x.dot(z)).normalized(); y = z.cross(x)
    m = Matrix.Identity(4)
    for i in range(3): m[i][0], m[i][1], m[i][2], m[i][3] = x[i], y[i], z[i], o[i]
    return m


def rod(bm, a, b, r, sides=10):
    """closed cylinder from a to b (both ends capped with a centre vertex)"""
    a, b = Vector(a), Vector(b); d = (b - a); L = d.length; m = frame(a, d)
    tmp = bmesh.new(); lathe(tmp, [(1e-4, 0.0), (r, 0.0), (r, L), (1e-4, L)], sides); tmp.transform(m)
    me = bpy.data.meshes.new('_rod'); tmp.to_mesh(me); tmp.free(); bm.from_mesh(me); bpy.data.meshes.remove(me)


# ---------------------------------------------------------------- the taxi's body profile (tools/blender/cars.py), for the bonnet
def curve(xs, ys):
    X, Y = list(xs), list(ys)
    def f(x):
        if x <= X[0]: return Y[0]
        if x >= X[-1]: return Y[-1]
        i = max(k for k in range(len(X) - 1) if X[k] <= x); x0, x1, y0, y1 = X[i], X[i + 1], Y[i], Y[i + 1]; t = (x - x0) / (x1 - x0)
        m0 = (Y[i + 1] - Y[i - 1]) / (X[i + 1] - X[i - 1]) * (x1 - x0) if i > 0 else y1 - y0
        m1 = (Y[i + 2] - Y[i]) / (X[i + 2] - X[i]) * (x1 - x0) if i + 2 < len(X) else y1 - y0
        return (2 * t ** 3 - 3 * t * t + 1) * y0 + (t ** 3 - 2 * t * t + t) * m0 + (-2 * t ** 3 + 3 * t * t) * y1 + (t ** 3 - t * t) * m1
    return f


BX = [-2.33, -2.29, -2.20, -2.00, -1.60, -1.10, 0.0, 0.95, 1.45, 1.85, 2.12, 2.27, 2.33]
b_top = curve(BX, [0.66, 0.80, 0.90, 0.95, 0.965, 0.962, 0.95, 0.925, 0.875, 0.815, 0.755, 0.69, 0.60])
b_hw = curve(BX, [0.62, 0.78, 0.85, 0.885, 0.90, 0.905, 0.91, 0.905, 0.90, 0.885, 0.85, 0.77, 0.62])

# ---------------------------------------------------------------- dashboard: one closed section lofted across the car, 2 cm further
# back in the middle than at the doors; it runs 1 cm into each front door card
DASH = [(1.08, 0.62), (1.08, 0.955), (0.98, 0.985), (0.84, 0.995), (0.72, 0.985), (0.665, 0.965), (0.645, 0.935), (0.640, 0.88),
        (0.648, 0.78), (0.672, 0.68), (0.70, 0.62)]
DW = 0.745
plan = lambda y: -0.02 * (1 - (y / DW) ** 2)


def face_x(y, z):
    """the dashboard's face (the side you look at) at height z over y"""
    pts = DASH[5:10]
    for (x0, z0), (x1, z1) in zip(pts, pts[1:]):
        if min(z0, z1) <= z <= max(z0, z1): return x0 + (x1 - x0) * (z - z0) / (z1 - z0) + plan(y)
    return 0.645 + plan(y)


def dash(bm):
    ys = [-DW + 2 * DW * i / 16 for i in range(17)]
    rings = [[bm.verts.new((x + plan(y), y, z)) for x, z in DASH] for y in ys]
    n = len(DASH)
    for a, b in zip(rings, rings[1:]):
        for k in range(n): bm.faces.new((a[k], a[(k + 1) % n], b[(k + 1) % n], b[k]))
    bm.faces.new(rings[0]); bm.faces.new(list(reversed(rings[-1])))


def bonnet(bm):
    """the bonnet ahead of the glass (black: the taxi is black and yellow): 2 cm thick, crowned across, on the taxi's own top line"""
    xs = [1.10 + (2.30 - 1.10) * i / 14 for i in range(15)]; nv = 12
    top = lambda x, v: (x, v * (b_hw(x) - 0.05), b_top(x) - 0.035 * v * v)
    grid = []
    for x in xs:
        row = [top(x, -1 + 2 * j / nv) for j in range(nv + 1)]
        grid.append([bm.verts.new(p) for p in row] + [bm.verts.new((p[0], p[1], p[2] - 0.02)) for p in reversed(row)])
    m = len(grid[0])
    for a, b in zip(grid, grid[1:]):
        for k in range(m): bm.faces.new((a[k], b[k], b[(k + 1) % m], a[(k + 1) % m]))
    bm.faces.new(grid[0]); bm.faces.new(list(reversed(grid[-1])))


def build():
    # floor, footwell wall, mats
    part('Floor', L0, 'carpet_cabin', rb((2.62, 1.50, 0.03), 0.01, at=(-0.16, 0, 0.285)))
    part('Firewall', L0, 'plastic_dark', rb((0.04, 1.46, 0.40), 0.01, at=(1.10, 0, 0.47)))
    for x in (0.86, -0.30):
        for s in (1, -1): part('Mat', L0, 'rubber', rb((0.44, 0.40, 0.012), 0.004, at=(x, s * 0.36, 0.30)))
    # dashboard, binnacle pod, centre screen bezel, the meter on its stand, vents (a frame with three bright slats)
    part('Dash', L0, 'plastic_matte', dash)
    part('Binnacle', L0, 'plastic_dark', pillow((0.16, 0.38, 0.12), e=0.02, crown=[(2, 1, 0.01)]), T(0.702, -0.36, 1.01))
    part('Screen', L0, 'gloss_black', rb((0.025, 0.28, 0.18), 0.008), T(0.628, 0, 0.98) @ RY(9.17))
    part('MeterStand', L0, 'plastic_dark', rb((0.04, 0.05, 0.06), 0.008, at=(0.668, 0.25, 0.99)))
    part('Meter', L0, 'gloss_black', rb((0.05, 0.13, 0.055), 0.008, at=(0.66, 0.25, 1.03)))
    for y in (-0.62, -0.20, 0.20, 0.62):
        fx = face_x(y, 0.92)
        part('Vent', L0, 'plastic_dark', rb((0.03, 0.10, 0.055), 0.006, at=(fx + 0.004, y, 0.92)))
        for dz in (-0.014, 0.0, 0.014): part('Slat', L0, 'chrome', rb((0.012, 0.09, 0.005), 0.002, at=(fx - 0.011, y, 0.92 + dz)))   # 6 mm proud of the frame's face, 6 mm into it
    for s in (1, -1): part('Knob', L0, 'chrome', lambda bm, s=s: lathe(bm, [(1e-4, 0.0), (0.018, 0.0), (0.018, 0.022), (1e-4, 0.024)], 16), frame((face_x(0.0, 0.80) + 0.01, s * 0.07, 0.80), (-1, 0, 0)))
    # steering wheel on its column (the column rises from the dash toward the driver; the rim's top leans toward the dash)
    C = Vector((0.56, -0.36, 0.97)); ax = Vector((-0.92, 0.0, 0.39)).normalized(); u = Vector((0.0, 1.0, 0.0)); up = ax.cross(u).normalized() * -1
    if up.z < 0: up = -up
    def rim(bm):   # a torus in the wheel's own frame (lbl.tube's ring frame flips where the tangent turns steep, folding the rings)
        nseg, nside, rings = 36, 12, []
        for k in range(nseg):
            a_ = 2 * math.pi * k / nseg; rad = u * math.cos(a_) + up * math.sin(a_); c = C + rad * 0.185
            rings.append([bm.verts.new(c + (rad * math.cos(2 * math.pi * j / nside) + ax * math.sin(2 * math.pi * j / nside)) * 0.017) for j in range(nside)])
        for k in range(nseg):
            r0, r1 = rings[k], rings[(k + 1) % nseg]
            for j in range(nside): bm.faces.new((r0[j], r0[(j + 1) % nside], r1[(j + 1) % nside], r1[j]))
    part('Rim', L0, 'leather_black', rim)
    for ang in (0.0, 180.0, 270.0):
        d = u * math.cos(math.radians(ang)) + up * math.sin(math.radians(ang)); mid = C + d * 0.105 - ax * 0.004
        part('Spoke', L0, 'plastic_dark', rb((0.15, 0.034, 0.016), 0.006), frame(mid, ax, tuple(d)))
    part('Hub', L0, 'leather_black', lambda bm: lathe(bm, [(1e-4, -0.022), (0.052, -0.022), (0.06, 0.0), (0.052, 0.026), (1e-4, 0.03)], 24), frame(C, ax))
    part('Column', L0, 'plastic_dark', lambda bm: rod(bm, C - ax * 0.30, C - ax * 0.015, 0.036, 16))
    for s in (1, -1): part('Stalk', L0, 'plastic_dark', lambda bm, s=s: rod(bm, C - ax * 0.10 + Vector((0, 0.02 * s, 0)), C - ax * 0.10 + Vector((-0.02, 0.11 * s, -0.01)), 0.007, 8))
    # centre console: body on the floor and into the dash, gear selector, two cup holders, a leather armrest
    part('Console', L0, 'plastic_matte', pillow((0.95, 0.22, 0.36), e=0.02), T(0.26, 0, 0.46))
    part('GearGate', L0, 'chrome', lambda bm: lathe(bm, [(0.028, 0.636), (0.04, 0.636), (0.04, 0.646), (0.028, 0.646)], 24), T(0.42, 0, 0))
    part('GearStalk', L0, 'chrome', lambda bm: lathe(bm, [(1e-4, 0.60), (0.012, 0.60), (0.012, 0.72), (1e-4, 0.72)], 12), T(0.42, 0, 0))
    part('GearKnob', L0, 'leather_black', lambda bm: lathe(bm, [(1e-4, 0.705)] + [(0.026 * math.sin(math.pi * k / 10), 0.73 - 0.026 * math.cos(math.pi * k / 10)) for k in range(1, 10)] + [(1e-4, 0.756)], 16), T(0.42, 0, 0))
    for x in (0.19, 0.29): lbl.cup_holder(L0, x, 0.0, 0.64, 'chrome', r_out=0.04, name='Cup')
    part('Armrest', L0, 'leather_tan', pillow((0.36, 0.20, 0.06), e=0.015, crown=[(2, 1, 0.008)]), T(-0.02, 0, 0.665))
    # front seats, on a real sedan's package (v12, the user: "his head is sticking up through the taxi"): the roof lining is at 1.41 (3.5 cm of
    # roof under the taxi's 1.445 m top; it was 1.438), a 1.67 m man (the avatars are 1.9 m: the driver is scaled, intro9.js DRV) measures
    # 0.80 m from his hip joint to the top of his head with the back at 18 degrees, his hip sits 8 cm over the compressed cushion and he
    # needs 6 cm of headroom, so the cushion's top is at 0.455 (it was 0.60); the hip point sits 0.40 m behind the wheel's centre (it was 0.18), so the
    # seat is 12 cm further back. Base, cushion with side bolsters, back leaning 18 degrees with wings, its upholstered rear shell and a map
    # pocket (what the back seat sees), a headrest on two chrome posts
    for s in (1, -1):
        y0 = 0.36 * s
        part('SeatBase', L0, 'plastic_dark', rb((0.44, 0.44, 0.09), 0.02, at=(0.32, y0, 0.345)))
        part('Cushion', L0, 'leather_tan', pillow((0.50, 0.50, 0.13), e=0.02, crown=[(2, 1, 0.012)], shape=lambda c: (c.x, c.y, c.z + 0.022 * (abs(c.y) / 0.25) ** 4 * (c.z > 0)), extra=((), (-0.16, 0.16), ())), T(0.32, y0, 0.385))
        B = T(0.025, y0, 0.744) @ RY(-18)
        part('Back', L0, 'leather_tan', pillow((0.12, 0.50, 0.64), e=0.02, crown=[(0, 1, 0.015)], shape=lambda c: (c.x + 0.03 * (abs(c.y) / 0.25) ** 4, c.y, c.z), extra=((), (-0.16, 0.16), (-0.1, 0.1))), B)
        part('BackShell', L0, 'leather_tan', pillow((0.03, 0.46, 0.56), e=0.012, crown=[(0, -1, 0.006)]), B @ T(-0.065, 0, -0.01))
        part('Pocket', L0, 'leather_chocolate', pillow((0.02, 0.36, 0.20), e=0.008), B @ T(-0.084, 0, -0.14))
        part('Headrest', L0, 'leather_tan', pillow((0.11, 0.27, 0.20), e=0.05, crown=[(0, 1, 0.012), (0, -1, 0.006), (2, 1, 0.01)], levels=2), T(-0.117, y0, 1.181) @ RY(-10))
        for dy in (-0.07, 0.07): part('Post', L0, 'chrome', lambda bm: lathe(bm, [(1e-4, 1.00), (0.0065, 1.00), (0.0065, 1.13), (1e-4, 1.13)], 10), T(-0.085, y0 + dy, 0))
    # the rear bench you sit on
    part('RearBase', L0, 'plastic_dark', rb((0.48, 1.38, 0.17), 0.02, at=(-0.76, 0, 0.375)))
    part('RearCushion', L0, 'leather_tan', pillow((0.52, 1.40, 0.14), e=0.02, crown=[(2, 1, 0.012)], creases=[(2, 1, 1, -0.23, 0.008, 0.012), (2, 1, 1, 0.23, 0.008, 0.012)]), T(-0.76, 0, 0.525))
    part('RearBack', L0, 'leather_tan', pillow((0.13, 1.40, 0.62), e=0.02, crown=[(0, 1, 0.015)]), T(-1.07, 0, 0.87) @ RY(-14))
    # doors: a card each (front and rear), the soft ledge under the glass, an armrest, a chrome pull, a speaker; the switch pack up front
    for s in (1, -1):
        for xc, ln, arm in ((0.545, 0.96, 0.36), (-0.625, 1.20, -0.55)):
            part('DoorCard', L0, 'plastic_matte', rb((ln, 0.05, 0.66), 0.012, at=(xc, s * 0.76, 0.61)))
            part('Ledge', L0, 'leather_black', rb((ln - 0.02, 0.08, 0.04), 0.012, at=(xc, s * 0.745, 0.945)))
            part('DoorArm', L0, 'leather_tan', pillow((0.40, 0.08, 0.05), e=0.015, crown=[(2, 1, 0.006)]), T(arm, s * 0.71, 0.74))
            part('Pull', L0, 'chrome', rb((0.12, 0.03, 0.025), 0.008, at=(arm + 0.12, s * 0.725, 0.84)))
            part('Speaker', L0, 'plastic_dark', lambda bm: lathe(bm, [(1e-4, 0.0), (0.075, 0.0), (0.075, 0.012), (1e-4, 0.012)], 24), frame((arm, s * 0.741, 0.45), (0, -s, 0)))   # 6 mm into the card, 6 mm proud
        part('Switches', L0, 'gloss_black', rb((0.10, 0.05, 0.012), 0.004, at=(0.43, s * 0.71, 0.767)))
    # pillars, roof rails, headliner, header over the windscreen, sun visors, grab handles, rear-view mirror, the map light
    for s in (1, -1):
        part('APillar', L0, 'plastic_matte', lambda bm, s=s: rod(bm, (1.03, s * 0.70, 0.94), (0.41, s * 0.62, 1.417), 0.035, 10))
        part('BPillar', L0, 'plastic_matte', rb((0.10, 0.08, 0.56), 0.02, at=(0.02, s * 0.735, 1.19)))
        part('CPillar', L0, 'plastic_matte', rb((0.30, 0.09, 0.56), 0.03, at=(-1.25, s * 0.72, 1.19)))
        part('RoofRail', L0, 'headliner', rb((2.0, 0.09, 0.07), 0.02, at=(-0.45, s * 0.705, 1.412)))
        part('Visor', L0, 'headliner', pillow((0.16, 0.36, 0.022), e=0.008), T(0.36, s * 0.36, 1.408))
        part('GripBar', L0, 'plastic_dark', rb((0.20, 0.03, 0.03), 0.012, at=(-0.55, s * 0.665, 1.352)))
        for dx in (-0.08, 0.08): part('GripLeg', L0, 'plastic_dark', rb((0.02, 0.02, 0.055), 0.006, at=(-0.55 + dx, s * 0.665, 1.3745)))   # 5 mm inside the bar's sides, 1 cm inside its ends
    part('Headliner', L0, 'headliner', pillow((1.95, 1.40, 0.04), e=0.015, crown=[(2, -1, 0.012)]), T(-0.48, 0, 1.442))
    part('Header', L0, 'headliner', rb((0.16, 1.36, 0.06), 0.02, at=(0.45, 0, 1.412)))
    part('MirrorStalk', L0, 'plastic_dark', rb((0.03, 0.03, 0.08), 0.008, at=(0.50, 0, 1.392)))
    part('MirrorBody', L0, 'plastic_dark', rb((0.035, 0.24, 0.07), 0.02, at=(0.50, 0, 1.332)))
    part('MirrorGlass', L0, 'gloss_black', rb((0.008, 0.22, 0.055), 0.015, at=(0.4805, 0, 1.332)))   # at night it shows the dark rear window
    part('MapLight', L0, 'plastic_matte', rb((0.10, 0.16, 0.02), 0.006, at=(0.30, 0, 1.417)))
    # beyond the glass: the scuttle under the wipers and the yellow bonnet on the taxi's own lines
    part('Scuttle', L0, 'plastic_dark', rb((0.10, 1.46, 0.04), 0.01, at=(1.11, 0, 0.92)))
    for y in (-0.32, 0.36): part('WiperPivot', L0, 'plastic_dark', lambda bm: lathe(bm, [(1e-4, 0.95), (0.02, 0.95), (0.02, 0.982), (0.012, 0.99), (1e-4, 0.99)], 16), T(1.04, y, 0))   # the blades (intro9.js) turn on these
    part('Bonnet', L0, 'gloss_black', bonnet)   # v12: the taxi is black and yellow (kaali-peeli): its bonnet is black


os.makedirs(A.out, exist_ok=True)
for o in list(bpy.data.objects): bpy.data.objects.remove(o)
build()
print(json.dumps(lbl.export('taxi_cabin', A.out), indent=1))
