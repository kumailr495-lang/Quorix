"""LUMIERE light fittings and fixed equipment, modelled headless in Blender 5.x (tools/blender/lbl.py helpers).

    blender --background --factory-startup --python tools/blender/fixtures.py -- --out www/models [--only sconce_deco]

  * sconce_deco: art-deco wall sconce for the gallery and Screen 3 ("deco wall sconces shielded from the screen"): brass back plate
    with a stepped crown, a fluted half-round opal glass shade glowing up and down, brass rims and a centre fin. Mounted on a wall
    facing +X; origin = the wall surface at the shade's centre height.
  * downlight: recessed round house light (replaces the square glow tiles): a trim ring 6 mm proud of the ceiling, a black baffle and
    the lamp's lens. Origin = the ceiling surface, facing down. The trim is brass; placements swap it to black where stray light matters.
  * speaker_array: IMAX with Laser style overhead line array (the identity table: "visible overhead speaker arrays"): fly bar on two
    cables, four cabinets in a J-curve with fabric grilles, aimed along +X and down. Origin = the ceiling attachment point.
Glowing parts use materials named glow_* (the engine draws them in the room's glow mesh at the material's emission colour).
"""
import bpy, bmesh, math, sys, os, json, argparse
from mathutils import Vector, Matrix
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lbl import *   # noqa: E402,F401

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ap = argparse.ArgumentParser(); ap.add_argument('--out', default='www/models'); ap.add_argument('--only', default='')
A = ap.parse_args(argv)


def half_prism(bm, radius, z0, z1, facets, x0=0.0):
    """Closed half-round prism (a fluted glass shade): flat face on the plane x = x0, the round side toward +X, from z0 to z1."""
    ring = [(x0, -radius)] + [(x0 + radius * math.sin(math.pi * k / facets), -radius * math.cos(math.pi * k / facets)) for k in range(1, facets)] + [(x0, radius)]
    lo = [bm.verts.new((x, y, z0)) for x, y in ring]; hi = [bm.verts.new((x, y, z1)) for x, y in ring]; n = len(ring)
    for k in range(n):
        k2 = (k + 1) % n; bm.faces.new((lo[k], lo[k2], hi[k2], hi[k]))
    bm.faces.new(list(reversed(lo))); bm.faces.new(hi)


def sconce_deco():
    lod = 0
    part('Plate', lod, 'brass', rb((0.012, 0.13, 0.40), 0.004, (1, 2, 3), 2), T(0.006, 0, 0))
    zc = 0.198   # stepped crown above the shade; each step sinks 2 mm into the one below (touching faces would be coplanar)
    for i, (w, h) in enumerate(((0.10, 0.025), (0.07, 0.022), (0.04, 0.02))):
        part(f'Crown{i}', lod, 'brass', rb((0.03 + 0.012 * (2 - i), w, h), 0.003, (1, 1, 1), 1), T(0.012 + 0.006 * (2 - i), 0, zc + h / 2)); zc += h - 0.002
    part('Shade', lod, 'glow_opal', lambda bm: half_prism(bm, 0.072, -0.15, 0.15, 10, 0.012), smooth=False)
    for z in (-0.158, 0.158):
        part(f'Rim{int(z > 0)}', lod, 'brass', lambda bm, z=z: half_prism(bm, 0.079, z - 0.009, z + 0.009, 20, 0.011))
    part('Fin', lod, 'brass', rb((0.03, 0.008, 0.37), 0.003, (1, 1, 2), 1), T(0.012 + 0.072 + 0.006, 0, 0))   # runs through both rims


def downlight():
    lod = 0
    part('Trim', lod, 'brass', lambda bm: lathe(bm, [(0.052, -0.006), (0.076, -0.006), (0.078, -0.004), (0.078, 0.001), (0.052, 0.001)], 32))
    part('Baffle', lod, 'paint_black', lambda bm: lathe(bm, [(0.034, -0.0035), (0.0525, -0.0035), (0.0525, 0.0005), (0.034, 0.0005)], 32))
    part('Lens', lod, 'glow_white', lambda bm: disc(bm, 0.0345, -0.0045, -0.001, 24), smooth=False)


