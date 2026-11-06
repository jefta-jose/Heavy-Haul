import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession } from '../src/game/session.js';

function setup() {
  let x = 0, xp = 0, tracked = 0, delivered = 0;
  const main = { car: { class: 'scout', name: 'Scout' }, st: { damage: 0, fuel: 100 }, parts: { truck: { getPosition: () => ({ x }), getAngle: () => 0 } } };
  const service = { role: 'service', parts: main.parts };
  const sim = { main, active: main, vehicles: [main, service], st: { speed: 0 }, ctl: {}, surfAt: () => 'dirt' };
  const hud = { toastActive: true, coinBonus() {}, toast() {}, showMission() {}, failMission() {}, showMessage() {}, nudge() {}, setCardVisible() {} };
  const season = { name: 'Test', trail: { start: 0, depot: 100, finishBonus: 100, heavyMud: [20], checkpoints: [] } };
  const progress = { addXp(n) { xp += n; return []; }, save() {} };
  const missions = { track() { tracked++; }, deliver() { delivered++; } };
  const session = createSession({ sim, hud, season, progress, missions });
  session.state = 'play'; session.update(0.01);
  return { sim, session, service, move(n) { x = n; session.update(0.01); }, get xp() { return xp; }, get tracked() { return tracked; }, get delivered() { return delivered; } };
}

test('service driving blocks every reward, mission event and depot completion without banking distance', () => {
  const t = setup(), { sim, session, service } = t;
  sim.active = service;
  const coins = session.coins, tracks = t.tracked;
  session.earn(100, true); session.crushed(); session.cameraSpeed(100);
  t.move(40); t.move(110);
  assert.equal(session.coins, coins); assert.equal(t.xp, 0);
  assert.equal(session.run.crushes, 0); assert.equal(session.run.cameraKmh, 0); assert.equal(session.run.bogsClean, 0);
  assert.equal(t.tracked, tracks); assert.equal(t.delivered, 0); assert.equal(session.state, 'play');
  sim.active = sim.main; t.move(110);
  assert.equal(session.run.earned, 0, 'rescue distance and bogs are not paid on switching back');
  assert.equal(session.state, 'done', 'main truck can complete its delivery after taking control');
  assert(t.xp > 0); assert.equal(t.delivered, 1);
});

test('a connected tow cable blocks rewards and missions even if slack or switched back to the main truck', () => {
  const t = setup(), { sim, session, service } = t;
  service.cable = { target: sim.main, taut: false };
  const coins = session.coins, tracks = t.tracked;
  session.earn(100); session.crushed(); session.cameraSpeed(100); t.move(110);
  assert.equal(session.coins, coins); assert.equal(t.xp, 0); assert.equal(t.tracked, tracks); assert.equal(t.delivered, 0);
  assert.equal(session.run.crushes, 0); assert.equal(session.run.cameraKmh, 0); assert.equal(session.state, 'play');
});

test('normal main-truck driving still earns road, bog and event rewards and tracks missions', () => {
  const t = setup(), before = t.session.coins;
  t.move(40); t.session.earn(20); t.session.crushed(); t.session.cameraSpeed(80);
  assert(t.session.coins > before); assert(t.xp > 0); assert(t.tracked > 1);
  assert.equal(t.session.run.bogsClean, 1); assert.equal(t.session.run.crushes, 1); assert.equal(t.session.run.cameraKmh, 80);
});


test('wallet preserves a spent balance of zero across reloads and rejects invalid saves', async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  let saved = null, revision = 0;
  globalThis.localStorage = { getItem: () => saved, setItem: (_, value) => { saved = value; } };
  const reload = async () => (await import(`../src/game/wallet.js?wallet-test=${revision++}`)).wallet;
  try {
    const { STARTING_COINS } = await import('../src/game-config.js');
    let w = await reload(); assert.equal(w.coins, STARTING_COINS);
    assert(w.spend(w.coins)); assert.equal(saved, '0');
    w = await reload(); assert.equal(w.coins, 0);
    for (const invalid of ['NaN', 'Infinity', '-1', 'bad']) { saved = invalid; assert.equal((await reload()).coins, STARTING_COINS); }
    saved = '125'; assert.equal((await reload()).coins, 125);
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original); else delete globalThis.localStorage;
  }
});
