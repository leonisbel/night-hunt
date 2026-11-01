// 3D models built from primitives: 12 fan-made monsters, survivors, helicopter, props.
// Units are metres, feet at y=0, models face +Z.
import * as THREE from '../vendor/three.module.min.js';
import { tex, faceTex, glowTex } from './textures.js';

const geo = {};
const G = {
  box: (x, y, z) => geo['b' + x + y + z] || (geo['b' + x + y + z] = new THREE.BoxGeometry(x, y, z)),
  sph: (r, w = 18, h = 14) => geo['s' + r + w] || (geo['s' + r + w] = new THREE.SphereGeometry(r, w, h)),
  cyl: (a, b, h, s = 14) => geo['c' + a + b + h + s] || (geo['c' + a + b + h + s] = new THREE.CylinderGeometry(a, b, h, s)),
  cone: (r, h, s = 12) => geo['k' + r + h + s] || (geo['k' + r + h + s] = new THREE.ConeGeometry(r, h, s)),
  cap: (r, l) => geo['p' + r + l] || (geo['p' + r + l] = new THREE.CapsuleGeometry(r, l, 6, 12)),
  tor: (r, t) => geo['t' + r + t] || (geo['t' + r + t] = new THREE.TorusGeometry(r, t, 8, 24)),
};
export { G };

