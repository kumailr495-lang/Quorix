# LUMIERE v10.0 release notes (2026-11-07)

Built from branch `ccr-7bb5aa6a-upup1u`. Research and the reasoning behind each change: `docs/V10-RESEARCH.md`.
Everything below was checked in headless Chromium with SwiftShader: the real engine on a software GPU, **not the phone**. Nothing here
has been installed or played on the itel P65 yet.

## What changed, by your notes

| Your note | What v10 does |
|---|---|
| Lighting too hard, too much bounce, keep the old look with better accents | A softer light curve per room; continuous wall washes replace the scallops of spotlights; less screen spill in the halls. Accents are lit objects: light columns with glowing crowns, pendant clouds, lit portal reveals, a lit cornice outside. |
| Glitchy 3D, invisible parts, z-fighting | The light maps had a real defect: every triangle was its own map island, so thin strips (brass edges, trims) got no texels and baked black. Fixed in the baker (`tools/bake/bake_room.py`) and every room re-baked: the lobby map went from 10% to 60% used, its walls and floor from 6 to 14 texels per metre. All new models pass the mesh check (no flipped, open or broken faces); the 3D letters and hall numbers, which are open at the back, now draw both sides. |
| The diamond wall in the corridor | Gone. The hall portals are fluted walnut with brass inlays and a warm light slot round the doors. Outside, the blue diamonds over the entrance became gold fins on deep navy. |
| Halls, corridors and lobby feel empty; the lobby is too big | Fountain on the entrance axis with four light columns; a café; pendant clouds; rugs; a popcorn cart; film standees; a mural across the east wall; pictures over the café and by the exit; a seating corner by the restrooms. Corridor: benches and palms down both flanks, palms along the bridge, standees by the mezzanine portal. |
| No lift without a ticket; escalator and lift as one area | One glass-walled ticket zone holds both escalators and the lift. The usher's gate is the only way in; free-exit leaves let you out. Tested: seven ways in, all blocked; out by the down escalator and by the lift, both work. |
| Reception, concessions and café more defined, with sounds | Patterned runners mark the box-office queue and the concessions approach. Café Lumière: walnut wall, lit shelves, menu board, espresso machine, cake case, bar stools, five tables, and a barista, Leo, who sells latte, cappuccino, espresso and hot chocolate. Sounds: the café's room tone, the espresso pump and a cup when he makes yours, the fountain's water (CC0 recordings). |
| Restrooms you can tell by looking | Two-metre pictograms (blue for men, rose for women) either side of the restroom door. |
| Unequal entrance door | The facade's glass bays are laid out from the door outwards, the same on both sides. |
| A better outside | Gold fins on navy, a lit cornice line along the whole building, a red carpet from the kerb, two light columns at the doors. |
| UI more defined | Crisper panels and stronger contrast. The main menu now fits a 360-pixel-tall phone screen; before, it cut off the wordmark and the Credits link. |
| itel P65 and lower | The itel P65 (Mali-G57 MP1) gets the medium preset with per-pixel extras off. Weaker phones get the low preset, which also skips the pendant clouds (18,700 triangles). |
| The theatres are not big | Not changed. MAX's screen is 25.4 × 17.8 m in a hall 29 m wide and 35 m deep, the size of a real large IMAX. Say if you still want them bigger. |
| Film: border lines, stutter, sound delay, blank when looking left, freeze after Continue | Fixed earlier in this pass (commit f986887; `tools/dev/playcheck.mjs`, 6 of 6). |
| Playing together, inputs | Host hand-over, one server queue, a names toggle, quiet chat; keyboard and mouse, controller and Cardboard-style phone VR, chosen by what you touch last. |

## Validation (headless, not the phone)
- `sh tools/run-tests.sh`: logic, i18n (553 keys in 4 languages), syntax, bakes match their builds, comment lint.
- `node tools/dev/walk.mjs`: 25 of 25 scripted walks, and no walking route passes through a wall or a prop.
- `node tools/dev/seethru.mjs OUT --assets`: every new model clean.
- `node tools/dev/uishots.mjs`: every screen shot at the itel P65's 806 × 360.
- Renders before and after in the hand-over message.

## Limitations
- Not tested on a phone, so frame rate on the itel P65 is unmeasured. The lobby has about 57,000 more triangles than v9.3.
- The barista's lines have subtitles but no recorded voice.
- The halls keep their size (see above).
- Playing together over mobile data can fail behind some carriers' networks; the same Wi-Fi works.

## Rollback
- The commit before v10's lobby work is `c13b15b`. `git revert` the v10 commits, or install the v8.00 APK, after uninstalling: it
  has a lower version number.
