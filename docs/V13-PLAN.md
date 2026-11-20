# LUMIÈRE v13: audit and plan (2026-11-20)

The user's brief of 11-20: their phone photos (ticket desk with the LUMIÈRE name cut by the canopy, the escalator hall's portal, the old
statue under the wire chandelier), 14 reference pictures (a luxury lobby with gold slat columns and a round cove ceiling, a dark corridor
with lit portal frames and hall numbers, a curved-screen hall with an LED cove ceiling and gold lattice, a concessions stand with marquee
letters and photo menus, a ScreenX hall with red recliners, Bigscreen's social cinema, GTA 6, Forza Horizon 6, Call of Duty and RE
Village for the level of finish), and two master prompts: the product (modes, cinemas, NPCs, multiplayer, smartphone, streaming, sound,
economy, theatre editor, profiles, cross-platform, servers, development rules) and the production rules (do the work, research and check
every licence, free tools only, no fake features, stages).

The master prompt's own rule leads: inspect, keep what works, build what is missing, in stages. Open-world expansion (beaches, driving,
skydiving) is listed there as future work behind the cinema experience; it stays behind it here.

## What the user pointed at on 11-20 (fix first)

| Ask | State |
|---|---|
| NPCs walk with their feet inside the ground | Fixed 11-20 (09ea736): the clips' hip height was scaled from a pelvis the loader never found; soles were 7-9 cm under the floor, now within 4 mm |
| The pillars look bad (the backlit onyx) | Variants rendered (tools/blender/variants13.py); the chosen one replaces them |
| The ceiling still bad; "cubic lights" (the coffer grid of downlights) make no sense | Variants rendered; the chosen ceiling replaces the coffers |
| The LUMIÈRE name stuck and cropped (the letters behind the ticket canopy) | Open |
| Carpets cut in the middle, not continuing | Open: find each carpet that stops short or splits |
| Variants of the best designs, choose the best, use it | variants13.py: columns P0-P3, ceilings C0-C2, compared on one board |

## Audit: the master prompt against what exists

Legend: **done** (works in the engine, tested), **partial** (exists, gaps listed), **missing**.

