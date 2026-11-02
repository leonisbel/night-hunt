# Night Hunt 🚁👹 (v1.3.0, rated 13+)

A fan-made multiplayer monster survival game for playing with friends. Board the helicopter, drop into a dense power-line forest, loot chests and bags, and survive the monsters.

> ⚠️ **Rated 13+.** The game has flashing lights (a photosensitive epilepsy risk: stop playing if you feel unwell), blood, jumpscares and loud sounds. A warning screen comes up before the menu, and you must press Continue.

## How a round works
1. **Helipad lobby.** The host creates a server and picks:
   - **max players** (2-15);
   - **privacy**: friends only (code or link) or public (listed in the server browser);
   - **round length**: 5, 7 or 10 minutes (7 by default).
2. In the lobby you can open the **locker** to customise your survivor and pick a preferred monster. The **coin shop** sells hats, accessories and monster skins for coins you earn in rounds. There is no real money. Your choices are saved.
3. Everyone walks onto the helipad, and the host presses **Take off!**. Each player has a random chance to become a **monster**.
4. **Survivors** search **chests and bags** for gear:
   - food and drinks (heal and restore stamina);
   - a **bulletproof vest** and a **helmet**;
   - melee weapons: **knife, bat, crowbar, axe**;
   - guns: **pistol, shotgun, rifle**, plus ammo.

   Fight back, sleep in beds to heal, and reach the **extraction helicopter**, which lands for the last 90 seconds.
5. **Monsters** have health. Survivors can **knock them down and stun them**; they get back up after a few seconds. Monster hits drain survivors' health, and a survivor at 0 is caught.

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

**Doctor Nowhere's forms** (fan horror art by Silas Orion):
- The Doctor (white coat): Injection slows the survivor in front of you for 6 s.
- Cone Zone (tall white cone head): Cone Quake stuns every survivor close by.
- Nightmare Man (smoky black figure): Shadow Step blinks you far ahead.
- The six-armed Doctor: Paranoia makes nearby survivors hallucinate and reveals them to you.

Every jumpscare cuts to black at the moment of impact. With **Blood effects** on (the default), it adds teen-level red splatter and drips; there is no dismemberment and no detailed gore. You can turn this off in the menu (browser) or with the top-left button (Roblox). Players near the catch see the victim lifted, stretched, dissolved or dragged away, and hear the scream.

## Maps
- **Powerline Forest** (the main map): dense forest with power-line towers and wires, fog, hills, cabins and facilities.
- **Abandoned Pizzeria Town**, **Foggy Woods** and **Static Fields**.

Every building is a furnished house (rooms, beds, TVs and computers) or a facility.

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

## Coming in phase 2
- **New creatures**, each with its own jumpscare:
  - Father Fester: his look escalates with every sighting; he swallows you whole, and his "consume" drains stamina, light or time.
  - Cthulhu: grabs and squeezes.
  - Leviathan, T-Rex and Mosasaurus: eat you.
  - Kraken: drags you underwater.
  - Loch Ness Monster: slams.
  - Spinosaurus: bites.
  - Megalodon: you're swarmed and a shadow rises, then it leaps out of the water, swallows you and dives.
  - Yeti, Chupacabra and Bigfoot: maul lunge.
  - Vampire: bite with a drain fade.
  - Dragon: fire engulfs you.
  - Gargoyle: carries you into the sky and drops you.
  - Quetzalcoatlus: pecks.
- **New maps:** ocean (boats, storms, waves), rainforest/swamp, snowy mountain, farm, castle.
- **Ocean warning signs** for each lurking monster:
  - Kraken: tentacles roaming in the deep.
  - Cthulhu: a thunderstorm with red eyes and wings in the clouds.
  - Leviathan: huge coils surfacing.
  - Mosasaurus: a tail flick.
  - Megalodon: a big dorsal fin.
  - Loch Ness Monster: a long neck rising.
  - Spinosaurus: a sail breaking the surface.

Fan-made for private play. All models and sounds are original, procedural look-alikes with no copied assets. The characters belong to their creators:
- Freddy, Bonnie, Chica, Foxy and Springtrap: Scott Cawthon.
- Cartoon Cat and Siren Head: Trevor Henderson.
- The Demogorgon: Netflix.
- Sonic.exe: a fan creepypasta based on Sega's Sonic.
- Doctor Nowhere: Silas Orion.
- The Locust and Monochrome: their creators.
