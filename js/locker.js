// Lobby locker: survivor customization, monster selection and the coin shop (cosmetics only — coins are earned in rounds, never bought).
export const SHOP = [
  { id: 'hat:cap', name: 'Baseball Cap', price: 50, icon: '🧢' }, { id: 'hat:beanie', name: 'Beanie', price: 50, icon: '🧶' }, { id: 'hat:hardhat', name: 'Hard Hat', price: 100, icon: '⛑️' },
  { id: 'hat:cowboy', name: 'Cowboy Hat', price: 120, icon: '🤠' }, { id: 'hat:headphones', name: 'Headphones', price: 150, icon: '🎧' }, { id: 'hat:bunny', name: 'Bunny Ears', price: 200, icon: '🐰' }, { id: 'hat:crown', name: 'Golden Crown', price: 500, icon: '👑' },
  { id: 'acc:glasses', name: 'Glasses', price: 40, icon: '👓' }, { id: 'acc:scarf', name: 'Red Scarf', price: 60, icon: '🧣' }, { id: 'acc:mask', name: 'Face Mask', price: 80, icon: '😷' }, { id: 'acc:goggles', name: 'Night Goggles', price: 120, icon: '🥽' },
  { id: 'skin:shadow', name: 'Shadow monster skin', price: 250, icon: '🌑' }, { id: 'skin:toxic', name: 'Toxic monster skin', price: 300, icon: '☢️' }, { id: 'skin:frost', name: 'Frost monster skin', price: 300, icon: '❄️' },
  { id: 'skin:blood', name: 'Blood Moon monster skin', price: 350, icon: '🩸' }, { id: 'skin:golden', name: 'Golden monster skin', price: 600, icon: '🏆' },
];
export const SKIN_TONES = ['#f1c7a5', '#e0ac85', '#c68863', '#9c6644', '#6e4630', '#f6d5b8'];
export const HAIR = ['#2a1c12', '#5a3a1e', '#151210', '#8a5a2a', '#c09050', '#3a2a22'];
const COLORS = ['#c0392b', '#2980b9', '#27ae60', '#8e44ad', '#f39c12', '#16a085', '#d35400', '#2c3e50', '#7f8c8d', '#e84393', '#f1f1f1', '#222222'];
const PANTS = ['#2c3e60', '#3a3a3a', '#4a4030', '#25303f', '#6a5a40', '#1a1a1a', '#5a2a2a', '#2a4a2a'];
const KEY = 'nhProfile';
export function loadProfile() {
  let p; try { p = JSON.parse(localStorage.getItem(KEY)); } catch { }
  p = Object.assign({ coins: 0, owned: [], look: { sk: Math.floor(Math.random() * 6), hc: 0, hs: 0, top: null, pants: null, hat: 'none', acc: 'none' }, pref: null, skin: 'classic' }, p || {});
  return p;
}
export function saveProfile(p) { localStorage.setItem(KEY, JSON.stringify(p)); }

