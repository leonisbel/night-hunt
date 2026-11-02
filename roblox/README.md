# Night Hunt: Roblox version (fan-made, v1.5.1, rated 13+)

A Roblox Studio port of Night Hunt. Players meet in a helicopter lobby, fly out together and land in a generated map; the main one is a dense power-line forest. Every player has a random chance to be a monster. Survivors loot chests and bags, fight back and get to the extraction helicopter.

> **Rated 13+:**
> - A warning screen (flashing lights and epilepsy risk, blood, jumpscares, loud sounds) has to be dismissed with **Continue** before play.
> - Jumpscares include teen-level blood splatter. There is a **Blood effects** on/off button at the top left; it is on by default.
> - When you publish, fill in Roblox's **Maturity & Compliance questionnaire** in the Creator Dashboard so the experience gets the matching age rating.

## What's in it
- **Hub, servers and invites.**
  - Create, join by code, or browse public servers.
  - Every match is its own reserved server, with *Friends only* or *Public* privacy.
  - The **Invite friends** button sends the join code along with the invite.
- **Lobby.**
  - Board on the helipad.
  - The host sets max players, privacy and **round length** (5/7/10 min).
  - **Locker & shop**: skin tone, hair, clothes, and hats, accessories and monster skins bought with in-game **coins** (no Robux). It also sets your monster preference. Everything is saved with DataStore.
- **Survivors.**
  - Hold **E** on chests and bags (ProximityPrompts) for:
    - food and drinks;
    - vest and helmet armor (worn visibly);
    - knife, bat, crowbar and axe;
    - pistol, shotgun and rifle, plus ammo.
  - Items are Roblox Tools in your hotbar: click, or the touch **ATTACK** button, to use them.
  - The HUD shows HP, armor and ammo. Beds heal you while you sleep.
- **Monsters.**
  - Each has a health bar.
  - Melee and guns can **knock a monster down and stun it**, and it recovers after a few seconds.

| Monster | Power (every power has a 20 s cooldown) | Jumpscare |
|---|---|---|
| Freddy, Bonnie, Chica, Foxy, Springtrap | Afton Laugh: a creepy laugh, and you see every survivor for 10 s | classic screaming rush with the jaw wide open |
| Cartoon Cat | Rubber Grab: a rubber arm yanks the survivor in front of you to your feet | grabs you and stretches you out |
| Siren Head | Siren Call: reveals every survivor (even hidden ones) for 8 s | lifts you up to its speaker head |
| Doctor Nowhere | Shapeshift: changes form every 30 s, and each form has its own power (see below) | a different one per form |
| The Locust | Swarm Omen: one random survivor's TV/phone/computer shows an old wallpaper and a child-like voice, then it slams their screen | possession: the screen tears and distorts |
| Boisvert | Total Blackout: every survivor's screen goes pitch black for 10 s | you dissolve into grey blocks |
| Sonic.exe (fan-made creepypasta) | You Can't Run: a distorted laugh, then you run much faster for 10 s | grabs, then lunges |
| Demogorgon | Upside Down Portal: come out of a portal near the closest survivor | the petal face blooms open as it lunges |

**Doctor Nowhere's forms** (fan horror art by Silas Orion):
- The Doctor (white coat): Injection slows the survivor in front of you for 6 s.
- Cone Zone (tall white cone head): Cone Quake stuns every survivor close by.
- Nightmare Man (smoky black figure): Shadow Step blinks you far ahead.
- The six-armed Doctor: Paranoia makes nearby survivors hallucinate and reveals them to you.

Every jumpscare cuts to black at the moment of impact. With **Blood effects** on (the default), it adds teen-level red splatter and drips; there is no dismemberment and no detailed gore. You can turn this off in the menu (browser) or with the top-left button (Roblox). Players near the catch see the victim lifted, stretched, dissolved or dragged away, and hear the scream.

## New in v1.5.1
- **Boisvert** (formerly Monochrome) is remodeled with a black anvil head and tiny white eyes. Dead Channel fills every survivor's screen with full opaque, animated TV static (a ScreenGui grid that is re-randomized every frame) plus a looping hiss for 10 s. The cooldown is 20 s.
- **Doctor Nowhere:** Cone Zone is now a charcoal fuzzy spider with Skitter Dash. The new fifth form, **Guilt**, uses Guilty Stare: survivors looking at it are slowed for 5 s. Each form has its own jumpscare.
- **New Wendigo:** a deer form (Antler Charge) and a human form (Mimic Lure & Leap) swap every 30 s with a bone-crack sound. Its home maps are Snowy Mountain and the forests (`Config.HOME` now accepts a list).
- Father Fester has an egg head and a long drooping jaw.
- **T-Rex / Spinosaurus roars** play on ability use, occasionally while idle, and in the jumpscare.
  - Limitation: Roblox needs uploaded asset ids, and the Creator Store couldn't be searched or uploaded to while this release was built. Until you add ids, a pitched built-in Roblox voice sound stands in.
  - To use the real roars: upload `roblox/sounds/trex_roar.mp3` and `spino_roar.mp3` (made from CC0/public-domain recordings with no movie audio; see `vendor/LICENSES.md`) in Studio, or pick Creator Store roars. Then paste the `rbxassetid://` ids into `Config.SOUNDS.trexroar` / `spinoroar` (and optionally `static`).
