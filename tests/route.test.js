// Drives the whole trail checkpoint to checkpoint like a sensible player: low range, 4x4 + DIFF in
// mud and rock or when stuck, backing up for another run when it stalls on the level, and calling a breakdown
// truck to tow it out on the winch when it is properly stuck (the heavy-mud pits). Every section must finish.
import test from 'node:test';
import assert from 'node:assert/strict';
import { content, newSim, DT } from './helpers.js';

const { trail } = content.season;
const legs = [...trail.checkpoints, trail.depot + 3];
// the main truck's breakdown truck; until its art exists the nearest class's stands in, serving the
// main truck's class (a check that the trail can be cleared; the game itself offers no stand-ins)
const rank = id => content.roster.classes.findIndex(c => c.id === id);
const wrecker = content.service.filter(s => s.role === 'breakdown').sort((a, b) => Math.abs(rank(a.class) - rank(content.car.class)) - Math.abs(rank(b.class) - rank(content.car.class)))[0];

// call the breakdown truck ahead of the main truck, back it up to the hook reach, hook on and
// drive away until the main truck is out and rolling, then unhook
function rescue(sim) {
  const main = sim.main, v = sim.spawnService(wrecker, undefined, main.car.class);
  Object.assign(v.ctl, { gear: 'R', awd: true, diff: true });
  for (let i = 0; i < 120 * 2; i++) sim.step(DT);   // let it settle
  sim.setActive(v);
  let t = 0;
  while (t < 20 && sim.nearestHook().d > sim.winchReach - 1.5) { v.ctl.gas = 1; sim.step(DT); t += DT; }
  v.ctl.gas = 0; for (let i = 0; i < 60; i++) sim.step(DT);
  if (sim.toggleWinch(v).attached) {
    // if the service truck stalls on the tow, back up a little and take a run at it
    v.ctl.gear = 'L'; const x0 = main.parts.truck.getPosition().x; let go = 0, stall = 0, back = 0;
    while (go < 40 && main.parts.truck.getPosition().x - x0 < 12) {
      if (back > 0) { back -= DT; v.ctl.gear = 'R'; if (back <= 0) v.ctl.gear = 'L'; }
      else if (stall > 1.5) { back = 1.2; stall = 0; }
      v.ctl.gas = 1; sim.step(DT); go += DT;
      stall = Math.abs(v.st.speed) < 0.2 ? stall + DT : Math.max(0, stall - DT);
    }
    t += go; v.ctl.gas = 0; sim.toggleWinch(v);
  }
  sim.setActive(main);
  return t;
}

test('the full trail can be driven, with a breakdown truck for the worst mud', () => {
  assert(wrecker, 'a playable service truck');
  const sim = newSim(), report = [];
  for (let i = 0; i < legs.length - 1; i++) {
    sim.init(legs[i]); sim.ctl.gear = 'L';
    let hold = 0, t = 0, stuck = 0, backT = 0, tries = 0, rescues = 0, winchT = 0, stalled = null;
    while (t < 300) {
      const p = sim.truck.getPosition(), speed = sim.st.speed;
      if (sim.surfAt(p.x) === 'mud' || sim.surfAt(p.x + 8) === 'mud' || sim.surfAt(p.x) === 'rock' || stuck > 1) hold = 12;
      hold -= DT; sim.ctl.awd = sim.ctl.diff = hold > 0;
      // stalled: reverse a few metres and try again; after a few tries, call the breakdown truck
      if (backT > 0) { backT -= DT; sim.ctl.gear = 'R'; if (backT <= 0) sim.ctl.gear = 'L'; }
      else if (stuck > 3 && tries < 3 && Math.abs(sim.truck.getAngle()) < 0.08) { backT = 2.5; stuck = 0; tries++; }   // never back down a slope into the mud
      else if (stuck > 3) { winchT += rescue(sim); rescues++; tries = 0; stuck = 0; }
      sim.ctl.gas = 1;
      if (Math.abs(speed) < 0.2) stuck += DT; else stuck = Math.max(0, stuck - DT * 2);
      if (rescues > 6) { stalled = `stalled at ${p.x.toFixed(1)} m`; break; }
      sim.step(DT); t += DT; sim.st.fuel = 100;
      if (p.x >= legs[i + 1]) break;
      if (Math.abs(sim.truck.getAngle()) > 1.4) { stalled = `rolled at ${p.x.toFixed(0)} m`; break; }
    }
    const done = sim.truck.getPosition().x >= legs[i + 1];
    report.push(`${String(legs[i]).padStart(5)} -> ${String(legs[i + 1]).padStart(5)}: ${done ? 'OK  ' : 'FAIL'} ${t.toFixed(0)} s, ${rescues} rescues (${winchT.toFixed(0)} s winching) ${stalled ?? ''}`);
    assert(done, report.at(-1));
  }
  console.log(report.join('\n'));
});
