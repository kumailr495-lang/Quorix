"""LUMIERE v12 - the lobby brought up to the cinema front's level (the user, 2026-11-19: the lobby "looks shit and not premium and more like
a cheap copy"; then, on the first try: "the new ceiling looks shit, also the pillars"; they picked noir coffers and backlit onyx).

  ceiling   a matte black coffered ceiling: gloss black beams 0.45 m deep on a 2.7 x 2.55 m grid set out from the court's columns (they
            carry the beams on their abaci), a brass line along each beam's soffit, a warm recessed downlight in every coffer. The oval
            dome over the court (the star field, the chandelier) is framed by a deep crimson rim; the beams die into it. A narrow band runs
            round the walls with the long walls' grazing washers in a slot under it. No textured plaster: smooth paint and lacquer only
  columns   backlit onyx: banded honey onyx glowing from inside (library 35, emissive), eight brass fins dividing it into panels (they also
            hide the texture's seams), a brass collar at 3 m, a brass crown, a black lacquer abacus the beams land on; the mezzanine's five
            columns in the same onyx, smaller
  fascia    the mezzanine's edge: a deep crimson lacquer fascia with three brass speed lines and a warm light line under it

House rules (CLAUDE.md): parts embed 2 cm or more into each other or stand more than 3 cm apart; same-facing faces 5 mm or more apart;
glow quads 5 mm off the face they sit on. Every part is checked against what it could meet and the builder refuses a clash."""
import math
from geo import MAT, lin

BLACK, LACQ, BRASS, CRIMSON, WARM = lin('#0d0d0f'), lin('#161518'), lin('#c9a35e'), lin('#7a1420'), lin('#ffd9a8')
ONYX = lin('#ffffff')   # the onyx scan carries its own colour (abs mode)


def facing(acc, a, b, c, d, want, mat, col):
    """a quad that faces `want`, whatever order its corners come in"""
    n = ((b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]), (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]),
         (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]))
    acc.quad(*((a, b, c, d) if n[0] * want[0] + n[1] * want[1] + n[2] * want[2] >= 0 else (d, c, b, a)), mat, col)


def glow_facing(glow, a, b, c, d, want, col, k):
    n = ((b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]), (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]),
         (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]))
    glow.quad(*((a, b, c, d) if n[0] * want[0] + n[1] * want[1] + n[2] * want[2] >= 0 else (d, c, b, a)), col, k)


def refuse(what, gap, need=0.1):
    if gap < need: raise SystemExit(f'lobby12: {what} is {gap:.3f} m from its neighbour (needs {need} m): move one of them')


def disc_down(glow, x, y, z, r, col, k, n=12):
    for i in range(n):
        a0, a1 = 2 * math.pi * i / n, 2 * math.pi * (i + 1) / n
        glow_facing(glow, (x, y, z), (x + r * math.cos(a0), y, z + r * math.sin(a0)), (x + r * math.cos(a1), y, z + r * math.sin(a1)), (x, y, z), (0, -1, 0), col, k)


