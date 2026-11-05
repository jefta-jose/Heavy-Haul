// The speed cameras, one in the middle of each highway. As the truck passes one, a fiery card shows how fast it is going at
// that moment for a few seconds, then fades. Nothing is remembered.
import { SPEED_TRAP_CARD_S, SPEED_TRAP_FADE_S } from '../game-config.js';

export function createSpeedTrap({ sim, trail, onCapture }) {
  const xs = (trail.highways ?? []).map(h => (h.x0 + h.x1) / 2), $ = id => document.getElementById(id);
  let passed = new Set(), lastX = null, t = null;

  function show(kmh) {
    $('trapNum').textContent = kmh;
    $('trap').style.opacity = 1; $('trap').hidden = false;
    t = 0;
    onCapture?.(kmh);
  }
  // once a frame while playing
  function update(dt) {
    const main = sim.main, x = main.parts.truck.getPosition().x, driving = sim.active === main && !main.winched;
    if (lastX != null && x - lastX < 5) {   // a jump along the trail is a recovery, not driving past
      for (const at of xs) if (!passed.has(at) && lastX < at && x >= at) { passed.add(at); if (driving) show(Math.round(Math.abs(main.st.speed) * 3.6)); }
    }
    lastX = x;
    if (t == null) return;
    t += dt;
    if (t >= SPEED_TRAP_CARD_S) { $('trap').hidden = true; t = null; return; }
    $('trap').style.opacity = Math.min(1, (SPEED_TRAP_CARD_S - t) / SPEED_TRAP_FADE_S);
  }
  function reset() { passed = new Set(); lastX = null; t = null; const box = $('trap'); if (box) box.hidden = true; }
  return { update, reset, xs };
}
