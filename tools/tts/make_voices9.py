#!/usr/bin/env python3
"""LUMIERE v9 - every spoken line (tools/dev/i18n/v9-dialogue.json) as an offline voice clip in www/voice/<lang>/, made with
Chatterbox Multilingual V3 (Resemble AI, MIT licence; every output carries Resemble's inaudible PerTh watermark).

Each role speaks with its own voice. A voice is cloned from a short reference made by Kokoro (Apache-2.0 synthetic voices, see
make_refs9.py), so no real person's voice is copied. Clips are trimmed, levelled (RMS -19 dBFS, peak -1.5 dBFS), and encoded as mono
Ogg Opus at 32 kb/s (music mode, not the v8 20 kb/s voip mode). The manifest keeps each clip's length and a 25 Hz mouth envelope
(the jaw follows the words). Urdu plays the Hindi clips; the dialogue file keeps the Hindi and Urdu lines the same Hindustani
sentences. Unchanged clips are skipped (tools/tts/.cache9).

usage: venv/bin/python tools/tts/make_voices9.py REFS_DIR [--lang en,hi,es] [--only KEYPREFIX] [--threads 3]
setup: python3 -m venv venv; venv/bin/pip install torch==2.6.0 torchaudio==2.6.0 --index-url https://download.pytorch.org/whl/cpu
       venv/bin/pip install --no-deps chatterbox-tts; then its listed dependencies except gradio (docs/V9-DESIGN.md, section 1)."""
import sys, os, json, hashlib, subprocess, tempfile, time
import numpy as np, soundfile as sf, torch

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
SRC, OUT, CACHE = os.path.join(ROOT, 'tools', 'dev', 'i18n', 'v9-dialogue.json'), os.path.join(ROOT, 'www', 'voice'), os.path.join(ROOT, 'tools', 'tts', '.cache9')
ENV_HZ, B64 = 25, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
G2 = ['guestM', 'guestF']
G4 = ['guestM', 'guestM2', 'guestF', 'guestF2']
# who says each key (prefix match, longest first): roles -> voice ids; chats need four voices so two guests never share one
WHO = [('host.', ['host']), ('box.', ['box']), ('bar.', ['barM', 'barF']), ('ush.', ['usher']), ('srv.', ['server']), ('drv.', ['driver']), ('pa.', ['pa']),
       ('guest.', G2), ('aud.', G2), ('chat', G4)]
# delivery per voice: exaggeration (emotion), cfg weight (pacing / closeness to the reference), temperature
STYLE = {'pa': (0.35, 0.5, 0.7), 'host': (0.55, 0.45, 0.75), 'box': (0.5, 0.45, 0.75), 'usher': (0.5, 0.45, 0.75), 'server': (0.5, 0.45, 0.75),
         'barM': (0.55, 0.45, 0.8), 'barF': (0.55, 0.45, 0.8), 'driver': (0.5, 0.4, 0.8)}
LIVELY = {'aud.scare', 'aud.wow', 'aud.laugh', 'guest.bump'}
# what the voice says where the subtitle shows a name or a code
SAY = {
  'en': [('Lumière', 'Loomyair'), ('270', 'two seventy'), ('MAX', 'Max'), ('CURVE', 'Curve'), ('CLASSIC', 'Classic'), ('Row F', 'Row eff')],
  'es': [('Lumière', 'Lumier'), ('270', 'dos setenta'), ('MAX', 'Max'), ('CURVE', 'Curv'), ('CLASSIC', 'Clásic'), ('Fila F', 'Fila efe')],
  'hi': [('270', 'टू सेवेंटी'), ('MAX', 'मैक्स'), ('CURVE', 'कर्व'), ('CLASSIC', 'क्लासिक'), ('F लाइन', 'एफ़ लाइन'), ('F अच्छी', 'एफ़ अच्छी')],
}

def speakers(key):
    for p, v in sorted(WHO, key=lambda x: -len(x[0])):
        if key.startswith(p): return v
    return G2

def clips(table):
    # (stem, text, voice): lists give key.i; chats give key.i.j
    for key, lines in table.items():
        for i, x in enumerate(lines):
            for w in speakers(key):
                if isinstance(x, list):
                    for j, t in enumerate(x): yield f'{key}.{i}.{j}', t, w, key
                else: yield f'{key}.{i}', x, w, key

