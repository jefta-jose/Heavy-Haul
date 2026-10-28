// Recorded engine selection and mixing only. No engine synthesis or main-thread audio callbacks.
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, Number.isFinite(x) ? x : lo));
const RECORDINGS = {
  'swamp-scout-4': { recording: 'scout-v8', pitch: 1, cutoff: 3900 },
  'mesa-coyote-8': { recording: 'mesa-cummins', pitch: 1, cutoff: 3400 },
  'fuel-runner': { recording: 'fuel-delivery', pitch: 1, cutoff: 3200 },
  'breakdown-wrecker': { recording: 'wrecker-diesel', pitch: 0.96, cutoff: 3000 },
  'ice-breaker-19': { recording: 'ice-semi', pitch: 0.95, cutoff: 2800 },
  'mountain-mover-18': { recording: 'mountain-construction', pitch: 0.9, cutoff: 2500 },
};

export function engineProfile(car) {
  const a = car.audio ?? {}, heavy = (car.spec?.powerKw ?? 200) >= 700;
  const fallback = (car.spec?.class ?? '') === 'scout' ? RECORDINGS['swamp-scout-4']
    : heavy ? RECORDINGS['mountain-mover-18'] : RECORDINGS['breakdown-wrecker'];
  return { ...(RECORDINGS[car.id] ?? fallback), crankS: clamp(a.crankS ?? 1.2, 0.5, 3), backupAlarm: a.backupAlarm ?? car.spec?.class !== 'scout' };
}

// Modest rate movement preserves the real recording's timbre. RPM changes speed, while throttle
// crossfades towards the fuller recorded layer and opens the filter under load.
export function engineMix(profile, revs, load) {
  revs = clamp(revs, 0, 1); load = clamp(load, 0, 1);
  const blend = clamp(revs * 0.55 + load * 0.65, 0, 1), angle = blend * Math.PI / 2;
  return {
    idle: Math.cos(angle) * (0.48 + load * 0.18),
    drive: Math.sin(angle) * (0.55 + load * 0.32),
    idleRate: profile.pitch * (0.98 + revs * 0.56),
    driveRate: profile.pitch * (0.98 + revs * 0.56),
    cutoff: profile.cutoff * (0.62 + load * 0.28 + revs * 0.1),
  };
}

export function createRecordedEngine(ac, bank, car, destination) {
  const profile = engineProfile(car), out = ac.createGain(), filter = ac.createBiquadFilter();
  out.gain.value = 0; filter.type = 'lowpass'; filter.Q.value = 0.45; filter.frequency.value = profile.cutoff;
  filter.connect(out); out.connect(destination);
  const layers = ['idle', 'drive'].map(role => {
    const source = ac.createBufferSource(), gain = ac.createGain();
    source.buffer = bank[`${profile.recording}-${role}`]; source.loop = true;
    gain.gain.value = 0; source.connect(gain); gain.connect(filter); source.start();
    return { source, gain };
  });
  let state = null, starter = null;
  function stopStarter() {
    if (!starter) return;
    const s = starter; starter = null;
    s.gain.gain.cancelScheduledValues(ac.currentTime);
    s.gain.gain.setTargetAtTime(0, ac.currentTime, 0.025);
    s.source.stop(ac.currentTime + 0.15);
  }
  return {
    car, profile, out,
    set(st) {
      const t = ac.currentTime;
      if (st.engine !== state) {
        stopStarter();
        if (st.engine === 'cranking') {
          const source = ac.createBufferSource(), gain = ac.createGain();
          source.buffer = bank[`${profile.recording}-start`];
          source.playbackRate.value = source.buffer.duration / profile.crankS;
          gain.gain.value = 0.65; source.connect(gain); gain.connect(filter);
          source.onended = () => { source.disconnect(); gain.disconnect(); };
          source.start(); starter = { source, gain };
        }
        state = st.engine;
      }
      const dc = car.drivetrain, revs = (st.rpm - dc.idleRpm) / Math.max(1, dc.governedRpm - dc.idleRpm);
      const m = engineMix(profile, revs, st.throttle), running = st.engine === 'on';
      layers.forEach((layer, i) => {
        const role = i ? 'drive' : 'idle';
        layer.gain.gain.setTargetAtTime(running ? m[role] : 0, t, running ? 0.09 : 0.06);
        layer.source.playbackRate.setTargetAtTime(m[`${role}Rate`], t, 0.14);
      });
      filter.frequency.setTargetAtTime(m.cutoff, t, 0.12);
    },
    stop() {
      stopStarter();
      for (const l of layers) { l.source.stop(); l.source.disconnect(); l.gain.disconnect(); }
      filter.disconnect(); out.disconnect();
    },
  };
}
