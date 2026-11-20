"""LUMIERE v14 - the lobby's most-seen small props rebuilt (the user, 11-20: "fix the models and make them high quality meshes, curved,
detailed, 3D ... research before you make them"). Each replaces a v7-v10 Kiln box model under the same name, so every placement stays.
References (docs/V14-MODELS.md):
  bin_brass      a dome-top push-door receptacle (hotel and cinema lobbies: about 38 cm across, 74-91 cm tall, a 19 x 22 cm door):
                 a black lacquer drum with 24 stopped flutes, a brass kick ring 3 cm off the floor over a recessed plinth, a brass band,
                 a brass dome with a finial and a hood on its front: a brass frame round a dark mouth and a brass push flap hung from
                 its top edge (FLAP_* below: world9.js swings it when something is binned)
  bench_velvet   a diamond-tufted velvet bench (lobby benches: 45-46 cm to the top, 45-50 cm deep): a boxed cushion with deep buttons
                 on a diamond lattice (rows 14 cm apart, buttons 20 cm apart, rows offset 10 cm), welt piping round its top and bottom
                 edges, on a walnut apron with a brass bead and six tapered walnut legs in brass sabots
  poster_totem   a double-sided poster lightbox (a 27 x 40 in one-sheet in a 1.25 in frame is 73 x 106 cm; ours shows 80 x 122 cm):
                 a black lacquer body with round vertical edges, a brass bezel round each face's poster (the engine draws the poster
                 7 mm in front of the body: world9.js TOTEM_POSTERS), a gold light line under a brass crown, a Nero Marquina plinth on a
                 recessed shadow gap
  planter_tall   a snake plant (Sansevieria): eleven broad, keeled, upright leaves in two greens out of moss-dark soil with pebbles,
                 in a fluted black planter with a brass rim and a brass foot ring
  popcorn_cart   a vintage popcorn wagon (spoked-wheel trolleys sized for a 21 x 18 in popper): a red lacquer cabinet with brass-beaded
                 panels, two big spoked wheels at one end and turned legs at the other, a push handle, a glass case in a brass frame with
                 a stainless kettle hung from the roof (lid halves up), a heap of popcorn, a warm lamp, a red roof with a brass cornice
                 and a cream crest board

    blender --background --factory-startup --python tools/blender/props14.py -- --out www/models [--only NAME]
    then: sh tools/optimize-models.sh; blender --background --factory-startup --python tools/blender/glb_check.py -- www/models/<name>.glb

Frame: +X the front (the engine's +Z at yaw 0), +Y left, +Z up, the floor at Z = 0. Parts embed 2 mm or more into what they join;
parallel faces of different parts are 5 mm or more apart (zcheck)."""
import bpy, bmesh, math, sys, os, argparse, random
from mathutils import Vector, Matrix
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lbl
from lbl import T, RY, RZ, lathe, rb, part, PARTS

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ap = argparse.ArgumentParser(); ap.add_argument('--out', default='www/models'); ap.add_argument('--only', default='')
A = ap.parse_args(argv)
for k, v in {'lacquer_red': ((0.30, 0.012, 0.016), 0.16, 0.0), 'lacquer_cream': ((0.75, 0.68, 0.55), 0.2, 0.0), 'popcorn': ((0.85, 0.70, 0.36), 0.8, 0.0),
             'steel': ((0.55, 0.56, 0.58), 0.35, 1.0), 'paint_black': ((0.006, 0.006, 0.007), 0.7, 0.0), 'marble_nero': ((0.02, 0.02, 0.022), 0.25, 0.0),
             'plant': ((0.03, 0.09, 0.025), 0.55, 0.0), 'leaves': ((0.016, 0.04, 0.012), 0.6, 0.0), 'soil': ((0.02, 0.014, 0.01), 0.95, 0.0),
             'stone_light': ((0.6, 0.57, 0.53), 0.7, 0.0), 'velvet_teal': ((0.012, 0.10, 0.09), 0.9, 0.0), 'tyre': ((0.01, 0.01, 0.01), 0.9, 0.0)}.items():
    lbl.MAT_DEF.setdefault(k, v)
RX = lambda deg: Matrix.Rotation(math.radians(deg), 4, 'X')
smooth01 = lambda e0, e1, x: (lambda t: t * t * (3 - 2 * t))(min(1.0, max(0.0, (x - e0) / (e1 - e0))))


