// Missions are contracts generated at random in the garage (assets/missions/missions.json). A contract is one goal (deliver,
// beat the clock, sprint to a checkpoint, flash speed cameras, crush things, clear bogs, arrive clean) with targets drawn
// from ranges and sized to the trail and the trucks owned, maybe locked to a class or one owned truck, plus 0 to 2 twists
// (a damage cap, a time limit, no refuelling, no powers, never stuck). Harder contracts pay more XP.
// One offer is always a depot contract for the class driven least. The chosen one is checked as the run goes (`track`) and
// at the depot (`deliver`); when done it pays once and a fresh list is drawn. Offers not chosen are redrawn after every
// run (`endRun`). Failing costs nothing: it stays chosen. Saved on this device.
//
// Two kinds have a story and pay coins on top (missions.json `featured` and `signature`):
// - Featured: every map has hand-written contracts with a client and a story; one is always on offer for the map chosen.
// - Signature haul: every truck has a job of its own on a home map (its load for a named client). Homes are spread over all
//   maps from each map's `likes` (words in the load, the truck's biomes), so every map and every truck has work; free
//   starters stay on free maps. The first time a truck does its signature haul pays a coin bonus; `signatureDone` counts them.
//
// Reach (user, 2026-11-24): every list keeps most offers doable now (trucks owned, on the map in play), and STRETCH_OFFERS of
// them ask for one next step: a truck not owned yet that is open to buy or opens within STRETCH_RANKS ranks. Never a truck
// far above the player's rank. `needsFor(m)` says what an offer still needs ({ rank } or { buy }), live.
import { classXp } from './progress.js';
import { MISSION_BASE_XP } from '../game-config.js';

const KEY = 'hh_missions', VERSION = 2;
const STRETCH_RANKS = 2;            // a stretch contract's truck opens at most this many ranks above the player's
const STRETCH_OFFERS = [1, 2];      // how many stretch contracts a list holds (picked at random between the two)
const hash = text => { let h = 2166136261; for (const ch of String(text)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return (h >>> 0) / 2 ** 32; };
const clock = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const hits = (m, r) => (r.cameras ?? []).filter(k => k >= m.kmh).length;

// How each goal is judged from the run so far:
// { cls, car, time, x, maxDamage, cameras, camerasSeen, crushes, bogs, bogsMissed, refuelled, powered, stuckMax, delivered }.
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
  clean: { fits: g => g !== 'clean', failed: (t, r) => r.maxDamage > t.maxDamage, shown: (t, r) => `dmg ${Math.round(r.maxDamage)}/${t.maxDamage}%` },
  timed: { fits: g => g === 'deliver' || g === 'clean', failed: (t, r) => r.time >= t.minutes * 60, shown: (t, r) => `${clock(r.time)} / ${clock(t.minutes * 60)}` },
  noRefuel: { failed: (t, r) => r.refuelled, shown: () => '' },
  noPower: { failed: (t, r) => r.powered, shown: () => '' },
  noStuck: { failed: (t, r) => r.stuckMax > t.seconds, shown: () => '' },
};

