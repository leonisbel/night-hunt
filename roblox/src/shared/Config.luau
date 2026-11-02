-- Night Hunt shared settings (fan-made monster survival game)
local C = {}

C.MIN_PLAYERS = 2        -- to take off (1 is allowed when testing in Studio)
C.MAX_PLAYERS = 15       -- hard cap per server
C.ROUND_LENGTHS = { 300, 420, 600 } -- host picks 5, 7 or 10 minutes in the lobby
C.ROUND_TIME = 420       -- default round length (7 minutes)
C.EXTRACT_AT = 90        -- extraction helicopter lands with this many seconds left
C.FLIGHT_TIME = 4
C.RESULTS_TIME = 14      -- v1.4.1: the full results screen stays up longer
C.MONSTER_CHANCE = 0.2   -- each player's chance to become a monster
C.SURVIVOR_SPEED = 16
C.SPRINT_MULT = 1.55
C.CATCH_REACH = 6        -- monster melee reach (studs)
C.MON_DMG = 34           -- damage per monster hit (armor absorbs some)
C.MON_HIT_RATE = 1.0     -- seconds between monster hits
C.MON_HP = 300           -- monster health; at 0 it is knocked down
C.DOWN_TIME = 6          -- seconds a knocked-down monster stays down
C.SLOTS = 6              -- survivor inventory slots (Roblox backpack hotbar)
C.LOBBY_PAD = Vector3.new(0, 0, 0)
C.PAD_RADIUS = 16
C.MAP_ORIGIN = Vector3.new(1200, 0, 0)
C.MAP_SIZE = 900        -- v1.4: maps are ~6x bigger in area (Workspace streaming keeps it smooth)
C.OCEAN_SIZE = 1300     -- the ocean map is bigger still
C.STORM_RADIUS = 520    -- ocean: past this distance from the centre the storm rages
C.STORE_ORIGIN = Vector3.new(130, 0, 0) -- walk-in store in the lobby, east of the helipad

C.THEMES = { "Powerline Forest", "Abandoned Pizzeria Town", "Foggy Woods", "Static Fields",
	"Stormy Ocean", "Rainforest Swamp", "Snowy Mountain", "Haunted Farm", "Vampire Castle", "Fester Street" }
C.MAIN_THEME = "Powerline Forest" -- picked 30% of the time

C.MONSTER_KEYS = { "freddy", "bonnie", "chica", "foxy", "springtrap", "cartooncat",
	"sirenhead", "drnowhere", "locust", "monochrome", "demogorgon", "sonicexe",
	"megalodon", "kraken", "cthulhu", "leviathan", "mosasaurus", "nessie", "spinosaurus", "yeti", "chupacabra",
	"vampire", "bigfoot", "trex", "quetzalcoatlus", "gargoyle", "dragon", "fester" }
-- sea monsters swim fast in water and slower on land; every phase-2 monster has a home map it prefers
C.SEA = { megalodon = true, kraken = true, cthulhu = true, leviathan = true, mosasaurus = true, nessie = true }
C.HOME = { megalodon = "Stormy Ocean", kraken = "Stormy Ocean", cthulhu = "Stormy Ocean", leviathan = "Stormy Ocean", mosasaurus = "Stormy Ocean", nessie = "Stormy Ocean",
	spinosaurus = "Rainforest Swamp", yeti = "Snowy Mountain", chupacabra = "Haunted Farm", vampire = "Vampire Castle", bigfoot = "Foggy Woods", trex = "Rainforest Swamp",
	quetzalcoatlus = "Snowy Mountain", gargoyle = "Vampire Castle", dragon = "Vampire Castle", fester = "Fester Street" }
C.FESTER_MAX = 6

