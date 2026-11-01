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
label(hub, "Fan-made monster survival - 2 to 15 players", 13, { TextColor3 = MUTED, LayoutOrder = 2 })
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
local scareText = label(scare, "CAUGHT", 70, { Font = Enum.Font.Creepster, TextColor3 = RED, Position = UDim2.new(0, 0, 0.78, 0), Size = UDim2.new(1, 0, 0, 80), ZIndex = 31 })

local function jumpscare(kind)
	for _, c in ipairs(scare:GetChildren()) do if c:IsA("Model") then c:Destroy() end end
	local t = Templates:FindFirstChild(kind) or Templates:FindFirstChild("freddy")
	local m = t:Clone()
	m.Parent = scare
	local cf, size = m:GetBoundingBox()
	local headY = cf.Position.Y + size.Y / 2 - 2.2
	local def = Config.MONSTERS[kind]
	scareText.Text = def and (def.name:upper() .. " GOT YOU") or "CAUGHT"
	scare.Visible = true
	local start = os.clock()
	local conn
	conn = RunService.RenderStepped:Connect(function()
		local e = os.clock() - start
		local dist = math.max(3.2, 9 - e * 14)
		local shake = Vector3.new(math.random() - 0.5, math.random() - 0.5, 0) * 0.35
		scareCam.CFrame = CFrame.lookAt(Vector3.new(0, headY, -dist) + shake, Vector3.new(0, headY, 0))
		if e > 1.8 then
			conn:Disconnect()
			scare.Visible = false
		end
	end)
	local s = Instance.new("Sound")
	s.SoundId = "rbxasset://sounds/electronicpingshort.wav"
	s.PlaybackSpeed = 0.35
	s.Volume = 2
	s.Parent = gui
	s:Play()
	game:GetService("Debris"):AddItem(s, 3)
end

local grey = Instance.new("ColorCorrectionEffect")
grey.Name = "NH_Grey"
grey.Enabled = false
grey.Parent = Lighting
local greyUntil = 0

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
local bound = { ability = false, flash = false }
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
	if st ~= "Hunt" and sprintHeld then sprintHeld = false; Action:FireServer("sprint", false) end
end
State:GetAttributeChangedSignal("State"):Connect(updateBindings)
player:GetAttributeChangedSignal("Role"):Connect(updateBindings)
player:GetAttributeChangedSignal("Alive"):Connect(updateBindings)
player:GetAttributeChangedSignal("Escaped"):Connect(updateBindings)
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
Notify.OnClientEvent:Connect(function(kind, a, b)
	if kind == "toast" then
		toast(a)
	elseif kind == "jumpscare" then
		jumpscare(a)
	elseif kind == "effect" then
		if a == "grey" then greyUntil = os.clock() + b end
		if a == "lightsout" then toast("Your flashlight died...") end
	elseif kind == "escaped" then
		toast("You escaped! Watch from the lobby.")
	elseif kind == "flight" then
		overlay.Visible = true
		overlayTitle.Text = "TAKING OFF..."
		local role = player:GetAttribute("Role")
		if role == "Monster" then
			local def = Config.MONSTERS[player:GetAttribute("Monster")] or Config.MONSTERS.freddy
			overlayText.Text = ("Flying to %s\n\nYou are %s!\nCatch every survivor before they escape.\nPower: %s - %s"):format(a, def.name:upper(), def.ability, def.desc)
		else
			overlayText.Text = ("Flying to %s\n\nYou are a SURVIVOR.\nStay hidden, use your flashlight, and reach the extraction helicopter when it lands (%ds left)."):format(a, Config.EXTRACT_AT)
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
		local extra = State:GetAttribute("ExtractOpen") and "  -  EXTRACTION IS HERE" or ("  -  heli in " .. fmtTime(math.max(0, tl - Config.EXTRACT_AT)))
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
			abilityBtn.Visible = true
			abilityBtn.Text = left > 0 and ("%s (%ds)"):format(name, math.ceil(left)) or ("[E] " .. name)
			abilityBtn.BackgroundColor3 = left > 0 and Color3.fromRGB(70, 70, 70) or RED
			abilityDesc.Text = def.desc
		else
			roleTitle.Text = player:GetAttribute("Escaped") and "ESCAPED" or (player:GetAttribute("Alive") and "SURVIVOR" or "CAUGHT")
			roleTitle.TextColor3 = Color3.fromRGB(120, 200, 255)
			roleDesc.Text = State:GetAttribute("ExtractOpen") and "Get to the helicopter - follow the green beam!" or "Hide, run, and survive until extraction."
			abilityBtn.Visible = false
			abilityDesc.Text = touch and "RUN: sprint · LIGHT: flashlight. Hide inside bushes and crates." or "Shift: sprint · F: flashlight. Hide inside bushes and crates."
		end
	end
	staminaFill.Size = UDim2.new((player:GetAttribute("Stamina") or 100) / 100, 0, 1, 0)
	staminaFill.BackgroundColor3 = player:GetAttribute("CanSprint") == false and Color3.fromRGB(120, 120, 120) or Color3.fromRGB(230, 200, 80)
	staminaHint.Text = player:GetAttribute("CanSprint") == false and "can't sprint!" or "Shift = sprint"

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
