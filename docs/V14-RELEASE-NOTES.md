# LUMIÈRE 14.2 (2026-11-27)

APK: `Lumiere-14.2.apk`, 54.06 MB, SHA-256 `fdfe9391512cebb1ab12f56833ffd2b03c023ce941017e303a7d1091434d2e17`.
Package `com.buddyapps.lumiere`, versionCode 1420, versionName 14.2, v2 signature with the same certificate as 14.1
(SHA-256 `df8f000f...ba8595a`), target SDK 35, landscape. It installs over 14.1 and keeps your saved data.

As before, everything below was checked in the real engine running headless (Chromium + SwiftShader, a software GPU) and with Node and
Blender checks, not on the phone. Flicker, frame rate, sound, the song library, the camera and touch need your phone to confirm.

## Your 17 points from the 14.1 test
1. **Flicker everywhere.** Edges are smoothed (MSAA) on every preset, Low included. The resolution no longer changes while you play:
   it is chosen in the first 45 s and after that steps down at most twice, 20 s apart. The street's neon no longer flickers on purpose,
   sign chases glide, and window blinds and curtains are filtered so their stripes do not shimmer. On phones with a 16-bit depth buffer
   the near plane moves out to stop distant surfaces fighting. The FPS line (Settings) now ends with `AA<n> · Z<bits>`: a screenshot of
   it tells me what your phone gives the game.
2. **Interact by looking.** Every action is offered only for what the crosshair is on: litter, bins, seats, sofas, people, the restroom
   fittings, the kiosks, the shifts, the Suite.
3. **Songs with their own pictures.** The tablet has a Songs tab that lists the songs on your phone with their album covers. A song
   plays with its cover, title and artist on the big screen, a turning record and a progress bar; a Now Playing card shows the same.
   Songs picked as files show their own embedded cover (MP3, M4A, FLAC).
4. **The app closing when you pick a song.** Songs come from the in-app list, so Android no longer has to open another app. If Android
   still closes the game's page in the background, the app rebuilds it and a snapshot (kept 30 minutes) puts you back where you were.
5. **The taxi ride.** Filmed from outside now: a crane over the lit street, the taxi tracked from the road side, the kerb as it pulls in,
   then your own eyes as you step out. No car interior.
6. **Lag.** Measured in fixed views against 14.1: the lobby 495k triangles (14.1: 899k), the corridor 467k (855k), a hall 235-413k
   (about 1M), the street about 219 draws (291). Rooms behind a hall's door are drawn only near that door; furniture is grouped so the camera skips what is behind you;
   heavy props were simplified; people and seats switch to their lighter models sooner.
7. **The song glitching and playing twice.** A song never starts the phone's own player. When a film uses it, the page's copy is silent.
8. **Theatres not premium.** Every aisle step has a brass nosing and a lit strip, built from the step itself. When the film starts the
   hall's lights go down to a third and stay down; the screen's light on the room is soft and eased (no flashes on cuts).
9. **Walking through upstairs furniture.** Everything on the mezzanine and in the corridor is solid.
10. **People holding things wrongly, only sitting.** Held things are gripped by their side at the right height. Seated people eat, drink,
    read their tickets and check their phones.
11. **Dancing at the screen.** At Music Night a party walks down to the floor in front of the screen, dances, throws popcorn and bank
    notes on the big beats, and goes back to their seats.
12. **The lift in Play together.** The host's phone runs the one lift; everyone else's follows it, doors included.
13. **Quitting a room.** Leave is on the room bar and in the pause menu. Leaving ends the room's shared show and lift for you.
14. **Recline seen only by you.** Your recline reaches every phone; the seat reclines and you lean back with it.
15. **Too much light bounce; lights not dimming.** See 8: screen spill 1.1 (was 3.6), fixed lights to a third during the film.
16. **Aisle lights.** On every step's edge (halls re-baked).
17. **Something new.** The LUMIÈRE Suite, separate restrooms, room QR codes, the new arrival, Music Night with covers (below).

## New
- **The LUMIÈRE Suite**: a private apartment up from the lobby, with a living room TV and its own screening room with a projector. Open
  the Suite app on the phone (300 LC, free in Quick play) or ask the host. A real remote lies on the coffee table and on the cinema's
  console: pick it up and tap its keys (power, play and pause, previous and next film, volume, lights, cinema). Furniture and colours
  are chosen in the phone app. Not available inside a Play together room.
- **Separate restrooms**: the women's door and the men's door, each with its own sign and vestibule.
- **Room QR code**: hosting shows the room's code as a QR; Scan reads a friend's code with the camera (where the phone supports it).
- **The corridor's round velvet banquettes** appear at last, with people sitting on them. Since 14.1 only their planters showed,
  floating in the air: the banquette model was never loaded.
