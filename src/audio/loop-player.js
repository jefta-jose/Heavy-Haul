// Plays a long recording as an endless, seamless bed: overlapping grains of a few seconds, each taken
// from a random place in the recording and crossfaded (equal power) into the next, so there is no
// loop point to hear and no pattern repeating at a fixed period. Used for engines, tires, water,
// mud and ambience. Call update() every frame; it schedules the next grain a little ahead.

const CURVE_N = 64;
const FADE_IN = Float32Array.from({ length: CURVE_N }, (_, i) => Math.sin(i / (CURVE_N - 1) * Math.PI / 2));
const FADE_OUT = Float32Array.from({ length: CURVE_N }, (_, i) => Math.cos(i / (CURVE_N - 1) * Math.PI / 2));

export function createLoopPlayer(ac, buffer, destination, { grain = [3, 7], fade = 1.0, rate = 1 } = {}) {
  const out = ac.createGain(); out.gain.value = 0; out.connect(destination);
  const live = new Set();
  let next = 0, rateNow = rate, lastOffset = -10, running = false, stopped = false;

  function spawn(when) {
    const dur = buffer.duration, maxRate = Math.max(1, rateNow) * 1.25;
    // a grain never runs off the end of the buffer, even if the rate rises while it plays
    const len = Math.min(grain[0] + Math.random() * (grain[1] - grain[0]), Math.max(fade * 1.2, dur / maxRate - fade - 0.3));
    const span = Math.max(0.01, dur - (len + fade) * maxRate - 0.2);
    let offset = 0.1 + Math.random() * span;
    for (let i = 0; i < 4 && Math.abs(offset - lastOffset) < Math.min(2, span / 3); i++) offset = 0.1 + Math.random() * span;
    lastOffset = offset;
    const src = ac.createBufferSource(), g = ac.createGain();
    src.buffer = buffer; src.playbackRate.value = rateNow; g.gain.value = 0;
    src.connect(g); g.connect(out);
    g.gain.setValueCurveAtTime(FADE_IN, when, fade);
    g.gain.setValueCurveAtTime(FADE_OUT, when + len, fade);
    src.start(when, offset); src.stop(when + len + fade + 0.05);
    const item = { src, g };
    live.add(item);
    src.onended = () => { live.delete(item); src.disconnect(); g.disconnect(); };
    next = when + len;   // the next grain fades in while this one fades out
  }

  return {
    out,
    update() {
      if (stopped) return;
      const now = ac.currentTime;
      if (!running) { running = true; spawn(now + 0.02); }
      while (next < now + 0.25) spawn(Math.max(next, now + 0.02));
    },
    setGain(g, tau = 0.1) { out.gain.setTargetAtTime(g, ac.currentTime, tau); },
    setRate(r, tau = 0.12) {
      rateNow = r;
      for (const { src } of live) src.playbackRate.setTargetAtTime(r, ac.currentTime, tau);
    },
    // glide the pitch down while fading out (an engine running down)
    windDown(seconds) {
      const t = ac.currentTime;
      for (const { src } of live) { src.playbackRate.cancelScheduledValues(t); src.playbackRate.setValueAtTime(src.playbackRate.value, t); src.playbackRate.linearRampToValueAtTime(rateNow * 0.55, t + seconds); }
      out.gain.setTargetAtTime(0, t, seconds / 3);
    },
    stop() {
      stopped = true;
      for (const { src } of live) { try { src.stop(); } catch (e) {} }
      live.clear(); out.disconnect();
    },
  };
}
