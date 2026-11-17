// Applies CLASS_LADDER (src/game-config.js) to every playable car: in each class, in roster order, power per loaded
// tonne, tire grip and mud pull climb by a fixed step per car, ranks spread evenly over 1..20 and prices climb by a
// fixed step. Edits only those numbers in each car.json (keeping its formatting) and rewrites cars.json.
// Usage: npm run rebalance  (add -- --dry to print without writing)
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../lib/content.js';
import { deriveSpecs } from '../lib/specs.js';
import { CLASS_LADDER, SERVICE_TORQUE_MULTIPLIER } from '../../src/game-config.js';

const DRY = process.argv.includes('--dry');
const CARS = path.join(ROOT, 'assets/cars');
const read = id => fs.readFileSync(path.join(CARS, id, 'car.json'), 'utf8');
const rosterFile = path.join(CARS, 'cars.json');
const roster = JSON.parse(fs.readFileSync(rosterFile, 'utf8'));
const round = (v, d) => Math.round(v * 10 ** d) / 10 ** d;

// set a number in the car.json text; tireGrip and mudPull are added to "physics" when missing
function setNumber(text, key, value) {
  const re = new RegExp(`("${key}":\\s*)-?[0-9.eE+-]+`);
  if (re.test(text)) return text.replace(re, `$1${value}`);
  return text.replace(/("physics":\s*\{\n)(\s*)/, (m, head, indent) => `${head}${indent}"${key}": ${value},\n${indent}`);
}

const serviceOf = cls => roster.service.find(s => s.class === cls && s.status === 'playable');
for (const [cls, L] of Object.entries(CLASS_LADDER)) {
  const cars = roster.cars.filter(c => c.class === cls).sort((a, b) => a.order - b.order);
  const svc = serviceOf(cls), svcSpecs = svc && deriveSpecs(JSON.parse(read(svc.id)));
  const n = cars.length, firstPaid = cars.findIndex((c, i) => Math.floor(i * 20 / n) + 1 > 1);
  cars.forEach((entry, i) => {
    const rank = Math.floor(i * 20 / n) + 1;
    Object.assign(entry, { order: i + 1, unlockRank: rank, tier: rank, price: rank <= 1 ? 0 : L.price + (i - firstPaid) * L.priceStep });
    if (entry.status !== 'playable') return;
    let text = read(entry.id);
    const car = JSON.parse(text), now = deriveSpecs(car), tonnes = car.physics.mass / 1000 + (car.physics.load?.massT ?? 0);
    // the power the ladder asks for, kept under the class's breakdown truck (power and torque)
    let k = (L.kwPerT + i * L.kwPerTStep) * tonnes / now.powerKw;
    if (svcSpecs) k = Math.min(k, 0.95 * svcSpecs.powerKw * SERVICE_TORQUE_MULTIPLIER / now.powerKw, 0.95 * svcSpecs.torqueNm * SERVICE_TORQUE_MULTIPLIER / now.torqueNm);
    text = setNumber(text, 'torqueScale', round(car.drivetrain.torqueScale * k, 4));
    text = setNumber(text, 'tireGrip', round(L.grip + i * L.gripStep, 3));
    text = setNumber(text, 'mudPull', round(L.mudPull + i * L.mudPullStep, 3));
    const after = JSON.parse(text), specs = deriveSpecs(after);
    for (const key of ['massT', 'lengthM', 'powerKw', 'torqueNm', 'topSpeedKmh', 'fuelL', 'tireDiameterM']) entry[key] = specs[key];
    console.log(`${cls.padEnd(10)} ${String(i + 1).padStart(2)} r${String(rank).padStart(2)} ${entry.id.padEnd(22)} ${String(now.powerKw).padStart(5)} -> ${String(specs.powerKw).padStart(5)} kW (${round(specs.powerKw / tonnes, 1)} kW/t)  grip ${after.physics.tireGrip}  mud ${after.physics.mudPull}  ${entry.price}`);
    if (!DRY) fs.writeFileSync(path.join(CARS, entry.id, 'car.json'), text);
  });
}
const CLASSES = Object.keys(CLASS_LADDER);
roster.cars.sort((a, b) => CLASSES.indexOf(a.class) - CLASSES.indexOf(b.class) || a.order - b.order);
if (!DRY) fs.writeFileSync(rosterFile, JSON.stringify(roster, null, 1) + '\n');
