#!/usr/bin/env python3
"""LUMIERE material library textures: every map is generated here, tileable, no image inputs.

Run (Termux works: pkg install python python-numpy && pip install pillow):
    python3 tools/textures/gen.py            # writes www/tex/<name>_a.jpg (albedo) and <name>_n.jpg (normal)
    python3 tools/textures/gen.py --sheet out.jpg   # also a contact sheet for review

Albedo modes (see www/js/library.js): 'rel' maps are detail around mid-grey that the engine multiplies by a tint
(so one walnut map serves light and dark walnut), 'abs' maps carry their own colours (parquet, tile, carpet, marble).
Roughness is a per-material scalar in library.js modulated by albedo detail; metalness is a scalar. AO comes from the bake.
"""
import sys, os
import numpy as np
from PIL import Image, ImageFile
ImageFile.MAXBLOCK = 1 << 24

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'www', 'tex')
RNG = np.random.default_rng(1928)


def fnoise(n, lo, hi, seed, aniso=(1.0, 1.0)):
    """Tileable band-limited noise in [0,1]: white noise filtered in frequency space between lo and hi cycles per tile."""
    r = np.random.default_rng(seed)
    w = r.standard_normal((n, n))
    f = np.fft.fftfreq(n) * n
    fx, fy = np.meshgrid(f * aniso[0], f * aniso[1])
    rad = np.sqrt(fx * fx + fy * fy)
    filt = np.where((rad >= lo) & (rad <= hi), 1.0, 0.0) / np.maximum(rad, 1.0) ** 0.6
    out = np.real(np.fft.ifft2(np.fft.fft2(w) * filt))
    out -= out.min(); out /= max(out.max(), 1e-9)
    return out


def fbm(n, base, octaves, seed, aniso=(1.0, 1.0), gain=0.5):
    acc = np.zeros((n, n)); amp = 1.0; tot = 0.0
    for o in range(octaves):
        f = base * 2 ** o
        acc += amp * fnoise(n, f * 0.7, f * 1.4, seed + o * 31, aniso); tot += amp; amp *= gain
    return acc / tot


def grid(n):
    y, x = np.mgrid[0:n, 0:n].astype(np.float64) / n
    return x, y


def normal_from_height(h, strength):
    """Tangent-space normal map (OpenGL +Y up in texture space = towards +v) from a tileable height field."""
    dx = (np.roll(h, -1, axis=1) - np.roll(h, 1, axis=1)) * 0.5
    dy = (np.roll(h, -1, axis=0) - np.roll(h, 1, axis=0)) * 0.5
    n = h.shape[0]
    nx, ny, nz = -dx * strength * n / 64.0, dy * strength * n / 64.0, np.ones_like(h)
    l = np.sqrt(nx * nx + ny * ny + nz * nz)
    return np.stack([nx / l, ny / l, nz / l], -1) * 0.5 + 0.5


def save(name, alb, h, strength, nsize=None, q=88):
    os.makedirs(OUT, exist_ok=True)
    a = np.clip(alb, 0, 1)
    Image.fromarray((a * 255 + 0.5).astype(np.uint8), 'RGB').save(os.path.join(OUT, f'{name}_a.jpg'), quality=q, optimize=True, subsampling=0)
    nm = normal_from_height(h, strength)
    im = Image.fromarray((nm * 255 + 0.5).astype(np.uint8), 'RGB')
    if nsize and nsize != im.size[0]: im = im.resize((nsize, nsize), Image.LANCZOS)
    im.save(os.path.join(OUT, f'{name}_n.jpg'), quality=92, optimize=True, subsampling=0)
    return a


def rel(gray, spread=1.0):
    """Relative albedo: mean 0.5 grey, detail scaled by spread."""
    g = gray - gray.mean()
    g = 0.5 + g * spread
    return np.repeat(g[..., None], 3, -1)


def hexrgb(h):
    h = h.lstrip('#'); return np.array([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]) ** 2.2   # to linear for mixing


def to_srgb(lin):
    return np.clip(lin, 0, 1) ** (1 / 2.2)


