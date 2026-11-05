"""LUMIERE v9 - the rooms around the halls, as closed-solid models from the building spec (www/js/building.js):
lobby (double height, mezzanine, escalators, lift, box office, concessions, lounge), corridor (L1: the long, dim, Dolby-style way in with
curves, rounded corners and diamond relief), spine (G: the bright way out with a travelator and exit stairs), restrooms, street.
Palettes: docs/V9-DESIGN.md section 5 (3-4 colours per space, dim variants of the same hues)."""
import math, random
from geo import Acc, Glow, Lights, MAT, lin, mix

def build(key, S):
    fn = globals().get('build_' + key)
    if not fn: raise SystemExit(f'no builder for room {key}')
    return fn(S)

# ------------------------------------------------------------------------------------------------ shared elements
def slab(acc, x0, z0, x1, z1, y, t, mat, col, top=None, topcol=None):
    acc.box(x0, y - t, z0, x1, y, z1, mat, col, top=top, topcol=topcol)

def glass_rail(acc, glow, path, y, mat_post=MAT['brass'], col_post=None, h=1.05, glass=True, led=None):
    """balustrade along a 2D path at floor height y: posts every 1.2 m, a glass panel (2 cm, closed), a round handrail"""
    col_post = col_post or lin('#8a6a3a')
    for i in range(len(path) - 1):
        (ax, az), (bx, bz) = path[i], path[i + 1]; L = math.hypot(bx - ax, bz - az)
        if L < 1e-3: continue
        n = max(1, int(L / 1.2)); ux, uz = (bx - ax) / L, (bz - az) / L
        for k in range(n + 1):
            px, pz = ax + ux * L * k / n, az + uz * L * k / n
            acc.box(px - 0.025, y, pz - 0.025, px + 0.025, y + h - 0.02, pz + 0.025, mat_post, col_post)
        if glass:
            nx, nz = -uz, ux
            q = [(ax + nx * 0.01, az + nz * 0.01), (bx + nx * 0.01, bz + nz * 0.01), (bx - nx * 0.01, bz - nz * 0.01), (ax - nx * 0.01, az - nz * 0.01)]
            acc.prism(q, y + 0.08, y + h - 0.1, MAT['glass'], lin('#9fb3bf'))
        if led:
            nx, nz = -uz, ux
            glow.quad((bx, y + 0.03, bz), (ax, y + 0.03, az), (ax + nx * 0.0, y + 0.06, az), (bx, y + 0.06, bz), led, 0.8)
    acc.tube([(x, y + h, z) for x, z in path], 0.025, mat_post, col_post, n=10)

def stair(acc, glow, x0, x1, z_top, z_dir, y_top, y_bot, n, mat, col, nose=None, k_nose=1.3):
    """straight stair, x0..x1 wide, starting at z_top (at y_top) and going down along z_dir; closed solid steps down to y_bot"""
    rise = (y_top - y_bot) / n; tread = 0.3
    for i in range(n):
        za, zb = z_top + z_dir * i * tread, z_top + z_dir * (i + 1) * tread; yy = y_top - (i + 1) * rise
        acc.box(x0, y_bot, min(za, zb), x1, yy, max(za, zb), mat, col)
        if nose:
            zn = za + z_dir * 0.03
            glow.quad((x1 - 0.05, yy + 0.003, min(zn, zn + z_dir * 0.03)), (x0 + 0.05, yy + 0.003, min(zn, zn + z_dir * 0.03)), (x0 + 0.05, yy + 0.003, max(zn, zn + z_dir * 0.03)), (x1 - 0.05, yy + 0.003, max(zn, zn + z_dir * 0.03)), nose, k_nose)
    return tread * n

def diamond_wall(acc, a, b, y0, y1, face, size, depth, mat, col, col2, rnd=None):
    """3D diamond relief on a wall face from a to b (2D), facing +face (left normal of a->b if face > 0), between heights y0 and y1:
    a field of shallow pyramids on a flat backing (the backing is the room wall; the pyramids are closed by their base on it)"""
    L = math.hypot(b[0] - a[0], b[1] - a[1]); ux, uz = (b[0] - a[0]) / L, (b[1] - a[1]) / L; nx, nz = -uz * face, ux * face
    W = lambda s, y, o: (a[0] + ux * s + nx * o, y, a[1] + uz * s + nz * o)
    nu, nv = int(L / size), int((y1 - y0) / (size * 0.6))
    du, dv = L / nu, (y1 - y0) / nv
    for i in range(nu):
        for j in range(nv):
            cs, cy = (i + 0.5) * du, y0 + (j + 0.5) * dv
            if (i + j) % 2: continue   # every other cell: diamonds in a lattice, the gaps show the wall behind (rhythm)
            pts = [W(cs - du * 0.5, cy, 0.002), W(cs, cy - dv * 0.5, 0.002), W(cs + du * 0.5, cy, 0.002), W(cs, cy + dv * 0.5, 0.002)]
            apex = W(cs, cy, depth); cc = mix(col, col2, (rnd.random() * 0.6) if rnd else 0.3)
            ring = pts if face > 0 else pts[::-1]
            for k in range(4):
                p, q = ring[k], ring[(k + 1) % 4]
                acc.tri(p, q, apex, mat, cc)

def lights_grid(lit, acc, glow, x0, z0, x1, z1, y, step, col, I, r, ch='h', can=True):
    nx, nz = max(1, int((x1 - x0) / step)), max(1, int((z1 - z0) / step))
    for i in range(nx + 1):
        for j in range(nz + 1):
            x, z = x0 + (x1 - x0) * i / nx, z0 + (z1 - z0) * j / nz
            lit.spot((x, y - 0.05, z), col, I, r, ch, (0, -1, 0), 25, 60)
            if can:
                acc.cyl(x, z, 0.08, y - 0.02, y + 0.001, MAT['metal'], lin('#2a2a2e'), n=12)
                glow.quad((x - 0.055, y - 0.022, z - 0.055), (x + 0.055, y - 0.022, z - 0.055), (x + 0.055, y - 0.022, z + 0.055), (x - 0.055, y - 0.022, z + 0.055), col, 2.2)

