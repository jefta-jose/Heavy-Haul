// Missions: picked in the garage, one at a time, for extra XP. The garage offers a few (assets/missions/missions.json):
// always one class delivery, for the class driven least, and the rest drawn from the other kinds. The chosen one is checked
// against the run as it goes (`track`) and at the depot (`deliver`); when it is done it pays its XP once and a fresh list is
// drawn. Failing costs nothing: it stays chosen for the next run. Saved on this device.
import { classXp } from './progress.js';

const KEY = 'hh_missions';
// how each kind is judged, from the run so far: { cls, time, helped, maxDamage, cameraKmh, crushes, bogs, delivered }.
// `done` says it is achieved; `failed` that this run can no longer do it (the chip glows red and slides away);
// `shown` is the progress for the chip on the road, '' for none (the chip then just names the mission).
const KINDS = {
  classDelivery: { done: (m, r) => r.delivered && r.cls === m.class, failed: (m, r) => r.cls !== m.class, shown: () => '' },
  timed: { done: (m, r) => r.delivered && r.time < m.minutes * 60, failed: (m, r) => r.time >= m.minutes * 60, shown: (m, r) => `${clock(r.time)} / ${m.minutes}:00` },
  noHelp: { done: (m, r) => r.delivered && !r.helped, failed: (m, r) => r.helped, shown: () => '' },
  clean: { done: (m, r) => r.delivered && r.maxDamage <= m.maxDamage, failed: (m, r) => r.maxDamage > m.maxDamage, shown: (m, r) => `worst damage ${Math.round(r.maxDamage)}% / ${m.maxDamage}%` },
  speed: { done: (m, r) => r.cameraKmh >= m.kmh, shown: (m, r) => (r.cameraKmh ? `best ${r.cameraKmh} / ${m.kmh} km/h` : `${m.kmh} km/h at a camera`) },
  crusher: { done: (m, r) => r.crushes >= m.count, shown: (m, r) => `${Math.min(r.crushes, m.count)} / ${m.count}` },
  bogs: { done: (m, r) => r.bogs >= m.count, shown: (m, r) => `${Math.min(r.bogs, m.count)} / ${m.count}` },
};
const clock = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const missionXp = (m, cls) => Math.round(m.type === 'classDelivery' ? classXp(m.xp, m.class) : m.xp);

export function createMissions({ missions = [], offerCount = 4 } = {}, classes = [], store = typeof localStorage === 'undefined' ? null : localStorage, random = Math.random) {
  const byId = new Map(missions.filter(m => KINDS[m.type]).map(m => [m.id, m]));
  let state = { offers: [], active: null, driven: {} };
  try { const s = JSON.parse(store?.getItem(KEY)); if (s) state = { offers: (s.offers ?? []).filter(id => byId.has(id)), active: byId.has(s.active) ? s.active : null, driven: s.driven ?? {} }; } catch (e) {}
  const save = () => { try { store?.setItem(KEY, JSON.stringify(state)); } catch (e) {} };
  const pickFrom = (list, n) => { const a = [...list]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, n); };
  // a fresh list: the least-driven class's delivery, then others, never the one just done
  function draw(except = null) {
    const all = [...byId.values()].filter(m => m.id !== except);
    const least = [...classes].sort((a, b) => (state.driven[a] ?? 0) - (state.driven[b] ?? 0))[0];
    const own = all.find(m => m.type === 'classDelivery' && m.class === least);
    const rest = pickFrom(all.filter(m => m.type !== 'classDelivery'), offerCount - (own ? 1 : 0));
    state.offers = [...(own ? [own.id] : []), ...rest.map(m => m.id)];
    save();
  }
  if (state.offers.length < Math.min(offerCount, byId.size) && !state.active) draw();
  if (state.active && !state.offers.includes(state.active)) state.offers.unshift(state.active);

  function finish(m, cls) { const xp = missionXp(m, cls); state.active = null; draw(m.id); return { mission: m, xp }; }
  return {
    get offers() { return state.offers.map(id => byId.get(id)); },
    get active() { return byId.get(state.active) ?? null; },
    xpFor: m => missionXp(m),
    // choose an offered mission, or the chosen one again to put it down
    choose(id) { state.active = state.active === id || !state.offers.includes(id) ? null : id; save(); return this.active; },
    // during a run: progress for the chip, and the mission itself once a live one (speed, crushing, bogs) is done
    track(run) {
      const m = this.active; if (!m) return null;
      if (!run.delivered && KINDS[m.type].done(m, run)) return { done: finish(m, run.cls) };
      return { mission: m, shown: KINDS[m.type].shown(m, run), failed: !!KINDS[m.type].failed?.(m, run) };
    },
    // whether this run has already broken the chosen mission (checked even while you drive a service truck)
    failed(run) { const m = this.active; return !!(m && KINDS[m.type].failed?.(m, run)); },
    // at the depot: counts the class as driven, and finishes the mission if this run did it
    deliver(run) {
      state.driven[run.cls] = (state.driven[run.cls] ?? 0) + 1;
      const m = this.active, done = m && KINDS[m.type].done(m, { ...run, delivered: true }) ? finish(m, run.cls) : null;
      save(); return done;
    },
  };
}
