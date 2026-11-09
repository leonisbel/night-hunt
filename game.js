// Night Hunt client (3D): menu, networking glue, input (keyboard/mouse/touch), HUD and the three.js world.
import { World, S } from './js/render3d.js';
import { GFX, AUTO as GFX_AUTO, setTier } from './js/gfx.js';
import { audio, sfx, setAmbience, setRotor, staticHiss } from './js/audio.js';
import { oldWallpaper } from './js/textures.js';
import { initTouch } from './js/touch.js';
import { initLocker } from './js/locker.js';
import { EMOTES } from './js/emotes.js';
import { showcaseStats, closeShowcase } from './js/showcase.js';
const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const cam = { yaw: -Math.PI / 2, pitch: .55, zoom: localStorage.nhZoom != null ? +localStorage.nhZoom : .5 };
let ITEMS = {}, fireHeld = false, fireLatch = false, lastHp = null;
let me = null, room = null, map = null, snap = null, isHost = false, MON = {}, disp = {}, jumpscare = null, flight = null, results = null, muted = false;
const keys = {}; let mouse = { x: innerWidth / 2, y: innerHeight / 2, moved: false }, aimA = 0, lastMoveA = 0;
const mobileUA = matchMedia('(pointer:coarse)').matches || navigator.maxTouchPoints > 0;
let world;
try { world = new World($('c'), { mobile: mobileUA }); } catch (e) { $('merr').textContent = 'Your browser could not start 3D graphics (WebGL). Try another browser.'; console.error(e); }
addEventListener('resize', () => world && world.resize());
// expose state for tests/automation
window.NH = { cam, get map() { return map; }, get killing() { return !!killcam; }, locust: () => locustSlam(), scare: (type, fm, hold) => { scareShown = false; splats = null; jumpscare = { type, fm: fm || 0, start: performance.now() - (hold || 0) * 1000, until: performance.now() + 60000, freeze: hold }; }, unscare: () => { jumpscare = null; }, die: (type, fm, stats, killer) => { scareShown = false; splats = null; const n = performance.now(); jumpscare = { type, fm: fm || 0, start: n, until: n + scareLen(type, fm || 0) * 1000, death: { by: type, fm: fm || 0, killer, stats: stats || {} } }; sfx(scareSound(type)); }, results: m => { if (endBusy()) pendingResults = m; else showResults(m); }, get spec() { return spec; }, kill: (type, x, y, name, hold) => { killcam = { start: performance.now() - (hold || 0) * 1000, type, x, y, name, zoom: cam.zoom, pitch: cam.pitch }; killSplats = null; },  get locker() { return locker; }, fire(on) { fireHeld = !!on; if (on) fireLatch = true; }, open: () => send({ t: 'open' }), sel: i => send({ t: 'sel', i }), get snap() { return snap; }, get me() { return me; }, keys, get world() { return world; }, get touch() { return touch; }, get disp() { return disp; } };
Object.defineProperty(window, 'snap', { get: () => snap }); Object.defineProperty(window, 'me', { get: () => me }); window.keys = keys;
window.NH.showcaseStats = showcaseStats; window.NH.closeShowcase = closeShowcase;

// ---------- menu ----------
$('pname').value = localStorage.nhName || '';
// content warning (13+): must be accepted with Continue every time before the menu appears
$('bwarn').onclick = () => { $('warn').classList.add('hide'); $('menu').classList.remove('hide'); };
if ($('badmin')) $('badmin').onclick = () => $('admin').classList.remove('hide');
if ($('adminclose')) $('adminclose').onclick = () => $('admin').classList.add('hide');
const opt = { blood: localStorage.nhBlood !== '0' };
{ const gs = $('optgfx'); if (gs) { gs.value = GFX_AUTO ? 'auto' : GFX.tier; gs.onchange = () => { setTier(gs.value); const q = new URLSearchParams(location.search); q.delete('gfx'); location.search = q.toString(); }; } }
$('optblood').checked = opt.blood; $('optblood').onchange = () => { opt.blood = $('optblood').checked; localStorage.nhBlood = opt.blood ? '1' : '0'; if (world) world.blood = opt.blood; }; if (world) world.blood = opt.blood;
document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => {
  document.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('on', x === b));
  document.querySelectorAll('.tab').forEach(x => x.classList.add('hide')); $('tab-' + b.dataset.tab).classList.remove('hide');
  if (b.dataset.tab === 'browse') refreshList();
});
$('smax').oninput = () => $('maxv').textContent = $('smax').value;
function pname() { const n = $('pname').value.trim() || 'Player' + Math.floor(Math.random() * 900 + 100); localStorage.nhName = n; return n; }
$('bcreate').onclick = () => { audio.unlock(); $('merr').textContent = ''; NET.create({ player: pname(), name: $('sname').value, max: +$('smax').value, roundLen: +$('sround').value, isPublic: document.querySelector('input[name=priv]:checked').value === 'public' }); };
$('bjoin').onclick = () => { audio.unlock(); joinCode($('jcode').value); };
function joinCode(code) { code = code.toUpperCase().trim(); if (!/^[A-Z0-9]{5}$/.test(code)) { $('merr').textContent = 'Codes are 5 letters/numbers.'; return; } $('merr').textContent = 'Connecting…'; NET.join(code, pname()); }
$('brefresh').onclick = refreshList;
async function refreshList() {
  $('slist').textContent = 'Loading…';
  try {
    const l = await NET.list();
    $('slist').innerHTML = l.length ? '' : '<p>No public servers right now. Create one!</p>';
    for (const s of l) { const d = document.createElement('div'); d.className = 'srv'; d.innerHTML = `<span><b></b><br><small>${s.players}/${s.max} players · ${s.state === 'lobby' ? 'in lobby' : 'round in progress'}</small></span>`; d.querySelector('b').textContent = s.name;
      const b = document.createElement('button'); b.textContent = s.players >= s.max ? 'Full' : 'Join'; b.disabled = s.players >= s.max; b.onclick = () => { audio.unlock(); joinCode(s.code); }; d.appendChild(b); $('slist').appendChild(d); }
  } catch (e) { $('slist').textContent = 'Could not load server list.'; }
}
if (params.get('room')) { document.querySelector('[data-tab=join]').click(); $('jcode').value = params.get('room'); }