export function initLocker({ onChange, monsters, sfx, preview }) {
  const $ = id => document.getElementById(id), P = loadProfile(), el = $('locker');
  let tab = 'look';
  const owns = id => P.owned.includes(id);
  const commit = () => { saveProfile(P); render(); onChange(P); preview && preview(P); };
  function sw(list, cur, f, round) { return `<div class="sw">${list.map((c, i) => `<button data-v="${i}" class="${cur === i || cur === c ? 'on' : ''}" style="background:${c}${round ? ';border-radius:50%' : ''}" aria-label="${c}"></button>`).join('')}</div>`; }
  function render() {
    $('coins').textContent = P.coins; document.querySelectorAll('.coinv').forEach(e => e.textContent = P.coins);
    const L = P.look, M = monsters();
    let h = `<div class="ltabs">${['look', 'monster', 'shop'].map(t => `<button data-t="${t}" class="${t === tab ? 'on' : ''}">${{ look: '🧍 Survivor', monster: '👹 Monster', shop: '🛒 Shop' }[t]}</button>`).join('')}</div>`;
    if (tab === 'look') {
      h += `<p class="lt">Skin tone</p>${sw(SKIN_TONES, L.sk, 'sk', 1)}<p class="lt">Hair colour</p>${sw(HAIR, L.hc, 'hc', 1)}
      <p class="lt">Hair style</p><div class="opts" data-f="hs">${['Short', 'Long', 'Bun', 'Buzz'].map((n, i) => `<button data-v="${i}" class="${L.hs === i ? 'on' : ''}">${n}</button>`).join('')}</div>
      <p class="lt">Jacket</p><div class="sw" data-f="top"><button data-v="" class="${!L.top ? 'on' : ''}" title="player colour">★</button>${COLORS.map(c => `<button data-v="${c}" class="${L.top === c ? 'on' : ''}" style="background:${c}"></button>`).join('')}</div>
      <p class="lt">Pants</p><div class="sw" data-f="pants">${PANTS.map(c => `<button data-v="${c}" class="${L.pants === c ? 'on' : ''}" style="background:${c}"></button>`).join('')}</div>
      <p class="lt">Hat</p><div class="opts" data-f="hat"><button data-v="none" class="${L.hat === 'none' ? 'on' : ''}">None</button>${SHOP.filter(s => s.id.startsWith('hat:')).map(s => { const v = s.id.slice(4); return `<button data-v="${v}" class="${L.hat === v ? 'on' : ''} ${owns(s.id) ? '' : 'lock'}" title="${s.name}">${s.icon}${owns(s.id) ? '' : ' 🔒'}</button>`; }).join('')}</div>
      <p class="lt">Accessory</p><div class="opts" data-f="acc"><button data-v="none" class="${L.acc === 'none' ? 'on' : ''}">None</button>${SHOP.filter(s => s.id.startsWith('acc:')).map(s => { const v = s.id.slice(4); return `<button data-v="${v}" class="${L.acc === v ? 'on' : ''} ${owns(s.id) ? '' : 'lock'}" title="${s.name}">${s.icon}${owns(s.id) ? '' : ' 🔒'}</button>`; }).join('')}</div>`;
    } else if (tab === 'monster') {
      h += `<p class="lt">If you're picked as a monster, play as:</p><div class="mgrid" data-f="pref"><button data-v="" class="${!P.pref ? 'on' : ''}">🎲 Random</button>${Object.entries(M).map(([k, m]) => `<button data-v="${k}" class="${P.pref === k ? 'on' : ''}"><b>${m.name}</b><small>${m.ability}</small></button>`).join('')}</div>
      <p class="lt">Monster skin</p><div class="opts" data-f="skin"><button data-v="classic" class="${P.skin === 'classic' ? 'on' : ''}">Classic</button>${SHOP.filter(s => s.id.startsWith('skin:')).map(s => { const v = s.id.slice(5); return `<button data-v="${v}" class="${P.skin === v ? 'on' : ''} ${owns(s.id) ? '' : 'lock'}">${s.icon} ${v}${owns(s.id) ? '' : ' 🔒'}</button>`; }).join('')}</div>`;
    } else {
      h += `<p class="lt">Earn coins every round: escape +60 · survive the round +10 · open a chest/bag +5 · knock down a monster +25 · catch a survivor +40. Coins are for fun only; they can't be bought.</p><div class="shop">${SHOP.map(s => `<div class="si"><span>${s.icon}</span><b>${s.name}</b>${owns(s.id) ? '<em>Owned</em>' : `<button data-buy="${s.id}" ${P.coins < s.price ? 'disabled' : ''}>🪙 ${s.price}</button>`}</div>`).join('')}</div>`;
    }
    $('lbody').innerHTML = h;
    $('lbody').querySelectorAll('.ltabs button').forEach(b => b.onclick = () => { tab = b.dataset.t; render(); });
    const fields = $('lbody').querySelectorAll('.sw, .opts, .mgrid'); let swi = 0;
    fields.forEach(box => { const f = box.dataset.f || (swi++ === 0 ? 'sk' : 'hc'); box.querySelectorAll('button').forEach(b => b.onclick = () => {
      const v = b.dataset.v;
      if (b.classList.contains('lock')) { tab = 'shop'; render(); return; }
      if (f === 'pref') P.pref = v || null; else if (f === 'skin') P.skin = v; else if (f === 'sk' || f === 'hc' || f === 'hs') P.look[f] = +v; else P.look[f] = v || null;
      if (f === 'hat' || f === 'acc') P.look[f] = v; sfx && sfx('click'); commit(); }); });
    $('lbody').querySelectorAll('[data-buy]').forEach(b => b.onclick = () => { const s = SHOP.find(x => x.id === b.dataset.buy); if (!s || P.coins < s.price || owns(s.id)) return; P.coins -= s.price; P.owned.push(s.id); const [kind, v] = s.id.split(':'); if (kind === 'hat') P.look.hat = v; if (kind === 'acc') P.look.acc = v; if (kind === 'skin') P.skin = v; sfx && sfx('coin'); commit(); });
  }
  document.querySelectorAll('.blocker').forEach(b => b.onclick = () => { el.classList.toggle('hide'); document.body.classList.toggle('lockeron', !el.classList.contains('hide')); render(); preview && preview(el.classList.contains('hide') ? null : P); });
  $('lclose').onclick = () => { el.classList.add('hide'); document.body.classList.remove('lockeron'); preview && preview(null); };
  render();
  return { profile: P, addCoins(n) { P.coins += n; saveProfile(P); render(); }, render, open: () => { el.classList.remove('hide'); render(); preview && preview(P); } };
}
