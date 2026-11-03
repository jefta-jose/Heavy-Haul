// A truck's engine voice, from its class's recordings (assets/audio/sounds.json).
//
// Each class has recorded layers at their measured revs: idle, part-throttle `on` anchors, hard-working
// `pull` anchors and a coast layer, all played through the seamless loop player and pitched in tune to
// the revs. They blend by revs and by how hard the engine is working.
//
// The physics rpm sits at idle + 600 at nearly any speed in H (the drive is a torque model with no gear
// changes), so a voice that followed it would hold one note. stepRevs below is a sound-only rev model:
// revs flare from the converter stall, climb with road speed through the class's gears, drop on a shift,
// and race when the wheels spin. It never feeds back into the physics.

import { createLoopPlayer } from './loop-player.js';

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, Number.isFinite(x) ? x : lo));
const ease = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// The engine pack for a car: tools/lib/content.js resolves car.audio.engine to a class in the bank.
export function engineProfile(car, bank) {
  const a = car.audio ?? {}, pack = bank?.engines?.[a.engine] ?? null;
  return {
    engine: a.engine ?? null, pack,
    crankS: clamp(a.crankS ?? pack?.crankS ?? 1.2, 0.5, 3),
    airBrakes: a.airBrakes ?? pack?.airBrakes ?? false,
    backupAlarm: a.backupAlarm ?? (a.engine !== 'scout'),
  };
}

// How hard the engine is working, 0..1: the wheel joints' reaction torque against what it can deliver.
export function engineTelemetry(vehicle) {
  const { st, car, ctl, parts } = vehicle;
  const ratio = Math.abs(car.drivetrain.gears[ctl.gear] ?? car.drivetrain.gears.H);
  const engineTorque = st.power * 1000 / Math.max(1, st.rpm * Math.PI * 2 / 60);
  const available = engineTorque * ratio * car.drivetrain.efficiency;
  // Joint impulses come from the fixed 120 Hz physics step, not the render dt.
  const reaction = parts.joints.reduce((sum, joint) => sum + Math.abs(joint.getMotorTorque(120)), 0);
  return { load: st.throttle > 0.01 && available > 1 ? clamp(reaction / available, 0, 1) : 0, gear: ctl.gear };
}

// A released pedal is always off-load, whatever the wheels are doing to the revs.
export const engineLoad = (pedal, demand = pedal) => clamp(pedal, 0, 1) * (0.35 + clamp(demand, 0, 1) * 0.65);

// km/h at the governor in a fixed ratio (L and R have one gear; H shifts through the class's gears)
const gearTopKmh = (car, gear) => {
  const dc = car.drivetrain, ratio = Math.abs(dc.gears?.[gear] ?? 15);
  return (dc.governedRpm ?? 2300) * 2 * Math.PI / 60 / ratio * (car.rig?.radius ?? 0.8) * 3.6;
};

export const newRevs = () => ({ revs: 0, gear: 0, shiftT: 0, holdT: 0, kmhAvg: 0, gears: 0, boost: 0, shifted: false, chuff: false });

// One step of the sound's revs. revs is 0 at idle and 1 at the governor. i = { pedal, load, kmh, slip, tops },
// tops = the top speed of each gear in km/h. Sets s.shifted / s.chuff for one step when they happen.
export function stepRevs(s, pack, { pedal = 0, load = 0, kmh = 0, slip = 0, tops = pack.gears }, dt) {
  s.shifted = s.chuff = false;
  const wheel = g => Math.abs(kmh) / tops[g];
  // a light pedal shifts early; full pedal holds the gear near the top
  const upAt = 0.62 + 0.33 * pedal;
  // a gear is chosen from smoothed speed, so a bump can't flip it, and then held for holdS
  s.kmhAvg += (Math.abs(kmh) - s.kmhAvg) * Math.min(1, dt / 0.5);
  s.holdT = Math.max(0, s.holdT - dt);
  const chosen = g => s.kmhAvg / tops[g];
  if (s.gears !== tops.length) {
    // the gear lever moved between H and L or R: land in the gear that fits, without a sound-gear shift
    s.gears = tops.length; s.gear = 0;
    while (s.gear < tops.length - 1 && wheel(s.gear) > upAt) s.gear++;
  } else if (s.kmhAvg < 3) {
    s.gear = 0;   // stopped: back in first, ready to pull away, however hard it braked
  } else if (s.shiftT <= 0 && s.holdT <= 0) {
    if (pedal > 0.05 && s.gear < tops.length - 1 && chosen(s.gear) > upAt) { s.gear++; s.shiftT = pack.shiftS; s.holdT = pack.holdS; s.shifted = true; }
    else if (s.gear > 0 && chosen(s.gear - 1) < 0.45) { s.gear--; s.shiftT = pack.shiftS * 0.6; s.holdT = pack.holdS; s.shifted = true; }
  }
  const shifting = s.shiftT > 0;
  s.shiftT = Math.max(0, s.shiftT - dt);
  // the converter holds it at the stall until the road speed takes over; spinning wheels let it race
  const race = (1 - pack.stall) * ease(1, 5, slip);
  const free = pedal > 0.02 && !shifting ? pack.stall * pedal ** 0.7 + race * pedal : 0;
  const target = clamp(Math.max(wheel(s.gear), free), 0, 1.04);
  const up = pack.revUp * (0.35 + 0.65 * pedal), down = pack.revDown * (shifting ? 3 : 1);
  s.revs = clamp(s.revs + clamp((target - s.revs) * 7, -down, up) * dt, 0, 1.05);
  // turbo boost lags the load, and lifting off from full boost lets it chuff
  const wanted = shifting ? 0 : load * (0.25 + 0.75 * s.revs), before = s.boost;
  s.boost += (wanted - s.boost) * Math.min(1, dt / (wanted > s.boost ? 0.9 : 0.3));
  if (before > 0.45 && wanted < 0.15 && !s.lifted) { s.chuff = true; s.lifted = true; }
  if (wanted > 0.3) s.lifted = false;
  return s;
}

