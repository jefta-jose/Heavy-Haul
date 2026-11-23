import * as planck from 'planck';
import content from 'virtual:content';
import { createSimulation } from './physics/simulation.js';
import { createRenderer } from './render/renderer.js';
import { createVehicleAudio } from './audio/vehicle-audio.js';
import { createView, zoomFor } from './game/view.js';
import { createInput } from './game/input.js';
import { createHud } from './game/hud.js';
import { createSession } from './game/session.js';
import { createGarage } from './game/garage.js';
import { createProgress } from './game/progress.js';
import { createMissions } from './game/missions.js';
import { createAccount } from './game/account.js';
import { createMusic } from './audio/music.js';
import { createLoader } from './game/loader.js';
import { COINS_PER_CRUSH, FREE_SEASONS } from './game-config.js';
import { createSoundSettings } from './game/sound-settings.js';
import { createInterpolation } from './game/interpolate.js';
import { createHaptics } from './game/haptics.js';
import { createUiAudio, bindUiFeedback } from './audio/ui-audio.js';
import { createSpeedTrap } from './game/speed-trap.js';
import { seasonPass } from './game/season-pass.js';

// Entry point: the garage picks a car (its load is part of it); a run builds the world with that
// car and drives the fixed-step game loop.
// Content comes from tools/build.js: the JSON is on the page, the artwork and audio are data URIs in
// the one-file build and relative file paths in the app build.

