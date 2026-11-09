# Night Hunt 🚁👹 (v1.8.0, rated 13+)

v1.8 adds drivable pickups, sedans and SUVs, fixes ocean boats so they can actually be driven, and makes Boisvert's TV static see-through. Monster materials and motion are heavier on high graphics and stay lighter on phones. This branch is not live until it is merged.

v1.7 replaces the shopping street with a city and a mall, adds a 3D item showcase, original emotes, survivor coils, and a one-time 10,000 coin grant. The browser build is the one exercised here. It is not deployed until this branch is merged and GitHub Pages publishes it. Paid coin packs stay disabled.

## Owner admin
Admin is off in this build. Hosting a room, or naming yourself Leo, does not grant it, and there is no password or key in the client. To enable it, run an authoritative server you control, verify Leo with an identity provider on that server, and set `globalThis.NH_OWNER_CHECK` to a function that returns true only after that check. The function is not set by the Pages site or the Windows wrapper. Behind it, the server accepts kick, end, and a small coin grant. Until then the admin panel only explains the lock.

A fan-made multiplayer monster survival game for playing with friends. Board the helicopter, drop into a dense power-line forest, loot chests and bags, and survive the monsters.

> ⚠️ **Rated 13+.** The game has flashing lights (a photosensitive epilepsy risk: stop playing if you feel unwell), blood, jumpscares and loud sounds. A warning screen comes up before the menu, and you must press Continue.

## How a round works
1. **Helipad lobby.** The host creates a server and picks:
   - **max players** (2-15);
   - **privacy**: friends only (code or link) or public (listed in the server browser);
   - **round length**: 5, 7 or 10 minutes (7 by default).
2. In the lobby, the helipad sits on a city avenue. Walk east into the **Night Mall**. The nine shops are stalls inside it (walk up and press **E**). A separate **coin kiosk** outside the door only offers a labeled free daily reward. Paid coin packs stay disabled. New profiles start with 10,000 coins. An older save is topped up to 10,000 once if it had less, and is never reset again. Tap an item to open the 3D showcase. Buying and equipping are separate.
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

## Joining a friend's server (fixed in v1.6.0)
**What was wrong:** in the browser version, friends join over a direct peer-to-peer (WebRTC) connection. When two networks can't connect directly (strict or "symmetric" NAT, carrier-grade NAT on mobile data or hotspots, school or work Wi-Fi, or two people on the same router), the connection has to go through a TURN relay. The free relay built into PeerJS has been shut down, so those friends always got "Could not reach that server".

**What changed:**
- More STUN servers (Google, Cloudflare), plus free public TURN relays (freeTURN, Open Relay) on ports 80/443, including TLS.
- If a direct connection still isn't open after about 9 seconds, the game switches to a relay that works anywhere normal websites work (WSS on port 443). It's slightly laggier, and you'll see a message when it's in use.
- The relay keeps working while the host's tab is in the background.

**How a friend joins:**
1. The host opens https://leonisbel.github.io/night-hunt/, types a name, presses **Create Server** and keeps that tab open (it's the server).
2. The host presses **Copy invite link** and sends it to the friend. Or the friend opens the same site, picks **Join with Code** and types the 5-letter code.
3. The friend types a name and presses **Join**. It can take up to about 15 seconds on strict networks.
4. Friends-only servers don't show up in the public list, so use the code or the invite link. Both players should refresh the page once to get the latest version.

## Realism overhaul (v1.6.0)
- **Cinematic rendering:** ACES filmic tone mapping, ambient occlusion (SSAO), bloom, depth of field on the menu and in jumpscares, film grain, vignette, slight chromatic aberration and a colour grade per map (the Vampire Castle gets a red moon).
- **Volumetric fog and god rays:** moonlight shafts through the trees use the shadow map, and your flashlight beam lights the fog, with its own shadows. Shadows are soft (PCSS): sharp at contact and blurrier further away.
- **Real night skies:** star-filled panoramas from Poly Haven HDRIs (clear, stormy and Milky Way), with a moon that matches the moonlight direction.
- **Water:** the Stormy Ocean gets moving waves with Fresnel reflections of the sky, a moon glint, foam on wave crests and along the shore, and rain ripples. The swamp pools are murky and still.
- **Photo-scanned ground and buildings:** leaf litter, mud, snow, sand, asphalt, concrete, brick, castle stone, old planks and bark are CC0 PBR scans with anti-tiling. Surfaces get wet and glossy with puddles when it rains. Houses have wallpaper inside, and facilities have concrete. Lit windows show curtains and window frames with a soft warm glow instead of flat bright panels.
- **Dense foliage:** trees are rebuilt from alpha-card leaves and needles cut from plant scans. They sway in the wind, along with grass clumps, ferns and reeds. Scanned rocks, stumps, fallen logs and shrubs are scattered through the woods.
- **Monsters and survivors:** monsters breathe, with chests that heave faster when they run, heads that lag the stride and scan while idle, and HDR eye shine that blooms in the dark. Survivors have subsurface skin, woven cloth, denim, leather and rubber materials, plus breathing, a counter-rotating torso and a head that steadies against the stride.
- **Audio:** recorded CC0 ambience per map (rain, crickets, distant howls, wind, cave drips, ocean waves) under the procedural drones, and footsteps that match the surface: grass, concrete, wood floors, carpet or snow.
- **Graphics setting:** Options → Graphics: Auto, Low (phones), Medium, High or Ultra. You can also add `?gfx=low|med|high|ultra` to the URL. Auto picks Low on phones, Medium on big tablets and High on computers. Low turns off the heavy effects, so phones stay smooth.
- **Blood (13+):** hits leave dark-red splatter decals and drips that fade over time. There is no gore.

