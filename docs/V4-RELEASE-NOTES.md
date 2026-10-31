# LUMIERE v4.00 release notes (versionCode 400, 2026-10-29)

APK: `lumiere-v4.apk`, 5,218,011 bytes, SHA-256 `7ff4302e63ceb1394dc48adf0f9f649246602afbc60b110688c344a44eca9267`.
It is signed with the same debug key as v3 (certificate SHA-256 `df8f000f…ba8595a`), so it installs over v3 as an update.

## What changed since v3

### World
v3 had one lobby, one corridor and one hall. v4 has seven rooms:
- **Lobby:**
  - Coffer ceiling with cove light, chandeliers and the LUMIÈRE marquee.
  - Box office with a curved "Reception" sign and a brass-and-velvet-rope queue lane.
  - Bar with four stools, a concession counter, popcorn machine, candy cabinet and menu board.
  - Armchairs with a coffee table, a round table with stools, a sofa, nesting tables and floor lamps.
  - Columns, statues, palms, entrance planters, standees, lightbox posters, mirrors, a clock, a coat rack and a ticket-check post by the usher.
- **Central corridor** to SCREEN I, with benches, poster lightboxes, fan sconces, light strips, palms and an animated double door.
- **West and east wings** to SCREEN II and SCREEN III, with the same dressing plus planters, a statue, a mirror, a clock and animated doors.
- **Three halls**, data-driven, with 386 seats:
  - SCREEN I: 144 seats, flat screen.
  - SCREEN II: 98 seats, curved screen.
  - SCREEN III: 144 seats.
  - Every hall has curtains and a valance, a stage apron with an LED edge, recessed per-row aisle lights, vertical LED bars, and a projector beam with dust.

### People
- 9 skinned characters with a 17-bone skeleton and procedural animation:
  - Stand, walk, sit, clap, cheer, wave, talk, laugh, point, type, hold, and look-at.
  - LODs of 6,500, 2,200 and 700 triangles.
  - Painted faces from a 3×3 face atlas and a people shader.
  - Hair sheen and strands.
- Crowd AI:
  - Staff at their posts, chatting couples, wanderers, and sitters on the sofa, bar stools, armchairs and benches.
  - The usher guides you to your seat.
  - Hall audiences arrive through the street doors, walk the aisles, sidestep along the rows, sit, laugh and cheer at the film, applaud at the end and leave.
  - Greetings and speech bubbles.
- Dialogue: a talk panel with typewriter text and conversation trees (reserve a screening, guide me, drinks, popcorn).

### Shows
- Three house films (*The Long Night*, *Velvet Hour*, *A Quiet Room*) run on an automatic schedule.
- Your own film (gallery or link) can play in any hall.
- Booking: talk to Éloïse, then Reserve, then choose film and showtime, then the per-hall seat map, then Confirm.
  - The ticket then offers "Take me to my seat" (fade and jump).
  - Or you can walk; the usher and a guide trail lead the way.
- Show states:
  1. Pending.
  2. House lights dim.
  3. The picture appears only after the first decoded frame.
  4. Playing, with screen-colour spill light.
  5. Applause.
  6. Lights up.

### Sound
All sound is procedural WebAudio:
- Room-aware ambience and a crowd murmur that follows how many people are near you.
- One-shot sounds: applause, cheers, laughter, doors, chimes, glass clinks and popcorn crunch.
- The film chain has automatic level control, a limiter and room filtering, and mutes when the app goes to the background.

### Rendering and performance
- 8 point-light slots, reassigned per room with crossfades. Neighbour rooms' lights come in near doorways.
- Portal visibility: only the rooms you can see are drawn.
- Static geometry is merged per room.
- Instanced seats use distance LOD and frustum buckets.
- An adaptive render-scale governor runs between 0.55× and 1.5×.
- Spill colour is read without GPU stalls (an analytic average for house films, an async 8×4 bitmap for videos).
- Navigation uses a typed-array A* with a path cache (about 2 ms cold, 0.001 ms cached).

### Final pass in this session (after the last preview you saw)
1. **Your own film no longer freezes the picture.** This was the most important fix of the pass.
   - A `//` comment typed mid-line in `film.js` had swallowed the initialisation of the screen-spill colour.
   - While *your own* video played in the hall you were in, every frame threw an error before `render()`. The sound would have played over a frozen image.
   - Fixed, and confirmed with a real WebM in SCREEN III: the video plays, you are seated, and there are 0 errors.
   - The frame loop is now also built so that an error in any update step is logged and the frame **still renders**. One bad subsystem can never freeze the screen again.
