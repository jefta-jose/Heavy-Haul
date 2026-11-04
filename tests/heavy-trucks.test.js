import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadContent, ROOT } from '../tools/lib/content.js';
import { newSim, spawn, advance } from './helpers.js';

// Rim centres measured in the selected PNG masters, front axle first.
const newDrops = {
  'fieldmaster-5': [1531, 638, 336],
  'stonebridge-6': [1596, 612, 361],
  'bushline-9': [1531, 593, 287],
  'rangeline-10': [1485, 579, 352],
  'northgate-11': [1433, 572, 298],
  'quarryman-13': [1494, 595, 290],
  'timberjack-14': [1569, 599, 294],
  'bedrock-15': [1651, 640, 356],
  'boulder-boss-16': [1912, 632, 356],
  'logger-king-17': [1707, 578, 290],
  'valley-workhorse-3': [1768, 918, 469],
  'ironbark-4': [1795, 754, 421],
};

for (const [id, expected] of Object.entries(newDrops)) {
  test(`${id}: available in the garage, registered, and drives with its cargo`, () => {
    const content = loadContent({ carId: id }), car = content.car, rig = car.rig;
    const entry = content.roster.cars.find(c => c.id === id);
    assert.equal(entry.status, 'playable');
    assert.equal(rig.axles.length, expected.length);
    rig.axles.forEach((ax, i) => assert(Math.abs(rig.bodyOrigin[0] + ax * rig.pixelsPerMetre - expected[i]) < 3, `axle ${i} matches its painted rim`));
    assert.equal(car.physics.load.massT, car.load.massT);
    assert(car.physics.load.massT > 0, 'cargo has physical mass');
    for (const art of Object.values(car.art)) assert(fs.statSync(path.join(ROOT, car.dir, art.file)).size > 1000, 'runtime artwork exists');
    const s = spawn(newSim(car), 30), x = s.truck.getPosition().x;
    s.ctl.gas = 1; advance(s, 10);
    assert(s.truck.getPosition().x > x + 5, 'the loaded vehicle drives forward');
    assert(Math.abs(s.truck.getAngle()) < .7, 'the load stays upright');
    assert.equal(s.wheels.length, 3);
  });
}

test('no vehicle is longer than the size cap, so obstacles never need scaling per truck', () => {
  const content = loadContent(), cap = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/cars/cars.json'), 'utf8')).maxLengthM;
  assert(cap > 0, 'the roster sets a cap');
  for (const car of [...content.cars, ...content.service]) assert(Math.round(car.physics.size[0] * 10) / 10 <= cap, `${car.id}: ${car.physics.size[0]} m is over the cap of ${cap} m`);   // to the 0.1 m the cap is stated in
});
