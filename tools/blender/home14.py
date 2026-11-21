"""LUMIERE v14 - furniture for your flat (www/js/home.js; the user, 11-20: "buy furniture, colors ... GTA 6 level models"). Original models
from measured references; the scanned pieces (sideboard, tables, chairs, pendant, books, vase, clock) are Poly Haven CC0 scans
(tools/blender/scans14.py). Colour options are material swaps at placement (assets.js placeAsset o.swap), not separate models.
  bed_modern     a platform bed (UK king mattress 150 x 200 cm is small for a hero room; ours 180 x 200): an upholstered base on a recessed
                 walnut plinth, a channel-tufted headboard 1.15 m tall (seven vertical channels), a 24 cm mattress, a duvet that droops
                 over the sides and the foot with its top folded back, two sleeping pillows leaning on the headboard, two shams behind,
                 a lumbar cushion and a wool throw over the foot
  tv_slim        a 65 in television (a 143 x 80 cm picture: 16:9) 26 mm thick on a low-profile wall bracket; the engine draws the
                 picture 6 mm in front of its glass (home.js TV)
  dining_table   a walnut top 200 x 95 cm, 40 mm thick with a soft bevel, on two blackened-steel trestles with brass sabots
  shelf_unit     open shelving 120 x 36 x 200 cm: a black steel ladder frame, five walnut shelves
  table_lamp     a glazed ceramic gourd base, a brass neck, a linen drum shade (a tube 2 mm thick), a warm bulb
  speaker_tower  a floor-standing loudspeaker 110 cm tall: a walnut cabinet with rounded vertical edges, a black cloth grille, brass spikes
  rug_rect       a flat-woven rug 240 x 170 cm with a 7 cm border (field and border are swapped per colour option)
  fruit_bowl     a turned walnut bowl with five oranges and two lemons

    blender --background --factory-startup --python tools/blender/home14.py -- --out www/models [--only NAME]
    then: blender --background --factory-startup --python tools/blender/glb_check.py -- www/models/<name>.glb

Frame: +X the front (the engine's +Z at yaw 0), +Y left, +Z up, the floor at Z = 0 (tv_slim: its back on X = 0). Parts embed 2 mm or more
into what they join; parallel faces of different parts are 5 mm or more apart."""
import bpy, bmesh, math, sys, os, argparse, random
from mathutils import Vector, Matrix
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lbl
from lbl import T, RY, RZ, lathe, rb, part, PARTS, pillow

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ap = argparse.ArgumentParser(); ap.add_argument('--out', default='www/models'); ap.add_argument('--only', default='')
A = ap.parse_args(argv)
for k, v in {'linen_ivory': ((0.75, 0.71, 0.64), 0.9, 0.0), 'linen_sand': ((0.55, 0.47, 0.36), 0.9, 0.0), 'wool_charcoal': ((0.05, 0.05, 0.055), 0.95, 0.0),
             'rug_field': ((0.55, 0.5, 0.42), 1.0, 0.0), 'rug_border': ((0.08, 0.07, 0.06), 1.0, 0.0), 'citrus_orange': ((0.8, 0.3, 0.02), 0.45, 0.0),
             'citrus_lemon': ((0.85, 0.7, 0.08), 0.45, 0.0), 'screen_black': ((0.004, 0.004, 0.005), 0.05, 0.0), 'gloss_black': ((0.006, 0.006, 0.007), 0.15, 0.0),
             'velvet_charcoal': ((0.026, 0.028, 0.035), 0.9, 0.0), 'velvet_mustard': ((0.38, 0.2, 0.03), 0.9, 0.0), 'paint_black': ((0.006, 0.006, 0.007), 0.7, 0.0)}.items():
    lbl.MAT_DEF.setdefault(k, v)
smooth01 = lambda e0, e1, x: (lambda t: t * t * (3 - 2 * t))(min(1.0, max(0.0, (x - e0) / (e1 - e0))))


def bx(name, mat, a, b, r=0.0, M=None):
    size = tuple(b[i] - a[i] for i in range(3)); c = tuple((a[i] + b[i]) / 2 for i in range(3)); M = M or Matrix.Identity(4)
    if r > 0: return part(name, 0, mat, rb(size, r), M @ T(*c))
    def build(bm):
        bmesh.ops.create_cube(bm, size=1.0); bm.transform(Matrix.Diagonal((*size, 1.0)))
    return part(name, 0, mat, build, M @ T(*c), smooth=False)


