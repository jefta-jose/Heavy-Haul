// Ripple rings and splash levels in deep mud.
export const waterAt = (sim, x) => sim.terrain.mudHeavyAt(x) > 0.15
  ? { level: sim.visH(x) + 0.015, muddy: true } : null;

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
