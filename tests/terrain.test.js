import test from 'node:test';
import assert from 'node:assert/strict';
import { content, newSim, spawn, advance, DT } from './helpers.js';
import { wheelRadius } from '../src/physics/vehicle.js';
import * as pl from 'planck';

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

test('each authored obstacle is four stacked physical logs', () => {
  const s = spawn(newSim(), 30);
  for (const [index, spec] of content.season.trail.logPiles.entries()) {
    const logs = s.logs.filter(l => l.stacked && l.pile === index);
    assert.equal(logs.length, 4);
    assert(logs.every(l => l.r >= spec.radius * 0.89 && l.body.isStatic()));
    assert(Math.max(...logs.map(l => l.y)) - Math.min(...logs.map(l => l.y)) > spec.radius, 'a raised top row, not four logs in a flat line');
    assert(logs.every(l => l.body.getFixtureList().getShape().getType() === 'circle'));
  }
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
