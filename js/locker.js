// Lobby shopping street (v1.4.1): nine stores. Was: the Dressing Room (survivor look), Monster pick, the Item Counter (hats, accessories, round supplies)
// and the Skins Gallery (survivor outfits + monster skins). Everything is bought with in-game coins earned in rounds (never real money).
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
// one-round supplies: up to 3 are packed into your inventory when the next round starts (food, weapons, ammo and armor shops)
export const KIT_MAX = 3;
export const SUPPLY = [
  { k: 'water', name: 'Water Bottle', price: 15, icon: '💧', shop: 'food' }, { k: 'soda', name: 'Soda', price: 15, icon: '🥤', shop: 'food' }, { k: 'chips', name: 'Chips', price: 15, icon: '🍟', shop: 'food' }, { k: 'choco', name: 'Chocolate', price: 20, icon: '🍫', shop: 'food' },
  { k: 'beans', name: 'Canned Beans', price: 25, icon: '🥫', shop: 'food' }, { k: 'energy', name: 'Energy Drink', price: 30, icon: '⚡', shop: 'food' }, { k: 'medkit', name: 'First Aid Kit', price: 60, icon: '🩹', shop: 'food' },
  { k: 'knife', name: 'Knife', price: 40, icon: '🔪', shop: 'weapons' }, { k: 'bat', name: 'Baseball Bat', price: 60, icon: '🏏', shop: 'weapons' }, { k: 'crowbar', name: 'Crowbar', price: 80, icon: '🪝', shop: 'weapons' }, { k: 'axe', name: 'Fire Axe', price: 120, icon: '🪓', shop: 'weapons' },
  { k: 'pistol', name: 'Pistol (+12)', price: 150, icon: '🔫', shop: 'weapons' }, { k: 'shotgun', name: 'Shotgun (+6)', price: 200, icon: '💥', shop: 'weapons' }, { k: 'ammo_light', name: 'Pistol Ammo ×18', price: 30, icon: '🟡', shop: 'weapons' }, { k: 'ammo_shells', name: 'Shells ×8', price: 35, icon: '🔴', shop: 'weapons' },
  { k: 'vest', name: 'Bulletproof Vest', price: 120, icon: '🦺', shop: 'armor' }, { k: 'helmet', name: 'Helmet', price: 80, icon: '⛑️', shop: 'armor' },
];
export const EMOTES = [
  { id: 'em:wave', name: 'Wave', price: 0, icon: '👋' }, { id: 'em:dance', name: 'Dance', price: 80, icon: '💃' }, { id: 'em:spin', name: 'Spin', price: 60, icon: '🌀' }, { id: 'em:jump', name: 'Jump Jacks', price: 60, icon: '🤸' },
  { id: 'em:flex', name: 'Flex', price: 100, icon: '💪' }, { id: 'em:floss', name: 'Floss', price: 150, icon: '🕺' }, { id: 'em:zombie', name: 'Zombie Walk', price: 120, icon: '🧟' }, { id: 'em:scream', name: 'Scream', price: 120, icon: '😱' },
];
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
// v1.4.1: one tab per store on the lobby shopping street
const TABS = { skinshop: '🧍 Skin Shop', weapons: '🔫 Weapons', armor: '🛡️ Armor', food: '🍔 Food & Drinks', monskins: '👹 Monster Skins', emotes: '💃 Emotes', pets: '🐾 Pets & Trails', clothing: '🪞 Dressing Room', crate: '🎁 Mystery Crates' };
const ALIAS = { look: 'clothing', mirror: 'clothing', monster: 'monskins', shop: 'food', skins: 'skinshop' };
const ALL = () => [...SHOP, ...OUTFITS, ...MSKIN_SHOP, ...EMOTES, ...PETS, ...TRAILS];
export function loadProfile() {
  let p; try { p = JSON.parse(localStorage.getItem(KEY)); } catch { }
  p = Object.assign({ coins: 0, owned: [], look: { sk: Math.floor(Math.random() * 6), hc: 0, hs: 0, top: null, pants: null, hat: 'none', acc: 'none', of: 'none', pet: 'none', tr: 'none' }, pref: null, skin: 'classic', kit: [], emote: 'wave' }, p || {});
  if (!p.look.of) p.look.of = 'none'; if (!p.look.pet) p.look.pet = 'none'; if (!p.look.tr) p.look.tr = 'none'; if (!Array.isArray(p.kit)) p.kit = []; if (!p.owned.includes('em:wave')) p.owned.push('em:wave');
  return p;
}
export function saveProfile(p) { localStorage.setItem(KEY, JSON.stringify(p)); }

