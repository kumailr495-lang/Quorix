"""Quick geometry preview of a built room (before baking): Workbench render with the vertex tints, from a list of cameras.
usage: blender --background --factory-startup --python tools/blender/arch/preview.py -- ROOM_JSON OUT_PREFIX "x,y,z,yaw_deg,pitch_deg[,fov]" ...
(engine coordinates; yaw 0 looks along -z, yaw 90 along -x, as in three.js)"""
import bpy, sys, json, base64, math
import numpy as np
argv = sys.argv[sys.argv.index('--') + 1:]
D = json.load(open(argv[0])); out = argv[1]; cams = argv[2:]
arr = lambda s, dt, w=1: (np.frombuffer(base64.b64decode(s), dtype=dt).reshape(-1, w) if w > 1 else np.frombuffer(base64.b64decode(s), dtype=dt))
bl = lambda p: np.stack([p[:, 0], -p[:, 2], p[:, 1]], 1)
bpy.ops.wm.read_factory_settings(use_empty=True); SC = bpy.context.scene
def mesh(name, P, col):
    me = bpy.data.meshes.new(name); n = len(P); me.vertices.add(n); me.vertices.foreach_set('co', bl(P).astype(np.float32).ravel())
    me.loops.add(n); me.loops.foreach_set('vertex_index', np.arange(n, dtype=np.int32)); me.polygons.add(n // 3)
    me.polygons.foreach_set('loop_start', np.arange(0, n, 3, dtype=np.int32)); me.polygons.foreach_set('loop_total', np.full(n // 3, 3, np.int32)); me.update(calc_edges=True)
    a = me.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT'); a.data.foreach_set('color', np.c_[col, np.ones(n)].astype(np.float32).ravel())
    ob = bpy.data.objects.new(name, me); SC.collection.objects.link(ob); return ob
S = D['solid']; P = arr(S['pos'], np.float32, 3); C = arr(S['col'], np.float32, 3)
mesh('room', P, np.clip(C ** (1 / 2.2) * 1.4, 0, 1))
xp = argv[0].replace('tools/bake/.work/', 'www/bake/').replace('.json', '_x.json')
try:
    X = json.load(open(xp))
    if 'glow' in X: GP = arr(X['glow']['pos'], np.float32, 3); GC = arr(X['glow']['col'], np.float32, 3); mesh('glow', GP, np.clip(GC, 0, 1))
except Exception as e: print('no glow', e)
SC.render.engine = 'BLENDER_WORKBENCH'; sh = SC.display.shading
sh.light = 'STUDIO'; sh.color_type = 'VERTEX'; sh.show_backface_culling = True; sh.show_cavity = True; sh.cavity_type = 'WORLD'
SC.render.resolution_x, SC.render.resolution_y = 1280, 720; SC.world = bpy.data.worlds.new('w')
for i, c in enumerate(cams):
    v = [float(t) for t in c.split(',')]; x, y, z, yaw, pitch = v[:5]; fov = v[5] if len(v) > 5 else 70
    cd = bpy.data.cameras.new('c'); cd.angle = math.radians(fov); cd.clip_start = 0.05; cd.clip_end = 300
    cam = bpy.data.objects.new('cam', cd); SC.collection.objects.link(cam); SC.camera = cam
    cam.location = (x, -z, y); cam.rotation_euler = (math.radians(90 + pitch), 0, math.radians(yaw))
    SC.render.filepath = f'{out}_{i}.png'; bpy.ops.render.render(write_still=True)
print('PREVIEW_DONE')
