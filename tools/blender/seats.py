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
    W, top = 0.62, 0.46   # v12b (11-18: "big comfortable seats"): 0.62 m across on 0.70 m centres (was 0.52 on 0.62)
    for lod in (0, 1):
        m = 2 if lod == 0 else 1; ni = (2, 2, 2) if lod == 0 else (1, 1, 1)
        # cushion: waterfall front, crowned top, black pan under it
        # v11: the tip-up seat stands 3 cm clear of the back (it was 2.3 cm: a near miss), its pan 2.5 mm into the cushion (it hung 7.5 mm under it)
        part('Pan', lod, 'plastic_black', rb((0.473, W - 0.004, 0.035), 0.012, (1, 1, 1), 1), T(0.0035, 0, top - 0.145))   # 3 mm into the pivots, 2 mm inside the cushion's sides
        part('Cushion', lod, 'velvet_teal', rb((0.493, W, 0.13), 0.045, ni, m, (2, 0.016) if lod == 0 else None), T(0.0235, 0, top - 0.065))
        if lod == 0: part('Welt', 0, 'velvet_charcoal', lambda bm: tube(bm, rrect_path(0.2465 - 0.013, W / 2 - 0.013, 0.032, 0.0, 5), 0.0055), T(0.0235, 0, top - 0.013))
        # back: inner channel back with a lumbar curve, leaning back 12 degrees, pivoting at the seat's rear edge
        BH, BW, BT = 0.58, W - 0.01, 0.095
        pivot = T(-0.23, 0, top + 0.005) @ RY(-12)
        lumbar = lambda c: (c.x + 0.022 * math.exp(-((c.z - 0.17) / 0.11) ** 2) + 0.05 * (c.y / (BW / 2)) ** 2 * 0.5, c.y, c.z)
        if lod == 0:
            n = 5; cw = BW / n
            for i in range(n):
                y = -BW / 2 + cw * (i + 0.5)
                part(f'Channel{i}', 0, 'velvet_teal', rb((BT, cw + 0.004, BH - 0.06), 0.034, (1, 1, 4), 2, (0, 0.012), at=(-0.0095, y, 0.03 + (BH - 0.06) / 2)), pivot, deform=lumbar)   # v11: on the shell (6.7 mm off it)
            part('BackPad', 0, 'velvet_teal', rb((BT * 0.6, BW, BH), 0.03, (1, 2, 4), 2, at=(-0.03, 0, BH / 2)), pivot, deform=lumbar)
            for sy in (-1, 1):   # the pivot brackets the seat and back hang from, between the cushion and the arm standards
                part(f'SeatPivot{sy + 1}', 0, 'blackmetal', rb((0.07, 0.022, 0.05), 0.006, (1, 1, 1), 1), T(-0.15, sy * (W / 2 + 0.006), top - 0.12))
                part(f'BackPivot{sy + 1}', 0, 'blackmetal', rb((0.05, 0.022, 0.12), 0.006, (1, 1, 1), 1), pivot @ T(-0.04, sy * (BW / 2 - 0.002), 0.07))   # v11: half into the pad's side (it stood 7 mm off its rounded edge)
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
        part('Arm', lod, 'walnut', rb((0.58, 0.072, 0.036), 0.016, (3, 1, 1), m), T(0.0, 0, 0.6155))   # v11: 2.5 mm into the standard (it hung 4 mm over it)
        if lod == 0:
            part('Foot', 0, 'rubber', rb((0.40, 0.064, 0.012), 0.004, (1, 1, 1), 1), T(-0.03, 0, 0.006))
            cup_holder(0, 0.215, 0, 0.6335, 'brass')


