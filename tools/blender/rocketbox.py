"""LUMIERE v9.3 people from the Microsoft Rocketbox library (MIT licence, https://github.com/microsoft/Microsoft-Rocketbox):
photographed skin, clothes and hair on a 3ds Max Biped rig, plus mocap clips on the same rig.

What this does, per avatar: imports the FBX, bakes the armature's 0.01 scale / -90 deg turn / hip-height offset into the bones (the root
node stays at the floor), renames the bones the engine's IK and look code use (pelvis, spine_01..03, neck_01, Head, clavicle/upperarm/
lowerarm/hand, thigh/calf/foot/ball, jaw, eye_l/eye_r), packs body, head and hair textures into one atlas (one draw call), builds three
detail levels (RB_L0 full, RB_L1, RB_L2 decimated, hair cards protected) and exports a skinned GLB.

Per gender, the clips: each source clip is copied onto that gender's reference skeleton bone by bone in WORLD space (the source FBX has
another bind pose, up to 36 deg off, but the Biped bone axes ride the limbs the same way, so world orientations transfer exactly),
the body's travel (on the FBX root object) goes onto the pelvis, walks are made in-place (their speed is recorded), then exported as one
GLB of actions. rb.json records each avatar's hip height and triangle counts, and each clip's length, walking speed and seat height.

usage: blender --background --factory-startup --python tools/blender/rocketbox.py -- --rb <Rocketbox>/Assets --out <dir>
         [--avatars Male_Adult_01,Female_Adult_01] [--tex 512] [--skip-clips] [--skip-avatars]
then:  gltf-transform meshopt <dir>/<f>.glb www/models/rb/<f>.glb (see tools/blender/PEOPLE.md)"""
import bpy, sys, os, json, math
import numpy as np
from mathutils import Matrix

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
def arg(k, d=None): return argv[argv.index(k) + 1] if k in argv else d
RB, OUT, TEX = arg('--rb'), arg('--out'), int(arg('--tex', '512'))
AVATARS = [a for a in (arg('--avatars') or 'Male_Adult_01,Female_Adult_01').split(',') if a]
REF = {'m': 'Male_Adult_01', 'f': 'Female_Adult_01'}   # each gender's clips are baked onto this avatar's skeleton
os.makedirs(OUT, exist_ok=True)

NAMES = {'Bip01 Pelvis': 'pelvis', 'Bip01 Spine': 'spine_01', 'Bip01 Spine1': 'spine_02', 'Bip01 Spine2': 'spine_03', 'Bip01 Neck': 'neck_01',
         'Bip01 Head': 'Head', 'Bip01 MJaw': 'jaw', 'Bip01 LEye': 'eye_l', 'Bip01 REye': 'eye_r'}
for s_, S_ in (('L', 'l'), ('R', 'r')):
    NAMES.update({f'Bip01 {s_} Clavicle': f'clavicle_{S_}', f'Bip01 {s_} UpperArm': f'upperarm_{S_}', f'Bip01 {s_} Forearm': f'lowerarm_{S_}',
                  f'Bip01 {s_} Hand': f'hand_{S_}', f'Bip01 {s_} Thigh': f'thigh_{S_}', f'Bip01 {s_} Calf': f'calf_{S_}', f'Bip01 {s_} Foot': f'foot_{S_}',
                  f'Bip01 {s_} Toe0': f'ball_{S_}'})
def newname(n): return NAMES.get(n, n.replace('Bip01 ', 'rb_').replace(' ', '_'))

# engine clip name -> (Rocketbox folder, file stem with {g} = m/f, travel: None = keep, 'trend' = remove the straight-line travel (walks keep
# their sway), 'flat' = no horizontal travel at all (sitting down: the engine walks the person onto the seat point, the clip only lowers them))
FOLDER = {'static': 'all_animations_max_motextr_static', 'xy': 'all_animations_max_motextr_xy', 'xyz': 'all_animations_max_motextr_xyz'}
CLIPS = {
    'Idle_Loop': ('static', '{g}_idle_neutral_01', None),
    'Walk_Loop': ('xy', '{g}_walk_neutral_01', 'trend'),
    'Sitting_Idle_Loop': ('static', '{g}_sit_chair_idle_neutral_01', None),
    'Sitting_Enter': ('xyz', '{g}_sit_down_chair_01', 'flat'),
    'Sitting_Exit': ('xyz', '{g}_sit_stand_up_chair_01', 'flat'),
    'Sitting_Talking_Loop': ('static', '{g}_sit_chair_gestic_shrug_01', None),
    'Idle_Talking_Loop': ('static', '{g}_gestic_talk_neutral_01', None),
    'Idle_FoldArms_Loop': ('static', '{g}_idle_waiting_01', None),
    'Idle_TalkingPhone_Loop': ('static', {'m': 'm_cell_phone_talk_01', 'f': 'f_cell_phone_textmessage'}, None),
    'Walk_Formal_Loop': ('xy', '{g}_walk_neutral_02', 'trend'),
    'Jog_Fwd_Loop': ('xy', '{g}_run_slow_01', 'trend'),
}

