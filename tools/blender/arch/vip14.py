"""LUMIERE v14e - the private screens (the user, 11-27: "the home should be in theatre as you can rent it and you should not be able to edit
it ... there should be home, jungle, winter, drive in, space"). The wing the lobby's private lift opens into: a lounge (vip) and five themed
screening rooms (pvHome, pvJungle, pvWinter, pvSpace, pvDrive), each a show hall of its own: its picture bakes as a light layer like the big
halls' (export as a hall with a screen emitter). The shells are built and light-baked here; the furniture, plants, cars, snow, stars and the
lift's cars are the engine's (www/js/private.js), so they change with no re-bake.

Plan (engine coordinates, building.js VIP and PRIVATE): the lounge x 200..224, z -20..0, 4.2 m; the lift car stands against its south wall,
doors to the north. Home and Jungle open off its west wall (x 185..200), Winter and Space off its east wall (x 224..239), the Drive-in off
its north wall (x 194..230, z -48..-20, 11 m: a night sky). Every room's picture is a plane across z at screen x, like the halls'; a room's
own frame: u across the picture to the viewer's right, d from the picture into the room (x = sx - f d, z = zc + f u).
Rules (CLAUDE.md): walls into floor and ceiling slabs; parts set 2 mm or more into what they join or 30 mm or more apart; parallel faces of
different parts 5 mm or more apart; glow quads 6 mm in front of the face they light; each side of a door draws its reveal back to the leaf."""
import math, random
from geo import Acc, Glow, Lights, MAT, lin

BRASS = lin('#c9a35e'); WALNUT = lin('#5a3c28'); BLACK = lin('#08080a'); WARM = lin('#ffd2a6'); AMBER = lin('#ffb060')
T = 0.2   # every wall is 0.2 m, inside its own room's rect (two rooms back to back meet in the plane between them)


