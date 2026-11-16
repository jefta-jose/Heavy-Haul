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
  'arctic-cruiser-7': [1438, 494],
  'arctic-supply-8': [1906, 704, 412],
  'euro-hauler-9': [2850, 2345, 668, 482, 297],
  'glacier-ram-18': [1826, 1548, 639, 364],
  'hellfire-tracker-17': [1441, 506],
  'ice-road-15': [1904, 699, 409],
  'oilfield-service-14': [1948, 677, 378],
  'outback-train-20': [2943, 2534, 2410, 1504, 1379, 461, 339, 218],
  'pine-crawler-5': [1862, 728, 418],
  'reactor-runner-13': [2037, 1649, 1516, 1378, 735, 607, 480, 352, 224],
  'rig-mover-16': [2072, 1914, 1579, 1419, 661, 517, 378, 236],
  'sand-viper-18': [1761, 473],
  'sixfold-11': [1788, 786, 458],
  'volt-titan-20': [1838, 566],
  'wind-hauler-4': [2735, 2354, 2229, 558, 449, 341, 228],
  'razorback-5': [1485, 405],
  'canyon-bronc-10': [1505, 537],
  'dirt-bull-14': [1442, 420],
  'kensington-10': [1442, 446],
  'tuner-gt-12': [1820, 595],
  'cab-over-king-7': [2060, 1543, 1368, 391, 220],
  'dually-baron-13': [1857, 516],
  'water-bowser-12': [1922, 724, 475],
  'crane-carrier-11': [1901, 669, 425],
  'snow-dog-9': [1490, 735, 505],
  'crag-crusher-14': [1808, 760, 445],
  'amphibian-10': [1408, 1132, 695, 418],
  'wheel-loader-18': [1256, 637],
  'earthquake-20': [1390, 480],
  'excavator-hauler-14': [2050, 1660, 1530, 1400, 613, 487, 361, 233],
  'behemoth-17': [1997, 1716, 642, 368],
  'big-tusk-13': [1887, 1430, 720, 393],
  'brute-ram-17': [1533, 425],
  'container-freighter-15': [2069, 1522, 1323, 451, 251],
  'desert-ranger-17': [1595, 926, 640],
  'flatbed-express-4': [1997, 692, 385],
  'line-crew-4': [1561, 471],
  'log-giant-8': [2056, 1567, 1329, 744, 513, 282],
  'monarch-sport-12': [1518, 425],
  'prancer-18': [1885, 500],
  'rescue-engine-9': [1803, 790, 465],
  'taiga-six-8': [1636, 855, 466],
  'tank-transporter-12': [2090, 1917, 1654, 1480, 704, 551, 397, 240],
  'trail-cat-6': [1408, 448],
  'tree-hauler-18': [1971, 656, 355],
  'old-timer-3': [1424, 580],
  'ring-four-8': [1394, 535],
  'baja-hammer-20': [1406, 491],
  'typhoon-3': [1375, 551],
  'cement-mixer-5': [1362, 765, 561, 357],
  'fuel-runner-11': [1778, 1299, 1135, 517, 353],
  'nomad-camper-3': [1250, 475],
  'plough-master-6': [1274, 676, 444],
  'raptor-six-19': [1548, 700, 405],
  'swamp-ox-4': [1238, 693, 430],
  'rhino-6': [1455, 796, 480],
  'cyclops-12': [1293, 1081, 575, 367],
  'euro-heavy-3': [2023, 1853, 1699, 1546, 695, 557, 418, 277],
  'bridge-layer-7': [1536, 1322, 823, 618, 403],
  'mountain-mover-19': [1347, 612],
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
