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
             'stone_light': ((0.6, 0.57, 0.53), 0.7, 0.0), 'velvet_teal': ((0.012, 0.10, 0.09), 0.9, 0.0), 'tyre': ((0.01, 0.01, 0.01), 0.9, 0.0), 'paint_cream': ((0.8, 0.74, 0.63), 0.75, 0.0)}.items():
    lbl.MAT_DEF.setdefault(k, v)
lbl.GLOW_DEF.setdefault('glow_red', ((1.0, 0.10, 0.06), 3.0))
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


def bead_loop(name, mat, o, u, v, w, h, r=0.0045, rc=0.012, steps=3):
    """v14 a panel's bead: a round bar round a w x h rectangle (corner o, along u and v), its corners rounded (rc) and its frames rotation-
    minimizing (lbl.ptube): the v14 cart's beads were tubes on sharp corners whose rings turned there and crossed their own faces"""
    P = lambda a, b: Vector((o[0] + u[0] * a + v[0] * b, o[1] + u[1] * a + v[1] * b, o[2] + u[2] * a + v[2] * b)); pts = [P(w / 2, 0.0)]   # the seam mid-edge:
    for (ca, cb, a0) in ((w - rc, rc, -90), (w - rc, h - rc, 0), (rc, h - rc, 90), (rc, rc, 180)):                                         # same tangent both sides
        for k in range(steps + 1):
            t = math.radians(a0 + 90 * k / steps); pts.append(P(ca + rc * math.cos(t), cb + rc * math.sin(t)))
    pts.append(P(w / 2, 0.0))
    part(name, 0, mat, lambda bm: lbl.ptube(bm, pts, r, 6, cap=False))


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
            bead_loop('Bead', 'brass', (x + s * 0.004, y0, 0.29), (0, 1, 0), (0, 0, 1), y1 - y0, 0.45)
    for y in (-CY, CY):
        bead_loop('Bead', 'brass', (CX0 + 0.06, y + (0.004 if y > 0 else -0.004), 0.29), (1, 0, 0), (0, 0, 1), CX1 - CX0 - 0.12, 0.45)
    for x in (CX0 + 0.004, CX1 - 0.004):
        for y in (-CY + 0.004, CY - 0.004):
            lat('Corner', 'brass', [(1e-4, CZ0 + 0.02), (0.012, CZ0 + 0.02), (0.012, CZ1 - 0.02), (1e-4, CZ1 - 0.02)], T(x, y, 0), 12)   # round corner beads
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


# ------------------------------------------------------------------------------------------------ service_cart
# v14 the seat server's trolley (the user, 11-21: "the cart of the guy ... looked so bad"): a lacquered cabinet trolley like a hotel room-
# service cart, 84 x 46 cm, its walnut top 83 cm up inside a brass gallery rail, brass corner posts with ball finials, brass-beaded black
# panels on four sides with an oval plaque at the front, four swivel casters, a push bar with a leather grip at the back (-X, the server's
# side); on top: two buckets of popcorn, a stack of empty buckets, four drinks in a carrier and a napkin box. npc9.js makeCart draws it.
SC_X, SC_Y = 0.42, 0.23
def caster(x, y):
    M = T(x, y, 0.05) @ RX(90)                                                     # the wheel's axle along Y
    lat('Tyre', 'rubber', [(0.03, -0.016), (0.044, -0.016), (0.05, -0.008), (0.05, 0.008), (0.044, 0.016), (0.03, 0.016)], M, 28)
    lat('Hub', 'brass', [(1e-4, -0.019), (0.032, -0.019), (0.032, 0.019), (1e-4, 0.019)], M, 20)
    lat('Axle', 'blackmetal', [(1e-4, -0.03), (0.006, -0.03), (0.006, 0.03), (1e-4, 0.03)], M, 10)
    for s in (-1, 1):
        bx('Fork', 'blackmetal', (x - 0.014, y + s * 0.022 - 0.002, 0.04), (x + 0.014, y + s * 0.022 + 0.002, 0.108), r=0.0015)
    bx('ForkTop', 'blackmetal', (x - 0.03, y - 0.03, 0.104), (x + 0.03, y + 0.03, 0.112), r=0.002)
    lat('Swivel', 'brass', [(1e-4, 0.11), (0.028, 0.11), (0.03, 0.115), (0.028, 0.124), (1e-4, 0.124)], T(x, y, 0), 20)


