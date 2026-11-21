#!/usr/bin/env python3
"""LUMIERE v9 - reference voices for make_voices9.py: one 8-10 s clip per role and language, spoken by a Kokoro voice (Apache-2.0
synthetic voices; kokoro-onnx MIT), sometimes pitch-shifted so two roles never share a timbre. Chatterbox then clones these, so the
characters keep the same voice in every line and no real person's voice is used.
usage: (v8 venv with kokoro-onnx) python tools/tts/make_refs9.py MODEL.onnx VOICES.bin OUT_DIR"""
import sys, os, subprocess, tempfile
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

TEXT = {
  'en': ("Good evening. The lights are going down in a minute, so take your time and find your seat. "
         "If you need anything at all, just let us know and we'll bring it over.", 'en-us'),
  'es': ("Buenas noches. Las luces se apagan en un minuto, así que tómate tu tiempo y busca tu asiento. "
         "Si necesitas cualquier cosa, avísanos y te la llevamos.", 'es'),
  'hi': ("गुड ईवनिंग। एक मिनट में लाइट बंद होने वाली है, तो आराम से अपनी सीट ढूँढ लीजिए। "
         "कुछ भी चाहिए हो तो बता दीजिए, हम वहीं ले आएँगे।", 'hi'),
}
# role -> (Kokoro voice, pitch factor of the reference)
VOICES = {
  'en': {'host': ('af_heart', 1.0), 'box': ('bf_emma', 1.0), 'barM': ('am_puck', 1.0), 'barF': ('af_bella', 1.0), 'usher': ('bm_george', 1.0),
         'server': ('bm_fable', 1.0), 'guestM': ('am_michael', 1.0), 'guestM2': ('am_eric', 1.0), 'guestF': ('af_sarah', 1.0), 'guestF2': ('af_nicole', 1.0),
         'driver': ('am_onyx', 1.0), 'pa': ('af_kore', 1.0)},
  'es': {'host': ('ef_dora', 1.0), 'box': ('ef_dora', 1.07), 'barM': ('em_alex', 1.0), 'barF': ('ef_dora', 0.95), 'usher': ('em_santa', 1.0),
         'server': ('em_alex', 0.94), 'guestM': ('em_alex', 1.05), 'guestM2': ('em_santa', 0.93), 'guestF': ('ef_dora', 1.12), 'guestF2': ('ef_dora', 0.9),
         'driver': ('em_santa', 0.88), 'pa': ('ef_dora', 1.03)},
  'hi': {'host': ('hf_alpha', 1.0), 'box': ('hf_beta', 1.0), 'barM': ('hm_omega', 1.0), 'barF': ('hf_beta', 1.08), 'usher': ('hm_psi', 1.0),
         'server': ('hm_omega', 0.94), 'guestM': ('hm_psi', 1.06), 'guestM2': ('hm_omega', 1.07), 'guestF': ('hf_alpha', 1.08), 'guestF2': ('hf_beta', 0.92),
         'driver': ('hm_psi', 0.9), 'pa': ('hf_alpha', 0.96)},
}

def main():
    model, voices, out = sys.argv[1:4]; k = Kokoro(model, voices)
    for lang, roles in VOICES.items():
        os.makedirs(os.path.join(out, lang), exist_ok=True); text, g2p = TEXT[lang]
        for role, (v, pitch) in roles.items():
            s, sr = k.create(text, voice=v, speed=1.0, lang=g2p); x = np.asarray(s, dtype=np.float32)
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as t: tmp = t.name
            sf.write(tmp, x, sr); dst = os.path.join(out, lang, role + '.wav')
            af = f'asetrate={sr * pitch:.0f},aresample={sr},atempo={1 / pitch:.5f}' if abs(pitch - 1) > 1e-3 else 'anull'
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', tmp, '-af', af, '-ac', '1', '-ar', '24000', dst], check=True); os.unlink(tmp)
            print(lang, role, v, pitch, flush=True)

main()