function mat(color, o = {}) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: o.r ?? .75, metalness: o.m ?? 0, flatShading: !!o.flat });
  if (o.map) { m.map = tex(o.map, o.rep || 1); }
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
  add(piv, G.cyl(r, r * .85, len), m, [0, -len / 2, 0]);
  if (joint) add(piv, G.sph(r * 1.15, 10, 8), joint, [0, -len, 0]);
  if (lower) { const low = grp(piv, [0, -len, 0]); add(low, G.cyl(r * .85, r * .7, lower), m, [0, -lower / 2, 0]); piv.userData.low = low; }
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
  const a = animatronic(r, { body: '#6f7a3a', belly: '#9c9862', eye: '#e8e8d8', eyeGlow: 1.4 });
  add(a.head, G.cap(.075, .5), a.fur, [-.15, .62, -.05], [0, 0, -.1]);
  const bent = grp(a.head, [.15, .4, -.05]); bent.rotation.z = -1.1; add(bent, G.cap(.075, .45), a.fur, [0, .25, 0]);
  const wire = mat('#2a2a2a', { r: .5 }), hole = mat('#1a120c', { r: 1 });
  for (const [x, y] of [[.25, 1.6], [-.2, 1.2], [.1, 1.3]]) { add(a.body, G.sph(.09, 10, 8), hole, [x, y, .4]); add(a.body, G.cyl(.012, .012, .3, 4), wire, [x, y - .1, .42], [.3, 0, .5]); }
  add(a.head, G.sph(.07, 8, 6), hole, [-.25, .02, .3]); add(a.head, G.box(.4, .03, .02), a.endo, [0, -.14, .53]);
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
  const grin = new THREE.Mesh(new THREE.SphereGeometry(.5, 24, 12, Math.PI * .1, Math.PI * .8, Math.PI * .52, Math.PI * .2), wht);
  grin.position.set(0, .02, .02); grin.scale.set(1.2, 1, 1.02); head.add(grin);
  for (let i = -6; i <= 6; i++) add(head, G.box(.015, .14, .02), blk, [i * .07, -.16, .5 - Math.abs(i) * .012]);
};
B.sirenhead = r => {
  const skin = mat('#5e4634', { map: 'skin', bump: 'skin', bs: 3, r: .95, flat: true });
  const metal = mat('#5a5a5a', { map: 'metal', m: .7, r: .5 });
  const body = grp(r, [0, 0, 0], 'body');
  const legL = limb(body, [-.25, 3.1, 0], 1.6, .1, skin, skin, 1.5); legL.name = 'legL';
  const legR = limb(body, [.25, 3.1, 0], 1.6, .1, skin, skin, 1.5); legR.name = 'legR';
  add(body, G.cyl(.32, .2, 1.9, 9), skin, [0, 4.0, 0], [0, 0, 0], [1, 1, .65]);
  for (let i = 0; i < 5; i++) add(body, G.tor(.28, .03), skin, [0, 4.2 + i * .14, 0], [Math.PI / 2, 0, 0], [1, .65, 1]); // ribs
  const armL = limb(body, [-.38, 4.85, 0], 1.6, .07, skin, skin, 1.6); armL.name = 'armL'; armL.rotation.z = -.12;
  const armR = limb(body, [.38, 4.85, 0], 1.6, .07, skin, skin, 1.6); armR.name = 'armR'; armR.rotation.z = .12;
  for (const a of [armL, armR]) for (let i = -1; i <= 1; i++) add(a.userData.low, G.cyl(.02, .012, .35, 5), skin, [i * .04, -1.75, 0]);
  const head = grp(body, [0, 5.0, 0], 'head');
  add(head, G.cyl(.08, .1, 1.6, 8), metal, [0, .8, 0]);
  add(head, G.box(1.6, .1, .1), metal, [0, 1.45, 0]);
  const cone = mat('#141414', { r: .9 }), grill = mat('#8b8b85', { map: 'metal', m: .6, r: .5 });
  for (const sx of [-.62, .62]) {
    add(head, G.box(.62, .55, .5), grill, [sx, 1.5, .05]);
    add(head, G.cyl(.24, .12, .12, 16), cone, [sx, 1.5, .3], [Math.PI / 2, 0, 0]);
    add(head, G.cyl(.06, .06, .02, 10), metal, [sx, 1.5, .37], [Math.PI / 2, 0, 0]);
  }
};
B.boiledone = r => {
  const flesh = mat('#5a0c0a', { map: 'skin', bump: 'skin', bs: 4, r: .22, m: .1, e: '#2a0000', ei: .6 });
  const body = grp(r, [0, 0, 0], 'body');
  const legL = limb(body, [-.22, 1.0, 0], .55, .14, flesh, flesh, .45); legL.name = 'legL';
  const legR = limb(body, [.22, 1.0, 0], .55, .14, flesh, flesh, .45); legR.name = 'legR';
  add(body, G.sph(.5, 14, 10), flesh, [0, 1.5, 0], [0, 0, 0], [1, 1.25, .85]);
  for (let i = 0; i < 14; i++) { const a = i * 2.4, y = 1.1 + (i % 7) * .14; add(body, G.sph(.08 + (i % 3) * .04, 8, 6), flesh, [Math.cos(a) * .42, y, Math.sin(a) * .34]); }
  const armL = limb(body, [-.55, 1.9, 0], .6, .1, flesh, flesh, .6); armL.name = 'armL';
  const armR = limb(body, [.55, 1.9, 0], .6, .1, flesh, flesh, .6); armR.name = 'armR';
  const head = grp(body, [0, 2.35, 0], 'head');
  add(head, G.sph(.36, 14, 10), flesh, [0, 0, 0], [0, 0, 0], [1, 1.05, .95]);
  const eye = mat('#ffffff', { e: '#ffffff', ei: 3 });
  for (const sx of [-.12, .12]) { add(head, G.sph(.035, 8, 6), eye, [sx, .05, .33]); glow(head, '#ffdddd', [sx, .05, .36], .2); }
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
  const chitin = mat('#0e0e10', { r: .25, m: .4 });
  const body = grp(r, [0, 0, 0], 'body');
  const legL = limb(body, [-.18, 1.05, 0], .55, .07, chitin, chitin, .5); legL.name = 'legL';
  const legR = limb(body, [.18, 1.05, 0], .55, .07, chitin, chitin, .5); legR.name = 'legR';
  for (let i = 0; i < 4; i++) add(body, G.sph(.22 - i * .02, 12, 8), chitin, [0, 1.2 + i * .25, 0], [0, 0, 0], [1, .8, .75]);
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) { const a = limb(body, [sx * .2, 1.85 - i * .25, 0], .45, .03, chitin, chitin, .5); a.rotation.z = sx * (1.1 - i * .25); a.rotation.x = -.4; if (i === 0) a.name = sx < 0 ? 'armL' : 'armR'; }
  const head = grp(body, [0, 2.3, 0], 'head');
  add(head, G.sph(.22, 14, 10), chitin, [0, 0, .02], [0, 0, 0], [1, 1.2, 1.1]);
  const eye = mat('#d4ff3a', { e: '#d4ff3a', ei: 3 });
  for (const sx of [-.1, .1]) { add(head, G.sph(.06, 10, 8), eye, [sx, .05, .2], [0, 0, 0], [1, .7, .6]); glow(head, '#d4ff3a', [sx, .05, .26], .3); }
  for (const sx of [-1, 1]) { const ant = grp(head, [sx * .06, .2, .05]); ant.rotation.z = -sx * .4; ant.rotation.x = .5; add(ant, G.cyl(.008, .005, .9, 4), chitin, [0, .45, 0]); }
  // static lines that flicker
  const st = mat('#dddddd', { e: '#ffffff', ei: 1.5 }); st.transparent = true; st.opacity = .5;
  const stat = grp(body, [0, 0, 0], 'static'); for (let i = 0; i < 8; i++) add(stat, G.box(.5, .012, .01), st, [(Math.random() - .5) * .2, 1 + i * .18, .25]);
};
B.monochrome = r => {
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
  const legL = limb(body, [-.2, 1.15, 0], .65, .1, skin, skin, .6); legL.name = 'legL';
  const legR = limb(body, [.2, 1.15, 0], .65, .1, skin, skin, .6); legR.name = 'legR';
  add(body, G.cap(.28, .7), skin, [0, 1.7, 0], [0, 0, 0], [1, 1, .7]);
  const armL = limb(body, [-.38, 2.15, 0], .75, .07, skin, skin, .8); armL.name = 'armL';
  const armR = limb(body, [.38, 2.15, 0], .75, .07, skin, skin, .8); armR.name = 'armR';
  for (const a of [armL, armR]) for (let i = -1; i <= 1; i++) add(a.userData.low, G.cone(.025, .3, 5), skin, [i * .04, -.95, 0], [Math.PI, 0, 0]);
  const head = grp(body, [0, 2.45, 0], 'head');
  add(head, G.sph(.18, 14, 10), inner, [0, 0, .05]);
  head.userData.petals = [];
  for (let i = 0; i < 5; i++) {
    const p = grp(head, [0, 0, .05]); p.rotation.z = i * Math.PI * 2 / 5;
    const hinge = grp(p, [0, .1, 0]); head.userData.petals.push(hinge);
    add(hinge, G.sph(.2, 12, 8), skin, [0, .22, 0], [0, 0, 0], [.75, 1.3, .25]);
    add(hinge, G.sph(.18, 12, 8), inner, [0, .22, .03], [0, 0, 0], [.6, 1.15, .18]);
    for (let k = 0; k < 4; k++) add(hinge, G.cone(.02, .08, 5), tooth, [(k - 1.5) * .06, .2 + Math.abs(k - 1.5) * .05, .07], [Math.PI / 2, 0, 0]);
  }
};

