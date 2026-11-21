"""LUMIERE v12 - the lobby's centrepiece: a fountain with a statue (the user, 2026-11-17: "a statue"; v10: "a fountain"). Thalia, the muse
of comedy and theatre, seated with her theatre mask and tympanum, gilded, on an octagonal red marble plinth in a black marble basin; eight
lit jets arc from the basin's rim towards the plinth's corners. The plinth's front flat carries a brass caption (an engine panel,
world9.js 'plaque_muse').

Source (public domain): the plaster cast KAS35 "Seated muse with theatre mask and tympanum, Thalia", The Royal Cast Collection, SMK -
National Gallery of Denmark, 3D scan published on SMK Open under the Public Domain Mark 1.0 (docs/LICENSES.md). Download the small STL
(20 MB, 400k triangles) once, outside the repo:
    curl -L -o thalia.stl https://api.smk.dk/api/v1/download-3d/gt54ks43p_KAS35_small.stl
    blender --background --factory-startup --python tools/blender/statue12.py -- --src thalia.stl --out www/models
    then: sh tools/optimize-models.sh (if used for this model) and blender ... --python tools/blender/glb_check.py -- www/models/fountain_muse.glb

Frame: +X the front (the engine's +Z at yaw 0), +Z up, the floor at Z = 0, the fountain's centre at the origin. The scan faces -X with +Z
up; it is turned to face +X, centred on its base and decimated (LOD0 30k, LOD1 7k triangles). Parts embed 2-3 cm into what they stand on
and no two faces of different parts lie in one plane."""
import bpy, bmesh, math, sys, os, argparse, json
from mathutils import Vector, Matrix
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lbl
from lbl import T, RZ, lathe, part, PARTS

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ap = argparse.ArgumentParser(); ap.add_argument('--src', required=True); ap.add_argument('--out', default='www/models'); ap.add_argument('--height', type=float, default=2.45)
A = ap.parse_args(argv)
for k, v in {'marble_nero': ((0.02, 0.02, 0.022), 0.15, 0.0), 'marble_rosso': ((0.30, 0.04, 0.035), 0.2, 0.0), 'gilt': ((0.55, 0.36, 0.13), 0.4, 0.6)}.items():
    lbl.MAT_DEF.setdefault(k, v)

R_IN, R_OUT, FLOOR, WATER = 1.40, 1.62, 0.15, 0.36            # the basin: inner and outer radius at the lip, its floor, the water line
PR = 1.082; PA = PR * math.cos(math.pi / 8)                    # the plinth: an octagon, circumradius PR, apothem PA (1.0 m): flats face +-X, +-Y
P_TOP, CAP_TOP = 1.30, 1.38                                    # the plinth's top (inside the cap), the cap's top: the statue stands on it


def ring(r0, r1, z0, z1):
    return [(r0, z0), (r1, z0), (r1, z1), (r0, z1)]


def octagon(r, z0, z1):
    """a solid octagonal prism, flats facing +-X and +-Y (lathe with 8 sides starts at a corner on +X: turned 22.5 degrees)"""
    def build(bm):
        lathe(bm, [(1e-4, z0), (r, z0), (r, z1), (1e-4, z1)], 8); bm.transform(RZ(22.5))
    return build


def arc(p0, p1, p2, n=8):
    """a quadratic Bezier from p0 through the control p1 to p2"""
    return [tuple((1 - t) ** 2 * a + 2 * (1 - t) * t * b + t ** 2 * c for a, b, c in zip(p0, p1, p2)) for t in (i / n for i in range(n + 1))]


def ctube(bm, pts, radius, sides=6):
    """a round tube along an open polyline, capped at both ends (a closed solid)"""
    n = len(pts); rings = []
    for i, p in enumerate(pts):
        a, b = pts[max(0, i - 1)], pts[min(n - 1, i + 1)]
        t = (Vector(b) - Vector(a)).normalized(); up = Vector((0, 0, 1)) if abs(t.z) < 0.9 else Vector((1, 0, 0))
        x = t.cross(up).normalized(); y = t.cross(x).normalized()
        rings.append([bm.verts.new(Vector(p) + (x * math.cos(2 * math.pi * k / sides) + y * math.sin(2 * math.pi * k / sides)) * radius) for k in range(sides)])
    for i in range(n - 1):
        a, b = rings[i], rings[i + 1]
        for k in range(sides): k2 = (k + 1) % sides; bm.faces.new((a[k], a[k2], b[k2], b[k]))
    bm.faces.new(list(reversed(rings[0]))); bm.faces.new(rings[-1])


