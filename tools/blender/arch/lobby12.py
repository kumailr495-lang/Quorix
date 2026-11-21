"""LUMIERE v12/v13 - the lobby brought up to the cinema front's level (the user, 2026-11-19: the lobby "looks shit and not premium and more
like a cheap copy"). v12 built noir coffers and backlit onyx columns; on 11-20 the user rejected both ("the pillars look shit ... the ceiling
still sucks ... those cubic lightnings on ceiling which makes no sense") and asked for variants and the best of them. tools/blender/
variants13.py rendered five columns and five ceilings (docs/v13/variants-columns-ceilings.jpg); the user picked P2 and C1b:

  ceiling   (C1b) a dropped field 0.75 m under the roof, warm taupe, floating 0.3 m clear of the walls (a lit shadow gap, washers in it). Over
            the court a round opening steps up twice: a brass band round each opening hides a cove LED that washes the ceiling above from
            the edge in; the step and the dome are lighter so the halo shows; pinpoints round each level, fibre-optic stars in the step and
            the dome, the statue's spots in brass cans; the chandelier hangs from the dome. Away from the halo the floor light comes from
            black-baffle apertures that show no glow (the coffers' grid of lit cans was the "cubic lights")
  columns   (P2) square Nero Marquina shafts on black bases with a brass band, a brass post on each corner whose outer edge is cut at 45
            degrees with an LED strip in the cut, a brass band 0.3 m under the ceiling; the mezzanine's five columns the same, smaller
  fascia    the mezzanine's edge: a deep crimson lacquer fascia with three brass speed lines and a warm light line under it
  runner    the entrance runner is floor (crimson carpet in a brass frame), its end cut to the brand ring's arc (the prop stopped 0.22 m short
            of the ring: "the carpets are cut from middle and not continuing")

House rules (CLAUDE.md): parts embed 2 cm or more into each other or stand more than 3 cm apart; same-facing faces 5 mm or more apart;
glow quads 5 mm off the face they sit on. Every part is checked against what it could meet and the builder refuses a clash."""
import math, random
from geo import MAT, lin, cross, sub

LACQ, BRASS, CRIMSON, WARM = lin('#161518'), lin('#c9a35e'), lin('#7a1420'), lin('#ffd9a8')
CEIL = lin('#5c4f44')   # v13 the field: warm taupe, about 0.08 linear (black, 0.004, would show no cove light at all; the vignette's was 0.09)
PAINT = MAT['rubber']   # v13 the ceiling's paint: library 13 (flat, no tone blotches: the wall paint's macro read as stains on the lit dome)
HALO = lin('#ffcf94')   # v13 the coves' and the corner LEDs' 2700 K
ONYX = lin('#ffffff')   # the onyx scan carries its own colour (abs mode): the ticket desk's front and backdrop


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


def disc_down(glow, x, y, z, r, col, k, n=12, up=False):
    for i in range(n):
        a0, a1 = 2 * math.pi * i / n, 2 * math.pi * (i + 1) / n
        glow_facing(glow, (x, y, z), (x + r * math.cos(a0), y, z + r * math.sin(a0)), (x + r * math.cos(a1), y, z + r * math.sin(a1)), (x, y, z), (0, 1 if up else -1, 0), col, k)


def _tri(acc, a, b, c, mat, col, na, nb, nc):
    """a triangle wound so that it faces the way its vertex normals point (the engine culls back faces)"""
    g = cross(sub(b, a), sub(c, a))
    if g[0] ** 2 + g[1] ** 2 + g[2] ** 2 < 1e-18: return
    if g[0] * (na[0] + nb[0] + nc[0]) + g[1] * (na[1] + nb[1] + nc[1]) + g[2] * (na[2] + nb[2] + nc[2]) < 0: b, c, nb, nc = c, b, nc, nb
    acc.tri(a, b, c, mat, col, na, nb, nc)


