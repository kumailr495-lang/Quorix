"""LUMIERE v12 cars: the taxi (car_taxi) and the passing saloons (car_sedan), one cage-modelled body (the user: "the taxi feels like a
side kick and looks shit", "make the car model 10x better"). Replaces tools/blender/cars.py for both assets: its lofted superellipse
sections read as a toy (cars.py stays for the record and for cabin.py's old bonnet curves; it is no longer run for these two).

    blender --background --factory-startup --python tools/blender/taxi.py -- --out www/models [--only car_taxi] [--review DIR]
    then: sh tools/optimize-models.sh (skips these), blender ... --python tools/blender/glb_check.py -- www/models/car_*.glb

A modern mid-size four-door saloon, unbranded, built the way car modellers work: a quad control cage (stations along the length by rows
round the half section, mirrored), subdivided once with creases on the shoulder line, the sill and the bonnet's edges, and moved until the
smooth surface passes through the design points. Windows, pillars and the dark lower parts are regions of the cage, so their outlines are
smooth curves, and a ring of black trim follows every window. The wheel arches are pockets cut from each side (their walls are the
liners). Shut lines (doors, bonnet, boot) are real grooves: thin cutters laid along the surface by ray casts. Lamps, grille, plates,
mirrors and handles sit where ray casts put them, set a few millimetres into the surface. Wheels: a tyre with a rounded shoulder and
two tread grooves on an 18 inch ten-spoke rim, the brake disc and caliper behind the spokes, a hub and knuckle, a strut up into the arch.
Livery: the taxi in Mumbai's black and yellow (kaali-peeli: black body, yellow roof and pillars, a lit TAXI sign, yellow commercial
plates); the saloon in one paint (car_red, which the game swaps per car: traffic.js).
Frame: +X front, +Y left, +Z up, ground Z = 0. 4.86 m long, 1.84 m wide, 1.445 m tall, 2.82 m wheelbase, 235/45 R18 tyres (0.67 m).
LOD0 for close views, LOD1 (the body at one subdivision level, plain wheels, no grooves or lettering) for the far side of the road."""
import bpy, bmesh, math, sys, os, argparse, json
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lbl
from lbl import T, RZ, lathe, box_uv, material, PARTS

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ap = argparse.ArgumentParser(); ap.add_argument('--out', default='www/models'); ap.add_argument('--only', default=''); ap.add_argument('--review', default='')
A = ap.parse_args(argv)
for k, v in {'car_yellow': ((0.80, 0.50, 0.02), 0.22, 0.0), 'car_red': ((0.2, 0.012, 0.016), 0.22, 0.0), 'gloss_black': ((0.006, 0.006, 0.007), 0.12, 0.0),
             'tyre': ((0.012, 0.012, 0.012), 0.9, 0.0), 'car_silver': ((0.6, 0.62, 0.65), 0.28, 1.0), 'chrome': ((0.9, 0.9, 0.9), 0.08, 1.0),
             'plate_yellow': ((0.86, 0.62, 0.04), 0.45, 0.0), 'brake': ((0.18, 0.18, 0.19), 0.45, 1.0), 'caliper': ((0.30, 0.02, 0.02), 0.4, 0.0)}.items():
    lbl.MAT_DEF.setdefault(k, v)
lbl.GLOW_DEF.update({'glow_head': ((1.0, 0.95, 0.86), 3.0), 'glow_drl': ((0.88, 0.93, 1.0), 3.2), 'glow_tail': ((1.0, 0.04, 0.03), 2.6), 'glow_taxi': ((1.0, 0.8, 0.32), 2.6)})
FONT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fonts', 'Inter-ExtraBold.ttf')   # OFL (docs/LICENSES.md)

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
    (0.92, [(0, .17), (.62, .17), (.835, .19), (.893, .29), (.917, .44), (.924, .615), (.914, .80), (.877, .925), (.838, .972, .905), (.81, .978, .895), (.785, .982, .89), (.755, .985, .89), (.70, .984, .895), (0, .97, .925)]),   # v12: offsets evened out (the windscreen's corners folded under)
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
for _i in range(3, NS - 3):   # stations along the doors and arches: a crisper shoulder, a touch of tumblehome under it
    _r = ST[_i][1]; _t = lambda j, dy: (_r[j][0] + dy,) + tuple(_r[j][1:])
    _r[6] = _t(6, 0.012); _r[5] = _t(5, -0.006); _r[3] = _t(3, 0.006)
I_COWL, I_ROOF0, I_B0, I_B1, I_C0, I_C1, I_DECK = 7, 9, 10, 11, 13, 14, 15   # station indices: cowl, roof front, B-pillar, C-pillar, deck
PAINT, TRIM, GLASS, ROOF, TAIL = 0, 1, 2, 3, 4   # the body's material slots


