// Drives the whole trail checkpoint to checkpoint like a sensible player, in the car fully upgraded (a fully upgraded
// car can never get stuck, tuning.js): low range, AWD + DIFF in mud and rock or when stuck, and backing up for another
// run when it stalls on the level. There is no help to call: every section must finish on the truck's own power.
import test from 'node:test';
import assert from 'node:assert/strict';
import { content, newSim, DT } from './helpers.js';
import { applyTuning, KNOBS } from '../src/game/tuning.js';

const { trail } = content.season;
const legs = [...trail.checkpoints, trail.depot + 3];

test('the full trail can be driven by the fully upgraded car', () => {
  const sim = newSim(applyTuning(content.car, Object.fromEntries(KNOBS.map(k => [k.id, 100])))), report = [];
  for (let i = 0; i < legs.length - 1; i++) {
    sim.init(legs[i]); sim.ctl.gear = 'L';
    let hold = 0, t = 0, stuck = 0, backT = 0, tries = 0, stalled = null, crawl = 0, mark = legs[i];
    const limit = Math.max(300, (legs[i + 1] - legs[i]) * 0.4);   // a longer leg gets proportionally longer
    while (t < limit) {
      const p = sim.truck.getPosition(), speed = sim.st.speed;
      if (sim.surfAt(p.x) === 'mud' || sim.surfAt(p.x + 8) === 'mud' || sim.surfAt(p.x) === 'rock' || stuck > 1) hold = 12;
      hold -= DT; sim.ctl.awd = sim.ctl.diff = hold > 0;
      // stalled: reverse a few metres and try again
      if (backT > 0) { backT -= DT; sim.ctl.gear = 'R'; if (backT <= 0) sim.ctl.gear = 'L'; }
      else if (stuck > 3 && Math.abs(sim.truck.getAngle()) < 0.08) { backT = 2.5; stuck = 0; tries++; }   // never back down a slope into the mud
      sim.ctl.gas = 1;
      if (Math.abs(speed) < 0.2) stuck += DT; else stuck = Math.max(0, stuck - DT * 2);
      // crawling: under 5 m in 60 s is as good as stuck for good
      if (p.x - mark > 5) { mark = p.x; crawl = 0; } else crawl += DT;
      if (crawl > 60) { stalled = `stuck at ${p.x.toFixed(1)} m`; break; }
      sim.step(DT); t += DT; sim.st.fuel = 100;
      if (p.x >= legs[i + 1]) break;
      if (Math.abs(sim.truck.getAngle()) > 1.4) { stalled = `rolled at ${p.x.toFixed(0)} m`; break; }
    }
    const done = sim.truck.getPosition().x >= legs[i + 1];
    report.push(`${String(legs[i]).padStart(5)} -> ${String(legs[i + 1]).padStart(5)}: ${done ? 'OK  ' : 'FAIL'} ${t.toFixed(0)} s, ${tries} back-ups ${stalled ?? ''}`);
    assert(done, report.at(-1));
  }
  console.log(report.join('\n'));
});
