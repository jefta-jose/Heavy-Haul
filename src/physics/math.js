// Deterministic helpers shared by terrain, obstacles and drivetrain. Every random choice in the
// world comes from a seeded generator, so a season always builds the same trail.

export const smoothstep = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };

// Park-Miller minimal standard generator.
export function seededRandom(seed) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

const hash1 = n => { const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); };

// 1D value noise in [-1, 1] with a quintic fade; k selects an independent octave.
export function valueNoise(x, k) {
  const i = Math.floor(x), f = x - i, u = f * f * f * (f * (f * 6 - 15) + 10);
  const a = hash1(i + k * 7919) * 2 - 1, b = hash1(i + 1 + k * 7919) * 2 - 1;
  return a + (b - a) * u;
}
