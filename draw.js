// Stylized fan-made character drawings (front-facing "billboard" sprites), unit = radius s
const D = {};
function circ(c, x, y, r, f, st, lw) { c.beginPath(); c.arc(x, y, r, 0, 7); if (f) { c.fillStyle = f; c.fill(); } if (st) { c.strokeStyle = st; c.lineWidth = lw || 2; c.stroke(); } }
function ell(c, x, y, rx, ry, f, rot) { c.beginPath(); c.ellipse(x, y, rx, ry, rot || 0, 0, 7); c.fillStyle = f; c.fill(); }
function rect(c, x, y, w, h, f) { c.fillStyle = f; c.fillRect(x, y, w, h); }
function glowEyes(c, s, y, col, sp, r) { c.save(); c.shadowColor = col; c.shadowBlur = 10; circ(c, -sp * s, y * s, r * s, col); circ(c, sp * s, y * s, r * s, col); c.restore(); }
function animatronic(c, s, t, body, belly, opt) {
  const bob = Math.sin(t * 6) * s * .04;
  c.translate(0, bob);
  ell(c, 0, s * .55, s * .75, s * .6, body);              // body
  ell(c, 0, s * .6, s * .45, s * .4, belly);
  if (opt.ears) opt.ears();
  circ(c, 0, -s * .3, s * .62, body);                     // head
  ell(c, 0, -s * .08, s * .38, s * .25, belly);           // muzzle
  if (opt.beak) { c.beginPath(); c.moveTo(-s * .25, -s * .1); c.lineTo(s * .25, -s * .1); c.lineTo(0, s * .15); c.fillStyle = '#f39c12'; c.fill(); }
  else circ(c, 0, -s * .18, s * .09, '#111');              // nose
  circ(c, -s * .24, -s * .45, s * .13, '#fff'); circ(c, s * .24, -s * .45, s * .13, '#fff');
  circ(c, -s * .24, -s * .45, s * .06, opt.eye || '#111'); if (!opt.patch) circ(c, s * .24, -s * .45, s * .06, opt.eye || '#111');
  if (opt.patch) { rect(c, s * .1, -s * .58, s * .3, s * .25, '#111'); c.strokeStyle = '#111'; c.lineWidth = 2; c.beginPath(); c.moveTo(-s * .6, -s * .7); c.lineTo(s * .6, -s * .4); c.stroke(); }
  c.fillStyle = '#eee'; for (let i = -3; i <= 3; i++) rect(c, i * s * .08 - s * .03, s * .05, s * .06, s * .08, opt.teeth || '#eee');
  if (opt.extra) opt.extra();
}
D.freddy = (c, s, t) => animatronic(c, s, t, '#7a4a22', '#c8955d', {
  ears: () => { circ(c, -s * .5, -s * .8, s * .2, '#7a4a22'); circ(c, s * .5, -s * .8, s * .2, '#7a4a22'); },
  extra: () => { rect(c, -s * .35, -s * 1.08, s * .7, s * .12, '#111'); rect(c, -s * .22, -s * 1.42, s * .44, s * .36, '#111');
    c.fillStyle = '#111'; c.beginPath(); c.moveTo(-s * .2, s * .22); c.lineTo(0, s * .3); c.lineTo(-s * .2, s * .38); c.moveTo(s * .2, s * .22); c.lineTo(0, s * .3); c.lineTo(s * .2, s * .38); c.fill(); } });
D.bonnie = (c, s, t) => animatronic(c, s, t, '#5b5bbd', '#b9a7e8', { eye: '#c0392b',
  ears: () => { ell(c, -s * .3, -s * 1.15, s * .14, s * .5, '#5b5bbd', -.15); ell(c, s * .3, -s * 1.15, s * .14, s * .5, '#5b5bbd', .15); },
  extra: () => { c.fillStyle = '#c0392b'; c.beginPath(); c.moveTo(-s * .2, s * .22); c.lineTo(0, s * .3); c.lineTo(-s * .2, s * .38); c.moveTo(s * .2, s * .22); c.lineTo(0, s * .3); c.lineTo(s * .2, s * .38); c.fill();
    rect(c, s * .4, s * .3, s * .5, s * .16, '#c0392b'); } });