def lathe(acc, cx, cz, prof, n=128):
    """a solid of revolution about the vertical through (cx, cz). prof [(r, y, mat, col)] runs round the section (bottom centre, out, up,
    back in); each segment takes its first point's material. Smooth round the axis, sharp at the section's corners; r 0 closes it"""
    P = lambda r, y, t: (cx + r * math.cos(t), y, cz + r * math.sin(t))
    for (r0, y0, m, c), (r1, y1, _, _) in zip(prof, prof[1:]):
        dr, dy = r1 - r0, y1 - y0; L = math.hypot(dr, dy)
        if L < 1e-9: continue
        nr, ny = dy / L, -dr / L   # the section's outward normal for a profile run out along the bottom, up the edge, back along the top
        for i in range(n):
            t0, t1 = 2 * math.pi * i / n, 2 * math.pi * (i + 1) / n
            n0, n1 = (nr * math.cos(t0), ny, nr * math.sin(t0)), (nr * math.cos(t1), ny, nr * math.sin(t1))
            a, b, cc, d = P(r0, y0, t0), P(r0, y0, t1), P(r1, y1, t1), P(r1, y1, t0)
            if r0 > 1e-9: _tri(acc, a, b, cc, m, c, n0, n1, n1)
            if r1 > 1e-9: _tri(acc, a, cc, d, m, c, n0, n1, n0)


# ------------------------------------------------------------------------------------------------ v13 the ceiling (variant C1b, the user's pick)
FIELD_DROP, STEP = 0.75, 0.32   # the field hangs 0.75 m under the roof; the halo's two steps rise 0.32 m each (the dome is 0.11 m under the roof)
STEP1, DOME = lin('#7d6d5e'), lin('#a8977f')   # the step and the dome, lighter than the field (0.15 and 0.30 linear): the coves glow on them


def _down(acc, pts, mat, col):
    """a convex horizontal polygon facing down"""
    nn = (0.0, -1.0, 0.0)
    for i in range(1, len(pts) - 1): _tri(acc, pts[0], pts[i], pts[i + 1], mat, col, nn, nn, nn)


def annulus(acc, cx, cz, r0, r1, y, mat, col, n=128):
    """a flat ring facing down (r0 0: a disc)"""
    P = lambda r, t: (cx + r * math.cos(t), y, cz + r * math.sin(t)); nn = (0.0, -1.0, 0.0)
    for i in range(n):
        t0, t1 = 2 * math.pi * i / n, 2 * math.pi * (i + 1) / n
        if r0 > 1e-9: _tri(acc, P(r0, t0), P(r0, t1), P(r1, t1), mat, col, nn, nn, nn)
        _tri(acc, P(r0, t0), P(r1, t1), P(r1, t0), mat, col, nn, nn, nn)


def wall_in(acc, cx, cz, r, y0, y1, mat, col, n=128):
    """a round wall facing its axis"""
    for i in range(n):
        t0, t1 = 2 * math.pi * i / n, 2 * math.pi * (i + 1) / n
        n0, n1 = (-math.cos(t0), 0.0, -math.sin(t0)), (-math.cos(t1), 0.0, -math.sin(t1))
        a, b = (cx + r * math.cos(t0), y0, cz + r * math.sin(t0)), (cx + r * math.cos(t1), y0, cz + r * math.sin(t1))
        _tri(acc, a, b, (b[0], y1, b[2]), mat, col, n0, n1, n1); _tri(acc, a, (b[0], y1, b[2]), (a[0], y1, a[2]), mat, col, n0, n1, n0)


def ring_solid(acc, cx, cz, r0, r1, y0, y1, mat, col, n=128):
    lathe(acc, cx, cz, [(r0, y0, mat, col), (r1, y0, mat, col), (r1, y1, mat, col), (r0, y1, mat, col), (r0, y0, None, None)], n)


