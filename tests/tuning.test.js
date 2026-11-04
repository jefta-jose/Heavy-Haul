// Garage tuning: levels 0-100 in steps of 25 on every knob, for every playable car (no per-car
// code). Stock stays untouched, and the levels really change how the car drives.
import test from 'node:test';
import assert from 'node:assert/strict';
import { KNOBS, upgradeCost, withPowers, applyTuning, clampLevel, tunedStat, levelColor, validLevels } from '../src/game/tuning.js';
import { content, newSim, spawn, advance } from './helpers.js';

test('four knobs, levels in steps of 25, and every car can take all four to 100', () => {
  assert.deepEqual(KNOBS.map(k => k.id), ['engine', 'suspension', 'speed', 'grip']);
  assert.equal(clampLevel(37), 25); assert.equal(clampLevel(40), 50); assert.equal(clampLevel(-20), 0); assert.equal(clampLevel(250), 100); assert.equal(clampLevel('x'), 0);
  const all = Object.fromEntries(KNOBS.map(k => [k.id, 100]));
  assert.deepEqual(validLevels(content.car, all), all, 'no limit on how many knobs are full');
  assert.deepEqual(validLevels(content.car, { power: 100, load: 100, engine: 30 }), { engine: 25 }, 'old knob ids are dropped');
  assert.equal(tunedStat(40, {}, 'power'), 40); assert.equal(tunedStat(40, { engine: 100 }, 'power'), 100); assert.equal(tunedStat(40, { engine: 50 }, 'power'), 70);
  assert.equal(levelColor(0), 'rgb(233,156,25)'); assert.equal(levelColor(100), 'rgb(57,214,106)');
});

