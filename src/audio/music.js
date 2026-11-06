// Background music: one looping track at a time, garage or road. It has its own audio context, so it keeps playing
// while the engines and effects are suspended in the garage. Media elements stream compressed tracks
// without retaining a whole decoded song in Web Audio. Each file is a whole number of beats
// long, so it loops on the beat (MUSIC_TRACKS in game-config.js).
import { MUSIC_TRACKS, MUSIC_FADE_S } from '../game-config.js';

export function createMusic(uris = {}, volumes) {
  let ac = null, out = null, wanted = null, now = null;

  const tracks = new Set();
  function dispose(track) {
    tracks.delete(track);
    track.audio.pause();
    track.audio.removeAttribute('src'); track.audio.load();
    track.source.disconnect(); track.gain.disconnect();
  }
  function fadeOut(track) {
    if (!track) return;
    track.gain.gain.setTargetAtTime(0, ac.currentTime, MUSIC_FADE_S / 3);
    setTimeout(() => dispose(track), MUSIC_FADE_S * 2000);
  }
  function playMedia(track) {
    if (document.hidden) return;
    track.audio.play().catch(error => {
      // A later user gesture retries autoplay restrictions; other failures stay visible.
      if (error.name !== 'NotAllowedError' && error.name !== 'AbortError') console.warn(`Music ${track.name} could not load:`, error);
    });
  }
  function start(name) {
    fadeOut(now); now = null;
    const spec = MUSIC_TRACKS[name];
    if (!name || !uris[name] || !spec) return;
    const audio = new Audio(uris[name]); audio.loop = true; audio.preload = 'auto';
    const source = ac.createMediaElementSource(audio), gain = ac.createGain();
    gain.gain.value = 0; gain.gain.setTargetAtTime(spec.gain, ac.currentTime, MUSIC_FADE_S / 3);
    source.connect(gain); gain.connect(out);
    now = { name, audio, source, gain }; tracks.add(now); playMedia(now);
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
      if (now?.audio.paused) playMedia(now);
    },
    get status() { return { wanted, playing: now?.name ?? null, state: ac?.state ?? 'waiting for a tap' }; },
  };
  document.addEventListener('visibilitychange', () => { if (!ac) return; if (document.hidden) { for (const track of tracks) track.audio.pause(); ac.suspend(); } else { ac.resume(); if (now) playMedia(now); } });
  for (const type of ['pointerdown', 'keydown']) document.addEventListener(type, api.unlock, { capture: true });
  return api;
}
