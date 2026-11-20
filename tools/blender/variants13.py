"""LUMIERE v13 - design variants for the lobby's columns and ceiling (the user, 2026-11-20: "the pillars look shit ... the ceiling still
sucks ... those cubic lightnings on ceiling which makes no sense ... make variants with the best designs ... and choose the best one").
Each variant is a vignette: a bay of the lobby (Nero Marquina floor, dark walls, the ceiling 9.6 m up) with one column and its ceiling,
lit the way it would be built (warm 2700 K coves, pinpoint downlights), rendered in Cycles and denoised. The board compares them.

    blender --background --factory-startup --python tools/blender/variants13.py -- --out OUT_DIR [--only P1,C2] [--samples 96]

Columns:  P1 gilded fins (a dark core wrapped in brushed-gold fins, warm light between them), P2 Nero Marquina with lit gold reveals,
          P3 fluted bronze on a lit base, P0 the v12c backlit onyx (what the user rejected).
Ceilings: C1 halo (a round two-step recess, continuous warm coves washing a champagne dome, pinpoints round it), C2 linear coves
          (long gold-edged slots of indirect light), C0 the v12c black coffers with a downlight each (what the user rejected)."""
import bpy, bmesh, math, os, sys, argparse
from mathutils import Vector, Matrix

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ap = argparse.ArgumentParser(); ap.add_argument('--out', required=True); ap.add_argument('--only', default=''); ap.add_argument('--samples', type=int, default=96)
ap.add_argument('--res', default='720x900')
A = ap.parse_args(argv)
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TEX = os.path.join(ROOT, 'www', 'tex')
H = 9.6   # the lobby's ceiling


# ------------------------------------------------------------------------------------------------ materials
def mat(name, col, rough=0.5, metal=0.0, emit=None, strength=0.0, tex=None, scale=1.0, coat=0.0):
    m = bpy.data.materials.get(name)
    if m: return m
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; b = nt.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*col, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    if coat: b.inputs['Coat Weight'].default_value = coat; b.inputs['Coat Roughness'].default_value = 0.05
    if emit: b.inputs['Emission Color'].default_value = (*emit, 1); b.inputs['Emission Strength'].default_value = strength
    if tex and os.path.exists(tex):
        im = nt.nodes.new('ShaderNodeTexImage'); im.image = bpy.data.images.load(tex); co = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping')
        mp.inputs['Scale'].default_value = (scale, scale, scale); nt.links.new(co.outputs['Object'], mp.inputs['Vector']); nt.links.new(mp.outputs['Vector'], im.inputs['Vector'])
        im.projection = 'BOX'; im.projection_blend = 0.2; nt.links.new(im.outputs['Color'], b.inputs['Base Color'])
    return m


def mats():
    return {
        'floor': mat('nero', (0.02, 0.02, 0.02), 0.12, tex=os.path.join(TEX, 'nero_a.jpg'), scale=1 / 1.6, coat=0.6),
        'wall': mat('wall', (0.035, 0.03, 0.028), 0.6),
        'marble': mat('marble_wall', (0.02, 0.02, 0.02), 0.15, tex=os.path.join(TEX, 'nero_a.jpg'), scale=1 / 1.6, coat=0.4),
        'gold': mat('gold', (0.83, 0.60, 0.30), 0.22, 1.0),
        'bronze': mat('bronze', (0.42, 0.28, 0.16), 0.32, 1.0),
        'core': mat('core', (0.012, 0.011, 0.010), 0.5),
        'plaster': mat('plaster', (0.10, 0.085, 0.07), 0.9),
        'champagne': mat('champagne', (0.55, 0.45, 0.33), 0.85),
        'lacquer': mat('lacquer', (0.008, 0.008, 0.009), 0.18),
        'led': mat('led', (1, 0.72, 0.42), 1.0, emit=(1.0, 0.70, 0.40), strength=18.0),
        'led_soft': mat('led_soft', (1, 0.72, 0.42), 1.0, emit=(1.0, 0.72, 0.45), strength=6.0),
        'onyx': mat('onyx', (0.8, 0.6, 0.35), 0.3, tex=os.path.join(TEX, 'onyx_a.jpg'), scale=1.0, emit=(1.0, 0.75, 0.45), strength=1.2),
        'disc': mat('disc', (1, 0.85, 0.6), 1.0, emit=(1.0, 0.85, 0.62), strength=30.0),
    }


