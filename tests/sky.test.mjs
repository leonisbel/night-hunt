import assert from 'node:assert/strict';
import { SKIES, skyById, loadSky, saveSky } from '../js/skies.js';

let failed = 0;
function check(name, fn) { try { fn(); console.log('ok', name); } catch (e) { failed++; console.error('FAIL', name, e.message); } }

check('every sky has a unique id and a shader kind', () => {
  const ids = SKIES.map(s => s.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(ids, ['night', 'blackhole', 'pink', 'space', 'galaxy', 'aurora', 'bloodmoon', 'twomoons', 'meteors']);
  assert.ok(SKIES.every(s => s.price === 0 && s.fog && s.hemi && s.moon));
  assert.equal(SKIES[0].kind, 0);
  assert.ok(SKIES.slice(1).every(s => s.kind > 0));
});

check('unknown ids fall back to the default night sky', () => {
  assert.equal(skyById('nope').id, 'night');
  assert.equal(skyById('').id, 'night');
});

check('the choice is saved on this device and reloads', () => {
  const bag = {};
  const storage = { getItem: k => bag[k] || '', setItem: (k, v) => { bag[k] = v; } };
  assert.equal(loadSky(storage).id, 'night');
  assert.equal(saveSky('aurora', storage).id, 'aurora');
  assert.equal(loadSky(storage).id, 'aurora');
  assert.equal(saveSky('not-a-sky', storage).id, 'night');
  assert.equal(bag.nhSky, 'night');
});

if (failed) { console.error(failed + ' failed'); process.exit(1); }
console.log('sky checks passed');