local AFTON = { ability = "Afton Laugh", desc = "A creepy laugh echoes - you see every survivor for 10s", cd = 20 }
local function afton(name, speed) return { name = name, ability = AFTON.ability, desc = AFTON.desc, cd = AFTON.cd, speed = speed } end
C.MONSTERS = {
	freddy     = afton("Freddy", 19),
	bonnie     = afton("Bonnie", 19),
	chica      = afton("Chica", 18.5),
	foxy       = afton("Foxy", 19.5),
	springtrap = afton("Springtrap", 18.5),
	cartooncat = { name = "Cartoon Cat",    ability = "Rubber Grab",        desc = "Stretch a rubber arm and pull a survivor in front of you", cd = 20, speed = 20 },
	sirenhead  = { name = "Siren Head",     ability = "Siren Call",         desc = "A deafening siren reveals every survivor for 8s",       cd = 20, speed = 18 },
	drnowhere  = { name = "Doctor Nowhere", ability = "Shapeshift",         desc = "Changes form every 30s; each form has its own power", cd = 20, speed = 19 },
	locust     = { name = "The Locust",     ability = "Swarm Omen",         desc = "Crawl out of a screen near one random survivor and slam their screen", cd = 20, speed = 19 },
	monochrome = { name = "Monochrome",     ability = "Total Blackout",     desc = "Every survivor's screen goes pitch black for 10s",     cd = 20, speed = 19 },
	sonicexe   = { name = "Sonic.exe",      ability = "You Can't Run",      desc = "A scary laugh, then you run much faster for 10s",      cd = 20, speed = 19.5 },
	demogorgon = { name = "Demogorgon",     ability = "Upside Down Portal", desc = "Open a portal and come out near the nearest survivor", cd = 20, speed = 19.5 },
	-- v1.4 phase 2
	megalodon  = { name = "Megalodon",      ability = "Tidal Surge",    desc = "A giant wave knocks survivors back, stuns them and throws them out of boats. On land you walk as a buff humanoid shark", cd = 20, speed = 19 },
	kraken     = { name = "Kraken",         ability = "Tentacle Grab",  desc = "A tentacle drags the closest survivor (even out of a boat) to you", cd = 20, speed = 18 },
	cthulhu    = { name = "Cthulhu",        ability = "Thunderstorm",   desc = "Summon a storm: lightning strikes the nearest survivors and every screen flashes", cd = 20, speed = 18 },
	leviathan  = { name = "Leviathan",      ability = "Whirlpool",      desc = "A whirlpool pulls nearby survivors toward you and slows them", cd = 20, speed = 19 },
	mosasaurus = { name = "Mosasaurus",     ability = "Tail Slam",      desc = "A huge tail slam sends a wave that stuns survivors close by", cd = 20, speed = 19.5 },
	nessie     = { name = "Nessie",         ability = "Deep Dive",      desc = "Dive out of sight and surface right next to the nearest survivor", cd = 20, speed = 18.5 },
	spinosaurus= { name = "Spinosaurus",    ability = "Swamp Ambush",   desc = "Lunge forward out of the water and stun whoever is in the way", cd = 20, speed = 19 },
	yeti       = { name = "Yeti",           ability = "Avalanche Roar", desc = "A roar brings snow down: nearby survivors are stunned, then slowed", cd = 20, speed = 18.5 },
	chupacabra = { name = "Chupacabra",     ability = "Blood Drain",    desc = "Drain a close survivor's health to heal yourself", cd = 20, speed = 20 },
	vampire    = { name = "Vampire",        ability = "Bat Swarm",      desc = "Burst into bats: invisible and fast for 4s, nearby survivors are blinded", cd = 20, speed = 19 },
	bigfoot    = { name = "Bigfoot",        ability = "Boulder Throw",  desc = "Throw a boulder at the survivor in front of you", cd = 20, speed = 19 },
	trex       = { name = "T-Rex",          ability = "Tyrant Roar",    desc = "A roar that freezes nearby survivors in terror and reveals them", cd = 20, speed = 19.5 },
	quetzalcoatlus = { name = "Quetzalcoatlus", ability = "Sky Dive",   desc = "Take off and dive down on the nearest survivor", cd = 20, speed = 19 },
	gargoyle   = { name = "Gargoyle",       ability = "Stone Skin",     desc = "Turn to stone: weapons can't hurt you for 6s, then a shockwave", cd = 20, speed = 18.5 },
	dragon     = { name = "Dragon",         ability = "Fire Breath",    desc = "Breathe fire in a cone in front of you: survivors burn", cd = 20, speed = 19 },
	fester     = { name = "Father Fester",  ability = "Lights Out",     desc = "Every light near you dies and survivors black out. Passive: each new survivor who sees you makes you stronger (6 stages)", cd = 20, speed = 17.5 },
}