def lat(name, mat, profile, M, seg=24, smooth=True):
    return part(name, 0, mat, lambda bm: lathe(bm, profile, seg), M, smooth=smooth)


# ------------------------------------------------------------------------------------------------ bed_modern
def bed_modern():
    L, W = 2.12, 1.96           # the base's length (X) and width (Y)
    X0 = -L / 2                 # the head end
    # recessed walnut plinth, the upholstered base (a cushion cage: soft edges, a slight crown), the mattress on it
    bx('Plinth', 'walnut_dark', (X0 + 0.1, -W / 2 + 0.1, 0.0), (L / 2 - 0.1, W / 2 - 0.1, 0.09))
    part('Base', 0, 'velvet_charcoal', pillow((L, W, 0.28), e=0.03, crown=[(2, 1, 0.006)]), T(0, 0, 0.085 + 0.14))
    ML, MW, MT = 2.0, 1.8, 0.24; mx0 = X0 + 0.1; mz0 = 0.365 - 0.01   # the mattress sits 1 cm into the base's top
    part('Mattress', 0, 'linen_ivory', pillow((ML, MW, MT), e=0.035, crown=[(2, 1, 0.012)]), T(mx0 + ML / 2, 0, mz0 + MT / 2))
    top = mz0 + MT + 0.008
    # headboard: seven vertical channels (creases on its front face), 1.15 m tall from the plinth, 12 cm thick, a soft crown
    HB_T, HB_H = 0.12, 1.15; n = 7; cw = (W + 0.04) / n
    cre = [(0, 1, 1, -(W + 0.04) / 2 + cw * k, 0.022, 0.012) for k in range(1, n)]
    part('Headboard', 0, 'velvet_charcoal', pillow((HB_T, W + 0.04, HB_H), e=0.025, crown=[(0, 1, 0.018)], creases=cre), T(X0 - HB_T / 2 + 0.02, 0, 0.09 + HB_H / 2))
    # duvet: a quilted slab on the mattress from the fold to the foot; past the mattress's edges it bends down round them and hangs
    DX0, DX1 = mx0 + 0.55, mx0 + ML + 0.18; DW = MW + 0.42; DT = 0.07; ey, ex = MW / 2 + 0.01, mx0 + ML + 0.01
    zd = top - 0.012 + DT / 2; zax = zd - DT / 2 - 0.04             # the duvet's middle; the bend axes 4 cm under its underside
    def drape(x, y, z, r0=0.06):
        """bend a point (bed frame) past the mattress's side edges (|y| > ey) and its foot edge (x > ex) down round axes at zax"""
        ox, oy, dz = x, y, 0.0
        if abs(y) > ey:
            d = abs(y) - ey; h = z - zax; a = min(math.pi / 2, d / r0)
            oy = math.copysign(ey + h * math.sin(a), y); dz = zax + h * math.cos(a) - max(0.0, d - r0 * math.pi / 2) - z
        if x > ex:
            d = x - ex; h = z - zax; a = min(math.pi / 2, d / r0)
            ox = ex + h * math.sin(a); dz = min(dz, zax + h * math.cos(a) - max(0.0, d - r0 * math.pi / 2) - z)
        return (ox, oy, z + dz)
    cx = (DX0 + DX1) / 2
    ext = ([ex - cx + k * 0.025 for k in range(-1, 9)], [ey + k * 0.025 for k in range(-1, 10)] + [-(ey + k * 0.025) for k in range(-1, 10)], ())
    part('Duvet', 0, 'linen_sand', pillow((DX1 - DX0, DW, DT), e=0.02, crown=[(2, 1, 0.02)], shape=lambda c: drape(c.x + cx, c.y, c.z + zd), extra=ext))
    # the folded-back top: a soft roll across the bed at the fold
    part('Fold', 0, 'linen_ivory', lambda bm: lbl.ptube(bm, [Vector((DX0 + 0.03, (-MW / 2 - 0.01) + k * (MW + 0.02) / 8, top + 0.045)) for k in range(9)], 0.05, 14))
    # pillows: two shams leaning on the headboard, two sleeping pillows on them, a lumbar cushion in front
    for y in (-0.43, 0.43):
        part('Sham', 0, 'velvet_charcoal', pillow((0.15, 0.64, 0.58), e=0.03, crown=[(0, 1, 0.045), (0, -1, 0.03)]), T(X0 + 0.17, y, top + 0.27) @ RY(-16))
        part('Pillow', 0, 'linen_ivory', pillow((0.16, 0.72, 0.48), e=0.03, crown=[(0, 1, 0.05), (0, -1, 0.04)]), T(X0 + 0.37, y, top + 0.2) @ RY(-24))
    part('Lumbar', 0, 'velvet_mustard', pillow((0.13, 0.62, 0.32), e=0.025, crown=[(0, 1, 0.04), (0, -1, 0.03)]), T(X0 + 0.53, 0, top + 0.13) @ RY(-20))
    # a wool throw across the foot, on the duvet, draped over the end and the sides with the duvet's bends (a larger radius)
    FX0, FX1 = ex - 0.42, ex + 0.3; TW = DW + 0.06; zt = top + 0.065; cxt = (FX0 + FX1) / 2
    ext2 = ([ex - cxt + k * 0.025 for k in range(-1, 12)], [ey + k * 0.025 for k in range(-1, 11)] + [-(ey + k * 0.025) for k in range(-1, 11)], ())
    part('Throw', 0, 'wool_charcoal', pillow((FX1 - FX0, TW, 0.022), e=0.008, shape=lambda c: drape(c.x + cxt, c.y, c.z + zt, 0.075), extra=ext2))


