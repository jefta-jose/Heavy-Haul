import { loadImages } from './canvas-utils.js';
import { createSceneryCache } from './sprite-cache.js';
import { drawBackground, drawForegroundShade } from './layers/background.js';
import { drawGround, drawFrontLip, drawFarLip } from './layers/ground.js';
import { createProps } from './layers/props.js';
import { createVehicleLayer } from './layers/vehicle.js';
import { drawRipples } from './layers/mud-pools.js';
import { createParticles } from './particles.js';
import { createMudLayer } from './layers/mud.js';
import { createAtmosphere } from './layers/atmosphere.js';
import { createLens } from './lens.js';
import { SHOCKWAVE_COLOR, POWER_TIMES } from '../game-config.js';

// Painted 2.5D scene: screen-space backdrop, then world-space layers in metres (y up).
// Layer order (back to front):
//   backdrop with its haze, forest floor, midground -> bank with the road lane -> props, rocks, log bark -> exhaust ->
//   AWD/DIFF outline, vehicles with their loads (far tires, body, near tires; no shadows),
//   front mud lip, log ends -> water,
//   ripples, dust/spray/debris -> foreground props -> shade -> near weather -> mud and drops on the lens.
// The map's air (atmosphere.js) adds storm sky, sun shafts, birds, mist and far weather over the backdrop, and
// tumbleweeds on the trail; mud and drops land on the lens (lens.js).

