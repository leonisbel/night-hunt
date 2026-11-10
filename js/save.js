// Coin wallet. One migration tops a poorer save up to the starter balance and then never touches it again.
export const START_COINS = 10000;
export const DAILY_FREE = 250;

export function migrateProfile(raw) {
  const existed = !!(raw && typeof raw === 'object');
  const p = Object.assign({
    coins: START_COINS, coinMig: 0, owned: [], daily: '',
    look: { sk: 0, hc: 0, hs: 0, top: null, pants: null, hat: 'none', acc: 'none', of: 'none', pet: 'none', tr: 'none' },
    pref: null, skin: 'classic', kit: [], emote: 'wave', gear: [], gearOn: [],
  }, existed ? raw : {});
  if (!p.look || typeof p.look !== 'object') p.look = { sk: 0, hc: 0, hs: 0, top: null, pants: null, hat: 'none', acc: 'none', of: 'none', pet: 'none', tr: 'none' };
  if (!p.look.of) p.look.of = 'none';
  if (!p.look.pet) p.look.pet = 'none';
  if (!p.look.tr) p.look.tr = 'none';
  if (!Array.isArray(p.owned)) p.owned = [];
  if (!Array.isArray(p.kit)) p.kit = [];
  if (!Array.isArray(p.gear)) p.gear = [];
  if (!Array.isArray(p.gearOn)) p.gearOn = [];
  if (p.pref === 'monochrome') p.pref = 'boisvert';
  if (p.owned.includes('em:floss') && !p.owned.includes('em:pendulum')) p.owned.push('em:pendulum');
  p.owned = p.owned.filter(id => id !== 'em:floss');
  if (p.emote === 'floss') p.emote = 'pendulum';
  if (p.emote === 'dance') p.emote = 'groove';
  if (p.emote === 'jump') p.emote = 'jacks';
  if (!p.owned.includes('em:wave')) p.owned.push('em:wave');
  p.gearOn = p.gearOn.filter(k => p.gear.includes(k));
  if (!existed) {
    p.coins = START_COINS;
    p.coinMig = 1;
  } else if (!p.coinMig) {
    const had = Math.max(0, Math.floor(Number(p.coins) || 0));
    p.coins = had < START_COINS ? START_COINS : had;
    p.coinMig = 1;
  } else {
    p.coins = Math.max(0, Math.floor(Number(p.coins) || 0));
  }
  return p;
}

// Add a round reward onto the saved wallet. Never assign coins = reward.
// A stale in-memory profile must not replace a higher balance already on disk.
export function applyRoundReward(profile, reward, storage) {
  const n = Math.max(0, Math.floor(Number(reward) || 0));
  const store = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
  let disk = null;
  if (store) { try { disk = JSON.parse(store.getItem('nhProfile') || 'null'); } catch { disk = null; } }
  const diskCoins = disk && Number(disk.coinMig) ? Math.max(0, Math.floor(Number(disk.coins) || 0)) : null;
  const mem = Math.max(0, Math.floor(Number(profile && profile.coins) || 0));
  const base = diskCoins == null ? mem : Math.max(mem, diskCoins);
  const total = base + n;
  if (profile) { profile.coins = total; profile.coinMig = 1; }
  if (store && profile) {
    const saved = Object.assign({}, disk || {}, profile);
    saved.coins = total;
    saved.coinMig = 1;
    store.setItem('nhProfile', JSON.stringify(saved));
  }
  return total;
}

// Free reward only. Callers must label it as a free reward in the UI. It is not a purchase.
export function claimDaily(p, today) {
  const day = today || new Date().toISOString().slice(0, 10);
  if (p.daily === day) return { ok: false, n: 0, day };
  p.daily = day;
  p.coins = Math.max(0, Math.floor(Number(p.coins) || 0)) + DAILY_FREE;
  return { ok: true, n: DAILY_FREE, day };
}
