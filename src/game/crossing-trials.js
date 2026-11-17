import { routeFeatures } from './drive-coach.js';

// Optional technique goals on existing crossings. A full rig must leave the
// crossing without new damage or assistance. Teleports never earn a clearance.
export function createCrossingTrials(trail, vehicleMassT = 0) {
  const crossings = routeFeatures(trail, vehicleMassT).filter(f => f.kind === 'crossing' && !f.breakable);
  const passed = new Set();
  let lastX = null, lastDamage = 0, current = null;
  return {
    update({ x, front, rear, damage, assisted }) {
      if (lastX == null || Math.abs(x - lastX) > 5) {
        for (let i = 0; i < crossings.length; i++) if (front >= crossings[i].x) passed.add(i);
        current = null; lastX = x; lastDamage = damage; return null;
      }
      lastX = x;
      if (!current) {
        const index = crossings.findIndex((f, i) => !passed.has(i) && front >= f.x && rear <= f.end);
        if (index >= 0) current = { index, damage: lastDamage, failed: assisted };
      }
      lastDamage = damage;
      if (!current) return null;
      current.failed ||= assisted || damage > current.damage + 0.1;
      const feature = crossings[current.index];
      if (rear <= feature.end) return null;
      passed.add(current.index);
      const clean = !current.failed; current = null;
      return { clean, label: feature.label };
    },
  };
}