def clean():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.fps = 30

def import_fbx(path):
    before = set(bpy.data.objects[:])
    bpy.ops.import_scene.fbx(filepath=path, use_anim=True)
    new = [o for o in bpy.data.objects if o not in before]
    arm = next(o for o in new if o.type == 'ARMATURE'); meshes = [o for o in new if o.type == 'MESH']
    for o in [o for o in new if o.type not in ('ARMATURE', 'MESH')]: bpy.data.objects.remove(o, do_unlink=True)
    return arm, meshes

def activate(o):
    if bpy.context.object and bpy.context.object.mode != 'OBJECT': bpy.ops.object.mode_set(mode='OBJECT')
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o

def bake_rest(arm, meshes):
    """bake every object transform into the data: the armature object ends at the origin with identity transform, the pelvis at hip height"""
    arm.animation_data_clear()
    for m in meshes: mw = m.matrix_world.copy(); m.parent = None; m.matrix_world = mw
    for o in [arm] + meshes: activate(o); bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    for m in meshes:
        m.parent = arm; m.matrix_parent_inverse = Matrix()
        mod = next((d for d in m.modifiers if d.type == 'ARMATURE'), None) or m.modifiers.new('Armature', 'ARMATURE'); mod.object = arm
    for b in arm.data.bones: b.name = newname(b.name)

def tris(me): return sum(len(p.vertices) - 2 for p in me.polygons)

def atlas(mesh, tex_dir, size, out_png):
    """one material: body (lower left), head (lower right), hair cards with alpha (upper left) in a 2*size atlas"""
    me = mesh.data; uv = me.uv_layers.active.data; quad = {'body': (0.0, 0.0), 'head': (0.5, 0.0), 'opacity': (0.0, 0.5)}
    parts = {}; rng = {}
    for i, m in enumerate(me.materials):
        part = m.name.split('_')[-1] if m else 'body'; parts[i] = part
    for p in me.polygons:
        part = parts.get(p.material_index, 'body'); ox, oy = quad.get(part, (0.5, 0.5)); r = rng.setdefault(part, [9, 9, -9, -9])
        for li in p.loop_indices:
            u, v = uv[li].uv; r[0] = min(r[0], u); r[1] = min(r[1], v); r[2] = max(r[2], u); r[3] = max(r[3], v)
            uv[li].uv = (ox + 0.5 * min(max(u, 0.0), 1.0), oy + 0.5 * min(max(v, 0.0), 1.0))
    code = me.materials[0].name.split('_')[0]   # m002 / f001
    def px(name, alpha):
        path = os.path.join(tex_dir, f'{code}_{name}.tga')
        img = bpy.data.images.load(path); img.scale(size, size); a = np.empty(size * size * 4, np.float32); img.pixels.foreach_get(a); a = a.reshape(size, size, 4)
        if not alpha: a[:, :, 3] = 1.0
        bpy.data.images.remove(img); return a
    at = np.ones((2 * size, 2 * size, 4), np.float32); at[:, :, :3] = 0.5
    at[0:size, 0:size] = px('body_color', False); at[0:size, size:] = px('head_color', False); at[size:, 0:size] = px('opacity_color', True)
    img = bpy.data.images.new('atlas', 2 * size, 2 * size, alpha=True); img.pixels.foreach_set(at.ravel())
    img.filepath_raw = out_png; img.file_format = 'PNG'; img.save(); bpy.data.images.remove(img)
    hair = [p.index for p in me.polygons if parts.get(p.material_index) == 'opacity']   # before the slots go (clearing them resets the indices)
    mat = bpy.data.materials.new('rb_atlas'); me.materials.clear(); me.materials.append(mat)
    for p in me.polygons: p.material_index = 0
    return {k: [round(x, 3) for x in v] for k, v in rng.items()}, hair

def lod(mesh, arm, ratio, name, hair_polys):
    c = mesh.copy(); c.data = mesh.data.copy(); bpy.context.collection.objects.link(c); c.name = name; c.data.name = name
    if ratio < 1:
        # hair cards and lashes keep their shape: their vertices go in a group the decimator leaves alone
        g = c.vertex_groups.new(name='rb_keep'); vs = set()
        for i in hair_polys: vs.update(c.data.polygons[i].vertices)
        g.add(list(vs), 1.0, 'REPLACE')
        d = c.modifiers.new('dec', 'DECIMATE'); d.ratio = ratio; d.use_collapse_triangulate = True; d.vertex_group = 'rb_keep'; d.invert_vertex_group = True; d.vertex_group_factor = 1.0
        activate(c); bpy.ops.object.modifier_move_to_index(modifier='dec', index=0); bpy.ops.object.modifier_apply(modifier='dec')
        c.vertex_groups.remove(c.vertex_groups['rb_keep'])
    c.parent = arm; c.matrix_parent_inverse = Matrix()
    return c

