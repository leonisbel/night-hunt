-- Generates one of three themed hunt maps out of anchored parts.
local Config = require(game:GetService("ReplicatedStorage"):WaitForChild("NightHunt"):WaitForChild("Config"))

local MapGen = {}
local MapGen2 = require(script.Parent:WaitForChild("MapGen2"))

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
	["Powerline Forest"] = {
		ground = Color3.fromRGB(34, 48, 28), groundMat = Enum.Material.Grass, terrain = Enum.Material.LeafyGrass, patch = Enum.Material.Mud,
		wall = Color3.fromRGB(96, 78, 60), wallMat = Enum.Material.WoodPlanks,
		floor = Color3.fromRGB(70, 52, 36), floorMat = Enum.Material.Wood,
		buildings = 6, trees = 170, hides = 30, fog = 70, pines = true, powerlines = true, hills = 22,
		lamp = Color3.fromRGB(255, 170, 90), fogColor = Color3.fromRGB(24, 30, 30),
	},
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
for k, v in pairs(MapGen2.THEMES) do THEME[k] = v end
MapGen.THEME = THEME

-- Every building is either a HOUSE (enterable rooms with furniture, a bed to sleep in, a TV) or a
-- FACILITY (warehouse / lab / industrial). Returns the model plus beds, TVs and loot spots inside.
local function wallSide(b, s, h, wallT, color, mat, doorW)
	local function seg(len, offset)
		if len <= 0.1 then return end
		local size = s.axis == "x" and Vector3.new(len, h, wallT) or Vector3.new(wallT, h, len)
		local shift = s.axis == "x" and Vector3.new(offset, 0, 0) or Vector3.new(0, 0, offset)
		part(b, size, s.cf + shift, color, mat, { name = "Wall" })
	end
	if doorW then
		local half = (s.len - doorW) / 2
		seg(half, -(doorW / 2 + half / 2))
		seg(half, doorW / 2 + half / 2)
		local lintel = s.axis == "x" and Vector3.new(doorW, h - 8, wallT) or Vector3.new(wallT, h - 8, doorW)
		part(b, lintel, s.cf + Vector3.new(0, 4, 0), color, mat, { name = "Wall" })
	else
		seg(s.len, 0)
	end
end

-- the Locust's "friendly" broadcast: old floral wallpaper, a tall black figure with a pale stretched face
function MapGen.locustScreen(screenPart, face)
	local g = Instance.new("SurfaceGui")
	g.Face = face or Enum.NormalId.Front
	g.CanvasSize = Vector2.new(320, 200)
	g.LightInfluence = 0
	g.Brightness = 1.6
	g.Name = "LocustScreen"
	g.Parent = screenPart
	local bg = Instance.new("Frame")
	bg.Size = UDim2.fromScale(1, 1)
	bg.BackgroundColor3 = Color3.fromRGB(120, 100, 60)
	bg.BorderSizePixel = 0
	bg.Parent = g
	for i = 0, 9 do -- faded vertical wallpaper stripes with little flowers
		local st = Instance.new("Frame")
		st.Size = UDim2.new(0, 14, 1, 0)
		st.Position = UDim2.fromOffset(i * 34 + 6, 0)
		st.BackgroundColor3 = Color3.fromRGB(150, 128, 80)
		st.BorderSizePixel = 0
		st.Parent = bg
		for j = 0, 4 do
			local fl = Instance.new("Frame")
			fl.Size = UDim2.fromOffset(8, 8)
			fl.Position = UDim2.fromOffset(i * 34 + 23, j * 44 + (i % 2) * 20)
			fl.BackgroundColor3 = Color3.fromRGB(150, 70, 60)
			fl.BorderSizePixel = 0
			Instance.new("UICorner", fl).CornerRadius = UDim.new(1, 0)
			fl.Parent = bg
		end
	end
	local function blob(x, y, w, h, c, r)
		local f = Instance.new("Frame")
		f.Size = UDim2.fromOffset(w, h)
		f.Position = UDim2.fromOffset(x - w / 2, y - h / 2)
		f.BackgroundColor3 = c
		f.BorderSizePixel = 0
		Instance.new("UICorner", f).CornerRadius = UDim.new(r or 0.5, 0)
		f.Parent = bg
		return f
	end
	blob(160, 170, 70, 140, Color3.fromRGB(8, 8, 10), 0.3)   -- body
	blob(160, 66, 52, 78, Color3.fromRGB(8, 8, 10))          -- head
	blob(161, 66, 38, 62, Color3.fromRGB(150, 145, 140))     -- pale face
	blob(152, 58, 9, 15, Color3.new(0, 0, 0))                -- hollow eyes
	blob(170, 57, 10, 17, Color3.new(0, 0, 0))
	blob(162, 84, 9, 10, Color3.new(0, 0, 0))                -- open mouth
	for k = 0, 2 do blob(160, 50 + k * 18, 62, 5, Color3.fromRGB(34, 35, 40), 1) end -- tubes around the head
	local t = Instance.new("TextLabel")
	t.BackgroundTransparency = 1
	t.Size = UDim2.new(1, 0, 0, 26)
	t.Position = UDim2.new(0, 0, 1, -28)
	t.Font = Enum.Font.Cartoon
	t.TextScaled = true
	t.TextColor3 = Color3.fromRGB(255, 240, 220)
	t.TextStrokeTransparency = 0.4
	t.Text = "come play with me!"
	t.Parent = bg
	for k = 0, 12 do -- scanlines
		local l = Instance.new("Frame")
		l.Size = UDim2.new(1, 0, 0, 2)
		l.Position = UDim2.fromOffset(0, k * 16)
		l.BackgroundColor3 = Color3.new(0, 0, 0)
		l.BackgroundTransparency = 0.75
		l.BorderSizePixel = 0
		l.Parent = bg
	end
	return g
