import { makeCanvas, puff } from '../canvas-utils.js';
import { roadSpan } from './ground.js';
import {
  WEATHER_COUNTS, WEATHER_PHONE_SHARE, WEATHER_NEAR_DEPTH, BIRD_FLOCK_EVERY_S, LIGHTNING_EVERY_S, TUMBLEWEED_EVERY_S,
  RAYS_PARALLAX, RAYS_SPACING,
} from '../../game-config.js';

// The air of a map: weather, sun shafts, drifting mist, bird flocks, lightning and tumbleweeds, all from
// season.json render.atmosphere. Everything is drawn in screen space from sprites made once (no per-frame
// gradients or filters) and batched into a few paths, so a phone keeps its frame rate:
//
//   "atmosphere": {
//     "weather": [{ "kind": "rain", "density": 1 }],   rain, drizzle, snow, ash, embers, leaves, dust, grit, pollen, butterflies
//     "wind": -0.6,                                     blowing to the right when positive (leaves, dust, rain slant, tumbleweeds)
//     "rays": { "x": 0.8, "color": "255,236,190", "strength": 0.5 },   sun shafts, starting at this share of the screen width and sliding past as you drive
//     "mist": { "color": "226,236,230", "strength": 0.5 },             ground fog rising between the road and the backdrop
//     "storm": 0.3, "lightning": true,                 a darker sky top (baked into the backdrop) and flashes
//     "birds": true, "tumbleweeds": true, "lensDrops": 1.5            rain drops landing on the camera, per second
//   }
//
// Particles have a depth: the near ones (WEATHER_NEAR_DEPTH and up) draw in front of the trucks, the rest
// behind the trail, and each moves with the camera by its depth, so the weather has parallax.

const TOUCH = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
const rand = (a, b) => a + Math.random() * (b - a);
const between = ([a, b]) => rand(a, b);
const DEPTH = { rain: [0.3, 1.35], drizzle: [0.3, 1.2], snow: [0.3, 1.4], ash: [0.3, 1.4], embers: [0.35, 1.3], leaves: [0.35, 1.45], dust: [0.4, 1.2], grit: [0.5, 1.4], pollen: [0.3, 1.2], butterflies: [0.55, 1.1] };
const LEAF_COLORS = ['#c8461f', '#e07a1f', '#d9a21b', '#a8321a', '#b86a28'];
const WING_COLORS = ['#f0a020', '#f4d03a', '#5aa6e8', '#f2f2ea', '#e8642c'];