def load_statue(src, height):
    """the scan, turned to face +X, its base centred on the origin at Z = 0, scaled to `height`; returns two decimated meshes (LOD0, LOD1)"""
    bpy.ops.wm.stl_import(filepath=src)
    ob = bpy.context.selected_objects[0]; me = ob.data
    co = [v.co.copy() for v in me.vertices]
    mn = Vector((min(c.x for c in co), min(c.y for c in co), min(c.z for c in co))); mx = Vector((max(c.x for c in co), max(c.y for c in co), max(c.z for c in co)))
    s = height / (mx.z - mn.z)
    M = Matrix.Rotation(math.pi, 4, 'Z') @ Matrix.Scale(s, 4) @ Matrix.Translation(Vector((-(mn.x + mx.x) / 2, -(mn.y + mx.y) / 2, -mn.z)))
    me.transform(M); me.update()
    bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5); bm.to_mesh(me); bm.free()
    tris0 = len(me.polygons); out = []
    for target in (30000, 7000):
        c = ob.copy(); c.data = me.copy(); bpy.context.scene.collection.objects.link(c)
        mod = c.modifiers.new('dec', 'DECIMATE'); mod.decimate_type = 'COLLAPSE'; mod.ratio = target / tris0; mod.use_collapse_triangulate = True
        bpy.context.view_layer.objects.active = c; bpy.ops.object.modifier_apply(modifier='dec')
        out.append(c.data); bpy.data.objects.remove(c)
    bpy.data.objects.remove(ob)
    foot = [v.co for v in out[0].vertices if v.co.z < 0.03]
    print('STATUE', {'scale': s, 'tris_src': tris0, 'base_x': (min(v.x for v in foot), max(v.x for v in foot)), 'base_y': (min(v.y for v in foot), max(v.y for v in foot))})
    return out


def fountain_muse(statues):
    for lod, smesh in enumerate(statues):
        seg = 64 if lod == 0 else 28
        part('Basin', lod, 'marble_nero', lambda bm: lathe(bm, [(1e-4, 0.0), (1.55, 0.0), (R_OUT, 0.40), (R_OUT, 0.46), (R_IN, 0.46), (R_IN, FLOOR), (1e-4, FLOOR)], seg))
        part('Rim', lod, 'brass', lambda bm: lathe(bm, ring(R_IN - 0.015, R_OUT + 0.02, 0.452, 0.49), seg))                      # 8 mm into the lip, proud of both walls
        part('RimLight', lod, 'glow_warm', lambda bm: lathe(bm, ring(R_OUT - 0.002, R_OUT + 0.012, 0.405, 0.43), seg), smooth=False)   # 2 mm into the outer wall
        part('Water', lod, 'glass', lambda bm: lathe(bm, ring(1e-4, R_IN + 0.005, FLOOR - 0.002, WATER), seg))                   # to the walls and the floor
        part('Plinth', lod, 'marble_rosso', octagon(PR, FLOOR - 0.03, P_TOP), smooth=False)                                       # 3 cm into the basin's floor
        for z0, z1 in ((0.42, 0.47), (1.17, 1.21)):
            part('Band', lod, 'brass', octagon(PR + 0.027, z0, z1), smooth=False)                                                  # 2.5 cm proud of the flats
        part('Cap', lod, 'marble_nero', octagon(PR + 0.054, P_TOP - 0.02, CAP_TOP), smooth=False)                                 # over the plinth's top
        # the statue stands 2 mm into the cap
        def statue(bm, smesh=smesh): bm.from_mesh(smesh); bm.transform(T(0, 0, CAP_TOP - 0.002))
        part('Statue', lod, 'gilt', statue)   # v12c satin gilt (library.js 'gilt': part metal), so the spots on her read as gold, not a dark mirror
        # eight jets from inside the rim, arcing to the water in front of the plinth's corners; a glint where they land
        nj, sides = (8, 6) if lod == 0 else (8, 4)
        for k in range(nj):
            a = math.pi / 8 + 2 * math.pi * k / nj; ca, sa = math.cos(a), math.sin(a)
            pts = arc((ca * (R_IN + 0.005), sa * (R_IN + 0.005), 0.42), (ca * 1.26, sa * 1.26, 0.86), (ca * 1.16, sa * 1.16, WATER - 0.03))
            part('Jet', lod, 'glow_ice', lambda bm, pts=pts: lbl.ptube(bm, pts, 0.007, sides), smooth=False)   # v12c no twist where the arc turns
        part('Glint', lod, 'glow_ice', lambda bm: lathe(bm, ring(1.145, 1.175, WATER - 0.004, WATER + 0.004), seg), smooth=False)   # 4 mm into the water


def reset():
    for o in list(bpy.data.objects): bpy.data.objects.remove(o)
    for m in list(bpy.data.meshes): bpy.data.meshes.remove(m)
    PARTS.clear()


bpy.ops.wm.read_factory_settings(use_empty=True)
os.makedirs(A.out, exist_ok=True)
statues = load_statue(A.src, A.height)
reset_keep = list(statues)
for o in list(bpy.data.objects): bpy.data.objects.remove(o)
PARTS.clear()
fountain_muse(reset_keep)
r = lbl.export('fountain_muse', A.out)
print(json.dumps({k: r[k] for k in ('asset', 'tris', 'parts', 'bytes', 'bbox_blender')}, indent=1))
