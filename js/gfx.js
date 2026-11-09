// Night Hunt v1.6 graphics layer: quality tiers, post-processing (SSAO, bloom, volumetric fog + god rays, depth of field,
// colour grading), PCSS soft shadows, photo-scanned PBR surface sets with anti-tiling, wet-surface + wind-sway shader patches,
// a moonlit HDRI sky dome and the ocean / swamp water shader. Everything degrades gracefully on phones (?gfx=low|med|high|ultra).
import * as THREE from '../vendor/three.module.min.js';

const DOC = typeof document !== 'undefined';
export const TIER_NAMES = ['low', 'med', 'high', 'ultra'];
const coarse = DOC && (matchMedia('(pointer:coarse)').matches || navigator.maxTouchPoints > 0);
function pickTier() {
  if (!DOC) return 'low';
  const q = new URLSearchParams(location.search).get('gfx'); if (TIER_NAMES.includes(q)) return q;
  try { const s = localStorage.getItem('nh_gfx'); if (TIER_NAMES.includes(s)) return s; } catch (e) { /* private mode */ }
  if (coarse) return Math.min(screen.width, screen.height) >= 700 && (navigator.hardwareConcurrency || 4) >= 6 ? 'med' : 'low';
  return 'high';
}
export const TIER = pickTier();
export const AUTO = DOC && !new URLSearchParams(location.search).get('gfx') && !(() => { try { return localStorage.getItem('nh_gfx'); } catch (e) { return null; } })();
const PRESETS = {
  //       pixel ratio cap, MSAA, moon shadow map, flashlight shadow, SSAO taps, volumetric steps (+shadowed shafts), bloom mips, DOF, foliage density, PCSS
  low:   { pr: 1,    msaa: 0, shadow: 0,    flashShadow: 256,  ssao: 0,  vol: 0,  volShadow: false, bloom: 0, dof: false, fol: .28, pcss: false, aniso: 1,  realFol: false },
  med:   { pr: 1.25, msaa: 0, shadow: 1024, flashShadow: 512,  ssao: 0,  vol: 8,  volShadow: false, bloom: 3, dof: false, fol: .55, pcss: false, aniso: 2,  realFol: false },
  high:  { pr: 1.75, msaa: 4, shadow: 2048, flashShadow: 1024, ssao: 10, vol: 18, volShadow: true,  bloom: 5, dof: true,  fol: 1,   pcss: true,  aniso: 8,  realFol: true },
  ultra: { pr: 2,    msaa: 4, shadow: 4096, flashShadow: 2048, ssao: 16, vol: 28, volShadow: true,  bloom: 6, dof: true,  fol: 1.5, pcss: true,  aniso: 16, realFol: true },
};
export const GFX = { tier: TIER, ...PRESETS[TIER] };
export function setTier(t) { try { if (t === 'auto') localStorage.removeItem('nh_gfx'); else localStorage.setItem('nh_gfx', t); } catch (e) { /* ignore */ } }

// ---------- shared shader uniforms (time, rain wetness, wind) ----------
export const GU = { uTime: { value: 0 }, uWet: { value: 0 }, uWind: { value: 1 }, uRain: { value: 0 } };
const NH_GLSL = `
#ifndef NH_COMMON
#define NH_COMMON
uniform float uTime; uniform float uWet; uniform float uWind; uniform float uRain;
float nhHash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float nhNoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(nhHash(i), nhHash(i + vec2(1., 0.)), f.x), mix(nhHash(i + vec2(0., 1.)), nhHash(i + vec2(1., 1.)), f.x), f.y); }
#endif
`;
// chainable onBeforeCompile patches (the fade-hole, anti-tiling, wetness, wind ... can all stack on one material)
export function patch(m, key, fn) {
  const L = m.userData._nhp || (m.userData._nhp = []); if (L.some(p => p.key === key)) return m;
  L.push({ key, fn });
  m.onBeforeCompile = sh => { Object.assign(sh.uniforms, GU); sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>' + NH_GLSL); sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>' + NH_GLSL); for (const p of L) p.fn(sh, m); };
  m.customProgramCacheKey = () => L.map(p => p.key).join('|'); m.needsUpdate = true; return m;
}
const WPOS_VS = (instanced = true) => `
  vec4 nhW4 = vec4(transformed, 1.);
  #ifdef USE_INSTANCING
  ${instanced ? 'nhW4 = instanceMatrix * nhW4;' : ''}
  #endif
  vNhW = (modelMatrix * nhW4).xyz;
  vec3 nhN = objectNormal;
  #ifdef USE_INSTANCING
  nhN = mat3(instanceMatrix) * nhN;
  #endif
  vNhN = normalize(mat3(modelMatrix) * nhN);`;
