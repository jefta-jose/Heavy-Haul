import { makeCanvas } from './canvas-utils.js';
import { LENS_MAX_SPLATS, LENS_MUD_S, LENS_DROP_S } from '../game-config.js';

// The camera as a thing in the world: mud flung off a spinning tyre and water from a splash or the rain land
// on the lens and slide off. Splats are sprites made once and kept off
// the middle of the screen, where the truck is.

const rand = (a, b) => a + Math.random() * (b - a);

function mudSplat(seed) {
  const c = makeCanvas(128, 128), g = c.getContext('2d'), blob = (x, y, r, n) => {
    g.beginPath();
    for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2, k = r * (0.72 + 0.28 * Math.sin(a * 3 + seed) * Math.cos(a * 5 - seed) + Math.random() * 0.12); g.lineTo(x + Math.cos(a) * k, y + Math.sin(a) * k); }
    g.closePath(); g.fill();
  };
  g.fillStyle = 'rgba(58,42,24,0.88)'; blob(64, 64, 30, 28);
  for (let i = 0; i < 9; i++) { const a = rand(0, 7), d = rand(30, 56); blob(64 + Math.cos(a) * d, 64 + Math.sin(a) * d, rand(2.5, 8), 10); }
  // a lighter wet core and a glint, so it reads as mud on glass, not a hole
  g.fillStyle = 'rgba(96,74,46,0.75)'; blob(60, 60, 17, 18);
  g.fillStyle = 'rgba(255,240,215,0.32)'; g.beginPath(); g.ellipse(54, 52, 7, 3.5, -0.6, 0, 7); g.fill();
  return c;
}
function waterDrop() {
  const c = makeCanvas(64, 64), g = c.getContext('2d');
  const body = g.createRadialGradient(28, 26, 2, 32, 32, 28);
  body.addColorStop(0, 'rgba(255,255,255,0.10)'); body.addColorStop(0.75, 'rgba(225,238,248,0.16)'); body.addColorStop(0.93, 'rgba(255,255,255,0.32)'); body.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = body; g.beginPath(); g.arc(32, 32, 28, 0, 7); g.fill();
  // a thin dark edge on top and a bright caustic underneath, as a lens drop flips the light
  g.strokeStyle = 'rgba(20,30,36,0.22)'; g.lineWidth = 1.5; g.beginPath(); g.arc(32, 32, 26, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 2.5; g.beginPath(); g.arc(32, 32, 23, 0.35, 2.4); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.ellipse(23, 21, 6, 3, -0.7, 0, 7); g.fill();
  return c;
}

export function createLens(scene) {
  let SPR = null, splats = [], rainAcc = 0;
  const sprites = () => SPR ??= { mud: [0, 1, 2].map(mudSplat), drop: waterDrop() };

  // somewhere around the edges: the truck stays clear
  function place() {
    const { W, H } = scene.view;
    for (let i = 0; i < 6; i++) {
      const x = rand(0.04, 0.96), y = rand(0.08, 0.92);
      if (!(x > 0.28 && x < 0.78 && y > 0.25 && y < 0.72)) return [x * W, y * H];
    }
    return [rand(0, 0.2) * W, rand(0.1, 0.9) * H];
  }
  function add(kind, scale = 1) {
    if (splats.length >= LENS_MAX_SPLATS) splats.shift();
    const [x, y] = place(), s = Math.min(1.3, Math.max(0.6, scene.view.H / 810));
    const life = kind === 'mud' ? LENS_MUD_S * rand(0.8, 1.2) : LENS_DROP_S * rand(0.7, 1.3);
    splats.push({ kind, x, y, r: (kind === 'mud' ? rand(42, 88) : rand(10, 26)) * s * scale, rot: rand(0, 7), img: Math.floor(rand(0, 3)), life, max: life, slide: kind === 'mud' ? rand(2, 7) : rand(14, 40) });
  }

  return {
    // mud thrown from a tyre, water from a splash
    splat(kind, n = 1, scale = 1) { for (let i = 0; i < n; i++) add(kind, scale); },
    update(dt, rainPerS) {
      if (rainPerS > 0) { rainAcc += dt * rainPerS; while (rainAcc > 1) { rainAcc--; add('drop', 0.8); } }
      for (const s of splats) { s.life -= dt; s.y += s.slide * dt * (s.kind === 'drop' && s.life < s.max * 0.5 ? 2.2 : 1); }
      splats = splats.filter(s => s.life > 0);
    },
    draw() {
      if (!splats.length) return;
      const { ctx, DPR } = scene.view, S = sprites();
      for (const s of splats) {
        const fade = Math.min(1, s.life / Math.min(1.4, s.max * 0.5)), c = Math.cos(s.rot), sn = Math.sin(s.rot);
        ctx.globalAlpha = fade * (s.kind === 'mud' ? 0.92 : 1);
        ctx.setTransform(c * DPR, sn * DPR, -sn * DPR, c * DPR, s.x * DPR, s.y * DPR);
        ctx.drawImage(s.kind === 'mud' ? S.mud[s.img] : S.drop, -s.r, -s.r, s.r * 2, s.r * 2);
      }
      ctx.globalAlpha = 1; ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    },
    clear() { splats = []; },
  };
}