# ------------------------------------------------------------------------------------------------ geometry helpers
def obj(name, bm, material):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); me.materials.append(material)
    for p in me.polygons: p.use_smooth = False
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o); return o


def box(name, a, b, material, rot_z=0.0, about=(0, 0)):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    bm.transform(Matrix.Translation(((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2)) @ Matrix.Diagonal((b[0] - a[0], b[1] - a[1], b[2] - a[2], 1)))
    if rot_z: bm.transform(Matrix.Translation((about[0], about[1], 0)) @ Matrix.Rotation(rot_z, 4, 'Z') @ Matrix.Translation((-about[0], -about[1], 0)))
    return obj(name, bm, material)


def lathe(name, prof, material, seg=64, at=(0, 0, 0), smooth=True):
    bm = bmesh.new(); rings = []
    for (r, z) in prof:
        rings.append(bm.verts.new((at[0], at[1], at[2] + z)) if r < 1e-4 else [bm.verts.new((at[0] + r * math.cos(2 * math.pi * k / seg), at[1] + r * math.sin(2 * math.pi * k / seg), at[2] + z)) for k in range(seg)])
    for i in range(len(rings)):
        a, b = rings[i], rings[(i + 1) % len(rings)]
        for k in range(seg):
            k2 = (k + 1) % seg
            if isinstance(a, list) and isinstance(b, list): bm.faces.new((a[k], a[k2], b[k2], b[k]))
            elif isinstance(a, list): bm.faces.new((a[k], a[k2], b))
            elif isinstance(b, list): bm.faces.new((a, b[k2], b[k]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); o = obj(name, bm, material)
    if smooth:
        for p in o.data.polygons: p.use_smooth = True
    return o


def ring(name, r0, r1, z0, z1, material, seg=96, at=(0, 0, 0), sy=1.0):
    o = lathe(name, [(r0, z0), (r1, z0), (r1, z1), (r0, z1)], material, seg, at)
    if sy != 1.0: o.scale = (1, sy, 1)
    return o


def area(name, loc, size, rot, strength, color=(1.0, 0.72, 0.45), shape='RECTANGLE', sy=None):
    L = bpy.data.lights.new(name, 'AREA'); L.shape = shape; L.size = size
    if sy is not None: L.size_y = sy
    L.energy = strength; L.color = color
    o = bpy.data.objects.new(name, L); o.location = loc; o.rotation_euler = rot; bpy.context.scene.collection.objects.link(o); return o


def spot(name, loc, aim, power, deg=40, color=(1.0, 0.78, 0.5)):
    L = bpy.data.lights.new(name, 'SPOT'); L.energy = power; L.spot_size = math.radians(deg); L.spot_blend = 0.6; L.color = color; L.shadow_soft_size = 0.03
    o = bpy.data.objects.new(name, L); o.location = loc; bpy.context.scene.collection.objects.link(o)
    d = Vector(aim) - Vector(loc); o.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler(); return o


# ------------------------------------------------------------------------------------------------ the bay
def bay(M, ceiling=True):
    box('floor', (-9, -6, -0.1), (9, 12, 0), M['floor'])
    box('back', (-9, 11.6, 0), (9, 12, H), M['wall'])
    for s in (-1, 1): box('side', (s * 9 - (0.4 if s > 0 else 0), -6, 0), (s * 9 + (0 if s > 0 else 0.4), 12, H), M['wall'])
    if ceiling: box('slab', (-9, -6, H), (9, 12, H + 0.3), M['plaster'])
    # framed art on the back wall, LED-edged (the reference's gallery wall), warm wall washers
    for x in (-5.5, 0.0, 5.5):
        box('frame', (x - 1.2, 11.5, 1.6), (x + 1.2, 11.6, 4.4), M['gold']); box('art', (x - 1.1, 11.49, 1.7), (x + 1.1, 11.5, 4.3), M['core'])
        spot('wash', (x, 9.8, H - 0.3), (x, 11.6, 2.8), 260, 50)


def column_P0(M, x, z):   # v12c onyx (rejected)
    lathe('plinth', [(1e-4, 0), (0.6, 0), (0.6, 0.22), (1e-4, 0.22)], M['core'], 48, (x, z, 0))
    lathe('shaft', [(1e-4, 0.2), (0.45, 0.2), (0.45, H), (1e-4, H)], M['onyx'], 48, (x, z, 0))
    for k in range(8):
        a = 2 * math.pi * k / 8; box('fin', (x + 0.44 * math.cos(a) - 0.01, z + 0.44 * math.sin(a) - 0.01, 0.2), (x + 0.44 * math.cos(a) + 0.01, z + 0.44 * math.sin(a) + 0.01, H), M['gold'])


def column_P1(M, x, z):   # gilded fins with warm light between them (the reference's slat columns)
    lathe('base', [(1e-4, 0), (0.62, 0), (0.62, 0.30), (0.56, 0.36), (1e-4, 0.36)], M['marble'], 64, (x, z, 0))
    ring('baseband', 0.555, 0.63, 0.24, 0.29, M['gold'], 96, (x, z, 0))
    lathe('core', [(1e-4, 0.3), (0.40, 0.3), (0.40, H), (1e-4, H)], M['core'], 64, (x, z, 0))
    lathe('glow', [(1e-4, 0.5), (0.405, 0.5), (0.405, H - 0.5), (1e-4, H - 0.5)], M['led_soft'], 64, (x, z, 0), smooth=True)
    n = 36
    for k in range(n):
        a = 2 * math.pi * k / n; ca, sa = math.cos(a), math.sin(a)
        bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0); bm.transform(Matrix.Diagonal((0.09, 0.016, H - 0.62, 1)))
        bm.transform(Matrix.Translation((x + 0.455 * ca, z + 0.455 * sa, 0.31 + (H - 0.62) / 2)) @ Matrix.Rotation(a, 4, 'Z')); obj('fin', bm, M['gold'])
    ring('cap', 0.38, 0.56, H - 0.32, H - 0.26, M['gold'], 96, (x, z, 0))
    for k in range(4):
        a = 2 * math.pi * k / 4 + 0.4; area('colglow', (x + 0.42 * math.cos(a), z + 0.42 * math.sin(a), 4.8), 0.1, (0, 0, 0), 40, sy=8.0)


def column_P2(M, x, z):   # Nero Marquina square column with lit gold reveals at its corners
    box('base', (x - 0.56, z - 0.56, 0), (x + 0.56, z + 0.56, 0.3), M['core']); box('baseband', (x - 0.575, z - 0.575, 0.24), (x + 0.575, z + 0.575, 0.28), M['gold'])
    box('shaft', (x - 0.5, z - 0.5, 0.3), (x + 0.5, z + 0.5, H), M['marble'])
    for (sx, sz) in ((-1, -1), (1, -1), (-1, 1), (1, 1)):
        box('reveal', (x + sx * 0.5 - 0.06, z + sz * 0.5 - 0.06, 0.3), (x + sx * 0.5 + 0.06, z + sz * 0.5 + 0.06, H), M['gold'])
        box('led', (x + sx * 0.535 - 0.02, z + sz * 0.535 - 0.02, 0.32), (x + sx * 0.535 + 0.02, z + sz * 0.535 + 0.02, H - 0.02), M['led'])
    box('cap', (x - 0.57, z - 0.57, H - 0.3), (x + 0.57, z + 0.57, H - 0.24), M['gold'])


def column_P3(M, x, z):   # fluted bronze on a lit base
    n = 24; prof = []
    bm = bmesh.new(); seg = n * 6; rings = []
    for zz in (0.36, H - 0.35):
        rings.append([bm.verts.new((x + (0.42 - 0.035 * (0.5 + 0.5 * math.cos(2 * math.pi * n * k / seg))) * math.cos(2 * math.pi * k / seg), z + (0.42 - 0.035 * (0.5 + 0.5 * math.cos(2 * math.pi * n * k / seg))) * math.sin(2 * math.pi * k / seg), zz)) for k in range(seg)])
    for k in range(seg): k2 = (k + 1) % seg; bm.faces.new((rings[0][k], rings[0][k2], rings[1][k2], rings[1][k]))
    bm.faces.new(list(reversed(rings[0]))); bm.faces.new(rings[1]); bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); o = obj('fluted', bm, M['bronze'])
    for p in o.data.polygons: p.use_smooth = True
    lathe('base', [(1e-4, 0), (0.62, 0), (0.62, 0.36), (1e-4, 0.36)], M['marble'], 64, (x, z, 0)); ring('baseglow', 0.62, 0.64, 0.02, 0.05, M['led'], 96, (x, z, 0))
    ring('cap', 0.36, 0.55, H - 0.36, H - 0.28, M['gold'], 96, (x, z, 0))
    for k in range(6):
        a = 2 * math.pi * k / 6; spot('up', (x + 0.7 * math.cos(a), z + 0.7 * math.sin(a), 0.05), (x + 0.42 * math.cos(a), z + 0.42 * math.sin(a), 6.0), 120, 18)


