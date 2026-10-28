// Offscreen canvas helpers used to pre-render sprites once instead of every frame.

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
  return c;
}

// Runtime registration for generated sprites with generous transparent margins. Crop once in
// memory; preserve the original master and ignore almost-transparent fringe pixels.
export function alphaCrop(img) {
  const source = makeCanvas(img.width, img.height), g = source.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const data = g.getImageData(0, 0, img.width, img.height).data;
  let x0 = img.width, y0 = img.height, x1 = 0, y1 = 0;
  for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) if (data[(y * img.width + x) * 4 + 3] > 128) {
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  if (x0 > x1 || y0 > y1) return source;
  const out = makeCanvas(x1 - x0 + 1, y1 - y0 + 1);
  out.getContext('2d').drawImage(source, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}

// Resample an image by factor k, halving step by step for quality on large reductions.
export function scaled(img, k) {
  let src = img, w = img.width, h = img.height;
  const tw = Math.max(1, Math.round(img.width * k)), th = Math.max(1, Math.round(img.height * k));
  while (w / 2 >= tw * 1.05) {
    const c = makeCanvas(w / 2, h / 2), g = c.getContext('2d');
    g.imageSmoothingQuality = 'high'; g.drawImage(src, 0, 0, c.width, c.height);
    src = c; w = c.width; h = c.height;
  }
  const out = makeCanvas(tw, th), g = out.getContext('2d');
  g.imageSmoothingQuality = 'high'; g.drawImage(src, 0, 0, tw, th);
  return out;
}

// Solid-color silhouette of a sprite (used for the 4x4 / DIFF outline).
export function tinted(src, color) {
  const c = makeCanvas(src.width, src.height), g = c.getContext('2d');
  g.drawImage(src, 0, 0); g.globalCompositeOperation = 'source-in';
  g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
  return c;
}

// Soft round particle sprite.
export function puff(r, g, b) {
  const c = makeCanvas(64, 64), x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, `rgba(${r},${g},${b},1)`); gr.addColorStop(0.55, `rgba(${r},${g},${b},0.55)`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  return c;
}

// Deterministic per-position randomness for scenery placement.
export const hashRandom = n => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };

export function loadImages(sources) {
  const images = {}, ok = {};
  const keys = Object.keys(sources);
  const ready = Promise.all(keys.map(key => new Promise(resolve => {
    const img = new Image();
    images[key] = img; ok[key] = false;
    img.onload = () => { ok[key] = true; resolve(); };
    img.onerror = () => { console.error(`Artwork failed to load: ${key}`); resolve(); };
    img.src = sources[key];
  })));
  return { images, ready, status: () => ({ ...ok }), allLoaded: () => keys.every(k => ok[k]) };
}
