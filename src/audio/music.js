// Background music: one looping track at a time, garage or road. It has its own audio context, so it keeps playing
// while the engines and effects are suspended in the garage. A track is decoded when first asked for and dropped
// when the other takes over, because two minutes of decoded sound is large. Each file is a whole number of beats
// long, so it loops on the beat (MUSIC_TRACKS in game-config.js).
import { MUSIC_TRACKS, MUSIC_FADE_S } from '../game-config.js';

export function createMusic(uris = {}, volumes) {
  let ac = null, out = null, wanted = null, now = null, ticket = 0;

  async function decode(uri) {
    const raw = uri.startsWith('data:') ? Uint8Array.from(atob(uri.split(',')[1]), c => c.charCodeAt(0)).buffer : await (await fetch(uri)).arrayBuffer();
    return ac.decodeAudioData(raw);
  }
  function fadeOut(track) {
    if (!track) return;
    track.gain.gain.setTargetAtTime(0, ac.currentTime, MUSIC_FADE_S / 3);
    track.source.stop(ac.currentTime + MUSIC_FADE_S * 2);
  }
  async function start(name) {
    const mine = ++ticket, spec = MUSIC_TRACKS[name];
    fadeOut(now); now = null;
    if (!name || !uris[name] || !spec) return;
    let buffer;
    try { buffer = await decode(uris[name]); } catch (e) { console.warn(`Music ${name} could not load:`, e); return; }
    if (mine !== ticket) return;   // asked for something else while this one decoded
    const source = ac.createBufferSource(), gain = ac.createGain();
    source.buffer = buffer; source.loop = true; source.loopStart = 0; source.loopEnd = Math.min(buffer.duration, spec.loopSeconds);
    gain.gain.value = 0; gain.gain.setTargetAtTime(spec.gain, ac.currentTime, MUSIC_FADE_S / 3);
    source.connect(gain); gain.connect(out); source.start();
    now = { name, source, gain };
  }
  const api = {
    apply() { if (ac) out.gain.setTargetAtTime(volumes.muted ? 0 : volumes.master * (volumes.music ?? 0.5), ac.currentTime, 0.05); },
    // the track to play; waits for the first tap, because browsers keep sound off until then
    play(name) { if (name === wanted) return; wanted = name; if (ac) start(name); },
    unlock() {
      if (!ac) {
        try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
        out = ac.createGain(); out.connect(ac.destination); api.apply();
        if (wanted) start(wanted);
      }
      if (ac.state === 'suspended' && !document.hidden) ac.resume();
    },
    get status() { return { wanted, playing: now?.name ?? null, state: ac?.state ?? 'waiting for a tap' }; },
  };
  document.addEventListener('visibilitychange', () => { if (!ac) return; if (document.hidden) ac.suspend(); else ac.resume(); });
  for (const type of ['pointerdown', 'keydown']) document.addEventListener(type, api.unlock, { capture: true });
  return api;
}
