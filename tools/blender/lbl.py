"""LUMIERE Blender helpers shared by tools/blender/*.py (headless, Blender 5.x): library-named materials, evenly tessellated rounded
boxes with an upholstery crown, closed lathes, tubes along paths, metre box-projection UVs, and part() which turns one bmesh into one
named object (<Part>_LOD<n>) with one material. Frame: Blender +X = the asset's front (glTF +X, Kiln convention), +Z up, +Y left.
"""
import bpy, bmesh, math, os
from mathutils import Vector, Matrix

# ------------------------------------------------------------------ materials (library keys; preview colours only)
MAT_DEF = {
    'leather_caramel': ((0.26, 0.10, 0.035), 0.45, 0.0), 'leather_oxblood': ((0.075, 0.008, 0.01), 0.45, 0.0),
    'leather_black': ((0.012, 0.011, 0.011), 0.42, 0.0), 'velvet_teal': ((0.012, 0.10, 0.09), 0.9, 0.0),
    'velvet_charcoal': ((0.026, 0.028, 0.035), 0.9, 0.0), 'walnut': ((0.15, 0.06, 0.03), 0.42, 0.0),
    'walnut_dark': ((0.05, 0.02, 0.01), 0.42, 0.0), 'brass': ((0.58, 0.36, 0.12), 0.28, 1.0), 'chrome': ((0.8, 0.8, 0.8), 0.08, 1.0),
    'blackmetal': ((0.012, 0.012, 0.014), 0.5, 0.6), 'charcoal': ((0.019, 0.019, 0.024), 0.5, 0.6),
    'plastic_black': ((0.009, 0.009, 0.01), 0.35, 0.0), 'rubber': ((0.01, 0.01, 0.01), 0.9, 0.0),
    'fabric_black': ((0.007, 0.007, 0.008), 0.95, 0.0), 'paint_black': ((0.006, 0.006, 0.007), 0.7, 0.0), 'lacquer_black': ((0.007, 0.007, 0.008), 0.16, 0.0),
    'glass': ((0.02, 0.025, 0.03), 0.04, 0.0), 'paint_cream': ((0.8, 0.74, 0.63), 0.75, 0.0),
}
GLOW_DEF = {'glow_warm': ((1.0, 0.55, 0.24), 2.2), 'glow_blue': ((0.12, 0.42, 1.0), 3.0), 'glow_opal': ((1.0, 0.72, 0.45), 1.6), 'glow_white': ((1.0, 0.86, 0.68), 3.0)}


def material(name):
    m = bpy.data.materials.get(name)
    if m: return m
    m = bpy.data.materials.new(name)
    if m.node_tree is None: m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    if name in GLOW_DEF:
        c, s = GLOW_DEF[name]; b.inputs['Base Color'].default_value = (*c, 1); b.inputs['Emission Color'].default_value = (*c, 1); b.inputs['Emission Strength'].default_value = s
    else:
        c, r, mt = MAT_DEF[name]; b.inputs['Base Color'].default_value = (*c, 1); b.inputs['Roughness'].default_value = r; b.inputs['Metallic'].default_value = mt
    return m


# ------------------------------------------------------------------ geometry builders (bmesh, then one object per part)
def axis_coords(h, r, n_in, m):
    """1D vertex coordinates across a rounded box of half-extent h and corner radius r: m rounding steps per 45 degrees, n_in interior spans."""
    r = min(r, h * 0.999); a = h - r
    edge = [a + r * math.tan(math.radians(45.0 * k / m)) for k in range(1, m + 1)]
    inner = [-a + 2 * a * i / n_in for i in range(n_in + 1)] if a > 1e-6 else [0.0]
    return [-e for e in reversed(edge)] + inner + edge


