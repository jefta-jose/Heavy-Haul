import * as planck from 'planck';
import content from 'virtual:content';
import { createSimulation } from './physics/simulation.js';
import { createRenderer } from './render/renderer.js';
import { createVehicleAudio } from './audio/vehicle-audio.js';
import { createView } from './game/view.js';
import { createInput } from './game/input.js';
import { createHud } from './game/hud.js';
import { createSession } from './game/session.js';
import { createGarage } from './game/garage.js';
import { createSoundSettings } from './game/sound-settings.js';

// Entry point: the garage picks a car (its load is part of it); a run builds the world with that
// car and drives the fixed-step game loop. During a run the player can call fuel and breakdown
// trucks sized to the main truck, drive them over, hook the winch and tow the truck free, refuel or repair it, and
// switch back; the service truck stays parked where it was left.
// Content (JSON + artwork) is embedded by tools/build.js.

const { season, rockHulls, wheelTypes } = content;
const sim = createSimulation(planck, { season, rockHulls, wheelTypes });
const view = createView(document.getElementById('view'), sim);
const audio = createVehicleAudio(content.audio);
const hud = createHud({ sim, season });
const renderer = createRenderer({
  view, sim, content,
  onEvent: e => {
    if (e.type === 'splash') audio.splash(e.power);
    else if (e.type === 'crush') audio.crush(e.size);
    else if (e.type === 'bridge-crack') audio.wood(0.5);
    else if (e.type === 'bridge-break') { audio.wood(1.2); hud.toast('Bridge plank gave way! Keep it slow.', 2.5); }
  },
});
const garage = createGarage({ content, onStart: (selection, fullscreen) => { if (fullscreen) goFullscreen(); startRun(selection); } });
const session = createSession({ sim, hud, season, onRestart: () => newRun(), onGarage: () => openGarage() });
session.onRecover = x => { sim.respawn(x); view.snap(); setGear('H'); };
session.onResume = () => audio.resume();
session.onCall = role => summon(role);

let selection = garage.selection;
let refueling = null, returnVehicle = null;
const startAudio = () => audio.start();
// the sound panel goes back to the pause menu it was opened from
const sound = createSoundSettings({ audio, onClose: () => { if (session.state === 'pause') showPause(); } });
function setGear(g) { if (g !== sim.ctl.gear && session.state === 'play') audio.shift(g); sim.ctl.gear = g; hud.showGear(g); }
function setMode(key, on) {
  sim.ctl[key] = on; hud.showMode(key, on);
  renderer.flash(on); audio.clunk(on);
  hud.toast(key === 'awd' ? (on ? '4×4 on: front axle engaged' : '4×4 off: rear axle only') : (on ? 'Diff lock on: all wheels turn together' : 'Diff lock off'), 1.6);
}
const showPause = () => session.pause(() => { hud.hideMessage(); sound.open(); });
function pause() {
  if (sound.isOpen) return;
  if (session.state === 'play') showPause();
  else if (session.state === 'pause') session.resume();
}
function toggleCamera() {
  const zoom = view.cycleZoom(), button = hud.els.cameraBtn;
  button.textContent = `${zoom}×`;
  button.setAttribute('aria-label', `Camera zoom ${zoom}. Click to cycle zoom levels`);
  button.title = `Camera zoom ${zoom} (C): 1.5 / 2.5 / 3.5 / 4.5`;
  hud.toast(`Camera zoom: ${zoom}`, 1.5);
}
function resize() { view.resize(); hud.resizeGauges(view.DPR); }

