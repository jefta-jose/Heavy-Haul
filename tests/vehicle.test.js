// Vehicle behaviour on the current car and season: registration, suspension, traction, brakes,
// drivetrain feel, AWD / DIFF effect in mud, obstacles and trail stability.
import test from 'node:test';
import assert from 'node:assert/strict';
import { content, newSim, spawn, advance, DT } from './helpers.js';
import { drawnBodyLift, easeBodyLift } from '../src/physics/vehicle.js';
import { WHEEL_RISE_MAX_SHARE, WHEEL_DROP_MAX_SHARE } from '../src/game-config.js';

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

test('a car carries its load: it adds to its mass', () => {
  const mesa = content.cars.find(c => c.id === 'logger-six-16');
  if (!mesa) return;
  const s = newSim(mesa); s.init(30);
  assert(s.truck.getMass() > mesa.physics.mass, 'the load adds to the chassis mass');
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

test('hitting a solid obstacle at speed damages the truck, and a damaged truck is slower', () => {
  const run = content.season.trail.obstacleRuns.find(r => !content.season.trail.obstacleKinds[r.kind].crush);   // a solid log or pipe run
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
