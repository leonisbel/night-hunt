-- v1.4 (phase 2) server gameplay: the 16 new monster abilities (all 20s cooldowns), telltale omens,
-- the ocean storm, drivable boats and ships, the Megalodon's land form, and Father Fester's escalation.
-- init.server.luau passes its helpers in (they are locals there).
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local Debris = game:GetService("Debris")
local Config = require(game:GetService("ReplicatedStorage"):WaitForChild("NightHunt"):WaitForChild("Config"))

return function(X)
	local ABILITY, F, now, hrpOf, humOf, survivors, toast, Notify, Models = X.ABILITY, X.F, X.now, X.hrpOf, X.humOf, X.survivors, X.toast, X.Notify, X.Models
	local sfxAll, flatLook, clearLine, appearNear, spaceFree = X.sfxAll, X.flatLook, X.clearLine, X.appearNear, X.spaceFree
	local P2 = {}
	local hurt = function(_s, _d, _by) end
	function P2.setHurt(fn) hurt = fn end
	local function map() return X.getMap() end
	local function folder() return X.getFolder() or workspace end
	local rgb = Color3.fromRGB

	local function fxPart(size, cf, color, mat, shape, life, transp)
		local p = Instance.new("Part")
		p.Anchored, p.CanCollide, p.CanQuery, p.CanTouch, p.CastShadow = true, false, false, false, false
		p.Size, p.CFrame, p.Color = size, cf, color
		p.Material = mat or Enum.Material.SmoothPlastic
		if shape then p.Shape = shape end
		p.Transparency = transp or 0
		p.Parent = folder()
		if life then Debris:AddItem(p, life) end
		return p
	end
	-- animate a group of parts: f(t 0..1) -> offset CFrame applied to each part's base CFrame
	local function animate(parts, dur, f)
		local base = {}
		for i, p in ipairs(parts) do base[i] = p.CFrame end
		task.spawn(function()
			local t0 = os.clock()
			while os.clock() - t0 < dur do
				local t = (os.clock() - t0) / dur
				for i, p in ipairs(parts) do if p.Parent then p.CFrame = f(t, base[i], i) end end
				task.wait(0.05)
			end
			for _, p in ipairs(parts) do p:Destroy() end
		end)
	end
	local function survivorsNear(pos, r)
		local out = {}
		for _, s in ipairs(survivors(true)) do
			local h = hrpOf(s)
			if h and (h.Position - pos).Magnitude <= r then table.insert(out, s) end
		end
		return out
	end
	local function flat(v) return Vector3.new(v.X, 0, v.Z) end
	local function reveal(s, secs)
		if not s.Character then return end
		local hl = Instance.new("Highlight")
		hl.Name = "NH_Reveal"
		hl.FillColor = rgb(255, 40, 40)
		hl.DepthMode = Enum.HighlightDepthMode.AlwaysOnTop
		hl.Parent = s.Character
		Debris:AddItem(hl, secs)
	end
	-- throw a survivor out of whatever boat seat they are in
	local function eject(s)
		local hum = humOf(s)
		if hum and hum.SeatPart then
			local w = hum.SeatPart:FindFirstChild("SeatWeld")
			if w then w:Destroy() end
			hum.Sit = false
			hum.Jump = true
			return true
		end
		return false
	end
	local function push(s, dir, dist)
		local h = hrpOf(s)
		if not h or not s.Character then return end
		eject(s)
		local d = flat(dir)
		if d.Magnitude < 0.01 then return end
		local q = h.Position + d.Unit * dist + Vector3.new(0, 2, 0)
		for k = dist, 2, -2 do
			q = h.Position + d.Unit * k + Vector3.new(0, 2, 0)
			if spaceFree(q) then break end
		end
		s.Character:PivotTo(CFrame.lookAt(q, q + d.Unit))
	end
	local function ring(pos, color, r0, r1, dur)
		local p = fxPart(Vector3.new(0.6, r0 * 2, r0 * 2), CFrame.new(pos) * CFrame.Angles(0, 0, math.rad(90)), color, Enum.Material.Neon, Enum.PartType.Cylinder, nil, 0.3)
		animate({ p }, dur, function(t, b)
			local r = r0 + (r1 - r0) * t
			p.Size = Vector3.new(0.6, r * 2, r * 2)
			p.Transparency = 0.3 + 0.7 * t
			return b
		end)
	end
	local function inWater(p)
		local hum, h = humOf(p), hrpOf(p)
		if not hum or not h then return false end
		if hum:GetState() == Enum.HumanoidStateType.Swimming then return true end
		local m = map()
		if m and m.ocean then
			for _, isl in ipairs(m.islands) do if (flat(h.Position - isl.p)).Magnitude < isl.r - 4 then return false end end
			return h.Position.Y < 4
		end
		if m and m.pools then
			for _, pl in ipairs(m.pools) do if (flat(h.Position - pl.p)).Magnitude < pl.r then return true end end
		end
		return false
	end
	P2.inWater = inWater

	---------------------------------------------------------------------------
	-- abilities
	---------------------------------------------------------------------------
	ABILITY.megalodon = function(p) -- Tidal Surge
		local h = hrpOf(p)
		ring(h.Position + Vector3.new(0, -1.5, 0), rgb(120, 200, 255), 6, 70, 1.2)
		local wall = fxPart(Vector3.new(40, 10, 4), CFrame.new(h.Position + flatLook(h) * 8 + Vector3.new(0, 2, 0), h.Position + flatLook(h) * 30), rgb(90, 170, 220), Enum.Material.Glass, nil, nil, 0.25)
		animate({ wall }, 1.2, function(t, b) return b * CFrame.new(0, math.sin(t * math.pi) * 4, -t * 50) end)
		sfxAll("wave", h.Position)
		local hit = 0
		for _, s in ipairs(survivorsNear(h.Position, 60)) do
			local sh = hrpOf(s)
			hit += 1
			if eject(s) then toast(s, "A giant wave flipped your boat!") else toast(s, "A giant wave knocked you down!") end
			push(s, sh.Position - h.Position, 14)
			F(s).stunUntil = now() + 1.6
			Notify:FireClient(s, "effect", "wave", 1.4)
		end
		local m = map()
		for _, b in ipairs(m and m.boats or {}) do
			if b.Parent and b.PrimaryPart and (flat(b.PrimaryPart.Position - h.Position)).Magnitude < 75 then
				b:SetAttribute("Rock", now() + 1.6)
				local helm = b:FindFirstChild("Helm")
				if helm and helm.Occupant then
					local pl = Players:GetPlayerFromCharacter(helm.Occupant.Parent)
					if pl then eject(pl) end
				end
			end
		end
		if hit == 0 then toast(p, "The wave hit nobody"); return 8 end
		return true
	end
	ABILITY.kraken = function(p) -- Tentacle Grab
		local h = hrpOf(p)
		local best, bestD
		for _, s in ipairs(survivors(true)) do
			local sh = hrpOf(s)
			local d = sh and (sh.Position - h.Position).Magnitude
			if d and d < 90 and (not bestD or d < bestD) then best, bestD = s, d end
		end
		if not best then toast(p, "No one in reach of your tentacles"); return 4 end
		local sh = hrpOf(best)
		local parts = {}
		for i = 0, 7 do
			local a = h.Position:Lerp(sh.Position, i / 7) + Vector3.new(0, math.sin(i / 7 * math.pi) * 8, 0)
			table.insert(parts, fxPart(Vector3.new(2.4 - i * 0.2, 2.4 - i * 0.2, 2.4 - i * 0.2), CFrame.new(a), rgb(150, 50, 60), Enum.Material.Rubber, Enum.PartType.Ball))
		end
		animate(parts, 0.7, function(t, b) return b + Vector3.new(0, -t * 3, 0) end)
		eject(best)
		local dest = h.Position + flatLook(h) * 7
		best.Character:PivotTo(CFrame.lookAt(dest + Vector3.new(0, 2, 0), h.Position))
		F(best).stunUntil = now() + 1.5
		toast(best, "A tentacle dragged you to the Kraken!")
		sfxAll("tentacle", h.Position)
		return true
	end
	local function bolt(pos)
		local top = pos + Vector3.new(math.random(-6, 6), 120, math.random(-6, 6))
		local prev = top
		for i = 1, 6 do
			local nxt = top:Lerp(pos, i / 6) + (i < 6 and Vector3.new(math.random(-5, 5), 0, math.random(-5, 5)) or Vector3.zero)
			fxPart(Vector3.new(0.6, 0.6, (nxt - prev).Magnitude), CFrame.lookAt((prev + nxt) / 2, nxt), rgb(230, 230, 255), Enum.Material.Neon, nil, 0.35)
			prev = nxt
		end
		local l = Instance.new("PointLight"); l.Range = 60; l.Brightness = 6; l.Color = rgb(200, 210, 255)
		l.Parent = fxPart(Vector3.new(1, 1, 1), CFrame.new(pos + Vector3.new(0, 4, 0)), rgb(255, 255, 255), Enum.Material.Neon, nil, 0.35, 1)
	end
	ABILITY.cthulhu = function(p) -- Thunderstorm
		local h = hrpOf(p)
		local near = survivorsNear(h.Position, 170)
		for _, s in ipairs(survivors(true)) do Notify:FireClient(s, "effect", "thunder", 3) end
		sfxAll("thunder", h.Position)
		table.sort(near, function(a, b) return (hrpOf(a).Position - h.Position).Magnitude < (hrpOf(b).Position - h.Position).Magnitude end)
		for i = 1, math.min(3, #near) do
			local s = near[i]
			local sp = hrpOf(s).Position
			bolt(sp - Vector3.new(0, 3, 0))
			hurt(s, 15, p)
			F(s).stunUntil = now() + 1
			toast(s, "Lightning struck you!")
		end
		if #near == 0 then toast(p, "The storm rolls in... but nobody is close"); return 6 end
		return true
	end
	ABILITY.leviathan = function(p) -- Whirlpool
		local h = hrpOf(p)
		ring(h.Position + Vector3.new(0, -1.5, 0), rgb(40, 140, 170), 70, 4, 1.5)
		sfxAll("whirl", h.Position)
		local hit = 0
		for _, s in ipairs(survivorsNear(h.Position, 75)) do
			local sh = hrpOf(s)
			hit += 1
			local d = (flat(h.Position - sh.Position)).Magnitude
			push(s, h.Position - sh.Position, math.max(4, d * 0.55))
			F(s).slowUntil = now() + 4
			Notify:FireClient(s, "effect", "whirl", 2)
			toast(s, "A whirlpool is dragging you in!")
		end
		if hit == 0 then toast(p, "The whirlpool caught nobody"); return 6 end
		return true
	end
	ABILITY.mosasaurus = function(p) -- Tail Slam
		local h = hrpOf(p)
		local tail = fxPart(Vector3.new(1, 12, 6), CFrame.new(h.Position + Vector3.new(0, 2, 6)), rgb(60, 80, 70), Enum.Material.Pebble)
		animate({ tail }, 0.8, function(t, b) return b * CFrame.Angles(math.rad(-120 * t), 0, 0) end)
		ring(h.Position + Vector3.new(0, -1.5, 0), rgb(200, 230, 255), 4, 45, 0.9)
		sfxAll("slam", h.Position)
		local hit = 0
		for _, s in ipairs(survivorsNear(h.Position, 42)) do
			hit += 1
			eject(s)
			hurt(s, 10, p)
			F(s).stunUntil = now() + 2
			Notify:FireClient(s, "effect", "wave", 1)
			toast(s, "The Mosasaurus' tail slam stunned you!")
		end
		if hit == 0 then toast(p, "The slam hit nobody"); return 6 end
		return true
	end
	ABILITY.nessie = function(p) -- Deep Dive
		local h = hrpOf(p)
		local target = X.nearestSurvivor(h.Position)
		if not target then toast(p, "Nobody to surface near"); return 3 end
		ring(h.Position + Vector3.new(0, -1.5, 0), rgb(220, 240, 255), 4, 18, 0.8)
		sfxAll("splash", h.Position)
		X.hide(p, true)
		task.delay(1.2, function()
			if not hrpOf(p) or not hrpOf(target) then X.hide(p, false); return end
			appearNear(p, hrpOf(target).Position, 18, 28)
			X.hide(p, false)
			ring(hrpOf(p).Position + Vector3.new(0, -1.5, 0), rgb(220, 240, 255), 4, 18, 0.8)
			sfxAll("splash", hrpOf(p).Position)
			toast(target, "Something huge just surfaced next to you...")
		end)
		return true
	end
	ABILITY.spinosaurus = function(p) -- Swamp Ambush
		local h = hrpOf(p)
		local look = flatLook(h)
		local dest
		for d = 45, 10, -5 do
			local q = h.Position + look * d
			if spaceFree(q) and clearLine(h.Position, q) then dest = q; break end
		end
		if not dest then toast(p, "No room to lunge"); return 3 end
		ring(h.Position + Vector3.new(0, -2.5, 0), rgb(120, 140, 80), 4, 16, 0.6)
		p.Character:PivotTo(CFrame.lookAt(dest, dest + look))
		sfxAll("roar", dest)
		local hit = 0
		for _, s in ipairs(survivorsNear(dest, 14)) do
			hit += 1
			hurt(s, 12, p)
			F(s).stunUntil = now() + 1.5
			toast(s, "The Spinosaurus burst out of the swamp!")
		end
		if hit == 0 then return 8 end
		return true
	end
	ABILITY.yeti = function(p) -- Avalanche Roar
		local h = hrpOf(p)
		sfxAll("roar", h.Position)
		local hit = 0
		for _, s in ipairs(survivorsNear(h.Position, 65)) do
			hit += 1
			local sp = hrpOf(s).Position
			for _ = 1, 6 do
				local sn = fxPart(Vector3.new(4, 4, 4), CFrame.new(sp + Vector3.new(math.random(-6, 6), 30, math.random(-6, 6))), rgb(240, 245, 250), Enum.Material.Snow, Enum.PartType.Ball)
				animate({ sn }, 0.9, function(t, b) return b + Vector3.new(0, -t * 30, 0) end)
			end
			F(s).stunUntil = now() + 1.2
			F(s).slowUntil = now() + 5
			Notify:FireClient(s, "effect", "snow", 4)
			toast(s, "An avalanche of snow buried you!")
		end
		if hit == 0 then toast(p, "Your roar echoes off the mountain"); return 6 end
		return true
	end
	ABILITY.chupacabra = function(p) -- Blood Drain
		local h = hrpOf(p)
		local best, bestD
		for _, s in ipairs(survivors(true)) do
			local sh = hrpOf(s)
			local d = sh and (sh.Position - h.Position).Magnitude
			if d and d < 16 and (not bestD or d < bestD) then best, bestD = s, d end
		end
		if not best then toast(p, "Get closer to drain someone"); return 3 end
		hurt(best, 25, p)
		F(best).slowUntil = now() + 3
		local hp = math.min(p:GetAttribute("MonsterMaxHp") or Config.MON_HP, (p:GetAttribute("MonsterHp") or Config.MON_HP) + 25)
		p:SetAttribute("MonsterHp", hp)
		sfxAll("drain", h.Position)
		toast(best, "The Chupacabra drained your blood!")
		toast(p, "You drained " .. best.DisplayName .. " and healed")
		return true
	end
	ABILITY.vampire = function(p) -- Bat Swarm
		local h = hrpOf(p)
		local f = F(p)
		f.batUntil = now() + 4
		X.hide(p, true)
		local bats = {}
		for _ = 1, 14 do table.insert(bats, fxPart(Vector3.new(1.4, 0.3, 0.8), CFrame.new(h.Position + Vector3.new(math.random(-4, 4), math.random(0, 6), math.random(-4, 4))), rgb(14, 10, 14), Enum.Material.Fabric)) end
		animate(bats, 1.5, function(t, b, i) return b + Vector3.new(math.sin(t * 9 + i) * 3, t * 10, math.cos(t * 7 + i) * 3) end)
		task.delay(4, function() if p.Parent then X.hide(p, false) end end)
		sfxAll("bats", h.Position)
		for _, s in ipairs(survivorsNear(h.Position, 55)) do
			Notify:FireClient(s, "effect", "dark", 3)
			toast(s, "A swarm of bats blinds you!")
		end
		return true
	end
	ABILITY.bigfoot = function(p) -- Boulder Throw
		local h = hrpOf(p)
		local look = flatLook(h)
		local best, bestD
		for _, s in ipairs(survivors(true)) do
			local sh = hrpOf(s)
			if sh then
				local v = flat(sh.Position - h.Position)
				local d = v.Magnitude
				if d > 0.1 and d < 95 and look:Dot(v.Unit) > 0.75 and clearLine(h.Position, sh.Position) and (not bestD or d < bestD) then best, bestD = s, d end
			end
		end
		local target = best and hrpOf(best).Position or (h.Position + look * 60)
		local rock = fxPart(Vector3.new(5, 5, 5), CFrame.new(h.Position + Vector3.new(0, 6, 0)), rgb(110, 100, 90), Enum.Material.Rock, Enum.PartType.Ball)
		local from = rock.Position
		animate({ rock }, 0.6, function(t) return CFrame.new(from:Lerp(target, t) + Vector3.new(0, math.sin(t * math.pi) * 12, 0)) * CFrame.Angles(t * 8, t * 5, 0) end)
		sfxAll("throw", h.Position)
		if not best then toast(p, "The boulder missed"); return 5 end
		task.delay(0.6, function()
			if best.Parent and hrpOf(best) then
				hurt(best, 15, p)
				F(best).stunUntil = now() + 2
				toast(best, "Bigfoot hit you with a boulder!")
				sfxAll("hit", hrpOf(best).Position)
			end
		end)
		return true
	end
	ABILITY.trex = function(p) -- Tyrant Roar
		local h = hrpOf(p)
		sfxAll("roar", h.Position)
		ring(h.Position + Vector3.new(0, -2.5, 0), rgb(255, 200, 120), 4, 70, 0.9)
		local hit = 0
		for _, s in ipairs(survivorsNear(h.Position, 75)) do
			hit += 1
			F(s).rootUntil = now() + 2.5
			reveal(s, 6)
			Notify:FireClient(s, "effect", "shake", 1.5)
			toast(s, "The T-Rex's roar froze you in terror!")
		end
		if hit == 0 then toast(p, "Your roar shook the trees"); return 6 end
		return true
	end
	ABILITY.quetzalcoatlus = function(p) -- Sky Dive
		local h = hrpOf(p)
		local target = X.nearestSurvivor(h.Position)
		if not target then toast(p, "Nothing to dive on"); return 3 end
		local d = (hrpOf(target).Position - h.Position).Magnitude
		if d > 260 then toast(p, "Too far to dive"); return 3 end
		X.hide(p, true)
		sfxAll("screech", h.Position)
		task.delay(1, function()
			if not hrpOf(p) or not hrpOf(target) then X.hide(p, false); return end
			appearNear(p, hrpOf(target).Position, 6, 10)
			X.hide(p, false)
			if hrpOf(target) and (hrpOf(target).Position - hrpOf(p).Position).Magnitude < 14 then
				F(target).stunUntil = now() + 1.2
				eject(target)
			end
			sfxAll("screech", hrpOf(p).Position)
			toast(target, "Something dove out of the sky at you!")
		end)
		return true
	end
	ABILITY.gargoyle = function(p) -- Stone Skin
		local f = F(p)
		f.stoneUntil = now() + 6
		local morph = p.Character and p.Character:FindFirstChild("NH_Morph")
		if morph then for _, d in ipairs(morph:GetDescendants()) do if d:IsA("BasePart") and d.Material ~= Enum.Material.Neon then d:SetAttribute("Mat0", d.Material.Name); d.Material = Enum.Material.Granite end end end
		sfxAll("stone", hrpOf(p).Position)
		toast(p, "Stone skin: weapons can't hurt you for 6s")
		task.delay(6, function()
			if not p.Parent or not hrpOf(p) then return end
			if morph and morph.Parent then for _, d in ipairs(morph:GetDescendants()) do if d:IsA("BasePart") and d:GetAttribute("Mat0") then pcall(function() d.Material = Enum.Material[d:GetAttribute("Mat0")] end) end end end
			ring(hrpOf(p).Position + Vector3.new(0, -2.5, 0), rgb(170, 170, 175), 4, 32, 0.7)
			sfxAll("quake", hrpOf(p).Position)
			for _, s in ipairs(survivorsNear(hrpOf(p).Position, 32)) do F(s).stunUntil = now() + 1.4; toast(s, "The Gargoyle's shockwave stunned you!") end
		end)
		return true
	end
	ABILITY.dragon = function(p) -- Fire Breath
		local h = hrpOf(p)
		local look = flatLook(h)
		local flames = {}
		for i = 1, 10 do
			table.insert(flames, fxPart(Vector3.new(2 + i * 0.7, 2 + i * 0.7, 2 + i * 0.7), CFrame.new(h.Position + Vector3.new(0, 6, 0) + look * (6 + i * 4)), i % 2 == 0 and rgb(255, 120, 20) or rgb(255, 200, 40), Enum.Material.Neon, Enum.PartType.Ball, nil, 0.25))
		end
		animate(flames, 1.2, function(t, b) return b + Vector3.new(0, t * 3 - 2, 0) end)
		sfxAll("fire", h.Position)
		local hit = 0
		for _, s in ipairs(survivors(true)) do
			local sh = hrpOf(s)
			if sh then
				local v = flat(sh.Position - h.Position)
				if v.Magnitude < 48 and v.Magnitude > 0.1 and look:Dot(v.Unit) > 0.72 then
					hit += 1
					hurt(s, 18, p)
					F(s).burnUntil = now() + 3
					F(s).burnBy = p
					Notify:FireClient(s, "effect", "burn", 3)
					toast(s, "You're on fire!")
				end
			end
		end
		if hit == 0 then return 8 end
		return true
	end
	ABILITY.fester = function(p) -- Lights Out
		local h = hrpOf(p)
		local m = map()
		local off = {}
		local f0 = X.getFolder()
		if f0 then
			for _, d in ipairs(f0:GetDescendants()) do
				if d:IsA("PointLight") and d.Enabled and d.Parent:IsA("BasePart") and (d.Parent.Position - h.Position).Magnitude < 220 then
					d.Enabled = false
					table.insert(off, d)
				end
			end
		end
		_ = m
		task.delay(7, function() for _, l in ipairs(off) do if l.Parent then l.Enabled = true end end end)
		sfxAll("dark", h.Position)
		for _, s in ipairs(survivorsNear(h.Position, 160)) do
			Notify:FireClient(s, "effect", "dark", 4)
			Notify:FireClient(s, "effect", "lightsout", 1)
			toast(s, "Every light went out... Father Fester is close.")
		end
		return true
	end

	---------------------------------------------------------------------------
	-- telltale signs: each sea monster (and the Spinosaurus) gives itself away near survivors
	---------------------------------------------------------------------------
	local OMEN = {}
	local function waterY(pos) local m = map(); return (m and m.ocean) and 0 or pos.Y - 3 end
	OMEN.kraken = function(pos)
		local parts = {}
		for k = 1, 3 do
			local base = pos + Vector3.new(math.cos(k * 2.1) * 8, 0, math.sin(k * 2.1) * 8)
			for i = 0, 6 do
				table.insert(parts, fxPart(Vector3.one * (2.2 - i * 0.25), CFrame.new(base + Vector3.new(math.sin(i * 0.5) * i * 0.6, i * 1.6 - 12, 0)), rgb(150, 50, 60), Enum.Material.Rubber, Enum.PartType.Ball))
			end
		end
		animate(parts, 3, function(t, b, i) return b + Vector3.new(math.sin(t * 6 + i) * 0.4, math.sin(t * math.pi) * 12, 0) end)
	end
	OMEN.leviathan = function(pos)
		local parts = {}
		for k = 0, 2 do
			for i = 0, 8 do
				local a = i / 8 * math.pi
				table.insert(parts, fxPart(Vector3.one * 3.4, CFrame.new(pos + Vector3.new(k * 12 - 12 + math.cos(a) * 5, math.sin(a) * 5 - 8, k * 3)), rgb(30, 90, 100), Enum.Material.Pebble, Enum.PartType.Ball))
			end
		end
		animate(parts, 3.2, function(t, b) return b + Vector3.new(t * 6, math.sin(t * math.pi) * 8, 0) end)
	end
	OMEN.mosasaurus = function(pos)
		local tail = fxPart(Vector3.new(0.8, 10, 5), CFrame.new(pos + Vector3.new(0, -8, 0)), rgb(60, 80, 70), Enum.Material.Pebble)
		animate({ tail }, 2.2, function(t, b) return b * CFrame.new(0, math.sin(t * math.pi) * 12, 0) * CFrame.Angles(math.sin(t * 9) * 0.7, 0, 0) end)
		ring(pos + Vector3.new(0, 0.2, 0), rgb(220, 240, 255), 2, 14, 1.2)
	end
	OMEN.megalodon = function(pos, toward)
		local dir = flat(toward - pos)
		dir = dir.Magnitude > 0.1 and dir.Unit or Vector3.new(0, 0, -1)
		local fin = Instance.new("WedgePart")
		fin.Anchored, fin.CanCollide, fin.CanQuery = true, false, false
		fin.Size = Vector3.new(0.8, 6, 6)
		fin.Color, fin.Material = rgb(78, 92, 104), Enum.Material.SmoothPlastic
		fin.CFrame = CFrame.lookAt(pos + Vector3.new(0, 1.5, 0), pos + Vector3.new(0, 1.5, 0) - dir)
		fin.Parent = folder()
		animate({ fin }, 3.2, function(t, b) return b * CFrame.new(0, (t < 0.15 and t / 0.15 or (t > 0.85 and (1 - t) / 0.15 or 1)) * 1 - 1, t * 24) end)
	end
	OMEN.nessie = function(pos)
		local parts = {}
		for i = 0, 10 do table.insert(parts, fxPart(Vector3.one * (2.6 - i * 0.12), CFrame.new(pos + Vector3.new(0, i * 1.4 - 16, -math.sin(i / 10 * 2) * 4)), rgb(50, 70, 60), Enum.Material.Pebble, Enum.PartType.Ball)) end
		table.insert(parts, fxPart(Vector3.new(2.4, 2, 4), CFrame.new(pos + Vector3.new(0, 15 - 16, -4.6)), rgb(50, 70, 60), Enum.Material.Pebble, Enum.PartType.Ball))
		animate(parts, 3.4, function(t, b) return b + Vector3.new(0, math.sin(t * math.pi) * 16, 0) end)
	end
	OMEN.spinosaurus = function(pos)
		local parts = {}
		for i = -3, 3 do table.insert(parts, fxPart(Vector3.new(0.4, 6 - math.abs(i), 1.6), CFrame.new(pos + Vector3.new(0, -6, i * 1.5)), i % 2 == 0 and rgb(170, 80, 50) or rgb(150, 70, 44), Enum.Material.SmoothPlastic)) end
		animate(parts, 3, function(t, b) return b + Vector3.new(t * 14, math.sin(t * math.pi) * 6.5, 0) end)
	end
	OMEN.cthulhu = function(_pos, _toward, s)
		-- the storm: red eyes and huge wings in the clouds above the survivor
		local sp = hrpOf(s) and hrpOf(s).Position
		if not sp then return end
		Notify:FireClient(s, "effect", "thunder", 2.5)
		local c = sp + Vector3.new(0, 110, -60)
		local parts = {
			fxPart(Vector3.one * 6, CFrame.new(c + Vector3.new(-7, 0, 0)), rgb(255, 20, 20), Enum.Material.Neon, Enum.PartType.Ball),
			fxPart(Vector3.one * 6, CFrame.new(c + Vector3.new(7, 0, 0)), rgb(255, 20, 20), Enum.Material.Neon, Enum.PartType.Ball),
			fxPart(Vector3.new(80, 30, 2), CFrame.new(c + Vector3.new(-50, 10, 8)) * CFrame.Angles(0, 0, math.rad(20)), rgb(14, 16, 20), Enum.Material.SmoothPlastic, nil, nil, 0.2),
			fxPart(Vector3.new(80, 30, 2), CFrame.new(c + Vector3.new(50, 10, 8)) * CFrame.Angles(0, 0, math.rad(-20)), rgb(14, 16, 20), Enum.Material.SmoothPlastic, nil, nil, 0.2),
		}
		animate(parts, 2.6, function(t, b) return b + Vector3.new(0, math.sin(t * math.pi) * 6, 0) end)
	end
	local omenAt = {}
	local function omens()
		for _, m in ipairs(X.monsters()) do
			local kind = m:GetAttribute("Monster")
			local h = hrpOf(m)
			if OMEN[kind] and h and X.isHunting(m) and now() >= (omenAt[m] or 0) then
				local s, d = X.nearestSurvivor(h.Position)
				if s and d < 150 and d > 20 then
					omenAt[m] = now() + 9
					local sp = hrpOf(s).Position
					-- the sign shows between the monster and the survivor, at the water line
					local q = h.Position:Lerp(sp, 0.35)
					q = Vector3.new(q.X, waterY(q), q.Z)
					OMEN[kind](q, sp, s)
					Notify:FireClient(s, "omen", kind)
				end
			end
		end
	end

	---------------------------------------------------------------------------
	-- per-tick systems
	---------------------------------------------------------------------------
	local stormFx = {}
	local seen = {} -- [fester][survivor] = time
	local formWant = {}
	function P2.speedMult(p, t)
		local f = F(p)
		local kind = p:GetAttribute("Monster")
		local mult = 1
		if p:GetAttribute("Role") == "Monster" then
			if Config.SEA[kind] then
				if inWater(p) then mult *= 1.3 elseif kind ~= "megalodon" then mult *= 0.85 end
			end
			if f.batUntil and t < f.batUntil then mult *= 1.6 end
			if f.stoneUntil and t < f.stoneUntil then mult *= 0.5 end
			if kind == "fester" then mult *= 1 + 0.06 * (p:GetAttribute("FesterStage") or 0) end
		else
			local m = map()
			if m and m.pools and inWater(p) then mult *= 0.7 end
		end
		return mult
	end
	function P2.isStone(p) local f = F(p); return f.stoneUntil ~= nil and now() < f.stoneUntil end
	function P2.reset()
		table.clear(stormFx); table.clear(seen); table.clear(formWant); table.clear(omenAt)
	end
	function P2.tick(step)
		local m = map()
		local t = now()
		omens()
		for _, s in ipairs(survivors(true)) do
			local f = F(s)
			local h = hrpOf(s)
			if f.burnUntil and t < f.burnUntil then hurt(s, 4 * step, f.burnBy) end
			-- the storm past the safe radius on the ocean: damage, a push back toward the islands, lightning
			if m and m.ocean and h then
				local v = flat(h.Position - Config.MAP_ORIGIN)
				local r = v.Magnitude
				if r > m.storm then
					hurt(s, 5 * step, nil)
					local hum = humOf(s)
					if hum and hum.SeatPart then
						local b = hum.SeatPart.Parent
						if b and b:IsA("Model") then b:PivotTo(b:GetPivot() - v.Unit * 1.4) end
					else
						s.Character:PivotTo(s.Character:GetPivot() - v.Unit * 1.2)
					end
					if t >= (stormFx[s] or 0) then
						stormFx[s] = t + 0.9
						Notify:FireClient(s, "effect", "storm", 1.2)
						if math.random() < 0.25 then bolt(h.Position + Vector3.new(math.random(-30, 30), -3, math.random(-30, 30))) end
					end
				elseif r > m.storm - 70 and t >= (stormFx[s] or 0) then
					stormFx[s] = t + 4
					Notify:FireClient(s, "effect", "stormwarn", 2)
				end
			end
		end
		for _, mp in ipairs(X.monsters()) do
			local kind = mp:GetAttribute("Monster")
			local h = hrpOf(mp)
			if h and X.isHunting(mp) then
				-- Megalodon: a giant shark in the water, a buff humanoid shark on land
				if kind == "megalodon" then
					local want = inWater(mp) and 1 or 2
					if want ~= (mp:GetAttribute("Form") or 1) then
						formWant[mp] = formWant[mp] or t
						if t - formWant[mp] > 0.6 then
							formWant[mp] = nil
							mp:SetAttribute("Form", want)
							Models.morph(mp.Character, want == 1 and "megalodon" or "megalodon_h", X.getProfile(mp) and X.getProfile(mp).skin)
							toast(mp, want == 1 and "Back in the water: full shark form" or "On land: you walk as a giant humanoid shark")
						end
					else
						formWant[mp] = nil
					end
				end
				-- Father Fester: every survivor who sees him makes him stronger (once per survivor per 12s, 6 stages)
				if kind == "fester" then
					seen[mp] = seen[mp] or {}
					for _, s in ipairs(survivors(true)) do
						local sh = hrpOf(s)
						if sh then
							local v = h.Position - sh.Position
							if v.Magnitude < 110 and sh.CFrame.LookVector:Dot(v.Unit) > 0.6 and clearLine(sh.Position + Vector3.new(0, 1.5, 0), h.Position + Vector3.new(0, 3, 0)) and t >= (seen[mp][s] or 0) then
								seen[mp][s] = t + 12
								local stg = math.min(Config.FESTER_MAX, (mp:GetAttribute("FesterStage") or 0) + 1)
								if stg ~= (mp:GetAttribute("FesterStage") or 0) then
									mp:SetAttribute("FesterStage", stg)
									Models.festerStage(mp.Character and mp.Character:FindFirstChild("NH_Morph"), stg)
									toast(mp, ("%s saw you. You grow stronger (stage %d/%d)"):format(s.DisplayName, stg, Config.FESTER_MAX))
									if stg == Config.FESTER_MAX then Notify:FireClient(mp, "sight", 8); toast(nil, "Father Fester has reached full strength...") end
								end
								toast(s, "You saw Father Fester... and he saw you.")
								Notify:FireClient(s, "effect", "fester", 1.2)
								sfxAll("fester", h.Position)
							end
						end
					end
				end
			end
		end
	end

	-- boats: the driver's MoveDirection steers; frame-rate movement on the server
	RunService.Heartbeat:Connect(function(dt)
		local m = map()
		if not m or not m.boats then return end
		local t = now()
		local O = Config.MAP_ORIGIN
		for _, b in ipairs(m.boats) do
			local hull = b.Parent and b.PrimaryPart
			local helm = b:FindFirstChild("Helm")
			if hull and helm then
				local v = b:GetAttribute("V") or 0
				local occ = helm.Occupant
				local cf = b:GetPivot()
				local yaw = math.atan2(-cf.LookVector.X, -cf.LookVector.Z)
				if occ then
					local md = occ.MoveDirection
					local maxV = b:GetAttribute("Speed") or 40
					if md.Magnitude > 0.1 then
						local want = math.atan2(-md.X, -md.Z)
						local diff = (want - yaw + math.pi) % (2 * math.pi) - math.pi
						yaw += math.clamp(diff, -1.4 * dt, 1.4 * dt)
						local fwd = Vector3.new(-math.sin(yaw), 0, -math.cos(yaw))
						v = math.min(maxV, v + maxV * 0.7 * dt * math.max(0.2, fwd:Dot(md.Unit)))
					else
						v = math.max(0, v - maxV * 0.5 * dt)
					end
				else
					v = math.max(0, v - 20 * dt)
				end
				local fwd = Vector3.new(-math.sin(yaw), 0, -math.cos(yaw))
				local pos = cf.Position + fwd * v * dt
				-- islands and the map edge stop the boat
				local blocked = math.abs(pos.X - O.X) > m.half - 12 or math.abs(pos.Z - O.Z) > m.half - 12
				for _, isl in ipairs(m.islands or {}) do
					if (flat(pos - isl.p)).Magnitude < isl.r + (b:GetAttribute("Big") and 14 or 6) then blocked = true; break end
				end
				if blocked then pos = cf.Position; v = 0 end
				local rock = (b:GetAttribute("Rock") or 0) > t and math.sin(t * 14) * 0.25 or 0
				local bob = math.sin(t * 1.6 + hull.Position.X * 0.05) * 0.25
				b:SetAttribute("V", v)
				if occ or v > 0 or rock ~= 0 or (b:GetAttribute("BobAt") or 0) < t then
					b:SetAttribute("BobAt", t + 0.25)
					b:PivotTo(CFrame.new(pos.X, bob, pos.Z) * CFrame.Angles(0, yaw, rock))
				end
			end
		end
	end)
	return P2
end
