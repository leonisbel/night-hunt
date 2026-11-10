import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { KEYS, GUIDE_KEY, HUD_KEY, hudShown, nextHud, guideOpen, guideKeyFree } from '../js/keys.js';

let failed = 0;
function check(name, fn) { try { fn(); console.log('ok', name); } catch (e) { failed++; console.error('FAIL', name, e.message); } }

check('F1 is free and H hides the HUD', () => {
  assert.equal(guideKeyFree(), true);
  assert.equal(GUIDE_KEY, 'F1');
  assert.equal(HUD_KEY, 'KeyH');
  assert.equal(hudShown(null), true);
  assert.equal(hudShown('1'), true);
  assert.equal(hudShown('0'), false);
  assert.equal(nextHud('1'), '0');
  assert.equal(nextHud('0'), '1');
  assert.equal(nextHud(nextHud('1')), '1');
});

check('the key guide lists every action and stays off touch screens', () => {
  const text = KEYS.map(k => k.join(' ')).join('\n');
  for (const word of ['Move', 'Sprint', 'Space', 'Emote', 'F1', 'Hide or show the HUD', 'Jump']) assert.ok(text.includes(word), word);
  assert.equal(guideOpen({ touch: true, pinned: 'open', auto: true }), false);
  assert.equal(guideOpen({ touch: false, pinned: null, auto: true }), true);
  assert.equal(guideOpen({ touch: false, pinned: 'shut', auto: true }), false);
  assert.equal(guideOpen({ touch: false, pinned: 'open', auto: false }), true);
  assert.equal(guideOpen({ touch: false, pinned: null, auto: false }), false);
});

check('the page wires F1, H, the eye button, and Settings · Controls', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const js = readFileSync(new URL('../game.js', import.meta.url), 'utf8');
  assert.match(html, /id="keyguide"/);
  assert.match(html, /id="bhud"/);
  assert.match(html, /Settings · Controls/);
  assert.match(html, /F1 shows this key list/);
  assert.match(js, /GUIDE_KEY/);
  assert.match(js, /HUD_KEY/);
  assert.match(js, /<kbd>Space<\/kbd>/);
  assert.match(js, /<kbd>\$\{gk\[k\]/);
});

if (failed) process.exit(1);
console.log('key guide checks passed');
