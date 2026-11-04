import { roadSpan } from './ground.js';

// Translucent water drawn in front of the vehicle so wading tires read as submerged, plus ripple
// rings around tires in mud and water.

export const waterAt = (sim, x) => sim.terrain.waters.find(q => x > q.x0 && x < q.x1)
  ?? (sim.terrain.mudAt(x).heavy > 0.15 ? { level: sim.visH(x) + 0.015, muddy: true } : null);

// On a thick road, water lies in pools across the road, one per dip, with rounded shores. The part behind
// the waterline goes under the vehicles (drawWaterBack), the part in front over their tires.
function drawPools(scene, q, time, span, front) {
  const { ctx } = scene.view, [lo, hi] = scene.view.viewX(), { visH } = scene.sim;
  const surf = x => q.level + Math.sin(x * 1.9 + time * 1.6) * 0.012 + Math.sin(x * 0.7 - time * 0.9) * 0.014;
  const pool = (p, e) => {
    const c = (p + e) / 2, L = (e - p) / 2, shape = x => Math.sqrt(Math.max(0, 1 - ((x - c) / L) ** 2));
    const step = Math.max(0.1, L / 24);
    ctx.beginPath();
    for (let x = p; x < e; x += step) ctx.lineTo(x, surf(x));
    ctx.lineTo(e, surf(e));
    for (let x = e; x > p; x -= step) ctx.lineTo(x, front ? q.level - span.near * 0.8 * shape(x) : q.level + span.far * 0.55 * shape(x));
    ctx.closePath();
    const g = ctx.createLinearGradient(0, q.level + (front ? 0 : span.far * 0.55), 0, q.level - (front ? span.near * 0.8 : 0));
    if (front) { g.addColorStop(0, 'rgba(116,146,132,0.5)'); g.addColorStop(1, 'rgba(58,74,58,0.62)'); }
    else { g.addColorStop(0, 'rgba(92,120,112,0.86)'); g.addColorStop(1, 'rgba(120,150,136,0.86)'); }
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(214,228,222,0.32)'; ctx.lineWidth = 0.022; ctx.stroke();
  };
  let start = null;
  for (let x = Math.max(q.x0, lo - 2); x <= Math.min(q.x1, hi + 2) + 0.2; x += 0.2) {
    if (visH(x) < q.level && x <= q.x1) start ??= x;
    else if (start != null) { if (x - start > 0.8) pool(start, x); start = null; }
  }
}
export function drawWaterBack(scene, time) {
  const span = roadSpan(scene), [lo, hi] = scene.view.viewX(); if (!span) return;
  for (const q of scene.sim.terrain.waters) if (q.x1 >= lo && q.x0 <= hi) drawPools(scene, q, time, span, false);
}

export function drawWater(scene, time) {
  const { ctx } = scene.view, [lo, hi] = scene.view.viewX(), { visH } = scene.sim, span = roadSpan(scene);
  for (const q of scene.sim.terrain.waters) {
    if (q.x1 < lo || q.x0 > hi) continue;
    if (span) { drawPools(scene, q, time, span, true); continue; }
    const a = Math.max(q.x0, lo - 1), b = Math.min(q.x1, hi + 1);
    const surf = x => q.level + Math.sin(x * 1.9 + time * 1.6) * 0.018 + Math.sin(x * 0.7 - time * 0.9) * 0.02;
    // murky near the surface, clearing with depth so a deep gully (under a bridge) shows its banks
    // through the water instead of reading as a solid box
    const g = ctx.createLinearGradient(0, q.level + 0.05, 0, q.level - 1.8); g.addColorStop(0, 'rgba(120,140,128,0.6)'); g.addColorStop(0.18, 'rgba(66,78,58,0.6)'); g.addColorStop(0.55, 'rgba(48,56,40,0.38)'); g.addColorStop(1, 'rgba(40,46,32,0.12)');
    // Fill only the submerged intervals. Joining dry samples to the basin's water level
    // paints large translucent rectangles and waterfalls across otherwise dry approaches.
    let wet = [];
    const flush = () => {
      if (wet.length < 2) { wet = []; return; }
      ctx.beginPath();
      wet.forEach(x => ctx.lineTo(x, Math.min(surf(x), Math.max(q.level - 0.025, visH(x)))));
      for (let i = wet.length - 1; i >= 0; i--) ctx.lineTo(wet[i], visH(wet[i]) - 0.03);
      ctx.closePath(); ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = 'rgba(214,228,222,0.4)'; ctx.lineWidth = 0.022; ctx.beginPath();
      wet.forEach(x => ctx.lineTo(x, surf(x))); ctx.stroke(); wet = [];
    };
    for (let x = a; x <= b + 0.1; x += 0.2) { if (visH(x) < q.level) wet.push(x); else flush(); }
    flush();
  }
}

export function drawRipples(scene, time) {
  const { ctx } = scene.view, sim = scene.sim;
  for (const w of sim.wheels) {
    const p = w.getPosition(); if (!['mud', 'creek'].includes(sim.surfAt(p.x))) continue;
    const gy = waterAt(sim, p.x)?.level ?? sim.visH(p.x), moving = Math.min(1, Math.abs(w.getAngularVelocity()) * 0.4);
    for (let j = 0; j < 3; j++) {
      const phase = (time * (0.45 + moving) + j / 3) % 1;
      ctx.strokeStyle = `rgba(189,207,201,${(1 - phase) * (0.09 + moving * 0.18)})`; ctx.lineWidth = 0.014;
      ctx.beginPath(); ctx.ellipse(p.x - phase * 0.1, gy - 0.02, 0.18 + phase * 0.8, 0.025 + phase * 0.07, 0, 0, Math.PI * 2); ctx.stroke();
    }
  }
}