def cage_point(i, j, side):
    x, rows = ST[i]; p = rows[j]; px = p[2] if len(p) > 2 else x
    return Vector((px, side * p[0], p[1]))


def region(i, j):
    """the material slot of the cage face between stations i, i+1 and rows j, j+1"""
    if j in (0, 1): return TRIM                                                     # underbody and the rocker's underside
    if 8 <= j <= 9 and I_COWL <= i <= I_C0: return TRIM if i == I_B0 else GLASS     # side glass (the B-pillar between the doors is black)
    if 11 <= j <= 12 and I_COWL <= i < I_ROOF0: return GLASS                        # windscreen
    if 11 <= j <= 12 and I_C0 <= i < I_DECK: return GLASS                           # backlight
    if j >= 8 and I_COWL <= i < I_DECK: return ROOF                                 # pillars and roof above the beltline (the taxi's yellow)
    return PAINT


def build_body(level, paint, roof, name):
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
    # nose and tail: each end ring closed by a column down the centre line, bulged forward (back): the bumper is rounder in plan than
    # the old 1-2 cm bulge, so the front no longer reads as a slab
    for i, out in ((0, 1), (NS - 1, -1)):
        col = [V[(i, 0, 1)]]
        for j in range(1, NR - 1):
            l = cage_point(i, j, 1); c = Vector((l.x + out * (0.03 + 0.035 * math.sin(math.pi * j / (NR - 1))), 0, l.z)); col.append(bm.verts.new(c))
        col.append(V[(i, NR - 1, 1)])
        for j in range(NR - 1):
            for s in (1, -1):
                q = [V[(i, j, s)], V[(i, j + 1, s)], col[j + 1], col[j]]; q = [v for k, v in enumerate(q) if v not in q[:k]]
                if (s > 0) == (out > 0): q.reverse()
                f = bm.faces.new(q); f.material_index = TRIM if j < 2 else PAINT
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    cr = bm.edges.layers.float.get('crease_edge') or bm.edges.layers.float.new('crease_edge')
    def crease(j, i0, i1, k):
        for i in range(i0, i1):
            for s in (1, -1):
                e = bm.edges.get((V[(i, j, s)], V[(i + 1, j, s)]))
                if e: e[cr] = k
    crease(6, 0, NS - 1, 0.75); crease(3, 0, NS - 1, 0.55); crease(8, 1, I_COWL - 1, 0.5); crease(8, I_DECK, NS - 2, 0.5); crease(7, 1, NS - 2, 0.25)
    for i in (0, NS - 1):
        for j in range(NR - 1):
            for s in (1, -1):
                e = bm.edges.get((V[(i, j, s)], V[(i, j + 1, s)]))
                if e: e[cr] = 0.45
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(ob)
    for m in (paint, 'plastic_black', 'glass', roof, 'glow_tail'): me.materials.append(material(m))
    sd = ob.modifiers.new('subd', 'SUBSURF'); sd.levels = sd.render_levels = level; sd.use_creases = True; sd.boundary_smooth = 'ALL'; sd.use_limit_surface = True
    fit(ob, [v.co.copy() for v in me.vertices])
    apply(ob, sd)
    # the windscreen's lower corners: where the bonnet, the A-pillar's foot and the side glass meet, the fitted surface tucked under itself
    # (glb_check folds); a few rounds of local smoothing there take the fold out without moving anything a player can see
    bm = bmesh.new(); bm.from_mesh(ob.data)
    vs = [v for v in bm.verts if 0.82 < v.co.x < 1.0 and 0.62 < abs(v.co.y) < 0.86 and 0.93 < v.co.z < 1.02]
    for _ in range(4): bmesh.ops.smooth_vert(bm, verts=vs, factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    bm.to_mesh(ob.data); bm.free()
    return ob


def apply(ob, mod):
    for o in bpy.context.scene.objects: o.select_set(False)
    bpy.context.view_layer.objects.active = ob; ob.select_set(True); bpy.ops.object.modifier_apply(modifier=mod.name); ob.select_set(False)


def fit(ob, target, iters=12):
    """move the cage until the subdivided surface passes through the design points"""
    me = ob.data; n = len(me.vertices); worst = 0.0
    for it in range(iters):
        ev = ob.evaluated_get(bpy.context.evaluated_depsgraph_get()); em = ev.to_mesh(); worst = 0.0
        for k in range(n):
            d = target[k] - em.vertices[k].co; me.vertices[k].co += d * 0.9; worst = max(worst, d.length)
        ev.to_mesh_clear(); me.update()
        if worst < 0.0015: break
    print(f'fit: {it + 1} rounds, worst miss {worst * 1000:.1f} mm')


def boolean(ob, cutter_bm, mat):
    """cut ob with a closed cutter mesh (its faces become the cut's walls, in material mat)"""
    me = bpy.data.meshes.new('cut'); cutter_bm.to_mesh(me); cutter_bm.free(); me.materials.append(material(mat))
    cut = bpy.data.objects.new('cut', me); bpy.context.scene.collection.objects.link(cut)
    m = ob.modifiers.new('cut', 'BOOLEAN'); m.operation = 'DIFFERENCE'; m.solver = 'EXACT'; m.object = cut; m.material_mode = 'TRANSFER'
    m.use_self = True; m.use_hole_tolerant = True   # the shut lines' cutters cross each other (a door's edge meets the sill line)
    n0 = len(ob.data.polygons); apply(ob, m); bpy.data.objects.remove(cut); bpy.data.meshes.remove(me)
    bm = bmesh.new(); bm.from_mesh(ob.data); bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=2e-5); bmesh.ops.dissolve_degenerate(bm, dist=6e-4, edges=bm.edges)   # the exact solver leaves slivers where cutters meet the surface
    bm.to_mesh(ob.data); bm.free(); print(f'boolean: {n0} -> {len(ob.data.polygons)} faces')
    if len(ob.data.polygons) < n0 * 0.5: raise RuntimeError('a boolean emptied the body')


