import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Core = require('../core.js');
const { AURAS, tickSurvivor } = require('../js/auras.js');

function ws() { const box = { readyState: 1, msgs: [], send(s) { this.msgs.push(JSON.parse(s)); } }; return { box, conn: Core.handleConnection(box), of(t) { return this.box.msgs.filter(m => m.t === t); } }; }
function step(n) { for (let i = 0; i < n; i++) Core.step(); }
let failed = 0;
function check(name, fn) { try { fn(); console.log('ok', name); } catch (e) { failed++; console.error('FAIL', name, e.message); } }

check('mall has two floors, an atrium, and the cars stay outside', () => {
  const L = Core.LOBBY;
  assert.equal(L.bld.find(b => b.kind === 'mall').floors, 2);
  assert.ok(L.mall.atrium.w > 200);
  assert.ok(L.lifts.some(l => l.kind === 'escalator') && L.lifts.some(l => l.kind === 'stair') && L.lifts.some(l => l.kind === 'elevator'));
  assert.equal(L.zones.find(z => z.k === 'weapons').fl, 0);
  assert.equal(L.zones.find(z => z.k === 'food').fl, 0);
  assert.equal(L.zones.find(z => z.k === 'skinshop').fl, 1);
  assert.equal(L.zones.find(z => z.k === 'monskins').fl, 1);
  assert.equal(L.zones.find(z => z.k === 'emotes').fl, 1);
  assert.ok(L.vehicles.every(v => v.x < 2220));
  assert.ok(L.walls.some(w => w.fl === 1));
});

check('escalator and elevator change floors, the balcony rail stops a fall', () => {
  const a = ws();
  a.conn.message(JSON.stringify({ t: 'create', player: 'Alex', name: 'Mall', max: 4 }));
  const room = [...Core.rooms.values()].at(-1);
  const p = [...room.players.values()][0];
  const lift = room.map.lifts.find(l => l.kind === 'escalator' && l.belt > 0);
  p.x = lift.x + lift.w / 2; p.y = lift.y + lift.h - 30; p.alt = 0; p.fl = 0; p.keys = {}; p.bot = false;
  step(160);
  assert.equal(p.fl, 1);
  assert.equal(p.climb, null);
  p.alt = 4.2; p.fl = 1; p.x = 3070; p.y = 1460; p.keys = { right: 1 };
  step(12);
  assert.ok(p.x < 3120, 'upper floor walked into the atrium: ' + p.x);
  p.alt = 0; p.fl = 0; p.x = 3070; p.y = 1460; p.keys = { right: 1 };
  step(20);
  assert.ok(p.x > 3200, 'ground floor could not cross the atrium: ' + p.x);
  const el = room.map.lifts.find(l => l.kind === 'elevator');
  p.x = el.x + 40; p.y = el.y + 40; p.alt = 0; p.fl = 0; p.keys = {};
  a.conn.message(JSON.stringify({ t: 'open' }));
  step(50);
  assert.equal(p.fl, 1);
});

check('toxic chips health, frost freezes once, neon stuns once', () => {
  const surv = { x: 100, y: 100, alive: true };
  const toxic = { x: 200, y: 100, skin: 'toxic', alive: true };
  let dmg = 0;
  for (let i = 0; i < 30; i++) dmg += tickSurvivor(surv, [toxic], 1 / 30, i / 30).dmg;
  assert.ok(dmg >= 2 && dmg <= 4, 'toxic dmg ' + dmg);
  assert.equal(AURAS.toxic.radius, 180);
  const far = tickSurvivor({ x: 1000, y: 100, alive: true }, [toxic], 1, 10);
  assert.equal(far, null);
  const cold = { x: 100, y: 100, alive: true };
  const frost = { x: 140, y: 100, skin: 'frost', alive: true };
  let froze = false;
  for (let i = 0; i < 90; i++) { const fx = tickSurvivor(cold, [frost], 1 / 30, i / 30); if (fx && fx.frozen) froze = true; }
  assert.equal(froze, true);
  const again = tickSurvivor(cold, [frost], 1 / 30, 4);
  assert.equal(again.frozen, false);
  const neonS = { x: 100, y: 100, alive: true };
  const neon = { x: 120, y: 100, skin: 'neon', alive: true };
  const a = tickSurvivor(neonS, [neon], 0.05, 1);
  const b = tickSurvivor(neonS, [neon], 0.05, 1.1);
  assert.equal(a.stun, 0.45);
  assert.equal(b.stun, 0);
  const shadow = tickSurvivor({ x: 100, y: 100, alive: true }, [{ x: 120, y: 100, skin: 'shadow', alive: true }], 0.05, 1);
  assert.equal(shadow.kind, 'shadow');
  assert.equal(shadow.dmg, 0);
});

if (failed) process.exit(1);
console.log('v191 checks passed');