# ---------------------------------------------------------------- materials
def velvet(n=512):
    pile = fnoise(n, 90, 250, 11)                         # fine pile
    crush = fbm(n, 3, 3, 12)                              # soft crushed patches
    g = 0.55 * crush + 0.25 * pile + 0.2 * fnoise(n, 20, 60, 13)
    return save('velvet', rel(g, 0.55), pile * 0.4 + crush * 0.6, 1.2, 256)


def leather(n=512):
    # pebble grain: cellular pattern from thresholded band noise + soft wrinkles
    cells = fnoise(n, 40, 70, 21)
    pebble = np.abs(cells - 0.5) * 2
    wr = fbm(n, 4, 3, 22)
    g = 0.6 * wr + 0.4 * (1 - pebble)
    return save('leather', rel(g, 0.18), (1 - pebble) * 0.5 + wr * 0.5, 1.0, 256)


def wood_grain(n, seed, rings=9.0, warp=0.22):
    """Flat-sawn grain running along V: a few warped growth rings, soft pores, long streaks."""
    x, y = grid(n)
    w = fbm(n, 1, 4, seed, aniso=(1.0, 6.0))              # slow warp: high frequencies along V are filtered out
    streak = fnoise(n, 30, 160, seed + 5, aniso=(1.0, 25.0))
    s = np.sin((x + (w - 0.5) * warp) * rings * 2 * np.pi)
    ring = 0.5 + 0.5 * s
    ring = ring ** 1.6
    return 0.45 * ring + 0.35 * streak + 0.2 * w


def walnut(n=512):
    g = wood_grain(n, 31)
    return save('walnut', rel(g, 0.7), g * 0.4, 1.0, 256)


def slats(n=512):
    # vertical wood slats: 8 per tile (tile = 0.4 m -> 5 cm pitch), 1 cm dark groove, own grain per slat
    x, y = grid(n)
    k = 8
    sx = (x * k) % 1.0
    idx = np.floor(x * k).astype(int)
    g = wood_grain(n, 41, rings=24)
    tone = np.array([RNG.uniform(-0.08, 0.08) for _ in range(k)])[idx]
    groove = np.clip(np.minimum(sx, 1 - sx) / 0.09, 0, 1)
    edge = np.clip(np.minimum(sx, 1 - sx) / 0.03, 0, 1)
    gg = (0.5 + (g - g.mean()) * 0.8 + tone) * (0.25 + 0.75 * groove)
    h = edge * 0.9 + g * 0.1
    return save('slats', rel(gg, 1.0), h, 6.0)


def chevron(n=1024):
    """Chevron oak parquet, 2 columns per tile, 6 planks per column period."""
    x, y = grid(n)
    N = 6
    U = x * 2.0 * N / np.sqrt(2)          # plank-width units, tile = 2 columns
    V = y * N * np.sqrt(2) / np.sqrt(2) * np.sqrt(2)   # = y*N*sqrt2
    cw = N / np.sqrt(2)                   # column width in plank units
    col = np.floor(U / cw).astype(int)
    u = U - col * cw
    um = np.where(col % 2 == 0, u, cw - u)
    t = (V - um) / np.sqrt(2)             # across-plank coordinate (plank width = 1)
    k = np.floor(t).astype(int)
    ft = t - k
    along = (V + um) / np.sqrt(2)
    # per plank tone
    key = (col % 2) * 997 + (k % (2 * N))
    tones = RNG.uniform(-1, 1, 4096)
    tone = tones[(key * 7 + col * 131) % 4096]
    grain = fbm(n, 6, 3, 51)
    rings = np.sin((ft * 3.0 + grain * 2.0 + tones[(key * 3) % 4096] * 5) * 2 * np.pi) * 0.5 + 0.5
    base = hexrgb('#9c6a3c'); dark = hexrgb('#5a371d'); light = hexrgb('#c08a52')
    m = np.clip(0.5 + tone * 0.35 + (rings - 0.5) * 0.25 + (grain - 0.5) * 0.3, 0, 1)[..., None]
    col_lin = dark * (1 - m) + light * m
    col_lin = col_lin * 0.8 + base * 0.2
    gap = np.clip(np.minimum(ft, 1 - ft) / 0.04, 0, 1)
    seam = np.clip(np.minimum(u, cw - u) / 0.05, 0, 1)
    edge = np.minimum(gap, seam)[..., None]
    col_lin = col_lin * (0.35 + 0.65 * edge)
    h = np.minimum(gap, seam) * 0.8 + rings * 0.1 + grain * 0.1
    return save('chevron', to_srgb(col_lin), h, 3.0, 512)


