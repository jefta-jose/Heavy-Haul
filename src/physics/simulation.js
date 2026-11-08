import { GLOBAL_FUEL_BURN_MULTIPLIER, WINCH_BAY_SLACK_M, WINCH_BAY_OFFSET_M, CROSS_CLASS_PULL, NEVER_STUCK_MU, SPAWN_REACH, POWER_TIMES, INSTANT_BRAKE_RATE, DAMAGE_START_KMH, DAMAGE_PER_HIT, DAMAGE_HIT_COOLDOWN_S, DAMAGE_SLOWEST_POWER, TIP_MAX_LENGTH_M, TIP_KICK, AUTO_UP_AT, AUTO_DOWN_AT, AUTO_HOLD_S, REVERSE_AFTER_S, SERVICE_TORQUE_MULTIPLIER, SERVICE_GRIP_MULTIPLIER, SERVICE_WINCH_MULTIPLIER, MIN_PULL_BY_CLASS, FUEL_TANK_SECONDS_BY_CLASS, FUEL_IDLE_SHARE, STATION_STOP_KMH, STATION_FILL_SECONDS, STATION_REPAIR_SECONDS, START_BARRIER_BEHIND_M } from '../game-config.js';
import { createTerrain } from './terrain.js';
import { buildObstacles, CRUSH_IMPULSE } from './obstacles.js';
import { buildVehicle, wheelRadius } from './vehicle.js';
import { createDrivetrain } from './drivetrain.js';
import { valueNoise } from './math.js';

// Composes terrain, obstacles and vehicles into one fixed-step simulation. The world holds the main
// vehicle (its load is part of the car: art and mass) plus any service trucks summoned during the
// run. Only the active vehicle takes input; `ctl`, `st`, `truck` and friends always refer to it.
// A breakdown truck's winch (service trucks with `physics.winchForce`) hooks
// onto any vehicle within reach and tows it as the breakdown truck drives away; it is only strong on
// trucks of its own class. Service trucks never get stuck (`physics.neverStuck`) and never run out of
// fuel. One-off happenings (a rock breaking, a tire hitting an obstacle) go to `events`.

const GRIP_REFERENCE = 'mud-terrain';
const CABLE_STRETCH = 0.25;       // metres of stretch at which the cable pulls with full winch force

