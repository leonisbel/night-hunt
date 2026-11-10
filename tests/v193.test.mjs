import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { playGate, flyPose } from '../js/playgate.js';

const require = createRequire(import.meta.url);
const Core = require('../core.js');

let failed = 0;
function check(name, fn) { try { fn(); console.log('ok', name); } catch (e) { failed++; console.error('FAIL', name, e.message); } }

check('dragon plays on Play and fades when motion should be reduced', () => {
  const full = playGate({});
  assert.equal(full.dragon, true);
  assert.equal(full.skippable, true);
  assert.ok(full.ms >= 2000 && full.ms <= 3000);
  const photo = playGate({ photo: true });
  const reduce = playGate({ reduced: true });
  assert.equal(photo.mode, 'fade');
  assert.equal(photo.dragon, false);
  assert.equal(reduce.dragon, false);
  assert.equal(reduce.skippable, true);
});

check('the wing covers the view mid-swoop and then reveals', () => {
  const early = flyPose(0.2);
  const mid = flyPose(0.68);
  const late = flyPose(0.95);
  assert.equal(early.cover, 0);
  assert.ok(mid.cover > 0.5, 'cover ' + mid.cover);
  assert.equal(mid.reveal, false);
  assert.ok(late.reveal);
  assert.ok(late.cover < 0.6);
  assert.ok(flyPose(0).x < flyPose(1).x);
});

check('the create-server form, browser, and touch labels are in the page', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  for (const id of ['bplay', 'sname', 'smax', 'smap', 'smapv', 'sdiff', 'slist', 'bcreate', 'bjoin']) assert.ok(html.includes(`id="${id}"`), id);
  assert.match(html, /Neon Spire/);
  assert.match(html, /name="priv"/);
  for (const title of ['Sprint', 'Emotes', 'Speed coil', 'Gravity coil', 'Invisibility', 'Monster ability', 'Attack or use item', 'Open or interact', 'Player list', 'Mute']) {
    assert.ok(html.includes(`title="${title}"`), title);
  }
  for (const label of ['SPRINT', 'EMOTE', 'SPEED', 'GRAV', 'CLOAK', 'ABILITY', 'ATTACK', 'OPEN', 'LIST', 'MUTE']) assert.match(html, new RegExp('>' + label + '<'));
});

check('Neon Spire loads with towers you cannot walk through and open streets', () => {
  const m = Core.genMap('Neon Spire');
  assert.equal(m.theme, 'Neon Spire');
  assert.equal(m.future, 1);
  assert.ok(m.bld.filter(b => b.kind === 'spire').length >= 6, 'spires');
  assert.ok(m.rails && m.rails.length >= 1);
  assert.ok(m.lanes && m.lanes.length >= 2);
  const tower = m.bld.find(b => b.kind === 'spire');
  const inside = m.walls.some(w => tower.x + 8 > w.x && tower.x + 8 < w.x + w.w && tower.y + 8 > w.y && tower.y + 8 < w.y + w.h);
  assert.equal(inside, true);
  const street = { x: tower.x + tower.w + 80, y: tower.y + tower.h / 2 };
  const blocked = m.walls.some(w => street.x > w.x && street.x < w.x + w.w && street.y > w.y && street.y < w.y + w.h);
  assert.equal(blocked, false, 'street ' + street.x + ',' + street.y);
  assert.ok(Core.THEMES.includes('Neon Spire'));
  assert.ok(Core.LOBBY.mall && Core.LOBBY.mall.entrances.length >= 3);
});

if (failed) process.exit(1);
console.log('v193 checks passed');
