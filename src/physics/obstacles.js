import { seededRandom } from './math.js';
import { STATION_WIDTH_M, SPEED_SIGN_AREA_GAP_M } from '../game-config.js';

// Static obstacles on the trail. Every shape the tires hit is also what the renderer draws:
// boulders use hulls traced from rock art, crushable shale breaks under the vehicle's weight,
// and fallen logs are round bodies lying across the track. Which round and traced kinds exist, and
// how each one breaks, is data: trail.obstacleKinds and trail.propKinds in season.json.

export const CRUSH_IMPULSE = 900;


export function buildObstacles({ pl, world, terrain, trail, hulls }) {
  const V = (x, y) => new pl.Vec2(x, y);
  const { zones, visH, colH, nearStep, nearCalm } = terrain;
  const rocks = [], logs = [];
  const rr = seededRandom(trail.obstacleSeed);
  const S = trail.obstacleScale ?? 1;   // every rock, log and pipe grows by this; gaps between run members stay as authored
  const runs = (trail.obstacleRuns ?? []).map((spec, index) => {
    const radius = spec.radius * S, positions = [spec.x];
    for (let i = 1; i < spec.count; i++) positions.push(positions.at(-1) + 2 * radius + (spec.gaps?.[i - 1] ?? spec.gap));
    return { spec, index, radius, positions, x0: positions[0] - radius, x1: positions.at(-1) + radius };
  });
  const pad = 2 * S;   // room for a rock's half width around anything it must not sit on
  const gardenAt = x => (trail.rockGardens ?? []).find(g => x > g.x0 - pad && x < g.x1 + pad);
  const propKinds = trail.propKinds ?? {};
  const props = (trail.props ?? []).map(p => ({ x: p.x, kind: propKinds[p.kind], name: p.kind }));
  const reserved = x => runs.some(r => x > r.x0 - pad && x < r.x1 + pad) || props.some(p => Math.abs(p.x - x) < p.kind.width * S / 2 + pad) || terrain.nearHole(x, 1.5 * S);

  // Body from a traced hull, sitting `above` metres proud of the lowest ground under it.
  const rockBody = (x, aboveM, widthM, hull = null, canFlip = true) => {
    const above = aboveM * S, wM = widthM * S;
    const sh = hull ?? hulls[Math.floor(rr() * hulls.length)], s = wM / sh.w, flip = rr() < 0.5 && canFlip;
    const g = Math.min(visH(x - wM * 0.35), visH(x), visH(x + wM * 0.35));
    const by = g + above - (sh.h - sh.top) * s;
    const verts = sh.hull.map(([px, py]) => V((px - sh.w / 2) * s * (flip ? -1 : 1), (sh.h - py) * s));
    const body = world.createBody({ position: V(x, by) });
    return { body, verts, rec: { x, y: by, w: wM, h: sh.h * s, flip, above, body } };
  };
  const boulder = (x, above, wM) => {
    const { body, verts, rec } = rockBody(x, above, wM);
    body.createFixture(new pl.Polygon(verts), { friction: 0.72, userData: { surf: 'rock', obstacle: true } });
    rocks.push(rec);
  };
  const crushable = (x, above, wM) => {
    const { body, verts, rec } = rockBody(x, above, wM);
    Object.assign(rec, { crush: true, alive: true, hit: 0, body });
    body.createFixture(new pl.Polygon(verts), { friction: 0.8, userData: { surf: 'rock', crush: rec, obstacle: true } });
    rocks.push(rec);
  };

  // Traced props: solid, or broken by tires.
  const placeProp = (x, kind, name) => {
    const { body, verts, rec } = rockBody(x, kind.above, kind.width, kind.hull, kind.flip !== false);
    Object.assign(rec, { art: kind.art, prop: name, surf: kind.surf });
    if (kind.crush) Object.assign(rec, { crush: true, alive: true, hit: 0, body, ...kind.crush });
    body.createFixture(new pl.Polygon(verts), { friction: kind.friction, userData: { surf: kind.surf, obstacle: true, crush: kind.crush ? rec : undefined } });
    rocks.push(rec);
  };
  // trail.crushables: how close together things that break under the tires lie, per surface (metres, [min, max])
  const crushables = trail.crushables ?? {};
  const between = ([a, b]) => a + rr() * (b - a);

  // climbable boulders and loose stones on every firm section, unless the season turns them off (trail.stones: false)
  const stones = trail.stones !== false;
  for (const [z0, z1, s] of zones) {
    if (s === 'mud' || !stones) continue;
    const gap = (s === 'rock' ? 5 : 11) * Math.sqrt(S) * (crushables[s] ? 2 : 1);   // fewer hard boulders where the crushables go
    for (let x = z0 + 7; x < z1 - 7; x += gap + rr() * gap) if (!reserved(x) && !gardenAt(x) && !nearStep(x) && !nearCalm(x, 8 + pad)) boulder(x, s === 'creek' ? 0.16 + rr() * 0.13 : 0.2 + rr() * 0.2, 1.1 + rr() * 0.9);
  }
  for (const [z0, z1, s] of zones) {
    if (s === 'mud' || !stones) continue;
    for (let x = z0 + 8; x < z1 - 8; x += crushables[s] ? between(crushables[s]) : ((s === 'rock' ? 7 : 11) + rr() * 10) * Math.sqrt(S)) if (!reserved(x) && !gardenAt(x) && !nearStep(x) && !nearCalm(x, 6 + pad) && !rocks.some(r => Math.abs(r.x - x) < r.w / 2 + (crushables[s] ? crushables.room : pad))) crushable(x, 0.12 + rr() * 0.09, 0.7 + rr() * 0.4);
  }
  // Repeated low crests articulate the suspension; occasional larger stones
  // punctuate a garden without turning the whole road into a wall of boulders.
  for (const garden of trail.rockGardens ?? []) {
    let index = 0;
    for (let x = garden.x0 + 1; x < garden.x1 - 1; x += (garden.gap + rr() * 0.7) * Math.sqrt(S)) {
      if (reserved(x) || nearCalm(x, 5 + pad)) continue;
      const large = index++ % 5 === 4;
      // rounder stones that stand proud of the mud (still within reach of the tires)
      // every other small stone in a garden breaks under the tires
      if (crushables.rock && !large && index % 2 === 1) crushable(x, 0.3 + rr() * 0.12, 1.25 + rr() * 0.4);
      else boulder(x, large ? 0.5 : 0.3 + rr() * 0.12, large ? 1.9 : 1.25 + rr() * 0.4);
      rocks.at(-1).garden = true;
    }
  }
  // Every crossing is a horizontal run of 4–6 obstacles. Each circle sits on
  // its own local road bed; none rests on another log or pipe. Edge gaps are
  // explicit so a spaced run lets a tire return to the road between crests.
  // Everything round is bedded into the road.
  for (const { spec, index, radius: r, positions } of runs) {
    for (const [order, x] of positions.entries()) {
      const y = Math.max(colH(x - r * 0.6), colH(x), colH(x + r * 0.6)) + r * 0.3;
      const body = world.createBody({ position: V(x, y) });
      const kind = trail.obstacleKinds[spec.kind], rec = { x, y, r, seed: rr(), kind: spec.kind, run: index, order, body };
      if (kind.crush) Object.assign(rec, { crush: true, alive: true, hit: 0, above: r, w: 2 * r, surf: kind.surf, ...kind.crush });
      body.createFixture(new pl.Circle(r), { friction: kind.friction, userData: { surf: kind.surf, obstacle: true, crush: kind.crush ? rec : undefined } });
      logs.push(rec);
    }
  }
  for (const { x, kind, name } of props) placeProp(x, kind, name);
  // every few crushables along the rock and dirt, a branch pile instead of a stone
  if (crushables.pileEvery && propKinds.branchPile) {
    const stones = rocks.filter(r => r.crush && !r.prop && !r.garden && crushables[zones.find(z => r.x >= z[0] && r.x < z[1])?.[2]]);
    stones.forEach((r, i) => { if (i % crushables.pileEvery === 0) { const x = r.x; world.destroyBody(r.body); rocks.splice(rocks.indexOf(r), 1); placeProp(x, propKinds.branchPile, 'branchPile'); } });
  }
  // A highway stays clean: nothing on it at all, unless it lists stones that break under any truck (rockEvery, rockImpulse).
  // Last, so the rest of the trail's random stones stay where they are.
  for (const h of trail.highways ?? []) {
    if (!h.rockEvery) continue;
    for (let x = h.x0 + 15; x < h.x1 - 15; x += between(h.rockEvery)) { crushable(x, 0.12 + rr() * 0.09, 0.7 + rr() * 0.4); rocks.at(-1).impulse = h.rockImpulse; }
  }
  // A speed limit sign at the first of each group of things that can hurt a truck: logs, pipes, hard rocks and solid props.
  // Whatever any truck breaks gets none, since it does no damage. Rotten logs count, as only the heaviest trucks break them.
  const hurts = o => !o.crush || o.minMassT > 0;
  const solid = [...rocks.filter(hurts).map(r => [r.x - r.w / 2, r.x + r.w / 2]), ...logs.filter(hurts).map(l => [l.x - l.r, l.x + l.r])].sort((a, b) => a[0] - b[0]);
  const speedSigns = [];
  let end = -Infinity;
  for (const [x0, x1] of solid) {
    if (x0 - end >= SPEED_SIGN_AREA_GAP_M && x0 >= trail.start) {
      const st = terrain.stations.find(s => Math.abs(x0 - s.x) < STATION_WIDTH_M / 2 + 2);   // never on a station's building
      speedSigns.push(st ? st.x - STATION_WIDTH_M / 2 - 2 : x0);
    }
    end = Math.max(end, x1);
  }
  return { rocks, logs, speedSigns };
}
