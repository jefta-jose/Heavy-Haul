// Translucent water drawn in front of the vehicle so wading tires read as submerged, plus ripple
// rings around tires in mud and water.

export const waterAt = (sim, x) => sim.terrain.waters.find(q => x > q.x0 && x < q.x1)
  ?? (sim.terrain.mudAt(x).heavy > 0.15 ? { level: sim.visH(x) + 0.015, muddy: true } : null);

export function drawWater(scene, time) {
  const { ctx } = scene.view, [lo, hi] = scene.view.viewX(), { visH } = scene.sim;
  for (const q of scene.sim.terrain.waters) {
    if (q.x1 < lo || q.x0 > hi) continue;
    const a = Math.max(q.x0, lo - 1), b = Math.min(q.x1, hi + 1);
    const surf = x => q.level + Math.sin(x * 1.9 + time * 1.6) * 0.018 + Math.sin(x * 0.7 - time * 0.9) * 0.02;
    const g = ctx.createLinearGradient(0, q.level + 0.05, 0, q.level - 1); g.addColorStop(0, 'rgba(120,140,128,0.62)'); g.addColorStop(0.25, 'rgba(66,78,58,0.66)'); g.addColorStop(1, 'rgba(40,46,32,0.78)');
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
