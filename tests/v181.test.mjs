import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { migrateProfile, applyRoundReward, START_COINS } from '../js/save.js';

const require = createRequire(import.meta.url);

function storeFrom(obj) {
  const bag = { nhProfile: obj ? JSON.stringify(obj) : null };
  return { getItem: k => bag[k], setItem: (k, v) => { bag[k] = String(v); }, raw: () => JSON.parse(bag.nhProfile) };
}

let failed = 0;
function check(name, fn) { try { fn(); console.log('ok', name); } catch (e) { failed++; console.error('FAIL', name, e.message); } }

check('two round rewards add onto the saved balance', () => {
  const fresh = migrateProfile(null);
  assert.equal(fresh.coins, START_COINS);
  assert.equal(fresh.coinMig, 1);
  const store = storeFrom(fresh);
  const profile = migrateProfile(store.raw());
  const previous = profile.coins;
  applyRoundReward(profile, 225, store);
  applyRoundReward(profile, 140, store);
  assert.equal(profile.coins, previous + 365);
  const again = migrateProfile(store.raw());
  assert.equal(again.coins, previous + 365);
  assert.equal(again.coinMig, 1);
});

check('a stale copy that only holds the last reward cannot overwrite the wallet', () => {
  const store = storeFrom(migrateProfile({ coins: START_COINS + 225, coinMig: 1, owned: ['em:wave'] }));
  const stale = { coins: 140, coinMig: 1, owned: ['em:wave'] };
  const total = applyRoundReward(stale, 140, store);
  assert.equal(total, START_COINS + 225 + 140);
  assert.equal(store.raw().coins, START_COINS + 365);
});

check('the 10000 grant does not run again after the first migration', () => {
  const once = migrateProfile({ coins: 80, coinMig: 1, owned: [] });
  assert.equal(once.coins, 80);
  once.coins += 225;
  const next = migrateProfile(once);
  assert.equal(next.coins, 305);
});

const Core = require('../core.js');
function ws() { const box = { readyState: 1, msgs: [], send(s) { this.msgs.push(JSON.parse(s)); } }; return { box, conn: Core.handleConnection(box), of(t) { return this.box.msgs.filter(m => m.t === t); } }; }
function step(n) { for (let i = 0; i < n; i++) Core.step(); }

check('lobby has eight drivable cars that other players can see move', () => {
  const a = ws(), b = ws();
  a.conn.message(JSON.stringify({ t: 'create', player: 'Alex', name: 'City', max: 4 }));
  const code = a.of('joined').at(-1).code;
  b.conn.message(JSON.stringify({ t: 'join', code, player: 'Blair' }));
  step(2);
  const room = [...Core.rooms.values()].find(r => r.code === code);
  const cars = room.vehicles.filter(v => !Core.VEH_DEF[v.kind].water);
  assert.ok(cars.length >= 6 && cars.length <= 8, 'expected 6-8 lobby cars, got ' + cars.length);
  for (const v of cars) assert.equal(room.map.walls.some(w => v.x + v.r * 0.4 > w.x && v.x - v.r * 0.4 < w.x + w.w && v.y + v.r * 0.4 > w.y && v.y - v.r * 0.4 < w.y + w.h), false, v.kind + ' is inside a wall');
  const car = cars[0];
  const A = [...room.players.values()].find(p => p.name === 'Alex');
  A.x = car.x + 10; A.y = car.y;
  a.conn.message(JSON.stringify({ t: 'open' }));
  assert.equal(car.by, A.id);
  const x0 = car.x;
  for (let i = 0; i < 25; i++) { a.conn.message(JSON.stringify({ t: 'input', k: {}, a: 0, mv: [1, 0] })); step(1); }
  assert.ok(Math.abs(car.x - x0) > 20, 'car should drive');
  const seen = b.of('s').map(m => (m.bt || []).find(row => row[0] === car.id)).filter(Boolean);
  assert.ok(seen.length > 0, 'passenger client receives the car');
  assert.ok(seen.some(row => Math.abs(row[1] - car.x) < 30), 'the other player is sent the driven position');
});

check('a car wedged in a building returns to its parking spot', () => {
  const room = [...Core.rooms.values()].at(-1);
  const car = room.vehicles.find(v => v.kind === 'suv');
  const A = [...room.players.values()].find(p => p.name === 'Alex');
  if (A.boat) { A.boat = null; const prev = room.vehicles.find(v => v.seats.includes(A.id)); if (prev) { prev.seats = prev.seats.filter(id => id !== A.id); if (prev.by === A.id) prev.by = null; } }
  car.seats = [A.id]; car.by = A.id; A.boat = car.id;
  car.x = 200; car.y = 174; car.a = 0; car.spd = 40; car.stuck = 0;
  let back = false;
  for (let i = 0; i < 80 && !back; i++) { aInput(); if (car.x === car.home.x && car.y === car.home.y) back = true; }
  assert.equal(back, true);
  assert.equal(A.x, car.home.x);
  assert.ok(A.ws.msgs.some(m => m.t === 'event' && /parking spot/.test(m.msg)));
});

function aInput() {
  const room = [...Core.rooms.values()].at(-1);
  const A = [...room.players.values()].find(p => p.name === 'Alex');
  A.mv = { x: 1, y: 0 };
  Core.step();
}

if (failed) { console.error(failed + ' failed'); process.exit(1); }
console.log('v1.8.1 checks passed');
