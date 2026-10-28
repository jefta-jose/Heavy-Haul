import { puff } from './canvas-utils.js';
import { waterAt } from './layers/water.js';
import { wheelRadius } from '../physics/vehicle.js';

// Pooled world-space particles driven by the simulation: exhaust smoke, tire dust, mud flecks,
// water splashes and spray, and rock-crush debris. Splash and crush events are reported through
// onEvent so audio can follow.

const MAX = 520;
const PUFF = { smoke: puff(58, 58, 56), haze: puff(170, 170, 165), dust: puff(160, 128, 88), spray: puff(225, 235, 232), mud: puff(70, 52, 32) };

export function createParticles(scene, onEvent) {
  const sim = scene.sim;
  let R = 1, rig = null;
  const parts = [];
  const add = p => { if (parts.length < MAX) parts.push(p); };
  const emitPuff = (kind, x, y, vx, vy, size, grow, life, alpha) => add({ t: 0, kind, x, y, vx, vy, size, grow, life, max: life, alpha, drag: 1.6, g: -0.25 });
  const emitDrop = (x, y, vx, vy, size, life, color) => add({ t: 1, x, y, vx, vy, size, life, max: life, color, g: 9.8 });
  const emitChunk = (x, y, vx, vy, size, color) => add({ t: 2, x, y, vx, vy, size, life: 2.6, max: 2.6, color, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 14, g: 9.8, shape: [0, 1, 2, 3, 4].map(() => 0.6 + Math.random() * 0.5) });

  const wasWet = [], dustAcc = [], sprayAcc = [];
  let smokeAcc = 0, lastRpm = 0, lastVehicle = null;
  const state = { water: 0 };

  function emit(dt) {
    if (sim.active !== lastVehicle) { lastVehicle = sim.active; wasWet.length = dustAcc.length = sprayAcc.length = 0; smokeAcc = 0; lastRpm = sim.st.rpm; }
    R = sim.wheelRadius; rig = sim.car.rig;
    // exhaust: light idle haze, dark puffs when the throttle loads the engine
    const ex = sim.truck.getWorldPoint(sim.V(rig.exhaust[0], rig.exhaust[1])), v = sim.truck.getLinearVelocity();
    const rev = Math.max(0, (sim.st.rpm - lastRpm) / dt); lastRpm = sim.st.rpm;
    smokeAcc += dt * (3 + sim.st.throttle * 16 + Math.min(10, rev * 0.01));
    while (smokeAcc > 1) {
      smokeAcc--; const heavy = sim.st.throttle > 0.35 || rev > 300;
      emitPuff(heavy ? 'smoke' : 'haze', ex.x, ex.y, v.x * 0.55 - 0.9 - Math.random() * 0.5, 0.3 + Math.random() * 0.4, 0.1 + Math.random() * 0.06, heavy ? 1.0 : 0.6, heavy ? 1.7 : 1.2, heavy ? 0.55 : 0.3);
    }
    state.water = 0;
    sim.wheels.forEach((w, i) => {
      R = wheelRadius(sim.car.rig, i);
      dustAcc[i] ??= 0; sprayAcc[i] ??= 0;
      const p = w.getPosition(), surf = sim.surfAt(p.x), spin = w.getAngularVelocity(), tread = -spin * R, speed = Math.abs(v.x);
      const slip = Math.max(0, Math.abs(tread) - speed), dir = Math.sign(tread || v.x || 1), gy = sim.visH(p.x);
      const touching = p.y - R - sim.colH(p.x) < 0.12;
      // tire dust on dry ground
      if (touching && (surf === 'dirt' || surf === 'gravel' || surf === 'rock')) {
        dustAcc[i] += dt * (speed > 1 ? speed * 2.4 : 0) + dt * slip * 8;
        while (dustAcc[i] > 1) { dustAcc[i]--; emitPuff('dust', p.x - dir * R * 0.55 + (Math.random() - 0.5) * 0.3, gy + 0.12, -dir * (0.4 + slip * 0.3) + v.x * 0.3, 0.25 + Math.random() * 0.5, 0.2, 1.1, 1.5, surf === 'rock' ? 0.32 : 0.42); }
        if (slip > 1.2 && Math.random() < slip * dt * 8) emitDrop(p.x - dir * R * 0.5, gy + 0.06, -dir * (1 + slip * 0.6 + Math.random()), 0.8 + Math.random() * 1.8, 0.02 + Math.random() * 0.02, 0.7, '#5f4c35');
      }
      // mud flecks thrown off the tread
      if (touching && surf === 'mud') {
        const rate = Math.abs(spin) > 0.8 ? (slip * 14 + speed * 3) : 0;
        if (Math.random() < rate * dt) emitDrop(p.x - dir * R * 0.35, p.y - R * 0.4, -dir * (0.8 + Math.min(5, slip) * 0.7 + Math.random()), 0.8 + Math.random() * Math.min(4, 1 + slip), 0.02 + Math.random() * 0.04, 0.8, Math.random() < 0.5 ? '#4b3c27' : '#5d4e36');
        if (slip > 1.5 && Math.random() < slip * dt * 2) emitPuff('mud', p.x - dir * R * 0.6, gy + 0.1, -dir * (0.6 + slip * 0.2), 0.5, 0.12, 0.4, 0.7, 0.35);
      }
      // water: a splash on entry, then bow wave and spray while moving
      const q = waterAt(sim, p.x), wet = !!q && p.y - R < q.level;
      if (wet) {
        const depth = Math.min(1, (q.level - (p.y - R)) / R), power = speed + slip * 0.5;
        state.water = Math.max(state.water, power * depth);
        const waterColor = q.muddy ? 'rgba(147,130,85,0.92)' : 'rgba(214,230,226,0.9)';
        if (!wasWet[i] && speed > (q.muddy ? 0.35 : 0.8)) {
          const n = Math.min(60, 10 + speed * 10);
          for (let k = 0; k < n; k++) { const a = Math.random() * Math.PI; emitDrop(p.x + Math.cos(a) * R, q.level, Math.cos(a) * speed * 0.6 + v.x * 0.3, 1.5 + Math.random() * speed * 1.2, 0.02 + Math.random() * 0.035, 1.1, waterColor); }
          for (let k = 0; k < 6; k++) emitPuff(q.muddy ? 'mud' : 'spray', p.x + (Math.random() - 0.5) * R * 2, q.level + 0.2, v.x * 0.3, 0.6 + Math.random(), q.muddy ? 0.14 : 0.25, 1.2, 0.8, q.muddy ? 0.25 : 0.5);
          onEvent({ type: 'splash', power: Math.min(1.5, speed / 3) });
        }
        sprayAcc[i] += dt * power * 30 * Math.max(0.35, depth);
        while (sprayAcc[i] > 1) {
          sprayAcc[i]--;
          const front = Math.random() < 0.55, x = p.x + (front ? 1 : -1) * dir * R * (0.7 + Math.random() * 0.3);
          emitDrop(x, q.level, (front ? 1 : -0.6) * dir * (0.6 + Math.random() * 1.2) + v.x * 0.4, 1.2 + Math.random() * (1.5 + power * 0.6), 0.02 + Math.random() * 0.035, 0.9, waterColor);
          if (Math.random() < 0.4) emitPuff(q.muddy ? 'mud' : 'spray', x, q.level + 0.1, v.x * 0.3, 0.5, 0.18, 1.1, 0.7, q.muddy ? 0.22 : 0.45);
        }
      }
      wasWet[i] = wet;
    });
    // crushed rocks burst into chunks and dust
    while (sim.events.length) {
      const e = sim.events.shift();
      if (e.type === 'bridge-crack' || e.type === 'bridge-break') {
        for (let k = 0; k < (e.type === 'bridge-break' ? 14 : 4); k++) emitChunk(e.x, e.y, (Math.random() - 0.5) * 2, Math.random() * 1.5, 0.025 + Math.random() * 0.04, k % 2 ? '#80613e' : '#ad8d5a');
        onEvent(e); continue;
      }
      if (e.type === 'tank-splash') {
        // water thrown over the rim of a live-load tank
        for (let k = 0; k < 6 + e.power * 8; k++) emitDrop(e.x + (Math.random() - 0.5) * 0.5, e.y + 0.05, e.vx * (0.5 + Math.random() * 0.5) + (Math.random() - 0.5), 1.2 + Math.random() * 2.2 * e.power, 0.02 + Math.random() * 0.03, 0.9, 'rgba(196,226,236,0.9)');
        emitPuff('spray', e.x, e.y + 0.1, e.vx * 0.3, 0.6, 0.12, 0.8, 0.6, 0.35);
        onEvent(e); continue;
      }
      if (e.type !== 'crush') continue;
      for (let k = 0; k < 12; k++) emitChunk(e.x + (Math.random() - 0.5) * e.w * 0.6, e.y + Math.random() * 0.15, (Math.random() - 0.5) * 3 + v.x * 0.3, 1 + Math.random() * 2.6, 0.035 + Math.random() * e.w * 0.09, Math.random() < 0.5 ? '#6e6a60' : '#8b867a');
      for (let k = 0; k < 5; k++) emitPuff('dust', e.x + (Math.random() - 0.5) * e.w, e.y, (Math.random() - 0.5) * 0.8, 0.3 + Math.random() * 0.5, 0.2, 0.9, 1.4, 0.4);
      onEvent({ type: 'crush', size: e.w });
    }
  }

  function advance(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.life -= dt;
      if (p.life <= 0) { parts[i] = parts[parts.length - 1]; parts.pop(); continue; }
      p.vy -= p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.t === 0) { p.size += p.grow * dt; const d = Math.max(0, 1 - p.drag * dt); p.vx *= d; p.vy *= d; }
      else if (p.t === 2) { p.rot += p.vr * dt; const gy = sim.visH(p.x); if (p.y < gy + p.size * 0.4 && p.vy < 0) { p.y = gy + p.size * 0.4; p.vy *= -0.3; p.vx *= 0.55; p.vr *= 0.5; } }
    }
  }

  // 'back': exhaust behind the vehicle; 'front': everything else
  function draw(layer) {
    const { ctx } = scene.view;
    for (const p of parts) {
      if (p.t === 0) {
        if ((p.kind === 'smoke' || p.kind === 'haze') !== (layer === 'back')) continue;
        ctx.globalAlpha = p.alpha * Math.min(1, p.life / p.max * 1.6) * Math.min(1, (p.max - p.life) * 8 + 0.2);
        ctx.drawImage(PUFF[p.kind], p.x - p.size, p.y - p.size, p.size * 2, p.size * 2); continue;
      }
      if (layer === 'back') continue;
      ctx.globalAlpha = Math.min(1, p.life / p.max * 2); ctx.fillStyle = p.color;
      if (p.t === 1) { ctx.beginPath(); ctx.ellipse(p.x, p.y, p.size, p.size * 0.75, 0, 0, 7); ctx.fill(); }
      else {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.beginPath();
        for (let k = 0; k < 5; k++) { const t = k / 5 * Math.PI * 2; ctx.lineTo(Math.cos(t) * p.size * p.shape[k], Math.sin(t) * p.size * p.shape[k] * 0.8); }
        ctx.closePath(); ctx.fill(); ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
  }

  return {
    update(dt, playing) { if (playing && dt > 0) emit(dt); advance(dt); },
    draw,
    get water() { return state.water; },
  };
}
