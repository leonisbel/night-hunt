// On-screen controls for phones/tablets: floating joystick (move), aim pad (flashlight), sprint/ability buttons.
export function initTouch(o) {
  const $ = id => document.getElementById(id);
  const T = { active: false, mv: null, sprint: false, aim: null, aiming: false };
  const root = $('touch'), joy = $('joyzone'), base = $('joybase'), knob = $('joyknob'), pad = $('aimzone'), ring = $('aimring');
  const R = 56;
  let jid = null, j0 = null, aid = null, a0 = null;
  const enable = () => { if (!T.active) { T.active = true; document.body.classList.add('touchmode'); o.onEnable && o.onEnable(); } };
  if (matchMedia('(pointer:coarse)').matches || navigator.maxTouchPoints > 0) enable();
  addEventListener('touchstart', () => { enable(); o.unlock && o.unlock(); }, { passive: true });
  addEventListener('touchend', () => o.unlock && o.unlock(), { passive: true });
  // joystick (floating: appears where the thumb lands)
  joy.addEventListener('pointerdown', e => { if (jid !== null) return; jid = e.pointerId; joy.setPointerCapture(e.pointerId); j0 = { x: e.clientX, y: e.clientY }; base.style.left = e.clientX + 'px'; base.style.top = e.clientY + 'px'; base.classList.add('on'); moveKnob(0, 0); e.preventDefault(); });
  joy.addEventListener('pointermove', e => { if (e.pointerId !== jid) return; let dx = e.clientX - j0.x, dy = e.clientY - j0.y; const l = Math.hypot(dx, dy); if (l > R) { dx *= R / l; dy *= R / l; } moveKnob(dx, dy); T.mv = { x: dx / R, y: dy / R }; e.preventDefault(); });
  const jend = e => { if (e.pointerId !== jid) return; jid = null; T.mv = null; base.classList.remove('on'); moveKnob(0, 0); if (T.sprint) setSprint(false); };
  joy.addEventListener('pointerup', jend); joy.addEventListener('pointercancel', jend);
  function moveKnob(x, y) { knob.style.transform = `translate(${x}px,${y}px)`; }
  // aim pad: drag anywhere on the right half to point the flashlight; it keeps pointing there after release
  // look pad: drag anywhere on the right side to turn the camera (and your character); pinch with two fingers to zoom
  T.lookDx = 0; T.lookDy = 0; T.pinch = 0; const pts = new Map(); let pinchD = 0;
  const pd = () => { const [a, b] = [...pts.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  pad.addEventListener('pointerdown', e => { pad.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pts.size === 2) pinchD = pd();
    if (aid === null) { aid = e.pointerId; a0 = { x: e.clientX, y: e.clientY }; ring.style.left = e.clientX + 'px'; ring.style.top = e.clientY + 'px'; ring.classList.add('on'); T.aiming = true; } e.preventDefault(); });
  pad.addEventListener('pointermove', e => { const q = pts.get(e.pointerId); if (!q) return; const dx = e.clientX - q.x, dy = e.clientY - q.y; q.x = e.clientX; q.y = e.clientY;
    if (pts.size >= 2) { const d = pd(); T.pinch += d - pinchD; pinchD = d; }
    else if (e.pointerId === aid) { T.lookDx += dx; T.lookDy += dy; }
    e.preventDefault(); });
  const aend = e => { pts.delete(e.pointerId); if (e.pointerId !== aid) return; aid = pts.size ? [...pts.keys()][0] : null; if (aid === null) { T.aiming = false; ring.classList.remove('on', 'dir'); } };
  pad.addEventListener('pointerup', aend); pad.addEventListener('pointercancel', aend);
  // buttons
  const btn = (id, fn) => $(id).addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); $(id).classList.add('press'); fn(); setTimeout(() => $(id).classList.remove('press'), 140); });
  function setSprint(v) { T.sprint = v; $('tsprint').classList.toggle('lit', v); }
  btn('tsprint', () => setSprint(!T.sprint));
  btn('tability', () => o.onAbility && o.onAbility());
  btn('topen', () => o.onOpen && o.onOpen());
  { const a = $('tattack'); let pid = null;
    a.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if (pid !== null) return; pid = e.pointerId; try { a.setPointerCapture(pid); } catch { } a.classList.add('press'); o.onAttack && o.onAttack(true); });
    const up = e => { if (e.pointerId !== pid) return; pid = null; a.classList.remove('press'); o.onAttack && o.onAttack(false); };
    a.addEventListener('pointerup', up); a.addEventListener('pointercancel', up); }
  btn('tboard', () => o.onBoard && o.onBoard());
  btn('tmute', () => { const m = o.onMute && o.onMute(); $('tmute').textContent = m ? '🔇' : '🔊'; });
  const em = $('temote'); if (em) em.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); o.onEmote && o.onEmote(); });
  for (const [id, k] of [['tspeed', 'speed'], ['tgrav', 'grav'], ['tinvis', 'invis']]) { const n = $(id); if (n) n.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); n.classList.add('press'); o.onGear && o.onGear(k); setTimeout(() => n.classList.remove('press'), 140); }); }
  document.addEventListener('touchmove', e => { if (document.body.classList.contains('ingame') && !e.target.closest('#locker, .showcase, #emotewheel, #admin, .panel')) e.preventDefault(); }, { passive: false });
  if (window.visualViewport) visualViewport.addEventListener('resize', () => o.onResize && o.onResize());
  addEventListener('orientationchange', () => setTimeout(() => o.onResize && o.onResize(), 250));
  T.setSprint = setSprint; T.root = root;
  // block page gestures (pinch zoom / double-tap / scroll) during play
  for (const ev of ['gesturestart', 'gesturechange', 'dblclick']) document.addEventListener(ev, e => e.preventDefault());
  return T;
}
