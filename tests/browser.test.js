// Browser regression: builds the game, loads it offline in headless Chromium and drives it through
// the real controls. First run: npx playwright install chromium.
// HAUL_CAPTURES=<dir> also saves screenshots for visual review (default output/captures).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { chromium } from 'playwright';
import { build } from '../tools/build.js';
import { ROOT, loadContentWithArt, readSoundBank } from '../tools/lib/content.js';
import { build as bundle } from 'esbuild';

const CAPTURES = process.env.HAUL_CAPTURES || path.join(ROOT, 'output/captures');

test('the game loads, drives and fits every viewport', { timeout: 180000 }, async () => {
  await build();
  const html = fs.readFileSync(path.join(ROOT, 'dist/heavy-haul.html'), 'utf8');
  const server = http.createServer((req, res) => { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(html); });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true, executablePath: process.env.HAUL_CHROMIUM || undefined, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, hasTouch: true }), errors = [];
    page.on('pageerror', e => errors.push(e.stack || e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));   // offline
    const url = `http://127.0.0.1:${server.address().port}`;
    const ready = () => page.waitForFunction(() => window.__haul?.renderer.ready && window.__haul.renderer.frames > 2);
    const capture = async name => { fs.mkdirSync(CAPTURES, { recursive: true }); await page.screenshot({ path: path.join(CAPTURES, `${name}.png`) }); };
    const step = n => page.evaluate(n => { for (let i = 0; i < n; i++) __haul.sim.step(1 / 120); }, n);

    await page.goto(url, { waitUntil: 'networkidle' }); await ready();
    assert(await page.evaluate(() => Object.values(__haul.renderer.assetStatus()).every(Boolean)), 'every artwork loads offline');
    assert.match(await page.locator('#gName').innerText(), /\S/, 'garage card is filled from car.json');
    // seasons on top, then the class tabs, then the chosen class's vehicles, planned ones locked
    assert.equal(await page.locator('.g-season.on').count(), 1, 'the season being played is selected');
    assert.equal(await page.locator('.g-class').count(), 5, 'one tab per class');
    assert(await page.locator('.gtile:not(.locked)').count() >= 1 && await page.locator('.gtile.locked').count() > 10, 'the class strip lists its roster, planned cars locked');
    await page.locator('.g-class', { hasText: 'Heavy Duty' }).click();
    assert.equal(await page.locator('.gtile:not(.locked)').count(), 0, 'a class with no playable cars shows them all locked');
    await page.locator('.g-class', { hasText: 'Scouts' }).click();
    await capture('00-garage');
    // tuning opens in the UPGRADE panel: five knobs, each can go to 100 in steps of 25; the run uses the tuned car
    assert(!await page.locator('.tune').first().isVisible(), 'the knobs stay hidden until UPGRADE');
    await page.click('#upgradeBtn');
    const stockPower = await page.evaluate(() => __haul.garage.selection.car.drivetrain.torqueScale);
    assert.deepEqual(await page.locator('.tune .tname b').allInnerTexts(), ['Engine', 'Suspension', 'Speed', 'Grip', 'Load weight']);
    const engine = page.locator('.tune', { hasText: 'Engine' }), plus = row => row.locator('.tstep', { hasText: '+' });
    for (let i = 0; i < 2; i++) await plus(engine).click();
    assert.equal(await engine.locator('.tval').innerText(), '50', 'two steps of 25');
    assert.equal(await engine.locator('.tbar').getAttribute('aria-valuenow'), '50');
    for (const name of ['Suspension', 'Speed', 'Grip', 'Load weight']) {
      const row = page.locator('.tune', { hasText: name });
      for (let i = 0; i < 4; i++) await plus(row).click();
      assert.equal(await row.locator('.tval').innerText(), '100', `${name}: four taps to 100`);
      assert(await plus(row).isDisabled(), `${name} stops at 100`);
    }
    await capture('00b-tuning');
    await page.click('#upgradeDone');
    assert(await page.locator('#upgradeOv').isHidden(), 'Done closes the upgrade panel');
    await page.click('#startBtn'); await page.waitForTimeout(500);
    assert(Math.abs(await page.evaluate(() => __haul.sim.car.drivetrain.torqueScale) - stockPower * 1.75) < 1e-9, 'the run uses the tuned engine (level 50 = x1.75)');
    assert(await page.evaluate(() => JSON.parse(localStorage.getItem('hh_tuning_levels'))[__haul.sim.car.id].grip === 100), 'levels saved per car');
    await page.evaluate(() => localStorage.removeItem('hh_tuning_levels'));
    await capture('01-desktop');

    // the body bounces on its springs while the landscape stays still
    const before = await page.evaluate(() => ({ body: __haul.sim.truck.getPosition().y, wheel: __haul.sim.wheels[0].getPosition().y, cam: __haul.view.cam.y }));
    await page.evaluate(() => __haul.sim.truck.applyLinearImpulse(__haul.sim.V(0, 9000), __haul.sim.truck.getWorldCenter(), true));
    await page.waitForFunction(y => __haul.sim.truck.getPosition().y > y + 0.07, before.body);
    const after = await page.evaluate(() => ({ body: __haul.sim.truck.getPosition().y, wheel: __haul.sim.wheels[0].getPosition().y, cam: __haul.view.cam.y }));
    assert(Math.abs(after.cam - before.cam) < 0.005, 'suspension bounce does not shake the camera');
    assert((after.body - before.body) - (after.wheel - before.wheel) > 0.04, 'body and wheels articulate independently');

    // keyboard throttle and brake, spinning tires (wait out the ignition crank first)
    await page.evaluate(() => { __haul.sim.respawn(30); for (let i = 0; i < 360; i++) __haul.sim.step(1 / 120); __haul.snap(); });
    await page.waitForFunction(() => __haul.sim.main.st.engine === 'on');
    const start = await page.evaluate(() => ({ x: __haul.sim.truck.getPosition().x, spin: __haul.sim.wheels[0].getAngle() }));
    await page.keyboard.down('ArrowRight'); await page.waitForFunction(() => __haul.sim.ctl.gas === 1);
    await step(600); await page.keyboard.up('ArrowRight'); await page.waitForFunction(() => __haul.sim.ctl.gas === 0);
    const driven = await page.evaluate(() => ({ x: __haul.sim.truck.getPosition().x, spin: __haul.sim.wheels[0].getAngle() }));
    assert(driven.x > start.x + 5, 'keyboard throttle drives'); assert(Math.abs(driven.spin - start.spin) > 2, 'tires rotate');
    await page.keyboard.down('ArrowLeft'); await page.waitForFunction(() => __haul.sim.ctl.brake === 1); await step(360); await page.keyboard.up('ArrowLeft');
    assert(await page.evaluate(() => Math.abs(__haul.sim.st.speed) < 0.3), 'brakes stop it');

    // 4x4 / DIFF buttons toggle the drivetrain; gears follow the keyboard
    await page.click('#awdBtn'); await page.click('#diffBtn');
    assert(await page.evaluate(() => __haul.sim.ctl.awd && __haul.sim.ctl.diff), '4x4 and DIFF buttons engage');
    await page.keyboard.press('KeyL'); assert.equal(await page.evaluate(() => __haul.sim.ctl.gear), 'L');

    // The camera uses the car's own zoom from car.json; there is no zoom button any more.
    assert.equal(await page.locator('#cameraBtn').count(), 0, 'no zoom button');
    assert.equal(await page.evaluate(() => __haul.view.zoom), await page.evaluate(() => __haul.sim.car.camera.zoom), 'the car sets the zoom');
    await page.waitForTimeout(200);
    assert(await page.evaluate(() => { const { W, ppm, cam } = __haul.view, nose = __haul.sim.truck.getWorldPoint(__haul.sim.V(__haul.sim.car.rig.nose, 0)); const x = (nose.x - cam.x) * ppm + W / 2; return x > W * 0.5 && x < W * 0.9; }), 'nose stays in frame');
    await capture('02-close');
    // the engine switch: off stops the truck from driving, on cranks it first; each truck has its own engine voice
    await page.waitForFunction(() => __haul.audio.mode === 'recorded');
    assert.equal(await page.evaluate(() => __haul.audio.status().decoded), Object.keys(readSoundBank().clips).length, 'every recorded clip decodes offline');
    assert.equal(await page.evaluate(() => __haul.audio.status().error), null);
    assert.deepEqual(await page.evaluate(() => __haul.audio.status().voices), ['scout'], 'the scout plays the scout engine');
    // the handbrake: PARK holds the truck against the throttle, B releases it
    await page.click('#handbrakeBtn');
    assert.equal(await page.evaluate(() => __haul.sim.ctl.handbrake), true, 'PARK sets the handbrake');
    assert.equal(await page.locator('#handbrakeBtn').getAttribute('aria-pressed'), 'true');
    const heldX = await page.evaluate(() => __haul.sim.truck.getPosition().x);
    await page.keyboard.down('ArrowRight'); await page.evaluate(() => { for (let i = 0; i < 240; i++) __haul.sim.step(1 / 120); }); await page.keyboard.up('ArrowRight');
    assert(await page.evaluate(x => Math.abs(__haul.sim.truck.getPosition().x - x) < 0.3, heldX), 'held against the throttle');
    await page.keyboard.press('KeyB');
    assert.equal(await page.evaluate(() => __haul.sim.ctl.handbrake), false, 'B releases it');
    // Engine-off means no propulsion, not immunity to gravity on the rebuilt
    // obstacle course. Check stationary behavior on the calm launch apron.
    await page.evaluate(() => { const s = __haul.sim; s.respawn(s.trail.start); for (let i = 0; i < 240; i++) s.step(1 / 120); __haul.snap(); });
    await page.click('#engineBtn');
    assert.equal(await page.evaluate(() => __haul.sim.st.engine), 'off', 'ENGINE turns it off');
    assert.equal(await page.locator('#engineBtn').getAttribute('aria-pressed'), 'false');
    // on firm, level ground at the start (the drive above can end at the edge of the mud, where a
    // parked truck settles a little as its tires sink)
    const parkedX = await page.evaluate(() => { const s = __haul.sim; s.respawn(30); for (let i = 0; i < 240; i++) s.step(1 / 120); return s.truck.getPosition().x; });
    await page.keyboard.down('ArrowRight'); await page.evaluate(() => { for (let i = 0; i < 240; i++) __haul.sim.step(1 / 120); }); await page.keyboard.up('ArrowRight');
    assert(await page.evaluate(x => Math.abs(__haul.sim.truck.getPosition().x - x) < 0.3, parkedX), 'no drive with the engine off');
    await page.keyboard.press('KeyI');
    assert.equal(await page.evaluate(() => __haul.sim.st.engine), 'cranking', 'I starts it on the starter');
    await page.waitForFunction(() => __haul.sim.st.engine === 'on');

    await page.keyboard.press('Escape'); assert.equal(await page.evaluate(() => __haul.session.state), 'pause');
    // the sound panel from the pause menu: volumes apply and are remembered
    await page.locator('#msgBtns button', { hasText: 'Sound' }).click();
    assert(await page.locator('#soundOv').isVisible(), 'the sound panel opens');
    assert(await page.locator('#vol-ambience').isVisible(), 'ambience has its own slider');
    assert.match(await page.locator('#soundCredits').textContent(), /Dodge RAM 1500.*sketchy\.dog.*CC BY 4\.0/, 'the CC BY recording is credited');
    await page.locator('#vol-engine').fill('35');
    assert.equal(await page.evaluate(() => __haul.audio.volumes.engine), 0.35, 'the engine slider sets the engine volume');
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('hh_audio_volumes')).engine), 0.35, 'saved');
    await capture('02b-sound');
    await page.click('#soundDone');
    assert(await page.locator('#msgOv').isVisible(), 'back to the pause menu');
    await page.evaluate(() => { __haul.audio.setVolume('engine', 0.8); });
    const paused = await page.evaluate(() => __haul.sim.truck.getPosition().x); await page.waitForTimeout(150);
    assert.equal(await page.evaluate(() => __haul.sim.truck.getPosition().x), paused, 'pause stops physics');

    // stuck in a heavy-mud pit: call the scouts' breakdown truck, which starts at the beginning of the
    // trail, drive it out, winch the truck back out of the pit and switch back
    await page.goto(url, { waitUntil: 'networkidle' }); await ready(); await page.click('#startBtn');
    await page.evaluate(() => { const s = __haul.sim; s.respawn(s.trail.heavyMud[0] - 6); __haul.setGear('L'); __haul.setMode('awd', true); __haul.setMode('diff', true); for (let i = 0; i < 240; i++) s.step(1 / 120); __haul.snap(); });
    await page.waitForTimeout(150); await capture('03-deep-mud');
    const x0 = await page.evaluate(() => __haul.sim.main.parts.truck.getPosition().x);
    await page.click('#breakdownCallBtn');
    assert(await page.evaluate(() => __haul.sim.active.car.role === 'breakdown' && __haul.sim.active.car.class === __haul.sim.main.car.class && __haul.sim.vehicles.length === 2), 'the class\'s own breakdown truck arrives and takes control');
    assert(await page.evaluate(() => __haul.sim.truck.getPosition().x < __haul.sim.trail.start + 30), 'it starts at the beginning of the trail');
    assert(await page.locator('#breakdownCallBtn').evaluate(e => e.classList.contains('called')), 'its button now switches to it');
    await page.waitForTimeout(100); await capture('03a-called-at-start');
    // drive it out to the stuck truck: it never runs dry and never gets stuck
    await page.evaluate(() => { const s = __haul.sim; __haul.setGear('L'); for (let i = 0; i < 120 * 90 && s.nearestHook().d > s.winchReach - 1.5; i++) { s.ctl.gas = 1; s.step(1 / 120); } s.ctl.gas = 0; for (let i = 0; i < 60; i++) s.step(1 / 120); __haul.snap(); });
    assert(await page.evaluate(() => __haul.sim.nearestHook().d <= __haul.sim.winchReach), 'driven out to within hook reach');
    assert.equal(await page.evaluate(() => __haul.sim.active.st.fuel), 100, 'service trucks never burn fuel');
    await page.waitForTimeout(100); await capture('03b-unlimited-fuel');
    assert(await page.locator('#winch').isVisible(), 'the winch button shows for the service truck');
    // tap WINCH, then reverse away to tow the truck back out of the pit
    await page.click('#winch');
    assert(await page.evaluate(() => !!__haul.sim.cable() && __haul.sim.cable().target === __haul.sim.main), 'tapping WINCH hooks the stuck truck');
    assert(await page.locator('#winch').getAttribute('aria-pressed') === 'true' || await page.evaluate(() => !!__haul.sim.cable()));
    await page.evaluate(() => { const s = __haul.sim; __haul.setGear('R'); for (let i = 0; i < 120 * 6; i++) { s.ctl.gas = 1; s.step(1 / 120); } s.ctl.gas = 0; __haul.snap(); });
    await page.waitForTimeout(200); await capture('03b-winch');
    assert(await page.evaluate(x => __haul.sim.main.parts.truck.getPosition().x < x - 1.5, x0), 'driving the breakdown truck away tows the stuck truck');
    await page.keyboard.press('KeyW');
    assert(await page.evaluate(() => !__haul.sim.cable()), 'W unhooks');
    await page.click('#switchBtn');
    assert(await page.evaluate(() => __haul.sim.active.role === 'main' && __haul.sim.vehicles.length === 2), 'the switch button returns to the main truck; the breakdown truck stays parked');

    // Fuel is transferred gradually; pause freezes the job and completion waits for a manual switch.
    await page.evaluate(() => { const s = __haul.sim; s.respawn(30); s.main.st.fuel = 25; });
    await page.click('#fuelCallBtn');
    assert(await page.evaluate(() => __haul.sim.active.car.role === 'fuel' && __haul.sim.active.car.class === __haul.sim.main.car.class), 'the fuel button calls the class\'s own fuel truck');
    assert(await page.evaluate(() => __haul.sim.truck.getPosition().x < __haul.sim.trail.start + 40), 'from the beginning of the trail');
    assert(await page.locator('#fuelCallBtn').evaluate(e => e.classList.contains('called')), 'its button now switches to it');
    assert(await page.evaluate(() => !__haul.sim.canWinch()), 'the fuel truck has no winch');
    assert(await page.locator('#winch').isHidden(), 'so no WINCH button');
    await page.evaluate(() => {
      const s = __haul.sim; s.respawn(39, s.active);
      for (let i = 0; i < 240; i++) s.step(1 / 120);
      __haul.snap();
    });
    await page.waitForFunction(() => __haul.serviceJob() === 'Refuel truck');
    await page.click('#actionBtn');
    await page.waitForFunction(() => __haul.renderer.refueling?.progress > 0.1);
    assert(await page.evaluate(() => __haul.sim.main.st.fuel > 25 && __haul.sim.main.st.fuel < 100), 'fuel rises during the animation rather than filling instantly');
    assert(await page.locator('#actionBtn').isDisabled(), 'a second fueling job cannot start during transfer');
    await capture('03c-refueling');
    await page.keyboard.press('Escape');
    const fuelPaused = await page.evaluate(() => __haul.sim.main.st.fuel);
    await page.waitForTimeout(200);
    assert.equal(await page.evaluate(() => __haul.sim.main.st.fuel), fuelPaused, 'fuel transfer pauses with the game');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !__haul.renderer.refueling && document.getElementById('switchBtn').classList.contains('service-ready'));
    assert(await page.evaluate(() => __haul.sim.active.car.role === 'fuel' && __haul.sim.main.st.fuel > 99.9), 'full tank leaves the player driving the fuel truck');
    await capture('03d-refueled');
    await page.keyboard.press('KeyV');
    assert(await page.evaluate(() => __haul.sim.active === __haul.sim.main), 'V returns directly to the main truck even with several service vehicles');
    assert(!await page.locator('#switchBtn').evaluate(e => e.classList.contains('service-ready')), 'keyboard switching clears the glow');
    const count = await page.evaluate(() => __haul.sim.vehicles.length);
    await page.click('#fuelCallBtn');
    assert(await page.evaluate(n => __haul.sim.active.car.role === 'fuel' && __haul.sim.vehicles.length === n, count), 'tapping the fuel button again switches to it: it is never called twice');
    await page.click('#fuelCallBtn');
    assert(await page.evaluate(() => __haul.sim.active === __haul.sim.main), 'and tapping it in the fuel truck returns to the main truck');
    const gas = await page.locator('#gas').boundingBox(), cdp = await page.context().newCDPSession(page);
    await page.waitForFunction(() => __haul.sim.main.st.engine === 'on');
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: gas.x + gas.width / 2, y: gas.y + gas.height / 2 }] }); await page.waitForFunction(() => __haul.sim.ctl.gas === 1);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForFunction(() => __haul.sim.ctl.gas === 0);
    for (const [x, name] of [[375, '04-water'], [460, '05-rocks'], [940, null], [1500, null]]) {
      await page.evaluate(x => { __haul.sim.respawn(x); for (let i = 0; i < 120; i++) __haul.sim.step(1 / 120); __haul.snap(); }, x);
      await page.waitForTimeout(100); if (name) await capture(name);
    }

    // Deep slurry is visible before it slows the truck; moving tires leave ruts that stay for the run.
    await page.evaluate(() => {
      const s = __haul.sim; s.respawn(s.trail.heavyMud[0]); __haul.setGear('L'); __haul.setMode('awd', true); __haul.setMode('diff', true);
      for (let frame = 0; frame < 150; frame++) {
        s.ctl.gas = 1; s.step(1 / 120); s.step(1 / 120);
        __haul.renderer.draw(1 / 60, true);
      }
      s.ctl.gas = 0; __haul.snap();
    });
    await page.waitForFunction(() => document.getElementById('surfChip').classList.contains('bog'));
    assert(await page.evaluate(() => __haul.renderer.mudTracks > 0.5), 'moving tires leave mud ruts');
    const rutX = await page.evaluate(() => __haul.sim.trail.heavyMud[0] + 0.5);
    assert(await page.evaluate(x => __haul.renderer.rutAt(x) > 0.3, rutX), 'the ruts are deep in the bog');
    await capture('08-bog-splash');
    await page.evaluate(() => {
      const s = __haul.sim, b = s.bridges[0]; s.respawn((b.x0 + b.x1) / 2);
      for (let i = 0; i < 120; i++) s.step(1 / 120); __haul.snap();
    });
    await page.waitForFunction(() => __haul.sim.st.surf === 'wood');
    await capture('09-swing-bridge');
    // a minute later and somewhere else, the ruts are still where they were left
    await page.evaluate(() => { for (let i = 0; i < 120 * 60; i++) __haul.sim.step(1 / 120); for (let f = 0; f < 30; f++) __haul.renderer.draw(1 / 60, true); });
    assert(await page.evaluate(x => __haul.renderer.rutAt(x) > 0.3, rutX), 'ruts persist through the run');
    await page.evaluate(() => { __haul.startRun(__haul.garage.selection); __haul.renderer.draw(1 / 60, true); });
    assert.equal(await page.evaluate(() => __haul.renderer.mudTracks), 0, 'a restarted run clears old mud impressions');
    // the Ice Breaker draws as one image, its orca and tank part of the body art
    await page.evaluate(() => { __haul.garage.select('ice-breaker-19'); __haul.startRun(__haul.garage.selection); });
    await page.waitForFunction(() => __haul.sim.main.st.engine === 'on');
    await page.evaluate(() => { __haul.sim.respawn(30); for (let i = 0; i < 120; i++) __haul.sim.step(1 / 120); __haul.snap(); });
    await capture('10-ice-breaker');
    // a class without a truck of that role gets a greyed-out button that calls nothing; one with it,
    // a live button (the Ice Breaker's off-road class: a breakdown truck, no fuel truck yet)
    const has = await page.evaluate(() => Object.fromEntries(['fuel', 'breakdown'].map(r => [r, __haul.content.service.some(c => c.role === r && c.class === __haul.sim.main.car.class)])));
    for (const [role, id] of [['fuel', '#fuelCallBtn'], ['breakdown', '#breakdownCallBtn']]) {
      assert.equal(await page.locator(id).evaluate(e => e.classList.contains('unavailable')), !has[role], `${id} is greyed out exactly when the class has no ${role} truck`);
      if (has[role]) continue;
      await page.click(id);
      assert(await page.evaluate(() => __haul.sim.vehicles.length === 1 && __haul.sim.active === __haul.sim.main), `${id} calls no other class's truck`);
      assert.match(await page.locator('#toast').innerText(), /Not available: the Off-road class has no/);
      await capture('10b-ice-breaker-no-service');
    }
    await page.click('#breakdownCallBtn');
    assert(await page.evaluate(() => __haul.sim.active.car.id === 'bog-wrecker'), 'the Ice Breaker gets the off-road Bog Wrecker');
    await page.waitForTimeout(150); await capture('10c-bog-wrecker');
    await page.click('#fuelCallBtn');
    assert(await page.evaluate(() => __haul.sim.active.car.id === 'titan-tanker'), 'and the off-road Titan Tanker');
    await page.waitForTimeout(150); await capture('10d-titan-tanker');
    // the heavy class: the Mountain Mover gets the Colossus Wrecker
    await page.evaluate(() => { __haul.garage.select('mountain-mover-18'); __haul.startRun(__haul.garage.selection); });
    await page.waitForFunction(() => __haul.sim.main.st.engine === 'on');
    await page.click('#breakdownCallBtn');
    assert(await page.evaluate(() => __haul.sim.active.car.id === 'colossus-wrecker'), 'the Mountain Mover gets the heavy Colossus Wrecker');
    await page.evaluate(() => { const s = __haul.sim; s.ctl.gas = 1; for (let i = 0; i < 120 * 3; i++) s.step(1 / 120); s.ctl.gas = 0; for (let i = 0; i < 120; i++) s.step(1 / 120); __haul.snap(); });
    await page.waitForTimeout(150); await capture('10e-colossus-wrecker');
    await page.evaluate(() => { __haul.garage.select('swamp-scout-4'); });

    // phone landscape: pedals leave the tire contact visible; portrait: controls fit
    await page.goto(url, { waitUntil: 'networkidle' }); await ready(); await page.click('#startBtn'); await page.waitForTimeout(400);
    await page.setViewportSize({ width: 844, height: 390 }); await page.waitForTimeout(200);
    const groundY = await page.evaluate(() => { const { H, ppm, cam } = __haul.view; return H / 2 - (__haul.sim.visH(__haul.sim.truck.getPosition().x) - cam.y) * ppm; });
    assert(groundY < (await page.locator('#gas').boundingBox()).y + 4, 'phone pedals leave tire contact visible');
    await capture('06-phone');
    await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(100);
    for (const id of ['#pauseBtn', '#gas', '#brake']) { const b = await page.locator(id).boundingBox(); assert(b.x >= 0 && b.x + b.width <= 391, `${id} fits portrait`); }
    await capture('07-portrait');
    // the long rigs and the service trucks frame with their own zoom; switching vehicles re-frames
    await page.setViewportSize({ width: 844, height: 390 });
    const scoutZoom = await page.evaluate(() => __haul.view.zoom);
    await page.evaluate(() => __haul.summon('fuel'));
    assert.equal(await page.evaluate(() => __haul.view.zoom), await page.evaluate(() => __haul.sim.active.car.camera.zoom), 'the fuel truck uses its own zoom');
    await page.evaluate(() => __haul.switchVehicle());
    assert.equal(await page.evaluate(() => __haul.view.zoom), scoutZoom, 'back in the scout, its zoom returns');
    assert.deepEqual(errors, [], 'no runtime or artwork errors');
  } finally {
    await browser.close(); await new Promise(r => server.close(r));
  }
});

