import { POWER_LOOK } from '../../game-config.js';

const POWERUP_SIZE_M = 2.3, POWERUP_HEIGHT_M = 2.7, BAY_LINE_LEAN = 0.35;
import { STATION_BAY_M } from '../../game-config.js';
import { RUT_OFFSETS } from './mud.js';
import { roadSpan } from './ground.js';
import { makeCanvas, hashRandom } from '../canvas-utils.js';

// Scenery and obstacles: reeds and logs behind and in front of the trail, boulders and
// crushable rocks drawn on their physics bodies, fallen logs across the track.

export function createProps(scene) {
  const back = [], front = [];
  const { X0, X1 } = scene.sim.terrain;
  for (let x = X0 + 10; x < X1; x += 2.7) {
    const r = hashRandom(x + 11);
    if (r > 0.42 && r <= 0.9) back.push({ x: x + hashRandom(x + 5), key: 'reeds', w: 0.8 + hashRandom(x + 7) * 0.8, y: 1.5, flip: hashRandom(x + 1) > 0.5 });
    if (hashRandom(x + 19) > 0.4) front.push({ x: x + hashRandom(x + 3), key: 'reeds', w: 0.55 + hashRandom(x + 27) * 0.85, y: -0.9 - hashRandom(x + 8) * 1.4, flip: hashRandom(x + 4) > 0.5 });
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
    const span = roadSpan(scene);
    if (span && list === front) return;   // a thick road: nothing grows out of the soil in front of it
    for (const p of list) if (p.x > lo - 3 && p.x < hi + 3) sprite(p.key, p.x, visH(p.x) + (span ? span.far : p.y), p.w, p.flip);
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
  // One rock or prop on one wheel track. `rise` lifts it to the far track, behind the truck.
  function rock(r, stone, rise) {
    const { ctx } = scene.view, { visH } = scene.sim;
    const w = r.w, h = r.h, gy = visH(r.x) + rise, img = r.art ? scene.cache.img[r.art] : stone;
    // seated in the ground: a soft contact shadow behind the base
    ctx.fillStyle = 'rgba(20,15,9,0.35)'; ctx.beginPath(); ctx.ellipse(r.x + w * 0.06, gy + 0.05, w * 0.62, 0.1 + h * 0.12, 0, 0, 7); ctx.fill();
    ctx.save(); ctx.beginPath();
    ctx.moveTo(r.x - w, visH(r.x - w) + rise - 0.035);
    for (let x = r.x - w; x <= r.x + w + 0.1; x += 0.1) ctx.lineTo(x, visH(x) + rise - 0.035);
    ctx.lineTo(r.x + w, gy + 10); ctx.lineTo(r.x - w, gy + 10); ctx.closePath(); ctx.clip();
    ctx.translate(r.x, r.y + rise); ctx.scale(r.flip ? -1 : 1, -1);
    if (r.crush && !r.art) ctx.globalAlpha = 0.95;
    // natural proportions: the top matches the physical top and the extra height is buried, so a
    // low, wide collision shape still looks like a rounded boulder rather than a squashed slab
    const hv = Math.max(h, w * img.height / img.width);
    ctx.drawImage(img, -w / 2, -h, w, hv);
    if (r.crush && !r.art) {   // hairline cracks mark the breakable shale
      ctx.strokeStyle = 'rgba(30,26,20,0.55)'; ctx.lineWidth = 0.018; ctx.beginPath();
      ctx.moveTo(-w * 0.18, -h * 0.1); ctx.lineTo(-w * 0.04, -h * 0.5); ctx.lineTo(w * 0.12, -h * 0.35); ctx.moveTo(-w * 0.04, -h * 0.5); ctx.lineTo(0, -h * 0.85); ctx.stroke();
    }
    ctx.restore();
    // soil pushed up around the front of the base
    ctx.fillStyle = 'rgba(52,40,26,0.8)'; ctx.beginPath(); ctx.ellipse(r.x, gy - 0.005, w * 0.5, 0.045, 0, 0, Math.PI); ctx.fill();
    ctx.fillStyle = 'rgba(70,55,36,0.55)';
    for (const k of [-0.35, 0.05, 0.3]) { ctx.beginPath(); ctx.ellipse(r.x + w * k, gy + 0.012, w * 0.09, 0.03, 0, 0, 7); ctx.fill(); }
  }
  // Both wheel tracks: a flat image cannot span the road, so each obstacle also shows on the far track. It has
  // no collision of its own, and the far tire rises over it because it rides with the near tire.
  function rocks() {
    const [lo, hi] = scene.view.viewX(), stone = rockImage();
    for (const r of scene.sim.rocks) if (r.x > lo - r.w && r.x < hi + r.w && r.alive !== false) { rock(r, stone, RUT_OFFSETS[0]); rock(r, stone, 0); }
  }
  function crossingSprite(l, faceOnly = false) {
    const key = scene.season.trail.obstacleKinds[l.kind].art, img = scene.cache.img[key];
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
      if (hole.x + hole.width * 3 < lo || hole.x - hole.width * 3 > hi) continue;
      // on a thick road a hole is drawn true to its art (cropped to the pit by the cache) and sized to the
      // road, whatever its physical depth
      const span = roadSpan(scene), floor = scene.sim.visH(hole.x);
      const height = span ? (span.far + span.near) * 0.85 : hole.depth + 0.8, width = span ? height * img.width / img.height : hole.width + 0.8;
      const top = span ? floor + (span.far - span.near) / 2 + height / 2 : floor + hole.depth + 0.45;
      ctx.save();
      if (front) {
        ctx.beginPath();
        for (let x = hole.x - width / 2; x <= hole.x + width / 2 + 0.05; x += 0.05) ctx.lineTo(x, scene.sim.visH(x) - 0.035);
        ctx.lineTo(hole.x + width / 2, floor - 3); ctx.lineTo(hole.x - width / 2, floor - 3); ctx.closePath(); ctx.clip();
      }
      ctx.translate(hole.x - width / 2, top); ctx.scale(1, -1);
      ctx.drawImage(img, 0, 0, width, height); ctx.restore();
    }
  }
  // A fuel station: its building on the road's far edge, and a marked bay on the road. Art is `art.fuelStation`;
  // until a season has it, a simple drawn stand-in.
  // The bays are separate because the road repainted around the tires has to get them back.
  function stationBays() {
    const { ctx } = scene.view, [lo, hi] = scene.view.viewX(), { visH } = scene.sim, span = roadSpan(scene), rise = span?.far ?? 1.2, down = span?.near ?? 0.6;
    const filling = scene.sim.main?.st.filling, pulse = 0.55 + 0.25 * Math.sin(performance.now() / 180);
    for (const st of scene.sim.terrain.stations) {
      const half = STATION_BAY_M / 2; if (st.x + half + 8 < lo || st.x - half - 8 > hi) continue;
      // the bay: a soft patch across the road that fades out at both ends, with a painted checkered line where it starts and stops
      const inBay = filling && Math.abs(scene.sim.main.parts.truck.getPosition().x - st.x) <= half;
      const a = st.x - half, b = st.x + half, tint = inBay ? [98, 210, 75, pulse * 0.45] : [242, 183, 5, 0.17], rgba = o => `rgba(${tint[0]},${tint[1]},${tint[2]},${o})`;
      const fade = ctx.createLinearGradient(a - 1.6, 0, b + 1.6, 0), soft = 1.6 / (b - a + 3.2);
      fade.addColorStop(0, rgba(0)); fade.addColorStop(soft * 1.4, rgba(tint[3])); fade.addColorStop(1 - soft * 1.4, rgba(tint[3])); fade.addColorStop(1, rgba(0));
      ctx.beginPath();
      for (let x = a - 1.6; x <= b + 1.61; x += 0.25) ctx.lineTo(x, visH(x) + rise * 0.92);
      for (let x = b + 1.6; x >= a - 1.61; x -= 0.25) ctx.lineTo(x, visH(x) - down * 0.9);
      ctx.closePath(); ctx.fillStyle = fade; ctx.fill();
      for (const edge of [a, b]) {
        const y0 = visH(edge), top = rise * 0.9, bottom = -down * 0.88, rows = 8, cell = (top - bottom) / rows, wide = 0.42, lean = BAY_LINE_LEAN;
        for (let r = 0; r < rows; r++) for (let c = 0; c < 2; c++) {
          const d = bottom + r * cell, x = edge - wide + c * wide;
          ctx.beginPath(); ctx.moveTo(x + d * lean, y0 + d); ctx.lineTo(x + wide + d * lean, y0 + d); ctx.lineTo(x + wide + (d + cell) * lean, y0 + d + cell); ctx.lineTo(x + (d + cell) * lean, y0 + d + cell); ctx.closePath();
          ctx.fillStyle = (r + c) % 2 ? 'rgba(24,22,16,0.62)' : 'rgba(250,244,226,0.72)'; ctx.fill();
        }
      }
    }
  }
  // Superpower pickups: the kind's glossy orb with the upgrade's picture on it and a soft glow behind, built once per kind.
  const powerBadges = {};
  function powerBadge(kind) {
    if (powerBadges[kind]) return powerBadges[kind];
    const orb = scene.hud[`g2-orb-${kind}`], pic = scene.hud[`g2-icon-${kind}`], color = POWER_LOOK[kind].color;
    if (!orb?.complete || !orb.naturalWidth || !pic?.complete || !pic.naturalWidth) return null;
    const c = makeCanvas(256, 256), g = c.getContext('2d'), m = 128;
    const glow = g.createRadialGradient(m, m, 70, m, m, m); glow.addColorStop(0, color); glow.addColorStop(1, color + '00');
    g.fillStyle = glow; g.fillRect(0, 0, 256, 256);
    g.drawImage(orb, 28, 28, 200, 200);
    const fit = 124 / Math.max(pic.width, pic.height), w = pic.width * fit, h = pic.height * fit;
    g.drawImage(pic, m - w / 2, m - h / 2, w, h);
    return (powerBadges[kind] = c);
  }
  function powerups() {
    const { ctx } = scene.view, [lo, hi] = scene.view.viewX(), { visH } = scene.sim, now = performance.now();
    for (const p of scene.sim.powerups) {
      if (p.x < lo - 3 || p.x > hi + 3) continue;
      const img = powerBadge(p.kind); if (!img) continue;
      let size = POWERUP_SIZE_M, alpha = 1, rise = 0;
      if (p.taken) {   // bursts upward as it is picked up
        p.goneAt ??= now; const t = (now - p.goneAt) / 350; if (t >= 1) continue;
        const burst = scene.hud['g2-burst'];
        if (burst?.complete && burst.naturalWidth) { const b = size * (0.8 + t * 1.6), y0 = visH(p.x) + POWERUP_HEIGHT_M; ctx.save(); ctx.globalAlpha = 1 - t; ctx.translate(p.x - b / 2, y0 + b / 2); ctx.scale(1, -1); ctx.drawImage(burst, 0, 0, b, b); ctx.restore(); }
        size *= 1 + t * 0.9; alpha = 1 - t; rise = t * 1.5;
      } else p.goneAt = undefined;
      const y = visH(p.x) + POWERUP_HEIGHT_M + rise + Math.sin(now / 320 + p.x) * 0.14;
      ctx.save(); ctx.globalAlpha = alpha; ctx.translate(p.x - size / 2, y + size / 2); ctx.scale(1, -1); ctx.drawImage(img, 0, 0, size, size); ctx.restore();
    }
  }
  function stations() {
    const { ctx } = scene.view, [lo, hi] = scene.view.viewX(), { visH } = scene.sim, span = roadSpan(scene), rise = span?.far ?? 1.2, down = span?.near ?? 0.6;
    const img = scene.cache.img.fuelStation;
    stationBays();
    for (const st of scene.sim.terrain.stations) {
      const half = STATION_BAY_M / 2; if (st.x + half + 8 < lo || st.x - half - 8 > hi) continue;
      const base = visH(st.x) + rise * 0.96;
      if (img) { const w = 12, h = w * img.height / img.width; ctx.save(); ctx.translate(st.x - w / 2, base + h); ctx.scale(1, -1); ctx.drawImage(img, 0, 0, w, h); ctx.restore(); continue; }
      ctx.fillStyle = '#3a4a3c'; for (const dx of [-3.4, 3.4]) ctx.fillRect(st.x + dx - 0.12, base, 0.24, 3);
      ctx.fillStyle = '#e24a2c'; ctx.fillRect(st.x - 4.2, base + 3, 8.4, 0.55);
      ctx.fillStyle = '#f2b705'; ctx.fillRect(st.x - 4.2, base + 2.9, 8.4, 0.12);
      ctx.fillStyle = '#d9dfd6'; ctx.fillRect(st.x - 0.6, base, 1.2, 1.9);
      ctx.fillStyle = '#e24a2c'; ctx.fillRect(st.x - 0.6, base + 1.5, 1.2, 0.4);
      ctx.fillStyle = '#20282a'; ctx.fillRect(st.x - 0.38, base + 0.8, 0.76, 0.5);
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
    const { ctx } = scene.view, [lo, hi] = scene.view.viewX();
    const [dx, dy] = LOG_DEPTH, len = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
    for (const l of scene.sim.logs) {
      if (l.alive === false || l.x < lo - l.r * 8 || l.x > hi + l.r * 3) continue;   // the sprite's long body trails to the right
      if (crossingSprite(l)) continue;
      const pat = bark();   // only a log with no sprite of its own
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
      if (l.alive === false || l.x < lo - l.r * 2 || l.x > hi + l.r * 2) continue;
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
    drawBehind() { drawList(back); stations(); rocks(); logsBehind(); },
    drawPowerups: powerups,
    stationBays,
    drawLogEnds() { holes(true); logEnds(); },
    drawFront() { drawList(front); },
  };
}
