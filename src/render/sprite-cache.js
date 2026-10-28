import { makeCanvas, scaled, tinted, loadImages, alphaCrop } from './canvas-utils.js';

// Resampled sprites, patterns and gradients for the current zoom level and viewport. Rebuilt only
// when the pixel scale or canvas size changes; each frame then blits sprites at screen size.

const zoomKey = view => `${(view.ppm * view.DPR).toFixed(2)}|${view.W}x${view.H}`;

// Scenery: backdrop, midground, props, lane materials.
export function createSceneryCache(scene) {
  const { view, season, images: A } = scene;
  const render = season.render;
  const C = { key: '' };
  C.prepare = () => {
    const { ctx, W, H, DPR, ppm } = view, px = ppm * DPR, key = zoomKey(view);
    if (C.key === key) return; C.key = key;
    C.img = {
      reeds: scaled(A.reeds, Math.min(1, 1.7 * px / A.reeds.width)),
      log: scaled(A.log, Math.min(1, 3 * px / A.log.width)),
      rock: null,
      midground: scaled(A.midground, Math.min(1, H * DPR * 0.56 / A.midground.height)),
      backdrop: scaled(A.backdrop, Math.min(1, H * DPR * 1.05 / A.backdrop.height)),
    };
    C.rockSource ??= alphaCrop(A.rock);
    C.img.rock = scaled(C.rockSource, Math.min(1, 2.6 * px / C.rockSource.width));
    for (const key of ['logCrossing', 'bridgePlank', 'bridgeFrame', 'bridgeSteelFrame', 'mudHole', 'pipe']) if (A[key]) {
      // Preserve full canvases for registered near faces/plank edges. Only
      // support frames and terrain overlays use their visible alpha bounds.
      const crop = ['bridgeFrame', 'bridgeSteelFrame', 'mudHole'].includes(key);
      if (crop) { C[`${key}Source`] ??= alphaCrop(A[key]); }
      const source = crop ? C[`${key}Source`] : A[key];
      const metres = key.includes('Frame') ? 16 : key === 'mudHole' ? 9 : 4;
      C.img[key] = scaled(source, Math.min(1, metres * px / source.width));
    }
    if (A.logEnd) {
      C.logEndSource ??= alphaCrop(A.logEnd);
      C.img.logEnd = scaled(C.logEndSource, Math.min(1, 1.2 * px / C.logEndSource.width));
    }
    if (A.deepMud) { C.deepMudPat = ctx.createPattern(A.deepMud, 'repeat'); C.deepMudPat.setTransform(new DOMMatrix([0.0034, 0, 0, -0.0013, 0, 0])); }
    if (A.bridgeWood) { C.bridgePat = ctx.createPattern(A.bridgeWood, 'repeat'); C.bridgePat.setTransform(new DOMMatrix([0.002, 0, 0, -0.001, 0, 0])); }
    C.fog = ctx.createLinearGradient(0, H * 0.25, 0, H * 0.74); C.fog.addColorStop(0, 'rgba(169,193,195,0)'); C.fog.addColorStop(0.7, 'rgba(151,177,177,0.13)'); C.fog.addColorStop(1, 'rgba(148,167,157,0)');
    C.shade = ctx.createLinearGradient(0, H * 0.72, 0, H); C.shade.addColorStop(0, 'rgba(15,24,17,0)'); C.shade.addColorStop(1, 'rgba(15,24,17,0.15)');
    // lane textures, squashed vertically for the slightly elevated side view
    C.lanePat = {};
    for (const [s, k] of Object.entries(render.lane.materials)) {
      const pat = ctx.createPattern(A[k], 'repeat'); pat.setTransform(new DOMMatrix([0.0026, 0, 0, -0.00105, 0, 0])); C.lanePat[s] = pat;
    }
    C.deepPat = ctx.createPattern(A.ground, 'repeat'); C.deepPat.setTransform(new DOMMatrix([0.004, 0, 0, -0.004, 0, 0]));
    C.forestPat = ctx.createPattern(A.ground, 'repeat'); C.forestPat.setTransform(new DOMMatrix([0.004, 0, 0, -0.0012, 0, 0]));
  };
  return C;
}

// A vehicle (its load drawn in): body, body with the wheel arches cut out (fenders drawn over the tires),
// near and pre-darkened far wheel, and solid outlines for the 4x4 / DIFF flash.
export function createRigCache(view, rig, sources) {
  const loader = loadImages(sources);
  const C = { key: '', outline: {}, images: loader.images, ready: loader.ready, loaded: loader.allLoaded };
  C.prepare = () => {
    const key = zoomKey(view); if (C.key === key || !loader.allLoaded()) return; C.key = key;
    const px = view.ppm * view.DPR, A = loader.images, kb = Math.min(1, px / rig.pixelsPerMetre * 1.1);
    C.body = scaled(A.body, kb);
    C.over = makeCanvas(C.body.width, C.body.height);
    const g = C.over.getContext('2d'); g.drawImage(C.body, 0, 0); g.globalCompositeOperation = 'destination-out';
    for (const [x, y, r] of rig.archCircles) { g.beginPath(); g.arc(x * kb, y * kb, r * kb, 0, Math.PI * 2); g.fill(); }
    // live load layers (a tank of water with an animal in it) at the body's scale
    C.tank = rig.tank ? Object.fromEntries(['orca', 'waterSurface', 'tankFront'].filter(k => A[k]).map(k => [k, scaled(A[k], kb)])) : null;
    C.wheel = scaled(A.wheel, Math.min(1, rig.radius * Math.max(1, ...(rig.wheelScale ?? [])) / rig.wheelArtRadius * px * 1.1));
    // far tires: a pre-darkened copy (a per-frame ctx.filter is far too slow)
    C.wheelFar = makeCanvas(C.wheel.width, C.wheel.height);
    const f = C.wheelFar.getContext('2d'); f.drawImage(C.wheel, 0, 0); f.globalCompositeOperation = 'source-atop'; f.fillStyle = 'rgba(10,12,8,0.4)'; f.fillRect(0, 0, C.wheelFar.width, C.wheelFar.height);
    C.outline = {};
  };
  C.outlineOf = color => { if (!C.outline[color]) C.outline[color] = { body: tinted(C.body, color), wheel: tinted(C.wheel, color) }; return C.outline[color]; };
  return C;
}