# ------------------------------------------------------------------------------------------------ small builders
def bx(name, mat, a, b, r=0.0, M=None):
    """a box from corner a to corner b (r > 0 rounds its edges), placed by M after"""
    size = tuple(b[i] - a[i] for i in range(3)); c = tuple((a[i] + b[i]) / 2 for i in range(3)); M = M or Matrix.Identity(4)
    if r > 0: return part(name, 0, mat, rb(size, r), M @ T(*c))
    def build(bm):
        bmesh.ops.create_cube(bm, size=1.0); bm.transform(Matrix.Diagonal((*size, 1.0)))
    return part(name, 0, mat, build, M @ T(*c), smooth=False)


def lat(name, mat, profile, M, seg=24, smooth=True):
    return part(name, 0, mat, lambda bm: lathe(bm, profile, seg), M, smooth=smooth)


def fluted(zs, rfun, seg):
    """a closed solid of revolution whose radius varies round the axis as well: rfun(theta, z); rings at the heights zs, fans at the ends"""
    def build(bm):
        R = [[bm.verts.new((rfun(2 * math.pi * k / seg, z) * math.cos(2 * math.pi * k / seg), rfun(2 * math.pi * k / seg, z) * math.sin(2 * math.pi * k / seg), z))
              for k in range(seg)] for z in zs]
        for i in range(len(zs) - 1):
            for k in range(seg): k2 = (k + 1) % seg; bm.faces.new((R[i][k], R[i][k2], R[i + 1][k2], R[i + 1][k]))
        c0 = bm.verts.new((0, 0, zs[0])); c1 = bm.verts.new((0, 0, zs[-1]))
        for k in range(seg): k2 = (k + 1) % seg; bm.faces.new((c0, R[0][k2], R[0][k])); bm.faces.new((c1, R[-1][k], R[-1][k2]))
    return build


def flute_r(R, n, depth, z0, z1, fade=0.04):
    """radius round a fluted drum: n concave flutes with flat fillets between them, stopped (faded) within `fade` of z0 and z1"""
    def f(th, z):
        ph = (th * n / (2 * math.pi)) % 1.0; s = math.sin(math.pi * (ph - 0.12) / 0.76) if 0.12 < ph < 0.88 else 0.0
        return R - depth * max(0.0, s) * smooth01(z0, z0 + fade, z) * (1 - smooth01(z1 - fade, z1, z))
    return f


def tube(name, mat, pts, radius, sides=8, closed=False):
    if closed: return part(name, 0, mat, lambda bm: lbl.tube(bm, pts, radius, sides, closed=True))
    return part(name, 0, mat, lambda bm: lbl.ptube(bm, pts, radius, sides))


def corn(pieces, seed):
    """popped kernels: jittered icosahedra (20 faces each) at (x, y, z, r)"""
    def build(bm):
        rnd = random.Random(seed)
        for (x, y, z, r) in pieces:
            g = bmesh.ops.create_icosphere(bm, subdivisions=0, radius=1.0)
            q = Matrix.Rotation(rnd.uniform(0, 6.28), 3, 'Z') @ Matrix.Rotation(rnd.uniform(0, 6.28), 3, 'X')
            for v in g['verts']: v.co = Vector((x, y, z)) + q @ (v.co * r * rnd.uniform(0.75, 1.3))
    return build


# ------------------------------------------------------------------------------------------------ bin_brass
# world9.js swings the flap about its hinge (its top edge): the hinge's centre in this frame and the hood's tilt
HOOD_TILT = 6.0                           # degrees the hood's face leans back from vertical (the dome's straight lower wall)
HOOD_C = (0.197, 0.0, 0.716)              # the hood's centre: on the dome's front, 0.716 m up
FLAP_W, FLAP_H = 0.172, 0.082             # the flap (the mouth is 0.19 x 0.10)