def arches(ob):
    """a pocket at each wheel, cut from each side (a closed well, not a tunnel through the cabin); the cutter's faces are the liner"""
    bm = bmesh.new(); seg = 64
    for xa in (XA_F, XA_R):
        for s in (1, -1):
            r = RW + 0.04
            ring = lambda y: [bm.verts.new((xa + r * math.cos(2 * math.pi * (k + 0.5) / seg), y, RW + 0.012 + r * math.sin(2 * math.pi * (k + 0.5) / seg))) for k in range(seg)]   # half a step round: a vertex on the arch's tangent left a fold
            a, b = ring(s * 0.60), ring(s * 1.30)
            for k in range(seg): bm.faces.new((a[k], a[(k + 1) % seg], b[(k + 1) % seg], b[k]))
            bm.faces.new(a); bm.faces.new(list(reversed(b)))
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces)); boolean(ob, bm, 'plastic_black')


def trim_ring(ob):
    """the paint faces touching glass become black: the daylight-opening trim round every window"""
    bm = bmesh.new(); bm.from_mesh(ob.data); n = 0
    for f in bm.faces:
        if f.material_index in (PAINT, ROOF) and any(g.material_index == GLASS for e in f.edges for g in e.link_faces): f.material_index = TRIM; n += 1
    bm.to_mesh(ob.data); bm.free(); return n


def regions(ob):
    """lamps, grille and the dark lower parts, as regions of the smooth surface (their outlines follow its faces)"""
    bm = bmesh.new(); bm.from_mesh(ob.data); n = {}
    for f in bm.faces:
        if f.material_index == GLASS: continue
        c = f.calc_center_median(); x, y, z = c.x, abs(c.y), c.z; k = None
        if x > 2.15 and 0.42 < y < 0.80 and 0.60 < z < 0.745: k = GLASS               # headlamp lenses: dark glass (their lit parts below)
        elif x < -2.24 and 0.40 < y < 0.79 and 0.80 < z < 0.935: k = TAIL               # tail lamps
        elif x > 2.30 and y < 0.40 and 0.40 < z < 0.60: k = TRIM                        # grille
        elif x > 2.26 and y < 0.62 and 0.25 < z < 0.34: k = TRIM                        # lower intake
        elif x < -2.28 and z < 0.36: k = TRIM                                           # rear diffuser
        if k is not None: f.material_index = k; n[k] = n.get(k, 0) + 1
    bm.to_mesh(ob.data); bm.free(); return n


# ---------------------------------------------------------------- surface helpers (ray casts onto the finished body)
class Surf:
    def __init__(s, ob):
        s.bm = bmesh.new(); s.bm.from_mesh(ob.data); s.bm.faces.ensure_lookup_table(); s.bvh = BVHTree.FromBMesh(s.bm)
    def hit(s, o, d):
        loc, nrm, idx, dist = s.bvh.ray_cast(Vector(o), Vector(d).normalized())
        return (loc, nrm.normalized()) if loc is not None else (None, None)
    def free(s): s.bm.free()