def escalator(acc, glow, lit, e, dirz=-1):
    """static parts of an escalator (balustrades, skirts, handrails, truss cladding, landing plates); the moving steps are the engine's"""
    p = e['profile']; x0, x1 = e['x0'], e['x1']; y0, y1 = e['y0'], e['y1']
    zb0, zb1 = p['plateBot']; zf0, zf1 = p['flatBot']; zi0, zi1 = p['incline']; zt0, zt1 = p['flatTop']; zp0, zp1 = p['plateTop']
    def h_at(z):
        if z >= zi0: return y0
        if z <= zi1: return y1
        return y0 + (zi0 - z) / (zi0 - zi1) * (y1 - y0)
    # truss: a sloped box under the steps, clad in brushed metal (closed: built as a prism in the y-z plane, extruded along x)
    prof = [(zb0, y0 - 0.02), (zi0, y0 - 0.02), (zi1, y1 - 0.02), (zp1, y1 - 0.02), (zp1, y1 - 0.9), (zi1 - 0.6, y1 - 1.1), (zi0 - 0.6, y0 - 0.25), (zb0, y0 - 0.25)]
    acc.prism_x(prof, x0, x1, MAT['metal'], lin('#7c7f86'))
    # landing plates (comb plates) on the floors
    acc.box(x0, y0, zb1, x1, y0 + 0.02, zb0, MAT['metal'], lin('#9a9da4')); acc.box(x0, y1, zp1, x1, y1 + 0.02, zp0, MAT['metal'], lin('#9a9da4'))
    # balustrades: glass panels following the slope, a black rubber handrail on top, skirt lights
    for xs in (x0, x1):
        zs = [zb0 - 0.2, zf0, zi0, zi1, zt1, zp1 + 0.2]
        for k in range(len(zs) - 1):
            za, zb = zs[k], zs[k + 1]; ya, yb = h_at(za), h_at(zb)
            acc.prism_x([(za, ya + 0.12), (zb, yb + 0.12), (zb, yb + 0.98), (za, ya + 0.98)], xs - 0.012, xs + 0.012, MAT['glass'], lin('#a7b8c2'))
        path = [(xs, h_at(z) + 1.0, z) for z in [zb0 - 0.2, zf0, zi0, zi1, zt1, zp1 + 0.2]]
        acc.tube(path, 0.04, MAT['rubber'], lin('#121214'), n=8)
        # skirt: a low metal wall beside the steps with a light line (fixed)
        for k in range(len(zs) - 1):
            za, zb = zs[k], zs[k + 1]; ya, yb = h_at(za), h_at(zb)
            inner = xs + (0.05 if xs == x0 else -0.05)
            acc.quad((inner, ya, za), (inner, yb, zb), (inner, yb + 0.12, zb), (inner, ya + 0.12, za), MAT['metal'], lin('#5c5f66')) if xs == x0 else acc.quad((inner, ya + 0.12, za), (inner, yb + 0.12, zb), (inner, yb, zb), (inner, ya, za), MAT['metal'], lin('#5c5f66'))
        lit.line((xs + (0.1 if xs == x0 else -0.1), y0 + 0.15, zf0), (xs + (0.1 if xs == x0 else -0.1), y1 + 0.15, zt1), lin('#ffe0b0'), 0.08, 2.0, 'f')
    return h_at

