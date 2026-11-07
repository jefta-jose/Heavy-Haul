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
import { createMusic } from './audio/music.js';
import { createLoader } from './game/loader.js';
import { COINS_PER_CRUSH } from './game-config.js';
import { createSoundSettings } from './game/sound-settings.js';
import { createInterpolation } from './game/interpolate.js';
import { createHaptics } from './game/haptics.js';
import { createUiAudio, bindUiFeedback } from './audio/ui-audio.js';
import { createSpeedTrap } from './game/speed-trap.js';

// Entry point: the garage picks a car (its load is part of it); a run builds the world with that
// car and drives the fixed-step game loop. During a run the player can call the class's breakdown truck
// once: it starts at the beginning of the trail and is driven out to the main truck, to hook its winch and tow
// it to a fuel station. After that its button switches to it; it stays parked where it was left.
// Content comes from tools/build.js: the JSON is on the page, the artwork and audio are data URIs in
// the one-file build and relative file paths in the app build.

// The season: the one picked in the garage (remembered on this device), else the build's default.
// Every playable season is in the build; shared art is stored once in content.seasonAssets.
{
  let pick = null; try { pick = localStorage.getItem('haul.season'); } catch (e) {}
  const all = content.playableSeasons ?? [], s = all.find(x => x.season.id === pick) ?? all.find(x => x.season.id === content.season.id);
  if (s) Object.assign(content, { season: s.season, rockHulls: s.rockHulls, seasonArt: Object.fromEntries(Object.entries(s.art).map(([k, f]) => [k, content.seasonAssets[f]])) });
}
const { season, rockHulls, wheelTypes } = content;
const loader = createLoader(content.loaderText, { title: season.name, subtitle: season.place ?? '' });
const sim = createSimulation(planck, { season, rockHulls, wheelTypes });
// every step first records the state it starts from, so frames can be drawn between steps
const interp = createInterpolation(sim, (x, y) => new planck.Vec2(x, y));
{ const step = sim.step; sim.step = dt => { interp.capture(); step(dt); }; }
const view = createView(document.getElementById('view'), sim);
const audio = createVehicleAudio({ clips: content.audio, bank: content.soundBank, ambience: season.ambience ?? [] });
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
    else if (e.type === 'hit' && e.tires === sim.active.tireData) audio.hit();
    else if (e.type === 'damage') { renderer.hitGlow(); if (e.amount > 0) audio.bump(Math.min(1, 0.4 + e.amount / 20), sim.main.car.physics.mass / 1000); }
  },
});
const progress = createProgress(content.roster.cars);   // rank, XP and the trucks owned
// contracts are sized to the trail being played and the trucks owned
const missions = createMissions(content.missions, { classes: content.roster.classes, trail: content.season.trail, owned: () => content.roster.cars.filter(c => progress.owns(c.id)) });
const garage = createGarage({
  content, progress, missions,
  onSelect: car => audio.prepare([car, ...content.service.filter(s => s.class === car.class)]),
  onStart: selection => driveOff(selection),
  onBuy: () => { haptics.tick(); uiAudio.play('ui-buy'); },
});
const session = createSession({ sim, hud, season, progress, missions, onRestart: () => newRun(), onGarage: () => backToGarage(), onRankUp: () => haptics.hooked?.(), onSuccess: () => uiAudio.play('mission-complete'), onFailure: () => uiAudio.play('mission-failed') });
session.onResume = () => audio.resume();
session.onCall = role => summon(role);
session.canCall = role => !!called[role] || !!serviceFor(role);

let selection = garage.selection;
let returnVehicle = null;
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

