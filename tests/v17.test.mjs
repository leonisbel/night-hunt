import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { migrateProfile, claimDaily, START_COINS, DAILY_FREE } from '../js/save.js';

const require = createRequire(import.meta.url);
const Core = require('../core.js');

let failed = 0;
function check(name, fn) {
  try { fn(); console.log('ok', name); }
  catch (e) { failed++; console.error('FAIL', name, e.message); }
}

check('new profile starts at 10000', () => {
  const p = migrateProfile(null);
  assert.equal(p.coins, START_COINS);
  assert.equal(p.coinMig, 1);
});
check('poor save is topped up once', () => {
  const p = migrateProfile({ coins: 40, owned: ['em:wave'], coinMig: 0 });
  assert.equal(p.coins, START_COINS);
  assert.equal(p.coinMig, 1);
});
check('richer save is not lowered', () => {
  const p = migrateProfile({ coins: 25000, owned: ['hat:crown'], coinMig: 0 });
  assert.equal(p.coins, 25000);
});
check('migration does not repeat', () => {
  const once = migrateProfile({ coins: 0, coinMig: 0 });
  once.coins = 80;
  const again = migrateProfile(once);
  assert.equal(again.coins, 80);
});
check('daily reward is explicit and once per day', () => {
  const p = migrateProfile(null);
  const a = claimDaily(p, '2026-11-09');
  assert.equal(a.ok, true);
  assert.equal(a.n, DAILY_FREE);
  assert.equal(p.coins, START_COINS + DAILY_FREE);
  const b = claimDaily(p, '2026-11-09');
  assert.equal(b.ok, false);
  assert.equal(p.coins, START_COINS + DAILY_FREE);
});
check('floss id migrates to pendulum', () => {
  const p = migrateProfile({ coins: 10000, coinMig: 1, owned: ['em:floss'], emote: 'floss' });
  assert.ok(p.owned.includes('em:pendulum'));
  assert.equal(p.owned.includes('em:floss'), false);
  assert.equal(p.emote, 'pendulum');
});

function ws() {
  const box = { readyState: 1, msgs: [], send(s) { this.msgs.push(JSON.parse(s)); } };
  return { box, conn: Core.handleConnection(box), of(t) { return this.box.msgs.filter(m => m.t === t); } };
}
function step(n) { for (let i = 0; i < n; i++) Core.step(); }
function snap(client) { return client.of('s').at(-1); }
function sit(client) {
  const id = client.of('joined').at(-1).you;
  for (let i = 0; i < 120; i++) {
    step(2);
    const s = snap(client);
    if (s && s.boarded && s.boarded.includes(id)) return true;
    const self = s && s.ps.find(p => p.id === id);
    if (!self) continue;
    const h = Core.LOBBY.heli, dx = h.x - self.x, dy = h.y - self.y, len = Math.hypot(dx, dy) || 1;
    if (len < (h.board || 88) + 8) client.conn.message(JSON.stringify({ t: 'open' }));
    else client.conn.message(JSON.stringify({ t: 'input', k: {}, a: 0, mv: [dx / len, dy / len] }));
  }
  return false;
}
function untilPlaying(client) {
  const t0 = Date.now();
  while (Date.now() - t0 < 6000) { Core.step(); if (snap(client) && snap(client).state === 'playing') return snap(client); }
  return snap(client);
}

check('two clients join, move, sit, and play a round with a moving monster', () => {
  process.env.TEST_ROLES = 'humans-survive';
  process.env.MAP_SIZE = '1600';
  const a = ws(), b = ws();
  a.conn.message(JSON.stringify({ t: 'create', player: 'Alex', name: 'Test', max: 4, roundLen: 300 }));
  const joined = a.of('joined').at(-1);
  assert.ok(joined && joined.code);
  b.conn.message(JSON.stringify({ t: 'join', code: joined.code, player: 'Blair' }));
  assert.ok(b.of('joined').length);
  step(4);
  const before = snap(a);
  a.conn.message(JSON.stringify({ t: 'input', k: { right: 1 }, a: 0, mv: [1, 0] }));
  step(20);
  const moved = snap(a);
  const me = moved.ps.find(p => p.id === joined.you);
  const was = before.ps.find(p => p.id === joined.you);
  assert.ok(Math.hypot(me.x - was.x, me.y - was.y) > 40, 'host should move');
  assert.equal(sit(a), true, 'host seated');
  assert.equal(sit(b), true, 'friend seated');
  a.conn.message(JSON.stringify({ t: 'addBot' }));
  step(2);
  a.conn.message(JSON.stringify({ t: 'start' }));
  step(2);
  assert.equal(snap(a).state, 'flight');
  const play = untilPlaying(a);
  assert.equal(play.state, 'playing');
  const mon = play.ps.find(p => p.role === 'monster');
  assert.ok(mon, 'a monster is in the round');
  const x0 = mon.x, y0 = mon.y;
  step(90);
  const mon2 = snap(a).ps.find(p => p.id === mon.id);
  assert.ok(mon2, 'monster still replicated');
  assert.ok(Math.hypot(mon2.x - x0, mon2.y - y0) > 20, 'monster moved during the round');
  // friend also receives positions
  const other = snap(b).ps.find(p => p.id === mon.id);
  assert.ok(other, 'second client sees the monster');
});

