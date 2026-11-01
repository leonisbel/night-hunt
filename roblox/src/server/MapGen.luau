-- Generates one of three themed hunt maps out of anchored parts.
local Config = require(game:GetService("ReplicatedStorage"):WaitForChild("NightHunt"):WaitForChild("Config"))

local MapGen = {}

local function part(parent, size, cf, color, mat, opts)
	opts = opts or {}
	local p = Instance.new("Part")
	p.Anchored = true
	p.Size = size
	p.CFrame = cf
	p.Color = color
	p.Material = mat or Enum.Material.SmoothPlastic
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	if opts.shape then p.Shape = opts.shape end
	if opts.collide ~= nil then p.CanCollide = opts.collide end
	if opts.transp then p.Transparency = opts.transp end
	p.Name = opts.name or "Part"
	p.Parent = parent
	return p
end

local THEME = {
	["Abandoned Pizzeria Town"] = {
		ground = Color3.fromRGB(45, 42, 40), groundMat = Enum.Material.Asphalt, terrain = Enum.Material.Asphalt, patch = Enum.Material.Ground,
		wall = Color3.fromRGB(110, 70, 60), wallMat = Enum.Material.Brick,
		floor = Color3.fromRGB(30, 30, 30), floorMat = Enum.Material.Slate,
		buildings = 11, trees = 10, hides = 14, fog = 140,
		lamp = Color3.fromRGB(255, 190, 110), fogColor = Color3.fromRGB(20, 14, 14),
	},
	["Foggy Woods"] = {
		ground = Color3.fromRGB(38, 54, 32), groundMat = Enum.Material.Grass, terrain = Enum.Material.LeafyGrass, patch = Enum.Material.Mud,
		wall = Color3.fromRGB(92, 70, 50), wallMat = Enum.Material.WoodPlanks,
		floor = Color3.fromRGB(70, 52, 36), floorMat = Enum.Material.Wood,
		buildings = 4, trees = 90, hides = 26, fog = 90,
		lamp = Color3.fromRGB(255, 170, 90), fogColor = Color3.fromRGB(26, 32, 30),
	},
	["Static Fields"] = {
		ground = Color3.fromRGB(70, 70, 54), groundMat = Enum.Material.Grass, terrain = Enum.Material.Grass, patch = Enum.Material.Ground,
		wall = Color3.fromRGB(130, 130, 130), wallMat = Enum.Material.Concrete,
		floor = Color3.fromRGB(60, 60, 60), floorMat = Enum.Material.Concrete,
		buildings = 6, trees = 24, hides = 30, fog = 120,
		lamp = Color3.fromRGB(200, 220, 255), fogColor = Color3.fromRGB(30, 30, 34),
	},
}
MapGen.THEME = THEME

