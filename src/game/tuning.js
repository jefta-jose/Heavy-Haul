// Garage tuning: each knob has a level from 0 (stock) to 100 (fully tuned), in steps of 10. A level
// maps to a multiplier on the car's own car.json values, from 1 at stock to `max` at 100, so every
// car, present or future, tunes with no per-car code. `stat` names the garage stat bar it lifts.

export const STEP = 10, MAX_LEVEL = 100;
const scale = (obj, key, k) => { if (obj && typeof obj[key] === 'number') obj[key] *= k; };

export const KNOBS = [
  { id: 'power', label: 'Engine power', hint: 'torque and how hard it accelerates', max: 3, stat: 'power',
    apply: (c, k) => { scale(c.drivetrain, 'torqueScale', k); scale(c.drivetrain.driveRamp, 'base', k); scale(c.drivetrain.driveRamp, 'launch', k); } },
  { id: 'topSpeed', label: 'Top speed', hint: 'taller high gear: faster, less pull', max: 2, stat: 'speed',
    apply: (c, k) => scale(c.drivetrain.gears, 'H', 1 / k) },
  { id: 'crawl', label: 'Low-range pull', hint: 'low-range and reverse gearing', max: 2,
    apply: (c, k) => { scale(c.drivetrain.gears, 'L', k); scale(c.drivetrain.gears, 'R', k); } },
  { id: 'response', label: 'Throttle response', hint: 'how fast power comes in', max: 2.5,
    apply: (c, k) => { scale(c.drivetrain, 'throttleRise', k); scale(c.drivetrain.driveRamp, 'base', k); scale(c.drivetrain.driveRamp, 'launch', k); } },
  { id: 'grip', label: 'Tire grip', hint: 'friction on every surface', max: 2, stat: 'grip',
    apply: (c, k) => { c.physics.tireGrip = (c.physics.tireGrip ?? 1) * k; } },
  { id: 'brakes', label: 'Brakes', hint: 'braking torque', max: 3,
    apply: (c, k) => scale(c.drivetrain, 'brakeTorque', k) },
  { id: 'travel', label: 'Suspension travel', hint: 'how far the wheels move', max: 2,
    apply: (c, k) => { scale(c.physics.suspension, 'travelUp', k); scale(c.physics.suspension, 'travelDown', k); } },
  { id: 'softness', label: 'Suspension softness', hint: 'softer springs soak up bumps', max: 2,
    apply: (c, k) => scale(c.physics.suspension, 'sag', k) },
  { id: 'damping', label: 'Shock damping', hint: 'bounces settle faster', max: 2,
    apply: (c, k) => scale(c.physics.suspension, 'damping', k) },
  { id: 'lightness', label: 'Lighter chassis', hint: 'less empty weight', max: 2,
    apply: (c, k) => scale(c.physics, 'mass', 1 / k) },
  { id: 'capacity', label: 'Load capacity', hint: 'carries a heavier load', max: 3, stat: 'capacity',
    apply: (c, k) => { if (c.physics.load) scale(c.physics.load, 'massT', k); if (c.load) scale(c.load, 'massT', k); } },
  { id: 'economy', label: 'Fuel economy', hint: 'burns less fuel', max: 3,
    apply: (c, k) => { c.drivetrain.fuelBurn = (c.drivetrain.fuelBurn ?? 1) / k; } },
];

export const clampLevel = v => Math.max(0, Math.min(MAX_LEVEL, Math.round((Number(v) || 0) / STEP) * STEP));
export const multiplier = (knob, level) => 1 + (knob.max - 1) * clampLevel(level) / MAX_LEVEL;

// A tuned copy of the car; the original stays untouched. `levels` is { knobId: 0..100 }.
export function applyTuning(car, levels = {}) {
  const c = structuredClone(car);
  for (const knob of KNOBS) {
    const level = clampLevel(levels[knob.id]);
    if (level > 0) knob.apply(c, multiplier(knob, level));
  }
  c.tuned = KNOBS.some(k => clampLevel(levels[k.id]) > 0);
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
