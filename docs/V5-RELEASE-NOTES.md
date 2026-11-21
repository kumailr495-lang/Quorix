# LUMIERE v5.11 (versionCode 511)

APK: `lumiere-v5.11.apk`, same signing key as v4 and v5.10 (installs over either). Not yet run on the phone.

## v5.11 on top of v5.10
- 14 more Kiln models replace the last box props people see most:
  street facade bays (dark brick, stone sills and lintels, modelled windows lit or dark at random), shopfronts with awnings,
  street lamps, parked sedans, a back bar with lit glass shelves and about forty bottles, a drinks fountain, a pick-and-mix
  wall with heaped sweets, ticket kiosks, card terminals, velvet benches, brass-topped bins, the usher's podium with a reading
  lamp, a brass ring chandelier over the island, padded leather doors with portholes.
- The pixelated street outside the glass (a 256 px window texture) is gone: buildings are now geometry with a brick texture.
- New brick texture set; lobby light raised a little (ambient 0.10 -> 0.13, downlights brighter).
- Kiln QA found floating parts (shop interior, scoop rail, card reader, door handle); fixed. `check-world.mjs` found new shared
  planes (sills, mullion crossings, cornices, candy wall panels, chandelier canopies); fixed. **0 in all 8 rooms.**
- Validation: run-tests pass; check-world 0 overlaps, 40/40 nav; full flow 0 console errors; APK v2 verified.
- Lobby views now 125k to 139k triangles and 61 to 73 draw calls (SwiftShader counters) with the street visible.

# LUMIERE v5.10 (versionCode 510)

APK: `lumiere-v5.10.apk`, 3.24 MB, APK Signature Scheme v2, signed with the same key as v4 (installs as an update, no uninstall).
Built with `python3 tools/make-apk.py lumiere-v4.apk www lumiere-v5.10.apk 510 5.10`.

**Not yet run on your phone.** Everything below marked "validated" ran in this cloud machine: Node, and the real app in headless
Chromium with SwiftShader (a software GPU). Phone frame rate, touch feel, audio and install are untested.

## What changed since v4.00

### The building (your "airport / jail / flat models" feedback)
- New art direction from researched references (Everyman, Dolby Cinema, UNIC handbook): warm, dark, layered, brass and velvet.
  Details and sources: `docs/V5-ART-DIRECTION.md`.
- **Textures on every surface.** `tools/textures/gen.py` generates 21 tileable texture sets (albedo + normal map): chevron oak
  parquet, black/cream/terracotta geometric tile, art-deco cinema carpet, walnut, fluted and slatted walnut, Nero Marquina
  marble, terrazzo, brushed brass, powder-coated metal, velvet, leather, acoustic weave, plaster, concrete and more.
- **New lit shader** (`www/js/materials.js`, `www/js/library.js`): albedo and normal maps, baked light per vertex, a reflection
  capture per room (polished floors, brass and glass reflect the real room), velvet rim sheen. One draw per material per room.
