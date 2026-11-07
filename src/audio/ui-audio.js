// Recorded button feedback has its own context: garage and pause menus still make
// sound while vehicle audio is suspended. An empty sound list keeps buttons silent.
import { UI_SOUND_GAINS } from '../game-config.js';

export function createUiAudio({ clips, volumes }) {
  let ac = null, output = null, loaded = false, error = null, played = 0, lastEffect = null, outcome = null;
  const buffers = {};
  const apply = () => {
    if (output) output.gain.setValueAtTime(volumes.muted ? 0 : volumes.master * volumes.effects, ac.currentTime);
  };
  const ready = (async () => {
    try {
      if (!Object.keys(UI_SOUND_GAINS).length) { loaded = true; return; }
      ac = new (window.AudioContext || window.webkitAudioContext)();
      output = ac.createGain(); output.connect(ac.destination); apply();
      await Promise.all(Object.keys(UI_SOUND_GAINS).map(async effect => {
        const uri = clips[effect];
        if (!uri) throw new Error(`Missing interface sound: ${effect}`);
        const response = await fetch(uri);
        if (!response.ok) throw new Error(`Interface sound ${effect}: HTTP ${response.status}`);
        buffers[effect] = await ac.decodeAudioData(await response.arrayBuffer());
      }));
      loaded = true;
    } catch (e) { error = e.message; console.warn('Interface audio unavailable:', e); }
  })();

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && ac) ac.suspend().catch(() => {});
  });
  return {
    ready,
    apply,
    play(effect = 'ui-click') {
      if (!ac || document.hidden || volumes.muted || !UI_SOUND_GAINS[effect]) return;
      const requested = performance.now();
      // Resume inside the tap, including the first Continue tap on mobile.
      const resumed = ac.state === 'suspended' ? ac.resume() : Promise.resolve();
      Promise.all([resumed, ready]).then(() => {
        // A slow initial download must not leave a click queued for much later.
        if (!loaded || document.hidden || volumes.muted || ac.state !== 'running' || performance.now() - requested > 250) return;
        const isOutcome = effect === 'mission-complete' || effect === 'mission-failed';
        // One outcome cue at a time; a delivery that also finishes a mission
        // must not stack two copies of the same four-second sound.
        if (isOutcome && outcome?.effect === effect) return;
        if (isOutcome && outcome) outcome.source.stop();
        apply();
        const source = ac.createBufferSource(), gain = ac.createGain();
        source.buffer = buffers[effect]; gain.gain.value = UI_SOUND_GAINS[effect];
        source.connect(gain); gain.connect(output);
        source.onended = () => { source.disconnect(); gain.disconnect(); if (outcome?.source === source) outcome = null; };
        if (isOutcome) outcome = { source, effect };
        source.start(); played++; lastEffect = effect;
      }).catch(e => { error = e.message; });
    },
    status: () => ({ loaded, played, lastEffect, error, state: ac?.state ?? 'unavailable' }),
  };
}

// Capture before a handler replaces a garage row or changes screens. Normal
// buttons use click so scrolling past them stays quiet. Pointer-only controls
// and the loader respond on press, with their following click suppressed.
export function bindUiFeedback({ audio, haptics }) {
  const pointers = new WeakSet();
  function target(event) {
    const el = event.target.closest?.('button, [role="button"], #loader.done');
    if (!el || el.matches('#gas, #brake, :disabled, [aria-disabled="true"]') || el.closest('[hidden], [inert], #loader.out')) return null;
    return el;
  }
  function feedback(el) {
    // Purchases report success from the garage's onBuy callback. An unaffordable
    // purchase must not sound like a successful buy or a Drive confirmation.
    if (el.matches('#startBtn.buy, .tbuy')) return;
    audio.play(el.matches('#loader, #startBtn, .btn.primary') ? 'ui-confirm' : 'ui-click');
    // These controls already have a stronger, action-specific vibration.
    if (!el.matches('#awdBtn, #diffBtn, #winch, #powerBtn')) haptics.tick();
  }
  document.addEventListener('pointerdown', event => {
    if (event.button !== 0 || event.isPrimary === false) return;
    const el = target(event);
    if (el?.matches('#winch, #powerBtn, #loader')) { pointers.add(el); feedback(el); }
  }, { capture: true });
  document.addEventListener('click', event => {
    const el = target(event);
    if (!el) return;
    const pressed = pointers.delete(el);
    if (event.detail > 0 && pressed) return;
    feedback(el);
  }, { capture: true });
}