check('speed coil cooldown is 20s and a second press does not refresh it', () => {
  process.env.TEST_ROLES = 'humans-survive';
  const a = ws(), b = ws();
  a.conn.message(JSON.stringify({ t: 'create', player: 'Alex', name: 'Gear', max: 4, roundLen: 300 }));
  const code = a.of('joined').at(-1).code;
  b.conn.message(JSON.stringify({ t: 'join', code, player: 'Blair' }));
  a.conn.message(JSON.stringify({ t: 'addBot' }));
  step(4);
  assert.equal(sit(a), true);
  assert.equal(sit(b), true);
  a.conn.message(JSON.stringify({ t: 'profile', look: {}, gear: ['speed'], gearOn: ['speed'], emotes: ['groove'] }));
  a.conn.message(JSON.stringify({ t: 'start' }));
  const playing = untilPlaying(a);
  assert.equal(playing.state, 'playing');
  a.conn.message(JSON.stringify({ t: 'gear', k: 'speed' }));
  step(2);
  const g = snap(a).me.gear.speed;
  assert.ok(g && g.left > 6 && g.left <= 8, 'duration shown');
  assert.ok(g.cd > 18 && g.cd <= 20, 'cooldown is 20s');
  const events = a.of('event').map(e => e.msg).join('\n');
  a.conn.message(JSON.stringify({ t: 'gear', k: 'speed' }));
  step(1);
  const again = a.of('event').map(e => e.msg).join('\n');
  assert.ok(again.includes('cooldown'), 'second use is rejected');
  assert.ok(!again.includes('for 8s') || events.includes('for 8s'));
});

check('unowned emote is ignored and an owned one replicates', () => {
  const a = ws(), b = ws();
  a.conn.message(JSON.stringify({ t: 'create', player: 'Alex', name: 'Em', max: 4 }));
  const code = a.of('joined').at(-1).code;
  b.conn.message(JSON.stringify({ t: 'join', code, player: 'Blair' }));
  a.conn.message(JSON.stringify({ t: 'profile', look: {}, emotes: ['groove'], gear: [], gearOn: [] }));
  a.conn.message(JSON.stringify({ t: 'emote', e: 'scream' }));
  step(2);
  let self = snap(b).ps.find(p => p.n === 'Alex');
  assert.equal(self.em, undefined);
  a.conn.message(JSON.stringify({ t: 'emote', e: 'groove' }));
  step(2);
  self = snap(b).ps.find(p => p.n === 'Alex');
  assert.equal(self.em, 'groove');
});

check('admin stays locked for the host and for the name Leo', () => {
  const a = ws();
  a.conn.message(JSON.stringify({ t: 'create', player: 'Leo', name: 'Owners', max: 4 }));
  a.conn.message(JSON.stringify({ t: 'admin', cmd: 'kick', id: 1, admin: true, secret: 'leo' }));
  step(1);
  const msg = a.of('admin').at(-1);
  assert.ok(msg && msg.locked === true);
  assert.equal(msg.ok, false);
  assert.equal(Core.ownerAuthorized({ name: 'Leo', id: 1 }), false);
});

check('invisibility sets a timed cloak on the survivor snapshot', () => {
  process.env.TEST_ROLES = 'humans-survive';
  const a = ws(), b = ws();
  a.conn.message(JSON.stringify({ t: 'create', player: 'Alex', name: 'Cloak', max: 4, roundLen: 300 }));
  const code = a.of('joined').at(-1).code;
  b.conn.message(JSON.stringify({ t: 'join', code, player: 'Blair' }));
  a.conn.message(JSON.stringify({ t: 'addBot' }));
  step(4);
  assert.equal(sit(a), true);
  assert.equal(sit(b), true);
  a.conn.message(JSON.stringify({ t: 'profile', look: {}, gear: ['invis'], gearOn: ['invis'] }));
  a.conn.message(JSON.stringify({ t: 'start' }));
  assert.equal(untilPlaying(a).state, 'playing');
  a.conn.message(JSON.stringify({ t: 'gear', k: 'invis' }));
  step(2);
  const s = snap(a);
  assert.ok(s.me.gear.invis.left > 3 && s.me.gear.invis.left <= 5);
  assert.ok(s.me.gear.invis.cd > 18);
  const self = s.ps.find(p => p.id === a.of('joined').at(-1).you);
  assert.equal(self.st.cloak, 1);
});

if (failed) { console.error(failed + ' failed'); process.exit(1); }
console.log('all v1.7 checks passed');