// ---------- vehicles: the main truck and summoned service trucks ----------
function drive(v) {
  returnVehicle = null; hud.highlightSwitch(false);
  for (const o of sim.vehicles) Object.assign(o.ctl, { gas: 0, brake: 0 });
  sim.setActive(v); view.setZoom(zoomFor(v.car)); hud.setCar(v.car); hud.showGear(v.ctl.gear); hud.showHandbrake(v.ctl.handbrake); hud.showMode('awd', v.ctl.awd); hud.showMode('diff', v.ctl.diff);
  hud.showSwitch(sim.vehicles.length > 1); view.snap();
}
function switchVehicle() {
  if (session.state !== 'play' || sim.vehicles.length < 2) return;
  const i = sim.vehicles.indexOf(sim.active), next = returnVehicle ?? sim.vehicles[(i + 1) % sim.vehicles.length];
  drive(next); hud.toast(`Driving the ${next.car.name}`, 1.5);
}
// Each class has one breakdown truck. A run can call it once: it starts at the
// beginning of the trail and has to be driven out to the main truck; after that its button switches
// to it. A class whose truck has no art yet has none: its button is greyed out and says so.
const className = id => content.roster.classes.find(c => c.id === id)?.name ?? id;
const called = {};   // role -> the service vehicle called this run
const serviceFor = role => content.service.find(c => c.role === role && c.class === sim.main.car.class);
const roleName = () => 'breakdown truck';
// the breakdown button: call the truck the first time, switch to it afterwards (and back)
function summon(role) {
  if (session.state !== 'play') return;
  const have = called[role];
  if (have) { drive(sim.active === have ? sim.main : have); hud.toast(`Driving the ${sim.active.car.name}`, 1.5); return; }
  const car = serviceFor(role);
  if (!car) { hud.toast(`Not available: the ${className(sim.main.car.class)} class has no ${roleName()} yet`, 2.5); return; }
  const v = sim.spawnService(car, sim.startSpot(car));
  v.ctl.auto = true; v.ctl.gear = 'L'; v.ctl.awd = true; v.ctl.diff = true;
  called[role] = v; hud.showCalled(role, true); session.helpCalled();
  drive(v);   // no toast here: the stuck hint says what to do once you are at the truck
}
// tap WINCH: hook the nearest vehicle within reach, or unhook
function winch() {
  if (session.state !== 'play') return;
  const v = sim.active;
  if (!sim.canWinch(v)) { hud.toast(v.role === 'service' ? 'This truck has no winch.' : 'Only the breakdown truck has a winch. Call it from the top bar.', 2); return; }
  const r = sim.toggleWinch(v), name = o => o === sim.main ? 'your truck' : `the ${o.car.name}`;
  if (r.ok && r.attached) haptics.hooked();
  if (r.ok) audio.hook(r.attached);
  if (r.ok) hud.hint(r.attached ? 'winch-on' : 'winch-off', r.attached ? `Winch hooked to ${name(r.target)}. Drive away to tow it.` : 'Winch unhooked.', 2);
  else if (r.reason === 'far') hud.toast(`Too far away (${Math.round(r.gap)} m). Get within ${sim.winchReach} m of ${name(r.target)} to hook the winch.`, 2.5);
  else hud.toast('Nothing to hook the winch to.', 2);
}
// the engine switch: start it (the starter cranks first) or shut it down
function engine() {
  if (session.state !== 'play') return;
  const v = sim.active;
  if (v.st.engine === 'off') {
    if (v.st.fuel <= 0) { hud.toast('The tank is empty. Call the breakdown truck to tow you to a station.', 2.5); return; }
    audio.key(); sim.startEngine(v); hud.hint('engine-on', `Starting the ${v.car.name}…`, 1.2);
  } else { audio.key(); sim.stopEngine(v); hud.hint('engine-off', 'Engine off', 1.2); }
}
// the handbrake: holds every wheel; a ratchet on scouts, an air hiss on trucks
function handbrake() {
  if (session.state !== 'play') return;
  const v = sim.active, on = !v.ctl.handbrake;
  v.ctl.handbrake = on; audio.handbrake(on, v.car); hud.showHandbrake(on);
  hud.hint(`handbrake-${on}`, on ? 'Handbrake on' : 'Handbrake off', 1.2);
}
const trap = createSpeedTrap({ sim, trail: content.season.trail, onCapture: kmh => { haptics.hit(0.6); session.cameraSpeed(kmh); } });
const input = createInput(hud.els, {
  toggle: k => setMode(k, !sim.ctl[k]), pause, switchVehicle, winch, engine, handbrake, usePower: () => { if (session.state === 'play' && sim.usePower()) haptics.toggle(); }, onAnyInput: startAudio,
});

