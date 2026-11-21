"""LUMIERE v9 - the rooms around the halls, as closed-solid models from the building spec (www/js/building.js):
lobby (double height, mezzanine, escalators, lift, box office, concessions, lounge), corridor (L1: the long, dim, Dolby-style way in with
curves, rounded corners and diamond relief), spine (G: the bright way out with a travelator and exit stairs), restrooms, street.
Palettes: docs/V9-DESIGN.md section 5 (3-4 colours per space, dim variants of the same hues)."""
import math, random
from geo import Acc, Glow, Lights, MAT, lin, mix, cross, sub
import street12
import front12
import lobby12
from home14 import build_home   # v14 your flat in the Astor (home14.py)

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
        for k in range(0 if i == 0 else 1, n + 1):   # the joint's post belongs to the segment before it
            px, pz = ax + ux * L * k / n, az + uz * L * k / n
            acc.box(px - 0.025, y - 0.02, pz - 0.025, px + 0.025, y + h - 0.02, pz + 0.025, mat_post, col_post)   # set 2 cm into the floor
        if glass:
            nx, nz = -uz, ux
            q = [(ax + nx * 0.01, az + nz * 0.01), (bx + nx * 0.01, bz + nz * 0.01), (bx - nx * 0.01, bz - nz * 0.01), (ax - nx * 0.01, az - nz * 0.01)]
            acc.prism(q, y + 0.08, y + h - 0.1, MAT['glass'], lin('#9fb3bf'))
        if led:
            nx, nz = -uz, ux
            glow.quad((bx, y + 0.03, bz), (ax, y + 0.03, az), (ax, y + 0.06, az), (bx, y + 0.06, bz), led, 0.8)
            glow.quad((bx, y + 0.06, bz), (ax, y + 0.06, az), (ax, y + 0.03, az), (bx, y + 0.03, bz), led, 0.8)   # both sides
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

