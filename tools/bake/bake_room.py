"""LUMIERE light-map pipeline, step 2 (Blender 5.x, headless): bake one exported room in Cycles. See tools/bake/README.md.

    blender --background --factory-startup --python tools/bake/bake_room.py -- --room tools/bake/.work/gal.json --out www/bake

What it does (blender-web-3d skill: references/baked-lighting.md; cc-blender: blender-uv-texturing, blender-lighting):
  1. rebuilds the room mesh (engine y-up -> Blender z-up) with its tints, material uvs and material ids; shadow casters (seats,
     curtains, door leaves) as a second object; the cinema screen as an emitter
  2. rebuilds the lights from the engine's list (bake.js): omni -> point, spot -> spot, one-sided emitters (LED lines, menu boards,
     light boxes) -> small area lights; powers from the calibration P = 4 pi^2 I (point / spot) and P = pi^2 I (one-sided)
  3. unwraps a light-map UV set (BakeUV -> glTF TEXCOORD_1): smart project, equal texel density, packed with a margin
  4. bakes DIFFUSE light only (direct + indirect, no albedo) per layer: house lights, fixed lights, the screen (halls only),
     plus normals and ambient occlusion for the engine's ambient fill
  5. filters (3x3 median then a small Gaussian, inside the islands), encodes PNG with the sRGB curve and a scale per layer,
     exports the room as GLB (positions, normals, material uvs, light-map uvs, tints, material ids) and writes <room>.json
"""
import bpy, json, sys, os, math, base64, time, argparse, re
import numpy as np
from mathutils import Vector, Matrix

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ap = argparse.ArgumentParser()
ap.add_argument('--room', required=True); ap.add_argument('--out', required=True); ap.add_argument('--www', default='www')
ap.add_argument('--density', type=float, default=22.0, help='light-map texels per metre')
ap.add_argument('--samples', type=int, default=96); ap.add_argument('--maxres', type=int, default=2048); ap.add_argument('--minres', type=int, default=256)
ap.add_argument('--blend', default='', help='also save the bake scene here (review)')
A = ap.parse_args(argv)
T0 = time.time()
D = json.load(open(A.room)); KEY = D['key']; HALL = D.get('isHall', False)
log = lambda *a: print(f'[bake {KEY} {time.time() - T0:6.1f}s]', *a, flush=True)


def arr(s, dt, w=1):
    a = np.frombuffer(base64.b64decode(s), dtype=dt)
    return a.reshape(-1, w) if w > 1 else a


def bl(p):  # engine (x, y, z) y-up -> Blender (x, -z, y) z-up
    return np.stack([p[:, 0], -p[:, 2], p[:, 1]], 1)


# ---------------------------------------------------------------- material albedo per library id (for bounce light)
def load_rgb(path, size=64):
    """Mean-friendly pixels of an image file through Blender (no Pillow in Blender's Python): stored values 0..1, RGB."""
    im = bpy.data.images.load(path, check_existing=False); im.colorspace_settings.name = 'Non-Color'; im.scale(size, size)
    px = np.array(im.pixels[:], dtype=np.float64).reshape(size, size, 4)[..., :3]; bpy.data.images.remove(im); return px


def library_albedo():
    src = open(os.path.join(A.www, 'js', 'library.js')).read()
    lib = {int(m.group(1)): (m.group(2), m.group(3)) for m in re.finditer(r"(\d+): \{ tex: '(\w+)', mode: '(rel|abs)'", src)}
    out = {}
    for mid, (tex, mode) in lib.items():
        try: px = load_rgb(os.path.join(A.www, 'tex', tex + '_a.jpg'))
        except Exception: out[mid] = np.array([1.0, 1.0, 1.0]); continue
        if mode == 'abs': out[mid] = (px ** 2.2).reshape(-1, 3).mean(0)      # sRGB albedo map -> linear mean
        else: out[mid] = np.full(3, 2.0 * px.mean())                         # 'rel' maps are linear detail around 0.5, x2 in the shader
    return out


# ---------------------------------------------------------------- scene
bpy.ops.wm.read_factory_settings(use_empty=True)
SC = bpy.context.scene
SC.render.engine = 'CYCLES'; SC.cycles.device = 'CPU'; SC.cycles.samples = A.samples
SC.cycles.max_bounces = 6; SC.cycles.diffuse_bounces = 4; SC.cycles.glossy_bounces = 1; SC.cycles.transmission_bounces = 0
SC.cycles.sample_clamp_indirect = 4.0
SC.world = bpy.data.worlds.new('world'); SC.world.use_nodes = True; SC.world.node_tree.nodes['Background'].inputs[1].default_value = 0.0