# ------------------------------------------------------------------------------------------------ lobby
def build_lobby(S):
    LB, MZ, L1 = S['LOBBY'], S['MEZZ'], S['L1']; x0, x1, z0, z1, H = LB['x0'], LB['x1'], LB['z0'], LB['z1'], LB['ceil']
    acc, glow = Acc(), Glow(); lit = Lights([x0, z0, x1, z1], H)
    P = {k: lin(v) for k, v in S['PALETTE']['lobby'].items()}; B = {k: lin(v) for k, v in S['PALETTE']['brand'].items()}
    rnd = random.Random(3)
    # floor: warm stone; a brand ring inlaid in front of the doors (champagne terrazzo ring, ink terrazzo disc)
    slab(acc, x0 - 0.4, z0 - 0.4, x1 + 0.4, z1 + 0.4, 0.0, 0.3, MAT['stone'], P['stone'])
    for i in range(48):
        a0, a1 = 2 * math.pi * i / 48, 2 * math.pi * (i + 1) / 48
        for r0, r1, mat, col, yy in ((0.0, 2.6, MAT['tblack'], mix(B['ink'], (0, 0, 0), 0.3), 0.004), (2.6, 3.0, MAT['terrazzo'], P['champagne'], 0.006), (3.0, 3.08, MAT['brass'], B['gold'], 0.008)):
            cx, cz = 0.0, 10.0
            p = [(cx + r0 * math.cos(a0), yy, cz + r0 * math.sin(a0)), (cx + r1 * math.cos(a0), yy, cz + r1 * math.sin(a0)), (cx + r1 * math.cos(a1), yy, cz + r1 * math.sin(a1)), (cx + r0 * math.cos(a1), yy, cz + r0 * math.sin(a1))]
            acc.quad(p[0], p[3], p[2], p[1], mat, col) if r0 > 0 else acc.tri(p[0], p[2], p[1], mat, col)
    # roof slab and walls (thickness 0.4; the facade is glass between bronze mullions)
    slab(acc, x0 - 0.4, z0 - 0.4, x1 + 0.4, z1 + 0.4, H + 0.4, 0.4, MAT['paint'], P['charcoal'])
    acc.wall((x0 + 0.2, z0), (x0 + 0.2, z1), -0.3, H + 0.4, 0.4, MAT['fluted'], P['champagne'])                     # west
    acc.wall((x1 - 0.2, z1), (x1 - 0.2, z0), -0.3, H + 0.4, 0.4, MAT['paint'], mix(P['charcoal'], P['stone'], 0.25),     # east: restroom door
             openings=[(z1 - (-1.0) - 1.1, z1 - (-1.0) + 1.1, 2.6, 0.0)])
    # back wall (z0): the spine's exit door at G; the portal to the bridge at L1 (x 7.4 .. 13.0); the lift shaft opening at L1 is inside
    acc.wall((x1, z0 + 0.2), (x0, z0 + 0.2), -0.3, H + 0.4, 0.4, MAT['paint'], P['charcoal'],
             openings=[(x1 - 1.6, x1 + 1.6, 3.0, 0.0), (x1 - 13.0, x1 - 7.4, L1 + 3.4, L1)])
    # facade (z1): glass from 0.4 to H-0.6 between mullions every 2.2 m, a bronze plinth and head; the door opening in the middle (4 m)
    acc.wall((x0, z1 - 0.2), (x1, z1 - 0.2), -0.3, H + 0.4, 0.4, MAT['powder'], lin('#3b2f25'),
             openings=[(2.0 + i * 2.2, 2.0 + i * 2.2 + 2.0, H - 0.8, 0.35) for i in range(19) if abs(x0 + 2.0 + i * 2.2 + 1.0) > 3.0] + [(22 - 2.0, 22 + 2.0, 3.0, 0.0)])
    for i in range(19):
        gx0 = x0 + 2.0 + i * 2.2
        if abs(gx0 + 1.0) <= 3.0: continue
        acc.box(gx0, 0.35, z1 - 0.21, gx0 + 2.0, H - 0.8, z1 - 0.19, MAT['glass'], lin('#2a3a44'))
    acc.box(-2.0, 3.0, z1 - 0.21, 2.0, H - 0.8, z1 - 0.19, MAT['glass'], lin('#2a3a44'))
    # mezzanine (L1) over the back of the lobby, with the escalator void; round columns under its edge; glass balustrade
    V = MZ['void']
    LF = S['LIFT']
    for (a, b, c, d) in ((x0, z0, V['x0'], MZ['z1']), (V['x1'], z0, LF['x0'] - 0.15, MZ['z1']), (LF['x1'] + 0.15, z0, x1, MZ['z1']), (LF['x0'] - 0.15, LF['z1'], LF['x1'] + 0.15, MZ['z1']), (LF['x0'] - 0.15, z0, LF['x1'] + 0.15, LF['z0'] - 0.15), (V['x0'], z0, V['x1'], V['z0'])):
        slab(acc, a, b, c, d, L1, 0.32, MAT['paint'], mix(P['charcoal'], P['stone'], 0.4), top=MAT['carpet'], topcol=mix(P['velvet'], P['charcoal'], 0.5))
    for cx in (-18.0, -10.0, -2.0, 6.0, 18.0):
        acc.cyl(cx, MZ['z1'] - 0.5, 0.32, 0.0, L1 - 0.32, MAT['brass'], P['champagne'], n=24)
    # the rail runs round the void except where the escalators arrive (its back edge, over the steps: v9 route test found it closed)
    E = S['ESC']
    glass_rail(acc, glow, [(x0, MZ['z1']), (V['x0'], MZ['z1']), (V['x0'], V['z0']), (E['up']['x0'] - 0.02, V['z0'])], L1, led=B['gold'])
    glass_rail(acc, glow, [(E['down']['x1'] + 0.02, V['z0']), (V['x1'], V['z0']), (V['x1'], MZ['z1']), (x1, MZ['z1'])], L1, led=B['gold'])
    lights_grid(lit, acc, glow, x0 + 1.5, z0 + 1.2, x1 - 1.5, MZ['z1'] - 1.0, L1 - 0.32, 3.0, lin('#ffd8a8'), 1.6, 6)   # under the mezzanine
    # ceiling feature: three concentric light rings ("rounds") over the brand ring, recessed coves with warm light
    for R0, yy in ((9.0, H - 0.02), (6.5, H - 0.32), (4.0, H - 0.62)):
        pts = [(R0 * math.cos(2 * math.pi * i / 64), 4.0 + R0 * 0.75 * math.sin(2 * math.pi * i / 64)) for i in range(65)]
        acc.sweep(pts, [(-0.35, yy), (-0.35, yy - 0.28), (0.35, yy - 0.28), (0.35, yy)], MAT['paint'], mix(P['charcoal'], P['stone'], 0.15), closed=True)
        for i in range(64):
            (ax, az), (bx, bz) = pts[i], pts[i + 1]
            glow.quad((ax * 0.97, yy - 0.285, 4.0 + (az - 4.0) * 0.97), (bx * 0.97, yy - 0.285, 4.0 + (bz - 4.0) * 0.97), (bx * 0.94, yy - 0.285, 4.0 + (bz - 4.0) * 0.94), (ax * 0.94, yy - 0.285, 4.0 + (az - 4.0) * 0.94), lin('#ffd9a8'), 1.4)
        for i in range(0, 64, 8):
            lit.spot((pts[i][0] * 0.95, yy - 0.3, 4.0 + (pts[i][1] - 4.0) * 0.95), lin('#ffd9a8'), 6.0, 14, 'h', (0, -1, 0), 35, 75)
    lit.ambient(lin('#ffe6c8'), lin('#5a4030'), 0.05, 'h')
    # box office (west, front half): fluted champagne base, black marble top, glass screens, back wall with showtime screens (engine)
    bo = S['COUNTERS']['boxOffice']
    acc.box(bo['x1'] - 0.75, 0.0, bo['z0'], bo['x1'], 1.0, bo['z1'], MAT['fluted'], P['champagne'])
    acc.box(bo['x1'] - 0.85, 1.0, bo['z0'] - 0.05, bo['x1'] + 0.08, 1.06, bo['z1'] + 0.05, MAT['nero'], lin('#1a1a1c'))
    for zz in (bo['z0'] + 2.0, (bo['z0'] + bo['z1']) / 2, bo['z1'] - 2.0):
        acc.box(bo['x1'] - 0.8, 1.06, zz - 0.6, bo['x1'] - 0.78, 1.55, zz + 0.6, MAT['glass'], lin('#9fb3bf'))
        acc.box(bo['x1'] - 0.7, 1.06, zz - 0.18, bo['x1'] - 0.62, 1.4, zz + 0.18, MAT['tblack'], lin('#111'))   # POS screen block
        lit.spot((bo['x1'] - 0.4, 3.4, zz), lin('#ffd8a8'), 2.0, 5, 'h', (0, -1, 0), 20, 45)
        acc.cyl(bo['x1'] - 0.4, zz, 0.16, 2.6, 2.9, MAT['brass'], P['champagne'], n=16); acc.box(bo['x1'] - 0.41, 2.9, zz - 0.005, bo['x1'] - 0.39, 3.4, zz + 0.005, MAT['metal'], lin('#333'))
        glow.quad((bo['x1'] - 0.54, 2.599, zz - 0.14), (bo['x1'] - 0.26, 2.599, zz - 0.14), (bo['x1'] - 0.26, 2.599, zz + 0.14), (bo['x1'] - 0.54, 2.599, zz + 0.14), lin('#ffd8a8'), 1.6)
    # concessions (west, back half): burgundy lacquer base, calacatta top, back counter for the machines (props), menu boards (engine)
    co = S['COUNTERS']['concessions']
    acc.box(co['x1'] - 0.8, 0.0, co['z0'], co['x1'], 0.95, co['z1'], MAT['lacquer'], P['velvet'])
    acc.box(co['x1'] - 0.9, 0.95, co['z0'] - 0.05, co['x1'] + 0.06, 1.0, co['z1'] + 0.05, MAT['calacatta'], lin('#e8e2da'))
    acc.box(co['x1'] - 0.84, 0.08, co['z0'], co['x1'] - 0.8, 0.12, co['z1'], MAT['brass'], P['champagne'])
    acc.box(x0, 0.0, co['z0'], x0 + 0.75, 0.92, co['z1'], MAT['lacquer'], mix(P['velvet'], P['charcoal'], 0.4))   # back counter
    acc.box(x0, 0.92, co['z0'], x0 + 0.8, 0.96, co['z1'], MAT['calacatta'], lin('#e8e2da'))
    for zz in [co['z0'] + 1.2 + 2.0 * i for i in range(5)]:
        lit.spot((co['x1'] - 0.5, 3.6, zz), lin('#ffe2bc'), 2.2, 5, 'h', (0, -1, 0), 25, 55)
    lit.area((x0 + 0.05, 3.2, (co['z0'] + co['z1']) / 2), (0, 0, (co['z1'] - co['z0']) / 2 - 0.4), (0, 0.6, 0), (1, 0, 0), lin('#fff1dc'), 3.0, 8, 'f', 4, 1)   # menu boards
    # lounge: a round rug and a curved low bench ring (the sofas are props)
    for i in range(48):
        a0, a1 = 2 * math.pi * i / 48, 2 * math.pi * (i + 1) / 48; cx, cz, r0 = -1.0, 1.0, 5.2
        acc.quad((cx, 0.006, cz), (cx + r0 * math.cos(a1), 0.006, cz + r0 * math.sin(a1)), (cx + r0 * math.cos(a0), 0.006, cz + r0 * math.sin(a0)), (cx, 0.006, cz), MAT['carpet'], mix(P['velvet'], P['stone'], 0.15))
    # the back wall over the spine door: a big LED wall (the engine plays the brand film on it) framed in champagne
    acc.box(-8.0, 3.6, z0 + 0.0, 8.0, 3.7, z0 + 0.15, MAT['brass'], P['champagne']); acc.box(-8.0, 8.3, z0, 8.0, 8.4, z0 + 0.15, MAT['brass'], P['champagne'])
    lit.area((0, 6.0, z0 + 0.3), (7.8, 0, 0), (0, 2.2, 0), (0, 0, 1), lin('#c0c8ff'), 6.0, 14, 'f', 4, 2)
    # escalators and the lift shaft
    E = S['ESC']; escalator(acc, glow, lit, E['up']); escalator(acc, glow, lit, E['down'])
    LF = S['LIFT']
    for (a, b, c, d) in ((LF['x0'] - 0.15, LF['z0'] - 0.15, LF['x0'], LF['z1']), (LF['x1'], LF['z0'] - 0.15, LF['x1'] + 0.15, LF['z1']), (LF['x0'] - 0.15, LF['z0'] - 0.15, LF['x1'] + 0.15, LF['z0'])):
        acc.box(a, 0.0, b, c, H, d, MAT['powder'], lin('#3b2f25'))
    for ly in (0.0, L1):   # front of the shaft: bronze with a door opening at each floor (the doors are the engine's)
        acc.box(LF['x0'] - 0.15, ly + 2.3, LF['z1'] - 0.15, LF['x1'] + 0.15, ly + (L1 - 0.32 if ly == 0 else 3.6), LF['z1'], MAT['powder'], lin('#3b2f25'))
        acc.box(LF['x0'] - 0.15, ly, LF['z1'] - 0.15, LF['x0'] + 0.5, ly + 2.3, LF['z1'], MAT['powder'], lin('#3b2f25'))
        acc.box(LF['x1'] - 0.5, ly, LF['z1'] - 0.15, LF['x1'] + 0.15, ly + 2.3, LF['z1'], MAT['powder'], lin('#3b2f25'))
        glow.quad((LF['x1'] - 0.42, ly + 1.15, LF['z1'] + 0.002), (LF['x1'] - 0.32, ly + 1.15, LF['z1'] + 0.002), (LF['x1'] - 0.32, ly + 1.3, LF['z1'] + 0.002), (LF['x1'] - 0.42, ly + 1.3, LF['z1'] + 0.002), B['gold'], 1.5)
    acc.box(LF['x0'] - 0.15, L1 + 3.6, LF['z1'] - 0.15, LF['x1'] + 0.15, H, LF['z1'], MAT['powder'], lin('#3b2f25'))
    # ticket gate: glass barrier around the up escalator's entrance, the usher's podium (the gate leaf is the engine's)
    G = S['GATE']
    glass_rail(acc, glow, [(G['x0'], G['z']), (G['gate'][0], G['z'])], 0.0, h=1.0)
    glass_rail(acc, glow, [(G['gate'][1], G['z']), (G['x1'], G['z']), (G['x1'], G['sides'][1][1])], 0.0, h=1.0)
    acc.box(G['podium']['x'] - 0.35, 0.0, G['podium']['z'] - 0.3, G['podium']['x'] + 0.35, 1.12, G['podium']['z'] + 0.3, MAT['fluted'], P['champagne'])
    acc.box(G['podium']['x'] - 0.4, 1.12, G['podium']['z'] - 0.35, G['podium']['x'] + 0.4, 1.16, G['podium']['z'] + 0.35, MAT['nero'], lin('#151517'))
    lit.spot((G['podium']['x'], 3.6, G['podium']['z']), lin('#ffd8a8'), 1.8, 5, 'h', (0, -1, 0), 20, 45)
    # wall washers on the fluted west wall, pendant lights over the lounge
    for zz in range(-12, 18, 3):
        lit.spot((x0 + 0.6, H - 0.4, zz), lin('#ffd2a0'), 2.4, 10, 'h', (-0.35, -1, 0), 15, 40)
    extra = {'panels': [{'id': 'ledwall', 'x': 0, 'y': 6.0, 'z': z0 + 0.16, 'yaw': 0, 'w': 15.8, 'h': 4.5, 'emit': 1},
                        {'id': 'showtimes', 'x': x0 + 0.21, 'y': 2.6, 'z': 9.0, 'yaw': math.pi / 2, 'w': 8.0, 'h': 1.2, 'emit': 1},
                        {'id': 'menu', 'x': x0 + 0.21, 'y': 3.2, 'z': (co['z0'] + co['z1']) / 2, 'yaw': math.pi / 2, 'w': co['z1'] - co['z0'] - 0.6, 'h': 1.3, 'emit': 1}]}
    return acc, glow, lit, extra