# ------------------------------------------------------------------------------------------------ the coffered ceiling
def coffers(acc, glow, lit, S, H, walls, dome, cols, skip_fixtures=()):
    """walls: the room's inner faces (x0, z0, x1, z1); dome: (cx, cz, a, b) the crimson rim's centreline ellipse; cols: the court's
    columns (grid intersections). Returns (yb, beams): the beams' soffit height and the list of beam boxes (for the checks)"""
    x0, z0, x1, z1 = walls; CO = S['CORE']; D = 0.45; yb = H - D; hw = 0.12
    cx_, cz_, ea, eb = dome
    # the grid: x lines through the columns at 2.7 m, z lines through them at 2.55 m
    X = sorted({round(cols[0][0] + 2.7 * k, 4) for k in range(-12, 13) if x0 + 0.3 < cols[0][0] + 2.7 * k < x1 - 0.3})
    zc0 = min(c[1] for c in cols); Z = sorted({round(zc0 + 2.55 * k, 4) for k in range(-12, 13) if z0 + 0.3 < zc0 + 2.55 * k < z1 - 0.9})
    for c in cols:
        if min(abs(c[0] - x) for x in X) > 1e-3 or min(abs(c[1] - z) for z in Z) > 1e-3: raise SystemExit(f'lobby12: the column at {c} is off the beam grid')
    ins = lambda x, z, m=0.0: ((x - cx_) / (ea + m)) ** 2 + ((z - cz_) / (eb + m)) ** 2 < 1.0   # inside the rim (grown by m)
    core = lambda x, z: CO['x0'] - 0.02 < x < CO['x1'] + 0.02 and z < CO['z1'] + 0.02
    def hit(xa, za, xb, zb):   # where a segment from outside the rim (a) first meets the rim's centreline (bisection)
        lo, hi = 0.0, 1.0
        for _ in range(40):
            m = (lo + hi) / 2
            if ins(xa + (xb - xa) * m, za + (zb - za) * m): hi = m
            else: lo = m
        return xa + (xb - xa) * lo, za + (zb - za) * lo
    beams = []
    def beam(xa, za, xb, zb, inlay):
        """one beam segment along a grid line, black gloss lacquer, its brass inlay 8 or 14 mm proud (x and z beams differ: crossing
        strips never share a face)"""
        # the beams along z hang 30 mm lower than those along x: where they cross, the x beam's soffit and inlay end inside the z beam
        # (12 mm left the inlay 4 mm over the z soffit: it showed through from the street)
        if abs(za - zb) < 1e-6: bx0, bx1, bz0, bz1, y_ = min(xa, xb), max(xa, xb), za - hw, za + hw, yb
        else: bx0, bx1, bz0, bz1, y_ = xa - hw, xa + hw, min(za, zb), max(za, zb), yb - 0.030
        acc.box(bx0, y_, bz0, bx1, H + 0.02, bz1, MAT['lacquer'], LACQ); beams.append((bx0, bz0, bx1, bz1))
        if abs(za - zb) < 1e-6: acc.box(bx0 + 0.01, y_ - inlay, za - 0.0125, bx1 - 0.01, y_ + 0.01, za + 0.0125, MAT['brass'], BRASS)
        else: acc.box(xa - 0.0125, y_ - inlay, bz0 + 0.01, xa + 0.0125, y_ + 0.01, bz1 - 0.01, MAT['brass'], BRASS)
    def run(pts, horiz):
        """beams along one grid line through its intersections: segments inside the rim or the escalator hall are left out; a segment
        that runs into the rim stops on its centreline (inside the rim's 0.7 m band); one meeting the rim at less than 35 degrees is
        dropped (a sliver along the rim)"""
        for (xa, za), (xb, zb) in zip(pts, pts[1:]):
            ia, ib = ins(xa, za), ins(xb, zb)
            if ia and ib: continue
            mx, mz = (xa + xb) / 2, (za + zb) / 2
            if core(mx, mz) and core(xa, za) and core(xb, zb): continue
            if not ia and not ib:   # both ends outside: does it cut through the rim band anyway (a chord)?
                if any(ins(xa + (xb - xa) * t / 20, za + (zb - za) * t / 20, 0.5) for t in range(21)): continue
                beam(xa, za, xb, zb, 0.008 if horiz else 0.014); continue
            (ox, oz), (ix, iz) = ((xa, za), (xb, zb)) if ib else ((xb, zb), (xa, za))
            hx, hz = hit(ox, oz, ix, iz); nx, nz = (hx - cx_) / ea ** 2, (hz - cz_) / eb ** 2; L = math.hypot(nx, nz)
            dx, dz = (ix - ox), (iz - oz); dl = math.hypot(dx, dz)
            if abs(nx * dx + nz * dz) / (L * dl) < math.cos(math.radians(55)): continue
            beam(ox, oz, hx, hz, 0.008 if horiz else 0.014)
    for z in Z:
        xs = [x0 + 0.38] + X + [x1 - 0.38]
        run([(x, z) for x in xs], True)
    for x in X:
        zs = [z0 + 0.38] + Z + [z1 - 0.95]
        run([(x, z) for z in zs], False)
    # the band round the walls (the beams' ends run into it), black lacquer, 2 cm into the walls; the front one deeper (0.97 m)
    for (bx0, bz0, bx1, bz1) in ((x0 - 0.02, z0 - 0.02, x0 + 0.4, z1 + 0.02), (x1 - 0.4, z0 - 0.02, x1 + 0.02, z1 + 0.02),
                                 (x0 + 0.4, z0 - 0.02, x1 - 0.4, z0 + 0.4), (x0 + 0.4, z1 - 0.97, x1 - 0.4, z1 + 0.02)):
        acc.box(bx0, yb - 0.06, bz0, bx1, H + 0.02, bz1, MAT['lacquer'], LACQ)   # 60 mm under the x beams, 16 mm under the z beams' inlays
    # a downlight in the middle of every coffer clear of the rim and the escalator hall: a brass trim ring, the lamp, its light
    xs, zs = [x0 + 0.4] + X + [x1 - 0.4], [z0 + 0.4] + Z + [z1 - 0.97]; n = 0
    for xa, xb in zip(xs, xs[1:]):
        for za, zb in zip(zs, zs[1:]):
            cx, cz = (xa + xb) / 2, (za + zb) / 2
            if ins(cx, cz, 0.9) or core(cx, cz) or (xb - xa) < 1.2 or (zb - za) < 1.2: continue
            if any(math.hypot(cx - fx, cz - fz) < fr + 0.2 for fx, fz, fr in skip_fixtures): continue
            acc.cyl(cx, cz, 0.13, H - 0.03, H + 0.01, MAT['brass'], BRASS, n=20)
            disc_down(glow, cx, H - 0.035, cz, 0.09, WARM, 2.6)
            lit.spot((cx, H - 0.08, cz), WARM, 1.5, 10.5, 'h', (0, -1, 0), 22, 48); n += 1
    return yb, beams, n


