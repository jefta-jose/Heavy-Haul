// Sound from real recordings: every clip in the bank is traceable to a licensed source with its
// credit, each truck class has a complete engine, every car plays its class's engine, and the engine
// mix behaves. Rendering and decoding are checked in the browser test and npm run audio:preview.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { content } from './helpers.js';
import { readSoundBank, resolveAudio } from '../tools/lib/content.js';
import { engineProfile, engineMix, engineLoad, engineTelemetry, newRevs, stepRevs } from '../src/audio/engine.js';
import { createInput } from '../src/game/input.js';

const bank = readSoundBank(), recipe = JSON.parse(fs.readFileSync(new URL('../assets/audio/sounds.json', import.meta.url)));
const sources = JSON.parse(fs.readFileSync(new URL('../assets/audio/sources.json', import.meta.url))).sources;
const trucks = [...content.cars, ...content.service];
const file = rel => new URL(`../assets/audio/${rel}`, import.meta.url);
const CLASSES = ['scout', 'highway', 'heavy-duty', 'offroad', 'heavy'];

test('pedals retain analog gamepad, drag and pen pressure values', () => {
  const savedWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const savedNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const events = () => ({ handlers: {}, addEventListener(type, fn) { this.handlers[type] = fn; }, setPointerCapture() {} });
  const win = events(), els = Object.fromEntries(['gas', 'brake', 'winch', 'handbrakeBtn', 'engineBtn'].map(k => [k, events()]));
  let pads = [];
  Object.defineProperty(globalThis, 'window', { configurable: true, value: win });
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { getGamepads: () => pads } });
  try {
    const actions = new Proxy({}, { get: () => () => {} }), input = createInput(els, actions);
    const event = { preventDefault() {}, pointerId: 1, clientY: 100, pointerType: 'mouse' };
    els.gas.handlers.pointerdown(event);
    assert.equal(input.read().gas, 1);
    els.gas.handlers.pointermove({ ...event, clientY: 165 });
    assert(Math.abs(input.read().gas - 0.35) < 1e-9);
    els.gas.handlers.pointerup();
    els.gas.handlers.pointerdown({ ...event, pointerType: 'touch' });
    els.gas.handlers.pointermove({ ...event, pointerType: 'touch', clientY: 165 });
    assert.equal(input.read().gas, 1, 'touch stays at full pedal while held');
    els.gas.handlers.pointerup();
    const buttons = Array.from({ length: 8 }, () => ({ value: 0 }));
    buttons[7].value = 0.42; buttons[6].value = 0.27;
    pads = [{ mapping: 'standard', buttons }];
    assert.deepEqual(input.read(), { gas: 0.42, brake: 0.27 });
    pads = [];
    els.gas.handlers.pointerdown({ ...event, pointerType: 'pen', pressure: 0.6 });
    assert.equal(input.read().gas, 0.6);
    els.gas.handlers.pointerup();
    win.handlers.keydown({ code: 'ArrowRight', preventDefault() {} });
    assert.equal(input.read().gas, 1);
    win.handlers.keyup({ code: 'ArrowRight' });
    assert.equal(input.read().gas, 0);
  } finally {
    if (savedWindow) Object.defineProperty(globalThis, 'window', savedWindow); else delete globalThis.window;
    if (savedNavigator) Object.defineProperty(globalThis, 'navigator', savedNavigator); else delete globalThis.navigator;
  }
});

test('engine load follows the pedal and what the truck is pulling, and lifting off unloads it', () => {
  assert(engineLoad(1, 0.2) > engineLoad(0.25, 0.2));
  assert(engineLoad(1, 1) > engineLoad(1, 0.2));
  assert.equal(engineLoad(0, 1), 0, 'lifting off unloads even while wheels keep the revs high');
  assert.equal(engineLoad(NaN, NaN), 0);
});

