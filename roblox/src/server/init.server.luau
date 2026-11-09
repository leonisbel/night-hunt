--[[
	Night Hunt (fan-made) - server
	Hub servers: create / join-by-code / browse public matches. Each match is a Roblox
	reserved server (TeleportService:ReserveServer). Match servers run the lobby ->
	helicopter flight -> hunt -> results loop for 2-15 players.
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TeleportService = game:GetService("TeleportService")
local MemoryStoreService = game:GetService("MemoryStoreService")
local TextService = game:GetService("TextService")
local RunService = game:GetService("RunService")
local DataStoreService = game:GetService("DataStoreService")
local HttpService = game:GetService("HttpService")
local Debris = game:GetService("Debris")

local Shared = ReplicatedStorage:WaitForChild("NightHunt")
local Config = require(Shared:WaitForChild("Config"))
local Models = require(script:WaitForChild("Models"))
local Plaza = require(script:WaitForChild("Plaza"))
local MapGen = require(script:WaitForChild("MapGen"))

---------------------------------------------------------------------------
-- Remotes, replicated state, templates
---------------------------------------------------------------------------
local function make(className, name, parent)
	local i = Instance.new(className)
	i.Name = name
	i.Parent = parent
	return i
end
local Remotes = make("Folder", "Remotes", Shared)
local Action = make("RemoteEvent", "Action", Remotes)   -- client -> server
local Notify = make("RemoteEvent", "Notify", Remotes)   -- server -> client
local Hub = make("RemoteFunction", "Hub", Remotes)      -- hub requests
local State = make("Folder", "State", Shared)
local Templates = make("Folder", "Templates", Shared)
for _, k in ipairs(Config.MONSTER_KEYS) do Models.template(k).Parent = Templates end
for i = 2, #Config.DN_FORMS do Models.template(Config.DN_FORMS[i].key).Parent = Templates end
Models.template("wendigo_h").Parent = Templates -- the Wendigo's human form
Models.template("megalodon_h").Parent = Templates -- the Megalodon's land form

local IS_STUDIO = RunService:IsStudio()
local CAN_TELEPORT = game.PlaceId ~= 0 and not IS_STUDIO
local IS_RESERVED = game.PrivateServerId ~= "" and game.PrivateServerOwnerId == 0
local IS_VIP = game.PrivateServerId ~= "" and game.PrivateServerOwnerId ~= 0

local settings = { code = "", name = "Night Hunt", max = Config.MAX_PLAYERS, public = false, hostId = 0, roundLen = Config.ROUND_TIME }
local function setState(k, v) State:SetAttribute(k, v) end
local function publishSettings()
	setState("ServerCode", settings.code)
	setState("ServerName", settings.name)
	setState("MaxPlayers", settings.max)
	setState("IsPublic", settings.public)
	setState("HostUserId", settings.hostId)
	setState("RoundLen", settings.roundLen)
end
setState("Mode", (IS_RESERVED or IS_VIP) and "Match" or "Hub")
setState("State", "Lobby")
setState("TimeLeft", 0)
setState("Theme", "")
setState("Studio", not CAN_TELEPORT)
publishSettings()
if IS_VIP then
	settings.name = "Private server"
	settings.hostId = game.PrivateServerOwnerId
	publishSettings()
end

local function toast(target, msg)
	if target then Notify:FireClient(target, "toast", msg) else Notify:FireAllClients("toast", msg) end
end

---------------------------------------------------------------------------
-- Lobby: helipad + helicopter at the origin
---------------------------------------------------------------------------
local lobby = Instance.new("Model")
lobby.Name = "Lobby"
do
	local function part(size, cf, color, mat, shape)
		local p = Instance.new("Part")
		p.Anchored = true
		p.Size = size
		p.CFrame = cf
		p.Color = color
		p.Material = mat or Enum.Material.SmoothPlastic
		if shape then p.Shape = shape end
		p.TopSurface = Enum.SurfaceType.Smooth
		p.Parent = lobby
		return p
	end
	part(Vector3.new(160, 2, 160), CFrame.new(0, -1, 0), Color3.fromRGB(40, 44, 48), Enum.Material.Concrete)
	part(Vector3.new(0.5, Config.PAD_RADIUS * 2, Config.PAD_RADIUS * 2), CFrame.new(0, 0.25, 0) * CFrame.Angles(0, 0, math.rad(90)), Color3.fromRGB(60, 60, 60), Enum.Material.Concrete, Enum.PartType.Cylinder)
	part(Vector3.new(0.55, Config.PAD_RADIUS * 2 - 1, Config.PAD_RADIUS * 2 - 1), CFrame.new(0, 0.27, 0) * CFrame.Angles(0, 0, math.rad(90)), Color3.fromRGB(230, 180, 40), Enum.Material.Neon, Enum.PartType.Cylinder).Transparency = 0.6
	part(Vector3.new(0.6, Config.PAD_RADIUS * 2 - 3, Config.PAD_RADIUS * 2 - 3), CFrame.new(0, 0.3, 0) * CFrame.Angles(0, 0, math.rad(90)), Color3.fromRGB(60, 60, 60), Enum.Material.Concrete, Enum.PartType.Cylinder)
	part(Vector3.new(2, 0.62, 12), CFrame.new(-4, 0.32, 9), Color3.fromRGB(240, 240, 240), Enum.Material.Neon)
	part(Vector3.new(2, 0.62, 12), CFrame.new(4, 0.32, 9), Color3.fromRGB(240, 240, 240), Enum.Material.Neon)
	part(Vector3.new(8, 0.62, 2), CFrame.new(0, 0.32, 9), Color3.fromRGB(240, 240, 240), Enum.Material.Neon)
	for _, x in ipairs({ -60, 60 }) do
		for _, z in ipairs({ -60, 60 }) do
			part(Vector3.new(1, 18, 1), CFrame.new(x, 9, z), Color3.fromRGB(30, 30, 30), Enum.Material.Metal)
			local bulb = part(Vector3.new(2, 1, 2), CFrame.new(x, 18.5, z), Color3.fromRGB(255, 200, 120), Enum.Material.Neon)
			local l = Instance.new("PointLight")
			l.Range = 40
			l.Color = Color3.fromRGB(255, 200, 120)
			l.Parent = bulb
		end
	end
	local heli = Models.helicopter(CFrame.new(0, 0.6, -2) * CFrame.Angles(0, math.rad(180), 0))
	heli.Parent = lobby
	local sign = part(Vector3.new(24, 7, 1), CFrame.new(0, 6, 34), Color3.fromRGB(20, 10, 10), Enum.Material.Slate)
	local gui = Instance.new("SurfaceGui")
	gui.Face = Enum.NormalId.Back
	gui.CanvasSize = Vector2.new(480, 140)
	gui.Parent = sign
	local t = Instance.new("TextLabel")
	t.Size = UDim2.fromScale(1, 1)
	t.BackgroundTransparency = 1
	t.Font = Enum.Font.Creepster
	t.TextScaled = true
	t.TextColor3 = Color3.fromRGB(220, 40, 40)
	t.Text = "NIGHT HUNT\nboard the helicopter"
	t.Parent = gui
	-- v1.4.1: the shopping street east of the helipad - nine walk-in stores, each counter opens its own shop
	local _, _, prompts = MapGen.store(lobby, Templates)
	for _, pp in ipairs(prompts) do
		pp.Triggered:Connect(function(plr) Notify:FireClient(plr, "store", pp:GetAttribute("Tab")) end)
	end
	local arrow = part(Vector3.new(14, 0.4, 3), CFrame.new(50, 0.25, 0), Color3.fromRGB(255, 200, 60), Enum.Material.Neon)
	arrow.CanCollide = false
	local s2 = part(Vector3.new(1, 5, 18), CFrame.new(58, 5, -22), Color3.fromRGB(20, 10, 10), Enum.Material.Slate)
	local g2 = Instance.new("SurfaceGui"); g2.Face = Enum.NormalId.Left; g2.CanvasSize = Vector2.new(360, 100); g2.Parent = s2
	local t2 = t:Clone(); t2.Text = "SHOPS  >>"; t2.TextColor3 = Color3.fromRGB(255, 200, 60); t2.Parent = g2
end
lobby.Parent = workspace

local function inPad(char)
	local hrp = char and char:FindFirstChild("HumanoidRootPart")
	if not hrp then return false end
	local p = hrp.Position
	return Vector2.new(p.X, p.Z).Magnitude <= Config.PAD_RADIUS + 2 and p.Y < 25
end

---------------------------------------------------------------------------
-- Server registry (MemoryStore) shared by every hub + match server
---------------------------------------------------------------------------
local registry
pcall(function() registry = MemoryStoreService:GetSortedMap("NightHuntServers") end)
local CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
local function newCode()
	local s = ""
	for _ = 1, 5 do
		local i = math.random(1, #CODE_CHARS)
		s ..= CODE_CHARS:sub(i, i)
	end
	return s
end
local function filterName(text, player)
	text = tostring(text or ""):sub(1, 30):gsub("[%c]", "")
	if text:match("^%s*$") then text = player.DisplayName .. "'s server" end
	local ok, res = pcall(function()
		return TextService:FilterStringAsync(text, player.UserId):GetNonChatStringForBroadcastAsync()
	end)
	return ok and res or (player.DisplayName .. "'s server")
end
local function clampMax(n) return math.clamp(math.floor(tonumber(n) or 8), 2, Config.MAX_PLAYERS) end

local function updateRegistry()
	if not registry or settings.code == "" or not CAN_TELEPORT then return end
	local count = #Players:GetPlayers()
	pcall(function()
		registry:UpdateAsync(settings.code, function(old)
			if not old then return nil end
			old.players = count
			old.max = settings.max
			old.public = settings.public
			old.name = settings.name
			old.state = State:GetAttribute("State")
			old.updated = os.time()
			return old
		end, 120)
	end)
end

---------------------------------------------------------------------------
-- Round state
---------------------------------------------------------------------------
local fx = {}          -- [player] = { stunUntil, slowUntil, rootUntil, greyUntil, dashUntil, reachUntil, invisUntil, sprint, stamina }
local profiles = {} -- [player] = { coins, owned, look, pref, skin }
local currentMap       -- MapGen info
local roundFolder      -- holds map, traps, portals, extraction heli
local extractionOpen = false
local monsterTraps = {} -- [player] = { parts }
local portals = {}      -- [player] = part
local cooldowns = {}    -- [player] = os.clock() ready time

local function F(p)
	fx[p] = fx[p] or { stamina = 100 }
	return fx[p]
end
local function now() return os.clock() end
local function hrpOf(p)
	local c = p.Character
	return c and c:FindFirstChild("HumanoidRootPart")
end
local function humOf(p)
	local c = p.Character
	return c and c:FindFirstChildOfClass("Humanoid")
end
local function isHunting(p)
	return State:GetAttribute("State") == "Hunt" and p:GetAttribute("Alive") == true and p:GetAttribute("Escaped") ~= true
end
local function survivors(onlyActive)
	local list = {}
	for _, p in ipairs(Players:GetPlayers()) do
		if p:GetAttribute("Role") == "Survivor" and (not onlyActive or isHunting(p)) then table.insert(list, p) end
	end
	return list
end
local function monsters()
	local list = {}
	for _, p in ipairs(Players:GetPlayers()) do
		if p:GetAttribute("Role") == "Monster" then table.insert(list, p) end
	end
	return list
end
local function sendToLobby(p)
	local c = p.Character
	if c then
		local fl = c:FindFirstChild("NH_Flashlight", true)
		if fl then fl:Destroy() end
		c:PivotTo(CFrame.new(math.random(-20, 20), 4, 40 + math.random(-6, 6)))
	end
end
local function giveFlashlight(p)
	local hrp = hrpOf(p)
	if not hrp then return end
	local att = Instance.new("Attachment")
	att.Name = "NH_Flashlight"
	p:SetAttribute("FlashOff", nil)
	att.Position = Vector3.new(0, 1.2, -0.6)
	att.Parent = hrp
	local s = Instance.new("SpotLight")
	s.Face = Enum.NormalId.Front
	s.Range = 56
	s.Angle = 48
	s.Brightness = 4
	s.Color = Color3.fromRGB(255, 244, 214)
	s.Shadows = true
	s.Parent = att
	local glow = Instance.new("PointLight")
	glow.Range = 7
	glow.Brightness = 0.35
	glow.Parent = att
end

local function resetPlayer(p)
	p:SetAttribute("Role", "")
	p:SetAttribute("Monster", "")
	p:SetAttribute("Alive", true)
	p:SetAttribute("Escaped", false)
	p:SetAttribute("AbilityReadyAt", 0)
	p:SetAttribute("PortalSet", false)
	p:SetAttribute("Sleeping", false)
	p:SetAttribute("MonsterHp", nil)
	p:SetAttribute("RoundCoins", 0)
	fx[p] = { stamina = 100 }
	cooldowns[p] = 0
end

---------------------------------------------------------------------------
-- Abilities
---------------------------------------------------------------------------
local function nearestSurvivor(from)
	local best, bestD
	for _, s in ipairs(survivors(true)) do
		local h = hrpOf(s)
		if h then
			local d = (h.Position - from).Magnitude
			if not bestD or d < bestD then best, bestD = s, d end
		end
	end
	return best, bestD
end

local function _survivorsNear(pos, radius)
	local list = {}
	for _, s in ipairs(survivors(true)) do
		local h = hrpOf(s)
		if h and (h.Position - pos).Magnitude <= radius then table.insert(list, s) end
	end
	return list
end

local function _setMorphTransparency(p, hidden)
	local morph = p.Character and p.Character:FindFirstChild("NH_Morph")
	if not morph then return end
	for _, d in ipairs(morph:GetDescendants()) do
		if d:IsA("BasePart") and d.Name ~= "Root" then
			if d:GetAttribute("BaseT") == nil then d:SetAttribute("BaseT", d.Transparency) end
			d.Transparency = hidden and 1 or d:GetAttribute("BaseT")
		elseif d:IsA("PointLight") then
			d.Enabled = not hidden
		end
	end
end

local function spaceFree(pos)
	local params = OverlapParams.new()
	params.FilterType = Enum.RaycastFilterType.Exclude
	local chars = {}
	for _, pl in ipairs(Players:GetPlayers()) do if pl.Character then table.insert(chars, pl.Character) end end
	params.FilterDescendantsInstances = chars
	local hits = workspace:GetPartBoundsInBox(CFrame.new(pos), Vector3.new(3, 5, 3), params)
	for _, h in ipairs(hits) do
		if h.CanCollide then return false end
	end
	return true
end

local ABILITY = {}
local function sfxAll(kind, pos) Notify:FireAllClients("sfx", kind, pos) end
local function flatLook(h)
	local l = h.CFrame.LookVector
	local f = Vector3.new(l.X, 0, l.Z)
	return f.Magnitude > 0.01 and f.Unit or Vector3.new(0, 0, -1)
end
local function clearLine(a, b, ignore)
	local params = RaycastParams.new()
	params.FilterType = Enum.RaycastFilterType.Exclude
	local list = { roundFolder and roundFolder:FindFirstChild("Loot") }
	for _, pl in ipairs(Players:GetPlayers()) do if pl.Character then table.insert(list, pl.Character) end end
	for _, x in ipairs(ignore or {}) do table.insert(list, x) end
	params.FilterDescendantsInstances = list
	return workspace:Raycast(a, b - a, params) == nil
end
-- put monster p somewhere free between d0 and d1 studs from pos, facing it
local function appearNear(p, pos, d0, d1)
	for _ = 1, 40 do
		local a = math.random() * math.pi * 2
		local d = d0 + math.random() * (d1 - d0)
		local q = pos + Vector3.new(math.cos(a) * d, 0, math.sin(a) * d)
		if currentMap then
			local o = Config.MAP_ORIGIN
			q = Vector3.new(math.clamp(q.X, o.X - currentMap.half + 6, o.X + currentMap.half - 6), pos.Y + 1, math.clamp(q.Z, o.Z - currentMap.half + 6, o.Z + currentMap.half - 6))
		end
		if spaceFree(q) then p.Character:PivotTo(CFrame.lookAt(q, Vector3.new(pos.X, q.Y, pos.Z))); return true end
	end
	p.Character:PivotTo(CFrame.new(pos + Vector3.new(d0, 2, 0)))
	return true
end
local function portalFx(pos, color)
	local ring = Instance.new("Part")
	ring.Name = "PortalFx"
	ring.Shape = Enum.PartType.Cylinder
	ring.Size = Vector3.new(0.4, 9, 9)
	ring.CFrame = CFrame.new(pos + Vector3.new(0, 4.5, 0)) * CFrame.Angles(0, math.random() * 6, 0)
	ring.Color = color or Color3.fromRGB(170, 20, 30)
	ring.Material = Enum.Material.Neon
	ring.Transparency = 0.25
	ring.Anchored, ring.CanCollide, ring.CanQuery = true, false, false
	ring.Parent = roundFolder or workspace
	Debris:AddItem(ring, 2.5)
end
local function aftonLaugh(p)
	-- original synthesized laugh sound + this monster alone sees every survivor for 10s
	Notify:FireClient(p, "sight", 10)
	sfxAll("laugh", hrpOf(p).Position)
	for _, s in ipairs(survivors(true)) do toast(s, "A creepy laugh echoes through the dark...") end
	return true
end
for _, k in ipairs({ "freddy", "bonnie", "chica", "foxy", "springtrap" }) do ABILITY[k] = aftonLaugh end
ABILITY.sirenhead = function(p)
	for _, s in ipairs(survivors(true)) do
		if s.Character then
			local hl = Instance.new("Highlight")
			hl.Name = "NH_Reveal"
			hl.FillColor = Color3.fromRGB(255, 40, 40)
			hl.OutlineColor = Color3.fromRGB(255, 255, 255)
			hl.FillTransparency = 0.4
			hl.DepthMode = Enum.HighlightDepthMode.AlwaysOnTop
			hl.Parent = s.Character
			Debris:AddItem(hl, 8)
		end
		toast(s, "Siren Head's call revealed everyone!")
	end
	sfxAll("siren", hrpOf(p).Position)
	return true
end
ABILITY.boisvert = function(p)
	for _, s in ipairs(survivors(true)) do
		Notify:FireClient(s, "effect", "static", 10)
		toast(s, "Boisvert: DEAD CHANNEL")
	end
	sfxAll("static", hrpOf(p).Position)
	return true
end
ABILITY.demogorgon = function(p)
	local h = hrpOf(p)
	local target = nearestSurvivor(h.Position)
	if not target then toast(p, "No survivors to hunt"); return 3 end
	portalFx(h.Position - Vector3.new(0, 3, 0))
	sfxAll("portal", h.Position)
	appearNear(p, hrpOf(target).Position, 25, 40)
	portalFx(hrpOf(p).Position - Vector3.new(0, 3, 0))
	sfxAll("portal", hrpOf(p).Position)
	toast(p, "You came out of the Upside Down near " .. target.DisplayName)
	return true
end
local function dnInjection(p)
	local h = hrpOf(p)
	local look = flatLook(h)
	local best, bestD
	for _, s in ipairs(survivors(true)) do
		local sh = hrpOf(s)
		if sh then
			local v = sh.Position - h.Position
			local d = v.Magnitude
			if d < 16 and (d < 7 or look:Dot(Vector3.new(v.X, 0, v.Z).Unit) > 0.45) and (not bestD or d < bestD) then best, bestD = s, d end
		end
	end
	if not best then toast(p, "Injection missed - get closer!"); return 2.5 end
	F(best).slowUntil = now() + 6
	toast(best, "Doctor Nowhere injected you! You feel sluggish...")
	sfxAll("inject", h.Position)
	return true
end
-- Doctor Nowhere: the current form (attribute "Form", 1..4) decides the power
ABILITY.drnowhere = function(p)
	local form = p:GetAttribute("Form") or 1
	local h = hrpOf(p)
	if form == 2 then -- Cone Zone: the fuzzy spider skitters very fast for 2.5s
		F(p).dashUntil = now() + 2.5
		sfxAll("skitter", h.Position)
		toast(p, "Skitter dash!")
		return true
	elseif form == 5 then -- Guilt: survivors looking at you are slowed and hallucinate
		local hit = 0
		for _, s in ipairs(survivors(true)) do
			local sh = hrpOf(s)
			if sh and (sh.Position - h.Position).Magnitude < 130 then
				local toMe = Vector3.new(h.Position.X - sh.Position.X, 0, h.Position.Z - sh.Position.Z)
				if toMe.Magnitude > 0.1 and flatLook(sh):Dot(toMe.Unit) > 0.5 then
					hit += 1
					F(s).slowUntil = now() + 5
					Notify:FireClient(s, "effect", "halluc", 2)
					toast(s, "You looked at Guilt... your legs feel heavy")
				end
			end
		end
		sfxAll("paranoia", h.Position)
		if hit == 0 then toast(p, "Nobody was looking at you"); return 5 end
		return true
	elseif form == 3 then -- Nightmare Man: shadow step up to ~50 studs ahead
		local look = flatLook(h)
		for d = 50, 12, -6 do
			local q = h.Position + look * d
			if spaceFree(q) and clearLine(h.Position, q) then
				portalFx(h.Position - Vector3.new(0, 3, 0), Color3.fromRGB(10, 10, 12))
				p.Character:PivotTo(CFrame.lookAt(q, q + look))
				portalFx(q - Vector3.new(0, 3, 0), Color3.fromRGB(10, 10, 12))
				sfxAll("shift", q)
				return true
			end
		end
		toast(p, "No room to step through the shadows"); return 3
	elseif form == 4 then -- six arms: paranoia - nearby survivors hallucinate and are revealed
		local hit = 0
		for _, s in ipairs(survivors(true)) do
			local sh = hrpOf(s)
			if sh and (sh.Position - h.Position).Magnitude < 117 then
				hit += 1
				Notify:FireClient(s, "effect", "halluc", 8)
				toast(s, "You feel watched... is that real?")
				local hl = Instance.new("Highlight")
				hl.Name = "NH_Reveal"
				hl.FillColor = Color3.fromRGB(255, 40, 40)
				hl.DepthMode = Enum.HighlightDepthMode.AlwaysOnTop
				hl.Parent = s.Character
				Debris:AddItem(hl, 6)
			end
		end
		sfxAll("paranoia", h.Position)
		if hit == 0 then toast(p, "Nobody close enough to feel paranoid"); return 5 end
		return true
	end
	return dnInjection(p)
end
local function setDnForm(p, form)
	local forms = Config.FORMS[p:GetAttribute("Monster")] or Config.DN_FORMS
	local def = forms[form]
	local wg = forms == Config.WG_FORMS
	p:SetAttribute("Form", form)
	F(p).formAt = now() + Config.DN_PERIOD
	if p.Character and isHunting(p) then
		Models.morph(p.Character, def.key, profiles[p] and profiles[p].skin)
		portalFx(hrpOf(p).Position - Vector3.new(0, 3, 0), wg and Color3.fromRGB(216, 204, 176) or Color3.fromRGB(30, 30, 34))
		sfxAll(wg and "crack" or "shift", hrpOf(p).Position)
	end
	toast(p, ("You shapeshift: %s - %s"):format(def.name, def.ability))
end
-- v1.5.1 Wendigo: deer form = Antler Charge, human form = Mimic Lure & Leap
ABILITY.wendigo = function(p)
	local h = hrpOf(p)
	local look = flatLook(h)
	if (p:GetAttribute("Form") or 1) == 1 then
		F(p).dashUntil = now() + 1.1
		sfxAll("crack", h.Position)
		local hit = 0
		for _, s in ipairs(survivors(true)) do
			local sh = hrpOf(s)
			if sh then
				local v = Vector3.new(sh.Position.X - h.Position.X, 0, sh.Position.Z - h.Position.Z)
				if v.Magnitude < 22 and (v.Magnitude < 5 or look:Dot(v.Unit) > 0.5) then
					hit += 1
					F(s).stunUntil = now() + 1.4
					sh.AssemblyLinearVelocity = look * 45 + Vector3.new(0, 18, 0)
					local hum = s.Character and s.Character:FindFirstChildOfClass("Humanoid")
					if hum then hum:TakeDamage(22) end
					toast(s, "The Wendigo's antlers slammed into you!")
				end
			end
		end
		if hit == 0 then toast(p, "Antler charge!") end
		return true
	end
	sfxAll("mimic", h.Position)
	local best, bestD
	for _, s in ipairs(survivors(true)) do
		local sh = hrpOf(s)
		if sh then
			local d = (sh.Position - h.Position).Magnitude
			if d < 70 then
				toast(s, "\"...help me... over here...\" - that voice sounded almost right")
				local hl = Instance.new("Highlight")
				hl.Name = "NH_Reveal"
				hl.FillColor = Color3.fromRGB(255, 40, 40)
				hl.DepthMode = Enum.HighlightDepthMode.AlwaysOnTop
				hl.Parent = s.Character
				Debris:AddItem(hl, 5)
			end
			if d < 40 and (not bestD or d < bestD) then best, bestD = s, d end
		end
	end
	if best then
		local tp = hrpOf(best).Position
		appearNear(p, tp, 4, 7)
		F(best).stunUntil = now() + 0.9
		toast(best, "The Wendigo leapt on you!")
	else toast(p, "You call out in a stolen voice... nobody close enough to leap on") end
	return true
end
ABILITY.cartooncat = function(p)
	local h = hrpOf(p)
	local look = flatLook(h)
	local best, bestD
	for _, s in ipairs(survivors(true)) do
		local sh = hrpOf(s)
		if sh then
			local v = sh.Position - h.Position
			local flat = Vector3.new(v.X, 0, v.Z)
			local d = flat.Magnitude
			if d > 0.1 and d < 70 and look:Dot(flat.Unit) > 0.85 and clearLine(h.Position, sh.Position) and (not bestD or d < bestD) then best, bestD = s, d end
		end
	end
	if not best then toast(p, "The rubber arm grabbed nothing"); return 4 end
	-- stretch a black rubber arm with a white glove out to the survivor, then reel them in
	local sh = hrpOf(best)
	local arm = Instance.new("Part")
	arm.Anchored, arm.CanCollide, arm.CanQuery = true, false, false
	arm.Color = Color3.fromRGB(10, 10, 10)
	arm.Material = Enum.Material.Rubber
	arm.Size = Vector3.new(0.8, 0.8, (sh.Position - h.Position).Magnitude)
	arm.CFrame = CFrame.lookAt((h.Position + sh.Position) / 2 + Vector3.new(0, 1, 0), sh.Position + Vector3.new(0, 1, 0))
	arm.Parent = roundFolder or workspace
	local glove = Instance.new("Part")
	glove.Shape = Enum.PartType.Ball
	glove.Anchored, glove.CanCollide, glove.CanQuery = true, false, false
	glove.Color = Color3.fromRGB(245, 245, 245)
	glove.Size = Vector3.new(2, 2, 2)
	glove.Position = sh.Position + Vector3.new(0, 1, 0)
	glove.Parent = arm
	Debris:AddItem(arm, 0.45)
	local dest = h.Position + look * 5
	best.Character:PivotTo(CFrame.lookAt(dest, h.Position))
	F(best).stunUntil = now() + 1.2
	toast(best, "A rubber arm grabbed you!")
	sfxAll("stretch", h.Position)
	return true
end
ABILITY.locust = function(p)
	local list = survivors(true)
	if #list == 0 then return 3 end
	local target = list[math.random(1, #list)] -- exactly one random survivor
	local tp = hrpOf(target).Position
	local tv, tvD
	for _, v in ipairs(currentMap and currentMap.tvs or {}) do
		local d = (v - tp).Magnitude
		if d < 140 and (not tvD or d < tvD) then tv, tvD = v, d end
	end
	portalFx(hrpOf(p).Position - Vector3.new(0, 3, 0), Color3.fromRGB(30, 30, 34))
	if tv then
		p.Character:PivotTo(CFrame.lookAt(tv + Vector3.new(0, 3, 0), Vector3.new(tp.X, tv.Y + 3, tp.Z))) -- crawls out of a TV / computer screen
		toast(p, "You crawl out of a screen near " .. target.DisplayName .. "...")
	else
		appearNear(p, tp, 60, 90)
		toast(p, "You descend on " .. target.DisplayName .. "...")
	end
	portalFx(hrpOf(p).Position - Vector3.new(0, 3, 0), Color3.fromRGB(220, 220, 220))
	Notify:FireClient(target, "locust")
	Notify:FireClient(p, "sight", 4, target.UserId)
	sfxAll("buzz", hrpOf(p).Position)
	return true
end

ABILITY.sonicexe = function(p)
	F(p).dashUntil = now() + 10 -- "You can't run forever": a scary laugh, then much faster for 10s
	sfxAll("sonic", hrpOf(p).Position)
	for _, s in ipairs(survivors(true)) do toast(s, "A distorted laugh... something very fast is coming.") end
	return true
end

-- v1.4 phase 2: 16 more monsters, omens, ocean storm, boats, Megalodon land form, Father Fester escalation
local P2 = require(script:WaitForChild("Phase2"))({
	ABILITY = ABILITY, F = F, now = now, hrpOf = hrpOf, humOf = humOf, isHunting = isHunting, survivors = survivors, monsters = monsters,
	nearestSurvivor = nearestSurvivor, appearNear = appearNear, portalFx = portalFx, clearLine = clearLine, flatLook = flatLook,
	sfxAll = sfxAll, toast = toast, Notify = Notify, Models = Models, spaceFree = spaceFree, hide = _setMorphTransparency,
	getMap = function() return currentMap end, getFolder = function() return roundFolder end, getProfile = function(p) return profiles[p] end,
})

local function useAbility(p)
	if not isHunting(p) or p:GetAttribute("Role") ~= "Monster" or not hrpOf(p) then return end
	if now() < (cooldowns[p] or 0) then return end
	local kind = p:GetAttribute("Monster")
	local fn = ABILITY[kind]
	local def = Config.MONSTERS[kind]
	if not fn or not def then return end
	local result = fn(p)
	if result then
		local cd = type(result) == "number" and result or def.cd
		cooldowns[p] = now() + cd
		p:SetAttribute("AbilityReadyAt", workspace:GetServerTimeNow() + cd)
		Notify:FireAllClients("ability", p.UserId, kind)
	end
end


---------------------------------------------------------------------------
-- Gear: loot chests/bags, tools (melee, guns, food, drinks), armor, combat, beds, coins
---------------------------------------------------------------------------
local ITEMS = Config.ITEMS
local function rollLoot(kind)
	local tbl = Config.LOOT[kind]
	local total = 0
	for _, w in pairs(tbl) do total += w end
	local r = math.random() * total
	for k, w in pairs(tbl) do
		r -= w
		if r <= 0 then return k end
	end
	return "water"
end
local function addCoins(p, n, why)
	local pr = profiles[p]
	if not pr or n <= 0 then return end
	pr.coins += n
	p:SetAttribute("Coins", pr.coins)
	p:SetAttribute("RoundCoins", (p:GetAttribute("RoundCoins") or 0) + n)
	if why then Notify:FireClient(p, "coins", n, why) end
end

local function toolHandle(id)
	local def = ITEMS[id]
	local h = Instance.new("Part")
	h.Name = "Handle"
	h.CanCollide = false
	h.Massless = true
	h.Color = def.color
	h.Material = Enum.Material.SmoothPlastic
	if def.type == "melee" then
		h.Size = id == "knife" and Vector3.new(0.25, 0.25, 1.6) or Vector3.new(0.35, 0.35, 3.6)
		h.Material = id == "bat" and Enum.Material.Wood or Enum.Material.Metal
	elseif def.type == "gun" then
		h.Size = id == "pistol" and Vector3.new(0.35, 0.7, 1.3) or Vector3.new(0.35, 0.55, 3.6)
		h.Material = Enum.Material.Metal
	else
		h.Size = Vector3.new(0.6, 1, 0.6)
	end
	if def.type == "melee" and id ~= "knife" then -- a head on the bat / axe / crowbar
		local head = Instance.new("Part")
		head.Name = "Head"
		head.CanCollide, head.Massless = false, true
		head.Size = id == "axe" and Vector3.new(0.2, 1.1, 0.9) or Vector3.new(0.5, 0.5, 1)
		head.Color = id == "axe" and Color3.fromRGB(190, 190, 195) or def.color
		head.Material = id == "bat" and Enum.Material.Wood or Enum.Material.Metal
		head.CFrame = h.CFrame * CFrame.new(0, 0, -1.6)
		local w = Instance.new("WeldConstraint"); w.Part0 = h; w.Part1 = head; w.Parent = head
		return h, head
	end
	return h
end

local function makeTool(id, count)
	local def = ITEMS[id]
	local t = Instance.new("Tool")
	t.Name = def.name
	t.ToolTip = def.type == "use" and (def.hp and ("+" .. def.hp .. " hp") or "stamina") or def.name
	t.CanBeDropped = false
	t:SetAttribute("ItemId", id)
	t:SetAttribute("Count", count or 1)
	local h, extra = toolHandle(id)
	h.Parent = t
	if extra then extra.Parent = t end
	if def.type == "gun" then t.GripPos = Vector3.new(0, -0.1, 0.4) end
	return t
end

local function ownedTools(p)
	local list = {}
	local bp = p:FindFirstChildOfClass("Backpack")
	for _, c in ipairs({ bp, p.Character }) do
		if c then for _, t in ipairs(c:GetChildren()) do if t:IsA("Tool") and t:GetAttribute("ItemId") then table.insert(list, t) end end end
	end
	return list
end
local function clearGear(p)
	for _, t in ipairs(ownedTools(p)) do t:Destroy() end
	for _, a in ipairs({ "Vest", "Helmet", "Ammo_light", "Ammo_shells", "Ammo_heavy" }) do p:SetAttribute(a, 0) end
	local c = p.Character
	if c then for _, n in ipairs({ "NH_Vest", "NH_Helmet" }) do local x = c:FindFirstChild(n, true); if x then x:Destroy() end end end
end
local function wearArmor(p, slot)
	local c = p.Character
	if not c or c:FindFirstChild("NH_" .. slot) then return end
	local attachTo = slot == "Vest" and (c:FindFirstChild("UpperTorso") or c:FindFirstChild("Torso")) or c:FindFirstChild("Head")
	if not attachTo then return end
	local a = Instance.new("Part")
	a.Name = "NH_" .. slot
	a.CanCollide, a.Massless, a.CanQuery = false, true, false
	a.Color = ITEMS[slot == "Vest" and "vest" or "helmet"].color
	a.Material = slot == "Vest" and Enum.Material.Fabric or Enum.Material.Metal
	if slot == "Vest" then
		a.Size = attachTo.Size + Vector3.new(0.3, -0.2, 0.3)
		a.CFrame = attachTo.CFrame
	else
		a.Shape = Enum.PartType.Ball
		a.Size = Vector3.new(1.45, 1.1, 1.45)
		a.CFrame = attachTo.CFrame * CFrame.new(0, 0.35, 0)
	end
	local w = Instance.new("WeldConstraint"); w.Part0 = attachTo; w.Part1 = a; w.Parent = a
	a.Parent = c
end

-- give an item; returns false when there is no room
local function giveItem(p, id)
	local def = ITEMS[id]
	if not def then return false end
	if def.type == "ammo" then
		p:SetAttribute("Ammo_" .. def.ammo, (p:GetAttribute("Ammo_" .. def.ammo) or 0) + def.n)
	elseif def.type == "armor" then
		if (p:GetAttribute(def.slot) or 0) >= def.dur * 0.8 then return false end
		p:SetAttribute(def.slot, def.dur)
		wearArmor(p, def.slot)
	else
		local tools = ownedTools(p)
		for _, t in ipairs(tools) do
			if t:GetAttribute("ItemId") == id then
				if def.type == "use" and t:GetAttribute("Count") < 3 then t:SetAttribute("Count", t:GetAttribute("Count") + 1); t.Name = def.name .. " x" .. t:GetAttribute("Count"); return true end
				if def.type == "gun" then p:SetAttribute("Ammo_" .. def.ammo, (p:GetAttribute("Ammo_" .. def.ammo) or 0) + def.start); return true end
				if def.type == "melee" then return false end
			end
		end
		if #tools >= Config.SLOTS then return false end
		makeTool(id).Parent = p:FindFirstChildOfClass("Backpack")
		if def.type == "gun" then p:SetAttribute("Ammo_" .. def.ammo, (p:GetAttribute("Ammo_" .. def.ammo) or 0) + def.start) end
	end
	Notify:FireClient(p, "pickup", id)
	return true
end

-- chests and bags with a ProximityPrompt (E on keyboard, a tap button on touch screens)
local function spawnLoot(list)
	local folder = Instance.new("Folder")
	folder.Name = "Loot"
	folder.Parent = roundFolder
	for i, l in ipairs(list) do
		local m = Instance.new("Model")
		m.Name = l.kind == "chest" and "Chest" or "Bag"
		local base = Instance.new("Part")
		base.Anchored = true
		base.Name = "Base"
		if l.kind == "chest" then
			base.Size = Vector3.new(4, 2.4, 2.6)
			base.Color = Color3.fromRGB(110, 70, 38)
			base.Material = Enum.Material.WoodPlanks
			base.CFrame = CFrame.new(l.pos + Vector3.new(0, 1.4, 0)) * CFrame.Angles(0, math.rad((i * 47) % 360), 0)
			local lid = Instance.new("Part")
			lid.Name = "Lid"
			lid.Anchored = true
			lid.Size = Vector3.new(4.1, 0.7, 2.7)
			lid.Color = Color3.fromRGB(95, 60, 32)
			lid.Material = Enum.Material.WoodPlanks
			lid.CFrame = base.CFrame * CFrame.new(0, 1.55, 0)
			lid.Parent = m
			for _, x in ipairs({ -1.4, 1.4 }) do
				local band = Instance.new("Part")
				band.Anchored, band.CanCollide = true, false
				band.Size = Vector3.new(0.3, 3.2, 2.75)
				band.Color = Color3.fromRGB(60, 60, 64)
				band.Material = Enum.Material.Metal
				band.CFrame = base.CFrame * CFrame.new(x, 0.35, 0)
				band.Parent = m
			end
		else
			base.Shape = Enum.PartType.Ball
			base.Size = Vector3.new(2.6, 2, 2.2)
			base.Color = Color3.fromRGB(60, 72, 44)
			base.Material = Enum.Material.Fabric
			base.CFrame = CFrame.new(l.pos + Vector3.new(0, 1, 0))
		end
		base.Parent = m
		m.PrimaryPart = base
		local prompt = Instance.new("ProximityPrompt")
		prompt.ActionText = l.kind == "chest" and "Open chest" or "Search bag"
		prompt.ObjectText = l.kind == "chest" and "Chest" or "Bag"
		prompt.KeyboardKeyCode = Enum.KeyCode.E
		prompt.HoldDuration = l.kind == "chest" and 0.6 or 0.3
		prompt.MaxActivationDistance = 9
		prompt.RequiresLineOfSight = false
		prompt.Parent = base
		prompt.Triggered:Connect(function(p)
			if not isHunting(p) or p:GetAttribute("Role") ~= "Survivor" or m:GetAttribute("Opened") then return end
			m:SetAttribute("Opened", true)
			prompt.Enabled = false
			local got = {}
			for _ = 1, (l.kind == "chest" and math.random(2, 3) or math.random(1, 2)) do
				local id = rollLoot(l.kind)
				if giveItem(p, id) then table.insert(got, ITEMS[id].name) end
			end
			toast(p, #got > 0 and ("Found: " .. table.concat(got, ", ")) or "Nothing you can carry...")
			addCoins(p, Config.EARN.open)
			sfxAll("open", base.Position)
			local lid = m:FindFirstChild("Lid")
			if lid then lid.CFrame = lid.CFrame * CFrame.new(0, 0.9, 1.2) * CFrame.Angles(math.rad(-70), 0, 0) end
			base.Color = base.Color:Lerp(Color3.new(0, 0, 0), 0.4)
		end)
		m.Parent = folder
	end
end

-- damage to a survivor: the vest soaks 35% (wears down), the helmet 15%
local lastHitBy = {}
local function hurtSurvivor(s, dmg, by)
	local hum = humOf(s)
	if not hum or hum.Health <= 0 then return end
	local red = 0
	for _, slot in ipairs({ "Vest", "Helmet" }) do
		local dur = s:GetAttribute(slot) or 0
		if dur > 0 then
			local def = ITEMS[slot == "Vest" and "vest" or "helmet"]
			red += def.red
			local left = math.max(0, dur - dmg * def.red * 1.6)
			s:SetAttribute(slot, math.floor(left))
			if left <= 0 then
				local x = s.Character and s.Character:FindFirstChild("NH_" .. slot)
				if x then x:Destroy() end
				toast(s, "Your " .. def.name:lower() .. " broke!")
			end
		end
	end
	lastHitBy[s] = by
	hum.Health = math.max(0, hum.Health - dmg * (1 - red))
	Notify:FireClient(s, "hurt")
end
P2.setHurt(hurtSurvivor)

-- monster health and knockdown
local function hurtMonster(m, dmg, by, stun)
	local f = F(m)
	if f.downUntil and now() < f.downUntil then return end
	if P2.isStone(m) then toast(by, "It's made of stone - your hit bounced off!"); return end
	local hp = (m:GetAttribute("MonsterHp") or Config.MON_HP) - dmg
	if by then by:SetAttribute("RoundDmg", (by:GetAttribute("RoundDmg") or 0) + math.min(dmg, math.max(0, m:GetAttribute("MonsterHp") or Config.MON_HP))) end
	if stun then f.stunUntil = math.max(f.stunUntil or 0, now() + stun) end
	if hp <= 0 then
		hp = 0
		f.downUntil = now() + Config.DOWN_TIME
		local def = Config.MONSTERS[m:GetAttribute("Monster")]
		toast(nil, ("%s knocked down %s! It gets back up in %ds - run!"):format(by.DisplayName, def and def.name or "the monster", Config.DOWN_TIME))
		addCoins(by, Config.EARN.knockdown, "Knocked down a monster")
		by:SetAttribute("RoundDowns", (by:GetAttribute("RoundDowns") or 0) + 1)
		sfxAll("down", hrpOf(m) and hrpOf(m).Position)
		task.delay(Config.DOWN_TIME, function()
			if m.Parent then m:SetAttribute("MonsterHp", m:GetAttribute("MonsterMaxHp") or Config.MON_HP) end
		end)
	end
	m:SetAttribute("MonsterHp", hp)
end

local function tracer(a, b)
	local t = Instance.new("Part")
	t.Anchored, t.CanCollide, t.CanQuery, t.CastShadow = true, false, false, false
	t.Material = Enum.Material.Neon
	t.Color = Color3.fromRGB(255, 220, 140)
	t.Size = Vector3.new(0.08, 0.08, (b - a).Magnitude)
	t.CFrame = CFrame.lookAt((a + b) / 2, b)
	t.Parent = roundFolder or workspace
	Debris:AddItem(t, 0.06)
end

-- a monster's body as a vertical capsule for hit tests (morphs are far taller than a normal avatar)
local TALL = { sirenhead = 30, locust = 15, cartooncat = 14, megalodon = 8, megalodon_h = 11, kraken = 12, cthulhu = 13, leviathan = 8, mosasaurus = 7, nessie = 18,
	spinosaurus = 16, trex = 14, yeti = 12, bigfoot = 11, dragon = 14, quetzalcoatlus = 13, fester = 12, gargoyle = 8, vampire = 8, chupacabra = 5, wendigo = 10, dn_guilt = 11 }
local function rayHitsMonster(origin, dir, range)
	local best, bestT
	for _, m in ipairs(monsters()) do
		local h = hrpOf(m)
		if h and isHunting(m) then
			local base = h.Position - Vector3.new(0, 3, 0)
			local top = (TALL[m:GetAttribute("Monster")] or 9)
			local t = (base - origin):Dot(dir)
			if t > 0 and t < range then
				local p = origin + dir * t
				local horiz = Vector2.new(p.X - base.X, p.Z - base.Z).Magnitude
				if horiz < 2.6 and p.Y > base.Y - 1 and p.Y < base.Y + top and (not bestT or t < bestT) then best, bestT = m, t end
			end
		end
	end
	return best, bestT
end

local fireReady = {}
local function useHeld(p, dir)
	if not isHunting(p) or p:GetAttribute("Role") ~= "Survivor" then return end
	local c = p.Character
	local tool = c and c:FindFirstChildOfClass("Tool")
	local id = tool and tool:GetAttribute("ItemId")
	local def = id and ITEMS[id]
	local head = c and c:FindFirstChild("Head")
	if not def or not head then return end
	local t = now()
	if t < (fireReady[p] or 0) then return end
	fireReady[p] = t + (def.rate or 0.6)
	if typeof(dir) ~= "Vector3" or dir.Magnitude < 0.5 then dir = hrpOf(p).CFrame.LookVector end
	dir = dir.Unit
	if def.type == "use" then
		local hum = humOf(p)
		if def.hp then hum.Health = math.min(hum.MaxHealth, hum.Health + def.hp) end
		if def.stam then F(p).stamina = math.min(100, (F(p).stamina or 0) + def.stam) end
		if def.boost then F(p).boostUntil = t + def.boost end
		local n = tool:GetAttribute("Count") - 1
		if n <= 0 then tool:Destroy() else tool:SetAttribute("Count", n); tool.Name = def.name .. (n > 1 and (" x" .. n) or "") end
		sfxAll((id == "water" or id == "soda" or id == "energy") and "drink" or "eat", head.Position)
		return
	end
	if def.type == "melee" then
		sfxAll("swing", head.Position)
		local h = hrpOf(p)
		for _, m in ipairs(monsters()) do
			local mh = hrpOf(m)
			if mh and isHunting(m) then
				local v = mh.Position - h.Position
				local flat = Vector3.new(v.X, 0, v.Z)
				if flat.Magnitude < def.range + 2 and (flat.Magnitude < 3 or flat.Unit:Dot(Vector3.new(dir.X, 0, dir.Z).Unit) > 0.35) then
					hurtMonster(m, def.dmg, p, def.stun)
					sfxAll("hit", mh.Position)
					break
				end
			end
		end
		return
	end
	-- guns: raycast against the world, then test monster bodies along the ray
	local key = "Ammo_" .. def.ammo
	local ammo = p:GetAttribute(key) or 0
	if ammo <= 0 then Notify:FireClient(p, "sfx", "dry", head.Position); return end
	p:SetAttribute(key, ammo - 1)
	sfxAll(id, head.Position)
	local params = RaycastParams.new()
	params.FilterType = Enum.RaycastFilterType.Exclude
	local ex = {}
	for _, pl in ipairs(Players:GetPlayers()) do if pl.Character then table.insert(ex, pl.Character) end end
	params.FilterDescendantsInstances = ex
	local origin = head.Position
	for _ = 1, (def.pellets or 1) do
		local spread = def.spread or 0.03
		local d = (dir + Vector3.new((math.random() - 0.5) * spread * 2, (math.random() - 0.5) * spread * 2, (math.random() - 0.5) * spread * 2)).Unit
		local wall = workspace:Raycast(origin, d * def.range, params)
		local wallT = wall and (wall.Position - origin).Magnitude or def.range
		local m, mt = rayHitsMonster(origin, d, wallT)
		tracer(origin + d * 1.5, origin + d * (mt or wallT))
		if m then hurtMonster(m, def.dmg, p, def.stun) end
	end
end

-- beds: hold the prompt to sleep and heal; moving / jumping / the prompt again wakes you
local sleepers = {}
local function wake(p)
	local sl = sleepers[p]
	if not sl then return end
	sleepers[p] = nil
	p:SetAttribute("Sleeping", false)
	local h = hrpOf(p)
	if h then h.Anchored = false; p.Character:PivotTo(CFrame.new(sl.back)) end
	local hum = humOf(p)
	if hum then hum.PlatformStand = false end
end
local function setupBeds(list)
	for _, bed in ipairs(list) do
		local prompt = Instance.new("ProximityPrompt")
		prompt.ActionText = "Sleep (heal)"
		prompt.ObjectText = "Bed"
		prompt.KeyboardKeyCode = Enum.KeyCode.E
		prompt.HoldDuration = 0.5
		prompt.MaxActivationDistance = 8
		prompt.RequiresLineOfSight = false
		prompt.Parent = bed
		prompt.Triggered:Connect(function(p)
			if sleepers[p] then wake(p); return end
			if not isHunting(p) or p:GetAttribute("Role") ~= "Survivor" then return end
			for _, sl in pairs(sleepers) do if sl.bed == bed then toast(p, "Someone is already sleeping here."); return end end
			local h = hrpOf(p)
			sleepers[p] = { bed = bed, back = h.Position + Vector3.new(0, 1, 0), t = now() }
			p:SetAttribute("Sleeping", true)
			h.Anchored = true
			humOf(p).PlatformStand = true
			p.Character:PivotTo(bed.CFrame * CFrame.new(0, 1.4, 0) * CFrame.Angles(math.rad(-90), 0, 0))
			toast(p, "You lie down... resting heals you. Move or press E to wake up.")
		end)
	end
end

-- survivor customization (lobby locker), saved in a DataStore with pcall
local profileStore
pcall(function() profileStore = DataStoreService:GetDataStore("NightHuntProfile_v1") end)
local function cleanProfile(d)
	d = type(d) == "table" and d or {}
	local look = type(d.look) == "table" and d.look or {}
	local function n(v, m) return math.clamp(math.floor(tonumber(v) or 1), 1, m) end
	local owned = {}
	if type(d.owned) == "table" then for _, k in ipairs(d.owned) do if type(k) == "string" then owned[k] = true end end end
	local function have(cat, k) return k == "none" or k == "classic" or owned[cat .. ":" .. tostring(k)] end
	local out = {
		coins = math.max(0, math.floor(tonumber(d.coins) or 0)),
		coinMig = d.coinMig == true,
		owned = owned,
		look = { sk = n(look.sk, #Config.SKIN_TONES), hc = n(look.hc, #Config.HAIR_COLORS), hs = n(look.hs, 4),
			top = n(look.top, #Config.CLOTHES), pants = n(look.pants or 8, #Config.CLOTHES),
			hat = (type(look.hat) == "string" and Config.SHOP.hat[look.hat] and have("hat", look.hat)) and look.hat or "none",
			acc = (type(look.acc) == "string" and Config.SHOP.acc[look.acc] and have("acc", look.acc)) and look.acc or "none",
			outfit = (type(look.outfit) == "string" and Config.SHOP.outfit[look.outfit] and have("outfit", look.outfit)) and look.outfit or "none",
			pet = (type(look.pet) == "string" and Config.SHOP.pet[look.pet] and have("pet", look.pet)) and look.pet or "none",
			trail = (type(look.trail) == "string" and Config.SHOP.trail[look.trail] and have("trail", look.trail)) and look.trail or "none" },
		kit = {},
		pref = (type(d.pref) == "string" and Config.MONSTERS[d.pref]) and d.pref or "",
		skin = (type(d.skin) == "string" and Config.SHOP.skin[d.skin] and have("skin", d.skin)) and d.skin or "classic",
	}
	if type(d.kit) == "table" then
		for _, k in ipairs(d.kit) do if type(k) == "string" and Config.SHOP.supply[k] and #out.kit < Config.KIT_MAX then table.insert(out.kit, k) end end
	end
	-- One-time starter grant. A richer balance is left alone. The flag stops later loads from topping the wallet back up.
	if not out.coinMig then
		if out.coins < 10000 then out.coins = 10000 end
		out.coinMig = true
	end
	return out
end
local function publishProfile(p)
	local pr = profiles[p]
	if not pr then return end
	local owned = {}
	for k in pairs(pr.owned) do table.insert(owned, k) end
	p:SetAttribute("Coins", pr.coins)
	p:SetAttribute("Profile", HttpService:JSONEncode({ coins = pr.coins, owned = owned, look = pr.look, pref = pr.pref, skin = pr.skin, kit = pr.kit }))
end
local function saveProfile(p)
	local pr = profiles[p]
	if not pr or not profileStore then return end
	local owned = {}
	for k in pairs(pr.owned) do table.insert(owned, k) end
	pcall(function() profileStore:SetAsync("u" .. p.UserId, { coins = pr.coins, coinMig = pr.coinMig == true, owned = owned, look = pr.look, pref = pr.pref, skin = pr.skin, kit = pr.kit }) end)
end
local function loadProfile(p)
	local data
	if profileStore then pcall(function() data = profileStore:GetAsync("u" .. p.UserId) end) end
	if data and type(data.owned) == "table" then -- stored as a list
		local list = data.owned
		data.owned = list
	end
	profiles[p] = cleanProfile(data)
	publishProfile(p)
end

local HAT_BUILD = {
	cap = { Vector3.new(1.3, 0.45, 1.3), Vector3.new(0, 0.65, 0), Color3.fromRGB(200, 40, 40) },
	beanie = { Vector3.new(1.3, 0.7, 1.3), Vector3.new(0, 0.6, 0), Color3.fromRGB(60, 90, 160), true },
	hardhat = { Vector3.new(1.5, 0.55, 1.5), Vector3.new(0, 0.7, 0), Color3.fromRGB(250, 200, 30), true },
	cowboy = { Vector3.new(2.4, 0.15, 2.4), Vector3.new(0, 0.6, 0), Color3.fromRGB(140, 95, 50) },
	headphones = { Vector3.new(1.5, 0.3, 0.3), Vector3.new(0, 0.6, 0), Color3.fromRGB(20, 20, 24) },
	bunny = { Vector3.new(0.3, 1.4, 0.15), Vector3.new(0.3, 1.2, 0), Color3.fromRGB(250, 230, 240) },
	crown = { Vector3.new(1.2, 0.5, 1.2), Vector3.new(0, 0.85, 0), Color3.fromRGB(255, 200, 40) },
}
local ACC_BUILD = {
	glasses = { Vector3.new(1.1, 0.25, 0.1), Vector3.new(0, 0.1, -0.6), Color3.fromRGB(15, 15, 15) },
	scarf = { Vector3.new(1.4, 0.4, 1.4), Vector3.new(0, -0.7, 0), Color3.fromRGB(180, 40, 40) },
	mask = { Vector3.new(1.05, 0.5, 0.1), Vector3.new(0, -0.25, -0.6), Color3.fromRGB(230, 230, 230) },
	goggles = { Vector3.new(1.25, 0.35, 0.2), Vector3.new(0, 0.15, -0.6), Color3.fromRGB(60, 160, 200) },
}
local function applyLook(p)
	local pr = profiles[p]
	local c = p.Character
	if not pr or not c then return end
	local L = pr.look
	local skin, top, pants = Config.SKIN_TONES[L.sk], Config.CLOTHES[L.top], Config.CLOTHES[L.pants]
	local outfit = Config.OUTFITS[L.outfit or "none"]
	if outfit then top, pants = outfit[1], outfit[2] end
	for _, d in ipairs(c:GetChildren()) do
		if d:IsA("Shirt") or d:IsA("Pants") or d:IsA("ShirtGraphic") or d:IsA("Accessory") then d:Destroy() end
		if d:IsA("BasePart") and d.Name ~= "HumanoidRootPart" then
			local n = d.Name
			if n == "Head" or n:find("Hand") then d.Color = skin
			elseif n:find("Torso") or n:find("UpperArm") or n:find("LowerArm") or n:find("Arm") then d.Color = top
			elseif n:find("Leg") or n:find("Foot") then d.Color = pants end
		end
	end
	local head = c:FindFirstChild("Head")
	if not head then return end
	local function stick(name, size, off, color, ball, mat)
		local x = Instance.new("Part")
		x.Name = name
		x.CanCollide, x.Massless, x.CanQuery = false, true, false
		x.Size, x.Color = size, color
		x.Material = mat or Enum.Material.SmoothPlastic
		if ball then x.Shape = Enum.PartType.Ball end
		x.CFrame = head.CFrame * CFrame.new(off)
		local w = Instance.new("WeldConstraint"); w.Part0 = head; w.Part1 = x; w.Parent = x
		x.Parent = c
		return x
	end
	local hair = Config.HAIR_COLORS[L.hc]
	if L.hs == 1 then stick("NH_Hair", Vector3.new(1.25, 0.5, 1.25), Vector3.new(0, 0.45, 0.05), hair, true, Enum.Material.Fabric)
	elseif L.hs == 2 then stick("NH_Hair", Vector3.new(1.3, 0.6, 1.3), Vector3.new(0, 0.4, 0.05), hair, true, Enum.Material.Fabric); stick("NH_Hair2", Vector3.new(1.2, 1.4, 0.4), Vector3.new(0, -0.3, 0.55), hair, false, Enum.Material.Fabric)
	elseif L.hs == 3 then stick("NH_Hair", Vector3.new(1.25, 0.5, 1.25), Vector3.new(0, 0.45, 0.05), hair, true, Enum.Material.Fabric); stick("NH_Bun", Vector3.new(0.6, 0.6, 0.6), Vector3.new(0, 0.6, 0.55), hair, true, Enum.Material.Fabric)
	else stick("NH_Hair", Vector3.new(1.2, 0.3, 1.2), Vector3.new(0, 0.5, 0.02), hair, true, Enum.Material.Sand) end
	local hb = HAT_BUILD[L.hat]
	if hb then
		stick("NH_Hat", hb[1], hb[2], hb[3], hb[4])
		if L.hat == "cowboy" then stick("NH_Hat2", Vector3.new(1.2, 0.7, 1.2), Vector3.new(0, 0.95, 0), hb[3]) end
		if L.hat == "cap" then stick("NH_Hat2", Vector3.new(1, 0.1, 0.7), Vector3.new(0, 0.5, -0.8), hb[3]) end
		if L.hat == "bunny" then stick("NH_Hat2", hb[1], Vector3.new(-0.3, 1.2, 0), hb[3]) end
		if L.hat == "headphones" then for _, x in ipairs({ -0.7, 0.7 }) do stick("NH_Hat3", Vector3.new(0.3, 0.6, 0.6), Vector3.new(x, 0, 0), hb[3]) end end
	end
	local ab = ACC_BUILD[L.acc]
	if ab then stick("NH_Acc", ab[1], ab[2], ab[3], false, L.acc == "goggles" and Enum.Material.Glass or nil) end
	-- v1.4.1: pet that follows you (AlignPosition to a spot behind your shoulder) and a trail behind you
	local hrp = c:FindFirstChild("HumanoidRootPart")
	for _, n in ipairs({ "NH_Pet", "NH_TrailA", "NH_TrailB", "NH_Trail", "NH_PetSpot" }) do
		local old = c:FindFirstChild(n, true)
		while old do old:Destroy(); old = c:FindFirstChild(n, true) end
	end
	if not hrp then return end
	if L.pet and L.pet ~= "none" then
		local pet = Plaza.buildPet(L.pet, 0.8)
		pet.Name = "NH_Pet"
		local body = pet.PrimaryPart
		local spot = Instance.new("Attachment"); spot.Name = "NH_PetSpot"; spot.Position = Vector3.new(2.6, (L.pet == "bat" or L.pet == "owl" or L.pet == "dragon" or L.pet == "ghost") and 2.2 or -1.6, 2); spot.Parent = hrp
		local a0 = Instance.new("Attachment"); a0.Parent = body
		local ap = Instance.new("AlignPosition"); ap.Attachment0 = a0; ap.Attachment1 = spot; ap.Responsiveness = 18; ap.MaxForce = 1e5; ap.Parent = body
		local ao = Instance.new("AlignOrientation"); ao.Attachment0 = a0; ao.Attachment1 = spot; ao.Responsiveness = 18; ao.Parent = body
		pet:PivotTo(hrp.CFrame * CFrame.new(spot.Position))
		pet.Parent = c
		pcall(function() body:SetNetworkOwner(p) end)
	end
	local tc = Config.TRAIL_COLORS[L.trail or "none"]
	if tc then
		local a = Instance.new("Attachment"); a.Name = "NH_TrailA"; a.Position = Vector3.new(0, 0.8, 0.4); a.Parent = hrp
		local b = Instance.new("Attachment"); b.Name = "NH_TrailB"; b.Position = Vector3.new(0, -1.8, 0.4); b.Parent = hrp
		local tr = Instance.new("Trail"); tr.Name = "NH_Trail"; tr.Attachment0 = a; tr.Attachment1 = b
		tr.Lifetime = 0.7; tr.LightEmission = (L.trail == "shadow" or L.trail == "blood") and 0 or 0.8; tr.FaceCamera = true
		if L.trail == "rainbow" then
			tr.Color = ColorSequence.new({ ColorSequenceKeypoint.new(0, Color3.fromRGB(255, 60, 60)), ColorSequenceKeypoint.new(0.33, Color3.fromRGB(255, 220, 60)), ColorSequenceKeypoint.new(0.66, Color3.fromRGB(60, 220, 100)), ColorSequenceKeypoint.new(1, Color3.fromRGB(60, 120, 255)) })
		else tr.Color = ColorSequence.new(tc[1], tc[2]) end
		tr.Transparency = NumberSequence.new(0.1, 1)
		tr.Parent = hrp
	end
end

---------------------------------------------------------------------------
-- Round flow
---------------------------------------------------------------------------
local roundToken = 0
local huntStart = os.clock() -- v1.4.1: for 'time survived' on the death screen

local function cleanupRound()
	if roundFolder then roundFolder:Destroy() end
	roundFolder = nil
	MapGen.clearTerrain()
	currentMap = nil
	extractionOpen = false
	monsterTraps = {}
	portals = {}
end

local function checkEnd()
	if State:GetAttribute("State") ~= "Hunt" then return false end
	if #survivors(true) == 0 or #monsters() == 0 then return true end
	return false
end

local function catchSurvivor(victim, monster)
	if not isHunting(victim) then return end
	wake(victim)
	victim:SetAttribute("Alive", false)
	local kind = monster and monster:GetAttribute("Monster") or ""
	local mname = Config.MONSTERS[kind] and Config.MONSTERS[kind].name or "the dark"
	victim:SetAttribute("Result", "Caught")
	victim:SetAttribute("KilledBy", mname)
	-- v1.4.1: round stats for the YOU DIED screen (shown by the client after the jumpscare animation ends)
	local left = 0
	for _, s in ipairs(survivors(true)) do if s ~= victim then left += 1 end end
	local stats = { killer = mname, by = monster and monster.DisplayName or "", time = math.floor(os.clock() - huntStart),
		dmg = math.floor(victim:GetAttribute("RoundDmg") or 0), downs = victim:GetAttribute("RoundDowns") or 0,
		earn = victim:GetAttribute("RoundCoins") or 0, left = left }
	Notify:FireClient(victim, "jumpscare", kind, monster and monster:GetAttribute("Form") or 1, stats)
	-- everyone nearby sees the catch: the victim is animated in the world per monster, then vanishes
	local vh, mh = hrpOf(victim), monster and hrpOf(monster)
	if vh then
		Notify:FireAllClients("scare", victim.UserId, kind, vh.Position)
		if monster then Notify:FireClient(monster, "kill", kind, victim.UserId, victim.DisplayName) end -- the catcher sees the kill from its own view
		task.spawn(function()
			vh.Anchored = true
			local c0 = vh.CFrame
			local toM = mh and Vector3.new(mh.Position.X - c0.X, 0, mh.Position.Z - c0.Z) or Vector3.zero
			local blood = Instance.new("Part") -- teen-level blood mark on the ground (clients hide it when Blood effects are off)
			blood.Name = "NH_Blood"
			blood.Shape = Enum.PartType.Cylinder
			blood.Size = Vector3.new(0.1, 5, 5)
			blood.CFrame = CFrame.new(c0.Position - Vector3.new(0, 2.9, 0)) * CFrame.Angles(0, 0, math.rad(90))
			blood.Color = Color3.fromRGB(110, 8, 10)
			blood.Material = Enum.Material.SmoothPlastic
			blood.Anchored, blood.CanCollide, blood.CanQuery, blood.CanTouch = true, false, false, false
			blood.Parent = roundFolder or workspace
			Debris:AddItem(blood, 25)
			local saved = {}
			local t0 = os.clock()
			while os.clock() - t0 < 2 and vh.Parent and victim.Character do
				local e = os.clock() - t0
				local cf
				if kind == "sirenhead" then cf = c0 + Vector3.new(0, math.min(22, e * 12), 0)
				elseif kind == "cartooncat" then cf = c0 + toM * math.min(0.8, e * 0.6) + Vector3.new(0, math.min(4, e * 3), 0)
					pcall(function() victim.Character:ScaleTo(1 + e * 0.5) end)
				elseif kind == "boisvert" then cf = c0
					for _, d in ipairs(victim.Character:GetDescendants()) do if d:IsA("BasePart") and d ~= vh then if saved[d] == nil then saved[d] = d.Transparency end; d.Transparency = math.max(d.Transparency, e / 1.8) end end
				elseif kind == "locust" then cf = c0 * CFrame.new((math.random() - 0.5) * 0.6, 0, (math.random() - 0.5) * 0.6) * CFrame.Angles(0, 0, (math.random() - 0.5) * 0.5)
				elseif kind == "megalodon" or kind == "mosasaurus" then cf = c0 + Vector3.new(0, e < 0.9 and e * 6 or (5.4 - (e - 0.9) * 14), 0) -- leap, swallow, dive
				elseif kind == "kraken" or kind == "leviathan" or kind == "nessie" then cf = (c0 + toM * math.min(0.8, e * 0.5)) - Vector3.new(0, math.max(0, e - 0.6) * 6, 0)
				elseif kind == "dragon" or kind == "quetzalcoatlus" or kind == "gargoyle" then cf = c0 + Vector3.new(0, math.min(18, e * e * 8), 0)
				elseif kind == "vampire" or kind == "chupacabra" then cf = (c0 + toM * math.min(0.6, e * 0.5)) * CFrame.Angles(math.min(0.9, e), 0, 0)
				else cf = (c0 + toM * math.min(0.7, e * 0.6)) * CFrame.Angles(-math.min(1.3, e * 1.4), 0, 0) end
				vh.CFrame = cf
				task.wait()
			end
			if vh.Parent then vh.Anchored = false end
			task.wait(0.4)
			for d, v in pairs(saved) do if d.Parent then d.Transparency = v end end
		end)
	end
	toast(nil, ("%s was caught by %s!"):format(victim.DisplayName, mname))
	if monster then monster:SetAttribute("Catches", (monster:GetAttribute("Catches") or 0) + 1); addCoins(monster, Config.EARN.catch, "Caught a survivor") end
	task.delay(2.2, function()
		if victim.Parent and victim.Character then pcall(function() victim.Character:ScaleTo(1) end) end
		if victim.Parent then sendToLobby(victim) end
	end)
end

local function escapeSurvivor(s)
	if not isHunting(s) then return end
	s:SetAttribute("Escaped", true)
	toast(nil, s.DisplayName .. " escaped on the helicopter!")
	Notify:FireClient(s, "escaped")
	sendToLobby(s)
end

local function openExtraction()
	if extractionOpen or not currentMap then return end
	extractionOpen = true
	local heli = Models.helicopter(CFrame.new(currentMap.extract + Vector3.new(0, 0.6, 0)), Color3.fromRGB(150, 140, 40))
	heli.Name = "ExtractionHelicopter"
	heli.Parent = roundFolder
	local beacon = Instance.new("Part")
	beacon.Name = "ExtractBeacon"
	beacon.Anchored = true
	beacon.CanCollide = false
	beacon.Material = Enum.Material.Neon
	beacon.Color = Color3.fromRGB(80, 255, 120)
	beacon.Transparency = 0.6
	beacon.Size = Vector3.new(3, 200, 3)
	beacon.CFrame = CFrame.new(currentMap.extract + Vector3.new(0, 100, 0))
	beacon.Parent = roundFolder
	setState("ExtractX", currentMap.extract.X)
	setState("ExtractZ", currentMap.extract.Z)
	setState("ExtractOpen", true)
	toast(nil, "The extraction helicopter has landed! Follow the green beam!")
end

local function pickRoles(list)
	local n = #list
	local cap = math.max(1, math.floor(n / 3))
	local shuffled = table.clone(list)
	for i = #shuffled, 2, -1 do
		local j = math.random(1, i)
		shuffled[i], shuffled[j] = shuffled[j], shuffled[i]
	end
	local chosen = {}
	for _, p in ipairs(shuffled) do
		if #chosen < cap and math.random() < Config.MONSTER_CHANCE then table.insert(chosen, p) end
	end
	if #chosen == 0 then table.insert(chosen, shuffled[1]) end
	if n == 1 and math.random() < 0.5 then chosen = {} end -- solo Studio test: 50/50 role
	local isMonster = {}
	for _, p in ipairs(chosen) do isMonster[p] = true end
	return isMonster
end

local function placeInMap(p)
	if not currentMap then return end
	local c = p.Character
	if not c then return end
	local role = p:GetAttribute("Role")
	if role == "Monster" then
		local kind = p:GetAttribute("Monster")
		local list = currentMap.monsterSpawns
		if currentMap.ocean and not Config.SEA[kind] and currentMap.landSpawns and #currentMap.landSpawns > 0 then list = currentMap.landSpawns end
		local sp = list[math.random(1, #list)]
		c:PivotTo(CFrame.lookAt(sp, Config.MAP_ORIGIN + Vector3.new(0, sp.Y, 0)))
		Models.morph(c, kind, profiles[p] and profiles[p].skin)
		p:SetAttribute("FesterStage", 0)
		p:SetAttribute("Form", 1)
		F(p).formAt = now() + Config.DN_PERIOD
		p:SetAttribute("FormAt", workspace:GetServerTimeNow() + Config.DN_PERIOD)
		p:SetAttribute("MonsterMaxHp", Config.MON_HP)
		if p:GetAttribute("MonsterHp") == nil then p:SetAttribute("MonsterHp", Config.MON_HP) end
	else
		local sp = currentMap.spawns[math.random(1, #currentMap.spawns)]
		c:PivotTo(CFrame.new(sp))
		giveFlashlight(p)
		applyLook(p)
		local pr = profiles[p]
		if pr and pr.kit and #pr.kit > 0 then -- supplies bought in the store are handed out and used up
			for _, id in ipairs(pr.kit) do giveItem(p, id) end
			toast(p, "Your store supplies are in your backpack.")
			pr.kit = {}
			publishProfile(p)
			task.spawn(saveProfile, p)
		end
		local hum = humOf(p)
		if hum then hum.MaxHealth = 100; hum.Health = 100; hum.BreakJointsOnDeath = false end
	end
end

local function endRound(reason)
	if State:GetAttribute("State") ~= "Hunt" then return end
	roundToken += 1
	local token = roundToken
	setState("State", "Results")
	setState("ExtractOpen", false)
	local escaped, survived, caught = {}, {}, {}
	for _, s in ipairs(survivors(false)) do
		if s:GetAttribute("Escaped") then table.insert(escaped, s.DisplayName)
		elseif s:GetAttribute("Alive") then table.insert(survived, s.DisplayName)
		else table.insert(caught, s.DisplayName) end
	end
	for _, s in ipairs(survivors(false)) do
		wake(s)
		if s:GetAttribute("Escaped") then addCoins(s, Config.EARN.escape, "Escaped") elseif s:GetAttribute("Alive") then addCoins(s, Config.EARN.survive, "Survived") end
	end
	for _, m in ipairs(monsters()) do addCoins(m, Config.EARN.monster, "Hunted") end
	for _, p in ipairs(Players:GetPlayers()) do
		local n = p:GetAttribute("RoundCoins") or 0
		if n > 0 then Notify:FireClient(p, "toast", ("+%d coins this round"):format(n)) end
		task.spawn(saveProfile, p)
	end
	local headline
	if #escaped + #survived > 0 then headline = "SURVIVORS WIN" else headline = "MONSTERS WIN" end
	local lines = {}
	if reason then table.insert(lines, reason) end
	if #escaped > 0 then table.insert(lines, "Escaped: " .. table.concat(escaped, ", ")) end
	if #survived > 0 then table.insert(lines, "Survived the night: " .. table.concat(survived, ", ")) end
	if #caught > 0 then table.insert(lines, "Caught: " .. table.concat(caught, ", ")) end
	for _, m in ipairs(monsters()) do
		local def = Config.MONSTERS[m:GetAttribute("Monster")]
		table.insert(lines, ("%s was %s (%d catches)"):format(m.DisplayName, def and def.name or "?", m:GetAttribute("Catches") or 0))
	end
	-- v1.4.1: full results table (role, result, kills / damage, knockdowns, coins) for every player
	local rows = {}
	for _, p in ipairs(Players:GetPlayers()) do
		local role = p:GetAttribute("Role") or ""
		if role ~= "" then
			local res
			if role == "Monster" then res = ("%d kills"):format(p:GetAttribute("Catches") or 0)
			elseif p:GetAttribute("Escaped") then res = "Escaped"
			elseif p:GetAttribute("Alive") then res = "Survived"
			else res = "Caught" end
			local def = Config.MONSTERS[p:GetAttribute("Monster") or ""]
			table.insert(rows, { id = p.UserId, name = p.DisplayName, role = role == "Monster" and (def and def.name or "Monster") or "Survivor", monster = role == "Monster",
				res = res, kills = p:GetAttribute("Catches") or 0, dmg = math.floor(p:GetAttribute("RoundDmg") or 0), downs = p:GetAttribute("RoundDowns") or 0, coins = p:GetAttribute("RoundCoins") or 0 })
		end
	end
	table.sort(rows, function(a, b) if a.monster ~= b.monster then return a.monster end; return a.coins > b.coins end)
	Notify:FireAllClients("results", headline, lines, rows)
	setState("TimeLeft", Config.RESULTS_TIME)
	task.delay(Config.RESULTS_TIME, function()
		if token ~= roundToken then return end
		cleanupRound()
		for _, p in ipairs(Players:GetPlayers()) do
			clearGear(p)
			resetPlayer(p)
			p:SetAttribute("Catches", 0)
			task.spawn(function() p:LoadCharacter() end)
		end
		setState("Theme", "")
		setState("TimeLeft", 0)
		setState("State", "Lobby")
		updateRegistry()
	end)
end

local function startRound(starter)
	if State:GetAttribute("State") ~= "Lobby" then return end
	local list = Players:GetPlayers()
	local minNeeded = CAN_TELEPORT and Config.MIN_PLAYERS or 1
	if #list < minNeeded then toast(starter, ("Need at least %d players to take off."):format(Config.MIN_PLAYERS)); return end
	for _, p in ipairs(list) do
		if not inPad(p.Character) then toast(starter, p.DisplayName .. " hasn't boarded the helicopter yet."); return end
	end
	roundToken += 1
	local token = roundToken
	cleanupRound()
	local theme = math.random() < 0.3 and Config.MAIN_THEME or Config.THEMES[math.random(1, #Config.THEMES)]
	-- a monster player's lobby pick pulls the round to that monster's home map half the time
	for _, p in ipairs(list) do
		local pref = profiles[p] and profiles[p].pref
		local hm = pref and Config.HOME[pref]
		if hm and math.random() < 0.5 then theme = type(hm) == "table" and hm[math.random(1, #hm)] or hm; break end
	end
	P2.reset()
	setState("Theme", theme)
	setState("State", "Flight")
	setState("TimeLeft", Config.FLIGHT_TIME)
	setState("ExtractOpen", false)
	roundFolder = Instance.new("Folder")
	roundFolder.Name = "Round"
	currentMap = MapGen.generate(theme, math.random(1, 1e9))
	currentMap.model.Parent = roundFolder
	spawnLoot(currentMap.loot or {})
	setupBeds(currentMap.beds or {})
	sleepers = {}
	setState("FogEnd", currentMap.fog)
	setState("FogColor", currentMap.fogColor)
	roundFolder.Parent = workspace

	local isMonster = pickRoles(list)
	local kinds = table.clone(Config.MONSTER_KEYS)
	for _, p in ipairs(list) do
		clearGear(p)
		resetPlayer(p)
		p:SetAttribute("Catches", 0)
		p:SetAttribute("RoundDmg", 0); p:SetAttribute("RoundDowns", 0); p:SetAttribute("RoundCoins", 0); p:SetAttribute("Result", "")
		if isMonster[p] then
			-- the monster the player picked in the lobby locker, if nobody else already has it
			local want = profiles[p] and profiles[p].pref or ""
			local idx = table.find(kinds, want)
			if not idx then -- prefer a monster that lives on this map (sea monsters on the ocean)
				local home = {}
				for i, k in ipairs(kinds) do local hm = Config.HOME[k]; if hm == theme or (type(hm) == "table" and table.find(hm, theme)) then table.insert(home, i) end end
				idx = (#home > 0 and math.random() < 0.7) and home[math.random(1, #home)] or math.random(1, #kinds)
			end
			local k = table.remove(kinds, idx)
			p:SetAttribute("Role", "Monster")
			p:SetAttribute("Monster", k)
			cooldowns[p] = now() + Config.FLIGHT_TIME + 5
			p:SetAttribute("AbilityReadyAt", workspace:GetServerTimeNow() + Config.FLIGHT_TIME + 5)
		else
			p:SetAttribute("Role", "Survivor")
		end
	end
	Notify:FireAllClients("flight", theme)
	updateRegistry()

	task.delay(Config.FLIGHT_TIME, function()
		if token ~= roundToken then return end
		for _, p in ipairs(Players:GetPlayers()) do
			if p:GetAttribute("Role") ~= "" then placeInMap(p) end
		end
		setState("State", "Hunt")
		huntStart = os.clock()
		setState("TimeLeft", settings.roundLen)
		toast(nil, "Survive until the extraction helicopter arrives!")
		-- countdown
		task.spawn(function()
			while token == roundToken and State:GetAttribute("State") == "Hunt" do
				task.wait(1)
				if token ~= roundToken or State:GetAttribute("State") ~= "Hunt" then break end
				local t = State:GetAttribute("TimeLeft") - 1
				setState("TimeLeft", t)
				if t == math.min(Config.EXTRACT_AT, settings.roundLen - 30) then openExtraction() end
				if t <= 0 then endRound("Dawn breaks - time is up."); break end
			end
		end)
	end)
end

---------------------------------------------------------------------------
-- Simulation loop: speeds, stamina, catches, traps, extraction, boarding
---------------------------------------------------------------------------
local acc = 0
RunService.Heartbeat:Connect(function(dt)
	acc += dt
	if acc < 0.1 then return end
	local step = acc
	acc = 0
	local st = State:GetAttribute("State")
	local t = now()
	for _, p in ipairs(Players:GetPlayers()) do
		local hum, hrp = humOf(p), hrpOf(p)
		if hum and hrp then
			local f = F(p)
			local speed = Config.SURVIVOR_SPEED
			local canSprint = true
			local frozen = false
			if st == "Hunt" and p:GetAttribute("Role") == "Monster" and isHunting(p) then
				local def = Config.MONSTERS[p:GetAttribute("Monster")]
				speed = def and def.speed or 19
				if f.dashUntil and t < f.dashUntil then speed *= (p:GetAttribute("Monster") == "sonicexe") and 1.9 or 2.6 end
				speed *= P2.speedMult(p, t)
				canSprint = false
				local mk = p:GetAttribute("Monster")
				if (mk == "trex" or mk == "spinosaurus") and math.random() < dt / 22 then sfxAll(mk == "trex" and "trexroar" or "spinoroar", hrpOf(p).Position) end -- an occasional idle roar
				local forms = Config.FORMS[p:GetAttribute("Monster")]
				if forms and f.formAt and t >= f.formAt then
					setDnForm(p, (p:GetAttribute("Form") or 1) % #forms + 1)
					p:SetAttribute("FormAt", workspace:GetServerTimeNow() + Config.DN_PERIOD)
				end
				if (f.downUntil and t < f.downUntil) or (f.stunUntil and t < f.stunUntil) then frozen = true end
				local down = f.downUntil ~= nil and t < f.downUntil
				if p:GetAttribute("Down") ~= down then p:SetAttribute("Down", down) end
			elseif st == "Hunt" and isHunting(p) then
				if f.greyUntil and t < f.greyUntil then canSprint = false end
				if f.slowUntil and t < f.slowUntil then speed *= 0.5 end
				if (f.stunUntil and t < f.stunUntil) or (f.rootUntil and t < f.rootUntil) then frozen = true end
				if f.boostUntil and t < f.boostUntil then speed *= 1.15 end
				speed *= P2.speedMult(p, t)
				if sleepers[p] and hum.MoveDirection.Magnitude > 0.1 and t - sleepers[p].t > 1 then wake(p) end
				if sleepers[p] then
					hum.Health = math.min(hum.MaxHealth, hum.Health + 6 * step)
					f.stamina = math.min(100, f.stamina + 20 * step)
				end
			end
			local moving = hum.MoveDirection.Magnitude > 0.1
			if f.sprint and canSprint and moving and f.stamina > 0 and not frozen then
				speed *= Config.SPRINT_MULT
				f.stamina = math.max(0, f.stamina - 30 * step)
			else
				f.stamina = math.min(100, f.stamina + 14 * step)
			end
			if frozen then speed = 0 end
			if hum.WalkSpeed ~= speed then hum.WalkSpeed = speed end
			if hum.UseJumpPower then
				local jp = frozen and 0 or 50
				if hum.JumpPower ~= jp then hum.JumpPower = jp end
			else
				local jh = frozen and 0 or 7.2
				if hum.JumpHeight ~= jh then hum.JumpHeight = jh end
			end
			local stam = math.floor(f.stamina)
			if p:GetAttribute("Stamina") ~= stam then p:SetAttribute("Stamina", stam) end
			p:SetAttribute("CanSprint", canSprint)
			if st == "Lobby" then
				local b = inPad(p.Character)
				if p:GetAttribute("Boarded") ~= b then p:SetAttribute("Boarded", b) end
			end
		end
	end

	if st ~= "Hunt" then return end
	P2.tick(step)
	-- monster attacks: hits that deal damage (armor absorbs some); a downed / stunned monster can't attack
	for _, m in ipairs(monsters()) do
		local mh = hrpOf(m)
		local f = F(m)
		if mh and isHunting(m) and not (f.downUntil and t < f.downUntil) and not (f.stunUntil and t < f.stunUntil) and t >= (f.nextHit or 0) then
			local reach = Config.CATCH_REACH + ((TALL[m:GetAttribute("Monster")] or 9) > 12 and 2 or 0)
			for _, s in ipairs(survivors(true)) do
				local sh = hrpOf(s)
				if sh and (Vector3.new(sh.Position.X, 0, sh.Position.Z) - Vector3.new(mh.Position.X, 0, mh.Position.Z)).Magnitude <= reach then
					if sleepers[s] then wake(s) end
					hurtSurvivor(s, Config.MON_DMG, m)
					sfxAll("hit", sh.Position)
					f.nextHit = t + Config.MON_HIT_RATE
					break
				end
			end
		end
	end
	-- cupcake traps
	for owner, traps in pairs(monsterTraps) do
		for i = #traps, 1, -1 do
			local trap = traps[i]
			for _, s in ipairs(survivors(true)) do
				local sh = hrpOf(s)
				if trap.Parent and sh and (Vector3.new(sh.Position.X, 0, sh.Position.Z) - Vector3.new(trap.Position.X, 0, trap.Position.Z)).Magnitude < 3.5 and math.abs(sh.Position.Y - trap.Position.Y) < 6 then
					F(s).rootUntil = t + 2.2
					toast(s, "You stepped in a cupcake trap!")
					toast(owner, s.DisplayName .. " is stuck in your cupcake trap!")
					trap:Destroy()
					table.remove(traps, i)
					break
				end
			end
		end
	end
	-- extraction
	if extractionOpen and currentMap then
		for _, s in ipairs(survivors(true)) do
			local sh = hrpOf(s)
			if sh and (Vector3.new(sh.Position.X, 0, sh.Position.Z) - Vector3.new(currentMap.extract.X, 0, currentMap.extract.Z)).Magnitude < 15 then
				escapeSurvivor(s)
			end
		end
	end
	if checkEnd() then
		if #monsters() == 0 then endRound("All monsters left the game.")
		elseif #survivors(true) == 0 then endRound(nil) end
	end
end)

---------------------------------------------------------------------------
-- Players
---------------------------------------------------------------------------
local function pickNewHost()
	local list = Players:GetPlayers()
	table.sort(list, function(a, b) return (a:GetAttribute("JoinOrder") or 0) < (b:GetAttribute("JoinOrder") or 0) end)
	local h = list[1]
	settings.hostId = h and h.UserId or 0
	publishSettings()
	if h then toast(nil, h.DisplayName .. " is now the host.") end
end

local joinCounter = 0
local function hubAutoJoin(p) end -- defined below (forward)

local function onPlayerAdded(p)
	joinCounter += 1
	p:SetAttribute("JoinOrder", joinCounter)
	resetPlayer(p)
	p:SetAttribute("Catches", 0)
	p:SetAttribute("Boarded", false)
	task.spawn(loadProfile, p)

	if State:GetAttribute("Mode") == "Match" then
		local jd = p:GetJoinData()
		local td = jd and jd.TeleportData
		if settings.code == "" and type(td) == "table" and type(td.code) == "string" then
			settings.code = td.code:sub(1, 8)
			settings.name = tostring(td.name or "Night Hunt"):sub(1, 40)
			settings.max = clampMax(td.max)
			settings.public = td.public == true
			settings.hostId = tonumber(td.hostId) or p.UserId
			publishSettings()
		end
		if settings.hostId == 0 then settings.hostId = p.UserId; publishSettings() end
		if #Players:GetPlayers() > settings.max then
			p:Kick(("This Night Hunt server is full (%d/%d)."):format(settings.max, settings.max))
			return
		end
		if State:GetAttribute("State") ~= "Lobby" then
			p:SetAttribute("Role", "Spectator")
			toast(p, "A round is in progress - wait in the lobby for the next one.")
		end
		updateRegistry()
	else
		task.delay(3, function() hubAutoJoin(p) end)
	end

	p.CharacterAdded:Connect(function(char)
		local hum = char:WaitForChild("Humanoid", 10)
		if not hum then return end
		hum.Died:Connect(function()
			if State:GetAttribute("State") == "Hunt" and p:GetAttribute("Role") == "Survivor" and isHunting(p) then
				catchSurvivor(p, lastHitBy[p])
			end
		end)
		-- v1.4.1: wear your look, pet and trail in the lobby too
		if State:GetAttribute("State") ~= "Hunt" or p:GetAttribute("Role") ~= "Monster" then
			task.delay(0.6, function() if p.Character == char and p:GetAttribute("Role") ~= "Monster" then applyLook(p) end end)
		end
		-- a monster that died (e.g. fell) respawns back into the hunt
		if State:GetAttribute("State") == "Hunt" and p:GetAttribute("Role") == "Monster" then
			task.wait(0.3)
			placeInMap(p)
		end
	end)
end
Players.PlayerAdded:Connect(onPlayerAdded)
for _, p in ipairs(Players:GetPlayers()) do task.spawn(onPlayerAdded, p) end

Players.PlayerRemoving:Connect(function(p)
	saveProfile(p)
	profiles[p] = nil
	sleepers[p] = nil
	lastHitBy[p] = nil
	fireReady[p] = nil
	fx[p] = nil
	cooldowns[p] = nil
	if monsterTraps[p] then for _, tr in ipairs(monsterTraps[p]) do tr:Destroy() end end
	monsterTraps[p] = nil
	if portals[p] then portals[p]:Destroy() end
	portals[p] = nil
	task.defer(function()
		if State:GetAttribute("Mode") == "Match" and p.UserId == settings.hostId then pickNewHost() end
		updateRegistry()
	end)
end)

---------------------------------------------------------------------------
-- Client actions
---------------------------------------------------------------------------
Action.OnServerEvent:Connect(function(p, kind, data)
	if kind == "ability" then
		useAbility(p)
	elseif kind == "sprint" then
		F(p).sprint = data == true
	elseif kind == "flashlight" then
		-- survivors can switch their flashlight on/off (Freddy's Lights Out still forces it off)
		local h = hrpOf(p)
		local fl = h and h:FindFirstChild("NH_Flashlight")
		if not fl or p:GetAttribute("Role") ~= "Survivor" then return end
		local on = p:GetAttribute("FlashOff") == true
		p:SetAttribute("FlashOff", not on)
		if not p:GetAttribute("LightsOut") then
			for _, l in ipairs(fl:GetChildren()) do if l:IsA("SpotLight") then l.Enabled = on end end
		end
	elseif kind == "fire" then
		useHeld(p, data)
	elseif kind == "wake" then
		wake(p)
	elseif kind == "buy" or kind == "equip" then
		-- lobby shop / locker: in-game coins only (no Robux, no real money)
		local pr = profiles[p]
		if not pr or type(data) ~= "table" then return end
		local cat, id = data.cat, data.id
		if not Config.SHOP[cat] or type(id) ~= "string" then return end
		if cat == "supply" then -- round supplies: bought for the next round (max 2), not kept
			local price = Config.SHOP.supply[id]
			if not price or kind ~= "buy" then return end
			if #pr.kit >= Config.KIT_MAX then toast(p, ("Your kit is full (%d supplies max)."):format(Config.KIT_MAX)); return end
			if pr.coins < price then toast(p, "Not enough coins."); return end
			pr.coins -= price
			table.insert(pr.kit, id)
			toast(p, "Packed " .. Config.ITEMS[id].name .. " for the next round")
			publishProfile(p)
			task.spawn(saveProfile, p)
			return
		end
		local free = id == "none" or id == "classic"
		local price = Config.SHOP[cat][id]
		if not free and not price then return end
		local key = cat .. ":" .. id
		if kind == "buy" and not free and not pr.owned[key] then
			if pr.coins < price then toast(p, "Not enough coins."); return end
			pr.coins -= price
			pr.owned[key] = true
			toast(p, "Bought " .. id .. "!")
		end
		if cat == "emote" then -- emotes are owned, not worn (wave is free); play them with the Emote button / B
			publishProfile(p)
			task.spawn(saveProfile, p)
			return
		end
		if free or pr.owned[key] then
			if cat == "skin" then pr.skin = id else pr.look[cat] = id end
			if cat ~= "skin" and p:GetAttribute("Role") ~= "Monster" then applyLook(p) end
		end
		publishProfile(p)
		task.spawn(saveProfile, p)
	elseif kind == "crate" then
		-- Mystery Crates: a random cosmetic you don't own yet (coins only). Everything owned -> coins back.
		local pr = profiles[p]
		if not pr then return end
		if pr.coins < Config.CRATE_PRICE then toast(p, "Not enough coins."); return end
		local pool = {}
		for _, cat in ipairs({ "hat", "acc", "outfit", "skin", "pet", "trail", "emote" }) do
			for id, price in pairs(Config.SHOP[cat]) do
				if price > 0 and not pr.owned[cat .. ":" .. id] then table.insert(pool, { cat, id, price }) end
			end
		end
		pr.coins -= Config.CRATE_PRICE
		local won
		if #pool == 0 then
			pr.coins += 100
			Notify:FireClient(p, "crate", "coins", "100 coins (you own everything!)")
		else
			won = pool[math.random(1, #pool)]
			pr.owned[won[1] .. ":" .. won[2]] = true
			Notify:FireClient(p, "crate", won[1], won[2])
		end
		publishProfile(p)
		task.spawn(saveProfile, p)
	elseif kind == "emote" then
		local pr = profiles[p]
		if not pr or type(data) ~= "string" or not Config.SHOP.emote[data] then return end
		if data ~= "wave" and not pr.owned["emote:" .. data] then toast(p, "Buy that emote in the Emotes & Dances store first."); return end
		p:SetAttribute("Emote", data .. ":" .. tostring(os.clock())) -- the client plays the animation on its own character (replicates)
	elseif kind == "spectate" then
		-- v1.4.1: a caught survivor spectates a living player; stream the map around them
		local target = type(data) == "number" and Players:GetPlayerByUserId(data)
		local th = target and hrpOf(target)
		pcall(function() p.ReplicationFocus = th or nil end)
	elseif kind == "look" then
		local pr = profiles[p]
		if not pr or type(data) ~= "table" then return end
		for _, k in ipairs({ "sk", "hc", "hs", "top", "pants" }) do
			if data[k] ~= nil then
				local c = cleanProfile({ look = { [k] = data[k] } }).look[k]
				pr.look[k] = c
			end
		end
		publishProfile(p)
		if p:GetAttribute("Role") ~= "Monster" then applyLook(p) end -- see it in the dressing-room mirror
	elseif kind == "pref" then
		local pr = profiles[p]
		if not pr then return end
		pr.pref = (type(data) == "string" and Config.MONSTERS[data]) and data or ""
		publishProfile(p)
		task.spawn(saveProfile, p)
	elseif kind == "start" then
		if State:GetAttribute("Mode") ~= "Match" then return end
		if p.UserId ~= settings.hostId then toast(p, "Only the host can take off."); return end
		startRound(p)
	elseif kind == "settings" then
		if State:GetAttribute("Mode") ~= "Match" or p.UserId ~= settings.hostId or type(data) ~= "table" then return end
		if data.max ~= nil then
			local m = clampMax(data.max)
			if m < #Players:GetPlayers() then toast(p, "There are already more players than that."); return end
			settings.max = m
		end
		if data.public ~= nil then settings.public = data.public == true end
		if data.roundLen ~= nil and table.find(Config.ROUND_LENGTHS, tonumber(data.roundLen)) then settings.roundLen = tonumber(data.roundLen) end
		publishSettings()
		updateRegistry()
	end
end)

---------------------------------------------------------------------------
-- Hub: create / join / list
---------------------------------------------------------------------------
local lastHubCall = {}
local function teleportTo(p, access, entry)
	local opts = Instance.new("TeleportOptions")
	opts.ReservedServerAccessCode = access
	opts:SetTeleportData({ code = entry.code, name = entry.name, max = entry.max, public = entry.public, hostId = entry.hostId })
	local ok, err = pcall(function() TeleportService:TeleportAsync(game.PlaceId, { p }, opts) end)
	if not ok then return false, "Teleport failed: " .. tostring(err) end
	return true
end

local function hubCreate(p, data)
	data = type(data) == "table" and data or {}
	local entryName = filterName(data.name, p)
	local max = clampMax(data.max)
	local public = data.public == true
	if not CAN_TELEPORT then
		-- Studio / unpublished place: turn this server into the match so it can be tested.
		setState("Mode", "Match")
		settings.code = "STUDIO"
		settings.name = entryName
		settings.max = max
		settings.public = public
		settings.hostId = p.UserId
		publishSettings()
		return { ok = true, local_ = true, msg = "Studio test: this server is now your match. Board the helicopter and press Take off." }
	end
	if not registry then return { ok = false, msg = "Server list unavailable (enable API Services)." } end
	local code
	for _ = 1, 6 do
		local c = newCode()
		local ok, existing = pcall(function() return registry:GetAsync(c) end)
		if ok and existing == nil then code = c; break end
	end
	if not code then return { ok = false, msg = "Couldn't make a code, try again." } end
	local okR, access = pcall(function() return TeleportService:ReserveServer(game.PlaceId) end)
	if not okR then return { ok = false, msg = "Couldn't reserve a server: " .. tostring(access) } end
	local entry = { code = code, name = entryName, max = max, public = public, host = p.DisplayName, hostId = p.UserId,
		players = 0, state = "Lobby", updated = os.time(), access = access }
	local okS, errS = pcall(function() registry:SetAsync(code, entry, 300) end)
	if not okS then return { ok = false, msg = "Couldn't save the server: " .. tostring(errS) } end
	local okT, errT = teleportTo(p, access, entry)
	if not okT then return { ok = false, msg = errT } end
	return { ok = true, code = code, msg = "Server " .. code .. " created - flying you there..." }
end

local function hubJoin(p, code)
	code = tostring(code or ""):upper():gsub("[^A-Z0-9]", "")
	if #code < 4 then return { ok = false, msg = "Enter a server code." } end
	if not CAN_TELEPORT then return { ok = false, msg = "Joining by code only works in the published game (not in Studio)." } end
	if not registry then return { ok = false, msg = "Server list unavailable." } end
	local ok, entry = pcall(function() return registry:GetAsync(code) end)
	if not ok then return { ok = false, msg = "Lookup failed, try again." } end
	if not entry then return { ok = false, msg = "No server with code " .. code .. "." } end
	if (entry.players or 0) >= (entry.max or Config.MAX_PLAYERS) then
		return { ok = false, msg = ("Server is full (%d/%d)."):format(entry.players or 0, entry.max or 0) }
	end
	local okT, errT = teleportTo(p, entry.access, entry)
	if not okT then return { ok = false, msg = errT } end
	return { ok = true, msg = "Joining " .. tostring(entry.name) .. "..." }
end

local function hubList()
	if not registry or not CAN_TELEPORT then return { ok = true, servers = {} } end
	local ok, items = pcall(function() return registry:GetRangeAsync(Enum.SortDirection.Descending, 100) end)
	if not ok then return { ok = false, servers = {}, msg = "Couldn't load servers." } end
	local list = {}
	for _, it in ipairs(items) do
		local v = it.value
		if type(v) == "table" and v.public and (v.players or 0) > 0 and os.time() - (v.updated or 0) < 90 then
			table.insert(list, { code = it.key, name = v.name, host = v.host, players = v.players, max = v.max, state = v.state })
		end
	end
	table.sort(list, function(a, b) return a.players > b.players end)
	return { ok = true, servers = list }
end

Hub.OnServerInvoke = function(p, kind, data)
	if State:GetAttribute("Mode") ~= "Hub" then return { ok = false, msg = "You're already in a match server." } end
	if kind == "list" then return hubList() end
	local t = os.clock()
	if lastHubCall[p] and t - lastHubCall[p] < 2 then return { ok = false, msg = "Slow down a moment." } end
	lastHubCall[p] = t
	if kind == "create" then return hubCreate(p, data) end
	if kind == "join" then return hubJoin(p, data) end
	return { ok = false, msg = "Unknown request." }
end

-- Invites carry the server code as LaunchData; hub servers auto-join it.
hubAutoJoin = function(p)
	if not p.Parent or State:GetAttribute("Mode") ~= "Hub" then return end
	local jd = p:GetJoinData()
	local code = jd and jd.LaunchData
	if type(code) == "string" and code:match("^[A-Z0-9]+$") and #code <= 8 then
		toast(p, "Invite found - joining server " .. code .. "...")
		local res = hubJoin(p, code)
		if not res.ok then toast(p, res.msg) end
	end
end

TeleportService.TeleportInitFailed:Connect(function(p, _result, msg)
	toast(p, "Teleport failed: " .. tostring(msg))
end)

---------------------------------------------------------------------------
-- Registry heartbeat + shutdown
---------------------------------------------------------------------------
task.spawn(function()
	while true do
		task.wait(15)
		if State:GetAttribute("Mode") == "Match" then updateRegistry() end
	end
end)

game:BindToClose(function()
	for _, p in ipairs(Players:GetPlayers()) do saveProfile(p) end
	if registry and settings.code ~= "" and CAN_TELEPORT then
		pcall(function() registry:RemoveAsync(settings.code) end)
	end
end)
