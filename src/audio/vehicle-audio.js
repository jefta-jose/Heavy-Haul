// Recorded engines, one distinct licensed source per playable truck. The embedded WAV bank works
// offline in the single-file build. Quieter procedural surface/UI effects remain on a separate bus.
//
// Volumes: master, engine and effects, 0..1 each plus mute, saved in the browser.

import { createRecordedEngine, engineProfile } from './engine-dsp.js';
import * as foley from './foley.js';

const VOLUME_KEY = 'hh_audio_volumes';
export const DEFAULT_VOLUMES = { master: 0.8, engine: 0.8, effects: 0.8, muted: false };
const SURFACES = ['gravel', 'dirt', 'rock', 'mud', 'wood'];

function loadVolumes() {
  try { return { ...DEFAULT_VOLUMES, ...JSON.parse(localStorage.getItem(VOLUME_KEY) || '{}') }; } catch (e) { return { ...DEFAULT_VOLUMES }; }
}

export function createVehicleAudio(recordings = {}) {
  const api = { ok: false, mode: null, ready: null, error: null, volumes: loadVolumes() };
  let ac = null, master, engineBus, fxBus, noiseBuf, buffers = null, loops = null, alarm = null, engineBuffers = {};
  const voices = new Map();      // vehicle -> engine voice
  let alarmT = 0, bumpCool = 0, jolt = { vy: null };

  const buf = data => { const b = ac.createBuffer(1, data.length, ac.sampleRate); b.getChannelData(0).set(data); return b; };
  function applyVolumes() {
    if (!ac) return;
    const v = api.volumes, t = ac.currentTime;
    master.gain.setTargetAtTime(v.muted ? 0 : v.master * 0.9, t, 0.05);
    engineBus.gain.setTargetAtTime(v.engine, t, 0.05);
    fxBus.gain.setTargetAtTime(v.effects * 0.35, t, 0.05);
  }
  api.setVolume = (kind, value) => {
    api.volumes[kind] = kind === 'muted' ? !!value : Math.max(0, Math.min(1, Number(value)));
    try { localStorage.setItem(VOLUME_KEY, JSON.stringify(api.volumes)); } catch (e) {}
    applyVolumes();
  };
  Object.defineProperty(api, 'muted', { get: () => api.volumes.muted, set: m => { if (m !== api.volumes.muted) api.setVolume('muted', m); } });

  api.start = () => {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return api.ready; }
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -10; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.2;
    master = ac.createGain(); engineBus = ac.createGain(); fxBus = ac.createGain();
    engineBus.connect(comp); fxBus.connect(comp); comp.connect(master); master.connect(ac.destination);
    applyVolumes();
    const sr = ac.sampleRate;
    noiseBuf = buf(Float32Array.from({ length: sr }, () => Math.random() * 2 - 1));
    // effects rendered once: a few variants of each so repeats don't sound identical
    buffers = {
      splash: [foley.splash(sr, 0.35, 1), foley.splash(sr, 0.7, 2), foley.splash(sr, 1.2, 3)].map(buf),
      crush: [foley.crush(sr, 0.35, 4), foley.crush(sr, 0.8, 5), foley.crush(sr, 1.3, 6)].map(buf),
      wood: [foley.woodCrack(sr, 0.6, 7), foley.woodCrack(sr, 1.2, 8)].map(buf),
      bump: {},
    };
    // continuous layers for the driven vehicle, silent until needed
    const loopNode = (data, gain = 0) => {
      const s = ac.createBufferSource(); s.buffer = buf(data); s.loop = true;
      const g = ac.createGain(); g.gain.value = gain; s.connect(g); g.connect(fxBus); s.start(); return { s, g };
    };
    loops = { wade: loopNode(foley.wadeLoop(sr, 3)) };
    SURFACES.forEach((name, i) => { loops[name] = loopNode(foley.tireLoop(sr, name, 20 + i)); });
    // back-up alarm: a classic two-tone beeper, slightly distant
    {
      const o = ac.createOscillator(); o.frequency.value = 1040; const o2 = ac.createOscillator(); o2.type = 'square'; o2.frequency.value = 1040;
      const g2 = ac.createGain(); g2.gain.value = 0.08; o2.connect(g2);
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
      const g = ac.createGain(); g.gain.value = 0; o.connect(lp); g2.connect(lp); lp.connect(g); g.connect(fxBus); o.start(); o2.start();
      alarm = { g };
    }
    api.mode = 'loading';
    api.ready = Promise.all(Object.entries(recordings).map(async ([key, uri]) => {
      const raw = Uint8Array.from(atob(uri.split(',')[1]), c => c.charCodeAt(0));
      return [key, await ac.decodeAudioData(raw.buffer)];
    })).then(entries => {
      if (!entries.length) throw new Error('No recorded engine bank embedded');
      engineBuffers = Object.fromEntries(entries); api.mode = 'recorded'; api.ok = true;
    }).catch(error => { api.error = error.message; api.mode = 'unavailable'; console.warn('Truck recordings could not load:', error); });
    return api.ready;
  };

  function play(b, gain, rate = 1) {
    if (!ac || !b) return;
    const s = ac.createBufferSource(); s.buffer = b; s.playbackRate.value = rate * (0.94 + Math.random() * 0.12);
    const g = ac.createGain(); g.gain.value = gain; s.connect(g); g.connect(fxBus); s.start();
  }
  function thump(freq, gain, decay) {
    if (!ac) return;
    const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
    o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(freq * 0.45, t + decay);
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    o.connect(g); g.connect(fxBus); o.start(t); o.stop(t + decay + 0.05);
  }
  function tick(freq, q, gain, decay) {
    if (!ac) return;
    const t = ac.currentTime, s = ac.createBufferSource(); s.buffer = noiseBuf;
    const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    const g = ac.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    s.connect(f); f.connect(g); g.connect(fxBus); s.start(t, Math.random() * 0.5); s.stop(t + decay + 0.05);
  }

  // cab switches and levers
  api.clunk = on => { thump(on ? 110 : 80, 0.35, 0.18); tick(on ? 3200 : 2200, 3, 0.07, 0.08); };
  api.shift = gear => { thump(gear === 'H' ? 140 : 95, 0.3, 0.14); tick(3000, 4, 0.06, 0.05); setTimeout(() => { tick(gear === 'H' ? 900 : 600, 2, 0.05, 0.12); thump(70, 0.18, 0.2); }, 110); };
  api.key = () => { tick(2400, 2, 0.06, 0.04); setTimeout(() => tick(1800, 3, 0.05, 0.05), 70); };
  // one-shots from the world
  api.splash = power => buffers && play(buffers.splash[power < 0.5 ? 0 : power < 1 ? 1 : 2], Math.min(1.1, 0.45 + power * 0.5));
  api.crush = size => buffers && play(buffers.crush[size < 0.5 ? 0 : size < 1 ? 1 : 2], Math.min(1, 0.5 + size * 0.4));
  api.wood = size => buffers && play(buffers.wood[size < 0.8 ? 0 : 1], 0.8);
  // suspension hit; heavy trucks get a deeper, longer bump (rendered once per weight class)
  api.bump = (strength, massT) => {
    if (!buffers || strength <= 0) return;
    const heavy = Math.min(3, 1 + Math.round(Math.log2(Math.max(1, massT / 5))) / 2), key = heavy.toFixed(1);
    buffers.bump[key] ??= [1, 2].map(seed => buf(foley.bump(ac.sampleRate, 1, heavy, seed * 31)));
    play(buffers.bump[key][Math.random() < 0.5 ? 0 : 1], Math.min(1, 0.25 + strength * 0.75));
  };

  // Every frame: s = { playing, vehicles: [vehicle...], active, water, camX }.
  api.update = (s, dt) => {
    if (!api.ok || api.mode !== 'recorded') return;
    const t = ac.currentTime, live = s.playing;
    // engine voices: one per vehicle, created and removed with the vehicles
    const seen = new Set();
    for (const v of s.vehicles) {
      seen.add(v);
      let voice = voices.get(v);
      if (!voice || voice.car !== v.car) { voice?.stop(); voice = createRecordedEngine(ac, engineBuffers, v.car, engineBus); voices.set(v, voice); }
      const st = v.st, active = v === s.active;
      voice.set(st);
      // parked vehicles idle in the distance
      const p = v.parts.truck.getPosition(), dist = Math.abs(p.x - s.camX);
      voice.out.gain.setTargetAtTime(live ? (active ? 0.7 : 0.55 / (1 + dist / 10)) : 0, t, 0.1);
    }
    for (const [v, voice] of voices) if (!seen.has(v)) { voice.stop(); voices.delete(v); }

    // The driven vehicle's quieter surface and suspension effects.
    const v = s.active, st = v.st, speed = Math.abs(st.speed), radius = v.car.rig.radius, massT = (v.car.spec?.massT ?? 5) + (v.car.load?.massT ?? 0);
    const roll = Math.min(1, speed / 4) * Math.min(1.4, 0.55 + Math.log10(1 + massT) * 0.35);
    const rate = Math.max(0.35, Math.min(2.2, (0.45 + speed * 3.6 / 20 * 0.55) * Math.sqrt(0.85 / Math.max(0.5, radius))));
    const surf = st.inWater > 0.3 ? 'water' : st.surf === 'creek' ? 'mud' : st.surf;
    for (const name of SURFACES) {
      let g = live && surf === name ? roll : 0;
      if (live && name === 'mud' && surf === 'mud') g = Math.max(g, Math.min(1, st.slip * 0.25));   // spinning in the muck
      loops[name].g.gain.setTargetAtTime(g * 0.5, t, 0.15);
      loops[name].s.playbackRate.setTargetAtTime(rate * (name === 'mud' ? 0.8 + Math.min(0.6, st.slip * 0.1) : 1), t, 0.1);
    }
    const wade = live ? Math.min(1, s.water * 0.7) * (0.25 + Math.min(1, speed / 3)) : 0;
    loops.wade.g.gain.setTargetAtTime(wade * 0.6, t, 0.2);
    loops.wade.s.playbackRate.setTargetAtTime(0.8 + Math.min(0.5, speed * 0.1), t, 0.2);
    // Back-up alarm; no added engine/braking/strain oscillator layered over the recordings.
    const rev = live && v.ctl.gear === 'R' && st.engine === 'on';
    alarmT = rev && engineProfile(v.car).backupAlarm ? alarmT + dt : 0;
    alarm.g.gain.setTargetAtTime(alarmT > 0 && alarmT % 1 < 0.5 ? 0.06 : 0, t, 0.008);
    // suspension: a sharp change in the body's vertical speed is a hit
    const vy = v.parts.truck.getLinearVelocity().y;
    if (jolt.v !== v) jolt = { v, vy };
    const dv = Math.abs(vy - jolt.vy) / Math.max(dt, 1 / 240); jolt.vy = vy;
    bumpCool -= dt;
    if (live && dv > 10 && bumpCool <= 0) { api.bump(Math.min(1, (dv - 10) / 30), massT); bumpCool = 0.14; }
  };
  api.suspend = () => { if (ac && ac.state === 'running') ac.suspend(); };
  api.resume = () => { if (ac && ac.state === 'suspended') ac.resume(); };
  api.status = () => ({ mode: api.mode, decoded: Object.keys(engineBuffers).length, voices: [...voices.values()].map(v => v.profile.recording), error: api.error });
  return api;
}