### 1. Modes
| Requirement | State | Where / gap |
|---|---|---|
| Taxi arrival, first person, explorable cinema | done | intro9.js, player.js, world9.js |
| Reception, booking, ATM, wallet, tickets | done (rupee wallet) | booking9.js, main.js; the wallet is not Lumière Credits (section 8) |
| Ticket checker at the halls, restricted areas | done | world9.js gate (usher's pass), walk.mjs "zone shut" walks |
| Guide to the seat, waiter with a trolley, popcorn by the seat | done | npc9.js usher and server, recline.js cup holders, held.js |
| Lifts, escalators, separate exits, corridors, restrooms, doors | done | lift9.js, world9.js; walk.mjs 30/30 |
| Quick play: straight in, tablet, video choice, no ATM | done | main.js quick mode, tablet.js |
| Quick play: friends and multiplayer from it, saved theatre presets | partial / missing | presets need the editor (9) |

### 2. Cinemas
| Requirement | State | Where / gap |
|---|---|---|
| Standard, curved, large-format (MAX, not IMAX), ScreenX-style | done | hallmath.js, film9.js (X-270 side screens) |
| Seat choice, recliners that recline, popcorn by the seat | done | booking9.js, recline.js |
| Screen light on the walls, different lighting | done | film9.js spill, light maps' screen layer |
| Configurable screen size, capacity, seating, acoustics | missing | the theatre editor (9) |

### 3. NPCs
| Requirement | State | Where / gap |
|---|---|---|
| Walk, sit, stand, talk, react to the film, staff jobs | done | npc9.js, react.js, people.js (Rocketbox, CC BY) |
| Eat, drink, laugh, cry, clap at the right moments, dance, idle variety | partial | react.js times reactions to the film's events; eating/drinking loops, dancing and crying missing |
| NPC-to-NPC conversation, gossip, personalities, four languages, lip sync, voices by distance | partial | voice.js (en/es/hi/ur clips, mouth envelopes), talk.js; NPC-to-NPC talk is short and repetitive |
| Cleaners, security | missing | new roles in npc9.js |
| No talking during the film, no clapping at nothing | partial | to audit in react.js / npc9.js |

### 4. Multiplayer
| Requirement | State | Where / gap |
|---|---|---|
| Rooms with a host, shared shows on one clock, chat, emotes, names | done | mp.js (Trystero over public Nostr relays: no account, no key), mpui.js |
| Public rooms you can discover, player count, descriptions, 10 players | missing | room announcements on the same relays |
| Private rooms: invitation codes, passwords | partial | room codes exist; passwords missing |
| Host controls: voice, playback rights, NPC population, presets, kick, transfer | partial | transfer exists; the rest missing |
| Voice chat, proximity voice, party voice | missing | WebRTC audio over the same peer links |
| Friends, private messages, pictures, block, mute, report, online status | missing | the smartphone (5) over the peer links, local friend list |

### 5. The in-game smartphone
Missing. Friends, messages, pictures, wallet, bookings, profile, cosmetics, invitations, settings, notifications, theatre discovery,
social controls: one phone UI (a real interface on screen, raised from the pocket), notifications on it while you are in the cinema.

### 6. Video and streaming
| Requirement | State | Where / gap |
|---|---|---|
| YouTube links (official player, ads kept, no download), your own videos, Blender films | done | film9.js YouTube layer, films.js (Internet Archive), tablet.js |
| Play, pause, seek, timeline, quality | done | tablet.js |
| Synchronised among room members, host rights | done | film9.js `s.sync` on the room's clock |
| Resume after the app closes, after a reconnect | partial | to verify; save the session on visibility change |

### 7. Sound and picture
Spatial and directional sound, distance, occlusion through doors, ambience, voices, crowd, lift, escalator, popcorn, trolley: done
(sound.js, sound9.js). Separate music / ambience / dialogue / effects volumes: partial (to check in settings). Atmos-like height layer:
done (overhead speakers' layer), honestly named "height sound", not Dolby Atmos.

### 8. Lumière Credits
Missing. The rupee wallet is story money. The master prompt asks for credits earned on licensed Lumière films (never on YouTube), daily
caps, anti-AFK, a history, and server-authoritative transactions. Honest limit: with no server there is no authority; a phone app can
be edited. Plan: the economy as a client module with a ledger interface; the ledger runs locally (tamper-evident, not tamper-proof)
until a free backend exists (below).

### 9. Theatre editor and presets
Missing (layoutedit.js edits on-screen controls only). Plan: an editor for one hall's seat rows, seat models, aisles, screen size and
lights, capacity counted, exits kept clear; presets saved, duplicated, shared as codes, loaded in Story, Quick play and private rooms.

### 10. Profiles and avatars
Partial: an avatar picker from the photographed people and a name (mpui.js). Clothing, accessories, cosmetics inventory: missing.

### 12. Platforms
Android (wrapper), browser on PC and iOS, keyboard and mouse, controller, VR (WebXR) auto-detected: done in input.js; a PWA manifest for
iOS install: to check. Graphics presets: done.

### 13. Servers
None (by design so far: nothing to pay for). Accounts, persistent wallet, friends across devices and server-side room recovery need a
backend. Free options that need the user's own free account (to be chosen by the user; nothing is bought):
- Cloudflare Workers + Durable Objects + D1 (free plan: 100k requests a day; rooms as Durable Objects, one per room, isolated)
- Supabase free (Postgres, auth, realtime; pauses after a week idle)
- Firebase Spark (Auth, Firestore 50k reads a day)
Until one exists: peer-to-peer rooms (as now), friends and messages over peer links, the ledger local.

## The core idea (what makes it new)

**Lumière is a cinema you live in and run.** Not a player with a 3D skin: a place that is alive when you are alone (staff with jobs,
guests with their own nights, a crowd that reacts to the film's real moments), that you can watch with friends anywhere (a room on any
network, one clock, voices by distance), and that becomes yours (build your own halls, save and share them, earn credits on open films,
spend them on seats, looks and decor). Three things trends in 2026 favour together: co-watching with presence (Bigscreen, Teleparty),
creator-built spaces (Roblox, Fortnite UEFN), and cosy "living place" sims.

## Stages (each: research, build, gates, renders, commit)

1. **Lobby from the photos**: columns and ceiling from the variants; LUMIÈRE name clear of the canopy; carpets continuous; the
   corridor with lit portal frames and hall-number roundels; a CONCESSIONS marquee and photo menus. Gates: connect, zcheck 0/0, walks.
2. **The smartphone**: the shell (home, apps, notifications) with Wallet, Bookings, Friends, Messages, Profile, Settings, Rooms.
3. **Lumière Credits**: ledger, earning on licensed films (anti-AFK, daily cap), spending (cosmetics, seat upgrades, queue priority),
   history.
4. **Theatre editor and presets**.
5. **Rooms**: public discovery, 10 players, passwords, host controls, voice and proximity voice, block, mute, report.
6. **NPC life**: cleaners, security, eating and drinking, NPC-to-NPC talk without repeats, quiet during the film, reactions only on
   real moments.
7. **Settings apply on the spot; UI motion; sound mixer**.
8. **Licences register per film and asset; YouTube terms; security pass** (bridge, loopback server, media proxy, peer messages, CSP).
9. **Release**: phone bench, signed APK and AAB.

Open world (time of day across the street, enterable buildings, cars to drive, beaches) follows the cinema, per the master prompt.