// The season: the one picked in the garage (remembered on this device), else the build's default.
// Every playable season is in the build; shared art is stored once in content.seasonAssets.
// A map not owned (one bought on another save, or before maps cost coins) falls back to the default, or the first free one.
{
  let pick = null; try { pick = localStorage.getItem('haul.season'); } catch (e) {}
  const all = (content.playableSeasons ?? []).filter(x => seasonPass.owns(x.season.id));
  const s = all.find(x => x.season.id === pick) ?? all.find(x => x.season.id === content.season.id) ?? all[0];
  if (s) Object.assign(content, { season: s.season, rockHulls: s.rockHulls, seasonArt: Object.fromEntries(Object.entries(s.art).map(([k, f]) => [k, content.seasonAssets[f]])) });
}
const { rockHulls, wheelTypes } = content;
// The season the HUD, session, missions and cameras read: it always forwards to content.season, so a map
// switch in the garage (switchSeason) swaps the map in place, without a reload, and the music plays on.
const forward = get => new Proxy({}, {
  get: (_, k) => get()[k], has: (_, k) => k in get(), ownKeys: () => Reflect.ownKeys(get()),
  getOwnPropertyDescriptor: (_, k) => { const d = Reflect.getOwnPropertyDescriptor(get(), k); return d && { ...d, configurable: true }; },
});
const liveTrail = forward(() => content.season.trail);
const season = new Proxy(forward(() => content.season), { get: (t, k) => k === 'trail' ? liveTrail : content.season[k] });
const ambience = [...(content.season.ambience ?? [])];   // the audio reads this list live
const loader = createLoader(content.loaderText, { title: season.name, subtitle: season.place ?? '' });
const sim = createSimulation(planck, { season: content.season, rockHulls, wheelTypes });
// every step first records the state it starts from, so frames can be drawn between steps
const interp = createInterpolation(sim, (x, y) => new planck.Vec2(x, y));
{ const step = sim.step; sim.step = dt => { interp.capture(); step(dt); }; }
const view = createView(document.getElementById('view'), sim);
const audio = createVehicleAudio({ clips: content.audio, bank: content.soundBank, ambience });
const haptics = createHaptics();
const uiAudio = createUiAudio({ clips: content.uiSounds, volumes: audio.volumes });
bindUiFeedback({ audio: uiAudio, haptics });
// hard hits felt in the hand as well as heard (the audio detects them from the suspension)
{ const bump = audio.bump; audio.bump = (strength, massT) => { haptics.hit(strength); bump(strength, massT); }; }
const music = createMusic(content.music, audio.volumes);
music.play('garage');
{ const set = audio.setVolume; audio.setVolume = (kind, value) => { set(kind, value); music.apply(); uiAudio.apply(); }; }
const hud = createHud({ sim, season });
const renderer = createRenderer({
  view, sim, content,
  onEvent: e => {
    if (e.type === 'splash') audio.splash(e.power);
    else if (e.type === 'crush') { audio.crush(e.size); haptics.hit(Math.min(1, e.size)); if (session.state === 'play') { session.earn(COINS_PER_CRUSH, true); session.crushed(); } }
    else if (e.type === 'hit' && e.tires === sim.main.tireData) audio.hit();
    else if (e.type === 'damage') { renderer.hitGlow(); if (e.amount > 0) audio.bump(Math.min(1, 0.4 + e.amount / 20), sim.main.car.physics.mass / 1000); }
  },
});
renderer.onLightning = () => audio.thunder();   // the rumble follows the flash
// the player's Google account (Play Games): signed in at start-up in the Android app; the garage chip shows who, or offers to sign in
const account = createAccount();
{
  const chip = document.getElementById('garageAccountBtn');
  const show = player => { chip.hidden = !account.available; chip.textContent = player ? player.name : 'Sign in'; chip.title = player ? `Signed in with Google Play Games as ${player.name}` : 'Sign in with Google Play Games'; };
  account.onChange(show);
  chip.addEventListener('click', () => { if (!account.player) account.signIn(); });
  account.init();
}
const progress = createProgress(content.roster.cars);   // rank, XP and the trucks owned
// contracts are sized to the trail being played and the trucks owned
// A map picked in the garage is only swapped in when PLAY is pressed, but contracts are drawn for it at once, so the one chosen
// next fits the map it will be driven on (pendingSeason).
let switchingSeason = false, pendingSeason = null;
const missionSeason = () => (pendingSeason && content.playableSeasons?.find(x => x.season.id === pendingSeason)?.season) || content.season;
// every truck (with its biomes, for its signature haul's home map) and every playable map
const missionCars = content.roster.cars.filter(r => content.cars.some(c => c.id === r.id)).map(r => ({ ...r, biomes: content.cars.find(c => c.id === r.id)?.biomes ?? [] }));
const missionMaps = (content.playableSeasons ?? []).map(x => ({ id: x.season.id, name: x.season.name, free: FREE_SEASONS.includes(x.season.id) }));
const missions = createMissions(content.missions, { classes: content.roster.classes, trail: forward(() => missionSeason().trail), mapId: () => missionSeason().id, owned: () => content.roster.cars.filter(c => progress.owns(c.id)), cars: () => missionCars, maps: () => missionMaps });
const garage = createGarage({
  content, progress, missions,
  onSelect: car => audio.prepare([car]),
  onStart: selection => driveOff(selection),
  onBuy: () => { haptics.tick(); uiAudio.play('ui-buy'); },
  onSeason: id => {
    pendingSeason = id; try { localStorage.setItem('haul.season', id); } catch (e) {}
    missions.mapChanged();
  },
});
const session = createSession({ sim, hud, season, progress, missions, onRestart: () => newRun(), onGarage: () => backToGarage(), onRankUp: () => haptics.rankUp(), onSuccess: () => uiAudio.play('mission-complete'), onFailure: () => uiAudio.play('mission-failed') });
session.onResume = () => audio.resume();

