import test from 'node:test';
import assert from 'node:assert/strict';
import { routeFeatures, drivingAdvice } from '../src/game/drive-coach.js';
import { finishRecord, recordKey, checkpointFeedback } from '../src/game/run-records.js';
import { upgradePreview } from '../src/game/upgrade-preview.js';
import { applyTuning } from '../src/game/tuning.js';
import { content, newSim, spawn, advance } from './helpers.js';
import { DAMAGE_MAX_PER_HIT } from '../src/game-config.js';
import { createCrossingTrials } from '../src/game/crossing-trials.js';

test('route preview uses scaled obstacle bounds, variable gaps and actual stations', () => {
  const trail = { start: 0, depot: 100, stations: [{ x: 50 }], heavyMud: [70], obstacleScale: 2, obstacleRuns: [{ x: 10, radius: 0.5, count: 3, gap: 2, gaps: [3] }] };
  const f = routeFeatures(trail);
  assert.equal(f[0].x, 9); assert.equal(f[0].end, 20);
  assert(f.some(x => x.kind === 'station' && x.x === 50));
  assert(f.some(x => x.kind === 'bog' && x.x === 58 && x.end === 82));
  assert.equal(f.at(-1).kind, 'depot');
  const debris = { ...trail, obstacleKinds: { log: { crush: { minMassT: 15 } } }, obstacleRuns: [{ x: 10, radius: 1, count: 1, kind: 'log' }] };
  assert.equal(routeFeatures(debris, 5)[0].breakable, false);
  assert.equal(routeFeatures(debris, 20)[0].breakable, true);
});

test('coaching explains traction, braking and recovery without inventing grounding telemetry', () => {
  const input = { st: { fuel: 100, damage: 0, speed: 0, slip: 3 }, ctl: { gas: 1 }, stuckSeconds: 3 };
  assert.match(drivingAdvice(input).text, /AWD/);
  input.ctl.awd = true; assert.match(drivingAdvice(input).text, /DIFF/);
  input.ctl.diff = true; assert.match(drivingAdvice(input).text, /Wheelspin/);
  input.st.slip = 0; assert.match(drivingAdvice(input).text, /recovery/);
  input.stuckSeconds = 0; input.st.speed = 12; input.next = { kind: 'crossing' }; input.distance = 15;
  assert.match(drivingAdvice(input).text, /brake/);
  input.next.breakable = true; assert.equal(drivingAdvice(input), null);
});

test('crossing medals require the whole rig to clear, and exclude damage, towing and teleports', () => {
  const trail = { depot: 100, obstacleRuns: [{ x: 10, radius: 1, count: 1 }] };
  const make = () => createCrossingTrials(trail);
  const sample = (t, x, damage = 0, assisted = false) => t.update({ x, front: x + 2, rear: x - 2, damage, assisted });
  const clean = make(); sample(clean, 4); sample(clean, 8); assert.equal(sample(clean, 11), null);
  assert(sample(clean, 14).clean); assert.equal(sample(clean, 15), null);
  const hit = make(); sample(hit, 4); sample(hit, 8, 10); sample(hit, 11, 10); assert(!sample(hit, 14, 10).clean);
  const tow = make(); sample(tow, 4); sample(tow, 8, 0, true); sample(tow, 11); assert(!sample(tow, 14).clean);
  const jump = make(); sample(jump, 4); assert.equal(sample(jump, 30), null);
});

test('personal bests separate maps and tuning, reject assisted runs and survive bad storage', () => {
  const store = { value: null, getItem() { return this.value; }, setItem(k, value) { this.value = value; } };
  const season = { id: 'map', trail: { heavyMud: [10] } }, car = { id: 'truck' };
  const run = { time: 100, maxDamage: 0, bogsClean: 1, splits: { 50: 40 } };
  assert(finishRecord(season, car, run, store).improved);
  assert.match(checkpointFeedback(season, car, 50, 35, store), /0:05 ahead/);
  assert(!finishRecord(season, car, { ...run, time: 80, helped: true }, store).improved);
  assert(!finishRecord(season, car, { ...run, time: 80, powered: true }, store).improved);
  assert(!finishRecord(season, car, { ...run, time: 120 }, store).improved);
  assert.match(finishRecord(season, car, { ...run, time: 90 }, store).summary, /0:10 faster/);
  assert.notEqual(recordKey(season, car), recordKey(season, { ...car, levels: { engine: 100 } }));
  store.value = 'broken'; assert(finishRecord(season, car, run, store).improved);
  assert.doesNotThrow(() => finishRecord(season, car, run, { getItem() { throw Error(); }, setItem() { throw Error(); } }));
});

test('the Upgrades card shows the real gain of a full upgrade on every playable truck', () => {
  for (const car of content.cars) {
    const tuned = applyTuning(car, { engine: 100, suspension: 100, grip: 100, speed: 100 });
    assert.match(upgradePreview(car, tuned, 'engine'), /kW/, car.id);
  }
});

test('fast solid-obstacle hits remain consequential and cap damage per impact', () => {
  const run = content.season.trail.obstacleRuns.find(r => !content.season.trail.obstacleKinds[r.kind].crush);
  const s = spawn(newSim(), run.x - 8), v = 65 / 3.6;
  for (const b of [s.truck, ...s.wheels]) b.setLinearVelocity(s.V(v, 0));
  advance(s, 2);
  const hits = s.events.filter(e => e.type === 'damage'); assert(hits.length);
  assert(hits.every(e => e.amount > 0 && e.amount <= DAMAGE_MAX_PER_HIT && e.location));
});
