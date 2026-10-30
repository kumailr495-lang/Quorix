"""LUMIERE hall seating, modelled headless in Blender 5.x (docs/V6-ENVIRONMENT.md, "Each hall has its own identity").

    blender --background --factory-startup --python tools/blender/seats.py -- --out www/models [--only seat_club,arm_club]

Three families, each a seat plus the arm or console shared between two seats (a row of n seats has n + 1 arms):
  * Screen 1, curved premium ("a private members' club"): seat_club = power recliner in cognac leather (plinth with a warm LED
    under-glow line, closed chaise footrest panel, crowned cushion with a welt, plush back with three pillow rolls and a headrest);
    arm_club = leather console with a walnut side-table top on a brass band and two brass cup holders.
  * Screen 2, IMAX ("spectacle and precision"): seat_rocker = high-back rocker in black leather (horizontal channel back, headrest
    pad, moulded black shell, steel rocker pedestal); arm_rocker = slim powder-coated steel blade, leather pad, chrome cup holder with a
    blue light ring.
  * Screen 3, standard ("the classic picture palace, modernised"): seat_classic = tip-up seat in teal velvet (channel back with a
    lumbar curve, waterfall cushion with a welt, moulded walnut back shell with a brass cap and a seat-number plate);
    arm_classic = black steel standard, walnut arm with a brass cup holder.
Sizes: UNIC handbook (recliners 650-900 mm wide), Octane 5063 / Acclaim spec sheets (seat 445-460 mm high, arm 620-640 mm,
arm width 62-80 mm, back 1050-1070 mm overall), the hall maths in www/js/hallmath.js (seat centres 0.60 / 0.62 / 0.86 m).

Frame (the Kiln convention the engine expects, www/js/assets.js): glTF +X = the way the sitter faces, +Y up, +Z right; floor at 0;
origin = the seat's reference point in the row. In Blender (z up) that is +X forward, +Z up, +Y left. Every part is its own
object named <Part>_LOD0 / <Part>_LOD1 with one material whose NAME is a LUMIERE library key (www/js/library.js NAMED); the
engine applies its textures by name, so the colours here are only for previews. Materials whose name starts with "glow" are light
emitters (instanced seats draw them with the library's emissive id). UVs: box projection in metres (1 UV unit = 1 m), like Kiln.
Detail rule (blender-modeling skill): parts overlap a few millimetres where they join, rounded parts are smooth-shaded.
"""
import bpy, bmesh, math, sys, os, json, argparse
from mathutils import Vector, Matrix

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ap = argparse.ArgumentParser(); ap.add_argument('--out', default='www/models'); ap.add_argument('--only', default='')
A = ap.parse_args(argv)

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lbl import *   # noqa: E402,F401  (material, rounded_box, lathe, disc, tube, rrect_path, part, rb, T, RY, RZ, PARTS, export)


# ================================================================== Screen 3: classic tip-up seat
def seat_classic():
    W, top = 0.52, 0.46
    for lod in (0, 1):
        m = 2 if lod == 0 else 1; ni = (2, 2, 2) if lod == 0 else (1, 1, 1)
        # cushion: waterfall front, crowned top, black pan under it
        part('Pan', lod, 'plastic_black', rb((0.48, W - 0.02, 0.035), 0.012, (1, 1, 1), 1), T(0.0, 0, top - 0.155))
        part('Cushion', lod, 'velvet_teal', rb((0.50, W, 0.13), 0.045, ni, m, (2, 0.016) if lod == 0 else None), T(0.02, 0, top - 0.065))
        if lod == 0: part('Welt', 0, 'velvet_charcoal', lambda bm: tube(bm, rrect_path(0.25 - 0.013, W / 2 - 0.013, 0.032, 0.0, 5), 0.0055), T(0.02, 0, top - 0.013))
        # back: inner channel back with a lumbar curve, leaning back 12 degrees, pivoting at the seat's rear edge
        BH, BW, BT = 0.58, W - 0.01, 0.095
        pivot = T(-0.23, 0, top + 0.005) @ RY(-12)
        lumbar = lambda c: (c.x + 0.022 * math.exp(-((c.z - 0.17) / 0.11) ** 2) + 0.05 * (c.y / (BW / 2)) ** 2 * 0.5, c.y, c.z)
        if lod == 0:
            n = 4; cw = BW / n
            for i in range(n):
                y = -BW / 2 + cw * (i + 0.5)
                part(f'Channel{i}', 0, 'velvet_teal', rb((BT, cw + 0.004, BH - 0.06), 0.034, (1, 1, 4), 2, (0, 0.012), at=(0.0, y, 0.03 + (BH - 0.06) / 2)), pivot, deform=lumbar)
            part('BackPad', 0, 'velvet_teal', rb((BT * 0.6, BW, BH), 0.03, (1, 2, 4), 2, at=(-0.03, 0, BH / 2)), pivot, deform=lumbar)
            for sy in (-1, 1):   # the pivot brackets the seat and back hang from, between the cushion and the arm standards
                part(f'SeatPivot{sy + 1}', 0, 'blackmetal', rb((0.07, 0.022, 0.05), 0.006, (1, 1, 1), 1), T(-0.15, sy * (W / 2 + 0.006), top - 0.12))
                part(f'BackPivot{sy + 1}', 0, 'blackmetal', rb((0.05, 0.022, 0.12), 0.006, (1, 1, 1), 1), pivot @ T(-0.04, sy * (BW / 2 + 0.01), 0.07))
        else:
            part('Back', 1, 'velvet_teal', rb((BT, BW, BH), 0.035, (1, 1, 1), 1), pivot @ T(-0.01, 0, BH / 2))
        # moulded walnut shell round the back, wrapping slightly forward at the sides; brass cap on top; number plate
        SW = W + 0.016
        wrap = lambda c: (c.x + 0.06 * (c.y / (SW / 2)) ** 2, c.y, c.z)
        part('Shell', lod, 'walnut', rb((0.022, SW, BH + 0.03), 0.011, (1, 4 if lod == 0 else 2, 2), m), pivot @ T(-0.072, 0, (BH + 0.03) / 2 - 0.02), deform=wrap)
        if lod == 0:
            part('ShellCap', 0, 'brass', rb((0.03, SW - 0.04, 0.008), 0.003, (1, 4, 1), 1), pivot @ T(-0.066, 0, BH + 0.012), deform=wrap)
            part('NumberPlate', 0, 'brass', rb((0.004, 0.07, 0.026), 0.0015, (1, 1, 1), 1), pivot @ T(-0.0855, 0, BH - 0.06), deform=wrap)