def strip(bm, hits, w, out, depth, toward):
    """a thin closed slab along surface points [(loc, normal)]: w wide across the line, from depth inside the surface to out outside,
    both measured along one direction for the whole groove (toward: the cast's direction into the body). Per-point normals twisted the
    slab where it crossed a crease, and the boolean left slivers folded back there"""
    rings = []; n = -Vector(toward).normalized()
    for k, (p, _n) in enumerate(hits):
        a = hits[max(0, k - 1)][0]; b = hits[min(len(hits) - 1, k + 1)][0]; d = (b - a).normalized(); t = d.cross(n).normalized()
        rings.append([bm.verts.new(p + t * w / 2 + n * out), bm.verts.new(p - t * w / 2 + n * out), bm.verts.new(p - t * w / 2 - n * depth), bm.verts.new(p + t * w / 2 - n * depth)])
    for k in range(len(rings) - 1):
        for e in range(4): bm.faces.new((rings[k][e], rings[k][(e + 1) % 4], rings[k + 1][(e + 1) % 4], rings[k + 1][e]))
    bm.faces.new(rings[0][::-1]); bm.faces.new(rings[-1])


def tube(bm, hits, r, lift, sides=8):
    """a capped tube along surface points, its centre lift outside the surface (r > lift: it is set into the surface)"""
    rings = []
    for k, (p, n) in enumerate(hits):
        a = hits[max(0, k - 1)][0]; b = hits[min(len(hits) - 1, k + 1)][0]; d = (b - a).normalized(); u = n; v = d.cross(n).normalized(); c = p + n * lift
        rings.append([bm.verts.new(c + (u * math.cos(2 * math.pi * q / sides) + v * math.sin(2 * math.pi * q / sides)) * r) for q in range(sides)])
    for k in range(len(rings) - 1):
        for q in range(sides): bm.faces.new((rings[k][q], rings[k][(q + 1) % sides], rings[k + 1][(q + 1) % sides], rings[k + 1][q]))
    bm.faces.new(rings[0][::-1]); bm.faces.new(rings[-1])


def line_hits(S, pts, d, keep=lambda p, n: True):
    out = []
    for p in pts:
        loc, n = S.hit(p, d)
        if loc is not None and keep(loc, n): out.append((loc, n))
    return out


def shut_lines(ob):
    """door, bonnet and boot shut lines, 4 mm wide: two exact plane cuts through the finished surface and the faces between them painted
    dark (trim). The surface itself is untouched, so nothing can fold or fight. Booleans (grooves) and 4 mm bands in the cage were tried
    first: the exact solver left slivers, and the thin cage bands folded the subdivided surface (glb_check)"""
    bm = bmesh.new(); bm.from_mesh(ob.data); W = 0.002
    LINES = [   # (plane normal axis, position, which faces of the band are a shut line)
        ('x', 1.02, lambda c: 0.30 < c.z < 0.93 and abs(c.y) > 0.78),        # front door, front edge
        ('x', -0.11, lambda c: 0.30 < c.z < 0.95 and abs(c.y) > 0.78),       # between the doors
        ('x', -0.975, lambda c: 0.45 < c.z < 0.95 and abs(c.y) > 0.78),      # rear door, rear edge (over the arch)
        ('z', 0.335, lambda c: -0.975 < c.x < 1.02 and abs(c.y) > 0.80),     # the doors' bottom edge
        ('x', 0.985, lambda c: c.z > 0.85 and abs(c.y) < 0.64),              # the bonnet's back edge
        ('y', 0.64, lambda c: 0.985 < c.x < 2.27 and c.z > 0.70),            # the bonnet's sides
        ('y', -0.64, lambda c: 0.985 < c.x < 2.27 and c.z > 0.70),
        ('x', -1.67, lambda c: c.z > 0.90 and abs(c.y) < 0.60),              # the boot lid's front edge
        ('y', 0.60, lambda c: c.x < -1.67 and c.z > 0.80),                   # its sides
        ('y', -0.60, lambda c: c.x < -1.67 and c.z > 0.80),
        ('z', 0.80, lambda c: c.x < -2.2 and abs(c.y) < 0.60),               # its bottom edge on the back
    ]
    ax = {'x': 0, 'y': 1, 'z': 2}; n = 0
    for a, v, keep in LINES:
        no = [0.0, 0.0, 0.0]; no[ax[a]] = 1.0
        for off in (-W, W):
            co = [0.0, 0.0, 0.0]; co[ax[a]] = v + off
            bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=co, plane_no=no)
        for f in bm.faces:
            if f.material_index not in (PAINT, ROOF): continue
            c = f.calc_center_median()
            if abs(c[ax[a]] - v) < W and keep(c): f.material_index = TRIM; n += 1
    bm.to_mesh(ob.data); bm.free(); return n


