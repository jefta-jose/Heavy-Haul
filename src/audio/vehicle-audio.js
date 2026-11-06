// Game audio from real recordings (assets/audio/sounds.json → assets/audio/bank, credits in
// sources.json). Engines are per truck class (src/audio/engine.js); service trucks play their class's.
// The driven vehicle adds tires on the ground under it, a chassis rattle that follows the road,
// a smooth wade and churn in water, squelch and spinning wheels in mud, gear changes, air or hydraulic
// brakes, the handbrake, its load shaking when it breaks rocks, and the back-up alarm. Winching
// has the motor and the cable straining; refuelling has the pump and the fuel running. The season's
// ambience zones bring in forest birds, frogs and crows.
// Long beds play through the seamless loop player, so nothing audibly repeats.
//
// Decoded sound takes far more memory than the files, so clips are decoded as they are needed: the
// short effects up front (they must play the moment they happen), the engines of the car picked in the
// garage (prepare), and each long bed the first time it is heard.
//
// Volumes: master, engines, effects and ambience, 0..1 each plus mute, saved in the browser.

import { createEngineVoice, engineProfile, engineTelemetry, packClips } from './engine.js';
import { createLoopPlayer } from './loop-player.js';

const VOLUME_KEY = 'hh_audio_volumes';
const DEFAULT_VOLUMES = { master: 0.8, engine: 0.8, effects: 0.8, ambience: 0.7, music: 0.5, muted: false };
const GROUNDS = { gravel: 'gravel', dirt: 'dirt', rock: 'rocks', mud: 'mud', wood: 'dirt' };
const BEDS = ['forest', 'frogs'];
// long clips only ever played as beds, decoded when first heard
const BED_CLIPS = new Set([...Object.values(GROUNDS), ...BEDS, 'wade', 'water-churn', 'rattle-bed', 'mud-spin', 'winch-motor', 'fuel-pump', 'fuel-flow']);
// The load shaking when a tire hits a log, pipe or rock, by class. Scouts have none. gain is at full speed,
// gap is the least seconds between hits, and seconds plays a burst of a clip much longer than the moment.
export const HIT_SOUNDS = {
  highway: { effect: 'cargo-heavy-chains', gain: 0.65, rate: 0.95, gap: 0.7 },
  'heavy-duty': { effect: 'rattle', gain: 0.7, rate: 0.9, gap: 0.6 },
  offroad: { effect: 'cargo-chains', gain: 0.7, rate: 0.85, gap: 0.6 },
  heavy: { effect: 'cable-strain', gain: 0.8, rate: 0.85, gap: 1.5, seconds: 2.5 },
};

function loadVolumes() {
  try { return { ...DEFAULT_VOLUMES, ...JSON.parse(localStorage.getItem(VOLUME_KEY) || '{}') }; } catch (e) { return { ...DEFAULT_VOLUMES }; }
}
const pick = list => list[Math.floor(Math.random() * list.length)];