# ================================================================== MAX and X-270: high-back stadium rocker (v9.2 rebuild)
# Tailored, not inflated: cushions are subdivided cages with tight support loops (edges round to 2-3 cm), stitched channels are
# creases with their own support loops, the moulded shell wraps the cushion from behind with forward-curving sides, a narrower waist
# and soft shoulders. Seat 460 mm high, back to about 1.2 m, the arm pad at 640 mm (Octane / Ferco high-back sheets).
def seat_rocker():
    """v12b (the user, 11-18: "premium and big comfortable seats and their detailings"): a luxury rocker 0.60 m across (0.70 m centres),
    a deep crowned cushion whose front rolls down, a stitched front bolster seam, a high channelled back with side bolsters and a lumbar
    bulge, a pillow headrest, a moulded shell that wraps the back and carries a brass number plate, on a tapered pedestal and foot plate"""
    W, top = 0.60, 0.47
    for lod in (0, 1):
        lv = 1 if lod == 0 else 0
        if lod == 0:   # the rocker mechanism, its pan and the foot plate: hidden past a few metres
            part('Foot', 0, 'blackmetal', rb((0.30, 0.26, 0.014), 0.005, (1, 1, 1), 1), T(-0.07, 0, 0.007))
            part('Pedestal', 0, 'blackmetal', pillow((0.16, 0.20, 0.31), 0.02, shape=lambda c: (c[0] * (0.8 + 0.2 * (0.155 - c[2]) / 0.31), c[1] * (0.85 + 0.15 * (0.155 - c[2]) / 0.31), c[2]), levels=0), T(-0.07, 0, 0.012 + 0.155))   # 2 mm into the foot, 7 mm into the pan
            part('Pan', 0, 'plastic_black', pillow((0.48, W - 0.05, 0.05), 0.012, levels=0), T(0.0, 0, 0.34))
        fall = lambda c: (c[0], c[1], c[2] - (0.025 * max(0.0, (c[0] - 0.16) / 0.11) ** 2 if c[2] > 0 else 0.0))   # the front edge rolls down
        part('Cushion', lod, 'leather_black', pillow((0.53, W, 0.14), 0.035, crown=[(2, 1, 0.02), (0, 1, 0.012)], creases=[(2, 1, 0, 0.14, 0.01, 0.016)] if lod == 0 else (),
             shape=fall, levels=lv, extra=((0.0, 0.16), (0.0,), ()) if lod == 0 else ((), (), ())), T(0.03, 0, 0.36 + 0.07 - 0.006))   # 6 mm into the pan
        pivot = T(-0.245, 0, 0.44) @ RY(-14)
        hy = (W - 0.02) / 2
        wings = lambda c: (c[0] + 0.06 * (abs(c[1]) / hy) ** 3 + 0.022 * math.exp(-((c[2] + 0.17) / 0.1) ** 2), c[1], c[2])   # side bolsters, a lumbar bulge
        cr = [(0, 1, 2, z, 0.018, 0.016) for z in (-0.12, 0.0, 0.12)] + [(0, 1, 1, sg * (hy - 0.08), 0.014, 0.0) for sg in (-1, 1)]
        part('BackCushion', lod, 'leather_black', pillow((0.12, W - 0.02, 0.60), 0.03, crown=[(0, 1, 0.02)], creases=cr if lod == 0 else (), shape=wings, levels=lv, extra=((), (0.0,), ())), pivot @ T(0.0, 0, 0.32))
        part('Headrest', lod, 'leather_black', pillow((0.10, 0.44, 0.15), 0.04, crown=[(0, 1, 0.018), (2, 1, 0.01)], levels=lv), pivot @ T(0.012, 0, 0.665))   # 3 cm into the back's top
        hs, zs = (W + 0.04) / 2, 0.42
        shell = lambda c: (c[0] + 0.075 * (c[1] / hs) ** 2, c[1] * (0.9 + 0.1 * (c[2] + zs) / (2 * zs)), c[2] - (0.07 * (abs(c[1]) / hs) ** 3 * c[2] / zs if c[2] > 0 else 0.0))
        part('Shell', lod, 'plastic_black', pillow((0.035, W + 0.04, 0.84), 0.012, shape=shell, levels=0, extra=((), (-0.15, 0.0, 0.15), (-0.2, 0.0, 0.2) if lod == 0 else ())), pivot @ T(-0.072, 0, 0.39))   # 5.5 mm into the back
        if lod == 0: part('Plate', 0, 'brass', rb((0.005, 0.09, 0.03), 0.002, (1, 1, 1), 1), pivot @ T(-0.091, 0, 0.70))   # the seat's number on the shell's back, 1 mm into it


