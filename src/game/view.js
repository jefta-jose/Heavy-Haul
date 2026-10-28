// Canvas sizing and the camera. World units are metres with y up; `ppm` is pixels per metre.
//
// Framing: the vehicle's nose sits at FRAMING.front of the screen width and the ground at
// FRAMING.ground of the height from the bottom. Higher zoom levels widen the view.
// The camera follows with a critically damped spring fed the vehicle's velocity, so it keeps
// pace under acceleration; vertical feed-forward is zero so suspension bounce never shakes it.

export const ZOOM_LEVELS = [1.5, 2.5, 3.5, 4.5];

export const FRAMING = {
  front: 0.60, ground: 0.30, groundShort: 0.31,
  zoom: 1.5,
  width: 11.8, height: 6.0, shortHeight: 6.7,
  spring: { x: 2.2, y: 1.35 },
  maxDpr: 1.5,
};

export function createView(canvas, sim) {
  const ctx = canvas.getContext('2d');
  const cam = { x: 0, y: 5, vx: 0, vy: 0 };
  const view = { canvas, ctx, cam, W: 0, H: 0, DPR: 1, ppm: 20, quality: 1, zoom: FRAMING.zoom, groundFrac: FRAMING.ground };

  view.worldTransform = () => ctx.setTransform(view.ppm * view.DPR, 0, 0, -view.ppm * view.DPR, (view.W / 2 - cam.x * view.ppm) * view.DPR, (view.H / 2 + cam.y * view.ppm) * view.DPR);
  view.viewX = () => { const hw = view.W / 2 / view.ppm + 3; return [cam.x - hw, cam.x + hw]; };

  view.resize = () => {
    view.DPR = Math.min(FRAMING.maxDpr, window.devicePixelRatio || 1) * view.quality;
    view.W = canvas.clientWidth; view.H = canvas.clientHeight;
    canvas.width = Math.round(view.W * view.DPR); canvas.height = Math.round(view.H * view.DPR);
    const short = view.H < 520, F = FRAMING;
    view.groundFrac = short ? F.groundShort : F.ground;
    const height = short ? F.shortHeight : F.height;
    view.ppm = Math.max(1, Math.min(view.W / (F.width * view.zoom), view.H / (height * view.zoom)));
    if (sim.vehicles.length) view.snap();
  };

  view.cycleZoom = () => {
    view.zoom = ZOOM_LEVELS[(ZOOM_LEVELS.indexOf(view.zoom) + 1) % ZOOM_LEVELS.length];
    view.resize();
    return view.zoom;
  };

  function target() {
    const nose = sim.truck.getWorldPoint(sim.V(sim.car.rig.nose, 0)).x, hw = view.W / 2 / view.ppm, hh = view.H / 2 / view.ppm;
    let x = nose - (FRAMING.front - 0.5) * 2 * hw;
    // long rigs (a truck with its trailer drawn in): slide back so the tail stays in view too,
    // centring the rig if it is longer than the screen
    const rig = sim.car.rig, tail = sim.truck.getWorldPoint(sim.V(Math.min(...rig.axles) - rig.radius - 0.6, 0)).x;
    if (tail < x - hw + 1) x = Math.max(tail - 1 + hw, (nose + tail) / 2);
    const gy = (sim.visH(nose - 4) + sim.visH(nose - 5.7)) / 2;
    return { x, y: gy + hh - view.groundFrac * 2 * hh };
  }
  view.snap = () => { const t = target(); cam.x = t.x; cam.y = t.y; cam.vx = cam.vy = 0; };
  view.follow = dt => {
    const t = target(), v = sim.truck.getLinearVelocity();
    for (const [k, vk, w, tv] of [['x', 'vx', FRAMING.spring.x, v.x], ['y', 'vy', FRAMING.spring.y, 0]]) {
      const a = w * w * (t[k] - cam[k]) + 2 * w * (tv - cam[vk]);
      cam[vk] += a * dt; cam[k] += cam[vk] * dt;
    }
  };
  return view;
}