test('each knob tunes every playable car and leaves the original alone', () => {
  for (const car of [...content.cars, ...content.service]) {
    const before = JSON.stringify(car);
    const e = applyTuning(car, { engine: 100, speed: 100 }), c = applyTuning(car, { grip: 100 }), s = applyTuning(car, { suspension: 100 });
    const full = applyTuning(car, Object.fromEntries(KNOBS.map(k => [k.id, 100])));
    assert.equal(JSON.stringify(car), before, `${car.id}: original untouched`);
    assert.equal(e.drivetrain.torqueScale, car.drivetrain.torqueScale * 2.5, `${car.id}: engine power`);
    assert(e.drivetrain.throttleRise > car.drivetrain.throttleRise && e.drivetrain.fuelBurn < 1, `${car.id}: response and economy`);
    assert(Math.abs(e.drivetrain.gears.H - car.drivetrain.gears.H / 1.7) < 1e-9 && e.drivetrain.gears.L < car.drivetrain.gears.L, `${car.id}: speed`);
    assert(c.physics.tireGrip > 1.7 && c.drivetrain.brakeTorque > car.drivetrain.brakeTorque, `${car.id}: grip and brakes`);
    assert.equal(c.physics.mudPull, (car.physics.mudPull ?? 1) * 2, `${car.id}: mud pull`);
    assert.equal(full.physics.mass, car.physics.mass, `${car.id}: frame weight stays stock`);
    assert.equal(full.physics.load?.massT, car.physics.load?.massT, `${car.id}: load stays stock`);
    assert(s.physics.suspension.travelUp > car.physics.suspension.travelUp, `${car.id}: suspension`);
    assert(e.tuned && c.tuned);
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
  const pulling = structuredClone(stock); pulling.physics.mudPull = 2;
  assert(metres(pulling, 600) > metres(stock, 600), 'mud pull alone goes further in mud');
  const inGear = (car, gear) => { const sim = spawn(newSim(car), 600, { gear }); sim.ctl.gas = 1; advance(sim, 10); return sim.truck.getPosition().x; };
  for (const gear of ['H', 'R']) assert.equal(inGear(pulling, gear), inGear(stock, gear), `mud pull does nothing in ${gear}`);
  const burn = car => { const sim = spawn(newSim(car), 1650); const f0 = sim.st.fuel; sim.ctl.gas = 1; advance(sim, 8); return f0 - sim.st.fuel; };
  // economy rides on the engine knob, which also adds power (and so burn); per metre it still saves
  const perMetre = car => { const sim = spawn(newSim(car), 1650); const f0 = sim.st.fuel, x0 = sim.truck.getPosition().x; sim.ctl.gas = 1; advance(sim, 8); return (f0 - sim.st.fuel) / Math.max(1, sim.truck.getPosition().x - x0); };
  assert(burn(stock) > 0);
  assert(perMetre(applyTuning(stock, { engine: 100 })) < perMetre(stock), 'a tuned engine burns less per metre');
});

// Ruts are not softened for anyone: tuning is how a light truck gets through, and the breakdown
// truck is for when even that is not enough.
test('a fully tuned scout covers the mud a stock one bogs down in', () => {
  const scout = content.cars.find(c => c.id === 'swamp-scout-4'); if (!scout) return;
  const max = Object.fromEntries(KNOBS.map(k => [k.id, 100]));
  const metres = car => [640, 1135, 1480].map(x => { const s = spawn(newSim(car), x); const x0 = s.truck.getPosition().x; s.ctl.gas = 1; advance(s, 20); return s.truck.getPosition().x - x0; });
  const stock = metres(scout), tuned = metres(applyTuning(scout, max));
  stock.forEach((m, i) => assert(tuned[i] > Math.max(40, m * 2), `spot ${i}: tuned ${tuned[i].toFixed(0)} m vs stock ${m.toFixed(0)} m in 20 s`));
});

test('upgrades cost more each step and more on bigger classes, and selling refunds exactly', () => {
  const scout = { class: 'scout' }, heavy = { class: 'heavy' };
  assert.equal(upgradeCost(scout, 0, 25), 400);
  assert(upgradeCost(scout, 75, 100) > upgradeCost(scout, 0, 25), 'later steps cost more');
  assert(upgradeCost(heavy, 0, 25) > upgradeCost(scout, 0, 25), 'bigger classes cost more');
  assert.equal(upgradeCost(scout, 100, 0), -upgradeCost(scout, 0, 100), 'selling refunds what it cost');
});

test('a superpower lifts an upgrade to full, past full when already maxed, without touching the car', () => {
  const stock = content.car, torque = c => c.drivetrain.torqueScale;
  const mid = applyTuning(stock, { engine: 25 }), full = applyTuning(stock, { engine: 100 });
  assert.equal(torque(withPowers(mid, ['engine'])), torque(full), 'a part-tuned engine gets the full upgrade');
  const past = torque(withPowers(full, ['engine'])) / torque(full);
  assert(past > 1.8 && past < 2.2, `a maxed engine about doubles: ${past.toFixed(2)}`);
  assert.equal(torque(mid), torque(applyTuning(stock, { engine: 25 })), 'the car itself is unchanged');
});

test('driving through a pickup gives 12 seconds of its power, and any power blocks hit damage', () => {
  const s = newSim(content.car, { powers: true }), x = content.season.trail.powerups[0].x;
  spawn(s, x - 3); const first = s.powerups[0];
  assert(s.powerups.length, 'the trail has pickups');
  assert(first.taken, 'picked up'); assert.equal(Object.keys(s.main.st.powers)[0], first.kind); assert(s.main.boosted, 'the truck drives boosted');
  advance(s, 13);
  assert.deepEqual(s.main.st.powers, {}, 'it runs out'); assert.equal(s.main.boosted, null, 'and the truck goes back to normal');
  s.init(); assert(!s.powerups[0].taken, 'a new run puts the pickups back');
  // into the first logs at speed, with and without a power
  const crash = power => { const c = spawn(newSim(content.car), 40); c.main.st.powers = power ? { [power]: 99 } : {}; c.main.parts.truck.setLinearVelocity({ x: 15, y: 0 }); advance(c, 2); return c.main.st.damage; };
  assert(crash(null) > 0, 'a hard hit hurts');
  for (const k of KNOBS) assert.equal(crash(k.id), 0, `not under the ${k.id} power`);
});

test('mud pull only works in the short gear, except under the grip power', () => {
  const car = applyTuning(content.car, { grip: 100 }), x = content.season.trail.heavyMud[0] - 8;
  const metres = (gear, power) => {
    const s = spawn(newSim(car), x, { gear }); s.main.st.powers = power ? { grip: 99 } : {};
    const x0 = s.truck.getPosition().x; s.ctl.gas = 1; advance(s, 8); return s.truck.getPosition().x - x0;
  };
  assert(metres('H', true) > metres('H', false), 'in the long gear only the power brings it');
  assert.equal(metres('L', true), metres('L', false), 'in the short gear it works either way');
});