// equal-power weights across the anchors nearest to the revs (log rpm, so anchors spread evenly)
function anchorWeights(list, rpm) {
  const w = list.map(() => 0);
  if (!list.length) return w;
  if (rpm <= list[0].rpm) { w[0] = 1; return w; }
  for (let i = 0; i < list.length - 1; i++) {
    if (rpm > list[i + 1].rpm) continue;
    const t = Math.log(rpm / list[i].rpm) / Math.log(list[i + 1].rpm / list[i].rpm);
    w[i] = Math.cos(t * Math.PI / 2); w[i + 1] = Math.sin(t * Math.PI / 2);
    return w;
  }
  w[list.length - 1] = 1;
  return w;
}

// revs 0..1, load 0..1 -> every layer's gain and playback rate, the filter and the level
export function engineMix(pack, revs, load, boost = 0) {
  revs = clamp(revs, 0, 1.05); load = clamp(load, 0, 1);
  const rpm = pack.idleRpm + revs * (pack.governedRpm - pack.idleRpm);
  const rate = layer => clamp(rpm / layer.rpm, 0.62, 1.55);
  const loaded = ease(0.03, 0.3, load), hard = pack.pull?.length ? ease(0.5, 0.85, load) : 0;
  const onShare = Math.sin(loaded * Math.PI / 2), offShare = Math.cos(loaded * Math.PI / 2);
  const coasting = Math.sin(ease(0.02, 0.24, revs) * Math.PI / 2);
  const on = anchorWeights(pack.on, rpm).map(w => w * onShare * Math.cos(hard * Math.PI / 2));
  const pull = anchorWeights(pack.pull ?? [], rpm).map(w => w * onShare * Math.sin(hard * Math.PI / 2));
  return {
    rpm, on, pull,
    idle: offShare * Math.cos(coasting * Math.PI / 2) * 0.9,
    coast: offShare * Math.sin(coasting * Math.PI / 2) * 0.72,
    sub: pack.sub ? 0.55 + load * 0.45 : 0,
    turbo: (pack.turbo ?? 0) * clamp(boost, 0, 1) ** 1.4,
    rates: { idle: rate(pack.idle), coast: rate(pack.coast), on: pack.on.map(rate), pull: (pack.pull ?? []).map(rate), sub: pack.sub ? rate(pack.sub) : 1 },
    turboRate: 0.8 + 0.65 * clamp(revs, 0, 1),
    cutoff: pack.cutoff * (0.42 + 0.4 * load + 0.18 * clamp(revs, 0, 1)),
    level: 0.78 + load * 0.42,
  };
}

