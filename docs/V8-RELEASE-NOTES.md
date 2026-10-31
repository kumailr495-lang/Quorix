# LUMIERE v8.00 release notes (2026-10-31)

Answers the v7 phone feedback (11 screenshot sheets, about 50 points). Point-by-point status: top of docs/PHONE-FEEDBACK.md.
Plan with honest ticks: docs/V8-PLAN.md. **Nothing here has been seen on the phone yet.** All checks below ran in a cloud session
(headless Chromium with SwiftShader, a software GPU: correct pictures, meaningless frame rates).

## Install
Two APKs, same package (`com.buddyapps.lumiere`) and signing key as v7, so either installs over v7 (versionCode 800):
- `lumiere-v8.00.apk`: the new wrapper with the media bridge (the tablet lists your videos with thumbnails). **New native code,
  never run on a device.** If it fails to open, install the safe one.
- `lumiere-v8.00-safe.apk`: the same game in the v7 wrapper (known to work). The tablet's "My videos" falls back to the system picker.

## What changed
**Arrival and services**
- Story mode starts with a taxi (new Blender model) pulling in at the red carpet; you step out beside it; it drives off. The first
  arrival can't be skipped; later ones can (Skip button).
- Clara, a host at the doors, greets you and points to tickets and the ATM. The receptionist offers a tablet with your own videos.
- Washrooms work: wash and dry your hands, use a cubicle or a urinal (fade, lock, flush).
- New sounds: till, ticket printer, pouring, curtains, water, dryer, flush, locks, the taxi's engine and doors.

**People, dialogue, voices**
- 285 new lines in English, Spanish, Hindi and Urdu, replacing the old ones (no more removed films): staff, guests, the audience and ten
  two-person chats; never the same line twice in a row; context (ticket or not, bumping into people, standing too close, before the film).
- Every line is spoken: 1485 offline voice clips (Kokoro TTS; en, es, hi; Urdu plays the Hindi clips, written as the same sentences),
  placed in 3D, with jaw movement following each clip. Voices and subtitles have switches.
- International names matched to each person. Walking into someone gets a reaction.
- Conversations are letterboxed with a centred subtitle under the speaker and a speaking wave; bubbles are dark glass with names.

**Halls and building**
- Screen 1 rebuilt: 22.6 m wide (was 17.2), a 17.6 m curved screen (was 14), 7 curved rows of 20 recliners with real middle seats,
  midnight navy, cognac leather, champagne curtains, amber light.
- Seats on curved rows now face the screen (they faced away: a sign error).
- Screens 1 and 3 are entered from the corridor at their rear corner and along a walled side passage to the crossing aisle (a longer,
  darker way in, like the IMAX); the exits stay beside the screen (a short way out).
- Steeper rakes: sightline clearance at least 0.197 m in every hall, so heads in front don't block the picture.
- Corridor: walnut ceiling beams every 4 m and two lit film islands with planters.
- House lights fade in smooth stages (7 s down to black when the film starts); the picture's left and right light their own side of
  the hall; curtains open slower, gather into deeper folds and settle with a sway.
- New cars (lofted bodies, wheel arches, real windows, spoked rims); parked cars have their lamps off.

**Earlier v8 work (same release)**: the film on a native video layer at full quality; held items never clip; popcorn empties in four
steps and goes in any bin; you can't walk through people or furniture; Quick and Story modes; wallet, ATM limit, box office with start
time, the guide reads your ticket and walks you to your seat at your pace; only your seat; seat bell, server, remote tablet with live
scrub preview; settings for shadows, reflections, LOD and render distance, NPC count, device-based defaults; tutorial; layout editor;
the new people (CC0 bodies, modern outfits, library animation, IK eating and drinking, GPU-animated audiences).

## Checks that ran (cloud, software GPU)
- `sh tools/run-tests.sh`: hall maths (Screen 1: 140 seats, clearance 0.200 m; IMAX 416, 0.197 m; Screen 3 198, 0.209 m), director cues
  for all nine films, i18n parity (362 keys in four languages), syntax, comment lint: all pass.
- `tools/dev/check-world.mjs`: 0 overlapping coplanar triangle pairs in every room; navigation 66/66 targets reachable.
- Blender asset QA (blender-asset-qa skill) on both cars: pass (no z-fighting, no floating parts, normals consistent).
- Headless flows: greeter conversation with voice playing (4.4 s clip), voices in the world, the taxi arrival frame by frame, restroom
  prompts, the usher escorting into Screen 1 through the new passage, hall renders (Screen 1, a corner seat facing the screen, Screen 3).
- Voices: an independent offline speech recogniser (Vosk small models) transcribed 12 random clips per language and matched the
  written lines: 96% of words in English, 87% in Spanish (the miss: a "¡Chissst!"), 96% in Hindi. Not listened to by a person.
- Light maps re-baked in Cycles for the corridor, street and the three halls.

## Limitations
- Not run on the phone: frame rate, touch, audio, the voices' sound on the phone speaker, the new wrapper.
- Nobody has listened to the voices (no speaker in the cloud; the recogniser check is the evidence). Kokoro's Spanish and Hindi are
  less natural than its English.
- Laughs, gasps and cheers in the hall are still synthesised; the clips are words.
- Not built yet: lobby stairs and escalators, new concession machines, loading-hitch work, the remaining screenshot fixes (zebra decal, tilted sign, speaker that reads as a door).
- APK size about 45 MB (voices 13 MB, light maps 14 MB, models 15 MB).

## Rollback
- Phone: install `lumiere-v8.00-safe.apk` if the new one misbehaves. Going back to v7 needs an uninstall first (lower versionCode).
- Code: every step is its own commit on `ccr-7bb5aa6a-upup1u` (`git log`); `git revert <commit>` undoes one.

## New ideas (not built; say yes to any)
1. Seat rumble: the phone vibrates on explosions and scares, timed by each film's loudness cues (a cheap 4DX feel).
2. Bring a friend: a companion who books with you, sits beside you, whispers reactions (voiced) and shares your popcorn.
3. Projection booth tour: walk behind the IMAX into the booth and meet Gerald, the projector from Odette's gossip, beam and all.
4. Lobby pianist: a grand piano by the bar; film themes before the shows.
5. Film trivia with Odette: three questions about the Blender films; win a free Plot Twist.
6. Ticket-stub album: every film you watch leaves a stub (film, date, hall, seat) in a wallet in the menu.
7. Real-time sky: dusk, night or rain outside by the phone's clock.
8. Subtitles for your own videos: pick an .srt with the video; lines appear under the picture.