const send = o => NET.send(o);
NET.handlers(m => onMsg(m), err => { if (room) showMenu(err); else $('merr').textContent = err; });
setInterval(() => { if (!room && !$('tab-browse').classList.contains('hide')) refreshList(); }, 3000);
NET.detect().then(info => {
  const sel = $('mode');
  if (!NET.serverAvail) { sel.innerHTML = '<option value="online">🌐 Online (internet, peer-to-peer)</option>'; }
  sel.value = NET.serverAvail && !params.has('desktop') && !params.has('online') ? 'server' : 'online';
  NET.setMode(sel.value); sel.onchange = () => { NET.setMode(sel.value); refreshList(); };
  if (info && params.has('desktop')) { const d = document.createElement('div'); d.className = 'help';
    d.innerHTML = `<b>Desktop app:</b> "Online" lets friends anywhere join with your code. "Wi-Fi" mode uses this computer as the server: friends on the same Wi-Fi open <b>${info.lan.map(a => `http://${a}:${info.port}`).join(' or ') || `http://localhost:${info.port}`}</b>.`; $('menu').appendChild(d); }
});
// v1.6 footsteps by surface (CC0 recordings): wooden floors in houses, carpet in stores, concrete in facilities / streets, snow, grass
function surfaceAt(x, y) {
  if (!map) return 'grass'; const b = (map.bld || []).find(b => x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h);
  if (b) return b.type === 'house' ? 'wood' : b.type === 'store' ? 'carpet' : 'concrete';
  const th = map.theme; if (th === 'Snowy Mountain') return 'snow';
  if (th === 'Helipad Lobby' || th === 'Abandoned Pizzeria Town') return 'concrete';
  if (map.streets && map.streets.some(sy => Math.abs(y - sy) < 90)) return 'concrete';
  return 'grass';
}
function showMenu(err) { ['darkover', 'staticover', 'hallucover', 'sleepover', 'locustover', 'scareover'].forEach(i => $(i).classList.add('hide')); staticHiss(false); if (document.exitPointerLock && document.pointerLockElement) document.exitPointerLock(); room = null; snap = null; map = null; $('menu').classList.remove('hide'); $('hud').classList.add('hide'); $('overlay').classList.add('hide'); document.body.classList.remove('ingame'); $('merr').textContent = err || ''; setAmbience(null); setRotor(0); clearEnd(); }
$('bleave').onclick = () => { NET.leave(); showMenu(); };
$('binvite').onclick = () => { const u = location.origin + location.pathname + '?room=' + room; navigator.clipboard && navigator.clipboard.writeText(u).catch(() => { }); addEvent('Invite link copied: ' + u, 'good'); };
$('bstart').onclick = () => send({ t: 'start' });
$('baddbot').onclick = () => send({ t: 'addBot' });
$('bkick').onclick = () => send({ t: 'kickBot' });
$('hmax').onchange = () => send({ t: 'settings', max: +$('hmax').value });
$('hround').onchange = () => send({ t: 'settings', roundLen: +$('hround').value });
$('hpub').onchange = () => send({ t: 'settings', isPublic: $('hpub').checked });

function onMsg(m) {
  switch (m.t) {
    case 'error': if (room) addEvent(m.msg, 'bad'); else { $('merr').textContent = m.msg; NET.leave(); } break;
    case 'joined': $('merr').textContent = ''; room = m.code; me = m.you; isHost = m.host; MON = m.monsters; $('menu').classList.add('hide'); $('hud').classList.remove('hide'); document.body.classList.add('ingame');
      $('hcode').textContent = `${m.name} · Code ${m.code} · ${m.isPublic ? '🌍 Public' : '🔒 Friends only'}`; $('hmax').value = m.max; $('hpub').checked = m.isPublic; history.replaceState(null, '', '?room=' + m.code); ITEMS = m.items || {}; if (m.roundLen) $('hround').value = m.roundLen; sendProfile(); break;
    case 'host': isHost = true; addEvent('You are now the host', 'good'); break;
    case 'settings': if (m.roundLen) $('hround').value = m.roundLen; $('hmax').value = m.max; $('hpub').checked = m.isPublic; $('hcode').textContent = $('hcode').textContent.replace(/🌍 Public|🔒 Friends only/, m.isPublic ? '🌍 Public' : '🔒 Friends only'); break;
    case 'map': map = m.map; disp = {}; clearEnd(); cam.yaw = -Math.PI / 2; cam.pitch = .55; if (world) world.camInit = false; results = null; $('overlay').classList.add('hide'); if (world) world.setMap(map); setAmbience(map.heli ? 'lobby' : map.theme); break;
    case 's': snap = m; break;
    case 'event': addEvent(m.msg, m.kind); break;
    case 'flight': { const mine = m.roles.find(r => r.id === me); flight = { start: performance.now(), until: performance.now() + m.secs * 1000, theme: m.theme, mine }; showFlightCard(); sfx('heli'); break; }
    case 'caught': jumpscare = { type: m.by, fm: m.fm || 0, start: performance.now(), until: performance.now() + scareLen(m.by, m.fm || 0) * 1000, death: { by: m.by, fm: m.fm || 0, killer: m.killer, stats: m.stats || {} } }; sfx(scareSound(m.by)); if (navigator.vibrate) navigator.vibrate([80, 40, 200]); break;
    case 'scare': if (m.mid === me && world) { // the monster who made the catch sees the kill from its own view
        const v = snap && snap.ps.find(p => p.id === m.id); world.addWitness(m, disp);
        killcam = { start: performance.now(), type: m.by, x: m.x, y: m.y, name: m.vn || (v ? v.n : 'a survivor'), zoom: cam.zoom, pitch: cam.pitch }; killSplats = null; sfx('scare');
        break; }
      if (m.id !== me && world) { const md = disp[me]; const d = md ? Math.hypot(md.dx - m.x, md.dy - m.y) : 1e9; if (d < 900) { world.addWitness(m, disp); sfx('scream', { vol: Math.max(.25, 1 - d / 900), pan: md ? (m.x - md.dx) / 900 : 0 }); } } break;
    case 'fx': if (world) world.addFx(m); if (m.kind === 'siren') world.shake = .6; fxSound(m); break;
    case 'sfx': { const pan = posPan(m); if (m.kind === 'sirenhead') sfx('siren'); else if (m.kind === 'heli') sfx('heli'); else if (['open', 'down', 'dry', 'eat', 'drink', 'hit', 'pickup', 'laugh', 'dark', 'portal', 'inject', 'dream', 'buzz', 'stretch', 'sleep', 'sonlaugh', 'quake', 'shift', 'paranoia', 'wave', 'tentacle', 'thunder', 'whirl', 'nessie', 'roar', 'screech', 'fire', 'drain', 'bats', 'fester', 'boat', 'static', 'crack', 'mimic', 'skitter', 'trexroar', 'spinoroar'].includes(m.kind)) sfx(m.kind, m.kind === 'laugh' || m.kind === 'dark' || m.kind === 'sonlaugh' || m.kind === 'static' ? {} : m.idle ? { ...pan, vol: (pan.vol ?? 1) * .55 } : pan); else sfx('ability'); break; }
    case 'locust': locustSlam(); break;
    case 'kitused': if (locker) { locker.kitUsed(m.k); addEvent(`🎒 Your store supplies were packed: ${m.k.map(k => ITEMS[k] ? ITEMS[k].icon + ' ' + ITEMS[k].name : k).join(', ')}`, 'good'); } break;
    case 'pickup': { const I = ITEMS[m.k]; sfx('pickup'); if (I) addEvent(`Picked up ${I.icon} ${I.name}${m.n > 1 ? ' ×' + m.n : ''}`, 'good'); break; }
    case 'used': { const I = ITEMS[m.k]; if (I) sfx(I.drink ? 'drink' : I.type === 'armor' ? 'pickup' : 'eat'); break; }
    case 'hurt': sfx('hurt'); $('hpbar').classList.remove('hurt'); void $('hpbar').offsetWidth; $('hpbar').classList.add('hurt'); if (world) world.shake = Math.max(world.shake || 0, .35); if (navigator.vibrate) navigator.vibrate(60); break;
    case 'coins': if (locker) locker.addCoins(m.n); sfx('coin'); addEvent(`🪙 +${m.n} coins (total ${locker ? locker.profile.coins : m.n})`, 'good'); earnedLast = m.n; const ce = $('rcoins'); if (ce) ce.textContent = `🪙 +${m.n} coins`; break;
    case 'admin': { const box = $('adminstate'); if (box) box.textContent = m.msg || ''; $('admin') && $('admin').classList.remove('hide'); break; }
    case 'results': results = m; if (endBusy()) pendingResults = m; else showResults(m); break;
  }
}
function addEvent(msg, kind) { const d = document.createElement('div'); d.className = kind || ''; d.textContent = msg; $('events').appendChild(d); setTimeout(() => d.remove(), 7000); while ($('events').children.length > (touch.active ? 3 : 6)) $('events').firstChild.remove(); if (kind === 'good' && /escaped/i.test(msg)) sfx('escape'); }
function showResults(m) {
  pendingResults = null; $('deathscreen').classList.add('hide'); spec = null; $('specbar').classList.add('hide');
  const o = $('overlay'); o.classList.remove('hide'); o.classList.add('results');
  const win = m.winner === 'survivors' ? ['SURVIVORS WIN', '#6f6', '🚁'] : m.winner === 'monsters' ? ['MONSTER WINS', '#f44', '👹'] : ['TIE', '#ddd', '⚖️'];
  const mine = m.players.find(p => p.id === me), myWin = mine && ((m.winner === 'survivors' && mine.role !== 'monster') || (m.winner === 'monsters' && mine.role === 'monster'));
  const rows = m.players.slice().sort((a, b) => (b.role === 'monster') - (a.role === 'monster') || b.score - a.score).map(p => {
    const role = p.role === 'monster' ? `👹 ${esc(MON[p.mt] ? MON[p.mt].name : 'Monster')}` : '🔦 Survivor';
    const stat = p.role === 'monster' ? `<b style="color:#f66">${p.kills} kill${p.kills === 1 ? '' : 's'}</b>` : p.escaped ? '<b style="color:#6f6">🚁 Escaped</b>' : p.alive ? '<b style="color:#9cf">❤ Survived</b>' : '<b style="color:#f66">💀 Caught</b>';
    return `<tr class="${p.id === me ? 'me' : ''}"><td style="color:${p.color}">${esc(p.name)}${p.bot ? ' <small>🤖</small>' : ''}</td><td>${role}</td><td>${stat}</td><td>${p.role === 'monster' ? p.kills : p.dmg}</td><td>${p.downs}</td><td>🪙 ${p.earn}</td><td>${p.score}</td></tr>`; }).join('');
  o.innerHTML = `<div class="rbox"><div class="rbanner" style="color:${win[1]};border-color:${win[1]}">${win[2]} ${win[0]}</div>${mine ? `<div class="rme ${myWin ? 'w' : 'l'}">${myWin ? 'VICTORY' : 'DEFEAT'}</div>` : ''}
    <p class="rwhy">${esc(m.why || '')}</p><div class="rsum"><span>🚁 Escaped <b>${m.saved}</b></span><span>💀 Caught <b>${m.caught}</b></span><span>👥 Players <b>${m.players.length}</b></span></div>
    <table class="rtable"><tr><th>Player</th><th>Role</th><th>Result</th><th>Kills / Dmg</th><th>Knockdowns</th><th>Coins</th><th>Score</th></tr>${rows}</table>
    <p id="rcoins" class="rcoins">${earnedLast ? `🪙 +${earnedLast} coins earned (total ${locker.profile.coins})` : ''}</p><p><small id="rback">Back to the lobby soon…</small></p></div>`;
  resultsEnd = performance.now() + (m.secs || 14) * 1000;
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
// ---------- v1.4.1 end screens: death screen after the jumpscare, the monster's KILL popup, spectate, results queue ----------
let pendingResults = null, deathAt = 0, spec = null, killPopAt = 0, resultsEnd = 0;
const fmtT = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
function endBusy() { const n = performance.now(); return !!(jumpscare || killcam || (deathAt && n - deathAt < 3500 && !$('deathscreen').classList.contains('hide')) || (killPopAt && n - killPopAt < 1600)); }
function clearEnd() { pendingResults = null; deathAt = 0; spec = null; ['deathscreen', 'specbar', 'killpop'].forEach(i => $(i) && $(i).classList.add('hide')); const o = $('overlay'); if (o) o.classList.remove('results'); }
function showDeath(d) {
  const M = MON[d.by] || {}, F = M.forms ? M.forms[d.fm || 0] : null, st = d.stats || {}, el = $('deathscreen');
  el.innerHTML = `<div class="dsbox"><h1>YOU DIED</h1><h3>Killed by <b>${esc(F ? F.name : M.name || 'the monster')}</b>${d.killer ? ` <small>(${esc(d.killer)})</small>` : ''}</h3>
    <div class="dstats"><div><b>${fmtT(st.time || 0)}</b><small>Time survived</small></div><div><b>${st.dmg || 0}</b><small>Damage dealt</small></div><div><b>${st.downs || 0}</b><small>Monster knockdowns</small></div><div><b>🪙 ${st.earn || 0}</b><small>Coins earned</small></div></div>
    <p class="dsleft">${st.left != null ? `${st.left} survivor${st.left === 1 ? '' : 's'} still alive` : ''}</p>
    <div class="dsbtn"><button id="dsspec">👁 Spectate</button><button id="dslobby">🏠 Return to Lobby</button></div><p class="dshint">Round results will appear when the round ends.</p></div>`;
  el.classList.remove('hide'); el.classList.remove('in'); void el.offsetWidth; el.classList.add('in'); deathAt = performance.now(); sfx('dead');
  if (document.exitPointerLock && document.pointerLockElement) document.exitPointerLock();
  $('dsspec').onclick = () => startSpec(); $('dslobby').onclick = () => toLobby();
}
function specList() { return snap ? snap.ps.filter(p => p.id !== me && (p.role === 'monster' || (p.role === 'survivor' && p.al && !p.es))).sort((a, b) => (a.role === 'monster') - (b.role === 'monster')) : []; }
function startSpec(dir = 0) { const L = specList(); $('deathscreen').classList.add('hide'); if (!L.length) { spec = null; addEvent('Nobody left to spectate. Results are coming…'); return; }
  let i = spec ? L.findIndex(p => p.id === spec.id) : -1; i = ((i < 0 ? 0 : i + dir) % L.length + L.length) % L.length; spec = { id: L[i].id }; if (!dir) { cam.zoom = Math.max(cam.zoom, .75); cam.pitch = Math.max(cam.pitch, .45); } $('specbar').classList.remove('hide'); sfx('click'); }
function toLobby() { if (!isHost) { NET.leave(); showMenu(); return; } addEvent('🏠 You host this room, so you return to the helipad lobby with everyone when the round ends. Spectating until then…', 'good'); startSpec(); }
function showKillPop(name, type) { const el = $('killpop'), M = MON[type] || {}; el.innerHTML = `<b>KILL</b><span>${esc(name)} eliminated</span><small>${esc(M.name || '')} · +40 🪙</small>`; el.classList.remove('hide', 'go'); void el.offsetWidth; el.classList.add('go'); killPopAt = performance.now(); sfx('kill'); clearTimeout(showKillPop.t); showKillPop.t = setTimeout(() => el.classList.add('hide'), 2800); }
if ($('bemote')) $('bemote').onclick = () => playEmote();
$('specprev').onclick = () => startSpec(-1); $('specnext').onclick = () => startSpec(1); $('speclobby').onclick = () => toLobby(); $('specstats').onclick = () => { if (deathAt) { $('specbar').classList.add('hide'); spec = null; $('deathscreen').classList.remove('hide'); } };
function posPan(m) { const md = disp[me]; if (!md || m.x == null) return {}; const d = Math.hypot(m.x - md.dx, m.y - md.dy); return { pan: Math.max(-1, Math.min(1, (m.x - md.dx) / 600)), vol: Math.max(.15, 1 - d / 1400) }; }
function fxSound(m) {
  const o = posPan(m);
  if (m.kind === 'shot') sfx(m.w === 'shotgun' ? 'shotgun' : m.w === 'rifle' ? 'rifle' : 'gun', o);
  else if (m.kind === 'swing') sfx('swing', o);
  else if (m.kind === 'hit' || m.kind === 'slash') sfx('hit', o);
}
let earnedLast = 0;
function sendProfile() { if (room && locker) { const P = locker.profile; send({ t: 'profile', look: P.look, pref: P.pref, skin: P.owned.includes('skin:' + P.skin) ? P.skin : 'classic', kit: P.kit, gear: P.gear, gearOn: P.gearOn, emotes: P.owned.filter(id => String(id).startsWith('em:')).map(id => id.slice(3)) }); } }
const locker = initLocker({ onChange: () => sendProfile(), monsters: () => MON, sfx, onEmote: e => playEmote(e) });
function playEmote(e) { e = e || locker.emote(); if (!room) return; send({ t: 'emote', e }); }
let wheelTimer = 0, wheelOn = false, wheelPick = 0;
function wheelItems() { return EMOTES.filter(e => e.price === 0 || locker.profile.owned.includes('em:' + e.id)); }
function showWheel(on) {
  wheelOn = on; const el = $('emotewheel'); if (!el) return; el.classList.toggle('hide', !on); if (!on) return;
  const items = wheelItems();
  el.innerHTML = items.map((e, i) => `<button type="button" data-i="${i}" class="${i === wheelPick ? 'on' : ''}"><span>${e.icon}</span>${e.name}</button>`).join('');
  el.querySelectorAll('button').forEach(b => { b.onpointerdown = ev => { ev.preventDefault(); wheelPick = +b.dataset.i; playEmote(items[wheelPick].id); showWheel(false); }; });
}
function armWheel() { clearTimeout(wheelTimer); wheelTimer = setTimeout(() => showWheel(true), 280); }
function releaseWheel() { clearTimeout(wheelTimer); if (wheelOn) { const items = wheelItems(); if (items[wheelPick]) playEmote(items[wheelPick].id); showWheel(false); } else playEmote(); }
function showFlightCard() {
  const f = flight, M = f.mine && f.mine.role === 'monster' ? MON[f.mine.mt] : null, c = $('flightcard');
  c.classList.remove('hide'); c.classList.toggle('mon', !!M);
  const abilityKey = touch.active ? 'the ABILITY button' : 'Space / Click';
  c.innerHTML = `<div class="fl1">Flying to <b>${f.theme}</b> <span id="flsecs"></span></div><div class="fl2">${M ? 'YOU ARE THE MONSTER: ' + M.name.toUpperCase() : 'YOU ARE A SURVIVOR'}</div><div class="fl3">${M ? `Ability (${abilityKey}): <b>${M.ability}</b> — ${M.desc}. Catch the survivors!` : `Search chests and bags (${touch.active ? '📦 OPEN' : 'E'}) for weapons, armor, food and drinks. Fight back (${touch.active ? '⚔️' : 'Click / Space'}), hide, and reach the extraction helicopter in the last 90 seconds!`}</div>`;
}

// ---------- input ----------
const KM = { KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'turnL', KeyD: 'right', ArrowRight: 'turnR', ShiftLeft: 'sprint', ShiftRight: 'sprint' };
addEventListener('keydown', e => {
  if (document.activeElement.tagName === 'INPUT') return;
  audio.unlock();
  if (KM[e.code]) { keys[KM[e.code]] = 1; e.preventDefault(); }
  if (e.code === 'Space') { if (!e.repeat) { primary(true); } e.preventDefault(); }
  if (e.code === 'KeyE') { const z = storeZone(); if (z) locker.open(ZONE_TAB[z.k] || z.k); else if (snap && (snap.state === 'lobby' || amSurvivor())) send({ t: 'open' }); else send({ t: 'ability' }); e.preventDefault(); }
  if (e.code === 'KeyZ') send({ t: 'gear', k: 'speed' });
  if (e.code === 'KeyX') send({ t: 'gear', k: 'grav' });
  if (e.code === 'KeyC') send({ t: 'gear', k: 'invis' });
  if (e.code === 'KeyQ' && !amSurvivor()) send({ t: 'ability' });
  if (/^Digit[1-6]$/.test(e.code)) send({ t: 'sel', i: +e.code[5] - 1 });
  if (e.code === 'KeyG') send({ t: 'drop' });
  if (e.code === 'Tab') { e.preventDefault(); showBoard(true); }
  if (e.code === 'KeyM') muted = audio.toggleMute();
  if (e.code === 'KeyB' && !e.repeat && snap) armWheel();
  if (spec && (e.code === 'ArrowRight' || e.code === 'KeyN')) startSpec(1); if (spec && e.code === 'ArrowLeft') startSpec(-1);
});
addEventListener('keyup', e => { if (KM[e.code]) keys[KM[e.code]] = 0; if (e.code === 'Space') primary(false); if (e.code === 'Tab') showBoard(false); if (e.code === 'KeyB') releaseWheel(); });
addEventListener('blur', () => { for (const k in keys) keys[k] = 0; });
// camera look: pointer lock (click the game) or drag with any mouse button; wheel zooms first person <-> third person
const locked = () => document.pointerLockElement === $('c');
let dragBtn = false;
function look(dx, dy, k = 1) { cam.yaw += dx * .0032 * k; cam.pitch = Math.max(-.45, Math.min(1.4, cam.pitch + dy * .0026 * k)); }
addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; if (locked() || (dragBtn && e.target === $('c'))) look(e.movementX || 0, e.movementY || 0); });
$('c').addEventListener('contextmenu', e => e.preventDefault());
$('c').addEventListener('mousedown', e => { if (touch.active && e.sourceCapabilities?.firesTouchEvents) return; dragBtn = true; if (room && !locked() && !params.has('nolock') && $('c').requestPointerLock) try { const r = $('c').requestPointerLock(); if (r && r.catch) r.catch(() => { }); } catch { } });
addEventListener('mouseup', () => { dragBtn = false; });
function zoomBy(d) { cam.zoom = Math.max(0, Math.min(1, cam.zoom + d)); if (cam.zoom < .08 && d < 0) cam.zoom = 0; localStorage.nhZoom = cam.zoom; }
$('c').addEventListener('wheel', e => { e.preventDefault(); zoomBy(e.deltaY * .0011); }, { passive: false });
function amSurvivor() { const mp = snap && snap.ps.find(p => p.id === me); return !!(mp && snap.state === 'playing' && mp.role === 'survivor' && mp.al && !mp.es); }
// primary action: survivors attack / shoot / eat the selected item (held = auto-fire); monsters use their ability
function primary(down) { if (!room) return; if (down && !amSurvivor()) { send({ t: 'ability' }); return; } fireHeld = down; if (down) fireLatch = true; }
$('c').addEventListener('mousedown', e => { if (touch.active && e.sourceCapabilities?.firesTouchEvents) return; audio.unlock(); if (e.button === 0) primary(true); });
addEventListener('mouseup', e => { if (e.button === 0) primary(false); });