// ---------- sprites, made once ----------
let SPR = null;
function sprites() {
  if (SPR) return SPR;
  const leaf = (color, maple) => {
    const c = makeCanvas(36, 36), g = c.getContext('2d');
    g.translate(18, 18); g.fillStyle = color; g.strokeStyle = 'rgba(60,24,8,0.55)'; g.lineWidth = 1.2;
    g.beginPath();
    if (maple) {
      // three rounded lobes and a stem
      g.moveTo(0, 13);
      g.bezierCurveTo(-6, 9, -15, 6, -13, -2); g.bezierCurveTo(-11, -6, -7, -3, -6, -6); g.bezierCurveTo(-7, -12, -2, -15, 0, -14);
      g.bezierCurveTo(2, -15, 7, -12, 6, -6); g.bezierCurveTo(7, -3, 11, -6, 13, -2); g.bezierCurveTo(15, 6, 6, 9, 0, 13);
    } else { g.moveTo(0, -14); g.bezierCurveTo(11, -8, 10, 8, 0, 14); g.bezierCurveTo(-10, 8, -11, -8, 0, -14); }
    g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,230,160,0.18)'; g.beginPath(); g.ellipse(-3, -3, 4, 7, 0.3, 0, 7); g.fill();
    g.beginPath(); g.moveTo(0, -11); g.lineTo(0, 15); g.stroke();
    return c;
  };
  const tumbleweed = () => {
    const c = makeCanvas(128, 128), g = c.getContext('2d'), colors = ['#7a5a32', '#9a7644', '#5e4426', '#b08a52'];
    g.translate(64, 64); g.lineCap = 'round';
    for (let i = 0; i < 90; i++) {
      const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * 40;
      g.strokeStyle = colors[i % colors.length]; g.lineWidth = rand(1.2, 3);
      g.beginPath(); g.arc(Math.cos(a) * d * 0.5, Math.sin(a) * d * 0.5, rand(14, 46), rand(0, 7), rand(0, 7) + rand(0.6, 2.2)); g.stroke();
    }
    g.globalCompositeOperation = 'destination-in';
    const r = g.createRadialGradient(0, 0, 40, 0, 0, 62); r.addColorStop(0, '#000'); r.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = r; g.fillRect(-64, -64, 128, 128);
    return c;
  };
  SPR = {
    leaves: LEAF_COLORS.map((c, i) => leaf(c, i % 2 === 0)),
    ember: puff(255, 130, 40), pollen: puff(255, 246, 200), dust: puff(196, 150, 104), tumbleweed: tumbleweed(),
  };
  return SPR;
}
// soft shafts of sunlight fanning down from above the top edge; x (share of the width) only sets their slant. The source
// sits in the middle of a canvas wide enough for every shaft, and the canvas fades out at its sides and bottom, so no
// shaft is ever cut off by its edge as the shafts slide across the screen
const RAYS_W = 1024, RAYS_H = 512;
function raysCanvas(x, color) {
  const c = makeCanvas(RAYS_W, RAYS_H), g = c.getContext('2d'), ox = RAYS_W / 2, oy = -80;
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 9; i++) {
    const a = Math.PI / 2 + (x - 0.5) * -1.1 + rand(-0.55, 0.55), w = rand(0.025, 0.075), len = rand(380, 520);
    const grad = g.createLinearGradient(ox, oy, ox + Math.cos(a) * len, oy + Math.sin(a) * len);
    grad.addColorStop(0, `rgba(${color},0)`); grad.addColorStop(0.25, `rgba(${color},${rand(0.22, 0.4).toFixed(2)})`); grad.addColorStop(1, `rgba(${color},0)`);
    g.fillStyle = grad; g.beginPath(); g.moveTo(ox, oy);
    g.lineTo(ox + Math.cos(a - w) * len, oy + Math.sin(a - w) * len); g.lineTo(ox + Math.cos(a + w) * len, oy + Math.sin(a + w) * len);
    g.closePath(); g.fill();
  }
  g.globalCompositeOperation = 'destination-in';
  const side = g.createLinearGradient(0, 0, RAYS_W, 0);
  side.addColorStop(0, 'rgba(0,0,0,0)'); side.addColorStop(0.15, 'rgba(0,0,0,1)'); side.addColorStop(0.85, 'rgba(0,0,0,1)'); side.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = side; g.fillRect(0, 0, RAYS_W, RAYS_H);
  const foot = g.createLinearGradient(0, 0, 0, RAYS_H);
  foot.addColorStop(0, 'rgba(0,0,0,1)'); foot.addColorStop(0.7, 'rgba(0,0,0,1)'); foot.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = foot; g.fillRect(0, 0, RAYS_W, RAYS_H);
  return c;
}
// a seamless sheet of ground fog (it tiles horizontally): thick at the bottom, thinning upwards into an uneven,
// billowy top, so it reads as fog rising from below rather than a flat strip
function fogCanvas(color) {
  const [r, gg, b] = color.split(',').map(Number), blob = puff(r, gg, b), c = makeCanvas(1024, 256), g = c.getContext('2d');
  const base = g.createLinearGradient(0, 96, 0, 256);
  base.addColorStop(0, `rgba(${color},0)`); base.addColorStop(0.45, `rgba(${color},0.4)`); base.addColorStop(1, `rgba(${color},0.75)`);
  g.fillStyle = base; g.fillRect(0, 0, 1024, 256);
  // billows: big low ones fill the body, smaller ones climb higher and break up the top edge
  for (let i = 0; i < 70; i++) {
    const k = Math.random(), w = rand(120, 360) * (1 - k * 0.5), h = rand(50, 110) * (1 - k * 0.45);
    const x = rand(0, 1024), y = 256 - k * 190 - rand(0, 30);
    g.globalAlpha = rand(0.16, 0.38) * (1 - k * 0.45);
    for (const dx of [-1024, 0, 1024]) g.drawImage(blob, x + dx - w / 2, y - h / 2, w, h);
  }
  return c;
}

