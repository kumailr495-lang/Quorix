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
from lbl import *   # noqa: E402,F401  (material, rounded_box, lathe, disc, tube, rrect_path, part, rb, pillow, T, RY, RZ, PARTS, export)


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


# ================================================================== MAX and X-270: high-back stadium rocker (v9.2 rebuild)
# Tailored, not inflated: cushions are subdivided cages with tight support loops (edges round to 2-3 cm), stitched channels are
# creases with their own support loops, the moulded shell wraps the cushion from behind with forward-curving sides, a narrower waist
# and soft shoulders. Seat 460 mm high, back to about 1.2 m, the arm pad at 640 mm (Octane / Ferco high-back sheets).
def seat_rocker():
    W, top = 0.55, 0.46
    for lod in (0, 1):
        lv = 1 if lod == 0 else 0
        if lod == 0:   # the rocker mechanism and seat pan: hidden past a few metres
            part('Pedestal', 0, 'blackmetal', rb((0.14, 0.26, 0.30), 0.015, (1, 1, 1), 1), T(-0.06, 0, 0.15))
            part('Pan', 0, 'plastic_black', pillow((0.46, W - 0.04, 0.05), 0.012, levels=0), T(0.0, 0, 0.335))
        part('Cushion', lod, 'leather_black', pillow((0.50, W, 0.12), 0.03, crown=[(2, 1, 0.016), (0, 1, 0.012)], levels=lv, extra=((0.0,), (0.0,), ()) if lod == 0 else ((), (), ())), T(0.035, 0, top - 0.06))
        if lod == 0: part('Welt', 0, 'leather_black', lambda bm: tube(bm, rrect_path(0.25 - 0.014, W / 2 - 0.014, 0.03, 0.0, 5), 0.0045), T(0.035, 0, top - 0.004))
        pivot = T(-0.235, 0, top + 0.01) @ RY(-14)
        hy = (W - 0.02) / 2
        wings = lambda c: (c[0] + 0.05 * (abs(c[1]) / hy) ** 3 + 0.022 * math.exp(-((c[2] + 0.17) / 0.1) ** 2), c[1], c[2])
        cr = [(0, 1, 2, z, 0.013, 0.016) for z in (-0.10, 0.02, 0.14)]
        part('BackCushion', lod, 'leather_black', pillow((0.10, W - 0.02, 0.56), 0.028, crown=[(0, 1, 0.018)], creases=cr if lod == 0 else (), shape=wings, levels=lv, extra=((), (0.0,), ())), pivot @ T(0.0, 0, 0.31))
        part('Headrest', lod, 'leather_black', pillow((0.09, 0.40, 0.13), 0.035, crown=[(0, 1, 0.016)], levels=lv), pivot @ T(0.012, 0, 0.665))
        hs, zs = (W + 0.03) / 2, 0.40
        shell = lambda c: (c[0] + 0.07 * (c[1] / hs) ** 2, c[1] * (0.9 + 0.1 * (c[2] + zs) / (2 * zs)), c[2] - (0.07 * (abs(c[1]) / hs) ** 3 * c[2] / zs if c[2] > 0 else 0.0))
        part('Shell', lod, 'plastic_black', pillow((0.035, W + 0.03, 0.80), 0.012, shape=shell, levels=0, extra=((), (-0.15, 0.0, 0.15), (-0.2, 0.0, 0.2) if lod == 0 else ())), pivot @ T(-0.072, 0, 0.38))


def arm_rocker():
    for lod in (0, 1):
        lv = 1 if lod == 0 else 0
        taper = lambda c: (c[0] * (0.82 + 0.18 * (c[2] + 0.29) / 0.58), c[1], c[2])
        part('Standard', lod, 'plastic_black', pillow((0.46, 0.05, 0.58), 0.012, shape=taper, levels=0), T(-0.03, 0, 0.29))
        part('Pad', lod, 'leather_black', pillow((0.52, 0.09, 0.045), 0.02, crown=[(2, 1, 0.006)], levels=lv), T(0.0, 0, 0.615))
        if lod == 0:
            part('Foot', 0, 'rubber', rb((0.38, 0.056, 0.012), 0.004, (1, 1, 1), 1), T(-0.03, 0, 0.006))
            cup_holder(0, 0.205, 0, 0.64, 'plastic_black', glow='glow_blue', seg=16)


