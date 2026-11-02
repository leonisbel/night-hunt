// 3D models built from primitives: fan-made monsters, survivors, helicopter, props.
// Units are metres, feet at y=0, models face +Z.
import * as THREE from '../vendor/three.module.min.js';
import { tex, faceTex, glowTex } from './textures.js';

const geo = {};
const G = {
  box: (x, y, z) => geo['b' + x + y + z] || (geo['b' + x + y + z] = new THREE.BoxGeometry(x, y, z)),
  sph: (r, w = 18, h = 14, ...x) => { const k = 's' + [r, w, h, ...x]; return geo[k] || (geo[k] = new THREE.SphereGeometry(r, w, h, ...x)); },
  cyl: (a, b, h, s = 14, ...x) => { const k = 'c' + [a, b, h, s, ...x]; return geo[k] || (geo[k] = new THREE.CylinderGeometry(a, b, h, s, ...x)); },
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

const TEMPLATE = {};
export function buildMonster(kind) {
  const root = new THREE.Group(); root.userData.kind = kind;
  (B[kind] || B.freddy)(root);
  root.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); } });
  root.userData.parts = { legL: root.getObjectByName('legL'), legR: root.getObjectByName('legR'), armL: root.getObjectByName('armL'), armR: root.getObjectByName('armR'), head: root.getObjectByName('head'), body: root.getObjectByName('body'), stat: root.getObjectByName('static'), tail: root.getObjectByName('tail') };
  return root;
}
// monster skins from the lobby shop: recolour every material
const SKIN_FX = { shadow: { mul: '#2a2a32', e: '#ff1010' }, golden: { mul: '#ffd24a', m: .8, e: null }, toxic: { mul: '#7aff5a', e: '#3aff1a' }, frost: { mul: '#a8d8ff', e: '#4ac0ff' }, blood: { mul: '#ff5a5a', e: '#600000' } };
export function applySkin(root, skin) {
  const f = SKIN_FX[skin]; if (!f) return; const mul = new THREE.Color(f.mul);
  root.traverse(o => { if (!o.isMesh) return; for (const m of Array.isArray(o.material) ? o.material : [o.material]) { if (!m.color) continue; m.color.multiply(mul).lerp(mul, .25); if (f.m != null) { m.metalness = f.m; m.roughness = .3; } if (f.e && m.emissive && m.emissiveIntensity > .5) m.emissive.set(f.e); else if (f.e && skin === 'toxic' && m.emissive) { m.emissive.set('#0a3000'); m.emissiveIntensity = .5; } } });
}
// what plays on old TVs in houses: the Locust standing in front of faded floral wallpaper (it talks like a friendly child…)
let _lscr = null;
function locustScreen() {
  if (_lscr) return _lscr; const c = document.createElement('canvas'); c.width = 256; c.height = 192; const g = c.getContext('2d');
  g.fillStyle = '#9c8f5c'; g.fillRect(0, 0, 256, 192);
  for (let y = 0; y < 192; y += 24) for (let x = (y / 24 % 2) * 16; x < 256; x += 32) { g.fillStyle = '#7d7046'; g.beginPath(); for (let k = 0; k < 5; k++) { const a = k * 1.2566; g.ellipse(x + Math.cos(a) * 5, y + Math.sin(a) * 5, 4, 2.5, a, 0, 6.283); } g.fill(); g.fillStyle = '#5d6a3a'; g.fillRect(x - 1, y + 6, 2, 8); }
  for (let x = 0; x < 256; x += 40) { g.fillStyle = '#00000018'; g.fillRect(x, 0, 3, 192); }
  g.fillStyle = '#050505'; g.beginPath(); g.moveTo(98, 192); g.lineTo(108, 92); g.quadraticCurveTo(128, 76, 148, 92); g.lineTo(158, 192); g.fill(); // tall black body
  g.fillRect(122, 52, 12, 34); g.strokeStyle = '#25262a'; g.lineWidth = 4; for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(128, 58 + i * 8, 10, 3, 0, 0, 6.283); g.stroke(); }
  g.fillStyle = '#8c8682'; g.beginPath(); g.ellipse(128, 34, 13, 24, .06, 0, 6.283); g.fill(); g.fillStyle = '#000'; g.beginPath(); g.ellipse(122, 30, 3.5, 6, 0, 0, 6.283); g.ellipse(134, 29, 4.2, 7, 0, 0, 6.283); g.fill(); g.beginPath(); g.ellipse(129, 47, 4, 2, .2, 0, 6.283); g.fill();
  g.strokeStyle = '#25262a'; g.lineWidth = 3; g.beginPath(); g.ellipse(128, 30, 17, 9, .5, 0, 6.283); g.stroke(); g.beginPath(); g.ellipse(128, 36, 16, 8, -.4, 0, 6.283); g.stroke();
  const im = g.getImageData(0, 0, 256, 192); for (let i = 0; i < im.data.length; i += 4) { const n = (Math.random() - .5) * 40, row = (i / 4 / 256 | 0) % 3 === 0 ? .82 : 1; for (let k = 0; k < 3; k++) im.data[i + k] = Math.max(0, Math.min(255, im.data[i + k] * row + n)); } g.putImageData(im, 0, 0);
  g.fillStyle = '#fff'; g.font = 'bold 12px monospace'; g.fillText('"come play with me!"', 58, 182);
  _lscr = new THREE.CanvasTexture(c); _lscr.colorSpace = THREE.SRGBColorSpace; return _lscr;
}
export function monsterHeight(kind) { return { sirenhead: 7.7, cartooncat: 3.7, locust: 3.75, dn_conezone: 4.3, dn_sixarm: 4.5, sonicexe: 2.1 }[kind] || 2.8; }
export const DN_MODELS = ['drnowhere', 'dn_conezone', 'dn_nightmare', 'dn_sixarm'];
export function modelKey(mt, fm) { return mt === 'drnowhere' ? DN_MODELS[fm || 0] : mt; }

