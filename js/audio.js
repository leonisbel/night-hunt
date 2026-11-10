// Horror sound engine (Web Audio): procedural drones, reverb, heartbeat, rotor, screams + recorded CC0 ambience beds, footsteps and roars.
import { seasonFor } from './season.js';
let AC = null, master, comp, verb, verbSend, amb = null, rotor = null, muted = false;
export const audio = {
  get ctx() { return AC; },
  unlock() {
    if (!AC) {
      try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
      comp = AC.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4; comp.connect(AC.destination);
      master = AC.createGain(); master.gain.value = muted ? 0 : .9; master.connect(comp);
      verb = AC.createConvolver(); verb.buffer = impulse(3.2, 2.6); verbSend = AC.createGain(); verbSend.gain.value = .5; verbSend.connect(verb); verb.connect(master);
    }
    preloadSamples();
    if (AC.state === 'suspended') AC.resume();
    // iOS needs a sound started inside the gesture
    const b = AC.createBuffer(1, 1, 22050), s = AC.createBufferSource(); s.buffer = b; s.connect(AC.destination); s.start(0);
  },
  toggleMute() { muted = !muted; if (master) master.gain.setTargetAtTime(muted ? 0 : .9, AC.currentTime, .05); return muted; },
};
function impulse(sec, decay) {
  const n = AC.sampleRate * sec, b = AC.createBuffer(2, n, AC.sampleRate);
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay); }
  return b;
}
let noiseBuf = null;
function noiseBuffer() { if (noiseBuf) return noiseBuf; const n = AC.sampleRate * 2; noiseBuf = AC.createBuffer(1, n, AC.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; return noiseBuf; }
function out(node, wet = .3, pan = 0) {
  let n = node;
  if (pan && AC.createStereoPanner) { const p = AC.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); n.connect(p); n = p; }
  n.connect(master); if (wet) { const g = AC.createGain(); g.gain.value = wet; n.connect(g); g.connect(verbSend); }
}
function env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
function tone(f, d, type = 'sine', vol = .2, f2, wet = .3, pan = 0, delay = 0) {
  if (!AC) return; const t = AC.currentTime + delay, o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
  env(g, t, .01, vol, d); o.connect(g); out(g, wet, pan); o.start(t); o.stop(t + d + .05);
}
function burst(d, vol, freq, q = 1, type = 'lowpass', wet = .2, pan = 0, delay = 0) {
  if (!AC) return; const t = AC.currentTime + delay, s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
  s.buffer = noiseBuffer(); s.loop = true; f.type = type; f.frequency.value = freq; f.Q.value = q;
  env(g, t, .005, vol, d); s.connect(f).connect(g); out(g, wet, pan); s.start(t, Math.random()); s.stop(t + d + .05);
}
function distortion(k = 80) { const ws = AC.createWaveShaper(), n = 1024, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i * 2 / n - 1; c[i] = (3 + k) * x * 20 * Math.PI / 180 / (Math.PI + k * Math.abs(x)); } ws.curve = c; return ws; }

