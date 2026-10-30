// Reads the playable content and its artwork from assets/: cars (each with its load drawn in),
// service trucks, HUD art and the season.
import fs from 'node:fs';
import path from 'node:path';
import { deriveSpecs } from './specs.js';

export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const readJson = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const exists = f => fs.existsSync(path.join(ROOT, f));
const MIME = { '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.wav': 'audio/wav', '.mp3': 'audio/mpeg' };
const dataUri = f => `data:${MIME[path.extname(f)]};base64,` + fs.readFileSync(path.join(ROOT, f)).toString('base64');

// a roster entry is playable when its definition file exists and says so. Its spec numbers
// (weight, power, torque, top speed, tank, tires, load) are then worked out from that car.json
// (specs.js) and written over the roster entry, so the garage, the sound and the tests always see
// what the physics drives with; the car carries them as `spec`
function playable(dir, entries, file) {
  const out = [];
  for (const e of entries) {
    const p = `${dir}/${e.id}/${file}`;
    if (!exists(p)) continue;
    const d = readJson(p);
    if (d.status !== 'playable') continue;
    const { loadMassT, fuelL, ...specs } = deriveSpecs(d);
    Object.assign(e, specs);
    if (!e.role) e.fuelL = fuelL;   // a service truck's fuelL is what a fuel truck carries for others
    if (loadMassT != null && e.load) e.load.massT = loadMassT;
    out.push({ ...d, spec: { class: e.class, powerKw: e.powerKw, torqueNm: e.torqueNm, massT: e.massT }, dir: `${dir}/${e.id}` });
  }
  return out;
}

// Sound: the bank (assets/audio/bank/bank.json, built by tools/prepare-audio.py from sounds.json) has
// one engine per truck class. A car plays its class's engine, or the one its car.json names in
// `audio.engine`; service trucks (they have a `role`) and unknown classes get a heavy-duty diesel, or
// the heavy engine from 700 kW up. `audio.crankS`, `airBrakes` and `backupAlarm` in car.json override the class's.
export const readSoundBank = () => readJson('assets/audio/bank/bank.json');
export function resolveAudio(all, bank = readSoundBank()) {
  for (const car of all) {
    const a = { ...(car.audio ?? {}) }, cls = car.role ? null : car.spec?.class ?? car.class;
    a.engine = bank.engines[a.engine] ? a.engine : bank.engines[cls] ? cls : (car.spec?.powerKw ?? 0) >= 700 ? 'heavy' : 'heavy-duty';
    a.crankS ??= bank.engines[a.engine].crankS;
    car.audio = a;
  }
}

// Data only (for tests and tools).
export function loadContent({ carId = process.env.HAUL_CAR, seasonId = process.env.HAUL_SEASON } = {}) {
  const roster = readJson('assets/cars/cars.json');
  const cars = playable('assets/cars', roster.cars, 'car.json');
  const service = playable('assets/cars', roster.service, 'car.json');
  if (!cars.length) throw new Error('No playable car');
  resolveAudio([...cars, ...service]);
  // the default: the roster's defaultCar (the reference car the tests and feel are tuned on), else the first
  const car = carId ? cars.find(c => c.id === carId) : cars.find(c => c.id === roster.defaultCar) ?? cars[0];
  if (!car) throw new Error(`Car ${carId} is not playable`);
  seasonId ||= fs.readdirSync(path.join(ROOT, 'assets/seasons')).sort().find(id => exists(`assets/seasons/${id}/season.json`) && readJson(`assets/seasons/${id}/season.json`).status === 'playable');
  const seasonDir = `assets/seasons/${seasonId}`, season = readJson(`${seasonDir}/season.json`);
  return {
    roster, cars, service, car, season, seasonDir,
    rockHulls: readJson(`${seasonDir}/${season.rockHulls}`),
    wheelTypes: readJson('assets/cars/wheel-types.json').types,
  };
}

const withArt = (item, asset) => ({ ...item, artUri: Object.fromEntries(Object.entries(item.art).map(([k, a]) => [k, asset(`${item.dir}/${a.file}`)])) });

const SEASON_ORDER = ['spring', 'summer', 'autumn', 'winter'];

// Data plus every runtime image and sound clip as a URI: a data URI by default (the one-file web
// build), or whatever `asset(file)` returns, e.g. a relative path to a copied file (the app build).
export function loadContentWithArt({ asset = dataUri, ...opts } = {}) {
  const c = loadContent(opts);
  // the whole sound bank, keyed by clip name, plus the credits for the recordings it uses
  const bank = readSoundBank(), sources = readJson('assets/audio/sources.json').sources;
  const audio = Object.fromEntries(Object.entries(bank.clips).map(([name, clip]) => [name, asset(`assets/audio/${clip.file}`)]));
  const used = new Set(Object.values(bank.clips).flatMap(clip => clip.sources));
  const soundCredits = sources.filter(s => used.has(s.id)).map(({ title, author, page, license }) => ({ title, author, page, license }));
  const hud = {};
  for (const a of readJson('assets/hud/hud.json').art) if (exists(`assets/hud/art/${a.id}.webp`)) hud[a.id] = asset(`assets/hud/art/${a.id}.webp`);
  const seasonArt = Object.fromEntries(Object.entries(c.season.art).map(([k, a]) => [k, asset(`${c.seasonDir}/${a.file}`)]));
  // the garage lists the whole roster; only the summary fields are shipped
  const roster = {
    classes: c.roster.classes,
    cars: c.roster.cars.map(({ id, name, number, class: cls, tier, order, status, wheelType, stats, load, price, drive, lengthM }) => ({ id, name, number, class: cls, tier, order, status, wheelType, stats, load, price, drive, lengthM })),
  };
  // every season folder for the garage's season row: playable ones from season.json, planned ones
  // from their README's title ("# Frozen North (winter)")
  const seasons = fs.readdirSync(path.join(ROOT, 'assets/seasons')).filter(id => fs.statSync(path.join(ROOT, 'assets/seasons', id)).isDirectory()).sort().map(id => {
    if (exists(`assets/seasons/${id}/season.json`)) { const s = readJson(`assets/seasons/${id}/season.json`); return { id, name: s.name, season: s.season, status: s.status }; }
    const m = exists(`assets/seasons/${id}/README.md`) ? fs.readFileSync(path.join(ROOT, `assets/seasons/${id}/README.md`), 'utf8').match(/^#\s*([^(\n]+?)\s*(?:\((\w+)\))?\s*$/m) : null;
    return { id, name: m?.[1] ?? id, season: m?.[2], status: 'planned' };
  }).sort((a, b) => SEASON_ORDER.indexOf(a.season) - SEASON_ORDER.indexOf(b.season));
  return {
    roster, wheelTypes: c.wheelTypes, season: c.season, seasons, rockHulls: c.rockHulls, seasonArt, hud,
    cars: c.cars.map(i => withArt(i, asset)), service: c.service.map(i => withArt(i, asset)),
    defaultCar: c.car.id, audio, soundBank: { engines: bank.engines, effects: bank.effects }, soundCredits,
  };
}
