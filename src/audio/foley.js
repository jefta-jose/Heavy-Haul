// Effect sounds rendered to sample arrays once at start-up: water, rock, wood, suspension, tires and
// the drivetrain straining on a climb. Pure functions of (sample rate, size, seed), so the game
// plays them as AudioBuffers and tools/audio-preview.js writes them to WAV files.
//
// Water is built from bubbles: each is a short sine whose pitch rises as it closes (the sound of
// real splashes), over a wash of filtered noise. Rock is a sharp crack, ringing stone modes, a thud
// and a trickle of falling pebbles. Tire loops play at a reference speed; the game pitches and
// fades them with the truck's speed and the surface under its tires.

function rng(seed) {
  let a = (seed * 2654435761) >>> 0 || 1;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const TAU = Math.PI * 2;

function normalize(x, peak) {
  let m = 0; for (const v of x) m = Math.max(m, Math.abs(v));
  if (m > 0) for (let i = 0; i < x.length; i++) x[i] *= peak / m;
  return x;
}
function normalizeRms(x, rms) {
  let s = 0; for (const v of x) s += v * v; const r = Math.sqrt(s / x.length);
  if (r > 0) for (let i = 0; i < x.length; i++) x[i] *= rms / r;
  let m = 0; for (const v of x) m = Math.max(m, Math.abs(v));
  if (m > 0.95) for (let i = 0; i < x.length; i++) x[i] *= 0.95 / m;
  return x;
}
// filters over a whole array
function lowpass(x, fc, sr) { const k = 1 - Math.exp(-TAU * fc / sr); let y = 0; for (let i = 0; i < x.length; i++) { y += (x[i] - y) * k; x[i] = y; } return x; }
function highpass(x, fc, sr) { const k = 1 - Math.exp(-TAU * fc / sr); let y = 0; for (let i = 0; i < x.length; i++) { y += (x[i] - y) * k; x[i] -= y; } return x; }
function bandpass(x, fc, q, sr) {
  const g = 2 * Math.sin(Math.PI * Math.min(fc, sr / 6) / sr), d = 1 / q; let lp = 0, bp = 0;
  for (let i = 0; i < x.length; i++) { lp += g * bp; const hp = x[i] - lp - d * bp; bp += g * hp; x[i] = bp; }
  return x;
}
const noise = (n, r) => { const x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = r() * 2 - 1; return x; };
function brown(n, r) { const x = new Float32Array(n); let y = 0; for (let i = 0; i < n; i++) { y = (y + (r() * 2 - 1) * 0.06) * 0.998; x[i] = y; } return x; }
// a decaying sine (a ringing mode), added into x at sample i0
function mode(x, i0, f, amp, decay, sr, f1 = f) {
  const n = Math.min(x.length - i0, Math.round(decay * 7 * sr)); let ph = 0;
  for (let i = 0; i < n; i++) { const t = i / sr, fr = f + (f1 - f) * Math.min(1, t / (decay * 3)); ph += TAU * fr / sr; x[i0 + i] += amp * Math.sin(ph) * Math.exp(-t / decay); }
}
// a bubble: pitch rises as it closes
function bubble(x, i0, f0, amp, sr) {
  const dur = Math.min(0.06, 0.004 + 9 / f0), n = Math.min(x.length - i0, Math.round(dur * sr)); let ph = 0;
  for (let i = 0; i < n; i++) { const t = i / sr; ph += TAU * f0 * (1 + 1.4 * t / dur) / sr; x[i0 + i] += amp * Math.sin(ph) * Math.exp(-t / (dur * 0.3)) * Math.min(1, i / 20); }
}
// a burst of noise with an attack and exponential decay, already filtered by the caller's choice
function burst(n, r, attack, decay, sr) {
  const x = noise(n, r); for (let i = 0; i < n; i++) { const t = i / sr; x[i] *= Math.min(1, t / attack) * Math.exp(-t / decay); } return x;
}
const mix = (dst, src, gain = 1, at = 0) => { for (let i = 0; i < src.length && at + i < dst.length; i++) dst[at + i] += src[i] * gain; return dst; };
// render len + fade seconds, then fold the tail over the head so the loop is seamless
function loop(sr, seconds, fade, render) {
  const n = Math.round(seconds * sr), f = Math.round(fade * sr), x = render(n + f), out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = x[i];
  for (let i = 0; i < f; i++) { const k = i / f; out[i] = x[i] * Math.sqrt(k) + x[n + i] * Math.sqrt(1 - k); }
  return out;
}

// A vehicle hitting water: the impact, a slosh, a cloud of bubbles and spray. power ~0.2..1.5.
export function splash(sr, power, seed = 1) {
  const r = rng(seed), P = Math.min(1.5, Math.max(0.15, power)), dur = 0.7 + 0.6 * P, n = Math.round(dur * sr), x = new Float32Array(n);
  mix(x, lowpass(burst(n, r, 0.004, 0.09 + 0.08 * P, sr), 700 - 150 * P, sr), 1.3);
  mix(x, bandpass(burst(n, r, 0.03, 0.22 + 0.15 * P, sr), 420, 0.9, sr), 1.6);
  mix(x, highpass(burst(n, r, 0.008, 0.12 + 0.08 * P, sr), 2600, sr), 0.35 * P);
  const count = Math.round(30 + 70 * P);
  for (let b = 0; b < count; b++) {
    const t = Math.pow(r(), 1.8) * (dur - 0.1), f0 = 380 + Math.pow(r(), 2) * (2600 - 700 * Math.min(1, P));
    bubble(x, Math.round(t * sr), f0, (0.05 + 0.12 * r()) * Math.exp(-t * 2.5), sr);
  }
  return normalize(x, 0.55 + 0.3 * Math.min(1, P));
}

// Wading: a seamless loop of wash and bubbles; the game scales it by depth and speed.
export function wadeLoop(sr, seed = 3) {
  const r = rng(seed);
  return normalizeRms(loop(sr, 2.6, 0.3, n => {
    const x = bandpass(noise(n, r), 650, 0.6, sr);
    for (let i = 0; i < n; i++) { const t = i / sr; x[i] *= 0.5 + 0.3 * Math.sin(TAU * 0.4 * t) + 0.2 * Math.sin(TAU * 1.1 * t + 2); }
    mix(x, lowpass(brown(n, r), 300, sr), 2);
    for (let t = 0; t < n / sr; t += -Math.log(1 - r()) / 45) bubble(x, Math.round(t * sr), 350 + Math.pow(r(), 2) * 1800, 0.05 + 0.08 * r(), sr);
    return x;
  }), 0.22);
}

// Rock breaking under a tire: crack, ringing stone, thud, then falling pebbles. size ~0.2..1.5.
export function crush(sr, size, seed = 4) {
  const r = rng(seed), S = Math.min(1.5, Math.max(0.15, size)), dur = 0.6 + 0.6 * S, n = Math.round(dur * sr), x = new Float32Array(n);
  mix(x, highpass(burst(Math.round(0.02 * sr), r, 0.0003, 0.002 + 0.002 * S, sr), 1200, sr), 1.6);
  for (let k = 0; k < 5; k++) mode(x, 0, 700 + r() * 2600 / (0.6 + S * 0.5), 0.25 * (0.5 + r()), 0.012 + 0.03 * r(), sr);
  mode(x, 0, 95 - 25 * Math.min(1, S), 0.7 * (0.5 + 0.5 * S), 0.07 + 0.06 * S, sr, 45);
  mix(x, lowpass(burst(n, r, 0.002, 0.08 + 0.05 * S, sr), 900, sr), 0.6);
  const pebbles = Math.round(20 + 50 * S);
  for (let k = 0; k < pebbles; k++) {
    const t = 0.03 + Math.pow(r(), 1.6) * (dur - 0.15), i0 = Math.round(t * sr), a = (0.05 + 0.12 * r()) * Math.exp(-t * 2.2);
    mode(x, i0, 1400 + r() * 4600, a, 0.003 + 0.006 * r(), sr);
    if (r() < 0.3) mode(x, i0, 400 + r() * 700, a * 0.8, 0.01, sr);
  }
  mix(x, lowpass(burst(n, r, 0.05, 0.3 * S, sr), 1500, sr), 0.12);   // dust
  return normalize(x, 0.6 + 0.3 * Math.min(1, S));
}

// A bridge plank: a creak building up, then a woody snap and splinters.
export function woodCrack(sr, size = 1, seed = 6) {
  const r = rng(seed), n = Math.round((0.5 + 0.5 * size) * sr), x = new Float32Array(n), creak = Math.round(0.22 * sr);
  // stick-slip creak: an irregular pulse train through the plank's resonance
  const c = new Float32Array(creak);
  for (let t = 0, f = 70; t < creak / sr; t += 1 / f) { f = 70 + 90 * (t / (creak / sr)) + r() * 30; const i = Math.round(t * sr); if (i < creak) c[i] = 1 + r(); }
  mix(x, bandpass(bandpass(c, 520, 4, sr), 520, 3, sr), 0.25 * size);
  const snap = creak;
  mix(x, highpass(burst(Math.round(0.03 * sr), r, 0.0003, 0.004, sr), 800, sr), 1.5, snap);
  for (let k = 0; k < 4; k++) mode(x, snap, 250 + r() * 700, 0.3, 0.02 + 0.04 * r(), sr);
  mode(x, snap, 110, 0.5 * size, 0.09, sr, 60);
  for (let k = 0; k < 18 * size; k++) mode(x, snap + Math.round((0.02 + r() * 0.35) * sr), 900 + r() * 2500, 0.08 * r(), 0.004, sr);
  return normalize(x, 0.7);
}

// Suspension: the axle slamming into a bump, a low thud plus a short metallic clank and rattle.
// strength 0..1; heavy ~1 (scout) .. 3 (mining rig) lowers and lengthens it.
export function bump(sr, strength, heavy = 1, seed = 7) {
  const r = rng(seed), H = Math.max(1, heavy), n = Math.round((0.35 + 0.15 * H) * sr), x = new Float32Array(n);
  mode(x, 0, 78 / Math.sqrt(H), 0.9, 0.06 + 0.035 * H, sr, 38 / Math.sqrt(H));
  mix(x, lowpass(burst(n, r, 0.002, 0.03, sr), 500, sr), 0.6);
  const f = (420 + 200 * r()) / Math.sqrt(H);
  for (const [m, a] of [[1, 0.25], [2.76, 0.16], [5.4, 0.08]]) mode(x, Math.round(0.004 * sr), f * m, a * strength, 0.025 + 0.02 * r(), sr);
  for (let k = 0; k < 3; k++) mode(x, Math.round((0.03 + 0.05 * k + 0.02 * r()) * sr), 900 + r() * 1500, 0.05 * strength, 0.008, sr);
  return normalize(x, 0.25 + 0.6 * Math.min(1, strength));
}

// Tires rolling on a surface, at a reference speed of about 20 km/h.
export function tireLoop(sr, surface, seed = 9) {
  const r = rng(seed);
  const ticks = (x, rate, fLo, fHi, amp, dec) => { for (let t = 0; t < x.length / sr; t += -Math.log(1 - r()) / rate) mode(x, Math.round(t * sr), fLo + r() * (fHi - fLo), amp * Math.pow(r(), 2), dec, sr); };
  const thumps = (x, rate, f, amp) => { for (let t = r() * 0.1; t < x.length / sr; t += (0.6 + 0.8 * r()) / rate) mode(x, Math.round(t * sr), f * (0.8 + 0.4 * r()), amp * (0.5 + r()), 0.05, sr, f * 0.6); };
  const loops = {
    // gravel: a dense crunch of small stones, over a low road rumble
    gravel: n => { const x = lowpass(brown(n, r), 220, sr); for (let i = 0; i < n; i++) x[i] *= 3; ticks(x, 900, 1800, 6000, 0.12, 0.0025); mix(x, highpass(noise(n, r), 3000, sr), 0.05); return x; },
    // dirt: a soft rumble with the odd clod
    dirt: n => { const x = lowpass(lowpass(brown(n, r), 160, sr), 160, sr); for (let i = 0; i < n; i++) x[i] *= 5; ticks(x, 120, 500, 1800, 0.08, 0.004); return x; },
    // rock: hard knocks as the tread climbs over stones, ringing a little
    rock: n => { const x = lowpass(brown(n, r), 140, sr); for (let i = 0; i < n; i++) x[i] *= 3; thumps(x, 6, 90, 0.35); ticks(x, 70, 900, 3000, 0.12, 0.006); return x; },
    // mud: wet sucking and slapping, with bubbles popping in the ruts
    mud: n => {
      const x = lowpass(brown(n, r), 200, sr); for (let i = 0; i < n; i++) x[i] *= 2.5;
      for (let t = 0; t < n / sr; t += 0.07 + 0.12 * r()) {
        const i0 = Math.round(t * sr), m = Math.round(0.11 * sr), s = new Float32Array(Math.min(m, n - i0));
        let lp = 0; const f0 = 900 + 600 * r();
        for (let i = 0; i < s.length; i++) { const u = i / m, k = 1 - Math.exp(-TAU * (f0 * (1 - 0.8 * u)) / sr); lp += ((r() * 2 - 1) - lp) * k; s[i] = lp * Math.sin(Math.PI * u) * 0.9; }
        mix(x, s, 0.8 + 0.6 * r(), i0);
        if (r() < 0.5) bubble(x, i0 + Math.round(0.05 * sr), 140 + r() * 320, 0.25, sr);
      }
      return x;
    },
    // wood: hollow plank knocks under each tire
    wood: n => { const x = lowpass(brown(n, r), 180, sr); for (let i = 0; i < n; i++) x[i] *= 2; thumps(x, 7, 170, 0.3); ticks(x, 30, 400, 900, 0.06, 0.02); return x; },
  };
  return normalizeRms(loop(sr, 2.4, 0.25, loops[surface] ?? loops.dirt), 0.2);
}

// The driveline straining under a heavy climb: a low, slowly wavering groan.
export function strainLoop(sr, seed = 14) {
  const r = rng(seed);
  return normalizeRms(loop(sr, 3, 0.4, n => {
    const a = bandpass(brown(n, r), 105, 9, sr), b = bandpass(brown(n, r), 168, 7, sr), x = new Float32Array(n);
    for (let i = 0; i < n; i++) { const t = i / sr; x[i] = a[i] * (0.6 + 0.4 * Math.sin(TAU * 0.33 * t)) + b[i] * (0.5 + 0.5 * Math.sin(TAU * 0.21 * t + 1)); }
    return x;
  }), 0.2);
}
