// 3D models built from primitives: fan-made monsters, survivors, helicopter, props.
// Units are metres, feet at y=0, models face +Z.
import * as THREE from '../vendor/three.module.min.js';
import { tex, faceTex, glowTex, oldWallpaper } from './textures.js';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import { clone as skClone } from '../vendor/SkeletonUtils.js';
import { realize, realizeHuman, prepGLBGeometry, realSetup, lodTick, isLow, realReady } from './realism.js';
export { realSetup, lodTick, realReady };

const geo = {};
function cg(k, make) { if (geo[k]) return geo[k]; const g = make(); g.userData.shared = 1; geo[k] = g; return g; }
// DET > 1 while a monster is being built on desktop: rounder silhouettes (more segments) for the realistic surfaces
let DET = 1; const dq = n => DET === 1 ? n : Math.min(64, Math.round(n * DET));
const G = {
  box: (x, y, z) => cg('b' + [x, y, z], () => new THREE.BoxGeometry(x, y, z)),
  sph: (r, w = 18, h = 14, ...x) => { w = dq(w); h = dq(h); return cg('s' + [r, w, h, ...x], () => new THREE.SphereGeometry(r, w, h, ...x)); },
  cyl: (a, b, h, s = 14, ...x) => { s = dq(s); return cg('c' + [a, b, h, s, ...x], () => new THREE.CylinderGeometry(a, b, h, s, ...x)); },
  cone: (r, h, s = 12) => { s = s <= 4 ? s : dq(s); return cg('k' + [r, h, s], () => new THREE.ConeGeometry(r, h, s)); },
  cap: (r, l) => cg('p' + [r, l, DET], () => new THREE.CapsuleGeometry(r, l, dq(6), dq(12))),
  tor: (r, t) => cg('t' + [r, t], () => new THREE.TorusGeometry(r, t, 8, 24)),
};
export { G };

function mat(color, o = {}) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: o.r ?? .75, metalness: o.m ?? 0, flatShading: !!o.flat });
  if (o.map) { m.map = tex(o.map, o.rep || 1); m.userData.tx = o.map; }
  if (o.bump) { m.bumpMap = tex(o.bump, o.rep || 1, { bump: true }); m.bumpScale = o.bs ?? 1.5; }
  if (o.e) { m.emissive = new THREE.Color(o.e); m.emissiveIntensity = o.ei ?? 2; }
  return m;
}
export { mat };
function add(parent, g, m, p = [0, 0, 0], r = [0, 0, 0], s) {
  const o = new THREE.Mesh(g, m); o.position.set(...p); o.rotation.set(...r); if (s) o.scale.set(...s);
  o.castShadow = true; o.receiveShadow = true; parent.add(o); return o;
}
function grp(parent, p = [0, 0, 0], name) { const g = new THREE.Group(); g.position.set(...p); if (name) g.name = name; parent.add(g); return g; }
function glow(parent, color, p, size = .35) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(color), color: 0xffffff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  s.position.set(...p); s.scale.set(size, size, size); s.userData.glow = true; parent.add(s); return s;
}
// limb from pivot downward: returns pivot group
function limb(parent, p, len, r, m, joint, lower) {
  const piv = grp(parent, p);
  add(piv, G.cyl(r, r * .85, len), m, [0, -len / 2, 0]); add(piv, G.sph(r, 12, 8), m, [0, 0, 0]); // rounded shoulder/hip
  if (!joint && !lower) add(piv, G.sph(r * .85, 12, 8), m, [0, -len, 0]);
  if (joint) add(piv, G.sph(r * 1.15, 10, 8), joint, [0, -len, 0]);
  if (lower) { const low = grp(piv, [0, -len, 0]); add(low, G.cyl(r * .85, r * .7, lower), m, [0, -lower / 2, 0]); if (!joint) add(low, G.sph(r * .85, 12, 8), m, [0, 0, 0]); add(low, G.sph(r * .7, 12, 8), m, [0, -lower, 0]); piv.userData.low = low; }
  return piv;
}

// ---------- FNAF-style animatronic base ----------
function animatronic(root, c) {
  const fur = mat(c.body, { map: 'fur', bump: 'fur', bs: 2, r: .9 });
  const belly = mat(c.belly, { map: 'fur', bump: 'fur', r: .9 });
  const endo = mat('#6e6e72', { map: 'metal', m: .8, r: .45 });
  const dark = mat('#141414', { r: .6 });
  const H = c.h || 1;
  const body = grp(root, [0, 0, 0], 'body');
  // legs
  const legL = limb(body, [-.22, 1.02 * H, 0], .5 * H, .15, fur, endo, .45 * H); legL.name = 'legL';
  const legR = limb(body, [.22, 1.02 * H, 0], .5 * H, .15, fur, endo, .45 * H); legR.name = 'legR';
  for (const l of [legL, legR]) add(l.userData.low, G.box(.3, .14, .42), fur, [0, -.45 * H, .08]);
  // torso + belly
  add(body, G.sph(.5), fur, [0, 1.45 * H, 0], [0, 0, 0], [1.05, 1.15 * H, .82]);
  add(body, G.sph(.42), belly, [0, 1.38 * H, .1], [0, 0, 0], [.9, 1 * H, .7]);
  add(body, G.cyl(.09, .09, .25), endo, [0, 1.98 * H, 0]); // neck rod
  // arms
  const armL = limb(body, [-.6, 1.78 * H, 0], .5 * H, .12, fur, endo, .45 * H); armL.name = 'armL'; armL.rotation.z = -.15;
  const armR = limb(body, [.6, 1.78 * H, 0], .5 * H, .12, fur, endo, .45 * H); armR.name = 'armR'; armR.rotation.z = .15;
  for (const a of [armL, armR]) {
    const hand = grp(a.userData.low, [0, -.45 * H, 0]);
    add(hand, G.sph(.13, 10, 8), fur, [0, -.05, 0], [0, 0, 0], [1, .8, .7]);
    for (let i = -1; i <= 1; i++) add(hand, G.cyl(.03, .025, .16, 6), endo, [i * .06, -.18, .03]);
  }
  // head
  const head = grp(body, [0, 2.32 * H, 0], 'head');
  add(head, G.sph(.42), fur, [0, 0, 0], [0, 0, 0], [1.05, .92, .95]);
  add(head, G.sph(.26), belly, [0, -.12, .3], [0, 0, 0], [1.15, .7, .8]); // muzzle
  const jaw = grp(head, [0, -.2, .05], 'jaw');
  add(jaw, G.box(.5, .1, .42), fur, [0, -.06, .18]);
  const teeth = mat('#e8e2cc', { r: .4 });
  for (let i = -3; i <= 3; i++) { add(head, G.box(.05, .07, .04), teeth, [i * .065, -.22, .52]); add(jaw, G.box(.05, .06, .04), teeth, [i * .065, -.01, .38]); }
  const sclera = mat('#f2f2ee', { r: .25 });
  for (const sx of [-.16, .16]) {
    add(head, G.sph(.1, 14, 10), sclera, [sx, .1, .33]);
    if (!(c.patch && sx > 0)) add(head, G.sph(.045, 10, 8), mat(c.eye, { e: c.eye, ei: c.eyeGlow ?? 1.2, r: .2 }), [sx, .1, .42]);
    add(head, G.box(.18, .04, .05), dark, [sx, .22, .36], [0, 0, sx > 0 ? -.25 : .25]); // angry brows
  }
  if (c.eyeGlow) { glow(head, c.eye, [-.16, .1, .46], .25); if (!c.patch) glow(head, c.eye, [.16, .1, .46], .25); }
  if (c.nose !== false) add(head, G.sph(.06, 10, 8), dark, [0, -.02, .53]);
  return { body, head, fur, belly, endo, dark, H, jaw };
}

const B = {};
B.freddy = r => {
  const a = animatronic(r, { body: '#6b4020', belly: '#b9864f', eye: '#3a6ad4', eyeGlow: .8 });
  for (const sx of [-.32, .32]) add(a.head, G.sph(.13, 12, 10), a.fur, [sx, .36, 0], [0, 0, 0], [1, 1, .55]);
  const hat = mat('#101010', { r: .5 });
  add(a.head, G.cyl(.24, .24, .03, 18), hat, [0, .38, 0]); add(a.head, G.cyl(.15, .16, .24, 18), hat, [0, .5, 0]);
  add(a.body, G.box(.32, .14, .1), hat, [0, 2.02, .32]); // bow tie
  for (const y of [1.6, 1.4]) add(a.body, G.sph(.04, 8, 6), hat, [0, y, .48]);
  const mic = mat('#222', { m: .6, r: .3 }); add(a.body.getObjectByName('armR').userData.low, G.cyl(.04, .04, .3, 8), mic, [0, -.5, .1]);
};
B.bonnie = r => {
  const a = animatronic(r, { body: '#4a4aa8', belly: '#a99bd8', eye: '#d03030', eyeGlow: 1.2 });
  for (const sx of [-.15, .15]) { const ear = add(a.head, G.cap(.08, .55), a.fur, [sx, .62, -.05], [0, 0, sx * .6]); ear.scale.set(1, 1, .5); }
  add(a.body, G.box(.32, .12, .1), mat('#a01818'), [0, 2.02, .32]);
  const gu = mat('#b02020', { r: .35, m: .2 }); const g2 = grp(a.body, [0, 1.35, .45]); g2.rotation.z = .7;
  add(g2, G.box(.42, .22, .07), gu); add(g2, G.box(.7, .07, .05), mat('#2a1a10'), [.5, 0, 0]);
};
B.chica = r => {
  const a = animatronic(r, { body: '#e0b412', belly: '#f2dc8a', eye: '#8e44ad', eyeGlow: .9, nose: false });
  add(a.head, G.cone(.16, .3, 10), mat('#f08a12', { r: .4 }), [0, -.05, .58], [Math.PI / 2, 0, 0], [1.4, 1, .6]);
  for (let i = -1; i <= 1; i++) add(a.head, G.cone(.04, .18, 6), a.fur, [i * .05, .46, 0], [0, 0, i * .4]);
  const bib = mat('#f4f4f0', { map: 'cloth', r: .9 }); add(a.body, G.box(.6, .5, .05), bib, [0, 1.55, .42], [-.15, 0, 0]);
  const cup = grp(a.body.getObjectByName('armL').userData.low, [0, -.6, .15]);
  add(cup, G.cyl(.1, .08, .12, 12), mat('#ff7ab6')); add(cup, G.sph(.1, 12, 8), mat('#ffc0dc', { r: .5 }), [0, .08, 0], [0, 0, 0], [1, .6, 1]);
  add(cup, G.sph(.03, 8, 6), mat('#ff2020', { e: '#ff2020', ei: .6 }), [0, .16, 0]); add(cup, G.sph(.025, 8, 6), mat('#fff'), [-.03, .05, .09]);
};
B.foxy = r => {
  const a = animatronic(r, { body: '#9e3226', belly: '#cf8a6a', eye: '#f1c40f', eyeGlow: 1.6, patch: true });
  for (const sx of [-.28, .28]) add(a.head, G.cone(.11, .36, 4), a.fur, [sx, .42, 0], [0, 0, sx > 0 ? -.3 : .3]);
  add(a.head, G.box(.2, .16, .05), a.dark, [.16, .1, .43]); add(a.head, G.box(.9, .02, .02), a.dark, [0, .2, .3], [0, 0, -.35]);
  add(a.head, G.sph(.26), a.fur, [0, -.08, .34], [0, 0, 0], [.95, .65, 1.1]); // long snout
  a.jaw.position.z += .08;
  const hook = mat('#c8c8c8', { m: .9, r: .25 }); const hk = grp(a.body.getObjectByName('armR').userData.low, [0, -.5, 0]);
  add(hk, G.cyl(.03, .03, .18, 8), hook); add(hk, G.tor(.09, .025), hook, [0, -.16, .05], [0, Math.PI / 2, 0]);
  const tail = add(a.body, G.cap(.08, .5), a.fur, [0, 1.1, -.45], [-.9, 0, 0]);
  // torn torso exposes endoskeleton
  add(a.body, G.box(.2, .25, .05), a.endo, [.18, 1.25, .38]); tail.name = 'tail';
};
B.springtrap = r => {
  const a = animatronic(r, { body: '#77763f', belly: '#a29c6a', eye: '#e8e8d8', eyeGlow: 1.4 });
  add(a.head, G.cap(.075, .5), a.fur, [-.15, .62, -.05], [0, 0, -.1]);
  const bent = grp(a.head, [.15, .4, -.05]); bent.rotation.z = -1.1; add(bent, G.cap(.075, .45), a.fur, [0, .25, 0]);
  const wire = mat('#2a2a2a', { r: .5 }), hole = mat('#1a120c', { r: 1 });
  for (const [x, y] of [[.25, 1.6], [-.2, 1.2], [.1, 1.3], [-.28, 1.55], [.3, 1.1], [-.05, 1.75]]) { add(a.body, G.sph(.09, 10, 8), hole, [x, y, .4]); add(a.body, G.cyl(.012, .012, .3, 4), wire, [x, y - .1, .42], [.3, 0, .5]); }
  add(a.head, G.sph(.07, 8, 6), hole, [-.25, .02, .3]); add(a.head, G.sph(.06, 8, 6), hole, [.22, .2, .28]); add(a.head, G.sph(.05, 8, 6), hole, [.05, .32, .3]);
  for (const [x, y, z, rz] of [[-.25, -.05, .32, .4], [.22, .13, .3, -.6], [.27, 1.0, .42, .2]]) add(rz > 0 && y > .5 ? a.body : a.head, G.cyl(.008, .008, .22, 4), wire, [x, y, z], [.2, 0, rz]); // dangling wires add(a.head, G.box(.4, .03, .02), a.endo, [0, -.14, .53]);
};
B.cartooncat = r => {
  const blk = mat('#0b0b0b', { r: .55 }), wht = mat('#f6f6f6', { r: .35 });
  const body = grp(r, [0, 0, 0], 'body');
  const legL = limb(body, [-.18, 1.7, 0], .9, .07, blk, null, .85); legL.name = 'legL';
  const legR = limb(body, [.18, 1.7, 0], .9, .07, blk, null, .85); legR.name = 'legR';
  for (const l of [legL, legR]) add(l.userData.low, G.sph(.13, 10, 8), wht, [0, -.85, .06], [0, 0, 0], [1, .6, 1.4]);
  add(body, G.cap(.24, .7), blk, [0, 2.1, 0], [0, 0, 0], [1, 1, .7]);
  const armL = limb(body, [-.3, 2.45, 0], 1.25, .05, blk, null, 1.2); armL.name = 'armL'; armL.rotation.z = -.35;
  const armR = limb(body, [.3, 2.45, 0], 1.25, .05, blk, null, 1.2); armR.name = 'armR'; armR.rotation.z = .35;
  for (const a of [armL, armR]) { add(a.userData.low, G.sph(.16, 12, 10), wht, [0, -1.25, 0]); for (let i = -1; i <= 1; i++) add(a.userData.low, G.cap(.035, .14), wht, [i * .07, -1.42, .05]); }
  const head = grp(body, [0, 3.05, 0], 'head');
  add(head, G.sph(.52), blk, [0, 0, 0], [0, 0, 0], [1.15, .9, .95]);
  for (const sx of [-.36, .36]) add(head, G.cone(.16, .42, 4), blk, [sx, .48, 0], [0, 0, sx > 0 ? -.35 : .35]);
  for (const sx of [-.2, .2]) { add(head, G.sph(.16, 16, 12), wht, [sx, .12, .4], [0, 0, 0], [.8, 1.1, .5]); add(head, G.sph(.06, 10, 8), blk, [sx * .9, .1, .5]); }
  // enormous grin with teeth
  const grin = new THREE.Mesh(new THREE.SphereGeometry(.5, 32, 12, Math.PI * .02, Math.PI * .96, Math.PI * .5, Math.PI * .26), wht);
  grin.position.set(0, .02, .02); grin.scale.set(1.2, 1, 1.02); head.add(grin);
  for (let i = -6; i <= 6; i++) add(head, G.box(.015, .14, .02), blk, [i * .07, -.16, .5 - Math.abs(i) * .012]);
};
B.sirenhead = r => { // emaciated 7 m giant, dried leathery skin, long pole neck topped with two air-raid siren horns
  const skin = mat('#6a4c36', { map: 'skin', bump: 'skin', bs: 4, r: .95, flat: true });
  const metal = mat('#4e4e4a', { map: 'metal', m: .75, r: .5 }), rust = mat('#6a3a1e', { map: 'metal', m: .5, r: .7 });
  const body = grp(r, [0, 0, 0], 'body');
  const legL = limb(body, [-.22, 3.3, 0], 1.7, .085, skin, skin, 1.6); legL.name = 'legL';
  const legR = limb(body, [.22, 3.3, 0], 1.7, .085, skin, skin, 1.6); legR.name = 'legR';
  for (const l of [legL, legR]) add(l.userData.low, G.box(.16, .06, .38), skin, [0, -1.6, .1]);
  add(body, G.cyl(.26, .15, 1.0, 9), skin, [0, 3.75, 0], [0, 0, 0], [1, 1, .6]); // sunken waist
  add(body, G.cyl(.36, .26, 1.1, 9), skin, [0, 4.75, .05], [.12, 0, 0], [1, 1, .55]); // hunched ribcage
  for (let i = 0; i < 7; i++) add(body, G.tor(.3 - i * .01, .025), skin, [0, 4.35 + i * .12, .06], [Math.PI / 2 + .12, 0, 0], [1, .6, 1]); // protruding ribs
  const armL = limb(body, [-.42, 5.2, 0], 1.9, .055, skin, skin, 1.9); armL.name = 'armL'; armL.rotation.z = -.1;
  const armR = limb(body, [.42, 5.2, 0], 1.9, .055, skin, skin, 1.9); armR.name = 'armR'; armR.rotation.z = .1;
  for (const a of [armL, armR]) for (let i = -2; i <= 2; i++) add(a.userData.low, G.cyl(.018, .01, .42, 5), skin, [i * .035, -2.05, 0]);
  const head = grp(body, [0, 5.35, .1], 'head');
  add(head, G.cyl(.07, .09, 1.9, 8), rust, [0, .95, 0]); // pole neck
  add(head, G.box(1.5, .09, .09), metal, [0, 1.85, 0]); add(head, G.cyl(.05, .05, .5, 6), metal, [0, 1.6, 0]);
  const horn = mat('#2a2a28', { map: 'metal', m: .6, r: .55 }), inside = mat('#0a0a0a', { r: 1 });
  for (const sx of [-.55, .55]) {
    const h = grp(head, [sx, 1.95, 0]); h.rotation.y = sx * .25;
    add(h, G.cyl(.18, .18, .32, 16), metal, [0, 0, -.1], [Math.PI / 2, 0, 0]); // siren motor housing
    add(h, G.cyl(.36, .14, .55, 18, 1, true), horn, [0, 0, .32], [Math.PI / 2, 0, 0]); // flared horn
    add(h, G.cyl(.34, .34, .01, 18), inside, [0, 0, .58], [Math.PI / 2, 0, 0]);
    for (let k = 0; k < 4; k++) add(h, G.box(.012, .5, .012), metal, [0, 0, .55], [0, 0, k * Math.PI / 4]);
  }
};
B.drnowhere = r => {
  const coat = mat('#e6e6e2', { map: 'cloth', r: .85 }), pants = mat('#1c1c24', { map: 'cloth', r: .9 }), pale = mat('#efe2cc', { map: 'skin', r: .6 });
  const blk = mat('#000', { r: 1 });
  const body = grp(r, [0, 0, 0], 'body');
  const legL = limb(body, [-.16, 1.0, 0], .52, .1, pants, null, .48); legL.name = 'legL';
  const legR = limb(body, [.16, 1.0, 0], .52, .1, pants, null, .48); legR.name = 'legR';
  for (const l of [legL, legR]) add(l.userData.low, G.box(.16, .08, .3), blk, [0, -.48, .06]);
  add(body, G.cyl(.32, .46, 1.0, 16), coat, [0, 1.05, 0]); add(body, G.cyl(.28, .32, .65, 16), coat, [0, 1.8, 0]);
  add(body, G.box(.09, .5, .02), mat('#8a1a1a'), [0, 1.85, .29]);
  add(body, G.box(.14, .06, .02), mat('#333'), [-.18, 1.95, .27]); // pocket pen
  const armL = limb(body, [-.38, 2.08, 0], .5, .08, coat, null, .5); armL.name = 'armL';
  const armR = limb(body, [.38, 2.08, 0], .5, .08, coat, null, .5); armR.name = 'armR';
  for (const a of [armL, armR]) for (let i = -2; i <= 2; i++) add(a.userData.low, G.cyl(.012, .01, .22, 5), pale, [i * .025, -.6, 0]);
  const head = grp(body, [0, 2.45, 0], 'head');
  add(head, G.sph(.27, 20, 16), pale, [0, 0, 0], [0, 0, 0], [1, 1.12, 1]);
  for (const sx of [-.1, .1]) add(head, G.sph(.075, 12, 10), blk, [sx, .05, .22], [0, 0, 0], [1, 1.3, .6]);
  add(head, G.box(.2, .012, .02), blk, [0, -.12, .26]);
  add(head, G.tor(.27, .025), mat('#999', { m: .7 }), [0, .15, 0], [Math.PI / 2, 0, 0]);
  add(head, G.cyl(.08, .08, .015, 16), mat('#d8d8e0', { m: 1, r: .1 }), [0, .2, .26], [Math.PI / 2 - .3, 0, 0]);
};
B.locust = r => {
  // The Locust (fan design): a very tall, thin black figure that crawls out of screens. Distorted, stretched human face with hollow
  // black eyes; ribbed cable-like tubes wrap around its head and neck. Static flickers over it from the screen it came out of.
  const black = mat('#060607', { r: .45, m: .15 }), tube = mat('#1c1d20', { r: .35, m: .5 }), face = mat('#8f8a86', { r: .85, map: 'skin', bump: 'skin', bs: 2 }), hole = mat('#000', { r: 1 });
  const body = grp(r, [0, 0, 0], 'body');
  const legL = limb(body, [-.15, 1.45, 0], .78, .06, black, black, .72); legL.name = 'legL';
  const legR = limb(body, [.15, 1.45, 0], .78, .06, black, black, .72); legR.name = 'legR';
  for (const l of [legL, legR]) add(l.userData.low, G.box(.1, .05, .34), black, [0, -.72, .1]);
  add(body, G.cyl(.15, .12, .5, 12), black, [0, 1.65, 0]);                         // narrow hips/waist
  add(body, G.cyl(.25, .15, .75, 12), black, [0, 2.25, 0], [0, 0, 0], [1, 1, .65]);   // gaunt chest
  add(body, G.sph(.26, 14, 10), black, [0, 2.6, 0], [0, 0, 0], [1.25, .5, .7]);       // bony shoulders
  for (const sx of [-1, 1]) { const a = limb(body, [sx * .32, 2.62, 0], .82, .045, black, black, .85); a.name = sx < 0 ? 'armL' : 'armR'; a.rotation.z = sx * .12;
    for (let f = -1; f <= 1; f++) add(a.userData.low, G.cyl(.012, .006, .3, 5), black, [f * .03, -.98, .02], [.15, 0, 0]); }
  // long neck wrapped in tubes
  add(body, G.cyl(.065, .08, .55, 10), black, [0, 2.95, .02]);
  const helix = (rad, y0, y1, turns, tr) => { const pts = []; for (let i = 0; i <= 60; i++) { const k = i / 60, a = k * turns * 6.283; pts.push(new THREE.Vector3(Math.cos(a) * rad, y0 + (y1 - y0) * k, Math.sin(a) * rad)); } return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 90, tr, 7); };
  add(body, helix(.1, 2.72, 3.2, 3.5, .028), tube, [0, 0, .02]); add(body, helix(.12, 2.8, 3.15, -2.5, .022), tube, [0, 0, .02]);
  const head = grp(body, [0, 3.42, .04], 'head');
  // stretched, distorted human face (slightly asymmetric), dark hood/skull behind it
  add(head, G.sph(.21, 18, 14), black, [0, .02, -.05], [0, 0, 0], [1, 1.45, 1.05]);
  add(head, G.sph(.18, 18, 14), face, [0, -.02, .07], [0, 0, .06], [.92, 1.5, .62]);
  for (const [sx, sy, sc] of [[-.068, .08, 1], [.072, .065, 1.2]]) { add(head, G.sph(.045 * sc, 12, 10), hole, [sx, sy, .155], [0, 0, 0], [1, 1.5, .5]); }
  add(head, G.box(.035, .07, .03), face, [0, -.03, .175]);                             // thin nose ridge
  add(head, G.sph(.05, 12, 8), hole, [.01, -.17, .145], [0, 0, .15], [1.5, .55, .4]);     // slack, gaping mouth
  // tubes looping around the head
  for (const [rx, ry, rz, sc] of [[1.25, .2, 0, 1], [1.6, -.4, .3, .9], [.3, 0, 1.4, 1.05]]) { const t = add(head, G.tor(.2 * sc, .022), tube, [0, .03, -.02], [rx, ry, rz]); t.scale.y = 1.25; }
  for (const sx of [-1, 1]) { const c = new THREE.CatmullRomCurve3([new THREE.Vector3(sx * .17, .1, -.05), new THREE.Vector3(sx * .26, -.12, -.1), new THREE.Vector3(sx * .14, -.42, -.05), new THREE.Vector3(sx * .2, -.75, .05)]); add(body, new THREE.TubeGeometry(c, 30, .025, 7), tube, [0, 3.42, .04]); }
  // static lines that flicker
  const st = mat('#dddddd', { e: '#ffffff', ei: 1.5 }); st.transparent = true; st.opacity = .5;
  const stat = grp(body, [0, 0, 0], 'static'); for (let i = 0; i < 10; i++) add(stat, G.box(.55, .012, .01), st, [(Math.random() - .5) * .2, 1.2 + i * .22, .25]);
};
B.boisvert = r => {
  const g1 = mat('#9a9a9a', { r: .6 }), g2 = mat('#d8d8d8', { r: .5 }), g3 = mat('#5c5c5c', { r: .6 });
  const body = grp(r, [0, 0, 0], 'body');
  const legL = grp(body, [-.21, 1.0, 0], 'legL'); add(legL, G.box(.4, 1, .4), g3, [0, -.5, 0]);
  const legR = grp(body, [.21, 1.0, 0], 'legR'); add(legR, G.box(.4, 1, .4), g3, [0, -.5, 0]);
  add(body, G.box(.84, .95, .42), g1, [0, 1.48, 0]);
  add(body, G.box(.3, .3, .02), g3, [-.18, 1.6, .22]); add(body, G.box(.22, .22, .02), g2, [.2, 1.3, .22]);
  const armL = grp(body, [-.62, 1.9, 0], 'armL'); add(armL, G.box(.38, 1, .38), g2, [0, -.45, 0]);
  const armR = grp(body, [.62, 1.9, 0], 'armR'); add(armR, G.box(.38, 1, .38), g2, [0, -.45, 0]);
  const head = grp(body, [0, 2.25, 0], 'head');
  add(head, G.box(.62, .6, .6), g2);
  const blk = mat('#000', { r: 1 });
  for (const sx of [-.13, .13]) { add(head, G.box(.12, .17, .02), blk, [sx, .07, .31]); add(head, G.box(.03, .03, .01), mat('#fff', { e: '#fff', ei: 1 }), [sx - .02, .11, .325]); }
  add(head, G.box(.36, .03, .02), blk, [0, -.13, .31]); add(head, G.box(.03, .07, .02), blk, [-.18, -.1, .31]); add(head, G.box(.03, .07, .02), blk, [.18, -.1, .31]);
};
B.demogorgon = r => {
  const skin = mat('#5a4c46', { map: 'skin', bump: 'skin', bs: 3, r: .35, m: .05 });
  const inner = mat('#7a1018', { r: .3, e: '#300006', ei: .8 }), tooth = mat('#efe8d6', { r: .35 });
  const body = grp(r, [0, 0, 0], 'body');
  const legL = limb(body, [-.17, 1.2, 0], .66, .09, skin, skin, .62); legL.name = 'legL';
  const legR = limb(body, [.17, 1.2, 0], .66, .09, skin, skin, .62); legR.name = 'legR';
  for (const l of [legL, legR]) { l.rotation.x = -.22; l.userData.low.rotation.x = .42; add(l, G.sph(.1, 14, 10), skin, [0, -.25, .02], [0, 0, 0], [1, 2.2, 1.1]); add(l.userData.low, G.sph(.1, 12, 8), skin, [0, -.62, .07], [0, 0, 0], [.8, .35, 1.6]); }
  // gaunt, hunched torso: pelvis, wasp waist, ribcage, spine ridges, collarbones (slick, wet skin)
  add(body, G.sph(.2, 18, 14), skin, [0, 1.25, -.02], [0, 0, 0], [1.15, .7, .8]);
  add(body, G.cap(.13, .3), skin, [0, 1.5, 0], [.12, 0, 0], [1, 1, .8]);
  add(body, G.sph(.26, 20, 16), skin, [0, 1.88, .04], [.25, 0, 0], [1.05, 1.25, .72]);
  for (let i = 0; i < 5; i++) { const rb = add(body, new THREE.TorusGeometry(.21 - Math.abs(i - 2) * .012, .018, 6, 18, Math.PI * .9), skin, [0, 1.76 + i * .065, .07], [Math.PI / 2 + .25, 0, Math.PI * .05]); rb.scale.set(1.1, .82, 1); }
  for (let i = 0; i < 9; i++) add(body, G.sph(.032, 8, 6), skin, [0, 1.4 + i * .1, -.15 - Math.sin(i / 8 * Math.PI) * .06], [0, 0, 0], [1, .7, 1.2]);
  for (const sx of [-1, 1]) { add(body, G.cap(.03, .26), skin, [sx * .15, 2.16, .1], [0, 0, sx * 1.35]); add(body, G.sph(.1, 14, 10), skin, [sx * .33, 2.12, 0], [0, 0, 0], [1, .8, .9]); }
  add(body, G.cap(.07, .14), skin, [0, 2.26, .07], [.6, 0, 0]); // forward-thrust neck
  const armL = limb(body, [-.36, 2.12, 0], .78, .06, skin, skin, .82); armL.name = 'armL';
  const armR = limb(body, [.36, 2.12, 0], .78, .06, skin, skin, .82); armR.name = 'armR';
  armL.rotation.z = -.2; armR.rotation.z = .2;
  for (const a of [armL, armR]) { add(a, G.sph(.07, 12, 8), skin, [0, -.3, 0], [0, 0, 0], [1, 2.4, 1]); add(a.userData.low, G.sph(.055, 12, 8), skin, [0, -.18, 0], [0, 0, 0], [1, 2.6, 1]);
    for (let i = -1.5; i <= 1.5; i++) { const f = grp(a.userData.low, [i * .028, -.84, 0]); f.rotation.set(.25, 0, i * .12); add(f, G.cap(.012, .16), skin, [0, -.09, 0]); const f2 = grp(f, [0, -.18, 0]); f2.rotation.x = .45; add(f2, G.cap(.01, .12), skin, [0, -.07, 0]); add(f2, G.cone(.011, .07, 6), mat('#1c1410', { r: .3 }), [0, -.16, 0], [Math.PI, 0, 0]); } }
  const head = grp(body, [0, 2.45, 0], 'head');
  add(head, G.sph(.16, 14, 10), mat('#2a0408', { r: .25 }), [0, 0, .02]); for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; add(head, G.cone(.012, .06, 6), tooth, [Math.cos(a) * .1, Math.sin(a) * .1, .14], [Math.PI / 2, 0, 0]); } // throat ringed with teeth
  head.userData.petals = [];
  for (let i = 0; i < 5; i++) {
    const p = grp(head, [0, 0, .05]); p.rotation.z = i * Math.PI * 2 / 5;
    const hinge = grp(p, [0, .1, 0]); head.userData.petals.push(hinge);
    add(hinge, G.sph(.2, 12, 8), skin, [0, .22, 0], [0, 0, 0], [.75, 1.3, .25]);
    add(hinge, G.sph(.18, 12, 8), inner, [0, .22, .03], [0, 0, 0], [.6, 1.15, .18]);
    for (let row = 0; row < 3; row++) for (let k = 0; k < 6 - row; k++) { const u = (k - (5 - row) / 2) / 3, y = .12 + row * .1 + u * u * .1; add(hinge, G.cone(.014 - row * .002, .07 - row * .012, 6), tooth, [u * (.2 - row * .04), y, .06], [Math.PI / 2 - .25, 0, 0]); }
  }
};

