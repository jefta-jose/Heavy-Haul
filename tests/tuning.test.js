// Garage tuning: levels 0-100 in steps of 25 on every knob, for every playable car (no per-car
// code). Stock stays untouched, and the levels really change how the car drives.
import test from 'node:test';
import assert from 'node:assert/strict';
import { KNOBS, upgradeCost, POWERS, withPower, applyTuning, clampLevel, tunedStat, levelColor, validLevels } from '../src/game/tuning.js';
import { POWER_TIMES, DAMAGE_START_KMH, RANK_XP } from '../src/game-config.js';
import { rankFor, classXp } from '../src/game/progress.js';
import { createMissions } from '../src/game/missions.js';
import fs from 'node:fs';
import { releaseCode } from './release-build.js';
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
  assert(metres(applyTuning(stock, { grip: 100 }), 1100) > metres(stock, 1100), 'full grip goes further in mud');
  const pulling = structuredClone(stock); pulling.physics.mudPull = 2;
  assert(metres(pulling, 1100) > metres(stock, 1100), 'mud pull alone goes further in mud');
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
  const metres = car => [1135, 1830, 2030].map(x => { const s = spawn(newSim(car), x); const x0 = s.truck.getPosition().x; s.ctl.gas = 1; advance(s, 20); return s.truck.getPosition().x - x0; });
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

test('a power is a label on the car, and changes none of its numbers', () => {
  const tuned = applyTuning(content.car, { engine: 50 }), { power, ...rest } = withPower(tuned, 'brakes');
  assert.equal(power, 'brakes');
  assert.deepEqual(rest, { ...tuned }, 'the same truck otherwise');
  assert.equal(withPower(tuned, null), tuned, 'no power, no change');
  assert.equal(withPower(tuned, 'grip'), tuned, 'an old saved power is ignored');
  assert.deepEqual(POWERS.map(p => p.id), ['invincible', 'brakes']);
  for (const p of POWERS) assert(POWER_TIMES[p.id].seconds > 0 && POWER_TIMES[p.id].cooldown > 0, `${p.id} has a cooldown`);
});

test('invincible: a tap stops hit damage for its time, then it recharges before it can be used again', () => {
  const crash = (car, shield) => { const c = spawn(newSim(car), 40); if (shield) assert(c.usePower(), 'the shield starts'); c.main.parts.truck.setLinearVelocity({ x: 15, y: 0 }); advance(c, 2); return c.main.st.damage; };
  const car = withPower(content.car, 'invincible');
  assert(crash(content.car, false) > 0, 'a hard hit hurts');
  assert(crash(car, false) > 0, 'and still does until the shield is used');
  assert.equal(crash(car, true), 0, 'not under the shield');
  assert.equal(spawn(newSim(content.car), 30).usePower(), false, 'no power, no shield');
  const s = spawn(newSim(car), 30);
  assert(s.usePower()); assert.equal(s.usePower(), false, 'not twice at once');
  advance(s, POWER_TIMES.invincible.seconds + 0.1);
  assert.equal(s.main.st.powerT, 0, 'it runs out');
  assert(s.main.st.powerCoolT > POWER_TIMES.invincible.cooldown - 1, 'then recharges');
  assert.equal(s.usePower(), false, 'not while recharging');
  advance(s, POWER_TIMES.invincible.cooldown);
  assert.equal(s.main.st.powerCoolT, 0);
  assert(s.usePower(), 'and is ready again');
  s.init(); assert.equal(s.main.st.powerT, 0, 'a new run starts ready');
});

const flatRoad = () => content.season.trail.highways[0].x0 + 10;
const gross = c => c.physics.mass + (c.physics.load?.massT ?? 0) * 1000, heaviest = () => [...content.cars].sort((a, b) => gross(b) - gross(a))[0];