function worldVaryings(sh) {
  if (sh.vertexShader.includes('vNhW')) return;
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vNhW; varying vec3 vNhN;').replace('#include <project_vertex>', '#include <project_vertex>' + WPOS_VS());
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vNhW; varying vec3 vNhN;');
}
// photo-scanned ground: two rotated scales blended by noise + large-scale tone variation, so the tiling disappears
export function antiTile(m) {
  return patch(m, 'tile', sh => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', `
#ifdef USE_MAP
  { vec2 uA = vMapUv; vec2 uB = mat2(.8253, -.5646, .5646, .8253) * vMapUv * .43 + vec2(.37, .11);
    vec4 cA = texture2D(map, uA), cB = texture2D(map, uB);
    float bl = smoothstep(.3, .7, nhNoise(vMapUv * .19 + 3.1));
    vec4 sc = mix(cA, cB, bl); sc.rgb *= .78 + .44 * nhNoise(vMapUv * .041 + 7.3);
    diffuseColor *= sc; }
#endif`);
  });
}
// rain: everything gets darker and glossier; flat ground grows puddles with animated rain ripples
export function wet(m, puddles = true) {
  return patch(m, puddles ? 'wetP' : 'wet', sh => {
    worldVaryings(sh);
    sh.fragmentShader = sh.fragmentShader.replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
  float nhPud = 0.;
  ${puddles ? 'nhPud = smoothstep(.55, .66, nhNoise(vNhW.xz * .16) * .7 + nhNoise(vNhW.xz * .7) * .3) * smoothstep(.75, .95, vNhN.y);' : ''}
  float nhWa = uWet * (.6 + .4 * nhPud);
  roughnessFactor = mix(roughnessFactor, mix(.3, .03, nhPud), nhWa);
  diffuseColor.rgb *= mix(1., mix(.6, .35, nhPud), nhWa);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
  if (uWet > 0.) { float pu = ${puddles ? 'smoothstep(.55, .66, nhNoise(vNhW.xz * .16) * .7 + nhNoise(vNhW.xz * .7) * .3) * smoothstep(.75, .95, vNhN.y)' : '0.'};
    normal = normalize(mix(normal, nonPerturbedNormal, pu * uWet));
    vec2 rp = vNhW.xz * 1.6; vec2 g = vec2(0.);
    for (int k = 0; k < 2; k++) { vec2 c = floor(rp + float(k) * .5); vec2 o = vec2(nhHash(c), nhHash(c + 7.)) ; vec2 f = rp + float(k) * .5 - c - o;
      float ph = fract(uTime * .8 + nhHash(c + 3.)); float r = length(f); float ring = sin((r - ph * .6) * 45.) * exp(-r * 9.) * (1. - ph);
      g += f / max(r, 1e-3) * ring; }
    normal = normalize(normal + (viewMatrix * vec4(g.x, 0., g.y, 0.)).xyz * .35 * uRain * max(pu, .25 * uWet)); }`);
  });
}
// foliage sways in the wind (whole plant bends from its base; leaves flutter)
export function wind(m, amp = .08, flutter = .02, base = 0) {
  return patch(m, 'wind' + amp + '_' + base, sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
  { vec3 ip = vec3(0.);
    #ifdef USE_INSTANCING
    ip = instanceMatrix[3].xyz;
    #endif
    vec3 wb = (modelMatrix * vec4(ip, 1.)).xyz; float hh = max(position.y - (${base.toFixed(3)}), 0.);
    float ph = uTime * 1.25 + wb.x * .21 + wb.z * .17;
    float gust = .55 + .45 * sin(uTime * .31 + wb.x * .013 + wb.z * .011);
    float bend = (sin(ph) * .7 + sin(ph * 2.3 + 1.7) * .3) * gust * uWind * ${amp.toFixed(3)} * hh * hh;
    transformed.x += bend; transformed.z += bend * .45;
    transformed += normal * sin(uTime * 7. + position.x * 9. + position.z * 7. + wb.x) * ${flutter.toFixed(3)} * hh * uWind; }`);
  });
}

// ---------- photo-scanned PBR sets (public/models/ground, CC0 Poly Haven) ----------
const TL = DOC ? new THREE.TextureLoader() : null, PBR = {}, CLONES = new WeakMap();
function ld(url, srgb) { const cl = []; const t = TL.load(url, () => { for (const c of cl) c.needsUpdate = true; cl.length = 0; }); CLONES.set(t, cl); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = GFX.aniso; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; }
export function pbrSet(k) { const b = new URL('../models/ground/' + k, import.meta.url).href; return PBR[k] || (PBR[k] = { col: ld(b + '_col.jpg', true), nor: ld(b + '_nor.jpg'), rough: ld(b + '_rough.jpg') }); }
// clones made before the photo has loaded get re-uploaded once it arrives
export const pbrRep = (t, x, y) => { const c = t.clone(); c.repeat.set(x, y); if (t.image) c.needsUpdate = true; else CLONES.get(t)?.push(c); return c; };
const rep = pbrRep;
export function pbrMat(k, rx, ry = rx, o = {}) {
  const s = pbrSet(k), m = new THREE.MeshStandardMaterial({ map: rep(s.col, rx, ry), normalMap: rep(s.nor, rx, ry), roughnessMap: rep(s.rough, rx, ry), roughness: o.r ?? 1, metalness: o.m ?? 0, color: o.color || '#ffffff' });
  const ns = o.ns ?? 1; m.normalScale.set(ns, ns); if (o.tile) antiTile(m); return m;
}