def arm_rocker():
    for lod in (0, 1):
        lv = 1 if lod == 0 else 0
        taper = lambda c: (c[0] * (0.82 + 0.18 * (c[2] + 0.29) / 0.58), c[1], c[2])
        part('Standard', lod, 'plastic_black', pillow((0.46, 0.05, 0.58), 0.012, shape=taper, levels=0), T(-0.03, 0, 0.29))
        part('Pad', lod, 'leather_black', pillow((0.54, 0.10, 0.05), 0.022, crown=[(2, 1, 0.008)], levels=lv), T(0.0, 0, 0.600))   # v12b: a wider padded arm, 5 mm into the standard
        if lod == 0:
            part('Foot', 0, 'rubber', rb((0.38, 0.056, 0.012), 0.004, (1, 1, 1), 1), T(-0.03, 0, 0.006))
            cup_holder(0, 0.215, 0, 0.625, 'plastic_black', glow='glow_blue', seg=16)


# ================================================================== Curved premium hall, sofas and pods: power recliner (v12b rebuild)
# The user (11-18): "premium and big comfortable seats and their detailings". A deep recliner 0.84 m across (1.0 m centres): an
# upholstered base with a top-stitched seam, tapering into a recessed plinth with a warm under-glow; a padded leg rest with two channels;
# a thick crowned cushion whose front rolls down, with a front bolster seam; a tall back with forward side bolsters, a lumbar bulge and
# two cross seams, an inset walnut panel and a brass number plate behind; a plump pillow headrest standing proud of the back.
def seat_club():
    W = 0.84
    for lod in (0, 1):
        lv = 1 if lod == 0 else 0
        part('Plinth', lod, 'blackmetal', rb((0.66, W - 0.10, 0.06), 0.01, (1, 1, 1), 1), T(-0.08, 0, 0.03))
        if lod == 0: part('Underglow', 0, 'glow_warm', rb((0.008, W - 0.16, 0.006), 0.002, (1, 2, 1), 1), T(0.253, 0, 0.052), smooth=False)   # 1 mm into the plinth's face
        bseam = [(1, sg, 2, 0.105, 0.005, 0.01) for sg in (1, -1)]
        part('Base', lod, 'leather_chocolate', pillow((0.70, W, 0.30), 0.035, crown=[(1, 1, 0.006), (1, -1, 0.006)], creases=bseam if lod == 0 else (),
             shape=lambda c: (c[0], c[1] * (0.95 + 0.05 * (c[2] + 0.15) / 0.30), c[2]), levels=lv, extra=((), (), (0.0,))), T(-0.06, 0, 0.055 + 0.15))   # 5 mm into the plinth
        fch = [(0, 1, 2, z, 0.007, 0.012) for z in (-0.05, 0.05)]
        part('Footrest', lod, 'leather_chocolate', pillow((0.07, W - 0.05, 0.27), 0.024, crown=[(0, 1, 0.012)], creases=fch if lod == 0 else (), levels=lv, extra=((), (0.0,), ())), T(0.32, 0, 0.215))   # 5 mm into the base's front
        fall = lambda c: (c[0], c[1], c[2] - (0.03 * max(0.0, (c[0] - 0.19) / 0.12) ** 2 if c[2] > 0 else 0.0))
        part('Cushion', lod, 'leather_chocolate', pillow((0.62, W - 0.04, 0.17), 0.04, crown=[(2, 1, 0.024), (0, 1, 0.016)], creases=[(2, 1, 0, 0.17, 0.012, 0.018)] if lod == 0 else (),
             shape=fall, levels=lv, extra=((0.0, 0.2), (0.0,), ()) if lod == 0 else ((), (), ())), T(0.03, 0, 0.355 + 0.085 - 0.005))   # 5 mm into the base
        pivot = T(-0.30, 0, 0.36) @ RY(-16)
        hy = W / 2
        wings = lambda c: (c[0] + 0.07 * (abs(c[1]) / hy) ** 3 + 0.025 * math.exp(-((c[2] + 0.16) / 0.1) ** 2), c[1], c[2])
        cr = [(0, 1, 2, z, 0.022, 0.02) for z in (-0.07, 0.11)] + [(0, 1, 1, sg * (hy - 0.11), 0.02, 0.0) for sg in (-1, 1)]   # deep cross seams: three plump rolls
        part('Back', lod, 'leather_chocolate', pillow((0.26, W, 0.62), 0.05, crown=[(0, 1, 0.036)], creases=cr if lod == 0 else (), shape=wings, levels=lv,
             extra=((), (0.0,), (0.15,) if lod == 0 else ())), pivot @ T(-0.06, 0, 0.29))   # its foot 1.5 cm into the base
        part('Headrest', lod, 'leather_chocolate', pillow((0.16, W - 0.12, 0.20), 0.055, crown=[(0, 1, 0.04), (2, 1, 0.018)], levels=lv), pivot @ T(0.0, 0, 0.66))   # 4 cm into the back's top, 4 cm proud of its face
        if lod == 0:
            # an inset walnut panel on the back's rear face: it follows the back's side bolsters (the same curve) and sits 6 mm into it
            part('BackPanel', 0, 'walnut', pillow((0.03, W - 0.20, 0.46), 0.01, shape=lambda c: (c[0] + 0.07 * (abs(c[1]) / hy) ** 3, c[1], c[2]), levels=0, extra=((), (-0.2, -0.1, 0.0, 0.1, 0.2), ())), pivot @ T(-0.186, 0, 0.30))
            part('BackPlate', 0, 'brass', rb((0.006, 0.09, 0.03), 0.002, (1, 1, 1), 1), pivot @ T(-0.2025, 0, 0.47))   # the seat's number, 1.5 mm into the panel


