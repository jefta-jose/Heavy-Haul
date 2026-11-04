// One run of a trail: checkpoints, hints, rollover, empty tank, delivery pay (the trail
// bonus plus the value of the load the truck carries) and the coin wallet kept in localStorage.
// Rules watch the main vehicle even while the player drives a summoned service truck.
import { CRASH_SECONDS, COINS_PER_METRE, COINS_PER_BOG } from '../game-config.js';
import { wallet } from './wallet.js';

const angleOf = body => Math.abs(((body.getAngle() + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI);

export function createSession({ sim, hud, season, onRestart, onGarage }) {
  const trail = season.trail;

  const fresh = () => ({ time: 0, checkpoint: trail.start, winchSecs: 0, recoveries: 0, fuelUsed: 0, odometer: 0, announced: null, farthest: null, earned: 0, bogsDone: 0, saveT: 0, lastX: null, stuckT: 0, rollT: 0, emptyT: 0 });
  const run = fresh();
  const api = { state: 'garage', run, get coins() { return wallet.coins; } };

  api.reset = () => Object.assign(run, fresh());
  // coins add themselves: for new ground, for clearing a bog and for what gets crushed
  api.earn = (n, bonus = false) => { wallet.add(n, bonus); run.earned += n; if (bonus) hud.coinBonus(n); };
  const restartButton = (label = 'Restart') => [label, () => { hud.hideMessage(); api.state = 'play'; onRestart(); }];
  const garageButton = ['Back to garage', () => { hud.hideMessage(); onGarage(); }];

  // extra: { spec: [[label, value]...], buttons: [[label, fn]...] } from main.js (the truck's details
  // and the controls the phone HUD leaves out)
  api.pause = (openSound, extra = {}) => {
    api.state = 'pause';
    hud.showMessage('Paused', 'Expedition on hold', `${trail.name}. Your vehicle will wait right where you left it.`, extra.spec ?? [], [
      ['Resume', () => api.resume(), true], restartButton('Restart run'), garageButton, ['Sound', openSound], ...(extra.buttons ?? []),
    ]);
  };
  api.resume = () => { hud.hideMessage(); api.state = 'play'; api.onResume?.(); };

  function fail(kind) {
    api.state = 'fail';
    wallet.save();
    const coins = ['Coins this run', Math.floor(run.earned).toLocaleString('en-US')];
    // a crash or a wreck ends the run: back to the very start of the trail
    if (kind === 'roll') {
      hud.showMessage('Crashed', 'The truck went over', 'Start the run again from the beginning of the trail.', [coins], [[...restartButton('Start again'), true], garageButton], 'wreck');
    } else if (kind === 'wreck') {
      hud.showMessage('Wrecked', 'The engine has died', 'Too much damage. Start the run again from the beginning of the trail.', [coins], [[...restartButton('Start again'), true], garageButton], 'wreck');
    } else if (kind === 'fuel') {
      const can = api.canCall?.('breakdown');
      hud.showMessage('Out of fuel', 'The tank is dry', can ? 'Call your breakdown truck and tow your truck to the nearest station.' : 'Start the run again from the beginning of the trail.', [coins], [
        ...(can ? [['Call the breakdown truck', () => { hud.hideMessage(); api.state = 'play'; run.emptyT = -30; api.onCall?.('breakdown'); }, true]] : []), restartButton('Start again'), garageButton,
      ]);
    }
  }
  function deliver() {
    api.state = 'done';
    const load = sim.main.car.load, loadPay = load ? Math.round(300 + load.massT * 160) : 0, pay = trail.finishBonus + loadPay;
    wallet.add(pay); wallet.save();
    const m = Math.floor(run.time / 60), s = Math.floor(run.time % 60);
    hud.showMessage(load ? 'Delivered' : 'Trail complete', load ? `${load.name} delivered` : `${trail.name} crossed`, `Your ${sim.main.car.name} made it through ${season.name}.`, [
      ['Time', `${m}:${String(s).padStart(2, '0')}`], ['Distance driven', `${(run.odometer / 1000).toFixed(2)} km`],
      ['Winch time', `${Math.round(run.winchSecs)} s`],
      ['Coins on the road', Math.floor(run.earned).toLocaleString('en-US')],
      ...(load ? [['Load pay', `${loadPay.toLocaleString('en-US')} coins`]] : []), ['Trail pay', `${trail.finishBonus.toLocaleString('en-US')} coins`],
    ], [['Drive again', () => { hud.hideMessage(); api.state = 'play'; onRestart(); }, true], garageButton], 'win');
  }

  // per-frame rules while playing
  api.update = dt => {
    const main = sim.main, mainTruck = main.parts.truck, p = mainTruck.getPosition(), st = sim.st, ctl = sim.ctl, driving = sim.active.parts.truck.getPosition();
    run.time += dt;
    // odometer: every metre the main truck rolls, forwards or back (a recovery teleport is not driving)
    if (run.lastX != null && Math.abs(p.x - run.lastX) < 5) run.odometer += Math.abs(p.x - run.lastX);
    run.lastX = p.x;
    // new ground pays, whoever drives it, except being towed over it
    if (run.farthest == null) run.farthest = p.x;
    if (p.x > run.farthest) { if (!main.winched) api.earn((p.x - run.farthest) * COINS_PER_METRE); run.farthest = p.x; }
    const bogs = trail.heavyMud ?? [];
    while (run.bogsDone < bogs.length && p.x > bogs[run.bogsDone] + 12) { if (!main.winched) api.earn(COINS_PER_BOG, true); run.bogsDone++; }
    if ((run.saveT += dt) > 2) { run.saveT = 0; wallet.save(); }
    if (run.time > 6) hud.setCardVisible(false);
    if (sim.vehicles.some(v => v.cable?.taut)) run.winchSecs += dt;
    for (const c of trail.checkpoints) if (p.x > c + 8 && c > run.checkpoint) run.checkpoint = c;
    // stuck hints, most useful first
    if (ctl.gas > 0.5 && Math.abs(st.speed) < 0.6) run.stuckT += dt; else run.stuckT = Math.max(0, run.stuckT - dt);
    if (run.stuckT > 3.5 && !hud.toastActive) hud.toast(sim.active !== main ? `Get within ${sim.winchReach} m, tap WINCH, then drive away to tow your truck free` : !ctl.diff && st.diffLimited ? 'A wheel is spinning: lock the DIFF' : !ctl.awd ? 'Engage 4×4 for front-axle drive' : 'Stuck? Call the breakdown truck to tow you', 3);
    const ahead = sim.surfAt(driving.x + 10);
    if (!hud.toastActive && ahead === 'mud' && sim.surfAt(driving.x) !== 'mud' && !(ctl.awd && ctl.diff)) hud.toast('Deep mud ahead: engage 4×4 and DIFF', 2.8);
    hud.nudge('awd', !ctl.awd && (run.stuckT > 2 || ahead === 'mud'));
    hud.nudge('diff', !ctl.diff && (st.diffLimited || run.stuckT > 2));
    // the main vehicle: rollover, empty tank, delivery
    if (angleOf(mainTruck) > 1.45) run.rollT += dt; else run.rollT = Math.min(0, run.rollT + dt);   // a called truck gets 30 s grace
    if (run.rollT > CRASH_SECONDS && sim.active === main) fail('roll');
    if (main.st.damage >= 100) { fail('wreck'); return; }
    if (main.st.fuel <= 0 && Math.abs(main.st.speed) < 0.4 && sim.active === main) run.emptyT += dt; else run.emptyT = Math.min(0, run.emptyT + dt);
    if (run.emptyT > 2.5) fail('fuel');
    if (p.x > trail.depot + 2) deliver();
    // a refuelled truck starts up by itself, and stations are worth a mention when you need one
    if (main.st.filling && main.st.engine === 'off' && main.st.fuel > 5) sim.startEngine(main);
    const near = (trail.stations ?? []).find(s => s.x > p.x && s.x - p.x < 45);
    if (near && near !== run.announced && (main.st.fuel < 70 || main.st.damage > 10) && !hud.toastActive) { run.announced = near; hud.toast('Fuel station ahead: stop in the bay to refuel and repair', 3.5); }
  };
  return api;
}
