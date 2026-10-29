import test from 'node:test';
import assert from 'node:assert/strict';
import { content, newSim, spawn, advance, DT } from './helpers.js';
import { wheelRadius } from '../src/physics/vehicle.js';
import * as pl from 'planck';

test('rock gardens repeatedly articulate the suspension and remain crossable', () => {
  const garden = content.season.trail.rockGardens[0], s = spawn(newSim(), garden.x0 - 3);
  const travel = [];
  s.ctl.gas = 1;
  for (let i = 0; i < 120 * 14; i++) {
    s.step(DT);
    const p = s.wheels[0].getPosition();
    if (p.x >= garden.x0 && p.x <= garden.x1) travel.push(s.truck.getLocalPoint(p).y);
  }
  assert(s.rocks.filter(r => r.garden).length >= 50, 'many collidable garden stones, not painted gravel');
  assert(s.truck.getPosition().x > garden.x1, 'the stock scout can drive through');
  assert(Math.max(...travel) - Math.min(...travel) > 0.12, 'the wheels move on their springs over successive rocks');
});

test('authored holes lower the physical wheel path below the approach road', () => {
  const hole = content.season.trail.holes[0], s = spawn(newSim(), hole.x - 8);
  const a = hole.x - hole.width / 2, b = hole.x + hole.width / 2;
  const ya = s.visH(a), yb = s.visH(b);
  let dropped = 0;
  s.ctl.gas = 1;
  for (let i = 0; i < 120 * 18; i++) {
    s.step(DT);
    const p = s.wheels[0].getPosition();
    if (p.x >= a && p.x <= b) {
      const approach = ya + (yb - ya) * (p.x - a) / (b - a);
      dropped = Math.max(dropped, approach - (p.y - wheelRadius(s.car.rig, 0)));
    }
  }
  assert(dropped > 0.45, 'a tire actually drops into the depression');
  assert(s.wheels[0].getPosition().x > b, 'the sloped exit can be climbed');
});

test('culverts collide and a broken bridge has a real missing deck segment', () => {
  const s = spawn(newSim(), 30);
  assert.equal(s.logs.filter(l => l.kind === 'pipe').length, content.season.trail.obstacleRuns.filter(r => r.kind === 'pipe').reduce((n, r) => n + r.count, 0));
  for (const pipe of s.logs.filter(l => l.kind === 'pipe')) {
    assert.equal(pipe.body.getFixtureList().getShape().getType(), 'circle');
    assert(!pipe.body.getFixtureList().isSensor());
  }
  const broken = s.bridges.find(b => b.missingBoard != null), missing = broken.boards[broken.missingBoard];
  assert(missing.missing && missing.body.getFixtureList().isSensor(), 'the missing board cannot support a tire');
  const p = missing.body.getPosition();
  assert(p.y - s.terrain.colH(p.x) > 1, 'there is a physical gully below the gap');
});

test('deep bogs have a deeper physical bed and visibly greater tire immersion', () => {
  const immersion = x => {
    const s = spawn(newSim(), x);
    return { mud: s.terrain.mudAt(x), depth: s.wheels.reduce((n, w, i) => n + s.visH(w.getPosition().x) - w.getPosition().y + wheelRadius(s.car.rig, i), 0) / s.wheels.length };
  };
  const normal = immersion(150), deep = immersion(content.season.trail.heavyMud[0]);
  assert(deep.mud.intensity > normal.mud.intensity + 0.3, 'same field used for darker, wetter mud');
  assert(deep.mud.depth > normal.mud.depth + 0.1, 'bog bed is deeper than ordinary mud');
  assert(deep.depth > normal.depth + 0.08, 'tires actually sink farther, not just a visual tint');
});

