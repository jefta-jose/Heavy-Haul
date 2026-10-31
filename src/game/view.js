// Canvas sizing and the camera. World units are metres with y up; `ppm` is pixels per metre.
//
// Framing: the vehicle's nose sits at FRAMING.front of the screen width and the ground at
// FRAMING.ground of the height from the bottom. Each car sets its own zoom in car.json
// (`camera.zoom`, 1.5 = 17.7 m of trail across the screen; higher shows more), applied whenever
// that car is driven. A car without one gets a zoom sized to its length.
// The camera follows with a critically damped spring fed the vehicle's velocity, so it keeps
// pace under acceleration. Vertically it is fed the ground's own slope ahead (smooth: suspension
// bounce never shakes it), and the car is never let off the top or bottom of the screen, so a fast
// run down or up a steep grade keeps it in view.
// Service jobs: while a winch cable is hooked on or a refuel runs (`view.inJob`, set by main.js),
// the view switches at once to `job.zoomScale` times the driven truck's own zoom, and back after.

export const FRAMING = {
  front: 0.60, ground: 0.30, groundShort: 0.31,
  zoom: 1.5,
  width: 11.8, height: 6.0, shortHeight: 6.7,
  spring: { x: 2.2, y: 1.35 },
  keepIn: 0.45,                    // the car body's centre stays within this share of the half-height (clear of the HUD)
  job: { zoomScale: 2.0 },           // zoom during a winch or refuel job, times the truck's own
  maxDpr: 1.5,
};

export function createView(canvas, sim) {
  const ctx = canvas.getContext('2d', { alpha: false });   // opaque: the backdrop covers it every frame
  const cam = { x: 0, y: 5, vx: 0, vy: 0 };
  // zoom: what is on screen now; baseZoom: the driven car's own (car.json), restored after a job
  const view = { canvas, ctx, cam, W: 0, H: 0, DPR: 1, ppm: 20, quality: 1, zoom: FRAMING.zoom, baseZoom: FRAMING.zoom, groundFrac: FRAMING.ground };

  view.worldTransform = () => ctx.setTransform(view.ppm * view.DPR, 0, 0, -view.ppm * view.DPR, (view.W / 2 - cam.x * view.ppm) * view.DPR, (view.H / 2 + cam.y * view.ppm) * view.DPR);
  view.viewX = () => { const hw = view.W / 2 / view.ppm + 3; return [cam.x - hw, cam.x + hw]; };

  view.resize = () => {
    view.DPR = Math.min(FRAMING.maxDpr, window.devicePixelRatio || 1) * view.quality;
    view.W = canvas.clientWidth; view.H = canvas.clientHeight;
    canvas.width = Math.round(view.W * view.DPR); canvas.height = Math.round(view.H * view.DPR);
    view.groundFrac = view.H < 520 ? FRAMING.groundShort : FRAMING.ground;
    scale();
    if (sim.vehicles.length) view.snap();
  };
  // metres of trail across the screen per unit of zoom, and the pixels per metre for the zoom now
  const widthPerZoom = () => Math.max(FRAMING.width, view.W * (view.H < 520 ? FRAMING.shortHeight : FRAMING.height) / Math.max(1, view.H));
  const scale = () => { view.ppm = Math.max(1, view.W / (widthPerZoom() * view.zoom)); };

  // frame the car being driven with its own zoom
  view.setZoom = zoom => {
    zoom = Math.max(0.8, Math.min(6, Number(zoom) || FRAMING.zoom));
    view.baseZoom = zoom;
    if (zoom === view.zoom) return;
    view.zoom = zoom; view.resize();
  };

  // a winch or refuel job in progress (main.js replaces this)
  view.inJob = () => false;

  function target() {
    const hw = view.W / 2 / view.ppm, hh = view.H / 2 / view.ppm;
    const nose = sim.truck.getWorldPoint(sim.V(sim.car.rig.nose, 0)).x;
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
    // a job starts or ends: switch the zoom at once, no animation
    const want = Math.min(8, view.baseZoom * (view.inJob() ? FRAMING.job.zoomScale : 1));
    if (want !== view.zoom) { view.zoom = want; scale(); view.snap(); }
    const t = target(), v = sim.truck.getLinearVelocity();
    // vertical feed-forward: how fast the ground under the camera rises or falls at this speed
    const slope = (sim.visH(t.x + 1) - sim.visH(t.x - 1)) / 2;
    for (const [k, vk, w, tv] of [['x', 'vx', FRAMING.spring.x, v.x], ['y', 'vy', FRAMING.spring.y, v.x * slope]]) {
      const a = w * w * (t[k] - cam[k]) + 2 * w * (tv - cam[vk]);
      cam[vk] += a * dt; cam[k] += cam[vk] * dt;
    }
    // never let the driven car leave the screen vertically: drag the camera along if it would
    const hh = view.H / 2 / view.ppm, keep = FRAMING.keepIn * hh, y = sim.truck.getPosition().y;
    if (y > cam.y + keep) { cam.y = y - keep; cam.vy = Math.max(cam.vy, 0); }
    if (y < cam.y - keep) { cam.y = y + keep; cam.vy = Math.min(cam.vy, 0); }
  };
  return view;
}

// A car's zoom: its car.json camera.zoom, or wide enough to show about 1.6 times its length.
export function zoomFor(car) {
  if (car.camera?.zoom) return car.camera.zoom;
  const rig = car.rig, length = rig.nose - (Math.min(...rig.axles) - rig.radius);
  return Math.round(Math.max(FRAMING.zoom, Math.min(4.5, length * 1.6 / FRAMING.width)) * 10) / 10;
}