# ------------------------------------------------------------------------------------------------ corridor (L1): the long, dim way in
def build_corridor(S):
    L1 = S['L1']; BR, FW, LW, FE, LE, PT = S['BRIDGE'], S['FLANK_W'], S['LINK_W'], S['FLANK_E'], S['LINK_E'], S['PANTRY']
    C = {k: lin(v) for k, v in S['PALETTE']['corridor'].items()}; H = 4.2; top = L1 + H
    acc, glow = Acc(), Glow(); lit = Lights([BR['x0'], LW['z0'], BR['x1'], BR['z1']], top); rnd = random.Random(5)
    floors = [(BR['x0'], BR['z0'], BR['x1'], BR['z1']), (FW['x0'], FW['z0'], FW['x1'], FW['z1']), (LW['x0'], LW['z0'], LW['x1'], LW['z1']),
              (FE['x0'], FE['z0'], FE['x1'], FE['z1']), (LE['x0'], LE['z0'], LE['x1'], LE['z1']), (PT['x0'], PT['z0'], PT['x1'], PT['z1'])]
    for (a, b, c, d) in floors:
        slab(acc, a, b, c, d, L1, 0.16, MAT['paint'], C['black'], top=MAT['dolby'], topcol=mix(C['indigo'], (1, 1, 1), 0.12))
        slab(acc, a, b, c, d, top + 0.3, 0.3, MAT['paint'], C['black'])
    # walls: (a, b, face) with face = which side the corridor is on (left normal of a->b if +1); diamonds on the long walls
    W_ = []
    def wall(a, b, face, openings=(), diamonds=True, t=0.3):
        """a wall on the corridor's side of the line a->b (face +1: the corridor is to the left of a->b); its inner face is t inside"""
        acc.wall(a, b, L1 - 0.16, top + 0.3, t, MAT['paint'], C['black'], openings=openings, side=face)
        L = math.hypot(b[0] - a[0], b[1] - a[1]); nx, nz = -(b[1] - a[1]) / L * face, (b[0] - a[0]) / L * face
        W_.append(((a[0] + nx * t, a[1] + nz * t), (b[0] + nx * t, b[1] + nz * t), face, diamonds, openings))
    halls = {h['id']: h for h in S['halls']}
    doors = {d['hall']: d for d in S['DOORS'] if d.get('hall') and d['id'].endswith('In')}
    def dop(a, b, hid):   # the hall door as an opening along a->b
        d = doors[hid]; s0 = math.hypot(d['x'] - a[0], d['z'] - a[1]); return [(s0 - 1.0, s0 + 1.0, L1 + 2.55, L1)]
    # bridge: north side (corridor to +z), the pantry niche, south side with the portal to the mezzanine (corridor to -z)
    wall((FW['x1'], BR['z0']), (PT['x0'], BR['z0']), 1); wall((PT['x1'], BR['z0']), (FE['x0'], BR['z0']), 1)
    wall((BR['x1'], BR['z1']), (BR['x0'], BR['z1']), 1, openings=[(BR['x1'] - 10.2 - 2.8, BR['x1'] - 10.2 + 2.8, L1 + 3.4, L1)])
    wall((PT['x0'], BR['z0']), (PT['x0'], PT['z0']), 1, diamonds=False); wall((PT['x0'], PT['z0']), (PT['x1'], PT['z0']), 1, diamonds=False); wall((PT['x1'], PT['z0']), (PT['x1'], BR['z0']), 1, diamonds=False)
    # west: outer wall, MAX rear wall lining (with the MAX door), the wall between the halls, CURVE rear lining (with its door)
    wall((BR['x0'], BR['z1']), (BR['x0'], LW['z0']), -1)
    wall((BR['x0'], LW['z0']), (LW['x1'], LW['z0']), -1)
    wall((FW['x1'], BR['z0']), (FW['x1'], FW['z0']), -1, openings=dop((FW['x1'], BR['z0']), (FW['x1'], FW['z0']), 'MAX'))
    wall((FW['x1'], LW['z1']), (LW['x1'], LW['z1']), -1)
    wall((LW['x1'], LW['z1']), (LW['x1'], LW['z0']), -1, openings=dop((LW['x1'], LW['z1']), (LW['x1'], LW['z0']), 'CURVE'))
    # east: outer wall, CLASSIC rear lining (door), the stub to the 270 door
    wall((BR['x1'], BR['z1']), (BR['x1'], FE['z0']), 1)
    wall((BR['x1'], FE['z0']), (FE['x0'], FE['z0']), 1)
    wall((FE['x0'], FE['z0']), (FE['x0'], LE['z0']), 1, diamonds=False)
    wall((FE['x0'], LE['z1']), (FE['x0'], BR['z0']), 1, openings=dop((FE['x0'], LE['z1']), (FE['x0'], BR['z0']), 'CLASSIC'))
    wall((FE['x0'], LE['z0']), (LE['x0'], LE['z0']), 1, diamonds=False); wall((LE['x0'], LE['z1']), (FE['x0'], LE['z1']), 1, diamonds=False)
    wall((LE['x0'], LE['z0']), (LE['x0'], LE['z1']), 1, diamonds=False, openings=dop((LE['x0'], LE['z0']), (LE['x0'], LE['z1']), 'X270'))
    # diamond relief on every long wall (indigo lacquer), a gold light line at 0.3 m (floor wash) and at 2.6 m
    for a, b, face, dia, ops in W_:
        L = math.hypot(b[0] - a[0], b[1] - a[1])
        if L < 2.5: continue
        ux, uz = (b[0] - a[0]) / L, (b[1] - a[1]) / L; nx, nz = -uz * face, ux * face
        sa, sb = a, b
        if dia:   # diamond relief between the openings
            cuts = sorted([(o[0] - 0.3, o[1] + 0.3) for o in ops]); cur = 0.0
            for c0, c1 in cuts + [(L, L)]:
                if c0 - cur > 1.9: diamond_wall(acc, (a[0] + ux * cur, a[1] + uz * cur), (a[0] + ux * c0, a[1] + uz * c0), L1 + 0.6, top - 0.9, face, 0.9, 0.06, MAT['lacquer'], C['indigo'], C['smoke'], rnd)
                cur = max(cur, c1)
        for yy, k in ((L1 + 0.32, 1.4), (top - 0.75, 1.0)):
            p0, p1 = (sa[0] + nx * 0.012, sa[1] + nz * 0.012), (sb[0] + nx * 0.012, sb[1] + nz * 0.012)
            q = [(p0[0], yy, p0[1]), (p1[0], yy, p1[1]), (p1[0], yy + 0.025, p1[1]), (p0[0], yy + 0.025, p0[1])]
            glow.quad(*(q if face < 0 else q[::-1]), C['gold'], k * 1.3)
        lit.line((sa[0] + nx * 0.2, L1 + 0.4, sa[1] + nz * 0.2), (sb[0] + nx * 0.2, L1 + 0.4, sb[1] + nz * 0.2), C['gold'], 0.18, 3.0, 'f', (nx * 0.5, -0.2, nz * 0.5))
    # ceiling: a recessed central channel with indirect light along every corridor leg; round light "portals" every 6 m
    legs = [((BR['x0'] + 3, (BR['z0'] + BR['z1']) / 2), (BR['x1'] - 3, (BR['z0'] + BR['z1']) / 2)), (((FW['x0'] + FW['x1']) / 2, BR['z0']), ((FW['x0'] + FW['x1']) / 2, LW['z1'])),
            (((FE['x0'] + FE['x1']) / 2, BR['z0']), ((FE['x0'] + FE['x1']) / 2, FE['z0'] + 1.0)), ((BR['x0'] + 3, (LW['z0'] + LW['z1']) / 2), (LW['x1'] - 1.0, (LW['z0'] + LW['z1']) / 2))]
    for a, b in legs:
        L = math.hypot(b[0] - a[0], b[1] - a[1]); ux, uz = (b[0] - a[0]) / L, (b[1] - a[1]) / L; nx, nz = -uz, ux
        for side in (-1, 1):
            p0 = (a[0] + nx * 0.9 * side, a[1] + nz * 0.9 * side); p1 = (b[0] + nx * 0.9 * side, b[1] + nz * 0.9 * side)
            acc.sweep([p0, p1], [(-0.12, top - 0.02), (-0.12, top - 0.35), (0.12, top - 0.35), (0.12, top - 0.02)], MAT['paint'], C['black'], closed=True)
            glow.quad((p1[0], top - 0.352, p1[1]), (p0[0], top - 0.352, p0[1]), (p0[0] - nx * side * 0.08, top - 0.352, p0[1] - nz * side * 0.08), (p1[0] - nx * side * 0.08, top - 0.352, p1[1] - nz * side * 0.08), C['gold'], 0.9) if side > 0 else \
                glow.quad((p0[0], top - 0.352, p0[1]), (p1[0], top - 0.352, p1[1]), (p1[0] - nx * side * 0.08, top - 0.352, p1[1] - nz * side * 0.08), (p0[0] - nx * side * 0.08, top - 0.352, p0[1] - nz * side * 0.08), C['gold'], 0.9)
        lit.line((a[0], top - 0.4, a[1]), (b[0], top - 0.4, b[1]), lin('#e9c78a'), 0.22, 5.0, 'h', (0, -1, 0))
        n = int(L / 6.0)
        for i in range(1, n + 1):   # arch portals: a rounded frame of light spanning the corridor
            t = i * L / (n + 1); cx, cz = a[0] + ux * t, a[1] + uz * t
            arc = [(math.cos(math.pi * j / 16), math.sin(math.pi * j / 16)) for j in range(17)]
            w2, hh = 2.6, 1.0
            pts = [(cx + nx * w2 * c, top - 1.25 + hh * s_, cz + nz * w2 * c) for c, s_ in arc]
            for j in range(len(pts) - 1):
                (ax_, ay_, az_), (bx_, by_, bz_) = pts[j], pts[j + 1]
                glow.quad((ax_ + ux * 0.02, ay_, az_ + uz * 0.02), (bx_ + ux * 0.02, by_, bz_ + uz * 0.02), (bx_ + ux * 0.02, by_ + 0.04, bz_ + uz * 0.02), (ax_ + ux * 0.02, ay_ + 0.04, az_ + uz * 0.02), C['gold'], 1.2)
                glow.quad((bx_ - ux * 0.02, by_, bz_ - uz * 0.02), (ax_ - ux * 0.02, ay_, az_ - uz * 0.02), (ax_ - ux * 0.02, ay_ + 0.04, az_ - uz * 0.02), (bx_ - ux * 0.02, by_ + 0.04, bz_ - uz * 0.02), C['gold'], 1.2)
            lit.point((cx, top - 0.5, cz), lin('#e9c78a'), 0.6, 4.5, 'h')
    lit.ambient(lin('#4a4f80'), lin('#14162a'), 0.012, 'h')
    # hall portals: a lit frame around each entry door (the hall's own accent colour), name sign (engine panel) above
    acc_cols = {'MAX': '#2f7cff', 'CURVE': '#c9a86a', 'CLASSIC': '#b08d57', 'X270': '#1f8a8a'}
    panels = []
    for hid, d in doors.items():
        h = halls[hid]; col = lin(acc_cols[hid]); side = -h['dir']   # the corridor is on the -dir side of the rear wall
        xf = d['x'] + side * 0.5
        for (za, zb, ya, yb) in ((d['z'] - 1.2, d['z'] - 1.1, L1, L1 + 2.75), (d['z'] + 1.1, d['z'] + 1.2, L1, L1 + 2.75), (d['z'] - 1.2, d['z'] + 1.2, L1 + 2.65, L1 + 2.75)):
            acc.box(min(xf, xf + side * 0.08), ya, za, max(xf, xf + side * 0.08), yb, zb, MAT['brass'], C['gold'])
        xg = xf + side * 0.085
        q = [(xg, L1 + 2.8, d['z'] - 1.2), (xg, L1 + 2.8, d['z'] + 1.2), (xg, L1 + 2.84, d['z'] + 1.2), (xg, L1 + 2.84, d['z'] - 1.2)]
        glow.quad(*(q if side > 0 else q[::-1]), col, 2.0)
        lit.spot((xf + side * 0.6, top - 0.2, d['z']), col, 1.6, 5, 'h', (side * 0.2, -1, 0), 25, 55)
        panels.append({'id': 'sign_' + hid, 'x': xf + side * 0.09, 'y': L1 + 3.35, 'z': d['z'], 'yaw': (-math.pi / 2 if side < 0 else math.pi / 2), 'w': 2.4, 'h': 0.7, 'emit': 1})
    # the arrival video wall facing the mezzanine portal (engine plays the brand loop)
    acc.box(7.0, L1 + 0.5, BR['z0'] + 0.15, 13.4, L1 + 3.8, BR['z0'] + 0.25, MAT['brass'], C['gold'])
    panels.append({'id': 'arrival', 'x': 10.2, 'y': L1 + 2.15, 'z': BR['z0'] + 0.26, 'yaw': 0, 'w': 6.2, 'h': 3.1, 'emit': 1})
    lit.area((10.2, L1 + 2.15, BR['z0'] + 0.4), (3.0, 0, 0), (0, 1.5, 0), (0, 0, 1), lin('#b8c0ff'), 3.5, 9, 'f', 3, 2)
    # pantry: a service counter for the server's cart
    acc.box(PT['x0'] + 0.3, L1, PT['z0'] + 0.2, PT['x1'] - 0.3, L1 + 0.95, PT['z0'] + 0.8, MAT['lacquer'], C['smoke'])
    acc.box(PT['x0'] + 0.25, L1 + 0.95, PT['z0'] + 0.15, PT['x1'] - 0.25, L1 + 1.0, PT['z0'] + 0.85, MAT['calacatta'], lin('#ddd6cc'))
    lit.spot((0, top - 0.3, PT['z0'] + 1.5), lin('#ffe0b8'), 2.0, 5, 'h')
    return acc, glow, lit, {'panels': panels}

