// A live load: a glass tank of water with an animal in it (the Ice Breaker's orca), animated from the
// truck's own motion. All parts are layers cut from the approved body art (rig.tank in car.json, in
// body pixels), drawn in the body's transform so they bounce and pitch with it.
//
// Water: the surface is a damped spring tilt. It leans against acceleration (piling up at the back
// when the truck pulls away, surging forward under braking), stays level in the world when the truck
// pitches, and rocks on bumps. Ripples run along it. Hard sloshes throw spray over the rim.
// Animal: swims gently in place and lags behind the truck's motion on its own soft spring.

const G = 9.81;
const SLOSH = { w: 3.6, damping: 0.14, maxSlope: 0.05, bob: 1.1 };   // rad/s, ratio, px per px, px per m/s²
const SWIM = { w: 2.2, damping: 0.45, lagPx: 14, maxPx: 40, bobPx: 3.5, rate: 0.85 };

export function createLiveLoad(view, sim) {
  const state = new Map();   // vehicle -> tank state

  function stateOf(v) {
    let s = state.get(v);
    if (!s || s.parts !== v.parts) {
      s = { parts: v.parts, slope: 0, slopeV: 0, bob: 0, bobV: 0, ox: 0, oxV: 0, oy: 0, oyV: 0, t: Math.random() * 10, vel: null, cool: 0 };
      state.set(v, s);
    }
    return s;
  }

  // advance the water and the animal from the truck's acceleration in its own frame
  function step(v, s, dt) {
    const body = v.parts.truck, ang = body.getAngle(), vel = body.getLinearVelocity();
    const c = Math.cos(ang), sn = Math.sin(ang);
    let ax = 0, ay = 0;
    if (s.vel && dt > 0) {
      const dvx = (vel.x - s.vel.x) / dt, dvy = (vel.y - s.vel.y) / dt;
      ax = dvx * c + dvy * sn; ay = -dvx * sn + dvy * c;          // along and across the body
    }
    s.vel = { x: vel.x, y: vel.y };
    ax = Math.max(-25, Math.min(25, ax)); ay = Math.max(-40, Math.min(40, ay));
    // the surface leans against acceleration and stays level in the world (slope in tank pixels, y down)
    const target = Math.tanh((ax / G + Math.tan(ang)) / SLOSH.maxSlope) * SLOSH.maxSlope;
    const w = SLOSH.w, k = w * w, cdamp = 2 * SLOSH.damping * w;
    s.slopeV += (k * (target - s.slope) - cdamp * s.slopeV) * dt; s.slope += s.slopeV * dt;
    s.bobV += (k * 1.6 * (-ay * SLOSH.bob - s.bob) - cdamp * 1.3 * s.bobV) * dt; s.bob += s.bobV * dt;
    s.bob = Math.max(-14, Math.min(14, s.bob));
    // the animal drifts back as the truck pulls away and forward when it brakes, and gets jostled
    const tx = Math.max(-SWIM.maxPx, Math.min(SWIM.maxPx, -ax * SWIM.lagPx)), ty = Math.max(-18, Math.min(18, -ay * 1.2));
    const ws = SWIM.w, ks = ws * ws, cs = 2 * SWIM.damping * ws;
    s.oxV += (ks * (tx - s.ox) - cs * s.oxV) * dt; s.ox += s.oxV * dt;
    s.oyV += (ks * (ty - s.oy) - cs * s.oyV) * dt; s.oy += s.oyV * dt;
    s.t += dt;
    // spray over the rim on a hard slosh or a big jolt
    s.cool -= dt;
    const violence = Math.abs(s.slopeV) * 40 + Math.abs(s.bobV) * 0.05;
    if (violence > 1 && s.cool <= 0) {
      s.cool = 0.35;
      const rect = v.car.rig.tank.rect, end = s.slopeV < 0 ? rect[2] - 30 : rect[0] + 30;   // the end the water climbs
      const k1 = 1 / v.car.rig.pixelsPerMetre, ox = v.car.rig.bodyOrigin[0], oy = v.car.rig.bodyOrigin[1];
      const at = body.getWorldPoint(sim.V((end - ox) * k1, (oy - rect[1]) * k1));
      sim.events.push({ type: 'tank-splash', x: at.x, y: at.y, vx: vel.x + (s.slopeV < 0 ? 1 : -1) * Math.min(2.5, violence), power: Math.min(2, violence) });
    }
  }

  // draw inside the body's transform (body pixels scaled by 1/ppm, y flipped)
  function draw(v, C, dt) {
    const tank = v.car.rig.tank; if (!tank || !C.tank?.orca) return;
    const s = stateOf(v); step(v, s, Math.min(0.05, dt || 0));
    const { ctx } = view, rig = v.car.rig, p = v.parts.truck.getPosition(), k = 1 / rig.pixelsPerMetre, A = C.images;
    const [ox, oy] = rig.bodyOrigin, [x0, y0, x1, y1] = tank.rect, [sy0, sy1] = tank.surface, cx = (x0 + x1) / 2;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(v.parts.truck.getAngle()); ctx.scale(1, -1);
    ctx.scale(k, k); ctx.translate(-ox, -oy);                     // now in body pixels
    ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, y1 - y0); ctx.clip();
    // water surface: vertical slices of the surface band, tilted and rippled
    const band = C.tank.waterSurface, bs = band.width / A.waterSurface.width, slices = 24, sw = (x1 - x0) / slices;
    for (let i = 0; i < slices; i++) {
      const sx = x0 + i * sw, mid = sx + sw / 2;
      const ripple = Math.sin(mid * 0.018 + s.t * 2.2) * 2.2 + Math.sin(mid * 0.041 - s.t * 1.4) * 1.2 * (0.4 + Math.min(1, Math.abs(s.slopeV) * 30));
      const dy = (mid - cx) * s.slope + s.bob + ripple;
      ctx.drawImage(band, sx * bs, sy0 * bs, sw * bs + 1, (sy1 - sy0) * bs, sx, sy0 + dy, sw + 0.6, sy1 - sy0);
    }
    // the animal: lag offset, a slow swim bob, and a slight pitch with the water
    const orca = C.tank.orca, os = orca.width / A.orca.width, [px, py] = tank.pivot;
    const swim = Math.sin(s.t * SWIM.rate * Math.PI * 2 / 2.4);
    ctx.save(); ctx.translate(px + s.ox, py + s.oy + swim * SWIM.bobPx);
    ctx.rotate(s.slope * 0.6 + Math.sin(s.t * 1.1 + 1) * 0.018 - s.oxV * 0.002);
    ctx.drawImage(orca, -px, -py, orca.width / os, orca.height / os); ctx.restore();
    ctx.restore();
    // the tank's frame, posts and straps over the water (unclipped, in body pixels)
    const front = C.tank.tankFront;
    if (front) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(v.parts.truck.getAngle()); ctx.scale(1, -1);
      ctx.drawImage(front, -ox * k, -oy * k, A.tankFront.width * k, A.tankFront.height * k); ctx.restore();
    }
  }

  return { draw, stateOf };
}
