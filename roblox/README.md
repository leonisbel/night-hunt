# Night Hunt — Roblox version (fan-made)

A Roblox Studio port of Night Hunt. Players meet in a helicopter lobby, take off together, and land in one of 3 maps. Each round, every player has a random chance to become a monster. Survivors have to hide until the extraction helicopter lands, then get to it.

Fan-made for private play. Freddy, Bonnie, Chica, Foxy and Springtrap belong to Scott Cawthon. Cartoon Cat and Siren Head belong to Trevor Henderson. The Boiled One belongs to Anna LaCour. Doctor Nowhere, the Locust, the Monochrome Roblox monster and the Demogorgon also belong to their creators. Every model here is a simple part-built look-alike: there are no copied assets.

## What's in it
- **Hub server, the game's start place.** From here you can:
  - **Create** a server: pick a name, 2–15 max players, and *Friends only* or *Public*.
  - **Join** a server by its 5-letter code.
  - **Browse** public servers.
- **Every match is its own reserved server.** Matches use `TeleportService:ReserveServer` and `TeleportAsync`, and they're tracked in a `MemoryStoreService` sorted map. Friends-only servers can only be joined with the code or with the in-game **Invite friends** button. The invite carries the code, so the friend is sent straight into that server.
- **Match lobby:**
  - Everyone stands on the helipad to board.
  - The host can change max players and privacy, then press **Take off**. You need at least 2 players, and everyone has to be on board.
- **Roles and rounds:**
  - Each player has a 20% chance to be a monster. There's at most 1 monster per 3 players and always at least 1 monster.
  - A round lasts 150 s. The extraction helicopter lands with 60 s left (follow the green beam).
  - Caught players get a jumpscare and go back to the lobby to watch.
- **The 12 monsters and their powers (press E or the touch "Power" button):**

| Monster | Power |
|---|---|
| Freddy | Lights Out: every survivor's flashlight goes dark for 5 s |
| Bonnie | Guitar Riff: stuns nearby survivors |
| Chica | Cupcake Trap: up to 3 traps that root survivors |
| Foxy | Pirate Dash: a burst of speed |
| Springtrap | Vent Crawl: pops out of the vent nearest a survivor |
| Cartoon Cat | Rubber Arms: 3× catch reach |
| Siren Head | Siren Call: reveals every survivor through walls |
| The Boiled One | Dread Gaze: slows nearby survivors |
| Doctor Nowhere | Nowhere Warp: blinks forward |
| The Locust | Static Fade: turns invisible |
| Monochrome | Color Drain: survivors' screens go grey and they can't sprint |
| Demogorgon | Upside Down Portal: place a portal, then jump back to it |

- **Maps:** Abandoned Pizzeria Town, Foggy Woods and Static Fields. They're generated fresh every round, with buildings, trees, hiding bushes and crates, vents and flickering lights.
- **Controls:**
  - **PC:** WASD to move, Shift to sprint (survivors have stamina), E to use your power, F to switch your flashlight on or off.
  - **Phone and iPad:** the Roblox thumbstick moves you (forced on with `DevTouchMovementMode = Thumbstick`). On-screen **RUN** (tap to toggle sprint), **POWER** (monsters only) and **LIGHT** (survivors only) buttons appear when they apply. The UI scales down to fit small screens.
  - **Gamepad:** left stick, L3 sprint, X power, Y flashlight.
- **Graphics (v1.2.0):**
  - Future lighting, Atmosphere fog, colour grading, Bloom and SunRays. Each one changes smoothly between the lobby (dusk), hunting (dark fog, cold tint for survivors, red tint for monsters) and spectating.
  - Smooth Terrain ground (LeafyGrass, Grass or Asphalt) with mud and dirt patches, plus drifting ground-fog particles.
  - Shadow-casting flashlights, Fabric, Rubber, Slate and Metal materials, and more detailed monsters: joints, hands, feet, jaws, teeth, wires, and extras for each character (Freddy's mic, Springtrap's endoskeleton, Siren Head's speakers and ribs, the Locust's wings, Monochrome's glitch cubes and more).

## Files
- `NightHunt.rbxlx`: the place file, ready to open in Studio. It's built with Rojo 7.7.1 from `default.project.json`.
- `src/shared/Config.luau`: the settings and the monster table.
- `src/server/init.server.luau`: hub, teleports, the server registry, the round loop, abilities and catching.
- `src/server/Models.luau`: part-built monsters and helicopters.
- `src/server/MapGen.luau`: the 3 themed maps.
- `src/client/init.client.luau`: UI, lighting, input, jumpscare and effects.

## Open it and publish it from your own account
1. Install **Roblox Studio** from <https://create.roblox.com> and sign in.
2. Download `NightHunt.rbxlx` and open it with **File → Open from File…**.
3. **Test it right away:** in the **Test** tab, choose **Clients and Servers → 2 Players → Start**.
   - Studio can't teleport, so **Create server** turns the test server itself into your match. After that you can board and press **Take off**.
   - In Studio a single player can start a round too.
4. **Publish:** File → **Publish to Roblox**, then choose *New experience* and name it, for example "Night Hunt".
5. Open **Home → Game Settings**:
   - **Security:** turn on **Enable Studio Access to API Services**. MemoryStore needs this for the server list and the codes, so it works in Studio tests too.
   - **Places → (your place) → … → Edit/Configure:** set **Server Size to 15**.
   - **Permissions** (or Creator Hub → your experience → Access): set the experience to **Public**, or to Private/Friends while you test. Private experiences can only be played by you and the people you allow.
   - Save, then publish again.
6. Teleports to reserved servers inside the same experience need no extra setting. You only have to enable *Allow Third Party Teleports* if you ever teleport to a different game.
7. Play from the Roblox website or app. Create a server, share the 5-letter code (or press **Invite friends**), and take off once at least 2 players are on board.

Join codes, the public server browser and invites only work in the published game, not in Studio.
