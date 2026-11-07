"""LUMIERE v8 - the people (phone feedback on v7: "the NPCs look the worst... even Minecraft's Steve looks better").
Builds www/models/people.glb and www/models/anims.glb from Quaternius' CC0 packs (Universal Base Characters + Universal Animation Library 1/2,
downloaded from quaternius.itch.io; licences in tools/blender/PEOPLE.md):
  * two base bodies (male, female) on the 65-bone humanoid rig, plus bones the packs lack: a jaw (talking), two eyes (looking around);
    a dark mouth interior so an open jaw shows a mouth, not the inside of the head;
  * modern clothes made from the body's own surface: the faces of a region (torso, sleeves, legs, feet) are copied, smoothed until the
    muscles are gone (fabric hangs over the body, it does not trace the abs), pushed out to a cloth thickness, given a turned-back hem,
    and keep the body's skin weights exactly, so they move with it. Body faces fully under a garment are removed (no poke-through,
    fewer triangles). Every vertex carries a part id (_PART: skin, top, bottom, shoes, hair, eyes, brows, mouth, outer layer, trim),
    which the engine colours per person (people.js);
  * the free hairstyles, fitted to each head; every variant carries its body's styles and the engine shows one (or none) per person;
  * outfits per body, three detail levels each (LOD0 full, LOD1 ~3.5k, LOD2 ~1.3k triangles);
  * anims.glb: the library clips the cinema needs (walk, idle, talk, phone, sit down / sit / talk seated / stand up, eat & drink, carry,
    pick up, give, yes/no, rail lean, drive), on the library's own armature; the engine plays them on both bodies by bone name.
usage: blender --background --factory-startup --python tools/blender/people.py -- --ubc DIR --ual1 GLB --ual2 GLB --out www/models [--preview DIR]"""
import bpy, bmesh, sys, os, math, argparse
from mathutils import Vector, Matrix
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ap = argparse.ArgumentParser(); ap.add_argument('--ubc'); ap.add_argument('--ual1'); ap.add_argument('--ual2'); ap.add_argument('--out'); ap.add_argument('--preview', default=None); ap.add_argument('--only', default=None)
A = ap.parse_args(argv)
PART = {'skin': 0, 'top': 1, 'bottom': 2, 'shoes': 3, 'hair': 4, 'eyes': 5, 'brows': 6, 'mouth': 7, 'outer': 8, 'trim': 9, 'beard': 10, 'hair2': 11, 'hair3': 12}
CLIPS = ['Idle_Loop', 'Idle_Talking_Loop', 'Idle_TalkingPhone_Loop', 'Idle_FoldArms_Loop', 'Idle_No_Loop', 'Yes', 'Idle_Rail_Loop', 'Walk_Loop', 'Walk_Formal_Loop',
         'Walk_Carry_Loop', 'Jog_Fwd_Loop', 'Sitting_Enter', 'Sitting_Idle_Loop', 'Sitting_Talking_Loop', 'Sitting_Exit', 'Interact', 'PickUp_Table', 'Consume', 'Driving_Loop']
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
def imp(path):
    before = set(bpy.data.objects); bpy.ops.import_scene.gltf(filepath=path); new = [o for o in bpy.data.objects if o not in before]
    for o in list(new):
        if o.name.startswith('Icosphere'): bpy.data.objects.remove(o); new.remove(o)
    return new
def smoothstep(a, b, x):
    t = max(0.0, min(1.0, (x - a) / (b - a))); return t * t * (3 - 2 * t)
# ------------------------------------------------------------------ rig helpers
def joints(arm):
    mw = arm.matrix_world; J = {}
    for b in arm.data.bones: J[b.name] = (mw @ b.head_local, mw @ b.tail_local)
    return J
def add_bone(arm, name, parent, head, tail):
    bpy.context.view_layer.objects.active = arm; bpy.ops.object.mode_set(mode='EDIT'); eb = arm.data.edit_bones.new(name)
    eb.head = head; eb.tail = tail; eb.parent = arm.data.edit_bones[parent]; eb.use_connect = False; bpy.ops.object.mode_set(mode='OBJECT')
