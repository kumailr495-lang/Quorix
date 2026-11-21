"""Light-map pipeline, step 3 (system Python with Pillow; runs in Termux too): re-encode the baked PNG light maps as high-quality JPEG
and point www/bake/index.json at them. Light maps are smooth, so JPEG at quality 94 with full-resolution colour (4:4:4) is visually the
same as the PNG at about a quarter of the size, which keeps the APK and the git history small. Maps above 1536 px are downscaled to
1536 (Lanczos): about 31 texels a metre in the halls, and 44 % less GPU memory on the phone than 2048.

    python3 tools/bake/compress.py [www/bake]

Re-running is safe: maps already in JPEG are skipped; a PNG is removed only after its JPEG is written.
"""
import json, os, sys
from PIL import Image

base = sys.argv[1] if len(sys.argv) > 1 else 'www/bake'
MAXRES = 1536   # light maps are smooth: 1536 keeps about 31 texels a metre in the halls (the bake margin of 6 px becomes 4.5 px)
ip = os.path.join(base, 'index.json')
idx = json.load(open(ip))
before = after = 0
for key, m in idx['rooms'].items():
    out = []
    for f in m['maps']:
        src = os.path.join(base, f)
        if not f.endswith('.png') or not os.path.exists(src):
            out.append(f); continue
        jpg = f[:-4] + '.jpg'; dst = os.path.join(base, jpg); im = Image.open(src).convert('RGB')
        if im.width > MAXRES: im = im.resize((MAXRES, MAXRES), Image.LANCZOS)   # GPU memory: a 2048 map is 16.8 MB on the phone, 1536 is 9.4 MB
        im.save(dst, 'JPEG', quality=94, subsampling=0, optimize=True)
        before += os.path.getsize(src); after += os.path.getsize(dst); os.remove(src); out.append(jpg)
        print(f'{f:>18} -> {jpg}')
    m['maps'] = out
json.dump(idx, open(ip, 'w'), indent=1, sort_keys=True)
print(f'light maps: {before / 1e6:.1f} MB PNG -> {after / 1e6:.1f} MB JPEG')
