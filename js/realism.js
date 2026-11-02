// v1.5.0 realism layer for monsters: PBR surfaces (normal / roughness / detail maps), subsurface-style skin,
// wet clearcoat for sea creatures, glossy eyes, countershading, shell fur and distance LOD.
// Photo-scanned surfaces are CC0 Poly Haven textures (models/tex); the rest are generated here at load.
import * as THREE from '../vendor/three.module.min.js';

const DOC = typeof document !== 'undefined';
let LOW = false, ENV = null; const PENDING = new Set();
const qs = DOC ? new URLSearchParams(location.search) : new URLSearchParams();
if (DOC) LOW = qs.get('gfx') === 'low' || (qs.get('gfx') !== 'high' && (matchMedia('(pointer:coarse)').matches || navigator.maxTouchPoints > 0));
export const isLow = () => LOW;
// called once by the renderer: phone flag + a soft moonlit environment for reflections (eyes, wet skin, rust)
export function realSetup(renderer, mobile) {
  if (mobile != null) LOW = qs.get('gfx') === 'high' ? false : qs.get('gfx') === 'low' ? true : !!mobile;
  if (ENV || !renderer) return ENV;
  const s = new THREE.Scene(), sky = new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false,
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'varying vec3 vP; void main(){ float h = normalize(vP).y; vec3 c = mix(vec3(.05,.045,.04), vec3(.16,.2,.3), smoothstep(-.2,.7,h)); c += vec3(.5,.55,.6) * smoothstep(.5,1.,h) * .4; gl_FragColor = vec4(c,1.); }' }));
  s.add(sky);
  const panel = (c, i, p, w, h) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(i), side: THREE.DoubleSide })); m.position.set(...p); m.lookAt(0, 0, 0); s.add(m); };
  panel('#dfe8ff', 3.5, [18, 30, 20], 10, 10); panel('#ffd8a8', 1.2, [-30, 8, -20], 22, 6); panel('#a8c0ff', .9, [-10, 20, 35], 18, 8);
  const pm = new THREE.PMREMGenerator(renderer); ENV = pm.fromScene(s, .02).texture; pm.dispose();
  for (const m of PENDING) { m.envMap = ENV; m.needsUpdate = true; } PENDING.clear();
  return ENV;
}

