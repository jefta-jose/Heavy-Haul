// Missions are contracts generated at random in the garage (assets/missions/missions.json). A contract is one goal (deliver,
// beat the clock, sprint to a checkpoint, flash speed cameras, crush things, clear bogs, arrive clean) with targets drawn
// from ranges and sized to the trail and the trucks owned, maybe locked to a class or one owned truck, plus 0 to 2 twists
// (no breakdown truck, a damage cap, a time limit, no refuelling, no powers, never stuck). Harder contracts pay more XP.
// One offer is always a depot contract for the class driven least. The chosen one is checked as the run goes (`track`) and
// at the depot (`deliver`); when done it pays once and a fresh list is drawn. Offers not chosen are redrawn after every
// run (`endRun`). Failing costs nothing: it stays chosen. Saved on this device.
import { classXp } from './progress.js';

const KEY = 'hh_missions', VERSION = 2;
const clock = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const hits = (m, r) => (r.cameras ?? []).filter(k => k >= m.kmh).length;

// How each goal is judged from the run so far:
// { cls, car, time, x, helped, maxDamage, cameras, camerasSeen, crushes, bogs, bogsMissed, refuelled, powered, stuckMax, delivered }.
// `done` says it is achieved; `failed` that this run can no longer do it; `shown` is progress for the road chip ('' for none).
// Goals without `depot` finish during the run, the others at the depot.
const GOALS = {
  deliver: { depot: true, done: (m, r) => r.delivered, shown: () => '' },
  timed: { depot: true, done: (m, r) => r.delivered && r.time < m.minutes * 60, failed: (m, r) => r.time >= m.minutes * 60, shown: (m, r) => `${clock(r.time)} / ${clock(m.minutes * 60)}` },
  clean: { depot: true, done: (m, r) => r.delivered && r.maxDamage <= m.maxDamage, failed: (m, r) => r.maxDamage > m.maxDamage, shown: (m, r) => `damage ${Math.round(r.maxDamage)}% / ${m.maxDamage}%` },
  sprint: { done: (m, r) => r.x >= m.x && r.time < m.minutes * 60, failed: (m, r) => r.x < m.x && r.time >= m.minutes * 60, shown: (m, r) => `${Math.max(0, Math.round(m.x - r.x))} m to go · ${clock(r.time)} / ${clock(m.minutes * 60)}` },
  cameras: { done: (m, r) => hits(m, r) >= m.count, failed: (m, r) => (r.camerasSeen ?? 0) - hits(m, r) > m.of - m.count, shown: (m, r) => `${Math.min(hits(m, r), m.count)} / ${m.count} at ${m.kmh}+ km/h` },
  crusher: { done: (m, r) => r.crushes >= m.count, shown: (m, r) => `${Math.min(r.crushes, m.count)} / ${m.count}` },
  bogs: { done: (m, r) => r.bogs >= m.count, failed: (m, r) => (r.bogsMissed ?? 0) > m.of - m.count, shown: (m, r) => `${Math.min(r.bogs, m.count)} / ${m.count} bogs` },
};
// extra rules on top of a goal; each can only fail. `fits` lists the goals it may join.
const TWISTS = {
  noHelp: { failed: (t, r) => r.helped, shown: () => '' },
  clean: { fits: g => g !== 'clean', failed: (t, r) => r.maxDamage > t.maxDamage, shown: (t, r) => `dmg ${Math.round(r.maxDamage)}/${t.maxDamage}%` },
  timed: { fits: g => g === 'deliver' || g === 'clean', failed: (t, r) => r.time >= t.minutes * 60, shown: (t, r) => `${clock(r.time)} / ${clock(t.minutes * 60)}` },
  noRefuel: { failed: (t, r) => r.refuelled, shown: () => '' },
  noPower: { failed: (t, r) => r.powered, shown: () => '' },
  noStuck: { failed: (t, r) => r.stuckMax > t.seconds, shown: () => '' },
};

