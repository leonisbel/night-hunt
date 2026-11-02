// Night Hunt 3D renderer (three.js): level building, lighting, characters, particles, post-processing.
import * as THREE from '../vendor/three.module.min.js';
import { tex, glowTex, softTex, beamTex, textSprite } from './textures.js';
import { buildMonster, buildSurvivor, buildHelicopter, buildLamp, monsterHeight, G, mat, buildItem, heldItem, itemClass, buildChest, buildBag, towerBeams, applySkin, buildProp, modelKey, animTick, wiggleTick, buildPet, realSetup, lodTick } from './models.js';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';

export const S = 1 / 20; // simulation pixels -> metres
const W3 = (x, y, h = 0) => new THREE.Vector3(x * S, h, y * S);
const lerp = (a, b, k) => a + (b - a) * k;
const angLerp = (a, b, k) => { let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return a + d * k; };

const THEMES = {
  'Helipad Lobby': { ground: 'concrete', grep: 6, wall: 'concrete', fog: '#1b1d26', dens: .018, sky: '#5a6a90', gnd: '#20201c', hemi: 1.1, moon: .9, lamps: 10, tree: 'round', dust: '#c8c8ff', wisps: 6, wallH: 1.4 },
  'Abandoned Pizzeria Town': { ground: 'asphalt', grep: 5, wall: 'brick', fog: '#120d0c', dens: .045, sky: '#3a3050', gnd: '#120c0a', hemi: .6, moon: .55, lamps: 16, tree: 'dead', dust: '#ffd2a0', wisps: 14, wallH: 3.6 },
  'Powerline Forest': { ground: 'grass', grep: 4, ground2: 'dirt', wall: 'wood', fog: '#18201f', dens: .05, sky: '#34464c', gnd: '#0c120a', hemi: .62, moon: .6, lamps: 4, tree: 'pine', dense: true, dust: '#d8ff8a', wisps: 40, wallH: 3.2, ferns: true },
  'Foggy Woods': { ground: 'grass', grep: 4, ground2: 'dirt', wall: 'wood', fog: '#151c1b', dens: .06, sky: '#2c3a40', gnd: '#0c120a', hemi: .55, moon: .5, lamps: 7, tree: 'pine', dust: '#d8ff8a', wisps: 34, wallH: 3.2 },
  'Static Fields': { ground: 'drygrass', grep: 4, wall: 'concrete', fog: '#1a1a1e', dens: .04, sky: '#404048', gnd: '#141410', hemi: .6, moon: .6, lamps: 10, tree: 'deadtall', dust: '#ffffff', wisps: 16, wallH: 3.2, staticNoise: true },
  // v1.4 biomes
  'Stormy Ocean': { ground: 'sand', grep: 4, wall: 'wood', fog: '#18232b', dens: .022, sky: '#56687a', gnd: '#0e1418', hemi: .8, moon: .75, lamps: 6, tree: 'palm', wisps: 0, wallH: 3.2, ocean: true, rain: 1 },
  'Rainforest Swamp': { ground: 'grass', grep: 4, ground2: 'dirt', wall: 'wood', fog: '#142019', dens: .05, sky: '#3a5040', gnd: '#0a120a', hemi: .65, moon: .55, lamps: 5, tree: 'jungle', dense: true, ferns: true, wisps: 0, wallH: 3.2, rain: .5 },
  'Snowy Mountain': { ground: 'snow', grep: 5, wall: 'wood', fog: '#3a4654', dens: .04, sky: '#9aaac8', gnd: '#46506a', hemi: 1.0, moon: .9, lamps: 5, tree: 'snowpine', wisps: 0, wallH: 3.2, snow: true },
  'Haunted Farm': { ground: 'drygrass', grep: 4, ground2: 'dirt', wall: 'wood', fog: '#1c1912', dens: .038, sky: '#544a34', gnd: '#141008', hemi: .62, moon: .75, lamps: 8, tree: 'dead', wisps: 0, wallH: 3.2 },
  'Vampire Castle': { ground: 'dirt', grep: 4, ground2: 'grass', wall: 'stone', fog: '#160c16', dens: .038, sky: '#4a2a50', gnd: '#0c080c', hemi: .58, moon: .85, moonC: '#ff9a8a', lamps: 10, tree: 'dead', wisps: 0, wallH: 3.4 },
  'Fester Street': { ground: 'grass', grep: 4, wall: 'brick', fog: '#14141c', dens: .032, sky: '#3a3a54', gnd: '#0c0c10', hemi: .62, moon: .6, lamps: 0, tree: 'round', wisps: 0, wallH: 3.2, streets: true },
};