def field(acc, glow, walls, yF, cx, cz, R1, Q, holes, edges=(), gap=0.3, n=128):
    """the dropped field (C1b): one plane at yF facing down, `gap` clear of the walls (a lit shadow gap; rooms.py washes the walls from it),
    with the halo's round opening (radius R1 about (cx, cz)) and rectangular holes [(x0, z0, x1, z1)] where a hall has its own ceiling
    (the escalator hall: the field runs 2 cm into its walls). Cells on cut lines through every corner (no vertex lies on another cell's
    edge: T-junctions crack); the square of half side Q round the opening is a radial mesh: each side carries a point where each of the
    circle's rays meets it (and the cut points that land on it), the strips are stitched by angle, and the cells along the square take the
    same points on their edges (each cell is a fan from its centre). Fascias 8 cm deep on the outer edges and on `edges`."""
    x0, z0, x1, z1 = walls; X0, Z0, X1, Z1 = x0 + gap, z0 + gap, x1 - gap, z1 - gap
    sq = (cx - Q, cz - Q, cx + Q, cz + Q)
    xs = sorted({X0, X1, sq[0], sq[2]} | {v for h in holes for v in (h[0], h[2])})
    zs = sorted({Z0, Z1, sq[1], sq[3]} | {v for h in holes for v in (h[1], h[3])})
    nn = (0.0, -1.0, 0.0); q = n // 4; P = lambda p: (p[0], yF, p[1])
    corners = [(sq[2], sq[1]), (sq[2], sq[3]), (sq[0], sq[3]), (sq[0], sq[1])]
    sides, onsq = [], []
    for k in range(4):   # east, front, west, back: anticlockwise by angle from -45 degrees
        (ax, az), (bx, bz) = corners[k], corners[(k + 1) % 4]; t0 = -math.pi / 4 + k * math.pi / 2
        aa = [t0 + (math.pi / 2) * i / q for i in range(q + 1)]
        def hit(t):   # where the ray from the centre at angle t meets this side
            c, s_ = math.cos(t), math.sin(t)
            return (ax, cz + (ax - cx) * s_ / c) if abs(ax - bx) < 1e-9 else (cx + (az - cz) * c / s_, az)
        pts = [corners[k]] + [hit(t) for t in aa[1:-1]] + [corners[(k + 1) % 4]]
        if abs(ax - bx) < 1e-9: pts += [(ax, z) for z in zs if min(az, bz) + 1e-6 < z < max(az, bz) - 1e-6]
        else: pts += [(x, az) for x in xs if min(ax, bx) + 1e-6 < x < max(ax, bx) - 1e-6]
        unwrap = lambda a: a + 2 * math.pi * math.ceil((t0 - 1e-6 - a) / (2 * math.pi))
        side = sorted(pts, key=lambda p: unwrap(math.atan2(p[1] - cz, p[0] - cx)))
        sides.append((side, [unwrap(math.atan2(p[1] - cz, p[0] - cx)) for p in side], aa)); onsq += side
    within = lambda r, a, b, c, d: r[0] - 1e-9 <= a and c <= r[2] + 1e-9 and r[1] - 1e-9 <= b and d <= r[3] + 1e-9
    for xa, xb in zip(xs, xs[1:]):
        for za, zb in zip(zs, zs[1:]):
            if within(sq, xa, za, xb, zb) or any(within(h, xa, za, xb, zb) for h in holes): continue
            ring = []   # the cell's outline anticlockwise, with every square point that lies on its edges
            for (pa, pb) in (((xa, za), (xb, za)), ((xb, za), (xb, zb)), ((xb, zb), (xa, zb)), ((xa, zb), (xa, za))):
                on = [p for p in onsq if abs((pb[0] - pa[0]) * (p[1] - pa[1]) - (pb[1] - pa[1]) * (p[0] - pa[0])) < 1e-9
                      and min(pa[0], pb[0]) - 1e-9 <= p[0] <= max(pa[0], pb[0]) + 1e-9 and min(pa[1], pb[1]) - 1e-9 <= p[1] <= max(pa[1], pb[1]) + 1e-9
                      and math.dist(p, pa) > 1e-6 and math.dist(p, pb) > 1e-6]
                ring += [pa] + sorted(on, key=lambda p: math.dist(p, pa))
            c_ = ((xa + xb) / 2, (za + zb) / 2)
            for i in range(len(ring)): _tri(acc, P(c_), P(ring[i]), P(ring[(i + 1) % len(ring)]), PAINT, CEIL, nn, nn, nn)
    for side, sa, aa in sides:
        arcp = [(cx + R1 * math.cos(t), cz + R1 * math.sin(t)) for t in aa]
        i = j = 0
        while i < len(side) - 1 or j < q:
            if j == q or (i < len(side) - 1 and sa[i + 1] <= aa[j + 1] + 1e-9): _tri(acc, P(side[i]), P(side[i + 1]), P(arcp[j]), PAINT, CEIL, nn, nn, nn); i += 1
            else: _tri(acc, P(side[i]), P(arcp[j + 1]), P(arcp[j]), PAINT, CEIL, nn, nn, nn); j += 1
    # fascias: the outer edges split on the cuts (they share the cells' corners), and the given inner edges
    fas = [((xa, Z0), (xb, Z0), (0.0, -1.0)) for xa, xb in zip(xs, xs[1:])] + [((xa, Z1), (xb, Z1), (0.0, 1.0)) for xa, xb in zip(xs, xs[1:])]
    fas += [((X0, za), (X0, zb), (-1.0, 0.0)) for za, zb in zip(zs, zs[1:])] + [((X1, za), (X1, zb), (1.0, 0.0)) for za, zb in zip(zs, zs[1:])]
    for (ax, az), (bx, bz), (nx, nz) in list(fas) + list(edges):
        facing(acc, (ax, yF, az), (bx, yF, bz), (bx, yF + 0.08, bz), (ax, yF + 0.08, az), (nx, 0.0, nz), PAINT, CEIL)
    # the shadow gap's light: a warm strip 2 cm off each fascia, 12 mm over the field's face (the corners left out: two strips never overlap)
    yg = yF + 0.012
    for (a, b, c, d) in ((X0 - 0.08, Z0, X0 - 0.02, Z1), (X1 + 0.02, Z0, X1 + 0.08, Z1), (X0, Z0 - 0.08, X1, Z0 - 0.02), (X0, Z1 + 0.02, X1, Z1 + 0.08)):
        glow_facing(glow, (a, yg, b), (c, yg, b), (c, yg, d), (a, yg, d), (0, -1, 0), HALO, 2.0)
    return X0, Z0, X1, Z1


