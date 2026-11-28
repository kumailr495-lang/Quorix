# LUMIERE 9.00 (versionCode 900)

v9 is a rebuild in the order you asked for: research, calculations and drawings first (`docs/V9-DESIGN.md`, `docs/v9/`), then the
models (every room built from those numbers in Blender and baked in Cycles), then the game on top of them. Every point of your v8
feedback is a row in `docs/V9-CHECKLIST.md` with its status: 118 done, 47 partial, 16 not done. The rows below summarise them; the
checklist has the detail.

A surprise is waiting.

## What changed

### The building
- **Rooms.** Two floors.
  - Street and lobby: the lobby has a mezzanine, two escalators, a lift, the box office and the concession counter.
  - Screens floor: a ticket gate leads to the escalator, then a dim corridor with diamond relief, light arches and lit portals.
  - Four halls: MAX, CURVE, CLASSIC and 270.
  - A bright exit spine with a travelator, plus restrooms.
- **Rows and seats.** The rake, the risers, the aisle steps (at most 0.18 m), the row spacing and the seat positions are calculated
  from the UNIC cinema-design rules (`www/js/hallmath.js`). Every row has a real middle seat.
- **Hall models.** Each hall is one model with closed surfaces. A ray test found no see-through gaps (at most 0.05 % of rays escape
  in any room).
- **Light.** Cycles light maps in every room, with a separate fixed-light layer and a screen-light layer in the halls.
- **One-way flow.** You go in through the gate, up the escalator (or the lift, once your ticket is checked) and into your hall at the
  top. You leave by the exits beside the screen, down the spine and back into the lobby. The doors only open the right way.
- **Collisions.** You bump into the walls as they are modelled.

### The film
- The picture is a GPU video texture on the real curved screen, in its exact colours, at the screen's full resolution while you
  watch. There is no video layer any more: no blank picture when you turn, no blurred border, no crop.
- Before the film, a title card with the time to go, then a 10-second countdown during which the lights go down. During the film
  the lights stay at 2 %.
- The picture's light falls on the hall by where it is on the screen: the bottom of the picture lights the floor, the top lights
  the ceiling. In 270, the picture spreads onto the side walls in big scenes.
- Your own videos play from the tablet's list (the app serves them itself, so there is no file manager). YouTube links play in
  YouTube's player, placed on the screen in perspective. The open films can be saved to the phone from the tablet, so they play
  offline.
- Playing a new film keeps the curtain open and starts a new countdown. Coming back to the app nudges the video so the picture
  doesn't freeze.

### Sound
- A low-latency audio path. The film is spread over virtual speakers placed around the hall, and they stay in place when you turn
  your head.
- Film volume goes up to 250 %, with a limiter so loud never clips.
- Applause, cheering, the lobby murmur, the street, the escalator, the lift, the popcorn machine, the restrooms and the taxi are
  real recordings (CC0).

### People
- **Fixes.** Eyes no longer spin, faces no longer flash white or orange, and people sit onto their own seat.
- **Arrivals.** People arrive one at a time over the countdown. The audience watches the screen. Everyone dresses differently.
- **Voices.** 233 lines in four languages, voiced per character, heard only near you.
- **Usher.** He checks and tears your ticket and opens the gate. The first time, he walks you to your row, faster than you, waiting
  if you fall behind. Later he can light up your seat instead. There is no red arrow.
- **Server.** He comes with his cart down your aisle, hands things over and asks whether you want anything else. Ring the bell
  while he is leaving and he turns back.

### Modes, money, interface
- **Modes.** Flow mode (the old Story mode) starts with the taxi, which stays at the kerb. In Quick play you start in the lobby and
  can sit in any free seat. A film picked on the tablet takes you to your seat.
- **Money.** There is no wallet any more, only a bill paid by card, at Indian multiplex prices. The armrest tablet costs ₹99 at
  booking. With it you order from your seat, and there is no bell.
- **Interface.**
  - A centre dot shows what you aim at, and the actions appear when you aim at something.
  - The booking sheet shows a true top view of the hall, with seat classes and prices.
  - The tablet has an Order tab and a fixed film grid.
  - Settings has switches for the seat rumble and the sparks. Both happen only on the strongest scenes.
  - "How to play" shows diagnostics on the phone.

## What was checked, and how
- **Tests.** `sh tools/run-tests.sh` passes. It checks:
  - the hall maths (middle seats, step heights, row lanes, sightlines, comfort angles);
  - the building (no overlaps; every hall's rear aisle level with the first floor; door levels);
  - the walkers' route graph (one-way kept);
  - the film director;
  - all four languages covering every key.
- **Renders.** Headless Chromium renders of every room, the show, the audience, the booking sheet and the tablet. These use
  SwiftShader, a software renderer on the CPU: they show what is drawn, not how fast or how it looks on your phone's GPU.
- **Walking tests.** Scripted walks, played with the controls:
  - kerb side up the escalator, through the corridor to a hall door;
  - the lift up and out;
  - out of MAX through the spine into the lobby.
  These tests found and fixed three blockers: a glass rail across the escalator's arrival, the floor missing inside doorways, and a
  spine ceiling too low for the raised CURVE hall's exit.
- **Wrapper.** The app's server and the new film pass-through were tested on a desktop JVM:
  - full file and byte ranges;
  - wrong token and wrong scheme refused;
  - Chromium playing and seeking WebM, MKV and MP4 through it.

## Not done, or not verifiable here
- **Not seen on your phone.** Nothing in v9 has run on your phone, so frame rate, memory, audio sync, the cutout insets and the
  lifecycle fix are unmeasured there.
- **Models not made.** The 3D tablet that powers on, a car interior with a modelled driver, a new luxury taxi, new popcorn models, a
  new logo and an app intro animation. The props are the v7/v8 models.
- **Interface not reworked.** The layout editor is unchanged (its size control stays in Settings), and you can't swap seats with other people.
- **Missing before/after renders.** The renders of your photos 1-13, side by side with v8.
- **Laughs and screams.** These are still synthesised, more quietly; no CC0 recordings were reachable.
- **Voice engines.** Spanish and Hindi (and so Urdu) voices are Kokoro voices; English is Chatterbox. The design doc planned
  Chatterbox for all.
- **Open films.** archive.org answered 503 to this machine, so streaming them through the app was tested only against a local
  server. If a film doesn't load on your phone, saving it offline from the tablet is the fallback.

## Install and roll back
- Same signing key as v8, so 9.00 installs over v8. Saved settings reset once, because the game now loads from the app's own address.
- To go back, install the v8.00 APK from the v8 release (`docs/V8-RELEASE-NOTES.md`); Android asks to uninstall first because
  9.00 has a higher versionCode. The v8 code is in git before commit `027e9b3`.

## Security note
The APK signing key (`tools/keys/lumiere-debug-key.pem`) is in this public repository. Anyone could sign an "update" that installs over
LUMIERE. Making the repository private fixes that going forward; replacing the key would mean uninstalling the app once, so it needs
your go-ahead.
