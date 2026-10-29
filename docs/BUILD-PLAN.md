# LUMIERE v4: build plan and phone checklist

## Layout
- `www/`: the app (index.html, css, js, models, vendored three.js r169, fonts).
- `tools/`: model factory, `make-apk.py`, `run-tests.sh`, and the dev and browser tests.
- `docs/`: these notes, `V4-RELEASE-NOTES.md` and `MODEL-HEALTH.md`.

## Status
v4.00 is built and verified headlessly. See `V4-RELEASE-NOTES.md` for every change, the validation and the limitations. The next step is the phone test below.

## Phone checklist for v4 (please screen-record while you do this)

### Lobby
1. Warm and readable, with people standing, chatting and sitting on the sofa, at the bar and in the armchairs.
2. Speech bubbles appear and fade.

### Booking
3. Walk to the velvet-rope lane at Reception and talk to Éloïse.
4. Reserve, pick a film, then a showtime, then a seat. Confirm.
5. The ticket shows the screen, row and seat.

### Getting to your seat
6. "Take me to my seat" fades you into the right hall and seat.
   - Alternatively, close the ticket and ask Marcel (the usher) to guide you, or follow the trail.

### Show
7. The house lights dim, the picture appears (black until it starts), and the audience reacts.
8. At the end you hear applause, the lights come up and people leave.

### Your own film
9. Pick a video from the gallery in the booking sheet.
   - It plays with sound in the chosen hall.
   - The sound stops when you leave the app.

### Explore
10. Walk both side wings and all three halls: SCREEN I is flat, SCREEN II curved, SCREEN III large.
11. Doors open as you approach.

### Performance
12. Open the brightness panel and note the "ms · scale" readout in the lobby, in a hall during a film, and in a busy hall.
    - Under about 33 ms is fine; the scale drops by itself if needed.

### Faces
13. Look at people's faces up close. Nothing should be speckled, and there should be no hard edges at the hairline.

## Build on Termux (only needed if you want to rebuild yourself)
```sh
pkg install nodejs python python-cryptography unzip
unzip lumiere-v4-source.zip && cd lumiere-v4
sh tools/run-tests.sh                                   # headless checks, about 1-2 minutes
python tools/make-apk.py ../lumiere-v4.apk www my-lumiere.apk 401 4.01   # any LUMIERE APK works as the base
```
- `node tools/build-models.js [name]` rebuilds models into `www/models` (all 44 take several minutes).
- Keep `tools/keys/`: it is the signing key. A build signed with another key can't update the installed app; you would have to uninstall first.
- versionName must stay 4 characters (for example 4.01). The versionCode must go up for Android to accept an update.
