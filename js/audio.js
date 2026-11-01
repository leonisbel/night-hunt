// Procedural horror sound engine (Web Audio, no files): ambience, reverb, footsteps, heartbeat, rotor, screams.
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
    else if (theme === 'lobby' && r < .2) burst(.4, .03, 600, 2, 'bandpass', .5, pan);
  }, 1700);
  amb = { theme, gain, nodes, timer };
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

export function sfx(k, o = {}) {
  if (!AC || muted) return; const pan = o.pan || 0, v = o.vol ?? 1;
  switch (k) {
    case 'step': burst(.07, .05 * v, 500 + Math.random() * 300, 1, 'lowpass', .1, pan); break;
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
    case 'escape': [523, 659, 784, 1046].forEach((f, i) => tone(f, .5, 'triangle', .1, 0, .5, 0, i * .12)); break;
    case 'click': tone(900, .04, 'square', .05, 0, 0); break;
    case 'whisper': burst(1.4, .05 * v, 2200, 6, 'bandpass', .9, pan); break;
    default: tone(220, .3, 'triangle', .12, 90, .3);
  }
}