// --- looping ambience per theme ---
export function setAmbience(theme) {
  if (!AC) return;
  if (amb && amb.theme === theme) return;
  if (amb) { const old = amb; old.gain.gain.setTargetAtTime(0.0001, AC.currentTime, .8); setTimeout(() => old.nodes.forEach(n => { try { n.stop(); } catch (e) { } }), 3000); clearInterval(old.timer); }
  amb = null; if (!theme) return;
  const gain = AC.createGain(); gain.gain.value = 0.0001; gain.gain.setTargetAtTime(1, AC.currentTime, 1.5); out(gain, .35);
  const nodes = [];
  // low drone: two detuned saws through a slowly moving lowpass
  const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 160; lp.Q.value = 6; const dg = AC.createGain(); dg.gain.value = theme === 'lobby' ? .025 : .06; lp.connect(dg).connect(gain);
  for (const f of theme === 'lobby' ? [55, 55.4] : [41, 41.6, 61.8]) { const o = AC.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(lp); o.start(); nodes.push(o); }
  const lfo = AC.createOscillator(), lg = AC.createGain(); lfo.frequency.value = .07; lg.gain.value = 90; lfo.connect(lg).connect(lp.frequency); lfo.start(); nodes.push(lfo);
  // wind: noise through a wandering bandpass
  const ns = AC.createBufferSource(); ns.buffer = noiseBuffer(); ns.loop = true; const bp = AC.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 420; bp.Q.value = .8;
  const wg = AC.createGain(); wg.gain.value = theme === 'Foggy Woods' ? .12 : theme === 'lobby' ? .05 : .08; ns.connect(bp).connect(wg).connect(gain); ns.start(); nodes.push(ns);
  const wl = AC.createOscillator(), wlg = AC.createGain(); wl.frequency.value = .11; wlg.gain.value = 260; wl.connect(wlg).connect(bp.frequency); wl.start(); nodes.push(wl);
  const wl2 = AC.createOscillator(), wlg2 = AC.createGain(); wl2.frequency.value = .05; wlg2.gain.value = .05; wl2.connect(wlg2).connect(wg.gain); wl2.start(); nodes.push(wl2);
  // random scary details
  const timer = setInterval(() => {
    if (!AC || muted) return; const r = Math.random(), pan = Math.random() * 2 - 1;
    if (theme === 'Foggy Woods') { if (r < .3) for (let i = 0; i < 6; i++) tone(4200 + Math.random() * 300, .04, 'sine', .015, 0, .1, pan, i * .09); else if (r < .45) { tone(380, .35, 'sine', .04, 330, .7, pan); tone(330, .5, 'sine', .035, 300, .7, pan, .45); } else if (r < .6) burst(.25, .08, 900, 4, 'bandpass', .6, pan); }
    else if (theme === 'Static Fields') { if (r < .45) burst(.2 + Math.random() * .6, .05, 3000, .5, 'highpass', .2, pan); else if (r < .55) tone(950, .8, 'sine', .02, 0, .8, pan); }
    else if (theme === 'Abandoned Pizzeria Town') { if (r < .3) tone(70 + Math.random() * 40, 1.2, 'sawtooth', .03, 50, .8, pan); else if (r < .45) { tone(1500, .05, 'square', .02, 0, .7, pan); tone(1100, .05, 'square', .02, 0, .7, pan, .15); } else if (r < .55) burst(.6, .05, 300, 8, 'bandpass', .9, pan); }
    else if (theme === 'Stormy Ocean') { if (r < .4) { if (!sample('wave' + (1 + (Math.random() * 3 | 0)), .5, pan)) burst(2.5, .07, 500, .6, 'lowpass', .6, pan); } else if (r < .5) sfx('thunder', { vol: .45, pan }); else if (r < .6) tone(1800, .3, 'sine', .02, 1500, .5, pan); }
    else if (theme === 'Rainforest Swamp') { if (r < .35) for (let i = 0; i < 4; i++) tone(700 + Math.random() * 200, .12, 'triangle', .025, 400, .3, pan, i * .25); else if (r < .5) burst(.4, .05, 300, 2, 'bandpass', .5, pan); }
    else if (theme === 'Snowy Mountain') { if (r < .35) burst(2.4, .06, 1100, 1.2, 'bandpass', .6, pan); else if (r < .42) tone(160, 1.5, 'sawtooth', .03, 110, .95, pan); }
    else if (theme === 'Haunted Farm') { if (r < .25) tone(500, .25, 'square', .02, 420, .6, pan); else if (r < .4) burst(.6, .05, 900, 3, 'bandpass', .6, pan); }
    else if (theme === 'Vampire Castle') { if (r < .25) sfx('bats', { vol: .3, pan }); else if (r < .4) tone(110, 2, 'sine', .04, 105, .95, pan); }
    else if (theme === 'Fester Street') { if (r < .2) tone(880, .8, 'sine', .015, 860, .95, pan); else if (r < .3) burst(.15, .05, 2000, 3, 'bandpass', .4, pan); }
    else if (theme === 'lobby') {
      const season = seasonFor(new Date(), typeof location !== 'undefined' ? new URLSearchParams(location.search).get('season') : '');
      if (r < .18) tone(180 + Math.random() * 40, .35, 'sawtooth', .012, 90, .4, pan);
      else if (r < .28 && (season === 'newyear' || season === 'july4')) burst(.25, .05, 500, .8, 'lowpass', .4, pan);
      else if (r < .34 && season === 'christmas') tone(784, .45, 'sine', .02, 659, .7, pan);
    }
  }, 1700);
  if (theme === 'lobby') {
    const tr = AC.createBufferSource(); tr.buffer = noiseBuffer(); tr.loop = true;
    const tf = AC.createBiquadFilter(); tf.type = 'lowpass'; tf.frequency.value = 240;
    const tg = AC.createGain(); tg.gain.value = .07; tr.connect(tf).connect(tg).connect(gain); tr.start(); nodes.push(tr);
  }
  amb = { theme, gain, nodes, timer }; bed(theme, gain, nodes);
}

