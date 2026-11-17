import { DAMAGE_START_KMH } from '../game-config.js';

const names = { rottenLog: 'Rotten logs', log: 'Log crossing', pipe: 'Pipe crossing', drum: 'Drum crossing', oilDrum: 'Drum crossing', pole: 'Pole crossing', pitProp: 'Pit props', roller: 'Roller crossing', bamboo: 'Bamboo bundles', steamPipe: 'Steam pipes', charredLog: 'Charred logs', buriedTyres: 'Buried tyres' };

// Shared by the route preview and coaching: use the actual authored crossings.
export function routeFeatures(trail, vehicleMassT = 0) {
  return [
    ...(trail.obstacleRuns ?? []).map(r => {
      const radius = r.radius * (trail.obstacleScale ?? 1);
      let end = r.x + radius;
      for (let i = 1; i < r.count; i++) end += 2 * radius + (r.gaps?.[i - 1] ?? r.gap ?? 1);
      const crush = trail.obstacleKinds?.[r.kind]?.crush;
      const breakable = !!crush && vehicleMassT >= (crush.minMassT ?? 0);
      return { x: r.x - radius, end, kind: 'crossing', label: names[r.kind] ?? 'Rough crossing', advice: breakable ? 'Breakable debris · controlled momentum' : `Slow to ${DAMAGE_START_KMH} km/h`, breakable };
    }),
    ...(trail.props ?? []).filter(p => trail.propKinds?.[p.kind]).map(p => {
      const kind = trail.propKinds[p.kind], half = kind.width * (trail.obstacleScale ?? 1) / 2;
      const breakable = !!kind.crush && vehicleMassT >= (kind.crush.minMassT ?? 0);
      const label = names[p.kind] ?? p.kind.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());
      return { x: p.x - half, end: p.x + half, kind: 'crossing', label, breakable, advice: breakable ? 'Breakable debris · controlled momentum' : `Slow to ${DAMAGE_START_KMH} km/h` };
    }),
    ...(trail.heavyMud ?? []).map(x => ({ x: x - 12, end: x + 12, kind: 'bog', label: 'Deep bog', advice: 'AWD + DIFF · steady throttle' })),
    ...(trail.stations ?? []).map(s => ({ x: s.x, end: s.x + 8, kind: 'station', label: 'Service station', advice: 'Stop to refuel and repair' })),
    ...(trail.checkpoints ?? []).filter(x => x > trail.start).map(x => ({ x, end: x + 2, kind: 'checkpoint', label: 'Checkpoint', advice: 'Keep moving' })),
    { x: trail.depot, end: trail.depot + 10, kind: 'depot', label: 'Depot', advice: 'Finish your delivery' },
  ].sort((a, b) => a.x - b.x);
}

export function drivingAdvice({ st, ctl, angle = 0, stuckSeconds = 0, next, distance = Infinity }) {
  if (st.damage >= 100) return { text: 'Engine wrecked · recovery required', tone: 'danger' };
  if (st.fuel <= 0) return { text: 'Tank empty · call recovery', tone: 'danger' };
  if (ctl.handbrake && ctl.gas > 0.1) return { text: 'Release the handbrake', tone: 'warn' };
  if (Math.abs(angle) > 0.65) return { text: 'Unstable · ease off the throttle', tone: 'warn' };
  if (stuckSeconds > 2) {
    if (!ctl.awd) return { text: 'Losing traction · enable AWD', tone: 'warn' };
    if (!ctl.diff) return { text: 'Losing traction · lock DIFF', tone: 'warn' };
    if (st.slip > 1.5) return { text: 'Wheelspin · ease off, then try again', tone: 'warn' };
    return { text: 'Little progress · reverse or call recovery', tone: 'warn' };
  }
  const kmh = Math.abs(st.speed) * 3.6;
  if (next?.kind === 'crossing' && !next.breakable && distance < Math.max(25, st.speed * st.speed / 6) && kmh > DAMAGE_START_KMH) return { text: `Crossing ahead · brake to ${DAMAGE_START_KMH} km/h`, tone: 'warn' };
  if (st.damage > 60) return { text: 'Heavy damage · repair at the next station', tone: 'danger' };
  if (st.fuel < 15) return { text: 'Low fuel · stop at the next station', tone: 'warn' };
  return null;
}
