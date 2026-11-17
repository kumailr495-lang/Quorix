"""LUMIERE v12 - the cinema's front, Streamline Moderne (the user picked concept B, 2026-11-17: "the building's outside looks bad", "do some
styling, curves, triangles"). Built for the street room by rooms.build_street; engine coordinates (y up, z towards the road), F = the
facade line (the lobby's glass front, x -22..22, belongs to the lobby room and is not touched).

  wings      cream render brought 3 m forward of the facade line, each turning to the glass front in a quarter-round corner (r 3) that
             rises a metre above the wing as a drum; a granite plinth; two lower and three upper speed lines (black glass, gold neon on
             their faces) that run the wing's length, wrap the corner and stop at the glass
  band       over the glass a curved band (a flat middle 14 m wide for the LUMIERE letters, curving back on 46 m radii into the corners),
             its three speed lines continuing the wings'; a soffit of downlights under it
  fin        a tower fin on the west wing with a rounded nose, 26.5 m high, LUMIERE down both faces (atlas 'blade', the chase of bulbs)
  marquee    a black marquee with quarter-round front corners, the attraction board on its flat front, chaser bulbs over and under the
             board, red neon round its curved ends, a brass soffit of round bulbs, two columns
  showcases  three on each wing: a rounded bronze plate with the poster 6 mm in front of it, a rounded light bar over it

House rules (CLAUDE.md): parts embed 2 cm or more into each other or stand more than 3 cm apart; same-facing faces 5 mm or more apart;
glow quads 6 mm off the face they light; every band is one welded piece along its path (geo.Acc.band)."""
import math
from geo import MAT, lin, arc, offset

CREAM, GRANITE, BLACKG, BRONZE = lin('#d9cdb4'), lin('#2a2826'), lin('#0c0d10'), lin('#3a2c1e')
GOLDN, REDN, BULB = lin('#ffcf8a'), lin('#ff3a2a'), lin('#ffe2b4')
RC, GX, WD = 3.0, 22.0, 3.0   # corner radius; the glass front's half width; how far the wings stand forward of the facade line


def glow_facing(glow, a, b, c, d, want, col, k):
    n = (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]), (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]), (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
    glow.quad(*((a, b, c, d) if n[0] * want[0] + n[1] * want[1] + n[2] * want[2] >= 0 else (d, c, b, a)), col, k)


def strip(glow, path, d, y0, y1, col, k):
    """a glow strip on a band's face: the path offset d (6 mm past the face), from y0 to y1, one quad per segment facing out"""
    q = offset(path, d)
    for i in range(len(q) - 1):
        (ax, az), (bx, bz) = q[i], q[i + 1]; tx, tz = bx - ax, bz - az; L = math.hypot(tx, tz) or 1.0
        glow_facing(glow, (ax, y0, az), (bx, y0, bz), (bx, y1, bz), (ax, y1, az), (-tz / L, 0.0, tx / L), col, k)


def soffit_strip(glow, path, d0, d1, y, col, k):
    """a glow strip facing down under a cornice: between offsets d0 and d1 of the path, at height y"""
    a, b = offset(path, d0), offset(path, d1)
    for i in range(len(a) - 1):
        glow_facing(glow, (a[i][0], y, a[i][1]), (a[i + 1][0], y, a[i + 1][1]), (b[i + 1][0], y, b[i + 1][1]), (b[i][0], y, b[i][1]), (0, -1, 0), col, k)


def octagon(glow, x, y, z, r, col, k):
    """a round bulb facing down (an octagon in three quads)"""
    oc = [(x + r * math.cos(math.pi / 8 + q * math.pi / 4), z + r * math.sin(math.pi / 8 + q * math.pi / 4)) for q in range(8)]
    for qd in ((0, 1, 2, 3), (0, 3, 4, 7), (4, 5, 6, 7)):
        glow_facing(glow, *[(oc[q][0], y, oc[q][1]) for q in qd], (0, -1, 0), col, k)


def lights_along(lit, path, y, col, ipm, every=3.0, d=0.3, r=7.0):
    """line lights in front of a lit band, a segment every few metres along the path (the bake's light from the neon)"""
    q = offset(path, d); acc_ = [q[0]]; run = 0.0
    for i in range(1, len(q)):
        run += math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1])
        if run >= every or i == len(q) - 1:
            a, b = acc_[-1], q[i]; tx, tz = b[0] - a[0], b[1] - a[1]; L = math.hypot(tx, tz) or 1.0
            lit.line((a[0], y, a[1]), (b[0], y, b[1]), col, ipm, r, 'f', (-tz / L, -0.15, tx / L)); acc_.append(b); run = 0.0