def speakable(text, lang):
    s = text.replace('’', "'").replace('‘', "'").replace('…', '...').replace('“', '"').replace('”', '"')
    for a, b in SAY.get(lang, []): s = s.replace(a, b)
    return s

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

def encode(x, sr, dst):
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as t: tmp = t.name
    sf.write(tmp, x, sr)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', tmp, '-ac', '1', '-ar', '24000', '-c:a', 'libopus', '-b:a', '32k', '-vbr', 'on', '-application', 'audio', dst], check=True)
    os.unlink(tmp)

def main():
    a = sys.argv[1:]; refs = a[0]
    langs = a[a.index('--lang') + 1].split(',') if '--lang' in a else ['en', 'hi', 'es']
    only = a[a.index('--only') + 1] if '--only' in a else ''
    torch.set_num_threads(int(a[a.index('--threads') + 1]) if '--threads' in a else 3)
    from chatterbox.mtl_tts import ChatterboxMultilingualTTS
    m = ChatterboxMultilingualTTS.from_pretrained(device='cpu'); sr = m.sr
    D = json.load(open(SRC)); os.makedirs(CACHE, exist_ok=True)
    for lang in langs:
        table = {k: v[lang] for k, v in D.items()}
        cpath = os.path.join(CACHE, lang + '.json'); cache = json.load(open(cpath)) if os.path.exists(cpath) else {}
        man, todo = {}, list(clips(table)); done = made = 0; t0 = time.time()
        for stem, text, w, key in todo:
            rel = f'{w}/{stem}.ogg'; dst = os.path.join(OUT, lang, rel); ref = os.path.join(refs, lang, w + '.wav')
            ex, cfg, temp = STYLE.get(w, (0.6 if key in LIVELY else 0.5, 0.45, 0.8))
            if key in LIVELY: ex = max(ex, 0.7)
            say = speakable(text, lang); h = hashlib.sha1(f'v9|{w}|{ex}|{cfg}|{temp}|{say}'.encode()).hexdigest()[:16]
            if (only and not stem.startswith(only)) or (cache.get(rel, {}).get('h') == h and os.path.exists(dst)):
                if rel in cache and os.path.exists(dst): man[rel[:-4]] = cache[rel]['m']; done += 1
                continue
            best = None
            for attempt in range(2):   # a clip that comes out far too long (the model ran on) is made again once
                wav = m.generate(say, language_id=lang, audio_prompt_path=ref, exaggeration=ex, cfg_weight=cfg, temperature=temp)
                x = level(wav.squeeze(0).cpu().numpy().astype(np.float32), sr); dur = len(x) / sr
                limit = 1.2 + 0.11 * len(say)
                if best is None or abs(dur) < abs(len(best) / sr): best = x
                if dur <= limit: best = x; break
            x = best
            os.makedirs(os.path.dirname(dst), exist_ok=True); encode(x, sr, dst)
            mm = [int(len(x) / sr * 1000), envelope(x, sr)]; man[rel[:-4]] = mm; cache[rel] = {'h': h, 'm': mm, 't': text}; made += 1
            if made % 10 == 0:
                el = time.time() - t0; print(f'{lang} {made} made, {done} kept of {len(todo)} ({el / made:.1f} s per clip)', flush=True)
                json.dump(cache, open(cpath, 'w'), ensure_ascii=False)
                json.dump({'v': 2, 'hz': ENV_HZ, 'c': man}, open(os.path.join(OUT, lang, 'index.json'), 'w'), separators=(',', ':'), ensure_ascii=False)
        keep = {r + '.ogg' for r in man}
        for d, _, fs in os.walk(os.path.join(OUT, lang)):
            for f in fs:
                rel = os.path.relpath(os.path.join(d, f), os.path.join(OUT, lang)).replace(os.sep, '/')
                if f.endswith('.ogg') and rel not in keep and not only: os.unlink(os.path.join(d, f)); cache.pop(rel, None)
        json.dump(cache, open(cpath, 'w'), ensure_ascii=False)
        json.dump({'v': 2, 'hz': ENV_HZ, 'c': man}, open(os.path.join(OUT, lang, 'index.json'), 'w'), separators=(',', ':'), ensure_ascii=False)
        print(lang, 'done:', made, 'made,', done, 'kept,', len(man), 'clips', flush=True)

main()
