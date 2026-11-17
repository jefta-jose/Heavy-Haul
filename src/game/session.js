import { formatCoins } from './format.js';
// One run of a trail: checkpoints, hints, rollover, empty tank, delivery pay (the trail
// bonus plus the value of the load the truck carries) and the coin wallet kept in localStorage.
// Rewards watch the main vehicle; overturned service trucks also end the run.
import { CRASH_SECONDS, STUCK_GLOW_S, COINS_PER_METRE, COINS_PER_BOG, XP_PER_METRE, XP_PER_BOG, XP_PER_DELIVERY } from '../game-config.js';
import { classXp } from './progress.js';
import { wallet } from './wallet.js';

const angleOf = body => Math.abs(((body.getAngle() + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI);

export function createSession({ sim, hud, season, progress, missions, onRestart, onGarage, onRankUp, onSuccess, onFailure }) {
  const trail = season.trail;
  const serviceRolls = new Map();

  const fresh = () => ({ time: 0, checkpoint: trail.start, winchSecs: 0, recoveries: 0, fuelUsed: 0, odometer: 0, announced: null, farthest: null, earned: 0, xp: 0, bogsDone: 0, bogsClean: 0, crushes: 0, helped: false, maxDamage: 0, helpGlow: false, cameraKmh: 0, cameras: [], camerasSeen: 0, refuelled: false, powered: false, stuckNow: 0, stuckMax: 0, missionDone: null, missionFailed: false, saveT: 0, lastX: null, stuckT: 0, rollT: 0, emptyT: 0 });
  const run = fresh();
  const api = { state: 'garage', run, get coins() { return wallet.coins; } };

  // Rescue driving and attached tow cables never count as earning or mission progress.
  const canProgress = () => sim.active === sim.main && !sim.main.winched && !sim.vehicles.some(v => v.cable?.target === sim.main);

  api.reset = () => { serviceRolls.clear(); Object.assign(run, fresh()); };
  // coins add themselves: for new ground, for clearing a bog and for what gets crushed
  api.earn = (n, bonus = false) => { if (!canProgress()) return; wallet.add(n, bonus); run.earned += n; if (bonus) hud.coinBonus(n); };
  // XP, scaled by the main truck's class; a new rank is announced at once
  const addXp = (x, now) => {
    if (!progress || !canProgress()) return; run.xp += x;
    const ups = progress.addXp(x, now);
    if (ups.length) { const top = ups.at(-1); hud.toast(`Rank ${top.rank}! New trucks to buy in the garage`, 4); onRankUp?.(ups); }
  };
  const gainXp = (n, now = false) => addXp(classXp(n, sim.main.car.class), now);
  // the run as missions see it
  const missionRun = (delivered = false) => ({ cls: sim.main.car.class, car: sim.main.car.id, time: run.time, x: run.farthest ?? trail.start, helped: run.helped, maxDamage: run.maxDamage, cameras: run.cameras, camerasSeen: run.camerasSeen, crushes: run.crushes, bogs: run.bogsClean, bogsMissed: run.bogsDone - run.bogsClean, refuelled: run.refuelled, powered: run.powered, stuckMax: run.stuckMax, delivered });
  function missionDone(done) {
    run.missionDone = done; addXp(done.xp, true);
    hud.toast(`Mission complete: ${done.mission.title}  ·  +${done.xp.toLocaleString('en-US')} XP`, 4);
    hud.showMission(null);
    onSuccess?.();
  }
  // what main.js reports: things crushed, help called, a speed camera passed
  api.crushed = () => { if (canProgress()) run.crushes++; };
  api.helpCalled = () => { run.helped = true; };
  api.cameraSpeed = kmh => { run.camerasSeen++; if (canProgress()) { run.cameraKmh = Math.max(run.cameraKmh, kmh); run.cameras.push(kmh); } };
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
    onFailure?.();
    missions?.endRun?.();
    wallet.save(); progress?.save();
    const coins = ['Coins this run', formatCoins(run.earned)];
    // a crash or a wreck ends the run: back to the very start of the trail
    if (kind === 'roll') {
      hud.showMessage('Crashed', 'The truck went over', 'Start the run again from the beginning of the trail.', [coins], [[...restartButton('Start again'), true], garageButton], 'wreck');
    } else if (kind === 'wreck') {
      hud.showMessage('Wrecked', 'The engine has died', 'Too much damage. Start the run again from the beginning of the trail.', [coins], [[...restartButton('Start again'), true], garageButton], 'wreck');
    } else if (kind === 'fuel') {
      const can = api.canCall?.('breakdown');
      hud.showMessage('Out of fuel', 'The tank is dry', can ? 'Call your breakdown truck and tow your truck to the nearest station.' : 'Start the run again from the beginning of the trail.', [coins], [
        ...(can ? [['Call the breakdown truck', () => { hud.hideMessage(); api.state = 'play'; run.emptyT = -30; /* 30 s fuel grace for the called truck */ api.onCall?.('breakdown'); }, true]] : []), restartButton('Start again'), garageButton,
      ]);
    }
  }
  function deliver() {
    if (!canProgress()) return;
    api.state = 'done';
    const load = sim.main.car.load, loadPay = load ? Math.round(300 + load.massT * 160) : 0, pay = trail.finishBonus + loadPay;
    wallet.add(pay); wallet.save();
    gainXp(XP_PER_DELIVERY, true);
    const done = missions?.deliver(missionRun(true)); if (done) missionDone(done);
    if (!done) onSuccess?.();
    const rank = progress?.progress;
    const m = Math.floor(run.time / 60), s = Math.floor(run.time % 60);
    hud.showMessage(load ? 'Delivered' : 'Trail complete', load ? `${load.name} delivered` : `${trail.name} crossed`, `Your ${sim.main.car.name} made it through ${season.name}.`, [
      ['Time', `${m}:${String(s).padStart(2, '0')}`], ['Distance driven', `${(run.odometer / 1000).toFixed(2)} km`],
      ['Winch time', `${Math.round(run.winchSecs)} s`],
      ['Coins on the road', formatCoins(run.earned)],
      ...(run.missionDone ? [['Mission', `${run.missionDone.mission.title} done: +${run.missionDone.xp.toLocaleString('en-US')} XP`]] : []),
      ...(rank ? [['XP this run', `${Math.round(run.xp).toLocaleString('en-US')}`], ['Rank', rank.rank >= 20 ? 'Rank 20 (top)' : `Rank ${rank.rank} · ${rank.xp.toLocaleString('en-US')} / ${rank.to.toLocaleString('en-US')} XP`]] : []),
      ...(load ? [['Load pay', `${formatCoins(loadPay)} coins`]] : []), ['Trail pay', `${formatCoins(trail.finishBonus)} coins`],
    ], [['Drive again', () => { hud.hideMessage(); api.state = 'play'; onRestart(); }, true], garageButton], 'win');
  }

  // per-frame rules while playing
  api.update = dt => {
    if (api.state !== 'play') return;
    const main = sim.main, mainTruck = main.parts.truck, p = mainTruck.getPosition(), st = sim.st, ctl = sim.ctl, driving = sim.active.parts.truck.getPosition();
    run.time += dt;
    // Check crashes before rewards and delivery so reaching the depot cannot
    // overwrite a rollover failure. Each service truck has its own timer,
    // including when parked or after switching back to the main truck.
    if (angleOf(mainTruck) > 1.45) run.rollT += dt; else run.rollT = Math.min(0, run.rollT + dt);
    if (run.rollT > CRASH_SECONDS && sim.active === main) { fail('roll'); return; }
    for (const vehicle of sim.vehicles) {
      if (vehicle === main) continue;
      const rolling = angleOf(vehicle.parts.truck) > 1.45 ? (serviceRolls.get(vehicle) ?? 0) + dt : 0;
      serviceRolls.set(vehicle, rolling);
      if (rolling > CRASH_SECONDS) { fail('roll'); return; }
    }
    if (main.st.damage >= 100) { fail('wreck'); return; }
    // odometer: every metre the main truck rolls, forwards or back (a recovery teleport is not driving)
    if (run.lastX != null && Math.abs(p.x - run.lastX) < 5) run.odometer += Math.abs(p.x - run.lastX);
    run.lastX = p.x;
    // Consume rescue distance and bog crossings without banking rewards for switching back.
    if (run.farthest == null) run.farthest = p.x;
    if (p.x > run.farthest) { if (canProgress()) { api.earn((p.x - run.farthest) * COINS_PER_METRE); gainXp((p.x - run.farthest) * XP_PER_METRE); } run.farthest = p.x; }
    const bogs = trail.heavyMud ?? [];
    while (run.bogsDone < bogs.length && p.x > bogs[run.bogsDone] + 12) { if (canProgress()) { api.earn(COINS_PER_BOG, true); gainXp(XP_PER_BOG, true); run.bogsClean++; } run.bogsDone++; }
    if ((run.saveT += dt) > 2) { run.saveT = 0; wallet.save(); progress?.save(); }
    if (run.time > 6) hud.setCardVisible(false);
    run.maxDamage = Math.max(run.maxDamage, main.st.damage);
    // what contracts' twists watch: a station fill, a power used, the longest time sat stuck in the main truck
    if (main.st.filling) run.refuelled = true;
    if (main.st.powerT > 0) run.powered = true;
    run.stuckNow = sim.active === main && ctl.gas > 0.5 && Math.abs(main.st.speed) < 0.6 ? run.stuckNow + dt : 0;
    run.stuckMax = Math.max(run.stuckMax, run.stuckNow);
    // a mission this run has broken glows red and slides away; it stays chosen for the next run
    if (missions && !run.missionDone && !run.missionFailed) {
      if (missions.failed?.(missionRun())) { run.missionFailed = true; hud.failMission({ mission: missions.active }); onFailure?.(); }
      else if (canProgress()) { const t = missions.track(missionRun()); if (t?.done) missionDone(t.done); else hud.showMission(t); }
    }
    if (sim.vehicles.some(v => v.cable?.taut)) run.winchSecs += dt;
    for (const c of trail.checkpoints) if (p.x > c + 8 && c > run.checkpoint) run.checkpoint = c;
    // stuck hints, most useful first
    if (ctl.gas > 0.5 && Math.abs(st.speed) < 0.6) run.stuckT += dt; else run.stuckT = Math.max(0, run.stuckT - dt);
    if (run.stuckT > 3.5 && !hud.toastActive) hud.toast(sim.active !== main ? `Park fully in the purple ${sim.winchReach} m section ahead of your truck, tap WINCH, then drive forward` : !ctl.diff && st.diffLimited ? 'A wheel is spinning: lock the DIFF' : !ctl.awd ? 'Engage AWD to drive every axle' : 'Stuck? Call the breakdown truck to tow you', 3);
    const ahead = sim.surfAt(driving.x + 10);
    if (!hud.toastActive && ahead === 'mud' && sim.surfAt(driving.x) !== 'mud' && !(ctl.awd && ctl.diff)) hud.toast('Deep mud ahead: engage AWD and DIFF', 2.8);
    hud.nudge('awd', !ctl.awd && (run.stuckT > 2 || ahead === 'mud'));
    hud.nudge('diff', !ctl.diff && (st.diffLimited || run.stuckT > 2));
    // stuck in the main truck (or out of fuel), the breakdown button glows until it is moving again
    if (sim.active === main && (run.stuckT > STUCK_GLOW_S || main.st.fuel <= 0)) run.helpGlow = true;
    else if (sim.active !== main || run.stuckT < 0.5) run.helpGlow = false;
    hud.glowHelp?.(run.helpGlow);
    // The main vehicle: empty tank and delivery. Service trucks have unlimited fuel.
    if (main.st.fuel <= 0 && Math.abs(main.st.speed) < 0.4 && sim.active === main) run.emptyT += dt; else run.emptyT = Math.min(0, run.emptyT + dt);
    if (run.emptyT > 2.5) { fail('fuel'); return; }
    if (p.x > trail.depot + 2) deliver();
    // a refuelled truck starts up by itself, and stations are worth a mention when you need one
    if (main.st.filling && main.st.engine === 'off' && main.st.fuel > 5) sim.startEngine(main);
    const near = (trail.stations ?? []).find(s => s.x > p.x && s.x - p.x < 45);
    if (near && near !== run.announced && (main.st.fuel < 70 || main.st.damage > 10) && !hud.toastActive) { run.announced = near; hud.toast('Fuel station ahead: stop in the bay to refuel and repair', 3.5); }
  };
  return api;
}
