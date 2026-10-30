# Light maps (v5.20)

Each room's light is baked in Blender Cycles: real soft shadows, bounce light, contact shadows under seats and furniture.
The game mixes the layers live, so the house lights still dim for the film and the screen still tints the hall.

Runs in the cloud session only (needs Playwright and Blender; neither runs in Termux). The output in `www/bake/` is
plain files that ship inside the APK, so the phone only loads them.

## One command

    sh tools/bake/bake-all.sh            # every room
    sh tools/bake/bake-all.sh gal hallII # some rooms

Env: `SAMPLES` (default 96), `DENSITY` (light-map texels per metre, default 22).

## Steps

1. `export.mjs` opens the real game in headless Chromium with `?bakeExport=1&nobake=1` and calls `bake-export.js` per room:
   the solid mesh exactly as built (positions, normals, tints, material uvs and ids, plus a geometry fingerprint), the shadow
   casters (instanced seats and arms at full detail, door leaves), the screen, and the light list from `bake.js` (including line
   and rectangle emitters as shapes). Output: `tools/bake/.work/<room>.json` (git-ignored).
2. `bake_room.py` (Blender, headless) rebuilds the room and its lights, unwraps a light-map uv set, bakes DIFFUSE light
   (direct + indirect, no albedo; bounce uses each material's real albedo from `www/tex`), filters it, and writes:
   - `www/bake/<room>.glb`: the same triangles with the light-map uvs (TEXCOORD_1), tints and material ids
   - `<room>_h.png`: house light; in a hall also `<room>_f.png` (fixed: steps, signs, LED lines) and `<room>_s.png`
     (the screen's light, grey, half resolution). Other rooms put house + fixed in `_h.png` (they never dim).
     PNGs hold `light / scale` with the sRGB curve; the scales are in the index.
   - `www/bake/index.json`: one entry per room (files, scales, average level, fingerprint).
3. In the game, `lightmap.js` loads the index, GLBs and maps at boot (Medium and High; Low keeps per-vertex light).
   `Room.finalize` compares the fingerprint of the room it just built with the bake's. Match: the baked mesh replaces the solid
   mesh and the `USE_LIGHTMAP` shader reads light = h * scale.x * house (+ f * scale.y * fixed + s * scale.z * screen colour).
   No match (the room's code changed and it was not re-baked): the room keeps its per-vertex light and the console says so.

## Calibration (engine light units -> Blender)

The engine's light is irradiance-like: a light of intensity I gives `I * cos / d^2`. Blender's DIFFUSE bake returns E / pi.
- point and spot lights: power P = 4 pi^2 I
- one-sided emitters (LED lines, panels): P = pi^2 I (I = total intensity of the shape)
- the screen: an emitter of strength 1, so the screen layer is the form factor the engine multiplies by the picture colour

## When to re-bake

After any change to a room's geometry or lights (the fingerprint catches geometry; lights are not in it, so re-bake after
changing them). Texture and tint changes do not need a re-bake. Bake time on the 4-core cloud machine: about 1.5 min for
the gallery, longer for the halls and the lobby.

## Rollback

Delete `www/bake/` (or one room's entry in `index.json`): those rooms go back to per-vertex light. `?nobake=1` does the same
for one run.