end

local function building(parent, t, center, w, d, rng, kind)
	local isHouse = kind == "house"
	local h = isHouse and 12 or 18
	local wallT = 1
	local doorW = isHouse and 6 or 10
	local doorSide = rng:NextInteger(1, 4)
	local wallColor = isHouse and t.wall or Color3.fromRGB(105, 110, 112)
	local wallMat = isHouse and t.wallMat or (kind == "lab" and Enum.Material.Concrete or Enum.Material.CorrodedMetal)
	local b = Instance.new("Model")
	b.Name = isHouse and "House" or ("Facility_" .. kind)
	b.Parent = parent
	local out = { beds = {}, tvs = {}, loot = {} }
	part(b, Vector3.new(w, 0.4, d), CFrame.new(center + Vector3.new(0, 0.2, 0)), isHouse and t.floor or Color3.fromRGB(70, 72, 74), isHouse and t.floorMat or Enum.Material.Concrete, { name = "Floor" })
	if isHouse then -- pitched roof from two wedges
		local rw = Vector3.new(w + 2, 4, d / 2 + 1)
		local r1 = part(b, rw, CFrame.new(center + Vector3.new(0, h + 2, -d / 4)), Color3.fromRGB(70, 40, 34), Enum.Material.Slate, { name = "Roof" })
		local r2 = part(b, rw, CFrame.new(center + Vector3.new(0, h + 2, d / 4)) * CFrame.Angles(0, math.pi, 0), Color3.fromRGB(70, 40, 34), Enum.Material.Slate, { name = "Roof" })
		for _, r in ipairs({ r1, r2 }) do
			local wedge = Instance.new("WedgePart")
			wedge.Anchored, wedge.Size, wedge.CFrame, wedge.Color, wedge.Material, wedge.Name = true, r.Size, r.CFrame, r.Color, r.Material, "Roof"
			wedge.Parent = b
			r:Destroy()
		end
		part(b, Vector3.new(w, 0.4, d), CFrame.new(center + Vector3.new(0, h, 0)), Color3.fromRGB(200, 190, 170), Enum.Material.Plaster, { name = "Ceiling" })
	else
		part(b, Vector3.new(w + 2, 1, d + 2), CFrame.new(center + Vector3.new(0, h + 0.5, 0)), Color3.fromRGB(60, 62, 64), Enum.Material.DiamondPlate, { name = "Roof" })
	end
	local sides = {
		{ len = w, cf = CFrame.new(center + Vector3.new(0, h / 2, -d / 2)), axis = "x" },
		{ len = w, cf = CFrame.new(center + Vector3.new(0, h / 2, d / 2)), axis = "x" },
		{ len = d, cf = CFrame.new(center + Vector3.new(-w / 2, h / 2, 0)), axis = "z" },
		{ len = d, cf = CFrame.new(center + Vector3.new(w / 2, h / 2, 0)), axis = "z" },
	}
	for i, sd in ipairs(sides) do wallSide(b, sd, h, wallT, wallColor, wallMat, (i == doorSide or (not isHouse and i == (doorSide % 4) + 1)) and doorW or nil) end
	-- interior divider with a doorway (two rooms)
	wallSide(b, { len = d, cf = CFrame.new(center + Vector3.new(0, h / 2, 0)), axis = "z" }, h, 0.6, isHouse and Color3.fromRGB(150, 130, 110) or wallColor, isHouse and Enum.Material.Plaster or wallMat, isHouse and 5 or 9)
	local function F(size, off, color, mat, name) return part(b, size, CFrame.new(center + off), color, mat or Enum.Material.Wood, { name = name or "Furniture" }) end
	local qx, qz = w / 4, d / 4
	if isHouse then
		-- bedroom (left): bed you can sleep in, nightstand, wardrobe
		local bedPos = Vector3.new(-qx, 0, -qz)
		F(Vector3.new(5, 1.6, 8), bedPos + Vector3.new(0, 1.2, 0), Color3.fromRGB(90, 60, 40))
		local mattress = F(Vector3.new(4.6, 0.8, 7.6), bedPos + Vector3.new(0, 2.4, 0), Color3.fromRGB(200, 195, 210), Enum.Material.Fabric, "Bed")
		F(Vector3.new(4.4, 0.6, 1.6), bedPos + Vector3.new(0, 3.1, -2.8), Color3.fromRGB(240, 240, 240), Enum.Material.Fabric, "Pillow")
		F(Vector3.new(4.8, 0.3, 4.4), bedPos + Vector3.new(0, 2.95, 1.5), Color3.fromRGB(120, 40, 50), Enum.Material.Fabric, "Blanket")
		F(Vector3.new(5, 4, 0.6), bedPos + Vector3.new(0, 2.4, -4.2), Color3.fromRGB(80, 52, 34))
		F(Vector3.new(2, 2.4, 2), bedPos + Vector3.new(3.8, 1.2, -3), Color3.fromRGB(90, 62, 42))
		F(Vector3.new(5, 8, 2.4), Vector3.new(-qx, 4, qz + d / 8), Color3.fromRGB(75, 50, 32), nil, "Wardrobe")
		table.insert(out.beds, mattress)
		-- living room (right): sofa facing a TV that shows the Locust's broadcast, table, fridge
		local tvBase = Vector3.new(qx, 0, -d / 2 + 2.2)
		F(Vector3.new(6, 2.4, 2.4), tvBase + Vector3.new(0, 1.2, 0), Color3.fromRGB(60, 42, 30))
		F(Vector3.new(5, 3.2, 0.6), tvBase + Vector3.new(0, 4.2, 0.2), Color3.fromRGB(20, 20, 22), Enum.Material.SmoothPlastic, "TVBody")
		local screen = F(Vector3.new(4.5, 2.8, 0.1), tvBase + Vector3.new(0, 4.2, 0.55), Color3.fromRGB(20, 20, 22), Enum.Material.Glass, "TVScreen")
		MapGen.locustScreen(screen, Enum.NormalId.Back)
		local tl = Instance.new("SurfaceLight"); tl.Face = Enum.NormalId.Back; tl.Range = 12; tl.Brightness = 1.2; tl.Color = Color3.fromRGB(255, 220, 160); tl.Parent = screen
		table.insert(out.tvs, screen.Position + Vector3.new(0, -2, 3))
		F(Vector3.new(8, 2, 3), Vector3.new(qx, 1, qz - 1), Color3.fromRGB(110, 60, 50), Enum.Material.Fabric, "Sofa")
		F(Vector3.new(8, 2.5, 1), Vector3.new(qx, 2.6, qz + 0.6), Color3.fromRGB(100, 54, 46), Enum.Material.Fabric, "Sofa")
		F(Vector3.new(4, 1.6, 2.5), Vector3.new(qx, 0.8, -1), Color3.fromRGB(85, 60, 40), nil, "CoffeeTable")
		F(Vector3.new(3, 7, 3), Vector3.new(w / 2 - 2.2, 3.5, d / 2 - 2.2), Color3.fromRGB(220, 222, 225), Enum.Material.SmoothPlastic, "Fridge")
		-- a phone on the coffee table also shows the Locust
		local phone = F(Vector3.new(0.6, 0.08, 1.1), Vector3.new(qx + 1, 1.65, -1), Color3.fromRGB(15, 15, 18), Enum.Material.SmoothPlastic, "Phone")
		MapGen.locustScreen(phone, Enum.NormalId.Top)
		table.insert(out.loot, { pos = center + Vector3.new(-qx + 3, 0, qz - 3), kind = "chest" })
		table.insert(out.loot, { pos = center + Vector3.new(qx - 3, 0, 1.5), kind = "bag" })
	else
		local floorLit = kind == "lab" and Color3.fromRGB(190, 230, 255) or Color3.fromRGB(255, 200, 140)
		if kind == "warehouse" then
			for i = -1, 1 do -- shelving racks with crates
				for _, sx in ipairs({ -1, 1 }) do
					local pos = Vector3.new(sx * qx, 0, i * (d / 3.3))
					F(Vector3.new(w / 2 - 6, 0.4, 3), pos + Vector3.new(0, 4, 0), Color3.fromRGB(200, 120, 30), Enum.Material.Metal, "Shelf")
					F(Vector3.new(w / 2 - 6, 0.4, 3), pos + Vector3.new(0, 8, 0), Color3.fromRGB(200, 120, 30), Enum.Material.Metal, "Shelf")
					F(Vector3.new(0.4, 9, 0.4), pos + Vector3.new(-(w / 4 - 3), 4.5, 0), Color3.fromRGB(40, 60, 120), Enum.Material.Metal)
					F(Vector3.new(0.4, 9, 0.4), pos + Vector3.new(w / 4 - 3, 4.5, 0), Color3.fromRGB(40, 60, 120), Enum.Material.Metal)
					F(Vector3.new(3, 3, 2.6), pos + Vector3.new(rng:NextNumber(-3, 3), 5.7, 0), Color3.fromRGB(140, 105, 60), Enum.Material.WoodPlanks, "Crate")
				end
			end
		elseif kind == "lab" then
			for i = -1, 1 do
				for _, sx in ipairs({ -1, 1 }) do
					local pos = Vector3.new(sx * qx, 0, i * (d / 3.3))
					F(Vector3.new(8, 3, 3), pos + Vector3.new(0, 1.5, 0), Color3.fromRGB(220, 225, 230), Enum.Material.SmoothPlastic, "LabTable")
					F(Vector3.new(2.2, 1.6, 0.3), pos + Vector3.new(-2, 3.8, 0.6), Color3.fromRGB(25, 25, 28), Enum.Material.SmoothPlastic, "Monitor")
					local scr = F(Vector3.new(2, 1.4, 0.05), pos + Vector3.new(-2, 3.8, 0.42), Color3.fromRGB(25, 25, 28), Enum.Material.Glass, "MonitorScreen")
					MapGen.locustScreen(scr, Enum.NormalId.Front)
					table.insert(out.tvs, scr.Position + Vector3.new(0, -2, -3))
					local tank = part(b, Vector3.new(2, 4, 2), CFrame.new(center + pos + Vector3.new(2.5, 5, 0)), Color3.fromRGB(80, 255, 140), Enum.Material.Glass, { shape = Enum.PartType.Cylinder, transp = 0.4, name = "Tank" })
					tank.CFrame = tank.CFrame * CFrame.Angles(0, 0, math.rad(90))
				end
			end
		else -- industrial: machines, pipes and a catwalk
			for i = -1, 1, 2 do
				F(Vector3.new(8, 7, 6), Vector3.new(-qx, 3.5, i * qz), Color3.fromRGB(90, 100, 80), Enum.Material.Metal, "Machine")
				F(Vector3.new(1.4, 1.4, d - 4), Vector3.new(qx + i * 2, h - 3, 0), Color3.fromRGB(150, 70, 40), Enum.Material.CorrodedMetal, "Pipe")
				F(Vector3.new(2.5, 9, 2.5), Vector3.new(qx, 4.5, i * qz), Color3.fromRGB(120, 120, 110), Enum.Material.Metal, "Boiler")
			end
			F(Vector3.new(w / 2 - 4, 0.4, 4), Vector3.new(qx, 8, -d / 2 + 3), Color3.fromRGB(60, 60, 60), Enum.Material.DiamondPlate, "Catwalk")
		end
		for _, z in ipairs({ -qz, qz }) do
			local bulb = part(b, Vector3.new(2, 0.4, 2), CFrame.new(center + Vector3.new(0, h - 0.5, z)), floorLit, Enum.Material.Neon, { collide = false, name = "FlickerLight" })
			local l = Instance.new("PointLight"); l.Range = 26; l.Brightness = 1.3; l.Color = floorLit; l.Parent = bulb
		end
		table.insert(out.loot, { pos = center + Vector3.new(-qx, 0, -d / 2 + 3), kind = "chest" })
		table.insert(out.loot, { pos = center + Vector3.new(qx, 0, d / 2 - 3), kind = "chest" })
		table.insert(out.loot, { pos = center + Vector3.new(3, 0, 0), kind = "bag" })
	end
	if isHouse then
		local bulb = part(b, Vector3.new(1, 0.5, 1), CFrame.new(center + Vector3.new(qx, h - 0.6, 0)), t.lamp, Enum.Material.Neon, { collide = false, name = "FlickerLight" })
		local l = Instance.new("PointLight"); l.Range = 20; l.Brightness = 1.2; l.Color = t.lamp; l.Parent = bulb
	end
	return b, out
