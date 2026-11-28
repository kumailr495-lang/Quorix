#!/usr/bin/env python3
"""LUMIERE material library, scanned layer: real photo-scanned PBR textures (CC0) from Poly Haven and ambientCG,
converted into the engine's texture slots (www/tex/<slot>_a.jpg albedo, <slot>_n.jpg normal, 512 px, tileable).

Run after gen.py (gen.py makes the procedural baseline; this replaces the slots below with scans):
    python3 tools/textures/gen.py && python3 tools/textures/fetch_cc0.py
Needs curl, numpy and Pillow (all available in Termux). Downloads are cached in tools/textures/.cache (git-ignored).

Licence: every source here is CC0 1.0 (public domain): free for any use, no attribution required. We still record
each source in tools/textures/SOURCES.md.

Slot modes (see www/js/library.js):
  'rel'       the scan's luminance detail around mid-grey (the engine tints it), contrast scaled by `spread`
  'rebalance' keeps the scan's own colour variation but moves its average colour to `color` (e.g. grey a brown terrazzo)
  'abs'       the scan's colours as they are
Composites keep a designed layout (slats, flutes, the deco carpet, the geometric tile) and take their surface from a scan.
"""
import os, sys, json, subprocess, zipfile, io
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gen

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, '.cache')
OUT = gen.OUT
N = 512