// ---------- foliage cards + small CC0 nature models ----------
const NAT = {};
export function natTex(k) { return NAT[k] || (NAT[k] = (() => { const t = TL.load(new URL('../models/nature/' + k + '.png', import.meta.url).href); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = GFX.aniso; return t; })()); }

// ---------- PCSS soft shadows (contact-hardening: sharp at the base of an object, soft further away) ----------
let pcssDone = false;
export function installPCSS() {
  if (pcssDone || !GFX.pcss) return; pcssDone = true;
  let c = THREE.ShaderChunk.shadowmap_pars_fragment;
  const fn = `
float nhPCSS(sampler2D sm, vec2 size, float radius, vec4 sc) {
  vec2 tx = 1. / size; float an = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) * 6.2832; vec2 ro = vec2(cos(an), sin(an));
  float zb = 0., nb = 0.;
  for (int i = 0; i < 12; i++) { float r = sqrt((float(i) + .5) / 12.); float a = float(i) * 2.39996; vec2 o = vec2(cos(a), sin(a)) * r; o = vec2(o.x * ro.x - o.y * ro.y, o.x * ro.y + o.y * ro.x);
    float d = unpackRGBAToDepth(texture2D(sm, sc.xy + o * tx * 9. * radius)); if (d < sc.z) { zb += d; nb += 1.; } }
  if (nb < .5) return 1.;
  zb /= nb; float pen = clamp((sc.z - zb) * 260., 1., 7.) * radius; float s = 0.;
  for (int i = 0; i < 16; i++) { float r = sqrt((float(i) + .5) / 16.); float a = float(i) * 2.39996 + 1.; vec2 o = vec2(cos(a), sin(a)) * r; o = vec2(o.x * ro.x - o.y * ro.y, o.x * ro.y + o.y * ro.x);
    s += step(sc.z, unpackRGBAToDepth(texture2D(sm, sc.xy + o * tx * pen))); }
  return s / 16.;
}
float getShadow( sampler2D shadowMap`;
  c = c.replace('float getShadow( sampler2D shadowMap', fn);
  c = c.replace(/#if defined\( SHADOWMAP_TYPE_PCF \)\s*\n(\s*)vec2 texelSize/, '#if defined( SHADOWMAP_TYPE_PCF )\n shadow = nhPCSS( shadowMap, shadowMapSize, shadowRadius, shadowCoord );\n #elif defined( NH_NEVER )\n$1vec2 texelSize');
  THREE.ShaderChunk.shadowmap_pars_fragment = c;
}

// ---------- sky dome: CC0 Poly Haven night HDRIs (tonemapped top half), horizon melts into the fog, an HDR moon disc ----------
const SKYTEX = {};
export function skyTex(k) { return SKYTEX[k] || (SKYTEX[k] = (() => { const t = TL.load(new URL('../models/sky/' + k + '.jpg', import.meta.url).href); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; return t; })()); }
const SKY_FN = `
uniform sampler2D tSky; uniform vec3 uTint, uFogC, uMoonDir, uMoonC; uniform float uRot, uMoonI;
vec3 skyCol(vec3 d) {
  float el = asin(clamp(d.y, -1., 1.)); float v = 1. - (1.5708 - el) / (.53 * 3.14159);
  vec3 c = texture2D(tSky, vec2(atan(d.z, d.x) / 6.2832 + .5 + uRot, clamp(v, .002, .998))).rgb * uTint;
  c = mix(uFogC, c, smoothstep(-.02, .32, d.y));
  float md = dot(d, uMoonDir); c += uMoonC * (pow(max(md, 0.), 900.) * 1.2 + pow(max(md, 0.), 40.) * .05) * uMoonI;
  return c;
}`;
export function makeSky() {
  const m = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { tSky: { value: skyTex('milky') }, uTint: { value: new THREE.Color(.3, .3, .35) }, uFogC: { value: new THREE.Color() }, uMoonDir: { value: new THREE.Vector3(0, .5, -1).normalize() }, uMoonC: { value: new THREE.Color('#dfe6ff') }, uRot: { value: 0 }, uMoonI: { value: 1 } },
    vertexShader: 'varying vec3 vD; void main(){ vD = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.); gl_Position = p.xyww; }',
    fragmentShader: SKY_FN + `
varying vec3 vD;
void main(){ vec3 d = normalize(vD); vec3 c = skyCol(d);
  float md = dot(d, uMoonDir); float disc = smoothstep(.99965, .99975, md);
  vec2 mp = vec2(dot(d, normalize(cross(uMoonDir, vec3(0., 1., 0.)))), d.y - uMoonDir.y) * 900.;
  float cr = .78 + .22 * sin(mp.x * .9 + sin(mp.y * .7) * 2.) * sin(mp.y * 1.1);
  c += uMoonC * disc * 9. * cr * uMoonI;
  gl_FragColor = vec4(c, 1.); }` });
  const s = new THREE.Mesh(new THREE.SphereGeometry(200, 48, 24), m); s.frustumCulled = false; s.renderOrder = -10; s.userData.sky = true; return s;
}

