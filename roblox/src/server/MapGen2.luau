-- v1.4 (phase 2): the six new hunt maps (Stormy Ocean, Rainforest Swamp, Snowy Mountain, Haunted Farm,
-- Vampire Castle, Fester Street) and the walk-in store building in the lobby.
-- MapGen.generate calls the hooks here; helpers (part, building, pine, tree, wallSide) are passed in.
local Config = require(game:GetService("ReplicatedStorage"):WaitForChild("NightHunt"):WaitForChild("Config"))
local MapGen2 = {}

local rgb = Color3.fromRGB
MapGen2.THEMES = {
	["Stormy Ocean"] = {
		ground = rgb(194, 178, 128), groundMat = Enum.Material.Sand, terrain = Enum.Material.Sand, patch = Enum.Material.Ground,
		wall = rgb(120, 96, 66), wallMat = Enum.Material.WoodPlanks, floor = rgb(110, 84, 56), floorMat = Enum.Material.WoodPlanks,
		buildings = 10, trees = 70, hides = 30, fog = 160, ocean = true, size = Config.OCEAN_SIZE,
		lamp = rgb(255, 200, 120), fogColor = rgb(20, 28, 36),
	},
	["Rainforest Swamp"] = {
		ground = rgb(40, 52, 26), groundMat = Enum.Material.Mud, terrain = Enum.Material.Mud, patch = Enum.Material.LeafyGrass,
		wall = rgb(84, 70, 46), wallMat = Enum.Material.WoodPlanks, floor = rgb(70, 52, 36), floorMat = Enum.Material.Wood,
		buildings = 5, trees = 140, hides = 34, fog = 70, deep = true, jungle = true,
		lamp = rgb(200, 255, 150), fogColor = rgb(22, 34, 22),
	},
	["Snowy Mountain"] = {
		ground = rgb(230, 236, 242), groundMat = Enum.Material.Snow, terrain = Enum.Material.Snow, patch = Enum.Material.Glacier,
		wall = rgb(110, 80, 56), wallMat = Enum.Material.WoodPlanks, floor = rgb(90, 66, 44), floorMat = Enum.Material.Wood,
		buildings = 5, trees = 130, hides = 26, fog = 90, pines = true, snow = true, hills = 30,
		lamp = rgb(255, 210, 150), fogColor = rgb(160, 170, 185),
	},
	["Haunted Farm"] = {
		ground = rgb(76, 66, 40), groundMat = Enum.Material.Ground, terrain = Enum.Material.Ground, patch = Enum.Material.Grass,
		wall = rgb(150, 40, 34), wallMat = Enum.Material.WoodPlanks, floor = rgb(90, 66, 44), floorMat = Enum.Material.WoodPlanks,
		buildings = 4, trees = 30, hides = 20, fog = 110, farm = true,
		lamp = rgb(255, 180, 90), fogColor = rgb(34, 28, 20),
	},
	["Vampire Castle"] = {
		ground = rgb(40, 42, 36), groundMat = Enum.Material.Grass, terrain = Enum.Material.Grass, patch = Enum.Material.Rock,
		wall = rgb(90, 88, 92), wallMat = Enum.Material.Cobblestone, floor = rgb(60, 50, 50), floorMat = Enum.Material.Slate,
		buildings = 3, trees = 50, hides = 24, fog = 90, castle = true, hills = 10,
		lamp = rgb(255, 80, 60), fogColor = rgb(24, 12, 16),
	},
	["Fester Street"] = {
		ground = rgb(40, 40, 42), groundMat = Enum.Material.Asphalt, terrain = Enum.Material.Grass, patch = Enum.Material.Ground,
		wall = rgb(140, 120, 100), wallMat = Enum.Material.Brick, floor = rgb(80, 60, 44), floorMat = Enum.Material.Wood,
		buildings = 0, trees = 40, hides = 20, fog = 100, fester = true,
		lamp = rgb(255, 190, 110), fogColor = rgb(18, 16, 22),
	},
}

local function light(p, range, color, bright)
	local l = Instance.new("PointLight")
	l.Range, l.Color, l.Brightness = range, color, bright or 1.2
	l.Parent = p
	return l
end
local function billboard(p, text, color, size)
	local g = Instance.new("BillboardGui")
	g.Size = UDim2.fromOffset(size or 260, 60)
	g.StudsOffset = Vector3.new(0, 4, 0)
	g.MaxDistance = 220
	g.AlwaysOnTop = false
	g.LightInfluence = 0
	local t = Instance.new("TextLabel")
	t.Size = UDim2.fromScale(1, 1)
	t.BackgroundTransparency = 1
	t.Font = Enum.Font.GothamBlack
	t.TextScaled = true
	t.TextColor3 = color
	t.TextStrokeTransparency = 0.2
	t.Text = text
	t.Parent = g
	g.Parent = p
	return g
end
MapGen2.billboard = billboard
local function signBoard(H, parent, pos, yaw, text, color)
	H.part(parent, Vector3.new(0.6, 7, 0.6), CFrame.new(pos + Vector3.new(0, 3.5, 0)), rgb(80, 60, 40), Enum.Material.Wood, { name = "SignPost" })
	local b = H.part(parent, Vector3.new(7, 3.6, 0.4), CFrame.new(pos + Vector3.new(0, 6.6, 0)) * CFrame.Angles(0, yaw, 0), rgb(230, 190, 30), Enum.Material.SmoothPlastic, { name = "WarningSign" })
	for _, face in ipairs({ Enum.NormalId.Front, Enum.NormalId.Back }) do
		local g = Instance.new("SurfaceGui")
		g.Face = face
		g.CanvasSize = Vector2.new(280, 144)
		g.LightInfluence = 0.3
		local t = Instance.new("TextLabel")
		t.Size = UDim2.fromScale(1, 1)
		t.BackgroundTransparency = 1
		t.Font = Enum.Font.GothamBlack
		t.TextScaled = true
		t.TextColor3 = color or rgb(20, 10, 10)
		t.Text = text
		t.Parent = g
		g.Parent = b
	end
	return b
end
MapGen2.signBoard = signBoard

