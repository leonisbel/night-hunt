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
local IMPACT = { sirenhead = 2.0, cartooncat = 1.9, monochrome = 2.0, locust = 1.9 }
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

local function jumpscare(kind, form)
	scareRun += 1
	local run = scareRun
	for _, c in ipairs(scare:GetChildren()) do if c:IsA("Model") then c:Destroy() end end
	for _, c in ipairs(scareFx:GetChildren()) do if c ~= scareBlack and c ~= scareText then c:Destroy() end end
	local key = kind
	if kind == "drnowhere" and Config.DN_FORMS[form or 1] then key = Config.DN_FORMS[form or 1].key end
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
	local impact = IMPACT[kind] or 1.55
	local start = os.clock()
	local hit = false
	local squares = {}
	playSound("rbxasset://sounds/electronicpingshort.wav", kind == "sonicexe" and 0.6 or 0.35, 2)
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
		elseif kind == "monochrome" then -- it stares while you dissolve
			camPos = Vector3.new(0, headY, -5.5 + e * 0.4); shake = 0.01
		elseif kind == "drnowhere" then
			local l = ease((e - 0.5) / 0.7)
			if form == 2 then camPos = Vector3.new(0, 2 + ease(e / 1.2) * (headY - 2), -6 + l * 3); shake = 0.1 + l * 0.4
			elseif form == 3 then m:PivotTo(base * CFrame.new(0, 0, -l * 2)); camPos = Vector3.new(0, headY, -7 + l * 3)
			else camPos = Vector3.new(0, headY, -7.5 + l * 4.4); shake = 0.05 + l * 0.35 end
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
			elseif kind == "monochrome" and math.random() < 0.8 then
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
		end
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
}
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
local locker = new("Frame", { BackgroundColor3 = PANEL, Size = UDim2.new(0, 440, 0, 470), Position = UDim2.new(0.5, -220, 0.5, -235), Visible = false, ZIndex = 50 }, gui)
corner(locker, 12)
padding(locker, 12)
local lockerTitle = label(locker, "LOCKER", 26, { Font = Enum.Font.Creepster, TextColor3 = RED, ZIndex = 51 })
local lockerScroll = new("ScrollingFrame", { BackgroundTransparency = 1, Position = UDim2.new(0, 0, 0, 36), Size = UDim2.new(1, 0, 1, -80), CanvasSize = UDim2.new(), AutomaticCanvasSize = Enum.AutomaticSize.Y, ScrollBarThickness = 6, ZIndex = 51 }, locker)
list(lockerScroll, 6)
button(locker, "Close", { Position = UDim2.new(0, 0, 1, -38), Size = UDim2.new(1, 0, 0, 36), ZIndex = 52 }, function() locker.Visible = false end)
local refreshLocker
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
	lockerTitle.Text = ("LOCKER  -  %d coins"):format(pr.coins or 0)
	local o = 0
	local function nxt() o += 1; return o end
	label(lockerScroll, "Your survivor", 15, { LayoutOrder = nxt(), Font = Enum.Font.GothamBold, ZIndex = 52 })
	local cyc = function(k, n) return function() Action:FireServer("look", { [k] = ((pr.look[k] or 1) % n) + 1 }) end end
	row("Skin tone", nxt(), { { "Next", cyc("sk", #Config.SKIN_TONES) } })
	row("Hair colour", nxt(), { { "Next", cyc("hc", #Config.HAIR_COLORS) } })
	row("Hair style", nxt(), { { "Next", cyc("hs", 4) } })
	row("Shirt", nxt(), { { "Next", cyc("top", #Config.CLOTHES) } })
	row("Pants", nxt(), { { "Next", cyc("pants", #Config.CLOTHES) } })
	for _, cat in ipairs({ "hat", "acc", "skin" }) do
		label(lockerScroll, ({ hat = "Hats", acc = "Accessories", skin = "Monster skins" })[cat], 15, { LayoutOrder = nxt(), Font = Enum.Font.GothamBold, ZIndex = 52 })
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
	Lighting.ShadowSoftness = 0.25
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
local resultsUntil = 0
Notify.OnClientEvent:Connect(function(kind, a, b, c)
	if kind == "toast" then
		toast(a)
	elseif kind == "jumpscare" then
		jumpscare(a, b)
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
			local conn
			conn = RunService.RenderStepped:Connect(function()
				local e = os.clock() - start
				if vh and vh.Parent and myHead.Parent then
					local eye = myHead.Position + Vector3.new(0, 4, 0)
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
				end
			end)
		end
	elseif kind == "effect" then
		if a == "grey" then greyUntil = os.clock() + b end
		if a == "dark" then darkUntil = os.clock() + b end
		if a == "halluc" then hallucUntil = os.clock() + b end
		if a == "lightsout" then toast("Your flashlight died...") end
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
		resultsUntil = os.clock() + Config.RESULTS_TIME
		overlay.Visible = true
		overlayTitle.Text = a
		overlayText.Text = table.concat(b, "\n")
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
		overlay.Visible = os.clock() < resultsUntil
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