test('terrain stays opaque below uphill, downhill and valley contours', { timeout: 30000 }, async () => {
  const content = loadContentWithArt();
  const code = await bundle({
    stdin: { contents: "import { drawGround } from './src/render/layers/ground.js'; window.drawTestGround = drawGround;", resolveDir: ROOT },
    bundle: true, write: false, format: 'iife',
  });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.HAUL_CHROMIUM || undefined, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.setContent('<canvas></canvas>');
    await page.addScriptTag({ content: code.outputFiles[0].text });
    const gaps = await page.evaluate(async ({ art, render }) => {
      const images = {};
      for (const key of ['bank', 'ground']) {
        const img = new Image(); img.src = art[key]; await img.decode(); images[key] = img;
      }
      const canvas = document.querySelector('canvas'), ctx = canvas.getContext('2d', { willReadFrequently: true });
      const result = [];
      for (const [W, H, ppm] of [[600, 420, 20], [390, 844, 22], [844, 390, 42]]) {
        canvas.width = W; canvas.height = H;
        for (const slope of [-0.55, 0, 0.55, 'valley']) {
          const cam = { x: 0, y: 1.5 }, lo = -W / 2 / ppm, hi = -lo;
          const visH = x => slope === 'valley' ? 0.025 * x * x - 2 : slope * x + Math.sin(x * 2) * 0.14;
          const matrix = [ppm, 0, 0, -ppm, W / 2, H / 2 + cam.y * ppm];
          ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H); ctx.setTransform(...matrix);
          const pattern = ctx.createPattern(images.ground, 'repeat');
          pattern.setTransform(new DOMMatrix([0.004, 0, 0, -0.004, 0, 0]));
          window.drawTestGround({ view: { ctx, cam, H, ppm, viewX: () => [lo, hi] },
            images, season: { render }, worldMatrix: matrix, sim: { visH }, cache: { deepPat: pattern } });
          const pixels = ctx.getImageData(0, 0, W, H).data;
          let missing = 0;
          for (let x = 2; x < W - 2; x += 3) {
            const worldX = (x - W / 2) / ppm;
            const start = Math.max(0, Math.ceil(H / 2 - (visH(worldX) - cam.y) * ppm) + 2);
            for (let y = start; y < H; y += 3) if (pixels[(y * W + x) * 4 + 3] !== 255) missing++;
          }
          if (missing) result.push({ W, H, slope, missing });
        }
      }
      return result;
    }, { art: content.seasonArt, render: content.season.render });
    assert.deepEqual(gaps, [], 'no backdrop can show through below the road, including at viewport edges');
  } finally { await browser.close(); }
});
