# Night Hunt 🚁👹

A fan-made multiplayer monster survival game for playing privately with friends. Board the helicopter, drop into a dark map, and each round someone might turn into a monster.

## How a round works
1. **Helipad lobby.** The host creates a server and picks **max players (2-15)** and **privacy**:
   - 🔒 **Friends only**: people join with the 5-letter code or the invite link.
   - 🌍 **Public**: the server shows up in the **Public Servers** list.
2. Everyone walks onto the helicopter pad to **board**. When everyone is aboard, the host presses **Take off!**. You need at least 2 players; bots count.
3. During the flight you find out your role. Every player has a random chance to be a **monster** (about 1 in 5). There's always at least 1 monster, and at most a third of the players.
4. **Survivors** have 2:30 to hide in bushes or crates and stay out of reach. You win by lasting until sunrise or by reaching the **extraction helicopter**, which lands with 60 seconds left (follow the green arrow).
5. **Monsters** catch survivors by touching them. Caught survivors become ghosts and spectate.

## Monsters (one ability each, Space / click)
| Monster | Ability |
|---|---|
| Freddy | Lights Out: every survivor's flashlight dies for 5s |
| Bonnie | Guitar Riff: stuns nearby survivors |
| Chica | Cupcake Trap: hidden traps that root survivors |
| Foxy | Pirate Dash: 3x speed burst |
| Springtrap | Vent Crawl: teleport to a vent near a survivor |
| Cartoon Cat | Rubber Arms: triple catch reach |
| Siren Head | Siren Call: reveals every survivor for 5s |
| The Boiled One | Dread Gaze: slows survivors near it |
| Doctor Nowhere | Nowhere Warp: blink through walls |
| The Locust | Static Fade: invisible for 5s |
| Monochrome | Color Drain: the world goes grey and survivors can't sprint |
| Demogorgon | Upside Down Portal: place a portal, then jump back to it |

## Controls
- **Keyboard and mouse:** WASD or the arrow keys to move, Shift to sprint (survivors), the mouse to aim your flashlight, Space, E or click for your monster ability, Tab for the scoreboard, M to mute.
- **Phone and iPad (shown automatically on touch screens):**
  - Left thumb: a joystick that moves you, with analog speed.
  - Right thumb: drag anywhere to aim your flashlight.
  - Buttons: **Sprint** (tap to toggle), **Power** (monsters), the scoreboard and mute.
  - Works in landscape or portrait. In Safari, use *Add to Home Screen* to play fullscreen.

## Graphics (v1.2.0)
- A 3D three.js renderer with fog, a shadow-casting flashlight, moonlight, flickering lamps and textured ground.
- Detailed 3D monsters and particles (fireflies, dust, embers, rain and static).
- Film grain, vignette, chromatic aberration and a red danger pulse when a monster is near.
- Procedural ambience, footsteps, a heartbeat and jumpscare audio.

## Ways to play
- **Desktop app (Windows):** unzip `NightHunt-Windows.zip` and double-click `Night Hunt.exe`. Windows may show a "protected your PC" warning; click *More info* then *Run anyway*. When Windows Firewall asks, click Allow.
  - *Online* mode: friends anywhere join with your code (peer-to-peer).
  - *Wi-Fi* mode: your PC is the server, and friends on the same Wi-Fi open the address shown on the menu.
- **Web link:** host the `web/` folder on any static site (for example GitHub Pages). It runs in Online (peer-to-peer) mode.
- **Own server:** `npm install && node server.js` (Node 18+). Open http://localhost:3000.

Fan-made for private play. Freddy/Bonnie/Chica/Foxy/Springtrap belong to Scott Cawthon, Cartoon Cat and Siren Head to Trevor Henderson, the Demogorgon to Netflix, and the other characters to their creators.

## Roblox version
The Roblox Studio version is in [`roblox/`](roblox/), with its own Studio and publishing steps.
Download the place file: https://github.com/leonisbel/night-hunt/releases/latest/download/NightHunt.rbxlx
