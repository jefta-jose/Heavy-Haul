// Vehicle behaviour on the current car and season: registration, suspension, traction, brakes,
// drivetrain feel, AWD / DIFF effect in mud, obstacles and trail stability.
import test from 'node:test';
import assert from 'node:assert/strict';
import { content, newSim, spawn, advance, DT } from './helpers.js';
import { drawnBodyLift, easeBodyLift } from '../src/physics/vehicle.js';
import { SERVICE_TORQUE_MULTIPLIER, SERVICE_WINCH_MULTIPLIER, WHEEL_RISE_MAX_SHARE, WHEEL_DROP_MAX_SHARE } from '../src/game-config.js';

const { car } = content;
const speedAfter = (sim, seconds) => { advance(sim, seconds); return sim.st.speed * 3.6; };

test('settles upright with every wheel in its painted arch', () => {
  const s = spawn(newSim(), content.season.trail.start);
  assert.equal(s.wheels.length, car.rig.axles.length);
  assert(Math.abs(s.truck.getAngle()) < 0.03, 'settles upright');
  s.wheels.forEach((w, i) => {
    const p = s.truck.getLocalPoint(w.getPosition());
    assert(Math.abs(p.x - car.rig.axles[i]) < 0.025, 'wheel stays under its arch');
    assert(Math.abs(p.y - car.rig.wheelY[i]) < 0.08, 'spring settles at the registered ride height');
  });
});

test('wheels stay in their arches as drawn: the body moves to them, and clearing one never leaves another behind', () => {
  const rig = { axles: [6, 3, -5], radius: 0.8 }, up = 0.8 * WHEEL_RISE_MAX_SHARE, down = 0.8 * WHEEL_DROP_MAX_SHARE;
  assert.deepEqual(drawnBodyLift(rig, [up, 0, -down]), { lift: 0, tilt: 0 }, 'wheels within the limits leave the body alone');
  for (const rises of [[0.5, 0, 0], [0, 0, 0.6], [-0.6, -0.6, -0.6], [-0.4, 0, 0], [0.5, 0.2, -0.3]]) {
    const { lift, tilt } = drawnBodyLift(rig, rises);
    rises.forEach((r, i) => { const gap = r - (lift + tilt * rig.axles[i]); assert(gap <= up + 0.03 && gap >= -down - 0.03, `axle ${i} stays in its arch for ${rises}: ${gap}`); });
  }
  // a middle axle alone on a log, from the Asphalt King: no straight body suits all four, so none is left far out
  const king = { axles: [5, 0.9, -3.78, -4.96], radius: 0.525 }, rises = [-0.14, 0.66, 0.01, -0.17], { lift, tilt } = drawnBodyLift(king, rises);
  rises.forEach((r, i) => { const gap = r - (lift + tilt * king.axles[i]); assert(Math.abs(gap) < 0.5, `axle ${i} is ${gap} from the body`); });
});

test('the drawn body eases to its lift: no jump, no overshoot, the same at any frame rate', () => {
  const run = (hz, secs) => { const s = { lift: 0, tilt: 0, vLift: 0, vTilt: 0 }, seen = []; for (let i = 0; i < secs * hz; i++) { easeBodyLift(s, { lift: 0.5, tilt: 0.02 }, 10, 1 / hz); seen.push(s.lift); } return { s, seen }; };
  const { s, seen } = run(60, 2);
  assert(Math.abs(s.lift - 0.5) < 1e-3 && Math.abs(s.tilt - 0.02) < 1e-4, 'it arrives');
  assert(Math.max(...seen) <= 0.5 + 1e-9, 'it never overshoots');
  assert(seen[0] < 0.01, 'the first frame barely moves');
  assert(Math.abs(run(30, 0.3).s.lift - run(120, 0.3).s.lift) < 1e-9, 'frame rate does not change it');
});

test('suspension articulates and settles after a hit', () => {
  const s = spawn(newSim(), content.season.trail.start), y0 = s.truck.getPosition().y;
  s.truck.applyLinearImpulse(s.V(0, 9000), s.truck.getWorldCenter(), true);
  advance(s, 0.15); assert(s.truck.getPosition().y > y0 + 0.05, 'body moves on its springs');
  advance(s, 5); assert(Math.abs(s.truck.getAngle()) < 0.15, 'settles again');
});

