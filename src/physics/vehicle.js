// The vehicle as rigid bodies: one chassis plus one wheel body per axle, joined by sprung
// wheel joints. Two physical axles carry the four visible tires of a two-axle car; more axles
// work the same way. All geometry comes from the car's measured registration (car.json `rig`).
import { WHEEL_RISE_MAX_SHARE, WHEEL_DROP_MAX_SHARE } from '../game-config.js';

export function buildVehicle({ pl, world, terrain, car, x0, tireData = { tire: true } }) {
  const V = (x, y) => new pl.Vec2(x, y);
  const { rig, physics } = car, susp = physics.suspension;
  const radiusOf = i => wheelRadius(rig, i);
  const { visH } = terrain;
  // the load is part of the car: its mass adds to the chassis and raises the centre of mass
  const lm = (physics.load?.massT ?? 0) * 1000, lc = physics.load?.centreOfMass ?? physics.centreOfMass, m0 = physics.mass;
  const M = m0 + lm, com = { x: (physics.centreOfMass[0] * m0 + lc[0] * lm) / M, y: (physics.centreOfMass[1] * m0 + lc[1] * lm) / M }, size = { L: physics.size[0], H: physics.size[1] };

  // spawn tilted to the ground under it, then lift until every tire clears
  const span = 3, frontSpan = 3, th = Math.atan2(visH(x0 + frontSpan) - visH(x0 - span), frontSpan + span);
  const c = Math.cos(th), s = Math.sin(th);
  let y0 = visH(x0) + 1.7;
  let need = 0;
  rig.axles.forEach((ax, i) => {
    const ly = rig.wheelY[i], wx = x0 + ax * c - ly * s, wy = y0 + ax * s + ly * c;
    need = Math.max(need, visH(wx) + radiusOf(i) + 0.08 - (wy - susp.sag));
  });
  y0 += need;
  const P = (lx, ly) => V(x0 + lx * c - ly * s, y0 + lx * s + ly * c);
  const AXIS = V(-s, c);
  const filt = { filterGroupIndex: -1 };

  const truck = world.createBody({ type: 'dynamic', position: V(x0, y0), angle: th, angularDamping: 0.2 });
  for (const [a, b, cy, d, dens] of physics.bodyBoxes) truck.createFixture(new pl.Box((b - a) / 2, (d - cy) / 2, V((a + b) / 2, (cy + d) / 2)), { density: dens, friction: 0.45, ...filt });
  setMassExplicit(truck, M, com, size);

  // static axle loads from the mass layout
  const xr = rig.axles.slice(1).reduce((sum, x) => sum + x, 0) / (rig.axles.length - 1), xf = rig.axles[0];
  // a load tuned far behind the rear axles would leave the front a negative share and turn its spring
  // inside out: the front always keeps at least a quarter of an even per-axle share
  const front = Math.max(M / rig.axles.length * 0.25, (M * (com.x - xr)) / (xf - xr));
  const rear = (M - front) / (rig.axles.length - 1);

  const wheels = [], joints = [], springs = [];
  rig.axles.forEach((ax, i) => {
    const load = i === 0 ? front : rear;
    const p = P(ax, rig.wheelY[i] - susp.sag);
    const w = world.createBody({ type: 'dynamic', position: p, angularDamping: 0.02, bullet: true });
    w.createFixture(new pl.Circle(radiusOf(i)), { density: 1, friction: 1.0, ...filt, filterCategoryBits: TIRE_CATEGORY, userData: tireData });
    setMass(w, physics.wheelMass);
    const sp = springFor(M, com, size, ax, physics.wheelMass, load, susp);
    const j = world.createJoint(new pl.WheelJoint({ enableMotor: true, maxMotorTorque: 0, motorSpeed: 0, frequencyHz: sp.hz, dampingRatio: sp.zeta }, truck, w, p, AXIS));
    wheels.push(w); joints.push(j); springs.push({ j, body: truck, wheel: w, k: sp.k, c: sp.c, axleX: ax, load });
  });

  function setMass(body, m) { setWheelMass(V, body, m); }
  function setMassExplicit(body, m, cm, sz) { setBodyMass(V, body, m, cm, sz); }
  const bumpStops = dt => applyBumpStops(V, springs, susp, dt);
  function destroy() { for (const b of [truck, ...wheels]) world.destroyBody(b); }

  return { truck, wheels, joints, springs, bumpStops, destroy };
}

// tires sit in their own collision category
export const TIRE_CATEGORY = 0x0002;

// tire radius of axle i: `rig.radius`, times an optional per-axle `rig.wheelScale` (e.g. a bigger
// front tire drawn in a bigger arch)
export const wheelRadius = (rig, i) => rig.radius * (rig.wheelScale?.[i] ?? 1);

export function setWheelMass(V, body, m) {
  const md = { mass: 0, center: V(0, 0), I: 0 };
  body.getMassData(md);
  const f = m / md.mass;
  md.mass *= f; md.I *= f;
  body.setMassData(md);
}
export function setBodyMass(V, body, m, cm, sz) {
  const Icm = m * (sz.L * sz.L + sz.H * sz.H) / 12;
  body.setMassData({ mass: m, center: V(cm.x, cm.y), I: Icm + m * (cm.x * cm.x + cm.y * cm.y) });
}

