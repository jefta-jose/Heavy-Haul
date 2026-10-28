import { createTerrain } from './terrain.js';
import { buildObstacles, CRUSH_IMPULSE } from './obstacles.js';
import { buildVehicle, wheelRadius } from './vehicle.js';
import { createDrivetrain } from './drivetrain.js';
import { valueNoise } from './math.js';
import { buildBridges } from './bridges.js';

// Composes terrain, obstacles and vehicles into one fixed-step simulation. The world holds the main
// vehicle (its load is part of the car: art and mass) plus any service trucks summoned during the
// run. Only the active vehicle takes input; `ctl`, `st`, `truck` and friends always refer to it.
// A service truck's winch hooks onto any vehicle within reach and tows it as the service truck
// drives away. One-off happenings (a rock breaking) go to `events`.

const GRIP_REFERENCE = 'mud-terrain';
// the winch hook reaches a vehicle this close (metres between tow points), like SnowRunner
export const WINCH_REACH = 5;
const SPAWN_REACH = 14;           // a called service truck parks within this of the main truck
const CABLE_STRETCH = 0.25;       // metres of stretch at which the cable pulls with full winch force

export function createSimulation(pl, { season, rockHulls, wheelTypes = {} }) {
  const V = (x, y) => new pl.Vec2(x, y);
  const trail = season.trail, surfaces = season.surfaces;
  const terrain = createTerrain(trail, surfaces);
  const { visH, colH, zones, waters, X0, X1 } = terrain;
  const BRAKE = { rise: 2.5, fall: 5 };
  const events = [], crushQueue = [];
  const load = new Map();   // tire normal loads, measured from the solver's contact impulses every step
  let world, obstacles, bridgeSystem, vehicles = [], active = null, main = null, stepDt = 1 / 120;
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
    ground.createFixture(new pl.Edge(V(X0, colH(X0)), V(X0, colH(X0) + 40)), { friction: 0.5 });
    ground.createFixture(new pl.Edge(V(X1, colH(X1)), V(X1, colH(X1) + 40)), { friction: 0.5 });
    obstacles = buildObstacles({ pl, world, terrain, trail, hulls: rockHulls });
    bridgeSystem = buildBridges({ pl, world, terrain, events });

    world.on('post-solve', (c, imp) => {
      const fa = c.getFixtureA(), fb = c.getFixtureB();
      for (const f of [fa, fb]) {
        const ud = f.getUserData(); if (!ud || !ud.tire) continue;
        const b = f.getBody(), o = (f === fa ? fb : fa).getUserData();
        let n = 0; const ni = imp.normalImpulses; for (let i = 0; i < ni.length; i++) n += ni[i];
        const L = load.get(b) || { imp: 0, surf: null }; L.imp += n; if (o && o.surf) L.surf = o.surf; load.set(b, L);
        if (o && o.crush && o.crush.alive) { o.crush.hit += n; if (o.crush.hit > CRUSH_IMPULSE) crushQueue.push(o.crush); }
      }
    });
    world.on('pre-solve', c => {
      const fa = c.getFixtureA(), fb = c.getFixtureB(), ua = fa.getUserData(), ub = fb.getUserData();
      const tire = ua && ua.tire ? fa : ub && ub.tire ? fb : null, other = tire === fa ? ub : ua;
      if (!tire || !other || !other.surf) return;
      const td = tire.getUserData(), m = (td.grip?.[other.surf] ?? 1) * (td.gripScale ?? 1);
      if (other.surf === 'mud' || other.surf === 'creek') c.setFriction(surfaces[other.surf].mu * mudPatch(tire.getBody().getPosition().x) * m);
      else if (m !== 1) { c.resetFriction(); c.setFriction(c.getFriction() * m); }   // reset: pre-solve runs every step
    });
  }

  function crushRocks() {
    for (const r of crushQueue) {
      if (!r.alive) continue;
      r.alive = false; world.destroyBody(r.body); r.body = null;
      events.push({ type: 'crush', x: r.x, y: r.y + r.above * 0.5, w: r.w });
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

  // Winching, SnowRunner style: a service truck hooks its cable onto another vehicle within
  // WINCH_REACH and the cable keeps that length; driving away tows the hooked vehicle behind.
  // The hook goes on the end facing the service truck: a vehicle behind it is pulled from its
  // front tow point by the service truck's rear winch, one ahead from its rear by the front winch.
  const rearPoint = v => v.car.rig.towRear ?? (Math.min(...v.car.rig.axles) - v.car.rig.radius);
  function towPoints(v, o) {
    const behind = o.parts.truck.getPosition().x < v.parts.truck.getPosition().x;
    const la = V(behind ? rearPoint(v) : v.car.rig.winch[0], v.car.rig.winch[1]);
    const lb = V(behind ? o.car.rig.winch[0] : rearPoint(o), o.car.rig.winch[1]);
    const from = v.parts.truck.getWorldPoint(la), to = o.parts.truck.getWorldPoint(lb);
    return { la, lb, from, to, d: Math.hypot(to.x - from.x, to.y - from.y) };
  }
  // the nearest other vehicle a service truck could hook, with its distance (in reach or not)
  function nearestHook(v) {
    if (!v || v.role !== 'service') return null;
    let best = null;
    for (const o of vehicles) if (o !== v) { const t = towPoints(v, o); if (!best || t.d < best.d) best = { ...t, target: o }; }
    return best;
  }
  // hook the nearest vehicle in reach, or unhook if already hooked; returns what happened
  function toggleWinch(v) {
    if (!v || v.role !== 'service') return { ok: false, reason: 'not-service' };
    if (v.cable) { v.cable = null; return { ok: true, attached: false }; }
    const h = nearestHook(v);
    if (!h) return { ok: false, reason: 'nothing' };
    if (h.d > WINCH_REACH) return { ok: false, reason: 'far', gap: h.d, target: h.target };
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
    const ux = dx / d, uy = dy / d, Fmax = v.car.physics.winchForce, k = Fmax / CABLE_STRETCH;
    const va = a.getLinearVelocityFromWorldPoint(from), vb = b.getLinearVelocityFromWorldPoint(to);
    const ma = vehicleMass(v) + loadMass(v), mb = vehicleMass(o) + loadMass(o), mr = ma * mb / (ma + mb);
    const opening = (va.x - vb.x) * ux + (va.y - vb.y) * uy;
    const F = Math.max(0, Math.min(Fmax, k * (d - c.length) + 2 * Math.sqrt(k * mr) * opening));
    b.applyForce(V(ux * F, uy * F), to, true); a.applyForce(V(-ux * F, -uy * F), from, true);
    o.winched = true; c.taut = F > 0;
  }

  function rollingResistance(w, R, dt) {
    const L = load.get(w); if (!L || !L.imp) return;
    const N = L.imp / dt, crr = surfaces[L.surf]?.rolling ?? 0.035, om = w.getAngularVelocity();
    const I = w.getInertia(), cap = Math.abs(om) * I / dt;   // never reverse the wheel within a step
    const tq = Math.min(crr * N * R, cap);
    w.applyTorque(-Math.sign(om) * tq, true);
  }
  function mudDrag(w) {
    // deep mud: suction grows with speed plus a bog drag that holds a slow tire in the rut
    const wv = w.getLinearVelocity(), bog = surfaces.mud.bog * Math.tanh(wv.x / 0.35);
    w.applyForceToCenter(V(-wv.x * surfaces.mud.suction - bog, 0), true);
  }

  // ---------- vehicles ----------
  function newCtl() { return { gas: 0, brake: 0, gear: 'H', awd: false, diff: false }; }
  function newSt() { return { rpm: 750, speed: 0, fuel: 100, engine: 'on', crankT: 0, inMud: 0, inWater: 0, slip: 0, surf: 'gravel', throttle: 0, brake: 0, power: 0, hold: false }; }

  function makeVehicle(car, role, x, { ctl = newCtl(), st = newSt() } = {}) {
    const tireData = { tire: true }, grip = gripTable(car.wheelType);
    if (car.physics.tireGrip && car.physics.tireGrip !== 1) tireData.gripScale = car.physics.tireGrip;   // garage tuning
    if (grip) tireData.grip = grip;
    const v = { car, role, ctl, st, drivetrain: createDrivetrain(car.drivetrain), tireData, winched: false, cable: null };
    spawnParts(v, x);
    return v;
  }
  function spawnParts(v, x) { v.parts = buildVehicle({ pl, world, terrain: { ...terrain, visH: terrain.driveH }, car: v.car, x0: x, tireData: v.tireData }); }
  function removeParts(v) { v.parts.destroy(); }
  // the card's fuel-efficiency stat (0..100): 70 is the reference, every 40 points halves or doubles the burn
  const efficiencyBurn = car => 2 ** ((70 - (car.stats?.fuelEfficiency ?? 70)) / 40);
  const loadMass = v => (v.car.physics.load?.massT ?? 0) * 1000;
  const vehicleMass = v => v.car.physics.mass + v.car.physics.wheelMass * v.parts.wheels.length;

  // grip available to driven wheel i: friction x measured load x radius
  function gripOf(v, i) {
    const w = v.parts.wheels[i], L = load.get(w), N = L && L.imp ? L.imp / stepDt : 0;
    const mu = L && L.surf ? surfaces[L.surf].mu : 0.9, m = (L && L.surf ? (v.tireData.grip?.[L.surf] ?? 1) : 1) * (v.tireData.gripScale ?? 1);
    return mu * (L && (L.surf === 'mud' || L.surf === 'creek') ? mudPatch(w.getPosition().x) : 1) * N * wheelRadius(v.car.rig, i) * m;
  }

  function stepVehicle(v, dt) {
    const { ctl, st, car } = v, { truck, wheels, joints } = v.parts, dc = car.drivetrain;
    const vel = truck.getLinearVelocity();
    const ang = truck.getAngle();
    const fwd = vel.x * Math.cos(ang) + vel.y * Math.sin(ang);
    st.speed = fwd;
    // the engine: off, cranking on the starter for the car's crank time, then running
    if (st.engine === 'cranking' && (st.crankT -= dt) <= 0) { st.engine = 'on'; st.rpm = dc.idleRpm + 700; }   // it catches and flares
    if (st.fuel <= 0 && st.engine !== 'off') st.engine = 'off';
    // throttle spools up and drops faster; brake pressure builds progressively
    const want = st.engine === 'on' ? ctl.gas : 0;
    st.throttle += Math.max(-dt * 3, Math.min(dt * dc.throttleRise, want - st.throttle));
    st.brake += Math.max(-dt * BRAKE.fall, Math.min(dt * BRAKE.rise, ctl.brake - st.brake));
    // parking hold: stopped, no throttle, no pedal -> brakes on so the vehicle doesn't roll back
    st.hold = want < 0.05 && ctl.brake < 0.05 && Math.abs(fwd) < 0.6 && !v.winched;
    const brake = Math.max(st.brake, st.hold ? 0.7 : 0);

    const { ratio, dir, omAvg, govOmega, driveOmega, driven, caps } = v.drivetrain.update({ ctl, st, wheels, joints, dt, gripOf: i => gripOf(v, i) });

    let mud = 0, slip = 0, surf = null;
    for (let i = 0; i < wheels.length; i++) {
      const w = wheels[i], j = joints[i], R = wheelRadius(car.rig, i);
      const s = wheelSurf(w); if (s) surf = s; if (s === 'mud') mud++;
      if (brake > 0.01 && st.throttle < 0.05) {
        j.setMotorSpeed(0); j.setMaxMotorTorque(dc.brakeTorque * brake);
      } else if (Math.abs(omAvg) > govOmega * 1.03 && Math.sign(omAvg) === dir) {
        // over the governor (rolling downhill): the engine and exhaust brake hold the gear's speed
        j.setMotorSpeed(dir * govOmega); j.setMaxMotorTorque((dc.engineBrake + dc.exhaustBrake) * ratio / wheels.length);
      } else if (st.throttle > 0.01 && driven.includes(i)) {
        j.setMotorSpeed(dir * driveOmega); j.setMaxMotorTorque(caps[i]);
      } else if (st.throttle > 0.01) {
        j.setMotorSpeed(0); j.setMaxMotorTorque(40);          // front axle free-wheeling with 4x4 off
      } else if (v.winched) {
        j.setMotorSpeed(0); j.setMaxMotorTorque(40);          // towed on the cable: rolls freely
      } else {
        // engine braking through the gearbox
        j.setMotorSpeed(0); j.setMaxMotorTorque(dc.engineBrake * ratio / wheels.length);
      }
      rollingResistance(w, R, dt);
      slip = Math.max(slip, Math.abs(Math.abs(w.getAngularVelocity() * R) - Math.abs(fwd)));
      if (s === 'mud') mudDrag(w);
    }
    let water = 0;
    for (const b of [truck, ...wheels]) {
      const p = b.getPosition();
      for (const wb of waters) {
        if (p.x > wb.x0 && p.x < wb.x1 && p.y < wb.level) {
          const d = Math.min(1.5, wb.level - p.y);
          const m = b.getMass(), bv = b.getLinearVelocity();
          b.applyForceToCenter(V(-bv.x * m * wb.drag * d, m * 1.6 * d - bv.y * m * 0.4), true);
          water = Math.max(water, d);
        }
      }
    }
    // fuel: litres from engine power, more with 4x4, more again climbing with a heavy load, less
    // for an efficient engine; the tank's size turns litres into the % the HUD shows
    const climb = 1 + 3 * Math.max(0, Math.sin(ang) * Math.sign(fwd || 1)), haul = 1 + 1.5 * loadMass(v) / vehicleMass(v);
    const litres = dt * (0.01 + st.power / 300 * 0.11 * (ctl.awd ? 1.08 : 1) * climb * haul) * (v.role === 'service' ? 0.2 : 1) * (dc.fuelBurn ?? 1) * efficiencyBurn(car);
    if (st.engine === 'on') st.fuel = Math.max(0, st.fuel - litres / (dc.fuelLitres ?? 100) * 100);   // % of the tank
    st.inMud = mud; st.inWater = water; st.slip = slip; st.surf = surf || st.surf;
    v.parts.bumpStops(dt);
  }

  function step(dt) {
    stepDt = dt;
    for (const v of vehicles) v.winched = false;
    // cables first, so a towed vehicle's parking hold lets go this step
    for (const v of vehicles) pullCable(v);
    for (const v of vehicles) stepVehicle(v, dt);
    load.clear();
    world.step(dt, 10, 6);
    bridgeSystem.afterStep(dt);
    if (crushQueue.length) crushRocks();
  }

  const sim = {
    V, season, terrain, surfaces, trail, events,
    surfAt: terrain.surfAt, visH, colH,
    get world() { return world; },
    get vehicles() { return vehicles; }, get active() { return active; }, get main() { return main; },
    get car() { return active.car; }, get ctl() { return active.ctl; }, get st() { return active.st; },
    get truck() { return active.parts.truck; }, get wheels() { return active.parts.wheels; }, get joints() { return active.parts.joints; },
    get wheelRadius() { return active.car.rig.radius; },
    get rocks() { return obstacles.rocks; }, get logs() { return obstacles.logs; },
    get bridges() { return bridgeSystem.bridges; },
    // winch for the active vehicle: what it could hook, hook / unhook, and its cable
    nearestHook: (v = active) => nearestHook(v),
    toggleWinch: (v = active) => toggleWinch(v),
    cable: (v = active) => v.cable,
    distance: (v, o) => towPoints(v, o).d,
    winchReach: WINCH_REACH,
    // start a run: a fresh world with the chosen car
    init(x = trail.start, setup = sim.setup) {
      sim.setup = setup;
      buildWorld(); events.length = 0;
      main = makeVehicle(setup.car, 'main', x, { ctl: mainCtl, st: mainSt });
      vehicles = [main]; active = main;
      mainSt.fuel = 100; mainSt.throttle = 0; mainSt.brake = 0; mainSt.engine = 'on'; mainSt.crankT = 0;
    },
    // put a vehicle (default: the main one) back on the trail at x, upright
    respawn(x, v = main) { removeParts(v); spawnParts(v, x); for (const o of vehicles) if (o === v || o.cable?.target === v) o.cable = null; },
    spawnService(car, x = sim.serviceSpot(car)) { const v = makeVehicle(car, 'service', x); vehicles.push(v); return v; },
    // where a called service truck parks: ahead of the main truck, on firm ground if any lies
    // close by (a truck stuck in mud is towed out by one standing past the mud)
    serviceSpot(car) {
      const nose = main.parts.truck.getWorldPoint(V(main.car.rig.nose, 0)).x, rear = -(car.rig.towRear ?? -car.rig.nose);
      const len = car.rig.nose + rear, firm = x => { for (let t = x - rear; t <= x + car.rig.nose; t += 1) if (terrain.surfAt(t) === 'mud') return false; return true; };
      for (let gap = 6; gap <= SPAWN_REACH; gap += 1) if (firm(nose + gap + rear)) return Math.min(X1 - len, nose + gap + rear);
      return Math.min(X1 - len, nose + 8 + rear);
    },
    setActive(v) { active = v; },
    // engine switch: starting cranks for the car's crank time (car.json audio.crankS) first
    startEngine(v = active) { if (v.st.engine === 'off' && v.st.fuel > 0) { v.st.engine = 'cranking'; v.st.crankT = v.car.audio?.crankS ?? 1.2; } return v.st.engine; },
    stopEngine(v = active) { v.st.engine = 'off'; v.st.crankT = 0; return v.st.engine; },
    vehicleMass, loadMass,
    step,
  };
  return sim;
}
