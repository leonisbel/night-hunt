const $ = id => document.getElementById(id);
const cv = $('c'), cx = cv.getContext('2d'), fog = document.createElement('canvas'), fx = fog.getContext('2d');
let W, H; function resize() { W = cv.width = fog.width = innerWidth; H = cv.height = fog.height = innerHeight; } addEventListener('resize', resize); resize();

let me = null, room = null, map = null, snap = null, isHost = false, MON = {}, disp = {}, effects = [], jumpscare = null, flight = null, results = null, muted = false;
const keys = {}; let mouse = { x: W / 2, y: H / 2 }, cam = { x: 0, y: 0 };
const params = new URLSearchParams(location.search);

// ---------- menu ----------
$('pname').value = localStorage.nhName || '';
document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => {
  document.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('on', x === b));
  document.querySelectorAll('.tab').forEach(x => x.classList.add('hide')); $('tab-' + b.dataset.tab).classList.remove('hide');
  if (b.dataset.tab === 'browse') refreshList();
});
$('smax').oninput = () => $('maxv').textContent = $('smax').value;
function pname() { const n = $('pname').value.trim() || 'Player' + Math.floor(Math.random() * 900 + 100); localStorage.nhName = n; return n; }
$('bcreate').onclick = () => { $('merr').textContent = ''; NET.create({ player: pname(), name: $('sname').value, max: +$('smax').value, isPublic: document.querySelector('input[name=priv]:checked').value === 'public' }); };
$('bjoin').onclick = () => joinCode($('jcode').value);
function joinCode(code) { code = code.toUpperCase().trim(); if (!/^[A-Z0-9]{5}$/.test(code)) { $('merr').textContent = 'Codes are 5 letters/numbers.'; return; } $('merr').textContent = 'Connecting…'; NET.join(code, pname()); }
$('brefresh').onclick = refreshList;
async function refreshList() {
  $('slist').textContent = 'Loading…';
  try {
    const l = await NET.list();
    $('slist').innerHTML = l.length ? '' : '<p>No public servers right now. Create one!</p>';
    for (const s of l) { const d = document.createElement('div'); d.className = 'srv'; d.innerHTML = `<span><b></b><br><small>${s.players}/${s.max} players · ${s.state === 'lobby' ? 'in lobby' : 'round in progress'}</small></span>`; d.querySelector('b').textContent = s.name;
      const b = document.createElement('button'); b.textContent = s.players >= s.max ? 'Full' : 'Join'; b.disabled = s.players >= s.max; b.onclick = () => joinCode(s.code); d.appendChild(b); $('slist').appendChild(d); }
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
function showMenu(err) { room = null; snap = null; map = null; $('menu').classList.remove('hide'); $('hud').classList.add('hide'); $('overlay').classList.add('hide'); $('merr').textContent = err || ''; cv.style.filter = ''; }
$('bleave').onclick = () => { NET.leave(); showMenu(); };
$('binvite').onclick = () => { const u = location.origin + location.pathname + '?room=' + room; navigator.clipboard && navigator.clipboard.writeText(u); addEvent('Invite link copied: ' + u, 'good'); };
$('bstart').onclick = () => send({ t: 'start' });
$('baddbot').onclick = () => send({ t: 'addBot' });
$('bkick').onclick = () => send({ t: 'kickBot' });
$('hmax').onchange = () => send({ t: 'settings', max: +$('hmax').value });
$('hpub').onchange = () => send({ t: 'settings', isPublic: $('hpub').checked });

function onMsg(m) {
  switch (m.t) {
    case 'error': if (room) addEvent(m.msg, 'bad'); else { $('merr').textContent = m.msg; NET.leave(); } break;
    case 'joined': $('merr').textContent = ''; room = m.code; me = m.you; isHost = m.host; MON = m.monsters; $('menu').classList.add('hide'); $('hud').classList.remove('hide');
      $('hcode').textContent = `Server: ${m.name} · Code ${m.code} · ${m.isPublic ? '🌍 Public' : '🔒 Friends only'}`; $('hmax').value = m.max; $('hpub').checked = m.isPublic; history.replaceState(null, '', '?room=' + m.code); break;
    case 'host': isHost = true; addEvent('You are now the host', 'good'); break;
    case 'settings': $('hmax').value = m.max; $('hpub').checked = m.isPublic; $('hcode').textContent = $('hcode').textContent.replace(/🌍 Public|🔒 Friends only/, m.isPublic ? '🌍 Public' : '🔒 Friends only'); break;
    case 'map': map = m.map; disp = {}; results = null; $('overlay').classList.add('hide'); break;
    case 's': snap = m; break;
    case 'event': addEvent(m.msg, m.kind); break;
    case 'flight': { const mine = m.roles.find(r => r.id === me); flight = { until: performance.now() + m.secs * 1000, theme: m.theme, mine }; sfx('heli'); break; }
    case 'caught': jumpscare = { type: m.by, until: performance.now() + 1400 }; sfx('scare'); break;
    case 'fx': effects.push({ ...m, born: performance.now() }); break;
    case 'sfx': if (m.kind === 'sirenhead') sfx('siren'); else if (m.kind === 'heli') sfx('heli'); else sfx('blip'); break;
    case 'results': results = m; showResults(m); break;
  }
}
function addEvent(msg, kind) { const d = document.createElement('div'); d.className = kind || ''; d.textContent = msg; $('events').appendChild(d); setTimeout(() => d.remove(), 7000); while ($('events').children.length > 6) $('events').firstChild.remove(); }
function showResults(m) {
  const o = $('overlay'); o.classList.remove('hide');
  const title = m.winner === 'survivors' ? '<h2 style="color:#6f6">SURVIVORS WIN</h2>' : m.winner === 'monsters' ? '<h2 style="color:#f44">MONSTERS WIN</h2>' : '<h2>TIE</h2>';
  o.innerHTML = title + `<p>${m.why}</p><p>Escaped: ${m.saved} · Caught: ${m.caught}</p><div id="rtab"></div><p><small>Back to the helipad soon…</small></p>`;
  const tb = document.createElement('table'); tb.style.margin = 'auto';
  for (const p of m.players.sort((a, b) => b.score - a.score)) { const tr = tb.insertRow(); tr.insertCell().textContent = p.name; tr.insertCell().textContent = p.role === 'monster' ? '👹 ' + MON[p.mt].name : p.escaped ? '🚁 escaped' : p.alive ? 'alive' : '💀 caught'; tr.insertCell().textContent = p.score + ' pts'; tr.cells[0].style.color = p.color; }
  o.querySelector('#rtab').appendChild(tb);
}

// ---------- input ----------
const KM = { KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', ShiftLeft: 'sprint', ShiftRight: 'sprint' };
addEventListener('keydown', e => {
  if (document.activeElement.tagName === 'INPUT') return;
  if (KM[e.code]) { keys[KM[e.code]] = 1; e.preventDefault(); }
  if (e.code === 'Space' || e.code === 'KeyE') { send({ t: 'ability' }); e.preventDefault(); }
  if (e.code === 'Tab') { e.preventDefault(); showBoard(true); }
  if (e.code === 'KeyM') muted = !muted;
});
addEventListener('keyup', e => { if (KM[e.code]) keys[KM[e.code]] = 0; if (e.code === 'Tab') showBoard(false); });
addEventListener('blur', () => { for (const k in keys) keys[k] = 0; });
cv.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
cv.addEventListener('mousedown', () => { initAudio(); send({ t: 'ability' }); });
addEventListener('keydown', initAudio, { once: true });
setInterval(() => { if (!room) return; const p = myP(); const a = p ? Math.atan2(mouse.y - (p.dy - cam.y), mouse.x - (p.dx - cam.x)) : 0; send({ t: 'input', k: keys, a }); }, 50);
function showBoard(on) {
  const b = $('board'); b.classList.toggle('hide', !on || !snap); if (!on || !snap) return;
  b.innerHTML = `<b>Players ${snap.ps.length}/${snap.max}</b><table></table>`; const tb = b.querySelector('table');
  for (const p of snap.ps) { const tr = tb.insertRow(); tr.insertCell().textContent = (p.h ? '👑 ' : '') + p.n; tr.cells[0].style.color = p.c; tr.insertCell().textContent = p.sc + ' pts'; }
}
function myP() { return snap && snap.ps.find(p => p.id === me) && disp[me]; }

// ---------- audio ----------
let AC = null; function initAudio() { if (!AC) try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } }
function tone(f, d, type, vol, f2) { if (!AC || muted) return; const o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime; o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d); g.gain.setValueAtTime(vol || .2, t); g.gain.exponentialRampToValueAtTime(.001, t + d); o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d); }
function noise(d, vol) { if (!AC || muted) return; const b = AC.createBuffer(1, AC.sampleRate * d, AC.sampleRate), a = b.getChannelData(0); for (let i = 0; i < a.length; i++) a[i] = (Math.random() * 2 - 1) * (1 - i / a.length); const s = AC.createBufferSource(), g = AC.createGain(); g.gain.value = vol || .3; s.buffer = b; s.connect(g).connect(AC.destination); s.start(); }
function sfx(k) {
  if (k === 'scare') { noise(1, .5); tone(900, 1, 'sawtooth', .3, 120); tone(1300, .8, 'square', .15, 200); }
  else if (k === 'siren') { for (let i = 0; i < 3; i++) setTimeout(() => { tone(380, 1.1, 'sawtooth', .12, 720); tone(390, 1.1, 'square', .05, 700); }, i * 1100); }
  else if (k === 'heli') { for (let i = 0; i < 14; i++) setTimeout(() => tone(70, .08, 'square', .12, 40), i * 110); }
  else if (k === 'beat') { tone(60, .15, 'sine', .5, 40); setTimeout(() => tone(55, .15, 'sine', .4, 35), 180); }
  else tone(220, .3, 'triangle', .15, 90);
}
let lastBeat = 0;

