--[[ Night Hunt (fan-made) - client: UI, lighting, input, effects ]]
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")
local ContextActionService = game:GetService("ContextActionService")
local RunService = game:GetService("RunService")
local Lighting = game:GetService("Lighting")
local TweenService = game:GetService("TweenService")
local SocialService = game:GetService("SocialService")

local player = Players.LocalPlayer
local Shared = ReplicatedStorage:WaitForChild("NightHunt")
local Config = require(Shared:WaitForChild("Config"))
local Remotes = Shared:WaitForChild("Remotes")
local Action = Remotes:WaitForChild("Action")
local Notify = Remotes:WaitForChild("Notify")
local Hub = Remotes:WaitForChild("Hub")
local State = Shared:WaitForChild("State")
local Templates = Shared:WaitForChild("Templates")

---------------------------------------------------------------------------
-- UI helpers
---------------------------------------------------------------------------
local RED = Color3.fromRGB(200, 35, 35)
local DARK = Color3.fromRGB(14, 12, 16)
local PANEL = Color3.fromRGB(24, 20, 26)
local TEXT = Color3.fromRGB(235, 228, 220)
local MUTED = Color3.fromRGB(150, 140, 140)

local gui = Instance.new("ScreenGui")
gui.Name = "NightHuntUI"
gui.ResetOnSpawn = false
gui.IgnoreGuiInset = true
gui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
gui.Parent = player:WaitForChild("PlayerGui")

local function new(className, props, parent)
	local i = Instance.new(className)
	for k, v in pairs(props) do i[k] = v end
	i.Parent = parent
	return i
end
local function corner(o, r) new("UICorner", { CornerRadius = UDim.new(0, r or 8) }, o) end
local function label(parent, text, size, props)
	local l = new("TextLabel", {
		BackgroundTransparency = 1, Text = text, TextColor3 = TEXT, Font = Enum.Font.GothamMedium,
		TextSize = size or 16, TextWrapped = true, Size = UDim2.new(1, 0, 0, (size or 16) + 6),
	}, parent)
	for k, v in pairs(props or {}) do l[k] = v end
	return l
end
local function button(parent, text, props, onClick)
	local b = new("TextButton", {
		BackgroundColor3 = RED, Text = text, TextColor3 = Color3.new(1, 1, 1), Font = Enum.Font.GothamBold,
		TextSize = 16, Size = UDim2.new(1, 0, 0, 36), AutoButtonColor = true,
	}, parent)
	corner(b, 6)
	for k, v in pairs(props or {}) do b[k] = v end
	if onClick then b.MouseButton1Click:Connect(onClick) end
	return b
end
local function textbox(parent, placeholder, props)
	local t = new("TextBox", {
		BackgroundColor3 = DARK, PlaceholderText = placeholder, Text = "", TextColor3 = TEXT,
		PlaceholderColor3 = MUTED, Font = Enum.Font.Gotham, TextSize = 16, ClearTextOnFocus = false,
		Size = UDim2.new(1, 0, 0, 34),
	}, parent)
	corner(t, 6)
	for k, v in pairs(props or {}) do t[k] = v end
	return t
end
local function list(parent, pad)
	new("UIListLayout", { Padding = UDim.new(0, pad or 6), SortOrder = Enum.SortOrder.LayoutOrder, HorizontalAlignment = Enum.HorizontalAlignment.Center }, parent)
end
local function padding(parent, px)
	new("UIPadding", { PaddingTop = UDim.new(0, px), PaddingBottom = UDim.new(0, px), PaddingLeft = UDim.new(0, px), PaddingRight = UDim.new(0, px) }, parent)
end

---------------------------------------------------------------------------
-- HUD
---------------------------------------------------------------------------
local top = new("Frame", { BackgroundColor3 = DARK, BackgroundTransparency = 0.25, Size = UDim2.new(0, 360, 0, 58), Position = UDim2.new(0.5, -180, 0, 8) }, gui)
corner(top, 10)
local stateLbl = label(top, "NIGHT HUNT", 22, { Font = Enum.Font.Creepster, TextColor3 = RED, Position = UDim2.new(0, 0, 0, 4) })
local subLbl = label(top, "", 14, { TextColor3 = MUTED, Position = UDim2.new(0, 0, 0, 32) })

local roleCard = new("Frame", { BackgroundColor3 = DARK, BackgroundTransparency = 0.2, Size = UDim2.new(0, 270, 0, 150), Position = UDim2.new(0, 12, 1, -230), Visible = false }, gui)
corner(roleCard, 10)
padding(roleCard, 10)
list(roleCard, 4)
local roleTitle = label(roleCard, "", 20, { Font = Enum.Font.GothamBlack, LayoutOrder = 1 })
local roleDesc = label(roleCard, "", 13, { TextColor3 = MUTED, LayoutOrder = 2, Size = UDim2.new(1, 0, 0, 34) })
local abilityBtn = button(roleCard, "", { LayoutOrder = 3, TextSize = 14 }, function() Action:FireServer("ability") end)
local abilityDesc = label(roleCard, "", 12, { TextColor3 = MUTED, LayoutOrder = 4, Size = UDim2.new(1, 0, 0, 30) })

local staminaBg = new("Frame", { BackgroundColor3 = DARK, Size = UDim2.new(0, 220, 0, 10), Position = UDim2.new(0.5, -110, 1, -34), Visible = false }, gui)
corner(staminaBg, 5)
local staminaFill = new("Frame", { BackgroundColor3 = Color3.fromRGB(230, 200, 80), Size = UDim2.new(1, 0, 1, 0) }, staminaBg)
corner(staminaFill, 5)
local staminaHint = label(staminaBg, "Shift = sprint", 12, { TextColor3 = MUTED, Position = UDim2.new(0, 0, 0, -20) })

local logFrame = new("Frame", { BackgroundTransparency = 1, Size = UDim2.new(0, 330, 0, 200), Position = UDim2.new(1, -342, 0, 80) }, gui)
new("UIListLayout", { Padding = UDim.new(0, 4), VerticalAlignment = Enum.VerticalAlignment.Top, SortOrder = Enum.SortOrder.LayoutOrder }, logFrame)
local logN = 0
local function toast(msg)
	logN += 1
	local l = label(logFrame, msg, 14, {
		BackgroundTransparency = 0.35, BackgroundColor3 = DARK, TextXAlignment = Enum.TextXAlignment.Left,
		AutomaticSize = Enum.AutomaticSize.Y, Size = UDim2.new(1, 0, 0, 0), LayoutOrder = logN,
	})
	padding(l, 5)
	corner(l, 6)
	local kids = {}
	for _, c in ipairs(logFrame:GetChildren()) do if c:IsA("TextLabel") then table.insert(kids, c) end end
	table.sort(kids, function(a, b) return a.LayoutOrder < b.LayoutOrder end)
	while #kids > 6 do table.remove(kids, 1):Destroy() end
	task.delay(7, function()
		if l.Parent then
			TweenService:Create(l, TweenInfo.new(0.6), { TextTransparency = 1, BackgroundTransparency = 1 }):Play()
			task.wait(0.7)
			l:Destroy()
		end
	end)
end

---------------------------------------------------------------------------
-- Hub panel (create / join / public list)
---------------------------------------------------------------------------
local hub = new("Frame", { BackgroundColor3 = PANEL, Size = UDim2.new(0, 420, 0, 470), Position = UDim2.new(0.5, -210, 0.5, -215), Visible = false }, gui)
corner(hub, 12)
padding(hub, 14)
list(hub, 8)
label(hub, "NIGHT HUNT", 38, { Font = Enum.Font.Creepster, TextColor3 = RED, LayoutOrder = 1 })
label(hub, "Fan-made monster survival - 2 to 15 players - RATED 13+", 13, { TextColor3 = MUTED, LayoutOrder = 2 })
local tabs = new("Frame", { BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 32), LayoutOrder = 3 }, hub)
new("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 6) }, tabs)
local pages = {}
local tabButtons = {}
local function showTab(name)
	for n, pg in pairs(pages) do pg.Visible = n == name end
	for n, b in pairs(tabButtons) do b.BackgroundColor3 = n == name and RED or DARK end
end
for i, n in ipairs({ "Create", "Join code", "Public servers" }) do
	tabButtons[n] = button(tabs, n, { Size = UDim2.new(1 / 3, -4, 1, 0), LayoutOrder = i, TextSize = 14 }, function() showTab(n) end)
	local pg = new("Frame", { BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 300), LayoutOrder = 4, Visible = false }, hub)
	list(pg, 8)
	pages[n] = pg
end
local hubStatus = label(hub, "", 13, { TextColor3 = Color3.fromRGB(255, 200, 120), LayoutOrder = 5, Size = UDim2.new(1, 0, 0, 34) })

-- Create page
local createMax = 8
local createPublic = false
local cp = pages["Create"]
local nameBox = textbox(cp, "Server name (optional)", { LayoutOrder = 1 })
local maxRow = new("Frame", { BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 36), LayoutOrder = 2 }, cp)
local maxLbl = label(maxRow, "", 16, { Size = UDim2.new(1, -100, 1, 0), TextXAlignment = Enum.TextXAlignment.Left })
local function refreshMax() maxLbl.Text = ("Max players: %d"):format(createMax) end
button(maxRow, "-", { Size = UDim2.new(0, 44, 1, 0), Position = UDim2.new(1, -94, 0, 0) }, function() createMax = math.max(2, createMax - 1); refreshMax() end)
button(maxRow, "+", { Size = UDim2.new(0, 44, 1, 0), Position = UDim2.new(1, -44, 0, 0) }, function() createMax = math.min(Config.MAX_PLAYERS, createMax + 1); refreshMax() end)
refreshMax()
local privacyBtn
local function refreshPrivacy()
	privacyBtn.Text = createPublic and "Privacy: PUBLIC (listed in the server browser)" or "Privacy: FRIENDS ONLY (join by code / invite)"
	privacyBtn.BackgroundColor3 = createPublic and Color3.fromRGB(40, 110, 60) or Color3.fromRGB(70, 60, 120)
end
privacyBtn = button(cp, "", { LayoutOrder = 3, TextSize = 13 }, function() createPublic = not createPublic; refreshPrivacy() end)
refreshPrivacy()
local busy = false
button(cp, "CREATE SERVER", { LayoutOrder = 4, Size = UDim2.new(1, 0, 0, 44), TextSize = 18 }, function()
	if busy then return end
	busy = true
	hubStatus.Text = "Creating server..."
	local ok, res = pcall(function() return Hub:InvokeServer("create", { name = nameBox.Text, max = createMax, public = createPublic }) end)
	busy = false
	hubStatus.Text = ok and res and res.msg or "Something went wrong."
end)
label(cp, "You'll be flown to your own private server. Share its code with friends, or make it public.", 12, { TextColor3 = MUTED, LayoutOrder = 5, Size = UDim2.new(1, 0, 0, 32) })

-- Join page
local jp = pages["Join code"]
local codeBox = textbox(jp, "Enter server code, e.g. K7Q2M", { LayoutOrder = 1, TextSize = 20 })
button(jp, "JOIN", { LayoutOrder = 2, Size = UDim2.new(1, 0, 0, 44), TextSize = 18 }, function()
	if busy then return end
	busy = true
	hubStatus.Text = "Looking up " .. codeBox.Text:upper() .. "..."
	local ok, res = pcall(function() return Hub:InvokeServer("join", codeBox.Text) end)
	busy = false
	hubStatus.Text = ok and res and res.msg or "Something went wrong."
end)

-- Public list page
local pp = pages["Public servers"]
local scroller = new("ScrollingFrame", { BackgroundColor3 = DARK, Size = UDim2.new(1, 0, 0, 250), LayoutOrder = 2, CanvasSize = UDim2.new(), AutomaticCanvasSize = Enum.AutomaticSize.Y, ScrollBarThickness = 6 }, pp)
corner(scroller, 6)
padding(scroller, 6)
list(scroller, 6)
local function refreshList()
	local ok, res = pcall(function() return Hub:InvokeServer("list") end)
	for _, c in ipairs(scroller:GetChildren()) do if c:IsA("Frame") or c:IsA("TextLabel") then c:Destroy() end end
	if not ok or not res then label(scroller, "Couldn't load servers.", 14); return end
	if #res.servers == 0 then
		label(scroller, State:GetAttribute("Studio") and "The server browser works in the published game." or "No public servers right now - create one!", 14, { TextColor3 = MUTED })
	end
	for i, s in ipairs(res.servers) do
		local row = new("Frame", { BackgroundColor3 = PANEL, Size = UDim2.new(1, 0, 0, 46), LayoutOrder = i }, scroller)
		corner(row, 6)
		label(row, ("%s"):format(s.name), 15, { TextXAlignment = Enum.TextXAlignment.Left, Position = UDim2.new(0, 8, 0, 2), Size = UDim2.new(1, -90, 0, 20) })
		label(row, ("host %s - %d/%d - %s"):format(s.host or "?", s.players, s.max, s.state == "Lobby" and "in lobby" or "round in progress"), 12, { TextColor3 = MUTED, TextXAlignment = Enum.TextXAlignment.Left, Position = UDim2.new(0, 8, 0, 24), Size = UDim2.new(1, -90, 0, 16) })
		local full = s.players >= s.max
		button(row, full and "FULL" or "JOIN", { Size = UDim2.new(0, 70, 0, 32), Position = UDim2.new(1, -78, 0, 7), BackgroundColor3 = full and Color3.fromRGB(70, 70, 70) or RED }, function()
			if full then return end
			hubStatus.Text = "Joining " .. s.name .. "..."
			local ok2, r2 = pcall(function() return Hub:InvokeServer("join", s.code) end)
			hubStatus.Text = ok2 and r2 and r2.msg or "Something went wrong."
		end)
	end
end
button(pp, "Refresh", { LayoutOrder = 1, Size = UDim2.new(1, 0, 0, 30), BackgroundColor3 = Color3.fromRGB(60, 50, 60) }, refreshList)
tabButtons["Public servers"].MouseButton1Click:Connect(refreshList)
showTab("Create")
local hubToggle = button(gui, "Servers", { Size = UDim2.new(0, 110, 0, 34), Position = UDim2.new(0, 12, 0, 12), Visible = false }, function() hub.Visible = not hub.Visible end)