def export(path, objs, anims):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    kw = dict(filepath=path, export_format='GLB', use_selection=True, export_yup=True, export_skins=True, export_morph=False, export_apply=False,
              export_texcoords=True, export_normals=True, export_materials='PLACEHOLDER', export_animations=anims, export_cameras=False, export_lights=False)
    if anims: kw.update(export_animation_mode='ACTIONS', export_force_sampling=True, export_frame_step=2, export_optimize_animation_size=True)
    bpy.ops.export_scene.gltf(**kw)

def avatar_dir(name):
    for grp in ('Adults', 'Professions', 'Children'):
        d = os.path.join(RB, 'Avatars', grp, name)
        if os.path.isdir(d): return d
    raise SystemExit(f'no avatar {name}')

META = {'avatars': {}, 'clips': {}}
mp = os.path.join(OUT, 'rb.json')
if os.path.exists(mp): META = json.load(open(mp))

if '--skip-avatars' not in argv:
    os.makedirs(os.path.join(OUT, 'rb'), exist_ok=True)
    for name in AVATARS:
        clean(); d = avatar_dir(name); arm, meshes = import_fbx(os.path.join(d, 'Export', name + '.fbx'))
        mesh = meshes[0]; bake_rest(arm, meshes); arm.name = 'RB_' + name
        kind = 'f' if name.lower().startswith(('female', 'business_female')) or '_Female_' in name else 'm'
        uvr, hair = atlas(mesh, os.path.join(d, 'Textures'), TEX, os.path.join(OUT, 'rb', name + '.png'))
        L = [lod(mesh, arm, r, f'RB_L{i}', hair) for i, r in enumerate((1.0, 0.36, 0.13))]
        bpy.data.objects.remove(mesh, do_unlink=True)
        pel = arm.data.bones['pelvis'].head_local; feet = min(min((arm.matrix_world @ v.co).z for v in L[0].data.vertices), 9)
        export(os.path.join(OUT, f'rb_{name}.glb'), [arm] + L, False)
        META['avatars'][name] = {'kind': kind, 'pelvisY': round(pel.z, 4), 'minY': round(feet, 4), 'tris': [tris(o.data) for o in L], 'uv': uvr, 'hairTris': len(hair),
                                 'bones': [b.name for b in arm.data.bones], 'heads': {b.name: [round(v, 4) for v in b.head_local] for b in arm.data.bones}}
        print('AVATAR', name, META['avatars'][name], flush=True)

