// Lobby store: the Dressing Room (survivor look), Monster pick, the Item Counter (hats, accessories, round supplies)
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
// one-round supplies: up to 2 are packed into your inventory when the next round starts
export const SUPPLY = [
  { k: 'water', name: 'Water Bottle', price: 15, icon: '💧' }, { k: 'soda', name: 'Soda', price: 15, icon: '🥤' }, { k: 'chips', name: 'Chips', price: 15, icon: '🍟' }, { k: 'choco', name: 'Chocolate', price: 20, icon: '🍫' },
  { k: 'beans', name: 'Canned Beans', price: 25, icon: '🥫' }, { k: 'energy', name: 'Energy Drink', price: 30, icon: '⚡' }, { k: 'medkit', name: 'First Aid Kit', price: 60, icon: '🩹' },
];
export const SKIN_TONES = ['#f1c7a5', '#e0ac85', '#c68863', '#9c6644', '#6e4630', '#f6d5b8'];
export const HAIR = ['#2a1c12', '#5a3a1e', '#151210', '#8a5a2a', '#c09050', '#3a2a22'];
const COLORS = ['#c0392b', '#2980b9', '#27ae60', '#8e44ad', '#f39c12', '#16a085', '#d35400', '#2c3e50', '#7f8c8d', '#e84393', '#f1f1f1', '#222222'];
const PANTS = ['#2c3e60', '#3a3a3a', '#4a4030', '#25303f', '#6a5a40', '#1a1a1a', '#5a2a2a', '#2a4a2a'];
const KEY = 'nhProfile';
const TABS = { look: '🪞 Dressing Room', monster: '👹 Monster', shop: '🛒 Item Counter', skins: '✨ Skins Gallery' };
export function loadProfile() {
  let p; try { p = JSON.parse(localStorage.getItem(KEY)); } catch { }
  p = Object.assign({ coins: 0, owned: [], look: { sk: Math.floor(Math.random() * 6), hc: 0, hs: 0, top: null, pants: null, hat: 'none', acc: 'none', of: 'none' }, pref: null, skin: 'classic', kit: [] }, p || {});
  if (!p.look.of) p.look.of = 'none'; if (!Array.isArray(p.kit)) p.kit = [];
  return p;
}
export function saveProfile(p) { localStorage.setItem(KEY, JSON.stringify(p)); }

