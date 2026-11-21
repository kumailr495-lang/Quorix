#!/usr/bin/env python3
"""LUMIERE v8 - offline track for an open film (www/films/<id>.json), made from the real film file.
  light: the picture's colour every 1/4 s in three bands (left, centre, right) of the active picture (letterbox bars removed), sRGB bytes,
         base64; film.js lights the hall with it (the stream itself cannot be read: archive.org sends no CORS headers).
  cues:  moments an audience reacts to, found in the film's own sound (EBU R128 momentary/short-term loudness) and picture
         (brightness jumps, cuts): scare (loud hit straight out of quiet), gasp (sharp onset), climax (long loud stretch that releases),
         tension (a long build), laugh (comedy: a sharp gag hit; the genre decides), aww (drama: a quiet bright moment after a peak);
         cool-downs keep them rare (phone feedback: "they scream at scenes which don't make sense").
  end:   when the credits start (applause, house lights to a third).
usage: analyse.py FILM.mp4 ID GENRE OUT_DIR [--end SECONDS]   needs ffmpeg + numpy."""
import sys, json, base64, subprocess, re, argparse
import numpy as np
ap = argparse.ArgumentParser(); ap.add_argument('film'); ap.add_argument('id'); ap.add_argument('genre'); ap.add_argument('out'); ap.add_argument('--end', type=float, default=None); ap.add_argument('--hz', type=float, default=4)
A = ap.parse_args()
W, H, HZ = 48, 27, A.hz
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', A.film, '-vf', f'fps={HZ},scale={W}:{H}:flags=area', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True).stdout
fr = np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3).astype(np.float32) / 255.0
n = fr.shape[0]
# letterbox: rows that stay black for the whole film
rowmax = np.percentile(fr.mean(axis=3).max(axis=2), 99.5, axis=0)
act = np.where(rowmax > 0.06)[0]; r0, r1 = (int(act[0]), int(act[-1]) + 1) if len(act) else (0, H)
pic = fr[:, r0:r1]
probe = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-show_entries', 'format=duration', '-of', 'json', A.film], capture_output=True, check=True).stdout)
vw, vh = probe['streams'][0]['width'], probe['streams'][0]['height']; dur = float(probe['format']['duration'])
aspect = vw / (vh * (r1 - r0) / H)
# three bands, light-weighted (the brightest parts of the picture light the room most): mean of linear light, back to sRGB bytes
lin = np.where(pic <= 0.04045, pic / 12.92, ((pic + 0.055) / 1.055) ** 2.4)
bands = [lin[:, :, :W // 3], lin[:, :, W // 3: 2 * W // 3], lin[:, :, 2 * W // 3:]]
mean = np.stack([b.mean(axis=(1, 2)) for b in bands], axis=1)          # n x 3 bands x rgb
srgb = np.where(mean <= 0.0031308, mean * 12.92, 1.055 * np.power(mean, 1 / 2.4) - 0.055)
light = np.clip(np.round(srgb * 255), 0, 255).astype(np.uint8).reshape(n, 9)
lum = (0.2126 * mean[:, 1, 0] + 0.7152 * mean[:, 1, 1] + 0.0722 * mean[:, 1, 2])
diff = np.concatenate([[0], np.abs(np.diff(pic.mean(axis=3), axis=0)).mean(axis=(1, 2))])   # picture change per sample (cuts, flashes)
# sound: momentary (0.4 s) and short-term (3 s) loudness every 0.1 s
log = subprocess.run(['ffmpeg', '-nostats', '-v', 'verbose', '-i', A.film, '-vn', '-af', 'ebur128=framelog=verbose', '-f', 'null', '-'], capture_output=True, text=True).stderr
M, S, T = [], [], []
num = lambda x: -70.0 if ('inf' in x or 'nan' in x) else max(-70.0, float(x))
for m in re.finditer(r't:\s*([\d.]+)\s+TARGET:[^M]*M:\s*(\S+)\s+S:\s*(\S+)', log):
    T.append(float(m.group(1))); M.append(num(m.group(2))); S.append(num(m.group(3)))
T, M, S = np.array(T), np.array(M), np.array(S)
# credits: the longest dark, quiet-picture stretch that runs to the end (or --end)
if A.end is not None: end = A.end
else:
    sec = int(dur); dark = np.array([lum[int(s * HZ): int((s + 1) * HZ)].mean() if int(s * HZ) < n else 0 for s in range(sec)])
    end = float(sec)
    for s in range(sec - 1, int(sec * 0.5), -1):
        win = dark[max(0, s - 6): s]
        if win.mean() > 0.035: end = float(s); break
# cues: candidates first (every onset, scored), then the strongest are kept with wide spacing, so a 15-minute film gets a handful of
# reactions instead of one every half minute (v7 feedback: people "scream at scenes which don't make sense")
genre = A.genre; cand = []
quiet = 0.0; loud = 0.0; dt = 0.1
for i in range(5, len(T)):
    t = T[i]; m = M[i]; base = np.median(M[max(0, i - 30): i - 2]); jump = m - base
    quiet = quiet + dt if M[i - 3] < -38 else max(0, quiet - dt * 0.5)
    li = min(n - 1, int(t * HZ)); flash = diff[li] > 0.12
    if jump > 15 and m > -22 and (quiet > 1.5 or flash): cand.append((t, 'laugh' if genre == 'comedy' and not flash else 'scare', jump + (6 if flash else 0)))
    elif jump > (8 if genre == 'action' else 10) and m > -26 and M[i] - M[i - 2] > 6: cand.append((t + 0.2, 'laugh' if genre == 'comedy' else 'gasp', jump))
    if S[i] > max(-20, np.median(S[max(0, i - 100): i]) + 3): loud += dt
    else:
        if loud > 8 and S[i] < S[i - 1] - 4: cand.append((t, 'cheer' if genre == 'action' else 'climax', 10 + loud))
        loud = max(0, loud - dt * 2)
    if loud > 5 and loud - dt <= 5 and S[i] - np.median(S[max(0, i - 120): i - 50] if i > 60 else S[:max(1, i)]) > 7: cand.append((t, 'tension', 9))
if genre in ('drama', 'fantasy'):   # a quiet, bright, still moment after a loud passage: "aww"
    for s in range(20, int(end) - 5, 2):
        i = int(s * 10); j = int(s * HZ)
        if i < len(S) and j < n and S[i] < -30 and lum[j] > 0.18 and diff[j] < 0.02 and S[max(0, i - 80): i].max() > -18: cand.append((float(s), 'aww', 8))
GAP = {'scare': 90, 'gasp': 45, 'laugh': 18 if genre == 'comedy' else 60, 'climax': 90, 'cheer': 60, 'tension': 60, 'aww': 90}
CAP = {'scare': 3, 'gasp': 6, 'laugh': 14, 'climax': 2, 'cheer': 3, 'tension': 4, 'aww': 3}
spacing = 18 if genre == 'comedy' else 30
cues = []
for t, typ, score in sorted(cand, key=lambda c: -c[2]):
    if t > end - 2 or t < 8: continue
    same = [c for c in cues if c['type'] == typ]
    if len(same) >= CAP[typ] or any(abs(c['t'] - t) < GAP[typ] for c in same) or any(abs(c['t'] - t) < spacing for c in cues): continue
    k = min(1.0, max(0.35, 0.4 + (score - 8) / 16)); cues.append({'t': round(float(t), 1), 'type': typ, 'k': round(k, 2)})
cues.sort(key=lambda c: c['t']); cues.append({'t': round(end, 1), 'type': 'end', 'k': 1})
out = {'id': A.id, 'hz': HZ, 'aspect': round(aspect, 3), 'crop': [round(r0 / H, 3), round(r1 / H, 3)], 'duration': round(dur, 2), 'end': round(end, 1), 'cues': cues,
       'light': base64.b64encode(light.tobytes()).decode()}
open(f'{A.out}/{A.id}.json', 'w').write(json.dumps(out, separators=(',', ':')))
print(A.id, 'samples', n, 'aspect', round(aspect, 2), 'crop', r0, r1, 'end', round(end, 1), 'of', round(dur, 1), 'cues', len(cues), [(c['t'], c['type']) for c in cues])
