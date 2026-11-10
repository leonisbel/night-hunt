// Night Hunt game core: runs in Node (server.js) or in a host's browser (P2P mode).
(function (root) {
const MAX_CAP = 15, MIN_START = 2, TICK = 1000 / 30, SEND_EVERY = 2; // 30Hz sim, 15Hz net
const ROUND_ENV = +(typeof process !== 'undefined' && process.env && process.env.ROUND_TIME) || 0, RESULTS_TIME = 14, FLIGHT_TIME = 4;
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
  { k: 'conezone', name: 'Cone Zone', ability: 'Skitter Dash', desc: 'Drop low on your spider legs and skitter across the floor at triple speed for 2.5s' },
  { k: 'nightmare', name: 'Nightmare Man', ability: 'Shadow Step', desc: 'Melt into shadow and reappear far ahead of you' },
  { k: 'sixarm', name: 'The Doctor (six arms)', ability: 'Paranoia', desc: 'Survivors near you hallucinate (screen distortion) for 8s and you see them for 6s' },
  { k: 'guilt', name: 'Guilt', ability: 'Guilty Stare', desc: 'Every survivor nearby who is looking at you is frozen with guilt: slowed for 5s' },
];
// Wendigo: every 30s its bones crack and it shifts between a hunched deer-skull beast and an emaciated human; each form has its own power
const WG_FORMS = [
  { k: 'deer', name: 'Wendigo (deer skull)', ability: 'Antler Charge', desc: 'Lower your antlers and charge: survivors in front of you are hit, knocked back and stunned' },
  { k: 'human', name: 'Wendigo (human)', ability: 'Mimic Lure & Leap', desc: 'Call out in a friend\'s voice to lure nearby survivors (they are revealed), then leap at the closest one' },
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
  drnowhere:  { name: 'Doctor Nowhere', ability: 'Shapeshift',        desc: 'Changes form every 30s with a glitch — Doctor: injection · Cone Zone: skitter dash · Nightmare Man: shadow step · six-armed Doctor: paranoia · Guilt: guilty stare', forms: DN_FORMS, cd: 20, speed: 170, r: 19 },
  locust:     { name: 'The Locust',     ability: 'Swarm Omen',        desc: 'Pick one random survivor: you appear nearby and a locust smashes into their screen', cd: 20, speed: 172, r: 20 },
  boisvert:   { name: 'Boisvert',       ability: 'Dead Channel',      desc: 'Every survivor\'s screen fills with roaring TV static for 10s', cd: 20, speed: 172, r: 20 },
  sonicexe:   { name: 'Sonic.exe',      ability: "You Can't Run",     desc: 'A distorted laugh… then you run much faster for 10s', cd: 20, speed: 174, r: 18 },
  demogorgon: { name: 'Demogorgon',     ability: 'Upside Down Portal',desc: 'Open a portal and come out near the closest survivor', cd: 20, speed: 174, r: 21 },
  // ---- phase 2: sea monsters (they hide under the water; survivors only see their telltale signs) ----
  megalodon:  { name: 'Megalodon',      ability: 'Tidal Surge',       desc: 'A giant wave bursts out around you: survivors are knocked back, stunned and thrown out of their boats. On land you walk as a huge humanoid shark', cd: 20, speed: 182, r: 34, hp: 420, sea: 1, home: ['Stormy Ocean'] },
  kraken:     { name: 'Kraken',         ability: 'Tentacle Grab',     desc: 'A tentacle shoots out and drags the closest survivor (even out of a boat) to you', cd: 20, speed: 172, r: 30, hp: 380, sea: 1, home: ['Stormy Ocean'] },
  cthulhu:    { name: 'Cthulhu',        ability: 'Thunderstorm',      desc: 'Summon a thunderstorm: lightning strikes the 3 closest survivors 1s later', cd: 20, speed: 170, r: 30, hp: 400, sea: 1, home: ['Stormy Ocean'] },
  leviathan:  { name: 'Leviathan',      ability: 'Whirlpool',         desc: 'Coil into a whirlpool for 4s that pulls in and slows every survivor nearby', cd: 20, speed: 178, r: 30, hp: 380, sea: 1, home: ['Stormy Ocean'] },
  mosasaurus: { name: 'Mosasaurus',     ability: 'Tail Slam',         desc: 'Slam your tail: a crashing wave stuns, hurts and capsizes survivors close by', cd: 20, speed: 184, r: 28, hp: 360, sea: 1, home: ['Stormy Ocean'] },
  nessie:     { name: 'Nessie',         ability: 'Deep Dive',         desc: 'Dive deep: invisible and faster for 6s while a thick sea fog rolls over survivors near you', cd: 20, speed: 176, r: 26, hp: 340, sea: 1, home: ['Stormy Ocean'] },
  spinosaurus:{ name: 'Spinosaurus',    ability: 'Swamp Ambush',      desc: 'Sink into the water (invisible 4s) and burst out in a fast charge', cd: 20, speed: 176, r: 28, hp: 380, sea: 1, home: ['Rainforest Swamp', 'Stormy Ocean'] },
  // ---- phase 2: land monsters with their own maps ----
  trex:       { name: 'T-Rex',          ability: 'Tyrant Roar',       desc: 'A huge roar stuns survivors close by, reveals everyone within range for 6s and you charge faster', cd: 20, speed: 176, r: 30, hp: 420, home: ['Rainforest Swamp'] },
  quetzalcoatlus: { name: 'Quetzalcoatlus', ability: 'Sky Dive',      desc: 'Take off over everything and dive onto the closest survivor, stunning them', cd: 20, speed: 172, r: 24, home: ['Rainforest Swamp', 'Snowy Mountain'] },
  yeti:       { name: 'Yeti',           ability: 'Avalanche Roar',    desc: 'A freezing roar: nearby survivors are stunned, slowed for 5s and caught in a whiteout', cd: 20, speed: 172, r: 26, hp: 360, home: ['Snowy Mountain'] },
  dragon:     { name: 'Dragon',         ability: 'Fire Breath',       desc: 'Breathe a cone of fire: survivors in front of you take damage and keep burning', cd: 20, speed: 172, r: 30, hp: 420, home: ['Vampire Castle', 'Snowy Mountain'] },
  chupacabra: { name: 'Chupacabra',     ability: 'Blood Drain',       desc: 'Bite the closest survivor: drain their health to heal yourself and slow them', cd: 20, speed: 182, r: 18, home: ['Haunted Farm'] },
  vampire:    { name: 'Vampire',        ability: 'Bat Swarm',         desc: 'Burst into bats and re-form beside the closest survivor, blinding them for 3s', cd: 20, speed: 174, r: 18, home: ['Vampire Castle'] },
  gargoyle:   { name: 'Gargoyle',       ability: 'Stone Skin',        desc: 'Turn to stone for 6s (no damage) and crash down, stunning survivors close by', cd: 20, speed: 170, r: 22, home: ['Vampire Castle'] },
  bigfoot:    { name: 'Bigfoot',        ability: 'Boulder Throw',     desc: 'Hurl a boulder at the survivor in front of you: big hit + 2s stun', cd: 20, speed: 176, r: 24, hp: 360, home: ['Powerline Forest', 'Foggy Woods'] },
  wendigo:    { name: 'Wendigo',        ability: 'Bone Shift',        desc: 'Changes form every 30s with a bone crack — deer skull: antler charge · human: mimic voice lure & leap', forms: WG_FORMS, cd: 20, speed: 178, r: 22, hp: 360, home: ['Powerline Forest', 'Foggy Woods', 'Snowy Mountain'] },
  fester:     { name: 'Father Fester',  ability: 'Lights Out',        desc: 'Every house light dies near you: survivors black out and are revealed. Passive: each new survivor who sees you makes you stronger (6 stages)', cd: 20, speed: 166, r: 20, home: ['Fester Street'] },
};
const CLASSIC = ['Powerline Forest', 'Abandoned Pizzeria Town', 'Foggy Woods', 'Static Fields'];
for (const k in MONSTERS) if (!MONSTERS[k].home) MONSTERS[k].home = CLASSIC;
const FESTER_MAX = 6;
const MKEYS = Object.keys(MONSTERS);
// cosmetics (bought with in-game coins in the lobby shop; no real money)
const HATS = ['none', 'cap', 'beanie', 'cowboy', 'headphones', 'crown', 'hardhat', 'bunny', 'tophat', 'pirate', 'horns', 'halo', 'viking', 'witch'], ACCS = ['none', 'glasses', 'scarf', 'mask', 'goggles', 'backpack', 'cape', 'chain', 'bandana', 'wings'];
const OUTFITS = ['none', 'ranger', 'hazmat', 'hunter', 'scout', 'diver', 'ninja', 'astronaut', 'knight', 'pajamas', 'ghostbuster'];
const SUPPLIES = ['water', 'soda', 'energy', 'chips', 'choco', 'beans', 'medkit', 'knife', 'bat', 'crowbar', 'axe', 'pistol', 'shotgun', 'ammo_light', 'ammo_shells', 'vest', 'helmet'], KIT_MAX = 3; // v1.4.1: weapon / armor / food shops
const PETS = ['none', 'puppy', 'kitty', 'bat', 'ghost', 'dragon', 'slime', 'owl', 'pumpkin'], TRAILS = ['none', 'fire', 'ice', 'toxic', 'rainbow', 'shadow', 'stars', 'blood'];
const EMOTES = ['wave', 'groove', 'spin', 'jacks', 'flex', 'pendulum', 'robot', 'bow', 'cheer', 'shuffle', 'zombie', 'scream']; // 'wave' is free
const EMOTE_ALIAS = { floss: 'pendulum', dance: 'groove', jump: 'jacks' };
const EMOTE_LEN = { wave: 2.6, groove: 4.2, spin: 3.2, jacks: 3.4, flex: 3, pendulum: 4, robot: 4, bow: 2.8, cheer: 2.8, shuffle: 4.4, zombie: 4, scream: 2.2 };
const GEAR = {
  speed: { name: 'Speed Coil', dur: 8, cd: 20, mult: 1.58 },
  grav: { name: 'Gravity Coil', dur: 6, cd: 20, mult: 1.22 },
  invis: { name: 'Invisibility', dur: 5, cd: 20 },
};
const GEAR_KEYS = Object.keys(GEAR);
const MSKINS = ['classic', 'shadow', 'golden', 'toxic', 'frost', 'blood', 'lava', 'neon', 'ghost', 'zombie', 'abyss'];
const HEX = /^#[0-9a-f]{6}$/i;
function cleanLook(l) { l = l || {}; const n = (v, m) => Math.max(0, Math.min(m, parseInt(v) || 0)); return { sk: n(l.sk, 5), hc: n(l.hc, 5), hs: n(l.hs, 3), top: HEX.test(l.top) ? l.top : null, pants: HEX.test(l.pants) ? l.pants : null, hat: HATS.includes(l.hat) ? l.hat : 'none', acc: ACCS.includes(l.acc) ? l.acc : 'none', of: OUTFITS.includes(l.of) ? l.of : 'none', pet: PETS.includes(l.pet) ? l.pet : 'none', tr: TRAILS.includes(l.tr) ? l.tr : 'none' }; }
const lookStr = l => [l.sk, l.hc, l.hs, l.top || '', l.pants || '', l.hat, l.acc, l.of || 'none', l.pet || 'none', l.tr || 'none'].join(',');
function botLook() { const r = a => a[Math.floor(Math.random() * a.length)]; return { sk: Math.floor(Math.random() * 6), hc: Math.floor(Math.random() * 6), hs: Math.floor(Math.random() * 4), top: null, pants: r(['#2c3e60', '#3a3a3a', '#4a4030', '#25303f']), hat: r(['none', 'none', 'cap', 'beanie', 'hardhat']), acc: r(['none', 'none', 'glasses', 'scarf']), of: r(['none', 'none', 'none', 'ranger', 'hunter', 'scout']) }; }
const COLORS = ['#e74c3c','#3498db','#2ecc71','#f1c40f','#9b59b6','#1abc9c','#e67e22','#ecf0f1','#fd79a8','#00cec9','#a29bfe','#55efc4','#fab1a0','#74b9ff','#ffeaa7'];
const THEMES = [...CLASSIC, 'Stormy Ocean', 'Rainforest Swamp', 'Snowy Mountain', 'Haunted Farm', 'Vampire Castle', 'Fester Street'];
const ENV = (typeof process !== 'undefined' && process.env) || {};
// the power-line forest is still the most common map; a monster player's chosen monster pulls the round to that monster's home map
const pickTheme = pref => THEMES.includes(ENV.THEME) ? ENV.THEME : pref && MONSTERS[pref] ? pick(MONSTERS[pref].home) : Math.random() < .3 ? THEMES[0] : pick(THEMES.slice(1));

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
// v1.7: a city block and one decorated mall. The nine shops are stalls inside the mall. The coin kiosk is outside, on its own.
const STORES = [
  { k: 'skinshop', name: 'SKIN SHOP', sub: 'SURVIVOR SKINS', c: '#ff9af0', ic: '🧍' },
  { k: 'weapons', name: 'WEAPON SHOP', sub: 'MELEE • GUNS • COILS', c: '#ff5a3a', ic: '🔫' },
  { k: 'armor', name: 'ARMOR SHOP', sub: 'VESTS • HELMETS', c: '#7ab8ff', ic: '🛡️' },
  { k: 'food', name: 'FOOD & DRINKS', sub: 'SNACKS • DRINKS • MEDKITS', c: '#8aff6a', ic: '🍔' },
  { k: 'monskins', name: 'MONSTER SKINS', sub: 'SKINS • PICK YOUR MONSTER', c: '#ff3a3a', ic: '👹' },
  { k: 'emotes', name: 'EMOTES & DANCES', sub: 'DANCE FLOOR', c: '#ffd23a', ic: '💃' },
  { k: 'pets', name: 'PETS & TRAILS', sub: 'FOLLOWERS • TRAILS', c: '#5affd8', ic: '🐾' },
  { k: 'clothing', name: 'DRESSING ROOM', sub: 'CLOTHING • HATS • MIRROR', c: '#9ad8ff', ic: '🪞' },
  { k: 'crate', name: 'MYSTERY CRATES', sub: 'WIN A RANDOM ITEM', c: '#c08aff', ic: '🎁' },
];
const LOBBY = { w: 4600, h: 2800, walls: [], trees: [], bushes: [], vents: [], poles: [], lines: [], loot: [], bld: [], props: [], theme: 'Helipad Lobby',
  heli: { x: 780, y: 1460, r: 150, board: 88 }, spawn: { x: 1100, y: 1500 }, zones: [], stores: STORES, roads: [] };
{ const L = LOBBY, T = 28;
  L.walls = [{ x: 0, y: 0, w: L.w, h: T }, { x: 0, y: L.h - T, w: L.w, h: T }, { x: 0, y: 0, w: T, h: L.h }, { x: L.w - T, y: 0, w: T, h: L.h }];
  L.roads = [{ x: 80, y: 1280, w: 2100, h: 400 }, { x: 2140, y: 1400, w: 80, h: 240 }];
  const block = (x, y, w, h, floors) => {
    const ht = 8 + floors * 3.1;
    L.walls.push({ x, y, w, h: T, city: ht, light: floors % 2 ? '#ffcf7a' : '#9fd0ff' }, { x, y: y + h - T, w, h: T, city: ht, light: '#ffb35a' },
      { x, y, w: T, h, city: ht, light: '#ffe9b0' }, { x: x + w - T, y, w: T, h, city: ht, light: floors % 3 ? '#ffcf7a' : '#7ab8ff' });
  };
  for (let i = 0; i < 5; i++) { const x = 140 + i * 390; block(x, 160, 300, 1000, 2 + (i % 4)); block(x, 1760, 300, 820, 1 + ((i + 2) % 4)); }
  // mall shell. Door faces the avenue (west side, y 1400–1640).
  const X = 2220, Y = 360, W = 2200, H = 2100, door0 = 1400, door1 = 1640;
  L.bld.push({ x: X, y: Y, w: W, h: H, type: 'store', kind: 'mall', floors: 1, light: 'warm', store: 'mall', name: 'NIGHT MALL', c: '#ffd27a', nolight: true });
  L.walls.push({ x: X, y: Y, w: W, h: T, mh: 8 }, { x: X, y: Y + H - T, w: W, h: T, mh: 8 }, { x: X + W - T, y: Y, w: T, h: H, mh: 8 },
    { x: X, y: Y, w: T, h: door0 - Y, mh: 8 }, { x: X, y: door1, w: T, h: Y + H - door1, mh: 8 });
  const P = (k, x, y, w, h, extra = {}) => L.props.push(Object.assign({ k, x: Math.round(x), y: Math.round(y), w, h, solid: extra.solid !== false }, extra));
  const north = STORES.slice(0, 5), south = STORES.slice(5);
  north.forEach((st, i) => {
    const sx = X + 80 + i * 420, counterY = Y + H - 220;
    P('counter', sx, counterY, 240, 36);
    P('register', sx + 100, counterY + 4, 28, 24, { solid: false });
    P('storesign', sx + 20, Y + H - 70, 200, 16, { solid: false, t: st.name, s: st.sub, c: st.c, a: Math.PI });
    L.zones.push({ k: st.k, name: st.name, x: sx - 10, y: counterY - 200, w: 280, h: 180, c: st.c, ic: st.ic });
    if (st.k === 'skinshop') { P('mannequin', sx, counterY - 70, 40, 40, { solid: false }); P('mannequin', sx + 190, counterY - 70, 40, 40, { solid: false }); }
    if (st.k === 'weapons') P('display', sx + 40, counterY - 80, 160, 36, { items: ['knife', 'bat', 'axe', 'pistol'] });
    if (st.k === 'armor') P('display', sx + 50, counterY - 80, 140, 36, { items: ['vest', 'helmet'] });
    if (st.k === 'food') { P('fridge', sx, counterY - 70, 40, 36, { solid: false }); P('display', sx + 70, counterY - 80, 140, 36, { items: ['soda', 'chips', 'medkit'] }); }
    if (st.k === 'monskins') ['freddy', 'trex', 'dragon'].forEach((m, q) => P('pedestal', sx + q * 70, counterY - 80, 42, 42, { m, solid: false }));
  });
  south.forEach((st, i) => {
    const sx = X + 140 + i * 500, counterY = Y + 90;
    P('counter', sx, counterY, 240, 36);
    P('register', sx + 100, counterY + 4, 28, 24, { solid: false });
    P('storesign', sx + 20, Y + 40, 200, 16, { solid: false, t: st.name, s: st.sub, c: st.c, a: 0 });
    L.zones.push({ k: st.k, name: st.name, x: sx - 10, y: counterY + 50, w: 280, h: 180, c: st.c, ic: st.ic });
    if (st.k === 'emotes') P('dancefloor', sx + 10, counterY + 80, 220, 110, { solid: false });
    if (st.k === 'pets') ['puppy', 'kitty', 'dragon'].forEach((pet, q) => P('petbed', sx + q * 70, counterY + 70, 42, 36, { pet, solid: false }));
    if (st.k === 'clothing') { P('rack', sx, counterY + 70, 90, 28, { solid: false }); P('mirror', sx + 150, counterY + 60, 50, 16, { solid: false, a: Math.PI }); }
    if (st.k === 'crate') { P('crate', sx, counterY + 70, 40, 40, { solid: false }); P('crate', sx + 160, counterY + 70, 40, 40, { solid: false }); }
  });
  // coin kiosk sits on the avenue, outside the mall door. It is not a paid shop.
  P('kiosk', 1960, 1560, 70, 50);
  P('storesign', 1880, 1640, 200, 16, { solid: false, t: 'COIN STORE', s: 'FREE REWARD · NO PAYMENTS', c: '#ffd76b', a: 0 });
  L.zones.push({ k: 'coins', name: 'COIN STORE', x: 1860, y: 1400, w: 280, h: 150, c: '#ffd76b', ic: '🪙' });
  for (let x = 220; x < 2000; x += 280) { P('streetlight', x, 1248, 16, 16); P('streetlight', x + 120, 1688, 16, 16, { a: Math.PI }); }
  for (let i = 0; i < 4; i++) P('car', 260 + i * 420, i % 2 ? 1210 : 1748, 70, 32, { a: i % 2 ? 0 : Math.PI, solid: false });
  [[400, 1500], [700, 1500], [1500, 1500], [2600, 1400], [3400, 1600], [4000, 1400]].forEach(([x, y]) => L.bushes.push({ x, y, r: 14 }));
  L.props.push({ k: 'lobbysign', x: 1280, y: 1200, w: 30, h: 30, a: 0, solid: false });
  // eight drivable cars: along both curbs, and one just inside the mall door
  L.vehicles = [
    { id: 1, x: 360, y: 1348, a: 0, kind: 'pickup' }, { id: 2, x: 980, y: 1336, a: 0.1, kind: 'sedan' },
    { id: 3, x: 1540, y: 1355, a: 0, kind: 'suv' }, { id: 4, x: 2060, y: 1368, a: 0.15, kind: 'pickup' },
    { id: 5, x: 430, y: 1632, a: Math.PI, kind: 'sedan' }, { id: 6, x: 1180, y: 1644, a: Math.PI, kind: 'suv' },
    { id: 7, x: 1720, y: 1628, a: Math.PI, kind: 'pickup' }, { id: 8, x: 2480, y: 1520, a: 1.57, kind: 'sedan' },
  ]; }
// every building is a furnished house (rooms split by an inner wall) or a facility (warehouse/lab/industrial)
function furnish(m, b) {
  const { x, y, w, h, t, type } = b; m.bld.push({ x, y, w, h, type, kind: b.kind || (type === 'house' ? pick(['cabin', 'farmhouse', 'bungalow']) : pick(['warehouse', 'lab', 'substation'])), floors: b.floors || 1, light: b.light });
  const P = (k, px, py, pw, ph, solid = true, a = 0) => m.props.push({ k, x: Math.round(px), y: Math.round(py), w: Math.round(pw), h: Math.round(ph), solid, a });
  const ix = x + t, iy = y + t, iw = w - 2 * t, ih = h - 2 * t;
  if (type === 'house') {
    // inner wall splitting living room / bedroom with a doorway
    const sx = x + w / 2 + 60, door = 70, dy = iy + ih * .5 - door / 2;
    m.walls.push({ x: sx, y: iy, w: 14, h: dy - iy }, { x: sx, y: dy + door, w: 14, h: iy + ih - dy - door });
    P('sofa', ix + 12, iy + ih - 50, 110, 38); P('table', ix + 50, iy + ih * .45 - 25, 60, 50); P('tv', ix + 12, iy + 8, 70, 18); P('rug', ix + 30, iy + ih * .3, 110, 80, false);
    const bwid = ix + iw - sx - 14; P('bed', sx + 14 + (bwid - 60) / 2, iy + 8, 60, 104); P('wardrobe', sx + 14 + (bwid - 50) / 2, iy + ih - 30, 50, 24); P('lamp', ix + iw - 22, iy + 120, 16, 16, false);
    P('fridge', sx - 40, iy + ih - 36, 32, 30); P('shelf', ix + 8, iy + 30, 24, 60); P('chair', ix + 120, iy + ih * .45 - 20, 26, 26, false);
    if (b.floors === 2) P('stairs', sx - 70, iy + 6, 56, 90, false);
  } else {
    const k = m.bld[m.bld.length - 1].kind;
    if (k === 'warehouse') { const rows = Math.max(1, Math.floor((ih - 80) / 90)); for (let r = 0; r < rows; r++) P('rack', ix + 40, iy + 50 + r * 90, iw * .55, 26); P('pallet', ix + iw - 80, iy + 20, 60, 50); P('barrel', ix + iw - 50, iy + ih - 50, 30, 30); P('forklift', ix + iw - 110, iy + ih * .5, 60, 34); }
    else if (k === 'lab') { P('labbench', ix + 30, iy + 30, iw * .45, 34); P('labbench', ix + 30, iy + ih - 64, iw * .45, 34); P('server', ix + iw - 44, iy + 20, 30, 70); P('tank', ix + iw - 70, iy + ih - 80, 50, 50); P('desk', ix + iw * .55, iy + ih * .4, 60, 36); }
    else if (k === 'barn') { P('hay', ix + 30, iy + 30, 70, 50); P('hay', ix + 30, iy + 90, 70, 50); P('hay', ix + iw - 100, iy + ih - 70, 70, 50); P('tractor', ix + iw * .45, iy + ih * .35, 90, 56); P('barrel', ix + iw - 50, iy + 30, 30, 30); }
    else { P('generator', ix + 30, iy + 30, 90, 60); P('transformer', ix + iw - 100, iy + 30, 70, 70); P('panel', ix + 30, iy + ih - 40, 120, 22); P('barrel', ix + iw - 60, iy + ih - 60, 30, 30); P('cable', ix + iw * .3, iy + ih * .5, 60, 60, false); }
  }
}
// a building = 4 walls with two doorways (top + left), furnished inside
function addBuilding(m, x, y, bw, bh, type, extra = {}) {
  const t = 24, d = 80, dx = x + bw / 2 - d / 2, dy = y + bh / 2 - d / 2;
  m.walls.push({ x, y, w: dx - x, h: t }, { x: dx + d, y, w: x + bw - dx - d, h: t });          // top w/ door
  m.walls.push({ x, y: y + bh - t, w: bw, h: t });                                          // bottom
  m.walls.push({ x, y, w: t, h: dy - y }, { x, y: dy + d, w: t, h: y + bh - dy - d });          // left w/ door
  m.walls.push({ x: x + bw - t, y, w: t, h: bh });                                          // right
  furnish(m, { x, y, w: bw, h: bh, t, type, ...extra });
  return { x, y, w: bw, h: bh, type };
}
// water: the whole ocean outside the islands, plus swamp pools
function onIsland(m, x, y, pad = 0) { return m.islands.some(i => Math.hypot(i.x - x, i.y - y) < i.r - pad); }
function inWater(m, x, y) { if (m.islands) return !onIsland(m, x, y); return !!(m.pools && m.pools.some(o => Math.hypot(o.x - x, o.y - y) < o.r)); }
const WINDOW_LIGHTS = ['#ffcf7a', '#ffe9b0', '#9fd0ff', '#ff5a3a', '#7aff9a', 'flicker', 'off', '#ffb35a'];
function genMap(theme = pickTheme()) {
  const ocean = theme === 'Stormy Ocean', W = +ENV.MAP_SIZE || (ocean ? 7200 : 5400), H = W, SC = W / (ocean ? 3600 : 2600), A = SC * SC, N = n => Math.round(n * A), m = { w: W, h: H, theme, walls: [], trees: [], bushes: [], vents: [], poles: [], lines: [], loot: [], bld: [], props: [] };
  const B = 40; m.walls.push({ x: 0, y: 0, w: W, h: B }, { x: 0, y: H - B, w: W, h: B }, { x: 0, y: 0, w: B, h: H }, { x: W - B, y: 0, w: B, h: H });
  const forest = theme === 'Powerline Forest', C = { x: W / 2, y: H / 2 };
  if (forest) { // two high-voltage lines cut straight corridors through the forest
    const line = (x0, y0, x1, y1) => { const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / 430)), pts = []; for (let i = 0; i <= n; i++) pts.push({ x: x0 + (x1 - x0) * i / n, y: y0 + (y1 - y0) * i / n }); m.lines.push(pts); };
    line(140, rand(350, 900) * SC, W - 140, rand(1700, 2250) * SC); line(rand(450, 950) * SC, 140, rand(1650, 2150) * SC, H - 140); if (SC > 1.5) line(140, rand(1900, 2300) * SC, W - 140, rand(300, 700) * SC);
    for (const l of m.lines) for (let i = 0; i < l.length; i++) { const a = l[Math.max(0, i - 1)], b = l[Math.min(l.length - 1, i + 1)]; m.poles.push({ x: l[i].x, y: l[i].y, r: 30, a: Math.atan2(b.y - a.y, b.x - a.x) }); }
  }
  if (ocean) { // a ring of islands inside the calm zone; beyond m.safe the storm rages
    m.safe = 1450 * SC; m.islands = [{ x: C.x, y: C.y, r: 560 }];
    for (let k = 0; m.islands.length < 1 + N(7) && k < 6000; k++) { const a = rand(0, 6.283), d = rand(820, 1320 * SC), r = rand(190, 330) * (Math.random() < .3 ? 1.6 : 1), x = C.x + Math.cos(a) * d, y = C.y + Math.sin(a) * d; if (!m.islands.some(i => Math.hypot(i.x - x, i.y - y) < i.r + r + 160)) m.islands.push({ x, y, r }); }
  }
  if (theme === 'Rainforest Swamp') { m.pools = []; for (let k = 0; m.pools.length < N(10) && k < 6000; k++) { const r = rand(110, 240), x = rand(200, W - 200), y = rand(200, H - 200); if (Math.hypot(x - C.x, y - C.y) > 330 + r && !m.pools.some(o => Math.hypot(o.x - x, o.y - y) < o.r + r + 60)) m.pools.push({ x, y, r }); } }
  const segD = (x, y, a, b) => { const dx = b.x - a.x, dy = b.y - a.y, k = clamp(((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy), 0, 1); return Math.hypot(x - a.x - dx * k, y - a.y - dy * k); };
  const nearLine = (x, y, d) => m.lines.some(l => l.some((p, i) => i && segD(x, y, l[i - 1], p) < d));
  const free = (x, y, r) => !m.props.some(o => x + r > o.x && x - r < o.x + o.w && y + r > o.y && y - r < o.y + o.h) && x > 80 + r && y > 80 + r && x < W - 80 - r && y < H - 80 - r && Math.hypot(x - W / 2, y - H / 2) > 200 &&
    !m.walls.some(w => x + r > w.x && x - r < w.x + w.w && y + r > w.y && y - r < w.y + w.h) && !m.trees.some(t => Math.hypot(t.x - x, t.y - y) < t.r + r) && !m.poles.some(t => Math.hypot(t.x - x, t.y - y) < t.r + r + 20) &&
    (!m.islands || onIsland(m, x, y, r + 20)) && !(m.pools && m.pools.some(o => Math.hypot(o.x - x, o.y - y) < o.r + r));
  const rooms = [];
  const tryBuild = (n, typeFn, sizeFn, extraFn, area) => { for (let i = 0, k = 0; i < n && k < 600; k++) {
    const type = typeFn(rooms.length), [bw, bh] = sizeFn(type), c = area ? area() : { x: rand(100 + bw / 2, W - 100 - bw / 2), y: rand(100 + bh / 2, H - 100 - bh / 2) }, x = c.x - bw / 2, y = c.y - bh / 2;
    if (!free(x + bw / 2, y + bh / 2, Math.max(bw, bh) / 2 + 90) || (m.islands && !onIsland(m, x, y, 30) | !onIsland(m, x + bw, y + bh, 30) | !onIsland(m, x + bw, y, 30) | !onIsland(m, x, y + bh, 30))) continue;
    rooms.push(addBuilding(m, x, y, bw, bh, type, extraFn ? extraFn(type) : {})); i++; } };
  const stdSize = type => type === 'house' ? [rand(340, 440), rand(280, 380)] : [rand(260, 440), rand(240, 380)];
  let nT = forest ? 330 : theme === 'Foggy Woods' ? 140 : theme === 'Static Fields' ? 30 : 45, nBush = 28, treeR = [18, 38];
  if (CLASSIC.includes(theme)) {
    const nB = theme === 'Abandoned Pizzeria Town' ? 16 : theme === 'Static Fields' ? 7 : forest ? 5 : 3;
    tryBuild(N(nB), n => forest ? (n % 5 < 3 ? 'house' : 'facility') : theme === 'Abandoned Pizzeria Town' ? (n < 2 || Math.random() < .6 ? 'house' : 'facility') : (n < 2 || Math.random() < .5 ? 'house' : 'facility'), stdSize);
  } else if (ocean) {
    const big = m.islands.filter(i => i.r > 270), isl = () => { const i = rooms.length < 2 ? m.islands[0] : pick(big), a = rand(0, 6.283), d = rand(0, Math.max(0, i.r - 260)); return { x: i.x + Math.cos(a) * d, y: i.y + Math.sin(a) * d }; };
    tryBuild(N(6), n => n % 3 < 2 ? 'house' : 'facility', t => t === 'house' ? [rand(320, 380), rand(260, 320)] : [rand(240, 300), rand(220, 280)], t => ({ kind: t === 'house' ? 'shack' : 'warehouse' }), isl);
    nT = 90; nBush = 30; treeR = [16, 26];
    // sea stacks (rocks in the open water) + boats docked at the shores + 2 big ships
    for (let i = 0, k = 0; i < N(26) && k < 6000; k++) { const x = rand(200, W - 200), y = rand(200, H - 200), r = rand(30, 70); if (!onIsland(m, x, y, -r - 140) && Math.hypot(x - C.x, y - C.y) > 700 && !m.trees.some(t => Math.hypot(t.x - x, t.y - y) < t.r + r + 200)) { m.trees.push({ x, y, r, rk: 1 }); i++; } }
    m.boats = []; let bid = 1;
    m.islands.forEach((is, n) => { const nb = n === 0 ? 4 : 1; for (let j = 0; j < nb; j++) { const a = (j / nb) * 6.283 + rand(-.3, .3) + n, d = is.r + 36; m.boats.push({ id: bid++, x: is.x + Math.cos(a) * d, y: is.y + Math.sin(a) * d, a: a + Math.PI / 2, kind: 'boat' }); } });
    for (const a of [.7, 2.3, 3.9, 5.4]) m.boats.push({ id: bid++, x: C.x + Math.cos(a) * 760, y: C.y + Math.sin(a) * 760, a: a + Math.PI / 2, kind: 'ship', r: 46 });
    m.boats = m.boats.filter(b => !onIsland(m, b.x, b.y, -b.r) && !m.trees.some(t => Math.hypot(t.x - b.x, t.y - b.y) < t.r + b.r + 10));
  } else if (theme === 'Rainforest Swamp') {
    tryBuild(N(4), n => n % 4 < 3 ? 'house' : 'facility', stdSize, t => ({ kind: t === 'house' ? 'hut' : 'lab' })); nT = 260; nBush = 70; treeR = [20, 42];
  } else if (theme === 'Snowy Mountain') {
    tryBuild(N(5), n => n % 5 < 4 ? 'house' : 'facility', stdSize, t => ({ kind: t === 'house' ? 'cabin' : 'substation' })); nT = 200; nBush = 20;
    for (let i = 0, k = 0; i < N(46) && k < 6000; k++) { const r = rand(40, 95), x = rand(0, W), y = rand(0, H); if (free(x, y, r + 30)) { m.trees.push({ x, y, r, rk: 1 }); i++; } }
  } else if (theme === 'Haunted Farm') {
    tryBuild(1, () => 'house', () => [rand(400, 440), rand(330, 370)], () => ({ kind: 'farmhouse', floors: 2, light: '#ffcf7a' }), () => ({ x: C.x + rand(-350, 350), y: C.y - 520 }));
    tryBuild(N(3), () => 'facility', () => [rand(380, 440), rand(300, 360)], () => ({ kind: 'barn' })); tryBuild(N(2), () => 'house', stdSize, () => ({ kind: 'farmhouse' }));
    for (let i = 0, k = 0; i < N(3) && k < 1500; k++) { const x = rand(200, W - 200), y = rand(200, H - 200); if (free(x, y, 90)) { m.trees.push({ x, y, r: 55, sl: 1 }); i++; } } // grain silos
    for (let f = 0, k = 0; f < N(4) && k < 1200; k++) { // fenced cornfields with a gap on one side
      const fw = rand(420, 620), fh = rand(360, 520), x = rand(120, W - 120 - fw), y = rand(120, H - 120 - fh);
      if (!free(x + fw / 2, y + fh / 2, Math.max(fw, fh) / 2 + 30)) continue; const g = 110, T = 10;
      m.walls.push({ x, y, w: fw / 2 - g / 2, h: T, f: 1 }, { x: x + fw / 2 + g / 2, y, w: fw / 2 - g / 2, h: T, f: 1 }, { x, y: y + fh - T, w: fw, h: T, f: 1 }, { x, y, w: T, h: fh, f: 1 }, { x: x + fw - T, y, w: T, h: fh, f: 1 });
      for (let cy = y + 50; cy < y + fh - 40; cy += 70) for (let cx = x + 50; cx < x + fw - 40; cx += 80) if (Math.random() < .8) m.bushes.push({ x: cx + rand(-10, 10), y: cy + rand(-10, 10), r: rand(30, 40), corn: 1 });
      f++; }
    nT = 50; nBush = 10;
  } else if (theme === 'Vampire Castle') {
    const S2 = 1300, x0 = C.x - S2 / 2, y0 = C.y - S2 / 2, T = 50, g = 160; // outer castle wall with a gate in the middle of each side + 4 round corner towers
    const side = (x, y, w, h, horiz) => { if (horiz) m.walls.push({ x, y, w: w / 2 - g / 2, h, cs: 1 }, { x: x + w / 2 + g / 2, y, w: w / 2 - g / 2, h, cs: 1 }); else m.walls.push({ x, y, w, h: h / 2 - g / 2, cs: 1 }, { x, y: y + h / 2 + g / 2, w, h: h / 2 - g / 2, cs: 1 }); };
    side(x0, y0, S2, T, 1); side(x0, y0 + S2 - T, S2, T, 1); side(x0, y0, T, S2, 0); side(x0 + S2 - T, y0, T, S2, 0);
    for (const [tx, ty] of [[x0, y0], [x0 + S2, y0], [x0, y0 + S2], [x0 + S2, y0 + S2]]) m.trees.push({ x: tx, y: ty, r: 85, tw: 1 });
    rooms.push(addBuilding(m, C.x - 260, C.y - 520 + T + 40, 520, 400, 'house', { kind: 'keep', floors: 2, light: '#ff6a3a' }));
    tryBuild(N(2), () => 'facility', stdSize, () => ({ kind: 'crypt' }), () => { const a = rand(0, 6.283), d = rand(1050, W / 2 - 300); return { x: C.x + Math.cos(a) * d, y: C.y + Math.sin(a) * d }; }); tryBuild(N(2), () => 'house', stdSize, () => ({ kind: 'cottage', light: pick(WINDOW_LIGHTS) }));
    for (let i = 0, k = 0; i < N(40) && k < 6000; k++) { const x = rand(150, W - 150), y = rand(150, H - 150); if ((Math.abs(x - C.x) > S2 / 2 + 120 || Math.abs(y - C.y) > S2 / 2 + 120) && free(x, y, 30)) { m.props.push({ k: 'grave', x: Math.round(x - 14), y: Math.round(y - 8), w: 28, h: 16, solid: true, a: 0 }); i++; } }
    nT = 70; nBush = 16;
  } else if (theme === 'Fester Street') { // a quiet suburb: two-storey houses on both sides of three streets, every window lit differently
    const streets = []; for (let sy = 600; sy < H - 400; sy += 820) streets.push(sy);
    for (const sy of streets) for (let sx = 260; sx < W - 300; sx += 470) for (const side of [-1, 1]) {
      if (Math.random() < .4) continue; const bw = rand(330, 400), bh = rand(270, 320), x = sx + rand(-20, 20), y = side < 0 ? sy - 110 - bh : sy + 110;
      if (!free(x + bw / 2, y + bh / 2, Math.max(bw, bh) / 2 + 20)) continue;
      rooms.push(addBuilding(m, x, y, bw, bh, 'house', { kind: 'twostory', floors: 2, light: pick(WINDOW_LIGHTS) }));
    }
    for (const sy of streets) for (let sx = 200; sx < W - 150; sx += 330) m.props.push({ k: 'streetlight', x: sx, y: sy - 90, w: 10, h: 10, solid: false, a: 0 });
    m.streets = streets; nT = 70; nBush = 34; treeR = [18, 30];
  }
  if (!rooms.some(b => b.type === 'house')) tryBuild(1, () => 'house', stdSize, () => (m.islands ? { kind: 'shack' } : {}), m.islands ? () => ({ x: C.x + rand(-200, 200), y: C.y + rand(-200, 200) }) : null);
  nT = N(nT); nBush = N(nBush); for (let i = 0, k = 0; i < nT && k < nT * 20; k++) { const r = rand(treeR[0], treeR[1]), x = rand(0, W), y = rand(0, H); if (free(x, y, r + (forest ? 26 : 40)) && !(forest && nearLine(x, y, 130)) && !(m.streets && m.streets.some(sy => Math.abs(y - sy) < 120))) { m.trees.push({ x, y, r }); i++; } }
  for (let i = 0, k = 0; i < nBush && k < nBush * 100; k++) { const r = rand(30, 46), x = rand(0, W), y = rand(0, H); if (free(x, y, r)) { m.bushes.push({ x, y, r }); i++; } }
  for (let i = 0, k = 0; i < N(10) && k < 6000; k++) { const x = rand(0, W), y = rand(0, H); if (free(x, y, 30)) { m.vents.push({ x, y }); i++; } }
  // loot: chests and bags (one chest inside most buildings, the rest scattered)
  let lid = 1; const okLoot = (x, y) => free(x, y, 26) && !m.bushes.some(b => Math.hypot(b.x - x, b.y - y) < b.r + 20) && !m.loot.some(l => Math.hypot(l.x - x, l.y - y) < 160);
  for (const b of rooms) for (let k = 0; k < 30; k++) { const x = b.x + rand(50, b.w - 50), y = b.y + rand(50, b.h - 50); if (okLoot(x, y)) { m.loot.push({ id: lid++, x, y, kind: Math.random() < .7 ? 'chest' : 'bag', a: rand(0, 6.28) }); break; } }
  for (const [kind, n] of [['chest', N(14)], ['bag', N(22)]]) for (let i = 0, k = 0; i < n && k < n * 200; k++) { const x = rand(0, W), y = rand(0, H); if (okLoot(x, y)) { m.loot.push({ id: lid++, x, y, kind, a: rand(0, 6.28) }); i++; } }
  if (!m.vehicles) {
    const kinds = ['pickup', 'sedan', 'suv', 'pickup', 'sedan', 'suv'];
    m.vehicles = []; let vid = 1;
    for (const kind of kinds) {
      const spot = freeSpot(m, 30);
      if (spot && !collides(m, spot.x, spot.y, 24)) m.vehicles.push({ id: vid++, x: spot.x, y: spot.y, a: rand(0, 6.28), kind });
    }
  }
  return m;
}
function freeSpot(m, r, near, spread, where) { // where: undefined = land on the ocean map, 'water', 'any'
  for (let k = 0; k < 400; k++) {
    const x = near ? near.x + rand(-spread, spread) : rand(80, m.w - 80), y = near ? near.y + rand(-spread, spread) : rand(80, m.h - 80);
    if (x < 60 || y < 60 || x > m.w - 60 || y > m.h - 60) continue;
    if (m.islands && where !== 'any' && k < 300) { const land = onIsland(m, x, y, r + 10); if (where === 'water' ? land || Math.hypot(x - m.w / 2, y - m.h / 2) > m.safe : !land) continue; }
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
  r.state = 'lobby'; r.map = LOBBY; r.traps = []; r.portal = null; r.extract = null; r.items = []; r.opened = new Set(); bindVehicles(r, LOBBY.vehicles);
  for (const p of r.players.values()) { Object.assign(p, { role: 'lobby', mt: null, alive: true, escaped: false, st: {}, r: 16, stamina: 100, boat: null, esc: 0, seated: false }, freshKit()); Object.assign(p, freeSpot(LOBBY, 16, LOBBY.spawn, 80)); }
  sendMap(r);
}
function sendMap(r, only) {
  const m = r.map, o = { t: 'map', map: { w: m.w, h: m.h, theme: m.theme, walls: m.walls, trees: m.trees, bushes: m.bushes, vents: m.vents, heli: m.heli || null, poles: m.poles || [], lines: m.lines || [], loot: m.loot || [], bld: m.bld || [], props: m.props || [], islands: m.islands || null, safe: m.safe || 0, pools: m.pools || null, streets: m.streets || null, zones: m.zones || null, roads: m.roads || (m.road ? [m.road] : null) } };
  if (only) send(only, o); else bcast(r, o);
}
function addToRoom(r, p) {
  r.players.set(p.id, p); p.room = r; recolor(r);
  if (r.state === 'lobby') Object.assign(p, freeSpot(LOBBY, 16, LOBBY.spawn, 80));
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
  r.state = 'flight'; r.flightEnd = now() + FLIGHT_TIME; r.roundN = (r.roundN || 0) + 1; r.traps = []; r.portal = null; r.extract = null; r.items = []; r.opened = new Set(); r.itemId = 1; r.strikes = []; r.whirls = [];
  // each player has a random chance to be a monster: 1 per ~5 players on average, at least 1, never everyone
  let chance = 0.2, mons = ps.filter(() => Math.random() < chance);
  const maxM = Math.max(1, Math.floor(n / 3));
  while (mons.length > maxM) mons.splice(Math.floor(Math.random() * mons.length), 1);
  if (!mons.length) mons = [pick(ps)];
  if (ENV.TEST_ROLES === 'humans-survive' && ps.some(p => p.bot)) mons = [pick(ps.filter(p => p.bot))]; // screenshot/test hook only
  if (ENV.TEST_ROLES === 'human-monster' && ps.some(p => !p.bot)) mons = [ps.find(p => !p.bot)]; // screenshot hook only (kill cam)
  // the map: a monster player's chosen monster takes the round to its home map (test hooks can force one)
  const prefM = (ENV.TEST_MON && MONSTERS[ENV.TEST_MON] && !ENV.THEME && MONSTERS[ENV.TEST_MON].home !== CLASSIC) ? ENV.TEST_MON : (mons.find(p => p.pref && MONSTERS[p.pref]) || {}).pref;
  r.map = genMap(pickTheme(prefM)); bindVehicles(r, [...(r.map.vehicles || []), ...(r.map.boats || []).filter(b => !(r.map.vehicles || []).includes(b))]);
  const homePool = MKEYS.filter(k => MONSTERS[k].home.includes(r.map.theme)), pool = homePool.slice().sort(() => Math.random() - .5);
  while (pool.length < mons.length) pool.unshift(pick(homePool));
  for (const p of mons) if (p.pref && pool.includes(p.pref)) { pool.splice(pool.indexOf(p.pref), 1); pool.push(p.pref); } // chosen monsters go to the top of the pool
  const center = { x: r.map.w / 2, y: r.map.h / 2 };
  for (const p of ps) {
    Object.assign(p, { alive: true, escaped: false, st: {}, stamina: 100, cdUntil: 0, keys: {}, form: 0, formT: 0, seated: false, gcd: {} }, freshKit());
    if (ENV.TEST_KIT && !p.bot) { p.inv[0] = { k: 'shotgun', n: 1 }; p.inv[1] = { k: 'bat', n: 1 }; p.inv[2] = { k: 'soda', n: 2 }; p.inv[3] = { k: 'beans', n: 1 }; p.ammo.shells = 24; p.vest = 100; p.helmet = 60; } // screenshot hook only
    p.earn = 0; p.dmg = 0; p.downs = 0; p.kills = 0;
    p.kitGiven = null;
    if (mons.includes(p)) { p.role = 'monster'; p.mt = p.pref && pool.includes(p.pref) ? pool.splice(pool.indexOf(p.pref), 1)[0] : pool.pop(); p.r = MONSTERS[p.mt].r; p.hp = p.maxHp = MONSTERS[p.mt].hp || MON_HP; p.esc = 0; p.boat = null; const wh = r.map.islands ? (MONSTERS[p.mt].sea ? 'water' : 'any') : undefined; Object.assign(p, freeSpot(r.map, p.r, null, 0, wh)); for (let k = 0; k < 50 && dist(p, center) < 900; k++) Object.assign(p, freeSpot(r.map, p.r, null, 0, wh)); p.cdUntil = now() + FLIGHT_TIME + 6; }
    else { p.role = 'survivor'; p.mt = null; p.r = 16; p.boat = null; Object.assign(p, freeSpot(r.map, 16, center, 160));
      if (p.kit && p.kit.length && !p.bot) { p.kit.forEach(k => pickup(r, p, { k })); p.kitGiven = p.kit.slice(); send(p, { t: 'kitused', k: p.kitGiven }); p.kit = []; } } // supplies bought at the store counter
    if (ENV.TEST_KIT && !p.bot && p.role === 'survivor') { const c = r.map.loot.filter(c => c.kind === 'chest').sort((a, b) => Math.hypot(a.x - center.x, a.y - center.y) - Math.hypot(b.x - center.x, b.y - center.y))[0]; if (c) Object.assign(p, freeSpot(r.map, 16, c, 60)); } // screenshot hook only
  }
  if (ENV.TEST_ROLES === 'human-monster') { const m = ps.find(p => !p.bot), v = ps.find(p => p.bot && p.role === 'survivor'); if (m && v) { v.hp = 1; m.x = v.x + 90; m.y = v.y; ps.forEach(p => { if (p.bot && p !== v) { p.x = v.x + 900; p.y = v.y; } }); } } // screenshot hook only

  if (ENV.TEST_MON && MONSTERS[ENV.TEST_MON]) for (const p of mons) if (p.bot || ENV.TEST_ROLES === 'human-monster') { p.mt = ENV.TEST_MON; p.r = MONSTERS[p.mt].r; p.hp = p.maxHp = MONSTERS[p.mt].hp || MON_HP; } // screenshot hook only
  sendMap(r);
  bcast(r, { t: 'flight', theme: r.map.theme, secs: FLIGHT_TIME, roles: ps.map(p => ({ id: p.id, role: p.role, mt: p.mt })) });
}
function fmtTime(s) { return s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} min` : s + 's'; }
function beginPlay(r) { r.state = 'playing'; r.playStart = now(); if (ENV.TEST_NEAR) { const h = [...r.players.values()].find(p => !p.bot && p.role === 'survivor'), m = [...r.players.values()].find(p => p.role === 'monster'); if (h && m) { m.x = h.x + 160; m.y = h.y; } } /* screenshot hook only */ r.roundEnd = now() + roundTime(r); event(r, `Dropped into ${r.map.theme}. Survive ${fmtTime(roundTime(r))} or reach the extraction helicopter! Search chests and bags for gear.`, 'big'); }
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
  for (const p of ps) if (!p.bot && p.earn > 0) send(p, { t: 'coins', n: p.earn, round: r.roundN || 0 });
  for (const p of mons) p.score += caught;
  r.state = 'results'; r.resultsEnd = t + RESULTS_TIME;
  bcast(r, { t: 'results', secs: RESULTS_TIME, round: r.roundN || 0, why, winner, saved, caught, players: ps.map(p => ({ id: p.id, name: p.name, role: p.role, mt: p.mt, escaped: p.escaped, alive: p.alive, score: p.score, color: p.color, kills: p.kills || 0, dmg: Math.round(p.dmg || 0), downs: p.downs || 0, earn: p.earn || 0, bot: !!p.bot })) });
}
function catchP(r, m, s) {
  s.alive = false; s.role = 'survivor'; s.caughtBy = m.mt; s.hp = 0; m.earn += 40; m.kills = (m.kills || 0) + 1; leaveBoat(r, s, true);
  dropAll(r, s);
  send(s, { t: 'caught', by: m.mt, fm: monForm(r, m), water: !!(r.map.islands || inWater(r.map, s.x, s.y)), killer: m.name, stats: { time: Math.max(0, Math.round(now() - (r.playStart || now()))), dmg: Math.round(s.dmg || 0), downs: s.downs || 0, earn: s.earn || 0, left: [...r.players.values()].filter(q => q.role === 'survivor' && q.alive && !q.escaped).length } });
  bcast(r, { t: 'scare', id: s.id, vn: s.name, mid: m.id, by: m.mt, fm: monForm(r, m), x: Math.round(s.x), y: Math.round(s.y), mx: Math.round(m.x), my: Math.round(m.y) });
  event(r, `${s.name} was caught by ${MONSTERS[m.mt].name}!`, 'bad');
  checkEnd(r);
}

// ---------- vehicles: land cars and ocean boats share seats, fuel and damage ----------
const VEH_DEF = {
  boat:   { name: 'Boat', seats: 3, vmax: 240, accel: 200, turn: 1.6, fuel: 80, hp: 110, water: 1, r: 32 },
  ship:   { name: 'Ship', seats: 6, vmax: 180, accel: 130, turn: 0.85, fuel: 140, hp: 240, water: 1, r: 50 },
  pickup: { name: 'Pickup', seats: 3, vmax: 270, accel: 230, turn: 1.85, fuel: 90, hp: 150, r: 32 },
  sedan:  { name: 'Sedan', seats: 4, vmax: 300, accel: 250, turn: 2.15, fuel: 70, hp: 100, r: 28 },
  suv:    { name: 'SUV', seats: 4, vmax: 250, accel: 200, turn: 1.6, fuel: 85, hp: 180, r: 30 },
};
const VEH_CODE = { boat: 0, ship: 1, pickup: 2, sedan: 3, suv: 4 };
function vehDef(kind) { return VEH_DEF[kind] || VEH_DEF.sedan; }
function makeVeh(v) { const d = vehDef(v.kind); return { id: v.id, x: v.x, y: v.y, a: v.a || 0, kind: v.kind in VEH_DEF ? v.kind : 'sedan', r: d.r, by: null, seats: [], spd: 0, fuel: d.fuel, hp: d.hp, maxHp: d.hp, maxFuel: d.fuel, home: { x: v.x, y: v.y, a: v.a || 0 }, stuck: 0 }; }
function bindVehicles(r, list) { let n = 1; r.vehicles = (list || []).map(v => makeVeh({ ...v, id: n++ })); r.boats = r.vehicles.filter(v => vehDef(v.kind).water); }
function monForm(r, m) { if (m.mt === 'megalodon') return inWater(r.map, m.x, m.y) ? 0 : 1; if (m.mt === 'fester') return m.esc || 0; return m.form || 0; }
function boatOf(r, p) { return p.boat && r.vehicles ? r.vehicles.find(b => b.id === p.boat) : null; }
function boatWater(m, x, y, rad) { if (!m.islands) return false; return x > rad + 40 && y > rad + 40 && x < m.w - rad - 40 && y < m.h - rad - 40 && !m.islands.some(i => Math.hypot(i.x - x, i.y - y) < i.r + rad * .45) && !m.trees.some(t => Math.hypot(t.x - x, t.y - y) < t.r + rad * .7); }
function nearestVeh(r, p) { if (!r.vehicles) return null; return r.vehicles.filter(v => dist(v, p) < v.r + p.r + 60).sort((a, c) => dist(a, p) - dist(c, p))[0] || null; }
function board(r, p) {
  if (!r.vehicles || p.boat) return false;
  if (r.state === 'playing' && (p.role !== 'survivor' || !p.alive || p.escaped)) return false;
  if (r.state !== 'playing' && r.state !== 'lobby') return false;
  const b = nearestVeh(r, p); if (!b) return false;
  const D = vehDef(b.kind);
  if (b.seats.length >= D.seats || b.hp <= 0) { send(p, { t: 'event', msg: b.hp <= 0 ? `The ${D.name} is wrecked.` : `The ${D.name} is full.`, kind: 'bad' }); return true; }
  wake(p); b.seats.push(p.id); if (!b.by) b.by = p.id; p.boat = b.id; p.x = b.x; p.y = b.y; p.seated = false;
  const wheel = b.by === p.id;
  send(p, { t: 'event', msg: wheel ? `You take the wheel of the ${D.name}. WASD or the joystick drives. E gets out.${D.water ? ' Stay inside the calm water.' : ' It has a limited tank, and a monster can wreck it.'}` : `You take a seat in the ${D.name}.`, kind: 'good' });
  bcast(r, { t: 'sfx', kind: D.water ? 'boat' : 'open', x: b.x, y: b.y }); return true;
}
function leaveBoat(r, p, force) {
  const b = boatOf(r, p); if (!b) { p.boat = null; return false; }
  b.seats = b.seats.filter(id => id !== p.id); p.boat = null;
  if (b.by === p.id) b.by = b.seats[0] || null;
  const D = vehDef(b.kind);
  let spot = null;
  if (D.water && r.map.islands) { for (let d = b.r + 16; d < b.r + 180 && !spot; d += 18) for (let k = 0; k < 12 && !spot; k++) { const a = k / 12 * 6.283, x = b.x + Math.cos(a) * d, y = b.y + Math.sin(a) * d; if (onIsland(r.map, x, y, 16) && !collides(r.map, x, y, p.r)) spot = { x, y }; } }
  if (!spot) { for (let k = 0; k < 16 && !spot; k++) { const a = k / 16 * 6.283, x = b.x + Math.cos(a) * (b.r + 28), y = b.y + Math.sin(a) * (b.r + 28); if (!collides(r.map, x, y, p.r) && (!D.water || !r.map.islands || boatWater(r.map, x, y, 10) || onIsland(r.map, x, y, 8))) spot = { x, y }; } }
  if (!spot) spot = freeSpot(r.map, p.r, b, b.r + 40, D.water ? 'any' : undefined);
  Object.assign(p, spot);
  if (force && p.alive) { p.st.stun = Math.max(p.st.stun || 0, now() + 1.3); send(p, { t: 'event', msg: `You are thrown from the ${D.name}.`, kind: 'bad' }); }
  return true;
}
function driveVehicle(r, p, dx, dy, dt, coast) {
  const b = boatOf(r, p); if (!b || b.by !== p.id || b.hp <= 0) return;
  const D = vehDef(b.kind);
  if (!coast && (dx || dy)) {
    const want = Math.atan2(dy, dx);
    let da = ((want - b.a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    b.a += clamp(da, -D.turn * dt * (1.2 + Math.min(1, b.spd / 80)), D.turn * dt * (1.2 + Math.min(1, b.spd / 80)));
    const align = Math.max(0, Math.cos(da));
    if (b.fuel > 0) { b.spd = clamp(b.spd + align * D.accel * dt - 30 * dt, 0, D.vmax * (0.4 + 0.6 * b.hp / b.maxHp)); b.fuel = Math.max(0, b.fuel - (align * 1.35 + 0.15) * dt); }
    else b.spd = Math.max(0, b.spd - 90 * dt);
  } else b.spd = Math.max(0, b.spd - 70 * dt);
  const step = b.spd * dt, nx = b.x + Math.cos(b.a) * step, ny = b.y + Math.sin(b.a) * step;
  const ok = D.water ? boatWater(r.map, nx, ny, b.r) : (nx > 40 && ny > 40 && nx < r.map.w - 40 && ny < r.map.h - 40 && !collides(r.map, nx, ny, b.r * 0.55));
  if (ok) { b.x = nx; b.y = ny; b.stuck = 0; }
  else {
    b.spd *= 0.35;
    if (!D.water && b.home && !coast && (dx || dy)) b.stuck = (b.stuck || 0) + dt; else b.stuck = 0;
    if ((b.stuck || 0) > 1.6) resetVehicle(r, b);
  }
}
function resetVehicle(r, b) {
  b.x = b.home.x; b.y = b.home.y; b.a = b.home.a; b.spd = 0; b.stuck = 0; b.hp = b.maxHp; b.fuel = b.maxFuel;
  for (const id of b.seats) { const q = r.players.get(id); if (q) { q.x = b.x; q.y = b.y; send(q, { t: 'event', msg: `The ${vehDef(b.kind).name} was stuck and returned to its parking spot.`, kind: 'info' }); } }
}
function driveBoat(r, p, dx, dy, sp, dt) { driveVehicle(r, p, dx, dy, dt, false); }
const capsize = (r, s) => { if (s.boat) { const b = boatOf(r, s); if (b) b.hp = Math.max(0, b.hp - 25); leaveBoat(r, s, true); } };
// push a survivor away from (or toward, with negative d) a point, respecting walls
function shove(r, s, from, d) { const a = Math.atan2(s.y - from.y, s.x - from.x); if (s.boat) { const b = boatOf(r, s); if (b && b.by === s.id) { const n = 8; for (let i = 0; i < n; i++) { const nx = b.x + Math.cos(a) * d / n, ny = b.y + Math.sin(a) * d / n; if (boatWater(r.map, nx, ny, b.r)) { b.x = nx; b.y = ny; } } } return; } for (let i = 0; i < 8; i++) moveEnt(r.map, s, Math.cos(a) * d / 8, Math.sin(a) * d / 8); }

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
  m.hp -= dmg; by.dmg = (by.dmg || 0) + Math.min(dmg, m.hp + dmg); bcast(r, { t: 'fx', kind: 'hit', x: m.x, y: m.y, c: '#b00000' });
  if (stun) m.st.stag = t + stun;
  if (m.hp <= 0) { m.hp = 0; m.st.down = t + DOWN_TIME; m.st.dash = 0; by.score += 1; by.earn += 25; by.downs = (by.downs || 0) + 1; event(r, `${by.name} knocked down ${MONSTERS[m.mt].name}! It gets back up in ${DOWN_TIME}s — run!`, 'good'); bcast(r, { t: 'sfx', kind: 'down', x: m.x, y: m.y }); }
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
  const nearest = () => surv.slice().sort((a, b) => dist(a, p) - dist(b, p))[0], within = d => surv.filter(s => dist(s, p) < d), say = (s, msg) => send(s, { t: 'event', msg, kind: 'bad' });
  const appearNear = (tg, d0, d1) => { for (let k = 0; k < 60; k++) { const a = Math.random() * 6.283, d = d0 + Math.random() * (d1 - d0), x = clamp(tg.x + Math.cos(a) * d, 60, r.map.w - 60), y = clamp(tg.y + Math.sin(a) * d, 60, r.map.h - 60); if (!collides(r.map, x, y, p.r)) { p.x = x; p.y = y; p.a = Math.atan2(tg.y - y, tg.x - x); return true; } } Object.assign(p, freeSpot(r.map, p.r, tg, d1)); return true; };
  switch (p.mt) {
    case 'freddy': case 'bonnie': case 'chica': case 'foxy': case 'springtrap':
      p.st.sight = t + 10; snd = 'laugh'; event(r, `${M.name}: "Ha… ha… ha…" — it can see you all!`, 'bad'); break;
    case 'sirenhead': surv.forEach(s => s.st.reveal = t + 8); bcast(r, { t: 'fx', kind: 'siren', x: p.x, y: p.y }); event(r, 'A deafening siren wails… Siren Head can see everyone!', 'bad'); break;
    case 'boisvert': surv.forEach(s => { s.st.static = t + 10; delete s.st.dark; }); snd = 'static'; event(r, 'Every screen dissolves into roaring TV static…', 'bad'); break;
    case 'wendigo': { const F = WG_FORMS[p.form || 0].k;
      if (F === 'deer') { p.st.dash = t + 1.1; const hit = surv.filter(s => dist(s, p) < 280 && Math.abs(((Math.atan2(s.y - p.y, s.x - p.x) - p.a + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < .6);
        bcast(r, { t: 'fx', kind: 'ring', x: p.x, y: p.y, r: 140, c: '#d8ccb0' }); for (const s of hit) { wake(s); s.st.stun = t + 1.4; shove(r, s, p, 160); hurtSurvivor(r, s, 22, p); say(s, 'Antlers slam into you out of the dark!'); } snd = 'crack'; break; }
      const near = within(900); for (const s of near) { s.st.reveal = t + 5; say(s, 'Someone you know is calling your name from the trees… "Help me! Over here!"'); }
      const tg = near.sort((a, b) => dist(a, p) - dist(b, p))[0]; if (tg && dist(tg, p) < 520) { const a = Math.atan2(tg.y - p.y, tg.x - p.x); let d = Math.min(dist(tg, p) - p.r - tg.r - 4, 340);
        for (; d > 20; d -= 20) { const x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d; if (!collides(r.map, x, y, p.r)) { p.x = x; p.y = y; p.a = a; break; } } bcast(r, { t: 'fx', kind: 'poof', x: p.x, y: p.y, c: '#c8c4bc' }); if (dist(tg, p) < p.r + tg.r + 30) { wake(tg); tg.st.stun = t + .9; } }
      if (!near.length) cd = 5; snd = 'mimic'; break; }
    case 'demogorgon': { const tg = nearest(); if (!tg) { cd = 3; break; } bcast(r, { t: 'fx', kind: 'portal', x: p.x, y: p.y }); appearNear(tg, 140, 230); bcast(r, { t: 'fx', kind: 'portal', x: p.x, y: p.y }); snd = 'portal'; break; }
    case 'drnowhere': { const F = DN_FORMS[p.form || 0].k;
      if (F === 'doctor') { const tg = surv.filter(s => dist(s, p) < p.r + s.r + 70).sort((a, b) => dist(a, p) - dist(b, p))[0];
        if (!tg) { cd = 2.5; send(p, { t: 'event', msg: 'Injection missed — get closer!', kind: 'bad' }); break; }
        tg.st.slow = t + 6; send(tg, { t: 'event', msg: 'Doctor Nowhere injected you! You feel sluggish…', kind: 'bad' }); bcast(r, { t: 'fx', kind: 'hit', x: tg.x, y: tg.y, c: '#66ffcc' }); snd = 'inject'; break; }
      if (F === 'conezone') { p.st.dash = t + 2.5; for (const s of within(700)) say(s, 'Something is skittering across the floor toward you…'); snd = 'skitter'; break; }
      if (F === 'guilt') { let n = 0; bcast(r, { t: 'fx', kind: 'ring', x: p.x, y: p.y, r: 600, c: '#f0f0ea' });
        for (const s of within(600)) { const look = Math.cos(Math.atan2(p.y - s.y, p.x - s.x) - s.a); if (look > .5) { n++; s.st.slow = t + 5; s.st.halluc = Math.max(s.st.halluc || 0, t + 2); say(s, 'You looked at Guilt… it stares back. Your legs feel like lead.'); } }
        snd = 'paranoia'; if (!n) { cd = 5; send(p, { t: 'event', msg: 'Nobody was looking at you.', kind: 'bad' }); } break; }
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
    // ---- phase 2 ----
    case 'megalodon': case 'mosasaurus': { // a crashing wave around you
      const R = p.mt === 'megalodon' ? 380 : 280, hit = within(R); bcast(r, { t: 'fx', kind: 'wave', x: p.x, y: p.y, r: R, c: '#bfe8ff' }); p.st.surf = t + 3;
      for (const s of hit) { wake(s); capsize(r, s); shove(r, s, p, p.mt === 'megalodon' ? 170 : 120); s.st.stun = t + (p.mt === 'megalodon' ? 1.2 : 1.6); s.st.soak = t + 2; hurtSurvivor(r, s, p.mt === 'megalodon' ? 10 : 15, p); say(s, p.mt === 'megalodon' ? 'A wall of water explodes out of the sea — MEGALODON!' : 'A huge tail slams the water — the wave knocks you flat!'); }
      snd = 'wave'; if (!hit.length) cd = 6; break; }
    case 'kraken': { const tg = surv.filter(s => dist(s, p) < 480).sort((a, b) => dist(a, p) - dist(b, p))[0]; p.st.surf = t + 3;
      bcast(r, { t: 'fx', kind: 'tentacle', id: p.id, x: p.x, y: p.y, tx: tg ? tg.x : p.x + Math.cos(p.a) * 400, ty: tg ? tg.y : p.y + Math.sin(p.a) * 400 });
      if (!tg) { cd = 4; snd = 'tentacle'; break; }
      wake(tg); capsize(r, tg); const gx = p.x + Math.cos(Math.atan2(tg.y - p.y, tg.x - p.x)) * (p.r + tg.r + 10), gy = p.y + Math.sin(Math.atan2(tg.y - p.y, tg.x - p.x)) * (p.r + tg.r + 10);
      if (!collides(r.map, gx, gy, tg.r)) { tg.x = gx; tg.y = gy; } else Object.assign(tg, freeSpot(r.map, tg.r, p, 60, 'any')); tg.st.stun = t + 1.5; say(tg, 'A slimy tentacle wraps around you and drags you under…'); snd = 'tentacle'; break; }
    case 'cthulhu': { const tg = surv.filter(s => dist(s, p) < 1100).sort((a, b) => dist(a, p) - dist(b, p)).slice(0, 3); p.st.surf = t + 2;
      for (const s of surv) if (dist(s, p) < 1400) { s.st.thunder = t + 6; say(s, 'The sky turns black… red eyes open in the storm clouds. Lightning is coming — MOVE!'); }
      for (const s of tg) { r.strikes.push({ x: s.x, y: s.y, at: t + 1, by: p.id }); bcast(r, { t: 'fx', kind: 'warn', x: s.x, y: s.y, r: 90, c: '#ff3030' }); }
      snd = 'thunder'; if (!tg.length) cd = 6; break; }
    case 'leviathan': { r.whirls.push({ x: p.x, y: p.y, r: 460, until: t + 4, by: p.id }); bcast(r, { t: 'fx', kind: 'whirl', x: p.x, y: p.y, r: 460 }); p.st.surf = t + 4;
      for (const s of within(460)) { s.st.slow = t + 4; say(s, 'The sea starts spinning — a whirlpool is dragging you in!'); } snd = 'whirl'; break; }
    case 'nessie': { p.st.invis = t + 6; p.st.fast = t + 6; for (const s of within(900)) { s.st.fog = t + 8; say(s, 'A thick fog rolls in… a long neck slips under the water.'); } bcast(r, { t: 'fx', kind: 'splash', x: p.x, y: p.y, c: '#9fc8d8' }); snd = 'nessie'; break; }
    case 'spinosaurus': { p.st.invis = t + 4; p.st.dash = t + 1.4; bcast(r, { t: 'fx', kind: 'splash', x: p.x, y: p.y, c: '#7a9a60' }); snd = 'spinoroar'; break; }
    case 'trex': { const hit = within(320); bcast(r, { t: 'fx', kind: 'ring', x: p.x, y: p.y, r: 320, c: '#ffb070' }); p.st.fast = t + 4;
      for (const s of hit) { wake(s); s.st.stun = t + 1.2; say(s, 'The ground shakes with a deafening ROAR!'); } for (const s of within(1000)) s.st.reveal = t + 6; snd = 'trexroar'; break; }
    case 'quetzalcoatlus': { const tg = surv.filter(s => dist(s, p) < 1000).sort((a, b) => dist(a, p) - dist(b, p))[0]; if (!tg) { cd = 3; break; }
      bcast(r, { t: 'fx', kind: 'dive', x: p.x, y: p.y, tx: tg.x, ty: tg.y }); appearNear(tg, 60, 110); wake(tg); capsize(r, tg); tg.st.stun = t + 1; say(tg, 'A giant shadow drops out of the sky onto you!'); snd = 'screech'; break; }
    case 'yeti': { const hit = within(420); bcast(r, { t: 'fx', kind: 'ring', x: p.x, y: p.y, r: 420, c: '#e8f6ff' });
      for (const s of hit) { wake(s); s.st.stun = t + .8; s.st.slow = t + 5; s.st.snow = t + 6; say(s, 'A freezing roar — an avalanche of snow buries you!'); } snd = 'roar'; if (!hit.length) cd = 6; break; }
    case 'dragon': { const hit = surv.filter(s => dist(s, p) < 360 && Math.abs(((Math.atan2(s.y - p.y, s.x - p.x) - p.a + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < .5 && clearLine(r.map, p, s));
      bcast(r, { t: 'fx', kind: 'fire', id: p.id, x: p.x, y: p.y, a: +p.a.toFixed(2), r: 360 });
      for (const s of hit) { wake(s); s.st.burn = t + 3; hurtSurvivor(r, s, 30, p); say(s, 'Dragon fire! You are burning!'); } snd = 'fire'; break; }
    case 'chupacabra': { const tg = surv.filter(s => dist(s, p) < p.r + s.r + 150).sort((a, b) => dist(a, p) - dist(b, p))[0]; if (!tg) { cd = 3; send(p, { t: 'event', msg: 'Nobody close enough to bite.', kind: 'bad' }); break; }
      wake(tg); tg.st.slow = t + 3; hurtSurvivor(r, tg, 25, p); p.hp = Math.min(p.maxHp, p.hp + 80); bcast(r, { t: 'fx', kind: 'hit', x: tg.x, y: tg.y, c: '#c00000' }); say(tg, 'Fangs sink into you — the Chupacabra is draining your blood!'); snd = 'drain'; break; }
    case 'vampire': { const tg = surv.filter(s => dist(s, p) < 1100).sort((a, b) => dist(a, p) - dist(b, p))[0]; if (!tg) { cd = 3; break; }
      bcast(r, { t: 'fx', kind: 'bats', x: p.x, y: p.y }); appearNear(tg, 110, 180); bcast(r, { t: 'fx', kind: 'bats', x: p.x, y: p.y }); p.st.invis = t + 1.2; tg.st.blind = t + 3; say(tg, 'A swarm of bats engulfs you… you can\'t see!'); snd = 'bats'; break; }
    case 'gargoyle': { p.st.guard = t + 6; const hit = within(220); bcast(r, { t: 'fx', kind: 'ring', x: p.x, y: p.y, r: 220, c: '#9a9a9a' });
      for (const s of hit) { wake(s); s.st.stun = t + 1; say(s, 'A stone statue crashes down beside you!'); } snd = 'quake'; break; }
    case 'bigfoot': { let best = null, bd = 1e9;
      for (const s of surv) { const d = dist(s, p), da = Math.abs(((Math.atan2(s.y - p.y, s.x - p.x) - p.a + Math.PI * 3) % (Math.PI * 2)) - Math.PI); if (d < 650 && da < .45 && clearLine(r.map, p, s) && d < bd) { bd = d; best = s; } }
      bcast(r, { t: 'fx', kind: 'boulder', id: p.id, x: p.x, y: p.y, tx: best ? best.x : p.x + Math.cos(p.a) * 600, ty: best ? best.y : p.y + Math.sin(p.a) * 600 });
      if (!best) { cd = 5; snd = 'quake'; break; } wake(best); best.st.stun = t + 2; hurtSurvivor(r, best, 15, p); say(best, 'A boulder smashes into you!'); snd = 'quake'; break; }
    case 'fester': { const n = within(900); for (const s of n) { s.st.dark = t + 3 + (p.esc || 0) * .5; s.st.reveal = t + 4; say(s, 'Every light on the street dies at once… Father Fester is close.'); }
      snd = 'dark'; if (!n.length) cd = 6; break; }
  }
  p.cdUntil = t + cd;
  send(p, { t: 'abilityUsed' });
  bcast(r, { t: 'sfx', kind: snd, mt: p.mt, x: p.x, y: p.y });
}
function clearLine(m, a, b) { const n = Math.ceil(dist(a, b) / 20); for (let i = 1; i < n; i++) { const x = a.x + (b.x - a.x) * i / n, y = a.y + (b.y - a.y) * i / n; if (m.walls.some(w => x > w.x && x < w.x + w.w && y > w.y && y < w.y + w.h)) return false; } return true; }
// beds: survivors can sleep in a house bed to heal (any movement wakes them)
function nearBed(r, p) { return (r.map.props || []).find(o => o.k === 'bed' && p.x > o.x - 40 && p.x < o.x + o.w + 40 && p.y > o.y - 40 && p.y < o.y + o.h + 40); }

// ---------- lobby helicopter seats, extraction boarding, survivor coils ----------
function nearHeliDoor(p) { const h = LOBBY.heli; return dist(p, h) < (h.board || 88); }
function sitLobby(r, p) {
  if (!p || r.state !== 'lobby') return false;
  if (p.seated) {
    p.seated = false;
    const h = LOBBY.heli, spot = freeSpot(LOBBY, p.r, { x: h.x, y: h.y + h.r * 0.85 }, 40);
    p.x = spot.x; p.y = spot.y;
    send(p, { t: 'event', msg: 'You climbed out of the helicopter.', kind: 'info' });
    return true;
  }
  if (!nearHeliDoor(p)) return false;
  p.seated = true;
  const h = LOBBY.heli, n = [...r.players.values()].filter(q => q.seated).length, a = n * 0.85;
  p.x = h.x + Math.cos(a) * 22; p.y = h.y + Math.sin(a) * 14;
  send(p, { t: 'event', msg: 'You are in a seat. E climbs back out. Takeoff waits until every player is seated.', kind: 'good' });
  return true;
}
function tryExtract(r, s) {
  if (!r || r.state !== 'playing' || !r.extract || s.role !== 'survivor' || !s.alive || s.escaped) return false;
  if (dist(s, r.extract) > r.extract.r) return false;
  s.escaped = true; s.seated = false;
  event(r, `${s.name} boarded the extraction helicopter and got out!`, 'good');
  checkEnd(r); return true;
}
function useGear(r, p, k) {
  const G = GEAR[k];
  if (!p || !G) return;
  if (!p.gearOn || !p.gearOn.includes(k)) { send(p, { t: 'event', msg: `${G.name} is not equipped.`, kind: 'bad' }); return; }
  if (!r || r.state !== 'playing' || p.role !== 'survivor' || !p.alive || p.escaped) return;
  const t = now(); p.gcd = p.gcd || {};
  const wait = (p.gcd[k] || 0) - t;
  if (wait > 0) { send(p, { t: 'event', msg: `${G.name} · cooldown ${wait.toFixed(1)}s`, kind: 'bad' }); return; }
  p.gcd[k] = t + G.cd;
  if (k === 'speed') p.st.spd = t + G.dur;
  else if (k === 'grav') p.st.grav = t + G.dur;
  else if (k === 'invis') p.st.cloak = t + G.dur;
  send(p, { t: 'event', msg: `${G.name} for ${G.dur}s · ${G.cd}s cooldown`, kind: 'good' });
  bcast(r, { t: 'sfx', kind: 'ability', x: p.x, y: p.y });
}
// Owner admin stays off unless a process that already verified Leo assigns globalThis.NH_OWNER_CHECK.
// A display name, being the room host, and any field on the client message are ignored.
function ownerAuthorized(p) {
  const fn = typeof globalThis !== 'undefined' ? globalThis.NH_OWNER_CHECK : null;
  if (typeof fn !== 'function') return false;
  try { return fn(p) === true; } catch (e) { return false; }
}
function adminReject(p) {
  send(p, { t: 'admin', ok: false, locked: true, msg: 'Owner admin is locked. Hosting a room or using a display name does not grant it. Run your own authoritative server, verify Leo with an identity provider you control, then set globalThis.NH_OWNER_CHECK to a function that returns true only after that server-side check. The shipped game has no check and accepts no client secret.' });
}
function gearState(p, t) {
  const o = {};
  for (const k of p.gearOn || []) {
    const G = GEAR[k]; if (!G) continue;
    const cd = Math.max(0, +((((p.gcd || {})[k]) || 0) - t).toFixed(1));
    const until = k === 'speed' ? p.st.spd : k === 'grav' ? p.st.grav : p.st.cloak;
    o[k] = { cd, left: Math.max(0, +((until || 0) - t).toFixed(1)), dur: G.dur, max: G.cd };
  }
  return o;
}
function adminDo(r, p, m) {
  if (!ownerAuthorized(p)) return adminReject(p);
  const cmd = String(m.cmd || '');
  if (cmd === 'kick') {
    const id = parseInt(m.id, 10);
    const target = [...r.players.values()].find(q => q.id === id && q !== p && !q.bot);
    if (!target) return send(p, { t: 'admin', ok: false, msg: 'No such player.' });
    send(target, { t: 'error', msg: 'Removed by the owner.' }); removeFromRoom(target);
    return send(p, { t: 'admin', ok: true, msg: 'Removed player ' + id });
  }
  if (cmd === 'end') { if (r.state === 'playing') r.roundEnd = now(); return send(p, { t: 'admin', ok: true, msg: 'Round ending.' }); }
  if (cmd === 'coins') {
    const n = clamp(parseInt(m.n, 10) || 0, 1, 5000);
    const id = parseInt(m.id, 10);
    const target = r.players.get(id) || p;
    send(target, { t: 'coins', n });
    return send(p, { t: 'admin', ok: true, msg: `Granted ${n} coins.` });
  }
  send(p, { t: 'admin', ok: false, msg: 'Unknown command. Use kick, end, or coins.' });
}

// ---------- bots ----------
const BOT_NAMES = ['Bot Noob', 'Bot Bacon', 'Bot Guest', 'Bot Builder', 'Bot Ninja', 'Bot Pizza', 'Bot Jelly', 'Bot Rocket', 'Bot Tofu', 'Bot Pickle', 'Bot Nugget', 'Bot Waffle', 'Bot Sprout', 'Bot Biscuit'];
function botThink(r, p, t) {
  const k = { up: 0, down: 0, left: 0, right: 0, sprint: 0 };
  let tx = null, ty = null, flee = false, aimAt = null;
  if (r.state === 'lobby') { if (!p.seated && dist(p, r.map.heli) < (r.map.heli.board || 88)) { sitLobby(r, p); } if (!p.seated) { tx = r.map.heli.x; ty = r.map.heli.y; } }
  else if (r.state === 'playing' && p.role === 'monster' && p.st.down > t) { tx = null; }
  else if (r.state === 'playing' && p.role === 'monster') {
    const vis = [...r.players.values()].filter(s => s.role === 'survivor' && s.alive && !s.escaped && (dist(s, p) < 500) && !(hidden(r, s) && dist(s, p) > 90 && !(s.st.reveal > t)) && !(s.st.cloak > t && dist(s, p) > 70 && !(s.st.reveal > t)));
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
    else if (r.extract) { tx = r.extract.x; ty = r.extract.y; if (dist(p, r.extract) < r.extract.r) tryExtract(r, p);
      if (r.map.islands) { const isl = q => r.map.islands.find(i => Math.hypot(i.x - q.x, i.y - q.y) < i.r + 30), ei = isl(r.extract), mi = isl(p);
        if (p.boat) { const b = boatOf(r, p); if (b && b.by === p.id && ei && Math.hypot(b.x - ei.x, b.y - ei.y) < ei.r + b.r + 60) leaveBoat(r, p); else if (b && b.by !== p.id) leaveBoat(r, p); }
        else if (ei && ei !== mi) { const b = (r.boats || []).filter(b => !b.by).sort((a, c) => dist(a, p) - dist(c, p))[0]; if (b && dist(b, p) < 1400) { tx = b.x; ty = b.y; if (dist(b, p) < b.r + p.r + 40) board(r, p); } } } }
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
  if (r.state === 'playing' && r.map.islands && p.role === 'survivor' && Math.hypot(p.x - r.map.w / 2, p.y - r.map.h / 2) > r.map.safe - 120) { tx = r.map.w / 2; ty = r.map.h / 2; } // bots stay out of the storm
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

// ---------- phase 2 world effects: storm, lightning, whirlpools, burning, Father Fester's escalation ----------
function phase2Tick(r, t, dt, surv) {
  const m = r.map, C = { x: m.w / 2, y: m.h / 2 }, mons = [...r.players.values()].filter(q => q.role === 'monster');
  for (const s of surv) {
    if (!s.alive) continue;
    if (m.islands && dist(s, C) > m.safe) { // the storm: waves push you back, lightning and cold drain your health
      s.st.storm = t + .6; const b = boatOf(r, s);
      if (!s.stormMsg || t > s.stormMsg) { s.stormMsg = t + 6; send(s, { t: 'event', msg: '⛈ The storm is too strong out here — turn back to the calm water!', kind: 'bad' }); }
      shove(r, s, C, -70 * dt); if (b && b.by === s.id) { b.x += (Math.random() - .5) * 4; b.y += (Math.random() - .5) * 4; }
      s.hp -= 4 * dt; if (s.hp <= 0) { const sea = mons.filter(q => MONSTERS[q.mt].sea).sort((a, c) => dist(a, s) - dist(c, s))[0] || mons[0]; if (sea) { catchP(r, sea, s); continue; } s.hp = 1; }
    }
    if (s.st.burn > t) { s.hp -= 6 * dt; if (s.hp <= 0) { const d = mons.find(q => q.mt === 'dragon') || mons[0]; if (d) { catchP(r, d, s); continue; } s.hp = 1; } }
    for (const w of r.whirls) { const d = dist(s, w); if (d < w.r && d > 30) { shove(r, s, w, -Math.min(d - 20, 110 * dt)); if (d < 160) capsize(r, s); } }
  }
  r.whirls = r.whirls.filter(w => t < w.until);
  for (let i = r.strikes.length - 1; i >= 0; i--) { const k = r.strikes[i]; if (t < k.at) continue; r.strikes.splice(i, 1); const by = r.players.get(k.by);
    bcast(r, { t: 'fx', kind: 'bolt', x: k.x, y: k.y }); bcast(r, { t: 'sfx', kind: 'thunder', x: k.x, y: k.y });
    if (by && by.role === 'monster') for (const s of surv) if (s.alive && Math.hypot(s.x - k.x, s.y - k.y) < 90) { wake(s); capsize(r, s); s.st.stun = t + 1; hurtSurvivor(r, s, 25, by); } }
  // Father Fester grows stronger each time a NEW survivor lays eyes on him (each survivor counts again after 12s)
  for (const f of mons) if (f.mt === 'fester' && !(f.st.down > t)) for (const s of surv) {
    if (!s.alive || (f.esc || 0) >= FESTER_MAX || dist(s, f) > 520 || !clearLine(m, s, f) || (s.festerSeen && t < s.festerSeen)) continue;
    s.festerSeen = t + 12; f.esc = (f.esc || 0) + 1;
    send(s, { t: 'event', msg: `You saw Father Fester… and he saw you. He grows stronger (stage ${f.esc}/${FESTER_MAX}).`, kind: 'bad' });
    send(f, { t: 'event', msg: `${s.name} saw you — stage ${f.esc}/${FESTER_MAX}: ${['', 'faster', 'faster', 'faster', 'longer reach', 'longer reach', 'you see every survivor'][f.esc]}`, kind: 'good' });
    bcast(r, { t: 'sfx', kind: 'fester', x: f.x, y: f.y }); if (f.esc >= FESTER_MAX) f.st.sight = t + 9999;
  }
}

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
        const MM = MONSTERS[p.mt], wet = r.state === 'playing' && inWater(r.map, p.x, p.y);
        sp = MM.speed * (p.st.dash > t ? 3 : 1) * (p.st.fast > t ? 1.8 : 1) * (p.st.stag > t ? .5 : 1) * (MM.sea ? (wet ? 1.2 : .8) : wet ? .75 : 1) * (p.mt === 'fester' ? 1 + .07 * (p.esc || 0) : 1);
        if (p.mt === 'megalodon' && r.state === 'playing') { const f = wet ? 0 : 1; if (f !== p.form) { p.form = f; bcast(r, { t: 'fx', kind: 'splash', x: p.x, y: p.y, c: '#bfe8ff' }); if (!p.bot) send(p, { t: 'event', msg: f ? 'You haul yourself onto land in your giant humanoid shark form.' : 'You slip back into the sea as a colossal shark.', kind: 'good' }); } }
        if (p.mt === 'drnowhere' && r.state === 'playing') { if (!p.formT) { p.form = 0; p.formT = t + DN_PERIOD; } else if (t > p.formT) { p.form = (p.form + 1) % DN_FORMS.length; p.formT = t + DN_PERIOD; bcast(r, { t: 'fx', kind: 'poof', x: p.x, y: p.y, c: '#111' }); send(p, { t: 'event', msg: `You shapeshift into ${DN_FORMS[p.form].name}: ${DN_FORMS[p.form].ability} — ${DN_FORMS[p.form].desc}`, kind: 'good' }); bcast(r, { t: 'sfx', kind: 'shift', x: p.x, y: p.y }); } }
        if (p.mt === 'wendigo' && r.state === 'playing') { if (!p.formT) { p.form = 0; p.formT = t + DN_PERIOD; } else if (t > p.formT) { p.form = (p.form + 1) % WG_FORMS.length; p.formT = t + DN_PERIOD; bcast(r, { t: 'fx', kind: 'poof', x: p.x, y: p.y, c: '#d8ccb0' }); send(p, { t: 'event', msg: `Your bones crack and twist — ${WG_FORMS[p.form].name}: ${WG_FORMS[p.form].ability} — ${WG_FORMS[p.form].desc}`, kind: 'good' }); bcast(r, { t: 'sfx', kind: 'crack', x: p.x, y: p.y }); } }
        if ((p.mt === 'trex' || p.mt === 'spinosaurus') && r.state === 'playing' && Math.random() < dt / 22) bcast(r, { t: 'sfx', kind: p.mt === 'trex' ? 'trexroar' : 'spinoroar', x: Math.round(p.x), y: Math.round(p.y), idle: 1 }); // the occasional idle roar
        if (p.st.down > t) sp = 0; else if (p.hp <= 0) { p.hp = p.maxHp; p.st.guard = t + 2.5; } // gets back up with full health
      }
      else if (!p.alive || p.escaped || p.role === 'ghost') sp = 260;
      else {
        const canSprint = !(p.st.grey > t) && p.stamina > 1;
        const sprinting = k.sprint && len && canSprint;
        p.stamina = clamp(p.stamina + (sprinting ? (p.st.boost > t ? 0 : -32) : 14) * dt, 0, 100);
        sp = (sprinting ? 245 : 150) * (p.st.adren > t ? 1.3 : 1);
        const wet = r.state === 'playing' && !p.boat && inWater(r.map, p.x, p.y);
        if (wet) { sp = r.map.islands ? 95 : sp * .6; p.st.swim = t + .3; if (r.map.islands) p.stamina = clamp(p.stamina - 18 * dt, 0, 100); }
        if (p.boat) sp = 0;
        if (p.st.slow > t) sp *= .5;
        if (p.st.stun > t || p.st.root > t) sp = 0;
        if (p.st.spd > t) sp *= GEAR.speed.mult;
        if (p.st.grav > t && !(p.st.spd > t)) sp *= GEAR.grav.mult;
      }
      if (r.state === 'lobby' && !p.boat) sp = p.seated ? 0 : 200;
      if (p.boat && boatOf(r, p) && boatOf(r, p).by === p.id && (r.state === 'playing' || r.state === 'lobby')) driveVehicle(r, p, len ? dx : 0, len ? dy : 0, dt, !len);
      else if (len && sp) {
        if ((!p.alive || p.escaped || p.role === 'ghost') && r.state === 'playing') { p.x = clamp(p.x + dx * sp * dt, 20, r.map.w - 20); p.y = clamp(p.y + dy * sp * dt, 20, r.map.h - 20); }
        else moveEnt(r.map, p, dx * sp * dt, dy * sp * dt);
      }
      if (p.boat) { const b = boatOf(r, p); if (b) { p.x = b.x; p.y = b.y; if (len && b.by === p.id) p.a = b.a; } else p.boat = null; }
      if (r.state === 'playing' && p.role === 'survivor' && p.alive && !p.escaped) {
        if (!p.bot && (p.fire || p.fireEdge)) useItem(r, p, p.fireEdge);
        p.fireEdge = false;
        for (let i = r.items.length - 1; i >= 0; i--) { const it = r.items[i]; if (Math.hypot(it.x - p.x, it.y - p.y) < 30 && !(it.np === p.id && t < it.npUntil) && pickup(r, p, it)) r.items.splice(i, 1); }
      }
    }
    if (r.state === 'lobby') { r.boarded = [...r.players.values()].filter(p => p.seated).map(p => p.id); }
    if (r.state === 'playing') {
      const surv = [...r.players.values()].filter(p => p.role === 'survivor' && p.alive && !p.escaped);
      for (const m of r.players.values()) if (m.role === 'monster') {
        if (m.st.down > t || t < m.hitUntil) continue;
        const reach = (m.r + 16 + 8) * (m.st.reach > t ? 3 : 1) * (m.mt === 'fester' && m.esc >= 4 ? 1.5 : 1) + (m.st.guard > t && m.mt === 'gargoyle' ? -999 : 0);
        const s = surv.find(s => s.alive && dist(s, m) < reach + (s.boat ? 18 : 0));
        if (s) {
          const v = s.boat && boatOf(r, s);
          if (v && v.hp > 0) { m.hitUntil = t + .85; v.hp -= 24; s.hp = Math.max(1, s.hp - 8); send(s, { t: 'hurt' }); send(s, { t: 'event', msg: `The ${vehDef(v.kind).name} is hit (${Math.max(0, Math.ceil(v.hp))} left).`, kind: 'bad' }); if (v.hp <= 0) { const riders = [...v.seats]; for (const id of riders) { const q = r.players.get(id); if (q) { leaveBoat(r, q, true); q.st.stun = Math.max(q.st.stun || 0, t + 1.5); } } } }
          else { m.hitUntil = t + .85; hurtSurvivor(r, s, MON_DMG, m); }
        }
      }
      phase2Tick(r, t, dt, surv);
      for (const s of surv) {
        if (!s.alive) continue;
        const ti = r.traps.findIndex(tr => Math.hypot(tr.x - s.x, tr.y - s.y) < 26);
        if (ti >= 0) { s.st.root = t + 2.2; r.traps.splice(ti, 1); send(s, { t: 'event', msg: 'You stepped in a cupcake trap!', kind: 'bad' }); }
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
    const ps = [], om = [];
    for (const p of all) {
      if (p !== me && r.state === 'playing') {
        const pGhost = !p.alive || p.escaped || p.role === 'ghost';
        if (pGhost && !meGhost) continue;                                       // ghosts invisible to the living
        if (!meGhost && me.role === 'survivor' && p.role === 'monster' && p.st.invis > t) continue;
        if (!meGhost && me.role === 'monster' && p.role === 'survivor' && p.st.cloak > t && dist(p, me) > 70 && !(p.st.reveal > t) && !(me.st.sight > t)) continue;
        if (!meGhost && me.role === 'survivor' && p.role === 'monster' && MONSTERS[p.mt].sea && !(p.st.surf > t) && inWater(r.map, p.x, p.y) && dist(p, me) > 280) { // submerged: only its telltale sign shows
          const d = dist(p, me); if (d < (p.mt === 'cthulhu' ? 2600 : 1800)) om.push([Math.round(p.x), Math.round(p.y), p.mt, +p.a.toFixed(2)]); continue; }
        if (!meGhost && me.role === 'monster' && p.role === 'survivor' && hidden(r, p) && dist(p, me) > 90 && !(p.st.reveal > t) && !(me.st.sight > t)) continue;
      }
      const st = {}; for (const k in p.st) if (p.st[k] > t) st[k] = 1;
      if (me.role === 'monster' && me.st.sight > t && p.role === 'survivor') st.reveal = 1;
      const q = { id: p.id, n: p.name, c: p.color, x: Math.round(p.x), y: Math.round(p.y), a: +p.a.toFixed(2), role: p.role, mt: p.mt, al: p.alive, es: p.escaped, h: r.host === p.id, b: p.bot, st, sc: p.score, lk: lookStr(p.look), sk: p.role === 'monster' ? p.skin : undefined, fm: p.role === 'monster' && ['drnowhere', 'megalodon', 'fester', 'wendigo'].includes(p.mt) ? monForm(r, p) : undefined, bt: p.boat || undefined, pf: r.state === 'lobby' ? p.pref : undefined, em: p.emoteUntil > t ? p.emote : undefined, seat: p.seated ? 1 : undefined };
      if (r.state === 'playing') { q.hp = Math.round(p.hp / p.maxHp * 100); if (p.role === 'survivor') { const s = p.inv[p.sel]; q.w = s ? s.k : null; q.ar = (p.vest > 0 ? 1 : 0) | (p.helmet > 0 ? 2 : 0); } }
      ps.push(q);
    }
    const o = { t: 's', state: r.state, ps, ex: r.extract, max: r.max, boarded: r.boarded || [],
      tl: r.state === 'playing' ? Math.max(0, Math.ceil(r.roundEnd - t)) : r.state === 'flight' ? Math.ceil(r.flightEnd - t) : r.state === 'results' ? Math.ceil(r.resultsEnd - t) : 0,
      me: { esc: me.esc || 0, fm: me.form || 0, fmT: me.formT ? Math.max(0, Math.ceil(me.formT - t)) : 0, stamina: Math.round(me.stamina), cd: Math.max(0, +(me.cdUntil - t).toFixed(1)), hp: Math.ceil(me.hp), mhp: me.maxHp, inv: me.inv.map(s => s ? [s.k, s.n] : 0), sel: me.sel, ammo: me.ammo, vest: Math.round(me.vest), helmet: Math.round(me.helmet), gear: gearState(me, t) }, rl: r.roundLen };
    if (om.length) o.om = om;
    if (r.vehicles && (r.state === 'playing' || r.state === 'lobby')) o.bt = r.vehicles.filter(b => Math.abs(b.x - me.x) < 2600 && Math.abs(b.y - me.y) < 2600).map(b => [b.id, Math.round(b.x), Math.round(b.y), +b.a.toFixed(2), VEH_CODE[b.kind] || 0, b.by || 0, Math.round(b.fuel), Math.round(b.hp), Math.round(b.spd)]);
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
          bindVehicles(nr, LOBBY.vehicles); rooms.set(nr.code, nr); p = makePlayer(clean(m.player, 16) || 'Player', ws); nr.host = p.id; addToRoom(nr, p); break; }
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
        case 'open': if (r) { if (p.boat) leaveBoat(r, p); else if (r.state === 'lobby') { if (!board(r, p) && !sitLobby(r, p)) send(p, { t: 'event', msg: 'Walk up to a vehicle or the helicopter door, then press E.', kind: 'info' }); } else if (p.sleeping) { wake(p); send(p, { t: 'event', msg: 'You woke up.' }); } else if (nearestVeh(r, p) && board(r, p)) { /* entered a vehicle before looting */ } else if (tryExtract(r, p)) { /* boarded the extraction helicopter */ } else if (!openLoot(r, p) && !board(r, p)) toggleSleep(r, p); } break;
        case 'gear': if (r && p) useGear(r, p, m.k); break;
        case 'admin': if (r && p) adminDo(r, p, m); else if (p) adminReject(p); break;
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
        case 'emote': if (p) { const e = EMOTE_ALIAS[m.e] || m.e; if (EMOTES.includes(e) && (e === 'wave' || (p.emotes && p.emotes.has(e)))) { p.emote = e; p.emoteUntil = now() + (EMOTE_LEN[e] || 3); } } break;
        case 'profile': if (p) { p.look = cleanLook(m.look); { const pf = m.pref === 'monochrome' ? 'boisvert' : m.pref; p.pref = MKEYS.includes(pf) ? pf : null; } p.skin = MSKINS.includes(m.skin) ? m.skin : 'classic'; p.kit = (Array.isArray(m.kit) ? m.kit : []).filter(k => SUPPLIES.includes(k)).slice(0, KIT_MAX); p.gearOwned = (Array.isArray(m.gear) ? m.gear : []).filter(k => GEAR_KEYS.includes(k)); p.gearOn = (Array.isArray(m.gearOn) ? m.gearOn : []).filter(k => p.gearOwned.includes(k)); p.emotes = new Set(['wave']); for (const raw of (Array.isArray(m.emotes) ? m.emotes : [])) { const e = EMOTE_ALIAS[raw] || raw; if (EMOTES.includes(e)) p.emotes.add(e); } if (r) bcast(r, { t: 'event', msg: p.pref ? `${p.name} wants to play ${MONSTERS[p.pref].name}` : `${p.name} updated their look`, kind: '' }); } break;
        case 'leave': if (p) { removeFromRoom(p); p = null; } break;
      }
    },
    close() { if (p) removeFromRoom(p); p = null; }
  };
}
const api = { STORES, LOBBY, genMap, THEMES, inWater, DN_FORMS, WG_FORMS, useAbility, handleConnection, step, rooms, MONSTERS, ITEMS, TICK, MAX_CAP, roomInfo, ROUND_LENS, HATS, ACCS, MSKINS, GEAR, EMOTES, ownerAuthorized, VEH_DEF, VEH_CODE };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.NightHuntCore = api;
})(typeof self !== 'undefined' ? self : this);
