// Procedural canvas textures (no external assets)
import * as THREE from '../vendor/three.module.min.js';

let seed = 1337;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const cache = {};

function canvas(size) { const c = document.createElement('canvas'); c.width = c.height = size; return [c, c.getContext('2d')]; }
function speckle(g, size, n, colors, rmin, rmax, alpha) {
  for (let i = 0; i < n; i++) {
    g.globalAlpha = alpha * (0.4 + rnd() * 0.6);
    g.fillStyle = colors[(rnd() * colors.length) | 0];
    const r = rmin + rnd() * (rmax - rmin), x = rnd() * size, y = rnd() * size;
    g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    // wrap so the texture tiles
    if (x < r) { g.beginPath(); g.arc(x + size, y, r, 0, 7); g.fill(); }
    if (y < r) { g.beginPath(); g.arc(x, y + size, r, 0, 7); g.fill(); }
  }
  g.globalAlpha = 1;
}
function finish(c, repeat, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (repeat) t.repeat.set(repeat, repeat);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}
function grey(c) { // luminance copy, used as a bump map
  const [b, g] = canvas(c.width); g.drawImage(c, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.width), a = d.data;
  for (let i = 0; i < a.length; i += 4) { const l = a[i] * .3 + a[i + 1] * .59 + a[i + 2] * .11; a[i] = a[i + 1] = a[i + 2] = l; }
  g.putImageData(d, 0, 0); return b;
}

