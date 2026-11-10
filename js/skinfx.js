// Visual half of a monster skin: material finish plus a small particle aura. Low tier uses fewer sprites.
import * as THREE from '../vendor/three.module.min.js';
import { GFX } from './gfx.js';

const LOOK = {
  shadow: { color: '#07070c', emissive: '#3a1468', ei: 0.9, roughness: 0.35, opacity: 0.5, particle: '#1a1028', light: '#6a4ad8' },
  toxic: { color: '#39e05a', emissive: '#14ff3c', ei: 0.7, roughness: 0.42, particle: '#7dff4a', light: '#39ff4a' },
  frost: { color: '#d7f3ff', emissive: '#bfefff', ei: 0.35, roughness: 0.12, metal: 0.15, particle: '#eaf7ff', light: '#d7f4ff' },
  blood: { color: '#8a1018', emissive: '#ff2030', ei: 0.25, roughness: 0.45, particle: '#c01018', light: '#ff3030' },
  lava: { color: '#ff6a1a', emissive: '#ff4a00', ei: 0.8, roughness: 0.4, particle: '#ffb020', light: '#ff7a1a' },
  neon: { color: '#c14bff', emissive: '#ff3af0', ei: 0.85, roughness: 0.25, metal: 0.4, particle: '#e080ff', light: '#ff4af0' },
  ghost: { color: '#e7f6ff', emissive: '#c8ecff', ei: 0.45, roughness: 0.2, opacity: 0.4, particle: '#f4fbff', light: '#d0f0ff' },
  zombie: { color: '#6f8a48', emissive: '#b6e06a', ei: 0.3, roughness: 0.7, particle: '#9aaa60', light: '#a8c060' },
  abyss: { color: '#14203a', emissive: '#2a78ff', ei: 0.55, roughness: 0.25, metal: 0.35, particle: '#1a4a88', light: '#3a8aff' },
  golden: { color: '#f0c14a', emissive: '#ffe08a', ei: 0.4, roughness: 0.22, metal: 0.85, particle: '#ffe9a0', light: '#ffd76b' },
};

function count() { return GFX.tier === 'low' || GFX.tier === 'med' ? 8 : 20; }

export function bloodEnabled() {
  try { return localStorage.getItem('nhBlood') !== '0'; } catch (e) { return true; }
}

export function dressSkin(root, skin) {
  const L = LOOK[skin]; if (!L || !root) return;
  const seen = new Set();
  root.traverse(o => {
    if (!o.isMesh || !o.material) return;
    const list = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of list) {
      if (!m.color || seen.has(m) || m.userData.keep) continue;
      seen.add(m);
      const eye = (m.emissiveIntensity || 0) > 1.2;
      if (eye) { m.emissive && m.emissive.set(L.light); continue; }
      m.color.copy(new THREE.Color(L.color));
      if (m.emissive) { m.emissive.set(L.emissive); m.emissiveIntensity = L.ei; }
      if (L.roughness != null) m.roughness = L.roughness;
      if (L.metal != null) m.metalness = L.metal;
      if (L.opacity != null) { m.transparent = true; m.opacity = L.opacity; m.depthWrite = false; }
    }
  });
  if (root.userData.skinFx) return;
  const n = count();
  const pos = new Float32Array(n * 3);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const col = skin === 'blood' && !bloodEnabled() ? '#2a241c' : L.particle;
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: col, size: skin === 'golden' ? 0.08 : 0.14, transparent: true, opacity: 0.85, depthWrite: false }));
  pts.frustumCulled = false;
  root.add(pts);
  const phase = [];
  for (let i = 0; i < n; i++) phase.push(Math.random() * 6.28);
  root.userData.skinFx = { skin, pos, n, phase, pts };
}

export function tickSkinFx(root, t) {
  const fx = root && root.userData.skinFx; if (!fx) return;
  const rise = fx.skin === 'toxic' || fx.skin === 'lava' || fx.skin === 'ghost' || fx.skin === 'shadow';
  for (let i = 0; i < fx.n; i++) {
    const a = fx.phase[i] + t * (fx.skin === 'neon' ? 3 : 0.8);
    const rad = 0.35 + (i % 5) * 0.12 + Math.sin(t * 2 + i) * 0.05;
    const y = rise ? ((t * 0.4 + i * 0.17) % 1.8) : 0.4 + Math.sin(t * 1.5 + i) * 0.35 + (i % 4) * 0.25;
    fx.pos[i * 3] = Math.cos(a) * rad;
    fx.pos[i * 3 + 1] = y;
    fx.pos[i * 3 + 2] = Math.sin(a) * rad;
  }
  fx.pts.geometry.attributes.position.needsUpdate = true;
}
