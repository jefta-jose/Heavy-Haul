// Sound from real recordings: every clip in the bank is traceable to a licensed source with its
// credit, each truck class has a complete engine, every car plays its class's engine, and the engine
// mix behaves. Rendering and decoding are checked in the browser test and npm run audio:preview.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { content, newSim, advance, DT } from './helpers.js';
import { readSoundBank, resolveAudio } from '../tools/lib/content.js';
import { engineProfile, engineMix, engineLoad, engineTelemetry, newRevs, stepRevs, packClips } from '../src/audio/engine.js';
import { HIT_SOUNDS } from '../src/audio/vehicle-audio.js';
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
  const win = events(), els = Object.fromEntries(['gas', 'brake', 'winch', 'powerBtn'].map(k => [k, events()]));
  let pads = [];
  Object.defineProperty(globalThis, 'window', { configurable: true, value: win });
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { getGamepads: () => pads } });
  try {
    const toggles = [];
    const actions = new Proxy({ toggle: key => toggles.push(key) }, { get: (obj, key) => obj[key] ?? (() => {}) }), input = createInput(els, actions);
    for (const code of ['KeyQ', 'KeyE']) {
      win.handlers.keydown({ code, repeat: false });
      win.handlers.keydown({ code, repeat: true });
      win.handlers.keyup({ code });
    }
    assert.deepEqual(toggles, ['awd', 'diff'], 'each held key toggles once');
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
    log.push({ revs: revs.revs, gear: revs.gear, shifted: revs.shifted });
  }
  return log;
}

test('the sound revs flare, climb through the gears and shift, unlike the flat physics rpm', () => {
  for (const cls of CLASSES) {
    const pack = bank.engines[cls], revs = newRevs(), top = pack.gears.at(-1);
    const launch = run(pack, revs, 1.5, { pedal: 1, kmh: 0 });
    assert(Math.abs(launch.at(-1).revs - pack.stall) < 0.05, `${cls}: full pedal at rest holds the converter stall`);
    const climb = run(pack, revs, 25, t => ({ pedal: 1, kmh: top * 0.98 * t }));
    const shifts = climb.filter(s => s.shifted).length;
    assert.equal(shifts, pack.gears.length - 1, `${cls}: one shift per gear on the way up`);
    assert.equal(revs.gear, pack.gears.length - 1);
    // each shift drops the revs, then they climb again
    const peaks = climb.map((s, i) => s.shifted ? [climb[i - 1].revs, climb[Math.min(i + 20, climb.length - 1)].revs] : null).filter(Boolean);
    for (const [before, after] of peaks) assert(after < before, `${cls}: the revs drop on a shift`);
    assert(Math.max(...climb.map(s => s.revs)) > 0.6 && Math.min(...climb.map(s => s.revs)) > 0.1, `${cls}: a real rev range`);
    const down = run(pack, revs, 40, t => ({ pedal: 0, kmh: top * (1 - t) }));
    assert(down.filter(s => s.shifted).length >= pack.gears.length - 1, `${cls}: downshifts slowing down`);
    run(pack, revs, 2, { pedal: 0, kmh: 0 });
    assert(revs.revs < 0.02 && revs.gear === 0, `${cls}: back to idle in first`);
  }
});

test('sound gears hold between shifts, and a bump or the gear lever cannot flip them', () => {
  for (const cls of CLASSES) {
    const pack = bank.engines[cls], revs = newRevs();
    assert(pack.holdS >= 2.5, `${cls}: a hold`);
    // far faster than any truck: the hold still spaces the shifts out
    const log = run(pack, revs, 20, t => ({ pedal: 1, kmh: pack.gears.at(-1) * Math.min(1, t * 4) }));
    let last = -Infinity;
    log.forEach((s, i) => { if (s.shifted) { assert(i / 60 - last >= pack.holdS - 0.02, `${cls}: shifts ${i / 60 - last} s apart`); last = i / 60; } });
    // a two-tenths-of-a-second dip in speed over a bump does not downshift
    const cruise = newRevs(), mid = pack.gears[1] * 0.8;
    run(pack, cruise, 12, { pedal: 0.5, kmh: mid });
    const held = cruise.gear;
    run(pack, cruise, 0.2, { pedal: 0.5, kmh: 1 });
    run(pack, cruise, 1, { pedal: 0.5, kmh: mid });
    assert.equal(cruise.gear, held, `${cls}: the bump leaves the gear alone`);
    // braking hard to a stop is back in first straight away, with no downshifts during the pull-away
    const stop = newRevs();
    run(pack, stop, 20, { pedal: 1, kmh: pack.gears.at(-1) * 0.9 });
    assert(stop.gear > 0, `${cls}: up the gears`);
    run(pack, stop, 1.5, { pedal: 0, kmh: 0 });
    assert.equal(stop.gear, 0, `${cls}: first after a stop`);
    // H after L lands in the gear that fits at once, with no sound-gear shift
    const lever = newRevs(), kmh = pack.gears[1] * 0.8;
    run(pack, lever, 3, { pedal: 1, kmh, tops: [20] });
    const back = run(pack, lever, 0.1, { pedal: 1, kmh });
    assert(lever.gear >= 1 && back.every(s => !s.shifted), `${cls}: lands in gear ${lever.gear}`);
  }
});

