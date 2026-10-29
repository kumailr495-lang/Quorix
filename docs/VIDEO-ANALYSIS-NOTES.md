# LUMIERE - VIDEO ANALYSIS NOTES

## Recording 1: the OLD app (before the restart)
Source: XRecorder_Compressed_20261025_02.mp4 (536x240 landscape, 30 fps, 3:40, AAC stereo). Very low resolution:
text is readable only when large; small props are guesses (confidence noted).
Method (per protocol): pass 1 = whole clip at 1 frame / 4 s (55 frames); pass 2 = 1 frame / s for 0:00-0:23 plus targeted
frames (0:40-0:47, 1:50-1:53, 3:06-3:07, 3:37); audio loudness envelope per second. NOT done: sound-cue-by-ear
(no playback possible here) - audio findings are from level analysis only.

## A. Scenario in one paragraph
Player stands in the lobby (landscape, first person, virtual joystick + drag-look). Walks around the reception desk and sofa,
talks to the receptionist (card), opens the booking sheet, picks "your own film" from the phone gallery, gets a ticket
(Screen 01 / Row D / Seat 10), then walks lobby -> dark corridor -> hall doors -> hall. The user's own video plays on the
hall screen WITH audio. Player wanders seat rows (prompts "Sit - G16" ...), goes back out, visits the side corridors
(warm-lit, glowing wall panels, orange runner), visits SCREEN II and SCREEN III doors ("Close SCREEN III"), and ends in a hall
where a second clip (Brahmastra trailer) is playing loudly.

