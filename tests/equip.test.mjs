// Regression: the showcase canvas used to be position:fixed over the Equip button, so the click never landed.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--no-sandbox'],
});
async function run(touch) {
  const page = await browser.newPage();
  if (touch) await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  else await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://127.0.0.1:8765/index.html?gfx=low', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.NightHuntCore, { timeout: 20000 });
  await page.evaluate(() => {
    const p = JSON.parse(localStorage.nhProfile || '{}');
    p.owned = [...new Set([...(p.owned || []), 'skin:shadow', 'skin:toxic'])];
    p.coinMig = 1;
    localStorage.nhProfile = JSON.stringify(p);
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.click('#bwarn');
  await page.evaluate(() => window.NH.locker.open('monskins'));
  await page.waitForSelector('#locker [data-equip-mon="freddy"]');
  const covered = await page.evaluate(() => {
    const b = document.querySelector('#locker [data-equip-mon="freddy"]');
    const r = b.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { ok: b === hit || b.contains(hit), tag: hit && hit.tagName, cls: hit && hit.className };
  });
  assert.equal(covered.ok, true, (touch ? 'touch' : 'desktop') + ' equip covered by ' + covered.tag + ' ' + covered.cls);
  if (touch) await page.tap('#locker [data-equip-mon="freddy"]');
  else await page.click('#locker [data-equip-mon="freddy"]');
  const pref = await page.evaluate(() => JSON.parse(localStorage.nhProfile).pref);
  assert.equal(pref, 'freddy', (touch ? 'touch' : 'desktop') + ' pref was ' + pref);
  if (touch) await page.tap('#locker [data-equip="skin:shadow"]');
  else await page.click('#locker [data-equip="skin:shadow"]');
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.nhProfile).skin), 'shadow');
  await page.evaluate(() => document.querySelector('#locker [data-show="skin:toxic"] b').dispatchEvent(new PointerEvent('pointerup', { bubbles: true })));
  await page.waitForSelector('.showcase .sc-eq');
  const showHit = await page.evaluate(() => {
    const b = document.querySelector('.showcase .sc-eq');
    const r = b.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { ok: hit === b || b.contains(hit), text: b.textContent, tag: hit && hit.className };
  });
  assert.equal(showHit.ok, true, 'showcase equip covered: ' + showHit.tag);
  if (touch) await page.tap('.showcase .sc-eq');
  else await page.click('.showcase .sc-eq');
  const skin = await page.evaluate(() => JSON.parse(localStorage.nhProfile).skin);
  assert.equal(skin, 'toxic');
  await page.reload({ waitUntil: 'domcontentloaded' });
  const again = await page.evaluate(() => { const p = JSON.parse(localStorage.nhProfile); return p.pref + ':' + p.skin; });
  assert.equal(again, 'freddy:toxic');
  await page.close();
  console.log('ok', touch ? 'touch' : 'desktop');
}
let failed = 0;
try { await run(false); await run(true); } catch (e) { failed++; console.error('FAIL', e.message); }
await browser.close();
if (failed) process.exit(1);
console.log('equip regression passed');