# slot -> source. mpt = metres per texture tile (the physical size of the scan; also written into library.js by hand)
SLOTS = {
    'walnut':      dict(src='ph', id='walnut_veneer', mode='rel', spread=1.15, mpt=1.8),
    'chevron':     dict(src='ph', id='herringbone_parquet', mode='abs', gain=1.0, mpt=3.4),
    'marble':      dict(src='acg', id='Marble017', mode='abs', gain=0.9, mpt=1.6),
    'calacatta':   dict(src='acg', id='Marble012', mode='abs', gain=1.0, mpt=1.6),
    'terrazzo':    dict(src='ph', id='terrazzo_tiles', mode='rebalance', color='#b9b2a7', mpt=2.0),
    'porcelain':   dict(src='ph', id='interior_tiles', mode='rebalance', color='#c4beb3', mpt=1.9),
    'walltile':    dict(src='ph', id='long_white_tiles', mode='rel', spread=1.0, mpt=1.27),
    'squaretile':  dict(src='ph', id='large_square_pattern_01', mode='rel', spread=1.0, mpt=3.0),
    'paving':      dict(src='ph', id='square_concrete_pavers', mode='rel', spread=1.0, mpt=1.8),
    'asphalt':     dict(src='ph', id='asphalt_floor', mode='rel', spread=1.0, mpt=2.35),
    'concrete':    dict(src='ph', id='concrete_floor_01', mode='rel', spread=0.8, mpt=2.0),
    'plaster':     dict(src='ph', id='white_stucco', mode='rel', spread=0.7, mpt=2.0),
    'velvet':      dict(src='ph', id='velour_velvet', mode='rel', spread=1.0, mpt=0.28),
    'leather':     dict(src='ph', id='leather_white', mode='rel', spread=1.0, mpt=0.3),
    'woven':       dict(src='ph', id='rough_linen', mode='rel', spread=1.0, mpt=0.27),
    'carpet_hall': dict(src='acg', id='Carpet012', mode='rel', spread=1.0, mpt=0.5),
    'brushed':     dict(src='acg', id='Metal009', mode='rel', spread=1.0, mpt=0.5),
    # v7 (docs/V7-DESIGN.md): Allu-style black marble, backlit onyx for the bar, black terrazzo for the IMAX gateway, granite pavers outside
    'nero':        dict(src='acg', id='Marble016', mode='abs', gain=0.85, mpt=1.6),
    'onyx':        dict(src='acg', id='Onyx007', mode='abs', gain=1.0, mpt=1.0),
    'terrazzo_black': dict(src='acg', id='Terrazzo003', mode='abs', gain=0.9, mpt=1.2),
    'plaza':       dict(src='ph', id='granite_tile_03', mode='rebalance', color='#86837f', mpt=1.8),
    # v9.1 (the user, 2026-11-06: "use good textures from online, not one colour pasted everywhere"): every generated slot the rooms use
    # becomes a scan, and the rooms get stone, wood, tile and plaster of their own
    'paintwall':   dict(src='acg', id='Plaster001', mode='rel', spread=0.9, mpt=2.5),      # painted plaster: every painted wall and ceiling
    'powder':      dict(src='acg', id='Metal029', mode='rel', spread=0.35, mpt=0.8),        # powder-coated steel (mullions, frames, shafts)
    'travertine':  dict(src='acg', id='Travertine009', mode='abs', gain=1.0, mpt=1.2),     # honed travertine (lobby walls, columns)
    'oak':         dict(src='ph', id='oak_veneer_01', mode='rel', spread=1.1, mpt=1.83),   # light oak veneer panels (exit spine)
    'nero_gold':   dict(src='acg', id='Marble013', mode='abs', gain=0.95, mpt=1.6),       # black marble with gold veins (Allu-style accents)
    'wc_wall':     dict(src='acg', id='Tiles107', mode='abs', gain=1.0, mpt=1.8),          # large white wall tiles with grout (restrooms)
    'wc_floor':    dict(src='acg', id='Tiles052', mode='abs', gain=1.0, mpt=3.6),          # dark porcelain floor tiles (restrooms)
    'microcement': dict(src='acg', id='Concrete034', mode='rel', spread=0.85, mpt=2.2),    # smooth microcement (soffits, back-of-house)
    'stone_rel':   dict(src='acg', id='Travertine009', mode='rel', spread=0.8, mpt=1.2),   # light stone detail, tinted (spine floor, stairs, facade)
}
# slots that also ship a roughness map (<slot>_r.jpg; library.js ROUGH)
ROUGH = {'stone_rel', 'stone_light', 'paintwall', 'powder', 'travertine', 'oak', 'nero_gold', 'wc_wall', 'wc_floor', 'spine_floor', 'microcement', 'marble', 'calacatta', 'nero', 'terrazzo', 'terrazzo_black', 'walnut', 'leather', 'plaza'}
# composites: a designed layout over a scanned surface
COMPOSITES = {
    'slats':       dict(src='ph', id='black_walnut_veneer_02', mpt=0.4),
    'fluted':      dict(src='ph', id='black_walnut_veneer_02', mpt=0.4),
    'carpet_deco': dict(src='acg', id='Carpet012', mpt=2.4),
    'geotile':     dict(src='ph', id='marble_01', mpt=1.2),
    'rosso':       dict(src='acg', id='Marble016', mpt=1.6),   # v7: the black marble's veins on a deep red ground (Rosso Levanto look) for the lobby columns
    # v9.1: the lobby floor in polished crema marble tiles, every tile cut from another part of the scan; the corridor's carpet pattern
    'stone_light': dict(src='acg', id='Marble014', mpt=2.4),
    'carpet_dolby': dict(src='acg', id='Carpet012', mpt=2.4),
}