2. **Cap and hat colours.**
   - The same kind of mid-line comment had disabled the colour zones for Marcel's cap and Mr. Orsini's hat, so both took their hair colour (Orsini's hat was grey-white).
   - Fixed: the cap is burgundy like the uniform and the hat dark brown. Both characters were rebuilt.
   - A new `tools/dev/lint-comments.mjs` (part of `run-tests.sh`) finds this whole bug class. It catches all three cases and reports 0 on the current code.
3. **Face speckles fixed.** Éloïse, Mr. Hale and Lucille had dark speckles scattered over their faces.
   - Cause: the shader picked the face-atlas cell with `floor()` on an interpolated value. 3.0 sometimes arrived as 2.9999998, which selected the wrong cell for some pixels.
   - Fix: the index is rounded first.
   - The painted face is now also feathered at its borders, so it blends into the sculpted hair instead of ending in a hard edge.
4. **Corridor and wing posters fixed.**
   - Light strips hung behind the central-corridor lightboxes and showed through the posters as thin lines.
   - In the wings, a lightbox overlapped a strip and a sconce.
   - From an angle, every lightbox poster turned into a blank white panel. The glow panel behind it was pulled forward by the glow material's polygon offset.
   - Fix: the lightboxes now sit in their own bays, and the hidden glow panel was removed from the model. The lightbox GLB went from 220 KB to 48 KB, and that panel had never decimated below 1,742 triangles.
5. **Decor that was already in the APK but never placed is now used:**
   - The velvet-rope queue lane at the box office.
   - Planters at the street doors and in both wings.
   - The second nesting table.
   - The ticket-check post.
6. **Dead weight removed.**
   - Three models that were never placed (the wall-sconce-v2 and two empty flower pots) are no longer loaded or shipped.
   - The old app's unused root assets (3 fonts and noise.png, about 82 KB) are no longer copied into the APK.
   - The first v4 build of today was 5.46 MB; the final one is 5.22 MB (5,218,011 bytes).
   - For comparison, v3 was 1.46 MB. The growth is the 9 character models (about 400 KB each) and 18 new props.
7. **Tooling:**
   - `tools/run-tests.sh` now runs the v4 tests (world, crowd, npc, shader, lint-comments).
   - The shader test ignores comments and checks the face-paint block. A stray `//` had once hidden a broken shader from it.
   - The browser test scripts accept relative paths.
   - `make-apk.py` walks folders in sorted order, so the same source gives a byte-identical APK on any device.
   - `make-apk.py` drops the base APK's old `assets/`.
   - New `tools/dev/model-health.mjs` writes `docs/MODEL-HEALTH.md` from the shipped GLBs.
   - Removed the v3-only `test-world.mjs`, `dump-scene.mjs` and `render-scene.py`, and the v3 software-render previews.

## Validation performed (and what it does not prove)

### Headless Node tests (`sh tools/run-tests.sh`)
- **World:** 7 rooms, 151 colliders, 4 doors and 21 sit spots built in about 0.3 s.
  - Every sit spot and hall door is reachable by the nav grid (0 unreachable).
  - Worst static view: 149,752 triangles, scene only, counted without frustum culling. The budget is 250k.
  - Most draw calls: 61, in the lobby with no culling. The budget is about 100.
  - In the real engine, with up to 45 people on screen, the peak seen was 171,642 triangles and 65 draw calls (the lobby seen from the entrance).
- **Crowd:** 6 simulated minutes.
  - 12 of 12 arriving viewers were seated, the usher reached the seat in 22 s, and applause played.
  - Everyone left after the film.
  - 0 NaN positions, 0 stuck NPCs, about 0.09 ms of AI per frame.
- **NPC:** the skinned usher has 0 non-finite vertices in a pose.
- **Shader:** the patched GLSL is structurally sound, including the face-paint block. This is not a GPU compile; the browser run below is.

### Real engine in headless Chromium with SwiftShader (software WebGL2)
- `tools/dev/browser-run.mjs` and `browser-flow.mjs`: screenshots of every room, the halls with films playing, and face close-ups of all 9 characters, with 0 console errors or warnings.
- Full click-through flow, all through DOM clicks:
  - Talk to Éloïse, Reserve, pick *Velvet Hour*, choose a seat, Confirm, ticket, "Take me to my seat".
  - Seated in SCREEN II with the film playing, then back to the lobby and a talk with Marcel.
- Your own film: a real 640×360 WebM with sound, booked for SCREEN III.
  - It loaded and played (24 s in when checked), you were seated in E8, and the show state was "playing".
  - 0 errors. Before the fix above, the same test produced 817 errors.
- The audio graph ran without exceptions. **Nobody listened to it.**

### APK
- `make-apk.py` v2 self-check, plus an independent verifier (`apksigtool verify`): "v2 verified".
- Same certificate as v3. Manifest is 4.00 / 400.
- The 75 app files inside the APK are byte-identical to the tested `www/`.
- A fresh unzip of `lumiere-v4-source.zip` rebuilds `lumiere-v4.apk` **byte for byte**. This holds with either `lumiere-v4.apk` or the original 51 MB `lumiere-app.apk` as the base.

### Not done
- **Not installed or run on a phone.**
- SwiftShader frame times (20–50 ms) say nothing about your phone.
- For reference, v3 on your phone showed 19–27 ms per frame at 1.5× (your recording, 1:12–2:06). v4 draws more (people, three halls), so expect the governor to lower the render scale if needed.

## Known limitations
- **Faces:**
  - Faces are painted, not sculpted in detail. At extreme close range, Éloïse shows a darker band under her eyes, which comes from baked ambient occlusion.
  - Seen from the side, the painted temple hair reads as flat sideburns; it shows most on grey-haired Mr. Orsini.
  - Hands are simple mitten shapes.
- **Mesh defects:** a few models have non-manifold edges or several pieces (see `docs/MODEL-HEALTH.md`). They render fine, but are not perfectly watertight.
- **NPC paths:** NPC paths sometimes cut 0.4 m grid corners next to furniture. These are harmless "off-grid" samples in the crowd test.
- **Lighting:** there are no shadows, by design for the GPU budget. Lighting is 8 point lights plus baked AO.

## Rollback
- **App:** uninstall LUMIERE, then install `lumiere-v3.apk`. Android will not install a lower version over a higher one.
- **Source:** `lumiere-v3-source.zip` is v3. The previous v4 snapshot is `lumiere-v4-handoff.zip`.
- **Single fixes:**
  - Every change in the final-pass list above is an isolated edit in `www/js` or `tools`, and can be reverted file by file.
  - The old lightbox model can be rebuilt with its glow panel by restoring the two `out(...)` lines in `tools/models/props2.js` and running `node tools/build-models.js lumiere-lightbox`.
