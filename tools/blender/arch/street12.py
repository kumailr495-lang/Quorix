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


def upper(acc, atlas, rnd, xa, xb, y0, H, far, P, bays, fh, wall, wcol, trim, tcol, win_h=1.75, sill_h=0.85, pier_w=0.7, cor=0.5, lit_p=0.5, depth=7.6, tint=None, balcony=(), glow=None, lit=None, wash=None, wash_last=True):
    """the floors over the shops, from y0 up to the cornice at H - 0.5: the mass, piers, spandrels, windows under lintels, a string course
    over the shop fronts, cornice, parapet and coping. wash = (colour, strength): a small uplight on the string course at each pier, so the
    front reads at night (the user: "make the buildings much more visible")"""
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
            acc.box(o0 - 0.03, yh - 0.01, far - P + 0.02, o1 + 0.03, yh + 0.17, far + 0.04, trim, tcol)   # the lintel: 4 cm proud of the spandrel, 2 cm behind the piers
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
    acc.box(xa, y0 - 0.02, far - P - 0.10, xb, y0 + 0.20, far - P, trim, tcol)   # the string course: against the piers' faces (not into them: its end would lie in the end pier's side), 5 cm down over the fascias
    if wash and lit is not None:
        wc_, wI = wash
        for i, xp in enumerate(xs):
            if i == bays and not wash_last: continue   # the row's last pier stands in the corner with the building across the street's end
            xl = xa + pier_w / 4 if i == 0 else (xb - pier_w / 4 if i == bays else xp)
            acc.box(xl - 0.07, y0 + 0.19, far - P - 0.085, xl + 0.07, y0 + 0.27, far - P + 0.02, MAT['powder'], FRAME)   # the fitting: on the course, 2 cm into the pier
            if glow is not None: glow.quad((xl - 0.05, y0 + 0.271, far - P - 0.07), (xl + 0.05, y0 + 0.271, far - P - 0.07), (xl + 0.05, y0 + 0.271, far - P - 0.01), (xl - 0.05, y0 + 0.271, far - P - 0.01), wc_, 2.2)
            lit.spot((xl, y0 + 0.32, far - P - 0.22), wc_, wI, (top - y0) * 1.15, 'h', (0, 1, 0.13), 13, 36)
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
            u = 0.6 + j * 1.3; C(u, 0.03, 0.7, u + 0.8, 0.9, 1.3, 'lacquer', '#d9dce2'); C(u + 0.1, 0.9, 0.9, u + 0.7, 0.93, 1.1, 'tblack', '#101014')            # pale plinths, a device on each
        C(0.4, 0.03, D - 0.8, W - 0.4, 0.92, D - 0.4, 'wood', '#4a3626'); C(0.36, 0.92, D - 0.84, W - 0.36, 0.96, D - 0.36, 'lacquer', '#e4e6ea')   # the service counter: walnut under a white top
    elif kind == 'hotel':
        C(W / 2 - 1.5, 0.03, D - 0.95, W / 2 + 1.5, 1.08, D - 0.45, 'nero', '#2a2426'); C(W / 2 - 1.55, 1.08, D - 1.0, W / 2 + 1.55, 1.12, D - 0.4, 'brass', '#c9a35e')   # the desk, a brass top
        C(0.5, 0.03, 0.6, 1.3, 0.42, 1.4, 'velvet', '#1e2c4a'); C(0.5, 0.42, 1.22, 1.3, 0.85, 1.4, 'velvet', '#1e2c4a')                                                   # an armchair each side
        C(W - 1.3, 0.03, 0.6, W - 0.5, 0.42, 1.4, 'velvet', '#1e2c4a'); C(W - 1.3, 0.42, 1.22, W - 0.5, 0.85, 1.4, 'velvet', '#1e2c4a')
    elif kind == 'bakery':
        C(0.4, 0.03, 0.7, W - 1.5, 0.95, 1.35, 'oak', '#9a7248'); C(0.38, 0.95, 0.68, W - 1.48, 1.0, 1.37, 'calacatta', '#ece6da')                                 # the display counter
        for j in range(int((W - 2.2) / 0.36)): u = 0.55 + j * 0.36; C(u, 1.0, 0.82, u + 0.26, 1.09 + 0.03 * (j % 2), 1.22, 'travertine', ['#c88a48', '#b06a30', '#d8a868'][j % 3])   # loaves
        C(W - 1.2, 0.03, D - 0.9, W - 0.3, 1.5, D - 0.45, 'oak', '#7a5630')
    elif kind == 'diner':
        C(0.5, 0.03, D - 1.15, W - 0.5, 1.02, D - 0.65, 'porcelain', '#e8ecea'); C(0.45, 1.02, D - 1.2, W - 0.45, 1.07, D - 0.6, 'chrome', '#c8ccd0')   # the counter, a steel top
        for j in range(int((W - 1.6) / 0.75)): u = 0.9 + j * 0.75; C(u - 0.03, 0.03, D - 1.58, u + 0.03, 0.62, D - 1.52, 'chrome', '#c0c4c8'); C(u - 0.17, 0.62, D - 1.72, u + 0.17, 0.7, D - 1.38, 'leather', '#b02a2a')   # stools on a post
        for j in range(int((W - 0.8) / 2.3)):   # booths along the window: two red benches and a table between
            u = 0.6 + j * 2.3
            for bu in (u, u + 1.45): C(bu, 0.03, 0.45, bu + 0.42, 0.46, 1.15, 'leather', '#b02a2a'); C(bu + (0.0 if bu == u else 0.3), 0.46, 0.45, bu + (0.12 if bu == u else 0.42), 1.02, 1.15, 'leather', '#9a2222')
            C(u + 0.62, 0.7, 0.5, u + 1.25, 0.74, 1.1, 'lacquer', '#e8e8e4'); C(u + 0.9, 0.03, 0.76, u + 0.97, 0.71, 0.84, 'chrome', '#c0c4c8')
    elif kind == 'jazz':
        C(0.9, 0.03, D - 1.05, W - 0.9, 0.3, D - 0.2, 'wood', '#2a1c16')                                                                                           # the stage
        C(1.3, 0.3, D - 0.85, 2.7, 1.1, D - 0.35, 'tblack', '#0c0c10'); C(1.25, 1.1, D - 0.88, 2.75, 1.14, D - 0.32, 'tblack', '#141418')                          # an upright piano
        C(1.5, 0.3, D - 1.02, 2.0, 0.72, D - 0.9, 'leather', '#3a1418')                                                                                             # its stool
        for j in range(int((W - 1.4) / 1.5)):   # small round-ish tables, a candle on each
            u = 0.9 + j * 1.5; C(u - 0.03, 0.03, 0.87, u + 0.03, 0.72, 0.93, 'powder', '#1a1a1c'); C(u - 0.3, 0.72, 0.6, u + 0.3, 0.75, 1.2, 'tblack', '#16121c'); C(u - 0.03, 0.75, 0.87, u + 0.03, 0.83, 0.93, 'brass', '#ffcf8a')
            C(u - 0.72, 0.03, 0.72, u - 0.42, 0.46, 1.02, 'velvet', '#2a2a5a'); C(u + 0.42, 0.03, 0.72, u + 0.72, 0.46, 1.02, 'velvet', '#2a2a5a')
    elif kind == 'gallery':
        for j in range(int((W - 1.0) / 2.6)):   # plinths, a piece on each (a block, a slab on edge, a stack)
            u = 0.9 + j * 2.6; C(u, 0.03, 0.8, u + 0.5, 1.0, 1.3, 'lacquer', '#ecebe6')
            if j % 3 == 0: C(u + 0.1, 1.0, 0.9, u + 0.4, 1.42, 1.2, 'nero', '#1a1a1e')
            elif j % 3 == 1: C(u + 0.2, 1.0, 0.85, u + 0.28, 1.6, 1.25, 'brass', '#c9a35e')
            else: C(u + 0.08, 1.0, 0.88, u + 0.42, 1.14, 1.22, 'travertine', '#c8402a'); C(u + 0.14, 1.14, 0.94, u + 0.36, 1.3, 1.16, 'travertine', '#2f5d8c')
        C(W - 1.5, 0.03, D - 0.8, W - 0.4, 0.78, D - 0.4, 'oak', '#b89a6a')                                                                                         # the desk
    return B