const TEMPLATE = {};
export function buildMonster(kind) {
  const root = new THREE.Group(); root.userData.kind = kind;
  (B[kind] || B.freddy)(root);
  root.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); } });
  root.userData.parts = { legL: root.getObjectByName('legL'), legR: root.getObjectByName('legR'), armL: root.getObjectByName('armL'), armR: root.getObjectByName('armR'), head: root.getObjectByName('head'), body: root.getObjectByName('body'), stat: root.getObjectByName('static'), tail: root.getObjectByName('tail') };
  return root;
}
export function monsterHeight(kind) { return { sirenhead: 7.2, cartooncat: 3.7 }[kind] || 2.8; }

export function buildSurvivor(color) {
  const root = new THREE.Group();
  const shirt = mat(color, { map: 'cloth', r: .85 }), jeans = mat('#2c3e60', { map: 'cloth', r: .9 }), skin = mat('#f2c94c', { r: .55 });
  const body = grp(root, [0, 0, 0], 'body');
  const legL = grp(body, [-.13, .82, 0], 'legL'); add(legL, G.box(.24, .8, .26), jeans, [0, -.4, 0]); add(legL, G.box(.25, .1, .32), mat('#222'), [0, -.78, .03]);
  const legR = grp(body, [.13, .82, 0], 'legR'); add(legR, G.box(.24, .8, .26), jeans, [0, -.4, 0]); add(legR, G.box(.25, .1, .32), mat('#222'), [0, -.78, .03]);
  add(body, G.box(.55, .7, .3), shirt, [0, 1.17, 0]);
  const armL = grp(body, [-.38, 1.48, 0], 'armL'); add(armL, G.box(.2, .3, .24), shirt, [0, -.12, 0]); add(armL, G.box(.18, .42, .2), skin, [0, -.46, 0]);
  const armR = grp(body, [.38, 1.48, 0], 'armR'); add(armR, G.box(.2, .3, .24), shirt, [0, -.12, 0]); add(armR, G.box(.18, .42, .2), skin, [0, -.46, 0]);
  armR.rotation.x = -1.2; // holding the flashlight forward
  const fl = grp(armR, [0, -.66, .04], 'flash'); add(fl, G.cyl(.05, .05, .22, 10), mat('#333', { m: .7, r: .35 }), [0, 0, 0]);
  const lens = add(fl, G.cyl(.06, .06, .02, 10), mat('#fff8d8', { e: '#fff3c4', ei: 4 }), [0, -.12, 0]); lens.name = 'lens';
  const head = grp(body, [0, 1.55, 0], 'head');
  const faceMats = [skin, skin, skin, skin, new THREE.MeshStandardMaterial({ map: faceTex(false), roughness: .55 }), skin];
  const h = add(head, G.box(.44, .44, .44), faceMats, [0, .24, 0]); h.name = 'headMesh';
  add(head, G.box(.47, .1, .47), mat('#3a2a1a', { r: .9 }), [0, .46, 0]); // hair
  root.traverse(o => { if (o.isMesh && !Array.isArray(o.material)) o.material = o.material.clone(); });
  root.userData.parts = { legL, legR, armL, armR, head, body, flash: fl };
  root.userData.faceMats = faceMats;
  return root;
}

