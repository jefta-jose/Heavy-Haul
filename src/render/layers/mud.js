import { makeCanvas } from '../canvas-utils.js';

// Wet mud patches and the ruts the tires leave. The ruts are the physics' own: the ground field
// (physics/ground.js) the tires press into, deeper under heavy loads and while they stand or spin,
// healing slowly where nothing presses. Its depth in metres is drawn as a groove on both wheel
// tracks; it lasts across runs and visits, so a road a heavy truck worked stays rutted.
const RUT_FULL = 0.25;                 // metres of rut drawn as a full-depth groove
const RUT_OFFSETS = [0.5, 0.02];       // far and near wheel tracks, in the lane's elevated view
export function createMudLayer(scene) {
  const { ctx } = scene.view, sim = scene.sim, ground = sim.ground, T = sim.terrain;
  let currentTime = 0;
  const cellOf = x => Math.round((x - T.X0) / T.step);
  const D = new Float32Array(T.N), W = new Float32Array(T.N), S = new Float32Array(T.N);
  function update() {}
  // the ruts in view, for each wheel track: a soft-edged groove whose width follows the depth and
  // the tire, a darker bottom, lumpy soil pushed up along both edges and tread chevrons pressed into
  // the bottom. Edges wobble a little so nothing reads as a ruler line.
  function drawRuts(lo, hi) {
    const c0 = Math.max(0, cellOf(lo)), c1 = Math.min(T.N - 1, cellOf(hi)), X = c => T.X0 + c * T.step;
    // depth 0..1 for drawing, tire width, and how soft the ground is (wet grooves on mud and creek),
    // copied for the cells in view
    for (let k = c0; k <= c1; k++) { D[k] = Math.min(1, T.dent[k] / RUT_FULL); W[k] = ground.widthAt(k) || 1; S[k] = ground.giveAt(k); }
    const wob = x => Math.sin(x * 9.1) * 0.006 + Math.sin(x * 23.7) * 0.004;
    const band = (start, end, top, bottom) => {
      ctx.beginPath();
      for (let k = start; k <= end; k++) ctx.lineTo(X(k), top(k));
      for (let k = end; k >= start; k--) ctx.lineTo(X(k), bottom(k));
      ctx.closePath();
    };
    for (const off of RUT_OFFSETS) {
      let c = c0;
      while (c <= c1) {
        while (c <= c1 && D[c] < 0.02) c++;
        if (c > c1) break;
        const start = c; while (c <= c1 && D[c] >= 0.02) c++;
        const end = c - 1, wet = (S[start] + S[end]) / 2 >= 0.6;
        const half = k => (0.012 + Math.sqrt(D[k]) * 0.118) * W[k];
        const mid = k => sim.visH(X(k)) + off + wob(X(k));
        // soft outer edge, then the groove, then its deeper bottom
        for (const [grow, alpha] of [[1.35, 0.18], [1.12, 0.3], [1, 0.42]]) {
          band(start, end, k => mid(k) + half(k) * 0.6 * grow, k => mid(k) - half(k) * grow);
          ctx.fillStyle = wet ? `rgba(30,24,15,${alpha})` : `rgba(58,44,29,${alpha * 0.85})`; ctx.fill();
        }
        band(start, end, k => mid(k) - half(k) * 0.05, k => mid(k) - half(k) * (0.35 + D[k] * 0.5));
        ctx.fillStyle = wet ? 'rgba(14,11,7,0.45)' : 'rgba(40,30,19,0.3)'; ctx.fill();
        // pushed-up soil: lumpy lighter lips along both edges
        for (const [edge, alpha] of [[0.6, 0.5], [-1, 0.32]]) {
          ctx.beginPath();
          for (let k = start; k <= end; k++) {
            const x = X(k), lump = (Math.sin(x * 31) * 0.5 + Math.sin(x * 57) * 0.5) * 0.012 * D[k];
            ctx.lineTo(x, mid(k) + half(k) * edge + Math.sign(edge) * (0.014 + lump));
          }
          ctx.strokeStyle = wet ? `rgba(118,98,67,${alpha})` : `rgba(156,133,96,${alpha * 0.7})`;
          ctx.lineWidth = 0.02 + 0.018 * Math.max(D[start], D[end]); ctx.stroke();
        }
        // tread chevrons across the bottom
        ctx.strokeStyle = wet ? 'rgba(8,6,4,0.4)' : 'rgba(36,27,17,0.35)'; ctx.lineWidth = 0.018; ctx.beginPath();
        for (let k = start + 1; k < end; k += 2) {
          if (D[k] < 0.1) continue;
          const x = X(k), y = mid(k), h = half(k);
          ctx.moveTo(x - 0.045, y + h * 0.35); ctx.lineTo(x + 0.02, y - h * 0.25); ctx.lineTo(x - 0.045, y - h * 0.85);
        }
        ctx.stroke();
      }
    }
  }
  function paintSurface(ctx, lo, hi) {
    const patch = (a, b, strength, shape) => {
      a = Math.max(a, lo); b = Math.min(b, hi); if (b <= a) return;
      ctx.save();
      for (let feather = 0; feather < 3; feather++) {
        ctx.beginPath();
        for (let x = a; x < b; x += 0.25) ctx.lineTo(x, sim.visH(x) + (1.45 - feather * 0.18) * shape(x));
        ctx.lineTo(b, sim.visH(b) + (1.45 - feather * 0.18) * shape(b));
        for (let x = b; x > a; x -= 0.25) ctx.lineTo(x, sim.visH(x) - (0.65 - feather * 0.1) * shape(x));
        ctx.lineTo(a, sim.visH(a) - (0.65 - feather * 0.1) * shape(a)); ctx.closePath();
        ctx.globalAlpha = strength; ctx.fillStyle = scene.cache.deepMudPat ?? '#382f20'; ctx.fill();
      }
      ctx.restore();
    };
    // Continuous paths avoid the double-alpha seams produced by overlapping translucent columns.
    for (const [a, b, surface] of sim.terrain.zones) if (surface === 'mud') {
      patch(a, b, 0.12, x => sim.terrain.mudAt(x).intensity * 0.75);
    }
    for (const centre of sim.trail.heavyMud) {
      patch(centre - 10, centre + 10, 0.32, x => sim.terrain.mudAt(x).heavy);
    }
  }
  function cachedSurface(lo, hi) {
    const C = scene.cache, px = scene.view.ppm * scene.view.DPR, key = px.toFixed(4), width = 7;
    if (C.mudKey !== key) { C.mudKey = key; C.mudChunks = new Map(); }
    for (let index = Math.floor(lo / width); index <= Math.floor(hi / width); index++) {
      let tile = C.mudChunks.get(index);
      if (!tile) {
        const x = index * width, end = x + width;
        let low = Infinity, high = -Infinity, wet = false;
        for (let t = x; t <= end + 0.25; t += 0.25) {
          low = Math.min(low, sim.visH(t)); high = Math.max(high, sim.visH(t));
          wet ||= sim.terrain.mudAt(t).intensity > 0;
        }
        tile = { x, top: high + 1.65, canvas: null };
        if (wet) {
          tile.canvas = makeCanvas(Math.ceil(width * px), Math.ceil((high - low + 2.5) * px));
          const g = tile.canvas.getContext('2d'); g.setTransform(px, 0, 0, -px, -x * px, tile.top * px);
          paintSurface(g, x, end);
        }
        C.mudChunks.set(index, tile);
        if (C.mudChunks.size > 20) C.mudChunks.delete(C.mudChunks.keys().next().value);
      }
      if (tile.canvas) {
        ctx.save(); ctx.translate(tile.x, tile.top); ctx.scale(1, -1);
        ctx.drawImage(tile.canvas, 0, 0, width, tile.canvas.height / px); ctx.restore();
      }
    }
  }
  function surface(time) {
    currentTime = time;
    const [lo, hi] = scene.view.viewX();
    cachedSurface(lo, hi);
    // Slow bubbles make the deep slurry read as liquid (no reflections: the user removed them).
    for (let x = Math.floor(lo / 1.7) * 1.7; x < hi; x += 1.7) {
      const m = sim.terrain.mudAt(x); if (m.heavy < 0.12) continue;
      const y = sim.visH(x) + 0.27, slope = sim.visH(x + 0.3) - sim.visH(x - 0.3);
      if (Math.abs(slope) > 0.12) continue;
      const phase = (time * 0.4 + Math.abs(Math.sin(x * 7))) % 1;
      ctx.strokeStyle = `rgba(166,161,116,${m.heavy * (1 - phase) * 0.15})`; ctx.lineWidth = 0.012; ctx.beginPath(); ctx.ellipse(x + 0.3, y + 0.12, 0.04 + phase * 0.12, 0.015 + phase * 0.025, 0, 0, 7); ctx.stroke();
    }
    drawRuts(lo - 1, hi + 1);
  }
  function foreground() {
    const [lo, hi] = scene.view.viewX(), bottom = scene.view.cam.y - scene.view.H / scene.view.ppm - 2;
    ctx.save(); ctx.beginPath();
    for (let x = lo; x <= hi + 0.25; x += 0.25) ctx.lineTo(x, sim.visH(x) - 0.025 + Math.sin(x * 23) * 0.01);
    ctx.lineTo(hi + 0.25, bottom); ctx.lineTo(lo, bottom); ctx.closePath(); ctx.clip();
    surface(currentTime); ctx.restore();
  }
  return {
    update, surface, foreground,
    // metres of trail carrying a rut, and the rut at x as drawn, 0..1 (for tests)
    get trackCount() { return Math.round(ground.rutMetres); },
    rutAt: x => Math.min(1, ground.depthAt(x) / RUT_FULL),
  };
}
