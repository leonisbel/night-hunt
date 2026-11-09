// Mall locker. Cards open a 3D showcase. Buying and equipping are separate buttons inside it.
import { migrateProfile, claimDaily, START_COINS, DAILY_FREE } from './save.js';
import { EMOTES } from './emotes.js';
import { openShowcase, closeShowcase } from './showcase.js';
import { buildSurvivor, buildMonster, buildItem, buildPet, applySkin } from './models.js';
import * as THREE from '../vendor/three.module.min.js';

export const SHOP = [
  { id: 'hat:cap', name: 'Baseball Cap', price: 50, icon: '🧢' }, { id: 'hat:beanie', name: 'Beanie', price: 50, icon: '🧶' }, { id: 'hat:hardhat', name: 'Hard Hat', price: 100, icon: '⛑️' },
  { id: 'hat:cowboy', name: 'Cowboy Hat', price: 120, icon: '🤠' }, { id: 'hat:headphones', name: 'Headphones', price: 150, icon: '🎧' }, { id: 'hat:bunny', name: 'Bunny Ears', price: 200, icon: '🐰' },
  { id: 'hat:tophat', name: 'Top Hat', price: 180, icon: '🎩' }, { id: 'hat:pirate', name: 'Pirate Hat', price: 220, icon: '🏴‍☠️' }, { id: 'hat:witch', name: 'Witch Hat', price: 220, icon: '🧙' },
  { id: 'hat:horns', name: 'Devil Horns', price: 250, icon: '😈' }, { id: 'hat:viking', name: 'Viking Helmet', price: 260, icon: '🪖' }, { id: 'hat:halo', name: 'Halo', price: 300, icon: '😇' }, { id: 'hat:crown', name: 'Golden Crown', price: 500, icon: '👑' },
  { id: 'acc:glasses', name: 'Glasses', price: 40, icon: '👓' }, { id: 'acc:scarf', name: 'Red Scarf', price: 60, icon: '🧣' }, { id: 'acc:bandana', name: 'Bandana', price: 70, icon: '🟥' }, { id: 'acc:mask', name: 'Face Mask', price: 80, icon: '😷' },
  { id: 'acc:backpack', name: 'Backpack', price: 90, icon: '🎒' }, { id: 'acc:goggles', name: 'Night Goggles', price: 120, icon: '🥽' }, { id: 'acc:chain', name: 'Gold Chain', price: 150, icon: '📿' },
  { id: 'acc:cape', name: 'Hero Cape', price: 200, icon: '🦸' }, { id: 'acc:wings', name: 'Angel Wings', price: 400, icon: '🪽' },
];
export const OUTFITS = [
  { id: 'of:scout', name: 'Scout', price: 120, icon: '🏕️' }, { id: 'of:pajamas', name: 'Pajamas', price: 100, icon: '🛌' }, { id: 'of:ranger', name: 'Park Ranger', price: 150, icon: '🌲' },
  { id: 'of:hunter', name: 'Monster Hunter', price: 180, icon: '🎯' }, { id: 'of:diver', name: 'Scuba Diver', price: 220, icon: '🤿' }, { id: 'of:hazmat', name: 'Hazmat Suit', price: 250, icon: '☣️' },
  { id: 'of:ninja', name: 'Ninja', price: 300, icon: '🥷' }, { id: 'of:ghostbuster', name: 'Ghost Catcher', price: 350, icon: '👻' }, { id: 'of:astronaut', name: 'Astronaut', price: 450, icon: '👨‍🚀' }, { id: 'of:knight', name: 'Knight Armor', price: 500, icon: '🛡️' },
];
export const MSKIN_SHOP = [
  { id: 'skin:shadow', name: 'Shadow', price: 250, icon: '🌑' }, { id: 'skin:toxic', name: 'Toxic', price: 300, icon: '☢️' }, { id: 'skin:frost', name: 'Frost', price: 300, icon: '❄️' },
  { id: 'skin:blood', name: 'Blood Moon', price: 350, icon: '🌕' }, { id: 'skin:zombie', name: 'Zombie', price: 350, icon: '🧟' }, { id: 'skin:lava', name: 'Lava', price: 400, icon: '🌋' },
  { id: 'skin:neon', name: 'Neon', price: 400, icon: '💜' }, { id: 'skin:ghost', name: 'Ghost', price: 450, icon: '👻' }, { id: 'skin:abyss', name: 'Abyss', price: 500, icon: '🌊' }, { id: 'skin:golden', name: 'Golden', price: 600, icon: '🏆' },
];
export const KIT_MAX = 3;
export const SUPPLY = [
  { k: 'water', name: 'Water Bottle', price: 15, icon: '💧', shop: 'food' }, { k: 'soda', name: 'Soda', price: 15, icon: '🥤', shop: 'food' }, { k: 'chips', name: 'Chips', price: 15, icon: '🍟', shop: 'food' }, { k: 'choco', name: 'Chocolate', price: 20, icon: '🍫', shop: 'food' },
  { k: 'beans', name: 'Canned Beans', price: 25, icon: '🥫', shop: 'food' }, { k: 'energy', name: 'Energy Drink', price: 30, icon: '⚡', shop: 'food' }, { k: 'medkit', name: 'First Aid Kit', price: 60, icon: '🩹', shop: 'food' },
  { k: 'knife', name: 'Knife', price: 40, icon: '🔪', shop: 'weapons' }, { k: 'bat', name: 'Baseball Bat', price: 60, icon: '🏏', shop: 'weapons' }, { k: 'crowbar', name: 'Crowbar', price: 80, icon: '🪝', shop: 'weapons' }, { k: 'axe', name: 'Fire Axe', price: 120, icon: '🪓', shop: 'weapons' },
  { k: 'pistol', name: 'Pistol (+12)', price: 150, icon: '🔫', shop: 'weapons' }, { k: 'shotgun', name: 'Shotgun (+6)', price: 200, icon: '💥', shop: 'weapons' }, { k: 'ammo_light', name: 'Pistol Ammo ×18', price: 30, icon: '🟡', shop: 'weapons' }, { k: 'ammo_shells', name: 'Shells ×8', price: 35, icon: '🔴', shop: 'weapons' },
  { k: 'vest', name: 'Bulletproof Vest', price: 120, icon: '🦺', shop: 'armor' }, { k: 'helmet', name: 'Helmet', price: 80, icon: '⛑️', shop: 'armor' },
];
export const GEAR_SHOP = [
  { id: 'gear:speed', name: 'Speed Coil', price: 450, icon: '🌀', kind: 'speed', blurb: 'Run faster for 8 seconds. 20 second cooldown from the moment you use it. Does not stack with the Gravity Coil’s speed.' },
  { id: 'gear:grav', name: 'Gravity Coil', price: 550, icon: '🌙', kind: 'grav', blurb: 'A light, hopping stride for 6 seconds. 20 second cooldown. A smaller speed bump than the Speed Coil.' },
  { id: 'gear:invis', name: 'Invisibility', price: 900, icon: '👻', kind: 'invis', blurb: 'Monsters lose sight of you beyond a few steps for 5 seconds. They can still find you up close. 20 second cooldown.' },
];
const EMOTE_SHOP = EMOTES.map(e => ({ ...e, id: 'em:' + e.id, emote: e.id }));
export { EMOTES, EMOTE_SHOP };
export const PETS = [
  { id: 'pet:puppy', name: 'Puppy', price: 200, icon: '🐶' }, { id: 'pet:kitty', name: 'Kitty', price: 200, icon: '🐱' }, { id: 'pet:bat', name: 'Bat', price: 250, icon: '🦇' }, { id: 'pet:owl', name: 'Owl', price: 250, icon: '🦉' },
  { id: 'pet:slime', name: 'Slime', price: 300, icon: '🟢' }, { id: 'pet:pumpkin', name: 'Pumpkin', price: 300, icon: '🎃' }, { id: 'pet:ghost', name: 'Ghost', price: 400, icon: '👻' }, { id: 'pet:dragon', name: 'Baby Dragon', price: 600, icon: '🐉' },
];
export const TRAILS = [
  { id: 'tr:fire', name: 'Fire', price: 150, icon: '🔥' }, { id: 'tr:ice', name: 'Ice', price: 150, icon: '🧊' }, { id: 'tr:toxic', name: 'Toxic', price: 150, icon: '☢️' }, { id: 'tr:stars', name: 'Stars', price: 200, icon: '⭐' },
  { id: 'tr:shadow', name: 'Shadow', price: 200, icon: '🌑' }, { id: 'tr:blood', name: 'Blood Drip', price: 250, icon: '🩸' }, { id: 'tr:rainbow', name: 'Rainbow', price: 400, icon: '🌈' },
];
export const CRATE_PRICE = 150;
export const SKIN_TONES = ['#f1c7a5', '#e0ac85', '#c68863', '#9c6644', '#6e4630', '#f6d5b8'];
export const HAIR = ['#2a1c12', '#5a3a1e', '#151210', '#8a5a2a', '#c09050', '#3a2a22'];
const COLORS = ['#c0392b', '#2980b9', '#27ae60', '#8e44ad', '#f39c12', '#16a085', '#d35400', '#2c3e50', '#7f8c8d', '#e84393', '#f1f1f1', '#222222'];
const PANTS = ['#2c3e60', '#3a3a3a', '#4a4030', '#25303f', '#6a5a40', '#1a1a1a', '#5a2a2a', '#2a4a2a'];
const KEY = 'nhProfile';
const TABS = { skinshop: '🧍 Skin Shop', weapons: '🔫 Weapons', armor: '🛡️ Armor', food: '🍔 Food & Drinks', monskins: '👹 Monster Skins', emotes: '💃 Emotes', pets: '🐾 Pets & Trails', clothing: '🪞 Dressing Room', crate: '🎁 Mystery Crates', coins: '🪙 Coin Store' };
const ALIAS = { look: 'clothing', mirror: 'clothing', monster: 'monskins', shop: 'food', skins: 'skinshop' };
const ALL = () => [...SHOP, ...OUTFITS, ...MSKIN_SHOP, ...EMOTE_SHOP, ...PETS, ...TRAILS];
function loadRaw() { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } }
export function loadProfile() {
  const raw = loadRaw();
  const p = migrateProfile(raw);
  if (!raw) p.look.sk = Math.floor(Math.random() * SKIN_TONES.length);
  localStorage.setItem(KEY, JSON.stringify(p));
  return p;
}
export function saveProfile(p) { localStorage.setItem(KEY, JSON.stringify(p)); }

