# LUMIERE v9: licences of everything in the app and its tools

Every file the APK carries, and every tool used to make one, is listed here with its licence. Nothing paid, nothing with a
non-commercial clause, and no real person's voice or likeness.

## In the app (www/)

| What | Where | Source | Licence |
|---|---|---|---|
| Game code | `www/js/*.js`, `www/css`, `www/index.html` | written for this project | the project's own |
| three.js r169 | `www/vendor/three.module.js` | threejs.org | MIT |
| GLTFLoader, SkeletonUtils | `www/vendor/addons/` | three.js examples | MIT |
| meshoptimizer decoder | `www/vendor/addons/meshopt_decoder.module.js` | zeux/meshoptimizer | MIT |
| People (23 avatars, 22 motion clips) | `www/models/rb/` (notice: `www/models/rb/LICENSE-Rocketbox.txt`) | Microsoft Rocketbox (github.com/microsoft/Microsoft-Rocketbox), converted by `tools/blender/rocketbox.py` | MIT (Copyright (c) 2020 Microsoft) |
| Inter (400, 500, 600) | `www/fonts/inter-*.woff2` | rsms/inter | SIL Open Font License 1.1 |
| Cormorant Garamond (300, 500, 500 italic) | `www/fonts/cormorant-*.woff2` | CatharsisFonts/Cormorant | SIL Open Font License 1.1 |
| Devanagari and Urdu text | system fonts of the phone | Android (Noto) | not shipped |
| Rooms (geometry and light maps) | `www/bake/` | built by `tools/blender/arch` and baked in Blender Cycles for this project | the project's own (Blender's GPL does not apply to its output) |
| Material scans | `www/tex/` | Poly Haven and ambientCG, list in `tools/textures/SOURCES.md` | CC0 1.0 |
| Generated textures | `www/tex/` (brick, flat, granite, perforated; the patterns of slats, fluted, carpet_deco, geotile, rosso, stone_light tiles, carpet_dolby lattice) | `tools/textures/gen.py`, `fetch_cc0.py` composites over CC0 scans | the project's own (the scans under them: CC0 1.0) |
| v9.1 scans | `www/tex/` paintwall, travertine, oak, nero_gold, microcement, powder, wc_wall, wc_floor, stone_rel, stone_light, carpet_dolby (+ `_r.jpg` roughness maps) | ambientCG Plaster001, Travertine009, Marble013, Marble014, Concrete034, Metal029, Tiles107, Tiles052, Carpet012; Poly Haven oak_veneer_01 | CC0 1.0 (checked 2026-11-06: ambientCG and Poly Haven publish every asset under CC0) |
| Props (seats, arms, sofas, planters, stanchions, machines, bins, lamps, taxi) | `www/models/*.glb` | Kiln sources in `tools/kiln/`, Blender scripts in `tools/blender/` | the project's own (Kiln: MIT tool) |
| People bodies, faces, hair | `www/models/people_*.glb`, `www/models/people/` | Quaternius, Universal Base Characters | CC0 1.0 |
| People animation | `www/models/anims.glb` | Quaternius, Universal Animation Library | CC0 1.0 |
| Clothes on the people | inside `people_*.glb` | made from the body surface by `tools/blender/people.py` | the project's own |
| Crowd and room recordings | `www/snd/*.ogg` | BigSoundBank (Joseph Sardin), items 19, 20, 236, 237, 413, 480, 505, 557, 655, 664, 680, 1026, 1417, 1526, 1711, 3064, 3065, 3264, 3515, 3522, 3534, 141 | CC0 1.0 |
| Spoken lines, English | `www/voice/en/` | Chatterbox Multilingual (Resemble AI), cloning reference clips made by Kokoro; every clip carries Resemble's inaudible PerTh watermark | model MIT; reference voices Apache-2.0 (synthetic, no real person) |
| Spoken lines, Spanish and Hindi (Urdu plays Hindi) | `www/voice/es/`, `www/voice/hi/` | Kokoro-82M through kokoro-onnx | Apache-2.0 (model and voices), MIT (kokoro-onnx) |
| Dialogue text, all four languages | `www/js/lang/*.js`, `tools/dev/i18n/` | written for this project | the project's own |
| Film posters and light/cue tracks | `www/films/*.jpg`, `*.json` | made from the Blender open movies by `tools/films/analyse.py` | CC BY 3.0 / 4.0, credited in the app (Credits) |
| Open films (streamed or saved on the phone, not in the APK) | archive.org | Blender Foundation / Blender Studio | CC BY 3.0 / 4.0, credited in the booking sheet and Credits |
| YouTube links | YouTube's own embedded player | the viewer's link | YouTube Terms of Service (the app does not download or alter it) |

## Wrapper (tools/android/)

| What | Licence |
|---|---|
| `MainActivity.java`, `LocalServer.java`, `Proxy.java` | the project's own |
| Android SDK platform 35 (android.jar) and build-tools 35 (d8, aapt2, apksigner) | Android Software Development Kit License |

## Tools (not shipped)

| Tool | Used for | Licence |
|---|---|---|
| Blender 5.2.3 | building and baking rooms, seats, fixtures, people clothes | GPL-3.0 (output is not covered) |
| Kiln 1.6.0 | prop sources | MIT |
| gltf-transform | GLB compression | MIT |
| acorn | comment lint | MIT |
| Playwright + Chromium | headless renders and tests | Apache-2.0, BSD |
| PyTorch 2.6 (CPU), chatterbox-tts, kokoro-onnx, numpy, soundfile, Pillow | voices, textures | BSD-3, MIT, MIT, BSD-3, BSD-3, HPND |
| ffmpeg | sound and voice encoding | LGPL-2.1+ (as a tool) |
| graphify | code graph | MIT |

## Things checked and not used
- Freesound CC0 laughter: the CDN refuses scripted downloads, so laughs stay synthesised (quiet) in v9.
- Wikimedia Commons audio: the API refused the requests from the build machine.
- IMAX, Dolby, Atmos and ScreenX are trademarks; the app uses its own names (MAX, CURVE, CLASSIC, 270, "Lumière Sphere").