// --- helicopter rotor (continuous, volume set every frame) ---
export function setRotor(vol) {
  if (!AC) return;
  if (!rotor) {
    const s = AC.createBufferSource(); s.buffer = noiseBuffer(); s.loop = true; const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 380;
    const am = AC.createGain(); am.gain.value = 0; const lfo = AC.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 11; const lg = AC.createGain(); lg.gain.value = .5; lfo.connect(lg).connect(am.gain);
    const thump = AC.createOscillator(); thump.frequency.value = 48; const tg = AC.createGain(); tg.gain.value = .5; thump.connect(tg).connect(am);
    const g = AC.createGain(); g.gain.value = 0; s.connect(f).connect(am).connect(g); out(g, .15); s.start(); lfo.start(); thump.start(); rotor = { g };
  }
  rotor.g.gain.setTargetAtTime(Math.max(0, Math.min(1, vol)) * .6, AC.currentTime, .15);
}
let engine = null;
export function setEngine(vol, rate = 1) {
  if (!AC) return;
  if (!engine) {
    const s = AC.createBufferSource(); s.buffer = noiseBuffer(); s.loop = true;
    const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 220;
    const g = AC.createGain(); g.gain.value = 0; s.connect(f).connect(g); out(g, .12); s.start();
    const th = AC.createOscillator(); th.type = 'sawtooth'; th.frequency.value = 48; const tg = AC.createGain(); tg.gain.value = 0; th.connect(tg).connect(g); th.start();
    engine = { g, f, th, tg };
  }
  const v = Math.max(0, Math.min(1, vol));
  engine.g.gain.setTargetAtTime(v * .22, AC.currentTime, .08);
  engine.f.frequency.setTargetAtTime(140 + rate * 420, AC.currentTime, .08);
  engine.th.frequency.setTargetAtTime(36 + rate * 70, AC.currentTime, .08);
  engine.tg.gain.setTargetAtTime(v * .12, AC.currentTime, .08);
}

