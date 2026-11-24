import { formatCoins } from './format.js';
// One run of a trail: checkpoints, hints, rollover, empty tank, delivery pay (the trail
// bonus plus the value of the load the truck carries) and the coin wallet kept in localStorage.
import { CRASH_SECONDS, COINS_PER_METRE, COINS_PER_BOG, XP_PER_METRE, XP_PER_BOG, XP_PER_DELIVERY, AIR_MIN_S, AIR_MIN_KMH, AIR_MIN_HEIGHT_M, COINS_PER_AIR_S, CRUSH_STREAK_S } from '../game-config.js';
import { wheelRadius } from '../physics/vehicle.js';
import { classXp } from './progress.js';
import { wallet } from './wallet.js';

const angleOf = body => Math.abs(((body.getAngle() + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI);

export function createSession({ sim, hud, season, progress, missions, onRestart, onGarage, onRankUp, onSuccess, onFailure }) {
  const trail = season.trail;

  const fresh = () => ({ time: 0, checkpoint: trail.start, fuelUsed: 0, odometer: 0, announced: null, farthest: null, earned: 0, xp: 0, bogsDone: 0, bogsClean: 0, crushes: 0, maxDamage: 0, cameraKmh: 0, cameras: [], camerasSeen: 0, refuelled: false, powered: false, stuckNow: 0, stuckMax: 0, missionDone: null, missionFailed: false, saveT: 0, lastX: null, stuckT: 0, rollT: 0, emptyT: 0, airT: 0, airKmh: 0, airHigh: 0, bestAir: 0, crushTimes: [] });
  const run = fresh();
  const api = { state: 'garage', run, get coins() { return wallet.coins; } };

  api.reset = () => { Object.assign(run, fresh()); };
  // coins add themselves: for new ground, for clearing a bog and for what gets crushed
  api.earn = (n, bonus = false) => { wallet.add(n, bonus); run.earned += n; if (bonus) hud.coinBonus(n); };
  // XP, scaled by the main truck's class; a new rank is announced at once
  const addXp = (x, now) => {
    if (!progress) return; run.xp += x;
    const ups = progress.addXp(x, now);
    if (ups.length) { const top = ups.at(-1); hud.toast(`Rank ${top.rank}: new trucks in the garage`, 3); onRankUp?.(ups); }
  };
  const gainXp = (n, now = false) => addXp(classXp(n, sim.main.car.class), now);
  // the run as missions see it
  const missionRun = (delivered = false) => ({ cls: sim.main.car.class, car: sim.main.car.id, time: run.time, x: run.farthest ?? trail.start, maxDamage: run.maxDamage, cameras: run.cameras, camerasSeen: run.camerasSeen, crushes: run.crushes, bogs: run.bogsClean, bogsMissed: run.bogsDone - run.bogsClean, refuelled: run.refuelled, powered: run.powered, stuckMax: run.stuckMax, delivered });
  function missionDone(done) {
    run.missionDone = done; addXp(done.xp, true);
    if (done.coins) api.earn(done.coins, true);   // featured contracts and a truck's first signature haul pay coins too
    hud.showMission(null);
    hud.callout?.('Mission complete', `+${done.xp.toLocaleString('en-US')} XP${done.coins ? ` · +${formatCoins(done.coins)} coins` : ''}`, true);
    api.onMission?.(done);
    onSuccess?.();
  }
  // what main.js reports: things crushed, a speed camera passed
  // things crushed close together make a streak, called out from the third
  api.crushed = () => {
    run.crushes++; api.onCrush?.();
    run.crushTimes = run.crushTimes.filter(t => run.time - t < CRUSH_STREAK_S); run.crushTimes.push(run.time);
    if (run.crushTimes.length >= 3 && api.state === 'play') hud.callout?.(`Crusher ×${run.crushTimes.length}`);
  };
  api.cameraSpeed = kmh => { run.camerasSeen++; run.cameraKmh = Math.max(run.cameraKmh, kmh); run.cameras.push(kmh); };
  // coins and XP are written every 2 s while driving; anything that leaves or freezes the run writes them at once,
  // so the last few seconds of rewards are never lost (closing the app from the pause menu, going to the garage)
  api.persist = () => { wallet.save(); progress?.save(); };
  const restartButton = (label = 'Restart') => [label, () => { api.persist(); hud.hideMessage(); api.state = 'play'; onRestart(); }];
  const garageButton = ['Back to garage', () => { api.persist(); hud.hideMessage(); onGarage(); }];

  // extra: { spec: [[label, value]...], buttons: [[label, fn]...] } from main.js (the truck's details
  // and the controls the phone HUD leaves out)
  api.pause = (openSound, extra = {}) => {
    api.state = 'pause'; api.persist();
    hud.showMessage('Paused', trail.name, '', extra.spec ?? [], [
      ['Resume', () => api.resume(), true], restartButton('Restart run'), garageButton, ['Settings', openSound], ...(extra.buttons ?? []),
    ]);
  };
  api.resume = () => { hud.hideMessage(); api.state = 'play'; api.onResume?.(); };

  function fail(kind) {
    api.state = 'fail';
    onFailure?.();
    missions?.endRun?.();
    api.persist();
    const coins = ['Coins this run', formatCoins(run.earned)];
    // a crash or a wreck ends the run: back to the very start of the trail
    if (kind === 'roll') {
      hud.showMessage('Crashed', 'The truck went over', '', [coins], [[...restartButton('Start again'), true], garageButton], 'wreck');
    } else if (kind === 'wreck') {
      hud.showMessage('Wrecked', 'Too much damage', '', [coins], [[...restartButton('Start again'), true], garageButton], 'wreck');
    } else if (kind === 'fuel') {
      hud.showMessage('Out of fuel', 'The tank is dry', '', [coins], [[...restartButton('Start again'), true], garageButton]);
    }
  }
  function deliver() {
    api.state = 'done';
    const load = sim.main.car.load, loadPay = load ? Math.round(300 + load.massT * 160) : 0, pay = trail.finishBonus + loadPay;
    wallet.add(pay);
    gainXp(XP_PER_DELIVERY, true);
    api.persist();
    const done = missions?.deliver(missionRun(true)); if (done) missionDone(done);
    if (!done) onSuccess?.();
    const extra = api.onDelivered?.(run) ?? [];   // main.js: the ghost's best time, the storm
    const rank = progress?.progress;
    const m = Math.floor(run.time / 60), s = Math.floor(run.time % 60);
    hud.showMessage(load ? 'Delivered' : 'Trail complete', load ? `${load.name} delivered` : `${trail.name} crossed`, '', [
      ['Time', `${m}:${String(s).padStart(2, '0')}`], ...extra, ['Distance driven', `${(run.odometer / 1000).toFixed(2)} km`],
      ['Coins on the road', formatCoins(run.earned)],
      ...(run.missionDone ? [['Mission', `${run.missionDone.mission.title} done: +${run.missionDone.xp.toLocaleString('en-US')} XP${run.missionDone.coins ? ` and ${formatCoins(run.missionDone.coins)} coins` : ''}`]] : []),
      ...(rank ? [['XP this run', `${Math.round(run.xp).toLocaleString('en-US')}`], ['Rank', rank.top ? `Rank ${rank.rank} (top)` : `Rank ${rank.rank} · ${rank.xp.toLocaleString('en-US')} / ${rank.to.toLocaleString('en-US')} XP`]] : []),
      ...(load ? [['Load pay', `${formatCoins(loadPay)} coins`]] : []), ['Trail pay', `${formatCoins(trail.finishBonus)} coins`],
    ], [['Drive again', () => { hud.hideMessage(); api.state = 'play'; onRestart(); }, true], garageButton], 'win');
  }

  // per-frame rules while playing
  api.update = dt => {
    if (api.state !== 'play') return;
    const main = sim.main, mainTruck = main.parts.truck, p = mainTruck.getPosition(), st = sim.st, ctl = sim.ctl;
    if (!(main.st.powerKind === 'timefreeze' && main.st.powerT > 0)) run.time += dt;   // Time Freeze stops the run's clock
    // Check crashes before rewards and delivery so reaching the depot cannot overwrite a rollover failure.
    if (angleOf(mainTruck) > 1.45) run.rollT += dt; else run.rollT = Math.min(0, run.rollT + dt);
    if (run.rollT > CRASH_SECONDS) { fail('roll'); return; }
    // wrecked: too much damage ends the run
    if (main.st.damage >= 100) { fail('wreck'); return; }
    // odometer: every metre the truck rolls, forwards or back (a respawn jump is not driving)
    if (run.lastX != null && Math.abs(p.x - run.lastX) < 5) run.odometer += Math.abs(p.x - run.lastX);
    run.lastX = p.x;
    // new ground and bog crossings pay coins and XP
    if (run.farthest == null) run.farthest = p.x;
    if (p.x > run.farthest) { api.earn((p.x - run.farthest) * COINS_PER_METRE); gainXp((p.x - run.farthest) * XP_PER_METRE); run.farthest = p.x; }
    const bogs = trail.heavyMud ?? [];
    while (run.bogsDone < bogs.length && p.x > bogs[run.bogsDone] + (sim.terrain?.bogHalfM ?? 10) + 2) { api.earn(COINS_PER_BOG, true); gainXp(XP_PER_BOG, true); run.bogsClean++; run.bogsDone++; hud.callout?.('Bog cleared', `+${COINS_PER_BOG} coins`); api.onBog?.(); }
    // a jump: every wheel off the ground; a long one is called out on landing and pays for its time in the air
    const rig = main.car.rig, wheels = main.parts.wheels ?? [], gaps = sim.colH ? wheels.map((w, i) => { const q = w.getPosition(); return q.y - wheelRadius(rig, i) - sim.colH(q.x); }) : [];
    const flying = gaps.length > 0 && gaps.every(g => g > 0.2);
    if (flying) {
      if (!run.airT) run.airKmh = Math.abs(mainTruck.getLinearVelocity().x) * 3.6;   // how fast it left the ground
      run.airT += dt; run.airHigh = Math.max(run.airHigh, Math.min(...gaps));
    } else if (run.airT) {
      if (run.airT >= AIR_MIN_S && run.airKmh >= AIR_MIN_KMH && run.airHigh >= AIR_MIN_HEIGHT_M) { const pay = Math.round(COINS_PER_AIR_S * run.airT); api.earn(pay, true); hud.callout?.('Big air', `${run.airT.toFixed(1)} s · +${pay} coins`, run.airT >= 1.2); run.bestAir = Math.max(run.bestAir, run.airT); api.onAir?.(run.airT); }
      run.airT = 0; run.airHigh = 0;
    }
    if ((run.saveT += dt) > 2) { run.saveT = 0; api.persist(); }
    if (run.time > 6) hud.setCardVisible(false);
    run.maxDamage = Math.max(run.maxDamage, main.st.damage);
    // what contracts' twists watch: a station fill, a power used, the longest time sat stuck
    if (main.st.filling) run.refuelled = true;
    if (main.st.powerT > 0) run.powered = true;
    run.stuckNow = ctl.gas > 0.5 && Math.abs(main.st.speed) < 0.6 ? run.stuckNow + dt : 0;
    run.stuckMax = Math.max(run.stuckMax, run.stuckNow);
    // a mission this run has broken glows red and slides away; it stays chosen for the next run
    if (missions && !run.missionDone && !run.missionFailed) {
      if (missions.failed?.(missionRun())) { run.missionFailed = true; hud.failMission({ mission: missions.active }); onFailure?.(); }
      else { const t = missions.track(missionRun()); if (t?.done) missionDone(t.done); else hud.showMission(t); }
    }
    for (const c of trail.checkpoints) if (p.x > c + 8 && c > run.checkpoint) run.checkpoint = c;
    // stuck hints, most useful first
    if (ctl.gas > 0.5 && Math.abs(st.speed) < 0.6) run.stuckT += dt; else run.stuckT = Math.max(0, run.stuckT - dt);
    // stuck hints, most useful first; a fully upgraded truck only ever needs AWD and DIFF, so it is never told to upgrade
    const stuckHint = !ctl.diff && st.diffLimited ? 'Wheel spinning: lock the DIFF' : !ctl.awd ? 'Turn on AWD' : !ctl.diff ? 'Lock the DIFF' : sim.main.car.physics.neverStuck ? null : 'Upgrade to never get stuck';
    if (run.stuckT > 3.5 && !hud.toastActive && stuckHint) hud.toast(stuckHint, 3);
    const ahead = sim.surfAt(p.x + 10);
    if (!hud.toastActive && ahead === 'mud' && sim.surfAt(p.x) !== 'mud' && !(ctl.awd && ctl.diff)) hud.toast('Deep mud: AWD + DIFF', 2.5);
    hud.nudge('awd', !ctl.awd && (run.stuckT > 2 || ahead === 'mud'));
    hud.nudge('diff', !ctl.diff && (st.diffLimited || run.stuckT > 2));
    // empty tank and delivery
    if (main.st.fuel <= 0 && Math.abs(main.st.speed) < 0.4) run.emptyT += dt; else run.emptyT = Math.min(0, run.emptyT + dt);
    if (run.emptyT > 2.5) { fail('fuel'); return; }
    if (p.x > trail.depot + 2) deliver();
    // a refuelled truck starts up by itself, and stations are worth a mention when you need one
    if (main.st.filling && main.st.engine === 'off' && main.st.fuel > 5) sim.startEngine(main);
    const near = (trail.stations ?? []).find(s => s.x > p.x && s.x - p.x < 45);
    if (near && near !== run.announced && (main.st.fuel < 70 || main.st.damage > 10 || main.st.powerCoolT > 0) && !hud.toastActive) { run.announced = near; hud.toast(main.st.powerCoolT > 0 && main.st.fuel >= 70 && main.st.damage <= 10 ? 'Station ahead: stop to recharge your power' : 'Fuel station ahead: stop in the bay', 3); }
  };
  return api;
}