// ---------- vehicles: the main truck and summoned service trucks ----------
function drive(v) {
  stopRefueling();
  returnVehicle = null; hud.highlightSwitch(false);
  for (const o of sim.vehicles) Object.assign(o.ctl, { gas: 0, brake: 0 });
  sim.setActive(v); hud.setCar(v.car); hud.showGear(v.ctl.gear); hud.showMode('awd', v.ctl.awd); hud.showMode('diff', v.ctl.diff);
  // the 4×4 switch exists on all-wheel-drive vehicles (4×4, 6×6, 10×10...), not on a 4×2 or 6×4
  { const [w, d] = v.car.drive.split('×').map(Number); hud.els.awdBtn.hidden = !(w > 0 && w === d); }
  hud.showSwitch(sim.vehicles.length > 1); view.snap();
}
function switchVehicle() {
  if (session.state !== 'play' || sim.vehicles.length < 2) return;
  const i = sim.vehicles.indexOf(sim.active), next = returnVehicle ?? sim.vehicles[(i + 1) % sim.vehicles.length];
  drive(next); hud.toast(`Driving the ${next.car.name}`, 1.5);
}
// the smallest service truck of that role that can pull the main truck (gross weight)
function serviceFor(role) {
  const need = sim.vehicleMass(sim.main) / 1000 + (sim.main.car.physics.load?.massT ?? 0);
  const options = content.service.filter(c => c.role === role).sort((a, b) => a.towMassT - b.towMassT);
  return options.find(c => c.towMassT >= need) ?? options.at(-1);
}
function summon(role) {
  if (session.state !== 'play') return;
  const car = serviceFor(role);
  if (!car) { hud.toast(`No ${role === 'fuel' ? 'fuel' : 'breakdown'} truck in the garage yet`, 2); return; }
  // it arrives ahead of the main truck, on firm ground if possible, to winch it forward out of trouble
  const main = sim.main, v = sim.spawnService(car);
  v.ctl.gear = 'L'; v.ctl.awd = true; v.ctl.diff = true;
  const small = car.towMassT < sim.vehicleMass(main) / 1000 + (main.car.physics.load?.massT ?? 0);
  drive(v); hud.toast(`${car.name} is here. Back up within ${sim.winchReach} m of your truck, tap WINCH to hook it, then drive away to tow it${small ? ' (it may be too small for this rig)' : ''}.`, 4);
}
// a service truck stopped next to the main one offers its job; both kinds can winch
function serviceJob() {
  const v = sim.active, main = sim.main;
  if (refueling || returnVehicle === main || v.role !== 'service' || session.state !== 'play') return null;
  if (sim.distance(v, main) > 8 || Math.abs(v.st.speed) > 2 || Math.abs(main.st.speed) > 2) return null;
  if (v.car.role === 'fuel') return main.st.fuel < 99.9 ? 'Refuel truck' : null;
  return 'Repair truck';
}
// tap WINCH: hook the nearest vehicle within reach, or unhook
function winch() {
  if (session.state !== 'play') return;
  const v = sim.active;
  if (v.role !== 'service') { hud.toast('Only service trucks have a winch. Call one from the top bar.', 2); return; }
  const r = sim.toggleWinch(v), name = o => o === sim.main ? 'your truck' : `the ${o.car.name}`;
  if (r.ok) hud.toast(r.attached ? `Winch hooked to ${name(r.target)}. Drive away to tow it.` : 'Winch unhooked.', 2);
  else if (r.reason === 'far') hud.toast(`Too far away (${Math.round(r.gap)} m). Get within ${sim.winchReach} m of ${name(r.target)} to hook the winch.`, 2.5);
  else hud.toast('Nothing to hook the winch to.', 2);
}
// the engine switch: start it (the starter cranks first) or shut it down
function engine() {
  if (session.state !== 'play') return;
  const v = sim.active;
  if (v.st.engine === 'off') {
    if (v.st.fuel <= 0) { hud.toast('The tank is empty. Call a fuel truck.', 2); return; }
    audio.key(); sim.startEngine(v); hud.toast(`Starting the ${v.car.name}…`, 1.2);
  } else { audio.key(); sim.stopEngine(v); hud.toast('Engine off', 1.2); }
}
function doServiceJob() {
  if (!serviceJob()) return;
  const v = sim.active, main = sim.main;
  if (v.car.role === 'fuel') {
    refueling = { source: v, target: main, startFuel: main.st.fuel, elapsed: 0, duration: 4, progress: 0 };
    v.ctl.gas = main.ctl.gas = 0; v.ctl.brake = main.ctl.brake = 1;
    renderer.setRefueling(refueling);
    hud.showAction('Refueling… 0%', true);
    hud.toast('Refueling your truck. Keep both vehicles parked.', 2.5);
  }
  else {
    // the crane lifts the truck back onto its wheels where it stands
    const p = main.parts.truck.getPosition(); sim.respawn(p.x, main); session.run.rollT = 0; session.run.stuckT = 0;
    serviceComplete('Repaired and back on its wheels.');
  }
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
  gear: setGear, toggle: k => setMode(k, !sim.ctl[k]), camera: toggleCamera, pause, switchVehicle, winch, engine, onAnyInput: startAudio,
});

