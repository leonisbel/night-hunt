// Night Hunt client (3D): menu, networking glue, input (keyboard/mouse/touch), HUD and the three.js world.
import { World, S } from './js/render3d.js';
import { audio, sfx, setAmbience, setRotor } from './js/audio.js';
import { initTouch } from './js/touch.js';
const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
let me = null, room = null, map = null, snap = null, isHost = false, MON = {}, disp = {}, jumpscare = null, flight = null, results = null, muted = false;
const keys = {}; let mouse = { x: innerWidth / 2, y: innerHeight / 2, moved: false }, aimA = 0, lastMoveA = 0;
const mobileUA = matchMedia('(pointer:coarse)').matches || navigator.maxTouchPoints > 0;
let world;
try { world = new World($('c'), { mobile: mobileUA }); } catch (e) { $('merr').textContent = 'Your browser could not start 3D graphics (WebGL). Try another browser.'; console.error(e); }
addEventListener('resize', () => world && world.resize());
// expose state for tests/automation
window.NH = { get snap() { return snap; }, get me() { return me; }, keys, get world() { return world; }, get touch() { return touch; }, get disp() { return disp; } };
Object.defineProperty(window, 'snap', { get: () => snap }); Object.defineProperty(window, 'me', { get: () => me }); window.keys = keys;

// ---------- menu ----------
$('pname').value = localStorage.nhName || '';
document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => {
  document.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('on', x === b));
  document.querySelectorAll('.tab').forEach(x => x.classList.add('hide')); $('tab-' + b.dataset.tab).classList.remove('hide');
  if (b.dataset.tab === 'browse') refreshList();
});
$('smax').oninput = () => $('maxv').textContent = $('smax').value;
function pname() { const n = $('pname').value.trim() || 'Player' + Math.floor(Math.random() * 900 + 100); localStorage.nhName = n; return n; }
$('bcreate').onclick = () => { audio.unlock(); $('merr').textContent = ''; NET.create({ player: pname(), name: $('sname').value, max: +$('smax').value, isPublic: document.querySelector('input[name=priv]:checked').value === 'public' }); };
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
function showMenu(err) { room = null; snap = null; map = null; $('menu').classList.remove('hide'); $('hud').classList.add('hide'); $('overlay').classList.add('hide'); document.body.classList.remove('ingame'); $('merr').textContent = err || ''; setAmbience(null); setRotor(0); }
$('bleave').onclick = () => { NET.leave(); showMenu(); };
$('binvite').onclick = () => { const u = location.origin + location.pathname + '?room=' + room; navigator.clipboard && navigator.clipboard.writeText(u).catch(() => { }); addEvent('Invite link copied: ' + u, 'good'); };
$('bstart').onclick = () => send({ t: 'start' });
$('baddbot').onclick = () => send({ t: 'addBot' });
$('bkick').onclick = () => send({ t: 'kickBot' });
$('hmax').onchange = () => send({ t: 'settings', max: +$('hmax').value });
$('hpub').onchange = () => send({ t: 'settings', isPublic: $('hpub').checked });

