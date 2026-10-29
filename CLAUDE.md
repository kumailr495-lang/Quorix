# LUMIERE: handoff brief for Claude Code

Read this whole file before doing anything. It carries the context of a long claude.ai chat that built this repo.

## What this is
LUMIERE is a first-person 3D art-deco cinema for Android (package `com.buddyapps.lumiere`). It is a static three.js app (`www/`) shipped inside a small WebView wrapper APK.

The player:
- Walks a grand lobby, a central corridor, two side wings and three theatre halls.
- Talks to staff and books a seat.
- Watches a house film or **their own video** (a gallery file or a link) on the hall screen with sound, among an audience that reacts.

## The user
- Works **only on an Android phone** with Termux (no desktop). Anything they must run has to work in Termux. Keep manual steps minimal and give exact commands.
- Wants genuine, premium results:
  - Realistic models, and a lobby and hallways that don't feel empty.
  - All three halls.
  - NPCs with good AI and dialogue, and crowd reactions (cheering, applause).
  - Smooth transitions.
- **List fresh ideas before implementing new features**, so they can approve them. Wants thorough research.
- Every deliverable must state exact changes, validation performed, limitations, and a rollback path.
- Never claim device, APK-install, audio or in-game tests passed without evidence.
  - Screenshots from `tools/dev/browser-*.mjs` are the real engine running in headless Chromium with SwiftShader (software GPU). Say so; they are not the phone.
- The APK is the target. Don't substitute a website. Genuine changes only, no file-size padding.

## History
1. A previous bot ruined the original project, so the user restarted from scratch. The old APK, recordings and four PDF briefs (in the claude.ai Project "Cinema") are **reference only**. See `docs/OLD-APP-AUDIT.md` and `docs/VIDEO-ANALYSIS-NOTES.md`.
   - Hard limits from the briefs:
     - itel P65-class device (4 GB RAM, Unisoc GPU, 720×1600).
     - At most about 250k visible triangles, about 100 draw calls, 8 point lights, and no shadows.
     - One global light-scale.
     - Screens are black glass until the first decoded frame.
     - All assets are generated in code.
2. **v3** (1.46 MB APK) had a lobby, a corridor and one hall. The user ran it on the phone (second recording) and found it not realistic and empty.
3. **v4.00** (this repo, versionCode 400, 5.22 MB) is the big pass. See `docs/V4-RELEASE-NOTES.md` for every change, the validation and the limitations.

## Architecture
### `tools/` (Node only, runs in Termux)
- The model factory: `node tools/build-models.js [names…]`.
  - Pipeline: SDF modelling (`lib/sdf.js`), then surface nets, then colour-aware QEM decimation with per-vertex importance (`lib/qem.js`) into LOD0/1/2.
  - Then baking (`lib/bake.js`): SDF-gradient normals, ambient occlusion, float linear vertex colours, `_MATID` and zone bias.
  - Then optional skin weights (`lib/skin.js`), and finally a GLB (`lib/glb.js`) written to `www/models/`.
- `tools/models/registry.json` lists the **44 shipped models**: 35 props and 9 people.
  - Props live in `props.js`, `props2.js` and `seat.js`.
  - People live in `people.js`: 17-bone skeleton stored in the GLB extras, LODs of 6,500, 2,200 and 700 triangles.
- `docs/MODEL-HEALTH.md` is generated from the shipped GLBs by `node tools/dev/model-health.mjs www/models`.

### `www/js/` (the app; three.js r169 is vendored)
- **Engine and assets**
  - `engine.js`: renderer, adaptive render-scale governor (0.55–1.5×) and the light-scale. `?fixscale=1` pins the scale for tests.
  - `materials.js`: Lambert patched through `onBeforeCompile`.
    - The per-vertex `matid` selects a procedural material: velvet, wood, marble, brass, carpet, chequer, plaster, cloth, leather, curtain, stone, skin, hair, glass or satin.
    - `mats.people` adds the painted faces (`LUM_PEOPLE`) on top.
    - It self-heals to plain Lambert if a shader fails (`mats.verify`).
  - `faces.js`: the 3×3 face atlas, one cell per character, painted on a canvas.
  - `textures.js`: posters, signs, the house films (`makeHouseFilm`: title cards, city / sea / rain scenes, FIN) and the idle slate.
  - `fx.js`: glow halos, fades, and the projector beam with dust.
