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

const bank = readSoundBank(), recipe = JSON.parse(fs.readFileSync(new URL('../assets/audio/sounds.json', import.meta.url)));
const sources = JSON.parse(fs.readFileSync(new URL('../assets/audio/sources.json', import.meta.url))).sources;
const trucks = [...content.cars, ...content.service];
const file = rel => new URL(`../assets/audio/${rel}`, import.meta.url);
const CLASSES = ['scout', 'highway', 'heavy-duty', 'offroad', 'heavy'];

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
  for (const name of ['air-release', 'air-burst', 'hydraulic-brake', 'handbrake-on', 'handbrake-off', 'splash', 'splash-small', 'cargo-light', 'cargo-chains', 'cargo-heavy-chains', 'cargo-metal', 'rattle', 'underbody', 'crow', 'crow-far', 'wade', 'water-churn', 'mud', 'gravel', 'dirt', 'rocks', 'forest', 'swamp', 'frogs'])
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