# ---------------------------------------------------------------- parts on the surface
def obj(name, lod, mat, build, smooth=True, sharp=40):
    bm = bmesh.new(); build(bm); bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces)); box_uv(bm)
    me = bpy.data.meshes.new(f'{name}_LOD{lod}'); bm.to_mesh(me); bm.free()
    if smooth: me.shade_smooth(); me.set_sharp_from_angle(angle=math.radians(sharp))
    else: me.shade_flat()
    me.materials.append(material(mat)); ob = bpy.data.objects.new(f'{name}_LOD{lod}', me); bpy.context.scene.collection.objects.link(ob); PARTS.append(ob); return ob


def frame_at(p, n, up=(0, 0, 1)):
    """a matrix at p whose +Z is n (out of the surface) and +Y as close to up as it can be"""
    z = Vector(n).normalized(); u = Vector(up); x = u.cross(z)
    if x.length < 1e-4: x = Vector((1, 0, 0)).cross(z)
    x.normalize(); y = z.cross(x)
    M = Matrix.Identity(4)
    for r in range(3): M[r][0], M[r][1], M[r][2], M[r][3] = x[r], y[r], z[r], p[r]
    return M


def rbox(size, r, M):
    def b(bm):
        lbl.rounded_box(bm, size, r, (1, 1, 1), 2); bm.transform(M)
    return b


def text_bm(bm, text, height, depth, M, spacing=1.05):
    """3D lettering (Inter ExtraBold, OFL) centred on M's origin, faces along M's +Z, cap height `height`, `depth` deep from z 0 to -depth"""
    cu = bpy.data.curves.new('txt', 'FONT'); cu.body = text; cu.font = bpy.data.fonts.load(FONT, check_existing=True); cu.size = 1.0; cu.extrude = 0.5; cu.align_x = 'CENTER'; cu.align_y = 'CENTER'; cu.space_character = spacing; cu.resolution_u = 3
    o = bpy.data.objects.new('txt', cu); bpy.context.scene.collection.objects.link(o); dg = bpy.context.evaluated_depsgraph_get(); me = bpy.data.meshes.new_from_object(o.evaluated_get(dg)); bpy.data.objects.remove(o)
    zs = [v.co.z for v in me.vertices]; ys = [v.co.y for v in me.vertices]; k = height / max(1e-6, max(ys) - min(ys)); cz = (max(zs) + min(zs)) / 2; cy = (max(ys) + min(ys)) / 2
    tb = bmesh.new(); tb.from_mesh(me); bpy.data.meshes.remove(me)
    for v in tb.verts: v.co = Vector((v.co.x * k, (v.co.y - cy) * k, (v.co.z - cz) / (max(zs) - min(zs)) * depth - depth / 2))
    bmesh.ops.remove_doubles(tb, verts=tb.verts, dist=1e-5); tb.transform(M)
    tm = bpy.data.meshes.new('t'); tb.to_mesh(tm); tb.free(); bm.from_mesh(tm); bpy.data.meshes.remove(tm)


def plate(S, lod, at, front, text, mat):
    """a number plate on the bumper or boot: flat, its back 3 mm under the surface at its deepest corner, its face 4 mm proud of the
    surface's most forward point; black letters 5 mm proud of it and 3 mm into it (the house rule: parallel faces 5 mm apart or more)"""
    cx, cz = at; d = -1 if front else 1; ox = 3.0 if front else -3.0; W, H = 0.52, 0.115
    hits = [S.hit((ox, y, z), (d, 0, 0))[0] for y in (-W / 2, 0, W / 2) for z in (cz - H / 2, cz, cz + H / 2)]
    hits = [h for h in hits if h is not None]
    if not hits: return
    xs = [h.x for h in hits]; xf = (max(xs) + 0.004) if front else (min(xs) - 0.004); xb = (min(xs) - 0.003) if front else (max(xs) + 0.003)
    x0, x1 = min(xf, xb), max(xf, xb)
    obj('Plate', lod, mat, rbox((x1 - x0, W, H), 0.006, T((x0 + x1) / 2, cx, cz)), smooth=False)
    if lod == 0 and text:
        M = T(xf - d * 0.005, cx, cz) @ Matrix.Rotation(math.radians(90 if front else -90), 4, 'Y') @ Matrix.Rotation(math.radians(90 if front else -90), 4, 'Z')   # 5 mm proud, 3 mm in
        o = obj('PlateText', lod, 'paint_black', lambda bm: text_bm(bm, text, 0.05, 0.008, M, 1.0), smooth=False)
        selfunion(o)