def rounded_box(bm, size, r, n_in=(2, 2, 2), m=2, crown=None):
    """Closed rounded box centred at the origin, evenly tessellated round its edges. crown: (axis, amount) bulges that face outward
    (an upholstered cushion), fading to nothing at the opposite face."""
    hx, hy, hz = size[0] / 2, size[1] / 2, size[2] / 2
    C = [axis_coords(hx, r, n_in[0], m), axis_coords(hy, r, n_in[1], m), axis_coords(hz, r, n_in[2], m)]
    H = (hx, hy, hz); inner = [h - min(r, h * 0.999) for h in H]
    vmap = {}

    def vert(p):
        key = tuple(round(c, 6) for c in p)
        v = vmap.get(key)
        if v is None:
            q = [max(-inner[i], min(inner[i], p[i])) for i in range(3)]
            d = Vector((p[0] - q[0], p[1] - q[1], p[2] - q[2]))
            co = Vector(q) + (d.normalized() * min(r, min(H) * 0.999) if d.length > 1e-9 else Vector((0, 0, 0)))
            v = vmap[key] = bm.verts.new(co)
        return v

    faces = []
    for ax in range(3):
        u, w = [(1, 2), (2, 0), (0, 1)][ax]
        for s in (-1, 1):
            cu, cw = C[u], C[w]
            for i in range(len(cu) - 1):
                for j in range(len(cw) - 1):
                    quad = []
                    for (a, b) in ((i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1)):
                        p = [0.0, 0.0, 0.0]; p[ax] = s * H[ax]; p[u] = cu[a]; p[w] = cw[b]; quad.append(vert(p))
                    if s < 0: quad.reverse()
                    faces.append(bm.faces.new(quad))
    if crown:
        ax, amt = crown; sgn = 1 if amt > 0 else -1; amt = abs(amt)
        o = [i for i in range(3) if i != ax]
        for v in set(vmap.values()):
            t = (v.co[ax] * sgn + H[ax]) / (2 * H[ax])
            f = max(0.0, 1 - (v.co[o[0]] / H[o[0]]) ** 2) * max(0.0, 1 - (v.co[o[1]] / H[o[1]]) ** 2)
            v.co[ax] += sgn * amt * f * t * t
    return faces


def lathe(bm, profile, seg=24):
    """Closed solid of revolution about +Z: profile = a closed loop of (radius, z) points (the last joins the first), so the result
    is a manifold whose normals recalc_face_normals can point outward (open strips can end up facing inward and vanish)."""
    rings = []
    for (rad, z) in profile:
        rings.append([bm.verts.new((rad * math.cos(2 * math.pi * k / seg), rad * math.sin(2 * math.pi * k / seg), z)) for k in range(seg)])
    for i in range(len(rings)):
        a, b = rings[i], rings[(i + 1) % len(rings)]
        for k in range(seg):
            k2 = (k + 1) % seg
            if a[k] is b[k]: continue
            bm.faces.new((a[k], a[k2], b[k2], b[k]))


def disc(bm, rad, z0, z1, seg=20):
    """Closed cylinder (a cup well's dark bottom, a plate)."""
    lathe(bm, [(1e-4, z0), (rad, z0), (rad, z1), (1e-4, z1)], seg)


def tube(bm, pts, radius, sides=6, closed=True):
    """Round tube along a polyline (piping / welt cord)."""
    n = len(pts); rings = []
    for i, p in enumerate(pts):
        a = pts[(i - 1) % n] if closed or i > 0 else p; b = pts[(i + 1) % n] if closed or i < n - 1 else p
        t = (Vector(b) - Vector(a)).normalized(); up = Vector((0, 0, 1)) if abs(t.z) < 0.9 else Vector((1, 0, 0))
        x = t.cross(up).normalized(); y = t.cross(x).normalized()
        rings.append([bm.verts.new(Vector(p) + (x * math.cos(2 * math.pi * k / sides) + y * math.sin(2 * math.pi * k / sides)) * radius) for k in range(sides)])
    for i in range(n if closed else n - 1):
        a, b = rings[i], rings[(i + 1) % n]
        for k in range(sides):
            k2 = (k + 1) % sides; bm.faces.new((a[k], a[k2], b[k2], b[k]))


def rrect_path(hx, hy, rc, z, steps=4):
    """Closed rounded rectangle in the XY plane at height z (counter-clockwise)."""
    pts = []
    for cx, cy, a0 in ((hx - rc, hy - rc, 0), (-hx + rc, hy - rc, 90), (-hx + rc, -hy + rc, 180), (hx - rc, -hy + rc, 270)):
        for k in range(steps + 1):
            a = math.radians(a0 + 90 * k / steps); pts.append((cx + rc * math.cos(a), cy + rc * math.sin(a), z))
    return pts