LOOK = {   # per shop kind: interior wall and floor, light colour and strength, sign colour for its halo, awning (or None), the front's frame
    'books': ('#6a4a30', 'oak', '#8a6a48', '#ffd9a8', 1.0, '#ffd08a', '#23412f', '#1f3a2c'),
    'cafe': ('#3a3028', 'travertine', '#cdbfa8', '#ffcf96', 1.1, '#ffb060', '#5a1c22', '#2e1d16'),
    'florist': ('#e6e2d8', 'concrete', '#b8b4ac', '#fff0dc', 1.2, '#ff9ac0', None, '#d9d2c2'),
    'records': ('#221a2c', 'concrete', '#3a3a40', '#c8a0ff', 0.9, '#b070ff', None, '#1c1a22'),
    'ramen': ('#3a1c14', 'wood', '#3a2a1e', '#ffb070', 1.0, '#ff4030', None, '#3a1612'),
    'chemist': ('#eef2f4', 'porcelain', '#e8eaec', '#eaf4ff', 1.3, '#40e080', None, '#dfe6e8'),
    'pixel': ('#e9eaee', 'microcement', '#c8c8cc', '#dcecff', 1.2, '#58b0ff', None, '#23262c'),
    'hotel': ('#2c2420', 'lobbyMarble', '#d8cdb8', '#ffd6a0', 1.2, '#ffd08a', '#16161a', '#6a5230'),
    'bakery': ('#f0e6d2', 'oak', '#a88458', '#ffd8a0', 1.2, '#ffc878', '#7a3a1e', '#6a3a22'),
    'diner': ('#cfe0d8', 'porcelain', '#d8dcd8', '#fff0e0', 1.3, '#ff5a6a', None, '#b8bcc0'),
    'jazz': ('#161232', 'wood', '#2a1c16', '#b8a0ff', 0.8, '#8aa0ff', '#1a1640', '#15132a'),
    'gallery': ('#f2f0ea', 'oak', '#c8b08a', '#fff4e4', 1.3, '#f0ece2', None, '#1c1c1e'),
}
SHUT = lin('#5a5e64')


