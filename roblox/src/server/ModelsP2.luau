-- v1.4 (phase 2) monster builders: sea monsters, cryptids, dinosaurs, castle creatures and Father Fester.
-- Same convention as Models.luau: the monster faces -Z, feet at y = -3, P(size, offsetCFrame, color, opts).
return function(L)
	local rgb, at, BALL, NEON = L.rgb, L.at, L.BALL, L.NEON
	local SLATE, FABRIC = Enum.Material.Slate, Enum.Material.Fabric
	local B = {}
	-- a limb/segment between two points
	local function seg(P, a, b, th, color, opts)
		local mid, len = (a + b) / 2, (b - a).Magnitude
		return P(Vector3.new(th, th, len), CFrame.lookAt(mid, b), color, opts)
	end
	local function teeth(P, cf, n, w, color)
		for i = 0, n - 1 do
			local x = -w / 2 + (i + 0.5) * (w / n)
			P(Vector3.new(0.25, 0.6, 0.25), cf * CFrame.new(x, 0, 0) * CFrame.Angles(0, 0, math.rad(45)), color or rgb(245, 240, 225), { mat = Enum.Material.SmoothPlastic })
		end
	end
	local function glowEyes(P, y, z, sp, size, color)
		P(Vector3.new(size, size, size), at(-sp, y, z), color, { shape = BALL, mat = NEON })
		P(Vector3.new(size, size, size), at(sp, y, z), color, { shape = BALL, mat = NEON })
	end
	-- a chain of balls following a function f(t) -> position, radius r(t)
	local function chain(P, n, f, r, color, opts)
		for i = 0, n do
			local t = i / n
			local d = r(t)
			P(Vector3.new(d, d, d), CFrame.new(f(t)), color, opts or { shape = BALL })
		end
	end
	local function wing(P, root, side, span, color)
		for i = 0, 3 do
			local a = math.rad(15 + i * 14)
			local tip = root + Vector3.new(side * math.cos(a) * span, math.sin(a) * span * 0.7, 1 + i * 0.6)
			seg(P, root, tip, 0.25, rgb(40, 30, 30))
			P(Vector3.new(0.12, span * 0.45, span * 0.6), CFrame.lookAt((root + tip) / 2 + Vector3.new(0, -span * 0.12, 0.6), tip) * CFrame.Angles(0, math.rad(90), 0), color, { mat = FABRIC })
		end
	end

	B.megalodon = function(P) -- giant shark (in the water)
		local top, belly = rgb(78, 92, 104), rgb(225, 225, 220)
		P(Vector3.new(7, 6.4, 26), at(0, -1, 0), top, { shape = BALL })
		P(Vector3.new(6, 4, 22), at(0, -2.4, -1), belly, { shape = BALL })
		P(Vector3.new(0.8, 6.5, 6), at(0, 3.6, 1.5, -25, 0, 0), top, { name = "DorsalFin" })
		P(Vector3.new(0.6, 7, 3), at(0, 2.6, 13.5, -40, 0, 0), top)
		P(Vector3.new(0.6, 5, 2.6), at(0, -3.6, 13, 40, 0, 0), top)
		for _, x in ipairs({ -1, 1 }) do
			P(Vector3.new(6, 0.5, 3), at(x * 5, -2.4, -2, 0, x * -20, x * -20), top)
			P(Vector3.new(1.2, 1.2, 1.2), at(x * 2.9, 0.4, -9.6), rgb(10, 10, 10), { shape = BALL, mat = Enum.Material.Glass })
			for g = 0, 3 do P(Vector3.new(0.12, 2, 0.12), at(x * 3.25, -0.6, -6 + g * 0.8, 0, 0, x * 8), rgb(50, 60, 70)) end
		end
		P(Vector3.new(4.6, 3, 2.5), at(0, -1.8, -11.6), rgb(90, 16, 20), { shape = BALL }) -- open mouth
		teeth(P, at(0, -0.6, -12.4), 8, 4, nil)
		teeth(P, at(0, -3, -12.2, 180, 0, 0), 7, 3.6, nil)
	end
	B.megalodon_h = function(P) -- buff humanoid shark on land
		local top, belly = rgb(78, 92, 104), rgb(225, 225, 220)
		P(Vector3.new(1.4, 3.6, 1.4), at(-0.9, -1.4, 0), top)
		P(Vector3.new(1.4, 3.6, 1.4), at(0.9, -1.4, 0), top)
		P(Vector3.new(5, 5, 3.2), at(0, 2.8, 0), top)
		P(Vector3.new(3.8, 4, 0.6), at(0, 2.6, -1.5), belly)
		for i = 0, 2 do P(Vector3.new(1.6, 0.9, 0.3), at(-0.9, 1.2 + i * 1.1, -1.85), belly); P(Vector3.new(1.6, 0.9, 0.3), at(0.9, 1.2 + i * 1.1, -1.85), belly) end
		for _, x in ipairs({ -1, 1 }) do
			P(Vector3.new(2.4, 2.2, 2.4), at(x * 3.3, 4.6, 0), top, { shape = BALL })
			P(Vector3.new(1.6, 3.4, 1.6), at(x * 3.6, 2.4, 0, 0, 0, x * 10), top)
			P(Vector3.new(1.4, 3, 1.4), at(x * 3.9, -0.2, -0.6, 25, 0, 0), top)
			P(Vector3.new(1.6, 0.8, 2), at(x * 3.9, -1.6, -1.4), belly)
			P(Vector3.new(0.5, 2.6, 2), at(x * 2.8, 2.6, 1.6, 0, 0, x * 40), top) -- fin elbows
		end
		P(Vector3.new(3.4, 3, 5.6), at(0, 6.4, -0.8), top, { shape = BALL })
		P(Vector3.new(2.8, 1.6, 3.6), at(0, 5.5, -1.4), belly, { shape = BALL })
		P(Vector3.new(2.8, 1.4, 1), at(0, 5.6, -3.4), rgb(90, 16, 20))
		teeth(P, at(0, 6.2, -3.6), 6, 2.6, nil)
		teeth(P, at(0, 5, -3.5, 180, 0, 0), 5, 2.4, nil)
		P(Vector3.new(0.6, 0.6, 0.6), at(-1.5, 6.8, -2.2), rgb(10, 10, 10), { shape = BALL, mat = Enum.Material.Glass })
		P(Vector3.new(0.6, 0.6, 0.6), at(1.5, 6.8, -2.2), rgb(10, 10, 10), { shape = BALL, mat = Enum.Material.Glass })
		P(Vector3.new(0.6, 4.5, 3.6), at(0, 5.4, 2, -25, 0, 0), top, { name = "DorsalFin" })
		P(Vector3.new(1, 1, 5), at(0, -0.4, 3.2, 30, 0, 0), top)
		P(Vector3.new(0.5, 3.6, 2), at(0, 0.2, 5.6, -30, 0, 0), top)
	end
	B.kraken = function(P)
		local s = rgb(150, 50, 60)
		P(Vector3.new(8, 11, 8), at(0, 4.5, 2, -15, 0, 0), s, { shape = BALL })
		P(Vector3.new(6, 5, 6), at(0, -0.4, -0.5), rgb(130, 40, 50), { shape = BALL })
		for _, x in ipairs({ -1, 1 }) do
			P(Vector3.new(1.9, 1.9, 1.9), at(x * 2.2, 0.6, -2.8), rgb(240, 200, 40), { shape = BALL, mat = NEON })
			P(Vector3.new(0.5, 1.5, 0.5), at(x * 2.2, 0.6, -3.65), rgb(5, 5, 5))
		end
		for i = 0, 7 do
			local a = i / 8 * math.pi * 2
			local dir = Vector3.new(math.cos(a), 0, math.sin(a))
			chain(P, 9, function(t) return dir * (2 + t * 11) + Vector3.new(0, -2 + math.sin(t * math.pi) * 3.5 - t * 0.6, 0) end, function(t) return 1.6 - t * 1.1 end, s)
			for k = 1, 4 do P(Vector3.new(0.35, 0.35, 0.35), CFrame.new(dir * (3 + k * 2) + Vector3.new(0, -2.4 + math.sin(k / 5 * math.pi) * 3.5, 0)), rgb(240, 200, 200), { shape = BALL }) end
		end
	end
	B.cthulhu = function(P)
		local s, d = rgb(60, 100, 70), rgb(40, 70, 50)
		P(Vector3.new(1.6, 4, 1.6), at(-1, -1, 0), d); P(Vector3.new(1.6, 4, 1.6), at(1, -1, 0), d)
		P(Vector3.new(5, 6, 3.4), at(0, 4, 0), s)
		for _, x in ipairs({ -1, 1 }) do
			P(Vector3.new(1.3, 5, 1.3), at(x * 3.2, 3.6, -0.4, 20, 0, x * 12), s)
			for f = -1, 1 do P(Vector3.new(0.25, 1.8, 0.25), at(x * 3.6 + f * 0.3, 0.6, -1.6, 30, 0, 0), rgb(20, 30, 20)) end
			wing(P, Vector3.new(x * 1.5, 6.4, 1.6), x, 9, rgb(30, 50, 36))
		end
		P(Vector3.new(4.4, 5, 4.4), at(0, 9.4, 0), s, { shape = BALL })
		glowEyes(P, 9.8, -2, 1, 0.9, rgb(255, 30, 20))
		for i = 0, 7 do
			local x = -1.6 + i * 0.46
			chain(P, 5, function(t) return Vector3.new(x * (1 - t * 0.3), 8.2 - t * 4.2, -1.8 - math.sin(t * 3 + i) * 0.5) end, function(t) return 0.7 - t * 0.4 end, d)
		end
	end
	B.leviathan = function(P)
		local s, belly = rgb(30, 90, 100), rgb(160, 190, 150)
		chain(P, 22, function(t) return Vector3.new(math.sin(t * 9) * 4, -1 + math.sin(t * 4.5) * 2.2, -6 + t * 32) end, function(t) return 4.6 - t * 3.4 end, s)
		for i = 0, 8 do
			local t = i / 9
			P(Vector3.new(0.4, 2.4 - t, 2), CFrame.new(Vector3.new(math.sin(t * 9) * 4, 1.6 + math.sin(t * 4.5) * 2.2 - t * 1.6, -6 + t * 32)) * CFrame.Angles(math.rad(-30), 0, 0), rgb(200, 80, 60))
		end
		P(Vector3.new(4.4, 3.6, 7), at(0, 0.4, -9), s, { shape = BALL })
		P(Vector3.new(3.6, 1.6, 5), at(0, -1, -9.6), belly, { shape = BALL })
		teeth(P, at(0, -0.3, -12.3), 7, 3, nil)
		glowEyes(P, 1.6, -10.8, 1.4, 0.8, rgb(255, 220, 60))
		for _, x in ipairs({ -1, 1 }) do seg(P, Vector3.new(x * 1.4, 2, -8), Vector3.new(x * 2.4, 5, -5), 0.6, rgb(220, 210, 180)) end
	end
	B.mosasaurus = function(P)
		local s, belly = rgb(60, 80, 70), rgb(200, 200, 180)
		P(Vector3.new(6, 5, 18), at(0, -0.6, 0), s, { shape = BALL })
		P(Vector3.new(5, 3, 15), at(0, -2, 0), belly, { shape = BALL })
		chain(P, 8, function(t) return Vector3.new(math.sin(t * 3) * 1.2, -0.4, 8 + t * 12) end, function(t) return 3.6 - t * 2.6 end, s)
		P(Vector3.new(0.5, 6, 3), at(0, 0.6, 20.5, -20, 0, 0), s, { name = "TailFin" })
		P(Vector3.new(3.4, 2.6, 8), at(0, 0.2, -11), s)
		P(Vector3.new(3.2, 1.2, 7.6), at(0, -1.2, -11), belly)
		teeth(P, at(0, -0.9, -14.6), 7, 3, nil)
		for z = 0, 5 do P(Vector3.new(0.25, 0.7, 0.25), at(-1.6, -0.9, -14 + z * 1.1), rgb(245, 240, 225)); P(Vector3.new(0.25, 0.7, 0.25), at(1.6, -0.9, -14 + z * 1.1), rgb(245, 240, 225)) end
		glowEyes(P, 1, -12, 1.5, 0.7, rgb(250, 180, 40))
		for _, x in ipairs({ -1, 1 }) do
			P(Vector3.new(5, 0.5, 2.4), at(x * 4.6, -2, -4, 0, x * 20, x * -15), s)
			P(Vector3.new(4, 0.5, 2), at(x * 4, -2, 6, 0, x * -25, x * -15), s)
		end
	end
	B.nessie = function(P)
		local s = rgb(50, 70, 60)
		P(Vector3.new(9, 6, 14), at(0, -1, 2), s, { shape = BALL })
		P(Vector3.new(5, 4, 7), at(0, 0, 11), s, { shape = BALL })
		chain(P, 14, function(t) return Vector3.new(0, 1 + t * 13, -4 - math.sin(t * 2.2) * 5) end, function(t) return 2.6 - t * 1.2 end, s)
		P(Vector3.new(2.4, 2, 4), at(0, 14.6, -4.6), s, { shape = BALL, name = "Head" })
		glowEyes(P, 15.2, -6, 0.8, 0.5, rgb(240, 240, 120))
		P(Vector3.new(1.6, 0.3, 0.6), at(0, 14, -6.6), rgb(30, 10, 10))
		for _, x in ipairs({ -1, 1 }) do
			P(Vector3.new(5, 0.5, 2.6), at(x * 5.4, -2.6, -2, 0, x * 25, x * -10), s)
			P(Vector3.new(4.2, 0.5, 2.4), at(x * 5, -2.6, 6, 0, x * -25, x * -10), s)
		end
	end
	local function dino(P, s, belly, opts) -- generic theropod (T-Rex / Spinosaurus)
		local k = opts.k or 1
		for _, x in ipairs({ -1, 1 }) do
			P(Vector3.new(2.6 * k, 5 * k, 3.4 * k), at(x * 2 * k, 1 * k, 1 * k, -15, 0, 0), s)
			P(Vector3.new(1.4 * k, 4 * k, 1.4 * k), at(x * 2 * k, -1.2, 2 * k, 20, 0, 0), s)
			P(Vector3.new(2 * k, 0.8, 3 * k), at(x * 2 * k, -2.6, 1 * k), s)
			for f = -1, 1 do P(Vector3.new(0.3, 0.3, 1), at(x * 2 * k + f * 0.6, -2.7, -0.2 * k), rgb(30, 30, 30)) end
			seg(P, Vector3.new(x * 1.6, 5.4 * k, -3.2 * k), Vector3.new(x * 1.8, 4 * k, -4.6 * k), (opts.arm or 0.7) * k, s)
		end
		P(Vector3.new(5 * k, 5.4 * k, 10 * k), at(0, 5 * k, 0, -10, 0, 0), s, { shape = BALL })
		P(Vector3.new(3.8 * k, 3.4 * k, 8 * k), at(0, 4 * k, -0.6 * k, -10, 0, 0), belly, { shape = BALL })
		chain(P, 9, function(t) return Vector3.new(math.sin(t * 2.4) * 1.5, (5 - t * 2.6) * k, (4 + t * 13) * k) end, function(t) return (3.8 - t * 3.2) * k end, s)
		seg(P, Vector3.new(0, 6.6 * k, -3.6 * k), Vector3.new(0, 8.4 * k, -5.4 * k), 2.6 * k, s)
		local hz = -5.4 * k - (opts.snout or 3) * k / 2
		P(Vector3.new(3.2 * k, 2.6 * k, (opts.snout or 3) * k + 2), at(0, 8.8 * k, hz), s, { name = "Head" })
		P(Vector3.new(2.8 * k, 1 * k, (opts.snout or 3) * k + 1.6), at(0, 7.2 * k, hz - 0.2, 12, 0, 0), s, { name = "Jaw" })
		P(Vector3.new(2.6 * k, 1, (opts.snout or 3) * k + 1), at(0, 7.9 * k, hz), rgb(110, 20, 24))
		teeth(P, at(0, 7.9 * k, hz - ((opts.snout or 3) * k) / 2 - 0.4), 6, 2.6 * k, nil)
		glowEyes(P, 9.6 * k, hz + 0.8, 1.4 * k, 0.6 * k, opts.eye or rgb(255, 170, 30))
	end
	B.trex = function(P) dino(P, rgb(90, 80, 60), rgb(170, 150, 110), { k = 1.1, snout = 3.6, arm = 0.5 }) end
	B.spinosaurus = function(P)
		local s = rgb(70, 86, 60)
		dino(P, s, rgb(160, 150, 110), { k = 1, snout = 6, arm = 0.8, eye = rgb(255, 220, 60) })
		for i = -4, 5 do -- the sail
			local h = 7 - math.abs(i - 0.5) * 1.1
			P(Vector3.new(0.35, h, 1.6), at(0, 8 + h / 2, i * 1.4, -4, 0, 0), i % 2 == 0 and rgb(170, 80, 50) or rgb(150, 70, 44), { name = "Sail" })
		end
	end
	local function furry(P, fur, face, opts) -- big ape-like body (Yeti / Bigfoot)
		local k = opts.k or 1
		for _, x in ipairs({ -1, 1 }) do
			P(Vector3.new(1.8 * k, 3.6, 1.8 * k), at(x * 1.1 * k, -1.2, 0), fur, { mat = FABRIC })
			P(Vector3.new(2 * k, 0.8, 2.6 * k), at(x * 1.1 * k, -2.8, -0.4), face)
			P(Vector3.new(1.7 * k, 6 * k, 1.7 * k), at(x * 3.5 * k, 2 * k, -0.6, 15, 0, x * 12), fur, { mat = FABRIC })
			P(Vector3.new(1.4 * k, 1.2, 1.6 * k), at(x * 4 * k, -1.2 + k, -1.6), face)
		end
		P(Vector3.new(5.4 * k, 6.2 * k, 3.8 * k), at(0, 3.4 * k, 0.4, 12, 0, 0), fur, { mat = FABRIC })
		P(Vector3.new(3.4 * k, 3.4 * k, 3.4 * k), at(0, 7.4 * k, -0.6), fur, { shape = BALL, mat = FABRIC })
		P(Vector3.new(2.4 * k, 2.2 * k, 0.8), at(0, 7.2 * k, -2.1 * k), face)
		glowEyes(P, 7.8 * k, -2.5 * k, 0.55 * k, 0.45 * k, opts.eye)
		P(Vector3.new(1.4 * k, 0.6, 0.4), at(0, 6.6 * k, -2.5 * k), rgb(60, 10, 10))
		teeth(P, at(0, 6.9 * k, -2.65 * k), 4, 1.2 * k, nil)
	end
	B.yeti = function(P) furry(P, rgb(235, 240, 245), rgb(130, 160, 190), { k = 1.25, eye = rgb(90, 200, 255) }) end
	B.bigfoot = function(P) furry(P, rgb(92, 64, 40), rgb(60, 44, 34), { k = 1.15, eye = rgb(255, 180, 60) }) end
	B.chupacabra = function(P)
		local s = rgb(80, 90, 76)
		for _, x in ipairs({ -1, 1 }) do
			seg(P, Vector3.new(x * 0.8, 0.6, 1.4), Vector3.new(x * 0.9, -3, 2), 0.7, s)
			seg(P, Vector3.new(x * 1.2, 1.4, -1.6), Vector3.new(x * 1.6, -3, -2.6), 0.6, s)
			for f = -1, 1 do P(Vector3.new(0.15, 0.15, 0.8), at(x * 1.6 + f * 0.2, -2.9, -3.2), rgb(220, 210, 190)) end
		end
		P(Vector3.new(2.6, 2.4, 5.4), at(0, 1.2, 0, 15, 0, 0), s, { shape = BALL })
		for i = 0, 6 do P(Vector3.new(0.3, 1.6 - i * 0.12, 0.4), at(0, 2.6 - i * 0.1, -1.6 + i * 0.7, -20, 0, 0), rgb(40, 50, 40), { name = "Spine" }) end
		P(Vector3.new(1.8, 1.6, 2.4), at(0, 2.2, -3.2), s, { shape = BALL })
		glowEyes(P, 2.6, -4.2, 0.45, 0.6, rgb(255, 20, 20))
		P(Vector3.new(1, 0.4, 0.3), at(0, 1.6, -4.4), rgb(50, 10, 10))
		for _, x in ipairs({ -0.3, 0.3 }) do P(Vector3.new(0.16, 0.6, 0.16), at(x, 1.4, -4.45), rgb(245, 240, 225)) end
		chain(P, 6, function(t) return Vector3.new(0, 1 - t * 1.4, 2.6 + t * 3) end, function(t) return 0.6 - t * 0.4 end, s)
	end
	B.vampire = function(P)
		local pale, cape = rgb(220, 215, 220), rgb(16, 10, 14)
		L.humanoidBody(P, rgb(24, 18, 22), { height = 1.1, legs = rgb(20, 16, 18) })
		P(Vector3.new(4.4, 7.6, 0.3), at(0, -0.2, 1.1, 6, 0, 0), cape, { mat = FABRIC, name = "Cape" })
		P(Vector3.new(4.4, 7.6, 0.25), at(0, -0.2, 1.18, 6, 0, 0), rgb(140, 10, 20), { mat = FABRIC })
		P(Vector3.new(3.6, 1.8, 0.3), at(0, 2.8, 0.7, -20, 0, 0), cape, { mat = FABRIC, name = "Collar" })
		P(Vector3.new(1.8, 2.1, 1.8), at(0, 3, -0.1), pale, { name = "Head" })
		P(Vector3.new(1.9, 0.6, 1.9), at(0, 4.1, 0.1), rgb(10, 10, 12))
		P(Vector3.new(0.8, 0.8, 0.3), at(0, 4, -0.85, 0, 0, 45), rgb(10, 10, 12))
		glowEyes(P, 3.3, -0.85, 0.42, 0.3, rgb(255, 20, 30))
		for _, x in ipairs({ -0.25, 0.25 }) do P(Vector3.new(0.14, 0.4, 0.14), at(x, 2.4, -0.92), rgb(250, 250, 250)) end
		P(Vector3.new(0.8, 0.4, 0.2), at(0, 1.6, -0.82), rgb(160, 10, 20), { mat = NEON })
	end
	B.quetzalcoatlus = function(P)
		local s = rgb(130, 110, 100)
		for _, x in ipairs({ -1, 1 }) do
			seg(P, Vector3.new(x * 1.2, 2, 1), Vector3.new(x * 1.6, -3, 2), 0.6, s)
			seg(P, Vector3.new(x * 1.6, 4, -1.4), Vector3.new(x * 6, -3, -3), 0.7, s) -- wing-arms walking
			P(Vector3.new(0.2, 6, 7), CFrame.lookAt(Vector3.new(x * 4, 1.6, -0.6), Vector3.new(x * 9, 1.6, 2)), rgb(150, 90, 70), { mat = FABRIC, name = "Wing" })
		end
		P(Vector3.new(3.6, 3.4, 5), at(0, 3, 0, -30, 0, 0), s, { shape = BALL })
		seg(P, Vector3.new(0, 4.6, -1.6), Vector3.new(0, 9, -3.4), 1.1, s)
		P(Vector3.new(2, 2, 3.4), at(0, 9.6, -4.2), s, { shape = BALL, name = "Head" })
		P(Vector3.new(0.3, 3.2, 3.2), at(0, 11.2, -2.4, 40, 0, 0), rgb(200, 60, 40), { name = "Crest" })
		seg(P, Vector3.new(0, 9.4, -5.4), Vector3.new(0, 8, -12), 0.8, rgb(220, 200, 140))
		glowEyes(P, 10, -5, 0.8, 0.45, rgb(255, 190, 40))
	end
	B.gargoyle = function(P)
		local s = rgb(110, 110, 115)
		local o = { mat = SLATE }
		for _, x in ipairs({ -1, 1 }) do
			P(Vector3.new(1.3, 2.6, 1.6), at(x * 1.1, -1.6, -0.2, -20, 0, 0), s, o)
			P(Vector3.new(1, 3.4, 1), at(x * 2.4, 0.6, -1, 25, 0, x * 10), s, o)
			for f = -1, 1 do P(Vector3.new(0.2, 1, 0.2), at(x * 2.6 + f * 0.25, -1.4, -1.8, 30, 0, 0), rgb(60, 60, 64), o) end
			wing(P, Vector3.new(x * 1, 3, 1.2), x, 7, rgb(90, 90, 96))
			seg(P, Vector3.new(x * 0.6, 4.6, -0.2), Vector3.new(x * 1.2, 6.2, 0.8), 0.4, rgb(60, 60, 64))
		end
		P(Vector3.new(3.4, 4, 2.6), at(0, 1.6, 0, 25, 0, 0), s, o)
		P(Vector3.new(2.4, 2.4, 2.4), at(0, 3.8, -1.2), s, { shape = BALL, mat = SLATE })
		glowEyes(P, 4, -2.3, 0.5, 0.45, rgb(255, 140, 30))
		teeth(P, at(0, 3.2, -2.35), 4, 1.2, nil)
	end
	B.dragon = function(P)
		local s, belly = rgb(150, 30, 26), rgb(220, 160, 70)
		for _, x in ipairs({ -1, 1 }) do
			for _, z in ipairs({ -3, 4 }) do
				seg(P, Vector3.new(x * 2.2, 1.6, z), Vector3.new(x * 2.6, -3, z - 0.6), 1.4, s)
				for f = -1, 1 do P(Vector3.new(0.25, 0.25, 1), at(x * 2.6 + f * 0.4, -2.9, z - 1.4), rgb(30, 20, 20)) end
			end
			wing(P, Vector3.new(x * 2, 4.4, -1), x, 12, rgb(110, 20, 20))
		end
		P(Vector3.new(6, 5, 12), at(0, 2.4, 0), s, { shape = BALL })
		P(Vector3.new(4.6, 3, 10), at(0, 1, -0.4), belly, { shape = BALL })
		chain(P, 8, function(t) return Vector3.new(0, 3.4 + t * 5, -5 - t * 3) end, function(t) return 2.8 - t * 1 end, s)
		P(Vector3.new(3, 2.6, 5), at(0, 9.2, -9.6), s, { name = "Head" })
		P(Vector3.new(2.6, 0.9, 4.4), at(0, 7.8, -9.8, 10, 0, 0), s, { name = "Jaw" })
		P(Vector3.new(2.4, 0.8, 3.6), at(0, 8.4, -10), rgb(255, 120, 20), { mat = NEON, name = "Fire" })
		teeth(P, at(0, 8.5, -12.1), 6, 2.4, nil)
		glowEyes(P, 10, -11, 1.1, 0.6, rgb(255, 220, 40))
		for _, x in ipairs({ -1, 1 }) do seg(P, Vector3.new(x * 1, 10.4, -8.4), Vector3.new(x * 1.6, 12.6, -6.4), 0.5, rgb(40, 30, 30)) end
		chain(P, 12, function(t) return Vector3.new(math.sin(t * 4) * 2, 2.4 - t * 2.4, 6 + t * 14) end, function(t) return 3 - t * 2.4 end, s)
		for i = 0, 7 do P(Vector3.new(0.3, 1.4, 1.2), at(0, 5.2 - i * 0.2, -3 + i * 2.6, -20, 0, 0), rgb(40, 20, 20)) end
	end
	B.fester = function(P) -- Father Fester: a gaunt, too-tall priest with a wide grin
		local robe, pale = rgb(18, 16, 20), rgb(215, 205, 195)
		P(Vector3.new(2.6, 9, 2), at(0, 1.6, 0), robe, { mat = FABRIC, name = "Robe" })
		P(Vector3.new(3.4, 2, 2.6), at(0, -2.2, 0), robe, { mat = FABRIC })
		P(Vector3.new(1, 0.5, 0.3), at(0, 5.8, -1.05), rgb(240, 240, 240), { name = "Collar" })
		for _, x in ipairs({ -1, 1 }) do
			seg(P, Vector3.new(x * 1.5, 5.6, 0), Vector3.new(x * 2.4, 1, -1.2), 0.6, robe, { mat = FABRIC })
			for f = -2, 2 do seg(P, Vector3.new(x * 2.4, 1, -1.2), Vector3.new(x * 2.5 + f * 0.18, -1.4, -1.9), 0.14, pale) end
		end
		seg(P, Vector3.new(0, 6, 0), Vector3.new(0, 7.2, -0.2), 0.7, pale)
		-- v1.5.1: egg-shaped head, hollow black eyes, a very long drooping jaw lined with thin teeth
		P(Vector3.new(1.9, 2.8, 2), at(0, 8.6, -0.2), pale, { shape = BALL, name = "Head" })
		P(Vector3.new(0.6, 0.8, 0.3), at(-0.42, 8.9, -1.08), rgb(5, 5, 5), { shape = BALL }); P(Vector3.new(0.6, 0.8, 0.3), at(0.42, 8.9, -1.08), rgb(5, 5, 5), { shape = BALL })
		P(Vector3.new(0.14, 0.14, 0.1), at(-0.42, 8.9, -1.24), rgb(255, 255, 255), { mat = NEON, name = "Pupil" }); P(Vector3.new(0.14, 0.14, 0.1), at(0.42, 8.9, -1.24), rgb(255, 255, 255), { mat = NEON, name = "Pupil" })
		P(Vector3.new(1.3, 2.2, 0.3), at(0, 6.8, -1.0, -8, 0, 0), rgb(74, 20, 22), { name = "Jaw" })          -- gaping mouth
		P(Vector3.new(1.4, 0.4, 0.9), at(0, 5.7, -0.95, -8, 0, 0), pale, { name = "Jaw" })                     -- drooping chin
		for k = 0, 9 do local x = -0.55 + k * 0.122
			P(Vector3.new(0.07, 0.45, 0.07), at(x, 7.75, -1.18), rgb(235, 228, 205)); P(Vector3.new(0.07, 0.45, 0.07), at(x, 5.95, -1.22), rgb(235, 228, 205))
		end
		P(Vector3.new(2.4, 0.3, 2.4), at(0, 9.8, -0.2), robe, { name = "Hat" })
		P(Vector3.new(1.6, 1.4, 1.6), at(0, 10.6, -0.2), robe, { name = "Hat" })
		-- escalation stage parts (hidden until he grows stronger)
		for _, x in ipairs({ -1, 1 }) do
			seg(P, Vector3.new(x * 1.2, 4.4, 0.2), Vector3.new(x * 3.6, 3, -1.6), 0.4, robe, { name = "Stage3" })
			seg(P, Vector3.new(x * 1, 3.2, 0.6), Vector3.new(x * 3.4, 6.6, 1.4), 0.4, robe, { name = "Stage5" })
		end
		P(Vector3.new(4.6, 11, 4.6), at(0, 2.4, 0.4), rgb(120, 0, 0), { mat = Enum.Material.ForceField, name = "Stage6", transp = 1 })
	end
	-- v1.5.1 Doctor Nowhere forms, Boisvert and the Wendigo
	B.dn_conezone = function(P) -- Cone Zone: a charcoal, fuzzy long-legged spider
		local fur = rgb(38, 36, 36)
		P(Vector3.new(3.2, 2.2, 3.6), at(0, -0.2, 0.6), fur, { shape = BALL, mat = Enum.Material.Carpet })     -- abdomen
		P(Vector3.new(2, 1.6, 2), at(0, -0.4, -1.6), fur, { shape = BALL, mat = Enum.Material.Carpet })         -- head
		for _, x in ipairs({ -1, 1 }) do
			for k = 0, 3 do local z = -1.6 + k * 0.9
				seg(P, Vector3.new(x * 0.8, -0.2, z), Vector3.new(x * 3, 1.6, z + (k - 1.5) * 0.9), 0.3, fur, { mat = Enum.Material.Carpet })
				seg(P, Vector3.new(x * 3, 1.6, z + (k - 1.5) * 0.9), Vector3.new(x * 4.2, -3, z + (k - 1.5) * 1.4), 0.24, fur, { mat = Enum.Material.Carpet })
			end
			P(Vector3.new(0.3, 0.3, 0.3), at(x * 0.4, -0.1, -2.55), rgb(10, 10, 10), { shape = BALL, mat = Enum.Material.Glass })
			P(Vector3.new(0.2, 0.2, 0.2), at(x * 0.7, 0.2, -2.45), rgb(10, 10, 10), { shape = BALL, mat = Enum.Material.Glass })
		end
	end
	B.dn_guilt = function(P) -- Guilt: a tall white figure whose face is a flat plate
		local white = rgb(236, 234, 228)
		for _, x in ipairs({ -1, 1 }) do
			seg(P, Vector3.new(x * 0.5, 2, 0), Vector3.new(x * 0.55, -3, 0), 0.5, white)
			seg(P, Vector3.new(x * 1.2, 6, 0), Vector3.new(x * 1.6, 0.4, -0.6), 0.38, white)
		end
		P(Vector3.new(1.9, 4.6, 1.1), at(0, 4.1, 0), white)
		seg(P, Vector3.new(0, 6.4, 0), Vector3.new(0, 7.6, -0.1), 0.5, white)
		P(Vector3.new(1.7, 2.2, 1.7), at(0, 8.5, 0), white, { shape = BALL, name = "Head" })
		P(Vector3.new(1.5, 1.9, 0.18), at(0, 8.5, -0.85), rgb(250, 250, 248), { mat = Enum.Material.SmoothPlastic })  -- the face plate
		P(Vector3.new(0.22, 0.08, 0.05), at(-0.35, 8.8, -0.95), rgb(20, 20, 20)); P(Vector3.new(0.22, 0.08, 0.05), at(0.35, 8.8, -0.95), rgb(20, 20, 20))
	end
	B.boisvert = function(P) -- black anvil head, tiny white eyes, grainy static aura
		local blk = rgb(12, 12, 14)
		for _, x in ipairs({ -1, 1 }) do
			seg(P, Vector3.new(x * 0.55, 0, 0), Vector3.new(x * 0.6, -3, 0), 0.6, blk)
			seg(P, Vector3.new(x * 1.3, 2.6, 0), Vector3.new(x * 1.6, -0.6, -0.3), 0.45, blk)
		end
		P(Vector3.new(2.2, 3, 1.3), at(0, 1.4, 0), blk)
		P(Vector3.new(3.6, 0.9, 1.6), at(0, 4.1, 0), blk, { name = "Head" })        -- anvil face
		P(Vector3.new(1.4, 1.1, 1.2), at(0, 3.3, 0), blk)                            -- waist of the anvil
		P(Vector3.new(1.2, 0.6, 1.0), at(2.1, 4.25, 0, 0, 0, -12), blk)             -- horn
		P(Vector3.new(0.12, 0.12, 0.05), at(-0.35, 4.15, -0.82), rgb(255, 255, 255), { mat = NEON, name = "Pupil" })
		P(Vector3.new(0.12, 0.12, 0.05), at(0.35, 4.15, -0.82), rgb(255, 255, 255), { mat = NEON, name = "Pupil" })
		for k = 1, 16 do P(Vector3.new(0.18, 0.18, 0.18), at(math.sin(k * 2.7) * 1.8, 0.4 + (k % 8) * 0.55, math.cos(k * 1.9) * 1), rgb(90 + (k * 37) % 160, 90 + (k * 37) % 160, 90 + (k * 37) % 160), { mat = NEON, transp = 0.45, noShadow = true }) end -- static grain
	end
	local function antlers(P, y, bone)
		for _, x in ipairs({ -1, 1 }) do
			local a, b = Vector3.new(x * 0.5, y, 0), Vector3.new(x * 1.8, y + 2.2, 0.3)
			seg(P, a, b, 0.22, bone); seg(P, b, Vector3.new(x * 2.6, y + 3.6, 0.1), 0.18, bone)
			seg(P, Vector3.new(x * 1.2, y + 1.3, 0.2), Vector3.new(x * 1.0, y + 2.6, -0.4), 0.15, bone)
			seg(P, b, Vector3.new(x * 1.5, y + 3.4, -0.3), 0.15, bone)
		end
	end
	B.wendigo = function(P) -- deer form: gaunt furred beast, deer skull, antlers, exposed ribs
		local fur, bone = rgb(74, 52, 36), rgb(216, 204, 176)
		for _, x in ipairs({ -1, 1 }) do
			seg(P, Vector3.new(x * 0.6, 1.2, 0.6), Vector3.new(x * 0.7, -0.8, 1.3), 0.6, fur, { mat = Enum.Material.Carpet })
			seg(P, Vector3.new(x * 0.7, -0.8, 1.3), Vector3.new(x * 0.65, -3, 0.9), 0.32, fur)
			seg(P, Vector3.new(x * 1.1, 5, -0.4), Vector3.new(x * 1.7, 0.6, -1.4), 0.35, fur, { mat = Enum.Material.Carpet })
			for f = -1, 1 do seg(P, Vector3.new(x * 1.7, 0.6, -1.4), Vector3.new(x * 1.8 + f * 0.15, -0.5, -1.9), 0.08, bone) end
		end
		P(Vector3.new(2, 4.2, 1.3), at(0, 3.4, -0.2, -12, 0, 0), fur, { mat = Enum.Material.Carpet })
		for k = 0, 4 do P(Vector3.new(1.7, 0.12, 0.15), at(0, 2.4 + k * 0.5, -0.95, -12, 0, 0), bone) end   -- ribs
		seg(P, Vector3.new(0, 5.4, -0.5), Vector3.new(0, 6.3, -1.1), 0.5, fur)
		P(Vector3.new(0.9, 1.0, 1.9), at(0, 6.6, -1.6, 10, 0, 0), bone, { name = "Head" })                   -- deer skull
		P(Vector3.new(0.28, 0.3, 0.2), at(-0.28, 6.75, -2.2), rgb(0, 0, 0), { shape = BALL }); P(Vector3.new(0.28, 0.3, 0.2), at(0.28, 6.75, -2.2), rgb(0, 0, 0), { shape = BALL })
		P(Vector3.new(0.1, 0.1, 0.05), at(-0.28, 6.75, -2.32), rgb(255, 255, 255), { mat = NEON }); P(Vector3.new(0.1, 0.1, 0.05), at(0.28, 6.75, -2.32), rgb(255, 255, 255), { mat = NEON })
		P(Vector3.new(0.7, 0.25, 1.2), at(0, 6.0, -1.9, 22, 0, 0), bone, { name = "Jaw" })
		antlers(P, 7.1, bone)
	end
	B.wendigo_h = function(P) -- human form: crouched, pale, gaunt, bone & bead chest plate, screaming
		local skin, stain, bone = rgb(200, 196, 188), rgb(122, 20, 20), rgb(216, 204, 176)
		for _, x in ipairs({ -1, 1 }) do
			seg(P, Vector3.new(x * 0.5, 0.4, 0), Vector3.new(x * 0.9, -1.2, -0.9), 0.5, skin)
			seg(P, Vector3.new(x * 0.9, -1.2, -0.9), Vector3.new(x * 0.7, -3, 0), 0.4, skin)
			seg(P, Vector3.new(x * 0.9, 2.6, -0.3), Vector3.new(x * 1.5, -1.8, -1.2), 0.32, skin)
			for f = -1, 1 do seg(P, Vector3.new(x * 1.5, -1.8, -1.2), Vector3.new(x * 1.6 + f * 0.12, -2.8, -1.4), 0.07, stain) end
		end
		P(Vector3.new(1.6, 2.6, 0.9), at(0, 1.6, -0.3, -25, 0, 0), skin)
		P(Vector3.new(1.5, 1.4, 0.15), at(0, 1.9, -0.85, -25, 0, 0), bone)                                   -- bone & bead chest plate
		for k = 0, 5 do P(Vector3.new(0.14, 0.14, 0.14), at(-0.55 + k * 0.22, 1.2, -0.95), rgb(160, 40, 30), { shape = BALL }) end
		P(Vector3.new(1.4, 0.7, 1), at(0, 0.1, 0), rgb(58, 90, 42), { mat = FABRIC })                         -- loincloth
		P(Vector3.new(1.2, 1.5, 1.2), at(0, 3.5, -0.9), skin, { shape = BALL, name = "Head" })
		P(Vector3.new(0.3, 0.4, 0.2), at(-0.25, 3.7, -1.45), rgb(0, 0, 0), { shape = BALL }); P(Vector3.new(0.3, 0.4, 0.2), at(0.25, 3.7, -1.45), rgb(0, 0, 0), { shape = BALL })
		P(Vector3.new(0.5, 0.9, 0.2), at(0, 2.9, -1.4), rgb(40, 6, 8), { name = "Jaw" })                      -- screaming mouth
		P(Vector3.new(0.6, 0.2, 0.3), at(0, 2.4, -1.25), stain)                                               -- teen-level blood smear
		antlers(P, 4.1, bone)
	end
	return B
end