def tub(x, y, z, full, seed, tilt=0.0):
    """a popcorn bucket (16 cm, flared, a red band), heaped when full"""
    M = T(x, y, z)
    lat('Tub', 'paint_cream', [(1e-4, 0.0), (0.045, 0.0), (0.062, 0.16), (0.059, 0.1605), (0.043, 0.008), (1e-4, 0.008)], M, 28)   # its floor 6 mm over the walnut
    rr = lambda zz: 0.045 + (0.062 - 0.045) * zz / 0.16
    lat('TubBand', 'lacquer_red', [(rr(0.06) - 0.001, 0.06), (rr(0.06) + 0.0024, 0.06), (rr(0.11) + 0.0024, 0.11), (rr(0.11) - 0.001, 0.11)], M, 28)
    if full:
        rnd = random.Random(seed); pcs = []
        for _ in range(46):
            a = rnd.uniform(0, 6.283); r = 0.044 * math.sqrt(rnd.uniform(0, 1)); h = 0.05 * max(0.0, 1 - (r / 0.06) ** 2)   # inside the rim: no kernel through the wall
            pcs.append((x + r * math.cos(a), y + r * math.sin(a), z + 0.148 + rnd.uniform(0, h), rnd.uniform(0.011, 0.015)))
        part('Popcorn', 0, 'popcorn', corn(pcs, seed))
        lat('TubFill', 'popcorn', [(1e-4, 0.14), (0.0585, 0.14), (0.0588, 0.152), (1e-4, 0.152)], M, 24)   # the heap's base inside the rim


