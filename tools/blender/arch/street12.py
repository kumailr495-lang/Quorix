"""LUMIERE v12 - the street as the hero view (the user, 2026-11-15: "don't treat the street area like a side kick, people mostly judge
from outside"). The far side of the road was one brick box with flat lit rectangles; it is now a row of seven buildings with real depth:
piers proud of the window plane, spandrels a step behind the piers, framed windows on sills, cornices and parapets, and ground-floor
shops you can look into (a glazed front, a fitted room 2.4 m deep, its own light spilling onto the pavement). Both ends of the street are
closed by a building across them, so no view runs out into nothing.

What the engine draws on top (www/js/street12.js) comes back in the room's extras:
  atlas  textured, self-lit quads from one shared picture atlas (window interiors, shop back walls, shop signs, blade signs, billboards,
         road stencils): {k: kind, x, y, z, yaw, w, h, e: brightness, fx: 0 steady | 1 neon flicker | 2 chase, flat: 1 lies on the road}
  halos  soft glows round lamps and neon: {x, y, z, r, c: [r, g, b], k}
Rules kept (CLAUDE.md, v11): parts embed 2 cm or more into each other or stand more than 3 cm apart; parallel faces 5 mm or more apart;
no two same-facing faces in one plane overlap. Checked by connect.py and zcheck.py."""
import math, random
from geo import MAT, lin, mix

BLACK = (0.0, 0.0, 0.0)
FRAME = lin('#17181c')


def window(acc, atlas, rnd, o0, o1, ys, yh, far, P, sill_mat, sill_col, lit_p, frame=FRAME, tint=None):
    """one window between two piers: stiles, rails a centimetre behind them, a mullion behind the rails, a sill 8 cm proud of the piers;
    its picture (curtains, blinds, a lamp, a dark room) is one atlas quad 12 mm in front of the window plane"""
    f0, f1 = far - 0.08, far + 0.02
    acc.box(o0, ys, f0, o0 + 0.06, yh, f1, MAT['powder'], frame); acc.box(o1 - 0.06, ys, f0, o1, yh, f1, MAT['powder'], frame)
    acc.box(o0 + 0.05, ys, f0 + 0.01, o1 - 0.05, ys + 0.06, f1, MAT['powder'], frame); acc.box(o0 + 0.05, yh - 0.06, f0 + 0.01, o1 - 0.05, yh, f1, MAT['powder'], frame)
    xm = (o0 + o1) / 2
    if o1 - o0 > 1.0: acc.box(xm - 0.02, ys + 0.05, f0 + 0.02, xm + 0.02, yh - 0.05, f1, MAT['powder'], frame)
    acc.box(o0 - 0.04, ys - 0.09, far - P - 0.08, o1 + 0.04, ys, far + 0.02, sill_mat, sill_col)
    on = rnd.random() < lit_p
    atlas.append({'k': 'win', 'v': rnd.randrange(8), 'x': xm, 'y': (ys + yh) / 2, 'z': far - 0.012, 'yaw': math.pi, 'w': o1 - o0, 'h': yh - ys,
                  'e': (0.75 + rnd.random() * 0.5) if on else 0.07, 'tint': tint if (tint and on) else None})


