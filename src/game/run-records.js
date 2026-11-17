const KEY = 'hh_run_records_v1';
const clock = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
const storage = () => { try { return globalThis.localStorage; } catch { return null; } };
// Separate records for every map, truck, upgrade setup and power. Recovery and
// power-assisted runs still finish normally, but cannot replace an unassisted PB.
export function recordKey(season, car) {
  return JSON.stringify([season.id, car.id, ['engine', 'suspension', 'speed', 'grip'].map(k => car.levels?.[k] ?? 0), car.power ?? null]);
}
export function checkpointFeedback(season, car, checkpoint, seconds, store = storage()) {
  let previous;
  try { previous = JSON.parse(store?.getItem(KEY))?.[recordKey(season, car)]?.splits?.[checkpoint]; } catch {}
  if (!Number.isFinite(previous) || previous <= 0) return `Checkpoint · ${clock(seconds)}`;
  const difference = seconds - previous;
  return `Checkpoint · ${clock(seconds)} · ${clock(Math.abs(difference))} ${difference <= 0 ? 'ahead of' : 'behind'} your best run`;
}
export function finishRecord(season, car, run, store = storage()) {
  const medals = ['Trail complete'];
  if (run.maxDamage <= 10) medals.push('Clean haul');
  if (!run.helped && !run.recoveries) medals.push('Self sufficient');
  if (run.bogsClean >= (season.trail.heavyMud?.length ?? 0) && run.bogsClean > 0) medals.push('Bog master');
  const eligible = !run.helped && !run.recoveries && !run.powered;
  let all = {};
  try { const saved = JSON.parse(store?.getItem(KEY)); if (saved && typeof saved === 'object' && !Array.isArray(saved)) all = saved; } catch {}
  const key = recordKey(season, car), previous = all[key];
  const best = Number.isFinite(previous?.time) && previous.time > 0 ? previous.time : null;
  const improved = eligible && (best == null || run.time < best);
  if (improved) {
    all[key] = { time: run.time, splits: run.splits ?? {} };
    try { store?.setItem(KEY, JSON.stringify(all)); } catch {}
  }
  return { medals, improved, summary: !eligible ? 'Assisted run · PB unchanged' : improved ? (best == null ? 'First personal best' : `New best · ${clock(best - run.time)} faster`) : `Personal best ${clock(best)}`, time: clock(run.time) };
}
