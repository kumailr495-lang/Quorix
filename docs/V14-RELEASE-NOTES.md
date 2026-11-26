# LUMIÈRE 14.1 (2026-11-26)

APK: `Lumiere-14.1.apk`, 52.99 MB, SHA-256 `1e4e611f910726636efa1667acff5b8f02b97f3b75a90fa0dc9c83e09ba1bfb6`.
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
  colours, the audience claps and cheers on the beat and throws popcorn and confetti into the air.

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
- `sh tools/dev/zcheck.sh`: all nine rooms 0 visible coplanar, 0 close (CURVE included after its rebuild). See "Limits" for the engine pass.
- glb_check: the four new food models clean (0 floating, 0 coplanar, 0 folds); `?assetcheck=1`: no open-part warnings.
- The staged APK content boots headless with no missing files and no errors; UI screens reviewed at 806 x 360.

## Limits
- Not phone-tested: performance on the itel P65, sound (including the native fallback), microphone, the song picker.
- The z-check's engine pass still lists small pairs inside the Rocketbox avatars' own meshes and a few sub-1 cm² faces on one lobby prop.
- Not in this build: private theatres (custom, home with a 3D remote, jungle, drive-in, panorama, space), separate washrooms, a lobby and
  corridor rebuild, room QR codes, passing the host role.
- Netflix or Prime films cannot be streamed legally; the app plays public-domain and CC films, your own videos and songs, and links.
- "IMAX" stays "MAX": IMAX is a registered trademark.
- Credits are kept on the phone with a checksum; with no server, they are not tamper-proof.

## Rollback
- The source: every change is in commits 0f7cdcd..HEAD on `ccr-7bb5aa6a-upup1u`; `git revert` any of them, or check out 9130d97 for v14.
- The phone: Android does not install an older versionCode over a newer one, so going back to 13.0 means uninstalling 14.1 first
  (that clears the saved credits and settings).