test('all logs and pipes form ground-level runs of four to six with varied gaps', () => {
  const s = spawn(newSim(), 30), runs = content.season.trail.obstacleRuns;
  assert.equal(s.logs.length, runs.reduce((n, run) => n + run.count, 0), 'no isolated or extra stacked obstacles');
  assert.deepEqual([...new Set(runs.map(r => r.count))].sort(), [4, 5, 6]);
  const gaps = [];
  for (const [index, spec] of runs.entries()) {
    const row = s.logs.filter(l => l.run === index).sort((a,b) => a.x-b.x);
    assert.equal(row.length, spec.count);
    for (let i = 0; i < row.length; i++) {
      const l = row[i], r = l.r;
      assert.equal(l.kind, spec.kind);
      assert(l.body.isStatic() && !l.stacked);
      assert.equal(l.body.getFixtureList().getShape().getType(), 'circle');
      const bed = Math.max(s.terrain.colH(l.x-r*.6), s.terrain.colH(l.x), s.terrain.colH(l.x+r*.6));
      assert(Math.abs(l.y-bed-r*.3)<1e-6, 'every obstacle sits on the local road, never a raised row');
      if (i) {
        const previous = row[i-1], gap = l.x-previous.x-l.r-previous.r;
        assert(gap >= 0.14, 'circles do not overlap into a pile'); gaps.push(gap);
      }
    }
  }
  assert(Math.min(...gaps)<0.3 && Math.max(...gaps)>1.5, 'tight runs alternate with tire-drop gaps');
});

test('a spaced pipe run lets tires drop between crests and bounce on their springs', () => {
  const spec = content.season.trail.obstacleRuns.find(r => r.kind === 'pipe' && r.gaps?.some(g => g > 1.5));
  const s = spawn(newSim(), spec.x - 6), row = s.logs.filter(l => l.run === content.season.trail.obstacleRuns.indexOf(spec));
  const lo = row[0].x, hi = row.at(-1).x, lifts = [], spring = [];
  s.ctl.gas = 1;
  for (let i = 0; i < 120 * 12; i++) {
    s.step(DT);
    const p = s.wheels[0].getPosition();
    if (p.x >= lo && p.x <= hi) {
      lifts.push(p.y - wheelRadius(s.car.rig, 0) - s.terrain.colH(p.x));
      spring.push(s.truck.getLocalPoint(p).y);
    }
  }
  assert(s.truck.getPosition().x > hi + 2, 'the stock scout crosses the whole run');
  assert(Math.max(...lifts) > 0.3 && Math.min(...lifts) < 0.08, 'tires rise over pipes and return close to the road');
  assert(Math.max(...spring) - Math.min(...spring) > 0.15, 'the repeated obstacles articulate the suspension');
});

test('a loaded bridge flexes, cracks and remains crossable by the scout', () => {
  const s = spawn(newSim(), 350), bridge = s.bridges[0];
  const rest = bridge.boards.map(b => b.body.getPosition().y);
  s.ctl.gas = 1;
  let moved = 0;
  for (let i = 0; i < 120 * 15; i++) {
    s.step(DT);
    moved = Math.max(moved, ...bridge.boards.map((b, j) => Math.abs(b.body.getPosition().y - rest[j])));
  }
  assert(moved > 0.08, 'the physical boards move under the truck');
  assert(s.truck.getPosition().x > bridge.x1 + 4, 'the truck can cross the suspended deck');
  assert(bridge.boards.some(b => b.cracked) && s.events.some(e => e.type === 'bridge-crack'));
  assert(!bridge.broken, 'normal axle load does not destroy the bridge');
});

test('sustained overload can break a bridge hinge without destabilizing the world', () => {
  const s = spawn(newSim(), 30), bridge = s.bridges[0], board = bridge.boards[Math.floor(bridge.boards.length / 2)];
  const p = board.body.getPosition();
  const load = s.world.createBody({ type: 'dynamic', position: s.V(p.x, p.y + 0.8) });
  load.createFixture(new pl.Circle(0.6), { density: 200000, friction: 1, userData: { tire: true } });
  advance(s, 5);
  assert(bridge.broken && bridge.hinges.some(j => j === null), 'an overloaded connection releases');
  assert(s.events.some(e => e.type === 'bridge-break'));
  for (const b of bridge.boards) assert(Number.isFinite(b.body.getPosition().y) && Number.isFinite(b.body.getAngle()));
});