def shutter(acc, a, b, g, zf, far, wall, wcol):
    """a unit closed for the night: roller shutters between steel posts (each no wider than 4 m), their box under a dark fascia"""
    acc.box(a - 0.02, g - 0.80, zf - 0.06, b + 0.02, g + 0.03, far + 0.02, MAT['powder'], lin('#121316'))
    acc.box(a - 0.02, g - 1.12, zf + 0.02, b + 0.02, g - 0.78, far, MAT['powder'], lin('#2a2c30'))                         # the shutter box
    n = max(1, math.ceil((b - a) / 4.0)); w = (b - a) / n
    for i in range(n + 1):
        px = a + i * w; acc.box(px - 0.06, 0.0, zf + 0.04, px + 0.06, g - 1.10, zf + 0.21, MAT['powder'], lin('#2a2c30'))    # guide posts (1 cm into the wall behind, 2 cm up into the box)
    for i in range(n):
        s0, s1 = a + i * w + 0.04, a + (i + 1) * w - 0.04
        acc.box(s0, 0.0, zf + 0.10, s1, g - 1.10, zf + 0.14, MAT['metal'], SHUT)                                             # the curtain
        k = int((g - 1.3) / 0.11)
        for j in range(k): acc.box(s0, 0.10 + j * 0.11, zf + 0.086, s1, 0.145 + j * 0.11, zf + 0.105, MAT['metal'], mix(SHUT, BLACK, 0.12))   # its slats' ribs
        acc.box(s0, 0.0, zf + 0.075, s1, 0.055, zf + 0.15, MAT['powder'], lin('#1c1d20'))                                    # the bottom bar



