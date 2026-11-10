// Local-date lobby seasons. Pure: no DOM, no Three.js. Override with ?season=.
export const SEASON_NAMES = ['christmas', 'newyear', 'stpatricks', 'easter', 'summer', 'july4', 'fall', 'thanksgiving'];

function pad(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
function addDays(date, n) {
  const d = pad(date);
  d.setDate(d.getDate() + n);
  return d;
}

// Gregorian computus. Returns local midnight on Easter Sunday.
export function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

// The year the banners should celebrate. January is that year; any later month points at the coming January.
export function newYearNumber(date) {
  const d = date || new Date();
  return d.getMonth() === 0 ? d.getFullYear() : d.getFullYear() + 1;
}

function seasonOn(date) {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  if ((month === 12 && day === 31) || (month === 1 && day <= 7)) return 'newyear';
  if (month === 12) return 'christmas';
  if (month === 11) return 'thanksgiving';
  if (month === 3 && day >= 10 && day <= 17) return 'stpatricks';
  const easter = easterSunday(date.getFullYear());
  const today = pad(date).getTime();
  if (today >= addDays(easter, -7).getTime() && today <= addDays(easter, 1).getTime()) return 'easter';
  if ((month === 6 && day >= 28) || (month === 7 && day <= 7)) return 'july4';
  if (month >= 6 && month <= 8) return 'summer';
  if (month === 9 || month === 10) return 'fall';
  return 'normal';
}

export function seasonFor(date, override) {
  const name = String(override || '').toLowerCase();
  if (SEASON_NAMES.includes(name)) return name;
  return seasonOn(date || new Date());
}