def selfunion(o):
    for q in list(bpy.context.selected_objects): q.select_set(False)
    bpy.context.view_layer.objects.active = o; o.select_set(True); bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.intersect_boolean(operation='UNION', use_self=True, solver='EXACT'); bpy.ops.object.mode_set(mode='OBJECT'); o.select_set(False)
    bm = bmesh.new(); bm.from_mesh(o.data); bmesh.ops.holes_fill(bm, edges=[e for e in bm.edges if e.is_boundary], sides=0)   # the font's union leaves a few open edges
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces)); box_uv(bm); bm.to_mesh(o.data); bm.free()


def details(body, lod, taxi):
    S = Surf(body); steps = lambda a, b, n: [a + (b - a) * i / n for i in range(n + 1)]
    for s in (1, -1):
        # headlamps: two projectors per side (set 4 mm into the lens, 8 mm out of it) and a running light along the lamp's top edge
        if lod == 0:
            for (y, z) in ((0.63, 0.675), (0.50, 0.668)):
                p, n = S.hit((3.0, s * y, z), (-1, 0, 0))
                if p is not None: obj('Projector', lod, 'glow_head', lambda bm, p=p, n=n: lathe(bm, [(1e-4, -0.004), (0.031, -0.004), (0.031, 0.008), (1e-4, 0.008)], 20) or bm.transform(frame_at(p, n)), smooth=False)
        h = line_hits(S, [(3.0, s * y, 0.728) for y in steps(0.44, 0.76, 10)], (-1, 0, 0), lambda p, n: n.x > 0.2)
        if len(h) > 2: obj('DRL', lod, 'glow_drl', lambda bm, h=h: tube(bm, h, 0.0065, 0.002, 8 if lod == 0 else 5))
        # mirror: a black cap on a stalk from the door, its glass facing back
        p, n = S.hit((0.80, s * 1.6, 0.985), (0, -s, 0))
        if p is not None:
            hx, hy, hz = 0.80, s * (abs(p.y) + 0.13), 1.02
            obj('MirrorStalk', lod, 'gloss_black', rbox((0.06, abs(hy - p.y) + 0.03, 0.035), 0.008, T(hx, (hy + p.y) / 2, 0.995)))
            obj('Mirror', lod, 'gloss_black', rbox((0.11, 0.21, 0.12), 0.03, T(hx, hy + s * 0.06, hz)))
            if lod == 0: obj('MirrorGlass', lod, 'chrome', rbox((0.012, 0.18, 0.095), 0.02, T(hx - 0.056, hy + s * 0.06, hz)))
        # door handles: flush chrome bars set 3 mm into the doors
        if lod == 0:
            for hx in (0.36, -0.62):
                p, n = S.hit((hx, s * 1.6, 0.872), (0, -s, 0))
                if p is not None: obj('Handle', lod, 'chrome', rbox((0.17, 0.026, 0.012), 0.005, frame_at(p + n * 0.003, n, (1, 0, 0)) @ Matrix.Rotation(math.radians(90), 4, 'Z')))
    # grille slats: three chrome bars across the grille, set into it
    if lod == 0:
        for z in (0.455, 0.505, 0.555):
            h = line_hits(S, [(3.0, y, z) for y in steps(-0.37, 0.37, 18)], (-1, 0, 0), lambda p, n: n.x > 0.4)
            if len(h) > 2: obj('Slat', lod, 'chrome', lambda bm, h=h: tube(bm, h, 0.007, 0.003, 8))
    # the tail light bar across the boot lid
    h = line_hits(S, [(-3.0, y, 0.875) for y in steps(-0.42, 0.42, 20)], (1, 0, 0), lambda p, n: n.x < -0.3)
    if len(h) > 2: obj('TailBar', lod, 'glow_tail', lambda bm, h=h: tube(bm, h, 0.008, 0.003, 8 if lod == 0 else 5))
    # number plates: yellow with the taxi's number (commercial plates in India), white on the saloon
    plate(S, lod, (0.0, 0.355), True, 'MH 01 AT 2026' if taxi else 'MH 02 CB 7781', 'plate_yellow' if taxi else 'paint_cream')
    plate(S, lod, (0.0, 0.615), False, 'MH 01 AT 2026' if taxi else 'MH 02 CB 7781', 'plate_yellow' if taxi else 'paint_cream')
    if taxi:
        # the roof sign: a black base on the roof's crown, the lit box, TAXI on both its long faces
        p, n = S.hit((-0.30, 0.0, 3.0), (0, 0, -1)); pe, _ = S.hit((-0.30, 0.27, 3.0), (0, 0, -1))
        if p is not None and pe is not None:
            zb = pe.z - 0.003; zt = p.z + 0.03
            obj('SignBase', lod, 'plastic_black', rbox((0.20, 0.54, zt - zb), 0.01, T(-0.30, 0, (zb + zt) / 2)))
            obj('Sign', lod, 'glow_taxi', rbox((0.15, 0.50, 0.11), 0.03, T(-0.30, 0, zt + 0.05)))
            if lod == 0:
                for d in (1, -1):
                    M = T(-0.30 + d * (0.075 + 0.005), 0, zt + 0.05) @ Matrix.Rotation(math.radians(90 * d), 4, 'Y') @ Matrix.Rotation(math.radians(90 * d), 4, 'Z')
                    o = obj('SignText', lod, 'plastic_black', lambda bm, M=M: text_bm(bm, 'TAXI', 0.062, 0.008, M, 1.12), smooth=False); selfunion(o)
    S.free()


