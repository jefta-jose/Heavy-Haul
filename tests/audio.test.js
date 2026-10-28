import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { content } from './helpers.js';
import { engineProfile, engineMix } from '../src/audio/engine-dsp.js';
import { readWav, measure } from '../tools/audio-preview.js';

const bank = JSON.parse(fs.readFileSync(new URL('../assets/audio/audio.json', import.meta.url)));
const sources = JSON.parse(fs.readFileSync(new URL('../assets/audio/sources.json', import.meta.url))).sources;
const trucks = [...content.cars, ...content.service];
const asset = file => new URL(`../assets/audio/${file}`, import.meta.url);

test('every playable truck uses a different real recording with traceable provenance', () => {
  const profiles = trucks.map(engineProfile);
  assert.equal(new Set(profiles.map(p => p.recording)).size, trucks.length, 'distinct sources, not one loop pitched six ways');
  for (const p of profiles) assert(sources.some(s => s.id === p.recording));
  for (const s of sources) {
    assert.equal(s.license, 'CC0-1.0'); assert(s.page.startsWith('https://freesound.org/people/'));
    assert.equal(createHash('sha256').update(fs.readFileSync(asset(s.file))).digest('hex'), s.sha256);
  }
});

test('recorded starts and loops are audible, unclipped PCM and have clean loop joins', () => {
  for (const [key, clip] of Object.entries(bank.clips)) {
    const { sr, samples } = readWav(asset(clip.file)), m = measure(samples);
    assert.equal(sr, 24000); assert(samples.length > sr / 2);
    assert(!m.nan && m.peak <= 0.701 && m.rms > 0.03, `${key}: usable recording level`);
    assert(sources.some(s => s.id === clip.source));
    if (clip.loop) {
      const jumps = Array.from(samples.subarray(1), (v, i) => Math.abs(v - samples[i])).sort((a, b) => a - b);
      assert(Math.abs(samples[0] - samples.at(-1)) <= Math.max(0.01, jumps[Math.floor(jumps.length * 0.99)]), `${key}: no abrupt boundary click`);
    } else assert(Math.abs(samples[0]) < 0.001 && Math.abs(samples.at(-1)) < 0.001, `${key}: start transient has short fades`);
  }
});

test('RPM and throttle change recorded playback smoothly within a modest pitch range', () => {
  for (const car of trucks) {
    const p = engineProfile(car), idle = engineMix(p, 0, 0), loaded = engineMix(p, 0.3, 1), top = engineMix(p, 1, 1);
    assert(loaded.drive > idle.drive); assert(loaded.cutoff > idle.cutoff);
    assert(top.idleRate > idle.idleRate && top.idleRate < 1.6);
    for (const r of [-100, 0, 0.5, 1, 100, NaN]) for (const l of [-1, 0, 1, NaN]) {
      assert(Object.values(engineMix(p, r, l)).every(Number.isFinite));
    }
  }
  assert(engineProfile({ spec: { class: 'scout' } }).recording);
  assert(engineProfile({ spec: { class: 'heavy', powerKw: 1500 } }).backupAlarm);
});