def ceiling_C0(M):   # v12c black coffers, a downlight each (rejected)
    for x in [-7.2 + 2.7 * k for k in range(7)]: box('beamx', (x - 0.12, -6, H - 0.45), (x + 0.12, 12, H), M['lacquer'])
    for z in [-4.0 + 2.55 * k for k in range(7)]: box('beamz', (-9, z - 0.12, H - 0.47), (9, z + 0.12, H), M['lacquer'])
    for x in [-5.85 + 2.7 * k for k in range(6)]:
        for z in [-2.72 + 2.55 * k for k in range(6)]: ring('dl', 0, 0.09, H - 0.01, H, M['disc'], 24, (x, z, 0)); spot('dl', (x, z, H - 0.05), (x, z, 0), 60, 45)


def ceiling_C1(M):   # halo: a round two-step recess over the court, continuous warm coves washing a champagne dome; pinpoints round it
    cx, cz = 0.0, 3.0
    # the field: a dropped ceiling 0.5 m down with a round opening (R 6.2), its edge a gold band; a second step (R 4.6) 0.35 m higher
    bm = bmesh.new(); seg = 128; Ro, ft = 9.0, 0.5
    outer = [bm.verts.new((cx + 12 * math.cos(2 * math.pi * k / seg), cz + 12 * math.sin(2 * math.pi * k / seg), H - ft)) for k in range(seg)]
    inner = [bm.verts.new((cx + 6.2 * math.cos(2 * math.pi * k / seg), cz + 6.2 * math.sin(2 * math.pi * k / seg), H - ft)) for k in range(seg)]
    for k in range(seg): k2 = (k + 1) % seg; bm.faces.new((outer[k], outer[k2], inner[k2], inner[k]))
    o = obj('field', bm, M['plaster']); o.data.polygons.foreach_set('use_smooth', [False] * len(o.data.polygons))
    ring('lip1', 6.2, 6.32, H - ft - 0.06, H - ft + 0.01, M['gold'], 160, (cx, cz, 0))
    ring('step2', 4.6, 6.3, H - 0.22, H - 0.18, M['plaster'], 160, (cx, cz, 0)); ring('lip2', 4.6, 4.7, H - 0.26, H - 0.17, M['gold'], 160, (cx, cz, 0))
    lathe('dome', [(1e-4, H + 0.25), (4.7, H + 0.25), (4.7, H + 0.3), (1e-4, H + 0.3)], M['champagne'], 96, (cx, cz, 0))
    ring('wallup', 6.25, 6.3, H - ft, H - 0.18, M['plaster'], 160, (cx, cz, 0)); ring('wallup2', 4.65, 4.7, H - 0.2, H + 0.25, M['plaster'], 160, (cx, cz, 0))
    # the coves: LED strips on top of each step's lip, facing up and in (hidden from below), lighting the step above
    ring('cove1', 6.32, 6.42, H - ft + 0.01, H - ft + 0.03, M['led'], 160, (cx, cz, 0)); ring('cove2', 4.7, 4.8, H - 0.17, H - 0.15, M['led'], 160, (cx, cz, 0))
    if not CONT:
        for R, y, p in ((6.37, H - ft + 0.05, 2200), (4.75, H - 0.12, 1500)):
            for k in range(24):
                a = 2 * math.pi * k / 24; area('cove', (cx + R * math.cos(a), cz + R * math.sin(a), y), 0.06, (math.pi, 0, a + math.pi / 2), p / 24, sy=2 * math.pi * R / 24)   # facing up into the step above
    # pinpoints: a ring of small downlights on the field and two rows along the walls
    for k in range(16):
        a = 2 * math.pi * (k + 0.5) / 16; x, z = cx + 7.6 * math.cos(a), cz + 7.6 * math.sin(a)
        if abs(x) < 8.6 and -5.6 < z < 11.4: ring('pin', 0, 0.035, H - ft - 0.012, H - ft - 0.002, M['disc'], 16, (x, z, 0)); spot('pin', (x, z, H - ft - 0.05), (x, z, 0), 70, 30)
    # a perimeter cove along the back wall: the field stops 0.3 m short of it, a hidden strip washes the wall from the top
    box('fieldgap', (-9, 11.0, H - ft - 0.08), (9, 11.3, H - ft), M['plaster']); box('wallcove', (-8.9, 11.3, H - ft - 0.05), (8.9, 11.4, H - ft - 0.03), M['led'])
    area('wallwash', (0, 11.35, H - ft - 0.1), 17.0, (0, 0, 0), 900, sy=0.08)


