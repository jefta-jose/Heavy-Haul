import { CAMERA_HEIGHT_SHARE, CAMERA_LENGTH_SHARE, CAMERA_MIN_ZOOM } from '../game-config.js';

// Canvas sizing and the camera. World units are metres with y up; `ppm` is pixels per metre.
//
// Framing: the vehicle's nose sits at FRAMING.front of the screen width and the ground at
// FRAMING.ground of the height from the bottom (higher on phones, clear of the dials and pedals). Each vehicle has one fixed
// zoom framed from its own size (zoomFor, CAMERA_* in game-config.js); there is no zoom button. A zoom change resamples
// every sprite, so it only happens when you switch vehicles.
// The camera follows with a critically damped spring fed the vehicle's velocity, so it keeps
// pace under acceleration. Vertically it is fed the ground's own slope ahead (smooth: suspension
// bounce never shakes it), and the car is never let off the top or bottom of the screen, so a fast
// run down or up a steep grade keeps it in view.

const FRAMING = {
  front: 0.60, frontMax: 0.78, ground: 0.30, groundPhone: 0.42,
  zoom: 1.5,
  width: 11.8, height: 6.0, shortHeight: 6.7,
  spring: { x: 2.2, y: 1.35 },
  keepIn: 0.45,                    // the car body's centre stays within this share of the half-height (clear of the HUD)
  maxDpr: 1.5,
  phoneMaxDpr: 1.75,                // touch screens under 520 px tall: their trucks are small, so they need the pixels; main.js steps down if the phone can't hold it
};

export function createView(canvas, sim) {
  const ctx = canvas.getContext('2d', { alpha: false });   // opaque: the backdrop covers it every frame
  const cam = { x: 0, y: 5, vx: 0, vy: 0 };
  const view = { canvas, ctx, cam, W: 0, H: 0, DPR: 1, ppm: 20, quality: 1, zoom: FRAMING.zoom, groundFrac: FRAMING.ground };

  view.worldTransform = () => ctx.setTransform(view.ppm * view.DPR, 0, 0, -view.ppm * view.DPR, (view.W / 2 - cam.x * view.ppm) * view.DPR, (view.H / 2 + cam.y * view.ppm) * view.DPR);
  view.viewX = () => { const hw = view.W / 2 / view.ppm + 3; return [cam.x - hw, cam.x + hw]; };

  view.resize = () => {
    view.W = canvas.clientWidth; view.H = canvas.clientHeight;
    const phone = matchMedia('(pointer: coarse)').matches && Math.min(view.W, view.H) < 520;
    view.DPR = Math.min(phone ? FRAMING.phoneMaxDpr : FRAMING.maxDpr, window.devicePixelRatio || 1) * view.quality;
    canvas.width = Math.round(view.W * view.DPR); canvas.height = Math.round(view.H * view.DPR);
    view.groundFrac = view.H < 520 || view.W <= 600 ? FRAMING.groundPhone : FRAMING.ground;
    scale();
    if (sim.vehicles.length) view.snap();
  };
  // metres of trail across the screen per unit of zoom, and the pixels per metre for the zoom now
  const widthPerZoom = () => Math.max(FRAMING.width, view.W * (view.H < 520 ? FRAMING.shortHeight : FRAMING.height) / Math.max(1, view.H));
  const scale = () => { view.ppm = Math.max(1, view.W / (widthPerZoom() * view.zoom)); };

  // frame the run with the vehicle's own zoom
  view.setZoom = zoom => {
    zoom = Math.max(0.8, Math.min(8, Number(zoom) || FRAMING.zoom));
    if (zoom === view.zoom) return;
    view.zoom = zoom; view.resize();
  };

  function target() {
    const hw = view.W / 2 / view.ppm, hh = view.H / 2 / view.ppm;
    const nose = sim.truck.getWorldPoint(sim.V(sim.car.rig.nose, 0)).x;
    let x = nose - (FRAMING.front - 0.5) * 2 * hw;
    // long rigs: slide back so more of the tail stays in view, but never past FRAMING.frontMax, so the nose keeps
    // room ahead; the tail of a rig longer than that runs off the left edge
    const rig = sim.car.rig, tail = sim.truck.getWorldPoint(sim.V(Math.min(...rig.axles) - rig.radius - 0.6, 0)).x;
    if (tail < x - hw + 1) x = Math.max(tail - 1 + hw, nose - (FRAMING.frontMax - 0.5) * 2 * hw);
    const gy = (sim.visH(nose - 4) + sim.visH(nose - 5.7)) / 2;
    return { x, y: gy + hh - view.groundFrac * 2 * hh };
  }
  view.snap = () => { const t = target(); cam.x = t.x; cam.y = t.y; cam.vx = cam.vy = 0; };
  view.follow = dt => {
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

// A vehicle's zoom: its height fills CAMERA_HEIGHT_SHARE of the screen height, wide enough that a long rig fits
// (CAMERA_LENGTH_SHARE of the width), never closer than CAMERA_MIN_ZOOM.
export function zoomFor(car) {
  const rig = car.rig, size = car.physics?.size;
  const length = size?.[0] ?? (rig ? rig.nose - (Math.min(...rig.axles) - rig.radius) : 0), height = size?.[1] ?? 2.5;
  const zoom = Math.max(CAMERA_MIN_ZOOM, height / (CAMERA_HEIGHT_SHARE * FRAMING.height), length / (CAMERA_LENGTH_SHARE * FRAMING.width));
  return Math.round(Math.min(5, zoom) * 100) / 100;
}