- **Real 3D props authored with Kiln** (https://github.com/instruktlabs/kiln, MIT, free): 19 GLBs in `www/models/`, sources in
  `tools/kiln/`. Bevelled edges, layered parts, cup holders, piping, flutes, brass trims, LED lines:
  - Hall seats: Screen 1 velvet seat with walnut shell, Screen 2 burgundy recliner with consoles, Screen 3 tall navy seat;
    arm standards; all instanced in two levels of detail.
  - Lobby: fluted walnut columns, walnut-slat counters with marble tops (tickets, bar, snacks), popcorn machines, velvet bar stools,
    deco armchairs, marble side tables, brass dish pendants, brass queue posts with velvet ropes, round velvet banquette,
    tree planter and plant pots; brass poster cases in the concourse.
- **Lobby rebuilt**: chevron parquet, tile at the bar and entrance, deco rug under the banquette island, fluted walnut wainscot
  with brass cap, dark plum walls, brass rails, charcoal ceiling with warm light pools, wall washers, neon TICKETS / Bar & Café /
  POPCORN signs.
- **Concourse**: burgundy deco carpet, poster cases with their own grazing lights, downlight rows.
- **Halls**: Screen 1 deep teal (Everyman), Screen 2 walnut slats and burgundy, Screen 3 black with blue light lines (Dolby style).
- Hall geometry from the UNIC rules (`www/js/hallmath.js`): stadium rake, crossing aisle at the entrance level, curved screen
  and curved rows in Screen 2, giant screen in Screen 3 (calculations in `docs/V5-DESIGN.md`).

### Z-fighting
- Walls are single inward-facing panels; overlapping props were separated.
- New check `tools/dev/check-world.mjs` searches every room and every Kiln asset for triangles in the same plane, facing the
  same way, that overlap. It found and I fixed: banquette seams, a duplicated glazing bar and posts in the popcorn machine,
  the arm panel on its foot, the lobby's upper wall band (1 mm -> 12 mm), transoms crossing mullions, rail and cap corners,
  duplicated rail posts in Screen 2. **Result: 0 in all 8 rooms.**

### Interface ("Noir & Brass")
- Warm ivory on near-black glass, one brass button per screen, cinema red only for live shows and errors; Cormorant Garamond
  titles and Inter text (both open-licence, bundled); stroke icons; entry animations.
- Main menu: wordmark, "Enter the cinema", a quiet list (Settings, Language, How to play, Credits) and a "Now showing" strip.
- HUD: location pill, ticket chip, hide-UI and menu buttons, softer joystick, a brass action button with an icon (Talk, Sit, Stand).
- Conversations: cinematic subtitles at the bottom, numbered choices on the right.
- Booking: one decision per step in a side sheet (1 film + start time, 2 seat map that fits every row, 3 confirm + your own
  video), so the cinema stays visible; empty state when a screen is full.
- Ticket: an "admit one" card. Settings: tabs (Controls, Graphics, Sound, Language). Pause dialog. Error toasts in red.
- Languages: English, हिन्दी, اردو (right-to-left), Español: every one of the 196 keys.
- Figma: tokens, type ramp and effects are in the file "LUMIÈRE — Noir & Brass UI". The Figma Starter plan's tool-call
  limit stopped work after that, so the screens were designed and reviewed directly in the running app.

### People, crowd, shows, sound (v5.00 work, unchanged in 5.10 except the director fixes)
- Procedural people with walking, sitting down and standing up animations, expressions, blinking.
- Audiences only in halls with a show; they walk in or are seated when you arrive; far rows are one instanced mesh.
- Reactions follow the film: authored cue tracks for the house films, live loudness analysis for your own video.
  5.10 fixes: early scares were blocked by a start-up cool-down; "tension" fired while a loud stretch was fading;
  gasp detection depended on frame rate. Tests now prove: 5 minutes of steady sound -> no reactions; quiet then a hit -> one
  scare; two hits 6 s apart -> one scare; a slow crescendo -> no scare.
- Vendors scoop and hand you popcorn; the usher waits at the guide stand, walks you to your seat and walks back.
- Film sound grows continuously as you approach and enter a hall.

### App
- Opens in landscape (manifest `screenOrientation = sensorLandscape`), main menu, loading screen with progress and tips.

## Validation (what actually ran)
| Check | Result |
|---|---|
| `sh tools/run-tests.sh` (Node) | hall maths, layout, director, i18n (196/196 keys in es/hi/ur), syntax, comment lint: all pass |
| `node tools/dev/check-world.mjs www` (headless Chromium) | coplanar overlaps: 0 in all 8 rooms; navigation: 40/40 targets reachable from the entrance |
| `tools/dev/shoot.mjs`, full flow | menu -> lobby -> talk -> 3-step booking -> ticket -> seat -> pre-show -> film -> crowd reaction: 0 console errors |
| Boot in headless Chromium | about 0.8 to 0.95 s, world build about 0.7 s (software GPU, not the phone) |
| Draw calls / triangles (SwiftShader counters) | lobby 61 to 84 / 95k to 111k with people; Screen 1 59 / 79k; Screen 3 31 / 100k |
| APK | apksigtool: v2 verified; certificate digest identical to v4; manifest 510 / 5.10 / sensorLandscape |

Screenshots: `docs/screens-v5/` (software-GPU renders).

## Limitations (honest list)
- Phone performance unknown. The lit shader adds per-pixel work (normal map + reflection); **Settings > Graphics > Low** turns
  both off. Lobby draw calls reach 84 with people, near the 100 budget from the v4 briefs.
- People are still the procedural v5 characters (no Kiln people yet); faces and clothes are simple.
- Some small props are still the older box kits: kiosks, card readers, back bar shelves, drinks fountain, cup stacks, candy wall,
  window benches, bins, usher podium and sign, restroom doors, ring light, street cars and lamp posts.
- The tree's canopy is low-poly blobs.
- Kiln's own material-faithful views need a GPU (WebGPU); none here, so materials were reviewed in three.js instead.
- Hindi and Urdu were written by me, not by native speakers; please flag anything that reads wrong.
- Banquette seat undersides have hidden coplanar faces (under the seat, never visible).
- Audio levels and the crowd voices have not been heard on a phone speaker.

## Rollback
- Reinstall `lumiere-v4.apk` (same key: install over it).
- Code: `git revert` the v5.1 commits (`21814e0` onwards) or check out `849dd49` for v5.00, `8c67eee` for v4.00.