// ---------- water: wave normals, Fresnel sky reflection, moon glints, crest + shoreline foam, rain ripples ----------
export function waterMat(o = {}) {
  const m = new THREE.MeshStandardMaterial({ color: o.deep || '#0b2630', roughness: .06, metalness: 0, transparent: !!o.alpha, opacity: o.alpha || 1 });
  m.userData.water = { tSky: { value: o.sky || skyTex('milky') }, uTint: { value: new THREE.Color(.3, .3, .35) }, uFogC: { value: new THREE.Color() }, uMoonDir: { value: new THREE.Vector3(0, .5, -1).normalize() }, uMoonC: { value: new THREE.Color('#dfe6ff') }, uRot: { value: 0 }, uMoonI: { value: 1 },
    uShal: { value: new THREE.Color(o.shallow || '#2c6a70') }, uFoamC: { value: new THREE.Color(o.foam || '#c8d4d8') }, uAmp: { value: o.amp ?? 1 }, uIsl: { value: new Array(16).fill(0).map(() => new THREE.Vector3(-1e5, -1e5, 0)) }, uIslN: { value: 0 }, uMurk: { value: o.murk ?? 0 } };
  return patch(m, 'water' + (o.murk ? 'm' : ''), sh => {
    Object.assign(sh.uniforms, m.userData.water); worldVaryings(sh);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + SKY_FN + `
uniform vec3 uShal, uFoamC; uniform float uAmp, uMurk; uniform vec3 uIsl[16]; uniform int uIslN;
float nhWaveH(vec2 p, out vec2 g) { g = vec2(0.); float h = 0.;
  vec4 W[5]; W[0] = vec4(.86, .5, .23, .55); W[1] = vec4(-.6, .8, .37, .35); W[2] = vec4(.2, -.98, .61, .22); W[3] = vec4(-.93, -.36, 1.13, .12); W[4] = vec4(.5, .86, 1.9, .06);
  for (int i = 0; i < 5; i++) { vec2 d = W[i].xy; float k = W[i].z, a = W[i].w * uAmp, ph = dot(d, p) * k + uTime * sqrt(9.8 * k) * .7;
    h += a * sin(ph); g += d * a * k * cos(ph); }
  vec2 q = p * 1.7 + uTime * vec2(.31, .17); float n0 = nhNoise(q), nx = nhNoise(q + vec2(.05, 0.)), nz = nhNoise(q + vec2(0., .05));
  g += vec2(nx - n0, nz - n0) / .05 * .08 * uAmp; h += n0 * .15 * uAmp; return h; }
float nhShore(vec2 p) { float s = 1e4; for (int i = 0; i < 16; i++) { if (i >= uIslN) break; s = min(s, length(p - uIsl[i].xy) - uIsl[i].z); } return s; }`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
  vec2 wG; float wH = nhWaveH(vNhW.xz, wG);
  vec3 wN = normalize(vec3(-wG.x, 1., -wG.y));
  { vec2 rp = vNhW.xz * 2.2; vec2 g2 = vec2(0.); for (int k = 0; k < 2; k++) { vec2 c = floor(rp + float(k) * .5); vec2 f = rp + float(k) * .5 - c - vec2(nhHash(c), nhHash(c + 7.));
      float ph = fract(uTime * .9 + nhHash(c + 3.)); float r = length(f); g2 += f / max(r, 1e-3) * sin((r - ph * .6) * 50.) * exp(-r * 10.) * (1. - ph); }
    wN = normalize(wN + vec3(g2.x, 0., g2.y) * .3 * uRain); }
  normal = normalize((viewMatrix * vec4(wN, 0.)).xyz);
  float wShore = nhShore(vNhW.xz);
  float wFoam = smoothstep(.55, 1.05, wH / max(uAmp, .01) + nhNoise(vNhW.xz * .9 + uTime * .2) * .5) * step(.001, uAmp) * .8;
  wFoam += smoothstep(3., 0., wShore) * (.55 + .45 * sin(wShore * 3. - uTime * 2.)) * smoothstep(.25, .65, nhNoise(vNhW.xz * 1.3 + uTime * .1));
  wFoam = clamp(wFoam, 0., 1.);
  diffuseColor.rgb = mix(mix(uShal, diffuseColor.rgb, smoothstep(0., 9., wShore)), uFoamC, wFoam);
  roughnessFactor = mix(.05, .75, wFoam);`)
            .replace('#include <opaque_fragment>', `
  { float r2 = mix(.06, .8, wFoam); vec3 V = normalize(cameraPosition - vNhW); vec3 Rd = reflect(-V, wN); Rd.y = abs(Rd.y);
    float fr = .02 + .98 * pow(1. - max(dot(V, wN), 0.), 5.);
    outgoingLight += skyCol(Rd) * fr * (1. - r2) * (1. - uMurk * .6);
    float gl = pow(max(dot(Rd, uMoonDir), 0.), 600.) * 14. * uMoonI; outgoingLight += uMoonC * gl * (1. - wFoam);
    outgoingLight = mix(outgoingLight, outgoingLight * vec3(.55, .62, .4), uMurk * (1. - fr)); }
#include <opaque_fragment>`);
  });
}

