// Prints the drivetrain feel numbers used for tuning: launch speeds on firm ground per range, and
// distance covered in deep mud for every 4x4 / DIFF combination.   npm run feel
import { newSim, spawn, advance } from '../tests/helpers.js';

for (const gear of ['H', 'L']) {
  const s = spawn(newSim(), 30, { gear, awd: true, diff: false }), v = [];
  s.ctl.gas = 1;
  for (let t = 0; t <= 8; t++) { v.push((s.st.speed * 3.6).toFixed(0)); advance(s, 1); }
  console.log(`firm ${gear}: km/h each second  ${v.join(' ')}`);
}
for (const [awd, diff] of [[false, false], [true, false], [false, true], [true, true]]) {
  const s = spawn(newSim(), 600, { awd, diff }), x0 = s.truck.getPosition().x;
  s.ctl.gas = 1; advance(s, 15);
  console.log(`deep mud, L, 4x4 ${awd ? 'on ' : 'off'} DIFF ${diff ? 'on ' : 'off'}: ${(s.truck.getPosition().x - x0).toFixed(1)} m in 15 s`);
}