# ------------------------------------------------------------------------------------------------ spine (G): the bright way out
def build_spine(S):
    SP, TR = S['SPINE'], S['TRAVELATOR']; x0, x1, z0, z1, H = SP['x0'], SP['x1'], SP['z0'], SP['z1'], SP['ceil']
    C = {k: lin(v) for k, v in S['PALETTE']['spine'].items()}
    acc, glow = Acc(), Glow(); lit = Lights([x0, z0, x1, z1], H)
    slab(acc, x0, z0 - 0.4, x1, z1, 0.0, 0.3, MAT['stone'], C['white'])
    # ceiling: low (H) under the bridge and the pantry, high (H2) south of zHi where the raised halls' exits open; a soffit closes the step
    zH, H2 = SP['zHi'], SP['ceilHi']; hz = lambda z: H2 if z < zH else H
    slab(acc, x0, zH, x1, z1, H + 0.15, 0.15, MAT['paint'], C['white']); slab(acc, x0, z0 - 0.4, x1, zH, H2 + 0.15, 0.15, MAT['paint'], C['white'])
    acc.box(x0, H, zH - 0.15, x1, H2 + 0.15, zH, MAT['paint'], C['white'])
    acc.wall((x1, z0 - 0.2), (x0, z0 - 0.2), -0.3, H2 + 0.15, 0.4, MAT['slats'], C['oak'])   # far end
    acc.wall((x0, z1 - 0.03), (x1, z1 - 0.03), 0.0, H, 0.06, MAT['slats'], C['oak'], openings=[(x1 - 1.6, x1 + 1.6, 3.0, 0.0)])   # lobby end, around the exit door
    # side walls are the halls' screen walls (built by the halls); here: oak slat lining on them, between the exit doors
    exits = [d for d in S['DOORS'] if d.get('hall') and 'Out' in d['id']]
    for sx in (x0, x1):
        inner = sx + (0.03 if sx == x0 else -0.03); ds = sorted([d for d in exits if (d['x'] < 0) == (sx < 0)], key=lambda d: d['z'])
        cuts = [(d['z'] - d['w'] / 2 - 0.15, d['z'] + d['w'] / 2 + 0.15, d['y'] + d['h'] + 0.15) for d in ds]
        zc = z0
        def lining(za, zb, ya):   # split at the ceiling step so no lining rises into the bridge above
            for (p, q) in ((za, min(zb, zH)), (max(za, zH), zb)):
                if q - p > 0.01 and hz((p + q) / 2) - ya > 0.01: acc.box(min(sx, inner), ya, p, max(sx, inner), hz((p + q) / 2), q, MAT['slats'], C['oak'])
        for c0, c1, ch in cuts + [(z1, z1, 0)]:
            if c0 > zc + 0.1: lining(zc, c0, 0.0)
            if c1 > c0: lining(c0, c1, ch)
            zc = max(zc, c1)
        for d in ds:   # exit door frame and an EXIT sign over it (green, fixed light)
            fx = sx + (0.035 if sx == x0 else -0.035)
            for (za, zb, ya, yb) in ((d['z'] - d['w'] / 2 - 0.12, d['z'] - d['w'] / 2, d['y'], d['y'] + d['h'] + 0.12), (d['z'] + d['w'] / 2, d['z'] + d['w'] / 2 + 0.12, d['y'], d['y'] + d['h'] + 0.12),
                                    (d['z'] - d['w'] / 2, d['z'] + d['w'] / 2, d['y'] + d['h'], d['y'] + d['h'] + 0.12)):
                acc.box(min(sx, fx), ya, za, max(sx, fx), yb, zb, MAT['metal'], C['concrete'])
            gx = fx + (0.002 if sx == x0 else -0.002); q = [(gx, d['y'] + d['h'] + 0.2, d['z'] - 0.45), (gx, d['y'] + d['h'] + 0.2, d['z'] + 0.45), (gx, d['y'] + d['h'] + 0.48, d['z'] + 0.45), (gx, d['y'] + d['h'] + 0.48, d['z'] - 0.45)]
            glow.quad(*(q if sx == x0 else q[::-1]), C['green'], 2.0)
    # exit stairs: a landing at the door's height, steps down along the wall towards the hall's centre line, glass rail on the open side
    for st in S['EXIT_STAIRS']:
        xa, xb = min(st['x0'], st['x1']), max(st['x0'], st['x1']); zl0, zl1 = sorted((st['zDoor'] - st['dir'] * 0.85, st['zTop']))
        acc.box(xa, 0.0, min(zl0, zl1, st['zDoor'] - 0.95), xb, st['y0'], max(zl0, zl1, st['zDoor'] + 0.95) if st['dir'] < 0 else max(zl0, zl1), MAT['stone'], C['white'])
        stair(acc, glow, xa, xb, st['zTop'], st['dir'], st['y0'], 0.0, st['n'], MAT['stone'], C['white'], nose=lin('#fff0d8'), k_nose=0.9)
        xo = xb if st['x0'] < st['x1'] else xa
        path = [(xo, st['zDoor'] - st['dir'] * 0.95), (xo, st['zTop'])]
        glass_rail(acc, glow, path, st['y0'], mat_post=MAT['metal'], col_post=C['concrete'])
        steps = [(xo, st['zTop'] + st['dir'] * 0.3 * i) for i in range(st['n'] + 1)]
        acc.tube([(xo, st['y0'] - st['rise'] * i + 1.0, z) for i, (xx, z) in enumerate(steps)], 0.025, MAT['metal'], C['concrete'], n=8)
    # travelator: a low metal body with balustrades (the moving belt is the engine's)
    acc.box(TR['x0'] - 0.25, 0.0, TR['z0'] - 1.0, TR['x1'] + 0.25, 0.12, TR['z1'] + 1.0, MAT['metal'], lin('#8d9097'))
    for xs in (TR['x0'] - 0.2, TR['x1'] + 0.2):
        acc.box(xs - 0.04, 0.12, TR['z0'] - 0.8, xs + 0.04, 0.95, TR['z1'] + 0.8, MAT['glass'], lin('#c7d3da'))
        acc.tube([(xs, 1.0, TR['z0'] - 0.8), (xs, 1.0, TR['z1'] + 0.8)], 0.04, MAT['rubber'], lin('#151515'), n=8)
        lit.line((xs, 0.2, TR['z0']), (xs, 0.2, TR['z1']), lin('#e8fff2'), 0.05, 2.0, 'f')
    # ceiling: three continuous light lines along the spine (bright and simple: the way out feels quick)
    for xx in (-2.6, 0.0, 2.6):
        for (za, zb, hh) in ((z0 + 0.5, zH - 0.3, H2), (zH + 0.3, z1 - 0.5, H)):
            glow.quad((xx - 0.06, hh - 0.005, za), (xx + 0.06, hh - 0.005, za), (xx + 0.06, hh - 0.005, zb), (xx - 0.06, hh - 0.005, zb), lin('#fff4e6'), 2.4)
            lit.line((xx, hh - 0.05, za), (xx, hh - 0.05, zb), lin('#fff4e6'), 1.1 if hh == H else 1.5, 8.0, 'h', (0, -1, 0))
    lit.ambient(lin('#fff6ea'), lin('#bfb2a0'), 0.25, 'h')
    # green EXIT -> arrows on the floor towards the lobby (inlaid strips)
    for zz in range(int(z0) + 6, int(z1) - 2, 6):
        for sx in (-1, 1):
            glow.quad((sx * 1.6 - 0.15, 0.003, zz), (sx * 1.6 + 0.15, 0.003, zz), (sx * 1.6 + 0.0, 0.003, zz + 0.35), (sx * 1.6 - 0.0, 0.003, zz + 0.35), C['green'], 0.7)
    return acc, glow, lit, {'panels': [{'id': 'exitwall', 'x': 0, 'y': 2.3, 'z': z0 + 0.01, 'yaw': 0, 'w': 6.0, 'h': 2.6, 'emit': 1}]}

