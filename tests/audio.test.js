// Sound from real recordings: every clip in the bank is traceable to a licensed source with its
// credit, each truck class has a complete engine, every car plays its class's engine, and the engine
// mix behaves. Rendering and decoding are checked in the browser test and npm run audio:preview.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { content } from './helpers.js';
import { readSoundBank, resolveAudio } from '../tools/lib/content.js';
import { engineProfile, engineMix } from '../src/audio/engine.js';
import { engineOperatingPoint, engineTelemetry, selectEngineFrames } from '../src/audio/rpm-engine.js';
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
    const event = { preventDefault() {}, pointerId: 1, clientY: 100, pointerType: 'touch' };
    els.gas.handlers.pointerdown(event);
    assert.equal(input.read().gas, 1);
    els.gas.handlers.pointermove({ ...event, clientY: 165 });
    assert(Math.abs(input.read().gas - 0.35) < 1e-9);
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

test('engine operating point separates pedal, load and actual RPM', () => {
  const car = { drivetrain: { idleRpm: 650, governedRpm: 2400 } };
  const light = engineOperatingPoint(car, { rpm: 1300, throttle: 0.25 }, { load: 0.2 });
  const full = engineOperatingPoint(car, { rpm: 1300, throttle: 1 }, { load: 0.2 });
  const hill = engineOperatingPoint(car, { rpm: 1300, throttle: 1 }, { load: 1 });
  const coast = engineOperatingPoint(car, { rpm: 1300, throttle: 0 }, { load: 1 });
  assert(full.load > light.load);
  assert(hill.load > full.load);
  assert.equal(coast.load, 0, 'lifting off unloads even while wheels keep the RPM high');
  assert.equal(light.rpm, hill.rpm, 'load must not invent RPM changes');
  assert.deepEqual(engineOperatingPoint(car, { rpm: NaN, throttle: NaN }), { rpm: 650, load: 0, pedal: 0 });
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

test('each diesel has a traceable RPM atlas with multiple operating points', () => {
  for (const cls of CLASSES.filter(c => c !== 'scout')) {
    const a = bank.engines[cls].atlas;
    assert(bank.clips[a.clip]);
    assert(a.frames.length >= 24);
    assert(new Set(a.frames.map(f => Math.round(f.rpm / 100))).size >= 3);
    assert(a.frames.some(f => f.load === 0) && a.frames.some(f => f.load === 1));
    for (const f of a.frames) {
      assert(f.rpm > 0 && f.offset >= 0 && f.seconds > 0);
      assert(f.offset + f.seconds <= bank.clips[a.clip].seconds + 0.001);
    }
    const frames = [{ rpm: 700, load: 0 }, { rpm: 1400, load: 1 }, { rpm: 1400, load: 0 }, { rpm: 2400, load: 1 }];
    assert.equal(selectEngineFrames(frames, 1400, 1)[0], frames[1]);
    assert.equal(selectEngineFrames(frames, 1400, 0)[0], frames[2]);
    assert.equal(selectEngineFrames(frames, 2400, 1)[0], frames[3]);
  }
  assert(!bank.engines.scout.atlas, 'approved scout stays on its original playback');
});

test('every recording is licensed, credited and unchanged since download', () => {
  for (const s of sources) {
    assert(['CC0-1.0', 'CC-BY-4.0'].includes(s.license), `${s.id}: CC0 or CC BY`);
    assert(s.author && s.title && s.page.startsWith('https://freesound.org/people/'), `${s.id}: credit`);
    assert.equal(createHash('sha256').update(fs.readFileSync(file(s.file))).digest('hex'), s.sha256, `${s.id}: hash`);
  }
});

test('the bank matches its recipe: every clip exists and comes from a listed recording', () => {
  for (const [name, clip] of Object.entries(bank.clips)) {
    assert(fs.statSync(file(clip.file)).size > 2000, `${name}: file`);
    for (const id of clip.sources) assert(sources.some(s => s.id === id), `${name}: source ${id}`);
  }
  for (const name of Object.keys(recipe.effects)) assert(bank.effects[name]?.length, `${name}: built`);
  for (const name of ['air-release', 'air-burst', 'hydraulic-brake', 'handbrake-on', 'handbrake-off', 'splash', 'splash-small', 'cargo-light', 'cargo-chains', 'cargo-heavy-chains', 'cargo-metal', 'rattle', 'underbody', 'crow', 'crow-far', 'wade', 'water-churn', 'mud', 'gravel', 'dirt', 'rocks', 'forest', 'frogs'])
    assert(bank.effects[name], `the game plays ${name}`);
});

test('each truck class has a full engine, the scouts a Dodge Ram', () => {
  for (const cls of CLASSES) {
    const e = bank.engines[cls];
    assert(e, `${cls}: engine`);
    for (const role of ['start', 'idle', 'drive']) assert(bank.clips[e.layers[role]], `${cls}: ${role}`);
    // long recordings, so the seamless player never has to repeat itself
    assert(bank.clips[e.layers.idle].seconds >= 15 && bank.clips[e.layers.drive].seconds >= 15, `${cls}: long idle and drive`);
  }
  assert.match(bank.engines.scout.name, /Dodge Ram/);
  assert(bank.clips[bank.engines.scout.layers.pull], 'the Ram has a pulling layer');
});

test('every car plays its class\'s engine; others get a diesel sized to their power', () => {
  const expect = { 'swamp-scout-4': 'scout', 'mesa-coyote-8': 'scout', 'ice-breaker-19': 'offroad', 'mountain-mover-18': 'heavy', 'fuel-runner': 'heavy-duty', 'breakdown-wrecker': 'heavy-duty' };
  for (const car of trucks) if (expect[car.id]) assert.equal(car.audio.engine, expect[car.id], car.id);
  const odd = [{ spec: { class: 'service', powerKw: 1500 } }, { spec: { class: 'mystery', powerKw: 200 } }, { spec: { class: 'highway' }, audio: { engine: 'offroad', crankS: 0.8 } }];
  resolveAudio(odd, bank);
  assert.deepEqual(odd.map(c => c.audio.engine), ['heavy', 'heavy-duty', 'offroad']);
  assert.equal(odd[2].audio.crankS, 0.8, 'a car can override its crank time');
  assert.equal(engineProfile(trucks.find(c => c.id === 'swamp-scout-4'), bank).airBrakes, false, 'scouts: no air brakes');
  assert.equal(engineProfile(trucks.find(c => c.id === 'mountain-mover-18'), bank).airBrakes, true);
});

test('revs and throttle move the engine smoothly between its layers', () => {
  for (const cls of CLASSES) {
    const p = engineProfile({ audio: { engine: cls } }, bank), idle = engineMix(p, 0, 0), loaded = engineMix(p, 0.6, 1), coast = engineMix(p, 0.5, 0);
    assert(idle.idle > idle.drive, `${cls}: idle at rest`);
    assert(loaded.drive + loaded.pull > loaded.idle * 3, `${cls}: running under load`);
    assert(loaded.cutoff > coast.cutoff, `${cls}: opens up under throttle`);
    if (p.layers.pull) assert(loaded.pull > coast.pull, `${cls}: pull layer comes in with throttle`);
    for (const r of [-1, 0, 0.5, 1, 9, NaN]) for (const l of [-1, 0, 1, NaN]) assert(Object.values(engineMix(p, r, l)).every(Number.isFinite));
    for (let r = 0; r < 1; r += 0.05) assert(Math.abs(engineMix(p, r + 0.05, 0.5).driveRate - engineMix(p, r, 0.5).driveRate) < 0.03, `${cls}: no pitch jumps`);
  }
});