-- a palm tree for the islands
local function palm(H, parent, pos, rng)
	local m = Instance.new("Model"); m.Name = "Tree"; m.Parent = parent
	local h = rng:NextNumber(16, 26)
	local lean = rng:NextNumber(-0.25, 0.25)
	for i = 0, 3 do
		H.part(m, Vector3.new(1.6 - i * 0.2, h / 4 + 0.4, 1.6 - i * 0.2), CFrame.new(pos + Vector3.new(lean * i * 3, h / 8 + i * h / 4, 0)) * CFrame.Angles(0, 0, -lean * 0.8), rgb(120, 90, 60), Enum.Material.Wood)
	end
	local top = pos + Vector3.new(lean * 12, h, 0)
	for k = 0, 5 do
		H.part(m, Vector3.new(1.8, 0.3, 10), CFrame.new(top) * CFrame.Angles(0, k * math.pi / 3, 0) * CFrame.Angles(math.rad(-18), 0, 0) * CFrame.new(0, 0, -4.5), rgb(46, 110, 40), Enum.Material.Grass, { collide = false, name = "Leaves" })
	end
end

-- a drivable boat: anchored hull the server moves; the Seat named Helm reads the driver's MoveDirection
local function boat(H, parent, pos, yaw, big)
	local m = Instance.new("Model")
	m.Name = big and "Ship" or "Boat"
	local L, W = big and 44 or 16, big and 14 or 7
	local cf = CFrame.new(pos.X, 0, pos.Z) * CFrame.Angles(0, yaw, 0)
	local hullC = big and rgb(70, 40, 30) or rgb(220, 220, 225)
	local hull = H.part(m, Vector3.new(W, 3, L), cf * CFrame.new(0, 0.8, 0), hullC, big and Enum.Material.WoodPlanks or Enum.Material.SmoothPlastic, { name = "Hull" })
	local bow = Instance.new("WedgePart")
	bow.Anchored = true
	bow.Size = Vector3.new(W, 3, big and 10 or 5)
	bow.CFrame = cf * CFrame.new(0, 0.8, -L / 2 - bow.Size.Z / 2)
	bow.Color, bow.Material, bow.Name = hullC, hull.Material, "Bow"
	bow.Parent = m
	H.part(m, Vector3.new(W - 1, 0.3, L - 1), cf * CFrame.new(0, 2.4, 0), rgb(150, 110, 70), Enum.Material.WoodPlanks, { name = "Deck" })
	H.part(m, Vector3.new(W, 0.6, L), cf * CFrame.new(0, -0.6, 0), rgb(150, 30, 30), Enum.Material.SmoothPlastic, { name = "Stripe" })
	local seat = Instance.new("Seat")
	seat.Name = "Helm"
	seat.Anchored = true
	seat.Size = Vector3.new(2, 1, 2)
	seat.CFrame = cf * CFrame.new(0, 3.1, big and 8 or 3)
	seat.Color = rgb(40, 40, 44)
	seat.Parent = m
	if big then
		H.part(m, Vector3.new(W - 4, 8, 10), cf * CFrame.new(0, 6.5, 12), rgb(230, 230, 220), Enum.Material.WoodPlanks, { name = "Cabin" })
		H.part(m, Vector3.new(1, 30, 1), cf * CFrame.new(0, 17, -6), rgb(90, 70, 50), Enum.Material.Wood, { name = "Mast" })
		H.part(m, Vector3.new(0.3, 18, 14), cf * CFrame.new(0, 19, -6) * CFrame.Angles(0, math.rad(90), 0), rgb(230, 225, 210), Enum.Material.Fabric, { name = "Sail", collide = false })
		local lamp = H.part(m, Vector3.new(1, 1, 1), cf * CFrame.new(0, 11.5, 12), rgb(255, 210, 130), Enum.Material.Neon, { name = "FlickerLight", collide = false })
		light(lamp, 30, rgb(255, 200, 120))
		for i = -1, 1, 2 do
			local s2 = seat:Clone(); s2.Name = "Seat"; s2.CFrame = cf * CFrame.new(i * 3, 3.1, -4); s2.Parent = m
		end
	else
		H.part(m, Vector3.new(W - 1, 2, 0.3), cf * CFrame.new(0, 3.6, 1.6) * CFrame.Angles(math.rad(-25), 0, 0), rgb(160, 210, 240), Enum.Material.Glass, { name = "Windshield", transp = 0.4 })
		H.part(m, Vector3.new(1.6, 2.4, 1.6), cf * CFrame.new(0, 1.6, L / 2 + 0.8), rgb(30, 30, 34), Enum.Material.Metal, { name = "Motor" })
	end
	m.PrimaryPart = hull
	m:SetAttribute("Speed", big and 34 or 46)
	m:SetAttribute("Big", big or false)
	billboard(seat, "SIT TO DRIVE", rgb(120, 220, 255), 160).MaxDistance = 40
	m.Parent = parent
	return m
end
MapGen2.boat = boat