CONT = False


def ceiling_C1b(M):   # the halo with continuous coves: emissive rings hidden behind each lip, nothing else
    global CONT
    CONT = True; M['led'].node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value = 90.0; ceiling_C1(M); CONT = False


def ceiling_C3(M):   # a floating disc: a lacquer disc 0.4 m under a plain ceiling, a gold rim, a warm glow round its top edge washing the
    # ceiling above it (the reference lobby's round element); pinpoints in a ring; a perimeter wall wash
    cx, cz = 0.0, 3.0
    lathe('disc', [(1e-4, H - 0.75), (5.2, H - 0.75), (5.4, H - 0.62), (5.4, H - 0.55), (1e-4, H - 0.55)], M['lacquer'], 128, (cx, cz, 0))
    ring('rim', 5.39, 5.46, H - 0.66, H - 0.58, M['gold'], 160, (cx, cz, 0))
    ring('topglow', 4.9, 5.3, H - 0.55, H - 0.53, M['led'], 160, (cx, cz, 0)); M['led'].node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value = 60.0
    for k in range(6): cyl_ = lathe('rod', [(1e-4, H - 0.56), (0.012, H - 0.56), (0.012, H + 0.01), (1e-4, H + 0.01)], M['gold'], 12, (cx + 3.5 * math.cos(k * math.pi / 3), cz + 3.5 * math.sin(k * math.pi / 3), 0))
    for k in range(20):
        a = 2 * math.pi * (k + 0.5) / 20; x, z = cx + 4.2 * math.cos(a), cz + 4.2 * math.sin(a)
        ring('pin', 0, 0.035, H - 0.762, H - 0.752, M['disc'], 16, (x, z, 0)); spot('pin', (x, z, H - 0.8), (x, z, 0), 80, 28)
    box('wallcove', (-8.9, 11.3, H - 0.6), (8.9, 11.45, H - 0.56), M['led']); area('wallwash', (0, 11.35, H - 0.65), 17.0, (0, 0, 0), 900, sy=0.08)


