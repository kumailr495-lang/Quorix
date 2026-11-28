#!/usr/bin/env python3
"""LUMIERE v8 - voices for every spoken line (www/voice/<lang>/), offline, with Kokoro TTS (Apache-2.0 model, kokoro-onnx MIT).
Each list-valued dialogue key in www/js/lang/<lang>.js is spoken by the voice(s) of whoever says it (staff by role; guests and the audience
in one male and one female voice; the engine detunes those per person). Clips are trimmed, levelled, encoded as mono Ogg Opus, and the
manifest holds each clip's length and a mouth envelope (25 per second) so jaws move with the words. Urdu plays the Hindi clips: both
language files carry the same Hindustani sentences. Unchanged clips are skipped (tools/tts/.cache).
usage: make_voices.py MODEL.onnx VOICES.bin [--lang en,es,hi] [--only KEYPREFIX]
setup (cloud or Termux with Python 3.10+): python3 -m venv .venv && .venv/bin/pip install kokoro-onnx==0.6.1 soundfile
  model files: https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0 (kokoro-v1.0.int8.onnx, voices-v1.0.bin)"""
import sys, os, json, hashlib, subprocess, tempfile
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
OUT, CACHE = os.path.join(ROOT, 'www', 'voice'), os.path.join(ROOT, 'tools', 'tts', '.cache')
ENV_HZ, B64 = 25, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
ALL = ['greeter', 'reception', 'usher', 'vendorM', 'vendorF', 'bar', 'server', 'guestM', 'guestF']
GUESTS = ['guestM', 'guestF']
# who says a key: exact keys first, then prefixes (the engine's voice.js maps people to these ids)
EXACT = {'greet': ALL, 'chat': GUESTS, 'bark.reception': ['reception'], 'bark.usher': ['usher'], 'bark.vendor': ['vendorM', 'vendorF'], 'bark.bar': ['bar']}
PREFIX = [('gre.', ['greeter']), ('rec.', ['reception']), ('ush.', ['usher']), ('ven.', ['vendorM', 'vendorF']), ('bar.', ['bar']), ('srv.', ['server']),
          ('guest.', GUESTS), ('aud.', GUESTS)]
# voice id -> (Kokoro voice, phonemizer language, pitch factor); Spanish and Hindi have few voices, so pitch tells the staff apart
VOICES = {
    'en': {'greeter': ('af_heart', 'en-us', 1.0), 'reception': ('bf_emma', 'en-gb', 1.0), 'usher': ('bm_george', 'en-gb', 1.0), 'vendorM': ('am_puck', 'en-us', 1.0),
           'vendorF': ('af_bella', 'en-us', 1.0), 'bar': ('af_aoede', 'en-us', 1.0), 'server': ('bm_fable', 'en-gb', 1.0), 'guestM': ('am_michael', 'en-us', 1.0),
           'guestF': ('af_sarah', 'en-us', 1.0)},
    'es': {'greeter': ('ef_dora', 'es', 1.05), 'reception': ('ef_dora', 'es', 0.97), 'usher': ('em_alex', 'es', 1.0), 'vendorM': ('em_santa', 'es', 1.03),
           'vendorF': ('ef_dora', 'es', 1.09), 'bar': ('ef_dora', 'es', 1.01), 'server': ('em_alex', 'es', 0.93), 'guestM': ('em_alex', 'es', 1.06),
           'guestF': ('ef_dora', 'es', 1.03)},
    'hi': {'greeter': ('hf_alpha', 'hi', 1.03), 'reception': ('hf_beta', 'hi', 1.0), 'usher': ('hm_omega', 'hi', 1.0), 'vendorM': ('hm_psi', 'hi', 1.0),
           'vendorF': ('hf_alpha', 'hi', 0.96), 'bar': ('hf_beta', 'hi', 1.05), 'server': ('hm_psi', 'hi', 0.94), 'guestM': ('hm_omega', 'hi', 1.05),
           'guestF': ('hf_beta', 'hi', 0.97)},
}

def speakers(key):
    if key in EXACT: return EXACT[key]
    for p, v in PREFIX:
        if key.startswith(p): return v
    return None

def tables():
    js = "import { EN } from './www/js/lang/en.js'; import { ES } from './www/js/lang/es.js'; import { HI } from './www/js/lang/hi.js'; console.log(JSON.stringify({ en: EN, es: ES, hi: HI }));"
    return json.loads(subprocess.run(['node', '--input-type=module', '-e', js], cwd=ROOT, capture_output=True, text=True, check=True).stdout)

