// Keyboard and touch input. Hold controls (gas, brake) are polled each frame; discrete actions
// (winch hook / unhook, gears, 4x4, DIFF, camera, pause) fire callbacks.
//
// Keys: → / ↑ / D gas, ← / ↓ / A brake, W / Space winch hook on / off, I engine on / off, H / F high, L low, R reverse,
// Q 4x4, E DIFF, V switch vehicle, C camera, Esc / P pause.

export function createInput(els, actions) {
  const keys = {}, held = { gas: false, brake: false };

  function bindHold(el, name) {
    const down = e => { e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch (_) {} held[name] = true; actions.onAnyInput(); };
    const up = () => { held[name] = false; };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
    el.addEventListener('contextmenu', e => e.preventDefault());
  }
  bindHold(els.gas, 'gas'); bindHold(els.brake, 'brake');
  els.winch.addEventListener('pointerdown', e => { e.preventDefault(); actions.onAnyInput(); actions.winch(); });
  els.winch.addEventListener('contextmenu', e => e.preventDefault());
  els.engineBtn.addEventListener('pointerdown', e => { e.preventDefault(); actions.onAnyInput(); actions.engine(); });
  els.engineBtn.addEventListener('contextmenu', e => e.preventDefault());

  window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (e.code === 'KeyR') actions.gear('R');
    if (e.code === 'KeyL') actions.gear('L');
    if (e.code === 'KeyH' || e.code === 'KeyF') actions.gear('H');
    if (e.code === 'KeyQ') actions.toggle('awd');
    if (e.code === 'KeyE') actions.toggle('diff');
    if (e.code === 'KeyC' && !e.repeat) actions.camera();
    if (e.code === 'KeyV' && !e.repeat) actions.switchVehicle();
    if ((e.code === 'KeyW' || e.code === 'Space') && !e.repeat) actions.winch();
    if (e.code === 'KeyI' && !e.repeat) actions.engine();
    if (e.code === 'Escape' || e.code === 'KeyP') actions.pause();
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
    actions.onAnyInput();
  });
  window.addEventListener('keyup', e => { keys[e.code] = false; });

  return {
    read() {
      const gas = held.gas || keys.ArrowRight || keys.ArrowUp || keys.KeyD;
      const brake = held.brake || keys.ArrowLeft || keys.ArrowDown || keys.KeyA;
      return { gas: !!gas, brake: !!brake };
    },
  };
}