def upper(acc, atlas, rnd, xa, xb, y0, H, far, P, bays, fh, wall, wcol, trim, tcol, win_h=1.75, sill_h=0.85, pier_w=0.7, cor=0.5, lit_p=0.5, depth=7.6, tint=None, balcony=()):
    """the floors over the shops, from y0 up to the cornice at H - 0.5: the mass, piers, spandrels, windows, cornice, parapet and coping"""
    top = H - 0.5; n = max(1, int((top - 0.35 - y0) / fh)); bay = (xb - xa) / bays; xs = [xa + i * bay for i in range(bays + 1)]
    acc.box(xa, y0, far, xb, top + 0.03, far + depth, wall, wcol)
    sp = mix(wcol, BLACK, 0.1)
    for i, xp in enumerate(xs):
        a = xa if i == 0 else xp - pier_w / 2; b = xb if i == bays else xp + pier_w / 2
        if i == 0: b = xa + pier_w / 2
        if i == bays: a = xb - pier_w / 2
        acc.box(a, y0, far - P, b, top + 0.03, far, wall, wcol)   # against the mass's face (5 cm into it, an end pier's side lay in the mass's side)
    for i in range(bays):
        o0 = xa + pier_w / 2 if i == 0 else xs[i] + pier_w / 2; o1 = xb - pier_w / 2 if i == bays - 1 else xs[i + 1] - pier_w / 2
        prev = y0
        for k in range(n):
            ys = y0 + k * fh + sill_h; yh = ys + win_h
            acc.box(o0 - 0.02, prev, far - P + 0.06, o1 + 0.02, ys - 0.03, far + 0.05, wall, sp)
            window(acc, atlas, rnd, o0, o1, ys, yh, far, P, trim, tcol, lit_p, tint=tint); prev = yh
            if k in balcony:   # a shallow balcony: a slab under the sill, a rail on balusters (each set 2 cm into the slab and the rail)
                bz0, bz1 = far - P - 0.62, far - P + 0.02
                acc.box(o0 - 0.1, ys - 0.2, bz0, o1 + 0.1, ys - 0.07, bz1, trim, tcol)   # 2 cm up into the sill
                acc.box(o0 - 0.1, ys + 0.78, bz0, o1 + 0.1, ys + 0.83, bz0 + 0.05, MAT['powder'], FRAME)
                for sx in (o0 - 0.1, o1 + 0.05): acc.box(sx, ys + 0.78, bz0 + 0.05, sx + 0.05, ys + 0.83, bz1, MAT['powder'], FRAME)   # the returns, from the rail's back
                nb = max(3, int((o1 - o0 + 0.2) / 0.16))
                for j in range(nb + 1):
                    bxx = o0 - 0.1 + 0.012 + j * (o1 - o0 + 0.2 - 0.024 - 0.02) / nb
                    acc.box(bxx, ys - 0.09, bz0 + 0.015, bxx + 0.02, ys + 0.8, bz0 + 0.035, MAT['powder'], FRAME)
        acc.box(o0 - 0.02, prev, far - P + 0.06, o1 + 0.02, top + 0.03, far + 0.05, wall, sp)
    acc.box(xa - 0.08, top, far - P - cor, xb + 0.08, top + 0.32, far + 0.1, trim, tcol)
    acc.box(xa, top + 0.29, far - P, xb, top + 0.75, far + 0.35, wall, wcol)
    acc.box(xa - 0.03, top + 0.72, far - P - 0.04, xb + 0.03, top + 0.80, far + 0.39, trim, tcol)
    return top + 0.80


