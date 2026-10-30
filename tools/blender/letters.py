"""LUMIERE v7 - 3D signage letters (docs/V7-DESIGN.md), made from OFL fonts in tools/blender/fonts (fontsource TTFs: Cormorant Garamond,
Inter). Each word becomes one GLB: extruded, bevelled glyphs whose front faces carry the face material (a lit face for channel letters,
or brass) and whose returns carry the side material. Frame (lbl.py): front = +X, reading direction = +Y (the viewer's right), +Z up;
the back of the letters sits at X = 0 (mount on a wall surface), the baseline at Z = 0, the word centred on Y = 0; cap height 1.0 m.

    blender --background --factory-startup --python tools/blender/letters.py -- --out www/models
"""
import bpy, bmesh, math, os, sys, json
from mathutils import Matrix, Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lbl

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = ARGS[ARGS.index('--out') + 1] if '--out' in ARGS else 'www/models'
FONTS = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fonts')
# name: (text, font file, face material, side material, depth m, bevel m, letter spacing)
WORDS = {
    'letters_lumiere_lit': ('LUMIÈRE', 'CormorantGaramond-SemiBold.ttf', 'glow_gold', 'brass', 0.16, 0.01, 1.08),   # canopy fascia: face-lit gold
    'letters_lumiere': ('LUMIÈRE', 'CormorantGaramond-SemiBold.ttf', 'brass', 'brass', 0.06, 0.006, 1.08),          # lobby feature wall: solid brass
    'letters_cinemas': ('CINEMAS', 'Inter-SemiBold.ttf', 'brass', 'brass', 0.03, 0.003, 1.9),
    'letters_imax': ('IMAX', 'Inter-ExtraBold.ttf', 'glow_ice', 'blackmetal', 0.14, 0.008, 1.05),
}
ROT = Matrix(((0, 0, 1, 0), (1, 0, 0, 0), (0, 1, 0, 0), (0, 0, 0, 1)))   # text X -> +Y, text Y -> +Z, text Z (towards the reader) -> +X


def text_mesh(text, font, depth, bevel, spacing, k=1.0):
    """k = the scale applied afterwards: depth and bevel are given in final metres."""
    depth, bevel = depth / k, bevel / k
    cu = bpy.data.curves.new('txt', 'FONT'); cu.body = text; cu.font = bpy.data.fonts.load(os.path.join(FONTS, font), check_existing=True)
    cu.size = 1.0; cu.extrude = depth / 2 - bevel; cu.bevel_depth = bevel; cu.bevel_resolution = 1; cu.space_character = spacing; cu.align_x = 'CENTER'
    cu.resolution_u = 4
    ob = bpy.data.objects.new('txt', cu); bpy.context.scene.collection.objects.link(ob)
    dg = bpy.context.evaluated_depsgraph_get(); me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    bpy.data.objects.remove(ob); return me


def build(name, text, font, face, side, depth, bevel, spacing):
    lbl.PARTS.clear()
    for o in list(bpy.context.scene.objects): bpy.data.objects.remove(o)
    cap = text_mesh('H', font, depth, bevel, 1.0); hz = max(v.co.y for v in cap.vertices); bpy.data.meshes.remove(cap)   # cap height of the font at size 1
    k = 1.0 / hz; me = text_mesh(text, font, depth, bevel, spacing, k)
    bm = bmesh.new(); bm.from_mesh(me); bpy.data.meshes.remove(me)
    bm.transform(Matrix.Scale(k, 4)); bm.transform(ROT)
    xmin = min(v.co.x for v in bm.verts); bm.transform(Matrix.Translation((-xmin, 0, 0)))   # back of the letters at X = 0
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces)); lbl.box_uv(bm)
    out = bpy.data.meshes.new(name + '_LOD0'); bm.to_mesh(out); bm.free()
    out.materials.append(lbl.material(face)); out.materials.append(lbl.material(side))
    for p in out.polygons: p.material_index = 0 if p.normal.x > 0.92 else 1
    out.shade_smooth(); out.set_sharp_from_angle(angle=math.radians(40))
    ob = bpy.data.objects.new(name + '_LOD0', out); bpy.context.scene.collection.objects.link(ob); lbl.PARTS.append(ob)
    return lbl.export(name, OUT)


bpy.ops.wm.read_factory_settings(use_empty=True)
for n, spec in WORDS.items():
    print(json.dumps(build(n, *spec)))