def weight_group(ob, name): return ob.vertex_groups.get(name) or ob.vertex_groups.new(name=name)
def move_weight(ob, src, dst, fn):
    """moves fn(v)*w(src) of each vertex's src weight to dst (fn in 0..1, world-space position)"""
    gs, gd = ob.vertex_groups[src], weight_group(ob, dst); mw = ob.matrix_world
    for v in ob.data.vertices:
        w = next((g.weight for g in v.groups if g.group == gs.index), 0.0)
        if w <= 0: continue
        k = fn(mw @ v.co)
        if k <= 0: continue
        gs.add([v.index], w * (1 - k), 'REPLACE'); gd.add([v.index], w * k, 'ADD')
# ------------------------------------------------------------------ attributes
def set_part(ob, part):
    me = ob.data; at = me.attributes.get('_PART') or me.attributes.new('_PART', 'FLOAT', 'POINT')
    for i in range(len(me.vertices)): at.data[i].value = float(part)
def part_attr(ob): return ob.data.attributes['_PART']
# ------------------------------------------------------------------ garments
def make_garment(body, name, planes, thick, smooth_it, part, hem=True, extra_out=None, drop=None, proxy_it=4, border_it=4, ring=None, paint=None):
    """the body's surface between cut planes becomes a garment: planes = [(point, normal)], each removes what lies on its normal's side, so
       hems, cuffs and necklines are straight clean loops. Then: smooth away anatomy (fabric spans the hollows between muscles), push out to
       at least `thick` over the body along its normal (+ extra_out(p) where cloth hangs looser), turn the open edges inward (a hem), keep the
       body's skin weights. drop(p) removes faces after the cut (an open jacket front)."""
    me = body.data; mw = body.matrix_world
    bm = bmesh.new(); bm.from_mesh(me); bm.transform(mw)
    for co, no in planes:
        geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
        bmesh.ops.bisect_plane(bm, geom=geom, dist=1e-5, plane_co=Vector(co), plane_no=Vector(no).normalized(), clear_outer=True)
    if drop: bmesh.ops.delete(bm, geom=[f for f in bm.faces if drop(f.calc_center_median())], context='FACES')
    if ring:   # the neck opening: open-edge vertices around the neck move onto a smooth ring (radius by angle), no zig-zag
        cx, cy, z0, rad = ring
        for e in bm.edges:
            if not e.is_boundary: continue
            for v in e.verts:
                if v.co.z < z0: continue
                dx, dy = v.co.x - cx, v.co.y - cy; d = math.hypot(dx, dy) or 1e-6; r = rad(math.atan2(dy, dx)); v.co.x = cx + dx / d * r; v.co.y = cy + dy / d * r
    loose = [v for v in bm.verts if not v.link_faces]; bmesh.ops.delete(bm, geom=loose, context='VERTS')
    # small islands left by the planes (bits of fingers, ears) go
    bm.verts.ensure_lookup_table(); seen = set(); islands = []
    for v in bm.verts:
        if v in seen: continue
        stack = [v]; isl = []; seen.add(v)
        while stack:
            x = stack.pop(); isl.append(x)
            for e in x.link_edges:
                o = e.other_vert(x)
                if o not in seen: seen.add(o); stack.append(o)
        islands.append(isl)
    big = max(len(i) for i in islands)
    for isl in islands:
        if len(isl) < big * 0.04: bmesh.ops.delete(bm, geom=isl, context='VERTS')
    bm.normal_update(); bm.verts.ensure_lookup_table()
    # the cloth keeps its distance from a lightly smoothed copy of the body: big forms (chest, shoulders, seat) stay, small ones (abs, veins,
    # muscle separations) are bridged over, like fabric does
    border = set(v for e in bm.edges if e.is_boundary for v in e.verts); inner = [v for v in bm.verts if v not in border]
    bp = bm.copy(); bp.verts.ensure_lookup_table(); pin = [bp.verts[v.index] for v in inner]
    for _ in range(proxy_it): bmesh.ops.smooth_vert(bp, verts=pin, factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    bp.normal_update(); orig = {v: (bp.verts[v.index].co.copy(), bp.verts[v.index].normal.copy(), v.co.copy(), v.normal.copy()) for v in bm.verts}; bp.free()
    for _ in range(smooth_it): bmesh.ops.smooth_vert(bm, verts=inner, factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    for _ in range(border_it): bmesh.ops.smooth_vert(bm, verts=list(border), factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    for v in bm.verts:   # never inside the body: off the smoothed proxy by `thick`, and off the real skin by at least 4 mm
        o, n, o0, n0 = orig[v]; t = thick + (extra_out(o) if extra_out else 0.0); d = (v.co - o).dot(n)
        if d < t: v.co += n * (t - d)
        d0 = (v.co - o0).dot(n0)
        if d0 < 0.004: v.co += n0 * (0.004 - d0)
    bm.normal_update()
    if hem:   # turn the open edges inward: a visible fabric edge instead of a paper-thin cut
        edges = [e for e in bm.edges if e.is_boundary]
        if edges:
            ret = bmesh.ops.extrude_edge_only(bm, edges=edges); nv = [g for g in ret['geom'] if isinstance(g, bmesh.types.BMVert)]
            for v in nv:
                lv = [e.other_vert(v) for e in v.link_edges if e.other_vert(v) not in nv]; src = lv[0] if lv else None
                if src: v.co = src.co - src.normal * (thick * 0.9)
    bm.transform(mw.inverted()); out = bpy.data.meshes.new(name); bm.to_mesh(out); bm.free()
    ob = bpy.data.objects.new(name, out); bpy.context.scene.collection.objects.link(ob); ob.matrix_world = body.matrix_world.copy()
    for g in body.vertex_groups: ob.vertex_groups.new(name=g.name)
    mod = ob.modifiers.new('Armature', 'ARMATURE'); mod.object = body.modifiers[0].object; ob.parent = body.parent
    for p in out.polygons: p.use_smooth = True
    set_part(ob, part)
    if paint:   # some vertices get another part id (a zip line down a jacket)
        at = part_attr(ob)
        for v in out.vertices:
            k = paint(ob.matrix_world @ v.co)
            if k is not None: at.data[v.index].value = float(k)
    return ob
def cut_body(body, inside):
    me = body.data; mw = body.matrix_world; bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table()
    P = [mw @ v.co for v in bm.verts]; kill = [f for f in bm.faces if all(inside(P[v.index]) for v in f.verts)]
    bmesh.ops.delete(bm, geom=kill, context='FACES'); loose = [v for v in bm.verts if not v.link_faces]; bmesh.ops.delete(bm, geom=loose, context='VERTS')
    bm.to_mesh(me); bm.free(); me.update()
def dup(ob, name):
    c = ob.copy(); c.data = ob.data.copy(); c.name = name; bpy.context.scene.collection.objects.link(c); return c
def join(objs, name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]; bpy.ops.object.join(); o = bpy.context.view_layer.objects.active; o.name = name; o.data.name = name; return o
def decimate(ob, tris):
    n = sum(len(p.vertices) - 2 for p in ob.data.polygons)
    if n <= tris: return ob
    m = ob.modifiers.new('dec', 'DECIMATE'); m.ratio = tris / n; m.use_collapse_triangulate = True
    bpy.context.view_layer.objects.active = ob; bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True)
    ob.modifiers.move(len(ob.modifiers) - 1, 0); bpy.ops.object.modifier_apply(modifier='dec'); return ob
def tri_count(ob): return sum(len(p.vertices) - 2 for p in ob.data.polygons)
# ------------------------------------------------------------------ one body type
def build_body(kind):
    reset(); ubc = os.path.join(A.ubc, 'Base Characters', 'Godot - UE'); hairdir = os.path.join(A.ubc, 'Hairstyles', 'Rigged to Head Bone', 'glTF (Godot -Unreal)')
    objs = imp(os.path.join(ubc, f'Superhero_{kind.capitalize()}_FullBody.gltf'))
    arm = next(o for o in objs if o.type == 'ARMATURE'); body = next(o for o in objs if o.type == 'MESH' and o.name.lower().startswith('superhero'))
    eyes = next(o for o in objs if o.type == 'MESH' and o.name.startswith('Eyes')); brows = next(o for o in objs if o.type == 'MESH' and o.name.startswith('Eyebrows'))
    arm.name = 'Rig_' + kind; arm.data.name = 'Rig_' + kind; J = joints(arm)
    # ---- face controls: eye bones at the eyeball centres, a jaw hinged in front of the ears
    em = eyes.matrix_world; ev = [em @ v.co for v in eyes.data.vertices]
    cen = {}
    for side, f in (('l', lambda v: v.x > 0), ('r', lambda v: v.x < 0)):
        s = [v for v in ev if f(v)]; cen[side] = sum(s, Vector()) / len(s)
    for side in 'lr': add_bone(arm, 'eye_' + side, 'Head', cen[side], cen[side] + Vector((0, -0.03, 0)))
    for g in list(eyes.vertex_groups): eyes.vertex_groups.remove(g)
    for side in 'lr':
        g = eyes.vertex_groups.new(name='eye_' + side); g.add([v.index for v in eyes.data.vertices if ((em @ v.co).x > 0) == (side == 'l')], 1.0, 'REPLACE')
    # mouth line from the midline profile: the deepest point between the nose tip and the chin
    hz = J['Head'][0].z; bm = body.matrix_world; gi = body.vertex_groups['Head'].index; prof = {}
    for v in body.data.vertices:
        w = next((g.weight for g in v.groups if g.group == gi), 0)
        p = bm @ v.co
        if w > 0.3 and abs(p.x) < 0.006: k = round(p.z / 0.003); prof[k] = min(prof.get(k, 9), p.y) if k in prof else p.y
    zs = sorted(prof); eye_z = cen['l'].z
    nose = min((k for k in zs if eye_z - 0.075 < k * 0.003 < eye_z - 0.02), key=lambda k: prof[k])
    mouth = max((k for k in zs if nose * 0.003 - 0.05 < k * 0.003 < nose * 0.003 - 0.022), key=lambda k: prof[k]); mz = mouth * 0.003
    front = prof[mouth]; hinge = Vector((0, front + 0.085, mz + 0.03))
    add_bone(arm, 'jaw', 'Head', hinge, hinge + Vector((0, -0.07, -0.02)))
    move_weight(body, 'Head', 'jaw', lambda p: smoothstep(mz + 0.002, mz - 0.006, p.z) * smoothstep(hinge.y + 0.01, hinge.y - 0.03, p.y) * (1 if p.z > mz - 0.075 else 0))
    # dark mouth interior behind the lips, half on the head, half on the jaw
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=1, location=(0, front + 0.017, mz)); mo = bpy.context.active_object; mo.name = 'Mouth'
    mo.scale = (0.021, 0.012, 0.012); bpy.ops.object.transform_apply(scale=True); mo.parent = arm
    for g in body.vertex_groups: mo.vertex_groups.new(name=g.name)
    for v in mo.data.vertices: p = mo.matrix_world @ v.co; k = smoothstep(mz + 0.004, mz - 0.004, p.z); mo.vertex_groups['Head'].add([v.index], 1 - k, 'REPLACE'); mo.vertex_groups['jaw'].add([v.index], k, 'REPLACE')
    m = mo.modifiers.new('Armature', 'ARMATURE'); m.object = arm; set_part(mo, PART['mouth'])
    set_part(eyes, PART['eyes']); set_part(brows, PART['brows'])
    # ---- hair: fitted to this head (the packs' hair was modelled on its own head bone)
    styles = ['SimpleParted', 'Buzzed', 'Beard'] if kind == 'male' else ['Long', 'Buns', 'BuzzedFemale']; hairs = {}
    for k, st in enumerate(styles):
        hobjs = imp(os.path.join(hairdir, f'Hair_{st}.gltf')); harm = next(o for o in hobjs if o.type == 'ARMATURE'); hm = next(o for o in hobjs if o.type == 'MESH')
        hj = harm.matrix_world @ harm.data.bones['Head'].head_local; off = J['Head'][0] - hj
        hm.parent = None; hm.matrix_world = Matrix.Translation(off) @ hm.matrix_world; bpy.context.view_layer.objects.active = hm; bpy.ops.object.select_all(action='DESELECT'); hm.select_set(True); bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        hm.parent = arm; hm.modifiers[0].object = arm if hm.modifiers else None
        if not hm.modifiers: mm = hm.modifiers.new('Armature', 'ARMATURE'); mm.object = arm
        for o in hobjs:
            if o is not hm: bpy.data.objects.remove(o)
        set_part(hm, PART['beard'] if st == 'Beard' else [PART['hair'], PART['hair2'], PART['hair3']][min(k, 2)]); hm.name = 'Hair_' + st; hairs[st] = hm
    # ---- cut lines from the joints (both bodies)
    neck = J['neck_01'][0].z - 0.012; waist = J['pelvis'][0].z + 0.07; hip = J['pelvis'][0].z
    sh_x = J['upperarm_l'][0].x; ua_len = J['upperarm_l'][1].x - sh_x; wrist = J['hand_l'][0].x - 0.015; ankle = J['foot_l'][0].z + 0.035; knee = J['calf_l'][0].z
    arm_z = J['upperarm_l'][0].z
    is_arm = lambda p: abs(p.x) > sh_x - 0.02 and p.z > arm_z - 0.16
    def torso(p, hem):   # shirt body: shoulders to the hem, the neck opening scooped lower at the front
        if is_arm(p): return False
        nk = neck - (0.035 if p.y < -0.02 and abs(p.x) < 0.07 else 0.0)
        return hem < p.z < nk and abs(p.x) < sh_x + 0.05
    sleeve = lambda p, end: is_arm(p) and abs(p.x) < end
    legs = lambda p, top, bottom: bottom < p.z < top and abs(p.x) < 0.3 and not is_arm(p)
    feet = lambda p: p.z < ankle + 0.005
    OUT = {}
    # ---- garments (kept as separate objects, combined per outfit below). A plane (point, normal) removes what lies on its normal's side.
    UP, DOWN = (0, 0, 1), (0, 0, -1)
    above = lambda z: ((0, 0, z), UP); below = lambda z: ((0, 0, z), DOWN)
    sleeves = lambda x: [((x, 0, 0), (1, 0, 0)), ((-x, 0, 0), (-1, 0, 0))]
    nk = J['neck_01'][0]; nr = 0.064 if kind == 'male' else 0.056
    collar = lambda r, front: (lambda c: math.hypot(c.x, c.y - nk.y) < r + (front if c.y < nk.y - 0.02 else 0) and c.z > nk.z - 0.07)   # the neck opening: a ring around the neck, deeper at the front
    ringr = lambda r, front: (nk.x, nk.y, nk.z - 0.075, lambda a: r + front * max(0.0, -math.sin(a)) ** 2)   # deeper at the front (-y)
    shirt = lambda name, hem, end, thick, part, it, r=nr, front=0.012, extra=None, drop=None, paint=None: make_garment(body, name, [above(nk.z + 0.05), below(hem)] + sleeves(end), thick, it, part, extra_out=extra,
                                       drop=(lambda c: collar(r, front)(c) or (drop(c) if drop else False)), border_it=6, ring=ringr(r, front), paint=paint)
    loose = lambda k: (lambda p: k * smoothstep(waist + 0.15, hip, p.z))
    tee = shirt('tee', hip + 0.005, sh_x + ua_len * 0.5, 0.008, 40, PART['top'], front=0.02, extra=loose(0.008))
    longs = shirt('longsleeve', waist - 0.012, wrist, 0.008, 40, PART['top'], front=0.004)
    sweat = shirt('sweat', hip - 0.02, wrist + 0.005, 0.015, 50, PART['top'], r=nr + 0.004, front=0.0, extra=loose(0.012))
    jacket = shirt('jacket', hip - 0.05, wrist - 0.01, 0.022, 50, PART['outer'], r=nr + 0.012, front=0.01, extra=lambda p: 0.006, paint=lambda p: PART['trim'] if abs(p.x) < 0.007 and p.y < -0.02 and p.z < nk.z - 0.05 else None)
    vest = shirt('vest', waist - 0.04, sh_x - 0.012, 0.016, 45, PART['outer'], r=nr + 0.012, front=0.06)
    legs_planes = lambda top, bottom: [above(top), below(bottom)] + sleeves(0.3)
    jeans = make_garment(body, 'jeans', legs_planes(waist, ankle), 0.008, 30, PART['bottom'], extra_out=lambda p: 0.004 * smoothstep(knee + 0.1, ankle, p.z))
    trousers = make_garment(body, 'trousers', legs_planes(waist, ankle - 0.01), 0.01, 34, PART['bottom'], extra_out=lambda p: 0.012 * smoothstep(hip - 0.1, ankle, p.z))
    capri = make_garment(body, 'capri', legs_planes(waist, knee - 0.1), 0.009, 30, PART['bottom'])
    shoes = make_garment(body, 'shoes', [above(ankle)], 0.011, 12, PART['shoes'], proxy_it=10)
    belt = make_garment(body, 'belt', legs_planes(waist + 0.006, waist - 0.03), 0.014, 8, PART['trim'], hem=False)
    # ---- outfits: (name, garments, which body skin stays). Body faces under every garment are removed.
    top_cut = lambda hem, end: (lambda p: (torso(p, hem + 0.02) and p.z < neck - 0.04) or (is_arm(p) and abs(p.x) < end - 0.02 and abs(p.x) > sh_x + 0.02))
    leg_cut = lambda bottom: (lambda p: legs(p, waist - 0.02, bottom + 0.02))
    feet_cut = lambda p: p.z < ankle - 0.02
    FIT = {
        'tee':     ([tee, jeans, shoes], [top_cut(hip + 0.005, sh_x + ua_len * 0.5), leg_cut(ankle), feet_cut]),
        'shirt':   ([longs, trousers, shoes, belt], [top_cut(waist - 0.012, wrist), leg_cut(ankle), feet_cut]),
        'sweat':   ([sweat, jeans, shoes], [top_cut(hip - 0.02, wrist), leg_cut(ankle), feet_cut]),
        'jacket':  ([jacket, jeans, shoes], [top_cut(hip - 0.03, wrist), leg_cut(ankle), feet_cut]),
        'capri':   ([tee, capri, shoes], [top_cut(hip + 0.005, sh_x + ua_len * 0.5), leg_cut(knee - 0.1), feet_cut]),
        'staff':   ([longs, vest, trousers, shoes, belt], [top_cut(waist - 0.012, wrist), leg_cut(ankle), feet_cut]),
    }
    want = ['tee', 'shirt', 'sweat', 'jacket', 'staff'] if kind == 'male' else ['tee', 'shirt', 'jacket', 'capri', 'staff']
    if A.only: want = [w for w in want if w in A.only.split(',')]
    results = []
    for oname in want:
        gs, cuts = FIT[oname]
        b = dup(body, 'b_' + oname); set_part(b, PART['skin']); cut_body(b, lambda p: any(c(p) for c in cuts))
        parts = [b] + [dup(g, g.name + '_' + oname) for g in gs] + [dup(eyes, 'e_' + oname), dup(brows, 'w_' + oname), dup(mo, 'm_' + oname)] + [dup(h, h.name + '_' + oname) for h in hairs.values()]
        full = join(parts, f'{kind[0].upper()}_{oname}_L0'); full.parent = arm
        l1 = dup(full, f'{kind[0].upper()}_{oname}_L1'); decimate(l1, 3600); l2 = dup(full, f'{kind[0].upper()}_{oname}_L2'); decimate(l2, 1300)
        for o in (full, l1, l2): o.parent = arm; o.modifiers['Armature'].object = arm
        results += [full, l1, l2]; print(f'PEOPLE {kind} {oname}: L0 {tri_count(full)} L1 {tri_count(l1)} L2 {tri_count(l2)} tris')
    # remove the source pieces (only the outfits are exported)
    for o in [body, eyes, brows, mo, tee, longs, sweat, jacket, vest, jeans, trousers, capri, shoes, belt] + list(hairs.values()): bpy.data.objects.remove(o)
    return arm, results
def export(objs, path, anim=False):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=False, export_skins=True, export_attributes=True, export_materials='NONE',
                              export_animations=anim, export_morph=False, export_yup=True, export_texcoords=True, export_normals=True, export_tangents=False, export_all_influences=False,
                              **({'export_animation_mode': 'ACTIONS', 'export_optimize_animation_size': True, 'export_force_sampling': True} if anim else {}))