# ------------------------------------------------------------------------------------------------ tv_slim
def tv_slim():
    PW, PH, D = 1.452, 0.832, 0.026; z0 = 0.0; xb = 0.045   # the body's back 45 mm off the wall (the bracket)
    bx('Bracket', 'blackmetal', (-0.002, -0.2, -0.16), (xb + 0.004, 0.2, 0.16))
    bx('Electronics', 'blackmetal', (xb - 0.004, -0.36, -0.22), (xb + 0.012, 0.36, 0.2), r=0.006)
    bx('Body', 'gloss_black', (xb + 0.01, -PW / 2, -PH / 2), (xb + 0.01 + D, PW / 2, PH / 2), r=0.004)
    bx('Screen', 'screen_black', (xb + 0.01 + D - 0.004, -PW / 2 + 0.006, -PH / 2 + 0.012), (xb + 0.01 + D + 0.002, PW / 2 - 0.006, PH / 2 - 0.006))
    bx('Logo', 'chrome', (xb + 0.01 + D - 0.002, -0.025, -PH / 2 + 0.002), (xb + 0.01 + D + 0.0035, 0.025, -PH / 2 + 0.008))


# ------------------------------------------------------------------------------------------------ dining_table
def dining_table():
    TL, TW, Z1, TH = 2.0, 0.95, 0.75, 0.04
    def top(bm):
        pts = lbl.rrect_path(TW / 2, TL / 2, 0.06, 0.0, 6); nb = len(pts)
        inner = lbl.rrect_path(TW / 2 - 0.012, TL / 2 - 0.012, 0.048, 0.0, 6)
        rings = [[bm.verts.new((p[0], p[1], Z1 - TH)) for p in inner], [bm.verts.new((p[0], p[1], Z1 - TH + 0.012)) for p in pts],
                 [bm.verts.new((p[0], p[1], Z1 - 0.004)) for p in pts], [bm.verts.new((q[0] - math.copysign(0.0, q[0]), q[1], Z1)) for q in lbl.rrect_path(TW / 2 - 0.004, TL / 2 - 0.004, 0.056, 0.0, 6)]]
        for i in range(3):
            for k in range(nb): bm.faces.new((rings[i][k], rings[i][(k + 1) % nb], rings[i + 1][(k + 1) % nb], rings[i + 1][k]))
        bm.faces.new(rings[3]); bm.faces.new(list(reversed(rings[0])))
    part('Top', 0, 'walnut', top)
    # trestles: a blackened-steel frame each end (two posts, a foot, a head rail into the top), brass sabots
    for y in (-0.72, 0.72):
        bx('Head', 'blackmetal', (-0.36, y - 0.03, Z1 - TH - 0.035), (0.36, y + 0.03, Z1 - TH + 0.003))
        bx('Foot', 'blackmetal', (-0.38, y - 0.03, 0.025), (0.38, y + 0.03, 0.065))
        for x in (-0.3, 0.3): bx('Post', 'blackmetal', (x - 0.025, y - 0.025, 0.06), (x + 0.025, y + 0.025, Z1 - TH - 0.03))
        for x in (-0.36, 0.36): bx('Sabot', 'brass', (x - 0.025, y - 0.034, 0.0), (x + 0.025, y + 0.034, 0.03))
        bx('Rail', 'blackmetal', (-0.3, y - 0.02, 0.36), (0.3, y + 0.02, 0.4))                      # each trestle's mid rail (the stretcher's seat)
    bx('Stretcher', 'blackmetal', (-0.02, -0.72, 0.365), (0.02, 0.72, 0.395))