export function createEngineVoice(ac, buffers, car, bank, destination) {
  const profile = engineProfile(car, bank), pack = profile.pack, out = ac.createGain(), filter = ac.createBiquadFilter();
  out.gain.value = 0; filter.type = 'lowpass'; filter.Q.value = 0.5;
  filter.connect(out); out.connect(destination);
  const silent = { car, profile, out, revs: newRevs(), onEvent: null, setLevel() {}, set() {}, update() {}, stop() { filter.disconnect(); out.disconnect(); } };
  if (!pack || !pack.on?.every(l => buffers[l.clip]) || !buffers[pack.idle?.clip]) return silent;
  const player = (layer, opts) => createLoopPlayer(ac, buffers[layer.clip], filter, { grain: [2.5, 5], fade: 0.5, ...opts });
  const idle = player(pack.idle, { grain: [3, 6], fade: 0.8 }), coast = player(pack.coast);
  const on = pack.on.map(l => player(l)), pull = (pack.pull ?? []).map(l => player(l));
  const sub = pack.sub ? player(pack.sub, { grain: [4, 8], fade: 1.2 }) : null;
  // the turbo's hiss skips the engine filter, which would close it off at part throttle
  const turbo = pack.turbo && buffers.turbo ? createLoopPlayer(ac, buffers.turbo, out, { grain: [1.5, 3], fade: 0.5 }) : null;
  const layers = [idle, coast, ...on, ...pull, ...(sub ? [sub] : []), ...(turbo ? [turbo] : [])];
  let state = null, oneShot = null, level = 1, muffle = 1, last = ac.currentTime;
  const revs = newRevs();
  function play(name) {
    if (!buffers[name]) return;
    if (oneShot) { const o = oneShot; o.g.gain.setTargetAtTime(0, ac.currentTime, 0.05); o.s.stop(ac.currentTime + 0.3); }
    const s = ac.createBufferSource(), g = ac.createGain();
    s.buffer = buffers[name]; s.connect(g); g.connect(out);
    s.onended = () => { s.disconnect(); g.disconnect(); if (oneShot?.s === s) oneShot = null; };
    s.start(); oneShot = { s, g };
  }
  const voice = {
    car, profile, out, revs, onEvent: null,
    // st: the physics state; t: { load, gear } from engineTelemetry
    set(st, t = {}) {
      const now = ac.currentTime, dt = clamp(now - last, 0, 0.1); last = now;
      if (st.engine !== state) {
        if (st.engine === 'cranking') { play(pack.start); for (const l of layers) l.setGain(0, 0.05); }
        else if (st.engine === 'on') { revs.revs = 0.16; revs.gear = 0; revs.shiftT = 0; }   // it catches and flares
        else if (st.engine === 'off' && state === 'on') {
          if (buffers[pack.stop]) { play(pack.stop); for (const l of layers) l.setGain(0, 0.12); }
          else for (const l of layers) l.windDown(1.4);
        }
        state = st.engine;
      }
      if (st.engine !== 'on') { out.gain.setTargetAtTime(level, now, 0.08); return; }
      const pedal = clamp(st.throttle, 0, 1), gear = t.gear ?? 'H';
      // a shift eases the load off, so the note dips before it comes back in the next gear
      const load = revs.shiftT > 0 ? pedal * 0.12 : engineLoad(pedal, t.load);
      stepRevs(revs, pack, { pedal, load, kmh: (st.speed ?? 0) * 3.6, slip: st.slip ?? 0, tops: gear === 'H' ? pack.gears : [gearTopKmh(car, gear)] }, dt);
      if (revs.shifted) voice.onEvent?.('shift');
      if (revs.chuff && pack.turbo) voice.onEvent?.('chuff', revs.boost);
      const m = engineMix(pack, revs.revs, load, revs.boost);
      // just started: the recorded catch is still ringing out, so the idle comes in gently
      const tau = oneShot ? 0.35 : 0.07;
      idle.setGain(m.idle, tau); idle.setRate(m.rates.idle);
      coast.setGain(m.coast, tau); coast.setRate(m.rates.coast);
      on.forEach((l, i) => { l.setGain(m.on[i], tau); l.setRate(m.rates.on[i]); });
      pull.forEach((l, i) => { l.setGain(m.pull[i], tau); l.setRate(m.rates.pull[i]); });
      sub?.setGain(m.sub, 0.25); sub?.setRate(m.rates.sub);
      turbo?.setGain(m.turbo, 0.12); turbo?.setRate(m.turboRate, 0.2);
      filter.frequency.setTargetAtTime(m.cutoff * muffle, now, 0.1);
      out.gain.setTargetAtTime(m.level * level, now, 0.08);
    },
    // volume for pause and distance; muffle 0..1 closes the filter on a truck far away
    setLevel(v, m = 1) { level = v; muffle = m; if (state !== 'on') out.gain.setTargetAtTime(v, ac.currentTime, 0.1); },
    update() { if (state === 'on' || state === 'off') for (const l of layers) l.update(); },
    stop() {
      for (const l of layers) l.stop();
      if (oneShot) try { oneShot.s.stop(); } catch (e) {}
      filter.disconnect(); out.disconnect();
    },
  };
  return voice;
}
