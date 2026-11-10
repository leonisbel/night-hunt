import assert from 'node:assert/strict';
import { playGate, flyPose } from '../js/playgate.js';

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

if (failed) process.exit(1);
console.log('v193 checks passed');
