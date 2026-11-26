# LUMIERE v14c - loading-screen key art, last step: crop, ink edges, colour grade, vignette and grain on a painted still (tools/art/paint.py)
# usage: python3 tools/art/grade.py IN.png OUT.jpg [x0 y0 x1 y1]   (the crop in IN's pixels; the result is 1600 x 720)
import sys
import numpy as np
from PIL import Image, ImageFilter
src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB')
if len(sys.argv) >= 7: im = im.crop(tuple(int(v) for v in sys.argv[3:7]))
im = im.resize((1600, 720), Image.LANCZOS)
a = np.asarray(im).astype(np.float32) / 255.0
lum = a @ np.array([0.2126, 0.7152, 0.0722], np.float32)
# ink: luminance edges (Sobel) darken the paint a little, like a drawn line under the colour
L8 = Image.fromarray((lum * 255).astype(np.uint8)); ex = np.asarray(L8.filter(ImageFilter.FIND_EDGES)).astype(np.float32) / 255.0
ex = np.clip((ex - 0.06) * 3.0, 0, 1); a *= (1.0 - 0.28 * ex)[..., None]
# contrast: a soft S round mid-grey, blacks lifted a touch (printed, not crushed)
a = np.clip(a, 0, 1); a = a + 0.22 * (a - 0.5) * (1 - np.abs(2 * a - 1)); a = 0.025 + 0.975 * a
# colour: more saturation; teal shadows, warm gold highlights
lum = a @ np.array([0.2126, 0.7152, 0.0722], np.float32); a = lum[..., None] + (a - lum[..., None]) * 1.18
sh = np.clip(1 - lum * 2.2, 0, 1)[..., None]; hi = np.clip(lum * 1.6 - 0.6, 0, 1)[..., None]
a = a + sh * np.array([-0.012, 0.012, 0.03], np.float32) + hi * np.array([0.045, 0.02, -0.03], np.float32)
# vignette
h, w = lum.shape; yy, xx = np.mgrid[0:h, 0:w].astype(np.float32); r = np.sqrt(((xx - w / 2) / (w / 2)) ** 2 + ((yy - h * 0.45) / (h / 2)) ** 2)
a *= (1 - 0.32 * np.clip(r - 0.55, 0, 1) ** 1.4)[..., None]
# grain
rng = np.random.default_rng(14); a += rng.normal(0, 0.012, a.shape).astype(np.float32)
Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8)).save(dst, quality=86, optimize=True, progressive=True)
print('GRADED', dst)
