// Game audio from real recordings (assets/audio/sounds.json → assets/audio/bank, credits in
// sources.json). Engines are per truck class (src/audio/engine.js). The driven vehicle adds tires on
// the ground under it, a smooth wade and churn in water, a squelch in mud that grows when the wheels
// spin, air or hydraulic brakes, the handbrake, its load shaking when it hits rocks and bumps, and the
// back-up alarm. The season's ambience zones bring in forest birds, frogs and crows.
// Long beds play through the seamless loop player, so nothing audibly repeats.
//
// Volumes: master, engines, effects and ambience, 0..1 each plus mute, saved in the browser.

import { createEngineVoice, engineProfile } from './engine.js';
import { createLoopPlayer } from './loop-player.js';
import { engineTelemetry } from './rpm-engine.js';

const VOLUME_KEY = 'hh_audio_volumes';
export const DEFAULT_VOLUMES = { master: 0.8, engine: 0.8, effects: 0.8, ambience: 0.7, muted: false };
const GROUNDS = { gravel: 'gravel', dirt: 'dirt', rock: 'rocks', mud: 'mud', wood: 'dirt' };
const BEDS = ['forest', 'frogs'];

function loadVolumes() {
  try { return { ...DEFAULT_VOLUMES, ...JSON.parse(localStorage.getItem(VOLUME_KEY) || '{}') }; } catch (e) { return { ...DEFAULT_VOLUMES }; }
}
const pick = list => list[Math.floor(Math.random() * list.length)];

