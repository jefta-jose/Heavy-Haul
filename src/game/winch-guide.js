// Lead the rear winch to the nearest edge of the target's forward recovery bay.
// The renderer paints the bay like a fuel-station road tint, in purple (props.js recoveryBay); arrows stop at its boundary and disappear once inside.
import { GUIDE_SPACING_M, GUIDE_SIZE_M } from '../game-config.js';

export function createWinchGuide({ box, sim, view }) {
  const pool = [];
  const arrows = document.createElement('div');
  arrows.className = 'guide-arrows';
  box.append(arrows);
  let shown = 0;
  function chevron(i) {
    if (!pool[i]) { const e = document.createElement('i'); arrows.append(e); pool[i] = e; }
    return pool[i];
  }
  function hide() { for (let i = 0; i < shown; i++) pool[i].hidden = true; shown = 0; box.hidden = true; box.classList.remove('near'); }

  function update(playing) {
    const v = sim.active;
    const hook = playing && v?.role === 'service' && sim.canWinch(v) && !v.cable ? sim.nearestHook(v) : null;
    if (!hook) { hide(); return; }
    const near = hook.inRange, { start, end } = hook.bay;
    const dir = hook.from.x < start ? 1 : -1;
    const to = dir > 0 ? start : end;
    // Navigation starts outside the truck in the direction of travel. The rear winch
    // must not make forward arrows run under the body. Bay entry checks the whole truck.
    const { rig } = v.car;
    const front = v.parts.truck.getWorldPoint(sim.V(rig.nose, 0)).x;
    const rear = v.parts.truck.getWorldPoint(sim.V(rig.towRear ?? Math.min(...rig.axles) - rig.radius, 0)).x;
    const from = dir > 0 ? front + 0.25 : rear - 0.25;
    const [left, right] = view.viewX(), lo = Math.max(Math.min(from, to), left), hi = Math.min(Math.max(from, to), right);
    const { W, H, ppm, cam } = view, size = GUIDE_SIZE_M * ppm;
    box.hidden = false; box.classList.toggle('near', near);
    box.style.setProperty('--chev', `${size.toFixed(1)}px`);
    const screenEdge = W / 2 + (to - cam.x) * ppm;
    const screenFrom = W / 2 + (from - cam.x) * ppm;
    const clipLeft = Math.max(0, dir > 0 ? screenFrom : screenEdge);
    const clipRight = Math.max(0, W - (dir > 0 ? screenEdge : screenFrom));
    arrows.style.clipPath = `inset(0 ${clipRight.toFixed(1)}px 0 ${clipLeft.toFixed(1)}px)`;
    let n = 0;
    function place(x) {
      const y = sim.visH(x) + GUIDE_SIZE_M * 0.3, slope = Math.atan((sim.visH(x + 0.5) - sim.visH(x - 0.5)));
      const e = chevron(n++);
      e.hidden = false;
      e.style.transform = `translate(${(W / 2 + (x - cam.x) * ppm).toFixed(1)}px, ${(H / 2 - (y - cam.y) * ppm).toFixed(1)}px) rotate(${(-slope).toFixed(3)}rad) scaleX(${dir})`;
      const k = Math.round(x / GUIDE_SPACING_M);
      e.style.animationDelay = `${((((k * dir) % 6) + 6) % 6 * 0.2 - 1.2).toFixed(2)}s`;   // the pulse runs toward the target
    }
    // A fixed world grid keeps arrows on the road. The terminal arrow's tip meets the bay edge.
    const terminal = to - dir * GUIDE_SIZE_M / 2;
    for (let k = Math.ceil(lo / GUIDE_SPACING_M); !near && k * GUIDE_SPACING_M <= hi && n < 79; k++) {
      const x = k * GUIDE_SPACING_M;
      if ((x - from) * dir < 0.8 || (to - x) * dir < GUIDE_SIZE_M / 2) continue;
      if (Math.abs(x - terminal) < GUIDE_SPACING_M * 0.75) continue;
      place(x);
    }
    if (!near && terminal >= lo && terminal <= hi && (terminal - from) * dir >= 0.8) place(terminal);
    for (let i = n; i < shown; i++) pool[i].hidden = true;
    shown = n;
  }
  return { update, hide };
}
