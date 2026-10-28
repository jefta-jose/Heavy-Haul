// Keyboard and touch input. Hold controls (gas, brake) are polled each frame; discrete actions
// (winch hook / unhook, gears, 4x4, DIFF, pause) fire callbacks.
//
// Keys: → / ↑ / D gas, ← / ↓ / A brake, W / Space winch hook on / off, I engine on / off, B handbrake, H / F high, L low, R reverse,
// Q 4x4, E DIFF, V switch vehicle, Esc / P pause.

export function createInput(els, actions) {
  const keys = {}, held = { gas: 0, brake: 0 };

  function bindHold(el, name) {
    let originY = 0, pointer = null;
    const down = e => {
      e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch (_) {}
      originY = e.clientY; pointer = e.pointerId;
      held[name] = e.pointerType === 'pen' && e.pressure > 0 ? e.pressure : 1;
      actions.onAnyInput();
    };
    const up = () => { held[name] = 0; pointer = null; };
    el.addEventListener('pointermove', e => {
      if (e.pointerId !== pointer) return;
      // Ordinary screens do not measure finger force. Drag down to ease off,
      // back up to press harder; pens can provide real pressure.
      held[name] = e.pointerType === 'pen' && e.pressure > 0 ? e.pressure : Math.max(0, Math.min(1, 1 - (e.clientY - originY) / 100));
    });
    el.title = 'Hold for full pedal; drag down to ease off, up to press harder';
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
    el.addEventListener('contextmenu', e => e.preventDefault());
  }
  bindHold(els.gas, 'gas'); bindHold(els.brake, 'brake');
  els.winch.addEventListener('pointerdown', e => { e.preventDefault(); actions.onAnyInput(); actions.winch(); });
  els.winch.addEventListener('contextmenu', e => e.preventDefault());
  els.handbrakeBtn.addEventListener('pointerdown', e => { e.preventDefault(); actions.onAnyInput(); actions.handbrake(); });
  els.handbrakeBtn.addEventListener('contextmenu', e => e.preventDefault());
  els.engineBtn.addEventListener('pointerdown', e => { e.preventDefault(); actions.onAnyInput(); actions.engine(); });
  els.engineBtn.addEventListener('contextmenu', e => e.preventDefault());

  window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (e.code === 'KeyR') actions.gear('R');
    if (e.code === 'KeyL') actions.gear('L');
    if (e.code === 'KeyH' || e.code === 'KeyF') actions.gear('H');
    if (e.code === 'KeyQ') actions.toggle('awd');
    if (e.code === 'KeyE') actions.toggle('diff');
    if (e.code === 'KeyV' && !e.repeat) actions.switchVehicle();
    if ((e.code === 'KeyW' || e.code === 'Space') && !e.repeat) actions.winch();
    if (e.code === 'KeyI' && !e.repeat) actions.engine();
    if (e.code === 'KeyB' && !e.repeat) actions.handbrake();
    if (e.code === 'Escape' || e.code === 'KeyP') actions.pause();
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
    actions.onAnyInput();
  });
  window.addEventListener('keyup', e => { keys[e.code] = false; });

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
      return { gas: Math.max(Number(gas || 0), padGas > 0.02 ? padGas : 0), brake: Math.max(Number(brake || 0), padBrake > 0.02 ? padBrake : 0) };
    },
  };
}