// ---- Doctor Nowhere's other forms (he shapeshifts every 30s) ----
B.dn_conezone = r => { // Cone Zone: a very tall, slender all-white figure whose head is a long pointed cone
  const w = mat('#ecebe6', { r: .55, map: 'skin', bump: 'skin', bs: 1 }), sh = mat('#bdbcb6', { r: .7 }), blk = mat('#000', { r: 1 });
  const body = grp(r, [0, 0, 0], 'body');
  const legL = limb(body, [-.14, 1.5, 0], .8, .065, w, sh, .75); legL.name = 'legL';
  const legR = limb(body, [.14, 1.5, 0], .8, .065, w, sh, .75); legR.name = 'legR';
  add(body, G.cyl(.2, .13, .9, 12), w, [0, 1.95, 0], [0, 0, 0], [1, 1, .7]);
  add(body, G.sph(.22, 12, 10), w, [0, 2.45, 0], [0, 0, 0], [1.3, .6, .8]);
  for (const sx of [-1, 1]) { const a = limb(body, [sx * .3, 2.45, 0], 1.0, .045, w, sh, 1.0); a.name = sx < 0 ? 'armL' : 'armR'; a.rotation.z = sx * .08;
    for (let f = -1; f <= 1; f++) add(a.userData.low, G.cyl(.012, .006, .28, 5), w, [f * .03, -1.12, 0]); }
  add(body, G.cyl(.05, .06, .3, 8), w, [0, 2.65, 0]);
  const head = grp(body, [0, 2.8, 0], 'head');
  add(head, G.cone(.24, 1.5, 24), w, [0, .72, 0]);                     // the long white cone
  for (let i = 0; i < 4; i++) add(head, G.tor(.2 - i * .045, .008), sh, [0, .15 + i * .3, 0], [Math.PI / 2, 0, 0]);
  add(head, G.sph(.04, 8, 6), blk, [-.07, .2, .19]); add(head, G.sph(.04, 8, 6), blk, [.07, .22, .19]); // two tiny dark pits
};
B.dn_nightmare = r => { // Nightmare Man: a smoky black silhouette with long fingers and a wide pale grin
  const blk = mat('#050507', { r: .9 }), grin = mat('#e8e4d8', { e: '#ffffff', ei: .25, r: .4 });
  const body = grp(r, [0, 0, 0], 'body');
  const legL = limb(body, [-.15, 1.15, 0], .6, .07, blk, null, .55); legL.name = 'legL';
  const legR = limb(body, [.15, 1.15, 0], .6, .07, blk, null, .55); legR.name = 'legR';
  add(body, G.cyl(.3, .16, 1.2, 10), blk, [0, 1.8, 0], [0, 0, 0], [1, 1, .6]);
  for (const sx of [-1, 1]) { const a = limb(body, [sx * .34, 2.3, 0], .8, .045, blk, null, .85); a.name = sx < 0 ? 'armL' : 'armR'; a.rotation.z = sx * .15;
    for (let f = -2; f <= 2; f++) add(a.userData.low, G.cyl(.012, .004, .45, 5), blk, [f * .025, -1.05, .02], [.2, 0, f * .08]); }
  const head = grp(body, [0, 2.65, 0], 'head');
  add(head, G.sph(.25, 16, 12), blk, [0, 0, 0], [0, 0, 0], [1, 1.2, 1]);
  const g = new THREE.Mesh(new THREE.TorusGeometry(.16, .022, 6, 20, Math.PI), grin); g.position.set(0, -.04, .21); g.rotation.z = Math.PI; head.add(g);
  for (let i = -4; i <= 4; i++) add(head, G.box(.012, .04, .01), blk, [i * .033, -.13 + Math.abs(i) * .012, .235]);
  for (const sx of [-.09, .09]) { add(head, G.sph(.03, 8, 6), grin, [sx, .07, .22]); }
  const st = mat('#000', { r: 1 }); st.transparent = true; st.opacity = .35; const stat = grp(body, [0, 0, 0], 'static');
  for (let i = 0; i < 8; i++) add(stat, G.sph(.25 + Math.random() * .2, 8, 6), st, [(Math.random() - .5) * .6, .6 + i * .3, (Math.random() - .5) * .3]); // smoke
};
B.dn_sixarm = r => { // The Doctor (catalogue form): huge, slim, six-armed stalker
  const sk = mat('#b8b2a8', { map: 'skin', bump: 'skin', bs: 2, r: .8 }), dk = mat('#2a2622', { r: .9 }), blk = mat('#000', { r: 1 });
  const body = grp(r, [0, 0, 0], 'body');
  const legL = limb(body, [-.2, 2.0, 0], 1.05, .08, sk, sk, 1.0); legL.name = 'legL';
  const legR = limb(body, [.2, 2.0, 0], 1.05, .08, sk, sk, 1.0); legR.name = 'legR';
  add(body, G.cyl(.32, .2, 1.5, 12), sk, [0, 2.75, 0], [0, 0, 0], [1, 1, .65]);
  for (let i = 0; i < 6; i++) add(body, G.tor(.26, .02), dk, [0, 2.4 + i * .17, .03], [Math.PI / 2, 0, 0], [1, .6, 1]);
  const names = ['armL', 'armR'];
  for (let row = 0; row < 3; row++) for (const sx of [-1, 1]) {
    const a = limb(body, [sx * (.36 - row * .04), 3.35 - row * .32, 0], 1.0 - row * .1, .045, sk, sk, 1.0 - row * .1);
    a.rotation.z = sx * (.12 + row * .35); a.rotation.x = -row * .15; if (row === 0) a.name = names[sx < 0 ? 0 : 1];
    for (let f = -1; f <= 1; f++) add(a.userData.low, G.cyl(.012, .006, .3, 5), sk, [f * .03, -(1.0 - row * .1) - .14, 0]);
  }
  add(body, G.cyl(.07, .09, .5, 8), sk, [0, 3.7, 0]);
  const head = grp(body, [0, 4.1, 0], 'head');
  add(head, G.sph(.22, 16, 12), sk, [0, 0, 0], [0, 0, 0], [.9, 1.3, .95]);
  for (const sx of [-.07, .07]) add(head, G.sph(.05, 10, 8), blk, [sx, .05, .18], [0, 0, 0], [1, 1.4, .5]);
  add(head, G.box(.1, .015, .02), blk, [0, -.13, .2]);
};
// Sonic.exe (fan creepypasta take, procedural, no official assets): blue hedgehog with black eye sockets, glowing red pupils, a too-wide grin
B.sonicexe = r => {
  const blue = mat('#1a3a9c', { map: 'fur', bump: 'fur', bs: 1.5, r: .7 }), peach = mat('#e2b48a', { r: .6 }), wht = mat('#f2f2f2', { r: .4 }), red = mat('#b51418', { r: .35 }), blk = mat('#020202', { r: 1 });
  const body = grp(r, [0, 0, 0], 'body');
  const legL = limb(body, [-.13, .82, 0], .4, .05, blue, null, .38); legL.name = 'legL';
  const legR = limb(body, [.13, .82, 0], .4, .05, blue, null, .38); legR.name = 'legR';
  for (const l of [legL, legR]) { add(l.userData.low, G.sph(.15, 12, 10), red, [0, -.4, .08], [0, 0, 0], [1, .65, 1.7]); add(l.userData.low, G.box(.2, .05, .08), wht, [0, -.36, .1]); }
  add(body, G.sph(.28, 16, 12), blue, [0, 1.05, 0], [0, 0, 0], [1, 1.15, .85]);
  add(body, G.sph(.2, 14, 10), peach, [0, 1.02, .12], [0, 0, 0], [1, 1.2, .6]);
  for (const sx of [-1, 1]) { const a = limb(body, [sx * .3, 1.28, 0], .38, .04, blue, null, .36); a.name = sx < 0 ? 'armL' : 'armR'; a.rotation.z = sx * .25;
    add(a.userData.low, G.sph(.1, 12, 10), wht, [0, -.4, 0]); add(a.userData.low, G.cyl(.075, .075, .08, 10), wht, [0, -.3, 0]); }
  const head = grp(body, [0, 1.65, 0], 'head');
  add(head, G.sph(.36, 20, 16), blue, [0, 0, 0], [0, 0, 0], [1.05, .95, 1]);
  for (let i = 0; i < 3; i++) { add(head, G.cone(.13 - i * .02, .6, 8), blue, [0, .2 - i * .2, -.4], [-1.9 + i * .25, 0, 0]); for (const sx of [-1, 1]) add(head, G.cone(.11, .5, 8), blue, [sx * .2, .12 - i * .2, -.36], [-1.9 + i * .25, sx * .35, 0]); }
  for (const sx of [-1, 1]) add(head, G.cone(.09, .25, 6), blue, [sx * .2, .33, -.02], [0, 0, sx * -.3]);
  add(head, G.sph(.22, 16, 12), wht, [0, .05, .22], [0, 0, 0], [1.25, .75, .6]);           // eye patch
  for (const sx of [-.08, .08]) { add(head, G.sph(.075, 12, 10), blk, [sx, .06, .33], [0, 0, 0], [1, 1.35, .4]); add(head, G.sph(.022, 8, 6), mat('#ff1010', { e: '#ff0000', ei: 3 }), [sx, .05, .365]); glow(head, '#ff2020', [sx, .05, .38], .12); }
  add(head, G.sph(.2, 14, 10), peach, [0, -.12, .24], [0, 0, 0], [1.1, .7, .7]);           // muzzle
  add(head, G.sph(.04, 8, 6), blk, [0, -.06, .38]);
  add(head, G.box(.26, .03, .02), blk, [0, -.17, .37]); for (let i = -4; i <= 4; i++) add(head, G.box(.012, .025, .012), wht, [i * .028, -.155, .38]);
};


// ---------- v1.4 creature kit: CC0 glTF bases (Quaternius, public domain) + detailed procedural monsters ----------
const GLB = {}, GLB_WAIT = {};
export const GLB_LIST = ['trex', 'shark2', 'apato', 'raptor', 'dragon', 'bat'];
export function loadGLB(n) {
  if (n in GLB) return Promise.resolve(GLB[n]); if (GLB_WAIT[n]) return GLB_WAIT[n];
  return (GLB_WAIT[n] = new GLTFLoader().loadAsync(new URL('../models/glb/' + n + '.glb', import.meta.url).href).then(g => (GLB[n] = g)).catch(e => { console.warn('model', n, e); return (GLB[n] = null); }));
}
if (typeof document !== 'undefined') GLB_LIST.forEach(loadGLB);
export function glbReady() { return Promise.all(GLB_LIST.map(loadGLB)); }
let WIG = null; // procedural idle motion collected while a monster is built
function wig(o, a, m, f, p = 0) { if (WIG) WIG.push({ o, a, m, f, p, b: o.rotation[a] }); return o; }
export function wiggleTick(root, t) { const w = root.userData.wiggle; if (w) for (const q of w) q.o.rotation[q.a] = q.b + Math.sin(t * q.f + q.p) * q.m; }
function rootOf(o) { while (o.parent && !o.userData.kind) o = o.parent; return o; }
// a skinned glTF creature dropped into `parent`, scaled to `len` (longest side) or `h`, tinted, with named animation clips
function glbPart(parent, name, o = {}) {
  const holder = grp(parent, [0, o.y || 0, o.z || 0], 'glb');
  const fill = g => {
    if (!g || holder.userData.filled) return; holder.userData.filled = true;
    const m = skClone(g.scene); m.rotation.y = o.rot || 0; m.updateMatrixWorld(true);
    const sz = new THREE.Box3().setFromObject(m).getSize(new THREE.Vector3());
    m.scale.multiplyScalar(o.h ? o.h / sz.y : o.len / Math.max(sz.x, sz.z)); m.updateMatrixWorld(true);
    const b2 = new THREE.Box3().setFromObject(m), c = b2.getCenter(new THREE.Vector3()); m.position.set(-c.x, -b2.min.y, -c.z);
    const tint = o.tint ? new THREE.Color(o.tint) : null;
    m.traverse(x => { if (!x.isMesh) return; x.castShadow = true; x.receiveShadow = true; x.frustumCulled = false; if (x.isSkinnedMesh) { prepGLBGeometry(x); x.userData.lenM = o.len || o.h || 8; }
      x.material = (Array.isArray(x.material) ? x.material[0] : x.material).clone(); const M = x.material;
      if (tint && M.color) M.color.lerp(tint, o.mix ?? .5); M.roughness = o.r ?? .7; M.metalness = 0;
      if (o.bump && x.geometry.attributes.uv && !M.map) { M.bumpMap = tex(o.bump, o.rep || 4, { bump: true }); M.bumpScale = 1.2; }
      if (o.eyes && M.name && /eye/i.test(M.name)) { M.emissive = new THREE.Color(o.eyes); M.emissiveIntensity = 2.5; } });
    holder.add(m);
    const root = rootOf(holder);
    if (g.animations.length && o.anims) {
      const mx = new THREE.AnimationMixer(m), A = {};
      for (const [k, re] of Object.entries(o.anims)) { const clip = g.animations.find(a => re.test(a.name.split('|').pop())); if (clip) A[k] = mx.clipAction(clip); }
      root.userData.anim = { mx, A, cur: null };
    }
    if (o.ready) o.ready(m, b2.getSize(new THREE.Vector3()), holder);
    realize(root, holder);
    if (root.userData.skin) applySkin(holder, root.userData.skin);
    root.userData.dirty = true;
  };
  if (GLB[name] !== undefined) fill(GLB[name]); else loadGLB(name).then(fill);
  return holder;
}
// drive a glTF creature's clips: idle / walk / run / attack / swim
export function animTick(root, dt, want, speed = 1) {
  const a = root.userData.anim; if (!a) return false;
  const act = a.A[want] || (want === 'run' && a.A.walk) || (want === 'swim' && (a.A.walk || a.A.idle)) || a.A.idle || a.A.walk; if (!act) return false;
  if (a.cur !== act) { act.reset(); act.play(); if (a.cur) a.cur.crossFadeTo(act, .22, false); a.cur = act; }
  act.timeScale = speed; a.mx.update(dt); return true;
}
// segmented tentacle / tail / neck: a chain of tapered segments, each bent a little from the last
function chain(parent, p, n, len, r0, r1, m, bend = .15, opt = {}) {
  const root = grp(parent, p), segs = []; let g = root; const rr = v => Math.round(v * 100) / 100;
  for (let i = 0; i < n; i++) {
    const t = i / n, r = rr(r0 + (r1 - r0) * t), r2 = rr(r0 + (r1 - r0) * (i + 1) / n);
    add(g, G.cyl(Math.max(.01, r2), r, len, 10), m, [0, len / 2, 0]); add(g, G.sph(r, 10, 8), m);
    if (opt.suck) add(g, G.sph(rr(r * .38), 8, 6), opt.suck, [0, len * .5, r * .82], [0, 0, 0], [1, 1, .5]);
    if (opt.spike) add(g, G.cone(rr(r * .35), rr(r * 1.2), 5), opt.spike, [0, len * .5, -r * .9], [-.6, 0, 0]);
    segs.push(g); const ng = grp(g, [0, len, 0]); ng.rotation.x = opt.bends ? opt.bends[i] ?? bend : bend; g = ng;
    if (opt.wave) wig(ng, opt.axis || 'x', opt.wave, opt.f || 1.6, i * .55 + (opt.ph || 0));
  }
  root.userData.segs = segs; root.userData.tip = g; return root;
}
// bat / dragon-style wing: finger bones + a leathery membrane (side = -1 left, 1 right)
function wing(parent, p, side, span, bone, memb) {
  const w = grp(parent, p), sh = new THREE.Shape();
  sh.moveTo(0, 0); sh.lineTo(span * .45, span * .32); sh.lineTo(span, span * .12); sh.quadraticCurveTo(span * .82, -span * .1, span * .78, -span * .32);
  sh.quadraticCurveTo(span * .6, -span * .15, span * .5, -span * .42); sh.quadraticCurveTo(span * .35, -span * .2, span * .22, -span * .38); sh.quadraticCurveTo(span * .12, -span * .15, 0, -span * .18);
  const mm = new THREE.Mesh(new THREE.ShapeGeometry(sh, 6), memb); mm.castShadow = true; w.add(mm);
  for (const [x, y] of [[span * .45, span * .32], [span, span * .12], [span * .78, -span * .32], [span * .5, -span * .42], [span * .22, -span * .38]]) {
    const l = Math.hypot(x, y), b = add(w, G.cyl(.035 * span / 3, .02 * span / 3, l, 6), bone, [x / 2, y / 2, 0]); b.rotation.z = Math.atan2(y, x) - Math.PI / 2; }
  w.scale.x = side; return w;
}
function claws(parent, p, n, m, len = .14, spread = .05) { for (let i = 0; i < n; i++) add(parent, G.cone(.025, len, 5), m, [p[0] + (i - (n - 1) / 2) * spread, p[1], p[2]], [Math.PI * .85, 0, 0]); }
function teethRow(parent, cx, cy, cz, rx, rz, n, m, down = true, size = .07) {
  for (let i = 0; i < n; i++) { const a = Math.PI * (i + .5) / n, x = cx + Math.cos(a) * rx, z = cz + Math.sin(a) * rz; add(parent, G.cone(+(size * .38).toFixed(3), size, 4), m, [x, cy, z], [down ? Math.PI : 0, 0, 0]); }
}
const EYE = (c, ei = 3) => mat(c, { e: c, ei, r: .2 });

// --- Megalodon (sea form): CC0 shark, scaled to 15 m, scarred grey
B.megalodon = r => { const body = grp(r, [0, 0, 0], 'body'); grp(body, [0, 1.4, 6.4], 'head');
  glbPart(body, 'shark2', { len: 15, tint: '#55606a', mix: .3, r: .5, anims: { idle: /^Swim$/, walk: /^Swim$/, run: /Swim_Fast/, attack: /Swim_Bite/ },
    ready: (m, size, holder) => { const gill = mat('#2a343c', { r: .4 });
      for (const sx of [-1, 1]) for (let i = 0; i < 5; i++) { const s = new THREE.Mesh(G.box(size.x * .01, size.y * .012, size.z * .07), gill); s.position.set(sx * size.x * .18, size.y * .38, size.z * (.12 - i * .035)); s.rotation.y = sx * .5; holder.add(s); }
    } }); };
// --- Megalodon (land form): a giant, buff humanoid shark
B.megalodon_h = r => {
  const grey = mat('#5b6976', { map: 'skin', bump: 'skin', bs: 1.4, r: .42 }), belly = mat('#d9d6cb', { map: 'skin', bump: 'skin', r: .5 }), dark = mat('#252c34', { r: .5 });
  const tooth = mat('#f4f0e2', { r: .3 }), gum = mat('#6e1e26', { r: .55 }), eyeM = mat('#040404', { r: .05, m: .4 });
  const body = grp(r, [0, 0, 0], 'body');
  [-1, 1].forEach(sx => { const l = limb(body, [sx * .45, 1.6, 0], .82, .27, grey, null, .78); l.name = sx < 0 ? 'legL' : 'legR'; add(l.userData.low, G.box(.48, .2, .78), grey, [0, -.8, .16]); claws(l.userData.low, [0, -.82, .56], 3, tooth, .16, .13); });
  add(body, G.sph(.56, 18, 14), grey, [0, 1.72, 0], [0, 0, 0], [1.35, .72, 1]);
  add(body, G.sph(.82, 22, 18), grey, [0, 2.5, -.02], [0, 0, 0], [1.42, 1.08, .92]);
  add(body, G.sph(.7, 20, 16), belly, [0, 2.38, .24], [0, 0, 0], [1.08, 1.02, .72]);
  for (let i = 0; i < 3; i++) for (const sx of [-1, 1]) add(body, G.sph(.15, 10, 8), belly, [sx * .17, 2.0 + i * .28, .72], [0, 0, 0], [1.2, .8, .5]);
  for (const sx of [-1, 1]) { add(body, G.sph(.4, 16, 12), grey, [sx * .4, 2.9, .38], [0, 0, 0], [1.15, .78, .62]); add(body, G.sph(.36, 14, 12), grey, [sx * .98, 3.05, -.05]); }
  add(body, G.cone(.4, 1.5, 4), grey, [0, 3.35, -.78], [-.55, 0, 0], [.22, 1, 1.1]);         // dorsal fin
  const tail = chain(body, [0, 1.75, -.55], 5, .5, .3, .07, grey, .22, { wave: .12, axis: 'z', f: 2.2 }); tail.rotation.x = -2.0;
  add(tail.userData.tip, G.cone(.25, 1.1, 4), grey, [0, .3, 0], [0, 0, .5], [.2, 1, 1]);
  [-1, 1].forEach(sx => { const a = limb(body, [sx * 1.18, 3.0, 0], .88, .25, grey, null, .82); a.name = sx < 0 ? 'armL' : 'armR'; a.rotation.z = sx * .22;
    add(a, G.sph(.3, 12, 10), grey, [0, -.4, 0], [0, 0, 0], [1, 1.3, 1]); add(a.userData.low, G.cone(.16, .7, 4), grey, [0, -.35, -.25], [-.4, 0, 0], [.25, 1, 1]);
    const hand = grp(a.userData.low, [0, -.85, 0]); add(hand, G.sph(.2, 12, 10), grey, [0, -.05, 0], [0, 0, 0], [1, .9, .8]); claws(hand, [0, -.2, .1], 4, tooth, .2, .08); });
  add(body, G.cyl(.42, .55, .5, 14), grey, [0, 3.35, .05]);
  const head = grp(body, [0, 3.62, .22], 'head');
  add(head, G.sph(.56, 22, 16), grey, [0, .02, .3], [0, 0, 0], [1, .82, 1.65]);
  add(head, G.sph(.46, 18, 12), belly, [0, -.24, .4], [0, 0, 0], [.95, .5, 1.45]);
  const jaw = grp(head, [0, -.28, .05], 'jaw'); jaw.rotation.x = .4;
  add(jaw, G.box(.78, .14, .95), grey, [0, -.06, .48]); add(jaw, G.box(.66, .05, .84), gum, [0, .03, .48]);
  teethRow(jaw, 0, .1, .4, .3, .5, 11, tooth, false, .13); teethRow(head, 0, -.3, .42, .32, .55, 12, tooth, true, .14);
  add(head, G.box(.6, .05, .7), gum, [0, -.26, .55]);
  for (const sx of [-1, 1]) { add(head, G.sph(.07, 12, 10), eyeM, [sx * .42, .12, .55]); add(head, G.sph(.025, 8, 6), mat('#fff', { e: '#fff', ei: 1.2 }), [sx * .44, .15, .6]); for (let i = 0; i < 5; i++) add(head, G.box(.025, .32, .04), dark, [sx * .52, -.1, -.02 - i * .11]); add(head, G.box(.02, .02, .55), mat('#6a4038', { r: .6 }), [sx * .2, .05, .15], [0, 0, sx * .4]); }
  add(head, G.sph(.04, 8, 6), dark, [-.14, -.02, 1.18]); add(head, G.sph(.04, 8, 6), dark, [.14, -.02, 1.18]);
};
// --- Kraken: a colossal squid; mantle and two eyes break the surface, ten tentacles thrash
B.kraken = r => {
  const skin = mat('#7a2e28', { map: 'skin', bump: 'skin', bs: 2, r: .35 }), pale = mat('#d8a090', { r: .4 }), suck = mat('#e8c0b0', { r: .5 });
  const body = grp(r, [0, 0, 0], 'body');
  add(body, G.sph(1.6, 24, 18), skin, [0, 4.4, -.6], [-.35, 0, 0], [1, 1.9, 1]);
  add(body, G.cone(1.2, 1.8, 4), skin, [0, 7.4, -1.6], [-.35, 0, 0], [1.4, 1, .25]); // mantle fin
  add(body, G.sph(1.3, 20, 16), skin, [0, 2.1, .2], [0, 0, 0], [1.2, .85, 1.1]);
  const head = grp(body, [0, 2.5, 1.1], 'head');
  for (const sx of [-1, 1]) { add(head, G.sph(.42, 16, 12), pale, [sx * .9, .2, 0]); add(head, G.sph(.26, 14, 10), EYE('#ffcc20', 2), [sx * .98, .2, .22]); add(head, G.box(.08, .3, .05), mat('#050505'), [sx * .98, .2, .45]); glow(head, '#ffcc30', [sx * 1.0, .2, .5], .8); }
  add(head, G.cone(.3, .6, 8), mat('#1a0a08'), [0, -.6, .3], [Math.PI, 0, 0]); // beak
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, long = i === 2 || i === 7, n = long ? 9 : 7;
    const t = chain(body, [Math.cos(a) * 1.1, 1.6, Math.sin(a) * 1.1], n, long ? .9 : .75, .38, .06, skin, .2, { suck, wave: .14, f: 1.3 + (i % 3) * .2, ph: i });
    t.rotation.set(Math.sin(a) * 1.25, 0, -Math.cos(a) * 1.25); }
};
// --- Cthulhu: winged, octopus-headed titan with a beard of feelers and red eyes
B.cthulhu = r => {
  const skin = mat('#5a8a5e', { map: 'scales', bump: 'scales', bs: 2, r: .45 }), dark = mat('#2a4430', { r: .5 }), memb = mat('#3a5440', { r: .6 }); memb.side = THREE.DoubleSide;
  const claw = mat('#0a0a08', { r: .3 }), body = grp(r, [0, 0, 0], 'body');
  [-1, 1].forEach(sx => { const l = limb(body, [sx * .6, 2.6, 0], 1.3, .34, skin, null, 1.25); l.name = sx < 0 ? 'legL' : 'legR'; add(l.userData.low, G.box(.6, .25, 1), skin, [0, -1.25, .25]); claws(l.userData.low, [0, -1.25, .8], 3, claw, .3, .2); });
  add(body, G.sph(1.15, 22, 18), skin, [0, 3.9, 0], [0, 0, 0], [1.25, 1.35, .9]);
  for (let i = 0; i < 4; i++) add(body, G.box(1.3 - i * .1, .12, .3), dark, [0, 3.3 + i * .35, .85]);
  [-1, 1].forEach(sx => { const a = limb(body, [sx * 1.55, 5.0, 0], 1.25, .3, skin, null, 1.2); a.name = sx < 0 ? 'armL' : 'armR'; a.rotation.z = sx * .3;
    const hand = grp(a.userData.low, [0, -1.25, 0]); add(hand, G.sph(.3, 12, 10), skin); claws(hand, [0, -.35, .1], 4, claw, .45, .14); });
  for (const sx of [-1, 1]) wig(wing(body, [sx * .7, 5.2, -.8], sx, 5.2, dark, memb), 'y', .25, 1.1, sx > 0 ? 0 : Math.PI);
  const head = grp(body, [0, 6.1, .25], 'head');
  add(head, G.sph(1.0, 22, 18), skin, [0, .5, -.25], [-.4, 0, 0], [1, 1.35, 1.05]);
  for (const sx of [-1, 1]) { add(head, G.sph(.16, 12, 10), EYE('#ff1a10', 4), [sx * .42, .35, .7]); glow(head, '#ff2010', [sx * .44, .35, .82], .9); }
  for (let i = 0; i < 9; i++) { const x = (i - 4) * .17, t = chain(head, [x, -.1, .6 - Math.abs(i - 4) * .06], 6, .3, .1, .025, skin, .12, { wave: .2, f: 1.8, ph: i * .7 }); t.rotation.x = Math.PI * .92; }
};
// --- Leviathan: an armoured sea serpent; coils arch out of the water behind a horned head
B.leviathan = r => {
  const sc = mat('#1f3e52', { map: 'scales', bump: 'scales', bs: 2.2, r: .3, m: .2 }), belly = mat('#8aa6a0', { r: .45 }), fin = mat('#2a6a7a', { r: .4 }); fin.side = THREE.DoubleSide;
  const body = grp(r, [0, 0, 0], 'body'), tooth = mat('#e8e4d4', { r: .3 });
  const segs = 16; let prev = null;
  for (let i = 0; i < segs; i++) { const t = i / segs, z = 2 - i * 1.35, y = 1.0 + Math.max(0, Math.sin(t * Math.PI * 2.2)) * 3.2, rad = 1.5 - t * .95;
    const s = add(body, G.sph(+rad.toFixed(2), 16, 12), sc, [0, y, z], [0, 0, 0], [1, .95, 1.4]); wig(s, 'z', .08, 1.2, i * .5);
    add(body, G.cone(+(rad * .35).toFixed(2), +(rad * .9).toFixed(2), 4), fin, [0, y + rad * .9, z], [-.5, 0, 0], [.3, 1, 1]); }
  const head = grp(body, [0, 2.2, 3.4], 'head'); head.rotation.x = .1;
  add(head, G.sph(.9, 20, 16), sc, [0, 0, 0], [0, 0, 0], [1, .7, 1.6]);
  const jaw = grp(head, [0, -.35, .2], 'jaw'); jaw.rotation.x = .45; add(jaw, G.box(1.1, .2, 1.6), belly, [0, -.05, .7]); teethRow(jaw, 0, .08, .55, .45, .9, 12, tooth, false, .2); teethRow(head, 0, -.42, .7, .48, .95, 12, tooth, true, .22);
  for (const sx of [-1, 1]) { add(head, G.cone(.16, 1.4, 6), mat('#d8d0b8', { r: .4 }), [sx * .5, .6, -.6], [-1.0, 0, sx * -.3]); add(head, G.sph(.13, 12, 10), EYE('#40f0ff', 3.5), [sx * .55, .2, .7]); glow(head, '#30e0ff', [sx * .58, .2, .8], .7);
    wing(head, [sx * .7, 0, -.4], sx, 1.4, fin, fin); }
  wig(head, 'y', .12, .9);
};
// --- Mosasaurus: a 13 m marine lizard with a crocodile skull and a shark-like tail fluke
B.mosasaurus = r => {
  const sc = mat('#3c4a52', { map: 'scales', bump: 'scales', bs: 1.8, r: .38 }), belly = mat('#c8c4b4', { r: .5 }), tooth = mat('#efe9d6', { r: .3 }), gum = mat('#5a1a1e', { r: .5 });
  const body = grp(r, [0, 0, 0], 'body');
  add(body, G.sph(1.4, 22, 16), sc, [0, 1.6, 0], [0, 0, 0], [1, .85, 3]); add(body, G.sph(1.25, 20, 14), belly, [0, 1.25, .2], [0, 0, 0], [.92, .6, 2.7]);
  const tail = chain(body, [0, 1.55, -3.6], 7, .9, .9, .15, sc, 0, { wave: .13, axis: 'z', f: 1.8 }); tail.rotation.x = -Math.PI / 2;
  add(tail.userData.tip, G.cone(.6, 1.6, 4), sc, [0, .2, .5], [.9, 0, 0], [.18, 1, 1]); add(tail.userData.tip, G.cone(.4, 1.0, 4), sc, [0, .1, -.3], [-1.1, 0, 0], [.18, 1, 1]);
  for (const [sx, z, s] of [[-1, 2, 1], [1, 2, 1], [-1, -2, .8], [1, -2, .8]]) wig(add(body, G.sph(.55 * s, 12, 10), sc, [sx * 1.4, .9, z], [0, 0, sx * .5], [1.8, .18, .8]), 'z', .25, 1.6, z);
  const head = grp(body, [0, 1.85, 4.4], 'head');
  add(head, G.sph(.85, 18, 14), sc, [0, 0, .6], [0, 0, 0], [.85, .55, 1.9]);
  const jaw = grp(head, [0, -.25, -.2], 'jaw'); jaw.rotation.x = .35; add(jaw, G.box(1.0, .2, 2.6), sc, [0, -.08, 1.3]); add(jaw, G.box(.85, .05, 2.4), gum, [0, .03, 1.3]);
  for (let i = 0; i < 12; i++) for (const sx of [-1, 1]) { add(jaw, G.cone(.05, .18, 4), tooth, [sx * .4, .14, .3 + i * .2]); add(head, G.cone(.05, .2, 4), tooth, [sx * .38, -.38, .1 + i * .2], [Math.PI, 0, 0]); }
  for (const sx of [-1, 1]) add(head, G.sph(.1, 10, 8), EYE('#ffb020', 1.6), [sx * .5, .22, .5]);
};
// --- Nessie: CC0 long-neck dinosaur, dark green-black, slick
B.nessie = r => { const body = grp(r, [0, 0, 0], 'body'); grp(body, [0, 7, 5.5], 'head');
  glbPart(body, 'apato', { len: 15, tint: '#22342c', mix: .78, r: .3, anims: { idle: /Apatosaurus_Idle/, walk: /Apatosaurus_Walk/, run: /Apatosaurus_Run/, attack: /Apatosaurus_Attack/ } }); };
// --- Spinosaurus: CC0 theropod base, swamp-brown, with a tall red-orange sail along the spine
B.spinosaurus = r => { const body = grp(r, [0, 0, 0], 'body'); grp(body, [0, 4.6, 5.2], 'head');
  const sailM = mat('#a83a1e', { map: 'skin', r: .5, e: '#3a0800', ei: .4 }); sailM.side = THREE.DoubleSide;
  glbPart(body, 'trex', { len: 14, tint: '#5e4a2c', mix: .62, anims: { idle: /TRex_Idle/, walk: /TRex_Walk/, run: /TRex_Run/, attack: /TRex_Attack/ },
    ready: (m, size, holder) => { const sh = new THREE.Shape(), L = size.z * .42, H = size.y * .42; sh.moveTo(-L / 2, 0); for (let i = 0; i <= 10; i++) { const x = -L / 2 + L * i / 10; sh.lineTo(x, H * Math.sin(Math.PI * i / 10) * (1 + (i % 2) * .08)); } sh.lineTo(L / 2, 0);
      const s = new THREE.Mesh(new THREE.ShapeGeometry(sh, 4), sailM); s.rotation.y = -Math.PI / 2; s.position.set(0, size.y * .66, -size.z * .02); s.castShadow = true; holder.add(s); holder.userData.sail = s;
      const bn = {}; m.traverse(x => { if (x.isBone) bn[x.name] = x; }); // narrow crocodile-like snout, low neck, paddle tail (Ibrahim et al. 2020)
      if (bn.Head) bn.Head.scale.set(.58, 1.3, .72); if (bn.Neck) bn.Neck.scale.set(.85, 1.15, .85); if (bn.FrontUpLegR) for (const k of ['FrontUpLegR', 'FrontUpLegL']) bn[k].scale.setScalar(1.35);
      for (let i = 2; i <= 5; i++) { const t = bn['Tail' + i]; if (t) t.scale.set(.82, 1, 1.32); }
      if (bn.BackUpLegR) for (const k of ['BackUpLegR', 'BackUpLegL']) bn[k].scale.set(1, .85, 1); } }); };
// --- T-Rex: CC0 Quaternius base, olive-dark, glowing amber eyes
B.trex = r => { const body = grp(r, [0, 0, 0], 'body'); grp(body, [0, 4.3, 5.0], 'head');
  glbPart(body, 'trex', { len: 13, tint: '#3e4a30', mix: .5, eyes: '#ffa020', anims: { idle: /TRex_Idle/, walk: /TRex_Walk/, run: /TRex_Run/, attack: /TRex_Attack/ } }); };