def bin_brass():
    R = 0.2
    part('Plinth', 0, 'paint_black', lambda bm: lathe(bm, [(1e-4, 0.0), (0.172, 0.0), (0.172, 0.112), (1e-4, 0.112)], 40))   # 3 cm shadow gap under the kick ring; the drum stands in it
    lat('Kick', 'brass', [(0.186, 0.03), (0.206, 0.03), (0.213, 0.04), (0.2145, 0.07), (0.213, 0.1), (0.206, 0.11), (0.186, 0.11)], Matrix.Identity(4), 44)
    part('Drum', 0, 'lacquer_black', fluted([0.1, 0.13, 0.16, 0.54, 0.57, 0.6], flute_r(R, 24, 0.0075, 0.13, 0.57, 0.035), 96))   # 24 stopped flutes
    lat('Band', 'brass', [(0.188, 0.578), (0.205, 0.578), (0.2125, 0.588), (0.2125, 0.632), (0.205, 0.642), (0.188, 0.642)], Matrix.Identity(4), 44)
    # a dome with a straight lower wall (the push door sits in it) rounding over to a low crown
    dome = [(1e-4, 0.632), (0.2075, 0.632), (0.2072, 0.68), (0.2045, 0.74), (0.198, 0.785), (0.183, 0.826), (0.158, 0.86), (0.122, 0.886), (0.078, 0.902), (0.034, 0.909), (1e-4, 0.91)]
    lat('Dome', 'brass', dome, Matrix.Identity(4), 48)
    lat('Finial', 'brass', [(1e-4, 0.905), (0.013, 0.905), (0.017, 0.915), (0.0155, 0.928), (0.008, 0.935), (1e-4, 0.937)], Matrix.Identity(4), 16)
    # the hood: a brass frame round the mouth, 1-1.5 cm proud of the dome, its back 7 cm into it
    H = T(*HOOD_C) @ RY(-HOOD_TILT)            # local: +X out of the face, Y across, Z up the face
    w, h, b, d0, d1 = 0.19, 0.10, 0.022, -0.07, 0.017
    for s in (-1, 1):
        bx('HoodSide', 'brass', (d0, s * (w / 2) - (b if s < 0 else 0), -h / 2 - b), (d1, s * (w / 2) + (b if s > 0 else 0), h / 2 + b), r=0.007, M=H)
        bx('HoodRail', 'brass', (d0, -w / 2 + 0.002, h / 2 if s > 0 else -h / 2 - b), (d1 - 0.003, w / 2 - 0.002, h / 2 + b if s > 0 else -h / 2), r=0.006, M=H)
    bx('Mouth', 'paint_black', (d0 + 0.004, -w / 2 - 0.003, -h / 2 - 0.003), (-0.017, w / 2 + 0.003, h / 2 + 0.003), M=H)        # the dark inside, 34 mm behind the frame's face
    # the flap: hung from the mouth's top edge, 12 mm behind the frame's face, a gap of 9 mm all round it; a pull lip at its foot
    F = H @ T(-0.001, 0, h / 2 - 0.009)
    bx('Flap', 'brass', (-0.004, -FLAP_W / 2, -FLAP_H), (0.002, FLAP_W / 2, 0.0), r=0.0015, M=F)
    bx('FlapLip', 'brass', (0.0, -0.035, -FLAP_H + 0.004), (0.009, 0.035, -FLAP_H + 0.016), r=0.003, M=F)


# ------------------------------------------------------------------------------------------------ bench_velvet
BL, BD = 2.0, 0.49               # the cushion: 2.0 m long (Y), 0.49 m deep (X)
SU, SV = 0.10, 0.14              # the button lattice: rows 0.14 m apart, buttons 0.20 m apart along a row, rows offset 0.10 m
Z_CB, Z_CE, Z_CT = 0.222, 0.415, 0.432   # the cushion's bottom (5 mm into the apron), its boxed side's top edge, the top's mean


def tuft_z(u, v):
    """the cushion's top: a diamond lattice of deep buttons (a, b integers, a + b even); the cloth folds along the diamonds' edges
    (lines a - b and a + b even) and fills out between them; the tufting fades into a smooth roll within 6 cm of the edge"""
    a, bb = u / SU, v / SV
    c1 = abs((a - bb) / 2 - round((a - bb) / 2)) * 2; c2 = abs((a + bb) / 2 - round((a + bb) / 2)) * 2
    dl = min(c1, c2) / math.hypot(1 / SU, 1 / SV)                       # metres to the nearest fold line
    ra, rb_ = round(a), round(bb); db = 9.0
    for da in (-1, 0, 1):
        for dbb in (-1, 0, 1):
            ia, ib = ra + da, rb_ + dbb
            if (ia + ib) % 2 == 0: db = min(db, math.hypot((a - ia) * SU, (bb - ib) * SV))
    puff = 0.024 * (1 - math.exp(-(dl / 0.013) ** 2)) - 0.03 * math.exp(-(db / 0.028) ** 2)
    edge = min(BL / 2 - abs(u), BD / 2 - abs(v)); e = smooth01(0.0, 0.06, edge)
    crown = 0.010 * (1 - (2 * v / BD) ** 2) * (1 - (2 * u / BL) ** 8)
    return Z_CE + 0.004 + e * (Z_CT - Z_CE - 0.004 + crown + puff)