// Ruts (physics/ground.js): tires press the soft ground in by their load and time, churned ground
// is harder, ruts heal slowly and survive being stored.
test('heavier trucks rut deeper, and standing still keeps sinking', () => {
  const X = 1440, deepest = (s, x) => { let m = 0; for (let q = x - 15; q < x + 15; q += 0.25) m = Math.max(m, s.ground.depthAt(q)); return m; };
  const parked = (car, secs) => { const s = spawn(newSim(car), X); advance(s, secs); return deepest(s, X); };
  const scout = content.cars.find(c => c.id === 'swamp-scout-4'), heavy = content.cars.find(c => c.id === 'ice-breaker-19');
  if (!scout || !heavy) return;
  const s5 = parked(scout, 5), s20 = parked(scout, 20), h5 = parked(heavy, 5);
  assert(s20 > s5 * 1.5, `the longer it stands, the deeper (${s5.toFixed(3)} -> ${s20.toFixed(3)} m)`);
  assert(h5 > s5 * 1.5, `a heavier truck sinks deeper (${s5.toFixed(3)} vs ${h5.toFixed(3)} m)`);
  assert(s20 < scout.rig.radius * 0.45, 'a rut never swallows the tire');
});

test('ruts only form on soft ground, heal slowly, and survive being stored', () => {
  const s = spawn(newSim(), 460);   // rock garden
  s.ctl.gas = 1; advance(s, 4);
  let rock = 0; for (let x = 450; x < 480; x += 0.25) if (s.surfAt(x) === 'rock') rock = Math.max(rock, s.ground.depthAt(x));
  assert.equal(rock, 0, 'rock does not rut');
  const m = spawn(newSim(), 1440); advance(m, 10);
  let x = 1440; for (let q = 1425; q < 1455; q += 0.25) if (m.ground.depthAt(q) > m.ground.depthAt(x)) x = q;
  const d0 = m.ground.depthAt(x); assert(d0 > 0.02);
  const stored = m.ground.export(0);
  m.ground.heal(1);    // the truck is still parked on it: pressed cells skip one heal tick
  m.ground.heal(420);
  assert(Math.abs(m.ground.depthAt(x) - d0 / 2) < 0.004, 'half the depth heals in 7 minutes untouched');
  const fresh = newSim(); assert(fresh.ground.import(stored, 420e3));
  assert(Math.abs(fresh.ground.depthAt(x) - d0 / 2) < 0.006, 'a stored field comes back healed by the time that passed');
  assert(fresh.ground.import(stored, 0) && Math.abs(fresh.ground.depthAt(x) - d0) < 0.005, 'and exact when no time passed');
});

test('a road a heavy truck churned is harder for a scout', () => {
  const scout = content.cars.find(c => c.id === 'swamp-scout-4'), heavy = content.cars.find(c => c.id === 'mountain-mover-18');
  if (!scout || !heavy) return;
  const X = 560, drive = s => { const x0 = s.truck.getPosition().x; s.ctl.gas = 1; advance(s, 15); return s.truck.getPosition().x - x0; };
  const fresh = drive(spawn(newSim(scout), X - 20));
  const s = newSim(heavy); spawn(s, X - 20); s.ctl.gas = 1; advance(s, 15);
  for (let k = 0; k < 2; k++) { s.ctl.gear = 'R'; advance(s, 12); s.ctl.gear = 'L'; advance(s, 12); }
  s.setup = { car: scout }; spawn(s, X - 20);
  const churned = drive(s);
  assert(churned < fresh * 0.6, `the scout makes less progress in churned mud (${fresh.toFixed(1)} vs ${churned.toFixed(1)} m)`);
});