test('on a real truck at full pedal, gears are spaced out and the revs do not sit on the limiter', () => {
  for (const id of ['swamp-scout-4', 'interstate-1', 'forester-1', 'mudlark-1', 'fieldmaster-5']) {
    const car = content.cars.find(c => c.id === id), pack = bank.engines[car.audio.engine];
    const s = newSim(car); s.init(40); Object.assign(s.ctl, { gear: 'H', awd: true, diff: true, gas: 0, brake: 0 }); advance(s, 1.5);
    s.ctl.gas = 1;
    const v = s.active, revs = newRevs();
    let shifts = 0, pinned = 0, last = -Infinity, steps = 0;
    for (let t = 0; t < 25; t += 2 * DT) {
      s.step(DT); s.step(DT); steps++;
      stepRevs(revs, pack, { pedal: v.st.throttle, kmh: v.st.speed * 3.6, slip: v.st.slip, tops: pack.gears }, 2 * DT);
      if (revs.revs >= 1) pinned++;
      if (revs.shifted) { assert(t - last >= pack.holdS - 0.05, `${id}: shifts ${(t - last).toFixed(1)} s apart`); last = t; shifts++; }
    }
    assert(shifts >= 1, `${id}: it does shift`);
    assert(pinned / steps < 0.12, `${id}: on the limiter ${(100 * pinned / steps).toFixed(0)}% of the time`);
  }
});

test('spinning wheels race the engine; a stuck truck with grip lugs at the stall', () => {
  for (const cls of CLASSES) {
    const pack = bank.engines[cls], lug = newRevs(), spin = newRevs();
    run(pack, lug, 3, { pedal: 1, kmh: 0.5, slip: 0, tops: [20] });
    run(pack, spin, 3, { pedal: 1, kmh: 0.5, slip: 6, tops: [20] });
    assert(spin.revs > 0.9, `${cls}: wheelspin ${spin.revs}`);
    assert(lug.revs < 0.5, `${cls}: lugging ${lug.revs}`);
  }
});

test('a tire touching a log, a pipe or a rock is reported, and nothing else is', () => {
  const car = content.cars.find(c => c.id === 'crossroads-9'), probe = newSim(car);
  probe.init(40);
  const targets = { log: probe.logs.find(l => l.kind !== 'pipe' && l.x > 300 && !content.season.trail.heavyMud.some(c => c < l.x && c > l.x - 60)), pipe: probe.logs.find(l => l.kind === 'pipe' && l.x > 150), rock: probe.rocks.find(r => !r.crush && r.x > 150) };
  for (const [kind, o] of Object.entries(targets)) {
    assert(o, `the trail has a ${kind}`);
    const s = newSim(car); s.init(o.x - 40); Object.assign(s.ctl, { gear: 'L', awd: true, diff: true, gas: 1, brake: 0 });
    s.events.length = 0;
    advance(s, 14);
    const hit = s.events.filter(e => e.type === 'hit');
    assert(hit.length > 0, `${kind}: reported`);
    assert(hit.every(e => e.tires === s.active.tireData), `${kind}: from this truck's tires`);
  }
});

test('hitting an obstacle shakes the load of every class except scouts', () => {
  assert.equal(HIT_SOUNDS.scout, undefined);
  for (const cls of CLASSES.filter(c => c !== 'scout')) assert(bank.effects[HIT_SOUNDS[cls].effect], `${cls}: ${HIT_SOUNDS[cls].effect}`);
  assert.equal(HIT_SOUNDS.heavy.effect, 'cable-strain');
});

test('every recording is licensed and credited, with where to fetch it and its hash', () => {
  for (const s of sources) {
    assert(['CC0-1.0', 'CC-BY-4.0'].includes(s.license), `${s.id}: CC0 or CC BY`);
    assert(s.author && s.title && s.page.startsWith('https://freesound.org/people/'), `${s.id}: credit`);
    assert(s.download.startsWith('https://') && /^[0-9a-f]{64}$/.test(s.sha256), `${s.id}: rebuildable`);
    if (s.archiveMember) assert(/^[0-9a-f]{64}$/.test(s.archiveSha256), `${s.id}: archive is also verified`);
  }
});

