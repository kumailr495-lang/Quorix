# LUMIERE v5.10: phone checklist and build

## Phone checklist (please screen-record while you do this, then send the video)

### First launch
- The app turns to landscape by itself. The language picker shows four cards; pick one.
- Main menu: does it look premium? Is "Now showing" readable?

### Lobby
- Walk around: chevron floor, geometric tile at the bar and the doors, fluted columns, banquette island, neon signs.
- Look closely at walls, floors, doors and counters for flickering (z-fighting). Note where if you see any.
- Bar: stools, armchairs, dish pendants. Snacks: popcorn machines glowing, counters, menus.

### Booking and ticket
- Talk to Éloïse at TICKETS, choose "Book a ticket": step 1 film + start time, step 2 seat, step 3 confirm.
- Does the sheet leave enough of the cinema visible? Are the buttons easy to hit?

### Getting to your seat
- "Take me to my seat", or ask the usher by the screens to walk you there (the usher should walk back afterwards).

### Show
- Lights dim, curtains open, film plays. Do the people react at the right moments (scream, gasp, cheer, clap at the end)?
- Tap the eye button to hide the controls while watching.

### Performance
- Open the menu > Settings > Graphics: try Low, Medium, High and turn on "Show FPS". Tell me the numbers in the lobby and in each screen.

### Languages
- Settings > Language: switch to हिन्दी and اردو. Does anything read wrong or look broken?

## Build on Termux (only needed if you want to rebuild yourself)
```sh
pkg install nodejs python python-numpy python-cryptography && pip install pillow
cd Quorix
sh tools/run-tests.sh                                       # Node checks, under a minute
python tools/make-apk.py lumiere-v4.apk www my-lumiere.apk 511 5.11   # any LUMIERE APK works as the base
```
- Textures: `python3 tools/textures/gen.py` rewrites `www/tex/` (needs numpy + Pillow).
- Props: `KILN_WS=<kiln workspace> node tools/kiln/build.mjs` rewrites `www/models/` (see `tools/kiln/README.md`).
- Keep `tools/keys/`: it is the signing key. A build signed with another key can't update the installed app.
- versionName must stay 4 characters (for example 5.11). The versionCode must go up for Android to accept an update.