// ---------- post-processing ----------
const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }';
const DEPTH_FN = `
uniform sampler2D tDepth; uniform mat4 uProjInv;
vec3 nhView(vec2 uv) { float d = texture2D(tDepth, uv).x; vec4 c = vec4(uv * 2. - 1., d * 2. - 1., 1.); vec4 v = uProjInv * c; return v.xyz / v.w; }`;
const AO_FS = DEPTH_FN + `
varying vec2 vUv; uniform vec2 uTexel; uniform float uR, uP11, uAsp;
void main(){
  vec3 P = nhView(vUv); float z = -P.z; if (z > 120.) { gl_FragColor = vec4(1.); return; }
  vec3 ax = nhView(vUv + vec2(uTexel.x, 0.)) - P, bx = P - nhView(vUv - vec2(uTexel.x, 0.));
  vec3 ay = nhView(vUv + vec2(0., uTexel.y)) - P, by = P - nhView(vUv - vec2(0., uTexel.y));
  vec3 N = normalize(cross(dot(ax, ax) < dot(bx, bx) ? ax : bx, dot(ay, ay) < dot(by, by) ? ay : by)); if (dot(N, P) > 0.) N = -N;
  float rs = uR * uP11 * .5 / z; float an = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(.06711056, .00583715)))) * 6.2832;
  float ao = 0.;
  for (int i = 0; i < NS; i++) { float t = (float(i) + .5) / float(NS); float a = an + float(i) * 2.39996; vec2 o = vec2(cos(a), sin(a) * uAsp) * rs * t;
    vec3 v = nhView(vUv + o) - P; float vv = dot(v, v); ao += max(0., dot(v, N) - .003 * z) / (vv + .02) * smoothstep(uR * 3., uR * .8, sqrt(vv)); }
  ao = clamp(1. - 1.6 * uR * ao / float(NS), 0., 1.);
  gl_FragColor = vec4(vec3(mix(1., ao * ao, smoothstep(90., 10., z))), 1.); }`;
const VOL_FS = DEPTH_FN + `
#include <packing>
varying vec2 vUv; uniform mat4 uViewInv; uniform vec3 uCam; uniform float uTime, uDens, uHF, uFar, uShOn, uFlOn, uFlShOn;
uniform vec3 uMoonDir, uMoonC, uFlP, uFlD, uFlC; uniform vec2 uFlCos; uniform sampler2D tSh, tFlSh; uniform mat4 uShM, uFlM;
uniform vec4 uLP[4]; uniform vec3 uLC[4];
float hg(float c, float g) { float g2 = g * g; return (1. - g2) / (12.566 * pow(1. + g2 - 2. * g * c, 1.5)); }
float n3(vec3 p) { vec3 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); float n = i.x + i.y * 57. + i.z * 113.;
  #define H(o) fract(sin(n + o) * 43758.5453)
  return mix(mix(mix(H(0.), H(1.), f.x), mix(H(57.), H(58.), f.x), f.y), mix(mix(H(113.), H(114.), f.x), mix(H(170.), H(171.), f.x), f.y), f.z); }
void main(){
  vec3 vp = nhView(vUv); vec3 wp = (uViewInv * vec4(vp, 1.)).xyz; vec3 rd = wp - uCam; float L = length(rd); rd /= L; L = min(L, uFar);
  float j = fract(52.9829189 * fract(dot(gl_FragCoord.xy + fract(uTime * 7.) * 17., vec2(.06711056, .00583715))));
  float st = L / float(NV); vec3 acc = vec3(0.); float T = 1.;
  float pm = hg(dot(rd, uMoonDir), .5) * 6. + .25;
  for (int i = 0; i < NV; i++) {
    vec3 p = uCam + rd * (float(i) + j) * st;
    float den = uDens * exp(-max(p.y, 0.) * uHF) * (.45 + 1.1 * n3(p * .16 + vec3(uTime * .15, 0., uTime * .07)));
    float sh = 1.;
    if (uShOn > .5) { vec4 sc = uShM * vec4(p, 1.); sc.xyz /= sc.w; if (sc.x > 0. && sc.x < 1. && sc.y > 0. && sc.y < 1. && sc.z < 1.) sh = step(sc.z - .003, unpackRGBAToDepth(texture2D(tSh, sc.xy))); }
    vec3 Li = uMoonC * pm * sh;
    if (uFlOn > .5) { vec3 fl = p - uFlP; float fd = length(fl); vec3 fdn = fl / fd; float cone = smoothstep(uFlCos.x, uFlCos.y, dot(fdn, uFlD));
      if (cone > 0.) { float fs = 1.; if (uFlShOn > .5) { vec4 sc = uFlM * vec4(p, 1.); sc.xyz /= sc.w; if (sc.x > 0. && sc.x < 1. && sc.y > 0. && sc.y < 1.) fs = step(sc.z - .002, unpackRGBAToDepth(texture2D(tFlSh, sc.xy))); }
        Li += uFlC * cone * fs * hg(dot(fdn, -rd), .35) / (1. + fd * fd * .05); } }
    for (int k = 0; k < 4; k++) { vec3 q = p - uLP[k].xyz; float dd = dot(q, q); Li += uLC[k] * hg(dot(q * inversesqrt(dd + 1e-4), -rd), .25) / (1. + dd * .6) * smoothstep(uLP[k].w * uLP[k].w, 0., dd); }
    float a = exp(-den * st); acc += T * Li * (1. - a); T *= a; }
  gl_FragColor = vec4(acc, T); }`;