// --- Quetzalcoatlus: giraffe-tall pterosaur stalking on folded wings, huge beak and crest
B.quetzalcoatlus = r => {
  const skin = mat('#7a6a58', { map: 'skin', bump: 'skin', r: .55 }), dark = mat('#3a2e26', { r: .6 }), memb = mat('#5a3a2a', { r: .7 }); memb.side = THREE.DoubleSide;
  const beak = mat('#c8a060', { r: .35 }), crest = mat('#a02a1a', { r: .4 }), body = grp(r, [0, 0, 0], 'body');
  [-1, 1].forEach(sx => { const l = limb(body, [sx * .3, 1.4, -.5], .75, .08, skin, null, .7); l.name = sx < 0 ? 'legL' : 'legR'; claws(l.userData.low, [0, -.7, .1], 3, dark, .15, .06); });
  add(body, G.sph(.6, 18, 14), skin, [0, 1.75, -.2], [.4, 0, 0], [.9, .8, 1.4]);
  [-1, 1].forEach(sx => { const a = limb(body, [sx * .45, 2.1, .3], 1.15, .1, skin, null, 1.15); a.name = sx < 0 ? 'armL' : 'armR'; a.rotation.set(-.45, 0, sx * .12); claws(a.userData.low, [0, -1.15, .05], 3, dark, .14, .05);
    const gm = new THREE.BufferGeometry(); gm.setAttribute('position', new THREE.Float32BufferAttribute([sx * .5, 2.15, .3, sx * .62, .35, 1.25, sx * .34, 1.55, -.7, sx * .62, .35, 1.25, sx * .3, 1.0, -.2, sx * .34, 1.55, -.7], 3)); gm.computeVertexNormals();
    const wm = new THREE.Mesh(gm, memb); wm.castShadow = true; body.add(wm); });
  const neck = chain(body, [0, 2.2, .5], 6, .45, .2, .12, skin, -.08, { wave: .04, f: 1.1 }); neck.rotation.x = .25;
  const head = grp(neck.userData.tip, [0, .2, 0], 'head'); head.rotation.x = .35;
  add(head, G.sph(.22, 14, 10), skin, [0, 0, 0], [0, 0, 0], [1, 1, 1.3]); add(head, G.cone(.16, 1.9, 10), beak, [0, -.05, 1.0], [Math.PI / 2, 0, 0], [1, 1, .7]);
  add(head, G.cone(.25, 1.0, 4), crest, [0, .35, -.25], [-.9, 0, 0], [.15, 1, 1]); for (const sx of [-1, 1]) add(head, G.sph(.05, 8, 6), EYE('#ffcc00', 2), [sx * .15, .06, .12]);
};
// --- shared ape-man builder for the Yeti and Bigfoot
function apeman(r, c) {
  const fur = mat(c.fur, { map: 'fur', bump: 'fur', bs: 3, r: 1 }), face = mat(c.face, { map: 'skin', bump: 'skin', r: .65 }), claw = mat('#1a1612', { r: .35 }), tooth = mat('#e6e0cc', { r: .3 });
  const H = c.h, body = grp(r, [0, 0, 0], 'body'), S3 = (p, sc, m = fur, rad = 1, rot = [0, 0, 0]) => add(body, G.sph(rad * H, 20, 16), m, p.map(v => v * H), rot, sc);
  // legs: short, thick, bent (ape stance) with broad padded feet and toes
  [-1, 1].forEach(sx => { const l = limb(body, [sx * .2 * H, .5 * H, -.04 * H], .26 * H, .12 * H, fur, null, .22 * H); l.name = sx < 0 ? 'legL' : 'legR'; l.rotation.x = -.18; l.userData.low.rotation.x = .3;
    const ft = grp(l.userData.low, [0, -.23 * H, 0]); ft.rotation.x = -.12; add(ft, G.sph(.1 * H, 16, 12), face, [0, -.02 * H, .07 * H], [0, 0, 0], [1.1, .45, 1.9]);
    for (let t = 0; t < 5; t++) add(ft, G.sph(.026 * H, 10, 8), face, [(t - 2) * .036 * H, -.035 * H, .24 * H - Math.abs(t - 2) * .012 * H], [0, 0, 0], [1, .8, 1.3]); });
  // torso: pelvis, belly, barrel chest, heavy shoulders and a trapezius hump
  S3([0, .62, -.04], [1.15, .8, .9], fur, .3); S3([0, .82, .02], [1.05, 1.05, .85], fur, .33, [.25, 0, 0]);
  S3([0, 1.0, .04], [1.45, .85, .95], fur, .3, [.35, 0, 0]); S3([0, 1.12, -.08], [1.2, .55, .8], fur, .24);
  S3([0, .93, .2], [1.15, .95, .45], c.chest ? face : fur, .22, [.3, 0, 0]); // bare chest / pectorals
  for (const sx of [-1, 1]) S3([sx * .36, 1.08, -.01], [1, .95, 1], fur, .15); // deltoids
  for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2, rr = .3 + (i % 3) * .02; add(body, G.cone(.045 * H, (.16 + (i % 4) * .03) * H, 6), fur, [Math.cos(a) * rr * H * 1.15, .6 * H, Math.sin(a) * rr * H * .9 - .03 * H], [Math.PI + Math.sin(a) * .25, 0, -Math.cos(a) * .25]); } // shaggy hem
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; add(body, G.cone(.04 * H, .14 * H, 6), fur, [Math.cos(a) * .4 * H, 1.0 * H + Math.sin(i) * .02 * H, Math.sin(a) * .26 * H], [Math.PI, 0, -Math.cos(a) * .6]); } // shoulder shag
  // long ape arms reaching near the knees: big biceps/forearms, leathery hands and claws
  [-1, 1].forEach(sx => { const a = limb(body, [sx * .4 * H, 1.06 * H, 0], .34 * H, .1 * H, fur, null, .36 * H); a.name = sx < 0 ? 'armL' : 'armR'; a.rotation.z = sx * .14; a.rotation.x = -.12;
    add(a, G.sph(.12 * H, 16, 12), fur, [0, -.13 * H, .01 * H], [0, 0, 0], [1, 1.5, 1]); add(a.userData.low, G.sph(.1 * H, 16, 12), fur, [0, -.1 * H, .01 * H], [0, 0, 0], [1, 1.6, 1]);
    for (let i = 0; i < 4; i++) add(a.userData.low, G.cone(.035 * H, .13 * H, 6), fur, [sx * .07 * H, -(.05 + i * .07) * H, -.04 * H], [Math.PI * .8, 0, sx * .5]);
    const hand = grp(a.userData.low, [0, -.37 * H, 0]); add(hand, G.sph(.085 * H, 16, 12), face, [0, -.03 * H, 0], [0, 0, 0], [1, 1.25, .65]);
    for (let f = 0; f < 4; f++) add(hand, G.cap(.018 * H, .07 * H), face, [(f - 1.5) * .034 * H, -.12 * H, .015 * H], [.2, 0, 0]);
    claws(hand, [0, -.17 * H, .03 * H], 4, claw, .1 * H, .03 * H); });
  // head: thrust forward, sagittal crest, heavy brow ridge, broad muzzle, deep-set eyes
  const head = grp(body, [0, 1.17 * H, .17 * H], 'head');
  add(head, G.sph(.16 * H, 22, 18), fur, [0, .03 * H, -.04 * H], [0, 0, 0], [1, 1.05, 1.05]); add(head, G.sph(.1 * H, 16, 12), fur, [0, .14 * H, -.07 * H], [0, 0, 0], [.55, 1, 1.3]); // crest
  for (const sx of [-1, 1]) add(head, G.sph(.07 * H, 14, 10), fur, [sx * .13 * H, -.03 * H, 0], [0, 0, 0], [.7, 1.2, 1]); // cheek ruff
  add(head, G.sph(.13 * H, 20, 16), face, [0, -.015 * H, .08 * H], [0, 0, 0], [1, .9, .75]); // face
  add(head, G.sph(.11 * H, 18, 12), face, [0, .065 * H, .145 * H], [0, 0, 0], [1.25, .3, .5]); // brow ridge
  add(head, G.sph(.085 * H, 18, 14), face, [0, -.05 * H, .17 * H], [0, 0, 0], [1.15, .75, .75]); // muzzle
  for (const sx of [-1, 1]) add(head, G.sph(.016 * H, 10, 8), mat('#120c0a', { r: .4 }), [sx * .026 * H, -.025 * H, .23 * H], [0, 0, 0], [1.2, .8, .8]); // nostrils
  for (const sx of [-1, 1]) { add(head, G.sph(.03 * H, 12, 10), mat('#0c0806', { r: .8 }), [sx * .052 * H, .03 * H, .17 * H]); add(head, G.sph(.019 * H, 14, 12), EYE(c.eye, c.eg), [sx * .052 * H, .03 * H, .185 * H]); if (c.eg > 2) glow(head, c.eye, [sx * .052 * H, .03 * H, .2 * H], .18 * H); }
  const jaw = grp(head, [0, -.08 * H, .08 * H], 'jaw'); jaw.rotation.x = .3; add(jaw, G.sph(.09 * H, 16, 12), face, [0, -.02 * H, .07 * H], [0, 0, 0], [1.05, .45, .9]);
  add(jaw, G.sph(.07 * H, 12, 10), mat('#4a1416', { r: .5 }), [0, .005 * H, .07 * H], [0, 0, 0], [.9, .2, .8]); // mouth interior
  for (const sx of [-1, 1]) { add(head, G.cone(.012 * H, .06 * H, 6), tooth, [sx * .045 * H, -.09 * H, .2 * H], [Math.PI, 0, 0]); add(jaw, G.cone(.011 * H, .05 * H, 6), tooth, [sx * .04 * H, .01 * H, .13 * H]); }
  for (let i = -2; i <= 2; i++) add(head, G.box(.016 * H, .02 * H, .01 * H), tooth, [i * .018 * H, -.085 * H, .215 * H]);
  if (c.horns) for (const sx of [-1, 1]) add(head, G.cone(.026 * H, .16 * H, 8), mat('#c8c0a8', { r: .4 }), [sx * .11 * H, .14 * H, -.04 * H], [-.4, 0, sx * -.7]);
}
B.yeti = r => apeman(r, { h: 3.4, fur: '#e8eef2', face: '#7a8a9a', eye: '#40c8ff', eg: 3, chest: true, horns: true });
B.bigfoot = r => apeman(r, { h: 3.0, fur: '#4a3220', face: '#2e2018', eye: '#ffb030', eg: 1.2 });
// --- Dragon: CC0 dragon base, blood-red with ember eyes
B.dragon = r => { const body = grp(r, [0, 0, 0], 'body'); grp(body, [0, 3.6, 3.6], 'head');
  glbPart(body, 'dragon', { len: 12, y: .8, tint: '#5a1208', mix: .55, eyes: '#ff7a10', anims: { idle: /Dragon_Flying/, walk: /Dragon_Flying/, run: /Dragon_Flying/, attack: /Dragon_Attack$/ },
    ready: m => { const bn = {}; m.traverse(x => { if (x.isBone) bn[x.name] = x; }); // adult proportions: long neck, small wedge head, longer tail
      if (bn.Neck) bn.Neck.scale.set(.95, 1.45, .95); if (bn.Head) bn.Head.scale.set(.62, .6, .78); if (bn.Nose) bn.Nose.scale.set(.85, 1.3, .85); if (bn.Tail1) bn.Tail1.scale.set(.92, 1.25, .92);
      const horn = mat('#2a1a14', { r: .35 }); if (bn.Head) for (const sx of [-1, 1]) { const h = new THREE.Mesh(G.cone(.05, .5, 8), horn); h.position.set(sx * .12, .25, -.18); h.rotation.set(-1.1, 0, sx * -.35); m.updateMatrixWorld(true); const ws = bn.Head.getWorldScale(new THREE.Vector3()); h.scale.set(1.4 / ws.x, 1.4 / ws.y, 1.4 / ws.z); h.position.set(sx * .12 / ws.x * 1.4, .25 / ws.y * 1.4, -.18 / ws.z * 1.4); bn.Head.add(h); } } }); };
// --- Chupacabra: CC0 raptor base, hairless grey-green, with quills down the back
B.chupacabra = r => { const body = grp(r, [0, 0, 0], 'body'); grp(body, [0, 1.3, 1.5], 'head');
  const quill = mat('#2a2622', { r: .4 });
  glbPart(body, 'raptor', { len: 3.6, tint: '#4a4e40', mix: .72, r: .55, eyes: '#ff2010', anims: { idle: /Velociraptor_Idle/, walk: /Velociraptor_Walk/, run: /Velociraptor_Run/, attack: /Velociraptor_Attack/ },
    ready: (m, size, holder) => { for (let i = 0; i < 9; i++) { const q = new THREE.Mesh(G.cone(.05, .42, 5), quill); q.position.set(0, size.y * (.74 - Math.abs(i - 3) * .03), size.z * (.18 - i * .07)); q.rotation.x = -.5; holder.add(q); } } }); };
// --- Vampire: tall pale count in a high-collared cape, red eyes and fangs
B.vampire = r => {
  const suit = mat('#121216', { map: 'cloth', bump: 'cloth', r: .7 }), shirt = mat('#e8e4dc', { map: 'cloth', r: .7 }), skin = mat('#c8c4c8', { map: 'skin', r: .5 }), hair = mat('#08080a', { r: .4 });
  const cape = mat('#0a0a0c', { map: 'cloth', r: .6 }), lining = mat('#7a0a12', { map: 'cloth', r: .5 }); cape.side = lining.side = THREE.DoubleSide;
  const body = grp(r, [0, 0, 0], 'body');
  [-1, 1].forEach(sx => { const l = limb(body, [sx * .12, 1.05, 0], .52, .075, suit, null, .5); l.name = sx < 0 ? 'legL' : 'legR'; add(l.userData.low, G.box(.12, .08, .3), mat('#050505', { r: .2, m: .3 }), [0, -.5, .06]); });
  add(body, G.cap(.17, .4), suit, [0, 1.42, 0], [0, 0, 0], [1.15, 1, .75]); add(body, G.box(.14, .5, .02), shirt, [0, 1.5, .13]); add(body, G.box(.05, .05, .03), lining, [0, 1.72, .15]);
  [-1, 1].forEach(sx => { const a = limb(body, [sx * .25, 1.74, 0], .34, .055, suit, null, .32); a.name = sx < 0 ? 'armL' : 'armR'; a.rotation.z = sx * .08;
    const hand = grp(a.userData.low, [0, -.33, 0]); add(hand, G.box(.07, .1, .03), skin, [0, -.05, 0]); for (let i = 0; i < 4; i++) add(hand, G.cyl(.008, .005, .12, 5), skin, [(i - 1.5) * .017, -.15, 0]); });
  const cp = grp(body, [0, 1.8, -.12]); wig(cp, 'x', .06, 1.3);
  const cg = new THREE.CylinderGeometry(.3, .62, 1.75, 16, 4, true, Math.PI * .32, Math.PI * 1.36); cg.translate(0, -.87, 0);
  const cm = new THREE.Mesh(cg, cape); cm.castShadow = true; cp.add(cm); const lm = new THREE.Mesh(cg, lining); lm.scale.setScalar(.97); cp.add(lm);
  const col = new THREE.Mesh(new THREE.CylinderGeometry(.26, .2, .38, 14, 1, true, Math.PI * .15, Math.PI * 1.7), lining); col.position.set(0, .14, .02); cp.add(col);
  const head = grp(body, [0, 2.0, .01], 'head');
  add(head, G.sph(.12, 18, 14), skin, [0, 0, 0], [0, 0, 0], [.85, 1.18, .95]); add(head, G.sph(.125, 16, 10, 0, Math.PI * 2, 0, Math.PI * .5), hair, [0, .03, -.01], [-.25, 0, 0], [.9, 1.1, 1]);
  add(head, G.cone(.03, .07, 4), hair, [0, .1, .1], [Math.PI, 0, 0]); add(head, G.cone(.025, .06, 6), skin, [0, -.01, .12], [Math.PI / 2, 0, 0]);
  for (const sx of [-1, 1]) { add(head, G.sph(.018, 10, 8), EYE('#ff1010', 3.5), [sx * .04, .03, .1]); glow(head, '#ff1a1a', [sx * .04, .03, .115], .12); add(head, G.cone(.008, .035, 4), mat('#ffffff', { r: .2 }), [sx * .018, -.07, .1], [Math.PI, 0, 0]); add(head, G.cone(.03, .07, 4), skin, [sx * .11, .02, -.01], [0, 0, sx * -1.2]); }
  add(head, G.box(.06, .008, .01), mat('#5a0a0e'), [0, -.06, .108]);
};
// --- Gargoyle: hunched stone demon with horns, wings and a barbed tail; turns to solid stone on guard
B.gargoyle = r => {
  const stone = mat('#6a6a6e', { map: 'stone', bump: 'stone', bs: 2.5, r: .95 }), dark = mat('#3a3a3e', { map: 'stone', r: .95 }), memb = mat('#4e4e54', { map: 'concrete', r: .95 }); memb.side = THREE.DoubleSide;
  const body = grp(r, [0, 0, 0], 'body');
  [-1, 1].forEach(sx => { const l = limb(body, [sx * .32, .95, -.1], .45, .14, stone, null, .48); l.name = sx < 0 ? 'legL' : 'legR'; l.rotation.x = -.5; l.userData.low.rotation.x = .9; add(l.userData.low, G.box(.24, .1, .4), stone, [0, -.48, .12]); claws(l.userData.low, [0, -.5, .34], 3, dark, .12, .07); });
  add(body, G.sph(.5, 18, 14), stone, [0, 1.45, .12], [.5, 0, 0], [1.15, 1.2, .95]); for (let i = 0; i < 6; i++) add(body, G.cone(.06, .22, 5), dark, [0, 1.95 - i * .16, -.35 - i * .04], [-.9, 0, 0]);
  [-1, 1].forEach(sx => { const a = limb(body, [sx * .58, 1.75, .3], .5, .12, stone, null, .55); a.name = sx < 0 ? 'armL' : 'armR'; a.rotation.set(-.4, 0, sx * .2);
    const hand = grp(a.userData.low, [0, -.55, 0]); add(hand, G.sph(.13, 12, 10), stone); claws(hand, [0, -.16, .06], 4, dark, .16, .06); });
  for (const sx of [-1, 1]) { const w = wing(body, [sx * .35, 1.9, -.35], sx, 2.1, dark, memb); w.rotation.set(-.3, sx * -.5, sx * .2); wig(w, 'y', .08, .8, sx); }
  const tail = chain(body, [0, 1.0, -.4], 6, .3, .1, .04, stone, .25, { wave: .1, axis: 'z', f: 1.4 }); tail.rotation.x = -2.2; add(tail.userData.tip, G.cone(.12, .3, 4), dark, [0, .1, 0]);
  const head = grp(body, [0, 2.15, .5], 'head');
  add(head, G.sph(.26, 16, 12), stone, [0, 0, 0], [0, 0, 0], [1, .95, 1.1]); add(head, G.box(.4, .08, .14), dark, [0, .1, .2]);
  const jaw = grp(head, [0, -.12, .1], 'jaw'); jaw.rotation.x = .5; add(jaw, G.box(.28, .08, .28), stone, [0, -.03, .12]);
  for (const sx of [-1, 1]) { add(head, G.cone(.06, .42, 6), dark, [sx * .2, .25, -.05], [-.5, 0, sx * -.5]); add(head, G.sph(.04, 10, 8), EYE('#ff8a1a', 4), [sx * .1, .04, .26]); glow(head, '#ff7a10', [sx * .1, .04, .29], .3); }
  teethRow(head, 0, -.1, .14, .11, .14, 8, mat('#d8d4c8'), true, .06);
};
// --- Father Fester: a gaunt priest-thing in a rotting cassock; every sighting makes him taller, longer-armed and hungrier (stage 0..6)
B.fester = (r, arg) => {
  const s = Math.max(0, Math.min(6, +arg || 0)), H = 1 + s * .12, cas = mat('#141012', { map: 'cloth', bump: 'cloth', bs: 1.2, r: .9 }), collar = mat('#e8e4d8', { r: .5 });
  const skin = mat('#b8b0a0', { map: 'skin', bump: 'skin', bs: 2, r: .55 }), rot = mat('#4a3a2a', { map: 'skin', r: .8 }), claw = mat('#2a2018', { r: .4 });
  const body = grp(r, [0, 0, 0], 'body');
  [-1, 1].forEach(sx => { const l = limb(body, [sx * .12, 1.0 * H, 0], .5 * H, .06, cas, null, .48 * H); l.name = sx < 0 ? 'legL' : 'legR'; add(l.userData.low, G.box(.1, .06, .26), rot, [0, -.48 * H, .05]); });
  const robe = add(body, G.cyl(.2, .5 + s * .03, 1.3 * H, 16, 3, true), cas, [0, .75 * H, 0]); robe.material.side = THREE.DoubleSide;
  add(body, G.cap(.17, .45 * H), cas, [0, 1.55 * H, 0], [.18, 0, 0], [1.1, 1, .8]); add(body, G.tor(.07, .022), collar, [0, 1.92 * H, .03], [Math.PI / 2, 0, 0]);
  add(body, G.box(.04, .2, .015), collar, [0, 1.7 * H, .15]); add(body, G.box(.12, .04, .015), collar, [0, 1.75 * H, .15]); // tarnished cross
  const al = .38 * H + s * .06;
  [-1, 1].forEach(sx => { const a = limb(body, [sx * .24, 1.82 * H, 0], al, .05, cas, null, al); a.name = sx < 0 ? 'armL' : 'armR'; a.rotation.z = sx * .1;
    const hand = grp(a.userData.low, [0, -al, 0]); add(hand, G.box(.08, .12, .03), skin, [0, -.06, 0]); for (let i = 0; i < 4; i++) add(hand, G.cyl(.009, .006, .14 + s * .02, 5), skin, [(i - 1.5) * .02, -.18 - s * .01, 0]); claws(hand, [0, -.27 - s * .02, 0], 4, claw, .05, .02); });
  const head = grp(body, [0, 2.1 * H, .06], 'head');
  add(head, G.sph(.13, 18, 14), skin, [0, 0, 0], [0, 0, 0], [.82, 1.25, .92]); add(head, G.sph(.1, 12, 10), rot, [0, .08, -.04], [0, 0, 0], [1, .6, 1]);
  for (const sx of [-1, 1]) { add(head, G.sph(.03, 10, 8), mat('#050505'), [sx * .045, .03, .095]); add(head, G.sph(.01, 6, 4), EYE('#e8ffb0', 1 + s * .6), [sx * .045, .03, .118]); if (s >= 3) glow(head, '#d8ff90', [sx * .045, .03, .13], .08 + s * .02); }
  const mouthW = .05 + s * .012; add(head, G.box(mouthW * 2, .012 + s * .006, .01), mat('#2a0a08'), [0, -.07, .112]);
  for (let i = 0; i < 5; i++) add(head, G.box(.004, .03, .004), mat('#2a1a12'), [(i - 2) * mouthW * .45, -.07, .118]); // stitched grin
  if (s >= 4) for (let i = 0; i < s - 2; i++) add(head, G.cone(.006, .03, 4), mat('#e8e0c8'), [(i - (s - 3) / 2) * .02, -.06, .118], [Math.PI, 0, 0]);
};

// ================= v1.5.1 remodels (matched to the reference images) =================

