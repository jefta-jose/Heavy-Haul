import test from 'node:test';
import assert from 'node:assert/strict';
import { createTerrain } from '../src/physics/terrain.js';
import { speedTrapX } from '../src/game/speed-trap.js';
import { content, newSim, spawn, DT } from './helpers.js';
import { wheelRadius } from '../src/physics/vehicle.js';

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
});

test('culverts collide', () => {
  const s = spawn(newSim(), 30);
  assert.equal(s.logs.filter(l => l.kind === 'pipe').length, content.season.trail.obstacleRuns.filter(r => r.kind === 'pipe').reduce((n, r) => n + r.count, 0));
  for (const pipe of s.logs.filter(l => l.kind === 'pipe')) {
    assert.equal(pipe.body.getFixtureList().getShape().getType(), 'circle');
    assert(!pipe.body.getFixtureList().isSensor());
  }
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
  assert.deepEqual([...new Set(runs.filter(r => ['log', 'pipe'].includes(r.kind)).map(r => r.count))].sort(), [4, 5, 6]);
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
  const s = spawn(newSim(), spec.x - 16), row = s.logs.filter(l => l.run === content.season.trail.obstacleRuns.indexOf(spec));   // a run-up, as a driver has
  const lo = row[0].x, hi = row.at(-1).x, lifts = [], spring = [];
  s.ctl.gas = 1;
  for (let i = 0; i < 120 * 20; i++) {
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

test('former river stretches: the old river stretches are deep bog, still rolling around the pits', () => {
  const s = spawn(newSim(), 30), { trail } = content.season;
  assert((trail.waters ?? []).length === 0, 'all seasons use bogs instead of open water');
  assert(!trail.zones.some(z => z[2] === 'creek'), 'no riverbed surface is left');
  for (const x of [380, 1075, 2342, 3037]) assert(s.terrain.mudAt(x).heavy > 0.9, `deep bog at ${x} m`);
  const off = (() => { const { rollers, ...rest } = trail; return createTerrain(rest, content.season.surfaces); })();
  let swing = 0; for (let x = 345; x < 365; x += 0.25) swing = Math.max(swing, Math.abs(s.visH(x) - off.visH(x)));
  assert(swing > 0.2, `rolling bumps on the way to the pit (${swing.toFixed(2)} m)`);
});

test('mud holes lie only in deep mud, and rock and dirt are full of crushables', () => {
  const { trail } = content.season, s = spawn(newSim(), 30);
  assert(trail.holes.length > 0 && trail.holes.every(h => trail.heavyMud.some(c => Math.abs(c - h.x) < 10)), 'every hole is inside a bog pit');
  const on = surf => s.rocks.filter(r => r.crush && s.terrain.surfAt(r.x) === surf).length;
  const metres = surf => trail.zones.filter(z => z[2] === surf).reduce((n, z) => n + z[1] - z[0], 0);
  for (const surf of ['rock', 'dirt']) assert(on(surf) / metres(surf) > 0.05, `${surf}: ${on(surf)} crushables on ${metres(surf)} m`);
  assert(s.rocks.some(r => r.prop === 'branchPile') && s.rocks.some(r => r.crush && !r.prop), 'both stones and branch piles');
});

test('a speed limit sign stands at the first of every group of logs, pipes and hard rocks, and none for what any truck breaks', () => {
  const s = spawn(newSim(), content.season.trail.start), hurts = o => !o.crush || o.minMassT > 0;
  const solid = [...s.rocks.filter(hurts).map(r => r.x - r.w / 2), ...s.logs.filter(hurts).map(l => l.x - l.r)].filter(x => x >= content.season.trail.start).sort((a, b) => a - b);
  assert(s.logs.length && s.rocks.some(r => !r.crush), 'there are logs and hard rocks to sign');
  for (const x of s.speedSigns) {
    assert(solid.some(o => Math.abs(o - x) < 0.01) || s.terrain.stations.some(st => Math.abs(st.x - x) <= 8.01), `sign at ${x.toFixed(1)} stands at an obstacle`);
    for (const st of s.terrain.stations) assert(Math.abs(x - st.x) >= 8, `sign at ${x.toFixed(1)} clear of the station at ${st.x}`);
  }
  for (const o of solid) assert(s.speedSigns.some(x => x <= o + 0.01 && o - x < 200), `a sign at or before the obstacle at ${o.toFixed(1)}`);
});

test('a highway of 400 m follows each station, of long smooth waves, and clean: nothing on it at all', () => {
  const { highways, stations } = content.season.trail;
  assert.equal(highways.length, stations.length);
  highways.forEach((h, i) => { assert.equal(h.x0, stations[i].x + 8, 'it starts at the end of the bay'); assert.equal(h.x1 - h.x0, 400); });
  const h = highways[0], s = spawn(newSim(), h.x0 + 8);
  const y = x => s.terrain.visH(x);
  for (const r of highways) {
    let crests = 0, steepest = 0, tightest = 0;
    for (let x = r.x0 + 8; x < r.x1 - 8; x += 1) {
      const slope = (y(x + 1) - y(x - 1)) / 2, bend = y(x + 1) - 2 * y(x) + y(x - 1);
      steepest = Math.max(steepest, Math.abs(slope)); tightest = Math.max(tightest, Math.abs(bend));
      if (y(x) > y(x - 1) && y(x) >= y(x + 1)) crests++;
    }
    assert(crests >= 1, `${r.x0}: it rises and dips: ${crests} crests`);
    assert(steepest < 0.2, `${r.x0}: gradually: steepest ${steepest.toFixed(3)}`);
    assert(tightest < 0.02, `${r.x0}: with no sharp bumps: ${tightest.toFixed(4)}`);
  }
  for (const r of highways) {
    assert(!s.rocks.some(o => o.x + o.w / 2 > r.x0 && o.x - o.w / 2 < r.x1), `${r.x0}: no rocks, stones or props`);
    assert(!s.logs.some(l => l.x + l.r > r.x0 && l.x - l.r < r.x1), `${r.x0}: no logs, pipes or drums`);
    assert(!s.speedSigns.some(x => x > r.x0 + 1 && x < r.x1), `${r.x0}: no speed limit signs`);
  }
  // the lightest and the heaviest truck both smash through at full gas, unhurt and upright
  const gross = c => c.physics.mass + (c.physics.load?.massT ?? 0) * 1000, byWeight = [...content.cars].sort((a, b) => gross(a) - gross(b));
  for (const car of [byWeight[0], byWeight.at(-1)]) {
    const d = spawn(newSim(car), h.x0 + 8), x0 = d.truck.getPosition().x;
    d.ctl.auto = true; d.ctl.gas = 1;
    let t = 0, tip = 0;
    for (; t < 40 && d.truck.getPosition().x < h.x1 - 30; t += DT) { d.step(DT); tip = Math.max(tip, Math.abs(d.truck.getAngle())); }
    const gone = d.truck.getPosition().x - x0;
    assert.equal(d.st.damage, 0, `${car.id} takes no damage`);
    assert(tip < 0.5, `${car.id} stays upright (${tip.toFixed(2)} rad)`);
    assert(gone > 150, `${car.id} flies: ${gone.toFixed(0)} m in ${t.toFixed(0)} s`);
  }
});

test('roadside scenery is drawing only, and none of it stands on a station, a highway sign or camera, or a speed limit sign', () => {
  const { trail, art } = content.season, s = spawn(newSim(), trail.start);
  assert(trail.scenery.length >= 10);
  const spans = trail.scenery.map(item => {
    const a = art[item.art], [x0, y0, x1, y1] = a.crop, w = (x1 - x0) * a.heightM / (y1 - y0), step = a.repeatPx ? a.repeatPx * a.heightM / (y1 - y0) : 0;
    assert(a.heightM > 0, `${item.art} has a height`);
    return [item.x - w / 2, item.x + w / 2 + step * ((item.count ?? 1) - 1), item.art];
  });
  const clear = (x, pad, what) => { for (const [a, b, k] of spans) assert(x < a - pad || x > b + pad, `${k} at ${a.toFixed(0)} stands on ${what} at ${x.toFixed(0)}`); };
  for (const st of trail.stations) clear(st.x, 6, 'a station');
  for (const h of trail.highways) { clear(h.x0 + 8.5, 4, 'a highway sign'); clear(speedTrapX(h), 1, 'a speed camera'); }
  for (const x of s.speedSigns) clear(x, 0.5, 'a speed limit sign');
  assert.equal(s.rocks.filter(r => r.art && Object.keys(art).includes(r.art) && trail.scenery.some(i => i.art === r.art)).length, 0, 'no bodies');
});

