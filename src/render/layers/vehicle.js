import { createRigCache } from '../sprite-cache.js';
import { wheelRadius, drawnBodyLift, easeBodyLift } from '../../physics/vehicle.js';
import { HIT_GLOW_SECONDS, HIT_GLOW_COLOR, INVINCIBLE_WARN_SECONDS, SHIELD_COLOR, NITRO_COLOR, BODY_LIFT_RESPONSE, TYRE_BURST_RADIUS, MUD_COAT_SECONDS, MUD_CLEAN_SECONDS, MUD_WASH_SECONDS } from '../../game-config.js';

// Vehicles, each with its load drawn into its body art. A vehicle is drawn as far tires, body, near
// tires. Near tires stay in front of the body throughout suspension travel. The
// body follows its physics body; each tire follows its own wheel body's position and spin.

const HIT_BURST_S = 0.26;

export function createVehicleLayer(scene) {
  const { view } = scene;
  const caches = new Map();
  const rigCache = item => { if (!caches.has(item.id)) caches.set(item.id, createRigCache(view, item.rig, item.artUri, item.art)); return caches.get(item.id); };
  let flash = null, hitBurst = 0;
  // each vehicle's drawn body lift: it eases toward what its wheels ask for, once a frame. A new run or respawn builds new parts, so it starts level
  const lifts = new WeakMap();
  const liftOf = v => { if (!lifts.has(v.parts)) lifts.set(v.parts, { lift: 0, tilt: 0, vLift: 0, vTilt: 0 }); return lifts.get(v.parts); };
  function easeLift(v, dt) {
    const { truck, wheels } = v.parts, rig = v.car.rig;
    easeBodyLift(liftOf(v), drawnBodyLift(rig, wheels.map((w, i) => v.parts.tyres?.[i] === 'lost' ? 0 : truck.getLocalPoint(w.getPosition()).y - rig.wheelY[i])), BODY_LIFT_RESPONSE, Math.min(0.05, dt || 0));
  }
  let raised = { lift: 0, tilt: 0 };
  const settle = v => { raised = liftOf(v); };
  const raise = ctx => { if (raised.lift || raised.tilt) { ctx.translate(0, raised.lift); ctx.rotate(Math.atan(raised.tilt)); } };

  function drawBody(rig, C, body, src, dx = 0, dy = 0) {
    const { ctx } = view, p = body.getPosition(), k = 1 / rig.pixelsPerMetre, A = C.images.body;
    ctx.save(); ctx.translate(p.x + dx, p.y + dy); ctx.rotate(body.getAngle()); raise(ctx); ctx.scale(1, -1);
    ctx.drawImage(src, -rig.bodyOrigin[0] * k, -rig.bodyOrigin[1] * k, A.width * k, A.height * k); ctx.restore();
  }
  // a burst tyre is drawn flattened where it meets the ground, with its rubber bulging out
  function drawWheel(rig, C, w, src, far = false, dx = 0, dy = 0, i = 0, burst = false) {
    const { ctx } = view, p = w.getPosition(), s = wheelRadius(rig, i) / rig.wheelArtRadius * (far ? 0.95 : 1), img = C.wheelSize;
    if (burst) {
      const R = wheelRadius(rig, i), x = p.x + dx + (far ? rig.farWheelOffset[0] : 0), floor = p.y + dy + (far ? rig.farWheelOffset[1] : 0) - R * TYRE_BURST_RADIUS;
      ctx.save(); ctx.beginPath(); ctx.rect(x - R * 2, floor, R * 4, R * 4); ctx.clip();
      drawWheel(rig, C, w, src, far, dx, dy, i); ctx.restore();
      if (src === C.wheel || src === C.wheelFar) { ctx.fillStyle = far ? '#121210' : '#1c1b18'; ctx.beginPath(); ctx.ellipse(x, floor + R * 0.04, R * 1.04, R * 0.07, 0, 0, 7); ctx.fill(); }
      return;
    }
    ctx.save(); ctx.translate(p.x + dx + (far ? rig.farWheelOffset[0] : 0), p.y + dy + (far ? rig.farWheelOffset[1] : 0)); ctx.rotate(w.getAngle()); ctx.scale(1, -1);
    ctx.drawImage(src, -rig.wheelPivot[0] * s, -rig.wheelPivot[1] * s, img.width * s, img.height * s); ctx.restore();
  }
  // A running power's glow: violet while nothing can hurt the truck, flickering for its last seconds, and blue on nitro. Null when there is none.
  function powerGlow(v) {
    const left = v.st.powerT, kind = v.car.power; if (v.role !== 'main' || !(left > 0)) return null;
    const now = performance.now() / 1000, breathe = 0.82 + 0.18 * Math.sin(now * 5);
    if (kind === 'nitro') return { kind, color: NITRO_COLOR, pale: '#d6ecff', strength: 0.8 + 0.2 * Math.sin(now * 30) };
    if (kind === 'invincible') return { kind, color: SHIELD_COLOR, pale: '#f3e4ff', strength: left > INVINCIBLE_WARN_SECONDS ? breathe : Math.sin(now * 20) > 0 ? breathe : 0.25 };
    return null;
  }
  function drawGlow(v, { color, pale, strength }) {
    const C = rigCache(v.car), rig = v.car.rig, { ctx } = view, { truck, wheels } = v.parts, A = C.images.body, W = C.wheelSize, k = 1 / rig.pixelsPerMetre;
    const artRadius = i => wheelRadius(rig, i) / rig.wheelArtRadius;
    const halo = C.haloOf(color, pale, A.width * k / C.body.width, W.width * artRadius(0) / C.wheel.width);
    const put = (h, src, x, y, w, ht) => { const px = h.pad * w / src.width, py = h.pad * ht / src.height; ctx.drawImage(h.canvas, x - px, y - py, w + px * 2, ht + py * 2); };
    ctx.save(); ctx.globalAlpha = strength;
    const p = truck.getPosition();
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(truck.getAngle()); raise(ctx); ctx.scale(1, -1);
    put(halo.body, C.body, -rig.bodyOrigin[0] * k, -rig.bodyOrigin[1] * k, A.width * k, A.height * k); ctx.restore();
    wheels.forEach((w, i) => {
      const q = w.getPosition(), s = artRadius(i);
      ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(w.getAngle()); ctx.scale(1, -1);
      if (v.parts.tyres?.[i] !== 'lost') put(halo.wheel, C.wheel, -rig.wheelPivot[0] * s, -rig.wheelPivot[1] * s, W.width * s, W.height * s); ctx.restore();
    });
    ctx.restore();
  }
  // Nitro's speed lines: thin blue streaks racing back off the truck's tail
  function drawSpeedLines(v) {
    const { ctx } = view, rig = v.car.rig, body = v.parts.truck, now = performance.now() / 1000, A = rigCache(v.car).images.body, k = 1 / rig.pixelsPerMetre;
    const tail = -rig.bodyOrigin[0] * k, height = A.height * k, top = rig.bodyOrigin[1] * k;
    ctx.save(); ctx.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      const t = (now * 2.4 + i * 0.37) % 1, y = top - height * ((i * 0.618) % 1), len = 1.2 + ((i * 0.41) % 1) * 2.2, from = tail + 0.6 - t * 3.5;
      const a = body.getWorldPoint({ x: from, y }), b = body.getWorldPoint({ x: from - len, y });
      ctx.globalAlpha = (1 - t) * 0.75; ctx.strokeStyle = i % 3 ? NITRO_COLOR : '#d6ecff'; ctx.lineWidth = 0.05 + (i % 3) * 0.02;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
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
    const rig = v.car.rig, { truck, wheels } = v.parts, glow = powerGlow(v);
    settle(v);
    if (glow?.kind === 'nitro') drawSpeedLines(v);
    if (glow) drawGlow(v, glow);
    const tyres = v.parts.tyres ?? [], on = i => tyres[i] !== 'lost';
    wheels.forEach((w, i) => { if (on(i)) drawWheel(rig, C, w, C.wheelFar, true, 0, 0, i, tyres[i] === 'burst'); });
    // a far tire sinks like the near one: ground over its bottom, behind the body
    const [fx, fy] = rig.farWheelOffset;
    wheels.forEach((w, i) => {
      if (!on(i)) return;
      const p = w.getPosition(), r = wheelRadius(rig, i), x = p.x + fx;
      if (p.y - r + 0.03 < scene.sim.visH(x)) layer.farLip?.(x, r * 1.1, fy);
    });
    drawBody(rig, C, truck, C.bodyAtDamage(v.st.damage ?? 0, v.car.id));
    // mud: the coat below fully, the next one fading in
    const coat = coatOf(v) * 3, full = Math.floor(coat);
    if (full >= 1) drawBody(rig, C, truck, C.mudCoat(Math.min(3, full), v.car.id));
    if (full < 3 && coat - full > 0.02) { view.ctx.globalAlpha = coat - full; drawBody(rig, C, truck, C.mudCoat(full + 1, v.car.id)); view.ctx.globalAlpha = 1; }
    wheels.forEach((w, i) => { if (on(i)) drawWheel(rig, C, w, C.wheel, false, 0, 0, i, tyres[i] === 'burst'); });
    if (coat > 0.05) {
      view.ctx.globalAlpha = coat * 0.09;   // up to 0.27 at a full coat
      wheels.forEach((w, i) => { if (on(i)) drawWheel(rig, C, w, C.wheelMudOf(), false, 0, 0, i, tyres[i] === 'burst'); });
      view.ctx.globalAlpha = 1;
    }
    if (glow?.kind === 'invincible') drawSparkles(v, glow.strength);
  }

  // How muddy each vehicle is, 0 to 1: tyres in mud cake it (spinning ones faster), water washes it, dry ground slowly drops it.
  // Drawing only, so the physics never sees it; a new run builds new vehicles and starts clean.
  const coats = new WeakMap();
  const coatOf = v => coats.get(v) ?? 0;
  function mudUp(v, dt) {
    dt = Math.min(0.05, dt || 0); if (!dt) return;
    const sim = scene.sim, { wheels, truck } = v.parts, tyres = v.parts.tyres ?? [], speed = Math.abs(truck.getLinearVelocity().x);
    let n = 0, mud = 0, water = 0, spin = 0;
    wheels.forEach((w, i) => {
      if (tyres[i] === 'lost') return; n++;
      const p = w.getPosition(), R = wheelRadius(v.car.rig, i), surf = sim.surfAt(p.x);
      if (p.y - R - sim.colH(p.x) > 0.25) return;   // in the air
      if (surf === 'mud') { mud++; spin = Math.max(spin, Math.abs(w.getAngularVelocity() * R) - speed); }
      else if (surf === 'creek') water++;
    });
    let c = coatOf(v);
    if (mud) c += speed > 0.2 || spin > 0.3 ? dt / MUD_COAT_SECONDS * mud / n * (1 + Math.min(1, Math.max(0, spin) / 3)) : 0;   // standing still in mud adds none
    else if (water) c -= dt / MUD_WASH_SECONDS * water / n;
    else c -= dt / MUD_CLEAN_SECONDS;
    coats.set(v, Math.max(0, Math.min(1, c)));
  }

  // AWD / DIFF feedback, and the red glow of a hit: a pulsing colored border traced around the vehicle silhouette. AWD / DIFF
  // light up the truck being driven; a hit always lights up the main truck, as only it takes damage, even while a service truck tows it.
  function border(v, dt) {
    if (!flash) return;
    flash.t -= Math.min(0.05, dt || 1 / 60);
    if (flash.t <= 0) { flash = null; return; }
    const C = rigCache(v.car); if (!C.body) return;
    settle(v);
    const { ctx } = view, o = C.outlineOf(flash.color), f = flash.t / flash.max, pulse = 0.65 + 0.35 * Math.sin((flash.max - flash.t) * 14);
    for (const [d, a] of [[0.075, 0.35], [0.04, 1]]) {
      ctx.globalAlpha = Math.min(1, f * 2.2) * pulse * a;
      for (let i = 0; i < 8; i++) { const t = i * Math.PI / 4, dx = Math.cos(t) * d, dy = Math.sin(t) * d; drawBody(v.car.rig, C, v.parts.truck, o.body, dx, dy); v.parts.wheels.forEach((w, i) => { if (v.parts.tyres?.[i] !== 'lost') drawWheel(v.car.rig, C, w, o.wheel, false, dx, dy, i, v.parts.tyres?.[i] === 'burst'); }); }
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
    // how muddy a vehicle is, 0 to 1; with c, sets it (tests and screenshots)
    mud(v, c) { if (c != null) coats.set(v, c); return coatOf(v); },
    flash(on) { flash = { color: on ? '#39e66a' : '#ff3b30', t: 1.5, max: 1.5 }; },
    hitGlow() { flash = { color: HIT_GLOW_COLOR, t: HIT_GLOW_SECONDS, max: HIT_GLOW_SECONDS, main: true }; hitBurst = HIT_BURST_S; },
    // parked vehicles first, the one being driven on top
    draw(dt) {
      const sim = scene.sim, list = [...sim.vehicles.filter(v => v !== sim.active), sim.active];
      const lit = flash?.main ? sim.main : sim.active;
      for (const v of list) { easeLift(v, dt); mudUp(v, dt); if (v === lit) border(v, dt); drawVehicle(v); }
      // wheels that came off lie where they fell, drawn on their own
      for (const v of sim.vehicles) { const C = rigCache(v.car); if (C.body) v.parts.tyres?.forEach((s, i) => { if (s === 'lost') drawWheel(v.car.rig, C, v.parts.wheels[i], C.wheel, false, 0, 0, i); }); }
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