def bench_velvet():
    nu, nv = 80, 14                                          # 2.5 cm by 3.5 cm: every button and fold falls on the grid
    def cushion(bm):
        V = [[bm.verts.new((-BD / 2 + BD * j / nv, -BL / 2 + BL * i / nu, tuft_z(-BL / 2 + BL * i / nu, -BD / 2 + BD * j / nv))) for j in range(nv + 1)] for i in range(nu + 1)]
        for i in range(nu):
            for j in range(nv):
                a, bq, c, d = V[i][j], V[i + 1][j], V[i + 1][j + 1], V[i][j + 1]
                # split each quad along the fold that passes through it, so the folds read as clean valleys
                uu, vv = -BL / 2 + BL * (i + 0.5) / nu, -BD / 2 + BD * (j + 0.5) / nv; s = (uu / SU - vv / SV)
                if abs(s / 2 - round(s / 2)) < 0.25: bm.faces.new((a, bq, c)); bm.faces.new((a, c, d))
                else: bm.faces.new((a, bq, d)); bm.faces.new((bq, c, d))
        rim = [V[i][0] for i in range(nu + 1)] + [V[nu][j] for j in range(1, nv + 1)] + [V[i][nv] for i in range(nu - 1, -1, -1)] + [V[0][j] for j in range(nv - 1, 0, -1)]
        B = [bm.verts.new((v.co.x, v.co.y, Z_CB)) for v in rim]; m = len(rim)
        for k in range(m): bm.faces.new((rim[k], rim[(k + 1) % m], B[(k + 1) % m], B[k]))
        bm.faces.new(list(reversed(B)))
    part('Cushion', 0, 'velvet_teal', cushion)
    # deep buttons: velvet domes sunk into the dimples
    for ia in range(-9, 10):
        for ib in (-1, 0, 1):
            if (ia + ib) % 2: continue
            u, v = ia * SU, ib * SV
            if abs(u) > BL / 2 - 0.08 or abs(v) > BD / 2 - 0.08: continue
            z = tuft_z(u, v)
            lat('Button', 'velvet_teal', [(1e-4, z - 0.006), (0.011, z - 0.006), (0.0105, z + 0.002), (0.006, z + 0.0055), (1e-4, z + 0.0065)], T(v, u, 0), 8)
    # welt piping round the top edge and the bottom edge of the boxed side (5 mm proud of it: it hides the seams)
    for z in (Z_CE + 0.002, Z_CB + 0.016):
        tube('Welt', 'velvet_teal', lbl.rrect_path(BD / 2 + 0.002, BL / 2 + 0.002, 0.012, z, 3) + [lbl.rrect_path(BD / 2 + 0.002, BL / 2 + 0.002, 0.012, z, 3)[0]], 0.0065, 8, closed=True)
    # the apron (2 cm inside the cushion all round), its brass bead, six tapered legs in brass sabots
    bx('Apron', 'walnut', (-BD / 2 + 0.02, -BL / 2 + 0.02, 0.155), (BD / 2 - 0.02, BL / 2 - 0.02, 0.226), r=0.008)
    bx('Bead', 'brass', (BD / 2 - 0.024, -BL / 2 + 0.05, 0.168), (BD / 2 - 0.012, BL / 2 - 0.05, 0.176), r=0.003)
    for lx in (-BD / 2 + 0.07, BD / 2 - 0.07):
        for ly in (-BL / 2 + 0.08, 0.0, BL / 2 - 0.08):
            lat('Leg', 'walnut', [(1e-4, 0.03), (0.0165, 0.03), (0.0235, 0.158), (1e-4, 0.158)], T(lx, ly, 0), 10)
            lat('Sabot', 'brass', [(1e-4, 0.0), (0.0158, 0.0), (0.0175, 0.006), (0.0182, 0.042), (0.0165, 0.046), (1e-4, 0.046)], T(lx, ly, 0), 10)