// Screen-space "see-through" hole around the player for level geometry between camera and player
const FADE = { uPS: { value: new THREE.Vector2(.5, .5) }, uPD: { value: 1000 }, uRad: { value: .12 }, uRes: { value: new THREE.Vector2(1, 1) } };
function fadeable(m) {
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, FADE);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
uniform vec2 uPS; uniform float uPD; uniform float uRad; uniform vec2 uRes;`).replace('void main() {', `void main() {
  { vec2 sp = gl_FragCoord.xy / uRes; vec2 dd = (sp - uPS) * vec2(uRes.x / uRes.y, 1.0); float rr = length(dd);
    if (vViewPosition.z < uPD - 1.2 && rr < uRad) { float th = smoothstep(uRad * .55, uRad, rr); float n = fract(sin(dot(floor(gl_FragCoord.xy), vec2(12.9898, 78.233))) * 43758.5453); if (n > th) discard; } }`);
  };
  m.customProgramCacheKey = () => 'fade';
  return m;
}

function boxUV(g, sx, sy, sz, scale) { // world-scaled UVs per face so textures don't stretch
  const uv = g.attributes.uv, dims = [[sz, sy], [sz, sy], [sx, sz], [sx, sz], [sx, sy], [sx, sy]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * dims[f][0] / scale, uv.getY(k) * dims[f][1] / scale); }
  uv.needsUpdate = true; return g;
}
let bushGeo = null;
function bushGeometry() {
  if (bushGeo) return bushGeo;
  const g = new THREE.IcosahedronGeometry(1, 3), p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = 1 + .18 * Math.sin(v.x * 5.1 + v.y * 3.3) * Math.cos(v.z * 4.7) + .1 * Math.sin(v.y * 11 + v.x * 7); v.multiplyScalar(n); if (v.y < -.3) v.y = -.3; p.setXYZ(i, v.x, v.y, v.z); }
  g.computeVertexNormals(); return (bushGeo = g);
}
let tuftTex = null;
function grassTuftTex() {
  if (tuftTex) return tuftTex;
  const c = document.createElement('canvas'); c.width = 64; c.height = 64; const g = c.getContext('2d');
  for (let i = 0; i < 26; i++) { const x = 8 + Math.random() * 48; g.strokeStyle = ['#4c6a2c', '#36521f', '#6a7a3a', '#2b4019'][i % 4]; g.lineWidth = 2; g.beginPath(); g.moveTo(x, 64); g.quadraticCurveTo(x + (Math.random() - .5) * 20, 30, x + (Math.random() - .5) * 26, 6 + Math.random() * 20); g.stroke(); }
  tuftTex = new THREE.CanvasTexture(c); tuftTex.colorSpace = THREE.SRGBColorSpace; return tuftTex;
}
let fernT = null;
function fernTex() {
  if (fernT) return fernT;
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  for (let f = 0; f < 5; f++) { const x0 = 64 + (f - 2) * 14, a = (f - 2) * .28; g.strokeStyle = '#3d5a22'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(64, 128); const ex = x0 + Math.sin(a) * 60, ey = 128 - Math.cos(a) * 110; g.quadraticCurveTo(x0, 70, ex, ey); g.stroke();
    for (let k = 1; k < 14; k++) { const t = k / 14, px = 64 + (ex - 64) * t, py = 128 + (ey - 128) * t, l = 16 * (1 - t * .7); g.fillStyle = ['#4e7a2a', '#3f6a22', '#5d8a34'][k % 3]; for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(px + sd * l * .6, py + 2, l * .55, 2.6, sd * .5 + a, 0, 6.28); g.fill(); } } }
  fernT = new THREE.CanvasTexture(c); fernT.colorSpace = THREE.SRGBColorSpace; return fernT;
}
// ---- v1.4 helpers: water, boats, omens (telltale signs of a submerged sea monster) ----
const P2 = new Set(['megalodon', 'kraken', 'cthulhu', 'leviathan', 'mosasaurus', 'nessie', 'spinosaurus', 'trex', 'quetzalcoatlus', 'yeti', 'bigfoot', 'dragon', 'chupacabra', 'vampire', 'gargoyle', 'fester']);
const SEA = new Set(['megalodon', 'kraken', 'cthulhu', 'leviathan', 'mosasaurus', 'nessie']);
export function inWaterC(map, x, y) { if (!map) return false; if (map.islands) return !map.islands.some(i => Math.hypot(i.x - x, i.y - y) < i.r); return !!(map.pools && map.pools.some(o => Math.hypot(o.x - x, o.y - y) < o.r)); }
function buildBoat(ship) {
  const g = new THREE.Group(), L = ship ? 7 : 4.2, Wd = ship ? 2.6 : 1.6, hull = new THREE.Shape();
  hull.moveTo(-Wd / 2, -L / 2); hull.lineTo(Wd / 2, -L / 2); hull.lineTo(Wd / 2, L * .2); hull.quadraticCurveTo(Wd / 2, L * .42, 0, L / 2); hull.quadraticCurveTo(-Wd / 2, L * .42, -Wd / 2, L * .2); hull.lineTo(-Wd / 2, -L / 2);
  const hg = new THREE.ExtrudeGeometry(hull, { depth: ship ? 1.3 : .8, bevelEnabled: true, bevelSize: .12, bevelThickness: .12, bevelSegments: 2 }); hg.rotateX(Math.PI / 2); hg.translate(0, ship ? .9 : .55, 0);
  const wood = mat(ship ? '#3a2a20' : '#7a4a2a', { map: 'wood', r: .7 }), paint = mat(ship ? '#e8e4d8' : '#c83a2a', { map: 'wood', r: .6 });
  const h = new THREE.Mesh(hg, paint); h.castShadow = true; g.add(h);
  const deck = new THREE.Mesh(new THREE.ShapeGeometry(hull), wood); deck.rotation.x = -Math.PI / 2; deck.position.y = ship ? .92 : .56; deck.scale.setScalar(.92); g.add(deck);
  if (ship) { const cab = new THREE.Mesh(G.box(1.8, 1.4, 2), mat('#e8e4d8', { r: .5 })); cab.position.set(0, 1.6, -1.2); g.add(cab); const mast = new THREE.Mesh(G.cyl(.08, .1, 5, 8), wood); mast.position.set(0, 3.4, .8); g.add(mast);
    const win = new THREE.Mesh(G.box(1.82, .35, 1.2), mat('#ffd890', { e: '#ffc860', ei: 1.5 })); win.position.set(0, 1.8, -1.0); g.add(win); const lt = new THREE.Mesh(G.sph(.12, 8, 6), mat('#ff3030', { e: '#ff2020', ei: 3 })); lt.position.set(0, 5.9, .8); g.add(lt); }
  else { const mot = new THREE.Mesh(G.box(.4, .6, .4), mat('#1a1a1a', { m: .5, r: .4 })); mot.position.set(0, .8, -L / 2 - .1); g.add(mot); const seat = new THREE.Mesh(G.box(Wd * .8, .12, .4), wood); seat.position.set(0, .75, -.3); g.add(seat); }
  const lan = new THREE.Mesh(G.sph(.1, 8, 6), mat('#ffe0a0', { e: '#ffcc66', ei: 3 })); lan.position.set(0, ship ? 2.5 : 1.0, L * .35); g.add(lan);
  return g;
}
function buildOmen(mt) {
  const g = new THREE.Group(), dark = mat('#0e1a20', { r: .3, m: .2 }), red = mat('#6a1a18', { map: 'skin', r: .35 }), wiggle = []; g.userData.mt = mt; g.userData.wig = wiggle;
  const seg = (parent, n, len, r0, r1, m, bend) => { let p = parent; for (let i = 0; i < n; i++) { const rr = r0 + (r1 - r0) * i / n; const s = new THREE.Mesh(G.cyl(+Math.max(.03, rr * .85).toFixed(2), +rr.toFixed(2), len, 8), m); s.position.y = len / 2; p.add(s); const nx = new THREE.Group(); nx.position.y = len; nx.rotation.x = bend; p.add(nx); wiggle.push([nx, bend, i]); p = nx; } return p; };
  if (mt === 'kraken') for (let k = 0; k < 4; k++) { const b = new THREE.Group(); b.position.set(Math.cos(k * 1.6) * 3.5, -.5, Math.sin(k * 1.6) * 3.5); b.rotation.set(Math.sin(k) * .4, 0, Math.cos(k) * .4); g.add(b); seg(b, 8, .8, .45, .06, red, .2); }
  else if (mt === 'leviathan') for (let k = 0; k < 4; k++) { const c = new THREE.Mesh(new THREE.TorusGeometry(1.6 - k * .2, .55 - k * .06, 10, 20, Math.PI), mat('#1f3e52', { map: 'scales', r: .3, m: .2 })); c.position.set(0, -.3, -k * 4); g.add(c); const fin = new THREE.Mesh(G.cone(.25, .9, 4), mat('#2a6a7a')); fin.position.set(0, 1.9 - k * .25, -k * 4); fin.scale.z = .3; g.add(fin); }
  else if (mt === 'mosasaurus') { const t = new THREE.Group(); t.position.set(0, -.4, 0); g.add(t); const tip = seg(t, 4, .9, .5, .15, mat('#3c4a52', { map: 'scales' }), .25); const f = new THREE.Mesh(G.cone(.7, 1.6, 4), mat('#3c4a52')); f.scale.set(1, 1, .2); f.position.y = .4; tip.add(f); g.userData.flick = t; }
  else if (mt === 'megalodon') { const fin = new THREE.Mesh(G.cone(1.1, 2.8, 4), mat('#4a5866', { map: 'skin', r: .35 })); fin.scale.set(.18, 1, 1); fin.rotation.x = -.35; fin.position.y = .9; g.add(fin); const t = new THREE.Mesh(G.cone(.5, 1.2, 4), mat('#4a5866')); t.scale.set(.15, 1, 1); t.position.set(0, .3, -6); t.rotation.x = -.5; g.add(t); g.userData.wake = true; }
  else if (mt === 'nessie') { const b = new THREE.Group(); b.position.y = -.5; g.add(b); const tip = seg(b, 7, 1.0, .55, .28, mat('#22342c', { map: 'skin', r: .3 }), .06); const hd = new THREE.Mesh(G.sph(.45, 12, 10), mat('#22342c', { map: 'skin', r: .3 })); hd.scale.set(.8, .7, 1.5); hd.position.set(0, .2, .4); tip.add(hd); const e = new THREE.Mesh(G.sph(.07, 8, 6), mat('#ffd040', { e: '#ffc020', ei: 2 })); e.position.set(.25, .35, .7); tip.add(e); const e2 = e.clone(); e2.position.x = -.25; tip.add(e2); g.userData.rise = b; }
  else if (mt === 'spinosaurus') { const sh = new THREE.Shape(); sh.moveTo(-2.5, 0); for (let i = 0; i <= 10; i++) sh.lineTo(-2.5 + i * .5, Math.sin(Math.PI * i / 10) * 2.4 * (1 + (i % 2) * .1)); sh.lineTo(2.5, 0); const m = mat('#a83a1e', { map: 'skin', r: .5 }); m.side = THREE.DoubleSide; const sl = new THREE.Mesh(new THREE.ShapeGeometry(sh, 4), m); sl.rotation.y = Math.PI / 2; g.add(sl); }
  else if (mt === 'cthulhu') { // a thunderhead with red eyes and great wings in the clouds
    const cl = mat('#1a1a22', { r: 1 }); for (let i = 0; i < 9; i++) { const c = new THREE.Mesh(G.sph(4 + (i % 3), 10, 8), cl); c.position.set((i - 4) * 4.2, 26 + Math.sin(i * 2) * 1.5, Math.cos(i * 3) * 3); c.scale.y = .5; g.add(c); }
    for (const sx of [-1, 1]) { const e = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('#ff1a10'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false })); e.scale.setScalar(3.2); e.position.set(sx * 2.2, 24, 4); g.add(e); const ec = new THREE.Mesh(G.cone(.5, 1.6, 3), new THREE.MeshBasicMaterial({ color: '#ff2a1a', fog: false })); ec.rotation.z = sx * 1.9; ec.position.set(sx * 2.2, 24, 4.4); g.add(ec);
      const ws = new THREE.Shape(); ws.moveTo(0, 0); ws.lineTo(14, 6); ws.lineTo(12, -1); ws.lineTo(9, 1); ws.lineTo(7, -3); ws.lineTo(4, -1); ws.lineTo(0, -3); const w = new THREE.Mesh(new THREE.ShapeGeometry(ws), new THREE.MeshBasicMaterial({ color: '#05050a', transparent: true, opacity: .8, side: THREE.DoubleSide, fog: false })); w.scale.x = sx; w.position.set(sx * 3, 25, 2); g.add(w); }
    g.userData.storm = true; }
  return g;
}
function palmLeaves() { const parts = []; for (let i = 0; i < 7; i++) { const b = new THREE.BoxGeometry(.35, .04, 2.2); b.translate(0, 0, 1.1); b.rotateX(.45); b.rotateY(i / 7 * Math.PI * 2); parts.push(b); } return mergeGeometries(parts); }
function cornGeo() { const parts = []; for (let i = 0; i < 5; i++) { const a = i / 5 * 6.28, c = new THREE.CylinderGeometry(.03, .04, 2.3, 5); c.translate(Math.cos(a) * .35, 1.15, Math.sin(a) * .35); parts.push(c); const l = new THREE.PlaneGeometry(.12, .9); l.rotateZ(.6); l.rotateY(a * 2); l.translate(Math.cos(a) * .35, 1.4, Math.sin(a) * .35); parts.push(l.toNonIndexed ? l : l); } return mergeGeometries(parts.map(p => p.index ? p.toNonIndexed() : p)); }
function rng(seed) { let s = seed % 2147483647 || 1; return () => ((s = s * 16807 % 2147483647) / 2147483647); }

const POST_VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const POST_FS = `
uniform sampler2D tDiffuse; uniform float uTime, uVig, uGrain, uGrey, uRed, uAb, uExp, uFade, uFlash; uniform vec2 uRes;
varying vec2 vUv;
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
vec3 aces(vec3 x){ x *= .6; return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14), 0., 1.); }
vec3 toSRGB(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1./2.4)) - .055, step(vec3(.0031308), c)); }
void main(){
  vec2 c = vUv - .5; float d2 = dot(c, c);
  vec2 off = c * d2 * uAb * .012;
  vec3 col = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
  col = aces(col * uExp);
  float l = dot(col, vec3(.299,.587,.114));
  col = mix(col, vec3(l) * vec3(1.02, 1., .96), uGrey);
  col = mix(col, col * vec3(1.5, .45, .45) + vec3(.10, 0., 0.), uRed);
  float v = smoothstep(.95, .2, length(c * vec2(1., 1.15)) * uVig); col *= mix(.18, 1., v);
  col = mix(col, vec3(1.), uFlash);
  col *= 1. - uFade;
  col = toSRGB(clamp(col, 0., 1.));
  vec2 gp = floor(vUv * uRes) + floor(fract(uTime * 7.13) * 97.);
  col += (hash(mod(gp, 1024.) * .731) - .5) * uGrain * (1.2 - l);
  gl_FragColor = vec4(clamp(col, 0., 1.), 1.);
}`;

export class World {
  constructor(canvas, opts = {}) {
    this.mobile = !!opts.mobile;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.outputColorSpace = THREE.LinearSRGBColorSpace; r.toneMapping = THREE.NoToneMapping;
    realSetup(r, this.mobile); // v1.5 PBR environment for monster skin/scale/fur materials
    const halfOK = r.extensions.has('EXT_color_buffer_half_float') || r.extensions.has('EXT_color_buffer_float');
    this.rt = new THREE.WebGLRenderTarget(4, 4, { type: halfOK ? THREE.HalfFloatType : THREE.UnsignedByteType, samples: this.mobile ? 0 : 4 });
    this.post = new THREE.ShaderMaterial({ vertexShader: POST_VS, fragmentShader: POST_FS, depthTest: false, depthWrite: false,
      uniforms: { tDiffuse: { value: this.rt.texture }, uTime: { value: 0 }, uVig: { value: 1 }, uGrain: { value: .06 }, uGrey: { value: 0 }, uRed: { value: 0 }, uAb: { value: .6 }, uExp: { value: 1.6 }, uFade: { value: 0 }, uFlash: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) } } });
    this.postScene = new THREE.Scene(); const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.post); q.frustumCulled = false; this.postScene.add(q);
    this.postCam = new THREE.Camera();
    this.camera = new THREE.PerspectiveCamera(50, 1, .3, 260);
    this.camPos = new THREE.Vector3(0, 20, 20); this.camLook = new THREE.Vector3();
    this.shake = 0;
    this.chars = new Map();
    this.fxList = [];
    this.raycaster = new THREE.Raycaster(); this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1);
    this.buildScene(); this.buildMenu(); this.buildFlight(); this.buildScare();
    this.resize();
  }

  resize() {
    const w = innerWidth, h = innerHeight, pr = Math.min(devicePixelRatio || 1, this.mobile ? 1.5 : 2);
    this.renderer.setPixelRatio(pr); this.renderer.setSize(w, h, false);
    this.rt.setSize(Math.floor(w * pr), Math.floor(h * pr));
    this.post.uniforms.uRes.value.set(w, h); FADE.uRes.value.set(w * pr, h * pr);
    for (const c of [this.camera, this.menuCam, this.flightCam, this.scareCam]) if (c) { c.aspect = w / h; c.fov = h > w ? 64 : 50; c.updateProjectionMatrix(); }
    this.portrait = h > w;
  }

  // ---------------- main scene ----------------
  buildScene() {
    const s = this.scene = new THREE.Scene();
    s.fog = new THREE.FogExp2('#111', .04); s.background = new THREE.Color('#05060a');
    this.hemi = new THREE.HemisphereLight('#445', '#111', .4); s.add(this.hemi);
    const moon = this.moon = new THREE.DirectionalLight('#9fb4ff', .4); moon.position.set(-20, 40, -10);
    if (!this.mobile) { moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048); Object.assign(moon.shadow.camera, { left: -32, right: 32, top: 32, bottom: -32, near: 1, far: 120 }); moon.shadow.bias = -.0006; moon.shadow.normalBias = .03; }
    s.add(moon, moon.target);
    // the local player's flashlight (with shadows) and a pool for other survivors
    const mk = (shadow) => { const l = new THREE.SpotLight('#fff1d6', 0, 34, .5, .45, 1.2); if (shadow) { l.castShadow = true; l.shadow.mapSize.set(this.mobile ? 512 : 1024, this.mobile ? 512 : 1024); l.shadow.camera.near = .3; l.shadow.bias = -.0004; l.shadow.normalBias = .02; } s.add(l, l.target); return l; };
    this.flash = mk(true);
    this.flashPool = [mk(false), mk(false), mk(false)];
    this.beams = [this.flash, ...this.flashPool].map(() => { const m = new THREE.Mesh(new THREE.ConeGeometry(5.2, 18, 24, 1, true), new THREE.MeshBasicMaterial({ color: '#fff0d0', map: beamTex(), transparent: true, opacity: .05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); m.geometry.translate(0, -9, 0); m.geometry.rotateX(-Math.PI / 2); m.renderOrder = 5; m.visible = false; s.add(m); return m; });
    this.lampPool = Array.from({ length: this.mobile ? 3 : 5 }, () => { const l = new THREE.PointLight('#ffc070', 0, 22, 1.4); s.add(l); return l; });
    this.selfLight = new THREE.PointLight('#ff3020', 0, 20, 1.2); s.add(this.selfLight);
    this.exSpot = new THREE.SpotLight('#cfffd8', 0, 60, .38, .5, .8); s.add(this.exSpot, this.exSpot.target);
    this.level = new THREE.Group(); s.add(this.level);
    this.dyn = new THREE.Group(); s.add(this.dyn);
    // (v1.3.1) the floating white dust motes and fog-wisp sprites were removed at Leo's request
    this.wisps = [];
    // extraction helicopter + beam
    this.exHeli = buildHelicopter('#6a6a2a'); this.exHeli.visible = false; s.add(this.exHeli);
    this.exBeam = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 6, 60, 24, 1, true), new THREE.MeshBasicMaterial({ color: '#7dffa0', map: beamTex(), transparent: true, opacity: .12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    this.exBeam.visible = false; s.add(this.exBeam);
    this.exRing = new THREE.Mesh(new THREE.RingGeometry(.92, 1, 64), new THREE.MeshBasicMaterial({ color: '#5dff8a', transparent: true, opacity: .7, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.exRing.rotation.x = -Math.PI / 2; this.exRing.visible = false; s.add(this.exRing);
    // traps + portal pools
    this.trapMeshes = [];
    this.portal = new THREE.Group(); this.portal.visible = false; s.add(this.portal);
    const pm = new THREE.Mesh(G.tor(1.5, .18), mat('#4a0010', { e: '#ff2030', ei: 2.5 })); pm.rotation.x = -Math.PI / 2; pm.position.y = .15; this.portal.add(pm);
    const pd = new THREE.Mesh(new THREE.CircleGeometry(1.45, 32), new THREE.MeshBasicMaterial({ color: '#200006', transparent: true, opacity: .9 })); pd.rotation.x = -Math.PI / 2; pd.position.y = .12; this.portal.add(pd);
    const pl = new THREE.PointLight('#ff2040', 6, 10, 1.5); pl.position.y = 1; this.portal.add(pl);
  }

  setMap(map) {
    this.map = map; this.theme = THEMES[map.theme] || THEMES['Foggy Woods'];
    const T = this.theme, L = this.level;
    L.traverse(o => { if (o.isMesh && o.userData.own) o.geometry.dispose(); });
    L.clear(); if (this.items) { for (const e of this.items.values()) this.scene.remove(e.g); this.items.clear(); } this.lamps = []; this.bushes = []; this.lobbyHeli = null; this.omens = new Map(); this.boats = new Map(); if (this.bio) { this.scene.remove(this.bio); this.bio = null; }
    for (const c of this.chars.values()) this.dyn.remove(c.obj); this.chars.clear();
    const s = this.scene; s.fog.color.set(T.fog); s.fog.density = T.dens; s.background.set(T.fog).multiplyScalar(.6);
    this.hemi.color.set(T.sky); this.hemi.groundColor.set(T.gnd); this.hemi.intensity = T.hemi; this.moon.intensity = T.moon; this.moon.color.set(T.moonC || '#9fb4ff');

    const R = rng(map.w * 7 + map.walls.length * 131 + map.trees.length * 17 + (map.bushes.length || 1));
    const own = m => { m.userData.own = true; m.receiveShadow = true; return m; };
    // ground (+ a wide apron beyond the walls)
    const gw = map.w * S, gh = map.h * S;
    const gm = new THREE.MeshStandardMaterial({ map: tex(T.ground, 1), bumpMap: tex(T.ground, 1, { bump: true }), bumpScale: 2, roughness: .95 });
    gm.map = gm.map.clone(); gm.map.repeat.set(gw / T.grep, gh / T.grep); gm.map.needsUpdate = true; gm.bumpMap = gm.bumpMap.clone(); gm.bumpMap.repeat.copy(gm.map.repeat); gm.bumpMap.needsUpdate = true;
    const ground = own(new THREE.Mesh(new THREE.PlaneGeometry(gw + 120, gh + 120), gm)); ground.rotation.x = -Math.PI / 2; ground.position.set(gw / 2, 0, gh / 2);
    gm.map.repeat.set((gw + 120) / T.grep, (gh + 120) / T.grep); gm.bumpMap.repeat.copy(gm.map.repeat); L.add(ground);
    if (T.ground2) { // dirt paths patches
      const dm = new THREE.MeshStandardMaterial({ map: tex(T.ground2, 3), roughness: 1, transparent: true, opacity: .85, alphaMap: softTex(), depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 });
      for (let i = 0; i < 26; i++) { const p = own(new THREE.Mesh(new THREE.PlaneGeometry(1, 1), dm)); p.rotation.x = -Math.PI / 2; const sz = 8 + R() * 16; p.scale.set(sz, sz * (.5 + R()), 1); p.position.set(R() * gw, .02, R() * gh); p.rotation.z = R() * 6; L.add(p); }
    }
    // walls
    const wallMat = fadeable(new THREE.MeshStandardMaterial({ map: tex(T.wall, 1), bumpMap: tex(T.wall, 1, { bump: true }), bumpScale: 3, roughness: .9 }));
    const houseMat = fadeable(new THREE.MeshStandardMaterial({ map: tex('wood', 1), bumpMap: tex('wood', 1, { bump: true }), bumpScale: 2, roughness: .85, color: '#d8c8b0' }));
    const facMat = fadeable(new THREE.MeshStandardMaterial({ map: tex('metal', 1), bumpMap: tex('metal', 1, { bump: true }), bumpScale: 2, roughness: .55, metalness: .5, color: '#a8b0b4' }));
    const outer = (w) => w.x <= 0 || w.y <= 0 || w.x + w.w >= map.w || w.y + w.h >= map.h;
    const stoneMat = fadeable(new THREE.MeshStandardMaterial({ map: tex('stone', 1), bumpMap: tex('stone', 1, { bump: true }), bumpScale: 3, roughness: .95, color: '#9a96a0' }));
    const storeMat = fadeable(new THREE.MeshStandardMaterial({ map: tex('brick', 1), bumpMap: tex('brick', 1, { bump: true }), bumpScale: 2, roughness: .8, color: '#e8d8c8' }));
    const fenceMat = fadeable(new THREE.MeshStandardMaterial({ map: tex('wood', 1), roughness: .9, color: '#8a6a4a' }));
    const winMats = new Map(), winMat = c => { if (!winMats.has(c)) winMats.set(c, new THREE.MeshStandardMaterial({ color: '#111', emissive: c === 'off' ? '#000' : c === 'flicker' ? '#ffd890' : c, emissiveIntensity: c === 'off' ? 0 : 1.6, roughness: .2 })); return winMats.get(c); };
    this.flickerWins = [];
    for (const w of map.walls) {
      const inB = (map.bld || []).find(b => w.x >= b.x - 1 && w.y >= b.y - 1 && w.x + w.w <= b.x + b.w + 1 && w.y + w.h <= b.y + b.h + 1);
      const isOuter = outer(w), two = inB && inB.floors > 1, store = inB && inB.type === 'store';
      const hgt = isOuter ? (map.theme === 'Helipad Lobby' ? 1.4 : 4.5) : w.f ? 1.25 : w.cs ? 7.5 : store ? 3.8 : two ? 6.2 : T.wallH; w._h = hgt;
      const sx = w.w * S, sz = w.h * S, g = boxUV(new THREE.BoxGeometry(sx, hgt, sz), sx, hgt, sz, T.wall === 'brick' ? 3 : 2.5);
      const m = own(new THREE.Mesh(g, w.f ? fenceMat : w.cs ? stoneMat : store ? storeMat : inB ? (inB.type === 'house' ? houseMat : facMat) : wallMat)); m.castShadow = true; m.position.set((w.x + w.w / 2) * S, hgt / 2, (w.y + w.h / 2) * S); L.add(m);
      if (!isOuter && T.wall !== 'wood' && !w.f && !w.cs && !inB) { const cap = own(new THREE.Mesh(boxUV(new THREE.BoxGeometry(sx + .1, .15, sz + .1), sx, .15, sz, 2), wallMat)); cap.position.set(m.position.x, hgt + .07, m.position.z); L.add(cap); }
      if (w.cs) { const long = sx > sz, n = Math.floor((long ? sx : sz) / 1.6); for (let i = 0; i < n; i++) { const mm = own(new THREE.Mesh(G.box(long ? .8 : sz + .1, .9, long ? sz + .1 : .8), stoneMat)); mm.position.set(long ? (w.x * S + .8 + i * 1.6) : m.position.x, hgt + .45, long ? m.position.z : (w.y * S + .8 + i * 1.6)); mm.castShadow = true; L.add(mm); } }
      // lit windows on the outside walls of houses (one or two storeys); every house has its own light colour
      if (inB && inB.type === 'house' && (w.h <= 26 || w.w <= 26)) { const long = sx > sz, len = long ? sx : sz, n = Math.floor(len / 3.2), c = inB.light || '#ffcf7a';
        const onEdge = long ? (Math.abs(w.y - inB.y) < 2 || Math.abs(w.y + w.h - inB.y - inB.h) < 2) : (Math.abs(w.x - inB.x) < 2 || Math.abs(w.x + w.w - inB.x - inB.w) < 2);
        if (onEdge && n > 0) for (let i = 0; i < n; i++) for (let fl = 0; fl < (two ? 2 : 1); fl++) { const wm = own(new THREE.Mesh(G.box(long ? 1.0 : sz + .06, 1.0, long ? sz + .06 : 1.0), winMat(c)));
          const off = (i + .5) * len / n - len / 2; wm.position.set(m.position.x + (long ? off : 0), 1.6 + fl * 2.9, m.position.z + (long ? 0 : off)); L.add(wm); if (c === 'flicker') this.flickerWins.push(wm); } }
    }
    // trees (instanced)
    const trees = map.trees.filter(t => !t.rk && !t.sl && !t.tw), nT = trees.length;
    this.buildSpecialTrees(map, own, R);
    if (nT) {
      const bark = fadeable(new THREE.MeshStandardMaterial({ map: tex('bark', 1), bumpMap: tex('bark', 1, { bump: true }), bumpScale: 3, roughness: 1 }));
      const trunk = own(new THREE.InstancedMesh(new THREE.CylinderGeometry(.6, 1, 1, 9), bark, nT)); trunk.castShadow = true;
      const dummy = new THREE.Object3D(), parts = [];
      const leafM = fadeable(new THREE.MeshStandardMaterial({ map: tex('leaves', 2), color: '#9ab08a', roughness: .95, flatShading: true }));
      const pineT = T.tree === 'pine' || T.tree === 'snowpine', roundT = T.tree === 'round' || T.tree === 'jungle';
      if (T.tree === 'snowpine') leafM.color.set('#e8f0f4');
      if (pineT) for (let k = 0; k < (T.dense ? 4 : 3); k++) parts.push(own(new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 9), leafM, nT)));
      else if (roundT) parts.push(own(new THREE.InstancedMesh(bushGeometry(), leafM, nT)));
      else if (T.tree === 'palm') { leafM.flatShading = false; parts.push(own(new THREE.InstancedMesh(palmLeaves(), leafM, nT))); }
      else for (let k = 0; k < 3; k++) parts.push(own(new THREE.InstancedMesh(new THREE.CylinderGeometry(.35, .6, 1, 6), bark, nT)));
      const col = new THREE.Color();
      trees.forEach((t, i) => {
        const r = t.r * S, h = T.tree === 'jungle' ? 8 + R() * 5 : T.tree === 'palm' ? 5.5 + R() * 2.5 : T.dense ? 6.5 + R() * 4.5 : pineT ? 5 + R() * 3 : T.tree === 'deadtall' ? 4.5 + R() * 2.5 : 3.5 + R() * 2, tr = r * .5, x = t.x * S, z = t.y * S, rot = R() * 6;
        dummy.position.set(x, h / 2, z); dummy.rotation.set(0, rot, (R() - .5) * .06); dummy.scale.set(tr, h, tr); dummy.updateMatrix(); trunk.setMatrixAt(i, dummy.matrix);
        if (T.tree === 'palm') { dummy.position.set(x, h, z); dummy.rotation.set(0, rot, 0); dummy.scale.setScalar(1.2 + r * .4); dummy.updateMatrix(); parts[0].setMatrixAt(i, dummy.matrix); col.setHSL(.26 + R() * .04, .45, .3 + R() * .1); parts[0].setColorAt(i, col); }
        else if (pineT) parts.forEach((p, k) => { const nk = parts.length, cr = r * (2.3 - k * (1.6 / nk)) * (T.dense ? .9 : 1), ch = (2.6 - k * .3) * (T.dense ? 1.15 : 1); dummy.position.set(x, h * .35 + k * (T.dense ? 1.6 : 1.5) + ch / 2, z); dummy.rotation.set(0, rot + k, 0); dummy.scale.set(cr, ch, cr); dummy.updateMatrix(); p.setMatrixAt(i, dummy.matrix); if (T.tree === 'snowpine') col.setHSL(.55, .12, .55 + R() * .2 + (k === parts.length - 1 ? .2 : 0)); else col.setHSL(.27 + R() * .05, .3, .3 + R() * .1); p.setColorAt(i, col); });
        else if (roundT) { const cr = r * (T.tree === 'jungle' ? 2.8 : 2.2); dummy.position.set(x, h + cr * .4, z); dummy.rotation.set(0, rot, 0); dummy.scale.set(cr, cr * .85, cr); dummy.updateMatrix(); parts[0].setMatrixAt(i, dummy.matrix); col.setHSL(T.tree === 'jungle' ? .3 : .25, T.tree === 'jungle' ? .45 : .3, .2 + R() * .1); parts[0].setColorAt(i, col); }
        else parts.forEach((p, k) => { const a = rot + k * 2.1, bl = 1.6 + R() * 1.4; dummy.position.set(x + Math.cos(a) * bl * .35, h * (.55 + k * .14), z + Math.sin(a) * bl * .35); dummy.rotation.set(Math.sin(a) * .9, 0, -Math.cos(a) * .9); dummy.scale.set(tr * .3, bl, tr * .3); dummy.updateMatrix(); p.setMatrixAt(i, dummy.matrix); });
      });
      L.add(trunk); parts.forEach(p => { p.castShadow = true; L.add(p); });
    }
    // bushes and crate piles (hiding spots)
    const crateM = fadeable(new THREE.MeshStandardMaterial({ map: tex('crate', 1), roughness: .85 }));
    const corn = map.bushes.filter(b => b.corn);
    if (corn.length) { const cm = own(new THREE.InstancedMesh(cornGeo(), new THREE.MeshStandardMaterial({ color: '#8a8a4a', map: tex('hay', 1), roughness: 1, side: THREE.DoubleSide }), corn.length)); const d0 = new THREE.Object3D();
      corn.forEach((b, i) => { d0.position.set(b.x * S, 0, b.y * S); d0.rotation.set(0, R() * 6, 0); d0.scale.set(b.r * S * .9, .9 + R() * .3, b.r * S * .9); d0.updateMatrix(); cm.setMatrixAt(i, d0.matrix); }); cm.castShadow = true; L.add(cm); }
    for (const b of map.bushes) {
      if (b.corn) continue;
      const r = b.r * S, x = b.x * S, z = b.y * S;
      if (b.inside) {
        const g = new THREE.Group(); g.position.set(x, 0, z); L.add(g);
        const sz = r * 1.05; [[-.5, 0, -.45, 0], [.55, 0, -.3, .3], [0, 0, .55, -.2], [0, 1, -.1, .5]].forEach(([dx, lvl, dz, ry]) => { const c = own(new THREE.Mesh(G.box(sz, sz, sz), crateM)); c.position.set(dx * sz, sz / 2 + lvl * sz, dz * sz); c.rotation.y = ry; c.castShadow = true; g.add(c); });
      } else {
        const m = own(new THREE.Mesh(bushGeometry(), fadeable(new THREE.MeshStandardMaterial({ map: tex('leaves', 2), color: new THREE.Color().setHSL(.26 + R() * .06, .4, .32 + R() * .1), roughness: 1, flatShading: true }))));
        m.userData.own = false; m.scale.set(r * 1.1, r * .85, r * 1.1); m.position.set(x, r * .45, z); m.rotation.y = R() * 6; m.castShadow = true; L.add(m); this.bushes.push({ m, b });
      }
    }
    // vents
    const ventM = new THREE.MeshStandardMaterial({ map: tex('vent', 1), metalness: .6, roughness: .5 });
    for (const v of map.vents) { const m = own(new THREE.Mesh(G.box(2.2, .12, 1.6), ventM)); m.position.set(v.x * S, .06, v.y * S); L.add(m); }
    // scattered rocks + grass tufts for detail
    const free = (x, y, pad) => !map.walls.some(w => x > w.x - pad && x < w.x + w.w + pad && y > w.y - pad && y < w.y + w.h + pad) && !map.trees.some(t => Math.hypot(t.x - x, t.y - y) < t.r + pad);
    const rockM = new THREE.MeshStandardMaterial({ color: '#56544e', map: tex('concrete', 1), roughness: .95, flatShading: true });
    const nR = Math.round(map.w * map.h / 90000), rocks = own(new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), rockM, nR)); const d = new THREE.Object3D(); let ri = 0;
    for (let k = 0; k < nR * 3 && ri < nR; k++) { const x = R() * map.w, y = R() * map.h; if (!free(x, y, 20)) continue; const sc = .15 + R() * .5; d.position.set(x * S, sc * .3, y * S); d.rotation.set(R() * 3, R() * 3, R() * 3); d.scale.set(sc * (1 + R()), sc, sc); d.updateMatrix(); rocks.setMatrixAt(ri++, d.matrix); }
    rocks.count = ri; rocks.castShadow = true; L.add(rocks);
    if (T.ground === 'grass' || T.ground === 'drygrass') {
      const nG = this.mobile ? 900 : 2600, tm = new THREE.MeshStandardMaterial({ map: grassTuftTex(), alphaTest: .5, side: THREE.DoubleSide, roughness: 1, color: T.ground === 'drygrass' ? '#b0a070' : '#ffffff' });
      const tg = new THREE.PlaneGeometry(1, 1); tg.translate(0, .5, 0); const tufts = own(new THREE.InstancedMesh(tg, tm, nG)); let gi = 0;
      for (let k = 0; k < nG * 2 && gi < nG; k++) { const x = R() * map.w, y = R() * map.h; if (!free(x, y, 8)) continue; const sc = .5 + R() * .7; d.position.set(x * S, 0, y * S); d.rotation.set(0, R() * 3, 0); d.scale.set(sc, sc * .8, sc); d.updateMatrix(); tufts.setMatrixAt(gi++, d.matrix); }
      tufts.count = gi; L.add(tufts);
    }
    // power lines: lattice towers + sagging cables
    this.buildPowerLines(map, own);
    // undergrowth: ferns, fallen logs, stumps
    if (T.ferns) {
      const fg = new THREE.PlaneGeometry(1, 1); fg.translate(0, .5, 0); fg.rotateX(-.5);
      const fm = new THREE.MeshStandardMaterial({ map: fernTex(), alphaTest: .45, side: THREE.DoubleSide, roughness: 1 });
      const nF = this.mobile ? 500 : 1400, ferns = own(new THREE.InstancedMesh(fg, fm, nF)); let fi = 0; const col = new THREE.Color();
      for (let k = 0; k < nF * 3 && fi < nF; k++) { const x = R() * map.w, y = R() * map.h; if (!free(x, y, 6)) continue; const sc = .7 + R() * .9, ry = R() * 6.28;
        for (let q = 0; q < 3 && fi < nF; q++) { d.position.set(x * S, 0, y * S); d.rotation.set(0, ry + q * 2.1, 0); d.scale.set(sc, sc * .8, sc); d.updateMatrix(); ferns.setMatrixAt(fi, d.matrix); col.setHSL(.24 + R() * .06, .45, .35 + R() * .15); ferns.setColorAt(fi++, col); } }
      ferns.count = fi; L.add(ferns);
      const barkM = new THREE.MeshStandardMaterial({ map: tex('bark', 1), bumpMap: tex('bark', 1, { bump: true }), bumpScale: 3, roughness: 1, color: '#8a7a6a' });
      const logs = own(new THREE.InstancedMesh(new THREE.CylinderGeometry(.28, .32, 1, 10), barkM, 60)); let li = 0;
      for (let k = 0; k < 400 && li < 60; k++) { const x = R() * map.w, y = R() * map.h; if (!free(x, y, 30)) continue; const len = 2.5 + R() * 3; d.position.set(x * S, .25, y * S); d.rotation.set(0, R() * 6, Math.PI / 2); d.scale.set(1, len, 1); d.updateMatrix(); logs.setMatrixAt(li++, d.matrix); }
      logs.count = li; logs.castShadow = true; L.add(logs);
      const stumps = own(new THREE.InstancedMesh(new THREE.CylinderGeometry(.35, .45, .5, 10), barkM, 50)); let si = 0;
      for (let k = 0; k < 400 && si < 50; k++) { const x = R() * map.w, y = R() * map.h; if (!free(x, y, 16)) continue; d.position.set(x * S, .25, y * S); d.rotation.set(0, R() * 6, 0); d.scale.setScalar(.7 + R() * .6); d.updateMatrix(); stumps.setMatrixAt(si++, d.matrix); }
      stumps.count = si; stumps.castShadow = true; L.add(stumps);
      // rolling hills beyond the fence so the forest feels endless
      const hg = new THREE.PlaneGeometry(gw + 240, gh + 240, 60, 60), hp = hg.attributes.position;
      for (let i = 0; i < hp.count; i++) { const x = hp.getX(i) + gw / 2, z = -hp.getY(i) + gh / 2, out = Math.max(0, -x, x - gw, -z, z - gh); hp.setZ(i, out > 2 ? Math.min(out, 40) * .35 * (1 + .5 * Math.sin(x * .07) * Math.cos(z * .05)) : -.2); }
      hg.computeVertexNormals(); const hills = own(new THREE.Mesh(hg, gm)); hills.rotation.x = -Math.PI / 2; hills.position.set(gw / 2, -.05, gh / 2); L.add(hills);
      const farT = own(new THREE.InstancedMesh(new THREE.ConeGeometry(2.2, 9, 7), new THREE.MeshStandardMaterial({ color: '#1e3020', roughness: 1, flatShading: true }), 500)); let ti = 0;
      for (let k = 0; k < 3000 && ti < 500; k++) { const x = -60 + R() * (gw + 120), z = -60 + R() * (gh + 120), out = Math.max(-x, x - gw, -z, z - gh); if (out < 4) continue; d.position.set(x, 4.5 + Math.min(out, 40) * .35, z); d.rotation.set(0, R() * 6, 0); d.scale.setScalar(.8 + R() * .7); d.updateMatrix(); farT.setMatrixAt(ti++, d.matrix); }
      farT.count = ti; L.add(farT);
    }
    // building floors (wood for houses, concrete for facilities) and furniture
    for (const b of map.bld || []) {
      const fm = new THREE.MeshStandardMaterial({ map: tex(b.type === 'house' ? 'wood' : 'concrete', 1).clone(), roughness: b.type === 'house' ? .7 : .9, color: b.type === 'house' ? '#b08a64' : b.kind === 'lab' ? '#c8ccd0' : '#9a9a94' });
      fm.map.repeat.set(b.w * S / 2.5, b.h * S / 2.5); fm.map.needsUpdate = true;
      const f = own(new THREE.Mesh(new THREE.PlaneGeometry(b.w * S, b.h * S), fm)); f.rotation.x = -Math.PI / 2; f.position.set((b.x + b.w / 2) * S, .025, (b.y + b.h / 2) * S); L.add(f);
      if (b.type === 'facility') { const sign = textSprite(b.kind.toUpperCase(), b.kind === 'lab' ? '#9ad8ff' : '#ffd27a', 30); sign.material.depthTest = true; sign.position.set((b.x + b.w / 2) * S, 4.2, b.y * S); sign.scale.set(3.5, .65, 1); L.add(sign); }
    }
    this.spinners = []; this.animProps = [];
    const DRESS = ['3,1,2,,,tophat,cape,knight', '1,3,0,,,witch,none,pajamas', '4,0,1,,,halo,wings,astronaut', '2,2,3,,,viking,chain,hazmat', '0,4,2,,,pirate,bandana,ninja'];
    let dressN = 0;
    for (const pr of map.props || []) { const o = buildProp(pr.k, pr.w * S, pr.h * S, pr); o.position.set((pr.x + pr.w / 2) * S, 0, (pr.y + pr.h / 2) * S); o.rotation.y = pr.a || 0; L.add(o);
      if (o.userData.statue) { const st = buildMonster(o.userData.statue); const h = monsterHeight(o.userData.statue); st.scale.setScalar(1.5 / h); st.position.y = .97; applySkin(st, ['golden', 'neon', 'lava', 'abyss'][this.spinners.length % 4]); o.add(st); this.spinners.push(st); }
      if (o.userData.spin || o.userData.tiles || o.userData.pet) this.animProps.push(o);
      if (o.userData.dress) { const sv = buildSurvivor('#888', DRESS[dressN++ % DRESS.length]); sv.position.y = .05; o.add(sv); }
      if (o.userData.light && o.userData.lightPos) { o.updateMatrixWorld(true); const lp = o.userData.lightPos.clone().applyMatrix4(o.matrixWorld); this.lamps.push({ x: (pr.x + pr.w / 2), y: (pr.y + pr.h / 2), obj: { userData: { glow: { material: {} }, bulb: { material: {} } } }, lp, flick: R() < .3, broken: R() < .1, phase: R() * 100 }); }
    }
    // v1.4.1 lobby shopping street: per-store interior lights, a floating store name above each roof, coloured counter rugs and an asphalt street
    if (map.road) { const rd = own(new THREE.Mesh(new THREE.PlaneGeometry(map.road.w * S, map.road.h * S), new THREE.MeshStandardMaterial({ color: '#1c1c20', roughness: .85 }))); rd.rotation.x = -Math.PI / 2; rd.position.set((map.road.x + map.road.w / 2) * S, .02, (map.road.y + map.road.h / 2) * S); rd.receiveShadow = true; L.add(rd);
      for (let x = map.road.x + 40; x < map.road.x + map.road.w - 60; x += 140) { const ln = new THREE.Mesh(new THREE.PlaneGeometry(3, .3), new THREE.MeshBasicMaterial({ color: '#e8d06a' })); ln.rotation.x = -Math.PI / 2; ln.position.set(x * S, .03, (map.road.y + map.road.h / 2) * S); L.add(ln); } }
    for (const b of map.bld || []) if (b.type === 'store') { const many = !!b.store;
      for (let i = 0; i < (many ? 2 : 3); i++) { const l = new THREE.PointLight(many ? b.c : '#ffe2b0', many ? 30 : 22, many ? 32 : 26, 1.1); if (many) l.color.lerp(new THREE.Color('#ffe8c8'), .6); l.position.set((b.x + b.w * (many ? (i + .5) / 2 : .62)) * S, 3.2, (b.y + b.h * (many ? .5 : (i + .5) / 3)) * S); L.add(l); }
      const sg = textSprite(many ? b.name : '★ STORE ★', many ? b.c : '#ff4a4a', 46); sg.material.depthTest = true; if (many) sg.position.set((b.x + b.w / 2) * S, 6.4, (b.y + b.h / 2) * S); else sg.position.set(b.x * S - .2, 5.2, (b.y + b.h / 2) * S); sg.scale.set(many ? 14 : 9, many ? 2.4 : 1.7, 1); L.add(sg); }
    for (const z of (map.zones || [])) { const col = z.c || (z.k === 'shop' ? '#ffd27a' : z.k === 'mirror' ? '#9ad8ff' : '#ff9af0'); const zs = textSprite((z.ic ? z.ic + ' ' : '') + (z.c ? z.name : 'COUNTER'), col, 34); zs.material.depthTest = true; const bS = (map.bld || []).find(b => b.store === z.k), cy2 = bS ? (bS.north ? bS.y + 120 : bS.y + bS.h - 120) : z.y + z.h / 2; zs.position.set((z.x + z.w / 2) * S, 3.5, cy2 * S); zs.scale.set(z.c ? 3 : 5.5, z.c ? .56 : 1, 1); L.add(zs);
      const rug = own(new THREE.Mesh(new THREE.PlaneGeometry(z.w * S * .9, z.h * S * .85), new THREE.MeshStandardMaterial({ color: new THREE.Color(col).multiplyScalar(.22), roughness: .9 }))); rug.rotation.x = -Math.PI / 2; rug.position.set((z.x + z.w / 2) * S, .035, (z.y + z.h / 2) * S); L.add(rug); }
    // loot containers
    this.loot = new Map();
    for (const c of map.loot || []) { const o = c.kind === 'chest' ? buildChest() : buildBag(); o.position.set(c.x * S, 0, c.y * S); o.rotation.y = c.a || 0; L.add(o); this.loot.set(c.id, { o, c, open: false, t: 0 }); }
    // lamps
    for (let k = 0, placed = 0; k < 400 && placed < T.lamps; k++) {
      let x, y;
      if (map.heli) { const a = placed / T.lamps * Math.PI * 2; x = map.heli.x + Math.cos(a) * (map.heli.r + 120 + R() * 80); y = map.heli.y + Math.sin(a) * (map.heli.r + 120 + R() * 80); }
      else { x = 80 + R() * (map.w - 160); y = 80 + R() * (map.h - 160); }
      if (!free(x, y, 30) || this.lamps.some(l => Math.hypot(l.x - x, l.y - y) < 260)) continue;
      const lamp = buildLamp(); lamp.position.set(x * S, 0, y * S); lamp.rotation.y = R() * 6; L.add(lamp); lamp.updateMatrixWorld(true);
      const lp = lamp.userData.lightPos.clone().applyMatrix4(lamp.matrixWorld);
      this.lamps.push({ x, y, obj: lamp, lp, flick: R() < .45, broken: !map.heli && R() < .15, phase: R() * 100 }); placed++;
    }
    for (const l of this.lamps) if (l.broken) { l.obj.userData.glow.visible = false; l.obj.userData.bulb.material.emissiveIntensity = 0; }
    this.buildBiome(map, own, R, gm);
    // lobby helicopter + helipad
    if (map.heli) {
      const pad = own(new THREE.Mesh(new THREE.CircleGeometry(map.heli.r * S, 48), new THREE.MeshStandardMaterial({ map: tex('helipad', 1), roughness: .8 }))); pad.rotation.x = -Math.PI / 2; pad.position.set(map.heli.x * S, .03, map.heli.y * S); L.add(pad);
      const ring = own(new THREE.Mesh(new THREE.RingGeometry(map.heli.r * S - .25, map.heli.r * S, 64), new THREE.MeshBasicMaterial({ color: '#ffcc40', transparent: true, opacity: .8, blending: THREE.AdditiveBlending }))); ring.rotation.x = -Math.PI / 2; ring.position.set(map.heli.x * S, .05, map.heli.y * S); L.add(ring); this.padRing = ring;
      const h = buildHelicopter('#2d4a34'); h.position.set(map.heli.x * S, .03, (map.heli.y - 15) * S); h.rotation.y = Math.PI / 2; L.add(h); this.lobbyHeli = h;
    } else this.padRing = null;
    L.traverse(o => { if (o.isMesh && o.receiveShadow === false) o.receiveShadow = true; });
    // wisps colour
    this.wisps.forEach((w, i) => { w.visible = i < T.wisps; w.material.color.set(T.fog).lerp(new THREE.Color('#9aa'), .5); });
    this.renderer.shadowMap.needsUpdate = true;
    // streaming LOD: level pieces far from the camera are hidden (maps are several times bigger since v1.4)
    this.lod = []; this.lodT = 0; const tmpS = new THREE.Sphere();
    for (const o of L.children) { if (o.isInstancedMesh || o.isLight) continue; let r = 2;
      if (o.isMesh) { if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); tmpS.copy(o.geometry.boundingSphere); r = tmpS.radius * Math.max(o.scale.x, o.scale.y, o.scale.z); }
      else if (o.isGroup) r = 6; if (r > 45) continue; o.userData.lr = r; this.lod.push(o); }
  }
  buildSpecialTrees(map, own, R) {
    const L = this.level, snow = this.theme.snow, ocean = this.theme.ocean;
    const rockM = new THREE.MeshStandardMaterial({ color: ocean ? '#3a3c40' : '#6a6a70', map: tex('stone', 1), bumpMap: tex('stone', 1, { bump: true }), bumpScale: 3, roughness: .95, flatShading: true });
    const capM = new THREE.MeshStandardMaterial({ color: '#f4f8ff', roughness: .8, flatShading: true }), metal = new THREE.MeshStandardMaterial({ color: '#9aa0a4', map: tex('metal', 1), metalness: .6, roughness: .45 });
    const stone = fadeable(new THREE.MeshStandardMaterial({ map: tex('stone', 1), bumpMap: tex('stone', 1, { bump: true }), bumpScale: 3, roughness: .95, color: '#8a8690' })), roof = new THREE.MeshStandardMaterial({ color: '#4a1a1e', map: tex('roof', 1), roughness: .8 });
    for (const t of map.trees) { const x = t.x * S, z = t.y * S, r = t.r * S;
      if (t.rk) { const h = ocean ? 3 + R() * 5 : 1.2 + R() * 2.2; const m = own(new THREE.Mesh(new THREE.DodecahedronGeometry(1, 1), rockM)); m.scale.set(r * 1.1, h, r * 1.1); m.position.set(x, ocean ? h * .55 : h * .4, z); m.rotation.y = R() * 6; m.castShadow = true; L.add(m);
        if (snow) { const c = own(new THREE.Mesh(new THREE.DodecahedronGeometry(1, 1), capM)); c.scale.set(r * .9, h * .35, r * .9); c.position.set(x, h * .4 + h * .55, z); L.add(c); } }
      else if (t.sl) { const m = own(new THREE.Mesh(G.cyl(r, r, 10, 20), metal)); m.position.set(x, 5, z); m.castShadow = true; L.add(m); const d = own(new THREE.Mesh(new THREE.SphereGeometry(r, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), metal)); d.position.set(x, 10, z); L.add(d);
        for (let i = 0; i < 4; i++) { const b = own(new THREE.Mesh(G.cyl(r + .05, r + .05, .15, 20), new THREE.MeshStandardMaterial({ color: '#6a3a2a', roughness: .7 }))); b.position.set(x, 1.5 + i * 2.4, z); L.add(b); } }
      else if (t.tw) { const m = own(new THREE.Mesh(G.cyl(r, r * 1.08, 11, 20), stone)); m.position.set(x, 5.5, z); m.castShadow = true; L.add(m);
        for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, mm = own(new THREE.Mesh(G.box(.9, 1, .9), stone)); mm.position.set(x + Math.cos(a) * r * .9, 11.5, z + Math.sin(a) * r * .9); mm.rotation.y = -a; L.add(mm); }
        const c = own(new THREE.Mesh(G.cone(r * 1.15, 5, 20), roof)); c.position.set(x, 14.5, z); L.add(c); const w = own(new THREE.Mesh(G.box(.8, 1.4, .3), new THREE.MeshStandardMaterial({ color: '#111', emissive: '#ff7a3a', emissiveIntensity: 1.6 }))); w.position.set(x, 8, z + r); L.add(w); }
    }
  }
  buildBiome(map, own, R, gm) {
    const T = this.theme, L = this.level, gw = map.w * S, gh = map.h * S, bio = this.bio = new THREE.Group(); this.scene.add(bio); this.waterTex = null; this.stormWall = null;
    const waterMat = (c, rep) => { const t = tex('water', 1).clone(); t.repeat.set(rep, rep); t.needsUpdate = true; this.waterTex = t; return new THREE.MeshStandardMaterial({ color: c, map: t, roughness: .12, metalness: .35, emissive: '#04121a', emissiveIntensity: .4 }); };
    if (map.islands) { // open sea + sandy islands + the storm wall beyond the calm zone
      gm.color.set('#0a1a22');
      const wm = waterMat('#2a5a6a', (gw + 600) / 6), water = new THREE.Mesh(new THREE.PlaneGeometry(gw + 600, gh + 600, 1, 1), wm); water.rotation.x = -Math.PI / 2; water.position.set(gw / 2, .06, gh / 2); water.receiveShadow = true; bio.add(water);
      const sand = new THREE.MeshStandardMaterial({ map: tex('sand', 1).clone(), roughness: 1 }); sand.map.repeat.set(8, 8); sand.map.needsUpdate = true; const wet = new THREE.MeshStandardMaterial({ color: '#8a7a5a', roughness: .4 });
      for (const i of map.islands) { const r = i.r * S, beach = own(new THREE.Mesh(new THREE.CylinderGeometry(r + 1.2, r + 3, .3, 48), wet)); beach.position.set(i.x * S, -.02, i.y * S); L.add(beach);
        const top = own(new THREE.Mesh(new THREE.CylinderGeometry(r, r + 1, .3, 48), sand)); top.position.set(i.x * S, .0, i.y * S); L.add(top); }
      const cx = gw / 2, cz = gh / 2, sr = map.safe * S;
      const sw = new THREE.Mesh(new THREE.CylinderGeometry(sr, sr, 90, 96, 1, true), new THREE.MeshBasicMaterial({ color: '#1c2630', map: beamTex(), transparent: true, opacity: .55, side: THREE.DoubleSide, depthWrite: false })); sw.position.set(cx, 40, cz); bio.add(sw); this.stormWall = sw;
      const ring = new THREE.Mesh(new THREE.RingGeometry(sr - .6, sr + .6, 128), new THREE.MeshBasicMaterial({ color: '#ff5a3a', transparent: true, opacity: .5, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.set(cx, .2, cz); bio.add(ring);
      // floating danger buoys with warning signs along the storm line
      for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2, b = new THREE.Group(); b.position.set(cx + Math.cos(a) * (sr - 2), 0, cz + Math.sin(a) * (sr - 2)); const bm = new THREE.Mesh(G.cyl(.35, .45, 1.2, 10), mat('#e83a1a', { r: .5 })); bm.position.y = .4; b.add(bm);
        const sg = textSprite('⚠ STORM — TURN BACK', '#ffd23a', 30); sg.material.depthTest = true; sg.position.y = 2.2; sg.scale.set(4, .75, 1); b.add(sg); const lt = new THREE.Mesh(G.sph(.12, 8, 6), mat('#ff2a1a', { e: '#ff2a1a', ei: 3 })); lt.position.y = 1.1; b.add(lt); bio.add(b); }
    }
    if (map.pools) { const pm = waterMat('#1a3020', 2), reedM = new THREE.MeshStandardMaterial({ color: '#4a5a2a', roughness: 1 });
      for (const o of map.pools) { const r = o.r * S, w = own(new THREE.Mesh(new THREE.CircleGeometry(r, 40), pm)); w.rotation.x = -Math.PI / 2; w.position.set(o.x * S, .05, o.y * S); L.add(w);
        const reeds = own(new THREE.InstancedMesh(new THREE.CylinderGeometry(.02, .03, 1.6, 4), reedM, 60)); const d = new THREE.Object3D(); for (let i = 0; i < 60; i++) { const a = R() * 6.28, rr = r * (.85 + R() * .25); d.position.set(o.x * S + Math.cos(a) * rr, .8, o.y * S + Math.sin(a) * rr); d.rotation.set((R() - .5) * .3, 0, (R() - .5) * .3); d.scale.set(1, .6 + R() * .8, 1); d.updateMatrix(); reeds.setMatrixAt(i, d.matrix); } L.add(reeds);
        for (let i = 0; i < 8; i++) { const lp = own(new THREE.Mesh(new THREE.CircleGeometry(.4 + R() * .3, 10, .3, 5.8), new THREE.MeshStandardMaterial({ color: '#3a6a2a', roughness: .8 }))); lp.rotation.x = -Math.PI / 2; const a = R() * 6.28, rr = R() * r * .8; lp.position.set(o.x * S + Math.cos(a) * rr, .07, o.y * S + Math.sin(a) * rr); L.add(lp); } } }
    if (map.streets) { const asp = new THREE.MeshStandardMaterial({ map: tex('asphalt', 1).clone(), roughness: .9 }); asp.map.repeat.set(gw / 6, 2); asp.map.needsUpdate = true; const side = new THREE.MeshStandardMaterial({ map: tex('concrete', 1).clone(), roughness: .9 }); side.map.repeat.set(gw / 3, 1); side.map.needsUpdate = true;
      for (const sy of map.streets) { const r = new THREE.Mesh(new THREE.PlaneGeometry(gw, 7), asp); r.rotation.x = -Math.PI / 2; r.position.set(gw / 2, .03, sy * S); r.receiveShadow = true; bio.add(r);
        for (const o of [-1, 1]) { const sw = new THREE.Mesh(new THREE.BoxGeometry(gw, .15, 1.6), side); sw.position.set(gw / 2, .07, sy * S + o * 4.3); sw.receiveShadow = true; bio.add(sw); }
        const dash = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.6, .14), new THREE.MeshBasicMaterial({ color: '#d8c860' }), Math.floor(gw / 4)); const d = new THREE.Object3D(); for (let i = 0; i < dash.count; i++) { d.position.set(i * 4 + 1, .04, sy * S); d.rotation.set(-Math.PI / 2, 0, 0); d.updateMatrix(); dash.setMatrixAt(i, d.matrix); } bio.add(dash); } }
    // every house glows with its own light; the closest join the real light pool
    for (const b of map.bld || []) if (b.type === 'house' && b.light && b.light !== 'off') this.lamps.push({ x: b.x + b.w / 2, y: b.y + b.h / 2, obj: { userData: { glow: { material: {} }, bulb: { material: {} } } }, lp: new THREE.Vector3((b.x + b.w / 2) * S, 2.4, (b.y + b.h / 2) * S), flick: b.light === 'flicker', broken: false, phase: R() * 100, col: b.light === 'flicker' ? '#ffd890' : b.light });
    if (T.snow) { // snow-capped mountains on the horizon
      const mm = new THREE.MeshStandardMaterial({ color: '#c8d4e4', roughness: 1, flatShading: true }); for (let k = 0; k < 40; k++) { const a = k / 40 * Math.PI * 2, d = Math.max(gw, gh) * .75 + 40 + R() * 40, h = 40 + R() * 50, m = new THREE.Mesh(new THREE.ConeGeometry(30 + R() * 25, h, 7), mm); m.position.set(gw / 2 + Math.cos(a) * d, h / 2 - 2, gh / 2 + Math.sin(a) * d); bio.add(m); } }
    if (map.theme === 'Vampire Castle') { const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('#ff3a2a'), fog: false, transparent: true, depthWrite: false })); moon.scale.setScalar(60); moon.position.set(gw / 2 - 120, 90, -160); bio.add(moon); }
    // weather: rain streaks (ocean storm, jungle) or falling snow, always around the camera
    this.weather = null;
    if (T.rain || T.snow) { const n = this.mobile ? 1200 : 3000, pos = new Float32Array(n * (T.snow ? 3 : 6)); for (let i = 0; i < n; i++) { const x = (Math.random() - .5) * 70, y = Math.random() * 30, z = (Math.random() - .5) * 70; if (T.snow) pos.set([x, y, z], i * 3); else pos.set([x, y, z, x + .1, y + .9, z], i * 6); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const w = T.snow ? new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffffff', size: .14, map: softTex(), transparent: true, opacity: .85, depthWrite: false })) : new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: '#9ab0c0', transparent: true, opacity: T.rain * .35, depthWrite: false }));
      w.frustumCulled = false; bio.add(w); this.weather = { m: w, snow: !!T.snow, n }; }
    this.nextBolt = 3;
  }

  buildPowerLines(map, own) {
    const poles = map.poles || [], L = this.level; if (!poles.length) return;
    const { segs, attach } = towerBeams(15), steel = fadeable(new THREE.MeshStandardMaterial({ color: '#8a9096', map: tex('metal', 1), metalness: .75, roughness: .45 }));
    const beams = own(new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), steel, segs.length * poles.length)); beams.castShadow = true;
    const ins = own(new THREE.InstancedMesh(new THREE.CylinderGeometry(.09, .09, 1.2, 8), new THREE.MeshStandardMaterial({ color: '#5a6a7a', roughness: .3, metalness: .2 }), attach.length * poles.length));
    const d = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0), tmp = new THREE.Vector3(); let bi = 0, ii = 0;
    const towerPts = new Map();
    for (const p of poles) {
      const root = new THREE.Object3D(); root.position.set(p.x * S, 0, p.y * S); root.rotation.y = -(p.a || 0) - Math.PI / 2; root.updateMatrixWorld(true); // local X spans across the line
      for (const [a, b, th] of segs) {
        const A = a.clone().applyMatrix4(root.matrixWorld), Bv = b.clone().applyMatrix4(root.matrixWorld), len = A.distanceTo(Bv);
        d.position.copy(A).add(Bv).multiplyScalar(.5); d.quaternion.setFromUnitVectors(up, tmp.copy(Bv).sub(A).normalize()); d.scale.set(th, len, th); d.updateMatrix(); beams.setMatrixAt(bi++, d.matrix);
      }
      const pts = attach.map((a, k) => { const w = a.clone().applyMatrix4(root.matrixWorld); if (k < attach.length - 1) { d.position.copy(w).add(new THREE.Vector3(0, .65, 0)); d.quaternion.identity(); d.scale.set(1, 1, 1); d.updateMatrix(); ins.setMatrixAt(ii++, d.matrix); } return w; });
      towerPts.set(p.x + ',' + p.y, pts);
      // concrete footings
      for (const [fx, fz] of [[-2.2, -2.2], [2.2, -2.2], [2.2, 2.2], [-2.2, 2.2]]) { const f = (new THREE.Mesh(G.box(.7, .4, .7), new THREE.MeshStandardMaterial({ map: tex('concrete', 1), roughness: .95 }))); f.position.set(fx, .2, fz).applyMatrix4(root.matrixWorld); L.add(f); }
    }
    beams.count = bi; ins.count = ii; L.add(beams, ins);
    // sagging cables between consecutive towers (catenary approximation)
    const wireM = new THREE.MeshStandardMaterial({ color: '#1a1a1a', metalness: .6, roughness: .5 }), geos = [];
    for (const line of map.lines || []) for (let i = 1; i < line.length; i++) {
      const A = towerPts.get(line[i - 1].x + ',' + line[i - 1].y), Bp = towerPts.get(line[i].x + ',' + line[i].y); if (!A || !Bp) continue;
      for (let k = 0; k < A.length; k++) {
        const a = A[k], b = Bp[k], sag = k === A.length - 1 ? 1.4 : 2.4, pts = [];
        for (let j = 0; j <= 20; j++) { const t = j / 20; pts.push(new THREE.Vector3().lerpVectors(a, b, t).add(new THREE.Vector3(0, -sag * 4 * t * (1 - t), 0))); }
        geos.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, k === A.length - 1 ? .03 : .045, 5, false));
      }
    }
    for (const g of geos) { const m = own(new THREE.Mesh(g, wireM)); m.castShadow = true; L.add(m); }
    // a few warning signs on tower legs
    this.towerCount = poles.length;
  }

  // ---------------- phase 2 world: boats, sea omens, weather, storm, lightning, streaming LOD ----------------
  worldTick(dt, t, snap, md, mp, playing) {
    const px = md.dx * S, pz = md.dy * S, T = this.theme;
    // streaming LOD
    if ((this.lodT -= dt) <= 0 && this.lod) { this.lodT = .25; const R0 = this.map.theme === 'Helipad Lobby' ? 1e9 : this.map.islands ? 150 : 115;
      for (const o of this.lod) { const dx = o.position.x - px, dz = o.position.z - pz, rr = R0 + o.userData.lr; o.visible = dx * dx + dz * dz < rr * rr; } }
    if (this.waterTex) { this.waterTex.offset.x = t * .012; this.waterTex.offset.y = Math.sin(t * .2) * .03; }
    if (this.spinners) for (const s2 of this.spinners) s2.rotation.y = t * .6;
    if (this.animProps) for (const o of this.animProps) { const u = o.userData;
      if (u.spin) { o.children.forEach(c => {}); o.position.y = .15 + Math.sin(t * 2 + o.position.x) * .12; o.rotation.y = (o.userData.a0 ??= o.rotation.y) + t * .8; }
      if (u.tiles) u.tiles.forEach((m, i) => { m.material.emissiveIntensity = .3 + 1.4 * Math.max(0, Math.sin(t * 4 + i * 1.7)); });
      if (u.pet) { u.pet.position.y = .3 + Math.abs(Math.sin(t * 3 + o.position.x)) * .08; u.pet.rotation.y = Math.sin(t * .7) * .8; } }
    if (this.flickerWins) for (const w of this.flickerWins) w.material.emissiveIntensity = Math.sin(t * 11 + w.id) + Math.sin(t * 6.3 + w.id * 2) > 1.2 ? .1 : 1.6;
    // boats
    const bts = snap.bt || [], seenB = new Set();
    for (const b of bts) { const [id, x, y, a, ship] = b; seenB.add(id); let m = this.boats.get(id);
      if (!m) { m = buildBoat(ship); this.dyn.add(m); this.boats.set(id, m); m.userData.p = W3(x, y); }
      m.userData.p.lerp(W3(x, y), Math.min(1, dt * 10)); m.position.set(m.userData.p.x, -.35 + Math.sin(t * 1.6 + id) * .12, m.userData.p.z);
      m.rotation.set(Math.sin(t * 1.3 + id) * .05, angLerp(m.rotation.y, Math.atan2(Math.cos(a), Math.sin(a)), Math.min(1, dt * 6)), Math.sin(t * 1.1 + id * 2) * .07);
      m.visible = Math.hypot(x - md.dx, y - md.dy) < 3600; }
    for (const [id, m] of this.boats) if (!seenB.has(id)) { this.dyn.remove(m); this.boats.delete(id); }
    // telltale signs of submerged sea monsters
    const oms = snap.om || [], seenO = new Set();
    for (const [x, y, mt, a] of oms) { seenO.add(mt); let g = this.omens.get(mt);
      if (!g) { g = buildOmen(mt); this.dyn.add(g); this.omens.set(mt, g); g.userData.p = W3(x, y); g.userData.born = t; }
      g.userData.p.lerp(W3(x, y), Math.min(1, dt * 4)); const age = t - g.userData.born, up = Math.min(1, age / 1.5);
      g.position.set(g.userData.p.x, 0, g.userData.p.z); g.rotation.y = Math.atan2(Math.cos(a), Math.sin(a));
      for (const [n, bend, i] of g.userData.wig) n.rotation.x = bend + Math.sin(t * 2.2 - i * .6) * .22;
      if (g.userData.flick) g.userData.flick.rotation.x = Math.sin(t * 3) * .7 - .3;
      if (mt === 'nessie') g.position.y = -4 + up * 4 + Math.sin(t * .8) * .2;
      else if (mt === 'kraken' || mt === 'leviathan') g.position.y = -2 + up * 2 + Math.sin(t * 1.2) * .25;
      else if (mt === 'megalodon') g.position.y = Math.sin(t * 2) * .08;
      else if (mt === 'cthulhu') { g.position.set(px, 0, pz - 30); g.rotation.y = 0; }
      if (g.userData.wake && Math.random() < dt * 8) this.addFx({ k: 'splash', x: x - Math.cos(a) * 20, y: y - Math.sin(a) * 20, c: '#cfe8f0' }); }
    for (const [mt, g] of this.omens) if (!seenO.has(mt)) { this.dyn.remove(g); this.omens.delete(mt); }
    // storm: past the calm radius the sky darkens, the fog closes in and lightning strikes
    let storm = oms.some(o => o[2] === 'cthulhu') ? 1 : 0;
    if (this.map.islands && this.map.safe) { const dd = Math.hypot(md.dx - this.map.w / 2, md.dy - this.map.h / 2); storm = Math.max(storm, Math.min(1, Math.max(0, (dd - this.map.safe * .85) / (this.map.safe * .25)))); }
    this.storm = lerp(this.storm || 0, storm, Math.min(1, dt * 2));
    if (this.storm > .02) { this.scene.fog.density *= 1 + this.storm * 1.6; this.hemi.intensity *= 1 - this.storm * .4; }
    if (mp.st.fog) this.scene.fog.density *= 2.8; if (mp.st.snow) this.scene.fog.density *= 1.7;
    if (this.stormWall) this.stormWall.material.opacity = .4 + .2 * Math.sin(t * .7);
    if ((T.rain || this.storm > .3) && (this.nextBolt -= dt * (.4 + this.storm * 1.6)) <= 0) { this.nextBolt = 4 + Math.random() * 6; this.flashT = .35; }
    if (this.flashT > 0) { this.flashT -= dt; const f = this.flashT > .25 || (this.flashT < .15 && this.flashT > .08) ? 1 : 0; this.hemi.intensity += f * 2.5; }
    // weather follows the camera
    const w = this.weather; if (w) { const pos = w.m.geometry.attributes.position, arr = pos.array, fall = w.snow ? 1.6 : 26, wind = w.snow ? Math.sin(t * .4) * .8 : 3 + this.storm * 8;
      for (let i = 0; i < w.n; i++) { const st2 = w.snow ? 3 : 6; let y = arr[i * st2 + 1] - fall * dt; let x = arr[i * st2] + wind * dt * .3;
        if (y < 0) { y += 30; x = px + (Math.random() - .5) * 70; arr[i * st2 + 2] = pz + (Math.random() - .5) * 70; }
        if (Math.abs(x - px) > 36) x = px + (Math.random() - .5) * 70; if (Math.abs(arr[i * st2 + 2] - pz) > 36) arr[i * st2 + 2] = pz + (Math.random() - .5) * 70;
        arr[i * st2] = x; arr[i * st2 + 1] = y; if (!w.snow) { arr[i * 6 + 3] = x + .06 + wind * .02; arr[i * 6 + 4] = y + .9; arr[i * 6 + 5] = arr[i * 6 + 2]; } }
      pos.needsUpdate = true; w.m.material.opacity = w.snow ? .85 : Math.min(.7, (T.rain || 0) * .35 + this.storm * .35); }
  }

  // ---------------- characters ----------------
  charFor(p, state) {
    const kind = p.role === 'monster' && state !== 'lobby' ? p.mt + ':' + (p.sk || 'classic') + ':' + (p.fm || 0) : 'survivor:' + p.c + ':' + (p.lk || '');
    let c = this.chars.get(p.id);
    if (c && c.kind !== kind) { this.dropChar(c); c = null; }
    if (!c) {
      const obj = kind.startsWith('survivor') ? buildSurvivor(p.c, p.lk) : buildMonster(modelKey(p.mt, p.fm)); if (!kind.startsWith('survivor') && p.sk) applySkin(obj, p.sk);
      obj.userData.sea = SEA.has(p.mt); const surv = kind.startsWith('survivor'), th = surv ? 2.15 : monsterHeight(modelKey(p.mt, p.fm)) + .3;
      const tag = textSprite(p.n, p.c); obj.add(tag); tag.position.y = th;
      obj.userData.tag = tag; obj.userData.tagName = p.n;
      // health bar (canvas sprite, redrawn when hp changes)
      const hc = document.createElement('canvas'); hc.width = 128; hc.height = 16; const ht = new THREE.CanvasTexture(hc); ht.colorSpace = THREE.SRGBColorSpace;
      const hb = new THREE.Sprite(new THREE.SpriteMaterial({ map: ht, depthTest: false, transparent: true })); hb.scale.set(1.3, .16, 1); hb.position.y = th - .42; hb.renderOrder = 11; obj.add(hb);
      obj.userData.hpBar = { s: hb, c: hc, t: ht, v: -1 };
      this.dyn.add(obj); c = { obj, kind, phase: Math.random() * 6, yaw: 0, op: 1, last: null, speed: 0, held: null, atk: 0 }; this.chars.set(p.id, c);
    }
    return c;
  }
  dropChar(c) { this.dyn.remove(c.obj); if (c.pet) this.dyn.remove(c.pet); if (c.trail) c.trail.forEach(m => this.dyn.remove(m)); }
  drawHp(c, v, mon) {
    const hb = c.obj.userData.hpBar; if (hb.v === v) return; hb.v = v; const g = hb.c.getContext('2d');
    g.clearRect(0, 0, 128, 16); g.fillStyle = 'rgba(0,0,0,.75)'; g.fillRect(0, 0, 128, 16);
    g.fillStyle = mon ? '#c0392b' : v > 50 ? '#3fd16a' : v > 25 ? '#f1c40f' : '#e74c3c'; g.fillRect(2, 2, 124 * v / 100, 12); hb.t.needsUpdate = true;
  }
  attack(id, w) { const c = this.chars.get(id); if (c) { c.atk = performance.now(); c.atkW = w; } }
  setOpacity(c, o, tint) {
    if (Math.abs(c.op - o) < .01 && c.tint === tint) return; c.op = o; c.tint = tint;
    c.obj.traverse(m => { if (!m.material || m.userData.glow || m === c.obj.userData.tag) return; for (const mm of Array.isArray(m.material) ? m.material : [m.material]) { mm.transparent = o < 1; mm.opacity = o; mm.depthWrite = o >= 1; if (mm.emissive && tint) { mm.userData.e0 ??= mm.emissive.clone(); mm.emissive.set(tint); mm.emissiveIntensity = .6; } else if (mm.emissive && mm.userData.e0) { mm.emissive.copy(mm.userData.e0); } } m.castShadow = o >= 1 && !c.selfNoShadow; });
  }

  // ---------------- frame ----------------
  frame(dt, t, v) {
    this.post.uniforms.uTime.value = t;
    if (v.scare) return this.renderScare(dt, t, v.scare);
    if (v.flight) return this.renderFlight(dt, t, v.flight);
    if (!v.snap || !this.map) return this.renderMenu(dt, t);
    const { snap, disp, me } = v, mp = v.mp, md = disp[me], st = snap.state, playing = st === 'playing';
    if (!mp || !md) return this.renderMenu(dt, t);
    const ghost = v.ghost, isMon = mp.role === 'monster' && st !== 'lobby';
    // characters
    const seen = new Set(), survivorsLit = [];
    for (const p of snap.ps) {
      const d = disp[p.id]; if (!d) continue; seen.add(p.id);
      const c = this.charFor(p, st), o = c.obj;
      const x = d.dx * S, z = d.dy * S;
      const moved = c.last ? Math.hypot(x - c.last.x, z - c.last.z) : 0; c.last = { x, z };
      c.speed = lerp(c.speed, dt > 0 ? moved / dt : 0, Math.min(1, dt * 8));
      let yaw = Math.atan2(Math.cos(p.a), Math.sin(p.a)); c.yaw = angLerp(c.yaw, yaw, Math.min(1, dt * 12));
      o.position.set(x, 0, z); o.rotation.y = c.yaw;
      const parts = o.userData.parts, sp = Math.min(c.speed / 6, 1.6);
      c.phase += dt * (3 + c.speed * 1.6);
      // phase 2: skinned glTF clips, procedural wiggles (tentacles, tails, wings), swimming and boats
      const wet = !p.bt && (this.map.islands || this.map.pools) && inWaterC(this.map, d.dx, d.dy);
      if (o.userData.anim) animTick(o, dt, wet && o.userData.sea ? 'swim' : c.speed > 4.5 ? 'run' : c.speed > .6 ? 'walk' : 'idle', Math.max(.6, Math.min(1.8, c.speed / 4)));
      if (o.userData.wiggle && o.userData.wiggle.length) wiggleTick(o, t + p.id);
      if (o.userData.shells) lodTick(o, this.camera.position.distanceTo(o.position));
      if (o.userData.dirty) { o.userData.dirty = false; c.op = -1; }
      if (p.bt) o.position.y = .55 + Math.sin(t * 1.6 + p.bt) * .12;
      else if (wet) o.position.y = p.role === 'monster' && st !== 'lobby' ? -monsterHeight(modelKey(p.mt, p.fm)) * .3 : -.85 + Math.sin(t * 2 + p.id) * .05;
      const sw = Math.sin(c.phase) * .7 * Math.min(1, sp);
      if (parts.legL) parts.legL.rotation.x = sw; if (parts.legR) parts.legR.rotation.x = -sw;
      // knees & elbows follow the stride
      const kn = Math.max(0, Math.sin(c.phase + 1.2)) * 1.0 * Math.min(1, sp), kn2 = Math.max(0, Math.sin(c.phase + 1.2 + Math.PI)) * 1.0 * Math.min(1, sp);
      if (parts.legL?.userData.low) parts.legL.userData.low.rotation.x = kn; if (parts.legR?.userData.low) parts.legR.userData.low.rotation.x = kn2;
      if (c.kind.startsWith('survivor')) {
        const ac = (performance.now() - c.atk) / 1000, cls = p.w ? itemClass(p.w) : 'fist';
        if (c.held !== (p.w || null)) { if (c.heldObj) parts.handR.remove(c.heldObj); c.heldObj = p.w ? heldItem(p.w) : null; if (c.heldObj) parts.handR.add(c.heldObj); c.held = p.w || null; if (p.id === me && c.heldObj) c.heldObj.traverse(m => { if (m.isMesh) m.castShadow = false; }); }
        parts.vest.visible = !!(p.ar & 1); parts.helmet.visible = !!(p.ar & 2);
        // left arm: flashlight held forward
        parts.armL.rotation.x = -1.25 + Math.sin(c.phase) * .05; parts.armL.rotation.z = .18; parts.armL.userData.low.rotation.x = -.25;
        const R2 = parts.armR, lo = R2.userData.low;
        if (cls === 'gun') { const rec = ac < .12 ? (1 - ac / .12) * .35 : 0; R2.rotation.set(-1.45 - rec, 0, -.12); lo.rotation.x = -.05 + rec * .3; }
        else if (cls === 'melee' || cls === 'fist') {
          if (ac < .4) { const k = ac / .4, up = k < .3 ? k / .3 : 1 - (k - .3) / .7; R2.rotation.set(-.3 - 2.3 * up, k > .3 ? -.7 * (1 - up) : 0, -.15); lo.rotation.x = -.9 * up - (cls === 'fist' && k > .3 ? .1 : 0); }
          else { R2.rotation.set(sw * .6 - .15, 0, -.06); lo.rotation.x = -.25 - (cls === 'fist' ? .3 : 0); }
        } else { R2.rotation.set(ac < .5 ? -2.2 : sw * .6 - .15, 0, -.06); lo.rotation.x = ac < .5 ? -1.6 : -.35; }
        parts.torso.rotation.y = cls === 'gun' ? -.2 : 0;
        parts.body.position.y = Math.abs(Math.sin(c.phase)) * .05 * sp; parts.body.rotation.x = sp > 1.1 ? .12 : .03;
        if (p.st.stun || p.st.root) parts.body.rotation.z = Math.sin(t * 20) * .05; else parts.body.rotation.z = 0;
      }
      // v1.4.1: pets follow their owner; trails glow behind them (PETS & TRAILS store)
      { const lk = (p.lk || '').split(','), petK = c.kind.startsWith('survivor') ? lk[8] : null, trK = c.kind.startsWith('survivor') ? lk[9] : null, hidden = (playing && (!p.al || p.es || p.role === 'ghost')) || p.st.invis;
        if (petK && petK !== 'none') { if (!c.pet || c.petK !== petK) { if (c.pet) this.dyn.remove(c.pet); c.pet = buildPet(petK); c.pet.scale.setScalar(1.1); c.petK = petK; c.pet.position.set(x - 1, 0, z); this.dyn.add(c.pet); }
          const pt = c.pet, side = new THREE.Vector3(Math.cos(c.yaw) * 1.1 - Math.sin(c.yaw) * .9, 0, -Math.sin(c.yaw) * 1.1 - Math.cos(c.yaw) * .9), tx = x + side.x, tz = z + side.z;
          pt.position.x = lerp(pt.position.x, tx, Math.min(1, dt * 4)); pt.position.z = lerp(pt.position.z, tz, Math.min(1, dt * 4)); pt.position.y = (pt.userData.fly ? 1.5 + Math.sin(t * 3) * .15 : Math.abs(Math.sin(t * 8)) * .08 * Math.min(1, c.speed));
          pt.rotation.y = angLerp(pt.rotation.y, c.yaw, Math.min(1, dt * 6)); if (pt.userData.wings) pt.userData.wings.forEach((wg, i) => wg.rotation.y = (i ? 1 : -1) * Math.sin(t * 16) * .6); pt.visible = !hidden;
        } else if (c.pet) { this.dyn.remove(c.pet); c.pet = null; }
        if (trK && trK !== 'none') { const TC = { fire: '#ff7a1a', ice: '#9ae8ff', toxic: '#7aff3a', rainbow: null, shadow: '#3a1a5a', stars: '#fff2a0', blood: '#8a0a0a' };
          if (!c.trail || c.trK !== trK) { if (c.trail) c.trail.forEach(m => this.dyn.remove(m)); c.trK = trK; c.trail = []; c.trailT = 0;
            for (let i = 0; i < 22; i++) { const m = new THREE.Mesh(G.sph(.16, 8, 6), new THREE.MeshBasicMaterial({ color: TC[trK] || '#fff', transparent: true, opacity: 0, depthWrite: false })); m.visible = false; this.dyn.add(m); c.trail.push(m); } }
          if ((c.trailT -= dt) <= 0 && c.speed > .5) { c.trailT = .05; const m = c.trail.shift(); c.trail.push(m); m.position.set(x + (Math.random() - .5) * .3, .25 + Math.random() * .5 + o.position.y, z + (Math.random() - .5) * .3); m.userData.age = 0; if (trK === 'rainbow') m.material.color.setHSL((t * .5) % 1, 1, .6); m.visible = !hidden; }
          for (const m of c.trail) if (m.visible) { m.userData.age = (m.userData.age || 0) + dt; const k = 1 - m.userData.age / 1.1; if (k <= 0) m.visible = false; else { m.material.opacity = k * .8; m.scale.setScalar(.4 + k * .8); if (trK === 'fire' || trK === 'stars') m.position.y += dt * .6; } }
        } else if (c.trail) { c.trail.forEach(m => this.dyn.remove(m)); c.trail = null; } }
      // asleep in a bed: lie down on the mattress
      if (p.st.sleep) { o.rotation.set(-Math.PI / 2, 0, 0, 'YXZ'); o.rotation.y = c.yaw; o.position.y = .62; } else if (o.rotation.x) { o.rotation.x = 0; o.position.y = 0; }
      else {
        const k = c.kind.split(':')[0];
        if (parts.armL && k !== 'cartooncat') parts.armL.rotation.x = -sw * .6 - .2; if (parts.armR && k !== 'cartooncat') parts.armR.rotation.x = sw * .6 - .2;
        if (k === 'cartooncat') { parts.armL.rotation.x = Math.sin(t * 2.2) * .25 - sw * .3; parts.armR.rotation.x = Math.sin(t * 2.2 + 2) * .25 + sw * .3; }
        if (parts.head) { parts.head.rotation.z = Math.sin(t * 1.3 + p.id) * .08; if (k === 'sirenhead') parts.head.rotation.z = Math.sin(t * .8) * .18; }
        if (k === 'demogorgon') { const open = .3 + .55 * (.5 + .5 * Math.sin(t * 2.4 + p.id)); parts.head.userData.petals.forEach(h => h.rotation.x = open); }
        if (k === 'locust' && parts.stat) parts.stat.visible = Math.random() < .5;
        if (k === 'drnowhere' && parts.stat) { parts.stat.rotation.y = t * .7; parts.stat.position.y = Math.sin(t * 2) * .05; }
        if (k === 'foxy' && parts.tail) parts.tail.rotation.y = Math.sin(t * 3) * .4;
        parts.body.position.y = Math.abs(Math.sin(c.phase)) * .08 * sp;
        // attack lunge, stagger, knocked-down pose
        const ac = (performance.now() - c.atk) / 1000; if (ac < .45 && parts.armR) { const k = Math.sin(ac / .45 * Math.PI); parts.armR.rotation.x = -.2 - 2 * k; if (parts.armL) parts.armL.rotation.x = -.2 - 1.6 * k; }
        if (p.st.stag) parts.body.rotation.z = Math.sin(t * 25) * .08; else parts.body.rotation.z = 0;
        const down = !!p.st.down; c.down = lerp(c.down || 0, down ? 1 : 0, Math.min(1, dt * 5));
        parts.body.rotation.x = -c.down * 1.45; parts.body.position.y += c.down * .25; parts.body.position.z = -c.down * .2;
      }
      // v1.4.1: emotes (bought at EMOTES & DANCES) play a short procedural animation
      if (p.em && c.kind.startsWith('survivor')) { const e = p.em, k2 = t * 6;
        if (e === 'wave') { parts.armR.rotation.set(-2.8, 0, -.4 + Math.sin(k2 * 1.5) * .5); }
        else if (e === 'dance') { parts.body.position.y = Math.abs(Math.sin(k2)) * .18; parts.body.rotation.z = Math.sin(k2) * .2; parts.armL.rotation.x = -2.4 + Math.sin(k2) * .6; parts.armR.rotation.x = -2.4 - Math.sin(k2) * .6; }
        else if (e === 'spin') { o.rotation.y = c.yaw + t * 9; parts.armL.rotation.z = 1.3; parts.armR.rotation.z = -1.3; }
        else if (e === 'jump') { o.position.y += Math.abs(Math.sin(k2 * .8)) * .9; parts.armL.rotation.x = parts.armR.rotation.x = -2.9; }
        else if (e === 'flex') { parts.armL.rotation.set(-1.5, 0, 1.2); parts.armR.rotation.set(-1.5, 0, -1.2); parts.armL.userData.low.rotation.x = parts.armR.userData.low.rotation.x = -1.6 - Math.abs(Math.sin(k2)) * .4; }
        else if (e === 'floss') { const f = Math.sin(k2 * 1.3); parts.armL.rotation.set(.2, 0, f * .9); parts.armR.rotation.set(.2, 0, f * .9); parts.body.rotation.z = -f * .15; }
        else if (e === 'zombie') { parts.armL.rotation.set(-1.55, 0, .05); parts.armR.rotation.set(-1.55, 0, -.05); parts.body.rotation.z = Math.sin(t * 3) * .12; }
        else if (e === 'scream') { parts.armL.rotation.set(-2.6, 0, .9); parts.armR.rotation.set(-2.6, 0, -.9); parts.body.rotation.x = -.25; if (parts.head) parts.head.rotation.x = -.4; } }
      if (p.id === me) { if (!c.selfNoShadow) { o.traverse(m => { if (m.isMesh) m.castShadow = false; }); c.selfNoShadow = true; } }
      // visibility styling
      const pGhost = playing && (!p.al || p.es || p.role === 'ghost');
      this.setOpacity(c, pGhost ? .32 : p.st.invis ? .22 : 1, pGhost ? '#3a5a9a' : null);
      // name tags: survivors don't see monster tags; far tags hidden
      const dist = Math.hypot(d.dx - md.dx, d.dy - md.dy) * S;
      const tagVis = p.id === me ? false : (ghost || isMon || !playing) ? dist < 40 : (p.role !== 'monster' && dist < 14);
      o.userData.tag.visible = tagVis;
      const hb = o.userData.hpBar; hb.s.visible = playing && p.hp != null && !pGhost && p.role !== 'ghost' && (p.id === me ? false : p.role === 'monster' ? dist < 30 : dist < 22) && (p.hp < 100 || p.role === 'monster');
      if (hb.s.visible) this.drawHp(c, p.hp, p.role === 'monster');
      if (p.role === 'survivor' && p.al && !p.es && st !== 'lobby' && st !== 'results' && p.id !== me) survivorsLit.push({ p, d, dist });
    }
    for (const [id, c] of this.chars) if (!seen.has(id)) { this.dropChar(c); this.chars.delete(id); }

    // local flashlight
    const myPos = new THREE.Vector3(md.dx * S, 0, md.dy * S), aim = v.aim ?? mp.a;
    const dir = new THREE.Vector3(Math.cos(aim), 0, Math.sin(aim));
    const survivorLight = mp.role === 'survivor' && !ghost && st !== 'lobby';
    const myLightOn = survivorLight || st === 'lobby';
    this.placeFlash(this.flash, this.beams[0], myPos, dir, myLightOn && !mp.st.blind, st === 'lobby' ? 18 : 42);
    // pool for other survivors
    survivorsLit.sort((a, b) => a.dist - b.dist);
    this.flashPool.forEach((l, i) => { const s = survivorsLit[i]; if (s && !(mp.st.blind && false)) this.placeFlash(l, this.beams[i + 1], new THREE.Vector3(s.d.dx * S, 0, s.d.dy * S), new THREE.Vector3(Math.cos(s.p.a), 0, Math.sin(s.p.a)), true, 30); else this.placeFlash(l, this.beams[i + 1], myPos, dir, false); });
    // self light: monster "night vision" / ghost / tiny fill
    this.selfLight.position.copy(myPos).add(new THREE.Vector3(0, 3, 0));
    if (isMon && playing) { this.selfLight.color.set('#ff2a1a'); this.selfLight.intensity = 10; this.selfLight.distance = 26; }
    else if (ghost) { this.selfLight.color.set('#8fb0ff'); this.selfLight.intensity = 10; this.selfLight.distance = 40; }
    else { this.selfLight.color.set('#ffe6c0'); this.selfLight.intensity = mp.st.blind ? .5 : 3; this.selfLight.distance = 9; }
    // lamps: closest N get real lights; flicker
    const lamps = (this.lamps || []).map(l => ({ l, d: Math.hypot(l.x - md.dx, l.y - md.dy) })).sort((a, b) => a.d - b.d);
    this.lampPool.forEach((pl, i) => { const e = lamps[i]; if (!e || e.l.broken) { pl.intensity = 0; return; } pl.position.copy(e.l.lp); pl.color.set(e.l.col || '#ffc070'); let on = 1; if (e.l.flick) { const f = Math.sin(t * 13 + e.l.phase) + Math.sin(t * 7.3 + e.l.phase * 2); on = f > 1.3 ? .1 : f > 1.1 ? .5 : 1; } pl.intensity = 14 * on; e.l.obj.userData.glow.material.opacity = on; e.l.obj.userData.bulb.material.emissiveIntensity = 3 * on; });
    for (let i = this.lampPool.length; i < lamps.length; i++) { const l = lamps[i].l; if (!l.broken && l.flick) { const f = Math.sin(t * 13 + l.phase) + Math.sin(t * 7.3 + l.phase * 2); l.obj.userData.glow.material.opacity = f > 1.3 ? .1 : 1; } }
    // global light mood
    const nightBoost = isMon && playing ? 1.9 : ghost ? 2.4 : 1;
    this.hemi.intensity = this.theme.hemi * nightBoost * (mp.st.blind ? .4 : 1);
    this.hemi.color.set(isMon && playing ? '#7a3030' : this.theme.sky);
    this.scene.fog.density = this.theme.dens * (isMon && playing ? .7 : ghost ? .5 : 1);
    this.moon.position.copy(myPos).add(new THREE.Vector3(-18, 40, -12)); this.moon.target.position.copy(myPos);
    this.worldTick(dt, t, snap, md, mp, playing);
    // lobby heli + extraction
    if (this.lobbyHeli) this.spinHeli(this.lobbyHeli, dt, t, st === 'lobby' ? 6 : 2);
    if (this.padRing) this.padRing.material.opacity = .5 + .35 * Math.sin(t * 3);
    const ex = snap.ex;
    this.exHeli.visible = this.exBeam.visible = this.exRing.visible = !!ex; this.exSpot.intensity = ex ? 70 : 0;
    if (ex) {
      const ep = W3(ex.x, ex.y); this.exHeli.position.copy(ep).add(new THREE.Vector3(0, Math.max(0, 1.5 + Math.sin(t) * .3), 0)); this.spinHeli(this.exHeli, dt, t, 30);
      this.exBeam.position.copy(ep).add(new THREE.Vector3(0, 30, 0)); this.exBeam.material.opacity = .1 + .04 * Math.sin(t * 2);
      this.exRing.position.copy(ep).add(new THREE.Vector3(0, .06, 0)); this.exRing.scale.setScalar(ex.r * S);
      this.exSpot.position.copy(ep).add(new THREE.Vector3(0, 25, 0)); this.exSpot.target.position.copy(ep);
    }
    // traps & portal
    const traps = snap.traps || [];
    while (this.trapMeshes.length < traps.length) { const g = new THREE.Group(); const cup = new THREE.Mesh(G.cyl(.35, .28, .4, 16), mat('#d65a92', { r: .5 })); cup.position.y = .2; const top = new THREE.Mesh(G.sph(.36, 16, 10), mat('#ffb6d6', { r: .4, e: '#ff3a8a', ei: .4 })); top.position.y = .45; top.scale.y = .6; const ch = new THREE.Mesh(G.sph(.09, 8, 6), mat('#ff1020', { e: '#ff1020', ei: 1.2 })); ch.position.y = .68; g.add(cup, top, ch); const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('#ff5aa8'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); gl.scale.setScalar(2.4); gl.position.y = .3; g.add(gl); this.scene.add(g); this.trapMeshes.push(g); }
    this.trapMeshes.forEach((m, i) => { const tr = traps[i]; m.visible = !!tr; if (tr) { m.position.set(tr.x * S, 0, tr.y * S); m.rotation.y = t; } });
    this.portal.visible = !!snap.portal; if (snap.portal) { this.portal.position.set(snap.portal.x * S, 0, snap.portal.y * S); this.portal.rotation.y = t * 2; }
    // loot containers (lid opens once looted) and ground items
    const opened = new Set(snap.lo || []);
    if (this.loot) for (const e of this.loot.values()) {
      const isOpen = opened.has(e.c.id); if (isOpen && !e.open) { e.open = true; e.t = t; }
      const k = e.open ? Math.min(1, (t - e.t) * 2.5) : 0, near = !e.open && playing && Math.hypot(e.c.x - md.dx, e.c.y - md.dy) < 90;
      if (e.o.userData.lid) { e.o.userData.lid.rotation.x = -1.9 * k; e.o.userData.inner.visible = e.open && k < 1 ? true : near; e.o.userData.inner.material.opacity = e.open ? 1 - k : .5 + .3 * Math.sin(t * 4); }
      else { e.o.userData.flap.visible = e.open; e.o.userData.body.scale.y = e.open ? .75 : 1; }
    }
    this.items ??= new Map(); const seenI = new Set();
    for (const [id, x, y, k] of snap.it || []) {
      seenI.add(id); let e = this.items.get(id);
      if (!e) { const g = new THREE.Group(), m = buildItem(k); m.scale.setScalar(k === 'vest' || k === 'helmet' || k.startsWith('ammo') || k === 'medkit' ? 1.5 : 2.2); g.add(m); const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(itemClass(k) === 'gun' ? '#ff9a40' : itemClass(k) === 'melee' ? '#ffd27a' : k === 'vest' || k === 'helmet' ? '#7ab8ff' : '#8aff9a'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: .55 })); gl.scale.setScalar(1.3); gl.position.y = .35; g.add(gl); g.userData.m = m; this.scene.add(g); e = { g, born: t }; this.items.set(id, e); }
      const pop = Math.min(1, (t - e.born) * 3); e.g.position.set(x * S, .12 + Math.sin(t * 2.5 + id) * .08 + (1 - pop) * .8, y * S); e.g.userData.m.rotation.y = t * 1.2 + id; if (itemClass(k) !== 'use') e.g.userData.m.rotation.z = itemClass(k) === 'gun' || itemClass(k) === 'melee' ? Math.PI / 2 * 0 : 0;
    }
    for (const [id, e] of this.items) if (!seenI.has(id)) { this.scene.remove(e.g); this.items.delete(id); }
    // bushes: see-through when the local player is inside
    for (const { m, b } of this.bushes) { const inside = Math.hypot(b.x - md.dx, b.y - md.dy) < b.r; if (m.material.transparent !== inside) { m.material.transparent = inside; m.material.opacity = inside ? .45 : 1; m.material.depthWrite = !inside; m.material.needsUpdate = true; } }
    // effects
    this.updateFx(dt, t); this.updateWitness();
    // camera
    let fp = false;
    if (v.cam) {
      // follow camera: rotates with the character (yaw), pitch from look drag, zoom from first person (0) to far third person (1)
      const { yaw, pitch, zoom } = v.cam, fwd = new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw));
      const eye = ghost ? 1.6 : mp.role === 'monster' && st !== 'lobby' ? monsterHeight(modelKey(mp.mt, mp.fm)) * .9 : 1.62;
      fp = zoom < .08;
      const mine = this.chars.get(me); if (mine) mine.obj.visible = !fp || ghost;
      if (fp) {
        const look = Math.max(-1.2, Math.min(1.2, pitch - .3));
        const head = myPos.clone().add(new THREE.Vector3(0, eye, 0)).addScaledVector(fwd, mp.role === 'monster' ? .5 : .18);
        this.camPos.copy(head); this.camLook.copy(head).add(new THREE.Vector3(fwd.x * Math.cos(look), -Math.sin(look), fwd.z * Math.cos(look)));
        if (v.cam.target) { // kill cam: stare at the victim (and follow the kill animation) from your own eyes
          const w = this.witness && this.witness[this.witness.length - 1];
          if (w && w.o.parent) { w.o.getWorldPosition(this.camLook); this.camLook.y += .9; } else this.camLook.set(v.cam.target.x * S, .9, v.cam.target.y * S);
        }
      } else {
        const z = (zoom - .08) / .92, dist = 2.6 + z * z * 13 + (mp.role === 'monster' && st !== 'lobby' ? monsterHeight(modelKey(mp.mt, mp.fm)) * .5 : 0), el = Math.max(.04, Math.min(1.42, pitch + .12));
        const target = myPos.clone().add(new THREE.Vector3(0, Math.min(eye, 2.4) * .85, 0)).addScaledVector(fwd, .6 + z * 1.2);
        const want = target.clone().addScaledVector(fwd, -dist * Math.cos(el)).add(new THREE.Vector3(0, dist * Math.sin(el), 0));
        if (want.y < .4) want.y = .4;
        // keep the camera out of walls and pine foliage: march from the player toward the wanted spot and stop before obstacles
        { const m = this.map, wh = (this.theme.wallH || 3) + .3, px = myPos.x / S, py = myPos.z / S, reach = (dist + 6) / S;
          const tr = (m.trees || []).filter(t => Math.abs(t.x - px) < reach && Math.abs(t.y - py) < reach), wl = (m.walls || []).filter(w => w.x < px + reach && w.x + w.w > px - reach && w.y < py + reach && w.y + w.h > py - reach);
          const v = want.clone().sub(target), L = v.length(), n = Math.ceil(L / .3); let ok = L;
          for (let i = 1; i <= n; i++) { const q = target.clone().addScaledVector(v, i / n), qx = q.x / S, qy = q.z / S;
            const hit = (wl.some(w => q.y < (w._h != null ? w._h + .3 : wh) && qx > w.x - 6 && qx < w.x + w.w + 6 && qy > w.y - 6 && qy < w.y + w.h + 6)) || (q.y > 1.6 && q.y < 13 && tr.some(t => Math.hypot(t.x - qx, t.y - qy) * S < t.r * S * 2.1 + .35));
            if (hit) { ok = Math.max(1.3, L * (i - 1) / n); break; } }
          if (ok < L) want.copy(target).addScaledVector(v, ok / L); }
        const snap = !this.camInit || this.camPos.distanceTo(want) > 30; this.camInit = true;
        if (snap) { this.camPos.copy(want); this.camLook.copy(target); } else { this.camPos.lerp(want, Math.min(1, dt * 14)); this.camLook.lerp(target, Math.min(1, dt * 16)); }
      }
      const near = fp ? .08 : .3; if (this.camera.near !== near) { this.camera.near = near; this.camera.updateProjectionMatrix(); }
    } else {
    const h = this.portrait ? 15 : 11.5, back = this.portrait ? 7 : 8;
    const target = myPos.clone().add(new THREE.Vector3(0, 1, 0)).addScaledVector(dir, st === 'lobby' ? 0 : 2.2);
    const want = target.clone().add(new THREE.Vector3(0, h, back));
    this.camPos.lerp(want, Math.min(1, dt * 5)); this.camLook.lerp(target, Math.min(1, dt * 6));
    }
    const danger = playing && mp.role === 'survivor' && !ghost && snap.md != null ? Math.max(0, 1 - snap.md / 320) : 0;
    this.shake = Math.max(this.shake - dt * 2, danger * .12);
    const sh = this.shake;
    this.camera.position.copy(this.camPos).add(new THREE.Vector3((Math.random() - .5) * sh, (Math.random() - .5) * sh, 0));
    this.camera.lookAt(this.camLook);
    // see-through hole
    this.camera.updateMatrixWorld(); const pp = myPos.clone().add(new THREE.Vector3(0, 1.2, 0)).project(this.camera);
    FADE.uPS.value.set(pp.x * .5 + .5, pp.y * .5 + .5); FADE.uPD.value = this.camera.position.distanceTo(myPos); FADE.uRad.value = fp ? 0 : .11;
    // post
    const u = this.post.uniforms;
    u.uGrey.value = lerp(u.uGrey.value, mp.st.grey ? 1 : 0, Math.min(1, dt * 4));
    u.uRed.value = danger * (.25 + .2 * Math.sin(t * 9)) + (isMon && playing ? .08 : 0);
    u.uVig.value = 1.05 + danger * .35 + (mp.st.blind ? .5 : 0); u.uGrain.value = this.theme.staticNoise ? .11 : .07; u.uAb.value = .6 + danger * 3;
    u.uExp.value = st === 'lobby' ? 1.5 : 1.7; u.uFade.value = 0; u.uFlash.value = Math.max(0, u.uFlash.value - dt * 3);
    this.render(this.scene, this.camera);
    return { danger, myPos };
  }
  placeFlash(l, beam, pos, dir, on, intensity = 40) {
    l.intensity = on ? intensity : 0; beam.visible = on;
    if (!on) return;
    l.position.copy(pos).add(new THREE.Vector3(0, 1.35, 0)).addScaledVector(dir, .45);
    l.target.position.copy(pos).addScaledVector(dir, 10).add(new THREE.Vector3(0, -1.6, 0));
    beam.position.copy(l.position); beam.lookAt(l.target.position);
  }
  spinHeli(h, dt, t, rate) {
    h.userData.rotor.rotation.y += dt * rate; h.userData.tail.rotation.x += dt * rate * 1.5;
    const [r, g, w] = h.userData.navs, on = Math.sin(t * 5) > .6; r.visible = g.visible = on; w.visible = !on;
  }
  addFx(e) {
    const p = W3(e.x, e.y, .15), col = new THREE.Color(e.c || '#fff');
    if (e.kind === 'shot') {
      this.attack(e.id, e.w); const from = W3(e.x, e.y, 1.3).add(new THREE.Vector3(Math.cos(e.a), 0, Math.sin(e.a)).multiplyScalar(.7));
      for (const [tx, ty] of e.to || []) {
        const to = W3(tx, ty, 1.1), g = new THREE.BufferGeometry().setFromPoints([from, to]);
        const m = new THREE.Line(g, new THREE.LineBasicMaterial({ color: '#ffe0a0', transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false })); this.scene.add(m); this.fxList.push({ m, born: performance.now(), life: 120, line: true });
        this.sparks(to, '#ffc070', 6, 2);
      }
      const fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('#ffcc66'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); fl.position.copy(from); fl.scale.setScalar(e.w === 'shotgun' ? 2.4 : 1.6); this.scene.add(fl); this.fxList.push({ m: fl, born: performance.now(), life: 90, line: true });
      this.muzzle ??= (() => { const l = new THREE.PointLight('#ffb050', 0, 14, 1.5); this.scene.add(l); return l; })(); this.muzzle.position.copy(from); this.muzzle.intensity = 40; this.muzzleT = performance.now();
      return;
    }
    if (e.kind === 'swing') { this.attack(e.id, e.w); return; }
    if (e.kind === 'hit' || e.kind === 'slash') { this.sparks(W3(e.x, e.y, 1.3), e.c || '#a00000', 26, 4); if (e.kind === 'slash') this.attack(-1); return; }
    if (e.kind === 'open') { this.sparks(W3(e.x, e.y, .6), '#ffd27a', 30, 3); return; }
    if (e.kind === 'grab') { // Cartoon Cat's stretchy rubber-hose arm with a white cartoon glove
      const from = W3(e.x, e.y, 2.4), to = W3(e.tx, e.ty, 1.1), mid = from.clone().lerp(to, .5).add(new THREE.Vector3(0, .6, 0));
      const arm = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(from, mid, to), 24, .09, 8), new THREE.MeshBasicMaterial({ color: '#050505', transparent: true }));
      const glove = new THREE.Mesh(new THREE.SphereGeometry(.28, 12, 10), new THREE.MeshBasicMaterial({ color: '#f4f4f0', transparent: true })); glove.position.copy(to);
      for (const m of [arm, glove]) { this.scene.add(m); this.fxList.push({ m, born: performance.now(), life: 650, line: true }); }
      return;
    }
    if (e.kind === 'portal') { // Upside Down rift: a red vertical tear + drifting spores
      const m = new THREE.Mesh(new THREE.TorusGeometry(1.1, .12, 10, 40), new THREE.MeshBasicMaterial({ color: '#ff2a1a', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      m.scale.set(1, 1.7, 1); m.position.copy(W3(e.x, e.y, 1.9)); this.scene.add(m); this.fxList.push({ m, born: performance.now(), life: 1400, line: true });
      const fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('#ff3020'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); fl.position.copy(m.position); fl.scale.set(3, 5, 1); this.scene.add(fl); this.fxList.push({ m: fl, born: performance.now(), life: 1400, line: true });
      this.sparks(m.position, '#cfd8e0', 40, 2.5); return;
    }
    if (this.fx2(e, p, col)) return;
    if (e.kind === 'ring' || e.kind === 'siren') {
      const n = e.kind === 'siren' ? 3 : 1;
      for (let k = 0; k < n; k++) { const m = new THREE.Mesh(new THREE.RingGeometry(.9, 1, 64), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; m.position.copy(p); this.scene.add(m); this.fxList.push({ m, born: performance.now() + k * 250, life: e.kind === 'siren' ? 1600 : 800, r: (e.kind === 'siren' ? 600 : (e.r || 200)) * S, ring: true }); }
      if (e.kind === 'siren') this.shake = .6;
    } else {
      const n = 60, pos = new Float32Array(n * 3), vel = [];
      for (let i = 0; i < n; i++) { pos.set([p.x, 1, p.z], i * 3); vel.push(new THREE.Vector3((Math.random() - .5) * 8, Math.random() * 5, (Math.random() - .5) * 8)); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const m = new THREE.Points(g, new THREE.PointsMaterial({ color: col, size: .35, map: softTex(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      this.scene.add(m); this.fxList.push({ m, vel, born: performance.now(), life: 900 });
    }
  }
  // phase 2 ability effects: waves, tentacles, lightning, whirlpools, dragon fire, bats, boulders
  fx2(e, p, col) {
    const now = performance.now(), push = (m, life, upd, born = now) => { this.scene.add(m); this.fxList.push({ m, born, life, upd }); return m; };
    const add = THREE.AdditiveBlending;
    switch (e.kind) {
      case 'wave': { const R = (e.r || 400) * S, m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 2.6, 64, 1, true), new THREE.MeshStandardMaterial({ color: '#7ab8d0', transparent: true, opacity: .75, roughness: .1, metalness: .3, side: THREE.DoubleSide, emissive: '#1a4a5a', emissiveIntensity: .5, depthWrite: false }));
        m.position.set(p.x, 1.2, p.z); push(m, 1500, a => { m.scale.set(1 + R * a, 1.4 * (1 - a * .7), 1 + R * a); m.material.opacity = .75 * (1 - a); }); this.sparks(W3(e.x, e.y, .5), '#e0f4ff', 50, 6); this.shake = Math.max(this.shake || 0, .4); return true; }
      case 'tentacle': { const from = W3(e.x, e.y, -.5), to = W3(e.tx, e.ty, .6), mid = from.clone().lerp(to, .5).add(new THREE.Vector3(0, 4, 0));
        const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(from, mid, to), 32, .35, 10), new THREE.MeshStandardMaterial({ color: '#7a2a26', roughness: .35, transparent: true, emissive: '#2a0806', emissiveIntensity: .4 }));
        m.geometry.setDrawRange(0, 0); const tot = m.geometry.index.count; push(m, 1100, a => { m.geometry.setDrawRange(0, Math.floor(tot * Math.min(1, a * 3)) - (Math.floor(tot * Math.min(1, a * 3)) % 3)); m.material.opacity = a > .7 ? (1 - a) / .3 : 1; });
        this.sparks(from.clone().setY(.3), '#cfe8f0', 30, 4); return true; }
      case 'warn': { const R = (e.r || 90) * S, m = new THREE.Mesh(new THREE.RingGeometry(R * .85, R, 48), new THREE.MeshBasicMaterial({ color: e.c || '#ff2a1a', transparent: true, blending: add, depthWrite: false, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; m.position.set(p.x, .15, p.z);
        const d = new THREE.Mesh(new THREE.CircleGeometry(R, 48), new THREE.MeshBasicMaterial({ color: e.c || '#ff2a1a', transparent: true, opacity: .15, blending: add, depthWrite: false })); d.rotation.x = -Math.PI / 2; d.position.set(p.x, .12, p.z);
        push(m, 1000, a => { m.material.opacity = .5 + .5 * Math.sin(a * 30); }); push(d, 1000, a => { d.scale.setScalar(a); }); return true; }
      case 'bolt': { const pts = []; let x = p.x, z = p.z; for (let i = 0; i <= 12; i++) { pts.push(new THREE.Vector3(x + (i && i < 12 ? (Math.random() - .5) * 2.4 : 0), 45 - i * 45 / 12, z + (i && i < 12 ? (Math.random() - .5) * 2.4 : 0))); }
        const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0), 48, .12, 4), new THREE.MeshBasicMaterial({ color: '#e8f0ff', transparent: true, blending: add, depthWrite: false, fog: false }));
        const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('#a8c8ff'), blending: add, depthWrite: false, transparent: true })); gl.scale.setScalar(9); gl.position.set(p.x, 1, p.z);
        push(m, 320, a => { m.material.opacity = Math.random() < .5 ? 1 - a : .2; }); push(gl, 400, a => { gl.material.opacity = 1 - a; }); this.flashT = .32; this.shake = Math.max(this.shake || 0, .35); this.sparks(W3(e.x, e.y, .3), '#cfe0ff', 40, 6); return true; }
      case 'whirl': { const R = (e.r || 460) * S, g = new THREE.Group(); g.position.set(p.x, .12, p.z);
        for (let k = 0; k < 5; k++) { const r = new THREE.Mesh(new THREE.RingGeometry(R * (k + .5) / 5.5, R * (k + .9) / 5.5, 48, 1, k, 4.2), new THREE.MeshBasicMaterial({ color: k % 2 ? '#2a5a6a' : '#9ad0e0', transparent: true, opacity: .55, side: THREE.DoubleSide, depthWrite: false })); r.rotation.x = -Math.PI / 2; g.add(r); }
        push(g, 3200, (a, dt) => { g.children.forEach((r, k) => { r.rotation.z += dt * (3 - k * .4); r.material.opacity = .55 * Math.min(1, (1 - a) * 4); }); }); return true; }
      case 'splash': this.sparks(W3(e.x, e.y, .3), e.c || '#e0f4ff', 34, 5); return true;
      case 'dive': { this.sparks(W3(e.x, e.y, .3), '#e0f4ff', 60, 7); setTimeout(() => this.sparks(W3(e.tx ?? e.x, e.ty ?? e.y, .3), '#e0f4ff', 70, 8), 600); this.shake = Math.max(this.shake || 0, .3); return true; }
      case 'fire': { const n = 160, pos = new Float32Array(n * 3), vel = [], a0 = e.a || 0, R = (e.r || 360) * S, from = W3(e.x, e.y, 2.6).add(new THREE.Vector3(Math.cos(a0), 0, Math.sin(a0)).multiplyScalar(1.5));
        for (let i = 0; i < n; i++) { pos.set([from.x, from.y, from.z], i * 3); const aa = a0 + (Math.random() - .5) * .45, sp = R * (.7 + Math.random() * .6); vel.push(new THREE.Vector3(Math.cos(aa) * sp, 2 + Math.random() * 3, Math.sin(aa) * sp)); }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const m = new THREE.Points(g, new THREE.PointsMaterial({ color: '#ff8a2a', size: .9, map: softTex(), transparent: true, blending: add, depthWrite: false })); this.scene.add(m); this.fxList.push({ m, vel, born: now, life: 1000, nograv: true });
        const fl = new THREE.PointLight('#ff6a1a', 60, 30, 1.4); fl.position.copy(from); push(fl, 900, a => { fl.intensity = 60 * (1 - a); }); return true; }
      case 'bats': { const n = 46, pos = new Float32Array(n * 3), vel = []; for (let i = 0; i < n; i++) { pos.set([p.x, 1.5, p.z], i * 3); vel.push(new THREE.Vector3((Math.random() - .5) * 9, 1 + Math.random() * 4, (Math.random() - .5) * 9)); }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const m = new THREE.Points(g, new THREE.PointsMaterial({ color: '#0a0608', size: .38, transparent: true, depthWrite: false })); this.scene.add(m); this.fxList.push({ m, vel, born: now, life: 1500, nograv: true, flutter: true }); return true; }
      case 'boulder': { const m = new THREE.Mesh(new THREE.DodecahedronGeometry(.9, 1), mat('#6a6a70', { map: 'stone', r: .9 })); m.castShadow = true; const from = W3(e.x, e.y, 3), to = W3(e.tx, e.ty, .8);
        push(m, 700, a => { m.position.lerpVectors(from, to, a); m.position.y += Math.sin(a * Math.PI) * 4; m.rotation.x += .2; m.rotation.z += .13; if (a > .95 && !m.userData.hit) { m.userData.hit = 1; this.sparks(to, '#9a8a7a', 40, 6); this.shake = Math.max(this.shake || 0, .3); } }); return true; }
    }
    return false;
  }
  sparks(p, c, n, sp) {
    const pos = new Float32Array(n * 3), vel = []; for (let i = 0; i < n; i++) { pos.set([p.x, p.y, p.z], i * 3); vel.push(new THREE.Vector3((Math.random() - .5) * sp, Math.random() * sp * .7, (Math.random() - .5) * sp)); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.Points(g, new THREE.PointsMaterial({ color: c, size: .16, map: softTex(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); this.scene.add(m); this.fxList.push({ m, vel, born: performance.now(), life: 500 });
  }
  updateFx(dt) {
    const now = performance.now(); if (this.muzzle) this.muzzle.intensity = Math.max(0, 40 - (now - this.muzzleT) * .6);
    for (let i = this.fxList.length - 1; i >= 0; i--) {
      const f = this.fxList[i], a = (now - f.born) / f.life;
      if (a < 0) { f.m.visible = false; continue; } f.m.visible = true;
      if (a >= 1) { this.scene.remove(f.m); f.m.traverse(o => { o.geometry?.dispose(); o.material?.dispose?.(); }); this.fxList.splice(i, 1); continue; }
      if (f.upd) { f.upd(a, dt); continue; }
      if (f.line) { f.m.material.opacity = 1 - a; continue; }
      if (f.ring) { f.m.scale.setScalar(.3 + f.r * a); f.m.material.opacity = .9 * (1 - a); }
      else { const pa = f.m.geometry.attributes.position; for (let k = 0; k < f.vel.length; k++) { if (!f.nograv) f.vel[k].y -= 9 * dt; if (f.flutter) { f.vel[k].x += (Math.random() - .5) * 30 * dt; f.vel[k].z += (Math.random() - .5) * 30 * dt; } pa.setXYZ(k, pa.getX(k) + f.vel[k].x * dt, Math.max(.05, pa.getY(k) + f.vel[k].y * dt), pa.getZ(k) + f.vel[k].z * dt); } pa.needsUpdate = true; f.m.material.opacity = 1 - a; }
    }
  }
  render(scene, cam) {
    const r = this.renderer, dbg = window.NH_DEBUG;
    if (dbg) { if (dbg.grain != null) this.post.uniforms.uGrain.value = dbg.grain; if (dbg.ab != null) this.post.uniforms.uAb.value = dbg.ab; if (dbg.direct) { r.toneMapping = THREE.ACESFilmicToneMapping; r.outputColorSpace = THREE.SRGBColorSpace; r.setRenderTarget(null); r.render(scene, cam); return; } } r.setRenderTarget(this.rt); r.render(scene, cam); r.setRenderTarget(null); r.render(this.postScene, this.postCam);
  }
  // world helpers for HUD
  aimFromScreen(x, y) {
    const v = new THREE.Vector2(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1); this.raycaster.setFromCamera(v, this.camera);
    const hit = new THREE.Vector3(); if (!this.raycaster.ray.intersectPlane(this.groundPlane, hit)) return null; return { x: hit.x / S, y: hit.z / S };
  }
  project(x, y, h = 1) { const p = W3(x, y, h).project(this.camera); return { x: (p.x * .5 + .5) * innerWidth, y: (-p.y * .5 + .5) * innerHeight, behind: p.z > 1 }; }

  // ---------------- menu backdrop ----------------
  buildMenu() {
    const s = this.menuScene = new THREE.Scene(); s.fog = new THREE.FogExp2('#0a0508', .05); s.background = new THREE.Color('#040205');
    this.menuCam = new THREE.PerspectiveCamera(50, 1, .3, 200);
    s.add(new THREE.HemisphereLight('#605078', '#201010', 1.1));
    const g = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshStandardMaterial({ map: (() => { const t = tex('dirt', 1).clone(); t.repeat.set(30, 30); t.needsUpdate = true; return t; })(), roughness: 1 })); g.rotation.x = -Math.PI / 2; g.receiveShadow = true; s.add(g);
    const kinds = ['vampire', 'freddy', 'foxy', 'springtrap', 'cartooncat', 'megalodon_h', 'trex', 'sirenhead', 'dragon', 'demogorgon', 'yeti', 'sonicexe', 'gargoyle', 'fester#3'];
    this.menuMonsters = kinds.map((k, i) => { const m = buildMonster(k); const a = (i - 6.5) * .17; m.position.set(Math.sin(a) * 15, 0, -Math.cos(a) * 15 + 6); m.rotation.y = -a; s.add(m); return m; });
    this.menuSpot = new THREE.SpotLight('#ffe2c0', 120, 50, .35, .5, 1.3); this.menuSpot.position.set(0, 14, 10); this.menuSpot.castShadow = true; this.menuSpot.shadow.mapSize.set(1024, 1024); s.add(this.menuSpot, this.menuSpot.target);
    const red = new THREE.PointLight('#ff2020', 20, 30, 1.5); red.position.set(0, 3, -6); s.add(red); this.menuRed = red;
  }
  renderMenu(dt, t) {
    const a = Math.sin(t * .35) * .9; this.menuSpot.target.position.set(Math.sin(a) * 14, 1.5, -Math.cos(a) * 14 + 6);
    const f = Math.sin(t * 11) + Math.sin(t * 5.7); this.menuSpot.intensity = f > 1.5 ? 20 : 260; this.menuRed.intensity = 12 + Math.sin(t * 2) * 8;
    this.menuMonsters.forEach((m, i) => { const p = m.userData.parts; if (p.head) p.head.rotation.y = Math.sin(t * .7 + i) * .3; if (p.armL) p.armL.rotation.x = Math.sin(t * 1.4 + i) * .15 - .1; if (p.head?.userData.petals) p.head.userData.petals.forEach(h => h.rotation.x = .3 + .5 * (.5 + .5 * Math.sin(t * 2))); if (p.stat) p.stat.visible = Math.random() < .5; if (m.userData.anim) animTick(m, dt, 'idle'); if (m.userData.wiggle) wiggleTick(m, t + i); });
    this.menuCam.position.set(Math.sin(t * .1) * 3, 3.2, 9 + Math.sin(t * .13)); this.menuCam.lookAt(0, 2.4, -6);
    const u = this.post.uniforms; u.uGrey.value = 0; u.uRed.value = .03; u.uVig.value = 1.2; u.uGrain.value = .07; u.uAb.value = 1; u.uExp.value = 2; u.uFade.value = 0;
    this.render(this.menuScene, this.menuCam);
  }
  // ---------------- flight cutscene ----------------
  buildFlight() {
    const s = this.flightScene = new THREE.Scene(); s.fog = new THREE.FogExp2('#0a0d14', .025); s.background = new THREE.Color('#06080e');
    this.flightCam = new THREE.PerspectiveCamera(50, 1, .3, 300);
    s.add(new THREE.HemisphereLight('#6070b0', '#202018', 1.6)); const moon = new THREE.DirectionalLight('#a0b4ff', 2.6); moon.position.set(-10, 30, 10); s.add(moon);
    const gt = tex('grass', 1).clone(); gt.repeat.set(40, 40); gt.needsUpdate = true; this.flightTex = gt;
    const g = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ map: gt, roughness: 1 })); g.rotation.x = -Math.PI / 2; s.add(g);
    const n = 400; this.flightTrees = new THREE.InstancedMesh(new THREE.ConeGeometry(1.6, 6, 7), new THREE.MeshStandardMaterial({ color: '#1c2e1a', flatShading: true }), n); const d = new THREE.Object3D(); this.flightTreePos = [];
    for (let i = 0; i < n; i++) { const p = new THREE.Vector3((Math.random() - .5) * 200, 3, (Math.random() - .5) * 300); this.flightTreePos.push(p); }
    s.add(this.flightTrees); this.flightDummy = d;
    this.flightHeli = buildHelicopter('#2d4a34'); s.add(this.flightHeli);
    const sl = new THREE.SpotLight('#fff', 80, 80, .3, .6, 1); sl.position.set(0, 0, 0); this.flightHeli.add(sl); sl.target.position.set(0, -30, 20); this.flightHeli.add(sl.target);
  }
  renderFlight(dt, t, f) {
    const h = this.flightHeli; h.position.set(Math.sin(t * .8) * 1.5, 26 + Math.sin(t * 1.7) * .6, 0); h.rotation.set(.12, 0, Math.sin(t * .8) * .08); this.spinHeli(h, dt, t, 30);
    const d = this.flightDummy; this.flightTreePos.forEach((p, i) => { p.z -= dt * 30; if (p.z < -150) p.z += 300; d.position.copy(p); d.updateMatrix(); this.flightTrees.setMatrixAt(i, d.matrix); }); this.flightTrees.instanceMatrix.needsUpdate = true;
    this.flightTex.offset.y += dt * 30 / 10;
    this.flightCam.position.set(-9 + Math.sin(t * .3) * 1.5, 31, -11); this.flightCam.lookAt(h.position.x, h.position.y - 2.5, h.position.z + 3);
    const u = this.post.uniforms; u.uGrey.value = 0; u.uRed.value = f.monster ? .15 : 0; u.uVig.value = 1.3; u.uGrain.value = .07; u.uAb.value = .8; u.uExp.value = 2.2; u.uFade.value = Math.max(0, 1 - f.elapsed * 2, (f.left < .4 ? 1 - f.left / .4 : 0));
    this.render(this.flightScene, this.flightCam);
  }
  // ---------------- jumpscare ----------------
  buildScare() {
    const s = this.scareScene = new THREE.Scene(); s.background = new THREE.Color('#000'); s.fog = new THREE.Fog('#000', 4, 14);
    this.scareCam = new THREE.PerspectiveCamera(50, 1, .05, 50);
    this.scareLight = new THREE.PointLight('#ffffff', 30, 12, 1.5); s.add(this.scareLight); this.scareRed = new THREE.PointLight('#ff1010', 20, 12, 1.5); s.add(this.scareRed);
    s.add(new THREE.AmbientLight('#301010', .6));
  }
  // every monster has its own animated jumpscare; game.js cuts to black (optional blood splatter) at the impact moment
  renderScare(dt, t, sc) {
    const key = modelKey(sc.type, sc.fm);
    if (this.scareKind !== key) { if (this.scareModel) this.scareScene.remove(this.scareModel); this.scareModel = buildMonster(key); lodTick(this.scareModel, 0); this.scareScene.add(this.scareModel); this.scareKind = key; }
    const M = this.scareModel, p = M.userData.parts, e = sc.elapsed, cam = this.scareCam, k = sc.type;
    M.position.set(0, 0, 0); M.rotation.set(0, 0, 0); M.scale.set(1, 1, 1); M.visible = true; this.scareRed.color.set('#ff1010'); const big = P2.has(k); this.scareScene.fog.far = big ? 45 : 14; this.scareLight.distance = big ? 40 : 12; this.scareRed.distance = big ? 40 : 12;
    const hp = new THREE.Vector3(); M.updateMatrixWorld(true); (p.head || M).getWorldPosition(hp);
    const fnaf = ['freddy', 'bonnie', 'chica', 'foxy', 'springtrap'].includes(k);
    const ease = x => x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x);
    let shake = .03, red = .3, ab = 4, fov = 50, look = hp.clone(), pos;
    if (fnaf) { // classic: it stands still in the dark, then rushes the camera screaming, jaw wide open
      const lunge = ease((e - .35) / .5); pos = new THREE.Vector3(hp.x, hp.y - .05, hp.z + 4.5 - lunge * 3.75); shake = e > .35 ? .1 : .01;
      const jaw = M.getObjectByName('jaw'); if (jaw) jaw.rotation.x = e > .35 ? .55 + Math.sin(t * 50) * .1 : 0;
      if (p.armL) p.armL.rotation.x = -1.3 * lunge; if (p.armR) p.armR.rotation.x = -1.3 * lunge;
    } else if (k === 'sonicexe') { // grabs, then lunges: arms snap forward, it leaps up into your face
      const lunge = ease((e - .9) / .45); M.position.z = -2 + ease(e / .9) * 1.2 + lunge * 1.4; M.position.y = Math.sin(lunge * Math.PI) * .4;
      if (p.armL) p.armL.rotation.x = -1.5; if (p.armR) p.armR.rotation.x = -1.5; pos = new THREE.Vector3(0, 1.55, 1.2); look = new THREE.Vector3(0, hp.y + M.position.y, M.position.z); shake = .02 + lunge * .12;
      M.rotation.z = Math.sin(t * 30) * .05 * (1 - lunge);
    } else if (k === 'sirenhead') { // lifts you from the ground up toward its siren head
      const up = ease(e / 1.7); pos = new THREE.Vector3(.3, .9 + up * (hp.y + 1.3 - .9), 1.2 + (1 - up) * 1.5); look = new THREE.Vector3(0, hp.y + 1.9 * (1 - up * .3), 0);
      if (p.armR) p.armR.rotation.x = -1.2 - up * .9; shake = .05 + up * .08; red = .2;
      if (p.head) p.head.rotation.z = Math.sin(t * 6) * .12;
    } else if (k === 'cartooncat') { // grabs you and stretches you out like rubber (the picture warps), grinning
      const st = ease(e / 1.7); pos = new THREE.Vector3(0, hp.y - .1, hp.z + 2.2 - st * 1.3); fov = 50 + st * 55; shake = .03;
      if (p.armL) p.armL.rotation.x = -1.6; if (p.armR) p.armR.rotation.x = -1.6; M.scale.set(1, 1 + st * .25, 1);
    } else if (k === 'demogorgon') { // petal face blooms open as it lunges
      const lunge = ease((e - .6) / .6); pos = new THREE.Vector3(hp.x, hp.y, hp.z + 3.4 - lunge * 2.7);
      if (p.head?.userData.petals) p.head.userData.petals.forEach(h => h.rotation.x = .2 + ease(e / .9) * 1.15);
      if (p.armL) p.armL.rotation.x = -1.4 * lunge; if (p.armR) p.armR.rotation.x = -1.4 * lunge; shake = .03 + lunge * .1;
    } else if (k === 'locust') { // possession: it leans in close, the picture tears and jitters (game.js adds static)
      const lean = ease(e / 1.6); pos = new THREE.Vector3(hp.x + Math.sin(t * 13) * .05, hp.y, hp.z + 2.6 - lean * 2.1); shake = .04 + lean * .15; ab = 18 * lean + 4;
      if (p.stat) p.stat.visible = Math.random() < .7; if (p.head) p.head.rotation.z = Math.sin(t * 70) * .2 * lean;
    } else if (k === 'monochrome') { // it just stares while you dissolve into grey blocks (game.js)
      pos = new THREE.Vector3(hp.x, hp.y, hp.z + 2.4 - e * .4); shake = .005; red = 0; ab = 2;
    } else if (k === 'drnowhere') { // each form: injection rush, cone slam from above, shadow engulf, six arms close in
      const f = sc.fm || 0, lunge = ease((e - .5) / .7);
      if (f === 1) { pos = new THREE.Vector3(0, 1.4 + ease(e / 1.2) * 2.6, 2.4 - lunge * 1.2); shake = .05 + lunge * .15; if (p.head) p.head.rotation.x = .6 * lunge; }
      else if (f === 2) { pos = new THREE.Vector3(hp.x, hp.y, hp.z + 3 - lunge * 2.6); M.scale.setScalar(1 + lunge * .4); shake = .03; red = .1; }
      else if (f === 3) { pos = new THREE.Vector3(0, hp.y - .8, 1.6 - lunge * .5); p.body.children.forEach(o => { if (o.userData.low) o.rotation.x = -1.5 * lunge; }); shake = .04 + lunge * .1; }
      else { pos = new THREE.Vector3(hp.x, hp.y, hp.z + 3.4 - lunge * 2.8); if (p.armR) p.armR.rotation.x = -1.7 * lunge; shake = .03 + lunge * .1; }
    } else if (P2.has(k)) { const r2 = this.scare2(k, sc, M, p, hp, e, t, dt, ease); pos = r2.pos; look = r2.look; shake = r2.shake ?? .03; red = r2.red ?? .3; ab = r2.ab ?? 4; fov = r2.fov ?? 50; }
    else { const lunge = ease((e - .3) / .8); pos = new THREE.Vector3(hp.x, hp.y, hp.z + 4 - lunge * 3.2); shake = .03 + lunge * .1; }
    if (this.scareWater) { this.scareWater.visible = SEA.has(k) && !(k === 'megalodon' && sc.fm === 1); this.scareSwarm.visible = k === 'megalodon' && sc.fm !== 1 && e < 2.2; }
    cam.fov = fov; cam.updateProjectionMatrix();
    cam.position.set(pos.x + (Math.random() - .5) * shake, pos.y + (Math.random() - .5) * shake, pos.z); cam.lookAt(look);
    this.scareLight.position.set(hp.x, hp.y - 1.2, hp.z + 1.8); this.scareLight.intensity = Math.random() < .2 ? 5 : 35; this.scareRed.position.set(hp.x + 1, hp.y + 1, hp.z + 1);
    if (p.head && !fnaf && k !== 'sirenhead' && k !== 'locust') p.head.rotation.z = Math.sin(t * 40) * .05;
    const u = this.post.uniforms; u.uGrey.value = k === 'monochrome' ? 1 : 0; u.uRed.value = red + Math.random() * .15; u.uVig.value = 1.5; u.uGrain.value = .25; u.uAb.value = ab; u.uExp.value = 2.2; u.uFade.value = 0; u.uFlash.value = e < .06 ? .5 : 0;
    this.render(this.scareScene, cam);
  }
  // phase 2 jumpscares: one choreography per creature (teen level: lunges, bites and cut-to-black, no gore)
  scare2(k, sc, M, p, hp, e, t, dt, ease) {
    const V = (x, y, z) => new THREE.Vector3(x, y, z), fm = sc.fm || 0, sc3 = this.scareScene;
    if (!this.scareWater) { const w = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.MeshStandardMaterial({ color: '#1c4a5c', transparent: true, opacity: .55, roughness: .1, metalness: .4, depthWrite: false, side: THREE.DoubleSide })); w.rotation.x = -Math.PI / 2; sc3.add(w); this.scareWater = w;
      const sw = new THREE.Group(); for (let i = 0; i < 12; i++) { const f = new THREE.Mesh(G.cone(.35, .9, 4), mat('#2a343c', { r: .4 })); f.scale.set(.25, 1, 1); f.userData.a = i / 12 * Math.PI * 2; f.userData.r = 3 + (i % 3) * 1.6; sw.add(f); } sc3.add(sw); this.scareSwarm = sw; }
    if (M.userData.anim) animTick(M, dt, e > .8 ? 'attack' : 'run', 1.2); if (M.userData.wiggle) wiggleTick(M, t * 2.5);
    const flick = () => { this.scareLight.intensity = Math.random() < .3 ? 2 : 40; };
    if (k === 'megalodon' && fm !== 1) { // swarmed by fins → a shadow rises beneath → it leaps, swallows, dives
      this.scareSwarm.children.forEach(f => { const a = f.userData.a + t * 1.4, r = f.userData.r * (1 - ease((e - 1.2) / .8) * .6); f.position.set(Math.cos(a) * r, .3, Math.sin(a) * r); f.rotation.y = -a; });
      M.rotation.set(-Math.PI / 2, 0, 0); const rise = e < 1.0 ? -16 : e < 1.9 ? -16 + ease((e - 1) / .9) * 8 : -8 + ease((e - 1.9) / 1.0) * 11.5;
      M.position.set(0, rise, 1.4); M.scale.setScalar(1); const headY = rise + 6.4;
      const lift = Math.max(0, headY - .6), cam = V(0, .7 + lift * .9, 0);
      const look = e < 1.0 ? V(Math.cos(t * 1.2) * 4, .2, Math.sin(t * 1.2) * 4) : e < 2.2 ? V(0, -6, .3) : V(0, headY - 2, .2);
      return { pos: cam, look, shake: e < 1 ? .03 : e < 1.9 ? .05 + (e - 1) * .06 : .2, red: e > 2.2 ? .5 : .15, ab: e > 1.9 ? 10 : 4, fov: e > 2.3 ? 70 : 55 }; }
    if (k === 'kraken' || k === 'leviathan') { // rises from the deep, coils/tentacles close in, the beak/jaws lunge
      const up = ease(e / 1.2), lunge = ease((e - 1.4) / .7); M.position.y = -6 + up * 6; M.rotation.y = k === 'leviathan' ? Math.sin(t * .8) * .4 : 0;
      const orb = (1 - lunge) * (k === 'leviathan' ? t * .9 : .25), d = 9 - lunge * 6.5;
      return { pos: V(Math.sin(orb) * d, 1.6 + lunge * (hp.y - 1.6) * .7, hp.z + Math.cos(orb) * d), look: V(0, hp.y + M.position.y * .5, hp.z), shake: .04 + lunge * .15, red: .25 }; }
    if (k === 'cthulhu') { // towering out of the storm: lightning, red eyes, then the face comes down
      const lunge = ease((e - 1.5) / .8); M.position.y = -3 + ease(e / 1.4) * 3; M.scale.setScalar(1 + lunge * .2); if (Math.random() < .08) this.post.uniforms.uFlash.value = .6;
      return { pos: V(0, 1.4 + lunge * (hp.y - 2), 12 - lunge * 7), look: V(0, hp.y * (1 - lunge * .3), hp.z), shake: .06 + lunge * .14, red: .35, fov: 60 - lunge * 12 }; }
    if (k === 'mosasaurus') { // a tail flick, then it bursts straight up out of the water at you
      const lunge = ease((e - .6) / .6); M.rotation.set(-1.2 * (1 - lunge * .6), 0, 0); M.position.set(0, -7 + lunge * 7.4, 1.2 + 2 * (1 - lunge));
      return { pos: V(0, 1.4, 5.2), look: V(0, -1.5 + lunge * 3, 1), shake: .03 + lunge * .18, red: .3, fov: 58 }; }
    if (k === 'nessie') { // the long neck rises out of the loch, then the head drops onto you
      const up = ease(e / 1.3), dn = ease((e - 1.5) / .7); M.position.y = -7 + up * 7; M.position.z = -3;
      return { pos: V(0, 1.3, 6), look: V(0, hp.y - 1 - dn * (hp.y - 2.5), hp.z - 3 + dn * 3), shake: .03 + dn * .15, fov: 62 - dn * 10 }; }
    if (k === 'spinosaurus' || k === 'trex') { // thundering steps (each one shakes), a roar, then the bite
      const app = ease(e / 1.5), bite = ease((e - 1.6) / .5), step = Math.abs(Math.sin(e * 6)); M.position.z = -9 + app * 6;
      return { pos: V(0, 1.4 + bite * (hp.y - 2.2), hp.z - 9 + app * 6 + 5.5 - bite * 4.6), look: V(0, hp.y - 1, hp.z - 9 + app * 6), shake: .02 + step * .12 * (1 - bite) + bite * .15, red: .3 }; }
    if (k === 'quetzalcoatlus' || k === 'dragon') { // a dive out of the sky; the dragon lands and breathes fire
      const dv = ease(e / 1.5), fin = ease((e - 1.6) / .6); M.position.set(0, 14 * (1 - dv), -14 * (1 - dv)); M.rotation.x = .6 * (1 - dv);
      if (k === 'dragon' && e > 1.5) { this.post.uniforms.uFlash.value = .15 + fin * .5; this.scareRed.color.set('#ff7a1a'); this.scareRed.intensity = 60; } else this.scareRed.color.set('#ff1010');
      return { pos: V(0, 1.4 + fin * (hp.y - 1.6), hp.z + 5 - fin * 4.2), look: V(0, hp.y + M.position.y, hp.z + M.position.z), shake: .03 + fin * .14, red: k === 'dragon' ? .45 : .3, fov: 58 }; }
    if (k === 'yeti' || k === 'bigfoot') { // a silhouette in the blizzard/trees, a chest-beating roar, then the grab
      const roar = e > .6 && e < 1.5, lunge = ease((e - 1.5) / .5); if (p.armL) p.armL.rotation.x = roar ? -2.4 + Math.sin(t * 18) * .4 : -1.4 * lunge; if (p.armR) p.armR.rotation.x = roar ? -2.4 - Math.sin(t * 18) * .4 : -1.4 * lunge;
      if (p.head) p.head.rotation.x = roar ? -.4 : 0; return { pos: V(hp.x, hp.y - .2, hp.z + 5 - lunge * 4.2), look: hp, shake: roar ? .09 : .02 + lunge * .14, red: .25 }; }
    if (k === 'chupacabra') { // it skitters in from the side and leaps
      const run = ease(e / 1.1), lp = ease((e - 1.2) / .45); M.position.set(-6 * (1 - run), Math.sin(lp * Math.PI) * 1.2, -2 + lp * 1.5); M.rotation.y = 1.2 * (1 - run);
      return { pos: V(0, .9, hp.z + 1.4), look: V(M.position.x, hp.y + M.position.y, hp.z + M.position.z), shake: .03 + lp * .16, red: .3 }; }
    if (k === 'vampire') { // bats, you turn around — it is right behind you — and it bites
      const turn = ease((e - .7) / .5), bite = ease((e - 1.5) / .5); flick(); if (p.armL) p.armL.rotation.x = -1.2; if (p.armR) p.armR.rotation.x = -1.2;
      const ang = Math.PI * (1 - turn); return { pos: V(Math.sin(ang) * .4, hp.y - .05, hp.z + 1.6 - bite * 1.1 + Math.cos(ang) * .2), look: V(Math.sin(ang) * -6 + hp.x * turn, hp.y, hp.z - Math.cos(ang) * 4 * (1 - turn)), shake: .02 + bite * .12, red: .4 }; }
    if (k === 'gargoyle') { // a stone statue... that suddenly pounces from its perch
      const still = e < 1.1, lp = ease((e - 1.1) / .45); M.position.set(0, 3 * (1 - lp), -3 + lp * 2.4); if (still) this.scareLight.intensity = 30;
      return { pos: V(0, 1.5, hp.z + 2.6), look: V(0, hp.y + M.position.y, hp.z + M.position.z), shake: still ? 0 : .18, red: still ? 0 : .35, ab: still ? 1 : 8 }; }
    if (k === 'fester') { // the lights flicker and each time it is closer, grinning wider
      const st = Math.min(3, Math.floor(e / .55)); flick(); M.position.z = -6 + st * 2.1 + ease((e - 1.75) / .4) * 2.4; M.visible = this.scareLight.intensity > 5 || e > 1.75;
      return { pos: V(0, hp.y - .1, hp.z + 3.2), look: V(0, hp.y, hp.z + M.position.z), shake: .02 + (e > 1.75 ? .14 : 0), red: .35, fov: 52 }; }
    // land-form Megalodon: a giant shark-man charges and bites
    const lunge = ease((e - .5) / .7); if (p.armL) p.armL.rotation.x = -1.5 * lunge; if (p.armR) p.armR.rotation.x = -1.5 * lunge;
    return { pos: V(hp.x, hp.y - .1, hp.z + 4.6 - lunge * 3.9), look: hp, shake: .03 + lunge * .14, red: .35 };
  }
  // other players near a catch see it happen in the world: the victim is lifted / stretched / dissolved / dragged, then vanishes
  addWitness(m) {
    const c = this.chars.get(m.id); const src = c ? c.obj : null; if (!src) return;
    const dummy = src.clone(true); dummy.traverse(o => { if (o.material) o.material = Array.isArray(o.material) ? o.material.map(x => x.clone()) : o.material.clone(); });
    if (dummy.userData.tag) { const tg = dummy.children.find(ch => ch.isSprite); dummy.children.filter(ch => ch.isSprite).forEach(ch => dummy.remove(ch)); }
    dummy.position.set(m.x * S, 0, m.y * S); dummy.rotation.copy(src.rotation); this.scene.add(dummy);
    (this.witness = this.witness || []).push({ o: dummy, kind: m.by, born: performance.now(), mx: m.mx * S, mz: m.my * S });
  }
  updateWitness() {
    if (!this.witness) return; const now = performance.now();
    for (let i = this.witness.length - 1; i >= 0; i--) {
      const w = this.witness[i], e = window.NH && window.NH.killHold != null ? Math.min(2.1, window.NH.killHold) : (now - w.born) / 1000, o = w.o, k = w.kind;
      if (e > 2.2) { this.scene.remove(o); this.sparks(o.position.clone().setY(1), '#333', 30, 3); this.witness.splice(i, 1); continue; }
      const toM = new THREE.Vector3(w.mx - o.position.x, 0, w.mz - o.position.z);
      if (k === 'sirenhead' || k === 'quetzalcoatlus' || k === 'dragon' || k === 'gargoyle') { o.position.y = Math.min(8, e * (k === 'sirenhead' ? 3.2 : 4.5)); if (k !== 'sirenhead') o.position.addScaledVector(toM.clone().normalize(), .02); }
      else if (SEA.has(k)) { o.position.y = -Math.min(2.4, e * 1.4); o.rotation.z = Math.sin(e * 9) * .25; if (Math.random() < .2) this.sparks(o.position.clone().setY(.3), '#e0f4ff', 6, 3); }
      else if (k === 'vampire') { o.position.y = Math.min(1.2, e * .8); o.rotation.y += .15; if (Math.random() < .15) this.sparks(o.position.clone().setY(1.6), '#2a1018', 6, 3); }
      else if (k === 'fester') { o.visible = Math.random() < .6; }
      else if (k === 'cartooncat') o.scale.set(Math.max(.3, 1 - e * .35), 1 + e * 1.2, Math.max(.3, 1 - e * .35));
      else if (k === 'monochrome') o.traverse(x => { if (x.material && !Array.isArray(x.material)) { x.material.transparent = true; x.material.opacity = Math.max(0, 1 - e / 1.8); } });
      else if (k === 'locust') { o.position.x += (Math.random() - .5) * .08; o.rotation.z = Math.sin(e * 40) * .2; }
      else { if (toM.length() > .6) o.position.addScaledVector(toM.normalize(), .03); o.rotation.x = -Math.min(1.3, e * 1.2); o.position.y = Math.sin(Math.min(1, e) * Math.PI) * .4; }
    }
  }
  flashScreen(v = .7) { this.post.uniforms.uFlash.value = v; }
}
