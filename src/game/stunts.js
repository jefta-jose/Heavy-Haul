import { wheelRadius } from '../physics/vehicle.js';
import {
  STUNT_AIR_S, STUNT_CLIMB_DEG, STUNT_CLIMB_S, STUNT_COMBO_S, RUN_INTRO_S,
} from '../game-config.js';

// Forza-style moments, for show only (no coins or XP: the economy stays in session.js):
//   BIG AIR        every tyre off the ground for STUNT_AIR_S, called on landing
//   ROCK CRUSHER   two or more rocks broken within STUNT_COMBO_S of each other
//   MUD BOGGER     through a heavy-mud pit on your own, with no service truck
//   HILL CLIMBER   nose up past STUNT_CLIMB_DEG for STUNT_CLIMB_S
//   SPLASH DOWN    a big splash into water
// and the map's title banner at the start of a run.

export function createStunts({ sim, box, banner }) {
  let air = 0, climbT = 0, climbCool = 0, crushN = 0, crushT = 0, pit = null, helped = false, splashCool = 0, vehicle = null, lastX = null, settle = 1;

  function call(title, sub = '') {
    while (box.children.length >= 3) box.firstChild.remove();
    const el = document.createElement('div'), b = document.createElement('b'), s = document.createElement('span');
    el.className = 'stunt'; b.textContent = title; s.textContent = sub; el.append(b); if (sub) el.append(s);
    box.append(el);
    const gone = () => el.remove();
    el.addEventListener('animationend', gone); setTimeout(gone, 2600);
  }
  const touching = v => v.parts.wheels.some((w, i) => { const p = w.getPosition(); return p.y - wheelRadius(v.car.rig, i) - sim.colH(p.x) < 0.15; });

  function update(dt) {
    const v = sim.active;
    const truck = v.parts.truck, vel = truck.getLinearVelocity(), px = truck.getPosition().x;
    // a new vehicle, a respawn or a tow teleport drops the truck onto the trail: let it settle before counting air
    if (v !== vehicle || lastX == null || Math.abs(px - lastX) > 2) { vehicle = v; air = 0; climbT = 0; settle = 1; }
    lastX = px;
    if (settle > 0) { settle -= dt; return; }
    // air time
    if (!touching(v)) air += dt;
    else { if (air >= STUNT_AIR_S) call('Big air', `${air.toFixed(1)} s`); air = 0; }
    // a steep climb, held
    const deg = truck.getAngle() * 180 / Math.PI;
    climbCool = Math.max(0, climbCool - dt); splashCool = Math.max(0, splashCool - dt);
    climbT = deg > STUNT_CLIMB_DEG && vel.x > 0.3 ? climbT + dt : 0;
    if (climbT > STUNT_CLIMB_S && !climbCool) { call('Hill climber', `${Math.round(deg)}°`); climbCool = 12; }
    // rock crusher combos close once the rocks stop breaking
    if (crushN && (crushT -= dt) <= 0) { if (crushN >= 2) call('Rock crusher', `×${crushN}`); crushN = 0; }
    // through a heavy-mud pit without help
    const main = sim.main, x = main.parts.truck.getPosition().x, pits = sim.trail.heavyMud ?? [];
    if (sim.active !== main || sim.vehicles.some(o => o.cable)) helped = true;
    const inside = pits.find(c => x > c - 10 && x < c + 10);
    if (inside != null && pit == null) { pit = inside; helped = sim.active !== main; }
    else if (pit != null && inside == null) { if (x > pit + 10 && !helped) call('Mud bogger', 'no help'); pit = null; }
  }

  return {
    update(dt, playing) { if (playing && dt > 0) update(dt); },
    crushed() { crushN++; crushT = STUNT_COMBO_S; },
    splash(power) { if (power > 0.9 && !splashCool) { call('Splash down'); splashCool = 6; } },
    reset() { air = climbT = crushN = 0; pit = null; helped = false; lastX = null; settle = 1; box.replaceChildren(); },
    // the map's name swept across the screen as the run begins
    intro({ eyebrow, title, line }) {
      const [e, t, l] = ['.ri-eyebrow', '.ri-title', '.ri-line'].map(q => banner.querySelector(q));
      e.textContent = eyebrow; t.textContent = title; l.textContent = line;
      banner.style.setProperty('--ri', `${RUN_INTRO_S}s`);
      banner.classList.remove('on'); void banner.offsetWidth; banner.classList.add('on');
    },
  };
}