def washer_slots(glow, walls, yb, x_off=0.05, w=0.06):
    """a light slot in the band's underside over each long wall, where the grazing washers sit (rooms.py lit.line under it)"""
    x0, z0, x1, z1 = walls
    for xa, xb in ((x0 + x_off, x0 + x_off + w), (x1 - x_off - w, x1 - x_off)):
        y = yb - 0.065   # 5 mm under the band's soffit (yb - 0.06; at yb - 0.005 it was inside the band)
        glow_facing(glow, (xa, y, z0 + 0.3), (xb, y, z0 + 0.3), (xb, y, z1 - 0.3), (xa, y, z1 - 0.3), (0, -1, 0), WARM, 2.0)


def dome_rim(acc, glow, lit, cx, cz, a, b, H, n=64):
    """the crimson lacquer rim that frames the oval dome: 0.7 m wide, from 2 cm inside the roof down to 0.55 m under it (deeper than the
    beams, which end inside it); a warm glow line round its inner soffit edge"""
    pts = [(cx + a * math.cos(2 * math.pi * i / n), cz + b * math.sin(2 * math.pi * i / n)) for i in range(n + 1)]
    acc.sweep(pts, [(-0.35, H + 0.02), (-0.35, H - 0.55), (0.35, H - 0.55), (0.35, H + 0.02)], MAT['lacquer'], CRIMSON, closed=True)
    sc = lambda px, pz, k: (cx + (px - cx) * k, cz + (pz - cz) * k)
    for i in range(n):
        (ax, az), (bx, bz) = pts[i], pts[i + 1]; a1, b1, b2, a2 = sc(ax, az, 0.97), sc(bx, bz, 0.97), sc(bx, bz, 0.95), sc(ax, az, 0.95)
        glow_facing(glow, (a1[0], H - 0.555, a1[1]), (b1[0], H - 0.555, b1[1]), (b2[0], H - 0.555, b2[1]), (a2[0], H - 0.555, a2[1]), (0, -1, 0), WARM, 1.6)
    for i in range(0, n, 8):
        q = sc(pts[i][0], pts[i][1], 0.96); lit.spot((q[0], H - 0.6, q[1]), WARM, 5.0, 14, 'h', (0, -1, 0), 35, 75)
    return pts