test('brisk take-off then a smooth climb to cruising speed (high range)', () => {
  const s = spawn(newSim(), content.season.trail.start, { gear: 'H', awd: true, diff: false });
  s.ctl.gas = 1;
  const v1 = speedAfter(s, 1), v2 = speedAfter(s, 1), v6 = speedAfter(s, 4);
  assert(v1 > 4 && v1 < 12, `about 7 km/h after 1 s, got ${v1.toFixed(1)}`);
  assert(v2 > 10 && v2 < 20, `about 15 km/h after 2 s, got ${v2.toFixed(1)}`);
  assert(v6 > 15 && v6 < 30, `smooth climb toward cruising speed, got ${v6.toFixed(1)}`);
});

test('brakes stop it and reverse backs up', () => {
  const s = spawn(newSim(), content.season.trail.start);
  s.ctl.gas = 1; advance(s, 6); s.ctl.gas = 0; s.ctl.brake = 1; advance(s, 3);
  assert(Math.abs(s.st.speed) < 0.2, 'brakes stop the vehicle');
  const r = spawn(newSim(), content.season.trail.start, { gear: 'R' }), x0 = r.truck.getPosition().x;
  r.ctl.gas = 1; advance(r, 5); assert(r.truck.getPosition().x < x0 - 2, 'reverse moves backward');
});

test('AWD and DIFF clearly change progress in deep mud', () => {
  const metres = (awd, diff) => { const s = spawn(newSim(), 600, { awd, diff }), x0 = s.truck.getPosition().x; s.ctl.gas = 1; advance(s, 15); return s.truck.getPosition().x - x0; };
  const none = metres(false, false), awd = metres(true, false), both = metres(true, true);
  assert(none < 6, `stuck without AWD or DIFF (${none.toFixed(1)} m)`);
  assert(awd > none, `AWD helps (${awd.toFixed(1)} m vs ${none.toFixed(1)} m)`);
  assert(both > awd * 3 && both > 25, `AWD + DIFF gets through (${both.toFixed(1)} m)`);
});

test('trail has climbable obstacles and rocks break under the tires', { skip: !content.season.trail.obstacleRuns?.length && 'this season has no obstacles on the road' }, () => {
  const s = spawn(newSim(), content.season.trail.start);
  assert(s.logs.length > 30 && s.rocks.some(r => r.crush) && s.rocks.some(r => !r.crush), 'logs, boulders and crushable rocks exist');
  // Approach an actual crushable stone, rather than assuming the seeded road
  // still places one within 40 seconds of a fixed coordinate.
  const target = s.rocks.find(r => r.crush && r.x > content.season.trail.start);
  s.respawn(target.x - Math.max(...s.car.rig.axles) - s.car.rig.radius - 2); advance(s, 2);
  s.ctl.gas = 1; advance(s, 12);
  assert(!target.alive && s.events.some(e => e.type === 'crush' && e.x === target.x), 'driving breaks the approached rock');
});

test('makes progress through every kind of section', () => {
  for (const x of [125, 450, 940, 1450]) {
    const s = spawn(newSim(), x), x0 = s.truck.getPosition().x;
    s.ctl.gas = 1; advance(s, 10);
    assert(s.truck.getPosition().x > x0 + 10, `progress through the section at ${x} m`);
    assert(Math.abs(s.truck.getAngle()) < 0.7, `stable at ${x} m`);
    assert(Number.isFinite(s.st.rpm));
  }
});

test('a car carries its load: it adds to its mass', () => {
  const mesa = content.cars.find(c => c.id === 'logger-six-16');
  if (!mesa) return;
  const s = newSim(mesa); s.init(30);
  assert(s.truck.getMass() > mesa.physics.mass, 'the load adds to the chassis mass');
});

// the main truck's breakdown truck, or (until its art exists) the nearest class's as a stand-in for
// these physics checks (the game itself offers no stand-ins)
const rank = id => content.roster.classes.findIndex(c => c.id === id);
const breakdownFor = c => content.service.filter(s => s.role === 'breakdown').sort((a, b) => Math.abs(rank(a.class) - rank(c.class)) - Math.abs(rank(b.class) - rank(c.class)))[0];

// park a service truck ahead of the main truck with `gap` metres between the tow points
function serviceAhead(s, car, gap, serves = car.class) {
  const main = s.main, front = main.parts.truck.getWorldPoint(s.V(main.car.rig.winch[0], 0)).x;
  const v = s.spawnService(car, front + gap - car.rig.towRear, serves);
  advance(s, 2); s.setActive(v); Object.assign(v.ctl, { gear: 'L', awd: true, diff: true });
  return v;
}

