// Creates a folder for every car and service truck in assets/cars/cars.json that does not have one
// yet, holding a README with its art brief (vehicle and load) and the files Codex must deliver
// (see AGENTS.md).
//   npm run scaffold                     add missing folders
//   npm run scaffold -- --prune          remove folders of entries no longer in the roster (README-only)
//   npm run scaffold -- --refresh        also rewrite every README-only folder's README
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../lib/content.js';

const readJson = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const prune = process.argv.includes('--prune'), refresh = process.argv.includes('--refresh');

function scaffold(dir, entries, readme) {
  const ids = new Set(entries.map(e => e.id));
  let created = 0, removed = 0;
  for (const e of entries) {
    const folder = path.join(ROOT, dir, e.id);
    if (fs.existsSync(folder) && !(refresh && fs.readdirSync(folder).join() === 'README.md')) continue;
    fs.mkdirSync(folder, { recursive: true });
    fs.writeFileSync(path.join(folder, 'README.md'), readme(e));
    created++;
  }
  if (prune) for (const name of fs.readdirSync(path.join(ROOT, dir))) {
    const folder = path.join(ROOT, dir, name);
    if (!fs.statSync(folder).isDirectory() || ids.has(name)) continue;
    if (fs.readdirSync(folder).join() === 'README.md') { fs.rmSync(folder, { recursive: true }); removed++; }
    else console.warn(`  kept ${dir}/${name}: not in the roster but holds files`);
  }
  console.log(`${dir}: ${created} created${prune ? `, ${removed} removed` : ''}, ${entries.length} in the roster`);
}

const vehicleSteps = c => `## Codex delivers (see AGENTS.md)

- [ ] \`source/vehicle-master-v1.png\`: the complete vehicle${c.load ? ' **with its load**' : ''}, all wheels on, facing right, transparent, as a **strictly flat side profile** (the hard rule in AGENTS.md: no perspective, every tyre a perfect circle of the same size on one level line, no far-side tyres)
- [ ] \`source/body-v1.png\`: the same canvas with every road wheel removed${c.load ? ' (the load stays)' : ''}
- [ ] \`source/wheel-v1.png\`: one matching tyre on a square transparent canvas, hub centred, a perfect circle
- [ ] \`source/prompts.json\`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

\`art/*.webp\`, \`car.json\` (registration, physics${c.load ? ' with the load\'s mass' : ''}, drivetrain) and \`status: "playable"\`.
`;
const cars = readJson('assets/cars/cars.json');
// the wheel layout each kind of vehicle must have (the hard rule in AGENTS.md)
const wheelLayout = c => {
  const layout = c.axles <= 2
    ? 'One wheel in each arch, where this kind of vehicle has them.'
    : /trailer|semi|tractor|lowboy|lowbed|road-train|modular/i.test(`${c.art.body} ${c.art.load}`)
      ? 'Tractor with a steer axle and a drive axle or close drive tandem under the hitch; a close group of axles on the trailer under the load. Never one lone axle at the far end of a long trailer.'
      : 'Wheels under the weight: evenly spaced axles or a close rear tandem, as this kind of truck has them.';
  return `\n**Wheels (hard rule, see AGENTS.md):** ${c.axles} axles. Every tyre is a perfect circle (never oval or squashed), the same size, centred in its arch and filling it. ${layout}\n`;
};
// original designs, inspired by kinds of real vehicles (a commercial game)
const original = () => `\n**Original design (hard rule, see AGENTS.md):** an original vehicle in the spirit of the kind described: no real make or model, no badges, logos, emblems, brand names or sponsor marks, and no copy of a real vehicle's exact shape, grille or lights.\n`;
const size = c => `\nSize: about ${c.lengthM} m long${c.load ? ' with its load' : ''}. There is no length cap: draw it at its natural proportions (the game frames long vehicles with its zoom).\n`;
scaffold('assets/cars', [...cars.cars, ...cars.service], c => `# ${c.name}${c.number ? ' ' + c.number : ''}

Status: **${c.status}** · ${c.role ? `${c.role} truck for class \`${c.class}\` (${c.size}${c.towMassT ? `; tows up to ${c.towMassT} t` : ''})` : `class \`${c.class}\`, rank ${c.unlockRank} of 20`} · ${c.drive}, ${c.axles} axles · ${c.massT} t empty · ${c.powerKw} kW · ${c.wheelType} tires, ${c.tireDiameterM} m
${c.load ? `Load: **${c.load.name}**, ${c.load.massT} t\n` : 'Load: none\n'}${size(c)}${wheelLayout(c)}${original(c)}
## Art brief

- Vehicle: ${c.art.body}
- Load${c.load ? ' (drawn as part of the vehicle)' : ''}: ${c.art.load}
- Equipment: ${c.art.equipment}
- Finish: ${c.art.finish}
- Tires: ${c.art.tires}
${c.art.note ? `- Note: ${c.art.note}\n` : ''}
${vehicleSteps(c)}`);
