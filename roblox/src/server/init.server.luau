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

local Shared = ReplicatedStorage:WaitForChild("NightHunt")
local Config = require(Shared:WaitForChild("Config"))
local Models = require(script:WaitForChild("Models"))
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

local IS_STUDIO = RunService:IsStudio()
local CAN_TELEPORT = game.PlaceId ~= 0 and not IS_STUDIO
local IS_RESERVED = game.PrivateServerId ~= "" and game.PrivateServerOwnerId == 0
local IS_VIP = game.PrivateServerId ~= "" and game.PrivateServerOwnerId ~= 0

local settings = { code = "", name = "Night Hunt", max = Config.MAX_PLAYERS, public = false, hostId = 0 }
local function setState(k, v) State:SetAttribute(k, v) end
local function publishSettings()
	setState("ServerCode", settings.code)
	setState("ServerName", settings.name)
	setState("MaxPlayers", settings.max)
	setState("IsPublic", settings.public)
	setState("HostUserId", settings.hostId)
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

local function survivorsNear(pos, radius)
	local list = {}
	for _, s in ipairs(survivors(true)) do
		local h = hrpOf(s)
		if h and (h.Position - pos).Magnitude <= radius then table.insert(list, s) end
	end
	return list
end

local function setMorphTransparency(p, hidden)
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
ABILITY.freddy = function(p)
	for _, s in ipairs(survivors(true)) do
		local h = hrpOf(s)
		local fl = h and h:FindFirstChild("NH_Flashlight")
		if fl then
			for _, l in ipairs(fl:GetChildren()) do l.Enabled = false end
			s:SetAttribute("LightsOut", true)
			task.delay(5, function()
				s:SetAttribute("LightsOut", nil)
				if fl.Parent then for _, l in ipairs(fl:GetChildren()) do l.Enabled = not (l:IsA("SpotLight") and s:GetAttribute("FlashOff")) end end
			end)
		end
		Notify:FireClient(s, "effect", "lightsout", 5)
		toast(s, "Freddy: LIGHTS OUT!")
	end
	return true