---------------------------------------------------------------------------
-- Stormy Ocean: open water, islands with huts, boats and ships, a storm past the safe radius
---------------------------------------------------------------------------
function MapGen2.ocean(themeName, rng, t, H)
	local O = Config.MAP_ORIGIN
	local S = Config.OCEAN_SIZE
	local half = S / 2
	local R = Config.STORM_RADIUS
	local map = Instance.new("Model")
	map.Name = "NightHuntMap"
	local terrain = workspace.Terrain
	pcall(function() terrain:SetMaterialColor(Enum.Material.Sand, t.ground) end)
	terrain.WaterColor = rgb(18, 46, 60)
	terrain.WaterWaveSize, terrain.WaterWaveSpeed, terrain.WaterTransparency = 0.6, 16, 0.6
	terrain:FillBlock(CFrame.new(O + Vector3.new(0, -46, 0)), Vector3.new(S + 40, 8, S + 40), Enum.Material.Sand)
	terrain:FillBlock(CFrame.new(O + Vector3.new(0, -21, 0)), Vector3.new(S + 40, 42, S + 40), Enum.Material.Water)
	for _, w in ipairs({
		{ Vector3.new(S + 20, 80, 2), Vector3.new(0, 20, -half - 10) }, { Vector3.new(S + 20, 80, 2), Vector3.new(0, 20, half + 10) },
		{ Vector3.new(2, 80, S + 20), Vector3.new(-half - 10, 20, 0) }, { Vector3.new(2, 80, S + 20), Vector3.new(half + 10, 20, 0) },
	}) do H.part(map, w[1], CFrame.new(O + w[2]), rgb(10, 10, 12), Enum.Material.Slate, { name = "Boundary", transp = 1 }) end

	local islands = {}
	local function island(c, r)
		terrain:FillCylinder(CFrame.new(c + Vector3.new(0, -19, 0)), 42, r, Enum.Material.Sand)
		terrain:FillCylinder(CFrame.new(c + Vector3.new(0, 2.5, 0)), 3, r * 0.72, Enum.Material.LeafyGrass)
		terrain:FillBall(c + Vector3.new(0, -r * 0.55, 0), r * 0.62, Enum.Material.Sand)
		table.insert(islands, { p = c, r = r })
	end
	island(O, 95)
	local n = 12
	for i = 1, n do
		for _try = 1, 30 do
			local a = (i / n) * math.pi * 2 + rng:NextNumber(-0.2, 0.2)
			local d = rng:NextNumber(200, R - 40)
			local r = rng:NextNumber(28, 62)
			local c = O + Vector3.new(math.cos(a) * d, 0, math.sin(a) * d)
			local ok = true
			for _, o in ipairs(islands) do if (o.p - c).Magnitude < o.r + r + 50 then ok = false; break end end
			if ok then island(c, r); break end
		end
	end
	-- two islands out in the storm (risky loot)
	for i = 1, 2 do
		local a = rng:NextNumber(0, math.pi * 2)
		island(O + Vector3.new(math.cos(a) * (R + 70), 0, math.sin(a) * (R + 70)), 34 + i * 4)
		islands[#islands].storm = true
	end

	local beds, tvs, loot, vents, hides = {}, {}, {}, {}, 0
	local occupied = {}
	local function free(pos, r)
		for _, o in ipairs(occupied) do if (Vector2.new(o.p.X, o.p.Z) - Vector2.new(pos.X, pos.Z)).Magnitude < r + o.r then return false end end
		return true
	end
	local function claim(pos, r) table.insert(occupied, { p = pos, r = r }) end
	local function onIsland(isl, margin)
		local a, d = rng:NextNumber(0, math.pi * 2), rng:NextNumber(0, math.max(1, isl.r * 0.7 - margin))
		return isl.p + Vector3.new(math.cos(a) * d, 4, math.sin(a) * d)
	end
	claim(O, 24)
	-- extraction on a far island (you'll need a boat or a long swim)
	local far = islands[2]
	for _, isl in ipairs(islands) do if not isl.storm and (isl.p - O).Magnitude > (far.p - O).Magnitude then far = isl end end
	local ex = far.p + Vector3.new(0, 4, 0)
	claim(ex, 22)
	H.part(map, Vector3.new(30, 0.4, 30), CFrame.new(ex + Vector3.new(0, 0.2, 0)), rgb(50, 50, 50), Enum.Material.Concrete, { name = "ExtractPad" })
	H.part(map, Vector3.new(16, 0.45, 2), CFrame.new(ex + Vector3.new(0, 0.25, 0)), rgb(240, 240, 240), Enum.Material.Neon)
	H.part(map, Vector3.new(2, 0.45, 16), CFrame.new(ex + Vector3.new(-7, 0.25, 0)), rgb(240, 240, 240), Enum.Material.Neon)
	H.part(map, Vector3.new(2, 0.45, 16), CFrame.new(ex + Vector3.new(7, 0.25, 0)), rgb(240, 240, 240), Enum.Material.Neon)

	local boats = {}
	for i, isl in ipairs(islands) do
		-- huts
		local huts = isl.r > 70 and 3 or (isl.r > 40 and 1 or 0)
		for _ = 1, huts do
			for _try = 1, 20 do
				local pos = onIsland(isl, 20)
				if free(pos, 20) then
					claim(pos, 19)
					local _, info = H.building(map, t, pos, rng:NextInteger(26, 30), rng:NextInteger(22, 26), rng, "house")
					for _, x in ipairs(info.beds) do table.insert(beds, x) end
					for _, x in ipairs(info.tvs) do table.insert(tvs, x) end
					for _, x in ipairs(info.loot) do table.insert(loot, x) end
					break
				end
			end
		end
		for _ = 1, math.floor(isl.r / 9) do
			local pos = onIsland(isl, 4)
			if free(pos, 4) then claim(pos, 3); palm(H, map, pos, rng) end
		end
		for k = 1, (isl.storm and 4 or 2) do
			local pos = onIsland(isl, 6)
			if free(pos, 3) then claim(pos, 3); table.insert(loot, { pos = pos, kind = (k % 2 == 0 or isl.storm) and "chest" or "bag" }) end
		end
		for _ = 1, 2 do
			local pos = onIsland(isl, 6)
			if free(pos, 5) then
				claim(pos, 4); hides += 1
				H.part(map, Vector3.new(9, 8, 9), CFrame.new(pos + Vector3.new(0, 2, 0)), rgb(40, 90, 36), Enum.Material.Grass, { shape = Enum.PartType.Ball, collide = false, name = "HideSpot" })
			end
		end
		-- a dock with a boat moored at it, and a water warning sign
		local a = rng:NextNumber(0, math.pi * 2)
		local dir = Vector3.new(math.cos(a), 0, math.sin(a))
		local edge = isl.p + dir * (isl.r - 4)
		H.part(map, Vector3.new(6, 0.6, 22), CFrame.lookAt(edge + dir * 8 + Vector3.new(0, 2.4, 0), edge + dir * 30 + Vector3.new(0, 2.4, 0)), rgb(120, 90, 60), Enum.Material.WoodPlanks, { name = "Dock" })
		table.insert(vents, edge + Vector3.new(0, 6, 0))
		local side = Vector3.new(-dir.Z, 0, dir.X)
		table.insert(boats, boat(H, map, edge + dir * 16 + side * 9, math.atan2(-dir.X, -dir.Z), i % 4 == 0 and not isl.storm))
		signBoard(H, map, edge - dir * 2 + Vector3.new(0, 2, 0), math.atan2(-dir.X, -dir.Z), isl.storm and "STORM ZONE!\nDO NOT GO OUT" or "DANGER\nDEEP WATER\nSEA MONSTERS")
		-- a lamp post per island
		local lp = onIsland(isl, 8)
		H.part(map, Vector3.new(0.8, 14, 0.8), CFrame.new(lp + Vector3.new(0, 3, 0)), rgb(40, 40, 40), Enum.Material.Metal)
		light(H.part(map, Vector3.new(1.6, 1, 1.6), CFrame.new(lp + Vector3.new(0, 10.4, 0)), t.lamp, Enum.Material.Neon, { collide = false, name = "FlickerLight" }), 30, t.lamp)
	end
	-- extra boats drifting near the main island + two big ships
	for i = 1, 6 do
		local a = (i / 6) * math.pi * 2
		table.insert(boats, boat(H, map, O + Vector3.new(math.cos(a) * 118, 0, math.sin(a) * 118), a, false))
	end
	for i = 1, 2 do
		local a = rng:NextNumber(0, math.pi * 2)
		table.insert(boats, boat(H, map, O + Vector3.new(math.cos(a) * 160, 0, math.sin(a) * 160), a + math.pi / 2, true))
	end
	-- storm wall: buoys with warning lights on the safe radius, dark rain curtain beyond
	for i = 0, 35 do
		local a = i / 36 * math.pi * 2
		local p = O + Vector3.new(math.cos(a) * R, 0, math.sin(a) * R)
		H.part(map, Vector3.new(3, 4, 3), CFrame.new(p + Vector3.new(0, 0.5, 0)), rgb(220, 60, 30), Enum.Material.SmoothPlastic, { shape = Enum.PartType.Ball, name = "Buoy" })
		local bl = H.part(map, Vector3.new(1, 1, 1), CFrame.new(p + Vector3.new(0, 3, 0)), rgb(255, 40, 30), Enum.Material.Neon, { collide = false, name = "BuoyLight" })
		light(bl, 24, rgb(255, 40, 30), 2)
		if i % 3 == 0 then billboard(bl, "⚠ STORM AHEAD - TURN BACK ⚠", rgb(255, 80, 60), 300) end
		local q = O + Vector3.new(math.cos(a) * (R + 60), 0, math.sin(a) * (R + 60))
		H.part(map, Vector3.new(2 * math.pi * (R + 60) / 36 + 2, 260, 4), CFrame.lookAt(q + Vector3.new(0, 120, 0), O + Vector3.new(0, 120, 0)), rgb(30, 34, 44), Enum.Material.ForceField, { collide = false, transp = 0.55, name = "StormWall" })
	end

	local spawns, monsterSpawns = {}, {}
	for i = 1, 15 do
		local a = (i / 15) * math.pi * 2
		table.insert(spawns, O + Vector3.new(math.cos(a) * 14, 6, math.sin(a) * 14))
	end
	for i = 1, 5 do
		local a = rng:NextNumber(0, math.pi * 2)
		table.insert(monsterSpawns, O + Vector3.new(math.cos(a) * 300, 2, math.sin(a) * 300))
	end
	local landSpawns = {}
	for _, isl in ipairs(islands) do if not isl.storm and isl.p ~= O then table.insert(landSpawns, isl.p + Vector3.new(0, 7, 0)) end end
	return {
		beds = beds, tvs = tvs, loot = loot, model = map, spawns = spawns, monsterSpawns = monsterSpawns, landSpawns = landSpawns,
		vents = vents, extract = ex, theme = themeName, half = half, fog = t.fog, fogColor = t.fogColor,
		ocean = true, islands = islands, boats = boats, storm = R, size = S,
	}
end

---------------------------------------------------------------------------
-- per-theme extras on the regular (land) generator
---------------------------------------------------------------------------
local function twoStorey(H, map, t, pos, w, d, rng, lights)
	local b, info = H.building(map, t, pos, w, d, rng, "house")
	local h = 12
	for _, p in ipairs(b:GetChildren()) do
		if p.Name == "Roof" then p.CFrame = p.CFrame + Vector3.new(0, h, 0) end
	end
	local wallC = t.wall:Lerp(rgb(rng:NextInteger(90, 200), rng:NextInteger(80, 170), rng:NextInteger(70, 150)), 0.5)
	local sides = {
		{ len = w, cf = CFrame.new(pos + Vector3.new(0, h + h / 2, -d / 2)), axis = "x" },
		{ len = w, cf = CFrame.new(pos + Vector3.new(0, h + h / 2, d / 2)), axis = "x" },
		{ len = d, cf = CFrame.new(pos + Vector3.new(-w / 2, h + h / 2, 0)), axis = "z" },
		{ len = d, cf = CFrame.new(pos + Vector3.new(w / 2, h + h / 2, 0)), axis = "z" },
	}
	for i, sd in ipairs(sides) do H.wallSide(b, sd, h, 1, wallC, t.wallMat, i == 4 and 5 or nil) end
	H.part(b, Vector3.new(w, 0.4, d), CFrame.new(pos + Vector3.new(0, 2 * h, 0)), rgb(200, 190, 170), Enum.Material.Plaster, { name = "Ceiling" })
	-- outside stairs up the east wall to the upstairs door
	local st = Instance.new("WedgePart")
	st.Anchored = true
	st.Size = Vector3.new(5, h, 18)
	st.CFrame = CFrame.new(pos + Vector3.new(w / 2 + 2.6, h / 2, -13)) -- tall end (+Z) meets the landing
	st.Color, st.Material, st.Name = rgb(90, 70, 50), Enum.Material.WoodPlanks, "Stairs"
	st.Parent = b
	H.part(b, Vector3.new(5, 0.6, 8), CFrame.new(pos + Vector3.new(w / 2 + 2.6, h - 0.3, 0)), rgb(90, 70, 50), Enum.Material.WoodPlanks, { name = "Landing" })
	-- upstairs bedroom + varied window lighting (warm, cold TV-blue, flickering red, dark)
	local palette = { rgb(255, 190, 110), rgb(140, 180, 255), rgb(255, 60, 50), rgb(120, 255, 160), rgb(255, 230, 200) }
	for f = 0, 1 do
		for _, sd in ipairs({ { 0, -d / 2 - 0.6, "x" }, { 0, d / 2 + 0.6, "x" }, { -w / 2 - 0.6, 0, "z" } }) do
			for k = -1, 1, 2 do
				local col = palette[rng:NextInteger(1, #palette)]
				local dark = rng:NextNumber() < 0.3
				local off = sd[3] == "x" and Vector3.new(k * w / 4, 0, 0) or Vector3.new(0, 0, k * d / 4)
				local wp = H.part(b, sd[3] == "x" and Vector3.new(4, 4, 0.3) or Vector3.new(0.3, 4, 4), CFrame.new(pos + Vector3.new(sd[1], f * h + 6.5, sd[2]) + off),
					dark and rgb(20, 22, 26) or col, dark and Enum.Material.Glass or Enum.Material.Neon, { collide = false, name = dark and "Window" or "WindowLight" })
				if not dark then
					wp.Transparency = 0.25
					light(wp, 16, col, 0.9)
					if rng:NextNumber() < 0.35 then wp:SetAttribute("Flicker", true); wp.Name = "FlickerLight" end
					table.insert(lights, wp)
				end
			end
		end
	end
	local bedPos = pos + Vector3.new(-w / 4, h, 0)
	local mattress = H.part(b, Vector3.new(4.6, 0.8, 7.6), CFrame.new(bedPos + Vector3.new(0, 2.4, 0)), rgb(200, 195, 210), Enum.Material.Fabric, { name = "Bed" })
	H.part(b, Vector3.new(5, 1.6, 8), CFrame.new(bedPos + Vector3.new(0, 1.2, 0)), rgb(90, 60, 40), Enum.Material.Wood, { name = "Furniture" })
	table.insert(info.beds, mattress)
	table.insert(info.loot, { pos = pos + Vector3.new(w / 4, h + 0.4, 0), kind = "chest" })
	return b, info
end

function MapGen2.extras(name, C)
	local t, H, map, rng, O, half = C.t, C.H, C.map, C.rng, C.O, C.half
	local function add(info)
		for _, x in ipairs(info.beds) do table.insert(C.beds, x) end
		for _, x in ipairs(info.tvs) do table.insert(C.tvs, x) end
		for _, x in ipairs(info.loot) do table.insert(C.loot, x) end
	end
	local out = { pools = {}, lights = {} }
	if t.jungle then -- murky pools the Spinosaurus hides in; mangrove roots and reeds
		for _ = 1, 22 do
			for _try = 1, 10 do
				local pos = C.randPos(30)
				local r = rng:NextNumber(12, 26)
				if C.free(pos, r + 4) then
					C.claim(pos, r + 2)
					workspace.Terrain:FillCylinder(CFrame.new(pos + Vector3.new(0, -3, 0)), 6, r, Enum.Material.Water)
					workspace.Terrain:FillCylinder(CFrame.new(pos + Vector3.new(0, -7, 0)), 2, r + 1, Enum.Material.Mud)
					table.insert(out.pools, { p = pos, r = r })
					for k = 1, 6 do
						local a = k / 6 * math.pi * 2
						H.part(map, Vector3.new(0.4, 6, 0.4), CFrame.new(pos + Vector3.new(math.cos(a) * (r + 1), 2, math.sin(a) * (r + 1))) * CFrame.Angles(0.2, a, 0.15), rgb(90, 110, 50), Enum.Material.Grass, { collide = false, name = "Reed" })
					end
					if rng:NextNumber() < 0.5 then signBoard(H, map, pos + Vector3.new(r + 3, 0, 0), math.pi / 2, "KEEP OUT\nOF THE WATER") end
					break
				end
			end
		end
	end
	if t.snow then -- snow caps on everything, rocks, a huge peak, frozen lake, ski lodge
		pcall(function() workspace.Terrain:SetMaterialColor(Enum.Material.Snow, t.ground) end)
		local peak = O + Vector3.new(rng:NextNumber(-150, 150), 0, rng:NextNumber(-250, -150))
		C.claim(peak, 110)
		workspace.Terrain:FillBall(peak + Vector3.new(0, -40, 0), 120, Enum.Material.Snow)
		workspace.Terrain:FillBall(peak + Vector3.new(30, 10, 20), 50, Enum.Material.Rock)
		local lake = C.randPos(80)
		if C.free(lake, 60) then
			C.claim(lake, 55)
			workspace.Terrain:FillCylinder(CFrame.new(lake + Vector3.new(0, -0.4, 0)), 1.2, 50, Enum.Material.Glacier)
		end
		for _ = 1, 40 do
			local pos = C.randPos(10)
			if C.free(pos, 6) then C.claim(pos, 5); workspace.Terrain:FillBall(pos, rng:NextNumber(3, 7), Enum.Material.Rock) end
		end
		for _, d in ipairs(map:GetDescendants()) do
			if d:IsA("BasePart") and d.Name == "Leaves" then d.Color = d.Color:Lerp(rgb(235, 240, 245), 0.55); d.Material = Enum.Material.Snow end
			if d:IsA("BasePart") and d.Name == "Roof" then d.Color = rgb(235, 240, 245); d.Material = Enum.Material.Snow end
		end
	end
	if t.farm then -- barn, silos, corn mazes (hide in the corn), scarecrows, fences, a tractor
		for i = 1, 3 do
			for _try = 1, 25 do
				local pos = C.randPos(50)
				if C.free(pos, 40) then
					C.claim(pos, 38)
					local b, info = H.building(map, t, pos, 56, 40, rng, "warehouse")
					b.Name = "Barn"
					for _, p in ipairs(b:GetChildren()) do
						if p.Name == "Wall" then p.Color = rgb(150, 36, 30); p.Material = Enum.Material.WoodPlanks end
						if p.Name == "Roof" then p.Color = rgb(70, 60, 56) end
					end
					add(info)
					for k = 0, 1 do
						local sp = pos + Vector3.new(34 + k * 13, 0, -10)
						H.part(map, Vector3.new(36, 12, 12), CFrame.new(sp + Vector3.new(0, 18, 0)) * CFrame.Angles(0, 0, math.rad(90)), rgb(170, 175, 180), Enum.Material.CorrodedMetal, { shape = Enum.PartType.Cylinder, name = "Silo" })
						H.part(map, Vector3.new(12, 12, 12), CFrame.new(sp + Vector3.new(0, 36, 0)), rgb(150, 155, 160), Enum.Material.Metal, { shape = Enum.PartType.Ball, name = "Silo" })
					end
					_ = i
					break
				end
			end
		end
		for _ = 1, 16 do
			for _try = 1, 12 do
				local pos = C.randPos(30)
				if C.free(pos, 22) then
					C.claim(pos, 20)
					local field = Instance.new("Model"); field.Name = "CornField"; field.Parent = map
					for x = -3, 3 do
						for z = -3, 3 do
							if (x + z) % 2 == 0 then
								H.part(field, Vector3.new(0.5, rng:NextNumber(8, 10), 0.5), CFrame.new(pos + Vector3.new(x * 5 + rng:NextNumber(-1, 1), 4.5, z * 5)), rgb(170, 160, 70), Enum.Material.Grass, { collide = false, name = "Corn" })
							end
						end
					end
					H.part(field, Vector3.new(34, 8, 34), CFrame.new(pos + Vector3.new(0, 4, 0)), rgb(120, 130, 50), Enum.Material.Grass, { collide = false, transp = 0.55, name = "HideSpot" })
					local sc = pos + Vector3.new(0, 0, 0)
					H.part(field, Vector3.new(0.5, 9, 0.5), CFrame.new(sc + Vector3.new(0, 4.5, 0)), rgb(100, 70, 40), Enum.Material.Wood)
					H.part(field, Vector3.new(6, 0.5, 0.5), CFrame.new(sc + Vector3.new(0, 7, 0)), rgb(100, 70, 40), Enum.Material.Wood)
					H.part(field, Vector3.new(2, 2, 2), CFrame.new(sc + Vector3.new(0, 9.2, 0)), rgb(200, 160, 90), Enum.Material.Fabric, { shape = Enum.PartType.Ball, name = "Scarecrow" })
					break
				end
			end
		end
		for _ = 1, 14 do -- fence runs
			local pos = C.randPos(20)
			local yaw = rng:NextNumber(0, math.pi)
			if C.free(pos, 14) then
				for k = -3, 3 do
					local p = pos + Vector3.new(math.cos(yaw) * k * 4, 0, math.sin(yaw) * k * 4)
					H.part(map, Vector3.new(0.4, 4, 0.4), CFrame.new(p + Vector3.new(0, 2, 0)), rgb(110, 80, 50), Enum.Material.Wood)
				end
				H.part(map, Vector3.new(24, 0.4, 0.3), CFrame.new(pos + Vector3.new(0, 3, 0)) * CFrame.Angles(0, -yaw, 0), rgb(110, 80, 50), Enum.Material.Wood)
				H.part(map, Vector3.new(24, 0.4, 0.3), CFrame.new(pos + Vector3.new(0, 1.8, 0)) * CFrame.Angles(0, -yaw, 0), rgb(110, 80, 50), Enum.Material.Wood)
			end
		end
	end
	if t.castle then -- curtain wall with towers and a gate around a keep; graveyard outside
		local c = O + Vector3.new(0, 0, -220)
		local Wd = 170
		C.claim(c, Wd * 0.75)
		local stone = rgb(88, 86, 90)
		for i, sd in ipairs({
			{ len = Wd, cf = CFrame.new(c + Vector3.new(0, 14, -Wd / 2)), axis = "x" }, { len = Wd, cf = CFrame.new(c + Vector3.new(0, 14, Wd / 2)), axis = "x" },
			{ len = Wd, cf = CFrame.new(c + Vector3.new(-Wd / 2, 14, 0)), axis = "z" }, { len = Wd, cf = CFrame.new(c + Vector3.new(Wd / 2, 14, 0)), axis = "z" },
		}) do
			H.wallSide(map, sd, 28, 4, stone, Enum.Material.Cobblestone, i == 2 and 16 or nil)
			for k = -2, 2 do -- crenellations
				local off = sd.axis == "x" and Vector3.new(k * Wd / 5, 15.5, 0) or Vector3.new(0, 15.5, k * Wd / 5)
				H.part(map, Vector3.new(5, 3, 5), sd.cf + off, stone, Enum.Material.Cobblestone, { name = "Merlon" })
			end
		end
		for _, q in ipairs({ { -1, -1 }, { 1, -1 }, { 1, 1 }, { -1, 1 } }) do
			local tp = c + Vector3.new(q[1] * Wd / 2, 0, q[2] * Wd / 2)
			H.part(map, Vector3.new(40, 18, 18), CFrame.new(tp + Vector3.new(0, 20, 0)) * CFrame.Angles(0, 0, math.rad(90)), stone, Enum.Material.Cobblestone, { shape = Enum.PartType.Cylinder, name = "Tower" })
			local roof = Instance.new("Part")
			roof.Anchored, roof.Size, roof.Color, roof.Material, roof.Name = true, Vector3.new(20, 20, 20), rgb(60, 30, 40), Enum.Material.Slate, "Roof"
			roof.Shape = Enum.PartType.Ball
			roof.CFrame = CFrame.new(tp + Vector3.new(0, 42, 0))
			roof.Parent = map
			local win = H.part(map, Vector3.new(2, 4, 19), CFrame.new(tp + Vector3.new(0, 30, 0)), rgb(255, 60, 40), Enum.Material.Neon, { collide = false, name = "FlickerLight" })
			light(win, 40, rgb(255, 60, 40), 1.5)
			table.insert(out.lights, win)
		end
		local keep, info = H.building(map, t, c, 60, 50, rng, "warehouse")
		keep.Name = "Keep"
		for _, p in ipairs(keep:GetChildren()) do if p.Name == "Wall" then p.Color = stone; p.Material = Enum.Material.Cobblestone end end
		add(info)
		-- coffin in the keep (vampire's bed) + candles
		H.part(map, Vector3.new(4, 2.4, 8), CFrame.new(c + Vector3.new(-10, 1.4, 0)), rgb(30, 14, 14), Enum.Material.Wood, { name = "Coffin" })
		for k = 1, 6 do
			local cp = c + Vector3.new(math.cos(k) * 18, 0, math.sin(k) * 14)
			H.part(map, Vector3.new(0.6, 3, 0.6), CFrame.new(cp + Vector3.new(0, 1.5, 0)), rgb(230, 220, 200), Enum.Material.SmoothPlastic)
			light(H.part(map, Vector3.new(0.4, 0.6, 0.4), CFrame.new(cp + Vector3.new(0, 3.3, 0)), rgb(255, 170, 60), Enum.Material.Neon, { collide = false, name = "FlickerLight" }), 12, rgb(255, 160, 60))
		end
		local g = O + Vector3.new(rng:NextNumber(-200, 200), 0, rng:NextNumber(80, 250))
		C.claim(g, 40)
		for x = -4, 4 do
			for z = -3, 3 do
				if rng:NextNumber() < 0.7 then
					H.part(map, Vector3.new(3, rng:NextNumber(3, 5), 0.8), CFrame.new(g + Vector3.new(x * 8, 2, z * 9)) * CFrame.Angles(rng:NextNumber(-0.15, 0.15), 0, rng:NextNumber(-0.1, 0.1)), rgb(110, 110, 115), Enum.Material.Granite, { name = "Tombstone" })
				end
			end
		end
	end
	if t.fester then -- residential grid: streets, sidewalks, two-storey houses, mismatched street lights
		local block = 150
		for k = -3, 3 do
			H.part(map, Vector3.new(C.S, 0.2, 22), CFrame.new(O + Vector3.new(0, 0.1, k * block)), rgb(32, 32, 34), Enum.Material.Asphalt, { name = "Street" })
			H.part(map, Vector3.new(22, 0.22, C.S), CFrame.new(O + Vector3.new(k * block, 0.11, 0)), rgb(32, 32, 34), Enum.Material.Asphalt, { name = "Street" })
			for x = -half, half, 22 do
				H.part(map, Vector3.new(8, 0.25, 0.6), CFrame.new(O + Vector3.new(x, 0.15, k * block)), rgb(230, 200, 60), Enum.Material.Neon, { collide = false, name = "Stripe" })
			end
		end
		local lampCols = { rgb(255, 190, 110), rgb(200, 220, 255), rgb(255, 120, 60), rgb(160, 255, 200) }
		for bx = -3, 2 do
			for bz = -3, 2 do
				local cc = O + Vector3.new((bx + 0.5) * block, 0, (bz + 0.5) * block)
				if (cc - O).Magnitude > 40 then
					for _, q in ipairs({ { -1, -1 }, { 1, -1 }, { -1, 1 }, { 1, 1 } }) do
						local pos = cc + Vector3.new(q[1] * 34, 0, q[2] * 34)
						if C.free(pos, 22) and rng:NextNumber() < 0.8 then
							C.claim(pos, 22)
							local _, info = twoStorey(H, map, t, pos, rng:NextInteger(28, 34), rng:NextInteger(26, 30), rng, out.lights)
							add(info)
						end
					end
				end
				local lp = cc + Vector3.new(-block / 2 + 14, 0, -block / 2 + 14)
				local col = lampCols[rng:NextInteger(1, #lampCols)]
				H.part(map, Vector3.new(0.8, 16, 0.8), CFrame.new(lp + Vector3.new(0, 8, 0)), rgb(40, 40, 40), Enum.Material.Metal)
				local bulb = H.part(map, Vector3.new(1.6, 1, 1.6), CFrame.new(lp + Vector3.new(0, 16.4, 0)), col, Enum.Material.Neon, { collide = false, name = "FlickerLight" })
				light(bulb, 34, col, 1.4)
				table.insert(out.lights, bulb)
			end
		end
	end
	return out
end

---------------------------------------------------------------------------
-- Lobby store: a building players walk into. Item counter, dressing room (mirror), skins gallery.
---------------------------------------------------------------------------
function MapGen2.store(parent, H, templates)
	local O = Config.STORE_ORIGIN
	local W, D, h = 70, 96, 16
	local m = Instance.new("Model"); m.Name = "Store"; m.Parent = parent
	H.part(m, Vector3.new(W + 30, 2, D + 10), CFrame.new(O + Vector3.new(0, -1, 0)), rgb(40, 44, 48), Enum.Material.Concrete, { name = "StoreLot" })
	H.part(m, Vector3.new(W, 0.3, D), CFrame.new(O + Vector3.new(0, 0.15, 0)), rgb(210, 200, 180), Enum.Material.Marble, { name = "Floor" })
	H.part(m, Vector3.new(W + 2, 1, D + 2), CFrame.new(O + Vector3.new(0, h + 0.5, 0)), rgb(50, 40, 40), Enum.Material.Slate, { name = "Roof" })
	local wc, wm = rgb(120, 34, 34), Enum.Material.Brick
	H.wallSide(m, { len = D, cf = CFrame.new(O + Vector3.new(-W / 2, h / 2, 0)), axis = "z" }, h, 1, wc, wm, 12) -- door faces the helipad
	H.wallSide(m, { len = D, cf = CFrame.new(O + Vector3.new(W / 2, h / 2, 0)), axis = "z" }, h, 1, wc, wm, nil)
	H.wallSide(m, { len = W, cf = CFrame.new(O + Vector3.new(0, h / 2, -D / 2)), axis = "x" }, h, 1, wc, wm, nil)
	H.wallSide(m, { len = W, cf = CFrame.new(O + Vector3.new(0, h / 2, D / 2)), axis = "x" }, h, 1, wc, wm, nil)
	-- interior: a corridor along the door wall, three sections separated by half walls
	for _, z in ipairs({ -D / 6, D / 6 }) do
		H.part(m, Vector3.new(W - 20, h, 0.6), CFrame.new(O + Vector3.new(10, h / 2, z)), rgb(200, 190, 170), Enum.Material.Plaster, { name = "Divider" })
	end
	local sign = H.part(m, Vector3.new(1, 6, 40), CFrame.new(O + Vector3.new(-W / 2 - 0.8, h + 4, 0)), rgb(20, 10, 10), Enum.Material.Slate, { name = "StoreSign" })
	local g = Instance.new("SurfaceGui"); g.Face = Enum.NormalId.Left; g.CanvasSize = Vector2.new(800, 120); g.LightInfluence = 0; g.Parent = sign
	local tl = Instance.new("TextLabel"); tl.Size = UDim2.fromScale(1, 1); tl.BackgroundTransparency = 1; tl.Font = Enum.Font.Creepster; tl.TextScaled = true
	tl.TextColor3 = rgb(255, 200, 60); tl.Text = "NIGHT HUNT STORE"; tl.Parent = g
	for _, z in ipairs({ -D / 3, 0, D / 3 }) do
		light(H.part(m, Vector3.new(4, 0.4, 4), CFrame.new(O + Vector3.new(4, h - 0.4, z)), rgb(255, 240, 210), Enum.Material.Neon, { collide = false, name = "StoreLight" }), 40, rgb(255, 235, 200), 1.6)
	end
	local zones = {}
	local function zone(tab, title, z)
		local c = O + Vector3.new(10, 0, z)
		local zp = H.part(m, Vector3.new(W - 20, h, D / 3 - 2), CFrame.new(c + Vector3.new(0, h / 2, 0)), rgb(255, 255, 255), Enum.Material.SmoothPlastic, { collide = false, transp = 1, name = "StoreZone" })
		zp.CanQuery, zp.CanTouch = false, false
		zp:SetAttribute("Tab", tab)
		local banner = H.part(m, Vector3.new(0.4, 3, 18), CFrame.new(O + Vector3.new(-W / 2 + 20, h - 3, z)), rgb(30, 24, 20), Enum.Material.Wood, { name = "Banner" })
		local bg = Instance.new("SurfaceGui"); bg.Face = Enum.NormalId.Left; bg.CanvasSize = Vector2.new(360, 60); bg.LightInfluence = 0; bg.Parent = banner
		local bt = tl:Clone(); bt.Text = title; bt.Font = Enum.Font.GothamBlack; bt.TextColor3 = rgb(255, 220, 120); bt.Parent = bg
		table.insert(zones, zp)
		return c
	end
	-- item counter (hats, accessories, round supplies)
	local c1 = zone("shop", "ITEM COUNTER", -D / 3)
	H.part(m, Vector3.new(4, 4, 24), CFrame.new(c1 + Vector3.new(14, 2, 0)), rgb(110, 70, 40), Enum.Material.Wood, { name = "Counter" })
	H.part(m, Vector3.new(4.2, 0.3, 24.2), CFrame.new(c1 + Vector3.new(14, 4.1, 0)), rgb(30, 30, 30), Enum.Material.Granite, { name = "CounterTop" })
	H.part(m, Vector3.new(1.4, 1.2, 1.2), CFrame.new(c1 + Vector3.new(14, 4.9, -8)), rgb(40, 40, 44), Enum.Material.Metal, { name = "Register" })
	for k = -1, 1 do
		H.part(m, Vector3.new(3, 10, 8), CFrame.new(c1 + Vector3.new(23, 5, k * 9)), rgb(90, 60, 40), Enum.Material.Wood, { name = "Shelf" })
		for y = 1, 3 do
			H.part(m, Vector3.new(1, 1, 1.2), CFrame.new(c1 + Vector3.new(21.4, y * 3, k * 9 + (y - 2) * 2)), Color3.fromHSV((k + y * 0.3) % 1, 0.7, 0.9), Enum.Material.SmoothPlastic, { name = "Goods" })
		end
	end
	local p1 = H.part(m, Vector3.new(3, 4, 6), CFrame.new(c1 + Vector3.new(10, 2, 0)), rgb(255, 255, 255), Enum.Material.SmoothPlastic, { transp = 1, collide = false, name = "PromptAnchor" })
	-- dressing room with a big mirror and curtained booths
	local c2 = zone("look", "DRESSING ROOM", 0)
	local mirror = H.part(m, Vector3.new(0.4, 12, 18), CFrame.new(c2 + Vector3.new(24.5, 6.5, 0)), rgb(200, 220, 230), Enum.Material.Glass, { name = "Mirror" })
	mirror.Reflectance = 0.9
	H.part(m, Vector3.new(0.8, 13, 19), CFrame.new(c2 + Vector3.new(24.9, 6.5, 0)), rgb(200, 160, 60), Enum.Material.Metal, { name = "MirrorFrame" })
	for k = -1, 1, 2 do
		H.part(m, Vector3.new(8, 9, 0.3), CFrame.new(c2 + Vector3.new(0, 4.5, k * 12)), rgb(140, 30, 60), Enum.Material.Fabric, { name = "Curtain", collide = false })
	end
	H.part(m, Vector3.new(3, 1.6, 6), CFrame.new(c2 + Vector3.new(16, 0.8, 0)), rgb(60, 40, 30), Enum.Material.Fabric, { name = "Bench" })
	local p2 = H.part(m, Vector3.new(3, 4, 6), CFrame.new(c2 + Vector3.new(14, 2, 0)), rgb(255, 255, 255), Enum.Material.SmoothPlastic, { transp = 1, collide = false, name = "PromptAnchor" })
	-- skins gallery: monster statues on pedestals
	local c3 = zone("skins", "SKINS GALLERY", D / 3)
	local shown = { "megalodon", "kraken", "dragon", "trex", "vampire", "yeti" }
	for i, k in ipairs(shown) do
		local px = c3 + Vector3.new(-12 + ((i - 1) % 3) * 16, 0, (i <= 3) and -8 or 8)
		H.part(m, Vector3.new(6, 2, 6), CFrame.new(px + Vector3.new(0, 1, 0)), rgb(30, 30, 34), Enum.Material.Marble, { name = "Pedestal" })
		local tpl = templates and templates:FindFirstChild(k)
		if tpl then
			local st = tpl:Clone()
			for _, d in ipairs(st:GetDescendants()) do
				if d:IsA("BasePart") then d.Anchored = true; d.CanCollide = false end
				if d:IsA("Script") or d:IsA("LocalScript") then d:Destroy() end
			end
			local ok = pcall(function() st:ScaleTo(0.32) end)
			_ = ok
			local _, size = st:GetBoundingBox()
			st:PivotTo(CFrame.new(px + Vector3.new(0, 2 + size.Y / 2 + 0.2, 0)) * CFrame.Angles(0, math.rad(-90), 0))
			st.Name = "Statue_" .. k
			st.Parent = m
		end
	end
	local p3 = H.part(m, Vector3.new(3, 4, 6), CFrame.new(c3 + Vector3.new(-20, 2, 0)), rgb(255, 255, 255), Enum.Material.SmoothPlastic, { transp = 1, collide = false, name = "PromptAnchor" })
	local prompts = {}
	for i, a in ipairs({ { p1, "shop", "Browse items" }, { p2, "look", "Try on outfits" }, { p3, "skins", "Browse skins" } }) do
		local pp = Instance.new("ProximityPrompt")
		pp.ActionText = a[3]
		pp.ObjectText = ({ "Item Counter", "Dressing Room", "Skins Gallery" })[i]
		pp.KeyboardKeyCode = Enum.KeyCode.E
		pp.MaxActivationDistance = 16
		pp.RequiresLineOfSight = false
		pp:SetAttribute("Tab", a[2])
		pp.Parent = a[1]
		table.insert(prompts, pp)
	end
	return m, zones, prompts
end

return MapGen2
