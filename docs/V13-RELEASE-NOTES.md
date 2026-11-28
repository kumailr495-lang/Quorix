# LUMIERE 13.0 (versionCode 1300)

Built 2026-11-20 from branch `ccr-7bb5aa6a-upup1u` at commit `9d502f0` (plus the menu's version label). Checked in headless Chromium
with SwiftShader: the real engine on a software GPU, **not the phone**. Nothing here has been installed or played on the itel P65 yet.

APK: `lumiere-v13.0.apk`, 47.47 MB, SHA-256 `fede23eab69c045e38ca25daad5d47e83591aebf2d8d47544a56248e6214e0b5`.
Package `com.buddyapps.lumiere`, v2 signature, the same certificate as v8 and v9 (SHA-256 `df8f000f...ba8595a`), target SDK 35.

## What is new since 9.00 (the last APK)
- v10 to v12c: the ticket zone, the escalator and lift hall, the lobby rebuilt in noir and brass, the street at midnight with traffic,
  the taxi arrival from inside the cab, halls wall to wall with side exits, Rocketbox people, lobby animation (docs/V10-RELEASE-NOTES.md,
  docs/V12-PLAN.md, CLAUDE.md's v10 to v12c sections).
- v13: the C1b halo ceiling and P2 marble columns you picked; the ticket bay, popcorn bay and bar split by lit marble fins, each with
  its sign; three ticket kiosks; the runner to the brand ring; the corridor with lit portal frames, hall roundels and seat-plan
  boards; the in-game phone (F or the phone button); settings that apply at once; crowd reactions only on clear moments.

## Validation (headless, not the phone)
- `sh tools/run-tests.sh`: logic, i18n (599 keys in each language), syntax, bakes match their builds, spec, CSP, comment lint.
- `sh tools/dev/zcheck.sh`: `TOTAL visible coplanar 0, visible close 0`.
- `node tools/dev/walk.mjs`: 30 of 30 walks; NAV edges clear of walls and furniture. `node tools/dev/npc-clear.mjs 60`: clean.
- The staged files (`tools/stage-www.py`) boot to the language picker and into Quick play with no missing file and no error.
- `apksigner verify`: v2 verified, one signer; `aapt2 dump badging`: versionCode 1300, versionName 13.0.

## Limitations
- Frame rate on the itel P65 is unmeasured. Run `?bench=1` (README: `python -m http.server 3000 -d www` in Termux) or play the APK.
- The phone has no Messages, Profile, outfits or notifications yet. Saving a photo as a file works only in a browser.
- House films come from archive.org; they need the internet.
- Credits, jobs and buying things are not built yet (next stage).

## Install and roll back
- Same signing key, higher versionCode: it installs over 9.00 or 8.00 without uninstalling.
- To go back, uninstall, then install the older APK (Android refuses a lower versionCode over a higher one).
- In git: `git revert 9d502f0 3164f8d` undoes v13's lobby, corridor and phone (the light maps revert with them).