end

-- a lattice power-line tower with cross-arms; returns attachment points for the wires
local function tower(parent, pos, yaw, rng)
	local m = Instance.new("Model")
	m.Name = "PowerTower"
	m.Parent = parent
	local H, base, top = 46, 7, 2
	local cf0 = CFrame.new(pos) * CFrame.Angles(0, yaw, 0)
	local steel = Color3.fromRGB(70, 74, 78)
	local function beam(a, b2, th)
		local mid, len = (a + b2) / 2, (b2 - a).Magnitude
		part(m, Vector3.new(th or 0.5, th or 0.5, len), CFrame.lookAt(mid, b2), steel, Enum.Material.Metal, { name = "Steel" })
	end
	local function corner(sx, sz, y)
		local k = base + (top - base) * (y / H)
		return (cf0 * CFrame.new(sx * k, y, sz * k)).Position
	end
	for _, c in ipairs({ { -1, -1 }, { 1, -1 }, { 1, 1 }, { -1, 1 } }) do beam(corner(c[1], c[2], 0), corner(c[1], c[2], H), 0.7) end
	for y = 0, H - 6, 6 do -- X-bracing on each face
		local y2 = y + 6
		for _, f in ipairs({ { { -1, -1 }, { 1, -1 } }, { { 1, -1 }, { 1, 1 } }, { { 1, 1 }, { -1, 1 } }, { { -1, 1 }, { -1, -1 } } }) do
			beam(corner(f[1][1], f[1][2], y), corner(f[2][1], f[2][2], y2), 0.3)
			beam(corner(f[2][1], f[2][2], y), corner(f[1][1], f[1][2], y2), 0.3)
			beam(corner(f[1][1], f[1][2], y2), corner(f[2][1], f[2][2], y2), 0.3)
		end
	end
	local points = {}
	for i, y in ipairs({ H - 14, H - 6 }) do
		local span = i == 1 and 13 or 9
		local a1, a2 = (cf0 * CFrame.new(-span, y, 0)).Position, (cf0 * CFrame.new(span, y, 0)).Position
		beam(a1, a2, 0.6)
		beam(a1, corner(-1, 0, y + 4), 0.3)
		beam(a2, corner(1, 0, y + 4), 0.3)
		for _, x in ipairs({ -span + 1, span - 1 }) do
			local ins = part(m, Vector3.new(0.5, 2, 0.5), cf0 * CFrame.new(x, y - 1, 0), Color3.fromRGB(150, 160, 150), Enum.Material.Glass, { name = "Insulator" })
			local att = Instance.new("Attachment"); att.Position = Vector3.new(0, -1, 0); att.Parent = ins
			table.insert(points, att)
		end
	end
	local warn = part(m, Vector3.new(0.6, 0.6, 0.6), cf0 * CFrame.new(0, H + 0.5, 0), Color3.fromRGB(255, 40, 30), Enum.Material.Neon, { collide = false, name = "FlickerLight" })
	local l = Instance.new("PointLight"); l.Range = 18; l.Color = Color3.fromRGB(255, 60, 40); l.Brightness = 1; l.Parent = warn
	_ = rng
	return points
