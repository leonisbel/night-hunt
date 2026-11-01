-- Night Hunt shared settings (fan-made monster survival game)
local C = {}

C.MIN_PLAYERS = 2        -- to take off (1 is allowed when testing in Studio)
C.MAX_PLAYERS = 15       -- hard cap per server
C.ROUND_TIME = 150       -- seconds survivors must last
C.EXTRACT_AT = 60        -- extraction helicopter lands with this many seconds left
C.FLIGHT_TIME = 4
C.RESULTS_TIME = 9
C.MONSTER_CHANCE = 0.2   -- each player's chance to become a monster
C.SURVIVOR_SPEED = 16
C.SPRINT_MULT = 1.55
C.CATCH_REACH = 6
C.LOBBY_PAD = Vector3.new(0, 0, 0)
C.PAD_RADIUS = 16
C.MAP_ORIGIN = Vector3.new(1200, 0, 0)
C.MAP_SIZE = 360

C.THEMES = { "Abandoned Pizzeria Town", "Foggy Woods", "Static Fields" }

C.MONSTER_KEYS = { "freddy", "bonnie", "chica", "foxy", "springtrap", "cartooncat",
	"sirenhead", "boiledone", "drnowhere", "locust", "monochrome", "demogorgon" }

C.MONSTERS = {
	freddy     = { name = "Freddy",         ability = "Lights Out",         desc = "Every survivor's flashlight dies for 5s",          cd = 18, speed = 19 },
	bonnie     = { name = "Bonnie",         ability = "Guitar Riff",        desc = "Stun survivors near you for 1.8s",                 cd = 14, speed = 19 },
	chica      = { name = "Chica",          ability = "Cupcake Trap",       desc = "Drop a cupcake trap (max 3) that roots survivors", cd = 7,  speed = 18.5 },
	foxy       = { name = "Foxy",           ability = "Pirate Dash",        desc = "Run super fast for 1.3s",                          cd = 10, speed = 19.5 },
	springtrap = { name = "Springtrap",     ability = "Vent Crawl",         desc = "Teleport to a vent near the closest survivor",     cd = 16, speed = 18.5 },
	cartooncat = { name = "Cartoon Cat",    ability = "Rubber Arms",        desc = "Triple catch reach for 3s",                        cd = 14, speed = 20 },
	sirenhead  = { name = "Siren Head",     ability = "Siren Call",         desc = "Reveal every survivor for 5s",                     cd = 18, speed = 18 },
	boiledone  = { name = "The Boiled One", ability = "Dread Gaze",         desc = "Survivors near you move 50% slower for 4s",        cd = 15, speed = 18.5 },
	drnowhere  = { name = "Doctor Nowhere", ability = "Nowhere Warp",       desc = "Blink forward, even through walls",                cd = 9,  speed = 19 },
	locust     = { name = "The Locust",     ability = "Static Fade",        desc = "Turn invisible for 5s",                            cd = 17, speed = 19 },
	monochrome = { name = "Monochrome",     ability = "Color Drain",        desc = "Survivors go grey and can't sprint for 5s",        cd = 16, speed = 19 },
	demogorgon = { name = "Demogorgon",     ability = "Upside Down Portal", desc = "Place a portal, use again to jump back to it",     cd = 14, speed = 19.5 },
}

return C