export function createVehicleAudio({ clips = {}, bank = { clips: {}, engines: {}, effects: {} }, ambience = [] } = {}) {
  const api = { ok: false, mode: null, ready: null, error: null, volumes: loadVolumes() };
  let ac = null, master, engineBus, fxBus, ambBus, buffers = {}, loading = {}, beds = {}, ground = {}, water = {}, work = {}, alarm = null;
  const engineClips = new Set(Object.values(bank.engines).flatMap(packClips));
  const voices = new Map();      // vehicle -> engine voice
  let alarmT = 0, bumpCool = 0, rough = 0, jolt = { v: null, vy: 0 }, brakeState = { v: null }, crowT = 3, wasFuelling = false;

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

  // fetch and decode a clip once; a clip dropped by prepare while decoding is not kept
  const load = name => loading[name] ??= (async () => {
    // a data URI in the one-file build, a file path in the app build
    const uri = clips[name], raw = uri.startsWith('data:') ? Uint8Array.from(atob(uri.split(',')[1]), c => c.charCodeAt(0)).buffer : await (await fetch(uri)).arrayBuffer();
    const buffer = await ac.decodeAudioData(raw);
    if (loading[name]) buffers[name] = buffer;
  })().catch(error => { api.error = error.message; console.warn(`Sound ${name} could not load:`, error); });

  // a bed that decodes its clip the first time it is asked to sound, and joins in once that is done
  function loop(name, bus, opts) {
    if (!clips[name]) return null;
    let player = null, asked = false;
    return {
      setGain(g, tau) {
        if (player) player.setGain(g, tau);
        else if (g > 0 && !asked) { asked = true; load(name).then(() => { if (buffers[name]) player = createLoopPlayer(ac, buffers[name], bus, opts); }); }
      },
      setRate(r, tau) { player?.setRate(r, tau); },
      update() { player?.update(); },
    };
  }

  function init() {
    if (ac) return;
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; return; }
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
    for (const name of new Set(Object.values(GROUNDS))) ground[name] = loop(name, fxBus, { grain: [2, 4.5], fade: 0.7 });
    water = { wade: loop('wade', fxBus, { grain: [2, 4], fade: 0.8 }), churn: loop('water-churn', fxBus, { grain: [1.2, 2.2], fade: 0.6 }) };
    for (const name of BEDS) beds[name] = loop(name, ambBus, { grain: [6, 12], fade: 2.5 });
    work = {
      rattle: loop('rattle-bed', fxBus, { grain: [2, 4], fade: 0.6 }), spin: loop('mud-spin', fxBus, { grain: [1.5, 3], fade: 0.5 }),
      winch: loop('winch-motor', fxBus, { grain: [2, 4], fade: 0.6 }), cable: loop('cable-strain', fxBus, { grain: [1.5, 3], fade: 0.5 }),
      pump: loop('fuel-pump', fxBus, { grain: [3, 6], fade: 0.8 }), flow: loop('fuel-flow', fxBus, { grain: [3, 6], fade: 0.8 }),
    };
    const shots = Object.values(bank.effects).flat().filter(name => clips[name] && !BED_CLIPS.has(name));
    api.ready = Promise.all(shots.map(load)).then(() => {
      if (!shots.length) throw new Error('No sound bank embedded');
      api.mode = 'recorded'; api.ok = true;
    }).catch(error => { api.error = error.message; api.mode = 'unavailable'; console.warn('Sound bank could not load:', error); });
  }

  api.start = () => {
    init();
    if (ac?.state === 'suspended') ac.resume();
    return api.ready;
  };

  // Decode the engines these cars play and drop any other engine. Called from the garage, ahead of the
  // tap on DRIVE, so the crank is ready to be heard. A context made before any tap stays suspended until start().
  api.prepare = cars => {
    init();
    if (!ac) return Promise.resolve();
    const want = new Set(cars.flatMap(car => packClips(engineProfile(car, bank).pack)));
    for (const name of engineClips) if (!want.has(name)) { delete buffers[name]; delete loading[name]; }
    return Promise.all([...want].map(load));
  };

  // one-shot from the bank: a named effect picks one of its variants. `seconds` plays a burst of that
  // length from a random place, fading out, for a clip much longer than the moment
  function play(effect, gain, { rate = 1, bus = fxBus, pan = 0, seconds = 0 } = {}) {
    if (!api.ok) return;
    const names = bank.effects[effect] ?? [effect], name = pick(names), b = buffers[name];
    if (!b) { if (clips[name]) load(name); return; }
    const s = ac.createBufferSource(), g = ac.createGain();
    s.buffer = b; s.playbackRate.value = rate * (0.95 + Math.random() * 0.1); g.gain.value = gain;
    let node = g;
    if (pan && ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = pan; g.connect(p); node = p; }
    s.connect(g); node.connect(bus); s.onended = () => { s.disconnect(); g.disconnect(); if (node !== g) node.disconnect(); };
    if (seconds) {
      const at = ac.currentTime;
      g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(gain, at + 0.05); g.gain.setTargetAtTime(0, at + seconds * 0.5, seconds * 0.15);
      s.start(at, Math.random() * Math.max(0, b.duration - seconds * rate)); s.stop(at + seconds);
    } else s.start();
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
  // what the engine voice reports: a gear change
  function engineEvent(kind, v) {
    const air = engineProfile(v.car, bank).airBrakes;
    if (kind === 'shift') { play('gear-clunk', 0.38, { rate: heaviness(v) > 30 ? 0.8 : 1 }); if (air) play('air-pop', 0.14, { rate: 1.15 }); }
  }

  // cab switches and levers
  api.clunk = on => play('gear-clunk', on ? 0.4 : 0.32, { rate: on ? 1.25 : 1.05 });
  api.shift = gear => { play('gear-clunk', 0.6, { rate: gear === 'H' ? 1 : 0.85 }); setTimeout(() => play('gear-clunk', 0.3, { rate: 0.8 }), 130); };
  api.key = () => tick(1800, 0.05, 0.04);
  // the handbrake: a ratchet lever on scouts, an air hiss on trucks with air brakes
  api.handbrake = (on, car) => {
    if (engineProfile(car, bank).airBrakes) play(on ? 'air-release' : 'air-burst', on ? 0.7 : 0.5);
    else play(on ? 'handbrake-on' : 'handbrake-off', 0.8);
  };
  // the winch hook going on the tow point or coming off, with the chain settling
  api.hook = on => { play('hook-clank', on ? 0.85 : 0.6); if (on) setTimeout(() => play('cargo-heavy-chains', 0.4), 90); };
  // one-shots from the world
  api.splash = power => power < 0.6 ? play('splash-small', 0.4 + power * 0.6) : play('splash', Math.min(1, 0.5 + power * 0.35), { rate: power > 1.2 ? 0.85 : 1 });
  // a rock breaking under a tire: the thump underneath and the load shaking on its bed
  // the load shaking, spaced out so a run of logs doesn't pile up
  let hitAt = -9;
  function loadHit(car, gain) {
    const h = HIT_SOUNDS[car.class];
    if (!h || !api.ok || ac.currentTime - hitAt < h.gap) return;
    hitAt = ac.currentTime;
    play(h.effect, h.gain * gain, { rate: h.rate, seconds: h.seconds });
  }
  function cargo(strength, car, massT) {
    const g = Math.min(1, 0.25 + strength * 0.8);
    if (car.class === 'heavy') { play('rattle', g * 0.75, { rate: 0.8 }); loadHit(car, g * 0.9); }
    else if (massT < 8) { play('cargo-light', g * 0.8); if (strength > 0.4) play('cargo-chains', g * 0.5); }
    else { play('rattle', g * 0.8); play('cargo-heavy-chains', g * 0.55, { rate: 0.95 }); }
  }
  api.crush = size => { play('underbody', Math.min(1, 0.5 + size * 0.4)); if (api.active) cargo(Math.min(1, size), api.active.car, heaviness(api.active)); };
  // a tire touching a log, pipe or rock: the load shakes, harder with speed, and not while it just sits there
  api.hit = () => {
    const v = api.active, speed = Math.abs(v?.st.speed ?? 0);
    if (speed > 0.2) loadHit(v.car, Math.min(1, 0.55 + speed * 0.12));
  };
  // src/main.js adds the haptics for hard hits here; they make no sound of their own
  api.bump = () => {};

  // the season's ambience: each zone's weight fades in and out over `fade` metres at its ends
  function zoneWeight(z, x) {
    const f = z.fade ?? 25, [a, b] = z.x;
    return Math.max(0, Math.min(1, (x - a + f) / f, (b + f - x) / f));
  }

  // Every frame: s = { playing, vehicles, active, water, camX, refueling }.
  api.update = (s, dt) => {
    if (!api.ok) return;
    const t = ac.currentTime, live = s.playing;
    api.active = s.active;
    // engine voices: one per vehicle, created and removed with the vehicles
    const seen = new Set();
    for (const v of s.vehicles) {
      seen.add(v);
      let voice = voices.get(v);
      if (!voice || voice.car !== v.car) {
        voice?.stop(); voices.delete(v);
        // a car the garage did not prepare: its voice starts once its engine has decoded
        const need = packClips(engineProfile(v.car, bank).pack);
        if (!need.every(name => buffers[name])) { if (live) need.forEach(load); continue; }
        voice = createEngineVoice(ac, buffers, v.car, bank, engineBus); voices.set(v, voice);
      }
      voice.onEvent = v === s.active ? kind => engineEvent(kind, v) : null;
      // parked vehicles idle in the distance, volume and top end falling away with it
      const dist = Math.abs(v.parts.truck.getPosition().x - s.camX), far = v !== s.active;
      voice.setLevel(live ? (far ? 0.8 / (1 + dist / 10) : 1) : 0, far ? 1 / (1 + dist / 18) : 1);
      voice.set(v.st, engineTelemetry(v)); voice.update();
      // the needle shows the revs you hear (the physics never reads this)
      const dc = v.car.drivetrain;
      v.st.soundRpm = v.st.engine === 'on' ? dc.idleRpm + voice.revs.revs * (dc.governedRpm - dc.idleRpm) : undefined;
    }
    for (const [v, voice] of voices) if (!seen.has(v)) { voice.stop(); voices.delete(v); }

    // the driven vehicle's tires on the ground under it, scaled by speed and weight
    const v = s.active, st = v.st, speed = Math.abs(st.speed), massT = heaviness(v), radius = v.car.rig.radius;
    const inWater = st.surf === 'creek';
    const roll = live ? Math.min(1, speed / 4) * Math.min(1.3, 0.6 + Math.log10(1 + massT) * 0.3) : 0;
    const rate = Math.max(0.75, Math.min(1.35, (0.85 + speed * 0.04) * Math.sqrt(0.9 / Math.max(0.6, radius))));
    const surf = GROUNDS[st.surf] ?? 'dirt';
    for (const [name, p] of Object.entries(ground)) {
      if (!p) continue;
      let g = !inWater && surf === name ? roll * 0.55 : 0;
      if (name === 'mud' && st.surf === 'mud' && live) g = Math.max(g, Math.min(0.8, st.slip * 0.18 + roll * 0.4));   // churning in the muck
      p.setGain(g, 0.25); p.setRate(name === 'mud' ? 0.9 + Math.min(0.3, st.slip * 0.05) : rate, 0.3); p.update();
    }
    // the chassis: a rattle that follows speed and how rough the ride is
    const vy = v.parts.truck.getLinearVelocity().y;
    if (jolt.v !== v) jolt = { v, vy };
    const dv = Math.abs(vy - jolt.vy) / Math.max(dt, 1 / 240);
    jolt.vy = vy;
    rough += (Math.min(1, dv / 14) - rough) * Math.min(1, dt / 0.25);
    const surfRough = { rock: 1, gravel: 0.75, wood: 0.7, dirt: 0.55, mud: 0.35 }[st.surf] ?? 0.5;
    if (work.rattle) { work.rattle.setGain(live && !inWater ? Math.min(0.75, (Math.min(1, speed / 7) * 0.32 + rough * 0.55) * surfRough) : 0, 0.15); work.rattle.setRate(Math.max(0.8, Math.min(1.2, 0.85 + speed * 0.03)), 0.3); work.rattle.update(); }
    // wheels spinning in mud, over the squelch
    if (work.spin) { work.spin.setGain(live && st.surf === 'mud' ? Math.min(0.85, Math.max(0, st.slip - 0.5) * 0.28) : 0, 0.2); work.spin.setRate(0.85 + Math.min(0.35, st.slip * 0.06), 0.25); work.spin.update(); }

    // the winch: the motor runs and the cable strains while it holds a load
    const hauling = live && s.vehicles.some(o => o.cable?.taut);
    if (work.winch) { work.winch.setGain(hauling ? 0.32 : 0, 0.25); work.winch.update(); }
    if (work.cable) { work.cable.setGain(hauling ? 0.55 : 0, 0.15); work.cable.update(); }
    // refuelling: the pump runs and the fuel flows, with a clank as the hose connects and comes off
    const fuelling = live && !!s.refueling;
    if (fuelling !== wasFuelling) { play('hook-clank', 0.5, { rate: 1.1 }); wasFuelling = fuelling; }
    if (work.pump) { work.pump.setGain(fuelling ? 0.42 : 0, 0.3); work.pump.update(); }
    if (work.flow) { work.flow.setGain(fuelling ? 0.4 : 0, 0.3); work.flow.update(); }

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

    // suspension: a sharp change in the body's vertical speed is a hit
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
  api.status = () => ({
    mode: api.mode, decoded: Object.keys(buffers).length, voices: [...voices.values()].map(v => v.profile.engine), error: api.error,
    decodedMB: Object.values(buffers).reduce((sum, b) => sum + b.length * b.numberOfChannels * 4, 0) / 1e6,
  });
  return api;
}