// ---------- render ----------
const THEME = { 'Abandoned Pizzeria Town': { g: '#2b2a24', w: '#5a4a3a', t: '#1f3a1f' }, 'Foggy Woods': { g: '#1d2b1a', w: '#3c3226', t: '#16301a' }, 'Static Fields': { g: '#2e2e26', w: '#4a4a4a', t: '#263a20' }, 'Helipad Lobby': { g: '#2c3440', w: '#555', t: '#2a4a2a' } };
let lastT = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.1, (now - lastT) / 1000); lastT = now; const t = now / 1000;
  cx.setTransform(1, 0, 0, 1, 0, 0); cx.fillStyle = '#000'; cx.fillRect(0, 0, W, H);
  if (!room || !map || !snap) { drawMenuBg(t); return; }
  for (const p of snap.ps) { const d = disp[p.id] || (disp[p.id] = { dx: p.x, dy: p.y }); const k = Math.min(1, dt * 14); d.mv = Math.hypot(p.x - d.dx, p.y - d.dy) > 1.5; d.dx += (p.x - d.dx) * k; d.dy += (p.y - d.dy) * k; }
  const mp = snap.ps.find(p => p.id === me); const md = disp[me]; if (!mp || !md) return;
  const ghost = !mp.al || mp.es || mp.role === 'ghost';
  cam.x = md.dx - W / 2; cam.y = md.dy - H / 2;
  cv.style.filter = mp.st.grey ? 'grayscale(1) contrast(1.2)' : '';
  const th = THEME[map.theme] || THEME['Helipad Lobby'];
  cx.translate(-cam.x, -cam.y);
  // ground
  cx.fillStyle = th.g; cx.fillRect(0, 0, map.w, map.h);
  cx.fillStyle = 'rgba(255,255,255,.03)'; for (let x = 0; x < map.w; x += 80) for (let y = (x / 80 % 2) * 40; y < map.h; y += 80) cx.fillRect(x, y, 40, 40);
  if (map.heli) drawHelipad(map.heli, t, snap.state);
  for (const v of map.vents) { cx.fillStyle = '#333'; cx.fillRect(v.x - 22, v.y - 16, 44, 32); cx.strokeStyle = '#777'; cx.lineWidth = 2; for (let i = -12; i <= 12; i += 8) { cx.beginPath(); cx.moveTo(v.x - 18, v.y + i * .9); cx.lineTo(v.x + 18, v.y + i * .9); cx.stroke(); } }
  for (const w of map.walls) { cx.fillStyle = th.w; cx.fillRect(w.x, w.y, w.w, w.h); cx.fillStyle = 'rgba(0,0,0,.35)'; cx.fillRect(w.x, w.y + w.h - 6, w.w, 6); }
  if (snap.traps) for (const tr of snap.traps) { circ(cx, tr.x, tr.y, 12, '#ff7ab6', '#fff', 2); circ(cx, tr.x - 4, tr.y - 3, 2, '#fff'); circ(cx, tr.x + 4, tr.y - 3, 2, '#fff'); }
  if (snap.portal) { cx.save(); cx.translate(snap.portal.x, snap.portal.y); cx.rotate(t * 2); cx.shadowColor = '#f00'; cx.shadowBlur = 20; ell(cx, 0, 0, 34, 22, '#3a0010'); cx.strokeStyle = '#c0392b'; cx.lineWidth = 4; cx.stroke(); cx.restore(); }
  if (snap.ex) drawExtract(snap.ex, t);
  // entities sorted by y
  const ents = snap.ps.slice().sort((a, b) => disp[a.id].dy - disp[b.id].dy);
  for (const p of ents) {
    const d = disp[p.id], gh = !p.al || p.es || p.role === 'ghost';
    cx.save(); if (gh && snap.state === 'playing') cx.globalAlpha = .4;
    if (p.st.invis) cx.globalAlpha = .25;
    ell(cx, d.dx, d.dy + 18, 18, 7, 'rgba(0,0,0,.4)');
    if (p.role === 'monster' && snap.state !== 'lobby') { const sc = p.mt === 'sirenhead' ? 30 : 24; drawMonster(cx, p.mt, d.dx, d.dy - 6, sc, t + p.id); }
    else drawSurvivor(cx, d.dx, d.dy - 8, 16, p.c, t, d.mv, p.st.stun || p.st.root);
    if (p.st.stun) { cx.fillStyle = '#ff0'; cx.font = '16px sans-serif'; cx.fillText('★ ★', d.dx - 14, d.dy - 34); }
    if (p.st.root) { cx.fillStyle = '#ff7ab6'; cx.font = 'bold 12px sans-serif'; cx.fillText('STUCK!', d.dx - 20, d.dy - 34); }
    cx.restore();
  }
  // effects
  for (let i = effects.length - 1; i >= 0; i--) { const e = effects[i], a = (now - e.born) / 800; if (a > 1) { effects.splice(i, 1); continue; }
    cx.save(); cx.globalAlpha = 1 - a; cx.strokeStyle = e.c || '#fff'; cx.lineWidth = 6;
    if (e.kind === 'ring') { cx.beginPath(); cx.arc(e.x, e.y, e.r * a, 0, 7); cx.stroke(); }
    else if (e.kind === 'poof') { for (let k = 0; k < 10; k++) circ(cx, e.x + Math.cos(k) * a * 60, e.y + Math.sin(k * 2) * a * 60, 8 * (1 - a), e.c); }
    else if (e.kind === 'siren') { for (let k = 0; k < 3; k++) { cx.beginPath(); cx.arc(e.x, e.y, (a + k * .3) * 600, 0, 7); cx.stroke(); } }
    cx.restore(); }
  // bushes on top (hiding)
  for (const b of map.bushes) { if (b.inside) { cx.fillStyle = '#6b4f2a'; cx.fillRect(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2); cx.strokeStyle = '#3a2a10'; cx.lineWidth = 3; cx.strokeRect(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2); cx.beginPath(); cx.moveTo(b.x - b.r, b.y - b.r); cx.lineTo(b.x + b.r, b.y + b.r); cx.stroke(); }
    else { for (let k = 0; k < 5; k++) circ(cx, b.x + Math.cos(k * 1.3) * b.r * .45, b.y + Math.sin(k * 1.3) * b.r * .45, b.r * .62, k % 2 ? '#264d1e' : '#2f5c25'); } }
  for (const tr of map.trees) { circ(cx, tr.x + 6, tr.y + 8, tr.r, 'rgba(0,0,0,.35)'); circ(cx, tr.x, tr.y, tr.r, th.t); circ(cx, tr.x - tr.r * .3, tr.y - tr.r * .3, tr.r * .5, 'rgba(255,255,255,.05)'); }
  // name tags
  cx.font = 'bold 12px sans-serif'; cx.textAlign = 'center';
  for (const p of snap.ps) { if (p.st.invis && p.id !== me) continue; const d = disp[p.id]; const gh = !p.al || p.es; cx.fillStyle = gh && snap.state === 'playing' ? 'rgba(255,255,255,.4)' : p.c;
    const label = (p.h ? '👑 ' : '') + p.n + (p.role === 'monster' && snap.state === 'playing' && (ghost || mp.role === 'monster') ? ` (${MON[p.mt].name})` : '');
    cx.fillText(label, d.dx, d.dy - (p.role === 'monster' && snap.state !== 'lobby' ? (p.mt === 'sirenhead' ? 66 : 44) : 34)); }
  cx.textAlign = 'left';
  cx.setTransform(1, 0, 0, 1, 0, 0);
  // darkness
  if (snap.state === 'playing' || snap.state === 'flight') {
    fx.globalCompositeOperation = 'source-over'; fx.clearRect(0, 0, W, H);
    const dark = ghost ? .45 : map.theme === 'Foggy Woods' ? .97 : .94;
    fx.fillStyle = mp.role === 'monster' ? `rgba(25,0,0,${dark - .1})` : `rgba(0,0,8,${dark})`; fx.fillRect(0, 0, W, H);
    fx.globalCompositeOperation = 'destination-out';
    const sx = md.dx - cam.x, sy = md.dy - cam.y;
    const light = (r, inner) => { const g = fx.createRadialGradient(sx, sy, 0, sx, sy, r); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(inner, 'rgba(0,0,0,.9)'); g.addColorStop(1, 'rgba(0,0,0,0)'); fx.fillStyle = g; fx.beginPath(); fx.arc(sx, sy, r, 0, 7); fx.fill(); };
    if (ghost) light(900, .7);
    else if (mp.role === 'monster') light(500, .55);
    else {
      light(mp.st.blind ? 70 : 115, .4);
      if (!mp.st.blind) { const a = Math.atan2(mouse.y - sy, mouse.x - sx), L = 460, sp = .42; const g = fx.createRadialGradient(sx, sy, 20, sx, sy, L); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(.7, 'rgba(0,0,0,.85)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        fx.fillStyle = g; fx.beginPath(); fx.moveTo(sx, sy); fx.arc(sx, sy, L, a - sp, a + sp); fx.closePath(); fx.fill(); }
    }
    cx.drawImage(fog, 0, 0);
    // siren reveal markers for monsters
    if (mp.role === 'monster') for (const p of snap.ps) if (p.st.reveal && p.al && !p.es) { const d = disp[p.id]; cx.save(); cx.shadowColor = '#f00'; cx.shadowBlur = 15; circ(cx, d.dx - cam.x, d.dy - cam.y - 10, 10, '#f22'); cx.restore(); }
    if (snap.ex && !ghost && mp.role === 'survivor') arrowTo(snap.ex, md, '#6f6', 'EXTRACTION');
    if (mp.role === 'survivor' && !ghost && snap.md < 520 && now - lastBeat > (snap.md < 250 ? 450 : 900)) { lastBeat = now; sfx('beat'); }
    if (mp.role === 'survivor' && !ghost && snap.md < 300) { cx.fillStyle = `rgba(160,0,0,${(.25 * (1 - snap.md / 300)) * (0.6 + .4 * Math.sin(t * 8))})`; cx.fillRect(0, 0, W, H); }
  }
  if (snap.state === 'lobby' && map.heli) arrowTo(map.heli, md, '#ffd76b', 'HELICOPTER');
  if (jumpscare) { if (now > jumpscare.until) jumpscare = null; else { cx.fillStyle = Math.random() < .3 ? '#400' : '#000'; cx.fillRect(0, 0, W, H); const s = Math.min(W, H) * .32 * (1 + (1400 - (jumpscare.until - now)) / 3000); drawMonster(cx, jumpscare.type, W / 2 + (Math.random() - .5) * 20, H / 2 + s * .2 + (Math.random() - .5) * 20, s, t * 3); } }
  if (flight && now < flight.until) drawFlight(now, t); else flight = null;
  hud(mp, ghost);
}
function arrowTo(tg, md, col, label) {
  const sx = tg.x - cam.x, sy = tg.y - cam.y; if (sx > 40 && sy > 40 && sx < W - 40 && sy < H - 40) return;
  const a = Math.atan2(tg.y - md.dy, tg.x - md.dx), r = Math.min(W, H) / 2 - 60, x = W / 2 + Math.cos(a) * r, y = H / 2 + Math.sin(a) * r;
  cx.save(); cx.translate(x, y); cx.rotate(a); cx.fillStyle = col; cx.beginPath(); cx.moveTo(22, 0); cx.lineTo(-10, -14); cx.lineTo(-10, 14); cx.fill(); cx.restore();
  cx.fillStyle = col; cx.font = 'bold 12px sans-serif'; cx.textAlign = 'center'; cx.fillText(label + ' ' + Math.round(Math.hypot(tg.x - md.dx, tg.y - md.dy) / 10) + 'm', x, y + 30); cx.textAlign = 'left';
}
function drawHeli(x, y, s, t, col) {
  cx.save(); cx.translate(x, y);
  rect(cx, -s * .12, s * .3, s * 1.1, s * .14, col); rect(cx, s * .9, s * .1, s * .1, s * .5, col);
  ell(cx, 0, s * .2, s * .55, s * .38, col); ell(cx, -s * .2, s * .1, s * .25, s * .2, '#9fd3ff');
  rect(cx, -s * .5, s * .62, s * 1, s * .06, '#222'); rect(cx, -s * .35, s * .5, s * .05, s * .14, '#222'); rect(cx, s * .3, s * .5, s * .05, s * .14, '#222');
  cx.rotate(t * 25); cx.fillStyle = 'rgba(30,30,30,.55)'; cx.fillRect(-s * 1.1, -s * .04, s * 2.2, s * .08); cx.fillRect(-s * .04, -s * 1.1, s * .08, s * 2.2);
  cx.restore();
}
function drawHelipad(h, t, state) {
  circ(cx, h.x, h.y, h.r, '#3d4a57', '#ffd76b', 5); cx.fillStyle = '#ffd76b'; cx.font = 'bold 90px Impact,sans-serif'; cx.textAlign = 'center'; cx.globalAlpha = .35; cx.fillText('H', h.x, h.y + 32); cx.globalAlpha = 1;
  drawHeli(h.x, h.y - 30, 80, t, '#2d5a3a');
  cx.fillStyle = '#fff'; cx.font = 'bold 18px sans-serif'; cx.fillText('Stand here to BOARD', h.x, h.y + h.r + 26); cx.textAlign = 'left';
}
function drawExtract(e, t) { circ(cx, e.x, e.y, e.r, 'rgba(60,255,90,.15)', '#3f6', 4); drawHeli(e.x, e.y - 20, 60, t, '#3a6a2a'); cx.fillStyle = '#6f6'; cx.font = 'bold 16px sans-serif'; cx.textAlign = 'center'; cx.fillText('ESCAPE!', e.x, e.y + e.r + 20); cx.textAlign = 'left'; }
function drawFlight(now, t) {
  cx.fillStyle = '#05070c'; cx.fillRect(0, 0, W, H);
  for (let i = 0; i < 60; i++) { const x = (i * 137 - now * .4 * (1 + i % 3)) % W; rect(cx, (x + W) % W, (i * 71) % (H * .6), 2, 2, '#557'); }
  for (let i = 0; i < 12; i++) { const x = ((i * 220 - now * .6) % (W + 300) + W + 300) % (W + 300) - 150; cx.fillStyle = '#0a1a0a'; cx.beginPath(); cx.moveTo(x, H); cx.lineTo(x + 80, H * .7); cx.lineTo(x + 160, H); cx.fill(); }
  drawHeli(W / 2, H * .38 + Math.sin(t * 2) * 8, 120, t, '#2d5a3a');
  const f = flight, M = f.mine && f.mine.role === 'monster' ? MON[f.mine.mt] : null;
  cx.textAlign = 'center'; cx.fillStyle = '#fff'; cx.font = 'bold 22px sans-serif'; cx.fillText('Flying to ' + f.theme + '…  ' + Math.ceil((f.until - now) / 1000), W / 2, H * .62);
  cx.font = 'bold 40px Impact,sans-serif'; cx.fillStyle = M ? '#f33' : '#6cf';
  cx.fillText(M ? 'YOU ARE THE MONSTER: ' + M.name.toUpperCase() : 'YOU ARE A SURVIVOR', W / 2, H * .72);
  cx.font = '18px sans-serif'; cx.fillStyle = '#ddd'; cx.fillText(M ? `Ability (Space/Click): ${M.ability} — ${M.desc}. Catch the survivors!` : 'Hide in bushes and crates, sprint with Shift, survive until sunrise or reach the extraction helicopter!', W / 2, H * .78);
  if (M) drawMonster(cx, f.mine.mt, W / 2, H * .9, 40, t);
  cx.textAlign = 'left';
}
function hud(mp, ghost) {
  const st = snap.state; const M = mp.role === 'monster' ? MON[mp.mt] : null;
  $('hcount').textContent = `👥 ${snap.ps.length}/${snap.max}`;
  $('timer').textContent = st === 'playing' ? `${Math.floor(snap.tl / 60)}:${String(snap.tl % 60).padStart(2, '0')}` : st === 'lobby' ? 'HELIPAD' : '';
  const alive = snap.ps.filter(p => p.role === 'survivor' && p.al && !p.es).length;
  $('rolebox').innerHTML = st !== 'playing' ? '' : ghost ? (mp.es ? '🚁 You escaped! Spectating…' : '💀 You were caught. Spectating as a ghost…') + `<br>Survivors left: ${alive}` : M ? `👹 You are <b style="color:#f44">${M.name}</b> — catch everyone! Survivors left: ${alive}` : `🔦 Survivor — hide &amp; survive! Survivors left: ${alive}`;
  $('ability').classList.toggle('hide', !(M && st === 'playing'));
  if (M) $('ability').innerHTML = `<b>${M.ability}</b> <small>(Space / Click)</small><br><small>${M.desc}</small><br>${snap.me.cd > 0 ? `⏳ ${snap.me.cd.toFixed(1)}s` : '<b style="color:#6f6">READY</b>'}`;
  $('stam').classList.toggle('hide', !(st === 'playing' && mp.role === 'survivor' && !ghost)); $('stam').firstChild.style.width = snap.me.stamina + '%'; $('stam').firstChild.style.background = mp.st.grey ? '#777' : '#3c3';
  $('hostbox').classList.toggle('hide', !(isHost && st === 'lobby'));
  const boarded = snap.boarded.length, humans = snap.ps.filter(p => !p.b), hb = humans.filter(p => snap.boarded.includes(p.id)).length;
  $('lobbyhint').classList.toggle('hide', st !== 'lobby');
  if (st === 'lobby') $('lobbyhint').innerHTML = `🚁 Walk onto the helicopter pad to board — ${boarded}/${snap.ps.length} boarded<br><small>${snap.ps.length < 2 ? 'Need at least 2 players. Invite friends with the code' + (isHost ? ' or add a bot' : '') : hb < humans.length ? 'Waiting for everyone to board…' : isHost ? 'Everyone is aboard — press Take off!' : 'Waiting for the host to take off…'}</small>`;
}
function drawMenuBg(t) {
  cx.fillStyle = '#050307'; cx.fillRect(0, 0, W, H);
  const list = Object.keys(D); list.forEach((k, i) => { const x = (i + .5) * W / list.length, y = H * .9 + Math.sin(t + i) * 8; cx.globalAlpha = .55; drawMonster(cx, k, x, y, Math.min(34, W / list.length / 2.5), t + i); }); cx.globalAlpha = 1;
}
requestAnimationFrame(frame);
if (params.has('desktop') && $('dlwin')) $('dlwin').remove();
