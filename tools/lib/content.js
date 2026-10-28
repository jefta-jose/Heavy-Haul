// Reads the playable content and its artwork from assets/: cars (each with its load drawn in),
// service trucks, HUD art and the season.
import fs from 'node:fs';
import path from 'node:path';

export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const readJson = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const exists = f => fs.existsSync(path.join(ROOT, f));
const MIME = { '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.wav': 'audio/wav' };
const dataUri = f => `data:${MIME[path.extname(f)]};base64,` + fs.readFileSync(path.join(ROOT, f)).toString('base64');

// a roster entry is playable when its definition file exists and says so; it carries its roster
// spec (class, engine power, weight) so sound and other derived settings can use it
function playable(dir, entries, file) {
  const out = [];
  for (const { id, class: cls, powerKw, torqueNm, massT } of entries) {
    const p = `${dir}/${id}/${file}`;
    if (exists(p)) { const d = readJson(p); if (d.status === 'playable') out.push({ ...d, spec: { class: cls, powerKw, torqueNm, massT }, dir: `${dir}/${id}` }); }
  }
  return out;
}

// Data only (for tests and tools).
export function loadContent({ carId = process.env.HAUL_CAR, seasonId = process.env.HAUL_SEASON } = {}) {
  const roster = readJson('assets/cars/cars.json');
  const cars = playable('assets/cars', roster.cars, 'car.json');
  const service = playable('assets/cars', roster.service, 'car.json');
  if (!cars.length) throw new Error('No playable car');
  const car = carId ? cars.find(c => c.id === carId) : cars[0];
  if (!car) throw new Error(`Car ${carId} is not playable`);
  seasonId ||= fs.readdirSync(path.join(ROOT, 'assets/seasons')).sort().find(id => exists(`assets/seasons/${id}/season.json`) && readJson(`assets/seasons/${id}/season.json`).status === 'playable');
  const seasonDir = `assets/seasons/${seasonId}`, season = readJson(`${seasonDir}/season.json`);
  return {
    roster, cars, service, car, season, seasonDir,
    rockHulls: readJson(`${seasonDir}/${season.rockHulls}`),
    wheelTypes: readJson('assets/cars/wheel-types.json').types,
  };
}

const withArt = item => ({ ...item, artUri: Object.fromEntries(Object.entries(item.art).map(([k, a]) => [k, dataUri(`${item.dir}/${a.file}`)])) });

// Data plus every runtime image as a data URI.
export function loadContentWithArt(opts) {
  const c = loadContent(opts);
  const audio = Object.fromEntries(Object.entries(readJson('assets/audio/audio.json').clips)
    .map(([key, clip]) => [key, dataUri(`assets/audio/${clip.file}`)]));
  const hud = {};
  for (const a of readJson('assets/hud/hud.json').art) if (exists(`assets/hud/art/${a.id}.webp`)) hud[a.id] = dataUri(`assets/hud/art/${a.id}.webp`);
  const seasonArt = Object.fromEntries(Object.entries(c.season.art).map(([k, a]) => [k, dataUri(`${c.seasonDir}/${a.file}`)]));
  // the garage lists the whole roster; only the summary fields are shipped
  const roster = {
    classes: c.roster.classes,
    cars: c.roster.cars.map(({ id, name, number, class: cls, tier, status, wheelType, stats, load, price, drive }) => ({ id, name, number, class: cls, tier, status, wheelType, stats, load, price, drive })),
  };
  return {
    roster, wheelTypes: c.wheelTypes, season: c.season, rockHulls: c.rockHulls, seasonArt, hud,
    cars: c.cars.map(withArt), service: c.service.map(withArt),
    defaultCar: c.car.id, audio,
  };
}
