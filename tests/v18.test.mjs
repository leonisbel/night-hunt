import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

function boot(theme) {
  process.env.THEME = theme;
  process.env.TEST_ROLES = 'humans-survive';
  process.env.MAP_SIZE = '1600';
  // core keeps module state, so each scenario uses the already-loaded rooms map
}
const Core = require('../core.js');
function ws() { const box = { readyState: 1, msgs: [], send(s) { this.msgs.push(JSON.parse(s)); } }; return { box, conn: Core.handleConnection(box), of(t) { return this.box.msgs.filter(m => m.t === t); } }; }
function step(n) { for (let i = 0; i < n; i++) Core.step(); }
function fresh(name) {
  const a = ws(), b = ws();
  a.conn.message(JSON.stringify({ t: 'create', player: 'Alex', name, max: 4, roundLen: 300 }));
  const code = a.of('joined').at(-1).code;
  b.conn.message(JSON.stringify({ t: 'join', code, player: 'Blair' }));
  a.conn.message(JSON.stringify({ t: 'addBot' }));
  const room = [...Core.rooms.values()].find(r => r.code === code);
  for (const p of room.players.values()) if (!p.bot) p.seated = true;
  step(2);
  a.conn.message(JSON.stringify({ t: 'start' }));
  room.flightEnd = 0;
  step(2);
  return { a, b, room };
}
let failed = 0;
function check(name, fn) { try { fn(); console.log('ok', name); } catch (e) { failed++; console.error('FAIL', name, e.message); } }

check('two players drive and ride a lobby pickup', () => {
  const a = ws(), b = ws();
  a.conn.message(JSON.stringify({ t: 'create', player: 'Alex', name: 'Town', max: 4 }));
  b.conn.message(JSON.stringify({ t: 'join', code: a.of('joined').at(-1).code, player: 'Blair' }));
  step(2);
  const room = [...Core.rooms.values()].at(-1);
  const truck = room.vehicles.find(v => v.kind === 'pickup');
  const A = [...room.players.values()].find(p => p.name === 'Alex');
  const B = [...room.players.values()].find(p => p.name === 'Blair');
  A.x = truck.x + 15; A.y = truck.y; B.x = truck.x + 12; B.y = truck.y + 8;
  a.conn.message(JSON.stringify({ t: 'open' }));
  b.conn.message(JSON.stringify({ t: 'open' }));
  assert.equal(truck.seats.length, 2);
  assert.equal(truck.by, A.id);
  const x0 = truck.x;
  for (let i = 0; i < 30; i++) { a.conn.message(JSON.stringify({ t: 'input', k: {}, a: 0, mv: [1, 0] })); step(1); }
  assert.ok(truck.x - x0 > 40, 'pickup should drive');
  assert.ok(Math.hypot(B.x - truck.x, B.y - truck.y) < 2, 'passenger stays in the truck');
  assert.ok(truck.fuel < truck.maxFuel, 'fuel is spent');
});

check('ocean boat boards from the water and both clients ride', () => {
  boot('Stormy Ocean');
  const { a, b, room } = fresh('Ocean');
  assert.equal(room.map.theme, 'Stormy Ocean');
  assert.ok(room.boats.length > 0);
  const boat = room.boats[0];
  const A = [...room.players.values()].find(p => p.name === 'Alex');
  const B = [...room.players.values()].find(p => p.name === 'Blair');
  for (const p of [A, B]) { p.role = 'survivor'; p.alive = true; p.boat = null; }
  A.x = boat.x + 20; A.y = boat.y; B.x = boat.x + 16; B.y = boat.y + 6;
  a.conn.message(JSON.stringify({ t: 'open' }));
  b.conn.message(JSON.stringify({ t: 'open' }));
  assert.deepEqual(boat.seats, [A.id, B.id]);
  const x0 = boat.x, y0 = boat.y;
  for (let i = 0; i < 40; i++) { a.conn.message(JSON.stringify({ t: 'input', k: {}, a: 0, mv: [Math.cos(boat.a) || 1, Math.sin(boat.a) || 0] })); step(1); }
  assert.ok(Math.hypot(boat.x - x0, boat.y - y0) > 40, 'boat should leave the dock');
  assert.ok(Math.hypot(A.x - boat.x, A.y - boat.y) < 2 && Math.hypot(B.x - boat.x, B.y - boat.y) < 2);
});

check('a monster wrecks a vehicle instead of an instant catch', () => {
  boot('Powerline Forest');
  const { room } = fresh('Wreck');
  const car = room.vehicles.find(v => !Core.VEH_DEF[v.kind].water);
  assert.ok(car, 'land map has a car');
  const A = [...room.players.values()].find(p => p.name === 'Alex');
  const M = [...room.players.values()].find(p => p.role === 'monster');
  A.role = 'survivor'; A.alive = true; A.boat = null; A.x = car.x; A.y = car.y;
  // board directly
  car.seats = [A.id]; car.by = A.id; A.boat = car.id;
  M.x = car.x + 10; M.y = car.y; M.hitUntil = 0;
  const hp0 = A.hp;
  step(3);
  assert.ok(car.hp < car.maxHp, 'vehicle took damage');
  assert.ok(A.alive, 'driver is not caught on the first hit');
  assert.ok(A.hp < hp0, 'the hit still hurts');
});

if (failed) { console.error(failed + ' failed'); process.exit(1); }
console.log('v1.8 vehicle checks passed');
