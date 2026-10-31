#!/usr/bin/env python3
"""LUMIERE v8 - film posters (www/films/<id>.jpg, 512 x 768) from a frame of each open film + typography.
usage: posters.py FILM_DIR OUT_DIR   (FILM_DIR holds <id>.mp4; needs ffmpeg + Pillow). Frames and crops were picked by eye from contact sheets."""
import sys, subprocess, io, os
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
FD, OUT = sys.argv[1], sys.argv[2]
FONTS = os.path.join(os.path.dirname(__file__), '..', 'blender', 'fonts')
SERIF, SANS, BOLD = (os.path.join(FONTS, f) for f in ('CormorantGaramond-SemiBold.ttf', 'Inter-SemiBold.ttf', 'Inter-ExtraBold.ttf'))
# id: (frame time s, horizontal centre of the crop 0..1, title face, title lines, accent colour, tagline, credit)
P = {
  'sintel':    (349, 0.47, SERIF, ['SINTEL'], (236, 120, 80), 'A girl. A dragon. A long way home.', 'BLENDER FOUNDATION · 2010 · CC BY 3.0'),
  'cosmos':    (232, 0.52, SERIF, ['COSMOS', 'LAUNDROMAT'], (255, 140, 90), 'One sheep. Infinite lives.', 'BLENDER INSTITUTE · 2015 · CC BY 4.0'),
  'bunny':     (156, 0.50, BOLD, ['BIG BUCK', 'BUNNY'], (255, 196, 80), 'Payback has never been this fluffy.', 'BLENDER FOUNDATION · 2008 · CC BY 3.0'),
  'hero':      (125, 0.62, BOLD, ['HERO'], (255, 120, 70), 'Two rivals. One last stand.', 'BLENDER ANIMATION STUDIO · 2018 · CC BY 4.0'),
  'wingit':    (18, 0.42, BOLD, ['WING IT!'], (255, 150, 60), 'A dog. A rocket. No plan.', 'BLENDER STUDIO · 2023 · CC BY 4.0'),
  'agent327':  (14, 0.52, SERIF, ['AGENT 327'], (230, 60, 60), 'Licensed to trim.', 'BLENDER ANIMATION STUDIO · 2017 · CC BY'),
  'llamigos':  (17, 0.36, BOLD, ['CAMINANDES', 'LLAMIGOS'], (240, 70, 80), 'Winter is hungry.', 'BLENDER INSTITUTE · 2016 · CC BY 3.0'),
  'glasshalf': (34, 0.55, SERIF, ['GLASS HALF'], (255, 210, 60), 'Art is in the eye of the beholder.', 'BLENDER INSTITUTE · 2015 · CC BY'),
  'coffeerun': (42, 0.45, BOLD, ['COFFEE RUN'], (120, 200, 255), 'Fuelled by caffeine. Running from the past.', 'BLENDER STUDIO · 2020 · CC BY 4.0'),
}
W, H = 512, 768
def frame(fid, t):
    png = subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(t), '-i', os.path.join(FD, fid + '.mp4'), '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'png', '-'], capture_output=True, check=True).stdout
    return Image.open(io.BytesIO(png)).convert('RGB')
def tracked(d, xy, text, font, fill, spacing):
    x, y = xy
    for ch in text: d.text((x, y), ch, font=font, fill=fill); x += d.textlength(ch, font=font) + spacing
def width(d, text, font, spacing): return sum(d.textlength(ch, font=font) for ch in text) + spacing * (len(text) - 1)
for fid, (t, cx, face, lines, acc, tag, credit) in P.items():
    im = frame(fid, t)
    rows = [y for y in range(im.height) if max(im.crop((0, y, im.width, y + 1)).convert('L').getextrema()) > 24]   # drop letterbox bars
    if rows: im = im.crop((0, rows[0], im.width, rows[-1] + 1))
    s = H / im.height; im = im.resize((max(W, round(im.width * s)), H), Image.LANCZOS)
    x0 = int(min(max(0, cx * im.width - W / 2), im.width - W)); im = im.crop((x0, 0, x0 + W, H))
    im = ImageEnhance.Contrast(im).enhance(1.08)
    # dark grade toward the bottom (and a little at the top) so the type reads
    g = Image.new('L', (1, H)); [g.putpixel((0, y), int(255 * (max(0, (y / H - 0.42) / 0.58) ** 1.3 * 0.92 + max(0, (0.16 - y / H) / 0.16) * 0.55))) for y in range(H)]
    im = Image.composite(Image.new('RGB', (W, H), (8, 7, 10)), im, g.resize((W, H)))
    d = ImageDraw.Draw(im); top = ImageFont.truetype(SANS, 15)
    tracked(d, ((W - width(d, 'LUMIÈRE PRESENTS', top, 4)) / 2, 26), 'LUMIÈRE PRESENTS', top, (235, 225, 210), 4)
    size = 92 if face == SERIF else 74; longest = max(lines, key=len)
    while True:
        f = ImageFont.truetype(face, size); sp = size * (0.06 if face == SERIF else 0.02)
        if width(d, longest, f, sp) <= W - 56 or size < 30: break
        size -= 2
    y = H - 168 - (len(lines) - 1) * size * 0.92
    for ln in lines:
        w = width(d, ln, f, sp); sh = Image.new('RGBA', (W, H), (0, 0, 0, 0)); ImageDraw.Draw(sh).text(((W - w) / 2 + 2, y + 3), ln, font=f, fill=(0, 0, 0, 170)); im.paste(sh.filter(ImageFilter.GaussianBlur(4)), (0, 0), sh.filter(ImageFilter.GaussianBlur(4)))
        d = ImageDraw.Draw(im); tracked(d, ((W - w) / 2, y), ln, f, (250, 246, 238), sp); y += size * 0.92
    d.rectangle([W / 2 - 26, H - 82, W / 2 + 26, H - 79], fill=acc)
    tf = ImageFont.truetype(SANS, 17); d.text(((W - d.textlength(tag, font=tf)) / 2, H - 70), tag, font=tf, fill=(230, 222, 210))
    cf = ImageFont.truetype(SANS, 11); tracked(d, ((W - width(d, credit, cf, 1.5)) / 2, H - 36), credit, cf, (170, 162, 150), 1.5)
    im.save(os.path.join(OUT, fid + '.jpg'), quality=84, optimize=True, progressive=True); print(fid, os.path.getsize(os.path.join(OUT, fid + '.jpg')))