test('instant brakes stop any truck almost at once, then need to recharge', () => {
  const rolling = car => { const s = spawn(newSim(car), flatRoad()); s.ctl.auto = true; s.truck.setLinearVelocity({ x: 15, y: 0 }); for (const w of s.main.parts.wheels) w.setAngularVelocity(-15 / car.rig.radius); return s; };
  const after = car => { const s = rolling(car); s.ctl.brake = 1; advance(s, 0.5); return s.st.speed; };
  for (const car of [content.car, heaviest()]) {
    assert(after(withPower(car, 'brakes')) < 1, `${car.id} stops`);
    assert(after(car) > 5, `${car.id} does not without the power`);
  }
  const s = rolling(withPower(content.car, 'brakes'));
  s.ctl.brake = 1; advance(s, POWER_TIMES.brakes.seconds + 0.2); s.ctl.brake = 0;
  assert(s.st.powerCoolT > POWER_TIMES.brakes.cooldown - 1, 'it recharges after use');
  s.truck.setLinearVelocity({ x: 15, y: 0 }); for (const w of s.main.parts.wheels) w.setAngularVelocity(-15 / content.car.rig.radius);
  s.ctl.brake = 1; advance(s, 0.5); s.ctl.brake = 0;
  assert(s.st.speed > 5, `normal brakes while it does: ${s.st.speed.toFixed(1)} m/s`);
  advance(s, POWER_TIMES.brakes.cooldown);
  assert.equal(s.st.powerCoolT, 0, 'then it is ready');
  const slow = DAMAGE_START_KMH / 3.6 * 0.8, t = spawn(newSim(withPower(content.car, 'brakes')), flatRoad()); t.ctl.auto = true;
  t.truck.setLinearVelocity({ x: slow, y: 0 }); for (const w of t.main.parts.wheels) w.setAngularVelocity(-slow / content.car.rig.radius);
  t.ctl.brake = 1; advance(t, 0.3);
  assert.equal(t.st.powerT + t.st.powerCoolT, 0, `braking under ${DAMAGE_START_KMH} km/h leaves it ready`);
});

test('mud pull only works in the short gear', () => {
  const car = applyTuning(content.car, { grip: 100 }), x = content.season.trail.heavyMud[0] - 8;
  const metres = gear => { const s = spawn(newSim(car), x, { gear }), x0 = s.truck.getPosition().x; s.ctl.gas = 1; advance(s, 8); return s.truck.getPosition().x - x0; };
  assert(metres('L') > metres('H'), 'low gear pulls harder through the mud');
});

test('ranks: 20 of them up to 40,000 XP, each opening one truck in every class to buy', async () => {
  const code = await releaseCode('src/game/progress.js');
  const { createProgress } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
  const config = await releaseCode('src/game-config.js');
  const release = await import(`data:text/javascript;base64,${Buffer.from(config).toString('base64')}`);
  assert.equal(release.STARTING_COINS, 20000); assert.equal(release.STARTING_RANK, 1);
  assert.equal(RANK_XP.length, 20); assert.equal(RANK_XP[0], 0); assert.equal(RANK_XP[19], 40000);
  RANK_XP.forEach((x, i) => i && assert(x > RANK_XP[i - 1], 'XP rises every rank'));
  assert.equal(rankFor(0), 1); assert.equal(rankFor(199), 1); assert.equal(rankFor(200), 2); assert.equal(rankFor(39999), 19); assert.equal(rankFor(1e9), 20);
  const roster = content.roster.cars;
  for (const cls of content.roster.classes.map(c => c.id)) {
    const ranks = roster.filter(c => c.class === cls).map(c => c.unlockRank).sort((a, b) => a - b);
    assert.deepEqual(ranks, Array.from({ length: 20 }, (_, i) => i + 1), `${cls}: one truck per rank`);
  }
  const store = { v: null, getItem() { return this.v; }, setItem(k, v) { this.v = v; } };
  const p = createProgress(roster, store), coins = { n: 1e6, spend(x) { if (this.n < x) return false; this.n -= x; return true; } };
  const starter = roster.find(c => c.unlockRank === 1), second = roster.find(c => c.class === starter.class && c.unlockRank === 2);
  assert(p.owns(starter.id) && !p.owns(second.id) && !p.isOpen(second.id));
  assert.equal(p.buy(second.id, coins), false, 'a locked truck cannot be bought');
  const ups = p.addXp(250);
  assert.deepEqual(ups.map(u => [u.rank, u.opens.length]), [[2, 5]], 'rank 2 opens five trucks, one per class');
  assert(p.buy(second.id, coins)); assert.equal(coins.n, 1e6 - second.price, 'bought for its price');
  assert.equal(p.buy(second.id, coins), false, 'not twice');
  const again = createProgress(roster, store);
  assert(again.owns(second.id) && again.rank === 2, 'saved');
  assert.equal(classXp(100, 'heavy'), 160, 'harder classes earn more');
});