# what stands inside each kind of shop (boxes in the shop's own frame: u across from its left wall, v up, w back from the glass), and its
# light: (colour, strength). Colours are the shop's palette; the back wall carries its picture from the atlas
def fit_out(kind, W, D, g):
    B = []   # (u0, v0, w0, u1, v1, w1, material, colour)
    C = lambda u0, v0, w0, u1, v1, w1, m, c: B.append((u0, v0, w0, u1, v1, w1, MAT[m], lin(c)))
    if kind == 'books':
        C(0.5, 0.03, 0.9, W - 1.6, 0.82, 1.7, 'oak', '#8a6238')                                   # the long table of new titles
        for i in range(5): C(0.7 + i * (W - 2.6) / 5, 0.82, 1.05, 0.7 + i * (W - 2.6) / 5 + 0.34, 0.82 + 0.08 + 0.05 * (i % 3), 1.5, 'paint', ['#8c2f2a', '#2f5d8c', '#c9a35e', '#3d6b4a', '#6b3d6b'][i])
        C(0.25, 0.03, 0.35, 0.75, 1.5, 0.75, 'oak', '#70502e'); C(W - 0.85, 0.03, 0.35, W - 0.35, 1.5, 0.75, 'oak', '#70502e')   # window-side shelves
    elif kind == 'cafe':
        C(W - 3.2, 0.03, D - 1.0, W - 0.3, 1.05, D - 0.45, 'wood', '#3a2a1e'); C(W - 3.25, 1.05, D - 1.05, W - 0.25, 1.1, D - 0.4, 'calacatta', '#e8e2d6')   # counter and its top
        C(W - 1.1, 1.1, D - 0.95, W - 0.6, 1.5, D - 0.55, 'chrome', '#c8ccd0')                                                                                       # the machine
        for u in (1.0, 2.9):
            C(u - 0.03, 0.03, 0.87, u + 0.03, 0.72, 0.93, 'powder', '#1a1a1c'); C(u - 0.3, 0.72, 0.6, u + 0.3, 0.76, 1.2, 'wood', '#5a4030')                   # two small tables
            C(u - 0.75, 0.03, 0.7, u - 0.45, 0.46, 1.0, 'leather', '#6a3a1e'); C(u + 0.45, 0.03, 0.7, u + 0.75, 0.46, 1.0, 'leather', '#6a3a1e')               # stools
    elif kind == 'florist':
        for i in range(3): C(0.4, 0.03, 0.45 + i * 0.55, W - 0.4, 0.3 + i * 0.3, 0.95 + i * 0.55, 'wood', '#4a3626')                                              # three tiers
        cols = ['#c8364a', '#e6a23c', '#e8e0d0', '#b04a8c', '#d86a3a', '#7a4aa8']
        for i in range(3):
            for j in range(int((W - 1.0) / 0.42)):
                u = 0.6 + j * 0.42; w = 0.6 + i * 0.55; v = 0.3 + i * 0.3
                C(u - 0.09, v, w - 0.09, u + 0.09, v + 0.2, w + 0.09, 'powder', '#2a2a2e'); C(u - 0.14, v + 0.2, w - 0.14, u + 0.14, v + 0.46, w + 0.14, 'velvet', cols[(i * 2 + j) % 6])   # a pot and its blooms
    elif kind == 'records':
        for u in (0.5, 2.0, 3.5):
            if u + 1.2 > W - 0.3: break
            C(u, 0.03, 0.8, u + 1.2, 0.85, 1.5, 'powder', '#1c1c20')
            for j in range(6): C(u + 0.08 + j * 0.18, 0.85, 0.86, u + 0.11 + j * 0.18, 1.17, 1.44, 'paint', ['#d24a3a', '#e8c040', '#3a8ad2', '#e8e8e8', '#9a4ad2', '#40c0a0'][j])   # sleeves standing in the bins
        C(W - 1.3, 0.03, D - 0.9, W - 0.3, 1.0, D - 0.45, 'powder', '#16161a')
    elif kind == 'ramen':
        C(0.4, 0.03, D - 1.3, W - 0.4, 1.02, D - 0.8, 'wood', '#5a3420'); C(0.35, 1.02, D - 1.35, W - 0.35, 1.07, D - 0.75, 'wood', '#2a1810')                  # the bar
        for j in range(int((W - 1.2) / 0.7)): u = 0.8 + j * 0.7; C(u - 0.16, 0.03, D - 1.85, u + 0.16, 0.66, D - 1.53, 'powder', '#8a1a1a')                      # red stools
    elif kind == 'chemist':
        for u in (0.5, 1.9):
            if u + 1.0 > W - 0.3: break
            C(u, 0.03, 0.7, u + 1.0, 1.45, 1.05, 'paint', '#e6e8ea')
            for j in range(3): C(u + 0.05, 0.4 + j * 0.38, 0.68, u + 0.95, 0.52 + j * 0.38, 0.745, 'paint', ['#2a8a5a', '#3a7ad2', '#e8e8e8'][j])                  # rows of boxes
        C(W - 2.2, 0.03, D - 1.0, W - 0.3, 1.0, D - 0.5, 'paint', '#f0f2f4')
    elif kind == 'pixel':
        for j in range(int((W - 0.9) / 1.3)):
            u = 0.6 + j * 1.3; C(u, 0.03, 0.7, u + 0.8, 0.9, 1.3, 'lacquer', '#f2f2f4'); C(u + 0.1, 0.9, 0.9, u + 0.7, 0.93, 1.1, 'tblack', '#101014')            # white plinths, a device on each
        C(0.4, 0.03, D - 0.8, W - 0.4, 0.95, D - 0.4, 'lacquer', '#f2f2f4')
    elif kind == 'hotel':
        C(W / 2 - 1.5, 0.03, D - 0.95, W / 2 + 1.5, 1.08, D - 0.45, 'nero', '#2a2426'); C(W / 2 - 1.55, 1.08, D - 1.0, W / 2 + 1.55, 1.12, D - 0.4, 'brass', '#c9a35e')   # the desk, a brass top
        C(0.5, 0.03, 0.6, 1.3, 0.42, 1.4, 'velvet', '#1e2c4a'); C(0.5, 0.42, 1.22, 1.3, 0.85, 1.4, 'velvet', '#1e2c4a')                                                   # an armchair each side
        C(W - 1.3, 0.03, 0.6, W - 0.5, 0.42, 1.4, 'velvet', '#1e2c4a'); C(W - 1.3, 0.42, 1.22, W - 0.5, 0.85, 1.4, 'velvet', '#1e2c4a')
    elif kind == 'bakery':
        C(0.4, 0.03, 0.7, W - 1.5, 0.95, 1.35, 'oak', '#9a7248'); C(0.38, 0.95, 0.68, W - 1.48, 1.0, 1.37, 'calacatta', '#ece6da')                                 # the display counter
        for j in range(int((W - 2.2) / 0.36)): u = 0.55 + j * 0.36; C(u, 1.0, 0.82, u + 0.26, 1.09 + 0.03 * (j % 2), 1.22, 'travertine', ['#c88a48', '#b06a30', '#d8a868'][j % 3])   # loaves
        C(W - 1.2, 0.03, D - 0.9, W - 0.3, 1.5, D - 0.45, 'oak', '#7a5630')
    return B