# ------------------------------------------------------------------------------------------------ backlit onyx columns
def onyx_column(acc, glow, lit, cx, cz, H, r=0.45, abacus=0.5):
    """a full-height column: black marble plinth, brass base ring, the onyx shaft (self-lit), eight brass fins (on the texture's seams:
    its planar mapping turns at 45 degrees), a brass collar at 3 m, a brass crown, a black lacquer abacus (half width `abacus`) under the
    roof, 2 cm into it, that the beams land on. Every ring differs in radius from the next, so no two faces share a plane"""
    acc.cyl(cx, cz, r + 0.17, 0.0, 0.16, MAT['neroGold'], lin('#ffffff'), n=32)
    acc.cyl(cx, cz, r + 0.08, 0.16, 0.24, MAT['brass'], BRASS, n=32)
    y1 = H - 0.62
    acc.cyl(cx, cz, r, 0.22, y1, MAT['onyx'], ONYX, n=32)
    for k in range(8):
        a = math.radians(45 * k); ca, sa = math.cos(a), math.sin(a); tx, tz = -sa, ca
        q = [(cx + ca * (r - 0.012) - tx * 0.014, cz + sa * (r - 0.012) - tz * 0.014), (cx + ca * (r + 0.016) - tx * 0.014, cz + sa * (r + 0.016) - tz * 0.014),
             (cx + ca * (r + 0.016) + tx * 0.014, cz + sa * (r + 0.016) + tz * 0.014), (cx + ca * (r - 0.012) + tx * 0.014, cz + sa * (r - 0.012) + tz * 0.014)]
        acc.prism(q, 0.235, y1 + 0.01, MAT['brass'], BRASS)
    acc.cyl(cx, cz, r + 0.04, 2.96, 3.04, MAT['brass'], BRASS, n=32)          # the collar, over the fins (they end in it and run on)
    acc.cyl(cx, cz, r + 0.07, y1 - 0.02, y1 + 0.08, MAT['brass'], BRASS, n=32)  # the crown: the shaft and the fins end inside it
    acc.cyl(cx, cz, r + 0.03, y1 + 0.08, H - 0.56, MAT['brass'], BRASS, n=32)   # its neck, up into the abacus
    acc.box(cx - abacus, H - 0.58, cz - abacus, cx + abacus, H + 0.02, cz + abacus, MAT['lacquer'], LACQ)
    acc.box(cx - abacus - 0.012, H - 0.6, cz - abacus - 0.012, cx + abacus + 0.012, H - 0.565, cz + abacus + 0.012, MAT['brass'], BRASS)   # its brass lip
    for dx, dz in ((1, 0), (-1, 0), (0, 1), (0, -1)):   # the glow the onyx throws round itself (the shaft's own light is its emission)
        lit.line((cx + dx * (r + 0.12), 0.5, cz + dz * (r + 0.12)), (cx + dx * (r + 0.12), y1 - 0.3, cz + dz * (r + 0.12)), lin('#ffc27a'), 0.12, 4.0, 'h')


def onyx_post(acc, cx, cz, y0, y1, r=0.3):
    """a mezzanine column in the same onyx: a brass shoe, the shaft, six brass fins, a brass cap under the slab"""
    acc.cyl(cx, cz, r + 0.06, y0, y0 + 0.12, MAT['brass'], BRASS, n=24)
    acc.cyl(cx, cz, r, y0 + 0.1, y1 - 0.1, MAT['onyx'], ONYX, n=24)
    for k in range(8):
        a = math.radians(45 * k); ca, sa = math.cos(a), math.sin(a); tx, tz = -sa, ca
        q = [(cx + ca * (r - 0.01) - tx * 0.012, cz + sa * (r - 0.01) - tz * 0.012), (cx + ca * (r + 0.014) - tx * 0.012, cz + sa * (r + 0.014) - tz * 0.012),
             (cx + ca * (r + 0.014) + tx * 0.012, cz + sa * (r + 0.014) + tz * 0.012), (cx + ca * (r - 0.01) + tx * 0.012, cz + sa * (r - 0.01) + tz * 0.012)]
        acc.prism(q, y0 + 0.11, y1 - 0.09, MAT['brass'], BRASS)
    acc.cyl(cx, cz, r + 0.05, y1 - 0.12, y1, MAT['brass'], BRASS, n=24)


