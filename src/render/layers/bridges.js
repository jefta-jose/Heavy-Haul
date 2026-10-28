// Every board reads its physical body's transform, including when a hinge cracks or lets go.
export function createBridgeLayer(scene) {
  const { ctx } = scene.view, sim = scene.sim;
  function boards() {
    const [lo, hi] = scene.view.viewX();
    for (const bridge of sim.bridges) {
      if (bridge.x1 < lo || bridge.x0 > hi) continue;
      for (const plank of bridge.boards) {
        const p = plank.body.getPosition(), L = plank.length;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(plank.body.getAngle());
        ctx.fillStyle = scene.cache.bridgePat ?? '#655440';
        ctx.beginPath(); ctx.moveTo(-L / 2, 0.1); ctx.lineTo(L / 2, 0.1); ctx.lineTo(L / 2 + 0.18, 0.65); ctx.lineTo(-L / 2 + 0.18, 0.65); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#30291f'; ctx.lineWidth = 0.02; ctx.stroke();
        ctx.fillRect(-L / 2, -0.1, L, 0.2); ctx.fillStyle = 'rgba(13,16,10,.4)'; ctx.fillRect(-L / 2, -0.1, L, 0.09);
        ctx.fillStyle = '#272823'; for (const x of [-L * 0.3, L * 0.3]) { ctx.beginPath(); ctx.arc(x, 0.2, 0.025, 0, 7); ctx.fill(); }
        if (plank.cracked) {
          ctx.strokeStyle = '#20170f'; ctx.lineWidth = 0.018 + plank.damage * 0.025; ctx.beginPath();
          ctx.moveTo(-L * 0.35, 0.57); ctx.lineTo(-0.02, 0.35); ctx.lineTo(-0.08, 0.25); ctx.lineTo(L * 0.3, 0.1); ctx.stroke();
        }
        ctx.restore();
      }
      for (const [x, y] of [[bridge.x0, bridge.y0], [bridge.x1, bridge.y1]]) {
        ctx.fillStyle = scene.cache.bridgePat ?? '#655440'; ctx.fillRect(x - 0.09, y - 0.65, 0.18, 2.05);
        ctx.strokeStyle = '#463b28'; ctx.lineWidth = 0.025; ctx.strokeRect(x - 0.09, y - 0.65, 0.18, 2.05);
      }
      rope(bridge, 0.62);
    }
  }
  function rope(bridge, depth) {
    ctx.strokeStyle = '#89744f'; ctx.lineWidth = 0.04; ctx.beginPath();
    ctx.moveTo(bridge.x0, bridge.y0 + 1.1 + depth);
    for (const plank of bridge.boards) {
      const p = plank.body.getPosition(); ctx.lineTo(p.x, p.y + 1.0 + depth);
    }
    ctx.lineTo(bridge.x1, bridge.y1 + 1.1 + depth); ctx.stroke();
    ctx.strokeStyle = 'rgba(83,73,48,.75)'; ctx.lineWidth = 0.02;
    for (const plank of bridge.boards.filter((_, i) => i % 3 === 0)) {
      const p = plank.body.getPosition(); ctx.beginPath(); ctx.moveTo(p.x, p.y + 0.1 + depth); ctx.lineTo(p.x, p.y + 1 + depth); ctx.stroke();
    }
  }
  return { draw: boards, drawFront() { const [lo, hi] = scene.view.viewX(); for (const b of sim.bridges) if (b.x1 > lo && b.x0 < hi) rope(b, 0); } };
}
