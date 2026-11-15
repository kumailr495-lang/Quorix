"""UNFINISHED, NOT USED: the game's taxi is built by tools/blender/cars.py (car_taxi.glb); its cabin by tools/blender/cabin.py. Kept as
the start of a cage-modelled body (2026-11-06), never wired into a build.

LUMIERE v9.3 taxi (the user: "make the intro and car model better"; v8's cars.py lofted superellipse sections and read as a toy:
a uniform rounded section with no shoulder line, light glass with no black surround, no dark lower parts, a bubble-shaped nose).

    blender --background --factory-startup --python tools/blender/taxi.py -- --out www/models [--review DIR]

A modern mid-size four-door saloon, unbranded, built the way car modellers work: a quad control cage (stations along the length by rows
round the half section, mirrored), subdivided twice with creases on the shoulder line, the sill and the hood edges. Windows, pillars
and lower parts are regions of the cage, so their outlines are smooth curves; a ring of black trim follows every window. Wheel arches
are pockets cut from each side; lamps, grille, mirrors, handles and plates sit on the surface where ray casts put them. The cabin
(seats, dashboard, wheel, door cards, headliner) shows through tinted see-through glass, which is its own asset (car_taxi_glass), and
the wheels are their own asset (car_wheel) so the game can turn and steer them.
Frame: +X front, +Y left, +Z up, ground Z = 0. Sizes of a typical mid-size saloon: 4.86 m long, 1.84 m wide (body), 1.445 m tall,
2.82 m wheelbase, 1.58 m track, 235/45 R18 tyres (0.67 m). Right-hand drive: the game's kerb is on the car's left."""
import bpy, bmesh, math, sys, os, argparse
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lbl
from lbl import material, box_uv

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ap = argparse.ArgumentParser(); ap.add_argument('--out', default='www/models'); ap.add_argument('--review', default=''); ap.add_argument('--body-only', action='store_true')
A = ap.parse_args(argv)
for k, v in {'car_yellow': ((0.80, 0.50, 0.02), 0.22, 0.0), 'tyre': ((0.012, 0.012, 0.012), 0.9, 0.0), 'car_silver': ((0.6, 0.62, 0.65), 0.28, 1.0),
             'chrome': ((0.9, 0.9, 0.9), 0.08, 1.0)}.items():
    lbl.MAT_DEF.setdefault(k, v)
lbl.GLOW_DEF.update({'glow_head': ((1.0, 0.95, 0.86), 3.0), 'glow_tail': ((1.0, 0.04, 0.03), 2.6), 'glow_taxi': ((1.0, 0.8, 0.32), 2.6), 'glow_amber': ((1.0, 0.45, 0.05), 2.0)})

XA_F, XA_R, RW, TRACK = 1.48, -1.34, 0.335, 0.79   # axles, wheel radius, half track

