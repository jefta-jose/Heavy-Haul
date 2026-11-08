// The winch guide: while you drive a breakdown truck with nothing hooked, glowing chevrons on the road lead from its
// winch to the spot where the winch can reach the nearest vehicle (WINCH_REACH short of its tow point). Chevrons sit on
// a fixed grid in the world, so the ones the truck drives past simply drop away behind it. Inside reach they turn green.
// Plain HTML over the canvas, placed each frame with the camera; the pulse is a CSS animation.
import { GUIDE_SPACING_M, GUIDE_SIZE_M } from '../game-config.js';

export function createWinchGuide({ box, sim, view }) {
  const pool = [];
  let shown = 0;
  function chevron(i) {
    if (!pool[i]) { const e = document.createElement('i'); box.append(e); pool[i] = e; }
    return pool[i];
  }
  function hide() { for (let i = 0; i < shown; i++) pool[i].hidden = true; shown = 0; box.hidden = true; box.classList.remove('near'); }

  function update(playing) {
    const v = sim.active;
    const hook = playing && v.role === 'service' && sim.canWinch(v) && !v.cable ? sim.nearestHook(v) : null;
    if (!hook) { hide(); return; }
    const reach = sim.winchReach, near = hook.d <= reach, dir = Math.sign(hook.to.x - hook.from.x) || 1;
    // out of reach: from the winch up to the reach line; in reach: the last stretch to the vehicle
    const from = hook.from.x, to = near ? hook.to.x - dir * 0.6 : hook.to.x - dir * reach;
    const [left, right] = view.viewX(), lo = Math.max(Math.min(from, to), left), hi = Math.min(Math.max(from, to), right);
    const { W, H, ppm, cam } = view, size = GUIDE_SIZE_M * ppm;
    box.hidden = false; box.classList.toggle('near', near);
    box.style.setProperty('--chev', `${size.toFixed(1)}px`);
    let n = 0;
    // a world grid, so chevrons stay put on the road; the first one starts clear of the winch
    for (let k = Math.ceil(lo / GUIDE_SPACING_M); k * GUIDE_SPACING_M <= hi && n < 80; k++) {
      const x = k * GUIDE_SPACING_M;
      if ((x - from) * dir < 0.8) continue;
      const y = sim.visH(x) + GUIDE_SIZE_M * 0.3, slope = Math.atan((sim.visH(x + 0.5) - sim.visH(x - 0.5)));
      const e = chevron(n++);
      e.hidden = false;
      e.style.transform = `translate(${(W / 2 + (x - cam.x) * ppm).toFixed(1)}px, ${(H / 2 - (y - cam.y) * ppm).toFixed(1)}px) rotate(${(-slope).toFixed(3)}rad) scaleX(${dir})`;
      e.style.animationDelay = `${((((k * dir) % 6) + 6) % 6 * 0.12 - 0.72).toFixed(2)}s`;   // the pulse runs toward the target
    }
    for (let i = n; i < shown; i++) pool[i].hidden = true;
    shown = n;
  }
  return { update, hide };
}