function onMsg(m) {
  switch (m.t) {
    case 'error': if (room) addEvent(m.msg, 'bad'); else { $('merr').textContent = m.msg; NET.leave(); } break;
    case 'joined': $('merr').textContent = ''; room = m.code; me = m.you; isHost = m.host; MON = m.monsters; $('menu').classList.add('hide'); $('hud').classList.remove('hide'); document.body.classList.add('ingame');
      $('hcode').textContent = `${m.name} · Code ${m.code} · ${m.isPublic ? '🌍 Public' : '🔒 Friends only'}`; $('hmax').value = m.max; $('hpub').checked = m.isPublic; history.replaceState(null, '', '?room=' + m.code); break;
    case 'host': isHost = true; addEvent('You are now the host', 'good'); break;
    case 'settings': $('hmax').value = m.max; $('hpub').checked = m.isPublic; $('hcode').textContent = $('hcode').textContent.replace(/🌍 Public|🔒 Friends only/, m.isPublic ? '🌍 Public' : '🔒 Friends only'); break;
    case 'map': map = m.map; disp = {}; results = null; $('overlay').classList.add('hide'); if (world) world.setMap(map); setAmbience(map.heli ? 'lobby' : map.theme); break;
    case 's': snap = m; break;
    case 'event': addEvent(m.msg, m.kind); break;
    case 'flight': { const mine = m.roles.find(r => r.id === me); flight = { start: performance.now(), until: performance.now() + m.secs * 1000, theme: m.theme, mine }; showFlightCard(); sfx('heli'); break; }
    case 'caught': jumpscare = { type: m.by, start: performance.now(), until: performance.now() + 1500 }; sfx('scare'); if (navigator.vibrate) navigator.vibrate([80, 40, 200]); break;
    case 'fx': if (world) world.addFx(m); if (m.kind === 'siren') world.shake = .6; break;
    case 'sfx': if (m.kind === 'sirenhead') sfx('siren'); else if (m.kind === 'heli') sfx('heli'); else sfx('ability'); break;
    case 'results': results = m; showResults(m); break;
  }
}
function addEvent(msg, kind) { const d = document.createElement('div'); d.className = kind || ''; d.textContent = msg; $('events').appendChild(d); setTimeout(() => d.remove(), 7000); while ($('events').children.length > (touch.active ? 3 : 6)) $('events').firstChild.remove(); if (kind === 'good' && /escaped/i.test(msg)) sfx('escape'); }
function showResults(m) {
  const o = $('overlay'); o.classList.remove('hide');
  const title = m.winner === 'survivors' ? '<h2 style="color:#6f6">SURVIVORS WIN</h2>' : m.winner === 'monsters' ? '<h2 style="color:#f44">MONSTERS WIN</h2>' : '<h2>TIE</h2>';
  o.innerHTML = title + `<p>${m.why}</p><p>Escaped: ${m.saved} · Caught: ${m.caught}</p><div id="rtab"></div><p><small>Back to the helipad soon…</small></p>`;
  const tb = document.createElement('table'); tb.style.margin = 'auto';
  for (const p of m.players.sort((a, b) => b.score - a.score)) { const tr = tb.insertRow(); tr.insertCell().textContent = p.name; tr.insertCell().textContent = p.role === 'monster' ? '👹 ' + MON[p.mt].name : p.escaped ? '🚁 escaped' : p.alive ? 'alive' : '💀 caught'; tr.insertCell().textContent = p.score + ' pts'; tr.cells[0].style.color = p.color; }
  o.querySelector('#rtab').appendChild(tb);
}
function showFlightCard() {
  const f = flight, M = f.mine && f.mine.role === 'monster' ? MON[f.mine.mt] : null, c = $('flightcard');
  c.classList.remove('hide'); c.classList.toggle('mon', !!M);
  const abilityKey = touch.active ? 'the ABILITY button' : 'Space / Click';
  c.innerHTML = `<div class="fl1">Flying to <b>${f.theme}</b> <span id="flsecs"></span></div><div class="fl2">${M ? 'YOU ARE THE MONSTER: ' + M.name.toUpperCase() : 'YOU ARE A SURVIVOR'}</div><div class="fl3">${M ? `Ability (${abilityKey}): <b>${M.ability}</b> — ${M.desc}. Catch the survivors!` : 'Hide in bushes and crates, sprint to escape, survive until sunrise or reach the extraction helicopter!'}</div>`;
}

// ---------- input ----------
const KM = { KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', ShiftLeft: 'sprint', ShiftRight: 'sprint' };
addEventListener('keydown', e => {
  if (document.activeElement.tagName === 'INPUT') return;
  audio.unlock();
  if (KM[e.code]) { keys[KM[e.code]] = 1; e.preventDefault(); }
  if (e.code === 'Space' || e.code === 'KeyE') { send({ t: 'ability' }); e.preventDefault(); }
  if (e.code === 'Tab') { e.preventDefault(); showBoard(true); }
  if (e.code === 'KeyM') muted = audio.toggleMute();
});
addEventListener('keyup', e => { if (KM[e.code]) keys[KM[e.code]] = 0; if (e.code === 'Tab') showBoard(false); });
addEventListener('blur', () => { for (const k in keys) keys[k] = 0; });
$('c').addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.moved = true; });
$('c').addEventListener('mousedown', e => { if (touch.active && e.sourceCapabilities?.firesTouchEvents) return; audio.unlock(); if (room) send({ t: 'ability' }); });
let boardOn = false;
const touch = initTouch({ onAbility: () => send({ t: 'ability' }), onBoard: () => { boardOn = !boardOn; showBoard(boardOn); }, onMute: () => (muted = audio.toggleMute()), unlock: () => audio.unlock() });
setInterval(() => {
  if (!room) return;
  const k = { ...keys }; if (touch.sprint) k.sprint = 1;
  send({ t: 'input', k, a: aimA, mv: touch.mv ? [touch.mv.x, touch.mv.y] : null });
}, 50);
function showBoard(on) {
  const b = $('board'); b.classList.toggle('hide', !on || !snap); if (!on || !snap) return;
  b.innerHTML = `<b>Players ${snap.ps.length}/${snap.max}</b><table></table>`; const tb = b.querySelector('table');
  for (const p of snap.ps) { const tr = tb.insertRow(); tr.insertCell().textContent = (p.h ? '👑 ' : '') + p.n; tr.cells[0].style.color = p.c; tr.insertCell().textContent = p.sc + ' pts'; }
}
function updateAim(mp, md) {
  if (touch.active && !mouse.moved) {
    // touch: the aim pad wins while held; otherwise face the walking direction; a released aim is kept until you walk
    if (touch.aiming && touch.aim != null) aimA = touch.aim;
    else if (touch.mv && Math.hypot(touch.mv.x, touch.mv.y) > .25) { aimA = Math.atan2(touch.mv.y, touch.mv.x); touch.aim = null; }
    else if (touch.aim != null) aimA = touch.aim;
    return;
  }
  const kx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0), ky = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
  if (mouse.moved && world) { const g = world.aimFromScreen(mouse.x, mouse.y); if (g) aimA = Math.atan2(g.y - md.dy, g.x - md.dx); }
  else if (kx || ky) aimA = Math.atan2(ky, kx);
}