const MAKERS = {
  grass(size = 512) {
    const [c, g] = canvas(size); g.fillStyle = '#2b3a1f'; g.fillRect(0, 0, size, size);
    speckle(g, size, 900, ['#33461f', '#24331a', '#3d4f24', '#2a2a18', '#1b2614'], 6, 22, .35);
    g.lineCap = 'round';
    for (let i = 0; i < 9000; i++) { const x = rnd() * size, y = rnd() * size, l = 3 + rnd() * 7; g.strokeStyle = ['#4a6a2a', '#2f4a1c', '#5b6b30', '#3a3a20', '#22361a'][(rnd() * 5) | 0]; g.globalAlpha = .5 + rnd() * .5; g.lineWidth = 1 + rnd(); g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd() - .5) * 3, y - l); g.stroke(); }
    g.globalAlpha = 1; return c;
  },
  drygrass(size = 512) {
    const [c, g] = canvas(size); g.fillStyle = '#4a4630'; g.fillRect(0, 0, size, size);
    speckle(g, size, 700, ['#5a5434', '#3c3926', '#6b6440', '#48402a'], 6, 26, .4);
    for (let i = 0; i < 8000; i++) { const x = rnd() * size, y = rnd() * size, l = 3 + rnd() * 8; g.strokeStyle = ['#7a7048', '#5c5636', '#8c8058', '#3f3a26'][(rnd() * 4) | 0]; g.globalAlpha = .5 + rnd() * .5; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd() - .5) * 4, y - l); g.stroke(); }
    g.globalAlpha = 1; return c;
  },
  asphalt(size = 512) {
    const [c, g] = canvas(size); g.fillStyle = '#2a2a2c'; g.fillRect(0, 0, size, size);
    speckle(g, size, 14000, ['#3a3a3c', '#1c1c1e', '#444446', '#232325'], .5, 1.8, .8);
    speckle(g, size, 60, ['#1a1a1b', '#353530'], 20, 60, .25);
    g.strokeStyle = '#141414'; g.lineWidth = 1.5;
    for (let i = 0; i < 7; i++) { let x = rnd() * size, y = rnd() * size; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 8; k++) { x += (rnd() - .5) * 50; y += (rnd() - .5) * 50; g.lineTo(x, y); } g.stroke(); }
    return c;
  },
  concrete(size = 512) {
    const [c, g] = canvas(size); g.fillStyle = '#5d5e60'; g.fillRect(0, 0, size, size);
    speckle(g, size, 9000, ['#6a6b6d', '#4e4f51', '#737476', '#56575a'], .6, 2, .6);
    speckle(g, size, 90, ['#4a4b4d', '#6e6a62', '#3f4042'], 14, 50, .18);
    g.strokeStyle = '#3a3a3c'; g.lineWidth = 2; g.strokeRect(0, 0, size, size); g.beginPath(); g.moveTo(size / 2, 0); g.lineTo(size / 2, size); g.moveTo(0, size / 2); g.lineTo(size, size / 2); g.stroke();
    return c;
  },
  dirt(size = 512) {
    const [c, g] = canvas(size); g.fillStyle = '#3a2e22'; g.fillRect(0, 0, size, size);
    speckle(g, size, 6000, ['#4a3a2a', '#2e241a', '#55432f', '#3f3428'], .8, 3, .6);
    speckle(g, size, 200, ['#2a3a1c', '#4b3b2b', '#1e1810'], 6, 24, .3);
    return c;
  },
  brick(size = 512) {
    const [c, g] = canvas(size); g.fillStyle = '#3b3430'; g.fillRect(0, 0, size, size);
    const rows = 16, bh = size / rows, bw = size / 8;
    for (let r = 0; r < rows; r++) for (let k = -1; k < 9; k++) {
      const x = k * bw + (r % 2 ? bw / 2 : 0), y = r * bh, v = rnd();
      g.fillStyle = `rgb(${92 + v * 40 | 0},${48 + v * 20 | 0},${38 + v * 14 | 0})`;
      g.fillRect(x + 2, y + 2, bw - 4, bh - 4);
    }
    speckle(g, size, 5000, ['#000', '#fff', '#5a2a1a'], .5, 1.6, .08);
    speckle(g, size, 40, ['#1a1a1a', '#2a3a20'], 20, 70, .22); // grime & moss
    return c;
  },
  wood(size = 512) {
    const [c, g] = canvas(size); const n = 6, w = size / n;
    for (let i = 0; i < n; i++) {
      const v = rnd(); g.fillStyle = `rgb(${70 + v * 30 | 0},${50 + v * 20 | 0},${34 + v * 12 | 0})`; g.fillRect(i * w, 0, w, size);
      for (let k = 0; k < 40; k++) { g.strokeStyle = rnd() < .5 ? 'rgba(30,18,10,.35)' : 'rgba(140,100,60,.15)'; g.lineWidth = 1 + rnd() * 2; const x = i * w + rnd() * w; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + (rnd() - .5) * 10, size / 3, x + (rnd() - .5) * 10, size * 2 / 3, x, size); g.stroke(); }
      g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(i * w, 0, 3, size);
    }
    return c;
  },
  bark(size = 256) {
    const [c, g] = canvas(size); g.fillStyle = '#2e241c'; g.fillRect(0, 0, size, size);
    for (let i = 0; i < 260; i++) { g.strokeStyle = ['#1c150f', '#3d3026', '#463a2e', '#241c15'][(rnd() * 4) | 0]; g.lineWidth = 2 + rnd() * 5; const x = rnd() * size; g.beginPath(); g.moveTo(x, -10); g.lineTo(x + (rnd() - .5) * 14, size + 10); g.stroke(); }
    return c;
  },
  fur(size = 256) { // neutral, multiplied by the material colour
    const [c, g] = canvas(size); g.fillStyle = '#c8c8c8'; g.fillRect(0, 0, size, size);
    for (let i = 0; i < 12000; i++) { const v = 150 + rnd() * 105 | 0; g.strokeStyle = `rgb(${v},${v},${v})`; g.globalAlpha = .5; g.lineWidth = 1; const x = rnd() * size, y = rnd() * size; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd() - .5) * 4, y + 3 + rnd() * 4); g.stroke(); }
    g.globalAlpha = 1; speckle(g, size, 30, ['#777', '#999'], 8, 26, .25); // wear stains
    return c;
  },
  skin(size = 256) {
    const [c, g] = canvas(size); g.fillStyle = '#bbbbbb'; g.fillRect(0, 0, size, size);
    speckle(g, size, 3000, ['#9a9a9a', '#d0d0d0', '#a8a8a8'], .8, 3.5, .5);
    speckle(g, size, 50, ['#7a7a7a', '#cfcfcf'], 10, 30, .2);
    g.strokeStyle = 'rgba(90,90,90,.5)'; for (let i = 0; i < 40; i++) { g.lineWidth = .8; const x = rnd() * size, y = rnd() * size; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 10, y + rnd() * 10, x + 20 * rnd(), y + 18); g.stroke(); }
    return c;
  },
  metal(size = 256) {
    const [c, g] = canvas(size); g.fillStyle = '#8a8c90'; g.fillRect(0, 0, size, size);
    for (let i = 0; i < 600; i++) { g.strokeStyle = rnd() < .5 ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.1)'; const y = rnd() * size; g.beginPath(); g.moveTo(0, y); g.lineTo(size, y + (rnd() - .5) * 3); g.stroke(); }
    speckle(g, size, 40, ['#6a4a2a', '#5a3a20'], 4, 18, .35); // rust
    return c;
  },
  cloth(size = 256) {
    const [c, g] = canvas(size); g.fillStyle = '#cccccc'; g.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y += 2) { g.fillStyle = y % 4 ? 'rgba(0,0,0,.05)' : 'rgba(255,255,255,.05)'; g.fillRect(0, y, size, 1); }
    for (let x = 0; x < size; x += 2) { g.fillStyle = 'rgba(0,0,0,.04)'; g.fillRect(x, 0, 1, size); }
    speckle(g, size, 25, ['#888', '#aaa'], 8, 30, .2);
    return c;
  },
  leaves(size = 256) {
    const [c, g] = canvas(size); g.fillStyle = '#1d3317'; g.fillRect(0, 0, size, size);
    for (let i = 0; i < 1600; i++) { g.fillStyle = ['#2b4a1f', '#18301a', '#355a26', '#223a18', '#3b4a20'][(rnd() * 5) | 0]; g.globalAlpha = .8; const x = rnd() * size, y = rnd() * size; g.beginPath(); g.ellipse(x, y, 2 + rnd() * 4, 1 + rnd() * 2, rnd() * 3, 0, 7); g.fill(); }
    g.globalAlpha = 1; return c;
  },
  vent(size = 128) {
    const [c, g] = canvas(size); g.fillStyle = '#555a5e'; g.fillRect(0, 0, size, size);
    for (let y = 10; y < size - 6; y += 12) { g.fillStyle = '#111'; g.fillRect(8, y, size - 16, 6); g.fillStyle = '#7a8086'; g.fillRect(8, y + 6, size - 16, 2); }
    g.strokeStyle = '#2a2a2a'; g.lineWidth = 4; g.strokeRect(2, 2, size - 4, size - 4);
    return c;
  },
  crate(size = 256) {
    const [c, g] = canvas(size); g.drawImage(MAKERS.wood(size), 0, 0);
    g.strokeStyle = '#3a2614'; g.lineWidth = 26; g.strokeRect(13, 13, size - 26, size - 26);
    g.beginPath(); g.moveTo(20, 20); g.lineTo(size - 20, size - 20); g.stroke();
    g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 3; g.strokeRect(26, 26, size - 52, size - 52);
    return c;
  },
  helipad(size = 512) {
    const [c, g] = canvas(size); g.drawImage(MAKERS.concrete(size), 0, 0);
    g.strokeStyle = '#e8c040'; g.lineWidth = 18; g.beginPath(); g.arc(size / 2, size / 2, size / 2 - 20, 0, 7); g.stroke();
    g.fillStyle = '#eee'; g.font = `bold ${size * .5}px Impact, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('H', size / 2, size / 2 + 8);
    speckle(g, size, 400, ['#222', '#444'], 1, 6, .2);
    return c;
  },
};

export function tex(name, repeat = 1, { bump = false } = {}) {
  const key = name + ':' + repeat + ':' + bump;
  if (cache[key]) return cache[key];
  seed = [...name].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7) % 2147483647 || 7;
  const base = cache['c:' + name] || (cache['c:' + name] = MAKERS[name]());
  return (cache[key] = bump ? finish(grey(base), repeat, false) : finish(base, repeat));
}

// A canvas texture with a face for survivors
export function faceTex(scared) {
  const key = 'face' + (scared ? 1 : 0); if (cache[key]) return cache[key];
  const [c, g] = canvas(128); g.fillStyle = '#f2c94c'; g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#111'; g.fillRect(36, 42, 12, 18); g.fillRect(80, 42, 12, 18);
  g.lineWidth = 6; g.strokeStyle = '#111'; g.beginPath();
  if (scared) g.arc(64, 88, 10, 0, 7); else g.arc(64, 72, 22, .4, Math.PI - .4);
  g.stroke(); return (cache[key] = finish(c, 1));
}
export function glowTex(color = '#fff') {
  const key = 'glow' + color; if (cache[key]) return cache[key];
  const [c, g] = canvas(128); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, color); gr.addColorStop(.25, color); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.globalAlpha = 1; g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return (cache[key] = t);
}
export function softTex() {
  if (cache.soft) return cache.soft;
  const [c, g] = canvas(128); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.5, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return (cache.soft = new THREE.CanvasTexture(c));
}
export function beamTex() { // vertical gradient for light cones
  if (cache.beam) return cache.beam;
  const [c, g] = canvas(64); const gr = g.createLinearGradient(0, 0, 0, 64);
  gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.7, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,1)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return (cache.beam = new THREE.CanvasTexture(c));
}
export function textSprite(text, color = '#fff', size = 34) {
  const [c, g] = canvas(512); c.height = 96;
  g.font = `bold ${size}px Trebuchet MS, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 6; g.strokeStyle = 'rgba(0,0,0,.85)'; g.strokeText(text, 256, 48); g.fillStyle = color; g.fillText(text, 256, 48);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
  s.scale.set(4, .75, 1); s.renderOrder = 10; return s;
}