def arm_classic():
    for lod in (0, 1):
        m = 2 if lod == 0 else 1
        part('Standard', lod, 'blackmetal', rb((0.46, 0.05, 0.6), 0.014, (2, 1, 2), m), T(-0.03, 0, 0.3))
        part('Arm', lod, 'walnut', rb((0.58, 0.072, 0.036), 0.016, (3, 1, 1), m), T(0.0, 0, 0.622))
        if lod == 0:
            part('Foot', 0, 'rubber', rb((0.40, 0.064, 0.012), 0.004, (1, 1, 1), 1), T(-0.03, 0, 0.006))
            cup_holder(0, 0.215, 0, 0.640, 'brass')


# ================================================================== Screen 2: IMAX rocker
def seat_rocker():
    W, top = 0.55, 0.46
    for lod in (0, 1):
        m = 2 if lod == 0 else 1; ni = (2, 2, 2) if lod == 0 else (1, 1, 1)
        part('Pedestal', lod, 'blackmetal', rb((0.16, 0.34, 0.27), 0.03, (1, 1, 1), m), T(0.0, 0, 0.165))
        part('Cushion', lod, 'leather_black', rb((0.52, W, 0.15), 0.05, ni, m, (2, 0.014) if lod == 0 else None), T(0.03, 0, top - 0.075))
        if lod == 0: part('Welt', 0, 'leather_black', lambda bm: tube(bm, rrect_path(0.26 - 0.015, W / 2 - 0.015, 0.036, 0.0, 5), 0.005), T(0.03, 0, top - 0.015))
        BH, BW, BT = 0.74, W - 0.01, 0.12
        pivot = T(-0.24, 0, top + 0.01) @ RY(-15)
        if lod == 0:
            # contoured high back: three shallow stitched channels between two side bolsters (a winged, enveloping back), headrest pad
            rows = [(0.04, 0.16), (0.205, 0.16), (0.37, 0.16)]
            for i, (z0, hgt) in enumerate(rows):
                part(f'Channel{i}', 0, 'leather_black', rb((0.07, BW - 0.11, hgt + 0.003), 0.03, (1, 3, 1), 2, (0, 0.006)), pivot @ T(0.012, 0, z0 + hgt / 2))
            for sy in (-1, 1):
                part(f'Bolster{sy + 1}', 0, 'leather_black', rb((0.11, 0.06, 0.52), 0.028, (1, 1, 3), 2, (0, 0.008)), pivot @ T(0.02, sy * (BW / 2 - 0.03), 0.04 + 0.26))
            part('Headrest', 0, 'leather_black', rb((0.09, BW - 0.12, 0.17), 0.04, (1, 3, 1), 2, (0, 0.01)), pivot @ T(0.03, 0, 0.55 + 0.085))
            part('BackPad', 0, 'leather_black', rb((BT * 0.6, BW, BH), 0.035, (1, 2, 3), 2), pivot @ T(-0.035, 0, BH / 2))
        else:
            part('Back', 1, 'leather_black', rb((BT, BW, BH), 0.045, (1, 1, 1), 1), pivot @ T(-0.01, 0, BH / 2))
        SW = W + 0.02
        wrap = lambda c: (c.x + 0.07 * (c.y / (SW / 2)) ** 2, c.y, c.z)
        part('Shell', lod, 'plastic_black', rb((0.03, SW, BH + 0.03), 0.014, (1, 4 if lod == 0 else 2, 3 if lod == 0 else 2), m), pivot @ T(-0.088, 0, (BH + 0.03) / 2 - 0.015), deform=wrap)