test('a service truck hooks a stuck truck within reach and tows it by driving away', () => {
  const wrecker = breakdownFor(car);
  assert(wrecker, 'a playable breakdown truck');
  const s = spawn(newSim(), content.season.trail.heavyMud[0] - 10);
  const main = s.main, v = serviceAhead(s, wrecker, 3.5, car.class);   // a stand-in serves the main truck's class
  assert(s.nearestHook().inRange, 'the service truck stands in the recovery bay');
  const x0 = main.parts.truck.getPosition().x;
  advance(s, 2);
  assert(Math.abs(main.parts.truck.getPosition().x - x0) < 0.2, 'nothing pulls before the hook is on');
  const r = s.toggleWinch();
  assert(r.ok && r.attached && r.target === main, 'hooked onto the main truck');
  advance(s, 2);
  assert(Math.abs(main.parts.truck.getPosition().x - x0) < 0.3, 'hooking alone does not reel the truck in');
  v.ctl.gas = 1; advance(s, 8);
  assert(main.parts.truck.getPosition().x - x0 > 4, `driving the service truck tows the main truck (${(main.parts.truck.getPosition().x - x0).toFixed(1)} m)`);
  assert(s.distance(v, main) < s.cable().length + 0.6, 'the cable keeps its length');
  v.ctl.gas = 0; s.toggleWinch(); assert.equal(s.cable(), null, 'tapping again unhooks');
});

test('service trucks never get stuck: each one drives through a heavy-mud pit unaided', () => {
  for (const car of content.service) {
    for (const pit of content.season.trail.heavyMud) {   // pit centres; each pit is about 20 m long
      const s = newSim(car); spawn(s, pit - 12 - car.rig.nose);
      s.ctl.gas = 1; advance(s, 25);
      const back = s.truck.getWorldPoint(s.V(car.rig.towRear ?? -car.rig.nose, 0)).x;
      assert(back > pit + 12, `${car.name} crosses the pit at ${pit} m (its tail reached ${back.toFixed(1)} m)`);
    }
  }
});

test('a service truck is the most powerful of its class but not the fastest', () => {
  const roster = content.roster;
  // planned cars only carry paper numbers: compare with the playable ones, whose roster specs are
  // worked out from their car.json when content loads
  const playable = new Set(content.cars.map(c => c.id));
  for (const svc of roster.service) {
    const own = roster.cars.filter(c => c.class === svc.class && playable.has(c.id));
    if (!own.length) continue;
    assert(svc.powerKw * SERVICE_TORQUE_MULTIPLIER > Math.max(...own.map(c => c.powerKw)), `${svc.name} out-powers every ${svc.class} car`);
    assert(svc.torqueNm * SERVICE_TORQUE_MULTIPLIER > Math.max(...own.map(c => c.torqueNm)), `${svc.name} out-pulls every ${svc.class} car`);
    assert(svc.topSpeedKmh < Math.max(...own.map(c => c.topSpeedKmh)), `${svc.name} is not the fastest ${svc.class} vehicle`);
    if (svc.role === 'breakdown') assert(svc.towMassT >= Math.max(...own.map(c => c.massT + (c.load?.massT ?? 0))), `${svc.name} can tow the heaviest loaded ${svc.class} car`);
  }
  // in game: pulling force in low range beats the playable cars of its class
  const pull = car => car.drivetrain.torqueScale * car.drivetrain.gears.L / car.rig.radius;
  for (const svc of content.service) for (const c of content.cars.filter(c => c.class === svc.class))
    assert(pull(svc) * SERVICE_TORQUE_MULTIPLIER > pull(c), `${svc.name} pulls harder than the ${c.name}`);
});

test('every class has a breakdown truck, bigger class by class, and fuel trucks are gone', () => {
  const { classes, service } = content.roster; let last = 0;
  assert(!service.some(s => s.role === 'fuel'), 'no fuel trucks');
  for (const cls of classes) {
    const mine = service.filter(s => s.class === cls.id);
    assert.deepEqual(mine.map(s => s.role), ['breakdown'], `${cls.name}: one breakdown truck`);
    assert(mine[0].massT >= last, `the ${cls.name} one is at least as big as the class before`); last = mine[0].massT;
  }
});