-- Doctor Nowhere (fan horror art by Silas Orion) shapeshifts every DN_PERIOD seconds between these forms
C.DN_PERIOD = 30
C.DN_FORMS = {
	{ key = "drnowhere",    name = "The Doctor",           ability = "Injection",   desc = "Inject the survivor in front of you - slowed for 6s" },
	{ key = "dn_conezone",  name = "Cone Zone",            ability = "Cone Quake",  desc = "Slam the ground - survivors close to you are stunned" },
	{ key = "dn_nightmare", name = "Nightmare Man",        ability = "Shadow Step", desc = "Melt into shadow and reappear far ahead" },
	{ key = "dn_sixarm",    name = "The Doctor (six arms)", ability = "Paranoia",   desc = "Nearby survivors hallucinate and are revealed to you" },
}

-- loot (same items as the browser version). Studs: ~3.6 studs per metre of the browser game.
C.ITEMS = {
	knife   = { name = "Knife",          type = "melee", dmg = 22, range = 7,   rate = 0.34, color = Color3.fromRGB(190, 190, 200) },
	bat     = { name = "Baseball Bat",   type = "melee", dmg = 30, range = 8.5, rate = 0.62, stun = 0.7, color = Color3.fromRGB(170, 120, 70) },
	crowbar = { name = "Crowbar",        type = "melee", dmg = 36, range = 8,   rate = 0.7, stun = 0.4, color = Color3.fromRGB(180, 40, 40) },
	axe     = { name = "Fire Axe",       type = "melee", dmg = 52, range = 9,   rate = 0.95, stun = 0.3, color = Color3.fromRGB(200, 30, 30) },
	pistol  = { name = "Pistol",         type = "gun", dmg = 24, range = 160, rate = 0.3,  ammo = "light",  start = 12, spread = 0.035, color = Color3.fromRGB(40, 40, 44) },
	shotgun = { name = "Shotgun",        type = "gun", dmg = 12, pellets = 7, range = 90, rate = 0.95, ammo = "shells", start = 6, spread = 0.12, stun = 0.45, color = Color3.fromRGB(90, 60, 40) },
	rifle   = { name = "Rifle",          type = "gun", dmg = 22, range = 220, rate = 0.15, ammo = "heavy",  start = 30, spread = 0.03, color = Color3.fromRGB(50, 56, 44) },
	water   = { name = "Water Bottle",   type = "use", hp = 15, stam = 45, color = Color3.fromRGB(120, 190, 255) },
	soda    = { name = "Soda",           type = "use", hp = 10, stam = 60, color = Color3.fromRGB(220, 40, 40) },
	energy  = { name = "Energy Drink",   type = "use", stam = 100, boost = 8, color = Color3.fromRGB(80, 255, 80) },
	chips   = { name = "Chips",          type = "use", hp = 20, color = Color3.fromRGB(255, 200, 40) },
	choco   = { name = "Chocolate Bar",  type = "use", hp = 15, stam = 25, color = Color3.fromRGB(110, 60, 30) },
	beans   = { name = "Canned Beans",   type = "use", hp = 35, color = Color3.fromRGB(200, 200, 210) },
	medkit  = { name = "First Aid Kit",  type = "use", hp = 70, color = Color3.fromRGB(240, 240, 240) },
	vest    = { name = "Bulletproof Vest", type = "armor", slot = "Vest", dur = 100, red = 0.35, color = Color3.fromRGB(60, 70, 50) },
	helmet  = { name = "Helmet",         type = "armor", slot = "Helmet", dur = 60, red = 0.15, color = Color3.fromRGB(70, 80, 60) },
	ammo_light  = { name = "Pistol Ammo",    type = "ammo", ammo = "light",  n = 18, color = Color3.fromRGB(230, 200, 60) },
	ammo_shells = { name = "Shotgun Shells", type = "ammo", ammo = "shells", n = 8,  color = Color3.fromRGB(200, 50, 40) },
	ammo_heavy  = { name = "Rifle Ammo",     type = "ammo", ammo = "heavy",  n = 30, color = Color3.fromRGB(80, 200, 80) },
}
C.LOOT = {
	chest = { knife = 6, bat = 6, crowbar = 5, axe = 4, pistol = 6, shotgun = 4, rifle = 2.5, vest = 5, helmet = 5, medkit = 3, ammo_light = 5, ammo_shells = 3.5, ammo_heavy = 2.5, beans = 3, energy = 3 },
	bag = { water = 8, soda = 8, chips = 7, choco = 7, beans = 5, energy = 4, medkit = 1.5, ammo_light = 5, ammo_shells = 3, ammo_heavy = 2, knife = 3, pistol = 1.5, helmet = 1.5 },
}

