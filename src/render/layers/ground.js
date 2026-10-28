import { hashRandom, makeCanvas } from '../canvas-utils.js';

// Only the tire contact band follows every bump. Across the verge and foreground those bumps
// relax into broader landforms, rather than bending the entire painting into accordion folds.

const COL = 0.25;

function paintBank(scene, lo, hi, ctx, world) {
  const img = scene.images.bank, r = scene.season.render;
  const TILE = r.bankTile, NCOL = TILE / COL, scale = TILE / img.width, sw = img.width / NCOL, { visH } = scene.sim;
  const broad = x => (visH(x - 3) + 2 * visH(x - 1.5) + 3 * visH(x) + 2 * visH(x + 1.5) + visH(x + 3)) / 9;
  const bands = [0, r.bankContactRow * 0.48, r.bankContactRow * 0.8, r.bankContactRow,
    r.bankContactRow + (img.height - r.bankContactRow) * 0.18,
    r.bankContactRow + (img.height - r.bankContactRow) * 0.47, img.height];
  const height = (x, row, smooth) => {
    const depth = (r.bankContactRow - row) * scale;
    const follow = Math.exp(-Math.pow(depth / 0.65, 2));
    return smooth + (visH(x) - smooth) * follow + depth;
  };
  for (let column = Math.floor(lo / COL); column < Math.ceil(hi / COL) + 1; column++) {
    const x = column * COL, smooth = broad(x), next = broad(x + COL);
    const tileIndex = Math.floor(column / NCOL), local = ((column % NCOL) + NCOL) % NCOL, mirror = Math.abs(tileIndex % 2) === 1;
    const sx = (mirror ? NCOL - 1 - local : local) * sw;
    for (let i = 0; i < bands.length - 1; i++) {
      const row = bands[i], end = bands[i + 1], top = height(x, row, smooth), bottom = height(x, end, smooth);
      const slope = (height(x + COL, row, next) - top) / COL;
      ctx.setTransform(...world); ctx.translate(x, top); ctx.transform(1, slope, 0, -1, 0, 0);
      if (mirror) { ctx.translate(COL, 0); ctx.scale(-1, 1); }
      ctx.drawImage(img, sx, row, sw, end - row, 0, 0, COL + 0.015, top - bottom + 0.018);
    }
  }
  ctx.setTransform(...world);
}

function bank(scene, lo, hi) {
  const { ctx, ppm, DPR = 1 } = scene.view, px = ppm * DPR, C = scene.cache;
  const key = `${px.toFixed(4)}:${scene.season.render.bankTile}`;
  if (C.bankKey !== key) { C.bankKey = key; C.bankChunks = new Map(); }
  const chunkWidth = scene.season.render.bankTile / 2, { visH } = scene.sim;
  for (let index = Math.floor(lo / chunkWidth); index <= Math.floor(hi / chunkWidth); index++) {
    let tile = C.bankChunks.get(index);
    if (!tile) {
      const x = index * chunkWidth, end = x + chunkWidth;
      let low = Infinity, high = -Infinity;
      for (let t = x - 3; t <= end + 3; t += COL) { low = Math.min(low, visH(t)); high = Math.max(high, visH(t)); }
      const img = scene.images.bank, r = scene.season.render, scale = r.bankTile / img.width;
      const top = high + r.bankContactRow * scale + 0.1;
      const bottom = low - (img.height - r.bankContactRow) * scale - 0.1;
      const canvas = makeCanvas(Math.ceil(chunkWidth * px), Math.ceil((top - bottom) * px));
      const g = canvas.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
      paintBank(scene, x, end, g, [px, 0, 0, -px, -x * px, top * px]);
      tile = { canvas, x, top }; C.bankChunks.set(index, tile);
      // Keep memory bounded while crossing a long trail or teleporting between checkpoints.
      if (C.bankChunks.size > 20) C.bankChunks.delete(C.bankChunks.keys().next().value);
    }
    ctx.save(); ctx.translate(tile.x, tile.top); ctx.scale(1, -1);
    ctx.drawImage(tile.canvas, 0, 0, tile.canvas.width / px, tile.canvas.height / px); ctx.restore();
  }
}