let boardOn = false;
const touch = initTouch({ onAttack: on => primary(on), onOpen: () => { const z = storeZone(); if (z) locker.open(ZONE_TAB[z.k] || z.k); else send({ t: 'open' }); }, onAbility: () => send({ t: 'ability' }), onBoard: () => { boardOn = !boardOn; showBoard(boardOn); }, onMute: () => (muted = audio.toggleMute()), onEmote: () => showWheel(!wheelOn), onGear: k => send({ t: 'gear', k }), unlock: () => audio.unlock(), onResize: () => world && world.resize() });
setInterval(() => {
  if (!room) return;
  // movement is relative to the camera: forward = where the camera looks
  const fx = Math.cos(cam.yaw), fy = Math.sin(cam.yaw), rx = -fy, ry = fx;
  let ix = (keys.right ? 1 : 0) - (keys.left ? 1 : 0), iy = (keys.up ? 1 : 0) - (keys.down ? 1 : 0);
  if (!ix && !iy && touch.mv) { ix = touch.mv.x; iy = -touch.mv.y; }
  let mv = null; if (ix || iy) { mv = [rx * ix + fx * iy, ry * ix + fy * iy]; const l = Math.hypot(mv[0], mv[1]); if (l > 1) mv = [mv[0] / l, mv[1] / l]; }
  const k = { sprint: keys.sprint || touch.sprint ? 1 : 0 };
  const f = fireHeld || fireLatch; fireLatch = false;
  send({ t: 'input', k, a: aimA, mv, f });
}, 50);
function showBoard(on) {
  const b = $('board'); b.classList.toggle('hide', !on || !snap); if (!on || !snap) return;
  b.innerHTML = `<b>Players ${snap.ps.length}/${snap.max}</b><table></table>`; const tb = b.querySelector('table');
  for (const p of snap.ps) { const tr = tb.insertRow(); tr.insertCell().textContent = (p.h ? '👑 ' : '') + p.n; tr.cells[0].style.color = p.c; tr.insertCell().textContent = p.sc + ' pts'; }
}
function updateAim(mp, md, dt) {
  if (keys.turnL) cam.yaw -= dt * 2.4; if (keys.turnR) cam.yaw += dt * 2.4;
  if (touch.lookDx || touch.lookDy) { look(touch.lookDx, touch.lookDy, 1.7); touch.lookDx = touch.lookDy = 0; }
  if (touch.pinch) { zoomBy(-touch.pinch * .004); touch.pinch = 0; }
  aimA = cam.yaw;
}
// ---------- frame loop ----------
let lastT = performance.now(), lastBeat = 0, stepT = 0;
let shotHold = false;
function frame(now) {
  if (shotHold) return;
  requestAnimationFrame(frame);
  const dt = Math.min(.1, (now - lastT) / 1000); lastT = now; const t = now / 1000;
  if (!world) return;
  if (jumpscare && now > jumpscare.until) { const d = jumpscare.death; jumpscare = null; if (d) showDeath(d); }
  if (pendingResults && !endBusy()) showResults(pendingResults);
  if (resultsEnd && !$('overlay').classList.contains('hide')) { const rb = $('rback'); if (rb) rb.textContent = `Back to the lobby in ${Math.max(0, Math.ceil((resultsEnd - now) / 1000))}s…`; }
  if (flight && now > flight.until) { flight = null; $('flightcard').classList.add('hide'); }
  if (flight) { const s = $('flsecs'); if (s) s.textContent = '· landing in ' + Math.ceil((flight.until - now) / 1000) + 's'; }
  setRotor(flight ? .9 : snap && map && map.heli && disp[me] ? Math.max(0, .5 - Math.hypot(disp[me].dx - map.heli.x, disp[me].dy - map.heli.y) / 1400) : snap && snap.ex && disp[me] ? Math.max(0, .5 - Math.hypot(disp[me].dx - snap.ex.x, disp[me].dy - snap.ex.y) / 1600) : 0);
  document.body.classList.toggle('cutscene', !!(jumpscare || flight));
  document.body.classList.toggle('killcam', !!killcam);
  if (killcam) {
    const e = window.NH.killHold != null ? window.NH.killHold : (now - killcam.start) / 1000, md = disp[me];
    if (e > KILL_LEN || !md) { cam.zoom = killcam.zoom; cam.pitch = killcam.pitch; cam.target = null; const kn = killcam.name, kt = killcam.type; killcam = null; $('scareover').classList.add('hide'); showKillPop(kn, kt); }
    else { cam.yaw = Math.atan2(killcam.y - md.dy, killcam.x - md.dx); cam.zoom = 0; cam.target = { x: killcam.x, y: killcam.y }; drawKill(e); }
  }
  if (jumpscare) { const e = jumpscare.freeze != null ? jumpscare.freeze : (now - jumpscare.start) / 1000; world.frame(dt, t, { scare: { type: jumpscare.type, fm: jumpscare.fm, elapsed: e } }); drawScare(jumpscare.type, e); arrows([]); return; }
  else if (scareShown && !killcam) { scareShown = false; $('scareover').classList.add('hide'); }
  if (flight) { world.frame(dt, t, { flight: { elapsed: (now - flight.start) / 1000, left: (flight.until - now) / 1000, monster: flight.mine && flight.mine.role === 'monster' } }); arrows([]); return; }
  if (!room || !map || !snap) { world.frame(dt, t, {}); return; }
  for (const p of snap.ps) { const d = disp[p.id] || (disp[p.id] = { dx: p.x, dy: p.y }); const k = Math.min(1, dt * 14); if (Math.hypot(p.x - d.dx, p.y - d.dy) > 300) { d.dx = p.x; d.dy = p.y; } d.dx += (p.x - d.dx) * k; d.dy += (p.y - d.dy) * k; }
  const mp = snap.ps.find(p => p.id === me), md = disp[me]; if (!mp || !md) return;
  const ghost = snap.state === 'playing' && (!mp.al || mp.es || mp.role === 'ghost');
  updateAim(mp, md, dt);
  const prev = md.px != null ? Math.hypot(md.dx - md.px, md.dy - md.py) : 0; md.px = md.dx; md.py = md.dy;
  if (spec && (snap.state !== 'playing' || !ghost)) { spec = null; $('specbar').classList.add('hide'); }
  let sp = spec && snap.ps.find(p => p.id === spec.id); if (spec && (!sp || !disp[sp.id] || (sp.role === 'survivor' && (!sp.al || sp.es)))) { startSpec(1); sp = spec && snap.ps.find(p => p.id === spec.id); }
  if (sp) { const M = sp.role === 'monster' ? MON[sp.mt] : null; $('specname').innerHTML = `👁 Spectating <b style="color:${sp.c}">${esc(sp.n)}</b> ${M ? '· 👹 ' + esc(M.name) : '· 🔦 Survivor'}`; }
  const r = sp ? world.frame(dt, t, { snap, disp, me: sp.id, mp: sp, ghost: false, aim: sp.a, cam }) : world.frame(dt, t, { snap, disp, me, mp, ghost, aim: aimA, cam });
  overlays(mp, ghost, now);
  // footsteps + heartbeat
  const speed = prev / Math.max(dt, .001);
  if (speed > 40 && !ghost) { stepT -= dt * (speed / 230); if (stepT <= 0) { stepT = .42; sfx(mp.role === 'monster' && snap.state !== 'lobby' ? 'stomp' : 'step', { vol: mp.role === 'monster' ? .5 : 1, surf: surfaceAt(md.dx, md.dy) }); } }
  for (const p of snap.ps) if (p.id !== me && p.role === 'monster' && snap.state === 'playing') { const d = disp[p.id], dd = Math.hypot(d.dx - md.dx, d.dy - md.dy); if (dd < 500 && Math.random() < dt * 2.2) sfx('stomp', { vol: (1 - dd / 500) * .7, pan: (d.dx - md.dx) / 500 }); }
  if (mp.role === 'survivor' && !ghost && snap.state === 'playing' && snap.md < 520 && now - lastBeat > (snap.md < 250 ? 420 : 850)) { lastBeat = now; sfx('beat', { vol: snap.md < 250 ? 1 : .6 }); if (navigator.vibrate && snap.md < 250) navigator.vibrate(30); }
  // edge arrows: helicopter pad in the lobby, extraction chopper during the hunt, siren reveals for monsters
  const tg = [];
  if (map.heli && snap.state === 'lobby' && !snap.boarded.includes(me)) tg.push({ x: map.heli.x, y: map.heli.y, c: '#ffd76b', l: '🚁 BOARD' });
  if (snap.ex && (mp.role === 'survivor' || ghost)) tg.push({ x: snap.ex.x, y: snap.ex.y, c: '#5dff8a', l: '🚁 ESCAPE' });
  if (mp.role === 'monster' && snap.state === 'playing') for (const p of snap.ps) if (p.st.reveal && p.al && !p.es && disp[p.id]) tg.push({ x: disp[p.id].dx, y: disp[p.id].dy, c: '#ff3b3b', l: '👁', mark: true });
  arrows(tg, md);
  hud(mp, ghost);
}
const arrowEls = [];
function arrows(list, md) {
  while (arrowEls.length < list.length) { const d = document.createElement('div'); d.className = 'edgearrow'; d.innerHTML = '<i></i><span></span>'; $('arrows').appendChild(d); arrowEls.push(d); }
  arrowEls.forEach((el, i) => {
    const a = list[i]; if (!a) { el.style.display = 'none'; return; }
    const p = world.project(a.x, a.y, 1), W = innerWidth, H = innerHeight, m = 46;
    const inside = !p.behind && p.x > m && p.y > m && p.x < W - m && p.y < H - m;
    el.style.display = ''; el.style.color = a.c; el.querySelector('span').textContent = a.l + (a.mark ? '' : ' ' + Math.round(Math.hypot(a.x - md.dx, a.y - md.dy) * S) + 'm');
    let x = p.x, y = p.y, ang = Math.atan2(p.y - H / 2, p.x - W / 2);
    if (!inside) { const cx = W / 2, cy = H / 2, dx = Math.cos(ang), dy = Math.sin(ang), k = Math.min((W / 2 - m) / Math.abs(dx || 1e-6), (H / 2 - m) / Math.abs(dy || 1e-6)); x = cx + dx * k; y = cy + dy * k; }
    el.classList.toggle('inside', inside); el.style.transform = `translate(${x}px,${y}px)`; el.querySelector('i').style.transform = `rotate(${inside ? Math.PI / 2 : ang}rad)`;
  });
}
function hud(mp, ghost) {
  const st = snap.state; const M = mp.role === 'monster' ? MON[mp.mt] : null;
  $('hcount').textContent = `👥 ${snap.ps.length}/${snap.max}`;
  $('timer').textContent = st === 'playing' ? `${Math.floor(snap.tl / 60)}:${String(snap.tl % 60).padStart(2, '0')}` : st === 'lobby' ? 'HELIPAD' : '';
  const alive = snap.ps.filter(p => p.role === 'survivor' && p.al && !p.es).length;
  const status = mp.st.stun ? ' <b style="color:#ff0">★ STUNNED</b>' : mp.st.root ? ' <b style="color:#ff7ab6">STUCK!</b>' : mp.st.blind ? ' <b style="color:#aaa">LIGHTS OUT</b>' : '';
  $('rolebox').innerHTML = st !== 'playing' ? '' : ghost ? (mp.es ? '🚁 You escaped! Spectating…' : '💀 You were caught. Spectating as a ghost…') + `<br>Survivors left: ${alive}` : M ? `👹 You are <b style="color:#f44">${M.name}</b> — catch everyone! Survivors left: ${alive}` : `🔦 Survivor — hide &amp; survive! Survivors left: ${alive}${status}`;
  const showAb = !!(M && st === 'playing');
  $('ability').classList.toggle('hide', !showAb);
  const DF = M && M.forms ? M.forms[snap.me.fm || 0] : null;
  if (M) $('ability').innerHTML = DF ? `<b>${DF.name}: ${DF.ability}</b> <small>${touch.active ? '' : '(Space / Click)'}</small><br><small>${DF.desc}</small><br><small>🔄 next form in ${snap.me.fmT}s</small><br>${snap.me.cd > 0 ? `⏳ ${snap.me.cd.toFixed(1)}s` : '<b style="color:#6f6">READY</b>'}` : `<b>${M.ability}</b> <small>${touch.active ? '' : '(Space / Click)'}</small><br><small>${M.desc}</small><br>${snap.me.cd > 0 ? `⏳ ${snap.me.cd.toFixed(1)}s` : '<b style="color:#6f6">READY</b>'}`;
  const tab = $('tability'); tab.classList.toggle('hide', !showAb); if (showAb) { tab.classList.toggle('cool', snap.me.cd > 0); tab.querySelector('small').textContent = snap.me.cd > 0 ? snap.me.cd.toFixed(1) + 's' : DF ? DF.ability : M.ability; }
  $('tsprint').classList.toggle('hide', ghost || st === 'results');
  $('stam').classList.toggle('hide', !(st === 'playing' && mp.role === 'survivor' && !ghost)); $('stam').firstChild.style.width = snap.me.stamina + '%'; $('stam').firstChild.style.background = mp.st.grey ? '#777' : snap.me.stamina < 25 ? '#c33' : '#3c3';
  $('hostbox').classList.toggle('hide', !(isHost && st === 'lobby'));
  document.body.classList.toggle('inlobby', st === 'lobby');
  invHud(mp, ghost); p2Hud(mp, ghost);
  const boarded = snap.boarded.length, humans = snap.ps.filter(p => !p.b), hb = humans.filter(p => snap.boarded.includes(p.id)).length;
  $('lobbyhint').classList.toggle('hide', st !== 'lobby');
  const nearDoor = st === 'lobby' && map && map.heli && disp[me] && Math.hypot(disp[me].dx - map.heli.x, disp[me].dy - map.heli.y) < (map.heli.board || 88);
  const imSeated = snap.boarded.includes(me);
  if (st === 'lobby') $('lobbyhint').innerHTML = `🚁 ${imSeated ? 'You are seated. E climbs out.' : nearDoor ? 'E — sit in the helicopter.' : 'Walk to the helicopter door, then press E to sit.'} ${boarded}/${snap.ps.length} seated<br><small>${snap.ps.length < 2 ? 'Need at least 2 players. Invite friends with the code' + (isHost ? ' or add a bot' : '') : hb < humans.length ? 'Waiting for everyone to sit down…' : isHost ? 'Everyone is seated — press Take off!' : 'Waiting for the host to take off…'}</small>`;
  const gb = $('gearbar'); if (gb) { const g = snap.me && snap.me.gear; const showG = st === 'playing' && mp.role === 'survivor' && !ghost && g && Object.keys(g).length; gb.classList.toggle('hide', !showG); if (showG) gb.innerHTML = Object.entries(g).map(([k, s]) => `<button type="button" data-g="${k}" class="${s.left > 0 ? 'on' : ''}">${k === 'speed' ? '🌀' : k === 'grav' ? '🌙' : '👻'} ${s.left > 0 ? s.left.toFixed(1) + 's' : s.cd > 0 ? s.cd.toFixed(1) + 's' : 'READY'}</button>`).join(''); gb.querySelectorAll('button').forEach(b => b.onclick = () => send({ t: 'gear', k: b.dataset.g })); }
  for (const [id, k] of [['tspeed', 'speed'], ['tgrav', 'grav'], ['tinvis', 'invis']]) { const n = $(id); if (!n) continue; const s = snap.me && snap.me.gear && snap.me.gear[k]; const on = st === 'playing' && mp.role === 'survivor' && !ghost && s; n.classList.toggle('hide', !on); if (on) n.innerHTML = `${k === 'speed' ? '🌀' : k === 'grav' ? '🌙' : '👻'}<small>${s.left > 0 ? s.left.toFixed(0) + 's' : s.cd > 0 ? s.cd.toFixed(0) + 's' : 'OK'}</small>`; }
}
// ---------- v1.4: the walk-in lobby store, boats, storm / weather overlays, Father Fester stage ----------
const ZONE_TAB = { shop: 'food', mirror: 'clothing', skins: 'skinshop' };
let lastZone = null;
function storeZone() { if (!snap || snap.state !== 'lobby' || !map || !map.zones) return null; const md = disp[me]; if (!md) return null; return map.zones.find(z => md.dx > z.x && md.dx < z.x + z.w && md.dy > z.y && md.dy < z.y + z.h) || null; }
function p2Hud(mp, ghost) {
  const z = storeZone(), zp = $('zoneprompt');
  if (z !== lastZone) { lastZone = z; if (z) { sfx('click'); locker.open(ZONE_TAB[z.k] || z.k); } }
  zp.classList.toggle('hide', !z); if (z) { zp.innerHTML = `${z.ic || { shop: '🛒', mirror: '🪞', skins: '✨' }[z.k] || '🛒'} ${z.name}<small>${touch.active ? 'Tap here' : 'Press E'} to browse · walk out to leave</small>`; zp.onclick = () => locker.open(ZONE_TAB[z.k] || z.k); }
  const live = snap.state === 'playing' && !ghost, S2 = mp.st || {}, ov = $('p2over');
  const cls = live ? (S2.burn ? 'burn' : S2.fog ? 'fog' : S2.snow ? 'snow' : S2.storm ? 'storm' : S2.soak ? 'soak' : '') : '';
  if (ov.className !== cls) ov.className = cls;
  let warn = '';
  if (live && S2.storm) warn = '⛈ STORM! TURN BACK TO CALM WATER ⛈';
  else if (live && S2.thunder) warn = '⚡ LIGHTNING INCOMING — KEEP MOVING ⚡';
  else if (live && map && map.islands && mp.role === 'survivor') { const md = disp[me]; if (md && Math.hypot(md.dx - map.w / 2, md.dy - map.h / 2) > map.safe * .86) warn = '⚠ Storm ahead — the sea gets deadly past the red buoys'; }
  else if (live && mp.role === 'monster' && mp.mt === 'fester') warn = `Father Fester · stage ${mp.fm || 0}/6`;
  const pw = $('p2warn'); pw.classList.toggle('hide', !warn); if (warn && pw.textContent !== warn) pw.textContent = warn;
}
function boatPrompt(mp) {
  if (!snap.bt || !snap.bt.length || mp.role !== 'survivor') return null; const md = disp[me]; if (!md) return null;
  if (mp.bt) return 'E — get off the boat ⚓';
  const b = snap.bt.find(b => Math.hypot(b[1] - md.dx, b[2] - md.dy) < (b[4] ? 120 : 90)); return b ? `E — board the ${b[4] ? 'ship 🚢' : 'boat 🚤'}` : null;
}
let hotSig = '';
function invHud(mp, ghost) {
  const sv = snap.state === 'playing' && mp.role === 'survivor' && !ghost && snap.me.inv;
  $('vitals').classList.toggle('hide', !sv); $('hotbar').classList.toggle('hide', !sv);
  $('tattack').classList.toggle('hide', !sv);
  let near = null;
  if (sv && map.loot) { const md = disp[me], lo = new Set(snap.lo || []); let bd = 75; for (const c of map.loot) if (!lo.has(c.id)) { const d = Math.hypot(c.x - md.dx, c.y - md.dy); if (d < bd) { bd = d; near = c; } } }
  let bed = null; if (sv && !near && !mp.st.sleep && map.props) { const md = disp[me]; bed = map.props.find(o => o.k === 'bed' && md.dx > o.x - 40 && md.dx < o.x + o.w + 40 && md.dy > o.y - 40 && md.dy < o.y + o.h + 40); }
  let ex = false; if (sv && snap.ex && disp[me]) ex = Math.hypot(snap.ex.x - disp[me].dx, snap.ex.y - disp[me].dy) < snap.ex.r + 10;
  const bp = sv && !near && !bed && !ex ? boatPrompt(mp) : null;
  $('prompt').classList.toggle('hide', !near && !bed && !bp && !ex); if (ex) $('prompt').textContent = 'E — board the extraction helicopter 🚁'; else if (bp) $('prompt').textContent = bp; else if (near) $('prompt').textContent = `E — open ${near.kind === 'chest' ? 'chest 🧰' : 'bag 🎒'}`; else if (bed) $('prompt').textContent = 'E — sleep in bed 🛏️ (heals)';
  $('topen').classList.toggle('hide', !near && !bed && !(sv && mp.st.sleep)); $('topen').firstChild.textContent = near ? '📦' : bed ? '🛏️' : '⏰'; $('topen').querySelector('small').textContent = near ? 'OPEN' : bed ? 'SLEEP' : 'WAKE';
  if (!sv) return;
  const M = snap.me, hp = Math.max(0, M.hp), pct = hp / M.mhp * 100;
  $('hpbar').firstChild.style.width = pct + '%'; $('hpbar').firstChild.style.background = pct < 30 ? 'linear-gradient(#f66,#a22)' : pct < 60 ? 'linear-gradient(#fd5,#b80)' : 'linear-gradient(#5f5,#2a2)';
  $('hpbar').lastChild.textContent = `❤ ${hp} / ${M.mhp}`;
  $('armor').innerHTML = (M.vest > 0 ? `🦺 ${M.vest}` : '') + (M.helmet > 0 ? ` ⛑️ ${M.helmet}` : '');
  const sel = M.inv[M.sel], I = sel ? ITEMS[sel[0]] : ITEMS.fists, ammoTxt = I && I.type === 'gun' ? `${I.icon} ${M.ammo[I.ammo]} rds` : I ? I.name : '';
  const sig = JSON.stringify([M.inv, M.sel, ammoTxt]); if (sig === hotSig) return; hotSig = sig;
  const hb = $('hotbar'); hb.innerHTML = '';
  M.inv.forEach((s, i) => { const b = document.createElement('button'); b.className = 'slot' + (i === M.sel ? ' on' : ''); const it = s && ITEMS[s[0]];
    b.innerHTML = `<i>${i + 1}</i>${it ? it.icon : ''}${s && s[1] > 1 ? `<b>${s[1]}</b>` : ''}`; b.title = it ? it.name : (i === M.sel ? 'Fists' : 'Empty');
    b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); send({ t: 'sel', i }); if (i === M.sel && it && it.type !== 'gun' && it.type !== 'melee') primary(true), setTimeout(() => primary(false), 60); }); hb.appendChild(b); });
  const a = document.createElement('div'); a.className = 'ammo'; a.textContent = ammoTxt; hb.appendChild(a);
}
let locust = null;
// Locust omen for ONE random survivor: the screen first becomes its broadcast (old wallpaper, the tall
// figure standing there, a friendly child-like voice), then it slams into the glass and breaks out: cracks, scream, warning.
const LOC_SLAM = 1.4;
let _wall = null;
// Boisvert's dead channel: the whole screen becomes opaque, animated TV snow with a roaring hiss
let stc = null;
function drawStatic(on) {
  const el = $('staticover'); el.classList.toggle('hide', !on); staticHiss(on); if (!on) return;
  if (!stc) { el.width = 320; el.height = 180; stc = { g: el.getContext('2d'), im: null }; stc.im = stc.g.createImageData(320, 180); }
  const d = stc.im.data, roll = (performance.now() / 9) % 180 | 0;
  for (let y = 0; y < 180; y++) { const band = Math.abs(y - roll) < 6 ? 40 : 0, line = y % 2 ? .82 : 1; for (let x = 0; x < 320; x++) { const i = (y * 320 + x) * 4, n = Math.min(255, (Math.random() * 255 * line + band) | 0); d[i] = d[i + 1] = d[i + 2] = n; d[i + 3] = 255; } }
  stc.g.putImageData(stc.im, 0, 0);
}
function wallpaper() { // old faded beige floral wallpaper with brownish water smears (as in the Locust broadcast)
  if (_wall) return _wall; const c = document.createElement('canvas'); c.width = 512; c.height = 384; const g = c.getContext('2d'); oldWallpaper(g, 512, 384, 1); return (_wall = c);
}
function locustFigure(g) { // the tall black figure with a stretched pale face, hollow eyes and tubes around head/neck
  g.fillStyle = '#060607'; g.beginPath(); g.moveTo(-34, 260); g.lineTo(-26, 40); g.quadraticCurveTo(0, 18, 26, 40); g.lineTo(34, 260); g.fill();
  for (const sx of [-1, 1]) { g.save(); g.translate(sx * 30, 46); g.rotate(sx * .06); g.fillRect(-4, 0, 8, 170); g.restore(); }
  g.fillRect(-6, -30, 12, 60); g.strokeStyle = '#25262a'; g.lineWidth = 5; for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse(0, -20 + i * 10, 12, 4, 0, 0, 6.283); g.stroke(); }
  g.fillStyle = '#060607'; g.beginPath(); g.ellipse(0, -62, 22, 36, 0, 0, 6.283); g.fill();
  g.fillStyle = '#8c8682'; g.beginPath(); g.ellipse(1, -62, 16, 29, .05, 0, 6.283); g.fill();
  g.fillStyle = '#000'; g.beginPath(); g.ellipse(-6, -70, 4, 7, -.1, 0, 6.283); g.fill(); g.beginPath(); g.ellipse(8, -71, 4.6, 8, .12, 0, 6.283); g.fill(); g.beginPath(); g.ellipse(2, -48, 4, 5, .1, 0, 6.283); g.fill();
  g.strokeStyle = '#25262a'; g.lineWidth = 3.5; for (const [y, r] of [[-82, .45], [-64, -.35], [-50, .2]]) { g.beginPath(); g.ellipse(0, y, 24, 8, r, 0, 6.283); g.stroke(); }
}
function locustSlam() {
  locust = { t0: performance.now(), x: innerWidth * (.4 + Math.random() * .2), y: innerHeight * (.4 + Math.random() * .2), slammed: false,
    cracks: Array.from({ length: 16 }, () => { const a = Math.random() * 6.283, pts = [[0, 0]]; let x = 0, y = 0; for (let i = 0; i < 7; i++) { x += Math.cos(a + (Math.random() - .5) * .8) * (30 + Math.random() * 60); y += Math.sin(a + (Math.random() - .5) * .8) * (30 + Math.random() * 60); pts.push([x, y]); } return pts; }) };
  sfx('childvoice');
}
function drawLocust(now) {
  const c = $('locustover'), e = (now - locust.t0) / 1000; if (e > 4.6) { locust = null; c.classList.add('hide'); return; }
  c.classList.remove('hide'); if (c.width !== innerWidth) { c.width = innerWidth; c.height = innerHeight; }
  const g = c.getContext('2d'), W = c.width, H = c.height, k = Math.min(W, H) / 520; g.clearRect(0, 0, W, H);
  if (e >= LOC_SLAM && !locust.slammed) { locust.slammed = true; sfx('locust'); if (navigator.vibrate) navigator.vibrate([200, 60, 300]); if (world) world.shake = 1; }
  const fade = e > 3.6 ? 1 - (e - 3.6) : 1;
  // 1) the broadcast: old wallpaper fills the screen, the figure stands in it, flickering static
  const wa = Math.min(1, e / .3) * (e > LOC_SLAM + .5 ? Math.max(0, 1 - (e - LOC_SLAM - .5) / .6) : 1);
  if (wa > 0) { g.globalAlpha = wa * fade; g.drawImage(wallpaper(), 0, 0, W, H);
    if (e < LOC_SLAM) { const pre = e / LOC_SLAM; g.save(); g.translate(W / 2 + Math.sin(e * 37) * 2, H * .62); g.scale(k * (.7 + pre * .5), k * (.7 + pre * .5)); locustFigure(g); g.restore();
      g.fillStyle = '#fff2dc'; g.font = `italic bold ${Math.round(26 * k)}px Comic Sans MS, cursive`; g.textAlign = 'center'; g.shadowColor = '#000'; g.shadowBlur = 6; g.fillText(e < .7 ? '"hi friend!"' : '"come play with me!"', W / 2, H * .9); g.shadowBlur = 0; }
    g.fillStyle = 'rgba(0,0,0,.18)'; for (let y = (now / 20) % 4; y < H; y += 4) g.fillRect(0, y, W, 1);
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * .25})`; g.fillRect(Math.random() * W, Math.random() * H, 2 + Math.random() * 30, 1.5); } }
  g.globalAlpha = fade;
  if (e < LOC_SLAM) return;
  // 2) the slam: it lunges at the glass, face and hands pressed against it, then breaks out
  const sl = Math.min(1, (e - LOC_SLAM) / .16), sc = (.4 + sl * .85) * k;
  g.fillStyle = `rgba(120,0,0,${.35 * fade})`; g.fillRect(0, 0, W, H);
  g.save(); g.translate(locust.x, locust.y + (1 - sl) * 80); g.scale(sc * .9, sc * .9); g.rotate(-.08);
  // the Locust's real form slams against the glass: a long black head, stretched grey human face with hollow eyes, cable-like tubes, long black fingers
  g.fillStyle = '#050506'; for (const sx of [-1, 1]) { g.save(); g.translate(sx * 190, 60); g.rotate(sx * .25); g.beginPath(); g.ellipse(0, 0, 38, 46, 0, 0, 6.283); g.fill(); for (let f = 0; f < 4; f++) { g.beginPath(); g.ellipse(-30 + f * 20, -95, 7, 60, (f - 1.5) * .12, 0, 6.283); g.fill(); } g.restore(); }
  g.beginPath(); g.ellipse(0, 10, 118, 175, 0, 0, 6.283); g.fill();
  const fg = g.createRadialGradient(-10, -20, 10, 0, 0, 150); fg.addColorStop(0, '#a29c97'); fg.addColorStop(.7, '#77716c'); fg.addColorStop(1, '#3a3836'); g.fillStyle = fg;
  g.beginPath(); g.ellipse(4, 0, 92, 150, .05, 0, 6.283); g.fill();
  g.fillStyle = '#000'; g.beginPath(); g.ellipse(-36, -40, 22, 38, -.1, 0, 6.283); g.fill(); g.beginPath(); g.ellipse(40, -46, 26, 44, .12, 0, 6.283); g.fill();
  g.strokeStyle = '#5a5551'; g.lineWidth = 4; g.beginPath(); g.moveTo(2, -20); g.lineTo(-4, 40); g.lineTo(10, 46); g.stroke();
  g.fillStyle = '#000'; g.beginPath(); g.ellipse(8, 92, 30, 18, .15, 0, 6.283); g.fill();
  g.strokeStyle = '#1e1f23'; g.lineWidth = 16; for (const [ry, rot] of [[-70, .35], [10, -.3], [120, .15]]) { g.beginPath(); g.ellipse(0, ry, 130, 42, rot, 0, 6.283); g.stroke(); }
  g.lineWidth = 3; g.strokeStyle = '#33353a'; for (const [ry, rot] of [[-70, .35], [10, -.3], [120, .15]]) { g.beginPath(); g.ellipse(0, ry, 130, 42, rot, 0, 6.283); g.stroke(); }
  g.restore();
  { g.save(); g.translate(locust.x, locust.y); g.strokeStyle = `rgba(255,255,255,${.85 * fade})`; g.lineWidth = 2; g.shadowColor = '#000'; g.shadowBlur = 4;
    const grow = Math.min(1, (e - LOC_SLAM) / .25);
    for (const cr of locust.cracks) { g.beginPath(); g.moveTo(0, 0); const n = Math.max(1, Math.round(cr.length * grow)); for (let i = 1; i < n; i++) g.lineTo(cr[i][0] * k * 1.8, cr[i][1] * k * 1.8); g.stroke(); }
    for (let rr = 1; rr <= 3; rr++) { g.beginPath(); g.arc(0, 0, rr * 38 * k * grow, 0, 6.283); g.stroke(); } g.restore();
    g.globalAlpha = fade; g.fillStyle = '#ff3030'; g.font = `bold ${Math.round(28 * Math.min(1.4, innerWidth / 800))}px sans-serif`; g.textAlign = 'center'; g.fillText('THE LOCUST IS NEAR…', innerWidth / 2, innerHeight * .2); }
}
function overlays(mp, ghost, now) {
  const alive = snap.state === 'playing' && !ghost && mp.role === 'survivor';
  $('darkover').classList.toggle('hide', !(alive && mp.st.dark));
  drawStatic(!!(alive && mp.st.static));
  const hal = !!(alive && mp.st.halluc); $('hallucover').classList.toggle('hide', !hal); document.body.classList.toggle('halluc', hal);
  $('sleepover').classList.toggle('hide', !(alive && mp.st.sleep));
  if (locust) drawLocust(now);
}
requestAnimationFrame(frame);
if (params.has('desktop') && $('dlwin')) $('dlwin').remove();

// ---------- jumpscares: one per monster, then a cut to black at impact (with optional teen-level blood splatter) ----------
const IMPACT = { sirenhead: 2.0, cartooncat: 1.9, boisvert: 2.0, locust: 1.9, megalodon: 2.95, kraken: 2.05, cthulhu: 2.25, leviathan: 2.05, mosasaurus: 1.65, nessie: 2.15, spinosaurus: 2.05, trex: 2.05, quetzalcoatlus: 2.15, dragon: 2.15, yeti: 2.0, bigfoot: 2.0, chupacabra: 1.65, vampire: 2.0, gargoyle: 1.6, fester: 2.1, wendigo: 1.55 };
const impactOf = (type, fm) => type === 'megalodon' && fm === 1 ? 1.25 : IMPACT[type] || 1.55;
const scareLen = (type, fm) => Math.max(2.6, impactOf(type, fm) + 1.05);
let scareShown = false, splats = null, killcam = null, killSplats = null;
const KILL_LEN = 2.4;
function scareSound(k) { const x = { trex: 'trexroar', spinosaurus: 'spinoroar', wendigo: 'crack', yeti: 'roar', bigfoot: 'roar', dragon: 'fire', quetzalcoatlus: 'screech', gargoyle: 'screech', vampire: 'bats', fester: 'fester', cthulhu: 'thunder', kraken: 'tentacle', leviathan: 'wave', nessie: 'nessie', megalodon: 'wave', mosasaurus: 'wave' }[k]; if (x) setTimeout(() => sfx(x), 200); return { sonicexe: 'sonlaugh', sirenhead: 'siren', locust: 'locust', boisvert: 'static' }[k] || x ? 'scare2' : 'scare'; }
function drawScare(type, e) {
  const c = $('scareover'); if (!scareShown) { scareShown = true; c.classList.remove('hide'); splats = null; c.width = innerWidth; c.height = innerHeight; }
  const g = c.getContext('2d'), W = c.width, H = c.height, imp = impactOf(type, jumpscare ? jumpscare.fm : 0); g.clearRect(0, 0, W, H);
  if (e < imp) {
    if (type === 'locust') { // possession: screen tears, colour channels split, static
      for (let i = 0; i < 14; i++) { const y = Math.random() * H, h = 4 + Math.random() * 30; g.fillStyle = `rgba(${Math.random() < .5 ? 255 : 0},${Math.random() * 80 | 0},${Math.random() < .5 ? 255 : 0},${.08 + e * .08})`; g.fillRect((Math.random() - .5) * 60, y, W, h); }
      g.fillStyle = `rgba(0,0,0,${Math.min(.5, e * .25)})`; g.fillRect(0, 0, W, H);
      for (let i = 0; i < 500; i++) { g.fillStyle = Math.random() < .5 ? '#fff3' : '#0005'; g.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
    } else if (type === 'boisvert') { // you dissolve: grey squares eat the picture
      const n = Math.floor(e / imp * 900), sz = Math.max(14, W / 36); g.fillStyle = '#000';
      let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < n; i++) { g.fillStyle = i % 3 ? '#000' : '#777'; g.fillRect(Math.floor(rnd() * W / sz) * sz, Math.floor(rnd() * H / sz) * sz, sz, sz); }
    } else if (type === 'cartooncat') { g.fillStyle = `rgba(255,255,255,${Math.max(0, .15 - e * .05)})`; g.fillRect(0, 0, W, H); }
    if (e > imp - .25) { g.fillStyle = `rgba(255,255,255,${(e - (imp - .25)) * 2.4})`; g.fillRect(0, 0, W, H); } // impact flash
    return;
  }
  // impact: cut to black
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  if (opt.blood) {
    if (!splats) { splats = []; for (let i = 0; i < 9; i++) { const x = Math.random() * W, y = Math.random() * H * .8, r = 30 + Math.random() * Math.min(W, H) * .12; const drops = []; for (let k = 0; k < 14; k++) { const a = Math.random() * 6.283, d = r * (.9 + Math.random() * 1.1); drops.push([x + Math.cos(a) * d, y + Math.sin(a) * d, 3 + Math.random() * r * .18]); } splats.push({ x, y, r, drops, drip: Array.from({ length: 4 }, () => [x + (Math.random() - .5) * r, 40 + Math.random() * 160, 4 + Math.random() * 6]) }); } }
    const k = Math.min(1, (e - imp) * 6), run = Math.max(0, e - imp);
    g.globalAlpha = .92; for (const s of splats) {
      g.fillStyle = '#7a0006'; g.beginPath(); g.arc(s.x, s.y, s.r * k, 0, 6.283); g.fill();
      g.fillStyle = '#9c0a10'; g.beginPath(); g.arc(s.x - s.r * .15, s.y - s.r * .15, s.r * .6 * k, 0, 6.283); g.fill();
      g.fillStyle = '#7a0006'; for (const d of s.drops) { g.beginPath(); g.arc(s.x + (d[0] - s.x) * k, s.y + (d[1] - s.y) * k, d[2], 0, 6.283); g.fill(); }
      for (const d of s.drip) { const len = d[1] * Math.min(1, run * 1.2); g.fillRect(d[0] - d[2] / 2, s.y, d[2], len); g.beginPath(); g.arc(d[0], s.y + len, d[2] * .8, 0, 6.283); g.fill(); }
    } g.globalAlpha = 1;
  }
  const M = MON[type]; g.fillStyle = '#ff2a2a'; g.font = `bold ${Math.round(Math.min(W, H) * .07)}px Georgia, serif`; g.textAlign = 'center';
  if (e > imp + .3) g.fillText(M ? `${M.name.toUpperCase()} GOT YOU` : 'CAUGHT', W / 2, H * .55);
}

// the catching monster's own view of the kill: the victim's animation in the world, a red pulse, blood at the edges, caption
function drawKill(e) {
  const c = $('scareover'); c.classList.remove('hide'); if (c.width !== innerWidth) { c.width = innerWidth; c.height = innerHeight; }
  const g = c.getContext('2d'), W = c.width, H = c.height, imp = impactOf(killcam.type, 0); g.clearRect(0, 0, W, H);
  const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .25, W / 2, H / 2, Math.max(W, H) * .7); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(90,0,0,${.35 + Math.sin(e * 9) * .1})`); g.fillStyle = vg; g.fillRect(0, 0, W, H);
  if (e >= imp) {
    if (opt.blood) {
      if (!killSplats) { killSplats = []; for (let i = 0; i < 7; i++) { const edge = i % 4; const x = edge === 0 ? Math.random() * W * .2 : edge === 1 ? W - Math.random() * W * .2 : Math.random() * W, y = edge >= 2 ? (edge === 2 ? Math.random() * H * .15 : H - Math.random() * H * .15) : Math.random() * H; killSplats.push([x, y, 25 + Math.random() * Math.min(W, H) * .09]); } }
      const k = Math.min(1, (e - imp) * 6); g.fillStyle = 'rgba(122,0,6,.85)';
      for (const [x, y, r] of killSplats) { g.beginPath(); g.arc(x, y, r * k, 0, 6.283); g.fill(); for (let d = 0; d < 5; d++) { g.beginPath(); g.arc(x + Math.cos(d * 1.3 + x) * r * 1.4 * k, y + Math.sin(d * 1.3 + y) * r * 1.4 * k, r * .14, 0, 6.283); g.fill(); } }
    }
    g.fillStyle = '#ff2a2a'; g.font = `bold ${Math.round(Math.min(W, H) * .06)}px Georgia, serif`; g.textAlign = 'center'; g.fillText(`YOU CAUGHT ${String(killcam.name).toUpperCase()}`, W / 2, H * .8);
  }
}