# ------------------------------------------------------------------------------------------------ poster_totem
PT_FACE = 0.080                  # each face of the body (the engine's poster: 7 mm in front, at 0.087)
PT_W, PT_H, PT_Z = 0.80, 1.22, 1.26


def poster_totem():
    bx('Gap', 'paint_black', (-0.15, -0.46, 0.0), (0.15, 0.46, 0.026))                               # the shadow gap
    bx('Plinth', 'marble_nero', (-0.19, -0.52, 0.022), (0.19, 0.52, 0.095), r=0.012)                  # Nero Marquina
    bx('Body', 'lacquer_black', (-PT_FACE, -0.49, 0.09), (PT_FACE, 0.49, 1.905), r=0.03)
    bx('Crown', 'brass', (-0.098, -0.505, 1.9), (0.098, 0.505, 1.935), r=0.01)
    for s in (-1, 1):
        M = RZ(0 if s > 0 else 180)
        w, h, b = PT_W, PT_H, 0.034
        for k in (-1, 1):
            bx('Bezel', 'brass', (PT_FACE - 0.006, k * (w / 2) - (b if k < 0 else 0), PT_Z - h / 2 - b), (PT_FACE + 0.013, k * (w / 2) + (b if k > 0 else 0), PT_Z + h / 2 + b), r=0.005, M=M)
            bx('Bezel', 'brass', (PT_FACE - 0.006, -w / 2 + 0.002, PT_Z + h / 2 if k > 0 else PT_Z - h / 2 - b), (PT_FACE + 0.0105, w / 2 - 0.002, PT_Z + h / 2 + b if k > 0 else PT_Z - h / 2), r=0.004, M=M)
        bx('Marquee', 'glow_gold', (PT_FACE - 0.004, -0.4, 1.8), (PT_FACE + 0.005, 0.4, 1.812), M=M)        # a light line under the crown
        bx('Plate', 'brass', (PT_FACE - 0.004, -0.16, 0.42), (PT_FACE + 0.006, 0.16, 0.47), r=0.004, M=M)   # a brass name plate low on each face


# ------------------------------------------------------------------------------------------------ planter_tall
def planter_tall():
    part('Pot', 0, 'lacquer_black', fluted([0.03, 0.06, 0.32, 0.585, 0.605], lambda th, z: (0.178 + 0.052 * (z - 0.03) / 0.575) - 0.008 * max(0.0, math.sin(math.pi * (((th * 16 / (2 * math.pi)) % 1.0) - 0.15) / 0.7)) * smooth01(0.04, 0.09, z) * (1 - smooth01(0.54, 0.58, z)) if 0.15 < (th * 16 / (2 * math.pi)) % 1.0 < 0.85 else (0.178 + 0.052 * (z - 0.03) / 0.575), 48))
    lat('Foot', 'brass', [(0.15, 0.0), (0.176, 0.0), (0.182, 0.008), (0.182, 0.034), (0.176, 0.04), (0.15, 0.04)], Matrix.Identity(4), 40)
    lat('Rim', 'brass', [(0.212, 0.584), (0.229, 0.584), (0.236, 0.594), (0.236, 0.618), (0.229, 0.626), (0.212, 0.626)], Matrix.Identity(4), 40)
    lat('Soil', 'soil', [(1e-4, 0.58), (0.214, 0.58), (0.214, 0.6), (0.12, 0.607), (1e-4, 0.61)], Matrix.Identity(4), 24)
    rnd = random.Random(14)
    part('Pebbles', 0, 'stone_light', corn([(r_ * math.cos(a_), r_ * math.sin(a_), 0.604, rnd.uniform(0.012, 0.02)) for a_, r_ in [(rnd.uniform(0, 6.28), rnd.uniform(0.13, 0.19)) for _ in range(9)]], 3))
    # thirteen leaves: keeled blades, widest a third of the way up, arching out and turning a little, pointed tips
    def leaf(bm, base, yaw, lean, L, W, twist, arc):
        rows = 9; ring = []
        for i in range(rows + 1):
            s = i / rows
            wdt = W * (0.55 + 0.45 * min(1.0, s * 3.5)) * (1 - s ** 2.2) ** 0.55 if i < rows else 0.0
            th = 0.009 * (1 - s) + 0.002
            out = Vector((math.cos(yaw), math.sin(yaw), 0.0)); up = Vector((0, 0, 1))
            c = Vector(base) + up * (L * s) + out * (lean * L * s + arc * L * s * s)
            tang = (up * L + out * (lean * L + 2 * arc * L * s)).normalized()
            side = out.cross(up).normalized(); a = twist * s; side = (side * math.cos(a) + out * math.sin(a)); side = (side - tang * side.dot(tang)).normalized()
            nrm = tang.cross(side).normalized()
            if i < rows: ring.append([bm.verts.new(c - side * wdt / 2), bm.verts.new(c + nrm * (-0.9 * th)), bm.verts.new(c + side * wdt / 2), bm.verts.new(c - nrm * th)])
            else: ring.append(bm.verts.new(c))
        for i in range(rows - 1):
            a, b = ring[i], ring[i + 1]
            for k in range(4): bm.faces.new((a[k], a[(k + 1) % 4], b[(k + 1) % 4], b[k]))
        tip = ring[rows]; a = ring[rows - 1]
        for k in range(4): bm.faces.new((a[k], a[(k + 1) % 4], tip))
        bm.faces.new(list(reversed(ring[0])))
    rnd = random.Random(7)
    for k in range(11):
        yaw = 2 * math.pi * k / 11 + rnd.uniform(-0.2, 0.2); r0 = 0.03 + 0.07 * (k % 3) / 2
        base = (r0 * math.cos(yaw), r0 * math.sin(yaw), 0.585)
        L = 1.05 - 0.28 * (k % 3) / 2 + rnd.uniform(-0.05, 0.04); W = rnd.uniform(0.085, 0.11)
        part('Leaf', 0, 'plant' if k % 2 else 'leaves', lambda bm, b_=base, y_=yaw, l_=rnd.uniform(0.02, 0.08) + 0.05 * (k % 3), L_=L, W_=W, t_=rnd.uniform(-0.6, 0.6), a_=rnd.uniform(0.03, 0.09): leaf(bm, b_, y_, l_, L_, W_, t_, a_))


