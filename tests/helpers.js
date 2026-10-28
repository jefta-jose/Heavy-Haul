// Shared setup for the headless physics tests.
import * as planck from 'planck';
import { createSimulation } from '../src/physics/simulation.js';
import { loadContent } from '../tools/lib/content.js';

export const DT = 1 / 120;
export const content = loadContent();
export const newSim = (car = content.car, extra = {}) => { const s = createSimulation(planck, content); s.setup = { car, ...extra }; return s; };
export function advance(sim, seconds) { for (let i = 0; i < seconds / DT; i++) sim.step(DT); }
// spawn at x, let the suspension settle, with the given drive settings
export function spawn(sim, x, { gear = 'L', awd = true, diff = true } = {}) {
  sim.init(x); Object.assign(sim.ctl, { gear, awd, diff, gas: 0, brake: 0 }); advance(sim, 2); return sim;
}