# ---------------------------------------------------------------- the cage: stations (front to rear) x rows round the left half section
# rows: 0 underbody centre, 1 underbody outer, 2 rocker bottom, 3 sill top, 4 lower door, 5 door belly, 6 shoulder line, 7 shoulder top,
# 8 beltline (window base), 9 glass middle, 10 window top, 11 roof rail / windscreen and backlight edge, 12 glass or roof inner, 13 centre
# each point (y, z) or (y, z, x) when that row's point sits off the station's x
ST = [
    (2.43, [(0, .24, 2.40), (.48, .24, 2.42), (.64, .26, 2.43), (.70, .31, 2.44), (.73, .40, 2.45), (.735, .50, 2.45), (.725, .62, 2.43), (.69, .69, 2.39), (.635, .725, 2.36), (.50, .74, 2.35), (.37, .745, 2.345), (.25, .748, 2.34), (.13, .75, 2.34), (0, .752, 2.34)]),
    (2.33, [(0, .23), (.54, .23), (.72, .25), (.79, .30), (.82, .41), (.83, .52), (.825, .645, 2.31), (.79, .73, 2.27), (.73, .775, 2.24), (.57, .79, 2.22), (.42, .797, 2.22), (.28, .80, 2.22), (.145, .802, 2.22), (0, .804, 2.22)]),
    (2.10, [(0, .22), (.58, .22), (.78, .24), (.845, .31), (.872, .44), (.878, .58), (.865, .725), (.815, .805), (.745, .83), (.59, .845), (.44, .852), (.30, .856), (.155, .858), (0, .86)]),
    (1.80, [(0, .20), (.60, .20), (.815, .22), (.875, .30), (.90, .44), (.905, .59), (.893, .755), (.845, .845), (.775, .872), (.61, .885), (.45, .892), (.31, .896), (.16, .898), (0, .90)]),
    (1.48, [(0, .18), (.62, .18), (.83, .20), (.89, .29), (.912, .44), (.918, .60), (.906, .775), (.86, .87), (.79, .902), (.62, .915), (.46, .921), (.32, .925), (.17, .927), (0, .929)]),
    (1.15, [(0, .17), (.62, .17), (.83, .19), (.89, .29), (.913, .44), (.92, .61), (.91, .795), (.868, .905), (.80, .935), (.63, .948), (.47, .955), (.33, .958), (.18, .96), (0, .962)]),
    (1.02, [(0, .17), (.62, .17), (.833, .19), (.891, .29), (.915, .44), (.922, .612), (.912, .798), (.872, .915), (.82, .952), (.73, .962), (.64, .968), (.55, .972), (.42, .968), (0, .966)]),
    (0.92, [(0, .17), (.62, .17), (.835, .19), (.893, .29), (.917, .44), (.924, .615), (.914, .80), (.877, .925), (.838, .972, .90), (.81, .98, .885), (.785, .985, .875), (.755, .99, .88), (.70, .985, .90), (0, .965, .96)]),
    (0.55, [(0, .17), (.62, .17), (.838, .19), (.895, .29), (.918, .44), (.925, .62), (.915, .80), (.878, .925), (.84, .975), (.81, 1.06), (.775, 1.135), (.725, 1.175), (.68, 1.18, .56), (0, 1.21, .60)]),
    (0.12, [(0, .17), (.62, .17), (.838, .19), (.895, .29), (.918, .44), (.925, .62), (.915, .80), (.878, .925), (.84, .975), (.77, 1.165), (.685, 1.345), (.635, 1.385), (.585, 1.405, .13), (0, 1.432, .15)]),
    (-0.10, [(0, .17), (.62, .17), (.838, .19), (.895, .29), (.918, .44), (.925, .62), (.915, .80), (.878, .925), (.84, .975), (.765, 1.175), (.672, 1.365), (.635, 1.392), (.585, 1.413), (0, 1.443)]),
    (-0.22, [(0, .17), (.62, .17), (.838, .19), (.895, .29), (.918, .44), (.925, .62), (.915, .80), (.878, .925), (.84, .975), (.765, 1.175), (.672, 1.365), (.635, 1.392), (.585, 1.413), (0, 1.444)]),
    (-0.55, [(0, .17), (.62, .17), (.838, .19), (.895, .29), (.918, .44), (.925, .62), (.915, .80), (.878, .925), (.84, .975), (.765, 1.17), (.672, 1.355), (.635, 1.385), (.58, 1.405), (0, 1.438)]),
    (-0.95, [(0, .17), (.62, .17), (.837, .19), (.894, .29), (.917, .44), (.924, .62), (.914, .80), (.877, .926), (.838, .978), (.77, 1.12), (.69, 1.27), (.64, 1.33), (.57, 1.36), (0, 1.39)]),
    (-1.25, [(0, .175), (.62, .175), (.836, .195), (.893, .295), (.916, .445), (.923, .62), (.913, .805), (.876, .928), (.836, .982), (.81, 1.01), (.785, 1.035), (.68, 1.17), (.58, 1.20, -1.24), (0, 1.225, -1.22)]),
    (-1.62, [(0, .19), (.62, .19), (.83, .21), (.885, .31), (.912, .45), (.92, .62), (.912, .81), (.875, .93), (.835, .985), (.815, .99), (.79, .998), (.72, 1.01), (.58, 1.025), (0, 1.035)]),
    (-2.00, [(0, .23), (.60, .23), (.80, .25), (.86, .33), (.895, .46), (.905, .62), (.895, .81), (.86, .92), (.815, .975), (.78, .985), (.72, .995), (.60, 1.005), (.40, 1.015), (0, 1.02)]),
    (-2.30, [(0, .26), (.56, .26), (.75, .27), (.81, .34), (.84, .46), (.85, .62), (.84, .80), (.81, .91), (.77, .96), (.735, .975), (.68, .99), (.58, 1.0), (.40, 1.01), (0, 1.015)]),
    (-2.43, [(0, .28, -2.38), (.50, .28, -2.40), (.66, .30, -2.41), (.72, .35, -2.42), (.75, .45, -2.43), (.76, .58, -2.44), (.755, .74, -2.44), (.73, .86, -2.43), (.69, .93, -2.415), (.63, .965, -2.405), (.55, .978, -2.40), (.45, .985, -2.40), (.30, .99, -2.40), (0, .992, -2.40)]),
]
NS, NR = len(ST), len(ST[0][1])
for _i in range(3, NS - 3):   # stations along the doors and arches
    _r = ST[_i][1]; _t = lambda j, dy: (_r[j][0] + dy,) + tuple(_r[j][1:])
    _r[6] = _t(6, 0.012); _r[5] = _t(5, -0.006); _r[3] = _t(3, 0.006)