# ------------------------------------------------------------------------------------------------ popcorn_cart
CX0, CX1, CY = -0.37, 0.17, 0.48           # the cabinet: X from CX0 to CX1 (0.54 deep), Y +- CY (0.96 long)
CZ0, CZ1 = 0.2, 0.82                       # its bottom and top
WR, WY, WZ = 0.3, 0.24, 0.3                # the wheels: radius, their axle's Y, its height
GZ0, GZ1 = 0.857, 1.45                     # the glass case
KC, K_RIM = (-0.1, 0.12), 1.2              # the kettle's centre (x, y) and its rim's height (anim12.js CART reads these)


def wheel(x, side):
    M = T(x, WY, WZ) @ RY(90) if side > 0 else T(x, WY, WZ) @ RY(-90)      # the wheel's axis along X, out of the cabinet's side
    lat('Tyre', 'tyre', [(WR - 0.022, -0.016), (WR - 0.006, -0.018), (WR, -0.009), (WR, 0.009), (WR - 0.006, 0.018), (WR - 0.022, 0.016)], M, 48)
    lat('Felloe', 'lacquer_red', [(WR - 0.05, -0.013), (WR - 0.02, -0.013), (WR - 0.02, 0.013), (WR - 0.05, 0.013)], M, 48)
    lat('Hub', 'brass', [(1e-4, -0.045), (0.03, -0.045), (0.042, -0.025), (0.042, 0.02), (0.026, 0.04), (0.012, 0.05), (1e-4, 0.052)], M, 16)
    for k in range(12):
        a = 2 * math.pi * k / 12; d = Vector((math.cos(a), math.sin(a), 0.0))
        p0 = M @ (d * 0.032); p1 = M @ (d * (WR - 0.045))
        tube('Spoke', 'lacquer_red', [tuple(p0), tuple((p0 + p1) / 2), tuple(p1)], 0.0085, 6)
    bx('Axle', 'blackmetal', (-0.06, -0.02, -0.02), (0.0, 0.02, 0.02), M=M @ RY(90))