// ---------- realistic survivor (≈1.78 m, articulated hips/knees/shoulders/elbows) ----------
const SKINS = ['#f1c7a5', '#e0ac85', '#c68863', '#9c6644', '#6e4630', '#f6d5b8'];
const HAIRS = ['#2a1c12', '#5a3a1e', '#151210', '#8a5a2a', '#c09050', '#3a2a22'];
function hashStr(s) { let h = 7; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; }
function seg(parent, len, r0, r1, m, y0 = 0) { // tapered limb segment hanging down from y0
  const o = add(parent, G.cap(Math.max(r0, r1), Math.max(.01, len - Math.max(r0, r1) * 2)), m, [0, y0 - len / 2, 0]);
  o.scale.set(1, 1, r1 / r0 > 1 ? 1 : .92); return o;
}
export function parseLook(str) { const [sk, hc, hs, top, pants, hat, acc] = String(str || '').split(','); return { sk: +sk || 0, hc: +hc || 0, hs: +hs || 0, top: top || null, pants: pants || null, hat: hat || 'none', acc: acc || 'none' }; }
export function buildSurvivor(color, look) {
  const L = typeof look === 'string' ? parseLook(look) : (look || parseLook('')), h = hashStr(color), root = new THREE.Group();
  if (L.top) color = L.top;
  const skin = mat(SKINS[L.sk % SKINS.length], { r: .62 });
  const jacket = mat(color, { map: 'cloth', bump: 'cloth', bs: .6, r: .88 });
  const jacketDark = mat(new THREE.Color(color).multiplyScalar(.55), { map: 'cloth', r: .9 });
  const jeans = mat(L.pants || ['#2c3e60', '#3a3a3a', '#4a4030', '#25303f'][h % 4], { map: 'cloth', bump: 'cloth', bs: .5, r: .92 });
  const shoe = mat('#1c1a18', { r: .6 }), sole = mat('#d8d2c4', { r: .7 }), hair = mat(HAIRS[L.hc % HAIRS.length], { map: 'fur', r: .9 });
  const strap = mat('#2a2622', { r: .7 }), pack = mat(['#3d4a2e', '#5a2a22', '#22303e', '#4a3a28'][(h >> 5) % 4], { map: 'cloth', r: .9 });
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
  add(torso, G.cyl(.05, .055, .1, 10), skin, [0, .56, 0]);
  const head = grp(torso, [0, .66, .005], 'head');
  add(head, G.sph(.105, 20, 16), skin, [0, .02, 0], [0, 0, 0], [.92, 1.12, 1]);
  add(head, G.sph(.07, 14, 10), skin, [0, -.05, .03], [0, 0, 0], [1.05, .8, 1]); // jaw
  add(head, G.sph(.025, 8, 6), skin, [0, .0, .1], [0, 0, 0], [.8, 1, 1.1]); // nose
  for (const sx of [-.1, .1]) add(head, G.sph(.026, 8, 6), skin, [sx * .95, .01, -.005], [0, 0, 0], [.5, 1, .8]); // ears
  const white = mat('#f4f1ea', { r: .3 }), iris = mat(['#3a2a1a', '#3a6a8a', '#4a6a3a', '#2a1a10'][(h >> 7) % 4], { r: .2 });
  for (const sx of [-.037, .037]) {
    add(head, G.sph(.017, 10, 8), white, [sx, .035, .085]); add(head, G.sph(.009, 8, 6), iris, [sx, .035, .1]);
    add(head, G.box(.038, .009, .012), hair, [sx, .062, .094], [0, 0, sx > 0 ? -.12 : .12]); // brows
  }
  add(head, G.box(.04, .008, .01), mat('#8a4a40', { r: .5 }), [0, -.045, .097]); // mouth
  const style = L.hs; // 0 short, 1 long, 2 ponytail/bun, 3 buzz
  if (style !== 3) add(head, G.sph(.112, 18, 12, 0, Math.PI * 2, 0, Math.PI * .55), hair, [0, .03, -.005], [-.15, 0, 0], [.95, 1.08, 1.04]);
  else add(head, G.sph(.108, 18, 12, 0, Math.PI * 2, 0, Math.PI * .45), hair, [0, .03, -.005], [-.15, 0, 0], [.95, 1.08, 1.02]);
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
  };
  hats[L.hat]?.();
  const accs = {
    glasses: () => { const m = mat('#111', { m: .5, r: .3 }); for (const sx of [-.037, .037]) add(head, G.tor(.022, .004), m, [sx, .035, .104]); add(head, G.box(.03, .004, .004), m, [0, .04, .105]); },
    scarf: () => { add(torso, G.tor(.08, .035), mat('#b02a2a', { map: 'cloth' }), [0, .53, 0], [Math.PI / 2, 0, 0]); add(torso, G.box(.05, .18, .02), mat('#b02a2a', { map: 'cloth' }), [.04, .42, .1]); },
    mask: () => add(head, G.sph(.08, 12, 8, 0, Math.PI * 2, Math.PI * .5, Math.PI * .5), mat('#e8e8e8', { r: .7 }), [0, -.01, .04], [-.3, 0, 0], [1.1, 1, 1]),
    goggles: () => { add(head, G.tor(.11, .01), mat('#222'), [0, .06, 0], [Math.PI / 2, 0, 0]); for (const sx of [-.04, .04]) add(head, G.cyl(.025, .025, .02, 12), mat('#4a8aaa', { r: .1, m: .4 }), [sx, .07, .1], [Math.PI / 2, 0, 0]); },
  };
  accs[L.acc]?.();
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

// ---------- furniture & facility props, sized to a footprint (w along X, d along Z, metres) ----------
export function buildProp(k, w, d) {
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
    default: B3(w, .8, d, wood, [0, .4, 0]);
  }
  return g;
}