def wing_paths(F, xe, side, a_from):
    """a wing's face path for one side (+1 east, -1 west), oriented so 'left of travel' is outward: from the corner at angle a_from
    (degrees on the east corner; 180 = at the glass edge, 90 = where the corner meets the wing face) round to the wing face, then along it
    to the street's end"""
    cx = side * (GX + RC)
    ring = arc(GX + RC, F, RC, math.radians(a_from), math.pi / 2, 24) if a_from > 90.0 else [(GX + RC, F + WD)]
    if abs(xe - cx) > 1e-6: ring = ring + [(abs(xe), F + WD)]
    if side > 0: return ring
    return [(-x, z) for x, z in ring][::-1]   # the mirror of the east side, travelling the other way (outward stays on the left)


def build(acc, glow, lit, F, xw, xe, extras):
    """the whole front; returns (panels, atlas quads to add after the street's own)"""
    halos = extras.setdefault('halos', []); panels, atlas = [], []
    # ---------------------------------------------------------------- the wings, their corners and the curved band
    for side, xend in ((1, xe), (-1, xw)):
        cx = side * (GX + RC)
        acc.prism([(side * (GX + RC), F), (xend, F), (xend, F + WD), (side * (GX + RC), F + WD)], 0.0, 13.5, MAT['plaster'], CREAM)
        quarter = [((x if side > 0 else -x), z) for x, z in arc(GX + RC, F, RC, math.pi, math.pi / 2, 24)] + [(cx, F)]
        acc.prism(quarter, 0.0, 14.6, MAT['plaster'], CREAM, smooth=30.0)   # the corner drum: a quarter round, a metre over the wing
        acc.band(wing_paths(F, xend, side, 175.0), -0.05, 0.9, -0.02, 0.05, MAT['granite'], GRANITE)   # the plinth, 5 cm under the paving
        for y in (5.6, 6.0):   # the lower speed lines: from just off the glass edge (168 degrees) round the corner and down the wing
            p = wing_paths(F, xend, side, 168.0); acc.band(p, y, y + 0.12, -0.02, 0.05, MAT['tblack'], BLACKG); strip(glow, p, 0.056, y + 0.07, y + 0.1, GOLDN, 2.2)
        wing = wing_paths(F, xend, side, 90.0)
        acc.band(wing, 13.45, 13.85, -0.02, 0.25, MAT['plaster'], CREAM); soffit_strip(glow, wing, 0.1, 0.16, 13.444, GOLDN, 2.4)   # the wing's cornice
        corner = wing_paths(F, side * (GX + RC), side, 180.0)
        acc.band(corner, 14.5, 14.9, -0.02, 0.25, MAT['plaster'], CREAM); soffit_strip(glow, corner, 0.1, 0.16, 14.494, GOLDN, 2.6)   # the drum's
        lights_along(lit, wing, 13.2, GOLDN, 0.35, 4.0)
        for a in (165.0, 125.0):   # uplights washing the round corner
            px, pz = GX + RC + (RC + 0.8) * math.cos(math.radians(a)), F + (RC + 0.8) * math.sin(math.radians(a))
            lit.spot((side * px, 0.25, pz), lin('#ffd2a0'), 2.4, 15, 'h', (-side * math.cos(math.radians(a)) * 0.25, 1.0, -math.sin(math.radians(a)) * 0.25), 12, 28)
    # the band over the glass: a flat middle (the letters) between two 46 m arcs, its ends 5 cm into the corner drums
    Rc, zf = 46.42, F + 4.5; czs = zf - Rc; ends = 22.65
    left = [(-7.0 - Rc * math.cos(t), czs + Rc * math.sin(t)) for t in [math.pi / 2 - (math.pi / 2 - math.acos((ends - 7.0) / Rc)) * i / 20 for i in range(20, -1, -1)]]
    front = left + [(-x, z) for x, z in left[::-1]]   # west end to east end
    acc.prism(front + [(GX, F), (-GX, F)], 9.6, 14.58, MAT['plaster'], CREAM, smooth=30.0)
    acc.band(front, 14.55, 14.8, -0.02, 0.2, MAT['plaster'], CREAM); soffit_strip(glow, front, 0.08, 0.14, 14.544, GOLDN, 2.6)
    for y in (10.0, 10.4, 10.8):   # the upper speed lines: across the band, round both corners, down both wings
        acc.band(front, y, y + 0.12, -0.02, 0.05, MAT['tblack'], BLACKG); strip(glow, front, 0.056, y + 0.07, y + 0.1, GOLDN, 2.6)
        for side, xend in ((1, xe), (-1, xw)):   # 6 mm higher than the band's: where the two cross at the corner no faces share a plane
            p = wing_paths(F, xend, side, 143.13); acc.band(p, y + 0.006, y + 0.126, -0.02, 0.05, MAT['tblack'], BLACKG); strip(glow, p, 0.056, y + 0.076, y + 0.106, GOLDN, 2.6)
    lights_along(lit, front, 10.5, GOLDN, 0.5, 3.0)
    for side, xend in ((1, xe), (-1, xw)): lights_along(lit, wing_paths(F, xend, side, 143.13), 10.5, GOLDN, 0.45, 4.0); lights_along(lit, wing_paths(F, xend, side, 168.0), 5.8, GOLDN, 0.4, 4.0)
    lit.area((0.0, 12.85, zf + 0.6), (5.4, 0, 0), (0, 0.9, 0), (0, 0, -1), GOLDN, 2.2, 6, 'f', 4, 1)   # the letters' glow on the band behind them
    zfr = lambda x: zf if abs(x) <= 7.0 else czs + math.sqrt(Rc * Rc - (abs(x) - 7.0) ** 2)   # the band's front at x
    for x in [-16.5 + 3.0 * i for i in range(12)]:   # the band's soffit: round downlights
        for z in (F + 1.0, F + 2.6):
            if z > zfr(x) - 0.6: continue
            octagon(glow, x, 9.594, z, 0.05, BULB, 3.0)
            if z < F + 2: lit.spot((x, 9.5, z), lin('#ffd9a8'), 2.0, 9, 'h', (0, -1, 0), 25, 60)
    # ---------------------------------------------------------------- the fin on the west wing
    fx = -28.0; nose = F + WD + 1.35
    fin = [(fx - 0.45, F + 0.5), (fx - 0.45, nose)] + arc(fx, nose, 0.45, math.pi, 0.0, 12)[1:-1] + [(fx + 0.45, nose), (fx + 0.45, F + 0.5)]
    acc.prism(fin, 3.2, 26.5, MAT['plaster'], CREAM, smooth=30.0)
    acc.band(arc(fx, nose, 0.45, math.pi, 0.0, 12), 26.45, 26.65, -0.02, 0.12, MAT['brass'], lin('#c9a35e'))   # its cap
    for s_ in (-1, 1):
        atlas.append({'k': 'blade', 'v': 'lumiere', 'x': fx + s_ * 0.462, 'y': 19.6, 'z': F + 3.15, 'yaw': s_ * math.pi / 2, 'w': 2.3, 'h': 11.0, 'e': 1.35, 'fx': 2})
    for a in (math.pi * 0.25, math.pi * 0.75):   # gold neon down the nose
        px, pz = fx + 0.456 * math.cos(a), nose + 0.456 * math.sin(a); ox, oz = 0.02 * -math.sin(a), 0.02 * math.cos(a)
        glow_facing(glow, (px - ox, 3.6, pz - oz), (px + ox, 3.6, pz + oz), (px + ox, 26.2, pz + oz), (px - ox, 26.2, pz - oz), (math.cos(a), 0, math.sin(a)), GOLDN, 2.4)
    lit.line((fx, 4.0, nose + 0.8), (fx, 26.0, nose + 0.8), GOLDN, 0.35, 8.0, 'f', (0, 0, 1))
    halos.append({'x': fx, 'y': 19.6, 'z': F + 3.2, 'r': 3.2, 'c': list(lin('#ffcf8a')), 'k': 0.14})
    # ---------------------------------------------------------------- the marquee
    hw, d, r = 7.4, 4.8, 2.4; y0, y1 = 4.7, 6.6; MZ = F + d
    outline = [(-hw, F + 0.002)] + arc(-hw + r, F + d - r, r, math.pi, math.pi / 2, 16) + arc(hw - r, F + d - r, r, math.pi / 2, 0.0, 16) + [(hw, F + 0.002)]
    acc.prism(outline, y0, y1, MAT['lacquer'], lin('#0a0a0c'), smooth=30.0)
    edge = outline[1:-1]   # west side to east side round the front
    cap = [(-hw - 0.04, F + 0.002)] + offset(edge, 0.04) + [(hw + 0.04, F + 0.002)]
    acc.prism(cap, y1 - 0.04, y1 + 0.04, MAT['brass'], lin('#c9a35e'), smooth=30.0)
    inset = [(-hw + 0.1, F + 0.1)] + offset(edge, -0.1) + [(hw - 0.1, F + 0.1)]
    acc.prism(inset, y0 - 0.08, y0 + 0.02, MAT['brass'], lin('#c9a35e'), smooth=30.0)   # the soffit, 2 cm up into the body
    bw = hw - r - 0.2   # the board's half width on the flat front
    for (ax0, ax1, ay0, ay1) in ((-bw - 0.04, bw + 0.04, 4.84, 4.88), (-bw - 0.04, bw + 0.04, 5.98, 6.02), (-bw - 0.04, -bw, 4.88, 5.98), (bw, bw + 0.04, 4.88, 5.98)):
        acc.box(ax0, ay0, MZ - 0.02, ax1, ay1, MZ + 0.03, MAT['brass'], lin('#c9a35e'))
    panels.append({'id': 'attraction_f', 'x': 0.0, 'y': 5.43, 'z': MZ + 0.006, 'yaw': 0, 'w': 2 * bw, 'h': 1.1, 'emit': 1.15})
    n_ = int(2 * bw / 0.96)
    for yb in (4.785, 6.19):
        for j in range(n_): atlas.append({'k': 'bulbs', 'v': 'row', 'x': -n_ * 0.48 + 0.48 + 0.96 * j, 'y': yb, 'z': MZ + 0.006, 'yaw': 0, 'w': 0.96, 'h': 0.12, 'e': 1.6, 'fx': 3, 'i': j})
    strip(glow, edge, 0.006, 6.36, 6.4, REDN, 3.0)
    for sx in (-1, 1):   # red neon round each curved end
        ce = arc(sx * (hw - r), F + d - r, r, math.pi if sx < 0 else math.pi / 2, math.pi / 2 if sx < 0 else 0.0, 16)
        for y in (5.0, 5.43, 5.86): strip(glow, ce, 0.006, y, y + 0.04, REDN, 3.0)
    lit.area((0.0, 5.43, MZ + 0.3), (bw, 0, 0), (0, 0.55, 0), (0, -0.2, 1), lin('#fff6e8'), 4.0, 14, 'f', 4, 1)
    for sx in (-1, 1): lit.area((sx * (hw - 0.3), 5.6, F + 2.6), (0, 0, 1.6), (0, 0.6, 0), (sx, -0.3, 0.3), REDN, 1.4, 7, 'f', 2, 1)
    for ix in range(19):   # the soffit's bulbs, inside the rounded outline
        for iz in range(7):
            x, z = -6.3 + 0.7 * ix, F + 0.6 + 0.62 * iz; ccx = max(abs(x) - (hw - r), 0.0); ccz = max(z - (F + d - r), 0.0)
            if math.hypot(ccx, ccz) > r - 0.45: continue
            octagon(glow, x, y0 - 0.086, z, 0.04, BULB, 3.4)
            if ix % 3 == 1 and iz % 2 == 1: lit.spot((x, y0 - 0.1, z), lin('#ffd9a8'), 2.2, 7, 'h', (0, -1, 0), 30, 70)
    for x in (-6.2, 6.2):   # the columns: black lacquer on brass rings, 2 cm up into the soffit
        acc.cyl(x, F + 3.9, 0.16, 0.0, y0 - 0.06, MAT['lacquer'], lin('#0b0b0d'), n=24)
        acc.cyl(x, F + 3.9, 0.22, 0.0, 0.18, MAT['brass'], lin('#c9a35e'), n=24); acc.cyl(x, F + 3.9, 0.21, y0 - 0.32, y0 - 0.06, MAT['brass'], lin('#c9a35e'), n=24)
    # ---------------------------------------------------------------- the showcases on the wings
    films = ['bunny', 'llamigos', 'glasshalf', 'coffeerun', 'sintel', 'cosmos', 'hero', 'wingit']; k = 0
    for side in (-1, 1):
        for xc in (31.0, 37.0, 43.0):
            x = side * xc; zw = F + WD; pw, ph, yc = 2.5, 3.75, 2.85; ow, oh, rr = pw / 2 + 0.2, ph / 2 + 0.2, 0.35
            plate = [(x + ow - rr + rr * math.cos(a), yc + oh - rr + rr * math.sin(a)) for a in [i * math.pi / 16 for i in range(9)]] \
                + [(x - ow + rr + rr * math.cos(a), yc + oh - rr + rr * math.sin(a)) for a in [math.pi / 2 + i * math.pi / 16 for i in range(9)]] \
                + [(x - ow + rr + rr * math.cos(a), yc - oh + rr + rr * math.sin(a)) for a in [math.pi + i * math.pi / 16 for i in range(9)]] \
                + [(x + ow - rr + rr * math.cos(a), yc - oh + rr + rr * math.sin(a)) for a in [1.5 * math.pi + i * math.pi / 16 for i in range(9)]]
            acc.prism_z(plate, zw - 0.02, zw + 0.06, MAT['powder'], BRONZE)
            panels.append({'id': 'poster_' + films[k % 8] + '_f' + str(k), 'x': x, 'y': yc, 'z': zw + 0.066, 'yaw': 0, 'w': pw, 'h': ph, 'emit': 1}); k += 1
            bar = [(x - pw / 2, zw - 0.02)] + arc(x - pw / 2, zw + 0.25, 0.25, -math.pi / 2, -1.5 * math.pi, 8)[1:-1] + [(x - pw / 2, zw + 0.5), (x + pw / 2, zw + 0.5)] \
                + arc(x + pw / 2, zw + 0.25, 0.25, math.pi / 2, -math.pi / 2, 8)[1:-1] + [(x + pw / 2, zw - 0.02)]
            acc.prism(bar, 5.05, 5.17, MAT['powder'], BRONZE, smooth=30.0)
            glow_facing(glow, (x - pw / 2 + 0.05, 5.044, zw + 0.15), (x + pw / 2 - 0.05, 5.044, zw + 0.15), (x + pw / 2 - 0.05, 5.044, zw + 0.35), (x - pw / 2 + 0.05, 5.044, zw + 0.35), (0, -1, 0), lin('#ffe8c8'), 2.0)
            lit.area((x, 5.0, zw + 0.3), (pw / 2 - 0.1, 0, 0), (0, 0, 0.1), (0, -1, -0.5), lin('#ffe3be'), 2.4, 7, 'h', 3, 1)
    return panels, atlas
