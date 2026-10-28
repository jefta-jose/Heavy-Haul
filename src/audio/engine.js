// A truck's engine voice, from its class's recordings (assets/audio/sounds.json → bank). No synthesis.
//
// Layers: idle, drive (steady running) and, where recorded, pull (working hard). Each is a long
// recording played by the seamless loop player, so nothing audibly repeats. Revs and throttle blend
// the layers with equal-power crossfades and move their playback speed within a modest range, which
// keeps the recordings' real character. Starting plays the recorded starter and catch; stopping plays
// the recorded shutdown, or lets the running layers wind down in pitch and fade.

import { createLoopPlayer } from './loop-player.js';

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, Number.isFinite(x) ? x : lo));

// The engine pack for a car: tools/lib/content.js resolves car.audio.engine to a class in the bank.
export function engineProfile(car, bank) {
  const a = car.audio ?? {}, pack = bank?.engines?.[a.engine] ?? null;
  return {
    engine: a.engine ?? null, pack, layers: pack?.layers ?? {},
    pitch: pack?.pitch ?? 1, cutoff: pack?.cutoff ?? 3200,
    crankS: clamp(a.crankS ?? pack?.crankS ?? 1.2, 0.5, 3),
    airBrakes: a.airBrakes ?? pack?.airBrakes ?? (car.spec?.class ?? '') !== 'scout',
    backupAlarm: a.backupAlarm ?? (car.spec?.class ?? '') !== 'scout',
  };
}

// revs 0..1 (idle to governor), load 0..1 (throttle) -> layer gains, playback rates and filter
export function engineMix(profile, revs, load) {
  revs = clamp(revs, 0, 1); load = clamp(load, 0, 1);
  const hasPull = !!profile.layers.pull;
  const moving = clamp(revs * 1.15 + load * 0.45, 0, 1), a = moving * Math.PI / 2;
  const pullShare = hasPull ? clamp(load * 1.3 - 0.3, 0, 1) * clamp(0.4 + revs, 0, 1) : 0;
  const run = Math.sin(a);
  return {
    idle: Math.cos(a) * 0.9,
    drive: run * Math.cos(pullShare * Math.PI / 2) * (0.62 + load * 0.38),
    pull: run * Math.sin(pullShare * Math.PI / 2),
    idleRate: profile.pitch * (1 + revs * 0.22),
    driveRate: profile.pitch * (0.84 + revs * 0.36 + load * 0.04),
    cutoff: profile.cutoff * (0.5 + load * 0.35 + revs * 0.15),
    level: 0.85 + load * 0.2,
  };
}

export function createEngineVoice(ac, buffers, car, bank, destination) {
  const profile = engineProfile(car, bank), out = ac.createGain(), filter = ac.createBiquadFilter();
  out.gain.value = 0; filter.type = 'lowpass'; filter.Q.value = 0.5; filter.frequency.value = profile.cutoff;
  filter.connect(out); out.connect(destination);
  const L = profile.layers, buf = name => name && buffers[name];
  if (!buf(L.idle) || !buf(L.drive)) return { car, profile, out, set() {}, update() {}, stop() { out.disconnect(); } };
  const layers = {};
  for (const role of ['idle', 'drive', 'pull']) if (buf(L[role])) layers[role] = createLoopPlayer(ac, buf(L[role]), filter, { grain: role === 'idle' ? [3, 6] : [2.5, 5], fade: 0.9 });
  let state = null, oneShot = null;
  function play(name, gain = 1) {
    if (!buf(name)) return;
    if (oneShot) { const o = oneShot; o.g.gain.setTargetAtTime(0, ac.currentTime, 0.05); o.s.stop(ac.currentTime + 0.3); }
    const s = ac.createBufferSource(), g = ac.createGain();
    s.buffer = buf(name); g.gain.value = gain; s.connect(g); g.connect(filter);
    s.onended = () => { s.disconnect(); g.disconnect(); if (oneShot?.s === s) oneShot = null; };
    s.start(); oneShot = { s, g };
  }
  return {
    car, profile, out,
    set(st) {
      const t = ac.currentTime;
      if (st.engine !== state) {
        if (st.engine === 'cranking') { play(L.start, 1); for (const l of Object.values(layers)) l.setGain(0, 0.05); }
        else if (st.engine === 'off' && state === 'on') {
          if (buf(L.stop)) { play(L.stop, 1); for (const l of Object.values(layers)) l.setGain(0, 0.12); }
          else for (const l of Object.values(layers)) l.windDown(1.4);
        }
        state = st.engine;
      }
      if (st.engine !== 'on') return;
      const dc = car.drivetrain, revs = (st.rpm - dc.idleRpm) / Math.max(1, dc.governedRpm - dc.idleRpm);
      const m = engineMix(profile, revs, st.throttle);
      // just started: the recorded catch is still ringing out, so the idle comes in gently
      const tau = oneShot ? 0.35 : 0.1;
      layers.idle.setGain(m.idle, tau); layers.idle.setRate(m.idleRate);
      layers.drive.setGain(m.drive, tau); layers.drive.setRate(m.driveRate);
      if (layers.pull) { layers.pull.setGain(m.pull, tau); layers.pull.setRate(m.driveRate); }
      filter.frequency.setTargetAtTime(m.cutoff, t, 0.12);
      out.gain.setTargetAtTime(m.level * (this.level ?? 1), t, 0.1);
    },
    // fade for distance and pause, on top of the mix
    setLevel(v) { this.level = v; if (state !== 'on') out.gain.setTargetAtTime(v, ac.currentTime, 0.1); },
    update() { if (state === 'on' || state === 'off') for (const l of Object.values(layers)) l.update(); },
    stop() {
      for (const l of Object.values(layers)) l.stop();
      if (oneShot) try { oneShot.s.stop(); } catch (e) {}
      filter.disconnect(); out.disconnect();
    },
  };
}
