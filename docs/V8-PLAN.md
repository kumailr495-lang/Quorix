# LUMIERE v8: plan from your v7 phone feedback (2026-10-30)

Your v7 phone screenshots (11 sheets) and ~50 points. Every point is listed below with the planned change and its status.
`[ ]` open, `[~]` partly done, `[x]` done (software-GPU checks only until you test it on the phone).

Research done for this plan (sources in docs/RESEARCH-NOTES.md, "v8"):
- People: Quaternius **Universal Base Characters** (2 bodies, 5 hairstyles, eyes, brows) and **Universal Animation Library 1 + 2**
  (85 animations: walk, formal walk, carry, idle, talking, phone call, folded arms, rail lean, yes/no, sit down / sit idle /
  sit talking / stand up, consume (eat, drink), pick up, interact, driving). All CC0, one shared 65-bone rig, downloaded from
  the author's itch.io pages. Modern clothes, extra gestures (clap, laugh, flinch, cheer) and face controls are made by us in Blender.
- Films: Blender Foundation open movies (CC-BY) on archive.org as 1080p MP4: Cosmos Laundromat, Sintel, Caminandes 2 and 3,
  Spring, Sprite Fright, Tears of Steel. archive.org streams with byte ranges but without CORS, so the picture cannot go into a
  WebGL texture: the film is drawn by the phone's own video layer behind a hole in the 3D picture (see A1). That is also the
  fix for "not full quality": the video is shown at its real resolution, decoded and scaled by the phone, never re-filtered.
- Your own videos without the file manager: needs native code in the APK (Android MediaStore), so v8 builds its own wrapper
  (same package, same signing key) with a "Videos" permission and an in-game gallery. If the permission is refused the old
  picker still works.

`[x]` built and checked in headless Chromium (software GPU, not the phone), `[~]` partly, `[ ]` not yet. Status 2026-10-31: docs/V8-RELEASE-NOTES.md.

## A. Engine, video and core feel
- [x] A1 Film at full quality: native video layer behind a transparent screen hole (no texture upload, no mipmaps, no
      tone mapping on the picture); house films removed from cards and posters; Blender open films added (streamed, credited);
      offline light and sound tracks for those films (screen light colour per half second; loud/quiet events for the audience).
- [x] A2 Held popcorn/drink never goes through walls (drawn last, over the world).
- [x] A3 Popcorn empties visibly (9 bites, 4 levels), drink level drops, empty items can be thrown into any bin.
- [x] A4 You can no longer walk through people, counters, sofas, planters, columns (colliders for every placed prop; NPC bodies push you).
- [~] A5 Reflections and gloss toned down (marble, glass, metal); fixes from the screenshots: zebra crossing decal, tilted
      corridor sign, restroom partition block, speaker that reads as a door, light blobs on corridor walls.
- [x] A6 Settings: shadows, reflections, LOD distance (aggressive), render distance, NPC count (0 = off), NPC voices,
      subtitles, defaults chosen from the device (GPU, memory, screen) on first run; customisable controls (layout, size, swap sides).
- [x] A7 Two ways to play: **Quick** (spawn in the hall, unlimited money, remote tablet always in hand) and **Story** (taxi
      arrival, greeter, box office, guide, services). Skip button on every cutscene except the first time. Tutorial offered on
      first launch; Settings > Tutorial: "Start tutorial" / "Start again".
- [x] A8 Main menu redone; loading screen = the "LUMIÈRE presents" animation only; curtain animation (two-panel swag,
      cloth sway, eased timing, motor sound).
- [x] A9 File names shown cleanly ("Brahmāstra Part One Shiva (2022)" instead of "BrahmÄ_stra.Part.One...").

## B. Money, ticket, guide, seat
- [x] B1 Wallet: you start with a limited amount; the ATM gives a limited amount per visit; rejoining resets both.
- [x] B2 Box office: buy a ticket (film, hall, seat, start time: "in 1 minute" or a time you pick). Your own video needs a ticket too.
- [x] B3 Guide: you show the ticket (he reads it), he walks you to your seat at your speed; you can only sit in your own seat;
      the hall has real middle seats. Option "show me the way" (path line) and, in Quick mode, "take me to my seat".
- [x] B4 Seat bell: call a server; "Order something" or "Something about the film"; he hands you the tablet; controls: play,
      pause, seek with picture preview, speed, stop, play another film (costs money); hand the tablet back to pay and he leaves.

## C. People
- [x] C1 New people from the CC0 base characters: modern outfits (t-shirts, shirts, jackets, hoodies, jeans, chinos, skirts,
      dresses, trainers), body shapes, 5 hairstyles + colours, skin tones; staff uniforms. Three detail levels.
- [x] C2 Animation from the library (walk, idle, talk, phone, sit, eat/drink, carry, pick up, give) plus our own (clap, laugh,
      flinch, cheer); props in the hand bones; eyes that look at you, blinks, mouth moving when talking; heads and bodies turn to look.
- [x] C3 Seated audiences as GPU-animated crowds (one draw per body type) so a full IMAX costs a few draw calls.
- [x] C4 People arrive gradually from the street and the doors, walk at normal pace (no rushing, no popping in).
- [x] C5 Dialogue: 150+ new lines (staff, guests, audience, reactions), varied by time, film and what you do; international
      names; old lines replaced. New subtitle and speech bubble design.
- [~] C6 Voices: every line spoken (offline neural voices, Apache-2.0), plus laughs/gasps/murmurs; can be turned off.
- [~] C7 Smarter reactions: fewer and better-timed (no screaming at nothing), different each time.

## D. Services and places
- [x] D1 Greeter at the doors (welcomes you by time of day, points to the box office).
- [x] D2 Taxi arrival intro (Story mode): ride up to the kerb, the door opens, you step out.
- [~] D3 Receptionist hands you a tablet: your videos with thumbnails, search, filter, albums, collections, favourites.
- [x] D4 Washrooms work: wash hands (water, soap, dryer), cubicle doors, flush, sounds.
- [~] D5 Sounds for every interaction (doors, buttons, counters, bins, cups, tablet, bell, steps on each floor).

## E. Theatres and architecture
- [x] E1 Middle seats in every hall (no centre aisle anywhere); rake checked so heads in front never block the screen.
- [x] E2 Curved-screen hall rebuilt: wider and a little longer (by the numbers), rows on arcs facing the screen, new colours.
- [x] E3 Entrances for every hall like the IMAX one (portal + light-lock passage, longer), exits beside the screen straight to
      the corridor (short); IMAX improved again.
- [~] E4 Corridor architecture: columns, bulkheads, ceiling coffers, centre islands with seating and poster cases.
- [~] E5 Lobby: grand stair and escalators to a mezzanine (Allu reference), better concession machines (popcorn, coffee,
      drinks), better car models, textures outside the halls.
- [~] E6 Lights: fittings placed on walls/ceilings correctly, house lights dim in stages, screen light on the room much richer.
- [~] E7 Loading between areas: everything compiled and uploaded before you enter (no hitch), fade-in instead of popping, LOD hysteresis.

## F. Delivery
- [x] F1 New APK wrapper (MediaStore gallery bridge, video streaming with byte ranges), same package and key.
- [~] F2 Tests, world checks, light-map re-bakes, software-GPU renders, APK v8.00, release notes, rollback.

## Ideas of mine (not built; need your yes)
Listed in the final report.
