-- Part-built models: the 11 monsters (welded onto a player's character) and helicopters.
local Models = {}

local function rgb(r, g, b) return Color3.fromRGB(r, g, b) end
local function at(x, y, z, rx, ry, rz)
	return CFrame.new(x, y, z) * CFrame.Angles(math.rad(rx or 0), math.rad(ry or 0), math.rad(rz or 0))
end
local BALL, CYL = Enum.PartType.Ball, Enum.PartType.Cylinder
local NEON, METAL, GLASS = Enum.Material.Neon, Enum.Material.Metal, Enum.Material.Glass
local FABRIC, RUST, SLATE, PLASTIC = Enum.Material.Fabric, Enum.Material.CorrodedMetal, Enum.Material.Slate, Enum.Material.SmoothPlastic
-- default surface material per monster (fur-like fabric for animatronics, rough skin for creatures)
local SKIN = {
	freddy = FABRIC, bonnie = FABRIC, chica = FABRIC, foxy = FABRIC, springtrap = FABRIC,
	cartooncat = Enum.Material.Rubber, sirenhead = Enum.Material.Leather, drnowhere = FABRIC, sonicexe = FABRIC, dn_conezone = PLASTIC, dn_nightmare = Enum.Material.Slate, dn_sixarm = FABRIC,
	locust = SLATE, boisvert = PLASTIC, demogorgon = Enum.Material.Leather,
	megalodon = Enum.Material.SmoothPlastic, megalodon_h = Enum.Material.SmoothPlastic, kraken = Enum.Material.Rubber, cthulhu = Enum.Material.Rubber,
	leviathan = Enum.Material.Pebble, mosasaurus = Enum.Material.Pebble, nessie = Enum.Material.Pebble, spinosaurus = Enum.Material.Pebble,
	trex = Enum.Material.Pebble, yeti = Enum.Material.Carpet, bigfoot = Enum.Material.Carpet, chupacabra = Enum.Material.Pebble, vampire = FABRIC,
	quetzalcoatlus = Enum.Material.Leather, gargoyle = Enum.Material.Basalt, dragon = Enum.Material.Pebble, fester = FABRIC,
	wendigo = Enum.Material.Carpet, wendigo_h = Enum.Material.Leather, dn_guilt = PLASTIC,
}
local defaultMat = PLASTIC

-- Builder: adds parts relative to `root`. If anchored, parts are anchored; otherwise welded to root.
local function builder(model, root, anchored)
	return function(size, off, color, opts)
		opts = opts or {}
		local p = Instance.new("Part")
		p.Size = size
		p.Color = color
		p.Material = opts.mat or defaultMat
		if opts.shape then p.Shape = opts.shape end
		p.TopSurface = Enum.SurfaceType.Smooth
		p.BottomSurface = Enum.SurfaceType.Smooth
		p.CastShadow = opts.noShadow ~= true
		p.CanCollide = anchored and (opts.collide == true) or false
		p.CanQuery = anchored
		p.CanTouch = false
		p.Massless = true
		p.Anchored = anchored
		p.Transparency = opts.transp or 0
		p.CFrame = root.CFrame * off
		p.Name = opts.name or "Part"
		if not anchored then
			local w = Instance.new("WeldConstraint")
			w.Part0 = root
			w.Part1 = p
			w.Parent = p
		end
		p.Parent = model
		return p
	end
end

local function eyes(P, y, z, sp, size, white, pupil, pupilColor, glow)
	if white then
		P(Vector3.new(size, size, size), at(-sp, y, z), rgb(255, 255, 255), { shape = BALL })
		P(Vector3.new(size, size, size), at(sp, y, z), rgb(255, 255, 255), { shape = BALL })
	end
	local m = glow and NEON or Enum.Material.SmoothPlastic
	P(Vector3.new(pupil, pupil, pupil), at(-sp, y, z - size * 0.42), pupilColor, { shape = BALL, mat = m })
	P(Vector3.new(pupil, pupil, pupil), at(sp, y, z - size * 0.42), pupilColor, { shape = BALL, mat = m })
end

local function humanoidBody(P, body, opts)
	opts = opts or {}
	local h = opts.height or 1
	P(Vector3.new(2.6, 3 * h, 1.6), at(0, 0.2 * h, 0), body)                                   -- torso
	P(Vector3.new(0.9, 2.2, 0.9), at(-0.65, -2, 0), opts.legs or body)                          -- legs
	P(Vector3.new(0.9, 2.2, 0.9), at(0.65, -2, 0), opts.legs or body)
	P(Vector3.new(0.75, 2.8 * h, 0.75), at(-1.7, 0.2, 0, 0, 0, -8), opts.arms or body)            -- arms
	P(Vector3.new(0.75, 2.8 * h, 0.75), at(1.7, 0.2, 0, 0, 0, 8), opts.arms or body)
end

local animatronicDetail -- defined below
local function animatronic(P, body, belly, eyeColor)
	humanoidBody(P, body)
	P(Vector3.new(1.9, 2, 0.3), at(0, -0.1, -0.85), belly)                                      -- belly
	P(Vector3.new(2.7, 2.7, 2.7), at(0, 2.7, 0), body, { shape = BALL })                         -- head
	P(Vector3.new(1.7, 0.9, 0.7), at(0, 2.2, -1.15), belly)                                     -- muzzle
	P(Vector3.new(1.3, 0.22, 0.1), at(0, 1.85, -1.5), rgb(235, 230, 215))                        -- teeth
	eyes(P, 3.05, -1.05, 0.5, 0.65, true, 0.32, eyeColor, true)
	animatronicDetail(P, body, belly)
end

-- extra detail shared by the animatronics: rusty endoskeleton joints, hands, feet, cheeks, brows
animatronicDetail = function(P, body, belly)
	for _, x in ipairs({ -0.65, 0.65 }) do
		P(Vector3.new(0.55, 0.55, 0.55), at(x, -1.1, -0.1), rgb(70, 66, 60), { shape = BALL, mat = RUST })      -- knees
		P(Vector3.new(1.1, 0.55, 1.6), at(x, -3.05, -0.3), body)                                               -- feet
		P(Vector3.new(0.9, 0.45, 1.0), at(x, -3.15, -0.95), belly)                                             -- toes
	end
	for _, x in ipairs({ -1.85, 1.85 }) do
		P(Vector3.new(0.6, 0.6, 0.6), at(x, 1.5, 0), rgb(70, 66, 60), { shape = BALL, mat = RUST })            -- shoulders
		P(Vector3.new(0.5, 0.5, 0.5), at(x * 1.02, 0.1, 0), rgb(70, 66, 60), { shape = BALL, mat = RUST })     -- elbows
		P(Vector3.new(0.95, 0.95, 0.95), at(x * 1.08, -1.4, 0), body, { shape = BALL })                      -- hands
		P(Vector3.new(0.55, 0.12, 0.3), at(x * 0.27, 3.55, -1.25, 0, 0, x > 0 and -12 or 12), rgb(25, 20, 18)) -- brows
	end
	P(Vector3.new(0.9, 0.9, 0.6), at(-0.75, 2.35, -1.0), belly, { shape = BALL })                            -- cheeks
	P(Vector3.new(0.9, 0.9, 0.6), at(0.75, 2.35, -1.0), belly, { shape = BALL })
	P(Vector3.new(1.4, 0.35, 0.6), at(0, 1.62, -1.25), body)                                                -- lower jaw
	P(Vector3.new(1.2, 0.18, 0.1), at(0, 1.82, -1.52), rgb(225, 220, 200))                                  -- lower teeth
	P(Vector3.new(2.7, 0.35, 1.7), at(0, 1.75, 0), rgb(60, 56, 50), { mat = RUST })                          -- neck ring
	P(Vector3.new(0.05, 1.2, 0.05), at(0.3, 0.2, -0.88), rgb(255, 40, 40), { mat = NEON, noShadow = true })  -- exposed wire
end

local BUILD = {}
BUILD.freddy = function(P)
	animatronic(P, rgb(122, 74, 34), rgb(200, 149, 93), rgb(30, 30, 30))
	P(Vector3.new(0.45, 0.45, 0.45), at(0, 2.5, -1.55), rgb(20, 20, 20), { shape = BALL })       -- nose
	P(Vector3.new(0.85, 0.85, 0.85), at(-1, 3.9, 0), rgb(122, 74, 34), { shape = BALL })         -- ears
	P(Vector3.new(0.85, 0.85, 0.85), at(1, 3.9, 0), rgb(122, 74, 34), { shape = BALL })
	P(Vector3.new(0.15, 1.9, 1.9), at(0, 4, 0, 0, 0, 90), rgb(15, 15, 15), { shape = CYL })     -- hat brim
	P(Vector3.new(1.1, 1.2, 1.2), at(0, 4.6, 0, 0, 0, 90), rgb(15, 15, 15), { shape = CYL })    -- hat
	P(Vector3.new(1.1, 0.45, 0.2), at(0, 1.4, -0.85), rgb(15, 15, 15))                          -- bow tie
	P(Vector3.new(0.25, 1.4, 0.25), at(2.0, -0.9, -0.6, 20, 0, 0), rgb(30, 30, 30), { mat = METAL })   -- microphone
	P(Vector3.new(0.45, 0.45, 0.45), at(2.0, -0.2, -0.85), rgb(60, 60, 60), { shape = BALL, mat = METAL })
end
BUILD.bonnie = function(P)
	animatronic(P, rgb(91, 91, 189), rgb(185, 167, 232), rgb(200, 40, 40))
	P(Vector3.new(0.45, 0.45, 0.45), at(0, 2.5, -1.55), rgb(20, 20, 20), { shape = BALL })
	P(Vector3.new(0.55, 2.6, 0.4), at(-0.55, 4.9, 0, 0, 0, 8), rgb(91, 91, 189))                -- tall ears
	P(Vector3.new(0.55, 2.6, 0.4), at(0.55, 4.9, 0, 0, 0, -8), rgb(91, 91, 189))
	P(Vector3.new(1.1, 0.45, 0.2), at(0, 1.4, -0.85), rgb(190, 30, 30))
	P(Vector3.new(3, 0.7, 0.25), at(0, 0, -1.2, 0, 0, 30), rgb(190, 30, 30))                    -- guitar
end
BUILD.chica = function(P)
	animatronic(P, rgb(241, 196, 15), rgb(247, 224, 138), rgb(142, 68, 173))
	P(Vector3.new(1.3, 0.5, 0.9), at(0, 2.35, -1.5), rgb(243, 156, 18))                         -- beak
	P(Vector3.new(0.2, 0.8, 0.2), at(0, 4.3, 0), rgb(241, 196, 15))                             -- feather tuft
	P(Vector3.new(2, 1.3, 0.12), at(0, 0.3, -1.02), rgb(255, 255, 255))                         -- bib
	P(Vector3.new(0.9, 0.9, 0.9), at(2.2, 0.6, -0.7), rgb(255, 122, 182), { shape = BALL })      -- cupcake
end
BUILD.foxy = function(P)
	animatronic(P, rgb(176, 58, 46), rgb(217, 140, 108), rgb(241, 196, 15))
	P(Vector3.new(0.45, 0.45, 0.45), at(0, 2.5, -1.55), rgb(20, 20, 20), { shape = BALL })
	P(Vector3.new(0.6, 1.3, 0.35), at(-0.85, 4.1, 0, 0, 0, 15), rgb(176, 58, 46))               -- pointy ears
	P(Vector3.new(0.6, 1.3, 0.35), at(0.85, 4.1, 0, 0, 0, -15), rgb(176, 58, 46))
	P(Vector3.new(0.85, 0.7, 0.12), at(0.5, 3.05, -1.4), rgb(15, 15, 15))                       -- eye patch
	P(Vector3.new(0.3, 1, 0.3), at(1.75, -1.6, -0.3, 0, 0, 20), rgb(190, 190, 190), { mat = METAL }) -- hook
	P(Vector3.new(0.5, 0.5, 3), at(0, -0.6, 1.6, -30, 0, 0), rgb(176, 58, 46))                  -- tail
end
BUILD.springtrap = function(P)
	animatronic(P, rgb(125, 140, 60), rgb(169, 168, 106), rgb(230, 230, 230))
	P(Vector3.new(0.45, 0.45, 0.45), at(0, 2.5, -1.55), rgb(60, 50, 30), { shape = BALL })
	P(Vector3.new(0.55, 2.4, 0.4), at(-0.5, 4.8, 0, 0, 0, 6), rgb(125, 140, 60))
	P(Vector3.new(0.55, 2.2, 0.4), at(1, 4.3, 0.2, 0, 0, -45), rgb(105, 120, 45))               -- bent ear
	P(Vector3.new(0.7, 0.7, 0.12), at(0.6, 0.6, -1.02), rgb(50, 35, 25))                        -- torn hole
	P(Vector3.new(0.6, 0.6, 0.12), at(-0.5, -0.6, -1.02), rgb(50, 35, 25))
	for i = 1, 4 do P(Vector3.new(0.08, 1.4, 0.08), at(-0.9 + i * 0.35, 0.3, -1.05, 0, 0, i * 20), rgb(130, 20, 20), { mat = NEON, noShadow = true }) end -- dangling wires
	P(Vector3.new(1.0, 0.8, 0.5), at(0, 0.1, -1.0), rgb(75, 70, 60), { mat = RUST })            -- endoskeleton showing through
	P(Vector3.new(0.4, 0.4, 0.4), at(0.9, 4.3, -0.25), rgb(75, 70, 60), { shape = BALL, mat = RUST })
end
BUILD.cartooncat = function(P)
	local black = rgb(15, 15, 15)
	P(Vector3.new(0.45, 3.4, 0.45), at(-0.5, -1.3, 0), black)                                    -- thin legs
	P(Vector3.new(0.45, 3.4, 0.45), at(0.5, -1.3, 0), black)
	P(Vector3.new(1.6, 3.4, 1.2), at(0, 2, 0), black)                                           -- torso
	P(Vector3.new(0.35, 5.4, 0.35), at(-2, 1.3, 0, 0, 0, -25), black)                            -- long arms
	P(Vector3.new(0.35, 5.4, 0.35), at(2, 1.3, 0, 0, 0, 25), black)
	P(Vector3.new(0.8, 0.8, 0.8), at(-3.1, -1.2, 0), rgb(255, 255, 255), { shape = BALL })       -- glove hands
	P(Vector3.new(0.8, 0.8, 0.8), at(3.1, -1.2, 0), rgb(255, 255, 255), { shape = BALL })
	P(Vector3.new(3.4, 3.4, 3.4), at(0, 5.2, 0), black, { shape = BALL })                        -- head
	P(Vector3.new(0.9, 1.5, 0.4), at(-1.1, 7, 0, 0, 0, 20), black)                               -- ears
	P(Vector3.new(0.9, 1.5, 0.4), at(1.1, 7, 0, 0, 0, -20), black)
	eyes(P, 5.7, -1.2, 0.7, 1.2, true, 0.45, black, false)
	P(Vector3.new(2.8, 0.7, 0.2), at(0, 4.5, -1.6), rgb(255, 255, 255))                          -- huge grin
	for i = -4, 4 do P(Vector3.new(0.08, 0.7, 0.22), at(i * 0.3, 4.5, -1.62), black) end          -- teeth lines
	for _, x in ipairs({ -1, 1 }) do
		for f = -1, 1 do P(Vector3.new(0.16, 1.1, 0.16), at(x * 3.1 + f * 0.25, -1.9, -0.1, 0, 0, f * 12), rgb(240, 240, 240)) end -- long glove fingers
		P(Vector3.new(0.7, 0.3, 1.3), at(x * 0.5, -3.1, -0.3), rgb(250, 250, 250))                -- cartoon shoes
	end
	P(Vector3.new(0.3, 4.5, 0.3), at(0, 1.8, 1.4, 35, 0, 0), black)                              -- tail
	P(Vector3.new(0.45, 0.25, 0.1), at(-0.7, 6.35, -1.55, 0, 0, -15), black)                     -- angry brows
	P(Vector3.new(0.45, 0.25, 0.1), at(0.7, 6.35, -1.55, 0, 0, 15), black)
end
BUILD.sirenhead = function(P)
	local skin = rgb(107, 79, 58)
	P(Vector3.new(0.7, 7, 0.7), at(-0.6, 0.5, 0), skin)                                          -- very long legs
	P(Vector3.new(0.7, 7, 0.7), at(0.6, 0.5, 0), skin)
	P(Vector3.new(1.5, 5, 1), at(0, 6.5, 0), rgb(122, 92, 69))                                  -- thin torso
	P(Vector3.new(0.5, 7, 0.5), at(-1.5, 5.4, 0, 0, 0, -10), skin)                               -- arms
	P(Vector3.new(0.5, 7, 0.5), at(1.5, 5.4, 0, 0, 0, 10), skin)
	P(Vector3.new(3.5, 0.45, 0.45), at(0, 10.7, 0, 0, 0, 90), rgb(90, 90, 90), { shape = CYL, mat = METAL }) -- pole neck
	P(Vector3.new(4.4, 0.35, 0.35), at(0, 12.2, 0), rgb(90, 90, 90), { mat = METAL })            -- crossbar
	for _, x in ipairs({ -1.9, 1.9 }) do
		P(Vector3.new(1.7, 1.5, 1.3), at(x, 12.3, 0), rgb(140, 140, 140), { mat = METAL })        -- speakers
		P(Vector3.new(0.2, 1.1, 1.1), at(x, 12.3, -0.7, 0, 90, 0), rgb(20, 20, 20), { shape = CYL })
		P(Vector3.new(0.12, 0.6, 0.6), at(x, 12.3, -0.82, 0, 90, 0), rgb(60, 60, 60), { shape = CYL, mat = METAL })
		for f = 0, 2 do P(Vector3.new(0.18, 1.6, 0.18), at(x * 0.9 + (f - 1) * 0.2, 1.4, -0.1, 0, 0, (f - 1) * 10), rgb(90, 66, 48)) end -- long bony fingers
	end
	for i = 0, 4 do P(Vector3.new(1.6, 0.12, 1.05), at(0, 5.0 + i * 0.6, -0.05), rgb(95, 70, 52)) end          -- visible ribs
	P(Vector3.new(0.9, 3, 0.9), at(0, 9.6, 0), rgb(122, 92, 69))                                 -- neck flesh
	for _, x in ipairs({ -0.6, 0.6 }) do P(Vector3.new(1, 0.8, 1.8), at(x, -3.1, -0.4), skin) end  -- feet
end
BUILD.drnowhere = function(P)
	humanoidBody(P, rgb(232, 232, 232), { legs = rgb(40, 40, 50) })
	P(Vector3.new(2.8, 1.6, 1.7), at(0, -1.2, 0), rgb(232, 232, 232))                           -- coat tail
	P(Vector3.new(0.35, 1.8, 0.1), at(0, 0.6, -0.82), rgb(20, 20, 20))                          -- tie
	P(Vector3.new(2.3, 2.3, 2.3), at(0, 2.9, 0), rgb(240, 230, 210), { shape = BALL })           -- pale head
	P(Vector3.new(0.65, 0.8, 0.4), at(-0.45, 3.1, -0.92), rgb(0, 0, 0), { shape = BALL })        -- hollow eyes
	P(Vector3.new(0.65, 0.8, 0.4), at(0.45, 3.1, -0.92), rgb(0, 0, 0), { shape = BALL })
	P(Vector3.new(1.2, 0.12, 0.1), at(0, 2.45, -1.08), rgb(0, 0, 0))                            -- thin smile
	P(Vector3.new(2.4, 0.25, 2.4), at(0, 3.75, 0), rgb(150, 150, 150))                          -- headband
	P(Vector3.new(0.12, 0.7, 0.7), at(0, 3.9, -1.15, 0, 90, 0), rgb(200, 40, 40), { shape = CYL, mat = METAL }) -- head mirror
	P(Vector3.new(0.12, 1.6, 0.12), at(-0.5, 1.2, -0.85, 0, 0, 25), rgb(30, 30, 30), { mat = METAL })   -- stethoscope
	P(Vector3.new(0.12, 1.6, 0.12), at(0.5, 1.2, -0.85, 0, 0, -25), rgb(30, 30, 30), { mat = METAL })
	P(Vector3.new(0.4, 0.4, 0.2), at(0, 0.5, -0.9), rgb(160, 160, 160), { shape = BALL, mat = METAL })
	P(Vector3.new(0.6, 0.1, 0.05), at(0.8, 1.0, -0.83), rgb(30, 90, 180))                       -- name badge
	P(Vector3.new(0.18, 0.18, 0.18), at(-0.45, 3.1, -1.12), rgb(255, 255, 255), { shape = BALL, mat = NEON, noShadow = true }) -- tiny pupils
	P(Vector3.new(0.18, 0.18, 0.18), at(0.45, 3.1, -1.12), rgb(255, 255, 255), { shape = BALL, mat = NEON, noShadow = true })
end
-- Doctor Nowhere's other forms
BUILD.dn_conezone = function(P)
	-- very tall, thin white figure whose head is one long pale cone
	local white = rgb(236, 236, 232)
	for _, x in ipairs({ -1, 1 }) do
		P(Vector3.new(0.5, 4.6, 0.5), at(x * 0.5, -0.8, 0), white)
		P(Vector3.new(0.35, 5, 0.35), at(x * 1.25, 3.2, -0.1, 6, 0, x * 6), white)
		for f = -1, 1 do P(Vector3.new(0.1, 1.2, 0.1), at(x * 1.5 + f * 0.12, 0.2, -0.4, 10, 0, f * 6), white) end
	end
	P(Vector3.new(1.6, 4, 1), at(0, 3.5, 0), white)
	P(Vector3.new(2.2, 0.5, 1.1), at(0, 5.6, 0), white)
	P(Vector3.new(0.5, 1.2, 0.5), at(0, 6.4, 0), white)
	for i = 0, 6 do -- stacked shrinking discs = a long cone head leaning forward
		local r = 1.7 - i * 0.22
		P(Vector3.new(0.7, r, r), at(0, 7.3 + i * 0.65, -0.12 * i, 0, 0, 90), white, { shape = CYL })
	end
	P(Vector3.new(0.3, 0.3, 0.3), at(0, 7.4, -0.85), rgb(0, 0, 0), { shape = BALL })
end
BUILD.dn_nightmare = function(P)
	-- smoky black figure with a pale, too-wide grin
	local black = rgb(8, 8, 10)
	humanoidBody(P, black, { height = 1.25 })
	P(Vector3.new(2.4, 2.6, 2.3), at(0, 3.4, 0), black, { shape = BALL })
	P(Vector3.new(1.7, 0.3, 0.2), at(0, 3.0, -1.12), rgb(235, 235, 225), { mat = NEON, noShadow = true })
	P(Vector3.new(0.35, 0.2, 0.2), at(-0.5, 3.8, -1.1), rgb(235, 235, 225), { mat = NEON, noShadow = true })
	P(Vector3.new(0.35, 0.2, 0.2), at(0.5, 3.8, -1.1), rgb(235, 235, 225), { mat = NEON, noShadow = true })
	for i = 1, 8 do P(Vector3.new(1, 1, 1), at(math.sin(i * 2.3) * 1.4, -2 + i * 0.7, math.cos(i * 1.9) * 0.8), black, { shape = BALL, transp = 0.4, noShadow = true }) end -- smoke
end
BUILD.dn_sixarm = function(P)
	-- the huge six-armed Doctor in a white coat
	local coat = rgb(232, 232, 232)
	P(Vector3.new(3.2, 6, 2), at(0, 2, 0), coat)
	P(Vector3.new(1, 3, 1), at(-0.8, -2.3, 0), rgb(40, 40, 50))
	P(Vector3.new(1, 3, 1), at(0.8, -2.3, 0), rgb(40, 40, 50))
	for i = 0, 2 do
		for _, x in ipairs({ -1, 1 }) do P(Vector3.new(0.6, 4.4, 0.6), at(x * (2 + i * 0.3), 3 - i * 1.3, -0.3, 20, 0, x * (25 + i * 22)), coat) end
	end
	P(Vector3.new(2.6, 2.6, 2.6), at(0, 6.3, 0), rgb(240, 230, 210), { shape = BALL })
	P(Vector3.new(0.7, 0.9, 0.4), at(-0.5, 6.5, -1.05), rgb(0, 0, 0), { shape = BALL })
	P(Vector3.new(0.7, 0.9, 0.4), at(0.5, 6.5, -1.05), rgb(0, 0, 0), { shape = BALL })
	P(Vector3.new(1.3, 0.12, 0.1), at(0, 5.8, -1.25), rgb(0, 0, 0))
end
BUILD.locust = function(P)
	-- the Locust's true form: a very tall, thin black figure with a stretched grey human-like face,
	-- hollow black eyes and mouth, and dark cable-like tubes coiled around its head and neck (no gore)
	local black, tube, face = rgb(12, 12, 14), rgb(34, 35, 40), rgb(150, 145, 140)
	for _, x in ipairs({ -1, 1 }) do
		P(Vector3.new(0.38, 3.4, 0.38), at(x * 0.45, -1.3, 0, 0, 0, x * 3), black)             -- long shins
		P(Vector3.new(0.45, 3.2, 0.45), at(x * 0.5, 1.9, 0, 0, 0, x * 2), black)               -- thighs
		P(Vector3.new(0.7, 0.25, 1.1), at(x * 0.45, -2.95, -0.25), black)                      -- narrow feet
		P(Vector3.new(0.3, 3.6, 0.3), at(x * 1.25, 4.6, -0.15, 8, 0, x * 8), black)           -- upper arms
		P(Vector3.new(0.26, 3.6, 0.26), at(x * 1.55, 1.2, -0.45, 14, 0, x * 4), black)        -- forearms (hang low)
		for f = -1, 1 do P(Vector3.new(0.08, 1.2, 0.08), at(x * 1.65 + f * 0.12, -1.0, -0.7, 18, 0, f * 6), black) end -- long fingers
	end
	P(Vector3.new(1.5, 1, 0.8), at(0, 3.6, 0), black)                                           -- hips
	P(Vector3.new(1.4, 3.2, 0.9), at(0, 5.3, 0), black)                                         -- gaunt chest
	P(Vector3.new(2.3, 0.6, 1), at(0, 6.8, 0), black)                                           -- bony shoulders
	P(Vector3.new(0.55, 2.4, 0.55), at(0, 8.1, -0.1, 6, 0, 0), black)                           -- long neck
	for i = 0, 7 do                                                                             -- tubes coiled around the neck
		P(Vector3.new(1.15, 0.22, 1.15), at(0, 7.2 + i * 0.28, -0.1, 0, i * 40, (i % 2 == 0) and 10 or -10), tube, { shape = CYL, mat = Enum.Material.Rubber })
	end
	P(Vector3.new(1.9, 2.9, 1.7), at(0, 10.4, -0.1), black, { shape = BALL })                  -- long black head
	P(Vector3.new(1.5, 2.4, 0.5), at(0.05, 10.3, -0.85, 0, 0, 4), face, { shape = BALL, mat = Enum.Material.Concrete }) -- stretched pale face
	P(Vector3.new(0.45, 0.85, 0.3), at(-0.33, 10.8, -1.05, 0, 0, -6), rgb(0, 0, 0), { shape = BALL })  -- hollow eyes (asymmetric)
	P(Vector3.new(0.52, 0.95, 0.3), at(0.38, 10.75, -1.05, 0, 0, 8), rgb(0, 0, 0), { shape = BALL })
	P(Vector3.new(0.42, 0.6, 0.3), at(0.06, 9.55, -1.03, 0, 0, 10), rgb(0, 0, 0), { shape = BALL })    -- hollow open mouth
	P(Vector3.new(0.1, 0.5, 0.1), at(0.02, 10.15, -1.1), rgb(110, 105, 100))                   -- thin nose ridge
	for i, r in ipairs({ { 11.4, 25 }, { 10.6, -30 }, { 9.8, 15 } }) do                          -- cables wrapped around the head
		P(Vector3.new(0.22, 2.3, 2.3), at(0, r[1], -0.1, 0, 90, r[2]), tube, { shape = CYL, mat = Enum.Material.Rubber, transp = 0 })
		_ = i
	end
	P(Vector3.new(0.2, 2.2, 0.2), at(0.7, 12.1, 0.2, 0, 0, -30), tube, { mat = Enum.Material.Rubber }) -- loose cable ends
	P(Vector3.new(0.2, 1.8, 0.2), at(-0.6, 12.0, 0.3, 0, 0, 35), tube, { mat = Enum.Material.Rubber })
	for i = 1, 4 do P(Vector3.new(1.3, 0.05, 0.05), at(math.sin(i * 5) * 0.3, 3.5 + i * 1.6, -0.5), rgb(220, 220, 220), { mat = NEON, transp = 0.5, noShadow = true }) end -- screen static clinging to it
end
BUILD.boisvert = function(P)
	humanoidBody(P, rgb(154, 154, 154), { legs = rgb(110, 110, 110), arms = rgb(190, 190, 190) })
	P(Vector3.new(0.9, 0.9, 0.12), at(-0.6, 0.6, -0.82), rgb(80, 80, 80))
	P(Vector3.new(0.9, 0.9, 0.12), at(0.5, -0.4, -0.82), rgb(220, 220, 220))
	P(Vector3.new(2.6, 2.6, 2.6), at(0, 3, 0), rgb(220, 220, 220))                              -- boxy white head
	P(Vector3.new(0.75, 0.9, 0.3), at(-0.55, 3.3, -1.25), rgb(0, 0, 0), { shape = BALL })
	P(Vector3.new(0.75, 0.9, 0.3), at(0.55, 3.3, -1.25), rgb(0, 0, 0), { shape = BALL })
	P(Vector3.new(1.6, 0.15, 0.1), at(0, 2.45, -1.32), rgb(0, 0, 0))
	for i = 1, 5 do P(Vector3.new(0.4, 0.4, 0.4), at(math.sin(i * 3.1) * 1.6, 1 + math.cos(i * 1.7) * 2, math.cos(i) * 0.9), rgb(30 * i, 30 * i, 30 * i), { mat = NEON, transp = 0.3, noShadow = true }) end -- glitch cubes
	P(Vector3.new(0.15, 0.4, 0.1), at(-0.8, 2.6, -1.32), rgb(0, 0, 0))
	P(Vector3.new(0.15, 0.4, 0.1), at(0.8, 2.6, -1.32), rgb(0, 0, 0))
end
BUILD.demogorgon = function(P)
	local skin = rgb(110, 93, 86)
	P(Vector3.new(0.75, 2.6, 0.75), at(-0.6, -1.7, 0), skin)
	P(Vector3.new(0.75, 2.6, 0.75), at(0.6, -1.7, 0), skin)
	P(Vector3.new(2, 3.6, 1.3), at(0, 1.2, 0), skin)
	P(Vector3.new(0.5, 4, 0.5), at(-1.5, 0.6, 0, 0, 0, -10), skin)
	P(Vector3.new(0.5, 4, 0.5), at(1.5, 0.6, 0, 0, 0, 10), skin)
	P(Vector3.new(1.5, 1.5, 1.5), at(0, 3.9, -0.2), rgb(90, 13, 13), { shape = BALL })           -- mouth center
	for i = 0, 4 do                                                                             -- five open petals
		local off = CFrame.new(0, 3.9, -0.4) * CFrame.Angles(0, 0, math.rad(i * 72)) * CFrame.new(0, 1.05, 0) * CFrame.Angles(math.rad(-35), 0, 0)
		P(Vector3.new(1, 2, 0.22), off, rgb(138, 112, 102))
		P(Vector3.new(0.8, 0.15, 0.26), off * CFrame.new(0, -0.6, -0.02), rgb(245, 240, 224))
		P(Vector3.new(0.8, 0.15, 0.26), off * CFrame.new(0, 0.1, -0.02), rgb(245, 240, 224))
		P(Vector3.new(0.6, 0.15, 0.26), off * CFrame.new(0, 0.7, -0.02), rgb(245, 240, 224))
	end
	for _, x in ipairs({ -1, 1 }) do
		for f = -1, 1 do P(Vector3.new(0.14, 1.5, 0.14), at(x * 1.75 + f * 0.18, -1.9, -0.2, -15, 0, f * 8), rgb(60, 50, 46)) end -- long claws
		P(Vector3.new(0.9, 0.5, 1.6), at(x * 0.6, -3.05, -0.4), skin)
	end
	for i = 0, 3 do P(Vector3.new(2.05, 0.1, 1.35), at(0, 0.2 + i * 0.6, 0), rgb(85, 70, 64)) end       -- sinewy ridges
end

BUILD.sonicexe = function(P)
	-- fan-made creepypasta hedgehog: blue quills, black eye sockets with glowing red pupils, a too-wide grin
	local blue, peach, white = rgb(28, 52, 150), rgb(226, 182, 140), rgb(240, 240, 240)
	for _, x in ipairs({ -1, 1 }) do
		P(Vector3.new(0.55, 2.4, 0.55), at(x * 0.5, -1.7, 0), blue)                                -- thin legs
		P(Vector3.new(1, 0.8, 1.9), at(x * 0.55, -2.9, -0.4), rgb(180, 20, 25))                     -- red shoes
		P(Vector3.new(1.05, 0.3, 0.5), at(x * 0.55, -2.65, -0.2), white)                            -- shoe strap
		P(Vector3.new(0.4, 2.6, 0.4), at(x * 1.25, 0.6, 0, 0, 0, x * 12), blue)                      -- arms
		P(Vector3.new(0.85, 0.85, 0.85), at(x * 1.55, -0.75, -0.1), white, { shape = BALL })        -- white gloves
	end
	P(Vector3.new(1.8, 2.4, 1.3), at(0, 0.7, 0), blue, { shape = BALL })                           -- torso
	P(Vector3.new(1.2, 1.6, 0.4), at(0, 0.6, -0.55), peach, { shape = BALL })                      -- belly
	P(Vector3.new(3, 2.8, 2.6), at(0, 3.3, 0), blue, { shape = BALL })                             -- big head
	for i = 0, 2 do                                                                                -- swept-back quills
		P(Vector3.new(0.9 - i * 0.15, 0.9 - i * 0.15, 2.6), at(0, 4.2 - i * 0.9, 1.6, -25 + i * 18, 0, 0), blue)
		for _, x in ipairs({ -1, 1 }) do P(Vector3.new(0.7, 0.7, 2), at(x * 0.8, 3.9 - i * 0.9, 1.4, -15 + i * 15, x * 20, 0), blue) end
	end
	for _, x in ipairs({ -1, 1 }) do P(Vector3.new(0.5, 1.1, 0.5), at(x * 0.95, 4.9, 0.2, 0, 0, x * -20), blue) end -- ears
	P(Vector3.new(2.1, 1.3, 0.6), at(0, 3.55, -1.05), white, { shape = BALL })                     -- eye patch
	P(Vector3.new(0.7, 0.9, 0.3), at(-0.45, 3.6, -1.32), rgb(0, 0, 0), { shape = BALL })           -- black sockets
	P(Vector3.new(0.7, 0.9, 0.3), at(0.45, 3.6, -1.32), rgb(0, 0, 0), { shape = BALL })
	P(Vector3.new(0.22, 0.22, 0.22), at(-0.45, 3.55, -1.46), rgb(255, 20, 20), { shape = BALL, mat = NEON, noShadow = true }) -- red pupils
	P(Vector3.new(0.22, 0.22, 0.22), at(0.45, 3.55, -1.46), rgb(255, 20, 20), { shape = BALL, mat = NEON, noShadow = true })
	P(Vector3.new(1.8, 1, 0.9), at(0, 2.75, -1.05), peach, { shape = BALL })                       -- muzzle
	P(Vector3.new(0.35, 0.28, 0.3), at(0, 3.05, -1.5), rgb(10, 10, 10), { shape = BALL })          -- nose
	P(Vector3.new(1.5, 0.22, 0.1), at(0, 2.55, -1.5, 0, 0, 0), rgb(10, 10, 10))                   -- too-wide grin
	for i = -3, 3 do P(Vector3.new(0.12, 0.16, 0.06), at(i * 0.2, 2.62, -1.55), white) end          -- teeth
end

-- Weld a monster model onto a character. Returns the model.
-- lobby-shop monster skins (cosmetic colour grades, bought with in-game coins)
do -- v1.4 phase-2 monsters
	local more = require(script.Parent:WaitForChild("ModelsP2"))({ rgb = rgb, at = at, BALL = BALL, CYL = CYL, NEON = NEON, humanoidBody = humanoidBody })
	for k, f in pairs(more) do BUILD[k] = f end
end
local SKINS = {
	shadow = { tint = Color3.fromRGB(10, 10, 14), k = 0.65 },
	toxic = { tint = Color3.fromRGB(90, 220, 60), k = 0.45 },
	frost = { tint = Color3.fromRGB(150, 210, 255), k = 0.5 },
	blood = { tint = Color3.fromRGB(150, 10, 10), k = 0.5 },
	golden = { tint = Color3.fromRGB(255, 200, 60), k = 0.6, mat = Enum.Material.Foil },
	lava = { tint = Color3.fromRGB(255, 90, 20), k = 0.55, mat = Enum.Material.CrackedLava },
	neon = { tint = Color3.fromRGB(255, 40, 220), k = 0.5, mat = Enum.Material.Neon },
	abyss = { tint = Color3.fromRGB(10, 30, 80), k = 0.6, mat = Enum.Material.Glass },
}
-- Father Fester grows stronger as more survivors see him: stage parts appear, his eyes burn red
function Models.festerStage(model, stage)
	if not model then return end
	for _, d in ipairs(model:GetDescendants()) do
		if d:IsA("BasePart") then
			if d.Name == "Stage3" then d.Transparency = stage >= 3 and 0 or 1 end
			if d.Name == "Stage5" then d.Transparency = stage >= 5 and 0 or 1 end
			if d.Name == "Stage6" then d.Transparency = stage >= 6 and 0.6 or 1 end
			if d.Name == "Pupil" then d.Color = Color3.fromRGB(255, 255 - stage * 40, 255 - stage * 42) end
		end
	end
	local root = model.PrimaryPart
	local glow = root and root:FindFirstChildOfClass("PointLight")
	if glow then glow.Range = 14 + stage * 4; glow.Brightness = 0.7 + stage * 0.25 end
end
function Models.applySkin(model, skin)
	local s = SKINS[skin]
	if not s or not model then return end
	for _, d in ipairs(model:GetDescendants()) do
		if d:IsA("BasePart") and d.Material ~= NEON and d.Transparency < 1 then
			d.Color = d.Color:Lerp(s.tint, s.k)
			if s.mat then d.Material = s.mat end
		end
	end
end

-- v1.5 realism pass: wet sheen on sea creatures/slime, glowing eyes that actually light the face,
-- subtle per-part tone variation so skin, fur and scales don't read as flat plastic, shadows on every part
local WET = { megalodon = true, megalodon_h = true, kraken = true, cthulhu = true, leviathan = true, mosasaurus = true, nessie = true, demogorgon = true }
local ROBOT = { freddy = true, bonnie = true, chica = true, foxy = true, springtrap = true, boisvert = true }
function Models.realize(model, kind)
	local i, lights = 0, 0
	for _, p in ipairs(model:GetDescendants()) do
		if p:IsA("BasePart") and p.Transparency < 1 then
			i += 1
			p.CastShadow = true
			if p.Material == Enum.Material.Neon then
				if lights < 4 and p.Size.Magnitude < 4 then
					lights += 1
					local l = Instance.new("PointLight")
					l.Color = p.Color
					l.Range = 6
					l.Brightness = 1.4
					l.Shadows = false
					l.Parent = p
				end
			else
				local h, sat, v = p.Color:ToHSV()
				local jit = ROBOT[kind] and 0.03 or 0.08
				p.Color = Color3.fromHSV(h, math.clamp(sat * (1 + ((i * 53) % 7 - 3) / 40), 0, 1), math.clamp(v * (1 - jit / 2 + ((i * 37) % 11) / 10 * jit), 0, 1))
				if WET[kind] then p.Reflectance = 0.14 end
				if ROBOT[kind] and p.Material == Enum.Material.CorrodedMetal then p.Reflectance = 0.05 end
			end
		end
	end
end

function Models.morph(character, kind, skin)
	local hrp = character:FindFirstChild("HumanoidRootPart")
	if not hrp then return nil end
	local old = character:FindFirstChild("NH_Morph")
	if old then old:Destroy() end
	local model = Instance.new("Model")
	model.Name = "NH_Morph"
	model:SetAttribute("Kind", kind)
	-- align feet with the floor: HRP is HipHeight + half its height above the ground
	local hum = character:FindFirstChildOfClass("Humanoid")
	local groundOffset = (hum and hum.RigType == Enum.HumanoidRigType.R15) and (hum.HipHeight + hrp.Size.Y / 2) or 3
	local root = Instance.new("Part")
	root.Name = "Root"
	root.Size = Vector3.new(1, 1, 1)
	root.Transparency = 1
	root.CanCollide = false
	root.CanQuery = false
	root.CanTouch = false
	root.Massless = true
	root.CFrame = hrp.CFrame * CFrame.new(0, 3 - groundOffset, 0)
	root.Parent = model
	local weld = Instance.new("WeldConstraint")
	weld.Part0 = hrp
	weld.Part1 = root
	weld.Parent = root
	local P = builder(model, root, false)
	defaultMat = SKIN[kind] or PLASTIC;
	(BUILD[kind] or BUILD.freddy)(P)
	defaultMat = PLASTIC
	model.PrimaryPart = root
	Models.realize(model, kind)
	Models.applySkin(model, skin)
	if kind == "fester" then Models.festerStage(model, 0) end
	-- hide the player's own avatar
	for _, d in ipairs(character:GetDescendants()) do
		if d:IsA("BasePart") and d.Name ~= "HumanoidRootPart" and not d:IsDescendantOf(model) then
			d.Transparency = 1
		elseif d:IsA("Decal") then
			d.Transparency = 1
		end
	end
	local glow = Instance.new("PointLight")
	glow.Color = kind == "locust" and Color3.fromRGB(190, 200, 220) or Color3.fromRGB(255, 40, 40)
	glow.Range = 14
	glow.Brightness = 0.7
	glow.Parent = root
	model.Parent = character
	return model
end

-- Anchored copy of a monster at the origin (feet at y=0), for the jumpscare viewport.
function Models.template(kind)
	local model = Instance.new("Model")
	model.Name = kind
	local root = Instance.new("Part")
	root.Name = "Root"
	root.Anchored = true
	root.Transparency = 1
	root.Size = Vector3.new(1, 1, 1)
	root.CFrame = CFrame.new(0, 3, 0)
	root.Parent = model
	local P = builder(model, root, true)
	defaultMat = SKIN[kind] or PLASTIC;
	(BUILD[kind] or BUILD.freddy)(P)
	defaultMat = PLASTIC
	model.PrimaryPart = root
	Models.realize(model, kind)
	if kind == "fester" then Models.festerStage(model, 6) end
	return model
end

-- Anchored helicopter at cframe. Returns model and a list of rotor parts to spin.
function Models.helicopter(cf, bodyColor)
	local model = Instance.new("Model")
	model.Name = "Helicopter"
	local base = Instance.new("Part")
	base.Anchored = true
	base.Transparency = 1
	base.CanCollide = false
	base.Size = Vector3.new(1, 1, 1)
	base.CFrame = cf
	base.Parent = model
	local P = builder(model, base, true)
	local c = bodyColor or Color3.fromRGB(45, 90, 58)
	P(Vector3.new(7, 5, 11), at(0, 4.5, 0), c, { collide = true, mat = METAL })                              -- cabin
	P(Vector3.new(6, 3.5, 3), at(0, 5, -6.2), Color3.fromRGB(159, 211, 255), { mat = GLASS, transp = 0.35 }) -- windshield
	P(Vector3.new(1.4, 1.4, 12), at(0, 5.5, 11.5), c, { mat = METAL })                                          -- tail boom
	P(Vector3.new(0.5, 4, 2.4), at(0, 7, 17.2), c)                                               -- tail fin
	P(Vector3.new(0.6, 0.6, 12), at(-3, 0.6, 0), Color3.fromRGB(30, 30, 30), { mat = METAL })   -- skids
	P(Vector3.new(0.6, 0.6, 12), at(3, 0.6, 0), Color3.fromRGB(30, 30, 30), { mat = METAL })
	P(Vector3.new(0.4, 1.6, 0.4), at(-3, 1.4, -3), Color3.fromRGB(30, 30, 30))
	P(Vector3.new(0.4, 1.6, 0.4), at(3, 1.4, -3), Color3.fromRGB(30, 30, 30))
	P(Vector3.new(0.4, 1.6, 0.4), at(-3, 1.4, 3), Color3.fromRGB(30, 30, 30))
	P(Vector3.new(0.4, 1.6, 0.4), at(3, 1.4, 3), Color3.fromRGB(30, 30, 30))
	P(Vector3.new(1.2, 1, 1.2), at(0, 7.4, 0), Color3.fromRGB(40, 40, 40), { mat = METAL })     -- rotor hub
	local r1 = P(Vector3.new(26, 0.2, 1.1), at(0, 8, 0), Color3.fromRGB(35, 35, 35), { name = "Rotor" })
	local r2 = P(Vector3.new(1.1, 0.2, 26), at(0, 8, 0), Color3.fromRGB(35, 35, 35), { name = "Rotor" })
	local light = Instance.new("PointLight")
	light.Range = 30
	light.Brightness = 1.2
	light.Color = Color3.fromRGB(120, 255, 140)
	light.Parent = base
	model.PrimaryPart = base
	return model, { r1, r2 }
end

return Models