// original synthesized "ha… ha… ha…" laugh: a glottal sawtooth through two vowel formants, pitch sagging, drenched in reverb
function laugh(v = 1) {
  const t0 = AC.currentTime, n = 5;
  for (let i = 0; i < n; i++) {
    const t = t0 + i * .34 + (i > 2 ? .1 : 0), o = AC.createOscillator(), g = AC.createGain(), f1 = AC.createBiquadFilter(), f2 = AC.createBiquadFilter(), d = distortion(30);
    o.type = 'sawtooth'; const p = 118 - i * 9; o.frequency.setValueAtTime(p * 1.15, t); o.frequency.exponentialRampToValueAtTime(p * .82, t + .26);
    const vib = AC.createOscillator(), vg = AC.createGain(); vib.frequency.value = 7; vg.gain.value = 4; vib.connect(vg).connect(o.frequency);
    f1.type = 'bandpass'; f1.frequency.value = 760; f1.Q.value = 6; f2.type = 'bandpass'; f2.frequency.value = 1150; f2.Q.value = 8;
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.5 * v, t + .03); g.gain.exponentialRampToValueAtTime(.0001, t + .3);
    o.connect(d); d.connect(f1).connect(g); d.connect(f2).connect(g); out(g, .9); o.start(t); vib.start(t); o.stop(t + .35); vib.stop(t + .35);
    burst(.08, .12 * v, 2400, 2, 'bandpass', .6, 0, t - t0); // breathy "h"
  }
  tone(55, 2.2, 'sine', .25 * v, 40, .8);
}
// recorded roars (sound-alikes layered from CC0 / public-domain animal recordings — see vendor/LICENSES.md), with a synth fallback
const SAMPLES = { trexroar: 'sfx/trex_roar.mp3', spinoroar: 'sfx/spino_roar.mp3' }, SBUF = {};
// v1.6: recorded CC0 ambience beds + footsteps per surface (see vendor/LICENSES.md)
for (const k of ['rain', 'crickets', 'howl', 'cave', 'wind']) SAMPLES['amb_' + k] = 'sfx/amb_' + k + '.mp3';
for (const k of ['grass', 'concrete', 'snow', 'wood', 'carpet']) for (let i = 0; i < 3; i++) SAMPLES['step_' + k + i] = 'sfx/step_' + k + i + '.mp3';
for (let i = 1; i <= 3; i++) SAMPLES['wave' + i] = 'sfx/wave' + i + '.mp3';
const BEDS = { lobby: [['wind', .12], ['crickets', .08]], 'Abandoned Pizzeria Town': [['wind', .1], ['crickets', .1]], 'Powerline Forest': [['crickets', .22], ['wind', .08]],
  'Foggy Woods': [['crickets', .16], ['howl', .1], ['wind', .08]], 'Static Fields': [['wind', .2]], 'Stormy Ocean': [['rain', .32], ['wind', .14]], 'Rainforest Swamp': [['rain', .26], ['crickets', .2]],
  'Snowy Mountain': [['wind', .38], ['howl', .08]], 'Haunted Farm': [['crickets', .26], ['wind', .06]], 'Vampire Castle': [['wind', .18], ['cave', .14]], 'Fester Street': [['crickets', .18]] };
