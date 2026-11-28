# LUMIERE v14c - an original film frame for the key art: golden hour over a mountain lake (Cycles). The still is looped into a short
# video that plays on a hall's screen in tools/art/keyart.mjs, so the audience is lit by it.
# usage: blender --background --factory-startup --python tools/art/filmframe.py -- OUT.png [W H]
import bpy, bmesh, sys, math, random
from mathutils import Vector, noise
argv = sys.argv[sys.argv.index('--') + 1:]; out = argv[0]; W = int(argv[1]) if len(argv) > 1 else 1920; H = int(argv[2]) if len(argv) > 2 else 800
bpy.ops.wm.read_factory_settings(use_empty=True); sc = bpy.context.scene
sc.render.engine = 'CYCLES'; sc.cycles.samples = 96; sc.cycles.use_denoising = True; sc.render.resolution_x, sc.render.resolution_y = W, H
sc.view_settings.view_transform = 'AgX'
try: sc.view_settings.look = 'AgX - Punchy'
except Exception: pass
w = bpy.data.worlds.new('W'); sc.world = w; nt = w.node_tree; nt.nodes.clear()
sky = nt.nodes.new('ShaderNodeTexSky')
for t in ('MULTIPLE_SCATTERING', 'NISHITA', 'SINGLE_SCATTERING'):
    try: sky.sky_type = t; break
    except Exception: pass
sky.sun_elevation = math.radians(3.0); sky.sun_rotation = math.radians(8); sky.sun_disc = True   # in front: the ridges stand against it
try: sky.air_density = 1.4; sky.dust_density = 4.0
except Exception: pass
bg = nt.nodes.new('ShaderNodeBackground'); bg.inputs['Strength'].default_value = 0.35; o = nt.nodes.new('ShaderNodeOutputWorld')
nt.links.new(sky.outputs[0], bg.inputs[0]); nt.links.new(bg.outputs[0], o.inputs[0])
def ridge(name, dist, height, rough, seed, col):
    me = bpy.data.meshes.new(name); bm = bmesh.new(); nx = 220; xs = [(-1.6 + 3.2 * i / nx) * dist for i in range(nx + 1)]
    top = []
    for x in xs:
        h = height * (0.55 + 0.45 * noise.noise(Vector((x / dist * 1.3 + seed, seed, 0.0)))) + height * rough * noise.noise(Vector((x / dist * 6.0, seed * 2.0, 1.0)))
        top.append(bm.verts.new((x, dist, max(0.02 * dist, h))))
    bot = [bm.verts.new((x, dist, -0.02 * dist)) for x in xs]
    for i in range(nx): bm.faces.new((bot[i], bot[i + 1], top[i + 1], top[i]))
    bm.to_mesh(me); ob = bpy.data.objects.new(name, me); sc.collection.objects.link(ob)
    m = bpy.data.materials.new(name); bsdf = m.node_tree.nodes['Principled BSDF']; bsdf.inputs['Base Color'].default_value = (0.01, 0.01, 0.012, 1); bsdf.inputs['Roughness'].default_value = 0.9
    bsdf.inputs['Emission Color'].default_value = (*col, 1); bsdf.inputs['Emission Strength'].default_value = 1.0   # aerial haze: far ridges lighter
    ob.data.materials.append(m)
ridge('far', 900, 120, 0.35, 1.3, (0.42, 0.2, 0.24)); ridge('mid', 420, 70, 0.3, 4.1, (0.12, 0.05, 0.08)); ridge('near', 160, 26, 0.45, 7.7, (0.012, 0.008, 0.012))
# the lake: a mirror-like plane with soft ripples catching the sun
bpy.ops.mesh.primitive_plane_add(size=6000, location=(0, 0, 0)); lake = bpy.context.object
m = bpy.data.materials.new('lake'); n = m.node_tree.nodes; b = n['Principled BSDF']; b.inputs['Base Color'].default_value = (0.02, 0.03, 0.04, 1); b.inputs['Roughness'].default_value = 0.06; b.inputs['Metallic'].default_value = 0.0
tx = n.new('ShaderNodeTexNoise'); tx.inputs['Scale'].default_value = 0.08; bump = n.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.08
m.node_tree.links.new(tx.outputs['Fac'], bump.inputs['Height']); m.node_tree.links.new(bump.outputs['Normal'], b.inputs['Normal']); lake.data.materials.append(m)
# a lone pine on the near shore and two birds, small, so the frame reads as a scene from a film, not a wallpaper
def pine(x, y, s):
    for i, (r, z0, z1) in enumerate([(0.9, 0.6, 3.2), (0.7, 2.4, 4.6), (0.5, 3.8, 5.8), (0.3, 5.0, 6.8)]):
        bpy.ops.mesh.primitive_cone_add(vertices=10, radius1=r * s, depth=(z1 - z0) * s, location=(x, y, (z0 + (z1 - z0) / 2) * s + 1.0))
        bpy.context.object.data.materials.append(bpy.data.materials['near'])
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.12 * s, depth=1.4 * s, location=(x, y, 0.7 * s + 0.6)); bpy.context.object.data.materials.append(bpy.data.materials['near'])
pine(-34, 150, 2.6); pine(-27, 152, 1.9)
cam = bpy.data.cameras.new('C'); cam.lens = 40; co = bpy.data.objects.new('C', cam); sc.collection.objects.link(co); sc.camera = co
co.location = (0, -20, 6.5); co.rotation_euler = (math.radians(88.2), 0, 0)
sun = bpy.data.lights.new('S', 'SUN'); sun.energy = 2.2; sun.color = (1.0, 0.36, 0.08); so = bpy.data.objects.new('S', sun); sc.collection.objects.link(so)
so.rotation_euler = (math.radians(90 - 2.2), 0, math.radians(180))
sc.render.filepath = out; sc.render.image_settings.file_format = 'PNG'; bpy.ops.render.render(write_still=True); print('FRAME', out)
