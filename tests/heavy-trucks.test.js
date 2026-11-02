import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadContent, ROOT } from '../tools/lib/content.js';
import { newSim, spawn, advance } from './helpers.js';

// Rim centres measured in the selected PNG masters, front axle first.
const newDrops = {
  'prairie-star-13': [1870, 1320, 253],
  'thunder-road-14': [1940, 1324, 196],
  'blacktop-15': [1765, 1131, 322],
  'iron-horse-16': [2027, 1419, 215],
  'grand-tourer-17': [1835, 1225, 255],
  'continental-18': [1888, 1353, 253],
  'autobahn-19': [1847, 1104, 236],
  'highway-titan-20': [1860, 1104, 286],
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
    if (car.class === 'highway') assert(!car.drivetrain.drivenAxles.includes(2), 'the trailer axle rolls freely');
    for (const art of Object.values(car.art)) assert(fs.statSync(path.join(ROOT, car.dir, art.file)).size > 1000, 'runtime artwork exists');
    const s = spawn(newSim(car), 30), x = s.truck.getPosition().x;
    s.ctl.gas = 1; advance(s, 10);
    assert(s.truck.getPosition().x > x + 5, 'the loaded vehicle drives forward');
    assert(Math.abs(s.truck.getAngle()) < .7, 'the load stays upright');
    assert.equal(s.wheels.length, 3);
  });
}

const hubs = {
  'mammoth-4': [1770, 492, 250],
  'colossus-5': [1873, 418, 193],
  'bulwark-6': [1937, 1469, 362, 183],
  'juggernaut-7': [1769, 1442, 394, 157],
  'behemoth-9': [1970, 1574, 346, 174],
  'leviathan-10': [1793, 1428, 335, 141],
  'monolith-11': [1802, 1490, 368, 187],
  'basalt-12': [1689, 1357, 393, 186],
  'megahaul-13': [1729, 1338, 406, 188],
  'ship-mover-15': [1712, 1372, 483, 232],
};

for (const [id, expected] of Object.entries(hubs)) {
  test(`${id}: selectable, registered to its hubs, and drives on the map`, () => {
    const content = loadContent({ carId: id }), car = content.car, rig = car.rig;
    assert.equal(car.class, 'heavy');
    assert.equal(content.roster.cars.find(c => c.id === id).status, 'playable');
    assert.equal(rig.axles.length, expected.length);
    rig.axles.forEach((ax, i) => {
      assert(Math.abs(rig.bodyOrigin[0] + ax * rig.pixelsPerMetre - expected[i]) < 3);
    });
    assert(car.physics.load.massT > 0, 'the attached cargo contributes physical mass');
    for (const art of Object.values(car.art)) {
      assert(fs.statSync(path.join(ROOT, car.dir, art.file)).size > 1000, 'runtime art exists');
    }
    const s = spawn(newSim(car), 30, { gear: 'L', awd: true, diff: true });
    const start = s.truck.getPosition().x;
    s.ctl.gas = 1;
    advance(s, 10);
    assert(s.truck.getPosition().x > start + 5, 'loaded truck drives forward');
    assert(Math.abs(s.truck.getAngle()) < .7, 'loaded truck stays upright');
    assert(Number.isFinite(s.st.rpm));
    assert.equal(s.wheels.length, expected.length);
  });
}
