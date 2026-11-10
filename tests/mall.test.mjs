// Stairs and escalators are slopes. Height follows the ramp. Nothing teleports between floors.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Core = require('../core.js');

function ws() { const box = { readyState: 1, msgs: [], send(s) { this.msgs.push(JSON.parse(s)); } }; return { box, conn: Core.handleConnection(box), of(t) { return this.box.msgs.filter(m => m.t === t); } }; }
function step(n) { for (let i = 0; i < n; i++) Core.step(); }
function roomOf() {
  const a = ws(), b = ws();
  a.conn.message(JSON.stringify({ t: 'create', player: 'Alex', name: 'Mall', max: 4 }));
  const code = a.of('joined').at(-1).code;
  b.conn.message(JSON.stringify({ t: 'join', code, player: 'Blair' }));
  step(2);
  const room = [...Core.rooms.values()].at(-1);
  for (const p of room.players.values()) { p.bot = false; p.keys = {}; p.seated = false; }
  return { a, b, room };
}
let failed = 0;
function check(name, fn) { try { fn(); console.log('ok', name); } catch (e) { failed++; console.error('FAIL', name, e.stack.split('\n')[1] ? e.message : e.message); } }

function walk(p, keys, n) {
  const samples = [];
  let jump = 0, drop = 0, prev = { x: p.x, y: p.y, alt: p.alt || 0 };
  p.keys = keys;
  for (let i = 0; i < n; i++) {
    step(1);
    jump = Math.max(jump, Math.hypot(p.x - prev.x, p.y - prev.y));
    drop = Math.max(drop, Math.abs((p.alt || 0) - prev.alt));
    samples.push(p.alt || 0);
    prev = { x: p.x, y: p.y, alt: p.alt || 0 };
  }
  p.keys = {};
  return { jump, drop, samples, x: p.x, y: p.y, alt: p.alt || 0, fl: p.fl || 0 };
}

check('two escalators, one stair, and an elevator', () => {
  const ups = Core.LOBBY.lifts.filter(l => l.kind === 'escalator' && l.belt > 0);
  const downs = Core.LOBBY.lifts.filter(l => l.kind === 'escalator' && l.belt < 0);
  assert.equal(ups.length, 1);
  assert.equal(downs.length, 1);
  assert.equal(Core.LOBBY.lifts.filter(l => l.kind === 'stair').length, 1);
  assert.equal(Core.LOBBY.lifts.filter(l => l.kind === 'elevator').length, 1);
});

check('walk up and down the stairs from both ends without a teleport', () => {
  const { room } = roomOf();
  const p = [...room.players.values()].find(q => q.name === 'Alex');
  const stair = room.map.lifts.find(l => l.kind === 'stair');
  p.x = stair.x + stair.w / 2; p.y = stair.y + stair.h - 30; p.alt = 0; p.fl = 0;
  const up = walk(p, { up: 1 }, 90);
  assert.ok(up.jump < 12, 'stair step jumped ' + up.jump);
  assert.ok(up.drop < 0.35, 'stair height popped ' + up.drop);
  assert.ok(up.alt > 4, 'did not reach the top ' + up.alt);
  assert.equal(up.fl, 1);
  const down = walk(p, { down: 1 }, 100);
  assert.ok(down.jump < 12, 'down step jumped ' + down.jump);
  assert.ok(down.drop < 0.35, 'down height popped ' + down.drop);
  assert.ok(down.alt < 0.2, 'did not reach the ground ' + down.alt);
  assert.equal(down.fl, 0);
});

check('the up escalator carries you up and the down escalator carries you down', () => {
  const { room } = roomOf();
  const p = [...room.players.values()].find(q => q.name === 'Alex');
  const upR = room.map.lifts.find(l => l.kind === 'escalator' && l.belt > 0);
  p.x = upR.x + upR.w / 2; p.y = upR.y + upR.h - 36; p.alt = 0; p.fl = 0;
  const up = walk(p, {}, 160);
  assert.ok(up.jump < 8, 'escalator jumped ' + up.jump);
  assert.ok(up.drop < 0.25, 'escalator height popped ' + up.drop);
  assert.ok(up.alt > 4 && up.y < upR.y, 'up escalator did not deliver ' + up.alt + ' y=' + up.y);
  const downR = room.map.lifts.find(l => l.kind === 'escalator' && l.belt < 0);
  p.x = downR.x + downR.w / 2; p.y = downR.y + 36; p.alt = 4.2; p.fl = 1;
  const down = walk(p, {}, 160);
  assert.ok(down.jump < 8, 'down escalator jumped ' + down.jump);
  assert.ok(down.alt < 0.25 && down.y > downR.y + downR.h, 'down escalator did not deliver ' + down.alt + ' y=' + down.y);
});