if '--skip-clips' not in argv:
    for g, ref in REF.items():
        clean(); d = avatar_dir(ref); arm, meshes = import_fbx(os.path.join(d, 'Export', ref + '.fbx'))
        body = meshes[0]; bake_rest(arm, meshes); arm.name = 'RB_' + ref
        rev = {newname(n): n for n in [b.name for b in arm.data.bones]}   # identity after renaming; the source keeps Bip01 names
        src_name = {v: k for k, v in NAMES.items()}
        for clip, (fold, stem, inplace) in CLIPS.items():
            stem = stem[g] if isinstance(stem, dict) else stem.format(g=g)
            path = os.path.join(RB, 'Animations', FOLDER[fold], stem + '.max.fbx')
            if not os.path.exists(path): print('MISSING', path); continue
            src, sm = import_fbx(path)
            for m in sm: bpy.data.objects.remove(m, do_unlink=True)
            sact = src.animation_data.action; f0, f1 = int(sact.frame_range[0]), int(sact.frame_range[1])
            for pb in arm.pose.bones:
                sn = src_name.get(pb.name) or ('Bip01 ' + pb.name[3:].replace('_', ' ') if pb.name.startswith('rb_') else None)
                if not sn or sn not in src.pose.bones: continue
                c = pb.constraints.new('COPY_ROTATION'); c.target = src; c.subtarget = sn; c.target_space = 'WORLD'; c.owner_space = 'WORLD'
                if pb.name == 'pelvis':
                    c = pb.constraints.new('COPY_LOCATION'); c.target = src; c.subtarget = sn; c.target_space = 'WORLD'; c.owner_space = 'WORLD'
            # the source's travel per second (its root object carries it, in world X/Y), measured, then taken out at the source
            sc = bpy.context.scene; sc.frame_set(f0); p0 = (src.matrix_world @ src.pose.bones['Bip01 Pelvis'].head).copy(); sc.frame_set(f1); p1 = (src.matrix_world @ src.pose.bones['Bip01 Pelvis'].head).copy()
            dur = (f1 - f0) / 30.0; speed = math.hypot(p1.x - p0.x, p1.y - p0.y) / dur if dur > 0 else 0
            if inplace:
                for lay in sact.layers:
                    for st in lay.strips:
                        for cb in st.channelbags:
                            for fc in cb.fcurves:
                                if fc.data_path != 'location' or fc.array_index > 1: continue
                                a, b = fc.evaluate(f0), fc.evaluate(f1)
                                for k in fc.keyframe_points:
                                    t = (k.co.x - f0) / max(1, f1 - f0); off = (b - a) * t if inplace == 'trend' else (k.co.y - a)
                                    k.co.y -= off; k.handle_left.y -= off; k.handle_right.y -= off
                src.animation_data.action = sact
            activate(arm); bpy.ops.object.mode_set(mode='POSE'); bpy.ops.pose.select_all(action='SELECT')
            bpy.ops.nla.bake(frame_start=f0, frame_end=f1, step=1, only_selected=False, visual_keying=True, clear_constraints=True, use_current_action=False, bake_types={'POSE'})
            bpy.ops.object.mode_set(mode='OBJECT')
            act = arm.animation_data.action; act.name = clip; act.use_fake_user = True
            # seat measure: the pelvis's lowest height while seated (sitting clips only)
            sc.frame_set(f1); pz = (arm.matrix_world @ arm.pose.bones['pelvis'].head).z
            arm.animation_data.action = None
            META['clips'].setdefault(g, {})[clip] = {'src': stem, 'frames': f1 - f0 + 1, 'dur': round(dur, 3), 'speed': round(speed, 3), 'pelvisEnd': round(pz, 4)}
            print('CLIP', g, clip, META['clips'][g][clip], flush=True)
            sa = src.animation_data.action; bpy.data.objects.remove(src, do_unlink=True)
            if sa and sa.users == 0: bpy.data.actions.remove(sa)
        # seat height for the sitting clips: the lowest point of the posed body over the thighs (the seat surface it rests on)
        if 'Sitting_Idle_Loop' in bpy.data.actions:
            arm.animation_data_create(); arm.animation_data.action = bpy.data.actions['Sitting_Idle_Loop']; bpy.context.scene.frame_set(1)
            dg = bpy.context.evaluated_depsgraph_get(); ev = body.evaluated_get(dg); me = ev.to_mesh()
            gi = {g_.index: g_.name for g_ in body.vertex_groups}; zs = []
            pel = arm.matrix_world @ arm.pose.bones['pelvis'].head
            for v in me.vertices:   # the buttocks: pelvis/thigh skin within 0.2 m (across the floor) of the hip joint; its lowest points rest on the seat
                w = {gi[e.group]: e.weight for e in body.data.vertices[v.index].groups if e.group in gi}; co = ev.matrix_world @ v.co
                if w.get('pelvis', 0) + w.get('thigh_l', 0) + w.get('thigh_r', 0) > 0.6 and math.hypot(co.x - pel.x, co.y - pel.y) < 0.2: zs.append(co.z)
            ev.to_mesh_clear(); META['clips'][g]['seatY'] = round(float(np.percentile(zs, 1)), 4) if zs else None
            pel = arm.pose.bones['pelvis']; META['clips'][g]['sitPelvisY'] = round((arm.matrix_world @ pel.head).z, 4)
            arm.animation_data.action = None
            print('SEAT', g, META['clips'][g]['seatY'], META['clips'][g]['sitPelvisY'], flush=True)
        bpy.data.objects.remove(body, do_unlink=True)
        for a in list(bpy.data.actions):
            if a.name not in CLIPS: bpy.data.actions.remove(a)
        export(os.path.join(OUT, f'rb_anims_{g}.glb'), [arm], True)

# can the GPU crowd share one baked skeleton per gender? (same bones in the same order, joints within a few millimetres of the reference)
for name, A in META['avatars'].items():
    R = META['avatars'].get(REF[A['kind']])
    if not R or 'heads' not in A or 'heads' not in R: continue
    same = A['bones'] == R['bones']; dmax = max((math.dist(A['heads'][b], R['heads'][b]) for b in A['bones'] if b in R['heads']), default=9)
    A['skel'] = {'sameBones': same, 'maxJointDiff': round(dmax, 4)}; print('SKEL', name, A['skel'], flush=True)
for A in META['avatars'].values(): A.pop('heads', None); A.pop('bones', None)
json.dump(META, open(mp, 'w'), indent=1)
print('RB_DONE', flush=True)
