-- v1.4.1: the lobby shopping street. Nine walk-in stores (two rows facing a street east of the helipad),
-- each with its own sign, themed displays and a counter you walk up to (ProximityPrompt with a Tab attribute
-- that opens that store's section of the shop UI). Coins only - no Robux, no real money.
local Config = require(game:GetService("ReplicatedStorage"):WaitForChild("NightHunt"):WaitForChild("Config"))
local Plaza = {}
local rgb = Color3.fromRGB

local W, D, H, T, DOOR = 36, 40, 16, 1, 12
Plaza.STREET = { x0 = 66, x1 = 330, z = 0, w = 30 }

local function light(p, range, color, bright)
	local l = Instance.new("PointLight")
	l.Range, l.Color, l.Brightness = range, color, bright or 1.2
	l.Parent = p
	return l
end
local function textOn(p, face, text, color, font, canvas)
	local g = Instance.new("SurfaceGui")
	g.Face = face
	g.CanvasSize = canvas or Vector2.new(800, 160)
	g.LightInfluence = 0
	g.Brightness = 1.5
	g.Parent = p
	local t = Instance.new("TextLabel")
	t.Size = UDim2.fromScale(1, 1)
	t.BackgroundTransparency = 1
	t.Font = font or Enum.Font.GothamBlack
	t.TextScaled = true
	t.TextColor3 = color
	t.Text = text
	t.Parent = g
	return t
end
local function billboard(p, text, color, y)
	local g = Instance.new("BillboardGui")
	g.Size = UDim2.fromOffset(240, 46)
	g.StudsOffset = Vector3.new(0, y or 3, 0)
	g.MaxDistance = 60
	g.LightInfluence = 0
	g.Parent = p
	local t = Instance.new("TextLabel")
	t.Size = UDim2.fromScale(1, 1)
	t.BackgroundTransparency = 1
	t.Font = Enum.Font.GothamBlack
	t.TextScaled = true
	t.TextStrokeTransparency = 0.3
	t.TextColor3 = color
	t.Text = text
	t.Parent = g
end

-- a small pet model (also used by the server for the pet that follows you)
function Plaza.buildPet(kind, scale)
	scale = scale or 1
	local col = Config.PET_COLORS[kind] or Config.PET_COLORS.puppy
	local m = Instance.new("Model")
	m.Name = "Pet_" .. kind
	local function p(size, off, color, shape, transp, mat)
		local x = Instance.new("Part")
		x.Size = size * scale
		x.Color = color
		x.Material = mat or Enum.Material.SmoothPlastic
		if shape then x.Shape = shape end
		x.Transparency = transp or 0
		x.CanCollide, x.CanQuery, x.CanTouch, x.Massless = false, false, false, true
		x.CFrame = CFrame.new(off * scale)
		x.Parent = m
		return x
	end
	local ball = Enum.PartType.Ball
	local body
	if kind == "ghost" then
		body = p(Vector3.new(1.6, 1.8, 1.6), Vector3.new(0, 0, 0), col[1], ball, 0.25, Enum.Material.Neon)
	elseif kind == "slime" then
		body = p(Vector3.new(1.8, 1.2, 1.8), Vector3.new(0, 0, 0), col[1], ball, 0.2, Enum.Material.Glass)
	elseif kind == "pumpkin" then
		body = p(Vector3.new(1.8, 1.5, 1.8), Vector3.new(0, 0, 0), col[1], ball)
		p(Vector3.new(0.25, 0.5, 0.25), Vector3.new(0, 0.95, 0), col[2])
		p(Vector3.new(0.3, 0.25, 0.1), Vector3.new(-0.35, 0.15, -0.85), rgb(255, 210, 58), nil, 0, Enum.Material.Neon)
		p(Vector3.new(0.3, 0.25, 0.1), Vector3.new(0.35, 0.15, -0.85), rgb(255, 210, 58), nil, 0, Enum.Material.Neon)
	else
		body = p(Vector3.new(1.3, 1.1, 1.7), Vector3.new(0, 0, 0), col[1], ball)
		p(Vector3.new(1, 1, 1), Vector3.new(0, 0.8, -0.8), col[1], ball)
		p(Vector3.new(0.5, 0.4, 0.4), Vector3.new(0, 0.6, -1.25), col[2], ball)
		if kind == "puppy" then
			p(Vector3.new(0.25, 0.6, 0.4), Vector3.new(-0.55, 0.8, -0.7), col[2]); p(Vector3.new(0.25, 0.6, 0.4), Vector3.new(0.55, 0.8, -0.7), col[2])
		elseif kind == "kitty" or kind == "owl" or kind == "bat" or kind == "dragon" then
			p(Vector3.new(0.25, 0.45, 0.25), Vector3.new(-0.3, 1.4, -0.75), kind == "dragon" and col[2] or col[1]); p(Vector3.new(0.25, 0.45, 0.25), Vector3.new(0.3, 1.4, -0.75), kind == "dragon" and col[2] or col[1])
		end
		if kind == "bat" or kind == "owl" or kind == "dragon" then -- wings
			p(Vector3.new(1.4, 0.1, 0.9), Vector3.new(-1.2, 0.3, 0), kind == "dragon" and col[2] or col[1]).Name = "Wing"
			p(Vector3.new(1.4, 0.1, 0.9), Vector3.new(1.2, 0.3, 0), kind == "dragon" and col[2] or col[1]).Name = "Wing"
		else
			for _, o in ipairs({ { -0.4, -0.5 }, { 0.4, -0.5 }, { -0.4, 0.5 }, { 0.4, 0.5 } }) do p(Vector3.new(0.25, 0.5, 0.25), Vector3.new(o[1], -0.6, o[2]), col[1]) end
		end
	end
	for _, e in ipairs({ -0.22, 0.22 }) do p(Vector3.new(0.18, 0.18, 0.18), Vector3.new(e, (kind == "ghost" or kind == "slime" or kind == "pumpkin") and 0.35 or 0.95, (kind == "ghost" or kind == "slime" or kind == "pumpkin") and -0.75 or -1.25), rgb(15, 15, 15), ball) end
	body.Name = "Body"
	m.PrimaryPart = body
	for _, x in ipairs(m:GetChildren()) do
		if x:IsA("BasePart") and x ~= body then
			local w = Instance.new("WeldConstraint"); w.Part0 = body; w.Part1 = x; w.Parent = x
		end
	end
	return m
end

function Plaza.build(parent, H2, templates)
	local part, wallSide = H2.part, H2.wallSide
	local m = Instance.new("Model"); m.Name = "ShoppingStreet"; m.Parent = parent
	local S = Plaza.STREET
	-- ground, sidewalks and the street with yellow dashes
	part(m, Vector3.new(S.x1 - S.x0 + 30, 2, 150), CFrame.new((S.x0 + S.x1) / 2, -1, 0), rgb(70, 72, 78), Enum.Material.Concrete, { name = "PlazaLot" })
	part(m, Vector3.new(S.x1 - S.x0, 0.2, S.w), CFrame.new((S.x0 + S.x1) / 2, 0.1, 0), rgb(36, 38, 42), Enum.Material.Asphalt, { name = "Street" })
	part(m, Vector3.new(80 - 16, 0.2, 14), CFrame.new(16 + (80 - 16) / 2 - 8, 0.1, 0), rgb(36, 38, 42), Enum.Material.Asphalt, { name = "StreetLink" })
	for x = S.x0 + 6, S.x1 - 6, 14 do part(m, Vector3.new(6, 0.25, 0.8), CFrame.new(x, 0.12, 0), rgb(240, 200, 40), Enum.Material.Neon, { collide = false, name = "Dash" }) end
	local arch = part(m, Vector3.new(1, 6, 28), CFrame.new(S.x0 - 2, 14, 0), rgb(20, 14, 30), Enum.Material.Slate, { name = "StreetSign" })
	textOn(arch, Enum.NormalId.Left, "SHOPPING STREET", rgb(255, 210, 60), Enum.Font.Creepster)
	for _, z in ipairs({ -14, 14 }) do part(m, Vector3.new(1.2, 17, 1.2), CFrame.new(S.x0 - 2, 8.5, z), rgb(30, 30, 34), Enum.Material.Metal, { name = "ArchPost" }) end
	for x = S.x0 + 14, S.x1, 40 do -- streetlights both sides
		for _, z in ipairs({ -15.5, 15.5 }) do
			part(m, Vector3.new(0.6, 12, 0.6), CFrame.new(x, 6, z), rgb(30, 30, 34), Enum.Material.Metal, { name = "LampPost" })
			light(part(m, Vector3.new(1.6, 0.8, 1.6), CFrame.new(x, 12.4, z), rgb(255, 230, 170), Enum.Material.Neon, { collide = false, name = "LampHead" }), 34, rgb(255, 220, 160), 1.4)
		end
	end
	local prompts, zones = {}, {}
	for i, st in ipairs(Config.STORES) do
		local north = i <= 5
		local cx = north and (100 + (i - 1) * 48) or (124 + (i - 6) * 48)
		local cz = north and -(S.w / 2 + 2 + D / 2) or (S.w / 2 + 2 + D / 2)
		local O = Vector3.new(cx, 0, cz)
		local dir = north and 1 or -1 -- +z faces the street for the north row
		local b = Instance.new("Model"); b.Name = "Store_" .. st.k; b.Parent = m
		b:SetAttribute("Store", st.k)
		local wallC = st.c:Lerp(rgb(40, 36, 44), 0.55)
		part(b, Vector3.new(W, 0.3, D), CFrame.new(O + Vector3.new(0, 0.15, 0)), st.c:Lerp(rgb(30, 30, 30), 0.78), Enum.Material.Marble, { name = "Floor" })
		part(b, Vector3.new(W + 1, 1, D + 1), CFrame.new(O + Vector3.new(0, H + 0.5, 0)), rgb(36, 32, 40), Enum.Material.Slate, { name = "Roof" })
		wallSide(b, { len = W, cf = CFrame.new(O + Vector3.new(0, H / 2, dir * D / 2)), axis = "x" }, H, T, wallC, Enum.Material.Brick, DOOR) -- street wall with the door
		wallSide(b, { len = W, cf = CFrame.new(O + Vector3.new(0, H / 2, -dir * D / 2)), axis = "x" }, H, T, wallC, Enum.Material.Brick, nil)
		wallSide(b, { len = D, cf = CFrame.new(O + Vector3.new(-W / 2, H / 2, 0)), axis = "z" }, H, T, wallC, Enum.Material.Brick, nil)
		wallSide(b, { len = D, cf = CFrame.new(O + Vector3.new(W / 2, H / 2, 0)), axis = "z" }, H, T, wallC, Enum.Material.Brick, nil)
		-- sign over the door + a glowing strip in the store colour
		local sign = part(b, Vector3.new(W - 4, 4.5, 0.6), CFrame.new(O + Vector3.new(0, H - 3, dir * (D / 2 + 0.8))), rgb(16, 12, 20), Enum.Material.Slate, { name = "StoreSign" })
		textOn(sign, north and Enum.NormalId.Back or Enum.NormalId.Front, st.name, st.c, Enum.Font.GothamBlack, Vector2.new(800, 110))
		local sub = part(b, Vector3.new(W - 10, 1.4, 0.4), CFrame.new(O + Vector3.new(0, H - 6.2, dir * (D / 2 + 0.7))), rgb(16, 12, 20), Enum.Material.Slate, { name = "StoreSub" })
		textOn(sub, north and Enum.NormalId.Back or Enum.NormalId.Front, st.sub, rgb(240, 240, 240), Enum.Font.GothamBold, Vector2.new(800, 60))
		part(b, Vector3.new(W, 0.5, 0.4), CFrame.new(O + Vector3.new(0, H - 0.6, dir * (D / 2 + 0.7))), st.c, Enum.Material.Neon, { collide = false, name = "Strip" })
		-- awning
		part(b, Vector3.new(DOOR + 6, 0.4, 4), CFrame.new(O + Vector3.new(0, 9, dir * (D / 2 + 2))) * CFrame.Angles(math.rad(-dir * 12), 0, 0), st.c:Lerp(rgb(255, 255, 255), 0.2), Enum.Material.Fabric, { collide = false, name = "Awning" })
		-- lights inside in the store colour
		for _, zz in ipairs({ -D / 4, D / 4 }) do
			light(part(b, Vector3.new(3, 0.3, 3), CFrame.new(O + Vector3.new(0, H - 0.3, zz)), rgb(255, 245, 230), Enum.Material.Neon, { collide = false, name = "StoreLight" }), 30, st.c:Lerp(rgb(255, 255, 255), 0.5), 1.5)
		end
		-- counter at the back + register + prompt
		local back = O + Vector3.new(0, 0, -dir * (D / 2 - 7))
		part(b, Vector3.new(18, 4, 3), CFrame.new(back + Vector3.new(0, 2, 0)), rgb(110, 70, 40), Enum.Material.Wood, { name = "Counter" })
		part(b, Vector3.new(18.2, 0.3, 3.2), CFrame.new(back + Vector3.new(0, 4.1, 0)), st.c:Lerp(rgb(20, 20, 20), 0.6), Enum.Material.Granite, { name = "CounterTop" })
		part(b, Vector3.new(1.4, 1.2, 1.2), CFrame.new(back + Vector3.new(5, 4.9, 0)), rgb(40, 40, 44), Enum.Material.Metal, { name = "Register" })
		local anchor = part(b, Vector3.new(4, 4, 3), CFrame.new(back + Vector3.new(0, 2, dir * 3.5)), rgb(255, 255, 255), Enum.Material.SmoothPlastic, { transp = 1, collide = false, name = "PromptAnchor" })
		billboard(anchor, st.name, st.c, 5)
		local pp = Instance.new("ProximityPrompt")
		pp.ActionText = "Shop"
		pp.ObjectText = st.name
		pp.KeyboardKeyCode = Enum.KeyCode.E
		pp.MaxActivationDistance = 12
		pp.RequiresLineOfSight = false
		pp:SetAttribute("Tab", st.k)
		pp.Parent = anchor
		table.insert(prompts, pp)
		local zp = part(b, Vector3.new(W - 2, H, D - 2), CFrame.new(O + Vector3.new(0, H / 2, 0)), rgb(255, 255, 255), Enum.Material.SmoothPlastic, { collide = false, transp = 1, name = "StoreZone" })
		zp.CanQuery, zp.CanTouch = false, false
		zp:SetAttribute("Tab", st.k)
		table.insert(zones, zp)
		-- themed displays along the side walls (the middle aisle stays clear)
		local function side(fn) for _, sx in ipairs({ -W / 2 + 3, W / 2 - 3 }) do for k = 0, 2 do fn(O + Vector3.new(sx, 0, dir * (D / 2 - 9 - k * 8)), sx < 0 and -1 or 1, k) end end end
		local k = st.k
		if k == "weapons" or k == "food" or k == "skinshop" or k == "armor" then
			side(function(p, sgn, j)
				part(b, Vector3.new(3, 9, 6), CFrame.new(p + Vector3.new(0, 4.5, 0)), rgb(80, 56, 40), Enum.Material.Wood, { name = "Shelf" })
				for y = 1, 3 do
					local c = k == "weapons" and rgb(60 + y * 30, 60 + y * 30, 66 + y * 30) or k == "food" and Color3.fromHSV((j * 0.2 + y * 0.13) % 1, 0.75, 0.95) or k == "armor" and rgb(70, 80, 60) or Color3.fromHSV((j * 0.3 + y * 0.17) % 1, 0.5, 1)
					local sz = k == "weapons" and Vector3.new(0.4, 0.4, 3.6) or k == "armor" and Vector3.new(1.4, 1.6, 1.6) or Vector3.new(1, 1.2, 1)
					part(b, sz, CFrame.new(p + Vector3.new(-sgn * 1.7, y * 2.6, 0)), c, k == "weapons" and Enum.Material.Metal or Enum.Material.SmoothPlastic, { name = "Goods" })
				end
			end)
			if k == "armor" or k == "skinshop" then -- mannequins
				for _, sx in ipairs({ -6, 6 }) do
					local mp = O + Vector3.new(sx, 0, dir * 4)
					part(b, Vector3.new(2, 0.4, 2), CFrame.new(mp + Vector3.new(0, 0.2, 0)), rgb(30, 30, 30), Enum.Material.Metal, { name = "MannequinBase" })
					part(b, Vector3.new(2, 2, 1), CFrame.new(mp + Vector3.new(0, 4, 0)), k == "armor" and rgb(60, 70, 50) or st.c, Enum.Material.Fabric, { name = "Mannequin" })
					part(b, Vector3.new(1.9, 2, 1), CFrame.new(mp + Vector3.new(0, 2, 0)), rgb(220, 210, 200), Enum.Material.SmoothPlastic, { name = "Mannequin" })
					part(b, Vector3.new(1.1, 1.1, 1.1), CFrame.new(mp + Vector3.new(0, 5.6, 0)), rgb(220, 210, 200), Enum.Material.SmoothPlastic, { name = "Mannequin", shape = Enum.PartType.Ball })
					if k == "armor" then part(b, Vector3.new(1.4, 0.6, 1.4), CFrame.new(mp + Vector3.new(0, 6.1, 0)), rgb(70, 80, 60), Enum.Material.Metal, { name = "Helmet" }) end
				end
			end
			if k == "food" then -- glowing drink fridges on the back wall
				for _, sx in ipairs({ -13, 13 }) do
					local f = part(b, Vector3.new(5, 9, 2.5), CFrame.new(back + Vector3.new(sx, 4.5, -dir * 3.5)), rgb(200, 230, 255), Enum.Material.Glass, { name = "Fridge" })
					f.Transparency = 0.3
					light(f, 10, rgb(180, 220, 255), 1)
				end
			end
		elseif k == "monskins" then
			local shown = { "dragon", "trex", "kraken", "vampire", "yeti", "freddy" }
			local n = 0
			side(function(p, sgn)
				n += 1
				part(b, Vector3.new(5, 2, 5), CFrame.new(p + Vector3.new(-sgn * 0.5, 1, 0)), rgb(30, 30, 34), Enum.Material.Marble, { name = "Pedestal" })
				local tpl = templates and templates:FindFirstChild(shown[n] or "freddy")
				if tpl then
					local s = tpl:Clone()
					for _, d in ipairs(s:GetDescendants()) do
						if d:IsA("BasePart") then d.Anchored = true; d.CanCollide = false end
						if d:IsA("Script") or d:IsA("LocalScript") then d:Destroy() end
					end
					pcall(function() s:ScaleTo(0.22) end)
					local _, size = s:GetBoundingBox()
					s:PivotTo(CFrame.new(p + Vector3.new(-sgn * 0.5, 2 + size.Y / 2 + 0.1, 0)) * CFrame.Angles(0, math.rad(sgn * 90), 0))
					s.Name = "Statue"
					s.Parent = b
				end
			end)
		elseif k == "emotes" then -- disco dance floor in front of the counter
			for gx = -2, 2 do
				for gz = -2, 2 do
					local t = part(b, Vector3.new(3.8, 0.2, 3.8), CFrame.new(O + Vector3.new(gx * 4, 0.35, dir * 4 + gz * 4)), Color3.fromHSV(((gx + gz) % 5) / 5, 0.8, 1), Enum.Material.Neon, { collide = false, name = "DanceTile" })
					t:SetAttribute("Disco", true)
				end
			end
			local ball = part(b, Vector3.new(2.4, 2.4, 2.4), CFrame.new(O + Vector3.new(0, H - 3, dir * 4)), rgb(220, 220, 230), Enum.Material.Foil, { collide = false, shape = Enum.PartType.Ball, name = "DiscoBall" })
			ball.Reflectance = 0.6
			ball:SetAttribute("Spin", true)
			for _, sx in ipairs({ -W / 2 + 2.5, W / 2 - 2.5 }) do part(b, Vector3.new(3, 7, 3), CFrame.new(O + Vector3.new(sx, 3.5, dir * 2)), rgb(20, 20, 24), Enum.Material.Metal, { name = "Speaker" }) end
		elseif k == "pets" then
			local kinds = { "puppy", "kitty", "bat", "owl", "slime", "dragon" }
			local n = 0
			side(function(p, sgn)
				n += 1
				part(b, Vector3.new(4, 1, 4), CFrame.new(p + Vector3.new(-sgn * 0.5, 0.5, 0)), st.c:Lerp(rgb(60, 40, 30), 0.5), Enum.Material.Fabric, { name = "PetBed" })
				local pet = Plaza.buildPet(kinds[n] or "puppy", 1.2)
				for _, d in ipairs(pet:GetDescendants()) do if d:IsA("BasePart") then d.Anchored = true end end
				pet:PivotTo(CFrame.new(p + Vector3.new(-sgn * 0.5, 2.2, 0)) * CFrame.Angles(0, math.rad(sgn * 90), 0))
				pet.Parent = b
				pet:SetAttribute("Bob", true)
			end)
		elseif k == "clothing" then
			local mirror = part(b, Vector3.new(0.4, 11, 14), CFrame.new(O + Vector3.new(W / 2 - 1.2, 6, 0)), rgb(200, 220, 230), Enum.Material.Glass, { name = "Mirror" })
			mirror.Reflectance = 0.9
			part(b, Vector3.new(0.6, 12, 15), CFrame.new(O + Vector3.new(W / 2 - 0.9, 6, 0)), rgb(200, 160, 60), Enum.Material.Metal, { name = "MirrorFrame" })
			for j = 0, 1 do -- curtained booths and clothes racks
				part(b, Vector3.new(6, 9, 0.3), CFrame.new(O + Vector3.new(-W / 2 + 4, 4.5, dir * (6 - j * 12))), rgb(140, 30, 60), Enum.Material.Fabric, { name = "Curtain", collide = false })
				part(b, Vector3.new(0.3, 0.3, 7), CFrame.new(O + Vector3.new(-W / 2 + 9, 6, dir * (8 - j * 12))), rgb(160, 160, 170), Enum.Material.Metal, { name = "Rack" })
				for c = 0, 4 do part(b, Vector3.new(1.4, 3, 0.4), CFrame.new(O + Vector3.new(-W / 2 + 9, 4.4, dir * (5.5 - j * 12 + c * 1.3))), Color3.fromHSV((c * 0.19 + j * 0.4) % 1, 0.7, 0.85), Enum.Material.Fabric, { name = "Clothes", collide = false }) end
			end
		elseif k == "crate" then
			side(function(p, sgn, j)
				local c = part(b, Vector3.new(3.4, 3.4, 3.4), CFrame.new(p + Vector3.new(-sgn * 0.5, 2.2, 0)), rgb(110, 50, 180), Enum.Material.SmoothPlastic, { name = "Crate" })
				part(b, Vector3.new(3.6, 0.5, 3.6), CFrame.new(p + Vector3.new(-sgn * 0.5, 2.2, 0)), rgb(240, 190, 40), Enum.Material.Metal, { name = "CrateBand", collide = false })
				textOn(c, north and Enum.NormalId.Back or Enum.NormalId.Front, "?", rgb(255, 220, 60), Enum.Font.GothamBlack, Vector2.new(100, 100))
				c:SetAttribute("Spin", j == 1)
			end)
			local big = part(b, Vector3.new(5, 5, 5), CFrame.new(back + Vector3.new(0, 7.5, 0)), rgb(140, 70, 220), Enum.Material.Neon, { name = "BigCrate", collide = false })
			big:SetAttribute("Spin", true)
		end
	end
	return m, zones, prompts
end

return Plaza