test('missions: offers always include the least-driven class, one is chosen at a time, and each kind is judged right', () => {
  const data = JSON.parse(fs.readFileSync(new URL('../assets/missions/missions.json', import.meta.url)));
  const classes = content.roster.classes.map(c => c.id);
  const store = { v: null, getItem() { return this.v; }, setItem(k, v) { this.v = v; } };
  const m = createMissions(data, classes, store);
  assert.equal(m.offers.length, data.offerCount);
  assert.equal(m.offers.filter(o => o.type === 'classDelivery').length, 1, 'one class delivery');
  const run = { cls: 'scout', time: 300, helped: false, maxDamage: 10, cameraKmh: 0, crushes: 0, bogs: 0, delivered: false };
  const take = (id) => { const x = createMissions(data, classes, { v: JSON.stringify({ offers: [id], active: id, driven: {} }), getItem() { return this.v; }, setItem(k, v) { this.v = v; } }); return x; };
  // live kinds finish during the run
  assert.equal(take('crusher').track({ ...run, crushes: 39 }).done, undefined);
  assert.equal(take('crusher').track({ ...run, crushes: 40 }).done.xp, 400);
  assert(take('speed-camera').track({ ...run, cameraKmh: 52 }).done);
  assert(take('bog-master').track({ ...run, bogs: 6 }).done);
  // depot kinds finish on delivery, and only when the run did it
  assert(take('against-clock').deliver({ ...run, time: 700 }), 'under 12 minutes');
  assert.equal(take('against-clock').deliver({ ...run, time: 730 }), null, 'too slow');
  assert.equal(take('no-help').deliver({ ...run, helped: true }), null, 'help was called');
  assert(take('no-help').deliver(run));
  assert.equal(take('clean-run').deliver({ ...run, maxDamage: 30 }), null, 'too much damage');
  assert.equal(take('deliver-heavy').deliver(run), null, 'wrong class');
  assert.equal(take('deliver-heavy').deliver({ ...run, cls: 'heavy' }).xp, 800, 'class deliveries scale with the class');
  // choosing, finishing and a fresh list; the class just driven is counted
  const id = m.offers[1].id; m.choose(id); assert.equal(m.active.id, id); m.choose(id); assert.equal(m.active, null, 'tap again to put it down');
  const x = take('no-help'); x.deliver({ ...run, cls: 'scout' });
  assert.equal(x.active, null); assert(!x.offers.some(o => o.id === 'no-help'), 'a fresh list without the one just done');
  assert(x.offers.find(o => o.type === 'classDelivery').class !== 'scout', 'the class just driven is no longer the least driven');
});


test('service trucks cannot activate the main truck power, which works again after switching back', () => {
  const sim = spawn(newSim(withPower(content.car, 'invincible')), 30);
  const service = sim.spawnService(content.service[0], 50);
  sim.setActive(service);
  assert.equal(sim.usePower(), false);
  assert.equal(sim.main.st.powerT, 0);
  assert.equal(sim.main.st.powerCoolT, 0);
  sim.setActive(sim.main);
  assert.equal(sim.usePower(), true);
});
