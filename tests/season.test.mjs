import assert from 'node:assert/strict';
import { easterSunday, seasonFor, newYearNumber } from '../js/season.js';

const D = (y, m, d) => new Date(y, m - 1, d);
let failed = 0;
function check(name, fn) { try { fn(); console.log('ok', name); } catch (e) { failed++; console.error('FAIL', name, e.message); } }

check('Easter Sundays match the civil calendar', () => {
  const ymd = d => [d.getFullYear(), d.getMonth() + 1, d.getDate()];
  assert.deepEqual(ymd(easterSunday(2024)), [2024, 3, 31]);
  assert.deepEqual(ymd(easterSunday(2025)), [2025, 4, 20]);
  assert.deepEqual(ymd(easterSunday(2026)), [2026, 4, 5]);
  assert.deepEqual(ymd(easterSunday(2027)), [2027, 3, 28]);
});

check('November is Thanksgiving, including Nov 9, with no Christmas', () => {
  assert.equal(seasonFor(D(2026, 11, 1)), 'thanksgiving');
  assert.equal(seasonFor(D(2026, 11, 9)), 'thanksgiving');
  assert.equal(seasonFor(D(2026, 11, 26)), 'thanksgiving');
  assert.equal(seasonFor(D(2026, 11, 30)), 'thanksgiving');
});

check('December 1-30 is Christmas and Dec 31 through Jan 7 is New Year', () => {
  assert.equal(seasonFor(D(2026, 12, 1)), 'christmas');
  assert.equal(seasonFor(D(2026, 12, 30)), 'christmas');
  assert.equal(seasonFor(D(2026, 12, 31)), 'newyear');
  assert.equal(seasonFor(D(2027, 1, 1)), 'newyear');
  assert.equal(seasonFor(D(2027, 1, 7)), 'newyear');
  assert.equal(seasonFor(D(2027, 1, 8)), 'normal');
  assert.equal(newYearNumber(D(2026, 11, 9)), 2027);
  assert.equal(newYearNumber(D(2026, 12, 31)), 2027);
  assert.equal(newYearNumber(D(2027, 1, 3)), 2027);
});

check('fixed holidays and the gaps between them', () => {
  assert.equal(seasonFor(D(2026, 3, 9)), 'normal');
  assert.equal(seasonFor(D(2026, 3, 10)), 'stpatricks');
  assert.equal(seasonFor(D(2026, 3, 17)), 'stpatricks');
  assert.equal(seasonFor(D(2026, 3, 18)), 'normal');
  assert.equal(seasonFor(D(2026, 6, 1)), 'summer');
  assert.equal(seasonFor(D(2026, 6, 27)), 'summer');
  assert.equal(seasonFor(D(2026, 6, 28)), 'july4');
  assert.equal(seasonFor(D(2026, 7, 7)), 'july4');
  assert.equal(seasonFor(D(2026, 7, 8)), 'summer');
  assert.equal(seasonFor(D(2026, 8, 31)), 'summer');
  assert.equal(seasonFor(D(2026, 9, 1)), 'fall');
  assert.equal(seasonFor(D(2026, 10, 31)), 'fall');
  assert.equal(seasonFor(D(2026, 5, 1)), 'normal');
});

check('Easter runs from the Sunday before through Easter Monday', () => {
  assert.equal(seasonFor(D(2026, 3, 28)), 'normal');
  assert.equal(seasonFor(D(2026, 3, 29)), 'easter');
  assert.equal(seasonFor(D(2026, 4, 5)), 'easter');
  assert.equal(seasonFor(D(2026, 4, 6)), 'easter');
  assert.equal(seasonFor(D(2026, 4, 7)), 'normal');
  // 2024 Easter is March 31, so March 24-April 1. March 17 stays St Patrick's.
  assert.equal(seasonFor(D(2024, 3, 17)), 'stpatricks');
  assert.equal(seasonFor(D(2024, 3, 24)), 'easter');
  assert.equal(seasonFor(D(2024, 4, 1)), 'easter');
});

check('the season override wins over the date', () => {
  assert.equal(seasonFor(D(2026, 11, 9), 'christmas'), 'christmas');
  assert.equal(seasonFor(D(2026, 12, 25), 'thanksgiving'), 'thanksgiving');
  assert.equal(seasonFor(D(2026, 11, 9), 'nope'), 'thanksgiving');
  assert.equal(seasonFor(D(2026, 11, 9), ''), 'thanksgiving');
});

if (failed) { console.error(failed + ' failed'); process.exit(1); }
console.log('season checks passed');
