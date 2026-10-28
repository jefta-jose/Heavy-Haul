// RPM-indexed overlap-add playback. Every grain is selected by operating point;
// neither the recorded acceleration nor a short fixed loop drives engine timing.
const WINDOW = Float32Array.from({ length: 128 }, (_, i) => 0.5 - 0.5 * Math.cos(i * Math.PI * 2 / 127));
const EQUAL_POWER_WINDOW = Float32Array.from(WINDOW, Math.sqrt);
const clamp = (x, a, b) => Math.max(a, Math.min(b, Number.isFinite(x) ? x : a));

export function engineTelemetry(vehicle) {
  const { st, car, ctl, parts } = vehicle;
  const ratio = Math.abs(car.drivetrain.gears[ctl.gear] ?? car.drivetrain.gears.H);
  const engineTorque = st.power * 1000 / Math.max(1, st.rpm * Math.PI * 2 / 60);
  const available = engineTorque * ratio * car.drivetrain.efficiency;
  // Joint impulses come from the fixed 120 Hz physics step, not the render dt.
  const reaction = parts.joints.reduce((sum, joint) => sum + Math.abs(joint.getMotorTorque(120)), 0);
  return { load: st.throttle > 0.01 && available > 1 ? clamp(reaction / available, 0, 1) : 0 };
}

export function engineOperatingPoint(car, st, telemetry = {}) {
  const dc = car.drivetrain, pedal = clamp(st.throttle, 0, 1);
  const rpm = clamp(st.rpm, dc.idleRpm, dc.governedRpm * 1.1);
  // Measured wheel-joint reaction torque is supplied by the runtime. Standalone
  // previews can supply load explicitly. A released pedal is always off-load.
  const demand = clamp(telemetry.load ?? pedal, 0, 1);
  return { rpm, load: pedal * (0.3 + demand * 0.7), pedal };
}

export function selectEngineFrames(frames, rpm, load) {
  return frames.map(frame => ({ frame, score: Math.abs(Math.log(frame.rpm / rpm)) * 3 + Math.abs(frame.load - load) * 0.55 }))
    .sort((a, b) => a.score - b.score).slice(0, 6).map(x => x.frame);
}

export function createRpmEngine(ac, buffer, atlas, destination) {
  const out = ac.createGain(), filter = ac.createBiquadFilter(), live = new Set();
  filter.type = 'lowpass'; filter.Q.value = 0.4;
  let compressor = null, trim = null;
  if (atlas.leveling) {
    // Level the recording texture before pedal/load gain, preserving the
    // player's dynamics while suppressing grain-to-grain flutter.
    compressor = ac.createDynamicsCompressor();
    compressor.threshold.value = -28; compressor.knee.value = 12;
    compressor.ratio.value = 6; compressor.attack.value = 0.002; compressor.release.value = 0.025;
    trim = ac.createGain(); trim.gain.value = 0.65;
    filter.connect(compressor); compressor.connect(trim); trim.connect(out);
  } else filter.connect(out);
  out.connect(destination); out.gain.value = 0;
  let point = { rpm: 750, load: 0, pedal: 0 }, next = 0, active = false, serial = 0, rundown = null;
  let candidates = [], selectedRpm = 0, selectedLoad = -1;
  const refresh = () => {
    if (!candidates.length || Math.abs(point.rpm - selectedRpm) > 15 || Math.abs(point.load - selectedLoad) > 0.03) {
      candidates = selectEngineFrames(atlas.frames, point.rpm, point.load);
      selectedRpm = point.rpm; selectedLoad = point.load;
    }
  };
  function spawn(when) {
    refresh();
    // A low-discrepancy walk varies source texture without a repeating six-grain
    // sequence. It never changes the requested RPM or load.
    const sequence = ++serial;
    const frame = candidates[Math.floor((sequence * 0.61803398875 % 1) * candidates.length)];
    const rate = clamp(point.rpm / frame.rpm, 0.35, 3.5);
    // Whole combustion cycles, overlapped by half, maintain requested cadence.
    // A class can use longer grains for a softer blend without changing RPM.
    const duration = Math.min(clamp((atlas.grainCycles ?? 6) * 120 / (point.rpm * atlas.cylinders), 0.055, 0.24), frame.seconds / rate * 0.85);
    const sourcePeriod = 120 / (frame.rpm * atlas.cylinders);
    const spareCycles = Math.max(0, Math.floor((frame.seconds - duration * rate - 0.01) / sourcePeriod));
    const skip = Math.floor((sequence * 0.41421356237 % 1) * (spareCycles + 1)) * sourcePeriod;
    const source = ac.createBufferSource(), gain = ac.createGain();
    source.buffer = buffer; source.playbackRate.value = rate;
    source.connect(gain); gain.connect(filter);
    gain.gain.setValueCurveAtTime(atlas.crossfade === 'equal-power' ? EQUAL_POWER_WINDOW : WINDOW, when, duration);
    source.start(when, frame.offset + skip, frame.seconds - skip);
    source.stop(when + duration);
    const grain = { source, gain, frame };
    live.add(grain);
    source.onended = () => { live.delete(grain); source.disconnect(); gain.disconnect(); };
    next = when + duration / 2;
  }
  return {
    set(p, running, level = 1) {
      point = p; active = running;
      rundown = null;
      const t = ac.currentTime;
      out.gain.setTargetAtTime(running ? level * (0.48 + p.load * 0.5 + p.pedal * 0.12) : 0, t, running ? 0.045 : 0.09);
      filter.frequency.setTargetAtTime(Math.min(atlas.cutoff ?? 6500, 1000 + p.load * 2600 + p.pedal * 800), t, 0.06);
      for (const { source, frame } of live) source.playbackRate.setTargetAtTime(clamp(p.rpm / frame.rpm, 0.35, 3.5), t, 0.045);
    },
    update() {
      if (rundown) {
        const remaining = Math.max(0, 1 - (ac.currentTime - rundown.at) / 0.8);
        point = { rpm: rundown.rpm * (0.55 + remaining * 0.45), load: 0, pedal: 0 };
        out.gain.setTargetAtTime(rundown.level * remaining * remaining * 0.48, ac.currentTime, 0.03);
        if (!remaining) { active = false; rundown = null; }
      }
      if (!active) { next = ac.currentTime; return; }
      while (next < ac.currentTime + 0.065) spawn(Math.max(next, ac.currentTime + 0.005));
    },
    windDown(level) { rundown = { at: ac.currentTime, rpm: point.rpm, level }; active = true; },
    stop() {
      active = false;
      for (const { source } of live) { try { source.stop(); } catch (_) {} }
      live.clear(); filter.disconnect(); compressor?.disconnect(); trim?.disconnect(); out.disconnect();
    },
  };
}
