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
import { createSoundSettings } from './game/sound-settings.js';
import { createInterpolation } from './game/interpolate.js';
import { createHaptics } from './game/haptics.js';

// Entry point: the garage picks a car (its load is part of it); a run builds the world with that
// car and drives the fixed-step game loop. During a run the player can call the class's fuel truck
// and breakdown truck once each: they start at the beginning of the trail and are driven out to the
// main truck, the fuel truck to refuel it, the breakdown truck to hook its winch and tow it free.
// After that the buttons switch between them; a service truck stays parked where it was left.
// Content (JSON + artwork) is embedded by tools/build.js.

const { season, rockHulls, wheelTypes } = content;
const sim = createSimulation(planck, { season, rockHulls, wheelTypes });
// every step first records the state it starts from, so frames can be drawn between steps
const interp = createInterpolation(sim, (x, y) => new planck.Vec2(x, y));
{ const step = sim.step; sim.step = dt => { interp.capture(); step(dt); }; }
const view = createView(document.getElementById('view'), sim);
const audio = createVehicleAudio({ clips: content.audio, bank: content.soundBank, ambience: season.ambience ?? [] });
const haptics = createHaptics();
// hard hits felt in the hand as well as heard (the audio detects them from the suspension)
{ const bump = audio.bump; audio.bump = (strength, massT) => { haptics.hit(strength); bump(strength, massT); }; }
const hud = createHud({ sim, season });
const renderer = createRenderer({
  view, sim, content,
  onEvent: e => {
    if (e.type === 'splash') audio.splash(e.power);
    else if (e.type === 'crush') { audio.crush(e.size); haptics.hit(Math.min(1, e.size)); }
    else if (e.type === 'bridge-crack') audio.wood(0.5);
    else if (e.type === 'bridge-break') { audio.wood(1.2); hud.toast('Bridge plank gave way! Keep it slow.', 2.5); }
  },
});
const garage = createGarage({ content, onStart: (selection, fullscreen) => { if (fullscreen) goFullscreen(); startRun(selection); } });
const session = createSession({ sim, hud, season, onRestart: () => newRun(), onGarage: () => openGarage() });
session.onRecover = x => { sim.respawn(x); view.snap(); setGear('H'); };
session.onResume = () => audio.resume();
session.onCall = role => summon(role);
session.canCall = role => !!called[role] || !!serviceFor(role);