def clips(table):
    """(file stem, text, voice id) for every spoken line"""
    for key, val in table.items():
        who = speakers(key)
        if not who or not isinstance(val, list): continue
        for i, v in enumerate(val):
            for j, text in ([(None, v)] if isinstance(v, str) else list(enumerate(v))):
                stem = f'{key}.{i}' if j is None else f'{key}.{i}.{j}'
                for w in who: yield stem, text, w

def speakable(text):
    # what the reader sees vs what the voice says: typographic quotes become plain, ellipses a pause
    return text.replace('’', "'").replace('‘', "'").replace('…', '...').replace('“', '"').replace('”', '"')

def level(x, sr):
    # trim leading/trailing silence (keep 40 ms), then RMS to -19 dBFS with a -1.5 dBFS peak ceiling
    a = np.abs(x); thr = max(1e-4, a.max() * 0.02); nz = np.where(a > thr)[0]
    if len(nz): pad = int(0.04 * sr); x = x[max(0, nz[0] - pad):min(len(x), nz[-1] + pad)]
    rms = np.sqrt(np.mean(x ** 2)) or 1e-6; x = x * (10 ** (-19 / 20) / rms); pk = np.abs(x).max()
    if pk > 10 ** (-1.5 / 20): x = x * (10 ** (-1.5 / 20) / pk)
    return x.astype(np.float32)

def envelope(x, sr):
    n = int(sr / ENV_HZ); fr = [np.sqrt(np.mean(x[i:i + n] ** 2)) for i in range(0, len(x), n)]; top = max(fr) or 1
    return ''.join(B64[min(63, int(63 * (f / top) ** 0.6))] for f in fr)

def encode(x, sr, pitch, dst):
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as t: tmp = t.name
    sf.write(tmp, x, sr)
    af = f'asetrate={sr * pitch:.0f},aresample={sr},atempo={1 / pitch:.5f}' if abs(pitch - 1) > 1e-3 else 'anull'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', tmp, '-af', af, '-ac', '1', '-ar', '24000', '-c:a', 'libopus', '-b:a', '20k', '-vbr', 'on',
                    '-application', 'voip', dst], check=True)
    os.unlink(tmp)

def main():
    a = sys.argv[1:]; model, voices = a[0], a[1]
    langs = a[a.index('--lang') + 1].split(',') if '--lang' in a else list(VOICES)
    only = a[a.index('--only') + 1] if '--only' in a else ''
    k = Kokoro(model, voices); T = tables(); os.makedirs(CACHE, exist_ok=True)
    for lang in langs:
        cpath = os.path.join(CACHE, lang + '.json'); cache = json.load(open(cpath)) if os.path.exists(cpath) else {}
        man, todo = {}, list(clips(T[lang])); done = made = 0
        for stem, text, w in todo:
            voice, g2p, pitch = VOICES[lang][w]; rel = f'{w}/{stem}.ogg'; dst = os.path.join(OUT, lang, rel)
            h = hashlib.sha1(f'{voice}|{g2p}|{pitch}|{text}'.encode()).hexdigest()[:16]
            if (only and not stem.startswith(only)) or (cache.get(rel, {}).get('h') == h and os.path.exists(dst)):
                if rel in cache and os.path.exists(dst): man[rel[:-4]] = cache[rel]['m']; done += 1
                continue
            s, sr = k.create(speakable(text), voice=voice, speed=1.0, lang=g2p); x = level(np.asarray(s, dtype=np.float32), sr)
            os.makedirs(os.path.dirname(dst), exist_ok=True); encode(x, sr, pitch, dst)
            m = [int(len(x) / sr * 1000), envelope(x, sr)]; man[rel[:-4]] = m; cache[rel] = {'h': h, 'm': m}; made += 1
            if made % 25 == 0: print(lang, made, 'made,', done, 'kept of', len(todo), flush=True); json.dump(cache, open(cpath, 'w'))
        # drop clips whose line no longer exists
        keep = {r + '.ogg' for r in man}
        for d, _, fs in os.walk(os.path.join(OUT, lang)):
            for f in fs:
                rel = os.path.relpath(os.path.join(d, f), os.path.join(OUT, lang)).replace(os.sep, '/')
                if f.endswith('.ogg') and rel not in keep and not only: os.unlink(os.path.join(d, f)); cache.pop(rel, None)
        json.dump(cache, open(cpath, 'w'))
        json.dump({'v': 1, 'hz': ENV_HZ, 'c': man}, open(os.path.join(OUT, lang, 'index.json'), 'w'), separators=(',', ':'), ensure_ascii=False)
        print(lang, 'done:', made, 'made,', done, 'kept,', len(man), 'clips', flush=True)

main()