end
ABILITY.bonnie = function(p)
	local list = survivorsNear(hrpOf(p).Position, 25)
	for _, s in ipairs(list) do F(s).stunUntil = now() + 1.8; toast(s, "Bonnie's guitar riff stunned you!") end
	toast(p, ("Guitar Riff hit %d survivor(s)"):format(#list))
	return true
end
ABILITY.chica = function(p)
	local h = hrpOf(p)
	monsterTraps[p] = monsterTraps[p] or {}
	local traps = monsterTraps[p]
	if #traps >= 3 then
		local old = table.remove(traps, 1)
		if old then old:Destroy() end
	end
	local trap = Instance.new("Part")
	trap.Name = "CupcakeTrap"
	trap.Shape = Enum.PartType.Cylinder
	trap.Size = Vector3.new(0.6, 3, 3)
	trap.CFrame = CFrame.new(h.Position.X, h.Position.Y - 2.7, h.Position.Z) * CFrame.Angles(0, 0, math.rad(90))
	trap.Color = Color3.fromRGB(255, 122, 182)
	trap.Material = Enum.Material.Neon
	trap.Transparency = 0.25
	trap.Anchored = true
	trap.CanCollide = false
	trap.Parent = roundFolder
	table.insert(traps, trap)
	toast(p, "Cupcake trap placed")
	return true
end
ABILITY.foxy = function(p) F(p).dashUntil = now() + 1.3; return true end
ABILITY.springtrap = function(p)
	local target = nearestSurvivor(hrpOf(p).Position)
	if not target or not currentMap or #currentMap.vents == 0 then toast(p, "No vents nearby"); return false end
	local tp = hrpOf(target).Position
	local best, bestD
	for _, v in ipairs(currentMap.vents) do
		local d = (v - tp).Magnitude
		if not bestD or d < bestD then best, bestD = v, d end
	end
	p.Character:PivotTo(CFrame.new(best))
	toast(p, "You crawled out of a vent")
	return true
end
ABILITY.cartooncat = function(p) F(p).reachUntil = now() + 3; return true end
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
			task.delay(5, function() hl:Destroy() end)
		end
		Notify:FireClient(s, "effect", "siren", 5)
		toast(s, "Siren Head's call revealed everyone!")
	end
	return true
end
ABILITY.boiledone = function(p)
	local list = survivorsNear(hrpOf(p).Position, 40)
	for _, s in ipairs(list) do F(s).slowUntil = now() + 4; toast(s, "The Boiled One's gaze slows you...") end
	toast(p, ("Dread Gaze slowed %d survivor(s)"):format(#list))
	return true
end
ABILITY.drnowhere = function(p)
	local h = hrpOf(p)
	local look = h.CFrame.LookVector
	local flat = Vector3.new(look.X, 0, look.Z)
	if flat.Magnitude < 0.01 then flat = Vector3.new(0, 0, -1) end
	flat = flat.Unit
	for _, dist in ipairs({ 30, 25, 20, 15, 10 }) do
		local target = h.Position + flat * dist
		if currentMap then
			local o = Config.MAP_ORIGIN
			target = Vector3.new(
				math.clamp(target.X, o.X - currentMap.half + 4, o.X + currentMap.half - 4),
				target.Y,
				math.clamp(target.Z, o.Z - currentMap.half + 4, o.Z + currentMap.half - 4))
		end
		if spaceFree(target) then
			p.Character:PivotTo(CFrame.lookAt(target, target + flat))
			return true
		end
	end
	toast(p, "Something blocks the warp")
	return false
end
ABILITY.locust = function(p)
	F(p).invisUntil = now() + 5
	setMorphTransparency(p, true)
	task.delay(5, function()
		if p.Parent and F(p).invisUntil and now() >= F(p).invisUntil - 0.05 then setMorphTransparency(p, false) end
	end)
	toast(p, "You faded into static")
	return true
end
ABILITY.monochrome = function(p)
	for _, s in ipairs(survivors(true)) do
		F(s).greyUntil = now() + 5
		Notify:FireClient(s, "effect", "grey", 5)
		toast(s, "Monochrome drained your color - no sprinting!")
	end
	return true
end
ABILITY.demogorgon = function(p)
	local h = hrpOf(p)
	local portal = portals[p]
	if portal and portal.Parent then
		p.Character:PivotTo(CFrame.new(portal.Position + Vector3.new(0, 3, 0)))
		portal:Destroy()
		portals[p] = nil
		p:SetAttribute("PortalSet", false)
		toast(p, "You came out of the Upside Down")
		return true
	end
	local part = Instance.new("Part")
	part.Name = "UpsideDownPortal"
	part.Shape = Enum.PartType.Cylinder
	part.Size = Vector3.new(0.3, 7, 7)
	part.CFrame = CFrame.new(h.Position.X, h.Position.Y - 2.8, h.Position.Z) * CFrame.Angles(0, 0, math.rad(90))
	part.Color = Color3.fromRGB(150, 20, 30)
	part.Material = Enum.Material.Neon
	part.Anchored = true
	part.CanCollide = false
	part.Parent = roundFolder
	portals[p] = part
	p:SetAttribute("PortalSet", true)
	toast(p, "Portal placed - use the ability again to jump back to it")
	return "short"
end

local function useAbility(p)
	if not isHunting(p) or p:GetAttribute("Role") ~= "Monster" or not hrpOf(p) then return end
	if now() < (cooldowns[p] or 0) then return end
	local kind = p:GetAttribute("Monster")
	local fn = ABILITY[kind]
	local def = Config.MONSTERS[kind]
	if not fn or not def then return end
	local result = fn(p)
	if result then
		local cd = result == "short" and 2 or def.cd
		cooldowns[p] = now() + cd
		p:SetAttribute("AbilityReadyAt", workspace:GetServerTimeNow() + cd)
		Notify:FireAllClients("ability", p.UserId, kind)
	end
end

---------------------------------------------------------------------------
-- Round flow
---------------------------------------------------------------------------
local roundToken = 0

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
	victim:SetAttribute("Alive", false)
	local kind = monster and monster:GetAttribute("Monster") or ""
	local mname = Config.MONSTERS[kind] and Config.MONSTERS[kind].name or "the dark"
	Notify:FireClient(victim, "jumpscare", kind)
	toast(nil, ("%s was caught by %s!"):format(victim.DisplayName, mname))
	if monster then monster:SetAttribute("Catches", (monster:GetAttribute("Catches") or 0) + 1) end
	task.delay(2.2, function()
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
		local sp = currentMap.monsterSpawns[math.random(1, #currentMap.monsterSpawns)]
		c:PivotTo(CFrame.lookAt(sp, Config.MAP_ORIGIN + Vector3.new(0, 4, 0)))
		Models.morph(c, p:GetAttribute("Monster"))
	else
		local sp = currentMap.spawns[math.random(1, #currentMap.spawns)]
		c:PivotTo(CFrame.new(sp))
		giveFlashlight(p)
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
	Notify:FireAllClients("results", headline, lines)
	setState("TimeLeft", Config.RESULTS_TIME)
	task.delay(Config.RESULTS_TIME, function()
		if token ~= roundToken then return end
		cleanupRound()
		for _, p in ipairs(Players:GetPlayers()) do
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
	local theme = Config.THEMES[math.random(1, #Config.THEMES)]
	setState("Theme", theme)
	setState("State", "Flight")
	setState("TimeLeft", Config.FLIGHT_TIME)
	setState("ExtractOpen", false)
	roundFolder = Instance.new("Folder")
	roundFolder.Name = "Round"
	currentMap = MapGen.generate(theme, math.random(1, 1e9))
	currentMap.model.Parent = roundFolder
	setState("FogEnd", currentMap.fog)
	setState("FogColor", currentMap.fogColor)
	roundFolder.Parent = workspace

	local isMonster = pickRoles(list)
	local kinds = table.clone(Config.MONSTER_KEYS)
	for _, p in ipairs(list) do
		resetPlayer(p)
		p:SetAttribute("Catches", 0)
		if isMonster[p] then
			local k = table.remove(kinds, math.random(1, #kinds))
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
		setState("TimeLeft", Config.ROUND_TIME)
		toast(nil, "Survive until the extraction helicopter arrives!")
		-- countdown
		task.spawn(function()
			while token == roundToken and State:GetAttribute("State") == "Hunt" do
				task.wait(1)
				if token ~= roundToken or State:GetAttribute("State") ~= "Hunt" then break end
				local t = State:GetAttribute("TimeLeft") - 1
				setState("TimeLeft", t)
				if t == Config.EXTRACT_AT then openExtraction() end
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
				if f.dashUntil and t < f.dashUntil then speed *= 2.6 end
				canSprint = false
			elseif st == "Hunt" and isHunting(p) then
				if f.greyUntil and t < f.greyUntil then canSprint = false end
				if f.slowUntil and t < f.slowUntil then speed *= 0.5 end
				if (f.stunUntil and t < f.stunUntil) or (f.rootUntil and t < f.rootUntil) then frozen = true end
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
	-- catches
	for _, m in ipairs(monsters()) do
		local mh = hrpOf(m)
		if mh and isHunting(m) then
			local f = F(m)
			local reach = Config.CATCH_REACH * ((f.reachUntil and t < f.reachUntil) and 3 or 1)
			for _, s in ipairs(survivors(true)) do
				local sh = hrpOf(s)
				if sh and (sh.Position - mh.Position).Magnitude <= reach then catchSurvivor(s, m) end
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
				catchSurvivor(p, nil)
			end
		end)
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
	if registry and settings.code ~= "" and CAN_TELEPORT then
		pcall(function() registry:RemoveAsync(settings.code) end)
	end
end)