test('engine load follows wheel-joint reaction torque rather than truck angle', () => {
  let torque = 25;
  const v = { st: { rpm: 1000, power: 100, throttle: 0.8 }, ctl: { gear: 'H' }, car: { drivetrain: { gears: { H: 10 }, efficiency: 0.9 } }, parts: { joints: [{ getMotorTorque(hz) { assert.equal(hz, 120); return torque; } }] } };
  const light = engineTelemetry(v).load;
  torque = 8000;
  assert(engineTelemetry(v).load > light);
  v.st.throttle = 0;
  assert.equal(engineTelemetry(v).load, 0);
});

// a drive: seconds at a pedal, load, speed and wheel slip, stepped like the game
function run(pack, revs, seconds, input) {
  const log = [];
  for (let t = 0; t < seconds; t += 1 / 60) {
    const i = typeof input === 'function' ? input(t / seconds) : input;
    stepRevs(revs, pack, i, 1 / 60);
    log.push({ revs: revs.revs, gear: revs.gear, shifted: revs.shifted, chuff: revs.chuff });
  }
  return log;
}

test('the sound revs flare, climb through the gears and shift, unlike the flat physics rpm', () => {
  for (const cls of CLASSES) {
    const pack = bank.engines[cls], revs = newRevs(), top = pack.gears.at(-1);
    const launch = run(pack, revs, 1.5, { pedal: 1, load: 0.8, kmh: 0 });
    assert(Math.abs(launch.at(-1).revs - pack.stall) < 0.05, `${cls}: full pedal at rest holds the converter stall`);
    const climb = run(pack, revs, 25, t => ({ pedal: 1, load: 0.8, kmh: top * 0.98 * t }));
    const shifts = climb.filter(s => s.shifted).length;
    assert.equal(shifts, pack.gears.length - 1, `${cls}: one shift per gear on the way up`);
    assert.equal(revs.gear, pack.gears.length - 1);
    // each shift drops the revs, then they climb again
    const peaks = climb.map((s, i) => s.shifted ? [climb[i - 1].revs, climb[Math.min(i + 20, climb.length - 1)].revs] : null).filter(Boolean);
    for (const [before, after] of peaks) assert(after < before, `${cls}: the revs drop on a shift`);
    assert(Math.max(...climb.map(s => s.revs)) > 0.6 && Math.min(...climb.map(s => s.revs)) > 0.1, `${cls}: a real rev range`);
    const down = run(pack, revs, 20, t => ({ pedal: 0, load: 0, kmh: top * (1 - t) }));
    assert(down.filter(s => s.shifted).length >= pack.gears.length - 1, `${cls}: downshifts slowing down`);
    run(pack, revs, 2, { pedal: 0, load: 0, kmh: 0 });
    assert(revs.revs < 0.02 && revs.gear === 0, `${cls}: back to idle in first`);
  }
});

test('spinning wheels race the engine; a stuck truck with grip lugs at the stall', () => {
  for (const cls of CLASSES) {
    const pack = bank.engines[cls], lug = newRevs(), spin = newRevs();
    run(pack, lug, 3, { pedal: 1, load: 1, kmh: 0.5, slip: 0, tops: [20] });
    run(pack, spin, 3, { pedal: 1, load: 0.4, kmh: 0.5, slip: 6, tops: [20] });
    assert(spin.revs > 0.9, `${cls}: wheelspin ${spin.revs}`);
    assert(lug.revs < 0.5, `${cls}: lugging ${lug.revs}`);
  }
});

test('the turbo spools with load and lets go once when lifting off', () => {
  const pack = bank.engines.highway, revs = newRevs();
  run(pack, revs, 4, { pedal: 1, load: 1, kmh: 25, tops: [30] });
  assert(revs.boost > 0.6, 'boost builds');
  const lift = run(pack, revs, 2, { pedal: 0, load: 0, kmh: 25, tops: [30] });
  assert.equal(lift.filter(s => s.chuff).length, 1, 'one chuff per lift');
  assert(revs.boost < 0.05, 'boost falls away');
});

