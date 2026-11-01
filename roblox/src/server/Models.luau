-- Part-built models: the 12 monsters (welded onto a player's character) and helicopters.
local Models = {}

local function rgb(r, g, b) return Color3.fromRGB(r, g, b) end
local function at(x, y, z, rx, ry, rz)
	return CFrame.new(x, y, z) * CFrame.Angles(math.rad(rx or 0), math.rad(ry or 0), math.rad(rz or 0))
end
local BALL, CYL = Enum.PartType.Ball, Enum.PartType.Cylinder
local NEON, METAL, GLASS = Enum.Material.Neon, Enum.Material.Metal, Enum.Material.Glass

-- Builder: adds parts relative to `root`. If anchored, parts are anchored; otherwise welded to root.
local function builder(model, root, anchored)
	return function(size, off, color, opts)
		opts = opts or {}
		local p = Instance.new("Part")
		p.Size = size
		p.Color = color
		p.Material = opts.mat or Enum.Material.SmoothPlastic
		if opts.shape then p.Shape = opts.shape end
		p.TopSurface = Enum.SurfaceType.Smooth
		p.BottomSurface = Enum.SurfaceType.Smooth
		p.CastShadow = false
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

local function animatronic(P, body, belly, eyeColor)
	humanoidBody(P, body)
	P(Vector3.new(1.9, 2, 0.3), at(0, -0.1, -0.85), belly)                                      -- belly
	P(Vector3.new(2.7, 2.7, 2.7), at(0, 2.7, 0), body, { shape = BALL })                         -- head
	P(Vector3.new(1.7, 0.9, 0.7), at(0, 2.2, -1.15), belly)                                     -- muzzle
	P(Vector3.new(1.3, 0.22, 0.1), at(0, 1.85, -1.5), rgb(235, 230, 215))                        -- teeth
	eyes(P, 3.05, -1.05, 0.5, 0.65, true, 0.32, eyeColor, true)
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
	end
end
BUILD.boiledone = function(P)
	local red = rgb(59, 8, 8)
	humanoidBody(P, red, { arms = rgb(45, 5, 5) })
	P(Vector3.new(2.5, 2.5, 2.5), at(0, 3.1, 0), rgb(74, 10, 10), { shape = BALL })
	eyes(P, 3.35, -1.05, 0.4, 0.3, false, 0.3, rgb(255, 255, 255), true)
	for i = 1, 6 do P(Vector3.new(0.35, 0.35, 0.35), at(math.sin(i * 7) * 1.1, math.cos(i * 3) * 1.4, -0.85), rgb(140, 0, 0), { shape = BALL, mat = NEON }) end
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
end
BUILD.locust = function(P)
	local black = rgb(21, 21, 21)
	P(Vector3.new(0.5, 2.4, 0.5), at(-0.5, -1.9, 0), black)
	P(Vector3.new(0.5, 2.4, 0.5), at(0.5, -1.9, 0), black)
	P(Vector3.new(1.8, 4, 1.2), at(0, 0.9, 0), black)
	P(Vector3.new(2.1, 2.1, 2.1), at(0, 3.9, 0), rgb(28, 28, 28), { shape = BALL })
	eyes(P, 4.1, -0.9, 0.42, 0.45, false, 0.45, rgb(212, 255, 58), true)
	P(Vector3.new(0.12, 2.6, 0.12), at(-0.6, 5.8, 0, 0, 0, 25), black)                           -- antennae
	P(Vector3.new(0.12, 2.6, 0.12), at(0.6, 5.8, 0, 0, 0, -25), black)
	for i, y in ipairs({ 1.8, 0.8, -0.2 }) do                                                    -- insect arms
		P(Vector3.new(0.25, 2.6, 0.25), at(-1.6, y, 0, 0, 0, -60 + i * 10), black)
		P(Vector3.new(0.25, 2.6, 0.25), at(1.6, y, 0, 0, 0, 60 - i * 10), black)
	end
	for i = 1, 5 do P(Vector3.new(1.4, 0.06, 0.05), at(math.sin(i * 5) * 0.6, i * 0.8 - 1.5, -0.62), rgb(220, 220, 220), { mat = NEON, transp = 0.4 }) end -- static lines
end
BUILD.monochrome = function(P)
	humanoidBody(P, rgb(154, 154, 154), { legs = rgb(110, 110, 110), arms = rgb(190, 190, 190) })
	P(Vector3.new(0.9, 0.9, 0.12), at(-0.6, 0.6, -0.82), rgb(80, 80, 80))
	P(Vector3.new(0.9, 0.9, 0.12), at(0.5, -0.4, -0.82), rgb(220, 220, 220))
	P(Vector3.new(2.6, 2.6, 2.6), at(0, 3, 0), rgb(220, 220, 220))                              -- boxy white head
	P(Vector3.new(0.75, 0.9, 0.3), at(-0.55, 3.3, -1.25), rgb(0, 0, 0), { shape = BALL })
	P(Vector3.new(0.75, 0.9, 0.3), at(0.55, 3.3, -1.25), rgb(0, 0, 0), { shape = BALL })
	P(Vector3.new(1.6, 0.15, 0.1), at(0, 2.45, -1.32), rgb(0, 0, 0))
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
	end
end

-- Weld a monster model onto a character. Returns the model.
function Models.morph(character, kind)
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
	local P = builder(model, root, false);
	(BUILD[kind] or BUILD.freddy)(P)
	model.PrimaryPart = root
	-- hide the player's own avatar
	for _, d in ipairs(character:GetDescendants()) do
		if d:IsA("BasePart") and d.Name ~= "HumanoidRootPart" and not d:IsDescendantOf(model) then
			d.Transparency = 1
		elseif d:IsA("Decal") then
			d.Transparency = 1
		end
	end
	local glow = Instance.new("PointLight")
	glow.Color = kind == "locust" and Color3.fromRGB(200, 255, 80) or Color3.fromRGB(255, 40, 40)
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
	local P = builder(model, root, true);
	(BUILD[kind] or BUILD.freddy)(P)
	model.PrimaryPart = root
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
	P(Vector3.new(7, 5, 11), at(0, 4.5, 0), c, { collide = true })                                -- cabin
	P(Vector3.new(6, 3.5, 3), at(0, 5, -6.2), Color3.fromRGB(159, 211, 255), { mat = GLASS, transp = 0.35 }) -- windshield
	P(Vector3.new(1.4, 1.4, 12), at(0, 5.5, 11.5), c)                                            -- tail boom
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