let selection = garage.selection;
const startAudio = () => audio.start();
// the sound panel goes back to the pause menu it was opened from
const sound = createSoundSettings({ audio, uiAudio, onClose: () => { if (session.state === 'pause') showPause(); } });
function setGear(g) { if (g !== sim.ctl.gear && session.state === 'play') { audio.shift(g); haptics.tick(); } sim.ctl.gear = g; hud.showGear(g); }
function setMode(key, on) {
  if (session.state !== 'play') return;
  sim.ctl[key] = on; hud.showMode(key, on);
  renderer.flash(on); audio.clunk(on); haptics.toggle();
  hud.hint(`${key}-${on}`, key === 'awd' ? (on ? 'AWD on: every axle driven' : 'AWD off: front axle free-wheels') : (on ? 'Diff lock on: all wheels turn together' : 'Diff lock off'), 1.6);
}
// the pause menu also carries what the phone HUD leaves out: the truck's details and fullscreen
// the Android app is always fullscreen (MainActivity), and its WebView refuses the browser's fullscreen
const IN_APP = !!window.Capacitor?.isNativePlatform?.();
if (IN_APP) document.getElementById('fsBtn').hidden = true;
const showPause = () => {
  const spec = hud.pauseSpec();
  const buttons = IN_APP ? [] : [[document.fullscreenElement ? 'Exit fullscreen' : 'Fullscreen', () => { goFullscreen(); session.resume(); }]];
  session.pause(() => { hud.hideMessage(); sound.open(); }, { spec, buttons });
};
function pause() {
  if (sound.isOpen) return;
  if (session.state === 'play') showPause();
  else if (session.state === 'pause') session.resume();
}
function resize() { view.resize(); hud.resizeGauges(view.DPR); }

// the truck on screen: camera zoom, card and drive buttons follow it
function drive(v) {
  Object.assign(v.ctl, { gas: 0, brake: 0 });
  view.setZoom(zoomFor(v.car)); hud.setCar(v.car); hud.showGear(v.ctl.gear); hud.showHandbrake(v.ctl.handbrake); hud.showMode('awd', v.ctl.awd); hud.showMode('diff', v.ctl.diff);
  view.snap();
}
// the engine switch: start it (the starter cranks first) or shut it down
function engine() {
  if (session.state !== 'play') return;
  const v = sim.main;
  if (v.st.engine === 'off') {
    if (v.st.fuel <= 0) { hud.toast('The tank is empty.', 2.5); return; }
    audio.key(); sim.startEngine(v); hud.hint('engine-on', `Starting the ${v.car.name}…`, 1.2);
  } else { audio.key(); sim.stopEngine(v); hud.hint('engine-off', 'Engine off', 1.2); }
}
// the handbrake: holds every wheel; a ratchet on scouts, an air hiss on trucks
function handbrake() {
  if (session.state !== 'play') return;
  const v = sim.main, on = !v.ctl.handbrake;
  v.ctl.handbrake = on; audio.handbrake(on, v.car); hud.showHandbrake(on);
  hud.hint(`handbrake-${on}`, on ? 'Handbrake on' : 'Handbrake off', 1.2);
}
const trap = createSpeedTrap({ sim, trail: liveTrail, onCapture: kmh => { haptics.hit(0.6); session.cameraSpeed(kmh); } });
const input = createInput(hud.els, {
  toggle: k => setMode(k, !sim.ctl[k]), pause, engine, handbrake, usePower: () => { if (session.state === 'play' && sim.usePower()) haptics.toggle(); }, onAnyInput: startAudio,
});

function newRun() {
  sim.init(sim.trail.start, selection); session.reset(); trap.reset(); hud.resetTrip();
  drive(sim.main);
  sim.ctl.auto = true; setGear('L'); sim.ctl.awd = false; sim.ctl.diff = false; hud.showMode('awd', false); hud.showMode('diff', false);
  view.snap(); hud.setCardVisible(true); hud.showAction(null);
  if (selection.car.load) hud.toast(`Deliver the ${selection.car.load.name.toLowerCase()} to the depot`, 3);
}
// a run starts with the engine off and the starter cranking, like turning the key
function prepareRun(sel) { selection = sel; garage.hide(); newRun(); }
function goRun() { music.play('drive'); session.state = 'play'; sim.stopEngine(sim.main); sim.startEngine(sim.main); }
function startRun(sel) { startAudio(); prepareRun(sel); goRun(); }
function openGarage() { trap.reset(); renderer.clearTracks(); session.state = 'garage'; audio.suspend(); garage.show(); music.play('garage'); }

