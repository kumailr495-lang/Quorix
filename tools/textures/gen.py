#!/usr/bin/env python3
"""LUMIERE material library textures (v2): every map is generated here, tileable, no image inputs.

Run (Termux works: pkg install python python-numpy && pip install pillow):
    python3 tools/textures/gen.py                  # writes www/tex/<name>_a.jpg (albedo) and <name>_n.jpg (normal)
    python3 tools/textures/gen.py --sheet out.jpg  # also a contact sheet for review
    python3 tools/textures/gen.py marble walnut    # only some sets

Albedo modes (see www/js/library.js): 'rel' maps are detail around mid-grey that the engine multiplies by a tint
(so one walnut map serves light and dark walnut), 'abs' maps carry their own colours (parquet, tile, carpet, stone).

v2 (after the user's brief: "no blotchy, stretched, repetitive or obviously procedural textures"):
  * noise is spectral (1/f^beta, natural falloff) and normalised by standard deviation, not min-max: no big blotches
  * stone: domain-warped ridge networks (veins branch, thin out and carry a soft halo), per-tile variation, real joints
  * wood: cathedral figure from a sawn-log ring model, pores along the grain, heartwood streaks
  * leather / aggregate / speckle: tileable Worley cells
  * every map is generated at the size the engine uses (512) with the metres-per-tile in library.js in mind
"""
import sys, os
import numpy as np
from PIL import Image, ImageFile
ImageFile.MAXBLOCK = 1 << 24

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'www', 'tex')
N = 512


# ---------------------------------------------------------------- primitives (all tileable on an N x N torus)
def spectral(n, beta, fmin, fmax, seed, aniso=(1.0, 1.0)):
    """Gaussian noise with a 1/f^beta amplitude spectrum between fmin and fmax cycles per tile; mean 0.5, std 0.16."""
    r = np.random.default_rng(seed)
    w = r.standard_normal((n, n))
    f = np.fft.fftfreq(n) * n
    fx, fy = np.meshgrid(f * aniso[0], f * aniso[1])
    rad = np.sqrt(fx * fx + fy * fy)
    lo = np.clip((rad - fmin * 0.7) / (fmin * 0.3 + 1e-9), 0, 1)          # soft band edges: no ringing
    hi = np.clip((fmax * 1.3 - rad) / (fmax * 0.3 + 1e-9), 0, 1)
    amp = lo * hi / np.maximum(rad, 1.0) ** beta
    out = np.real(np.fft.ifft2(np.fft.fft2(w) * amp))
    s = out.std()
    return 0.5 + (out - out.mean()) / max(s, 1e-12) * 0.16


def grid(n):
    y, x = np.mgrid[0:n, 0:n].astype(np.float64)
    return x, y


def sample(f, x, y):
    """Bilinear sample of a tileable field at pixel coordinates (wraps)."""
    n = f.shape[0]
    x0 = np.floor(x).astype(int); y0 = np.floor(y).astype(int); fx = x - x0; fy = y - y0
    x0 %= n; y0 %= n; x1 = (x0 + 1) % n; y1 = (y0 + 1) % n
    return f[y0, x0] * (1 - fx) * (1 - fy) + f[y0, x1] * fx * (1 - fy) + f[y1, x0] * (1 - fx) * fy + f[y1, x1] * fx * fy


def worley(n, cells, seed, jitter=0.9):
    """Tileable cellular noise: F1, F2 distances (in cell units) and the id of the nearest feature point."""
    r = np.random.default_rng(seed)
    pts = r.uniform(0.5 - jitter / 2, 0.5 + jitter / 2, (cells, cells, 2))
    x, y = grid(n); X, Y = x / n * cells, y / n * cells
    ci, cj = np.floor(X).astype(int), np.floor(Y).astype(int)
    f1 = np.full((n, n), 9.0); f2 = np.full((n, n), 9.0); idn = np.zeros((n, n), int)
    for dj in (-1, 0, 1):
        for di in (-1, 0, 1):
            ii, jj = ci + di, cj + dj
            p = pts[jj % cells, ii % cells]
            d = np.hypot(ii + p[..., 0] - X, jj + p[..., 1] - Y)
            k = (jj % cells) * cells + (ii % cells)
            closer = d < f1
            f2 = np.where(closer, f1, np.minimum(f2, d)); idn = np.where(closer, k, idn); f1 = np.where(closer, d, f1)
    return f1, f2, idn