- The Roblox models are still built from primitive Parts, so they are simpler than the browser models. The Wendigo, Guilt, Cone Zone, Boisvert and Fester builders are new.

## New in v1.5.0
- **More realistic monsters:**
  - Fur monsters (Yeti, Bigfoot) use Carpet.
  - Dried skin and slick skin (Siren Head, Demogorgon, Quetzalcoatlus) use Leather.
  - The gargoyle uses Basalt.
  - Sea creatures and the Demogorgon get a wet reflectance.
  - Every Neon eye now casts a small PointLight onto the face.
  - Every part gets subtle per-part tone variation and casts shadows.
- The browser and Windows versions get the full PBR, subsurface, fur-shell and anatomy upgrade. Roblox parts can't use custom normal maps without uploaded SurfaceAppearance assets.

## New in v1.4.1
- **End screens:** after every jumpscare animation finishes, the caught survivor gets a **YOU DIED / Killed by <monster>** screen with round stats (time survived, damage dealt, knockdowns, coins) and **Spectate** (follow living players; the server streams the map around them) or **Return to Lobby** (you're already in the lobby; this closes the screen). The monster gets a fading **KILL / <survivor> eliminated** popup after its kill cam. At round end a full **results screen** lists every player's role, result, kills/damage, knockdowns and coins.
- **Shopping Street:** the lobby store became a street of **nine walk-in stores** (Skin Shop, Weapon Shop, Armor Shop, Food & Drinks, Monster Skins, Emotes & Dances, Pets & Trails, Dressing Room, Mystery Crates), each with its own sign, themed displays and a counter ProximityPrompt that opens its section. Coins only, no Robux. New: weapons, ammo and armor as round supplies (max 3), pets that follow you, trails, emotes (standard avatar emote animations, **B** to play) and Mystery Crates.

## New in v1.4 (phase 2)
- **16 new monsters**, all with 20 s powers and their own jumpscares: Megalodon (a shark in water, a buff humanoid shark on land), Kraken, Cthulhu, Leviathan, Mosasaurus, Nessie, Spinosaurus, T-Rex, Quetzalcoatlus, Yeti, Dragon, Chupacabra, Vampire, Gargoyle, Bigfoot and Father Fester (he grows stronger with every survivor who sees him).
- **6 new maps:** Stormy Ocean (islands, drivable boats and ships, warning signs, a deadly storm past the buoys), Rainforest Swamp, Snowy Mountain, Haunted Farm, Vampire Castle and Fester Street (two-storey houses with varied, flickering lights).
- **Sea monster omens:** tentacles, coils, a tail flick, a dorsal fin, a neck rising, a sail, or red eyes in the thunderclouds.
- **Bigger maps** (900 studs, 1300 for the ocean). Workspace streaming is on.
- **The lobby store**, east of the helipad: an item counter (hats, accessories, round supplies), a dressing room with a mirror (outfits) and a skins gallery with statues. Press E at a counter.
- **Boats:** sit at the helm and steer with WASD or the thumbstick.

## Files
- `NightHunt.rbxlx`: the place file, built with Rojo 7 from `default.project.json`.
- `src/shared/Config.luau`: settings, monsters, Doctor Nowhere's forms, items, loot tables, shop and optional sound ids.
- `src/server/init.server.luau`: hub and teleports, rounds, abilities, gear and combat, catches and witness animations, coins and DataStore.
- `src/server/Models.luau`: part-built monsters (including Doctor Nowhere's forms and Sonic.exe) and helicopters.
- `src/server/MapGen.luau`: the maps (power-line forest, houses, facilities, loot spots).
- `src/client/init.client.luau`:
  - the warning screen, HUD, locker and shop;
  - jumpscares (a ViewportFrame animation for each monster, then a black cut and optional blood);
  - effects (blackout, the Locust's wallpaper and slam, hallucinations, sight highlights);
  - sounds and touch buttons.

## Open and publish
1. Install **Roblox Studio** and open `NightHunt.rbxlx` (File → Open from File).
2. Test it: **Test → Clients and Servers → 2 Players → Start**.
   - In Studio, *Create server* turns the test server into your match.
   - A single player can start a round.
3. Publish it: **File → Publish to Roblox**. Then in **Game Settings**:
   - **Security**: enable *Studio Access to API Services* (needed for MemoryStore and DataStore);
   - **Server Size**: 15;
   - set the permissions you want.
4. Complete the **Maturity & Compliance** questionnaire (Creator Dashboard → your experience) for the 13+ content.
5. Optional: the sounds are built-in Roblox fallbacks. Upload your own and paste the asset ids into `Config.SOUNDS`.

Join codes, the server browser and invites only work in the published game.