export function createMissions(data = {}, ctx = {}, store = typeof localStorage === 'undefined' ? null : localStorage, random = Math.random) {
  const { offerCount = 4, baseXp = MISSION_BASE_XP, goals = {}, twists = {}, locks = {}, twistCount = [[0, 1]], featured = {}, signature = {} } = data;
  if (Array.isArray(ctx)) ctx = { classes: ctx.map(id => ({ id, name: id })) };
  const classes = ctx.classes ?? [], trail = ctx.trail ?? { start: 0, depot: 3500, checkpoints: [], heavyMud: [], highways: [] };
  const mapId = () => ctx.mapId?.() ?? null;   // the map contracts are drawn for: each one is sized to that trail
  const owned = () => (ctx.owned?.() ?? []).filter(c => c?.id);
  const className = id => classes.find(c => c.id === id)?.name ?? id;
  const allCars = () => (ctx.cars?.() ?? []).filter(c => c?.id);            // every truck in the game, owned or not
  const rank = () => ctx.rank?.() ?? 1;
  const ownsCar = id => ctx.owns ? ctx.owns(id) : owned().some(c => c.id === id);
  // trucks one step away: not owned, opening at the player's rank or up to STRETCH_RANKS above it
  const stretchPool = () => allCars().filter(c => !ownsCar(c.id) && (c.unlockRank ?? 1) <= rank() + STRETCH_RANKS);
  const maps = () => (ctx.maps?.() ?? []).filter(m => m?.id);                 // every playable map: { id, name, free }
  const mapName = id => maps().find(m => m.id === id)?.name ?? id;

  // Each truck's home map, worked out once: a map scores 2 for each of its `likes.loads` words in the load's name and 1 for
  // each shared biome, less how full it already is, so the trucks spread over every map. Free starters only get free maps.
  let homes = null;
  function homeMaps() {
    if (homes) return homes;
    homes = {};
    const list = maps(), likes = signature.likes ?? {}, count = Object.fromEntries(list.map(m => [m.id, 0]));
    if (!list.length) return homes;
    const fair = allCars().length / list.length;
    for (const car of [...allCars()].sort((a, b) => hash(a.id) - hash(b.id))) {
      const load = (car.load?.name ?? '').toLowerCase(), free = (car.unlockRank ?? 1) <= 1 && (car.price ?? 0) === 0;
      const pool = list.filter(m => !free || m.free);
      let best = null, bestScore = -Infinity;
      for (const m of pool.length ? pool : list) {
        const l = likes[m.id] ?? {};
        const score = 2 * (l.loads ?? []).filter(w => load.includes(w)).length + (l.biomes ?? []).filter(b => (car.biomes ?? []).includes(b)).length
          - 3 * count[m.id] / Math.max(1, fair) + hash(car.id + m.id) * 0.5;
        if (score > bestScore) { bestScore = score; best = m.id; }
      }
      homes[car.id] = best; count[best]++;
    }
    return homes;
  }

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
      bogs: `Clear ${m.count} deep bogs`,
    }[m.goal];
    const rules = m.twists.map(t => fill(twists[t.type]?.text ?? t.type, t));
    const head = m.signature ? (m.load ? `Deliver the ${m.load.toLowerCase()}` : 'Run the whole trail') + (m.goal === 'deliver' ? '' : `, ${goalText[0].toLowerCase()}${goalText.slice(1)}`) : goalText;
    return head + lockText + (rules.length ? `, ${rules.join(', ')}` : '');
  }

  // XP is worked out from the game's numbers every time it is shown or paid, never saved, so lowering MISSION_BASE_XP
  // (or a twist's or lock's share of it) changes contracts already on offer too. Twist and lock `xp` in missions.json are
  // shares of the base, so the base scales the whole mission.
  function xpOf(m) {
    const d = m.d ?? 0.5, lockShare = m.car ? locks.car?.xp ?? 0 : m.class ? locks.class?.xp ?? 0 : 0;
    const story = m.featured ? featured.xp ?? 1 : m.signature ? signature.xp ?? 1 : 1;
    const raw = story * baseXp * (0.6 + 1.2 * d + (m.twists ?? []).reduce((s, t) => s + (twists[t.type]?.xp ?? 0), 0) + lockShare);
    return Math.max(10, Math.round(classXp(raw, m.class) / 10) * 10);
  }
  // stars, wording and map for a contract whose targets are set
  function finalize(m) {
    const hard = m.d + 0.35 * m.twists.length + (m.car ? 0.3 : m.class ? 0.2 : 0);
    m.stars = hard > 1.15 ? 3 : hard > 0.6 ? 2 : 1;
    m.text = describe(m);
    m.xp = xpOf(m);
    if (mapId()) m.map = mapId();
    return m;
  }
  // the chosen contract on another map: the same goal, lock and twists, with targets sized to this trail; null when this
  // trail cannot host the goal (no speed cameras, too few bogs, no checkpoints)
  function resize(m) {
    if (m.featured || m.signature) return null;   // written for its own map
    const lock = { class: m.class, car: m.car ? owned().find(c => c.id === m.car) ?? { id: m.car, name: m.carName, class: m.class } : undefined };
    const g = makeGoal(m.goal, lock); if (!g) return null;
    const out = { ...g, twists: m.twists.map(t => makeTwist(t.type, g, lock)), title: m.title, id: m.id };
    if (m.class) out.class = m.class;
    if (m.car) { out.car = m.car; out.carName = m.carName; }
    return finalize(out);
  }

  // one contract. `force` pins a class and depot goals (the least-driven class's offer).
  function contract(force = null, avoid = new Set(), stretch = null) {
    for (let tries = 0; tries < 30; tries++) {
      const lock = {};
      const ownedClasses = classes.filter(k => owned().some(c => c.class === k.id));
      if (stretch) { lock.car = stretch; lock.class = stretch.class; }
      else if (force) lock.class = force;
      else if (random() < (locks.car?.chance ?? 0) && owned().length) { lock.car = pick(owned()); lock.class = lock.car.class; }
      else if (random() < (locks.class?.chance ?? 0) && ownedClasses.length) lock.class = pick(ownedClasses).id;
      const choices = Object.entries(goals).filter(([k]) => GOALS[k] && !avoid.has(k) && (!force || GOALS[k].depot)).map(([k, g]) => [k, g.weight ?? 1]);
      if (!choices.length) return null;
      const m = makeGoal(weighted(choices), lock); if (!m) continue;
      const n = Number(weighted(twistCount.map(([k, w]) => [k, w]))) || 0;
      const pool = Object.keys(twists).filter(k => TWISTS[k] && (TWISTS[k].fits?.(m.goal) ?? true) && !(m.goal === 'timed' && k === 'timed'));
      m.twists = [];
      for (let i = 0; i < n && pool.length; i++) { const k = weighted(pool.map(k => [k, twists[k].weight ?? 1])); pool.splice(pool.indexOf(k), 1); m.twists.push(makeTwist(k, m, lock)); }
      if (goals[m.goal]?.needsRule && !m.twists.length && !lock.class) continue;   // a bare delivery is no contract
      if (stretch) m.stretch = true;
      if (lock.class) m.class = lock.class;
      if (lock.car) { m.car = lock.car.id; m.carName = lock.car.name; }
      m.title = pick(goals[m.goal]?.titles ?? [m.goal]);
      m.id = `${m.goal}-${Math.floor(random() * 2 ** 32).toString(36)}`;
      return finalize(m);
    }
    return null;
  }

  // a contract with a story: `spec` = { title, client, story, goal, twists }, sized to this trail like any other
  function storied(spec, lock, extra) {
    for (let tries = 0; tries < 10; tries++) {
      const m = makeGoal(spec.goal, lock); if (!m) return null;
      m.twists = (spec.twists ?? []).filter(k => TWISTS[k] && !(k === m.goal)).map(k => makeTwist(k, m, lock));
      if (lock.class) m.class = lock.class;
      if (lock.car) { m.car = lock.car.id; m.carName = lock.car.name; }
      Object.assign(m, { title: spec.title, client: spec.client, story: spec.story }, extra);
      return finalize(m);
    }
    return null;
  }
  // this map's featured contract: the next one of its list that has not been done here lately
  function featuredOffer() {
    const list = featured.maps?.[mapId()] ?? []; if (!list.length) return null;
    const i = (state.featuredDone?.[mapId()] ?? 0) % list.length, [lo, hi] = featured.coins ?? [0, 0];
    return storied(list[i], {}, { featured: true, coins: Math.round((lo + (hi - lo) * random()) / 500) * 500, id: `feat-${mapId()}-${i}-${Math.floor(random() * 2 ** 32).toString(36)}` });
  }
  // a truck's signature haul, offered on its home map: its own load for one of that map's clients
  function signatureOffer(chosen) {
    const car = allCars().find(c => c.id === chosen?.id) ?? chosen;   // the roster's entry: its load, price and rank
    if (!car?.id || homeMaps()[car.id] !== mapId()) return null;
    const pickBy = (list, salt) => list[Math.floor(hash(car.id + salt) * list.length)];
    const client = pickBy(signature.clients?.[mapId()] ?? ['the depot'], 'client'), load = car.load?.name ?? null;
    const story = pickBy(signature.stories?.[load ? 'load' : 'empty'] ?? ['{client} needs you.'], 'story')
      .replace('{client}', client).replace('{load}', (load ?? '').toLowerCase()).replace('{map}', mapName(mapId())).replace('{truck}', car.name);
    const goal = pickBy(['deliver', 'timed', 'clean'], 'goal'), first = !state.signatures?.[car.id];
    const [lo, hi] = signature.firstCoins ?? [0, 0], share = Math.min(1, (car.price ?? 0) / 200000);
    return storied({ title: `${car.name}: signature haul`, client, story, goal, twists: goal === 'deliver' ? [pickBy(['clean', 'timed', 'noRefuel'], 'twist')] : [] },
      { car, class: car.class }, { signature: true, load, coins: first ? Math.round((lo + (hi - lo) * share) / 500) * 500 : 0, id: `sig-${car.id}` });
  }

  let state = { v: VERSION, offers: [], active: null, driven: {}, maps: {}, signatures: {}, featuredDone: {} };   // maps: other maps' offers, kept for when you go back
  try {
    const s = JSON.parse(store?.getItem(KEY));
    if (s?.v === VERSION) state = { v: VERSION, offers: (s.offers ?? []).filter(m => GOALS[m?.goal]), active: s.active ?? null, driven: s.driven ?? {}, maps: s.maps ?? {}, signatures: s.signatures ?? {}, featuredDone: s.featuredDone ?? {} };
    else if (s?.driven) state.driven = s.driven;   // older saves: keep which classes were driven
  } catch (e) {}
  // A contract drawn for another map does not fit this one (four cameras where there are three, a checkpoint
  // that is not here, a time sized to another trail's length): it is dropped, the chosen one too.
  const fits = m => {
    if ((m.twists ?? []).some(t => !TWISTS[t.type])) return false;   // a saved contract with a twist that no longer exists (noHelp, removed with the breakdown trucks)
    if (m.map && mapId() && m.map !== mapId()) return false;
    if (m.goal === 'cameras' && m.of !== (trail.highways ?? []).length) return false;
    if (m.goal === 'bogs' && m.of !== (trail.heavyMud ?? []).length) return false;
    if (m.goal === 'sprint' && !(trail.checkpoints ?? []).includes(m.x)) return false;
    return true;
  };
  const prune = () => { state.offers = state.offers.filter(m => fits(m) && (m.id === state.active || !outOfReach(m))); if (!state.offers.some(m => m.id === state.active)) state.active = null; };
  let current = mapId();
  prune();
  // saved contracts keep the XP they were drawn with: work it out again from today's numbers
  for (const m of [...state.offers, ...Object.values(state.maps).flatMap(x => x.offers ?? [])]) m.xp = xpOf(m);
  const save = () => { try { store?.setItem(KEY, JSON.stringify(state)); } catch (e) {} };
  const activeMission = () => state.offers.find(m => m.id === state.active) ?? null;

  // a fresh list: the chosen contract stays, then this map's featured contract, the least-driven class's depot contract, then
  // others with varied goals
  function draw() {
    const keep = activeMission(), offers = keep ? [keep] : [], used = new Set(offers.map(m => m.goal));
    if (!offers.some(m => m.featured)) { const f = featuredOffer(); if (f) { offers.push(f); used.add(f.goal); } }
    const least = [...classes].map(c => c.id).sort((a, b) => (state.driven[a] ?? 0) - (state.driven[b] ?? 0))[0];
    if (least && !offers.some(m => m.class === least && GOALS[m.goal].depot)) { const m = contract(least); if (m) { offers.push(m); used.add(m.goal); } }
    const pool = stretchPool(), want = Math.min(pool.length, STRETCH_OFFERS[0] + Math.floor(random() * (STRETCH_OFFERS[1] - STRETCH_OFFERS[0] + 1)));
    const stretches = offers.filter(m => needsFor(m)).length;
    while (offers.length < offerCount - Math.max(0, want - stretches)) {
      const m = contract(null, used.size < Object.keys(goals).length - 1 ? used : new Set()); if (!m) break;
      offers.push(m); used.add(m.goal);
    }
    const taken = new Set();
    while (offers.length < offerCount && pool.length) {
      const free = pool.filter(c => !taken.has(c.id)); if (!free.length) break;
      const car = pick(free); taken.add(car.id);
      const m = contract(null, new Set(), car); if (m) offers.push(m);
    }
    while (offers.length < offerCount) { const m = contract(); if (!m) break; offers.push(m); }
    state.offers = offers; save();
  }
  // what an offer still needs from the player, worked out now: a rank, a truck to buy, or nothing (null = doable)
  function needsFor(m) {
    if (!m?.car || ownsCar(m.car)) return null;
    const c = allCars().find(x => x.id === m.car), at = c?.unlockRank ?? 1;
    return at > rank() ? { rank: at, car: c } : { buy: c };
  }
  // an offer whose truck is now far out of reach (an old save) is redrawn
  function outOfReach(m) { const n = needsFor(m); return !!(n?.rank && n.rank > rank() + STRETCH_RANKS); }
  if (state.offers.length < offerCount) draw();

  function finish(m) {
    const xp = xpOf(m), coins = m.coins ?? 0;
    if (m.signature && m.car) state.signatures[m.car] = true;
    if (m.featured && m.map) state.featuredDone[m.map] = (state.featuredDone[m.map] ?? 0) + 1;
    state.active = null; draw(); return { mission: m, xp, coins };
  }
  const lockFailed = (m, r) => (m.class && r.cls !== m.class) || (m.car && r.car && r.car !== m.car);
  const failedBy = (m, r) => lockFailed(m, r) || !!GOALS[m.goal].failed?.(m, r) || m.twists.some(t => TWISTS[t.type]?.failed(t, r));
  const doneBy = (m, r) => !failedBy(m, r) && GOALS[m.goal].done(m, r);
  const shownFor = (m, r) => [GOALS[m.goal].shown(m, r), ...m.twists.map(t => TWISTS[t.type]?.shown(t, r) ?? '')].filter(Boolean).join(' · ');

  return {
    get offers() { return state.offers; },
    get active() { return activeMission(); },
    xpFor: m => xpOf(m),
    starsFor: m => m.stars ?? 1,
    // choose an offered mission, or the chosen one again to put it down; a signature haul joins the offers when chosen
    choose(id, car = null) {
      if (id?.startsWith('sig-') && !state.offers.some(m => m.id === id)) { const m = signatureOffer(car); if (m?.id === id) state.offers = [m, ...state.offers.filter(o => !o.signature)].slice(0, offerCount + 1); }
      state.active = state.active === id || !state.offers.some(m => m.id === id) ? null : id; save(); return this.active;
    },
    // the chosen truck's signature haul here (null when its home is another map), its home map, and how many are done
    signatureFor: car => state.offers.find(m => m.id === `sig-${car?.id}`) ?? signatureOffer(car),
    needsFor: m => needsFor(m),
    homeOf: car => { const id = homeMaps()[car?.id]; return id ? { id, name: mapName(id) } : null; },
    signatureDone: car => !!state.signatures[car?.id],
    get signatureCount() { return { done: Object.keys(state.signatures).length, of: allCars().length }; },
    // during a run: progress for the chip, and the mission itself once a live one is done
    track(run) {
      const m = this.active; if (!m) return null;
      if (!run.delivered && !GOALS[m.goal].depot && doneBy(m, run)) return { done: finish(m) };
      return { mission: m, shown: shownFor(m, run), failed: failedBy(m, run) };
    },
    // whether this run has already broken the chosen mission
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
    // another map was picked: its own offers come back (and the chosen one, if it had one), or fresh ones are drawn for it;
    // this map's offers wait until you come back, so browsing maps never loses a chosen contract
    mapChanged() {
      const next = mapId();
      if (next && current && next !== current) {
        // the chosen contract goes with you (user, 2026-11-23: pick a mission, then a map, and it is there), sized to the new
        // trail; one this trail cannot host stays behind, chosen, on its own map
        const chosen = activeMission(), moved = chosen ? resize(chosen) : null;
        state.maps[current] = { offers: moved ? state.offers.filter(m => m.id !== chosen.id) : state.offers, active: moved ? null : state.active };
        const back = state.maps[next]; delete state.maps[next];
        state.offers = back?.offers ?? []; state.active = back?.active ?? null;
        if (moved) { state.offers = [moved, ...state.offers.filter(m => m.id !== moved.id)].slice(0, offerCount); state.active = moved.id; }
      }
      current = next; prune();
      if (state.offers.length < offerCount) draw(); else save();
    },
  };
}
