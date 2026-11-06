// Browser regression: builds the game, loads it offline in headless Chromium and drives it through
// the real controls. First run: npx playwright install chromium.
// HAUL_CAPTURES=<dir> also saves screenshots for visual review (default output/captures).
import test from 'node:test';
import { formatCoins } from '../src/game/format.js';
import { ZOOM_BY_CLASS } from '../src/game-config.js';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { chromium } from 'playwright';
import { build, buildApp } from '../tools/build.js';
import { ROOT, loadContentWithArt, readSoundBank } from '../tools/lib/content.js';
import { build as bundle } from 'esbuild';
import { releaseCode } from './release-build.js';

const CAPTURES = process.env.HAUL_CAPTURES || path.join(ROOT, 'output/captures');
// these runs drive many trucks: start them at the top rank with every truck owned (the rank and buying flow is tested on its own)
const ALL_OWNED = JSON.stringify({ xp: 40000, owned: JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/cars/cars.json'), 'utf8')).cars.map(c => c.id) });
const ownAll = page => page.addInitScript(v => { try { localStorage.setItem('hh_progress', v); } catch (e) {} }, ALL_OWNED);

test('the app build loads its art and audio from separate files', { timeout: 120000 }, async () => {
  await buildApp();
  const www = path.join(ROOT, 'www');
  assert(!fs.readFileSync(path.join(www, 'index.html'), 'utf8').includes(';base64,'), 'nothing is embedded in the page');
  const TYPES = { '.html': 'text/html', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2' };
  const server = http.createServer((req, res) => {
    const f = path.join(www, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    fs.readFile(f.endsWith(path.sep) ? path.join(f, 'index.html') : f, (err, body) => {
      if (err) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(f) || '.html'] ?? 'application/octet-stream' }); res.end(body);
    });
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true, executablePath: process.env.HAUL_CHROMIUM || undefined, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true }), errors = [];
    await ownAll(page);
    page.on('pageerror', e => errors.push(e.stack || e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));   // offline
    const bodies = new Set(), sounds = new Set();
    page.on('request', r => { if (r.url().includes('/art/body')) bodies.add(r.url()); if (r.url().endsWith('.mp3')) sounds.add(r.url()); });
    await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__haul?.renderer.ready && window.__haul.renderer.frames > 2);
    assert(await page.evaluate(() => Object.values(__haul.renderer.assetStatus()).every(Boolean)), 'every artwork loads from its file');
    assert.equal(bodies.size, 1, 'startup loads only the default car, not the whole roster');
    const garageAWD = await page.evaluate(() => __haul.sim.ctl.awd);
    await page.keyboard.press('KeyQ');
    assert.equal(await page.evaluate(() => __haul.sim.ctl.awd), garageAWD, 'Q in the garage leaves AWD unchanged');
    // a run also brings in its class's service trucks, and draws a truck called from them
    await page.evaluate(() => __haul.startRun(__haul.garage.selection));
    await page.waitForFunction(() => __haul.renderer.ready);
    await page.evaluate(() => __haul.summon('breakdown'));
    await page.waitForFunction(() => __haul.sim.active.car.role === 'breakdown' && __haul.renderer.ready);
    const frames = await page.evaluate(() => __haul.renderer.frames);
    await page.waitForFunction(n => __haul.renderer.frames > n + 2, frames);
    assert.equal(bodies.size, 2, 'the main car plus its class\'s breakdown truck');
    await page.evaluate(() => __haul.audio.start());
    await page.waitForFunction(() => __haul.audio.status().voices.includes('scout'));
    const status = () => page.evaluate(() => __haul.audio.status());
    assert.equal((await status()).error, null, 'clips decode from their files');
    assert(sounds.size < Object.keys(readSoundBank().clips).length, 'only the clips this run needs are fetched');
    assert(![...sounds].some(s => /engine-(highway|heavy|offroad)/.test(s)), 'no other class\'s engine is fetched');
    // a bed decodes when it is first heard
    for (let i = 0; i < 100 && ![...sounds].some(s => /\/(forest|frogs|rattle-bed|dirt|gravel|rocks|mud)\.mp3$/.test(s)); i++) await page.waitForTimeout(100);
    assert([...sounds].some(s => /\/(forest|frogs|rattle-bed|dirt|gravel|rocks|mud)\.mp3$/.test(s)), 'the beds in earshot are fetched');
    assert(![...sounds].some(s => /\/(winch-motor|fuel-pump|fuel-flow)\.mp3$/.test(s)), 'beds not yet heard are not');
    // picking another class drops the old engine for the new one
    const scoutMB = (await status()).decodedMB, otherEngine = page.waitForResponse(/engine-heavy-duty/);
    await page.evaluate(() => { __haul.garage.show(); });
    await page.locator('.g-class', { hasText: 'Heavy Duty' }).click();
    await otherEngine;
    await page.waitForFunction(mb => __haul.audio.status().decodedMB !== mb, scoutMB);
    assert.equal((await status()).error, null);
    // inside the Android app the screen is already full, so no fullscreen buttons are offered
    await page.addInitScript(() => { window.Capacitor = { isNativePlatform: () => true }; });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__haul?.renderer.ready);
    assert(!await page.locator('#startFs').isVisible(), 'no fullscreen button in the garage');
    await page.click('#startBtn');
    await page.waitForFunction(() => __haul.session.state === 'play');
    assert(!await page.locator('#fsBtn').isVisible(), 'no fullscreen button on the HUD');
    // the lean phone HUD (2026-11-06): no status panel, trail map, PARK or ENGINE; the depot distance and
    // three dials (revs, speed, fuel) between the pedals, and no pedal labels
    const hud = await page.evaluate(() => {
      const box = id => document.getElementById(id).getBoundingClientRect(), gone = ['carName', 'fuelFill', 'track', 'handbrakeBtn', 'engineBtn'];
      return { gone: gone.every(id => !document.getElementById(id)), dist: /to depot/.test(document.getElementById('depotSign').textContent) && !document.getElementById('mapcard'), wide: box('gauges').width > box('gauges').height * 2.2, pedalText: box('gas') && document.getElementById('gas').textContent + document.getElementById('brake').textContent };
    });
    assert(hud.gone, 'the status panel, trail map, PARK and ENGINE are gone');
    assert(hud.dist, 'the distance to the depot shows');
    assert(hud.wide, 'three dials fit between the pedals');
    assert.equal(hud.pedalText, '', 'the pedals carry no text');
    await page.click('#pauseBtn');
    assert.equal(await page.getByRole('button', { name: /fullscreen/i }).filter({ visible: true }).count(), 0, 'no fullscreen button in the pause menu');
    assert.deepEqual(errors, []);
  } finally { await browser.close(); server.close(); }
});