def geotile(n=1024):
    """Everyman-style geometric floor: 4x4 squares of 0.25 m split on a diagonal, black/cream/terracotta hourglass motif."""
    x, y = grid(n)
    k = 4
    X, Y = x * k, y * k
    i, j = np.floor(X).astype(int), np.floor(Y).astype(int)
    fx, fy = X - i, Y - j
    flip = (i + j) % 2 == 0
    upper = np.where(flip, fx > fy, fx + fy < 1)
    cream, black, terra, grey = hexrgb('#e8dfcf'), hexrgb('#1a1a1c'), hexrgb('#a4462c'), hexrgb('#8a8580')
    pat = [[0, 1, 2, 1], [1, 3, 1, 2], [2, 1, 0, 1], [1, 2, 1, 3]]
    cols = [cream, black, terra, grey]
    a = np.zeros((n, n), int); b = np.zeros((n, n), int)
    for jj in range(k):
        for ii in range(k):
            m = (i == ii) & (j == jj)
            a[m] = pat[jj][ii]; b[m] = (pat[jj][ii] + 1) % 4 if (ii + jj) % 2 else 1
    pick = np.where(upper, a, b)
    out = np.zeros((n, n, 3))
    for c in range(4): out[pick == c] = cols[c]
    var = fbm(n, 8, 3, 61)[..., None]
    out = out * (0.92 + 0.12 * var)
    d = np.minimum(np.minimum(fx, 1 - fx), np.minimum(fy, 1 - fy))
    dd = np.where(flip, np.abs(fx - fy), np.abs(fx + fy - 1)) / np.sqrt(2)
    grout = np.clip(np.minimum(d, dd) / 0.012, 0, 1)
    out = out * grout[..., None] + hexrgb('#6d6862') * (1 - grout[..., None])
    return save('geotile', to_srgb(out), grout * 0.8 + var[..., 0] * 0.05, 2.0, 512)


def terrazzo(n=512):
    base = hexrgb('#3b3836')
    out = np.ones((n, n, 3)) * base
    out *= (0.9 + 0.2 * fbm(n, 4, 3, 71))[..., None]
    chips = [('#d9d2c5', 900, 2, 7), ('#8a3a2a', 300, 2, 6), ('#b48a4a', 260, 2, 5), ('#e9e4da', 500, 1, 3), ('#1c1b1a', 400, 1, 4)]
    h = np.zeros((n, n))
    yy, xx = np.mgrid[0:n, 0:n]
    r = np.random.default_rng(72)
    for color, cnt, rmin, rmax in chips:
        c = hexrgb(color)
        for _ in range(cnt):
            cx, cy, rad = r.uniform(0, n), r.uniform(0, n), r.uniform(rmin, rmax)
            ang = r.uniform(0, np.pi); e = r.uniform(0.5, 1)
            x0, x1, y0, y1 = int(cx - rad - 1), int(cx + rad + 2), int(cy - rad - 1), int(cy + rad + 2)
            sl_y = np.arange(y0, y1) % n; sl_x = np.arange(x0, x1) % n
            gy, gx = np.meshgrid(np.arange(y0, y1) - cy, np.arange(x0, x1) - cx, indexing='ij')
            u = gx * np.cos(ang) + gy * np.sin(ang); v = (-gx * np.sin(ang) + gy * np.cos(ang)) / e
            m = (u * u + v * v) < rad * rad
            sub = out[np.ix_(sl_y, sl_x)]; sub[m] = c * r.uniform(0.85, 1.1); out[np.ix_(sl_y, sl_x)] = sub
            hs = h[np.ix_(sl_y, sl_x)]; hs[m] = 0.3; h[np.ix_(sl_y, sl_x)] = hs
    return save('terrazzo', to_srgb(out), h * 0.2, 0.6, 256)