def ground(acc, glow, lit, atlas, halos, xa, xb, g, far, P, shops, wall, wcol, trim, tcol, depth=7.6, D=2.4):
    """the ground floor of one lot: pilasters, and per shop a stall riser, a glazed front with a door, a fascia with its sign, an awning
    on some, and a fitted room behind the glass with its own light. shops = [(x0, x1, kind, door side -1/+1)] between the lot's ends"""
    acc.box(xa, 0.0, far - P, xa + 0.45, g, far + depth, wall, wcol); acc.box(xb - 0.45, 0.0, far - P, xb, g, far + depth, wall, wcol)   # end pilasters, and party walls to the back; they carry the mass above
    for i, (s0, s1, kind, side) in enumerate(shops):
        if i > 0: acc.box(s0 - 0.25, 0.0, far - P, s0 + 0.25, g, far + D + 0.3, wall, wcol)   # a pilaster and party wall between two shops
        a = (xa + 0.45) if i == 0 else s0 + 0.25; b = (xb - 0.45) if i == len(shops) - 1 else s1 - 0.25; W = b - a
        if kind == 'shut': shutter(acc, a, b, g, far - P, far, wall, wcol); continue
        if kind == 'wall': plain_bay(acc, glow, lit, a, b, g, far - P, far, wall, wcol, trim, tcol); continue
        iw, fl, fc, lc, LI, hc, aw, frc = LOOK[kind]; FR = lin(frc)
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
        # v12 (the user's arrows: a door that read as a wire outline, a front with no structure): the front is a frame in the shop's
        # own colour. Posts run from the pavement into the fascia, a transom crosses the whole front at the door's head, mullions
        # divide the window, a sill caps the riser; the door is a framed leaf (stiles, a kick rail, a top rail) on a stone threshold
        d0, d1 = (a, a + 1.1) if side < 0 else (b - 1.1, b)                       # the door's bay; the window takes the rest
        w0_, w1_ = (d1, b) if side < 0 else (a, d0)
        for dx in (d0, d1 - 0.07): acc.box(dx, 0.0, zf + 0.05, dx + 0.07, g - 0.78, zf + 0.17, MAT['powder'], FR)             # the door's posts
        acc.box(a - 0.02, 2.22, zf + 0.055, b + 0.02, 2.30, zf + 0.165, MAT['powder'], FR)                                    # the transom, 2 cm into the pilasters
        acc.box(d0 + 0.06, -0.02, zf - 0.03, d1 - 0.06, 0.015, zf + 0.14, trim, mix(tcol, lin('#ffffff'), 0.25))              # the threshold (2 cm into the room's floor)
        for sx0 in (d0 + 0.05, d1 - 0.19): acc.box(sx0, 0.0, zf + 0.085, sx0 + 0.14, 2.24, zf + 0.135, MAT['powder'], FR)     # the leaf's stiles (2 cm into the posts and the transom)
        acc.box(d0 + 0.17, -0.01, zf + 0.09, d1 - 0.17, 0.26, zf + 0.13, MAT['powder'], FR)                                   # kick rail
        acc.box(d0 + 0.17, 2.11, zf + 0.09, d1 - 0.17, 2.235, zf + 0.13, MAT['powder'], FR)                                   # top rail
        acc.box(d0 + 0.17, 0.24, zf + 0.105, d1 - 0.17, 2.13, zf + 0.115, MAT['glass'], lin('#9fb4c0'))                       # the leaf's glass
        acc.box(d0 + 0.05, 2.28, zf + 0.10, d1 - 0.05, g - 0.78, zf + 0.12, MAT['glass'], lin('#9fb4c0'))                     # the light over the door
        hx = d1 - 0.155 if side < 0 else d0 + 0.125   # on the stile, 5.5 cm clear of the post
        acc.box(hx, 0.8, zf + 0.025, hx + 0.03, 1.4, zf + 0.05, MAT['brass'], lin('#c9a35e'))                                 # a long pull, 3.5 cm off the stile on two posts
        for hy in (0.86, 1.32): acc.box(hx + 0.005, hy, zf + 0.045, hx + 0.025, hy + 0.02, zf + 0.09, MAT['brass'], lin('#c9a35e'))
        acc.box(w0_ - 0.02, 0.0, zf + 0.04, w1_ + 0.02, 0.45, far + 0.02, trim, mix(tcol, BLACK, 0.35))                       # stall riser
        acc.box(w0_ - 0.04, 0.45, zf + 0.01, w1_ + 0.04, 0.49, zf + 0.19, MAT['powder'], FR)                                  # its sill
        acc.box(w0_ - 0.02, 0.43, zf + 0.10, w1_ + 0.02, g - 0.78, zf + 0.12, MAT['glass'], lin('#9fb4c0'))                   # the shop window
        nm = max(0, math.ceil((w1_ - w0_) / 1.9) - 1)
        for j in range(nm):
            xm = w0_ + (j + 1) * (w1_ - w0_) / (nm + 1); acc.box(xm - 0.025, 0.47, zf + 0.06, xm + 0.025, g - 0.78, zf + 0.16, MAT['powder'], FR)   # mullions
        for lx0, lx1 in ((a - 0.02, a + 0.03), (b - 0.03, b + 0.02)): acc.box(lx0, 0.01, zf + 0.16, lx1, g - 0.12, far + D + 0.02, MAT['plaster'], lin(iw))   # the room's side walls, lined
        if aw:
            acc.prism_x([(zf - 0.05, g - 0.86), (zf - 1.35, g - 1.38), (zf - 1.35, g - 1.46), (zf - 0.05, g - 0.98)], a + 0.1, b - 0.1, MAT['fabric'], lin(aw))
            for bx in (a + 0.4, b - 0.4): acc.box(bx - 0.015, g - 1.47, zf - 1.30, bx + 0.015, g - 1.40, zf + 0.02, MAT['powder'], FRAME)   # its two arms
        # light: the ceiling inside, and what falls through the glass on the pavement
        cx = (a + b) / 2
        lit.area((cx, g - 0.2, far + D * 0.5), (W / 2 - 0.4, 0, 0), (0, 0, D * 0.35), (0, -1, 0), lin(lc), 6.5 * LI * max(1.0, W / 4), 9, 'f', 3, 2)
        lit.spot((cx, 2.4, far + 0.3), lin(lc), 4.0 * LI * max(1.0, W / 4), 12, 'f', (0, -0.55, -1), 38, 72)
        for j in range(max(1, int(W / 1.6))):   # downlights you can see in the ceiling
            lx = a + (j + 0.5) * W / max(1, int(W / 1.6))
            glow.quad((lx - 0.07, g - 0.141, far + 1.0), (lx + 0.07, g - 0.141, far + 1.0), (lx + 0.07, g - 0.141, far + 1.14), (lx - 0.07, g - 0.141, far + 1.14), lin(lc), 2.4)