check('side approaches cannot cut through a ramp, and the upper floor does not fall', () => {
  const { room } = roomOf();
  const p = [...room.players.values()].find(q => q.name === 'Alex');
  const stair = room.map.lifts.find(l => l.kind === 'stair');
  const midY = stair.y + stair.h / 2;
  p.x = stair.x - 40; p.y = midY; p.alt = 0; p.fl = 0;
  const side = walk(p, { right: 1 }, 30);
  assert.ok(side.x < stair.x, 'walked through the stair rail ' + side.x);
  assert.ok(side.alt < 0.3, 'side approach changed floor ' + side.alt);
  p.x = stair.x + stair.w / 2; p.y = stair.y - 30; p.alt = 4.2; p.fl = 1;
  const deck = walk(p, { left: 1, up: 1 }, 40);
  assert.ok(deck.samples.every(a => a > 3.5), 'fell off the balcony ' + Math.min(...deck.samples));
  const atr = room.map.mall.atrium;
  p.x = atr.x - 40; p.y = atr.y + atr.h / 2; p.alt = 4.2; p.fl = 1;
  const hole = walk(p, { right: 1 }, 25);
  assert.ok(hole.x < atr.x + 8, 'upper floor entered the atrium ' + hole.x);
  p.alt = 0; p.fl = 0; p.x = atr.x - 40; p.y = atr.y + atr.h / 2;
  const cross = walk(p, { right: 1 }, 40);
  assert.ok(cross.x > atr.x + atr.w * 0.4, 'ground floor could not cross ' + cross.x);
  assert.ok(cross.alt < 0.2, 'ground floor rose ' + cross.alt);
});

check('elevator stays in its shaft and a guest sees the other floor', () => {
  const { a, b, room } = roomOf();
  const alex = [...room.players.values()].find(q => q.name === 'Alex');
  const blair = [...room.players.values()].find(q => q.name === 'Blair');
  const el = room.map.lifts.find(l => l.kind === 'elevator');
  alex.x = el.x + 50; alex.y = el.y + 50; alex.alt = 0; alex.fl = 0; alex.keys = {};
  blair.x = 1200; blair.y = 1500; blair.alt = 0; blair.fl = 0; blair.keys = {};
  const x0 = alex.x, y0 = alex.y;
  a.conn.message(JSON.stringify({ t: 'open' }));
  step(50);
  assert.ok(Math.hypot(alex.x - x0, alex.y - y0) < 2, 'elevator moved ' + alex.x + ',' + alex.y);
  assert.ok(alex.alt > 4 && !alex.lift, 'elevator did not arrive ' + alex.alt);
  a.conn.message(JSON.stringify({ t: 'open' }));
  step(50);
  assert.ok(alex.alt < 0.2 && !alex.lift, 'elevator did not return ' + alex.alt);
  alex.lift = { u: 0, dur: 1.35, from: 0, to: 4.2 };
  step(50);
  const snap = b.of('s').at(-1);
  const seen = snap.ps.find(q => q.n === 'Alex');
  const me = snap.ps.find(q => q.n === 'Blair');
  assert.ok(seen && seen.alt > 4 && seen.fl === 1, 'guest saw Alex on the wrong floor ' + (seen && seen.alt));
  assert.ok(me && me.alt < 0.2 && me.fl === 0, 'guest was moved onto Alex floor ' + (me && me.alt));
});

check('main and side entrances can be walked both ways, the balcony cannot', () => {
  const { room } = roomOf();
  const p = [...room.players.values()].find(q => q.name === 'Alex');
  const main = room.map.mall.entrances.find(e => e.id === 'main');
  const north = room.map.mall.entrances.find(e => e.id === 'north');
  const south = room.map.mall.entrances.find(e => e.id === 'south');
  p.alt = 0; p.fl = 0; p.x = main.x - 50; p.y = main.y + main.h / 2;
  const into = walk(p, { right: 1 }, 30);
  assert.ok(into.x > main.x + main.w + 10, 'could not enter the main door ' + into.x);
  const out = walk(p, { left: 1 }, 30);
  assert.ok(out.x < main.x - 10, 'could not leave the main door ' + out.x);
  p.alt = 4.2; p.fl = 1; p.x = main.x + 80; p.y = main.y + main.h / 2;
  const balcony = walk(p, { left: 1 }, 40);
  assert.ok(balcony.x > main.x, 'upper floor walked out the front ' + balcony.x);
  p.alt = 0; p.fl = 0; p.x = north.x + north.w / 2; p.y = north.y + 80;
  const nOut = walk(p, { up: 1 }, 30);
  assert.ok(nOut.y < north.y - 10, 'could not use the north door ' + nOut.y);
  p.x = south.x + south.w / 2; p.y = south.y - 80; p.alt = 0;
  const sOut = walk(p, { down: 1 }, 30);
  assert.ok(sOut.y > south.y + south.h + 10, 'could not use the south door ' + sOut.y);
});

check('plaza furniture does not block the three entrances', () => {
  const L = Core.LOBBY;
  const furn = L.walls.filter(w => w.plaza);
  assert.ok(furn.length >= 8, 'plaza pieces ' + furn.length);
  for (const e of L.mall.entrances) {
    const hit = furn.find(w => w.x < e.x + e.w + 20 && w.x + w.w > e.x - 20 && w.y < e.y + e.h + 20 && w.y + w.h > e.y - 20);
    assert.equal(hit, undefined, (hit && hit.x) + ' blocks ' + e.id);
  }
  assert.ok(L.mall.entrances.every(e => e.face && e.name));
  assert.equal(L.lifts.filter(l => l.kind === 'escalator').length, 2);
  assert.equal(L.lifts.filter(l => l.kind === 'stair').length, 1);
});

if (failed) process.exit(1);
console.log('mall ramp checks passed');
