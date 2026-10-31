import { makeCanvas, scaled, tinted, loadImages, alphaCrop } from './canvas-utils.js';

// a copy with its opacity multiplied in, so it is drawn without globalAlpha
const faded = (img, alpha) => { const c = makeCanvas(img.width, img.height), g = c.getContext('2d'); g.globalAlpha = alpha; g.drawImage(img, 0, 0); return c; };

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
      midground: faded(scaled(A.midground, Math.round(H * DPR * 0.55) / A.midground.height), 0.72),   // its on-screen height
      backdrop: scaled(A.backdrop, Math.round(H * DPR * 1.04) / A.backdrop.height),
    };
    // Haze baked into the backdrop, which is drawn H * 1.04 tall from y = -0.02 H: the band from
    // 0.25 H to 0.74 H of the screen. One full-screen pass per frame fewer.
    {
      const b = C.img.backdrop, g = b.getContext('2d'), row = y => (y + 0.02) / 1.04 * b.height;
      const fog = g.createLinearGradient(0, row(0.25), 0, row(0.74));
      fog.addColorStop(0, 'rgba(169,193,195,0)'); fog.addColorStop(0.7, 'rgba(151,177,177,0.13)'); fog.addColorStop(1, 'rgba(148,167,157,0)');
      g.fillStyle = fog; g.fillRect(0, 0, b.width, b.height);
    }
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

// A vehicle (its load drawn in): body,
// near and pre-darkened far wheel, and solid outlines for the 4x4 / DIFF flash.
export function createRigCache(view, rig, sources) {
  const loader = loadImages(sources);
  const C = { key: '', outline: {}, images: loader.images, ready: loader.ready, loaded: loader.allLoaded };
  C.prepare = () => {
    const key = zoomKey(view); if (C.key === key || !loader.allLoaded()) return; C.key = key;
    const px = view.ppm * view.DPR, A = loader.images, kb = Math.min(1, px / rig.pixelsPerMetre * 1.1);
    C.body = scaled(A.body, kb);
    C.wheel = scaled(A.wheel, Math.min(1, rig.radius * Math.max(1, ...(rig.wheelScale ?? [])) / rig.wheelArtRadius * px * 1.1));
    // far tires: a pre-darkened copy (a per-frame ctx.filter is far too slow)
    C.wheelFar = makeCanvas(C.wheel.width, C.wheel.height);
    const f = C.wheelFar.getContext('2d'); f.drawImage(C.wheel, 0, 0); f.globalCompositeOperation = 'source-atop'; f.fillStyle = 'rgba(10,12,8,0.4)'; f.fillRect(0, 0, C.wheelFar.width, C.wheelFar.height);
    C.outline = {};
  };
  C.outlineOf = color => { if (!C.outline[color]) C.outline[color] = { body: tinted(C.body, color), wheel: tinted(C.wheel, color) }; return C.outline[color]; };
  return C;
}