# ================================================================== Curved premium hall, sofas and pods: power recliner (v9.2 rebuild)
# Upholstered base whose front is the closed footrest panel, a crowned seat cushion with a contrast welt, a deep back with a lumbar
# seam and side wings, a pillow-top headrest resting on it; consoles between seats carry a walnut top with brass cup holders.
def seat_club():
    W, top = 0.76, 0.52
    for lod in (0, 1):
        lv = 1 if lod == 0 else 0
        part('Plinth', lod, 'blackmetal', rb((0.64, W - 0.08, 0.07), 0.01, (1, 1, 1), 1), T(-0.07, 0, 0.035))
        if lod == 0: part('Underglow', 0, 'glow_warm', rb((0.008, W - 0.14, 0.006), 0.002, (1, 2, 1), 1), T(0.252, 0, 0.066), smooth=False)
        part('Base', lod, 'leather_chocolate', pillow((0.70, W, 0.30), 0.03, levels=lv), T(-0.05, 0, 0.065 + 0.15))
        part('Footrest', lod, 'leather_chocolate', pillow((0.06, W - 0.05, 0.27), 0.022, crown=[(0, 1, 0.01)], levels=lv, extra=((), (0.0,), ()) if lod == 0 else ((), (), ())), T(0.32, 0, 0.225))
        part('Cushion', lod, 'leather_chocolate', pillow((0.60, W - 0.03, 0.15), 0.035, crown=[(2, 1, 0.02), (0, 1, 0.015)], levels=lv, extra=((0.0,), (0.0,), ()) if lod == 0 else ((), (), ())), T(0.03, 0, top - 0.075))
        if lod == 0: part('Welt', 0, 'leather_oxblood', lambda bm: tube(bm, rrect_path(0.30 - 0.016, (W - 0.03) / 2 - 0.016, 0.04, 0.0, 5), 0.005), T(0.03, 0, top - 0.003))
        pivot = T(-0.29, 0, 0.42) @ RY(-18)
        hy = W / 2
        wings = lambda c: (c[0] + 0.04 * (abs(c[1]) / hy) ** 3 + 0.02 * math.exp(-((c[2] + 0.18) / 0.1) ** 2), c[1], c[2])
        cr = [(0, 1, 2, -0.06, 0.016, 0.02)] + [(0, 1, 1, sg * (hy - 0.09), 0.014, 0.0) for sg in (-1, 1)]
        part('Back', lod, 'leather_chocolate', pillow((0.22, W, 0.60), 0.045, crown=[(0, 1, 0.02)], creases=cr if lod == 0 else (), shape=wings, levels=lv, extra=((), (0.0,), (0.15,) if lod == 0 else ())), pivot @ T(-0.04, 0, 0.32))
        part('Headrest', lod, 'leather_chocolate', pillow((0.14, W - 0.16, 0.18), 0.05, crown=[(0, 1, 0.02)], levels=lv), pivot @ T(0.06, 0, 0.66))


def arm_club():
    for lod in (0, 1):
        lv = 1 if lod == 0 else 0
        part('Plinth', lod, 'blackmetal', rb((0.64, 0.12, 0.07), 0.01, (1, 1, 1), 1), T(-0.07, 0, 0.035))
        part('Body', lod, 'leather_chocolate', pillow((0.74, 0.16, 0.50), 0.03, crown=[(1, 1, 0.006), (1, -1, 0.006)], levels=lv), T(-0.03, 0, 0.065 + 0.25))
        part('Top', lod, 'walnut', pillow((0.80, 0.18, 0.032), 0.01, levels=0), T(-0.02, 0, 0.596))
        if lod == 0:
            part('Band', 0, 'brass', rb((0.806, 0.186, 0.01), 0.004, (3, 1, 1), 1), T(-0.02, 0, 0.576))
            cup_holder(0, 0.27, 0, 0.612, 'brass', glow='glow_warm', name='CupA', seg=16)
            cup_holder(0, 0.15, 0, 0.612, 'brass', name='CupB', seg=16)


BUILD = {'seat_classic': seat_classic, 'arm_classic': arm_classic, 'seat_rocker': seat_rocker, 'arm_rocker': arm_rocker, 'seat_club': seat_club, 'arm_club': arm_club}


report = []
for name, fn in BUILD.items():
    if A.only and name not in A.only.split(','): continue
    bpy.ops.wm.read_factory_settings(use_empty=True); PARTS.clear()
    fn(); report.append(export(name, A.out))
print('SEATS_DONE', json.dumps(report, indent=1))