- **World**
  - `layout.js`: rooms, halls, portals, seat maths, `aisleX`, `ENTRANCE`, `floorY` and `roomAt`.
  - `world.js` is the orchestrator:
    - Loads the GLBs and merges static props per room.
    - `prop(room, name, x, y, z, yaw, {box, halo, sc, lod, noGlow})`.
    - Handles the 8 light slots: `setLights` / `tickLights` with neighbour lights near portals.
    - Portal visibility, doors and the nav grid.
  - Room builders:
    - `build-lobby.js`: lobby and central corridor.
    - `build-wings.js`: east wing, mirrored for the west.
    - `build-halls.js`: three data-driven halls.
  - `arch.js`: box and wall builder.
  - `nav.js`: typed-array A* on a 0.4 m grid with a path cache and line-of-sight smoothing.
- **People**
  - `characters.js`: SkinnedMesh, LOD and face attribute.
  - `anim.js`: procedural poses and look-at.
  - `npc.js`: the `Crowd` state machines. Staff, chat pairs, wanderers, sitters, the usher's guiding, and audiences that arrive, sidestep, sit, react, applaud and leave; plus bubbles and barks.
  - `dialogue.js`: dialogue trees.
  - `talk.js`: the talk panel and speech bubbles.
- **Shows, sound and UI**
  - `film.js` (`Shows`): programme, auto schedule, booking, the pending, dimming, playing and ended states, and spill colour without GPU stalls.
  - `sound.js`: procedural ambience, crowd sounds, and the film chain (automatic level control, limiter, room filter).
  - `ui.js`: HUD, booking sheet (per-hall seat map), ticket.
  - `player.js`: joystick, drag-look, collisions, sit and stand.
  - `main.js`: boot and the frame loop. The debug handle is `window.__lumiere`; spawn presets are `?spawn=hall|hallII|hallIII|corridor|wing|bar`.

### `tools/make-apk.py`
- Repacks the proven wrapper (classes.dex, manifest and resources from a base APK) with `www/`.
- Drops the base's `assets/` and `META-INF/`, patches versionCode and versionName, and signs with APK Signature Scheme v2 using `tools/keys/`.
- **Keep that key**: a different key forces an uninstall on the phone.
- Any LUMIERE APK works as the base, including `lumiere-v4.apk` itself; the build is byte-reproducible.

## Testing
- **Headless Node:** `sh tools/run-tests.sh` runs the world, crowd, npc and shader tests through `tools/run-dev.sh`.
- **Real engine in headless Chromium with SwiftShader:**
  - `node tools/dev/browser-run.mjs <www> <outdir> shots.json` takes posed screenshots and logs console errors.
  - `node tools/dev/browser-flow.mjs <www> <outdir>` clicks through talk, reserve, ticket, jump to seat, show and usher.
  - Playwright lives at `/opt/npm-tools/node_modules/playwright`. Run these after **any** shader edit: the Node shader test can't compile GLSL.
- **Lessons:**
  - Never put a `//` comment in the middle of the dense one-line code in `build-*.js` or in GLSL strings. It swallows the rest of the line. This happened twice.
  - Run `node --check` on every module and the browser runs to catch it.

## Current state (2026-10-29)
- v4.00 is built, signed and verified (`apksigtool`: v2 verified; same certificate as v3). **It has not been installed on the phone yet.**
- Everything in `docs/V4-RELEASE-NOTES.md` under "Validation" passed. Device performance, audio audibility and installation are untested.

## Next steps
1. Get the user's phone recording of v4 and analyse it frame by frame. ffmpeg contact sheets work well, and the perf readout is in the brightness panel.
   - Fix what the real GPU shows, such as frame time, light levels, or anything that looks wrong.
2. Ideas waiting for the user's approval (list them, don't build unasked):
   - Topiary planters.
   - Sculpted hands.
   - A balcony in SCREEN III.
   - Popcorn and drinks the player can carry.
   - Intermission ads and trailers before the film.
   - Day and night street views through the doors.
   - Seat-number brass plates.
   - A photo spot.

## Rules learned the hard way
- Colours are float linear vertex colours. Never use an 8-bit atlas maths path.
- Union everything into one solid. Decals use polygonOffset. Never leave coplanar overlaps.
- Glow and emissive parts are separate meshes named `<model>-<part>_LODn` that use the glow material.
  - The glow material's slope-scaled polygon offset can push them **through** a surface a few mm in front at grazing angles. Never hang anything flat right in front of a glow part.
- Keep the total point lights at 8: lights are slots reassigned per room.
- Never call `floor()` on an interpolated varying that should be an integer: round it first. This was the face-speckle bug.
- Never read pixels back synchronously (`getImageData` on a video frame): it stalls the GPU for seconds on phones.
