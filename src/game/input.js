// Keyboard and touch input. Hold controls (gas, brake) are polled each frame; discrete actions
// (winch hook / unhook, gears, AWD, DIFF, pause) fire callbacks.
//
// Keys: → / ↑ / D gas, ← / ↓ / A brake, W / Space winch hook on / off, S shield, H / F high, L low, R reverse,
// Q AWD, E DIFF, V switch vehicle, Esc / P pause.

export function createInput(els, actions) {
  const keys = {}, held = { gas: 0, brake: 0 };
  // with both pedals down, the one pressed last is in charge; the other counts again once the last one is let go
  let wasGas = false, wasBrake = false, last = null;

  function bindHold(el, name) {
    // every finger (or mouse, or pen) on the pedal counts: the pedal is the deepest of them, and lifting one finger
    // leaves it held by the others (with one id kept, lifting either of two fingers let go of the gas)
    const pointers = new Map();   // pointerId -> { originY, value }
    const apply = () => { let v = 0; for (const p of pointers.values()) v = Math.max(v, p.value); held[name] = v; };
    const down = e => {
      e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch (_) {}
      pointers.set(e.pointerId, { originY: e.clientY, value: e.pointerType === 'pen' && e.pressure > 0 ? e.pressure : 1 });
      apply(); actions.onAnyInput();
    };
    const up = e => { if (pointers.delete(e.pointerId)) apply(); };
    el.addEventListener('pointermove', e => {
      const p = pointers.get(e.pointerId); if (!p) return;
      // A finger is full pedal while it is down, wherever the thumb drifts (as in Hill Climb Racing):
      // easing off by sliding made thumbs lose power without noticing. A mouse can drag down to ease
      // off; pens give real pressure.
      if (e.pointerType === 'pen' && e.pressure > 0) p.value = e.pressure;
      else if (e.pointerType === 'mouse') p.value = Math.max(0, Math.min(1, 1 - (e.clientY - p.originY) / 100));
      apply();
    });
    el.title = 'Hold for full pedal';
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
    el.addEventListener('contextmenu', e => e.preventDefault());
    return () => { pointers.clear(); apply(); };
  }
  const releases = [bindHold(els.gas, 'gas'), bindHold(els.brake, 'brake')];
  els.winch.addEventListener('pointerdown', e => { e.preventDefault(); actions.onAnyInput(); actions.winch(); });
  els.winch.addEventListener('contextmenu', e => e.preventDefault());

  els.powerBtn.addEventListener('pointerdown', e => { e.preventDefault(); actions.onAnyInput(); actions.usePower(); });
  els.powerBtn.addEventListener('contextmenu', e => e.preventDefault());

  window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (e.code === 'KeyS' && !e.repeat) actions.usePower();
    if (e.code === 'KeyQ' && !e.repeat) actions.toggle('awd');
    if (e.code === 'KeyE' && !e.repeat) actions.toggle('diff');
    if (e.code === 'KeyV' && !e.repeat) actions.switchVehicle();
    if ((e.code === 'KeyW' || e.code === 'Space') && !e.repeat) actions.winch();
    if (e.code === 'Escape' || e.code === 'KeyP') actions.pause();
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
    actions.onAnyInput();
  });
  window.addEventListener('keyup', e => { keys[e.code] = false; });
  // switching away (another app, a call, alt-tab) can swallow the pointerup or keyup: nothing stays held when it comes back
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; releases.forEach(r => r()); });

  return {
    read() {
      const gas = held.gas || keys.ArrowRight || keys.ArrowUp || keys.KeyD;
      const brake = held.brake || keys.ArrowLeft || keys.ArrowDown || keys.KeyA;
      const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
      let padGas = 0, padBrake = 0;
      for (const pad of pads) if (pad?.mapping === 'standard') {
        padGas = Math.max(padGas, pad.buttons[7]?.value ?? 0);
        padBrake = Math.max(padBrake, pad.buttons[6]?.value ?? 0);
      }
      if (padGas > 0.02 || padBrake > 0.02) actions.onAnyInput();
      const g = Math.max(Number(gas || 0), padGas > 0.02 ? padGas : 0), b = Math.max(Number(brake || 0), padBrake > 0.02 ? padBrake : 0);
      if (g > 0 && !wasGas) last = 'gas';
      if (b > 0 && !wasBrake) last = 'brake';
      wasGas = g > 0; wasBrake = b > 0;
      if (g > 0 && b > 0) return last === 'brake' ? { gas: 0, brake: b } : { gas: g, brake: 0 };
      return { gas: g, brake: b };
    },
  };
}