def make_mesh(name, P, I, col=None, uv=None, mat=None, nrm=None, bake_col=None, validate=True):
    me = bpy.data.meshes.new(name); nv = len(P); nf = len(I) // 3
    me.vertices.add(nv); me.vertices.foreach_set('co', bl(P).astype(np.float32).ravel())
    me.loops.add(nf * 3); me.loops.foreach_set('vertex_index', I.astype(np.int32))
    me.polygons.add(nf); me.polygons.foreach_set('loop_start', np.arange(0, nf * 3, 3, dtype=np.int32)); me.polygons.foreach_set('loop_total', np.full(nf, 3, np.int32))
    me.update(calc_edges=True)
    if uv is not None: me.uv_layers.new(name='UVMap').data.foreach_set('uv', uv[I].astype(np.float32).ravel())
    if col is not None: me.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT').data.foreach_set('color', np.c_[col, np.ones(nv)].astype(np.float32).ravel())
    if bake_col is not None: me.color_attributes.new('BakeCol', 'FLOAT_COLOR', 'POINT').data.foreach_set('color', np.c_[bake_col, np.ones(nv)].astype(np.float32).ravel())
    if mat is not None: me.attributes.new('_matid', 'FLOAT', 'POINT').data.foreach_set('value', mat.astype(np.float32))
    if nrm is not None: me.normals_split_custom_set_from_vertices(bl(nrm).astype(np.float32))
    if validate: me.validate(verbose=False)   # props skip it: their per-vertex output must keep the engine's vertex order
    ob = bpy.data.objects.new(name, me); SC.collection.objects.link(ob); return ob