function coilMesh(color) {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color, metalness: .82, roughness: .22, emissive: color, emissiveIntensity: .35 });
  m.userData.previewClone = 1;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.42, .09, 16, 28), m); ring.rotation.x = Math.PI / 2; ring.position.y = .55; g.add(ring);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(.06, .07, .8, 12), m); handle.position.y = .15; g.add(handle);
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, .16, 12), new THREE.MeshStandardMaterial({ color: '#222', roughness: .8 }));
  grip.material.userData.previewClone = 1; grip.position.y = -.2; g.add(grip);
  return g;
}
function survivorLook(P, patch) {
  const L = Object.assign({}, P.look, patch || {});
  return [L.sk, L.hc, L.hs, L.top || '', L.pants || '', L.hat, L.acc, L.of || 'none', 'none', 'none'].join(',');
}

export function initLocker({ onChange, monsters, sfx, preview, onEmote }) {
  const $ = id => document.getElementById(id), P = loadProfile(), el = $('locker');
  let tab = 'clothing', crateMsg = '';
  const owns = id => id === 'em:wave' || P.owned.includes(id) || (id.startsWith('gear:') && P.gear.includes(id.slice(5)));
  const commit = () => { saveProfile(P); render(); onChange(P); preview && preview(P); };
  const card = (s, on) => `<button type="button" class="si ${on ? 'on' : ''}" data-show="${s.id || s.k || ''}"><span>${s.icon || '📦'}</span><b>${s.name}</b><small>${s.price === 0 ? 'Free' : s.price ? '🪙 ' + s.price : 'View'}</small></button>`;
  function sw(list, cur, f, round) { return `<div class="sw" data-f="${f}">${list.map((c, i) => `<button data-v="${i}" class="${cur === i ? 'on' : ''}" style="background:${c}${round ? ';border-radius:50%' : ''}" aria-label="${c}"></button>`).join('')}</div>`; }
  const opts = (f, list, cur, prefix) => `<div class="opts" data-f="${f}"><button data-v="none" class="${cur === 'none' ? 'on' : ''}">None</button>${list.map(s => { const v = s.id.slice(prefix.length); return `<button data-v="${v}" class="${cur === v ? 'on' : ''} ${owns(s.id) ? '' : 'lock'}" title="${s.name}">${s.icon}${owns(s.id) ? '' : ' 🔒'}</button>`; }).join('')}</div>`;
  const findShow = id => ALL().find(s => s.id === id) || GEAR_SHOP.find(s => s.id === id) || SUPPLY.find(s => s.k === id);
  function wear(id) {
    const [kind, v] = id.split(':');
    if (kind === 'hat') P.look.hat = v; if (kind === 'acc') P.look.acc = v; if (kind === 'of') P.look.of = v; if (kind === 'skin') P.skin = v;
    if (kind === 'pet') P.look.pet = v; if (kind === 'tr') P.look.tr = v; if (kind === 'em') P.emote = v;
    if (kind === 'gear') { if (!P.gearOn.includes(v)) P.gearOn.push(v); }
  }
  function unequipGear(v) { P.gearOn = P.gearOn.filter(k => k !== v); }
  function previewOf(s) {
    if (!s) return () => new THREE.Group();
    if (s.k && SUPPLY.some(x => x.k === s.k)) return () => buildItem(s.k);
    if (s.id && s.id.startsWith('gear:')) return () => coilMesh(s.kind === 'grav' ? '#c9b6ff' : s.kind === 'invis' ? '#d7e4ff' : '#7dffb2');
    if (s.id && s.id.startsWith('em:')) return () => buildSurvivor('#3d8bfd', survivorLook(P));
    if (s.id && s.id.startsWith('pet:')) return () => buildPet(s.id.slice(4));
    if (s.id && s.id.startsWith('tr:')) return () => buildSurvivor('#3d8bfd', survivorLook(P, { tr: 'none', pet: 'none' }));
    if (s.id && s.id.startsWith('skin:')) return () => { const m = buildMonster(P.pref || 'freddy'); applySkin(m, s.id.slice(5)); return m; };
    if (s.id && (s.id.startsWith('hat:') || s.id.startsWith('acc:') || s.id.startsWith('of:'))) {
      const patch = {}; const [k, v] = s.id.split(':'); if (k === 'hat') patch.hat = v; if (k === 'acc') patch.acc = v; if (k === 'of') patch.of = v;
      return () => buildSurvivor('#3d8bfd', survivorLook(P, patch));
    }
    if (s.monster) return () => buildMonster(s.monster);
    return () => buildSurvivor('#3d8bfd', survivorLook(P));
  }
  function openItem(s, extra = {}) {
    if (!s) return;
    const id = s.id || s.k;
    const owned = s.monster ? true : s.k ? false : owns(s.id);
    const price = s.price || 0;
    const gearId = s.id && s.id.startsWith('gear:') ? s.id.slice(5) : null;
    const emoteId = s.id && s.id.startsWith('em:') ? s.id.slice(3) : null;
    openShowcase({
      title: s.name,
      blurb: s.blurb || (s.monster ? `${s.ability || ''} · ${s.cd || 20}s cooldown. Choosing a monster is free. Equip sets your preference. It does not spend coins.` : 'Turn the model. Buy and equip are separate — opening this does not spend coins.'),
      price: s.monster ? 0 : price,
      meta: s.monster ? (s.home ? s.home.join(' / ') : 'Any classic map') : (gearId ? `Active ${s.kind === 'invis' ? 5 : s.kind === 'grav' ? 6 : 8}s · cooldown 20s` : ''),
      onBuy: s.monster || price <= 0 && !s.k ? null : () => {
        if (s.k) { if (P.coins < s.price || P.kit.length >= KIT_MAX) return; P.coins -= s.price; P.kit.push(s.k); sfx && sfx('coin'); commit(); openItem(s); return; }
        if (!s.id || owns(s.id) || P.coins < price) return;
        P.coins -= price;
        if (gearId) { if (!P.gear.includes(gearId)) P.gear.push(gearId); }
        else P.owned.push(s.id);
        sfx && sfx('coin'); commit(); openItem(s);
      },
      buyLabel: s.k ? `Pack for next round · 🪙 ${s.price}` : `Buy · 🪙 ${price}`,
      buyDisabled: s.k ? (P.coins < price || P.kit.length >= KIT_MAX) : (owned || P.coins < price),
      onEquip: (s.monster || (s.id && !s.k && (owned || price === 0))) ? () => {
        if (s.monster) P.pref = s.monster;
        else if (gearId && P.gearOn.includes(gearId)) unequipGear(gearId);
        else wear(s.id);
        sfx && sfx('click'); commit(); openItem(s);
      } : null,
      equipLabel: s.monster ? (P.pref === s.monster ? 'Preferred' : 'Set as my monster') : gearId ? (P.gearOn.includes(gearId) ? 'Unequip' : 'Equip') : (emoteId && P.emote === emoteId ? 'Selected' : 'Equip'),
      equipDisabled: s.monster ? P.pref === s.monster : false,
      onPlay: emoteId && (owned || price === 0) ? () => { P.emote = emoteId; commit(); onEmote && onEmote(emoteId); } : null,
      playLabel: 'Play',
      build: previewOf(s),
      emote: emoteId || null,
      animate: s.id && s.id.startsWith('tr:') ? (model, t) => {
        const hue = s.id.endsWith('rainbow') ? (t * 0.4) % 1 : null;
        const col = { fire: '#ff7a1a', ice: '#9ae8ff', toxic: '#7aff3a', stars: '#fff2a0', shadow: '#6a4a9a', blood: '#8a1010', rainbow: '#fff' }[s.id.slice(3)] || '#fff';
        if (!model.userData.puffs) { model.userData.puffs = []; for (let i = 0; i < 6; i++) { const mm = new THREE.Mesh(new THREE.SphereGeometry(.08, 8, 6), new THREE.MeshBasicMaterial({ color: col })); mm.material.userData.previewClone = 1; model.add(mm); model.userData.puffs.push(mm); } }
        model.userData.puffs.forEach((m, i) => { m.position.set(-.25, .4 + Math.sin(t * 3 + i) * .1, -.4 - i * .12); if (hue != null) m.material.color.setHSL((hue + i * .08) % 1, 1, .6); });
      } : null,
      ...extra,
    });
  }
  function render() {
    $('coins').textContent = P.coins; document.querySelectorAll('.coinv').forEach(e => e.textContent = P.coins);
    const L = P.look, M = monsters();
    let h = `<div class="ltabs">${Object.entries(TABS).map(([t, n]) => `<button data-t="${t}" class="${t === tab ? 'on' : ''}">${n}</button>`).join('')}</div>`;
    h += `<p class="lt">Tap an item to open it in the showcase. Looking does not buy it.</p>`;
    const kitNote = `<p class="lt">Packed for the next round: ${P.kit.length}/${KIT_MAX}${P.kit.length ? ' ' + P.kit.map(k => SUPPLY.find(x => x.k === k)?.icon || k).join(' ') : ''}. Supplies are handed out when the round starts.</p>`;
    if (tab === 'clothing') {
      h += `<p class="lt">Skin tone</p>${sw(SKIN_TONES, L.sk, 'sk', 1)}<p class="lt">Hair colour</p>${sw(HAIR, L.hc, 'hc', 1)}
      <p class="lt">Hair style</p><div class="opts" data-f="hs">${['Short', 'Long', 'Bun', 'Buzz'].map((n, i) => `<button data-v="${i}" class="${L.hs === i ? 'on' : ''}">${n}</button>`).join('')}</div>
      <p class="lt">Outfit</p>${opts('of', OUTFITS, L.of || 'none', 'of:')}
      <p class="lt">Jacket</p><div class="sw" data-f="top"><button data-v="" class="${!L.top ? 'on' : ''}" title="player colour">★</button>${COLORS.map(c => `<button data-v="${c}" class="${L.top === c ? 'on' : ''}" style="background:${c}"></button>`).join('')}</div>
      <p class="lt">Pants</p><div class="sw" data-f="pants">${PANTS.map(c => `<button data-v="${c}" class="${L.pants === c ? 'on' : ''}" style="background:${c}"></button>`).join('')}</div>
      <p class="lt">Hat</p>${opts('hat', SHOP.filter(s => s.id.startsWith('hat:')), L.hat, 'hat:')}
      <p class="lt">Accessory</p>${opts('acc', SHOP.filter(s => s.id.startsWith('acc:')), L.acc, 'acc:')}
      <h4>Hats</h4><div class="shop">${SHOP.filter(s => s.id.startsWith('hat:')).map(s => card(s, P.look.hat === s.id.slice(4))).join('')}</div>
      <h4>Accessories</h4><div class="shop">${SHOP.filter(s => s.id.startsWith('acc:')).map(s => card(s, P.look.acc === s.id.slice(4))).join('')}</div>`;
    } else if (tab === 'monskins') {
      h += `<p class="lt">If the round picks you as a monster, play as:</p><div class="mgrid">${[{ id: '', name: 'Random', icon: '🎲' }, ...Object.entries(M).map(([k, m]) => ({ id: k, name: m.name, icon: '👹', ability: m.ability, cd: m.cd, home: m.home }))].map(m => `<button type="button" class="si ${(!m.id && !P.pref) || P.pref === m.id ? 'on' : ''}" data-mon="${m.id}"><span>${m.icon}</span><b>${m.name}</b><small>${m.ability || 'The round decides'}</small></button>`).join('')}</div>
      <h4>Monster skins</h4><div class="shop">${MSKIN_SHOP.map(s => card(s, P.skin === s.id.slice(5))).join('')}</div>`;
    } else if (tab === 'skinshop') {
      h += `<div class="shop">${OUTFITS.map(s => card(s, P.look.of === s.id.slice(3))).join('')}</div>`;
    } else if (tab === 'weapons') {
      h += kitNote + `<div class="shop">${SUPPLY.filter(s => s.shop === 'weapons').map(s => card(s, false)).join('')}</div><h4>Survivor gear</h4><p class="lt">Coils are equipped here and used in a round (Z speed, X gravity, C invisibility, or the on-screen buttons). Each has a 20 second cooldown.</p><div class="shop">${GEAR_SHOP.map(s => card(s, P.gearOn.includes(s.id.slice(5)))).join('')}</div>`;
    } else if (tab === 'armor') {
      h += kitNote + `<div class="shop">${SUPPLY.filter(s => s.shop === 'armor').map(s => card(s, false)).join('')}</div>`;
    } else if (tab === 'food') {
      h += `<p class="lt">Coins come from rounds: escape +60 · survive +10 · open a chest +5 · knock a monster down +25 · catch +40. The coin kiosk outside the mall does not sell coins for real money.</p>` + kitNote + `<div class="shop">${SUPPLY.filter(s => s.shop === 'food').map(s => card(s, false)).join('')}</div>`;
    } else if (tab === 'emotes') {
      h += `<p class="lt">These dances are original poses made for Night Hunt. Hold B or the emote button for the wheel. Tap B to play the equipped one. Everyone in the room sees it.</p><div class="shop">${EMOTE_SHOP.map(s => card(s, P.emote === s.emote)).join('')}</div>`;
    } else if (tab === 'pets') {
      h += `<h4>Pets</h4><div class="shop"><button type="button" class="si ${P.look.pet === 'none' ? 'on' : ''}" data-wear="pet:none"><span>🚫</span><b>No pet</b><small>Equip</small></button>${PETS.map(s => card(s, P.look.pet === s.id.slice(4))).join('')}</div>
      <h4>Trails</h4><div class="shop"><button type="button" class="si ${P.look.tr === 'none' ? 'on' : ''}" data-wear="tr:none"><span>🚫</span><b>No trail</b><small>Equip</small></button>${TRAILS.map(s => card(s, P.look.tr === s.id.slice(3))).join('')}</div>`;
    } else if (tab === 'crate') {
      const left = ALL().filter(s => s.price > 0 && !owns(s.id)).length;
      h += `<p class="lt">A crate costs 🪙 ${CRATE_PRICE} and gives a random cosmetic you do not own yet. ${left} left.</p>
      <div class="crate"><div class="crbox" id="crbox">🎁</div><button data-crate="1" ${P.coins < CRATE_PRICE || !left ? 'disabled' : ''}>Open crate · 🪙 ${CRATE_PRICE}</button><div class="crmsg" id="crmsg">${crateMsg}</div></div>`;
    } else if (tab === 'coins') {
      const today = new Date().toISOString().slice(0, 10);
      const claimed = P.daily === today;
      h += `<p class="lt">You start with 🪙 ${START_COINS}. Existing saves were topped up once if they had less, and are not reset again.</p>
      <div class="shop"><button type="button" class="si" data-daily="1"><span>🎁</span><b>Free daily reward</b><small>${claimed ? 'Already claimed today' : 'Free reward · +' + DAILY_FREE}</small></button>
      <button type="button" class="si" data-pack="1"><span>💳</span><b>Coin packs</b><small>Payments not set up</small></button></div>
      <p class="lt">Paid coin packs stay off. There is no checkout and nothing here pretends a purchase went through.</p>`;
    }
    $('lbody').innerHTML = h;
    $('lbody').querySelectorAll('.ltabs button').forEach(b => b.onclick = () => { tab = b.dataset.t; sfx && sfx('click'); render(); });
    $('lbody').querySelectorAll('.sw, .opts').forEach(box => { const f = box.dataset.f; box.querySelectorAll('button').forEach(b => b.onclick = () => {
      const v = b.dataset.v;
      if (b.classList.contains('lock')) { const item = (f === 'of' ? OUTFITS : f === 'hat' || f === 'acc' ? SHOP : []).find(s => s.id.endsWith(':' + v)); if (item) openItem(item); return; }
      if (f === 'sk' || f === 'hc' || f === 'hs') P.look[f] = +v; else if (f === 'hat' || f === 'acc' || f === 'of') P.look[f] = v; else P.look[f] = v || null;
      sfx && sfx('click'); commit(); }); });
    $('lbody').querySelectorAll('[data-show]').forEach(b => b.onclick = () => { const s = findShow(b.dataset.show) || EMOTES.map(e => ({ ...e, id: 'em:' + e.id })).find(e => e.id === b.dataset.show); openItem(s); });
    $('lbody').querySelectorAll('[data-mon]').forEach(b => b.onclick = () => {
      const id = b.dataset.mon;
      if (!id) { P.pref = null; sfx && sfx('click'); commit(); return; }
      const m = M[id] || { name: id };
      openItem({ id: 'mon:' + id, name: m.name, monster: id, ability: m.ability, cd: m.cd || 20, home: m.home, icon: '👹', price: 0 });
    });
    $('lbody').querySelectorAll('[data-wear]').forEach(b => b.onclick = () => { wear(b.dataset.wear); sfx && sfx('click'); commit(); });
    $('lbody').querySelectorAll('[data-crate]').forEach(b => b.onclick = () => openCrate());
    const daily = $('lbody').querySelector('[data-daily]');
    if (daily) daily.onclick = () => openShowcase({
      title: 'Free daily reward',
      blurb: `This is a free reward, not a purchase. It adds ${DAILY_FREE} coins once each day. It does not charge money.`,
      price: 0,
      meta: P.daily === new Date().toISOString().slice(0, 10) ? 'Already claimed today' : 'Available now',
      onBuy: () => { const r = claimDaily(P); if (!r.ok) return; sfx && sfx('coin'); commit(); closeShowcase(); },
      buyLabel: 'Claim free reward',
      buyDisabled: P.daily === new Date().toISOString().slice(0, 10),
      build: () => coilMesh('#ffd76b'),
    });
    const pack = $('lbody').querySelector('[data-pack]');
    if (pack) pack.onclick = () => openShowcase({
      title: 'Coin packs',
      blurb: 'Paid coin purchases are disabled. Night Hunt has no payment provider and no trusted fulfillment, so this button cannot take money or grant coins.',
      price: 0,
      meta: 'Not for sale',
      onBuy: () => {},
      buyLabel: 'Payments not set up',
      buyDisabled: true,
      build: () => coilMesh('#888'),
    });
  }
  function openCrate() {
    const pool = ALL().filter(s => s.price > 0 && !owns(s.id)); if (!pool.length || P.coins < CRATE_PRICE) return;
    P.coins -= CRATE_PRICE; const win = pool[Math.floor(Math.random() * pool.length)]; P.owned.push(win.id); saveProfile(P);
    const box = $('crbox'), btn = $('lbody').querySelector('[data-crate]'); if (btn) btn.disabled = true; sfx && sfx('click'); let n = 0;
    const spin = setInterval(() => { const r = pool[Math.floor(Math.random() * pool.length)]; if (box) { box.textContent = r.icon; box.classList.add('rolling'); } if (++n >= 14) { clearInterval(spin);
      crateMsg = `You won <b>${win.icon} ${win.name}</b>. It is in your collection. Equip it from its showcase.`; sfx && sfx('coin'); render(); const b2 = $('crbox'); if (b2) { b2.textContent = win.icon; b2.classList.add('won'); } onChange(P); } }, 90);
  }
  const show = t => { if (t) tab = ALIAS[t] || (TABS[t] ? t : tab); el.classList.remove('hide'); document.body.classList.add('lockeron'); render(); preview && preview(P); };
  const hide = () => { closeShowcase(); el.classList.add('hide'); document.body.classList.remove('lockeron'); preview && preview(null); };
  document.querySelectorAll('.blocker').forEach(b => b.onclick = () => { if (el.classList.contains('hide')) show(b.dataset.tab); else hide(); });
  $('lclose').onclick = hide;
  render();
  return { profile: P, addCoins(n) { P.coins += n; saveProfile(P); render(); }, render, open: show, close: hide, get isOpen() { return !el.classList.contains('hide'); }, get tab() { return tab; }, emote: () => P.emote || 'wave',
    kitUsed(list) { for (const k of list || []) { const i = P.kit.indexOf(k); if (i >= 0) P.kit.splice(i, 1); } saveProfile(P); render(); } };
}
