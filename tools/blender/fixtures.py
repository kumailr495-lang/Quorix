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
        part(f'Cable{int(y > 0)}', lod, 'blackmetal', lambda bm: lathe(bm, [(1e-4, -0.36), (0.004, -0.36), (0.004, 0.0), (1e-4, 0.0)], 8), T(0, y, 0))
    part('FlyBar', lod, 'charcoal', rb((0.10, 0.66, 0.05), 0.008, (1, 2, 1), 1), T(0, 0, -0.38))
    # J-curve: each cabinet hangs from the front-bottom corner of the one above (the rigging hinge) and tilts further toward the seats
    hinge = Vector((0.17, 0.0, -0.405)); ang = 0.0; h = 0.17
    for i in range(4):
        ang += 3 + 3 * i
        base = Matrix.Translation(hinge) @ Matrix.Rotation(math.radians(ang), 4, 'Y') @ T(-0.17, 0, 0)
        part(f'Cab{i}', lod, 'charcoal', rb((0.38, 0.62 - 0.004 * (i % 2), h - 0.004), 0.012, (2, 2, 1), 1), base @ T(-0.02, 0, -h / 2))   # alternate widths: side faces never share a plane
        part(f'Grille{i}', lod, 'fabric_black', rb((0.012, 0.58, h - 0.026), 0.004, (1, 2, 1), 1), base @ T(0.174, 0, -h / 2))
        hinge = base @ Vector((0.17, 0.0, -h))


BUILD = {'sconce_deco': sconce_deco, 'downlight': downlight, 'speaker_array': speaker_array}
report = []
for name, fn in BUILD.items():
    if A.only and name not in A.only.split(','): continue
    bpy.ops.wm.read_factory_settings(use_empty=True); PARTS.clear()
    fn(); report.append(export(name, A.out))
print('FIXTURES_DONE', json.dumps(report, indent=1))