def diffuse_mat(name, attr):
    m = bpy.data.materials.new(name); nt = m.node_tree; b = nt.nodes['Principled BSDF']
    a = nt.nodes.new('ShaderNodeAttribute'); a.attribute_name = attr; nt.links.new(a.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = 1.0; b.inputs['Specular IOR Level'].default_value = 0.2
    return m


ALB = library_albedo()
S = D['solid']; P = arr(S['pos'], np.float32, 3); N = arr(S['nrm'], np.float32, 3); C = arr(S['col'], np.float32, 3)
UV = arr(S['uv'], np.float32, 2); MID = arr(S['mat'], np.float32); IDX = arr(S['idx'], np.uint32)
fac = np.stack([ALB.get(int(round(m)), np.ones(3)) for m in MID])
room = make_mesh(KEY, P, IDX, col=C, uv=UV, mat=MID, nrm=N, bake_col=np.clip(C * fac, 0, 0.95))
room.data.materials.append(diffuse_mat('room', 'BakeCol'))
log('room mesh', len(P), 'verts', len(IDX) // 3, 'tris')
props = None
if D.get('props'):   # placed props: shadow casters and bounce surfaces for every bake, then baked per vertex (bake_props)
    PP = D['props']; PPm = arr(PP['mat'], np.float32); PPc = arr(PP['col'], np.float32, 3)
    pfac = np.stack([ALB.get(int(round(m)), np.ones(3)) for m in PPm])
    # triangles that repeat a vertex (lathe axes, sphere poles) are invalid polygons in Blender and crash it when the mesh is not validated:
    # drop them (zero area, never visible); the vertices stay, so the per-vertex output keeps the engine's vertex order
    PI_ = arr(PP['idx'], np.uint32).reshape(-1, 3); PI_ = PI_[(PI_[:, 0] != PI_[:, 1]) & (PI_[:, 1] != PI_[:, 2]) & (PI_[:, 0] != PI_[:, 2])].ravel()
    props = make_mesh('props', arr(PP['pos'], np.float32, 3), PI_, col=PPc, nrm=arr(PP['nrm'], np.float32, 3), bake_col=np.clip(PPc * pfac, 0, 0.95), validate=False)
    assert len(props.data.vertices) == PP['count'], 'props vertex count changed in Blender'
    props.data.materials.append(diffuse_mat('props', 'BakeCol')); log('props', len(props.data.vertices), 'verts', len(props.data.polygons), 'tris')
if D.get('occ'):
    O = D['occ']; occ = make_mesh('occluders', arr(O['pos'], np.float32, 3), arr(O['idx'], np.uint32), col=arr(O['col'], np.float32, 3))
    occ.data.materials.append(diffuse_mat('occ', 'Col')); log('occluders', len(occ.data.polygons), 'tris')
screen = None
if D.get('screen'):
    SP = arr(D['screen']['pos'], np.float32, 3); SI = arr(D['screen']['idx'], np.uint32)
    screen = make_mesh('screen', SP, SI); em = bpy.data.materials.new('screen'); nt = em.node_tree; nt.nodes.remove(nt.nodes['Principled BSDF'])
    e = nt.nodes.new('ShaderNodeEmission'); e.inputs['Strength'].default_value = 1.0; nt.links.new(e.outputs[0], nt.nodes['Material Output'].inputs['Surface'])
    screen.data.materials.append(em)

# ---------------------------------------------------------------- lights (bake.js STRIDE 14: x y z r g b range ch dx dy dz cosIn cosOut type)
L = arr(D['lights']['L'], np.float32, 14) if D['lights']['L'] else np.zeros((0, 14))
groups = {0: bpy.data.collections.new('house'), 1: bpy.data.collections.new('fixed')}
for c in groups.values(): SC.collection.children.link(c)
FOUR_PI2, PI2 = 4 * math.pi ** 2, math.pi ** 2
nl = 0


def face(lo, n_b, along_b):
    """Point an area light (it emits along its local -Z) along n_b, with its local X along along_b (Blender coordinates)."""
    z = -np.asarray(n_b, float); z /= max(np.linalg.norm(z), 1e-9)
    x = np.asarray(along_b, float) - z * np.dot(along_b, z)
    if np.linalg.norm(x) < 1e-6: x = np.cross(z, [0, 0, 1] if abs(z[2]) < 0.9 else [1, 0, 0])
    x /= np.linalg.norm(x); y = np.cross(z, x)
    lo.rotation_mode = 'QUATERNION'; lo.rotation_quaternion = Matrix((x, y, z)).transposed().to_quaternion()


# line and rectangle emitters become real area lights (a continuous LED strip, a lit panel) instead of their engine samples:
# sampled as small disks they printed a row of hot dots on the ceiling above a cove (gallery, first bake)
skip = set()
for sh in D['lights'].get('shapes', []):
    if not sh.get('dir'): continue                                 # omni line: keep its point samples
    c = np.array(sh['c'], float); m = float(c.max()); I = float(sh['I']) * m
    if I <= 1e-6 or m <= 0: continue
    skip.update(range(sh['i0'], sh['i0'] + sh['n']))
    ld = bpy.data.lights.new('l', 'AREA'); ld.shape = 'RECTANGLE'; ld.energy = PI2 * I; ld.color = tuple(c / m); ld.cycles.max_bounces = 6
    lo = bpy.data.objects.new('l', ld); groups[int(sh['ch'])].objects.link(lo)
    n_b = bl(np.array([sh['dir']], float))[0]
    if sh['kind'] == 'line':
        a, b = bl(np.array([sh['a']], float))[0], bl(np.array([sh['b']], float))[0]
        lo.location = Vector((a + b) / 2); ld.size = max(0.02, float(np.linalg.norm(b - a))); ld.size_y = 0.03; face(lo, n_b, b - a)
    else:
        u, v = bl(np.array([sh['u']], float))[0], bl(np.array([sh['v']], float))[0]
        lo.location = Vector(bl(np.array([sh['c0']], float))[0]); ld.size = max(0.02, 2 * float(np.linalg.norm(u))); ld.size_y = max(0.02, 2 * float(np.linalg.norm(v))); face(lo, n_b, u)
    nl += 1
for li, r in enumerate(L):
    if li in skip: continue
    x, y, z, cr, cg, cb, rng, ch, dx, dy, dz, ci, co, typ = [float(v) for v in r]
    I = max(cr, cg, cb)
    if I <= 1e-6: continue
    pos = bl(np.array([[x, y, z]]))[0]; d = bl(np.array([[dx, dy, dz]]))[0]
    if typ == 0: ld = bpy.data.lights.new('l', 'POINT'); ld.energy = FOUR_PI2 * I; ld.shadow_soft_size = 0.04
    elif typ == 1:
        ld = bpy.data.lights.new('l', 'SPOT'); ld.energy = FOUR_PI2 * I; ld.shadow_soft_size = 0.04
        ao, ai = math.acos(max(-1, min(1, co))), math.acos(max(-1, min(1, ci))); ld.spot_size = min(math.pi, 2 * ao); ld.spot_blend = max(0.0, min(1.0, 1 - ai / max(ao, 1e-3)))
    else: ld = bpy.data.lights.new('l', 'AREA'); ld.shape = 'DISK'; ld.size = 0.12; ld.energy = PI2 * I
    ld.color = (cr / I, cg / I, cb / I); ld.cycles.max_bounces = 6
    lo = bpy.data.objects.new('l', ld); groups[1 if ch > 0.5 else 0].objects.link(lo); lo.location = Vector(pos)
    if typ != 0 and np.linalg.norm(d) > 1e-6: lo.rotation_mode = 'QUATERNION'; lo.rotation_quaternion = Vector((0, 0, -1)).rotation_difference(Vector(d / np.linalg.norm(d)))
    nl += 1
log('lights', nl, '(house', len(groups[0].objects), 'fixed', len(groups[1].objects), ')')

# ---------------------------------------------------------------- light-map UVs: smart project, equal texel density, packed
area = sum(p.area for p in room.data.polygons)
res = int(min(A.maxres, max(A.minres, 2 ** math.ceil(math.log2(max(1.0, math.sqrt(area * 1.6) * A.density))))))
log(f'surface {area:.0f} m2 -> light map {res} px ({res / math.sqrt(area * 1.6):.1f} texels/m)')
bpy.context.view_layer.objects.active = room; room.select_set(True)
uv2 = room.data.uv_layers.new(name='BakeUV'); room.data.uv_layers.active = uv2
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.0, area_weight=0.0, correct_aspect=True, scale_to_bounds=False)
bpy.ops.uv.average_islands_scale()
bpy.ops.uv.pack_islands(rotate=True, margin=4.0 / res)
bpy.ops.object.mode_set(mode='OBJECT')
log('unwrapped')

# ---------------------------------------------------------------- bakes
room_mat = room.data.materials[0]; nt = room_mat.node_tree
tex = nt.nodes.new('ShaderNodeTexImage'); uvn = nt.nodes.new('ShaderNodeUVMap'); uvn.uv_map = 'BakeUV'; nt.links.new(uvn.outputs['UV'], tex.inputs['Vector']); nt.nodes.active = tex
SC.render.bake.margin = 6; SC.render.bake.margin_type = 'EXTEND'; SC.render.bake.use_clear = True


def bake(kind, show_house, show_fixed, show_screen, **kw):
    img = bpy.data.images.new(f'{KEY}_{kind}', res, res, float_buffer=True, alpha=True); img.generated_color = (0, 0, 0, 0); tex.image = img
    groups[0].hide_render = not show_house; groups[1].hide_render = not show_fixed
    if screen: screen.hide_render = not show_screen
    for o in SC.objects: o.select_set(False)
    room.select_set(True); bpy.context.view_layer.objects.active = room
    t = time.time(); bpy.ops.object.bake(**kw)
    px = np.array(img.pixels[:], dtype=np.float32).reshape(res, res, 4)
    log(f'baked {kind} in {time.time() - t:.1f}s'); return px


DIFF = dict(type='DIFFUSE', pass_filter={'DIRECT', 'INDIRECT'})
H = bake('house', True, False, False, **DIFF)
F = bake('fixed', False, True, False, **DIFF)
Sbk = bake('screen', False, False, True, **DIFF) if screen else None
SC.cycles.samples = 32
AO = bake('ao', False, False, False, type='AO')
NRM = bake('normal', False, False, False, type='NORMAL', normal_space='OBJECT')
mask = H[..., 3] > 0.5


# ---------------------------------------------------------------- ambient fill (engine L.ambient: hemisphere up/down per channel), times AO
def amb(ch):
    a = D['lights']['amb'][ch]; up, down = np.array(a['up']), np.array(a['down'])
    n_up = NRM[..., 2] * 2 - 1                                   # Blender object space Z = engine up
    t = (n_up * 0.5 + 0.5)[..., None]
    return (down + (up - down) * t) * AO[..., :1] * 0.6         # 0.6: real bounce now does part of the old ambient's job


def clean(img):
    """3x3 median then a 3x3 Gaussian, using only texels inside islands (fireflies, Monte-Carlo noise)."""
    out = img.copy(); m = mask.astype(np.float32)
    stack = [np.roll(np.roll(img, dy, 0), dx, 1) for dy in (-1, 0, 1) for dx in (-1, 0, 1)]
    ms = [np.roll(np.roll(m, dy, 0), dx, 1) for dy in (-1, 0, 1) for dx in (-1, 0, 1)]
    S_ = np.stack(stack, 0); M_ = np.stack(ms, 0)[..., None]
    S_ = np.where(M_ > 0, S_, np.nan); med = np.nanmedian(S_, 0); med = np.where(np.isnan(med), img, med)
    g = np.array([1, 2, 1, 2, 4, 2, 1, 2, 1], np.float32)[:, None, None, None]
    st = np.stack([np.roll(np.roll(med, dy, 0), dx, 1) for dy in (-1, 0, 1) for dx in (-1, 0, 1)], 0)
    w = g * M_; out = (st * w).sum(0) / np.maximum(w.sum(0), 1e-6)
    return np.where(mask[..., None], out, img)


def srgb_enc(x):
    return np.where(x <= 0.0031308, x * 12.92, 1.055 * np.power(np.maximum(x, 1e-9), 1 / 2.4) - 0.055)


def save_png(name, rgb, half=False):
    """RGB PNG through Blender: rgb / scale, sRGB-encoded (the game decodes it in hardware). No alpha channel: browsers may premultiply
    it on decode, which would wipe the colour wherever alpha is low. half: store at half resolution (smooth layers such as the screen)."""
    s = float(np.percentile(rgb[mask].max(-1), 99.7)) if mask.any() else 1.0; s = max(s, 1e-4)
    enc = np.clip(srgb_enc(np.clip(rgb / s, 0, 1)), 0, 1); n = res
    if half:   # 2x2 box filter of the island texels only (keeps island edges from bleeding black)
        w = mask.astype(np.float32)[..., None]; n = res // 2
        num = (enc * w).reshape(n, 2, n, 2, 3).sum((1, 3)); den = w.reshape(n, 2, n, 2, 1).sum((1, 3))
        enc = np.where(den > 0, num / np.maximum(den, 1e-6), enc.reshape(n, 2, n, 2, 3).mean((1, 3)))
    im = bpy.data.images.new(name, n, n, alpha=False); im.colorspace_settings.name = 'Non-Color'
    im.pixels.foreach_set(np.dstack([enc, np.ones((n, n))]).astype(np.float32).ravel())
    im.filepath_raw = os.path.join(A.out, name); im.file_format = 'PNG'; im.save()
    return s


os.makedirs(A.out, exist_ok=True)
house = clean(H[..., :3]) + amb('h'); fixed = clean(F[..., :3]) + amb('f')
meta = {'room': KEY, 'res': res, 'hall': HALL, 'hash': S.get('hash', '')}
if HALL:
    scr = clean(Sbk[..., :3]).mean(-1) if Sbk is not None else np.zeros((res, res))
    sh = save_png(f'{KEY}_h.png', house); sf = save_png(f'{KEY}_f.png', fixed); ss = save_png(f'{KEY}_s.png', np.repeat(scr[..., None], 3, -1), half=True)
    meta.update(maps=[f'{KEY}_h.png', f'{KEY}_f.png', f'{KEY}_s.png'], scale=[sh, sf, ss])
else:
    sh = save_png(f'{KEY}_h.png', house + fixed); meta.update(maps=[f'{KEY}_h.png'], scale=[sh, 0.0, 0.0])
LUM = np.array([0.3, 0.55, 0.15], np.float32)
meta['avg'] = float(((house + fixed)[mask] @ LUM).mean()) if mask.any() else 0.0   # the room's typical light level (reflection scale)
log('light maps written', meta['scale'])


# ---------------------------------------------------------------- light probes for instanced seats and arms (halls)
def bake_probes(PR):
    """Each probe = two 4 cm quads: A faces nA (house and fixed light on the seat), B faces nB, 3 cm toward the screen (its light).
    Every quad owns a 4x4 texel cell of a small float image and is mapped to the cell's inner 2x2 texels; the bake's value there is the
    irradiance in the light maps' units (E / pi). The engine's ambient fill is added for the quad's normal, as for the light maps."""
    P = arr(PR['pts'], np.float32, 9); n = len(P); nq = 2 * n; G = int(math.ceil(math.sqrt(nq))); C = 4; R = G * C
    verts, faces, uvs = [], [], []
    for i in range(n):
        p = bl(P[i:i + 1, 0:3])[0]
        for q in range(2):
            nn = bl(P[i:i + 1, 3 + 3 * q:6 + 3 * q])[0]; nn = nn / max(np.linalg.norm(nn), 1e-9); c = p + (0.03 * nn if q else 0)
            t1 = np.cross(nn, [0, 0, 1] if abs(nn[2]) < 0.9 else [1, 0, 0]); t1 /= np.linalg.norm(t1); t2 = np.cross(nn, t1)
            k = 2 * i + q; gx, gy = k % G, k // G; b = len(verts)
            verts += [c - 0.02 * t1 - 0.02 * t2, c + 0.02 * t1 - 0.02 * t2, c + 0.02 * t1 + 0.02 * t2, c - 0.02 * t1 + 0.02 * t2]
            faces.append((b, b + 1, b + 2, b + 3)) if np.dot(np.cross(t1, t2), nn) > 0 else faces.append((b, b + 3, b + 2, b + 1))
            u0, u1, v0, v1 = (gx * C + 1) / R, (gx * C + 3) / R, (gy * C + 1) / R, (gy * C + 3) / R
            uvs.append({b: (u0, v0), b + 1: (u1, v0), b + 2: (u1, v1), b + 3: (u0, v1)})
    me = bpy.data.meshes.new('probes'); me.from_pydata([tuple(v) for v in verts], [], faces); me.update()
    lay = me.uv_layers.new(name='UVMap'); fi = 0
    for poly in me.polygons:
        m = uvs[fi]; fi += 1
        for li in poly.loop_indices: lay.data[li].uv = m[me.loops[li].vertex_index]
    ob = bpy.data.objects.new('probes', me); SC.collection.objects.link(ob)
    pm = bpy.data.materials.new('probe'); tn = pm.node_tree.nodes.new('ShaderNodeTexImage'); pm.node_tree.nodes.active = tn; me.materials.append(pm)
    out = {}
    for kind, sh, sf, ss in (('house', True, False, False), ('fixed', False, True, False), ('screen', False, False, True)):
        if kind == 'screen' and not screen: out[kind] = np.zeros((R, R, 4), np.float32); continue
        img = bpy.data.images.new(f'probe_{kind}', R, R, float_buffer=True, alpha=True); tn.image = img
        groups[0].hide_render = not sh; groups[1].hide_render = not sf
        if screen: screen.hide_render = not ss
        for o in SC.objects: o.select_set(False)
        ob.select_set(True); bpy.context.view_layer.objects.active = ob
        SC.render.bake.margin = 1; SC.cycles.samples = 256
        bpy.ops.object.bake(type='DIFFUSE', pass_filter={'DIRECT', 'INDIRECT'})
        out[kind] = np.array(img.pixels[:], dtype=np.float32).reshape(R, R, 4)
    vals = np.zeros((n, 7), np.float32)
    for k in range(nq):
        i, q = k // 2, k % 2; gx, gy = k % G, k // G
        cell = {key: v[gy * C + 1:gy * C + 3, gx * C + 1:gx * C + 3, :3].reshape(-1, 3).mean(0) for key, v in out.items()}
        if q == 0:
            nz = float(bl(P[i:i + 1, 3:6])[0][2] / max(np.linalg.norm(P[i, 3:6]), 1e-9)); t = nz * 0.5 + 0.5
            for ch, off in (('h', 0), ('f', 3)):
                a = D['lights']['amb'][ch]; up, down = np.array(a['up']), np.array(a['down'])
                vals[i, off:off + 3] = cell['house' if ch == 'h' else 'fixed'] + (down + (up - down) * t) * 0.6
        else: vals[i, 6] = float(cell['screen'].mean())
    ob.hide_render = True
    return vals


def bake_props():
    """Per-vertex light of the props (Cycles bake to a point colour attribute): house, fixed, screen and AO; the engine's ambient fill is
    added with the vertex normal and AO, like the light maps. Returns uint8 n x 7 (sRGB curve) and the three layer scales."""
    me = props.data; n = len(me.vertices); out = {}
    att = me.color_attributes.new('bake', 'FLOAT_COLOR', 'POINT'); me.color_attributes.active_color = att
    for kind, sh, sf, ss, ty in (('house', True, False, False, 'DIFFUSE'), ('fixed', False, True, False, 'DIFFUSE'), ('screen', False, False, True, 'DIFFUSE'), ('ao', False, False, False, 'AO')):
        if kind == 'screen' and not screen: out[kind] = np.zeros((n, 3), np.float32); continue
        groups[0].hide_render = not sh; groups[1].hide_render = not sf
        if screen: screen.hide_render = not ss
        for o in SC.objects: o.select_set(False)
        props.select_set(True); bpy.context.view_layer.objects.active = props
        SC.cycles.samples = 64 if ty == 'DIFFUSE' else 32; t = time.time()
        kw = dict(type=ty, target='VERTEX_COLORS'); kw.update(pass_filter={'DIRECT', 'INDIRECT'}) if ty == 'DIFFUSE' else None
        bpy.ops.object.bake(**kw)
        buf = np.zeros(n * 4, np.float32); att.data.foreach_get('color', buf); out[kind] = buf.reshape(n, 4)[:, :3].copy()
        log(f'baked props {kind} in {time.time() - t:.1f}s')
    PN = arr(D['props']['nrm'], np.float32, 3); t = (PN[:, 1] / np.maximum(np.linalg.norm(PN, axis=1), 1e-9) * 0.5 + 0.5)[:, None]; ao = out['ao'][:, :1]
    lay = []
    for kind, ch in (('house', 'h'), ('fixed', 'f')):
        a = D['lights']['amb'][ch]; up, down = np.array(a['up']), np.array(a['down'])
        lay.append(out[kind] + (down + (up - down) * t) * ao * 0.6)
    lay.append(out['screen'].mean(1, keepdims=True))
    enc, scales = [], []
    for L_ in lay:
        sc = max(float(np.percentile(L_.max(1), 99.7)), 1e-4); scales.append(sc); enc.append(np.round(np.clip(srgb_enc(np.clip(L_ / sc, 0, 1)), 0, 1) * 255).astype(np.uint8))
    return np.concatenate(enc, 1), scales


if props is not None:
    t = time.time(); PVB, psc = bake_props(); pvf = f'{KEY}_pv.bin'; PVB.tofile(os.path.join(A.out, pvf))
    meta['pv'] = {'file': pvf, 'scale': psc, 'hash': D['props']['hash']}; log(f'props light written ({len(PVB)} verts, {time.time() - t:.1f}s)')

if D.get('probes'):
    t = time.time(); PV = bake_probes(D['probes']); ns = D['probes']['nSeat']
    pf = f'{KEY}_probes.json'; json.dump({'seat': [round(float(x), 5) for x in PV[:ns].ravel()], 'arm': [round(float(x), 5) for x in PV[ns:].ravel()]}, open(os.path.join(A.out, pf), 'w'))
    meta['probes'] = pf; log(f'baked {len(PV)} probes in {time.time() - t:.1f}s; seat house mean {PV[:ns, 0:3].mean():.3f} screen mean {PV[:ns, 6].mean():.3f}')

# ---------------------------------------------------------------- export the room with its light-map UVs (TEXCOORD_1)
me = room.data
if 'BakeCol' in me.color_attributes: me.color_attributes.remove(me.color_attributes['BakeCol'])
me.color_attributes.active_color = me.color_attributes['Col']
me.uv_layers.active = me.uv_layers['UVMap']
for o in SC.objects: o.select_set(o == room)
glb = os.path.join(A.out, f'{KEY}.glb')
bpy.ops.export_scene.gltf(filepath=glb, export_format='GLB', use_selection=True, export_attributes=True, export_vertex_color='ACTIVE', export_normals=True, export_texcoords=True,
                          export_materials='NONE', export_yup=True, export_apply=False, export_extras=False, export_cameras=False, export_lights=False)
meta['glb'] = f'{KEY}.glb'; meta['verts'] = len(me.vertices); meta['tris'] = len(me.polygons)
json.dump(meta, open(os.path.join(A.out, f'{KEY}.json'), 'w'), indent=1)
ip = os.path.join(A.out, 'index.json')   # the game reads only the index: one entry per baked room
idx = json.load(open(ip)) if os.path.exists(ip) else {'rooms': {}}
idx['rooms'][KEY] = {k: meta[k] for k in ('glb', 'maps', 'scale', 'hall', 'avg', 'hash', 'res', 'probes', 'pv') if k in meta}
json.dump(idx, open(ip, 'w'), indent=1, sort_keys=True)
if A.blend: bpy.ops.wm.save_as_mainfile(filepath=A.blend, compress=True)
log('done', json.dumps(meta))
print('BAKE_DONE', json.dumps(meta))
