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

const vehicleSteps = `## Codex delivers (see AGENTS.md)

- [ ] \`source/vehicle-master-v1.png\`: the complete vehicle **with its load**, all wheels on, facing right, transparent, as a **strictly flat side profile** (the hard rule in AGENTS.md: no perspective, all tires the same size on one level line, no far-side tires)
- [ ] \`source/body-v1.png\`: the same canvas with every road wheel removed (the load stays)
- [ ] \`source/wheel-v1.png\`: one matching tire on a square transparent canvas, hub centred
- [ ] \`source/prompts.json\`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

\`art/*.webp\`, \`car.json\` (registration, physics with the load's mass, drivetrain) and \`status: "playable"\`.
`;
const cars = readJson('assets/cars/cars.json');
scaffold('assets/cars', [...cars.cars, ...cars.service], c => `# ${c.name}${c.number ? ' ' + c.number : ''}

Status: **${c.status}** · ${c.role ? `${c.role} truck for class \`${c.class}\` (${c.size}${c.towMassT ? `; tows up to ${c.towMassT} t` : ''})` : `class \`${c.class}\`, tier ${c.tier} of 20`} · ${c.drive}, ${c.axles} axles · ${c.massT} t empty · ${c.powerKw} kW · ${c.wheelType} tires, ${c.tireDiameterM} m
${c.load ? `Load: **${c.load.name}**, ${c.load.massT} t\n` : ''}
## Art brief

- Vehicle: ${c.art.body}
- Load (drawn as part of the vehicle): ${c.art.load}
- Equipment: ${c.art.equipment}
- Finish: ${c.art.finish}
- Tires: ${c.art.tires}
${c.art.note ? `- Note: ${c.art.note}\n` : ''}
${vehicleSteps}`);
