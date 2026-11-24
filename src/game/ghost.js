// The ghost of your best run: the fastest delivery on each map is recorded (where the truck was, its tilt and how far its
// wheels had turned, every GHOST_SAMPLE_S of the run's clock) and replayed see-through beside you on the next runs there.
// Only the pose is kept, not the inputs, so a ghost still plays after tuning or physics changes. Saved on this device, one key
// per map (hh_ghost_<map>); it is not progress, so it stays out of the cloud save. Settings can turn it off (hh_ghost_on).
import { GHOST_SAMPLE_S } from '../game-config.js';

const key = map => `hh_ghost_${map}`, ON = 'hh_ghost_on';
const r2 = n => Math.round(n * 100) / 100, r3 = n => Math.round(n * 1000) / 1000;

export function createGhost(store = typeof localStorage === 'undefined' ? null : localStorage) {
  let rec = null, best = null, bestMap = null;
  const load = map => { try { const g = JSON.parse(store?.getItem(key(map))); return g?.d?.length ? g : null; } catch (e) { return null; } };
  const api = {
    get enabled() { try { return store?.getItem(ON) !== '0'; } catch (e) { return true; } },
    set enabled(on) { try { store?.setItem(ON, on ? '1' : '0'); } catch (e) {} },
    // the best run on this map: { car, time, d } or null
    best(map) { if (bestMap !== map) { bestMap = map; best = load(map); } return best; },
    // a new run: start recording, and get the ghost to race (null when there is none or ghosts are off)
    start(map, carId) {
      rec = { map, car: carId, d: [], next: 0 };
      const g = api.best(map);
      return g && api.enabled ? g : null;
    },
    // called every frame of the run with its clock and the main truck's pose
    sample(time, x, y, a, spin) {
      if (!rec) return;
      while (time >= rec.next) { rec.d.push(r2(x), r2(y), r3(a), r2(spin)); rec.next += GHOST_SAMPLE_S; }
    },
    // where the ghost is at this point of the run's clock, or null once it has finished
    poseAt(g, time) {
      const i = time / GHOST_SAMPLE_S, k = Math.floor(i), n = g.d.length / 4;
      if (k >= n - 1) return null;
      const f = i - k, at = j => g.d[k * 4 + j] + (g.d[(k + 1) * 4 + j] - g.d[k * 4 + j]) * f;
      return { x: at(0), y: at(1), a: at(2), spin: at(3) };
    },
    // the run reached the depot: kept when it beats the best time here. Returns { best, previous } (previous null when first)
    finish(time) {
      if (!rec) return null;
      const before = api.best(rec.map), r = rec; rec = null;
      if (before && before.time <= time) return { best: false, previous: before.time };
      const g = { car: r.car, time: r3(time), d: r.d };
      try { store?.setItem(key(r.map), JSON.stringify(g)); } catch (e) {}
      best = g; bestMap = r.map;
      return { best: true, previous: before?.time ?? null };
    },
    stop() { rec = null; },
  };
  return api;
}
