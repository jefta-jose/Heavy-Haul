import { seededRandom } from './math.js';

// Static obstacles on the trail. Every shape the tires hit is also what the renderer draws:
// boulders use hulls traced from rock art, crushable shale breaks under the vehicle's weight,
// and fallen logs are round bodies lying across the track.

export const CRUSH_IMPULSE = 900;   // N·s of accumulated tire impulse that breaks a crushable rock

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
  const reserved = x => runs.some(r => x > r.x0 - pad && x < r.x1 + pad) || terrain.nearHole(x, 1.5 * S) || (trail.bridges ?? []).some(b => x > b.x0 - 6 - pad && x < b.x1 + 3 + pad);

  // Body from a traced hull, sitting `above` metres proud of the lowest ground under it.
  const rockBody = (x, aboveM, widthM) => {
    const above = aboveM * S, wM = widthM * S;
    const sh = hulls[Math.floor(rr() * hulls.length)], s = wM / sh.w, flip = rr() < 0.5;
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

  // climbable boulders on every firm section
  for (const [z0, z1, s] of zones) {
    if (s === 'mud') continue;
    const gap = (s === 'rock' ? 5 : 11) * Math.sqrt(S);
    for (let x = z0 + 7; x < z1 - 7; x += gap + rr() * gap) if (!reserved(x) && !gardenAt(x) && !nearStep(x) && !nearCalm(x, 8 + pad)) boulder(x, s === 'creek' ? 0.16 + rr() * 0.13 : 0.2 + rr() * 0.2, 1.1 + rr() * 0.9);
  }
  for (const [z0, z1, s] of zones) {
    if (s === 'mud') continue;
    for (let x = z0 + 8; x < z1 - 8; x += ((s === 'rock' ? 7 : 11) + rr() * 10) * Math.sqrt(S)) if (!reserved(x) && !gardenAt(x) && !nearStep(x) && !nearCalm(x, 6 + pad) && !rocks.some(r => Math.abs(r.x - x) < r.w / 2 + pad)) crushable(x, 0.12 + rr() * 0.09, 0.7 + rr() * 0.4);
  }
  // Repeated low crests articulate the suspension; occasional larger stones
  // punctuate a garden without turning the whole road into a wall of boulders.
  for (const garden of trail.rockGardens ?? []) {
    let index = 0;
    for (let x = garden.x0 + 1; x < garden.x1 - 1; x += (garden.gap + rr() * 0.7) * Math.sqrt(S)) {
      if (reserved(x) || nearCalm(x, 5 + pad)) continue;
      const large = index++ % 5 === 4;
      // rounder stones that stand proud of the mud (still within reach of the tires)
      boulder(x, large ? 0.5 : 0.3 + rr() * 0.12, large ? 1.9 : 1.25 + rr() * 0.4);
      rocks.at(-1).garden = true;
    }
  }
  // Every crossing is a horizontal run of 4–6 obstacles. Each circle sits on
  // its own local road bed; none rests on another log or pipe. Edge gaps are
  // explicit so a spaced run lets a tire return to the road between crests.
  // Logs and pipes are both bedded into the road.
  for (const { spec, index, radius: r, positions } of runs) {
    for (const [order, x] of positions.entries()) {
      const y = Math.max(colH(x - r * 0.6), colH(x), colH(x + r * 0.6)) + r * 0.3;
      const body = world.createBody({ position: V(x, y) });
      body.createFixture(new pl.Circle(r), { friction: spec.kind === 'pipe' ? 0.8 : 0.85, userData: { surf: spec.kind === 'pipe' ? 'rock' : 'wood', obstacle: true } });
      logs.push({ x, y, r, seed: rr(), kind: spec.kind, run: index, order, body });
    }
  }
  return { rocks, logs };
}