-- lobby shop: cosmetics and monster skins bought with coins earned in rounds (no real money, no Robux)
C.SHOP = {
	hat = { cap = 50, beanie = 50, hardhat = 100, cowboy = 120, headphones = 150, bunny = 200, crown = 500 },
	acc = { glasses = 40, scarf = 60, mask = 80, goggles = 120 },
	skin = { shadow = 250, toxic = 300, frost = 300, blood = 350, golden = 600, lava = 400, neon = 400, abyss = 450 },
	outfit = { scout = 120, pajamas = 100, ranger = 150, hunter = 180, diver = 220, hazmat = 250, ninja = 300, ghostbuster = 350, astronaut = 450, knight = 500 },
	-- round supplies (max C.KIT_MAX, handed out and used up when the next round starts); sold in the Food, Weapon and Armor shops
	supply = { water = 15, soda = 15, chips = 15, choco = 20, beans = 25, energy = 30, medkit = 60,
		knife = 40, bat = 60, crowbar = 80, axe = 120, pistol = 150, shotgun = 220, ammo_light = 25, ammo_shells = 30,
		vest = 120, helmet = 80 },
	-- v1.4.1 lobby shopping street
	pet = { puppy = 200, kitty = 200, bat = 250, owl = 250, slime = 300, pumpkin = 300, ghost = 400, dragon = 600 },
	trail = { fire = 150, ice = 150, toxic = 150, stars = 200, shadow = 200, blood = 250, rainbow = 400 },
	emote = { wave = 0, point = 60, cheer = 60, laugh = 80, dance = 80, shuffle = 120, groove = 150 },
}
C.KIT_MAX = 3
C.CRATE_PRICE = 150
C.SUPPLY_SHOP = { -- which store sells which round supply
	water = "food", soda = "food", chips = "food", choco = "food", beans = "food", energy = "food", medkit = "food",
	knife = "weapons", bat = "weapons", crowbar = "weapons", axe = "weapons", pistol = "weapons", shotgun = "weapons", ammo_light = "weapons", ammo_shells = "weapons",
	vest = "armor", helmet = "armor",
}
-- the nine walk-in stores on the lobby shopping street (coins only - no Robux, no real money)
C.STORES = {
	{ k = "skinshop", name = "SKIN SHOP", sub = "HATS & ACCESSORIES", c = Color3.fromRGB(255, 154, 240) },
	{ k = "weapons", name = "WEAPON SHOP", sub = "MELEE - GUNS - AMMO", c = Color3.fromRGB(255, 90, 58) },
	{ k = "armor", name = "ARMOR SHOP", sub = "VESTS - HELMETS", c = Color3.fromRGB(122, 184, 255) },
	{ k = "food", name = "FOOD & DRINKS", sub = "SNACKS - DRINKS - MEDKITS", c = Color3.fromRGB(138, 255, 106) },
	{ k = "monskins", name = "MONSTER SKINS", sub = "SKINS - PICK YOUR MONSTER", c = Color3.fromRGB(255, 58, 58) },
	{ k = "emotes", name = "EMOTES & DANCES", sub = "DANCE FLOOR", c = Color3.fromRGB(255, 210, 58) },
	{ k = "pets", name = "PETS & TRAILS", sub = "FOLLOWERS - TRAILS", c = Color3.fromRGB(90, 255, 216) },
	{ k = "clothing", name = "DRESSING ROOM", sub = "OUTFITS - LOOKS - MIRROR", c = Color3.fromRGB(154, 216, 255) },
	{ k = "crate", name = "MYSTERY CRATES", sub = "WIN A RANDOM ITEM", c = Color3.fromRGB(192, 138, 255) },
}
C.PET_COLORS = { puppy = { Color3.fromRGB(176, 122, 72), Color3.fromRGB(240, 224, 200) }, kitty = { Color3.fromRGB(232, 150, 58), Color3.fromRGB(255, 240, 224) },
	bat = { Color3.fromRGB(42, 34, 48), Color3.fromRGB(90, 58, 74) }, ghost = { Color3.fromRGB(240, 244, 255), Color3.fromRGB(192, 208, 255) },
	dragon = { Color3.fromRGB(58, 168, 74), Color3.fromRGB(232, 192, 64) }, slime = { Color3.fromRGB(90, 255, 106), Color3.fromRGB(42, 138, 58) },
	owl = { Color3.fromRGB(138, 106, 72), Color3.fromRGB(240, 216, 160) }, pumpkin = { Color3.fromRGB(255, 138, 26), Color3.fromRGB(58, 106, 26) } }