export function createSimulation(pl, { season, rockHulls, wheelTypes = {} }) {
  const V = (x, y) => new pl.Vec2(x, y);
  const trail = season.trail, surfaces = season.surfaces;
  const terrain = createTerrain(trail, surfaces);
  const { visH, colH, zones, X0, X1 } = terrain;
  // behind the start a wall (drawn as a line across the road) stops trucks reversing off the trail
  const BARRIER_X = Math.max(X0, trail.start - START_BARRIER_BEHIND_M);
  const BRAKE = { rise: 2.5, fall: 5 };
  const events = [], crushQueue = [];
  const load = new Map();   // tire normal loads, measured from the solver's contact impulses every step
  let world, obstacles, vehicles = [], active = null, main = null, stepDt = 1 / 120;
  // the main vehicle's controls and readings persist across runs (the HUD holds them)
  const mainCtl = newCtl(), mainSt = newSt();

  // Wet mud is patchy: each tire finds its own grip, so an open differential feels the worst patch.
  const mudPatch = x => 0.55 + 0.5 * (valueNoise(x / 2.7, 9) * 0.5 + 0.5);
  // Tire types change grip per surface, relative to mud-terrain tires (softened by half).
  function gripTable(type) {
    const g = wheelTypes[type]?.grip, ref = wheelTypes[GRIP_REFERENCE]?.grip;
    if (!g || !ref || type === GRIP_REFERENCE) return null;
    const t = {}; for (const s of Object.keys(ref)) t[s] = 1 + 0.5 * ((g[s] ?? ref[s]) / ref[s] - 1);
    return t;
  }

  function buildWorld() {
    world = new pl.World({ gravity: V(0, -9.81) });
    const ground = world.createBody();
    // one continuous chain per surface zone, with ghost vertices so tires roll across joints
    const step = terrain.step;
    for (const [z0, z1, s] of zones) {
      const vs = [];
      for (let x = z0; x < z1 - 1e-6; x += step) vs.push(V(x, colH(x)));
      vs.push(V(z1, colH(z1)));
      const ch = new pl.Chain(vs, false);
      ch.setPrevVertex(V(z0 - step, colH(z0 - step)));
      ch.setNextVertex(V(z1 + step, colH(z1 + step)));
      ground.createFixture(ch, { friction: surfaces[s].mu * surfaces[s].mu, userData: { surf: s } });
    }
    ground.createFixture(new pl.Edge(V(BARRIER_X, colH(BARRIER_X) - 2), V(BARRIER_X, colH(BARRIER_X) + 40)), { friction: 0.5 });
    ground.createFixture(new pl.Edge(V(X1, colH(X1)), V(X1, colH(X1) + 40)), { friction: 0.5 });
    obstacles = buildObstacles({ pl, world, terrain, trail, hulls: rockHulls });

    // a tire touching a log, pipe or rock makes a sound, and at speed a tire or the chassis hitting a solid one hurts
    world.on('begin-contact', c => {
      const fa = c.getFixtureA(), fb = c.getFixtureB(), a = fa.getUserData(), b = fb.getUserData();
      if (a?.tire && b?.obstacle) events.push({ type: 'hit', tires: a });
      else if (b?.tire && a?.obstacle) events.push({ type: 'hit', tires: b });
      if (a?.obstacle) obstacleHit(fb, a); else if (b?.obstacle) obstacleHit(fa, b);
    });
    world.on('post-solve', (c, imp) => {
      const fa = c.getFixtureA(), fb = c.getFixtureB();
      for (const f of [fa, fb]) {
        const ud = f.getUserData(); if (!ud || !ud.tire) continue;
        const b = f.getBody(), o = (f === fa ? fb : fa).getUserData();
        let n = 0; const ni = imp.normalImpulses; for (let i = 0; i < ni.length; i++) n += ni[i];
        const L = load.get(b) || { imp: 0, surf: null }; L.imp += n; if (o && o.surf) L.surf = o.surf; load.set(b, L);
        if (o && o.crush && o.crush.alive && ud.massT >= (o.crush.minMassT ?? 0)) { o.crush.hit += n; if (o.crush.hit > (o.crush.impulse ?? CRUSH_IMPULSE)) crushQueue.push(o.crush); }
      }
    });
    world.on('pre-solve', c => {
      const fa = c.getFixtureA(), fb = c.getFixtureB(), ua = fa.getUserData(), ub = fb.getUserData();
      const tire = ua && ua.tire ? fa : ub && ub.tire ? fb : null, other = tire === fa ? ub : ua;
      if (!tire || !other || !other.surf) return;
      const td = tire.getUserData(), m = (td.grip?.[other.surf] ?? 1) * (td.gripScale ?? 1);
      if (td.neverStuck && (other.surf === 'mud' || other.surf === 'creek')) c.setFriction(Math.max(NEVER_STUCK_MU * (td.serviceGrip ?? 1), surfaces[other.surf].mu * m));
      else if (other.surf === 'mud' || other.surf === 'creek') { const x = tire.getBody().getPosition().x; c.setFriction(surfaces[other.surf].mu * mudPatch(x) * pitGrip(x) * m); }
      else if (m !== 1) { c.resetFriction(); c.setFriction(c.getFriction() * m); }   // reset: pre-solve runs every step
    });
  }

  // Damage from a solid obstacle: it grows with the square of the speed over DAMAGE_START_KMH. Things that break
  // under this truck do no harm. A short truck is also thrown nose-up.
  function obstacleHit(fixture, obstacle) {
    const body = fixture.getBody(), v = vehicles.find(o => o.parts.truck === body || o.parts.wheels.includes(body));
    if (!v || v.role !== 'main' || v.hitT > 0) return;
    if (obstacle.crush?.alive && v.tireData.massT >= (obstacle.crush.minMassT ?? 0)) return;
    if (v.car.power === 'invincible' && v.st.powerT > 0) return;   // the Invincible power: no damage, and no throw
    const truck = v.parts.truck, vel = truck.getLinearVelocity(), kmh = Math.hypot(vel.x, vel.y) * 3.6;
    if (kmh < DAMAGE_START_KMH) return;
    const severity = (kmh - DAMAGE_START_KMH) / 10, amount = severity * severity * DAMAGE_PER_HIT;
    addDamage(v, amount);
    v.hitT = DAMAGE_HIT_COOLDOWN_S;
    if (v.car.physics.size[0] <= TIP_MAX_LENGTH_M) truck.applyAngularImpulse(truck.getInertia() * TIP_KICK * severity * Math.sign(vel.x || 1), true);
  }
  function addDamage(v, amount) {
    v.st.damage = Math.min(100, v.st.damage + amount);
    events.push({ type: 'damage', amount, damage: v.st.damage });
  }

  // Every power runs, then recharges, then waits to be used again
  function stepPower(dt) {
    const st = main.st;
    if (st.powerT > 0) { st.powerT -= dt; if (st.powerT <= 0) { st.powerT = 0; st.powerCoolT = POWER_TIMES[main.car.power].cooldown; } }
    else if (st.powerCoolT > 0) st.powerCoolT = Math.max(0, st.powerCoolT - dt);
  }

  function crushRocks() {
    for (const r of crushQueue) {
      if (!r.alive) continue;
      r.alive = false; world.destroyBody(r.body); r.body = null;
      events.push({ type: 'crush', x: r.x, y: r.y + r.above * 0.5, w: r.w, surf: r.surf });
    }
    crushQueue.length = 0;
  }

  function wheelSurf(w) {
    for (let ce = w.getContactList(); ce; ce = ce.next) {
      const c = ce.contact;
      if (!c.isTouching()) continue;
      const fa = c.getFixtureA(), fb = c.getFixtureB();
      const ud = (fa.getBody() === w ? fb : fa).getUserData();
      if (ud && ud.surf) return ud.surf;
    }
    return null;
  }

  // Recovery is forward only: park the whole service truck inside the offset recovery bay.
  // Like station bays, entry is measured along the road, not vertically.
  // The cable connects rear winch to front tow point and keeps its initial length.
  const rearPoint = v => v.car.rig.towRear ?? (Math.min(...v.car.rig.axles) - v.car.rig.radius);
  // each service truck's bay fits it with WINCH_BAY_SLACK_M to spare, so a small one is not given a huge target
  const bayLength = v => v.car.rig.nose - rearPoint(v) + WINCH_BAY_SLACK_M;
  function towPoints(v, o) {
    const la = V(rearPoint(v), v.car.rig.winch[1]);
    const lb = V(o.car.rig.winch[0], o.car.rig.winch[1]);
    const from = v.parts.truck.getWorldPoint(la), to = o.parts.truck.getWorldPoint(lb);
    return { la, lb, from, to, d: Math.hypot(to.x - from.x, to.y - from.y) };
  }
  // Share one bay and readiness check between hooking, HUD and directional guidance.
  const canWinch = v => !!v && v.role === 'service' && v.car.physics.winchForce > 0;
  function nearestHook(v) {
    if (!canWinch(v)) return null;
    let best = null;
    for (const o of vehicles) if (o !== v) {
      const t = towPoints(v, o);
      const start = o.parts.truck.getWorldPoint(V(o.car.rig.nose, 0)).x + WINCH_BAY_OFFSET_M;
      const end = start + bayLength(v);
      const ahead = v.parts.truck.getPosition().x > o.parts.truck.getPosition().x;
      const front = v.parts.truck.getWorldPoint(V(v.car.rig.nose, 0)).x;
      const rear = v.parts.truck.getWorldPoint(V(rearPoint(v), 0)).x;
      const inRange = ahead && rear >= start && front <= end;
      const bayDistance = Math.max(start - rear, front - end, 0);
      if (!best || (inRange && !best.inRange) || (inRange === best.inRange &&
        (bayDistance < best.bayDistance || (bayDistance === best.bayDistance && t.d < best.d)))) {
        best = { ...t, target: o, bay: { start, end }, bounds: { front, rear }, bayDistance, inRange };
      }
    }
    return best;
  }
  // hook the nearest vehicle in reach, or unhook if already hooked; returns what happened
  function toggleWinch(v) {
    if (!canWinch(v)) return { ok: false, reason: 'no-winch' };
    if (v.cable) { v.cable = null; return { ok: true, attached: false }; }
    const h = nearestHook(v);
    if (!h) return { ok: false, reason: 'nothing' };
    if (!h.inRange) return { ok: false, reason: h.bounds.rear < h.bay.start ? 'behind' : 'far', gap: h.d, bayDistance: h.bayDistance, target: h.target };
    v.cable = { target: h.target, la: h.la, lb: h.lb, length: Math.max(0.5, h.d) };
    return { ok: true, attached: true, target: h.target };
  }
  // the cable as a stiff, tension-only spring with damping, capped at the winch's force; both
  // vehicles feel it, so the service truck has to out-pull whatever holds the other one back
  function pullCable(v) {
    const c = v.cable; if (!c) return;
    const o = c.target, a = v.parts.truck, b = o.parts.truck;
    const from = a.getWorldPoint(c.la), to = b.getWorldPoint(c.lb), dx = from.x - to.x, dy = from.y - to.y, d = Math.hypot(dx, dy);
    c.from = from; c.to = to; c.taut = false;
    if (d <= c.length || d < 1e-6) return;
    const va = a.getLinearVelocityFromWorldPoint(from), vb = b.getLinearVelocityFromWorldPoint(to);
    const ma = vehicleMass(v) + loadMass(v), mb = vehicleMass(o) + loadMass(o), mr = ma * mb / (ma + mb);
    const ux = dx / d, uy = dy / d, Fmax = winchForce(v, o, mb), k = Fmax / CABLE_STRETCH;
    const opening = (va.x - vb.x) * ux + (va.y - vb.y) * uy;
    const F = Math.max(0, Math.min(Fmax, k * (d - c.length) + 2 * Math.sqrt(k * mr) * opening));
    b.applyForce(V(ux * F, uy * F), to, true); a.applyForce(V(-ux * F, -uy * F), from, true);
    o.winched = true; c.taut = F > 0;
  }

  // full force on its own class; on any other class a share of what that truck's own service truck needs
  // a stand-in (another class's truck filling in until a class's own has art) serves that class
  const classOf = v => v.serves ?? v.car.class;
  const sameClass = (v, o) => !classOf(v) || !classOf(o) || classOf(v) === classOf(o);
  const winchForce = (v, o, mb = vehicleMass(o) + loadMass(o)) => sameClass(v, o) ? v.car.physics.winchForce * SERVICE_WINCH_MULTIPLIER : Math.min(v.car.physics.winchForce, CROSS_CLASS_PULL * mb * 9.81 * 0.7);

  function rollingResistance(w, R, dt) {
    const L = load.get(w); if (!L || !L.imp) return;
    const N = L.imp / dt, crr = surfaces[L.surf]?.rolling ?? 0.035, om = w.getAngularVelocity();
    const I = w.getInertia(), cap = Math.abs(om) * I / dt;   // never reverse the wheel within a step
    const tq = Math.min(crr * N * R, cap);
    w.applyTorque(-Math.sign(om) * tq, true);
  }
  function mudDrag(w, dt, pull = 1) {
    // deep mud: suction grows with speed plus a bog drag that holds a slow tire in the rut. In a
    // heavy-mud pit the bog also grows with the load on the tire (heavyDrag, a share of it), so a
    // heavy rig sinks and drags in proportion and a pit stops every class, not only the light ones.
    // physics.mudPull (1 = stock) divides all of it, only in mud and only in L
    const wv = w.getLinearVelocity(), L = load.get(w), N = L && L.imp ? L.imp / dt : 0;
    const pit = (surfaces.mud.heavyDrag ?? 0) * terrain.mudHeavyAt(w.getPosition().x) * N;
    // a light tire (under bogRefT tonnes) sinks less and drags less, so a scout can wiggle through
    const light = surfaces.mud.bogRefT ? Math.min(1, N / (surfaces.mud.bogRefT * 9810)) : 1;
    const bog = (surfaces.mud.bog * light + pit) * Math.tanh(wv.x / 0.35);
    w.applyForceToCenter(V((-wv.x * surfaces.mud.suction - bog) / pull, 0), true);
  }
  // grip left in a heavy-mud pit: heavyGrip at its centre, easing back to 1 at its edges
  const pitGrip = x => 1 - (1 - (surfaces.mud.heavyGrip ?? 1)) * terrain.mudHeavyAt(x);

  // ---------- vehicles ----------
  function newCtl() { return { gas: 0, brake: 0, gear: 'H', awd: false, diff: false, handbrake: false }; }
  function newSt() { return { rpm: 750, powerT: 0, powerCoolT: 0, speed: 0, fuel: 100, engine: 'on', crankT: 0, inMud: 0, slip: 0, surf: 'gravel', throttle: 0, brake: 0, power: 0, hold: false, damage: 0, atStation: null, inBay: false, filling: false }; }

  function makeVehicle(car, role, x, { ctl = newCtl(), st = newSt() } = {}) {
    const tireData = { tire: true, massT: (car.physics.mass + (car.physics.load?.massT ?? 0) * 1000) / 1000 }, grip = gripTable(car.wheelType);
    if (car.physics.tireGrip && car.physics.tireGrip !== 1) tireData.gripScale = car.physics.tireGrip;   // garage tuning
    if (car.role) { tireData.serviceGrip = SERVICE_GRIP_MULTIPLIER; tireData.gripScale = (tireData.gripScale ?? 1) * SERVICE_GRIP_MULTIPLIER; }
    if (grip) tireData.grip = grip;
    if (car.physics.neverStuck) tireData.neverStuck = true;
    const v = { car, role, ctl, st, drivetrain: createDrivetrain(withMinPull(car)), tireData, winched: false, cable: null, hitT: 0 };
    spawnParts(v, x);
    return v;
  }
  function spawnParts(v, x) { v.parts = buildVehicle({ pl, world, terrain, car: v.car, x0: x, tireData: v.tireData }); }
  function removeParts(v) { v.parts.destroy(); }
  // the card's fuel-efficiency stat (0..100): 70 is the reference, every 40 points halves or doubles the burn
  const efficiencyBurn = car => GLOBAL_FUEL_BURN_MULTIPLIER * 2 ** ((70 - (car.stats?.fuelEfficiency ?? 70)) / 40);
  const loadMass = v => (v.car.physics.load?.massT ?? 0) * 1000;
  const vehicleMass = v => v.car.physics.mass + v.car.physics.wheelMass * v.parts.wheels.length;

  // grip available to driven wheel i: friction x measured load x radius
  function gripOf(v, i) {
    const w = v.parts.wheels[i], L = load.get(w), N = L && L.imp ? L.imp / stepDt : 0;
    const mu = L && L.surf ? surfaces[L.surf].mu : 0.9, m = (L && L.surf ? (v.tireData.grip?.[L.surf] ?? 1) : 1) * (v.tireData.gripScale ?? 1);
    const soft = L && (L.surf === 'mud' || L.surf === 'creek');
    if (soft && v.tireData.neverStuck) return Math.max(NEVER_STUCK_MU * (v.tireData.serviceGrip ?? 1), mu * m) * N * wheelRadius(v.car.rig, i);
    return mu * (soft ? mudPatch(w.getPosition().x) * pitGrip(w.getPosition().x) : 1) * N * wheelRadius(v.car.rig, i) * m;
  }

  // A truck that can't pull MIN_PULL_BY_CLASS of its own weight in its short gear gets more torque until it can.
  function withMinPull(car) {
    const dc = car.drivetrain, wanted = MIN_PULL_BY_CLASS[car.class]; if (car.role) return { ...dc, torqueScale: dc.torqueScale * SERVICE_TORQUE_MULTIPLIER };
    if (!wanted) return dc;
    const peak = Math.max(...dc.torqueCurve.map(([, t]) => t)) * dc.torqueScale / (dc.torqueTune ?? 1);   // the stock engine
    const weight = (car.physics.mass + car.physics.wheelMass * car.rig.axles.length + (car.physics.load?.massT ?? 0) * 1000) * 9.81;
    const pull = peak * dc.gears.L / car.rig.radius / weight;
    return pull >= wanted ? dc : { ...dc, torqueScale: dc.torqueScale * wanted / pull };
  }
  // Short gear from rest and when slowing, long gear once it runs out of revs. Holding the brake at a standstill
  // starts reversing: then the brake pedal drives and the gas pedal stops it.
  function autoGears(v, fwd, dt) {
    const { ctl, car } = v, dc = car.drivetrain, kmh = Math.abs(fwd) * 3.6;
    const shortTop = dc.governedRpm / dc.gears.L * 2 * Math.PI / 60 * car.rig.radius * 3.6;
    v.shiftT = Math.max(0, (v.shiftT ?? 0) - dt);
    if (ctl.gear === 'R') {
      if (ctl.gas > 0.1 && fwd > -0.5) { ctl.gear = 'L'; v.shiftT = AUTO_HOLD_S; return { gas: ctl.gas, brake: 0 }; }
      return { gas: ctl.brake, brake: ctl.gas };
    }
    if (ctl.brake > 0.1 && ctl.gas < 0.1 && Math.abs(fwd) < 0.4) {
      v.reverseT = (v.reverseT ?? 0) + dt;
      if (v.reverseT > REVERSE_AFTER_S) { ctl.gear = 'R'; v.reverseT = 0; return { gas: ctl.brake, brake: 0 }; }
    } else v.reverseT = 0;
    if (!v.shiftT) {
      if (ctl.gear !== 'H' && kmh > shortTop * AUTO_UP_AT) { ctl.gear = 'H'; v.shiftT = AUTO_HOLD_S; }
      else if (ctl.gear !== 'L' && kmh < shortTop * AUTO_DOWN_AT) { ctl.gear = 'L'; v.shiftT = AUTO_HOLD_S; }
    }
    return ctl;
  }

  function stepVehicle(v, dt) {
    const { ctl, st, car } = v, { truck, wheels, joints } = v.parts, dc = car.drivetrain;
    const vel = truck.getLinearVelocity();
    const ang = truck.getAngle();
    const fwd = vel.x * Math.cos(ang) + vel.y * Math.sin(ang);
    st.speed = fwd;
    // the engine: off, cranking on the starter for the car's crank time, then running
    if (st.engine === 'cranking' && (st.crankT -= dt) <= 0) { st.engine = 'on'; st.rpm = dc.idleRpm + 700; }   // it catches and flares
    if ((st.fuel <= 0 || st.damage >= 100) && st.engine !== 'off') st.engine = 'off';
    v.hitT = Math.max(0, v.hitT - dt);
    // a damaged truck has less power and a lower top speed
    const health = 1 - st.damage / 100 * (1 - DAMAGE_SLOWEST_POWER);
    // automatic gears: the pedals decide what the gearbox does (ctl.auto), and in reverse they swap over
    const pedals = ctl.auto ? autoGears(v, fwd, dt) : ctl;
    // throttle spools up and drops faster; brake pressure builds progressively
    const want = st.engine === 'on' ? pedals.gas : 0;
    st.throttle += Math.max(-dt * 3, Math.min(dt * dc.throttleRise, want - st.throttle));
    st.brake += Math.max(-dt * BRAKE.fall, Math.min(dt * BRAKE.rise, pedals.brake - st.brake));
    // parking hold: stopped, no throttle, no pedal -> brakes on so the vehicle doesn't roll back
    st.hold = want < 0.05 && pedals.brake < 0.05 && Math.abs(fwd) < 0.6 && !v.winched;
    const brake = Math.max(st.brake, st.hold ? 0.7 : 0);
    const grounded = wheels.some(w => load.get(w)?.imp > 0);
    // the Instant brakes power: on the ground, braking faster than DAMAGE_START_KMH starts it, so ordinary slow braking keeps it ready; and the pedal takes the speed straight off, whatever the truck weighs
    if (car.power === 'brakes' && pedals.brake > 0.1 && !v.winched && grounded) {
      if (!st.powerT && !st.powerCoolT && Math.abs(fwd) * 3.6 > DAMAGE_START_KMH) st.powerT = POWER_TIMES.brakes.seconds;
    }
    if (car.power === 'brakes' && st.powerT > 0 && pedals.brake > 0.1 && grounded) {
      const keep = Math.exp(-INSTANT_BRAKE_RATE * pedals.brake * dt);
      for (const b of [truck, ...wheels]) { const u = b.getLinearVelocity(); b.setLinearVelocity(V(u.x * keep, u.y * keep)); }
      for (const w of wheels) w.setAngularVelocity(w.getAngularVelocity() * keep);
    }

    const { ratio, dir, omAvg, govOmega, driveOmega, driven, caps } = v.drivetrain.update({ ctl, st, wheels, joints, dt, gripOf: i => gripOf(v, i) });

    let mud = 0, slip = 0, surf = null;
    for (let i = 0; i < wheels.length; i++) {
      const w = wheels[i], j = joints[i], R = wheelRadius(car.rig, i);
      const s = wheelSurf(w); if (s) surf = s; if (s === 'mud') mud++;
      if (ctl.handbrake) {
        // handbrake: every wheel held, whatever the throttle does
        j.setMotorSpeed(0); j.setMaxMotorTorque(dc.brakeTorque);
      } else if (brake > 0.01 && st.throttle < 0.05) {
        j.setMotorSpeed(0); j.setMaxMotorTorque(dc.brakeTorque * brake);
      } else if (Math.abs(omAvg) > govOmega * 1.03 && Math.sign(omAvg) === dir) {
        // over the governor (rolling downhill): the engine and exhaust brake hold the gear's speed
        j.setMotorSpeed(dir * govOmega); j.setMaxMotorTorque((dc.engineBrake + dc.exhaustBrake) * ratio / wheels.length);
      } else if (st.throttle > 0.01 && driven.includes(i)) {
        j.setMotorSpeed(dir * driveOmega * health); j.setMaxMotorTorque(caps[i] * health);
      } else if (st.throttle > 0.01) {
        j.setMotorSpeed(0); j.setMaxMotorTorque(40);          // front axle free-wheeling with AWD off
      } else if (v.winched) {
        j.setMotorSpeed(0); j.setMaxMotorTorque(40);          // towed on the cable: rolls freely
      } else {
        // engine braking through the gearbox
        j.setMotorSpeed(0); j.setMaxMotorTorque(dc.engineBrake * ratio / wheels.length);
      }
      rollingResistance(w, R, dt);
      slip = Math.max(slip, Math.abs(Math.abs(w.getAngularVelocity() * R) - Math.abs(fwd)));
      if (s === 'mud' && !v.tireData.neverStuck) mudDrag(w, dt, ctl.gear === 'L' ? car.physics.mudPull : 1);   // mud pull only works in the short gear
    }
    // fuel burns over time, less at idle, not at all at a station; a better engine or a thriftier truck burns less
    if (st.engine === 'on' && v.role !== 'service' && !st.inBay) {
      const tank = FUEL_TANK_SECONDS_BY_CLASS[car.class] ?? 340;
      st.fuel = Math.max(0, st.fuel - dt * 100 / tank * (FUEL_IDLE_SHARE + (1 - FUEL_IDLE_SHARE) * st.throttle) * (dc.fuelBurn ?? 1) * efficiencyBurn(car));
    }
    st.inMud = mud; st.slip = slip; st.surf = surf || st.surf;
    v.parts.bumpStops(dt);
  }

  // Stopped in a station's bay, the main truck refuels and repairs together, whether it drove in or was towed.
  function stepStation(dt) {
    if (!main) return;
    const st = main.st, x = main.parts.truck.getPosition().x;
    st.atStation = terrain.stationAt(x) ?? null;
    st.inBay = !!st.atStation && Math.abs(st.speed) * 3.6 < STATION_STOP_KMH && main.ctl.gas < 0.1;
    st.filling = st.inBay && (st.fuel < 100 || st.damage > 0) && st.damage < 100;
    if (!st.filling) return;
    st.fuel = Math.min(100, st.fuel + dt * 100 / STATION_FILL_SECONDS);
    st.damage = Math.max(0, st.damage - dt * 100 / STATION_REPAIR_SECONDS);
  }

  function step(dt) {
    stepDt = dt;
    for (const v of vehicles) v.winched = false;
    // cables first, so a towed vehicle's parking hold lets go this step
    for (const v of vehicles) pullCable(v);
    for (const v of vehicles) stepVehicle(v, dt);
    load.clear();
    world.step(dt, 10, 6);
    stepStation(dt);
    stepPower(dt);
    if (crushQueue.length) crushRocks();
  }

  const sim = {
    V, season, terrain, surfaces, trail, events, barrierX: BARRIER_X,
    surfAt: terrain.surfAt, visH, colH,
    get world() { return world; },
    get vehicles() { return vehicles; }, get active() { return active; }, get main() { return main; },
    get car() { return active.car; }, get ctl() { return active.ctl; }, get st() { return active.st; },
    get truck() { return active.parts.truck; }, get wheels() { return active.parts.wheels; }, get joints() { return active.parts.joints; },
    get wheelRadius() { return active.car.rig.radius; },
    get rocks() { return obstacles.rocks; }, get logs() { return obstacles.logs; }, get speedSigns() { return obstacles.speedSigns; },
    // winch for the active vehicle: what it could hook, hook / unhook, and its cable
    nearestHook: (v = active) => nearestHook(v),
    toggleWinch: (v = active) => toggleWinch(v),
    canWinch: (v = active) => canWinch(v),
    cable: (v = active) => v.cable,
    distance: (v, o) => towPoints(v, o).d,
    // the most the active service truck's winch can pull on another vehicle (weaker off its class)
    winchForce: (o, v = active) => winchForce(v, o),
    sameClass,
    // the active service truck's recovery bay length, in metres
    get winchReach() { return Math.round(bayLength(active)); },
    // start a run: a fresh world with the chosen car
    init(x = trail.start, setup = sim.setup) {
      sim.setup = setup;
      buildWorld(); events.length = 0;
      main = makeVehicle(setup.car, 'main', x, { ctl: mainCtl, st: mainSt });
      vehicles = [main]; active = main;
      mainSt.powerT = 0; mainSt.powerCoolT = 0; mainSt.fuel = 100; mainSt.damage = 0; mainSt.filling = false; mainSt.inBay = false; mainSt.atStation = null; mainSt.throttle = 0; mainSt.brake = 0; mainSt.engine = 'on'; mainSt.crankT = 0; mainCtl.handbrake = false;
    },
    // put a vehicle (default: the main one) back on the trail at x, upright
    respawn(x, v = main) { removeParts(v); spawnParts(v, x); for (const o of vehicles) if (o === v || o.cable?.target === v) o.cable = null; },
    spawnService(car, x = sim.serviceSpot(car), serves = car.class) { const v = makeVehicle(car, 'service', x); v.serves = serves; vehicles.push(v); return v; },
    // where a called service truck parks: ahead of the main truck, on firm ground if any lies
    // close by (a truck stuck in mud is towed out by one standing past the mud)
    serviceSpot(car) {
      const nose = main.parts.truck.getWorldPoint(V(main.car.rig.nose, 0)).x, rear = -(car.rig.towRear ?? -car.rig.nose);
      const len = car.rig.nose + rear, firm = x => { for (let t = x - rear; t <= x + car.rig.nose; t += 1) if (terrain.surfAt(t) === 'mud') return false; return true; };
      for (let gap = 6; gap <= SPAWN_REACH; gap += 1) if (firm(nose + gap + rear)) return Math.min(X1 - len, nose + gap + rear);
      return Math.min(X1 - len, nose + 8 + rear);
    },
    // where a called service truck starts: the beginning of the trail, moved forward past any
    // vehicle already standing there
    startSpot(car) {
      const rear = -(car.rig.towRear ?? -car.rig.nose), len = car.rig.nose + rear;
      let x = trail.start;
      for (let moved = true; moved;) {
        moved = false;
        for (const o of vehicles) {
          const p = o.parts.truck.getPosition().x, o0 = p - (-(o.car.rig.towRear ?? -o.car.rig.nose)), o1 = p + o.car.rig.nose;
          if (x - rear < o1 + 2 && x + car.rig.nose > o0 - 2) { x = o1 + 2 + rear; moved = true; }
        }
      }
      return Math.min(X1 - len, x);
    },
    setActive(v) { active = v; },
    // the power button: starts the main truck's Invincible if it has one and it has recharged
    usePower() {
      const st = main.st, kind = main.car.power;
      if (active !== main || main.car.role || kind !== 'invincible' || st.powerT > 0 || st.powerCoolT > 0) return false;
      st.powerT = POWER_TIMES[kind].seconds; return true;
    },
    // engine switch: starting cranks for the car's crank time (car.json audio.crankS) first
    startEngine(v = active) { if (v.st.engine === 'off' && v.st.fuel > 0) { v.st.engine = 'cranking'; v.st.crankT = v.car.audio?.crankS ?? 1.2; } return v.st.engine; },
    stopEngine(v = active) { v.st.engine = 'off'; v.st.crankT = 0; return v.st.engine; },
    vehicleMass, loadMass,
    step,
  };
  return sim;
}