def arm_rocker():
    for lod in (0, 1):
        m = 2 if lod == 0 else 1
        part('Blade', lod, 'charcoal', rb((0.44, 0.036, 0.6), 0.012, (2, 1, 2), m), T(-0.03, 0, 0.3))
        part('Pad', lod, 'leather_black', rb((0.52, 0.074, 0.042), 0.019, (3, 1, 1), m), T(0.0, 0, 0.62))
        if lod == 0:
            part('Foot', 0, 'rubber', rb((0.38, 0.05, 0.012), 0.004, (1, 1, 1), 1), T(-0.03, 0, 0.006))
            cup_holder(0, 0.205, 0, 0.642, 'chrome', glow='glow_blue')


# ================================================================== Screen 1: power recliner and console
def seat_club():
    W, top = 0.68, 0.52
    for lod in (0, 1):
        m = 2 if lod == 0 else 1; ni = (2, 2, 2) if lod == 0 else (1, 1, 1)
        part('Plinth', lod, 'blackmetal', rb((0.66, W - 0.06, 0.08), 0.012, (1, 1, 1), 1), T(-0.06, 0, 0.04))
        if lod == 0: part('Underglow', 0, 'glow_warm', rb((0.008, W - 0.12, 0.006), 0.002, (1, 2, 1), 1), T(0.272, 0, 0.074), smooth=False)
        part('Base', lod, 'leather_caramel', rb((0.80, W, 0.31), 0.05, (2, 2, 1) if lod == 0 else (1, 1, 1), m), T(-0.02, 0, 0.075 + 0.155))
        if lod == 0: part('Footrest', 0, 'leather_caramel', rb((0.05, W - 0.07, 0.25), 0.022, (1, 2, 1), 2), T(0.375, 0, 0.235))
        part('Cushion', lod, 'leather_caramel', rb((0.64, W - 0.04, 0.16), 0.06, ni, m, (2, 0.016) if lod == 0 else None), T(0.07, 0, top - 0.08))
        if lod == 0: part('Welt', 0, 'leather_oxblood', lambda bm: tube(bm, rrect_path(0.32 - 0.017, (W - 0.04) / 2 - 0.017, 0.044, 0.0, 5), 0.0055), T(0.07, 0, top - 0.018))
        BH, BW = 0.72, W
        pivot = T(-0.3, 0, 0.40) @ RY(-20)
        part('BackBody', lod, 'leather_caramel', rb((0.22, BW, BH), 0.07, (1, 2, 2) if lod == 0 else (1, 1, 1), m), pivot @ T(-0.06, 0, BH / 2))
        if lod == 0:
            for i in range(3):
                part(f'Roll{i}', 0, 'leather_caramel', rb((0.11, BW - 0.08, 0.205), 0.05, (1, 3, 1), 2, (0, 0.015)), pivot @ T(0.075, 0, 0.12 + i * 0.185))
            part('Headrest', 0, 'leather_caramel', rb((0.13, BW - 0.2, 0.17), 0.06, (1, 3, 1), 2, (0, 0.016)), pivot @ T(0.085, 0, 0.66))


def arm_club():
    for lod in (0, 1):
        m = 2 if lod == 0 else 1
        part('Plinth', lod, 'blackmetal', rb((0.66, 0.12, 0.08), 0.01, (1, 1, 1), 1), T(-0.06, 0, 0.04))
        part('Body', lod, 'leather_caramel', rb((0.80, 0.15, 0.51), 0.045, (2, 1, 2) if lod == 0 else (1, 1, 1), m), T(-0.02, 0, 0.075 + 0.255))
        part('Top', lod, 'walnut', rb((0.86, 0.17, 0.035), 0.012, (3, 1, 1), m), T(-0.01, 0, 0.6025))
        if lod == 0:
            part('Band', 0, 'brass', rb((0.866, 0.176, 0.012), 0.004, (3, 1, 1), 1), T(-0.01, 0, 0.579))
            cup_holder(0, 0.29, 0, 0.620, 'brass', glow='glow_warm', name='CupA')
            cup_holder(0, 0.165, 0, 0.620, 'brass', name='CupB')


BUILD = {'seat_classic': seat_classic, 'arm_classic': arm_classic, 'seat_rocker': seat_rocker, 'arm_rocker': arm_rocker, 'seat_club': seat_club, 'arm_club': arm_club}


report = []
for name, fn in BUILD.items():
    if A.only and name not in A.only.split(','): continue
    bpy.ops.wm.read_factory_settings(use_empty=True); PARTS.clear()
    fn(); report.append(export(name, A.out))
print('SEATS_DONE', json.dumps(report, indent=1))