def box_uv(bm):
    """Box projection in metres: each face takes the two axes across its dominant normal axis (Kiln projectUV metersPerUnit 1)."""
    uv = bm.loops.layers.uv.verify()
    for f in bm.faces:
        n = f.normal; ax = max(range(3), key=lambda i: abs(n[i]))
        u, w = [(1, 2), (0, 2), (0, 1)][ax]
        for l in f.loops: l[uv].uv = (l.vert.co[u], l.vert.co[w])


def warp(bm, fn):
    for v in bm.verts: v.co = Vector(fn(Vector(v.co)))


PARTS = []   # objects built since the last reset (one asset)


def part(name, lod, mat, build, mtx=Matrix.Identity(4), deform=None, smooth=True):
    """One object: build(bm) adds geometry in local space; deform(co) bends it; mtx places it."""
    bm = bmesh.new(); build(bm)
    if deform: warp(bm, deform)
    bm.transform(mtx); bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces)); box_uv(bm)
    me = bpy.data.meshes.new(f'{name}_LOD{lod}'); bm.to_mesh(me); bm.free()
    if smooth: me.shade_smooth(); me.set_sharp_from_angle(angle=math.radians(50))
    else: me.shade_flat()
    me.materials.append(material(mat))
    ob = bpy.data.objects.new(f'{name}_LOD{lod}', me); bpy.context.scene.collection.objects.link(ob); PARTS.append(ob); return ob


T = lambda x, y, z: Matrix.Translation((x, y, z))
RY = lambda deg: Matrix.Rotation(math.radians(deg), 4, 'Y')   # +deg tips +Z toward +X; a back leaning BACK uses a negative angle
RZ = lambda deg: Matrix.Rotation(math.radians(deg), 4, 'Z')


def rb(size, r, n_in=(2, 2, 2), m=2, crown=None, at=None):
    """Rounded box builder; at = an offset applied inside the build, so a deform sees the parent frame (a back's lumbar curve)."""
    mm = 1 if min(size) < 0.08 else m   # thin parts (channels, bolsters, trims) round well enough with 2 steps a quarter: halves their triangles
    def build(bm):
        rounded_box(bm, size, r, n_in, mm, crown)
        if at: bm.transform(T(*at))
    return build


def cup_holder(lod, x, y, ztop, ring_mat, glow=None, r_out=0.043, name='Cup'):
    """Cup holder set into a surface whose top is at ztop: a raised ring (rolled lip) and a dark well disc inside it, 2 mm proud of
    the surface so the two never share a plane; glow = a thin light ring on the lip's inner edge."""
    ri = r_out - 0.008
    part(f'{name}Ring', lod, ring_mat, lambda bm: lathe(bm, [(ri, ztop - 0.006), (r_out + 0.002, ztop - 0.006), (r_out + 0.002, ztop + 0.002), (r_out - 0.001, ztop + 0.007), (ri + 0.002, ztop + 0.008), (ri, ztop + 0.005)], 28), T(x, y, 0))
    part(f'{name}Well', lod, 'plastic_black', lambda bm: disc(bm, ri + 0.0005, ztop - 0.004, ztop + 0.002, 24), T(x, y, 0))
    if glow: part(f'{name}Glow', lod, glow, lambda bm: lathe(bm, [(ri - 0.003, ztop + 0.0015), (ri + 0.0005, ztop + 0.0015), (ri + 0.0005, ztop + 0.0035), (ri - 0.003, ztop + 0.0035)], 28), T(x, y, 0), smooth=False)



def export(name, out_dir):
    for o in bpy.context.scene.objects: o.select_set(o in PARTS)
    path = os.path.abspath(os.path.join(out_dir, name + '.glb'))
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_yup=True, export_apply=True, export_texcoords=True, export_normals=True,
                              export_materials='EXPORT', export_vertex_color='NONE', export_extras=False, export_cameras=False, export_lights=False)
    def ntri(o): o.data.calc_loop_triangles(); return len(o.data.loop_triangles)
    tris = {lod: sum(ntri(o) for o in PARTS if o.name.endswith(f'LOD{lod}')) for lod in (0, 1)}
    lo = [min(v.co[i] for o in PARTS if o.name.endswith('LOD0') for v in o.data.vertices) for i in range(3)]
    hi = [max(v.co[i] for o in PARTS if o.name.endswith('LOD0') for v in o.data.vertices) for i in range(3)]
    return {'asset': name, 'glb': path, 'bytes': os.path.getsize(path), 'tris': tris, 'parts': len(PARTS), 'bbox_blender': [lo, hi]}