// Screenshot hook (?shot=city|mall|heli|emote|showcase|admin|mobile). Not used in normal play.
if (params.has('shot')) {
  const kind = params.get('shot');
  $('warn').classList.add('hide'); $('menu').classList.add('hide');
  if (kind === 'admin') { $('admin').classList.remove('hide'); window.NH.shotReady = true; }
  else if (kind === 'showcase') {
    locker.open('weapons');
    setTimeout(() => { const b = document.querySelector('[data-show="knife"]'); if (b) b.click(); const wait = () => { const c = document.querySelector('.showcase canvas'); if (c && c.width > 8) window.NH.shotReady = true; else requestAnimationFrame(wait); }; wait(); }, 50);
  } else {
    shotHold = true; document.body.classList.add('ingame', 'inlobby'); if (kind === 'mobile') { document.body.classList.add('touchmode'); $('hud').classList.remove('hide'); }
    const map = NightHuntCore.LOBBY; world.setMap(map);
    const spot = kind === 'mall' ? { x: 2460, y: 2080, yaw: Math.PI / 2, pitch: 0.22, zoom: 0.55 } : kind === 'heli' ? { x: map.heli.x + 40, y: map.heli.y + 220, yaw: -Math.PI / 2, pitch: 0.22, zoom: 0.62 } : kind === 'emote' ? { x: 2480, y: 680, yaw: -Math.PI / 2, pitch: 0.2, zoom: 0.5 } : { x: 290, y: 1380, yaw: -Math.PI / 2, pitch: 0.18, zoom: 0.95 };
    const ps = [{ id: 1, n: 'Alex', c: '#3498db', x: spot.x, y: spot.y, a: spot.yaw, role: 'lobby', al: 1, es: 0, st: {}, lk: '2,1,0,,,cap,scarf,ranger,none,none', em: kind === 'emote' ? 'groove' : undefined }];
    const disp = { 1: { dx: spot.x, dy: spot.y } }, camS = { yaw: spot.yaw, pitch: spot.pitch, zoom: spot.zoom };
    const snapS = { state: 'lobby', ps, boarded: [], max: 4, me: { stamina: 100, cd: 0, hp: 100, mhp: 100, inv: [0, 0, 0, 0, 0, 0], sel: 0, ammo: {}, vest: 0, helmet: 0, fm: 0, fmT: 0, gear: {} }, tl: 0 };
    let n = 0; const loop = t => { world.frame(1 / 60, t / 1000, { snap: snapS, disp, me: 1, mp: ps[0], ghost: false, aim: spot.yaw, cam: camS }); if (++n === 12) window.NH.shotReady = true; if (n < 20) requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
}
