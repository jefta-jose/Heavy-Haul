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
  const prev = new WeakMap(), touched = [];
  function makeState(b, p) {
    const o = { x: p.x, y: p.y, a: b.getAngle(), pos: V(p.x, p.y), ang: 0, c: 1, s: 0 };
    // These getters are allocated once per body and reattached for each drawn frame.
    o.getPosition = () => o.pos;
    o.getAngle = () => o.ang;
    o.getWorldVector = v => V(o.c * v.x - o.s * v.y, o.s * v.x + o.c * v.y);
    o.getWorldPoint = v => V(o.pos.x + o.c * v.x - o.s * v.y, o.pos.y + o.s * v.x + o.c * v.y);
    o.getWorldCenter = () => o.getWorldPoint(b.getLocalCenter());
    return o;
  }

  // the state before a step; called by the wrapped sim.step
  function capture() {
    for (let b = sim.world?.getBodyList(); b; b = b.getNext()) {
      if (b.isStatic()) continue;
      const p = b.getPosition(), o = prev.get(b);
      if (o) { o.x = p.x; o.y = p.y; o.a = b.getAngle(); } else prev.set(b, makeState(b, p));
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
      o.pos.x = x; o.pos.y = y; o.ang = ang; o.c = Math.cos(ang); o.s = Math.sin(ang);
      for (const g of GETTERS) b[g] = o[g];
      touched.push(b);
    }
  }

  function restore() {
    for (const b of touched) for (const g of GETTERS) delete b[g];
    touched.length = 0;
  }

  return { capture, apply, restore };
}