-- A box building with walls, a roof, and a doorway on one random side.
local function building(parent, t, center, w, d, rng)
	local h = 14
	local wallT = 1
	local doorW = 7
	local doorSide = rng:NextInteger(1, 4)
	local b = Instance.new("Model")
	b.Name = "Building"
	b.Parent = parent
	part(b, Vector3.new(w, 0.4, d), CFrame.new(center + Vector3.new(0, 0.2, 0)), t.floor, t.floorMat)
	part(b, Vector3.new(w + 2, 1, d + 2), CFrame.new(center + Vector3.new(0, h + 0.5, 0)), t.wall, t.wallMat)
	local sides = {
		{ len = w, cf = CFrame.new(center + Vector3.new(0, h / 2, -d / 2)), axis = "x" },
		{ len = w, cf = CFrame.new(center + Vector3.new(0, h / 2, d / 2)), axis = "x" },
		{ len = d, cf = CFrame.new(center + Vector3.new(-w / 2, h / 2, 0)), axis = "z" },
		{ len = d, cf = CFrame.new(center + Vector3.new(w / 2, h / 2, 0)), axis = "z" },
	}
	for i, s in ipairs(sides) do
		local function seg(len, offset)
			if len <= 0.1 then return end
			local size = s.axis == "x" and Vector3.new(len, h, wallT) or Vector3.new(wallT, h, len)
			local shift = s.axis == "x" and Vector3.new(offset, 0, 0) or Vector3.new(0, 0, offset)
			part(b, size, s.cf + shift, t.wall, t.wallMat)
		end
		if i == doorSide then
			local half = (s.len - doorW) / 2
			seg(half, -(doorW / 2 + half / 2))
			seg(half, doorW / 2 + half / 2)
			local lintel = s.axis == "x" and Vector3.new(doorW, 4, wallT) or Vector3.new(wallT, 4, doorW)
			part(b, lintel, s.cf + Vector3.new(0, h / 2 - 2, 0), t.wall, t.wallMat)
		else
			seg(s.len, 0)
		end
	end
	-- a flickering ceiling light
	local bulb = part(b, Vector3.new(1, 0.5, 1), CFrame.new(center + Vector3.new(0, h - 0.4, 0)), t.lamp, Enum.Material.Neon, { collide = false, name = "FlickerLight" })
	local l = Instance.new("PointLight")
	l.Range = 22
	l.Brightness = 1.4
	l.Color = t.lamp
	l.Parent = bulb
	-- a table inside to break line of sight
	part(b, Vector3.new(6, 3, 3), CFrame.new(center + Vector3.new(rng:NextNumber(-w / 4, w / 4), 1.5, rng:NextNumber(-d / 4, d / 4))), Color3.fromRGB(60, 45, 35), Enum.Material.Wood)
	return b
end

local function tree(parent, pos, theme, rng)
	local tm = Instance.new("Model")
	tm.Name = "Tree"
	tm.Parent = parent
	local h = rng:NextNumber(18, 34)
	part(tm, Vector3.new(2.2, h, 2.2), CFrame.new(pos + Vector3.new(0, h / 2, 0)), Color3.fromRGB(58, 42, 30), Enum.Material.Wood)
	if theme ~= "Static Fields" then
		local leaf = theme == "Foggy Woods" and Color3.fromRGB(28, 48, 28) or Color3.fromRGB(40, 50, 30)
		part(tm, Vector3.new(12, 12, 12), CFrame.new(pos + Vector3.new(0, h, 0)), leaf, Enum.Material.Grass, { shape = Enum.PartType.Ball, collide = false })
	else
		-- dead tree: a few bare branches
		for i = 1, 3 do
			part(tm, Vector3.new(0.7, 7, 0.7), CFrame.new(pos + Vector3.new(0, h * 0.7 + i * 2, 0)) * CFrame.Angles(0, math.rad(i * 120), math.rad(40)), Color3.fromRGB(58, 42, 30), Enum.Material.Wood)
		end
	end
end

