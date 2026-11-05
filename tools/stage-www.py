#!/usr/bin/env python3
"""LUMIERE v9 - the www/ that goes into the APK: everything the game loads and nothing else.
  - leaves out www/dev (test videos) and the v7/v8 models the v9 rooms don't place (assets.js ASSET_LIST; people and animations stay)
  - only the voice clips each language's manifest lists (www/voice/<lang>/index.json)
  - the halls' fixed-light and screen-light maps (soft, low-frequency light) and the spine and street maps at 1024 px instead of 2048:
    about 90 MB less GPU memory on the phone; the light-map UVs are normalised, so nothing else changes
usage: python3 tools/stage-www.py OUT_DIR   (then: python3 tools/make-apk.py BASE.apk OUT_DIR OUT.apk 900 9.00)"""
import sys, os, re, json, shutil
from PIL import Image

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')); WWW = os.path.join(ROOT, 'www'); OUT = sys.argv[1]
if os.path.exists(OUT): shutil.rmtree(OUT)
src = open(os.path.join(WWW, 'js', 'assets.js'), encoding='utf8').read()
lst = re.search(r"export const ASSET_LIST = \[(.*?)\];", src, re.S).group(1); keep_models = set(re.findall(r"'([a-z0-9_]+)'", lst)) | {'people_male', 'people_female', 'anims'}
SMALL = re.compile(r"^(hall[A-Za-z0-9]+_(f|s)|spine_h|street_h)\.jpg$")
n_files = n_bytes = 0; VOICE = {}
for d, dirs, files in os.walk(WWW):
    rel = os.path.relpath(d, WWW); dirs.sort()
    if rel.split(os.sep)[0] in ('dev',): dirs[:] = []; continue
    for f in sorted(files):
        s = os.path.join(d, f)
        r = os.path.normpath(os.path.join(rel, f)); dst = os.path.join(OUT, r)
        if r.startswith('models' + os.sep) and r.endswith('.glb') and os.path.dirname(r) == 'models' and f[:-4] not in keep_models: continue
        if r == 'v9.html': continue
        if r.startswith('voice' + os.sep) and f.endswith('.ogg'):
            lang = r.split(os.sep)[1]; man = os.path.join(WWW, 'voice', lang, 'index.json')
            try: M = VOICE.setdefault(lang, set(json.load(open(man, encoding='utf8'))['c'].keys()))
            except Exception: M = set()
            if os.path.relpath(s, os.path.join(WWW, 'voice', lang))[:-4].replace(os.sep, '/') not in M: continue
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        if r.startswith('bake' + os.sep) and SMALL.match(f):
            im = Image.open(s); im = im.resize((1024, 1024), Image.LANCZOS) if im.size[0] > 1024 else im; im.save(dst, quality=90)
        else: shutil.copyfile(s, dst)
        n_files += 1; n_bytes += os.path.getsize(dst)
print(f'staged {n_files} files, {n_bytes / 1048576:.1f} MB -> {OUT}')
