# Third-party libraries and assets
- three.js r170 (core, GLTFLoader, SkeletonUtils, BufferGeometryUtils addons): MIT License, https://github.com/mrdoob/three.js
- PeerJS: MIT License, https://github.com/peers/peerjs
- nostr-tools (bundle): Unlicense, https://github.com/nbd-wtf/nostr-tools

## 3D models (models/glb)
The shark, T-Rex, raptor, long-neck dinosaur, dragon and bat bases are free CC0 1.0 (public domain) models by Quaternius (https://quaternius.com). Night Hunt recolours, rescales and adds procedural parts to them (sails, scars, glowing eyes and so on).

## PBR textures (models/tex)
These texture sets are free CC0 1.0 (public domain) from Poly Haven (https://polyhaven.com), downscaled to 512 px. Colour maps are normalised to grey detail so they can be tinted per monster.
- curly_teddy_natural (animatronic and ape fur)
- rusty_metal_02 (endoskeletons)
- fabric_leather_02 (leather)
- caban (wool)
- rock_face_03 (gargoyle stone)

Everything else (other models, the scale, scute, hide, chitin, skin and fur-strand textures, and the drone, scream and heartbeat sounds) is generated procedurally in code.


## Sound: T-Rex and Spinosaurus roars (v1.5.1)
`sfx/trex_roar.mp3` and `sfx/spino_roar.mp3` (copies are also in `roblox/sounds/`) are original sound designs. They were layered, pitch-shifted, filtered and echoed with ffmpeg from these free recordings on Wikimedia Commons. No movie audio was used.
- "Elephant voice - trumpeting.ogg" (Wikimedia Commons), CC0 1.0 public domain dedication.
- "439280 schots angry-tiger.wav" (Wikimedia Commons, originally freesound.org #439280 by schots), CC0 1.0.
- "Alligatorhiss.ogg" (Wikimedia Commons), public domain.
- "Yellowstone sound library - Grizzly Bears Roar - 001.mp3" (Wikimedia Commons, U.S. National Park Service), public domain (U.S. government work).


## v1.6.0 realism assets (all CC0 1.0 / public domain)
### Ground, wall and bark PBR sets (models/ground)
From Poly Haven (https://polyhaven.com, CC0), 1k colour maps, normal and roughness maps downscaled: forrest_ground_01, forest_leaves_02, brown_mud_leaves_01, brown_mud_02, snow_02, asphalt_02, coast_sand_01, sparse_grass, concrete_floor_worn_001, wood_floor_deck, old_planks_02, red_brick_03, castle_brick_07, painted_plaster_wall, bark_willow_02, rocky_trail, dirt_floor, aerial_grass_rock.
### Night skies (models/sky)
Tone-mapped, downscaled panoramas made from Poly Haven night HDRIs (CC0): dikhololo_night, moonless_golf, qwantani_night, rogland_clear_night, satara_night.
### Nature scans and foliage cards (models/nature)
Poly Haven models (CC0): rock_09, moon_rock_02, tree_stump_01, dead_tree_trunk, shrub_03, fern_02, grass_medium_01. The leaf, fir, pine, palm, jungle and grass alpha cards were cut (tools/foliage_atlas.py) from the textures of the Poly Haven models fir_sapling, pine_sapling_small, island_tree_01, tree_small_02, fern_02 and grass_medium_01.
### Ambience and footsteps (sfx/amb_*, sfx/wave*, sfx/step_*)
- Ambience beds (rain, crickets, wolf howls, cave drips, wind) were trimmed, looped and levelled from CC0 recordings on OpenGameArt.org by Ylmir, Wolfgang_ (Ted Kerr), JaggedStone and SketchMan3, and from Wikimedia Commons (user Tvabutzku1234, CC0).
- Ocean waves: "Alki Beach waves" by jasinski (freesound.org #18363), CC0, as shared on OpenGameArt.org by qubodup.
- Footsteps on grass, concrete, snow, wood and carpet: "Impact Sounds" by Kenney (www.kenney.nl), CC0.

## Network services (v1.6.0 join fix)
No code is bundled from these. They are public services the game connects to at runtime:
- PeerJS Cloud (0.peerjs.com): WebRTC signalling.
- STUN: Google (stun.l.google.com) and Cloudflare (stun.cloudflare.com).
- TURN relays: freeTURN (freeturn.net, public free/free credentials) and Metered Open Relay (staticauth.openrelay.metered.ca, public static-auth secret).
- Relay fallback and the public server list: Nostr public relays nos.lol and relay.primal.net (ephemeral events, which are not stored).