def marble(n=1024):
    """Nero Marquina: near-black with white veins."""
    x, y = grid(n)
    w = fbm(n, 2, 5, 81)
    v1 = np.abs(np.sin((x * 1.0 + y * 1.0 + w * 2.2) * np.pi * 2))
    v2 = np.abs(np.sin((x * 2.0 - y * 1.0 + fbm(n, 3, 4, 82) * 2.6) * np.pi * 2))
    vein = np.clip(1 - v1 / 0.07, 0, 1) ** 2.2 + 0.5 * np.clip(1 - v2 / 0.04, 0, 1) ** 2.5
    cloud = fbm(n, 3, 4, 83)
    base = hexrgb('#141416') * (0.8 + 0.5 * cloud[..., None])
    out = base + np.clip(vein, 0, 1)[..., None] * (hexrgb('#d8d4cc') - base) * 0.85
    return save('marble', to_srgb(out), np.clip(vein, 0, 1) * 0.05, 0.3, 256)


def brushed(n=512):
    s = fnoise(n, 30, 250, 91, aniso=(25.0, 1.0))         # streaks along U
    g = 0.7 * s + 0.3 * fbm(n, 3, 3, 92)
    return save('brushed', rel(g, 0.35), s * 0.2, 0.5, 256)


def powder(n=256):
    g = 0.6 * fnoise(n, 50, 128, 101) + 0.4 * fbm(n, 4, 3, 102)
    return save('powder', rel(g, 0.18), g * 0.3, 0.6, 256)


def flat(n=256):
    g = fbm(n, 2, 4, 111)
    return save('flat', rel(g, 0.08), g * 0.1, 0.2, 128)


def plaster(n=512):
    g = 0.7 * fbm(n, 2, 5, 121) + 0.3 * fnoise(n, 40, 120, 122)
    return save('plaster', rel(g, 0.22), g, 0.8, 256)


def concrete(n=512):
    g = 0.6 * fbm(n, 3, 5, 131) + 0.25 * fnoise(n, 80, 250, 132)
    pores = (fnoise(n, 120, 250, 133) > 0.82).astype(float) * 0.25
    g = g - pores
    return save('concrete', rel(g, 0.5), g, 1.2, 256)


def woven(n=256):
    x, y = grid(n)
    k = 64
    wx = np.sin(x * k * 2 * np.pi) * 0.5 + 0.5
    wy = np.sin(y * k * 2 * np.pi) * 0.5 + 0.5
    checker = ((np.floor(x * k) + np.floor(y * k)) % 2)
    weave = np.where(checker > 0, wx, wy)
    g = 0.6 * weave + 0.4 * fbm(n, 4, 3, 141)
    return save('woven', rel(g, 0.5), weave, 1.5, 256)


def carpet_deco(n=1024):
    """Classic cinema carpet: burgundy ground, gold art-deco fans (scale pattern), teal pinstripes."""
    x, y = grid(n)
    k = 4                                  # fans per tile row
    X, Y = x * k, y * k
    row = np.floor(Y).astype(int)
    Xs = X + (row % 2) * 0.5
    fx, fy = Xs - np.floor(Xs) - 0.5, Y - row
    r = np.sqrt(fx * fx + fy * fy)
    inside = (r < 0.5) & (fy >= 0)
    rings = np.abs(np.sin(r * 2 * np.pi * 4)) < 0.22
    rays = np.abs(np.sin(np.arctan2(fy, fx) * 9)) < 0.12
    ground = hexrgb('#4a0f18'); gold = hexrgb('#b8893a'); teal = hexrgb('#1f4a48'); deep = hexrgb('#2c070d')
    out = np.ones((n, n, 3)) * ground
    fan = inside & (r > 0.12)
    out[fan] = deep
    out[fan & (rings | rays)] = gold * 0.9
    out[inside & (r <= 0.12)] = gold
    edge = inside & (np.abs(r - 0.5) < 0.02)
    out[edge] = teal
    pile = fnoise(n, 150, 500, 151)[..., None]
    out = out * (0.85 + 0.3 * pile) * (0.93 + 0.14 * fbm(n, 3, 3, 152)[..., None])
    return save('carpet_deco', to_srgb(out), pile[..., 0] * 0.5, 0.8, 512)