function newRun() {
  stopRefueling();
  sim.init(sim.trail.start, selection); session.reset();
  drive(sim.main);
  setGear('H'); sim.ctl.awd = false; sim.ctl.diff = false; hud.showMode('awd', false); hud.showMode('diff', false);
  view.snap(); hud.setCardVisible(true); hud.showAction(null);
  if (selection.car.load) hud.toast(`Deliver the ${selection.car.load.name.toLowerCase()} to the depot`, 3);
}
// a run starts with the engine off and the starter cranking, like turning the key
function startRun(sel) { selection = sel; garage.hide(); session.state = 'play'; startAudio(); newRun(); sim.stopEngine(sim.main); sim.startEngine(sim.main); }
function openGarage() { stopRefueling(); returnVehicle = null; hud.highlightSwitch(false); session.state = 'garage'; audio.suspend(); garage.show(); }

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
for (const b of document.querySelectorAll('.gear button')) b.addEventListener('click', () => setGear(b.dataset.g));
E.cameraBtn.addEventListener('click', toggleCamera);
E.pauseBtn.addEventListener('click', pause);
E.fuelCallBtn.addEventListener('click', () => summon('fuel'));
E.repairCallBtn.addEventListener('click', () => summon('repair'));
E.switchBtn.addEventListener('click', switchVehicle);
E.actionBtn.addEventListener('click', doServiceJob);
document.getElementById('garageSoundBtn').addEventListener('click', () => sound.open());
document.addEventListener('visibilitychange', () => { if (document.hidden && session.state === 'play') pause(); });
window.addEventListener('resize', resize);

// ---------- loop ----------
// Physics runs at a fixed 120 Hz; rendering follows the display. If frames run long for a few
// seconds the canvas resolution steps down. Start-up frames are slow while art caches build, so
// adaptation waits 5 s, and the resize happens before drawing (resizing clears the canvas).
const DT = 1 / 120;
let last = performance.now(), acc = 0, slowT = 0, frameAvg = 1 / 60, pendingResize = false;
function adapt(dt) {
  if (session.state !== 'play' || session.run.time < 5) { frameAvg = 1 / 60; slowT = 0; return; }
  frameAvg += (dt - frameAvg) * 0.05;
  slowT = frameAvg > 1 / 40 ? slowT + dt : Math.max(0, slowT - dt);
  if (slowT > 3 && view.quality > 0.6) { view.quality = Math.max(0.6, view.quality - 0.15); slowT = 0; frameAvg = 1 / 60; pendingResize = true; }
}
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (pendingResize) { pendingResize = false; resize(); }
  const playing = session.state === 'play';
  if (playing) {
    const held = input.read();
    sim.ctl.gas = !refueling && held.gas ? 1 : 0;   // the engine model spools the throttle
    if (held.gas && sim.st.engine === 'off' && !hud.toastActive) hud.toast(sim.st.fuel > 0 ? 'The engine is off. Tap ENGINE (I) to start it.' : 'The tank is empty. Call a fuel truck.', 2);
    sim.ctl.brake = refueling || held.brake ? 1 : 0;
    hud.showPedals(held);
    const fuel0 = sim.main.st.fuel;
    acc += dt; let n = 0;
    while (acc >= DT && n < 8) { sim.step(DT); acc -= DT; n++; }
    session.run.fuelUsed += Math.max(0, fuel0 - sim.main.st.fuel);
    session.update(dt);
    if (session.state === 'play') updateRefueling(dt);
    hud.showAction(refueling ? `Refueling… ${Math.round(refueling.progress * 100)}%` : serviceJob(), !!refueling);
  } else acc = 0;
  view.follow(dt);
  renderer.draw(dt, playing);
  hud.update(dt, { coins: session.coins });
  audio.update({ playing: session.state === 'play', vehicles: sim.vehicles, active: sim.active, water: renderer.water, camX: view.cam.x }, dt);
  adapt(dt);
  requestAnimationFrame(frame);
}

// test hook: the browser tests read the live game through this handle
window.__haul = { sim, view, renderer, session, audio, sound, garage, setGear, setMode, summon, switchVehicle, winch, engine, doServiceJob, serviceJob, startRun, snap: () => view.snap() };

// the garage scene behind the menu: the default car parked at the start
sim.init(sim.trail.start, selection);
hud.setCar(selection.car);
resize();
for (let i = 0; i < 90; i++) sim.step(DT);
requestAnimationFrame(frame);
