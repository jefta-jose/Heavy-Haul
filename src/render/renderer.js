import { loadImages } from './canvas-utils.js';
import { createSceneryCache } from './sprite-cache.js';
import { drawBackground, drawForegroundShade } from './layers/background.js';
import { drawGround, drawFrontLip } from './layers/ground.js';
import { createProps } from './layers/props.js';
import { createVehicleLayer } from './layers/vehicle.js';
import { drawWater, drawRipples } from './layers/water.js';
import { createParticles } from './particles.js';
import { createBridgeLayer } from './layers/bridges.js';
import { createMudLayer } from './layers/mud.js';

// Painted 2.5D scene: screen-space backdrop, then world-space layers in metres (y up).
// Layer order (back to front):
//   backdrop with its haze, forest floor, midground -> bank with the road lane -> props, rocks, log bark -> exhaust ->
//   shadows, 4x4/DIFF outline, vehicles with their loads (far tires, body, near tires),
//   service winch cables -> front mud lip, log ends -> contact accents, water,
//   ripples, dust/spray/debris -> foreground props -> shade.

export function createRenderer({ view, sim, content, onEvent }) {
  const scenery = loadImages(content.seasonArt), hud = loadImages(content.hud);
  const scene = { view, sim, content, season: content.season, images: scenery.images, hud: hud.images, cache: null, worldMatrix: null };
  scene.cache = createSceneryCache(scene);
  const props = createProps(scene), vehicles = createVehicleLayer(scene);
  scene.vehicleLayer = vehicles;
  const particles = createParticles(scene, onEvent);
  const bridges = createBridgeLayer(scene), mud = createMudLayer(scene);
  let sceneryReady = false, frames = 0, time = 0, refueling = null;
  scenery.ready.then(() => { sceneryReady = scenery.allLoaded(); });

  function drawRefueling() {
    if (!refueling) return;
    const { ctx } = view, { source, target, elapsed, progress } = refueling;
    const port = v => v.parts.truck.getWorldPoint(sim.V(...(v.car.rig.refuelPoint ?? [-v.car.rig.nose * 0.45, 0.9])));
    const a = port(source), b = port(target), sag = Math.min(a.y, b.y) - 0.55;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const hose = () => { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.bezierCurveTo(a.x, sag, b.x, sag, b.x, b.y); };
    hose(); ctx.strokeStyle = '#171c18'; ctx.lineWidth = 0.085; ctx.stroke();
    hose(); ctx.strokeStyle = '#59685b'; ctx.lineWidth = 0.045; ctx.stroke();
    ctx.setLineDash([0.12, 0.2]); ctx.lineDashOffset = -elapsed * 1.1;
    hose(); ctx.strokeStyle = '#a6d57a'; ctx.lineWidth = 0.025; ctx.stroke(); ctx.setLineDash([]);
    for (const p of [a, b]) { ctx.fillStyle = '#c3b678'; ctx.beginPath(); ctx.arc(p.x, p.y, 0.065, 0, Math.PI * 2); ctx.fill(); }
    const y = b.y + 1.1, w = 1.7;
    ctx.fillStyle = 'rgba(10,22,17,.85)'; ctx.fillRect(b.x - w / 2 - 0.04, y - 0.04, w + 0.08, 0.21);
    ctx.fillStyle = '#62d24b'; ctx.fillRect(b.x - w / 2, y, w * progress, 0.13);
    ctx.restore();
  }

  // draw(dt, playing, layers): with a `layers` object the frame is drawn layer by layer, each followed
  // by a GPU flush, and each layer's paint time in ms is added to it (the performance log does this
  // on a few frames; the flushes make that frame slow, so it is left out of the frame statistics)
  function draw(dt, playing, layers = null) {
    const { ctx, W, H, DPR } = view;
    if (!sceneryReady || !vehicles.ready || !sim.vehicles.length) {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.fillStyle = '#354b43'; ctx.fillRect(0, 0, W, H);
      return;
    }
    const layer = (name, fn) => {
      if (!layers) return fn();
      const t = performance.now(); fn(); ctx.getImageData(0, 0, 1, 1); layers[name] = (layers[name] ?? 0) + performance.now() - t;
    };
    time += dt;
    layer('cache', () => scene.cache.prepare());
    // Sprites are cached at screen size, so plain bilinear filtering is enough; Chrome's 'medium'
    // mipmaps every draw and cost about 40% of the frame.
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'low';
    layer('background', () => drawBackground(scene));
    view.worldTransform(); const m = ctx.getTransform(); scene.worldMatrix = [m.a, m.b, m.c, m.d, m.e, m.f];
    layer('ground', () => drawGround(scene));
    if (playing) mud.update(dt);
    layer('mud', () => { props.drawHoles(); mud.surface(time); });   // holes under the ruts, so both wheel tracks dip into a hole
    layer('props', () => { props.drawBehind(); bridges.draw(); });
    layer('particles', () => { particles.update(playing ? dt : 0, playing); particles.draw('back'); });
    layer('vehicles', () => vehicles.draw(playing ? dt : 0));
    layer('foreground', () => { drawFrontLip(scene); props.drawLogEnds(); mud.foreground(); bridges.drawFront(); drawRefueling(); vehicles.contactAccents(); });
    layer('water', () => { drawWater(scene, time); drawRipples(scene, time); particles.draw('front'); });
    layer('front', () => { props.drawFront(); drawForegroundShade(scene); });
    frames++;
  }

  return {
    draw,
    flash: on => vehicles.flash(on),
    setRefueling(job) { refueling = job; },
    get refueling() { return refueling; },
    get ready() { return sceneryReady && vehicles.ready; },
    get frames() { return frames; },
    get water() { return particles.water; },
    get mudTracks() { return mud.trackCount; },
    rutAt: x => mud.rutAt(x),
    // ruts last the whole run; the garage starts the next one clean
    clearTracks: () => mud.clear(),
    assetStatus: () => ({ ...scenery.status(), vehicles: vehicles.ready }),
  };
}
