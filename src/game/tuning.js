import { UPGRADE_STEP_COSTS, UPGRADE_COST_BY_CLASS, POWER_TIMES } from '../game-config.js';
// Garage tuning: four knobs, each a level from 0 (stock) to 100 in steps of 25 (four taps to full), and every car can
// take all four to 100. A car's weight and load are never tuned: they stay as its car.json has them. A knob moves several car.json values together (the twelve old single-purpose
// knobs, grouped), each from 1 at stock to its own `max` multiplier at 100, so every car, present or
// future, tunes with no per-car code. `stat` names the garage stat bar a knob lifts.

export const STEP = 25, MAX_LEVEL = 100;
const scale = (obj, key, k) => { if (obj && typeof obj[key] === 'number') obj[key] *= k; };
// a part's own multiplier at the knob's multiplier t (0..1 of the way to full)
const part = (max, t) => 1 + (max - 1) * t;

// What going between two levels costs a car: positive to buy, negative for what selling refunds.
export function upgradeCost(car, from, to) {
  const k = UPGRADE_COST_BY_CLASS[car.class] ?? 1, step = i => UPGRADE_STEP_COSTS[i] * k, lo = Math.min(from, to) / STEP, hi = Math.max(from, to) / STEP;
  let total = 0; for (let i = lo; i < hi; i++) total += step(i);
  return to >= from ? total : -total;
}

export const KNOBS = [
  { id: 'engine', label: 'Engine', hint: 'power, throttle response, fuel economy', stat: 'power',
    apply: (c, t) => {
      const p = part(2.5, t), r = part(2, t);
      scale(c.drivetrain, 'torqueScale', p); scale(c.drivetrain, 'throttleRise', r);
      c.drivetrain.torqueTune = (c.drivetrain.torqueTune ?? 1) * p;   // so the class's minimum pull (simulation.js) is judged on the stock engine, and upgrades add on top
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
  { id: 'grip', label: 'Grip', hint: 'grip, brakes, mud pull in L', stat: 'grip',
    apply: (c, t) => {
      c.physics.tireGrip = (c.physics.tireGrip ?? 1) * part(1.8, t); scale(c.drivetrain, 'brakeTorque', part(2.5, t));
      c.physics.mudPull = (c.physics.mudPull ?? 1) * part(2, t);
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
  c.levels = valid;
  Object.defineProperty(c, 'stock', { value: car.stock ?? car });   // hidden, so copies of the car stay small
  return c;
}

// Powers do what upgrades can't, and a truck has one at a time. The simulation reads `car.power`.
const { invincible, nitro } = POWER_TIMES;
export const POWERS = [
  { id: 'invincible', label: 'Invincible', what: `Tap the button: no hit hurts for ${invincible.seconds} s, then it recharges for ${invincible.cooldown} s` },
  { id: 'nitro', label: 'Nitro', what: `Tap the button: nitro speed for ${nitro.seconds} s, then instant brakes on your next brake tap to save the truck. Recharges for ${nitro.cooldown} s` },
];
export const withPower = (car, id) => POWERS.some(p => p.id === id) ? { ...car, power: id } : car;

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

// Each car's chosen power, one at a time: saved per car in the browser, so it stays on until that car gets another.
const POWER_KEY = 'hh_powers';
// Instant brakes became part of Nitro (2026-11-11): a truck that had them gets Nitro
export function loadPowers() { try { return Object.fromEntries(Object.entries(JSON.parse(localStorage.getItem(POWER_KEY)) || {}).map(([car, id]) => [car, id === 'brakes' ? 'nitro' : id]).filter(([, id]) => POWERS.some(p => p.id === id))); } catch (e) { return {}; } }
export function savePowers(all) { try { localStorage.setItem(POWER_KEY, JSON.stringify(all)); } catch (e) {} }
