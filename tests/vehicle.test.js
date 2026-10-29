// Vehicle behaviour on the current car and season: registration, suspension, traction, brakes,
// drivetrain feel, 4x4 / DIFF effect in mud, obstacles and trail stability.
import test from 'node:test';
import assert from 'node:assert/strict';
import { content, newSim, spawn, advance } from './helpers.js';

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

test('4x4 and DIFF clearly change progress in deep mud', () => {
  const metres = (awd, diff) => { const s = spawn(newSim(), 600, { awd, diff }), x0 = s.truck.getPosition().x; s.ctl.gas = 1; advance(s, 15); return s.truck.getPosition().x - x0; };
  const none = metres(false, false), awd = metres(true, false), both = metres(true, true);
  assert(none < 6, `stuck without 4x4 or DIFF (${none.toFixed(1)} m)`);
  assert(awd > none, `4x4 helps (${awd.toFixed(1)} m vs ${none.toFixed(1)} m)`);
  assert(both > awd * 3 && both > 25, `4x4 + DIFF gets through (${both.toFixed(1)} m)`);
});

test('trail has climbable obstacles and rocks break under the tires', () => {
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

test('a car carries its load: heavier, and it burns more fuel climbing', () => {
  const mesa = content.cars.find(c => c.id === 'mesa-coyote-8');
  if (!mesa) return;
  const burn = car => { const s = spawn(newSim(car), 470, { gear: 'L' }); const f0 = s.st.fuel; s.ctl.gas = 1; advance(s, 8); return f0 - s.st.fuel; };
  const empty = { ...mesa, physics: { ...mesa.physics, load: undefined } };
  const s = newSim(mesa); s.init(30);
  assert(s.truck.getMass() > mesa.physics.mass, 'the load adds to the chassis mass');
  assert(burn(mesa) > burn(empty), 'climbing with the load burns more fuel');
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
  assert(s.nearestHook().d <= s.winchReach, 'the main truck is within hook reach');
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
    assert(svc.powerKw > Math.max(...own.map(c => c.powerKw)), `${svc.name} out-powers every ${svc.class} car`);
    assert(svc.torqueNm > Math.max(...own.map(c => c.torqueNm)), `${svc.name} out-pulls every ${svc.class} car`);
    assert(svc.topSpeedKmh < Math.max(...own.map(c => c.topSpeedKmh)), `${svc.name} is not the fastest ${svc.class} vehicle`);
    if (svc.role === 'breakdown') assert(svc.towMassT >= Math.max(...own.map(c => c.massT + c.load.massT)), `${svc.name} can tow the heaviest loaded ${svc.class} car`);
  }
  // in game: pulling force in low range beats the playable cars of its class
  const pull = car => car.drivetrain.torqueScale * car.drivetrain.gears.L / car.rig.radius;
  for (const svc of content.service) for (const c of content.cars.filter(c => c.class === svc.class))
    assert(pull(svc) > pull(c), `${svc.name} pulls harder than the ${c.name}`);
});

test('every class has a fuel truck and a breakdown truck, bigger class by class', () => {
  const { classes, service } = content.roster;
  const last = { fuel: 0, breakdown: 0 };
  for (const cls of classes) {
    const mine = service.filter(s => s.class === cls.id);
    assert.deepEqual(mine.map(s => s.role).sort(), ['breakdown', 'fuel'], `${cls.name}: one of each`);
    for (const s of mine) { assert(s.massT >= last[s.role], `the ${cls.name} ${s.role} truck is at least as big as the class before`); last[s.role] = s.massT; }
  }
});

test('the winch is strong on its own class and weak on any other', () => {
  const wrecker = content.service.find(c => c.role === 'breakdown');
  const s = spawn(newSim(), 60), main = s.main, v = serviceAhead(s, wrecker, 3);
  const same = s.sameClass(v, main), F = s.winchForce(main);
  if (same) assert.equal(F, wrecker.physics.winchForce);
  else assert(F < 0.5 * (s.vehicleMass(main) + s.loadMass(main)) * 9.81 * 0.7, `cross-class pull is only a share of what the ${main.car.name} needs (${Math.round(F)} N)`);
  const own = content.service.find(c => c.class === main.car.class && c.role === 'breakdown');
  if (own) { const o = serviceAhead(s, own, 20); s.setActive(o); assert.equal(s.winchForce(main), own.physics.winchForce, 'its own class gets the full winch'); }
});

test('fuel trucks only refuel: no winch', () => {
  const fuel = content.service.find(c => c.role === 'fuel');
  const s = spawn(newSim(), 60), v = serviceAhead(s, fuel, 3);
  assert(!s.canWinch(v), 'a fuel truck has no winch');
  assert.equal(s.toggleWinch(v).reason, 'no-winch');
  assert.equal(s.nearestHook(v), null);
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

test('the winch hook only reaches a vehicle within 5 m', () => {
  const wrecker = content.service.find(c => c.role === 'breakdown');
  const s = spawn(newSim(), content.season.trail.heavyMud[0] - 10);
  const main = s.main, v = serviceAhead(s, wrecker, s.winchReach + 4);
  const r = s.toggleWinch();
  assert(!r.ok && r.reason === 'far' && r.gap > s.winchReach, 'too far away, and the HUD can say how far');
  const x0 = main.parts.truck.getPosition().x;
  v.ctl.gas = 1; advance(s, 4);
  assert(Math.abs(main.parts.truck.getPosition().x - x0) < 0.2, 'driving off without a hook tows nothing');
});

test('a service truck can tow another service truck', () => {
  const wrecker = content.service.find(c => c.role === 'breakdown'), fuel = content.service.find(c => c.role === 'fuel');
  const s = spawn(newSim(), 60);
  const f = serviceAhead(s, fuel, 8), x0 = f.parts.truck.getPosition().x;
  const front = f.parts.truck.getWorldPoint(s.V(f.car.rig.winch[0], 0)).x;
  const w = s.spawnService(wrecker, front + 3 - wrecker.rig.towRear); advance(s, 2);
  s.setActive(w); Object.assign(w.ctl, { gear: 'L', awd: true, diff: true });
  const r = s.toggleWinch();
  assert(r.ok && r.target === f, 'hooks the nearest vehicle: the fuel truck');
  w.ctl.gas = 1; advance(s, 6);
  assert(f.parts.truck.getPosition().x - x0 > 3, 'the fuel truck is towed along');
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
