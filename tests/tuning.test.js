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
  const scout = content.cars.find(c => c.id === 'dune-pup-1'); if (!scout) return;
  const max = Object.fromEntries(KNOBS.map(k => [k.id, 100]));
  const metres = car => [365, 2130, 2330].map(x => { const s = spawn(newSim(car), x); const x0 = s.truck.getPosition().x; s.ctl.gas = 1; advance(s, 20); return s.truck.getPosition().x - x0; });
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
  const tuned = applyTuning(content.car, { engine: 50 }), { power, ...rest } = withPower(tuned, 'nitro');
  assert.equal(power, 'nitro');
  assert.deepEqual(rest, { ...tuned }, 'the same truck otherwise');
  assert.equal(withPower(tuned, null), tuned, 'no power, no change');
  assert.equal(withPower(tuned, 'grip'), tuned, 'an old saved power is ignored');
  assert.deepEqual(POWERS.map(p => p.id), ['invincible', 'nitro']);
  for (const p of POWERS) assert(POWER_TIMES[p.id].seconds > 0 && POWER_TIMES[p.id].cooldown > 0, `${p.id} has a cooldown`);
});

test('invincible: a tap stops hit damage for its time, then it recharges before it can be used again', { skip: !content.season.trail.obstacleRuns?.length && 'this season has no obstacles on the road' }, () => {
  const solid = (() => { const p = newSim(); p.init(40); return p.logs.find(l => l.kind !== 'pipe' && l.x > 45).x; })();
  const crash = (car, shield) => { const c = spawn(newSim(car), solid - car.rig.nose - 4); if (shield) assert(c.usePower(), 'the shield starts'); c.main.parts.truck.setLinearVelocity({ x: 15, y: 0 }); advance(c, 2); return c.main.st.damage; };
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

test('nitro speeds past top speed, then arms an instant brake that waits until a brake tap uses it', () => {
  const top = c => c.drivetrain.governedRpm / c.drivetrain.gears.H * 2 * Math.PI / 60 * c.rig.radius;
  const boost = car => { const s = spawn(newSim(car), flatRoad()); s.ctl.auto = true; s.ctl.gas = 1; advance(s, 1); if (car.power) assert(s.usePower(), 'nitro starts'); advance(s, POWER_TIMES.nitro.seconds); return s; };
  const plain = boost(content.car), fast = boost(withPower(content.car, 'nitro'));
  assert(fast.st.speed > plain.st.speed + 2, `nitro goes faster: ${fast.st.speed.toFixed(1)} vs ${plain.st.speed.toFixed(1)} m/s`);
  assert(fast.st.speed < top(content.car) * 1.7, 'but only up to its share of top speed');
  assert(fast.st.brakeArmed, 'the boost arms the instant brake');
  // it waits through the whole recharge and after it
  // parked on the highway (not coasting off its end) while it recharges
  fast.ctl.gas = 0; for (const b of [fast.truck, ...fast.main.parts.wheels]) { b.setLinearVelocity({ x: 0, y: 0 }); b.setAngularVelocity(0); }
  advance(fast, POWER_TIMES.nitro.cooldown + 2);
  assert.equal(fast.st.powerCoolT, 0); assert(fast.st.brakeArmed, 'still armed once nitro has recharged');
  const rolling = s => { s.truck.setLinearVelocity({ x: 15, y: 0 }); for (const w of s.main.parts.wheels) w.setAngularVelocity(-15 / s.main.car.rig.radius); };
  rolling(fast); fast.ctl.brake = 1; advance(fast, 0.5);
  assert(fast.st.speed < 1, `the armed brake stops it dead: ${fast.st.speed.toFixed(1)} m/s`);
  assert(!fast.st.brakeArmed, 'and is used up');
  fast.ctl.brake = 0; advance(fast, POWER_TIMES.nitro.seconds); rolling(fast); fast.ctl.brake = 1; advance(fast, 0.5);
  assert(fast.st.speed > 5, `the next brake is a normal one: ${fast.st.speed.toFixed(1)} m/s`);
  // the heaviest truck stops just as hard from a single tap, and the brake works at any speed
  const heavy = spawn(newSim(withPower(heaviest(), 'nitro')), flatRoad()); heavy.ctl.auto = true; heavy.main.st.brakeArmed = true;
  rolling(heavy); heavy.ctl.brake = 1; advance(heavy, 0.05); heavy.ctl.brake = 0; advance(heavy, 0.6);
  assert(heavy.st.speed < 1, `${heaviest().id} stops dead from a tap: ${heavy.st.speed.toFixed(1)} m/s`);
  const crawl = spawn(newSim(withPower(content.car, 'nitro')), flatRoad()); crawl.ctl.auto = true; crawl.main.st.brakeArmed = true;
  const slow = DAMAGE_START_KMH / 3.6 * 0.5;
  crawl.truck.setLinearVelocity({ x: slow, y: 0 }); for (const w of crawl.main.parts.wheels) w.setAngularVelocity(-slow / content.car.rig.radius);
  crawl.ctl.brake = 1; advance(crawl, 0.05);
  assert(!crawl.main.st.brakeArmed, 'a tap at low speed uses it too');
  // braking during the boost ends it
  const mid = spawn(newSim(withPower(content.car, 'nitro')), flatRoad()); mid.ctl.auto = true; mid.ctl.gas = 1; advance(mid, 1); mid.usePower(); advance(mid, 1.5);
  mid.ctl.gas = 0; mid.ctl.brake = 1; advance(mid, 0.2);
  assert.equal(mid.st.powerT, 0, 'braking ends the boost'); assert(mid.st.powerCoolT > 0, 'and it recharges');
  mid.init(); assert(!mid.main.st.brakeArmed, 'a new run starts unarmed');
});

test('mud pull only works in the short gear', () => {
  const car = applyTuning(content.car, { grip: 100 }), x = content.season.trail.heavyMud[0] - 8;
  const metres = gear => { const s = spawn(newSim(car), x, { gear }), x0 = s.truck.getPosition().x; s.ctl.gas = 1; advance(s, 8); return s.truck.getPosition().x - x0; };
  assert(metres('L') > metres('H'), 'low gear pulls harder through the mud');
});

test('ranks: 20 of them up to 60,000 XP, each opening one truck in every class to buy', async () => {
  const code = await releaseCode('src/game/progress.js');
  const { createProgress } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
  const config = await releaseCode('src/game-config.js');
  const release = await import(`data:text/javascript;base64,${Buffer.from(config).toString('base64')}`);
  assert.equal(release.STARTING_COINS, 20000); assert.equal(release.STARTING_RANK, 1);
  assert.equal(RANK_XP.length, 20); assert.equal(RANK_XP[0], 0); assert.equal(RANK_XP[19], 60000);
  RANK_XP.forEach((x, i) => i && assert(x > RANK_XP[i - 1], 'XP rises every rank'));
  assert.equal(rankFor(0), 1); assert.equal(rankFor(299), 1); assert.equal(rankFor(300), 2); assert.equal(rankFor(59999), 19); assert.equal(rankFor(1e9), 20);
  const roster = content.roster.cars;
  for (const cls of content.roster.classes.map(c => c.id)) {
    // the cars restored on 2026-11-13 keep their own ranks, so a rank may open more than one truck; every rank opens at least one
    const ranks = new Set(roster.filter(c => c.class === cls).map(c => c.unlockRank));
    assert.deepEqual([...ranks].sort((a, b) => a - b), Array.from({ length: 20 }, (_, i) => i + 1), `${cls}: every rank opens a truck`);
  }
  const store = { v: null, getItem() { return this.v; }, setItem(k, v) { this.v = v; } };
  const p = createProgress(roster, store), coins = { n: 1e6, spend(x) { if (this.n < x) return false; this.n -= x; return true; } };
  const starter = roster.find(c => c.unlockRank === 1), second = roster.find(c => c.class === starter.class && c.unlockRank === 2);
  assert(p.owns(starter.id) && !p.owns(second.id) && !p.isOpen(second.id));
  assert.equal(p.buy(second.id, coins), false, 'a locked truck cannot be bought');
  const ups = p.addXp(350);
  assert.deepEqual(ups.map(u => [u.rank, u.opens.length]), [[2, roster.filter(c => c.unlockRank === 2).length]], 'rank 2 opens every truck of that rank');
  assert(p.buy(second.id, coins)); assert.equal(coins.n, 1e6 - second.price, 'bought for its price');
  assert.equal(p.buy(second.id, coins), false, 'not twice');
  const again = createProgress(roster, store);
  assert(again.owns(second.id) && again.rank === 2, 'saved');
  // selling gives back what the garage works out (price plus upgrades); starters stay
  const wallet2 = { n: 0, add(x) { this.n += x; } };
  assert.equal(again.sell(starter.id, wallet2, 99), false, 'a free starter cannot be sold');
  assert(again.sell(second.id, wallet2, second.price + 1234)); assert.equal(wallet2.n, second.price + 1234);
  assert(!again.owns(second.id) && again.isOpen(second.id), 'sold, and can be bought again');
  assert.equal(again.sell(second.id, wallet2, 5), false, 'not twice');
  assert.equal(classXp(100, 'heavy'), 160, 'harder classes earn more');
});

test('missions: random contracts sized to the trail, always one for the least-driven class, judged with their twists', () => {
  const data = JSON.parse(fs.readFileSync(new URL('../assets/missions/missions.json', import.meta.url)));
  const classes = content.roster.classes, trail = content.season.trail;
  const owned = () => content.roster.cars.filter(c => c.unlockRank <= 1);
  const memory = () => ({ v: null, getItem() { return this.v; }, setItem(k, v) { this.v = v; } });
  let seed = 7; const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const ctx = { classes, trail, owned };
  const m = createMissions(data, ctx, memory(), random);
  assert.equal(m.offers.length, data.offerCount);
  assert.equal(m.offers[0].class, classes[0].id, 'the least-driven class gets a contract');
  // many draws: varied goals and targets, every one achievable on this trail with the trucks owned
  const goals = new Set(), texts = new Set();
  for (let i = 0; i < 60; i++) {
    m.endRun();
    for (const o of m.offers) {
      goals.add(o.goal); texts.add(o.text);
      assert(o.xp > 0 && o.xp % 10 === 0 && o.xp <= 700 && o.stars >= 1 && o.stars <= 3, `xp and stars: ${o.text}`);
      assert(o.twists.length <= 2);
      if (o.goal === 'deliver') assert(o.class || o.twists.length, 'no bare deliveries');
      if (o.goal === 'bogs') assert(o.count <= trail.heavyMud.length);
      if (o.goal === 'sprint') assert(trail.checkpoints.includes(o.x) && o.x < trail.depot);
      if (o.goal === 'cameras') {
        assert(o.count <= trail.highways.length);
        const pool = owned().filter(c => (!o.car || c.id === o.car) && (!o.class || c.class === o.class));
        assert(o.kmh <= Math.max(...pool.map(c => c.topSpeedKmh)), 'camera speed within an owned truck');
      }
    }
    assert.equal(new Set(m.offers.map(o => o.id)).size, m.offers.length);
  }
  assert(goals.size >= 6, `goals vary: ${[...goals]}`); assert(texts.size > 60, 'targets vary');

  // judging hand-made contracts
  const run = { cls: 'scout', car: 'x', time: 300, x: 0, helped: false, maxDamage: 10, cameras: [], camerasSeen: 0, crushes: 0, bogs: 0, bogsMissed: 0, refuelled: false, powered: false, stuckMax: 0, delivered: false };
  const take = c => createMissions(data, ctx, { v: JSON.stringify({ v: 2, offers: [{ id: 'c', xp: 700, twists: [], ...c }], active: 'c', driven: {} }), getItem() { return this.v; }, setItem(k, v) { this.v = v; } }, random);
  assert.equal(take({ goal: 'crusher', count: 40 }).track({ ...run, crushes: 39 }).done, undefined);
  assert.equal(take({ goal: 'crusher', count: 40 }).track({ ...run, crushes: 40 }).done.xp, 700);
  assert(take({ goal: 'cameras', kmh: 60, count: 2, of: 4 }).track({ ...run, cameras: [62, 70], camerasSeen: 2 }).done);
  assert(take({ goal: 'cameras', kmh: 60, count: 2, of: 4 }).failed({ ...run, cameras: [62], camerasSeen: 4 }), 'not enough cameras left');
  assert(take({ goal: 'bogs', count: 8, of: 10 }).failed({ ...run, bogsMissed: 3 }), 'too many bogs towed through');
  assert(take({ goal: 'sprint', x: 1000, minutes: 4 }).track({ ...run, x: 1001, time: 200 }).done);
  assert(take({ goal: 'sprint', x: 1000, minutes: 4 }).failed({ ...run, x: 900, time: 241 }));
  assert(take({ goal: 'timed', minutes: 12 }).deliver({ ...run, time: 700 }), 'under 12 minutes');
  assert.equal(take({ goal: 'timed', minutes: 12 }).deliver({ ...run, time: 730 }), null, 'too slow');
  assert.equal(take({ goal: 'clean', maxDamage: 25 }).deliver({ ...run, maxDamage: 30 }), null, 'too much damage');
  assert.equal(take({ goal: 'deliver', class: 'heavy' }).deliver(run), null, 'wrong class');
  assert.equal(take({ goal: 'deliver', car: 'y' }).deliver(run), null, 'wrong truck');
  // twists break contracts during the run
  const twisted = twist => take({ goal: 'crusher', count: 5, twists: [twist] });
  assert(twisted({ type: 'noHelp' }).failed({ ...run, helped: true }));
  assert(twisted({ type: 'noRefuel' }).failed({ ...run, refuelled: true }));
  assert(twisted({ type: 'noPower' }).failed({ ...run, powered: true }));
  assert(twisted({ type: 'noStuck', seconds: 8 }).failed({ ...run, stuckMax: 9 }));
  assert(twisted({ type: 'clean', maxDamage: 20 }).failed({ ...run, maxDamage: 21 }));
  assert.equal(twisted({ type: 'noHelp' }).track({ ...run, crushes: 5, helped: true }).done, undefined, 'a broken twist never completes');
  assert(twisted({ type: 'noHelp' }).track({ ...run, crushes: 5 }).done);

  // choosing, finishing and fresh lists; unchosen offers change after a run, the chosen one stays
  const id = m.offers[1].id; m.choose(id); assert.equal(m.active.id, id); m.choose(id); assert.equal(m.active, null, 'tap again to put it down');
  m.choose(m.offers[2].id); const kept = m.active.id, before = m.offers.map(o => o.id);
  m.endRun(); assert.equal(m.active.id, kept, 'the chosen contract stays');
  assert(m.offers.filter(o => o.id !== kept).every(o => !before.includes(o.id)), 'the rest are new');
  const x = take({ goal: 'deliver', class: 'scout' }); x.deliver(run);
  assert.equal(x.active, null); assert(!x.offers.some(o => o.id === 'c'), 'a fresh list without the one just done');
  assert(x.offers[0].class !== 'scout', 'the class just driven is no longer the least driven');
  // old saves with fixed mission ids are replaced by contracts
  const old = createMissions(data, ctx, { v: JSON.stringify({ offers: ['crusher'], active: 'crusher', driven: { scout: 2 } }), getItem() { return this.v; }, setItem(k, v) { this.v = v; } }, random);
  assert.equal(old.offers.length, data.offerCount); assert.equal(old.active, null); assert.notEqual(old.offers[0].class, 'scout');
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
