# LUMIERE v14c - loading-screen key art: an engine still turned into a painting (Blender compositor, anisotropic Kuwahara), then
# graded in tools/art/grade.py. Original work: our own renders of our own game.
# usage: blender --background --factory-startup --python tools/art/paint.py -- IN.png OUT.png [SIZE=8]
import bpy, sys
argv = sys.argv[sys.argv.index('--') + 1:]; src, dst = argv[0], argv[1]; size = int(argv[2]) if len(argv) > 2 else 8
img = bpy.data.images.load(src); W, H = img.size
sc = bpy.context.scene; sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = W, H, 100
try: sc.render.engine = 'BLENDER_WORKBENCH'
except Exception: pass
sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'
sc.render.image_settings.file_format = 'PNG'; sc.render.filepath = dst
ng = bpy.data.node_groups.new('Paint', 'CompositorNodeTree'); sc.compositing_node_group = ng
ng.interface.new_socket('Image', in_out='OUTPUT', socket_type='NodeSocketColor')
n_img = ng.nodes.new('CompositorNodeImage'); n_img.image = img
k = ng.nodes.new('CompositorNodeKuwahara'); out = ng.nodes.new('NodeGroupOutput')
print('KUWAHARA inputs', [(i.name, getattr(i, 'default_value', None)) for i in k.inputs])
def setin(node, name, val):
    for i in node.inputs:
        if i.name == name:
            try: i.default_value = val; return True
            except Exception as e: print('cannot set', name, e)
    for attr in (name.lower().replace(' ', '_'),):
        if hasattr(node, attr):
            try: setattr(node, attr, val); return True
            except Exception as e: print('cannot set attr', attr, e)
    return False
setin(k, 'Type', 'Anisotropic'); setin(k, 'Variation', 'Anisotropic'); setin(k, 'Size', size); setin(k, 'High Precision', True)
setin(k, 'Uniformity', 4); setin(k, 'Sharpness', 0.75); setin(k, 'Eccentricity', 1.0)
ng.links.new(n_img.outputs['Image'], k.inputs['Image']); ng.links.new(k.outputs['Image'], out.inputs[0])
bpy.ops.render.render(write_still=True); print('PAINTED', dst, W, H)