// ---------- loading screens: the heavy work happens behind them, and the bar reports it ----------
const until = (test, ms) => new Promise(r => { const t0 = performance.now(); const poll = () => test() || performance.now() - t0 > ms ? r() : requestAnimationFrame(poll); poll(); });
const decoded = (urls, ms = 3000) => Promise.race([Promise.all(urls.filter(Boolean).map(u => { const i = new Image(); i.src = u; return i.decode?.().catch(() => {}); })), new Promise(r => setTimeout(r, ms))]);
const framesDrawn = n => { const to = renderer.frames + n; return until(() => renderer.frames >= to, 8000); };
let loading = false;
// what the loading screen says about the run ahead, from the truck and the trail themselves
// the line under the place's name after DRIVE: the truck, its load and the trail
function runLine(car) {
  const r = content.roster.cars.find(c => c.id === car.id) ?? {}, load = car.load ?? r.load;
  return [car.name, load?.name, `${((season.trail.depot - season.trail.start) / 1000).toFixed(1)} km to the depot`].filter(Boolean).join('  ·  ');
}
async function driveOff(sel) {
  if (loading) return; loading = true;
  // whatever goes wrong behind the screen, it always lifts and taps work again (a stuck `loading` froze PLAY for good)
  try {
    startAudio();   // inside the tap, or the phone will not play it
    if (pendingSeason && pendingSeason !== content.season.id) loader.setPlace(content.playableSeasons.find(x => x.season.id === pendingSeason)?.season.name ?? season.name, '');
    loader.show('drive', { sub: runLine(sel.car) }); await loader.painted();
    // a map picked in the garage is swapped in here, behind the loading screen that shows anyway (2026-11-18): picking is instant
    if (pendingSeason && pendingSeason !== content.season.id) await switchSeason(pendingSeason, { quiet: true });
    pendingSeason = null;
    if (garage.seasonId !== content.season.id) garage.seasonChanged();   // a switch that did not happen must not leave the garage thinking it did
    prepareRun(sel);
    await until(() => renderer.ready, 15000);
    await framesDrawn(2);   // the first frames build the sprites for this truck's zoom
    goRun();
  } catch (e) { console.error(e); } finally { loading = false; }
  loader.hide();
}
async function backToGarage() {
  if (loading) return; loading = true;
  try {
    loader.show('garage', { sub: 'Back to the garage' }); await loader.painted();
    openGarage();
    await decoded([selection.car.artUri?.master, content.hud['garage-bay']]);
  } catch (e) { console.error(e); }
  await loader.hide();
  loading = false;
}
// Launch waits for artwork and the first frames, then decodes the garage art.
let launching = true;
const launchStarted = performance.now();
function launchProgress() {
  // a failed image must not hold the game behind the screen for ever
  if (!(renderer.ready && renderer.frames > 2) && performance.now() - launchStarted < 20000) return;
  launching = false;
  decoded([selection.car.artUri?.master, content.hud['garage-bay']]).then(() => loader.hide());
}
// Another map: swapped in place, no reload, so the music never stops. From the garage it happens behind the drive loading
// screen (driveOff, `quiet`); called on its own (tests) it shows the turning gears until the new art is ready.
async function switchSeason(id, { quiet = false } = {}) {
  const next = content.playableSeasons?.find(x => x.season.id === id);
  if (!next || id === content.season.id || switchingSeason || (loading && !quiet)) return;
  switchingSeason = true;
  try {
    try { localStorage.setItem('haul.season', id); } catch (e) {}
    if (!quiet) {
      hud.busy(true, `Heading to ${next.season.name}`);
      await new Promise(r => setTimeout(() => requestAnimationFrame(() => requestAnimationFrame(r)), 180));   // the gears are up first
    }
    Object.assign(content, { season: next.season, rockHulls: next.rockHulls, seasonArt: Object.fromEntries(Object.entries(next.art).map(([k, f]) => [k, content.seasonAssets[f]])) });
    sim.setSeason(next.season, next.rockHulls);
    const art = renderer.setSeason();
    ambience.splice(0, ambience.length, ...(next.season.ambience ?? []));
    loader.setPlace(next.season.name, next.season.place ?? '');
    sim.init(sim.trail.start, selection); view.snap(); trap.reset(); session.reset();
    missions.mapChanged();   // fresh offers sized to this trail
    garage.seasonChanged();
    await Promise.race([art, new Promise(r => setTimeout(r, 15000))]);
    if (!quiet) await framesDrawn(2);
  } finally { if (!quiet) hud.busy(false); switchingSeason = false; }   // a failed switch must not block every later one
}

