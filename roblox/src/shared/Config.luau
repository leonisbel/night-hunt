-- Night Hunt shared settings (fan-made monster survival game)
local C = {}

C.MIN_PLAYERS = 2        -- to take off (1 is allowed when testing in Studio)
C.MAX_PLAYERS = 15       -- hard cap per server
C.ROUND_LENGTHS = { 300, 420, 600 } -- host picks 5, 7 or 10 minutes in the lobby
C.ROUND_TIME = 420       -- default round length (7 minutes)
C.EXTRACT_AT = 90        -- extraction helicopter lands with this many seconds left
C.FLIGHT_TIME = 4
C.RESULTS_TIME = 9
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
C.MAP_SIZE = 360

C.THEMES = { "Powerline Forest", "Abandoned Pizzeria Town", "Foggy Woods", "Static Fields" }
C.MAIN_THEME = "Powerline Forest" -- picked half of the time

C.MONSTER_KEYS = { "freddy", "bonnie", "chica", "foxy", "springtrap", "cartooncat",
	"sirenhead", "drnowhere", "locust", "monochrome", "demogorgon", "sonicexe" }

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
	skin = { shadow = 250, toxic = 300, frost = 300, blood = 350, golden = 600 },
}
C.EARN = { open = 5, catch = 40, knockdown = 25, escape = 60, survive = 10, monster = 15 }
C.SKIN_TONES = { Color3.fromRGB(241, 204, 170), Color3.fromRGB(224, 172, 130), Color3.fromRGB(198, 134, 90), Color3.fromRGB(150, 98, 64), Color3.fromRGB(105, 70, 48), Color3.fromRGB(250, 220, 200) }
C.HAIR_COLORS = { Color3.fromRGB(40, 28, 20), Color3.fromRGB(90, 60, 35), Color3.fromRGB(20, 20, 22), Color3.fromRGB(170, 110, 50), Color3.fromRGB(210, 170, 100), Color3.fromRGB(70, 50, 45) }
C.CLOTHES = { Color3.fromRGB(200, 60, 50), Color3.fromRGB(40, 120, 200), Color3.fromRGB(40, 170, 90), Color3.fromRGB(140, 70, 180), Color3.fromRGB(240, 160, 30), Color3.fromRGB(30, 160, 150), Color3.fromRGB(210, 90, 20), Color3.fromRGB(40, 52, 70), Color3.fromRGB(130, 140, 140), Color3.fromRGB(230, 80, 150), Color3.fromRGB(240, 240, 240), Color3.fromRGB(30, 30, 32) }

-- Optional sound uploads: the Afton laugh etc. are original sounds rendered from the browser synth
-- (roblox/sounds/*.wav). Upload them in Studio and paste the asset ids here; empty = built-in fallback.
C.SOUNDS = { laugh = "", siren = "", locust = "", portal = "", sonic = "", scream = "", quake = "", shift = "" }

return C
