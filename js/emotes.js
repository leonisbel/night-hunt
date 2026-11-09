// Original gesture emotes. The poses are written for this game. No ripped animation clips or audio.
export const EMOTES = [
  { id: 'wave', name: 'Wave', price: 0, icon: '👋', dur: 2.6, blurb: 'An open hand, hello. Free for everyone.' },
  { id: 'groove', name: 'Night Groove', price: 80, icon: '💃', dur: 4.2, blurb: 'Hips roll and the arms chase the beat. Original choreography for Night Hunt.' },
  { id: 'spin', name: 'Spotlight Spin', price: 60, icon: '🌀', dur: 3.2, blurb: 'One spin with the arms out, then a held pose.' },
  { id: 'jacks', name: 'Jump Jacks', price: 60, icon: '🤸', dur: 3.4, blurb: 'Star jumps in place.' },
  { id: 'flex', name: 'Flex', price: 100, icon: '💪', dur: 3.0, blurb: 'A double-bicep pose that pulses.' },
  { id: 'pendulum', name: 'Pendulum', price: 140, icon: '🕺', dur: 4.0, blurb: 'The arms swing past each other while the shoulders rock. An original step.' },
  { id: 'robot', name: 'Circuit', price: 120, icon: '🤖', dur: 4.0, blurb: 'Locked joints and small pops, like a toy robot waking up.' },
  { id: 'bow', name: 'Curtain Bow', price: 40, icon: '🙇', dur: 2.8, blurb: 'A deep bow and a flourish back up.' },
  { id: 'cheer', name: 'Cheer', price: 70, icon: '🙌', dur: 2.8, blurb: 'Both hands pump overhead.' },
  { id: 'shuffle', name: 'Alley Shuffle', price: 150, icon: '👟', dur: 4.4, blurb: 'Quick side steps with the arms crossing. Original footwork.' },
  { id: 'zombie', name: 'Zombie Stroll', price: 120, icon: '🧟', dur: 4.0, blurb: 'Arms out, a slow lurch.' },
  { id: 'scream', name: 'Jump Scare Pose', price: 90, icon: '😱', dur: 2.2, blurb: 'Hands up by the head. The pose only — no borrowed sting.' },
];
export const EMOTE_IDS = EMOTES.map(e => e.id);
export const EMOTE_LEN = Object.fromEntries(EMOTES.map(e => [e.id, e.dur]));
export const EMOTE_ALIAS = { floss: 'pendulum', dance: 'groove', jump: 'jacks' };

