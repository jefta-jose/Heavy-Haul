import { wheelRadius } from '../../physics/vehicle.js';
import { makeCanvas } from '../canvas-utils.js';

// Wet mud patches and the ruts the tires leave. Ruts are a depth profile along the trail (every
// RES metres) that tires press into as they roll: deeper where they sink (the same surface/collision
// separation that sinks them in the physics), deeper again with every pass and while a wheel spins,
// wider under big tires. Soft ground takes deep wet ruts, dirt and gravel lighter packed tracks, rock
// and bridges none. Ruts stay for the whole run, so driving back you find them where you left them;
// they are cleared only when a new run starts or the player goes back to the garage.
const RES = 0.1;
const GIVE = { mud: 1, creek: 0.8, dirt: 0.45, gravel: 0.25 };
const RUT_OFFSETS = [0.5, 0.02];   // far and near wheel tracks, in the lane's elevated view
export function createMudLayer(scene) {
  const { ctx } = scene.view, sim = scene.sim;
  let currentTime = 0, world = null, ruts = null, lastCell = new WeakMap();
  function clear() {
    const { X0, X1 } = sim.terrain, n = Math.ceil((X1 - X0) / RES) + 2;
    ruts = { X0, depth: new Float32Array(n), width: new Float32Array(n), soft: new Float32Array(n), count: 0 };
    lastCell = new WeakMap();
  }
  const cellOf = x => Math.round((x - ruts.X0) / RES);
  function press(x, half, target, widthScale, give, add) {
    const c0 = Math.max(0, cellOf(x - half)), c1 = Math.min(ruts.depth.length - 1, cellOf(x + half));
    for (let c = c0; c <= c1; c++) {
      // rounded contact patch: full depth at the middle of the tire, easing out at its ends
      const u = Math.abs(ruts.X0 + c * RES - x) / half, f = Math.sqrt(Math.max(0, 1 - u * u));
      const before = ruts.depth[c];
      ruts.depth[c] = Math.min(1, Math.max(before, target * f) + add * f);
      if (before < 0.02 && ruts.depth[c] >= 0.02) ruts.count++;
      ruts.width[c] = Math.max(ruts.width[c], widthScale);
      ruts.soft[c] = Math.max(ruts.soft[c], give);
    }
  }
  function update(dt) {
    if (world !== sim.world || !ruts) { world = sim.world; clear(); }
    for (const v of sim.vehicles) v.parts.wheels.forEach((wheel, i) => {
      const p = wheel.getPosition(), radius = wheelRadius(v.car.rig, i), surf = sim.surfAt(p.x), give = GIVE[surf] ?? 0;
      if (!give || sim.terrain.bridgeAt?.(p.x)) return;
      const bottom = p.y - radius, ground = sim.visH(p.x);
      if (bottom > ground + 0.04) return;                         // in the air
      // how far the tire has sunk below the drawn surface, as a share of a deep rut
      const sunk = Math.max(0, Math.min(1, (ground - bottom) / 0.28));
      const target = give * (0.3 + 0.7 * sunk), half = radius * 0.42, widthScale = Math.min(1.6, Math.max(0.8, radius / 0.87));
      const cell = cellOf(p.x), prev = lastCell.get(wheel);
      // each new pass over a stretch deepens it a little; a spinning wheel digs in where it stands
      const vel = wheel.getLinearVelocity().x, spin = Math.abs(wheel.getAngularVelocity() * radius + vel);
      const add = (prev !== cell ? 0.025 * give : 0) + Math.min(0.5, spin * 0.06) * give * dt;
      if (prev !== cell || spin > 1) press(p.x, half, target, widthScale, give, add);
      lastCell.set(wheel, cell);
    });
  }
  // the ruts in view, for each wheel track: a soft-edged groove whose width follows the depth and
  // the tire, a darker bottom, lumpy soil pushed up along both edges and tread chevrons pressed into
  // the bottom. Edges wobble a little so nothing reads as a ruler line.
  function drawRuts(lo, hi) {
    if (!ruts) return;
    const c0 = Math.max(0, cellOf(lo)), c1 = Math.min(ruts.depth.length - 1, cellOf(hi)), D = ruts.depth, W = ruts.width, S = ruts.soft;
    const X = c => ruts.X0 + c * RES;
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
    update, surface, foreground, clear,
    // metres of trail carrying a rut, and the deepest rut at x (for tests)
    get trackCount() { return ruts ? Math.round(ruts.count * RES) : 0; },
    rutAt: x => (ruts ? ruts.depth[cellOf(x)] ?? 0 : 0),
  };
}