test('the winch is strong on its own class and weak on any other', () => {
  const wrecker = content.service.find(c => c.role === 'breakdown');
  const s = spawn(newSim(), 60), main = s.main, v = serviceAhead(s, wrecker, 3);
  const same = s.sameClass(v, main), F = s.winchForce(main);
  if (same) assert.equal(F, wrecker.physics.winchForce * SERVICE_WINCH_MULTIPLIER);
  else assert(F < 0.5 * (s.vehicleMass(main) + s.loadMass(main)) * 9.81 * 0.7, `cross-class pull is only a share of what the ${main.car.name} needs (${Math.round(F)} N)`);
  const own = content.service.find(c => c.class === main.car.class && c.role === 'breakdown');
  if (own) { const o = serviceAhead(s, own, 20); s.setActive(o); assert.equal(s.winchForce(main), own.physics.winchForce * SERVICE_WINCH_MULTIPLIER, 'its own class gets the full winch'); }
});

test('service trucks never run out of fuel', () => {
  const s = spawn(newSim(), 60);
  for (const car of content.service) { const v = serviceAhead(s, car, 25); v.ctl.gas = 1; advance(s, 6); assert.equal(v.st.fuel, 100, `${car.name} burns nothing`); v.ctl.gas = 0; }
});

test('a called service truck starts at the beginning of the trail, clear of anything parked there', () => {
  const s = spawn(newSim(), content.season.trail.start), [a, b] = content.service;
  const x1 = s.startSpot(a), v = s.spawnService(a, x1); advance(s, 1);
  assert(x1 - content.season.trail.start < 25, 'near the start');
  assert(s.distance(v, s.main) > 1, 'not on top of the main truck');
  const x2 = s.startSpot(b);
  assert(x2 - (-(b.rig.towRear ?? -b.rig.nose)) > v.parts.truck.getPosition().x + a.rig.nose, 'the second one parks past the first');
});

test('the winch only hooks from inside the recovery bay ahead of the vehicle, sized to the service truck', () => {
  const wrecker = content.service.find(c => c.role === 'breakdown');
  const s = spawn(newSim(), content.season.trail.heavyMud[0] - 10);
  const main = s.main, v = serviceAhead(s, wrecker, s.winchReach + 4);
  const len = wrecker.rig.nose - wrecker.rig.towRear, bay = s.nearestHook().bay;
  assert(Math.abs(bay.end - bay.start - (len + 4.5)) < 0.01, 'the bay fits the truck with room to spare');
  const r = s.toggleWinch();
  assert(!r.ok && r.reason === 'far' && r.bayDistance > 0, 'too far ahead, and the HUD can say how far to reverse');
  const x0 = main.parts.truck.getPosition().x;
  v.ctl.gas = 1; advance(s, 4);
  assert(Math.abs(main.parts.truck.getPosition().x - x0) < 0.2, 'driving off without a hook tows nothing');
});

test('the engine switch: off means no drive and no fuel burn; starting cranks first', () => {
  const s = spawn(newSim(), 60), x0 = s.truck.getPosition().x, f0 = s.st.fuel;
  s.stopEngine(); s.ctl.gas = 1; advance(s, 3);
  assert(Math.abs(s.truck.getPosition().x - x0) < 0.2, 'no drive with the engine off');
  assert.equal(s.st.fuel, f0, 'no fuel burned while off');
  assert(s.st.rpm < 50, 'the engine has run down');
  assert.equal(s.startEngine(), 'cranking');
  advance(s, 0.3); assert.equal(s.st.engine, 'cranking', 'still on the starter');
  assert(Math.abs(s.truck.getPosition().x - x0) < 0.2, 'no drive while cranking');
  advance(s, (s.car.audio?.crankS ?? 1.2) + 0.2); assert.equal(s.st.engine, 'on', 'it catches');
  advance(s, 3); assert(s.truck.getPosition().x > x0 + 2, 'and drives');
  s.st.fuel = 0; advance(s, 0.1); assert.equal(s.st.engine, 'off', 'an empty tank stalls it');
  assert.equal(s.startEngine(), 'off', 'and it will not start dry');
});

test('the handbrake holds the truck on a slope and against the throttle', () => {
  const s = spawn(newSim(), 30); s.ctl.handbrake = true; s.ctl.gas = 1;
  const x0 = s.truck.getPosition().x; advance(s, 3);
  assert(Math.abs(s.truck.getPosition().x - x0) < 0.15, 'held against full throttle');
  s.ctl.handbrake = false; advance(s, 3);
  assert(s.truck.getPosition().x > x0 + 2, 'released, it drives');
});