---------------------------------------------------------------------------
-- Match lobby panel
---------------------------------------------------------------------------
local lobbyPanel = new("Frame", { BackgroundColor3 = PANEL, BackgroundTransparency = 0.1, Size = UDim2.new(0, 290, 0, 400), Position = UDim2.new(1, -302, 1, -412), Visible = false }, gui)
corner(lobbyPanel, 12)
padding(lobbyPanel, 10)
list(lobbyPanel, 6)
local lpName = label(lobbyPanel, "", 18, { Font = Enum.Font.GothamBlack, LayoutOrder = 1 })
local lpCode = label(lobbyPanel, "", 15, { TextColor3 = Color3.fromRGB(255, 210, 120), LayoutOrder = 2, Size = UDim2.new(1, 0, 0, 38) })
local lpPlayers = new("TextLabel", { BackgroundColor3 = DARK, TextColor3 = TEXT, Font = Enum.Font.Gotham, TextSize = 13, TextXAlignment = Enum.TextXAlignment.Left, TextYAlignment = Enum.TextYAlignment.Top, Size = UDim2.new(1, 0, 0, 130), LayoutOrder = 3, TextWrapped = true }, lobbyPanel)
corner(lpPlayers, 6)
padding(lpPlayers, 6)
local hostRow = new("Frame", { BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 32), LayoutOrder = 4 }, lobbyPanel)
local hostMaxLbl = label(hostRow, "", 14, { Size = UDim2.new(1, -84, 1, 0), TextXAlignment = Enum.TextXAlignment.Left })
button(hostRow, "-", { Size = UDim2.new(0, 38, 1, 0), Position = UDim2.new(1, -80, 0, 0) }, function() Action:FireServer("settings", { max = (State:GetAttribute("MaxPlayers") or 8) - 1 }) end)
button(hostRow, "+", { Size = UDim2.new(0, 38, 1, 0), Position = UDim2.new(1, -38, 0, 0) }, function() Action:FireServer("settings", { max = (State:GetAttribute("MaxPlayers") or 8) + 1 }) end)
local hostPrivacy = button(lobbyPanel, "", { LayoutOrder = 5, TextSize = 13 }, function() Action:FireServer("settings", { public = not State:GetAttribute("IsPublic") }) end)
local takeOff = button(lobbyPanel, "TAKE OFF", { LayoutOrder = 6, Size = UDim2.new(1, 0, 0, 44), TextSize = 20 }, function() Action:FireServer("start") end)
local inviteBtn = button(lobbyPanel, "Invite friends", { LayoutOrder = 7, BackgroundColor3 = Color3.fromRGB(70, 60, 120) }, function()
	local opts = Instance.new("ExperienceInviteOptions")
	opts.PromptMessage = "Join my Night Hunt server!"
	opts.LaunchData = State:GetAttribute("ServerCode") or ""
	local ok, can = pcall(function() return SocialService:CanSendGameInviteAsync(player) end)
	if ok and can then
		pcall(function() SocialService:PromptGameInvite(player, opts) end)
	else
		toast("Invites aren't available here - share the code instead.")
	end
end)
local lpHint = label(lobbyPanel, "", 12, { TextColor3 = MUTED, LayoutOrder = 8, Size = UDim2.new(1, 0, 0, 40) })

---------------------------------------------------------------------------
-- Overlays: flight, results, jumpscare, effects
---------------------------------------------------------------------------
local overlay = new("Frame", { BackgroundColor3 = Color3.new(0, 0, 0), Size = UDim2.fromScale(1, 1), Visible = false, ZIndex = 20 }, gui)
local overlayTitle = label(overlay, "", 48, { Font = Enum.Font.Creepster, TextColor3 = RED, Position = UDim2.new(0, 0, 0.32, 0), Size = UDim2.new(1, 0, 0, 60), ZIndex = 21 })
local overlayText = label(overlay, "", 18, { Position = UDim2.new(0.1, 0, 0.32, 70), Size = UDim2.new(0.8, 0, 0, 220), TextYAlignment = Enum.TextYAlignment.Top, ZIndex = 21 })

local scare = new("ViewportFrame", { BackgroundColor3 = Color3.new(0, 0, 0), Size = UDim2.fromScale(1, 1), Visible = false, ZIndex = 30, Ambient = Color3.fromRGB(255, 120, 120), LightColor = Color3.fromRGB(255, 220, 220) }, gui)
local scareCam = Instance.new("Camera")
scareCam.FieldOfView = 50
scareCam.Parent = scare
scare.CurrentCamera = scareCam
-- 2D layer over the 3D jumpscare: static / dissolve / black cut / blood splatter / caption
local scareFx = new("Frame", { BackgroundTransparency = 1, Size = UDim2.fromScale(1, 1), ZIndex = 32, ClipsDescendants = true }, scare)
local scareBlack = new("Frame", { BackgroundColor3 = Color3.new(0, 0, 0), Size = UDim2.fromScale(1, 1), ZIndex = 33, Visible = false }, scareFx)
local scareText = label(scareFx, "CAUGHT", 70, { Font = Enum.Font.Creepster, TextColor3 = RED, Position = UDim2.new(0, 0, 0.42, 0), Size = UDim2.new(1, 0, 0, 80), ZIndex = 36, Visible = false })
local bloodOn = true -- settings toggle (default on). Teen-level only: red splatter / drips, no gore.
local IMPACT = { sirenhead = 2.0, cartooncat = 1.9, boisvert = 2.0, locust = 1.9,
	-- v1.4 phase 2 (keyed by template: the Megalodon has a water and a land form)
	megalodon = 1.95, megalodon_h = 1.45, kraken = 1.7, cthulhu = 1.8, leviathan = 1.7, mosasaurus = 1.25, nessie = 1.55, spinosaurus = 1.6,
	yeti = 1.6, chupacabra = 1.05, vampire = 1.45, bigfoot = 1.5, trex = 1.6, quetzalcoatlus = 1.35, gargoyle = 1.35, dragon = 1.5, fester = 1.75, wendigo = 1.15, wendigo_h = 1.3, dn_conezone = 1.25, dn_guilt = 1.35 }
local SCARE_LEN = 2.6
local scareRun = 0

local function splat(parent, x, y, r, z)
	local f = new("Frame", { BackgroundColor3 = Color3.fromRGB(120 + math.random(0, 40), 0, 6), AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.fromScale(x, y), Size = UDim2.fromOffset(r, r), ZIndex = z or 34, BackgroundTransparency = 0.05 }, parent)
	corner(f, r)
	for _ = 1, 5 do -- droplets around the splat
		local d = math.random(6, math.max(8, math.floor(r / 4)))
		local a = math.random() * math.pi * 2
		local q = new("Frame", { BackgroundColor3 = f.BackgroundColor3, AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.new(x, math.cos(a) * r * 0.8, y, math.sin(a) * r * 0.8), Size = UDim2.fromOffset(d, d), ZIndex = z or 34 }, parent)
		corner(q, d)
	end
	local drip = new("Frame", { BackgroundColor3 = f.BackgroundColor3, AnchorPoint = Vector2.new(0.5, 0), Position = UDim2.new(x, 0, y, 0), Size = UDim2.fromOffset(math.max(4, r / 7), 0), ZIndex = z or 34 }, parent)
	TweenService:Create(drip, TweenInfo.new(1.2, Enum.EasingStyle.Quad, Enum.EasingDirection.In), { Size = UDim2.fromOffset(math.max(4, r / 7), r * 1.6) }):Play()
end

local function playSound(id, speed, vol, parent)
	local s = Instance.new("Sound")
	s.SoundId = id
	s.PlaybackSpeed = speed or 1
	s.Volume = vol or 1
	s.Parent = parent or gui
	s:Play()
	game:GetService("Debris"):AddItem(s, 6)
	return s
end

