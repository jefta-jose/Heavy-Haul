import { wheelRadius } from '../../physics/vehicle.js';
import { makeCanvas } from '../canvas-utils.js';

// Wetness and retained tire impressions live in world space. Their depth comes from the same
// surface/collision separation that actually lets the tires sink, rather than a HUD-only effect.
export function createMudLayer(scene) {
  const { ctx } = scene.view, sim = scene.sim, tracks = [];
  let currentTime = 0, last = new WeakMap(), world = null;
  function update(dt) {
    if (world !== sim.world) { world = sim.world; tracks.length = 0; last = new WeakMap(); }
    for (const t of tracks) t.life -= dt;
    while (tracks.length && tracks[0].life <= 0) tracks.shift();
    for (const v of sim.vehicles) v.parts.wheels.forEach((wheel, i) => {
      const p = wheel.getPosition(), radius = wheelRadius(v.car.rig, i), mud = sim.terrain.mudAt(p.x);
      if (!mud.intensity || p.y - radius > sim.visH(p.x) + 0.05) return;
      const previous = last.get(wheel);
      if (previous != null && Math.abs(p.x - previous) < 0.13) return;
      last.set(wheel, p.x);
      tracks.push({ x: p.x, y: sim.visH(p.x), r: radius, sink: Math.max(0.1, Math.min(1, (sim.visH(p.x) - p.y + radius) / radius)), life: 35, axle: i });
      if (tracks.length > 260) tracks.shift();
    });
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
  function trackStamp(track) {
    const C = scene.cache, px = scene.view.ppm * scene.view.DPR;
    const scaleKey = px.toFixed(4);
    if (C.trackKey !== scaleKey) { C.trackKey = scaleKey; C.trackStamps = new Map(); }
    const sink = Math.round(track.sink * 4) / 4, key = `${track.r}:${sink}`;
    let stamp = C.trackStamps.get(key);
    if (!stamp) {
      const left = track.r * 0.72 + 0.04, top = 0.65, height = 0.8;
      const canvas = makeCanvas(Math.ceil(left * 2 * px), Math.ceil(height * px));
      const g = canvas.getContext('2d'); g.setTransform(px, 0, 0, -px, left * px, top * px);
      for (const off of [0.02, 0.5]) {
        g.fillStyle = '#211e13'; g.beginPath(); g.ellipse(0, off, track.r * 0.65, 0.055 + sink * 0.035, 0, 0, 7); g.fill();
        g.strokeStyle = '#716044'; g.lineWidth = 0.025; g.beginPath(); g.ellipse(0, off - 0.035, track.r * 0.68, 0.045, 0, Math.PI, Math.PI * 2); g.stroke();
      }
      stamp = { canvas, left, top }; C.trackStamps.set(key, stamp);
    }
    return stamp;
  }
  function surface(time) {
    currentTime = time;
    const [lo, hi] = scene.view.viewX();
    cachedSurface(lo, hi);
    // Broken, low-contrast reflections and bubbles make the deep slurry read as liquid.
    for (let x = Math.floor(lo / 1.7) * 1.7; x < hi; x += 1.7) {
      const m = sim.terrain.mudAt(x); if (m.heavy < 0.12) continue;
      const y = sim.visH(x) + 0.27, slope = sim.visH(x + 0.3) - sim.visH(x - 0.3);
      if (Math.abs(slope) > 0.12) continue;
      ctx.fillStyle = `rgba(123,135,104,${m.heavy * 0.28})`; ctx.beginPath(); ctx.ellipse(x, y, 0.6 + Math.sin(x) * 0.18, 0.065, 0, 0, 7); ctx.fill();
      const phase = (time * 0.4 + Math.abs(Math.sin(x * 7))) % 1;
      ctx.strokeStyle = `rgba(166,161,116,${m.heavy * (1 - phase) * 0.15})`; ctx.lineWidth = 0.012; ctx.beginPath(); ctx.ellipse(x + 0.3, y + 0.12, 0.04 + phase * 0.12, 0.015 + phase * 0.025, 0, 0, 7); ctx.stroke();
    }
    for (const t of tracks) {
      if (t.x < lo - 1 || t.x > hi + 1) continue;
      ctx.globalAlpha = Math.min(1, t.life / 8) * (0.3 + t.sink * 0.4);
      const stamp = trackStamp(t), px = scene.view.ppm * scene.view.DPR;
      ctx.save(); ctx.translate(t.x - stamp.left, t.y + stamp.top); ctx.scale(1, -1);
      ctx.drawImage(stamp.canvas, 0, 0, stamp.canvas.width / px, stamp.canvas.height / px); ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
  function foreground() {
    const [lo, hi] = scene.view.viewX(), bottom = scene.view.cam.y - scene.view.H / scene.view.ppm - 2;
    ctx.save(); ctx.beginPath();
    for (let x = lo; x <= hi + 0.25; x += 0.25) ctx.lineTo(x, sim.visH(x) - 0.025 + Math.sin(x * 23) * 0.01);
    ctx.lineTo(hi + 0.25, bottom); ctx.lineTo(lo, bottom); ctx.closePath(); ctx.clip();
    surface(currentTime); ctx.restore();
  }
  return { update, surface, foreground, get trackCount() { return tracks.length; } };
}
