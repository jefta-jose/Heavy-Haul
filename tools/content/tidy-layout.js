// Brings every season's crossings and roadside scenery to Blackwater Swamp's style (user decision, 2026-11-18):
//   - every run of round obstacles uses the swamp's spacing and size (RUN_GAP_M, RUN_RADIUS);
//   - roadside pieces are drawn at the swamp's heights (SCENERY_HEIGHT_M);
//   - no roadside piece stands over a crossing, a low obstacle, a station or a deep bog, so none looks as if it is in the road:
//     one that would is moved on along the trail until it is clear;
//   - an upright piece (a shack, a tower) wider than SLOPE_CHECK_M moves to the levellest clear spot within SEARCH_M, so it
//     rises at most MAX_RISE_M across its width, as the swamp's do;
//   - a scenery art key a season does not have (a leftover from the map it was copied from) becomes its warning sign.
// Level ground under upright pieces is the terrain's job (SCENERY_FLAT_M in src/game-config.js).
//
//   node tools/content/tidy-layout.js          rewrites every season.json but the swamp's
//   node tools/content/tidy-layout.js --dry    prints what would change
import fs from 'node:fs';
import path from 'node:path';
import { runLength, createTerrain, seasonSurfaces } from '../../src/physics/terrain.js';
import { SCENERY_FLAT_M, STATION_WIDTH_M, HIGHWAY_SIGN_WIDTH_M, SPEED_TRAP_FROM_END_M } from '../../src/game-config.js';

