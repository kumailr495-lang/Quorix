#!/usr/bin/env python3
"""LUMIERE v9 - the spoken lines of one language straight from Kokoro (Apache-2.0 synthetic voices, kokoro-onnx MIT), for a language
the Chatterbox batch (make_voices9.py) doesn't cover in this release (Spanish). Each role keeps the voice and pitch it has in
make_refs9.py, so a character sounds the same in every line. Same output as make_voices9.py: www/voice/<lang>/<voice>/<stem>.ogg (mono
Opus 32 kb/s, levelled) and index.json (v2: length and a 25 Hz mouth envelope per clip). Unchanged clips are skipped (tools/tts/.cache9k).
usage: (venv with kokoro-onnx) python tools/tts/make_voices9_kokoro.py MODEL.onnx VOICES.bin [--lang es]"""
import sys, os, json, hashlib, subprocess, tempfile
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
SRC, OUT, CACHE = os.path.join(ROOT, 'tools', 'dev', 'i18n', 'v9-dialogue.json'), os.path.join(ROOT, 'www', 'voice'), os.path.join(ROOT, 'tools', 'tts', '.cache9k')
ENV_HZ, B64 = 25, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
G2 = ['guestM', 'guestF']
WHO = [('host.', ['host']), ('box.', ['box']), ('bar.', ['barM', 'barF']), ('ush.', ['usher']), ('srv.', ['server']), ('drv.', ['driver']), ('pa.', ['pa']), ('guest.', G2), ('aud.', G2), ('chat', None)]
VOICES = {'es': {'host': ('ef_dora', 1.0), 'box': ('ef_dora', 1.07), 'barM': ('em_alex', 1.0), 'barF': ('ef_dora', 0.95), 'usher': ('em_santa', 1.0), 'server': ('em_alex', 0.94),
                 'guestM': ('em_alex', 1.05), 'guestM2': ('em_santa', 0.93), 'guestF': ('ef_dora', 1.12), 'guestF2': ('ef_dora', 0.9), 'driver': ('em_santa', 0.88), 'pa': ('ef_dora', 1.03)}}
G2P = {'es': 'es'}
SAY = {'es': [('Lumière', 'Lumier'), ('270', 'dos setenta'), ('MAX', 'Max'), ('CURVE', 'Curv'), ('CLASSIC', 'Clásic'), ('Fila F', 'Fila efe')]}

def speakers(key):
    for p, v in sorted(WHO, key=lambda x: -len(x[0])):
        if key.startswith(p): return v
    return G2

def clips(table):
    for key, lines in table.items():
        for i, x in enumerate(lines):
            if isinstance(x, list):
                for j, t in enumerate(x):
                    for w in (['guestM', 'guestF'] if j % 2 == 0 else ['guestM2', 'guestF2']): yield f'{key}.{i}.{j}', t, w
            else:
                for w in speakers(key) or G2: yield f'{key}.{i}', x, w

def level(x, sr):
    a = np.abs(x); thr = max(1e-4, a.max() * 0.02); nz = np.where(a > thr)[0]
    if len(nz): pad = int(0.05 * sr); x = x[max(0, nz[0] - pad):min(len(x), nz[-1] + pad)]
    rms = np.sqrt(np.mean(x ** 2)) or 1e-6; x = x * (10 ** (-19 / 20) / rms); pk = np.abs(x).max()
    if pk > 10 ** (-1.5 / 20): x = x * (10 ** (-1.5 / 20) / pk)
    n = int(0.012 * sr); ramp = np.linspace(0, 1, n, dtype=np.float32)
    if len(x) > 2 * n: x[:n] *= ramp; x[-n:] *= ramp[::-1]
    return x.astype(np.float32)

def envelope(x, sr):
    n = int(sr / ENV_HZ); fr = [np.sqrt(np.mean(x[i:i + n] ** 2)) for i in range(0, len(x), n)]; top = max(fr) or 1
    return ''.join(B64[min(63, int(63 * (f / top) ** 0.6))] for f in fr)

def main():
    a = sys.argv[1:]; k = Kokoro(a[0], a[1]); lang = a[a.index('--lang') + 1] if '--lang' in a else 'es'
    D = json.load(open(SRC)); table = {key: v[lang] for key, v in D.items()}; os.makedirs(CACHE, exist_ok=True)
    cpath = os.path.join(CACHE, lang + '.json'); cache = json.load(open(cpath)) if os.path.exists(cpath) else {}; man = {}; made = kept = 0
    for stem, text, w in clips(table):
        voice, pitch = VOICES[lang][w]; say = text.replace('’', "'").replace('…', '...')
        for x_, y_ in SAY.get(lang, []): say = say.replace(x_, y_)
        rel = f'{w}/{stem}.ogg'; dst = os.path.join(OUT, lang, rel); h = hashlib.sha1(f'k9|{voice}|{pitch}|{say}'.encode()).hexdigest()[:16]
        if cache.get(rel, {}).get('h') == h and os.path.exists(dst): man[rel[:-4]] = cache[rel]['m']; kept += 1; continue
        s, sr = k.create(say, voice=voice, speed=1.0, lang=G2P[lang]); x = np.asarray(s, dtype=np.float32)
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as t: tmp = t.name
        sf.write(tmp, x, sr); os.makedirs(os.path.dirname(dst), exist_ok=True)
        af = f'asetrate={sr * pitch:.0f},aresample={sr},atempo={1 / pitch:.5f}' if abs(pitch - 1) > 1e-3 else 'anull'
        p2 = tmp + '.p.wav'; subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', tmp, '-af', af, '-ac', '1', '-ar', '24000', p2], check=True)
        y, sr2 = sf.read(p2, dtype='float32'); y = level(y, sr2); sf.write(p2, y, sr2)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', p2, '-ac', '1', '-c:a', 'libopus', '-b:a', '32k', '-vbr', 'on', '-application', 'audio', dst], check=True); os.unlink(tmp); os.unlink(p2)
        mm = [int(len(y) / sr2 * 1000), envelope(y, sr2)]; man[rel[:-4]] = mm; cache[rel] = {'h': h, 'm': mm, 't': text}; made += 1
        if made % 25 == 0: print(lang, made, 'made', kept, 'kept', flush=True); json.dump(cache, open(cpath, 'w'), ensure_ascii=False)
    keep = {r + '.ogg' for r in man}
    for d, _, fs in os.walk(os.path.join(OUT, lang)):
        for f in fs:
            rel = os.path.relpath(os.path.join(d, f), os.path.join(OUT, lang)).replace(os.sep, '/')
            if f.endswith('.ogg') and rel not in keep: os.unlink(os.path.join(d, f))
    json.dump(cache, open(cpath, 'w'), ensure_ascii=False)
    json.dump({'v': 2, 'hz': ENV_HZ, 'c': man}, open(os.path.join(OUT, lang, 'index.json'), 'w'), separators=(',', ':'), ensure_ascii=False)
    print(lang, 'done:', made, 'made,', kept, 'kept,', len(man), 'clips', flush=True)

main()