def column_P4(M, x, z):   # brass slat column: a dark core, deep brushed-brass slats (the reference's slat screens), grazed by uplights from its base
    lathe('base', [(1e-4, 0), (0.6, 0), (0.6, 0.30), (0.55, 0.36), (1e-4, 0.36)], M['marble'], 64, (x, z, 0))
    ring('baseband', 0.545, 0.615, 0.24, 0.29, M['gold'], 96, (x, z, 0))
    lathe('core', [(1e-4, 0.3), (0.36, 0.3), (0.36, H), (1e-4, H)], M['core'], 64, (x, z, 0))
    n = 30
    for k in range(n):
        a = 2 * math.pi * k / n; ca, sa = math.cos(a), math.sin(a)
        bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0); bm.transform(Matrix.Diagonal((0.11, 0.032, H - 0.66, 1)))
        bm.transform(Matrix.Translation((x + 0.415 * ca, z + 0.415 * sa, 0.33 + (H - 0.66) / 2)) @ Matrix.Rotation(a, 4, 'Z')); obj('slat', bm, M['gold'])
    ring('cap', 0.34, 0.54, H - 0.33, H - 0.27, M['gold'], 96, (x, z, 0))
    ring('baseglow', 0.47, 0.53, 0.36, 0.37, M['led'], 96, (x, z, 0))
    for k in range(10):
        a = 2 * math.pi * (k + 0.5) / 10; spot('graze', (x + 0.5 * math.cos(a), z + 0.5 * math.sin(a), 0.38), (x + 0.45 * math.cos(a), z + 0.45 * math.sin(a), 6.0), 90, 10)