# ------------------------------------------------------------------------------------------------ the mezzanine's edge
def mezz_fascia(acc, glow, lit, S, x_from, x_to):
    """a deep crimson lacquer fascia on the mezzanine slab's edge (z = MEZZ.z1), from x_from to x_to (each end 2 cm into the wall it meets):
    2 cm into the slab, 8 cm proud of it, from 0.7 m under the floor up to 1 cm under it (the rail's posts stand 1 cm into its top); three
    brass speed lines on its face; a light line under it washes the floor along the edge"""
    L1, zf = S['L1'], S['MEZZ']['z1']
    y0, y1, zb, zt = L1 - 0.70, L1 - 0.01, zf - 0.02, zf + 0.08
    acc.box(x_from, y0, zb, x_to, y1, zt, MAT['lacquer'], CRIMSON)
    for y in (y0 + 0.2, y0 + 0.3, y0 + 0.4):
        acc.box(x_from, y, zt - 0.002, x_to, y + 0.014, zt + 0.012, MAT['brass'], BRASS)
    glow_facing(glow, (x_from + 0.1, y0 - 0.005, zt - 0.07), (x_to - 0.1, y0 - 0.005, zt - 0.07), (x_to - 0.1, y0 - 0.005, zt - 0.02), (x_from + 0.1, y0 - 0.005, zt - 0.02), (0, -1, 0), WARM, 2.2)
    lit.line((x_from + 0.6, y0 - 0.06, zt - 0.04), (x_to - 0.6, y0 - 0.06, zt - 0.04), WARM, 0.5, 5.0, 'h', (0, -1, 0.35))


# ------------------------------------------------------------------------------------------------ the three dedicated areas (v12b)
# The user (11-19): "make reception and bar and popcorn area like dedicated areas with much better overall design" (they picked: restyled
# where they stand). Each gets its own counter, its own ceiling (a cantilevered canopy from the west wall, or a slatted soffit under the
# mezzanine), its own backdrop, its own floor and its own light. The black marble piers between the counters rise into the canopies.
def _rails(acc, xf, ya, yb, z0, z1, mat, col, proud=0.012, back=0.035):
    acc.box(xf - back, ya, z0, xf + proud, yb, z1, mat, col)


def _canopy(acc, glow, lit, xw, xf, y0, y1, z0, z1, lights_z, xl):
    """a black lacquer canopy cantilevered from the wall (2 cm into it) out to xf, from y0 to y1; brass bands 2 cm past its soffit and
    its top along the front; a downlight at (xl, z) for each z; a warm light line in the soffit behind the front band"""
    acc.box(xw - 0.02, y0, z0, xf, y1, z1, MAT['lacquer'], LACQ)
    acc.box(xf - 0.02, y0 - 0.02, z0 - 0.02, xf + 0.012, y0 + 0.04, z1 + 0.02, MAT['brass'], BRASS)
    acc.box(xf - 0.02, y1 - 0.04, z0 - 0.02, xf + 0.012, y1 + 0.02, z1 + 0.02, MAT['brass'], BRASS)
    for z in lights_z:
        acc.cyl(xl, z, 0.09, y0 - 0.02, y0 + 0.02, MAT['brass'], BRASS, n=20)
        disc_down(glow, xl, y0 - 0.025, z, 0.065, WARM, 2.6)
        lit.spot((xl, y0 - 0.07, z), WARM, 1.6, 6.0, 'h', (0, -1, 0), 20, 46)
    glow_facing(glow, (xf - 0.2, y0 - 0.005, z0 + 0.1), (xf - 0.14, y0 - 0.005, z0 + 0.1), (xf - 0.14, y0 - 0.005, z1 - 0.1), (xf - 0.2, y0 - 0.005, z1 - 0.1), (0, -1, 0), WARM, 2.2)
    lit.line((xf - 0.17, y0 - 0.06, z0 + 0.3), (xf - 0.17, y0 - 0.06, z1 - 0.3), WARM, 0.35, 4.0, 'h', (-0.5, -1, 0))


def _counter_base(acc, glow, lit, xf, z0, z1, top_y, body_mat, body_col, toe_col):
    """a counter's recessed black plinth (a toe-kick lit from under the body's front) and its body"""
    acc.box(xf - 0.70, 0.0, z0, xf - 0.12, 0.12, z1, MAT['tblack'], lin('#0c0c0d'))
    acc.box(xf - 0.78, 0.12, z0, xf - 0.02, top_y, z1, body_mat, body_col)
    glow_facing(glow, (xf - 0.10, 0.115, z0 + 0.05), (xf - 0.06, 0.115, z0 + 0.05), (xf - 0.06, 0.115, z1 - 0.05), (xf - 0.10, 0.115, z1 - 0.05), (0, -1, 0), toe_col, 2.4)
    lit.line((xf - 0.08, 0.07, z0 + 0.3), (xf - 0.08, 0.07, z1 - 0.3), toe_col, 0.18, 1.6, 'h', (0.6, -1, 0))


