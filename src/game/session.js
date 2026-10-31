// One run of a trail: checkpoints, hints, rollover, empty tank, delivery pay (the trail
// bonus plus the value of the load the truck carries) and the coin wallet kept in localStorage.
// Rules watch the main vehicle even while the player drives a summoned service truck.

const WALLET_KEY = 'hh_wallet';
const angleOf = body => Math.abs(((body.getAngle() + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI);

export function createSession({ sim, hud, season, onRestart, onGarage }) {
  const trail = season.trail;
  let wallet = 2000;
  try { const w = +localStorage.getItem(WALLET_KEY); if (w > 0) wallet = w; } catch (e) {}
  const saveWallet = () => { try { localStorage.setItem(WALLET_KEY, String(wallet)); } catch (e) {} };

  const fresh = () => ({ time: 0, checkpoint: trail.start, winchSecs: 0, recoveries: 0, fuelUsed: 0, odometer: 0, lastX: null, stuckT: 0, rollT: 0, emptyT: 0 });
  const run = fresh();
  const api = { state: 'garage', run, get coins() { return wallet; } };

  api.reset = () => Object.assign(run, fresh());
  api.spend = cost => { if (wallet < cost) return false; wallet -= cost; saveWallet(); return true; };
  const restartButton = (label = 'Restart') => [label, () => { hud.hideMessage(); api.state = 'play'; onRestart(); }];
  const garageButton = ['Back to garage', () => { hud.hideMessage(); onGarage(); }];

  // extra: { spec: [[label, value]...], buttons: [[label, fn]...] } from main.js (the truck's
  // details and the controls the phone HUD leaves out)
  api.pause = (openSound, extra = {}) => {
    api.state = 'pause';
    hud.showMessage('Paused', 'Expedition on hold', `${trail.name}. Your vehicle will wait right where you left it.`, extra.spec ?? [], [
      ['Resume', () => api.resume(), true], restartButton('Restart run'), garageButton, ['Sound', openSound], ...(extra.buttons ?? []),
    ]);
  };
  api.resume = () => { hud.hideMessage(); api.state = 'play'; api.onResume?.(); };

  function recover(cost) {
    if (!api.spend(cost)) return;
    run.recoveries++;
    api.onRecover(run.checkpoint); sim.main.st.fuel = Math.max(sim.main.st.fuel, 25); run.rollT = run.stuckT = run.emptyT = 0;
    hud.hideMessage(); api.state = 'play'; hud.toast(`Recovery truck set you back on the road at ${Math.round(run.checkpoint)} m`, 3);
  }
  function deliverFuel(cost) {
    if (!api.spend(cost)) return;
    sim.main.st.fuel = 40; run.emptyT = 0; hud.hideMessage(); api.state = 'play'; hud.toast('Support truck delivered 40% of a tank', 3);
  }
  function fail(kind) {
    api.state = 'fail';
    const coins = ['Your coins', wallet.toLocaleString('en-US')];
    if (kind === 'roll') {
      const cost = 600;
      hud.showMessage('Rolled over', 'The vehicle is on its side', 'Pay to be towed back to the last checkpoint, or start the run again.', [['Recovery fee', `${cost} coins`], coins], [
        ['Tow me back', () => recover(cost), true, wallet < cost], restartButton(), garageButton,
      ]);
    } else if (kind === 'fuel') {
      const cost = 400;
      hud.showMessage('Out of fuel', 'The tank is dry', 'Call your fuel truck and drive it over from the start of the trail, or have support drop off fuel.', [['Delivery fee', `${cost} coins`], coins], [
        ['Call the fuel truck', () => { hud.hideMessage(); api.state = 'play'; run.emptyT = -30; api.onCall?.('fuel'); }, true, !api.canCall?.('fuel')], ['Drop off fuel', () => deliverFuel(cost), false, wallet < cost], restartButton(), garageButton,
      ]);
    }
  }
  function deliver() {
    api.state = 'done';
    const load = sim.main.car.load, loadPay = load ? Math.round(300 + load.massT * 160) : 0, pay = trail.finishBonus + loadPay;
    wallet += pay; saveWallet();
    const m = Math.floor(run.time / 60), s = Math.floor(run.time % 60);
    hud.showMessage(load ? 'Delivered' : 'Trail complete', load ? `${load.name} delivered` : `${trail.name} crossed`, `Your ${sim.main.car.name} made it through ${season.name}.`, [
      ['Time', `${m}:${String(s).padStart(2, '0')}`], ['Distance driven', `${(run.odometer / 1000).toFixed(2)} km`],
      ['Fuel burned', `${Math.round(run.fuelUsed * (sim.main.car.drivetrain.fuelLitres ?? 100) / 100)} L (${(run.fuelUsed * (sim.main.car.drivetrain.fuelLitres ?? 100) / 100 / Math.max(0.01, run.odometer / 1000)).toFixed(1)} L/km)`], ['Winch time', `${Math.round(run.winchSecs)} s`], ['Recoveries', String(run.recoveries)],
      ...(load ? [['Load pay', `${loadPay.toLocaleString('en-US')} coins`]] : []), ['Trail pay', `${trail.finishBonus.toLocaleString('en-US')} coins`],
    ], [['Drive again', () => { hud.hideMessage(); api.state = 'play'; onRestart(); }, true], garageButton]);
  }

  // per-frame rules while playing
  api.update = dt => {
    const main = sim.main, mainTruck = main.parts.truck, p = mainTruck.getPosition(), st = sim.st, ctl = sim.ctl, driving = sim.active.parts.truck.getPosition();
    run.time += dt;
    // odometer: every metre the main truck rolls, forwards or back (a recovery teleport is not driving)
    if (run.lastX != null && Math.abs(p.x - run.lastX) < 5) run.odometer += Math.abs(p.x - run.lastX);
    run.lastX = p.x;
    if (run.time > 6) hud.setCardVisible(false);
    if (sim.vehicles.some(v => v.cable?.taut)) run.winchSecs += dt;
    for (const c of trail.checkpoints) if (p.x > c + 8 && c > run.checkpoint) { run.checkpoint = c; hud.toast(`Checkpoint · ${Math.round(c)} m`); }
    // stuck hints, most useful first
    if (ctl.gas > 0.5 && Math.abs(st.speed) < 0.6) run.stuckT += dt; else run.stuckT = Math.max(0, run.stuckT - dt);
    if (run.stuckT > 3.5 && !hud.toastActive) hud.toast(sim.active !== main ? `Get within ${sim.winchReach} m, tap WINCH, then drive away to tow your truck free` : ctl.gear === 'H' ? 'Not enough pull. Shift to L (low range)' : !ctl.diff && st.diffLimited ? 'A wheel is spinning: lock the DIFF' : !ctl.awd ? 'Engage 4×4 for front-axle drive' : 'Stuck? Call the breakdown truck to winch you out', 3);
    const ahead = sim.surfAt(driving.x + 10);
    if (!hud.toastActive && ahead === 'mud' && sim.surfAt(driving.x) !== 'mud' && !(ctl.awd && ctl.diff)) hud.toast('Deep mud ahead: engage 4×4 and DIFF, shift to L', 2.8);
    hud.nudge('awd', !ctl.awd && (run.stuckT > 2 || ahead === 'mud'));
    hud.nudge('diff', !ctl.diff && (st.diffLimited || run.stuckT > 2));
    // the main vehicle: rollover, empty tank, delivery
    if (angleOf(mainTruck) > 1.45) run.rollT += dt; else run.rollT = Math.min(0, run.rollT + dt);   // a called truck gets 30 s grace
    if (run.rollT > 2.2 && sim.active === main) fail('roll');
    if (main.st.fuel <= 0 && Math.abs(main.st.speed) < 0.4 && sim.active === main) run.emptyT += dt; else run.emptyT = Math.min(0, run.emptyT + dt);
    if (run.emptyT > 2.5) fail('fuel');
    if (p.x > trail.depot + 2) deliver();
  };
  return api;
}