def service_cart():
    for x in (-0.36, 0.36):
        for y in (-0.19, 0.19): caster(x, y)
    bx('Deck', 'walnut_dark', (-SC_X, -SC_Y, 0.12), (SC_X, SC_Y, 0.15), r=0.008)
    # the cabinet: black lacquer panels between brass corner posts (4 mm into the posts and 5 mm into the deck and the top)
    px, py = SC_X - 0.015, SC_Y - 0.015
    for sy in (-1, 1):
        bx('Panel', 'lacquer_black', (-px + 0.01, sy * py - 0.006, 0.145), (px - 0.01, sy * py + 0.006, 0.805), r=0.002)
        bead_loop('Bead', 'brass', (-px + 0.05, sy * (py + 0.006), 0.19), (1, 0, 0), (0, 0, 1), 2 * px - 0.1, 0.57)
    for sx in (-1, 1):
        bx('Panel', 'lacquer_black', (sx * px - 0.006, -py + 0.01, 0.145), (sx * px + 0.006, py - 0.01, 0.805), r=0.002)
        bead_loop('Bead', 'brass', (sx * (px + 0.006), -py + 0.05, 0.19), (0, 1, 0), (0, 0, 1), 2 * py - 0.1, 0.57)
    lat('Plaque', 'brass', [(1e-4, -0.003), (0.05, -0.003), (0.052, 0.0), (0.05, 0.004), (1e-4, 0.004)], T(px + 0.007, 0, 0.6) @ RY(90) @ Matrix.Diagonal((1.0, 1.7, 1.0, 1.0)), 32)
    for x in (-px, px):
        for y in (-py, py):
            top = 0.99 if x < 0 else 0.915   # the gallery rail (8.95-9.02 dm) runs through the posts, clear of their tops
            lat('Post', 'brass', [(1e-4, 0.13), (0.014, 0.13), (0.014, top), (1e-4, top)], T(x, y, 0), 16)
            lat('Finial', 'brass', [(1e-4, top - 0.01), (0.012, top - 0.008), (0.018, top + 0.006), (0.014, top + 0.02), (0.006, top + 0.027), (1e-4, top + 0.028)], T(x, y, 0), 16)
            lat('PostFoot', 'brass', [(1e-4, 0.148), (0.019, 0.148), (0.019, 0.17), (0.0145, 0.178), (1e-4, 0.178)], T(x, y, 0), 16)
    # the top: walnut inside a brass gallery rail on short balusters
    bx('Top', 'walnut', (-SC_X - 0.01, -SC_Y - 0.01, 0.8), (SC_X + 0.01, SC_Y + 0.01, 0.83), r=0.01)
    bead_loop('Gallery', 'brass', (-px, -py, 0.895), (1, 0, 0), (0, 1, 0), 2 * px, 2 * py, r=0.007, rc=0.02, steps=4)
    for (x, y) in ((-0.135, -py), (0.135, -py), (-0.135, py), (0.135, py), (-px, 0.0), (px, 0.0)):
        lat('Baluster', 'brass', [(1e-4, 0.826), (0.006, 0.826), (0.0045, 0.86), (0.006, 0.899), (1e-4, 0.899)], T(x, y, 0), 10)
    # the push bar between the back posts, a leather grip with brass collars
    bx('PushBar', 'brass', (-px - 0.012, -py, 0.958), (-px + 0.012, py, 0.982), r=0.011)
    lat('Grip', 'leather_black', [(1e-4, -0.13), (0.019, -0.13), (0.021, -0.11), (0.021, 0.11), (0.019, 0.13), (1e-4, 0.13)], T(-px, 0, 0.97) @ RX(90), 18)
    for s in (-1, 1):
        lat('Collar', 'brass', [(1e-4, -0.009), (0.022, -0.009), (0.024, 0.0), (0.022, 0.009), (1e-4, 0.009)], T(-px, s * 0.133, 0.97) @ RX(90), 18)
    # what the server brings: two full buckets, three empty ones stacked, four drinks in a carrier, a napkin box
    tub(-0.02, 0.09, 0.828, True, 21); tub(-0.02, -0.09, 0.828, True, 22); rr = lambda zz: 0.045 + (0.062 - 0.045) * zz / 0.16
    # three empty buckets nested 24 mm apart, as one solid: the bottom one's wall, then each rim above it (no walls a hair apart inside)
    lat('Stack', 'paint_cream', [(1e-4, 0.0), (0.045, 0.0), (0.0622, 0.16), (0.064, 0.1615), (0.0615, 0.163), (0.0622, 0.184), (0.064, 0.1855), (0.0615, 0.187), (0.0622, 0.208),
                                 (0.059, 0.2085), (0.0425, 0.051), (1e-4, 0.051)], T(-0.25, 0.1, 0.828), 28)
    lat('StackBand', 'lacquer_red', [(rr(0.06) - 0.001, 0.06), (rr(0.06) + 0.0024, 0.06), (rr(0.11) + 0.0024, 0.11), (rr(0.11) - 0.001, 0.11)], T(-0.25, 0.1, 0.828), 28)
    bx('Carrier', 'paint_cream', (0.15, -0.115, 0.828), (0.36, 0.115, 0.85), r=0.004)
    for (x, y) in ((0.205, -0.055), (0.205, 0.055), (0.305, -0.055), (0.305, 0.055)):
        lat('Cup', 'lacquer_red', [(1e-4, 0.845), (0.034, 0.845), (0.042, 0.985), (0.039, 0.9855), (1e-4, 0.986)], T(x, y, 0), 24)
        lat('Lid', 'paint_cream', [(1e-4, 0.982), (0.038, 0.982), (0.0445, 0.983), (0.0445, 0.99), (0.03, 0.994), (1e-4, 0.995)], T(x, y, 0), 24)
        tube('Straw', 'paint_cream', [(x, y, 0.96), (x, y, 1.02), (x - 0.012, y, 1.045)], 0.0035, 8)
    bx('Napkins', 'blackmetal', (-0.33, -0.15, 0.828), (-0.2, -0.05, 0.9), r=0.004)
    bx('Napkin', 'paint_cream', (-0.315, -0.135, 0.895), (-0.215, -0.065, 0.912), r=0.002)