# ------------------------------------------------------------------------------------------------ shelf_unit
def shelf_unit():
    W, D, H = 1.2, 0.36, 2.0
    for x in (-D / 2 + 0.012, D / 2 - 0.012):
        for y in (-W / 2 + 0.012, W / 2 - 0.012):
            bx('Post', 'blackmetal', (x - 0.011, y - 0.011, 0.0), (x + 0.011, y + 0.011, H))
    for z in (0.06, 0.48, 0.9, 1.32, 1.74):
        bx('Shelf', 'walnut', (-D / 2 + 0.03, -W / 2 + 0.012, z), (D / 2 - 0.01, W / 2 - 0.012, z + 0.026), r=0.003)   # ends in the posts, its front 9 mm behind theirs
        for sx in (-1, 1): bx('Rail', 'blackmetal', (sx * (D / 2 - 0.024) - 0.006, -W / 2 + 0.003, z - 0.022), (sx * (D / 2 - 0.024) + 0.006, W / 2 - 0.003, z + 0.002))   # 7 mm inside the posts' faces
    bx('Cap', 'blackmetal', (-D / 2 - 0.006, -W / 2 - 0.006, H - 0.004), (D / 2 + 0.006, W / 2 + 0.006, H + 0.012))
    bx('Back', 'blackmetal', (-D / 2 + 0.004, -W / 2 + 0.01, 1.98), (-D / 2 + 0.02, W / 2 - 0.01, 1.998))


# ------------------------------------------------------------------------------------------------ table_lamp
def table_lamp():
    lat('Base', 'ceramic', [(1e-4, 0.0), (0.07, 0.0), (0.085, 0.03), (0.1, 0.09), (0.1, 0.15), (0.085, 0.22), (0.05, 0.27), (0.03, 0.3), (0.028, 0.32), (1e-4, 0.32)], T(0, 0, 0), 36)
    lat('Neck', 'brass', [(1e-4, 0.315), (0.012, 0.315), (0.012, 0.42), (0.02, 0.43), (0.02, 0.445), (1e-4, 0.445)], T(0, 0, 0), 20)
    lat('Shade', 'linen_ivory', [(0.17, 0.39), (0.172, 0.39), (0.172, 0.6), (0.17, 0.6)], T(0, 0, 0), 48)
    for a in (0, 120, 240):   # the shade's spider: three brass spokes from the harp's top to the shade's upper rim
        c, s = math.cos(math.radians(a)), math.sin(math.radians(a))
        part('Spoke', 0, 'brass', lambda bm, c=c, s=s: lbl.ptube(bm, [Vector((0.0, 0.0, 0.585)), Vector((0.171 * c, 0.171 * s, 0.592))], 0.0025, 6))
    lat('Hub', 'brass', [(1e-4, 0.44), (0.012, 0.44), (0.012, 0.6), (1e-4, 0.6)], T(0, 0, 0), 12)
    lat('Bulb', 'glow_warm', [(1e-4, 0.47), (0.03, 0.49), (0.034, 0.52), (0.026, 0.55), (1e-4, 0.56)], T(0, 0, 0), 16)


