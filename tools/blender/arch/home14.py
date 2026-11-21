"""LUMIERE v14 - your flat in the Astor across the road (the user, 11-20: "you should spawn in the house na, like you have a house where you
can expand ... buy furniture, colors"). The shell is built and light-baked like the other rooms; the furniture is the engine's (www/js/home.js
places it from what you own, so buying a sofa needs no re-bake).

Plan (engine coordinates, building.js HOME: x 300..322, z 0..11, 3.2 m ceiling; you look toward -z through the window, as from the Astor's
upper floor toward the cinema):
  x 300.2..306.5  kitchen run on the west wall (tall fridge and oven tower, base units under a calacatta top with an integrated sink, a brass
                  hood, open walnut shelves), a waterfall island with an overhang for stools, the dining table by the window
  x 306.5..312.1  living room: a fluted walnut media wall on the partition (the TV, a floating console), the sofa faces it; the front door
                  in the back wall (x 309) opens on the hall of the Astor (home.js: a fade to its entrance on the far pavement)
  x 312.3..315.9  bedroom behind an oak slat screen (x 312.2 by the window, z 8 along the hallway), a built-in walnut wardrobe
  x 316.1..321.8  the home cinema (bought in the Home app; its door at z 9.6 stays locked till then): a 4.1 m screen in a velvet frame,
                  acoustic panels, a star ceiling, a riser for the second row with lit nosings
  z 0..0.3        the window wall: floor-to-ceiling glass in black frames (8 bays), sheer curtains gathered at both ends under a pelmet
                  with a wash light; the view is an engine panel 28 m out (homeview: a render of the street from the Astor's third floor)
Rules (CLAUDE.md): walls into floor and ceiling slabs; parts set 2 mm or more into what they join or 30 mm or more apart; parallel faces of
different parts 5 mm or more apart; glow quads 6 mm in front of the face they light."""
import math, random
from geo import Acc, Glow, Lights, MAT, lin, mix

PAINT = MAT['rubber']                  # library 13: flat white paint (ceilings, skirting, window head)
WALL = lin('#d9d1c6')                  # warm greige; home.js repaints library 0 in the flat live (the Home app's colours)
OAK = lin('#b3906a'); WALNUT = lin('#6a4a34'); BRASS = lin('#c9a35e'); FRAME = lin('#141416'); STONE = lin('#ece6dc')
FRONT = lin('#23302b')                 # the kitchen's lacquer fronts (library 15; home.js repaints them too)
WARM = lin('#ffd2a6'); COOL = lin('#9fb2ff')