export function applyEmote(parts, id, t) {
  const out = { yaw: 0, hop: 0 };
  if (!parts || !parts.armL || !parts.armR) return out;
  const k = t * 6, L = parts.armL, R = parts.armR, B = parts.body, H = parts.head;
  const low = a => a && a.userData && a.userData.low;
  const bend = (a, x) => { if (low(a)) low(a).rotation.x = x; };
  if (id === 'wave') {
    R.rotation.set(-2.7, 0, -0.35 + Math.sin(k * 1.6) * 0.55);
    bend(R, -0.35 + Math.sin(k * 1.6) * 0.2);
  } else if (id === 'groove') {
    if (B) { B.position.y += Math.abs(Math.sin(k * 0.45)) * 0.1; B.rotation.z = Math.sin(k * 0.45) * 0.2; B.rotation.y = Math.sin(k * 0.45) * 0.35; }
    L.rotation.set(-0.9 + Math.sin(k) * 0.55, 0, 0.45);
    R.rotation.set(-0.9 + Math.sin(k + 1.4) * 0.55, 0, -0.45);
    if (parts.legL) parts.legL.rotation.x = Math.sin(k) * 0.4;
    if (parts.legR) parts.legR.rotation.x = -Math.sin(k) * 0.4;
  } else if (id === 'spin') {
    out.yaw = t * 7;
    L.rotation.set(-0.4, 0, 1.15); R.rotation.set(-0.4, 0, -1.15);
    if (B) B.position.y += 0.05;
  } else if (id === 'jacks') {
    out.hop = Math.abs(Math.sin(k * 0.7)) * 0.85;
    const open = Math.sin(k * 0.7) > 0;
    L.rotation.set(open ? -2.6 : -0.4, 0, open ? 0.8 : 0.15);
    R.rotation.set(open ? -2.6 : -0.4, 0, open ? -0.8 : -0.15);
    if (parts.legL) parts.legL.rotation.z = open ? 0.35 : 0.05;
    if (parts.legR) parts.legR.rotation.z = open ? -0.35 : -0.05;
  } else if (id === 'flex') {
    L.rotation.set(-1.45, 0, 1.15); R.rotation.set(-1.45, 0, -1.15);
    bend(L, -1.5 - Math.abs(Math.sin(k)) * 0.35);
    bend(R, -1.5 - Math.abs(Math.sin(k + 0.4)) * 0.35);
    if (B) B.rotation.x = -0.08;
  } else if (id === 'pendulum') {
    const f = Math.sin(k * 1.15);
    L.rotation.set(0.15, 0, 0.2 + f * 0.95);
    R.rotation.set(0.15, 0, -0.2 - f * 0.95);
    bend(L, -0.4); bend(R, -0.4);
    if (B) B.rotation.z = -f * 0.12;
    if (parts.legL) parts.legL.rotation.x = Math.max(0, f) * 0.35;
    if (parts.legR) parts.legR.rotation.x = Math.max(0, -f) * 0.35;
  } else if (id === 'robot') {
    const q = Math.sin(k * 0.5) > 0 ? 1 : -1, pop = Math.abs(Math.sin(k * 2)) > 0.85 ? 0.35 : 0;
    L.rotation.set(-1.2 * q, 0, 0.9);
    R.rotation.set(0.4 * q, 0, -0.5);
    bend(L, -1.2); bend(R, q > 0 ? -0.2 : -1.3);
    if (B) { B.rotation.y = q * 0.25; B.position.y += pop; }
    if (H) H.rotation.y = q * 0.4;
  } else if (id === 'bow') {
    const s = Math.sin(t * 1.6);
    const deep = s > 0 ? s : 0;
    if (B) B.rotation.x = deep * 0.9;
    L.rotation.set(0.4 + deep, 0, 0.25);
    R.rotation.set(0.4 + deep, 0, -0.25);
    if (H) H.rotation.x = deep * 0.4;
  } else if (id === 'cheer') {
    const p = Math.abs(Math.sin(k * 1.1));
    L.rotation.set(-2.8, 0, 0.35); R.rotation.set(-2.8, 0, -0.35);
    if (B) B.position.y += p * 0.16;
    out.hop = p * 0.2;
  } else if (id === 'shuffle') {
    const f = Math.sin(k * 1.4);
    if (B) { B.position.x = f * 0.12; B.rotation.y = f * 0.2; }
    L.rotation.set(-0.6, 0, f > 0 ? 0.9 : -0.2);
    R.rotation.set(-0.6, 0, f > 0 ? 0.2 : -0.9);
    if (parts.legL) parts.legL.rotation.x = f > 0 ? 0.5 : -0.15;
    if (parts.legR) parts.legR.rotation.x = f < 0 ? 0.5 : -0.15;
  } else if (id === 'zombie') {
    L.rotation.set(-1.5, 0, 0.15); R.rotation.set(-1.5, 0, -0.15);
    bend(L, -0.2); bend(R, -0.2);
    if (B) B.rotation.z = Math.sin(t * 3) * 0.14;
    if (H) H.rotation.x = 0.25 + Math.sin(t * 2) * 0.08;
  } else if (id === 'scream') {
    L.rotation.set(-2.5, 0, 0.85); R.rotation.set(-2.5, 0, -0.85);
    bend(L, -1.2); bend(R, -1.2);
    if (B) B.rotation.x = -0.22;
    if (H) H.rotation.x = -0.45;
  }
  return out;
}