# ------------------------------------------------------------------------------------------------ speaker_tower
def speaker_tower():
    D, W, H = 0.3, 0.22, 1.08; z0 = 0.05
    bx('Cabinet', 'walnut', (-D / 2, -W / 2, z0), (D / 2, W / 2, z0 + H), r=0.018)
    bx('Grille', 'fabric_black', (D / 2 - 0.006, -W / 2 + 0.016, z0 + 0.03), (D / 2 + 0.012, W / 2 - 0.016, z0 + H - 0.03), r=0.006)
    bx('Plinth', 'blackmetal', (-D / 2 - 0.02, -W / 2 - 0.02, z0 - 0.022), (D / 2 + 0.02, W / 2 + 0.02, z0 + 0.004), r=0.004)
    for x in (-D / 2 + 0.01, D / 2 - 0.01):
        for y in (-W / 2 + 0.005, W / 2 - 0.005):
            lat('Spike', 'brass', [(1e-4, 0.0), (0.004, 0.0), (0.014, 0.024), (0.014, 0.032), (1e-4, 0.032)], T(x, y, 0), 12)
    bx('Badge', 'brass', (D / 2 + 0.01, -0.03, z0 + 0.06), (D / 2 + 0.017, 0.03, z0 + 0.072))


# ------------------------------------------------------------------------------------------------ rug_rect
def rug_rect():
    L, W, T_, B = 2.4, 1.7, 0.012, 0.07
    bx('Border', 'rug_border', (-W / 2, -L / 2, 0.0), (W / 2, L / 2, T_), r=0.004)
    bx('Field', 'rug_field', (-W / 2 + B, -L / 2 + B, 0.006), (W / 2 - B, L / 2 - B, T_ + 0.005))


# ------------------------------------------------------------------------------------------------ fruit_bowl
def fruit_bowl():
    lat('Bowl', 'walnut', [(1e-4, 0.0), (0.07, 0.0), (0.075, 0.008), (0.16, 0.06), (0.17, 0.09), (0.162, 0.092), (0.152, 0.065), (0.07, 0.022), (1e-4, 0.022)], T(0, 0, 0), 40)
    inner = lambda rho: 0.022 if rho < 0.07 else (0.022 + (rho - 0.07) / 0.082 * 0.043 if rho < 0.152 else 0.065 + (rho - 0.152) / 0.01 * 0.027)   # the bowl's inside
    low = [(0.0, 0.0, 'citrus_orange'), (0.082, 0.02, 'citrus_orange'), (-0.06, 0.062, 'citrus_orange'), (-0.03, -0.08, 'citrus_orange'), (0.055, -0.07, 'citrus_lemon'), (-0.085, -0.01, 'citrus_lemon')]
    placed = []
    for x, y, m in low:   # resting on the bowl: 4 mm into its inside at the fruit's foot
        r = 0.042 if 'orange' in m else 0.036; placed.append((x, y, inner(math.hypot(x, y)) + r - 0.004, r, m))
    x, y, r = 0.035, 0.05, 0.042; z = 0.0   # a top orange resting on its neighbours (4 mm into the ones it touches)
    for (xi, yi, zi, ri, _) in placed:
        dd = math.hypot(x - xi, y - yi); R = r + ri - 0.004
        if dd < R: z = max(z, zi + math.sqrt(R * R - dd * dd))
    placed.append((x, y, z, r, 'citrus_orange'))
    for x, y, zc, r, m in placed:
        sq = 1.0 if 'orange' in m else 1.18
        part('Fruit', 0, m, lambda bm, r=r: bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=10, radius=r), T(x, y, zc) @ Matrix.Diagonal((sq, 1.0, 1.0, 1.0)))


BUILD = {'bed_modern': bed_modern, 'tv_slim': tv_slim, 'dining_table': dining_table, 'shelf_unit': shelf_unit, 'table_lamp': table_lamp,
         'speaker_tower': speaker_tower, 'rug_rect': rug_rect, 'fruit_bowl': fruit_bowl}


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
for r in report: print('HOME14', r['asset'], r['tris'][0], 'tris', r['parts'], 'parts', r['bytes'] // 1024, 'KB', [[round(v, 3) for v in c] for c in r['bbox_blender']])
