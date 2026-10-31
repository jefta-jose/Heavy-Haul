import { createRigCache } from '../sprite-cache.js';
import { wheelRadius } from '../../physics/vehicle.js';

// Vehicles, each with its load drawn into its body art. A vehicle is drawn as far tires, body, near
// tires. Near tires stay in front of the body throughout suspension travel. The
// body follows its physics body; each tire follows its own wheel body's position and spin.

export function createVehicleLayer(scene) {
  const { view, content } = scene;
  const caches = new Map();
  const rigCache = item => { if (!caches.has(item.id)) caches.set(item.id, createRigCache(view, item.rig, item.artUri)); return caches.get(item.id); };
  // warm every cache so images are decoded before the first run
  for (const item of [...content.cars, ...content.service]) rigCache(item);
  let flash = null;

  function drawBody(rig, C, body, src, dx = 0, dy = 0) {
    const { ctx } = view, p = body.getPosition(), k = 1 / rig.pixelsPerMetre, A = C.images.body;
    ctx.save(); ctx.translate(p.x + dx, p.y + dy); ctx.rotate(body.getAngle()); ctx.scale(1, -1);
    ctx.drawImage(src, -rig.bodyOrigin[0] * k, -rig.bodyOrigin[1] * k, A.width * k, A.height * k); ctx.restore();
  }
  function drawWheel(rig, C, w, src, far = false, dx = 0, dy = 0, i = 0) {
    const { ctx } = view, p = w.getPosition(), s = wheelRadius(rig, i) / rig.wheelArtRadius * (far ? 0.95 : 1), img = C.images.wheel;
    ctx.save(); ctx.translate(p.x + dx + (far ? rig.farWheelOffset[0] : 0), p.y + dy + (far ? rig.farWheelOffset[1] : 0)); ctx.rotate(w.getAngle()); ctx.scale(1, -1);
    ctx.drawImage(src, -rig.wheelPivot[0] * s, -rig.wheelPivot[1] * s, img.width * s, img.height * s); ctx.restore();
  }
  function drawVehicle(v) {
    const C = rigCache(v.car); C.prepare(); if (!C.body) return;
    const rig = v.car.rig, { truck, wheels } = v.parts;
    wheels.forEach((w, i) => drawWheel(rig, C, w, C.wheelFar, true, 0, 0, i)); drawBody(rig, C, truck, C.body);
    wheels.forEach((w, i) => drawWheel(rig, C, w, C.wheel, false, 0, 0, i));
  }

  // 4x4 / DIFF feedback: a pulsing colored border traced around the vehicle silhouette.
  function border(v, dt) {
    if (!flash) return;
    flash.t -= Math.min(0.05, dt || 1 / 60);
    if (flash.t <= 0) { flash = null; return; }
    const C = rigCache(v.car); if (!C.body) return;
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

  return {
    flash(on) { flash = { color: on ? '#39e66a' : '#ff3b30', t: 1.5, max: 1.5 }; },
    // parked vehicles first, the one being driven on top
    draw(dt) {
      const sim = scene.sim, list = [...sim.vehicles.filter(v => v !== sim.active), sim.active];
      for (const v of list) { if (v === sim.active) border(v, dt); drawVehicle(v); }
      for (const v of sim.vehicles) winchCable(v);
    },
    get ready() { return [...caches.values()].every(c => c.loaded()); },
  };
}