def speaker_array():
    lod = 0
    for y in (-0.25, 0.25):   # suspension cables
        part(f'Cable{int(y > 0)}', lod, 'blackmetal', lambda bm: lathe(bm, [(1e-4, -0.36), (0.004, -0.36), (0.004, 0.0), (1e-4, 0.0)], 8, fan=False), T(0, y, 0))
    part('FlyBar', lod, 'charcoal', rb((0.10, 0.66, 0.05), 0.008, (1, 2, 1), 1), T(0, 0, -0.38))
    # J-curve: each cabinet hangs from the front-bottom corner of the one above (the rigging hinge) and tilts further toward the seats
    hinge = Vector((0.17, 0.0, -0.405)); ang = 0.0; h = 0.17
    for i in range(4):
        ang += 3 + 3 * i
        base = Matrix.Translation(hinge) @ Matrix.Rotation(math.radians(ang), 4, 'Y') @ T(-0.17, 0, 0)
        part(f'Cab{i}', lod, 'charcoal', rb((0.38, 0.62 - 0.004 * (i % 2), h - 0.004), 0.012, (2, 2, 1), 1), base @ T(-0.02, 0, -h / 2))   # alternate widths: side faces never share a plane
        part(f'Grille{i}', lod, 'fabric_black', rb((0.012, 0.58, h - 0.026), 0.004, (1, 2, 1), 1), base @ T(0.174, 0, -h / 2))
        hinge = base @ Vector((0.17, 0.0, -h))


def u_shell(bm, ax, ay, t, z0, z1, n=16):
    """Closed U-shaped shell extruded along Z: outer half-ellipse (depth ax along +X, half-width ay) and the inner one t thinner,
    joined at the wall (x = 0); open toward the top, which is how a wall-hung urinal bowl reads."""
    outer = [(ax * math.sin(math.pi * k / n), -ay * math.cos(math.pi * k / n)) for k in range(n + 1)]
    inner = [((ax - t) * math.sin(math.pi * k / n), -(ay - t) * math.cos(math.pi * k / n)) for k in range(n, -1, -1)]
    loop = outer + inner; lo = [bm.verts.new((x, y, z0)) for x, y in loop]; hi = [bm.verts.new((x, y, z1)) for x, y in loop]; m = len(loop)
    for k in range(m):
        k2 = (k + 1) % m; bm.faces.new((lo[k], lo[k2], hi[k2], hi[k]))
    bm.faces.new(list(reversed(lo))); bm.faces.new(hi)


def urinal():
    """Wall-hung urinal (porcelain), rim at 0.60 m, open to the front: back plate, rounded side cheeks, a sloped bowl floor and a hood,
    so the cavity reads from the front (and the per-vertex bake darkens it); chrome flush valve above. Faces +X; origin = wall at floor."""
    lod = 0
    # each part has its own width so no two share a side plane (check-world flags coplanar overlaps even inside the solid)
    part('Back', lod, 'ceramic', rb((0.06, 0.36, 0.70), 0.025, (1, 2, 3), 2), T(0.03, 0, 0.70))
    for sy in (-1, 1):
        part(f'Cheek{sy + 1}', lod, 'ceramic', rb((0.32, 0.045, 0.62), 0.022, (2, 1, 3), 2), T(0.164, sy * 0.1555, 0.701))
    part('Floor', lod, 'ceramic', rb((0.318, 0.346, 0.13), 0.05, (2, 2, 1), 2, (2, -0.025)), T(0.167, 0, 0.455), deform=lambda c: (c.x, c.y, c.z + 0.05 * ((c.x - 0.007) / 0.16)))
    part('Hood', lod, 'ceramic', rb((0.30, 0.354, 0.07), 0.03, (2, 2, 1), 2), T(0.162, 0, 1.0))   # back faces at 4, 8, 12 mm: inside the back plate, never coplanar
    part('Valve', lod, 'chrome', lambda bm: lathe(bm, [(1e-4, 1.03), (0.026, 1.03), (0.026, 1.18), (0.032, 1.19), (0.032, 1.22), (1e-4, 1.22)], 20), T(0.07, 0, 0))


def basin_vessel():
    """Round vessel basin on a counter (white ceramic) with a chrome drain; origin = the counter top under the basin's centre."""
    lod = 0
    prof = [(1e-4, 0.0), (0.09, 0.0)] + [(0.09 + 0.12 * math.sin(math.pi / 2 * k / 6), 0.14 * (1 - math.cos(math.pi / 2 * k / 6))) for k in range(1, 7)]
    prof += [(0.205, 0.145)] + [(0.196 - 0.11 * math.sin(math.pi / 2 * k / 6), 0.14 - 0.12 * (1 - math.cos(math.pi / 2 * k / 6))) for k in range(0, 7)] + [(1e-4, 0.02)]
    part('Bowl', lod, 'ceramic', lambda bm: lathe(bm, prof, 36))
    part('Drain', lod, 'chrome', lambda bm: disc(bm, 0.024, 0.019, 0.023, 16))