const DOWN_FS = `varying vec2 vUv; uniform sampler2D tIn; uniform vec2 uTexel; uniform float uThr, uKnee;
void main(){ vec2 o = uTexel; vec3 c = (texture2D(tIn, vUv + vec2(-o.x, -o.y)).rgb + texture2D(tIn, vUv + vec2(o.x, -o.y)).rgb + texture2D(tIn, vUv + vec2(-o.x, o.y)).rgb + texture2D(tIn, vUv + vec2(o.x, o.y)).rgb) * .125 + texture2D(tIn, vUv).rgb * .5;
  #ifdef THRESH
  float l = max(c.r, max(c.g, c.b)); float s = clamp(l - uThr + uKnee, 0., 2. * uKnee); s = s * s / (4. * uKnee + 1e-4); c *= max(s, l - uThr) / max(l, 1e-4); c = min(c, vec3(40.));
  #endif
  gl_FragColor = vec4(c, 1.); }`;
const UP_FS = `varying vec2 vUv; uniform sampler2D tIn; uniform vec2 uTexel; uniform float uK;
void main(){ vec2 o = uTexel; vec3 c = texture2D(tIn, vUv).rgb * 4. + (texture2D(tIn, vUv + vec2(o.x, 0.)).rgb + texture2D(tIn, vUv - vec2(o.x, 0.)).rgb + texture2D(tIn, vUv + vec2(0., o.y)).rgb + texture2D(tIn, vUv - vec2(0., o.y)).rgb) * 2.
  + texture2D(tIn, vUv + o).rgb + texture2D(tIn, vUv - o).rgb + texture2D(tIn, vUv + vec2(o.x, -o.y)).rgb + texture2D(tIn, vUv + vec2(-o.x, o.y)).rgb; gl_FragColor = vec4(c / 16. * uK, 1.); }`;
