// Smooth drawing between physics steps. Physics runs at a fixed 120 Hz, but phones refresh at 60, 90
// or 120 Hz: at 90 Hz a frame holds one or two steps in turn, and drawing the latest step as-is makes
// the truck stutter against the scenery. Instead every frame is drawn blended between the state before
// the last step and the state after it, by how far the clock has run into the next step
// (Fiedler, "Fix your timestep"). Drawing lags physics by under one step (8 ms).
//
// The blend never touches the physics: while a frame is drawn, each moving body gets instance
// overrides of the getters the camera and renderer read (position, angle, world points), and they are
// removed again before anything else runs, so trajectories stay deterministic.

const GETTERS = ['getPosition', 'getAngle', 'getWorldPoint', 'getWorldVector', 'getWorldCenter'];
const JUMP = 2;   // metres: a body that moved farther in one step was teleported, so it is not blended

export function createInterpolation(sim, V) {
  let prev = new WeakMap(), touched = [];

  // the state before a step; called by the wrapped sim.step
  function capture() {
    for (let b = sim.world?.getBodyList(); b; b = b.getNext()) {
      if (b.isStatic()) continue;
      const p = b.getPosition(), o = prev.get(b);
      if (o) { o.x = p.x; o.y = p.y; o.a = b.getAngle(); } else prev.set(b, { x: p.x, y: p.y, a: b.getAngle() });
    }
  }

  // draw with the bodies blended `alpha` (0..1) of the way from the previous step to the current one
  function apply(alpha) {
    if (alpha >= 1) return;
    for (let b = sim.world?.getBodyList(); b; b = b.getNext()) {
      const o = prev.get(b); if (!o) continue;
      const p = b.getPosition(), a = b.getAngle();
      if (Math.abs(p.x - o.x) > JUMP || Math.abs(p.y - o.y) > JUMP) continue;
      const x = o.x + (p.x - o.x) * alpha, y = o.y + (p.y - o.y) * alpha, ang = o.a + (a - o.a) * alpha;
      const c = Math.cos(ang), s = Math.sin(ang), pos = V(x, y), lc = b.getLocalCenter();
      b.getPosition = () => pos;
      b.getAngle = () => ang;
      b.getWorldVector = v => V(c * v.x - s * v.y, s * v.x + c * v.y);
      b.getWorldPoint = v => V(x + c * v.x - s * v.y, y + s * v.x + c * v.y);
      b.getWorldCenter = () => V(x + c * lc.x - s * lc.y, y + s * lc.x + c * lc.y);
      touched.push(b);
    }
  }

  function restore() {
    for (const b of touched) for (const g of GETTERS) delete b[g];
    touched = [];
  }

  return { capture, apply, restore, reset: () => { prev = new WeakMap(); } };
}