# ------------------------------------------------------------------------------------------------ borne_round
# v14 (the user, 11-21: "the corridors like the upper area felt so empty and dead"): a borne, the round tufted banquette of grand lobbies
# and old picture palaces: 1.6 m across, the seat 45 cm up with two rings of deep buttons, welt piping round its top and bottom edges, a
# channel-tufted backrest drum in the middle under a brass lid (world9.js stands a snake plant on it), on a recessed black plinth in a brass
# kick ring. Six people sit round it (world9.js SIT_ON ring). The velvet is velvet_teal; the corridor recolours it wine red.
BR_OUT, BR_IN, BR_ZB, BR_ZE, BR_TOP = 0.8, 0.36, 0.12, 0.40, 0.842
BR_BUT = [(0.5, 16, 0.0), (0.68, 16, math.pi / 16)]        # rings of buttons: radius, count, phase


def borne_z(r, th):
    db = 9.0
    for (rr_, n, ph) in BR_BUT:
        k = round((th - ph) * n / (2 * math.pi)); a = ph + 2 * math.pi * k / n; db = min(db, math.hypot(r * math.cos(th) - rr_ * math.cos(a), r * math.sin(th) - rr_ * math.sin(a)))
    e = smooth01(0.0, 0.06, BR_OUT - r)
    return BR_ZE + e * (0.045 + 0.008 * max(0.0, 1 - ((r - 0.6) / 0.25) ** 2) - 0.028 * math.exp(-(db / 0.03) ** 2))


def borne_round():
    na, ri = 96, BR_IN - 0.02
    rs = [ri, 0.385, 0.42, 0.46, 0.5, 0.54, 0.58, 0.62, 0.65, 0.68, 0.71, 0.74, 0.765, 0.785, BR_OUT]; nr = len(rs) - 1   # a ring through each row of buttons
    def seat(bm):
        V = [[bm.verts.new((r * math.cos(2 * math.pi * i / na), r * math.sin(2 * math.pi * i / na), borne_z(r, 2 * math.pi * i / na))) for r in rs] for i in range(na)]
        Bo = [bm.verts.new((BR_OUT * math.cos(2 * math.pi * i / na), BR_OUT * math.sin(2 * math.pi * i / na), BR_ZB)) for i in range(na)]
        Bi = [bm.verts.new((ri * math.cos(2 * math.pi * i / na), ri * math.sin(2 * math.pi * i / na), BR_ZB)) for i in range(na)]
        for i in range(na):
            i2 = (i + 1) % na
            for j in range(nr): bm.faces.new((V[i][j], V[i][j + 1], V[i2][j + 1], V[i2][j]))
            bm.faces.new((V[i][nr], Bo[i], Bo[i2], V[i2][nr]))           # the boxed side
            bm.faces.new((Bo[i], Bi[i], Bi[i2], Bo[i2]))                 # the bottom
            bm.faces.new((Bi[i], V[i][0], V[i2][0], Bi[i2]))             # the inner wall, inside the drum
    part('Seat', 0, 'velvet_teal', seat)
    for (rr_, n, ph) in BR_BUT:
        for k in range(n):
            a = ph + 2 * math.pi * k / n; x, y = rr_ * math.cos(a), rr_ * math.sin(a); z = borne_z(rr_, a)
            lat('Button', 'velvet_teal', [(1e-4, z - 0.006), (0.011, z - 0.006), (0.0105, z + 0.002), (0.006, z + 0.0055), (1e-4, z + 0.0065)], T(x, y, 0), 8)
    for z in (BR_ZE + 0.002, BR_ZB + 0.016):
        tube('Welt', 'velvet_teal', [(BR_OUT + 0.002) * Vector((math.cos(2 * math.pi * k / 64), math.sin(2 * math.pi * k / 64), 0)) + Vector((0, 0, z)) for k in range(64)], 0.0065, 6, closed=True)
    # the backrest drum: 20 puffed vertical channels, faded flat 4 cm from each end (into the seat below, under the lid above)
    part('Drum', 0, 'velvet_teal', fluted([0.40, 0.44, 0.48, 0.60, 0.72, 0.79, 0.83], lambda th, z: BR_IN + 0.014 * abs(math.sin(10 * th)) ** 0.5 * smooth01(0.44, 0.49, z) * (1 - smooth01(0.78, 0.82, z)), 120))
    lat('Lid', 'brass', [(1e-4, 0.818), (BR_IN + 0.02, 0.818), (BR_IN + 0.023, 0.83), (BR_IN + 0.02, BR_TOP), (1e-4, BR_TOP)], T(0, 0, 0), 64)
    lat('Plinth', 'lacquer_black', [(1e-4, 0.03), (0.70, 0.03), (0.70, BR_ZB + 0.008), (1e-4, BR_ZB + 0.008)], T(0, 0, 0), 64)
    lat('Kick', 'brass', [(1e-4, 0.0), (0.715, 0.0), (0.72, 0.01), (0.72, 0.035), (0.715, 0.04), (1e-4, 0.04)], T(0, 0, 0), 64)


