import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadContent, ROOT } from '../tools/lib/content.js';
import { newSim, spawn, advance } from './helpers.js';

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
