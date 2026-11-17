# LUMIERE v12: the release pass (started 2026-11-15)

The user (2026-11-15): finish the app in one go for the market; security, hacking and piracy; the theatre does not yet feel like a real
one; bring models, renders, UI, colours, animation, playback to 2026 norms ("10x") while keeping it smooth; every feature asked so far
and the surprise bundle, one by one; VR, iOS, PC, laptops, Android, tablets; multiplayer without a server of theirs and without sharing a
Wi-Fi; consumables and eating animations, realistic sounds, NPC personalities; the taxi driver's head went through the roof; the taxi and
the street looked like an afterthought ("people mostly judge from outside"); the UI looked cheap and blocky. Decisions are mine ("don't
ask me, you are the main developer"): this file is the record of what was chosen and what is done. Tick only with evidence.

## Root cause found first

The "blocky" look was partly the picture's resolution: presets drew a quarter to a half of a phone's pixels and my own review renders
used the Low preset at half scale. Fixed in X1 (engine.js PRESETS, governor trial logic). **All review renders are now made with
`--scale 2 --gfx high --query "?fixscale=2"`** (1612 x 720, the itel P65's own pixels).

## Phases (one at a time; commit after each)

- [x] **X1** Sharp picture; driver seated by measure (head 5.2 cm under the lining); nine unused skills removed. Commit 31a1974.
- [x] **X2** The outside as the hero. Commits 3241e85, 85c8c6a, ee561d7, ee9be5a and the lobby commit after them.
      - Far side: seven lots of real buildings (street12.py), shop rooms behind framed fronts, lintels, string courses, washes on three
        fronts; the street's ends are buildings, and a lane runs north at each end (traffic comes and goes round their hidden corners).
      - Midnight, not evening (the user, 2026-11-17): cool LED street lamps, a low blue night fill, darker fronts, a third of the windows
        lit, most shops shut with dim displays, exposure target 0.15, sky drawn at the far plane.
      - Taxi and saloon remodelled (taxi.py): cage body, painted shut lines (plane cuts), lamps, plates, ten-spoke wheels; the taxi in
        Mumbai black and yellow. The taxi arrives down the west lane, stops at its painted bay (x 9, clear of the doors and the crossing),
        and leaves round the east corner; passing saloons stop for you.
      - Entrance clear: no troughs, hedges or bollards on the line from the bay and the crossing to the doors; palms moved inside.
      - The inside fuller, with sense (the user): a film-heritage exhibit on the escalator hall's west wall (1950s projector on a plinth,
        reel wall, two framed bills, a rope), a photo spot (step-and-repeat wall, director's chairs, ring light), a merchandise shelf
        by the candy counter (decor12.py). Guests keep out of the exhibit and the set.
      - Gates: zcheck 0/0 (world and cabin), connect 0, glb_check all new models 1 group / 0 floating / 0 coplanar / 0 folds,
        seethru --assets 0, props-overlap 0, walks 26/26, npc-clear passes, run-tests passes.
      - Open: the inside of the lobby draws about 430k triangles at medium (the street through the glass, sixteen people, the furniture):
        the optimisation pass in X9 must bring it near 250k (people LOD, street props from inside, merged meshes by distance).
- [ ] **X3** Multiplayer on any network: relay fallback over public pub/sub (no account, no server of ours), end-to-end encrypted with
      the room code; automatic when a direct link cannot be made. And a multiplayer lobby (the user, 2026-11-17): the room code, who is in
      it and ready, how each player is connected (direct or relayed), the host's film and seats, start together.
- [ ] **X4** UI to 2026 premium norms (menu, HUD, booking, settings, dialogue, tablet), phone / tablet / desktop layouts.
- [ ] **X5** Platforms: installable web app (PWA) for iOS, PC, laptops; keyboard, mouse, gamepad; tablets; VR check.
- [ ] **X6** Features: open rows of the audit and checklist; consumables with eating; trailers; photo spot; seat plates; NPC
      personalities; sounds; the surprise bundle.
- [ ] **X7** Security: attack and fix; release hardening (debug off, CSP, signature and integrity checks, minified code); privacy policy;
      licences screen.
- [ ] **X8** Theatre vibe by 2026 cinema norms: light, glow, materials, signage, hall identity, weak models remade.
- [ ] **X9** Release: performance, all gates, signed APK (and an app bundle if the tools allow), store notes, report.

## Rules for this pass

- Gates: `.claude/skills/lumiere-qa` (zcheck 0/0, glb_check, walks 26/26, npc-clear, props-overlap, run-tests).
- Nothing is claimed for a phone: checks are headless (SwiftShader) and Blender.
- No paid service, no account in the user's name without their say; nothing published outside the repository without their say.
