// Garage tuning: levels 0-100 in steps of 25 on every knob, for every playable car (no per-car
// code). Stock stays untouched, and the levels really change how the car drives.
import test from 'node:test';
import assert from 'node:assert/strict';
import { KNOBS, applyTuning, clampLevel, tunedStat, levelColor, validLevels } from '../src/game/tuning.js';
import { content, newSim, spawn, advance } from './helpers.js';

test('five knobs, levels in steps of 10, and every car can take all five to 100', () => {
  assert.deepEqual(KNOBS.map(k => k.id), ['engine', 'suspension', 'speed', 'grip', 'load']);
  assert.equal(clampLevel(37), 25); assert.equal(clampLevel(40), 50); assert.equal(clampLevel(-20), 0); assert.equal(clampLevel(250), 100); assert.equal(clampLevel('x'), 0);
  const all = Object.fromEntries(KNOBS.map(k => [k.id, 100]));
  assert.deepEqual(validLevels(content.car, all), all, 'no limit on how many knobs are full');
  assert.deepEqual(validLevels(content.car, { power: 100, gearbox: 60, engine: 30 }), { engine: 25 }, 'old knob ids are dropped');
  assert.equal(tunedStat(40, {}, 'power'), 40); assert.equal(tunedStat(40, { engine: 100 }, 'power'), 100); assert.equal(tunedStat(40, { engine: 50 }, 'power'), 70);
  assert.equal(levelColor(0), 'rgb(233,156,25)'); assert.equal(levelColor(100), 'rgb(57,214,106)');
});

test('each knob tunes every playable car and leaves the original alone', () => {
  for (const car of [...content.cars, ...content.service]) {
    const before = JSON.stringify(car);
    const e = applyTuning(car, { engine: 100, speed: 100 }), c = applyTuning(car, { grip: 100, load: 100 }), s = applyTuning(car, { suspension: 100 });
    const full = applyTuning(car, Object.fromEntries(KNOBS.map(k => [k.id, 100])));
    assert.equal(JSON.stringify(car), before, `${car.id}: original untouched`);
    assert.equal(e.drivetrain.torqueScale, car.drivetrain.torqueScale * 2.5, `${car.id}: engine power`);
    assert(e.drivetrain.throttleRise > car.drivetrain.throttleRise && e.drivetrain.fuelBurn < 1, `${car.id}: response and economy`);
    assert(Math.abs(e.drivetrain.gears.H - car.drivetrain.gears.H / 1.7) < 1e-9 && e.drivetrain.gears.L < car.drivetrain.gears.L, `${car.id}: speed`);
    assert(c.physics.tireGrip > 1.7 && c.drivetrain.brakeTorque > car.drivetrain.brakeTorque, `${car.id}: grip and brakes`);
    assert(c.physics.mass < car.physics.mass, `${car.id}: lighter frame`);
    assert(s.physics.suspension.travelUp > car.physics.suspension.travelUp, `${car.id}: suspension`);
    assert(e.tuned && c.tuned);
    assert(c.physics.load ? c.physics.load.massT > car.physics.load.massT : true, `${car.id}: heavier load`);
    for (const t of [e, c, s, full]) { const sim = newSim(t); sim.init(30); advance(sim, 1); assert(Number.isFinite(sim.truck.getPosition().y), `${car.id}: tuned car simulates`); }
  }
  assert.equal(applyTuning(content.car, {}).tuned, false, 'level 0 is stock');
});

test('tuning changes the drive: more power and grip, less fuel', () => {
  const stock = content.car;
  const metres = (car, x, s = 10) => { const sim = spawn(newSim(car), x); const x0 = sim.truck.getPosition().x; sim.ctl.gas = 1; advance(sim, s); return sim.truck.getPosition().x - x0; };
  const flat = car => { const sim = spawn(newSim(car), 30, { gear: 'H', awd: true, diff: false }); sim.ctl.gas = 1; advance(sim, 2); return sim.st.speed; };
  assert(flat(applyTuning(stock, { engine: 50 })) > flat(stock) * 1.3, 'engine 50 accelerates harder');
  assert(metres(applyTuning(stock, { grip: 100 }), 600) > metres(stock, 600), 'full grip goes further in mud');
  const burn = car => { const sim = spawn(newSim(car), 440); const f0 = sim.st.fuel; sim.ctl.gas = 1; advance(sim, 8); return f0 - sim.st.fuel; };
  // economy rides on the engine knob, which also adds power (and so burn); per metre it still saves
  const perMetre = car => { const sim = spawn(newSim(car), 440); const f0 = sim.st.fuel, x0 = sim.truck.getPosition().x; sim.ctl.gas = 1; advance(sim, 8); return (f0 - sim.st.fuel) / Math.max(1, sim.truck.getPosition().x - x0); };
  assert(burn(stock) > 0);
  assert(perMetre(applyTuning(stock, { engine: 100 })) < perMetre(stock), 'a tuned engine burns less per metre');
});

// Ruts are not softened for anyone: tuning is how a light truck gets through, and the breakdown
// truck is for when even that is not enough.
test('a fully tuned scout covers the mud a stock one bogs down in', () => {
  const scout = content.cars.find(c => c.id === 'swamp-scout-4'); if (!scout) return;
  const max = Object.fromEntries(KNOBS.map(k => [k.id, 100]));
  const metres = car => [640, 1110, 1420].map(x => { const s = spawn(newSim(car), x); const x0 = s.truck.getPosition().x; s.ctl.gas = 1; advance(s, 20); return s.truck.getPosition().x - x0; });
  const stock = metres(scout), tuned = metres(applyTuning(scout, max));
  stock.forEach((m, i) => assert(tuned[i] > Math.max(40, m * 2), `spot ${i}: tuned ${tuned[i].toFixed(0)} m vs stock ${m.toFixed(0)} m in 20 s`));
});