def glow_facing(glow, a, b, c, d, want, col, k):
    """a glow quad that faces `want` (a direction), whatever order its corners come in"""
    n = (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]), (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]), (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
    glow.quad(*((a, b, c, d) if n[0] * want[0] + n[1] * want[1] + n[2] * want[2] >= 0 else (d, c, b, a)), col, k)

def door_reveal(acc, d, plane, toward, w_room, h_room, mat, col):
    """a hall door (axis z: in a wall x = const) seen from the room in front of it: jambs, head and sill from that room's wall opening
    (w_room x h_room) back to the door leaf, which stands in the middle of the hall's wall. The hall draws its own reveal only while
    it is drawn, and it is not drawn while its door is shut, so without these the opening showed the void round the closed door
    (v9 see-through test). plane: the hall wall's face on this side; toward: +1/-1, the side the room is on. Every face sits 1 cm in
    front of the hall's own (no z-fighting once the door opens and the hall is drawn); the sill is a metal threshold plate."""
    leaf = d['x'] + toward * 0.03; xa, xb = sorted((leaf, plane + toward * 0.02)); xs0, xs1 = sorted((leaf, plane))
    z0_, z1_, y0_, hw = d['z'] - w_room / 2, d['z'] + w_room / 2, d['y'], d['w'] / 2 - 0.01
    acc.box(xa, y0_, z0_, xb, y0_ + h_room, d['z'] - hw, mat, col)                              # jamb, -z side
    acc.box(xa, y0_, d['z'] + hw, xb, y0_ + h_room, z1_, mat, col)                              # jamb, +z side
    acc.box(xa, y0_ + d['h'] - 0.01, d['z'] - hw, xb, y0_ + h_room, d['z'] + hw, mat, col)      # head
    acc.box(xs0, y0_ - 0.05, d['z'] - hw, xs1, y0_ + 0.003, d['z'] + hw, MAT['metal'], (0.3, 0.29, 0.27))   # threshold plate, 3 mm proud of both floors

def door_reveal_x(acc, d, plane, toward, w_room, h_room, mat, col):
    """door_reveal for a door in a wall z = const (axis 'x': the v12b side exits): plane is the wall's face on the room's side, toward
    +1/-1 the side the room is on; jambs and head from the room's opening back to the leaf, every face 1 cm in front of the hall's own"""
    leaf = d['z'] + toward * 0.03; za, zb = sorted((leaf, plane + toward * 0.02)); zs0, zs1 = sorted((leaf, plane))
    x0_, x1_, y0_, hw = d['x'] - w_room / 2, d['x'] + w_room / 2, d['y'], d['w'] / 2 - 0.01
    acc.box(x0_, y0_, za, d['x'] - hw, y0_ + h_room, zb, mat, col)
    acc.box(d['x'] + hw, y0_, za, x1_, y0_ + h_room, zb, mat, col)
    acc.box(d['x'] - hw, y0_ + d['h'] - 0.01, za, d['x'] + hw, y0_ + h_room, zb, mat, col)
    acc.box(d['x'] - hw, y0_ - 0.05, zs0, d['x'] + hw, y0_ + 0.003, zs1, MAT['metal'], (0.3, 0.29, 0.27))

def lights_grid(lit, acc, glow, x0, z0, x1, z1, y, step, col, I, r, ch='h', can=True):
    nx, nz = (max(1, int((x1 - x0) / step)) if x1 - x0 > 1e-6 else 0), (max(1, int((z1 - z0) / step)) if z1 - z0 > 1e-6 else 0)   # zero width: one row
    for i in range(nx + 1):
        for j in range(nz + 1):
            x, z = x0 + (x1 - x0) * (i / nx if nx else 0), z0 + (z1 - z0) * (j / nz if nz else 0)
            lit.spot((x, y - 0.05, z), col, I, r, ch, (0, -1, 0), 25, 60)
            if can:
                acc.cyl(x, z, 0.08, y - 0.02, y + 0.001, MAT['metal'], lin('#2a2a2e'), n=12)
                glow.quad((x - 0.055, y - 0.022, z - 0.055), (x + 0.055, y - 0.022, z - 0.055), (x + 0.055, y - 0.022, z + 0.055), (x - 0.055, y - 0.022, z + 0.055), col, 2.2)

ROSSO = lin('#c4847e')   # v12 the lobby's red marble, a shade deeper than the scan


def grand_column(acc, glow, lit, cx, cz, H, r=0.42):
    """v11 (the user: "the pillars are half made and placed in the lobby"): a column that carries the roof. Black-and-gold marble shaft on a
    stepped plinth, a brass band at 3 m, a stepped Deco capital in brass under the ceiling with a lit ring, an uplight in the floor on four
    sides. Everything is a closed cylinder; steps differ in radius, so no two faces share a plane."""
    brass = lin('#b8893c')
    acc.cyl(cx, cz, r + 0.16, 0.0, 0.14, MAT['neroGold'], lin('#ffffff'), n=32); acc.cyl(cx, cz, r + 0.07, 0.14, 0.22, MAT['brass'], brass, n=32)
    acc.cyl(cx, cz, r, 0.22, H - 0.86, MAT['rosso'], ROSSO, n=32)   # v12: red marble shafts (the user's v8 photos)
    acc.cyl(cx, cz, r + 0.014, 2.96, 3.04, MAT['brass'], brass, n=32)
    for rr, ya, yb in ((r + 0.05, H - 0.86, H - 0.7), (r + 0.15, H - 0.7, H - 0.52), (r + 0.28, H - 0.52, H - 0.3), (r + 0.4, H - 0.3, H - 0.2)):
        acc.cyl(cx, cz, rr, ya, yb, MAT['brass'], brass, n=32)
    acc.cyl(cx, cz, r + 0.3, H - 0.2, H + 0.001, MAT['paint'], lin('#1a1816'), n=32)   # a recessed neck: the ring of light sits on it
    for k in range(24):
        a0, a1 = 2 * math.pi * k / 24, 2 * math.pi * (k + 1) / 24; rg = r + 0.302
        p0, p1 = (cx + rg * math.cos(a0), cz + rg * math.sin(a0)), (cx + rg * math.cos(a1), cz + rg * math.sin(a1)); am = (a0 + a1) / 2
        glow_facing(glow, (p0[0], H - 0.17, p0[1]), (p1[0], H - 0.17, p1[1]), (p1[0], H - 0.05, p1[1]), (p0[0], H - 0.05, p0[1]), (math.cos(am), 0, math.sin(am)), lin('#ffd9a8'), 2.2)
    for dx, dz in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        ux_, uz_ = cx + dx * (r + 0.42), cz + dz * (r + 0.42)
        lit.spot((ux_, 0.06, uz_), lin('#ffd9a8'), 0.9, 9.0, 'h', (-dx * 0.07, 1, -dz * 0.07), 10, 26)   # grazes the shaft from the floor
        acc.cyl(ux_, uz_, 0.07, 0.0, 0.012, MAT['metal'], lin('#2a2a2e'), n=12)
        glow.quad((ux_ - 0.04, 0.0125, uz_ - 0.04), (ux_ - 0.04, 0.0125, uz_ + 0.04), (ux_ + 0.04, 0.0125, uz_ + 0.04), (ux_ + 0.04, 0.0125, uz_ - 0.04), lin('#ffd9a8'), 2.0)
        lit.point((cx + dx * (r + 0.75), H - 0.55, cz + dz * (r + 0.75)), lin('#ffd9a8'), 0.5, 3.2, 'h')   # the ring's wash on the ceiling and the capital


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
            acc.quad((inner, ya, za), (inner, yb, zb), (inner, yb + 0.12, zb), (inner, ya + 0.12, za), MAT['metal'], lin('#5c5f66'))   # both faces: from the steps and, through
            acc.quad((inner, ya + 0.12, za), (inner, yb + 0.12, zb), (inner, yb, zb), (inner, ya, za), MAT['metal'], lin('#5c5f66'))   # the glass, from beside the escalator
        lit.line((xs + (0.1 if xs == x0 else -0.1), y0 + 0.15, zf0), (xs + (0.1 if xs == x0 else -0.1), y1 + 0.15, zt1), lin('#ffe0b0'), 0.08, 2.0, 'f')
        # v11 a warm light line under the handrail on the steps' side, along the whole run
        xi = xs + (0.014 if xs == x0 else -0.014); nx_ = 1 if xs == x0 else -1
        for k in range(len(zs) - 1):
            za, zb = zs[k], zs[k + 1]; ya, yb = h_at(za), h_at(zb)
            glow_facing(glow, (xi, ya + 0.9, za), (xi, yb + 0.9, zb), (xi, yb + 0.935, zb), (xi, ya + 0.935, za), (nx_, 0, 0), lin('#ffd9a0'), 1.5)
    return h_at

# ------------------------------------------------------------------------------------------------ the escalator and lift hall
def core_hall(acc, glow, lit, S, signs, h_up):
    """v11 (the user, 2026-11-14: "make the escalator and the elevator area a one and a separate area rather than it being so open"): the
    escalators and the lift in a hall of their own, floor to ceiling, from the gate line back to the mezzanine (building.js CORE;
    docs/V11-RESEARCH.md section 1: real cinemas put the escalator in a walled, lit shaft behind the ticket check).
    The user's photo of the old gate line (a pier, a rail stopping short of it, two posts side by side) set the rule for every part here:
    it embeds into its neighbour or stands clear of it by more than 30 mm. Walls run 5 cm into the floor and 20 cm into the roof slab; the
    portal's jambs are the leaves' hinge lines; a gate cabinet fills the space between the ticket leaf and the exit leaves; claddings stand
    20 mm proud of their wall; a deck seats the up escalator's west balustrade and closes the gap to the wall. build.py --check refuses near
    misses (tools/blender/arch/connect.py)."""
    CO, L1, H = S['CORE'], S['L1'], S['LOBBY']['ceil']
    wx0, wx1, ex0, ex1 = CO['x0'], CO['xi0'], CO['xi1'], CO['x1']; fz0, fz1 = CO['zi1'], CO['z1']; zW, zE = CO['zWest'], CO['zEast']
    pt, cab, pr = CO['portal'], CO['cabinet'], CO['pier']; px0, px1, ph = pt['x0'], pt['x1'], pt['h']; YB, YT = -0.05, H + 0.2
    CH, WAL, BRZ, BR, NERO = lin('#1b1b1e'), lin('#4a2e1c'), lin('#3b2f25'), lin('#b8893c'), lin('#ffffff')
    # the shell (faces that only touch another part of the shell are left out: nothing there to see, nothing to fight over)
    acc.box(wx0, YB, zW, wx1, YT, fz0, MAT['paint'], CH, skip='pz ny py')       # west wall: on to the void's back edge (it is the void's side)
    acc.box(ex0, YB, zE - 0.03, ex1, YT, fz0, MAT['paint'], CH, skip='pz ny py')   # east wall: 3 cm past the mezzanine's edge (the gallery beam, the rail's glass and posts end inside it)
    acc.box(wx0, YB, fz0, px0, YT, fz1, MAT['paint'], CH, skip='ny py')         # front wall, west of the portal
    acc.box(px1, YB, fz0, ex1, YT, fz1, MAT['paint'], CH, skip='ny py')         # front wall, east of the portal
    acc.box(px0, ph, fz0, px1, YT, fz1, MAT['paint'], CH, skip='nx px py')      # over the portal: its underside is the lit soffit
    # the NW corner: a black-and-gold marble pier 0.84 m square (it takes the court column's place), 27 cm proud of both lobby faces
    cx0, cx1, cz0, cz1 = pr['x'] - pr['half'], pr['x'] + pr['half'], pr['z'] - pr['half'], pr['z'] + pr['half']
    acc.box(cx0, YB, cz0, cx1, YT, cz1, MAT['neroGold'], NERO, skip='ny py')
    for ya, yb in ((-0.02, 0.1), (3.4, 3.44), (H - 0.5, H - 0.44)):   # at the walls' own shoe and line heights
        acc.box(cx0 - 0.012, ya, cz0 - 0.012, cx1 + 0.012, yb, cz1 + 0.012, MAT['brass'], BR, skip='ny')
    # ---- the lobby's side: fluted walnut to 3.4 m on a brass shoe, a brass line, dark plaster above; big posters on the west face
    for (a, b, c, d) in ((wx0 - 0.02, zW, wx0, cz0 + 0.02), (cx1 - 0.02, fz1, px0 - 0.13, fz1 + 0.02), (px1 + 0.13, fz1, ex1, fz1 + 0.02), (ex1, zE - 0.03, ex1 + 0.02, fz1 + 0.02)):   # 2 cm into the pier
        acc.box(a, 0.1, b, c, 3.4, d, MAT['fluted'], WAL)   # the shoe and the line below are 5 to 10 mm prouder than the walnut
    acc.box(wx0 - 0.025, -0.02, zW, wx0, 0.1, cz0 - 0.012, MAT['brass'], BR); acc.box(wx0 - 0.03, 3.4, zW, wx0, 3.44, cz0 - 0.012, MAT['brass'], BR)   # to the pier's band
    acc.box(ex1, -0.02, zE - 0.03, ex1 + 0.025, 0.1, fz1, MAT['brass'], BR); acc.box(ex1, 3.4, zE - 0.03, ex1 + 0.03, 3.44, fz1, MAT['brass'], BR)   # to the front's (no overlap at the corner)
    for (a, b, c) in ((cx1 + 0.012, px0 - 0.13, px0 - 0.13), (px1 + 0.13, ex1 + 0.025, ex1 + 0.03)):   # from the pier's brass band, to the corner
        acc.box(a, -0.02, fz1, b, 0.1, fz1 + 0.025, MAT['brass'], BR); acc.box(a, 3.4, fz1, c, 3.44, fz1 + 0.03, MAT['brass'], BR)
    # three posters 2.4 x 3.6 m on the west face, over the court (lit from it), each in a brass frame 3 cm proud
    for zc, fid in ((-4.6, 'sintel'), (-1.6, 'cosmos'), (1.4, 'hero')):
        pw, phh, yc = 2.4, 3.6, 6.2
        acc.box(wx0 - 0.03, yc - phh / 2 - 0.08, zc - pw / 2 - 0.08, wx0, yc + phh / 2 + 0.08, zc + pw / 2 + 0.08, MAT['brass'], BR)
        acc.box(wx0 - 0.04, yc - phh / 2 - 0.02, zc - pw / 2 - 0.02, wx0 - 0.03, yc + phh / 2 + 0.02, zc + pw / 2 + 0.02, MAT['powder'], lin('#101012'))
        signs.append({'id': 'poster_%s_hw' % fid, 'x': wx0 - 0.046, 'y': yc, 'z': zc, 'yaw': -math.pi / 2, 'w': pw, 'h': phh, 'emit': 0.7})
        lit.spot((wx0 - 3.2, H - lobby12.FIELD_DROP - 0.15, zc), lin('#ffe2bf'), 2.2, 9.0, 'h', (0.55, -0.8, 0), 16, 34)   # v13 under the lobby's dropped field
    # one tall poster over the lift's landing, on the front face (east of the portal)
    pw, phh, xc, yc = 2.6, 3.9, (px1 + ex1) / 2 + 0.2, 6.25
    acc.box(xc - pw / 2 - 0.08, yc - phh / 2 - 0.08, fz1, xc + pw / 2 + 0.08, yc + phh / 2 + 0.08, fz1 + 0.03, MAT['brass'], BR)
    acc.box(xc - pw / 2 - 0.02, yc - phh / 2 - 0.02, fz1 + 0.03, xc + pw / 2 + 0.02, yc + phh / 2 + 0.02, fz1 + 0.04, MAT['powder'], lin('#101012'))
    signs.append({'id': 'poster_wingit_hf', 'x': xc, 'y': yc, 'z': fz1 + 0.046, 'yaw': 0, 'w': pw, 'h': phh, 'emit': 0.7})
    lit.spot((xc, H - lobby12.FIELD_DROP - 0.15, fz1 + 3.0), lin('#ffe2bf'), 2.0, 9.0, 'h', (0, -0.8, -0.55), 16, 34)
    # ---- the portal: bronze casings round the opening on both faces (4 cm proud, 13 cm wide), a lit soffit, a brass threshold
    for zf, sg in ((fz1, 1), (fz0, -1)):
        za, zb = (zf, zf + 0.04) if sg > 0 else (zf - 0.04, zf)
        acc.box(px0 - 0.13, -0.02, za, px0, ph + 0.13, zb, MAT['powder'], BRZ); acc.box(px1, -0.02, za, px1 + 0.13, ph + 0.13, zb, MAT['powder'], BRZ)
        acc.box(px0, ph, za, px1, ph + 0.13, zb, MAT['powder'], BRZ)
    glow_facing(glow, (px0 + 0.1, ph - 0.002, (fz0 + fz1) / 2 - 0.05), (px1 - 0.1, ph - 0.002, (fz0 + fz1) / 2 - 0.05), (px1 - 0.1, ph - 0.002, (fz0 + fz1) / 2 + 0.05), (px0 + 0.1, ph - 0.002, (fz0 + fz1) / 2 + 0.05), (0, -1, 0), lin('#ffe2b8'), 2.2)
    lit.line((px0 + 0.2, ph - 0.05, (fz0 + fz1) / 2), (px1 - 0.2, ph - 0.05, (fz0 + fz1) / 2), lin('#ffe2b8'), 0.9, 4.0, 'h', (0, -1, 0))
    acc.box(px0, -0.01, fz0, px1, 0.006, fz1, MAT['brass'], BR)   # 6 mm over the lobby's floor, 1 mm over the zone's
    # the gate cabinet between the ticket leaf and the exit leaves (as a metro gate's): brushed metal on a brass plinth, a black glass top
    # with the reader light; it stands through the wall's depth, 15 cm proud of both faces
    cz_a, cz_b = (fz0 + fz1) / 2 - 0.3, (fz0 + fz1) / 2 + 0.3
    acc.box(cab['x0'], -0.02, cz_a, cab['x1'], 0.08, cz_b, MAT['brass'], BR, skip='ny')
    acc.box(cab['x0'] + 0.01, 0.08, cz_a + 0.01, cab['x1'] - 0.01, 1.0, cz_b - 0.01, MAT['metal'], lin('#6c6f75'), skip='ny')
    acc.box(cab['x0'], 1.0, cz_a, cab['x1'], 1.03, cz_b, MAT['nero'], lin('#151517'), skip='ny')
    glow_facing(glow, ((cab['x0'] + cab['x1']) / 2 - 0.06, 1.0305, (fz0 + fz1) / 2 - 0.06), ((cab['x0'] + cab['x1']) / 2 + 0.06, 1.0305, (fz0 + fz1) / 2 - 0.06), ((cab['x0'] + cab['x1']) / 2 + 0.06, 1.0305, (fz0 + fz1) / 2 + 0.06), ((cab['x0'] + cab['x1']) / 2 - 0.06, 1.0305, (fz0 + fz1) / 2 + 0.06), (0, 1, 0), lin('#ffd27a'), 1.6)
    # ---- inside: black marble dado to 1 m, fluted walnut to 3 m with a brass line, dark plaster above; the up escalator's wall follows the
    # slope (dado and walnut ride on the step line), posters step up beside it at eye height
    E = S['ESC']; up = E['up']; pr_ = up['profile']; zb0 = pr_['plateBot'][0]
    zs = sorted({z for z in (fz0 - 0.001, zb0, pr_['incline'][0], pr_['incline'][1], zW + 0.001) if zW < z < fz0}, reverse=True)
    hz = lambda z: h_up(z)
    for k in range(len(zs) - 1):
        za, zb = zs[k], zs[k + 1]; ya, yb = hz(za), hz(zb)
        acc.prism_x([(za, ya - 0.02), (zb, yb - 0.02), (zb, yb + 1.0), (za, ya + 1.0)], wx1, wx1 + 0.02, MAT['neroGold'], NERO)
        acc.prism_x([(za, ya + 1.0), (zb, yb + 1.0), (zb, yb + 1.04), (za, ya + 1.04)], wx1, wx1 + 0.025, MAT['brass'], BR)
        acc.prism_x([(za, ya + 1.04), (zb, yb + 1.04), (zb, yb + 3.0), (za, ya + 3.0)], wx1, wx1 + 0.02, MAT['fluted'], WAL)
        acc.prism_x([(za, ya + 3.0), (zb, yb + 3.0), (zb, yb + 3.04), (za, ya + 3.04)], wx1, wx1 + 0.025, MAT['brass'], BR)
    zi0_, zi1_ = pr_['incline']
    for i, fid in enumerate(('coffeerun', 'glasshalf', 'agent327', 'bunny')):
        zc = zi0_ + (zi1_ - zi0_) * (i + 0.5) / 4; yc = hz(zc) + 1.95; pw, phh = 0.8, 1.15
        acc.box(wx1 + 0.02, yc - phh / 2 - 0.05, zc - pw / 2 - 0.05, wx1 + 0.045, yc + phh / 2 + 0.05, zc + pw / 2 + 0.05, MAT['brass'], BR)
        signs.append({'id': 'poster_%s_he' % fid, 'x': wx1 + 0.051, 'y': yc, 'z': zc, 'yaw': math.pi / 2, 'w': pw, 'h': phh, 'emit': 0.9})
    # the other walls inside, at the landing: the front wall either side of the portal, the east wall in front of the lift tower
    for (a, b, c, d, nrm) in ((wx1, fz0 - 0.02, px0 - 0.13, fz0, 'z'), (px1 + 0.13, fz0 - 0.02, ex0, fz0, 'z'), (ex0 - 0.02, S['LIFT']['z1'] - 0.02, ex0, fz0 - 0.02, 'x')):
        if c - a < 0.01 or d - b < 0.01: continue
        acc.box(a, -0.02, b, c, 1.0, d, MAT['neroGold'], NERO); acc.box(a, 1.04, b, c, 3.0, d, MAT['fluted'], WAL)
        if nrm == 'z': acc.box(a, 1.0, b - 0.005, c, 1.04, d, MAT['brass'], BR); acc.box(a, 3.0, b - 0.005, c, 3.04, d, MAT['brass'], BR)
        else: acc.box(a - 0.005, 1.0, b, c, 1.04, d - 0.005, MAT['brass'], BR); acc.box(a - 0.005, 3.0, b, c, 3.04, d - 0.005, MAT['brass'], BR)   # to the front wall's line (they overlapped at the corner)
    # the east wall over the gallery and the alcove under it: walnut on a brass shoe (the alcove is lobby, the gallery is the hall's)
    acc.box(ex0 - 0.02, 0.1, zE - 0.03, ex0, L1 - 0.36, S['LIFT']['z0'] - 0.001, MAT['fluted'], WAL); acc.box(ex0 - 0.025, -0.02, zE - 0.03, ex0, 0.1, S['LIFT']['z0'] - 0.001, MAT['brass'], BR)
    acc.box(ex0 - 0.02, L1 + 0.1, zE - 0.03, ex0, L1 + 3.0, S['LIFT']['z0'] - 0.001, MAT['fluted'], WAL); acc.box(ex0 - 0.025, L1 - 0.02, zE - 0.03, ex0, L1 + 0.1, S['LIFT']['z0'] - 0.001, MAT['brass'], BR)
    # light: three lines in the ceiling along the hall (over each escalator, over the lift and the gallery), vertical light lines on the east
    # wall over the gallery; the hall is darker than the foyer (you leave the bright lobby for the screens)
    for xc_ in ((up['x0'] + up['x1']) / 2, (E['down']['x0'] + E['down']['x1']) / 2, (S['LIFT']['x0'] + S['LIFT']['x1']) / 2):
        glow_facing(glow, (xc_ - 0.04, H - 0.003, zW + 0.4), (xc_ + 0.04, H - 0.003, zW + 0.4), (xc_ + 0.04, H - 0.003, fz0 - 0.4), (xc_ - 0.04, H - 0.003, fz0 - 0.4), (0, -1, 0), lin('#ffe2b8'), 2.4)
        lit.line((xc_, H - 0.1, zW + 0.6), (xc_, H - 0.1, fz0 - 0.6), lin('#ffdcae'), 0.9, 9.5, 'h', (0, -1, 0))
    for zc_ in (-6.2, -4.4, -2.6):
        glow_facing(glow, (ex0 - 0.003, L1 + 3.4, zc_ - 0.03), (ex0 - 0.003, L1 + 3.4, zc_ + 0.03), (ex0 - 0.003, H - 0.4, zc_ + 0.03), (ex0 - 0.003, H - 0.4, zc_ - 0.03), (-1, 0, 0), lin('#ffd9a0'), 1.8)
    for zc in (zi0_ + (zi1_ - zi0_) * (i + 0.5) / 4 for i in range(4)):
        lit.spot((wx1 + 1.2, hz(zc) + 3.6, zc), lin('#ffe2bf'), 0.7, 4.0, 'h', (-0.6, -0.8, 0), 18, 40)   # over each poster beside the escalator
    lit.area((13.0, 3.0, fz0 - 0.6), (2.6, 0, 0), (0, 0, 0.5), (0, -1, 0), lin('#ffe6c8'), 2.0, 8, 'h', 2, 1)   # the landing
    # the signs on bronze plates: the zone's over the portal on the lobby side (between the ends of the brass line), the way out inside over
    # the exit leaves (the panels hang 6 mm in front of their plates)
    G, sw = S['GATE'], px1 - px0 + 0.26
    acc.box(px0 - 0.13, ph + 0.25, fz1, px1 + 0.13, ph + 0.75, fz1 + 0.04, MAT['powder'], lin('#16171a'))
    signs.append({'id': 'wayfind_zone', 'x': (px0 + px1) / 2, 'y': ph + 0.5, 'z': fz1 + 0.046, 'yaw': 0, 'w': sw - 0.04, 'h': 0.46, 'emit': 1})
    ox = (px0 + px1) / 2   # the portal's middle (v11: over the exit leaves it read as off-centre)
    acc.box(ox - 1.12, ph + 0.2, fz0 - 0.04, ox + 1.12, ph + 0.64, fz0, MAT['powder'], lin('#16171a'))
    signs.append({'id': 'wayfind_out', 'x': ox, 'y': ph + 0.42, 'z': fz0 - 0.046, 'yaw': math.pi, 'w': 2.2, 'h': 0.4, 'emit': 1})

# ------------------------------------------------------------------------------------------------ lobby
def build_lobby(S):
    LB, MZ, L1 = S['LOBBY'], S['MEZZ'], S['L1']; x0, x1, z0, z1, H = LB['x0'], LB['x1'], LB['z0'], LB['z1'], LB['ceil']
    # the court's four columns (grand_column; the widest capital step is r + 0.4): the north pair stands on the ticket gate's line
    COLS, COL_CAP_R = ((-8.1, S['GATE']['z']), (8.1, S['GATE']['z']), (-8.1, 14.2), (8.1, 14.2)), 0.42 + 0.40
    acc, glow = Acc(), Glow(); lit = Lights([x0, z0, x1, z1], H)
    P = {k: lin(v) for k, v in S['PALETTE']['lobby'].items()}; B = {k: lin(v) for k, v in S['PALETTE']['brand'].items()}
    rnd = random.Random(3)
    # floor (v12, the user's v8 photos are the benchmark for premium): polished Nero Marquina, a red marble border and a red marble disc
    # in a champagne terrazzo ring in front of the doors
    slab(acc, x0, z0, x1, z1, 0.0, 0.3, MAT['nero'], lin('#e6e6e6'))   # exactly the room: the neighbours' floors meet it at the doors
    # v9.1: a black-and-gold marble border 0.5 m in from the walls (Allu-style), 5 mm proud (v11: 3 mm is under the depth buffer's step
    # across the lobby); it stops at the doors and the counters
    for (bx0, bz0, bx1, bz1) in ((x0 + 0.5, z0 + 0.5, x0 + 0.8, z1 - 0.5), (x1 - 0.8, z0 + 0.5, x1 - 0.5, z1 - 0.5), (x0 + 0.8, z1 - 0.8, -2.6, z1 - 0.5), (2.6, z1 - 0.8, x1 - 0.8, z1 - 0.5)):
        if bx0 < -16.6 and bx1 < -16.0: continue   # behind the box office and the concessions: the staff side
        acc.box(bx0, 0.0, bz0, bx1, 0.005, bz1, MAT['rosso'], ROSSO)
    for i in range(48):
        a0, a1 = 2 * math.pi * i / 48, 2 * math.pi * (i + 1) / 48
        for r0, r1, mat, col, yy in ((0.0, 2.6, MAT['rosso'], ROSSO, 0.005),   # v12 red marble (v9.1 black-and-gold read as a black hole on cream)
                                      (2.6, 3.0, MAT['terrazzo'], P['champagne'], 0.006), (3.0, 3.08, MAT['brass'], B['gold'], 0.008)):
            cx, cz = 0.0, 10.0
            p = [(cx + r0 * math.cos(a0), yy, cz + r0 * math.sin(a0)), (cx + r1 * math.cos(a0), yy, cz + r1 * math.sin(a0)), (cx + r1 * math.cos(a1), yy, cz + r1 * math.sin(a1)), (cx + r0 * math.cos(a1), yy, cz + r0 * math.sin(a1))]
            acc.quad(p[0], p[3], p[2], p[1], mat, col) if r0 > 0 else acc.tri(p[0], p[2], p[1], mat, col)
    lobby12.runner_to_ring(acc, 0.0, 10.0, 3.08, 1.6, z1 - 0.45)   # v13 the entrance runner, from the doors to the ring's brass (the prop stopped 0.22 m short)
    # roof slab and walls (thickness 0.4; the facade is glass between bronze mullions)
    # v13 (lobby12.py, variant C1b): the roof's underside is hidden by the dropped field except in the field's shadow gaps and over the
    # escalator hall: those strips are added with the field (below); the box keeps its top and sides
    acc.box(x0 + 0.02, H, z0 + 0.02, x1 - 0.02, H + 0.4, z1 - 0.02, lobby12.PAINT, lobby12.CEIL, skip='ny', top=MAT['paint'], topcol=P['charcoal'])   # inside the walls
    acc.wall((x0 + 0.2, z0), (x0 + 0.2, z1), -0.3, H + 0.4, 0.4, MAT['fluted'], lin('#4a3226'))                     # west: v12 dark walnut flutes
    acc.wall((x1 - 0.2, z1), (x1 - 0.2, z0), -0.3, H + 0.4, 0.4, MAT['paint'], mix(P['charcoal'], P['stone'], 0.25),     # east: restroom door
             openings=[(z1 - (-1.0) - 1.1, z1 - (-1.0) + 1.1, 2.6, -0.3)])
    # v9.1: the east wall was one flat colour (the user: "empty", "one colour pasted everywhere"): honed travertine panels 1.2 x 2.0 m with
    # 12 mm shadow reveals to 6 m, a black marble base, a brass line at 6 m; the restroom door gets a travertine portal with a brass frame
    xe = x1 - 0.4; zw0, zw1 = -1.0 - 1.1, -1.0 + 1.1
    acc.box(xe - 0.03, 0.0, z0 + 0.4, xe, 0.15, zw0 - 0.03, MAT['neroGold'], lin('#ffffff')); acc.box(xe - 0.03, 0.0, zw1 + 0.03, xe, 0.15, z1 - 0.4, MAT['neroGold'], lin('#ffffff'))   # into the jambs
    zz = z0 + 0.4
    while zz < z1 - 0.5:
        zb_ = min(zz + 1.2, z1 - 0.4)
        for yy, hh in ((0.15, 2.51), (2.66, 1.75), (4.41, 1.74)):
            if yy < 2.6 and zb_ > zw0 - 0.25 and zz < zw1 + 0.25: continue   # the door
            acc.box(xe - 0.04, yy + 0.006, zz + 0.006, xe, yy + hh - 0.006, zb_ - 0.006, MAT['travertine'], lin('#8c7c6e'))   # v12 a darker stone
        zz = zb_
    acc.box(xe - 0.05, 6.15, z0 + 0.4, xe, 6.2, z1 - 0.4, MAT['brass'], P['champagne'])
    for zf in (zw0 - 0.06, zw1):
        acc.box(xe - 0.07, 0.0, zf, xe, 2.6, zf + 0.06, MAT['brass'], P['champagne'])   # v11: under the lintel (overlapping it, they shared faces)
    acc.box(xe - 0.07, 2.6, zw0 - 0.06, xe, 2.66, zw1 + 0.06, MAT['brass'], P['champagne'])
    # back wall (z0): the spine's exit door at G; the portal to the bridge at L1 (x 7.4 .. 13.0); the lift shaft opening at L1 is inside
    acc.wall((x1, z0 + 0.2), (x0, z0 + 0.2), -0.3, H + 0.4, 0.4, MAT['paint'], P['charcoal'],
             openings=[(x1 - 1.6, x1 + 1.6, 3.0, -0.3), (x1 - 13.0, x1 - 7.4, L1 + 3.4, L1 - 0.32)], trim=(0.4, 0.4))   # door and portal: no sill in the floor's plane
    # facade (z1): glass from 0.4 to H-0.6 between mullions every 2.2 m, a bronze plinth and head; the door opening in the middle (4 m)
    # v10 (the user's photo: "the door from outside is unequal"): the bays were on a grid from the west end, which left a 0.6 m pier on one
    # side of the door and 2.2 m on the other. Now they are laid out from the door outwards: a 0.6 m pier each side, then eight 2 m bays
    bays = [(2.6 + 2.2 * i, 4.6 + 2.2 * i) for i in range(8)]; bays = [(-b_, -a_) for a_, b_ in reversed(bays)] + bays
    acc.wall((x0, z1 - 0.2), (x1, z1 - 0.2), -0.3, H + 0.4, 0.4, MAT['powder'], lin('#3b2f25'),
             openings=[(a_ - x0, b_ - x0, H - 0.8, 0.35) for a_, b_ in bays] + [(-2.0 - x0, 2.0 - x0, H - 0.8, -0.3)], trim=(0.4, 0.4))
    for a_, b_ in bays:
        acc.box(a_, 0.35, z1 - 0.21, b_, H - 0.8, z1 - 0.19, MAT['glass'], lin('#2a3a44'))
    # v11 (the user's photo: a brown block over the doors): the doors' opening now runs up to the glazing's head like every bay, a bronze
    # transom over the doors (1 mm inside the jambs), glass above it; it was solid wall to the ceiling, its glass hidden inside the wall
    acc.box(-1.999, 3.0, z1 - 0.4, 1.999, 3.3, z1, MAT['powder'], lin('#3b2f25'))
    acc.box(-2.0, 3.3, z1 - 0.21, 2.0, H - 0.8, z1 - 0.19, MAT['glass'], lin('#2a3a44'))
    # mezzanine (L1) over the back of the lobby, with the escalator void; round columns under its edge; glass balustrade
    V = MZ['void']
    LF = S['LIFT']; GA = S['GALLERY']
    for (a, b, c, d) in ((x0, z0, V['x0'], MZ['z1']), (V['x1'], z0, x1, MZ['z1']), (V['x0'], z0, V['x1'], V['z0'])):
        slab(acc, a, b, c, d, L1, 0.32, MAT['paint'], mix(P['charcoal'], P['stone'], 0.4), top=MAT['carpet'], topcol=mix(P['velvet'], P['charcoal'], 0.5))
    # v11 the gallery: the first-floor walk from the lift's rear door back to the mezzanine, beside the escalators; bronze edge beams,
    # downlights in its soffit for the alcove under it
    slab(acc, GA['x0'] + 0.12, GA['z0'], GA['x1'] - 0.12, GA['z1'], L1, 0.32, MAT['paint'], mix(P['charcoal'], P['stone'], 0.4), top=MAT['carpet'], topcol=mix(P['velvet'], P['charcoal'], 0.5))
    for xa_, xb_ in ((GA['x0'], GA['x0'] + 0.12), (GA['x1'] - 0.12, GA['x1'])):
        acc.box(xa_, L1 - 0.5, GA['z0'], xb_, L1, GA['z1'], MAT['powder'], lin('#3b2f25'))   # v11: against the mezzanine slab's edge (it stopped 2 mm short; set into it, they shared its planes)
    for zc_ in (-6.2, -4.5, -2.8):
        gx_ = (GA['x0'] + GA['x1']) / 2
        glow_facing(glow, (gx_ - 0.09, L1 - 0.322, zc_ - 0.09), (gx_ + 0.09, L1 - 0.322, zc_ - 0.09), (gx_ + 0.09, L1 - 0.322, zc_ + 0.09), (gx_ - 0.09, L1 - 0.322, zc_ + 0.09), (0, -1, 0), lin('#ffdcb0'), 2.4)
        lit.spot((gx_, L1 - 0.36, zc_), lin('#ffd8a8'), 1.5, 5.0, 'h', (0, -1, 0), 24, 52)
    for cx in (-18.0, -10.0, -2.0, 6.0, 18.0):
        lobby12.marble_column(acc, glow, lit, cx, MZ['z1'] - 0.5, 0.0, L1 - 0.30, w=0.22, h=0.04, base=0.30, bh=0.22, cap=0.29, ch=0.02, light=0.0)   # v13 P2 like the court's, its top 2 cm up in the slab
        lit.spot((cx, 0.05, MZ['z1'] - 0.12), lin('#ffd9a8'), 0.6, 4.5, 'h', (0, 1, -0.25), 15, 35)   # an uplight grazing each column
    # the rail runs round the void except where the escalators arrive (its back edge, over the steps: v9 route test found it closed)
    E = S['ESC']
    glass_rail(acc, glow, [(x0, MZ['z1']), (S['CORE']['x0'] + 0.1, MZ['z1'])], L1, led=B['gold'])   # v11: on to the escalator hall's west wall (10 cm into it)
    glass_rail(acc, glow, [(E['down']['x1'] + 0.02, V['z0']), (V['x1'], V['z0']), (V['x1'], GA['z1'] - 0.13)], L1, led=B['gold'])   # on along the gallery's west edge
    glass_rail(acc, glow, [(S['CORE']['x1'] - 0.1, MZ['z1']), (x1, MZ['z1'])], L1, led=B['gold'])   # v11: the gallery's east edge is the hall's east wall
    lights_grid(lit, acc, glow, x0 + 1.5, z0 + 1.2, x1 - 1.5, MZ['z1'] - 1.0, L1 - 0.32, 3.0, lin('#ffd8a8'), 1.6, 6)   # under the mezzanine
    # v13 (the user, 11-20: "the ceiling still sucks"; they picked C1b from tools/blender/variants13.py): a dropped field 0.75 m under the
    # roof, clear of the walls by a lit shadow gap, with a round opening over the court the four columns enclose (RCX, RCZ) that steps up
    # twice, a brass band and a hidden cove at each step (lobby12.halo); the chandelier hangs from the dome (world9.js), the statue's three
    # spots hang under it where the v11 inner ring had them. It replaces the coffers, the three rings, the crimson rim and the roof's stars
    RCX, RCZ, R1, R2 = 0.0, (COLS[0][1] + COLS[2][1]) / 2, 6.6, 4.8
    YF = H - lobby12.FIELD_DROP
    for (ccx, ccz) in COLS:
        clear = math.hypot(ccx - RCX, ccz - RCZ) - (R1 + 0.42) - 0.72   # the pocket's wall against a column's corner post
        if clear < 1.5: raise SystemExit(f'the ceiling halo passes {clear:.2f} m from the column at ({ccx}, {ccz})')
    CO_ = S['CORE']; CH_ = (CO_['x0'] + 0.02, CO_['zWest'], CO_['x1'] - 0.02, CO_['z1'] - 0.02)   # the escalator hall keeps the roof as its ceiling: the field runs 2 cm into its walls
    FX = lobby12.field(acc, glow, (x0 + 0.4, z0 + 0.4, x1 - 0.4, z1 - 0.4), YF, RCX, RCZ, R1, 7.6, [CH_, (CH_[0], CH_[1], CH_[2], CO_['zEast'] - 0.03)],
                       edges=[((CH_[0], CH_[1]), (CH_[2], CH_[1]), (0.0, 1.0)), ((CH_[2], CH_[1]), (CH_[2], CO_['zEast'] - 0.03), (-1.0, 0.0))])
    for (a_, b_, c_, d_) in ((x0 + 0.38, z0 + 0.38, FX[0] + 0.05, z1 - 0.38), (FX[2] - 0.05, z0 + 0.38, x1 - 0.38, z1 - 0.38), (FX[0] + 0.05, z0 + 0.38, FX[2] - 0.05, FX[1] + 0.05),
                             (FX[0] + 0.05, FX[3] - 0.05, FX[2] - 0.05, z1 - 0.38), (CO_['x0'], CO_['zWest'] - 0.02, CO_['x1'], CO_['z1'])):   # the roof's underside where it shows
        lobby12._down(acc, [(a_, H, b_), (c_, H, b_), (c_, H, d_), (a_, H, d_)], lobby12.PAINT, lobby12.CEIL)
    cans = [(RCX + 3.8 * math.cos(math.radians(th)), RCZ + 2.85 * math.sin(math.radians(th)), 3.0 if th == 270 else 6.0) for th in (62, 118, 270)]
    DOME_Y = lobby12.halo(acc, glow, lit, RCX, RCZ, R1, R2, YF, cans, (0.0, 3.0, 10.0))
    lit.ambient(lin('#ffe6c8'), lin('#5a4030'), 0.05, 'h')
    # v12b (the user, 11-19: "dedicated areas with much better overall design"): the ticket desk and the popcorn parlour, each with its own
    # counter, canopy, backdrop, floor and light (lobby12.ticket_zone / popcorn_zone); the snacks' back counter for the machines stays
    bo, co = S['COUNTERS']['boxOffice'], S['COUNTERS']['concessions']
    sign_tickets = lobby12.ticket_zone(acc, glow, lit, S, x0 + 0.4)   # v13 the zone's two signs on its taller fascia
    sign_food, bulbs = lobby12.popcorn_zone(acc, glow, lit, S, x0 + 0.4)
    # v12c the parlour's back counter: 0.75 m deep in front of the wall's face (x0 + 0.4) for the cabinet poppers and the soda towers (world9.js
    # LIFE; the v10 counter was 0.35 m deep there and its machines stood half inside the wall), ending at the candy wall's bay (z -0.95)
    acc.box(x0, 0.0, co['z0'], x0 + 1.10, 0.92, -0.95, MAT['lacquer'], mix(P['velvet'], P['charcoal'], 0.4))
    acc.box(x0, 0.92, co['z0'], x0 + 1.15, 0.96, -0.95, MAT['calacatta'], lin('#e8e2da'))
    acc.box(x0 + 1.095, 0.06, co['z0'] + 0.02, x0 + 1.112, 0.10, -0.97, MAT['brass'], lobby12.BRASS)   # a brass line along its foot, 5 mm into it
    lit.area((x0 + 0.55, 2.7, (co['z0'] + co['z1']) / 2), (0, 0, (co['z1'] - co['z0']) / 2 - 0.4), (0, 0.6, 0), (1, 0, 0), lin('#fff1dc'), 3.0, 8, 'f', 4, 1)   # the menu boards' light (v12c: it sat inside the wall)
    # lounge: a round rug (the sofas, chairs and table are props). v11 (the user: "don't leave things in the middle"): moved out of the main
    # walk between the doors and the escalators to the front-east corner by the windows; the middle of the lobby stays open floor
    LCX, LCZ = 15.3, 11.0
    for i in range(48):
        a0, a1 = 2 * math.pi * i / 48, 2 * math.pi * (i + 1) / 48; cx, cz, r0 = LCX, LCZ, 5.2
        acc.quad((cx, 0.006, cz), (cx + 4.7 * math.cos(a1), 0.006, cz + 4.7 * math.sin(a1)), (cx + 4.7 * math.cos(a0), 0.006, cz + 4.7 * math.sin(a0)), (cx, 0.006, cz), MAT['carpet'], lin('#24343a'))
        acc.quad((cx + 4.7 * math.cos(a0), 0.007, cz + 4.7 * math.sin(a0)), (cx + 4.7 * math.cos(a1), 0.007, cz + 4.7 * math.sin(a1)), (cx + r0 * math.cos(a1), 0.007, cz + r0 * math.sin(a1)), (cx + r0 * math.cos(a0), 0.007, cz + r0 * math.sin(a0)), MAT['carpet'], mix(P['champagne'], P['charcoal'], 0.25))
    # the back wall over the spine door: a big LED wall (the engine plays the brand film on it) framed in champagne
    acc.box(-7.2, 3.6, z0 + 0.4, 7.2, 3.7, z0 + 0.48, MAT['brass'], P['champagne']); acc.box(-7.2, 8.3, z0 + 0.4, 7.2, 8.4, z0 + 0.48, MAT['brass'], P['champagne'])   # on the wall's face
    lit.area((0, 6.0, z0 + 0.7), (7.0, 0, 0), (0, 2.2, 0), (0, 0, 1), lin('#c0c8ff'), 6.0, 14, 'f', 4, 2)
    # escalators and the lift shaft
    E = S['ESC']; h_up = escalator(acc, glow, lit, E['up']); escalator(acc, glow, lit, E['down'])
    # v11 the up escalator runs beside the hall's west wall (building.js CORE: 80 mm clear of its handrail): a deck from 5 cm inside the wall
    # to the balustrade, the glass seated 1 cm in it, the truss's own underside below; no slot between the escalator and the wall
    pu = E['up']['profile']; zb0u, zi0u, zi1u, zp1u = pu['plateBot'][0], pu['incline'][0], pu['incline'][1], pu['plateTop'][1]; y0u, y1u = E['up']['y0'], E['up']['y1']
    acc.prism_x([(zb0u, y0u + 0.13), (zi0u, y0u + 0.13), (zi1u, y1u + 0.13), (zp1u, y1u + 0.13), (zp1u, y1u - 0.9), (zi1u - 0.6, y1u - 1.1), (zi0u - 0.6, y0u - 0.25), (zb0u, y0u - 0.25)],
                S['CORE']['xi0'] - 0.05, E['up']['x0'], MAT['metal'], lin('#6c6f75'))   # to the truss's side exactly: overlapping it, their undersides shared a plane
    # v11 the lift (the user: "make the escalator and the elevator area connected"): a glass tower in a bronze frame beside the down
    # escalator, its door on the landing the escalators share. Four corner posts; bands at the foot, at the first floor and at the head;
    # glass between. Ground floor: the door in the front (z1) wall. First floor: the door in the rear (z0) wall, onto the gallery.
    BRZ = lin('#3b2f25'); lx0, lx1, lz0, lz1 = LF['x0'], LF['x1'], LF['z0'], LF['z1']; Ht = L1 + 3.3; lcx = (lx0 + lx1) / 2; GLS = lin('#2a3a44')
    for px in (lx0 - 0.15, lx1):
        for pz in (lz0, lz1 - 0.15): acc.box(px, 0.0, pz, px + 0.15, Ht, pz + 0.15, MAT['powder'], BRZ)
    for xa_ in (lx0 - 0.15, lx1):   # side walls between the posts
        for ya_, yb_ in ((0.0, 0.12), (L1 - 0.4, L1 + 0.12), (Ht - 0.2, Ht)): acc.box(xa_, ya_, lz0 + 0.15, xa_ + 0.15, yb_, lz1 - 0.15, MAT['powder'], BRZ)
        for ya_, yb_ in ((0.12, L1 - 0.4), (L1 + 0.12, Ht - 0.2)): acc.box(xa_ + 0.065, ya_, lz0 + 0.15, xa_ + 0.085, yb_, lz1 - 0.15, MAT['glass'], GLS)
    for ly, zf, sg in ((0.0, lz1, 1), (L1, lz0, -1)):   # the door wall at each floor: jambs, a header with the floor indicator, a brass architrave, the call button
        za_, zb_ = (zf - 0.15, zf) if sg > 0 else (zf, zf + 0.15)
        acc.box(lx0, ly, za_, lx0 + 0.5, ly + 2.3, zb_, MAT['powder'], BRZ); acc.box(lx1 - 0.5, ly, za_, lx1, ly + 2.3, zb_, MAT['powder'], BRZ)
        acc.box(lx0, ly + 2.3, za_, lx1, ly + 2.95, zb_, MAT['powder'], BRZ)
        zo_ = zf + sg * 0.035; zlo, zhi = min(zf, zo_), max(zf, zo_)
        for (ax_, bx_) in ((lx0 + 0.46, lx0 + 0.5), (lx1 - 0.5, lx1 - 0.46)): acc.box(ax_, ly, zlo, bx_, ly + 2.3, zhi, MAT['brass'], P['champagne'])   # v11: under the head
        acc.box(lx0 + 0.46, ly + 2.3, zlo, lx1 - 0.46, ly + 2.36, zhi, MAT['brass'], P['champagne'])
        zi_ = zf + sg * 0.03; acc.box(lcx - 0.3, ly + 2.5, min(zf, zi_), lcx + 0.3, ly + 2.72, max(zf, zi_), MAT['powder'], lin('#111113'))
        # (v11: the indicator's display and the call station are the engine's, lift9.js: their glow strips here are gone)
    # front wall above the ground-floor door: glass to the head; rear wall: walnut on bronze up to the gallery, glass over the first-floor door
    for ya_, yb_ in ((L1 - 0.4, L1 + 0.12), (Ht - 0.2, Ht)): acc.box(lx0, ya_, lz1 - 0.15, lx1, yb_, lz1, MAT['powder'], BRZ)
    for ya_, yb_ in ((2.95, L1 - 0.4), (L1 + 0.12, Ht - 0.2)): acc.box(lx0, ya_, lz1 - 0.085, lx1, yb_, lz1 - 0.065, MAT['glass'], GLS)
    acc.box(lx0, 0.0, lz0, lx1, L1, lz0 + 0.15, MAT['powder'], BRZ)
    acc.box(lx0 + 0.12, 0.12, lz0 - 0.014, lx1 - 0.12, L1 - 0.5, lz0, MAT['fluted'], lin('#5a3a22')); acc.box(lx0 + 0.12, 0.0, lz0 - 0.02, lx1 - 0.12, 0.12, lz0, MAT['brass'], P['champagne'])
    acc.box(lx0, Ht - 0.2, lz0, lx1, Ht, lz0 + 0.15, MAT['powder'], BRZ); acc.box(lx0, L1 + 2.95, lz0 + 0.065, lx1, Ht - 0.2, lz0 + 0.085, MAT['glass'], GLS)
    acc.box(lx0 - 0.22, Ht, lz0 - 0.07, lx1 + 0.22, Ht + 0.2, lz1 + 0.07, MAT['powder'], lin('#16171a'))                       # the cap
    acc.box(lx0 - 0.2, Ht - 0.03, lz0 - 0.05, lx1 + 0.2, Ht, lz1 + 0.05, MAT['brass'], P['champagne'])
    glow_facing(glow, (lx0 + 0.3, Ht - 0.201, lz0 + 0.4), (lx1 - 0.3, Ht - 0.201, lz0 + 0.4), (lx1 - 0.3, Ht - 0.201, lz1 - 0.4), (lx0 + 0.3, Ht - 0.201, lz1 - 0.4), (0, -1, 0), lin('#ffe6c4'), 1.4)
    lit.point((lcx, Ht - 0.7, (lz0 + lz1) / 2), lin('#ffe1b5'), 1.0, 6.0, 'h')
    for sx_ in (-1, 1): lit.spot((lcx + sx_ * 1.5, 0.06, lz1 + 0.35), lin('#ffd9a8'), 0.7, 8.0, 'h', (-sx_ * 0.1, 1, -0.06), 12, 30)   # two uplights graze the tower's front
    for px in (lx0 - 0.15, lx1):   # a light line up each front post, on its outer faces (front and side)
        glow_facing(glow, (px + 0.06, 3.1, lz1 + 0.002), (px + 0.09, 3.1, lz1 + 0.002), (px + 0.09, Ht - 0.25, lz1 + 0.002), (px + 0.06, Ht - 0.25, lz1 + 0.002), (0, 0, 1), lin('#ffd9a0'), 1.6)
        if px < lcx: glow_facing(glow, (px - 0.002, 3.1, lz1 - 0.09), (px - 0.002, 3.1, lz1 - 0.06), (px - 0.002, Ht - 0.25, lz1 - 0.06), (px - 0.002, Ht - 0.25, lz1 - 0.09), (-1, 0, 0), lin('#ffd9a0'), 1.6)   # (the east post's side is in the hall's wall)
    # the gallery's end beside the tower: low bronze wings close the gaps between the rails and the tower
    for xa_, xb_ in ((GA['x0'] + 0.03, lx0 - 0.15), (lx1 + 0.15, GA['x1'] - 0.03)): acc.box(xa_, L1, GA['z1'] - 0.12, xb_, L1 + 1.08, GA['z1'], MAT['powder'], BRZ)
    # a marble pier fills the gap between the down escalator and the tower (the lift's call panel is on it)
    px0_, px1_ = E['down']['x1'] + 0.06, lx0 - 0.14   # v11: 1 cm into the tower's post (it stopped 5 mm short: a slit)
    acc.box(px0_, 0.0, lz0 + 0.02, px1_, 2.6, lz1 - 0.02, MAT['neroGold'], lin('#ffffff'))   # 2 cm inside the posts' planes (it is set 1 cm into them)
    acc.box(px0_ - 0.012, 0.0, lz0 + 0.008, px1_, 0.1, lz1 - 0.008, MAT['brass'], P['champagne'])   # its shoe: 12 mm proud of the pier, inside the posts' planes
    # under the escalators' feet, where the trusses hang lower than a head, the space is boxed in (walnut on a brass base, set 2 cm back
    # from the trusses' sides): nobody walks into a truss, and nobody reaches the landing from behind
    zi0_, zi1_ = E['up']['profile']['incline']; zk0, zk1 = zi0_ - 0.6, zi0_ - 0.6 - 2.45 / (L1 - 0.85) * (zi0_ - zi1_)
    ex0, ex1 = S['CORE']['xi0'] - 0.05, E['down']['x1'] - 0.02   # v11: from 5 cm inside the hall's west wall
    acc.prism_x([(zk0, 0.0), (zk1, 0.0), (zk1, 2.2 - 0.03)], ex0, ex1, MAT['fluted'], lin('#5a3a22'))
    acc.box(ex0 - 0.012, 0.0, zk1 - 0.012, ex1 + 0.012, 0.1, zk1, MAT['brass'], P['champagne'])
    lit.line((ex0 + 0.4, 2.3, zk1 - 0.5), (ex1 - 0.4, 2.3, zk1 - 0.5), lin('#ffd6a8'), 0.45, 4.0, 'h', (0, -1, 0.5))
    # v11 ticket zone: the landing inside the escalator and lift hall (core_hall: its walls and its one portal, with the engine's leaves in
    # it, close the landing; the glass screens of v11 are gone)
    G = S['GATE']
    # one brass line in the floor from the ticket leaf along the landing to the lift's door
    acc.box(9.7 - 0.02, -0.002, 2.58, lcx + 0.02, 0.01, 2.62, MAT['brass'], P['champagne']); acc.box(lcx - 0.02, -0.002, lz1 + 0.06, lcx + 0.02, 0.01, 2.58, MAT['brass'], P['champagne'])   # set into the floor, 5 mm over the zone's marble
    # v11 the roof stands on four columns round the fountain court (they replace the half-height light pillars)
    for cx_, cz_ in COLS:   # the north pair stands on the gate line; the east one is the escalator hall's corner pier (core_hall)
        if abs(cx_ - S['CORE']['pier']['x']) < 0.01 and abs(cz_ - S['CORE']['pier']['z']) < 0.01: continue
        lobby12.marble_column(acc, glow, lit, cx_, cz_, 0.0, YF + 0.02)   # v13 P2 (the user's pick; they rejected the v12 onyx): up 2 cm into the field
    # the zone's own floor (research brief: "its own floor inlay"): black-and-gold marble, 3 mm proud, clear of the landing plates and the lift
    for (a, b, c, d) in ((S['CORE']['xi0'] - 0.02, 1.25, S['CORE']['xi1'] + 0.02, S['CORE']['zi1']), (lx0 + 0.5, lz1 + 0.04, lx1 - 0.5, 1.25)):   # to the threshold's edge (under it they fought)
        acc.box(a, 0.0, b, c, 0.005, d, MAT['neroGold'], lin('#ffffff'))   # v11: 5 mm proud (3 mm is under the depth buffer's step across the lobby)
    acc.box(G['podium']['x'] - 0.35, 0.0, G['podium']['z'] - 0.3, G['podium']['x'] + 0.35, 1.12, G['podium']['z'] + 0.3, MAT['fluted'], P['champagne'])
    acc.box(G['podium']['x'] - 0.4, 1.12, G['podium']['z'] - 0.35, G['podium']['x'] + 0.4, 1.16, G['podium']['z'] + 0.35, MAT['nero'], lin('#151517'))
    lit.spot((G['podium']['x'], 3.6, G['podium']['z']), lin('#ffd8a8'), 1.8, 5, 'h', (0, -1, 0), 20, 45)
    # wall washers on the fluted west wall, pendant lights over the lounge
    # v10 (the user: "the lighting is way too hard"): one continuous grazing wash per long wall instead of a row of narrow spots (their
    # scallops were the hardest thing in the room); the same light per metre, spread evenly
    # v9.1 lighting layers (lighting-design: no uniform fill; light where people are and on what they look at): washers grazing the
    # travertine east wall, deep downlights over the waiting areas by the facade, the torcheres' warm pools, the chandelier's glow
    lit.point((-11.6, 2.95, 15.2 + 1.3), lin('#ffcf98'), 0.9, 5, 'h')   # the west group's torchere (v12: the coffers' downlights replace the three hung here)
    lit.point((RCX, DOME_Y - 1.75, RCZ), lin('#ffe1b5'), 3.5, 14, 'h')   # the chandelier's glow (world9.js: it hangs from the dome; inside its curtains, 7.0 to 8.2 m)
    # v11 the service wall (the user: "do all of that cooking for the others too"): the box office and the concessions under one bronze
    # fascia on black marble piers, in the language of the gate's portal: a brass line under it, a light line washing the counters, the
    # signs on its face; three ticket machines on a walnut panel in the gap between the two counters; a brass waiting line in the floor
    fx0, fx1 = bo['x1'] - 0.15, bo['x1'] + 0.15
    for za_, zb_ in ((bo['z0'] - 0.28, bo['z0'] + 0.02),):   # v11: 2 cm into the counters' ends (their tops stopped 2 cm short); v13 the zones' fins took the other three's places
        acc.box(fx0, 0.0, za_, fx1, 3.47, zb_, MAT['neroGold'], lin('#ffffff')); acc.box(fx0 - 0.012, 0.0, za_ - 0.012, fx1 + 0.012, 0.1, zb_ + 0.012, MAT['brass'], P['champagne'])   # v12b: up 2 cm into the zones' canopies (lobby12)
    kz0, kz1 = co['z1'] + 0.28, bo['z0'] - 0.28; kx = bo['x1'] - 0.12   # the ticket machines' wall (2 cm into the piers either side)
    acc.box(kx - 0.1, 0.0, kz0 - 0.02, kx, 2.4, kz1 + 0.02, MAT['fluted'], lin('#5a3a22')); acc.box(kx - 0.09, 0.0, kz0 - 0.01, kx + 0.012, 0.09, kz1 + 0.01, MAT['brass'], P['champagne'])   # 1 cm under the piers' shoes (their tops were one plane)
    kiosks = []
    for i_ in range(3):   # v13 the machines are props (zones12.py ticket_kiosk, world9.js: their backs 1 cm into this panel); their screens are these panels
        zk_ = (kz0 + kz1) / 2 + (i_ - 1) * 0.66
        kiosks.append({'id': 'kiosk_%d' % (i_ + 1), 'x': kx - 0.01 + 0.281, 'y': 1.43, 'z': zk_, 'yaw': math.pi / 2, 'w': 0.44, 'h': 0.66, 'emit': 1})   # zones12.py KIOSK_SCREEN
    lit.line((kx + 0.5, 2.6, kz0 + 0.3), (kx + 0.5, 2.6, kz1 - 0.3), lin('#ffd8a8'), 0.35, 3.0, 'h', (-0.3, -1, 0))
    # v9.1 the poster wall: five lit poster cases on the travertine (brass frame, black backing, a spot over each; the posters are the house
    # films' one-sheets, CC BY, drawn by the engine), and wayfinding (the user: "directional signage"): a header over the escalator gate,
    # restrooms over their door, tickets over the box office, food & drinks over the menu boards, "exit only" over the spine door
    signs = []
    for zc_, fid in ((-9.6, 'cosmos'), (-4.9, 'agent327'), (3.0, 'sintel'), (7.4, 'hero'), (11.8, 'wingit')):
        xf = xe - 0.04; pw, ph, pyc = 1.1, 1.65, 2.05
        acc.box(xf - 0.05, pyc - ph / 2 - 0.06, zc_ - pw / 2 - 0.06, xf, pyc + ph / 2 + 0.06, zc_ + pw / 2 + 0.06, MAT['powder'], lin('#121214'))
        for (ya, yb, za, zb) in ((pyc - ph / 2 - 0.06, pyc - ph / 2 - 0.02, zc_ - pw / 2 - 0.06, zc_ + pw / 2 + 0.06), (pyc + ph / 2 + 0.02, pyc + ph / 2 + 0.06, zc_ - pw / 2 - 0.06, zc_ + pw / 2 + 0.06),
                                 (pyc - ph / 2 - 0.02, pyc + ph / 2 + 0.02, zc_ - pw / 2 - 0.06, zc_ - pw / 2 - 0.02), (pyc - ph / 2 - 0.02, pyc + ph / 2 + 0.02, zc_ + pw / 2 + 0.02, zc_ + pw / 2 + 0.06)):
            acc.box(xf - 0.07, ya, za, xf - 0.05, yb, zb, MAT['brass'], P['champagne'])
        signs.append({'id': 'poster_' + fid, 'x': xf - 0.056, 'y': pyc, 'z': zc_, 'yaw': -math.pi / 2, 'w': pw, 'h': ph, 'emit': 1})
        lit.spot((xf - 0.9, 3.9, zc_), lin('#ffe2bf'), 1.4, 6, 'h', (0.45, -1, 0), 18, 40)
    # v11 the escalator and lift hall (core_hall), with the zone's sign over its portal and the way-out sign inside over the exit leaves;
    # the v10 header beam, its piers and the glass screens are gone (the user's photo: a pier and rails that did not meet)
    core_hall(acc, glow, lit, S, signs, h_up)
    # v11 (the user: "fix the walls"): the whole rear wall under the mezzanine in fluted walnut (it was bare charcoal paint east of the cafe),
    # with a brass base; the spine doors stay as they are (v11: the lift left this wall for the landing behind the gate)
    for xa, xb, ya in ((-8.6, -1.75, 0.0), (1.75, x1 - 0.4, 0.0), (-1.75, 1.75, 3.06)):
        acc.box(xa, ya, z0 + 0.4, xb, L1 - 0.33, z0 + 0.414, MAT['fluted'], lin('#5a3a22'))
        if ya == 0.0: acc.box(xa, 0.0, z0 + 0.414, xb, 0.1, z0 + 0.43, MAT['brass'], P['champagne'])
    lit.line((-8.0, L1 - 0.42, z0 + 0.75), (x1 - 0.8, L1 - 0.42, z0 + 0.75), lin('#ffd6a8'), 0.4, 4.5, 'h', (0, -1, -0.45))
    # v10 cafe (the user: "the cafe and the latte much more defined"): a corner kiosk north of the concessions, under the mezzanine. A walnut
    # back counter and fluted walnut wall with lit shelves of jars, the menu board and the name over it (engine panels); the front counter,
    # espresso machine, cake case and seats are props (world9.js DRESS). The concessions' staff side gets an end so you can't walk behind it.
    cz0, cz1 = -13.5, -9.5
    acc.box(x0, 0.0, cz0, x0 + 1.05, 0.92, cz1, MAT['wood'], lin('#3e2618'))   # 0.65 m deep in front of the wall: the espresso machine stands on it
    acc.box(x0, 0.92, cz0 - 0.03, x0 + 1.1, 0.96, cz1 + 0.03, MAT['calacatta'], lin('#e8e2da'))
    acc.box(x0 + 1.05, 0.08, cz0, x0 + 1.07, 0.12, cz1, MAT['brass'], P['champagne'])
    acc.box(x0 + 0.4, 0.96, cz0 - 0.03, x0 + 0.414, L1 - 0.33, cz1 + 0.03, MAT['fluted'], lin('#5a3a22'))
    lobby12.bar_zone(acc, glow, lit, S, x0, z0, L1, cz0, cz1)   # v12b the bar: a backlit bottle wall, a slatted soffit with pendant shades, an oak floor
    # the cafe's back wall (the lobby's rear wall under the mezzanine) in the same fluted walnut, a brass base, a grazing wash
    acc.box(x0 + 0.4, 0.0, z0 + 0.4, -8.6, L1 - 0.33, z0 + 0.414, MAT['fluted'], lin('#5a3a22'))
    acc.box(x0 + 1.1, 0.0, z0 + 0.414, -8.6, 0.1, z0 + 0.43, MAT['brass'], P['champagne'])
    lit.line((x0 + 1.4, L1 - 0.42, z0 + 0.75), (-9.2, L1 - 0.42, z0 + 0.75), lin('#ffd6a8'), 0.45, 4.5, 'h', (0, -1, -0.45))
    lit.spot((x0 + 1.6, L1 - 0.4, (cz0 + cz1) / 2), lin('#ffd8a8'), 2.2, 6, 'h', (-0.5, -1, 0), 30, 60)
    for zz in (cz0 + 1.0, (cz0 + cz1) / 2, cz1 - 1.0):
        lit.spot((x0 + 2.6, L1 - 0.5, zz), lin('#ffe0b8'), 1.2, 5, 'h', (0, -1, 0), 25, 50)   # v12b: under the bar's slats
    signs.append({'id': 'cafemenu', 'x': -19.4, 'y': 2.55, 'z': z0 + 0.42, 'yaw': 0, 'w': 2.4, 'h': 0.72, 'emit': 1})   # v12b on the rear wall beside the bar (the bottle wall took its place)
    signs.append({'id': 'cafesign', 'x': x0 + 0.42, 'y': 3.88, 'z': (cz0 + cz1) / 2, 'yaw': math.pi / 2, 'w': 2.6, 'h': 0.5, 'emit': 1})
    acc.box(x0 + 0.75, 0.0, co['z0'] - 0.12, co['x1'] - 0.9, 0.95, co['z0'] - 0.05, MAT['lacquer'], mix(P['velvet'], P['charcoal'], 0.4))
    acc.box(x0 + 0.75, 0.95, co['z0'] - 0.14, co['x1'] - 0.9, 0.99, co['z0'] - 0.05, MAT['calacatta'], lin('#e8e2da'))
    acc.box(xe - 0.075, 2.84, -2.25, xe - 0.04, 3.3, 0.25, MAT['powder'], lin('#16171a'))
    signs.append({'id': 'wayfind_wc', 'x': xe - 0.081, 'y': 3.07, 'z': -1.0, 'yaw': -math.pi / 2, 'w': 2.4, 'h': 0.42, 'emit': 1})
    signs += sign_tickets + [sign_food]   # v12b on the zones' canopies (lobby12)
    # v13 (the user, 11-20: "make the reception and the areas separated and much more defined"): Nero Marquina fins with lit brass noses
    # between the zones, out 1.4 m past the counters: the ticket bay (the desk and the kiosks) from the front fin to the popcorn's, the
    # popcorn bay to the bar's fin under the mezzanine (up into its slab); a lit marquee sign on the wall over the popcorn, a header with
    # the bar's name on its slatted ceiling's front
    xwf, xff = x0 + 0.4, -15.2
    lobby12.zone_fin(acc, glow, lit, xwf, xff, bo['z1'] - 0.02, bo['z1'] + 0.5, H + 0.02, YF - 0.4)
    lobby12.zone_fin(acc, glow, lit, xwf, xff, co['z1'] - 0.24, co['z1'] + 0.28, H + 0.02, YF - 0.4)   # 2 cm into the kiosks' walnut panel
    lobby12.zone_fin(acc, glow, lit, xwf, xff, co['z0'] - 0.5, co['z0'] + 0.02, L1 - 0.30, L1 - 0.72)   # under the mezzanine: 2 cm up into its slab
    # the popcorn's sign stands on its canopy's front edge (on the wall behind, the 5.7 m deep canopy hid it from the whole lobby): the
    # board 1.5 cm down into the canopy and 6 mm into its top brass band, its north end 2 cm into the fin, its south end 4.5 cm clear of
    # the mezzanine's fascia behind a brass stile; a brass rail on top (both 15 mm proud of its face, 2 mm into the board)
    xc, yb0, yb1, zs, zn = -15.9, 3.885, 5.10, MZ['z1'] + 0.15, co['z1'] - 0.22
    acc.box(xc - 0.08, yb0, zs, xc - 0.02, yb1, zn, MAT['lacquer'], lin('#0b0b0c'))
    acc.box(xc - 0.085, yb1 - 0.002, zs - 0.027, xc - 0.005, yb1 + 0.023, zn, MAT['brass'], lobby12.BRASS)
    acc.box(xc - 0.085, yb0, zs - 0.027, xc - 0.005, yb1 - 0.002, zs + 0.002, MAT['brass'], lobby12.BRASS)
    signs.append({'id': 'zone_popcorn', 'x': xc - 0.02 + 0.006, 'y': (3.92 + yb1) / 2 + 0.01, 'z': (zs + zn - 0.02) / 2, 'yaw': math.pi / 2, 'w': round(zn - 0.02 - zs - 0.2, 3), 'h': round(yb1 - 3.92 - 0.1, 3), 'emit': 1})
    acc.box(-18.24, L1 - 0.86, z0 + 0.38, -18.18, L1 - 0.30, co['z0'] - 0.48, MAT['wood'], lin('#3a2416'))   # the bar's header: the slats end in it, 2 cm into the fin
    acc.box(-18.18, L1 - 0.86, z0 + 0.38, -18.168, L1 - 0.82, co['z0'] - 0.48, MAT['brass'], lobby12.BRASS)   # its brass nosing, 12 mm proud
    signs.append({'id': 'zone_bar', 'x': -18.18 + 0.006, 'y': L1 - 0.56, 'z': (z0 + 0.4 + co['z0'] - 0.5) / 2, 'yaw': math.pi / 2, 'w': 3.4, 'h': 0.40, 'emit': 1})
    signs += kiosks
    signs.append({'id': 'noentry_spine', 'x': 0.0, 'y': 3.36, 'z': z0 + 0.436, 'yaw': 0, 'w': 2.0, 'h': 0.34, 'emit': 1})
    # v13 the general floor light away from the halo: black-baffle apertures in the field with no glow, where people stand and walk (the
    # counters' aisle, the doors, the east side, behind the court, the upper floor), clear of the halo (1.6 m past its opening), the columns,
    # the escalator hall (its own light lines) and the lounge's pendant cloud; the walls' washers in the field's shadow gap
    AP = [(-13.2, z) for z in (-7.0, -3.4, 0.2, 3.8, 7.4, 11.0, 14.6)] + [(x, 16.2) for x in (-19.8, -15.6, -11.4, 11.4, 15.6, 19.8)] + [(-4.6, 16.3), (4.6, 16.3)]
    AP += [(11.2, 6.4), (15.3, 6.0), (19.4, 6.4), (11.0, 15.0), (19.6, 11.0)] + [(x, -1.4) for x in (-9.0, -3.0, 3.0)] + [(x, -5.0) for x in (-6.0, 0.0, 6.0)]
    AP += [(x, -10.6) for x in (-18.4, -13.2, -8.0, -2.8, 2.4, 11.0, 16.4, 20.4)]
    for (ax, az) in AP:
        if math.hypot(ax - RCX, az - RCZ) < R1 + 1.6 or any(math.hypot(ax - cx_, az - cz_) < 1.3 for cx_, cz_ in COLS) or math.hypot(ax - LCX, az - LCZ) < 2.2:
            raise SystemExit(f'a ceiling aperture at ({ax}, {az}) is too close to the halo, a column or the pendant cloud')
        if CH_[0] - 0.3 < ax < CH_[2] + 0.3 and CH_[1] - 0.3 < az < CH_[3] + 0.3: raise SystemExit(f'a ceiling aperture at ({ax}, {az}) is over the escalator hall')
        if not (FX[0] + 0.3 < ax < FX[2] - 0.3 and FX[1] + 0.3 < az < FX[3] - 0.3): raise SystemExit(f'a ceiling aperture at ({ax}, {az}) is off the field')
    lobby12.apertures(acc, lit, YF, AP)
    xg0, xg1 = (x0 + 0.4 + FX[0]) / 2, (x1 - 0.4 + FX[2]) / 2   # the shadow gaps' middles over the long walls
    lit.line((xg0, YF + 0.04, -12.5), (xg0, YF + 0.04, 17.0), lin('#ffd6a8'), 0.85, 10, 'h', (-0.45, -1, 0))   # v10 washers, in the gap
    lit.line((xg1, YF + 0.04, -12.0), (xg1, YF + 0.04, -2.6), lin('#ffdcb4'), 0.75, 10, 'h', (0.45, -1, 0))
    lit.line((xg1, YF + 0.04, 0.6), (xg1, YF + 0.04, 17.0), lin('#ffdcb4'), 0.75, 10, 'h', (0.45, -1, 0))
    lobby12.mezz_fascia(acc, glow, lit, S, x0 + 0.38, S['CORE']['x0'] + 0.02)
    # v13 a light over the dropped field lights nothing under it: refuse one outside the halo, the escalator hall and the shadow gaps
    for i_ in range(len(lit.L) // 14):
        lx_, ly_, lz_ = lit.L[14 * i_:14 * i_ + 3]
        if ly_ <= YF - 0.01 or math.hypot(lx_ - RCX, lz_ - RCZ) < R1 + 0.45: continue
        if CO_['x0'] - 0.1 < lx_ < CO_['x1'] + 0.1 and CO_['zWest'] - 0.1 < lz_ < CO_['z1'] + 0.1: continue
        if not (FX[0] < lx_ < FX[2] and FX[1] < lz_ < FX[3]): continue   # in a shadow gap
        raise SystemExit(f'a lobby light at ({lx_:.2f}, {ly_:.2f}, {lz_:.2f}) is over the dropped field: move it under it')
    extra = {'panels': signs + [{'id': 'ledwall', 'x': 0, 'y': 6.0, 'z': z0 + 0.43, 'yaw': 0, 'w': 14.2, 'h': 4.5, 'emit': 1},
                        {'id': 'showtimes', 'x': x0 + 0.21, 'y': 5.2, 'z': 9.6, 'yaw': math.pi / 2, 'w': 7.0, 'h': 1.05, 'emit': 1},   # v12b over the ticket canopy (the onyx backdrop under it)
                        {'id': 'menu', 'x': x0 + 0.21, 'y': 2.7, 'z': (co['z0'] + co['z1']) / 2, 'yaw': math.pi / 2, 'w': co['z1'] - co['z0'] - 0.6, 'h': 1.3, 'emit': 1}],   # v12b under the popcorn canopy
             'bulbs': bulbs}   # v12b the popcorn marquee's bulbs (lobby12.popcorn_zone): the engine runs them as a chaser
    return acc, glow, lit, extra

# ------------------------------------------------------------------------------------------------ corridor (L1): the long, dim way in
def corridor_signs(acc, glow, lit, panels, hid, xf, side, zn, zs, L1):
    """v13 (the user's dark-corridor photo): beside a hall's portal (xf: the clad's base plane, side: towards the corridor) a blade roundel
    with the hall's number (a brass disc and a black face disc 5 mm proud of it each side, on a brass arm 2 cm into the clad; its numbers
    are engine panels 'roundel_<hall>_a/b', world9.js) over the pier at zn, and at zs a seat-plan board (a black backing 1 cm into the
    clad's flutes, a brass frame 6 mm proud of the picture: the hall's real seat map, panel 'seatplan_<hall>') under a brass picture
    light on an arm. Everything over 2.2 m is above heads; the board stands 4.6 cm proud"""
    xc, yc, R = xf + side * 0.45, L1 + 2.45, 0.24
    disc = [(xc + R * math.cos(2 * math.pi * k / 48), yc + R * math.sin(2 * math.pi * k / 48)) for k in range(48)]
    face = [(xc + (R - 0.015) * math.cos(2 * math.pi * k / 48), yc + (R - 0.015) * math.sin(2 * math.pi * k / 48)) for k in range(48)]
    acc.prism_z(disc, zn - 0.015, zn + 0.015, MAT['brass'], lin('#b8893c'))
    acc.prism_z(face, zn - 0.02, zn + 0.02, MAT['lacquer'], lin('#0b0b0c'))
    acc.box(min(xf - side * 0.005, xc - side * (R - 0.02)), yc - 0.02, zn - 0.01, max(xf - side * 0.005, xc - side * (R - 0.02)), yc + 0.02, zn + 0.01, MAT['brass'], lin('#b8893c'))
    for sgn, tag in ((1, 'a'), (-1, 'b')):
        panels.append({'id': f'roundel_{hid}_{tag}', 'x': xc, 'y': yc, 'z': zn + sgn * 0.0255, 'yaw': 0.0 if sgn > 0 else math.pi, 'w': 0.30, 'h': 0.30, 'emit': 1})
    yb0, yb1, hw = L1 + 0.97, L1 + 2.13, 0.42   # the board
    acc.box(min(xf + side * 0.005, xf + side * 0.040), yb0, zs - hw, max(xf + side * 0.005, xf + side * 0.040), yb1, zs + hw, MAT['powder'], lin('#101012'))
    for (ya, yb, za, zb) in ((yb0 - 0.025, yb0, zs - hw - 0.025, zs + hw + 0.025), (yb1, yb1 + 0.025, zs - hw - 0.025, zs + hw + 0.025), (yb0, yb1, zs - hw - 0.025, zs - hw), (yb0, yb1, zs + hw, zs + hw + 0.025)):
        acc.box(min(xf + side * 0.005, xf + side * 0.052), ya, za, max(xf + side * 0.005, xf + side * 0.052), yb, zb, MAT['brass'], lin('#b8893c'))   # rails over stiles; back 1 cm into the flutes like the board (2 cm off them was a gap)
    panels.append({'id': 'seatplan_' + hid, 'x': xf + side * 0.046, 'y': (yb0 + yb1) / 2, 'z': zs, 'yaw': math.pi / 2 if side > 0 else -math.pi / 2, 'w': 2 * hw - 0.02, 'h': yb1 - yb0 - 0.02, 'emit': 0.85})
    yl = yb1 + 0.17   # the picture light: an arm 2 cm into the clad, a brass bar lamp, its light on the board
    acc.box(min(xf - side * 0.005, xf + side * 0.21), yl - 0.012, zs - 0.012, max(xf - side * 0.005, xf + side * 0.21), yl + 0.012, zs + 0.012, MAT['brass'], lin('#b8893c'))
    acc.box(min(xf + side * 0.17, xf + side * 0.23), yl - 0.035, zs - 0.30, max(xf + side * 0.17, xf + side * 0.23), yl + 0.005, zs + 0.30, MAT['brass'], lin('#b8893c'))
    glow_facing(glow, (xf + side * 0.18, yl - 0.04, zs - 0.28), (xf + side * 0.22, yl - 0.04, zs - 0.28), (xf + side * 0.22, yl - 0.04, zs + 0.28), (xf + side * 0.18, yl - 0.04, zs + 0.28), (0, -1, 0), lin('#ffe6c4'), 2.4)
    lit.spot((xf + side * 0.2, yl - 0.06, zs), lin('#ffe9cc'), 0.7, 2.6, 'f', (-side * 0.45, -1.0, 0.0), 30, 62)


def build_corridor(S):
    L1 = S['L1']; BR, FW, LW, FE, LE, PT = S['BRIDGE'], S['FLANK_W'], S['LINK_W'], S['FLANK_E'], S['LINK_E'], S['PANTRY']
    C = {k: lin(v) for k, v in S['PALETTE']['corridor'].items()}; H = 4.2; top = L1 + H; FT = 0.14   # floor thickness (see the spine)
    acc, glow = Acc(), Glow(); lit = Lights([BR['x0'], LW['z0'], BR['x1'], BR['z1']], top); rnd = random.Random(5)
    floors = [(BR['x0'], BR['z0'], BR['x1'], BR['z1']), (FW['x0'], FW['z0'], FW['x1'], FW['z1']), (LW['x0'], LW['z0'], LW['x1'], LW['z1']),
              (FE['x0'], FE['z0'], FE['x1'], FE['z1']), (LE['x0'], LE['z0'], LE['x1'], LE['z1']), (PT['x0'], PT['z0'], PT['x1'], PT['z1'])]
    for (a, b, c, d) in floors:
        slab(acc, a, b, c, d, L1, FT, MAT['paint'], C['black'], top=MAT['nero'], topcol=lin('#ffffff'))   # v9.3 (the user's corridor photo): polished black stone that mirrors the red light
        slab(acc, a, b, c, d, top + 0.3, 0.3, MAT['paint'], C['black'])
    # walls: (a, b, face) with face = which side the corridor is on (left normal of a->b if +1); diamonds on the long walls
    W_ = []
    # v11 (the user: "if you are making corridors, make them actually curved"): the long walls are ribbon walls. A fluted walnut lining
    # stands in front of the straight wall and swells and falls back along it (RIB_LAM m from crest to crest, flat on each crest, where a
    # poster lightbox hangs, and flat in each trough, where a bench or a palm stands); the outer corners are rounded (RF m). rib = (how far
    # it swells, [(from, to, flat at the start, flat at the end), ...]) in metres along the wall; keep = stretches left clear of posters.
    RF, RIB_D0, RIB_LAM = 2.4, 0.03, 9.0
    def sst(v): v = max(0.0, min(1.0, v)); return v * v * (3 - 2 * v)
    def wall(a, b, face, openings=(), diamonds=True, t=0.3, rib=None, keep=()):
        """a wall on the corridor's side of the line a->b (face +1: the corridor is to the left of a->b); its inner face is t inside"""
        acc.wall(a, b, L1 - FT, top + 0.3, t, MAT['paint'], C['black'], openings=openings, side=face)
        L = math.hypot(b[0] - a[0], b[1] - a[1]); nx, nz = -(b[1] - a[1]) / L * face, (b[0] - a[0]) / L * face
        W_.append(((a[0] + nx * t, a[1] + nz * t), (b[0] + nx * t, b[1] + nz * t), face, diamonds, openings, rib, tuple(keep)))
    def depth_of(rib, L):
        """how far the lining stands in front of the wall's face at s metres along it (0 where there is none)"""
        runs = [(s0, L if s1 is None else s1, t0, t1) for (s0, s1, t0, t1) in rib[1]] if rib else []
        def dep(sv):
            for (s0, s1, t0, t1) in runs:
                if s0 - 1e-6 <= sv <= s1 + 1e-6:
                    w = sst((sv - s0 - t0) / 1.8) * sst((s1 - t1 - sv) / 1.8); g = (1 - math.cos(2 * math.pi * sv / RIB_LAM)) / 2
                    return RIB_D0 + rib[0] * w * sst(1.3 * g)
            return 0.0
        dep.runs = runs; dep.A = rib[0] if rib else 0.0
        return dep
    halls = {h['id']: h for h in S['halls']}
    doors = {d['hall']: d for d in S['DOORS'] if d.get('hall') and d['id'].endswith('In')}
    def dop(a, b, hid):   # the hall door as an opening along a->b
        d = doors[hid]; s0 = math.hypot(d['x'] - a[0], d['z'] - a[1]); return [(s0 - 1.0, s0 + 1.0, L1 + 2.55, L1 - FT)]
    # bridge: north side (corridor to +z), the pantry niche, south side with the portal to the mezzanine (corridor to -z)
    po0, po1 = BR['x1'] - 10.2 - 2.8, BR['x1'] - 10.2 + 2.8   # the portal to the mezzanine, along the north wall
    wall((FW['x1'], BR['z0']), (PT['x0'], BR['z0']), 1, rib=(0.9, [(0.0, None, 0.3, 0.3)]))
    wall((PT['x1'], BR['z0']), (FE['x0'], BR['z0']), 1, rib=(0.9, [(10.2, None, 0.3, 0.3)]), keep=[(3.0, 10.2)])   # the arrival video wall faces the portal
    wall((BR['x1'], BR['z1']), (BR['x0'], BR['z1']), 1, openings=[(po0, po1, L1 + 3.4, L1 - FT)], rib=(0.9, [(0.0, po0 - 0.35, RF + 0.4, 0.3), (po1 + 0.35, None, 0.3, RF + 0.4)]))
    wall((PT['x0'], BR['z0']), (PT['x0'], PT['z0']), 1, diamonds=False); wall((PT['x0'], PT['z0']), (PT['x1'], PT['z0']), 1, diamonds=False); wall((PT['x1'], PT['z0']), (PT['x1'], BR['z0']), 1, diamonds=False)
    # west: outer wall, MAX rear wall lining (with the MAX door), the wall between the halls, CURVE rear lining (with its door)
    wall((BR['x0'], BR['z1']), (BR['x0'], LW['z0']), 1, rib=(0.6, [(0.0, None, RF + 0.4, RF + 0.4)]))
    wall((BR['x0'], LW['z0']), (LW['x1'], LW['z0']), 1)
    wall((FW['x1'], BR['z0']), (FW['x1'], FW['z0']), -1, openings=dop((FW['x1'], BR['z0']), (FW['x1'], FW['z0']), 'MAX'))
    wall((FW['x1'], LW['z1']), (LW['x1'], LW['z1']), -1)
    wall((LW['x1'], LW['z1']), (LW['x1'], LW['z0']), -1, openings=dop((LW['x1'], LW['z1']), (LW['x1'], LW['z0']), 'CURVE'))
    # east: outer wall, CLASSIC rear lining (door), the stub to the 270 door
    wall((BR['x1'], BR['z1']), (BR['x1'], FE['z0']), -1, rib=(0.6, [(0.0, None, RF + 0.4, RF + 0.4)]))
    wall((BR['x1'], FE['z0']), (FE['x0'], FE['z0']), -1)
    wall((FE['x0'], FE['z0']), (FE['x0'], LE['z0']), -1, diamonds=False)
    wall((FE['x0'], LE['z1']), (FE['x0'], BR['z0']), -1, openings=dop((FE['x0'], LE['z1']), (FE['x0'], BR['z0']), 'CLASSIC'))
    wall((FE['x0'], LE['z0']), (LE['x0'], LE['z0']), -1, diamonds=False); wall((LE['x0'], LE['z1']), (FE['x0'], LE['z1']), -1, diamonds=False)
    wall((LE['x0'], LE['z0']), (LE['x0'], LE['z1']), -1, diamonds=False, openings=dop((LE['x0'], LE['z0']), (LE['x0'], LE['z1']), 'X270'))
    # v9.1: a "coming soon" gallery: lit poster cases on the long walls, one every 9 m clear of the doors (the user: "empty", "posters")
    films = ['wingit', 'agent327', 'llamigos', 'glasshalf', 'coffeerun', 'hero', 'sintel', 'cosmos', 'bunny']; nposter = [0]; cpanels = []
    def posters_on(a, b, face, ops, L, dep=None, keep=()):
        ux, uz = (b[0] - a[0]) / L, (b[1] - a[1]) / L; nx, nz = -uz * face, ux * face; out = []; sp = 4.5
        while sp < L - 3.0:
            # v11 (the user: "photos half cropped"): a hall entrance is a block 3 m to each side of its door; a lightbox (0.71 m to its halo's
            # edge) hung 3.2 m from the door stood half inside it. 4.5 m keeps it clear of the block and of the bin beside it
            if all(abs(sp - (o[0] + o[1]) / 2) > max(4.5, (o[1] - o[0]) / 2 + 1.3) for o in ops) and all(not (k0 - 1.0 < sp < k1 + 1.0) for k0, k1 in keep):
                dd = dep(sp) if dep else 0.0   # on a ribbon wall the lightbox hangs on the lining's crest
                cx, cz = a[0] + ux * sp + nx * dd, a[1] + uz * sp + nz * dd; pw, ph, pyc = 1.1, 1.65, L1 + 1.75
                q = [(cx - ux * (pw / 2 + 0.08), cz - uz * (pw / 2 + 0.08)), (cx + ux * (pw / 2 + 0.08), cz + uz * (pw / 2 + 0.08))]
                acc.prism([q[0], q[1], (q[1][0] + nx * 0.05, q[1][1] + nz * 0.05), (q[0][0] + nx * 0.05, q[0][1] + nz * 0.05)], pyc - ph / 2 - 0.08, pyc + ph / 2 + 0.08, MAT['powder'], C['charcoal'])
                # v9.3: a red halo round the lightbox (LED tape on the case's back edge washing the black wall), as in the user's photo
                for (s0_, s1_, ya_, yb_) in ((-pw / 2 - 0.16, pw / 2 + 0.16, pyc + ph / 2 + 0.1, pyc + ph / 2 + 0.16), (-pw / 2 - 0.16, pw / 2 + 0.16, pyc - ph / 2 - 0.16, pyc - ph / 2 - 0.1),
                                            (-pw / 2 - 0.16, -pw / 2 - 0.1, pyc - ph / 2 - 0.1, pyc + ph / 2 + 0.1), (pw / 2 + 0.1, pw / 2 + 0.16, pyc - ph / 2 - 0.1, pyc + ph / 2 + 0.1)):
                    pa_, pb_ = (cx + ux * s0_ + nx * 0.01, cz + uz * s0_ + nz * 0.01), (cx + ux * s1_ + nx * 0.01, cz + uz * s1_ + nz * 0.01)
                    glow_facing(glow, (pa_[0], ya_, pa_[1]), (pb_[0], ya_, pb_[1]), (pb_[0], yb_, pb_[1]), (pa_[0], yb_, pa_[1]), (nx, 0, nz), C['red'], 0.9)
                lit.area((cx + nx * 0.12, pyc, cz + nz * 0.12), (ux * (pw / 2 + 0.2), 0, uz * (pw / 2 + 0.2)), (0, ph / 2 + 0.2, 0), (-nx, 0, -nz), C['red'], 1.2, 2.2, 'f', 2, 2)
                fid = films[nposter[0] % len(films)]; nposter[0] += 1
                cpanels.append({'id': f'poster_{fid}_c{nposter[0]}', 'x': cx + nx * 0.056, 'y': pyc, 'z': cz + nz * 0.056, 'yaw': math.atan2(nx, nz), 'w': pw, 'h': ph, 'emit': 1})
                lit.spot((cx + nx * 0.9, top - 0.3, cz + nz * 0.9), lin('#fff1e0'), 0.7, 5.5, 'h', (-nx * 0.45, -1, -nz * 0.45), 18, 40)
                out.append((sp - 0.95, sp + 0.95)); sp += 9.0
            else: sp += 9.0 if (dep and dep.runs) else 0.5   # a ribbon wall's posters stay on its crests
        return out
    MATF, COLF = MAT['fluted'], lin('#4b2f1d')
    def facing(A3, B3, C3, D3, want, nA=None, nB=None):
        """a lining quad A-B along the floor, C-D above them, wound to face `want`; nA, nB: smooth normals at A/D and B/C"""
        fn = cross(sub(B3, A3), sub(C3, A3))
        if fn[0] * want[0] + fn[1] * want[1] + fn[2] * want[2] >= 0: acc.tri(A3, B3, C3, MATF, COLF, nA, nB, nB); acc.tri(A3, C3, D3, MATF, COLF, nA, nB, nA)
        else: acc.tri(A3, C3, B3, MATF, COLF, nA, nB, nB); acc.tri(A3, D3, C3, MATF, COLF, nA, nA, nB)
    def lines_on(pts, nrm):
        """the red line at the floor and the warm cove line under the ceiling, along a lining"""
        for i in range(len(pts) - 1):
            (p, q), (m, n_) = (pts[i], pts[i + 1]), (nrm[i], nrm[i + 1]); mid = ((m[0] + n_[0]) / 2, 0.0, (m[2] + n_[2]) / 2); e = 0.012
            pa, pb = (p[0] + m[0] * e, p[1] + m[2] * e), (q[0] + n_[0] * e, q[1] + n_[2] * e)
            glow_facing(glow, (pa[0], L1 + 0.05, pa[1]), (pb[0], L1 + 0.05, pb[1]), (pb[0], L1 + 0.08, pb[1]), (pa[0], L1 + 0.08, pa[1]), mid, C['red'], 2.08)
            glow_facing(glow, (pa[0], top - 0.2, pa[1]), (pb[0], top - 0.2, pb[1]), (pb[0], top - 0.155, pb[1]), (pa[0], top - 0.155, pa[1]), mid, lin('#ffd9a8'), 1.7)
    def ribbon(a, b, face, dep, L):
        ux, uz = (b[0] - a[0]) / L, (b[1] - a[1]) / L; nx, nz = -uz * face, ux * face
        for (s0, s1, t0, t1) in dep.runs:
            n = max(2, int(math.ceil((s1 - s0) / 0.3))); ss_ = [s0 + (s1 - s0) * i / n for i in range(n + 1)]
            pts = [(a[0] + ux * sv + nx * dep(sv), a[1] + uz * sv + nz * dep(sv)) for sv in ss_]; nrm = []
            for i in range(n + 1):
                p, q = pts[max(0, i - 1)], pts[min(n, i + 1)]; tx, tz = q[0] - p[0], q[1] - p[1]; tl = math.hypot(tx, tz) or 1.0; m = (-tz / tl, tx / tl)
                if m[0] * nx + m[1] * nz < 0: m = (-m[0], -m[1])
                nrm.append((m[0], 0.0, m[1]))
            for i in range(n):
                p, q = pts[i], pts[i + 1]
                facing((p[0], L1, p[1]), (q[0], L1, q[1]), (q[0], top, q[1]), (p[0], top, p[1]), (nx, 0.0, nz), nrm[i], nrm[i + 1])
            lines_on(pts, nrm)
            for pt, sv, sg in ((pts[0], s0, -1), (pts[-1], s1, 1)):   # the lining's edge, back to the wall
                w0 = (a[0] + ux * sv, a[1] + uz * sv); want = (ux * sg, 0.0, uz * sg)
                facing((w0[0], L1, w0[1]), (pt[0], L1, pt[1]), (pt[0], top, pt[1]), (w0[0], top, w0[1]), want, want, want)
            # red light washing the floor at the lining's foot: chords from trough to crest, a hand's width in front of it
            k0, k1 = int(math.floor(s0 / (RIB_LAM / 2))), int(math.ceil(s1 / (RIB_LAM / 2)))
            for k in range(k0, k1):
                sa_, sb_ = max(s0, k * RIB_LAM / 2), min(s1, (k + 1) * RIB_LAM / 2)
                if sb_ - sa_ < 0.5: continue
                da, db = dep(sa_) + 0.25, dep(sb_) + 0.25
                lit.line((a[0] + ux * sa_ + nx * da, L1 + 0.1, a[1] + uz * sa_ + nz * da), (a[0] + ux * sb_ + nx * db, L1 + 0.1, a[1] + uz * sb_ + nz * db), C['red'], 0.42, 2.6, 'f', (nx * 0.6, 0.35, nz * 0.6))
    def fillet(cx_, cz_, a0, R_):
        """a rounded corner: a quarter cylinder of lining from angle a0 (degrees) about (cx_, cz_), facing the centre"""
        n = 12; pts = [(cx_ + R_ * math.cos(math.radians(a0 + 90.0 * i / n)), cz_ + R_ * math.sin(math.radians(a0 + 90.0 * i / n))) for i in range(n + 1)]
        nrm = [(-(p[0] - cx_) / R_, 0.0, -(p[1] - cz_) / R_) for p in pts]
        for i in range(n):
            p, q = pts[i], pts[i + 1]; mid = ((nrm[i][0] + nrm[i + 1][0]) / 2, 0.0, (nrm[i][2] + nrm[i + 1][2]) / 2)
            facing((p[0], L1, p[1]), (q[0], L1, q[1]), (q[0], top, q[1]), (p[0], top, p[1]), mid, nrm[i], nrm[i + 1])
        lines_on(pts, nrm)
    # diamond relief on every long wall (indigo lacquer), a gold light line at 0.3 m (floor wash) and at 2.6 m
    for a, b, face, dia, ops, rib, keep in W_:
        L = math.hypot(b[0] - a[0], b[1] - a[1])
        if L < 2.5: continue
        ux, uz = (b[0] - a[0]) / L, (b[1] - a[1]) / L; nx, nz = -uz * face, ux * face
        sa, sb = a, b
        dep = depth_of(rib, L)
        if dep.runs: ribbon(a, b, face, dep, L)
        # v9.3 (the user's corridor photo): plain black walls carry the lightboxes; the hall entrances carry the texture (portals below)
        pcuts = posters_on(a, b, face, ops, L, dep, keep) if (dia and L > 9.0) else []
        for yy, k in ((L1 + 0.05, 1.6),):
            spans, cur = [], 0.0
            for o in sorted([(o_[0], o_[1]) for o_ in ops] + [(r_[0], r_[1]) for r_ in dep.runs]): spans.append((cur, o[0] - 0.05)); cur = max(cur, o[1] + 0.05)   # a lining carries its own line
            spans.append((cur, L))
            for s0_, s1_ in spans:
                if s1_ - s0_ < 0.05: continue
                p0, p1 = (a[0] + ux * s0_ + nx * 0.012, a[1] + uz * s0_ + nz * 0.012), (a[0] + ux * s1_ + nx * 0.012, a[1] + uz * s1_ + nz * 0.012)
                glow_facing(glow, (p0[0], yy, p0[1]), (p1[0], yy, p1[1]), (p1[0], yy + 0.03, p1[1]), (p0[0], yy + 0.03, p0[1]), (nx, 0, nz), C['red'], k * 1.3)
        if not dep.runs:
            lit.line((sa[0] + nx * 0.12, L1 + 0.1, sa[1] + nz * 0.12), (sb[0] + nx * 0.12, L1 + 0.1, sb[1] + nz * 0.12), C['red'], 0.42, 2.6, 'f', (nx * 0.6, 0.35, nz * 0.6))
            lit.line((sa[0] + nx * 0.35, top - 0.45, sa[1] + nz * 0.35), (sb[0] + nx * 0.35, top - 0.45, sb[1] + nz * 0.35), lin('#ffe9e4'), 0.12, 4.5, 'h', (-nx * 0.35, -1, -nz * 0.35))
        else:   # a warm wash down the walnut from the cove, in front of the deepest crest
            o_ = dep.A + 0.4
            lit.line((sa[0] + nx * o_, top - 0.4, sa[1] + nz * o_), (sb[0] + nx * o_, top - 0.4, sb[1] + nz * o_), lin('#ffd2a0'), 0.34, 5.0, 'h', (-nx * 0.55, -1, -nz * 0.55))
    # ceiling (v9.3, the user's corridor photo): a dark coffer grid, and a square ring of white light every 6 m along each corridor leg
    legs = [((BR['x0'] + 3, (BR['z0'] + BR['z1']) / 2), (BR['x1'] - 3, (BR['z0'] + BR['z1']) / 2)), (((FW['x0'] + FW['x1']) / 2, BR['z0']), ((FW['x0'] + FW['x1']) / 2, LW['z1'])),
            (((FE['x0'] + FE['x1']) / 2, BR['z0']), ((FE['x0'] + FE['x1']) / 2, FE['z0'] + 1.0)), ((BR['x0'] + 3, (LW['z0'] + LW['z1']) / 2), (LW['x1'] - 1.0, (LW['z0'] + LW['z1']) / 2))]
    for (x0_, z0_, x1_, z1_) in floors[:5]:   # coffer ribs, 1.2 m apart both ways, 8 cm deep, under the ceiling slab
        xs_ = [x0_ + 0.6 + 1.2 * i for i in range(int((x1_ - x0_ - 0.6) / 1.2) + 1)]; zs_ = [z0_ + 0.6 + 1.2 * i for i in range(int((z1_ - z0_ - 0.6) / 1.2) + 1)]
        for xx in xs_: acc.box(xx - 0.025, top - 0.08, z0_ + 0.29, xx + 0.025, top + 0.01, z1_ - 0.29, MAT['paint'], C['charcoal'])
        for zz in zs_: acc.box(x0_ + 0.29, top - 0.086, zz - 0.025, x1_ - 0.29, top + 0.02, zz + 0.025, MAT['paint'], C['charcoal'])   # 6 mm deeper: crossings never share a face; v11: both set into the slab and 1 cm into the walls (they hung 2 mm under it, 1 cm short of them)
    for a, b in legs:
        L = math.hypot(b[0] - a[0], b[1] - a[1]); ux, uz = (b[0] - a[0]) / L, (b[1] - a[1]) / L; nx, nz = -uz, ux
        n = max(1, int(L / 6.0))
        for i in range(n + 1):
            t = (i + 0.5) * L / (n + 1); cx, cz = a[0] + ux * t, a[1] + uz * t
            for half, w_ in ((1.1, 0.07), (0.62, 0.05)):   # two nested squares, a black frame round the outer one
                for (sa_, sb_, oa, ob) in ((-half, half, half - w_, half), (-half, half, -half, -half + w_), (-half, -half + w_, -half + w_, half - w_), (half - w_, half, -half + w_, half - w_)):
                    P_ = lambda s_, o_: (cx + ux * s_ + nx * o_, top - 0.1, cz + uz * s_ + nz * o_)
                    glow_facing(glow, P_(sa_, oa), P_(sb_, oa), P_(sb_, ob), P_(sa_, ob), (0, -1, 0), C['white'], 2.2 if half > 1 else 1.6)
            acc.box(min(cx - 1.18, cx + 1.18), top - 0.1, min(cz - 1.18, cz + 1.18), max(cx - 1.18, cx + 1.18), top - 0.08, max(cz - 1.18, cz + 1.18), MAT['paint'], C['charcoal'])
            lit.point((cx, top - 0.4, cz), lin('#f2f4ff'), 0.85, 5.5, 'h')
    lit.ambient(lin('#5a4034'), lin('#16100d'), 0.022, 'h')   # v10: a warmer, lighter fill (the user: "too hard"); the red stays in the lines
    # hall entrances (v9.3, the user's photo of a ScreenX entrance): each door sits at the back of a recessed portal 2.6 m wide, cut into
    # a block clad in bronze diamond panels; a downlight in the portal's soffit; the hall's name in face-lit letters over the portal and
    # its number beside it (engine props, world9.js dressRooms) with a soft light behind both; a showtime header inside, over the doors
    panels = []
    # v10 (the user: "the diamond one looks shit as fuck, just remove and change it"): fluted walnut panels with a brass edge, after the
    # timber portals of INOX JTM and PVR INOX Gurugram (docs/V10-RESEARCH.md); a 14 mm slab, so every face is a box's own
    def clad(p0, p1, y0, y1, face, edges=True):   # p0 -> p1 along an axis (2D), the panel 14 mm proud on the side +face of p0->p1
        L = math.hypot(p1[0] - p0[0], p1[1] - p0[1])
        if L <= 0.6 or y1 - y0 <= 0.5: return
        ux, uz = (p1[0] - p0[0]) / L, (p1[1] - p0[1]) / L; nx, nz = -uz * face, ux * face
        def slab(a, b, ya, yb, t, mat, col):
            xs = [a[0], b[0], a[0] + nx * t, b[0] + nx * t]; zs = [a[1], b[1], a[1] + nz * t, b[1] + nz * t]
            acc.box(min(xs), ya, min(zs), max(xs), yb, max(zs), mat, col)
        slab(p0, p1, y0, y1, 0.014, MAT['fluted'], lin('#4b2f1d'))   # v10 renders: #6a4529 read orange under the warm fill; a deeper walnut
        n_ = int(L / 0.6)
        for i in range(1, n_):   # brass inlay lines every 0.6 m, 1 cm wide, 6 mm proud of the flutes (3 mm fought at the corridor's length)
            c_ = (p0[0] + ux * L * i / n_, p0[1] + uz * L * i / n_); q0, q1 = (c_[0] - ux * 0.005, c_[1] - uz * 0.005), (c_[0] + ux * 0.005, c_[1] + uz * 0.005)
            slab((min(q0[0], q1[0]), min(q0[1], q1[1])), (max(q0[0], q1[0]), max(q0[1], q1[1])), y0 + 0.006, y1 - 0.006, 0.02, MAT['brass'], lin('#b8893c'))
        for e, d in ((p0, 1), (p1, -1)) if edges else ():   # brass edges, 3 cm wide, 1 cm prouder than the flutes
            e0 = (e[0] - ux * d * 0.01, e[1] - uz * d * 0.01); q = (e[0] + ux * d * 0.03, e[1] + uz * d * 0.03)   # v11: 1 cm past the panel's ends on every side (they shared its planes)
            slab((min(e0[0], q[0]), min(e0[1], q[1])), (max(e0[0], q[0]), max(e0[1], q[1])), y0 - 0.01, y1 + 0.01, 0.024, MAT['brass'], lin('#b8893c'))
    for hid, d in doors.items():
        h = halls[hid]; side = -h['dir']; zc = d['z']; xf = d['x'] + side * 0.5   # xf: the corridor wall's face
        if hid == 'X270':   # its door is at the back of a short link off the east flank: the link is the portal; clad round its mouth
            xm, za, zb = FE['x0'] + 0.3, LE['z0'], LE['z1']; zc = (za + zb) / 2
            acc.box(FE['x0'], L1 + 3.0, za, xm, top, zb, MAT['paint'], C['charcoal'])   # a lintel over the mouth
            clad((xm + 0.001, za - 2.0), (xm + 0.001, za), L1, top - 0.3, -1); clad((xm + 0.001, zb), (xm + 0.001, zb + 2.0), L1, top - 0.3, -1)
            clad((xm + 0.001, za), (xm + 0.001, zb), L1 + 3.0, top - 0.3, -1, False)   # its ends run into the piers' brass edges
            soffit = (FE['x0'] - 0.75, top, zc); xfront = xm   # the link has no lowered soffit: the downlight sits in its ceiling
        else:
            D, Wb, Wo, Ho = 0.8, 3.0, 1.3, 3.0   # block depth, half width, half opening, opening height
            xb = xf + side * D; xa, xc = min(xf, xb), max(xf, xb)
            acc.box(xa, L1, zc - Wb, xc, top - 0.3, zc - Wo, MAT['paint'], C['charcoal'])        # piers
            acc.box(xa, L1, zc + Wo, xc, top - 0.3, zc + Wb, MAT['paint'], C['charcoal'])
            acc.box(xa, L1 + Ho, zc - Wo, xc, top - 0.3, zc + Wo, MAT['paint'], C['charcoal'])   # lintel
            fc = 1 if side < 0 else -1   # the clad faces look into the corridor (+side): face sign along +z segments
            clad((xb + side * 0.001, zc - Wb), (xb + side * 0.001, zc - Wo), L1, top - 0.3, fc); clad((xb + side * 0.001, zc + Wo), (xb + side * 0.001, zc + Wb), L1, top - 0.3, fc)
            clad((xb + side * 0.001, zc - Wo), (xb + side * 0.001, zc + Wo), L1 + Ho, top - 0.3, fc, False)   # its ends run into the piers' brass edges
            soffit = (xf + side * D / 2, L1 + Ho, zc); xfront = xb
            # v10 a warm light slot framing the opening (docs/V10-RESEARCH.md: timber portals with a lit reveal): LED lines on the piers'
            # inner faces and under the lintel, 6 cm in from the portal's face
            xs_ = xb - side * 0.06
            for sg in (-1, 1):
                zf = zc + sg * Wo - sg * 0.002
                glow_facing(glow, (xs_ - 0.015, L1 + 0.08, zf), (xs_ + 0.015, L1 + 0.08, zf), (xs_ + 0.015, L1 + Ho - 0.04, zf), (xs_ - 0.015, L1 + Ho - 0.04, zf), (0, 0, -sg), lin('#ffcf8a'), 2.4)
                lit.line((xs_, L1 + 0.15, zc + sg * (Wo - 0.05)), (xs_, L1 + Ho - 0.15, zc + sg * (Wo - 0.05)), lin('#ffcf8a'), 0.35, 2.2, 'f', (0, 0, -sg))
            glow_facing(glow, (xs_ - 0.015, L1 + Ho - 0.002, zc - Wo + 0.04), (xs_ + 0.015, L1 + Ho - 0.002, zc - Wo + 0.04), (xs_ + 0.015, L1 + Ho - 0.002, zc + Wo - 0.04), (xs_ - 0.015, L1 + Ho - 0.002, zc + Wo - 0.04), (0, -1, 0), lin('#ffcf8a'), 2.4)
        if hid != 'X270':   # v13 (the user's corridor photo): the portal's face framed in light: strips on the jambs' brass edges, one under the head
            for sg in (-1, 1):
                zj = zc + sg * (Wo + 0.01); xj = xb + side * 0.030
                glow_facing(glow, (xj, L1 + 0.04, zj - 0.008), (xj, L1 + 0.04, zj + 0.008), (xj, L1 + Ho, zj + 0.008), (xj, L1 + Ho, zj - 0.008), (side, 0, 0), lin('#ffd9a0'), 2.6)
                lit.line((xb + side * 0.06, L1 + 0.15, zj), (xb + side * 0.06, L1 + Ho - 0.15, zj), lin('#ffd9a0'), 0.15, 2.5, 'f', (side, 0, 0))
            xh = xb + side * 0.026   # 5 mm proud of the head's brass inlays
            glow_facing(glow, (xh, L1 + Ho + 0.012, zc - Wo + 0.012), (xh, L1 + Ho + 0.012, zc + Wo - 0.012), (xh, L1 + Ho + 0.028, zc + Wo - 0.012), (xh, L1 + Ho + 0.028, zc - Wo + 0.012), (side, 0, 0), lin('#ffd9a0'), 2.6)
            lit.line((xb + side * 0.06, L1 + Ho + 0.02, zc - Wo + 0.1), (xb + side * 0.06, L1 + Ho + 0.02, zc + Wo - 0.1), lin('#ffd9a0'), 0.15, 2.5, 'f', (side, -0.3, 0))
        corridor_signs(acc, glow, lit, panels, hid, xfront, side, zc + (2.9 if hid == 'X270' else 2.15), zc - (2.9 if hid == 'X270' else 2.15), L1)
        door_reveal(acc, d, d['x'] + side * 0.2, side, 2.0, 2.55, MAT['paint'], C['black'])
        sx, sy, sz = soffit   # the portal's downlight: a small lit disc in the soffit and its pool on the floor
        glow_facing(glow, (sx - 0.12, sy - 0.005, sz - 0.12), (sx + 0.12, sy - 0.005, sz - 0.12), (sx + 0.12, sy - 0.005, sz + 0.12), (sx - 0.12, sy - 0.005, sz + 0.12), (0, -1, 0), C['white'], 3.0)
        lit.spot((sx, sy - 0.05, sz), lin('#fff4e6'), 2.6, 4.0, 'h', (0, -1, 0), 22, 50)
        # the soft light behind the name letters (over the portal) and the number (beside it): a halo on the bronze
        lit.area((xfront + side * 0.25, L1 + 3.38, zc), (0, 0, 1.4), (0, 0.22, 0), (-side, 0, 0), lin('#fff2e0'), 1.4, 2.0, 'f', 3, 1)
        lit.area((xfront + side * 0.25, L1 + 1.65, zc + (2.9 if hid == 'X270' else 2.15)), (0, 0, 0.35), (0, 0.5, 0), (-side, 0, 0), lin('#fff2e0'), 1.2, 1.8, 'f', 1, 2)
        panels.append({'id': 'sign_' + hid, 'x': xf + side * 0.02, 'y': L1 + 2.78, 'z': zc if hid != 'X270' else d['z'], 'yaw': (-math.pi / 2 if side < 0 else math.pi / 2), 'w': 2.0, 'h': 0.36, 'emit': 1})
    # v11 the four outer corners are rounded: the lining turns the corner on a quarter circle (the long walls' linings arrive flat there)
    xw, xe_, zn = BR['x0'] + 0.3 + RIB_D0, BR['x1'] - 0.3 - RIB_D0, BR['z1'] - 0.3 - RIB_D0
    fillet(xw + RF, zn - RF, 90.0, RF); fillet(xe_ - RF, zn - RF, 0.0, RF)                       # north-west, north-east
    fillet(xw + RF, LW['z0'] + 0.3 + RF, 180.0, RF); fillet(xe_ - RF, FE['z0'] + 0.3 + RF, 270.0, RF)   # south-west (by the CURVE link), south-east
    # the arrival video wall facing the mezzanine portal (engine plays the brand loop). v11: it stood 4 cm inside the wall since the walls
    # became 0.3 m thick (v9.1) and was never seen; it is on the wall's face now, in a brass frame
    acc.box(6.9, L1 + 0.45, BR['z0'] + 0.3, 13.5, L1 + 3.85, BR['z0'] + 0.34, MAT['brass'], C['gold'])
    acc.box(7.02, L1 + 0.55, BR['z0'] + 0.34, 13.38, L1 + 3.75, BR['z0'] + 0.35, MAT['powder'], lin('#0b0b0d'))
    panels.append({'id': 'arrival', 'x': 10.2, 'y': L1 + 2.15, 'z': BR['z0'] + 0.358, 'yaw': 0, 'w': 6.2, 'h': 3.1, 'emit': 1})
    lit.area((10.2, L1 + 2.15, BR['z0'] + 0.5), (3.0, 0, 0), (0, 1.5, 0), (0, 0, 1), lin('#b8c0ff'), 3.5, 9, 'f', 3, 2)
    # pantry: a service counter for the server's cart
    acc.box(PT['x0'] + 0.3, L1, PT['z0'] + 0.2, PT['x1'] - 0.3, L1 + 0.95, PT['z0'] + 0.8, MAT['lacquer'], C['smoke'])
    acc.box(PT['x0'] + 0.25, L1 + 0.95, PT['z0'] + 0.15, PT['x1'] - 0.25, L1 + 1.0, PT['z0'] + 0.85, MAT['calacatta'], lin('#ddd6cc'))
    lit.spot((0, top - 0.3, PT['z0'] + 1.5), lin('#ffe0b8'), 2.0, 5, 'h')
    return acc, glow, lit, {'panels': panels + cpanels}

# ------------------------------------------------------------------------------------------------ spine (G): the bright way out
def build_spine(S):
    SP, TR = S['SPINE'], S['TRAVELATOR']; x0, x1, z0, z1, H = SP['x0'], SP['x1'], SP['z0'], SP['z1'], SP['ceil']
    C = {k: lin(v) for k, v in S['PALETTE']['spine'].items()}
    acc, glow = Acc(), Glow(); lit = Lights([x0, z0, x1, z1], H)
    slab(acc, x0, z0 - 0.4, x1, z1, 0.0, 0.3, MAT['terrazzo'], lin('#f2efe8'))   # v9.1: light terrazzo (scan) instead of a plain tinted stone
    # ceiling: low (H) under the bridge and the pantry, high (H2) south of zHi where the raised halls' exits open; a soffit closes the step
    zH, H2 = SP['zHi'], SP['ceilHi']; hz = lambda z: H2 if z < zH else H
    slab(acc, x0, zH, x1, z1, H + 0.15, 0.15, MAT['paint'], C['white']); slab(acc, x0, z0 - 0.4, x1, zH, H2 + 0.15, 0.15, MAT['paint'], C['white'])
    acc.box(x0, H, zH - 0.15, x1, H2 + 0.15, zH, MAT['paint'], C['white'])
    acc.wall((x1, z0 - 0.2), (x0, z0 - 0.2), -0.3, H2 + 0.15, 0.4, MAT['slats'], C['oak'])   # far end
    acc.wall((x0, z1 - 0.03), (x1, z1 - 0.03), 0.0, H, 0.06, MAT['slats'], C['oak'], openings=[(x1 - 1.6, x1 + 1.6, 3.0, 0.0)])   # lobby end, around the exit door
    # side walls are the halls' screen walls (built by the halls); here: oak slat lining on them, broken by the exit passages' mouths
    PS = S['EXIT_PASSAGES']; DD = {d['id']: d for d in S['DOORS']}
    for sx in (x0, x1):
        inner = sx + (0.03 if sx == x0 else -0.03); ps = sorted([p for p in PS if (p['side'] < 0) == (sx < 0)], key=lambda p: p['z0'])
        cuts = [(p['z0'], p['z1'], p['ceil'], 0.0) for p in ps]
        zc = z0
        def lining(za, zb, ya, yb=None):   # split at the ceiling step so no lining rises into the bridge above
            for (p, q) in ((za, min(zb, zH)), (max(za, zH), zb)):
                top = hz((p + q) / 2) if yb is None else yb
                if q - p > 0.01 and top - ya > 0.01: acc.box(min(sx, inner), ya, p, max(sx, inner), top, q, MAT['slats'], C['oak'])
        for c0, c1, ch, sill in cuts + [(z1, z1, 0, 0)]:   # v12b: round each mouth the lining runs 6 cm into its portal (it ended in the
            m = 0.06 if c1 > c0 else 0.0                       # portal's planes: zcheck found the jambs' and the head's faces fighting the lining's)
            if c0 - m > zc + 0.01: lining(zc, c0 - m, 0.0)
            if c1 > c0: lining(c0 - m, c1 + m, ch + m)
            zc = max(zc, c1 + m)
        for p in ps:   # each mouth: a metal portal 3.5 cm proud of the lining, its jambs on the halls' corners
            fx = sx + (0.035 if sx == x0 else -0.035)
            # v12b (zcheck): the jambs stand under the head and 2 cm into the mouth (their faces lay in the passage walls' and the head's planes)
            for (za, zb, ya, yb) in ((p['z0'] - 0.12, p['z0'] + 0.02, 0.0, p['ceil']), (p['z1'] - 0.02, p['z1'] + 0.12, 0.0, p['ceil']), (p['z0'] - 0.12, p['z1'] + 0.12, p['ceil'], p['ceil'] + 0.12)):
                acc.box(min(sx, fx), ya, za, max(sx, fx), yb, zb, MAT['metal'], C['concrete'])
    # v12b the exit passages (building.js EXIT_PASSAGES; the user, 11-18: the exits off the screen wall): each runs from a mouth in the
    # spine's wall out beside a hall's (or between two halls') front, level with the hall's front floor at its door and stepping down
    # inside itself. Oak slats on the halls' walls, their own walls where no hall is, a white ceiling, a light line, lit nosings, a
    # handrail along each flight and a parapet where a flight's side is open, a green EXIT over each mouth facing the way down
    for p in PS:
        toS = 1 if p['side'] < 0 else -1; xS = p['xSpine']; xF = p['x0'] if p['side'] < 0 else p['x1']; za_, zb_ = p['z0'], p['z1']; cl = p['ceil']
        lo, hi = sorted((xS, xF))
        slab(acc, lo, za_, hi, zb_, 0.0, 0.3, MAT['terrazzo'], lin('#f2efe8'))
        slab(acc, lo, za_, hi, zb_, cl + 0.15, 0.15, MAT['paint'], C['white'])
        acc.wall((xF - toS * 0.15, za_ - 0.3), (xF - toS * 0.15, zb_ + 0.3), -0.3, cl + 0.15, 0.3, MAT['paint'], C['white'])   # the far end
        sides = {}   # which of the passage's two long sides is a hall's wall (its door's flight runs along it); the other is the passage's own
        for f in p['flights']: sides[za_ if DD[f['door']]['z'] < za_ else zb_] = f
        for zw, face in ((za_, 1), (zb_, -1)):
            f = sides.get(zw)
            if f is None:   # no hall on this side: the passage's own wall, 0.3 m thick, its face on the passage's edge
                acc.wall((lo - 0.3, zw - face * 0.15), (hi + 0.0, zw - face * 0.15), -0.3, cl + 0.15, 0.3, MAT['paint'], C['white'])
                continue
            d = DD[f['door']]; inner_ = zw + face * 0.03; dx0, dx1, dy = d['x'] - d['w'] / 2 - 0.12, d['x'] + d['w'] / 2 + 0.12, d['y'] + d['h'] + 0.12
            for (xa, xb, ya, yb) in ((lo, dx0, 0.0, cl), (dx1, hi, 0.0, cl), (dx0, dx1, dy, cl)):   # oak slats on the hall's wall, round the door
                if xb - xa > 0.01: acc.box(xa, ya, min(zw, inner_), xb, yb, max(zw, inner_), MAT['slats'], C['oak'])
            fz = zw + face * 0.065
            for (xa, xb, ya, yb) in ((dx0, dx0 + 0.12, d['y'], dy - 0.12), (dx1 - 0.12, dx1, d['y'], dy - 0.12), (dx0, dx1, dy - 0.12, dy)):   # the door's frame, from the wall's face to 3.5 cm proud of the slats; jambs under the head
                acc.box(xa, ya, min(zw, fz), xb, yb, max(zw, fz), MAT['metal'], C['concrete'])
            door_reveal_x(acc, d, zw, face, d['w'] + 0.24, d['h'] + 0.12, MAT['metal'], C['concrete'])
        for f in p['flights']:
            zf0, zf1, y0f, n = f['z0'], f['z1'], f['y0'], f['n']
            if n:
                far_ = xF; la, lb = sorted((f['xTop'], far_)); acc.box(la, -0.3, zf0, lb, y0f, zf1, MAT['terrazzo'], lin('#f2efe8'))   # the landing at the door
                for k in range(1, n):   # the steps (the last one is the floor itself)
                    xa, xb = sorted((f['xTop'] + toS * (k - 1) * f['tread'], f['xTop'] + toS * k * f['tread'])); yy = y0f - k * f['rise']
                    acc.box(xa, -0.3, zf0, xb, yy, zf1, MAT['terrazzo'], lin('#f2efe8'))
                    xn = f['xTop'] + toS * ((k - 1) * f['tread'] + 0.03); xn0, xn1 = sorted((xn, xn + toS * 0.03))
                    glow_facing(glow, (xn0, yy + 0.003, zf0 + 0.06), (xn1, yy + 0.003, zf0 + 0.06), (xn1, yy + 0.003, zf1 - 0.06), (xn0, yy + 0.003, zf1 - 0.06), (0, 1, 0), lin('#fff0d8'), 0.9)
                xBot = f['xTop'] + toS * n * f['tread']
                wall_side = za_ if sides.get(za_) is f else zb_   # the handrail on the hall wall's side; a parapet on the other where another flight runs
                open_side = zf1 if wall_side == za_ else zf0
                zr = wall_side + (0.06 if wall_side == za_ else -0.06)
                acc.tube([(far_ - toS * 0.3, y0f + 0.9, zr), (f['xTop'], y0f + 0.9, zr), (xBot, 0.9, zr), (xBot + toS * 0.3, 0.9, zr)], 0.022, MAT['metal'], C['concrete'], n=8)
                for xp in (f['xTop'] - toS * 0.4, (f['xTop'] + xBot) / 2):   # its brackets, from the slats
                    yb_ = (y0f if (xp - f['xTop']) * toS <= 0 else y0f * (1 - (xp - f['xTop']) * toS / (n * f['tread']))) + 0.9
                    za2, zb2 = sorted((wall_side + (0.02 if wall_side == za_ else -0.02), zr)); acc.box(xp - 0.015, yb_ - 0.03, za2, xp + 0.015, yb_ - 0.0, zb2, MAT['metal'], C['concrete'])   # 1 cm into the slats, into the rail
                if za_ + 1e-6 < open_side < zb_ - 1e-6:   # a shared passage: a parapet on the flight's open side, over the landing and down the stair
                    pz0, pz1 = (open_side - 0.02, open_side + 0.1) if open_side == zf0 else (open_side - 0.1, open_side + 0.02)   # 2 cm past the steps' side (in it, they fought)
                    xe_ = xBot + (toS * 0.03 if open_side == zf0 else 0.0)   # the two parapets' feet 3 cm apart (one plane where they overlap: zcheck)
                    poly = [(far_, -0.3), (far_, y0f + 1.05), (f['xTop'], y0f + 1.05), (xe_, 1.05), (xe_, -0.3)]
                    acc.prism_z(poly, pz0, pz1, MAT['slats'], C['oak'])
        glow.quad(*(((xS - toS * 0.4, cl - 0.004, (za_ + zb_) / 2 - 0.05), (xF + toS * 0.4, cl - 0.004, (za_ + zb_) / 2 - 0.05), (xF + toS * 0.4, cl - 0.004, (za_ + zb_) / 2 + 0.05), (xS - toS * 0.4, cl - 0.004, (za_ + zb_) / 2 + 0.05))
                    if toS < 0 else ((xS - toS * 0.4, cl - 0.004, (za_ + zb_) / 2 + 0.05), (xF + toS * 0.4, cl - 0.004, (za_ + zb_) / 2 + 0.05), (xF + toS * 0.4, cl - 0.004, (za_ + zb_) / 2 - 0.05), (xS - toS * 0.4, cl - 0.004, (za_ + zb_) / 2 - 0.05))), lin('#fff4e6'), 2.0)
        lit.line((xS - toS * 0.5, cl - 0.1, (za_ + zb_) / 2), (xF + toS * 0.5, cl - 0.1, (za_ + zb_) / 2), lin('#fff4e6'), 0.7, 6.0, 'h', (0, -1, 0))
        ex = xS - toS * 0.08   # the EXIT over the mouth, on the passage side, facing the way down
        acc.box(min(ex, ex - toS * 0.06), cl - 0.36, (za_ + zb_) / 2 - 0.35, max(ex, ex - toS * 0.06), cl - 0.04, (za_ + zb_) / 2 + 0.35, MAT['powder'], lin('#141416'))
        gx = ex - toS * 0.066
        glow_facing(glow, (gx, cl - 0.32, (za_ + zb_) / 2 - 0.3), (gx, cl - 0.32, (za_ + zb_) / 2 + 0.3), (gx, cl - 0.08, (za_ + zb_) / 2 + 0.3), (gx, cl - 0.08, (za_ + zb_) / 2 - 0.3), (-toS, 0, 0), C['green'], 2.0)
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
            glow_facing(glow, (sx * 1.6 - 0.15, 0.003, zz), (sx * 1.6 + 0.15, 0.003, zz), (sx * 1.6 + 0.0, 0.003, zz + 0.35), (sx * 1.6 - 0.0, 0.003, zz + 0.35), (0, 1, 0), C['green'], 0.7)   # they faced down
    # v9.1 (the user: "empty spaces", "exit nonsense"): the way out reads as a cinema's exit gallery, not a blank tube: lit "now showing"
    # cases on the free stretches of wall between the exit doors and their stairs, a dark plinth line along both walls
    panels = [{'id': 'exitwall', 'x': 0, 'y': 2.3, 'z': z0 + 0.01, 'yaw': 0, 'w': 6.0, 'h': 2.6, 'emit': 1}]
    films = ['sintel', 'cosmos', 'bunny', 'hero', 'wingit', 'agent327', 'llamigos', 'glasshalf', 'coffeerun']; k_ = 0
    for sx in (x0, x1):
        busy = [(p['z0'] - 1.2, p['z1'] + 1.2) for p in PS if (p['side'] < 0) == (sx < 0)]   # v12b: clear of the passages' mouths
        inner = sx + (0.03 if sx == x0 else -0.03); face = 1 if sx == x0 else -1
        zz = z1 - 3.0
        while zz > z0 + 2.0:
            if all(not (b0 - 0.8 < zz < b1 + 0.8) for b0, b1 in busy) and zz < zH - 1.0:
                xf = inner + face * 0.05; pw, ph, pyc = 1.1, 1.65, 1.75
                acc.box(min(inner, xf), pyc - ph / 2 - 0.08, zz - pw / 2 - 0.08, max(inner, xf), pyc + ph / 2 + 0.08, zz + pw / 2 + 0.08, MAT['powder'], lin('#141416'))
                panels.append({'id': 'poster_' + films[k_ % len(films)] + '_s' + str(k_), 'x': xf + face * 0.006, 'y': pyc, 'z': zz, 'yaw': math.pi / 2 if face > 0 else -math.pi / 2, 'w': pw, 'h': ph, 'emit': 1}); k_ += 1
                lit.spot((sx + face * 0.9, H2 - 0.2, zz), lin('#ffe8c8'), 1.2, 6, 'h', (-face * 0.4, -1, 0), 18, 40)
                zz -= 4.5
            else: zz -= 0.5
        acc.box(min(inner, inner + face * 0.02), 0.0, z0, max(inner, inner + face * 0.02), 0.12, z1, MAT['powder'], lin('#1a1a1c'))
    return acc, glow, lit, {'panels': panels}

# ------------------------------------------------------------------------------------------------ restrooms (men south, women north: the same fixtures and mirrors)
def build_wc(S):
    W = S['WC']; x0, x1, z0, z1, H = W['x0'], W['x1'], W['z0'], W['z1'], W['ceil']
    acc, glow = Acc(), Glow(); lit = Lights([x0, z0, x1, z1], H)
    tile, floor_c, stone, part = lin('#e9e5df'), lin('#cfc8be'), lin('#e8e2da'), lin('#3a3530')
    # v9.1: dark porcelain in large tiles (scan)
    slab(acc, x0, z0, x1, z1, 0.0, 0.3, MAT['wcFloor'], lin('#f4f4f4')); slab(acc, x0, z0, x1, z1, H + 0.2, 0.2, MAT['paint'], lin('#f2efe9'))
    acc.wall((x0 + 0.1, z0), (x0 + 0.1, z1), -0.3, H + 0.2, 0.2, MAT['wcWall'], lin('#fbfaf7'), openings=[(-1.0 - z0 - 1.1, -1.0 - z0 + 1.1, 2.6, -0.3)])
    acc.wall((x1 - 0.1, z1), (x1 - 0.1, z0), -0.3, H + 0.2, 0.2, MAT['wcWall'], lin('#fbfaf7'))
    acc.wall((x1, z0 + 0.1), (x0, z0 + 0.1), -0.3, H + 0.2, 0.2, MAT['wcWall'], lin('#fbfaf7'))
    acc.wall((x0, z1 - 0.1), (x1, z1 - 0.1), -0.3, H + 0.2, 0.2, MAT['wcWall'], lin('#fbfaf7'))
    # vestibule (x0..x0+2.6) splits to the two rooms through privacy openings; partition wall at z = -4 between the rooms
    zm = -4.0; vx = x0 + 2.6
    acc.wall((vx, z0 + 0.2), (vx, z1 - 0.2), 0.0, H, 0.15, MAT['wcWall'], lin('#fbfaf7'), openings=[(zm - 2.6 - z0 - 0.2, zm - 1.2 - z0 - 0.2, 2.5, 0.0), (zm + 1.2 - z0 - 0.2, zm + 2.6 - z0 - 0.2, 2.5, 0.0)])
    acc.wall((vx, zm), (x1 - 0.2, zm), 0.0, H, 0.2, MAT['wcWall'], lin('#fbfaf7'))
    rooms = (('M', z0 + 0.2, zm), ('F', zm, z1 - 0.2))
    fx = []
    for tag, za, zb in rooms:
        # basins along the vestibule-side wall: calacatta counter, mirror (glass on a chrome frame) above it, lit from a cove
        cx0 = vx + 0.08; mid = (za + zb) / 2
        acc.box(cx0, 0.82, mid - 1.6, cx0 + 0.56, 0.88, mid + 1.6, MAT['calacatta'], stone)
        acc.box(cx0 + 0.05, 0.0, mid - 1.55, cx0 + 0.5, 0.82, mid + 1.55, MAT['wood'], lin('#6b4630'))   # v9.1: walnut vanity under the stone top
        acc.box(cx0 + 0.04, 0.0, mid - 1.56, cx0 + 0.51, 0.1, mid + 1.56, MAT['powder'], lin('#1a1a1c'))      # recessed black plinth
        acc.box(cx0, 1.05, mid - 1.55, cx0 + 0.015, 2.2, mid + 1.55, MAT['chrome'], lin('#c8c8cc'))     # mirror (same in both rooms)
        acc.box(cx0, 2.2, mid - 1.6, cx0 + 0.12, 2.3, mid + 1.6, MAT['paint'], lin('#f2efe9'))
        glow.quad((cx0 + 0.121, 2.25, mid + 1.5), (cx0 + 0.121, 2.25, mid - 1.5), (cx0 + 0.121, 2.27, mid - 1.5), (cx0 + 0.121, 2.27, mid + 1.5), lin('#fff1dc'), 1.6)
        lit.line((cx0 + 0.3, 2.25, mid - 1.5), (cx0 + 0.3, 2.25, mid + 1.5), lin('#fff1dc'), 0.9, 4.0, 'h', (1, -0.6, 0))
        for k in (-1, 0, 1): fx.append({'kind': 'basin', 'room': tag, 'x': cx0 + 0.3, 'y': 0.88, 'z': mid + k * 1.0})
        fx.append({'kind': 'dryer', 'room': tag, 'x': cx0 + 0.06, 'y': 1.2, 'z': (mid + 1.95) if tag == 'M' else (mid - 1.95)})
        zd = (mid + 1.95) if tag == 'M' else (mid - 1.95)   # the hand dryer itself (it was only an interaction point)
        acc.box(cx0, 1.02, zd - 0.14, cx0 + 0.17, 1.36, zd + 0.14, MAT['chrome'], lin('#d6d8dc')); acc.box(cx0 + 0.04, 0.98, zd - 0.06, cx0 + 0.13, 1.02, zd + 0.06, MAT['powder'], lin('#1c1c1e'))
        # cubicles along the far wall. v11 (the user: no floating or disconnected parts): a real cubicle front. Pilasters on stainless feet
        # carry a chrome head rail; the partitions run from inside the pilasters 2 cm into the back wall; the doors hang between the
        # pilasters (their edges 1 cm inside them), 4 cm under the rail. v9.1's partitions, front rail and doors hovered 15 cm over the
        # floor with nothing under them, and the rail's face shared the partitions' ends
        n = 3; cw = 1.0; c0 = mid - n * cw / 2; xf = x1 - 1.6; DOOR = mix(part, lin('#6b4630'), 0.35); CHR = lin('#d6d8dc')
        for i in range(n + 1):
            zz = c0 + i * cw
            acc.box(xf - 0.02, 0.15, zz - 0.04, xf + 0.02, 2.1, zz + 0.04, MAT['powder'], part)            # pilaster
            acc.box(xf, 0.16, zz - 0.0125, x1 - 0.18, 2.08, zz + 0.0125, MAT['powder'], part)              # partition
            acc.cyl(xf, zz, 0.016, 0.0, 0.16, MAT['chrome'], CHR, n=12); acc.cyl(xf, zz, 0.03, 0.0, 0.006, MAT['chrome'], CHR, n=16)   # its foot and plate
        acc.box(xf - 0.025, 2.1, c0 - 0.04, xf + 0.025, 2.14, c0 + n * cw + 0.04, MAT['chrome'], CHR)     # head rail
        for i in range(n): fx.append({'kind': 'stall', 'room': tag, 'x': x1 - 0.7, 'y': 0.0, 'z': c0 + (i + 0.5) * cw, 'door': [xf, c0 + i * cw + 0.05, c0 + (i + 1) * cw - 0.05]})
        for i in range(n):   # v9.1: the cubicle doors (closed), a chrome pull and a green "vacant" dot on each (the stalls were open boxes)
            za_, zb_ = c0 + i * cw + 0.03, c0 + (i + 1) * cw - 0.03
            acc.box(xf - 0.015, 0.16, za_, xf + 0.015, 2.06, zb_, MAT['powder'], DOOR)
            acc.box(xf - 0.055, 1.0, zb_ - 0.13, xf - 0.01, 1.04, zb_ - 0.05, MAT['chrome'], CHR)        # the pull, 5 mm into the door
            glow.quad((xf - 0.018, 1.12, zb_ - 0.11), (xf - 0.018, 1.18, zb_ - 0.11), (xf - 0.018, 1.18, zb_ - 0.07), (xf - 0.018, 1.12, zb_ - 0.07), lin('#3dff86'), 1.6)
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
    # v12: the ground and both sides run 6 m past the walkable street, up to the buildings that close its ends (street12.py)
    E = 6.0; xw, xe = x0 - E, x1 + E; extras = {}
    slab(acc, xw, F, xe, k - 0.18, 0.0, 0.3, MAT['plaza'], lin('#b8b0a4'))
    acc.box(xw, -0.45, k, xe, -0.15, r0, MAT['asphalt'], lin('#4a4a4e'))   # drop-off bay, 15 cm below the kerb
    acc.box(xw, -0.3, k - 0.18, xe, 0.0, k, MAT['granite'], lin('#9a958e'))   # kerb stone
    acc.box(xw, -0.15 - 0.3, r0, xe, -0.15, r1, MAT['asphalt'], lin('#3a3a3e'), top=MAT['asphalt'], topcol=lin('#3c3c40'))
    sw, se = street12.side_spans(S)   # v12: the far pavement stops at the two side streets (street12.side_street builds their ground)
    acc.box(sw[1], -0.3, r1 + 0.18, se[0], 0.0, far, MAT['paving'], lin('#a49d93'))
    acc.box(sw[1], -0.3, r1, se[0], 0.0, r1 + 0.18, MAT['granite'], lin('#9a958e'))   # the far kerb stone
    for i in range(int((xe - xw) / 4)):   # lane dashes
        xx = xw + 2 + i * 4.0
        if -4.4 < xx + 1.1 < 4.4: continue   # the crossing in front of the entrance
        glow_facing(glow, (xx, -0.148, (r0 + r1) / 2 - 0.06), (xx + 2.2, -0.148, (r0 + r1) / 2 - 0.06), (xx + 2.2, -0.148, (r0 + r1) / 2 + 0.06), (xx, -0.148, (r0 + r1) / 2 + 0.06), (0, 1, 0), lin('#d8d4c8'), 0.25)   # they faced down
    # v12 the cinema's front, Streamline Moderne (the user picked concept B): curved corners, speed lines, a curved band, a tower fin and
    # a marquee with round ends; tools/blender/arch/front12.py
    panels, front_atlas = front12.build(acc, glow, lit, F, xw, xe, extras)
    # v12 planters along the kerb: a bronze trough with a brass lip and soil 6 cm under it (the hedge on each is an engine prop,
    # world9.js; they were stone crates with a flat green top)
    for xx in range(-44, 42, 8):
        if abs(xx) < 12 or abs(abs(xx) - 20) < 1: continue   # v12 (the user: decorations blocking the entrance): none on the line from the taxi bay and the crossing to the doors; none on the lamps at +-20
        pa, pb, pz0, pz1 = xx - 0.9, xx + 0.9, k - 1.6, k - 0.6; br = lin('#3a2c20')
        acc.box(pa, 0.0, pz0, pb, 0.50, pz0 + 0.06, MAT['powder'], br); acc.box(pa, 0.0, pz1 - 0.06, pb, 0.50, pz1, MAT['powder'], br)
        acc.box(pa, 0.0, pz0 + 0.06, pa + 0.06, 0.50, pz1 - 0.06, MAT['powder'], br); acc.box(pb - 0.06, 0.0, pz0 + 0.06, pb, 0.50, pz1 - 0.06, MAT['powder'], br)   # between the long walls
        acc.box(pa + 0.04, 0.0, pz0 + 0.04, pb - 0.04, 0.44, pz1 - 0.04, MAT['concrete'], lin('#2a2018'))                       # soil
        acc.box(pa - 0.015, 0.47, pz0 - 0.015, pb + 0.015, 0.515, pz0 + 0.075, MAT['brass'], FC['gold']); acc.box(pa - 0.015, 0.47, pz1 - 0.075, pb + 0.015, 0.515, pz1 + 0.015, MAT['brass'], FC['gold'])
        acc.box(pa - 0.015, 0.47, pz0 + 0.075, pa + 0.075, 0.515, pz1 - 0.075, MAT['brass'], FC['gold']); acc.box(pb - 0.075, 0.47, pz0 + 0.075, pb + 0.015, 0.515, pz1 - 0.075, MAT['brass'], FC['gold'])
    # street lamps: the posts are engine props (world9.js, every 10 m, none before the canopy); here their light, on both pavements
    halos = extras.setdefault('halos', [])
    # v12 midnight: the street lamps are cool white LED (4000 K); warm light comes only from the shops, the windows and the cinema, so the
    # street reads as night against the gold of the theatre (amber lamps everywhere made it a dusk)
    LED = lin('#e2eaf6')
    for xx in range(-40, 41, 10):
        if abs(xx) > 12:
            lit.spot((xx, 5.7, k + 0.45), LED, 9.0, 16, 'h', (0, -1, -0.1), 40, 76)   # under the head, 0.9 m out over the kerb
            halos.append({'x': xx, 'y': 5.76, 'z': k + 0.45, 'r': 1.5, 'c': list(LED), 'k': 0.5})
    for xx in range(-37, 46, 15):   # the far pavement's lamps: a slim post with an arm over the road (none on the entrance's axis)
        acc.cyl(xx, r1 + 0.6, 0.06, 0.0, 6.4, MAT['powder'], lin('#1a1a1e'), n=10)
        acc.box(xx - 0.04, 6.3, r1 - 1.0, xx + 0.04, 6.4, r1 + 0.62, MAT['powder'], lin('#1a1a1e'))
        acc.box(xx - 0.11, 6.22, r1 - 1.45, xx + 0.11, 6.36, r1 - 0.98, MAT['powder'], lin('#1a1a1e'))
        glow.quad((xx - 0.08, 6.215, r1 - 1.4), (xx + 0.08, 6.215, r1 - 1.4), (xx + 0.08, 6.215, r1 - 1.04), (xx - 0.08, 6.215, r1 - 1.04), lin('#ffe2b8'), 3.0)
        lit.spot((xx, 6.1, r1 - 1.2), LED, 8.0, 16, 'h', (0, -1, 0), 42, 78)
        halos.append({'x': xx, 'y': 6.2, 'z': r1 - 1.22, 'r': 1.4, 'c': list(LED), 'k': 0.45})
    # the block across the street and the buildings at the street's ends (v12: real buildings with shopfronts, tools/blender/arch/street12.py)
    atlas, _ = street12.far_side(acc, glow, lit, S, extras); atlas.extend(front_atlas)
    # road markings from the atlas: the crossing in front of the doors, TAXI in the bay
    atlas.append({'k': 'road', 'v': 'zebra', 'x': 0.0, 'y': -0.144, 'z': (r0 + r1) / 2, 'yaw': 0, 'w': 5.2, 'h': r1 - r0 - 0.5, 'e': 0.16, 'flat': 1})
    atlas.append({'k': 'road', 'v': 'taxi', 'x': 9.0, 'y': -0.144, 'z': (k + r0) / 2, 'yaw': math.pi, 'w': 5.0, 'h': 1.5, 'e': 0.14, 'flat': 1})   # read from the cinema's pavement
    # v12 the night sky's own light. 0.06 left the fronts black ("make the buildings more visible"); 0.9 made it an evening ("it misses
    # the whole point of a night theatre"). Midnight: a deep blue fill a third of that, so the fronts read as shapes in moonlight and the
    # light comes from lamps, signs, windows and the cinema (the bake multiplies this by AO)
    lit.ambient(lin('#22304e'), lin('#0c0c12'), 0.3, 'h')
    extras['panels'] = panels
    return acc, glow, lit, extras