def _inlay(acc, x0, z0, x1, z1, mat, col, frame=0.06):
    """a floor inlay 6 mm proud in a brass frame 11 mm proud (5 mm steps)"""
    acc.box(x0, 0.0, z0, x1, 0.006, z1, mat, col)
    for (a, b, c, d) in ((x0 - frame, z0 - frame, x1 + frame, z0), (x0 - frame, z1, x1 + frame, z1 + frame), (x0 - frame, z0, x0, z1), (x1, z0, x1 + frame, z1)):
        acc.box(a, 0.0, b, c, 0.011, d, MAT['brass'], BRASS)


def ticket_zone(acc, glow, lit, S, xw):
    """the ticket desk: a 10 m desk with backlit onyx front panels between brass mullions on a recessed lit plinth, a black marble top with
    a brass nosing; behind it a backlit onyx panel in a brass frame on the walnut wall; over it, and over the ticket machines beside it,
    a black lacquer canopy with six downlights; a crimson carpet in a brass frame where the queue stands"""
    bo, co = S['COUNTERS']['boxOffice'], S['COUNTERS']['concessions']; xf, za, zb = bo['x1'], bo['z0'], bo['z1']
    _counter_base(acc, glow, lit, xf, za, zb, 1.0, MAT['wood'], lin('#2a1a10'), WARM)
    acc.box(xf - 0.03, 0.17, za + 0.02, xf, 0.94, zb - 0.02, MAT['onyx'], ONYX)                      # the onyx front, behind the mullions
    _rails(acc, xf, 0.12, 0.17, za, zb, MAT['brass'], BRASS); _rails(acc, xf, 0.94, 0.995, za, zb, MAT['brass'], BRASS)
    n = 8; step = (zb - za - 0.04) / n
    for k in range(n + 1):
        z = za + 0.02 + step * k; _rails(acc, xf, 0.17, 0.94, z - 0.02, z + 0.02, MAT['brass'], BRASS)
    acc.box(xf - 0.86, 0.995, za - 0.04, xf + 0.10, 1.06, zb + 0.04, MAT['nero'], lin('#1a1a1c'))   # the top (its ends 4 cm into the piers)
    acc.box(xf + 0.095, 0.99, za, xf + 0.112, 1.065, zb, MAT['brass'], BRASS)                         # its brass nosing
    # the backdrop: onyx on the walnut wall behind the staff, in a brass frame (rails over the stiles)
    acc.box(xw - 0.02, 1.3, 5.2, xw + 0.03, 3.1, 12.8, MAT['onyx'], ONYX)
    for (ya, yb_, z0_, z1_) in ((3.1, 3.16, 5.14, 12.86), (1.24, 1.3, 5.14, 12.86), (1.3, 3.1, 5.14, 5.2), (1.3, 3.1, 12.8, 12.86)):
        acc.box(xw - 0.02, ya, z0_, xw + 0.042, yb_, z1_, MAT['brass'], BRASS)
    lit.line((xw + 0.35, 2.2, 5.5), (xw + 0.35, 2.2, 12.5), lin('#ffc27a'), 0.18, 3.0, 'h', (1, 0, 0))
    # the canopy: from the pier between the snacks and the ticket machines to the pier at the desk's north end (both rise into it)
    _canopy(acc, glow, lit, xw, -15.9, 3.45, 3.75, co['z1'] + 0.13, bo['z1'] + 0.13, (2.6, 5.0, 7.0, 9.0, 11.0, 13.0), xf - 0.3)
    _inlay(acc, -16.42, 4.55, -11.95, 13.45, MAT['carpet'], lin('#5a0a14'))
    return {'id': 'wayfind_tickets', 'x': -15.9 + 0.006, 'y': 3.6, 'z': (za + zb) / 2, 'yaw': math.pi / 2, 'w': 3.0, 'h': 0.18, 'emit': 1}