# ------------------------------------------------------------------------------------------------ restrooms (men south, women north: the same fixtures and mirrors)
def build_wc(S):
    W = S['WC']; x0, x1, z0, z1, H = W['x0'], W['x1'], W['z0'], W['z1'], W['ceil']
    acc, glow = Acc(), Glow(); lit = Lights([x0, z0, x1, z1], H)
    tile, floor_c, stone, part = lin('#e9e5df'), lin('#cfc8be'), lin('#e8e2da'), lin('#3a3530')
    slab(acc, x0, z0, x1, z1, 0.0, 0.3, MAT['porcelain'], floor_c); slab(acc, x0, z0, x1, z1, H + 0.2, 0.2, MAT['paint'], lin('#f2efe9'))
    acc.wall((x0 + 0.1, z0), (x0 + 0.1, z1), -0.3, H + 0.2, 0.2, MAT['walltile'], tile, openings=[(-1.0 - z0 - 1.1, -1.0 - z0 + 1.1, 2.6, 0.0)])
    acc.wall((x1 - 0.1, z1), (x1 - 0.1, z0), -0.3, H + 0.2, 0.2, MAT['walltile'], tile)
    acc.wall((x1, z0 + 0.1), (x0, z0 + 0.1), -0.3, H + 0.2, 0.2, MAT['walltile'], tile)
    acc.wall((x0, z1 - 0.1), (x1, z1 - 0.1), -0.3, H + 0.2, 0.2, MAT['walltile'], tile)
    # vestibule (x0..x0+2.6) splits to the two rooms through privacy openings; partition wall at z = -4 between the rooms
    zm = -4.0; vx = x0 + 2.6
    acc.wall((vx, z0 + 0.2), (vx, z1 - 0.2), 0.0, H, 0.15, MAT['walltile'], tile, openings=[(zm - 2.6 - z0 - 0.2, zm - 1.2 - z0 - 0.2, 2.5, 0.0), (zm + 1.2 - z0 - 0.2, zm + 2.6 - z0 - 0.2, 2.5, 0.0)])
    acc.wall((vx, zm), (x1 - 0.2, zm), 0.0, H, 0.2, MAT['walltile'], tile)
    rooms = (('M', z0 + 0.2, zm), ('F', zm, z1 - 0.2))
    fx = []
    for tag, za, zb in rooms:
        # basins along the vestibule-side wall: calacatta counter, mirror (glass on a chrome frame) above it, lit from a cove
        cx0 = vx + 0.08; mid = (za + zb) / 2
        acc.box(cx0, 0.82, mid - 1.6, cx0 + 0.56, 0.88, mid + 1.6, MAT['calacatta'], stone)
        acc.box(cx0 + 0.05, 0.0, mid - 1.55, cx0 + 0.5, 0.82, mid + 1.55, MAT['lacquer'], lin('#3b2f25'))
        acc.box(cx0, 1.05, mid - 1.55, cx0 + 0.015, 2.2, mid + 1.55, MAT['chrome'], lin('#c8c8cc'))     # mirror (same in both rooms)
        acc.box(cx0, 2.2, mid - 1.6, cx0 + 0.12, 2.3, mid + 1.6, MAT['paint'], lin('#f2efe9'))
        glow.quad((cx0 + 0.121, 2.25, mid + 1.5), (cx0 + 0.121, 2.25, mid - 1.5), (cx0 + 0.121, 2.27, mid - 1.5), (cx0 + 0.121, 2.27, mid + 1.5), lin('#fff1dc'), 1.6)
        lit.line((cx0 + 0.3, 2.25, mid - 1.5), (cx0 + 0.3, 2.25, mid + 1.5), lin('#fff1dc'), 0.9, 4.0, 'h', (1, -0.6, 0))
        for k in (-1, 0, 1): fx.append({'kind': 'basin', 'room': tag, 'x': cx0 + 0.3, 'y': 0.88, 'z': mid + k * 1.0})
        fx.append({'kind': 'dryer', 'room': tag, 'x': cx0 + 0.06, 'y': 1.2, 'z': (mid + 1.95) if tag == 'M' else (mid - 1.95)})
        # cubicles along the far wall: partitions with real thickness (doors are the engine's)
        n = 3; cw = 1.0; c0 = mid - n * cw / 2
        for i in range(n + 1):
            zz = c0 + i * cw; acc.box(x1 - 1.6, 0.15, zz - 0.02, x1 - 0.2, 2.1, zz + 0.02, MAT['powder'], part)
        acc.box(x1 - 1.6, 0.15, c0, x1 - 1.56, 0.25, c0 + n * cw, MAT['powder'], part)
        for i in range(n): fx.append({'kind': 'stall', 'room': tag, 'x': x1 - 0.7, 'y': 0.0, 'z': c0 + (i + 0.5) * cw, 'door': [x1 - 1.6, c0 + i * cw + 0.05, c0 + (i + 1) * cw - 0.05]})
        if tag == 'M':
            for i in range(3):
                uz = za + 0.9 + i * 0.75; fx.append({'kind': 'urinal', 'room': tag, 'x': x0 + 4.4 + i * 0.75, 'y': 0.0, 'z': za + 0.25, 'zz': uz})
            for i in range(4): acc.box(x0 + 4.0 + i * 0.75, 0.6, za + 0.02, x0 + 4.03 + i * 0.75, 1.5, za + 0.5, MAT['powder'], part)
        lights_grid(lit, acc, glow, vx + 1.2, za + 1.0, x1 - 1.2, zb - 1.0, H, 2.4, lin('#fff4e6'), 1.4, 5)
    lights_grid(lit, acc, glow, x0 + 1.2, z0 + 3.0, x0 + 1.2, z1 - 3.0, H, 3.0, lin('#fff4e6'), 1.2, 5)
    lit.ambient(lin('#fff6ea'), lin('#d8d0c4'), 0.12, 'h')
    return acc, glow, lit, {'fixtures': fx}