export function buildHelicopter(color = '#2d4a34') {
  const root = new THREE.Group();
  const paint = mat(color, { map: 'metal', m: .55, r: .45 }), dark = mat('#1a1a1a', { m: .6, r: .4 });
  const glass = new THREE.MeshPhysicalMaterial({ color: '#9fc9e8', roughness: .05, metalness: 0, transmission: .0, transparent: true, opacity: .45, envMapIntensity: 1 });
  add(root, G.sph(1.6, 24, 16), paint, [0, 2.2, .3], [0, 0, 0], [1, .9, 1.7]);
  add(root, G.sph(1.45, 24, 16), glass, [0, 2.45, 1.4], [0, 0, 0], [.92, .75, 1.05]);
  add(root, G.cyl(.35, .22, 5.2, 12), paint, [0, 2.6, -3.6], [Math.PI / 2 + .06, 0, 0]);
  add(root, G.box(.12, 1.4, .9), paint, [0, 3.3, -6.0], [-.25, 0, 0]);
  add(root, G.box(1.4, .08, .5), paint, [0, 2.7, -5.6]);
  for (const sx of [-1.15, 1.15]) {
    add(root, G.cyl(.08, .08, 4.6, 8), dark, [sx, .2, .3], [Math.PI / 2, 0, 0]);
    add(root, G.cyl(.06, .06, .9, 6), dark, [sx * .9, .65, 1.4], [0, 0, sx * .25]); add(root, G.cyl(.06, .06, .9, 6), dark, [sx * .9, .65, -.8], [0, 0, sx * .25]);
  }
  add(root, G.cyl(.25, .3, .5, 12), dark, [0, 3.8, .2]);
  const rotor = grp(root, [0, 4.1, .2], 'rotor');
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; add(rotor, G.box(.32, .04, 6.2), dark, [Math.sin(a) * 3.1, 0, Math.cos(a) * 3.1], [0, a, 0]); }
  const tail = grp(root, [.12, 3.4, -6.1], 'tailrotor');
  add(tail, G.box(.03, 1.3, .14), dark); add(tail, G.box(.03, .14, 1.3), dark);
  const red = glow(root, '#ff2020', [-1.5, 2.2, .5], .6), green = glow(root, '#20ff40', [1.5, 2.2, .5], .6), white = glow(root, '#ffffff', [0, 3.6, -6.4], .5);
  root.userData.navs = [red, green, white];
  root.userData.rotor = rotor; root.userData.tail = tail;
  return root;
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