def popcorn_cart():
    # the cabinet: red lacquer, brass-beaded panels on its four sides, brass corner beads
    bx('Cabinet', 'lacquer_red', (CX0, -CY, CZ0), (CX1, CY, CZ1), r=0.018)
    for (x, s) in ((CX1, 1), (CX0, -1)):
        for (y0, y1) in ((-0.43, -0.15), (-0.13, 0.13), (0.15, 0.43)):
            if s < 0 and y0 > 0.1: continue                         # the back's third panel is behind the wheel
            pts = [(x + s * 0.004, y0, 0.29), (x + s * 0.004, y1, 0.29), (x + s * 0.004, y1, 0.74), (x + s * 0.004, y0, 0.74)]
            tube('Bead', 'brass', pts + [pts[0]], 0.0045, 6, closed=True)
    for y in (-CY, CY):
        pts = [(CX0 + 0.06, y + (0.004 if y > 0 else -0.004), 0.29), (CX1 - 0.06, y + (0.004 if y > 0 else -0.004), 0.29), (CX1 - 0.06, y + (0.004 if y > 0 else -0.004), 0.74), (CX0 + 0.06, y + (0.004 if y > 0 else -0.004), 0.74)]
        tube('Bead', 'brass', pts + [pts[0]], 0.0045, 6, closed=True)
    for x in (CX0 + 0.004, CX1 - 0.004):
        for y in (-CY + 0.004, CY - 0.004):
            bx('Corner', 'brass', (x - 0.012, y - 0.012, CZ0 + 0.02), (x + 0.012, y + 0.012, CZ1 - 0.02), r=0.008)
    bx('Skirt', 'brass', (CX0 - 0.006, -CY - 0.006, CZ0 + 0.012), (CX1 + 0.006, CY + 0.006, CZ0 + 0.032), r=0.006)
    # the counter top, the glass case on it: brass posts and rails, glass panes set 4 mm into them
    bx('Top', 'walnut', (CX0 - 0.03, -CY - 0.03, CZ1 - 0.005), (CX1 + 0.03, CY + 0.03, GZ0 + 0.002), r=0.01)
    gx0, gx1, gy = CX0 + 0.02, CX1 - 0.02, CY - 0.02
    for x in (gx0, gx1):
        for y in (-gy, gy):
            bx('Post', 'brass', (x - 0.014, y - 0.014, GZ0 - 0.004), (x + 0.014, y + 0.014, GZ1 + 0.004), r=0.004)
    for z in (GZ0 + 0.012, GZ1 - 0.012):
        for (a, b) in (((gx0, -gy + 0.012), (gx0 + 0.001, gy - 0.012)), ((gx1 - 0.001, -gy + 0.012), (gx1, gy - 0.012))):
            bx('Rail', 'brass', (a[0] - 0.011, a[1], z - 0.012), (b[0] + 0.011, b[1], z + 0.012), r=0.003)
        for y in (-gy, gy):
            bx('Rail', 'brass', (gx0 + 0.012, y - 0.011, z - 0.012), (gx1 - 0.012, y + 0.011, z + 0.012), r=0.003)
    for x in (gx0, gx1):
        bx('Pane', 'glass', (x - 0.003, -gy + 0.01, GZ0 + 0.02), (x + 0.003, gy - 0.01, GZ1 - 0.02))
    for y in (-gy, gy):
        bx('Pane', 'glass', (gx0 + 0.01, y - 0.003, GZ0 + 0.02), (gx1 - 0.01, y + 0.003, GZ1 - 0.02))
    # popcorn heaped on the case's floor, highest under the kettle's spout side
    rnd = random.Random(5); pcs = []
    for _ in range(140):
        x = rnd.uniform(gx0 + 0.03, gx1 - 0.03); y = rnd.uniform(-gy + 0.03, gy - 0.03)
        d = math.hypot((x - KC[0]) / 0.26, (y - (KC[1] - 0.12)) / 0.42); hz = 0.11 * max(0.0, 1 - d * d) ** 0.7
        pcs.append((x, y, GZ0 + 0.008 + rnd.uniform(0, hz), rnd.uniform(0.011, 0.016)))
    part('Popcorn', 0, 'popcorn', corn(pcs, 9))
    # the kettle hung from the roof on a rod; its two lid halves up
    kx, ky = KC
    lat('Kettle', 'steel', [(1e-4, 1.05), (0.07, 1.052), (0.105, 1.07), (0.118, 1.11), (0.12, K_RIM), (0.112, K_RIM), (0.11, 1.12), (1e-4, 1.11)], T(kx, ky, 0), 28)
    lat('KettleBand', 'brass', [(0.118, 1.165), (0.126, 1.165), (0.126, 1.18), (0.118, 1.18)], T(kx, ky, 0), 28)
    for s in (-1, 1):
        bx('Lid', 'steel', (-0.11, 0.0, -0.003), (0.11, 0.105, 0.003), r=0.002, M=T(kx, ky + s * 0.004, K_RIM + 0.004) @ RX(-62 * s) @ (Matrix.Identity(4) if s > 0 else RZ(180)))
    bx('Rod', 'steel', (kx - 0.006, ky - 0.006, K_RIM - 0.01), (kx + 0.006, ky + 0.006, GZ1 + 0.01))
    tube('Handle', 'steel', [(kx, ky - 0.118, 1.15), (kx, ky - 0.2, 1.17), (kx, -gy + 0.06, 1.2)], 0.007, 8)
    lat('Lamp', 'glow_warm', [(1e-4, GZ1 - 0.03), (0.05, GZ1 - 0.03), (0.05, GZ1 + 0.006), (1e-4, GZ1 + 0.006)], T(kx + 0.12, -0.25, 0), 16, smooth=False)   # 6 mm into the cornice
    # the roof: a brass cornice, a red lid, a cream crest board in a brass frame
    bx('Cornice', 'brass', (CX0 - 0.025, -CY - 0.025, GZ1), (CX1 + 0.025, CY + 0.025, GZ1 + 0.03), r=0.008)
    bx('Roof', 'lacquer_red', (CX0 - 0.045, -CY - 0.045, GZ1 + 0.026), (CX1 + 0.045, CY + 0.045, GZ1 + 0.07), r=0.014)
    bx('Crest', 'lacquer_cream', (-0.115, -0.36, GZ1 + 0.074), (-0.085, 0.36, GZ1 + 0.26), r=0.01)
    bx('CrestFrame', 'brass', (-0.12, -0.38, GZ1 + 0.066), (-0.08, 0.38, GZ1 + 0.085), r=0.006)
    bx('CrestCap', 'brass', (-0.12, -0.38, GZ1 + 0.25), (-0.08, 0.38, GZ1 + 0.275), r=0.006)
    # running gear: two spoked wheels at the +Y end, turned legs at the -Y end, a push handle beyond them
    wheel(CX1 + 0.034, 1); wheel(CX0 - 0.034, -1)
    for x in (CX0 + 0.06, CX1 - 0.06):
        lat('Leg', 'lacquer_red', [(1e-4, 0.03), (0.022, 0.03), (0.016, 0.07), (0.024, 0.12), (0.018, 0.16), (0.026, CZ0 + 0.01), (1e-4, CZ0 + 0.01)], T(x, -CY + 0.08, 0), 12)
        lat('Foot', 'brass', [(1e-4, 0.0), (0.024, 0.0), (0.027, 0.012), (0.024, 0.034), (1e-4, 0.034)], T(x, -CY + 0.08, 0), 12)
    tube('PushBar', 'brass', [(CX0 + 0.05, -CY + 0.01, 0.74), (CX0 + 0.05, -CY - 0.16, 0.8), (CX0 + 0.05, -CY - 0.2, 0.86), (CX1 - 0.05, -CY - 0.2, 0.86), (CX1 - 0.05, -CY - 0.16, 0.8), (CX1 - 0.05, -CY + 0.01, 0.74)], 0.012, 10)


# ------------------------------------------------------------------------------------------------ plinth_marble
def plinth_marble():
    """a gallery plinth for a bust (v14, the entrance): a Nero Marquina shaft on a recessed black foot, a brass band near its foot, a brass
    cap 1.04 m up (the bust stands on it), its edges softly rounded"""
    bx('Foot', 'paint_black', (-0.2, -0.2, 0.0), (0.2, 0.2, 0.05))
    bx('Shaft', 'marble_nero', (-0.23, -0.23, 0.045), (0.23, 0.23, 1.0), r=0.012)
    bx('Band', 'brass', (-0.236, -0.236, 0.12), (0.236, 0.236, 0.135), r=0.004)
    bx('Cap', 'brass', (-0.25, -0.25, 0.995), (0.25, 0.25, 1.04), r=0.008)


BUILD = {'bin_brass': bin_brass, 'bench_velvet': bench_velvet, 'poster_totem': poster_totem, 'planter_tall': planter_tall, 'popcorn_cart': popcorn_cart, 'plinth_marble': plinth_marble}


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
for r in report: print('PROPS14', r['asset'], r['tris'][0], 'tris', r['parts'], 'parts', r['bytes'] // 1024, 'KB', [[round(v, 3) for v in c] for c in r['bbox_blender']])