# ------------------------------------------------------------------------------------------------ plinth_marble
def plinth_marble():
    """a gallery plinth for a bust (v14, the entrance): a Nero Marquina shaft on a recessed black foot, a brass band near its foot, a brass
    cap 1.04 m up (the bust stands on it), its edges softly rounded"""
    bx('Foot', 'paint_black', (-0.2, -0.2, 0.0), (0.2, 0.2, 0.05))
    bx('Shaft', 'marble_nero', (-0.23, -0.23, 0.045), (0.23, 0.23, 1.0), r=0.012)
    bx('Band', 'brass', (-0.236, -0.236, 0.12), (0.236, 0.236, 0.135), r=0.004)
    bx('Cap', 'brass', (-0.25, -0.25, 0.995), (0.25, 0.25, 1.04), r=0.008)


# ------------------------------------------------------------------------------------------------ motorcycle
def motorcycle():
    """a café-racer style motorbike (vehicles.js rides it: +X its nose, the wheels on the floor): 17 in wheels with five cast spokes and
    brake discs, raked forks, clip-on bars with mirrors, a round chrome headlight, a crimson tank with a brass stripe, a black leather
    seat, a finned twin engine, a chrome exhaust sweeping back, a swingarm, fenders, a tail light and a plate"""
    R, WB = 0.32, 1.45
    for (x, w, front) in ((WB / 2, 0.055, True), (-WB / 2, 0.075, False)):
        M = T(x, 0, R) @ RX(90)
        lat('Tyre', 'tyre', [(0.215, -w), (0.255, -w - 0.01), (0.3, -w + 0.008), (R, 0.0), (0.3, w - 0.008), (0.255, w + 0.01), (0.215, w)], M, 40)
        lat('Rim', 'blackmetal', [(0.19, -w + 0.012), (0.218, -w + 0.012), (0.218, w - 0.012), (0.19, w - 0.012)], M, 36)
        lat('Hub', 'steel', [(1e-4, -w - 0.02), (0.045, -w - 0.02), (0.05, 0.0), (0.045, w + 0.02), (1e-4, w + 0.02)], M, 18)
        for k in range(5):
            a = 2 * math.pi * k / 5 + (0.3 if front else 0.0); d = Vector((math.cos(a), 0, math.sin(a)))
            tube('Spoke', 'blackmetal', [tuple(Vector((x, 0, R)) + d * 0.045), tuple(Vector((x, 0, R)) + d * 0.12 + Vector((0, 0, 0)) ), tuple(Vector((x, 0, R)) + d * 0.2)], 0.011, 6)
        for sy in ((1, -1) if front else (-1,)):
            lat('Disc', 'steel', [(0.06, -0.003), (0.15 if front else 0.12, -0.003), (0.15 if front else 0.12, 0.003), (0.06, 0.003)], T(x, sy * (w + 0.018), R) @ RX(90), 32)
    # the forks (raked 25 degrees), their lower legs, the triple clamps, clip-on bars with grips and mirrors
    head = Vector((0.5, 0, 0.9)); fx = WB / 2
    for sy in (-1, 1):
        a = Vector((fx, sy * 0.1, R)); b = head + Vector((0, sy * 0.1, 0))
        tube('ForkLeg', 'blackmetal', [tuple(a), tuple(a + (b - a) * 0.42)], 0.03, 12); tube('Fork', 'chrome', [tuple(a + (b - a) * 0.38), tuple(b + (b - a).normalized() * 0.04)], 0.021, 12)
        tube('Bar', 'blackmetal', [tuple(head + Vector((-0.02, sy * 0.1, 0.03))), tuple(head + Vector((-0.08, sy * 0.28, 0.06))), tuple(head + Vector((-0.12, sy * 0.36, 0.05)))], 0.012, 8)
        tube('Grip', 'rubber', [tuple(head + Vector((-0.115, sy * 0.33, 0.052))), tuple(head + Vector((-0.125, sy * 0.4, 0.05)))], 0.017, 10)
        tube('MirrorStalk', 'chrome', [tuple(head + Vector((-0.1, sy * 0.3, 0.06))), tuple(head + Vector((-0.08, sy * 0.36, 0.2)))], 0.006, 6)
        lat('Mirror', 'chrome', [(1e-4, -0.012), (0.045, -0.012), (0.05, 0.0), (0.045, 0.012), (1e-4, 0.012)], T(*(head + Vector((-0.08, sy * 0.37, 0.23)))) @ RY(80), 16)
    bx('Clamp', 'steel', (head.x - 0.05, -0.15, head.z - 0.02), (head.x + 0.05, 0.15, head.z + 0.03), r=0.012)
    lat('Headlight', 'chrome', [(1e-4, -0.09), (0.06, -0.09), (0.085, -0.04), (0.09, 0.0), (0.09, 0.012), (0.075, 0.016), (1e-4, 0.016)], T(head.x + 0.13, 0, head.z - 0.08) @ RY(90), 24)
    lat('Lens', 'glow_white', [(1e-4, 0.012), (0.072, 0.012), (0.072, 0.022), (1e-4, 0.024)], T(head.x + 0.13, 0, head.z - 0.08) @ RY(90), 24, smooth=False)
    # the frame: tubes from the steering head down to the engine and back under the seat to the tail
    for sy in (-1, 1):
        tube('Frame', 'blackmetal', [tuple(head + Vector((-0.03, sy * 0.03, -0.04))), (0.32, sy * 0.1, 0.78), (0.0, sy * 0.12, 0.74), (-0.42, sy * 0.1, 0.72), (-0.62, sy * 0.07, 0.74)], 0.019, 10)
        tube('Down', 'blackmetal', [tuple(head + Vector((0.0, sy * 0.03, -0.06))), (0.36, sy * 0.1, 0.4), (0.2, sy * 0.11, 0.24), (-0.05, sy * 0.11, 0.26)], 0.019, 10)
        tube('Swingarm', 'blackmetal', [(-0.04, sy * 0.1, 0.4), (-WB / 2, sy * 0.1, R)], 0.024, 10)
        tube('Shock', 'chrome', [(-0.45, sy * 0.11, 0.72), (-0.6, sy * 0.1, 0.38)], 0.014, 8)
    # the tank, its brass stripe, the seat, the tail with its light and plate
    part('Tank', 0, 'lacquer_red', lbl.pillow((0.5, 0.3, 0.2), e=0.03, crown=[(2, 1, 0.03), (1, 1, 0.02), (1, -1, 0.02)]), T(0.2, 0, 0.9))
    bx('Stripe', 'brass', (-0.04, -0.012, 0.999), (0.44, 0.012, 1.007), r=0.003)
    part('Seat', 0, 'leather_black', lbl.pillow((0.56, 0.26, 0.08), e=0.02, crown=[(2, 1, 0.02)]), T(-0.3, 0, 0.83))
    part('Tail', 0, 'lacquer_red', lbl.pillow((0.24, 0.22, 0.1), e=0.025), T(-0.66, 0, 0.82))
    bx('TailLight', 'glow_red', (-0.79, -0.06, 0.8), (-0.775, 0.06, 0.835))
    bx('Plate', 'paint_cream', (-0.835, -0.085, 0.6), (-0.825, 0.085, 0.68)); bx('PlateArm', 'blackmetal', (-0.828, -0.015, 0.64), (-0.7, 0.015, 0.8))   # behind the rear fender's tip, not in its plane
    # front and rear fenders: thin arcs over the tyres
    for (x, w, a0, a1) in ((WB / 2, 0.112, 20, 140), (-WB / 2, 0.09, 60, 170)):   # the front one 12 mm into the fork legs
        pts = [(x + (R + 0.04) * math.cos(math.radians(a)), 0, R + (R + 0.04) * math.sin(math.radians(a))) for a in range(a0, a1 + 1, 10)]
        part('Fender', 0, 'lacquer_red' if x > 0 else 'blackmetal', lambda bm, pts=pts, w=w: lbl.grid_box(bm, [0, 1], [0, 1], [0, 1]) if False else _arc(bm, pts, w, 0.008))
    # the engine: a crankcase, two finned cylinders leaning forward, the exhaust sweeping back to a chrome silencer
    bx('Crankcase', 'charcoal', (-0.12, -0.13, 0.26), (0.26, 0.13, 0.5), r=0.04)
    bx('Barrel', 'charcoal', (-0.08, -0.085, 0.47), (0.13, 0.085, 0.76), r=0.01)   # the cylinders the fins are cast on (every fin 1.8 cm proud of it front and back)
    for k in range(7):
        z = 0.5 + 0.035 * k; bx('Fin', 'steel', (0.02 - 0.012 * k, -0.11, z), (0.22 - 0.012 * k, 0.11, z + 0.016), r=0.004)
    bx('Head', 'charcoal', (-0.07, -0.1, 0.745), (0.12, 0.1, 0.8), r=0.02)
    tube('Exhaust', 'chrome', [(0.22, -0.08, 0.6), (0.34, -0.12, 0.45), (0.3, -0.16, 0.24), (0.05, -0.17, 0.2), (-0.35, -0.17, 0.3)], 0.024, 12)
    lat('Silencer', 'chrome', [(1e-4, 0.0), (0.04, 0.0), (0.05, 0.03), (0.05, 0.36), (0.035, 0.4), (1e-4, 0.4)], T(-0.32, -0.17, 0.3) @ RY(-80), 18)


