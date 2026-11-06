import { loadImages } from './canvas-utils.js';
import { createSceneryCache } from './sprite-cache.js';
import { drawBackground, drawForegroundShade } from './layers/background.js';
import { drawGround, drawFrontLip, drawFarLip } from './layers/ground.js';
import { createProps } from './layers/props.js';
import { createVehicleLayer } from './layers/vehicle.js';
import { drawRipples } from './layers/mud-pools.js';
import { createParticles } from './particles.js';
import { createMudLayer } from './layers/mud.js';

// Painted 2.5D scene: screen-space backdrop, then world-space layers in metres (y up).
// Layer order (back to front):
//   backdrop with its haze, forest floor, midground -> bank with the road lane -> props, rocks, log bark -> exhaust ->
//   AWD/DIFF outline, vehicles with their loads (far tires, body, near tires; no shadows),
//   service winch cables -> front mud lip, log ends -> water,
//   ripples, dust/spray/debris -> foreground props -> shade.

export function createRenderer({ view, sim, content, onEvent }) {
  const scenery = loadImages(content.seasonArt), hud = loadImages(content.hud);
  const scene = { view, sim, content, season: content.season, images: scenery.images, hud: hud.images, cache: null, worldMatrix: null };
  scene.cache = createSceneryCache(scene);
  const props = createProps(scene), vehicles = createVehicleLayer(scene);
  scene.vehicleLayer = vehicles;
  const particles = createParticles(scene, onEvent);
  const mud = createMudLayer(scene);
  let sceneryReady = false, frames = 0, time = 0;
  scenery.ready.then(() => { sceneryReady = scenery.allLoaded(); });

  // ground, mud and holes repainted over a far tire's sunk bottom
  vehicles.farLip = (x, half, rise) => drawFarLip(scene, x, half, rise, (lo, hi) => { mud.surfaceOnly(lo, hi, scene.season.render.road ? () => props.drawHoles() : null); props.roadMarks(); });

  function draw(dt, playing) {
    const { ctx, W, H, DPR } = view;
    if (!sceneryReady || !vehicles.ready || !sim.vehicles.length) {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.fillStyle = '#354b43'; ctx.fillRect(0, 0, W, H);
      return;
    }
    time += dt;
    scene.cache.prepare();
    scene.cache.built = 0;   // chunks built this frame; the chunk layers build one ahead only when none was
    // Sprites are cached at screen size, so plain bilinear filtering is enough; Chrome's 'medium'
    // mipmaps every draw and cost about 40% of the frame.
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'low';
    drawBackground(scene);
    view.worldTransform(); const m = ctx.getTransform(); scene.worldMatrix = [m.a, m.b, m.c, m.d, m.e, m.f];
    drawGround(scene);
    if (playing) mud.update(dt);
    // a thick road's deep mud would paint over its holes, so there they go on top of the mud and under the ruts
    if (!scene.season.render.road) props.drawHoles();   // under the ruts, so both wheel tracks show where they dip into a hole
    mud.surface(time, scene.season.render.road ? () => props.drawHoles() : null);
    props.drawBehind();
    particles.update(playing ? dt : 0, playing); particles.draw('back');
    vehicles.draw(playing ? dt : 0);
    drawFrontLip(scene, props.roadMarks); props.drawLogEnds(); mud.foreground();
    drawRipples(scene, time); particles.draw('front');
    props.drawFront(); drawForegroundShade(scene);
    frames++;
  }

  return {
    draw,
    flash: on => vehicles.flash(on),
    hitGlow: () => vehicles.hitGlow(),
    warmVehicles: items => vehicles.warm(items),
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