export const COMP_FS = `
#include <packing>
uniform sampler2D tDiffuse, tDepth, tAO, tVol, tBloom, tDofA, tDofB; uniform float uTime, uVig, uGrain, uGrey, uRed, uAb, uExp, uFade, uFlash, uAO, uVolK, uVolExt, uBloom, uDof, uFocus, uFocusR, uNear, uFar, uSat;
uniform vec2 uRes, uHalfTexel; uniform vec3 uLift, uGamma, uGain;
varying vec2 vUv;
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
vec3 aces(vec3 x){ x *= .6; return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14), 0., 1.); }
vec3 toSRGB(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1./2.4)) - .055, step(vec3(.0031308), c)); }
void main(){
  vec2 c = vUv - .5; float d2 = dot(c, c);
  vec2 off = c * d2 * uAb * .012;
  vec3 col = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
  #ifdef USE_DEPTH
  float vz = -perspectiveDepthToViewZ(texture2D(tDepth, vUv).x, uNear, uFar);
  #endif
  #ifdef USE_DOF
  if (uDof > 0.) { float coc = clamp(abs(vz - uFocus) / uFocusR, 0., 1.) * uDof;
    col = mix(col, texture2D(tDofA, vUv).rgb, smoothstep(0., .45, coc)); col = mix(col, texture2D(tDofB, vUv).rgb, smoothstep(.45, 1., coc)); }
  #endif
  #ifdef USE_AO
  { vec2 h = uHalfTexel; float ao = (texture2D(tAO, vUv + h).r + texture2D(tAO, vUv - h).r + texture2D(tAO, vUv + vec2(h.x, -h.y)).r + texture2D(tAO, vUv + vec2(-h.x, h.y)).r) * .25;
    col *= mix(1., ao, uAO); }
  #endif
  #ifdef USE_VOL
  { vec2 h = uHalfTexel * 1.5; vec4 v = (texture2D(tVol, vUv + h) + texture2D(tVol, vUv - h) + texture2D(tVol, vUv + vec2(h.x, -h.y)) + texture2D(tVol, vUv + vec2(-h.x, h.y))) * .25;
    col = col * mix(1., v.a, uVolExt) + v.rgb * uVolK; }
  #endif
  #ifdef USE_BLOOM
  col += texture2D(tBloom, vUv).rgb * uBloom;
  #endif
  col = aces(col * uExp);
  col = pow(max(col * uGain + uLift * (1. - col), 0.), 1. / uGamma);
  float l = dot(col, vec3(.299,.587,.114));
  col = mix(vec3(l), col, uSat);
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
export class PostFX {
  constructor(renderer) {
    const r = this.r = renderer, g = GFX;
    const halfOK = r.extensions.has('EXT_color_buffer_half_float') || r.extensions.has('EXT_color_buffer_float'), HT = halfOK ? THREE.HalfFloatType : THREE.UnsignedByteType;
    this.needDepth = !!(g.ssao || g.vol || g.dof);
    this.rt = new THREE.WebGLRenderTarget(4, 4, { type: HT, samples: g.msaa });
    if (this.needDepth) { this.rt.depthTexture = new THREE.DepthTexture(4, 4); this.rt.depthTexture.type = THREE.UnsignedIntType; }
    const T = (k = 1) => new THREE.WebGLRenderTarget(4, 4, { type: HT, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
    this.aoT = g.ssao ? new THREE.WebGLRenderTarget(4, 4, { depthBuffer: false }) : null;
    this.volT = g.vol ? T() : null;
    this.bl = g.bloom ? Array.from({ length: g.bloom }, () => T()) : [];
    this.dA = g.dof ? T() : null; this.dB = g.dof ? T() : null;
    const quad = (fs, uni, defs = {}) => { const m = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: fs, uniforms: uni, defines: defs, depthTest: false, depthWrite: false }); return m; };
    const dep = () => ({ tDepth: { value: this.rt.depthTexture }, uProjInv: { value: new THREE.Matrix4() } });
    if (g.ssao) this.aoM = quad(AO_FS, { ...dep(), uTexel: { value: new THREE.Vector2() }, uR: { value: .55 }, uP11: { value: 1 }, uAsp: { value: 1 } }, { NS: g.ssao });
    if (g.vol) this.volM = quad(VOL_FS, { ...dep(), uViewInv: { value: new THREE.Matrix4() }, uCam: { value: new THREE.Vector3() }, uTime: { value: 0 }, uDens: { value: .04 }, uHF: { value: .12 }, uFar: { value: 70 }, uShOn: { value: 0 }, uFlOn: { value: 0 }, uFlShOn: { value: 0 },
      uMoonDir: { value: new THREE.Vector3(0, 1, 0) }, uMoonC: { value: new THREE.Color() }, uFlP: { value: new THREE.Vector3() }, uFlD: { value: new THREE.Vector3(0, 0, 1) }, uFlC: { value: new THREE.Color() }, uFlCos: { value: new THREE.Vector2(.9, .95) },
      tSh: { value: null }, tFlSh: { value: null }, uShM: { value: new THREE.Matrix4() }, uFlM: { value: new THREE.Matrix4() }, uLP: { value: [0, 0, 0, 0].map(() => new THREE.Vector4(0, -999, 0, 0)) }, uLC: { value: [0, 0, 0, 0].map(() => new THREE.Color(0, 0, 0)) } }, { NV: g.vol });
    this.downT = quad(DOWN_FS, { tIn: { value: null }, uTexel: { value: new THREE.Vector2() }, uThr: { value: 1.1 }, uKnee: { value: .5 } }, { THRESH: 1 });
    this.down = quad(DOWN_FS, { tIn: { value: null }, uTexel: { value: new THREE.Vector2() }, uThr: { value: 0 }, uKnee: { value: 0 } });
    this.up = quad(UP_FS, { tIn: { value: null }, uTexel: { value: new THREE.Vector2() }, uK: { value: 1 } }); this.up.blending = THREE.AdditiveBlending; this.up.transparent = true;
    const defs = {}; if (this.needDepth) defs.USE_DEPTH = 1; if (g.ssao) defs.USE_AO = 1; if (g.vol) defs.USE_VOL = 1; if (g.bloom) defs.USE_BLOOM = 1; if (g.dof) defs.USE_DOF = 1;
    this.comp = quad(COMP_FS, { tDiffuse: { value: this.rt.texture }, tDepth: { value: this.rt.depthTexture }, tAO: { value: this.aoT?.texture }, tVol: { value: this.volT?.texture }, tBloom: { value: this.bl[0]?.texture }, tDofA: { value: this.dA?.texture }, tDofB: { value: this.dB?.texture },
      uTime: { value: 0 }, uVig: { value: 1 }, uGrain: { value: .06 }, uGrey: { value: 0 }, uRed: { value: 0 }, uAb: { value: .6 }, uExp: { value: 1.6 }, uFade: { value: 0 }, uFlash: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) }, uHalfTexel: { value: new THREE.Vector2() },
      uAO: { value: .85 }, uVolK: { value: 1 }, uVolExt: { value: .2 }, uBloom: { value: .55 }, uDof: { value: 0 }, uFocus: { value: 10 }, uFocusR: { value: 8 }, uNear: { value: .3 }, uFar: { value: 260 }, uSat: { value: 1 },
      uLift: { value: new THREE.Vector3(0, 0, 0) }, uGamma: { value: new THREE.Vector3(1, 1, 1) }, uGain: { value: new THREE.Vector3(1, 1, 1) } }, defs);
    this.scene = new THREE.Scene(); this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.comp); this.mesh.frustumCulled = false; this.scene.add(this.mesh); this.cam = new THREE.Camera();
    this.u = this.comp.uniforms; this.vol = { moon: null, flash: null, lights: [], dens: .04, on: true };
  }
  setSize(w, h) {
    this.w = w; this.h = h; this.rt.setSize(w, h);
    const hw = Math.max(1, w >> 1), hh = Math.max(1, h >> 1);
    if (this.aoT) this.aoT.setSize(hw, hh); if (this.volT) this.volT.setSize(hw, hh);
    this.bl.forEach((t, i) => t.setSize(Math.max(1, w >> (i + 1)), Math.max(1, h >> (i + 1))));
    if (this.dA) { this.dA.setSize(hw, hh); this.dB.setSize(Math.max(1, w >> 2), Math.max(1, h >> 2)); }
    this.u.uHalfTexel.value.set(1 / hw, 1 / hh);
  }
  pass(m, target, clear = true) { this.mesh.material = m; const r = this.r; r.setRenderTarget(target); if (clear) r.clear(true, false, false); r.render(this.scene, this.cam); }
  render(scene, cam) {
    const r = this.r, g = GFX, u = this.u; r.setRenderTarget(this.rt); r.render(scene, cam);
    const ac = r.autoClear; r.autoClear = false;
    if (this.needDepth) { u.uNear.value = cam.near; u.uFar.value = cam.far; }
    if (this.aoM) { const a = this.aoM.uniforms; a.uProjInv.value.copy(cam.projectionMatrixInverse); a.uTexel.value.set(2 / this.w, 2 / this.h); a.uP11.value = cam.projectionMatrix.elements[5]; a.uAsp.value = this.w / this.h; this.pass(this.aoM, this.aoT); }
    if (this.volM) { const v = this.volM.uniforms, V = this.vol; v.uProjInv.value.copy(cam.projectionMatrixInverse); v.uViewInv.value.copy(cam.matrixWorld); v.uCam.value.setFromMatrixPosition(cam.matrixWorld); v.uTime.value = u.uTime.value;
      v.uDens.value = V.on ? V.dens : 0; v.uHF.value = V.hf ?? .12; v.uFar.value = V.far ?? 70;
      const mo = V.moon; if (mo && mo.intensity > 0) { v.uMoonDir.value.copy(mo.position).sub(mo.target.position).normalize(); v.uMoonC.value.copy(mo.color).multiplyScalar(mo.intensity * (V.moonK ?? .08));
        const sm = g.volShadow && mo.castShadow && mo.shadow.map; v.uShOn.value = sm ? 1 : 0; if (sm) { v.tSh.value = mo.shadow.map.texture; v.uShM.value.copy(mo.shadow.matrix); } } else { v.uMoonC.value.setRGB(0, 0, 0); v.uShOn.value = 0; }
      const fl = V.flash; if (fl && fl.intensity > 0) { v.uFlOn.value = 1; v.uFlP.value.copy(fl.position); v.uFlD.value.copy(fl.target.position).sub(fl.position).normalize(); v.uFlC.value.copy(fl.color).multiplyScalar(fl.intensity * (V.flashK ?? .05));
        v.uFlCos.value.set(Math.cos(fl.angle), Math.cos(fl.angle * (1 - fl.penumbra * .8))); const fs = g.volShadow && fl.castShadow && fl.shadow.map; v.uFlShOn.value = fs ? 1 : 0; if (fs) { v.tFlSh.value = fl.shadow.map.texture; v.uFlM.value.copy(fl.shadow.matrix); } } else v.uFlOn.value = 0;
      for (let k = 0; k < 4; k++) { const l = V.lights[k]; if (l && l.intensity > 0 && l.visible !== false) { v.uLP.value[k].set(l.position.x, l.position.y, l.position.z, l.distance || 20); v.uLC.value[k].copy(l.color).multiplyScalar(l.intensity * (V.lampK ?? .02)); } else v.uLC.value[k].setRGB(0, 0, 0); }
      this.pass(this.volM, this.volT); }
    if (this.bl.length) { let src = this.rt.texture, sw = this.w, sh = this.h;
      this.bl.forEach((t, i) => { const m = i === 0 ? this.downT : this.down; m.uniforms.tIn.value = src; m.uniforms.uTexel.value.set(1 / sw, 1 / sh); this.pass(m, t); src = t.texture; sw = t.width; sh = t.height; });
      for (let i = this.bl.length - 1; i > 0; i--) { const lo = this.bl[i]; this.up.uniforms.tIn.value = lo.texture; this.up.uniforms.uTexel.value.set(1 / lo.width, 1 / lo.height); this.up.uniforms.uK.value = 1; this.pass(this.up, this.bl[i - 1], false); } }
    if (this.dA && u.uDof.value > 0) { this.down.uniforms.tIn.value = this.rt.texture; this.down.uniforms.uTexel.value.set(1 / this.w, 1 / this.h); this.pass(this.down, this.dA);
      this.down.uniforms.tIn.value = this.dA.texture; this.down.uniforms.uTexel.value.set(1 / this.dA.width, 1 / this.dA.height); this.pass(this.down, this.dB); }
    r.autoClear = ac; this.mesh.material = this.comp; r.setRenderTarget(null); r.render(this.scene, this.cam);
  }
}