-- Generate a map. Returns info { model, spawns, vents, extract, theme, half }.
function MapGen.generate(themeName, seed)
	local rng = Random.new(seed or os.time())
	local t = THEME[themeName] or THEME["Foggy Woods"]
	local O = Config.MAP_ORIGIN
	local S = Config.MAP_SIZE
	local half = S / 2
	local map = Instance.new("Model")
	map.Name = "NightHuntMap"

	-- smooth Terrain ground (real grass/asphalt materials) with dirt/mud patches; an invisible slab underneath as a safety floor
	part(map, Vector3.new(S + 20, 2, S + 20), CFrame.new(O + Vector3.new(0, -1, 0)), t.ground, t.groundMat, { name = "Ground", transp = 1 })
	local terrain = workspace.Terrain
	pcall(function() terrain:SetMaterialColor(t.terrain, t.ground) end)
	terrain:FillBlock(CFrame.new(O + Vector3.new(0, -2, 0)), Vector3.new(S + 40, 4, S + 40), t.terrain)
	for _ = 1, 26 do
		local pp = O + Vector3.new(rng:NextNumber(-half, half), 0, rng:NextNumber(-half, half))
		terrain:FillCylinder(CFrame.new(pp + Vector3.new(0, -1.9, 0)), 0.3, rng:NextNumber(6, 16), t.patch)
	end
	-- drifting ground fog
	for i = 1, 8 do
		local fp = part(map, Vector3.new(1, 1, 1), CFrame.new(O + Vector3.new(rng:NextNumber(-half, half) * 0.8, 2, rng:NextNumber(-half, half) * 0.8)), Color3.new(), nil, { collide = false, transp = 1, name = "FogEmitter" })
		fp.CanQuery = false
		local pe = Instance.new("ParticleEmitter")
		pe.Texture = "rbxasset://textures/particles/smoke_main.dds"
		pe.Color = ColorSequence.new(t.fogColor:Lerp(Color3.new(0.6, 0.6, 0.65), 0.5))
		pe.Transparency = NumberSequence.new({ NumberSequenceKeypoint.new(0, 1), NumberSequenceKeypoint.new(0.4, 0.88), NumberSequenceKeypoint.new(1, 1) })
		pe.Size = NumberSequence.new(18, 30)
		pe.Lifetime = NumberRange.new(10, 16)
		pe.Rate = 1.2
		pe.Speed = NumberRange.new(0.5, 2)
		pe.SpreadAngle = Vector2.new(180, 10)
		pe.Rotation = NumberRange.new(0, 360)
		pe.RotSpeed = NumberRange.new(-6, 6)
		pe.LightInfluence = 1
		pe.Parent = fp
		_ = i
	end
	for _, w in ipairs({
		{ Vector3.new(S + 20, 40, 2), Vector3.new(0, 20, -half - 10) },
		{ Vector3.new(S + 20, 40, 2), Vector3.new(0, 20, half + 10) },
		{ Vector3.new(2, 40, S + 20), Vector3.new(-half - 10, 20, 0) },
		{ Vector3.new(2, 40, S + 20), Vector3.new(half + 10, 20, 0) },
	}) do
		part(map, w[1], CFrame.new(O + w[2]), Color3.fromRGB(10, 10, 12), Enum.Material.Slate, { name = "Boundary", transp = 0.2 })
	end

	local occupied = {}
	local function free(pos, r)
		for _, o in ipairs(occupied) do
			if (Vector2.new(o.p.X, o.p.Z) - Vector2.new(pos.X, pos.Z)).Magnitude < r + o.r then return false end
		end
		return true
	end
	local function claim(pos, r) table.insert(occupied, { p = pos, r = r }) end
	local function randPos(margin)
		return O + Vector3.new(rng:NextNumber(-half + margin, half - margin), 0, rng:NextNumber(-half + margin, half - margin))
	end

	-- extraction pad (kept clear) in a random corner region
	local ex = O + Vector3.new((rng:NextInteger(0, 1) * 2 - 1) * (half - 40), 0, (rng:NextInteger(0, 1) * 2 - 1) * (half - 40))
	claim(ex, 26)
	local pad = part(map, Vector3.new(30, 0.4, 30), CFrame.new(ex + Vector3.new(0, 0.2, 0)), Color3.fromRGB(50, 50, 50), Enum.Material.Concrete, { name = "ExtractPad" })
	part(map, Vector3.new(16, 0.45, 2), CFrame.new(ex + Vector3.new(0, 0.25, 0)), Color3.fromRGB(240, 240, 240), Enum.Material.Neon)
	part(map, Vector3.new(2, 0.45, 16), CFrame.new(ex + Vector3.new(-7, 0.25, 0)), Color3.fromRGB(240, 240, 240), Enum.Material.Neon)
	part(map, Vector3.new(2, 0.45, 16), CFrame.new(ex + Vector3.new(7, 0.25, 0)), Color3.fromRGB(240, 240, 240), Enum.Material.Neon)
	_ = pad

	-- central spawn plaza kept clear
	claim(O, 30)

	for _ = 1, t.buildings do
		for _try = 1, 25 do
			local w, d = rng:NextInteger(24, 44), rng:NextInteger(22, 40)
			local pos = randPos(30)
			local r = math.max(w, d) / 2 + 8
			if free(pos, r) then
				claim(pos, r)
				building(map, t, pos, w, d, rng)
				break
			end
		end
	end

	for _ = 1, t.trees do
		for _try = 1, 10 do
			local pos = randPos(6)
			if free(pos, 5) then
				claim(pos, 3)
				tree(map, pos, themeName, rng)
				break
			end
		end
	end

	-- hiding bushes / crates (walk inside them to hide)
	for _ = 1, t.hides do
		for _try = 1, 10 do
			local pos = randPos(8)
			if free(pos, 5) then
				claim(pos, 4)
				if themeName == "Abandoned Pizzeria Town" then
					local c = part(map, Vector3.new(7, 7, 7), CFrame.new(pos + Vector3.new(0, 3.5, 0)), Color3.fromRGB(120, 90, 50), Enum.Material.WoodPlanks, { collide = false, name = "HideSpot", transp = 0.05 })
					_ = c
				else
					part(map, Vector3.new(9, 8, 9), CFrame.new(pos + Vector3.new(0, 3, 0)), themeName == "Foggy Woods" and Color3.fromRGB(30, 60, 30) or Color3.fromRGB(95, 95, 60), Enum.Material.Grass, { shape = Enum.PartType.Ball, collide = false, name = "HideSpot" })
				end
				break
			end
		end
	end

	-- street lamps / static pylons
	for _ = 1, 14 do
		local pos = randPos(10)
		if free(pos, 3) then
			claim(pos, 2)
			part(map, Vector3.new(0.8, 16, 0.8), CFrame.new(pos + Vector3.new(0, 8, 0)), Color3.fromRGB(40, 40, 40), Enum.Material.Metal)
			local bulb = part(map, Vector3.new(1.6, 1, 1.6), CFrame.new(pos + Vector3.new(0, 16.4, 0)), t.lamp, Enum.Material.Neon, { collide = false, name = "FlickerLight" })
			local l = Instance.new("PointLight")
			l.Range = 30
			l.Brightness = 1.2
			l.Color = t.lamp
			l.Parent = bulb
		end
	end

	-- vents (Springtrap teleports between these)
	local vents = {}
	for i = 1, 8 do
		for _try = 1, 15 do
			local pos = randPos(14)
			if free(pos, 3) then
				claim(pos, 2)
				part(map, Vector3.new(5, 0.3, 5), CFrame.new(pos + Vector3.new(0, 0.15, 0)), Color3.fromRGB(80, 85, 90), Enum.Material.DiamondPlate, { name = "Vent" .. i })
				table.insert(vents, pos + Vector3.new(0, 3, 0))
				break
			end
		end
	end

	-- survivor spawns around the plaza, monster spawns on the far side
	local spawns, monsterSpawns = {}, {}
	for i = 1, 15 do
		local a = (i / 15) * math.pi * 2
		table.insert(spawns, O + Vector3.new(math.cos(a) * 14, 4, math.sin(a) * 14))
	end
	for i = 1, 5 do
		local a = rng:NextNumber(0, math.pi * 2)
		table.insert(monsterSpawns, O + Vector3.new(math.cos(a) * (half - 25), 4, math.sin(a) * (half - 25)))
	end

	return {
		model = map, spawns = spawns, monsterSpawns = monsterSpawns, vents = vents,
		extract = ex, theme = themeName, half = half, fog = t.fog, fogColor = t.fogColor,
	}
end

-- Remove the terrain a map created.
function MapGen.clearTerrain()
	local O, S = Config.MAP_ORIGIN, Config.MAP_SIZE
	workspace.Terrain:FillBlock(CFrame.new(O + Vector3.new(0, -1, 0)), Vector3.new(S + 48, 8, S + 48), Enum.Material.Air)
end

return MapGen