def plain_bay(acc, glow, lit, a, b, g, zf, far, wall, wcol, trim, tcol):
    """a ground-floor bay with no shop: the wall 12 cm behind the pilasters on a plinth, a blind panel, a lantern"""
    acc.box(a - 0.02, 0.0, zf + 0.12, b + 0.02, g + 0.0, far + 0.3, wall, wcol)
    acc.box(a - 0.02, 0.0, zf + 0.06, b + 0.02, 0.55, zf + 0.14, trim, mix(tcol, BLACK, 0.3))                       # plinth, 2 cm into the wall
    acc.box(a - 0.02, g - 0.80, zf - 0.06, b + 0.02, g + 0.03, far + 0.02, trim, mix(tcol, BLACK, 0.15))          # the band the fascias make next door
    px0, px1 = a + 0.7, b - 0.7
    if px1 - px0 > 1.2:   # a blind panel in a raised frame (the frame's four sides, uprights between the rails)
        for py0, py1 in ((1.0, 1.1), (g - 1.45, g - 1.35)): acc.box(px0, py0, zf + 0.085, px1, py1, zf + 0.14, trim, tcol)   # the top rail 8 cm or more over the lantern
        for qx0, qx1 in ((px0 + 0.005, px0 + 0.1), (px1 - 0.1, px1 - 0.005)): acc.box(qx0, 1.08, zf + 0.09, qx1, g - 1.43, zf + 0.14, trim, tcol)
    cx = (a + b) / 2   # the lantern: a back plate, a lit box under a cap
    acc.box(cx - 0.08, 2.28, zf + 0.09, cx + 0.08, 2.77, zf + 0.14, MAT['powder'], FRAME)
    acc.box(cx - 0.11, 2.72, zf - 0.1, cx + 0.11, 2.76, zf + 0.1, MAT['powder'], FRAME)
    acc.box(cx - 0.07, 2.38, zf - 0.07, cx + 0.07, 2.74, zf + 0.1, MAT['lacquer'], lin('#ffe9c4'))
    for q in (((cx - 0.07, 2.4, zf - 0.071), (cx - 0.07, 2.7, zf - 0.071), (cx + 0.07, 2.7, zf - 0.071), (cx + 0.07, 2.4, zf - 0.071)),
              ((cx - 0.071, 2.4, zf + 0.08), (cx - 0.071, 2.7, zf + 0.08), (cx - 0.071, 2.7, zf - 0.06), (cx - 0.071, 2.4, zf - 0.06)),
              ((cx + 0.071, 2.4, zf - 0.06), (cx + 0.071, 2.7, zf - 0.06), (cx + 0.071, 2.7, zf + 0.08), (cx + 0.071, 2.4, zf + 0.08))): glow.quad(*q, lin('#ffcf8a'), 2.6)
    lit.point((cx, 2.5, zf - 0.3), lin('#ffcf8a'), 2.4, 7, 'h')
    return cx


def end_block(acc, glow, lit, atlas, halos, rnd, xe, sx, za, zb, H, g, fh, P, bays, wm, wc, tm, tc, lp, shops, tint, wash, sign):
    """a building across the street's end, facing down it: the row's own builders in a frame turned a quarter turn (local x runs along
    the front, local z back into the building). sx -1: the west end (faces east), +1: the east end. sign: its roof sign's picture"""
    L = zb - za
    if sx < 0: T = lambda p: (xe - p[2], p[1], za + p[0]); R = lambda n: (-n[2], n[1], n[0]); dyaw = -math.pi / 2
    else: T = lambda p: (xe + p[2], p[1], zb - p[0]); R = lambda n: (n[2], n[1], -n[0]); dyaw = math.pi / 2
    na, nh = len(atlas), len(halos); wall, wcol, trim, tcol = MAT[wm], lin(wc), MAT[tm], lin(tc)
    for o in (acc, glow, lit): o.frame(T, R)
    venue = [q for q in shops if q[2] != 'wall']
    # the plain bays first (ground() builds the pilasters and the shops between them; a 'wall' unit is built here)
    ground(acc, glow, lit, atlas, halos, 0.0, L, g, 0.0, P, shops, wall, wcol, trim, tcol, D=4.4)   # a deeper room than the row's: a counter, an aisle and booths, or a stage and tables
    top = upper(acc, atlas, rnd, 0.0, L, g, H, 0.0, P, bays, fh, wall, wcol, trim, tcol, lit_p=lp, tint=tint, glow=glow, lit=lit, wash=(lin(wash[0]), wash[1]) if wash else None)
    # the roof sign over the venue: a box on two posts behind the parapet, its picture on the front
    if sign and venue:
        v0, v1 = venue[0][0], venue[0][1]; cx = (v0 + v1) / 2; sw, sh = 7.8, 2.6; rt = top - 0.5
        for px in (cx - 2.6, cx + 2.6): acc.box(px - 0.07, rt - 0.02, 0.62, px + 0.07, top + 0.55 + sh, 0.76, MAT['powder'], FRAME)
        acc.box(cx - sw / 2 - 0.1, top + 0.5, 0.44, cx + sw / 2 + 0.1, top + 0.7 + sh, 0.64, MAT['powder'], lin('#0c0c0e'))
        atlas.append({'k': 'blade', 'v': sign, 'x': cx, 'y': top + 0.6 + sh / 2, 'z': 0.428, 'yaw': math.pi, 'w': sw, 'h': sh, 'e': 1.5, 'fx': 1})
        halos.append({'x': cx, 'y': top + 0.6 + sh / 2, 'z': 0.2, 'r': 4.2, 'c': list(lin('#ff5a6a' if sign == 'diner' else '#8aa0ff')), 'k': 0.22})
        lit.area((cx, top + 0.6 + sh / 2, 0.2), (sw / 2, 0, 0), (0, sh / 2, 0), (0, -0.35, -1), lin('#ff7a84' if sign == 'diner' else '#98aaff'), 7.0, 26, 'f', 3, 2)
    for o in (acc, glow, lit): o.frame()
    for q in atlas[na:]: x_, _, z_ = T((q['x'], q['y'], q['z'])); q['x'], q['z'] = x_, z_; q['yaw'] = q.get('yaw', 0) + dyaw
    for q in halos[nh:]: x_, _, z_ = T((q['x'], q['y'], q['z'])); q['x'], q['z'] = x_, z_
    return top


def side_spans(S):
    """the side streets' x spans: 8 m each, from the block across the street's end to the row's corner lot"""
    ST = S['STREET']; return (ST['x0'] - 6.0, ST['x0'] + 2.0), (ST['x1'] - 2.0, ST['x1'] + 6.0)