test('the bank matches its recipe: every clip exists and comes from a listed recording', () => {
  for (const [name, clip] of Object.entries(bank.clips)) {
    assert(fs.statSync(file(clip.file)).size > (name.startsWith('ui-') ? 1000 : 2000), `${name}: file`);
    for (const id of clip.sources) assert(sources.some(s => s.id === id), `${name}: source ${id}`);
  }
  for (const name of Object.keys(recipe.effects)) assert(bank.effects[name]?.length, `${name}: built`);
  for (const name of ['air-release', 'air-burst', 'air-pop', 'hydraulic-brake', 'handbrake-on', 'handbrake-off', 'gear-clunk', 'hook-clank', 'splash', 'splash-small', 'cargo-light', 'cargo-chains', 'cargo-heavy-chains', 'rattle', 'rattle-bed', 'underbody', 'crow', 'crow-far', 'wade', 'water-churn', 'mud', 'mud-spin', 'gravel', 'dirt', 'rocks', 'winch-motor', 'cable-strain', 'fuel-pump', 'fuel-flow', 'forest', 'frogs'])
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

test('every clip is decoded by one of the three routes: an engine pack, an up-front effect or a bed', () => {
  const engines = Object.values(bank.engines).flatMap(packClips), effects = Object.values(bank.effects).flat();
  assert.deepEqual([...new Set([...engines, ...effects])].sort(), Object.keys(bank.clips).sort());
  for (const cls of CLASSES) for (const clip of packClips(bank.engines[cls])) assert(bank.clips[clip], `${cls}: ${clip}`);
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
  for (const cls of new Set(content.cars.map(c => c.class))) assert(content.service.some(c => c.class === cls && c.role === 'breakdown'), `${cls}: a breakdown truck`);
  const odd = [{ spec: { class: 'mystery', powerKw: 1500 } }, { spec: { class: 'mystery', powerKw: 200 } }, { spec: { class: 'highway' }, audio: { engine: 'offroad', crankS: 0.8 } }];
  resolveAudio(odd, bank);
  assert.deepEqual(odd.map(c => c.audio.engine), ['heavy', 'heavy-duty', 'offroad']);
  assert.equal(odd[2].audio.crankS, 0.8, 'a car can override its crank time');
  assert.equal(engineProfile(trucks.find(c => c.id === 'swamp-scout-4'), bank).airBrakes, false, 'scouts: no air brakes');
  assert.equal(engineProfile(trucks.find(c => c.id === 'mechanic-scout'), bank).airBrakes, false, 'nor their service trucks');
  assert.equal(engineProfile(trucks.find(c => c.id === 'interstate-1'), bank).airBrakes, true);
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
      for (const v of [m.idle, m.coast, m.sub, m.cutoff, m.level, m.rpm, ...m.on, ...m.pull, ...m.rates.on, ...m.rates.pull]) assert(Number.isFinite(v), `${cls}: finite`);
    }
    // equal power: no dips or jumps in level as the revs and load sweep
    for (let r = 0; r < 1; r += 0.02) for (const l of [0, 0.5, 1]) {
      const a = engineMix(pack, r, l), b = engineMix(pack, r + 0.02, l);
      assert(Math.abs(a.rates.idle - b.rates.idle) < 0.05, `${cls}: no pitch jumps`);
      assert(Math.abs(total(a) - total(b)) < 0.25, `${cls}: no level jumps at ${r}, ${l}`);
    }
  }
});