export function drawGround(scene) {
  const { ctx, cam, H, ppm } = scene.view, [xa, xb] = scene.view.viewX();
  // Fill under the ENTIRE terrain contour first. A single height sampled at the camera centre
  // leaves wedges on slopes; this silhouette always extends beyond the viewport bottom.
  const bottom = cam.y - H / ppm - 2;
  ctx.save(); ctx.beginPath();
  for (let x = xa; x <= xb + COL; x += COL) {
    const y = scene.sim.visH(x) + 0.1;
    if (x === xa) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.lineTo(xb + COL, bottom); ctx.lineTo(xa, bottom); ctx.closePath();
  ctx.fillStyle = scene.cache.deepPat; ctx.fill(); ctx.restore();
  bank(scene, xa, xb);
}

// Restores real mud in front of the sunk tire bottoms along an irregular lip, near the vehicle only.
export function drawFrontLip(scene) {
  const { ctx, cam, H, ppm } = scene.view, { visH } = scene.sim;
  const x = scene.sim.truck.getPosition().x, lo = x - 5, hi = x + 5, bottom = cam.y - H / ppm - 5;
  ctx.save(); ctx.beginPath();
  for (let t = lo; t <= hi + 0.08; t += 0.08) { const lip = visH(t) - 0.04 + Math.sin(t * 18.7) * 0.018 + Math.sin(t * 7.3) * 0.027; if (t === lo) ctx.moveTo(t, lip); else ctx.lineTo(t, lip); }
  ctx.lineTo(hi + 0.1, bottom); ctx.lineTo(lo, bottom); ctx.closePath(); ctx.clip(); bank(scene, lo, hi); ctx.restore();
}

// A broad worn trail blended into its shoulders, with two irregular tire ruts. Materials remain
// world-anchored; there is no solid dark ribbon or ruler-straight outline over the painted bank.
export function drawLane(scene) {
  const { ctx } = scene.view, { visH, surfAt, terrain } = scene.sim, C = scene.cache, tints = scene.season.render.lane.tints;
  const [lo, hi] = scene.view.viewX(), x0 = Math.floor(lo / COL) * COL, x1 = Math.ceil(hi / COL) * COL, BLEND = 2;
  const laneTop = x => (visH(x - 1) + 2 * visH(x) + visH(x + 1)) / 4 + 0.82 + Math.sin(x * 1.7) * 0.04 + Math.sin(x * 0.53) * 0.08;
  const lanePath = (a, b) => {
    ctx.beginPath();
    for (let x = a; x < b; x += COL) ctx.lineTo(x, laneTop(x));
    ctx.lineTo(b, laneTop(b)); ctx.lineTo(b, visH(b) - 0.13);
    for (let x = Math.floor(b / COL) * COL; x > a; x -= COL) ctx.lineTo(x, visH(x) - 0.13);
    ctx.lineTo(a, visH(a) - 0.13); ctx.closePath();
  };
  // zone ends cross-fade in slices so material changes are gradual
  for (const [a, b, s] of terrain.zones) {
    if (b + BLEND < lo || a - BLEND > hi) continue;
    const za = Math.max(a - BLEND, x0), zb = Math.min(b + BLEND, x1);
    const slice = (p, q, alpha) => {
      if (q <= p) return;
      ctx.save(); lanePath(p, q); ctx.clip();
      // Several translucent, overlapping bands fade into the verge and near shoulder.
      for (let band = 0; band < 6; band++) {
        const offset = band * 0.025;
        ctx.beginPath();
        for (let x = p; x <= q + COL; x += COL) ctx.lineTo(x, laneTop(Math.min(x, q)) - offset);
        for (let x = q; x >= p - COL; x -= COL) ctx.lineTo(x, visH(Math.max(x, p)) - 0.13 + offset);
        ctx.closePath(); ctx.globalAlpha = alpha / 6; ctx.fillStyle = C.lanePat[s]; ctx.fill();
        ctx.globalAlpha = alpha / 9; ctx.fillStyle = tints[s]; ctx.fill();
      }
      ctx.restore();
    };
    const inner0 = Math.max(za, a + BLEND), inner1 = Math.min(zb, b - BLEND);
    slice(inner0, inner1, 0.7);
    for (let k = 0; k < 4; k++) {
      const w = BLEND * 2 / 4, alpha = 0.7 * (k + 0.5) / 4;
      slice(Math.max(za, a - BLEND + k * w), Math.min(inner0, a - BLEND + (k + 1) * w, zb), alpha);
      slice(Math.max(inner1, b + BLEND - (k + 1) * w, za), Math.min(zb, b + BLEND - k * w), alpha);
    }
  }
  ctx.lineCap = 'round';
  const line = (off, width, style) => { ctx.strokeStyle = style; ctx.lineWidth = width; ctx.beginPath(); for (let x = x0; x <= x1; x += COL) ctx.lineTo(x, typeof off === 'function' ? off(x) : visH(x) + off); ctx.stroke(); };
  const rut = (x, off) => visH(x) + off + Math.sin(x * 0.73) * 0.035 + Math.sin(x * 2.1) * 0.012;
  for (const off of [0.06, 0.56]) {
    line(x => rut(x, off), 0.15, 'rgba(35,27,18,0.12)');
    line(x => rut(x, off), 0.07, 'rgba(24,21,15,0.12)');
    line(x => rut(x, off) + 0.06, 0.025, 'rgba(191,171,127,0.10)');
  }
  // puddle glints in the wet sections
  for (let x = Math.floor(lo / 3) * 3; x < hi; x += 3) {
    const s = surfAt(x), r = hashRandom(x * 1.7); if ((s !== 'mud' && s !== 'creek') || r < 0.45) continue;
    const slope = (visH(x + 0.5) - visH(x - 0.5));
    if (Math.abs(slope) > 0.18) continue; // standing water gathers in low, nearly level patches
    ctx.fillStyle = `rgba(153,177,179,${0.08 + r * 0.1})`; ctx.beginPath(); ctx.ellipse(x + r, visH(x) + 0.2 + r * 0.12, 0.25 + r * 0.45, 0.025, 0, 0, 7); ctx.fill();
  }
}
