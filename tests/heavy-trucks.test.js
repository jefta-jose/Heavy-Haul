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

// Hub caps painted in each registered body: the game draws the body, so its wheels go here, not at the master's hubs.
const heavyDrops = {
  'prime-mover-1': [1968, 1561, 1375, 607, 444, 279],
  'titan-2': [2020, 1613, 1422, 770, 581, 391, 201],
  'goliath-3': [2028, 1613, 1387, 892, 688, 481, 276],
  'mammoth-4': [1881, 1487, 1271, 582, 381],
  'colossus-5': [1978, 1665, 1501, 395, 233],
  'bulwark-6': [1938, 1550, 1372, 422, 247],
  'juggernaut-7': [1868, 1511, 1326, 516, 335],
  'atlas-8': [1866, 1685, 1428, 1254, 929, 755, 582, 407],
  'behemoth-9': [1846, 1572, 1378, 556, 362],
  'leviathan-10': [1826, 1509, 1312, 554, 371],
};

for (const [id, hubs] of Object.entries(heavyDrops)) {
  test(`${id}: loaded heavy hauler is selectable, registered and drives`, () => {
    const { car, roster } = loadContent({ carId: id }), rig = car.rig;
    assert.equal(roster.cars.find(c => c.id === id).status, 'playable');
    assert.equal(rig.axles.length, hubs.length);
    rig.axles.forEach((x, i) => assert(Math.abs(rig.bodyOrigin[0] + x * rig.pixelsPerMetre - hubs[i]) < 3, 'axle sits on the hub painted in the body'));
    assert.deepEqual(rig.farWheelOffset, [0.2, 0.13]);
    assert(car.physics.size[0] <= 16.8, 'whole rig fits size cap');
    assert.equal(car.physics.load.massT, car.load.massT);
    assert(car.physics.load.massT >= 22, 'cargo retains its heavy load');
    const size = file => {
      const webp = fs.readFileSync(path.join(ROOT, car.dir, file));
      assert.equal(webp.toString('ascii', 0, 4), 'RIFF');
      assert.equal(webp.toString('ascii', 8, 16), 'WEBPVP8X', 'transparent runtime art has an extended WebP header');
      return [webp.readUIntLE(24, 3) + 1, webp.readUIntLE(27, 3) + 1];
    };
    assert.deepEqual(car.art.body.registration.canvas, size(car.art.body.file), 'runtime body retains its registered canvas');
    assert.deepEqual(car.art.wheel.sourceSize, [1254, 1254], 'wheel registration retains the original canvas dimensions');
    assert.deepEqual(size(car.art.wheel.file), [512, 512], 'shipped wheel uses the smaller runtime canvas');
    for (const art of Object.values(car.art)) assert(fs.statSync(path.join(ROOT, car.dir, art.file)).size > 1000);
    const s = spawn(newSim(car), 30), x = s.truck.getPosition().x;
    s.ctl.gas = 1; advance(s, 10);
    assert(s.truck.getPosition().x > x + 5, 'loaded truck drives on the trail');
    assert(Math.abs(s.truck.getAngle()) < .7, 'cargo stays upright');
    assert.equal(s.wheels.length, hubs.length);
  });
}