LOOK = {   # per shop kind: interior wall and floor, light colour and strength, sign colour for its halo, awning (or None)
    'books': ('#6a4a30', 'oak', '#8a6a48', '#ffd9a8', 1.0, '#ffd08a', '#23412f'),
    'cafe': ('#3a3028', 'travertine', '#cdbfa8', '#ffcf96', 1.1, '#ffb060', '#5a1c22'),
    'florist': ('#e6e2d8', 'concrete', '#b8b4ac', '#fff0dc', 1.2, '#ff9ac0', None),
    'records': ('#221a2c', 'concrete', '#3a3a40', '#c8a0ff', 0.9, '#b070ff', None),
    'ramen': ('#3a1c14', 'wood', '#3a2a1e', '#ffb070', 1.0, '#ff4030', None),
    'chemist': ('#eef2f4', 'porcelain', '#e8eaec', '#eaf4ff', 1.3, '#40e080', None),
    'pixel': ('#f4f4f6', 'microcement', '#c8c8cc', '#dcecff', 1.4, '#58b0ff', None),
    'hotel': ('#2c2420', 'lobbyMarble', '#d8cdb8', '#ffd6a0', 1.2, '#ffd08a', '#16161a'),
    'bakery': ('#f0e6d2', 'oak', '#a88458', '#ffd8a0', 1.2, '#ffc878', '#7a3a1e'),
}