C.TRAIL_COLORS = { fire = { Color3.fromRGB(255, 220, 60), Color3.fromRGB(255, 60, 0) }, ice = { Color3.fromRGB(220, 250, 255), Color3.fromRGB(80, 160, 255) },
	toxic = { Color3.fromRGB(180, 255, 60), Color3.fromRGB(30, 160, 40) }, stars = { Color3.fromRGB(255, 255, 200), Color3.fromRGB(255, 210, 60) },
	shadow = { Color3.fromRGB(60, 40, 80), Color3.fromRGB(0, 0, 0) }, blood = { Color3.fromRGB(200, 10, 20), Color3.fromRGB(90, 0, 0) },
	rainbow = { Color3.fromRGB(255, 60, 60), Color3.fromRGB(60, 120, 255) } }
-- standard Roblox avatar emote animations (the same ones the default Animate script uses)
C.EMOTE_ANIMS = { wave = "rbxassetid://507770239", point = "rbxassetid://507770453", cheer = "rbxassetid://507770677", laugh = "rbxassetid://507770818",
	dance = "rbxassetid://507771019", shuffle = "rbxassetid://507771955", groove = "rbxassetid://507772104" }
C.OUTFITS = {
	scout = { Color3.fromRGB(150, 130, 70), Color3.fromRGB(90, 80, 50) }, pajamas = { Color3.fromRGB(120, 160, 230), Color3.fromRGB(120, 160, 230) },
	ranger = { Color3.fromRGB(60, 90, 50), Color3.fromRGB(110, 90, 60) }, hunter = { Color3.fromRGB(200, 80, 20), Color3.fromRGB(40, 40, 40) },
	diver = { Color3.fromRGB(20, 20, 24), Color3.fromRGB(240, 200, 30) }, hazmat = { Color3.fromRGB(240, 210, 30), Color3.fromRGB(240, 210, 30) },
	ninja = { Color3.fromRGB(16, 16, 18), Color3.fromRGB(16, 16, 18) }, ghostbuster = { Color3.fromRGB(190, 170, 120), Color3.fromRGB(190, 170, 120) },
	astronaut = { Color3.fromRGB(235, 235, 240), Color3.fromRGB(235, 235, 240) }, knight = { Color3.fromRGB(160, 165, 175), Color3.fromRGB(120, 125, 135) },
}
C.EARN = { open = 5, catch = 40, knockdown = 25, escape = 60, survive = 10, monster = 15 }
C.SKIN_TONES = { Color3.fromRGB(241, 204, 170), Color3.fromRGB(224, 172, 130), Color3.fromRGB(198, 134, 90), Color3.fromRGB(150, 98, 64), Color3.fromRGB(105, 70, 48), Color3.fromRGB(250, 220, 200) }
C.HAIR_COLORS = { Color3.fromRGB(40, 28, 20), Color3.fromRGB(90, 60, 35), Color3.fromRGB(20, 20, 22), Color3.fromRGB(170, 110, 50), Color3.fromRGB(210, 170, 100), Color3.fromRGB(70, 50, 45) }
C.CLOTHES = { Color3.fromRGB(200, 60, 50), Color3.fromRGB(40, 120, 200), Color3.fromRGB(40, 170, 90), Color3.fromRGB(140, 70, 180), Color3.fromRGB(240, 160, 30), Color3.fromRGB(30, 160, 150), Color3.fromRGB(210, 90, 20), Color3.fromRGB(40, 52, 70), Color3.fromRGB(130, 140, 140), Color3.fromRGB(230, 80, 150), Color3.fromRGB(240, 240, 240), Color3.fromRGB(30, 30, 32) }

-- Optional sound uploads: the Afton laugh etc. are original sounds rendered from the browser synth
-- (roblox/sounds/*.wav). Upload them in Studio and paste the asset ids here; empty = built-in fallback.
C.SOUNDS = { laugh = "", siren = "", locust = "", portal = "", sonic = "", scream = "", quake = "", shift = "" }

return C