async function goFullscreen() {
  const el = document.documentElement;
  try {
    if (document.fullscreenElement) { await document.exitFullscreen(); return; }
    if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    try { await screen.orientation.lock('landscape'); } catch (e) {}
  } catch (e) { hud.toast('Fullscreen is blocked here. Add the page to your home screen instead.', 3.5); }
}

const E = hud.els;
E.fsBtn.addEventListener('click', goFullscreen);
E.awdBtn.addEventListener('click', () => setMode('awd', !sim.ctl.awd));
E.diffBtn.addEventListener('click', () => setMode('diff', !sim.ctl.diff));
E.pauseBtn.addEventListener('click', pause);
document.getElementById('garageSoundBtn').addEventListener('click', () => sound.open());
// Reset saved game, always shown (user, 2026-11-22). Wipes every saved key, then blocks writes so pagehide cannot save the old coins and XP back before the reload.
let resetting = false;
const resetBtn = document.getElementById('garageResetBtn');
resetBtn.hidden = false;
// Confirmed by a second tap within 3 s rather than confirm(): native dialogs are unreliable in phone WebViews.
let resetArmed = 0;
resetBtn.addEventListener('click', () => {
  if (!resetArmed) {
    resetBtn.textContent = 'SURE?'; resetBtn.classList.add('armed'); resetBtn.title = 'Tap again to clear coins, rank, trucks, upgrades, missions and settings';
    resetArmed = setTimeout(() => { resetArmed = 0; resetBtn.textContent = 'RESET'; resetBtn.classList.remove('armed'); resetBtn.title = 'Reset saved game (testing)'; }, 3000);
    return;
  }
  clearTimeout(resetArmed);
  // Assigning localStorage.setItem only stores an item called "setItem" (Storage's named setter), so writes are blocked on the
  // prototype instead, and the pagehide / visibilitychange saves below are skipped.
  resetting = true;
  try { Storage.prototype.setItem = function () {}; localStorage.clear(); sessionStorage.clear(); } catch (e) {}
  location.reload();
});
document.addEventListener('visibilitychange', () => { if (!document.hidden || resetting) return; if (session.state === 'play') pause(); session.persist(); });
window.addEventListener('pagehide', () => { if (!resetting) session.persist(); });   // the app or tab closing: the last coins and XP are kept
window.addEventListener('resize', resize);

