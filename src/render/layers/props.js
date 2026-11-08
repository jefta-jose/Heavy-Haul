import { STATION_BAY_M, STATION_WIDTH_M, DAMAGE_START_KMH, SPEED_SIGN_HEIGHT_M, HIGHWAY_SIGN_WIDTH_M } from '../../game-config.js';
import { RUT_OFFSETS } from './mud.js';
import { roadSpan } from './ground.js';
import { makeCanvas, hashRandom } from '../canvas-utils.js';

const SIGN_FONT = '"Barlow Condensed", "Arial Narrow", "Roboto Condensed", sans-serif';

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
      // the bay: a soft patch across the road that fades out at both ends
      const inBay = filling && Math.abs(scene.sim.main.parts.truck.getPosition().x - st.x) <= half;
      const a = st.x - half, b = st.x + half, tint = inBay ? [98, 210, 75, pulse * 0.45] : [242, 183, 5, 0.17], rgba = o => `rgba(${tint[0]},${tint[1]},${tint[2]},${o})`;
      const fade = ctx.createLinearGradient(a - 1.6, 0, b + 1.6, 0), soft = 1.6 / (b - a + 3.2);
      fade.addColorStop(0, rgba(0)); fade.addColorStop(soft * 1.4, rgba(tint[3])); fade.addColorStop(1 - soft * 1.4, rgba(tint[3])); fade.addColorStop(1, rgba(0));
      ctx.beginPath();
      for (let x = a - 1.6; x <= b + 1.61; x += 0.25) ctx.lineTo(x, visH(x) + rise * 0.92);
      for (let x = b + 1.6; x >= a - 1.61; x -= 0.25) ctx.lineTo(x, visH(x) - down * 0.9);
      ctx.closePath(); ctx.fillStyle = fade; ctx.fill();
    }
  }
  // The start barrier, where the wall behind the start stands, and a matching one just past the depot: a heavy steel road-closed
  // barricade on the road's far side with two amber lamps and a plate saying where you are. Each is painted once into a canvas;
  // only the lamps' slow glow is drawn live.
  const BAR_PX = 200, BAR_W = 3.3, BAR_H = 2.5, BAR_SCALE = 1.4;
  const BAR_DEPOT_PAST_M = 0;   // the end barricade starts this far past the depot line, so it is in view as the truck pulls up to deliver
  let barricadeArt = {};
  document.fonts?.load(`800 100px ${SIGN_FONT}`).then(() => { barricadeArt = {}; }).catch(() => {});
  function paintBarricade(label, stripe = '#b8291d') {
    const P = BAR_PX, c = makeCanvas(BAR_W * P, BAR_H * P), g = c.getContext('2d'), W = c.width, H = c.height;
    const X = m => m * P, Y = m => H - m * P, ink = '#17130f', rnd = n => hashRandom(n * 3.17 + 0.5);
    const outline = (w = 0.022) => { g.lineWidth = w * P; g.strokeStyle = ink; g.lineJoin = 'round'; g.stroke(); };
    const posts = [0.42, BAR_W - 0.42];
    // concrete footings, chipped, with a dark contact line
    for (const [i, px] of posts.entries()) {
      const x0 = X(px - 0.36), x1 = X(px + 0.36), y0 = Y(0.38), y1 = Y(0);
      g.beginPath(); g.moveTo(x0 + 10, y0); g.lineTo(x1 - 8, y0 + 2); g.lineTo(x1, y0 + 14); g.lineTo(x1 + 2, y1); g.lineTo(x0 - 2, y1); g.lineTo(x0, y0 + 12); g.closePath();
      const cg = g.createLinearGradient(0, y0, 0, y1); cg.addColorStop(0, '#9a968b'); cg.addColorStop(0.55, '#77736a'); cg.addColorStop(1, '#4b4741'); g.fillStyle = cg; g.fill(); outline(0.02);
      g.fillStyle = 'rgba(30,25,20,0.35)'; for (let k = 0; k < 22; k++) { const r = rnd(i * 50 + k); g.fillRect(x0 + rnd(i * 70 + k) * (x1 - x0), y0 + 14 + r * (y1 - y0 - 18), 2 + r * 4, 2 + r * 3); }
      g.fillStyle = 'rgba(92,70,44,0.75)'; for (let k = 0; k < 9; k++) { const r = rnd(i * 90 + k); g.beginPath(); g.ellipse(x0 + rnd(i * 91 + k) * (x1 - x0), y1 - r * 18, 6 + r * 14, 3 + r * 6, 0, 0, 7); g.fill(); }
    }
    // steel I-beam posts with a lit edge and rust runs
    for (const [i, px] of posts.entries()) {
      const x0 = X(px - 0.085), x1 = X(px + 0.085), y0 = Y(2.02), y1 = Y(0.36);
      g.beginPath(); g.rect(x0, y0, x1 - x0, y1 - y0);
      const sg = g.createLinearGradient(x0, 0, x1, 0); sg.addColorStop(0, '#2b2e2f'); sg.addColorStop(0.28, '#6d7270'); sg.addColorStop(0.42, '#4a4f4f'); sg.addColorStop(1, '#232627'); g.fillStyle = sg; g.fill(); outline();
      for (let k = 0; k < 6; k++) { const r = rnd(i * 30 + k), x = x0 + 4 + r * (x1 - x0 - 8); const rg = g.createLinearGradient(0, y0, 0, y1); rg.addColorStop(0, 'rgba(140,70,30,0)'); rg.addColorStop(0.4 + r * 0.4, 'rgba(140,70,30,0.55)'); rg.addColorStop(1, 'rgba(140,70,30,0)'); g.fillStyle = rg; g.fillRect(x, y0, 2 + r * 3, y1 - y0); }
    }
    // three thick planks, red and white diagonal reflective stripes, scuffed and mud splashed
    for (const [j, top] of [1.86, 1.36, 0.86].entries()) {
      const x0 = X(0.06), x1 = X(BAR_W - 0.06), y0 = Y(top), y1 = Y(top - 0.34), ph = y1 - y0;
      g.save(); g.beginPath(); g.rect(x0, y0, x1 - x0, ph); g.clip();
      g.fillStyle = '#e6dfcd'; g.fillRect(x0, y0, x1 - x0, ph);
      g.fillStyle = stripe; for (let x = x0 - ph * 2 + (j % 2) * 22; x < x1 + ph; x += 88) { g.beginPath(); g.moveTo(x, y1); g.lineTo(x + 44, y1); g.lineTo(x + 44 + ph, y0); g.lineTo(x + ph, y0); g.closePath(); g.fill(); }
      const sh = g.createLinearGradient(0, y0, 0, y1); sh.addColorStop(0, 'rgba(255,255,240,0.28)'); sh.addColorStop(0.18, 'rgba(255,255,240,0)'); sh.addColorStop(0.7, 'rgba(0,0,0,0.05)'); sh.addColorStop(1, 'rgba(0,0,0,0.38)'); g.fillStyle = sh; g.fillRect(x0, y0, x1 - x0, ph);
      for (let k = 0; k < 60; k++) { const r = rnd(j * 300 + k); g.fillStyle = r > 0.6 ? 'rgba(60,45,30,0.45)' : 'rgba(30,24,18,0.3)'; g.fillRect(x0 + rnd(j * 310 + k) * (x1 - x0), y0 + rnd(j * 320 + k) * ph, 2 + r * 9, 1 + r * 3); }
      const mud = g.createLinearGradient(0, y0, 0, y1); mud.addColorStop(0, 'rgba(86,62,38,0)'); mud.addColorStop(1, `rgba(86,62,38,${0.25 + (2 - j) * 0.2})`); g.fillStyle = mud; g.fillRect(x0, y0, x1 - x0, ph);
      g.restore();
      g.beginPath(); g.rect(x0, y0, x1 - x0, ph); outline();
      // bolts where each plank crosses a post
      for (const px of posts) for (const dy of [0.3, 0.7]) { g.beginPath(); g.arc(X(px), y0 + ph * dy, 0.024 * P, 0, 7); g.fillStyle = '#5c5f5d'; g.fill(); g.lineWidth = 2; g.strokeStyle = ink; g.stroke(); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(X(px) - 2, y0 + ph * dy - 3, 2, 2); }
    }
    // the plate on top: black steel with an amber border
    const pw = 1.5, px0 = X(BAR_W / 2 - pw / 2), py0 = Y(2.38), pww = X(pw), phh = 0.4 * P;
    g.fillStyle = '#3b3e3d'; for (const dx of [0.3, pw - 0.3]) g.fillRect(px0 + X(dx) - 4, py0 + phh, 8, Y(1.86) - py0 - phh);
    g.beginPath(); g.roundRect(px0, py0, pww, phh, 6); g.fillStyle = '#1b1c1b'; g.fill(); outline();
    g.beginPath(); g.roundRect(px0 + 7, py0 + 7, pww - 14, phh - 14, 4); g.lineWidth = 5; g.strokeStyle = '#e0a51c'; g.stroke();
    g.fillStyle = '#efe7d2'; g.textAlign = 'center'; g.textBaseline = 'middle';
    let fs = phh * 0.56; g.font = `800 ${fs}px ${SIGN_FONT}`; const tw = g.measureText(label).width; if (tw > pww - 40) { fs *= (pww - 40) / tw; g.font = `800 ${fs}px ${SIGN_FONT}`; }
    g.fillText(label, px0 + pww / 2, py0 + phh / 2 + 2);
    g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(px0 + 8, py0 + 8, pww - 16, phh * 0.3);
    // lamp housings on top of the posts
    for (const px of posts) {
      const cx = X(px), cy = Y(2.13);
      g.fillStyle = '#222524'; g.fillRect(cx - 0.07 * P, Y(2.04), 0.14 * P, 0.05 * P);
      g.beginPath(); g.arc(cx, cy, 0.1 * P, 0, 7); g.fillStyle = '#2a2c2b'; g.fill(); outline();
      g.beginPath(); g.arc(cx, cy, 0.075 * P, 0, 7); const lg = g.createRadialGradient(cx - 4, cy - 4, 1, cx, cy, 0.075 * P); lg.addColorStop(0, '#f7c75a'); lg.addColorStop(1, '#9a5a0c'); g.fillStyle = lg; g.fill();
    }
    return c;
  }
  function barricade() {
    const bx = scene.sim.barrierX;
    if (bx != null) drawBarricade(bx - 0.25 - BAR_W * BAR_SCALE / 2, 'TRAIL START');
    drawBarricade(scene.season.trail.depot + BAR_DEPOT_PAST_M + BAR_W * BAR_SCALE / 2, 'DEPOT', '#2f8f3a');   // green stripes: you made it
  }
  function drawBarricade(cx, label, stripe) {
    const { ctx } = scene.view, [lo, hi] = scene.view.viewX(); if (cx + BAR_W * BAR_SCALE < lo || cx - BAR_W * BAR_SCALE > hi) return;
    const art = (barricadeArt[label] ??= paintBarricade(label, stripe));
    const { visH } = scene.sim, rise = (roadSpan(scene)?.far ?? 1.2) * 0.62, base = Math.min(visH(cx - BAR_W / 2), visH(cx), visH(cx + BAR_W / 2)) + rise - 0.06;
    // a soft contact shadow under the footings so it sits on the road
    ctx.save(); ctx.fillStyle = 'rgba(10,8,6,0.35)'; ctx.beginPath(); ctx.ellipse(cx, base + 0.02, BAR_W * BAR_SCALE * 0.55, 0.14, 0, 0, 7); ctx.fill();
    ctx.translate(cx, base); ctx.scale(BAR_SCALE, -BAR_SCALE); ctx.drawImage(art, -BAR_W / 2, -BAR_H, BAR_W, BAR_H); ctx.restore();
    // the lamps blink slowly, one after the other
    const t = performance.now() / 1000;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const [i, px] of [0.42, BAR_W - 0.42].entries()) {
      const on = Math.max(0, Math.sin(t * 2.6 + i * Math.PI)) ** 2, lx = cx + (px - BAR_W / 2) * BAR_SCALE, ly = base + 2.13 * BAR_SCALE;
      if (on < 0.02) continue;
      const gl = ctx.createRadialGradient(lx, ly, 0, lx, ly, 0.75); gl.addColorStop(0, `rgba(255,190,70,${0.75 * on})`); gl.addColorStop(0.18, `rgba(255,150,40,${0.35 * on})`); gl.addColorStop(1, 'rgba(255,120,20,0)');
      ctx.fillStyle = gl; ctx.fillRect(lx - 0.75, ly - 0.75, 1.5, 1.5);
    }
    ctx.restore();
  }
  // The recovery bay ahead of a stranded truck: two dashed lines along the road's far and near edges, purple while a
  // breakdown truck with nothing hooked is driven, green once the whole truck stands inside (simulation.js nearestHook).
  // The far line is drawn before the vehicles so trucks pass in front of it; the near one after the mud's foreground,
  // so it lies over holes and ruts.
  function recoveryBay(part = 'far') {
    const { sim } = scene, v = sim.active;
    if (!v || v.role !== 'service' || !sim.canWinch(v) || v.cable) return;
    const hook = sim.nearestHook(v); if (!hook) return;
    const { ctx } = scene.view, [lo, hi] = scene.view.viewX(), { visH } = sim, span = roadSpan(scene), rise = span?.far ?? 1.2, down = span?.near ?? 0.6;
    const { start: a, end: b } = hook.bay; if (b < lo || a > hi) return;
    const dy = part === 'far' ? rise * 0.85 : -down * 0.8, t = performance.now() / 1000;
    const rgb = hook.inRange ? '98, 224, 75' : '178, 102, 255', pulse = hook.inRange ? 0.75 + 0.25 * Math.sin(t * 6) : 1;
    const edge = () => { ctx.beginPath(); for (let x = a; x <= b + 0.01; x += 0.25) { const xx = Math.min(x, b); ctx.lineTo(xx, visH(xx) + dy); } };
    // corner brackets: a solid run along the edge at each end, and a post down (far) or up (near) to the tire line
    const bracket = (x, dir) => { const run = Math.min(1.2, (b - a) / 4); ctx.beginPath(); ctx.moveTo(x, visH(x)); ctx.lineTo(x, visH(x) + dy); for (let k = 0.25; k <= run + 0.01; k += 0.25) ctx.lineTo(x + dir * k, visH(x + dir * k) + dy); };
    ctx.save(); ctx.lineCap = 'butt'; ctx.lineJoin = 'round';
    // a soft glow under everything
    ctx.strokeStyle = `rgba(${rgb}, ${0.22 * pulse})`; ctx.lineWidth = 0.42;
    edge(); ctx.stroke(); bracket(a, 1); ctx.stroke(); bracket(b, -1); ctx.stroke();
    // the dashes march toward the stuck truck
    ctx.strokeStyle = `rgba(${rgb}, ${0.95 * pulse})`; ctx.lineWidth = 0.14;
    ctx.setLineDash([0.55, 0.3]); ctx.lineDashOffset = hook.inRange ? 0 : (t * 0.9) % 0.85;
    edge(); ctx.stroke();
    // solid brackets with a bright core
    ctx.setLineDash([]); ctx.lineWidth = 0.2; ctx.strokeStyle = `rgba(${rgb}, ${pulse})`;
    bracket(a, 1); ctx.stroke(); bracket(b, -1); ctx.stroke();
    ctx.lineWidth = 0.06; ctx.strokeStyle = `rgba(255, 255, 255, ${0.7 * pulse})`;
    bracket(a, 1); ctx.stroke(); bracket(b, -1); ctx.stroke();
    ctx.restore();
  }
  function roadMarks() { stationBays(); }
  function stations() {
    const { ctx } = scene.view, [lo, hi] = scene.view.viewX(), { visH } = scene.sim, span = roadSpan(scene), rise = span?.far ?? 1.2, down = span?.near ?? 0.6;
    const img = scene.cache.img.fuelStation;
    roadMarks();
    for (const st of scene.sim.terrain.stations) {
      const half = STATION_BAY_M / 2; if (st.x + half + 8 < lo || st.x - half - 8 > hi) continue;
      // the building stands on the ground it is on: it leans with the slope across its width
      const lean = Math.atan((visH(st.x + STATION_WIDTH_M / 2) - visH(st.x - STATION_WIDTH_M / 2)) / STATION_WIDTH_M);
      ctx.save(); ctx.translate(st.x, visH(st.x) + rise * 0.96); ctx.rotate(lean);
      if (img) { const w = STATION_WIDTH_M, h = w * img.height / img.width; ctx.scale(1, -1); ctx.drawImage(img, -w / 2, -h, w, h); ctx.restore(); continue; }
      const base = 0;
      ctx.fillStyle = '#3a4a3c'; for (const dx of [-3.4, 3.4]) ctx.fillRect(dx - 0.12, base, 0.24, 3);
      ctx.fillStyle = '#e24a2c'; ctx.fillRect(-4.2, base + 3, 8.4, 0.55);
      ctx.fillStyle = '#f2b705'; ctx.fillRect(-4.2, base + 2.9, 8.4, 0.12);
      ctx.fillStyle = '#d9dfd6'; ctx.fillRect(-0.6, base, 1.2, 1.9);
      ctx.fillStyle = '#e24a2c'; ctx.fillRect(-0.6, base + 1.5, 1.2, 0.4);
      ctx.fillStyle = '#20282a'; ctx.fillRect(-0.38, base + 0.8, 0.76, 0.5);
      ctx.restore();
    }
  }
  // Speed limit signs on the road's far edge: the blank sign with DAMAGE_START_KMH painted on its face, built once per size
  // (and once more when the font arrives), since it is the same picture every time.
  let signPainted = null;
  document.fonts?.load(`800 100px ${SIGN_FONT}`).then(() => { signPainted = null; }).catch(() => {});
  function paintedSign(img) {
    if (signPainted?.img === img) return signPainted.canvas;
    const entry = scene.season.art.speedSign, k = img.width / scene.images.speedSign.width, [fx, fy, r] = entry.face.map(v => v * k);
    const canvas = makeCanvas(img.width, img.height), g = canvas.getContext('2d'), text = String(DAMAGE_START_KMH);
    g.drawImage(img, 0, 0); g.fillStyle = '#15171a'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `800 ${r * 1.15}px ${SIGN_FONT}`;
    const wide = g.measureText(text).width, fit = Math.min(1, r * 1.6 / wide);
    g.font = `800 ${r * 1.15 * fit}px ${SIGN_FONT}`; g.fillText(text, fx, fy - r * 0.12);
    g.font = `700 ${r * 0.26}px ${SIGN_FONT}`; g.fillText('km/h', fx, fy + r * 0.62);
    signPainted = { img, canvas };
    return canvas;
  }
  function speedSigns() {
    const img = scene.cache.img.speedSign; if (!img) return;
    const { ctx } = scene.view, [lo, hi] = scene.view.viewX(), { visH } = scene.sim, rise = roadSpan(scene)?.far ?? 1.2;
    const h = SPEED_SIGN_HEIGHT_M, w = h * img.width / img.height, sign = paintedSign(img);
    for (const x of scene.sim.speedSigns) {
      if (x + w < lo || x - w > hi) continue;
      ctx.save(); ctx.translate(x, visH(x) + rise * 0.96); ctx.scale(1, -1); ctx.drawImage(sign, -w / 2, -h, w, h); ctx.restore();
    }
  }
  // Roadside scenery (trail.scenery): fences, a shack, wrecks, towers and warning signs on the road's far edge, drawing only.
  // Each piece's art says how tall it is, whether it leans with the ground (`lean`), and how far apart repeated sections stand (`repeatPx`).
  function scenery() {
    const { ctx } = scene.view, [lo, hi] = scene.view.viewX(), { visH } = scene.sim, rise = (roadSpan(scene)?.far ?? 1.2) * 0.96;
    for (const item of scene.season.trail.scenery ?? []) {
      const img = scene.cache.img[item.art], a = scene.season.art[item.art]; if (!img) continue;
      const h = a.heightM, w = h * img.width / img.height, step = a.repeatPx ? a.repeatPx * h / (a.crop[3] - a.crop[1]) : 0;
      for (let k = 0; k < (item.count ?? 1); k++) {
        const x = item.x + k * step; if (x + w < lo || x - w > hi) continue;
        ctx.save();
        if (a.lean) { ctx.translate(x, visH(x) + rise); ctx.rotate(Math.atan((visH(x + w / 2) - visH(x - w / 2)) / w)); }
        else ctx.translate(x, Math.min(visH(x - w / 2), visH(x), visH(x + w / 2)) + rise - 0.08);   // upright, sunk at its lowest ground so no side floats
        ctx.scale(1, -1); ctx.drawImage(img, -w / 2, -h, w, h); ctx.restore();
      }
    }
  }
  // Each highway's sign at its start (its speed camera is invisible: only its chip shows)
  function highwayProps() {
    const { ctx } = scene.view, [lo, hi] = scene.view.viewX(), { visH } = scene.sim, rise = roadSpan(scene)?.far ?? 1.2;
    for (const h of scene.season.trail.highways ?? []) {
      const img = scene.cache.img[h.sign], at = h.x0 + HIGHWAY_SIGN_WIDTH_M, w = HIGHWAY_SIGN_WIDTH_M;
      if (img && at + w > lo && at - w < hi) { const ht = w * img.height / img.width; ctx.save(); ctx.translate(at, visH(at) + rise * 0.96); ctx.scale(1, -1); ctx.drawImage(img, -w / 2, -ht, w, ht); ctx.restore(); }
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
    drawBehind() { drawList(back); scenery(); stations(); speedSigns(); barricade(); highwayProps(); rocks(); logsBehind(); },
    roadMarks,
    recoveryBay,
    drawLogEnds() { holes(true); logEnds(); },
    drawFront() { drawList(front); },
  };
}