# ------------------------------------------------------------------------------------------------ street: plaza, canopy, coloured facade, road, the opposite block
def build_street(S):
    ST, F = S['STREET'], S['FACADE']; x0, x1 = ST['x0'], ST['x1']
    FC = {k: lin(v) for k, v in S['PALETTE']['facade'].items()}; B = {k: lin(v) for k, v in S['PALETTE']['brand'].items()}
    acc, glow = Acc(), Glow(); lit = Lights([x0, F, x1, ST['z1']], 30.0); rnd = random.Random(9)
    k, r0, r1, far = ST['kerb'], ST['road'][0], ST['road'][1], ST['far']
    slab(acc, x0, F, x1, k, 0.0, 0.3, MAT['plaza'], lin('#b8b0a4'))
    acc.box(x0, -0.15, k, x1, 0.0, r0, MAT['asphalt'], lin('#4a4a4e'))   # drop-off bay, 15 cm below the kerb
    acc.box(x0, -0.3, k - 0.18, x1, 0.0, k, MAT['granite'], lin('#9a958e'))   # kerb stone
    acc.box(x0, -0.15 - 0.3, r0, x1, -0.15, r1, MAT['asphalt'], lin('#3a3a3e'), top=MAT['asphalt'], topcol=lin('#3c3c40'))
    acc.box(x0, -0.3, r1, x1, 0.0, far, MAT['paving'], lin('#a49d93'))
    for i in range(int((x1 - x0) / 4)):   # lane dashes and the bay's yellow edge
        xx = x0 + 2 + i * 4.0; glow.quad((xx, -0.148, (r0 + r1) / 2 - 0.06), (xx + 2.2, -0.148, (r0 + r1) / 2 - 0.06), (xx + 2.2, -0.148, (r0 + r1) / 2 + 0.06), (xx, -0.148, (r0 + r1) / 2 + 0.06), lin('#d8d4c8'), 0.25)
    # the cinema's facade: sandstone cladding with dark bronze bands and gold fins (no white panels, photo 10)
    fz = F + 0.4
    for (a, b) in ((-47.6, -22.4), (22.4, 37.0)):
        acc.box(a, -0.3, F, b, 13.5, F + 0.4, MAT['stone'], FC['sandstone'])
        for yy in (4.2, 8.4, 12.6):
            acc.box(a, yy, F + 0.4, b, yy + 0.35, F + 0.55, MAT['powder'], FC['bronze'])
        for xx in [a + 1.0 + 2.0 * i for i in range(int((b - a) / 2.0))]:
            acc.box(xx, 0.0, F + 0.4, xx + 0.12, 13.5, F + 0.62, MAT['brass'], FC['gold'])
    acc.box(-22.4, 9.6, F, 22.4, 13.5, F + 0.4, MAT['stone'], FC['sandstone'])
    acc.box(-22.4, 13.5, F, 22.4, 13.9, F + 0.6, MAT['powder'], FC['bronze'])
    # canopy over the entrance with downlights and a gold fascia; the LUMIERE name in glowing letters on the fascia (engine panel)
    acc.box(-9.0, 5.2, F, 9.0, 5.6, F + 7.0, MAT['powder'], FC['bronze'], top=MAT['powder'], topcol=FC['bronze'])
    acc.box(-9.0, 5.6, F + 6.9, 9.0, 6.6, F + 7.1, MAT['brass'], FC['gold'])
    for xx in (-7.5, -4.5, -1.5, 1.5, 4.5, 7.5):
        for zz in (F + 2.0, F + 5.0):
            lit.spot((xx, 5.15, zz), lin('#ffd8a8'), 4.0, 9, 'h', (0, -1, 0), 25, 60)
            glow.quad((xx - 0.07, 5.199, zz - 0.07), (xx + 0.07, 5.199, zz - 0.07), (xx + 0.07, 5.199, zz + 0.07), (xx - 0.07, 5.199, zz + 0.07), lin('#ffd8a8'), 2.4)
    for xx in (-8.6, 8.6):
        acc.cyl(xx, F + 6.6, 0.22, 0.0, 5.2, MAT['brass'], FC['gold'], n=20)
    # planters and bollards along the kerb, street lamps
    for xx in range(-44, 42, 8):
        if abs(xx) < 4: continue
        acc.box(xx - 0.9, 0.0, k - 1.6, xx + 0.9, 0.55, k - 0.6, MAT['stone'], FC['sandstone'])
        acc.box(xx - 0.82, 0.55, k - 1.52, xx + 0.82, 0.62, k - 0.68, MAT['carpet'], lin('#2e4a2a'))
    for xx in range(-42, 42, 14):
        acc.cyl(xx, k - 0.4, 0.07, 0.0, 6.2, MAT['powder'], FC['bronze'], n=12)
        acc.box(xx - 0.25, 6.2, k - 0.65, xx + 0.25, 6.35, k - 0.15, MAT['powder'], FC['bronze'])
        lit.spot((xx, 6.15, k - 0.4), lin('#ffdcae'), 9.0, 16, 'h', (0, -1, 0.15), 40, 75)
        glow.quad((xx - 0.2, 6.199, k - 0.6), (xx + 0.2, 6.199, k - 0.6), (xx + 0.2, 6.199, k - 0.2), (xx - 0.2, 6.199, k - 0.2), lin('#ffdcae'), 2.2)
    # the block across the street: brick with lit windows and shopfronts (a backdrop)
    acc.box(x0, -0.3, far, x1, 16.0, far + 0.6, MAT['brick'], lin('#7a4a38'))
    for xx in range(int(x0) + 2, int(x1) - 2, 4):
        for fl in range(1, 4):
            yy = fl * 4.0 + 0.8; lit_ = rnd.random() < 0.6
            glow.quad((xx + 2.2, yy, far - 0.01), (xx + 0.6, yy, far - 0.01), (xx + 0.6, yy + 2.0, far - 0.01), (xx + 2.2, yy + 2.0, far - 0.01), lin('#ffcf8f') if lit_ else lin('#24303a'), 1.4 if lit_ else 0.15)
        glow.quad((xx + 3.6, 0.3, far - 0.01), (xx + 0.4, 0.3, far - 0.01), (xx + 0.4, 2.8, far - 0.01), (xx + 3.6, 2.8, far - 0.01), mix(lin('#ffd9a8'), lin('#9ad0ff'), rnd.random() * 0.4), 0.9)
    lit.ambient(lin('#30384a'), lin('#141418'), 0.06, 'h')
    return acc, glow, lit, {'panels': [{'id': 'marquee', 'x': 0, 'y': 6.1, 'z': F + 7.11, 'yaw': 0, 'w': 14.0, 'h': 0.9, 'emit': 1}]}