ZT, ZC = 56.0, 63.0   # the side streets: where their flanking blocks end (the lane turns there), and the front of the block closing each


def side_windows(acc, atlas, rnd, xe, sx, za, zb, g, top, fh, trim, tcol, lit_p=0.55, win_w=1.3, win_h=1.6):
    """windows on a block's plain side wall over a side street (sx -1: the wall faces east, +1: west), between za and zb"""
    if sx < 0: T = lambda p: (xe - p[2], p[1], za + p[0]); R = lambda n: (-n[2], n[1], n[0]); dyaw = -math.pi / 2
    else: T = lambda p: (xe + p[2], p[1], zb - p[0]); R = lambda n: (n[2], n[1], -n[0]); dyaw = math.pi / 2
    na = len(atlas); acc.frame(T, R); L = zb - za; nb = max(1, int((L - 0.8) / 2.6))
    for k in range(int((top - g - 0.9) / fh)):
        ys = g + 0.9 + k * fh
        for b in range(nb):
            c = (b + 0.5) * L / nb; window(acc, atlas, rnd, c - win_w / 2, c + win_w / 2, ys, ys + win_h, 0.0, 0.0, trim, tcol, lit_p)
    acc.frame()
    for q in atlas[na:]: x_, _, z_ = T((q['x'], q['y'], q['z'])); q['x'], q['z'] = x_, z_; q['yaw'] = q.get('yaw', 0) + dyaw


def side_street(acc, glow, lit, atlas, halos, rnd, S, xa, xb, turn):
    """a two-way lane north from the main road between x xa and xb: 1 m footways on granite kerbs, a 6 m carriageway; blocks either
    side up to ZT, where the lane turns (turn -1 west, +1 east) behind the outer block, and a block across its head at ZC. A car turning
    out of the hidden leg comes into view only as it rounds the corner (checked from every point a player can stand on)"""
    ST = S['STREET']; r1, far = ST['road'][1], ST['far']; ASPH, ASPH_T = lin('#3a3a3e'), lin('#3c3c40'); PAV, GRN = lin('#a49d93'), lin('#9a958e')
    lx0, lx1 = (xa - 16.0, xb - 1.0) if turn < 0 else (xa + 1.0, xb + 16.0)          # the hidden leg's carriageway
    acc.box(xa + 1.0, -0.45, r1, xb - 1.0, -0.15, ZT + 1.0, MAT['asphalt'], ASPH, top=MAT['asphalt'], topcol=ASPH_T)
    acc.box(lx0 if turn < 0 else xb - 1.0, -0.45, ZT + 1.0, lx1 if turn > 0 else xa + 1.0, -0.15, ZC - 1.0, MAT['asphalt'], ASPH, top=MAT['asphalt'], topcol=ASPH_T)
    acc.box(xa + 1.0, -0.45, ZT + 1.0, xb - 1.0, -0.15, ZC - 1.0, MAT['asphalt'], ASPH, top=MAT['asphalt'], topcol=ASPH_T)
    # footways: the outer one (along the block across the street's end, then round the corner under the outer block's end), the inner
    # one (along the corner lot and the inner block, to the block across the head), and the one along that block's front
    o0, o1 = (xa, xa + 1.0) if turn < 0 else (xb - 1.0, xb); i0, i1 = (xb - 1.0, xb) if turn < 0 else (xa, xa + 1.0)
    for (a, b) in ((o0, o1), (i0, i1)):
        acc.box(a, -0.3, r1, b, 0.0, r1 + 0.18, MAT['granite'], GRN)                                   # the corner, in line with the main kerb
        kx = (b - 0.15, b) if (a, b) == (o0, o1) and turn < 0 or (a, b) == (i0, i1) and turn > 0 else (a, a + 0.15)
        pz1 = ZT if (a, b) == (o0, o1) else ZC - 1.0
        acc.box(kx[0], -0.3, r1 + 0.18, kx[1], 0.0, pz1, MAT['granite'], GRN)                            # its kerb, on the carriageway side
        acc.box(a if kx[0] > a else kx[1], -0.3, r1 + 0.18, kx[0] if kx[0] > a else b, 0.0, pz1, MAT['paving'], PAV)
    # round the corner, under the outer block's end: a kerb and footway along the leg's near side
    ox0, ox1 = (lx0, o1) if turn < 0 else (o0, lx1)
    acc.box(ox0, -0.3, ZT, ox1, 0.0, ZT + 0.85, MAT['paving'], PAV); acc.box(ox0, -0.3, ZT + 0.85, ox1, 0.0, ZT + 1.0, MAT['granite'], GRN)
    # along the head block's front, the full width of the lane and the leg
    hx0, hx1 = (lx0, xb) if turn < 0 else (xa, lx1)
    acc.box(hx0, -0.3, ZC - 1.0, hx1, 0.0, ZC - 0.85, MAT['granite'], GRN); acc.box(hx0, -0.3, ZC - 0.85, hx1, 0.0, ZC, MAT['paving'], PAV)
    # the blocks: the outer one runs on from the block across the street's end; the inner one stands behind the corner lot. Their ground
    # storeys differ from the head block's and their piers from the end block's, so nothing they share at a corner lies in one plane
    if turn < 0:
        end_block(acc, glow, lit, atlas, halos, rnd, xa, -1, far + 0.5, ZT, 15.6, 4.3, 3.3, 0.28, 4, 'brick', '#7a4232', 'stone', '#b0a490', 0.6,
                  [(0.0, 5.0, 'wall', 1), (5.0, 10.3, 'shut', 1), (10.3, ZT - far - 0.5, 'wall', 1)], None, ('#ffd9b0', 1.6), None)
        end_block(acc, glow, lit, atlas, halos, rnd, xb, 1, far + 7.6, ZC, 18.2, 4.3, 3.4, 0.28, 4, 'plaster', '#a89a86', 'stone', '#8e8676', 0.55,
                  [(0.0, 4.8, 'wall', 1), (4.8, 10.6, 'shut', 1), (10.6, ZC - far - 7.6, 'wall', 1)], None, ('#ffe2c0', 1.6), None)
    else:
        end_block(acc, glow, lit, atlas, halos, rnd, xb, 1, far + 0.5, ZT, 14.8, 4.5, 3.4, 0.26, 4, 'microcement', '#5a5e66', 'chrome', '#8a9098', 0.6,
                  [(0.0, 5.0, 'wall', 1), (5.0, 10.3, 'shut', 1), (10.3, ZT - far - 0.5, 'wall', 1)], '#cfe2ff', ('#d8e6ff', 1.6), None)
        end_block(acc, glow, lit, atlas, halos, rnd, xa, -1, far + 7.6, ZC, 16.4, 4.3, 3.4, 0.28, 4, 'brick', '#6e3a2c', 'concrete', '#8a8478', 0.55,
                  [(0.0, 4.8, 'wall', 1), (4.8, 10.6, 'shut', 1), (10.6, ZC - far - 7.6, 'wall', 1)], None, ('#ffd9a8', 1.6), None)
    # the block across the lane's head (it faces down the lane: the same front as the row's)
    hx = (xa - 18.0, xb + 8.0) if turn < 0 else (xa - 8.0, xb + 18.0); mid = (hx[0] + hx[1]) / 2
    ground(acc, glow, lit, atlas, halos, hx[0], hx[1], 4.4, ZC, 0.3, [(hx[0], mid - 3.0, 'wall', 1), (mid - 3.0, mid + 3.0, 'shut', 1), (mid + 3.0, hx[1], 'wall', 1)],
           MAT['stone'], lin('#b5a68c'), MAT['travertine'], lin('#d8ccb4'))
    upper(acc, atlas, rnd, hx[0], hx[1], 4.4, 17.0, ZC, 0.3, 8, 3.3, MAT['stone'], lin('#b5a68c'), MAT['travertine'], lin('#d8ccb4'), lit_p=0.65,
          glow=glow, lit=lit, wash=(lin('#ffe0b8'), 1.8))