test('music streams, crossfades, follows volume and pauses its media in the background', async t => {
  const { createMusic } = await import('../src/audio/music.js');
  const { MUSIC_TRACKS, MUSIC_FADE_S } = await import('../src/game-config.js');
  const listeners = {}, tracks = [], contexts = [], timers = [];
  const node = () => ({ disconnected: false, connect() {}, disconnect() { this.disconnected = true; }, gain: { value: 0, setTargetAtTime(v) { this.value = v; } } });
  class Context {
    constructor() { this.state = 'running'; this.currentTime = 0; this.destination = {}; this.gains = []; contexts.push(this); }
    createGain() { const n = node(); this.gains.push(n); return n; }
    createMediaElementSource(audio) { assert(tracks.includes(audio)); return node(); }
    decodeAudioData() { assert.fail('music must stream rather than decode entire tracks'); }
    resume() { this.state = 'running'; }
    suspend() { this.state = 'suspended'; }
  }
  class Media {
    constructor(src) { this.src = src; this.paused = true; tracks.push(this); }
    play() { this.paused = false; return Promise.resolve(); }
    pause() { this.paused = true; }
    removeAttribute() { this.src = ''; }
    load() {}
  }
  const doc = { hidden: false, addEventListener(type, fn) { listeners[type] = fn; } };
  const originals = Object.fromEntries(['window', 'document', 'Audio'].map(k => [k, Object.getOwnPropertyDescriptor(globalThis, k)]));
  Object.assign(globalThis, { window: { AudioContext: Context }, document: doc, Audio: Media });
  t.mock.method(globalThis, 'setTimeout', (fn, ms) => { timers.push({ fn, ms }); });
  try {
    const volumes = { master: 0.8, music: 0.5 }, music = createMusic({ garage: '/garage.mp3', drive: '/drive.mp3' }, volumes);
    music.play('garage'); assert.equal(tracks.length, 0, 'waits for user input');
    music.unlock(); assert.equal(tracks.length, 1); assert(tracks[0].loop && !tracks[0].paused);
    const ac = contexts[0]; assert.equal(ac.gains[0].gain.value, 0.4); assert.equal(ac.gains[1].gain.value, MUSIC_TRACKS.garage.gain);
    music.play('garage'); assert.equal(tracks.length, 1, 'same track is not restarted');
    music.play('drive'); assert.equal(tracks.length, 2); assert.equal(ac.gains[1].gain.value, 0);
    assert.equal(timers[0].ms, MUSIC_FADE_S * 2000); assert.equal(ac.gains[2].gain.value, MUSIC_TRACKS.drive.gain);
    doc.hidden = true; listeners.visibilitychange(); assert.equal(ac.state, 'suspended'); assert(tracks.every(a => a.paused));
    doc.hidden = false; listeners.visibilitychange(); assert.equal(ac.state, 'running'); assert(!tracks[1].paused);
    timers[0].fn(); assert.equal(tracks[0].src, ''); assert(ac.gains[1].disconnected);
    volumes.muted = true; music.apply(); assert.equal(ac.gains[0].gain.value, 0);
  } finally {
    for (const [k, value] of Object.entries(originals)) { if (value) Object.defineProperty(globalThis, k, value); else delete globalThis[k]; }
  }
});

test('vehicle audio suspends in background and creates a backup oscillator only while reversing', async () => {
  const { createVehicleAudio } = await import('../src/audio/vehicle-audio.js');
  const listeners = {}, contexts = [], alarms = [];
  const parameter = () => ({ value: 0, setTargetAtTime() {} });
  const node = () => ({ connect() {}, disconnect() {}, gain: parameter() });
  class Context {
    constructor() { this.state = 'running'; this.currentTime = 0; this.destination = {}; contexts.push(this); }
    createDynamicsCompressor() { return { ...node(), threshold: parameter(), ratio: parameter(), attack: parameter(), release: parameter() }; }
    createGain() { return node(); }
    createBiquadFilter() { return { ...node(), frequency: parameter() }; }
    createOscillator() { const o = { ...node(), frequency: parameter(), started: false, stopped: false, start() { this.started = true; }, stop() { this.stopped = true; } }; alarms.push(o); return o; }
    async decodeAudioData() { return {}; }
    resume() { this.state = 'running'; }
    suspend() { this.state = 'suspended'; }
  }
  const doc = { hidden: false, addEventListener(type, fn) { listeners[type] = fn; } };
  const originals = Object.fromEntries(['window', 'document'].map(k => [k, Object.getOwnPropertyDescriptor(globalThis, k)]));
  Object.assign(globalThis, { window: { AudioContext: Context }, document: doc });
  try {
    const audio = createVehicleAudio({ clips: { click: 'data:audio/wav;base64,AA==' }, bank: { engines: {}, effects: { click: ['click'] } } });
    await audio.start(); assert.equal(alarms.length, 0, 'no idle oscillator');
    const active = { car: { ...content.car, audio: { backupAlarm: true } }, st: { engine: 'on', speed: 0, surf: 'dirt', slip: 0 }, ctl: { gear: 'R', brake: 0 }, parts: { truck: { getLinearVelocity: () => ({ x: 0, y: 0 }) } } };
    const frame = { playing: true, active, vehicles: [], water: 0, camX: 0 };
    audio.update(frame, 0.1); assert.equal(alarms.length, 1); assert(alarms[0].started);
    active.ctl.gear = 'L'; audio.update(frame, 0.1); assert(alarms[0].stopped);
    active.ctl.gear = 'R'; audio.update(frame, 0.1); assert.equal(alarms.length, 2);
    doc.hidden = true; listeners.visibilitychange(); assert.equal(contexts[0].state, 'suspended'); assert(alarms[1].stopped);
    audio.update(frame, 0.1); assert.equal(alarms.length, 2, 'hidden updates cannot restart the alarm');
    doc.hidden = false; listeners.visibilitychange(); assert.equal(contexts[0].state, 'running');
    audio.suspend(); doc.hidden = true; listeners.visibilitychange(); doc.hidden = false; listeners.visibilitychange();
    assert.equal(contexts[0].state, 'suspended', 'an intentionally suspended garage stays suspended');
  } finally {
    for (const [k, value] of Object.entries(originals)) { if (value) Object.defineProperty(globalThis, k, value); else delete globalThis[k]; }
  }
});