I_COWL, I_ROOF0, I_B0, I_B1, I_C0, I_C1, I_DECK = 7, 9, 10, 11, 13, 14, 15   # station indices: cowl, roof front, B-pillar, C-pillar, deck


def cage_point(i, j, side):
    x, rows = ST[i]; p = rows[j]; px = p[2] if len(p) > 2 else x
    return Vector((px, side * p[0], p[1]))


def region(i, j):
    """material of the cage face between stations i, i+1 and rows j, j+1: 0 paint, 1 black, 2 glass"""
    if j in (0, 1): return 1                                                       # underbody and the rocker's underside
    if 8 <= j <= 9 and I_COWL <= i <= I_C0: return 1 if i == I_B0 else 2          # side glass (the B-pillar between the doors is black)
    if 11 <= j <= 12 and I_COWL <= i < I_ROOF0: return 2                           # windscreen
    if 11 <= j <= 12 and I_C0 <= i < I_DECK: return 2                             # backlight
    return 0


def build_body():
    bm = bmesh.new(); V = {}
    for i in range(NS):
        for j in range(NR):
            for s in (1, -1):
                if s < 0 and ST[i][1][j][0] == 0: V[(i, j, s)] = V[(i, j, 1)]; continue
                V[(i, j, s)] = bm.verts.new(cage_point(i, j, s))
    for i in range(NS - 1):
        for j in range(NR - 1):
            for s in (1, -1):
                q = [V[(i, j, s)], V[(i + 1, j, s)], V[(i + 1, j + 1, s)], V[(i, j + 1, s)]]
                if s < 0: q.reverse()
                f = bm.faces.new(q); f.material_index = region(i, j)
    # nose and tail: each end ring closed by a grid (a column of points down the centre line, bulged outward a little)
    for i, out in ((0, 1), (NS - 1, -1)):
        x0 = ST[i][0]; col = [V[(i, 0, 1)]]
        for j in range(1, NR - 1):
            l = cage_point(i, j, 1); c = Vector((l.x + out * (0.012 + 0.012 * math.sin(math.pi * j / (NR - 1))), 0, l.z)); col.append(bm.verts.new(c))
        col.append(V[(i, NR - 1, 1)])
        for j in range(NR - 1):
            for s in (1, -1):
                q = [V[(i, j, s)], V[(i, j + 1, s)], col[j + 1], col[j]]; q = [v for k, v in enumerate(q) if v not in q[:k]]   # the corners on the centre line are triangles
                if (s > 0) == (out > 0): q.reverse()
                f = bm.faces.new(q); f.material_index = 1 if j < 2 else 0
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    # creases: the shoulder line and the sill all along, the hood's edges, the beltline
    cr = bm.edges.layers.float.get('crease_edge') or bm.edges.layers.float.new('crease_edge')
    def crease(j, i0, i1, k):
        for i in range(i0, i1):
            for s in (1, -1):
                e = bm.edges.get((V[(i, j, s)], V[(i + 1, j, s)]))
                if e: e[cr] = k
    crease(6, 0, NS - 1, 0.75); crease(3, 0, NS - 1, 0.55); crease(8, 1, I_COWL, 0.5); crease(8, I_DECK, NS - 2, 0.5); crease(7, 1, NS - 2, 0.25)
    # the end rings get a crease too, so the nose and tail turn their corners tightly
    for i in (0, NS - 1):
        for j in range(NR - 1):
            for s in (1, -1):
                e = bm.edges.get((V[(i, j, s)], V[(i, j + 1, s)]))
                if e: e[cr] = 0.45
    me = bpy.data.meshes.new('Body'); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new('Body', me); bpy.context.scene.collection.objects.link(ob)
    for m in ('car_yellow', 'plastic_black', 'glass'): me.materials.append(material(m))
    sd = ob.modifiers.new('subd', 'SUBSURF'); sd.levels = sd.render_levels = 2; sd.use_creases = True; sd.boundary_smooth = 'ALL'; sd.use_limit_surface = True
    fit(ob, [v.co.copy() for v in me.vertices])
    bpy.context.view_layer.objects.active = ob; ob.select_set(True); bpy.ops.object.modifier_apply(modifier=sd.name)
    return ob


def fit(ob, target, iters=12):
    """move the cage until the subdivided surface passes through the design points (the cage's own vertices keep their indices at
    the start of the subdivided mesh, at their limit positions)"""
    me = ob.data; n = len(me.vertices)
    for it in range(iters):
        ev = ob.evaluated_get(bpy.context.evaluated_depsgraph_get()); em = ev.to_mesh(); worst = 0.0
        for k in range(n):
            d = target[k] - em.vertices[k].co; me.vertices[k].co += d * 0.9; worst = max(worst, d.length)
        ev.to_mesh_clear(); me.update()
        if worst < 0.0015: break
    print(f'fit: {it + 1} rounds, worst miss {worst * 1000:.1f} mm')