// ---------- frame loop ----------
let lastT = performance.now(), lastBeat = 0, stepT = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.1, (now - lastT) / 1000); lastT = now; const t = now / 1000;
  if (!world) return;
  if (jumpscare && now > jumpscare.until) jumpscare = null;
  if (flight && now > flight.until) { flight = null; $('flightcard').classList.add('hide'); }
  if (flight) { const s = $('flsecs'); if (s) s.textContent = '· landing in ' + Math.ceil((flight.until - now) / 1000) + 's'; }
  setRotor(flight ? .9 : snap && map && map.heli && disp[me] ? Math.max(0, .5 - Math.hypot(disp[me].dx - map.heli.x, disp[me].dy - map.heli.y) / 1400) : snap && snap.ex && disp[me] ? Math.max(0, .5 - Math.hypot(disp[me].dx - snap.ex.x, disp[me].dy - snap.ex.y) / 1600) : 0);
  document.body.classList.toggle('cutscene', !!(jumpscare || flight));
  if (jumpscare) { world.frame(dt, t, { scare: { type: jumpscare.type, elapsed: (now - jumpscare.start) / 1000 } }); arrows([]); return; }
  if (flight) { world.frame(dt, t, { flight: { elapsed: (now - flight.start) / 1000, left: (flight.until - now) / 1000, monster: flight.mine && flight.mine.role === 'monster' } }); arrows([]); return; }
  if (!room || !map || !snap) { world.frame(dt, t, {}); return; }
  for (const p of snap.ps) { const d = disp[p.id] || (disp[p.id] = { dx: p.x, dy: p.y }); const k = Math.min(1, dt * 14); if (Math.hypot(p.x - d.dx, p.y - d.dy) > 300) { d.dx = p.x; d.dy = p.y; } d.dx += (p.x - d.dx) * k; d.dy += (p.y - d.dy) * k; }
  const mp = snap.ps.find(p => p.id === me), md = disp[me]; if (!mp || !md) return;
  const ghost = snap.state === 'playing' && (!mp.al || mp.es || mp.role === 'ghost');
  updateAim(mp, md);
  const prev = md.px != null ? Math.hypot(md.dx - md.px, md.dy - md.py) : 0; md.px = md.dx; md.py = md.dy;
  const r = world.frame(dt, t, { snap, disp, me, mp, ghost, aim: aimA });
  // footsteps + heartbeat
  const speed = prev / Math.max(dt, .001);
  if (speed > 40 && !ghost) { stepT -= dt * (speed / 230); if (stepT <= 0) { stepT = .42; sfx(mp.role === 'monster' && snap.state !== 'lobby' ? 'stomp' : 'step', { vol: mp.role === 'monster' ? .5 : 1 }); } }
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
  if (M) $('ability').innerHTML = `<b>${M.ability}</b> <small>${touch.active ? '' : '(Space / Click)'}</small><br><small>${M.desc}</small><br>${snap.me.cd > 0 ? `⏳ ${snap.me.cd.toFixed(1)}s` : '<b style="color:#6f6">READY</b>'}`;
  const tab = $('tability'); tab.classList.toggle('hide', !showAb); if (showAb) { tab.classList.toggle('cool', snap.me.cd > 0); tab.querySelector('small').textContent = snap.me.cd > 0 ? snap.me.cd.toFixed(1) + 's' : M.ability; }
  $('tsprint').classList.toggle('hide', ghost || st === 'results');
  $('stam').classList.toggle('hide', !(st === 'playing' && mp.role === 'survivor' && !ghost)); $('stam').firstChild.style.width = snap.me.stamina + '%'; $('stam').firstChild.style.background = mp.st.grey ? '#777' : snap.me.stamina < 25 ? '#c33' : '#3c3';
  $('hostbox').classList.toggle('hide', !(isHost && st === 'lobby'));
  const boarded = snap.boarded.length, humans = snap.ps.filter(p => !p.b), hb = humans.filter(p => snap.boarded.includes(p.id)).length;
  $('lobbyhint').classList.toggle('hide', st !== 'lobby');
  if (st === 'lobby') $('lobbyhint').innerHTML = `🚁 Walk onto the helicopter pad to board — ${boarded}/${snap.ps.length} boarded<br><small>${snap.ps.length < 2 ? 'Need at least 2 players. Invite friends with the code' + (isHost ? ' or add a bot' : '') : hb < humans.length ? 'Waiting for everyone to board…' : isHost ? 'Everyone is aboard — press Take off!' : 'Waiting for the host to take off…'}</small>`;
}
requestAnimationFrame(frame);
if (params.has('desktop') && $('dlwin')) $('dlwin').remove();