- **Bins in the halls** take your empty cup again (the game looked for them on the hall's lowest floor). CURVE's bin moved to the side
  wall, off the way to the far aisle.
- A song with no picture shows a note on the tablet's player (it showed a broken image); the Songs tab's search says songs.
- Passing the host role: the host's room list has Make host next to each player (there since v10; the 14.1 notes said it was missing).

## Validation
- `sh tools/run-tests.sh`: logic (halls, seat facing, building, nav, director), i18n 1039 keys in es/hi/ur, syntax, bakes 10/10, spec,
  CSP, comment lint: all pass.
- `sh tools/dev/zcheck.sh`: all ten rooms 0 visible coplanar, 0 close. The Suite is reached by travel, so it now gets its own 673 eye
  points (standing and seated) and its furniture: 0 and 0. The engine pass lists 62 small pairs (4.6 cm² at most): 50 inside the
  Rocketbox avatars' own meshes (clothing over the body), 11 in one lobby prop, 1 other.
- `node tools/dev/walk.mjs`: 31/31 walks (street, lobby, both restrooms, escalator, lift, the ticket zone shut and open, every hall's
  entrance to a seat and both exits); every NAV edge clear of walls and furniture.
- `node tools/dev/npc-clear.mjs 120`: 56 people (19 guests walked), nobody inside a wall, a prop or another person, nobody stuck.
- Every seat's way in, in every hall (1,077 seats, 344k points), is clear of solid furniture; the bin in each hall takes your cup.
- glb_check: the banquette model clean (39 parts, 0 floating, 0 coplanar, 0 folds); `seethru.mjs --assets`: TWO_SIDED matches all 98 models.
- `node tools/dev/uishots.mjs`: 17 screens at 806 x 360, no page errors; the Songs tab and the tablet's player (with and without a
  cover) reviewed on the staged build.
- `node tools/dev/mp-sync.mjs` (three players on one machine over the public relays): shows start 1 ms apart, drift under 0.02 s, a
  connection blip keeps the host, the host leaving hands the room on, a late joiner plays in step (0.01 s).
- The staged APK content boots with no missing files and no errors. On it: the Suite (travel, remote, projector film), a song from the
  Songs tab (plays with its title, artist and cover), the room QR, and a cold start after the whole app was closed (back where you were).

## Limits
- Not phone-tested: flicker, frame rate on the itel P65, sound, the song library and its permission, the camera scan, touch.
- Not built: the jungle, drive-in and space theatres.
- Netflix or Prime films cannot be streamed legally; the app plays public-domain and CC films, your own videos and songs, and links.
- "IMAX" stays "MAX": IMAX is a registered trademark.
- Credits are kept on the phone with a checksum; with no server, they are not tamper-proof.

## Rollback
- The source: the 14.2 changes are commits b5604bb..HEAD on `ccr-7bb5aa6a-upup1u`; `git revert` any of them, or check out efcbf31 for 14.1.
- The phone: Android does not install an older versionCode over a newer one, so going back to 14.1 means uninstalling 14.2 first
  (that clears the saved credits and settings).

# LUMIÈRE 14.1 (2026-11-26)

APK: `Lumiere-14.1.apk`, 52.99 MB, SHA-256 `6c8f972e6a7b4f84ab824add0ea607adf0d9fe5ae1b8037957e547f5d92f90a4`.
Package `com.buddyapps.lumiere`, versionCode 1410, versionName 14.1, v2 signature with the same certificate as 8.x, 9.x and 13.0
(SHA-256 `df8f000f...ba8595a`), target SDK 35, landscape. It installs over 13.0 and keeps your saved data.

Everything below was checked in the real engine running headless (Chromium + SwiftShader, a software GPU) and with Node and Blender
checks. None of it was run on the phone: frame rate, sound, the microphone, the file picker and touch need your phone to confirm.

## What changed since 13.0

### The direction (your 11-26 message)
- Scrapped: the flat, the drivable car and motorbike, the phone's Order app. LUMIÈRE is the cinema again: you watch films together.
  Food is ordered from the armrest tablet or at the counters. Flow mode starts with the taxi ride to the doors.

### Theatres
- **CURVE seats**: a sign error made every seat in MAX and CURVE turn away from the screen's centre, so curved rows fanned outwards.
  Every seat now faces the picture. A test reads every seat in every hall and fails if one points more than 0.5° off.
