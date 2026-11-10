// How the title screen hands off to the lobby. Photosensitivity and reduced motion skip the dragon.
export function playGate(opt = {}) {
  const calm = !!(opt.photo || opt.reduced);
  if (calm) return { mode: 'fade', ms: 450, skippable: true, dragon: false };
  return { mode: 'dragon', ms: 2600, skippable: true, dragon: true };
}

// u is 0 at the start of the swoop and 1 when the lobby is revealed.
export function flyPose(u) {
  const t = Math.max(0, Math.min(1, u));
  const cover = t < 0.55 ? 0 : t < 0.78 ? (t - 0.55) / 0.23 : t < 0.9 ? 1 : Math.max(0, 1 - (t - 0.9) / 0.1);
  return {
    x: -22 + t * 46,
    y: 7.2 - Math.sin(t * Math.PI) * 2.4,
    z: 8 - t * 14,
    cover,
    reveal: t > 0.8,
  };
}