export function initLocker({ onChange, monsters, sfx, preview, onEmote }) {
  const $ = id => document.getElementById(id), P = loadProfile(), el = $('locker');
  let tab = 'clothing', crateMsg = '';
  const owns = id => P.owned.includes(id);
  const commit = () => { saveProfile(P); render(); onChange(P); preview && preview(P); };
  const card = (s, on, extra = '') => `<div class="si ${on ? 'on' : ''}"><span>${s.icon}</span><b>${s.name}</b>${extra}</div>`;
  const buyBtn = s => owns(s.id) ? `<button data-wear="${s.id}" class="wear">Wear</button>` : `<button data-buy="${s.id}" ${P.coins < s.price ? 'disabled' : ''}>🪙 ${s.price}</button>`;
  function sw(list, cur, f, round) { return `<div class="sw" data-f="${f}">${list.map((c, i) => `<button data-v="${i}" class="${cur === i ? 'on' : ''}" style="background:${c}${round ? ';border-radius:50%' : ''}" aria-label="${c}"></button>`).join('')}</div>`; }
  const opts = (f, list, cur, prefix) => `<div class="opts" data-f="${f}"><button data-v="none" class="${cur === 'none' ? 'on' : ''}">None</button>${list.map(s => { const v = s.id.slice(prefix.length); return `<button data-v="${v}" class="${cur === v ? 'on' : ''} ${owns(s.id) ? '' : 'lock'}" title="${s.name}">${s.icon}${owns(s.id) ? '' : ' 🔒'}</button>`; }).join('')}</div>`;
  function render() {
    $('coins').textContent = P.coins; document.querySelectorAll('.coinv').forEach(e => e.textContent = P.coins);
    const L = P.look, M = monsters();
    let h = `<div class="ltabs">${Object.entries(TABS).map(([t, n]) => `<button data-t="${t}" class="${t === tab ? 'on' : ''}">${n}</button>`).join('')}</div>`;
    const kitRow = shop => `<h4>🎒 Packed for next round <small>(${P.kit.length}/${KIT_MAX}${P.kit.length ? ': ' + P.kit.map(k => SUPPLY.find(x => x.k === k)?.icon || k).join(' ') : ''})</small></h4>
      <div class="shop">${SUPPLY.filter(s => s.shop === shop).map(s => card(s, false, `<button data-kit="${s.k}" ${P.coins < s.price || P.kit.length >= KIT_MAX ? 'disabled' : ''}>🪙 ${s.price}</button>`)).join('')}</div>`;
    if (tab === 'clothing') {
      h += `<p class="lt">Skin tone</p>${sw(SKIN_TONES, L.sk, 'sk', 1)}<p class="lt">Hair colour</p>${sw(HAIR, L.hc, 'hc', 1)}
      <p class="lt">Hair style</p><div class="opts" data-f="hs">${['Short', 'Long', 'Bun', 'Buzz'].map((n, i) => `<button data-v="${i}" class="${L.hs === i ? 'on' : ''}">${n}</button>`).join('')}</div>
      <p class="lt">Outfit <small>(buy more in the Skins Gallery)</small></p>${opts('of', OUTFITS, L.of || 'none', 'of:')}
      <p class="lt">Jacket</p><div class="sw" data-f="top"><button data-v="" class="${!L.top ? 'on' : ''}" title="player colour">★</button>${COLORS.map(c => `<button data-v="${c}" class="${L.top === c ? 'on' : ''}" style="background:${c}"></button>`).join('')}</div>
      <p class="lt">Pants</p><div class="sw" data-f="pants">${PANTS.map(c => `<button data-v="${c}" class="${L.pants === c ? 'on' : ''}" style="background:${c}"></button>`).join('')}</div>
      <p class="lt">Hat</p>${opts('hat', SHOP.filter(s => s.id.startsWith('hat:')), L.hat, 'hat:')}
      <p class="lt">Accessory</p>${opts('acc', SHOP.filter(s => s.id.startsWith('acc:')), L.acc, 'acc:')}`;
      h += `<h4>🧢 Buy hats</h4><div class="shop">${SHOP.filter(s => s.id.startsWith('hat:')).map(s => card(s, P.look.hat === s.id.slice(4), buyBtn(s))).join('')}</div>
      <h4>🎒 Buy accessories</h4><div class="shop">${SHOP.filter(s => s.id.startsWith('acc:')).map(s => card(s, P.look.acc === s.id.slice(4), buyBtn(s))).join('')}</div>`;
    } else if (tab === 'monskins') {
      h += `<p class="lt">If you're picked as a monster, play as:</p><div class="mgrid" data-f="pref"><button data-v="" class="${!P.pref ? 'on' : ''}">🎲 Random</button>${Object.entries(M).map(([k, m]) => `<button data-v="${k}" class="${P.pref === k ? 'on' : ''}"><b>${m.name}</b><small>${m.ability} · ${m.cd || 20}s</small>${m.home ? `<i>${m.home.join(' / ')}</i>` : ''}</button>`).join('')}</div>
      <p class="lt">Monster skin <small>(buy more in the Skins Gallery)</small></p><div class="opts" data-f="skin"><button data-v="classic" class="${P.skin === 'classic' ? 'on' : ''}">Classic</button>${MSKIN_SHOP.map(s => { const v = s.id.slice(5); return `<button data-v="${v}" class="${P.skin === v ? 'on' : ''} ${owns(s.id) ? '' : 'lock'}">${s.icon} ${s.name}${owns(s.id) ? '' : ' 🔒'}</button>`; }).join('')}</div>`;
      h += `<h4>👹 Buy monster skins</h4><div class="shop">${MSKIN_SHOP.map(s => card(s, P.skin === s.id.slice(5), buyBtn(s))).join('')}</div>`;
    } else if (tab === 'skinshop') {
      h += `<p class="lt">Survivor skins: full outfits that replace your clothes.</p><h4>🧍 Survivor outfits</h4><div class="shop">${OUTFITS.map(s => card(s, P.look.of === s.id.slice(3), buyBtn(s))).join('')}</div>`;
    } else if (tab === 'weapons') {
      h += `<p class="lt">Weapons and ammo are packed into your bag at the start of your next round (max ${KIT_MAX} items, survivors only).</p>` + kitRow('weapons');
    } else if (tab === 'armor') {
      h += `<p class="lt">Armor is worn from the start of your next round.</p>` + kitRow('armor');
    } else if (tab === 'food') {
      h += `<p class="lt">Earn coins every round: escape +60 · survive +10 · open a chest/bag +5 · knock down a monster +25 · catch a survivor +40. Coins are for fun only; they can't be bought with money.</p>` + kitRow('food');
    } else if (tab === 'emotes') {
      h += `<p class="lt">Buy an emote, pick it, then press <b>B</b> (or the 💃 button) anywhere to play it. Everyone nearby sees it.</p><div class="shop">${EMOTES.map(s => card(s, P.emote === s.id.slice(3), owns(s.id) ? `<button data-emote="${s.id.slice(3)}" class="wear">${P.emote === s.id.slice(3) ? '▶ Play' : 'Pick'}</button>` : buyBtn(s))).join('')}</div>`;
    } else if (tab === 'pets') {
      h += `<h4>🐾 Pets <small>(follow you around)</small></h4><div class="shop">${card({ icon: '🚫', name: 'No pet' }, P.look.pet === 'none', '<button data-wear="pet:none" class="wear">Wear</button>')}${PETS.map(s => card(s, P.look.pet === s.id.slice(4), buyBtn(s))).join('')}</div>
      <h4>✨ Trails <small>(glow behind you while you move)</small></h4><div class="shop">${card({ icon: '🚫', name: 'No trail' }, P.look.tr === 'none', '<button data-wear="tr:none" class="wear">Wear</button>')}${TRAILS.map(s => card(s, P.look.tr === s.id.slice(3), buyBtn(s))).join('')}</div>`;
    } else if (tab === 'crate') {
      const left = ALL().filter(s => s.price > 0 && !owns(s.id)).length;
      h += `<p class="lt">Open a Mystery Crate for 🪙 ${CRATE_PRICE} and win a random cosmetic you don't own yet (hats, accessories, outfits, monster skins, emotes, pets or trails). ${left} items left to win.</p>
      <div class="crate"><div class="crbox" id="crbox">🎁</div><button data-crate="1" ${P.coins < CRATE_PRICE || !left ? 'disabled' : ''}>Open crate · 🪙 ${CRATE_PRICE}</button><div class="crmsg" id="crmsg">${crateMsg}</div></div>`;
    }
    $('lbody').innerHTML = h;
    $('lbody').querySelectorAll('.ltabs button').forEach(b => b.onclick = () => { tab = b.dataset.t; sfx && sfx('click'); render(); });
    $('lbody').querySelectorAll('.sw, .opts, .mgrid').forEach(box => { const f = box.dataset.f; box.querySelectorAll('button').forEach(b => b.onclick = () => {
      const v = b.dataset.v;
      if (b.classList.contains('lock')) { tab = f === 'of' ? 'skinshop' : f === 'skin' ? 'monskins' : 'clothing'; render(); return; }
      if (f === 'pref') P.pref = v || null; else if (f === 'skin') P.skin = v; else if (f === 'sk' || f === 'hc' || f === 'hs') P.look[f] = +v; else if (f === 'hat' || f === 'acc' || f === 'of') P.look[f] = v; else P.look[f] = v || null;
      sfx && sfx('click'); commit(); }); });
    const wear = id => { const [kind, v] = id.split(':'); if (kind === 'hat') P.look.hat = v; if (kind === 'acc') P.look.acc = v; if (kind === 'of') P.look.of = v; if (kind === 'skin') P.skin = v; if (kind === 'pet') P.look.pet = v; if (kind === 'tr') P.look.tr = v; if (kind === 'em') P.emote = v; };
    $('lbody').querySelectorAll('[data-buy]').forEach(b => b.onclick = () => { const s = ALL().find(x => x.id === b.dataset.buy); if (!s || P.coins < s.price || owns(s.id)) return; P.coins -= s.price; P.owned.push(s.id); wear(s.id); sfx && sfx('coin'); commit(); });
    $('lbody').querySelectorAll('[data-wear]').forEach(b => b.onclick = () => { wear(b.dataset.wear); sfx && sfx('click'); commit(); });
    $('lbody').querySelectorAll('[data-kit]').forEach(b => b.onclick = () => { const s = SUPPLY.find(x => x.k === b.dataset.kit); if (!s || P.coins < s.price || P.kit.length >= KIT_MAX) return; P.coins -= s.price; P.kit.push(s.k); sfx && sfx('coin'); commit(); });
    $('lbody').querySelectorAll('[data-emote]').forEach(b => b.onclick = () => { const v = b.dataset.emote; if (P.emote === v) onEmote && onEmote(v); P.emote = v; sfx && sfx('click'); commit(); });
    $('lbody').querySelectorAll('[data-crate]').forEach(b => b.onclick = () => openCrate());
  }
  function openCrate() {
    const pool = ALL().filter(s => s.price > 0 && !owns(s.id)); if (!pool.length || P.coins < CRATE_PRICE) return;
    P.coins -= CRATE_PRICE; const win = pool[Math.floor(Math.random() * pool.length)]; P.owned.push(win.id); saveProfile(P);
    const box = $('crbox'), btn = $('lbody').querySelector('[data-crate]'); if (btn) btn.disabled = true; sfx && sfx('click'); let n = 0;
    const spin = setInterval(() => { const r = pool[Math.floor(Math.random() * pool.length)]; if (box) { box.textContent = r.icon; box.classList.add('rolling'); } if (++n >= 14) { clearInterval(spin);
      crateMsg = `You won <b>${win.icon} ${win.name}</b>! It's in your collection: wear it from its store.`; sfx && sfx('coin'); render(); const b2 = $('crbox'); if (b2) { b2.textContent = win.icon; b2.classList.add('won'); } onChange(P); } }, 90);
  }
  const show = t => { if (t) tab = ALIAS[t] || t; el.classList.remove('hide'); document.body.classList.add('lockeron'); render(); preview && preview(P); };
  const hide = () => { el.classList.add('hide'); document.body.classList.remove('lockeron'); preview && preview(null); };
  document.querySelectorAll('.blocker').forEach(b => b.onclick = () => { if (el.classList.contains('hide')) show(b.dataset.tab); else hide(); });
  $('lclose').onclick = hide;
  render();
  return { profile: P, addCoins(n) { P.coins += n; saveProfile(P); render(); }, render, open: show, close: hide, get isOpen() { return !el.classList.contains('hide'); }, get tab() { return tab; }, emote: () => P.emote || 'wave',
    kitUsed(list) { for (const k of list || []) { const i = P.kit.indexOf(k); if (i >= 0) P.kit.splice(i, 1); } saveProfile(P); render(); } };
}