export function createMissions(data = {}, ctx = {}, store = typeof localStorage === 'undefined' ? null : localStorage, random = Math.random) {
  const { offerCount = 4, baseXp = 500, goals = {}, twists = {}, locks = {}, twistCount = [[0, 1]] } = data;
  if (Array.isArray(ctx)) ctx = { classes: ctx.map(id => ({ id, name: id })) };
  const classes = ctx.classes ?? [], trail = ctx.trail ?? { start: 0, depot: 3500, checkpoints: [], heavyMud: [], highways: [] };
  const owned = () => (ctx.owned?.() ?? []).filter(c => c?.id);
  const className = id => classes.find(c => c.id === id)?.name ?? id;

  const rnd = (a, b) => a + (b - a) * random();
  const int = (a, b) => Math.floor(rnd(a, b + 1));
  const stepped = (a, b, s) => a + s * int(0, Math.floor((b - a) / s));
  const pick = list => list[Math.floor(random() * list.length)];
  const weighted = entries => { const total = entries.reduce((s, [, w]) => s + w, 0); let x = random() * total; for (const [k, w] of entries) if ((x -= w) < 0) return k; return entries.at(-1)?.[0]; };
  const quarterMin = m => Math.max(1, Math.round(m * 4) / 4);   // times in 15 s steps
  const km = (x0, x1) => Math.max(0.2, (x1 - x0) / 1000);
  const topKmh = list => Math.max(0, ...list.map(c => c.topSpeedKmh ?? 0));
  const classFactor = cls => (cls && goals.timed?.classMinPerKm?.[cls]) || 1;

  // one goal with its targets; returns null when this trail cannot host it
  function makeGoal(goal, lock) {
    const g = goals[goal] ?? {}, cls = lock.class, m = { goal };
    const trailKm = km(trail.start, trail.depot), [lo, hi] = g.minPerKm ?? [3, 4];
    if (goal === 'deliver') m.d = 0.25;
    else if (goal === 'timed') {
      const per = rnd(lo, hi); m.minutes = quarterMin(trailKm * per * classFactor(cls)); m.d = 0.3 + 0.7 * (hi - per) / (hi - lo);
    } else if (goal === 'sprint') {
      const cps = (trail.checkpoints ?? []).filter(x => x > trail.start + 300 && x < trail.depot);
      if (!cps.length) return null;
      const i = Math.floor(random() * cps.length), per = rnd(lo, hi);
      m.x = cps[i]; m.minutes = quarterMin(km(trail.start, m.x) * per * classFactor(cls));
      m.d = 0.2 + 0.5 * (hi - per) / (hi - lo) + 0.3 * (i + 1) / cps.length;
    } else if (goal === 'cameras') {
      const of = (trail.highways ?? []).length; if (!of) return null;
      const pool = lock.car ? [lock.car] : owned().filter(c => !cls || c.class === cls);
      const cap = Math.floor(topKmh(pool.length ? pool : owned()) * (g.ofTopSpeed ?? 0.8) / g.step) * g.step;
      const max = Math.min(g.kmh[1], cap); if (max < g.kmh[0]) return null;
      m.of = of; m.count = int(1, of); m.kmh = stepped(g.kmh[0], max, g.step);
      m.d = 0.5 * m.count / of + 0.5 * (m.kmh - g.kmh[0]) / Math.max(1, g.kmh[1] - g.kmh[0]);
    } else if (goal === 'crusher') {
      const scale = trailKm / 3.5, a = Math.round(g.count[0] * scale / g.step) * g.step, b = Math.round(g.count[1] * scale / g.step) * g.step;
      m.count = stepped(Math.max(g.step, a), Math.max(g.step, b), g.step); m.d = (m.count - a) / Math.max(1, b - a);
    } else if (goal === 'bogs') {
      const of = (trail.heavyMud ?? []).length; if (of < (g.min ?? 1)) return null;
      m.of = of; m.count = int(g.min ?? 1, of); m.d = 0.2 + 0.8 * (m.count - (g.min ?? 1)) / Math.max(1, of - (g.min ?? 1));
    } else if (goal === 'clean') {
      const [a, b] = g.maxDamage; m.maxDamage = stepped(a, b, 1); m.d = 0.2 + 0.8 * (b - m.maxDamage) / (b - a);
    } else return null;
    return m;
  }
  function makeTwist(type, m, lock) {
    const t = { type, ...(twists[type] ?? {}) }, out = { type };
    if (type === 'clean') out.maxDamage = stepped(t.maxDamage[0], t.maxDamage[1], 5);
    if (type === 'timed') { const [lo, hi] = goals.timed?.minPerKm ?? [3, 4]; out.minutes = quarterMin(km(trail.start, trail.depot) * (lo + hi) / 2 * classFactor(lock.class) * (t.slack ?? 1.3)); }
    if (type === 'noStuck') out.seconds = int(t.seconds[0], t.seconds[1]);
    return out;
  }
  const fill = (text, t) => text.replace(/\{(\w+)\}/g, (_, k) => (k === 'minutes' ? clock(t.minutes * 60) : t[k]));
  function describe(m) {
    const cn = String(className(m.class) ?? '').replace(/s$/, ''), lockText = m.car ? ` in your ${m.carName}` : m.class ? ` in ${/^[aeiou]/i.test(cn) ? 'an' : 'a'} ${cn} truck` : '';
    const goalText = {
      deliver: 'Deliver to the depot',
      timed: `Reach the depot in under ${clock(m.minutes * 60)}`,
      clean: `Reach the depot under ${m.maxDamage}% damage`,
      sprint: `Reach the ${((m.x - trail.start) / 1000).toFixed(1)} km mark within ${clock(m.minutes * 60)}`,
      cameras: m.count === m.of ? `Pass every speed camera at ${m.kmh} km/h or more` : `Pass ${m.count} speed camera${m.count > 1 ? 's' : ''} at ${m.kmh} km/h or more`,
      crusher: `Crush ${m.count} things`,
      bogs: `Clear ${m.count} deep bogs without being towed`,
    }[m.goal];
    const rules = m.twists.map(t => fill(twists[t.type]?.text ?? t.type, t));
    return goalText + lockText + (rules.length ? `, ${rules.join(', ')}` : '');
  }

  // one contract. `force` pins a class and depot goals (the least-driven class's offer).
  function contract(force = null, avoid = new Set()) {
    for (let tries = 0; tries < 30; tries++) {
      const lock = {};
      if (force) lock.class = force;
      else if (random() < (locks.car?.chance ?? 0) && owned().length) { lock.car = pick(owned()); lock.class = lock.car.class; }
      else if (random() < (locks.class?.chance ?? 0) && classes.length) lock.class = pick(classes).id;
      const choices = Object.entries(goals).filter(([k]) => GOALS[k] && !avoid.has(k) && (!force || GOALS[k].depot)).map(([k, g]) => [k, g.weight ?? 1]);
      if (!choices.length) return null;
      const m = makeGoal(weighted(choices), lock); if (!m) continue;
      const n = Number(weighted(twistCount.map(([k, w]) => [k, w]))) || 0;
      const pool = Object.keys(twists).filter(k => TWISTS[k] && (TWISTS[k].fits?.(m.goal) ?? true) && !(m.goal === 'timed' && k === 'timed'));
      m.twists = [];
      for (let i = 0; i < n && pool.length; i++) { const k = weighted(pool.map(k => [k, twists[k].weight ?? 1])); pool.splice(pool.indexOf(k), 1); m.twists.push(makeTwist(k, m, lock)); }
      if (goals[m.goal]?.needsRule && !m.twists.length && !lock.class) continue;   // a bare delivery is no contract
      if (lock.class) m.class = lock.class;
      if (lock.car) { m.car = lock.car.id; m.carName = lock.car.name; }
      const raw = baseXp * (0.6 + 1.2 * m.d) + m.twists.reduce((s, t) => s + (twists[t.type]?.xp ?? 0), 0) + (lock.car ? locks.car?.xp ?? 0 : lock.class ? locks.class?.xp ?? 0 : 0);
      m.xp = Math.round(classXp(raw, m.class) / 50) * 50;
      const hard = m.d + 0.35 * m.twists.length + (lock.car ? 0.3 : lock.class ? 0.2 : 0);
      m.stars = hard > 1.15 ? 3 : hard > 0.6 ? 2 : 1;
      m.title = pick(goals[m.goal]?.titles ?? [m.goal]);
      m.text = describe(m);
      m.id = `${m.goal}-${Math.floor(random() * 2 ** 32).toString(36)}`;
      delete m.d;
      return m;
    }
    return null;
  }

  let state = { v: VERSION, offers: [], active: null, driven: {} };
  try {
    const s = JSON.parse(store?.getItem(KEY));
    if (s?.v === VERSION) state = { v: VERSION, offers: (s.offers ?? []).filter(m => GOALS[m?.goal]), active: s.active ?? null, driven: s.driven ?? {} };
    else if (s?.driven) state.driven = s.driven;   // older saves: keep which classes were driven
  } catch (e) {}
  if (!state.offers.some(m => m.id === state.active)) state.active = null;
  const save = () => { try { store?.setItem(KEY, JSON.stringify(state)); } catch (e) {} };
  const activeMission = () => state.offers.find(m => m.id === state.active) ?? null;

  // a fresh list: the chosen contract stays, then the least-driven class's depot contract, then others with varied goals
  function draw() {
    const keep = activeMission(), offers = keep ? [keep] : [], used = new Set(offers.map(m => m.goal));
    const least = [...classes].map(c => c.id).sort((a, b) => (state.driven[a] ?? 0) - (state.driven[b] ?? 0))[0];
    if (least && !offers.some(m => m.class === least && GOALS[m.goal].depot)) { const m = contract(least); if (m) { offers.push(m); used.add(m.goal); } }
    while (offers.length < offerCount) {
      const m = contract(null, used.size < Object.keys(goals).length - 1 ? used : new Set()); if (!m) break;
      offers.push(m); used.add(m.goal);
    }
    state.offers = offers; save();
  }
  if (state.offers.length < offerCount) draw();

  function finish(m) { state.active = null; draw(); return { mission: m, xp: m.xp }; }
  const lockFailed = (m, r) => (m.class && r.cls !== m.class) || (m.car && r.car && r.car !== m.car);
  const failedBy = (m, r) => lockFailed(m, r) || !!GOALS[m.goal].failed?.(m, r) || m.twists.some(t => TWISTS[t.type]?.failed(t, r));
  const doneBy = (m, r) => !failedBy(m, r) && GOALS[m.goal].done(m, r);
  const shownFor = (m, r) => [GOALS[m.goal].shown(m, r), ...m.twists.map(t => TWISTS[t.type]?.shown(t, r) ?? '')].filter(Boolean).join(' · ');

  return {
    get offers() { return state.offers; },
    get active() { return activeMission(); },
    xpFor: m => m.xp,
    starsFor: m => m.stars ?? 1,
    // choose an offered mission, or the chosen one again to put it down
    choose(id) { state.active = state.active === id || !state.offers.some(m => m.id === id) ? null : id; save(); return this.active; },
    // during a run: progress for the chip, and the mission itself once a live one is done
    track(run) {
      const m = this.active; if (!m) return null;
      if (!run.delivered && !GOALS[m.goal].depot && doneBy(m, run)) return { done: finish(m) };
      return { mission: m, shown: shownFor(m, run), failed: failedBy(m, run) };
    },
    // whether this run has already broken the chosen mission (checked even while you drive a service truck)
    failed(run) { const m = this.active; return !!(m && failedBy(m, run)); },
    // at the depot: counts the class as driven, finishes the mission if this run did it, and redraws the other offers
    deliver(run) {
      state.driven[run.cls] = (state.driven[run.cls] ?? 0) + 1;
      const m = this.active, r = { ...run, delivered: true };
      if (m && doneBy(m, r)) return finish(m);
      draw(); return null;
    },
    // a run ended without delivering: new offers beside the chosen one
    endRun() { draw(); },
  };
}