def gf(glow, a, b, c, d, want, col, k):
    """a glow quad facing `want`, whatever order its corners come in (rooms.py glow_facing)"""
    n = (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]), (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]), (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
    glow.quad(*((a, b, c, d) if n[0] * want[0] + n[1] * want[1] + n[2] * want[2] >= 0 else (d, c, b, a)), col, k)


def downlights(lit, acc, glow, pts, y, col, I, r, ch='h'):
    """a dark can 2 cm under the ceiling, its lens glowing 6 mm under it, a spot down"""
    for x, z in pts:
        lit.spot((x, y - 0.05, z), col, I, r, ch, (0, -1, 0), 25, 62)
        acc.cyl(x, z, 0.065, y - 0.02, y + 0.01, MAT['metal'], lin('#2a2a2e'), n=16)
        gf(glow, (x - 0.04, y - 0.026, z - 0.04), (x + 0.04, y - 0.026, z - 0.04), (x + 0.04, y - 0.026, z + 0.04), (x - 0.04, y - 0.026, z + 0.04), (0, -1, 0), col, 2.0)


def reveal(acc, door, plane, toward, mat, col, w_open, h_open):
    """each side of a door draws its own reveal from its wall's opening back to the leaf: the room behind is not drawn while the door is
    shut (rooms.py door_reveal). axis 'z': a wall x = const; axis 'x': a wall z = const. Faces 1 cm in front of the other room's own."""
    hw = door['w'] / 2 - 0.01; ow = w_open / 2
    if door['axis'] == 'z':
        leaf = door['x'] + toward * 0.03; a, b = sorted((leaf, plane + toward * 0.02)); s0, s1 = sorted((leaf, plane))
        acc.box(a, -0.01, door['z'] - ow, b, h_open, door['z'] - hw, mat, col); acc.box(a, -0.01, door['z'] + hw, b, h_open, door['z'] + ow, mat, col)
        acc.box(a, door['h'] - 0.01, door['z'] - hw, b, h_open, door['z'] + hw, mat, col)
        acc.box(s0, -0.05, door['z'] - hw, s1, 0.003, door['z'] + hw, MAT['brass'], BRASS)          # a brass threshold plate, 3 mm proud
    else:
        leaf = door['z'] + toward * 0.03; a, b = sorted((leaf, plane + toward * 0.02)); s0, s1 = sorted((leaf, plane))
        acc.box(door['x'] - ow, -0.01, a, door['x'] - hw, h_open, b, mat, col); acc.box(door['x'] + hw, -0.01, a, door['x'] + ow, h_open, b, mat, col)
        acc.box(door['x'] - hw, door['h'] - 0.01, a, door['x'] + hw, h_open, b, mat, col)
        acc.box(door['x'] - hw, -0.05, s0, door['x'] + hw, 0.003, s1, MAT['brass'], BRASS)


def door_of(S, pid):
    return next(d for d in S['DOORS'] if d.get('priv') == pid)


# ------------------------------------------------------------------------------------------------ the lounge
def build_vip(S):
    V = S['VIP']; X0, X1, Z0, Z1, H = V['x0'], V['x1'], V['z0'], V['z1'], V['ceil']
    acc, glow = Acc(), Glow(); lit = Lights([X0, Z0, X1, Z1], H)
    PV = {p['id']: p for p in S['PRIVATE']}
    # floor: Nero Marquina like the lobby's, a crimson runner from the lift to the drive-in's door in a brass frame (6 mm above, 2 mm in)
    acc.box(X0, -0.3, Z0, X1, 0.0, Z1, MAT['nero'], lin('#e8e8e8'))
    rx0, rx1 = V['pod']['x'] - 1.3, V['pod']['x'] + 1.3
    acc.box(rx0, -0.002, Z0 + T + 0.4, rx1, 0.006, V['pod']['z'] - 1.5, MAT['carpet'], lin('#5a0f17'))
    for xa, xb in ((rx0 - 0.05, rx0), (rx1, rx1 + 0.05)): acc.box(xa, -0.002, Z0 + T + 0.35, xb, 0.008, V['pod']['z'] - 1.45, MAT['brass'], BRASS)
    acc.box(rx0 - 0.05, -0.002, Z0 + T + 0.35, rx1 + 0.05, 0.008, Z0 + T + 0.4, MAT['brass'], BRASS)
    # ceiling: a dark field with a lit coffer down the middle
    acc.box(X0, H, Z0, X1, H + 0.25, Z1, MAT['matte'], lin('#141216'))
    cx0, cx1, cz0, cz1 = X0 + 4.0, X1 - 4.0, Z0 + 3.0, Z1 - 4.2
    acc.box(cx0, H - 0.18, cz0 - 0.4, cx1, H + 0.002, cz0, MAT['matte'], lin('#141216')); acc.box(cx0, H - 0.18, cz1, cx1, H + 0.002, cz1 + 0.4, MAT['matte'], lin('#141216'))
    acc.box(cx0 - 0.4, H - 0.18, cz0 - 0.4, cx0, H + 0.002, cz1 + 0.4, MAT['matte'], lin('#141216')); acc.box(cx1, H - 0.18, cz0 - 0.4, cx1 + 0.4, H + 0.002, cz1 + 0.4, MAT['matte'], lin('#141216'))
    for a, b, d in (((cx0 + 0.02, cz0 + 0.02), (cx1 - 0.02, cz0 + 0.02), (0, 0, 1)), ((cx0 + 0.02, cz1 - 0.02), (cx1 - 0.02, cz1 - 0.02), (0, 0, -1))):
        gf(glow, (a[0], H - 0.17, a[1] + d[2] * 0.006), (b[0], H - 0.17, b[1] + d[2] * 0.006), (b[0], H - 0.12, b[1] + d[2] * 0.006), (a[0], H - 0.12, a[1] + d[2] * 0.006), d, WARM, 1.4)
        lit.line((a[0], H - 0.15, a[1] + d[2] * 0.2), (b[0], H - 0.15, b[1] + d[2] * 0.2), WARM, 0.55, 6.0, 'h', (0, 0.6, d[2]))
    downlights(lit, acc, glow, [(x, z) for x in (X0 + 2.2, X1 - 2.2) for z in (Z0 + 2.5, (Z0 + Z1) / 2, Z1 - 3.0)], H, WARM, 0.9, 5.5)
    # walls: walnut flutes to 2.6 m under a burgundy acoustic band, a brass reveal line between (5 mm proud, 2 mm in)
    openings = {'w': [], 'e': [], 'n': [], 's': []}
    for pid, p in PV.items():
        d = door_of(S, pid); w_open, h_open = d['w'] + 0.2, d['h'] + 0.15
        if p['theme'] == 'drive': openings['n'].append((d['x'] - w_open / 2 - (X0 + T), d['x'] + w_open / 2 - (X0 + T), h_open, -0.3))
        elif d['x'] <= X0 + 0.01: openings['w'].append((Z1 - (d['z'] + w_open / 2), Z1 - (d['z'] - w_open / 2), h_open, -0.3))
        else: openings['e'].append((d['z'] - w_open / 2 - Z0, d['z'] + w_open / 2 - Z0, h_open, -0.3))
    BUR = lin('#3a1219')
    acc.wall((X0 + T / 2, Z1), (X0 + T / 2, Z0), -0.3, H + 0.25, T, MAT['acoustic'], BUR, openings=openings['w'])
    acc.wall((X1 - T / 2, Z0), (X1 - T / 2, Z1), -0.3, H + 0.25, T, MAT['acoustic'], BUR, openings=openings['e'])
    acc.wall((X0 + T, Z0 + T / 2), (X1 - T, Z0 + T / 2), -0.3, H + 0.25, T, MAT['acoustic'], BUR, openings=openings['n'])
    acc.wall((X1 - T, Z1 - T / 2), (X0 + T, Z1 - T / 2), -0.3, H + 0.25, T, MAT['acoustic'], BUR)
    # wainscot: fluted walnut 30 mm proud on every wall between the openings (stopped 1 cm short of each portal's frame)
    def wainscot(axis, plane, sgn, a0, a1, cuts):
        segs, s = [], a0
        for c0, c1 in sorted(cuts):
            if c0 > s: segs.append((s, c0))
            s = max(s, c1)
        if a1 > s: segs.append((s, a1))
        for s0, s1 in segs:
            if s1 - s0 < 0.1: continue
            pa, pb = sorted((plane - sgn * 0.002, plane + sgn * 0.03))
            if axis == 'x': acc.box(pa, -0.01, s0, pb, 2.6, s1, MAT['fluted'], WALNUT); acc.box(pa - (0.0 if sgn > 0 else 0.004), 2.6, s0, pb + (0.004 if sgn > 0 else 0.0), 2.64, s1, MAT['brass'], BRASS)
            else: acc.box(s0, -0.01, pa, s1, 2.6, pb, MAT['fluted'], WALNUT); acc.box(s0, 2.6, pa - (0.0 if sgn > 0 else 0.004), s1, 2.64, pb + (0.004 if sgn > 0 else 0.0), MAT['brass'], BRASS)
    pw = 0.32   # the portal frames' depth into the room
    JW = lambda d: d['w'] / 2 + 0.1 + 0.4 - 0.002   # a portal's half width to its jambs' outer edges, 2 mm short (the wainscot runs into the jamb)
    cut_w = [(door_of(S, pid)['z'] - JW(door_of(S, pid)), door_of(S, pid)['z'] + JW(door_of(S, pid))) for pid, p in PV.items() if p['theme'] != 'drive' and door_of(S, pid)['x'] <= X0 + 0.01]
    cut_e = [(door_of(S, pid)['z'] - JW(door_of(S, pid)), door_of(S, pid)['z'] + JW(door_of(S, pid))) for pid, p in PV.items() if p['theme'] != 'drive' and door_of(S, pid)['x'] >= X1 - 0.01]
    dd = door_of(S, 'DRIVE'); cut_n = [(dd['x'] - JW(dd), dd['x'] + JW(dd))]
    wainscot('x', X0 + T, 1, Z0 + T, Z1 - T, cut_w); wainscot('x', X1 - T, -1, Z0 + T, Z1 - T, cut_e)
    wainscot('z', Z0 + T, 1, X0 + T + 0.028, X1 - T - 0.028, cut_n); wainscot('z', Z1 - T, -1, X0 + T + 0.028, X1 - T - 0.028, [(V['pod']['x'] - 1.698, V['pod']['x'] + 1.698)])
    # the portals: a brass frame round each door, its name panel above (private.js draws the name: panel pvsign_<id>), a light strip on
    # each jamb's inner edge; the reveals back to the leaves
    panels = []
    for pid, p in PV.items():
        d = door_of(S, pid); w_open, h_open = d['w'] + 0.2, d['h'] + 0.15; hw = w_open / 2
        if d['axis'] == 'z':
            plane, sg = (X0 + T, 1) if d['x'] <= X0 + 0.01 else (X1 - T, -1)
            reveal(acc, d, plane, sg, MAT['brass'], BRASS, w_open, h_open)
            for s in (-1, 1):   # jambs: 0.35 m wide brass-edged walnut, 2 mm into the wall
                za, zb = sorted((d['z'] + s * hw, d['z'] + s * (hw + 0.4))); xa, xb = sorted((plane - sg * 0.002, plane + sg * pw))
                acc.box(xa, -0.01, za, xb, h_open + 0.45, zb, MAT['wood'], WALNUT)
                ze = d['z'] + s * (hw + 0.006); gf(glow, (plane + sg * 0.05, 0.05, ze), (plane + sg * (pw - 0.04), 0.05, ze), (plane + sg * (pw - 0.04), h_open, ze), (plane + sg * 0.05, h_open, ze), (0, 0, -s), WARM, 1.6)
                lit.line((plane + sg * 0.2, 0.1, d['z'] + s * (hw - 0.05)), (plane + sg * 0.2, h_open - 0.1, d['z'] + s * (hw - 0.05)), WARM, 0.18, 2.5, 'f', (sg * 0.3, 0, -s))
            xa, xb = sorted((plane - sg * 0.002, plane + sg * pw)); acc.box(xa, h_open, d['z'] - hw - 0.4, xb, h_open + 0.45, d['z'] + hw + 0.4, MAT['wood'], WALNUT)
            panels.append({'id': 'pvsign_' + pid, 'x': plane + sg * (pw + 0.012), 'y': h_open + 0.225, 'z': d['z'], 'w': w_open + 0.6, 'h': 0.34, 'yaw': math.pi / 2 if sg > 0 else -math.pi / 2, 'emit': True})
            # a poster box beside the door (the theme's key art: private.js panel pvart_<id>), on the side away from the other door
            zs = d['z'] + (hw + 1.55) * (1 if (d['z'] > (Z0 + Z1) / 2) else -1)
            xa, xb = sorted((plane - sg * 0.002, plane + sg * 0.08)); acc.box(xa, 0.75, zs - 0.62, xb, 2.45, zs + 0.62, MAT['brass'], BRASS)
            panels.append({'id': 'pvart_' + pid, 'x': plane + sg * 0.092, 'y': 1.6, 'z': zs, 'w': 1.12, 'h': 1.58, 'yaw': math.pi / 2 if sg > 0 else -math.pi / 2, 'emit': True})
            lit.point((plane + sg * 0.9, 2.6, zs), WARM, 0.25, 3.0, 'f')
        else:
            plane, sg = Z0 + T, 1
            reveal(acc, d, plane, sg, MAT['brass'], BRASS, w_open, h_open)
            for s in (-1, 1):
                xa, xb = sorted((d['x'] + s * hw, d['x'] + s * (hw + 0.4))); za, zb = sorted((plane - 0.002, plane + pw))
                acc.box(xa, -0.01, za, xb, h_open + 0.45, zb, MAT['wood'], WALNUT)
                xe = d['x'] + s * (hw + 0.006); gf(glow, (xe, 0.05, plane + 0.05), (xe, 0.05, plane + pw - 0.04), (xe, h_open, plane + pw - 0.04), (xe, h_open, plane + 0.05), (-s, 0, 0), WARM, 1.6)
                lit.line((d['x'] + s * (hw - 0.05), 0.1, plane + 0.2), (d['x'] + s * (hw - 0.05), h_open - 0.1, plane + 0.2), WARM, 0.18, 2.5, 'f', (-s, 0, 0.3))
            acc.box(d['x'] - hw - 0.4, h_open, plane - 0.002, d['x'] + hw + 0.4, h_open + 0.45, plane + pw, MAT['wood'], WALNUT)
            panels.append({'id': 'pvsign_' + pid, 'x': d['x'], 'y': h_open + 0.225, 'z': plane + pw + 0.012, 'w': w_open + 0.6, 'h': 0.34, 'yaw': 0.0, 'emit': True})
            for s in (-1, 1):
                xs = d['x'] + s * (hw + 1.55); acc.box(xs - 0.62, 0.75, plane - 0.002, xs + 0.62, 2.45, plane + 0.08, MAT['brass'], BRASS)
            panels.append({'id': 'pvart_' + pid, 'x': d['x'] - (hw + 1.55), 'y': 1.6, 'z': plane + 0.092, 'w': 1.12, 'h': 1.58, 'yaw': 0.0, 'emit': True})
            panels.append({'id': 'pvinfo', 'x': d['x'] + (hw + 1.55), 'y': 1.6, 'z': plane + 0.092, 'w': 1.12, 'h': 1.58, 'yaw': 0.0, 'emit': True})
    # the lift's wall: a brass surround behind the car (the car itself is private.js's), a recessed light over it
    pz = V['pod']['z']; acc.box(V['pod']['x'] - 1.7, -0.01, Z1 - T - 0.03, V['pod']['x'] + 1.7, 3.4, Z1 - T + 0.002, MAT['brass'], lin('#8a6a3a'))
    acc.box(V['pod']['x'] - 1.6, 3.2, Z1 - T - 0.04, V['pod']['x'] + 1.6, 3.35, Z1 - T - 0.025, MAT['matte'], BLACK)
    lit.spot((V['pod']['x'], H - 0.1, pz - 1.6), WARM, 0.7, 6.0, 'h', (0, -1, 0.25), 30, 70)
    lit.ambient(lin('#2a2026'), lin('#120c0e'), 0.05, 'h')
    return acc, glow, lit, {'panels': panels}


# ------------------------------------------------------------------------------------------------ the screening rooms
THEMES = {
    # floor (mat, col), walls (mat, col), lower band (mat, col) or None, ceiling (mat, col), house light colour and power, accent (fixed) colour
    'home': dict(floor=('oak', '#b48c62'), wall=('rubber', '#d6cbbb'), low=('fluted', '#5a3c28'), ceil=('rubber', '#efeae2'), mask='#0d0c0f', house=('#ffd2a6', 0.8), acc='#ffb36b'),
    'jungle': dict(floor=('wood', '#4a3423'), wall=('acoustic', '#1f3a26'), low=('stone', '#5b5a4c'), ceil=('matte', '#0b1710'), mask='#06100a', house=('#d8f0c0', 0.55), acc='#7cff9a'),
    'winter': dict(floor=('microcement', '#dfe6ec'), wall=('oak', '#c9b291'), low=None, ceil=('wood', '#8a6a4a'), mask='#0c0d10', house=('#ffe7c8', 0.7), acc='#9fd4ff'),
    'space': dict(floor=('powder', '#22252b'), wall=('powder', '#2b2f37'), low=('perf', '#3a3f48'), ceil=('matte', '#05060a'), mask='#020205', house=('#c8d6ff', 0.5), acc='#7a6bff'),
    'drive': dict(floor=('asphalt', '#3a3b3f'), wall=('matte', '#06070a'), low=None, ceil=('matte', '#020306'), mask='#020203', house=('#ffe2bf', 0.45), acc='#ffcf7a'),
}


def theatre(S, pid):
    p = next(q for q in S['PRIVATE'] if q['id'] == pid); th = THEMES[p['theme']]; sc = p['screen']; f = p['f']
    X0, X1, Z0, Z1, H = p['x0'], p['x1'], p['z0'], p['z1'], p['ceil']
    W_ = lambda u, d: (sc['x'] - f * d, sc['zc'] + f * u)                     # the room's own frame -> world (x, z)
    acc, glow, scr = Acc(), Glow(), Acc(); lit = Lights([X0, Z0, X1, Z1], H)
    m = lambda k: MAT[th[k][0]]; c = lambda k: lin(th[k][1])
    # slabs
    acc.box(X0, -0.3, Z0, X1, 0.0, Z1, m('floor'), c('floor'))
    acc.box(X0, H, Z0, X1, H + 0.25, Z1, m('ceil'), c('ceil'))
    # walls: the screen wall at the far end, the door's wall at the near end (the lounge's), two side walls; trimmed at the corners
    d = door_of(S, pid); w_open, h_open = d['w'] + 0.2, d['h'] + 0.15
    xs_wall = X0 if f < 0 else X1                                              # the wall behind the picture
    xd_wall = X1 if f < 0 else X0                                              # the wall with the door (on the lounge)
    if p['theme'] != 'drive':
        acc.wall((xs_wall - f * T / 2, Z0 + T), (xs_wall - f * T / 2, Z1 - T), -0.3, H + 0.25, T, MAT['matte'], lin(th['mask']))
        acc.wall((xd_wall + f * T / 2, Z0 + T), (xd_wall + f * T / 2, Z1 - T), -0.3, H + 0.25, T, m('wall'), c('wall'),
                 openings=[(d['z'] - w_open / 2 - (Z0 + T), d['z'] + w_open / 2 - (Z0 + T), h_open, -0.3)])
        acc.wall((X0, Z0 + T / 2), (X1, Z0 + T / 2), -0.3, H + 0.25, T, m('wall'), c('wall'))
        acc.wall((X1, Z1 - T / 2), (X0, Z1 - T / 2), -0.3, H + 0.25, T, m('wall'), c('wall'))
        reveal(acc, d, xd_wall + f * T, f, m('wall'), c('wall'), w_open, h_open)
    else:   # the drive-in: the door is in the south wall (the lounge's north wall's other face)
        acc.wall((X0 + T / 2, Z0 + T), (X0 + T / 2, Z1 - T), -0.3, H + 0.25, T, MAT['matte'], lin(th['mask']))
        acc.wall((X1 - T / 2, Z1 - T), (X1 - T / 2, Z0 + T), -0.3, H + 0.25, T, m('wall'), c('wall'))
        acc.wall((X0, Z0 + T / 2), (X1, Z0 + T / 2), -0.3, H + 0.25, T, m('wall'), c('wall'))
        acc.wall((X1, Z1 - T / 2), (X0, Z1 - T / 2), -0.3, H + 0.25, T, m('wall'), c('wall'), openings=[(X1 - (d['x'] + w_open / 2), X1 - (d['x'] - w_open / 2), h_open, -0.3)])
        reveal(acc, d, Z1 - T, -1, m('wall'), c('wall'), w_open, h_open)
    # side walls' lower band (stone, fluted walnut, perforated metal), 30 mm proud, 2 mm into the wall
    if th['low']:
        for zp, sg in ((Z0 + T, 1), (Z1 - T, -1)):
            za, zb = sorted((zp - sg * 0.002, zp + sg * 0.03)); xa, xb = X0 + T + 0.01, X1 - T - 0.01
            acc.box(xa, -0.01, za, xb, 1.3, zb, MAT[th['low'][0]], lin(th['low'][1]))
            zc_, zd_ = sorted((zp - sg * 0.002, zp + sg * 0.035)); acc.box(xa, 1.3, zc_, xb, 1.34, zd_, MAT['brass'] if p['theme'] != 'jungle' else MAT['wood'], BRASS if p['theme'] != 'jungle' else lin('#3a2a1c'))
    # the picture: the engine's plane 8 mm in front of a white screen; black velvet masking 3 cm proud round it; the screen emitter
    W2, Hp, hB = sc['W'] / 2, sc['H'], sc['hB']; xsc = sc['x']
    za, zb = sc['zc'] - W2, sc['zc'] + W2
    sa, sb = sorted((xsc + f * 0.008, xsc + f * 0.04)); acc.box(sa, hB, za, sb, hB + Hp, zb, MAT['matte'], lin('#d8d8d8'))   # the screen, 8 mm behind the picture plane
    if p['theme'] != 'drive':
        VEL = lin('#0b0b0e'); xa, xb = sorted((xsc + f * 0.01, xsc - f * 0.05))
        top = H + 0.002 if H - (hB + Hp) < 0.4 else hB + Hp + 0.18   # a masking that would stop just short of the ceiling runs into it
        for (y0, y1, z0, z1) in ((hB - 0.18, hB, za - 0.18, zb + 0.18), (hB + Hp, top, za - 0.18, zb + 0.18), (hB, hB + Hp, za - 0.18, za), (hB, hB + Hp, zb, zb + 0.18)):
            acc.box(xa, y0, z0, xb, y1, z1, MAT['velvet'], VEL)
        # the stage: a low plinth under the screen (a step 0.3 m deep), its nosing lit
        xa, xb = sorted((xs_wall - f * T, xs_wall - f * (T + 1.2))); acc.box(xa, -0.01, Z0 + T - 0.002, xb, 0.18, Z1 - T + 0.002, m('floor'), c('floor'))
        xn = xs_wall - f * (T + 1.2 + 0.006); gf(glow, (xn, 0.15, Z0 + T + 0.05), (xn, 0.15, Z1 - T - 0.05), (xn, 0.17, Z1 - T - 0.05), (xn, 0.17, Z0 + T + 0.05), (-f, 0, 0), lin(th['acc']), 1.4)
        lit.line((xn - f * 0.1, 0.16, Z0 + T + 0.2), (xn - f * 0.1, 0.16, Z1 - T - 0.2), lin(th['acc']), 0.08, 1.5, 'f', (-f, -0.2, 0))
    else:   # the drive-in's screen stands on a steel frame: two towers, a top girder, a deck the screen sits on
        fa, fb = sorted((xsc + f * 0.038, xsc + f * 0.95))   # the frame behind the screen, 2 mm into its back
        for zt in (za - 0.55, zb + 0.05): acc.box(fa, -0.01, zt, fb, hB + Hp + 0.9, zt + 0.5, MAT['metal'], lin('#2a2c30'))
        acc.box(fa, hB + Hp + 0.02, za - 0.5, fb, hB + Hp + 0.9, zb + 0.5, MAT['metal'], lin('#2a2c30'))
        acc.box(fa, hB - 0.35, za - 0.5, fb, hB + 0.002, zb + 0.5, MAT['metal'], lin('#2a2c30'))
        # parking bays: white lines 6 mm proud of the asphalt (2 mm in), three rows of five facing the screen
        for row in range(3):
            dline = 9.0 + row * 6.0
            for k in range(6):
                u = -10.0 + k * 4.0; x_, z_ = W_(u, dline); xa_, xb_ = sorted((x_, x_ - f * 4.6)); acc.box(xa_, -0.002, z_ - 0.06, xb_, 0.006, z_ + 0.06, MAT['paint'], lin('#e8e4da'))
    xe = xsc - f * 0.01
    if f > 0: scr.quad((xe, hB, za), (xe, hB, zb), (xe, hB + Hp, zb), (xe, hB + Hp, za), 0, (1, 1, 1))
    else: scr.quad((xe, hB, zb), (xe, hB, za), (xe, hB + Hp, za), (xe, hB + Hp, zb), 0, (1, 1, 1))
    # the riser for the second row: a carpeted platform across the room, lit nosings front and back (fixed light)
    R = p.get('riser')
    if R:
        (xa, _), (xb, _) = W_(0, R['d0']), W_(0, R['d1']); xa, xb = sorted((xa, xb)); ry = R['y']
        acc.box(xa, -0.01, Z0 + T - 0.002, xb, ry, Z1 - T + 0.002, MAT['hallCarpet'], lin({'home': '#3a2a22', 'jungle': '#23301f', 'winter': '#cfd6dc', 'space': '#1a1c26'}[p['theme']]))
        for xf, s in ((xa, -1), (xb, 1)):
            x1_, x2_ = sorted((xf + s * 0.006, xf - s * 0.002)); acc.box(x1_, ry - 0.035, Z0 + T + 0.01, x2_, ry - 0.01, Z1 - T - 0.01, MAT['brass'], BRASS)
            gf(glow, (xf + s * 0.0125, ry - 0.03, Z0 + T + 0.05), (xf + s * 0.0125, ry - 0.03, Z1 - T - 0.05), (xf + s * 0.0125, ry - 0.015, Z1 - T - 0.05), (xf + s * 0.0125, ry - 0.015, Z0 + T + 0.05), (s, 0, 0), AMBER, 1.6)
            lit.line((xf + s * 0.1, ry - 0.02, Z0 + T + 0.3), (xf + s * 0.1, ry - 0.02, Z1 - T - 0.3), AMBER, 0.05, 1.2, 'f', (s, -1, 0))
    # house lights: coves along both side walls (a 15 cm lip 0.35 m under the ceiling, the strip in it washing up), downlights over the seats
    hc = lin(th['house'][0]); hk = th['house'][1]
    if p['theme'] != 'drive':
        for zp, sg in ((Z0 + T, 1), (Z1 - T, -1)):
            za_, zb_ = sorted((zp - sg * 0.002, zp + sg * 0.3)); xa_, xb_ = X0 + T + 0.3, X1 - T - 0.3
            acc.box(xa_, H - 0.38, za_, xb_, H - 0.35, zb_, MAT['matte'] if p['theme'] != 'home' else MAT['rubber'], c('ceil'))
            zg = zp + sg * 0.15; gf(glow, (xa_ + 0.05, H - 0.344, zg - 0.04), (xb_ - 0.05, H - 0.344, zg - 0.04), (xb_ - 0.05, H - 0.344, zg + 0.04), (xa_ + 0.05, H - 0.344, zg + 0.04), (0, 1, 0), hc, 1.2)
            lit.line((xa_ + 0.2, H - 0.3, zg), (xb_ - 0.2, H - 0.3, zg), hc, hk * 0.6, 6.0, 'h', (0, 1, sg * 0.3))
        pts = [W_(u, dd) for u in (-2.4, 2.4) for dd in (5.2, 8.0, 11.0)]
        downlights(lit, acc, glow, pts, H, hc, hk, 5.0)
    else:   # the drive-in's sky: lamp-post light over the lots (house), string lights (fixed) are the engine's bulbs over the light here
        for u, dd in ((-8, 10), (8, 10), (-8, 22), (8, 22), (0, 16)):
            x_, z_ = W_(u, dd); lit.point((x_, 5.5, z_), hc, hk * 1.4, 12.0, 'h')
        for u in (-12, -4, 4, 12):
            for dd in (8, 14, 20, 26):
                x_, z_ = W_(u, dd); lit.point((x_, 4.2, z_), lin('#ffcf7a'), 0.12, 5.0, 'f')
    theme_extras(acc, glow, lit, p, th, W_, X0, X1, Z0, Z1, H)
    lit.ambient(lin('#1c1a20'), lin('#0c0b0e'), 0.03, 'f')
    return acc, glow, lit, scr


def theme_extras(acc, glow, lit, p, th, W_, X0, X1, Z0, Z1, H):
    f = p['f']; t = p['theme']; rnd = random.Random({'home': 1, 'jungle': 2, 'winter': 3, 'space': 4, 'drive': 5}[t])
    if t == 'home':
        # crown moulding where walls meet the ceiling (white, into both), a picture rail 2.35 m up
        for zp, sg in ((Z0 + T, 1), (Z1 - T, -1)):
            za, zb = sorted((zp - sg * 0.002, zp + sg * 0.06)); acc.box(X0 + T + 0.31, H - 0.12, za, X1 - T - 0.31, H + 0.002, zb, MAT['rubber'], lin('#f3efe8'))
    elif t == 'jungle':
        # wooden beams across the ceiling (rough timber 0.25 x 0.3, into the ceiling), uplights in the stone band's top (green, fixed)
        for k in range(7):
            x_ = X0 + T + 1.2 + k * (X1 - X0 - 2 * T - 2.4) / 6; acc.box(x_ - 0.13, H - 0.3, Z0 + T - 0.002, x_ + 0.13, H + 0.002, Z1 - T + 0.002, MAT['wood'], lin('#3a2a1c'))
        for zp, sg in ((Z0 + T, 1), (Z1 - T, -1)):
            for k in range(6):
                x_ = X0 + T + 1.6 + k * (X1 - X0 - 2 * T - 3.2) / 5; zg = zp + sg * 0.05
                lit.spot((x_, 1.4, zg), lin('#9cff8a'), 0.18, 4.0, 'f', (0, 1, sg * 0.2), 20, 50)
                gf(glow, (x_ - 0.06, 1.346, zg - 0.015), (x_ + 0.06, 1.346, zg - 0.015), (x_ + 0.06, 1.346, zg + 0.015), (x_ - 0.06, 1.346, zg + 0.015), (0, 1, 0), lin('#9cff8a'), 1.6)
    elif t == 'winter':
        # log-cabin walls: half-round logs 0.22 m tall, each 2 cm proud of the one under it (horizontal boards, 2 mm into the wall)
        for zp, sg in ((Z0 + T, 1), (Z1 - T, -1)):
            y = 0.0
            while y + 0.22 <= H - 0.05:
                za, zb = sorted((zp - sg * 0.002, zp + sg * (0.05 if int(y / 0.22) % 2 else 0.07))); acc.box(X0 + T + 0.01, y - (0.01 if y == 0 else 0.0), za, X1 - T - 0.01, y + 0.22, zb, MAT['oak'], lin('#b89a74' if int(y / 0.22) % 2 else '#a88a64')); y += 0.22
        # roof beams and a ridge over the room
        for k in range(6):
            x_ = X0 + T + 1.0 + k * (X1 - X0 - 2 * T - 2.0) / 5; acc.box(x_ - 0.12, H - 0.28, Z0 + T + 0.06, x_ + 0.12, H + 0.002, Z1 - T - 0.06, MAT['wood'], lin('#5a412c'))
        # a stone fireplace on the +z wall, between the riser and the door: hearth, surround, a dark firebox with its glow (fixed, amber)
        xf, _ = W_(0, 3.2); zp = Z1 - T
        acc.box(xf - 1.1, -0.01, zp - 0.75, xf + 1.1, 2.6, zp + 0.002, MAT['stone'], lin('#8a8680'))
        acc.box(xf - 1.4, -0.01, zp - 1.05, xf + 1.4, 0.16, zp - 0.74, MAT['stone'], lin('#6e6a66'))
        acc.box(xf - 0.55, 0.16, zp - 0.77, xf + 0.55, 0.9, zp - 0.4, MAT['matte'], lin('#0c0806'))
        gf(glow, (xf - 0.5, 0.2, zp - 0.776), (xf + 0.5, 0.2, zp - 0.776), (xf + 0.5, 0.85, zp - 0.776), (xf - 0.5, 0.85, zp - 0.776), (0, 0, -1), lin('#ff7a2a'), 2.6)
        lit.point((xf, 0.5, zp - 1.2), lin('#ff8a3a'), 0.6, 7.0, 'f')
        acc.box(xf - 1.25, 1.55, zp - 0.9, xf + 1.25, 1.65, zp - 0.74, MAT['wood'], lin('#5a412c'))   # the mantel
    elif t == 'space':
        # wall ribs (metal) every 1.5 m with a violet LED in each rib's face; a viewport recess on each side wall for the stars (private.js)
        for zp, sg in ((Z0 + T, 1), (Z1 - T, -1)):
            for k in range(9):
                x_ = X0 + T + 0.75 + k * (X1 - X0 - 2 * T - 1.5) / 8; za, zb = sorted((zp - sg * 0.002, zp + sg * 0.12))
                acc.box(x_ - 0.09, -0.01, za, x_ + 0.09, H + 0.002, zb, MAT['metal'], lin('#3a3e46'))
                zg = zp + sg * 0.126; gf(glow, (x_ - 0.02, 0.2, zg), (x_ + 0.02, 0.2, zg), (x_ + 0.02, H - 0.3, zg), (x_ - 0.02, H - 0.3, zg), (0, 0, sg), lin('#7a6bff'), 1.8)
            lit.line((X0 + T + 1, 0.3, zp + sg * 0.4), (X1 - T - 1, 0.3, zp + sg * 0.4), lin('#7a6bff'), 0.12, 3.0, 'f', (0, 0.5, sg))
        # floor light lines down both aisles (glow 6 mm above the floor in a dark channel)
        for u in (-3.0, 3.0):
            (xa, za), (xb, zb) = W_(u, 1.5), W_(u, p['depth'] - 0.6); xa, xb = sorted((xa, xb))
            acc.box(xa, -0.01, za - 0.04, xb, 0.002, za + 0.04, MAT['metal'], lin('#101218'))
            gf(glow, (xa, 0.008, za - 0.015), (xb, 0.008, za - 0.015), (xb, 0.008, za + 0.015), (xa, 0.008, za + 0.015), (0, 1, 0), lin('#55b8ff'), 1.6)
    elif t == 'drive':
        # the sky is the engine's (stars, the moon); the walls far off read as night: a low horizon glow along the screen's base
        pass


def _mk(pid):
    def fn(S):
        acc, glow, lit, scr = theatre(S, pid)
        return acc, glow, lit, {'screen': scr}
    return fn


build_pvHome, build_pvJungle, build_pvWinter, build_pvSpace, build_pvDrive = (_mk(k) for k in ('HOME', 'JUNGLE', 'WINTER', 'SPACE', 'DRIVE'))