def arm_club():
    """the console between two recliners: an upholstered body on the plinth, a padded leather arm for the elbow, a walnut tray at the front
    (over a brass band) with two brass cup holders (recline.js finds CupAWell and CupBWell) and a charging port's warm light"""
    for lod in (0, 1):
        lv = 1 if lod == 0 else 0
        part('Plinth', lod, 'blackmetal', rb((0.66, 0.12, 0.06), 0.01, (1, 1, 1), 1), T(-0.08, 0, 0.03))
        part('Body', lod, 'leather_chocolate', pillow((0.74, 0.16, 0.52), 0.03, crown=[(1, 1, 0.006), (1, -1, 0.006)], levels=lv), T(-0.04, 0, 0.055 + 0.26))   # 5 mm into the plinth
        part('Pad', lod, 'leather_chocolate', pillow((0.50, 0.19, 0.075), 0.028, crown=[(2, 1, 0.012)], levels=lv), T(-0.15, 0, 0.5635))   # over the body's top, 1.5 cm wider each side
        part('Top', lod, 'walnut', pillow((0.30, 0.19, 0.03), 0.008, levels=0), T(0.22, 0, 0.59))   # the tray: its back 3 cm under the pad's front end
        if lod == 0:
            part('Band', 0, 'brass', rb((0.306, 0.196, 0.008), 0.003, (3, 1, 1), 1), T(0.22, 0, 0.5765))   # 5.5 mm into the tray, 2.5 mm into the body
            cup_holder(0, 0.30, 0, 0.605, 'brass', glow='glow_warm', name='CupA', seg=16)
            cup_holder(0, 0.17, 0, 0.605, 'brass', name='CupB', seg=16)
            part('Port', 0, 'glow_warm', rb((0.004, 0.03, 0.01), 0.001, (1, 1, 1), 1), T(0.331, 0, 0.47), smooth=False)   # 1 mm into the body's front


BUILD = {'seat_classic': seat_classic, 'arm_classic': arm_classic, 'seat_rocker': seat_rocker, 'arm_rocker': arm_rocker, 'seat_club': seat_club, 'arm_club': arm_club}


report = []
for name, fn in BUILD.items():
    if A.only and name not in A.only.split(','): continue
    bpy.ops.wm.read_factory_settings(use_empty=True); PARTS.clear()
    fn(); report.append(export(name, A.out))
print('SEATS_DONE', json.dumps(report, indent=1))