let selection = garage.selection;
let refueling = null, returnVehicle = null;
// the camera zooms out for a job: a refuel running, or the driven truck's winch cable hooked on
view.inJob = () => !!refueling || !!sim.active?.cable;
const startAudio = () => audio.start();
// the sound panel goes back to the pause menu it was opened from
const sound = createSoundSettings({ audio, credits: content.soundCredits, onClose: () => { if (session.state === 'pause') showPause(); } });
function setGear(g) { if (g !== sim.ctl.gear && session.state === 'play') { audio.shift(g); haptics.tick(); } sim.ctl.gear = g; hud.showGear(g); }
function setMode(key, on) {
  sim.ctl[key] = on; hud.showMode(key, on);
  renderer.flash(on); audio.clunk(on); haptics.toggle();
  hud.hint(`${key}-${on}`, key === 'awd' ? (on ? '4×4 on: front axle engaged' : '4×4 off: rear axle only') : (on ? 'Diff lock on: all wheels turn together' : 'Diff lock off'), 1.6);
}
// the pause menu also carries what the phone HUD leaves out: the truck's details, the engine switch
// and fullscreen
const showPause = () => {
  const E = hud.els, text = el => el.textContent.trim() || '–';
  const spec = [['Vehicle', text(E.carName)], ['Cargo', text(E.loadChip)], ['Fuel', text(E.fuelTxt)], ['Use', `${text(E.useTxt)} ${E.avgTxt.textContent}`.trim()], ['Coins', text(E.coinTxt)]];
  const buttons = [[sim.st.engine === 'off' ? 'Start engine' : 'Engine off', () => { session.resume(); engine(); }]];
  if (!app) buttons.push([document.fullscreenElement ? 'Exit fullscreen' : 'Fullscreen', () => { goFullscreen(); session.resume(); }]);
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
  stopRefueling();
  returnVehicle = null; hud.highlightSwitch(false);
  for (const o of sim.vehicles) Object.assign(o.ctl, { gas: 0, brake: 0 });
  sim.setActive(v); view.setZoom(zoomFor(v.car)); hud.setCar(v.car); hud.showGear(v.ctl.gear); hud.showHandbrake(v.ctl.handbrake); hud.showMode('awd', v.ctl.awd); hud.showMode('diff', v.ctl.diff);
  // the 4×4 switch exists on all-wheel-drive vehicles (4×4, 6×6, 10×10...), not on a 4×2 or 6×4
  { const [w, d] = v.car.drive.split('×').map(Number); hud.els.awdBtn.hidden = !(w > 0 && w === d); }
  hud.showSwitch(sim.vehicles.length > 1); view.snap();
}
function switchVehicle() {
  if (session.state !== 'play' || sim.vehicles.length < 2) return;
  const i = sim.vehicles.indexOf(sim.active), next = returnVehicle ?? sim.vehicles[(i + 1) % sim.vehicles.length];
  drive(next); hud.toast(`Driving the ${next.car.name}`, 1.5);
}
// Each class has one fuel truck and one breakdown truck. A run can call each once: it starts at the
// beginning of the trail and has to be driven out to the main truck; after that its button switches
// to it. A class whose truck has no art yet has none: its button is greyed out and says so.
const className = id => content.roster.classes.find(c => c.id === id)?.name ?? id;
const called = {};   // role -> the service vehicle called this run
const serviceFor = role => content.service.find(c => c.role === role && c.class === sim.main.car.class);
const roleName = role => role === 'fuel' ? 'fuel truck' : 'breakdown truck';
// the fuel or breakdown button: call that truck the first time, switch to it afterwards (and back)
function summon(role) {
  if (session.state !== 'play') return;
  const have = called[role];
  if (have) { drive(sim.active === have ? sim.main : have); hud.toast(`Driving the ${sim.active.car.name}`, 1.5); return; }
  const car = serviceFor(role);
  if (!car) { hud.toast(`Not available: the ${className(sim.main.car.class)} class has no ${roleName(role)} yet`, 2.5); return; }
  const main = sim.main, v = sim.spawnService(car, sim.startSpot(car));
  v.ctl.gear = 'L'; v.ctl.awd = true; v.ctl.diff = true;
  called[role] = v; hud.showCalled(role, true);
  const far = Math.round(sim.distance(v, main));
  drive(v); hud.toast(`${car.name} is at the trail start, ${far} m away. ${role === 'fuel' ? 'Drive it to your truck to refuel.' : 'Drive it out, hook on, tow.'}`, 4.5);
}
// a fuel truck stopped next to the main one offers to refuel it
function serviceJob() {
  const v = sim.active, main = sim.main;
  if (refueling || returnVehicle === main || v.role !== 'service' || v.car.role !== 'fuel' || session.state !== 'play') return null;
  if (sim.distance(v, main) > 8 || Math.abs(v.st.speed) > 2 || Math.abs(main.st.speed) > 2) return null;
  return main.st.fuel < 99.9 ? 'Refuel truck' : null;
}
// tap WINCH: hook the nearest vehicle within reach, or unhook
function winch() {
  if (session.state !== 'play') return;
  const v = sim.active;
  if (!sim.canWinch(v)) { hud.toast(v.role === 'service' ? 'Fuel trucks have no winch. Call the breakdown truck to tow.' : 'Only the breakdown truck has a winch. Call it from the top bar.', 2); return; }
  const r = sim.toggleWinch(v), name = o => o === sim.main ? 'your truck' : `the ${o.car.name}`;
  if (r.ok && r.attached) haptics.hooked();
  if (r.ok) hud.hint(r.attached ? 'winch-on' : 'winch-off', r.attached ? `Winch hooked to ${name(r.target)}. Drive away to tow it.` : 'Winch unhooked.', 2);
  else if (r.reason === 'far') hud.toast(`Too far away (${Math.round(r.gap)} m). Get within ${sim.winchReach} m of ${name(r.target)} to hook the winch.`, 2.5);
  else hud.toast('Nothing to hook the winch to.', 2);
}
// the engine switch: start it (the starter cranks first) or shut it down
function engine() {
  if (session.state !== 'play') return;
  const v = sim.active;
  if (v.st.engine === 'off') {
    if (v.st.fuel <= 0) { hud.toast('The tank is empty. Call a fuel truck.', 2); return; }
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
function doServiceJob() {
  if (!serviceJob()) return;
  const v = sim.active, main = sim.main;
  refueling = { source: v, target: main, startFuel: main.st.fuel, elapsed: 0, duration: 4, progress: 0 };
  v.ctl.gas = main.ctl.gas = 0; v.ctl.brake = main.ctl.brake = 1;
  renderer.setRefueling(refueling);
  hud.showAction('Refueling… 0%', true);
  hud.toast('Refueling your truck. Keep both vehicles parked.', 2.5);
}

function stopRefueling() {
  refueling = null; renderer.setRefueling(null); hud.showAction(null);
}
function serviceComplete(message) {
  returnVehicle = sim.main; hud.highlightSwitch(true);
  hud.toast(`${message} Tap the glowing switch button to return to your truck.`, 4);
}
function updateRefueling(dt) {
  if (!refueling) return;
  const job = refueling;
  if (sim.active !== job.source || sim.distance(job.source, job.target) > 8 || Math.abs(job.target.st.speed) > 2) {
    stopRefueling(); hud.toast('Refueling stopped. Park nearby to continue.', 2.5); return;
  }
  job.elapsed = Math.min(job.duration, job.elapsed + dt);
  job.progress = job.elapsed / job.duration;
  job.target.st.fuel = job.startFuel + (100 - job.startFuel) * job.progress;
  if (job.progress >= 1) { stopRefueling(); serviceComplete('Tank filled.'); }
}

const input = createInput(hud.els, {
  gear: setGear, toggle: k => setMode(k, !sim.ctl[k]), pause, switchVehicle, winch, engine, handbrake, onAnyInput: startAudio,
});

function newRun() {
  stopRefueling();
  sim.init(sim.trail.start, selection); session.reset(); hud.resetTrip();
  for (const role of ['fuel', 'breakdown']) { delete called[role]; hud.showCalled(role, false, !!serviceFor(role), `${className(sim.main.car.class)} ${roleName(role)}`); }
  drive(sim.main);
  setGear('H'); sim.ctl.awd = false; sim.ctl.diff = false; hud.showMode('awd', false); hud.showMode('diff', false);
  view.snap(); hud.setCardVisible(true); hud.showAction(null);
  if (selection.car.load) hud.toast(`Deliver the ${selection.car.load.name.toLowerCase()} to the depot`, 3);
}
// a run starts with the engine off and the starter cranking, like turning the key
function startRun(sel) { selection = sel; garage.hide(); session.state = 'play'; startAudio(); newRun(); sim.stopEngine(sim.main); sim.startEngine(sim.main); }
function openGarage() { renderer.clearTracks(); stopRefueling(); returnVehicle = null; hud.highlightSwitch(false); session.state = 'garage'; audio.suspend(); garage.show(); }

// Inside the Android app (Capacitor) the game is already full screen and landscape, and Android's
// back button pauses and resumes a run, closes the sound panel, or leaves the app from the garage.
const app = window.Capacitor?.isNativePlatform?.() ? window.Capacitor : null;
if (app) {
  document.documentElement.classList.add('native-app');
  app.Plugins.App?.addListener('backButton', () => {
    if (sound.isOpen) document.getElementById('soundDone').click();
    else if (session.state === 'play' || session.state === 'pause') pause();
    else if (session.state === 'garage') app.Plugins.App.minimizeApp();
  });
}

async function goFullscreen() {
  const el = document.documentElement;
  if (app) return;
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
for (const b of document.querySelectorAll('.gear button')) b.addEventListener('click', () => setGear(b.dataset.g));
E.pauseBtn.addEventListener('click', pause);
E.fuelCallBtn.addEventListener('click', () => summon('fuel'));
E.breakdownCallBtn.addEventListener('click', () => summon('breakdown'));
E.switchBtn.addEventListener('click', switchVehicle);
E.actionBtn.addEventListener('click', doServiceJob);
document.getElementById('garageSoundBtn').addEventListener('click', () => sound.open());
document.addEventListener('visibilitychange', () => { if (document.hidden && session.state === 'play') pause(); });
window.addEventListener('resize', resize);

// ---------- loop ----------
// Physics runs at a fixed 120 Hz; rendering follows the display, drawn between steps (interpolate.js). If frames run long for a few
// seconds the canvas resolution steps down. Start-up frames are slow while art caches build, so
// adaptation waits 5 s, and the resize happens before drawing (resizing clears the canvas).
const DT = 1 / 120, TOUCH = matchMedia('(pointer: coarse)').matches;
let last = performance.now(), acc = 0, slowT = 0, frameAvg = 1 / 60, pendingResize = false;
function adapt(dt) {
  if (session.state !== 'play' || session.run.time < 5) { frameAvg = 1 / 60; slowT = 0; return; }
  frameAvg += (dt - frameAvg) * 0.05;
  // touch devices step down sooner (under 50 fps for 2 s), so a phone holds 60 fps rather than ~40
  const slow = TOUCH ? 1 / 50 : 1 / 40;
  slowT = frameAvg > slow ? slowT + dt : Math.max(0, slowT - dt);
  if (slowT > (TOUCH ? 2 : 3) && view.quality > 0.6) { view.quality = Math.max(0.6, view.quality - 0.15); slowT = 0; frameAvg = 1 / 60; pendingResize = true; }
}
function frame(now) {
  const dt = Math.min(8 * DT, (now - last) / 1000); last = now;   // at most the 8 physics steps a frame may run
  if (pendingResize) { pendingResize = false; resize(); }
  const playing = session.state === 'play';
  if (playing) {
    const held = input.read();
    sim.ctl.gas = refueling ? 0 : Number(held.gas);   // retain analog pedal position
    if (held.gas && sim.ctl.handbrake && sim.st.engine === 'on' && Math.abs(sim.st.speed) < 0.5 && !hud.toastActive) hud.toast('The handbrake is on. Tap PARK (B) to release it.', 2);
    if (held.gas && sim.st.engine === 'off' && !hud.toastActive) hud.toast(sim.st.fuel > 0 ? 'The engine is off. Tap ENGINE (I) to start it.' : 'The tank is empty. Call a fuel truck.', 2);
    sim.ctl.brake = refueling ? 1 : Number(held.brake);
    hud.showPedals(held);
    const fuel0 = sim.main.st.fuel;
    acc += dt; let n = 0;
    while (acc >= DT && n < 8) { sim.step(DT); acc -= DT; n++; }
    session.run.fuelUsed += Math.max(0, fuel0 - sim.main.st.fuel);
    if (fuel0 >= 15 && sim.main.st.fuel < 15) haptics.warn();   // the tank is getting low
    session.update(dt);
    if (session.state === 'play') updateRefueling(dt);
    hud.showAction(refueling ? `Refueling… ${Math.round(refueling.progress * 100)}%` : serviceJob(), !!refueling);
  } else acc = 0;
  interp.apply(playing ? acc / DT : 1);   // drawn between the last two steps; see interpolate.js
  try { view.follow(dt); renderer.draw(dt, playing); } finally { interp.restore(); }
  hud.update(dt, { coins: session.coins, run: session.run });
  audio.update({ playing: session.state === 'play', vehicles: sim.vehicles, active: sim.active, water: renderer.water, camX: view.cam.x }, dt);
  adapt(dt);
  requestAnimationFrame(frame);
}

// test hook: the browser tests read the live game through this handle
window.__haul = { sim, view, renderer, session, audio, sound, garage, content, drive, setGear, setMode, summon, switchVehicle, winch, engine, handbrake, doServiceJob, serviceJob, startRun, snap: () => view.snap() };

// the garage scene behind the menu: the default car parked at the start
sim.init(sim.trail.start, selection);
hud.setCar(selection.car);
resize();
for (let i = 0; i < 90; i++) sim.step(DT);
requestAnimationFrame(frame);