def gf(glow, a, b, c, d, want, col, k):
    """a glow quad facing `want`, whatever order its corners come in (rooms.py glow_facing)"""
    n = (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]), (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]), (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
    glow.quad(*((a, b, c, d) if n[0] * want[0] + n[1] * want[1] + n[2] * want[2] >= 0 else (d, c, b, a)), col, k)


def build_home(S):
    H_ = S['HOME']; X0, X1, Z0, Z1, H, XS = H_['x0'], H_['x1'], H_['z0'], H_['z1'], H_['ceil'], H_['split']
    acc, glow = Acc(), Glow(); lit = Lights([X0, Z0, X1, Z1], H)
    dX = H_['door']['x']; cz = H_['cinemaDoor']['z']; XP = 312.2   # the living room / bedroom partition
    RISER.update(H_.get('riser') or {})
    # ---- slabs: oak in the flat, carpet in the cinema; white ceiling over the flat, a dark one over the cinema
    acc.box(X0, -0.3, Z0, XS, 0.0, Z1, MAT['oak'], OAK)
    acc.box(XS, -0.3, Z0, X1, 0.0, Z1, MAT['hallCarpet'], lin('#26232a'))
    acc.box(X0, H, Z0, XS, H + 0.2, Z1, PAINT, lin('#f3f0ea'))
    acc.box(XS, H, Z0, X1, H + 0.2, Z1, MAT['matte'], lin('#121216'))
    # ---- outer walls (0.2 m): the back wall runs the whole width; the side walls stop at its face (trimmed, no overlap)
    acc.wall((X0, Z1 - 0.1), (X1, Z1 - 0.1), -0.3, H + 0.2, 0.2, MAT['paint'], WALL, openings=[(dX - 0.5 - X0, dX + 0.5 - X0, 2.2, -0.3)])
    acc.wall((X0 + 0.1, Z0), (X0 + 0.1, Z1 - 0.2), -0.3, H + 0.2, 0.2, MAT['paint'], WALL)
    acc.wall((X1 - 0.1, Z1 - 0.2), (X1 - 0.1, Z0), -0.3, H + 0.2, 0.2, MAT['matte'], lin('#1c1b20'))
    # the cinema's front (screen) wall and its partition with the flat (the door to the hallway at z = cz)
    acc.wall((XS + 0.1, Z0 + 0.1), (X1 - 0.2, Z0 + 0.1), -0.3, H + 0.2, 0.2, MAT['matte'], lin('#1c1b20'))
    acc.wall((XS, Z0), (XS, Z1 - 0.2), -0.3, H + 0.2, 0.2, MAT['paint'], WALL, openings=[(cz - 0.5 - Z0, cz + 0.5 - Z0, 2.15, -0.3)])
    # the partition's cinema face: dark (a thin lining 2 mm into the wall, the door's opening left clear)
    for za, zb in ((Z0 + 0.198, cz - 0.56), (cz + 0.56, Z1 - 0.198)):
        acc.box(XS + 0.098, -0.02, za, XS + 0.112, H + 0.01, zb, MAT['matte'], lin('#1c1b20'))
    # ---- the window wall: a head down to 2.95, frames, mullions, glass; the glazing line at z 0.10
    WX0, WX1 = X0 + 0.2, XS - 0.1
    acc.box(WX0 - 0.02, 2.95, Z0, WX1 + 0.02, H + 0.2, Z0 + 0.2, PAINT, lin('#f3f0ea'))
    acc.box(WX0 - 0.02, -0.02, Z0 + 0.04, WX1 + 0.02, 0.06, Z0 + 0.16, MAT['powder'], FRAME)          # sill rail, 2 cm into the floor
    acc.box(WX0 - 0.02, 2.89, Z0 + 0.04, WX1 + 0.02, 2.97, Z0 + 0.16, MAT['powder'], FRAME)          # head rail, 2 cm into the head
    nb = 8; bw = (WX1 - WX0) / nb
    for i in range(nb + 1):
        x = WX0 + i * bw; xa, xb = (x - 0.02, x + 0.05) if i == 0 else ((x - 0.05, x + 0.02) if i == nb else (x - 0.025, x + 0.025))
        acc.box(xa, 0.05, Z0 + 0.04, xb, 2.9, Z0 + 0.16, MAT['powder'], FRAME)                          # mullions (the end ones 2 cm into the walls)
    for i in range(nb):
        xa = WX0 + i * bw + (0.045 if i == 0 else 0.02); xb = WX0 + (i + 1) * bw - (0.045 if i == nb - 1 else 0.02)
        acc.box(xa, 0.055, Z0 + 0.094, xb, 2.895, Z0 + 0.106, MAT['glass'], lin('#9aa4ae'))            # glass, 5 mm into its frame
    # pelmet: a fascia 0.45 m in from the glass hides the curtain track and a wash light in the pocket above the curtains
    acc.box(WX0 - 0.02, 2.88, Z0 + 0.42, WX1 + 0.02, H + 0.01, Z0 + 0.45, PAINT, lin('#f3f0ea'))
    lit.line((WX0 + 0.3, H - 0.05, Z0 + 0.3), (WX1 - 0.3, H - 0.05, Z0 + 0.3), WARM, 0.3, 4.0, 'h', (0, -1, 0.15))
    # sheer curtains gathered at both ends (pleats as a zigzag band; the band reaches 5 mm into the floor and into the pocket's top)
    for xa, xb in ((WX0 + 0.06, WX0 + 1.3), (WX1 - 1.3, WX1 - 0.06)):
        n = int((xb - xa) / 0.015); path = [(xa + (xb - xa) * k / n, Z0 + 0.31 + 0.03 * math.sin(2 * math.pi * (xb - xa) * k / n / 0.11)) for k in range(n + 1)]
        acc.band(path, -0.005, H + 0.005, -0.003, 0.003, MAT['acoustic'], lin('#e8e1d4'), smooth=60.0)
    # the city's glow through the glass (fixed: it stays when you dim your lights)
    lit.area(((WX0 + WX1) / 2, 1.6, Z0 + 0.3), ((WX1 - WX0) / 2 - 0.4, 0, 0), (0, 1.2, 0), (0, 0, 1), COOL, 2.2, 9, 'f', 4, 2)
    # ---- skirting (flat white, 9 cm, 15 mm proud, 2 mm into the wall) round the flat, stopped 1 cm into door linings
    sk = lambda x0, z0, x1, z1: acc.box(x0, -0.01, z0, x1, 0.09, z1, PAINT, lin('#f3f0ea'))
    sk(X0 + 0.198, Z0 + 0.45, X0 + 0.215, Z1 - 0.2)                                                    # west (behind the kitchen it is hidden)
    sk(X0 + 0.2, Z1 - 0.215, dX - 0.52, Z1 - 0.198); sk(dX + 0.52, Z1 - 0.215, XS - 0.1, Z1 - 0.198)   # back, either side of the front door
    sk(XS - 0.115, Z0 + 0.45, XS - 0.098, cz - 0.58); sk(XS - 0.115, cz + 0.58, XS - 0.098, Z1 - 0.2)  # the cinema partition's flat side
    for z0_, z1_ in ((cz - 0.6, cz - 0.5 + 0.02), (cz + 0.5 - 0.02, cz + 0.6)):   # that door's architraves (the leaf is home.js's)
        acc.box(XS - 0.1 - 0.022, -0.005, z0_, XS - 0.1 + 0.002, 2.24, z1_, PAINT, lin('#f3f0ea'))
    acc.box(XS - 0.1 - 0.022, 2.15 - 0.012, cz - 0.6, XS - 0.1 + 0.002, 2.24, cz + 0.6, PAINT, lin('#f3f0ea'))
    # ---- front door: linings and stops in the opening, a walnut leaf (2 mm into the linings), architraves, a brass lever
    LW = 0.03
    acc.box(dX - 0.5 - 0.002, -0.01, Z1 - 0.2, dX - 0.5 + LW, 2.2 + 0.002, Z1, PAINT, lin('#efebe4'))
    acc.box(dX + 0.5 - LW, -0.01, Z1 - 0.2, dX + 0.5 + 0.002, 2.2 + 0.002, Z1, PAINT, lin('#efebe4'))
    acc.box(dX - 0.5 + LW - 0.002, 2.2 - LW, Z1 - 0.2, dX + 0.5 - LW + 0.002, 2.2 + 0.002, Z1, PAINT, lin('#efebe4'))
    acc.box(dX - 0.5 + LW - 0.002, -0.005, Z1 - 0.12, dX + 0.5 - LW + 0.002, 2.2 - LW + 0.002, Z1 - 0.08, MAT['wood'], WALNUT)   # the leaf
    for s in (-1, 1):   # stiles' brass inlay lines on the room face (5 mm proud, 2 mm in)
        acc.box(dX + s * 0.3 - 0.004, 0.25, Z1 - 0.126, dX + s * 0.3 + 0.004, 1.95, Z1 - 0.118, MAT['brass'], BRASS)
    acc.box(dX + 0.33, 1.02, Z1 - 0.134, dX + 0.39, 1.08, Z1 - 0.118, MAT['brass'], BRASS)               # rose
    acc.box(dX + 0.35, 1.04, Z1 - 0.165, dX + 0.37, 1.06, Z1 - 0.13, MAT['brass'], BRASS)                # stem
    acc.box(dX + 0.2, 1.04, Z1 - 0.18, dX + 0.37, 1.06, Z1 - 0.16, MAT['brass'], BRASS)                  # lever, 40 mm off the leaf
    for x0, x1 in ((dX - 0.6, dX - 0.5 + 0.02), (dX + 0.5 - 0.02, dX + 0.6)):
        acc.box(x0, -0.005, Z1 - 0.222, x1, 2.29, Z1 - 0.198, PAINT, lin('#f3f0ea'))                    # architraves (the skirting stops 2 cm into them)
    acc.box(dX - 0.6, 2.2 + 0.002 - 0.012, Z1 - 0.222, dX + 0.6, 2.29, Z1 - 0.198, PAINT, lin('#f3f0ea'))
    # light switch plate by the door (home.js: tap it to dim the flat's lights), an indicator dot
    acc.box(dX + 0.72, 1.0, Z1 - 0.212, dX + 0.8, 1.08, Z1 - 0.198, MAT['brass'], BRASS)
    gf(glow, (dX + 0.755, 1.03, Z1 - 0.2185), (dX + 0.765, 1.03, Z1 - 0.2185), (dX + 0.765, 1.04, Z1 - 0.2185), (dX + 0.755, 1.04, Z1 - 0.2185), (0, 0, -1), lin('#ffb060'), 2.0)
    # coat hooks (three brass knobs on a walnut rail) east of the door
    acc.box(dX + 1.2, 1.62, Z1 - 0.222, dX + 2.3, 1.72, Z1 - 0.198, MAT['wood'], WALNUT)
    for k in range(3): acc.box(dX + 1.4 + k * 0.35, 1.655, Z1 - 0.27, dX + 1.44 + k * 0.35, 1.685, Z1 - 0.22, MAT['brass'], BRASS)
    # ---- kitchen: tall units (fridge, oven tower), base run, island
    kitchen(acc, glow, lit, X0 + 0.2, Z1 - 0.2, H)
    # ---- the living room's media wall on the partition and the slat screens
    XPa, XPb = XP - 0.075, XP + 0.075
    acc.wall((XP, 3.2), (XP, 8.0), -0.3, H + 0.2, 0.15, MAT['paint'], WALL)
    acc.box(XPa - 0.03, -0.01, 4.3, XPa + 0.002, H + 0.002, 7.3, MAT['fluted'], lin('#7a5438'))      # fluted walnut, 30 mm proud, into floor and ceiling
    acc.box(XPa - 0.48, 0.3, 4.6, XPa - 0.025, 0.62, 7.0, MAT['wood'], WALNUT)                          # floating console, 5 mm into the fluting
    gf(glow, (XPa - 0.4, 0.286, 4.7), (XPa - 0.4, 0.286, 6.9), (XPa - 0.1, 0.286, 6.9), (XPa - 0.1, 0.286, 4.7), (0, -1, 0), lin('#ffcf9a'), 1.2)
    lit.line((XPa - 0.25, 0.25, 4.7), (XPa - 0.25, 0.25, 6.9), WARM, 0.18, 2.0, 'h', (0, -1, 0))
    # a grazing light down the fluting from a surface profile on the ceiling
    acc.box(XPa - 0.16, H - 0.03, 4.3, XPa - 0.1, H + 0.01, 7.3, MAT['metal'], lin('#2a2a2e'))
    gf(glow, (XPa - 0.152, H - 0.036, 4.32), (XPa - 0.108, H - 0.036, 4.32), (XPa - 0.108, H - 0.036, 7.28), (XPa - 0.152, H - 0.036, 7.28), (0, -1, 0), WARM, 1.8)
    lit.line((XPa - 0.13, H - 0.08, 4.4), (XPa - 0.13, H - 0.08, 7.2), WARM, 0.45, 3.5, 'h', (0.5, -1, 0))
    # oak slat screens: by the window (x = XP, z 0.5..3.15) and along the hallway (z = 8, x 313.3..315.85)
    z = 0.5
    SLAT = lin('#b08458')   # walnut texture in an oak tone (library 2): the floor's oak (42) alone takes the Home app's floor colour
    while z + 0.04 <= 3.2 - 0.05 + 1e-6: acc.box(XP - 0.02, -0.01, z, XP + 0.02, H + 0.01, z + 0.04, MAT['wood'], SLAT); z += 0.09
    x = 313.35
    while x + 0.04 <= XS - 0.1 - 0.035 + 1e-6: acc.box(x, -0.01, 7.98, x + 0.04, H + 0.01, 8.02, MAT['wood'], SLAT); x += 0.09
    # ---- bedroom: a built-in walnut wardrobe on the partition's bedroom face (home.js: it opens the outfit picker)
    wz0, wz1 = 3.3, 5.7; wx0, wx1 = XPb - 0.002, XPb + 0.6
    acc.box(wx0, -0.01, wz0, wx1, H + 0.01, wz1, MAT['wood'], lin('#4e3726'))
    nd = 4; dw = (wz1 - wz0 - 0.04) / nd
    for i in range(nd):
        za = wz0 + 0.02 + i * dw + 0.0015; zb = za + dw - 0.003
        acc.box(wx1 - 0.002, 0.1, za, wx1 + 0.018, H - 0.1, zb, MAT['wood'], WALNUT)                        # doors (3 mm reveals)
        zp = zb - 0.06 if i % 2 == 0 else za + 0.06
        acc.box(wx1 + 0.016, 0.95, zp - 0.008, wx1 + 0.04, 1.55, zp + 0.008, MAT['brass'], BRASS)           # pulls, 2 mm into the doors
    # ---- the home cinema
    cinema(acc, glow, lit, XS + 0.1, X1 - 0.2, Z0 + 0.2, Z1 - 0.2, H, cz)
    # ---- the flat's lights: warm downlights (2700 K), pendants' light (the pendants are home.js props), ambient
    lights_grid(lit, acc, glow, 307.2, 1.6, 311.2, 7.4, H, 2.0, WARM, 0.85, 5.0)
    lights_grid(lit, acc, glow, 301.6, 1.6, 304.8, 1.6, H, 3.2, WARM, 0.8, 5.0)
    lights_grid(lit, acc, glow, 301.5, 9.3, 304.9, 9.3, H, 3.4, WARM, 0.8, 5.0)
    lights_grid(lit, acc, glow, 313.3, 1.6, 315.1, 7.0, H, 1.8, WARM, 0.6, 4.5)
    lights_grid(lit, acc, glow, 307.4, 9.5, 314.8, 9.5, H, 2.5, WARM, 0.7, 4.5)
    for z_ in (6.55, 7.3, 8.05): lit.point((302.75, 2.15, z_), lin('#ffd9b0'), 0.55, 4.0, 'h')            # the island's three pendants
    lit.point((302.9, 1.95, 2.6), lin('#ffd9b0'), 0.7, 4.0, 'h')                                         # over the dining table
    lit.point((315.6, 1.05, 2.82), lin('#ffcf9a'), 0.35, 3.0, 'h'); lit.point((315.6, 1.05, 5.58), lin('#ffcf9a'), 0.35, 3.0, 'h')   # bedside lamps (home.js)
    lit.point((308.2, 1.65, 3.4), lin('#ffcf9a'), 0.45, 3.5, 'h')                                          # the floor lamp by the sofa (home.js)
    lit.ambient(lin('#fff1e2'), lin('#d8cdbf'), 0.09, 'h')
    # the view (tools/dev/homeview.mjs renders it with the same numbers): 27.9 m out along the camera's axis, turned 14 degrees east, 130
    # degrees across at the image's 2.4:1
    VD, VY, VH = 27.9, math.radians(-14), math.radians(130); vw = 2 * VD * math.tan(VH / 2); vh = vw / 2.4
    panels = [{'id': 'homeview', 'x': (WX0 + WX1) / 2 - math.sin(VY) * VD, 'y': 1.6, 'z': Z0 + 0.1 - math.cos(VY) * VD, 'yaw': VY, 'w': round(vw, 2), 'h': round(vh, 2), 'emit': 1},
              {'id': 'homescreen', 'x': (XS + 0.1 + X1 - 0.2) / 2 - 0.05, 'y': 1.705, 'z': Z0 + 0.252, 'yaw': 0.0, 'w': 4.1, 'h': 2.31, 'emit': 1}]
    return acc, glow, lit, {'panels': panels}


def kitchen(acc, glow, lit, xw, zb, H):
    """the run on the west wall (face xw) from z 5.4 to the back wall (face zb): tall units at the back, base units with an integrated
    calacatta sink and a black hob, a calacatta backsplash, two walnut shelves with LED under them, a brass hood; then the island"""
    D = 0.65; xf = xw + D; zt = zb - 1.2; z0 = 5.4
    # tall units: fridge (two doors) and an oven tower, a bulkhead above them to the ceiling
    acc.box(xw - 0.002, -0.01, zt, xf, 2.4, zb + 0.002, MAT['lacquer'], FRONT)
    acc.box(xw - 0.002, 2.4, zt, xf, H + 0.01, zb + 0.002, PAINT, lin('#f3f0ea'))
    zm = zt + 0.6
    for za, zc, y0, y1 in ((zt + 0.003, zm - 0.0015, 0.1, 1.6), (zt + 0.003, zm - 0.0015, 1.603, 2.39), (zm + 0.0015, zb - 0.003, 0.1, 0.55), (zm + 0.0015, zb - 0.003, 1.42, 2.39)):
        acc.box(xf - 0.002, y0, za, xf + 0.018, y1, zc, MAT['lacquer'], FRONT)
    acc.box(xf - 0.002, 0.553, zm + 0.0015, xf + 0.014, 1.417, zb - 0.003, MAT['powder'], lin('#0b0b0d'))   # oven and microwave: dark glass
    acc.box(xf + 0.012, 1.36, zm + 0.08, xf + 0.04, 1.38, zb - 0.08, MAT['chrome'], lin('#d6d8dc'))           # oven bar handle
    acc.box(xf + 0.012, 1.0, zm + 0.08, xf + 0.03, 1.012, zb - 0.08, MAT['chrome'], lin('#d6d8dc'))          # its display's lip
    gf(glow, (xf + 0.0205, 1.2, zm + 0.25), (xf + 0.0205, 1.2, zb - 0.25), (xf + 0.0205, 1.26, zb - 0.25), (xf + 0.0205, 1.26, zm + 0.25), (1, 0, 0), lin('#7fd1ff'), 0.9)
    for y_ in (1.52, 0.92): acc.box(xf + 0.016, y_, zt + 0.48, xf + 0.04, y_ + 0.4, zt + 0.496, MAT['brass'], BRASS)   # fridge pulls
    # base run: plinth (recessed), carcass, fronts, counter, sink, hob
    acc.box(xw - 0.002, -0.01, z0 + 0.02, xf - 0.06, 0.1, zt, MAT['powder'], lin('#121214'))
    acc.box(xw - 0.002, 0.1, z0, xf, 0.9, zt, MAT['lacquer'], FRONT)
    n = 7; dw = (zt - z0) / n
    for i in range(n):
        za = z0 + i * dw + 0.0015; zc = za + dw - 0.003
        acc.box(xf - 0.002, 0.11, za, xf + 0.018, 0.902, zc, MAT['lacquer'], FRONT)                         # up 2 mm into the counter
        acc.box(xf + 0.016, 0.79, za + dw * 0.25, xf + 0.038, 0.806, zc - dw * 0.25, MAT['brass'], BRASS)
    zs0, zs1 = z0 + 3.0, z0 + 3.7; xs0, xs1 = xw + 0.12, xw + 0.52   # the sink's opening
    TOP = 0.94
    acc.box(xw - 0.002, 0.9, z0 - 0.02, xf + 0.05, TOP, zs0, MAT['calacatta'], STONE)
    acc.box(xw - 0.002, 0.9, zs1, xf + 0.05, TOP, zt + 0.002, MAT['calacatta'], STONE)
    acc.box(xw - 0.002, 0.9, zs0 - 0.002, xs0, TOP, zs1 + 0.002, MAT['calacatta'], STONE)
    acc.box(xs1, 0.9, zs0 - 0.002, xf + 0.05, TOP, zs1 + 0.002, MAT['calacatta'], STONE)
    # an integrated stone sink: a calacatta tub under the opening, its walls flush with the counter's cut faces, a chrome drain
    acc.box(xs0 - 0.002, 0.74, zs0 - 0.002, xs1 + 0.002, 0.76, zs1 + 0.002, MAT['calacatta'], STONE)
    acc.box(xs0 - 0.02, 0.74, zs0 - 0.02, xs0, 0.9, zs1 + 0.02, MAT['calacatta'], STONE); acc.box(xs1, 0.74, zs0 - 0.02, xs1 + 0.02, 0.9, zs1 + 0.02, MAT['calacatta'], STONE)
    acc.box(xs0 - 0.02, 0.74, zs0 - 0.02, xs1 + 0.02, 0.9, zs0, MAT['calacatta'], STONE); acc.box(xs0 - 0.02, 0.74, zs1, xs1 + 0.02, 0.9, zs1 + 0.02, MAT['calacatta'], STONE)
    acc.cyl((xs0 + xs1) / 2, (zs0 + zs1) / 2, 0.035, 0.755, 0.766, MAT['chrome'], lin('#d6d8dc'), n=16)
    acc.box(xw + 0.08, TOP - 0.003, z0 + 0.9, xw + 0.58, TOP + 0.006, z0 + 1.6, MAT['powder'], lin('#0a0a0c'))   # hob (6 mm proud)
    # backsplash, shelves, hood
    acc.box(xw - 0.002, TOP - 0.002, z0 - 0.02, xw + 0.018, 1.5, zt + 0.002, MAT['calacatta'], STONE)
    for y_ in (1.6, 2.0):
        acc.box(xw - 0.002, y_, z0 + 1.9, xw + 0.3, y_ + 0.04, zt - 0.08, MAT['wood'], WALNUT)
        gf(glow, (xw + 0.05, y_ - 0.006, z0 + 1.95), (xw + 0.05, y_ - 0.006, zt - 0.13), (xw + 0.12, y_ - 0.006, zt - 0.13), (xw + 0.12, y_ - 0.006, z0 + 1.95), (0, -1, 0), WARM, 1.1)
        lit.line((xw + 0.1, y_ - 0.02, z0 + 2.0), (xw + 0.1, y_ - 0.02, zt - 0.2), WARM, 0.22, 2.2, 'h', (0.3, -1, 0))
    hz0, hz1 = z0 + 0.85, z0 + 1.65
    acc.prism([(xw - 0.002, hz0), (xw + 0.55, hz0), (xw + 0.55, hz1), (xw - 0.002, hz1)], 1.72, 1.86, MAT['brass'], BRASS)
    acc.prism([(xw - 0.002, hz0 + 0.2), (xw + 0.3, hz0 + 0.2), (xw + 0.3, hz1 - 0.2), (xw - 0.002, hz1 - 0.2)], 1.855, H + 0.01, MAT['brass'], BRASS)
    gf(glow, (xw + 0.1, 1.714, hz0 + 0.15), (xw + 0.45, 1.714, hz0 + 0.15), (xw + 0.45, 1.714, hz1 - 0.15), (xw + 0.1, 1.714, hz1 - 0.15), (0, -1, 0), lin('#fff1dc'), 1.4)
    lit.spot((xw + 0.3, 1.68, (hz0 + hz1) / 2), lin('#fff1dc'), 0.35, 2.5, 'h', (0, -1, 0), 30, 70)
    # the island (waterfall calacatta ends, fronts toward the run, an overhang for stools on the living side)
    ix0, ix1, iz0, iz1 = xw + 1.8, xw + 2.9, 6.0, 8.6
    acc.box(ix0 + 0.11, -0.01, iz0 + 0.04, ix1 - 0.31, 0.1, iz1 - 0.04, MAT['powder'], lin('#121214'))
    acc.box(ix0 + 0.05, 0.1, iz0 + 0.04, ix1 - 0.3, 0.9, iz1 - 0.04, MAT['lacquer'], FRONT)
    n = 4; dw = (iz1 - iz0 - 0.076) / n
    for i in range(n):
        za = iz0 + 0.038 + i * dw + (0.0015 if i else 0.0); zc = iz0 + 0.038 + (i + 1) * dw - (0.0015 if i < n - 1 else 0.0)   # the end doors 2 mm into the waterfall ends
        acc.box(ix0 + 0.032, 0.11, za, ix0 + 0.052, 0.902, zc, MAT['lacquer'], FRONT)
        acc.box(ix0 + 0.01, 0.79, za + dw * 0.25, ix0 + 0.034, 0.806, zc - dw * 0.25, MAT['brass'], BRASS)
    acc.box(ix0 - 0.02, 0.9, iz0, ix1 + 0.3, TOP, iz1, MAT['calacatta'], STONE)
    for za, zc in ((iz0, iz0 + 0.04), (iz1 - 0.04, iz1)): acc.box(ix0 - 0.02, -0.005, za, ix1 + 0.3, 0.9, zc, MAT['calacatta'], STONE)   # waterfall ends, up to the top's underside
    acc.box(ix1 - 0.302, 0.12, iz0 + 0.038, ix1 - 0.29, 0.86, iz1 - 0.038, MAT['wood'], WALNUT)          # the overhang's back panel (the plinth stops 1 cm short of it)
    gf(glow, (ix1 + 0.25, 0.894, iz0 + 0.08), (ix1 - 0.2, 0.894, iz0 + 0.08), (ix1 - 0.2, 0.894, iz1 - 0.08), (ix1 + 0.25, 0.894, iz1 - 0.08), (0, -1, 0), lin('#ffcf9a'), 0.6)


RISER = {'z0': 6.3, 'z1': 8.9, 'y': 0.25}


def cinema(acc, glow, lit, x0, x1, z0, z1, H, cz):
    """the home cinema: screen and velvet masking on the front wall (z0), acoustic panels and sconces on both sides, a riser with lit
    nosings for the second row, a star ceiling; the seats, speakers and the popcorn corner are home.js props"""
    VEL = lin('#0b0b0e'); xc = (x0 + x1) / 2 - 0.05
    acc.box(xc - 2.05, 0.55, z0 - 0.002, xc + 2.05, 2.86, z0 + 0.04, MAT['matte'], lin('#d8d8d8'))         # the screen (the panel draws 12 mm in front)
    for a, b in (((xc - 2.2, 0.42), (xc - 2.05, 3.0)), ((xc + 2.05, 0.42), (xc + 2.2, 3.0)), ((xc - 2.05, 2.86), (xc + 2.05, 3.0)), ((xc - 2.05, 0.42), (xc + 2.05, 0.55))):
        acc.box(a[0], a[1], z0 - 0.002, b[0], b[1], z0 + 0.07, MAT['velvet'], VEL)                          # masking, 3 cm proud of the screen
    # acoustic panels (fabric over 5 cm frames, 2 mm into the wall), 0.3 m apart
    def panels_x(xw, sgn, za, zb):
        n = int((zb - za + 0.3) / 1.5); w = (zb - za - 0.3 * (n - 1)) / n
        for i in range(n):
            a = za + i * (w + 0.3); x_a, x_b = sorted((xw - sgn * 0.002, xw + sgn * 0.05))
            acc.box(x_a, 0.8, a, x_b, 2.55, a + w, MAT['acoustic'], lin('#2a2f3d'))
        return [za + i * (w + 0.3) - 0.15 for i in range(1, n)]
    for xw, sgn, za, zb in ((x1, -1, z0 + 0.6, z1 - 0.9), (x0 + 0.012, 1, z0 + 0.6, cz - 0.9)):
        for zz in panels_x(xw, sgn, za, zb)[::2]:   # sconces in every other gap: brass boxes washing up from a lit top
            xa, xb = sorted((xw - sgn * 0.002, xw + sgn * 0.07))
            acc.box(xa, 1.85, zz - 0.05, xb, 2.15, zz + 0.05, MAT['brass'], BRASS)
            gf(glow, (xw + sgn * 0.01, 2.156, zz - 0.04), (xw + sgn * 0.01, 2.156, zz + 0.04), (xw + sgn * 0.065, 2.156, zz + 0.04), (xw + sgn * 0.065, 2.156, zz - 0.04), (0, 1, 0), lin('#ffcf9a'), 1.4)
            lit.point((xw + sgn * 0.25, 2.3, zz), lin('#ffcf9a'), 0.22, 3.0, 'h')
    # the riser (0.25 m) for the second row, lit nosings front and back
    rz0, rz1, ry = RISER['z0'], RISER['z1'], RISER['y']
    acc.box(x0 - 0.002, -0.01, rz0, x1 + 0.002, ry, rz1, MAT['hallCarpet'], lin('#26232a'))
    for zf, d in ((rz0, -1), (rz1, 1)):
        acc.box(x0 + 0.01, ry - 0.035, zf - 0.006 if d < 0 else zf - 0.002, x1 - 0.01, ry - 0.01, zf + 0.002 if d < 0 else zf + 0.006, MAT['metal'], lin('#2a2a2e'))
        gf(glow, (x0 + 0.05, ry - 0.03, zf + d * 0.0125), (x1 - 0.05, ry - 0.03, zf + d * 0.0125), (x1 - 0.05, ry - 0.015, zf + d * 0.0125), (x0 + 0.05, ry - 0.015, zf + d * 0.0125), (0, 0, d), lin('#ffb060'), 1.6)
        lit.line((x0 + 0.2, ry - 0.02, zf + d * 0.1), (x1 - 0.2, ry - 0.02, zf + d * 0.1), lin('#ffb060'), 0.05, 1.2, 'f', (0, -1, 0))
    # the star ceiling: fibre points 6 mm under the dark ceiling
    rnd = random.Random(1414)
    for _ in range(150):
        x = rnd.uniform(x0 + 0.3, x1 - 0.3); z = rnd.uniform(z0 + 0.3, z1 - 0.3); s = rnd.choice((0.008, 0.008, 0.012, 0.016)); k = rnd.uniform(1.2, 3.0)
        gf(glow, (x - s, H - 0.006, z + s), (x + s, H - 0.006, z + s), (x + s, H - 0.006, z - s), (x - s, H - 0.006, z - s), (0, -1, 0), lin('#fff4e0'), k)
    # the door's linings in the partition (the leaf is home.js's: it opens once the room is yours)
    for za, zb in ((cz - 0.5 - 0.002, cz - 0.5 + 0.03), (cz + 0.5 - 0.03, cz + 0.5 + 0.002)):
        acc.box(x0 - 0.2, -0.01, za, x0 + 0.002, 2.15 + 0.002, zb, PAINT, lin('#efebe4'))
    acc.box(x0 - 0.2, 2.12, cz - 0.5 + 0.028, x0 + 0.002, 2.152, cz + 0.5 - 0.028, PAINT, lin('#efebe4'))
    lit.ambient(lin('#1a1a22'), lin('#0e0e12'), 0.02, 'f')


def lights_grid(lit, acc, glow, x0, z0, x1, z1, y, step, col, I, r, ch='h'):
    """downlights: a dark can 2 cm under the ceiling, its lens glowing 6 mm under the can, a spot down"""
    nx = max(1, int(round((x1 - x0) / step))) if x1 - x0 > 1e-6 else 0; nz = max(1, int(round((z1 - z0) / step))) if z1 - z0 > 1e-6 else 0
    for i in range(nx + 1):
        for j in range(nz + 1):
            x = x0 + (x1 - x0) * (i / nx if nx else 0); z = z0 + (z1 - z0) * (j / nz if nz else 0)
            lit.spot((x, y - 0.05, z), col, I, r, ch, (0, -1, 0), 25, 62)
            acc.cyl(x, z, 0.06, y - 0.02, y + 0.01, MAT['metal'], lin('#d6d2cc'), n=16)
            gf(glow, (x - 0.04, y - 0.026, z - 0.04), (x + 0.04, y - 0.026, z - 0.04), (x + 0.04, y - 0.026, z + 0.04), (x - 0.04, y - 0.026, z + 0.04), (0, -1, 0), col, 2.0)