export function initLocker({ onChange, monsters, sfx, preview }) {
  const $ = id => document.getElementById(id), P = loadProfile(), el = $('locker');
  let tab = 'look';
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
    if (tab === 'look') {
      h += `<p class="lt">Skin tone</p>${sw(SKIN_TONES, L.sk, 'sk', 1)}<p class="lt">Hair colour</p>${sw(HAIR, L.hc, 'hc', 1)}
      <p class="lt">Hair style</p><div class="opts" data-f="hs">${['Short', 'Long', 'Bun', 'Buzz'].map((n, i) => `<button data-v="${i}" class="${L.hs === i ? 'on' : ''}">${n}</button>`).join('')}</div>
      <p class="lt">Outfit <small>(buy more in the Skins Gallery)</small></p>${opts('of', OUTFITS, L.of || 'none', 'of:')}
      <p class="lt">Jacket</p><div class="sw" data-f="top"><button data-v="" class="${!L.top ? 'on' : ''}" title="player colour">★</button>${COLORS.map(c => `<button data-v="${c}" class="${L.top === c ? 'on' : ''}" style="background:${c}"></button>`).join('')}</div>
      <p class="lt">Pants</p><div class="sw" data-f="pants">${PANTS.map(c => `<button data-v="${c}" class="${L.pants === c ? 'on' : ''}" style="background:${c}"></button>`).join('')}</div>
      <p class="lt">Hat</p>${opts('hat', SHOP.filter(s => s.id.startsWith('hat:')), L.hat, 'hat:')}
      <p class="lt">Accessory</p>${opts('acc', SHOP.filter(s => s.id.startsWith('acc:')), L.acc, 'acc:')}`;
    } else if (tab === 'monster') {
      h += `<p class="lt">If you're picked as a monster, play as:</p><div class="mgrid" data-f="pref"><button data-v="" class="${!P.pref ? 'on' : ''}">🎲 Random</button>${Object.entries(M).map(([k, m]) => `<button data-v="${k}" class="${P.pref === k ? 'on' : ''}"><b>${m.name}</b><small>${m.ability} · ${m.cd || 20}s</small>${m.home ? `<i>${m.home.join(' / ')}</i>` : ''}</button>`).join('')}</div>
      <p class="lt">Monster skin <small>(buy more in the Skins Gallery)</small></p><div class="opts" data-f="skin"><button data-v="classic" class="${P.skin === 'classic' ? 'on' : ''}">Classic</button>${MSKIN_SHOP.map(s => { const v = s.id.slice(5); return `<button data-v="${v}" class="${P.skin === v ? 'on' : ''} ${owns(s.id) ? '' : 'lock'}">${s.icon} ${s.name}${owns(s.id) ? '' : ' 🔒'}</button>`; }).join('')}</div>`;
    } else if (tab === 'shop') {
      h += `<p class="lt">Earn coins every round: escape +60 · survive +10 · open a chest/bag +5 · knock down a monster +25 · catch a survivor +40. Coins are for fun only; they can't be bought with money.</p>
      <h4>🧢 Hats</h4><div class="shop">${SHOP.filter(s => s.id.startsWith('hat:')).map(s => card(s, P.look.hat === s.id.slice(4), buyBtn(s))).join('')}</div>
      <h4>🎒 Accessories</h4><div class="shop">${SHOP.filter(s => s.id.startsWith('acc:')).map(s => card(s, P.look.acc === s.id.slice(4), buyBtn(s))).join('')}</div>
      <h4>🥫 Round supplies <small>(packed into your bag next round · ${P.kit.length}/2 packed${P.kit.length ? ': ' + P.kit.map(k => SUPPLY.find(x => x.k === k)?.icon || k).join(' ') : ''})</small></h4>
      <div class="shop">${SUPPLY.map(s => card(s, false, `<button data-kit="${s.k}" ${P.coins < s.price || P.kit.length >= 2 ? 'disabled' : ''}>🪙 ${s.price}</button>`)).join('')}</div>`;
    } else {
      h += `<h4>🧍 Survivor outfits</h4><div class="shop">${OUTFITS.map(s => card(s, P.look.of === s.id.slice(3), buyBtn(s))).join('')}</div>
      <h4>👹 Monster skins</h4><div class="shop">${MSKIN_SHOP.map(s => card(s, P.skin === s.id.slice(5), buyBtn(s))).join('')}</div>`;
    }
    $('lbody').innerHTML = h;
    $('lbody').querySelectorAll('.ltabs button').forEach(b => b.onclick = () => { tab = b.dataset.t; sfx && sfx('click'); render(); });
    $('lbody').querySelectorAll('.sw, .opts, .mgrid').forEach(box => { const f = box.dataset.f; box.querySelectorAll('button').forEach(b => b.onclick = () => {
      const v = b.dataset.v;
      if (b.classList.contains('lock')) { tab = f === 'of' || f === 'skin' ? 'skins' : 'shop'; render(); return; }
      if (f === 'pref') P.pref = v || null; else if (f === 'skin') P.skin = v; else if (f === 'sk' || f === 'hc' || f === 'hs') P.look[f] = +v; else if (f === 'hat' || f === 'acc' || f === 'of') P.look[f] = v; else P.look[f] = v || null;
      sfx && sfx('click'); commit(); }); });
    const wear = id => { const [kind, v] = id.split(':'); if (kind === 'hat') P.look.hat = v; if (kind === 'acc') P.look.acc = v; if (kind === 'of') P.look.of = v; if (kind === 'skin') P.skin = v; };
    $('lbody').querySelectorAll('[data-buy]').forEach(b => b.onclick = () => { const s = [...SHOP, ...OUTFITS, ...MSKIN_SHOP].find(x => x.id === b.dataset.buy); if (!s || P.coins < s.price || owns(s.id)) return; P.coins -= s.price; P.owned.push(s.id); wear(s.id); sfx && sfx('coin'); commit(); });
    $('lbody').querySelectorAll('[data-wear]').forEach(b => b.onclick = () => { wear(b.dataset.wear); sfx && sfx('click'); commit(); });
    $('lbody').querySelectorAll('[data-kit]').forEach(b => b.onclick = () => { const s = SUPPLY.find(x => x.k === b.dataset.kit); if (!s || P.coins < s.price || P.kit.length >= 2) return; P.coins -= s.price; P.kit.push(s.k); sfx && sfx('coin'); commit(); });
  }
  const show = t => { if (t) tab = t; el.classList.remove('hide'); document.body.classList.add('lockeron'); render(); preview && preview(P); };
  const hide = () => { el.classList.add('hide'); document.body.classList.remove('lockeron'); preview && preview(null); };
  document.querySelectorAll('.blocker').forEach(b => b.onclick = () => { if (el.classList.contains('hide')) show(b.dataset.tab); else hide(); });
  $('lclose').onclick = hide;
  render();
  return { profile: P, addCoins(n) { P.coins += n; saveProfile(P); render(); }, render, open: show, close: hide, get isOpen() { return !el.classList.contains('hide'); }, get tab() { return tab; },
    kitUsed(list) { for (const k of list || []) { const i = P.kit.indexOf(k); if (i >= 0) P.kit.splice(i, 1); } saveProfile(P); render(); } };
}