// ---------- loop ----------
// Physics runs at a fixed 120 Hz; rendering follows the display, drawn between steps (interpolate.js). If frames run long for a few
// seconds the canvas resolution steps down, and after a long steady spell it climbs back. Start-up frames are slow while art caches build, so
// adaptation waits 5 s, and the resize happens before drawing (resizing clears the canvas).
const DT = 1 / 120, TOUCH = matchMedia('(pointer: coarse)').matches;
const MIN_QUALITY = TOUCH ? 0.8 : 0.6;   // a phone stays this sharp even if it can't hold 50 fps
let last = performance.now(), acc = 0, slowT = 0, frameAvg = 1 / 60, pendingResize = false;
// a climb that soon has to step down again means this phone can't hold it: wait twice as long next time
let steadyT = 0, climbAfter = 20, climbedAt = -Infinity;
function adapt(dt) {
  if (session.state !== 'play' || session.run.time < 5) { frameAvg = 1 / 60; slowT = 0; steadyT = 0; return; }
  frameAvg += (dt - frameAvg) * 0.05;
  // touch devices step down sooner (under 50 fps for 2 s), so a phone holds 60 fps rather than ~40
  const slow = TOUCH ? 1 / 50 : 1 / 40;
  slowT = frameAvg > slow ? slowT + dt : Math.max(0, slowT - dt);
  steadyT = frameAvg < 1 / 55 ? steadyT + dt : 0;
  if (slowT > (TOUCH ? 2 : 3) && view.quality > MIN_QUALITY) {
    if (performance.now() - climbedAt < 30000) climbAfter *= 2;
    view.quality = Math.max(MIN_QUALITY, view.quality - 0.15); slowT = steadyT = 0; frameAvg = 1 / 60; pendingResize = true;
  } else if (steadyT > climbAfter && view.quality < 1) {
    view.quality = Math.min(1, view.quality + 0.1); steadyT = 0; climbedAt = performance.now(); pendingResize = true;
  }
}
let lastGear = 'L';
function frame(now) {
  const dt = Math.min(8 * DT, (now - last) / 1000); last = now;   // at most the 8 physics steps a frame may run
  if (launching) launchProgress();
  if (pendingResize) {   // only the pixel count changes, so the camera stays where it is
    pendingResize = false;
    const { x, y, vx, vy } = view.cam; resize(); Object.assign(view.cam, { x, y, vx, vy });
  }
  const playing = session.state === 'play';
  // Behind the drive loading screen ("Tap to continue") the truck settles and the starter cranks, but the run itself waits:
  // no clock, rewards, speed cameras or pedals until the screen is gone, or timed contracts lost seconds the player never saw.
  const covered = loader.visible;
  if (playing) {
    const held = covered ? { gas: 0, brake: 0 } : input.read();
    sim.ctl.gas = Number(held.gas);   // retain analog pedal position
    if (held.gas && sim.st.engine === 'off' && !hud.toastActive) hud.toast(sim.st.fuel > 0 ? 'The engine is wrecked.' : 'The tank is empty.', 2);
    sim.ctl.brake = Number(held.brake);
    hud.showPedals(held);
    const fuel0 = sim.main.st.fuel;
    if (!covered) trap.update(dt);
    acc += dt; let n = 0;
    while (acc >= DT && n < 8) { sim.step(DT); acc -= DT; n++; }
    session.run.fuelUsed += Math.max(0, fuel0 - sim.main.st.fuel);
    if (fuel0 >= 15 && sim.main.st.fuel < 15) haptics.warn();   // the tank is getting low
    if (!covered) session.update(dt);
    hud.showFilling(sim.main.st.filling);
    if (sim.ctl.gear !== lastGear) { audio.shift(sim.ctl.gear); haptics.tick(); lastGear = sim.ctl.gear; hud.showGear(lastGear); }
  } else acc = 0;
  interp.apply(playing ? acc / DT : 1);   // drawn between the last two steps; see interpolate.js
  try { view.follow(dt); renderer.draw(dt, playing); } finally { interp.restore(); }
  hud.update(dt, { coins: session.coins, run: session.run, playing: playing && !covered });
  audio.update({ playing: session.state === 'play', vehicles: sim.vehicles, active: sim.main, water: renderer.water, camX: view.cam.x, refueling: sim.main.st.filling }, dt);
  adapt(dt);
  requestAnimationFrame(frame);
}

// test hook: the browser tests read the live game through this handle
window.__haul = { account, missions, progress, trap, music, sim, view, renderer, session, audio, uiAudio, sound, garage, content, loader, drive, setGear, setMode, engine, handbrake, startRun, switchSeason, snap: () => view.snap() };

// the garage scene behind the menu: the default car parked at the start
sim.init(sim.trail.start, selection);
hud.setCar(selection.car);
resize();
for (let i = 0; i < 90; i++) sim.step(DT);
requestAnimationFrame(frame);