local showDeath -- v1.4.1 (defined below)
local resultsUntil = 0
local function jumpscare(kind, form, stats)
	scareRun += 1
	local run = scareRun
	for _, c in ipairs(scare:GetChildren()) do if c:IsA("Model") then c:Destroy() end end
	for _, c in ipairs(scareFx:GetChildren()) do if c ~= scareBlack and c ~= scareText then c:Destroy() end end
	local key = kind
	if kind == "drnowhere" and Config.DN_FORMS[form or 1] then key = Config.DN_FORMS[form or 1].key end
	if kind == "megalodon" and form == 2 then key = "megalodon_h" end
	if kind == "wendigo" and Config.WG_FORMS[form or 1] then key = Config.WG_FORMS[form or 1].key end
	local t = Templates:FindFirstChild(key) or Templates:FindFirstChild("freddy")
	local m = t:Clone()
	m.Parent = scare
	local base = m:GetPivot()
	local cf, size = m:GetBoundingBox()
	local headY = cf.Position.Y + size.Y / 2 - 2.2
	local def = Config.MONSTERS[kind]
	scareText.Text = def and (def.name:upper() .. " GOT YOU") or "CAUGHT"
	scareText.Visible, scareBlack.Visible = false, false
	scare.Visible = true
	local fnaf = table.find({ "freddy", "bonnie", "chica", "foxy", "springtrap" }, kind) ~= nil
	local impact = IMPACT[key] or IMPACT[kind] or 1.55
	-- extra props for the phase-2 scares (water surface, circling fins, tentacles, flashes)
	local extras = Instance.new("Model")
	extras.Name = "ScareExtras"
	extras.Parent = scare
	local function xp(size, cf, color, mat, shape, transp)
		local q = Instance.new("Part")
		q.Anchored, q.Size, q.CFrame, q.Color = true, size, cf, color
		q.Material = mat or Enum.Material.SmoothPlastic
		if shape then q.Shape = shape end
		q.Transparency = transp or 0
		q.Parent = extras
		return q
	end
	local water, fins, tents = nil, {}, {}
	if key == "megalodon" or key == "nessie" or key == "spinosaurus" or key == "mosasaurus" or key == "kraken" or key == "leviathan" then
		water = xp(Vector3.new(300, 0.2, 300), CFrame.new(0, 0, 0), key == "spinosaurus" and Color3.fromRGB(50, 70, 40) or Color3.fromRGB(30, 80, 110), Enum.Material.Glass, nil, 0.35)
	end
	if key == "megalodon" then
		for i = 1, 5 do
			local w = Instance.new("WedgePart")
			w.Anchored, w.Size, w.Color = true, Vector3.new(0.3, 1.6, 1.6), Color3.fromRGB(70, 84, 96)
			w.Parent = extras
			fins[i] = w
		end
	end
	if key == "kraken" then
		for j = 1, 6 do
			tents[j] = {}
			for i = 1, 7 do tents[j][i] = xp(Vector3.one * (1.3 - i * 0.12), CFrame.new(), Color3.fromRGB(150, 50, 60), Enum.Material.Rubber, Enum.PartType.Ball) end
		end
	end
	local flash = new("Frame", { BackgroundColor3 = Color3.new(1, 1, 1), BackgroundTransparency = 1, Size = UDim2.fromScale(1, 1), ZIndex = 33 }, scareFx)
	local start = os.clock()
	local hit = false
	local squares = {}
	playSound("rbxasset://sounds/electronicpingshort.wav", kind == "sonicexe" and 0.6 or 0.35, 2)
	local roarId = (kind == "trex" or kind == "spinosaurus") and Config.SOUNDS[kind == "trex" and "trexroar" or "spinoroar"]
	if roarId and roarId ~= "" then playSound(roarId, 1, 2.5) -- uploaded roar (built from CC0/public-domain recordings)
	elseif roarId then playSound("rbxasset://sounds/uuhhh.mp3", kind == "trex" and 0.32 or 0.55, 2.5) end
	if kind == "wendigo" then playSound("rbxasset://sounds/collide.wav", 1.6, 2) end
	local conn
	conn = RunService.RenderStepped:Connect(function()
		if run ~= scareRun then conn:Disconnect(); return end
		local e = os.clock() - start
		local function ease(x) x = math.clamp(x, 0, 1); return x * x * (3 - 2 * x) end
		local shake = 0.08
		local camPos, look = Vector3.new(0, headY, -9 + e * 3), Vector3.new(0, headY, 0)
		local fov = 50
		m:PivotTo(base)
		if fnaf then -- stands still, then rushes the camera screaming
			local l = ease((e - 0.35) / 0.5)
			camPos = Vector3.new(0, headY, -6 + l * 3.4); shake = e > 0.35 and 0.45 or 0.03
		elseif kind == "sonicexe" then -- grabs, then lunges up into your face
			local l = ease((e - 0.9) / 0.45)
			m:PivotTo(base + Vector3.new(0, math.sin(l * math.pi) * 1.5, -l * 3))
			camPos = Vector3.new(0, headY - 0.5, -6); look = Vector3.new(0, headY + math.sin(l * math.pi) * 1.5, -l * 3); shake = 0.05 + l * 0.4
		elseif kind == "sirenhead" then -- lifted from the ground up toward its speaker head
			local u = ease(e / 1.7)
			camPos = Vector3.new(1, 2 + u * (headY - 2), -5 + u * 1.5); look = Vector3.new(0, headY + 2 * (1 - u), 0); shake = 0.1 + u * 0.3
		elseif kind == "cartooncat" then -- you get stretched like rubber (the view warps)
			local u = ease(e / 1.7)
			camPos = Vector3.new(0, headY, -6 + u * 2.6); fov = 50 + u * 60
		elseif kind == "demogorgon" then -- petal face lunge
			local l = ease((e - 0.6) / 0.6)
			camPos = Vector3.new(0, headY, -7 + l * 4.2); shake = 0.05 + l * 0.4
		elseif kind == "locust" then -- possession: leans in, the picture tears
			local l = ease(e / 1.6)
			camPos = Vector3.new(math.sin(e * 13) * 0.2, headY, -7 + l * 4.5); shake = 0.1 + l * 0.6
		elseif kind == "boisvert" then -- it stares while you dissolve
			camPos = Vector3.new(0, headY, -5.5 + e * 0.4); shake = 0.01
		elseif kind == "drnowhere" then
			local l = ease((e - 0.5) / 0.7)
			if form == 2 then camPos = Vector3.new(0, 2 + ease(e / 1.2) * (headY - 2), -6 + l * 3); shake = 0.1 + l * 0.4
			elseif form == 3 then m:PivotTo(base * CFrame.new(0, 0, -l * 2)); camPos = Vector3.new(0, headY, -7 + l * 3)
			else camPos = Vector3.new(0, headY, -7.5 + l * 4.4); shake = 0.05 + l * 0.35 end
		elseif key == "megalodon" then -- swarmed by fins, a shadow rises, it leaps, swallows you and dives
			camPos, look = Vector3.new(0, 1.3, -9), Vector3.new(0, -0.6, 0)
			for i, w in ipairs(fins) do
				local a = e * 2.2 + i * math.pi * 0.4
				local r = math.max(2.5, 7 - e * 3)
				w.CFrame = CFrame.lookAt(Vector3.new(math.cos(a) * r, 0.6, -9 + math.sin(a) * r), Vector3.new(math.cos(a + 0.3) * r, 0.6, -9 + math.sin(a + 0.3) * r))
			end
			if e < 1.0 then -- the shadow rises under the water
				local r = ease(e / 1.0)
				m:PivotTo(CFrame.new(0, -26 + r * 14, -2) * CFrame.Angles(math.rad(90), 0, 0)); shake = 0.03 + r * 0.1
			elseif e < 1.5 then -- the leap
				local l = ease((e - 1.0) / 0.5)
				m:PivotTo(CFrame.new(0, -12 + l * 14, -2 - l * 4) * CFrame.Angles(math.rad(90 - l * 30), 0, 0))
				look = Vector3.new(0, 1.5 + l, -5); shake = 0.2 + l * 0.4
			else -- swallowed: inside the jaws, then the dive
				local d = ease((e - 1.5) / 0.45)
				local mcf = CFrame.new(0, 2 - d * 10, -6 + d * 3) * CFrame.Angles(math.rad(60 - d * 140), 0, 0)
				m:PivotTo(mcf)
				local mouth = (mcf * CFrame.new(0, -1.6, -10.5)).Position
				camPos = mouth + mcf.LookVector * 1.2 + Vector3.new(0, 0.3, 0); look = (mcf * CFrame.new(0, -1.6, -2)).Position; shake = 0.35; fov = 70
				if water then water.Transparency = 0.1 end
			end
		elseif key == "megalodon_h" then -- a buff shark-man grabs you and bites down
			local l = ease((e - 0.5) / 0.8)
			m:PivotTo(base * CFrame.new(0, 0, -l * 2) * CFrame.Angles(math.rad(-25 * l), 0, 0))
			camPos = Vector3.new(0, headY - 1, -6.5 + l * 2); look = Vector3.new(0, headY - 0.5 - l, -l * 3); shake = 0.15 + l * 0.4
		elseif key == "kraken" then -- tentacles close in around you, then the beak
			local u = ease(e / 1.3)
			camPos = Vector3.new(0, 2, -12); look = Vector3.new(0, 1.5 + u * 1.5, 0)
			for j, list2 in ipairs(tents) do
				local a = j / 6 * math.pi * 2 + e * 0.8
				for i, q in ipairs(list2) do
					local r = (4.5 - u * 2.8) + i * 0.15
					q.CFrame = CFrame.new(Vector3.new(math.cos(a + i * 0.25 * u) * r, -5 + i * 1.3 * (0.4 + u), -12 + math.sin(a + i * 0.25 * u) * r))
				end
			end
			local l = ease((e - 1.2) / 0.5)
			m:PivotTo(base * CFrame.new(0, 0, -l * 8)); shake = 0.05 + u * 0.2 + l * 0.3
		elseif key == "cthulhu" then -- a towering figure in the storm, lit by lightning
			camPos = Vector3.new(0, 2, -11 + ease((e - 0.8) / 0.9) * 5); look = Vector3.new(0, headY, 0)
			flash.BackgroundTransparency = ((e > 0.25 and e < 0.35) or (e > 0.9 and e < 1.0) or (e > 1.45 and e < 1.52)) and 0.1 or 1
			m:PivotTo(base * CFrame.Angles(math.rad(-ease((e - 0.9) / 0.8) * 25), 0, 0)); shake = 0.05 + ease((e - 0.9) / 0.8) * 0.4
		elseif key == "leviathan" then -- the coils wind around you, then it strikes
			local a = e * 2.6
			local l = ease((e - 1.25) / 0.45)
			camPos = Vector3.new(math.sin(a) * (9 - l * 4), 2.2, -9 + math.cos(a) * (9 - l * 4) * 0.4 - l * 2); look = Vector3.new(0, 1, -8)
			m:PivotTo(base * CFrame.new(0, 0, -l * 4)); shake = 0.05 + l * 0.4
		elseif key == "mosasaurus" then -- the jaws burst up out of the water under you
			local l = ease((e - 0.6) / 0.6)
			m:PivotTo(CFrame.new(0, -14 + l * 14, -4 + l * 2) * CFrame.Angles(math.rad(80 - l * 25), 0, 0))
			camPos = Vector3.new(0, 2.4, -8); look = Vector3.new(0, -2 + l * 4, -4); shake = 0.05 + l * 0.45
		elseif key == "nessie" then -- a long neck rises from the water and the head swoops down at you
			local r = ease(e / 1.0)
			local l = ease((e - 1.0) / 0.5)
			m:PivotTo(CFrame.new(0, -14 + r * 13, 2) * CFrame.Angles(math.rad(-35 * l), 0, 0) * CFrame.new(0, 0, -l * 3))
			camPos = Vector3.new(0, 2, -10); look = Vector3.new(0, 2 + r * 12 - l * 9, -2 - l * 5); shake = 0.04 + l * 0.4
		elseif key == "spinosaurus" then -- the sail cuts through the swamp, then it lunges out
			local r = ease(e / 1.0)
			local l = ease((e - 1.0) / 0.55)
			m:PivotTo(base * CFrame.new(r * 0, -10 + r * 10, 6 - r * 4 - l * 5))
			camPos = Vector3.new(0, 3, -9); look = Vector3.new(0, 2 + r * 6, 0); shake = 0.04 + l * 0.4
		elseif key == "yeti" or key == "trex" then -- a deafening roar, then the bite
			local roar = (e > 0.3 and e < 1.1) and 1 or 0
			local l = ease((e - 1.1) / 0.45)
			m:PivotTo(base * CFrame.new(0, 0, -l * 3) * CFrame.Angles(math.rad(-20 * l), 0, 0))
			camPos = Vector3.new(0, key == "trex" and 2 or headY - 2, -9 + l * 3); look = Vector3.new(0, headY, -l * 4); shake = 0.05 + roar * 0.55 + l * 0.3
			if key == "yeti" and math.random() < 0.7 then
				table.insert(squares, new("Frame", { BackgroundColor3 = Color3.new(1, 1, 1), BackgroundTransparency = 0.3, Position = UDim2.fromScale(math.random(), math.random()), Size = UDim2.fromOffset(math.random(6, 30), math.random(6, 30)), ZIndex = 33 }, scareFx))
			end
		elseif key == "chupacabra" then -- it leaps at you from the side
			local l = ease(e / 1.0)
			m:PivotTo(base * CFrame.new(9 - l * 9, math.sin(l * math.pi) * 3, -l * 5))
			camPos = Vector3.new(0, 2, -8); look = Vector3.new(9 - l * 9, 2, -l * 5); shake = 0.05 + l * 0.4
		elseif key == "vampire" then -- nothing there... you turn around: it's right behind you
			local tr = ease((e - 0.55) / 0.35)
			local l = ease((e - 1.0) / 0.4)
			camPos = Vector3.new(0, headY, -5.5 + l * 2)
			local ahead = Vector3.new(0, headY, -20)
			look = ahead:Lerp(Vector3.new(0, headY, 0), tr); shake = 0.02 + l * 0.4
		elseif key == "bigfoot" then -- it charges out of the dark woods
			local l = ease(e / 1.45)
			m:PivotTo(base * CFrame.new(0, math.abs(math.sin(e * 9)) * 0.6, 22 - l * 22))
			camPos = Vector3.new(0, headY - 1, -6); look = Vector3.new(0, headY, 22 - l * 22); shake = 0.05 + l * 0.35
		elseif key == "quetzalcoatlus" then -- a shriek from above, then it dives out of the sky
			local l = ease(e / 1.3)
			m:PivotTo(CFrame.new(0, 34 - l * 34, 14 - l * 14) * CFrame.Angles(math.rad(-50 * (1 - l)), 0, 0))
			camPos = Vector3.new(0, 2, -8); look = Vector3.new(0, 34 - l * 30, 14 - l * 14); shake = 0.04 + l * 0.4
		elseif key == "gargoyle" then -- a still statue... its eyes light up and it lunges
			local l = ease((e - 1.0) / 0.3)
			m:PivotTo(base * CFrame.new(0, 0, -l * 4))
			camPos = Vector3.new(0, headY, -7 + l * 2); shake = e < 1 and 0 or 0.5
		elseif key == "dragon" then -- a wall of fire, then the jaws
			local f2 = ease((e - 0.4) / 0.6)
			flash.BackgroundColor3 = Color3.fromRGB(255, 120, 20)
			flash.BackgroundTransparency = e > 0.4 and e < 1.2 and (1 - f2 * 0.6) or 1
			local l = ease((e - 1.1) / 0.4)
			m:PivotTo(base * CFrame.new(0, 0, -l * 5))
			camPos = Vector3.new(0, headY - 1, -12 + l * 4); look = Vector3.new(0, headY - 1, -l * 6); shake = 0.1 + f2 * 0.2 + l * 0.3
		elseif key == "wendigo" then -- antler charge out of the trees
			local l = ease((e - 0.5) / 0.6)
			m:PivotTo(base * CFrame.new(0, -0.5, 16 - l * 15) * CFrame.Angles(math.rad(-20 * l), 0, 0))
			camPos = Vector3.new(0, headY - 1.5, -6); look = Vector3.new(0, headY - 1, 10 - l * 10); shake = 0.05 + l * 0.5
		elseif key == "wendigo_h" then -- a scream, then it leaps at you
			local l = ease((e - 0.8) / 0.45)
			m:PivotTo(base * CFrame.new(0, math.sin(l * math.pi) * 3, 10 - l * 10))
			camPos = Vector3.new(0, headY, -5); look = Vector3.new(0, headY, 8 - l * 8); shake = e < 0.8 and 0.08 or 0.45
		elseif key == "dn_conezone" then -- the spider skitters straight at the camera
			local l = ease((e - 0.3) / 0.9)
			m:PivotTo(base * CFrame.new(math.sin(e * 40) * 0.25 * (1 - l), 0, 18 - l * 17))
			camPos = Vector3.new(0, 1, -5); look = Vector3.new(0, 0, 10 - l * 10); shake = 0.04 + l * 0.35
		elseif key == "dn_guilt" then -- it towers over you and bends down, face plate first
			local l = ease((e - 0.4) / 0.9)
			m:PivotTo(base * CFrame.new(0, 0, 3) * CFrame.Angles(math.rad(-38 * l), 0, 0))
			camPos = Vector3.new(0, 1, -4); look = Vector3.new(0, headY - l * 3, 3 - l * 3); shake = l * 0.25
		elseif key == "fester" then -- the lights flicker; every time they come back he is closer
			local step = math.floor(e / 0.3)
			local dark = (e % 0.3) < 0.1 and e < 1.5
			scareBlack.Visible = dark
			m:PivotTo(base * CFrame.new(0, 0, 14 - math.min(5, step) * 3.2))
			camPos = Vector3.new(0, headY - 1, -7); look = Vector3.new(0, headY - 0.6, 14 - math.min(5, step) * 3.2); shake = 0.03 + step * 0.05
		else
			local l = ease((e - 0.3) / 0.8)
			camPos = Vector3.new(0, headY, -9 + l * 6); shake = 0.05 + l * 0.35
		end
		scareCam.FieldOfView = fov
		local sv = Vector3.new(math.random() - 0.5, math.random() - 0.5, 0) * shake
		scareCam.CFrame = CFrame.lookAt(camPos + sv, look)
		-- 2D pre-impact effects
		if not hit then
			if kind == "locust" and math.random() < 0.6 then
				for _, c in ipairs(squares) do c:Destroy() end
				table.clear(squares)
				for _ = 1, 6 do table.insert(squares, new("Frame", { BackgroundColor3 = ({ Color3.new(1, 0, 0), Color3.new(0, 1, 0), Color3.new(0, 0, 1), Color3.new(1, 1, 1) })[math.random(1, 4)], BackgroundTransparency = 0.5, Position = UDim2.fromScale(0, math.random()), Size = UDim2.new(1, 0, 0, math.random(3, 30)), ZIndex = 33 }, scareFx)) end
			elseif kind == "boisvert" and math.random() < 0.8 then
				local g = math.random(0, 255)
				table.insert(squares, new("Frame", { BackgroundColor3 = Color3.fromRGB(g, g, g), Position = UDim2.fromScale(math.random(), math.random()), Size = UDim2.fromOffset(40, 40), ZIndex = 33 }, scareFx))
			end
		end
		if e >= impact and not hit then -- impact: cut to black (+ optional blood)
			hit = true
			for _, c in ipairs(squares) do c:Destroy() end
			scareBlack.Visible = true
			scareText.Visible = true
			playSound("rbxasset://sounds/uuhhh.mp3", 0.6, 2)
			playSound("rbxasset://sounds/electronicpingshort.wav", 0.2, 3)
			if bloodOn then
				for _ = 1, 7 do splat(scareFx, math.random(), math.random() * 0.8, math.random(60, 220), 34) end
			end
		end
		if e > SCARE_LEN then
			conn:Disconnect()
			scare.Visible = false
			if stats and showDeath then showDeath(stats) end -- the end screen only pops up once the animation has fully finished
		end
	end)
end

