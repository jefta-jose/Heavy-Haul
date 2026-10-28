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
  const s = spawn(newSim(), 260);
  assert(s.logs.length > 30 && s.rocks.some(r => r.crush) && s.rocks.some(r => !r.crush), 'logs, boulders and crushable rocks exist');
  s.ctl.gas = 1; advance(s, 40);
  assert(s.events.some(e => e.type === 'crush'), 'driving breaks crushable rocks');
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

// park a service truck ahead of the main truck with `gap` metres between the tow points
function serviceAhead(s, car, gap) {
  const main = s.main, front = main.parts.truck.getWorldPoint(s.V(main.car.rig.winch[0], 0)).x;
  const v = s.spawnService(car, front + gap - car.rig.towRear);
  advance(s, 2); s.setActive(v); Object.assign(v.ctl, { gear: 'L', awd: true, diff: true });
  return v;
}

test('a service truck hooks a stuck truck within reach and tows it by driving away', () => {
  const wrecker = content.service.find(c => c.role === 'repair');
  assert(wrecker, 'a playable breakdown truck');
  const s = spawn(newSim(), content.season.trail.heavyMud[0] - 10);
  const main = s.main, v = serviceAhead(s, wrecker, 3.5);
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

test('the winch hook only reaches a vehicle within 5 m', () => {
  const wrecker = content.service.find(c => c.role === 'repair');
  const s = spawn(newSim(), content.season.trail.heavyMud[0] - 10);
  const main = s.main, v = serviceAhead(s, wrecker, s.winchReach + 4);
  const r = s.toggleWinch();
  assert(!r.ok && r.reason === 'far' && r.gap > s.winchReach, 'too far away, and the HUD can say how far');
  const x0 = main.parts.truck.getPosition().x;
  v.ctl.gas = 1; advance(s, 4);
  assert(Math.abs(main.parts.truck.getPosition().x - x0) < 0.2, 'driving off without a hook tows nothing');
});

test('a service truck can tow another service truck', () => {
  const wrecker = content.service.find(c => c.role === 'repair'), fuel = content.service.find(c => c.role === 'fuel');
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