const ROOT = path.resolve(import.meta.dirname, '../..');
const RUN_GAP_M = 0.9, RUN_RADIUS = 0.25;
const SCENERY_HEIGHT_M = { fenceSection: 1.6, stiltShack: 6, rustedPickup: 1.95, waterTower: 7.5, warningSign: 3.6, gatorSign: 3.6 };
// how much road a roadside piece covers, metres, for the overlap check (a fence: per section)
const FOOTPRINT_M = { ...SCENERY_FLAT_M, fenceSection: 5, rustedPickup: 5 };
const SEARCH_M = 150, MAX_RISE_M = 0.35, SLOPE_CHECK_M = 3;
// a WebP's pixel size, read from its header (VP8X, VP8L or VP8)
function webpSize(file) {
  const b = fs.readFileSync(file), kind = b.toString('ascii', 12, 16);
  if (kind === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  if (kind === 'VP8L') { const n = b.readUInt32LE(21); return [1 + (n & 0x3fff), 1 + ((n >> 14) & 0x3fff)]; }
  return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
}
const CLEAR_M = 3;   // road left free between a roadside piece and a crossing or low obstacle
const dry = process.argv.includes('--dry');

const dir = path.join(ROOT, 'assets/seasons');
for (const id of fs.readdirSync(dir).sort()) {
  const file = path.join(dir, id, 'season.json');
  if (!fs.existsSync(file) || id === 'swamp-summer') continue;   // the reference itself stays as authored
  const season = JSON.parse(fs.readFileSync(file, 'utf8')), t = season.trail, art = season.art, S = t.obstacleScale ?? 1, log = [];
  for (const r of t.obstacleRuns ?? []) {
    if (r.gap !== RUN_GAP_M || r.radius !== RUN_RADIUS || r.gaps) log.push(`run ${r.id}: gap ${r.gap} → ${RUN_GAP_M}, radius ${r.radius} → ${RUN_RADIUS}`);
    r.gap = RUN_GAP_M; r.radius = RUN_RADIUS; delete r.gaps;
  }
  for (const [k, h] of Object.entries(SCENERY_HEIGHT_M)) if (art[k] && art[k].heightM !== h) { log.push(`${k} height ${art[k].heightM} → ${h}`); art[k].heightM = h; }
  const busy = [
    ...(t.obstacleRuns ?? []).map(r => [r.x - RUN_RADIUS * S, r.x - RUN_RADIUS * S + runLength(r, S)]),
    ...(t.props ?? []).map(p => { const w = (t.propKinds?.[p.kind]?.width ?? 2) * S; return [p.x - w / 2, p.x + w / 2]; }),
    ...(t.stations ?? []).map(s => [s.x - STATION_WIDTH_M / 2, s.x + STATION_WIDTH_M / 2]),
    // a deep bog's pit: nothing stands in it (its half length is the map's MUD_HARDNESS bogHalfM, else 10 m)
    ...(t.heavyMud ?? []).map(c => { const h = seasonSurfaces(season).mud?.bogHalfM ?? 10; return [c - h, c + h]; }),
    // each highway's banner, at its start and past its speed camera (as src/render/layers/props.js draws them)
    ...(t.highways ?? []).flatMap(h => [h.x0 + HIGHWAY_SIGN_WIDTH_M, h.x1 - SPEED_TRAP_FROM_END_M + HIGHWAY_SIGN_WIDTH_M / 2 + 1].map(x => [x - HIGHWAY_SIGN_WIDTH_M / 2, x + HIGHWAY_SIGN_WIDTH_M / 2])),
  ];
  for (const it of t.scenery ?? []) {
    if (!art[it.art] && art.warningSign) { log.push(`scenery ${it.art} at ${it.x} has no art here → warningSign`); it.art = 'warningSign'; }
    const span = () => { const w = (FOOTPRINT_M[it.art] ?? 3) * (it.art === 'fenceSection' ? it.count ?? 1 : 1); return [it.x - (it.art === 'fenceSection' ? 2.5 : w / 2), it.x + w - (it.art === 'fenceSection' ? 2.5 : w / 2)]; };
    const from = it.x;
    for (let guard = 0; guard < 50; guard++) {
      const [a, b] = span(), hit = busy.find(([c, d]) => b > c - CLEAR_M && a < d + CLEAR_M);
      if (!hit) break;
      it.x = Math.round((hit[1] + CLEAR_M + (it.x - a)) * 10) / 10;
    }
    if (it.x !== from) log.push(`scenery ${it.art} ${from} → ${it.x} (clear of the road obstacles)`);
  }
  // every roadside piece records its picture's size, so its drawn width is known without the image
  for (const k of Object.keys(SCENERY_HEIGHT_M)) if (art[k] && !art[k].crop) { const [w, h] = webpSize(path.join(dir, id, art[k].file)); art[k].crop = [0, 0, w, h]; log.push(`${k} size recorded ${w}×${h}`); }
  const widthOf = it => { const a = art[it.art]; return a ? (a.crop[2] - a.crop[0]) * a.heightM / (a.crop[3] - a.crop[1]) : 0; };
  const isClear = (x, w) => !busy.some(([c, d]) => x + w / 2 > c - CLEAR_M && x - w / 2 < d + CLEAR_M);
  for (let pass = 0; pass < 3; pass++) {
    const terrain = createTerrain(t, seasonSurfaces(season)), rise = (x, w) => { let lo = Infinity, hi = -Infinity; for (let d = -w / 2; d <= w / 2; d += 0.25) { const y = terrain.visH(x + d); lo = Math.min(lo, y); hi = Math.max(hi, y); } return hi - lo; };
    for (const it of t.scenery ?? []) {
      const w = widthOf(it); if (art[it.art]?.lean || w < SLOPE_CHECK_M || rise(it.x, w) <= MAX_RISE_M) continue;
      let best = it.x, bestRise = rise(it.x, w);
      for (let d = 1; d <= SEARCH_M; d += 1) for (const x of [it.x + d, it.x - d]) {
        if (x < t.start + 10 || x > t.depot - 10 || !isClear(x, w)) continue;
        const r = rise(x, w); if (bestRise > MAX_RISE_M && r < bestRise - 0.02) { best = x; bestRise = r; }
      }
      best = Math.round(best * 10) / 10;
      if (best !== it.x) { log.push(`scenery ${it.art} ${it.x} → ${best} (level ground: rise ${bestRise.toFixed(2)} m)`); it.x = best; }
    }
  }
  console.log(`${id}: ${log.length ? `\n  ${log.join('\n  ')}` : 'already in style'}`);
  if (!dry && log.length) fs.writeFileSync(file, JSON.stringify(season, null, 2) + '\n');
}
