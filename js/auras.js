// Host-side aura rules. No rendering. Distances are simulation units (20 units = 1 metre).
// Hard control (frost lock, neon stun) cannot chain: each has an immunity window on the same
// order as the 20 second ability cooldown. Damage over time is a slow chip, not a catch.
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.NightHuntAuras = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const AURAS = {
    shadow: { radius: 220, blurb: 'A dark silhouette. Survivors nearby lose the edges of their vision.' },
    toxic: { radius: 180, dps: 3, blurb: 'Radioactive skin. Standing close deals 3 damage a second and a Geiger crackle.' },
    frost: { radius: 190, slow: 0.62, freezeAfter: 2.5, freezeFor: 1.2, immune: 8, blurb: 'Cold skin. Nearby survivors are slowed, and staying close for 2.5s freezes them for 1.2s, then they are immune for 8s.' },
    blood: { radius: 160, slow: 0.78, blurb: 'Blood Moon. A red drip and a mild slow. The Blood toggle turns the drips into dark mist.' },
    lava: { radius: 130, dps: 4, blurb: 'Molten skin. A smaller radius deals 4 heat damage a second.' },
    neon: { radius: 150, stun: 0.45, immune: 20, blurb: 'A neon charge. The first touch stuns for under half a second, then that survivor is immune for 20s.' },
    ghost: { radius: 200, blurb: 'A pale ghost. Nearby survivors get a washed-out veil. It does not damage or stop them.' },
    zombie: { radius: 170, slow: 0.72, dps: 1, blurb: 'Rot. A slow and 1 damage a second while you stay in the stench.' },
    abyss: { radius: 180, slow: 0.82, blurb: 'Deep water. A mild slow and a dark-blue veil. It does not pull you.' },
    golden: { radius: 150, blurb: 'Polished gold. A bright shine and sparkles. No damage and no slow.' },
  };

  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function empty() { return { frostTime: 0, frozenUntil: 0, frostImmune: 0, neonUntil: 0, buf: 0, bufKind: '' }; }

  // One survivor, the monsters that can affect them. Mutates survivor.auraState. Returns the effect this step, or null.
  function tickSurvivor(survivor, monsters, dt, now) {
    if (!survivor || !survivor.alive) return null;
    const state = survivor.auraState || (survivor.auraState = empty());
    if (state.frozenUntil > now) return { kind: 'frost', frozen: true, slow: 1, dmg: 0, stun: 0, freeze: 0 };
    let best = null, bestD = Infinity;
    for (const m of monsters || []) {
      const A = AURAS[m.skin];
      if (!A || m.alive === false || (m.downUntil && m.downUntil > now)) continue;
      const d = dist(m, survivor);
      if (d <= A.radius && d < bestD) { best = m; bestD = d; }
    }
    if (!best) { state.frostTime = 0; state.buf = 0; state.bufKind = ''; return null; }
    const A = AURAS[best.skin];
    if (state.bufKind !== best.skin) { state.buf = 0; state.bufKind = best.skin; state.frostTime = best.skin === 'frost' ? state.frostTime : 0; }
    const out = { kind: best.skin, monster: best, slow: A.slow || 1, dmg: 0, stun: 0, freeze: 0, frozen: false };
    if (A.dps) {
      state.buf += A.dps * dt;
      if (state.buf >= 1) { out.dmg = Math.floor(state.buf); state.buf -= out.dmg; }
    }
    if (A.freezeAfter) {
      if (now >= state.frostImmune) {
        state.frostTime += dt;
        if (state.frostTime >= A.freezeAfter) {
          state.frostTime = 0;
          state.frozenUntil = now + A.freezeFor;
          state.frostImmune = now + A.freezeFor + A.immune;
          out.freeze = A.freezeFor;
          out.frozen = true;
        }
      }
    } else state.frostTime = 0;
    if (A.stun && now >= state.neonUntil) {
      state.neonUntil = now + A.immune;
      out.stun = A.stun;
    }
    return out;
  }

  return { AURAS, tickSurvivor };
});