export function createAtmosphere(scene) {
  let cfg = null, parts = [], flocks = [], weeds = [], time = 0, size = '', last = null, mistY = null;
  let birdT = 0, boltT = 0, weedT = 0, flash = 0, flashQ = [], bolt = null, rays = null, fog = null;

  function setup() {
    cfg = scene.season.render.atmosphere ?? {};
    parts = []; flocks = []; weeds = []; last = null; mistY = null; flash = 0; flashQ = []; bolt = null;
    birdT = rand(2, 6); boltT = between(LIGHTNING_EVERY_S); weedT = rand(1, 3);
    rays = cfg.rays ? raysCanvas(cfg.rays.x ?? 0.75, cfg.rays.color ?? '255,236,190') : null;
    fog = cfg.mist ? fogCanvas(cfg.mist.color ?? '226,236,230') : null;
    size = '';
  }
  // the particle count follows the screen's area, so a phone is not crowded and a big monitor not bare
  function populate(W, H) {
    const area = Math.min(1.3, Math.max(0.55, W * H / (1440 * 810))) * (TOUCH ? WEATHER_PHONE_SHARE : 1);
    parts = [];
    for (const layer of cfg.weather ?? []) {
      const n = Math.round((WEATHER_COUNTS[layer.kind] ?? 0) * (layer.density ?? 1) * area);
      for (let i = 0; i < n; i++) parts.push(spawn(layer.kind, W, H, true));
    }
    // far first, then by kind, so each pass draws in as few batches as possible
    parts.sort((a, b) => (a.near - b.near) || a.kind.localeCompare(b.kind));
  }
  function spawn(kind, W, H, anywhere) {
    const [z0, z1] = DEPTH[kind] ?? [0.4, 1.2], z = rand(z0, z1);
    const p = { kind, z, near: z >= WEATHER_NEAR_DEPTH ? 1 : 0, x: rand(-40, W + 40), y: anywhere ? rand(-20, H + 20) : -rand(10, 80), ph: rand(0, 7), rot: rand(0, 7), spin: rand(-3, 3), vx: 0, vy: 0, img: 0 };
    if (kind === 'embers') p.y = anywhere ? rand(0, H + 20) : H + rand(10, 60);
    if (kind === 'dust') { p.y = rand(H * 0.3, H * 0.95); if (!anywhere) p.x = (cfg.wind ?? -1) < 0 ? W + 260 : -260; }
    if (kind === 'grit' && !anywhere) { p.y = rand(H * 0.25, H); p.x = (cfg.wind ?? -1) < 0 ? W + 20 : -20; }
    if (kind === 'leaves') p.img = Math.floor(rand(0, LEAF_COLORS.length));
    if (kind === 'butterflies') { p.img = Math.floor(rand(0, WING_COLORS.length)); p.y = rand(H * 0.3, H * 0.75); }
    return p;
  }

  function update(dt) {
    const { W, H, ppm, cam } = scene.view, s = Math.min(1.35, Math.max(0.75, H / 810)), wind = cfg.wind ?? 0;
    if (`${W}x${H}` !== size) { size = `${W}x${H}`; populate(W, H); }
    time += dt;
    // how far the world moved on screen since last frame (a respawn or a map switch jumps: no streak)
    let dx = 0, dy = 0;
    if (last && Math.abs(cam.x - last.x) < 20 && Math.abs(cam.y - last.y) < 20) { dx = (cam.x - last.x) * ppm; dy = (cam.y - last.y) * ppm; }
    last = { x: cam.x, y: cam.y };
    for (const p of parts) {
      const z = p.z;
      switch (p.kind) {
        case 'rain': p.vy = (720 + 520 * z) * s; p.vx = wind * p.vy * 0.24; break;
        case 'drizzle': p.vy = (420 + 300 * z) * s; p.vx = wind * p.vy * 0.2; break;
        case 'snow': p.vy = (30 + 50 * z) * s; p.vx = wind * 40 * s + Math.sin(time * 1.1 + p.ph) * 18 * s; break;
        case 'ash': p.vy = (16 + 30 * z) * s; p.vx = wind * 34 * s + Math.sin(time * 0.9 + p.ph) * 16 * s; break;
        case 'embers': p.vy = -(28 + 64 * z) * s; p.vx = wind * 24 * s + Math.sin(time * 1.7 + p.ph) * 22 * s; break;
        case 'leaves': p.vy = (34 + 46 * z) * s; p.vx = wind * 70 * s + Math.sin(time * 1.3 + p.ph) * 44 * s; p.rot += p.spin * dt; break;
        case 'dust': p.vx = wind * (220 + 220 * z) * s; p.vy = Math.sin(time * 0.6 + p.ph) * 8 * s; break;
        case 'grit': p.vx = wind * (520 + 520 * z) * s; p.vy = (20 + Math.sin(time * 3 + p.ph) * 30) * s; break;
        case 'pollen': p.vx = wind * 16 * s + Math.sin(time * 0.7 + p.ph) * 14 * s; p.vy = Math.cos(time * 0.9 + p.ph * 1.3) * 12 * s - 3 * s; break;
        case 'butterflies': {
          p.vx += (Math.sin(time * 0.45 + p.ph) * 46 * s + wind * 10 * s - p.vx) * Math.min(1, dt * 2);
          p.vy = Math.cos(time * 2.3 + p.ph) * 26 * s + (p.y < H * 0.25 ? 30 : p.y > H * 0.8 ? -30 : 0) * s; break;
        }
      }
      p.x += p.vx * dt - dx * z; p.y += p.vy * dt + dy * z;
      const m = p.kind === 'dust' ? 260 : 40;
      if (p.x < -m) p.x += W + 2 * m; else if (p.x > W + m) p.x -= W + 2 * m;
      if (p.kind === 'embers') { if (p.y < -30) Object.assign(p, spawn('embers', W, H, false), { z: p.z, near: p.near }); else if (p.y > H + 80) p.y = -20; }
      else if (p.kind === 'dust' || p.kind === 'grit' || p.kind === 'pollen' || p.kind === 'butterflies') { if (p.y < -40) p.y = H + 30; else if (p.y > H + 40) p.y = -30; }
      else if (p.y > H + 30) { p.y = -rand(10, 60); p.x = rand(-40, W + 40); }
      else if (p.y < -120) p.y = H + 20;
    }
    // bird flocks cross the sky now and then
    if (cfg.birds && (birdT -= dt) <= 0) {
      birdT = between(BIRD_FLOCK_EVERY_S);
      const dir = Math.random() < 0.5 ? 1 : -1, n = Math.floor(rand(4, 10)), y = rand(H * 0.08, H * 0.32), bs = rand(4.5, 7.5) * s;
      flocks.push({ x: dir > 0 ? -80 : W + 80, y, vx: dir * rand(55, 95) * s, birds: Array.from({ length: n }, (_, i) => ({ dx: -dir * (Math.ceil(i / 2) * rand(14, 22) * s), dy: (i % 2 ? 1 : -1) * Math.ceil(i / 2) * rand(5, 9) * s + rand(-3, 3), ph: rand(0, 7), size: bs * rand(0.8, 1.15) })) });
    }
    flocks = flocks.filter(f => { f.x += f.vx * dt - dx * 0.08; f.y += dy * 0.08 + Math.sin(time * 0.8) * 4 * dt; return f.x > -400 && f.x < W + 400; });
    // lightning: a bright double flash and a jagged bolt over the horizon
    if (cfg.lightning && (boltT -= dt) <= 0) {
      boltT = between(LIGHTNING_EVERY_S); flashQ = [0, 0.13, 0.3];
      const bx = rand(W * 0.1, W * 0.9), pts = [[bx, -10]];
      let x = bx, y = -10; while (y < H * 0.45) { y += rand(18, 42) * s; x += rand(-26, 26) * s; pts.push([x, y]); }
      bolt = { pts, life: 0.42 };
    }
    flashQ = flashQ.map(t => t - dt).filter(t => { if (t <= 0) { flash = Math.max(flash, rand(0.6, 1)); return false; } return true; });
    flash = Math.max(0, flash - dt * 4.5);
    if (bolt && (bolt.life -= dt) <= 0) bolt = null;
    updateWeeds(dt);
  }

  // tumbleweeds bounce down the trail with the wind, past the truck, in world space
  function updateWeeds(dt) {
    if (!cfg.tumbleweeds) return;
    const sim = scene.sim, [lo, hi] = scene.view.viewX(), wind = cfg.wind || -1;
    if ((weedT -= dt) <= 0 && weeds.length < 2) {
      weedT = between(TUMBLEWEED_EVERY_S);
      const r = rand(0.3, 0.55), x = wind < 0 ? hi + 2 : lo - 2;
      weeds.push({ x, y: sim.visH(x) + r + rand(0.5, 1.5), vx: Math.sign(wind) * rand(4, 8), vy: 0, r, rot: 0 });
    }
    for (const w of weeds) {
      w.vy -= 9.8 * dt; w.x += w.vx * dt; w.y += w.vy * dt;
      const ground = sim.visH(w.x) + w.r + 0.08;
      if (w.y < ground) { w.y = ground; w.vy = Math.max(1.2, Math.abs(w.vy) * 0.45) + rand(0, 2.2); }
      w.rot += w.vx / w.r * dt;
    }
    weeds = weeds.filter(w => w.x > lo - 6 && w.x < hi + 6);
  }

  // ---------- drawing ----------
  function screen() { const { ctx, DPR } = scene.view; ctx.setTransform(DPR, 0, 0, DPR, 0, 0); return ctx; }

  function drawParticles(near) {
    const { DPR, H } = scene.view, ctx = screen(), s = Math.min(1.35, Math.max(0.75, H / 810));
    let i = 0;
    while (i < parts.length && parts[i].near !== near) i++;
    while (i < parts.length && parts[i].near === near) {
      const kind = parts[i].kind;
      let j = i; while (j < parts.length && parts[j].near === near && parts[j].kind === kind) j++;
      drawKind(ctx, kind, i, j, near, s, DPR);
      i = j;
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  function drawKind(ctx, kind, i0, i1, near, s, DPR) {
    const S = sprites();
    if (kind === 'rain' || kind === 'drizzle' || kind === 'grit') {
      const k = kind === 'rain' ? 0.034 : kind === 'drizzle' ? 0.024 : 0.02;
      ctx.beginPath();
      for (let i = i0; i < i1; i++) { const p = parts[i]; ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * k * p.z, p.y - p.vy * k * p.z); }
      ctx.strokeStyle = kind === 'grit' ? `rgba(150,108,66,${near ? 0.55 : 0.35})` : (cfg.rainColor ?? `rgba(222,232,242,${near ? 0.6 : 0.34})`);
      ctx.lineWidth = (near ? (kind === 'rain' ? 2 : 1.4) : 1.1) * s; ctx.lineCap = 'round'; ctx.stroke(); return;
    }
    if (kind === 'ash' || kind === 'snow') {
      ctx.fillStyle = kind === 'snow' ? 'rgba(248,250,255,0.9)' : near ? 'rgba(72,70,68,0.78)' : 'rgba(150,146,140,0.6)';
      ctx.beginPath();
      for (let i = i0; i < i1; i++) { const p = parts[i], r = (1.6 + 3.2 * p.z) * s; ctx.rect(p.x - r / 2, p.y - r / 2, r, r * (0.6 + 0.4 * Math.abs(Math.sin(time * 2 + p.ph)))); }
      ctx.fill(); return;
    }
    if (kind === 'embers' || kind === 'pollen') {
      const img = kind === 'embers' ? S.ember : S.pollen;
      ctx.globalCompositeOperation = kind === 'embers' ? 'lighter' : 'source-over';
      for (let i = i0; i < i1; i++) {
        const p = parts[i], r = (kind === 'embers' ? 7 + 10 * p.z : 3 + 5 * p.z) * s;
        ctx.globalAlpha = kind === 'embers' ? 0.6 + 0.4 * Math.sin(time * 9 + p.ph) : 0.55 + 0.35 * Math.sin(time * 2 + p.ph);
        ctx.drawImage(img, p.x - r, p.y - r, r * 2, r * 2);
      }
      return;
    }
    if (kind === 'dust') {
      for (let i = i0; i < i1; i++) { const p = parts[i], r = (90 + 150 * p.z) * s; ctx.globalAlpha = 0.12 + 0.13 * p.z; ctx.drawImage(S.dust, p.x - r, p.y - r * 0.5, r * 2, r); }
      return;
    }
    if (kind === 'leaves') {
      for (let i = i0; i < i1; i++) {
        const p = parts[i], r = (15 + 17 * p.z) * s, flip = Math.cos(time * 2.6 + p.ph), c = Math.cos(p.rot), sn = Math.sin(p.rot);
        ctx.globalAlpha = near ? 1 : 0.8;
        ctx.setTransform(c * flip * DPR, sn * flip * DPR, -sn * DPR, c * DPR, p.x * DPR, p.y * DPR);
        ctx.drawImage(S.leaves[p.img], -r / 2, -r / 2, r, r);
      }
      return;
    }
    if (kind === 'butterflies') {
      for (let i = i0; i < i1; i++) {
        const p = parts[i], r = (7 + 6 * p.z) * s, open = 0.25 + 0.75 * Math.abs(Math.sin(time * 15 + p.ph));
        ctx.fillStyle = WING_COLORS[p.img];
        ctx.beginPath(); ctx.ellipse(p.x - r * 0.55 * open, p.y, r * 0.6 * open, r * 0.8, -0.3, 0, 7); ctx.ellipse(p.x + r * 0.55 * open, p.y, r * 0.6 * open, r * 0.8, 0.3, 0, 7); ctx.fill();
        ctx.fillStyle = '#2a2018'; ctx.fillRect(p.x - 0.6 * s, p.y - r * 0.6, 1.2 * s, r * 1.2);
      }
    }
  }

  // behind the trail: sun shafts, bolts, birds, mist and the far weather (a storm's dark sky is baked into the backdrop: sprite-cache.js)
  function drawSky() {
    if (!cfg) setup();
    const { W, H, ppm, cam } = scene.view, ctx = screen(), s = Math.min(1.35, Math.max(0.75, H / 810));
    if (rays && scene.view.quality >= 0.85) {
      ctx.globalCompositeOperation = 'lighter';
      // the shafts' source slides back as the truck drives on and the clusters repeat, fading in and out at the edges
      const share = cfg.rays.x ?? 0.75, period = W * RAYS_SPACING, rw = W * 1.12 * RAYS_W / 512;
      const src = (((share * W - cam.x * ppm * RAYS_PARALLAX) % period) + period) % period;
      const pulse = (cfg.rays.strength ?? 0.5) * (0.72 + 0.28 * Math.sin(time * 0.35));
      for (const o of [src - period, src, src + period]) {
        const edge = Math.min(o + W * 0.25, W * 1.25 - o) / (W * 0.35);
        if (edge <= 0) continue;
        ctx.globalAlpha = pulse * Math.min(1, edge);
        ctx.drawImage(rays, o - rw / 2 + Math.sin(time * 0.11) * W * 0.02, 0, rw, H * 0.92 * RAYS_H / 384);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    if (bolt) {
      ctx.lineJoin = 'round';
      for (const [w, a] of [[9, 0.18], [3.2, 0.55], [1.4, 1]]) {
        ctx.strokeStyle = `rgba(236,240,255,${a * Math.min(1, bolt.life * 4)})`; ctx.lineWidth = w * s; ctx.beginPath();
        for (const [x, y] of bolt.pts) ctx.lineTo(x, y); ctx.stroke();
      }
    }
    if (flocks.length) {
      ctx.strokeStyle = cfg.birdColor ?? 'rgba(28,32,30,0.82)'; ctx.lineWidth = 1.5 * s; ctx.lineCap = 'round'; ctx.beginPath();
      for (const f of flocks) for (const b of f.birds) {
        const x = f.x + b.dx, y = f.y + b.dy, flap = Math.sin(time * 9 + b.ph), tip = -flap * b.size * 0.7;
        ctx.moveTo(x - b.size, y + tip); ctx.quadraticCurveTo(x - b.size * 0.45, y - b.size * 0.3 + tip * 0.3, x, y);
        ctx.quadraticCurveTo(x + b.size * 0.45, y - b.size * 0.3 + tip * 0.3, x + b.size, y + tip);
      }
      ctx.stroke();
    }
    if (fog) {
      // between the backdrop and the road: the fog's thick base sits on the road's far edge under the camera (eased so
      // bumps do not bob it) and it thins upwards into the scenery; two sheets drifting at different depths, a phone draws one
      const span = roadSpan(scene), target = H / 2 - (scene.sim.visH(cam.x) + (span ? span.far : 0.6) - cam.y) * ppm;
      mistY = mistY == null || Math.abs(mistY - target) > H ? target : mistY + (target - mistY) * 0.05;
      for (const [factor, drift, lift, alpha] of TOUCH ? [[0.24, 16, 0.3, 2]] : [[0.12, 9, 0.36, 1.5], [0.24, 16, 0.24, 1.7]]) drawFog(factor, drift, mistY - H * lift, mistY + H * 0.02, alpha);
    }
    drawParticles(0);
    scene.view.worldTransform();
  }

  // one tiling sheet of fog from `top` down to `bottom` (its thickest part, at the road's far edge), then solid to the screen's bottom
  function drawFog(factor, drift, top, bottom, alpha) {
    const { W, H, ppm, cam } = scene.view, ctx = screen(), s = Math.min(1.35, Math.max(0.75, H / 810));
    const sheetH = Math.max(H * 0.1, bottom - top), tileW = Math.max(H * 0.9, sheetH * 2.6);
    const off = ((cam.x * ppm * factor + time * drift * s * Math.sign(cfg.wind || 1)) % tileW + tileW) % tileW;
    ctx.globalAlpha = Math.min(1, (cfg.mist.strength ?? 0.5) * alpha);
    // whole-pixel tiles that meet edge to edge: an overlap would show as a brighter seam
    // and below it the sheet's bottom rows stretched to the screen's bottom edge, so where the road dips the fog still
    // rises from below instead of ending in a straight line (the road covers what lies under it)
    const tail = H - (top + sheetH);
    for (let x = -off; x < W; x += tileW) {
      const a = Math.floor(x), w = Math.floor(x + tileW) - a;
      ctx.drawImage(fog, a, top, w, sheetH);
      if (tail > 0) ctx.drawImage(fog, 0, fog.height - 4, fog.width, 4, a, top + sheetH - 1, w, tail + 1);
    }
    ctx.globalAlpha = 1;
  }

  // on the trail, behind the trucks (world transform)
  function drawWorld() {
    if (!weeds.length) return;
    const { ctx } = scene.view, img = sprites().tumbleweed;
    for (const w of weeds) { ctx.save(); ctx.translate(w.x, w.y); ctx.rotate(-w.rot); ctx.drawImage(img, -w.r, -w.r, w.r * 2, w.r * 2); ctx.restore(); }
  }

  // in front of everything: the near weather and the lightning flash
  function drawNear() {
    drawParticles(1);
    if (flash > 0.01) { const { W, H } = scene.view, ctx = screen(); ctx.fillStyle = `rgba(230,236,255,${(flash * 0.32).toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
  }

  return {
    update(dt) { if (!cfg) setup(); update(dt); },
    drawSky, drawWorld, drawNear,
    get lensDrops() { return cfg?.lensDrops ?? 0; },
    get wind() { return cfg?.wind ?? 0; },
    reset: setup,
  };
}