def _pin(acc, glow, lit, x, y, z, I):
    """a pinpoint downlight in a ceiling at y: a brass trim 12 mm proud (2 cm up into the ceiling), its lamp, its light"""
    acc.cyl(x, z, 0.05, y - 0.012, y + 0.02, MAT['brass'], BRASS, n=16)
    disc_down(glow, x, y - 0.017, z, 0.032, WARM, 2.8, n=10)
    lit.spot((x, y - 0.05, z), WARM, I, 11.0, 'h', (0, -1, 0), 25, 55)


def halo(acc, glow, lit, cx, cz, R1, R2, yF, cans=(), target=(0.0, 3.0, 10.0)):
    """C1b: the field's round opening (R1) steps up twice. Round each opening a brass band 12 cm wide and 19 cm tall (its upstand hides the
    cove's LED, 24 cm out behind it, which washes the ceiling above inwards from the edge); a pocket 0.40 m deep behind the band; the step (a
    ring, its own opening R2) and the dome above. Pinpoints round the opening on the field, on the step and in the dome; the statue's spots in
    brass cans under the dome (cans [(x, z, I)], aimed at target); fibre-optic stars in the step and the dome. Returns the dome's height
    (the chandelier hangs from it)"""
    y1s, yD = yF + STEP, yF + 2 * STEP
    for (Rk, ylo, yup, rin, col) in ((R1, yF, y1s, R2, STEP1), (R2, y1s, yD, 0.0, DOME)):
        ring_solid(acc, cx, cz, Rk, Rk + 0.12, ylo - 0.06, ylo + 0.13, MAT['brass'], BRASS)   # the band: the ceiling's edge ends inside it
        wall_in(acc, cx, cz, Rk + 0.40, ylo, yup + 0.02, PAINT, col)                   # the pocket's back wall (2 cm over the ceiling above)
        annulus(acc, cx, cz, rin, Rk + 0.42, yup, PAINT, col)                          # the ceiling above, 2 cm past the pocket's wall
        rl = Rk + 0.24
        for i in range(32):
            t0, t1 = 2 * math.pi * i / 32, 2 * math.pi * (i + 1) / 32; tm = (t0 + t1) / 2
            lit.line((cx + rl * math.cos(t0), ylo + 0.04, cz + rl * math.sin(t0)), (cx + rl * math.cos(t1), ylo + 0.04, cz + rl * math.sin(t1)), HALO, 0.6, 6.0, 'h', (-0.6 * math.cos(tm), 1.0, -0.6 * math.sin(tm)))
    spots = []
    for (sx, sz, I) in cans:
        acc.cyl(sx, sz, 0.07, yD - 0.10, yD + 0.02, MAT['brass'], BRASS, n=16)
        disc_down(glow, sx, yD - 0.105, sz, 0.05, lin('#ffe6c2'), 2.4)
        lit.spot((sx, yD - 0.12, sz), lin('#ffe2b8'), I, 12, 'h', (target[0] - sx, target[1] - (yD - 0.12), target[2] - sz), 9, 20); spots.append((sx, sz))
    rings = ((R1 + 1.3, yF, 16, 3.0), ((R1 + R2) / 2 + 0.1, y1s, 20, 3.0), (2.3, yD, 8, 2.4))   # the court's floor as bright as under the v12 rings (measured)
    pins = []
    for (rr, y, k, I) in rings:
        for i in range(k):
            t = 2 * math.pi * (i + 0.5) / k; x, z = cx + rr * math.cos(t), cz + rr * math.sin(t)
            refuse('a pinpoint beside a statue can', min([math.hypot(x - sx, z - sz) for sx, sz in spots] + [9.0]) - 0.12, 0.25)
            _pin(acc, glow, lit, x, y, z, I); pins.append((x, z))
    srnd = random.Random(11)
    for (ra, rb, y, want) in ((R2 + 0.35, R1 - 0.15, y1s, 160), (0.6, R2 - 0.2, yD, 220)):
        stars = []; tries = 0
        while len(stars) < want and tries < 30000:
            tries += 1; rr = math.sqrt(ra * ra + (rb * rb - ra * ra) * srnd.random()); t = 2 * math.pi * srnd.random(); x, z = cx + rr * math.cos(t), cz + rr * math.sin(t)
            r_ = srnd.choice((0.008, 0.011, 0.014, 0.018))
            if any(math.hypot(x - px, z - pz) < 0.12 for px, pz in pins) or any(math.hypot(x - sx, z - sz) < 0.16 for sx, sz in spots): continue
            if any(abs(x - qx) < r_ + qr + 0.02 and abs(z - qz) < r_ + qr + 0.02 for qx, qz, qr in stars): continue   # two on one spot fight
            stars.append((x, z, r_)); col = lin('#fff4dc') if srnd.random() < 0.7 else lin('#dfe8ff'); yy = y - 0.005
            glow_facing(glow, (x - r_, yy, z - r_), (x + r_, yy, z - r_), (x + r_, yy, z + r_), (x - r_, yy, z + r_), (0, -1, 0), col, srnd.choice((2.0, 2.8, 3.6)))
    return yD