def tap_brass():
    """Tall vessel tap in brushed brass: round column, arched spout toward +X, side lever; origin = the counter top."""
    lod = 0
    part('Column', lod, 'brass', lambda bm: lathe(bm, [(1e-4, 0.0), (0.03, 0.0), (0.03, 0.012), (0.017, 0.02), (0.017, 0.3), (1e-4, 0.3)], 20))
    pts = [(0.0, 0.0, 0.29)] + [(0.13 * math.sin(math.pi / 2 * k / 8), 0.0, 0.29 + 0.04 * math.sin(math.pi * k / 8) - 0.03 * (k / 8) ** 2) for k in range(1, 9)]
    part('Spout', lod, 'brass', lambda bm: tube(bm, pts, 0.011, 10, closed=False))
    part('Lever', lod, 'brass', rb((0.012, 0.07, 0.012), 0.005, (1, 2, 1), 1), T(0.0, 0.05, 0.22))


def mirror_round():
    """Round back-lit mirror: silvered disc on a 3 cm stand-off, its halo glowing on the wall round the edge. Facing +X; origin = wall."""
    lod = 0
    part('Halo', lod, 'glow_warm', lambda bm: lathe(bm, [(0.34, 0.0), (0.372, 0.0), (0.372, 0.004), (0.34, 0.004)], 48), Matrix.Rotation(math.radians(90), 4, 'Y'), smooth=False)
    part('Standoff', lod, 'blackmetal', lambda bm: disc(bm, 0.3, 0.004, 0.03, 32), Matrix.Rotation(math.radians(90), 4, 'Y'))
    part('Glass', lod, 'mirror', lambda bm: disc(bm, 0.36, 0.03, 0.036, 48), Matrix.Rotation(math.radians(90), 4, 'Y'))


def torchere_deco():
    """Lobby centrepiece for the banquette island (replaces the tree): stepped round brass plinth, fluted black lacquer column with brass
    collars, an opal glass uplight bowl in a brass rim that washes the ceiling under the chandelier. 3.2 m tall; origin = floor centre."""
    lod = 0
    z = 0.0
    for i, (r, h) in enumerate(((0.46, 0.08), (0.38, 0.08), (0.3, 0.09))):   # stepped plinth, each tier 2 mm into the one below
        part(f'Plinth{i}', lod, 'brass' if i != 1 else 'lacquer_black', lambda bm, r=r, z=z, h=h: lathe(bm, [(1e-4, z), (r, z), (r, z + h - 0.01), (r - 0.01, z + h), (1e-4, z + h)], 48)); z += h - 0.002
    part('Column', lod, 'lacquer_black', lambda bm: half_fluted(bm, 0.11, z, 2.86, 24))
    for k, zc in enumerate((0.9, 1.5, 2.1, 2.7)):
        part(f'Collar{k}', lod, 'brass', lambda bm, zc=zc: lathe(bm, [(1e-4, zc - 0.02), (0.135, zc - 0.02), (0.14, zc), (0.135, zc + 0.02), (1e-4, zc + 0.02)], 32))
    part('Cup', lod, 'brass', lambda bm: lathe(bm, [(1e-4, 2.84), (0.12, 2.84), (0.2, 2.92), (1e-4, 2.95)], 32))
    bowl = [(0.18, 2.9)] + [(0.18 + 0.4 * math.sin(math.pi / 2 * k / 8), 2.9 + 0.3 * (1 - math.cos(math.pi / 2 * k / 8))) for k in range(1, 9)] + [(0.56, 3.2), (0.54, 3.2)] + \
           [(0.54 - 0.38 * math.sin(math.pi / 2 * (8 - k) / 8), 2.93 + 0.27 * (1 - math.cos(math.pi / 2 * (8 - k) / 8))) for k in range(0, 9)]
    part('Bowl', lod, 'glow_opal', lambda bm: lathe(bm, bowl, 48), smooth=False)
    part('Rim', lod, 'brass', lambda bm: lathe(bm, [(0.55, 3.19), (0.585, 3.19), (0.585, 3.215), (0.55, 3.215)], 48))