// Bump stops: very stiff springs that only act past the end of suspension travel. Explicit
// forces, so gains are capped for stability at the fixed step: the stop's natural frequency
// times dt stays well under 1, and its damping per step under the wheel's momentum.
export function applyBumpStops(V, springs, susp, dt) {
  for (const sp of springs) {
    const tr = sp.j.getJointTranslation();   // + = compressed upward
    let over = 0;
    if (tr > susp.sag + susp.travelUp) over = tr - (susp.sag + susp.travelUp);
    else if (tr < susp.sag - susp.travelDown) over = tr - (susp.sag - susp.travelDown);
    if (!over) continue;
    const m = sp.wheel.getMass(), ax = sp.body.getWorldVector(V(0, 1)), wp = sp.wheel.getPosition();
    // axial travel speed (the joint's own getJointSpeed() is the wheel's spin rate)
    const vb = sp.body.getLinearVelocityFromWorldPoint(wp), vw = sp.wheel.getLinearVelocity();
    const speed = (vw.x - vb.x) * ax.x + (vw.y - vb.y) * ax.y;
    const kMax = m * Math.pow(0.6 / dt, 2), cMax = 0.5 * m / dt;
    let F = -(over * Math.min(sp.k * 6, kMax) + speed * Math.min(sp.c, cMax));
    // a stop can only push the wheel back into its travel range, never hold it at the stop
    if (over > 0) F = Math.min(F, 0); else F = Math.max(F, 0);
    sp.wheel.applyForceToCenter(V(ax.x * F, ax.y * F), true);
    sp.body.applyForce(V(-ax.x * F, -ax.y * F), sp.wheel.getPosition(), true);
  }
}

// How the body is drawn relative to its wheels. Near tires draw in front of the body, so a wheel far above its ride height sits on the
// cab door, and one far below it hangs clear of the truck. A stop in the physics flips the truck, so the picture settles it instead: the
// body is drawn moved and tilted, by as little as it takes, until every wheel looks to be between WHEEL_DROP_MAX_SHARE below and
// WHEEL_RISE_MAX_SHARE above its ride height. Clearing one wheel must not leave another behind: when one straight body cannot suit
// them all (a middle axle alone on a log), they share what is left over. Drawing only: the physics never sees this.
// rises[i]: wheel i's height above its ride height, in body metres. Returns y = lift + tilt * x, in body metres.
const LIFT_ROUNDS = 24, LIFT_STEP = 0.8, LIFT_OTHERS_WEIGHT = 0.02, LIFT_HIGH_WHEEL_WEIGHT = 2;   // a wheel over the door looks worse than a gap under an arch
export function drawnBodyLift(rig, rises) {
  const xs = rig.axles, up = i => wheelRadius(rig, i) * WHEEL_RISE_MAX_SHARE, down = i => wheelRadius(rig, i) * WHEEL_DROP_MAX_SHARE;
  let lift = 0, tilt = 0;
  for (let round = 0; round < LIFT_ROUNDS; round++) {
    // a line fitted to how far each wheel is outside its limits, held mostly by the wheels that are; the rest only steady it
    let sw = 0, sx = 0, sxx = 0, sv = 0, sxv = 0, any = false;
    for (let i = 0; i < xs.length; i++) {
      const gap = rises[i] - (lift + tilt * xs[i]), v = gap > up(i) ? gap - up(i) : gap < -down(i) ? gap + down(i) : 0;
      const w = v > 0 ? LIFT_HIGH_WHEEL_WEIGHT : v < 0 ? 1 : LIFT_OTHERS_WEIGHT; if (v) any = true;
      sw += w; sx += w * xs[i]; sxx += w * xs[i] * xs[i]; sv += w * v; sxv += w * xs[i] * v;
    }
    if (!any) break;
    const det = sw * sxx - sx * sx, dTilt = (sw * sxv - sx * sv) / det;
    tilt += LIFT_STEP * dTilt; lift += LIFT_STEP * (sv - dTilt * sx) / sw;
  }
  return { lift, tilt };
}

// The drawn lift follows its target smoothly, or the body jumps as wheels reach their limits: a critically damped spring, solved
// exactly so it behaves the same at any frame rate. `state` is { lift, tilt, vLift, vTilt }; response is in radians per second.
export function easeBodyLift(state, target, response, dt) {
  const fade = Math.exp(-response * dt);
  for (const [x, v] of [['lift', 'vLift'], ['tilt', 'vTilt']]) {
    const off = state[x] - target[x], push = (state[v] + response * off) * dt;
    state[v] = (state[v] - response * push) * fade;
    state[x] = target[x] + (off + push) * fade;
  }
  return state;
}

// Box2D's wheel-joint spring is defined by the frequency and damping ratio of the joint's
// effective mass (mostly the wheel). Convert a physical spring rate k = load*g/sag and a damping
// ratio relative to the sprung load into those parameters.
export function springFor(M, com, size, axleX, mw, load, susp) {
  const g = 9.81, k = load * g / susp.sag;
  const Icm = M * (size.L * size.L + size.H * size.H) / 12, dx = axleX - com.x;
  const mEff = 1 / (1 / M + 1 / mw + dx * dx / Icm);
  const omega = Math.sqrt(k / mEff);
  const c = susp.damping * 2 * Math.sqrt(k * load);
  return { k, c, hz: omega / (2 * Math.PI), zeta: c / (2 * mEff * omega) };
}