def apertures(acc, lit, y, spots, I=2.1):
    """the general floor light away from the halo: deep black-baffle downlights in the field, no glow (a lit dot per light was the coffers'
    "cubic lights"): a black trim 12 mm proud, 2 cm up into the field, a warm beam"""
    for (x, z) in spots:
        acc.cyl(x, z, 0.075, y - 0.012, y + 0.02, MAT['tblack'], lin('#0b0b0c'), n=16)
        lit.spot((x, y - 0.06, z), WARM, I, 11.0, 'h', (0, -1, 0), 18, 42)


# ------------------------------------------------------------------------------------------------ v13 columns (variant P2, the user's pick)
def _corner(acc, glow, lit, x, z, sx, sz, h, ch, y0, y1, g0, g1, light):
    """a brass corner post centred on the shaft's corner (x, z), half side h; its outer edge (towards (sx, sz)) cut at 45 degrees by ch, an
    LED strip on the cut from g0 to g1 (5 mm proud), and its light (Ipm `light`) washing out along the diagonal"""
    P = [(x - sx * h, z - sz * h), (x + sx * h, z - sz * h), (x + sx * h, z + sz * (h - ch)), (x + sx * (h - ch), z + sz * h), (x - sx * h, z + sz * h)]
    acc.prism(P, y0, y1, MAT['brass'], BRASS)
    nx, nz = sx / math.sqrt(2), sz / math.sqrt(2); ux, uz = -sx / math.sqrt(2), sz / math.sqrt(2)
    mx, mz = x + sx * (h - ch / 2) + nx * 0.005, z + sz * (h - ch / 2) + nz * 0.005; w = ch * math.sqrt(2) * 0.3
    glow_facing(glow, (mx - ux * w, g0, mz - uz * w), (mx + ux * w, g0, mz + uz * w), (mx + ux * w, g1, mz + uz * w), (mx - ux * w, g1, mz - uz * w), (nx, 0, nz), HALO, 2.2)
    if light: lit.line((mx + nx * 0.05, g0 + 0.2, mz + nz * 0.05), (mx + nx * 0.05, g1 - 0.2, mz + nz * 0.05), HALO, light, 2.5, 'h', (nx, 0.0, nz))