// ================= v1.5.1: remodels matched to Leo's reference images (refs/<name>/) =================
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
// a rod (cylinder) between two points a→b, with an optional ball joint at a
function rod(parent, a, b, r0, r1, m, joint) { const A = V3(...a), Bv = V3(...b), d = Bv.clone().sub(A), L = d.length(); const o = add(parent, G.cyl(+r1.toFixed(3), +r0.toFixed(3), +L.toFixed(3), 10), m, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]); o.quaternion.setFromUnitVectors(V3(0, 1, 0), d.normalize()); if (joint) add(parent, G.sph(+(r0 * 1.15).toFixed(3), 10, 8), joint, a); return o; }
function tube(parent, pts, r, m, seg = 40, rs = 7) { const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => V3(...p))), seg, r, rs); return add(parent, g, m); }
// a limb group (named, with userData.low) built from bulb segments: FNAF-suit style
function suitLimb(parent, p, name, o) {
  const L = grp(parent, p, name), lo = grp(L, [0, -o.l1, 0]); L.userData.low = lo;
  if (o.up !== false) add(L, G.sph(o.r1, 18, 14), o.m1, [0, -o.l1 * .48, 0], [0, 0, 0], [1, o.l1 * .42 / o.r1, 1]);
  add(L, G.cyl(o.r1 * .28, o.r1 * .28, o.l1 * .3, 8), o.endo, [0, -o.l1 * .92, 0]); add(lo, G.sph(o.r1 * .36, 10, 8), o.endo); // exposed joint
  if (o.lowEndo) { add(lo, G.cyl(o.r2 * .22, o.r2 * .22, o.l2, 8), o.endo, [-o.r2 * .3, -o.l2 / 2, 0]); add(lo, G.cyl(o.r2 * .18, o.r2 * .18, o.l2, 8), o.endo, [o.r2 * .35, -o.l2 / 2, 0]); add(lo, G.box(o.r2 * 1.1, o.r2 * .25, o.r2 * .5), o.endo, [0, -o.l2 * .45, 0]); }
  else add(lo, G.sph(o.r2, 18, 14), o.m2 || o.m1, [0, -o.l2 * .5, 0], [0, 0, 0], [1, o.l2 * .42 / o.r2, 1]);
  add(lo, G.sph(o.r2 * .3, 10, 8), o.endo, [0, -o.l2, 0]); return L;
}
function hand4(parent, y, m, endo, o = {}) { // four fat two-segment fingers (suit) or bare endo fingers
  const h = grp(parent, [0, y, 0]); add(h, o.endo ? G.box(.12, .1, .05) : G.sph(.1, 14, 10), o.endo ? endo : m, [0, -.06, 0], [0, 0, 0], o.endo ? undefined : [1.05, .9, .6]);
  for (let i = 0; i < 4; i++) { const f = grp(h, [(i - 1.5) * .045, -.13, .01]); f.rotation.set(.35, 0, (i - 1.5) * .08); const r = o.endo ? .012 : .024;
    add(f, G.cap(r, .05), o.endo ? endo : m, [0, -.04, 0]); const f2 = grp(f, [0, -.085, 0]); f2.rotation.x = .5; add(f2, G.cap(r * .9, .04), o.endo ? endo : m, [0, -.035, 0]); add(f, G.sph(r * .8, 8, 6), endo, [0, -.085, 0]); }
  const th = grp(h, [o.side * -.08, -.07, .03]); th.rotation.set(.4, 0, o.side * .7); add(th, G.cap(o.endo ? .012 : .026, .06), o.endo ? endo : m, [0, -.05, 0]); return h;
}
function canvasMat(w, h, draw, o = {}) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const m = new THREE.MeshStandardMaterial({ map: t, roughness: o.r ?? .8, transparent: !!o.tr, side: o.ds ? THREE.DoubleSide : THREE.FrontSide }); return m; }
const KEEP = o => { o.userData.keep = 1; return o; };
// FNAF 1 stage animatronic: pear torso, lighter belly, bulb limb segments with steel endoskeleton showing at every joint, big feet with toes,
// big head with a separate jaw, flat stage teeth, half-lidded eyes and thick brows
function stageBot(root, c) {
  const fur = mat(c.fur, { map: 'fur', bump: 'fur', bs: 1.6, r: 1 }), belly = mat(c.belly, { map: 'fur', bump: 'fur', bs: 1.2, r: 1 }), endo = mat('#6e6e72', { map: 'metal', m: .7, r: .5 });
  const dark = mat('#141414', { r: .6 }), tooth = mat('#e8e2cc', { r: .35 }), white = mat('#f2f2ee', { r: .2 }), body = grp(root, [0, 0, 0], 'body');
  const legM = c.legM ? mat(c.legM, { map: 'fur', r: .9 }) : fur;
  for (const sx of [-1, 1]) { const L = suitLimb(body, [sx * .25, 1.02, 0], sx < 0 ? 'legL' : 'legR', { l1: .48, r1: .17, l2: .46, r2: .15, m1: c.shorts ? mat(c.shorts, { map: 'cloth', r: .95 }) : fur, m2: legM, endo, lowEndo: c.endoLegs, up: true });
    const ft = grp(L.userData.low, [0, -.48, .02]); const fm = c.endoLegs ? endo : (c.footM ? mat(c.footM, { map: 'fur', r: .85 }) : legM);
    if (c.endoLegs) { add(ft, G.box(.16, .05, .34), endo, [0, -.03, .1]); for (let i = -1; i <= 1; i++) add(ft, G.cyl(.015, .015, .14, 6), endo, [i * .05, -.03, .3], [Math.PI / 2, 0, 0]); }
    else { add(ft, G.sph(.17, 18, 12), fm, [0, -.02, .1], [0, 0, 0], [1.05, .5, 1.55]); for (let i = -1; i <= 1; i++) { add(ft, G.sph(.065, 12, 8), fm, [i * .085, -.03, .33], [0, 0, 0], [1, .8, 1.2]); if (c.nails) add(ft, G.sph(.03, 8, 6), white, [i * .085, -.02, .39], [0, 0, 0], [1, .6, .8]); } } }
  add(body, G.sph(.3, 22, 16), c.shorts ? mat(c.shorts, { map: 'cloth', r: .95 }) : fur, [0, 1.1, 0], [0, 0, 0], [1.15, .72, .95]); // pelvis
  if (c.shorts) for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; add(body, G.cone(.05, .14 + (i % 3) * .05, 4), mat(c.shorts, { map: 'cloth' }), [Math.cos(a) * .3, .9, Math.sin(a) * .26], [Math.PI, 0, 0]); } // torn hem
  add(body, G.sph(.45, 26, 20), fur, [0, 1.45, 0], [0, 0, 0], [1.02, .88, .95]); add(body, G.sph(.4, 24, 18), fur, [0, 1.8, -.02], [0, 0, 0], [1.18, .8, .88]); // pear torso
  if (!c.torn) add(body, G.sph(.36, 22, 16), belly, [0, 1.5, .18], [0, 0, 0], [.92, 1.02, .62]);
  else { add(body, G.sph(.3, 20, 14), belly, [0, 1.35, .2], [0, 0, 0], [.9, .7, .6]); add(body, G.sph(.22, 16, 12), mat('#060606', { r: 1 }), [.06, 1.72, .26], [0, 0, .3], [1.2, .9, .55]); // torn-open chest
    for (let i = 0; i < 4; i++) add(body, G.cyl(.016, .016, .34, 6), endo, [.06, 1.6 + i * .08, .3], [0, 0, Math.PI / 2]); add(body, G.cyl(.03, .03, .6, 8), endo, [.06, 1.72, .22]);
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; add(body, G.cone(.03, .09, 4), fur, [.06 + Math.cos(a) * .22, 1.72 + Math.sin(a) * .2, .34], [Math.PI / 2, 0, -a + Math.PI / 2]); } }
  add(body, G.cyl(.05, .06, .22, 8), endo, [0, 2.16, 0]); // neck rod
  for (const sx of [-1, 1]) { add(body, G.sph(.17, 16, 12), fur, [sx * .5, 1.98, 0]);
    const A = suitLimb(body, [sx * .56, 1.95, 0], sx < 0 ? 'armL' : 'armR', { l1: .42, r1: .12, l2: .4, r2: .11, m1: fur, endo }); A.rotation.z = sx * .1;
    const endoHand = c.endoHand === sx; const h = sx === c.hook ? null : hand4(A.userData.low, -.44, fur, endo, { endo: endoHand, side: sx }); A.userData.hand = h;
    if (sx === c.hook) { const hk = grp(A.userData.low, [0, -.42, 0]); add(hk, G.cyl(.06, .08, .12, 10), endo, [0, -.02, 0]); add(hk, G.cyl(.018, .018, .16, 6), mat('#c8c8c8', { m: 1, r: .2 }), [0, -.14, 0]);
      const t = add(hk, new THREE.TorusGeometry(.08, .016, 8, 18, Math.PI * 1.3), mat('#c8c8c8', { m: 1, r: .2 }), [0, -.29, .06], [0, Math.PI / 2, Math.PI * .9]); add(hk, G.cone(.016, .05, 6), mat('#c8c8c8', { m: 1, r: .2 }), [0, -.22, .14], [-.6, 0, 0]); } }
  const head = grp(body, [0, 2.46, .02], 'head'), H = c.hs || 1; head.scale.setScalar(H);
  add(head, G.sph(.36, 26, 20), fur, [0, 0, 0], [0, 0, 0], [1.12, .95, 1]);
  add(head, G.sph(.24, 22, 16), c.muzzle ? mat(c.muzzle, { map: 'fur', r: 1 }) : belly, [0, -.13, .27], [0, 0, 0], [1.15 * (c.snoutW || 1), .62, .85 * (c.snout || 1)]);
  const jaw = grp(head, [0, -.2, .06], 'jaw'); jaw.rotation.x = c.jawOpen || 0;
  add(jaw, G.sph(.24, 20, 14), c.muzzle ? mat(c.muzzle, { map: 'fur', r: 1 }) : belly, [0, -.05, .14 * (c.snout || 1)], [0, 0, 0], [1.05 * (c.snoutW || 1), .4, .95 * (c.snout || 1)]);
  add(jaw, G.sph(.2, 14, 10), mat('#1a0808', { r: .8 }), [0, .01, .14 * (c.snout || 1)], [0, 0, 0], [.9, .2, .85]);
  const zf = .27 + .2 * (c.snout || 1);
  if (!c.beak) { const n = c.jagged ? 9 : 8; for (let i = 0; i < n; i++) { const a = (i / (n - 1) - .5) * 2.2, x = Math.sin(a) * .2 * (c.snoutW || 1), z = Math.cos(a) * .2 * (c.snout || 1);
      if (c.jagged) { add(head, G.cone(.022, .09, 4), tooth, [x, -.2, .27 + z * .85], [Math.PI, 0, 0]); add(jaw, G.cone(.02, .08, 4), tooth, [x * .95, .01, .14 * (c.snout || 1) + z * .85]); }
      else { add(head, G.box(.045, .055, .025), tooth, [x, -.19, .27 + z * .82], [0, a, 0]); add(jaw, G.box(.042, .05, .025), tooth, [x * .95, .02, .14 * (c.snout || 1) + z * .82], [0, a, 0]); } } }
  add(head, G.sph(.055, 12, 10), c.nose ? mat(c.nose, { r: .4 }) : dark, [0, -.04, zf + .02], [0, 0, 0], [1.3, .9, 1]);
  for (const sx of [-1, 1]) { const ey = grp(head, [sx * .145, .08, .27]);
    if (c.patch === sx) { add(ey, G.sph(.085, 14, 10), dark, [0, 0, .02], [0, 0, 0], [1, 1, .4]); add(head, G.tor(.3, .01), dark, [0, .05, 0], [0, 0, sx * .35], [1.15, 1, 1.02]); continue; }
    add(ey, G.sph(.068, 16, 12), white, [0, 0, 0]); add(ey, G.sph(.03, 12, 8), EYE(c.eye, c.eg || 1.6), [0, -.005, .058]); add(ey, G.sph(.013, 8, 6), mat('#020202', { r: .1 }), [0, -.005, .085]);
    if (c.eg > 2) glow(ey, c.eye, [0, 0, .09], .14);
    add(ey, G.sph(.074, 16, 10, 0, Math.PI * 2, 0, Math.PI * .42), fur, [0, 0, 0], [.55, 0, 0]); // heavy half-closed lid
    if (c.brow !== false) add(head, G.box(.12, .03, .03), dark, [sx * .145, .18, .31], [0, 0, sx * -.22]); }
  return { body, head, fur, belly, endo, dark, tooth, white, jaw };
}
const furM = c => mat(c, { map: 'fur', bump: 'fur', bs: 1.6, r: 1 });
B.freddy = r => {
  const a = stageBot(r, { fur: '#7c4a22', belly: '#c4935a', muzzle: '#c4935a', eye: '#8ad0ff', eg: 1.8, hs: 1.05 });
  for (const sx of [-1, 1]) { add(a.head, G.sph(.1, 14, 10), a.fur, [sx * .3, .3, -.02], [0, 0, 0], [1, 1, .55]); add(a.head, G.sph(.06, 12, 8), a.belly, [sx * .3, .3, .02], [0, 0, 0], [1, 1, .4]); }
  const hat = mat('#0c0c0c', { r: .5 }); add(a.head, G.cyl(.16, .16, .03, 20), hat, [0, .33, 0]); add(a.head, G.cyl(.105, .11, .2, 20), hat, [0, .44, 0]); add(a.head, G.cyl(.112, .112, .03, 20), mat('#101010', { r: .7 }), [0, .37, 0]);
  const bt = mat('#0c0c0c', { r: .5 }); for (const sx of [-1, 1]) add(a.body, G.cone(.08, .13, 4), bt, [sx * .07, 2.12, .3], [0, 0, sx * Math.PI / 2]); add(a.body, G.sph(.03, 8, 6), bt, [0, 2.12, .32]);
  const mic = grp(r.getObjectByName('armR').userData.hand, [0, -.1, .08]); add(mic, G.cyl(.022, .016, .22, 10), mat('#141414', { r: .4 }), [0, 0, 0], [.4, 0, 0]); add(mic, G.sph(.045, 14, 10), mat('#8a8a8a', { m: .8, r: .4 }), [0, .11, .05]);
  const cord = tube(mic, [[0, -.1, -.04], [.05, -.3, .05], [-.04, -.5, .1], [.03, -.7, .04]], .008, mat('#141414'));
};
B.bonnie = r => {
  const a = stageBot(r, { fur: '#5e57a8', belly: '#a79bd6', muzzle: '#a79bd6', eye: '#e040b8', eg: 1.8, nose: '#c04060', hs: 1.02 });
  const inner = mat('#c9a5d8', { map: 'fur', r: 1 });
  for (const sx of [-1, 1]) { const e = grp(a.head, [sx * .15, .3, -.04]); e.rotation.z = sx * -.12; add(e, G.cap(.075, .22), a.fur, [0, .16, 0], [0, 0, 0], [1, 1, .5]); add(e, G.cyl(.02, .02, .06, 6), a.endo, [0, .33, 0]);
    const e2 = grp(e, [0, .36, 0]); e2.rotation.z = sx * -.08; add(e2, G.cap(.07, .2), a.fur, [0, .14, 0], [0, 0, 0], [1, 1, .5]); add(e2, G.cap(.045, .16), inner, [0, .14, .025], [0, 0, 0], [1, 1, .3]); add(e, G.cap(.045, .18), inner, [0, .16, .025], [0, 0, 0], [1, 1, .3]); }
  const red = mat('#b02020', { r: .45 }); for (const sx of [-1, 1]) add(a.body, G.cone(.08, .13, 4), red, [sx * .07, 2.12, .3], [0, 0, sx * Math.PI / 2]); add(a.body, G.sph(.03, 8, 6), red, [0, 2.12, .32]);
  const gt = grp(a.body, [.05, 1.55, .45]); gt.rotation.set(0, 0, -.65); const gred = mat('#b02020', { r: .3, m: .1 }), wood = mat('#3a2414', { r: .6 }), str = mat('#d8d8d8', { m: 1, r: .3 });
  for (const sx of [-1, 1]) add(gt, G.box(.13, .48, .05), gred, [sx * .1, -.2, 0], [0, 0, sx * -.45]); add(gt, G.box(.16, .12, .055), gred, [0, .02, 0]);
  add(gt, G.box(.055, .72, .035), wood, [0, .45, .005]); add(gt, G.box(.09, .15, .03), gred, [0, .87, 0], [0, 0, .25]);
  for (let i = 0; i < 4; i++) add(gt, G.box(.004, .95, .004), str, [(i - 1.5) * .011, .38, .03]);
  for (let i = 0; i < 2; i++) add(gt, G.cyl(.018, .018, .01, 10), str, [-.03 + i * .06, -.05, .032], [Math.PI / 2, 0, 0]);
};
function bibMat() { return canvasMat(256, 256, (g, w, h) => { g.fillStyle = '#f4f1e6'; g.fillRect(0, 0, w, h); for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(120,100,60,${Math.random() * .08})`; g.fillRect(Math.random() * w, Math.random() * h, 6, 6); }
  g.strokeStyle = '#c8b8a0'; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, h - 12);
  g.fillStyle = '#6a2a8a'; g.textAlign = 'center'; g.font = 'bold 62px Arial Black, Impact, sans-serif'; g.fillText("LET'S", 128, 100); g.fillText('EAT!!!', 128, 172);
  g.fillStyle = '#e0702a'; for (const [x, y] of [[40, 220], [128, 225], [215, 220]]) { g.beginPath(); g.arc(x, y, 10, 0, 6.283); g.fill(); } }, { r: .9, ds: true }); }
B.chica = r => {
  const a = stageBot(r, { fur: '#e2c21c', belly: '#f0dc6a', eye: '#b046d0', eg: 1.8, beak: true, legM: '#e8762a', footM: '#e8762a', nails: true, brow: true, hs: 1.02 });
  const orange = mat('#e8762a', { r: .5 }), inside = mat('#1a0808', { r: .8 });
  add(a.head, G.cone(.2, .36, 18), orange, [0, -.1, .52], [Math.PI / 2, 0, 0], [1.2, 1, .55]); add(a.head, G.sph(.2, 16, 10), orange, [0, -.1, .36], [0, 0, 0], [1.2, .55, .7]);
  add(a.jaw, G.cone(.17, .3, 16), orange, [0, -.04, .44], [Math.PI / 2, 0, 0], [1.15, 1, .35]); add(a.jaw, G.box(.3, .02, .28), inside, [0, .0, .3]); a.jaw.rotation.x = .28;
  for (let i = 0; i < 8; i++) { const u = (i / 7 - .5); add(a.head, G.box(.035, .045, .02), a.tooth, [u * .32, -.17, .4 + (.25 - u * u) * .4], [0, u * 1.6, 0]); add(a.jaw, G.box(.033, .04, .02), a.tooth, [u * .28, .01, .38 + (.25 - u * u) * .35], [0, u * 1.6, 0]); }
  for (let i = 0; i < 3; i++) add(a.head, G.cone(.04, .2, 6), a.fur, [(i - 1) * .06, .38, -.02 - i * .02], [-.3 + i * .15, 0, (i - 1) * .4]); // feather tuft
  const bib = new THREE.Mesh(new THREE.SphereGeometry(.46, 24, 16, Math.PI * .25, Math.PI * .5, Math.PI * .3, Math.PI * .38), bibMat()); bib.position.set(0, 1.62, -.02); bib.scale.set(.95, 1.05, 1.03); KEEP(bib); bib.castShadow = true; a.body.add(bib);
  const hand = r.getObjectByName('armL').userData.hand, cp = grp(hand, [0, -.1, .14]); cp.rotation.x = 1.4;
  add(cp, G.cyl(.16, .14, .02, 24), mat('#f4f4f0', { r: .25 }), [0, 0, 0]); const pink = mat('#e86aa8', { map: 'fur', r: .8 });
  add(cp, G.cyl(.07, .055, .08, 14), mat('#f0a0c8', { r: .6 }), [0, .05, 0]); add(cp, G.sph(.085, 16, 12), pink, [0, .12, 0], [0, 0, 0], [1, .75, 1]);
  for (const sx of [-1, 1]) { add(cp, G.sph(.022, 10, 8), mat('#f2f2ee', { r: .2 }), [sx * .03, .13, .07]); add(cp, G.sph(.01, 6, 4), mat('#3a2a6a'), [sx * .03, .13, .09]); }
  add(cp, G.cyl(.008, .008, .07, 6), mat('#f4e8a0'), [0, .22, 0]); add(cp, G.sph(.012, 8, 6), EYE('#ffaa30', 2.5), [0, .265, 0]); add(cp, G.box(.03, .008, .01), a.tooth, [0, .095, .08]);
};
B.foxy = r => {
  const a = stageBot(r, { fur: '#a2311f', belly: '#d8a77a', muzzle: '#d8a77a', eye: '#ffd23a', eg: 2.6, patch: -1, hook: 1, endoHand: -1, torn: true, shorts: '#5a3a1e', endoLegs: true, snout: 1.55, snoutW: .85, jagged: true, jawOpen: .45, nose: '#141414', hs: 1 });
  for (const sx of [-1, 1]) { const e = grp(a.head, [sx * .2, .28, -.04]); e.rotation.z = sx * -.3; add(e, G.cone(.11, .3, 4), a.fur, [0, .13, 0], [0, Math.PI / 4, 0], [1, 1, .45]); add(e, G.cone(.07, .2, 4), a.belly, [0, .11, .03], [0, Math.PI / 4, 0], [1, 1, .3]); }
  const tail = grp(a.body, [0, 1.1, -.32], 'tail'); add(tail, G.cap(.06, .3), a.fur, [0, -.15, -.12], [-.9, 0, 0]);
  const L = r.getObjectByName('legL').userData.low; add(L, G.sph(.13, 12, 10), a.fur, [0, -.05, 0], [0, 0, 0], [1, .6, 1]); // fabric scraps on the knees
};
B.springtrap = r => {
  const a = stageBot(r, { fur: '#77763f', belly: '#8c8a52', muzzle: '#8c8a52', eye: '#d8ffd8', eg: 3.2, jawOpen: .12, brow: false, nose: '#3a3220', hs: 1.03, legM: '#77763f' });
  a.fur.userData.tx = 'fur'; const rot = mat('#3a3a1e', { map: 'fur', r: 1 }), hole = mat('#050505', { r: 1 }), wire = mat('#222222', { m: .5, r: .5 });
  for (const [x, y, z, s] of [[.2, 1.62, .34, 1], [-.22, 1.42, .35, .8], [.32, 1.85, .2, .7], [-.12, 1.88, .3, .6], [0, 1.2, .3, .7]]) { add(a.body, G.sph(.09 * s, 12, 10), hole, [x, y, z], [0, 0, 0], [1, 1, .5]); add(a.body, G.sph(.12 * s, 12, 10), rot, [x, y, z - .02], [0, 0, 0], [1.2, 1.1, .45]);
    for (let k = 0; k < 3; k++) tube(a.body, [[x, y, z], [x + (k - 1) * .03, y - .08, z + .04], [x + (k - 1) * .05, y - .2 - k * .05, z + .03]], .006, wire, 12, 5); }
  // ears: one upright, one snapped and hanging
  const e1 = grp(a.head, [.15, .3, -.04]); e1.rotation.z = -.1; add(e1, G.cap(.07, .36), a.fur, [0, .24, 0], [0, 0, 0], [1, 1, .5]);
  const e2 = grp(a.head, [-.15, .3, -.04]); add(e2, G.cap(.07, .14), a.fur, [0, .1, 0], [0, 0, 0], [1, 1, .5]); add(e2, G.cyl(.012, .012, .1, 6), a.endo, [0, .24, 0]);
  const e3 = grp(e2, [0, .25, 0]); e3.rotation.z = 2.3; add(e3, G.cap(.065, .2), a.fur, [0, .14, 0], [0, 0, 0], [1, 1, .5]);
  for (let i = 0; i < 9; i++) { const u = (i / 8 - .5); add(a.head, G.box(.04, .06, .02), a.tooth, [u * .36, -.19, .44 + (.25 - u * u) * .28], [0, u * 1.4, 0]); } // wide toothy grin
  add(a.head, G.sph(.1, 12, 10), rot, [.22, .15, .2], [0, 0, 0], [1, 1, .5]); add(a.head, G.sph(.06, 10, 8), hole, [-.2, -.05, .28], [0, 0, 0], [1, 1, .4]);
};
// --- Demogorgon: very tall, gaunt, glossy wet sinewy ridged skin, arms past the knees with long claws, five-petal head (closed bud idle, opens to attack)
B.demogorgon = r => {
  const skin = mat('#3e322e', { map: 'skin', bump: 'skin', bs: 3.5, r: .28, m: .05 }), ridge = mat('#2c2220', { map: 'skin', bump: 'skin', bs: 4, r: .25 });
  const inner = mat('#7a1018', { r: .3, e: '#300006', ei: .8 }), tooth = mat('#efe8d6', { r: .35 }), claw = mat('#1c1410', { r: .3 });
  const body = grp(r, [0, 0, 0], 'body');
  for (const sx of [-1, 1]) { const l = limb(body, [sx * .17, 1.45, 0], .78, .085, skin, skin, .74); l.name = sx < 0 ? 'legL' : 'legR'; l.rotation.x = -.18; l.userData.low.rotation.x = .36;
    add(l, G.sph(.1, 14, 10), skin, [0, -.3, .02], [0, 0, 0], [1, 2.6, 1.1]); add(l.userData.low, G.sph(.08, 12, 8), skin, [0, -.3, -.02], [0, 0, 0], [1, 3, 1]);
    for (let i = 0; i < 4; i++) add(l, G.cap(.012, .2), ridge, [sx * .05 * (i % 2 ? 1 : -1), -.15 - i * .14, .07], [.1, 0, 0]);
    const ft = grp(l.userData.low, [0, -.74, .05]); add(ft, G.sph(.09, 12, 8), skin, [0, -.02, .08], [0, 0, 0], [.8, .35, 1.8]); for (let i = -1; i <= 1; i++) add(ft, G.cone(.012, .09, 6), claw, [i * .04, -.03, .26], [Math.PI / 2, 0, 0]); }
  add(body, G.sph(.2, 18, 14), skin, [0, 1.5, -.02], [0, 0, 0], [1.15, .7, .8]); add(body, G.cap(.12, .36), skin, [0, 1.78, 0], [.12, 0, 0], [1, 1, .78]);
  add(body, G.sph(.27, 22, 18), skin, [0, 2.2, .04], [.28, 0, 0], [1.05, 1.3, .7]);
  for (let i = 0; i < 6; i++) { const rb = add(body, new THREE.TorusGeometry(.22 - Math.abs(i - 2.5) * .012, .02, 6, 18, Math.PI * .9), ridge, [0, 2.0 + i * .07, .07], [Math.PI / 2 + .25, 0, Math.PI * .05]); rb.scale.set(1.1, .82, 1); }
  for (let i = 0; i < 6; i++) for (const sx of [-1, 1]) add(body, G.cap(.012, .2), ridge, [sx * (.05 + (i % 2) * .05), 1.6 + i * .06, .14], [0, 0, sx * .2]); // sinewy abdomen
  for (let i = 0; i < 12; i++) add(body, G.sph(.034, 8, 6), ridge, [0, 1.55 + i * .1, -.16 - Math.sin(i / 11 * Math.PI) * .08], [0, 0, 0], [1, .7, 1.3]);
  for (const sx of [-1, 1]) { add(body, G.cap(.03, .28), skin, [sx * .16, 2.5, .1], [0, 0, sx * 1.35]); add(body, G.sph(.11, 14, 10), skin, [sx * .35, 2.45, 0], [0, 0, 0], [1, .85, .9]); }
  add(body, G.cap(.075, .16), skin, [0, 2.6, .1], [.65, 0, 0]);
  for (const sx of [-1, 1]) { const a = limb(body, [sx * .38, 2.45, 0], 1.0, .055, skin, skin, 1.0); a.name = sx < 0 ? 'armL' : 'armR'; a.rotation.z = sx * .14;
    add(a, G.sph(.07, 12, 8), skin, [0, -.38, 0], [0, 0, 0], [1, 3, 1]); add(a.userData.low, G.sph(.055, 12, 8), skin, [0, -.3, 0], [0, 0, 0], [1, 3.4, 1]);
    for (let i = 0; i < 3; i++) add(a.userData.low, G.cap(.01, .3), ridge, [sx * .03 * (i - 1), -.3, .04], [0, 0, 0]);
    for (let i = -2; i <= 2; i++) { const f = grp(a.userData.low, [i * .025, -1.02, 0]); f.rotation.set(.2, 0, i * .1); add(f, G.cap(.011, .2), skin, [0, -.11, 0]); const f2 = grp(f, [0, -.22, 0]); f2.rotation.x = .4; add(f2, G.cap(.009, .16), skin, [0, -.09, 0]); add(f2, G.cone(.01, .14, 6), claw, [0, -.24, 0], [Math.PI, 0, 0]); } }
  const head = grp(body, [0, 2.8, .14], 'head'); head.rotation.x = -.25;
  add(head, G.sph(.14, 14, 10), mat('#2a0408', { r: .25 }), [0, 0, .04]); add(head, G.sph(.13, 16, 12), skin, [0, -.02, -.07], [0, 0, 0], [1, 1, 1.2]);
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; add(head, G.cone(.012, .07, 6), tooth, [Math.cos(a) * .09, Math.sin(a) * .09, .12], [Math.PI / 2, 0, 0]); }
  head.userData.petals = [];
  for (let i = 0; i < 5; i++) { const p = grp(head, [0, 0, .05]); p.rotation.z = i * Math.PI * 2 / 5 + Math.PI / 2;
    const hinge = grp(p, [0, .1, 0]); head.userData.petals.push(hinge); hinge.rotation.x = 1.3;
    add(hinge, G.sph(.21, 14, 10), skin, [0, .24, -.01], [0, 0, 0], [.72, 1.35, .26]); add(hinge, G.cap(.012, .3), ridge, [0, .24, -.06]);
    add(hinge, G.sph(.19, 12, 8), inner, [0, .24, .03], [0, 0, 0], [.6, 1.2, .16]);
    for (let row = 0; row < 3; row++) for (let k = 0; k < 6 - row; k++) { const u = (k - (5 - row) / 2) / 3, y = .12 + row * .1 + u * u * .1; add(hinge, G.cone(.014 - row * .002, .07 - row * .012, 6), tooth, [u * (.2 - row * .04), y, .06], [Math.PI / 2 - .25, 0, 0]); } }
};
// --- Siren Head: extremely tall, emaciated, brown dried flesh with ribs; arms to the ground; a pole neck carrying two black sirens facing sideways + dangling wires
B.sirenhead = r => {
  const skin = mat('#6a4a32', { map: 'skin', bump: 'skin', bs: 4.5, r: .95 }), dk = mat('#3e2a1c', { map: 'skin', bump: 'skin', bs: 5, r: 1 });
  const metal = mat('#4e4e4a', { map: 'metal', m: .75, r: .5 }), rust = mat('#5a3420', { map: 'metal', m: .5, r: .7 }), horn = mat('#141414', { map: 'metal', m: .55, r: .5 }), inside = mat('#0a0a0a', { r: 1 }), wire = mat('#1a1a1a', { r: .6 });
  const body = grp(r, [0, 0, 0], 'body');
  for (const sx of [-1, 1]) { const l = limb(body, [sx * .22, 3.7, 0], 1.9, .08, skin, dk, 1.8); l.name = sx < 0 ? 'legL' : 'legR';
    add(l, G.sph(.1, 12, 8), skin, [0, -.6, 0], [0, 0, 0], [1, 4, 1]); add(l.userData.low, G.sph(.09, 12, 8), skin, [0, -.02, .04], [0, 0, 0], [1, 1, 1.1]);
    const ft = grp(l.userData.low, [0, -1.8, .05]); add(ft, G.sph(.1, 12, 8), skin, [0, -.02, .1], [0, 0, 0], [.9, .35, 2.3]); }
  add(body, G.sph(.2, 14, 10), skin, [0, 3.75, 0], [0, 0, 0], [1.3, .7, .8]); add(body, G.cyl(.16, .13, .7, 10), dk, [0, 4.15, -.02], [0, 0, 0], [1, 1, .7]); // shrunken belly
  add(body, G.cyl(.34, .2, 1.25, 12), skin, [0, 5.05, .04], [.14, 0, 0], [1, 1, .55]);
  for (let i = 0; i < 9; i++) { const rb = add(body, new THREE.TorusGeometry(.3 - Math.abs(i - 5) * .015, .024, 6, 20, Math.PI * 1.1), skin, [0, 4.5 + i * .11, .08], [Math.PI / 2 + .12, 0, -Math.PI * .05]); rb.scale.set(1, .62, 1); }
  for (let i = 0; i < 14; i++) add(body, G.sph(.03, 8, 6), dk, [0, 3.9 + i * .13, -.16], [0, 0, 0], [1, .7, 1.4]); // spine knobs
  for (const sx of [-1, 1]) { add(body, G.sph(.1, 12, 8), skin, [sx * .4, 5.62, 0]); add(body, G.cap(.03, .36), skin, [sx * .2, 5.66, .08], [0, 0, sx * 1.4]);
    const a = limb(body, [sx * .44, 5.6, 0], 2.55, .05, skin, dk, 2.55); a.name = sx < 0 ? 'armL' : 'armR'; a.rotation.z = sx * .06;
    add(a, G.sph(.06, 10, 8), skin, [0, -1, 0], [0, 0, 0], [1, 7, 1]); add(a.userData.low, G.sph(.05, 10, 8), skin, [0, -1, 0], [0, 0, 0], [1, 8, 1]);
    for (let i = -2; i <= 2; i++) { const f = grp(a.userData.low, [i * .03, -2.6, 0]); f.rotation.set(.12, 0, i * .07); add(f, G.cap(.014, .3), skin, [0, -.17, 0]); const f2 = grp(f, [0, -.34, 0]); f2.rotation.x = .3; add(f2, G.cap(.012, .26), dk, [0, -.14, 0]); } }
  const head = grp(body, [0, 5.78, .1], 'head');
  add(head, G.cyl(.06, .085, 2.0, 8), rust, [0, 1.0, 0]); for (let i = 0; i < 5; i++) add(head, G.tor(.075, .012), metal, [0, .3 + i * .38, 0], [Math.PI / 2, 0, 0]);
  add(head, G.box(1.1, .08, .08), metal, [0, 2.02, 0]); add(head, G.cyl(.12, .14, .22, 12), metal, [0, 2.0, 0]);
  for (const sx of [-1, 1]) { const h = grp(head, [sx * .3, 2.12, 0]); h.rotation.z = -sx * Math.PI / 2; // horn axis points sideways
    add(h, G.cyl(.17, .17, .3, 16), horn, [0, 0, 0]); add(h, G.cyl(.38, .15, .6, 20, 1, true), horn, [0, .44, 0]); add(h, G.cyl(.36, .36, .01, 20), inside, [0, .72, 0]);
    add(h, G.tor(.38, .02), horn, [0, .74, 0], [Math.PI / 2, 0, 0]); for (let k = 0; k < 4; k++) add(h, G.box(.012, .012, .7), metal, [0, .7, 0], [0, k * Math.PI / 4, 0]); }
  for (let k = 0; k < 7; k++) { const x = (k - 3) * .08, z = (k % 2 ? .06 : -.05), y0 = 2.0, len = .6 + (k * 37 % 9) * .12;
    wig(tube(head, [[x, y0, z], [x * 1.3 + .05, y0 - len * .4, z + .04], [x * 1.1 - .03, y0 - len * .8, z], [x * 1.2, y0 - len, z + .05]], .01, wire, 14, 5), 'z', .06, 1.1, k); }
};
// --- Boisvert: a flat pure-black silhouette, rounded shoulders, the neck flaring into a huge flat anvil/brim head, two tiny white glints; grainy film static around him
function noiseMat() { return new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: { uT: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
  fragmentShader: 'uniform float uT; varying vec2 vUv; float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); } void main(){ vec2 q = floor(vUv * vec2(160., 240.)); float n = h(q + floor(uT * 24.)); float line = step(.985, h(vec2(floor(vUv.y * 90.), floor(uT * 12.)))); vec2 c = (vUv - .5) * vec2(2., 2.); float m = 1. - smoothstep(.35, 1., length(c * vec2(1.1, .8))); float a = (n * .55 + line * .5) * m * .7; gl_FragColor = vec4(vec3(n * .9 + .05), a); }' }); }
B.boisvert = r => {
  const blk = mat('#030303', { r: 1 }), body = grp(r, [0, 0, 0], 'body');
  for (const sx of [-1, 1]) { const l = limb(body, [sx * .15, 1.05, 0], .55, .1, blk, null, .5); l.name = sx < 0 ? 'legL' : 'legR'; add(l.userData.low, G.box(.14, .07, .3), blk, [0, -.5, .06]); }
  add(body, G.cap(.3, .55), blk, [0, 1.52, 0], [0, 0, 0], [1.1, 1, .6]); for (const sx of [-1, 1]) add(body, G.sph(.2, 18, 14), blk, [sx * .3, 1.86, 0], [0, 0, 0], [1, .85, .7]); // rounded shoulders
  for (const sx of [-1, 1]) { const a = limb(body, [sx * .4, 1.84, 0], .48, .085, blk, null, .48); a.name = sx < 0 ? 'armL' : 'armR'; a.rotation.z = sx * .1; add(a.userData.low, G.sph(.09, 12, 10), blk, [0, -.5, 0]); }
  add(body, G.cyl(.09, .14, .2, 16), blk, [0, 2.0, 0]);
  const head = grp(body, [0, 2.1, 0], 'head'), sh = new THREE.Shape(); // front-view anvil profile: the neck flares into a wide flat brim
  sh.moveTo(-.1, 0); sh.quadraticCurveTo(-.14, .12, -.42, .17); sh.quadraticCurveTo(-.85, .2, -1.25, .26); sh.quadraticCurveTo(-1.32, .3, -1.25, .34); sh.quadraticCurveTo(-.6, .4, 0, .41);
  sh.quadraticCurveTo(.6, .4, 1.25, .34); sh.quadraticCurveTo(1.32, .3, 1.25, .26); sh.quadraticCurveTo(.85, .2, .42, .17); sh.quadraticCurveTo(.14, .12, .1, 0); sh.lineTo(-.1, 0);
  const eg = new THREE.ExtrudeGeometry(sh, { depth: .34, bevelEnabled: true, bevelThickness: .03, bevelSize: .02, bevelSegments: 2, curveSegments: 14 }); eg.translate(0, 0, -.17);
  add(head, eg, blk); const wh = mat('#ffffff', { e: '#ffffff', ei: 2.5 });
  for (const sx of [-1, 1]) { add(head, G.sph(.016, 8, 6), wh, [sx * .11, .27, .2]); glow(head, '#ffffff', [sx * .11, .27, .22], .1); }
  const stat = grp(body, [0, 1.5, 0], 'static'); stat.userData.boisvert = 1; const nm = noiseMat(); stat.userData.u = nm.uniforms.uT;
  const pl = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.6), nm); pl.userData.keep = 1; pl.renderOrder = 5; stat.add(pl);
};
// --- Cone Zone (Doctor Nowhere): dark charcoal fuzzy hunched body, long segmented horizontal neck, tall pointed cone head with a small pale face, spider limbs, creeps low
function spiderLeg(parent, p, name, sx, fwd, m, j, L1, L2) {
  const L = grp(parent, p, name); L.rotation.set(fwd, 0, sx * 2.2); add(L, G.cyl(.035, .05, L1, 8), m, [0, -L1 / 2, 0]); add(L, G.sph(.06, 10, 8), j);
  const lo = grp(L, [0, -L1, 0]); lo.rotation.z = -sx * 1.75; L.userData.low = lo; add(lo, G.sph(.045, 10, 8), j); add(lo, G.cyl(.012, .035, L2, 8), m, [0, -L2 / 2, 0]);
  const t = grp(lo, [0, -L2, 0]); for (let i = -1; i <= 1; i++) add(t, G.cone(.012, .14, 5), m, [i * .02, -.05, .03], [Math.PI * .9, 0, i * .3]); return L;
}
B.dn_conezone = r => {
  const fz = mat('#2a2a2c', { map: 'fur', bump: 'fur', bs: 2, r: 1 }), dk = mat('#1a1a1c', { r: .9 }), pale = mat('#cfc6b8', { map: 'skin', r: .7 }), hole = mat('#000', { r: 1 });
  const body = grp(r, [0, 0, 0], 'body');
  add(body, G.sph(.36, 20, 16), fz, [0, 1.25, -.1], [-.2, 0, 0], [1, .8, 1.5]); add(body, G.sph(.26, 16, 12), fz, [0, 1.38, .35], [0, 0, 0], [1.2, .8, 1]); // hunched body
  spiderLeg(body, [-.25, 1.15, -.45], 'legL', -1, -.25, fz, dk, 1.15, 2.0); spiderLeg(body, [.25, 1.15, -.45], 'legR', 1, -.25, fz, dk, 1.15, 2.0);
  spiderLeg(body, [-.3, 1.3, .4], 'armL', -1, .35, fz, dk, 1.25, 2.1); spiderLeg(body, [.3, 1.3, .4], 'armR', 1, .35, fz, dk, 1.25, 2.1);
  let n = grp(body, [0, 1.42, .55]); n.rotation.x = Math.PI / 2 - .12; // segmented horizontal neck
  for (let i = 0; i < 6; i++) { add(n, G.cyl(.075, .085, .2, 12), fz, [0, .1, 0]); add(n, G.tor(.085, .018), dk, [0, .2, 0], [Math.PI / 2, 0, 0]); const g2 = grp(n, [0, .21, 0]); g2.rotation.x = i === 5 ? 0 : -.02; wig(g2, 'z', .03, 1.2, i * .6); n = g2; }
  const head = grp(n, [0, .05, 0], 'head'); const hd = grp(head, [0, 0, 0]); hd.rotation.x = -Math.PI / 2 + .12;
  add(hd, G.cone(.26, 1.9, 28), fz, [0, 1.02, 0]); add(hd, G.cyl(.27, .25, .14, 24), fz, [0, .04, 0]);
  add(hd, G.sph(.13, 16, 12), pale, [0, .14, .2], [0, 0, 0], [1, 1.1, .45]); for (const sx of [-1, 1]) add(hd, G.sph(.032, 10, 8), hole, [sx * .045, .17, .25], [0, 0, 0], [1, 1.4, .5]);
  add(hd, G.sph(.02, 8, 6), hole, [0, .07, .255], [0, 0, 0], [1.4, .7, .5]);
};
// --- Guilt (Doctor Nowhere): extremely tall, thin, pure white; ribs; arms to the knees, long fingers; small flat square face plate with two dark eyes; exposed teeth/jaw; strings from face to shoulders
B.dn_guilt = r => {
  const w = mat('#eeeee8', { map: 'skin', bump: 'skin', bs: 1.5, r: .6 }), sh = mat('#cfcfc8', { r: .7 }), blk = mat('#050505', { r: 1 }), tooth = mat('#e8e2cc', { r: .35 }), gum = mat('#8a6a64', { r: .6 });
  const body = grp(r, [0, 0, 0], 'body');
  for (const sx of [-1, 1]) { const l = limb(body, [sx * .14, 2.0, 0], 1.0, .06, w, sh, .98); l.name = sx < 0 ? 'legL' : 'legR'; add(l.userData.low, G.box(.1, .05, .3), w, [0, -.98, .08]); }
  add(body, G.sph(.17, 14, 10), w, [0, 2.05, 0], [0, 0, 0], [1.2, .7, .8]); add(body, G.cyl(.1, .13, .6, 12), w, [0, 2.4, 0], [0, 0, 0], [1, 1, .7]);
  add(body, G.cyl(.24, .14, .8, 14), w, [0, 3.0, 0], [0, 0, 0], [1, 1, .6]);
  for (let i = 0; i < 7; i++) { const rb = add(body, new THREE.TorusGeometry(.2 - Math.abs(i - 4) * .012, .016, 6, 18, Math.PI * 1.1), sh, [0, 2.75 + i * .085, .04], [Math.PI / 2 + .1, 0, -Math.PI * .05]); rb.scale.set(1, .6, 1); }
  for (const sx of [-1, 1]) { add(body, G.sph(.08, 12, 8), w, [sx * .27, 3.38, 0]);
    const a = limb(body, [sx * .29, 3.36, 0], .85, .04, w, sh, .85); a.name = sx < 0 ? 'armL' : 'armR'; a.rotation.z = sx * .06;
    for (let i = -1.5; i <= 1.5; i++) { const f = grp(a.userData.low, [i * .022, -.88, 0]); f.rotation.set(.1, 0, i * .06); add(f, G.cap(.008, .26), w, [0, -.14, 0]); const f2 = grp(f, [0, -.29, 0]); f2.rotation.x = .25; add(f2, G.cap(.007, .2), w, [0, -.11, 0]); } }
  add(body, G.cyl(.045, .06, .3, 8), w, [0, 3.5, 0]);
  const head = grp(body, [0, 3.72, .02], 'head');
  add(head, G.sph(.13, 14, 10), w, [0, 0, -.05], [0, 0, 0], [1, 1.2, 1]);
  add(head, G.box(.26, .24, .035), w, [0, .06, .1]); for (const sx of [-1, 1]) add(head, G.sph(.03, 10, 8), blk, [sx * .055, .09, .12], [0, 0, 0], [1, 1.2, .4]);
  add(head, G.box(.16, .1, .12), gum, [0, -.12, .03]); for (let i = 0; i < 7; i++) { add(head, G.box(.016, .035, .012), tooth, [(i - 3) * .02, -.085, .09]); add(head, G.box(.016, .03, .012), tooth, [(i - 3) * .02, -.14, .085]); }
  add(head, G.box(.14, .03, .1), w, [0, -.18, .04]); // bare jaw bone
  for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) rod(body, [sx * (.08 + k * .03), 3.72 + .1 - k * .06, .12], [sx * (.2 + k * .04), 3.4, .06 - k * .02], .006, .006, w); // strings / tendons
};
// --- Locust additions: smudged, dripping ink body and hose "hair" coiling round the head and neck
{ const base = B.locust; B.locust = r => { base(r); const body = r.getObjectByName('body'), head = r.getObjectByName('head'), ink = mat('#060607', { r: .3, m: .1 }), tube2 = mat('#141518', { r: .35, m: .5 });
  for (let i = 0; i < 22; i++) { const y = .8 + (i * 47 % 23) / 23 * 2.0, a = i * 2.4; add(body, G.sph(.04 + (i % 3) * .015, 8, 6), ink, [Math.cos(a) * .17, y, Math.sin(a) * .1], [0, 0, 0], [.7, 2.8 + (i % 4), .7]); } // drips
  for (const sx of [-1, 1]) { const a = r.getObjectByName(sx < 0 ? 'armL' : 'armR'); for (let i = 0; i < 4; i++) add(a.userData.low, G.sph(.025, 8, 6), ink, [0, -.25 - i * .17, .02], [0, 0, 0], [.8, 3, .8]); }
  for (let k = 0; k < 7; k++) { const a0 = k / 7 * 6.283, pts = []; for (let i = 0; i <= 8; i++) { const u = i / 8, a = a0 + u * 2.2; pts.push([Math.cos(a) * (.2 + u * .06), .25 - u * .7 + Math.sin(u * 9 + k) * .04, Math.sin(a) * (.17 + u * .05) - .03]); } wig(tube(head, pts, .018, tube2, 40, 6), 'y', .05, .9, k); }
  for (let i = 0; i < 6; i++) add(head, G.tor(.1 + i * .006, .016), tube2, [0, -.34 - i * .04, .02], [Math.PI / 2 + Math.sin(i) * .3, 0, i * .5]); } }
// --- Cartoon Cat: very tall thin black rubber-hose cat, huge round white eyes, enormous toothy grin, pointy ears, grey belly patch, white 4-finger gloves, floats
B.cartooncat = r => {
  const blk = mat('#0b0b0b', { r: .5 }), grey = mat('#3a3a3c', { r: .55 }), wht = mat('#f6f6f6', { r: .35 }), mouth = mat('#1a0404', { r: .7 });
  const body = grp(r, [0, 0, 0], 'body'), hv = grp(body, [0, .35, 0], 'hover');
  for (const sx of [-1, 1]) { const l = limb(hv, [sx * .16, 1.55, 0], .8, .055, blk, null, .78); l.name = sx < 0 ? 'legL' : 'legR'; add(l.userData.low, G.sph(.12, 12, 10), blk, [0, -.8, .08], [0, 0, 0], [1, .55, 1.6]); }
  add(hv, G.cap(.2, .75), blk, [0, 2.0, 0], [0, 0, 0], [1, 1, .75]); add(hv, G.sph(.17, 16, 12), grey, [0, 1.9, .1], [0, 0, 0], [.9, 1.8, .5]);
  const tail = chain(hv, [0, 1.62, -.12], 7, .2, .04, .025, blk, .25, { wave: .3, f: 2, axis: 'z' }); tail.rotation.x = -2.5;
  for (const sx of [-1, 1]) { const a = limb(hv, [sx * .25, 2.42, 0], 1.0, .045, blk, null, 1.0); a.name = sx < 0 ? 'armL' : 'armR'; a.rotation.z = sx * .3;
    const h = grp(a.userData.low, [0, -1.02, 0]); add(h, G.cyl(.09, .07, .1, 14), wht, [0, .02, 0]); add(h, G.sph(.13, 14, 12), wht, [0, -.1, 0], [0, 0, 0], [1, .9, .7]);
    for (let i = 0; i < 3; i++) add(h, G.cap(.04, .12), wht, [(i - 1) * .075, -.26, .02], [.1, 0, (i - 1) * .15]); add(h, G.cap(.038, .1), wht, [sx * -.13, -.14, .04], [0, 0, sx * .9]); }
  add(hv, G.cyl(.06, .08, .2, 10), blk, [0, 2.65, 0]);
  const head = grp(hv, [0, 3.0, .02], 'head');
  add(head, G.sph(.46, 24, 18), blk, [0, 0, 0], [0, 0, 0], [1.2, .92, .95]);
  for (const sx of [-1, 1]) { add(head, G.cone(.15, .5, 4), blk, [sx * .34, .45, -.02], [0, Math.PI / 4, sx * -.35]); add(head, G.cone(.08, .3, 4), grey, [sx * .33, .42, .04], [0, Math.PI / 4, sx * -.35]); }
  for (const sx of [-1, 1]) { add(head, G.sph(.17, 20, 16), wht, [sx * .18, .14, .33], [0, 0, 0], [.85, 1.15, .55]); add(head, G.sph(.065, 12, 10), blk, [sx * .16, .1, .42], [0, 0, 0], [1, 1.2, .5]); add(head, G.sph(.018, 8, 6), wht, [sx * .14, .14, .44]); }
  const grin = new THREE.Mesh(new THREE.SphereGeometry(.47, 36, 14, Math.PI * .08, Math.PI * .84, Math.PI * .52, Math.PI * .24), mouth); grin.position.set(0, .02, .02); grin.scale.set(1.22, 1, 1.02); head.add(grin);
  for (let i = -9; i <= 9; i++) { const a = Math.PI / 2 + i * .085, x = -Math.cos(a) * .5 * 1.18, z = Math.sin(a) * .46; add(head, G.box(.045, .09, .02), wht, [x, -.06 - Math.abs(i) * .004, z * .99], [0, -a + Math.PI / 2, 0]); add(head, G.box(.045, .08, .02), wht, [x * .98, -.19 + Math.abs(i) * .006, z * .97], [0, -a + Math.PI / 2, 0]); }
  add(head, G.sph(.05, 10, 8), mat('#141414'), [0, .02, .45]);
};
// --- Sonic.exe (teen-level): dark navy grainy classic shape, big swept quills, black hollow eyes with glowing red pupils, tan muzzle with blood stains and a wide grin of yellow-green teeth,
// tan belly and arms, white gloves spotted red, red shoes with a white strap
B.sonicexe = r => {
  const blue = mat('#16224e', { map: 'fur', bump: 'fur', bs: 2.2, r: .85 }), tan = mat('#d6a878', { map: 'skin', r: .65 }), wht = mat('#f2f2f2', { r: .4 }), red = mat('#b51418', { r: .35 }), blk = mat('#020202', { r: 1 });
  const blood = mat('#6e0a0c', { r: .3 }), teeth = mat('#c8c870', { r: .35 }), body = grp(r, [0, 0, 0], 'body');
  for (const sx of [-1, 1]) { const l = limb(body, [sx * .12, .82, 0], .4, .045, blue, null, .38); l.name = sx < 0 ? 'legL' : 'legR';
    add(l.userData.low, G.sph(.15, 14, 10), red, [0, -.4, .1], [0, 0, 0], [1, .65, 1.75]); add(l.userData.low, G.box(.2, .05, .1), wht, [0, -.36, .1]); add(l.userData.low, G.box(.06, .04, .1), mat('#d8b020'), [sx * .09, -.36, .1]); add(l.userData.low, G.box(.22, .04, .34), wht, [0, -.47, .1]); }
  add(body, G.sph(.27, 18, 14), blue, [0, 1.05, 0], [0, 0, 0], [1, 1.15, .85]); add(body, G.sph(.2, 16, 12), tan, [0, 1.02, .12], [0, 0, 0], [1, 1.2, .6]);
  for (const sx of [-1, 1]) { const a = limb(body, [sx * .28, 1.28, 0], .38, .04, tan, null, .36); a.name = sx < 0 ? 'armL' : 'armR'; a.rotation.z = sx * .25;
    add(a.userData.low, G.sph(.1, 12, 10), wht, [0, -.4, 0]); add(a.userData.low, G.cyl(.075, .075, .08, 10), wht, [0, -.3, 0]);
    for (let i = 0; i < 4; i++) add(a.userData.low, G.sph(.022 + (i % 2) * .01, 8, 6), blood, [Math.sin(i * 2.1) * .07, -.38 - (i % 3) * .04, Math.cos(i * 2.1) * .07], [0, 0, 0], [1, 1, .4]); }
  const head = grp(body, [0, 1.65, 0], 'head');
  add(head, G.sph(.36, 22, 18), blue, [0, 0, 0], [0, 0, 0], [1.05, .95, 1]);
  for (let i = 0; i < 3; i++) { add(head, G.cone(.15 - i * .02, .78, 10), blue, [0, .24 - i * .22, -.36], [-1.95 + i * .3, 0, 0]); for (const sx of [-1, 1]) add(head, G.cone(.12, .66, 10), blue, [sx * .2, .16 - i * .22, -.32], [-1.95 + i * .3, sx * .42, 0]); }
  for (const sx of [-1, 1]) { add(head, G.cone(.1, .28, 6), blue, [sx * .2, .35, -.02], [0, 0, sx * -.3]); add(head, G.cone(.05, .16, 6), tan, [sx * .2, .34, .02], [0, 0, sx * -.3]); }
  add(head, G.sph(.22, 16, 12), wht, [0, .06, .22], [0, 0, 0], [1.25, .75, .6]);
  for (const sx of [-.085, .085]) { add(head, G.sph(.085, 14, 12), blk, [sx, .07, .32], [0, 0, 0], [1, 1.4, .45]); add(head, G.sph(.022, 8, 6), mat('#ff1010', { e: '#ff0000', ei: 3.5 }), [sx, .05, .365]); glow(head, '#ff2020', [sx, .05, .38], .12);
    add(head, G.sph(.02, 8, 6), blood, [sx * 1.05, -.06, .36], [0, 0, 0], [.6, 2.4, .4]); } // dark tear streaks
  add(head, G.sph(.21, 16, 12), tan, [0, -.13, .24], [0, 0, 0], [1.15, .72, .72]); add(head, G.sph(.045, 8, 6), blk, [0, -.05, .39]);
  for (const [x, y, s] of [[-.1, -.2, 1], [.12, -.22, .8], [.02, -.25, 1.2], [-.16, -.12, .7]]) add(head, G.sph(.04 * s, 10, 8), blood, [x, y, .36 - Math.abs(x) * .3], [0, 0, 0], [1.3, .8, .35]);
  const g = new THREE.Mesh(new THREE.SphereGeometry(.22, 24, 8, Math.PI * .1, Math.PI * .8, Math.PI * .54, Math.PI * .14), blk); g.position.set(0, -.11, .25); g.scale.set(1.2, .8, .78); head.add(g);
  for (let i = -6; i <= 6; i++) { const a = Math.PI / 2 + i * .1; add(head, G.cone(.012, .035, 4), teeth, [-Math.cos(a) * .24, -.15, .26 + Math.sin(a) * .15], [Math.PI, 0, 0]); add(head, G.cone(.011, .03, 4), teeth, [-Math.cos(a) * .23, -.2, .26 + Math.sin(a) * .14]); }
};
// --- Kraken: colossal octopus, blue-grey bumpy warty skin, bulbous mantle, glowing amber eyes, eight huge tentacles with big pale sucker rings, underwater blue haze
function suckerArm(parent, p, n, len, r0, r1, m, ring, bend, o = {}) {
  const root = grp(parent, p); let g = root;
  for (let i = 0; i < n; i++) { const t = i / n, r = +(r0 + (r1 - r0) * t).toFixed(2), r2 = +(r0 + (r1 - r0) * (i + 1) / n).toFixed(2);
    add(g, G.cyl(Math.max(.02, r2), r, len, 12), m, [0, len / 2, 0]); add(g, G.sph(r, 12, 8), m);
    for (const k of [.25, .75]) { add(g, G.tor(+(r * .32).toFixed(2), +(r * .09).toFixed(3)), ring, [0, len * k, r * .9], [0, 0, 0]); add(g, G.sph(+(r * .22).toFixed(2), 8, 6), ring, [0, len * k, r * .86], [0, 0, 0], [1, 1, .4]); }
    const ng = grp(g, [0, len, 0]); ng.rotation.x = bend * (o.curl ? 1 + t * 1.6 : 1); wig(ng, 'x', o.wave ?? .12, o.f ?? 1.3, i * .5 + (o.ph || 0)); g = ng; }
  return root;
}
B.kraken = r => {
  const skin = mat('#55687a', { map: 'skin', bump: 'skin', bs: 3, r: .35 }), wart = mat('#46586a', { r: .4 }), ring = mat('#d8d0c4', { r: .45 }), body = grp(r, [0, 0, 0], 'body');
  add(body, G.sph(1.9, 28, 22), skin, [0, 4.6, -1.2], [-.55, 0, 0], [1, 1.45, 1.05]); // bulbous mantle
  for (let i = 0; i < 60; i++) { const u = (i * 0.618) % 1, v = (i * 0.377) % 1, th = u * Math.PI * 2, ph = .25 + v * 2.3; add(body, G.sph(.1 + (i % 4) * .04, 8, 6), wart, [Math.cos(th) * Math.sin(ph) * 1.9, 4.6 + Math.cos(ph) * 2.6, -1.2 + Math.sin(th) * Math.sin(ph) * 1.95], [0, 0, 0], [1, .7, 1]); }
  add(body, G.sph(1.35, 24, 18), skin, [0, 2.2, .3], [0, 0, 0], [1.25, .85, 1.1]);
  const head = grp(body, [0, 2.5, 1.2], 'head'), eye = EYE('#ff9a1a', 2.6);
  for (const sx of [-1, 1]) { add(head, G.sph(.46, 18, 14), skin, [sx * .95, .25, -.1]); add(head, G.sph(.3, 16, 12), eye, [sx * 1.08, .25, .14]); add(head, G.box(.4, .07, .05), mat('#050505'), [sx * 1.1, .25, .43]); glow(head, '#ffa030', [sx * 1.12, .25, .5], 1.1);
    add(head, G.tor(.32, .06), skin, [sx * 1.08, .28, .2], [0, sx * .3, 0], [1, .8, 1]); }
  add(head, G.cone(.3, .6, 8), mat('#1a0a08'), [0, -.7, .3], [Math.PI, 0, 0]);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + .2, t = suckerArm(body, [Math.cos(a) * 1.15, 1.5, Math.sin(a) * 1.15], 9, .85, .5, .08, skin, ring, .22, { curl: i % 2, ph: i, f: 1.1 + (i % 3) * .2 });
    t.rotation.set(Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2); }
  const haze = new THREE.PointLight('#3a7aff', 30, 18, 1.6); haze.position.set(0, 6, 4); body.add(haze);
};
// --- Cthulhu: colossal titan rising from the sea, dark teal-black rough rocky barnacled wet skin, octopus head with a long curling beard of face tentacles,
// small glowing red eyes, huge folded bat wings with spines, massive clawed hands, waterfalls of seawater pouring off him
B.cthulhu = r => {
  const skin = mat('#1e3232', { map: 'stone', bump: 'stone', bs: 3.2, r: .5 }), dark = mat('#142222', { map: 'skin', bump: 'skin', bs: 3, r: .4 }), memb = mat('#1c2c2c', { r: .6 }); memb.side = THREE.DoubleSide;
  const claw = mat('#0a0a08', { r: .3 }), barn = mat('#8a948c', { map: 'stone', r: .9 }), water = new THREE.MeshStandardMaterial({ color: '#cfe8ec', transparent: true, opacity: .32, roughness: .1, depthWrite: false, emissive: new THREE.Color('#5a8a90'), emissiveIntensity: .25 });
  const body = grp(r, [0, 0, 0], 'body');
  for (const sx of [-1, 1]) { const l = limb(body, [sx * .7, 2.7, 0], 1.35, .38, skin, null, 1.3); l.name = sx < 0 ? 'legL' : 'legR'; add(l, G.sph(.48, 16, 12), skin, [0, -.6, 0], [0, 0, 0], [1, 1.6, 1]); add(l.userData.low, G.box(.7, .3, 1.1), skin, [0, -1.3, .25]); claws(l.userData.low, [0, -1.3, .85], 3, claw, .34, .22); }
  add(body, G.sph(1.25, 26, 20), skin, [0, 4.0, -.05], [.15, 0, 0], [1.3, 1.4, .95]); add(body, G.sph(1.0, 22, 16), dark, [0, 3.7, .45], [0, 0, 0], [1.1, 1.1, .7]);
  for (const sx of [-1, 1]) add(body, G.sph(.75, 18, 14), skin, [sx * 1.35, 5.1, 0], [0, 0, 0], [1, .9, 1]); // massive shoulders
  for (let i = 0; i < 70; i++) { const u = (i * .618) % 1, v = (i * .29) % 1, th = u * Math.PI * 2, y = 3 + v * 2.4; add(body, G.cone(.07 + (i % 3) * .03, .1, 7), barn, [Math.cos(th) * 1.5, y, Math.sin(th) * 1.0], [Math.PI / 2 * Math.sin(th), 0, -Math.cos(th) * Math.PI / 2]); }
  for (const sx of [-1, 1]) { const a = limb(body, [sx * 1.6, 5.1, 0], 1.45, .34, skin, null, 1.4); a.name = sx < 0 ? 'armL' : 'armR'; a.rotation.z = sx * .28; add(a, G.sph(.45, 14, 12), skin, [0, -.65, 0], [0, 0, 0], [1, 1.6, 1]);
    const hand = grp(a.userData.low, [0, -1.45, 0]); add(hand, G.sph(.42, 14, 12), skin, [0, 0, 0], [0, 0, 0], [1.1, 1, .8]);
    for (let f = 0; f < 4; f++) { const g = grp(hand, [(f - 1.5) * .2, -.3, .1]); g.rotation.set(.5, 0, (f - 1.5) * .12); add(g, G.cap(.08, .35), skin, [0, -.2, 0]); add(g, G.cone(.07, .35, 6), claw, [0, -.55, .05], [Math.PI * .92, 0, 0]); }
    for (let k = 0; k < 3; k++) add(a.userData.low, G.cone(.18 + k * .05, 2.4 + k * .6, 10, 1, true), water, [sx * .1 * k, -1.6 - k * .3, .1], [Math.PI, 0, 0]); }
  for (const sx of [-1, 1]) { const w = wing(body, [sx * .6, 5.6, -.9], sx, 6.2, dark, memb); w.rotation.set(-.15, sx * -1.15, sx * -.55); wig(w, 'y', .06, .7, sx > 0 ? 0 : Math.PI); // folded up behind
    for (let i = 0; i < 6; i++) add(body, G.cone(.1, .7, 6), claw, [sx * (.5 + i * .12), 6.4 + i * .5, -1.3 - i * .1], [-.4, 0, sx * -.3]); }
  for (let i = 0; i < 10; i++) add(body, G.cone(.12, .5, 6), claw, [0, 3.2 + i * .32, -1.05], [-1.0, 0, 0]); // spine ridge
  for (let k = 0; k < 6; k++) add(body, G.cone(.5 + k * .1, 4 + k * .5, 12, 1, true), water, [(k - 2.5) * .45, 2.6 + (k % 2) * .4, .6 - (k % 3) * .6], [Math.PI, 0, (k - 2.5) * .05]); // seawater cascading off
  const head = grp(body, [0, 6.1, .45], 'head');
  add(head, G.sph(1.0, 24, 20), skin, [0, .55, -.35], [-.5, 0, 0], [1, 1.4, 1.1]); add(head, G.sph(.75, 20, 16), dark, [0, 0, .25], [0, 0, 0], [1.1, .85, .9]);
  for (const sx of [-1, 1]) { add(head, G.sph(.11, 12, 10), EYE('#ff1a10', 4.5), [sx * .38, .32, .85]); glow(head, '#ff2010', [sx * .4, .32, .95], .7); add(head, G.sph(.2, 12, 10), skin, [sx * .4, .42, .8], [0, 0, 0], [1.3, .5, .8]); }
  for (let i = 0; i < 12; i++) { const x = (i - 5.5) * .14, n = 8 + (i % 3), len = .36 + (i % 4) * .05, bends = Array.from({ length: n }, (_, k) => .08 + (k > n - 4 ? .5 + (k - n + 4) * .25 : 0) * (i % 2 ? 1 : -1));
    const t = chain(head, [x, -.3, .75 - Math.abs(i - 5.5) * .05], n, len, .13, .03, dark, .1, { bends, wave: .14, f: 1.4, ph: i * .7, axis: 'z' }); t.rotation.set(Math.PI * .96, 0, (i - 5.5) * .05); }
  const haze = new THREE.PointLight('#5ac8c0', 25, 22, 1.6); haze.position.set(0, 7, 5); body.add(haze);
};
// --- Gargantuan Leviathan: huge dark ribbed eel body with spines, rows of glowing blue bioluminescent dots, long tentacle/fin arms, red eyes
B.leviathan = r => {
  const sc = mat('#141c26', { map: 'scales', bump: 'scales', bs: 2.6, r: .3, m: .2 }), belly = mat('#2a3440', { r: .45 }), fin = mat('#1a2632', { r: .4 }); fin.side = THREE.DoubleSide;
  const spike = mat('#0c0e12', { r: .3 }), dot = mat('#6ad8ff', { e: '#3ac8ff', ei: 3.5 }), body = grp(r, [0, 0, 0], 'body'), tooth = mat('#e8e4d4', { r: .3 });
  const segs = 18;
  for (let i = 0; i < segs; i++) { const t = i / segs, z = 2 - i * 1.25, y = 1.0 + Math.max(0, Math.sin(t * Math.PI * 2.2)) * 3.4, x = Math.sin(t * 5) * .8, rad = 1.4 - t * .95;
    const s = add(body, G.sph(+rad.toFixed(2), 18, 12), sc, [x, y, z], [0, 0, 0], [1, .95, 1.4]); wig(s, 'z', .08, 1.2, i * .5);
    add(body, G.tor(+(rad * .98).toFixed(2), +(rad * .07).toFixed(2)), belly, [x, y, z + rad * .5]); // ribs
    add(body, G.cone(+(rad * .18).toFixed(2), +(rad * 1.1).toFixed(2), 5), spike, [x, y + rad * .95, z], [-.5, 0, 0]);
    for (const sx of [-1, 1]) for (let k = 0; k < 2; k++) add(body, G.sph(+(rad * .07 + .03).toFixed(2), 6, 4), dot, [x + sx * rad * .98, y - rad * (.1 + k * .35), z + .2 * k]); }
  const head = grp(body, [0, 2.2, 3.3], 'head'); head.rotation.x = .1;
  add(head, G.sph(.95, 22, 16), sc, [0, 0, 0], [0, 0, 0], [1, .7, 1.7]); for (let i = 0; i < 5; i++) add(head, G.cone(.12, .9, 5), spike, [0, .5, -.8 + i * .35], [-.8, 0, 0]);
  const jaw = grp(head, [0, -.35, .2], 'jaw'); jaw.rotation.x = .45; add(jaw, G.box(1.1, .2, 1.6), belly, [0, -.05, .7]); add(jaw, G.box(.9, .05, 1.4), mat('#5a1a24', { r: .5 }), [0, .05, .7]);
  teethRow(jaw, 0, .08, .55, .45, .9, 14, tooth, false, .24); teethRow(head, 0, -.42, .7, .48, .95, 14, tooth, true, .26);
  for (const sx of [-1, 1]) { add(head, G.sph(.12, 12, 10), EYE('#ff2020', 4), [sx * .55, .2, .75]); glow(head, '#ff2a2a', [sx * .58, .2, .85], .7);
    for (let k = 0; k < 6; k++) add(head, G.sph(.05, 6, 4), dot, [sx * .8, -.05 - k * .02, .4 - k * .3]);
    for (let k = 0; k < 2; k++) { const t = chain(head, [sx * .75, -.25, -.2 - k * .5], 10, .7, .14, .03, sc, .12, { wave: .2, f: 1.1, ph: k + sx, axis: 'z' }); t.rotation.set(1.9 + k * .3, 0, sx * (1.3 + k * .3)); }
    const w = wing(head, [sx * .8, 0, -.5], sx, 2.2, spike, fin); w.rotation.y = sx * -.5; }
  wig(head, 'y', .12, .9);
  const haze = new THREE.PointLight('#2a6aff', 20, 20, 1.6); haze.position.set(0, 5, 3); body.add(haze);
};
// --- Mosasaurus: grey-green scales, long toothy croc jaws with a pink mouth, four paddle flippers, serrated dorsal ridge, shark-like tail fluke
B.mosasaurus = r => {
  const sc = mat('#4c5a52', { map: 'scales', bump: 'scales', bs: 2, r: .38 }), belly = mat('#c8c8b8', { r: .5 }), tooth = mat('#efe9d6', { r: .3 }), gum = mat('#c8707a', { r: .45 }), ridge = mat('#3a463e', { r: .4 });
  const body = grp(r, [0, 0, 0], 'body');
  add(body, G.sph(1.4, 24, 16), sc, [0, 1.6, 0], [0, 0, 0], [1, .85, 3]); add(body, G.sph(1.25, 20, 14), belly, [0, 1.25, .2], [0, 0, 0], [.92, .6, 2.7]);
  for (let i = 0; i < 18; i++) add(body, G.cone(.12, .35 + (i % 2) * .1, 4), ridge, [0, 2.75 - Math.abs(i - 6) * .03, 3 - i * .45], [-.3, 0, 0], [.4, 1, 1]); // serrated ridge
  const tail = chain(body, [0, 1.55, -3.6], 7, .9, .9, .15, sc, 0, { wave: .13, axis: 'z', f: 1.8 }); tail.rotation.x = -Math.PI / 2;
  const fl = mat('#4c5a52', { r: .4 }); fl.side = THREE.DoubleSide; const fs = new THREE.Shape(); fs.moveTo(0, 0); fs.quadraticCurveTo(.6, .8, .3, 2.2); fs.quadraticCurveTo(.1, 1.0, -.15, .0); fs.quadraticCurveTo(.3, -.6, .1, -1.3); fs.quadraticCurveTo(-.2, -.4, 0, 0);
  const fluke = new THREE.Mesh(new THREE.ExtrudeGeometry(fs, { depth: .12, bevelEnabled: false }), fl); fluke.rotation.set(0, Math.PI / 2, 0); fluke.position.set(-.06, .3, 0); tail.userData.tip.add(fluke);
  for (const [sx, z, s] of [[-1, 2, 1], [1, 2, 1], [-1, -2, .8], [1, -2, .8]]) { const f = grp(body, [sx * 1.3, 1.0, z]); f.rotation.set(0, sx * -.5, sx * .45); wig(f, 'z', .25, 1.6, z);
    const ps = new THREE.Shape(); ps.moveTo(0, -.3); ps.quadraticCurveTo(1.8 * s, -.6, 2.4 * s, -.1); ps.quadraticCurveTo(1.6 * s, .5, 0, .35); const pm = new THREE.Mesh(new THREE.ExtrudeGeometry(ps, { depth: .1, bevelEnabled: true, bevelThickness: .04, bevelSize: .04, bevelSegments: 2 }), sc); pm.rotation.x = Math.PI / 2; pm.scale.x = sx; f.add(pm); }
  const head = grp(body, [0, 1.85, 4.4], 'head');
  add(head, G.sph(.85, 20, 14), sc, [0, 0, .6], [0, 0, 0], [.8, .5, 2.0]);
  const jaw = grp(head, [0, -.25, -.2], 'jaw'); jaw.rotation.x = .42; add(jaw, G.box(.95, .2, 2.7), sc, [0, -.08, 1.35]); add(jaw, G.box(.82, .06, 2.5), gum, [0, .04, 1.3]); add(head, G.box(.82, .06, 2.4), gum, [0, -.3, 1.2]);
  for (let i = 0; i < 14; i++) for (const sx of [-1, 1]) { add(jaw, G.cone(.05, .22, 5), tooth, [sx * .38, .16, .25 + i * .18], [-.15, 0, 0]); add(head, G.cone(.05, .24, 5), tooth, [sx * .37, -.42, .1 + i * .18], [Math.PI + .15, 0, 0]); }
  for (const sx of [-1, 1]) add(head, G.sph(.1, 10, 8), EYE('#ffb020', 1.6), [sx * .5, .22, .5]);
};
// --- Nessie: the Surgeon's-photo silhouette: a long thin neck, a small head and a dark hump breaking a dark lake
B.nessie = r => {
  const sk = mat('#0e1210', { map: 'skin', bump: 'skin', bs: 1.5, r: .25 }), body = grp(r, [0, 0, 0], 'body');
  add(body, G.sph(2.2, 26, 16, 0, Math.PI * 2, 0, Math.PI / 2), sk, [0, -.2, -1.2], [0, 0, 0], [1, .55, 1.9]); add(body, G.sph(1.1, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), sk, [0, -.2, -4.6], [0, 0, 0], [.8, .5, 1.6]);
  const neck = chain(body, [0, .5, 1.0], 12, .55, .55, .2, sk, 0, { bends: [-.12, -.12, -.08, -.04, 0, .02, .05, .07, .1, .14, .3, .6], wave: .03, f: .8 }); neck.rotation.x = .55;
  const head = grp(neck.userData.tip, [0, .1, 0], 'head'); head.rotation.x = .6; add(head, G.sph(.3, 16, 12), sk, [0, 0, .12], [0, 0, 0], [.8, .75, 1.4]);
  for (const sx of [-1, 1]) add(head, G.sph(.04, 8, 6), EYE('#c8d860', .8), [sx * .17, .05, .25]);
};
// --- Spinosaurus / T-Rex / Dragon: CC0 bases recoloured to the references
B.spinosaurus = r => { const body = grp(r, [0, 0, 0], 'body'); grp(body, [0, 4.6, 5.2], 'head');
  const sailM = mat('#8a8470', { map: 'skin', bump: 'skin', bs: 2, r: .6 }); sailM.side = THREE.DoubleSide; const ribM = mat('#6a6450', { r: .6 });
  glbPart(body, 'trex', { len: 14, tint: '#56604a', mix: .72, r: .6, eyes: '#e0a020', anims: { idle: /TRex_Idle/, walk: /TRex_Walk/, run: /TRex_Run/, attack: /TRex_Attack/ },
    ready: (m, size, holder) => { const sh = new THREE.Shape(), L = size.z * .42, H = size.y * .46; sh.moveTo(-L / 2, 0); for (let i = 0; i <= 14; i++) { const x = -L / 2 + L * i / 14; sh.lineTo(x, H * Math.pow(Math.sin(Math.PI * i / 14), .8) * (1 + (i % 2) * .06)); } sh.lineTo(L / 2, 0);
      const s = new THREE.Mesh(new THREE.ShapeGeometry(sh, 8), sailM); s.rotation.y = -Math.PI / 2; s.position.set(0, size.y * .64, -size.z * .02); s.castShadow = true; holder.add(s); holder.userData.sail = s;
      for (let i = 1; i < 14; i++) { const x = -L / 2 + L * i / 14, h = H * Math.pow(Math.sin(Math.PI * i / 14), .8); const b = new THREE.Mesh(G.cyl(.03, .07, +h.toFixed(2), 6), ribM); b.position.set(0, size.y * .64 + h / 2, -size.z * .02 - x); holder.add(b);
        const sc = new THREE.Mesh(G.box(.04, .03, .08), mat('#3e4634', { r: .45 })); sc.position.set(.06, size.y * .64 + h * .72, -size.z * .02 - x); holder.add(sc); }
      const bn = {}; m.traverse(x => { if (x.isBone) bn[x.name] = x; });
      if (bn.Head) bn.Head.scale.set(.55, 1.35, .7); if (bn.Neck) bn.Neck.scale.set(.85, 1.15, .85); if (bn.FrontUpLegR) for (const k of ['FrontUpLegR', 'FrontUpLegL']) bn[k].scale.setScalar(1.45);
      for (let i = 2; i <= 5; i++) { const t = bn['Tail' + i]; if (t) t.scale.set(.82, 1, 1.32); } if (bn.BackUpLegR) for (const k of ['BackUpLegR', 'BackUpLegL']) bn[k].scale.set(1, .85, 1); } }); };
B.trex = r => { const body = grp(r, [0, 0, 0], 'body'); grp(body, [0, 4.3, 5.0], 'head');
  glbPart(body, 'trex', { len: 13, tint: '#6a5a3a', mix: .66, r: .7, eyes: '#e0a020', anims: { idle: /TRex_Idle/, walk: /TRex_Walk/, run: /TRex_Run/, attack: /TRex_Attack/ },
    ready: m => { const bn = {}; m.traverse(x => { if (x.isBone) bn[x.name] = x; }); if (bn.Head) bn.Head.scale.set(1.15, 1.12, 1.1); if (bn.FrontUpLegR) for (const k of ['FrontUpLegR', 'FrontUpLegL']) bn[k].scale.setScalar(.7); if (bn.Tail1) bn.Tail1.scale.set(1.15, 1, 1.15); } }); };
B.dragon = r => { const body = grp(r, [0, 0, 0], 'body'); grp(body, [0, 3.6, 3.6], 'head');
  glbPart(body, 'dragon', { len: 12, y: .8, tint: '#b08a2c', mix: .85, r: .4, eyes: '#ffb020', anims: { idle: /Dragon_Flying/, walk: /Dragon_Flying/, run: /Dragon_Flying/, attack: /Dragon_Attack$/ },
    ready: m => { m.traverse(x => { if (!x.isMesh) return; const M = x.material; if (/wing/i.test(M.name)) { M.color.set('#2a7a74'); M.side = THREE.DoubleSide; } else if (/belly/i.test(M.name)) M.color.set('#d8b050'); else if (/main/i.test(M.name)) { M.color.set('#a8801e'); M.metalness = .35; M.roughness = .45; } });
      const bn = {}; m.traverse(x => { if (x.isBone) bn[x.name] = x; });
      if (bn.Neck) bn.Neck.scale.set(.95, 1.45, .95); if (bn.Head) bn.Head.scale.set(.62, .6, .78); if (bn.Nose) bn.Nose.scale.set(.85, 1.3, .85); if (bn.Tail1) bn.Tail1.scale.set(.92, 1.35, .92);
      const horn = mat('#3a2a14', { r: .35 }); if (bn.Head) { m.updateMatrixWorld(true); const ws = bn.Head.getWorldScale(new THREE.Vector3()); for (const sx of [-1, 1]) for (let k = 0; k < 2; k++) { const h = new THREE.Mesh(G.cone(.05, .55 - k * .2, 8), horn); h.rotation.set(-1.2, 0, sx * (-.35 - k * .3)); h.scale.set(1.4 / ws.x, 1.4 / ws.y, 1.4 / ws.z); h.position.set(sx * (.12 + k * .06) / ws.x * 1.4, (.25 - k * .08) / ws.y * 1.4, (-.18 - k * .05) / ws.z * 1.4); bn.Head.add(h); } } } }); };
// --- Quetzalcoatlus: grey fuzz, giraffe-tall neck, long yellow-orange beak, small blue crest, walks on folded wings, pinkish membrane
B.quetzalcoatlus = r => {
  const skin = mat('#6e6e6a', { map: 'skin', bump: 'skin', r: .9 }), dark = mat('#3a2e26', { r: .6 }), memb = mat('#b07a78', { r: .7 }); memb.side = THREE.DoubleSide;
  const beak = mat('#e0a030', { r: .35 }), crest = mat('#3a5aa0', { r: .4 }), body = grp(r, [0, 0, 0], 'body');
  [-1, 1].forEach(sx => { const l = limb(body, [sx * .28, 1.4, -.55], .75, .07, skin, null, .7); l.name = sx < 0 ? 'legL' : 'legR'; claws(l.userData.low, [0, -.7, .1], 3, dark, .15, .06); });
  add(body, G.sph(.6, 20, 14), skin, [0, 1.8, -.2], [.4, 0, 0], [.85, .8, 1.35]);
  [-1, 1].forEach(sx => { const a = limb(body, [sx * .42, 2.15, .3], 1.25, .09, skin, dark, 1.25); a.name = sx < 0 ? 'armL' : 'armR'; a.rotation.set(-.4, 0, sx * .12); claws(a.userData.low, [0, -1.25, .05], 3, dark, .14, .05);
    add(a.userData.low, G.cyl(.05, .03, 1.1, 6), dark, [0, -.6, -.15], [.12, 0, 0]); // folded wing finger
    const gm = new THREE.BufferGeometry(); gm.setAttribute('position', new THREE.Float32BufferAttribute([sx * .48, 2.18, .3, sx * .62, .3, 1.35, sx * .3, 1.55, -.75, sx * .62, .3, 1.35, sx * .3, .95, -.2, sx * .3, 1.55, -.75], 3)); gm.computeVertexNormals();
    const wm = new THREE.Mesh(gm, memb); wm.castShadow = true; body.add(wm); });
  const neck = chain(body, [0, 2.25, .5], 7, .48, .17, .1, skin, -.06, { wave: .04, f: 1.1 }); neck.rotation.x = .18;
  const head = grp(neck.userData.tip, [0, .18, 0], 'head'); head.rotation.x = 1.0;
  add(head, G.sph(.2, 14, 10), skin, [0, 0, 0], [0, 0, 0], [1, 1, 1.3]); add(head, G.cone(.15, 2.0, 12), beak, [0, -.05, 1.05], [Math.PI / 2, 0, 0], [1, 1, .65]);
  add(head, G.cone(.14, .45, 4), crest, [0, .22, -.08], [-1.0, 0, 0], [.18, 1, 1]); for (const sx of [-1, 1]) add(head, G.sph(.04, 8, 6), EYE('#1a1208', .2), [sx * .13, .06, .1]);
};
// --- Yeti & Bigfoot (ape-man builder, extended): the Yeti is a massive shaggy grey-brown beast with curled horns, cyan eyes and a roaring fanged mouth;
// Bigfoot is the Patterson-Gimlin dark-brown ape-man with a conical head, caught mid-stride looking back
{ const base = apeman;
  B.yeti = r => { base(r, { h: 3.6, fur: '#6c6258', face: '#3a3634', eye: '#40f0ff', eg: 3.5, chest: false, horns: false });
    const head = r.getObjectByName('head'), H = 3.6, horn = mat('#c8c0a8', { r: .4 }), claw = mat('#1a1612', { r: .35 }), tooth = mat('#e6e0cc', { r: .3 });
    for (const sx of [-1, 1]) { const h = add(head, new THREE.TorusGeometry(.12 * H, .028 * H, 10, 20, Math.PI * 1.3), horn, [sx * .14 * H, .1 * H, -.06 * H], [0, sx * 1.3, sx * -.4]); h.scale.set(1, 1, .9);
      add(head, G.cone(.03 * H, .13 * H, 8), tooth, [sx * .05 * H, -.1 * H, .2 * H], [Math.PI, 0, 0]); }
    const jaw = head.getObjectByName('jaw'); if (jaw) { jaw.rotation.x = .7; for (const sx of [-1, 1]) add(jaw, G.cone(.026 * H, .1 * H, 8), tooth, [sx * .045 * H, .01 * H, .13 * H]); }
    for (const n of ['armL', 'armR']) { const a = r.getObjectByName(n); a.userData.low.traverse(o => { if (o.isMesh && o.material.color.getHexString() === '1a1612') o.scale.multiplyScalar(1.7); }); } };
  B.bigfoot = r => { base(r, { h: 3.0, fur: '#2e2016', face: '#1e1610', eye: '#2a1a0a', eg: .4 }); const head = r.getObjectByName('head'), fur = mat('#2e2016', { map: 'fur', bump: 'fur', bs: 3, r: 1 });
    add(head, G.cone(.13 * 3, .3 * 3, 16), fur, [0, .2 * 3, -.08 * 3], [-.25, 0, 0], [1, 1, .9]); head.rotation.y = -.9; // conical crown, looking back over the shoulder
    const lL = r.getObjectByName('legL'), lR = r.getObjectByName('legR'); lL.rotation.x = -.45; lR.rotation.x = .3; lR.userData.low.rotation.x = .5; const aL = r.getObjectByName('armL'); aL.rotation.x = .4; }; }
// --- Chupacabra: crouched quadruped, thin hairless dark-grey skin, back quills, big pointed ears, glowing yellow eyes, fanged mouth with a little blood (teen level)
B.chupacabra = r => {
  const sk = mat('#5a5a62', { map: 'skin', bump: 'skin', bs: 3, r: .6 }), dk = mat('#3a3a40', { r: .6 }), quill = mat('#1a1a1e', { r: .4 }), tooth = mat('#e6e0cc', { r: .3 }), blood = mat('#5a0a0c', { r: .3 }), claw = mat('#141414', { r: .3 });
  const body = grp(r, [0, 0, 0], 'body');
  add(body, G.sph(.32, 18, 14), sk, [0, .95, -.35], [0, 0, 0], [1, .9, 1.3]); add(body, G.sph(.3, 18, 14), sk, [0, 1.0, .25], [-.2, 0, 0], [1, .95, 1.4]); // haunch + chest
  for (let i = 0; i < 6; i++) add(body, G.tor(.24, .012), dk, [0, 1.0, .1 + i * .07], [0, 0, 0], [1.05, 1, 1]); // ribs
  for (let i = 0; i < 12; i++) add(body, G.cone(.03, .28 + Math.sin(i / 11 * Math.PI) * .2, 5), quill, [0, 1.25 - Math.abs(i - 6) * .01, .5 - i * .1], [-.7, 0, 0]);
  for (const [n, x, z, y0, L1, L2] of [['legL', -.22, -.45, 1.0, .5, .55], ['legR', .22, -.45, 1.0, .5, .55], ['armL', -.22, .45, 1.0, .45, .5], ['armR', .22, .45, 1.0, .45, .5]]) {
    const l = limb(body, [x, y0, z], L1, .055, sk, sk, L2); l.name = n; const back = n.startsWith('leg'); l.rotation.x = back ? .7 : -.35; l.userData.low.rotation.x = back ? -1.25 : .3;
    if (back) add(l, G.sph(.12, 12, 10), sk, [0, -.18, 0], [0, 0, 0], [1, 1.8, 1.2]);
    const ft = grp(l.userData.low, [0, -L2, 0]); ft.rotation.x = back ? .6 : 0; add(ft, G.sph(.06, 10, 8), sk, [0, -.02, .05], [0, 0, 0], [1, .5, 1.6]); for (let i = -1; i <= 1; i++) add(ft, G.cone(.01, .08, 5), claw, [i * .03, -.03, .14], [Math.PI / 2, 0, 0]); }
  const neck = add(body, G.cap(.09, .25), sk, [0, 1.15, .6], [1.0, 0, 0]);
  const head = grp(body, [0, 1.25, .8], 'head');
  add(head, G.sph(.16, 18, 14), sk, [0, 0, 0], [0, 0, 0], [1, .9, 1.15]); add(head, G.sph(.1, 14, 10), sk, [0, -.05, .15], [0, 0, 0], [.85, .7, 1.2]);
  for (const sx of [-1, 1]) { const e = add(head, G.cone(.1, .36, 4), sk, [sx * .12, .2, -.04], [-.2, Math.PI / 4, sx * -.45], [1, 1, .35]); add(head, G.sph(.032, 10, 8), EYE('#ffd020', 3.5), [sx * .07, .05, .14]); glow(head, '#ffd020', [sx * .07, .05, .16], .1); }
  const jaw = grp(head, [0, -.08, .08], 'jaw'); jaw.rotation.x = .45; add(jaw, G.sph(.08, 12, 8), sk, [0, -.02, .1], [0, 0, 0], [.8, .35, 1.3]);
  for (const sx of [-1, 1]) { add(head, G.cone(.012, .07, 5), tooth, [sx * .04, -.1, .24], [Math.PI, 0, 0]); add(jaw, G.cone(.01, .05, 5), tooth, [sx * .035, .01, .19]); }
  for (let i = 0; i < 3; i++) add(jaw, G.sph(.02, 6, 4), blood, [(i - 1) * .03, -.03, .2], [0, 0, 0], [1, 2, .6]);
};
// --- Vampire (Nosferatu): bald egg head, big pointed ears, wide dark-ringed eyes, gaunt pale face, rat teeth, long dark buttoned coat
B.vampire = r => {
  const coat = mat('#18161a', { map: 'cloth', bump: 'cloth', r: .85 }), skin = mat('#d0ccc4', { map: 'skin', bump: 'skin', bs: 1.5, r: .55 }), btn = mat('#2a2622', { r: .5, m: .3 }), dk = mat('#2a2426', { r: .8 });
  const body = grp(r, [0, 0, 0], 'body');
  for (const sx of [-1, 1]) { const l = limb(body, [sx * .1, .95, 0], .48, .065, coat, null, .46); l.name = sx < 0 ? 'legL' : 'legR'; add(l.userData.low, G.box(.11, .07, .3), mat('#080808', { r: .4 }), [0, -.46, .06]); }
  add(body, G.cyl(.2, .34, 1.15, 16, 2, true), coat, [0, 1.08, 0]).material.side = THREE.DoubleSide; add(body, G.cap(.18, .38), coat, [0, 1.55, -.02], [.12, 0, 0], [1.05, 1, .72]);
  for (let i = 0; i < 9; i++) add(body, G.sph(.017, 8, 6), btn, [0, 1.85 - i * .12, .17 + i * .012]); add(body, G.box(.02, 1.2, .01), dk, [0, 1.3, .2]);
  add(body, G.cyl(.1, .13, .14, 14), coat, [0, 1.92, 0]);
  for (const sx of [-1, 1]) { const a = limb(body, [sx * .22, 1.8, 0], .36, .055, coat, null, .34); a.name = sx < 0 ? 'armL' : 'armR'; a.rotation.z = sx * .06;
    const hand = grp(a.userData.low, [0, -.35, 0]); add(hand, G.box(.06, .09, .03), skin, [0, -.04, 0]); for (let i = 0; i < 4; i++) add(hand, G.cyl(.008, .004, .17, 5), skin, [(i - 1.5) * .016, -.17, 0], [.15, 0, 0]); }
  const head = grp(body, [0, 2.1, .03], 'head');
  add(head, G.sph(.12, 20, 16), skin, [0, .03, -.01], [0, 0, 0], [.82, 1.35, 1]); add(head, G.sph(.07, 12, 10), skin, [0, -.08, .05], [0, 0, 0], [1, .9, 1]);
  for (const sx of [-1, 1]) { add(head, G.cone(.04, .14, 4), skin, [sx * .1, .06, -.01], [0, 0, sx * -1.0], [1, 1, .35]);
    add(head, G.sph(.03, 12, 10), dk, [sx * .04, .05, .085], [0, 0, 0], [1.1, 1, .5]); add(head, G.sph(.017, 10, 8), mat('#f0ece0', { r: .2 }), [sx * .04, .05, .097]); add(head, G.sph(.007, 6, 4), mat('#050505'), [sx * .04, .05, .112]); }
  add(head, G.cone(.018, .06, 6), skin, [0, .0, .12], [Math.PI / 2 + .3, 0, 0]); add(head, G.box(.04, .006, .01), dk, [0, -.065, .11]);
  for (const sx of [-1, 1]) add(head, G.box(.009, .022, .006), mat('#e8e2cc', { r: .3 }), [sx * .006, -.075, .112]); // rat-like front teeth
  for (const sx of [-1, 1]) add(head, G.sph(.03, 8, 6), dk, [sx * .055, -.03, .07], [0, 0, 0], [.5, 1.2, .5]); // sunken cheeks
};
// --- Gargoyle: dark cracked stone with gold glints, glowing teal eyes and mouth, swept-back horns, big bat wings, claws, tail
B.gargoyle = r => {
  const stone = mat('#34343a', { map: 'stone', bump: 'stone', bs: 3, r: .95 }), dark = mat('#222226', { map: 'stone', r: .95 }), memb = mat('#2c2c32', { map: 'concrete', r: .95 }); memb.side = THREE.DoubleSide;
  const gold = mat('#c8a040', { m: .9, r: .3 }), teal = '#40ffe0', body = grp(r, [0, 0, 0], 'body');
  [-1, 1].forEach(sx => { const l = limb(body, [sx * .34, .95, -.1], .45, .15, stone, null, .48); l.name = sx < 0 ? 'legL' : 'legR'; l.rotation.x = -.5; l.userData.low.rotation.x = .9; add(l.userData.low, G.box(.26, .1, .42), stone, [0, -.48, .12]); claws(l.userData.low, [0, -.5, .36], 3, dark, .14, .08); });
  add(body, G.sph(.52, 20, 16), stone, [0, 1.45, .12], [.5, 0, 0], [1.2, 1.2, .95]); for (let i = 0; i < 7; i++) add(body, G.cone(.06, .24, 5), dark, [0, 1.98 - i * .16, -.36 - i * .04], [-.9, 0, 0]);
  for (let i = 0; i < 40; i++) { const a = i * 2.4, y = .9 + (i * 37 % 17) / 17 * 1.3; add(body, G.box(.06, .008, .01), gold, [Math.cos(a) * .5, y, .12 + Math.sin(a) * .45], [0, a, (i % 5) * .6]); } // gold glints in the cracks
  [-1, 1].forEach(sx => { const a = limb(body, [sx * .6, 1.75, .3], .52, .13, stone, null, .55); a.name = sx < 0 ? 'armL' : 'armR'; a.rotation.set(-.4, 0, sx * .2);
    const hand = grp(a.userData.low, [0, -.55, 0]); add(hand, G.sph(.14, 12, 10), stone); claws(hand, [0, -.18, .06], 4, dark, .22, .06); });
  for (const sx of [-1, 1]) { const w = wing(body, [sx * .35, 1.95, -.35], sx, 2.6, dark, memb); w.rotation.set(-.2, sx * -.4, sx * .35); wig(w, 'y', .08, .8, sx); }
  const tail = chain(body, [0, 1.0, -.4], 8, .3, .1, .035, stone, .22, { wave: .1, axis: 'z', f: 1.4 }); tail.rotation.x = -2.2; add(tail.userData.tip, G.cone(.12, .3, 4), dark, [0, .1, 0]);
  const head = grp(body, [0, 2.15, .5], 'head');
  add(head, G.sph(.26, 18, 14), stone, [0, 0, 0], [0, 0, 0], [1, .95, 1.1]); add(head, G.box(.4, .08, .14), dark, [0, .1, .2]);
  const jaw = grp(head, [0, -.12, .1], 'jaw'); jaw.rotation.x = .5; add(jaw, G.box(.28, .08, .28), stone, [0, -.03, .12]); add(jaw, G.box(.2, .02, .2), mat(teal, { e: teal, ei: 2.5 }), [0, .02, .12]);
  for (const sx of [-1, 1]) { const h = grp(head, [sx * .18, .2, -.05]); h.rotation.set(-1.3, 0, sx * -.45); add(h, G.cone(.07, .6, 8), dark, [0, .3, 0]); add(h, G.cone(.035, .25, 6), dark, [0, .62, -.06], [-.5, 0, 0]);
    add(head, G.sph(.04, 10, 8), EYE(teal, 4), [sx * .1, .04, .26]); glow(head, teal, [sx * .1, .04, .29], .3); }
  glow(head, teal, [0, -.12, .3], .35); teethRow(head, 0, -.1, .14, .11, .14, 8, mat('#d8d4c8'), true, .07);
};
// --- Father Fester: a pale bald egg-shaped head with round dark hollow staring eyes and a small nose; an enormously long, drooping open jaw hanging
// far down, lined with long rows of thin vertical teeth and dark reddish gums; a dark shadowy body that melts into the dark. Every sighting (stage 0..6)
// makes him taller and the jaw hangs even lower.
B.fester = (r, arg) => {
  const s = Math.max(0, Math.min(6, +arg || 0)), H = 1 + s * .12, shade = mat('#060506', { map: 'cloth', r: 1 }), skin = mat('#d8cdbc', { map: 'skin', bump: 'skin', bs: 1.6, r: .6 });
  const gum = mat('#4a1416', { r: .45 }), hole = mat('#020202', { r: 1 }), tooth = mat('#e8e0c8', { r: .35 }), claw = mat('#2a2018', { r: .4 });
  const body = grp(r, [0, 0, 0], 'body');
  [-1, 1].forEach(sx => { const l = limb(body, [sx * .12, 1.0 * H, 0], .5 * H, .06, shade, null, .48 * H); l.name = sx < 0 ? 'legL' : 'legR'; add(l.userData.low, G.box(.1, .06, .26), shade, [0, -.48 * H, .05]); });
  const robe = add(body, G.cyl(.2, .3 + s * .02, 1.3 * H, 16, 3, true), shade, [0, .75 * H, 0]); robe.material.side = THREE.DoubleSide;
  add(body, G.cap(.19, .5 * H), shade, [0, 1.55 * H, 0], [.12, 0, 0], [1.1, 1, .8]);
  const sm = new THREE.MeshStandardMaterial({ color: '#000000', transparent: true, opacity: .22, depthWrite: false, roughness: 1 }), stat = grp(body, [0, 0, 0], 'static');
  for (let i = 0; i < 9; i++) add(stat, G.sph(.22 + (i % 3) * .08, 10, 8), sm, [Math.sin(i * 2.3) * .3, (.4 + i * .22) * H, Math.cos(i * 2.3) * .15 - .1]); // shadow he blends into
  const al = .38 * H + s * .06;
  [-1, 1].forEach(sx => { const a = limb(body, [sx * .24, 1.82 * H, 0], al, .05, shade, null, al); a.name = sx < 0 ? 'armL' : 'armR'; a.rotation.z = sx * .1;
    const hand = grp(a.userData.low, [0, -al, 0]); add(hand, G.box(.08, .12, .03), skin, [0, -.06, 0]); for (let i = 0; i < 4; i++) add(hand, G.cyl(.009, .006, .14 + s * .02, 5), skin, [(i - 1.5) * .02, -.18 - s * .01, 0]); claws(hand, [0, -.27 - s * .02, 0], 4, claw, .05, .02); });
  const head = grp(body, [0, 2.18 * H, .06], 'head');
  add(head, G.sph(.15, 22, 18), skin, [0, .04, 0], [0, 0, 0], [.9, 1.22, .9]); // bald egg
  for (const sx of [-1, 1]) { add(head, G.sph(.036, 12, 10), hole, [sx * .052, .05, .108], [0, 0, 0], [1, 1, .55]); add(head, G.tor(.037, .008), mat('#8a7a6a', { r: .7 }), [sx * .052, .05, .112]);
    add(head, G.sph(.006, 6, 4), EYE('#f0f0e0', 1 + s * .4), [sx * .05, .055, .13]); if (s >= 3) glow(head, '#e8f0d0', [sx * .05, .055, .135], .05 + s * .012); }
  add(head, G.cone(.016, .05, 6), skin, [0, -.0, .135], [Math.PI / 2 + .4, 0, 0]);
  const JL = .34 + s * .07, jaw = grp(head, [0, -.07, .04], 'jaw'); // the jaw hangs open, far down
  add(jaw, G.cap(.075, JL), skin, [0, -JL / 2 - .02, .02], [0, 0, 0], [1.05, 1, .55]);
  add(jaw, G.cap(.06, JL * .95), hole, [0, -JL / 2 - .01, .05], [0, 0, 0], [.95, 1, .35]);
  for (const sx of [-1, 1]) add(jaw, G.cap(.012, JL * .9), gum, [sx * .052, -JL / 2 - .01, .06], [0, 0, sx * .03]);
  const n = 10 + s * 2; for (let i = 0; i < n; i++) { const y = -.03 - i / n * JL * .95, w = .05 - Math.abs(i / n - .5) * .03;
    for (const sx of [-1, 1]) add(jaw, G.box(.005, .05, .004), tooth, [sx * (w - .004), y, .072]); }
  for (let i = 0; i < 9; i++) add(head, G.box(.006, .045, .004), tooth, [(i - 4) * .012, -.075, .118]);
  add(head, G.box(.12, .012, .02), gum, [0, -.055, .112]);
};
// --- Wendigo: forest / snowy-mountain stalker with two forms (switches every 30s with a bone-crack morph)
// deer form: tall gaunt hunched humanoid, deer/wolf skull head, huge branching antlers, matted brown fur, exposed ribs (no organs),
// arms to the ground with long clawed fingers, digitigrade legs
function antler(parent, p, sx, m) { const a = grp(parent, p); a.rotation.set(-.35, 0, sx * -.55);
  const beam = (g, len, r, depth) => { add(g, G.cyl(+(r * .7).toFixed(3), +r.toFixed(3), len, 6), m, [0, len / 2, 0]); if (depth > 2) return; const t = grp(g, [0, len, 0]); t.rotation.set(-.25, 0, sx * .25); beam(t, len * .78, r * .72, depth + 1);
    const tine = grp(g, [0, len * .6, 0]); tine.rotation.set(.5 + depth * .1, 0, sx * -.5); add(tine, G.cyl(+(r * .3).toFixed(3), +(r * .55).toFixed(3), len * .55, 5), m, [0, len * .27, 0]); };
  beam(a, .45, .035, 0); return a; }
B.wendigo = r => {
  const fur = mat('#4a3424', { map: 'fur', bump: 'fur', bs: 3, r: 1 }), hide = mat('#5a4636', { map: 'skin', bump: 'skin', bs: 3, r: .8 }), bone = mat('#d8ccb0', { map: 'skin', bump: 'skin', bs: 1.4, r: .55 });
  const dk = mat('#1a120c', { r: .8 }), claw = mat('#141010', { r: .3 }), tooth = mat('#e6dcc0', { r: .35 }), body = grp(r, [0, 0, 0], 'body');
  for (const sx of [-1, 1]) { const l = limb(body, [sx * .18, 1.7, -.05], .62, .09, fur, hide, .62); l.name = sx < 0 ? 'legL' : 'legR'; l.rotation.x = -.5; l.userData.low.rotation.x = 1.05; // digitigrade
    add(l, G.sph(.13, 14, 10), fur, [0, -.25, 0], [0, 0, 0], [1, 2, 1.1]); const mt = grp(l.userData.low, [0, -.62, 0]); mt.rotation.x = -.95; add(mt, G.cyl(.035, .05, .55, 8), hide, [0, -.27, 0]);
    const ft = grp(mt, [0, -.55, 0]); ft.rotation.x = .4; for (const k of [-1, 1]) add(ft, G.cone(.04, .13, 6), claw, [k * .03, -.03, .06], [Math.PI / 2 + .3, 0, 0]); }
  add(body, G.sph(.22, 18, 14), fur, [0, 1.72, -.05], [0, 0, 0], [1.1, .75, .85]); add(body, G.cyl(.12, .16, .4, 12), hide, [0, 1.95, 0], [.3, 0, 0], [1, 1, .75]); // gaunt waist
  add(body, G.sph(.3, 20, 16), fur, [0, 2.3, .1], [.6, 0, 0], [1.05, 1.15, .75]); add(body, G.sph(.26, 18, 12), fur, [0, 2.5, -.08], [.8, 0, 0], [1.1, .8, .9]); // hunched back
  for (let i = 0; i < 6; i++) { const rb = add(body, new THREE.TorusGeometry(.2 - Math.abs(i - 2.5) * .012, .018, 6, 16, Math.PI * .9), bone, [0, 2.12 + i * .075, .2 + i * .02], [Math.PI / 2 + .6, 0, Math.PI * .05]); rb.scale.set(1.1, .7, 1); }
  add(body, G.sph(.17, 14, 10), dk, [0, 2.3, .22], [.6, 0, 0], [1, 1.1, .4]); // hollow under the ribs (dark, no organs)
  for (let i = 0; i < 26; i++) { const a = i * 2.39, y = 1.85 + (i * 31 % 19) / 19 * .9; add(body, G.cone(.035, .16 + (i % 3) * .05, 5), fur, [Math.cos(a) * .3, y, Math.sin(a) * .22 - .05], [Math.PI + Math.sin(a) * .3, 0, -Math.cos(a) * .3]); } // matted tufts
  for (const sx of [-1, 1]) { add(body, G.sph(.13, 12, 10), fur, [sx * .32, 2.62, .12]);
    const a = limb(body, [sx * .36, 2.6, .15], 1.05, .055, hide, hide, 1.0); a.name = sx < 0 ? 'armL' : 'armR'; a.rotation.set(-.1, 0, sx * .12);
    add(a, G.sph(.07, 12, 8), hide, [0, -.4, 0], [0, 0, 0], [1, 3.2, 1]); add(a.userData.low, G.sph(.055, 12, 8), hide, [0, -.4, 0], [0, 0, 0], [1, 3.6, 1]);
    for (let i = -1.5; i <= 1.5; i++) { const f = grp(a.userData.low, [i * .028, -1.02, 0]); f.rotation.set(.2, 0, i * .1); add(f, G.cap(.011, .24), dk, [0, -.13, 0]); add(f, G.cone(.011, .16, 6), claw, [0, -.34, .02], [Math.PI * .95, 0, 0]); } }
  add(body, G.cap(.07, .2), hide, [0, 2.72, .28], [1.0, 0, 0]);
  const head = grp(body, [0, 2.82, .45], 'head'); // deer / wolf skull
  add(head, G.sph(.13, 18, 14), bone, [0, .02, 0], [0, 0, 0], [1, .95, 1.1]); add(head, G.sph(.09, 16, 12), bone, [0, -.03, .17], [0, 0, 0], [.75, .62, 1.7]);
  for (const sx of [-1, 1]) { add(head, G.sph(.04, 10, 8), mat('#020202', { r: 1 }), [sx * .065, .04, .1], [0, 0, 0], [1, 1.1, .6]); add(head, G.sph(.008, 6, 4), EYE('#e8f0ff', 1.2), [sx * .065, .04, .125]);
    add(head, G.cone(.05, .14, 5), fur, [sx * .1, .1, -.04], [0, 0, sx * -.9]); antler(head, [sx * .06, .12, -.02], sx, bone); }
  const jaw = grp(head, [0, -.07, .05], 'jaw'); jaw.rotation.x = .3; add(jaw, G.sph(.07, 12, 8), bone, [0, -.01, .14], [0, 0, 0], [.7, .35, 1.6]);
  for (let i = 0; i < 6; i++) for (const sx of [-1, 1]) { add(head, G.cone(.008, .04, 4), tooth, [sx * .035, -.08, .1 + i * .03], [Math.PI, 0, 0]); add(jaw, G.cone(.007, .035, 4), tooth, [sx * .03, .01, .06 + i * .03]); }
};
// human form: emaciated pale grey-white humanoid, bald, pointed ears, pale eyes, screaming blood-stained mouth, red-stained long arms and clawed hands,
// bone/bead chest-plate necklace, green loincloth, crouching
B.wendigo_h = r => {
  const sk = mat('#c8c4bc', { map: 'skin', bump: 'skin', bs: 2.4, r: .6 }), stain = mat('#7a1414', { map: 'skin', r: .45 }), bone = mat('#e6dcc4', { r: .5 }), bead = mat('#6a3a24', { r: .5 }), cloth = mat('#3a5a2a', { map: 'cloth', r: .9 });
  const claw = mat('#1a1410', { r: .3 }), tooth = mat('#e6dcc0', { r: .35 }), body = grp(r, [0, 0, 0], 'body');
  for (const sx of [-1, 1]) { const l = limb(body, [sx * .16, .95, 0], .52, .07, sk, sk, .5); l.name = sx < 0 ? 'legL' : 'legR'; l.rotation.x = -1.0; l.userData.low.rotation.x = 1.7; // deep crouch
    add(l, G.sph(.08, 12, 8), sk, [0, -.2, 0], [0, 0, 0], [1, 2.4, 1]); add(l.userData.low, G.box(.1, .05, .28), sk, [0, -.5, .08]); claws(l.userData.low, [0, -.52, .22], 4, claw, .06, .025); }
  add(body, G.sph(.18, 14, 10), cloth, [0, .98, 0], [0, 0, 0], [1.15, .6, .9]); for (let i = 0; i < 2; i++) add(body, G.box(.2, .32, .02), cloth, [0, .82, i ? -.14 : .15], [i ? -.1 : .1, 0, 0]);
  add(body, G.cyl(.13, .12, .35, 12), sk, [0, 1.2, .05], [.45, 0, 0], [1, 1, .7]); add(body, G.sph(.24, 18, 14), sk, [0, 1.45, .18], [.7, 0, 0], [1.05, 1.15, .7]);
  for (let i = 0; i < 6; i++) { const rb = add(body, new THREE.TorusGeometry(.19 - Math.abs(i - 2.5) * .01, .012, 6, 16, Math.PI * .9), sk, [0, 1.33 + i * .05, .28 + i * .025], [Math.PI / 2 + .7, 0, Math.PI * .05]); rb.scale.set(1.1, .7, 1); }
  // bone and bead chest plate
  for (let row = 0; row < 4; row++) for (let i = 0; i < 7; i++) { const x = (i - 3) * .045; add(body, G.cyl(.008, .008, .05, 5), i % 2 ? bead : bone, [x, 1.6 - row * .07, .36 - row * .03], [Math.PI / 2 - .7, 0, Math.PI / 2]); }
  add(body, G.tor(.15, .008), bead, [0, 1.65, .25], [1.0, 0, 0]);
  for (const sx of [-1, 1]) { const a = limb(body, [sx * .26, 1.62, .25], .6, .045, sk, stain, .62); a.name = sx < 0 ? 'armL' : 'armR'; a.rotation.set(-.9, 0, sx * .2); a.userData.low.rotation.x = -.6;
    add(a.userData.low, G.sph(.05, 12, 8), stain, [0, -.35, 0], [0, 0, 0], [1, 3, 1]);
    for (let i = -1.5; i <= 1.5; i++) { const f = grp(a.userData.low, [i * .025, -.64, 0]); f.rotation.set(.3, 0, i * .1); add(f, G.cap(.01, .16), stain, [0, -.09, 0]); add(f, G.cone(.01, .1, 6), claw, [0, -.22, .02], [Math.PI * .95, 0, 0]); } }
  add(body, G.cap(.055, .12), sk, [0, 1.75, .34], [.9, 0, 0]);
  const head = grp(body, [0, 1.85, .42], 'head');
  add(head, G.sph(.13, 20, 16), sk, [0, .03, 0], [0, 0, 0], [.85, 1.05, .95]);
  for (const sx of [-1, 1]) { add(head, G.cone(.04, .14, 4), sk, [sx * .11, .05, -.02], [0, 0, sx * -1.15], [1, 1, .35]); add(head, G.sph(.025, 10, 8), mat('#1a1a1a', { r: .6 }), [sx * .045, .06, .1], [0, 0, 0], [1, .9, .5]); add(head, G.sph(.015, 8, 6), EYE('#e8f0f0', .9), [sx * .045, .06, .11]); }
  const jaw = grp(head, [0, -.05, .03], 'jaw'); jaw.rotation.x = .75; add(jaw, G.sph(.07, 12, 8), sk, [0, -.03, .06], [0, 0, 0], [.85, .4, 1.1]); add(jaw, G.sph(.05, 10, 8), stain, [0, .0, .07], [0, 0, 0], [.8, .25, .9]);
  add(head, G.sph(.05, 10, 8), mat('#1a0404', { r: .7 }), [0, -.06, .1], [0, 0, 0], [1, 1.3, .5]); // screaming mouth
  for (let i = -3; i <= 3; i++) { add(head, G.cone(.006, .03, 4), tooth, [i * .012, -.04, .115], [Math.PI, 0, 0]); add(jaw, G.cone(.006, .025, 4), tooth, [i * .011, .005, .11]); }
  for (const [x, y] of [[-.03, -.12], [.02, -.15], [.0, -.2]]) add(head, G.sph(.015, 6, 4), stain, [x, y, .09], [0, 0, 0], [1, 2.2, .5]); // blood drip down the chin
};

const TEMPLATE = {};
export function buildMonster(kind) {
  const root = new THREE.Group(); root.userData.kind = kind; const [base, arg] = String(kind).split('#');
  WIG = []; DET = isLow() ? 1 : 2.05; try { (B[base] || B.freddy)(root, arg); } finally { DET = 1; } root.userData.wiggle = WIG; WIG = null;
  root.traverse(o => { if (o.isMesh && !o.userData.real && !o.userData.keep) { o.material = o.material.clone(); } });
  realize(root);
  root.userData.parts = { legL: root.getObjectByName('legL'), legR: root.getObjectByName('legR'), armL: root.getObjectByName('armL'), armR: root.getObjectByName('armR'), head: root.getObjectByName('head'), body: root.getObjectByName('body') || root.children[0] || new THREE.Group(), stat: root.getObjectByName('static'), tail: root.getObjectByName('tail') };
  return root;
}
// monster skins from the lobby shop: recolour every material
const SKIN_FX = { shadow: { mul: '#2a2a32', e: '#ff1010' }, golden: { mul: '#ffd24a', m: .8, e: null }, toxic: { mul: '#7aff5a', e: '#3aff1a' }, frost: { mul: '#a8d8ff', e: '#4ac0ff' }, blood: { mul: '#ff5a5a', e: '#600000' },
  lava: { mul: '#ff7a3a', e: '#ff4a00' }, neon: { mul: '#c05aff', e: '#ff2af0' }, ghost: { mul: '#d8f0ff', e: '#9ae8ff', op: .55 }, zombie: { mul: '#8aa86a', e: '#aaff3a' }, abyss: { mul: '#1a2a5a', e: '#2a8aff', m: .4 } };
export function applySkin(root, skin) {
  if (root.userData.kind) root.userData.skin = skin;
  const f = SKIN_FX[skin]; if (!f) return; const mul = new THREE.Color(f.mul);
  const seen = new Set(); root.traverse(o => { if (!o.isMesh) return; for (const m of Array.isArray(o.material) ? o.material : [o.material]) { if (!m.color || seen.has(m)) continue; seen.add(m); m.color.multiply(mul).lerp(mul, .25); if (f.m != null) { m.metalness = f.m; m.roughness = .3; } if (f.e && m.emissive && m.emissiveIntensity > .5) m.emissive.set(f.e); else if (f.e && skin === 'toxic' && m.emissive) { m.emissive.set('#0a3000'); m.emissiveIntensity = .5; } } });
}
// what plays on old TVs in houses: the Locust standing in front of faded floral wallpaper (it talks like a friendly child…)
let _lscr = null;
function locustScreen() {
  if (_lscr) return _lscr; const c = document.createElement('canvas'); c.width = 256; c.height = 192; const g = c.getContext('2d');
  oldWallpaper(g, 256, 192, .55);
  g.fillStyle = '#050505'; g.beginPath(); g.moveTo(98, 192); g.lineTo(108, 92); g.quadraticCurveTo(128, 76, 148, 92); g.lineTo(158, 192); g.fill(); // tall black body
  g.fillRect(122, 52, 12, 34); g.strokeStyle = '#25262a'; g.lineWidth = 4; for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(128, 58 + i * 8, 10, 3, 0, 0, 6.283); g.stroke(); }
  g.fillStyle = '#8c8682'; g.beginPath(); g.ellipse(128, 34, 13, 24, .06, 0, 6.283); g.fill(); g.fillStyle = '#000'; g.beginPath(); g.ellipse(122, 30, 3.5, 6, 0, 0, 6.283); g.ellipse(134, 29, 4.2, 7, 0, 0, 6.283); g.fill(); g.beginPath(); g.ellipse(129, 47, 4, 2, .2, 0, 6.283); g.fill();
  g.strokeStyle = '#25262a'; g.lineWidth = 3; g.beginPath(); g.ellipse(128, 30, 17, 9, .5, 0, 6.283); g.stroke(); g.beginPath(); g.ellipse(128, 36, 16, 8, -.4, 0, 6.283); g.stroke();
  const im = g.getImageData(0, 0, 256, 192); for (let i = 0; i < im.data.length; i += 4) { const n = (Math.random() - .5) * 40, row = (i / 4 / 256 | 0) % 3 === 0 ? .82 : 1; for (let k = 0; k < 3; k++) im.data[i + k] = Math.max(0, Math.min(255, im.data[i + k] * row + n)); } g.putImageData(im, 0, 0);
  g.fillStyle = '#fff'; g.font = 'bold 12px monospace'; g.fillText('"come play with me!"', 58, 182);
  _lscr = new THREE.CanvasTexture(c); _lscr.colorSpace = THREE.SRGBColorSpace; return _lscr;
}
export function monsterHeight(kind) { const [b, a] = String(kind).split('#'); if (b === 'fester') return 2.25 * (1 + (+a || 0) * .12); return { sirenhead: 8.2, cartooncat: 4.0, locust: 3.9, dn_conezone: 3.0, dn_sixarm: 4.5, dn_guilt: 4.1, sonicexe: 2.1, demogorgon: 3.1, boisvert: 2.6, wendigo: 3.2, wendigo_h: 2.1,
  megalodon: 3.0, megalodon_h: 4.0, kraken: 7.0, cthulhu: 7.8, leviathan: 5.2, mosasaurus: 3.0, nessie: 6.0, spinosaurus: 6.4, trex: 5.2, quetzalcoatlus: 4.6, yeti: 3.6, bigfoot: 3.1, dragon: 4.6, chupacabra: 1.6, vampire: 2.2, gargoyle: 2.6 }[b] || 2.8; }
export const DN_MODELS = ['drnowhere', 'dn_conezone', 'dn_nightmare', 'dn_sixarm', 'dn_guilt'];
export function modelKey(mt, fm) { return mt === 'drnowhere' ? DN_MODELS[fm || 0] : mt === 'megalodon' && fm === 1 ? 'megalodon_h' : mt === 'fester' ? 'fester#' + (fm || 0) : mt === 'wendigo' ? (fm === 1 ? 'wendigo_h' : 'wendigo') : mt; }

// ---------- realistic survivor (≈1.78 m, articulated hips/knees/shoulders/elbows) ----------
const SKINS = ['#f1c7a5', '#e0ac85', '#c68863', '#9c6644', '#6e4630', '#f6d5b8'];
const HAIRS = ['#2a1c12', '#5a3a1e', '#151210', '#8a5a2a', '#c09050', '#3a2a22'];
function hashStr(s) { let h = 7; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; }
function seg(parent, len, r0, r1, m, y0 = 0) { // tapered limb segment hanging down from y0
  const o = add(parent, G.cap(Math.max(r0, r1), Math.max(.01, len - Math.max(r0, r1) * 2)), m, [0, y0 - len / 2, 0]);
  o.scale.set(1, 1, r1 / r0 > 1 ? 1 : .92); return o;
}
export function parseLook(str) { const [sk, hc, hs, top, pants, hat, acc, of] = String(str || '').split(','); return { sk: +sk || 0, hc: +hc || 0, hs: +hs || 0, top: top || null, pants: pants || null, hat: hat || 'none', acc: acc || 'none', of: of || 'none' }; }
// survivor outfits (store "skins"): recolour the jacket and pants and add a signature piece
export const OUTFIT_DEF = {
  ranger: { top: '#4a5a3a', pants: '#3a3626', x: (P) => { P.add(P.torso, G.box(.05, .06, .01), mat('#d8b040', { m: .8, r: .3 }), [-.08, .36, .13]); } },
  hazmat: { top: '#e8c820', pants: '#e8c820', x: (P) => { const y = mat('#e8c820', { r: .45 }); P.add(P.head, G.sph(.15, 16, 12), y, [0, .03, -.01], [0, 0, 0], [1, 1.1, 1.05]); P.add(P.head, G.sph(.1, 14, 10, 0, Math.PI * 2, 0, Math.PI * .6), new THREE.MeshPhysicalMaterial({ color: '#203040', roughness: .05, transparent: true, opacity: .6 }), [0, .02, .07], [Math.PI / 2, 0, 0], [1, .7, 1]); } },
  hunter: { top: '#e8620e', pants: '#4a4a30', x: (P) => { P.add(P.torso, G.box(.34, .3, .29), mat('#ff6a10', { map: 'cloth', r: .8 }), [0, .27, 0]); } },
  scout: { top: '#6a8a4a', pants: '#3a3a2a', x: (P) => { P.add(P.torso, G.cone(.07, .14, 3), mat('#c02a1a', { map: 'cloth' }), [0, .45, .12], [Math.PI, 0, 0]); } },
  diver: { top: '#121418', pants: '#121418', x: (P) => { P.add(P.torso, G.box(.36, .03, .27), mat('#1a6ad8', { r: .4 }), [0, .3, 0]); P.add(P.torso, G.cyl(.06, .06, .36, 12), mat('#c8c8c8', { m: .8, r: .3 }), [-.07, .27, -.22]); P.add(P.torso, G.cyl(.06, .06, .36, 12), mat('#c8c8c8', { m: .8, r: .3 }), [.07, .27, -.22]); } },
  ninja: { top: '#0c0c0e', pants: '#0c0c0e', x: (P) => { const k = mat('#0c0c0e', { map: 'cloth' }); P.add(P.head, G.sph(.112, 16, 12), k, [0, .02, 0], [0, 0, 0], [.95, 1.14, 1.04]); P.add(P.head, G.box(.12, .025, .02), mat('#c01818'), [0, .09, .07]); } },
  astronaut: { top: '#e8e8ec', pants: '#e8e8ec', x: (P) => { P.add(P.head, G.sph(.17, 18, 14), new THREE.MeshPhysicalMaterial({ color: '#d8e8ff', roughness: .05, transparent: true, opacity: .32 }), [0, .02, 0]); P.add(P.torso, G.box(.34, .42, .16), mat('#d8d8dc', { r: .5 }), [0, .27, -.22]); P.add(P.torso, G.box(.12, .08, .02), mat('#2a5ad8'), [0, .34, .13]); } },
  knight: { top: '#9aa0a8', pants: '#7a8088', metal: true, x: (P) => { const s = mat('#a8aeb6', { m: .85, r: .3, map: 'metal' }); P.add(P.head, G.cyl(.125, .12, .24, 16), s, [0, .03, 0]); P.add(P.head, G.box(.16, .015, .02), mat('#050505'), [0, .04, .125]); P.add(P.torso, G.sph(.1, 12, 8), s, [-.22, .46, 0]); P.add(P.torso, G.sph(.1, 12, 8), s, [.22, .46, 0]); } },
  pajamas: { top: '#7a9ad8', pants: '#7a9ad8', x: (P) => { P.add(P.head, G.cone(.11, .28, 12), mat('#7a9ad8', { map: 'cloth' }), [0, .2, -.03], [-.4, 0, 0]); P.add(P.head, G.sph(.03, 8, 6), mat('#ffffff'), [0, .31, -.12]); } },
  ghostbuster: { top: '#c8b890', pants: '#c8b890', x: (P) => { P.add(P.torso, G.box(.3, .42, .16), mat('#3a3a3a', { m: .5, r: .4 }), [0, .27, -.22]); P.add(P.torso, G.cyl(.03, .03, .4, 8), mat('#d82020', { e: '#ff2020', ei: .8 }), [.14, .2, -.3]); } },
};
export function buildSurvivor(color, look) {
  const L = typeof look === 'string' ? parseLook(look) : (look || parseLook('')), h = hashStr(color), root = new THREE.Group();
  if (L.top) color = L.top;
  const OF = OUTFIT_DEF[L.of]; if (OF) { color = OF.top; L.pants = OF.pants; }
  const skin = mat(SKINS[L.sk % SKINS.length], { r: .62 });
  const jacket = mat(color, { map: 'cloth', bump: 'cloth', bs: .6, r: .88 });
  const jacketDark = mat(new THREE.Color(color).multiplyScalar(.55), { map: 'cloth', r: .9 });
  const jeans = mat(L.pants || ['#2c3e60', '#3a3a3a', '#4a4030', '#25303f'][h % 4], { map: 'cloth', bump: 'cloth', bs: .5, r: .92 });
  const shoe = mat('#1c1a18', { r: .6 }), sole = mat('#d8d2c4', { r: .7 }), hair = mat(HAIRS[L.hc % HAIRS.length], { map: 'fur', r: .9 });
  const strap = mat('#2a2622', { r: .7 }), pack = mat(['#3d4a2e', '#5a2a22', '#22303e', '#4a3a28'][(h >> 5) % 4], { map: 'cloth', r: .9 });
  for (const [m, sv] of [[skin, 'face'], [jacket, 'cotton'], [jacketDark, 'cotton'], [jeans, 'denim'], [pack, 'canvas'], [shoe, 'leather'], [strap, 'leather'], [sole, 'rubber']]) m.userData.sv = sv; // v1.6 PBR cloth / skin
  const body = grp(root, [0, 0, 0], 'body');
  // legs: hip pivot -> thigh -> knee pivot -> shin -> foot
  const legs = [-.1, .1].map((x, i) => {
    const hip = grp(body, [x, .93, 0], i ? 'legR' : 'legL');
    seg(hip, .46, .085, .07, jeans);
    const knee = grp(hip, [0, -.46, 0]); hip.userData.low = knee;
    seg(knee, .44, .065, .05, jeans);
    add(knee, G.cyl(.058, .062, .07, 10), jeans, [0, -.4, 0]); // jean cuff
    const foot = grp(knee, [0, -.44, 0]);
    add(foot, G.box(.11, .075, .27), shoe, [0, -.012, .05]); add(foot, G.box(.115, .025, .28), sole, [0, -.05, .05]);
    return hip;
  });
  // pelvis, torso (jacket), belt
  add(body, G.sph(.16, 16, 12), jeans, [0, .96, 0], [0, 0, 0], [1.05, .7, .75]);
  add(body, G.cyl(.165, .17, .05, 16), strap, [0, 1.02, 0], [0, 0, 0], [1, 1, .72]);
  const torso = grp(body, [0, 1.02, 0], 'torso');
  add(torso, G.cap(.15, .26), jacket, [0, .24, 0], [0, 0, 0], [1.22, 1, .78]); // chest/abdomen
  add(torso, G.cap(.07, .3), jacket, [0, .42, 0], [0, 0, Math.PI / 2], [1, 1, .9]); // shoulders
  add(torso, G.box(.012, .4, .012), jacketDark, [0, .24, .125]); // zipper
  add(torso, G.tor(.085, .03), jacketDark, [0, .5, 0], [Math.PI / 2, 0, 0], [1, .9, 1]); // collar
  for (const sx of [-.09, .09]) add(torso, G.box(.09, .07, .02), jacketDark, [sx, .1, .13]); // pockets
  // backpack
  add(torso, G.box(.3, .38, .14), pack, [0, .27, -.19]); add(torso, G.box(.26, .14, .05), pack, [0, .14, -.27]);
  for (const sx of [-.1, .1]) add(torso, G.box(.035, .4, .02), strap, [sx, .3, .125], [.08, 0, 0]);
  // vest + helmet (shown when worn)
  const vestM = mat('#3a4030', { map: 'cloth', bump: 'cloth', bs: 1.2, r: .85 });
  const vest = grp(torso, [0, 0, 0], 'vest'); vest.visible = false;
  add(vest, G.box(.36, .36, .07), vestM, [0, .27, .12]); add(vest, G.box(.36, .36, .06), vestM, [0, .27, -.13]);
  for (let i = 0; i < 3; i++) add(vest, G.box(.09, .08, .04), mat('#2e3326', { r: .9 }), [-.11 + i * .11, .17, .17]);
  add(vest, G.box(.2, .05, .01), mat('#d8d8c8', { r: .6 }), [0, .37, .158]); // PRESS/POLICE strip
  // neck + head
  add(torso, G.cyl(.058, .066, .11, 14), skin, [0, .555, 0]);
  const head = grp(torso, [0, .66, .005], 'head');
  add(head, G.sph(.105, 20, 16), skin, [0, .02, 0], [0, 0, 0], [.92, 1.12, 1]);
  add(head, G.sph(.07, 14, 10), skin, [0, -.05, .03], [0, 0, 0], [1.05, .8, 1]); // jaw
  add(head, G.sph(.025, 8, 6), skin, [0, .0, .1], [0, 0, 0], [.8, 1, 1.1]); // nose
  for (const sx of [-.1, .1]) add(head, G.sph(.026, 8, 6), skin, [sx * .95, .01, -.005], [0, 0, 0], [.5, 1, .8]); // ears
  const white = mat('#f4f1ea', { r: .3 }), pupil = mat('#050505', { r: .1 }), iris = mat(['#3a2a1a', '#3a6a8a', '#4a6a3a', '#2a1a10'][(h >> 7) % 4], { r: .2 });
  for (const sx of [-.037, .037]) {
    add(head, G.sph(.016, 14, 10), white, [sx, .035, .082]); add(head, G.sph(.009, 12, 8), iris, [sx, .035, .0945], [0, 0, 0], [1, 1, .5]); add(head, G.sph(.0042, 8, 6), pupil, [sx, .035, .0982], [0, 0, 0], [1, 1, .4]); // v1.6: eyes sit forward, with pupils
    add(head, G.sph(.0175, 12, 8, 0, Math.PI * 2, 0, Math.PI * .4), skin, [sx, .036, .082], [.35, 0, 0]); // upper eyelid
    add(head, G.box(.038, .009, .012), hair, [sx, .062, .094], [0, 0, sx > 0 ? -.12 : .12]); // brows
  }
  { const lip = mat('#9a6058', { r: .5 }); lip.userData.sv = 'lips'; add(head, G.sph(.019, 12, 8), lip, [0, -.041, .093], [0, 0, 0], [1, .3, .4]); add(head, G.sph(.017, 12, 8), lip, [0, -.05, .091], [0, 0, 0], [1, .34, .4]); } // lips
  const style = L.hs; // 0 short, 1 long, 2 ponytail/bun, 3 buzz
  if (style !== 3) add(head, G.sph(.112, 24, 14, 0, Math.PI * 2, 0, Math.PI * .55), hair, [0, .03, -.008], [-.45, 0, 0], [.95, 1.08, 1.04]);
  else add(head, G.sph(.108, 24, 14, 0, Math.PI * 2, 0, Math.PI * .45), hair, [0, .03, -.008], [-.45, 0, 0], [.95, 1.08, 1.02]); // v1.6: hairline sits above the brows
  if (style === 1) { add(head, G.sph(.09, 12, 10), hair, [0, -.04, -.07], [0, 0, 0], [1.2, 1.5, .8]); for (const sx of [-.09, .09]) add(head, G.cap(.03, .12), hair, [sx, -.06, -.02]); }
  if (style === 2) { add(head, G.sph(.05, 10, 8), hair, [0, .08, -.12]); add(head, G.cap(.025, .1), hair, [0, -.02, -.15], [.3, 0, 0]); }
  // hats & accessories (lobby shop cosmetics)
  const hatM = mat(new THREE.Color(color).multiplyScalar(.8), { map: 'cloth', r: .85 });
  const hats = {
    cap: () => { add(head, G.sph(.118, 16, 10, 0, Math.PI * 2, 0, Math.PI * .5), hatM, [0, .06, 0]); add(head, G.box(.16, .012, .1), hatM, [0, .07, .13]); },
    beanie: () => { add(head, G.sph(.12, 16, 10, 0, Math.PI * 2, 0, Math.PI * .55), hatM, [0, .06, 0], [0, 0, 0], [1, 1.15, 1]); add(head, G.cyl(.12, .12, .04, 16), hatM, [0, .06, 0]); add(head, G.sph(.03, 8, 6), hatM, [0, .2, 0]); },
    cowboy: () => { const m = mat('#7a5230', { r: .8 }); add(head, G.cyl(.24, .24, .015, 20), m, [0, .1, 0]); add(head, G.cyl(.09, .11, .12, 16), m, [0, .17, 0]); },
    headphones: () => { const m = mat('#151515', { r: .4, m: .3 }); add(head, G.tor(.12, .012), m, [0, .05, 0], [0, Math.PI / 2, 0], [1, 1.1, 1]); for (const sx of [-.11, .11]) add(head, G.cyl(.04, .04, .03, 14), mat('#e03a3a', { r: .4 }), [sx, .01, 0], [0, 0, Math.PI / 2]); },
    crown: () => { const g = mat('#e8b830', { m: .95, r: .25, e: '#3a2a00', ei: .4 }); add(head, G.cyl(.09, .09, .06, 12, 1, true), g, [0, .16, 0]); for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; add(head, G.cone(.02, .05, 4), g, [Math.cos(a) * .09, .21, Math.sin(a) * .09]); } },
    hardhat: () => { const m = mat('#f0c020', { r: .35, m: .1 }); add(head, G.sph(.125, 16, 10, 0, Math.PI * 2, 0, Math.PI * .5), m, [0, .06, 0]); add(head, G.cyl(.15, .15, .012, 18), m, [0, .065, .01]); },
    bunny: () => { const m = mat('#f4f0f0', { map: 'fur', r: .9 }); for (const sx of [-.05, .05]) add(head, G.cap(.025, .16), m, [sx, .22, -.02], [0, 0, sx * 2]); },
    tophat: () => { const m = mat('#141414', { map: 'cloth', r: .6 }); add(head, G.cyl(.2, .2, .015, 20), m, [0, .1, 0]); add(head, G.cyl(.1, .1, .22, 18), m, [0, .21, 0]); add(head, G.cyl(.102, .102, .04, 18), mat('#8a1a1a'), [0, .13, 0]); },
    pirate: () => { const m = mat('#1a1410', { map: 'cloth', r: .7 }); add(head, G.box(.32, .1, .14), m, [0, .14, 0]); add(head, G.sph(.03, 8, 6), mat('#f0f0e8'), [0, .15, .07]); },
    horns: () => { const m = mat('#a01010', { r: .4, e: '#300000', ei: .5 }); for (const sx of [-1, 1]) add(head, G.cone(.025, .12, 8), m, [sx * .07, .13, .02], [0, 0, sx * -.4]); },
    halo: () => add(head, G.tor(.09, .012), mat('#ffe680', { e: '#ffd040', ei: 2.5 }), [0, .22, 0], [Math.PI / 2, 0, 0]),
    viking: () => { const s = mat('#8a8e94', { m: .8, r: .35 }), hn = mat('#e8e0c8', { r: .4 }); add(head, G.sph(.12, 16, 10, 0, Math.PI * 2, 0, Math.PI * .5), s, [0, .06, 0]); for (const sx of [-1, 1]) add(head, G.cone(.03, .16, 8), hn, [sx * .13, .14, 0], [0, 0, sx * -1.0]); },
    witch: () => { const m = mat('#1a0a24', { map: 'cloth', r: .8 }); add(head, G.cyl(.22, .22, .012, 20), m, [0, .1, 0]); add(head, G.cone(.11, .36, 16), m, [0, .28, -.02], [-.15, 0, 0]); },
  };
  hats[L.hat]?.();
  const accs = {
    glasses: () => { const m = mat('#111', { m: .5, r: .3 }); for (const sx of [-.037, .037]) add(head, G.tor(.022, .004), m, [sx, .035, .104]); add(head, G.box(.03, .004, .004), m, [0, .04, .105]); },
    scarf: () => { add(torso, G.tor(.08, .035), mat('#b02a2a', { map: 'cloth' }), [0, .53, 0], [Math.PI / 2, 0, 0]); add(torso, G.box(.05, .18, .02), mat('#b02a2a', { map: 'cloth' }), [.04, .42, .1]); },
    mask: () => add(head, G.sph(.08, 12, 8, 0, Math.PI * 2, Math.PI * .5, Math.PI * .5), mat('#e8e8e8', { r: .7 }), [0, -.01, .04], [-.3, 0, 0], [1.1, 1, 1]),
    goggles: () => { add(head, G.tor(.11, .01), mat('#222'), [0, .06, 0], [Math.PI / 2, 0, 0]); for (const sx of [-.04, .04]) add(head, G.cyl(.025, .025, .02, 12), mat('#4a8aaa', { r: .1, m: .4 }), [sx, .07, .1], [Math.PI / 2, 0, 0]); },
    backpack: () => { const m = mat('#3a5a2a', { map: 'cloth', r: .9 }); add(torso, G.box(.36, .5, .2), m, [0, .3, -.24]); add(torso, G.cyl(.06, .06, .38, 10), mat('#5a3a2a', { map: 'cloth' }), [0, .58, -.24], [0, 0, Math.PI / 2]); },
    cape: () => { const m = mat('#8a0a14', { map: 'cloth', r: .7 }); m.side = THREE.DoubleSide; const c = add(torso, new THREE.CylinderGeometry(.17, .32, .95, 14, 1, true, Math.PI * .2, Math.PI * 1.6), m, [0, .05, -.04]); c.rotation.y = Math.PI; },
    chain: () => add(torso, G.tor(.1, .012), mat('#e8c040', { m: .95, r: .25 }), [0, .46, .06], [1.2, 0, 0]),
    bandana: () => add(head, G.sph(.075, 12, 8, 0, Math.PI * 2, Math.PI * .5, Math.PI * .5), mat('#c01818', { map: 'cloth' }), [0, -.02, .045], [-.25, 0, 0], [1.15, 1, 1]),
    wings: () => { const m = mat('#f4f4f8', { r: .8, e: '#ffffff', ei: .15 }); m.side = THREE.DoubleSide; for (const sx of [-1, 1]) { const w = add(torso, G.sph(.3, 12, 8), m, [sx * .2, .4, -.22], [0, sx * .5, 0], [.9, .6, .08]); w.rotation.z = sx * -.4; } },
  };
  accs[L.acc]?.();
  if (OF && OF.x) OF.x({ add, head, torso, body });
  if (OF && OF.metal) { jacket.metalness = .7; jacket.roughness = .35; jeans.metalness = .6; jeans.roughness = .4; }
  const helm = grp(head, [0, .05, 0], 'helmet'); helm.visible = false;
  const helmM = mat('#3f4632', { r: .55, m: .1 });
  add(helm, G.sph(.135, 18, 12), helmM, [0, .02, -.005], [-.1, 0, 0], [1, .82, 1.08]); add(helm, G.cyl(.14, .145, .03, 18), helmM, [0, -.02, 0]);
  add(helm, G.box(.04, .03, .015), mat('#111', { m: .6 }), [0, .06, .13]);
  // arms: shoulder -> upper arm -> elbow -> forearm -> hand
  const arms = [-1, 1].map(sd => {
    const sh = grp(torso, [sd * .2, .44, 0], sd > 0 ? 'armR' : 'armL');
    seg(sh, .3, .055, .047, jacket); sh.rotation.z = sd * .06;
    const el = grp(sh, [0, -.3, 0]); sh.userData.low = el;
    seg(el, .26, .046, .038, jacket);
    add(el, G.cyl(.04, .041, .03, 10), jacketDark, [0, -.25, 0]); // cuff
    const hand = grp(el, [0, -.28, 0], sd > 0 ? 'handR' : 'handL');
    add(hand, G.box(.07, .085, .035), skin, [0, -.035, 0]); add(hand, G.cap(.016, .03), skin, [sd * -.035, -.03, .02], [.6, 0, 0]);
    sh.userData.hand = hand; return sh;
  });
  // flashlight in the left hand, pointing along the forearm
  const fl = grp(arms[0].userData.hand, [0, -.06, .02], 'flash');
  add(fl, G.cyl(.022, .022, .18, 10), mat('#2b2b2b', { m: .7, r: .35 }), [0, -.02, 0]); add(fl, G.cyl(.032, .024, .05, 10), mat('#3a3a3a', { m: .8, r: .3 }), [0, -.13, 0]);
  const lens = add(fl, G.cyl(.03, .03, .01, 10), mat('#fff8d8', { e: '#fff3c4', ei: 4 }), [0, -.16, 0]); lens.name = 'lens';
  vestM.userData.sv = 'canvas'; realizeHuman(root);
  root.traverse(o => { if (o.isMesh && !Array.isArray(o.material)) o.material = o.material.clone(); });
  root.userData.parts = { legL: legs[0], legR: legs[1], armL: arms[0], armR: arms[1], head, body, torso, flash: fl, handR: arms[1].userData.hand, vest, helmet: helm };
  root.userData.faceMats = [];
  return root;
}

// ---------- items: weapons, food & drinks, armour, ammo (forward = +Z, grip at origin) ----------
export function buildItem(k) {
  const g = new THREE.Group(); g.userData.kind = k;
  const steel = mat('#9aa0a8', { m: .9, r: .28, map: 'metal' }), dark = mat('#1d1f22', { m: .7, r: .4, map: 'metal' }), wood = mat('#7a4a26', { map: 'wood', r: .7 }), grip = mat('#222', { r: .8 });
  const B2 = (sx, sy, sz, m, p, r) => add(g, G.box(sx, sy, sz), m, p, r);
  const C = (r0, r1, h, m, p, r, n = 12) => add(g, G.cyl(r0, r1, h, n), m, p, r || [Math.PI / 2, 0, 0]);
  switch (k) {
    case 'knife': B2(.026, .03, .11, grip, [0, 0, -.02]); B2(.05, .012, .012, steel, [0, 0, .035]); B2(.005, .03, .16, steel, [0, .003, .12]); B2(.006, .016, .05, steel, [0, .012, .215], [-.35, 0, 0]); break;
    case 'bat': C(.016, .02, .18, mat('#222', { r: .9 }), [0, 0, 0]); C(.02, .036, .62, wood, [0, 0, .4]); add(g, G.sph(.036, 12, 8), wood, [0, 0, .71]); C(.024, .024, .02, grip, [0, 0, -.1]); break;
    case 'crowbar': { const cm = mat('#a02020', { m: .7, r: .35 }); C(.012, .012, .7, cm, [0, 0, .28]); C(.012, .012, .1, cm, [0, .04, .66], [0, 0, 0]); B2(.03, .006, .06, cm, [0, -.01, -.08], [.4, 0, 0]); break; }
    case 'axe': C(.017, .02, .72, wood, [0, 0, .28]); B2(.025, .12, .09, steel, [0, .045, .6]); B2(.008, .16, .02, mat('#d8dce0', { m: 1, r: .2 }), [0, .05, .65]); B2(.03, .05, .06, dark, [0, -.035, .6]); break;
    case 'pistol': B2(.03, .036, .19, dark, [0, .05, .06]); B2(.028, .1, .045, grip, [0, -.005, -.01], [-.25, 0, 0]); B2(.006, .03, .05, dark, [0, .02, .03]); C(.007, .007, .02, dark, [0, .05, .16]); break;
    case 'shotgun': C(.017, .017, .62, dark, [0, .05, .38]); C(.014, .014, .45, dark, [0, .02, .3]); C(.024, .024, .16, wood, [0, .02, .3]); B2(.04, .06, .22, dark, [0, .04, .02]); B2(.035, .09, .3, wood, [0, -.01, -.22], [-.12, 0, 0]); B2(.03, .07, .04, wood, [0, -.03, -.02], [-.4, 0, 0]); break;
    case 'rifle': B2(.04, .07, .32, dark, [0, .04, .05]); C(.012, .012, .42, dark, [0, .05, .42]); B2(.03, .13, .05, dark, [0, -.05, .1], [.25, 0, 0]); B2(.035, .08, .26, dark, [0, .02, -.22]); B2(.03, .09, .04, grip, [0, -.03, -.05], [-.35, 0, 0]); C(.02, .02, .18, mat('#111', { m: .5, r: .2 }), [0, .1, .06]); B2(.044, .04, .14, mat('#3a3e2e', { r: .8 }), [0, .04, .3]); break;
    case 'water': { const bm = new THREE.MeshPhysicalMaterial({ color: '#9fd4ff', roughness: .1, transparent: true, opacity: .6 }); add(g, G.cyl(.034, .034, .2, 14), bm, [0, .1, 0]); add(g, G.cyl(.016, .03, .04, 12), bm, [0, .22, 0]); add(g, G.cyl(.017, .017, .02, 10), mat('#1e6ad8'), [0, .245, 0]); add(g, G.cyl(.035, .035, .06, 14), mat('#e8f4ff', { r: .5 }), [0, .1, 0]); break; }
    case 'soda': add(g, G.cyl(.033, .033, .12, 16), mat('#c81e1e', { m: .6, r: .3 }), [0, .06, 0]); add(g, G.cyl(.028, .033, .012, 16), steel, [0, .126, 0]); add(g, G.box(.067, .03, .067), mat('#f4f4f4', { r: .4 }), [0, .06, 0], [0, .7, 0], [.98, 1, .98]); break;
    case 'energy': add(g, G.cyl(.03, .03, .16, 16), mat('#12161a', { m: .6, r: .3 }), [0, .08, 0]); add(g, G.cyl(.031, .031, .05, 16), mat('#6aff2a', { e: '#3aff1a', ei: .4 }), [0, .09, 0]); add(g, G.cyl(.026, .03, .012, 16), steel, [0, .166, 0]); break;
    case 'chips': add(g, G.box(.16, .2, .05), mat('#f2c218', { r: .45, m: .3 }), [0, .1, 0], [0, 0, 0], [1, 1, .6]); add(g, G.box(.16, .02, .02), mat('#d01818'), [0, .2, 0]); add(g, G.box(.08, .06, .052), mat('#d01818'), [0, .12, 0]); break;
    case 'choco': add(g, G.box(.17, .018, .07), mat('#4a2412', { r: .5 }), [0, .01, 0]); add(g, G.box(.11, .022, .074), mat('#7a1a8a', { r: .45, m: .2 }), [.03, .011, 0]); break;
    case 'beans': add(g, G.cyl(.04, .04, .11, 16), steel, [0, .055, 0]); add(g, G.cyl(.041, .041, .07, 16), mat('#e2661a', { r: .6 }), [0, .055, 0]); break;
    case 'medkit': B2(.24, .16, .08, mat('#d22a2a', { r: .5 }), [0, .08, 0]); B2(.12, .035, .082, mat('#fff'), [0, .08, .001]); B2(.035, .12, .082, mat('#fff'), [0, .08, .001]); B2(.08, .02, .02, grip, [0, .17, 0]); break;
    case 'vest': { const vm = mat('#3a4030', { map: 'cloth', bump: 'cloth', bs: 1.2 }); B2(.4, .45, .08, vm, [0, .225, 0]); for (let i = 0; i < 3; i++) B2(.1, .09, .04, mat('#2e3326'), [-.12 + i * .12, .12, .05]); B2(.24, .05, .01, mat('#e8e8d8'), [0, .38, .045]); break; }
    case 'helmet': { const hm = mat('#3f4632', { r: .55, m: .1 }); add(g, G.sph(.15, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), hm, [0, .02, 0], [0, 0, 0], [1, .85, 1.1]); add(g, G.cyl(.155, .16, .025, 18), hm, [0, .02, 0]); break; }
    default: if (k.startsWith('ammo')) { const c = { ammo_light: '#c8a020', ammo_shells: '#c02020', ammo_heavy: '#3a6a2a' }[k] || '#888'; B2(.16, .09, .1, mat(c, { r: .6 }), [0, .045, 0]); B2(.162, .02, .102, mat('#222'), [0, .07, 0]); for (let i = 0; i < 3; i++) add(g, G.cyl(.008, .008, .03, 8), mat('#d8b040', { m: .9, r: .25 }), [-.04 + i * .04, .1, 0]); }
      else add(g, G.box(.15, .15, .15), mat('#888'), [0, .075, 0]);
  }
  return g;
}
const MELEE = new Set(['knife', 'bat', 'crowbar', 'axe']), GUNS = new Set(['pistol', 'shotgun', 'rifle']);
export const itemClass = k => MELEE.has(k) ? 'melee' : GUNS.has(k) ? 'gun' : 'use';
// pose an item for holding in the right hand (hand's -Y runs along the forearm)
export function heldItem(k) {
  const it = buildItem(k), w = new THREE.Group(); w.add(it);
  if (GUNS.has(k)) { it.rotation.x = Math.PI / 2; it.position.set(0, -.05, .02); }
  else if (MELEE.has(k)) { it.position.set(0, -.04, 0); }
  else { it.position.set(0, -.09, .05); it.rotation.x = Math.PI; it.scale.setScalar(.9); }
  w.traverse(o => { if (o.isMesh) o.castShadow = true; }); return w;
}

// ---------- loot containers ----------
export function buildChest() {
  const g = new THREE.Group(), wood = mat('#6a4424', { map: 'wood', bump: 'wood', bs: 1.5, r: .8 }), band = mat('#2a2a2c', { m: .85, r: .4, map: 'metal' }), gold = mat('#c8a040', { m: .9, r: .3, e: '#3a2a00', ei: .3 });
  add(g, G.box(1, .48, .6), wood, [0, .24, 0]);
  add(g, G.box(.96, .02, .56), mat('#1a1008'), [0, .485, 0]); // dark inside
  for (const x of [-.38, .38]) add(g, G.box(.06, .5, .62), band, [x, .25, 0]);
  const lid = grp(g, [0, .48, -.3], 'lid');
  add(lid, G.box(1, .1, .6), wood, [0, .05, .3]); add(lid, G.cyl(.3, .3, 1, 16, 1, false, 0, Math.PI), wood, [0, .1, .3], [0, 0, Math.PI / 2], [1, .35, 1]);
  for (const x of [-.38, .38]) add(lid, G.box(.065, .22, .62), band, [x, .1, .3]);
  add(lid, G.box(.12, .14, .04), gold, [0, -.02, .61]);
  const glowIn = glow(g, '#ffd27a', [0, .55, 0], 1.4); glowIn.visible = false;
  g.userData.lid = lid; g.userData.inner = glowIn; return g;
}
export function buildBag() {
  const g = new THREE.Group(), cloth = mat(['#2f3a2a', '#3a2a26', '#232a36'][Math.floor(Math.random() * 3)], { map: 'cloth', bump: 'cloth', bs: 1.4, r: .95 }), strap = mat('#1a1816', { r: .8 }), zip = mat('#b0a890', { m: .8, r: .3 });
  const body = add(g, G.cap(.2, .45), cloth, [0, .19, 0], [0, 0, Math.PI / 2], [1, 1, .85]);
  add(g, G.box(.6, .012, .012), zip, [0, .37, 0]);
  for (const x of [-.18, .18]) add(g, G.tor(.12, .018), strap, [x, .37, 0], [0, Math.PI / 2, 0], [1, .7, 1]);
  add(g, G.box(.28, .12, .03), cloth, [0, .17, .19]);
  const flap = grp(g, [0, .37, 0], 'flap'); add(flap, G.box(.55, .02, .2), cloth, [0, 0, .1]); flap.visible = false;
  g.userData.body = body; g.userData.flap = flap; return g;
}

// ---------- lattice steel transmission tower: returns beam segments [a,b,thickness] in local space ----------
export function towerBeams(H = 15) {
  const segs = [], v = (x, y, z) => new THREE.Vector3(x, y, z), base = 2.2, top = .55, neck = H * .66;
  const wAt = y => y < neck ? base + (top * 1.25 - base) * (y / neck) : top;
  const corners = y => { const w = wAt(y); return [v(-w, y, -w), v(w, y, -w), v(w, y, w), v(-w, y, w)]; };
  const levels = [0, 1.6, 3.4, 5.2, 7, 8.6, neck, H * .78, H * .9, H];
  for (let i = 0; i < levels.length - 1; i++) {
    const a = corners(levels[i]), b = corners(levels[i + 1]);
    for (let k = 0; k < 4; k++) { segs.push([a[k], b[k], .13]); const n = (k + 1) % 4; segs.push([a[k], b[n], .05]); segs.push([a[n], b[k], .05]); segs.push([b[k], b[n], .06]); }
  }
  // cross-arms (perpendicular to the line = local X) with insulator attach points
  const arms = [[H * .78, 3.6], [H * .9, 2.8]], attach = [];
  for (const [y, len] of arms) {
    for (const sd of [-1, 1]) {
      const w = wAt(y), tip = v(sd * len, y, 0);
      segs.push([v(sd * w, y, -w), tip, .07], [v(sd * w, y, w), tip, .07], [v(sd * w, y - .9, -w), tip, .05], [v(sd * w, y - .9, w), tip, .05], [v(sd * w, y, -w), v(sd * w, y, w), .05]);
      attach.push(v(sd * (len - .15), y - 1.3, 0));
    }
  }
  segs.push([v(-top, H, 0), v(0, H + 1, 0), .05], [v(top, H, 0), v(0, H + 1, 0), .05]); attach.push(v(0, H + 1, 0)); // earth wire peak
  return { segs, attach };
}
export function buildHelicopter(color = '#2d4a34') {
  const root = new THREE.Group();
  const paint = mat(color, { map: 'metal', m: .62, r: .38 }), dark = mat('#14161a', { m: .55, r: .45 }), steel = mat('#9aa3ad', { m: .85, r: .28, map: 'metal' });
  const glass = new THREE.MeshPhysicalMaterial({ color: '#b7d4ea', roughness: .04, metalness: 0, transparent: true, opacity: .38, envMapIntensity: 1.2 });
  const seat = mat('#3a3038', { map: 'cloth', r: .9 }), dash = mat('#1c1e22', { m: .4, r: .35 });
  // cabin: a faceted fuselage, a glazed nose, and a visible interior (seats, cyclic, panel)
  add(root, G.box(1.7, 1.35, 2.5), paint, [0, 1.55, .15]);
  add(root, G.box(1.35, .9, 1.15), paint, [0, 1.45, 1.55]);
  add(root, G.box(1.15, .7, .9), glass, [0, 1.72, 1.85]);
  add(root, G.box(1.45, .85, .08), glass, [0, 1.7, .55]);
  for (const sx of [-.92, .92]) add(root, G.box(.06, .7, 1.15), glass, [sx, 1.62, .2]);
  add(root, G.box(1.2, .08, .7), dash, [0, 1.35, 1.35]);
  for (let i = 0; i < 4; i++) add(root, G.box(.08, .05, .02), mat(i % 2 ? '#7dff9a' : '#ffd27a', { e: i % 2 ? '#7dff9a' : '#ffd27a', ei: 1.4 }), [-.35 + i * .18, 1.48, 1.68]);
  add(root, G.cyl(.035, .035, .55, 8), steel, [.15, 1.15, .85]);
  for (const sx of [-.38, .38]) { add(root, G.box(.42, .12, .42), seat, [sx, 1.05, -.15]); add(root, G.box(.42, .45, .08), seat, [sx, 1.28, -.38]); }
  for (const sx of [-.38, .38]) add(root, G.box(.4, .1, .38), seat, [sx, 1.02, .55]);
  // door outline on the right, so boarding reads as a real cabin rather than a blob
  add(root, G.box(.04, 1.05, .04), steel, [.88, 1.35, .85]); add(root, G.box(.04, 1.05, .04), steel, [.88, 1.35, -.35]);
  add(root, G.box(.04, .04, 1.25), steel, [.88, 1.85, .25]);
  // tail boom, fin, stabiliser
  add(root, G.cyl(.28, .16, 4.4, 12), paint, [0, 1.85, -3.15], [Math.PI / 2, 0, 0]);
  add(root, G.box(.08, 1.15, .85), paint, [0, 2.35, -5.15]);
  add(root, G.box(1.15, .06, .32), paint, [0, 2.15, -4.7]);
  // skids
  for (const sx of [-.7, .7]) {
    add(root, G.cyl(.045, .045, 3.3, 8), dark, [sx, .28, .2], [Math.PI / 2, 0, 0]);
    add(root, G.cyl(.04, .04, .7, 6), dark, [sx, .62, .85], [0, 0, sx > 0 ? .35 : -.35]);
    add(root, G.cyl(.04, .04, .7, 6), dark, [sx, .62, -.55], [0, 0, sx > 0 ? -.3 : .3]);
  }
  add(root, G.cyl(.16, .2, .28, 12), dark, [0, 2.35, .15]);
  const rotor = grp(root, [0, 2.55, .15], 'rotor');
  add(rotor, G.cyl(.22, .18, .12, 12), steel, [0, .08, 0]);
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; add(rotor, G.box(.18, .035, 5.6), dark, [Math.sin(a) * 2.7, .1, Math.cos(a) * 2.7], [0.08, a, 0]); }
  const tail = grp(root, [.28, 2.15, -5.15], 'tailrotor');
  add(tail, G.cyl(.08, .08, .08, 10), steel);
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; add(tail, G.box(.025, .55, .08), dark, [0, Math.sin(a) * .32, Math.cos(a) * .32], [a, 0, 0]); }
  const red = glow(root, '#ff3030', [-.95, 1.7, 1.9], .45), green = glow(root, '#30ff60', [.95, 1.7, 1.9], .45), white = glow(root, '#ffffff', [0, 2.7, -5.35], .4);
  root.userData.navs = [red, green, white];
  root.userData.rotor = rotor; root.userData.tail = tail;
  root.userData.door = true;
  return root;
}

// Generic vehicles. No brand marks. kind: pickup, sedan, suv, boat, ship.
export function buildVehicle(kind = 'sedan') {
  const g = new THREE.Group();
  const paint = mat(kind === 'pickup' ? '#6d2e24' : kind === 'suv' ? '#2c3a32' : kind === 'boat' ? '#b23a2a' : kind === 'ship' ? '#d8d2c4' : '#3a4660', { m: .45, r: .38, map: 'metal' });
  const glass = new THREE.MeshPhysicalMaterial({ color: '#c5d6e4', roughness: .05, metalness: .05, transparent: true, opacity: .45 });
  const dark = mat('#1a1c20', { m: .3, r: .6 }), rubber = mat('#151515', { r: .95 }), lamp = mat('#fff4d0', { e: '#fff1c4', ei: 2.2 });
  const wheel = (x, z, rad = .38) => { add(g, G.cyl(rad, rad, .22, 14), rubber, [x, rad, z], [0, 0, Math.PI / 2]); add(g, G.cyl(rad * .45, rad * .45, .24, 10), dark, [x, rad, z], [0, 0, Math.PI / 2]); };
  if (kind === 'boat' || kind === 'ship') {
    const ship = kind === 'ship', L = ship ? 8.2 : 4.6, W = ship ? 2.5 : 1.55;
    const hull = new THREE.Shape();
    hull.moveTo(-W / 2, -L / 2); hull.lineTo(W / 2, -L / 2); hull.lineTo(W * .42, L * .28); hull.quadraticCurveTo(W * .2, L * .48, 0, L / 2); hull.quadraticCurveTo(-W * .2, L * .48, -W * .42, L * .28); hull.lineTo(-W / 2, -L / 2);
    const geo = new THREE.ExtrudeGeometry(hull, { depth: ship ? 1.15 : .72, bevelEnabled: true, bevelSize: .08, bevelThickness: .1, bevelSegments: 2 });
    geo.rotateX(Math.PI / 2); geo.translate(0, ship ? .7 : .42, 0); geo.userData.shared = 0;
    const mesh = new THREE.Mesh(geo, paint); mesh.castShadow = true; g.add(mesh);
    const deck = new THREE.Mesh(new THREE.ShapeGeometry(hull), mat('#6a5438', { map: 'wood', r: .75 })); deck.rotation.x = -Math.PI / 2; deck.position.y = ship ? .78 : .48; deck.scale.setScalar(.9); g.add(deck);
    add(g, G.box(W * .7, .35, .08), glass, [0, ship ? 1.5 : .85, L * .28]);
    add(g, G.box(.35, .45, .4), dark, [0, ship ? .9 : .7, -L * .42]);
    add(g, G.box(.18, .1, .12), lamp, [W * .28, ship ? 1.1 : .7, L * .36]); add(g, G.box(.18, .1, .12), lamp, [-W * .28, ship ? 1.1 : .7, L * .36]);
    if (ship) { add(g, G.box(1.6, 1.3, 2.2), mat('#eeeae2', { r: .5 }), [0, 1.55, -.6]); add(g, G.box(1.62, .4, 1.4), glass, [0, 1.7, -.4]); }
    g.userData.water = 1; g.userData.lights = [[W * .28, ship ? 1.1 : .7, L * .4], [-W * .28, ship ? 1.1 : .7, L * .4]];
    return g;
  }
  const suv = kind === 'suv', pickup = kind === 'pickup';
  const L = pickup ? 4.8 : suv ? 4.3 : 4.4, H = suv ? 1.55 : pickup ? 1.45 : 1.15, W = suv ? 1.85 : 1.75;
  add(g, G.box(W, .45, L), paint, [0, .62, 0]);
  if (pickup) { add(g, G.box(W * .96, .35, L * .42), paint, [0, .95, -L * .22]); add(g, G.box(W * .9, H * .7, L * .38), paint, [0, 1.15, L * .12]); add(g, G.box(W * .82, .45, L * .32), glass, [0, 1.35, L * .14]); }
  else { add(g, G.box(W * .92, H * .72, L * (suv ? .62 : .48)), paint, [0, .95 + H * .2, suv ? .05 : .15]); add(g, G.box(W * .84, H * .42, L * (suv ? .55 : .42)), glass, [0, 1.15 + H * .15, suv ? .08 : .18]); }
  wheel(-W * .48, L * .32); wheel(W * .48, L * .32); wheel(-W * .48, -L * .32); wheel(W * .48, -L * .32);
  add(g, G.box(.28, .12, .08), lamp, [-W * .28, .72, L * .5]); add(g, G.box(.28, .12, .08), lamp, [W * .28, .72, L * .5]);
  add(g, G.box(.22, .08, .06), mat('#ff3030', { e: '#ff2020', ei: 1.4 }), [-W * .3, .7, -L * .5]); add(g, G.box(.22, .08, .06), mat('#ff3030', { e: '#ff2020', ei: 1.4 }), [W * .3, .7, -L * .5]);
  g.userData.lights = [[-W * .28, .78, L * .55], [W * .28, .78, L * .55]];
  return g;
}

// Lamp post (light is assigned from a pool by the renderer)
export function buildLamp() {
  const root = new THREE.Group(); const m = mat('#222', { m: .7, r: .45 });
  add(root, G.cyl(.08, .12, 5.2, 8), m, [0, 2.6, 0]); add(root, G.box(.9, .08, .08), m, [.4, 5.15, 0]);
  const shade = add(root, G.cone(.28, .25, 12), m, [.8, 5.05, 0]);
  const bulb = add(root, G.sph(.12, 10, 8), mat('#ffd9a0', { e: '#ffcc88', ei: 3 }), [.8, 4.92, 0]); bulb.castShadow = false;
  const gl = glow(root, '#ffc070', [.8, 4.88, 0], 1.6);
  root.userData.bulb = bulb; root.userData.glow = gl; root.userData.lightPos = new THREE.Vector3(.8, 4.7, 0); shade.castShadow = true;
  return root;
}

// ---------- furniture & facility props, sized to a footprint (w along X, d along Z, metres) ----------
function signTex(text, sub, c1 = '#ff3a3a', bg = '#0a0608') {
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 256; const x = cv.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, 1024, 256); x.strokeStyle = c1; x.lineWidth = 10; x.strokeRect(14, 14, 996, 228);
  x.shadowColor = c1; x.shadowBlur = 30; x.fillStyle = c1; x.font = 'bold 128px Impact, Arial Black, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, 512, sub ? 108 : 128);
  if (sub) { x.shadowBlur = 12; x.fillStyle = '#ffe8c0'; x.font = 'bold 46px Arial, sans-serif'; x.fillText(sub, 512, 200); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export function buildProp(k, w, d, o = {}) {
  const g = new THREE.Group(), B3 = (sx, sy, sz, m, p, r) => add(g, G.box(sx, sy, sz), m, p, r);
  const wood = mat('#7a5232', { map: 'wood', r: .7 }), dark = mat('#2a2a2c', { m: .6, r: .45, map: 'metal' }), steel = mat('#8a9096', { m: .8, r: .35, map: 'metal' });
  const fab = c => mat(c, { map: 'cloth', bump: 'cloth', bs: .8, r: .95 });
  switch (k) {
    case 'sofa': { const f = fab('#5a3a3a'); B3(w, .42, d, f, [0, .21, 0]); B3(w, .5, d * .28, f, [0, .55, -d * .36]); for (const sx of [-1, 1]) B3(d * .22, .3, d, f, [sx * (w / 2 - d * .11), .55, 0]); for (let i = 0; i < 3; i++) B3(w / 3 - .04, .1, d * .65, fab('#6a4646'), [(i - 1) * w / 3, .47, d * .08]); break; }
    case 'table': { B3(w, .05, d, wood, [0, .75, 0]); for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) B3(.06, .74, .06, wood, [sx * (w / 2 - .06), .37, sz * (d / 2 - .06)]); B3(.25, .02, .18, mat('#e8e0d0'), [.1, .78, 0]); add(g, G.cyl(.04, .035, .1, 10), mat('#c8c8c8', { m: .5 }), [-.2, .83, .1]); break; }
    case 'chair': { B3(w * .9, .05, d * .9, wood, [0, .45, 0]); B3(w * .9, .5, .05, wood, [0, .72, -d * .43]); for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) B3(.04, .45, .04, wood, [sx * w * .4, .22, sz * d * .4]); break; }
    case 'tv': { B3(w * .7, .5, d * .6, wood, [0, .25, 0]); B3(w * .9, .55, .06, mat('#0a0a0a', { r: .2 }), [0, .82, 0]); const sm = new THREE.MeshBasicMaterial({ map: locustScreen() }); const sc = new THREE.Mesh(new THREE.PlaneGeometry(w * .84, .48), sm); sc.position.set(0, .82, .032); g.add(sc); break; }
    case 'rug': B3(w, .01, d, fab('#7a2a2a'), [0, .03, 0]); B3(w * .8, .012, d * .8, fab('#a8863a'), [0, .032, 0]); break;
    case 'bed': { B3(w, .3, d, wood, [0, .2, 0]); B3(w * .96, .2, d * .94, fab('#e8e4dc'), [0, .44, 0]); B3(w * .98, .12, d * .6, fab('#3a5a8a'), [0, .56, d * .18]); B3(w * .7, .12, .3, fab('#f4f2ee'), [0, .58, -d * .36]); B3(w, .8, .06, wood, [0, .45, -d / 2]); break; }
    case 'wardrobe': B3(w, 1.9, d, wood, [0, .95, 0]); B3(.01, 1.8, .01, dark, [0, .95, d / 2]); for (const sx of [-.06, .06]) B3(.03, .15, .03, steel, [sx, 1.0, d / 2 + .02]); break;
    case 'shelf': { B3(w, 1.8, d, wood, [0, .9, 0]); for (let i = 0; i < 4; i++) for (let j = 0; j < 5; j++) B3(w * .6, .25, .06, mat(['#8a2a2a', '#2a4a7a', '#3a6a3a', '#a8863a'][(i + j) % 4]), [0, .25 + i * .42, -d * .35 + j * d * .17]); break; }
    case 'fridge': B3(w, 1.75, d, mat('#e8e8e4', { r: .3, m: .2 }), [0, .88, 0]); B3(.03, .4, .03, steel, [w * .4, 1.2, d / 2 + .02]); B3(w, .01, .01, dark, [0, 1.15, d / 2]); break;
    case 'lamp': add(g, G.cyl(.02, .02, 1.4, 6), dark, [0, .7, 0]); add(g, G.cyl(.12, .2, .25, 14, 1, true), mat('#e8d8b0', { e: '#ffd090', ei: .6 }), [0, 1.45, 0]); break;
    case 'rack': { const o = mat('#e06a1a', { m: .5, r: .5 }); for (const sx of [-1, 1]) for (const sz of [-1, 1]) B3(.08, 3, .08, o, [sx * (w / 2 - .04), 1.5, sz * (d / 2 - .04)]); for (let i = 0; i < 3; i++) { B3(w, .06, d, mat('#3a6aa8', { m: .5 }), [0, .3 + i * 1.1, 0]); for (let j = 0; j < Math.floor(w / 1.1); j++) B3(.9, .7, d * .85, mat('#9a7a4a', { map: 'crate' }), [-w / 2 + .6 + j * 1.1, .7 + i * 1.1, 0]); } break; }
    case 'pallet': B3(w, .14, d, wood, [0, .07, 0]); B3(w * .9, .9, d * .85, mat('#b0a890', { map: 'cloth' }), [0, .6, 0]); break;
    case 'barrel': add(g, G.cyl(w / 2, w / 2, 1, 16), mat('#2a5a8a', { m: .5, r: .45, map: 'metal' }), [0, .5, 0]); add(g, G.tor(w / 2, .02), dark, [0, .3, 0], [Math.PI / 2, 0, 0]); add(g, G.tor(w / 2, .02), dark, [0, .7, 0], [Math.PI / 2, 0, 0]); break;
    case 'forklift': { const y = mat('#e8b820', { r: .5, m: .3 }); B3(w * .6, .8, d, y, [-w * .1, .6, 0]); B3(w * .5, .05, d * .9, dark, [-w * .15, 2, 0]); for (const sx of [-1, 1]) B3(.05, 1.6, .05, dark, [-w * .35, 1.6, sx * d * .4]); for (const sx of [-1, 1]) B3(.05, 2, .1, dark, [w * .25, 1, sx * d * .3]); for (const sz of [-1, 1]) B3(w * .4, .04, .1, dark, [w * .45, .1, sz * d * .25]); for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) add(g, G.cyl(.22, .22, .15, 12), mat('#111'), [sx * w * .25 - w * .1, .22, sz * d / 2], [Math.PI / 2, 0, 0]); break; }
    case 'labbench': { B3(w, .06, d, mat('#1a1a1a', { r: .2 }), [0, .9, 0]); B3(w, .86, d * .9, mat('#d8dcdc', { r: .4 }), [0, .43, 0]); for (let i = 0; i < Math.floor(w / .5); i++) add(g, G.cyl(.04, .06, .2, 10), new THREE.MeshPhysicalMaterial({ color: ['#6aff9a', '#6ab8ff', '#ff6a9a'][i % 3], roughness: .1, transparent: true, opacity: .65, emissive: ['#1a6a2a', '#1a3a6a', '#6a1a2a'][i % 3] }), [-w / 2 + .3 + i * .5, 1.03, 0]); B3(.4, .3, .05, mat('#111'), [w * .3, 1.1, -d * .3]); break; }
    case 'server': { B3(w, 2, d, mat('#18181c', { m: .5, r: .4 }), [0, 1, 0]); for (let i = 0; i < 8; i++) for (let j = 0; j < 3; j++) add(g, G.box(.03, .03, .01), mat(Math.random() < .6 ? '#3aff6a' : '#ff9a2a', { e: Math.random() < .6 ? '#3aff6a' : '#ff9a2a', ei: 2 }), [-w * .3 + j * .1, .3 + i * .22, d / 2 + .01]); break; }
    case 'tank': add(g, G.cyl(w / 2, w / 2, 1.8, 18), new THREE.MeshPhysicalMaterial({ color: '#7affc8', roughness: .05, transparent: true, opacity: .45, emissive: '#0a4a3a' }), [0, 1, 0]); add(g, G.cyl(w / 2 + .03, w / 2 + .03, .15, 18), steel, [0, .07, 0]); add(g, G.cyl(w / 2 + .03, w / 2 + .03, .15, 18), steel, [0, 1.95, 0]); add(g, G.sph(.25, 10, 8), mat('#5a4a40', { map: 'skin' }), [0, 1, 0], [0, 0, 0], [1, 1.6, .8]); break;
    case 'desk': B3(w, .05, d, wood, [0, .75, 0]); B3(w * .3, .72, d * .9, wood, [w * .32, .37, 0]); B3(.5, .32, .04, mat('#0a0a0a', { e: '#102a3a', ei: .6 }), [-.1, 1, -d * .25]); B3(.4, .02, .14, mat('#222'), [-.1, .79, .05]); break;
    case 'generator': { B3(w, 1.1, d, mat('#3a6a3a', { m: .4, r: .5, map: 'metal' }), [0, .55, 0]); for (let i = 0; i < 6; i++) B3(.03, .7, d * .8, dark, [-w / 2 + .3 + i * w / 7, .6, 0]); add(g, G.cyl(.1, .1, .8, 10), dark, [w * .35, 1.4, 0]); break; }
    case 'transformer': { B3(w * .8, 1.6, d * .8, mat('#6a7068', { m: .5, r: .5, map: 'metal' }), [0, .8, 0]); for (let i = -1; i <= 1; i++) { add(g, G.cyl(.08, .1, .6, 10), mat('#7a5a3a', { r: .3 }), [i * w * .25, 1.9, 0]); for (let k = 0; k < 4; k++) add(g, G.cyl(.12, .12, .03, 10), mat('#7a5a3a', { r: .3 }), [i * w * .25, 1.7 + k * .12, 0]); } B3(.3, .3, .01, mat('#f0c020', { e: '#3a2a00', ei: .3 }), [0, 1, d * .4 + .01]); break; }
    case 'panel': { B3(w, 1.9, d, mat('#8a9094', { m: .6, r: .4, map: 'metal' }), [0, .95, 0]); for (let i = 0; i < 5; i++) { B3(.02, 1.7, .01, dark, [-w / 2 + (i + 1) * w / 6, .95, d / 2 + .01]); add(g, G.sph(.02, 6, 4), mat('#f00', { e: '#f00', ei: 2 }), [-w / 2 + (i + .5) * w / 6, 1.7, d / 2 + .01]); } break; }
    case 'cable': for (let i = 0; i < 3; i++) add(g, G.tor(w * .3 - i * .1, .04), mat('#111', { r: .6 }), [0, .04 + i * .06, 0], [Math.PI / 2, 0, 0]); break;
    case 'counter': { const top = mat('#2a2a30', { m: .3, r: .25 }), front = mat('#7a1a1a', { map: 'wood', r: .6 }); B3(w, 1.0, d, front, [0, .5, 0]); B3(w + .1, .06, d + .1, top, [0, 1.03, 0]); B3(w * .9, .5, .04, new THREE.MeshPhysicalMaterial({ color: '#c8e8ff', roughness: .05, transparent: true, opacity: .25 }), [0, 1.3, d * .3]);
      const items = ['#c81e1e', '#12161a', '#f2c218', '#4a2412', '#d22a2a', '#9fd8ff']; for (let i = 0; i < Math.floor(w / .4); i++) B3(.12, .18, .12, mat(items[i % 6], { r: .4, e: items[i % 6], ei: .15 }), [-w / 2 + .25 + i * .4, 1.15, -d * .1]); break; }
    case 'register': B3(w, .9, d, mat('#3a3a40', { m: .4, r: .4 }), [0, .45, 0]); B3(w * .6, .25, d * .5, mat('#18181c', { m: .5 }), [0, 1.02, 0]); B3(w * .5, .22, .03, mat('#0a2a1a', { e: '#3aff6a', ei: 1.2 }), [0, 1.25, -d * .1], [-.3, 0, 0]); break;
    case 'mirror': { const fr = mat('#c8a040', { m: .9, r: .3 }); B3(w, 2.4, .12, fr, [0, 1.4, 0]); const mm = new THREE.MeshStandardMaterial({ color: '#dfe8f0', metalness: 1, roughness: .02, envMapIntensity: 1.5 }); add(g, G.box(w * .9, 2.2, .02), mm, [0, 1.4, .07]);
      for (let i = 0; i < 8; i++) add(g, G.sph(.05, 8, 6), mat('#fff6d0', { e: '#ffe8a0', ei: 2.5 }), [-w * .48, .5 + i * .28, .08]), add(g, G.sph(.05, 8, 6), mat('#fff6d0', { e: '#ffe8a0', ei: 2.5 }), [w * .48, .5 + i * .28, .08]); g.userData.mirror = true; break; }
    case 'booth': { const c = mat('#5a1a3a', { map: 'cloth', r: .9 }); c.side = THREE.DoubleSide; for (const sx of [-1, 1]) B3(.06, 2.4, d, mat('#2a2a2e', { m: .5 }), [sx * w / 2, 1.2, 0]); B3(w, .06, d, mat('#2a2a2e', { m: .5 }), [0, 2.4, 0]); add(g, new THREE.PlaneGeometry(w, 2.2), c, [0, 1.25, -d / 2]); break; }
    case 'pedestal': { B3(w, .9, d, mat('#1a1a1e', { m: .5, r: .3 }), [0, .45, 0]); B3(w + .1, .06, d + .1, mat('#c8a040', { m: .9, r: .3 }), [0, .92, 0]); add(g, G.cyl(w * .35, w * .35, .02, 24), mat('#ff3a3a', { e: '#ff2020', ei: 2 }), [0, .96, 0]); g.userData.statue = o.m; break; }
    case 'mannequin': { const pl = mat('#d8d4cc', { r: .4 }); add(g, G.cyl(.25, .25, .05, 20), mat('#2a2a2e', { m: .5 }), [0, .03, 0]); add(g, G.cyl(.02, .02, .9, 8), steel, [0, .5, 0]); g.userData.dress = true; break; }
    case 'storesign': { const sm = new THREE.MeshBasicMaterial({ map: signTex(o.t || 'STORE', o.s || 'ITEMS • DRESSING ROOM • SKINS', o.c || '#ff3a3a') }); add(g, new THREE.PlaneGeometry(w, w * .25), sm, [0, 3.6, 0]); add(g, new THREE.PlaneGeometry(w, w * .25), sm, [0, 3.6, -.02], [0, Math.PI, 0]); for (const sx of [-1, 1]) add(g, G.cyl(.06, .06, 3.6, 8), dark, [sx * w * .45, 1.8, 0]); g.userData.light = '#ff3a3a'; break; }
    case 'display': { const top = mat('#1a1a20', { m: .4, r: .3 }); B3(w, .95, d, mat('#3a3a44', { map: 'metal', m: .5, r: .5 }), [0, .475, 0]); B3(w + .06, .05, d + .06, top, [0, .97, 0]); B3(w * .96, .3, .02, mat('#c8e8ff', { r: .05, m: .1 }), [0, 1.15, d / 2 - .02]);
      const it = o.items || []; it.forEach((k, i) => { const m = buildItem(k); m.scale.setScalar(2.2); m.position.set((i + .5 - it.length / 2) * (w / Math.max(1, it.length)), 1.1, 0); m.rotation.set(0, Math.PI / 2, 0); g.add(m); }); break; }
    case 'dancefloor': { const cs = ['#ff3a8a', '#3a8aff', '#ffd23a', '#3aff8a', '#c03aff']; const nx = Math.max(2, Math.round(w / .8)), nz = Math.max(2, Math.round(d / .8)); g.userData.tiles = [];
      for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) { const c = cs[(i * 3 + j * 2) % cs.length]; const t = add(g, G.box(w / nx - .04, .04, d / nz - .04), mat(c, { e: c, ei: .9, r: .2 }), [(i + .5) * w / nx - w / 2, .02, (j + .5) * d / nz - d / 2]); g.userData.tiles.push(t); }
      add(g, G.sph(.35, 16, 12), mat('#e8e8f0', { m: 1, r: .08 }), [0, 3.1, 0]); break; }
    case 'petbed': { B3(w, .25, d, fab('#6a4a8a'), [0, .12, 0]); add(g, G.tor(Math.min(w, d) * .38, .09), fab('#8a6aaa'), [0, .25, 0], [Math.PI / 2, 0, 0]); const pt = buildPet(o.pet || 'puppy'); pt.scale.setScalar(1.8); pt.position.set(0, .3, 0); g.add(pt); g.userData.pet = pt; break; }
    case 'crate': { const c1 = mat('#5a2a8a', { map: 'wood', r: .6 }), gold = mat('#ffcc3a', { m: .9, r: .3 }); B3(w * .9, d * .9, d * .9, c1, [0, d * .45, 0]); B3(w * .92, .08, d * .92, gold, [0, d * .9, 0]); B3(.1, d * .91, d * .92, gold, [0, d * .45, 0]); B3(w * .92, d * .91, .1, gold, [0, d * .45, 0]);
      const q = new THREE.Mesh(new THREE.PlaneGeometry(d * .5, d * .5), new THREE.MeshBasicMaterial({ map: signTex('?', '', '#ffcc3a', '#2a0a3a'), transparent: true })); q.position.set(0, d * .5, d * .46); g.add(q); g.userData.spin = true; break; }
    case 'lobbysign': { const sm = new THREE.MeshBasicMaterial({ map: signTex('MALL →', 'CITY HELIPAD · NIGHT MALL', '#ffcc3a') }); add(g, new THREE.PlaneGeometry(w, w * .25), sm, [0, 2.2, 0]); add(g, new THREE.PlaneGeometry(w, w * .25), sm, [0, 2.2, -.02], [0, Math.PI, 0]); add(g, G.cyl(.05, .05, 2, 8), dark, [0, 1, 0]); break; }
    case 'car': { const body = mat(o.c || '#8a3030', { m: .45, r: .35, map: 'metal' }); B3(w * .92, .42, d * .92, body, [0, .48, 0]); B3(w * .55, .32, d * .55, mat('#c9d7e4', { r: .08, m: .1 }), [0, .78, -.02]); B3(w * .2, .28, d, dark, [0, .28, 0]); for (const [sx, sz] of [[-.5, -.5], [.5, -.5], [.5, .5], [-.5, .5]]) add(g, G.cyl(d * .22, d * .22, .12, 12), mat('#111'), [sx * w * .32, .22, sz * d * .28], [0, 0, Math.PI / 2]); add(g, G.box(.08, .08, .04), mat('#fff6d0', { e: '#fff1c0', ei: 1.5 }), [w * .42, .55, d * .2]); add(g, G.box(.08, .08, .04), mat('#ff3030', { e: '#ff2020', ei: 1.2 }), [-w * .42, .55, d * .2]); break; }
    case 'kiosk': { B3(w, 1.15, d, mat('#2a2418', { map: 'wood', r: .6 }), [0, .58, 0]); B3(w * 1.05, .08, d * 1.05, mat('#c9a15a', { m: .7, r: .3 }), [0, 1.18, 0]); B3(w * .7, .4, .04, mat('#1a1208', { e: '#ffd76b', ei: .35 }), [0, 1.45, d * .48]); const sm = new THREE.MeshBasicMaterial({ map: signTex('COINS', 'FREE REWARD', '#ffd76b', '#1a1208') }); add(g, new THREE.PlaneGeometry(w * .62, .28), sm, [0, 1.48, d * .52]); break; }
    case 'hay': add(g, G.cyl(Math.min(w, d) / 2, Math.min(w, d) / 2, w, 18), mat('#c8a050', { map: 'hay', bump: 'hay', r: 1 }), [0, Math.min(w, d) / 2, 0], [0, 0, Math.PI / 2]); break;
    case 'tractor': { const red = mat('#a8261a', { m: .3, r: .5, map: 'metal' }), tire = mat('#141414', { r: .9 }); B3(w * .55, 1.0, d * .6, red, [w * .15, 1.0, 0]); B3(w * .35, 1.2, d * .7, red, [-w * .2, 1.4, 0]); B3(w * .3, .05, d * .7, red, [-w * .2, 2.3, 0]);
      for (const sz of [-1, 1]) { add(g, G.cyl(.8, .8, .4, 18), tire, [-w * .25, .8, sz * d * .45], [Math.PI / 2, 0, 0]); add(g, G.cyl(.45, .45, .3, 14), tire, [w * .32, .45, sz * d * .4], [Math.PI / 2, 0, 0]); } add(g, G.cyl(.06, .06, 1, 8), dark, [w * .3, 1.9, 0]); break; }
    case 'stairs': { const st = Math.max(6, Math.round(d / .3)); for (let i = 0; i < st; i++) B3(w, .2 * (i + 1), d / st, wood, [0, .1 * (i + 1), -d / 2 + (i + .5) * d / st]); break; }
    case 'grave': { const s = mat('#6a6a6e', { map: 'stone', bump: 'stone', r: .95 }); B3(w * .8, .9, .14, s, [0, .45, 0]); add(g, G.cyl(w * .4, w * .4, .14, 16, 1, false, 0, Math.PI), s, [0, .9, 0], [Math.PI / 2, 0, Math.PI / 2]); B3(w * .9, .1, d * .9, mat('#3a3026', { map: 'dirt', r: 1 }), [0, .05, d * .2]); break; }
    case 'streetlight': { add(g, G.cyl(.07, .1, 5, 8), dark, [0, 2.5, 0]); B3(1.0, .08, .08, dark, [.45, 4.95, 0]); add(g, G.cone(.25, .25, 12), dark, [.9, 4.85, 0]); add(g, G.sph(.1, 8, 6), mat('#ffd9a0', { e: '#ffcc88', ei: 3 }), [.9, 4.72, 0]); g.userData.light = '#ffc070'; g.userData.lightPos = new THREE.Vector3(.9, 4.6, 0); break; }
    default: B3(w, .8, d, wood, [0, .4, 0]);
  }
  return g;
}

// v1.4.1: little procedural pets that follow their owner (bought in the PETS & TRAILS store)
export const PET_INFO = { puppy: ['#b07a48', '#f0e0c8'], kitty: ['#e8963a', '#fff0e0'], bat: ['#2a2230', '#5a3a4a'], ghost: ['#f0f4ff', '#c0d0ff'], dragon: ['#3aa84a', '#e8c040'], slime: ['#5aff6a', '#2a8a3a'], owl: ['#8a6a48', '#f0d8a0'], pumpkin: ['#ff8a1a', '#3a6a1a'] };
export function buildPet(k) {
  const g = new THREE.Group(), [c1, c2] = PET_INFO[k] || PET_INFO.puppy, m1 = mat(c1, { r: .8 }), m2 = mat(c2, { r: .8 }), eye = mat('#111', { r: .2 });
  if (k === 'ghost') { const gm = new THREE.MeshStandardMaterial({ color: c1, transparent: true, opacity: .75, emissive: c2, emissiveIntensity: .4 }); add(g, G.sph(.22, 14, 10), gm, [0, .35, 0]); add(g, G.cone(.22, .3, 12), gm, [0, .12, 0], [Math.PI, 0, 0]); add(g, G.sph(.04, 6, 6), eye, [-.08, .4, .19]); add(g, G.sph(.04, 6, 6), eye, [.08, .4, .19]); }
  else if (k === 'slime') { add(g, G.sph(.22, 14, 10), new THREE.MeshStandardMaterial({ color: c1, transparent: true, opacity: .8, roughness: .1 }), [0, .16, 0], [0, 0, 0], [1, .7, 1]); add(g, G.sph(.04, 6, 6), eye, [-.07, .22, .18]); add(g, G.sph(.04, 6, 6), eye, [.07, .22, .18]); }
  else if (k === 'pumpkin') { for (let i = 0; i < 6; i++) add(g, G.sph(.18, 12, 10), m1, [Math.cos(i) * .06, .18, Math.sin(i) * .06], [0, i, 0], [.7, 1, 1]); add(g, G.cyl(.03, .04, .12, 6), m2, [0, .38, 0]); const e = mat('#ffd23a', { e: '#ffaa00', ei: 2 }); add(g, G.box(.06, .05, .02), e, [-.07, .22, .19]); add(g, G.box(.06, .05, .02), e, [.07, .22, .19]); add(g, G.box(.14, .03, .02), e, [0, .12, .19]); }
  else {
    const fly = k === 'bat' || k === 'owl' || k === 'dragon';
    add(g, G.sph(.16, 12, 10), m1, [0, .2, 0], [0, 0, 0], [1, .9, 1.3]); add(g, G.sph(.13, 12, 10), m1, [0, .36, .16]); add(g, G.sph(.07, 10, 8), m2, [0, .31, .27]);
    add(g, G.sph(.03, 6, 6), eye, [-.05, .4, .27]); add(g, G.sph(.03, 6, 6), eye, [.05, .4, .27]);
    if (k === 'puppy') { add(g, G.box(.05, .12, .08), m2, [-.12, .38, .14], [0, 0, .3]); add(g, G.box(.05, .12, .08), m2, [.12, .38, .14], [0, 0, -.3]); }
    if (k === 'kitty' || k === 'owl' || k === 'bat') { add(g, G.cone(.04, .1, 6), m1, [-.07, .5, .14]); add(g, G.cone(.04, .1, 6), m1, [.07, .5, .14]); }
    if (k === 'dragon') { add(g, G.cone(.03, .12, 6), m2, [-.06, .5, .12]); add(g, G.cone(.03, .12, 6), m2, [.06, .5, .12]); }
    if (!fly) for (const [x, z] of [[-.08, .1], [.08, .1], [-.08, -.1], [.08, -.1]]) add(g, G.cyl(.03, .03, .12, 6), m1, [x, .06, z]);
    if (fly) { const wm = new THREE.MeshStandardMaterial({ color: k === 'dragon' ? c2 : c1, side: THREE.DoubleSide, roughness: .8 }); g.userData.wings = [-1, 1].map(sx => add(g, new THREE.PlaneGeometry(.32, .18), wm, [sx * .2, .26, 0], [Math.PI / 2, 0, 0])); g.userData.fly = true; }
    add(g, G.cyl(.02, .01, .2, 6), m1, [0, .22, -.25], [-.8, 0, 0]);
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); return g;
}