def ground(acc, glow, lit, atlas, halos, xa, xb, g, far, P, shops, wall, wcol, trim, tcol, depth=7.6, D=2.4):
    """the ground floor of one lot: pilasters, and per shop a stall riser, a glazed front with a door, a fascia with its sign, an awning
    on some, and a fitted room behind the glass with its own light. shops = [(x0, x1, kind, door side -1/+1)] between the lot's ends"""
    acc.box(xa, 0.0, far - P, xa + 0.45, g, far + depth, wall, wcol); acc.box(xb - 0.45, 0.0, far - P, xb, g, far + depth, wall, wcol)   # end pilasters, and party walls to the back; they carry the mass above
    for i, (s0, s1, kind, side) in enumerate(shops):
        iw, fl, fc, lc, LI, hc, aw = LOOK[kind]
        if i > 0: acc.box(s0 - 0.25, 0.0, far - P, s0 + 0.25, g, far + D + 0.3, wall, wcol)   # a pilaster and party wall between two shops
        a = (xa + 0.45) if i == 0 else s0 + 0.25; b = (xb - 0.45) if i == len(shops) - 1 else s1 - 0.25; W = b - a
        # the room: floor (a 3 cm step up, from under the door's frame), back wall, ceiling
        zf = far - P
        acc.box(a - 0.02, -0.3, zf + 0.12, b + 0.02, 0.03, far + D + 0.02, MAT[fl], lin(fc))
        acc.box(a - 0.02, 0.0, far + D, b + 0.02, g + 0.03, far + D + 0.3, MAT['plaster'], lin(iw))
        acc.box(a - 0.02, g - 0.14, far - 0.05, b + 0.02, g + 0.0, far + D + 0.02, MAT['plaster'], lin('#d8d2c8'))
        atlas.append({'k': 'shop', 'v': kind, 'x': (a + b) / 2, 'y': (0.03 + g - 0.14) / 2, 'z': far + D - 0.012, 'yaw': math.pi, 'w': W, 'h': g - 0.17, 'e': 0.55})
        for (u0, v0, w0, u1, v1, w1, m, c) in fit_out(kind, W, D, g): acc.box(b - u1, v0, far + w0, b - u0, v1, far + w1, m, c)   # u runs from the shop's left as seen from the street (+x to -x)
        # the front: fascia (6 cm proud, 3 cm up into the floors above), door, riser, glass 2 cm into everything round it
        acc.box(a - 0.02, g - 0.80, zf - 0.06, b + 0.02, g + 0.03, far + 0.02, MAT['powder'], lin('#121316'))
        atlas.append({'k': 'sign', 'v': kind, 'x': (a + b) / 2, 'y': g - 0.385, 'z': zf - 0.072, 'yaw': math.pi, 'w': min(W - 0.5, 4.6), 'h': 0.52, 'e': 1.25, 'fx': 1 if kind in ('ramen', 'records') else 0})
        halos.append({'x': (a + b) / 2, 'y': g - 0.385, 'z': zf - 0.25, 'r': 1.5, 'c': list(lin(hc)), 'k': 0.22})
        d0, d1 = (a, a + 1.0) if side < 0 else (b - 1.0, b)                       # the door's bay; the window takes the rest
        w0_, w1_ = (d1, b) if side < 0 else (a, d0)
        for dx in (d0, d1 - 0.06): acc.box(dx, 0.0, zf + 0.06, dx + 0.06, 2.28, zf + 0.16, MAT['powder'], FRAME)
        acc.box(d0 + 0.05, 2.2, zf + 0.07, d1 - 0.05, 2.27, zf + 0.15, MAT['powder'], FRAME)   # the head, a centimetre inside the posts' top and back
        acc.box(d0 + 0.04, 0.0, zf + 0.10, d1 - 0.04, 2.22, zf + 0.12, MAT['glass'], lin('#9fb4c0'))          # the leaf
        acc.box(d0 + 0.04, 2.26, zf + 0.10, d1 - 0.04, g - 0.78, zf + 0.12, MAT['glass'], lin('#9fb4c0'))      # the light over it
        hx = d1 - 0.16 if side < 0 else d0 + 0.13
        acc.box(hx, 0.9, zf + 0.06, hx + 0.03, 1.3, zf + 0.085, MAT['brass'], lin('#c9a35e'))                    # the pull, 3.5 cm off the glass on two posts
        for hy in (0.94, 1.24): acc.box(hx + 0.005, hy, zf + 0.08, hx + 0.025, hy + 0.02, zf + 0.105, MAT['brass'], lin('#c9a35e'))
        acc.box(w0_ - 0.02, 0.0, zf + 0.04, w1_ + 0.02, 0.45, far + 0.02, trim, mix(tcol, BLACK, 0.35))        # stall riser
        acc.box(w0_ - 0.02, 0.43, zf + 0.10, w1_ + 0.02, g - 0.78, zf + 0.12, MAT['glass'], lin('#9fb4c0'))     # the shop window
        if aw:
            acc.prism_x([(zf - 0.05, g - 0.86), (zf - 1.35, g - 1.38), (zf - 1.35, g - 1.46), (zf - 0.05, g - 0.98)], a + 0.1, b - 0.1, MAT['fabric'], lin(aw))
            for bx in (a + 0.4, b - 0.4): acc.box(bx - 0.015, g - 1.47, zf - 1.30, bx + 0.015, g - 1.40, zf + 0.02, MAT['powder'], FRAME)   # its two arms
        # light: the ceiling inside, and what falls through the glass on the pavement
        cx = (a + b) / 2
        lit.area((cx, g - 0.2, far + D * 0.5), (W / 2 - 0.4, 0, 0), (0, 0, D * 0.35), (0, -1, 0), lin(lc), 5.0 * LI * max(1.0, W / 4), 9, 'f', 3, 2)
        lit.spot((cx, 2.4, far + 0.3), lin(lc), 3.2 * LI * max(1.0, W / 4), 11, 'f', (0, -0.55, -1), 38, 72)
        for j in range(max(1, int(W / 1.6))):   # downlights you can see in the ceiling
            lx = a + (j + 0.5) * W / max(1, int(W / 1.6))
            glow.quad((lx - 0.07, g - 0.141, far + 1.0), (lx + 0.07, g - 0.141, far + 1.0), (lx + 0.07, g - 0.141, far + 1.14), (lx - 0.07, g - 0.141, far + 1.14), lin(lc), 2.4)


