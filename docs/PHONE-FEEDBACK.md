# Phone feedback on v7 (2026-10-30, 11 screenshot sheets): status in v8.00

Plan: docs/V8-PLAN.md. Release: docs/V8-RELEASE-NOTES.md. Checked in headless Chromium on a software GPU only: nothing below has
been seen on the phone yet. `[x]` done, `[~]` partly, `[ ]` not yet.
- [x] No taxi drop-off intro: Story mode now starts with a taxi (new Blender model) pulling in at the red carpet; you step out beside
  it, it drives off. First time can't be skipped, later ones can.
- [~] Models overlapping, z-fighting, flicker, no animations: every room checks at 0 coplanar triangle pairs; new people with library
  animation; new cars pass Blender QA. Hall seats and many props are still the v5/v7 models.
- [~] Reflections too strong, lighting fake: reflections have a strength setting (off/soft/full, soft by default) and are toned down;
  changed rooms re-baked in Cycles. Specific screenshot fixes (zebra decal, tilted sign, speaker reading as a door) not done.
- [x] NPCs look the worst: new people from CC0 bodies with modern outfits, faces, hair, eye and jaw movement (v8 people system).
- [x] Holding/eating animations: IK hand-to-mouth eating and drinking, cups and buckets held upright.
- [x] Dialogue 1-2 lines, repetitive: 285 new lines in four languages, never the same line twice in a row, context-aware.
- [x] Most NPCs have Hindi/Urdu names: international names matched to each person (Clara, Marcel, Éloïse, Odette, Rémy, Mia, Gaston...).
- [x] No greeter: Clara greets you at the door, points to tickets and the ATM.
- [~] No textures outside the theatres: corridor beams and film islands added; the hall exteriors are not visible anywhere.
- [~] Unrealistic shadows: re-baked light maps for every changed room; a shadows switch in settings.
- [~] LODs and chunk loading: LOD distance and render distance settings; no new loading work (E7 open).
- [x] Car models: new lofted cars with arches, windows, spoked rims (tools/blender/cars.py).
- [x] Velvet etc. still on cards: the films are the Blender open movies everywhere (cards, posters, LED wall).
- [x] Blender films not there: nine Blender Studio films with posters, light tracks and reaction cues.
- [~] Reception + tablet with your MP4s, thumbnails, search, filter, albums, collections, favourites: built (the receptionist offers the
  tablet; the new APK wrapper lists your videos). Needs your phone to confirm the permission prompt and the list.
- [x] Guide too slow: he matches your pace and waits for you.
- [x] Subtitles/dialogue look cheap: letterboxed conversation, centred subtitle, speaking wave, dark-glass bubbles.
- [x] Washrooms functioning: wash and dry hands, cubicles and urinals with sounds.
- [x] Bins usable: empty cups and buckets go in any bin.
- [~] Curved hall vibe, IMAX entrances for other halls, exit doors wrong: Screen 1 rebuilt wider and longer with new colours; Screens 1
  and 3 now entered along a walled side passage like the IMAX; exits stay by the screen. The IMAX itself is unchanged.