## Remodeled monsters (v1.5.1)
Every monster except the Megalodon was rebuilt from reference images: furry FNAF suits with joint segments (Chica wears her LET'S EAT!!! bib and holds the cupcake), a Demogorgon whose petals stay closed until it attacks and then open red, a hovering Cartoon Cat, the Locust with hose hair and drips (its omen now shows an old floral beige wallpaper with brownish smears), a black anvil-headed Boisvert (formerly "Monochrome") and Father Fester with an egg head, hollow eyes and a very long drooping jaw (still 6 stages). Also remodeled: Siren Head, Sonic.exe (teen-level blood only), Kraken, Cthulhu, Leviathan, Mosasaurus, Nessie, Spinosaurus, T-Rex, Quetzalcoatlus, Yeti, Dragon (gold scales, blue-green wings), Chupacabra, Vampire (Nosferatu), Gargoyle and Bigfoot. The new **Wendigo** lives in the forest maps and on Snowy Mountain.

**Dinosaur roars:** the T-Rex and Spinosaurus have new big-movie-style roars that play when they use their power, now and then while they hunt, and in their jumpscare. No movie audio is used. They are layered and pitch-shifted from CC0/public-domain animal recordings (elephant, tiger, grizzly, alligator), and the credits are in `vendor/LICENSES.md`.

## Realistic monsters (v1.5.0)
- **PBR surfaces on every monster:** each body part is mapped to a real material: animatronic teddy fur and rusted endoskeletons, scaly reptile hide with pale-belly countershading, wet glossy shark and sea-monster skin with clearcoat, slick Demogorgon skin, weathered gargoyle stone, dried Siren Head flesh, rubbery Cartoon Cat ink, see-through wing membranes and glossy eyes. Each material has normal, roughness and colour-detail maps. Some are CC0 photo-scanned sets from Poly Haven; the others (scales, scutes, hide, chitin and more) are generated in code.
- **Lighting:** a moonlit environment map adds reflections and specular highlights. Skin uses a wrap-lighting subsurface-scattering approximation, so it glows softly at the edges instead of looking like plastic. Thin wing membranes glow red when the moon is behind them. Eyes glow, and every monster casts shadows and fades into the fog.
- **Real fur:** Yeti, Bigfoot and other furry monsters get layered shell fur (strands with gravity droop and darker roots) when the camera is close.
- **Better anatomy:** smoother, curved (PN-triangle) silhouettes and smooth normals on the CC0 dinosaurs, sharks and dragons, and rounded joints on every limb. Bigger changes:
  - Yeti and Bigfoot are re-sculpted as apes: sagittal crest, brow ridge, long arms, padded feet.
  - The Demogorgon is gaunt, with a ribcage and long jointed fingers, and its petals have rows of teeth.
  - The Spinosaurus has a crocodile-like snout and a paddle tail.
  - The dragon has a longer neck and an adult head.
  - Springtrap has more decay and exposed wires.
- **Phones stay fast:** phones and touch devices automatically get lighter materials, half-size maps, no fur shells and no extra geometry detail. Use `?gfx=low` or `?gfx=high` to override. On desktop, fur shells only render within 14 m.
- **Roblox:** fur monsters use Carpet, skin uses Leather, the gargoyle uses Basalt and sea creatures get a wet reflectance. Glowing eyes now cast light, and parts have subtle tone variation.

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
| Boisvert (black anvil head, tiny white eyes, grainy static aura) | Dead Channel: every survivor's whole screen fills with opaque, animated TV static and a roaring hiss for 10 s | you dissolve into grey blocks |
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
| Wendigo (new in v1.5.1) | Two forms that swap every 30 s with a bone-crack morph. Deer form: Antler Charge gores, stuns and shoves the survivor in front. Human form: Mimic Lure & Leap calls out in a stolen voice, reveals nearby survivors, then leaps at the closest | deer: an antler charge out of the trees; human: a scream, then it leaps at you |
| Father Fester | Lights Out: every house light dies, survivors black out and are revealed. Passive: each survivor who sees him makes him stronger (6 stages, his look changes) | the lights flicker and he's closer every time they come back |

**Sea monster omens:** before a sea monster reaches you, you may spot its sign: Kraken tentacles, Cthulhu's red eyes and wings in thunderclouds, Leviathan coils, a Mosasaurus tail flick, a Megalodon dorsal fin, Nessie's neck rising or a Spinosaurus sail.

**Doctor Nowhere's forms** (fan horror art by Silas Orion):
- The Doctor (white coat): Injection slows the survivor in front of you for 6 s.
- Cone Zone (charcoal, fuzzy long-legged spider): Skitter Dash, very fast for 2.5 s.
- Nightmare Man (smoky black figure): Shadow Step blinks you far ahead.
- The six-armed Doctor: Paranoia makes nearby survivors hallucinate and reveals them to you.
- Guilt (tall white figure with a flat face plate, new in v1.5.1): Guilty Stare slows every survivor who is looking at it for 5 s.

Each form has its own jumpscare, and the switch is a glitch morph (sparks, screen glitch).

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
- The Locust and Boisvert: their creators.
- Father Fester: his creator. Cthulhu: H. P. Lovecraft (public domain).

Since v1.4 the browser and Windows versions also use a few free **CC0 (public domain) 3D models by Quaternius** as bases for the shark, dinosaurs and dragon (see `vendor/LICENSES.md`). The Roblox version builds every model from parts.