def popcorn_zone(acc, glow, lit, S, xw):
    """the popcorn parlour: a glossy red counter with chrome ribs on a recessed plinth lit red, a calacatta top with a chrome nosing; a
    marquee canopy (cream face between brass bands, two rows of bulb sockets: the bulbs are the engine's, a chaser, world9.js); a black and
    white chequered floor in a brass frame. Returns (sign, bulbs)"""
    co = S['COUNTERS']['concessions']; xf, za, zb = co['x1'], co['z0'], co['z1']
    _counter_base(acc, glow, lit, xf, za, zb, 0.95, MAT['lacquer'], lin('#7a0a14'), lin('#ff6a4a'))
    for k in range(int((zb - za - 0.1) / 0.3) + 1):
        z = za + 0.08 + 0.3 * k; acc.box(xf - 0.03, 0.13, z - 0.0125, xf + 0.012, 0.95, z + 0.0125, MAT['chrome'], lin('#d8dbe0'))   # ribs, 5 mm up into the top
    acc.box(xf - 0.9, 0.945, za - 0.04, xf + 0.08, 1.0, zb + 0.04, MAT['calacatta'], lin('#ece6dc'))
    acc.box(xf + 0.075, 0.94, za, xf + 0.092, 1.005, zb, MAT['chrome'], lin('#d8dbe0'))
    # the marquee canopy
    z0, z1, y0, y1, xfc = za - 0.13, zb + 0.13, 3.45, 3.90, -15.9   # its top 6 cm under the mezzanine's fascia where that crosses over it
    acc.box(xw - 0.02, y0, z0, xfc, y1, z1, MAT['lacquer'], LACQ)
    acc.box(xfc - 0.02, y0 + 0.02, z0 + 0.02, xfc + 0.02, y1 - 0.02, z1 - 0.02, MAT['lacquer'], lin('#e8dcc4'))   # the cream face
    for ya, yb_ in ((y0 - 0.025, y0 + 0.025), (y1 - 0.03, y1 + 0.02)):   # 5 mm under the ticket canopy's bands where the two meet
        acc.box(xfc - 0.026, ya, z0 - 0.02, xfc + 0.03, yb_, z1 + 0.02, MAT['brass'], BRASS)   # its back 6 mm behind the ticket canopy's band where they meet
    bulbs = []
    for yb_ in (y0 + 0.095, y1 - 0.095):
        z = z0 + 0.25
        while z < z1 - 0.2:
            oc = [(z + 0.035 * math.cos(2 * math.pi * i / 8), yb_ + 0.035 * math.sin(2 * math.pi * i / 8)) for i in range(8)]
            acc.prism_x(oc, xfc + 0.018, xfc + 0.038, MAT['brass'], BRASS)                               # a socket, 2 mm into the face
            bulbs.append([round(xfc + 0.043, 4), round(yb_, 4), round(z, 4)]); z += 0.25
    for z in (za + 0.6, za + 2.4, za + 4.2, za + 6.0, za + 7.8, za + 9.6):
        acc.cyl(xf - 0.3, z, 0.09, y0 - 0.02, y0 + 0.02, MAT['brass'], BRASS, n=20)
        disc_down(glow, xf - 0.3, y0 - 0.025, z, 0.065, WARM, 2.6)
        lit.spot((xf - 0.3, y0 - 0.07, z), WARM, 1.6, 6.0, 'h', (0, -1, 0), 20, 46)
    lit.line((xfc - 0.17, y0 - 0.06, z0 + 0.3), (xfc - 0.17, y0 - 0.06, z1 - 0.3), lin('#ffe6c8'), 0.35, 4.0, 'h', (-0.5, -1, 0))
    # the chequered floor: 0.6 m tiles, 6 mm proud, in a brass frame
    tx0, tz0, nt, nz = -16.4, -8.55, 7, 15
    for i in range(nt):
        for j in range(nz):
            blk = (i + j) % 2 == 0
            acc.box(tx0 + 0.6 * i, 0.0, tz0 + 0.62 * j, tx0 + 0.6 * (i + 1), 0.006, tz0 + 0.62 * (j + 1), MAT['nero'] if blk else MAT['calacatta'], lin('#1a1a1c') if blk else lin('#ece6dc'))
    x1t, z1t = tx0 + 0.6 * nt, tz0 + 0.62 * nz
    for (a, b, c, d) in ((tx0 - 0.06, tz0 - 0.06, x1t + 0.06, tz0), (tx0 - 0.06, z1t, x1t + 0.06, z1t + 0.06), (tx0 - 0.06, tz0, tx0, z1t), (x1t, tz0, x1t + 0.06, z1t)):
        acc.box(a, 0.0, b, c, 0.011, d, MAT['brass'], BRASS)
    sign = {'id': 'wayfind_food', 'x': xfc + 0.026, 'y': (y0 + y1) / 2, 'z': (za + zb) / 2, 'yaw': math.pi / 2, 'w': 3.4, 'h': 0.12, 'emit': 1}
    return sign, bulbs


