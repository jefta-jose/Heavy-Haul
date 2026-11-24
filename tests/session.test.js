import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession } from '../src/game/session.js';
import { CRASH_SECONDS } from '../src/game-config.js';

function setup() {
  let x = 0, xp = 0, tracked = 0, delivered = 0, mainAngle = 0;
  const outcomes = [];
  let spin = 0;
  const main = { car: { class: 'scout', name: 'Scout' }, st: { damage: 0, fuel: 100, speed: 0 }, parts: { truck: { getPosition: () => ({ x }), getAngle: () => mainAngle, getAngularVelocity: () => spin } } };
  const sim = { main, active: main, vehicles: [main], st: { speed: 0 }, ctl: {}, surfAt: () => 'dirt' };
  const hud = { toastActive: true, coinBonus() {}, toast() {}, showMission() {}, failMission() {}, showMessage() {}, nudge() {}, setCardVisible() {} };
  const season = { name: 'Test', trail: { start: 0, depot: 100, finishBonus: 100, heavyMud: [20], checkpoints: [] } };
  const progress = { addXp(n) { xp += n; return []; }, save() {} };
  const missions = { track() { tracked++; }, deliver() { delivered++; } };
  const session = createSession({ sim, hud, season, progress, missions, onSuccess: () => outcomes.push('complete'), onFailure: () => outcomes.push('failed') });
  session.state = 'play'; session.update(0.01);
  return { sim, session, missions, outcomes, setMainAngle(a) { mainAngle = a; }, setSpin(w) { spin = w; }, move(n) { x = n; session.update(0.01); }, get xp() { return xp; }, get tracked() { return tracked; }, get delivered() { return delivered; } };
}

test('an overturned truck ends the run after the crash grace and announces failure once', () => {
  const t = setup(); t.setMainAngle(Math.PI);
  t.session.update(CRASH_SECONDS); assert.equal(t.session.state, 'play');
  t.session.update(0.01); assert.equal(t.session.state, 'fail');
  t.session.update(1);
  assert.deepEqual(t.outcomes, ['failed']);
});

test('a flip is not a crash: upside down while turning fast keeps the run going, lying still on the roof ends it', () => {
  const t = setup(); t.setMainAngle(Math.PI); t.setSpin(4);
  t.session.update(CRASH_SECONDS * 3); assert.equal(t.session.state, 'play', 'mid-flip');
  t.setSpin(0); t.session.update(CRASH_SECONDS + 0.05); assert.equal(t.session.state, 'fail', 'on its roof');
});

test('uprighting the truck and restarting a run each clear its rollover timer', () => {
  const t = setup(); t.setMainAngle(Math.PI); t.session.update(CRASH_SECONDS * 0.6);
  t.setMainAngle(0); t.session.update(0.01);
  t.setMainAngle(Math.PI); t.session.update(CRASH_SECONDS * 0.6);
  assert.equal(t.session.state, 'play');
  t.session.reset(); t.session.update(CRASH_SECONDS * 0.6);
  assert.equal(t.session.state, 'play');
  t.session.update(CRASH_SECONDS * 0.5); assert.equal(t.session.state, 'fail');
});

test('a wrecked truck ends the run', () => {
  const t = setup(); t.sim.main.st.damage = 100; t.move(10);
  assert.equal(t.session.state, 'fail'); assert.deepEqual(t.outcomes, ['failed']);
});

test('a normal truck still fails when rolled, and a crash cannot turn into a delivery', () => {
  const t = setup(); t.setMainAngle(Math.PI); t.session.update(CRASH_SECONDS - 0.005); t.move(110);
  assert.equal(t.session.state, 'fail'); assert.equal(t.delivered, 0);
  assert.deepEqual(t.outcomes, ['failed']);
});

test('finishing a live mission and later delivering are separate success announcements', () => {
  const t = setup(); t.missions.track = () => ({ done: { mission: { title: 'Crusher' }, xp: 100 } });
  t.move(10); t.move(11);
  assert.deepEqual(t.outcomes, ['complete']);
  t.move(110); t.session.update(1);
  assert.deepEqual(t.outcomes, ['complete', 'complete']);
});

test('a delivery that also finishes a mission announces success only once', () => {
  const t = setup(); t.missions.deliver = () => ({ mission: { title: 'Delivery' }, xp: 100 });
  t.move(110); t.session.update(1);
  assert.equal(t.session.state, 'done'); assert.deepEqual(t.outcomes, ['complete']);
});

test('a broken optional mission announces failure once while the run continues', () => {
  const t = setup(); t.missions.failed = () => true;
  t.move(10); t.move(11);
  assert.equal(t.session.state, 'play'); assert.deepEqual(t.outcomes, ['failed']);
});

test('running out of fuel at the depot fails instead of also awarding delivery', () => {
  const t = setup(); t.sim.main.st.fuel = 0; t.session.run.emptyT = 2.5; t.move(110);
  assert.equal(t.session.state, 'fail'); assert.equal(t.delivered, 0);
  assert.deepEqual(t.outcomes, ['failed']);
});

test('driving earns road, bog and event rewards and tracks missions', () => {
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

test('interpolation blends transforms, reuses getters and restores physical body readings', async () => {
  const { createInterpolation } = await import('../src/game/interpolate.js');
  class Body {
    p = { x: 0, y: 0 }; a = 0;
    isStatic() { return false; } getNext() { return null; }
    getPosition() { return this.p; } getAngle() { return this.a; }
    getLocalCenter() { return { x: 1, y: 0 }; }
  }
  const b = new Body(), blend = createInterpolation({ world: { getBodyList: () => b } }, (x, y) => ({ x, y }));
  blend.capture(); b.p = { x: 1, y: 2 }; b.a = Math.PI;
  blend.apply(0.5);
  const getter = b.getPosition;
  assert.deepEqual(b.getPosition(), { x: 0.5, y: 1 }); assert.equal(b.getAngle(), Math.PI / 2);
  const point = b.getWorldPoint({ x: 1, y: 0 }), vector = b.getWorldVector({ x: 1, y: 0 });
  assert(Math.abs(point.x - 0.5) < 1e-12 && Math.abs(point.y - 2) < 1e-12);
  assert(Math.abs(vector.x) < 1e-12 && Math.abs(vector.y - 1) < 1e-12);
  assert.deepEqual(b.getWorldCenter(), point);
  blend.restore(); assert.deepEqual(b.getPosition(), { x: 1, y: 2 }); assert.equal(b.getAngle(), Math.PI);
  assert(!Object.hasOwn(b, 'getPosition'));
  blend.apply(0.25); assert.equal(b.getPosition, getter, 'getter functions are reused'); blend.restore();
  blend.capture(); b.p = { x: 20, y: 2 }; blend.apply(0.5);
  assert.deepEqual(b.getPosition(), { x: 20, y: 2 }, 'teleports do not blend'); blend.restore();
});
