// Short vibrations on touch devices: a tick for each gear or drive-mode change, a thud on hard hits
// and when a rock breaks, a double pulse when the winch hooks on, and a warning when the tank runs
// low. Android browsers support it; iOS ignores it.

export function createHaptics() {
  const touch = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  const ok = touch && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
  let quietUntil = 0;
  const buzz = (pattern, gap = 0.12) => {
    const now = performance.now() / 1000;
    if (!ok || now < quietUntil) return;
    quietUntil = now + gap;
    try { navigator.vibrate(pattern); } catch (e) {}
  };
  return {
    tick: () => buzz(12, 0.05),
    toggle: () => buzz(22),
    hit: strength => buzz(Math.round(18 + 42 * Math.min(1, strength)), 0.25),
    hooked: () => buzz([25, 60, 35], 0.4),
    warn: () => buzz([60, 90, 60], 1),
  };
}