## B. Timestamped catalogue
| t | what is shown | implication (models/light/UI/sound) | conf |
|---|---|---|---|
| 0:00-0:11 | LOBBY. Dark-wood panelled walls, black floor with warm glossy hotspots, big recessed ceiling COFFER lit warm cream, LED strip lines along ceiling edges, chandelier (ring of bulbs, 2-3 tiers), red carpet field with gold diamond tracery, small round table + stool on carpet, "Reception" script sign over desk, "LUMIERE" sign over dark doorway, framed lit posters on walls | lobby needs: coffer ceiling + cove light, LED strip modules, chandelier, deco carpet (oxblood+gold diamonds), round table, 2 signs, wall frames with picture lights | high |
| 0:02-0:11 | RECEPTION: desk drawn as a cream BOX with a flat white panel behind it (ugly placeholder); receptionist = featureless tan mannequin; sofa = cream box with 2 guest blobs | all three must be real authored models (curved deco desk with marquee back panel, tufted sofa, characters) | high |
| 0:02-0:11,0:18-0:23 | HUD card "RECEPTION / Screens of tonight - first show 19:30 / [Reserve a screening]" floats when near desk | proximity card, brass-on-dark, deco letterspacing | high |
| 0:06-0:08 | NPC speech bubbles over heads: "The old prints ha...", "The velvet seats are newly restored. They kept the o..." | ambient NPC barks, serif italic bubbles, world-anchored | high |
| 0:07-0:10 | context prompt pill bottom-centre: "Sit on the sofa" | sofa must be sit-interactive | high |
| 0:11 | prompt "Talk to the receptionist" | NPC interact | high |
| 0:12-0:14 | BOOKING SHEET "TONIGHT AT THE LUMIERE / Three ways to disappear": 3 film rows with poster thumb + title + meta + SELECT/SELECTED ("The Long Night", "Velvet Hour", "A Quiet Room"); showtime chips 19:30 / 21:45; seat map (rows, ~19 seats, row letters, taken seats dimmer); "Selected: Row D - Seat 10"; gold CONFIRM RESERVATION button; | sheet UI as in capture (gold gradient CTA, hairlines) | high |
| 0:13-0:16 | "BEGIN IN": Now / 10 s / 1 min / Custom...; "YOUR OWN FILM": URL field + PLAY; "Pick from your gallery / files" | user-supplied video is a CORE feature | high |
| 0:15 | Android system file picker (Movies folder listing) | needs <input type=file accept=video/*> that the WebView wrapper must support (onShowFileChooser) | high |
| 0:17 | TICKET card "ADMIT ONE / From your gallery / Screen 01, Row D, Seat 10 / Walk in, find the brass tag. It will be lit for you. / [FIND MY SEAT]" | ticket modal, seat tag lit in hall | high |
| 0:18-3:20 | toast "Your tape is rolling the moment it decodes" stays on screen FOREVER | BUG in old app: toast must auto-dismiss | high |
| 0:01 | one black frame (scene fade/loader) | fade-in transition | med |
| 0:23-0:40 | walk lobby -> main corridor: very dark, only thin light lines; walls dark | corridor lighting too dark; need sconces visible | high |
| 0:40-0:41 | hall double doors: tall dark leaves with vertical brass strips and brass ring pulls | auditorium-door-pair with ring handles | high |
| 0:41-0:43 | HALL: screen is a flat cream slab with jagged top edge (not decoded yet), seat rows cream, floor dark red | BUG: placeholder screen shows white/cream until video decodes -> must be black glass until frame 1 | high |
| 0:44-1:32 | film #1 plays (STAR STUDIOS logo), audio ~ -36 dB; hall otherwise nearly black; seat rows = huge cream slabs; prompts "Sit - G16/H17/B17/B3/H3/H4" | seat visuals unacceptable; hall needs lit aisle steps, wall washers, but must stay dark-cinema; rows labelled A (front) .. H/J (back), seats up to 19 | high |
| 0:47 | prompt "Stand up" while seated, camera low | sit/stand flow | high |
| 1:20 | right: bluish clip on screen; left: tall plain white panel | second screen/leaf unfinished (white placeholder) | med |
| 1:24 | screen with bright swirl content, seat rows foreground | video texture OK, brightness high | high |
| 1:28 | corridor with red carpet + brown panelling leading back to lobby | corridor runner = red | high |
| 1:32 | lobby again, desk + table + chairs silhouettes | | med |
| 1:36-1:40 | walls: sconce niche plates (green/teal glass panel framed in brass, 1:36), "Bar" lettering at left edge (1:36) | a BAR/refreshment sign exists -> refreshment cabinet / bar | med |
| 1:44-1:48,2:24,2:40 | SIDE CORRIDOR: warm orange glowing wall panels (tall rectangles) each side, cream/orange carpet runner with thin red edge lines, dark glass square at the far end | corridor-wall-segment w/ lit niche panels on a 2.5 m grid; runner carpet; end cap | high |
| 1:50-1:51 | salon door: black glass screen/door in brass frame, red wall panel with grid lattice, prompt "Close SCREEN III" | hall doors open/close, prompt text | high |
| 1:52-2:20 | SCREEN III hall: more rows (A-J), seat prompts "Sit - H18, J18, B1, J1, J12", orange-lit steps along rake | taller IMAX hall, step lights | high |
| 2:44-3:04 | SCREEN II hall: prompts "Sit - H18, A18, H8"; 3:08 "Close SCREEN II" | wide hall | high |
| 3:16-3:24 | lobby/corridor, brass double door with ring pulls at 3:24 | | med |
| 3:28-3:37 | film #2 (Brahmastra trailer) on screen, bright; prompts "Sit - H12, C17, D16, E16" | screen brightness vs light-scale | high |
| 3:36 | screen shows white skewed quad then playing -> screen mesh/UV glitch | do not use per-frame texture re-creation; fixed UVs | med |

## C. HUD / UI inventory (always on)
top-left brand "L  LUMIERE" (deco, dim); top-right three round tool buttons (fullscreen, brightness, + a dimmed 3rd) and pill "Find my seat"; bottom-left virtual joystick (ring + pearl knob); bottom-right "Sprint" pill (brass tint when held); centre-bottom toast + context prompt pill; tiny crosshair dot at screen centre.

## D. Audio (level analysis only)
- 0:00-0:39 effectively silent (< -100 dB) - NO lobby ambience, no footsteps, no music: the old audio system was not producing sound in the recording.
- 0:15-0:20 a very quiet blip (~ -65 dB): UI tap/picker.
- 0:41-1:30 loud film #1 audio (-36 dB). 1:30 abrupt stop when leaving hall (distance fade).
- 1:50, 2:20-2:25, 2:40-2:45, 3:05-3:10: short blips (~ -48..-53 dB) = door open/close or seat-sit cues.
- 3:25-3:40 film #2 audio ~ -22 dB: 14 dB louder than film #1 -> no loudness normalisation.
Requirements: ambience bed in lobby/corridors, projector hum in halls, door/seat/footstep cues, film audio spatialised from the screen with a loudness limiter, unlock on first tap.

## E. Defects seen (must NOT recur)
1. Furniture/seats are cream boxes; characters are mannequins.  2. Hall is nearly black - cannot see seats/aisles/steps.  3. Corridor too dark between sconces.  4. Persistent toast.  5. Cream "screen" before decode.  6. White panel artefacts at 1:20 / 3:36.  7. No ambient audio.  8. Seat rows read as continuous slabs (no individual seat silhouette).

## Recording 2: v3 running on your phone (1000153972_1.mp4)
- 1600×720, 3:12, recorded on your phone.
- Method: contact sheets at 1 frame per 6 s (32 frames), plus the frame-time readout cropped at 12 moments.
- This section was re-checked against the video on 2026-10-29.

| t | what is shown | what v4 does about it |
|---|---|---|
| 0:00-0:15 | Android quick settings while the recorder starts | - |
| 0:18-0:42 | Lobby spawn: the red carpet runner with gold lines is surrounded by a large, dark, empty floor. Few props, no people. | The lobby is now dressed, with people:<br>- box office with a rope lane, bar and stools, concession and popcorn, candy cabinet<br>- armchairs, sofa, round table, nesting tables<br>- columns, statues, palms, planters, standees, lightbox posters, mirrors, clock<br>- 11 staff and patrons, plus audiences arriving |
| 0:48-0:54 | Wall corners very dark | Warmer wall washers, fan sconces with halos, cove strips |
| 1:00-1:06 | Reception card OK. The coffer ceiling is a bright cream slab. | Plaster coffer with perimeter cove light and a brass frame |
| 1:12-1:48 | Brightness panel open: **19-21 ms per frame at 1.5×** in the lobby and corridor. The floor-lamp shade is a bright white blob (1:18). | Frame budget noted (v4 draws more; the governor adapts). The lamp shade is still a glow part, so check it on the phone. |
| 1:54-2:24 | Hall I with your own video playing well: picture and sound OK, prompts "Sit · F9", "Stand up", "Sit · D9". **27 ms (1:54), 24 ms (2:00), 23 ms (2:06)** during the film. | Same video path, plus audience reactions and screen-colour spill. The own-film path is re-tested in v4. |
| 2:30-2:48 | Dark hall corners. **The orange wedge** (2:36-2:47): the low side LED strip ran about 20 cm below eye height in the front pit and showed as a big orange diagonal. | Strip removed; recessed per-row aisle lights instead (checked from the same spot) |
| 2:54-3:00 | Back in the corridor, the film visible through the open door | Kept: the doors animate open and closed |
| 3:06 | Brightness panel again | - |

What this recording told us:
- The v3 engine ran comfortably (about 37-52 fps at 1.5×).
- Your video plays with sound.
- The problems were content and lighting: emptiness, dark corners, the wedge, the bright shade.
