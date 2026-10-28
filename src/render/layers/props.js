import { makeCanvas, hashRandom } from '../canvas-utils.js';

// Scenery and obstacles: reeds and logs behind and in front of the trail, boulders and
// crushable rocks drawn on their physics bodies, fallen logs across the track.

export function createProps(scene) {
  const back = [], front = [];
  const { X0, X1 } = scene.sim.terrain;
  for (let x = X0 + 10; x < X1; x += 2.7) {
    const r = hashRandom(x + 11);
    if (r > 0.42) back.push({ x: x + hashRandom(x + 5), key: r > 0.9 ? 'log' : 'reeds', w: r > 0.9 ? 2.8 : 0.8 + hashRandom(x + 7) * 0.8, y: 1.5, flip: hashRandom(x + 1) > 0.5 });
    if (hashRandom(x + 19) > 0.4) front.push({ x: x + hashRandom(x + 3), key: hashRandom(x + 23) > 0.85 ? 'log' : 'reeds', w: 0.55 + hashRandom(x + 27) * 0.85, y: -0.9 - hashRandom(x + 8) * 1.4, flip: hashRandom(x + 4) > 0.5 });
  }
  let barkPattern = null;
  const LOG_DEPTH = [0.32, 0.8];   // across the road, so trunks have convincing volume

  function sprite(key, x, y, width, flip = false) {
    const { ctx } = scene.view, img = scene.cache.img[key], h = width * img.height / img.width;
    const base = key === 'reeds' ? 0.95 : key === 'rock' ? 0.94 : 0.9;
    ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -1 : 1, -1);
    ctx.drawImage(img, -width / 2, -h * base, width, h); ctx.restore();
  }
  function drawList(list) {
    const [lo, hi] = scene.view.viewX(), { visH } = scene.sim;
    for (const p of list) if (p.x > lo - 3 && p.x < hi + 3) sprite(p.key, p.x, visH(p.x) + p.y, p.w, p.flip);
  }
  function rocks() {
    const { ctx } = scene.view, [lo, hi] = scene.view.viewX(), img = scene.cache.img.rock, { visH } = scene.sim;
    for (const r of scene.sim.rocks) if (r.x > lo - 2 && r.x < hi + 2 && r.alive !== false) {
      const base = visH(r.x) - 0.06, w = r.w, h = r.above + (r.crush ? 0.1 : 0.16);
      ctx.save(); ctx.translate(r.x, base); ctx.scale(r.flip ? -1 : 1, -1);
      if (r.crush) ctx.globalAlpha = 0.95;
      ctx.drawImage(img, -w / 2, -h, w, h);
      if (r.crush) {   // hairline cracks mark the breakable shale
        ctx.strokeStyle = 'rgba(30,26,20,0.55)'; ctx.lineWidth = 0.018; ctx.beginPath();
        ctx.moveTo(-w * 0.18, -h * 0.1); ctx.lineTo(-w * 0.04, -h * 0.5); ctx.lineTo(w * 0.12, -h * 0.35); ctx.moveTo(-w * 0.04, -h * 0.5); ctx.lineTo(0, -h * 0.85); ctx.stroke();
      }
      ctx.restore();
    }
  }
  function bark() {
    if (barkPattern) return barkPattern;
    const img = scene.images.log, c = makeCanvas(420, 110);
    c.getContext('2d').drawImage(img, img.width * 0.5, img.height * 0.5, img.width * 0.24, img.height * 0.13, 0, 0, 420, 110);
    return (barkPattern = scene.view.ctx.createPattern(c, 'repeat'));
  }
  // the bark length recedes toward the far verge, behind the vehicle
  function logsBehind() {
    const { ctx } = scene.view, [lo, hi] = scene.view.viewX(), pat = bark();
    const [dx, dy] = LOG_DEPTH, len = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
    for (const l of scene.sim.logs) {
      if (l.x < lo - 2 || l.x > hi + 2) continue;
      ctx.save(); ctx.translate(l.x, l.y); ctx.rotate(a);
      pat.setTransform(new DOMMatrix([l.r * 2 / 110, 0, 0, l.r * 2 / 110, 0, -l.r]));
      ctx.beginPath(); ctx.ellipse(len, 0, l.r * 0.55, l.r, 0, -Math.PI / 2, Math.PI / 2); ctx.lineTo(0, l.r); ctx.lineTo(0, -l.r); ctx.closePath();
      ctx.fillStyle = pat; ctx.fill();
      const sh = ctx.createLinearGradient(0, -l.r, 0, l.r); sh.addColorStop(0, 'rgba(10,8,4,0.55)'); sh.addColorStop(0.55, 'rgba(10,8,4,0)'); sh.addColorStop(1, 'rgba(255,240,200,0.12)');
      ctx.fillStyle = sh; ctx.fill(); ctx.restore();
    }
  }
  // the sawn end faces the camera, in front of the near tires
  function logEnds() {
    const { ctx } = scene.view, [lo, hi] = scene.view.viewX();
    for (const l of scene.sim.logs) {
      if (l.x < lo - 2 || l.x > hi + 2) continue;
      const r = l.r;
      const end = scene.cache.img.logEnd;
      if (end) {
        ctx.save(); ctx.translate(l.x, l.y); ctx.scale(1, -1); ctx.rotate((l.seed - 0.5) * 0.35);
        ctx.drawImage(end, -r, -r, r * 2, r * 2); ctx.restore();
        continue;
      }
      ctx.fillStyle = '#3a2a19'; ctx.beginPath(); ctx.arc(l.x, l.y, r, 0, 7); ctx.fill();
      const g = ctx.createRadialGradient(l.x - r * 0.2, l.y + r * 0.2, 0, l.x, l.y, r * 0.85); g.addColorStop(0, '#d8b47a'); g.addColorStop(1, '#9c7444');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(l.x, l.y, r * 0.84, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(92,62,32,0.55)'; ctx.lineWidth = r * 0.05;
      for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.arc(l.x + r * 0.05, l.y - r * 0.03, r * 0.2 * k, 0, 7); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(60,38,18,0.7)'; ctx.lineWidth = r * 0.07; ctx.beginPath(); ctx.moveTo(l.x, l.y); ctx.lineTo(l.x + r * 0.7 * Math.cos(l.seed * 6), l.y + r * 0.7 * Math.sin(l.seed * 6)); ctx.stroke();
      ctx.fillStyle = 'rgba(98,122,52,0.55)'; ctx.beginPath(); ctx.ellipse(l.x - r * 0.2, l.y + r * 0.88, r * 0.6, r * 0.16, 0, 0, 7); ctx.fill();
    }
  }

  return {
    drawBehind() { drawList(back); rocks(); logsBehind(); },
    drawLogEnds: logEnds,
    drawFront() { drawList(front); },
  };
}
