// Drives fully upgraded cars to check none can get stuck.
//   node tools/stuck-sweep.mjs <season> <mode: bogs|trail> <shard> <shards>
// Prints one JSON line per car: { car, season, ok, where }. Env: CAR=<id> one car only, TRACE=1 print the drive,
// SAMPLE=n every nth car, NO_STOPS=1 one drive from start to depot, NO_GHOST=1 drive it maxed but without the never-stuck rules (to compare).
import * as planck from 'planck';
import { createSimulation } from '../src/physics/simulation.js';
import { loadContent } from './lib/content.js';
import { applyTuning, KNOBS } from '../src/game/tuning.js';

const [season, mode = 'bogs', shard = '0', shards = '1'] = process.argv.slice(2);
const content = loadContent({ seasonId: season });
const DT = 1 / 120, max = Object.fromEntries(KNOBS.map(k => [k.id, 100]));
const { trail } = content.season;

// drive like a player: L, AWD + DIFF, back up for another run when it stalls on the level
function drive(sim, from, to, limit) {
  sim.init(from); Object.assign(sim.ctl, { gear: 'L', awd: true, diff: true, auto: false });
  let t = 0, stuck = 0, backT = 0, crawl = 0, mark = from;
  while (t < limit) {
    const p = sim.truck.getPosition();
    if (p.x >= to) return null;
    if (backT > 0) { backT -= DT; sim.ctl.gear = 'R'; if (backT <= 0) sim.ctl.gear = 'L'; }
    else if (stuck > 3 && Math.abs(sim.truck.getAngle()) < 0.08) { backT = 2.5; stuck = 0; }
    sim.ctl.gas = 1;
    if (Math.abs(sim.st.speed) < 0.2) stuck += DT; else stuck = Math.max(0, stuck - DT * 2);
    if (p.x - mark > 5) { mark = p.x; crawl = 0; } else crawl += DT;
    if (crawl > 45) return `stuck at ${p.x.toFixed(0)} m`;
    if (process.env.TRACE && Math.round(t * 120) % 30 === 0) console.log(t.toFixed(2), p.x.toFixed(1), (sim.truck.getAngle() * 57.3).toFixed(0), (sim.st.speed * 3.6).toFixed(0), sim.ctl.gear, sim.st.surf);
    if (Math.abs(sim.truck.getAngle()) > 1.4) return `rolled at ${p.x.toFixed(0)} m`;
    sim.step(DT); t += DT; sim.st.fuel = 100; sim.st.damage = 0;
  }
  return `too slow, at ${sim.truck.getPosition().x.toFixed(0)} m`;
}

const half = content.season.trail.bogHalfM ?? 14;
content.cars.forEach((car, i) => {
  const sample = Number(process.env.SAMPLE ?? 1);   // SAMPLE=4: every 4th car
  if (process.env.CAR ? car.id !== process.env.CAR : i % sample || (i / sample) % Number(shards) !== Number(shard)) return;
  const sim = createSimulation(planck, content); const tuned = applyTuning(car, max); if (process.env.NO_GHOST) delete tuned.physics.neverStuck; sim.setup = { car: tuned };
  let where = null;
  if (mode === 'bogs') for (const c of trail.heavyMud ?? []) { where = drive(sim, c - half - 12, c + half + 15, 90); if (where) break; }
  // legs from checkpoint to checkpoint, each from a standstill; NO_STOPS=1 drives start to depot in one go, like a player
  else { const legs = process.env.NO_STOPS ? [trail.start, trail.depot + 3] : [...trail.checkpoints, trail.depot + 3]; for (let l = 0; l < legs.length - 1 && !where; l++) where = drive(sim, legs[l], legs[l + 1], Math.max(300, (legs[l + 1] - legs[l]) * 0.4)); }
  console.log(JSON.stringify({ car: car.id, cls: car.class, season, ok: !where, where }));
});