D.chica = (c, s, t) => animatronic(c, s, t, '#f1c40f', '#f7e08a', { beak: true, eye: '#8e44ad',
  ears: () => { ell(c, 0, -s * 1, s * .08, s * .2, '#f1c40f'); },
  extra: () => { rect(c, -s * .35, s * .35, s * .7, s * .4, '#fff'); c.fillStyle = '#e74c3c'; c.font = `bold ${s * .17}px sans-serif`; c.textAlign = 'center'; c.fillText("LET'S EAT", 0, s * .6);
    circ(c, s * .75, s * .3, s * .17, '#ff7ab6'); circ(c, s * .7, s * .26, s * .04, '#fff'); circ(c, s * .8, s * .26, s * .04, '#fff'); } });
D.foxy = (c, s, t) => animatronic(c, s, t, '#b03a2e', '#d98c6c', { patch: true, eye: '#f1c40f', teeth: '#ddd',
  ears: () => { c.fillStyle = '#b03a2e'; c.beginPath(); c.moveTo(-s * .55, -s * .6); c.lineTo(-s * .45, -s * 1.15); c.lineTo(-s * .2, -s * .75); c.moveTo(s * .55, -s * .6); c.lineTo(s * .45, -s * 1.15); c.lineTo(s * .2, -s * .75); c.fill(); },
  extra: () => { c.strokeStyle = '#ccc'; c.lineWidth = s * .08; c.beginPath(); c.arc(s * .85, s * .3, s * .18, Math.PI, Math.PI * 2.6); c.stroke(); } });
D.springtrap = (c, s, t) => animatronic(c, s, t, '#7d8c3c', '#a9a86a', { eye: '#ddd', teeth: '#e8e2c0',
  ears: () => { ell(c, -s * .28, -s * 1.1, s * .12, s * .45, '#7d8c3c', -.2); ell(c, s * .35, -s * .95, s * .12, s * .4, '#6a7a30', .6); },
  extra: () => { circ(c, s * .3, s * .5, s * .12, '#3a2a1a'); c.strokeStyle = '#4a2a1a'; c.lineWidth = 1.5; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-s * .5 + i * .3 * s, s * .2); c.lineTo(-s * .4 + i * .3 * s, s * .4); c.stroke(); } } });