def _arc(bm, pts, w, t):
    """a thin curved strip along pts (x, 0, z), w either side of y = 0, t thick: a closed solid"""
    rows = []
    for (x, y, z) in pts:
        n = Vector((x, 0, z)); rows.append([bm.verts.new((x, -w, z)), bm.verts.new((x, w, z))])
    inner = []
    for i, (x, y, z) in enumerate(pts):
        c = Vector((pts[0][0] if False else x, 0, z)); inner.append(None)
    ring = []
    for (x, y, z) in pts:
        ring.append([bm.verts.new((x, -w, z)), bm.verts.new((x, w, z))])
    # offset the second ring t inward toward the wheel centre (the strip's thickness)
    cx = sum(p[0] for p in pts) / len(pts); cz = min(p[2] for p in pts) - 0.3
    for (a, b) in ring:
        for v in (a, b):
            d = Vector((v.co.x - cx, 0, v.co.z - cz)).normalized(); v.co -= d * t
    for i in range(len(pts) - 1):
        a0, a1 = rows[i], rows[i + 1]; b0, b1 = ring[i], ring[i + 1]
        bm.faces.new((a0[0], a1[0], a1[1], a0[1])); bm.faces.new((b0[1], b1[1], b1[0], b0[0]))
        bm.faces.new((a0[0], b0[0], b1[0], a1[0])); bm.faces.new((a1[1], b1[1], b0[1], a0[1]))
    for (a, b) in ((rows[0], ring[0]), (rows[-1], ring[-1])):
        bm.faces.new((a[0], a[1], b[1], b[0]))


BUILD = {'bin_brass': bin_brass, 'bench_velvet': bench_velvet, 'poster_totem': poster_totem, 'planter_tall': planter_tall, 'popcorn_cart': popcorn_cart, 'plinth_marble': plinth_marble, 'motorcycle': motorcycle, 'service_cart': service_cart, 'borne_round': borne_round}


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