def bar_zone(acc, glow, lit, S, x0, z0, L1, cz0, cz1):
    """the bar (the cafe corner under the mezzanine): a backlit bottle wall over the back counter (three glass shelves on brass lips,
    seventy-odd bottles in amber, green, ruby, blue and clear glass against a warm glow); a slatted walnut ceiling hung from the
    mezzanine's underside, four brass pendant shades over the bar counter; an oak floor in a brass frame"""
    import random
    xw = x0 + 0.414   # the fluted walnut panel's face over the back counter
    glow_facing(glow, (xw + 0.005, 1.3, cz0 + 0.35), (xw + 0.005, 1.3, cz1 - 0.35), (xw + 0.005, 2.95, cz1 - 0.35), (xw + 0.005, 2.95, cz0 + 0.35), (1, 0, 0), lin('#ffcf94'), 1.7)
    lit.area((xw + 0.25, 2.1, (cz0 + cz1) / 2), (0, 0, (cz1 - cz0) / 2 - 0.5), (0, 0.7, 0), (1, 0, 0), lin('#ffcf94'), 2.2, 5, 'h', 4, 1)
    rnd = random.Random(19); COLS_ = ['#6a3a10', '#1f4a2a', '#9aa8ae', '#5a1018', '#1a3a6a', '#7a5a20']
    for sy in (1.45, 1.95, 2.45):
        acc.box(xw - 0.02, sy, cz0 + 0.4, xw + 0.30, sy + 0.012, cz1 - 0.4, MAT['glass'], lin('#9fb3bf'))          # the shelf, 2 cm into the wall
        acc.box(xw + 0.292, sy - 0.006, cz0 + 0.39, xw + 0.31, sy + 0.03, cz1 - 0.39, MAT['brass'], BRASS)         # its brass lip, 1 cm past the glass at each end
        z = cz0 + 0.55
        while z < cz1 - 0.55:
            r = rnd.choice((0.034, 0.038, 0.044)); h = rnd.choice((0.2, 0.24, 0.28)); c = lin(rnd.choice(COLS_)); xb = xw + 0.15
            acc.cyl(xb, z, r, sy + 0.010, sy + 0.010 + h, MAT['glass'], c, n=14)                                   # the bottle, 2 mm into the shelf
            acc.cyl(xb, z, 0.013, sy + h - 0.01, sy + h + 0.07, MAT['glass'], c, n=8)                               # its neck
            acc.cyl(xb, z, 0.020, sy + h + 0.06, sy + h + 0.085, MAT['brass'] if rnd.random() < 0.5 else MAT['tblack'], BRASS, n=8)   # its cap, 7 mm proud of the neck
            z += 2 * r + rnd.uniform(0.035, 0.07)
    # the slatted soffit: walnut slats along x, 5 cm wide, 12 cm deep, 2 cm up into the mezzanine's slab; clear of its downlights
    ys = L1 - 0.32; slats = []
    for k in range(27):
        z = -13.4 + 0.15 * k
        if abs(z + 12.8) < 0.2: continue   # rooms.py lights_grid: a downlight can at (-20.5, -12.8)
        acc.box(x0 + 0.40, ys - 0.12, z - 0.025, -18.2, ys + 0.02, z + 0.025, MAT['wood'], lin('#3a2416')); slats.append(round(z, 3))
    for z in (-12.5, -11.9, -11.3, -10.7):   # pendant shades over the bar counter (world9.js cafe_counter at x -19.6), each on a rod into a slat
        acc.cyl(-19.6, z, 0.006, 2.5, ys - 0.1, MAT['brass'], BRASS, n=6)
        acc.cyl(-19.6, z, 0.11, 2.34, 2.52, MAT['brass'], BRASS, n=20)
        disc_down(glow, -19.6, 2.335, z, 0.085, WARM, 2.8)
        lit.spot((-19.6, 2.3, z), WARM, 1.5, 5.0, 'h', (0, -1, 0), 25, 55)
    _inlay(acc, x0 + 0.46, z0 + 0.46, -9.3, -9.25, MAT['oak'], lin('#7a5234'))   # its frame to the walls' faces
    return slats
