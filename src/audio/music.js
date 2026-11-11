// Background music: one looping track at a time, garage or road. It has its own audio context, so it keeps playing
// while the engines and effects are suspended in the garage. Media elements stream compressed tracks
// without retaining a whole decoded song in Web Audio.
//
// A media element's own loop is not gapless: an MP3 carries encoder padding and the seek back to the start
// stalls for a moment, which was heard as a hang every time the track came round. So each track has two
// elements and swaps between them at its loop point (MUSIC_TRACKS.loopSeconds, a whole number of beats):
// the next one starts from the top as the current one reaches the loop point, with a short crossfade over the
// seam. `loop` stays on as a fallback, so a swap that cannot happen still loops the old way.
import { MUSIC_TRACKS, MUSIC_FADE_S, MUSIC_SEAM_S } from '../game-config.js';

// the swap starts this far ahead of the loop point: polled every 20 ms, it lands within a beat-imperceptible
// 40 ms of the seam and before the file runs out, whose tail past the loop point is only a few ms of padding
const SEAM_LEAD_S = 0.04;

export function createMusic(uris = {}, volumes) {
  let ac = null, out = null, wanted = null, now = null, watch = 0;

  const tracks = new Set();
  function voice(track) {
    const audio = new Audio(track.uri); audio.loop = true; audio.preload = 'auto';
    const source = ac.createMediaElementSource(audio), gain = ac.createGain();
    gain.gain.value = 1; source.connect(gain); gain.connect(track.gain);
    return { audio, source, gain };
  }
  function dispose(track) {
    tracks.delete(track);
    for (const v of track.voices) {
      v.audio.pause();
      v.audio.removeAttribute('src'); v.audio.load();
      v.source.disconnect(); v.gain.disconnect();
    }
    track.gain.disconnect();
  }
  function fadeOut(track) {
    if (!track) return;
    track.gain.gain.setTargetAtTime(0, ac.currentTime, MUSIC_FADE_S / 3);
    setTimeout(() => dispose(track), MUSIC_FADE_S * 2000);
  }
  function playMedia(audio, name) {
    if (document.hidden) return;
    audio.play().catch(error => {
      // A later user gesture retries autoplay restrictions; other failures stay visible.
      if (error.name !== 'NotAllowedError' && error.name !== 'AbortError') console.warn(`Music ${name} could not load:`, error);
    });
  }
  // the playing element reaching the loop point hands over to the other one, started from the top
  function seam() {
    const track = now;
    if (!track || document.hidden) return;
    const cur = track.voices[track.front], end = Math.min(track.loopEnd, cur.audio.duration || Infinity) - SEAM_LEAD_S;
    if (cur.audio.paused || !(cur.audio.currentTime >= end)) return;
    if (track.voices.length < 2) track.voices.push(voice(track));
    track.front = 1 - track.front;
    const next = track.voices[track.front], t = ac.currentTime;
    try { next.audio.currentTime = Math.max(0, cur.audio.currentTime - track.loopEnd); } catch (e) {}
    next.gain.gain.cancelScheduledValues?.(t); next.gain.gain.setValueAtTime?.(0, t); next.gain.gain.linearRampToValueAtTime?.(1, t + MUSIC_SEAM_S);
    cur.gain.gain.cancelScheduledValues?.(t); cur.gain.gain.setValueAtTime?.(1, t); cur.gain.gain.linearRampToValueAtTime?.(0, t + MUSIC_SEAM_S);
    playMedia(next.audio, track.name);
    setTimeout(() => { if (track.voices[track.front] !== cur) { cur.audio.pause(); try { cur.audio.currentTime = 0; } catch (e) {} } }, MUSIC_SEAM_S * 1000 + 100);
  }
  function start(name) {
    fadeOut(now); now = null;
    const spec = MUSIC_TRACKS[name];
    if (!name || !uris[name] || !spec) return;
    const gain = ac.createGain();
    gain.gain.value = 0; gain.gain.setTargetAtTime(spec.gain, ac.currentTime, MUSIC_FADE_S / 3);
    gain.connect(out);
    now = { name, uri: uris[name], gain, voices: [], front: 0, loopEnd: spec.loopSeconds ?? Infinity };
    now.voices.push(voice(now));
    tracks.add(now); playMedia(now.voices[0].audio, name);
    // the second element is made ahead of the seam, so it has the file buffered when it is needed
    if (!watch && typeof setInterval === 'function') watch = setInterval(() => {
      if (now && now.voices.length < 2 && now.voices[0].audio.currentTime > now.loopEnd - 10) now.voices.push(voice(now));
      seam();
    }, 20);
    watch?.unref?.();   // never keeps a test process alive
  }
  const front = track => track.voices[track.front];
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
      if (now && front(now).audio.paused) playMedia(front(now).audio, now.name);
    },
    get status() { return { wanted, playing: now?.name ?? null, state: ac?.state ?? 'waiting for a tap' }; },
  };
  document.addEventListener('visibilitychange', () => {
    if (!ac) return;
    if (document.hidden) { for (const track of tracks) for (const v of track.voices) v.audio.pause(); ac.suspend(); }
    else { ac.resume(); if (now) playMedia(front(now).audio, now.name); }
  });
  for (const type of ['pointerdown', 'keydown']) document.addEventListener(type, api.unlock, { capture: true });
  return api;
}