export function createVehicleAudio({ clips = {}, bank = { clips: {}, engines: {}, effects: {} }, ambience = [] } = {}) {
  const api = { ok: false, mode: null, ready: null, error: null, volumes: loadVolumes() };
  let ac = null, master, engineBus, fxBus, ambBus, buffers = {}, beds = {}, ground = {}, water = {}, alarm = null;
  const voices = new Map();      // vehicle -> engine voice
  let alarmT = 0, bumpCool = 0, jolt = { v: null, vy: 0 }, brakeState = { v: null }, crowT = 3;

  function applyVolumes() {
    if (!ac) return;
    const v = api.volumes, t = ac.currentTime;
    master.gain.setTargetAtTime(v.muted ? 0 : v.master * 0.9, t, 0.05);
    engineBus.gain.setTargetAtTime(v.engine, t, 0.05);
    fxBus.gain.setTargetAtTime(v.effects, t, 0.05);
    ambBus.gain.setTargetAtTime(v.ambience, t, 0.05);
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
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -12; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.25;
    master = ac.createGain(); engineBus = ac.createGain(); fxBus = ac.createGain(); ambBus = ac.createGain();
    engineBus.connect(comp); fxBus.connect(comp); ambBus.connect(master); comp.connect(master); master.connect(ac.destination);
    applyVolumes();
    // back-up alarm: a classic beeper, slightly distant
    {
      const o = ac.createOscillator(); o.frequency.value = 1040;
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
      const g = ac.createGain(); g.gain.value = 0; o.connect(lp); lp.connect(g); g.connect(fxBus); o.start();
      alarm = { g };
    }
    api.mode = 'loading';
    api.ready = Promise.all(Object.entries(clips).map(async ([key, uri]) => {
      // a data URI in the one-file build, a file path in the app build
      const raw = uri.startsWith('data:') ? Uint8Array.from(atob(uri.split(',')[1]), c => c.charCodeAt(0)).buffer : await (await fetch(uri)).arrayBuffer();
      return [key, await ac.decodeAudioData(raw)];
    })).then(entries => {
      if (!entries.length) throw new Error('No sound bank embedded');
      buffers = Object.fromEntries(entries);
      const loop = (name, bus, opts) => buffers[name] && createLoopPlayer(ac, buffers[name], bus, opts);
      for (const name of new Set(Object.values(GROUNDS))) ground[name] = loop(name, fxBus, { grain: [2, 4.5], fade: 0.7 });
      water = { wade: loop('wade', fxBus, { grain: [2, 4], fade: 0.8 }), churn: loop('water-churn', fxBus, { grain: [1.2, 2.2], fade: 0.6 }) };
      for (const name of BEDS) beds[name] = loop(name, ambBus, { grain: [6, 12], fade: 2.5 });
      api.mode = 'recorded'; api.ok = true;
    }).catch(error => { api.error = error.message; api.mode = 'unavailable'; console.warn('Sound bank could not load:', error); });
    return api.ready;
  };

  // one-shot from the bank: a named effect picks one of its variants
  function play(effect, gain, { rate = 1, bus = fxBus, pan = 0 } = {}) {
    if (!api.ok) return;
    const names = bank.effects[effect] ?? [effect], b = buffers[pick(names)];
    if (!b) return;
    const s = ac.createBufferSource(), g = ac.createGain();
    s.buffer = b; s.playbackRate.value = rate * (0.95 + Math.random() * 0.1); g.gain.value = gain;
    let node = g;
    if (pan && ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = pan; g.connect(p); node = p; }
    s.connect(g); node.connect(bus); s.onended = () => { s.disconnect(); g.disconnect(); if (node !== g) node.disconnect(); };
    s.start();
  }
  // short synthetic switch clicks for the cab controls
  function tick(freq, gain, decay) {
    if (!ac) return;
    const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
    o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(freq * 0.5, t + decay);
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    o.connect(g); g.connect(fxBus); o.start(t); o.stop(t + decay + 0.05);
  }
  const heaviness = v => (v.car.spec?.massT ?? 5) + (v.car.load?.massT ?? 0);

  // cab switches and levers
  api.clunk = on => tick(on ? 110 : 80, 0.3, 0.16);
  api.shift = gear => { tick(gear === 'H' ? 140 : 95, 0.25, 0.12); setTimeout(() => tick(70, 0.15, 0.18), 110); };
  api.key = () => tick(1800, 0.05, 0.04);
  // the handbrake: a ratchet lever on scouts, an air hiss on trucks with air brakes
  api.handbrake = (on, car) => {
    if (engineProfile(car, bank).airBrakes) play(on ? 'air-release' : 'air-burst', on ? 0.7 : 0.5);
    else play(on ? 'handbrake-on' : 'handbrake-off', 0.8);
  };
  // one-shots from the world
  api.splash = power => power < 0.6 ? play('splash-small', 0.4 + power * 0.6) : play('splash', Math.min(1, 0.5 + power * 0.35), { rate: power > 1.2 ? 0.85 : 1 });
  // a rock breaking under a tire, or a hard hit: the thump underneath and the load shaking on its bed
  function cargo(strength, massT) {
    const g = Math.min(1, 0.25 + strength * 0.8);
    if (massT < 8) { play('cargo-light', g * 0.8); if (strength > 0.4) play('cargo-chains', g * 0.5); }
    else if (massT < 50) { play('rattle', g * 0.8); play('cargo-heavy-chains', g * 0.55, { rate: 0.95 }); }
    else { play('cargo-metal', g * 0.75, { rate: 0.85 }); play('cargo-heavy-chains', g * 0.6, { rate: 0.85 }); }
  }
  api.crush = size => { play('underbody', Math.min(1, 0.5 + size * 0.4)); if (api.active) cargo(Math.min(1, size), heaviness(api.active)); };
  api.wood = size => { play('cargo-light', Math.min(1, 0.45 + size * 0.4), { rate: 0.8 }); if (size > 1) play('underbody', 0.8, { rate: 0.8 }); };
  api.bump = (strength, massT) => { play('underbody', Math.min(0.9, 0.2 + strength * 0.7), { rate: massT > 30 ? 0.8 : 1 }); cargo(strength, massT); };

  // the season's ambience: each zone's weight fades in and out over `fade` metres at its ends
  function zoneWeight(z, x) {
    const f = z.fade ?? 25, [a, b] = z.x;
    return Math.max(0, Math.min(1, (x - a + f) / f, (b + f - x) / f));
  }

  // Every frame: s = { playing, vehicles, active, water, camX }.
  api.update = (s, dt) => {
    if (!api.ok) return;
    const t = ac.currentTime, live = s.playing;
    api.active = s.active;
    // engine voices: one per vehicle, created and removed with the vehicles
    const seen = new Set();
    for (const v of s.vehicles) {
      seen.add(v);
      let voice = voices.get(v);
      if (!voice || voice.car !== v.car) { voice?.stop(); voice = createEngineVoice(ac, buffers, v.car, bank, engineBus); voices.set(v, voice); }
      // parked vehicles idle in the distance
      const dist = Math.abs(v.parts.truck.getPosition().x - s.camX);
      voice.setLevel(live ? (v === s.active ? 1 : 0.8 / (1 + dist / 10)) : 0);
      voice.set(v.st, engineTelemetry(v)); voice.update();
    }
    for (const [v, voice] of voices) if (!seen.has(v)) { voice.stop(); voices.delete(v); }

    // the driven vehicle's tires on the ground under it, scaled by speed and weight
    const v = s.active, st = v.st, speed = Math.abs(st.speed), massT = heaviness(v), radius = v.car.rig.radius;
    const inWater = st.inWater > 0.3 || st.surf === 'creek';
    const roll = live ? Math.min(1, speed / 4) * Math.min(1.3, 0.6 + Math.log10(1 + massT) * 0.3) : 0;
    const rate = Math.max(0.75, Math.min(1.35, (0.85 + speed * 0.04) * Math.sqrt(0.9 / Math.max(0.6, radius))));
    const surf = GROUNDS[st.surf] ?? 'dirt';
    for (const [name, p] of Object.entries(ground)) {
      if (!p) continue;
      let g = !inWater && surf === name ? roll * 0.55 : 0;
      if (name === 'mud' && st.surf === 'mud' && live) g = Math.max(g, Math.min(0.8, st.slip * 0.18 + roll * 0.4));   // churning in the muck
      p.setGain(g, 0.25); p.setRate(name === 'mud' ? 0.9 + Math.min(0.3, st.slip * 0.05) : rate, 0.3); p.update();
    }
    // water: a smooth wade that follows the depth, and a churn that follows the speed
    const depth = live ? Math.min(1, s.water * 0.8) : 0;
    if (water.wade) { water.wade.setGain(depth * (0.35 + Math.min(0.5, speed * 0.15)), 0.35); water.wade.setRate(0.85 + Math.min(0.25, speed * 0.05), 0.4); water.wade.update(); }
    if (water.churn) { water.churn.setGain(depth * Math.min(0.55, speed * 0.18), 0.35); water.churn.setRate(0.85 + Math.min(0.2, speed * 0.04), 0.4); water.churn.update(); }

    // brakes: a hydraulic hiss braking from speed, and on air brakes the release when it stops
    const air = engineProfile(v.car, bank).airBrakes;
    if (brakeState.v !== v) brakeState = { v, braking: false, stopped: false };
    const braking = live && v.ctl.brake > 0.5;
    if (braking && !brakeState.braking && speed > 3 && air) play('hydraulic-brake', Math.min(0.7, 0.2 + speed * 0.05));
    if (braking && air && speed < 0.3 && !brakeState.stopped && brakeState.braking) { play('air-release', 0.55); brakeState.stopped = true; }
    if (!braking && brakeState.stopped && air) { play('air-burst', 0.3); brakeState.stopped = false; }
    if (speed > 1) brakeState.stopped = false;
    brakeState.braking = braking;

    // back-up alarm
    const rev = live && v.ctl.gear === 'R' && st.engine === 'on';
    alarmT = rev && engineProfile(v.car, bank).backupAlarm ? alarmT + dt : 0;
    alarm.g.gain.setTargetAtTime(alarmT > 0 && alarmT % 1 < 0.5 ? 0.035 : 0, t, 0.01);

    // suspension: a sharp change in the body's vertical speed is a hit, and the load shakes
    const vy = v.parts.truck.getLinearVelocity().y;
    if (jolt.v !== v) jolt = { v, vy };
    const dv = Math.abs(vy - jolt.vy) / Math.max(dt, 1 / 240); jolt.vy = vy;
    bumpCool -= dt;
    if (live && dv > 9 && bumpCool <= 0) { api.bump(Math.min(1, (dv - 9) / 25), massT); bumpCool = 0.25; }

    // ambience beds and crows, from the zone the camera is in
    const x = s.camX, w = { forest: 0, frogs: 0, crows: 0 };
    for (const z of ambience) w[z.sound] = Math.max(w[z.sound] ?? 0, zoneWeight(z, x) * (z.gain ?? 1));
    for (const name of BEDS) if (beds[name]) { beds[name].setGain(live ? w[name] * 0.6 : 0, 1.2); beds[name].update(); }
    crowT -= dt;
    if (live && w.crows > 0.05 && crowT <= 0) {
      const near = Math.random() < 0.45;
      play(near ? 'crow' : 'crow-far', w.crows * (near ? 0.45 : 0.6) * (0.6 + Math.random() * 0.4), { bus: ambBus, pan: Math.random() * 1.4 - 0.7, rate: 0.95 + Math.random() * 0.1 });
      crowT = 2.5 + Math.random() * 7;
    }
  };
  api.suspend = () => { if (ac && ac.state === 'running') ac.suspend(); };
  api.resume = () => { if (ac && ac.state === 'suspended') ac.resume(); };
  api.status = () => ({ mode: api.mode, decoded: Object.keys(buffers).length, voices: [...voices.values()].map(v => v.profile.engine), error: api.error });
  return api;
}
