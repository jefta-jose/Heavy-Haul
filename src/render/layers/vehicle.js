import { createRigCache } from '../sprite-cache.js';
import { wheelRadius, drawnBodyLift } from '../../physics/vehicle.js';
import { HIT_GLOW_SECONDS, HIT_GLOW_COLOR, POWER_WARN_SECONDS } from '../../game-config.js';

// Vehicles, each with its load drawn into its body art. A vehicle is drawn as far tires, body, near
// tires. Near tires stay in front of the body throughout suspension travel. The
// body follows its physics body; each tire follows its own wheel body's position and spin.

const HIT_BURST_S = 0.26;

export function createVehicleLayer(scene) {
  const { view } = scene;
  const caches = new Map();
  const rigCache = item => { if (!caches.has(item.id)) caches.set(item.id, createRigCache(view, item.rig, item.artUri)); return caches.get(item.id); };
  let flash = null, hitBurst = 0;
  // the body's drawn lift for this vehicle, worked out from where its wheels are now
  let raised = { lift: 0, tilt: 0 };
  const settle = v => { const { truck, wheels } = v.parts, rig = v.car.rig; raised = drawnBodyLift(rig, wheels.map((w, i) => truck.getLocalPoint(w.getPosition()).y - rig.wheelY[i])); };
  const raise = ctx => { if (raised.lift || raised.tilt) { ctx.translate(0, raised.lift); ctx.rotate(Math.atan(raised.tilt)); } };

  function drawBody(rig, C, body, src, dx = 0, dy = 0) {
    const { ctx } = view, p = body.getPosition(), k = 1 / rig.pixelsPerMetre, A = C.images.body;
    ctx.save(); ctx.translate(p.x + dx, p.y + dy); ctx.rotate(body.getAngle()); raise(ctx); ctx.scale(1, -1);
    ctx.drawImage(src, -rig.bodyOrigin[0] * k, -rig.bodyOrigin[1] * k, A.width * k, A.height * k); ctx.restore();
  }
  function drawWheel(rig, C, w, src, far = false, dx = 0, dy = 0, i = 0) {
    const { ctx } = view, p = w.getPosition(), s = wheelRadius(rig, i) / rig.wheelArtRadius * (far ? 0.95 : 1), img = C.images.wheel;
    ctx.save(); ctx.translate(p.x + dx + (far ? rig.farWheelOffset[0] : 0), p.y + dy + (far ? rig.farWheelOffset[1] : 0)); ctx.rotate(w.getAngle()); ctx.scale(1, -1);
    ctx.drawImage(src, -rig.wheelPivot[0] * s, -rig.wheelPivot[1] * s, img.width * s, img.height * s); ctx.restore();
  }
  // While a superpower runs the truck can't be damaged: a violet halo says so, with a few sparkles travelling around it.
  // It flickers for the last seconds, just as the timers do. 0 when there is nothing to show.
  function shieldStrength(v) {
    const left = Object.values(v.st.powers ?? {}); if (v.role !== 'main' || !left.length) return 0;
    const now = performance.now() / 1000, breathe = 0.82 + 0.18 * Math.sin(now * 5);
    return Math.max(...left) > POWER_WARN_SECONDS ? breathe : Math.sin(now * 20) > 0 ? breathe : 0.25;
  }
  function drawShield(v, strength) {
    const C = rigCache(v.car), rig = v.car.rig, { ctx } = view, { truck, wheels } = v.parts, A = C.images.body, W = C.images.wheel, k = 1 / rig.pixelsPerMetre;
    const artRadius = i => wheelRadius(rig, i) / rig.wheelArtRadius;
    const halo = C.shieldOf(A.width * k / C.body.width, W.width * artRadius(0) / C.wheel.width);
    const put = (h, src, x, y, w, ht) => { const px = h.pad * w / src.width, py = h.pad * ht / src.height; ctx.drawImage(h.canvas, x - px, y - py, w + px * 2, ht + py * 2); };
    ctx.save(); ctx.globalAlpha = strength;
    const p = truck.getPosition();
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(truck.getAngle()); raise(ctx); ctx.scale(1, -1);
    put(halo.body, C.body, -rig.bodyOrigin[0] * k, -rig.bodyOrigin[1] * k, A.width * k, A.height * k); ctx.restore();
    wheels.forEach((w, i) => {
      const q = w.getPosition(), s = artRadius(i);
      ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(w.getAngle()); ctx.scale(1, -1);
      put(halo.wheel, C.wheel, -rig.wheelPivot[0] * s, -rig.wheelPivot[1] * s, W.width * s, W.height * s); ctx.restore();
    });
    ctx.restore();
  }
  function drawSparkles(v, strength) {
    const { ctx } = view, rig = v.car.rig, body = v.parts.truck, now = performance.now() / 1000, A = rigCache(v.car).images.body, k = 1 / rig.pixelsPerMetre;
    const a = A.width * k / 2 + 0.2, b = A.height * k / 2 + 0.15, cx = (A.width / 2 - rig.bodyOrigin[0]) * k, cy = (rig.bodyOrigin[1] - A.height / 2) * k;
    ctx.save(); ctx.fillStyle = '#fff';
    for (let i = 0; i < 7; i++) {
      const t = now * 0.7 + i * Math.PI * 2 / 7, r = (0.12 + 0.1 * Math.abs(Math.sin(now * 4 + i * 2))), at = body.getWorldPoint({ x: cx + Math.cos(t) * a, y: cy + Math.sin(t) * b });
      ctx.globalAlpha = strength * (0.55 + 0.45 * Math.sin(now * 6 + i * 3));
      ctx.beginPath(); for (let n = 0; n < 8; n++) { const q = n * Math.PI / 4 + 0.3 * i, d = n % 2 ? r * 0.22 : r; ctx.lineTo(at.x + Math.cos(q) * d, at.y + Math.sin(q) * d); } ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  function drawVehicle(v) {
    const C = rigCache(v.car); C.prepare(); if (!C.body) return;
    const rig = v.car.rig, { truck, wheels } = v.parts, shield = shieldStrength(v);
    settle(v);
    if (shield) drawShield(v, shield);
    wheels.forEach((w, i) => drawWheel(rig, C, w, C.wheelFar, true, 0, 0, i));
    // a far tire sinks like the near one: ground over its bottom, behind the body
    const [fx, fy] = rig.farWheelOffset;
    wheels.forEach((w, i) => {
      const p = w.getPosition(), r = wheelRadius(rig, i), x = p.x + fx;
      if (p.y - r + 0.03 < scene.sim.visH(x)) layer.farLip?.(x, r * 1.1, fy);
    });
    drawBody(rig, C, truck, C.bodyAtDamage(v.st.damage ?? 0, v.car.id));
    wheels.forEach((w, i) => drawWheel(rig, C, w, C.wheel, false, 0, 0, i));
    if (shield) drawSparkles(v, shield);
  }

  // 4x4 / DIFF feedback: a pulsing colored border traced around the vehicle silhouette.
  function border(v, dt) {
    if (!flash) return;
    flash.t -= Math.min(0.05, dt || 1 / 60);
    if (flash.t <= 0) { flash = null; return; }
    const C = rigCache(v.car); if (!C.body) return;
    settle(v);
    const { ctx } = view, o = C.outlineOf(flash.color), f = flash.t / flash.max, pulse = 0.65 + 0.35 * Math.sin((flash.max - flash.t) * 14);
    for (const [d, a] of [[0.075, 0.35], [0.04, 1]]) {
      ctx.globalAlpha = Math.min(1, f * 2.2) * pulse * a;
      for (let i = 0; i < 8; i++) { const t = i * Math.PI / 4, dx = Math.cos(t) * d, dy = Math.sin(t) * d; drawBody(v.car.rig, C, v.parts.truck, o.body, dx, dy); v.parts.wheels.forEach((w, i) => drawWheel(v.car.rig, C, w, o.wheel, false, dx, dy, i)); }
    }
    ctx.globalAlpha = 1;
  }

  // a hooked winch cable: straight when taut, sagging when slack
  function winchCable(v) {
    const c = v.cable; if (!c) return;
    const { ctx } = view, p = v.parts.truck.getWorldPoint(c.la), t = c.target.parts.truck.getWorldPoint(c.lb);
    const slack = Math.max(0, c.length - Math.hypot(t.x - p.x, t.y - p.y)), sag = Math.min(1.2, 0.02 + slack * 0.6);
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#3b3a35'; ctx.lineWidth = 0.05; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.quadraticCurveTo((p.x + t.x) / 2, (p.y + t.y) / 2 - sag, t.x, t.y); ctx.stroke();
    ctx.strokeStyle = 'rgba(220,214,190,0.55)'; ctx.lineWidth = 0.018; ctx.stroke();
    ctx.fillStyle = '#e0a020'; ctx.beginPath(); ctx.arc(t.x, t.y, 0.08, 0, 7); ctx.fill();
  }

  const layer = {
    flash(on) { flash = { color: on ? '#39e66a' : '#ff3b30', t: 1.5, max: 1.5 }; },
    hitGlow() { flash = { color: HIT_GLOW_COLOR, t: HIT_GLOW_SECONDS, max: HIT_GLOW_SECONDS }; hitBurst = HIT_BURST_S; },
    // parked vehicles first, the one being driven on top
    draw(dt) {
      const sim = scene.sim, list = [...sim.vehicles.filter(v => v !== sim.active), sim.active];
      for (const v of list) { if (v === sim.active) border(v, dt); drawVehicle(v); }
      for (const v of sim.vehicles) winchCable(v);
      // a star of impact on the nose
      const img = scene.hud['g2-burst'];
      if (hitBurst > 0 && sim.main && img?.complete && img.naturalWidth) {
        hitBurst -= Math.min(0.05, dt || 1 / 60);
        const t = 1 - hitBurst / HIT_BURST_S, s = 1.3 + t * 1.6, at = sim.main.parts.truck.getWorldPoint({ x: sim.main.car.rig.nose, y: 0 }), { ctx } = view;
        ctx.save(); ctx.globalAlpha = Math.max(0, 1 - t); ctx.translate(at.x - s / 2, at.y + s / 2); ctx.scale(1, -1); ctx.drawImage(img, 0, 0, s, s); ctx.restore();
      }
    },
    // art loads per vehicle when first needed: load it ahead for vehicles a run may bring in later
    warm(items) { for (const item of items) if (item) rigCache(item); },
    get ready() { return scene.sim.vehicles.every(v => rigCache(v.car).loaded()); },
  };
  return layer;
}