def half_fluted(bm, r, z0, z1, flutes):
    """Closed fluted column: a round section scalloped into concave flutes, extruded from z0 to z1."""
    ring = []
    for k in range(flutes * 3):
        a = 2 * math.pi * k / (flutes * 3); dip = 0.012 if k % 3 == 1 else 0.004 if k % 3 == 2 else 0.0
        ring.append(((r - dip) * math.cos(a), (r - dip) * math.sin(a)))
    lo = [bm.verts.new((x, y, z0)) for x, y in ring]; hi = [bm.verts.new((x, y, z1)) for x, y in ring]; n = len(ring)
    for k in range(n):
        k2 = (k + 1) % n; bm.faces.new((lo[k], lo[k2], hi[k2], hi[k]))
    bm.faces.new(list(reversed(lo))); bm.faces.new(hi)


def bend(r_mid, a_mid):
    """Deform for a rounded box built straight: local X = radial offset from r_mid, local Y = arc length; wraps it round the ring at a_mid."""
    def f(c):
        r = r_mid + c.x; th = a_mid + c.y / r_mid
        return (r * math.cos(th), r * math.sin(th), c.z)
    return f


def banquette_round():
    """Round lobby banquette (replaces the eight Kiln segments): eight crowned seat cushions with welts round a continuous channel-tufted
    back ring, a velvet base on a recessed black plinth with a brass kick band. Sitters face outward; cushion i is centred at
    (i + 0.5) x 45 degrees, where the engine's sit spots are. Origin = floor centre; the torchere stands inside the back ring."""
    lod = 0; seg = 128
    part('Plinth', lod, 'lacquer_black', lambda bm: lathe(bm, [(1.66, 0.0), (2.24, 0.0), (2.24, 0.08), (1.66, 0.08)], seg))
    part('Base', lod, 'velvet_teal', lambda bm: lathe(bm, [(1.71, 0.075), (2.32, 0.075), (2.335, 0.09), (2.335, 0.3), (2.32, 0.315), (1.71, 0.315)], seg))
    part('Kick', lod, 'brass', lambda bm: lathe(bm, [(2.33, 0.074), (2.341, 0.074), (2.341, 0.104), (2.33, 0.104)], seg))
    part('BackBody', lod, 'velvet_teal', lambda bm: lathe(bm, [(1.47, 0.075), (1.705, 0.075), (1.705, 0.9), (1.47, 0.9)], seg))
    part('BackCap', lod, 'velvet_teal', lambda bm: lathe(bm, [(1.455, 0.885), (1.72, 0.885), (1.745, 0.91), (1.745, 0.945), (1.72, 0.97), (1.455, 0.97), (1.44, 0.945), (1.44, 0.91)], seg))
    part('CapBand', lod, 'brass', lambda bm: lathe(bm, [(1.741, 0.908), (1.751, 0.908), (1.751, 0.947), (1.741, 0.947)], seg))   # slim trim on the cap's outer face
    for i in range(24):   # three vertical channels behind each seat
        a = math.radians(15 * i + 7.5); arc = 1.73 * math.radians(15) - 0.012
        part(f'Channel{i}', lod, 'velvet_teal', rb((0.06, arc, 0.47), 0.026, (1, 4, 3), 2, (0, 0.012)), T(0.0, 0, 0.6), deform=bend(1.732, a))
    for i in range(8):
        a = math.radians(45 * i + 22.5); arc = 2.03 * math.radians(45) - 0.03
        part(f'Cushion{i}', lod, 'velvet_teal', rb((0.6, arc, 0.14), 0.05, (2, 10, 1), 2, (2, 0.016)), T(0, 0, 0.385), deform=bend(2.03, a))
        pts = [(2.31 * math.cos(a + t), 2.31 * math.sin(a + t), 0.442) for t in [(-0.5 + k / 40) * (arc - 0.08) / 2.31 for k in range(41)]]
        part(f'Welt{i}', lod, 'velvet_charcoal', lambda bm, pts=pts: tube(bm, pts, 0.006, 6, closed=False))


BUILD = {'banquette_round': banquette_round, 'torchere_deco': torchere_deco, 'sconce_deco': sconce_deco, 'downlight': downlight, 'speaker_array': speaker_array, 'urinal': urinal, 'basin_vessel': basin_vessel, 'tap_brass': tap_brass, 'mirror_round': mirror_round}
report = []
for name, fn in BUILD.items():
    if A.only and name not in A.only.split(','): continue
    bpy.ops.wm.read_factory_settings(use_empty=True); PARTS.clear()
    fn(); report.append(export(name, A.out))
print('FIXTURES_DONE', json.dumps(report, indent=1))
