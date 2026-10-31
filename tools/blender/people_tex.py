#!/usr/bin/env python3
"""LUMIERE v8 - textures for the people (www/models/people/): the CC0 base characters' skin, hair and eye maps, downscaled for a phone
(skin 1024, hair 512, eye 128). The skin's average colour is written to tex.json: the engine divides by it and multiplies by each person's
skin tone, so one painted face texture serves every skin tone.
usage: people_tex.py UBC_DIR OUT_DIR   (Pillow)"""
import sys, os, json
from PIL import Image, ImageStat
ubc, out = sys.argv[1], sys.argv[2]; os.makedirs(out, exist_ok=True)
base = os.path.join(ubc, 'Base Characters', 'Godot - UE')
def save(src, dst, size, q=86):
    im = Image.open(os.path.join(base, src)).convert('RGB').resize((size, size), Image.LANCZOS); im.save(os.path.join(out, dst), quality=q, optimize=True, progressive=True); return im
info = {}
for kind, src in (('m', 'T_Superhero_Male_Dark.png'), ('f', 'T_Superhero_Female_Dark_BaseColor.png')):
    im = save(src, f'skin_{kind}.jpg', 1024)
    # average of the skin only: the face and body areas are the bright, warm, low-blue texels (the underwear and texture padding are not)
    px = [p for p in im.resize((128, 128)).getdata() if p[0] > 90 and p[0] > p[2] + 25]
    avg = [sum(c[i] for c in px) / len(px) / 255 for i in range(3)]; info['skin_' + kind] = [round(a, 4) for a in avg]
for kind, src in (('m', 'T_Hair_1_BaseColor.png'), ('f', 'T_Hair_2_BaseColor.png')):
    im = save(src, f'hair_{kind}.jpg', 512); info['hair_' + kind] = [round(a / 255, 4) for a in ImageStat.Stat(im).mean]
save('T_Eye_Brown.png', 'eye.jpg', 128, 90)
json.dump(info, open(os.path.join(out, 'tex.json'), 'w')); print(info)
