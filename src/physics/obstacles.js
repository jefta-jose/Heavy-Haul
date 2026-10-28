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
  const reserved = x => (trail.logPiles ?? []).some(p => Math.abs(x - p.x) < 4) || (trail.bridges ?? []).some(b => x > b.x0 - 2 && x < b.x1 + 2);

  // Body from a traced hull, sitting `above` metres proud of the lowest ground under it.
  const rockBody = (x, above, wM) => {
    const sh = hulls[Math.floor(rr() * hulls.length)], s = wM / sh.w, flip = rr() < 0.5;
    const g = Math.min(visH(x - wM * 0.35), visH(x), visH(x + wM * 0.35));
    const by = g + above - (sh.h - sh.top) * s;
    const verts = sh.hull.map(([px, py]) => V((px - sh.w / 2) * s * (flip ? -1 : 1), (sh.h - py) * s));
    const body = world.createBody({ position: V(x, by) });
    return { body, verts, rec: { x, y: by, w: wM, h: sh.h * s, flip, above } };
  };
  const boulder = (x, above, wM) => {
    const { body, verts, rec } = rockBody(x, above, wM);
    body.createFixture(new pl.Polygon(verts), { friction: 0.72, userData: { surf: 'rock' } });
    rocks.push(rec);
  };
  const crushable = (x, above, wM) => {
    const { body, verts, rec } = rockBody(x, above, wM);
    Object.assign(rec, { crush: true, alive: true, hit: 0, body });
    body.createFixture(new pl.Polygon(verts), { friction: 0.8, userData: { surf: 'rock', crush: rec } });
    rocks.push(rec);
  };

  // climbable boulders on every firm section, sized for 0.87 m tires
  for (const [z0, z1, s] of zones) {
    if (s === 'mud') continue;
    const gap = s === 'rock' ? 6 : 16;
    for (let x = z0 + 7; x < z1 - 7; x += gap + rr() * gap) if (!reserved(x) && !nearStep(x) && !nearCalm(x, 8)) boulder(x, s === 'creek' ? 0.22 + rr() * 0.15 : 0.3 + rr() * 0.28, 1.1 + rr() * 0.9);
  }
  for (const [z0, z1, s] of zones) {
    if (s === 'mud') continue;
    for (let x = z0 + 8; x < z1 - 8; x += (s === 'rock' ? 7 : 11) + rr() * 10) if (!reserved(x) && !nearStep(x) && !nearCalm(x, 6) && !rocks.some(r => Math.abs(r.x - x) < r.w / 2 + 1.5)) crushable(x, 0.2 + rr() * 0.16, 0.55 + rr() * 0.4);
  }
  // fallen logs; in mud they are smaller and lie half sunk
  for (const [z0, z1, s] of zones) {
    for (let x = z0 + 10; x < z1 - 8; x += (s === 'mud' ? 22 : 9) + rr() * 12) {
      if (nearStep(x) || nearCalm(x, 8) || trail.heavyMud.some(h => Math.abs(h - x) < 14) || rocks.some(r => Math.abs(r.x - x) < r.w / 2 + 1.8)) continue;
      if (reserved(x)) continue;
      const mud = s === 'mud', r = mud ? 0.17 + rr() * 0.05 : 0.2 + rr() * 0.13, y = Math.max(colH(x - r), colH(x), colH(x + r)) + r * (mud ? 0.35 : 0.72);
      const b = world.createBody({ position: V(x, y) });
      b.createFixture(new pl.Circle(r), { friction: 0.75, userData: { surf: 'rock' } });
      logs.push({ x, y, r, seed: rr() });
    }
  }
  // Three trunks below and one above: four substantial, individually collidable logs. Slightly
  // bury the bottom row so a small truck has a climbable approach rather than a vertical wall.
  for (const [pile, spec] of (trail.logPiles ?? []).entries()) {
    const r = spec.radius, spacing = r * 1.9;
    const base = Math.max(visH(spec.x - spacing), visH(spec.x), visH(spec.x + spacing)) + r * 0.3;
    for (const [dx, dy, radius] of [[-spacing, 0, r], [0, 0, r], [spacing, 0, r], [-spacing / 2, r * 1.58, r * 0.9]]) {
      const x = spec.x + dx, y = base + dy, b = world.createBody({ position: V(x, y) });
      b.createFixture(new pl.Circle(radius), { friction: 0.85, userData: { surf: 'wood' } });
      logs.push({ x, y, r: radius, seed: rr(), pile, stacked: true, body: b });
    }
  }
  return { rocks, logs };
}