def marble_column(acc, glow, lit, cx, cz, yb, yt, w=0.40, h=0.06, base=0.49, bh=0.30, cap=0.50, ch=0.03, light=0.10):
    """P2: a square Nero Marquina shaft (half side w) on a black base (half side base, bh tall, a brass band 15 mm proud round it), up to yt
    (2 cm into the ceiling it meets); a brass post on each corner, 6 cm proud of both faces, its outer edge cut at 45 degrees with an LED in
    the cut; a brass band 0.3 m under the ceiling. Footprint: the base (corner radius base * 1.414)"""
    acc.box(cx - base, yb, cz - base, cx + base, yb + bh, cz + base, MAT['tblack'], lin('#0c0c0d'))
    acc.box(cx - base - 0.015, yb + bh - 0.08, cz - base - 0.015, cx + base + 0.015, yb + bh - 0.03, cz + base + 0.015, MAT['brass'], BRASS)
    acc.box(cx - w, yb + bh - 0.02, cz - w, cx + w, yt, cz + w, MAT['nero'], lin('#e6e6e6'))
    yc = yt - 0.02 - 0.30   # the band's top
    acc.box(cx - cap, yc - 0.06, cz - cap, cx + cap, yc, cz + cap, MAT['brass'], BRASS)
    for sx in (-1, 1):
        for sz in (-1, 1): _corner(acc, glow, lit, cx + sx * w, cz + sz * w, sx, sz, h, ch, yb + bh - 0.02, yt, yb + bh + 0.15, yc - 0.21, light)


# ------------------------------------------------------------------------------------------------ v13 the zones' fins and signs
def zone_fin(acc, glow, lit, xw, xf, z0, z1, ytop, led_top):
    """v13 (the user, 11-20: "make the reception and the areas separated and much more defined"): a Nero Marquina fin from the west wall
    (2 cm into its face xw) out to xf between two zones, z0..z1, up to ytop (into the field or the mezzanine's slab), in the columns' language:
    a black skirting 15 mm proud, a brass nose 3 cm proud of its end (12 mm past its faces) with an LED line down it to led_top"""
    acc.box(xw - 0.02, 0.0, z0, xf, ytop, z1, MAT['nero'], lin('#e6e6e6'))
    acc.box(xw - 0.02, 0.0, z0 - 0.02, xf + 0.015, 0.16, z1 + 0.02, MAT['tblack'], lin('#0c0c0d'))   # v14: 8 mm past the nose's sides (3 mm fought from the street)
    acc.box(xf - 0.02, 0.14, z0 - 0.012, xf + 0.03, ytop, z1 + 0.012, MAT['brass'], BRASS)
    zc = (z0 + z1) / 2
    glow_facing(glow, (xf + 0.035, 0.4, zc - 0.012), (xf + 0.035, 0.4, zc + 0.012), (xf + 0.035, led_top, zc + 0.012), (xf + 0.035, led_top, zc - 0.012), (1, 0, 0), HALO, 2.4)
    lit.line((xf + 0.09, 0.6, zc), (xf + 0.09, led_top - 0.3, zc), HALO, 0.12, 2.5, 'h', (1.0, 0.0, 0.0))