- **CURVE rows** curve round a point 3 m behind the screen, like the seat plan you sent. Past the side aisles the floor steps straight to
  the walls so the side exits stay on the front floor. The hall was rebuilt and its light re-baked. MAX, CLASSIC and X-270 have straight rows.
- Seated audiences far from you were invisible: the far crowd's shader stopped compiling after the outfit-colour change. Fixed.
- Exits: you walk out through the side door into the passage, then a quick fade puts you in the lobby. Entrances work both ways.
- Hall doors have no baffle wall; the projection beam is gone; reflections are weaker; Dolby Atmos removed (stereo only).

### Loading and menu
- The loading screen showed game screenshots with the controls in them. It now shows four painted key-art pieces made from our own
  scenes (Premiere Night, The Grand Foyer, Fresh from the Kettle, Showtime), with the name and the artwork's title in the corner.
  Leaving, the art fades to black and the black lifts off the menu. The menu camera drifts round the statue above everyone's heads.

### Food, people, service
- Popcorn, nachos, churros and chocolate rebuilt with painted colour: a full popcorn heap, toasted chips, sugared churros, a wrapped bar.
- Food is handed over hand to hand; the usher holds a ticket; guests hold and eat their food.
- The server has a trolley; round velvet bornes with people upstairs; staff names are written in your language.

### Music Night (the surprise)
- Pick a song instead of a film as your own show. The big screen becomes a light show drawn from the music, the room glows in its
  colours, the audience claps and cheers on the beat and throws popcorn and confetti into the air. In the app: tablet, My videos,
  "Pick a song" (the phone's file picker), then "Play"; in a browser: "Your video or song" in the booking.

### Phone, tablet, money
- The phone's home screen fits every phone height (no cut-off rows); the gold status bar is fixed; the Noir & Brass look throughout.
- The tablet has a home screen; only the host has it in Play together.
- Seat and tablet upgrades from the Ticket app; Quick play jumps straight to a screen from the phone.
- Loans in the Wallet: 500 LC now, 550 LC back from 40 % of what you earn (or pay it back at once).
- The ticket shows the row's letter and the right screen number.

### Play together
- Shared guests and audiences (the host's world), held food visible to others, seated poses, the lift moves for everyone in it,
  leaving the room when you quit, proximity voice chat with mute, voice notes in the chat.

### Controls and display
- No "E" key badge on a touch phone (volume, power, screenshot overlays no longer switch to keyboard mode).
- The FPS counter is off by default; the map is readable; VR viewer controls work by gaze.
- Film sound in the Android app: if the WebView cannot decode a film's sound, the phone's own player plays it in step.

## Validation
- `sh tools/run-tests.sh`: logic (halls, seat facing, building, nav, director), i18n 1012 keys in es/hi/ur, syntax, bakes 9/9, spec,
  CSP, comment lint: all pass.
- `node tools/dev/walk.mjs`: 30/30 walks (street, lobby, escalator, lift, ticket zone, every hall's entrance to a seat and both exits).
- `node tools/dev/npc-clear.mjs 120`: 53 people, nobody inside a wall, a prop or another person, nobody stuck.
- `sh tools/dev/zcheck.sh`: all nine rooms 0 visible coplanar, 0 close (CURVE included after its rebuild). The engine's own meshes:
  28 coplanar and 42 close pairs, all of 5 cm² or less (before the plant swap: 3,698).
- glb_check: the four new food models clean (0 floating, 0 coplanar, 0 folds); `?assetcheck=1`: no open-part warnings.
- The staged APK content boots headless with no missing files and no errors; UI screens reviewed at 806 x 360.

## Limits
- Not phone-tested: performance on the itel P65, sound (including the native fallback), microphone, the song picker.
- The z-check's engine pass still lists small pairs (5 cm² at most) inside two Rocketbox avatars' own meshes (clothing over body) and
  sub-1 cm² faces on one lobby prop.
- Not in this build: private theatres (custom, home with a 3D remote, jungle, drive-in, panorama, space), separate washrooms, a lobby and
  corridor rebuild, room QR codes, passing the host role.
- Netflix or Prime films cannot be streamed legally; the app plays public-domain and CC films, your own videos and songs, and links.
- "IMAX" stays "MAX": IMAX is a registered trademark.
- Credits are kept on the phone with a checksum; with no server, they are not tamper-proof.

## Rollback
- The source: every change is in commits 0f7cdcd..HEAD on `ccr-7bb5aa6a-upup1u`; `git revert` any of them, or check out 9130d97 for v14.
- The phone: Android does not install an older versionCode over a newer one, so going back to 13.0 means uninstalling 14.1 first
  (that clears the saved credits and settings).