function loadBuf(k) { if (SBUF[k]) return Promise.resolve(SBUF[k]); return fetch(SAMPLES[k]).then(r => r.arrayBuffer()).then(a => AC.decodeAudioData(a)).then(d => (SBUF[k] = d)).catch(() => { SBUF[k] = false; return null; }); }
function bed(theme, gain, nodes) { for (const [k, v] of BEDS[theme] || []) loadBuf('amb_' + k).then(b => { if (!b || !amb || amb.gain !== gain) return; const s = AC.createBufferSource(), g = AC.createGain(); s.buffer = b; s.loop = true; g.gain.value = v; s.connect(g).connect(gain); s.start(0, Math.random() * b.duration); nodes.push(s); }); }
function sample(k, v = 1, pan = 0) {
  const b = SBUF[k]; if (b === undefined) { SBUF[k] = null; fetch(SAMPLES[k]).then(r => r.arrayBuffer()).then(a => AC.decodeAudioData(a)).then(d => { SBUF[k] = d; }).catch(() => { SBUF[k] = false; }); return false; }
  if (!b) return false; const s = AC.createBufferSource(), g = AC.createGain(); s.buffer = b; s.playbackRate.value = .96 + Math.random() * .08; g.gain.value = v; s.connect(g); out(g, .45, pan); s.start(); return true;
}
export function preloadSamples() { if (AC) for (const k in SAMPLES) if (SBUF[k] === undefined && !k.startsWith('amb_')) sample(k, 0); }
// Boisvert's dead channel: a looping roaring TV static hiss while the survivor's screen is full of snow
let hiss = null;
export function staticHiss(on) {
  if (!AC) return; if (on && !hiss && !muted) { const s = AC.createBufferSource(), hp = AC.createBiquadFilter(), pk = AC.createBiquadFilter(), g = AC.createGain(); s.buffer = noiseBuffer(); s.loop = true; hp.type = 'highpass'; hp.frequency.value = 700; pk.type = 'peaking'; pk.frequency.value = 4200; pk.gain.value = 6;
    g.gain.setValueAtTime(.0001, AC.currentTime); g.gain.exponentialRampToValueAtTime(.14, AC.currentTime + .08); s.connect(hp).connect(pk).connect(g); g.connect(master); s.start(); hiss = { s, g }; }
  else if (!on && hiss) { const h = hiss; hiss = null; h.g.gain.setTargetAtTime(.0001, AC.currentTime, .08); h.s.stop(AC.currentTime + .5); }
}
export function sfx(k, o = {}) {
  if (!AC || muted) return; const pan = o.pan || 0, v = o.vol ?? 1;
  switch (k) {
    case 'trexroar': if (!sample('trexroar', 1.1 * v, pan)) { tone(70, 2.6, 'sawtooth', .35 * v, 40, .8, pan); burst(2.4, .3 * v, 400, 1, 'lowpass', .8, pan); } break;
    case 'spinoroar': if (!sample('spinoroar', 1.0 * v, pan)) { tone(240, 1.8, 'sawtooth', .3 * v, 90, .7, pan); burst(1.6, .3 * v, 2200, 2, 'bandpass', .6, pan); } break;
    case 'static': burst(.6, .35 * v, 3000, .4, 'highpass', .2); tone(15000, .3, 'sine', .05 * v, 0, 0); break;
    case 'crack': for (let i = 0; i < 7; i++) { burst(.035, .45 * v, 1800 + Math.random() * 2500, 3, 'bandpass', .3, pan, i * (.06 + Math.random() * .08)); tone(160 + Math.random() * 120, .05, 'square', .12 * v, 60, .2, pan, i * .09); } tone(90, .9, 'sawtooth', .15 * v, 45, .6, pan, .1); break;
    case 'mimic': { for (const [f, d] of [[420, 0], [520, .22], [380, .5], [470, .9], [560, 1.1]]) tone(f, .28, 'triangle', .14 * v, f * .8, .9, pan, d); tone(300, 1.4, 'sawtooth', .04 * v, 200, .9, pan, 1.5); break; } // "help me… over here…" in a voice that is almost right
    case 'skitter': for (let i = 0; i < 18; i++) burst(.02, .2 * v, 3000 + Math.random() * 2000, 4, 'bandpass', .2, pan, i * .045); break;
    case 'step': if (!(o.surf && sample('step_' + o.surf + (Math.random() * 3 | 0), (o.surf === 'carpet' ? .5 : .35) * v, pan))) burst(.07, .05 * v, 500 + Math.random() * 300, 1, 'lowpass', .1, pan); break;
    case 'stomp': burst(.18, .25 * v, 140, 1, 'lowpass', .5, pan); tone(55, .25, 'sine', .25 * v, 35, .4, pan); break;
    case 'beat': tone(62, .14, 'sine', .55 * v, 38, .1); tone(55, .14, 'sine', .45 * v, 34, .1, 0, .2); break;
    case 'scare': {
      const t = AC.currentTime, d = distortion(120), g = AC.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.55, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + 1.5); d.connect(g); out(g, .5);
      for (const [f, f2] of [[880, 180], [1240, 260], [660, 120], [1630, 400]]) { const os = AC.createOscillator(); os.type = 'sawtooth'; os.frequency.setValueAtTime(f, t); os.frequency.exponentialRampToValueAtTime(f2, t + 1.4); const vib = AC.createOscillator(), vg = AC.createGain(); vib.frequency.value = 23; vg.gain.value = 40; vib.connect(vg).connect(os.frequency); os.connect(d); os.start(t); vib.start(t); os.stop(t + 1.5); vib.stop(t + 1.5); }
      burst(1.2, .5, 2500, .5, 'highpass', .4); tone(45, 1.2, 'sine', .6, 30, .3); break;
    }
    case 'siren': for (let i = 0; i < 3; i++) { tone(380, 1.1, 'sawtooth', .1, 720, .8, 0, i * 1.1); tone(392, 1.1, 'square', .05, 700, .8, 0, i * 1.1); } break;
    case 'heli': for (let i = 0; i < 16; i++) burst(.07, .2, 220, 1, 'lowpass', .3, 0, i * .09); break;
    case 'ability': tone(180, .5, 'sawtooth', .12, 60, .6); burst(.4, .12, 700, 3, 'bandpass', .6); break;
    case 'catch': tone(120, .6, 'square', .15, 40, .7, pan); burst(.5, .2, 400, 1, 'lowpass', .7, pan); break;
    case 'dead': [196, 165, 131, 98].forEach((f, i) => tone(f, .7, 'sawtooth', .07, f * .8, .7, 0, i * .22)); break;
    case 'kill': [880, 660].forEach((f, i) => tone(f, .25, 'square', .06, f, .25, 0, i * .1)); break;
    case 'escape': [523, 659, 784, 1046].forEach((f, i) => tone(f, .5, 'triangle', .1, 0, .5, 0, i * .12)); break;
    case 'click': tone(900, .04, 'square', .05, 0, 0); break;
    case 'sting': tone(98, .7, 'sawtooth', .12 * v, 40, .4); tone(196, .9, 'triangle', .1 * v, 80, .5, 0, .12); burst(.4, .08 * v, 1800, .5, 'highpass', .1); break;
    case 'whisper': burst(1.4, .05 * v, 2200, 6, 'bandpass', .9, pan); break;
    case 'gun': burst(.12, .5 * v, 1800, .6, 'lowpass', .12, pan); tone(140, .1, 'square', .2 * v, 50, .1, pan); break;
    case 'shotgun': burst(.3, .7 * v, 1100, .5, 'lowpass', .3, pan); tone(80, .2, 'sawtooth', .25 * v, 35, .2, pan); break;
    case 'rifle': burst(.09, .45 * v, 2600, .6, 'lowpass', .08, pan); tone(200, .07, 'square', .15 * v, 70, .07, pan); break;
    case 'swing': burst(.18, .18 * v, 900, 2, 'bandpass', .16, pan); break;
    case 'hit': burst(.12, .35 * v, 300, 1, 'lowpass', .12, pan); tone(90, .12, 'sine', .3 * v, 50, .1, pan); break;
    case 'hurt': tone(160, .25, 'sawtooth', .18, 70, .25); burst(.15, .25, 500, 1, 'lowpass', .15); break;
    case 'open': burst(.35, .15, 600, 2, 'bandpass', .35, pan); tone(300, .2, 'triangle', .08, 500, .2, pan, .1); break;
    case 'pickup': tone(660, .08, 'triangle', .1, 0, .08); tone(990, .1, 'triangle', .1, 0, .1, 0, .07); break;
    case 'eat': for (let i = 0; i < 4; i++) burst(.06, .12, 1400, 3, 'bandpass', .05, 0, i * .12); break;
    case 'drink': for (let i = 0; i < 4; i++) tone(320 + i * 30, .1, 'sine', .1, 260, .1, 0, i * .13); break;
    case 'dry': tone(1200, .03, 'square', .06, 0, .02, pan); break;
    case 'down': tone(110, 1, 'sawtooth', .2, 40, 1, pan); burst(.6, .2, 300, 1, 'lowpass', .6, pan); break;
    case 'coin': [988, 1319].forEach((f, i) => tone(f, .15, 'square', .06, 0, .15, 0, i * .08)); break;
    case 'laugh': laugh(v); break;
    case 'sonlaugh': { // original 'creepypasta' laugh: a high, pitch-wobbling, bit-crushed giggle that slides down into a growl
      const t0 = AC.currentTime;
      for (let i = 0; i < 7; i++) { const t = t0 + i * .2, o = AC.createOscillator(), g = AC.createGain(), d = distortion(80), f = AC.createBiquadFilter();
        o.type = 'square'; const p = 420 - i * 38; o.frequency.setValueAtTime(p * 1.3, t); o.frequency.exponentialRampToValueAtTime(p * .7, t + .16);
        f.type = 'bandpass'; f.frequency.value = 1500 - i * 120; f.Q.value = 3; g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.32 * v, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + .18);
        o.connect(d).connect(f).connect(g); out(g, .8); o.start(t); o.stop(t + .2); }
      tone(70, 1.4, 'sawtooth', .22 * v, 38, .7, 0, 1.35); burst(1, .12 * v, 400, 2, 'bandpass', .8, 0, 1.35); break; }
    case 'quake': tone(40, 1.2, 'sine', .6 * v, 25, .6, pan); burst(1, .4 * v, 160, 1, 'lowpass', .6, pan); break;
    case 'shift': tone(300, .9, 'sawtooth', .12 * v, 60, .9, pan); burst(.8, .1 * v, 1500, 6, 'bandpass', .9, pan); break;
    case 'paranoia': for (let i = 0; i < 6; i++) tone(500 + Math.random() * 900, .7, 'sine', .05 * v, 200 + Math.random() * 600, .95, (Math.random() - .5) * 1.6, i * .18); break;
    case 'scream': burst(.9, .3 * v, 1800, 3, 'bandpass', .6, pan); tone(700, .9, 'sawtooth', .1 * v, 300, .6, pan); break;
    case 'scare2': { sfx('scare'); burst(.6, .3, 900, 1, 'lowpass', .5, 0, 1.6); tone(50, .8, 'sine', .7, 28, .3, 0, 1.6); break; }
    case 'dark': tone(90, 1.6, 'sawtooth', .18, 30, .8); burst(1.2, .15, 300, 1, 'lowpass', .8); tone(1400, .05, 'square', .08, 0, .2); break;
    case 'portal': tone(70, 1.1, 'sawtooth', .2 * v, 220, .8, pan); burst(1, .2 * v, 900, 4, 'bandpass', .8, pan); tone(330, .9, 'sine', .1 * v, 60, .9, pan, .2); break;
    case 'inject': burst(.12, .2 * v, 4000, 3, 'highpass', .2, pan); tone(1800, .15, 'sine', .06 * v, 900, .3, pan); break;
    case 'dream': for (let i = 0; i < 4; i++) tone(220 - i * 30, 1.4, 'sine', .14, 110 - i * 20, .95, 0, i * .25); burst(2, .12, 500, 2, 'bandpass', .95); break;
    case 'buzz': for (let i = 0; i < 8; i++) tone(180 + Math.random() * 60, .25, 'sawtooth', .05 * v, 160, .5, pan, i * .09); break;
    case 'stretch': tone(160, .5, 'triangle', .2 * v, 900, .3, pan); tone(900, .25, 'triangle', .15 * v, 120, .3, pan, .5); break;
    case 'sleep': tone(330, .8, 'sine', .05, 220, .7); break;
    case 'childvoice': { // original synth: a sing-song, high, friendly 'la-la' (no samples)
      [[660, 0], [784, .22], [660, .44], [880, .7]].forEach(([f, d]) => { tone(f, .2, 'triangle', .07, f * 1.04, .6, 0, d); tone(f * 2.01, .18, 'sine', .025, 0, .6, 0, d); }); break; }
    case 'locust': { // scream + glass crack
      for (const [f, f2] of [[1300, 420], [1700, 600], [900, 300]]) tone(f, 1.1, 'sawtooth', .14, f2, .6);
      burst(.25, .7, 3500, .7, 'highpass', .4); for (let i = 0; i < 6; i++) burst(.04, .35, 5000, 2, 'bandpass', .3, (Math.random() - .5), .05 + i * .03);
      tone(60, .5, 'sine', .5, 35, .3); break; }
    // phase 2 creatures and weather
    case 'wave': burst(2.2, .45 * v, 700, .6, 'lowpass', .6, pan); burst(1.4, .2 * v, 2400, .4, 'highpass', .5, pan, .3); tone(48, 1.6, 'sine', .35 * v, 30, .5, pan); break;
    case 'tentacle': burst(.5, .3 * v, 500, 2, 'bandpass', .5, pan); for (let i = 0; i < 3; i++) burst(.12, .2 * v, 1200, 3, 'bandpass', .4, pan, .15 + i * .14); tone(90, .7, 'sawtooth', .1 * v, 50, .6, pan); break;
    case 'thunder': burst(.15, .7 * v, 4000, .5, 'highpass', .3, pan); burst(2.6, .55 * v, 220, .7, 'lowpass', .9, pan, .05); tone(38, 2.2, 'sine', .45 * v, 26, .8, pan, .05); break;
    case 'whirl': burst(3, .25 * v, 600, 1.5, 'bandpass', .8, pan); tone(120, 3, 'sine', .12 * v, 40, .8, pan); break;
    case 'nessie': tone(140, 2.2, 'sawtooth', .14 * v, 90, .95, pan); tone(212, 2, 'sine', .08 * v, 140, .95, pan, .2); break;
    case 'roar': { const t = AC.currentTime, d = distortion(160), g = AC.createGain(), f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900; g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.6 * v, t + .15); g.gain.exponentialRampToValueAtTime(.0001, t + 2);
      for (const fr of [70, 104, 143]) { const o = AC.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(fr * 1.3, t); o.frequency.exponentialRampToValueAtTime(fr * .7, t + 1.9); o.connect(d); o.start(t); o.stop(t + 2); }
      d.connect(f).connect(g); out(g, .6, pan); burst(1.8, .3 * v, 500, 1, 'lowpass', .6, pan); break; }
    case 'screech': for (let i = 0; i < 2; i++) { tone(2400, .7, 'sawtooth', .1 * v, 1100, .6, pan, i * .35); tone(3100, .6, 'square', .05 * v, 1500, .6, pan, i * .35); } break;
    case 'fire': burst(1.6, .5 * v, 900, .5, 'lowpass', .4, pan); burst(1.4, .2 * v, 3000, .5, 'highpass', .3, pan, .1); tone(60, 1.4, 'sawtooth', .15 * v, 40, .5, pan); break;
    case 'drain': tone(300, 1.2, 'sine', .12 * v, 90, .9, pan); burst(1, .1 * v, 1800, 6, 'bandpass', .9, pan); break;
    case 'bats': for (let i = 0; i < 14; i++) tone(5000 + Math.random() * 2500, .03, 'square', .025 * v, 0, .3, (Math.random() - .5) * 1.6, i * .07); burst(1, .1 * v, 1600, 4, 'bandpass', .5, pan); break;
    case 'fester': { tone(95, 2.4, 'sine', .2 * v, 60, .95, pan); for (let i = 0; i < 4; i++) tone(1200 + i * 40, .5, 'sine', .03 * v, 1180, .95, pan, .4 + i * .5); break; }
    case 'boat': tone(70, .5, 'sawtooth', .08 * v, 74, .2, pan); burst(.5, .08 * v, 400, 1, 'lowpass', .3, pan); break;
    default: tone(220, .3, 'triangle', .12, 90, .3);
  }
}