function newRun() {
  sim.init(sim.trail.start, selection); session.reset(); trap.reset(); hud.resetTrip();
  renderer.warmVehicles(['breakdown'].map(serviceFor));   // so a called truck appears at once
  for (const role of ['breakdown']) { delete called[role]; hud.showCalled(role, false, !!serviceFor(role), `${className(sim.main.car.class)} ${roleName()}`); }
  drive(sim.main);
  sim.ctl.auto = true; setGear('L'); sim.ctl.awd = false; sim.ctl.diff = false; hud.showMode('awd', false); hud.showMode('diff', false);
  view.snap(); hud.setCardVisible(true); hud.showAction(null);
  if (selection.car.load) hud.toast(`Deliver the ${selection.car.load.name.toLowerCase()} to the depot`, 3);
}
// a run starts with the engine off and the starter cranking, like turning the key
function prepareRun(sel) { selection = sel; garage.hide(); newRun(); }
function goRun() { music.play('drive'); session.state = 'play'; sim.stopEngine(sim.main); sim.startEngine(sim.main); }
function startRun(sel) { startAudio(); prepareRun(sel); goRun(); }
function openGarage() { trap.reset(); renderer.clearTracks(); returnVehicle = null; hud.highlightSwitch(false); session.state = 'garage'; audio.suspend(); garage.show(); music.play('garage'); }

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
  startAudio();   // inside the tap, or the phone will not play it
  loader.show('drive', { sub: runLine(sel.car) }); await loader.painted();
  prepareRun(sel);
  await until(() => renderer.ready, 15000);
  await framesDrawn(2);   // the first frames build the sprites for this truck's zoom
  goRun(); loading = false;
  loader.hide();
}
async function backToGarage() {
  if (loading) return; loading = true;
  loader.show('garage', { sub: 'Back to the garage' }); await loader.painted();
  openGarage();
  await decoded([selection.car.artUri?.master, content.hud['garage-bay']]);
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
E.breakdownCallBtn.addEventListener('click', () => summon('breakdown'));
E.switchBtn.addEventListener('click', switchVehicle);
document.getElementById('garageSoundBtn').addEventListener('click', () => sound.open());
document.addEventListener('visibilitychange', () => { if (document.hidden && session.state === 'play') pause(); });
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
  if (playing) {
    const held = input.read();
    sim.ctl.gas = Number(held.gas);   // retain analog pedal position
    if (held.gas && sim.st.engine === 'off' && !hud.toastActive) hud.toast(sim.st.fuel > 0 ? 'The engine is wrecked. Call the breakdown truck to tow you to a station.' : 'The tank is empty. Call the breakdown truck to tow you to a station.', 2);
    sim.ctl.brake = Number(held.brake);
    hud.showPedals(held);
    const fuel0 = sim.main.st.fuel;
    trap.update(dt);
    acc += dt; let n = 0;
    while (acc >= DT && n < 8) { sim.step(DT); acc -= DT; n++; }
    session.run.fuelUsed += Math.max(0, fuel0 - sim.main.st.fuel);
    if (fuel0 >= 15 && sim.main.st.fuel < 15) haptics.warn();   // the tank is getting low
    session.update(dt);
    hud.showFilling(sim.main.st.filling);
    if (sim.ctl.gear !== lastGear) { audio.shift(sim.ctl.gear); haptics.tick(); lastGear = sim.ctl.gear; hud.showGear(lastGear); }
  } else acc = 0;
  interp.apply(playing ? acc / DT : 1);   // drawn between the last two steps; see interpolate.js
  try { view.follow(dt); renderer.draw(dt, playing); } finally { interp.restore(); }
  hud.update(dt, { coins: session.coins, run: session.run });
  audio.update({ playing: session.state === 'play', vehicles: sim.vehicles, active: sim.active, water: renderer.water, camX: view.cam.x, refueling: sim.main.st.filling }, dt);
  adapt(dt);
  requestAnimationFrame(frame);
}

// test hook: the browser tests read the live game through this handle
window.__haul = { missions, progress, trap, music, sim, view, renderer, session, audio, uiAudio, sound, garage, content, loader, drive, setGear, setMode, summon, switchVehicle, winch, engine, handbrake, startRun, snap: () => view.snap() };

// the garage scene behind the menu: the default car parked at the start
sim.init(sim.trail.start, selection);
hud.setCar(selection.car);
resize();
for (let i = 0; i < 90; i++) sim.step(DT);
requestAnimationFrame(frame);
