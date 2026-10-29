// Garage tuning: five knobs, each a level from 0 (stock) to 100 in steps of 25 (four taps to full), and every car can
// take all five to 100. A knob moves several car.json values together (the twelve old single-purpose
// knobs, grouped), each from 1 at stock to its own `max` multiplier at 100, so every car, present or
// future, tunes with no per-car code. `stat` names the garage stat bar a knob lifts.

export const STEP = 25, MAX_LEVEL = 100;
const scale = (obj, key, k) => { if (obj && typeof obj[key] === 'number') obj[key] *= k; };
// a part's own multiplier at the knob's multiplier t (0..1 of the way to full)
const part = (max, t) => 1 + (max - 1) * t;

export const KNOBS = [
  { id: 'engine', label: 'Engine', hint: 'power, throttle response, fuel economy', stat: 'power',
    apply: (c, t) => {
      const p = part(2.5, t), r = part(2, t);
      scale(c.drivetrain, 'torqueScale', p); scale(c.drivetrain, 'throttleRise', r);
      scale(c.drivetrain.driveRamp, 'base', p * r); scale(c.drivetrain.driveRamp, 'launch', p * r);
      c.drivetrain.fuelBurn = (c.drivetrain.fuelBurn ?? 1) / part(1.6, t);
    } },
  { id: 'suspension', label: 'Suspension', hint: 'travel, softer springs, firmer shocks',
    apply: (c, t) => {
      const s = c.physics.suspension;
      scale(s, 'travelUp', part(1.8, t)); scale(s, 'travelDown', part(1.8, t)); scale(s, 'sag', part(1.6, t)); scale(s, 'damping', part(1.8, t));
    } },
  { id: 'speed', label: 'Speed', hint: 'longer gears: faster in high, low and reverse', stat: 'speed',
    apply: (c, t) => { scale(c.drivetrain.gears, 'H', 1 / part(1.7, t)); scale(c.drivetrain.gears, 'L', 1 / part(1.3, t)); scale(c.drivetrain.gears, 'R', 1 / part(1.3, t)); } },
  { id: 'grip', label: 'Grip', hint: 'tire grip on every surface, and brakes', stat: 'grip',
    apply: (c, t) => { c.physics.tireGrip = (c.physics.tireGrip ?? 1) * part(1.8, t); scale(c.drivetrain, 'brakeTorque', part(2.5, t)); } },
  { id: 'load', label: 'Load weight', hint: 'carries a heavier load on a lighter frame', stat: 'capacity',
    apply: (c, t) => {
      scale(c.physics, 'mass', 1 / part(1.7, t));
      if (c.physics.load) scale(c.physics.load, 'massT', part(2.5, t)); if (c.load) scale(c.load, 'massT', part(2.5, t));
    } },
];

export const clampLevel = v => Math.max(0, Math.min(MAX_LEVEL, Math.round((Number(v) || 0) / STEP) * STEP));
// Saved levels from older builds (other knob ids) are dropped.
export const validLevels = (car, levels = {}) => Object.fromEntries(KNOBS.map(k => [k.id, clampLevel(levels[k.id])]).filter(([, l]) => l > 0));

// A tuned copy of the car; the original stays untouched. `levels` is { knobId: 0..100 }.
export function applyTuning(car, levels = {}) {
  const c = structuredClone(car), valid = validLevels(car, levels);
  for (const knob of KNOBS) { const level = valid[knob.id] ?? 0; if (level > 0) knob.apply(c, level / MAX_LEVEL); }
  c.tuned = Object.keys(valid).length > 0;
  return c;
}

// A garage stat bar (0..100) lifted by the knob tied to it: at level 100 the bar is full.
export function tunedStat(base, levels, stat) {
  const knob = KNOBS.find(k => k.stat === stat), level = knob ? clampLevel(levels?.[knob.id]) : 0;
  return base + (100 - base) * level / MAX_LEVEL;
}

// Bar colour from the stock orange to green as the level rises.
export function levelColor(level) {
  const t = clampLevel(level) / MAX_LEVEL, a = [233, 156, 25], b = [57, 214, 106];
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`;
}

// Saved per car in the browser.
const KEY = 'hh_tuning_levels';
export function loadTuning() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
export function saveTuning(all) { try { localStorage.setItem(KEY, JSON.stringify(all)); } catch (e) {} }