export function createRenderer({ view, sim, content, onEvent }) {
  let scenery = loadImages(content.seasonArt);
  const hud = loadImages(content.hud);
  const scene = { view, sim, content, season: content.season, images: scenery.images, hud: hud.images, cache: null, worldMatrix: null };
  scene.cache = createSceneryCache(scene);
  let props = createProps(scene);
  const vehicles = createVehicleLayer(scene);
  scene.vehicleLayer = vehicles;
  // the Shockwave power's rings, from the blast event (particles.js passes it on)
  const rings = [];
  const particles = createParticles(scene, e => { if (e.type === 'shockwave') rings.push({ ...e, t: 0 }); onEvent?.(e); });
  const mud = createMudLayer(scene);
  const air = createAtmosphere(scene), lens = createLens(scene);
  scene.lens = lens;
  let sceneryReady = false, frames = 0, time = 0;
  // the weather this frame (main.js sets it from the run): storm 0 to 1
  const sky = { storm: 0 };
  scenery.ready.then(() => { sceneryReady = scenery.allLoaded(); });

  // ground, mud and holes repainted over a far tire's sunk bottom
  vehicles.farLip = (x, half, rise) => drawFarLip(scene, x, half, rise, (lo, hi) => { mud.surfaceOnly(lo, hi, scene.season.render.road ? () => props.drawHoles() : null); props.roadMarks(); });

  function draw(dt, playing) {
    const { ctx, W, H, DPR } = view;
    if (!sceneryReady || !vehicles.ready || !sim.vehicles.length) {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.fillStyle = '#354b43'; ctx.fillRect(0, 0, W, H);
      return;
    }
    time += dt; scene.time = time;
    air.update(playing ? dt : 0); lens.update(playing ? dt : 0, playing ? air.lensDrops : 0);
    paint(dt, playing);
    frames++;
  }
  function paint(dt, playing) {
    const { ctx } = view;
    scene.cache.prepare();
    scene.cache.built = 0;   // chunks built this frame; the chunk layers build one ahead only when none was
    // Sprites are cached at screen size, so plain bilinear filtering is enough; Chrome's 'medium'
    // mipmaps every draw and cost about 40% of the frame.
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'low';
    drawBackground(scene); air.drawSky();
    view.worldTransform(); const m = ctx.getTransform(); scene.worldMatrix = [m.a, m.b, m.c, m.d, m.e, m.f];
    drawGround(scene);
    mud.beginFrame();
    if (playing) mud.update(dt);
    // a thick road's deep mud would paint over its holes, so there they go on top of the mud and under the ruts
    if (!scene.season.render.road) props.drawHoles();   // under the ruts, so both wheel tracks show where they dip into a hole
    mud.surface(time, scene.season.render.road ? () => props.drawHoles() : null);
    props.drawBehind(); air.drawWorld();
    particles.update(playing ? dt : 0, playing); particles.draw('back');
    vehicles.draw(playing ? dt : 0);
    drawRings(playing ? dt : 0);
    drawFrontLip(scene, props.roadMarks); props.drawLogEnds(); mud.foreground();
    drawRipples(scene, time); particles.draw('front');
    props.drawFront(); drawForegroundShade(scene);
    drawStorm();
    drawFrost();
    air.drawNear(); lens.draw();
  }
  // Shockwave: two bright rings racing forward from the nose over the road it clears, and a flash where it started
  function drawRings(dt) {
    if (!rings.length) return;
    const { ctx } = view;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i]; r.t += dt; const p = r.t / 0.9;
      if (p >= 1) { rings.splice(i, 1); continue; }
      for (const [lag, width, alpha] of [[0, 0.55, 0.75], [0.18, 0.3, 0.5]]) {
        const q = Math.max(0, p - lag) / (1 - lag), radius = 0.5 + q * r.range; if (q <= 0) continue;
        ctx.globalAlpha = alpha * (1 - q); ctx.strokeStyle = SHOCKWAVE_COLOR; ctx.lineWidth = width * (1 - q * 0.6);
        ctx.beginPath(); ctx.arc(r.x, r.y, radius, -0.18 * Math.PI, 0.55 * Math.PI); ctx.stroke();
      }
      if (p < 0.35) {
        const g = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, 4); g.addColorStop(0, `rgba(230,246,255,${(0.8 * (1 - p / 0.35)).toFixed(3)})`); g.addColorStop(1, 'rgba(160,220,255,0)');
        ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(r.x, r.y, 4, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }
  // Time Freeze: frost creeping in from the screen's edges while the clock is stopped, fading in and out
  function drawFrost() {
    const st = sim.main?.st; if (!st || st.powerKind !== 'timefreeze' || !(st.powerT > 0)) return;
    const k = Math.min(1, (POWER_TIMES.timefreeze.seconds - st.powerT) * 3, st.powerT * 2), { ctx, W, H, DPR } = view;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.hypot(W, H) / 2);
    g.addColorStop(0, 'rgba(200,236,255,0)'); g.addColorStop(0.7, `rgba(200,236,255,${(0.28 * k).toFixed(3)})`); g.addColorStop(1, `rgba(240,250,255,${(0.7 * k).toFixed(3)})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  // a storm dims the scene a little
  function drawStorm() {
    if (sky.storm < 0.01) return;
    const { ctx, W, H, DPR } = view; ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.fillStyle = `rgba(14,20,30,${(sky.storm * 0.22).toFixed(3)})`; ctx.fillRect(0, 0, W, H);
  }

  return {
    draw,
    flash: on => vehicles.flash(on),
    // the storm (main.js, each frame); the rain itself is the atmosphere's
    setStorm(storm) { sky.storm = storm; air.setRain(storm); },
    // the ghost of the best run: { car, x, y, a, spin } or null
    set ghost(g) { vehicles.ghost = g; },
    hitGlow: () => vehicles.hitGlow(),
    // called on each lightning bolt (the audio's thunder)
    set onLightning(fn) { air.onBolt = fn; },
    get ready() { return sceneryReady && vehicles.ready; },
    get frames() { return frames; },
    get water() { return particles.water; },
    get mudTracks() { return mud.trackCount; },
    rutAt: x => mud.rutAt(x),
    // ruts last the whole run; the garage starts the next one clean
    clearTracks: () => { mud.clear(); lens.clear(); },
    splash: (kind, n, scale) => lens.splat(kind, n, scale),
    assetStatus: () => ({ ...scenery.status(), vehicles: vehicles.ready }),
    // another map (content.season and content.seasonArt already swapped): its art, sprites and roadside props
    setSeason() {
      sceneryReady = false;
      const next = loadImages(content.seasonArt);
      scene.season = content.season; scene.images = next.images; scenery = next;
      scene.cache = createSceneryCache(scene); props = createProps(scene); mud.clear(); air.reset(); lens.clear();
      return next.ready.then(() => { if (scenery === next) sceneryReady = next.allLoaded(); });
    },
  };
}