---------------------------------------------------------------------------
-- v1.4.1 end screens: YOU DIED (after the jumpscare animation fully ends), the monster's KILL popup
-- (after its kill cam, fades out so it keeps playing), spectating, and the full round results screen.
---------------------------------------------------------------------------
local deathAt, killPopAt, killcamOn = 0, 0, false
local function fmtSecs(t) t = math.max(0, math.floor(t or 0)); return ("%d:%02d"):format(t // 60, t % 60) end
local death = new("Frame", { BackgroundColor3 = Color3.fromRGB(20, 0, 0), BackgroundTransparency = 0.25, Size = UDim2.fromScale(1, 1), Visible = false, ZIndex = 40 }, gui)
local deathTitle = label(death, "YOU DIED", 92, { Font = Enum.Font.Creepster, TextColor3 = Color3.fromRGB(235, 20, 20), Position = UDim2.new(0, 0, 0.2, 0), Size = UDim2.new(1, 0, 0, 100), ZIndex = 41, TextStrokeTransparency = 0.4 })
local deathBy = label(death, "", 24, { Font = Enum.Font.GothamBold, RichText = true, Position = UDim2.new(0, 0, 0.2, 108), Size = UDim2.new(1, 0, 0, 30), ZIndex = 41 })
local deathStats = new("Frame", { BackgroundTransparency = 1, Position = UDim2.new(0.5, -330, 0.2, 152), Size = UDim2.new(0, 660, 0, 78), ZIndex = 41 }, death)
new("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 10), HorizontalAlignment = Enum.HorizontalAlignment.Center, SortOrder = Enum.SortOrder.LayoutOrder }, deathStats)
local statBoxes = {}
for i, cap in ipairs({ "Time survived", "Damage dealt", "Monster knockdowns", "Coins earned" }) do
	local b = new("Frame", { BackgroundColor3 = Color3.fromRGB(30, 6, 8), BackgroundTransparency = 0.1, Size = UDim2.new(0, 155, 1, 0), LayoutOrder = i, ZIndex = 41 }, deathStats)
	corner(b, 8)
	new("UIStroke", { Color = Color3.fromRGB(150, 20, 24), Thickness = 1.5 }, b)
	statBoxes[i] = label(b, "0", 28, { Font = Enum.Font.GothamBlack, TextColor3 = Color3.fromRGB(255, 215, 107), Position = UDim2.new(0, 0, 0, 8), Size = UDim2.new(1, 0, 0, 34), ZIndex = 42 })
	label(b, cap, 13, { TextColor3 = Color3.fromRGB(220, 200, 200), Position = UDim2.new(0, 0, 0, 46), Size = UDim2.new(1, 0, 0, 20), ZIndex = 42 })
end
local deathLeft = label(death, "", 15, { TextColor3 = Color3.fromRGB(120, 180, 255), Position = UDim2.new(0, 0, 0.2, 242), Size = UDim2.new(1, 0, 0, 20), ZIndex = 41 })
local deathBtns = new("Frame", { BackgroundTransparency = 1, Position = UDim2.new(0.5, -200, 0.2, 272), Size = UDim2.new(0, 400, 0, 46), ZIndex = 41 }, death)
label(death, "Round results will appear when the round ends.", 12, { TextColor3 = MUTED, Position = UDim2.new(0, 0, 0.2, 326), Size = UDim2.new(1, 0, 0, 18), ZIndex = 41 })

-- spectating: follow living players (camera subject), the server streams the map around them
local spec = { on = false, i = 1, list = {} }
local specBar = new("Frame", { BackgroundColor3 = DARK, BackgroundTransparency = 0.15, Size = UDim2.new(0, 470, 0, 46), Position = UDim2.new(0.5, -235, 1, -64), Visible = false, ZIndex = 39 }, gui)
corner(specBar, 10)
new("UIStroke", { Color = Color3.fromRGB(70, 110, 200), Thickness = 1.5 }, specBar)
local specName = label(specBar, "", 15, { Font = Enum.Font.GothamBold, RichText = true, Position = UDim2.new(0, 50, 0, 0), Size = UDim2.new(1, -210, 1, 0), ZIndex = 40 })
local function specTargets()
	local out = {}
	for _, p in ipairs(Players:GetPlayers()) do
		if p ~= player and p:GetAttribute("Role") == "Survivor" and p:GetAttribute("Alive") and not p:GetAttribute("Escaped") then table.insert(out, p) end
	end
	for _, p in ipairs(Players:GetPlayers()) do
		if p ~= player and p:GetAttribute("Role") == "Monster" then table.insert(out, p) end
	end
	return out
end
local function specShow()
	spec.list = specTargets()
	local cam = workspace.CurrentCamera
	if #spec.list == 0 then specName.Text = "Nobody left to watch"; return end
	spec.i = ((spec.i - 1) % #spec.list) + 1
	local t = spec.list[spec.i]
	local hum = t.Character and t.Character:FindFirstChildOfClass("Humanoid")
	if hum then cam.CameraType = Enum.CameraType.Custom; cam.CameraSubject = hum end
	Action:FireServer("spectate", t.UserId)
	local mon = t:GetAttribute("Role") == "Monster"
	local def = mon and Config.MONSTERS[t:GetAttribute("Monster") or ""]
	specName.Text = ("Spectating <font color=\"#%s\">%s</font>  -  %s"):format(mon and "ff5050" or "5aff8a", t.DisplayName, mon and (def and def.name or "Monster") or "Survivor")
end
local function stopSpec()
	if not spec.on then return end
	spec.on = false
	specBar.Visible = false
	local hum = player.Character and player.Character:FindFirstChildOfClass("Humanoid")
	if hum then workspace.CurrentCamera.CameraSubject = hum end
	Action:FireServer("spectate", nil)
end
local function startSpec()
	death.Visible = false
	spec.on, spec.i = true, 1
	specBar.Visible = true
	specShow()
end
button(specBar, "<", { Size = UDim2.new(0, 38, 0, 34), Position = UDim2.new(0, 6, 0, 6), ZIndex = 40, BackgroundColor3 = Color3.fromRGB(40, 60, 110) }, function() spec.i -= 1; specShow() end)
button(specBar, ">", { Size = UDim2.new(0, 38, 0, 34), Position = UDim2.new(1, -156, 0, 6), ZIndex = 40, BackgroundColor3 = Color3.fromRGB(40, 60, 110) }, function() spec.i += 1; specShow() end)
button(specBar, "Lobby", { Size = UDim2.new(0, 106, 0, 34), Position = UDim2.new(1, -112, 0, 6), TextSize = 14, ZIndex = 40, BackgroundColor3 = Color3.fromRGB(120, 30, 30) }, function() stopSpec() end)
UserInputService.InputBegan:Connect(function(inp, gp)
	if gp or not spec.on then return end
	if inp.KeyCode == Enum.KeyCode.Right or inp.KeyCode == Enum.KeyCode.N then spec.i += 1; specShow()
	elseif inp.KeyCode == Enum.KeyCode.Left then spec.i -= 1; specShow() end
end)

button(deathBtns, "Spectate", { Size = UDim2.new(0, 190, 1, 0), Position = UDim2.new(0, 0, 0, 0), ZIndex = 42, BackgroundColor3 = Color3.fromRGB(40, 80, 150) }, function() startSpec() end)
-- you are already back in the lobby (the server moved you there when you were caught): this just closes the screen
button(deathBtns, "Return to Lobby", { Size = UDim2.new(0, 190, 1, 0), Position = UDim2.new(1, -190, 0, 0), ZIndex = 42, BackgroundColor3 = Color3.fromRGB(140, 30, 30) }, function() death.Visible = false; stopSpec() end)

showDeath = function(s)
	if type(s) ~= "table" then return end
	deathAt = os.clock()
	deathBy.Text = ("Killed by <font color=\"#ff5050\">%s</font>%s"):format(tostring(s.killer or "the dark"), (s.by and s.by ~= "") and (" <font size=\"18\" color=\"#cccccc\">(" .. tostring(s.by) .. ")</font>") or "")
	statBoxes[1].Text = fmtSecs(s.time)
	statBoxes[2].Text = tostring(s.dmg or 0)
	statBoxes[3].Text = tostring(s.downs or 0)
	statBoxes[4].Text = tostring(s.earn or 0)
	local left = tonumber(s.left) or 0
	deathLeft.Text = left > 0 and (("%d survivor%s still alive"):format(left, left == 1 and "" or "s")) or "Nobody is left alive"
	death.Visible = true
	deathTitle.TextTransparency = 1
	TweenService:Create(deathTitle, TweenInfo.new(0.6), { TextTransparency = 0 }):Play()
	playSound("rbxasset://sounds/uuhhh.mp3", 0.45, 1.5)
end

-- the monster's KILL popup after its kill cam: fades out so the hunt keeps going
local killPop = new("Frame", { BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 150), Position = UDim2.new(0, 0, 0.18, 0), Visible = false, ZIndex = 38 }, gui)
local kpTitle = label(killPop, "KILL", 84, { Font = Enum.Font.GothamBlack, TextColor3 = Color3.fromRGB(255, 32, 32), Size = UDim2.new(1, 0, 0, 86), ZIndex = 39, TextStrokeTransparency = 0.5 })
local kpName = label(killPop, "", 26, { Font = Enum.Font.GothamBlack, Position = UDim2.new(0, 0, 0, 88), Size = UDim2.new(1, 0, 0, 30), ZIndex = 39, TextStrokeTransparency = 0.5 })
local kpSub = label(killPop, "", 15, { TextColor3 = Color3.fromRGB(255, 215, 107), Position = UDim2.new(0, 0, 0, 120), Size = UDim2.new(1, 0, 0, 20), ZIndex = 39 })
local function showKillPop(name, kind)
	local def = Config.MONSTERS[kind or ""]
	kpName.Text = tostring(name) .. " eliminated"
	kpSub.Text = (def and def.name or "") .. "  -  +" .. Config.EARN.catch .. " coins"
	killPopAt = os.clock()
	killPop.Visible = true
	for _, l in ipairs({ kpTitle, kpName, kpSub }) do
		l.TextTransparency = 0; l.TextStrokeTransparency = 0.5
		TweenService:Create(l, TweenInfo.new(1.6, Enum.EasingStyle.Quad, Enum.EasingDirection.In, 0, false, 1.1), { TextTransparency = 1, TextStrokeTransparency = 1 }):Play()
	end
	kpTitle.Size = UDim2.new(1, 0, 0, 120)
	TweenService:Create(kpTitle, TweenInfo.new(0.25, Enum.EasingStyle.Back), { Size = UDim2.new(1, 0, 0, 86) }):Play()
	playSound("rbxasset://sounds/electronicpingshort.wav", 0.5, 1.5)
	task.delay(2.8, function() if os.clock() - killPopAt >= 2.7 then killPop.Visible = false end end)
end

-- full round results
local res = new("Frame", { BackgroundColor3 = Color3.fromRGB(8, 8, 14), BackgroundTransparency = 0.08, Size = UDim2.fromScale(1, 1), Visible = false, ZIndex = 45 }, gui)
local resTitle = label(res, "", 64, { Font = Enum.Font.GothamBlack, Position = UDim2.new(0, 0, 0, 30), Size = UDim2.new(1, 0, 0, 70), ZIndex = 46, TextStrokeTransparency = 0.5 })
local resBadge = label(res, "", 18, { Font = Enum.Font.GothamBlack, BackgroundTransparency = 0, Position = UDim2.new(0.5, -70, 0, 106), Size = UDim2.new(0, 140, 0, 28), ZIndex = 46 })
corner(resBadge, 14)
local resReason = label(res, "", 16, { TextColor3 = Color3.fromRGB(220, 220, 230), Position = UDim2.new(0, 0, 0, 140), Size = UDim2.new(1, 0, 0, 22), ZIndex = 46 })
local resTable = new("Frame", { BackgroundColor3 = Color3.fromRGB(20, 20, 30), Position = UDim2.new(0.5, -360, 0, 176), Size = UDim2.new(0, 720, 0, 30), AutomaticSize = Enum.AutomaticSize.Y, ZIndex = 46 }, res)
corner(resTable, 8)
new("UIListLayout", { SortOrder = Enum.SortOrder.LayoutOrder }, resTable)
local resCoins = label(res, "", 20, { Font = Enum.Font.GothamBlack, TextColor3 = Color3.fromRGB(255, 215, 107), Position = UDim2.new(0, 0, 1, -110), Size = UDim2.new(1, 0, 0, 26), ZIndex = 46 })
local resCount = label(res, "", 14, { Position = UDim2.new(0, 0, 1, -76), Size = UDim2.new(1, 0, 0, 20), ZIndex = 46 })
local COLS = { { "PLAYER", 0.22 }, { "ROLE", 0.18 }, { "RESULT", 0.16 }, { "KILLS / DMG", 0.13 }, { "KNOCKDOWNS", 0.13 }, { "COINS", 0.18 } }
local function resRow(vals, order, head, mine, colors)
	local r = new("Frame", { BackgroundColor3 = mine and Color3.fromRGB(60, 50, 20) or Color3.fromRGB(14, 14, 20), BackgroundTransparency = head and 1 or 0.2, Size = UDim2.new(1, 0, 0, head and 26 or 28), LayoutOrder = order, ZIndex = 47 }, resTable)
	local x = 0
	for i, c in ipairs(COLS) do
		label(r, tostring(vals[i]), head and 12 or 14, { Font = head and Enum.Font.GothamBlack or Enum.Font.GothamMedium, TextColor3 = head and Color3.fromRGB(255, 210, 120) or (colors and colors[i]) or TEXT, Position = UDim2.new(x, 0, 0, 0), Size = UDim2.new(c[2], 0, 1, 0), ZIndex = 48 })
		x += c[2]
	end
end
local pendingResults
local function showResults(headline, lines, rows)
	pendingResults = nil
	death.Visible = false
	stopSpec()
	killPop.Visible = false
	for _, c in ipairs(resTable:GetChildren()) do if c:IsA("Frame") then c:Destroy() end end
	local survWin = headline == "SURVIVORS WIN"
	resTitle.Text = headline
	resTitle.TextColor3 = survWin and Color3.fromRGB(90, 255, 140) or Color3.fromRGB(255, 50, 50)
	local myRole = player:GetAttribute("Role")
	local won = (myRole == "Monster") ~= survWin
	resBadge.Text = won and "VICTORY" or "DEFEAT"
	resBadge.BackgroundColor3 = won and Color3.fromRGB(30, 120, 50) or Color3.fromRGB(130, 30, 30)
	resReason.Text = (type(lines) == "table" and lines[1]) or ""
	resRow({ "PLAYER", "ROLE", "RESULT", "KILLS / DMG", "KNOCKDOWNS", "COINS" }, 0, true)
	local mine = 0
	if type(rows) == "table" then
		for i, r in ipairs(rows) do
			local resCol = r.res == "Escaped" and Color3.fromRGB(90, 255, 120) or r.res == "Survived" and Color3.fromRGB(120, 200, 255) or Color3.fromRGB(255, 80, 80)
			resRow({ r.name, r.role, r.res, r.monster and tostring(r.kills) or tostring(r.dmg), r.downs, r.coins .. " coins" }, i, false, r.id == player.UserId,
				{ r.monster and Color3.fromRGB(255, 90, 90) or Color3.fromRGB(120, 200, 255), TEXT, resCol, TEXT, TEXT, Color3.fromRGB(255, 215, 107) })
			if r.id == player.UserId then mine = r.coins end
		end
	elseif type(lines) == "table" then
		for i = 2, #lines do resRow({ lines[i], "", "", "", "", "" }, i, false, false) end
	end
	resCoins.Text = ("+%d coins earned  (total %d)"):format(mine, player:GetAttribute("Coins") or 0)
	res.Visible = true
	resultsUntil = os.clock() + Config.RESULTS_TIME
	task.spawn(function()
		while res.Visible do
			local left = math.max(0, math.ceil(resultsUntil - os.clock()))
			resCount.Text = ("Back to the lobby in %ds..."):format(left)
			if State:GetAttribute("State") == "Lobby" or State:GetAttribute("State") == "Flight" then res.Visible = false end
			task.wait(0.25)
		end
	end)
end
-- results wait until the jumpscare / kill cam is over and the death screen / kill popup have been seen
local function endBusy()
	return scare.Visible or killcamOn or (death.Visible and os.clock() - deathAt < 3.5) or (killPop.Visible and os.clock() - killPopAt < 1.6)
end
local function queueResults(headline, lines, rows)
	pendingResults = { headline, lines, rows }
	task.spawn(function()
		local t0 = os.clock()
		while pendingResults and endBusy() and os.clock() - t0 < 8 do task.wait(0.1) end
		if pendingResults then showResults(table.unpack(pendingResults, 1, 3)) end
	end)
end

local grey = Instance.new("ColorCorrectionEffect")
grey.Name = "NH_Grey"
grey.Enabled = false
grey.Parent = Lighting
local greyUntil = 0

---------------------------------------------------------------------------
-- 13+ warning screen (must press Continue), settings, HUD, effects
---------------------------------------------------------------------------
local warn = new("Frame", { BackgroundColor3 = Color3.fromRGB(6, 4, 6), Size = UDim2.fromScale(1, 1), ZIndex = 200, Active = true }, gui)
local warnBox = new("Frame", { BackgroundColor3 = PANEL, Size = UDim2.new(0, 560, 0, 380), Position = UDim2.new(0.5, -280, 0.5, -190), ZIndex = 201 }, warn)
corner(warnBox, 12)
padding(warnBox, 18)
list(warnBox, 10)
label(warnBox, "WARNING", 44, { Font = Enum.Font.Creepster, TextColor3 = RED, ZIndex = 202, LayoutOrder = 1 })
local badge = label(warnBox, "RATED 13+", 18, { Font = Enum.Font.GothamBlack, BackgroundTransparency = 0, BackgroundColor3 = RED, TextColor3 = Color3.new(1, 1, 1), Size = UDim2.new(0, 140, 0, 30), ZIndex = 202, LayoutOrder = 2 })
corner(badge, 6)
label(warnBox, "This game contains flashing lights that may trigger seizures for people with photosensitive epilepsy - if you feel dizzy, get a headache or notice anything unusual, stop playing right away. It also contains blood and gore, sudden jumpscares and loud sounds. Night Hunt is rated 13+. If that's too much for you, please leave now.", 16, { ZIndex = 202, LayoutOrder = 3, Size = UDim2.new(1, 0, 0, 190), TextYAlignment = Enum.TextYAlignment.Top })
button(warnBox, "Continue", { ZIndex = 202, LayoutOrder = 4, Size = UDim2.new(0, 220, 0, 46), TextSize = 20 }, function() warn.Visible = false end)

local bloodBtn
bloodBtn = button(gui, "Blood effects: ON", { Size = UDim2.new(0, 150, 0, 28), Position = UDim2.new(0, 12, 0, 52), TextSize = 12, BackgroundColor3 = Color3.fromRGB(70, 30, 34) }, function()
	bloodOn = not bloodOn
	bloodBtn.Text = bloodOn and "Blood effects: ON" or "Blood effects: OFF"
	for _, d in ipairs(workspace:GetDescendants()) do if d.Name == "NH_Blood" and d:IsA("BasePart") then d.LocalTransparencyModifier = bloodOn and 0 or 1 end end
end)
workspace.DescendantAdded:Connect(function(d)
	if d.Name == "NH_Blood" and d:IsA("BasePart") then d.LocalTransparencyModifier = bloodOn and 0 or 1 end
end)

-- survivor HUD: HP, armor, ammo, coins
local hud = new("Frame", { BackgroundColor3 = DARK, BackgroundTransparency = 0.25, Size = UDim2.new(0, 260, 0, 64), Position = UDim2.new(0.5, -130, 1, -112), Visible = false }, gui)
corner(hud, 8)
local hpBg = new("Frame", { BackgroundColor3 = Color3.fromRGB(50, 10, 12), Size = UDim2.new(1, -16, 0, 16), Position = UDim2.new(0, 8, 0, 6) }, hud)
corner(hpBg, 5)
local hpFill = new("Frame", { BackgroundColor3 = Color3.fromRGB(200, 40, 40), Size = UDim2.new(1, 0, 1, 0) }, hpBg)
corner(hpFill, 5)
local hpLbl = label(hpBg, "100", 12, { Size = UDim2.fromScale(1, 1), Font = Enum.Font.GothamBold })
local gearLbl = label(hud, "", 12, { Position = UDim2.new(0, 8, 0, 26), Size = UDim2.new(1, -16, 0, 34), TextColor3 = TEXT, TextYAlignment = Enum.TextYAlignment.Top })
local coinLbl = label(gui, "", 14, { Size = UDim2.new(0, 150, 0, 22), Position = UDim2.new(0, 12, 0, 86), TextXAlignment = Enum.TextXAlignment.Left, TextColor3 = Color3.fromRGB(255, 210, 90), Font = Enum.Font.GothamBold })

local darkOver = new("Frame", { BackgroundColor3 = Color3.new(0, 0, 0), Size = UDim2.fromScale(1, 1), ZIndex = 15, Visible = false }, gui)
local hurtOver = new("Frame", { BackgroundColor3 = Color3.fromRGB(160, 0, 0), BackgroundTransparency = 1, Size = UDim2.fromScale(1, 1), ZIndex = 14 }, gui)
local locustOver = new("Frame", { BackgroundColor3 = Color3.fromRGB(0, 120, 140), Size = UDim2.fromScale(1, 1), ZIndex = 25, Visible = false }, gui)
local locustText = label(locustOver, "", 30, { Font = Enum.Font.Arcade, TextColor3 = Color3.new(1, 1, 1), Position = UDim2.new(0, 0, 0.45, 0), Size = UDim2.new(1, 0, 0, 40), ZIndex = 26 })
local darkUntil, hallucUntil = 0, 0
-- v1.5.1 Boisvert "Dead Channel": the whole screen fills with opaque, animated TV static + a hiss for 10s
local staticUntil = 0
local staticOver = new("Frame", { BackgroundColor3 = Color3.fromRGB(128, 128, 128), Size = UDim2.fromScale(1, 1), ZIndex = 16, Visible = false, BorderSizePixel = 0 }, gui)
local SCOLS, SROWS = 48, 27
local snow = {}
for y = 0, SROWS - 1 do for x = 0, SCOLS - 1 do
	snow[#snow + 1] = new("Frame", { BorderSizePixel = 0, Size = UDim2.fromScale(1 / SCOLS + 0.002, 1 / SROWS + 0.004), Position = UDim2.fromScale(x / SCOLS, y / SROWS), ZIndex = 16 }, staticOver)
end end
local rollBar = new("Frame", { BorderSizePixel = 0, BackgroundColor3 = Color3.new(1, 1, 1), BackgroundTransparency = 0.75, Size = UDim2.fromScale(1, 0.06), ZIndex = 17 }, staticOver)
local hissSound = Instance.new("Sound")
hissSound.SoundId = (Config.SOUNDS.static and Config.SOUNDS.static ~= "") and Config.SOUNDS.static or "rbxasset://sounds/swoosh.wav"
hissSound.Looped, hissSound.Volume, hissSound.PlaybackSpeed = true, 1.2, (Config.SOUNDS.static and Config.SOUNDS.static ~= "") and 1 or 3.2
hissSound.Parent = gui
RunService.RenderStepped:Connect(function()
	local on = os.clock() < staticUntil and State:GetAttribute("State") == "Hunt"
	staticOver.Visible = on
	if on then
		if not hissSound.IsPlaying then hissSound:Play() end
		for i, f in ipairs(snow) do local n = math.random(0, 255); f.BackgroundColor3 = Color3.fromRGB(n, n, n) end
		rollBar.Position = UDim2.fromScale(0, (os.clock() * 0.6) % 1)
	elseif hissSound.IsPlaying then hissSound:Stop() end
end)
local halluc = Instance.new("ColorCorrectionEffect")
halluc.Name = "NH_Halluc"
halluc.Enabled = false
halluc.Parent = Lighting
local hallucBlur = Instance.new("BlurEffect")
hallucBlur.Name = "NH_HallucBlur"
hallucBlur.Enabled = false
hallucBlur.Parent = Lighting

local SFX = { -- uploads in Config.SOUNDS win; otherwise built-in Roblox sounds, pitched
	laugh = { "rbxasset://sounds/uuhhh.mp3", 1.6 }, siren = { "rbxasset://sounds/electronicpingshort.wav", 0.25 },
	portal = { "rbxasset://sounds/swoosh.wav", 0.5 }, buzz = { "rbxasset://sounds/electronicpingshort.wav", 2.2 },
	dark = { "rbxasset://sounds/swoosh.wav", 0.3 }, inject = { "rbxasset://sounds/swoosh.wav", 2 },
	stretch = { "rbxasset://sounds/swoosh.wav", 0.7 }, sonic = { "rbxasset://sounds/uuhhh.mp3", 2.2 },
	quake = { "rbxasset://sounds/action_falling.mp3", 0.4 }, shift = { "rbxasset://sounds/swoosh.wav", 0.35 },
	paranoia = { "rbxasset://sounds/electronicpingshort.wav", 0.5 }, scream = { "rbxasset://sounds/uuhhh.mp3", 0.8 },
	swing = { "rbxasset://sounds/swoosh.wav", 1.4 }, hit = { "rbxasset://sounds/collide.wav", 0.8 },
	pistol = { "rbxasset://sounds/electronicpingshort.wav", 3 }, shotgun = { "rbxasset://sounds/electronicpingshort.wav", 2 }, rifle = { "rbxasset://sounds/electronicpingshort.wav", 3.5 },
	dry = { "rbxasset://sounds/electronicpingshort.wav", 4 }, drink = { "rbxasset://sounds/impact_water.mp3", 1.4 }, eat = { "rbxasset://sounds/swoosh.wav", 2.5 },
	-- v1.4 phase 2
	wave = { "rbxasset://sounds/impact_water.mp3", 0.5 }, splash = { "rbxasset://sounds/impact_water.mp3", 0.8 }, whirl = { "rbxasset://sounds/swoosh.wav", 0.25 },
	tentacle = { "rbxasset://sounds/swoosh.wav", 0.6 }, thunder = { "rbxasset://sounds/action_falling.mp3", 0.25 }, slam = { "rbxasset://sounds/collide.wav", 0.4 },
	roar = { "rbxasset://sounds/uuhhh.mp3", 0.45 }, drain = { "rbxasset://sounds/swoosh.wav", 1.8 }, bats = { "rbxasset://sounds/electronicpingshort.wav", 2.8 },
	throw = { "rbxasset://sounds/swoosh.wav", 0.8 }, screech = { "rbxasset://sounds/electronicpingshort.wav", 1.6 }, stone = { "rbxasset://sounds/collide.wav", 0.3 },
	fire = { "rbxasset://sounds/swoosh.wav", 0.4 }, fester = { "rbxasset://sounds/uuhhh.mp3", 0.6 },
	-- v1.5.1 (T-Rex / Spinosaurus roars: upload roblox/sounds/trex_roar.mp3 + spino_roar.mp3 - built from CC0/public-domain recordings - and paste ids into Config.SOUNDS)
	trexroar = { "rbxasset://sounds/uuhhh.mp3", 0.32 }, spinoroar = { "rbxasset://sounds/uuhhh.mp3", 0.55 },
	static = { "rbxasset://sounds/swoosh.wav", 3.2 }, crack = { "rbxasset://sounds/collide.wav", 1.6 }, mimic = { "rbxasset://sounds/uuhhh.mp3", 1.25 },
	skitter = { "rbxasset://sounds/electronicpingshort.wav", 5 },
}
-- phase-2 screen effects: tint pulses, camera shake, lightning
local tintOver = new("Frame", { BackgroundColor3 = Color3.new(1, 1, 1), BackgroundTransparency = 1, Size = UDim2.fromScale(1, 1), ZIndex = 13 }, gui)
local tintText = label(tintOver, "", 34, { Font = Enum.Font.Creepster, TextColor3 = RED, Position = UDim2.new(0, 0, 0.3, 0), Size = UDim2.new(1, 0, 0, 50), ZIndex = 13 })
local function tint(color, from, secs, text)
	tintOver.BackgroundColor3 = color
	tintOver.BackgroundTransparency = from
	tintText.Text = text or ""
	TweenService:Create(tintOver, TweenInfo.new(secs), { BackgroundTransparency = 1 }):Play()
	if text then task.delay(secs, function() if tintText.Text == text then tintText.Text = "" end end) end
end
local shakeUntil, shakeAmt = 0, 0
RunService:BindToRenderStep("NH_Shake", Enum.RenderPriority.Camera.Value + 1, function()
	if os.clock() < shakeUntil then
		local cam = workspace.CurrentCamera
		cam.CFrame = cam.CFrame * CFrame.Angles((math.random() - 0.5) * shakeAmt, (math.random() - 0.5) * shakeAmt, 0)
	end
end)
local function shakeFor(secs, amt) shakeUntil = os.clock() + secs; shakeAmt = amt or 0.02 end
local function lightning(n)
	for i = 1, n do task.delay((i - 1) * 0.35 + math.random() * 0.2, function() tint(Color3.new(1, 1, 1), 0.15, 0.25) end) end
end
local OMEN = {
	kraken = "Tentacles break the surface nearby...", leviathan = "Huge coils roll through the water...", mosasaurus = "A giant tail flicks out of the sea...",
	megalodon = "A dorsal fin is circling...", nessie = "A long neck rises out of the water...", spinosaurus = "A sail glides through the swamp...",
	cthulhu = "Red eyes and wings in the storm clouds...",
}
local lastStormWarn = 0
local function sfx(kind, pos)
	local up = Config.SOUNDS[kind]
	local d = SFX[kind]
	if not d and (not up or up == "") then return end
	local id = (up and up ~= "") and up or d[1]
	local parent = gui
	if typeof(pos) == "Vector3" then
		local a = Instance.new("Attachment")
		a.WorldPosition = pos
		a.Parent = workspace.Terrain
		game:GetService("Debris"):AddItem(a, 6)
		parent = a
	end
	local s = playSound(id, (up and up ~= "") and 1 or d[2], 1.5, parent)
	if parent ~= gui then s.RollOffMaxDistance = 260 end
end

local function sightHighlights(secs, onlyUserId)
	for _, p in ipairs(Players:GetPlayers()) do
		if p ~= player and p:GetAttribute("Role") == "Survivor" and p.Character and (not onlyUserId or p.UserId == onlyUserId) then
			local hl = Instance.new("Highlight")
			hl.FillColor = Color3.fromRGB(255, 30, 30)
			hl.OutlineColor = Color3.new(1, 1, 1)
			hl.DepthMode = Enum.HighlightDepthMode.AlwaysOnTop
			hl.Parent = p.Character
			game:GetService("Debris"):AddItem(hl, secs)
		end
	end
end

local function locustSlam()
	-- an old OS wallpaper fills the screen, a childish voice... then the Locust slams the glass
	locustOver.Visible = true
	locustOver.BackgroundColor3 = Color3.fromRGB(0, 120, 140)
	locustText.Text = "hello? can you see me?"
	playSound("rbxasset://sounds/electronicpingshort.wav", 1.8, 1)
	task.delay(1.6, function()
		locustText.Text = ""
		locustOver.BackgroundColor3 = Color3.new(0, 0, 0)
		local tpl = Templates:FindFirstChild("locust")
		local vp = new("ViewportFrame", { BackgroundTransparency = 1, Size = UDim2.fromScale(1, 1), ZIndex = 26, Ambient = Color3.fromRGB(200, 200, 200) }, locustOver)
		local cam = Instance.new("Camera")
		cam.Parent = vp
		vp.CurrentCamera = cam
		if tpl then
			local mm = tpl:Clone()
			mm.Parent = vp
			local cf, sz = mm:GetBoundingBox()
			local hy = cf.Position.Y + sz.Y / 2 - 1.8
			cam.CFrame = CFrame.lookAt(Vector3.new(0, hy, -2.6), Vector3.new(0, hy, 0))
		end
		playSound("rbxasset://sounds/action_falling.mp3", 0.5, 3)
		playSound("rbxasset://sounds/uuhhh.mp3", 1.3, 2)
		for i = 1, 9 do -- glass cracks
			new("Frame", { BackgroundColor3 = Color3.new(1, 1, 1), AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.fromScale(0.5, 0.5), Size = UDim2.new(0, math.random(200, 700), 0, 2), Rotation = i * 20 + math.random(0, 10), ZIndex = 27 }, locustOver)
		end
		task.delay(1.4, function()
			locustOver.Visible = false
			for _, c in ipairs(locustOver:GetChildren()) do if c ~= locustText and not c:IsA("UICorner") then c:Destroy() end end
		end)
	end)
end

-- tools: clicking / tapping fires the held item along the camera look
local function hookTool(tool)
	if not tool:IsA("Tool") or tool:GetAttribute("NH_Hooked") then return end
	tool:SetAttribute("NH_Hooked", true)
	tool.Activated:Connect(function() Action:FireServer("fire", workspace.CurrentCamera.CFrame.LookVector) end)
end
local function hookChar(c)
	for _, d in ipairs(c:GetChildren()) do hookTool(d) end
	c.ChildAdded:Connect(hookTool)
end
if player.Character then hookChar(player.Character) end
player.CharacterAdded:Connect(hookChar)

-- monster health billboards over every monster (seen by survivors)
local function monsterBillboard(p)
	local c = p.Character
	local hrp = c and c:FindFirstChild("HumanoidRootPart")
	if not hrp then return end
	local bb = hrp:FindFirstChild("NH_HpBoard")
	if not bb then
		bb = new("BillboardGui", { Name = "NH_HpBoard", Size = UDim2.fromOffset(120, 26), StudsOffset = Vector3.new(0, 9, 0), AlwaysOnTop = false, MaxDistance = 120 }, hrp)
		local bg = new("Frame", { Name = "Bg", BackgroundColor3 = Color3.fromRGB(40, 0, 0), Size = UDim2.new(1, 0, 0, 10) }, bb)
		new("Frame", { Name = "Fill", BackgroundColor3 = Color3.fromRGB(220, 40, 40), Size = UDim2.fromScale(1, 1) }, bg)
		label(bb, "", 12, { Name = "Txt", Position = UDim2.new(0, 0, 0, 10), Size = UDim2.new(1, 0, 0, 16), Font = Enum.Font.GothamBold })
	end
	local hp, max = p:GetAttribute("MonsterHp") or 0, p:GetAttribute("MonsterMaxHp") or 1
	bb.Bg.Fill.Size = UDim2.fromScale(math.clamp(hp / max, 0, 1), 1)
	bb.Txt.Text = p:GetAttribute("Down") and "KNOCKED DOWN" or ""
end

---------------------------------------------------------------------------
-- Lobby locker: customize your survivor, coin shop (in-game coins only), monster preference
---------------------------------------------------------------------------
local HttpService = game:GetService("HttpService")
local function myProfile()
	local ok, pr = pcall(function() return HttpService:JSONDecode(player:GetAttribute("Profile") or "{}") end)
	pr = ok and pr or {}
	pr.look = pr.look or {}
	local owned = {}
	for _, k in ipairs(pr.owned or {}) do owned[k] = true end
	pr.ownedSet = owned
	return pr
end
-- v1.4.1 emotes: standard avatar emote animations played on your own character (they replicate to everyone)
local myEmote = "wave"
local emoteTrack
local function playEmote(id)
	id = id or myEmote
	local hum = player.Character and player.Character:FindFirstChildOfClass("Humanoid")
	local animator = hum and (hum:FindFirstChildOfClass("Animator") or hum:WaitForChild("Animator", 1))
	if not animator or not Config.EMOTE_ANIMS[id] then return end
	Action:FireServer("emote", id)
	if emoteTrack then emoteTrack:Stop() end
	local a = Instance.new("Animation")
	a.AnimationId = Config.EMOTE_ANIMS[id]
	local ok, tr = pcall(function() return animator:LoadAnimation(a) end)
	if ok and tr then
		emoteTrack = tr
		tr.Priority = Enum.AnimationPriority.Action
		tr:Play()
		task.delay(4, function() if emoteTrack == tr then tr:Stop() end end)
	end
end
local locker = new("Frame", { BackgroundColor3 = PANEL, Size = UDim2.new(0, 440, 0, 470), Position = UDim2.new(0.5, -220, 0.5, -235), Visible = false, ZIndex = 50 }, gui)
corner(locker, 12)
padding(locker, 12)
local lockerTitle = label(locker, "LOCKER", 26, { Font = Enum.Font.Creepster, TextColor3 = RED, ZIndex = 51 })
local lockerScroll = new("ScrollingFrame", { BackgroundTransparency = 1, Position = UDim2.new(0, 0, 0, 36), Size = UDim2.new(1, 0, 1, -80), CanvasSize = UDim2.new(), AutomaticCanvasSize = Enum.AutomaticSize.Y, ScrollBarThickness = 6, ZIndex = 51 }, locker)
list(lockerScroll, 6)
button(locker, "Close", { Position = UDim2.new(0, 0, 1, -38), Size = UDim2.new(1, 0, 0, 36), ZIndex = 52 }, function() locker.Visible = false end)
local refreshLocker
-- v1.4.1: one section per store on the shopping street (walking up to a store's counter opens its section)
local lockerTab = "food"
local STORE_ALIAS = { shop = "food", look = "clothing", skins = "monskins" }
local STORE_SHORT = { skinshop = "Skins", weapons = "Weapons", armor = "Armor", food = "Food", monskins = "Monsters", emotes = "Emotes", pets = "Pets", clothing = "Clothes", crate = "Crates" }
local STORE_BY = {}
for _, st in ipairs(Config.STORES) do STORE_BY[st.k] = st end
local tabBar = new("Frame", { BackgroundTransparency = 1, Position = UDim2.new(0, 0, 0, 34), Size = UDim2.new(1, 0, 0, 56), ZIndex = 52 }, locker)
for i, st in ipairs(Config.STORES) do
	local row_, col = (i <= 5) and 0 or 1, (i <= 5) and (i - 1) or (i - 6)
	local per = row_ == 0 and 5 or 4
	button(tabBar, STORE_SHORT[st.k], { Size = UDim2.new(1 / per, -4, 0, 25), Position = UDim2.new(col / per, 2, 0, row_ * 28), TextSize = 12, ZIndex = 53, BackgroundColor3 = st.c:Lerp(Color3.new(0, 0, 0), 0.55) }, function() lockerTab = st.k; refreshLocker() end)
end
local crateMsg = ""
lockerScroll.Position = UDim2.new(0, 0, 0, 96)
lockerScroll.Size = UDim2.new(1, 0, 1, -140)
locker.Size = UDim2.new(0, 480, 0, 560)
locker.Position = UDim2.new(0.5, -240, 0.5, -280)
local function row(text, order, actions)
	local r = new("Frame", { BackgroundColor3 = DARK, Size = UDim2.new(1, -8, 0, 34), LayoutOrder = order, ZIndex = 52 }, lockerScroll)
	corner(r, 6)
	label(r, text, 13, { Size = UDim2.new(1, -150, 1, 0), Position = UDim2.new(0, 8, 0, 0), TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 53 })
	for i, a in ipairs(actions) do
		button(r, a[1], { Size = UDim2.new(0, 68, 0, 28), Position = UDim2.new(1, -72 * (#actions - i + 1), 0, 3), TextSize = 12, ZIndex = 53, BackgroundColor3 = a[3] or RED }, function() a[2](); task.delay(0.35, refreshLocker) end)
	end
end
local monsterPrefIdx = 0
refreshLocker = function()
	for _, c in ipairs(lockerScroll:GetChildren()) do if c:IsA("Frame") or c:IsA("TextLabel") then c:Destroy() end end
	local pr = myProfile()
	lockerTab = STORE_ALIAS[lockerTab] or lockerTab
	if not STORE_BY[lockerTab] then lockerTab = "food" end
	lockerTitle.Text = ("%s  -  %d coins"):format(STORE_BY[lockerTab].name, pr.coins or 0)
	lockerTitle.TextColor3 = STORE_BY[lockerTab].c
	local o = 0
	local function nxt() o += 1; return o end
	local cats = ({ skinshop = { "hat", "acc" }, weapons = { "supply" }, armor = { "supply" }, food = { "supply" }, monskins = { "skin" },
		emotes = { "emote" }, pets = { "pet", "trail" }, clothing = { "outfit" }, crate = {} })[lockerTab]
	if lockerTab == "crate" then
		label(lockerScroll, "Mystery Crate - a random hat, accessory, outfit, monster skin, pet, trail or emote you don't own yet", 14, { LayoutOrder = nxt(), ZIndex = 52, Size = UDim2.new(1, -8, 0, 40) })
		row(("Open a crate  -  %d coins"):format(Config.CRATE_PRICE), nxt(), { { "Open", function() Action:FireServer("crate") end, Color3.fromRGB(130, 70, 200) } })
		if crateMsg ~= "" then label(lockerScroll, crateMsg, 18, { LayoutOrder = nxt(), Font = Enum.Font.GothamBlack, TextColor3 = Color3.fromRGB(255, 215, 107), ZIndex = 52, Size = UDim2.new(1, -8, 0, 50) }) end
	end
	if lockerTab == "emotes" then
		label(lockerScroll, "Buy an emote, then press B (or the Emote button) to play it. Wave is free.", 13, { LayoutOrder = nxt(), ZIndex = 52, TextColor3 = MUTED, Size = UDim2.new(1, -8, 0, 34) })
		local items = {}
		for id, price in pairs(Config.SHOP.emote) do table.insert(items, { id, price }) end
		table.sort(items, function(x, y) return x[2] < y[2] end)
		for _, it in ipairs(items) do
			local id, price = it[1], it[2]
			local have = price == 0 or pr.ownedSet["emote:" .. id]
			row(("%s%s%s"):format(id:sub(1, 1):upper() .. id:sub(2), have and "" or ("  -  " .. price .. " coins"), (myEmote == id) and "  (on B)" or ""), nxt(), {
				have and { "Play", function() myEmote = id; playEmote(id) end, Color3.fromRGB(60, 60, 70) } or { "Buy", function() Action:FireServer("buy", { cat = "emote", id = id }) end },
			})
		end
		cats = {}
	end
	if lockerTab == "clothing" then
	label(lockerScroll, "Your survivor (check the mirror!)", 15, { LayoutOrder = nxt(), Font = Enum.Font.GothamBold, ZIndex = 52 })
	local cyc = function(k, n) return function() Action:FireServer("look", { [k] = ((pr.look[k] or 1) % n) + 1 }) end end
	row("Skin tone", nxt(), { { "Next", cyc("sk", #Config.SKIN_TONES) } })
	row("Hair colour", nxt(), { { "Next", cyc("hc", #Config.HAIR_COLORS) } })
	row("Hair style", nxt(), { { "Next", cyc("hs", 4) } })
	row("Shirt", nxt(), { { "Next", cyc("top", #Config.CLOTHES) } })
	row("Pants", nxt(), { { "Next", cyc("pants", #Config.CLOTHES) } })
	end
	for _, cat in ipairs(cats) do
		label(lockerScroll, ({ hat = "Hats", acc = "Accessories", skin = "Monster skins", outfit = "Outfits", pet = "Pets (follow you around)", trail = "Trails", supply = ("Round supplies (max %d, handed out next round)"):format(Config.KIT_MAX) })[cat], 15, { LayoutOrder = nxt(), Font = Enum.Font.GothamBold, ZIndex = 52 })
		if cat == "supply" then
			local kit = {}
			for _, k in ipairs(pr.kit or {}) do table.insert(kit, Config.ITEMS[k] and Config.ITEMS[k].name or k) end
			label(lockerScroll, "Packed: " .. (#kit > 0 and table.concat(kit, ", ") or "nothing"), 13, { LayoutOrder = nxt(), ZIndex = 52, TextColor3 = MUTED })
			local items = {}
			for id, price in pairs(Config.SHOP.supply) do if Config.SUPPLY_SHOP[id] == lockerTab then table.insert(items, { id, price }) end end
			table.sort(items, function(x, y) return x[2] < y[2] end)
			for _, it in ipairs(items) do
				row(("%s  -  %d coins"):format(Config.ITEMS[it[1]] and Config.ITEMS[it[1]].name or it[1], it[2]), nxt(), { { "Buy", function() Action:FireServer("buy", { cat = "supply", id = it[1] }) end } })
			end
			continue
		end
		local cur = cat == "skin" and (pr.skin or "classic") or (pr.look[cat] or "none")
		row((cat == "skin" and "classic" or "none") .. ((cur == "none" or cur == "classic") and "  (worn)" or ""), nxt(), { { "Wear", function() Action:FireServer("equip", { cat = cat, id = cat == "skin" and "classic" or "none" }) end, Color3.fromRGB(60, 60, 70) } })
		local items = {}
		for id, price in pairs(Config.SHOP[cat]) do table.insert(items, { id, price }) end
		table.sort(items, function(x, y) return x[2] < y[2] end)
		for _, it in ipairs(items) do
			local id, price = it[1], it[2]
			local have = pr.ownedSet[cat .. ":" .. id]
			row(("%s%s"):format(id, cur == id and "  (worn)" or (have and "" or ("  -  " .. price .. " coins"))), nxt(), {
				have and { "Wear", function() Action:FireServer("equip", { cat = cat, id = id }) end, Color3.fromRGB(60, 60, 70) }
					or { "Buy", function() Action:FireServer("buy", { cat = cat, id = id }) end },
			})
		end
	end
	if lockerTab ~= "monskins" then return end
	label(lockerScroll, "Monster preference (if you become a monster)", 15, { LayoutOrder = nxt(), Font = Enum.Font.GothamBold, ZIndex = 52 })
	local prefName = (pr.pref and pr.pref ~= "" and Config.MONSTERS[pr.pref]) and Config.MONSTERS[pr.pref].name or "Random"
	row(prefName, nxt(), { { "Next", function()
		monsterPrefIdx = (monsterPrefIdx + 1) % (#Config.MONSTER_KEYS + 1)
		Action:FireServer("pref", monsterPrefIdx == 0 and "" or Config.MONSTER_KEYS[monsterPrefIdx])
	end } })
end
local lockerBtn = button(lobbyPanel, "Locker & shop", { LayoutOrder = 9, BackgroundColor3 = Color3.fromRGB(90, 70, 30) }, function()
	locker.Visible = not locker.Visible
	if locker.Visible then refreshLocker() end
end)
_ = lockerBtn
local emoteBtn = button(lobbyPanel, "Emote (B)", { LayoutOrder = 9, TextSize = 13, BackgroundColor3 = Color3.fromRGB(110, 90, 20) }, function() playEmote(myEmote) end)
_ = emoteBtn
UserInputService.InputBegan:Connect(function(inp, gp)
	if gp then return end
	if inp.KeyCode == Enum.KeyCode.B and State:GetAttribute("State") ~= "Hunt" then playEmote(myEmote) end
end)
-- shopping street props: disco tiles flash, crates and the disco ball spin, pets on their beds bob
task.spawn(function()
	local lobbyModel = workspace:WaitForChild("Lobby", 30)
	local street = lobbyModel and lobbyModel:WaitForChild("ShoppingStreet", 30)
	if not street then return end
	local disco, spin, bob = {}, {}, {}
	for _, d in ipairs(street:GetDescendants()) do
		if d:IsA("BasePart") and d:GetAttribute("Disco") then table.insert(disco, d) end
		if d:IsA("BasePart") and d:GetAttribute("Spin") then table.insert(spin, { d, d.CFrame }) end
		if d:IsA("Model") and d:GetAttribute("Bob") then table.insert(bob, { d, d:GetPivot() }) end
	end
	local t = 0
	RunService.Heartbeat:Connect(function(dt)
		t += dt
		if State:GetAttribute("State") == "Hunt" then return end
		for i, d in ipairs(disco) do d.Color = Color3.fromHSV((t * 0.6 + i * 0.137) % 1, 0.8, 1) end
		for _, sp in ipairs(spin) do sp[1].CFrame = sp[2] * CFrame.new(0, math.sin(t * 2) * 0.3, 0) * CFrame.Angles(0, t * 1.2, 0) end
		for i, b in ipairs(bob) do b[1]:PivotTo(b[2] * CFrame.new(0, math.abs(math.sin(t * 3 + i)) * 0.5, 0)) end
	end)
end)
local roundBtn = button(lobbyPanel, "", { LayoutOrder = 10, TextSize = 13, BackgroundColor3 = Color3.fromRGB(60, 50, 90) }, function()
	local cur = State:GetAttribute("RoundLen") or 420
	local i = table.find(Config.ROUND_LENGTHS, cur) or 2
	Action:FireServer("settings", { roundLen = Config.ROUND_LENGTHS[i % #Config.ROUND_LENGTHS + 1] })
end)
lobbyPanel.Size = UDim2.new(0, 290, 0, 480)
lobbyPanel.Position = UDim2.new(1, -302, 1, -492)


---------------------------------------------------------------------------
-- Lighting per state / role
---------------------------------------------------------------------------
local function effect(className, name)
	local e = Lighting:FindFirstChild(name) or Lighting:FindFirstChildOfClass(className)
	if not e then e = Instance.new(className); e.Name = name; e.Parent = Lighting end
	return e
end
local atmosphere = effect("Atmosphere", "NH_Atmosphere")
local grade = effect("ColorCorrectionEffect", "NH_Grade")
local bloom = effect("BloomEffect", "NH_Bloom")
local rays = effect("SunRaysEffect", "NH_SunRays")
-- v1.6 realism: depth of field, a moonlit star sky with clouds, per-map colour grades, wet specular in the rain
local dof = effect("DepthOfFieldEffect", "NH_DOF")
dof.NearIntensity, dof.FocusDistance, dof.InFocusRadius = 0, 40, 70
local nightSky = Lighting:FindFirstChildOfClass("Sky") or Instance.new("Sky")
nightSky.Name = "NH_Sky"; nightSky.StarCount = 3000; nightSky.MoonAngularSize = 13; nightSky.CelestialBodiesShown = true; nightSky.Parent = Lighting
local clouds = workspace.Terrain:FindFirstChildOfClass("Clouds") or Instance.new("Clouds")
clouds.Cover, clouds.Density, clouds.Color = 0.62, 0.45, Color3.fromRGB(70, 74, 88); clouds.Parent = workspace.Terrain
pcall(function() workspace.Terrain.Decoration = true end) -- animated wind-swayed grass blades where allowed
local GRADE = { -- tint, saturation, contrast, atmosphere haze, density, wet (rain specular), cloud cover
	["Foggy Woods"] = { Color3.fromRGB(196, 214, 210), -0.42, 0.24, 3.2, 0.58, false, 0.7 },
	["Powerline Forest"] = { Color3.fromRGB(200, 214, 240), -0.35, 0.22, 2.4, 0.46, false, 0.55 },
	["Abandoned Pizzeria Town"] = { Color3.fromRGB(236, 214, 196), -0.3, 0.2, 2, 0.4, false, 0.6 },
	["Static Fields"] = { Color3.fromRGB(214, 220, 196), -0.5, 0.26, 2.6, 0.48, false, 0.8 },
	["Stormy Ocean"] = { Color3.fromRGB(186, 210, 230), -0.38, 0.26, 2.8, 0.52, true, 0.95 },
	["Rainforest Swamp"] = { Color3.fromRGB(196, 222, 196), -0.25, 0.22, 3, 0.55, true, 0.85 },
	["Snowy Mountain"] = { Color3.fromRGB(205, 225, 255), -0.3, 0.18, 2.2, 0.5, false, 0.75 },
	["Haunted Farm"] = { Color3.fromRGB(238, 218, 190), -0.32, 0.22, 2.4, 0.46, false, 0.6 },
	["Vampire Castle"] = { Color3.fromRGB(235, 196, 200), -0.3, 0.26, 2.2, 0.44, false, 0.7 },
	["Fester Street"] = { Color3.fromRGB(225, 225, 200), -0.28, 0.2, 2, 0.4, false, 0.5 },
}
local function lerpTo(obj, prop, v, k)
	local cur = obj[prop]
	if typeof(cur) == "number" then obj[prop] = cur + (v - cur) * k
	elseif typeof(cur) == "Color3" then obj[prop] = cur:Lerp(v, k)
	else obj[prop] = v end
end
local lastLightT = os.clock()
local function applyLighting()
	local now = os.clock()
	local k = math.clamp((now - lastLightT) * 3, 0, 1) -- smooth transitions
	lastLightT = now
	local st = State:GetAttribute("State")
	local role = player:GetAttribute("Role")
	local alive = player:GetAttribute("Alive") and not player:GetAttribute("Escaped")
	local inMap = st == "Hunt" and (role == "Monster" or (role == "Survivor" and alive))
	local spectating = st == "Hunt" and not inMap
	local fogColor = State:GetAttribute("FogColor") or Color3.new(0, 0, 0)
	Lighting.GlobalShadows = true
	Lighting.ShadowSoftness = 0.35
	if inMap then
		local mon = role == "Monster"
		Lighting.ClockTime = 0.2
		lerpTo(Lighting, "Brightness", mon and 0.8 or 0.35, k)
		lerpTo(Lighting, "ExposureCompensation", mon and 0.3 or -0.1, k)
		Lighting.EnvironmentDiffuseScale = 0.15
		Lighting.EnvironmentSpecularScale = 0.6
		lerpTo(Lighting, "OutdoorAmbient", mon and Color3.fromRGB(75, 28, 28) or Color3.fromRGB(16, 16, 22), k)
		lerpTo(Lighting, "Ambient", mon and Color3.fromRGB(50, 18, 18) or Color3.fromRGB(8, 8, 12), k)
		Lighting.FogColor = fogColor
		Lighting.FogEnd = 100000 -- Atmosphere handles the fog under Future lighting
		lerpTo(atmosphere, "Density", mon and 0.36 or 0.5, k)
		atmosphere.Offset = 0.15
		lerpTo(atmosphere, "Color", fogColor:Lerp(Color3.fromRGB(110, 110, 120), 0.35), k)
		lerpTo(atmosphere, "Decay", fogColor, k)
		atmosphere.Glare = 0
		lerpTo(atmosphere, "Haze", 2.6, k)
		lerpTo(grade, "Contrast", 0.22, k)
		lerpTo(grade, "Saturation", mon and -0.1 or -0.4, k)
		lerpTo(grade, "Brightness", 0, k)
		lerpTo(grade, "TintColor", mon and Color3.fromRGB(255, 200, 200) or Color3.fromRGB(205, 220, 255), k)
		bloom.Intensity, bloom.Size, bloom.Threshold = 0.9, 28, 0.9
		rays.Intensity = 0
		local g = GRADE[State:GetAttribute("Theme") or ""]
		if g then
			if not mon then lerpTo(grade, "TintColor", g[1], k); lerpTo(grade, "Saturation", g[2], k) end
			lerpTo(grade, "Contrast", g[3], k); lerpTo(atmosphere, "Haze", g[4], k); lerpTo(atmosphere, "Density", mon and g[5] * 0.7 or g[5], k)
			Lighting.EnvironmentSpecularScale = g[6] and 1 or 0.6 -- wet surfaces catch the moon in the rain
			clouds.Cover = g[7]
		end
		dof.FarIntensity = 0.12; dof.FocusDistance = 40
	elseif spectating then
		Lighting.ClockTime = 0.2
		lerpTo(Lighting, "Brightness", 1.4, k)
		lerpTo(Lighting, "ExposureCompensation", 0.5, k)
		lerpTo(Lighting, "OutdoorAmbient", Color3.fromRGB(70, 80, 110), k)
		lerpTo(Lighting, "Ambient", Color3.fromRGB(40, 45, 60), k)
		Lighting.FogEnd = 100000
		lerpTo(atmosphere, "Density", 0.3, k)
		lerpTo(atmosphere, "Color", fogColor:Lerp(Color3.fromRGB(120, 130, 160), 0.5), k)
		lerpTo(atmosphere, "Haze", 1.5, k)
		lerpTo(grade, "Saturation", -0.7, k)
		lerpTo(grade, "Contrast", 0.1, k)
		lerpTo(grade, "TintColor", Color3.fromRGB(190, 205, 255), k)
		bloom.Intensity, bloom.Size, bloom.Threshold = 0.7, 24, 1
		rays.Intensity = 0
	else
		-- lobby: dusk with sun rays and soft haze
		Lighting.ClockTime = 18.4
		lerpTo(Lighting, "Brightness", 2.2, k)
		lerpTo(Lighting, "ExposureCompensation", 0, k)
		Lighting.EnvironmentDiffuseScale = 0.8
		Lighting.EnvironmentSpecularScale = 0.8
		lerpTo(Lighting, "OutdoorAmbient", Color3.fromRGB(110, 95, 120), k)
		lerpTo(Lighting, "Ambient", Color3.fromRGB(45, 40, 55), k)
		Lighting.FogEnd = 100000
		Lighting.FogColor = Color3.fromRGB(40, 30, 45)
		lerpTo(atmosphere, "Density", 0.32, k)
		atmosphere.Offset = 0.1
		lerpTo(atmosphere, "Color", Color3.fromRGB(199, 150, 160), k)
		lerpTo(atmosphere, "Decay", Color3.fromRGB(106, 70, 110), k)
		atmosphere.Glare = 0.4
		lerpTo(atmosphere, "Haze", 1.4, k)
		lerpTo(grade, "Contrast", 0.12, k)
		lerpTo(grade, "Saturation", 0.05, k)
		lerpTo(grade, "Brightness", 0, k)
		lerpTo(grade, "TintColor", Color3.fromRGB(255, 236, 225), k)
		bloom.Intensity, bloom.Size, bloom.Threshold = 0.6, 24, 1.4
		rays.Intensity, rays.Spread = 0.08, 0.8
		dof.FarIntensity = 0.08; dof.FocusDistance = 60; clouds.Cover = 0.5
	end
end

---------------------------------------------------------------------------
-- Input: keyboard/gamepad + on-screen touch buttons (phone/tablet).
-- Movement uses Roblox's built-in thumbstick (StarterPlayer.DevTouchMovementMode = Thumbstick).
-- Buttons are bound only when they make sense: ability for monsters, flashlight for survivors.
---------------------------------------------------------------------------
local touch = UserInputService.TouchEnabled
local function placeButton(name, title, pos, size)
	ContextActionService:SetTitle(name, title)
	if touch then
		ContextActionService:SetPosition(name, pos)
		local b = ContextActionService:GetButton(name)
		if b then
			b.Size = size or UDim2.fromOffset(78, 78)
			local lbl = b:FindFirstChild("ActionTitle")
			if lbl and lbl:IsA("TextLabel") then lbl.TextScaled = true; lbl.Font = Enum.Font.GothamBold end
		end
	end
end
local sprintHeld = false
local function onSprint(_, inputState, input)
	if inputState == Enum.UserInputState.Begin then
		-- touch: tap toggles sprint (holding a button while steering is awkward); keys: hold
		if input and input.UserInputType == Enum.UserInputType.Touch then sprintHeld = not sprintHeld else sprintHeld = true end
		Action:FireServer("sprint", sprintHeld)
	elseif (inputState == Enum.UserInputState.End or inputState == Enum.UserInputState.Cancel) and not (input and input.UserInputType == Enum.UserInputType.Touch) then
		sprintHeld = false
		Action:FireServer("sprint", false)
	end
	return Enum.ContextActionResult.Pass
end
ContextActionService:BindAction("NH_Sprint", onSprint, true, Enum.KeyCode.LeftShift, Enum.KeyCode.RightShift, Enum.KeyCode.ButtonL3)
placeButton("NH_Sprint", "RUN", UDim2.new(1, -95, 1, -190), UDim2.fromOffset(70, 70))
local bound = { ability = false, flash = false, use = false, wake = false }
local function onAbility(_, inputState)
	if inputState == Enum.UserInputState.Begin then Action:FireServer("ability") end
	return Enum.ContextActionResult.Sink
end
local function onFlash(_, inputState)
	if inputState == Enum.UserInputState.Begin then Action:FireServer("flashlight") end
	return Enum.ContextActionResult.Sink
end
local function updateBindings()
	local st = State:GetAttribute("State")
	local role = player:GetAttribute("Role")
	local alive = player:GetAttribute("Alive") and not player:GetAttribute("Escaped")
	local wantAbility = st == "Hunt" and role == "Monster"
	local wantFlash = st == "Hunt" and role == "Survivor" and alive == true
	if wantAbility ~= bound.ability then
		bound.ability = wantAbility
		if wantAbility then
			ContextActionService:BindAction("NH_Ability", onAbility, true, Enum.KeyCode.E, Enum.KeyCode.Q, Enum.KeyCode.ButtonX)
			placeButton("NH_Ability", "POWER", UDim2.new(1, -185, 1, -150), UDim2.fromOffset(90, 90))
			local b = ContextActionService:GetButton("NH_Ability")
			if b then b.ImageColor3 = Color3.fromRGB(255, 90, 90) end
		else
			ContextActionService:UnbindAction("NH_Ability")
		end
	end
	if wantFlash ~= bound.flash then
		bound.flash = wantFlash
		if wantFlash then
			ContextActionService:BindAction("NH_Flashlight", onFlash, true, Enum.KeyCode.F, Enum.KeyCode.ButtonY)
			placeButton("NH_Flashlight", "LIGHT", UDim2.new(1, -175, 1, -110), UDim2.fromOffset(64, 64))
		else
			ContextActionService:UnbindAction("NH_Flashlight")
		end
	end
	local c = player.Character
	local wantUse = st == "Hunt" and role == "Survivor" and alive == true and touch and c ~= nil and c:FindFirstChildOfClass("Tool") ~= nil
	if wantUse ~= bound.use then
		bound.use = wantUse
		if wantUse then
			ContextActionService:BindAction("NH_Use", function(_, s2) if s2 == Enum.UserInputState.Begin then Action:FireServer("fire", workspace.CurrentCamera.CFrame.LookVector) end; return Enum.ContextActionResult.Sink end, true)
			placeButton("NH_Use", "ATTACK", UDim2.new(1, -270, 1, -150), UDim2.fromOffset(86, 86))
		else
			ContextActionService:UnbindAction("NH_Use")
		end
	end
	local wantWake = player:GetAttribute("Sleeping") == true
	if wantWake ~= bound.wake then
		bound.wake = wantWake
		if wantWake then
			ContextActionService:BindAction("NH_Wake", function(_, s2) if s2 == Enum.UserInputState.Begin then Action:FireServer("wake") end; return Enum.ContextActionResult.Sink end, true, Enum.KeyCode.Space, Enum.KeyCode.ButtonA)
			placeButton("NH_Wake", "WAKE UP", UDim2.new(0.5, -45, 0.6, 0), UDim2.fromOffset(90, 90))
		else
			ContextActionService:UnbindAction("NH_Wake")
		end
	end
	-- monsters can't open loot
	game:GetService("ProximityPromptService").Enabled = not (st == "Hunt" and role == "Monster")
	if st ~= "Hunt" and sprintHeld then sprintHeld = false; Action:FireServer("sprint", false) end
end
State:GetAttributeChangedSignal("State"):Connect(updateBindings)
player:GetAttributeChangedSignal("Role"):Connect(updateBindings)
player:GetAttributeChangedSignal("Alive"):Connect(updateBindings)
player:GetAttributeChangedSignal("Escaped"):Connect(updateBindings)
player:GetAttributeChangedSignal("Sleeping"):Connect(updateBindings)
task.spawn(function() while true do task.wait(0.5); updateBindings() end end) -- tool equip / unequip
task.defer(updateBindings)

-- scale the UI down on small screens (phones) so panels fit
local uiScale = Instance.new("UIScale")
uiScale.Parent = gui
local function rescale()
	local cam = workspace.CurrentCamera
	if not cam then return end
	local v = cam.ViewportSize
	uiScale.Scale = math.clamp(math.min(v.X / 1100, v.Y / 640), 0.55, 1)
end
rescale()
workspace.CurrentCamera:GetPropertyChangedSignal("ViewportSize"):Connect(rescale)

---------------------------------------------------------------------------
-- Server notifications
---------------------------------------------------------------------------
Notify.OnClientEvent:Connect(function(kind, a, b, c)
	if kind == "toast" then
		toast(a)
	elseif kind == "jumpscare" then
		stopSpec()
		jumpscare(a, b, c)
	elseif kind == "scare" then
		-- someone else got caught near you: hear the scream from their spot
		if a ~= player.UserId and typeof(c) == "Vector3" then
			local hrp = player.Character and player.Character:FindFirstChild("HumanoidRootPart")
			if hrp and (hrp.Position - c).Magnitude < 160 then sfx("scream", c) end
		end
	elseif kind == "kill" then
		-- you (the monster) caught someone: watch the kill from your own eyes
		local victim = Players:GetPlayerByUserId(b)
		local cam = workspace.CurrentCamera
		local myHead = player.Character and player.Character:FindFirstChild("HumanoidRootPart")
		if victim and victim.Character and myHead then
			local vh = victim.Character:FindFirstChild("HumanoidRootPart")
			local prevType = cam.CameraType
			cam.CameraType = Enum.CameraType.Scriptable
			local kfx = new("Frame", { BackgroundColor3 = Color3.fromRGB(90, 0, 0), BackgroundTransparency = 0.75, Size = UDim2.fromScale(1, 1), ZIndex = 29 }, gui)
			local cap = label(kfx, "YOU CAUGHT " .. tostring(c):upper(), 40, { Font = Enum.Font.Creepster, TextColor3 = RED, Position = UDim2.new(0, 0, 0.78, 0), Size = UDim2.new(1, 0, 0, 50), ZIndex = 31, Visible = false })
			local impact = IMPACT[a] or 1.55
			local start, hit = os.clock(), false
			killcamOn = true
			local conn
			conn = RunService.RenderStepped:Connect(function()
				local e = os.clock() - start
				if vh and vh.Parent and myHead.Parent then
					local eye = myHead.Position + Vector3.new(0, ({ sirenhead = 26, nessie = 14, trex = 11, spinosaurus = 12, dragon = 10, cthulhu = 10, yeti = 8, bigfoot = 7, fester = 9, quetzalcoatlus = 8 })[a] or 4, 0)
					cam.CFrame = CFrame.lookAt(eye, vh.Position + Vector3.new(0, 1.5, 0)) * CFrame.new((math.random() - 0.5) * 0.15, (math.random() - 0.5) * 0.15, 0)
				end
				kfx.BackgroundTransparency = 0.75 + math.sin(e * 9) * 0.08
				if e >= impact and not hit then
					hit = true
					cap.Visible = true
					if bloodOn then for i = 1, 6 do splat(kfx, (i % 2 == 0) and math.random() * 0.15 or 0.85 + math.random() * 0.15, math.random(), math.random(50, 140), 30) end end
				end
				if e > 2.4 then
					conn:Disconnect()
					kfx:Destroy()
					cam.CameraType = prevType == Enum.CameraType.Scriptable and Enum.CameraType.Custom or prevType
					killcamOn = false
					showKillPop(c, a) -- KILL popup only after the kill animation has fully finished
				end
			end)
		else
			task.delay(2.4, showKillPop, c, a) -- wait the same length as the kill animation
		end
	elseif kind == "effect" then
		if a == "grey" then greyUntil = os.clock() + b end
		if a == "dark" then darkUntil = os.clock() + b end
		if a == "static" then staticUntil = os.clock() + b end
		if a == "halluc" then hallucUntil = os.clock() + b end
		if a == "lightsout" then toast("Your flashlight died...") end
		local d = tonumber(b) or 1
		if a == "wave" then tint(Color3.fromRGB(40, 110, 170), 0.2, d); shakeFor(d * 0.6, 0.03)
		elseif a == "whirl" then tint(Color3.fromRGB(20, 70, 110), 0.35, d); shakeFor(d, 0.025); toast("You're caught in a whirlpool!")
		elseif a == "thunder" then lightning(3); shakeFor(0.6, 0.02)
		elseif a == "snow" then tint(Color3.fromRGB(235, 245, 255), 0.15, d); toast("Avalanche! You're buried in snow")
		elseif a == "shake" then shakeFor(d, 0.04)
		elseif a == "burn" then tint(Color3.fromRGB(255, 110, 20), 0.35, d); toast("You're on fire!")
		elseif a == "storm" then tint(Color3.fromRGB(20, 30, 60), 0.4, d); if math.random() < 0.25 then lightning(1) end; shakeFor(0.4, 0.02)
		elseif a == "stormwarn" then
			if os.clock() - lastStormWarn > 4 then lastStormWarn = os.clock(); tint(Color3.fromRGB(20, 30, 60), 0.6, 1.5, "STORM AHEAD - TURN BACK") end
		elseif a == "fester" then tint(Color3.new(0, 0, 0), 0, d, "HE IS GETTING CLOSER") end
	elseif kind == "omen" then
		toast(OMEN[a] or "Something stirs in the water...")
		if a == "cthulhu" then lightning(2) end
		sfx(a == "cthulhu" and "thunder" or "splash")
	elseif kind == "store" then
		-- walked up to a store counter on the shopping street: open that store's section
		lockerTab = type(a) == "string" and a or "food"
		locker.Visible = true
		refreshLocker()
	elseif kind == "crate" then
		local nice = ({ hat = "Hat", acc = "Accessory", outfit = "Outfit", skin = "Monster skin", pet = "Pet", trail = "Trail", emote = "Emote" })[a]
		crateMsg = nice and ("You won: %s - %s!"):format(nice, tostring(b)) or ("You got " .. tostring(b))
		toast("Mystery Crate: " .. crateMsg)
		playSound("rbxasset://sounds/electronicpingshort.wav", 1.2, 1.5)
		if locker.Visible then task.delay(0.3, refreshLocker) end
	elseif kind == "sfx" then
		sfx(a, b)
	elseif kind == "sight" then
		sightHighlights(a, b)
	elseif kind == "locust" then
		locustSlam()
	elseif kind == "hurt" then
		hurtOver.BackgroundTransparency = 0.45
		TweenService:Create(hurtOver, TweenInfo.new(0.5), { BackgroundTransparency = 1 }):Play()
	elseif kind == "coins" then
		toast(("+%d coins - %s"):format(a, b or ""))
	elseif kind == "pickup" then
		local def = Config.ITEMS[a]
		toast("Picked up " .. (def and def.name or tostring(a)))
	elseif kind == "escaped" then
		toast("You escaped! Watch from the lobby.")
	elseif kind == "flight" then
		death.Visible = false; res.Visible = false; killPop.Visible = false; pendingResults = nil
		stopSpec()
		overlay.Visible = true
		overlayTitle.Text = "TAKING OFF..."
		local role = player:GetAttribute("Role")
		local len = State:GetAttribute("RoundLen") or 420
		if role == "Monster" then
			local def = Config.MONSTERS[player:GetAttribute("Monster")] or Config.MONSTERS.freddy
			overlayText.Text = ("Flying to %s\n\nYou are %s!\nCatch every survivor in %d minutes.\nPower: %s - %s"):format(a, def.name:upper(), len // 60, def.ability, def.desc)
		else
			overlayText.Text = ("Flying to %s\n\nYou are a SURVIVOR.\nSearch chests and bags for food, armor and weapons. Fight back, hide, and survive %d minutes - the extraction helicopter lands with %ds left."):format(a, len // 60, math.min(Config.EXTRACT_AT, len - 30))
		end
	elseif kind == "results" then
		queueResults(a, b, c)
	end
end)

---------------------------------------------------------------------------
-- Per-frame update
---------------------------------------------------------------------------
local rotors = {}
local rotorRel = {}
local flickers = {}
local function fmtTime(t) return ("%d:%02d"):format(math.floor(t / 60), t % 60) end

RunService.RenderStepped:Connect(function(dt)
	local mode = State:GetAttribute("Mode")
	local st = State:GetAttribute("State")
	local role = player:GetAttribute("Role") or ""
	local tl = State:GetAttribute("TimeLeft") or 0

	-- top bar
	if mode == "Hub" then
		stateLbl.Text = "NIGHT HUNT"
		subLbl.Text = "Create a server, join a code, or browse public servers"
	elseif st == "Lobby" then
		stateLbl.Text = "LOBBY"
		subLbl.Text = "Walk onto the helipad to board"
	elseif st == "Flight" then
		stateLbl.Text = "IN FLIGHT"
		subLbl.Text = State:GetAttribute("Theme") or ""
	elseif st == "Hunt" then
		stateLbl.Text = fmtTime(tl)
		local extra = State:GetAttribute("ExtractOpen") and "  -  EXTRACTION IS HERE" or ("  -  heli in " .. fmtTime(math.max(0, tl - math.min(Config.EXTRACT_AT, (State:GetAttribute("RoundLen") or 420) - 30))))
		subLbl.Text = (State:GetAttribute("Theme") or "") .. extra
	elseif st == "Results" then
		stateLbl.Text = "ROUND OVER"
		subLbl.Text = "Back to the lobby in " .. tl
	end

	-- hub / lobby panels
	hubToggle.Visible = mode == "Hub"
	if mode ~= "Hub" then hub.Visible = false end
	lobbyPanel.Visible = mode == "Match" and st == "Lobby"
	if lobbyPanel.Visible then
		local isHost = State:GetAttribute("HostUserId") == player.UserId
		local max = State:GetAttribute("MaxPlayers") or 15
		local public = State:GetAttribute("IsPublic")
		local code = State:GetAttribute("ServerCode") or ""
		lpName.Text = State:GetAttribute("ServerName") or "Night Hunt"
		lpCode.Text = (public and "PUBLIC" or "FRIENDS ONLY") .. (code ~= "" and ("  -  code: " .. code) or "")
		local lines, boarded, n = {}, 0, 0
		for _, p in ipairs(Players:GetPlayers()) do
			n += 1
			local b = p:GetAttribute("Boarded")
			if b then boarded += 1 end
			table.insert(lines, (b and "[on board] " or "[  walking ] ") .. p.DisplayName .. (p.UserId == State:GetAttribute("HostUserId") and "  (host)" or ""))
		end
		lpPlayers.Text = ("Players %d/%d  -  boarded %d\n"):format(n, max, boarded) .. table.concat(lines, "\n")
		hostRow.Visible = isHost
		hostMaxLbl.Text = ("Max players: %d"):format(max)
		hostPrivacy.Visible = isHost
		hostPrivacy.Text = public and "Make FRIENDS ONLY" or "Make PUBLIC"
		takeOff.Visible = isHost
		roundBtn.Visible = isHost
		roundBtn.Text = ("Round length: %d min (tap to change)"):format((State:GetAttribute("RoundLen") or 420) // 60)
		local minN = State:GetAttribute("Studio") and 1 or Config.MIN_PLAYERS
		local ready = n >= minN and boarded == n
		takeOff.BackgroundColor3 = ready and RED or Color3.fromRGB(70, 70, 70)
		takeOff.Text = ready and "TAKE OFF" or (n < minN and ("NEED %d+ PLAYERS"):format(minN) or "WAITING FOR BOARDING")
		lpHint.Text = isHost and "Everyone must stand on the helipad. Each player has a random chance to become a monster."
			or "Stand on the helipad. The host takes off when everyone is aboard."
	end

	-- overlays
	if st == "Flight" then
		overlay.Visible = true
	elseif st == "Results" then
		overlay.Visible = false -- v1.4.1: the full results screen replaces the old text overlay
	else
		overlay.Visible = false
	end

	-- role card
	local inRound = (st == "Hunt" or st == "Flight") and (role == "Monster" or role == "Survivor")
	roleCard.Visible = inRound
	staminaBg.Visible = inRound and role == "Survivor" and player:GetAttribute("Alive") and not player:GetAttribute("Escaped")
	if inRound then
		if role == "Monster" then
			local def = Config.MONSTERS[player:GetAttribute("Monster")] or Config.MONSTERS.freddy
			roleTitle.Text = def.name:upper()
			roleTitle.TextColor3 = RED
			roleDesc.Text = "You are a monster. Catch every survivor!"
			local left = (player:GetAttribute("AbilityReadyAt") or 0) - workspace:GetServerTimeNow()
			local name = def.ability
			if player:GetAttribute("Monster") == "demogorgon" and player:GetAttribute("PortalSet") then name = "Jump to portal" end
			local desc = def.desc
			if player:GetAttribute("Monster") == "drnowhere" then
				local f = Config.DN_FORMS[player:GetAttribute("Form") or 1]
				name = f.ability
				desc = ("Form: %s - %s. Next form in %ds"):format(f.name, f.desc, math.max(0, math.ceil((player:GetAttribute("FormAt") or 0) - workspace:GetServerTimeNow())))
			end
			abilityBtn.Visible = true
			abilityBtn.Text = left > 0 and ("%s (%ds)"):format(name, math.ceil(left)) or ("[E] " .. name)
			abilityBtn.BackgroundColor3 = left > 0 and Color3.fromRGB(70, 70, 70) or RED
			abilityDesc.Text = desc
		else
			roleTitle.Text = player:GetAttribute("Escaped") and "ESCAPED" or (player:GetAttribute("Alive") and "SURVIVOR" or "CAUGHT")
			roleTitle.TextColor3 = Color3.fromRGB(120, 200, 255)
			roleDesc.Text = State:GetAttribute("ExtractOpen") and "Get to the helicopter - follow the green beam!" or "Hide, run, and survive until extraction."
			abilityBtn.Visible = false
			abilityDesc.Text = touch and "RUN: sprint · LIGHT: flashlight · ATTACK: use held item. Open chests and bags." or "Shift: sprint · F: flashlight · click: use held item · hold E: open chests and bags."
		end
	end
	staminaFill.Size = UDim2.new((player:GetAttribute("Stamina") or 100) / 100, 0, 1, 0)
	staminaFill.BackgroundColor3 = player:GetAttribute("CanSprint") == false and Color3.fromRGB(120, 120, 120) or Color3.fromRGB(230, 200, 80)
	staminaHint.Text = player:GetAttribute("CanSprint") == false and "can't sprint!" or "Shift = sprint"

	-- survivor HUD
	local aliveS = st == "Hunt" and role == "Survivor" and player:GetAttribute("Alive") and not player:GetAttribute("Escaped")
	hud.Visible = aliveS == true
	local hum = player.Character and player.Character:FindFirstChildOfClass("Humanoid")
	if hud.Visible and hum then
		local f = math.clamp(hum.Health / math.max(1, hum.MaxHealth), 0, 1)
		hpFill.Size = UDim2.fromScale(f, 1)
		hpFill.BackgroundColor3 = f > 0.5 and Color3.fromRGB(60, 190, 80) or (f > 0.25 and Color3.fromRGB(230, 170, 40) or Color3.fromRGB(210, 40, 40))
		hpLbl.Text = ("HP %d"):format(math.ceil(hum.Health))
		gearLbl.Text = ("Vest %d  Helmet %d   |   Ammo  light %d  shells %d  heavy %d"):format(player:GetAttribute("Vest") or 0, player:GetAttribute("Helmet") or 0,
			player:GetAttribute("Ammo_light") or 0, player:GetAttribute("Ammo_shells") or 0, player:GetAttribute("Ammo_heavy") or 0)
	end
	coinLbl.Text = ("%d coins"):format(player:GetAttribute("Coins") or 0)
	if st == "Hunt" then
		for _, p in ipairs(Players:GetPlayers()) do if p:GetAttribute("Role") == "Monster" and p ~= player then monsterBillboard(p) end end
	end
	darkOver.Visible = os.clock() < darkUntil and st == "Hunt"
	local hl = os.clock() < hallucUntil and st == "Hunt"
	halluc.Enabled, hallucBlur.Enabled = hl, hl
	if hl then
		local w = os.clock()
		halluc.TintColor = Color3.fromHSV((w * 0.25) % 1, 0.35, 1)
		halluc.Saturation = 0.4
		hallucBlur.Size = 4 + math.sin(w * 3) * 3
		workspace.CurrentCamera.FieldOfView = 70 + math.sin(w * 2.2) * 6
	elseif workspace.CurrentCamera.FieldOfView ~= 70 then
		workspace.CurrentCamera.FieldOfView = 70
	end

	-- effects
	local g = os.clock() < greyUntil
	grey.Enabled = g
	grey.Saturation = -1
	grey.Contrast = 0.2
	applyLighting()

	-- spin every helicopter rotor, flicker lights
	for _, part in ipairs(rotors) do
		if part.Parent then
			local base = part.Parent.PrimaryPart
			local rel = rotorRel[part]
			if base and rel then
				local spin = (os.clock() * 14) % (math.pi * 2)
				part.CFrame = base.CFrame * CFrame.Angles(0, spin, 0) * rel
			end
		end
	end
	for _, bulb in ipairs(flickers) do
		if bulb.Parent then
			local l = bulb:FindFirstChildOfClass("PointLight")
			if l and math.random() < 0.02 then
				l.Enabled = not l.Enabled
				bulb.Transparency = l.Enabled and 0 or 0.7
			end
		end
	end
end)

local function track(d)
	if d:IsA("BasePart") and d.Name == "Rotor" then
		task.defer(function()
			local base = d.Parent and d.Parent.PrimaryPart
			if base then
				rotorRel[d] = base.CFrame:ToObjectSpace(d.CFrame)
				table.insert(rotors, d)
			end
		end)
	elseif d:IsA("BasePart") and d.Name == "FlickerLight" then
		table.insert(flickers, d)
	end
end
for _, d in ipairs(workspace:GetDescendants()) do track(d) end
workspace.DescendantAdded:Connect(track)
task.spawn(function()
	while true do
		task.wait(5)
		for i = #rotors, 1, -1 do if not rotors[i].Parent then rotorRel[rotors[i]] = nil; table.remove(rotors, i) end end
		for i = #flickers, 1, -1 do if not flickers[i].Parent then table.remove(flickers, i) end end
	end
end)

-- first-time hub panel
task.defer(function()
	if State:GetAttribute("Mode") == "Hub" then hub.Visible = true end
end)
State:GetAttributeChangedSignal("Mode"):Connect(function()
	if State:GetAttribute("Mode") == "Match" then hub.Visible = false; toast("You're in your match server. Board the helicopter!") end
end)