def smooth(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def ridges(n, seed, scale_lo, scale_hi, warp, sharp, beta=1.4):
    """Network of thin bright lines: the median contour of warped spectral noise, sharpened. Returns 0..1."""
    x, y = grid(n)
    wx = spectral(n, 2.0, 1, 6, seed + 1); wy = spectral(n, 2.0, 1, 6, seed + 2)
    X = x + (wx - 0.5) * warp * n; Y = y + (wy - 0.5) * warp * n
    base = spectral(n, beta, scale_lo, scale_hi, seed)
    v = sample(base, X, Y)
    return (1 - np.clip(np.abs(v - 0.5) * 2, 0, 1)) ** sharp


def normal_from_height(h, strength):
    """Tangent-space normal map (OpenGL convention, +Y towards +v) from a tileable height field (Sobel)."""
    k = lambda a, dx, dy: np.roll(np.roll(a, dy, 0), dx, 1)
    gx = (k(h, -1, -1) + 2 * k(h, -1, 0) + k(h, -1, 1)) - (k(h, 1, -1) + 2 * k(h, 1, 0) + k(h, 1, 1))
    gy = (k(h, -1, -1) + 2 * k(h, 0, -1) + k(h, 1, -1)) - (k(h, -1, 1) + 2 * k(h, 0, 1) + k(h, 1, 1))
    n = h.shape[0]
    nx, ny, nz = gx * strength * n / 512.0, -gy * strength * n / 512.0, np.ones_like(h)
    l = np.sqrt(nx * nx + ny * ny + nz * nz)
    return np.stack([nx / l, ny / l, nz / l], -1) * 0.5 + 0.5


def save(name, alb, h, strength, q=90):
    os.makedirs(OUT, exist_ok=True)
    a = np.clip(alb, 0, 1)
    Image.fromarray((a * 255 + 0.5).astype(np.uint8), 'RGB').save(os.path.join(OUT, f'{name}_a.jpg'), quality=q, optimize=True, subsampling=0)
    nm = normal_from_height(h, strength)
    Image.fromarray((nm * 255 + 0.5).astype(np.uint8), 'RGB').save(os.path.join(OUT, f'{name}_n.jpg'), quality=93, optimize=True, subsampling=0)
    return a


def rel(gray, spread=1.0):
    """Relative albedo: mean 0.5 grey, detail scaled by spread (the engine multiplies by tint x 2)."""
    g = 0.5 + (gray - gray.mean()) * spread
    return np.repeat(g[..., None], 3, -1)


def lin(h):
    h = h.lstrip('#'); return np.array([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]) ** 2.2


def srgb(c):
    return np.clip(c, 0, 1) ** (1 / 2.2)


def mix(a, b, t):
    t = np.asarray(t)
    if t.ndim == 2: t = t[..., None]
    return a * (1 - t) + b * t


def tiles(n, cols, rows, joint_px, bond=0.0, bevel_px=2.0):
    """Tile layout: per-pixel local coords, tile ids, joint mask (1 = tile face) and a bevel height profile."""
    x, y = grid(n)
    Y = y / n * rows; r = np.floor(Y).astype(int)
    X = x / n * cols + (r % 2) * bond; c = np.floor(X).astype(int)
    fx, fy = (X - c) * n / cols, (Y - r) * n / rows          # pixels inside the tile
    w, h = n / cols, n / rows
    d = np.minimum(np.minimum(fx, w - fx), np.minimum(fy, h - fy))
    face = smooth(joint_px * 0.5, joint_px * 0.5 + 1.0, d)
    bev = smooth(joint_px * 0.5, joint_px * 0.5 + bevel_px, d)
    return fx, fy, (r % rows) * (cols + 1) + (c % (cols + 1)), face, bev


# ---------------------------------------------------------------- wood
def wood_figure(n, seed, rings_per_tile=14.0, depth=(0.18, 0.08), warp=0.06, pores=0.35, streak=0.25):
    """Flat-sawn veneer: growth rings of a log cut along its length (cathedral arches), warped, with pores along the grain
    and heartwood streaks. u = across the grain (x), v = along it (y). Returns (tone 0..1, height 0..1)."""
    x, y = grid(n); u, v = x / n, y / n
    du = np.sin(np.pi * (u - 0.37)) / np.pi                     # periodic distance to the pith line (period 1 in u)
    dz = depth[0] + depth[1] * np.sin(2 * np.pi * (v + 0.13)) + (spectral(n, 2.2, 1, 5, seed, aniso=(1, 4)) - 0.5) * 0.12
    w = (spectral(n, 1.8, 1, 10, seed + 1, aniso=(1.0, 5.0)) - 0.5) * warp
    r = np.sqrt((du * 1.0) ** 2 + dz ** 2) + w
    t = (r * rings_per_tile * 6) % 1.0
    late = smooth(0.55, 0.85, t) * (1 - smooth(0.9, 1.0, t))       # dark latewood band in each ring
    p = spectral(n, 0.6, 60, 250, seed + 2, aniso=(1.0, 22.0))      # pores: fine streaks along v
    pore = smooth(0.62, 0.8, p)
    hs = spectral(n, 1.6, 1, 8, seed + 3, aniso=(1.0, 8.0))          # heartwood colour streaks
    tone = 0.62 - 0.32 * late - pores * pore * 0.6 - streak * (hs - 0.5) * 1.4
    height = 0.6 - 0.25 * late - 0.5 * pore
    return np.clip(tone, 0, 1), height


def walnut(n=N):
    tone, h = wood_figure(n, 31)
    return save('walnut', rel(tone, 1.0), h, 1.2)


def slats(n=N):
    """Vertical walnut slats: 8 per 0.4 m tile (5 cm pitch), 8 mm dark groove, each slat its own piece of grain."""
    x, y = grid(n); k = 8
    sx = (x / n * k) % 1.0; idx = np.floor(x / n * k).astype(int)
    tone, hh = wood_figure(n, 41, rings_per_tile=22, depth=(0.25, 0.1))
    shift = np.random.default_rng(42).uniform(-0.07, 0.07, k)[idx]
    groove = smooth(0.0, 0.16, np.minimum(sx, 1 - sx))
    edge = smooth(0.0, 0.06, np.minimum(sx, 1 - sx))
    g = (tone + shift) * (0.18 + 0.82 * groove)
    return save('slats', rel(g, 1.0), edge * 0.85 + hh * 0.15, 5.0)


def fluted(n=N):
    """Fluted cladding: 8 concave flutes per 0.4 m tile (5 cm), wood grain running along them."""
    x, y = grid(n); k = 8
    sx = (x / n * k) % 1.0
    prof = np.sqrt(np.clip(1 - ((sx - 0.5) / 0.5) ** 2, 0, 1))
    tone, _ = wood_figure(n, 211, rings_per_tile=18)
    g = 0.5 + (prof - 0.75) * 0.45 + (tone - 0.5) * 0.6
    return save('fluted', rel(g, 1.0), prof, 2.6)


def chevron(n=N):
    """Chevron oak parquet (90 mm boards at 45 degrees), 2 columns per 1.6 m tile; each board its own grain and tone, 1 mm joints."""
    x, y = grid(n); X, Y = x / n, y / n
    B = 9                                    # boards per column period
    U = X * 2.0 * B / np.sqrt(2); V = Y * B * np.sqrt(2)
    cw = B / np.sqrt(2)
    col = np.floor(U / cw).astype(int); u = U - col * cw
    um = np.where(col % 2 == 0, u, cw - u)
    t = (V - um) / np.sqrt(2); k = np.floor(t).astype(int); ft = t - k
    along = (V + um) / np.sqrt(2)
    r = np.random.default_rng(51)
    tones = r.uniform(-1, 1, 4096); offs = r.uniform(0, 1, 4096)
    key = ((col % 2) * 977 + (k % (2 * B)) * 13) % 4096
    # board grain: rings across the board, pores along it, offset per board so no two match
    rings = (np.sqrt(((ft - 0.5 + offs[key] * 0.6 - 0.3) * 1.3) ** 2 + (0.15 + 0.1 * np.sin(along * 1.7 + offs[key] * 6)) ** 2) * 9 + offs[key] * 4) % 1.0
    late = smooth(0.6, 0.88, rings) * (1 - smooth(0.92, 1.0, rings))
    pore = smooth(0.64, 0.82, spectral(n, 0.6, 60, 250, 52, aniso=(1.0, 1.0)))
    base = lin('#a8763f'); dark = lin('#6a4220'); light = lin('#c8975c')
    m = np.clip(0.55 + tones[key] * 0.22 - late * 0.35 - pore * 0.12, 0, 1)
    c = mix(dark, light, m) * 0.85 + base * 0.15
    gap = smooth(0.0, 0.035, np.minimum(ft, 1 - ft)); seam = smooth(0.0, 0.03, np.minimum(u, cw - u))
    edge = np.minimum(gap, seam)
    c = c * (0.3 + 0.7 * edge[..., None])
    h = edge * 0.7 + (1 - late) * 0.15 + (1 - pore) * 0.15
    return save('chevron', srgb(c), h, 2.5)


# ---------------------------------------------------------------- stone
def marble(n=N):
    """Nero Marquina: deep black with white veins that branch, thin out and carry a soft halo; faint grey clouds."""
    v1 = ridges(n, 81, 1, 5, 0.35, 26)          # main veins
    v2 = ridges(n, 91, 2, 9, 0.25, 40)          # secondary
    v3 = ridges(n, 97, 4, 20, 0.15, 70)         # hairlines
    gate = smooth(0.45, 0.62, spectral(n, 2.0, 1, 5, 83))     # veins come and go along their length
    halo = ridges(n, 81, 1, 5, 0.35, 6) * 0.08
    cloud = spectral(n, 2.2, 1, 12, 85)
    base = lin('#121214') * (0.75 + 0.6 * cloud[..., None])
    vein = np.clip(v1 * (0.35 + 0.65 * gate) + 0.55 * v2 * gate + 0.25 * v3, 0, 1)
    c = base + halo[..., None] * (lin('#4a4a4c') - base)
    c = mix(c, lin('#e6e1d8'), vein * 0.92)
    return save('marble', srgb(c), vein * 0.06 + cloud * 0.02, 0.35)


def calacatta(n=N):
    """Calacatta: warm white with bold grey veins edged in gold, soft clouds (vanities, bar tops)."""
    v1 = ridges(n, 301, 1, 4, 0.4, 16)
    v2 = ridges(n, 311, 2, 9, 0.3, 34)
    v3 = ridges(n, 317, 5, 22, 0.15, 70)
    gate = smooth(0.42, 0.6, spectral(n, 2.0, 1, 5, 303))
    cloud = spectral(n, 2.4, 1, 10, 305)
    base = lin('#f1ede6') * (0.93 + 0.12 * cloud[..., None])
    gold = ridges(n, 301, 1, 4, 0.4, 7) * 0.25 * gate
    c = mix(base, lin('#c9b48c'), gold)
    vein = np.clip(v1 * gate + 0.45 * v2 * gate + 0.22 * v3, 0, 1)
    c = mix(c, lin('#6b6862'), vein * 0.85)
    return save('calacatta', srgb(c), vein * 0.05, 0.3)


def terrazzo(n=N):
    """Venetian terrazzo (1 m tile): warm grey matrix, 2-14 mm marble chips in four colours, fine dust; polished (low contrast)."""
    r = np.random.default_rng(72)
    c = np.ones((n, n, 3)) * lin('#8a837a') * (0.94 + 0.12 * spectral(n, 2.0, 1, 10, 71)[..., None])
    dust = spectral(n, 0.3, 120, 256, 73)
    c *= (0.9 + 0.2 * dust)[..., None]
    h = np.zeros((n, n))
    for (cells, seed, cols, cover) in [(110, 74, ['#e9e4da', '#cfc7ba', '#3a3634', '#9b5a3c'], 0.42), (220, 75, ['#f2eee6', '#6e6862', '#b8ad9c'], 0.32), (48, 76, ['#ebe5da', '#4a4542'], 0.35)]:
        f1, f2, idn = worley(n, cells, seed)
        rr = np.random.default_rng(seed + 1); pick = rr.integers(0, len(cols), cells * cells); keep = rr.uniform(0, 1, cells * cells) < 0.75
        size = rr.uniform(0.18, cover, cells * cells)
        chip = (f1 < size[idn]) & keep[idn]
        col = np.array([lin(q) for q in cols])[pick[idn]] * rr.uniform(0.9, 1.08, cells * cells)[idn][..., None]
        c = np.where(chip[..., None], col, c); h = np.where(chip, 0.25, h)
    return save('terrazzo', srgb(c), h * 0.15 + dust * 0.05, 0.25)


def porcelain(n=N):
    """Large-format porcelain floor tile, 600 x 600 mm (2 x 2 per 1.2 m), warm stone look with soft veins, 2 mm grout, eased edge."""
    fx, fy, tid, face, bev = tiles(n, 2, 2, joint_px=1.8, bevel_px=3.0)
    rr = np.random.default_rng(401); tone = rr.uniform(-0.035, 0.035, 64)[tid % 64]
    big = ridges(n, 403, 1, 3, 0.3, 14) * smooth(0.5, 0.65, spectral(n, 2.0, 1, 4, 404))
    fine = spectral(n, 0.9, 30, 256, 405)
    cloud = spectral(n, 2.2, 2, 14, 406)
    base = lin('#cbc4b8') * (1 + tone[..., None]) * (0.94 + 0.1 * cloud[..., None]) * (0.96 + 0.08 * fine[..., None])
    c = mix(base, lin('#a59d90'), big * 0.5)
    c = mix(lin('#7f786e'), c, face)
    return save('porcelain', srgb(c), bev * 0.9 + fine * 0.02, 2.2)


def walltile(n=N):
    """Glazed ceramic wall tile 600 x 300 mm in running bond (2 x 4 per 1.2 m), 2 mm grout, wavy glaze, tone per tile (relative)."""
    fx, fy, tid, face, bev = tiles(n, 2, 4, joint_px=1.8, bond=0.5, bevel_px=4.0)
    rr = np.random.default_rng(411); tone = rr.uniform(-0.03, 0.03, 64)[tid % 64]
    glaze = spectral(n, 2.4, 2, 30, 412)
    g = (0.55 + tone + (glaze - 0.5) * 0.06) * (0.55 + 0.45 * face)
    return save('walltile', rel(g, 1.0), bev * 0.9 + glaze * 0.12, 2.0)


def squaretile(n=N):
    """Honed stone pavers 300 x 300 mm (4 x 4 per 1.2 m), fine speckle, chamfered, sand joints (relative: tinted per use)."""
    fx, fy, tid, face, bev = tiles(n, 4, 4, joint_px=2.5, bevel_px=3.0)
    rr = np.random.default_rng(191); tone = rr.uniform(-0.05, 0.05, 64)[tid % 64]
    speck = spectral(n, 0.5, 80, 256, 192); grain = spectral(n, 1.6, 4, 40, 193)
    g = (0.55 + tone + (grain - 0.5) * 0.12 + (speck - 0.5) * 0.1) * (0.45 + 0.55 * face)
    return save('squaretile', rel(g, 1.0), bev * 0.8 + speck * 0.05, 2.2)


def paving(n=N):
    """Granite street pavers 600 x 300 mm in running bond, chamfered, per-stone tone, speckle, sand joints."""
    fx, fy, tid, face, bev = tiles(n, 4, 8, joint_px=3.0, bond=0.5, bevel_px=4.0)
    rr = np.random.default_rng(181); tone = rr.uniform(-0.08, 0.08, 64)[tid % 64]
    speck = spectral(n, 0.4, 90, 256, 182); grain = spectral(n, 1.5, 4, 40, 183)
    g = (0.55 + tone + (grain - 0.5) * 0.15 + (speck - 0.5) * 0.18) * (0.4 + 0.6 * face)
    return save('paving', rel(g, 1.0), bev * 0.9 + speck * 0.06, 2.4)


def granite(n=N):
    """Speckled granite (relative): quartz, feldspar and mica grains 1-4 mm."""
    f1, f2, idn = worley(n, 140, 201)
    rr = np.random.default_rng(202); t = rr.uniform(0, 1, 140 * 140)[idn]
    g = 0.5 + np.where(t < 0.18, -0.32, np.where(t < 0.5, -0.08, np.where(t < 0.85, 0.08, 0.28))) * smooth(0.0, 0.1, f2 - f1)
    g += (spectral(n, 0.5, 100, 256, 203) - 0.5) * 0.1
    return save('granite', rel(g, 0.9), g * 0.2, 0.25)


def concrete(n=N):
    """Polished concrete (relative): fine aggregate specks, very soft clouding, pinholes."""
    cloud = spectral(n, 2.2, 1, 12, 131); fine = spectral(n, 0.7, 40, 256, 132)
    f1, f2, idn = worley(n, 90, 133)
    agg = (f1 < 0.18) * np.random.default_rng(134).uniform(-0.12, 0.12, 8100)[idn]
    pin = smooth(0.08, 0.04, f1) * (np.random.default_rng(135).uniform(0, 1, 8100)[idn] < 0.04)
    g = 0.5 + (cloud - 0.5) * 0.35 + (fine - 0.5) * 0.25 + agg - pin * 0.25
    return save('concrete', rel(g, 1.0), 0.5 + (fine - 0.5) * 0.3 - pin * 0.6, 1.0)


def asphalt(n=N):
    """Street asphalt (relative): bitumen with 4-10 mm aggregate, fine sand, faint wear."""
    f1, f2, idn = worley(n, 160, 171)
    rr = np.random.default_rng(172); stone = rr.uniform(-0.1, 0.25, 160 * 160)[idn]
    agg = smooth(0.42, 0.3, f1) * stone
    sand = spectral(n, 0.3, 120, 256, 173); wear = spectral(n, 2.2, 1, 8, 174)
    g = 0.42 + agg + (sand - 0.5) * 0.12 + (wear - 0.5) * 0.12
    return save('asphalt', rel(g, 1.0), smooth(0.42, 0.25, f1) * 0.6 + sand * 0.1, 1.8)


# ---------------------------------------------------------------- textiles, leather, finishes
def velvet(n=N):
    """Velvet pile (relative): fine pile noise, soft directional crush (low contrast; the shader adds the rim sheen)."""
    pile = spectral(n, 0.4, 100, 256, 11)
    crush = spectral(n, 1.6, 2, 24, 12, aniso=(1.0, 3.0))
    g = 0.5 + (pile - 0.5) * 0.25 + (crush - 0.5) * 0.45
    return save('velvet', rel(g, 1.0), pile * 0.4 + crush * 0.6, 0.9)


def leather(n=N):
    """Pebble-grain leather (0.4 m tile): Worley pebbles 2-3 mm with creases between them, soft wrinkles."""
    f1, f2, idn = worley(n, 150, 21)
    crease = 1 - smooth(0.0, 0.12, f2 - f1)
    wr = spectral(n, 1.8, 2, 16, 22)
    rr = np.random.default_rng(23); tone = rr.uniform(-0.04, 0.04, 150 * 150)[idn]
    g = 0.55 + tone - crease * 0.2 + (wr - 0.5) * 0.25
    return save('leather', rel(g, 1.0), (1 - crease) * 0.6 + f1 * 0.2 + wr * 0.2, 1.4)


def woven(n=N):
    """Acoustic fabric: tight plain weave (2 mm), slub variation in the yarn (relative)."""
    x, y = grid(n); k = 128
    wx = np.sin(x / n * k * 2 * np.pi) * 0.5 + 0.5; wy = np.sin(y / n * k * 2 * np.pi) * 0.5 + 0.5
    checker = (np.floor(x / n * k) + np.floor(y / n * k)) % 2
    weave = np.where(checker > 0, wx, wy)
    slub = spectral(n, 1.0, 20, 200, 141, aniso=(6.0, 1.0))
    g = 0.5 + (weave - 0.5) * 0.35 + (slub - 0.5) * 0.3
    return save('woven', rel(g, 1.0), weave * 0.8 + slub * 0.2, 1.6)


def brushed(n=N):
    s = spectral(n, 0.5, 40, 256, 91, aniso=(30.0, 1.0))
    g = 0.5 + (s - 0.5) * 0.5 + (spectral(n, 2.0, 1, 8, 92) - 0.5) * 0.12
    return save('brushed', rel(g, 1.0), s * 0.2, 0.5)


def powder(n=N):
    """Powder coat: fine orange peel, almost flat."""
    g = spectral(n, 1.2, 30, 200, 101)
    return save('powder', rel(g, 0.35), g, 0.7)


def flat(n=256):
    g = spectral(n, 2.0, 1, 30, 111)
    return save('flat', rel(g, 0.12), g * 0.1, 0.2)


def plaster(n=N):
    """Polished plaster / eggshell paint: soft trowel strokes at random angles, very low contrast (relative)."""
    a = spectral(n, 1.6, 2, 40, 121, aniso=(3.0, 1.0)); b = spectral(n, 1.6, 2, 40, 122, aniso=(1.0, 3.0))
    m = smooth(0.4, 0.6, spectral(n, 2.0, 1, 4, 123))
    g = a * m + b * (1 - m) + (spectral(n, 0.6, 80, 256, 124) - 0.5) * 0.2
    return save('plaster', rel(g, 0.35), g, 0.6)


def carpet_hall(n=N):
    """Auditorium carpet (relative, 1 m tile): cut-loop pile with a small two-tone diamond figure."""
    x, y = grid(n); k = 20
    X, Y = x / n * k, y / n * k
    d = np.abs((X % 1) - 0.5) + np.abs((Y % 1) - 0.5)
    fig = smooth(0.3, 0.26, d) - smooth(0.16, 0.12, d) * 0.6
    pile = spectral(n, 0.3, 120, 256, 161); tuft = spectral(n, 1.2, 20, 100, 162)
    g = 0.5 + fig * 0.18 + (pile - 0.5) * 0.35 + (tuft - 0.5) * 0.2
    return save('carpet_hall', rel(g, 1.0), pile * 0.6 + tuft * 0.4, 0.9)


def carpet_deco(n=N):
    """Classic cinema carpet (2.4 m tile): burgundy ground, gold art-deco fans in scale pattern, teal edge, cut pile."""
    x, y = grid(n); k = 4
    X, Y = x / n * k, y / n * k
    row = np.floor(Y).astype(int); Xs = X + (row % 2) * 0.5
    fx, fy = Xs - np.floor(Xs) - 0.5, Y - row
    r = np.sqrt(fx * fx + fy * fy)
    inside = (r < 0.5) & (fy >= 0)
    rings = np.abs(np.sin(r * 2 * np.pi * 4)) < 0.22
    rays = np.abs(np.sin(np.arctan2(fy, fx) * 9)) < 0.12
    ground, gold, teal, deep = lin('#4a0f18'), lin('#b8893a'), lin('#1f4a48'), lin('#2c070d')
    out = np.ones((n, n, 3)) * ground
    fan = inside & (r > 0.12)
    out[fan] = deep; out[fan & (rings | rays)] = gold * 0.9; out[inside & (r <= 0.12)] = gold
    out[inside & (np.abs(r - 0.5) < 0.02)] = teal
    pile = spectral(n, 0.3, 120, 256, 151)
    out = out * (0.82 + 0.36 * pile[..., None]) * (0.95 + 0.1 * spectral(n, 2.0, 1, 8, 152)[..., None])
    return save('carpet_deco', srgb(out), pile * 0.5, 0.8)


def geotile(n=N):
    """Everyman-style geometric floor: 4x4 squares of 0.3 m split on a diagonal, black / cream / terracotta hourglass motif, 2 mm grout."""
    x, y = grid(n); k = 4
    X, Y = x / n * k, y / n * k
    i, j = np.floor(X).astype(int), np.floor(Y).astype(int); fx, fy = X - i, Y - j
    flip = (i + j) % 2 == 0
    upper = np.where(flip, fx > fy, fx + fy < 1)
    cols = [lin('#e8dfcf'), lin('#1a1a1c'), lin('#a4462c'), lin('#8a8580')]
    pat = [[0, 1, 2, 1], [1, 3, 1, 2], [2, 1, 0, 1], [1, 2, 1, 3]]
    a = np.zeros((n, n), int); b = np.zeros((n, n), int)
    for jj in range(k):
        for ii in range(k):
            m = (i == ii) & (j == jj); a[m] = pat[jj][ii]; b[m] = (pat[jj][ii] + 1) % 4 if (ii + jj) % 2 else 1
    pick = np.where(upper, a, b)
    out = np.zeros((n, n, 3))
    for c in range(4): out[pick == c] = cols[c]
    fine = spectral(n, 0.8, 30, 256, 61)
    out = out * (0.95 + 0.1 * fine[..., None]) * (0.96 + 0.08 * spectral(n, 2.0, 1, 8, 62)[..., None])
    d = np.minimum(np.minimum(fx, 1 - fx), np.minimum(fy, 1 - fy)) * n / k
    dd = np.where(flip, np.abs(fx - fy), np.abs(fx + fy - 1)) / np.sqrt(2) * n / k
    grout = smooth(0.8, 1.8, np.minimum(d, dd))
    out = mix(lin('#6d6862'), out, grout)
    return save('geotile', srgb(out), smooth(0.8, 3.0, np.minimum(d, dd)) * 0.8 + fine * 0.03, 2.0)


def brick(n=N):
    """Dark city brick in running bond (1.6 m tile): per-brick tone, recessed mortar, soot, fine sandy face."""
    x, y = grid(n); rows, cols = 22, 7
    Y = y / n * rows; r = np.floor(Y).astype(int)
    X = x / n * cols + (r % 2) * 0.5; c = np.floor(X).astype(int)
    fx, fy = X - c, Y - r
    rr = np.random.default_rng(221); tones = rr.uniform(-0.12, 0.12, (rows, cols + 2))
    tone = tones[r % rows, c % cols]
    mort = smooth(0.0, 0.05, np.minimum(np.minimum(fx, 1 - fx) * 0.5, np.minimum(fy, 1 - fy)) * 1.0)
    sand = spectral(n, 0.5, 60, 256, 222)
    base = lin('#6a3a2a') * (1 + tone[..., None]) * (0.85 + 0.3 * sand[..., None])
    soot = spectral(n, 2.0, 1, 6, 223)[..., None]
    base = base * (0.7 + 0.45 * soot)
    out = mix(lin('#3b3530'), base, mort)
    return save('brick', srgb(out), mort * 0.8 + sand * 0.1, 2.4)



# ---------------------------------------------------------------- v7 (docs/V7-DESIGN.md)
def stone_light(n=N):
    """Dolby-corridor wall stone (relative, 1.2 m tile): fine-grained honed limestone, 0.5-2 mm grains, soft clouding, rare fossil flecks."""
    f1, f2, idn = worley(n, 170, 701)
    rr = np.random.default_rng(702); t = rr.uniform(0, 1, 170 * 170)[idn]
    grain = np.where(t < 0.12, -0.10, np.where(t < 0.55, -0.02, np.where(t < 0.92, 0.03, 0.09))) * smooth(0.0, 0.12, f2 - f1)
    cloud = spectral(n, 2.4, 1, 10, 703); fine = spectral(n, 0.4, 120, 256, 704)
    f1b, f2b, idb = worley(n, 26, 705); fleck = (f1b < 0.05) * (np.random.default_rng(706).uniform(0, 1, 26 * 26)[idb] < 0.25) * -0.12
    g = 0.5 + grain + (cloud - 0.5) * 0.12 + (fine - 0.5) * 0.06 + fleck
    return save('stone_light', rel(g, 1.0), 0.5 + grain * 0.6 + (fine - 0.5) * 0.2, 0.5)


def carpet_dolby(n=N):
    """Corridor carpet after the Dolby picture (2.4 m tile): blue-grey watercolour drifts, darker slate pools, fine light streaks, cut pile."""
    x, y = grid(n)
    wx = spectral(n, 2.2, 1, 5, 711); wy = spectral(n, 2.2, 1, 5, 712)
    X = x + (wx - 0.5) * 0.35 * n; Y = y + (wy - 0.5) * 0.12 * n
    drift = sample(spectral(n, 1.6, 1, 12, 713, aniso=(1.0, 0.4)), X, Y)       # soft patches stretched along the corridor (v)
    pools = sample(spectral(n, 1.8, 2, 18, 714, aniso=(1.0, 0.5)), X, Y)
    streak = sample(ridges(n, 715, 3, 16, 0.12, 12.0), X, Y)
    slate, mid, pale, ink = lin('#2b3440'), lin('#5a6676'), lin('#a3aab3'), lin('#1c222b')
    t = smooth(0.3, 0.72, drift)
    out = mix(slate, mid, t)
    out = mix(out, pale, smooth(0.62, 0.86, drift) * 0.75)
    out = mix(out, ink, smooth(0.62, 0.8, pools) * 0.55)
    out = mix(out, pale * 1.1, streak * 0.12)
    pile = spectral(n, 0.3, 120, 256, 716)
    out = out * (0.84 + 0.32 * pile[..., None])
    return save('carpet_dolby', srgb(out), pile * 0.55 + drift * 0.1, 0.8)


def perforated(n=N):
    """Perforated aluminium facade panels (absolute, 1.0 m tile): dark anodised sheet, round holes on a 25 mm grid whose size drifts in waves
    (bigger holes let more light through: the backlit facade reads as a soft pattern). The engine makes it glow: emission = albedo."""
    x, y = grid(n); k = 40
    X, Y = x / n * k, y / n * k
    cx, cy = (X % 1) - 0.5, (Y % 1) - 0.5
    ix, iy = np.floor(X), np.floor(Y)
    wave = 0.5 + 0.5 * np.sin((ix / k) * 2 * np.pi * 2 + np.sin((iy / k) * 2 * np.pi) * 1.6) * np.cos((iy / k) * 2 * np.pi)
    jit = np.random.default_rng(721).uniform(0, 1, (k, k))[(iy % k).astype(int), (ix % k).astype(int)]
    rad = 0.06 + 0.3 * np.clip(wave * 0.85 + jit * 0.25 - 0.1, 0, 1)
    d = np.sqrt(cx * cx + cy * cy)
    hole = smooth(rad + 0.03, rad - 0.03, d)
    sheet, glow = lin('#2d2f33'), lin('#ffd49a')
    out = mix(sheet * (0.9 + 0.2 * spectral(n, 2.0, 1, 6, 722)[..., None]), glow, hole)
    return save('perforated', srgb(out), 1 - hole, 1.2)


ALL = [stone_light, carpet_dolby, perforated, velvet, leather, walnut, slats, chevron, geotile, terrazzo, marble, brushed, powder, flat, plaster, concrete, woven,
       carpet_deco, carpet_hall, asphalt, paving, squaretile, granite, fluted, brick, porcelain, walltile, calacatta]

if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    sheet = sys.argv[sys.argv.index('--sheet') + 1] if '--sheet' in sys.argv else None
    if sheet in args: args.remove(sheet)
    todo = [f for f in ALL if not args or f.__name__ in args]
    for f in todo:
        f(); print('wrote', f.__name__)
    if sheet:
        T = 256; cols = 6; names = [f.__name__ for f in todo]; rows = (len(names) + cols - 1) // cols
        S = Image.new('RGB', (cols * T, rows * T * 2))
        for i, name in enumerate(names):
            im = Image.open(os.path.join(OUT, f'{name}_a.jpg')).resize((T, T)); nm = Image.open(os.path.join(OUT, f'{name}_n.jpg')).resize((T, T))
            S.paste(im, ((i % cols) * T, (i // cols) * 2 * T)); S.paste(nm, ((i % cols) * T, (i // cols) * 2 * T + T))
        S.save(sheet, quality=85)
