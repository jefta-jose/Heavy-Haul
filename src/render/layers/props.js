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
  // the rock art in the scene's shaded light: a darker copy made once per zoom level (a per-frame
  // ctx.filter is far too slow)
  let shadedFor = null, shaded = null;
  function rockImage() {
    const img = scene.cache.img.rock;
    if (shadedFor !== img) {
      shadedFor = img; shaded = makeCanvas(img.width, img.height);
      const g = shaded.getContext('2d'); g.drawImage(img, 0, 0);
      g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(44,34,22,0.16)'; g.fillRect(0, 0, img.width, img.height);
    }
    return shaded;
  }
  function rocks() {
    const { ctx } = scene.view, [lo, hi] = scene.view.viewX(), img = rockImage(), { visH } = scene.sim;
    for (const r of scene.sim.rocks) if (r.x > lo - 2 && r.x < hi + 2 && r.alive !== false) {
      const w = r.w, h = r.h, gy = visH(r.x);
      // seated in the ground: a soft contact shadow behind the base
      ctx.fillStyle = 'rgba(20,15,9,0.35)'; ctx.beginPath(); ctx.ellipse(r.x + w * 0.06, gy + 0.05, w * 0.62, 0.1 + h * 0.12, 0, 0, 7); ctx.fill();
      ctx.save(); ctx.beginPath();
      ctx.moveTo(r.x - w, visH(r.x - w) - 0.035);
      for (let x = r.x - w; x <= r.x + w + 0.1; x += 0.1) ctx.lineTo(x, visH(x) - 0.035);
      ctx.lineTo(r.x + w, visH(r.x) + 10); ctx.lineTo(r.x - w, visH(r.x) + 10); ctx.closePath(); ctx.clip();
      ctx.translate(r.x, r.y); ctx.scale(r.flip ? -1 : 1, -1);
      if (r.crush) ctx.globalAlpha = 0.95;
      // natural proportions: the top matches the physical top and the extra height is buried, so a
      // low, wide collision shape still looks like a rounded boulder rather than a squashed slab
      const hv = Math.max(h, w * img.height / img.width);
      ctx.drawImage(img, -w / 2, -h, w, hv);
      if (r.crush) {   // hairline cracks mark the breakable shale
        ctx.strokeStyle = 'rgba(30,26,20,0.55)'; ctx.lineWidth = 0.018; ctx.beginPath();
        ctx.moveTo(-w * 0.18, -h * 0.1); ctx.lineTo(-w * 0.04, -h * 0.5); ctx.lineTo(w * 0.12, -h * 0.35); ctx.moveTo(-w * 0.04, -h * 0.5); ctx.lineTo(0, -h * 0.85); ctx.stroke();
      }
      ctx.restore();
      // soil pushed up around the front of the base
      ctx.fillStyle = 'rgba(52,40,26,0.8)'; ctx.beginPath(); ctx.ellipse(r.x, gy - 0.005, w * 0.5, 0.045, 0, 0, Math.PI); ctx.fill();
      ctx.fillStyle = 'rgba(70,55,36,0.55)';
      for (const k of [-0.35, 0.05, 0.3]) { ctx.beginPath(); ctx.ellipse(r.x + w * k, gy + 0.012, w * 0.09, 0.03, 0, 0, 7); ctx.fill(); }
    }
  }
  function crossingSprite(l, faceOnly = false) {
    const key = l.kind === 'pipe' ? 'pipe' : 'logCrossing', img = scene.cache.img[key];
    if (!img) return false;
    const { ctx } = scene.view, [cx, cy, radius] = scene.season.render.obstacles[key].face;
    const original = scene.images[key], scale = l.r / radius;
    ctx.save();
    ctx.beginPath();
    const left = l.x - cx * scale, right = left + original.width * scale;
    for (let x = left; x <= right + 0.08; x += 0.08) ctx.lineTo(x, scene.sim.visH(x) - 0.035);
    ctx.lineTo(right, l.y + 10); ctx.lineTo(left, l.y + 10); ctx.closePath(); ctx.clip();
    if (faceOnly) { ctx.beginPath(); ctx.arc(l.x, l.y, l.r * 0.99, 0, Math.PI * 2); ctx.clip(); }
    ctx.translate(l.x - cx * scale, l.y + cy * scale); ctx.scale(1, -1);
    ctx.drawImage(img, 0, 0, original.width * scale, original.height * scale); ctx.restore();
    return true;
  }
  function holes(front = false) {
    const img = scene.cache.img.mudHole; if (!img) return;
    const { ctx } = scene.view, [lo, hi] = scene.view.viewX();
    for (const hole of scene.sim.terrain.holes) {
      if (hole.x + hole.width < lo || hole.x - hole.width > hi) continue;
      const width = hole.width + 0.8, height = hole.depth + 0.8, floor = scene.sim.visH(hole.x);
      ctx.save();
      if (front) {
        ctx.beginPath();
        for (let x = hole.x - width / 2; x <= hole.x + width / 2 + 0.05; x += 0.05) ctx.lineTo(x, scene.sim.visH(x) - 0.035);
        ctx.lineTo(hole.x + width / 2, floor - 3); ctx.lineTo(hole.x - width / 2, floor - 3); ctx.closePath(); ctx.clip();
      }
      ctx.translate(hole.x - width / 2, floor + hole.depth + 0.45); ctx.scale(1, -1);
      ctx.drawImage(img, 0, 0, width, height); ctx.restore();
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
      if (crossingSprite(l)) continue;
      ctx.save(); ctx.translate(l.x, l.y); ctx.rotate(a); ctx.imageSmoothingQuality = 'medium';   // shrunk bark texture
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
      if (crossingSprite(l, true)) continue;
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
    drawHoles() { holes(); },
    drawBehind() { drawList(back); rocks(); logsBehind(); },
    drawLogEnds() { holes(true); logEnds(); },
    drawFront() { drawList(front); },
  };
}