def preview(arm, objs, path):
    sc = bpy.context.scene; sc.render.engine = 'BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items] else 'BLENDER_EEVEE'
    sc.render.resolution_x = 1600; sc.render.resolution_y = 600
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs[0].default_value = (0.42, 0.42, 0.45, 1)
    cols = {0: (0.86, 0.66, 0.55, 1), 1: (0.15, 0.32, 0.6, 1), 2: (0.12, 0.14, 0.2, 1), 3: (0.9, 0.9, 0.88, 1), 4: (0.12, 0.08, 0.05, 1), 5: (0.9, 0.9, 0.9, 1), 6: (0.1, 0.07, 0.05, 1), 7: (0.05, 0.02, 0.02, 1), 8: (0.5, 0.32, 0.18, 1), 9: (0.25, 0.18, 0.1, 1), 10: (0.12, 0.08, 0.05, 1), 11: (0.12, 0.08, 0.05, 1), 12: (0.12, 0.08, 0.05, 1)}
    L0 = [o for o in objs if o.name.endswith('_L0')]
    for i, o in enumerate(L0):
        mat = bpy.data.materials.new('pv'); mat.use_nodes = True; nt = mat.node_tree; bsdf = nt.nodes['Principled BSDF']; attr = nt.nodes.new('ShaderNodeAttribute'); attr.attribute_name = '_PART'
        ramp = nt.nodes.new('ShaderNodeValToRGB'); ramp.color_ramp.interpolation = 'CONSTANT'; els = ramp.color_ramp.elements
        els[0].position = 0; els[0].color = cols[0]; els[1].position = 1.0 / 13; els[1].color = cols[1]
        for p in range(2, 13): e = els.new(p / 13); e.color = cols[p]
        mth = nt.nodes.new('ShaderNodeMath'); mth.operation = 'MULTIPLY_ADD'; mth.inputs[1].default_value = 1 / 13; mth.inputs[2].default_value = 0.5 / 13; nt.links.new(attr.outputs['Fac'], mth.inputs[0]); nt.links.new(mth.outputs[0], ramp.inputs[0]); nt.links.new(ramp.outputs[0], bsdf.inputs['Base Color'])
        o.data.materials.clear(); o.data.materials.append(mat); o.location.x = (i - (len(L0) - 1) / 2) * 0.9
    for o in objs:
        if not o.name.endswith('_L0'): o.hide_render = True
    # a seated test pose would need the clips; the bind pose shows the garments
    ld = bpy.data.lights.new('k', 'SUN'); ld.energy = 3.5; lo = bpy.data.objects.new('k', ld); sc.collection.objects.link(lo); lo.rotation_euler = (math.radians(50), 0, math.radians(25))
    cam = bpy.data.cameras.new('c'); co = bpy.data.objects.new('c', cam); sc.collection.objects.link(co); sc.camera = co; cam.type = 'ORTHO'; cam.ortho_scale = max(2.2, len(L0) * 0.95)
    co.location = (0, -6, 1.0); co.rotation_euler = (math.radians(90), 0, 0); sc.render.filepath = path; bpy.ops.render.render(write_still=True)