def curl(url, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if os.path.exists(path) and os.path.getsize(path) > 1000: return path
    subprocess.run(['curl', '-sSfL', '--retry', '3', '--max-time', '300', '-o', path + '.part', url], check=True)
    os.replace(path + '.part', path); return path


def fetch(src, aid):
    """Returns (albedo PIL image, normal PIL image, source url) for a CC0 asset, cached."""
    if src == 'ph':
        meta_path = os.path.join(CACHE, f'ph_{aid}.json')
        if not os.path.exists(meta_path): curl(f'https://api.polyhaven.com/files/{aid}', meta_path)
        meta = json.load(open(meta_path))
        du = meta['Diffuse']['1k']['jpg']['url']; nu = meta['nor_gl']['1k']['jpg']['url']
        a = Image.open(curl(du, os.path.join(CACHE, f'ph_{aid}_diff.jpg'))); n = Image.open(curl(nu, os.path.join(CACHE, f'ph_{aid}_nor.jpg')))
        r = Image.open(curl(meta['Rough']['1k']['jpg']['url'], os.path.join(CACHE, f'ph_{aid}_rough.jpg'))) if 'Rough' in meta else None
        fetch.rough = r
        return a, n, f'https://polyhaven.com/a/{aid}'
    zp = curl(f'https://ambientcg.com/get?file={aid}_1K-JPG.zip', os.path.join(CACHE, f'acg_{aid}_1K-JPG.zip'))
    z = zipfile.ZipFile(zp); names = z.namelist()
    pick = lambda key: next(x for x in names if key in x and x.lower().endswith('.jpg'))
    a = Image.open(io.BytesIO(z.read(pick('_Color')))); n = Image.open(io.BytesIO(z.read(pick('_NormalGL'))))
    fetch.rough = Image.open(io.BytesIO(z.read(pick('_Roughness')))) if any('_Roughness' in x for x in names) else None
    return a, n, f'https://ambientcg.com/view?id={aid}'


def resample(img, n=N):
    """Wrap-safe downsample of a seamless texture: tile 3x3, resize, keep the middle (no dark or bright seams)."""
    im = img.convert('RGB'); w, h = im.size
    big = Image.new('RGB', (w * 3, h * 3))
    for i in range(3):
        for j in range(3): big.paste(im, (i * w, j * h))
    big = big.resize((n * 3, n * 3), Image.LANCZOS)
    return np.asarray(big.crop((n, n, 2 * n, 2 * n))).astype(np.float64) / 255.0


def to_lin(s): return np.clip(s, 0, 1) ** 2.2
def to_s(l): return np.clip(l, 0, 1) ** (1 / 2.2)


def normal_resampled(img):
    v = resample(img) * 2 - 1
    l = np.linalg.norm(v, axis=-1, keepdims=True); v = v / np.maximum(l, 1e-6)
    return v * 0.5 + 0.5


def save_pair(slot, alb_srgb, nrm01, q=90):
    Image.fromarray((np.clip(alb_srgb, 0, 1) * 255 + 0.5).astype(np.uint8), 'RGB').save(os.path.join(OUT, f'{slot}_a.jpg'), quality=q, optimize=True, subsampling=0)
    Image.fromarray((np.clip(nrm01, 0, 1) * 255 + 0.5).astype(np.uint8), 'RGB').save(os.path.join(OUT, f'{slot}_n.jpg'), quality=93, optimize=True, subsampling=0)


def lum(lin_rgb): return lin_rgb @ np.array([0.2126, 0.7152, 0.0722])


def rel_from(lin_rgb, spread):
    """Relative albedo bytes: 0.5 * L / mean(L), contrast scaled around 0.5 (stored as linear data, the engine tints it)."""
    L = lum(lin_rgb); r = 0.5 * L / max(L.mean(), 1e-6)
    r = 0.5 + (r - 0.5) * spread
    return np.repeat(np.clip(r, 0, 1)[..., None], 3, -1)


def build_slot(slot, s):
    a, n, url = fetch(s['src'], s['id'])
    A = to_lin(resample(a)); Nm = normal_resampled(n)
    if s['mode'] == 'rel': out = rel_from(A, s.get('spread', 1.0))
    elif s['mode'] == 'rebalance': m = A.reshape(-1, 3).mean(0); out = to_s(A / np.maximum(m, 1e-6) * gen.lin(s['color']))
    else: out = to_s(A * s.get('gain', 1.0))
    save_pair(slot, out, Nm); save_rough(slot); return url


def save_rough(slot, R=None):
    """<slot>_r.jpg: the scan's roughness, divided by its mean and halved (0.5 = the material's own roughness in www/js/library.js)"""
    R = R if R is not None else getattr(fetch, 'rough', None)
    if R is None or slot not in ROUGH: return
    g = resample(R.convert('RGB'))[..., 0]; g = np.clip(0.5 * g / max(g.mean(), 1e-6), 0, 1)
    Image.fromarray((g * 255 + 0.5).astype(np.uint8), 'L').save(os.path.join(OUT, f'{slot}_r.jpg'), quality=90, optimize=True)


def composite(slot, s):
    a, n, url = fetch(s['src'], s['id'])
    A = to_lin(resample(a)); Nm = normal_resampled(n); Lr = lum(A) / max(lum(A).mean(), 1e-6)   # scanned surface, mean 1
    x, y = gen.grid(N)
    if slot in ('slats', 'fluted'):
        k = 8; sx = (x / N * k) % 1.0; idx = np.floor(x / N * k).astype(int)
        shift = np.random.default_rng(42).uniform(-0.06, 0.06, k)[idx]
        if slot == 'slats':   # 5 cm slats, 8 mm shadow groove; each slat a different stretch of grain (rolled scan)
            g = np.zeros((N, N));
            for i in range(k): g[:, i * N // k:(i + 1) * N // k] = np.roll(Lr, i * 97, axis=0)[:, i * N // k:(i + 1) * N // k]
            groove = gen.smooth(0.0, 0.16, np.minimum(sx, 1 - sx)); edge = gen.smooth(0.0, 0.06, np.minimum(sx, 1 - sx))
            v = (0.5 * g + shift) * (0.18 + 0.82 * groove); h = edge * 0.85 + (g - 1) * 0.05
        else:                 # fluted: concave 5 cm flutes, grain along them
            prof = np.sqrt(np.clip(1 - ((sx - 0.5) / 0.5) ** 2, 0, 1))
            v = 0.5 * Lr * (0.72 + 0.28 * prof) + shift; h = prof
        save_pair(slot, np.repeat(np.clip(v, 0, 1)[..., None], 3, -1), gen.normal_from_height(h, 2.6 if slot == 'fluted' else 5.0)); return url
    if slot == 'carpet_deco':   # the designed deco pattern (gen.py) carried on a real cut-pile surface
        gen.carpet_deco(); base = to_lin(np.asarray(Image.open(os.path.join(OUT, 'carpet_deco_a.jpg'))).astype(np.float64) / 255)
        pile = np.clip(Lr, 0.6, 1.5)[..., None]
        save_pair(slot, to_s(base / np.maximum(base.mean((0, 1)), 1e-6) * base.mean((0, 1)) * (0.75 + 0.25 * pile)), Nm); return url
    if slot == 'geotile':       # the designed geometric tile (gen.py) with a honed-stone surface inside each tile
        gen.geotile(); base = to_lin(np.asarray(Image.open(os.path.join(OUT, 'geotile_a.jpg'))).astype(np.float64) / 255)
        save_pair(slot, to_s(base * (0.88 + 0.12 * np.clip(Lr, 0.5, 1.5))[..., None]), np.asarray(Image.open(os.path.join(OUT, 'geotile_n.jpg'))).astype(np.float64) / 255); return url
    if slot == 'rosso':
        L = lum(A); med = np.median(L); vein = np.clip((L - med * 1.6) / (np.percentile(L, 99.5) - med * 1.6 + 1e-6), 0, 1) ** 0.8
        x, y = gen.grid(N); cloud = gen.spectral(N, 2.2, 1, 8, 731)[..., None]
        ground = gen.mix(gen.lin('#3a0b10'), gen.lin('#6e1a1c'), np.clip(L / (med * 1.6), 0, 1)) * (0.85 + 0.3 * cloud)
        save_pair(slot, to_s(gen.mix(ground, gen.lin('#e6d6cc'), vein * 0.9)), Nm); return url
    if slot == 'stone_light':   # 1.2 m tiles, 2 x 2 per texture, each from a different (sometimes mirrored) part of the seamless scan, a slight
        # tone change from tile to tile, 2 mm grout; polished: the normal comes from the joints only
        rng = np.random.default_rng(91); out = np.zeros_like(A); T_ = N // 2
        for ti in range(2):
            for tj in range(2):
                dy, dx = rng.integers(0, N, 2); R_ = np.roll(np.roll(A, int(dy), 0), int(dx), 1)
                if rng.random() < 0.5: R_ = R_[:, ::-1]
                out[ti * T_:(ti + 1) * T_, tj * T_:(tj + 1) * T_] = R_[ti * T_:(ti + 1) * T_, tj * T_:(tj + 1) * T_] * rng.uniform(0.95, 1.05)
        gx = np.minimum(x % T_, T_ - (x % T_)); gy = np.minimum(y % T_, T_ - (y % T_)); groove = gen.smooth(0.0, 1.4, np.minimum(gx, gy))
        out = out * (0.5 + 0.5 * groove)[..., None]; rough = 0.5 * (1.6 - 0.6 * groove)   # the joints are matte
        save_pair(slot, to_s(out), gen.normal_from_height(groove, 1.2)); save_rough(slot, Image.fromarray((np.clip(rough / 1.0, 0, 1) * 255).astype(np.uint8)).convert('RGB')); return url
    if slot == 'carpet_dolby':  # deep indigo cut pile, a tone-on-tone diamond lattice (the corridor's diamond walls) and a thin gold line on
        # every other lattice row, carried on a real carpet's pile
        u, v = x / N, y / N; k = 4; a_, b_ = (u * k + v * k) % 1.0, (u * k - v * k) % 1.0
        line = np.minimum(np.minimum(a_, 1 - a_), np.minimum(b_, 1 - b_)); lat = gen.smooth(0.0, 0.035, line)
        cell = (np.floor(u * k + v * k) + np.floor(u * k - v * k)) % 2
        base = gen.mix(gen.lin('#141834'), gen.lin('#1d2247'), cell[..., None]); col = gen.mix(gen.lin('#0c0e20'), base, lat[..., None])
        gold = (1 - gen.smooth(0.0, 0.012, np.abs(a_ - 0.5))) * (np.floor(u * k + v * k) % 2 == 0); col = gen.mix(col, gen.lin('#a8834a'), (gold * 0.85)[..., None])
        pile = np.clip(Lr, 0.6, 1.5)[..., None]; save_pair(slot, to_s(col * (0.76 + 0.24 * pile)), Nm); return url
    raise ValueError(slot)


if __name__ == '__main__':
    only = sys.argv[1:]
    rows = []
    for slot, s in SLOTS.items():
        if only and slot not in only: continue
        url = build_slot(slot, s); rows.append((slot, s['id'], url, s['mpt'], s['mode'])); print('scan', slot, '<-', s['id'])
    for slot, s in COMPOSITES.items():
        if only and slot not in only: continue
        url = composite(slot, s); rows.append((slot, s['id'], url, s['mpt'], 'composite')); print('composite', slot, '<-', s['id'])
    if only:   # merge: keep the other rows of the table as they are
        path = os.path.join(HERE, 'SOURCES.md'); lines = open(path).read().splitlines(); keep = [l for l in lines if not (l.startswith('| ') and l.split('|')[1].strip() in [r[0] for r in rows])]
        open(path, 'w').write('\n'.join(keep + [f'| {r[0]} | {r[1]} | {r[2]} | {r[3]} | {r[4]} |' for r in rows]) + '\n')
    if not only:
        with open(os.path.join(HERE, 'SOURCES.md'), 'w') as f:
            f.write('# Texture sources\n\nScanned PBR textures, all **CC0 1.0** (public domain, no attribution required), converted by `fetch_cc0.py`.\n'
                    'Slots not listed here are generated by `gen.py` (brick, flat, powder, granite).\n\n| Slot | Source asset | Link | Metres per tile | Mode |\n|---|---|---|---|---|\n')
            for r in rows: f.write(f'| {r[0]} | {r[1]} | {r[2]} | {r[3]} | {r[4]} |\n')