- [x] Curved screen seat direction: seats on curved rows faced away from the screen (a sign error); they now face it.
- [x] Corridor has no architecture: walnut ceiling beams and two lit film islands (more could follow: columns, bulkheads).
- [x] Walking through people: NPC bodies block you (and say so).
- [x] Held items go through walls: drawn on top (view model).
- [x] Popcorn shows it is ending: four levels over nine bites; cups drain.
- [~] Popcorn/coffee machines and other models: ATM and cars new; the concession machines are still the v7 models.
- [ ] Allu/Dolby stairs and escalators: not built yet.
- [x] Money: limited wallet, ATM with a per-visit limit, rejoin resets.
- [x] No teleport; meet the guide, he reads your ticket and walks you to your seat; only your seat can be used.
- [x] Middle seats in every hall (Screen 1's centre aisle removed); steeper rakes, sightline clearance at least 0.197 m everywhere.
- [x] NPCs can be turned down or off; arrivals are gradual from the street.
- [x] Full-quality film: the native video layer (no texture upload).
- [x] Voices: every line is spoken (offline Kokoro voices, en/es/hi; Urdu uses the Hindi clips), with lip movement; can be turned off.
  Laughs and gasps in the hall are still synthesised.
- [x] Seat bell, server, tablet remote with live scrub preview, play another (costs money), hand back.
- [x] Loading screen = "LUMIÈRE PRESENTS"; menu redone. [~] Curtain animation not reworked.
- [~] Lights placement and transition: house lights now fade in smooth stages (7 s to black); fittings not audited.
- [~] Screen light on the room: unchanged (offline light tracks per film).
- [x] Settings: shadows, reflections, LOD distance, render distance, NPC count, voices, subtitles; device-based defaults on first launch.
- [x] Two ways to play: Quick and Story. [x] Skip intros after the first time; tutorial with ask, settings tab, start/start again.
- [x] Customise controls (layout editor, left-handed, HUD scale).

# Feedback on the v5.20 renders and 20 reference photos (2026-10-30, later): status in v7

The user judged the v5.20 renders and sent 20 photos (Allu Cinemas Kokapet, a Dolby corridor, Dubai/India IMAX halls, a VIP
hall, a curved panorama room, a seat map). Plan and research: docs/V7-DESIGN.md. Nothing below has been seen on the phone yet.
- [x] Lobby "literally the same", weird feeling: rebuilt from zero after Allu (v7, software renders only).
- [x] Bar covered, bad floor: canopy and triangle tile removed; onyx back bar, stadium counter, ring pendants (v7).
- [x] Corridors not Dolby: limestone panels, LED slots, fluted number totems, blue-grey carpet, light trough (v7).
- [x] Outside area fake and cheap: plaza with lit perforated facade, canopy on bronze columns, gold letters, carpet, totems (v7).
- [x] Entrance is a direct spawn: you start at the kerb and walk in through the sliding doors (v7).
- [x] IMAX entrance cheap: IMAX portal, gateway hall with a curved panorama wall, side entrances into the hall (v7).
- [x] NPCs sitting in theatres with no film; "Velvet" playing by itself: no automatic shows, audiences only for your booking (v7).
- [x] No middle seat: the IMAX centre trench is gone (all 416 seats), 6 + 20 + 6 aisles; Screen 1 has a lit centre aisle (v7).
- [x] Restroom looks empty: dryers, towel dispensers, bins, soap pumps, baby change, print, plant, cove light (v7).
- [~] Kiln "crazy good" models: 11 new Kiln props (chandelier, sofa, bar, totems, planters...) and Blender 3D letters; hall seats are
  still the v5.20 Blender families.
- [~] Performance techniques: mipmaps and seat LODs were already in; distance fog added outside; foveated rendering is not
  available to WebGL in a WebView (the resolution governor is the equivalent). New single props have no LOD tiers.

# Phone feedback on v5.10 (2026-10-30) and its status

The user ran v5.10 on their Android phone and sent 10 screenshots. They also approved every idea listed in CLAUDE.md.
`[ ]` open, `[x]` done (with the version), `[~]` partly done. Never tick an item as "verified on the phone" without the user's report.

What the screenshots showed (HUD counters): 24 to 43 fps, 37 to 142 draw calls (142 in a passage that sees two halls and their
audiences), render scale jumping between 0.90x, 1.05x and 1.13x, a posterised film picture with wrong colours, and a mojibake
file name ("BrahmÄ_stra.Part.One...").

## Performance and rendering
- [ ] Lag. The phone runs PUBG and Minecraft smoothly; check performance on every change.
- [ ] Black flicker for 0.1 to 0.9 s (likely the resolution governor resizing the canvas).
- [ ] LOD and distance-loading pops.
- [ ] Some NPCs flash brighter in the theatre.
- [ ] Film picture posterised and wrong colours; play at full quality.
- [ ] Screen light spilling onto models and NPCs needs to be better.
- [ ] Option to hide or disable NPCs.
- [ ] Camera clips slightly into the seat when sitting.

## Layout and theatres
- [ ] Corridors too close together, theatres too small, still claustrophobic.
- [ ] Left/right doors from the middle made it look like 4 theatres.
- [~] Screens in order: 1 = a great curved screen, 2 = a big IMAX screen with its vibe, 3 = standard. Each must feel like its type. (v5.20: own seats, walls, carpet, lighting per hall; not seen on the phone yet)
- [~] Show screens by number with good pictures; remove the fake film titles ("Velvet Hour" etc.). (v7: lit number totems at the doors; idle halls name no film; house films still exist when you book one)
- [ ] Sliding doors are blank black: texture them or build the planned corridor.
- [ ] Research cinema engineering (structure, entry/exit, riser heights); seats placed oddly.
- [~] Real male and female restrooms (only a door now). (v5.20: full rooms with vanities, basins, mirrors, cubicles, urinals; not seen on the phone yet)
- [~] Approved: Dolby-style video-wall entrance tunnel; balcony in the IMAX screen. (v7: the tunnel became the IMAX gateway hall with a panorama wall; the balcony has curved walnut pods)

## People
- [ ] Glitchy walk, tweaky animations.
- [ ] Speaking sounds (gibberish voices).
- [ ] Faster dialogue text.
- [ ] Easy names; many more lines.
- [ ] Receptionist and staff walk too slowly.
- [ ] Feet go into the sofa before sitting.
- [ ] NPCs appear in theatres with no film playing.
- [ ] Smarter crowd: scream, throw popcorn and money (particles that vanish smoothly), stand and clap, jump on seats, at the right scenes.
- [ ] Approved: Kiln-modelled people with better faces and outfits.

## Usher
- [ ] Remove the glowing route to the seat.
- [ ] Point the player to the guide: "You have a ticket?" -> "Show ticket" -> hand-over and check animation -> "Here, this way" -> guides you.

## Food and drink
- [ ] Sip and eat models and animations are poor; coffee and cola look the same.
- [ ] Approved: carry popcorn and drinks to the seat, with refill.

## Seat service and money
- [ ] Seat button calls a waiter: "How can I help you?"
- [ ] Playback controls: seek, speed (2x), stop, change film.
- [ ] Order from a separate menu with icons and good item models.
- [ ] Wallet balance that can run out; an ATM inside the cinema for withdrawals.

## Show presentation
- [ ] Better curtain animation.
- [ ] Custom icon instead of the "silence your phones" emoji.
- [ ] On curtain open: "LUMIÈRE Cinema - Now Playing: <film>", with the name read from the file name (fix the mojibake).
- [ ] Approved: trailers before the film.

## Building
- [~] Outside looks bad. Approved: rain and night street. (v5.20: rain and wet paving; buildings unchanged)
- [~] Lobby grand but unfinished; barriers and sofas poor; bar should be better and feel connected. (v5.20: torchere, open bar screens, brass now reflects; sofas and barriers not remodelled yet)
- [~] Approved: photo spot with a poster frame; seat-number brass plates; Kiln cup stacks, menu boards, guide sign. (v5.20: Screen 3 seats carry brass plates, without numbers yet)

## Sound
- [ ] Sounds repetitive and bad; transitions sound bad.