def trim_ring(ob):
    """the paint faces touching glass become black: the daylight-opening trim round every window"""
    bm = bmesh.new(); bm.from_mesh(ob.data); n = 0
    for f in bm.faces:
        if f.material_index == 0 and any(g.material_index == 2 for e in f.edges for g in e.link_faces): f.material_index = 1; n += 1
    bm.to_mesh(ob.data); bm.free(); return n


def arches(ob):
    """a pocket at each wheel, cut from each side (a closed well, not a tunnel through the cabin); the cutter's faces are the liner"""
    for xa in (XA_F, XA_R):
        for s in (1, -1):
            bm = bmesh.new(); r = RW + 0.04; seg = 64
            ring = lambda y: [bm.verts.new((xa + r * math.cos(2 * math.pi * k / seg), y, RW + 0.012 + r * math.sin(2 * math.pi * k / seg))) for k in range(seg)]
            a, b = ring(s * 0.60), ring(s * 1.30)
            for k in range(seg): bm.faces.new((a[k], a[(k + 1) % seg], b[(k + 1) % seg], b[k]))
            bm.faces.new(a); bm.faces.new(list(reversed(b))); bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
            me = bpy.data.meshes.new('cut'); bm.to_mesh(me); bm.free(); me.materials.append(material('plastic_black'))
            cut = bpy.data.objects.new('cut', me); bpy.context.scene.collection.objects.link(cut)
            m = ob.modifiers.new('arch', 'BOOLEAN'); m.operation = 'DIFFERENCE'; m.solver = 'EXACT'; m.object = cut; m.material_mode = 'TRANSFER'
            bpy.context.view_layer.objects.active = ob; ob.select_set(True); bpy.ops.object.modifier_apply(modifier=m.name); bpy.data.objects.remove(cut)


def review(dirpath, tag):
    """four views in EEVEE with a studio light: front three-quarter, side, front, rear three-quarter"""
    os.makedirs(dirpath, exist_ok=True); sc = bpy.context.scene; sc.render.engine = 'BLENDER_EEVEE'; sc.render.resolution_x, sc.render.resolution_y = 960, 540
    sc.view_settings.view_transform = 'AgX'; w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs[0].default_value = (0.32, 0.34, 0.38, 1); w.node_tree.nodes['Background'].inputs[1].default_value = 0.8
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sun.data.energy = 3.5; sun.rotation_euler = (math.radians(50), math.radians(10), math.radians(35)); sc.collection.objects.link(sun)
    pl = bpy.data.meshes.new('floor'); bmf = bmesh.new(); bmesh.ops.create_grid(bmf, x_segments=1, y_segments=1, size=12); bmf.to_mesh(pl); bmf.free(); fl = bpy.data.objects.new('floor', pl); sc.collection.objects.link(fl)
    fm = bpy.data.materials.new('floor'); fm.use_nodes = True; fm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.25, 0.25, 0.27, 1); pl.materials.append(fm)
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam; cam.data.lens = 50
    for name, pos, look in (('q', (6.2, 4.6, 1.7), (0.1, 0, 0.62)), ('side', (0, 9.5, 0.8), (0, 0, 0.72)), ('front', (8.5, 0, 0.9), (0, 0, 0.7)), ('rear', (-6.0, 4.4, 1.9), (-0.1, 0, 0.7))):
        cam.location = pos; d = Vector(look) - Vector(pos); cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
        sc.render.filepath = os.path.join(dirpath, f'{tag}-{name}.png'); bpy.ops.render.render(write_still=True)


bpy.ops.wm.read_factory_settings(use_empty=True)
body = build_body(); print('body tris', sum(len(p.vertices) - 2 for p in body.data.polygons))
arches(body); print('trim faces', trim_ring(body))
body.data.shade_smooth()
def measure(ob):
    xs = [v.co.x for v in ob.data.vertices]; ys = [v.co.y for v in ob.data.vertices]; zs = [v.co.z for v in ob.data.vertices]
    def top_at(x, y=0.0, w=0.04): c = [v.co.z for v in ob.data.vertices if abs(v.co.x - x) < w and abs(v.co.y - y) < w]; return max(c) if c else None
    print(f'size: L {max(xs) - min(xs):.3f}  W {max(ys) - min(ys):.3f}  H {max(zs):.3f}  ground {min(zs):.3f}')
    print('centre-line tops:', ', '.join(f'x{x:+.2f}={top_at(x):.3f}' for x in (2.3, 1.8, 1.2, 0.9, 0.5, 0.0, -0.5, -1.0, -1.4, -1.8, -2.3) if top_at(x)))
measure(body)
if A.review: review(A.review, 'body')