def carpet_hall(n=512):
    x, y = grid(n)
    k = 16
    fx, fy = (x * k) % 1 - 0.5, (y * k + 0.5 * (np.floor(x * k) % 2)) % 1 - 0.5
    dot = np.clip(1 - np.sqrt(fx * fx + fy * fy) / 0.12, 0, 1)
    pile = fnoise(n, 120, 250, 161)
    g = 0.5 + (pile - 0.5) * 0.5 + dot * 0.35 + (fbm(n, 3, 3, 162) - 0.5) * 0.25
    return save('carpet_hall', rel(g, 1.0), pile * 0.5, 0.8, 256)


def asphalt(n=512):
    g = 0.5 * fnoise(n, 100, 250, 171) + 0.5 * fbm(n, 3, 4, 172)
    return save('asphalt', rel(g, 0.6), g, 1.5, 256)


def paving(n=512):
    x, y = grid(n)
    k = 4
    fx, fy = (x * k) % 1, (y * k) % 1
    ix, iy = np.floor(x * k).astype(int), np.floor(y * k).astype(int)
    tone = RNG.uniform(-0.06, 0.06, (k, k))[iy, ix]
    joint = np.clip(np.minimum(np.minimum(fx, 1 - fx), np.minimum(fy, 1 - fy)) / 0.02, 0, 1)
    g = (0.5 + tone + (fbm(n, 6, 4, 181) - 0.5) * 0.3) * (0.45 + 0.55 * joint)
    return save('paving', rel(g, 1.0), joint * 0.8 + fbm(n, 6, 3, 182) * 0.2, 2.0, 256)


def squaretile(n=512):
    x, y = grid(n)
    k = 4
    fx, fy = (x * k) % 1, (y * k) % 1
    ix, iy = np.floor(x * k).astype(int), np.floor(y * k).astype(int)
    tone = RNG.uniform(-0.05, 0.05, (k, k))[iy, ix]
    joint = np.clip(np.minimum(np.minimum(fx, 1 - fx), np.minimum(fy, 1 - fy)) / 0.015, 0, 1)
    g = (0.5 + tone + (fbm(n, 4, 3, 191) - 0.5) * 0.15) * (0.55 + 0.45 * joint)
    return save('squaretile', rel(g, 1.0), joint, 2.0, 256)


def granite(n=512):
    g = 0.5 * fnoise(n, 120, 250, 201) + 0.3 * fnoise(n, 40, 100, 202) + 0.2 * fbm(n, 4, 3, 203)
    return save('granite', rel(g, 0.8), g * 0.1, 0.3, 256)


def fluted(n=256):
    """Fluted panel / column cladding: 8 concave flutes per tile, used on wood or plaster."""
    x, y = grid(n)
    k = 8
    sx = (x * k) % 1.0
    prof = np.sqrt(np.clip(1 - ((sx - 0.5) / 0.5) ** 2, 0, 1))
    g = 0.5 + (prof - 0.7) * 0.5 + (wood_grain(n, 211, rings=16) - 0.5) * 0.3
    return save('fluted', rel(g, 1.0), prof, 2.5, 256)


ALL = [velvet, leather, walnut, slats, chevron, geotile, terrazzo, marble, brushed, powder, flat, plaster, concrete, woven,
       carpet_deco, carpet_hall, asphalt, paving, squaretile, granite, fluted]

if __name__ == '__main__':
    sheet = sys.argv[sys.argv.index('--sheet') + 1] if '--sheet' in sys.argv else None
    tiles = []
    for f in ALL:
        a = f(); tiles.append((f.__name__, a)); print('wrote', f.__name__)
    if sheet:
        T = 192; cols = 7; rows = (len(tiles) + cols - 1) // cols
        S = Image.new('RGB', (cols * T, rows * T * 2))
        for i, (name, a) in enumerate(tiles):
            im = Image.open(os.path.join(OUT, f'{name}_a.jpg')).resize((T, T)); nm = Image.open(os.path.join(OUT, f'{name}_n.jpg')).resize((T, T))
            S.paste(im, ((i % cols) * T, (i // cols) * 2 * T)); S.paste(nm, ((i % cols) * T, (i // cols) * 2 * T + T))
        S.save(sheet, quality=85)
