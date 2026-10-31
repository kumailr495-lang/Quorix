# LUMIERE v7.00 (versionCode 700)

Built 2026-10-30 with `python3 tools/make-apk.py lumiere-v4.apk www lumiere-v7.00.apk 700 7.00` (18.9 MB, v2 signature
self-check passed, same certificate as v4 and v5.11, so it installs over them). Plan and research: docs/V7-DESIGN.md.

## What changed (answers to the feedback on the v5.20 renders and the 20 reference photos)
- Arrival: you start across the street, cross at a zebra crossing and walk in through the sliding doors. The building has a
  backlit perforated facade, a deep canopy on bronze columns with face-lit gold LUMIÈRE letters, a red carpet with stanchions,
  poster lightboxes, hedge planters and bollards. Outside, a night rain haze (distance fog).
- Lobby rebuilt after Allu Cinemas: Nero marble floor with brass lines and a star, elliptical red-lacquer coffer with the Kiln
  cascade chandelier, Rosso columns with brass fins and poster screens, marble feature wall with gold LUMIÈRE letters, open bar
  (onyx back bar, stadium counter, ring pendants), candy bar, ivory lounge, red carpet to the lit portal.
- Corridor after the Dolby photo: limestone panels with LED slots, blue-grey carpet, light trough, fluted number totems.
- IMAX: portal with IMAX letters, a gateway hall with a curved panorama wall, side entrances; the centre trench is gone (416 seats,
  every middle seat), 6 + 20 + 6 rows with stepped lit aisles, IMAX letters and light bars on the walls, curved walnut balcony pods.
- Screen 1: lit centre aisle and charcoal-grey leather seats (the VIP photo).
- Restrooms dressed: blade dryers, towel dispensers, pedal bins, soap pumps, baby change, print, plant, ceiling cove light.
- Shows: nothing plays by itself; a hall gets an audience only for the show you book; empty halls say no show is booked.

## Checks
- `tools/run-tests.sh`: hall maths (aisle steps <= 0.2 m, sightlines, seat counts), layout, director, i18n (199 keys x 4), syntax,
  comment lint: pass.
- `check-world.mjs`: 0 overlapping coplanar faces in every room; navigation 64/64. Asset level: the hedge planter's leaf clumps
  are still flagged (near-coplanar blobs; possible faint flicker up close).
- Cycles light maps re-baked for every changed room; boot shows no stale bake.
- Booking test (headless): booking IMAX H16 plans 140 viewers for Screen 2 only; Screens 1 and 3 stay empty; seat jump works.
- Renders: headless Chromium with SwiftShader (the real engine on a software GPU). Not the phone: no frame rate, install or sound
  test was possible here.

## Rollback
Reinstall the v5.11 APK (same key), or `git revert` the v7 commits on `ccr-7bb5aa6a-upup1u` (8a36261 onwards).