// ---------- seeded procedural height maps (tileable) ----------
let seed = 99; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
function cv(n) { const c = document.createElement('canvas'); c.width = c.height = n; return [c, c.getContext('2d')]; }
function wrap(n, x, y, r, fn) { for (const dx of [-n, 0, n]) for (const dy of [-n, 0, n]) if (x + dx > -r && x + dx < n + r && y + dy > -r && y + dy < n + r) fn(x + dx, y + dy); }
function dome(g, n, x, y, r, hi, lo, sy = 1, rot = 0) {
  wrap(n, x, y, r * Math.max(1, sy), (X, Y) => { g.save(); g.translate(X, Y); g.rotate(rot); g.scale(1, sy); const gr = g.createRadialGradient(-r * .2, -r * .25, 0, 0, 0, r);
    gr.addColorStop(0, `rgb(${hi},${hi},${hi})`); gr.addColorStop(.7, `rgb(${(hi + lo) / 2 | 0},${(hi + lo) / 2 | 0},${(hi + lo) / 2 | 0})`); gr.addColorStop(1, `rgba(${lo},${lo},${lo},0)`);
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill(); g.restore(); });
}
function strokes(g, n, count, len, w, col, alpha, vert = null, curl = .5) {
  g.lineCap = 'round';
  for (let i = 0; i < count; i++) { let x = rnd() * n, y = rnd() * n, a = vert ?? rnd() * 6.283; g.strokeStyle = col; g.globalAlpha = alpha * (.4 + rnd() * .6); g.lineWidth = w * (.5 + rnd());
    const pts = []; for (let k = 0; k < 6; k++) { pts.push([x, y]); a += (rnd() - .5) * curl; x += Math.cos(a) * len / 6; y += Math.sin(a) * len / 6; }
    for (const dx of [-n, 0, n]) for (const dy of [-n, 0, n]) { g.beginPath(); g.moveTo(pts[0][0] + dx, pts[0][1] + dy); for (const p of pts) g.lineTo(p[0] + dx, p[1] + dy); g.stroke(); } }
  g.globalAlpha = 1;
}
function blobs(g, n, count, r0, r1, col, alpha) { for (let i = 0; i < count; i++) { const x = rnd() * n, y = rnd() * n, r = r0 + rnd() * (r1 - r0); g.globalAlpha = alpha * (.3 + rnd() * .7); g.fillStyle = col; wrap(n, x, y, r, (X, Y) => { g.beginPath(); g.arc(X, Y, r, 0, 7); g.fill(); }); } g.globalAlpha = 1; }
const H = {
  reptile(g, n) { const k = n / 512; g.fillStyle = '#3a3a3a'; g.fillRect(0, 0, n, n);
    for (let i = 0; i < 26; i++) dome(g, n, rnd() * n, rnd() * n, (12 + rnd() * 10) * k, 230, 60, .8 + rnd() * .4, rnd() * 3); // scutes
    for (let i = 0; i < 2600; i++) dome(g, n, rnd() * n, rnd() * n, (2.5 + rnd() * 4.5) * k, 150 + rnd() * 90 | 0, 40); // pebbly tubercles
    strokes(g, n, 40, 90 * k, 1.6 * k, '#141414', .5, null, 1.2); },
  scales(g, n) { const k = n / 512, s = 26 * k; g.fillStyle = '#202020'; g.fillRect(0, 0, n, n);
    for (let r = Math.ceil(n / (s * .55)); r >= -1; r--) for (let c = -1; c <= n / s + 1; c++) { const x = c * s + (r % 2) * s / 2 + (rnd() - .5) * 2 * k, y = r * s * .55;
      wrap(n, x, y, s, (X, Y) => { const gr = g.createLinearGradient(X, Y - s * .5, X, Y + s * .55); gr.addColorStop(0, '#2a2a2a'); gr.addColorStop(.75, `rgb(${210 + rnd() * 40 | 0},${210},${210})`); gr.addColorStop(1, '#505050');
        g.fillStyle = gr; g.beginPath(); g.moveTo(X - s * .5, Y - s * .2); g.quadraticCurveTo(X - s * .52, Y + s * .45, X, Y + s * .6); g.quadraticCurveTo(X + s * .52, Y + s * .45, X + s * .5, Y - s * .2); g.closePath(); g.fill(); }); } },
  bigscales(g, n) { const k = n / 512; seed = 4242; H.scales(g, n); g.globalCompositeOperation = 'multiply'; blobs(g, n, 30, 20 * k, 50 * k, '#9a9a9a', .3); g.globalCompositeOperation = 'source-over'; },
  scutes(g, n) { const k = n / 512, h = 42 * k; g.fillStyle = '#303030'; g.fillRect(0, 0, n, n); for (let y = 0; y < n; y += h) { const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#606060'); gr.addColorStop(.85, '#d8d8d8'); gr.addColorStop(1, '#202020'); g.fillStyle = gr; g.fillRect(0, y + 2 * k, n, h - 4 * k); }
    strokes(g, n, 160, 40 * k, 1 * k, '#202020', .4); },
  skin(g, n) { const k = n / 512; g.fillStyle = '#808080'; g.fillRect(0, 0, n, n); blobs(g, n, 90, 20 * k, 70 * k, '#9a9a9a', .12); blobs(g, n, 90, 20 * k, 70 * k, '#606060', .1);
    strokes(g, n, 520, 30 * k, 1.1 * k, '#4a4a4a', .45, null, .9); blobs(g, n, 5200, .6 * k, 1.3 * k, '#3a3a3a', .7); },
  dried(g, n) { const k = n / 512; g.fillStyle = '#707070'; g.fillRect(0, 0, n, n); strokes(g, n, 1400, 120 * k, 2.2 * k, '#c0c0c0', .45, -Math.PI / 2, .25); strokes(g, n, 1100, 110 * k, 1.8 * k, '#262626', .55, -Math.PI / 2, .3);
    strokes(g, n, 60, 160 * k, 3 * k, '#101010', .8, -Math.PI / 2, .6); blobs(g, n, 1200, 1 * k, 2.5 * k, '#303030', .6); },
  wet(g, n) { const k = n / 512; g.fillStyle = '#7a7a7a'; g.fillRect(0, 0, n, n); for (let i = 0; i < 160; i++) dome(g, n, rnd() * n, rnd() * n, (14 + rnd() * 26) * k, 170, 90); for (let i = 0; i < 900; i++) dome(g, n, rnd() * n, rnd() * n, (2 + rnd() * 3) * k, 200, 80);
    strokes(g, n, 120, 80 * k, 2 * k, '#404040', .4, null, 1); },
  slime(g, n) { seed = 777; H.wet(g, n); const k = n / 512; strokes(g, n, 300, 70 * k, 3 * k, '#3a3a3a', .5, null, 1.6); },
  hide(g, n) { const k = n / 512; g.fillStyle = '#8a8a8a'; g.fillRect(0, 0, n, n); strokes(g, n, 900, 60 * k, 1.6 * k, '#303030', .7, null, 1.4); strokes(g, n, 400, 40 * k, 1.2 * k, '#c8c8c8', .35, null, 1.4); blobs(g, n, 3000, .7 * k, 1.5 * k, '#404040', .6); },
  shark(g, n) { const k = n / 512; g.fillStyle = '#808080'; g.fillRect(0, 0, n, n); for (let y = 0; y < n; y += 6 * k) for (let x = (y / (6 * k) % 2) * 4 * k; x < n; x += 8 * k) { g.fillStyle = '#a8a8a8'; g.fillRect(x, y, 4 * k, 1.4 * k); }
    blobs(g, n, 60, 10 * k, 40 * k, '#707070', .25); strokes(g, n, 25, 90 * k, 2 * k, '#c0c0c0', .5, null, .3); }, // + healed scars
  chitin(g, n) { const k = n / 512; g.fillStyle = '#909090'; g.fillRect(0, 0, n, n); for (let i = 0; i < 40; i++) dome(g, n, rnd() * n, rnd() * n, (30 + rnd() * 40) * k, 200, 110, .6); strokes(g, n, 120, 120 * k, 1.5 * k, '#202020', .7, null, .6); blobs(g, n, 900, .8 * k, 1.6 * k, '#505050', .5); },
  rubber(g, n) { const k = n / 512; g.fillStyle = '#808080'; g.fillRect(0, 0, n, n); blobs(g, n, 3000, .6 * k, 1.4 * k, '#909090', .35); strokes(g, n, 30, 80 * k, 4 * k, '#707070', .3, null, .8); },
  matte(g, n) { const k = n / 512; g.fillStyle = '#808080'; g.fillRect(0, 0, n, n); blobs(g, n, 9000, .5 * k, 1.2 * k, '#a0a0a0', .4); blobs(g, n, 4000, .5 * k, 1.2 * k, '#606060', .4); },
  enamel(g, n) { const k = n / 512; g.fillStyle = '#909090'; g.fillRect(0, 0, n, n); strokes(g, n, 260, 120 * k, 1.5 * k, '#a8a8a8', .4, -Math.PI / 2, .1); strokes(g, n, 30, 60 * k, 1.2 * k, '#505050', .7, -Math.PI / 2, .5); },
  horn(g, n) { const k = n / 512; g.fillStyle = '#808080'; g.fillRect(0, 0, n, n); strokes(g, n, 900, 200 * k, 1.6 * k, '#b0b0b0', .5, 0, .08); strokes(g, n, 700, 200 * k, 1.4 * k, '#4a4a4a', .5, 0, .08); for (let y = 0; y < n; y += 22 * k) { g.fillStyle = '#5a5a5a'; g.globalAlpha = .5; g.fillRect(0, y, n, 2 * k); } g.globalAlpha = 1; },
  membrane(g, n) { const k = n / 512; g.fillStyle = '#808080'; g.fillRect(0, 0, n, n); blobs(g, n, 3000, .7 * k, 1.4 * k, '#6a6a6a', .5); strokes(g, n, 80, 160 * k, 3.5 * k, '#c8c8c8', .7, null, .7); strokes(g, n, 260, 60 * k, 1.6 * k, '#b4b4b4', .6, null, 1.2); },
  strand(g, n) { g.fillStyle = '#000'; g.fillRect(0, 0, n, n); const k = n / 512; for (let i = 0; i < 5200 * k * k; i++) { const v = 150 + rnd() * 105 | 0, x = rnd() * n, y = rnd() * n, r = (2.6 + rnd() * 2.4) * k;
    wrap(n, x, y, r, (X, Y) => { const gr = g.createRadialGradient(X, Y, 0, X, Y, r); gr.addColorStop(0, `rgb(${v},${v},${v})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(X - r, Y - r, r * 2, r * 2); }); } },
};
const TCACHE = {};
function heightCanvas(kind) { const key = 'h:' + kind; if (TCACHE[key]) return TCACHE[key]; const n = LOW ? 256 : 512, [c, g] = cv(n); seed = [...kind].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 11) % 2147483647 || 11; H[kind](g, n); return (TCACHE[key] = c); }
function texOf(c, srgb) { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = LOW ? 2 : 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; return t; }
function genSet(kind, strength = 2) {
  const key = 'g:' + kind; if (TCACHE[key]) return TCACHE[key];
  const src = heightCanvas(kind), n = src.width, d = src.getContext('2d').getImageData(0, 0, n, n).data, h = new Float32Array(n * n);
  for (let i = 0; i < n * n; i++) h[i] = d[i * 4] / 255;
  const [nc, ng] = cv(n), [rc, rg] = cv(n), [cc, cg] = cv(n), N = ng.createImageData(n, n), R = rg.createImageData(n, n), C = cg.createImageData(n, n), s = strength * n / 256;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const i = y * n + x, l = h[y * n + (x + n - 1) % n], r = h[y * n + (x + 1) % n], u = h[((y + n - 1) % n) * n + x], dn = h[((y + 1) % n) * n + x];
    let nx = (l - r) * s, ny = (dn - u) * s, nz = 1; const L = Math.hypot(nx, ny, nz); nx /= L; ny /= L; nz /= L;
    N.data[i * 4] = (nx * .5 + .5) * 255; N.data[i * 4 + 1] = (ny * .5 + .5) * 255; N.data[i * 4 + 2] = (nz * .5 + .5) * 255; N.data[i * 4 + 3] = 255;
    const cav = Math.max(0, Math.min(1, h[i])), rv = (.62 + (1 - cav) * .5) * 200; R.data[i * 4] = R.data[i * 4 + 1] = R.data[i * 4 + 2] = Math.min(255, rv); R.data[i * 4 + 3] = 255;
    const cv2 = (150 + cav * 120) | 0; C.data[i * 4] = C.data[i * 4 + 1] = C.data[i * 4 + 2] = Math.min(255, cv2); C.data[i * 4 + 3] = 255; }
  ng.putImageData(N, 0, 0); rg.putImageData(R, 0, 0); cg.putImageData(C, 0, 0);
  return (TCACHE[key] = { nor: texOf(nc), rough: texOf(rc), col: texOf(cc, true) });
}
const PHL = DOC ? new THREE.TextureLoader() : null;
function phSet(name) { // CC0 Poly Haven: colour detail, OpenGL normal, roughness
  const key = 'p:' + name; if (TCACHE[key]) return TCACHE[key]; const u = f => new URL('../models/tex/' + name + '_' + f + '.jpg', import.meta.url).href;
  const ld = (f, srgb) => { const t = PHL.load(u(f), () => { for (const c of Object.values(REP)) if (c.source === t.source) c.needsUpdate = true; }); PH_WAIT.push(new Promise(r => { const iv = setInterval(() => { if (t.image && (t.image.complete ?? true)) { clearInterval(iv); r(); } }, 30); setTimeout(() => { clearInterval(iv); r(); }, 15000); })); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = LOW ? 2 : 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
  return (TCACHE[key] = { nor: ld('nor'), rough: ld('rough'), col: ld('col', true) });
}
const PH_WAIT = [];
export function realReady() { if (DOC) for (const n of ['fur', 'rust', 'leather', 'wool', 'rock']) phSet(n); return Promise.all(PH_WAIT); }
const REP = {};
function rep(t, rx, ry) { if (!t) return null; rx = Math.max(.5, Math.round(rx * 2) / 2); ry = Math.max(.5, Math.round(ry * 2) / 2); const k = t.uuid + rx + 'x' + ry; if (REP[k]) return REP[k]; const c = t.clone(); c.repeat.set(rx, ry); if (t.image) c.needsUpdate = true; else c.version = 0; return (REP[k] = c); }

// ---------- surfaces ----------
// t: texture set ('ph:x' photo / generated kind), d: tiles per metre, ns: normal strength, r: roughness, sh: sheen, cc: clearcoat, sss: subsurface tint,
// cs: countershading, wet: darken+gloss, env: reflection strength, fur: shell layers {n,len,d}
const S = {
  teddy: { t: 'ph:fur', d: 3.2, ns: 1.1, r: 1, sh: .8, shr: .5, env: .25 },
  rottenfur: { t: 'ph:fur', d: 3.2, ns: 1.4, r: 1, sh: .5, shr: .7, env: .15, dirt: .75 },
  hair: { t: 'ph:fur', d: 2.2, ns: 1.4, r: 1, sh: 1, shr: .45, env: .15, fur: { n: 8, len: .1, d: 4.5 } },
  velvet: { t: 'ph:fur', d: 6, ns: .6, r: 1, sh: 1, shr: .35, env: .2, fur: { n: 5, len: .018, d: 14 } },
  pycno: { t: 'skin', d: 2.5, ns: 1, r: .9, sh: .9, shr: .5, sss: '#a05030', env: .15, fur: { n: 6, len: .03, d: 10 } },
  rust: { t: 'ph:rust', d: 1.6, ns: 1.3, r: 1, metal: .55, env: .9, keepCol: true },
  steel: { t: 'enamel', d: 1, ns: .3, r: .25, metal: 1, env: 1.2 },
  plastic: { t: 'rubber', d: 2, ns: .4, r: .45, cc: .5, ccr: .25, env: .5 },
  rubber: { t: 'rubber', d: 2, ns: .5, r: .7, env: .3 },
  ink: { t: 'rubber', d: 1.5, ns: .35, r: .4, cc: .8, ccr: .18, env: .7 },
  glove: { t: 'rubber', d: 2, ns: .4, r: .5, cc: .4, ccr: .3, sss: '#c8c0b8', env: .4 },
  enamel: { t: 'enamel', d: 3, ns: .5, r: .3, cc: .6, ccr: .15, sss: '#d8c090', env: .7 },
  eyeball: { t: 'enamel', d: 1, ns: .1, r: .08, cc: 1, ccr: .02, sss: '#ff8a7a', env: 1.3 },
  eye: { t: null, r: .1, cc: 1, ccr: .02, env: 1.5 },
  human: { t: 'skin', d: 5, ns: .9, r: .62, sh: .2, shr: .3, sss: '#d04a30', env: .3 },
  dried: { t: 'dried', d: 1.6, ns: 2.4, r: .9, sss: '#7a2a10', env: .15 },
  hide: { t: 'hide', d: 3, ns: 1.6, r: .75, sss: '#a04030', env: .25, cs: .6 },
  reptile: { t: 'reptile', d: .9, ns: 2.2, r: .8, sss: '#803020', env: .3, cs: .85 },
  dscales: { t: 'bigscales', d: 1.6, ns: 2.4, r: .55, cc: .3, ccr: .35, sss: '#901808', env: .6, cs: .55 },
  scutes: { t: 'scutes', d: 1.3, ns: 1.6, r: .55, sss: '#a06020', env: .45 },
  wetscales: { t: 'scales', d: 2.2, ns: 2, r: .35, cc: 1, ccr: .08, wet: 1, sss: '#305040', env: .9, cs: .7 },
  wetskin: { t: 'wet', d: 1.6, ns: 1.4, r: .3, cc: 1, ccr: .06, wet: 1, sss: '#c03028', env: 1, cs: .4 },
  shark: { t: 'shark', d: 2, ns: 1, r: .35, cc: .9, ccr: .1, wet: 1, env: .9, cs: .9, keepMap: true },
  slime: { t: 'slime', d: 1.8, ns: 1.6, r: .3, cc: 1, ccr: .05, wet: 1, sss: '#c03028', env: 1.1 },
  flesh: { t: 'slime', d: 2.5, ns: 1.8, r: .25, cc: 1, ccr: .04, wet: 1, sss: '#ff2a1a', env: 1.1 },
  chitin: { t: 'chitin', d: 1.4, ns: 1.2, r: .3, cc: .9, ccr: .12, env: .9 },
  matte: { t: 'matte', d: 3, ns: .6, r: .85, env: .15 },
  membrane: { t: 'ph:leather', d: 1.2, ns: 1.3, r: .65, sss: '#c04020', env: .3, trans: 1 },
  wool: { t: 'ph:wool', d: 3, ns: 1, r: 1, sh: .6, shr: .6, env: .1 },
  cotton: { t: 'ph:wool', d: 5, ns: .5, r: .9, sh: .3, shr: .5, env: .1 },
  leather: { t: 'ph:leather', d: 3, ns: 1, r: .45, cc: .4, ccr: .3, env: .5 },
  rock: { t: 'ph:rock', d: .9, ns: 1.6, r: 1, env: .15, keepCol: true },
  claw: { t: 'horn', d: 6, ns: .8, r: .35, cc: .5, ccr: .2, env: .6 },
  horn: { t: 'horn', d: 3, ns: 1, r: .45, cc: .3, ccr: .3, env: .5 },
};
const FN = { fur: 'teddy', metal: 'rust', '#e8e2cc': 'enamel', '#f2f2ee': 'eyeball', '#141414': 'rubber', '#101010': 'rubber', '#222222': 'rust', '#2a2a2a': 'rust', '#1a120c': 'rubber', '#c8c8c8': 'steel', '#2a1a10': 'leather', '#a01818': 'cotton', '#b02020': 'plastic', def: 'plastic' };
const MON = {
  freddy: FN, bonnie: FN, chica: FN, foxy: FN, springtrap: { ...FN, fur: 'rottenfur', '#1a120c': 'rust' },
  cartooncat: { def: 'ink', '#f6f6f6': 'glove' },
  sirenhead: { skin: 'dried', metal: 'rust', '#0a0a0a': 'rubber', def: 'dried' },
  drnowhere: { cloth: 'wool', '#e6e6e2': 'cotton', skin: 'human', '#d8d8e0': 'steel', '#999999': 'steel', '#8a1a1a': 'cotton', '#333333': 'plastic' },
  locust: { def: 'chitin', skin: 'human' }, monochrome: { def: 'matte' },
  sonicexe: { fur: 'velvet', '#f2f2f2': 'glove', '#b51418': 'leather', '#e2b48a': 'velvet', def: 'velvet' },
  demogorgon: { skin: 'slime', '#7a1018': 'flesh', '#efe8d6': 'enamel' },
  megalodon: { def: 'shark' }, megalodon_h: { skin: 'shark', '#f4f0e2': 'enamel', '#d9d6cb': 'shark', '#6e1e26': 'flesh', '#252c34': 'shark' },
  kraken: { skin: 'wetskin', def: 'wetskin', '#1a0a08': 'horn', '#050505': 'eyeball' },
  cthulhu: { scales: 'wetscales', '#2a4430': 'wetskin', '#3a5440': 'membrane', '#0a0a08': 'claw' },
  leviathan: { scales: 'wetscales', '#2a6a7a': 'membrane', '#8aa6a0': 'wetskin', '#e8e4d4': 'enamel', '#d8d0b8': 'horn' },
  mosasaurus: { scales: 'wetscales', '#c8c4b4': 'wetskin', '#5a1a1e': 'flesh', '#efe9d6': 'enamel' },
  nessie: { def: 'wetskin' }, spinosaurus: { def: 'reptile', skin: 'membrane' }, trex: { def: 'reptile' },
  quetzalcoatlus: { skin: 'pycno', '#3a2e26': 'claw', '#5a3a2a': 'membrane', '#c8a060': 'horn', '#a02a1a': 'horn' },
  yeti: { fur: 'hair', skin: 'hide', '#1a1612': 'claw', '#e6e0cc': 'enamel', '#c8c0a8': 'horn' },
  bigfoot: { fur: 'hair', skin: 'hide', '#1a1612': 'claw', '#e6e0cc': 'enamel' },
  dragon: { def: 'dscales', 'SK:Belly': 'scutes', 'SK:Wings': 'membrane', 'SK:Claws': 'claw' },
  chupacabra: { def: 'hide', '#2a2622': 'horn' },
  vampire: { cloth: 'wool', '#e8e4dc': 'cotton', '#7a0a12': 'cotton', skin: 'human', '#050505': 'leather', '#08080a': 'leather', '#ffffff': 'enamel' },
  gargoyle: { stone: 'rock', concrete: 'rock', '#d8d4c8': 'rock' },
  fester: { cloth: 'wool', skin: 'human', '#4a3a2a': 'hide', '#2a2018': 'claw', '#e8e4d8': 'cotton' },
  dn_conezone: { skin: 'human', '#bdbcb6': 'cotton' }, dn_nightmare: { '#050507': 'matte', '#e8e4d8': 'enamel' }, dn_sixarm: { skin: 'human', '#2a2622': 'wool' },
};
const CS = { trex: .85, spinosaurus: .8, megalodon: .9, mosasaurus: .7, nessie: .6, leviathan: .6, dragon: .5, chupacabra: .6, quetzalcoatlus: .4, kraken: .3 };
function classify(kind, m, o) {
  const T = MON[kind]; if (!T) return null;
  if (m.emissive && m.emissiveIntensity > .5 && m.emissive.getHex()) return (m.side === THREE.DoubleSide) ? null : 'eye';
  const hex = '#' + m.color.getHexString();
  if (o.isSkinnedMesh && T['SK:' + m.name]) return T['SK:' + m.name];
  if (T[hex]) return T[hex];
  if (m.userData.tx && T[m.userData.tx]) return T[m.userData.tx];
  if (m.metalness >= .5 && T.metal) return T.metal;
  if (/^#0[0-4]0[0-4]0[0-4]$/.test(hex)) return null; // pure-black holes stay flat black
  return T.def || null;
}
// how many texture tiles across a mesh's UV range (≈ metres × density)
function uvSpan(o) {
  const g = o.geometry, p = g.parameters || {}, sc = new THREE.Vector3(); o.matrixWorld.decompose(new THREE.Vector3(), new THREE.Quaternion(), sc); const s = (Math.abs(sc.x) + Math.abs(sc.y) + Math.abs(sc.z)) / 3;
  switch (g.type) {
    case 'SphereGeometry': return [2 * Math.PI * p.radius * s * (p.phiLength || 6.283) / 6.283, Math.PI * p.radius * s * (p.thetaLength || 3.1416) / 3.1416];
    case 'CylinderGeometry': return [2 * Math.PI * Math.max(p.radiusTop, p.radiusBottom) * s, p.height * s];
    case 'ConeGeometry': return [2 * Math.PI * p.radius * s, p.height * s];
    case 'CapsuleGeometry': return [2 * Math.PI * p.radius * s, (p.length + 2 * p.radius) * s];
    case 'BoxGeometry': { const a = (p.width + p.height + p.depth) / 3 * s; return [a, a]; }
    case 'TorusGeometry': return [2 * Math.PI * p.radius * s, 2 * Math.PI * p.tube * s];
    default: { if (!g.boundingSphere) g.computeBoundingSphere(); const a = g.boundingSphere.radius * 2 * s; return [a, a]; }
  }
}
// GLB creatures: give UV-less meshes a box projection and smooth (creased) normals so maps and light read as skin, not facets
export function prepGLBGeometry(mesh, lenM) {
  let g = mesh.geometry; if (g.userData.nhOut) { mesh.geometry = g.userData.nhOut; return; } if (g.userData.nh) return; g.userData.nh = 1;
  const P = g.attributes.position, Nn = g.attributes.normal; if (!P || !Nn) return;
  if (g.attributes.uv && !mesh.material?.map) { const U = g.attributes.uv; let a = 1e9, b = -1e9, c = 1e9, d = -1e9; for (let i = 0; i < U.count; i++) { a = Math.min(a, U.getX(i)); b = Math.max(b, U.getX(i)); c = Math.min(c, U.getY(i)); d = Math.max(d, U.getY(i)); }
    if (b - a < .3 && d - c < .3) g.deleteAttribute('uv'); } // palette-atlas UVs (collapsed islands) can't carry a detail map
  if (!g.boundingBox) g.computeBoundingBox(); const sz = g.boundingBox.getSize(new THREE.Vector3()), md = Math.max(sz.x, sz.y, sz.z) || 1;
  // creased smooth normals: average with coincident vertices whose normals are within ~62°
  const key = i => Math.round(P.getX(i) / md * 2e4) + '_' + Math.round(P.getY(i) / md * 2e4) + '_' + Math.round(P.getZ(i) / md * 2e4), map = new Map();
  for (let i = 0; i < P.count; i++) { const k = key(i); (map.get(k) || map.set(k, []).get(k)).push(i); }
  const out = new Float32Array(P.count * 3), cos = Math.cos(78 * Math.PI / 180);
  for (const ids of map.values()) for (const i of ids) { let x = 0, y = 0, z = 0; const nx = Nn.getX(i), ny = Nn.getY(i), nz = Nn.getZ(i);
    for (const j of ids) { const d = nx * Nn.getX(j) + ny * Nn.getY(j) + nz * Nn.getZ(j); if (d >= cos) { x += Nn.getX(j); y += Nn.getY(j); z += Nn.getZ(j); } }
    const L = Math.hypot(x, y, z) || 1; out[i * 3] = x / L; out[i * 3 + 1] = y / L; out[i * 3 + 2] = z / L; }
  g.setAttribute('normal', new THREE.BufferAttribute(out, 3));
  if (!LOW && g.index && g.index.count < 30000) pnSubdivide(g, map, key);
  if (!g.attributes.uv) { // per-face box projection (no smeared triangles), in units of the model's longest side
    const src = g; g = g.index ? g.toNonIndexed() : g.clone(); const Q = g.attributes.position, uv = new Float32Array(Q.count * 2), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    for (let i = 0; i < Q.count; i += 3) { a.fromBufferAttribute(Q, i); b.fromBufferAttribute(Q, i + 1); c.fromBufferAttribute(Q, i + 2); const n = b.clone().sub(a).cross(c.clone().sub(a)), ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z);
      for (let k = 0; k < 3; k++) { const x = Q.getX(i + k) / md, y = Q.getY(i + k) / md, z = Q.getZ(i + k) / md; let u, v;
        if (ax >= ay && ax >= az) { u = z * Math.sign(n.x); v = y; } else if (ay >= az) { u = x; v = z * Math.sign(n.y); } else { u = -x * Math.sign(n.z); v = y; }
        uv[(i + k) * 2] = u; uv[(i + k) * 2 + 1] = v; } }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.userData.boxUV = 1; g.userData.nh = 1; src.userData.nhOut = g; mesh.geometry = g; }
}
// one level of PN-triangle (curved) subdivision: smoother silhouettes on the low-poly CC0 creatures; skin weights blended
function pnSubdivide(g, map, key) {
  const P = g.attributes.position, N = g.attributes.normal, I = g.index.array, n0 = P.count;
  const sm = new Float32Array(n0 * 3); // fully smoothed normals (shared across seams) drive the curvature so seams stay closed
  for (const ids of map.values()) { let x = 0, y = 0, z = 0; for (const j of ids) { x += N.getX(j); y += N.getY(j); z += N.getZ(j); } const L = Math.hypot(x, y, z) || 1; for (const j of ids) { sm[j * 3] = x / L; sm[j * 3 + 1] = y / L; sm[j * 3 + 2] = z / L; } }
  const names = Object.keys(g.attributes), edges = new Map(), mids = [];
  const mid = (a, b) => { const k = a < b ? a + ',' + b : b + ',' + a; let m = edges.get(k); if (m === undefined) { m = n0 + mids.length; mids.push([a, b]); edges.set(k, m); } return m; };
  const tri = [];
  for (let t = 0; t < I.length; t += 3) { const a = I[t], b = I[t + 1], c = I[t + 2], ab = mid(a, b), bc = mid(b, c), ca = mid(c, a); tri.push(a, ab, ca, ab, b, bc, ca, bc, c, ab, bc, ca); }
  const n1 = n0 + mids.length, NA = {};
  for (const nm of names) { const A = g.attributes[nm], sz = A.itemSize, arr = new A.array.constructor(n1 * sz); arr.set(A.array.subarray(0, n0 * sz)); NA[nm] = arr; }
  const v = new THREE.Vector3(), p1 = new THREE.Vector3(), p2 = new THREE.Vector3(), q1 = new THREE.Vector3(), q2 = new THREE.Vector3();
  mids.forEach(([a, b], k) => { const i = n0 + k;
    p1.fromBufferAttribute(P, a); p2.fromBufferAttribute(P, b); q1.fromArray(sm, a * 3); q2.fromArray(sm, b * 3);
    const w12 = v.subVectors(p2, p1).dot(q1), w21 = v.subVectors(p1, p2).dot(q2);
    const b210 = p1.clone().multiplyScalar(2).add(p2).addScaledVector(q1, -w12).divideScalar(3), b120 = p2.clone().multiplyScalar(2).add(p1).addScaledVector(q2, -w21).divideScalar(3);
    const m = p1.clone().add(p2).addScaledVector(b210, 3).addScaledVector(b120, 3).divideScalar(8);
    NA.position.set([m.x, m.y, m.z], i * 3);
    for (const nm of names) { if (nm === 'position') continue; const A = g.attributes[nm], sz = A.itemSize, o = NA[nm];
      if (nm === 'skinIndex' || nm === 'skinWeight') continue;
      for (let c = 0; c < sz; c++) o[i * sz + c] = (A.array[a * sz + c] + A.array[b * sz + c]) / 2;
      if (nm === 'normal') { const L = Math.hypot(o[i * 3], o[i * 3 + 1], o[i * 3 + 2]) || 1; for (let c = 0; c < 3; c++) o[i * 3 + c] /= L; } }
    if (NA.skinIndex) { const SI = g.attributes.skinIndex, SW = g.attributes.skinWeight, acc = new Map(), WS = !SW.normalized ? 1 : SW.array instanceof Uint8Array ? 255 : SW.array instanceof Uint16Array ? 65535 : 1;
      for (const s of [a, b]) for (let c = 0; c < 4; c++) { const bi = SI.getComponent(s, c), w = SW.getComponent(s, c) / 2; if (w > 0) acc.set(bi, (acc.get(bi) || 0) + w); }
      const top = [...acc].sort((x, y) => y[1] - x[1]).slice(0, 4), tot = top.reduce((t, e) => t + e[1], 0) || 1;
      for (let c = 0; c < 4; c++) { NA.skinIndex[i * 4 + c] = top[c] ? top[c][0] : 0; NA.skinWeight[i * 4 + c] = top[c] ? top[c][1] / tot * WS : 0; } } });
  for (const nm of names) { const A = g.attributes[nm]; g.setAttribute(nm, new THREE.BufferAttribute(NA[nm], A.itemSize, A.normalized)); }
  g.setIndex(tri); g.computeBoundingBox(); g.computeBoundingSphere();
}
// shader hook: wrapped-light subsurface scatter + back-light transmission, and countershading (pale belly, darker back)
function hook(m, sss, cs, trans) {
  m.onBeforeCompile = sh => {
    sh.uniforms.uSSS = { value: new THREE.Color(sss || '#000') }; sh.uniforms.uCS = { value: cs || 0 };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWN;').replace('#include <defaultnormal_vertex>', '#include <defaultnormal_vertex>\nvWN = normalize(mat3(modelMatrix) * objectNormal);');
    let f = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uSSS; uniform float uCS; varying vec3 vWN;');
    if (cs) f = f.replace('#include <color_fragment>', '#include <color_fragment>\n{ float up = smoothstep(-.55, .75, normalize(vWN).y); diffuseColor.rgb *= mix(1. + uCS * .45, 1. - uCS * .32, up); }');
    if (sss) f = f.replace('#include <lights_physical_pars_fragment>', THREE.ShaderChunk.lights_physical_pars_fragment
      .replace('vec3 irradiance = dotNL * directLight.color;', `vec3 irradiance = dotNL * directLight.color;
	float wrapNL = saturate( ( dot( geometryNormal, directLight.direction ) + .5 ) / 1.5 );
	vec3 sssI = ( wrapNL - dotNL ) * uSSS * directLight.color${trans ? ' + pow( saturate( dot( geometryViewDir, -directLight.direction ) ), 3. ) * uSSS * directLight.color * .8' : ''};`)
      .replace('reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );', 'reflectedLight.directDiffuse += ( irradiance + sssI ) * BRDF_Lambert( material.diffuseColor );'));
    sh.fragmentShader = f;
  };
  m.customProgramCacheKey = () => 'nh' + (sss ? 1 : 0) + (cs ? 1 : 0) + (trans ? 1 : 0);
}
function makeMat(src, name, span, o) {
  const s = S[name], P = LOW ? THREE.MeshStandardMaterial : THREE.MeshPhysicalMaterial;
  const m = new P({ color: src.color.clone(), roughness: s.r ?? src.roughness, metalness: s.metal ?? src.metalness, side: src.side, transparent: src.transparent, opacity: src.opacity, depthWrite: src.depthWrite });
  if (src.emissive) { m.emissive.copy(src.emissive); m.emissiveIntensity = src.emissiveIntensity; } if (src.emissiveMap) m.emissiveMap = src.emissiveMap;
  const set = !s.t ? null : s.t.startsWith('ph:') ? phSet(s.t.slice(3)) : genSet(s.t);
  const [ux, uy] = span; let rx = ux * (s.d || 1), ry = uy * (s.d || 1);
  if (o.isSkinnedMesh && o.geometry.userData.boxUV) { rx = ry = (o.userData.lenM || 8) * (s.d || 1); }
  if (s.keepMap && src.map) { m.map = src.map; if (o.isSkinnedMesh) rx = ry = 18; }
  if (LOW) { rx *= .7; ry *= .7; } // phones: coarser, softer detail (less shimmer on small screens)
  if (set) { m.normalMap = rep(set.nor, rx, ry); const k = (s.ns ?? 1) * (LOW ? .55 : 1); m.normalScale.set(k, k); m.roughnessMap = rep(set.rough, rx, ry); if (!m.map) m.map = rep(set.col, rx, ry); }
  if (s.wet) m.color.multiplyScalar(.82); if (s.dirt) m.color.multiplyScalar(s.dirt);
  if (!LOW) { if (s.sh) { m.sheen = s.sh; m.sheenRoughness = s.shr ?? .5; m.sheenColor = src.color.clone().lerp(new THREE.Color('#ffffff'), .35); }
    if (s.cc) { m.clearcoat = s.cc; m.clearcoatRoughness = s.ccr ?? .1; } }
  m.envMapIntensity = s.env ?? .3; if (ENV) m.envMap = ENV; else PENDING.add(m);
  const cs = CS[o.userData.kindR] && !['eye', 'eyeball', 'enamel', 'claw', 'horn', 'membrane'].includes(name) ? CS[o.userData.kindR] : 0;
  if (s.sss || cs) hook(m, LOW ? null : s.sss, cs, !LOW && s.trans);
  m.userData.surf = name; return m;
}
const SHELL = {};
function shellMat(base, i, n, len, strand) {
  const m = new THREE.MeshStandardMaterial({ color: base.color.clone(), roughness: 1, metalness: 0, alphaMap: strand, side: THREE.FrontSide });
  const t = i / n; m.userData.shell = t;
  m.onBeforeCompile = sh => { sh.uniforms.uT = { value: t }; sh.uniforms.uLen = { value: len };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uT; uniform float uLen;').replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed += normalize(objectNormal) * uLen * uT; transformed.y -= uLen * uT * uT * .45;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uT;').replace('#include <alphamap_fragment>', 'float stv = texture2D( alphaMap, vAlphaMapUv ).g; if ( stv < uT * .85 + .12 ) discard; diffuseColor.rgb *= mix( .38, 1.08, uT );'); };
  m.customProgramCacheKey = () => 'nhshell'; return m;
}
// convert a monster's (sub)tree to realistic materials; adds shell fur where the surface wants it
export function realize(root, sub = root) {
  const kind = String(root.userData.kind || '').split('#')[0]; if (!MON[kind]) return;
  const cache = root.userData.rmat || (root.userData.rmat = new Map()); root.updateMatrixWorld(true);
  const list = []; sub.traverse(o => { if (o.isMesh && !o.userData.real && !o.userData.shell && !Array.isArray(o.material) && o.material && o.material.isMeshStandardMaterial) list.push(o); });
  for (const o of list) {
    o.userData.real = 1; o.userData.kindR = kind; const src = o.material, name = classify(kind, src, o); if (!name || !S[name]) continue;
    const span = uvSpan(o), k = [name, src.color.getHexString(), src.roughness, src.metalness, src.emissive?.getHexString(), src.emissiveIntensity, src.side, src.transparent, src.opacity, Math.round(span[0] * 2), Math.round(span[1] * 2), o.isSkinnedMesh ? src.uuid : ''].join('|');
    let m = cache.get(k); if (!m) { m = makeMat(src, name, span, o); cache.set(k, m); } o.material = m;
    const fur = S[name].fur; if (fur && !LOW && !o.isSkinnedMesh) {
      const strand = rep(TCACHE['strand'] || (TCACHE['strand'] = texOf(heightCanvas('strand'))), span[0] * fur.d, span[1] * fur.d), sc = new THREE.Vector3(); o.getWorldScale(sc); const ms = (sc.x + sc.y + sc.z) / 3 || 1;
      const sk = m.uuid + ':' + strand.uuid; const mats = SHELL[sk] || (SHELL[sk] = Array.from({ length: fur.n }, (_, i) => shellMat(m, i + 1, fur.n, fur.len / ms, strand)));
      for (const sm of mats) { const sh = new THREE.Mesh(o.geometry, sm); sh.userData.shell = 1; sh.visible = false; sh.castShadow = false; sh.receiveShadow = true; o.add(sh); (root.userData.shells || (root.userData.shells = [])).push(sh); }
    }
  }
}
// distance LOD: shell fur only close up (hidden until a camera comes within 14 m) (the base surface keeps its photo fur normal map further out)
export function lodTick(root, dist) { const s = root.userData.shells; if (!s) return; const v = dist < 14; if (root.userData.lodV === v) return; root.userData.lodV = v; for (const m of s) m.visible = v; }
