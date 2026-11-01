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
  pad.addEventListener('pointerdown', e => { if (aid !== null) return; aid = e.pointerId; pad.setPointerCapture(e.pointerId); a0 = { x: e.clientX, y: e.clientY }; ring.style.left = e.clientX + 'px'; ring.style.top = e.clientY + 'px'; ring.classList.add('on'); T.aiming = true; e.preventDefault(); });
  pad.addEventListener('pointermove', e => { if (e.pointerId !== aid) return; const dx = e.clientX - a0.x, dy = e.clientY - a0.y; if (Math.hypot(dx, dy) > 10) { T.aim = Math.atan2(dy, dx); ring.style.setProperty('--a', T.aim + 'rad'); ring.classList.add('dir'); } e.preventDefault(); });
  const aend = e => { if (e.pointerId !== aid) return; aid = null; T.aiming = false; ring.classList.remove('on', 'dir'); };
  pad.addEventListener('pointerup', aend); pad.addEventListener('pointercancel', aend);
  // buttons
  const btn = (id, fn) => $(id).addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); $(id).classList.add('press'); fn(); setTimeout(() => $(id).classList.remove('press'), 140); });
  function setSprint(v) { T.sprint = v; $('tsprint').classList.toggle('lit', v); }
  btn('tsprint', () => setSprint(!T.sprint));
  btn('tability', () => o.onAbility && o.onAbility());
  btn('tboard', () => o.onBoard && o.onBoard());
  btn('tmute', () => { const m = o.onMute && o.onMute(); $('tmute').textContent = m ? '🔇' : '🔊'; });
  T.setSprint = setSprint; T.root = root;
  // block page gestures (pinch zoom / double-tap / scroll) during play
  for (const ev of ['gesturestart', 'gesturechange', 'dblclick']) document.addEventListener(ev, e => e.preventDefault());
  return T;
}
