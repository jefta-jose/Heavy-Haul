// Garage tuning: levels 0-100 in steps of 10 on every knob, for every playable car (no per-car
// code). Stock stays untouched, and the levels really change how the car drives.
import test from 'node:test';
import assert from 'node:assert/strict';
import { KNOBS, applyTuning, clampLevel, multiplier, tunedStat, levelColor } from '../src/game/tuning.js';
import { content, newSim, spawn, advance } from './helpers.js';

test('levels snap to steps of 10 between 0 and 100', () => {
  assert.equal(clampLevel(37), 40); assert.equal(clampLevel(-20), 0); assert.equal(clampLevel(250), 100); assert.equal(clampLevel('x'), 0);
  for (const k of KNOBS) { assert.equal(multiplier(k, 0), 1); assert.equal(multiplier(k, 100), k.max); assert(multiplier(k, 50) > 1 && multiplier(k, 50) < k.max); }
  assert.equal(tunedStat(40, {}, 'power'), 40); assert.equal(tunedStat(40, { power: 100 }, 'power'), 100); assert.equal(tunedStat(40, { power: 50 }, 'power'), 70);
  assert.equal(levelColor(0), 'rgb(233,156,25)'); assert.equal(levelColor(100), 'rgb(57,214,106)');
});

test('every knob tunes every playable car and leaves the original alone', () => {
  for (const car of [...content.cars, ...content.service]) {
    const before = JSON.stringify(car);
    const t = applyTuning(car, Object.fromEntries(KNOBS.map(k => [k.id, 100])));
    assert.equal(JSON.stringify(car), before, `${car.id}: original untouched`);
    assert.equal(t.drivetrain.torqueScale, car.drivetrain.torqueScale * 3, `${car.id}: power x3 at 100`);
    assert.equal(t.drivetrain.gears.H, car.drivetrain.gears.H / 2, `${car.id}: top speed`);
    assert.equal(t.physics.tireGrip, 2, `${car.id}: grip`);
    assert.equal(t.physics.mass, car.physics.mass / 2, `${car.id}: lighter chassis`);
    assert(t.tuned);
    const s = newSim(t); s.init(30); advance(s, 1);
    assert(Number.isFinite(s.truck.getPosition().y), `${car.id}: tuned car simulates`);
  }
  assert.equal(applyTuning(content.car, {}).tuned, false, 'level 0 is stock');
});

test('tuning changes the drive: more power and grip, less fuel', () => {
  const stock = content.car;
  const metres = (car, x, s = 10) => { const sim = spawn(newSim(car), x); const x0 = sim.truck.getPosition().x; sim.ctl.gas = 1; advance(sim, s); return sim.truck.getPosition().x - x0; };
  const flat = car => { const sim = spawn(newSim(car), 30, { gear: 'H', awd: true, diff: false }); sim.ctl.gas = 1; advance(sim, 2); return sim.st.speed; };
  assert(flat(applyTuning(stock, { power: 50 })) > flat(stock) * 1.3, 'power 50 accelerates harder');
  assert(metres(applyTuning(stock, { grip: 100 }), 600) > metres(stock, 600), 'full grip goes further in mud');
  const burn = car => { const sim = spawn(newSim(car), 440); const f0 = sim.st.fuel; sim.ctl.gas = 1; advance(sim, 8); return f0 - sim.st.fuel; };
  assert(burn(applyTuning(stock, { economy: 100 })) < burn(stock) * 0.6, 'full economy burns less fuel');
});