test('every recording is licensed and credited, with where to fetch it and its hash', () => {
  for (const s of sources) {
    assert(['CC0-1.0', 'CC-BY-4.0'].includes(s.license), `${s.id}: CC0 or CC BY`);
    assert(s.author && s.title && s.page.startsWith('https://freesound.org/people/'), `${s.id}: credit`);
    assert(s.download.startsWith('https://') && /^[0-9a-f]{64}$/.test(s.sha256), `${s.id}: rebuildable`);
  }
});

test('the bank matches its recipe: every clip exists and comes from a listed recording', () => {
  for (const [name, clip] of Object.entries(bank.clips)) {
    assert(fs.statSync(file(clip.file)).size > 2000, `${name}: file`);
    for (const id of clip.sources) assert(sources.some(s => s.id === id), `${name}: source ${id}`);
  }
  for (const name of Object.keys(recipe.effects)) assert(bank.effects[name]?.length, `${name}: built`);
  for (const name of ['air-release', 'air-burst', 'air-pop', 'hydraulic-brake', 'handbrake-on', 'handbrake-off', 'gear-clunk', 'hook-clank', 'creak', 'splash', 'splash-small', 'cargo-light', 'cargo-chains', 'cargo-heavy-chains', 'cargo-metal', 'rattle', 'rattle-bed', 'underbody', 'crow', 'crow-far', 'wade', 'water-churn', 'mud', 'mud-spin', 'gravel', 'dirt', 'rocks', 'winch-motor', 'cable-strain', 'fuel-pump', 'fuel-flow', 'turbo', 'forest', 'frogs'])
    assert(bank.effects[name], `the game plays ${name}`);
});

test('nothing unused ships: every clip in the bank is an engine layer or an effect, and every recording is used', () => {
  const played = new Set(Object.values(bank.effects).flat());
  for (const e of Object.values(bank.engines)) for (const l of [e.idle, e.coast, e.sub, ...e.on, ...(e.pull ?? [])]) if (l) played.add(l.clip);
  for (const e of Object.values(bank.engines)) { played.add(e.start); if (e.stop) played.add(e.stop); }
  assert.deepEqual(Object.keys(bank.clips).sort(), [...played].sort());
  const used = new Set(Object.values(bank.clips).flatMap(c => c.sources));
  assert.deepEqual(sources.map(s => s.id).filter(id => !used.has(id)), []);
  const files = new Set(fs.readdirSync(file('bank')).filter(f => f !== 'bank.json').map(f => `bank/${f}`));
  assert.deepEqual([...files].sort(), Object.values(bank.clips).map(c => c.file).sort(), 'no stray files in the bank folder');
});

test('each truck class has a full engine at its measured revs, the scouts a Dodge Ram', () => {
  for (const cls of CLASSES) {
    const e = bank.engines[cls];
    assert(e, `${cls}: engine`);
    for (const clip of [e.start, e.idle.clip, e.coast.clip, ...e.on.map(l => l.clip)]) assert(bank.clips[clip], `${cls}: ${clip}`);
    // long recordings, so the seamless player never has to repeat itself
    assert(bank.clips[e.idle.clip].seconds >= 8, `${cls}: long idle`);
    for (const list of [e.on, e.pull ?? []]) for (let i = 1; i < list.length; i++) assert(list[i].rpm > list[i - 1].rpm, `${cls}: anchors sorted by revs`);
    assert(e.gears.length >= 3 && e.gears.every((g, i) => !i || g > e.gears[i - 1]), `${cls}: gears`);
    assert(e.governedRpm > e.idleRpm && e.stall > 0 && e.stall < 0.5 && e.shiftS > 0);
  }
  assert.match(bank.engines.scout.name, /Dodge Ram/);
  assert(bank.engines.heavy.sub, 'the heaviest class has its rumble');
  const starts = CLASSES.map(c => new Set(bank.clips[bank.engines[c].start].sources));
  assert.equal(new Set(starts.map(s => [...s][0])).size, CLASSES.length, 'each class starts its own engine');
});

