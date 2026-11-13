import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadContent, ROOT } from '../tools/lib/content.js';
import { newSim, spawn, advance } from './helpers.js';

// Rim centres measured in the PNG masters (Codex's validation.json, checked on the previews), front axle first.
const drops = {
  'dune-pup-1': [1488, 478],
  'panthera-13': [1453, 433],
  'courier-van-1': [1341, 559],
  'interstate-14': [2042, 1482, 1345, 427, 301],
  'deuce-1': [1513, 648, 382],
  'logger-six-16': [1842, 862, 572],
  'moon-rover-1': [1010, 475],
  'ural-bear-7': [1448, 653, 367],
  'prime-mover-1': [2004, 1538, 1398, 485, 356, 230],
  'titan-tipper-11': [1230, 509],
  'ridge-pup-2': [1429, 529],
  'farm-hand-4': [1545, 472],
  'toro-furioso-16': [1493, 430],
  'milk-run-2': [1553, 476],
  'dump-rig-6': [1594, 723, 390],
  'grand-mistral-19': [1524, 469],
  'mog-2': [1399, 475],
  'brush-engine-5': [1564, 434],
  'transformer-10': [1534, 442],
  'bog-rat-2': [1523, 525],
  'mudlark-3': [1395, 507],
  'quarry-goat-11': [1594, 723, 413],
  'ballast-tractor-5': [1574, 1261, 624, 353],
  'mega-crane-6': [1608, 1387, 929, 679, 431],
};

for (const [id, hubs] of Object.entries(drops)) {
  test(`${id}: available in the garage, registered on its painted hubs, and drives`, () => {
    const { car, roster } = loadContent({ carId: id }), rig = car.rig;
    assert.equal(roster.cars.find(c => c.id === id).status, 'playable');
    assert.equal(rig.axles.length, hubs.length);
    rig.axles.forEach((x, i) => assert(Math.abs(rig.bodyOrigin[0] + x * rig.pixelsPerMetre - hubs[i]) < 3, `axle ${i} sits on its painted hub`));
    assert.deepEqual(rig.farWheelOffset, [0.2, 0.13]);
    if (car.load) assert.equal(car.physics.load.massT, car.load.massT, 'the load has physical mass');
    else assert.equal(car.physics.load, undefined, 'an empty vehicle carries nothing');
    assert.deepEqual(car.art.wheel.sourceSize, [1254, 1254]);
    for (const art of Object.values(car.art)) assert(fs.statSync(path.join(ROOT, car.dir, art.file)).size > 1000, 'runtime artwork exists');
    const s = spawn(newSim(car), 30), x = s.truck.getPosition().x;
    s.ctl.gas = 1; advance(s, 10);
    assert(s.truck.getPosition().x > x + 5, 'it drives forward on the trail');
    assert(Math.abs(s.truck.getAngle()) < .7, 'it stays upright');
    assert.equal(s.wheels.length, hubs.length);
  });
}
