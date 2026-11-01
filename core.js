// Night Hunt game core: runs in Node (server.js) or in a host's browser (P2P mode).
(function (root) {
const MAX_CAP = 15, MIN_START = 2, TICK = 1000 / 30, SEND_EVERY = 2; // 30Hz sim, 15Hz net
const ROUND_TIME = +(typeof process !== 'undefined' && process.env && process.env.ROUND_TIME) || 150, EXTRACT_AT = Math.min(60, Math.floor(ROUND_TIME * .4)), RESULTS_TIME = 9, FLIGHT_TIME = 4;
const MONSTERS = {
  freddy:     { name: 'Freddy',         ability: 'Lights Out',        desc: 'Every survivor\'s flashlight dies for 5s', cd: 18, speed: 172, r: 20 },
  bonnie:     { name: 'Bonnie',         ability: 'Guitar Riff',       desc: 'Stun survivors near you for 1.8s', cd: 14, speed: 170, r: 20 },
  chica:      { name: 'Chica',          ability: 'Cupcake Trap',      desc: 'Drop a hidden cupcake trap (max 3) that roots survivors', cd: 7, speed: 168, r: 20 },
  foxy:       { name: 'Foxy',           ability: 'Pirate Dash',       desc: 'Sprint at 3x speed for 1.3s', cd: 10, speed: 175, r: 19 },
  springtrap: { name: 'Springtrap',     ability: 'Vent Crawl',        desc: 'Teleport to a vent near the closest survivor', cd: 16, speed: 168, r: 20 },
  cartooncat: { name: 'Cartoon Cat',    ability: 'Rubber Arms',       desc: 'Catch reach x3 for 3s', cd: 14, speed: 178, r: 18 },
  sirenhead:  { name: 'Siren Head',     ability: 'Siren Call',        desc: 'Reveal every survivor (even in bushes) for 5s', cd: 18, speed: 165, r: 26 },
  boiledone:  { name: 'The Boiled One', ability: 'Dread Gaze',        desc: 'Survivors within range move 50% slower for 4s', cd: 15, speed: 168, r: 21 },
  drnowhere:  { name: 'Doctor Nowhere', ability: 'Nowhere Warp',      desc: 'Blink forward through walls', cd: 9, speed: 170, r: 19 },
  locust:     { name: 'The Locust',     ability: 'Static Fade',       desc: 'Turn invisible to survivors for 5s', cd: 17, speed: 172, r: 20 },
  monochrome: { name: 'Monochrome',     ability: 'Color Drain',       desc: 'Survivors go grey and can\'t sprint for 5s', cd: 16, speed: 172, r: 20 },
  demogorgon: { name: 'Demogorgon',     ability: 'Upside Down Portal',desc: 'Place a portal, use again to jump back to it', cd: 14, speed: 174, r: 21 },
};
const MKEYS = Object.keys(MONSTERS);
const COLORS = ['#e74c3c','#3498db','#2ecc71','#f1c40f','#9b59b6','#1abc9c','#e67e22','#ecf0f1','#fd79a8','#00cec9','#a29bfe','#55efc4','#fab1a0','#74b9ff','#ffeaa7'];
const THEMES = ['Abandoned Pizzeria Town', 'Foggy Woods', 'Static Fields'];

const rooms = new Map();
let nextId = 1;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const now = () => Date.now() / 1000;
function code() { const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s; do { s = ''; for (let i = 0; i < 5; i++) s += pick(c); } while (rooms.has(s)); return s; }
function clean(s, n) { return String(s || '').replace(/[^\w \-!?.']/g, '').trim().slice(0, n); }

// ---------- maps ----------
const LOBBY = { w: 1400, h: 900, walls: [], trees: [], bushes: [], vents: [], theme: 'Helipad Lobby',
  heli: { x: 700, y: 420, r: 110 } };
LOBBY.walls = [{ x: 0, y: 0, w: 1400, h: 30 }, { x: 0, y: 870, w: 1400, h: 30 }, { x: 0, y: 0, w: 30, h: 900 }, { x: 1370, y: 0, w: 30, h: 900 }];
LOBBY.trees = [{ x: 200, y: 200, r: 40 }, { x: 1200, y: 200, r: 40 }, { x: 200, y: 700, r: 40 }, { x: 1200, y: 700, r: 40 }];

function genMap() {
  const theme = pick(THEMES), W = 2600, H = 2600, m = { w: W, h: H, theme, walls: [], trees: [], bushes: [], vents: [] };
  const B = 40; m.walls.push({ x: 0, y: 0, w: W, h: B }, { x: 0, y: H - B, w: W, h: B }, { x: 0, y: 0, w: B, h: H }, { x: W - B, y: 0, w: B, h: H });
  const free = (x, y, r) => x > 80 + r && y > 80 + r && x < W - 80 - r && y < H - 80 - r && Math.hypot(x - W / 2, y - H / 2) > 200 &&
    !m.walls.some(w => x + r > w.x && x - r < w.x + w.w && y + r > w.y && y - r < w.y + w.h) && !m.trees.some(t => Math.hypot(t.x - x, t.y - y) < t.r + r);
  const nB = theme === 'Abandoned Pizzeria Town' ? 16 : theme === 'Static Fields' ? 7 : 3;
  const nT = theme === 'Foggy Woods' ? 140 : theme === 'Static Fields' ? 30 : 45;
  for (let i = 0, k = 0; i < nB && k < 500; k++) { // buildings = 4 walls with doorways
    const bw = rand(220, 420), bh = rand(200, 380), x = rand(100, W - 100 - bw), y = rand(100, H - 100 - bh);
    if (!free(x + bw / 2, y + bh / 2, Math.max(bw, bh) / 2 + 90)) continue;
    const t = 24, d = 80, dx = x + bw / 2 - d / 2, dy = y + bh / 2 - d / 2;
    m.walls.push({ x, y, w: dx - x, h: t }, { x: dx + d, y, w: x + bw - dx - d, h: t });          // top w/ door
    m.walls.push({ x, y: y + bh - t, w: bw, h: t });                                          // bottom
    m.walls.push({ x, y, w: t, h: dy - y }, { x, y: dy + d, w: t, h: y + bh - dy - d });          // left w/ door
    m.walls.push({ x: x + bw - t, y, w: t, h: bh });                                          // right
    if (Math.random() < .5) m.bushes.push({ x: x + bw / 2, y: y + bh / 2, r: 34, inside: true }); // hiding spot (box pile)
    i++;
  }
  for (let i = 0, k = 0; i < nT && k < 3000; k++) { const r = rand(18, 38), x = rand(0, W), y = rand(0, H); if (free(x, y, r + 40)) { m.trees.push({ x, y, r }); i++; } }
  for (let i = 0, k = 0; i < 28 && k < 3000; k++) { const r = rand(30, 46), x = rand(0, W), y = rand(0, H); if (free(x, y, r)) { m.bushes.push({ x, y, r }); i++; } }
  for (let i = 0, k = 0; i < 10 && k < 3000; k++) { const x = rand(0, W), y = rand(0, H); if (free(x, y, 30)) { m.vents.push({ x, y }); i++; } }
  return m;
}
function freeSpot(m, r, near, spread) {
  for (let k = 0; k < 400; k++) {
    const x = near ? near.x + rand(-spread, spread) : rand(80, m.w - 80), y = near ? near.y + rand(-spread, spread) : rand(80, m.h - 80);
    if (x < 60 || y < 60 || x > m.w - 60 || y > m.h - 60) continue;
    if (!collides(m, x, y, r)) return { x, y };
  }
  return { x: m.w / 2, y: m.h / 2 };
}
function collides(m, x, y, r) {
  return m.walls.some(w => x + r > w.x && x - r < w.x + w.w && y + r > w.y && y - r < w.y + w.h) || m.trees.some(t => Math.hypot(t.x - x, t.y - y) < t.r + r);
}
function moveEnt(m, e, dx, dy) {
  const r = e.r;
  const tryAxis = (nx, ny) => { if (!collides(m, nx, ny, r)) { e.x = nx; e.y = ny; return true; } return false; };
  if (!tryAxis(e.x + dx, e.y + dy)) { if (!tryAxis(e.x + dx, e.y)) tryAxis(e.x, e.y + dy); }
  e.x = clamp(e.x, r, m.w - r); e.y = clamp(e.y, r, m.h - r);
}

// ---------- rooms / players ----------
function makePlayer(name, ws, bot) {
  return { id: nextId++, name, ws, bot: !!bot, color: COLORS[0], x: 0, y: 0, a: 0, r: 16, keys: {}, role: 'lobby', mt: null,
    alive: true, escaped: false, stamina: 100, cdUntil: 0, st: {}, score: 0, botT: 0, botGoal: null, lastPos: null };
}
function roomInfo(r) { return { code: r.code, name: r.name, players: r.players.size, max: r.max, state: r.state, theme: r.map && r.state !== 'lobby' ? r.map.theme : 'Lobby', isPublic: r.isPublic }; }
function send(p, o) { if (p.ws && p.ws.readyState === 1) p.ws.send(JSON.stringify(o)); }
function bcast(r, o) { const s = JSON.stringify(o); for (const p of r.players.values()) if (p.ws && p.ws.readyState === 1) p.ws.send(s); }
function event(r, msg, kind) { bcast(r, { t: 'event', msg, kind: kind || 'info' }); }
function recolor(r) { const used = new Set(); for (const p of r.players.values()) { if (!used.has(p.color) && p.colorSet) { used.add(p.color); continue; } p.color = COLORS.find(c => !used.has(c)) || '#fff'; p.colorSet = true; used.add(p.color); } }
function toLobby(r) {
  r.state = 'lobby'; r.map = LOBBY; r.traps = []; r.portal = null; r.extract = null;
  for (const p of r.players.values()) { Object.assign(p, { role: 'lobby', mt: null, alive: true, escaped: false, st: {}, r: 16, stamina: 100 }); Object.assign(p, freeSpot(LOBBY, 16, { x: 700, y: 700 }, 150)); }
  sendMap(r);
}
function sendMap(r, only) {
  const m = r.map, o = { t: 'map', map: { w: m.w, h: m.h, theme: m.theme, walls: m.walls, trees: m.trees, bushes: m.bushes, vents: m.vents, heli: m.heli || null } };
  if (only) send(only, o); else bcast(r, o);
}
function addToRoom(r, p) {
  r.players.set(p.id, p); p.room = r; recolor(r);
  if (r.state === 'lobby') Object.assign(p, freeSpot(LOBBY, 16, { x: 700, y: 700 }, 150));
  else { Object.assign(p, { role: 'ghost', alive: false }); Object.assign(p, freeSpot(r.map, 16)); }
  if (p.ws) { send(p, { t: 'joined', code: r.code, name: r.name, you: p.id, host: r.host === p.id, max: r.max, isPublic: r.isPublic, monsters: MONSTERS }); sendMap(r, p); }
  event(r, `${p.name} joined (${r.players.size}/${r.max})`);
}
function removeFromRoom(p) {
  const r = p.room; if (!r) return; r.players.delete(p.id); p.room = null;
  event(r, `${p.name} left`);
  if (![...r.players.values()].some(q => !q.bot)) { rooms.delete(r.code); return; }
  if (r.host === p.id) { r.host = [...r.players.values()].find(q => !q.bot).id; const h = r.players.get(r.host); send(h, { t: 'host' }); event(r, `${h.name} is now the host`); }
  if (r.state === 'playing') checkEnd(r);
}

function startRound(r) {
  const ps = [...r.players.values()], n = ps.length;
  if (n < MIN_START) return 'Need at least 2 players (add a bot!)';
  r.state = 'flight'; r.flightEnd = now() + FLIGHT_TIME; r.map = genMap(); r.traps = []; r.portal = null; r.extract = null;
  // each player has a random chance to be a monster: 1 per ~5 players on average, at least 1, never everyone
  let chance = 0.2, mons = ps.filter(() => Math.random() < chance);
  const maxM = Math.max(1, Math.floor(n / 3));
  while (mons.length > maxM) mons.splice(Math.floor(Math.random() * mons.length), 1);
  if (!mons.length) mons = [pick(ps)];
  const pool = [...MKEYS].sort(() => Math.random() - .5);
  const center = { x: r.map.w / 2, y: r.map.h / 2 };
  for (const p of ps) {
    Object.assign(p, { alive: true, escaped: false, st: {}, stamina: 100, cdUntil: 0, keys: {} });
    if (mons.includes(p)) { p.role = 'monster'; p.mt = pool.pop(); p.r = MONSTERS[p.mt].r; Object.assign(p, freeSpot(r.map, p.r)); while (dist(p, center) < 900) Object.assign(p, freeSpot(r.map, p.r)); p.cdUntil = now() + FLIGHT_TIME + 6; }
    else { p.role = 'survivor'; p.mt = null; p.r = 16; Object.assign(p, freeSpot(r.map, 16, center, 160)); }
  }
  sendMap(r);
  bcast(r, { t: 'flight', theme: r.map.theme, secs: FLIGHT_TIME, roles: ps.map(p => ({ id: p.id, role: p.role, mt: p.mt })) });
}
function beginPlay(r) { r.state = 'playing'; r.roundEnd = now() + ROUND_TIME; event(r, `Dropped into ${r.map.theme}. Survive ${ROUND_TIME}s or reach the extraction helicopter!`, 'big'); }
function checkEnd(r) {
  if (r.state !== 'playing') return;
  const ps = [...r.players.values()], surv = ps.filter(p => p.role === 'survivor'), mons = ps.filter(p => p.role === 'monster');
  const alive = surv.filter(p => p.alive && !p.escaped), t = now();
  let why = null;
  if (!mons.length) why = 'All monsters left the game';
  else if (!surv.length) why = 'No survivors left';
  else if (!alive.length) why = 'Everyone is caught or escaped';
  else if (t >= r.roundEnd) { why = 'Time is up — the sun rises!'; for (const p of alive) { p.escaped = true; p.survivedTime = true; } }
  if (!why) return;
  const saved = surv.filter(p => p.escaped).length, caught = surv.filter(p => !p.alive).length;
  const winner = saved > caught ? 'survivors' : caught > saved ? 'monsters' : 'tie';
  for (const p of surv) if (p.escaped) p.score += 2;
  for (const p of mons) p.score += caught;
  r.state = 'results'; r.resultsEnd = t + RESULTS_TIME;
  bcast(r, { t: 'results', why, winner, saved, caught, players: ps.map(p => ({ id: p.id, name: p.name, role: p.role, mt: p.mt, escaped: p.escaped, alive: p.alive, score: p.score, color: p.color })) });
}
function catchP(r, m, s) {
  s.alive = false; s.role = 'survivor'; s.caughtBy = m.mt; m.score += 0;
  send(s, { t: 'caught', by: m.mt });
  event(r, `${s.name} was caught by ${MONSTERS[m.mt].name}!`, 'bad');
  checkEnd(r);
}

// ---------- abilities ----------
function useAbility(r, p) {
  if (r.state !== 'playing' || p.role !== 'monster') return;
  const t = now(); if (t < p.cdUntil) return;
  const M = MONSTERS[p.mt], surv = [...r.players.values()].filter(q => q.role === 'survivor' && q.alive && !q.escaped);
  let cd = M.cd;
  switch (p.mt) {
    case 'freddy': surv.forEach(s => s.st.blind = t + 5); event(r, 'Freddy: LIGHTS OUT! Flashlights died…', 'bad'); break;
    case 'bonnie': surv.filter(s => dist(s, p) < 230).forEach(s => s.st.stun = t + 1.8); bcast(r, { t: 'fx', kind: 'ring', x: p.x, y: p.y, r: 230, c: '#8e44ad' }); break;
    case 'chica': r.traps.push({ x: p.x, y: p.y, owner: p.id }); if (r.traps.filter(x => x.owner === p.id).length > 3) r.traps.splice(r.traps.findIndex(x => x.owner === p.id), 1); break;
    case 'foxy': p.st.dash = t + 1.3; break;
    case 'springtrap': {
      const tgt = surv.sort((a, b) => dist(a, p) - dist(b, p))[0];
      const v = r.map.vents.length ? r.map.vents.slice().sort((a, b) => (tgt ? dist(a, tgt) - dist(b, tgt) : Math.random() - .5))[tgt ? Math.min(1, r.map.vents.length - 1) : 0] : null;
      if (v) { bcast(r, { t: 'fx', kind: 'poof', x: p.x, y: p.y, c: '#6b8e23' }); Object.assign(p, freeSpot(r.map, p.r, v, 40)); bcast(r, { t: 'fx', kind: 'poof', x: p.x, y: p.y, c: '#6b8e23' }); }
      break; }
    case 'cartooncat': p.st.reach = t + 3; break;
    case 'sirenhead': surv.forEach(s => s.st.reveal = t + 5); bcast(r, { t: 'fx', kind: 'siren', x: p.x, y: p.y }); event(r, 'A distant siren wails… Siren Head can see everyone!', 'bad'); break;
    case 'boiledone': surv.filter(s => dist(s, p) < 380).forEach(s => s.st.slow = t + 4); bcast(r, { t: 'fx', kind: 'ring', x: p.x, y: p.y, r: 380, c: '#7b0000' }); break;
    case 'drnowhere': {
      const ox = p.x, oy = p.y; let d = 240;
      while (d > 0) { const nx = clamp(ox + Math.cos(p.a) * d, 50, r.map.w - 50), ny = clamp(oy + Math.sin(p.a) * d, 50, r.map.h - 50); if (!collides(r.map, nx, ny, p.r)) { p.x = nx; p.y = ny; break; } d -= 15; }
      bcast(r, { t: 'fx', kind: 'poof', x: ox, y: oy, c: '#ffffff' }); break; }
    case 'locust': p.st.invis = t + 5; break;
    case 'monochrome': surv.forEach(s => s.st.grey = t + 5); event(r, 'The world drains of color… no sprinting!', 'bad'); break;
    case 'demogorgon':
      if (!r.portal || r.portal.owner !== p.id) { r.portal = { x: p.x, y: p.y, owner: p.id }; cd = 2; }
      else { bcast(r, { t: 'fx', kind: 'poof', x: p.x, y: p.y, c: '#c0392b' }); p.x = r.portal.x; p.y = r.portal.y; r.portal = null; }
      break;
  }
  p.cdUntil = t + cd;
  send(p, { t: 'abilityUsed' });
  bcast(r, { t: 'sfx', kind: p.mt, x: p.x, y: p.y });
}

// ---------- bots ----------
const BOT_NAMES = ['Bot Noob', 'Bot Bacon', 'Bot Guest', 'Bot Builder', 'Bot Ninja', 'Bot Pizza', 'Bot Jelly', 'Bot Rocket', 'Bot Tofu', 'Bot Pickle', 'Bot Nugget', 'Bot Waffle', 'Bot Sprout', 'Bot Biscuit'];
function botThink(r, p, t) {
  const k = { up: 0, down: 0, left: 0, right: 0, sprint: 0 };
  let tx = null, ty = null, flee = false;
  if (r.state === 'lobby') { tx = r.map.heli.x + Math.sin(p.id) * 50; ty = r.map.heli.y + Math.cos(p.id) * 40; if (dist(p, { x: tx, y: ty }) < 20) tx = null; }
  else if (r.state === 'playing' && p.role === 'monster') {
    const vis = [...r.players.values()].filter(s => s.role === 'survivor' && s.alive && !s.escaped && (dist(s, p) < 500) && !(hidden(r, s) && dist(s, p) > 90 && !(s.st.reveal > t)));
    const tgt = vis.sort((a, b) => dist(a, p) - dist(b, p))[0];
    if (tgt) { tx = tgt.x; ty = tgt.y; if (t > p.cdUntil && dist(tgt, p) < 220 && Math.random() < .05) { p.a = Math.atan2(ty - p.y, tx - p.x); useAbility(r, p); } }
    else { if (!p.botGoal || dist(p, p.botGoal) < 40 || t > p.botT) { const ss = [...r.players.values()].filter(s => s.role === 'survivor' && s.alive && !s.escaped).sort((a, b) => dist(a, p) - dist(b, p))[0]; p.botGoal = ss ? freeSpot(r.map, p.r, ss, 250) : freeSpot(r.map, p.r); p.botT = t + 5; } tx = p.botGoal.x; ty = p.botGoal.y; }
  } else if (r.state === 'playing' && p.role === 'survivor' && p.alive && !p.escaped) {
    const th = [...r.players.values()].filter(m => m.role === 'monster' && !(m.st.invis > t) && dist(m, p) < 380).sort((a, b) => dist(a, p) - dist(b, p))[0];
    if (th) { tx = p.x + (p.x - th.x); ty = p.y + (p.y - th.y); flee = true; }
    else if (r.extract) { tx = r.extract.x; ty = r.extract.y; }
    else { if (!p.botGoal || dist(p, p.botGoal) < 40 || t > p.botT) { const b = Math.random() < .5 && r.map.bushes.length ? pick(r.map.bushes) : freeSpot(r.map, 16); p.botGoal = { x: b.x, y: b.y }; p.botT = t + 10; } tx = p.botGoal.x; ty = p.botGoal.y; if (dist(p, p.botGoal) < 20) tx = null; }
  }
  // unstick
  if (p.lastPos && dist(p, p.lastPos) < 1 && tx !== null) { p.stuck = (p.stuck || 0) + 1; } else p.stuck = 0;
  p.lastPos = { x: p.x, y: p.y };
  if (p.stuck > 10) { p.botGoal = freeSpot(r.map, p.r); p.wiggle = { a: rand(0, Math.PI * 2), until: t + .7 }; p.stuck = 0; }
  if (p.wiggle && t < p.wiggle.until) { tx = p.x + Math.cos(p.wiggle.a) * 100; ty = p.y + Math.sin(p.wiggle.a) * 100; }
  if (tx !== null) { const dx = tx - p.x, dy = ty - p.y; if (Math.abs(dx) > 8) k[dx > 0 ? 'right' : 'left'] = 1; if (Math.abs(dy) > 8) k[dy > 0 ? 'down' : 'up'] = 1; p.a = Math.atan2(dy, dx); k.sprint = flee && p.stamina > 20 ? 1 : 0; }
  p.keys = k;
}
function hidden(r, s) { return r.map.bushes.some(b => Math.hypot(b.x - s.x, b.y - s.y) < b.r); }

// ---------- simulation ----------
let tickN = 0;
function step() {
  const t = now(), dt = TICK / 1000; tickN++;
  for (const r of rooms.values()) {
    if (r.state === 'flight' && t >= r.flightEnd) beginPlay(r);
    if (r.state === 'results' && t >= r.resultsEnd) toLobby(r);
    if (r.state === 'playing') {
      if (!r.extract && r.roundEnd - t <= EXTRACT_AT) { const s = freeSpot(r.map, 90); r.extract = { x: s.x, y: s.y, r: 80 }; event(r, 'The extraction helicopter has landed! Find it (follow the arrow)!', 'big'); bcast(r, { t: 'sfx', kind: 'heli' }); }
      checkEnd(r);
    }
    for (const p of r.players.values()) {
      if (p.bot) botThink(r, p, t);
      const k = p.keys || {}; let dx = (k.right ? 1 : 0) - (k.left ? 1 : 0), dy = (k.down ? 1 : 0) - (k.up ? 1 : 0);
      const len = Math.hypot(dx, dy); if (len) { dx /= len; dy /= len; }
      if (r.state === 'flight') continue;
      let sp;
      if (p.role === 'monster') { sp = MONSTERS[p.mt].speed * (p.st.dash > t ? 3 : 1); }
      else if (!p.alive || p.escaped || p.role === 'ghost') sp = 260;
      else {
        const canSprint = !(p.st.grey > t) && p.stamina > 1;
        const sprinting = k.sprint && len && canSprint;
        p.stamina = clamp(p.stamina + (sprinting ? -32 : 14) * dt, 0, 100);
        sp = sprinting ? 245 : 150;
        if (p.st.slow > t) sp *= .5;
        if (p.st.stun > t || p.st.root > t) sp = 0;
      }
      if (r.state === 'lobby') sp = 200;
      if (len && sp) {
        if ((!p.alive || p.escaped || p.role === 'ghost') && r.state === 'playing') { p.x = clamp(p.x + dx * sp * dt, 20, r.map.w - 20); p.y = clamp(p.y + dy * sp * dt, 20, r.map.h - 20); }
        else moveEnt(r.map, p, dx * sp * dt, dy * sp * dt);
      }
    }
    if (r.state === 'lobby') { r.boarded = [...r.players.values()].filter(p => dist(p, LOBBY.heli) < LOBBY.heli.r).map(p => p.id); }
    if (r.state === 'playing') {
      const surv = [...r.players.values()].filter(p => p.role === 'survivor' && p.alive && !p.escaped);
      for (const m of r.players.values()) if (m.role === 'monster') {
        const reach = (m.r + 16 + 6) * (m.st.reach > t ? 3 : 1);
        for (const s of surv) if (s.alive && dist(s, m) < reach) catchP(r, m, s);
      }
      for (const s of surv) {
        if (!s.alive) continue;
        const ti = r.traps.findIndex(tr => Math.hypot(tr.x - s.x, tr.y - s.y) < 26);
        if (ti >= 0) { s.st.root = t + 2.2; r.traps.splice(ti, 1); send(s, { t: 'event', msg: 'You stepped in a cupcake trap!', kind: 'bad' }); }
        if (r.extract && dist(s, r.extract) < r.extract.r) { s.escaped = true; event(r, `${s.name} escaped on the helicopter!`, 'good'); checkEnd(r); }
      }
    }
    if (tickN % SEND_EVERY === 0) snapshot(r, t);
  }
}
function snapshot(r, t) {
  const all = [...r.players.values()];
  for (const me of all) {
    if (!me.ws || me.ws.readyState !== 1) continue;
    const meGhost = !me.alive || me.escaped || me.role === 'ghost';
    const ps = [];
    for (const p of all) {
      if (p !== me && r.state === 'playing') {
        const pGhost = !p.alive || p.escaped || p.role === 'ghost';
        if (pGhost && !meGhost) continue;                                       // ghosts invisible to the living
        if (!meGhost && me.role === 'survivor' && p.role === 'monster' && p.st.invis > t) continue;
        if (!meGhost && me.role === 'monster' && p.role === 'survivor' && hidden(r, p) && dist(p, me) > 90 && !(p.st.reveal > t)) continue;
      }
      const st = {}; for (const k in p.st) if (p.st[k] > t) st[k] = 1;
      ps.push({ id: p.id, n: p.name, c: p.color, x: Math.round(p.x), y: Math.round(p.y), a: +p.a.toFixed(2), role: p.role, mt: p.mt, al: p.alive, es: p.escaped, h: r.host === p.id, b: p.bot, st, sc: p.score });
    }
    const o = { t: 's', state: r.state, ps, ex: r.extract, max: r.max, boarded: r.boarded || [],
      tl: r.state === 'playing' ? Math.max(0, Math.ceil(r.roundEnd - t)) : r.state === 'flight' ? Math.ceil(r.flightEnd - t) : r.state === 'results' ? Math.ceil(r.resultsEnd - t) : 0,
      me: { stamina: Math.round(me.stamina), cd: Math.max(0, +(me.cdUntil - t).toFixed(1)) } };
    if (me.role === 'monster' || meGhost) { o.traps = r.traps; o.portal = r.portal; }
    if (r.state === 'playing' && me.role === 'survivor' && me.alive) { // heartbeat: nearest monster distance
      const md = Math.min(...all.filter(p => p.role === 'monster').map(p => dist(p, me))); o.md = isFinite(md) ? Math.round(md) : 99999;
    }
    me.ws.send(JSON.stringify(o));
  }
}


function handleConnection(ws) {
  let p = null;
  return {
    message(raw) {
      let m; try { m = JSON.parse(raw); } catch { return; }
      const r = p && p.room;
      switch (m.t) {
        case 'list': send({ ws }, { t: 'list', servers: [...rooms.values()].filter(x => x.isPublic).map(roomInfo) }); break;
        case 'create': {
          if (r) return;
          const max = clamp(parseInt(m.max) || 4, MIN_START, MAX_CAP);
          const nr = { code: code(), name: clean(m.name, 24) || 'Night Hunt Server', max, isPublic: !!m.isPublic, players: new Map(), state: 'lobby', map: LOBBY, traps: [] };
          rooms.set(nr.code, nr); p = makePlayer(clean(m.player, 16) || 'Player', ws); nr.host = p.id; addToRoom(nr, p); break; }
        case 'join': {
          if (r) return;
          const jr = rooms.get(String(m.code || '').toUpperCase().trim());
          if (!jr) return send({ ws }, { t: 'error', msg: 'No server with that code.' });
          if (jr.players.size >= jr.max) return send({ ws }, { t: 'error', msg: `Server is full (${jr.players.size}/${jr.max}).` });
          p = makePlayer(clean(m.player, 16) || 'Player', ws); addToRoom(jr, p); break; }
        case 'input': if (p) { const k = m.k || {}; p.keys = { up: !!k.up, down: !!k.down, left: !!k.left, right: !!k.right, sprint: !!k.sprint }; if (typeof m.a === 'number' && isFinite(m.a)) p.a = m.a; } break;
        case 'ability': if (r) useAbility(r, p); break;
        case 'start': if (r && r.host === p.id && r.state === 'lobby') {
          const notBoarded = [...r.players.values()].filter(q => !q.bot && !(r.boarded || []).includes(q.id));
          if (r.players.size < MIN_START) return send(p, { t: 'error', msg: 'Need at least 2 players to start (invite friends or add a bot).' });
          if (notBoarded.length) return send(p, { t: 'error', msg: 'Waiting for ' + notBoarded.map(q => q.name).join(', ') + ' to board the helicopter.' });
          startRound(r);
        } break;
        case 'addBot': if (r && r.host === p.id) {
          if (r.players.size >= r.max) return send(p, { t: 'error', msg: `Server is full (${r.max} max).` });
          const b = makePlayer(BOT_NAMES.find(n => ![...r.players.values()].some(q => q.name === n)) || 'Bot', null, true); addToRoom(r, b);
        } break;
        case 'kickBot': if (r && r.host === p.id) { const b = [...r.players.values()].reverse().find(q => q.bot); if (b) removeFromRoom(b); } break;
        case 'settings': if (r && r.host === p.id) {
          if (m.max) { r.max = clamp(parseInt(m.max) || r.max, Math.max(MIN_START, r.players.size), MAX_CAP); }
          if (typeof m.isPublic === 'boolean') r.isPublic = m.isPublic;
          bcast(r, { t: 'settings', max: r.max, isPublic: r.isPublic });
        } break;
        case 'leave': if (p) { removeFromRoom(p); p = null; } break;
      }
    },
    close() { if (p) removeFromRoom(p); p = null; }
  };
}
const api = { handleConnection, step, rooms, MONSTERS, TICK, MAX_CAP, roomInfo };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.NightHuntCore = api;
})(typeof self !== 'undefined' ? self : this);