if __name__ == '__main__':
    os.makedirs(A.out, exist_ok=True)
    for kind in ('male', 'female'):
        arm, objs = build_body(kind)
        if A.preview: os.makedirs(A.preview, exist_ok=True); preview(arm, objs, os.path.join(A.preview, kind + '.png'))
        for o in objs: o.data.materials.clear(); o.location = (0, 0, 0)
        export([arm] + objs, os.path.join(A.out, f'people_{kind}.glb'))
    # animations: the library armature with the clips the cinema uses (meshes removed)
    reset(); new = imp(A.ual1); arm = next(o for o in new if o.type == 'ARMATURE')
    for o in new:
        if o.type == 'MESH': bpy.data.objects.remove(o)
    before = set(bpy.data.objects); bpy.ops.import_scene.gltf(filepath=A.ual2)
    for o in [o for o in bpy.data.objects if o not in before]: bpy.data.objects.remove(o)
    for a in list(bpy.data.actions):
        base = a.name.split('|')[-1].split('.')[0]
        if base not in CLIPS or any(b.name.split('|')[-1].split('.')[0] == base and b is not a and b.users > a.users for b in bpy.data.actions): bpy.data.actions.remove(a); continue
        a.name = base; a.use_fake_user = True
    arm.animation_data_create(); tr = arm.animation_data.nla_tracks
    for a in bpy.data.actions:
        t = tr.new(); t.name = a.name; s = t.strips.new(a.name, int(a.frame_range[0]), a)
        try: s.action_slot = a.slots[0]
        except Exception: pass
    print('ANIMS', sorted(a.name for a in bpy.data.actions))
    bpy.ops.object.select_all(action='DESELECT'); arm.select_set(True)
    bpy.ops.export_scene.gltf(filepath=os.path.join(A.out, 'anims.glb'), export_format='GLB', use_selection=True, export_animations=True, export_animation_mode='NLA_TRACKS', export_skins=True, export_materials='NONE', export_optimize_animation_size=True, export_force_sampling=True, export_yup=True)