def ceiling_C2(M):   # linear coves: long gold-edged slots of indirect light, pinpoints between
    for x in (-5.4, 0.0, 5.4):
        box('slotback', (x - 0.6, -6, H + 0.25), (x + 0.6, 12, H + 0.3), M['champagne'])
        for s in (-1, 1):
            box('slotside', (x + s * 0.6 - 0.02, -6, H), (x + s * 0.6 + 0.02, 12, H + 0.25), M['plaster']); box('slotedge', (x + s * 0.6 - 0.03, -6, H - 0.03), (x + s * 0.6 + 0.03, 12, H + 0.005), M['gold'])
            box('slotled', (x + s * 0.55 - 0.02, -6, H + 0.02), (x + s * 0.55 + 0.02, 12, H + 0.05), M['led'])
        area('slot', (x, 3, H + 0.05), 1.0, (0, math.radians(180), 0), 1600, sy=18.0)
        for z in (-3.0, 1.5, 6.0, 10.0):
            for dx in (-2.7, 2.7):
                if abs(x + dx) < 8.5: ring('pin', 0, 0.035, H - 0.01, H, M['disc'], 16, (x + dx, z, 0)); spot('pin', (x + dx, z, H - 0.05), (x + dx, z, 0), 70, 30)


VARIANTS = {'P0': ('C0', column_P0), 'P1': ('C1', column_P1), 'P2': ('C1', column_P2), 'P3': ('C1', column_P3), 'P4': ('C1b', column_P4),
            'C0': ('C0', column_P1), 'C1': ('C1', column_P1), 'C2': ('C2', column_P1), 'C1b': ('C1b', column_P3), 'C3': ('C3', column_P3)}
CEIL = {'C0': ceiling_C0, 'C1': ceiling_C1, 'C2': ceiling_C2, 'C1b': ceiling_C1b, 'C3': ceiling_C3}


def render(name):
    for o in list(bpy.data.objects): bpy.data.objects.remove(o)
    for m in list(bpy.data.meshes): bpy.data.meshes.remove(m)
    for l in list(bpy.data.lights): bpy.data.lights.remove(l)
    M = mats(); ck, col = VARIANTS[name]; bay(M); CEIL[ck](M)
    cols = [(-4.4, 4.4), (4.4, 4.4)] if name.startswith('P') else [(-5.0, 6.0), (5.0, 6.0)]
    for (x, z) in cols: col(M, x, z)
    sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.samples = A.samples; sc.cycles.use_denoising = True; sc.cycles.device = 'CPU'
    sc.cycles.max_bounces = 6; sc.cycles.caustics_reflective = False; sc.cycles.caustics_refractive = False
    w, h = (int(v) for v in A.res.split('x')); sc.render.resolution_x, sc.render.resolution_y = w, h
    sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Medium High Contrast'; sc.view_settings.exposure = 0.6
    W = bpy.data.worlds.new('w'); W.use_nodes = True; W.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.0; sc.world = W
    cd = bpy.data.cameras.new('cam'); cd.lens = 18 if name.startswith('C') else 22; cam = bpy.data.objects.new('cam', cd); sc.collection.objects.link(cam); sc.camera = cam
    if name.startswith('C'): cam.location = (0, -5.4, 1.62); cam.rotation_euler = (math.radians(90 + 32), 0, 0)
    else: cam.location = (-0.6, -4.2, 1.62); cam.rotation_euler = (math.radians(90 + 14), 0, math.radians(-8))
    sc.render.filepath = os.path.join(A.out, name + '.png'); bpy.ops.render.render(write_still=True); print('VARIANT', name, sc.render.filepath, flush=True)


bpy.ops.wm.read_factory_settings(use_empty=True); os.makedirs(A.out, exist_ok=True)
for name in (A.only.split(',') if A.only else ['P0', 'P1', 'P2', 'P3', 'C0', 'C1', 'C2']): render(name)