end

local function pine(parent, pos, rng)
	local tm = Instance.new("Model")
	tm.Name = "Tree"
	tm.Parent = parent
	local h = rng:NextNumber(30, 48)
	local tr = rng:NextNumber(1.6, 2.4)
	part(tm, Vector3.new(tr, h, tr), CFrame.new(pos + Vector3.new(0, h / 2, 0)) * CFrame.Angles(0, rng:NextNumber(0, 6), 0), Color3.fromRGB(56, 40, 30), Enum.Material.Wood)
	local leaf = Color3.fromRGB(24 + rng:NextInteger(0, 10), 44 + rng:NextInteger(0, 12), 26)
	for k = 0, 4 do -- tapering tiers of crossed boughs
		local y = h * 0.32 + k * (h * 0.14)
		local r = (5.6 - k * 1.0) * (tr / 2)
		for j = 0, 1 do
			part(tm, Vector3.new(r * 2, 3.2, r * 2), CFrame.new(pos + Vector3.new(0, y, 0)) * CFrame.Angles(0, math.rad(j * 45 + k * 20), 0), leaf, Enum.Material.Grass, { collide = false, name = "Leaves" })
		end
	end
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
	return tm
end

-- Generate a map. Returns info { model, spawns, vents, extract, theme, half }.
function MapGen.generate(themeName, seed)
	local rng = Random.new(seed or os.time())
	local t = THEME[themeName] or THEME["Foggy Woods"]
	local H = { part = part, building = building, pine = pine, tree = tree, wallSide = wallSide }
	if t.ocean then return MapGen2.ocean(themeName, rng, t, H) end
	local O = Config.MAP_ORIGIN
	local S = t.size or Config.MAP_SIZE
	local half = S / 2
	-- v1.4: maps are several times bigger; object counts scale with the area (capped so part counts stay sane)
	local K = math.min(4, (S / 360) ^ 2)
	local map = Instance.new("Model")
	map.Name = "NightHuntMap"

	-- smooth Terrain ground (real grass/asphalt materials) with dirt/mud patches; an invisible slab underneath as a safety floor
	part(map, Vector3.new(S + 20, 2, S + 20), CFrame.new(O + Vector3.new(0, t.jungle and -12 or -1, 0)), t.ground, t.groundMat, { name = "Ground", transp = 1 })
	local terrain = workspace.Terrain
	pcall(function() terrain:SetMaterialColor(t.terrain, t.ground) end)
	terrain:FillBlock(CFrame.new(O + Vector3.new(0, t.jungle and -5.5 or -2, 0)), Vector3.new(S + 40, t.jungle and 11 or 4, S + 40), t.terrain)
	for _ = 1, math.floor(26 * K) do
		local pp = O + Vector3.new(rng:NextNumber(-half, half), 0, rng:NextNumber(-half, half))
		terrain:FillCylinder(CFrame.new(pp + Vector3.new(0, -1.9, 0)), 0.3, rng:NextNumber(6, 16), t.patch)
	end
	-- (v1.3.1) drifting white fog puffs removed at Leo's request
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

	local beds, tvs, loot = {}, {}, {}
	-- power-line corridor straight across the map (towers + sagging wires); kept clear of trees
	if t.powerlines then
		local z0 = rng:NextNumber(-half * 0.4, half * 0.4)
		local prev
		for i = 0, 5 do
			local x = -half + 20 + i * ((S - 40) / 5)
			local tp = O + Vector3.new(x, 0, z0 + math.sin(i * 1.3) * 6)
			claim(tp, 12)
			local pts = tower(map, tp, 0, rng)
			if prev then
				for k = 1, math.min(#prev, #pts) do
					local beam = Instance.new("Beam")
					beam.Attachment0, beam.Attachment1 = prev[k], pts[k]
					beam.Width0, beam.Width1 = 0.25, 0.25
					beam.CurveSize0, beam.CurveSize1 = -9, 9
					beam.Color = ColorSequence.new(Color3.fromRGB(20, 20, 20))
					beam.LightInfluence = 1
					beam.Segments = 16
					beam.FaceCamera = true
					beam.Parent = pts[k]
				end
			end
			prev = pts
		end
		for x = -half, half, 10 do claim(O + Vector3.new(x, 0, z0), 7) end
	end
	local ctx = { t = t, H = H, map = map, rng = rng, O = O, S = S, half = half, free = free, claim = claim, randPos = randPos, beds = beds, tvs = tvs, loot = loot }
	local extra = MapGen2.extras(themeName, ctx)
	local kinds = { "house", "house", "house", "warehouse", "lab", "industrial" }
	if t.snow or t.farm then kinds = { "house", "house", "warehouse" } end
	for i = 1, math.floor(t.buildings * K) do
		local kind = kinds[(i - 1) % #kinds + 1]
		for _try = 1, 25 do
			local w, d
			if kind == "house" then w, d = rng:NextInteger(30, 38), rng:NextInteger(26, 32) else w, d = rng:NextInteger(40, 52), rng:NextInteger(34, 44) end
			local pos = randPos(30)
			local r = math.max(w, d) / 2 + 8
			if free(pos, r) then
				claim(pos, r)
				local _, info = building(map, t, pos, w, d, rng, kind)
				for _, x in ipairs(info.beds) do table.insert(beds, x) end
				for _, x in ipairs(info.tvs) do table.insert(tvs, x) end
				for _, x in ipairs(info.loot) do table.insert(loot, x) end
				break
			end
		end
	end
	-- chests and bags out in the open
	for i = 1, math.floor((t.pines and 16 or 10) * K) do
		for _try = 1, 12 do
			local pos = randPos(12)
			if free(pos, 4) then
				claim(pos, 3)
				table.insert(loot, { pos = pos, kind = (i % 3 == 0) and "chest" or "bag" })
				break
			end
		end
	end

	for _ = 1, math.min(520, math.floor(t.trees * K)) do
		for _try = 1, 10 do
			local pos = randPos(6)
			if free(pos, 5) then
				claim(pos, 3)
				if t.jungle then
					local tm = tree(map, pos, "Foggy Woods", rng)
					if tm then
						for _, lp in ipairs(tm:GetChildren()) do if lp:IsA("Part") and lp.Shape == Enum.PartType.Ball then lp.Size = Vector3.new(18, 10, 18); lp.Color = Color3.fromRGB(30, 70, 30) end end
					end
				elseif t.pines then pine(map, pos, rng) else tree(map, pos, themeName, rng) end
				break
			end
		end
	end

	-- hiding bushes / crates (walk inside them to hide)
	for _ = 1, math.floor(t.hides * K) do
		for _try = 1, 10 do
			local pos = randPos(8)
			if free(pos, 5) then
				claim(pos, 4)
				if themeName == "Abandoned Pizzeria Town" or themeName == "Fester Street" then
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
	for _ = 1, (t.fester and 0 or math.floor(14 * K)) do
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
	for i = 1, 12 do
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

	-- gentle terrain hills between everything else
	for _ = 1, math.floor((t.hills or 0) * K) do
		for _try = 1, 8 do
			local pos = randPos(20)
			if free(pos, 14) then
				claim(pos, 10)
				workspace.Terrain:FillBall(pos + Vector3.new(0, -rng:NextNumber(9, 12), 0), rng:NextNumber(12, 16), t.terrain)
				break
			end
		end
	end

	return {
		beds = beds, tvs = tvs, loot = loot,
		model = map, spawns = spawns, monsterSpawns = monsterSpawns, vents = vents,
		extract = ex, theme = themeName, half = half, fog = t.fog, fogColor = t.fogColor,
		pools = extra.pools, lights = extra.lights, size = S,
	}
end

-- Remove the terrain a map created.
function MapGen.clearTerrain()
	local O, S = Config.MAP_ORIGIN, math.max(Config.MAP_SIZE, Config.OCEAN_SIZE)
	workspace.Terrain:FillBlock(CFrame.new(O + Vector3.new(0, 20, 0)), Vector3.new(S + 48, 140, S + 48), Enum.Material.Air)
	workspace.Terrain:FillBlock(CFrame.new(O + Vector3.new(0, -30, 0)), Vector3.new(S + 48, 40, S + 48), Enum.Material.Air)
end

-- the walk-in store building in the lobby
function MapGen.store(parent, templates)
	-- v1.4.1: the single store became a shopping street of nine walk-in stores (Plaza.luau)
	local Plaza = require(script.Parent:WaitForChild("Plaza"))
	return Plaza.build(parent, { part = part, wallSide = wallSide }, templates)
end

return MapGen