test('the game loads, drives and fits every viewport', { timeout: 180000 }, async () => {
  await build();
  const html = fs.readFileSync(path.join(ROOT, 'dist/heavy-haul.html'), 'utf8');
  const server = http.createServer((req, res) => { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(html); });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true, executablePath: process.env.HAUL_CHROMIUM || undefined, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, hasTouch: true }), errors = [];
    await ownAll(page);
    page.on('pageerror', e => errors.push(e.stack || e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));   // offline
    const url = `http://127.0.0.1:${server.address().port}`;
    const ready = () => page.waitForFunction(() => window.__haul?.renderer.ready && window.__haul.renderer.frames > 2);
    const capture = async name => { fs.mkdirSync(CAPTURES, { recursive: true }); await page.screenshot({ path: path.join(CAPTURES, `${name}.png`) }); };
    const step = n => page.evaluate(n => { for (let i = 0; i < n; i++) __haul.sim.step(1 / 120); }, n);

    await page.addInitScript(() => { if (!sessionStorage.getItem('haul-seeded')) { sessionStorage.setItem('haul-seeded', '1'); localStorage.setItem('hh_wallet', '999999'); } });
    await page.goto(url, { waitUntil: 'networkidle' }); await ready();
    assert(await page.evaluate(() => Object.values(__haul.renderer.assetStatus()).every(Boolean)), 'every artwork loads offline');
    assert.match(await page.locator('#gName').innerText(), /\S/, 'garage card is filled from car.json');
    // seasons on top, then the class tabs, then the chosen class's vehicles, planned ones locked
    assert.equal(await page.locator('.g-season.on').count(), 1, 'the season being played is selected');
    assert.equal(await page.locator('.g-class').count(), 5, 'one tab per class');
    const scoutCounts = await page.evaluate(() => {
      const cars = __haul.content.roster.cars.filter(c => c.class === 'scout');
      return { playable: cars.filter(c => c.status === 'playable').length, planned: cars.filter(c => c.status !== 'playable').length };
    });
    assert.equal(await page.locator('.gtile:not(.locked)').count(), scoutCounts.playable, 'every playable scout is selectable');
    assert.equal(await page.locator('.gtile.locked').count(), scoutCounts.planned, 'only unfinished scouts remain locked');
    await page.locator('.g-class', { hasText: 'Heavy Duty' }).click();
    const heavyDutyCount = await page.evaluate(() => __haul.content.roster.cars.filter(c => c.class === 'heavy-duty' && c.status === 'playable').length);
    assert.equal(await page.locator('.gtile:not(.locked)').count(), heavyDutyCount, 'class availability follows the current roster');
    await page.locator('.g-class', { hasText: 'Scouts' }).click();
    // the buttons beside the truck step through its class, and the row over it follows
    const named = await page.locator('#gName').innerText();
    await page.click('#gNext');
    assert.notEqual(await page.locator('#gName').innerText(), named, 'next changes the truck');
    await page.click('#gPrev');
    assert.equal(await page.locator('#gName').innerText(), named, 'previous brings it back');
    assert.equal(await page.locator('.gtile.on').count(), 1, 'the row marks the chosen truck');
    await capture('00-garage');
    // tuning sits in the garage's panel: four knobs, each can go to 100 in steps of 25; the run uses the tuned car
    assert(!await page.locator('.tune').first().isVisible(), 'the upgrades stay out of the way until asked for');
    await page.click('#gMenuTune');
    assert(await page.locator('.tune').first().isVisible(), 'the knobs are on the Upgrades card');
    const stockPower = await page.evaluate(() => __haul.garage.selection.car.drivetrain.torqueScale);
    assert.deepEqual(await page.locator('.tune .tname b').allTextContents(), ['Engine', 'Suspension', 'Speed', 'Grip']);
    const engine = page.locator('.tune', { hasText: 'Engine' }), plus = row => row.locator('.tbuy');
    for (let i = 0; i < 2; i++) await plus(engine).click();
        assert.equal(await engine.locator('.tbar').getAttribute('aria-valuenow'), '50');
    for (const name of ['Suspension', 'Speed', 'Grip']) {
      const row = page.locator('.tune', { hasText: name });
      for (let i = 0; i < 4; i++) await plus(row).click();
      assert.equal(await row.locator('.tbar').getAttribute('aria-valuenow'), '100', `${name}: four taps to 100`);
      assert(await plus(row).isDisabled(), `${name} stops at 100`);
    }
    await capture('00b-tuning');
    await page.click('#tuneDone');
    // powers: one at a time, kept until another is chosen, and tapping the one that is on turns it off
    assert(!await page.locator('.power').first().isVisible(), 'the powers stay out of the way until asked for');
    await page.click('#gMenuPowers');
    await page.locator('.power', { hasText: 'Invincible' }).click();
    await page.locator('.power', { hasText: 'Instant brakes' }).click();
    assert.equal(await page.locator('.power.on').count(), 1, 'only one power is on');
    assert.equal(await page.evaluate(() => __haul.garage.selection.car.power), 'brakes', 'the run uses the chosen power');
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('hh_powers'))[__haul.garage.selection.car.id]), 'brakes', 'and it is kept');
    assert.equal(await page.evaluate(() => { const id = __haul.garage.selection.car.id, other = id === 'swamp-scout-4' ? 'mire-king-6' : 'swamp-scout-4', p = __haul.garage.select(other).car.power; __haul.garage.select(id); return p; }), undefined, 'another truck has its own, none yet');
    assert.equal(await page.evaluate(() => __haul.garage.selection.car.power), 'brakes', 'and coming back finds it still on');
    await capture('00c-powers');
    await page.locator('.power', { hasText: 'Instant brakes' }).click();
    assert.equal(await page.locator('.power.on').count(), 0, 'tapping it again turns it off');
    await page.click('#powersDone');
    assert(await page.evaluate(() => __haul.session.coins < 999999), 'upgrades cost coins');
    await page.click('#startBtn'); await page.waitForFunction(() => __haul.session.state === 'play'); await page.waitForTimeout(500);
    assert(Math.abs(await page.evaluate(() => __haul.sim.car.drivetrain.torqueScale) - stockPower * 1.75) < 1e-9, 'the run uses the tuned engine (level 50 = x1.75)');
    // the power's chip, top right: gone without a power, and up with no timer with one
    assert.equal(await page.locator('.powerchip').count(), 0, 'no power, no chip');
    assert(!await page.locator('#powerBtn').isVisible(), 'and no shield button');
    await page.evaluate(() => { __haul.sim.main.car.power = 'invincible'; }); await page.waitForTimeout(150);
    assert.equal((await page.locator('.powerchip').innerText()).replace(/\s+/g, ' ').trim(), 'Invincible: ready', 'the chip says the shield is ready');
    assert(await page.locator('#powerBtn').isVisible(), 'and the shield button shows');
    await page.locator('#powerBtn').dispatchEvent('pointerdown');
    await page.waitForTimeout(300);
    assert.match(await page.locator('.powerchip').innerText(), /Invincible:\s*\d+ s/, 'the button starts it, and the chip counts down');
    assert(await page.evaluate(() => __haul.sim.main.st.powerT > 0));
    await capture('00d-shield');
    await page.evaluate(() => { __haul.sim.main.st.powerT = 0; __haul.sim.main.st.powerCoolT = 0; });
    await page.evaluate(() => { delete __haul.sim.main.car.power; }); await page.waitForTimeout(150);
    assert(await page.evaluate(() => JSON.parse(localStorage.getItem('hh_tuning_levels'))[__haul.sim.car.id].grip === 100), 'levels saved per car');
    await page.evaluate(() => localStorage.removeItem('hh_tuning_levels'));
    await page.waitForFunction(() => !__haul.loader.visible);
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
    assert.equal(await page.evaluate(() => __haul.sim.ctl.gear), 'R', 'holding the brake stops the truck, then reverses it');

    // AWD / DIFF buttons toggle the drivetrain; the gears shift themselves
    await page.click('#awdBtn'); await page.click('#diffBtn');
    assert(await page.evaluate(() => __haul.sim.ctl.awd && __haul.sim.ctl.diff), 'AWD and DIFF buttons engage');

    // The camera uses the class's zoom from game-config.js; there is no zoom button any more.
    assert.equal(await page.locator('#cameraBtn').count(), 0, 'no zoom button');
    assert.equal(await page.evaluate(() => __haul.view.zoom), ZOOM_BY_CLASS[await page.evaluate(() => __haul.sim.car.class)], 'the class sets the zoom');
    // the steps above jump the car ahead instantly: give the camera spring real frames to catch up
    const noseInFrame = () => { const { W, ppm, cam } = __haul.view, nose = __haul.sim.truck.getWorldPoint(__haul.sim.V(__haul.sim.car.rig.nose, 0)); const x = (nose.x - cam.x) * ppm + W / 2; return x > W * 0.5 && x < W * 0.9; };
    await page.waitForFunction(noseInFrame, null, { timeout: 4000 }).catch(() => {});
    assert(await page.evaluate(noseInFrame), 'nose stays in frame');
    await capture('02-close');
    // the engine switch: off stops the truck from driving, on cranks it first; each truck has its own engine voice
    await page.waitForFunction(() => __haul.audio.mode === 'recorded');
    await page.waitForFunction(() => __haul.audio.status().voices.length > 0);
    assert.equal(await page.evaluate(() => __haul.audio.status().error), null, 'the clips in use decode offline');
    assert.deepEqual(await page.evaluate(() => __haul.audio.status().voices), ['scout'], 'the scout plays the scout engine');
    // the handbrake (no button on the HUD any more, but the sim still has it) holds the truck against the throttle
    await page.evaluate(() => __haul.handbrake());
    assert.equal(await page.evaluate(() => __haul.sim.ctl.handbrake), true, 'the handbrake is set');
    await step(240);   // the truck was still reversing from the brake check: let the locked wheels bring it to rest first
    const heldX = await page.evaluate(() => __haul.sim.truck.getPosition().x);
    await page.keyboard.down('ArrowRight'); await page.evaluate(() => { for (let i = 0; i < 240; i++) __haul.sim.step(1 / 120); }); await page.keyboard.up('ArrowRight');
    { const r = await page.evaluate(x => [__haul.sim.car.id, __haul.sim.truck.getPosition().x - x, __haul.sim.truck.getPosition().x], heldX); assert(Math.abs(r[1]) < 0.3, 'held against the throttle ' + JSON.stringify(r)); }
    await page.evaluate(() => __haul.handbrake());
    assert.equal(await page.evaluate(() => __haul.sim.ctl.handbrake), false, 'and released');
    // Engine-off means no propulsion, not immunity to gravity on the rebuilt
    // obstacle course. Check stationary behavior on the calm launch apron.
    await page.evaluate(() => { const s = __haul.sim; s.respawn(s.trail.start); for (let i = 0; i < 240; i++) s.step(1 / 120); __haul.snap(); });
    await page.evaluate(() => __haul.engine());
    assert.equal(await page.evaluate(() => __haul.sim.st.engine), 'off', 'the engine turns off');
    // on firm, level ground at the start (the drive above can end at the edge of the mud, where a
    // parked truck settles a little as its tires sink)
    const parkedX = await page.evaluate(() => { const s = __haul.sim; s.respawn(30); for (let i = 0; i < 240; i++) s.step(1 / 120); return s.truck.getPosition().x; });
    await page.keyboard.down('ArrowRight'); await page.evaluate(() => { for (let i = 0; i < 240; i++) __haul.sim.step(1 / 120); }); await page.keyboard.up('ArrowRight');
    assert(await page.evaluate(x => Math.abs(__haul.sim.truck.getPosition().x - x) < 0.3, parkedX), 'no drive with the engine off');
    await page.evaluate(() => __haul.engine());
    assert.equal(await page.evaluate(() => __haul.sim.st.engine), 'cranking', 'it starts on the starter');
    await page.waitForFunction(() => __haul.sim.st.engine === 'on');

    await page.keyboard.press('Escape'); assert.equal(await page.evaluate(() => __haul.session.state), 'pause');
    // the sound panel from the pause menu: volumes apply and are remembered
    await page.locator('#msgBtns button', { hasText: 'Sound' }).click();
    assert(await page.locator('#soundOv').isVisible(), 'the sound panel opens');
    assert.deepEqual(await page.locator('#volList label span').allTextContents(), ['Master', 'Engine', 'Music']);
    assert.equal(await page.locator('#soundOv details').count(), 0);
    for (const viewport of [{ width: 844, height: 390 }, { width: 667, height: 320 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      assert(await page.locator('#soundDone').evaluate(el => { const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }), 'Done fits on the phone without scrolling');
      assert(await page.locator('#soundOv').evaluate(el => el.scrollHeight <= el.clientHeight), 'sound panel needs no scrolling');
    }
    await page.setViewportSize({ width: 1440, height: 900 });
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
    await page.goto(url, { waitUntil: 'networkidle' }); await ready(); await page.click('#startBtn'); await page.waitForFunction(() => __haul.session.state === 'play');
    await page.evaluate(() => { const s = __haul.sim; s.respawn(s.trail.heavyMud[0] - 6); __haul.setGear('L'); __haul.setMode('awd', true); __haul.setMode('diff', true); for (let i = 0; i < 240; i++) s.step(1 / 120); __haul.snap(); });
    await page.waitForTimeout(150); await capture('03-deep-mud');
    const x0 = await page.evaluate(() => __haul.sim.main.parts.truck.getPosition().x);
    await page.click('#breakdownCallBtn');
    assert(await page.evaluate(() => __haul.sim.active.car.role === 'breakdown' && __haul.sim.active.car.class === __haul.sim.main.car.class && __haul.sim.vehicles.length === 2), 'the class\'s own breakdown truck arrives and takes control');
    assert(await page.evaluate(() => __haul.sim.truck.getPosition().x < __haul.sim.trail.start + 30), 'it starts at the beginning of the trail');
    await page.evaluate(() => { __haul.sim.main.car = { ...__haul.sim.main.car, power: 'invincible' }; });
    await page.waitForFunction(() => document.getElementById('powerBtn').disabled);
    await page.keyboard.press('KeyS');
    assert.equal(await page.evaluate(() => __haul.sim.main.st.powerT), 0, 'service driving blocks the power shortcut');
    assert(await page.locator('#powerBtn').isDisabled(), 'the service truck power button is disabled');
    assert(await page.locator('#breakdownCallBtn').evaluate(e => e.classList.contains('called')), 'its button now switches to it');
    await page.waitForTimeout(100); await capture('03a-called-at-start');
    // drive it out to the stuck truck: it never runs dry and never gets stuck
    await page.evaluate(() => { const s = __haul.sim; __haul.setGear('L'); for (let i = 0; i < 120 * 90 && s.nearestHook().d > s.winchReach - 1.5; i++) { s.ctl.gas = 1; s.step(1 / 120); } s.ctl.gas = 0; s.ctl.handbrake = true; for (let i = 0; i < 60; i++) s.step(1 / 120); __haul.snap(); });
    assert(await page.evaluate(() => __haul.sim.nearestHook().d <= __haul.sim.winchReach), 'driven out to within hook reach');
    assert.equal(await page.evaluate(() => __haul.sim.active.st.fuel), 100, 'service trucks never burn fuel');
    await page.waitForTimeout(100); await capture('03b-unlimited-fuel');
    assert(await page.locator('#winch').isVisible(), 'the winch button shows for the service truck');
    // tap WINCH, then reverse away to tow the truck back out of the pit
    await page.click('#winch');
    assert(await page.evaluate(() => !!__haul.sim.cable() && __haul.sim.cable().target === __haul.sim.main), 'tapping WINCH hooks the stuck truck');
    assert(await page.locator('#winch').getAttribute('aria-pressed') === 'true' || await page.evaluate(() => !!__haul.sim.cable()));
    await page.evaluate(() => { const s = __haul.sim; s.ctl.handbrake = false; __haul.setGear('R'); for (let i = 0; i < 120 * 6; i++) { s.ctl.brake = 1; s.step(1 / 120); } s.ctl.brake = 0; __haul.snap(); });
    await page.waitForTimeout(200); await capture('03b-winch');
    assert(await page.evaluate(x => __haul.sim.main.parts.truck.getPosition().x < x - 1.5, x0), 'driving the breakdown truck away tows the stuck truck');
    await page.keyboard.press('KeyW');
    assert(await page.evaluate(() => !__haul.sim.cable()), 'W unhooks');
    await page.click('#switchBtn');
    assert(await page.evaluate(() => __haul.sim.active.role === 'main' && __haul.sim.vehicles.length === 2), 'the switch button returns to the main truck; the breakdown truck stays parked');

    // A station refuels and repairs a truck stopped in its bay, and only then
    await page.evaluate(() => { const s = __haul.sim; __haul.drive(s.main); const st = s.terrain.stations[0]; s.respawn(st.x); s.main.st.fuel = 25; s.main.st.damage = 50; s.ctl.gas = 0; __haul.snap(); });
    await page.waitForFunction(() => __haul.sim.main.st.filling);
    await page.waitForFunction(() => __haul.sim.main.st.fuel > 60 && __haul.sim.main.st.damage < 40);
    assert(await page.locator('.dmgrow.healing').count() === 1, 'the damage bar glows green while it is repaired');
    assert(await page.locator('#actionBtn').isHidden(), 'no refuelling popup');
    assert.equal(await page.locator('#toast.on').innerText(), 'Fueling and healing...', 'a plain hint says it is filling');
    await capture('03c-fuel-station');
    // the speed camera: passing it shows the truck's top speed on a card that fades, and the game carries on
    await page.evaluate(() => { const s = __haul.sim; __haul.trap.reset(); s.respawn(__haul.trap.xs[0] - 15); s.main.st.fuel = 100; s.main.parts.truck.setLinearVelocity({ x: 15, y: 0 }); s.ctl.gas = 1; __haul.snap(); });
    await page.waitForFunction(() => !document.getElementById('trap').hidden, null, { timeout: 15000 });
    assert(Number(await page.locator('#trapNum').innerText()) > 0, 'it shows the speed');
    assert.equal(await page.evaluate(() => __haul.view.canvas.style.transform), '', 'the view stays as it is');
    await capture('03d-speed-camera');
    const framesAtCard = await page.evaluate(() => __haul.renderer.frames);
    await page.waitForFunction(() => document.getElementById('trap').hidden, null, { timeout: 60000 });
    assert((await page.evaluate(() => __haul.renderer.frames)) > framesAtCard, 'the game keeps running');
    await page.evaluate(() => { const s = __haul.sim; s.ctl.gas = 0; s.respawn(s.terrain.stations[0].x); __haul.snap(); });
    await page.waitForFunction(() => __haul.sim.main.st.fuel > 99.9 && __haul.sim.main.st.damage === 0);
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
    const rutX = await page.evaluate(() => __haul.sim.main.parts.wheels[0].getPosition().x);   // under a tire: deep mud may barely let the truck roll
    assert(await page.evaluate(x => __haul.renderer.rutAt(x) > 0.3, rutX), 'the ruts are deep in the bog');
    await capture('08-bog-splash');
    await page.evaluate(() => {
      const s = __haul.sim; s.respawn(380);
      for (let i = 0; i < 120; i++) s.step(1 / 120); __haul.snap();
    });
    await capture('09-old-river-bog');
    // a minute later and somewhere else, the ruts are still where they were left
    await page.evaluate(() => { for (let i = 0; i < 120 * 60; i++) __haul.sim.step(1 / 120); for (let f = 0; f < 30; f++) __haul.renderer.draw(1 / 60, true); });
    assert(await page.evaluate(x => __haul.renderer.rutAt(x) > 0.3, rutX), 'ruts persist through the run');
    await page.evaluate(() => { __haul.startRun(__haul.garage.selection); __haul.renderer.draw(1 / 60, true); });
    assert.equal(await page.evaluate(() => __haul.renderer.mudTracks), 0, 'a restarted run clears old mud impressions');
    // an off-road truck gets its own class's service trucks
    await page.evaluate(() => { __haul.garage.select('mire-king-6'); __haul.startRun(__haul.garage.selection); });
    await page.waitForFunction(() => __haul.sim.main.st.engine === 'on');
    await page.evaluate(() => { __haul.sim.respawn(30); for (let i = 0; i < 120; i++) __haul.sim.step(1 / 120); __haul.snap(); });
    await capture('10-mire-king');
    await page.click('#breakdownCallBtn');
    assert(await page.evaluate(() => __haul.sim.active.car.id === 'bog-wrecker'), 'the Mire King gets the off-road Bog Wrecker');
    await page.waitForTimeout(150); await capture('10c-bog-wrecker');
    await page.evaluate(() => { __haul.garage.select('swamp-scout-4'); });

    // phone landscape: pedals leave the tire contact visible; portrait: controls fit
    await page.goto(url, { waitUntil: 'networkidle' }); await ready(); await page.click('#startBtn'); await page.waitForFunction(() => __haul.session.state === 'play'); await page.waitForTimeout(400);
    await page.setViewportSize({ width: 844, height: 390 }); await page.waitForTimeout(200);
    const groundY = await page.evaluate(() => { const { H, ppm, cam } = __haul.view; return H / 2 - (__haul.sim.visH(__haul.sim.truck.getPosition().x) - cam.y) * ppm; });
    assert(groundY < (await page.locator('#gas').boundingBox()).y + 4, 'phone pedals leave tire contact visible');
    await capture('06-phone');
    await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(100);
    for (const id of ['#pauseBtn', '#gas', '#brake']) { const b = await page.locator(id).boundingBox(); assert(b.x >= 0 && b.x + b.width <= 391, `${id} fits portrait`); }
    await capture('07-portrait');
    // a service truck never brings the camera closer than its class's zoom (a taller one eases out), and
    // back in the main truck the zoom is the class's again
    await page.setViewportSize({ width: 844, height: 390 });
    const scoutZoom = await page.evaluate(() => __haul.view.zoom);
    await page.evaluate(() => __haul.summon('breakdown'));
    assert(await page.evaluate(() => __haul.view.zoom) >= scoutZoom, 'the breakdown truck is framed at least as wide as the main truck');
    await page.evaluate(() => __haul.switchVehicle());
    assert.equal(await page.evaluate(() => __haul.view.zoom), scoutZoom, 'back in the scout, the zoom is unchanged');
    // Newly delivered heavy-duty trucks are selectable and run on the current map.
    for (const id of ['fieldmaster-5', 'stonebridge-6', 'bushline-9', 'rangeline-10', 'northgate-11',
      'quarryman-13', 'timberjack-14', 'bedrock-15', 'boulder-boss-16', 'logger-king-17',
      'prime-mover-1', 'titan-2', 'goliath-3', 'mammoth-4', 'colossus-5', 'bulwark-6',
      'juggernaut-7', 'atlas-8', 'behemoth-9', 'leviathan-10']) {
      await page.evaluate(id => {
        __haul.garage.select(id); __haul.startRun(__haul.garage.selection);
      }, id);
      await page.waitForFunction(() => __haul.renderer.ready && Object.values(__haul.renderer.assetStatus()).every(Boolean));
      const distance = await page.evaluate(() => {
        const s = __haul.sim; s.respawn(30);
        Object.assign(s.ctl, { gear: 'L', awd: true, diff: true });
        for (let i = 0; i < 480; i++) s.step(1 / 120);
        const x = s.truck.getPosition().x; s.ctl.gas = 1;
        for (let i = 0; i < 1200; i++) s.step(1 / 120);
        s.ctl.gas = 0; __haul.snap();
        return s.truck.getPosition().x - x;
      });
      assert(distance > 5, `${id} drives on the map`);
      for (const [width, height, label] of [[1440, 900, 'desktop'], [844, 390, 'phone']]) {
        await page.setViewportSize({ width, height });
        await page.evaluate(() => { __haul.sim.respawn(30); __haul.snap(); });
        await page.waitForTimeout(150);
        const fits = await page.evaluate(() => {
          const { sim: s, view: v } = __haul, r = s.car.rig;
          const left = r.nose - s.car.physics.size[0];
          const xs = [left, r.nose].map(x => {
            const p = s.truck.getWorldPoint(s.V(x, 0));
            return (p.x - v.cam.x) * v.ppm + v.W / 2;
          });
          return xs[0] >= 0 && xs[1] <= v.W;
        });
        assert(fits, `${id} fits ${label}`);
        await capture(`new-cars/${id}-${label}`);
      }
    }
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
      for (const key of ['ground', 'roadEdge', 'roadFar']) {
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
            images, season: { render }, worldMatrix: matrix, sim: { visH, terrain: { zones: [] } }, cache: { deepPat: pattern, lanePat: {} } });
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

test('ranks: a fresh garage owns only the starters, shows the rank a truck needs, then its price, and buys it', { timeout: 120000 }, async () => {
  await build();
  const code = (await releaseCode('src/main.js', 'iife')).replace(/<\/script/gi, '<\\/script');
  const html = fs.readFileSync(path.join(ROOT, 'dist/heavy-haul.html'), 'utf8').replace(/<script>[\s\S]*?<\/script>/, () => `<script>${code}</script>`);
  const server = http.createServer((req, res) => { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(html); });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true, executablePath: process.env.HAUL_CHROMIUM || undefined, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }), errors = [];
    page.on('pageerror', e => errors.push(e.stack || e.message));
    await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    await page.goto(`http://127.0.0.1:${server.address().port}`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__haul?.renderer.ready);
    await page.evaluate(() => { __haul.loader.hide(0); document.getElementById('garage').hidden = false; });
    const p = () => page.evaluate(() => ({ rank: __haul.progress.rank, xp: __haul.progress.xp }));
    assert.deepEqual(await p(), { rank: 1, xp: 0 }, 'a new player starts at rank 1');
    assert.equal(await page.evaluate(() => __haul.session.coins), 20000, 'fresh production player starts with 20,000 coins');
    assert.equal(await page.evaluate(() => __haul.content.roster.cars.filter(c => __haul.progress.owns(c.id)).length), 5, 'only the five free starters are owned');
    const starter = await page.evaluate(() => __haul.content.roster.cars.find(c => c.class === 'scout' && c.unlockRank === 1).id);
    const next = await page.evaluate(() => __haul.content.roster.cars.find(c => c.class === 'scout' && c.unlockRank === 2));
    assert(await page.evaluate(id => __haul.progress.owns(id), starter), 'the weakest scout is owned');
    await page.evaluate(id => __haul.garage.select(id), next.id);
    assert.match(await page.locator('#startBtn').innerText(), /requires rank 2/i, 'a locked truck says the rank it needs');
    assert(await page.locator('#startBtn').isDisabled());
    assert.match(await page.locator('.gtile.on').innerText(), /rank 2/i, 'and so does its tile');
    await page.evaluate(price => { __haul.progress.addXp(250); __haul.session.earn(price * 2, true); __haul.garage.show(); }, next.price);
    assert.equal((await p()).rank, 2, 'XP brings rank 2');
    assert.match(await page.locator('#startBtn').innerText(), /buy/i, 'now it can be bought');
    assert.match(await page.locator('.gtile.on').innerText(), new RegExp(formatCoins(next.price).replace('.', '\\.')), 'its tile shows the price');
    const coins = await page.evaluate(() => __haul.session.coins);
    await page.click('#startBtn');
    assert(await page.evaluate(id => __haul.progress.owns(id), next.id), 'bought');
    assert.equal(await page.evaluate(() => __haul.session.coins), coins - next.price, 'for its price');
    assert.match(await page.locator('#startBtn').innerText(), /drive/i, 'and it drives');
    assert.match(await page.locator('#gRankNum').innerText(), /rank 2/i, 'the garage shows the rank');
    // missions: the card offers some, one can be chosen, and the menu says which
    await page.click('#gMenuMissions');
    assert.equal(await page.locator('#missionList .power').count(), 4, 'four missions on offer');
    await page.locator('#missionList .power').nth(1).click();
    assert.equal(await page.locator('#missionList .power.on').count(), 1, 'one chosen');
    await page.screenshot({ path: path.join(CAPTURES, '00f-missions.png') });
    await page.click('#missionsDone');
    assert.notEqual(await page.locator('#gMissionOn').innerText(), 'None', 'the menu names the chosen mission');
    await page.screenshot({ path: path.join(CAPTURES, '00e-ranks.png') });
    assert.deepEqual(errors, []);
  } finally { await browser.close(); server.close(); }
});
