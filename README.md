# Night Hunt 🚁👹 (v1.4.1, rated 13+)

A fan-made multiplayer monster survival game for playing with friends. Board the helicopter, drop into a dense power-line forest, loot chests and bags, and survive the monsters.

> ⚠️ **Rated 13+.** The game has flashing lights (a photosensitive epilepsy risk: stop playing if you feel unwell), blood, jumpscares and loud sounds. A warning screen comes up before the menu, and you must press Continue.

## How a round works
1. **Helipad lobby.** The host creates a server and picks:
   - **max players** (2-15);
   - **privacy**: friends only (code or link) or public (listed in the server browser);
   - **round length**: 5, 7 or 10 minutes (7 by default).
2. In the lobby, walk down the **Shopping Street** next to the helipad. It has **nine walk-in stores**, each with its own sign, themed displays and a counter (walk up and press **E** to open that store). Everything costs in-game coins you earn in rounds; there is no real money. Your choices are saved.
   - **Skin Shop:** survivor skins, hats and accessories.
   - **Weapon Shop:** knife, bat, crowbar, axe, pistol, shotgun and ammo. **Armor Shop:** bulletproof vest and helmet. **Food & Drinks:** snacks, drinks and medkits. Up to **3 round supplies** from these shops are handed to you at the start of your next round.
   - **Monster Skins:** monster skins shown on statues, plus your **preferred monster** (the round usually goes to that monster's home map).
   - **Emotes & Dances:** a disco dance floor; buy emotes and play them with **B** (Wave is free).
   - **Pets & Trails:** a pet that follows you (puppy, kitty, bat, owl, slime, pumpkin, ghost, baby dragon) and a trail behind you.
   - **Dressing Room:** customise your survivor, buy **outfits** and check the mirror.
   - **Mystery Crates:** 150 coins for a random cosmetic you don't own yet.
3. Everyone walks onto the helipad, and the host presses **Take off!**. Each player has a random chance to become a **monster**.
4. **Survivors** search **chests and bags** for gear:
   - food and drinks (heal and restore stamina);
   - a **bulletproof vest** and a **helmet**;
   - melee weapons: **knife, bat, crowbar, axe**;
   - guns: **pistol, shotgun, rifle**, plus ammo.

   Fight back, sleep in beds to heal, and reach the **extraction helicopter**, which lands for the last 90 seconds.
5. **Monsters** have health. Survivors can **knock them down and stun them**; they get back up after a few seconds. Monster hits drain survivors' health, and a survivor at 0 is caught.

## End screens (v1.4.1)
- **YOU DIED:** after a monster's jumpscare animation has fully finished, the caught survivor sees who killed them and their round stats (time survived, damage dealt, monster knockdowns, coins earned), with **Spectate** and **Return to Lobby** buttons.
- **KILL:** the monster player sees a "KILL / <survivor> eliminated" popup after its kill cam. It fades out on its own so the hunt keeps going.
- **Round results:** a full results screen (survivors or monster win, victory or defeat for you, every player's role, result, kills/damage, knockdowns and coins) with a countdown back to the lobby. It waits until any jumpscare, death screen or kill popup is done.

## Monsters
| Monster | Power (every power has a 20 s cooldown) | Jumpscare |
|---|---|---|
| Freddy, Bonnie, Chica, Foxy, Springtrap | Afton Laugh: a creepy laugh, and you see every survivor for 10 s | classic screaming rush with the jaw wide open |
| Cartoon Cat | Rubber Grab: a rubber arm yanks the survivor in front of you to your feet | grabs you and stretches you out |
| Siren Head | Siren Call: reveals every survivor (even hidden ones) for 8 s | lifts you up to its speaker head |
| Doctor Nowhere | Shapeshift: changes form every 30 s, and each form has its own power (see below) | a different one per form |
| The Locust | Swarm Omen: one random survivor's TV/phone/computer shows an old wallpaper and a child-like voice, then it slams their screen | possession: the screen tears and distorts |
| Monochrome | Total Blackout: every survivor's screen goes pitch black for 10 s | you dissolve into grey blocks |
| Sonic.exe (fan-made creepypasta) | You Can't Run: a distorted laugh, then you run much faster for 10 s | grabs, then lunges |
| Demogorgon | Upside Down Portal: come out of a portal near the closest survivor | the petal face blooms open as it lunges |

| **Phase 2 (v1.4)** | | |
| Megalodon | Tidal Surge: a wave knocks survivors back, stuns them and throws them out of boats. In water it's a 15 m shark; on land it walks as a huge buff humanoid shark | you're swarmed by fins, a shadow rises, then it leaps, swallows you and dives |
| Kraken | Tentacle Grab: drags the closest survivor to you, even out of a boat | tentacles close in around you, then the beak |
| Cthulhu | Thunderstorm: lightning hits the 3 closest survivors | a towering figure lit by lightning leans down |
| Leviathan | Whirlpool: pulls in and slows everyone nearby for 4 s | the coils wind around you, then it strikes |
| Mosasaurus | Tail Slam: a crashing wave stuns and capsizes | the jaws burst up out of the water under you |
| Nessie | Deep Dive: invisible and faster for 6 s, sea fog rolls in | the neck rises and the head swoops down |
| Spinosaurus | Swamp Ambush: sink out of sight, then burst out charging | the sail cuts through the swamp, then the lunge |
| T-Rex | Tyrant Roar: stuns close survivors and reveals everyone | a deafening roar, then the bite from above |
| Quetzalcoatlus | Sky Dive: dives onto the closest survivor | it dives at you out of the sky |
| Yeti | Avalanche Roar: stun, slow and whiteout | a roar in a blizzard, then the lunge |
| Dragon | Fire Breath: a cone of fire that keeps burning | a wall of fire, then the jaws |
| Chupacabra | Blood Drain: bite to heal yourself and slow them | it leaps at you from the side |
| Vampire | Bat Swarm: re-form beside the closest survivor and blind them | nothing there... you turn around: it's behind you |
| Gargoyle | Stone Skin: no damage for 6 s, then a crashing stun | a still statue whose eyes light up, then it lunges |
| Bigfoot | Boulder Throw: a big hit and a 2 s stun | it charges out of the dark woods |
| Father Fester | Lights Out: every house light dies, survivors black out and are revealed. Passive: each survivor who sees him makes him stronger (6 stages, his look changes) | the lights flicker and he's closer every time they come back |

**Sea monster omens:** before a sea monster reaches you, you may spot its sign: Kraken tentacles, Cthulhu's red eyes and wings in thunderclouds, Leviathan coils, a Mosasaurus tail flick, a Megalodon dorsal fin, Nessie's neck rising or a Spinosaurus sail.

**Doctor Nowhere's forms** (fan horror art by Silas Orion):
- The Doctor (white coat): Injection slows the survivor in front of you for 6 s.
- Cone Zone (tall white cone head): Cone Quake stuns every survivor close by.
- Nightmare Man (smoky black figure): Shadow Step blinks you far ahead.
- The six-armed Doctor: Paranoia makes nearby survivors hallucinate and reveals them to you.

Every jumpscare cuts to black at the moment of impact. With **Blood effects** on (the default), it adds teen-level red splatter and drips; there is no dismemberment and no detailed gore. You can turn this off in the menu (browser) or with the top-left button (Roblox). Players near the catch see the victim lifted, stretched, dissolved or dragged away, and hear the scream.

## Maps
- **Powerline Forest** (the main map): dense forest with power-line towers and wires, fog, hills, cabins and facilities.
- **Abandoned Pizzeria Town**, **Foggy Woods** and **Static Fields**.
- **Stormy Ocean (new):** islands with huts and docks, plus **boats and ships you can drive** (E to board, WASD or joystick to steer; on Roblox, sit at the helm). "DANGER DEEP WATER" signs line the shore. Go too far out and you hit a **deadly storm**: buoys and "TURN BACK" signs mark the edge.
- **Rainforest Swamp (new):** jungle, deep water pools and the Spinosaurus, T-Rex and Quetzalcoatlus.
- **Snowy Mountain (new):** pines, a peak and a glacier lake; home of the Yeti.
- **Haunted Farm (new):** red barns, silos, corn fields you can hide in, and scarecrows; home of the Chupacabra.
- **Vampire Castle (new):** a walled castle with towers, a keep, a coffin and a graveyard; home of the Vampire, Gargoyle and Dragon.
- **Fester Street (new):** a street grid of two-storey houses with varied, flickering window lights; Father Fester's map.

Maps are several times bigger than in v1.3, and far-away objects are streamed and simplified so it stays smooth. Every building is a furnished house (rooms, beds, TVs and computers) or a facility.

## Controls
- **Keyboard and mouse:**
  - WASD: move · Shift: sprint · mouse: look · wheel: zoom (third person to first person)
  - click/Space: attack or use · 1-6: hotbar · G: drop · E: open or sleep (survivors), power (monsters) · Q: monster power · Tab: scoreboard · M: mute
- **Phone and tablet:** joystick, drag to look, pinch to zoom, plus touch ATTACK, USE, POWER and RUN buttons.

## Ways to play
- **Browser:** <https://leonisbel.github.io/night-hunt/> (Online, peer-to-peer).
- **Windows app:** unzip `NightHunt-Windows.zip` and run `Night Hunt.exe`.
  - If Windows SmartScreen warns you, click *More info*, then *Run anyway*.
  - It offers *Online* mode or *Wi-Fi* mode, where your PC is the server.
- **Roblox:** open `NightHunt.rbxlx` in Roblox Studio (see `roblox/README.md`).
- **Own server:** `npm install && node server.js` (Node 18+).

## Coming next (phase 3 ideas)
- Online accounts so coins and skins follow you between devices.
- Swimming animations and underwater sections for the ocean map.
- More store items (flashlight colours) and monster skin previews in the mirror.
- Uploaded audio for every new monster on Roblox.

Fan-made for private play. Models and sounds are original procedural look-alikes, apart from the CC0 models listed below; no copyrighted assets are used. The characters belong to their creators:
- Freddy, Bonnie, Chica, Foxy and Springtrap: Scott Cawthon.
- Cartoon Cat and Siren Head: Trevor Henderson.
- The Demogorgon: Netflix.
- Sonic.exe: a fan creepypasta based on Sega's Sonic.
- Doctor Nowhere: Silas Orion.
- The Locust and Monochrome: their creators.
- Father Fester: his creator. Cthulhu: H. P. Lovecraft (public domain).

Since v1.4 the browser and Windows versions also use a few free **CC0 (public domain) 3D models by Quaternius** as bases for the shark, dinosaurs and dragon (see `vendor/LICENSES.md`). The Roblox version builds every model from parts.
