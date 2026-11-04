import { CRACKS_AT_DAMAGE, CRACK_COUNTS, SHIELD_COLOR, SHIELD_WIDTH_M } from '../game-config.js';
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
  // render.backdropHorizon: a full scene with its own waterline (a share of its height), sized so the
  // top of the image is the top of the screen and that line sits just under the road's far edge
  const backdropHeight = () => {
    const { H, groundFrac } = view, fit = render.backdropHorizon;
    if (!fit) return Math.round(H * view.DPR * 1.04) / view.DPR;
    return Math.round(H * (1 - groundFrac - (render.road?.far ?? 0) + 0.03) / fit * view.DPR) / view.DPR;
  };
  C.prepare = () => {
    const { ctx, W, H, DPR, ppm } = view, px = ppm * DPR, key = zoomKey(view);
    if (C.key === key) return; C.key = key;
    C.img = {
      reeds: scaled(A.reeds, Math.min(1, 1.7 * px / A.reeds.width)),
      rock: null,
      midground: render.midground === false ? null : faded(scaled(A.midground, Math.round(H * DPR * 0.55) / A.midground.height), 0.72),   // its on-screen height
      backdrop: scaled(A.backdrop, backdropHeight() * DPR / A.backdrop.height),
    };
    C.backdropBottom = render.backdropHorizon ? backdropHeight() : H * 1.02;
    // Haze baked into the backdrop, which is drawn H * 1.04 tall from y = -0.02 H: the band from
    // 0.25 H to 0.74 H of the screen. One full-screen pass per frame fewer. A full scene keeps its own light.
    if (!render.backdropHorizon) {
      const b = C.img.backdrop, g = b.getContext('2d'), row = y => (y + 0.02) / 1.04 * b.height;
      const fog = g.createLinearGradient(0, row(0.25), 0, row(0.74));
      fog.addColorStop(0, 'rgba(169,193,195,0)'); fog.addColorStop(0.7, 'rgba(151,177,177,0.13)'); fog.addColorStop(1, 'rgba(148,167,157,0)');
      g.fillStyle = fog; g.fillRect(0, 0, b.width, b.height);
    }
    C.rockSource ??= alphaCrop(A.rock);
    C.img.rock = scaled(C.rockSource, Math.min(1, 5 * px / C.rockSource.width));
    const round = Object.values(season.trail.obstacleKinds ?? {}).map(k => k.art);
    for (const key of ['bridgePlank', 'bridgeFrame', 'bridgeSteelFrame', 'mudHole', 'fuelStation', ...round]) if (A[key]) {
      // Preserve full canvases for registered near faces/plank edges. Only
      // support frames and terrain overlays use their visible alpha bounds.
      const crop = ['bridgeFrame', 'bridgeSteelFrame', 'mudHole', 'fuelStation'].includes(key);
      if (crop) { C[`${key}Source`] ??= alphaCrop(A[key]); }
      const source = crop ? C[`${key}Source`] : A[key];
      const metres = key.includes('Frame') ? 16 : key === 'mudHole' ? 14 : key === 'fuelStation' ? 15 : key === 'bridgePlank' ? 4 : 5;
      C.img[key] = scaled(source, Math.min(1, metres * px / source.width));
    }
    for (const { art } of Object.values(season.trail.propKinds ?? {})) {
      C[`${art}Source`] ??= alphaCrop(A[art]);
      C.img[art] = scaled(C[`${art}Source`], Math.min(1, 6 * px / C[`${art}Source`].width));
    }
    if (A.logEnd) {
      C.logEndSource ??= alphaCrop(A.logEnd);
      C.img.logEnd = scaled(C.logEndSource, Math.min(1, 1.5 * px / C.logEndSource.width));
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
    // the thick road's soil: mirrored both ways, so its light-to-dark shading has no seam
    if (render.road && A.roadSoil) {
      if (!C.soilSource) {
        const w = A.roadSoil.width, h = A.roadSoil.height; C.soilSource = makeCanvas(w * 2, h * 2);
        const g = C.soilSource.getContext('2d');
        for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { g.setTransform(sx, 0, 0, sy, sx < 0 ? w * 2 : 0, sy < 0 ? h * 2 : 0); g.drawImage(A.roadSoil, 0, 0); }
      }
      const s = render.road.soilTileM / C.soilSource.width;
      C.deepPat = ctx.createPattern(C.soilSource, 'repeat'); C.deepPat.setTransform(new DOMMatrix([s, 0, 0, -s, 0, 0]));
    }
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
    C.outline = {}; C.cracked = {}; C.shield = null;
  };
  // The body with damage drawn on it, built once per set of cracks. Cracks are jagged lines painted only where the
  // body is opaque, so they never spill off the truck; each truck's come from its own id.
  C.bodyAtDamage = (damage, id) => {
    const tier = CRACKS_AT_DAMAGE.filter(d => damage >= d).length;
    if (!tier) return C.body;
    if (C.cracked[tier]) return C.cracked[tier];
    const c = makeCanvas(C.body.width, C.body.height), g = c.getContext('2d'), W = c.width, H = c.height;
    g.drawImage(C.body, 0, 0); g.globalCompositeOperation = 'source-atop';
    g.fillStyle = `rgba(24,12,6,${0.06 * tier})`; g.fillRect(0, 0, W, H);
    let n = 7; for (const ch of id) n = (n * 31 + ch.charCodeAt(0)) >>> 0;
    const rnd = () => { n = (n * 1664525 + 1013904223) >>> 0; return n / 4294967296; };
    const unit = Math.max(1.3, H / 110);
    // every crack starts on the truck, not in the empty canvas around it
    const alpha = C.body.getContext('2d').getImageData(0, 0, W, H).data;
    const onTruck = () => { for (let t = 0; t < 40; t++) { const x = Math.floor(rnd() * W), y = Math.floor(rnd() * H); if (alpha[(y * W + x) * 4 + 3] > 200) return [x, y]; } return [W / 2, H / 2]; };
    const crack = (x, y, a, len, width, branches) => {
      const pts = [[x, y]], steps = 4 + Math.floor(rnd() * 3);
      for (let i = 0; i < steps; i++) { a += (rnd() - 0.5) * 1.5; x += Math.cos(a) * len / steps; y += Math.sin(a) * len / steps; pts.push([x, y]); }
      const stroke = (dx, dy, style, w) => { g.strokeStyle = style; g.lineWidth = w; g.beginPath(); pts.forEach(([px, py], i) => (i ? g.lineTo(px + dx, py + dy) : g.moveTo(px + dx, py + dy))); g.stroke(); };
      stroke(unit * 0.6, unit * 0.6, 'rgba(255,235,210,0.28)', width);
      stroke(0, 0, 'rgba(12,7,4,0.92)', width);
      for (let b = 0; b < branches; b++) { const p = pts[1 + Math.floor(rnd() * (pts.length - 1))]; crack(p[0], p[1], a + (rnd() < 0.5 ? 1 : -1) * (0.6 + rnd()), len * 0.45, width * 0.65, 0); }
    };
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (let i = 0; i < CRACK_COUNTS[tier - 1]; i++) { const [x, y] = onTruck(); crack(x, y, rnd() * 6.28, H * (0.1 + rnd() * 0.16), unit * (1 + rnd() * 0.8), 1 + Math.floor(rnd() * 2)); }
    return (C.cracked[tier] = c);
  };
  // The no-damage glow, a soft halo around the silhouette. Built once per zoom: the stacked copies are too many to draw each frame.
  // `pad` is how many sprite pixels it adds on every side.
  C.shieldOf = (metresPerBodyPx, metresPerWheelPx) => {
    if (C.shield) return C.shield;
    const halo = (src, metresPerPx) => {
      const pad = Math.ceil(SHIELD_WIDTH_M / metresPerPx), c = makeCanvas(src.width + pad * 2, src.height + pad * 2), g = c.getContext('2d');
      const violet = tinted(src, SHIELD_COLOR), pale = tinted(src, '#f3e4ff');
      for (const [reach, alpha, sprite] of [[1, 0.1, violet], [0.72, 0.16, violet], [0.45, 0.28, violet], [0.2, 0.55, pale]]) {
        g.globalAlpha = alpha;
        for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8; g.drawImage(sprite, pad + Math.cos(a) * pad * reach, pad + Math.sin(a) * pad * reach); }
      }
      return { canvas: c, pad };
    };
    return (C.shield = { body: halo(C.body, metresPerBodyPx), wheel: halo(C.wheel, metresPerWheelPx) });
  };
  C.outlineOf = color => { if (!C.outline[color]) C.outline[color] = { body: tinted(C.body, color), wheel: tinted(C.wheel, color) }; return C.outline[color]; };
  return C;
}