test('every truck plays its class\'s engine, service trucks too; others get a diesel sized to their power', () => {
  for (const car of trucks) assert.equal(car.audio.engine, car.class, `${car.id} plays its class`);
  assert(content.service.length >= CLASSES.length * 2, 'a fuel and a breakdown truck per class');
  const odd = [{ spec: { class: 'mystery', powerKw: 1500 } }, { spec: { class: 'mystery', powerKw: 200 } }, { spec: { class: 'highway' }, audio: { engine: 'offroad', crankS: 0.8 } }];
  resolveAudio(odd, bank);
  assert.deepEqual(odd.map(c => c.audio.engine), ['heavy', 'heavy-duty', 'offroad']);
  assert.equal(odd[2].audio.crankS, 0.8, 'a car can override its crank time');
  assert.equal(engineProfile(trucks.find(c => c.id === 'swamp-scout-4'), bank).airBrakes, false, 'scouts: no air brakes');
  assert.equal(engineProfile(trucks.find(c => c.id === 'mechanic-scout'), bank).airBrakes, false, 'nor their service trucks');
  assert.equal(engineProfile(trucks.find(c => c.id === 'mountain-mover-18'), bank).airBrakes, true);
});

test('revs and load move the engine smoothly between its layers, always in tune', () => {
  const total = m => m.idle + m.coast + m.on.reduce((a, b) => a + b, 0) + m.pull.reduce((a, b) => a + b, 0);
  for (const cls of CLASSES) {
    const pack = bank.engines[cls], idle = engineMix(pack, 0, 0), loaded = engineMix(pack, 0.6, 1), coast = engineMix(pack, 0.6, 0);
    assert(idle.idle > 0.8 && idle.on.every(w => w === 0), `${cls}: idle at rest`);
    assert(coast.coast > coast.idle && coast.on.every(w => w === 0), `${cls}: lifting off at speed coasts`);
    assert(loaded.idle < 0.01 && loaded.coast < 0.01, `${cls}: nothing idling under load`);
    assert(loaded.cutoff > coast.cutoff && loaded.level > coast.level, `${cls}: opens up under throttle`);
    if (pack.pull) assert(loaded.pull.some(w => w > 0.5), `${cls}: the hard-working layer comes in`);
    // a layer plays at the revs it was recorded at when the engine is there
    for (const l of pack.on) {
      const revs = (l.rpm - pack.idleRpm) / (pack.governedRpm - pack.idleRpm), m = engineMix(pack, revs, 0.5);
      assert(Math.abs(m.rates.on[pack.on.indexOf(l)] - 1) < 0.01 || revs > 1 || revs < 0, `${cls}: ${l.clip} in tune`);
    }
    for (const r of [-1, 0, 0.5, 1, 9, NaN]) for (const l of [-1, 0, 1, NaN]) {
      const m = engineMix(pack, r, l);
      for (const v of [m.idle, m.coast, m.sub, m.turbo, m.turboRate, m.cutoff, m.level, m.rpm, ...m.on, ...m.pull, ...m.rates.on, ...m.rates.pull]) assert(Number.isFinite(v), `${cls}: finite`);
    }
    // equal power: no dips or jumps in level as the revs and load sweep
    for (let r = 0; r < 1; r += 0.02) for (const l of [0, 0.5, 1]) {
      const a = engineMix(pack, r, l), b = engineMix(pack, r + 0.02, l);
      assert(Math.abs(a.rates.idle - b.rates.idle) < 0.05, `${cls}: no pitch jumps`);
      assert(Math.abs(total(a) - total(b)) < 0.25, `${cls}: no level jumps at ${r}, ${l}`);
    }
  }
});