def wheel(lod, wx, s):
    seg = 26 if lod == 0 else 12; M = T(wx, s * TRACK, RW) @ Matrix.Rotation(math.radians(-90 * s), 4, 'X')   # lathe +Z -> outward
    tread = [(0.335, -0.084), (0.335, 0.084)]
    if lod == 0:   # four circumferential grooves
        tread = [(0.335, -0.084)]
        for zc in (-0.036, 0.036): tread += [(0.335, zc - 0.007), (0.328, zc - 0.004), (0.328, zc + 0.004), (0.335, zc + 0.007)]
        tread += [(0.335, 0.084)]
    prof = [(0.233, -0.108), (0.262, -0.117), (0.300, -0.118), (0.323, -0.108), (0.3335, -0.094)] + tread + [(0.3335, 0.094), (0.323, 0.108), (0.300, 0.118), (0.262, 0.117), (0.233, 0.108)]
    obj('Tyre', lod, 'tyre', lambda bm: (lathe(bm, prof, seg), bm.transform(M)))
    obj('Barrel', lod, 'brake', lambda bm: (lathe(bm, [(0.215, -0.105), (0.235, -0.105), (0.235, 0.080), (0.215, 0.080)], seg), bm.transform(M)))
    obj('Lip', lod, 'car_silver', lambda bm: (lathe(bm, [(0.205, 0.078), (0.236, 0.078), (0.240, 0.090), (0.232, 0.100), (0.205, 0.096)], seg), bm.transform(M)))
    if lod == 0:
        def spokes(bm):
            for k in range(10):
                a = 2 * math.pi * (k // 2) / 5 + (0.16 if k % 2 else -0.16)
                ca, sa = math.cos(a), math.sin(a); t = Vector((-sa, ca, 0)); rr = Vector((ca, sa, 0))
                v = []
                for (r, w, zo, zi) in ((0.056, 0.015, 0.099, 0.085), (0.212, 0.010, 0.089, 0.075)):
                    for (dw, z) in ((-w, zo), (w, zo), (w, zi), (-w, zi)): v.append(bm.verts.new(rr * r + t * dw + Vector((0, 0, z))))
                for f in ((0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)): bm.faces.new([v[i] for i in f])
            bm.transform(M)
        obj('Spoke', lod, 'car_silver', spokes, sharp=30)
        obj('Disc', lod, 'brake', lambda bm: (lathe(bm, [(0.045, 0.015), (0.172, 0.015), (0.172, 0.040), (0.045, 0.040)], 24), bm.transform(M)))
        ang = 245 if s > 0 else 115   # the caliper at the top of the disc, behind the axle (the lathe frame's +Y points down on the left, up on the right)
        obj('Caliper', lod, 'caliper', rbox((0.085, 0.045, 0.045), 0.01, M @ RZ(ang) @ T(0.152, 0, 0.052) @ RZ(90)))
    else:
        obj('Spoke', lod, 'car_silver', lambda bm: (lathe(bm, [(1e-4, 0.086), (0.21, 0.086), (0.21, 0.094), (1e-4, 0.094)], seg), bm.transform(M)))   # v12c its inner face 8 mm off the lip's (2 mm fought on the parked cars)
    obj('Cap', lod, 'paint_black', lambda bm: (lathe(bm, [(1e-4, 0.090), (0.062, 0.090), (0.058, 0.104), (1e-4, 0.108)], 16), bm.transform(M)))
    obj('Hub', lod, 'brake', lambda bm: (lathe(bm, [(1e-4, 0.030), (0.06, 0.030), (0.06, 0.095), (1e-4, 0.095)], 16 if lod == 0 else 8), bm.transform(M)))
    obj('Knuckle', lod, 'plastic_black', lambda bm: (lathe(bm, [(1e-4, -0.25), (0.05, -0.25), (0.05, 0.034), (1e-4, 0.034)], 16 if lod == 0 else 8), bm.transform(M)))
    # the strut: from inside the knuckle up through the arch liner's inner wall and ceiling, into the body
    obj('Strut', lod, 'plastic_black', lambda bm: (lathe(bm, [(1e-4, 0.30), (0.025, 0.30), (0.025, 0.78), (1e-4, 0.78)], 12 if lod == 0 else 6), bm.transform(T(wx, s * 0.62, 0))))


def build_car(name, lod, taxi):
    paint, roof = ('gloss_black', 'car_yellow') if taxi else ('car_red', 'car_red')
    body = build_body(1, paint, roof, f'Body_LOD{lod}')   # one level: at game distances as smooth as two (review renders), a quarter of the triangles
    arches(body)
    if lod == 0: print('shut-line faces', shut_lines(body))
    else:   # the far tier (passing traffic 10-60 m away): half the body's triangles, mirrored so both sides match
        dm = body.modifiers.new('dec', 'DECIMATE'); dm.ratio = 0.5; dm.use_symmetry = True; dm.symmetry_axis = 'Y'; apply(body, dm)
    print(name, lod, 'regions', regions(body), 'trim', trim_ring(body))
    bm = bmesh.new(); bm.from_mesh(body.data); box_uv(bm); bm.to_mesh(body.data); bm.free()
    body.data.shade_smooth(); body.data.set_sharp_from_angle(angle=math.radians(50)); PARTS.append(body)
    details(body, lod, taxi)
    for wx in (XA_F, XA_R):
        for s in (1, -1): wheel(lod, wx, s)


def review(dirpath, tag):
    """four views in EEVEE with a studio light: front three-quarter, side, front, rear three-quarter (LOD0 only)"""
    os.makedirs(dirpath, exist_ok=True); sc = bpy.context.scene; sc.render.engine = 'BLENDER_EEVEE'; sc.render.resolution_x, sc.render.resolution_y = 960, 540
    sc.view_settings.view_transform = 'AgX'; w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs[0].default_value = (0.32, 0.34, 0.38, 1); w.node_tree.nodes['Background'].inputs[1].default_value = 0.8
    for o in bpy.context.scene.objects:
        if o.name.endswith('LOD1'): o.hide_render = True
    views = (('q', (6.2, 4.6, 1.7), (0.1, 0, 0.62)), ('side', (0, 9.5, 0.8), (0, 0, 0.72)), ('front', (8.5, 0, 0.9), (0, 0, 0.7)), ('rear', (-6.0, 4.4, 1.9), (-0.1, 0, 0.7)), ('wheel', (2.6, 2.6, 0.55), (1.48, 0.9, 0.36)))
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sun.data.energy = 3.5; sun.rotation_euler = (math.radians(50), math.radians(10), math.radians(35)); sc.collection.objects.link(sun)
    pl = bpy.data.meshes.new('floor'); bmf = bmesh.new(); bmesh.ops.create_grid(bmf, x_segments=1, y_segments=1, size=12); bmf.to_mesh(pl); bmf.free(); fl = bpy.data.objects.new('floor', pl); sc.collection.objects.link(fl)
    fm = bpy.data.materials.new('floor'); fm.use_nodes = True; fm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.25, 0.25, 0.27, 1); pl.materials.append(fm)
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam; cam.data.lens = 50
    for lod in (0, 1):
        for o in bpy.context.scene.objects:
            if o.name.endswith('LOD0') or o.name.endswith('LOD1'): o.hide_render = not o.name.endswith(f'LOD{lod}')
        for nm, pos, look in (views if lod == 0 else views[:2]):
            cam.location = pos; d = Vector(look) - Vector(pos); cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
            sc.render.filepath = os.path.join(dirpath, f'{tag}-{nm}{"" if lod == 0 else "-lod1"}.png'); bpy.ops.render.render(write_still=True)


def reset():
    for o in list(bpy.data.objects): bpy.data.objects.remove(o)
    for m in list(bpy.data.meshes): bpy.data.meshes.remove(m)


bpy.ops.wm.read_factory_settings(use_empty=True)
os.makedirs(A.out, exist_ok=True); report = []
for name, taxi in (('car_sedan', False), ('car_taxi', True)):
    if A.only and name not in A.only.split(','): continue
    reset(); allp = []
    for lod in (0, 1): PARTS.clear(); build_car(name, lod, taxi); allp += PARTS
    PARTS[:] = allp; report.append(lbl.export(name, A.out))
    if A.review: review(A.review, name)
print(json.dumps(report, indent=1))
