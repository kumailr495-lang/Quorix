"""LUMIERE v14 - CC0 photoscanned props (Poly Haven) turned into game assets (the user, 11-20: "make every single model extra high quality,
GTA 5-6 level detailed"). For each model in SCANS: import its glTF (tools/polyhaven/fetch.py), join it, turn it so its front faces +X
(Poly Haven models face -Y in Blender), stand it on Z = 0 centred on its footprint (wall pieces: their back on X = 0), name each material scan_<name>_<a, b, ...> (letters: library.js named() drops digits) and export a GLB without images. The textures go
through tools/textures/scans.py into the engine's texture arrays (one layer per material: no extra draw calls); OUT/scans.json lists, per
material, the source images and factors that script reads.

    blender --background --factory-startup --python tools/blender/scans14.py -- --src RAW --out www/models --meta OUT/scans.json [--only NAME]
"""
import bpy, json, math, os, sys, argparse
from mathutils import Vector, Matrix

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ap = argparse.ArgumentParser(); ap.add_argument('--src', required=True); ap.add_argument('--out', default='www/models'); ap.add_argument('--meta', required=True); ap.add_argument('--only', default='')
A = ap.parse_args(argv)

# name: (Poly Haven id, triangle budget, extra turn about Z in degrees, anchor)
SCANS = {
    'scan_chesterfield': ('sofa_02', 2800, 0, 'floor'),
    'scan_ottoman': ('Ottoman_01', 2600, 0, 'floor'),
    'scan_lounge_chair': ('mid_century_lounge_chair', 4200, 0, 'floor'),
    'scan_armchair': ('modern_arm_chair_01', 4600, 0, 'floor'),
    'scan_coffee_table': ('coffee_table_round_01', 4100, 0, 'floor'),
    'scan_bust': ('marble_bust_01', 6000, 0, 'floor'),
    'scan_vase': ('brass_vase_03', 2700, 0, 'floor'),
    'scan_succulent': ('potted_plant_04', 4000, 0, 'floor'),
    'scan_grandfather_clock': ('vintage_grandfather_clock_01', 6500, 0, 'floor'),
    'scan_projector8': ('filmstrip_projector_8mm', 8000, 0, 'floor'),
    'scan_cine_camera': ('vintage_video_camera', 6000, 0, 'floor'),
    'scan_security_cam': ('security_camera_01', 3200, 0, 'back'),
    'scan_wet_floor': ('WetFloorSign_01', 400, 0, 'floor'),
    'scan_bar_stool': ('bar_chair_round_01', 4200, 0, 'floor'),
    'scan_wall_clock': ('wall_clock', 3700, 0, 'back'),
    'scan_plant_stand': ('side_table_tall_01', 3200, 0, 'floor'),
    'scan_plant': ('potted_plant_02', 14000, 0, 'floor'),
}


def tris(ob):
    ob.data.calc_loop_triangles(); return len(ob.data.loop_triangles)


def gltf_materials(path):
    """material name -> its texture files and factors, read straight from the .gltf (the importer's node trees vary by version)"""
    g = json.load(open(path)); d = os.path.dirname(path); out = {}
    img = lambda ti: os.path.join(d, g['images'][g['textures'][ti]['source']]['uri']) if ti is not None else None
    for m in g.get('materials', []):
        pbr = m.get('pbrMetallicRoughness', {})
        out[m.get('name', '')] = {'base': img(pbr.get('baseColorTexture', {}).get('index')), 'normal': img(m.get('normalTexture', {}).get('index')),
                                   'arm': img(pbr.get('metallicRoughnessTexture', {}).get('index')), 'ao': img(m.get('occlusionTexture', {}).get('index')),
                                   'metal': pbr.get('metallicFactor', 1.0), 'rough': pbr.get('roughnessFactor', 1.0), 'color': pbr.get('baseColorFactor', [1, 1, 1, 1]),
                                   'alpha': m.get('alphaMode', 'OPAQUE')}
    return out


meta = json.load(open(A.meta)) if os.path.exists(A.meta) else {}
os.makedirs(A.out, exist_ok=True)
for name, (pid, budget, turn, anchor) in SCANS.items():
    if A.only and name not in A.only.split(','): continue
    bpy.ops.wm.read_factory_settings(use_empty=True)
    src = json.load(open(os.path.join(A.src, pid, 'meta.json'))); path = os.path.join(A.src, pid, src['gltf'])
    bpy.ops.import_scene.gltf(filepath=path)
    obs = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    for o in bpy.context.scene.objects: o.select_set(o in obs)
    bpy.context.view_layer.objects.active = obs[0]
    if len(obs) > 1: bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    for o in list(bpy.context.scene.objects):
        if o != ob and o.type != 'MESH': bpy.data.objects.remove(o)
    ob.parent = None; ob.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    # turn: the front from -Y to +X, then any extra turn
    ob.data.transform(Matrix.Rotation(math.radians(90 + turn), 4, 'Z'))
    vs = [v.co for v in ob.data.vertices]; lo = Vector([min(v[i] for v in vs) for i in range(3)]); hi = Vector([max(v[i] for v in vs) for i in range(3)])
    shift = Vector(((lo.x + hi.x) / 2 if anchor == 'floor' else lo.x, (lo.y + hi.y) / 2, lo.z if anchor == 'floor' else (lo.z + hi.z) / 2))
    ob.data.transform(Matrix.Translation(-shift))
    n0 = tris(ob)
    # no Decimate here: Blender's collapse smeared the scans' UV seams (white patches on the ottoman, the clock, the stools); the budget
    # is reached afterwards by meshoptimizer (gltf-transform weld + simplify), which keeps attribute seams
    mats = gltf_materials(path); used = []
    for k, slot in enumerate(ob.material_slots):
        m = slot.material
        if not m: continue
        orig = m.name.split('.')[0]; info = mats.get(orig) or mats.get(m.name) or {}
        new = f'{name}_{"abcdefgh"[len(used)]}'; m.name = new; used.append({'mat': new, 'from': orig, **info})
    for p in ob.data.polygons: p.use_smooth = True
    ob.name = name + '_LOD0'; ob.data.name = name + '_LOD0'
    outp = os.path.abspath(os.path.join(A.out, name + '.glb'))
    bpy.ops.export_scene.gltf(filepath=outp, export_format='GLB', use_selection=False, export_yup=True, export_apply=True, export_texcoords=True, export_normals=True,
                              export_materials='EXPORT', export_image_format='NONE', export_vertex_color='NONE', export_extras=False, export_cameras=False, export_lights=False)
    vs = [v.co for v in ob.data.vertices]; lo = [min(v[i] for v in vs) for i in range(3)]; hi = [max(v[i] for v in vs) for i in range(3)]
    meta[name] = {'source': src, 'tris': [n0, tris(ob)], 'budget': budget, 'materials': used, 'bbox_blender': [[round(x, 3) for x in lo], [round(x, 3) for x in hi]], 'glb': outp}
    print('SCAN14', name, pid, n0, '->', tris(ob), 'tris', len(used), 'materials', [round(x, 2) for x in lo], [round(x, 2) for x in hi])
json.dump(meta, open(A.meta, 'w'), indent=1)