D.cartooncat = (c, s, t) => {
  const w = Math.sin(t * 4) * .15;
  c.strokeStyle = '#000'; c.lineWidth = s * .14; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-s * .3, s * .2); c.quadraticCurveTo(-s * 1.2, s * (.2 + w), -s * 1.4, s * 1.1); c.moveTo(s * .3, s * .2); c.quadraticCurveTo(s * 1.2, s * (.2 - w), s * 1.4, s * 1.1); c.stroke();
  circ(c, -s * 1.4, s * 1.15, s * .17, '#fff', '#000', 2); circ(c, s * 1.4, s * 1.15, s * .17, '#fff', '#000', 2);
  ell(c, 0, s * .5, s * .35, s * .55, '#000');
  c.fillStyle = '#000'; c.beginPath(); c.moveTo(-s * .6, -s * .5); c.lineTo(-s * .55, -s * 1.2); c.lineTo(-s * .15, -s * .8); c.moveTo(s * .6, -s * .5); c.lineTo(s * .55, -s * 1.2); c.lineTo(s * .15, -s * .8); c.fill();
  ell(c, 0, -s * .35, s * .7, s * .55, '#000');
  ell(c, -s * .28, -s * .5, s * .2, s * .26, '#fff'); ell(c, s * .28, -s * .5, s * .2, s * .26, '#fff');
  circ(c, -s * .24, -s * .45, s * .07, '#000'); circ(c, s * .24, -s * .45, s * .07, '#000');
  c.fillStyle = '#fff'; c.beginPath(); c.moveTo(-s * .62, -s * .2); c.quadraticCurveTo(0, s * .45, s * .62, -s * .2); c.quadraticCurveTo(0, s * .05, -s * .62, -s * .2); c.fill();
  c.strokeStyle = '#000'; c.lineWidth = 1.5; for (let i = -4; i <= 4; i++) { c.beginPath(); c.moveTo(i * s * .12, -s * .1); c.lineTo(i * s * .12, s * .1 - Math.abs(i) * s * .03); c.stroke(); }
};
D.sirenhead = (c, s, t) => {
  const sw = Math.sin(t * 2) * s * .05;
  c.strokeStyle = '#6b4f3a'; c.lineCap = 'round'; c.lineWidth = s * .12;
  c.beginPath(); c.moveTo(-s * .15, s * .2); c.lineTo(-s * .25 + sw, s * 1.1); c.moveTo(s * .15, s * .2); c.lineTo(s * .25 - sw, s * 1.1);
  c.moveTo(-s * .15, -s * .3); c.lineTo(-s * .7, s * .7); c.moveTo(s * .15, -s * .3); c.lineTo(s * .7, s * .7); c.stroke();
  ell(c, 0, -s * .1, s * .22, s * .55, '#7a5c45');
  c.lineWidth = s * .08; c.strokeStyle = '#555'; c.beginPath(); c.moveTo(0, -s * .6); c.lineTo(0, -s * 1.5); c.moveTo(-s * .5, -s * 1.3); c.lineTo(s * .5, -s * 1.3); c.stroke();
  for (const dx of [-.5, .5]) { rect(c, dx * s - s * .28, -s * 1.6, s * .56, s * .5, '#8a8a8a'); circ(c, dx * s, -s * 1.35, s * .2, '#333'); circ(c, dx * s, -s * 1.35, s * .1, '#111'); }
};
D.boiledone = (c, s, t) => {
  const j = () => (Math.random() - .5) * s * .05;
  c.save(); c.shadowColor = '#f00'; c.shadowBlur = 14;
  ell(c, j(), s * .5, s * .45, s * .7, '#3b0808'); circ(c, j(), -s * .4, s * .45, '#4a0a0a');
  c.restore();
  c.strokeStyle = '#2a0505'; c.lineWidth = s * .14; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-s * .35, s * .1); c.lineTo(-s * .7, s * 1); c.moveTo(s * .35, s * .1); c.lineTo(s * .7, s * 1); c.stroke();
  circ(c, -s * .16, -s * .45, s * .06, '#fff'); circ(c, s * .16, -s * .45, s * .06, '#fff');
  c.fillStyle = '#7a0000'; for (let i = 0; i < 6; i++) circ(c, (Math.sin(i * 7 + t) * .4) * s, (Math.cos(i * 3) * .6 + .3) * s, s * .05, '#8b0000');
};
D.drnowhere = (c, s, t) => {
  ell(c, 0, s * .55, s * .6, s * .65, '#e8e8e8'); rect(c, -s * .05, s * .05, s * .1, s * 1, '#bbb');
  rect(c, -s * .15, s * .1, s * .3, s * .08, '#111');
  circ(c, 0, -s * .35, s * .55, '#f0e6d2');
  c.save(); c.shadowColor = '#000'; c.shadowBlur = 6; ell(c, -s * .2, -s * .45, s * .12, s * .18, '#000'); ell(c, s * .2, -s * .45, s * .12, s * .18, '#000'); c.restore();
  c.strokeStyle = '#000'; c.lineWidth = 2; c.beginPath(); c.arc(0, -s * .3, s * .32, .2, Math.PI - .2); c.stroke();
  c.beginPath(); c.moveTo(s * .1, -s * .9); c.lineTo(s * .2, -s * .6); c.lineTo(s * .05, -s * .45); c.stroke(); // crack
  rect(c, -s * .4, -s * 1.02, s * .8, s * .14, '#ddd'); circ(c, 0, -s * .95, s * .1, '#c0392b');
};
D.locust = (c, s, t) => {
  c.globalAlpha *= .9 + Math.sin(t * 30) * .1;
  c.strokeStyle = '#111'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(-s * .15, -s * .8); c.quadraticCurveTo(-s * .5, -s * 1.6, -s * .9, -s * 1.5); c.moveTo(s * .15, -s * .8); c.quadraticCurveTo(s * .5, -s * 1.6, s * .9, -s * 1.5); c.stroke();
  ell(c, 0, s * .45, s * .4, s * .8, '#151515'); ell(c, 0, -s * .45, s * .38, s * .45, '#1c1c1c');
  for (let i = 0; i < 14; i++) rect(c, (Math.random() - .5) * s * 1.6, (Math.random() - .5) * s * 2.4, s * .2, 2, Math.random() < .5 ? '#ddd' : '#666');
  glowEyes(c, s, -.5, '#d4ff3a', .15, .09);
  c.strokeStyle = '#151515'; c.lineWidth = s * .08; for (const k of [-1, 1]) for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(k * s * .3, s * (.1 + i * .3)); c.lineTo(k * s * .9, s * (-.1 + i * .4)); c.stroke(); }
};
D.monochrome = (c, s, t) => {
  ell(c, 0, s * .55, s * .55, s * .65, '#9a9a9a'); rect(c, -s * .5, s * .2, s * .3, s * .3, '#666'); rect(c, s * .2, s * .5, s * .3, s * .3, '#bbb');
  rect(c, -s * .5, -s * .95, s * 1, s * .95, '#dcdcdc');
  ell(c, -s * .2, -s * .55, s * .13, s * .17, '#000'); ell(c, s * .2, -s * .55, s * .13, s * .17, '#000');
  circ(c, -s * .2, -s * .58, s * .03, '#fff'); circ(c, s * .2, -s * .58, s * .03, '#fff');
  c.strokeStyle = '#000'; c.lineWidth = 2.5; c.beginPath(); c.arc(0, -s * .38, s * .3, .15, Math.PI - .15); c.stroke();
  c.lineWidth = 1; for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(i * s * .08, -s * .2); c.lineTo(i * s * .08, -s * .1); c.stroke(); }
};
D.demogorgon = (c, s, t) => {
  const open = .55 + Math.sin(t * 3) * .25;
  c.strokeStyle = '#5a4a44'; c.lineWidth = s * .14; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-s * .3, 0); c.lineTo(-s * .9, s * .8); c.moveTo(s * .3, 0); c.lineTo(s * .9, s * .8); c.stroke();
  ell(c, 0, s * .45, s * .4, s * .7, '#6d5d56');
  for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * .55 * open * 1.6; c.save(); c.translate(0, -s * .45); c.rotate(a + Math.PI / 2);
    c.beginPath(); c.moveTo(-s * .2, 0); c.quadraticCurveTo(0, -s * (.6 + open * .3), s * .2, 0); c.fillStyle = '#8a7066'; c.fill();
    c.fillStyle = '#f5f0e0'; for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(-s * .15 + k * s * .1, -s * .05); c.lineTo(-s * .1 + k * s * .1, -s * .2); c.lineTo(-s * .05 + k * s * .1, -s * .05); c.fill(); } c.restore(); }
  circ(c, 0, -s * .45, s * .22, '#5a0d0d'); circ(c, 0, -s * .45, s * .12, '#2a0000');
};
function drawMonster(c, type, x, y, s, t) { c.save(); c.translate(x, y); (D[type] || D.freddy)(c, s, t); c.restore(); }
function drawSurvivor(c, x, y, s, col, t, moving, scared) {
  c.save(); c.translate(x, y);
  const l = moving ? Math.sin(t * 12) * s * .2 : 0;
  rect(c, -s * .45, s * .5 + l * 0, s * .4, s * .7 + l, '#2c3e50'); rect(c, s * .05, s * .5, s * .4, s * .7 - l, '#2c3e50');   // legs
  rect(c, -s * .9, -s * .1, s * .3, s * .7, '#f5c542'); rect(c, s * .6, -s * .1, s * .3, s * .7, '#f5c542');                   // arms
  rect(c, -s * .6, -s * .15, s * 1.2, s * .75, col);                                                                         // torso
  rect(c, -s * .45, -s * .95, s * .9, s * .8, '#f5c542');                                                                    // head
  rect(c, -s * .25, -s * .7, s * .1, s * .14, '#111'); rect(c, s * .15, -s * .7, s * .1, s * .14, '#111');
  c.strokeStyle = '#111'; c.lineWidth = 2; c.beginPath();
  if (scared) { c.arc(0, -s * .35, s * .1, 0, 7); } else c.arc(0, -s * .52, s * .18, .3, Math.PI - .3);
  c.stroke(); c.restore();
}