def far_side(acc, glow, lit, S, extras):
    """the row across the road, west to east, and the two buildings that close the street's ends"""
    ST, F = S['STREET'], S['FACADE']; x0, x1, far = ST['x0'], ST['x1'], ST['far']; rnd = random.Random(12)
    atlas, halos = extras.setdefault('atlas', []), extras.setdefault('halos', [])
    E = 6.0   # how far the buildings run past the walkable street at each end
    SW, SE = side_spans(S)   # the two side streets (x from, x to)
    # (xa, xb, height, ground storey, floor height, pier relief, bays, wall material, colour, trim material, colour, share of lit windows, shops, window tint)
    LOTS = [
        (SW[1], -36.0, 14.6, 4.3, 3.3, 0.30, 4, 'brick', '#8a4a36', 'stone', '#b8ac98', 0.5, [(SW[1], -41.5, 'bakery', 1), (-41.5, -36.0, 'records', -1)], None),
        (-36.0, -24.0, 19.4, 4.8, 3.5, 0.36, 4, 'travertine', '#6a6258', 'nero', '#3a3632', 0.62, [(-36.0, -24.0, 'hotel', 1)], '#ffd9a0'),
        (-24.0, -13.2, 12.4, 4.2, 3.6, 0.26, 3, 'plaster', '#c8b8a0', 'stone', '#9a8c78', 0.45, [(-24.0, -13.2, 'cafe', -1)], None),
        (-11.2, 3.2, 16.8, 4.4, 3.4, 0.32, 5, 'stone', '#b09a7a', 'travertine', '#d8ccb4', 0.5, [(-11.2, -3.6, 'books', 1), (-3.6, 3.2, 'florist', -1)], None),
        (3.2, 15.2, 21.2, 4.6, 3.3, 0.22, 4, 'microcement', '#4a4e56', 'chrome', '#8a9098', 0.7, [(3.2, 15.2, 'pixel', -1)], '#cfe2ff'),
        (15.2, 27.4, 13.4, 4.2, 3.3, 0.30, 4, 'brick', '#6e3a2c', 'concrete', '#8a8478', 0.5, [(15.2, 21.6, 'ramen', 1), (21.6, 27.4, 'chemist', -1)], None),
        (27.4, SE[0], 17.4, 4.4, 3.4, 0.28, 5, 'plaster', '#8e949a', 'stone', '#b0a898', 0.5, [(27.4, 38.0, 'gallery', -1), (38.0, SE[0], 'shut', 1)], None),
    ]
    WASH = {-36.0: ('#ffd9a8', 2.6), -11.2: ('#ffe2bc', 2.0), 3.2: ('#cfe0ff', 2.2), 27.4: ('#ffe6c8', 1.4), -24.0: ('#ffdcb0', 1.2)}   # by a lot's west end: colour, strength
    tops = {}; corner = {}
    for (xa, xb, H, g, fh, P, bays, wm, wc, tm, tc, lp, shops, tint) in LOTS:
        if xa == SW[1]: corner['w'] = (g, H - 0.5, fh, MAT[tm], lin(tc))
        if xb == SE[0]: corner['e'] = (g, H - 0.5, fh, MAT[tm], lin(tc))
        ground(acc, glow, lit, atlas, halos, xa, xb, g, far, P, shops, MAT[wm], lin(wc), MAT[tm], lin(tc))
        wsh = WASH.get(xa)
        tops[xa] = upper(acc, atlas, rnd, xa, xb, g, H, far, P, bays, fh, MAT[wm], lin(wc), MAT[tm], lin(tc), lit_p=lp, tint=tint,
                         balcony=(0, 1) if wm == 'plaster' and xa == -24.0 else ((1,) if xa == -11.2 else ()), glow=glow, lit=lit, wash=(lin(wsh[0]), wsh[1]) if wsh else None, wash_last=xa != 27.4)
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
    BZ = lin('#6a6e76')   # the bezel: 4 cm proud of the screen, its uprights 5 mm shy of the rails' faces; a walkway on brackets under it
    for by0, by1 in ((9.08, 9.22), (14.58, 14.72)): acc.box(4.28, by0, far - 0.40, 14.12, by1, far - 0.135, MAT['metal'], BZ)   # back into the piers, the lintels and the spandrels
    for bx0, bx1 in ((4.285, 4.42), (13.98, 14.115)): acc.box(bx0, 9.2, far - 0.395, bx1, 14.6, far - 0.14, MAT['metal'], BZ)
    acc.box(4.2, 8.70, far - 1.0, 14.2, 8.76, far - 0.2, MAT['metal'], lin('#3a3c42'))
    for bx in (4.9, 9.2, 13.5): acc.box(bx - 0.04, 8.36, far - 0.9, bx + 0.04, 8.72, far - 0.2, MAT['powder'], FRAME)
    acc.box(4.2, 9.70, far - 0.99, 14.2, 9.75, far - 0.94, MAT['powder'], FRAME)
    for j in range(6): bx = 4.22 + j * (9.96 - 0.05) / 5; acc.box(bx, 8.74, far - 0.985, bx + 0.05, 9.72, far - 0.945, MAT['powder'], FRAME)
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
    # v12 (the user: the taxi should come from somewhere and go somewhere): a lane runs north at each end of the row, between the corner
    # lot and the block across the street's end; 16 m up it turns behind its corner block, where cars come from and go (never in view)
    extras['traffic'] = {'zt': ZT, 'zc': ZC, 'sw': list(SW), 'se': list(SE)}   # the lanes' plan, for the engine's routes (www/js/traffic.js)
    for key, (xa, xb), turn in (('w', SW, -1), ('e', SE, 1)):
        g, top, fh, tm_, tc_ = corner[key]
        side_windows(acc, atlas, rnd, xb if turn < 0 else xa, 1 if turn < 0 else -1, far, far + 7.6, g, top, fh, tm_, tc_)
        side_street(acc, glow, lit, atlas, halos, rnd, S, xa, xb, turn)
    # the street's ends (the user's arrow: a black wall with windows pasted on it): a building across each, built by the same hands
    # as the row and turned a quarter turn. A jazz room closes the west vista, an all-night diner the east; each has a roof sign
    F1 = F - 1.0
    end_block(acc, glow, lit, atlas, halos, rnd, x0 - E, -1, F1, far + 0.5, 18.6, 4.6, 3.4, 0.30, 6, 'stone', '#b9a888', 'travertine', '#ded2ba', 0.6,
              [(0.0, 6.2, 'wall', 1), (6.2, 18.2, 'jazz', 1), (18.2, far + 0.5 - F1, 'wall', 1)], '#ffd9a8', ('#ffe0b8', 2.4), 'jazz')
    end_block(acc, glow, lit, atlas, halos, rnd, x1 + E, 1, F1, far + 0.5, 15.2, 4.5, 3.5, 0.26, 6, 'plaster', '#b6a48c', 'stone', '#8e8676', 0.6,
              [(0.0, 5.0, 'wall', 1), (5.0, 17.5, 'diner', -1), (17.5, far + 0.5 - F1, 'wall', 1)], None, ('#ffe6c8', 2.0), 'diner')
    return atlas, halos
