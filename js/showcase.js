// Off-screen-style overlay viewer: drag to orbit, wheel or pinch to zoom. Closing drops the renderer,
// cloned materials, and any geometry that is not in the shared model cache.
import * as THREE from '../vendor/three.module.min.js';
import { applyEmote } from './emotes.js';

let live = null;
let opened = 0;
let disposed = 0;

function ownMaterials(root) {
  root.traverse(o => {
    if (!o.material) return;
    const wrap = m => { if (m && m.userData && m.userData.previewClone) return m; const c = m.clone(); c.userData.previewClone = 1; return c; };
    o.material = Array.isArray(o.material) ? o.material.map(wrap) : wrap(o.material);
  });
}

function release(root) {
  if (!root) return;
  const geos = new Set(), mats = new Set();
  root.traverse(o => {
    if (o.geometry && !o.geometry.userData.shared) geos.add(o.geometry);
    if (o.material) for (const m of [].concat(o.material)) if (m && m.userData && m.userData.previewClone) mats.add(m);
  });
  for (const m of mats) m.dispose();
  for (const g of geos) g.dispose();
  disposed += 1;
}

export function showcaseStats() { return { opened, disposed, open: !!live }; }

export function closeShowcase() {
  if (!live) return;
  cancelAnimationFrame(live.raf);
  release(live.root);
  live.renderer.dispose();
  try { live.renderer.forceContextLoss(); } catch { /* already lost */ }
  live.el.remove();
  document.body.classList.remove('showcaseon');
  live = null;
}

export function openShowcase(opts) {
  closeShowcase();
  opened += 1;
  const el = document.createElement('div');
  el.className = 'showcase';
  el.innerHTML = `<div class="sc-stage"><canvas></canvas><div class="sc-hint">Drag to turn · scroll or pinch to zoom</div></div>
    <div class="sc-panel"><button type="button" class="sc-x" aria-label="Close">✕</button>
    <h2></h2><p class="sc-blurb"></p><p class="sc-meta"></p><div class="sc-actions"></div></div>`;
  document.body.classList.add('showcaseon');
  document.body.appendChild(el);
  el.querySelector('h2').textContent = opts.title || 'Item';
  el.querySelector('.sc-blurb').textContent = opts.blurb || '';
  const meta = el.querySelector('.sc-meta');
  const price = opts.price > 0 ? `🪙 ${opts.price}` : (opts.price === 0 ? 'Free' : '');
  meta.textContent = [price, opts.meta].filter(Boolean).join(' · ');
  const actions = el.querySelector('.sc-actions');
  const addBtn = (label, cls, fn, disabled) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = cls; b.textContent = label; b.disabled = !!disabled;
    b.addEventListener('click', e => { e.stopPropagation(); fn(); });
    actions.appendChild(b); return b;
  };
  if (opts.onBuy) addBtn(opts.buyLabel || (opts.price > 0 ? `Buy · 🪙 ${opts.price}` : 'Get'), 'sc-buy', () => opts.onBuy(), opts.buyDisabled);
  if (opts.onEquip) addBtn(opts.equipLabel || 'Equip', 'sc-eq', () => opts.onEquip(), opts.equipDisabled);
  if (opts.onPlay) addBtn(opts.playLabel || 'Play', 'sc-play', () => opts.onPlay());
  el.querySelector('.sc-x').onclick = () => closeShowcase();
  el.addEventListener('pointerdown', e => { if (e.target === el) closeShowcase(); });

  const canvas = el.querySelector('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#d7e4ff', '#2a2420', 1.4));
  const key = new THREE.DirectionalLight('#fff4e0', 2.2); key.position.set(3, 6, 4); scene.add(key);
  const fill = new THREE.DirectionalLight('#88aaff', 0.6); fill.position.set(-4, 2, -2); scene.add(fill);
  const root = new THREE.Group();
  let model = null;
  try { model = opts.build ? opts.build() : new THREE.Group(); } catch (e) { console.warn('showcase', e); model = new THREE.Group(); }
  if (model) { ownMaterials(model); root.add(model); }
  scene.add(root);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  root.position.sub(center);
  const radius = Math.max(0.6, size.length() * 0.55);
  const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 80);
  let yaw = 0.6, pitch = 0.25, dist = radius * 2.4;
  const fit = () => {
    const w = canvas.clientWidth || 320, h = canvas.clientHeight || 320;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
  };
  fit();
  const ro = new ResizeObserver(fit); ro.observe(canvas.parentElement);

  const stage = el.querySelector('.sc-stage');
  let drag = null, pinch = null;
  stage.addEventListener('pointerdown', e => {
    if (e.target.closest('button')) return;
    stage.setPointerCapture(e.pointerId);
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
  });
  stage.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    yaw += (e.clientX - drag.x) * 0.01;
    pitch = Math.max(-0.4, Math.min(1.1, pitch + (e.clientY - drag.y) * 0.008));
    drag.x = e.clientX; drag.y = e.clientY;
  });
  const end = e => { if (drag && e.pointerId === drag.id) drag = null; };
  stage.addEventListener('pointerup', end);
  stage.addEventListener('pointercancel', end);
  stage.addEventListener('wheel', e => { e.preventDefault(); dist = Math.max(radius * 0.8, Math.min(radius * 6, dist * (e.deltaY > 0 ? 1.08 : 0.92))); }, { passive: false });
  stage.addEventListener('touchstart', e => { if (e.touches.length === 2) pinch = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); }, { passive: true });
  stage.addEventListener('touchmove', e => {
    if (e.touches.length === 2 && pinch) {
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      dist = Math.max(radius * 0.8, Math.min(radius * 6, dist * (pinch / d)));
      pinch = d;
    }
  }, { passive: true });
  stage.addEventListener('touchend', () => { pinch = null; });

  const clock = new THREE.Clock();
  let acc = 0;
  const loop = () => {
    if (!live) return;
    live.raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, clock.getDelta());
    acc += dt;
    if (opts.animate && model) opts.animate(model, acc, dt);
    else if (opts.emote && model) {
      const parts = model.userData.parts;
      if (parts) applyEmote(parts, opts.emote, acc);
    } else root.rotation.y = acc * 0.35;
    const cp = Math.cos(pitch);
    camera.position.set(Math.sin(yaw) * cp * dist, Math.sin(pitch) * dist + radius * 0.15, Math.cos(yaw) * cp * dist);
    camera.lookAt(0, radius * 0.05, 0);
    renderer.render(scene, camera);
    if (opts.ready && acc > 0.15 && !live.signaled) { live.signaled = true; opts.ready(); }
  };
  live = { el, renderer, root, raf: 0, ro, signaled: false };
  loop();
  const onKey = e => { if (e.code === 'Escape') { closeShowcase(); document.removeEventListener('keydown', onKey); } };
  document.addEventListener('keydown', onKey);
  return { close: closeShowcase };
}

export { applyEmote };
