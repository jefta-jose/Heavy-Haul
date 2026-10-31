import { makeCanvas } from '../canvas-utils.js';

// Screen-space backdrop: opaque panorama, haze and transparent midground trees, each scrolling
// with its own parallax factor and mirrored at every repeat so no seam shows. The cache resamples
// each to its on-screen height, so they are blitted 1:1 at whole device pixels (no per-frame filtering).

const mirrored = img => {
  if (!img.mirror) { img.mirror = makeCanvas(img.width, img.height); const g = img.mirror.getContext('2d'); g.scale(-1, 1); g.drawImage(img, -img.width, 0); }
  return img.mirror;
};
function screenLayer(scene, img, factor, bottom) {
  const { ctx, W, DPR, ppm, cam } = scene.view, w = img.width, top = Math.round(bottom * DPR) - img.height;
  const shift = (cam.x - scene.sim.trail.start) * ppm * factor * DPR, origin = Math.round((W * DPR - w) / 2 - shift);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const first = Math.floor(-origin / w), last = Math.ceil((W * DPR - origin) / w);
  for (let i = first; i <= last; i++) ctx.drawImage(Math.abs(i % 2) === 1 ? mirrored(img) : img, origin + i * w, top);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}

// The distant forest floor below the tree roots, painted once per 8 m chunk relative to the horizon
// (which stays at a fixed screen height) and blitted each frame. Painting it live (a clipped
// pattern, twelve feather strips and a gradient) cost two full-screen passes per frame in Chrome.
const FLOOR_CHUNK = 8, WAVE = 0.12;
const floorWave = x => Math.sin(x * 0.37) * 0.08 + Math.sin(x * 1.13) * 0.035;
function floorChunk(scene, index, depth, fade) {
  const { ppm, DPR } = scene.view, px = ppm * DPR, x = index * FLOOR_CHUNK, end = x + FLOOR_CHUNK;
  const canvas = makeCanvas(FLOOR_CHUNK * px, (WAVE + depth) * px), g = canvas.getContext('2d');
  g.imageSmoothingQuality = 'high';
  // local y: 0 is the horizon, so the chunk's top edge is at y = WAVE
  g.setTransform(px, 0, 0, -px, -x * px, WAVE * px);
  g.beginPath();
  for (let t = x - 0.5; t <= end + 0.5; t += 0.5) g.lineTo(t, floorWave(t));
  g.lineTo(end + 0.5, -depth); g.lineTo(x - 0.5, -depth); g.closePath(); g.clip();
  // Feather the distant floor into the roots instead of revealing a horizontal earthen wall
  // on tall screens. Texture is compressed in depth, as a receding surface should be.
  g.fillStyle = scene.cache.forestPat;
  g.fillRect(x, -depth, FLOOR_CHUNK, Math.max(0, depth - fade));
  for (let i = 0; i < 12; i++) {
    g.globalAlpha = (i + 0.5) / 12;
    g.fillRect(x, -fade * (i + 1) / 12, FLOOR_CHUNK, fade / 12 + 0.005);
  }
  g.globalAlpha = 1;
  const shade = g.createLinearGradient(0, 0, 0, -3);
  shade.addColorStop(0, 'rgba(64,73,53,0)'); shade.addColorStop(1, 'rgba(29,33,22,0.12)');
  g.fillStyle = shade; g.fillRect(x, -depth, FLOOR_CHUNK, depth + 0.2);
  return canvas;
}

export function drawBackground(scene) {
  const { ctx, H, DPR, ppm, cam } = scene.view, C = scene.cache, render = scene.season.render;
  // The backdrop is opaque and covers the screen; the fog is baked into its cached copy.
  screenLayer(scene, C.img.backdrop, render.parallax.backdrop, H * 1.02);
  // A continuous forest floor behind the bank (render.forestFloor, default on). A detailed panorama
  // has water below the roots that must not show as a hole behind the trail when the foreground
  // descends or the camera climbs. A season whose backdrop is already a calm, simple swamp turns it
  // off: there the floor showed as a flat band of dirt rising behind the grass crest.
  // Draw before the transparent trees so their roots and vegetation soften the far boundary.
  // The tree PNG has transparent padding below its roots: their actual baseline is ~0.675 H,
  // not the image's 0.73 H placement. Begin the soil behind that baseline, not below it.
  if (render.forestFloor !== false) {
    scene.view.worldTransform();
    const [lo, hi] = scene.view.viewX(), horizon = cam.y + (H * 0.5 - H * 0.65) / ppm;
    const depth = H * 0.35 / ppm + 0.3, fade = Math.min(0.8, H / ppm * 0.03), key = `${(ppm * DPR).toFixed(4)}|${H}`;
    if (C.floorKey !== key) { C.floorKey = key; C.floorChunks = new Map(); }
    const first = Math.floor(lo / FLOOR_CHUNK), last = Math.floor(hi / FLOOR_CHUNK);
    const make = index => {
      const canvas = floorChunk(scene, index, depth, fade); C.floorChunks.set(index, canvas); C.built = (C.built ?? 0) + 1;
      // keep every chunk in view (zoomed out for a job there are many), or each frame rebuilds them
      if (C.floorChunks.size > last - first + 6) C.floorChunks.delete(C.floorChunks.keys().next().value);
      return canvas;
    };
    for (let index = first; index <= last; index++) {
      const canvas = C.floorChunks.get(index) ?? make(index);
      ctx.save(); ctx.translate(index * FLOOR_CHUNK, horizon + WAVE); ctx.scale(1, -1);
      ctx.drawImage(canvas, 0, 0, FLOOR_CHUNK, WAVE + depth); ctx.restore();
    }
    // the next chunk in the direction of travel, ahead of time, if nothing was built this frame
    const next = cam.vx < 0 ? first - 1 : last + 1;
    if (!C.built && !C.floorChunks.has(next)) make(next);
  }
  screenLayer(scene, C.img.midground, render.parallax.midground, H * 0.73);
}

// Mild foreground shade keeps the wet terrain readable behind the touch controls.
export function drawForegroundShade(scene) {
  const { ctx, W, H, DPR } = scene.view;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.fillStyle = scene.cache.shade; ctx.fillRect(0, H * 0.72, W, H * 0.28);
}