# ------------------------------------------------------------------------------------------------ v13 the entrance runner
def runner_to_ring(acc, cx, cz, rr, hw, z_end, frame=0.06):
    """a crimson carpet runner from z_end (by the doors) to the brand ring (centre (cx, cz), brass edge radius rr), its end cut to the
    ring's arc so it meets the ring all the way across: the carpet 6 mm proud in a brass frame 13 mm proud (5 mm over the ring's brass,
    0.008), its arc lapping the ring's edge (four pieces that share edges, never faces)"""
    arc = lambda x, r: cz + math.sqrt(r * r - (x - cx) ** 2)   # the circle's front half (towards the doors)
    xi = hw - frame; ra = rr + frame; N = 24
    rr -= 0.012   # the frame's arc 12 mm over the ring's brass (the ring is a 48-gon: its chords sag 7 mm inside the circle), 5 mm above it
    xs = [cx - xi + 2 * xi * k / N for k in range(N + 1)]
    carpet = [(x, arc(x, ra)) for x in xs] + [(cx + xi, z_end - frame), (cx - xi, z_end - frame)]
    acc.prism(carpet, 0.0, 0.006, MAT['carpet'], lin('#5a0a14'), bottom=False)
    band = [(x, arc(x, rr)) for x in xs] + [(x, arc(x, ra)) for x in reversed(xs)]
    acc.prism(band, 0.0, 0.013, MAT['brass'], BRASS, bottom=False)
    for s in (-1, 1):   # the sides: from the ring's edge (its arc between the band's end and the runner's edge) to the frame's end
        xa, xb = cx + s * xi, cx + s * hw; ex = [xa + (xb - xa) * k / 4 for k in range(5)]
        side = [(x, arc(x, rr)) for x in ex] + [(xb, z_end), (xa, z_end)]
        acc.prism(side, 0.0, 0.013, MAT['brass'], BRASS, bottom=False)
    acc.prism([(cx - xi, z_end - frame), (cx + xi, z_end - frame), (cx + xi, z_end), (cx - xi, z_end)], 0.0, 0.013, MAT['brass'], BRASS, bottom=False)


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
    _canopy(acc, glow, lit, xw, -15.9, 3.45, 4.25, co['z1'] + 0.13, bo['z1'] + 0.13, (2.6, 5.0, 7.0, 9.0, 11.0, 13.0), xf - 0.3)   # v13 a 0.8 m fascia for the zone's name
    _inlay(acc, -16.42, 4.55, -11.95, 13.45, MAT['carpet'], lin('#5a0a14'))
    return [{'id': 'zone_tickets', 'x': -15.9 + 0.006, 'y': 3.85, 'z': (za + zb) / 2, 'yaw': math.pi / 2, 'w': 6.2, 'h': 0.62, 'emit': 1},   # v13 between the fascia's brass bands
            {'id': 'zone_kiosk', 'x': -15.9 + 0.006, 'y': 3.85, 'z': (co['z1'] + bo['z0']) / 2, 'yaw': math.pi / 2, 'w': 1.9, 'h': 0.46, 'emit': 1}]


def popcorn_zone(acc, glow, lit, S, xw):
    """the popcorn parlour: a glossy red counter with chrome ribs on a recessed plinth lit red, a calacatta top with a chrome nosing; a
    marquee canopy (cream face between brass bands, two rows of bulb sockets: the bulbs are the engine's, a chaser, world9.js); a black and
    white chequered floor in a brass frame. Returns (sign, bulbs)"""
    co = S['COUNTERS']['concessions']; xf, za, zb = co['x1'], co['z0'], co['z1']
    _counter_base(acc, glow, lit, xf, za, zb, 0.95, MAT['lacquer'], lin('#7a0a14'), lin('#ff6a4a'))
    n_r = int((zb - za - 0.2) / 0.3); m_r = (zb - za - 0.3 * n_r) / 2   # v14: centred, 10 cm or more from each end (the zone fins' skirting runs 4 cm in)
    for k in range(n_r + 1):
        z = za + m_r + 0.3 * k; acc.box(xf - 0.03, 0.13, z - 0.0125, xf + 0.012, 0.95, z + 0.0125, MAT['chrome'], lin('#d8dbe0'))   # ribs, 5 mm up into the top
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