test('hitting a solid obstacle at speed damages the truck, and a damaged truck is slower', { skip: !content.season.trail.obstacleRuns?.length && 'this season has no obstacles on the road' }, () => {
  const run = content.season.trail.obstacleRuns.find(r => r.kind === 'pipe');
  const ram = kmh => { const s = spawn(newSim(), run.x - 8), v = kmh / 3.6; for (const b of [s.truck, ...s.wheels]) b.setLinearVelocity(s.V(v, 0)); advance(s, 2); return s.st.damage; };
  assert.equal(ram(6), 0, 'a slow crawl over it does no harm');
  assert(ram(40) > 0, 'a fast hit does');
  const metres = damage => { const s = spawn(newSim(), content.season.trail.start, { gear: 'H', awd: true, diff: false }), x0 = s.truck.getPosition().x; s.st.damage = damage; s.ctl.gas = 1; advance(s, 6); return s.truck.getPosition().x - x0; };
  assert(metres(90) < metres(0) * 0.85, 'a badly damaged truck covers less ground');
  const s = spawn(newSim(), content.season.trail.start); s.st.damage = 100; advance(s, 0.1);
  assert.equal(s.st.engine, 'off', 'at 100% the engine dies');
});

test('automatic gears: short gear from rest, long gear at speed, and the brake reverses at a standstill', () => {
  const s = spawn(newSim(), content.season.trail.start, { gear: 'L' }); s.ctl.auto = true; s.ctl.gas = 1;
  const seen = new Set(); for (let i = 0; i < 120 * 12; i++) { s.step(DT); seen.add(s.ctl.gear); }
  assert(seen.has('L') && seen.has('H'), `shifted through ${[...seen]}`);
  const r = spawn(newSim(), 3300, { gear: 'L' }); r.ctl.auto = true; r.ctl.brake = 1; const x0 = r.truck.getPosition().x; advance(r, 4);
  assert.equal(r.ctl.gear, 'R', 'holding the brake at a stop selects reverse');
  assert(r.truck.getPosition().x < x0 - 1, 'and the truck backs up');
  r.ctl.brake = 0; r.ctl.gas = 1; advance(r, 4);
  assert.notEqual(r.ctl.gear, 'R', 'the gas pedal goes forward again');
});

test('a bog never damages the truck, whatever the gear', () => {
  const s = spawn(newSim(), content.season.trail.heavyMud[0], { gear: 'H' }); s.ctl.gas = 1; advance(s, 3);
  assert.equal(s.st.damage, 0);
});

test('stopped in a station bay a truck refuels and repairs; driving through does not; fuel burns over time', () => {
  const st = content.season.trail.stations[0], s = spawn(newSim(), st.x); s.ctl.gear = 'L'; s.st.fuel = 20; s.st.damage = 60;
  advance(s, 2);
  assert(s.st.filling && s.st.fuel > 40 && s.st.damage < 60, 'filling and repairing');
  advance(s, 12);
  assert.equal(s.st.fuel, 100); assert.equal(s.st.damage, 0);
  assert(!s.st.filling, 'done');
  const m = spawn(newSim(), st.x - 3); m.st.fuel = 50; m.ctl.gas = 1; advance(m, 2);
  assert(m.st.fuel < 50, 'with the gas down it does not fill');
  const idle = spawn(newSim(), content.season.trail.start), f0 = idle.st.fuel; advance(idle, 10);
  assert(idle.st.fuel < f0, 'a running engine burns fuel while standing still');
  const off = spawn(newSim(), content.season.trail.start); off.stopEngine(off.main); const f1 = off.st.fuel; advance(off, 10);
  assert.equal(off.st.fuel, f1, 'a stopped engine does not');
});


test('each recovery truck tows its heaviest class load through difficult mud pits in automatic gears', () => {
  const gross = c => c.physics.mass + (c.physics.load?.massT ?? 0) * 1000;
  for (const wrecker of content.service) {
    const car = content.cars.filter(c => c.class === wrecker.class).sort((a, b) => gross(b) - gross(a))[0];
    if (!car) continue;
    for (const pit of content.season.trail.heavyMud.filter((_, i) => i === 1 || i === 6)) {
      const s = spawn(newSim(car), pit - 6), main = s.main;
      const v = serviceAhead(s, wrecker, 4);
      v.ctl.auto = true;
      assert(s.toggleWinch().attached, `${wrecker.id} hooks ${car.id} at ${pit}`);
      const start = main.parts.truck.getPosition().x;
      v.ctl.gas = 1; advance(s, 25);
      assert(main.parts.truck.getPosition().x > start + 30, `${wrecker.id} clears ${car.id} from the pit at ${pit}`);
      assert(Math.abs(main.parts.truck.getAngle()) < 0.7, 'the towed load stays upright');
    }
  }
});