def far_side(acc, glow, lit, S, extras):
    """the row across the road, west to east, and the two buildings that close the street's ends"""
    ST, F = S['STREET'], S['FACADE']; x0, x1, far = ST['x0'], ST['x1'], ST['far']; rnd = random.Random(12)
    atlas, halos = extras.setdefault('atlas', []), extras.setdefault('halos', [])
    E = 6.0   # how far the buildings run past the walkable street at each end
    # (xa, xb, height, ground storey, floor height, pier relief, bays, wall material, colour, trim material, colour, share of lit windows, shops, window tint)
    LOTS = [
        (x0 - E, -36.0, 14.6, 4.3, 3.3, 0.30, 5, 'brick', '#8a4a36', 'stone', '#b8ac98', 0.5, [(x0 - E, -42.5, 'bakery', 1), (-42.5, -36.0, 'records', -1)], None),
        (-36.0, -24.0, 19.4, 4.8, 3.5, 0.36, 4, 'travertine', '#6a6258', 'nero', '#3a3632', 0.62, [(-36.0, -24.0, 'hotel', 1)], '#ffd9a0'),
        (-24.0, -13.2, 12.4, 4.2, 3.6, 0.26, 3, 'plaster', '#c8b8a0', 'stone', '#9a8c78', 0.45, [(-24.0, -13.2, 'cafe', -1)], None),
        (-11.2, 3.2, 16.8, 4.4, 3.4, 0.32, 5, 'stone', '#b09a7a', 'travertine', '#d8ccb4', 0.5, [(-11.2, -3.6, 'books', 1), (-3.6, 3.2, 'florist', -1)], None),
        (3.2, 15.2, 21.2, 4.6, 3.3, 0.22, 4, 'microcement', '#4a4e56', 'chrome', '#8a9098', 0.7, [(3.2, 15.2, 'pixel', -1)], '#cfe2ff'),
        (15.2, 27.4, 13.4, 4.2, 3.3, 0.30, 4, 'brick', '#6e3a2c', 'concrete', '#8a8478', 0.5, [(15.2, 21.6, 'ramen', 1), (21.6, 27.4, 'chemist', -1)], None),
        (27.4, x1 + E, 17.4, 4.4, 3.4, 0.28, 6, 'plaster', '#8e949a', 'stone', '#b0a898', 0.5, [(27.4, 36.0, 'bakery', -1), (36.0, x1 + E, 'books', 1)], None),
    ]
    tops = {}
    for (xa, xb, H, g, fh, P, bays, wm, wc, tm, tc, lp, shops, tint) in LOTS:
        ground(acc, glow, lit, atlas, halos, xa, xb, g, far, P, shops, MAT[wm], lin(wc), MAT[tm], lin(tc))
        tops[xa] = upper(acc, atlas, rnd, xa, xb, g, H, far, P, bays, fh, MAT[wm], lin(wc), MAT[tm], lin(tc), lit_p=lp, tint=tint,
                         balcony=(0, 1) if wm == 'plaster' and xa == -24.0 else ((1,) if xa == -11.2 else ()))
        # a rainwater pipe down the lot's east edge (5 cm off the piers' face on two brackets), and what stands on the roof
        px = xb - 0.2; pz = far - P - 0.11
        acc.cyl(px, pz, 0.05, 0.02, tops[xa] - 0.9, MAT['powder'], lin('#26272b'), n=8)
        for py in (1.6, g + 2.0, tops[xa] - 2.2): acc.box(px - 0.07, py, pz - 0.02, px + 0.07, py + 0.05, far - P + 0.02, MAT['powder'], lin('#26272b'))
        rt = tops[xa] - 0.5   # the roof's deck (the mass's top)
        acc.box(xa + 1.2, rt - 0.02, far + 2.6, xa + 3.6, rt + 2.3, far + 5.4, MAT['plaster'], mix(lin(wc), BLACK, 0.25))   # the stair's bulkhead
        if bays >= 5: acc.cyl(xb - 2.6, far + 4.0, 0.95, rt - 0.02, rt + 2.4, MAT['powder'], lin('#3a3c40'), n=14)        # a water tank
    # the alley between the cafe and the bookshop: paving, a back wall with one lit window and a lamp, two bins
    acc.box(-13.2, -0.3, far, -11.2, 0.0, far + 7.6, MAT['paving'], lin('#6e6a64'))
    acc.box(-13.2, 0.0, far + 7.3, -11.2, 12.0, far + 7.6, MAT['brick'], lin('#4a2c22'))
    atlas.append({'k': 'win', 'v': 3, 'x': -12.2, 'y': 5.6, 'z': far + 7.288, 'yaw': math.pi, 'w': 1.0, 'h': 1.5, 'e': 0.8})
    acc.box(-12.9, 0.0, far + 5.6, -12.3, 1.05, far + 6.3, MAT['powder'], lin('#23372c')); acc.box(-12.1, 0.0, far + 5.9, -11.5, 1.05, far + 6.6, MAT['powder'], lin('#2a2a30'))
    acc.box(-13.2, 2.9, far + 2.0, -13.05, 3.05, far + 2.4, MAT['powder'], FRAME); glow.quad((-13.049, 2.92, far + 2.38), (-13.049, 2.92, far + 2.02), (-13.049, 3.03, far + 2.02), (-13.049, 3.03, far + 2.38), lin('#ffb060'), 2.0)
    lit.point((-12.7, 2.9, far + 2.2), lin('#ffb060'), 1.6, 7, 'f')
    halos.append({'x': -12.95, 'y': 2.97, 'z': far + 2.2, 'r': 0.7, 'c': list(lin('#ffb060')), 'k': 0.5})
    # the hotel: a blade sign standing off the facade (its two faces are atlas quads), a canopy over the door
    acc.box(-30.2, 6.2, far - 1.75, -29.95, 13.4, far - 0.34, MAT['powder'], lin('#101114'))
    for yb in (7.2, 12.4): acc.box(-30.15, yb, far - 0.38, -30.0, yb + 0.1, far + 0.02, MAT['powder'], FRAME)
    for s, xf in ((1, -29.938), (-1, -30.212)):
        atlas.append({'k': 'blade', 'v': 'hotel', 'x': xf, 'y': 9.8, 'z': far - 1.045, 'yaw': s * math.pi / 2, 'w': 1.25, 'h': 6.9, 'e': 1.3, 'fx': 0})
    halos.append({'x': -30.07, 'y': 9.8, 'z': far - 1.05, 'r': 2.6, 'c': list(lin('#ffd08a')), 'k': 0.2})
    lit.spot((-30.07, 6.0, far - 1.05), lin('#ffd08a'), 2.2, 9, 'f', (0, -1, -0.1), 40, 80)
    # the modern block's LED screen over its shop, and a rooftop billboard on the brick block at the east
    acc.box(4.4, 9.2, far - 0.36, 14.0, 14.6, far - 0.2, MAT['powder'], lin('#0c0c0e'))
    atlas.append({'k': 'bill', 'v': 'a', 'x': 9.2, 'y': 11.9, 'z': far - 0.372, 'yaw': math.pi, 'w': 9.2, 'h': 5.0, 'e': 1.0, 'fx': 0})
    lit.area((9.2, 11.9, far - 0.6), (4.4, 0, 0), (0, 2.4, 0), (0, -0.25, -1), lin('#9ec8ff'), 9.0, 22, 'f', 3, 2)
    tE = tops[15.2]
    for bx in (17.0, 25.6): acc.box(bx - 0.08, tE - 0.02, far + 0.9, bx + 0.08, tE + 4.6, far + 1.06, MAT['powder'], FRAME)
    acc.box(16.4, tE + 1.3, far + 0.74, 26.2, tE + 4.7, far + 0.92, MAT['powder'], lin('#0c0c0e'))
    atlas.append({'k': 'bill', 'v': 'b', 'x': 21.3, 'y': tE + 3.0, 'z': far + 0.728, 'yaw': math.pi, 'w': 9.5, 'h': 3.2, 'e': 1.1, 'fx': 0})
    # the chemist's green cross on a bracket
    acc.box(26.2, 4.6, far - 1.0, 26.28, 4.68, far - 0.28, MAT['powder'], FRAME)
    for s, xf in ((1, 26.292), (-1, 26.188)):
        atlas.append({'k': 'blade', 'v': 'cross', 'x': xf, 'y': 4.2, 'z': far - 0.75, 'yaw': s * math.pi / 2, 'w': 0.7, 'h': 0.7, 'e': 1.5, 'fx': 1})
    acc.box(26.2, 3.85, far - 1.1, 26.28, 4.6, far - 0.4, MAT['powder'], lin('#101114'))
    halos.append({'x': 26.24, 'y': 4.2, 'z': far - 0.75, 'r': 1.1, 'c': list(lin('#40e080')), 'k': 0.4})
    # the street's ends: a building across each, its windows and one big poster
    for sx, xe, yaw in ((-1, x0 - E, math.pi / 2), (1, x1 + E, -math.pi / 2)):
        xa_, xb_ = (xe - 0.6, xe) if sx < 0 else (xe, xe + 0.6)
        acc.box(xa_, -0.3, F - 1.0, xb_, 23.0, far + 8.0, MAT['microcement'], lin('#3c3f46'))
        xf = xe + (0.012 if sx < 0 else -0.012)
        for fl in range(5):
            for j in range(4):
                zc = ST['kerb'] + 2.4 + j * 3.4; yc = 4.4 + fl * 3.6
                atlas.append({'k': 'win', 'v': rnd.randrange(8), 'x': xf, 'y': yc, 'z': zc, 'yaw': yaw, 'w': 2.2, 'h': 1.9, 'e': (0.7 + rnd.random() * 0.5) if rnd.random() < 0.55 else 0.07})
    return atlas, halos
