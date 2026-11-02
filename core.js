// Night Hunt game core: runs in Node (server.js) or in a host's browser (P2P mode).
(function (root) {
const MAX_CAP = 15, MIN_START = 2, TICK = 1000 / 30, SEND_EVERY = 2; // 30Hz sim, 15Hz net
const ROUND_ENV = +(typeof process !== 'undefined' && process.env && process.env.ROUND_TIME) || 0, RESULTS_TIME = 9, FLIGHT_TIME = 4;
const ROUND_LENS = [300, 420, 600], DEFAULT_LEN = 420; // host picks 5 / 7 / 10 minutes
const roundTime = r => ROUND_ENV || r.roundLen || DEFAULT_LEN;
const extractAt = r => Math.min(90, Math.floor(roundTime(r) * .4)); // extraction helicopter lands for the last ~90s
// ---------- items: weapons, armor, food & drinks, ammo ----------
const ITEMS = {
  fists:   { name: 'Fists', type: 'melee', dmg: 8, range: 46, rate: .5, icon: '✊' },
  knife:   { name: 'Knife', type: 'melee', dmg: 22, range: 54, rate: .34, icon: '🔪' },
  bat:     { name: 'Baseball Bat', type: 'melee', dmg: 30, range: 68, rate: .62, stun: .7, icon: '🏏' },
  crowbar: { name: 'Crowbar', type: 'melee', dmg: 36, range: 64, rate: .7, stun: .4, icon: '🪝' },
  axe:     { name: 'Fire Axe', type: 'melee', dmg: 52, range: 70, rate: .95, stun: .3, icon: '🪓' },
  pistol:  { name: 'Pistol', type: 'gun', dmg: 24, range: 640, rate: .3, ammo: 'light', start: 12, spread: .035, icon: '🔫' },
  shotgun: { name: 'Shotgun', type: 'gun', dmg: 12, pellets: 7, range: 340, rate: .95, ammo: 'shells', start: 6, spread: .28, stun: .45, icon: '💥' },
  rifle:   { name: 'Rifle', type: 'gun', dmg: 22, range: 900, rate: .15, ammo: 'heavy', start: 30, spread: .03, auto: true, icon: '🎯' },
  water:   { name: 'Water Bottle', type: 'use', hp: 15, stam: 45, icon: '💧', drink: true },
  soda:    { name: 'Soda', type: 'use', hp: 10, stam: 60, icon: '🥤', drink: true },
  energy:  { name: 'Energy Drink', type: 'use', stam: 100, boost: 8, icon: '⚡', drink: true },
  chips:   { name: 'Chips', type: 'use', hp: 20, icon: '🍟' },
  choco:   { name: 'Chocolate Bar', type: 'use', hp: 15, stam: 25, icon: '🍫' },
  beans:   { name: 'Canned Beans', type: 'use', hp: 35, icon: '🥫' },
  medkit:  { name: 'First Aid Kit', type: 'use', hp: 70, icon: '🩹' },
  vest:    { name: 'Bulletproof Vest', type: 'armor', slot: 'vest', dur: 100, red: .35, icon: '🦺' },
  helmet:  { name: 'Helmet', type: 'armor', slot: 'helmet', dur: 60, red: .15, icon: '⛑️' },
  ammo_light:  { name: 'Pistol Ammo', type: 'ammo', ammo: 'light', n: 18, icon: '🟡' },
  ammo_shells: { name: 'Shotgun Shells', type: 'ammo', ammo: 'shells', n: 8, icon: '🔴' },
  ammo_heavy:  { name: 'Rifle Ammo', type: 'ammo', ammo: 'heavy', n: 30, icon: '🟢' },
};
const LOOT = {
  chest: { knife: 6, bat: 6, crowbar: 5, axe: 4, pistol: 6, shotgun: 4, rifle: 2.5, vest: 5, helmet: 5, medkit: 3, ammo_light: 5, ammo_shells: 3.5, ammo_heavy: 2.5, beans: 3, energy: 3 },
  bag: { water: 8, soda: 8, chips: 7, choco: 7, beans: 5, energy: 4, medkit: 1.5, ammo_light: 5, ammo_shells: 3, ammo_heavy: 2, knife: 3, pistol: 1.5, helmet: 1.5 },
};
const SLOTS = 6, STACK = 3, MON_DMG = 34, MON_HP = 300, DOWN_TIME = 6;
const AFTON = { ability: 'Afton Laugh', desc: 'A creepy laugh echoes — you see every survivor for 10s', cd: 20 };
// Doctor Nowhere shapeshifts every 30s between forms drawn from Doctor Nowhere's (Silas Orion's) creature catalogue; each has its own power
const DN_FORMS = [
  { k: 'doctor', name: 'The Doctor (coat)', ability: 'Injection', desc: 'Jab the nearest survivor with a syringe: they are slowed for 6s' },
  { k: 'conezone', name: 'Cone Zone', ability: 'Cone Quake', desc: 'The tall white cone slams the ground: survivors close by are stunned for 1.6s' },
  { k: 'nightmare', name: 'Nightmare Man', ability: 'Shadow Step', desc: 'Melt into shadow and reappear far ahead of you' },
  { k: 'sixarm', name: 'The Doctor (six arms)', ability: 'Paranoia', desc: 'Survivors near you hallucinate (screen distortion) for 8s and you see them for 6s' },
];
const DN_PERIOD = 30;
const MONSTERS = {
  freddy:     { name: 'Freddy',         ...AFTON, speed: 172, r: 20 },
  bonnie:     { name: 'Bonnie',         ...AFTON, speed: 170, r: 20 },
  chica:      { name: 'Chica',          ...AFTON, speed: 168, r: 20 },
  foxy:       { name: 'Foxy',           ...AFTON, speed: 176, r: 19 },
  springtrap: { name: 'Springtrap',     ...AFTON, speed: 168, r: 20 },
  cartooncat: { name: 'Cartoon Cat',    ability: 'Rubber Grab',       desc: 'Stretch a rubber arm and yank the survivor in front of you to your feet', cd: 20, speed: 178, r: 18 },
  sirenhead:  { name: 'Siren Head',     ability: 'Siren Call',        desc: 'A deafening siren reveals every survivor (even hidden) for 8s', cd: 20, speed: 165, r: 26 },
  drnowhere:  { name: 'Doctor Nowhere', ability: 'Shapeshift',        desc: 'Changes form every 30s — Doctor: injection · Cone Zone: quake · Nightmare Man: shadow step · six-armed Doctor: paranoia', forms: DN_FORMS, cd: 20, speed: 170, r: 19 },
  locust:     { name: 'The Locust',     ability: 'Swarm Omen',        desc: 'Pick one random survivor: you appear nearby and a locust smashes into their screen', cd: 20, speed: 172, r: 20 },
  monochrome: { name: 'Monochrome',     ability: 'Total Blackout',    desc: 'Every survivor\'s screen goes pitch black for 10s', cd: 20, speed: 172, r: 20 },
  sonicexe:   { name: 'Sonic.exe',      ability: "You Can't Run",     desc: 'A distorted laugh… then you run much faster for 10s', cd: 20, speed: 174, r: 18 },
  demogorgon: { name: 'Demogorgon',     ability: 'Upside Down Portal',desc: 'Open a portal and come out near the closest survivor', cd: 20, speed: 174, r: 21 },
};
const MKEYS = Object.keys(MONSTERS);
// cosmetics (bought with in-game coins in the lobby shop; no real money)
const HATS = ['none', 'cap', 'beanie', 'cowboy', 'headphones', 'crown', 'hardhat', 'bunny'], ACCS = ['none', 'glasses', 'scarf', 'mask', 'goggles'];
const MSKINS = ['classic', 'shadow', 'golden', 'toxic', 'frost', 'blood'];
const HEX = /^#[0-9a-f]{6}$/i;
function cleanLook(l) { l = l || {}; const n = (v, m) => Math.max(0, Math.min(m, parseInt(v) || 0)); return { sk: n(l.sk, 5), hc: n(l.hc, 5), hs: n(l.hs, 3), top: HEX.test(l.top) ? l.top : null, pants: HEX.test(l.pants) ? l.pants : null, hat: HATS.includes(l.hat) ? l.hat : 'none', acc: ACCS.includes(l.acc) ? l.acc : 'none' }; }
const lookStr = l => [l.sk, l.hc, l.hs, l.top || '', l.pants || '', l.hat, l.acc].join(',');
function botLook() { const r = a => a[Math.floor(Math.random() * a.length)]; return { sk: Math.floor(Math.random() * 6), hc: Math.floor(Math.random() * 6), hs: Math.floor(Math.random() * 4), top: null, pants: r(['#2c3e60', '#3a3a3a', '#4a4030', '#25303f']), hat: r(['none', 'none', 'cap', 'beanie', 'hardhat']), acc: r(['none', 'none', 'glasses', 'scarf']) }; }
const COLORS = ['#e74c3c','#3498db','#2ecc71','#f1c40f','#9b59b6','#1abc9c','#e67e22','#ecf0f1','#fd79a8','#00cec9','#a29bfe','#55efc4','#fab1a0','#74b9ff','#ffeaa7'];
const THEMES = ['Powerline Forest', 'Abandoned Pizzeria Town', 'Foggy Woods', 'Static Fields'];
const ENV = (typeof process !== 'undefined' && process.env) || {};
const pickTheme = () => THEMES.includes(ENV.THEME) ? ENV.THEME : Math.random() < .5 ? THEMES[0] : pick(THEMES.slice(1)); // the power-line forest is the main map

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
const LOBBY = { w: 1400, h: 900, walls: [], trees: [], bushes: [], vents: [], poles: [], lines: [], loot: [], bld: [], props: [], theme: 'Helipad Lobby',
  heli: { x: 700, y: 420, r: 110 } };
LOBBY.walls = [{ x: 0, y: 0, w: 1400, h: 30 }, { x: 0, y: 870, w: 1400, h: 30 }, { x: 0, y: 0, w: 30, h: 900 }, { x: 1370, y: 0, w: 30, h: 900 }];
LOBBY.trees = [{ x: 200, y: 200, r: 40 }, { x: 1200, y: 200, r: 40 }, { x: 200, y: 700, r: 40 }, { x: 1200, y: 700, r: 40 }];

// every building is a furnished house (rooms split by an inner wall) or a facility (warehouse/lab/industrial)
function furnish(m, b) {
  const { x, y, w, h, t, type } = b; m.bld.push({ x, y, w, h, type, kind: type === 'house' ? pick(['cabin', 'farmhouse', 'bungalow']) : pick(['warehouse', 'lab', 'substation']) });
  const P = (k, px, py, pw, ph, solid = true, a = 0) => m.props.push({ k, x: Math.round(px), y: Math.round(py), w: Math.round(pw), h: Math.round(ph), solid, a });
  const ix = x + t, iy = y + t, iw = w - 2 * t, ih = h - 2 * t;
  if (type === 'house') {
    // inner wall splitting living room / bedroom with a doorway
    const sx = x + w / 2 + 60, door = 70, dy = iy + ih * .5 - door / 2;
    m.walls.push({ x: sx, y: iy, w: 14, h: dy - iy }, { x: sx, y: dy + door, w: 14, h: iy + ih - dy - door });
    P('sofa', ix + 12, iy + ih - 50, 110, 38); P('table', ix + 50, iy + ih * .45 - 25, 60, 50); P('tv', ix + 12, iy + 8, 70, 18); P('rug', ix + 30, iy + ih * .3, 110, 80, false);
    const bwid = ix + iw - sx - 14; P('bed', sx + 14 + (bwid - 60) / 2, iy + 8, 60, 104); P('wardrobe', sx + 14 + (bwid - 50) / 2, iy + ih - 30, 50, 24); P('lamp', ix + iw - 22, iy + 120, 16, 16, false);
    P('fridge', sx - 40, iy + ih - 36, 32, 30); P('shelf', ix + 8, iy + 30, 24, 60); P('chair', ix + 120, iy + ih * .45 - 20, 26, 26, false);
  } else {
    const k = m.bld[m.bld.length - 1].kind;
    if (k === 'warehouse') { const rows = Math.max(1, Math.floor((ih - 80) / 90)); for (let r = 0; r < rows; r++) P('rack', ix + 40, iy + 50 + r * 90, iw * .55, 26); P('pallet', ix + iw - 80, iy + 20, 60, 50); P('barrel', ix + iw - 50, iy + ih - 50, 30, 30); P('forklift', ix + iw - 110, iy + ih * .5, 60, 34); }
    else if (k === 'lab') { P('labbench', ix + 30, iy + 30, iw * .45, 34); P('labbench', ix + 30, iy + ih - 64, iw * .45, 34); P('server', ix + iw - 44, iy + 20, 30, 70); P('tank', ix + iw - 70, iy + ih - 80, 50, 50); P('desk', ix + iw * .55, iy + ih * .4, 60, 36); }
    else { P('generator', ix + 30, iy + 30, 90, 60); P('transformer', ix + iw - 100, iy + 30, 70, 70); P('panel', ix + 30, iy + ih - 40, 120, 22); P('barrel', ix + iw - 60, iy + ih - 60, 30, 30); P('cable', ix + iw * .3, iy + ih * .5, 60, 60, false); }
  }
}
function genMap() {
  const theme = pickTheme(), W = 2600, H = 2600, m = { w: W, h: H, theme, walls: [], trees: [], bushes: [], vents: [], poles: [], lines: [], loot: [], bld: [], props: [] };
  const B = 40; m.walls.push({ x: 0, y: 0, w: W, h: B }, { x: 0, y: H - B, w: W, h: B }, { x: 0, y: 0, w: B, h: H }, { x: W - B, y: 0, w: B, h: H });
  const forest = theme === 'Powerline Forest';
  if (forest) { // two high-voltage lines cut straight corridors through the forest
    const line = (x0, y0, x1, y1) => { const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / 430)), pts = []; for (let i = 0; i <= n; i++) pts.push({ x: x0 + (x1 - x0) * i / n, y: y0 + (y1 - y0) * i / n }); m.lines.push(pts); };
    line(140, rand(350, 900), W - 140, rand(1700, 2250)); line(rand(450, 950), 140, rand(1650, 2150), H - 140);
    for (const l of m.lines) for (let i = 0; i < l.length; i++) { const a = l[Math.max(0, i - 1)], b = l[Math.min(l.length - 1, i + 1)]; m.poles.push({ x: l[i].x, y: l[i].y, r: 30, a: Math.atan2(b.y - a.y, b.x - a.x) }); }
  }
  const segD = (x, y, a, b) => { const dx = b.x - a.x, dy = b.y - a.y, k = clamp(((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy), 0, 1); return Math.hypot(x - a.x - dx * k, y - a.y - dy * k); };
  const nearLine = (x, y, d) => m.lines.some(l => l.some((p, i) => i && segD(x, y, l[i - 1], p) < d));
  const free = (x, y, r) => !m.props.some(o => x + r > o.x && x - r < o.x + o.w && y + r > o.y && y - r < o.y + o.h) && x > 80 + r && y > 80 + r && x < W - 80 - r && y < H - 80 - r && Math.hypot(x - W / 2, y - H / 2) > 200 &&
    !m.walls.some(w => x + r > w.x && x - r < w.x + w.w && y + r > w.y && y - r < w.y + w.h) && !m.trees.some(t => Math.hypot(t.x - x, t.y - y) < t.r + r) && !m.poles.some(t => Math.hypot(t.x - x, t.y - y) < t.r + r + 20);
  const nB = theme === 'Abandoned Pizzeria Town' ? 16 : theme === 'Static Fields' ? 7 : forest ? 5 : 3;
  const nT = forest ? 330 : theme === 'Foggy Woods' ? 140 : theme === 'Static Fields' ? 30 : 45;
  const rooms = [];
  for (let i = 0, k = 0; i < nB && k < 500; k++) { // buildings = 4 walls with doorways
    const type = forest ? (rooms.length < 3 ? 'house' : 'facility') : theme === 'Abandoned Pizzeria Town' ? (rooms.length < 2 || Math.random() < .6 ? 'house' : 'facility') : (rooms.length < 2 || Math.random() < .5 ? 'house' : 'facility');
    const bw = type === 'house' ? rand(340, 440) : rand(260, 440), bh = type === 'house' ? rand(280, 380) : rand(240, 380), x = rand(100, W - 100 - bw), y = rand(100, H - 100 - bh);
    if (!free(x + bw / 2, y + bh / 2, Math.max(bw, bh) / 2 + 90)) continue;
    const t = 24, d = 80, dx = x + bw / 2 - d / 2, dy = y + bh / 2 - d / 2;
    m.walls.push({ x, y, w: dx - x, h: t }, { x: dx + d, y, w: x + bw - dx - d, h: t });          // top w/ door
    m.walls.push({ x, y: y + bh - t, w: bw, h: t });                                          // bottom
    m.walls.push({ x, y, w: t, h: dy - y }, { x, y: dy + d, w: t, h: y + bh - dy - d });          // left w/ door
    m.walls.push({ x: x + bw - t, y, w: t, h: bh });                                          // right
    furnish(m, { x, y, w: bw, h: bh, t, type, door: { dx, dy, d } });
    rooms.push({ x, y, w: bw, h: bh, type }); i++;
  }
  for (let i = 0, k = 0; i < nT && k < 6000; k++) { const r = rand(18, 38), x = rand(0, W), y = rand(0, H); if (free(x, y, r + (forest ? 26 : 40)) && !(forest && nearLine(x, y, 130))) { m.trees.push({ x, y, r }); i++; } }
  for (let i = 0, k = 0; i < 28 && k < 3000; k++) { const r = rand(30, 46), x = rand(0, W), y = rand(0, H); if (free(x, y, r)) { m.bushes.push({ x, y, r }); i++; } }
  for (let i = 0, k = 0; i < 10 && k < 3000; k++) { const x = rand(0, W), y = rand(0, H); if (free(x, y, 30)) { m.vents.push({ x, y }); i++; } }
  // loot: chests and bags (one chest inside most buildings, the rest scattered)
  let lid = 1; const okLoot = (x, y) => free(x, y, 26) && !m.bushes.some(b => Math.hypot(b.x - x, b.y - y) < b.r + 20) && !m.loot.some(l => Math.hypot(l.x - x, l.y - y) < 160);
  for (const b of rooms) for (let k = 0; k < 30; k++) { const x = b.x + rand(50, b.w - 50), y = b.y + rand(50, b.h - 50); if (okLoot(x, y)) { m.loot.push({ id: lid++, x, y, kind: Math.random() < .7 ? 'chest' : 'bag', a: rand(0, 6.28) }); break; } }
  for (const [kind, n] of [['chest', 14], ['bag', 22]]) for (let i = 0, k = 0; i < n && k < 4000; k++) { const x = rand(0, W), y = rand(0, H); if (okLoot(x, y)) { m.loot.push({ id: lid++, x, y, kind, a: rand(0, 6.28) }); i++; } }
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
  return m.walls.some(w => x + r > w.x && x - r < w.x + w.w && y + r > w.y && y - r < w.y + w.h) || m.trees.some(t => Math.hypot(t.x - x, t.y - y) < t.r + r) || (m.poles && m.poles.some(t => Math.hypot(t.x - x, t.y - y) < t.r + r)) || (m.props && m.props.some(o => o.solid && x + r > o.x && x - r < o.x + o.w && y + r > o.y && y - r < o.y + o.h));
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
    alive: true, escaped: false, stamina: 100, cdUntil: 0, st: {}, score: 0, earn: 0, look: bot ? botLook() : cleanLook(), pref: null, skin: 'classic', botT: 0, botGoal: null, lastPos: null, ...freshKit() };
}
function freshKit() { return { hp: 100, maxHp: 100, inv: Array(SLOTS).fill(null), sel: 0, ammo: { light: 0, shells: 0, heavy: 0 }, vest: 0, helmet: 0, atkUntil: 0, hitUntil: 0, fire: false, fireEdge: false, sleeping: false, preSleep: null }; }
function roomInfo(r) { return { code: r.code, name: r.name, players: r.players.size, max: r.max, state: r.state, theme: r.map && r.state !== 'lobby' ? r.map.theme : 'Lobby', isPublic: r.isPublic }; }
function send(p, o) { if (p.ws && p.ws.readyState === 1) p.ws.send(JSON.stringify(o)); }
function bcast(r, o) { const s = JSON.stringify(o); for (const p of r.players.values()) if (p.ws && p.ws.readyState === 1) p.ws.send(s); }
function event(r, msg, kind) { bcast(r, { t: 'event', msg, kind: kind || 'info' }); }
function recolor(r) { const used = new Set(); for (const p of r.players.values()) { if (!used.has(p.color) && p.colorSet) { used.add(p.color); continue; } p.color = COLORS.find(c => !used.has(c)) || '#fff'; p.colorSet = true; used.add(p.color); } }
function toLobby(r) {
  r.state = 'lobby'; r.map = LOBBY; r.traps = []; r.portal = null; r.extract = null; r.items = []; r.opened = new Set();
  for (const p of r.players.values()) { Object.assign(p, { role: 'lobby', mt: null, alive: true, escaped: false, st: {}, r: 16, stamina: 100 }, freshKit()); Object.assign(p, freeSpot(LOBBY, 16, { x: 700, y: 700 }, 150)); }
  sendMap(r);
}
function sendMap(r, only) {
  const m = r.map, o = { t: 'map', map: { w: m.w, h: m.h, theme: m.theme, walls: m.walls, trees: m.trees, bushes: m.bushes, vents: m.vents, heli: m.heli || null, poles: m.poles || [], lines: m.lines || [], loot: m.loot || [], bld: m.bld || [], props: m.props || [] } };
  if (only) send(only, o); else bcast(r, o);
}
function addToRoom(r, p) {
  r.players.set(p.id, p); p.room = r; recolor(r);
  if (r.state === 'lobby') Object.assign(p, freeSpot(LOBBY, 16, { x: 700, y: 700 }, 150));
  else { Object.assign(p, { role: 'ghost', alive: false }); Object.assign(p, freeSpot(r.map, 16)); }
  if (p.ws) { send(p, { t: 'joined', code: r.code, name: r.name, you: p.id, host: r.host === p.id, max: r.max, isPublic: r.isPublic, roundLen: r.roundLen, monsters: MONSTERS, items: ITEMS }); sendMap(r, p); }
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
  r.state = 'flight'; r.flightEnd = now() + FLIGHT_TIME; r.map = genMap(); r.traps = []; r.portal = null; r.extract = null; r.items = []; r.opened = new Set(); r.itemId = 1;
  // each player has a random chance to be a monster: 1 per ~5 players on average, at least 1, never everyone
  let chance = 0.2, mons = ps.filter(() => Math.random() < chance);
  const maxM = Math.max(1, Math.floor(n / 3));
  while (mons.length > maxM) mons.splice(Math.floor(Math.random() * mons.length), 1);
  if (!mons.length) mons = [pick(ps)];
  if (ENV.TEST_ROLES === 'humans-survive' && ps.some(p => p.bot)) mons = [pick(ps.filter(p => p.bot))]; // screenshot/test hook only
  if (ENV.TEST_ROLES === 'human-monster' && ps.some(p => !p.bot)) mons = [ps.find(p => !p.bot)]; // screenshot hook only (kill cam)
  const pool = [...MKEYS].sort(() => Math.random() - .5);
  for (const p of mons) if (p.pref && pool.includes(p.pref)) { pool.splice(pool.indexOf(p.pref), 1); pool.push(p.pref); } // chosen monsters go to the top of the pool
  const center = { x: r.map.w / 2, y: r.map.h / 2 };
  for (const p of ps) {
    Object.assign(p, { alive: true, escaped: false, st: {}, stamina: 100, cdUntil: 0, keys: {}, form: 0, formT: 0 }, freshKit());
    if (ENV.TEST_KIT && !p.bot) { p.inv[0] = { k: 'shotgun', n: 1 }; p.inv[1] = { k: 'bat', n: 1 }; p.inv[2] = { k: 'soda', n: 2 }; p.inv[3] = { k: 'beans', n: 1 }; p.ammo.shells = 24; p.vest = 100; p.helmet = 60; } // screenshot hook only
    p.earn = 0;
    if (mons.includes(p)) { p.role = 'monster'; p.mt = p.pref && pool.includes(p.pref) ? pool.splice(pool.indexOf(p.pref), 1)[0] : pool.pop(); p.r = MONSTERS[p.mt].r; p.hp = p.maxHp = MONSTERS[p.mt].hp || MON_HP; Object.assign(p, freeSpot(r.map, p.r)); while (dist(p, center) < 900) Object.assign(p, freeSpot(r.map, p.r)); p.cdUntil = now() + FLIGHT_TIME + 6; }
    else { p.role = 'survivor'; p.mt = null; p.r = 16; Object.assign(p, freeSpot(r.map, 16, center, 160)); }
    if (ENV.TEST_KIT && !p.bot && p.role === 'survivor') { const c = r.map.loot.filter(c => c.kind === 'chest').sort((a, b) => Math.hypot(a.x - center.x, a.y - center.y) - Math.hypot(b.x - center.x, b.y - center.y))[0]; if (c) Object.assign(p, freeSpot(r.map, 16, c, 60)); } // screenshot hook only
  }
  if (ENV.TEST_ROLES === 'human-monster') { const m = ps.find(p => !p.bot), v = ps.find(p => p.bot && p.role === 'survivor'); if (m && v) { ps.forEach(p => { if (p.bot) p.hp = 1; }); m.x = v.x + 90; m.y = v.y; } } // screenshot hook only

  if (ENV.TEST_MON && MONSTERS[ENV.TEST_MON]) for (const p of mons) if (p.bot || ENV.TEST_ROLES === 'human-monster') { p.mt = ENV.TEST_MON; p.r = MONSTERS[p.mt].r; } // screenshot hook only
  sendMap(r);
  bcast(r, { t: 'flight', theme: r.map.theme, secs: FLIGHT_TIME, roles: ps.map(p => ({ id: p.id, role: p.role, mt: p.mt })) });
}
function fmtTime(s) { return s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} min` : s + 's'; }
function beginPlay(r) { r.state = 'playing'; r.roundEnd = now() + roundTime(r); event(r, `Dropped into ${r.map.theme}. Survive ${fmtTime(roundTime(r))} or reach the extraction helicopter! Search chests and bags for gear.`, 'big'); }
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
  for (const p of surv) { if (p.escaped) { p.score += 2; p.earn += 60; } else p.earn += 10; }
  for (const p of mons) p.earn += 15;
  for (const p of ps) if (!p.bot && p.earn > 0) send(p, { t: 'coins', n: p.earn });
  for (const p of mons) p.score += caught;
  r.state = 'results'; r.resultsEnd = t + RESULTS_TIME;
  bcast(r, { t: 'results', why, winner, saved, caught, players: ps.map(p => ({ id: p.id, name: p.name, role: p.role, mt: p.mt, escaped: p.escaped, alive: p.alive, score: p.score, color: p.color })) });
}
function catchP(r, m, s) {
  s.alive = false; s.role = 'survivor'; s.caughtBy = m.mt; s.hp = 0; m.earn += 40;
  dropAll(r, s);
  send(s, { t: 'caught', by: m.mt, fm: m.form || 0 });
  bcast(r, { t: 'scare', id: s.id, mid: m.id, by: m.mt, x: Math.round(s.x), y: Math.round(s.y), mx: Math.round(m.x), my: Math.round(m.y) });
  event(r, `${s.name} was caught by ${MONSTERS[m.mt].name}!`, 'bad');
  checkEnd(r);
}

// ---------- loot, items & combat ----------
function roll(table) { let tot = 0; for (const k in table) tot += table[k]; let x = Math.random() * tot; for (const k in table) { x -= table[k]; if (x <= 0) return k; } return Object.keys(table)[0]; }
function spawnItem(r, k, near, spread) { const s = freeSpot(r.map, 8, near, spread); const it = { id: r.itemId++, x: s.x, y: s.y, k }; r.items.push(it); return it; }
function toggleSleep(r, p) {
  if (r.state !== 'playing' || p.role !== 'survivor' || !p.alive || p.escaped || p.st.root > now()) return;
  const b = nearBed(r, p); if (!b) return;
  p.preSleep = { x: p.x, y: p.y }; p.sleeping = true; p.x = clamp(b.x + b.w / 2, b.x + 4, b.x + b.w - 4); p.y = b.y + b.h / 2; p.sleepPos = { x: p.x, y: p.y };
  send(p, { t: 'event', msg: 'You lie down and sleep… healing. Move or press open again to wake up. Beware of bad dreams.', kind: 'good' }); bcast(r, { t: 'sfx', kind: 'sleep', x: p.x, y: p.y });
}
function openLoot(r, p) {
  if (r.state !== 'playing' || p.role !== 'survivor' || !p.alive || p.escaped) return;
  const c = (r.map.loot || []).filter(c => !r.opened.has(c.id) && dist(c, p) < 70).sort((a, b) => dist(a, p) - dist(b, p))[0]; if (!c) return false;
  r.opened.add(c.id);
  const n = c.kind === 'chest' ? 2 + (Math.random() < .5 ? 1 : 0) : 1 + (Math.random() < .55 ? 1 : 0);
  for (let i = 0; i < n; i++) spawnItem(r, roll(LOOT[c.kind]), c, 36);
  p.earn += 5; bcast(r, { t: 'fx', kind: 'open', x: c.x, y: c.y, id: c.id }); bcast(r, { t: 'sfx', kind: 'open', x: c.x, y: c.y });
  return true;
}
function wake(p) { if (!p.sleeping && !p.preSleep) return; p.sleeping = false; if (p.preSleep) { p.x = p.preSleep.x; p.y = p.preSleep.y; p.preSleep = null; } }
function pickup(r, p, it) {
  const I = ITEMS[it.k]; if (!I) return false;
  if (I.type === 'ammo') p.ammo[I.ammo] += I.n;
  else if (I.type === 'armor') { if (p[I.slot] >= I.dur * .8) return false; p[I.slot] = I.dur; }
  else {
    let s = I.type === 'use' ? p.inv.findIndex(s => s && s.k === it.k && s.n < STACK) : -1;
    if (s >= 0) p.inv[s].n++;
    else {
      if (I.type !== 'use' && p.inv.some(s => s && s.k === it.k)) { if (I.type !== 'gun') return false; p.ammo[I.ammo] += I.start; send(p, { t: 'pickup', k: 'ammo_' + I.ammo, n: I.start }); return true; }
      s = p.inv.findIndex(s => !s); if (s < 0) return false;
      p.inv[s] = { k: it.k, n: 1 }; if (I.type === 'gun') p.ammo[I.ammo] += I.start;
      if (!p.inv[p.sel] || (I.type !== 'use' && ITEMS[p.inv[p.sel].k].type === 'use')) p.sel = s; // auto-equip a new weapon
    }
  }
  send(p, { t: 'pickup', k: it.k, n: I.type === 'ammo' ? I.n : 1 });
  return true;
}
function dropAll(r, p) { if (!r.items) return; for (const s of p.inv) if (s) for (let i = 0; i < s.n; i++) spawnItem(r, s.k, p, 40); p.inv = Array(SLOTS).fill(null); }
function dropSel(r, p) { const s = p.inv[p.sel]; if (!s || r.state !== 'playing') return; const it = spawnItem(r, s.k, p, 20); it.np = p.id; it.npUntil = now() + 2.5; if (--s.n <= 0) p.inv[p.sel] = null; }
function hurtMonster(r, m, dmg, by, stun) {
  const t = now(); if (m.st.down > t || m.st.guard > t) return;
  m.hp -= dmg; bcast(r, { t: 'fx', kind: 'hit', x: m.x, y: m.y, c: '#b00000' });
  if (stun) m.st.stag = t + stun;
  if (m.hp <= 0) { m.hp = 0; m.st.down = t + DOWN_TIME; m.st.dash = 0; by.score += 1; by.earn += 25; event(r, `${by.name} knocked down ${MONSTERS[m.mt].name}! It gets back up in ${DOWN_TIME}s — run!`, 'good'); bcast(r, { t: 'sfx', kind: 'down', x: m.x, y: m.y }); }
}
function hurtSurvivor(r, s, dmg, m) {
  const t = now(); let f = 1;
  if (s.vest > 0) { f -= ITEMS.vest.red; s.vest = Math.max(0, s.vest - dmg * .5); }
  if (s.helmet > 0) { f -= ITEMS.helmet.red; s.helmet = Math.max(0, s.helmet - dmg * .4); }
  s.hp -= dmg * f; s.st.adren = t + 1.3;
  send(s, { t: 'hurt', dmg: Math.round(dmg * f) }); bcast(r, { t: 'fx', kind: 'slash', x: s.x, y: s.y, c: '#ff2020' });
  if (s.hp <= 0) catchP(r, m, s);
}
function useItem(r, p, edge) {
  const t = now();
  if (r.state !== 'playing' || p.role !== 'survivor' || !p.alive || p.escaped || p.st.stun > t || t < p.atkUntil) return;
  const s = p.inv[p.sel], k = s ? s.k : 'fists', I = ITEMS[k];
  if (I.type === 'use') {
    if (!edge) return;
    p.hp = Math.min(p.maxHp, p.hp + (I.hp || 0)); p.stamina = Math.min(100, p.stamina + (I.stam || 0)); if (I.boost) p.st.boost = t + I.boost;
    if (--s.n <= 0) p.inv[p.sel] = null; p.atkUntil = t + .8;
    send(p, { t: 'used', k }); return;
  }
  if (I.type === 'melee') {
    if (!edge && k !== 'fists' && !I.auto && false) return;
    p.atkUntil = t + I.rate; bcast(r, { t: 'fx', kind: 'swing', id: p.id, w: k, x: p.x, y: p.y });
    let best = null, bd = 1e9;
    for (const m of r.players.values()) { if (m.role !== 'monster') continue; const d = dist(m, p); if (d > I.range + m.r) continue; let da = Math.abs(((Math.atan2(m.y - p.y, m.x - p.x) - p.a) + Math.PI * 3) % (Math.PI * 2) - Math.PI); if (da < 1.1 && d < bd) { bd = d; best = m; } }
    if (best) hurtMonster(r, best, I.dmg, p, I.stun);
    return;
  }
  if (I.type === 'gun') {
    if (!edge && !I.auto) return;
    if (p.ammo[I.ammo] <= 0) { p.atkUntil = t + .4; if (edge) send(p, { t: 'event', msg: `Out of ${ITEMS['ammo_' + I.ammo].name.toLowerCase()}! Search bags and chests.`, kind: 'bad' }); bcast(r, { t: 'sfx', kind: 'dry', x: p.x, y: p.y }); return; }
    p.ammo[I.ammo]--; p.atkUntil = t + I.rate;
    const mons = [...r.players.values()].filter(m => m.role === 'monster' && !(m.st.down > t)), shots = [];
    for (let k2 = 0; k2 < (I.pellets || 1); k2++) {
      const a = p.a + (Math.random() - .5) * 2 * I.spread, cx = Math.cos(a), cy = Math.sin(a);
      let x = p.x + cx * 18, y = p.y + cy * 18, hit = null;
      for (let d = 0; d < I.range; d += 10) { x += cx * 10; y += cy * 10; if (collides(r.map, x, y, 2)) break; hit = mons.find(m => Math.hypot(m.x - x, m.y - y) < m.r + 6); if (hit) break; }
      if (hit) hurtMonster(r, hit, I.dmg * (I.pellets ? 1 : 1), p, I.stun);
      shots.push([Math.round(x), Math.round(y)]);
    }
    bcast(r, { t: 'fx', kind: 'shot', id: p.id, w: k, x: p.x, y: p.y, a: +p.a.toFixed(2), to: shots });
  }
}

// ---------- abilities ----------
function useAbility(r, p) {
  if (r.state !== 'playing' || p.role !== 'monster') return;
  const t = now(); if (t < p.cdUntil || p.st.down > t) return;
  const M = MONSTERS[p.mt], surv = [...r.players.values()].filter(q => q.role === 'survivor' && q.alive && !q.escaped);
  let cd = M.cd;
  let snd = p.mt;
  const nearest = () => surv.slice().sort((a, b) => dist(a, p) - dist(b, p))[0];
  const appearNear = (tg, d0, d1) => { for (let k = 0; k < 60; k++) { const a = Math.random() * 6.283, d = d0 + Math.random() * (d1 - d0), x = clamp(tg.x + Math.cos(a) * d, 60, r.map.w - 60), y = clamp(tg.y + Math.sin(a) * d, 60, r.map.h - 60); if (!collides(r.map, x, y, p.r)) { p.x = x; p.y = y; p.a = Math.atan2(tg.y - y, tg.x - x); return true; } } Object.assign(p, freeSpot(r.map, p.r, tg, d1)); return true; };
  switch (p.mt) {
    case 'freddy': case 'bonnie': case 'chica': case 'foxy': case 'springtrap':
      p.st.sight = t + 10; snd = 'laugh'; event(r, `${M.name}: "Ha… ha… ha…" — it can see you all!`, 'bad'); break;
    case 'sirenhead': surv.forEach(s => s.st.reveal = t + 8); bcast(r, { t: 'fx', kind: 'siren', x: p.x, y: p.y }); event(r, 'A deafening siren wails… Siren Head can see everyone!', 'bad'); break;
    case 'monochrome': surv.forEach(s => s.st.dark = t + 10); snd = 'dark'; event(r, 'Total blackout… you can\'t see anything!', 'bad'); break;
    case 'demogorgon': { const tg = nearest(); if (!tg) { cd = 3; break; } bcast(r, { t: 'fx', kind: 'portal', x: p.x, y: p.y }); appearNear(tg, 140, 230); bcast(r, { t: 'fx', kind: 'portal', x: p.x, y: p.y }); snd = 'portal'; break; }
    case 'drnowhere': { const F = DN_FORMS[p.form || 0].k;
      if (F === 'doctor') { const tg = surv.filter(s => dist(s, p) < p.r + s.r + 70).sort((a, b) => dist(a, p) - dist(b, p))[0];
        if (!tg) { cd = 2.5; send(p, { t: 'event', msg: 'Injection missed — get closer!', kind: 'bad' }); break; }
        tg.st.slow = t + 6; send(tg, { t: 'event', msg: 'Doctor Nowhere injected you! You feel sluggish…', kind: 'bad' }); bcast(r, { t: 'fx', kind: 'hit', x: tg.x, y: tg.y, c: '#66ffcc' }); snd = 'inject'; break; }
      if (F === 'conezone') { bcast(r, { t: 'fx', kind: 'ring', x: p.x, y: p.y, r: 220, c: '#f4f4f4' }); let n = 0;
        for (const s of surv) if (dist(s, p) < 220) { n++; if (s.sleeping) wake(s); s.st.stun = t + 1.6; send(s, { t: 'event', msg: 'The ground shakes — Cone Zone stunned you!', kind: 'bad' }); }
        snd = 'quake'; if (!n) cd = 6; break; }
      if (F === 'nightmare') { bcast(r, { t: 'fx', kind: 'poof', x: p.x, y: p.y, c: '#000' }); let ok = false;
        for (let d = 300; d >= 90 && !ok; d -= 30) { const x = p.x + Math.cos(p.a) * d, y = p.y + Math.sin(p.a) * d; if (x > 60 && y > 60 && x < r.map.w - 60 && y < r.map.h - 60 && !collides(r.map, x, y, p.r)) { p.x = x; p.y = y; ok = true; } }
        bcast(r, { t: 'fx', kind: 'poof', x: p.x, y: p.y, c: '#000' }); snd = 'shift'; if (!ok) cd = 3; break; }
      { let n = 0; for (const s of surv) if (dist(s, p) < 650) { n++; s.st.halluc = t + 8; s.st.reveal = Math.max(s.st.reveal || 0, t + 6); send(s, { t: 'event', msg: 'Something with six arms is watching you… you can\'t trust your eyes.', kind: 'bad' }); }
        snd = 'paranoia'; if (!n) { cd = 5; send(p, { t: 'event', msg: 'No survivors close enough to haunt.', kind: 'bad' }); } break; } }
    case 'sonicexe': p.st.fast = t + 10; snd = 'sonlaugh'; event(r, 'A distorted laugh… "You can\'t run forever." Something VERY fast is coming!', 'bad'); break;
    case 'locust': { const tg = surv[Math.floor(Math.random() * surv.length)]; if (!tg) { cd = 3; break; }
      { const tv = r.map.props.filter(q => q.k === 'tv' || q.k === 'desk').map(q => ({ x: q.x + q.w / 2, y: q.y + q.h / 2 })).filter(q => dist(q, tg) < 520).sort((a, b) => dist(a, tg) - dist(b, tg))[0];
        if (tv) { // crawls out of the closest TV / computer screen
          bcast(r, { t: 'fx', kind: 'poof', x: p.x, y: p.y, c: '#222' }); Object.assign(p, freeSpot(r.map, p.r, tv, 90)); p.a = Math.atan2(tg.y - p.y, tg.x - p.x); bcast(r, { t: 'fx', kind: 'poof', x: p.x, y: p.y, c: '#ddd' });
        } else appearNear(tg, 260, 380); }
      tg.st.reveal = t + 4; send(tg, { t: 'locust' }); send(p, { t: 'event', msg: `You descend on ${tg.name}…`, kind: 'good' }); snd = 'buzz'; break; }
    case 'cartooncat': { let best = null, bd = 1e9;
      for (const s of surv) { const d = dist(s, p), da = Math.abs(((Math.atan2(s.y - p.y, s.x - p.x) - p.a + Math.PI * 3) % (Math.PI * 2)) - Math.PI); if (d < 460 && da < .55 && clearLine(r.map, p, s) && d < bd) { bd = d; best = s; } }
      bcast(r, { t: 'fx', kind: 'grab', id: p.id, x: p.x, y: p.y, a: +p.a.toFixed(2), tx: best ? best.x : p.x + Math.cos(p.a) * 420, ty: best ? best.y : p.y + Math.sin(p.a) * 420 });
      if (!best) { cd = 4; break; }
      if (best.sleeping) wake(best);
      const gx = p.x + Math.cos(p.a) * (p.r + best.r + 8), gy = p.y + Math.sin(p.a) * (p.r + best.r + 8);
      if (!collides(r.map, gx, gy, best.r)) { best.x = gx; best.y = gy; } else Object.assign(best, freeSpot(r.map, best.r, p, 50));
      wake(best); best.st.stun = t + 1.2; send(best, { t: 'event', msg: 'A rubber arm grabbed you!', kind: 'bad' }); snd = 'stretch'; break; }
  }
  p.cdUntil = t + cd;
  send(p, { t: 'abilityUsed' });
  bcast(r, { t: 'sfx', kind: snd, mt: p.mt, x: p.x, y: p.y });
}
function clearLine(m, a, b) { const n = Math.ceil(dist(a, b) / 20); for (let i = 1; i < n; i++) { const x = a.x + (b.x - a.x) * i / n, y = a.y + (b.y - a.y) * i / n; if (m.walls.some(w => x > w.x && x < w.x + w.w && y > w.y && y < w.y + w.h)) return false; } return true; }
// beds: survivors can sleep in a house bed to heal (any movement wakes them)
function nearBed(r, p) { return (r.map.props || []).find(o => o.k === 'bed' && p.x > o.x - 40 && p.x < o.x + o.w + 40 && p.y > o.y - 40 && p.y < o.y + o.h + 40); }

// ---------- bots ----------
const BOT_NAMES = ['Bot Noob', 'Bot Bacon', 'Bot Guest', 'Bot Builder', 'Bot Ninja', 'Bot Pizza', 'Bot Jelly', 'Bot Rocket', 'Bot Tofu', 'Bot Pickle', 'Bot Nugget', 'Bot Waffle', 'Bot Sprout', 'Bot Biscuit'];
function botThink(r, p, t) {
  const k = { up: 0, down: 0, left: 0, right: 0, sprint: 0 };
  let tx = null, ty = null, flee = false, aimAt = null;
  if (r.state === 'lobby') { tx = r.map.heli.x + Math.sin(p.id) * 50; ty = r.map.heli.y + Math.cos(p.id) * 40; if (dist(p, { x: tx, y: ty }) < 20) tx = null; }
  else if (r.state === 'playing' && p.role === 'monster' && p.st.down > t) { tx = null; }
  else if (r.state === 'playing' && p.role === 'monster') {
    const vis = [...r.players.values()].filter(s => s.role === 'survivor' && s.alive && !s.escaped && (dist(s, p) < 500) && !(hidden(r, s) && dist(s, p) > 90 && !(s.st.reveal > t)));
    const tgt = vis.sort((a, b) => dist(a, p) - dist(b, p))[0];
    if (tgt) { tx = tgt.x; ty = tgt.y; if (t > p.cdUntil && dist(tgt, p) < 220 && Math.random() < .05) { p.a = Math.atan2(ty - p.y, tx - p.x); useAbility(r, p); } }
    else { if (!p.botGoal || dist(p, p.botGoal) < 40 || t > p.botT) { const ss = [...r.players.values()].filter(s => s.role === 'survivor' && s.alive && !s.escaped).sort((a, b) => dist(a, p) - dist(b, p))[0]; p.botGoal = ss ? freeSpot(r.map, p.r, ss, 250) : freeSpot(r.map, p.r); p.botT = t + 5; } tx = p.botGoal.x; ty = p.botGoal.y; }
  } else if (r.state === 'playing' && p.role === 'survivor' && p.alive && !p.escaped) {
    const th = [...r.players.values()].filter(m => m.role === 'monster' && !(m.st.invis > t) && !(m.st.down > t) && dist(m, p) < 420).sort((a, b) => dist(a, p) - dist(b, p))[0];
    // eat / drink when hurt
    if (p.hp < 55 && t >= p.atkUntil) { const i = p.inv.findIndex(s => s && ITEMS[s.k].hp); if (i >= 0) { p.sel = i; useItem(r, p, true); } }
    if (p.sleeping) { if (!th && p.hp < 95) { p.keys = k; return; } }  // bots nap in beds until healed or a monster shows up
    else if (!th && p.hp < 60 && !p.inv.some(s => s && ITEMS[s.k].hp) && nearBed(r, p) && Math.random() < .05) { toggleSleep(r, p); if (p.sleeping) { p.keys = k; return; } }
    if (th) {
      tx = p.x + (p.x - th.x); ty = p.y + (p.y - th.y); flee = true;
      const gi = p.inv.findIndex(s => s && ITEMS[s.k].type === 'gun' && p.ammo[ITEMS[s.k].ammo] > 0), mi = p.inv.findIndex(s => s && ITEMS[s.k].type === 'melee');
      const d = dist(th, p);
      if (gi >= 0 && d < 520) { p.sel = gi; aimAt = th; }
      else if (d < 80) { if (mi >= 0) p.sel = mi; else if (p.inv[p.sel] && ITEMS[p.inv[p.sel].k].type === 'use') p.sel = p.inv.findIndex(s => !s) >= 0 ? p.inv.findIndex(s => !s) : p.sel; aimAt = th; }
    }
    else if (r.extract) { tx = r.extract.x; ty = r.extract.y; }
    else if (p.inv.some(s => !s) || p.hp < 90) {
      // scavenge: nearby loose items first, then unopened chests/bags
      const it = r.items.filter(i => dist(i, p) < 380 && !(i.np === p.id)).sort((a, b) => dist(a, p) - dist(b, p))[0];
      const c = !it && (r.map.loot || []).filter(c => !r.opened.has(c.id) && dist(c, p) < 1100).sort((a, b) => dist(a, p) - dist(b, p))[0];
      if (it && !(p.skip && p.skip.has(it.id))) { tx = it.x; ty = it.y; if (dist(it, p) < 24) { (p.skip = p.skip || new Set()).add(it.id); } }
      else if (c) { tx = c.x; ty = c.y; if (dist(c, p) < 55) openLoot(r, p); }
      else { if (!p.botGoal || dist(p, p.botGoal) < 40 || t > p.botT) { const b = Math.random() < .5 && r.map.bushes.length ? pick(r.map.bushes) : freeSpot(r.map, 16); p.botGoal = { x: b.x, y: b.y }; p.botT = t + 10; } tx = p.botGoal.x; ty = p.botGoal.y; if (dist(p, p.botGoal) < 20) tx = null; }
    }
    else { if (!p.botGoal || dist(p, p.botGoal) < 40 || t > p.botT) { const b = Math.random() < .5 && r.map.bushes.length ? pick(r.map.bushes) : freeSpot(r.map, 16); p.botGoal = { x: b.x, y: b.y }; p.botT = t + 10; } tx = p.botGoal.x; ty = p.botGoal.y; if (dist(p, p.botGoal) < 20) tx = null; }
  }
  // unstick
  if (p.lastPos && dist(p, p.lastPos) < 1 && tx !== null) { p.stuck = (p.stuck || 0) + 1; } else p.stuck = 0;
  p.lastPos = { x: p.x, y: p.y };
  if (p.stuck > 10) { p.botGoal = freeSpot(r.map, p.r); p.wiggle = { a: rand(0, Math.PI * 2), until: t + .7 }; p.stuck = 0; }
  if (p.wiggle && t < p.wiggle.until) { tx = p.x + Math.cos(p.wiggle.a) * 100; ty = p.y + Math.sin(p.wiggle.a) * 100; }
  if (tx !== null) { const dx = tx - p.x, dy = ty - p.y; if (Math.abs(dx) > 8) k[dx > 0 ? 'right' : 'left'] = 1; if (Math.abs(dy) > 8) k[dy > 0 ? 'down' : 'up'] = 1; p.a = Math.atan2(dy, dx); k.sprint = flee && p.stamina > 20 ? 1 : 0; }
  p.keys = k;
  if (aimAt) { p.a = Math.atan2(aimAt.y - p.y, aimAt.x - p.x); useItem(r, p, Math.random() < .5); }
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
      if (!r.extract && r.roundEnd - t <= extractAt(r)) { const s = freeSpot(r.map, 90); r.extract = { x: s.x, y: s.y, r: 80 }; event(r, 'The extraction helicopter has landed! Find it (follow the arrow)!', 'big'); bcast(r, { t: 'sfx', kind: 'heli' }); }
      checkEnd(r);
    }
    for (const p of r.players.values()) {
      if (p.bot && !(ENV.TEST_ROLES === 'human-monster' && p.role === 'survivor')) botThink(r, p, t); // kill-cam screenshot hook: survivor bots stand still
      const k = p.keys || {}; let dx = (k.right ? 1 : 0) - (k.left ? 1 : 0), dy = (k.down ? 1 : 0) - (k.up ? 1 : 0);
      let len = Math.hypot(dx, dy); if (len) { dx /= len; dy /= len; }
      else if (!p.bot && p.mv) { const ml = Math.hypot(p.mv.x, p.mv.y); if (ml > .15) { const s = Math.min(1, ml) / ml; dx = p.mv.x * s; dy = p.mv.y * s; len = Math.min(1, ml); } } // analog joystick
      if (r.state === 'flight') continue;
      if (p.sleeping) { if (len || !p.alive || r.state !== 'playing') wake(p); else { p.hp = Math.min(p.maxHp, p.hp + 6 * dt); p.stamina = Math.min(100, p.stamina + 20 * dt); p.st.sleep = t + .5; len = 0; } }
      let sp;
      if (p.role === 'monster') {
        sp = MONSTERS[p.mt].speed * (p.st.dash > t ? 3 : 1) * (p.st.fast > t ? 1.8 : 1) * (p.st.stag > t ? .5 : 1);
        if (p.mt === 'drnowhere' && r.state === 'playing') { if (!p.formT) { p.form = 0; p.formT = t + DN_PERIOD; } else if (t > p.formT) { p.form = (p.form + 1) % DN_FORMS.length; p.formT = t + DN_PERIOD; bcast(r, { t: 'fx', kind: 'poof', x: p.x, y: p.y, c: '#111' }); send(p, { t: 'event', msg: `You shapeshift into ${DN_FORMS[p.form].name}: ${DN_FORMS[p.form].ability} — ${DN_FORMS[p.form].desc}`, kind: 'good' }); bcast(r, { t: 'sfx', kind: 'shift', x: p.x, y: p.y }); } }
        if (p.st.down > t) sp = 0; else if (p.hp <= 0) { p.hp = p.maxHp; p.st.guard = t + 2.5; } // gets back up with full health
      }
      else if (!p.alive || p.escaped || p.role === 'ghost') sp = 260;
      else {
        const canSprint = !(p.st.grey > t) && p.stamina > 1;
        const sprinting = k.sprint && len && canSprint;
        p.stamina = clamp(p.stamina + (sprinting ? (p.st.boost > t ? 0 : -32) : 14) * dt, 0, 100);
        sp = (sprinting ? 245 : 150) * (p.st.adren > t ? 1.3 : 1);
        if (p.st.slow > t) sp *= .5;
        if (p.st.stun > t || p.st.root > t) sp = 0;
      }
      if (r.state === 'lobby') sp = 200;
      if (len && sp) {
        if ((!p.alive || p.escaped || p.role === 'ghost') && r.state === 'playing') { p.x = clamp(p.x + dx * sp * dt, 20, r.map.w - 20); p.y = clamp(p.y + dy * sp * dt, 20, r.map.h - 20); }
        else moveEnt(r.map, p, dx * sp * dt, dy * sp * dt);
      }
      if (r.state === 'playing' && p.role === 'survivor' && p.alive && !p.escaped) {
        if (!p.bot && (p.fire || p.fireEdge)) useItem(r, p, p.fireEdge);
        p.fireEdge = false;
        for (let i = r.items.length - 1; i >= 0; i--) { const it = r.items[i]; if (Math.hypot(it.x - p.x, it.y - p.y) < 30 && !(it.np === p.id && t < it.npUntil) && pickup(r, p, it)) r.items.splice(i, 1); }
      }
    }
    if (r.state === 'lobby') { r.boarded = [...r.players.values()].filter(p => dist(p, LOBBY.heli) < LOBBY.heli.r).map(p => p.id); }
    if (r.state === 'playing') {
      const surv = [...r.players.values()].filter(p => p.role === 'survivor' && p.alive && !p.escaped);
      for (const m of r.players.values()) if (m.role === 'monster') {
        if (m.st.down > t || t < m.hitUntil) continue;
        const reach = (m.r + 16 + 8) * (m.st.reach > t ? 3 : 1);
        const s = surv.find(s => s.alive && dist(s, m) < reach);
        if (s) { m.hitUntil = t + .85; hurtSurvivor(r, s, MON_DMG, m); }
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
        if (!meGhost && me.role === 'monster' && p.role === 'survivor' && hidden(r, p) && dist(p, me) > 90 && !(p.st.reveal > t) && !(me.st.sight > t)) continue;
      }
      const st = {}; for (const k in p.st) if (p.st[k] > t) st[k] = 1;
      if (me.role === 'monster' && me.st.sight > t && p.role === 'survivor') st.reveal = 1;
      const q = { id: p.id, n: p.name, c: p.color, x: Math.round(p.x), y: Math.round(p.y), a: +p.a.toFixed(2), role: p.role, mt: p.mt, al: p.alive, es: p.escaped, h: r.host === p.id, b: p.bot, st, sc: p.score, lk: lookStr(p.look), sk: p.role === 'monster' ? p.skin : undefined, fm: p.mt === 'drnowhere' && p.role === 'monster' ? (p.form || 0) : undefined, pf: r.state === 'lobby' ? p.pref : undefined };
      if (r.state === 'playing') { q.hp = Math.round(p.hp / p.maxHp * 100); if (p.role === 'survivor') { const s = p.inv[p.sel]; q.w = s ? s.k : null; q.ar = (p.vest > 0 ? 1 : 0) | (p.helmet > 0 ? 2 : 0); } }
      ps.push(q);
    }
    const o = { t: 's', state: r.state, ps, ex: r.extract, max: r.max, boarded: r.boarded || [],
      tl: r.state === 'playing' ? Math.max(0, Math.ceil(r.roundEnd - t)) : r.state === 'flight' ? Math.ceil(r.flightEnd - t) : r.state === 'results' ? Math.ceil(r.resultsEnd - t) : 0,
      me: { fm: me.form || 0, fmT: me.formT ? Math.max(0, Math.ceil(me.formT - t)) : 0, stamina: Math.round(me.stamina), cd: Math.max(0, +(me.cdUntil - t).toFixed(1)), hp: Math.ceil(me.hp), mhp: me.maxHp, inv: me.inv.map(s => s ? [s.k, s.n] : 0), sel: me.sel, ammo: me.ammo, vest: Math.round(me.vest), helmet: Math.round(me.helmet) }, rl: r.roundLen };
    if (r.state === 'playing') { o.lo = [...r.opened]; o.it = r.items.filter(i => Math.abs(i.x - me.x) < 1100 && Math.abs(i.y - me.y) < 1100).map(i => [i.id, Math.round(i.x), Math.round(i.y), i.k]); }
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
          const nr = { code: code(), name: clean(m.name, 24) || 'Night Hunt Server', max, isPublic: !!m.isPublic, players: new Map(), state: 'lobby', map: LOBBY, traps: [], items: [], opened: new Set(), itemId: 1, roundLen: ROUND_LENS.includes(+m.roundLen) ? +m.roundLen : DEFAULT_LEN };
          rooms.set(nr.code, nr); p = makePlayer(clean(m.player, 16) || 'Player', ws); nr.host = p.id; addToRoom(nr, p); break; }
        case 'join': {
          if (r) return;
          const jr = rooms.get(String(m.code || '').toUpperCase().trim());
          if (!jr) return send({ ws }, { t: 'error', msg: 'No server with that code.' });
          if (jr.players.size >= jr.max) return send({ ws }, { t: 'error', msg: `Server is full (${jr.players.size}/${jr.max}).` });
          p = makePlayer(clean(m.player, 16) || 'Player', ws); addToRoom(jr, p); break; }
        case 'input': if (p) { const k = m.k || {}; p.keys = { up: !!k.up, down: !!k.down, left: !!k.left, right: !!k.right, sprint: !!k.sprint }; if (typeof m.a === 'number' && isFinite(m.a)) p.a = m.a;
          if (m.f && !p.fire) p.fireEdge = true; p.fire = !!m.f;
          p.mv = Array.isArray(m.mv) && m.mv.length === 2 && m.mv.every(v => typeof v === 'number' && isFinite(v)) ? { x: Math.max(-1, Math.min(1, m.mv[0])), y: Math.max(-1, Math.min(1, m.mv[1])) } : null; } break;
        case 'ability': if (r) useAbility(r, p); break;
        case 'open': if (r) { if (p.sleeping) { wake(p); send(p, { t: 'event', msg: 'You woke up.' }); } else if (!openLoot(r, p)) toggleSleep(r, p); } break;
        case 'sel': if (p && Number.isInteger(m.i) && m.i >= 0 && m.i < SLOTS) p.sel = m.i; break;
        case 'drop': if (r) dropSel(r, p); break;
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
          if (ROUND_LENS.includes(+m.roundLen)) r.roundLen = +m.roundLen;
          bcast(r, { t: 'settings', max: r.max, isPublic: r.isPublic, roundLen: r.roundLen });
        } break;
        case 'profile': if (p) { p.look = cleanLook(m.look); p.pref = MKEYS.includes(m.pref) ? m.pref : null; p.skin = MSKINS.includes(m.skin) ? m.skin : 'classic'; if (r) bcast(r, { t: 'event', msg: p.pref ? `${p.name} wants to play ${MONSTERS[p.pref].name}` : `${p.name} updated their look`, kind: '' }); } break;
        case 'leave': if (p) { removeFromRoom(p); p = null; } break;
      }
    },
    close() { if (p) removeFromRoom(p); p = null; }
  };
}
const api = { DN_FORMS, useAbility, handleConnection, step, rooms, MONSTERS, ITEMS, TICK, MAX_CAP, roomInfo, ROUND_LENS, HATS, ACCS, MSKINS };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.NightHuntCore = api;
})(typeof self !== 'undefined' ? self : this);
