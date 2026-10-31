// The garage: a workshop with the chosen vehicle parked big on the turntable. Top to bottom: the
// season row, the class tabs (weakest to strongest), a strip with that class's vehicles, then the
// vehicle with the Drive / Upgrade / Sound / Fullscreen buttons beside it. UPGRADE opens the car's
// details and tuning knobs in a panel over the garage. Every car carries its own load (part of its art and
// weight), so the pick is the job. Planned vehicles and seasons show locked. Each car can be tuned
// (tuning.js): the run uses the tuned copy, and the settings are saved per car.

import { KNOBS, STEP, MAX_LEVEL, applyTuning, clampLevel, tunedStat, levelColor, loadTuning, saveTuning, validLevels } from './tuning.js';

const $ = id => document.getElementById(id);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

export function createGarage({ content, onStart }) {
  const classes = content.roster.classes, rank = Object.fromEntries(classes.map((c, i) => [c.id, i]));
  const rosterOf = id => content.roster.cars.find(c => c.id === id);
  const playable = new Map(content.cars.map(c => [c.id, c]));
  // the playable cars in roster order (class, then tier): the showroom arrows step through these
  const order = [...content.cars].sort((a, b) => (rosterOf(a.id)?.order ?? 0) - (rosterOf(b.id)?.order ?? 0));
  let car = playable.get(content.defaultCar) ?? order[0], cls = car.class;
  const tuning = loadTuning();
  // saved levels are trimmed to the five knobs when read
  const tuneOf = id => (tuning[id] = validLevels(playable.get(id) ?? car, tuning[id] ?? {}));
  const tuned = () => applyTuning(car, tuning[car.id]);
  const bg = content.hud['garage-background'];
  if (bg) $('garage').style.setProperty('--garage-bg', `url(${bg})`);
  const icon = id => $('classIcons').content.querySelector(`[data-icon="class-${id}"] svg`)?.cloneNode(true);

  // seasons: the one being played, the other open ones (tap to switch), and the planned ones locked
  function renderSeasons() {
    const box = $('gSeasons'); box.innerHTML = '';
    for (const s of content.seasons ?? [{ id: content.season.id, name: content.season.name, status: 'playable' }]) {
      const on = s.id === content.season.id, b = el('button', 'g-season' + (on ? ' on' : '') + (s.status === 'playable' ? '' : ' locked'));
      if (on && content.seasonArt?.backdrop) b.style.setProperty('--thumb', `url(${content.seasonArt.backdrop})`);
      b.append(el('b', null, s.name), el('small', null, s.status === 'playable' ? (on ? 'Selected' : 'Open') : 'Coming soon'));
      if (s.status !== 'playable') { b.disabled = true; b.title = 'Not open yet'; }
      // another open season: remember it on this device and restart the game in it
      else if (!on) b.addEventListener('click', () => { try { localStorage.setItem('haul.season', s.id); } catch (e) {} location.reload(); });
      b.setAttribute('aria-pressed', String(on));
      box.append(b);
    }
  }

  // class tabs: icon (when its art exists), name, tagline and how many of its vehicles are ready
  function renderClasses() {
    const box = $('gClasses'); box.innerHTML = '';
    for (const c of classes) {
      const ready = content.cars.filter(x => x.class === c.id).length, all = content.roster.cars.filter(x => x.class === c.id).length;
      const b = el('button', 'g-class' + (c.id === cls ? ' on' : '') + (ready ? '' : ' empty'));
      const ic = icon(c.id); if (ic) b.append(ic);
      const t = el('span'); t.append(el('b', null, c.name), el('small', null, `${c.tagline ?? ''} · ${ready}/${all}`)); b.append(t);
      b.setAttribute('aria-pressed', String(c.id === cls));
      b.addEventListener('click', () => {
        cls = c.id;
        const first = order.find(x => x.class === cls);
        if (first && car.class !== cls) car = first;
        render();
      });
      box.append(b);
    }
  }

  // the class's vehicles: playable ones with their art, planned ones locked
  function renderList() {
    const list = $('garageList'); list.innerHTML = '';
    for (const r of content.roster.cars.filter(c => c.class === cls).sort((a, b) => a.tier - b.tier)) {
      const p = playable.get(r.id), b = el('button', 'gtile' + (p ? '' : ' locked') + (r.id === car.id ? ' on' : ''));
      const thumb = el('span', 'gthumb');
      if (p) { const img = el('img'); img.src = p.artUri.master; img.alt = ''; img.loading = 'lazy'; thumb.append(img); }
      else thumb.textContent = 'Coming soon';
      b.append(thumb, el('b', null, r.name), el('span', null, `${r.load?.massT ?? 0} t · ${r.drive}`));
      if (p) b.addEventListener('click', () => { car = p; render(); });
      else { b.disabled = true; b.title = `${r.name}: not in the garage yet`; }
      list.append(b);
    }
    list.querySelector('.gtile.on')?.scrollIntoView?.({ block: 'nearest', inline: 'center' });
  }

  function renderDetail() {
    const r = rosterOf(car.id) ?? {};
    $('garageArt').src = car.artUri.master; $('garageArt').alt = car.name;
    $('garageArt').style.setProperty('--len', r.lengthM ?? 6);   // parked to scale
    $('gName').textContent = `${car.name}${car.number ? ' ' + car.number : ''}`;
    $('gBadge').textContent = classes[rank[car.class]]?.name ?? car.class;
    $('gDesc').textContent = car.description;
    const stats = $('gStats'); stats.innerHTML = '';
    // stat bars grow with the tuning tied to them, and turn from orange to green
    const levels = tuning[car.id] ?? {};
    for (const [label, key] of [['Power', 'power'], ['Speed', 'speed'], ['Grip', 'grip'], ['Capacity', 'capacity']]) {
      const base = r.stats?.[key] ?? car.stats?.[key] ?? 50, v = tunedStat(base, levels, key);
      const row = el('div'), bar = el('i'), fill = el('b'), knob = KNOBS.find(k => k.stat === key);
      fill.style.width = `${v}%`; fill.style.background = levelColor(knob ? levels[knob.id] : 0);
      bar.append(fill); row.append(el('span', null, label), bar, el('em', null, (v / 10).toFixed(1))); stats.append(row);
    }
    const spec = $('gSpec'); spec.innerHTML = '';
    const t = tuned(), mass = (t.physics.mass + t.physics.wheelMass * t.rig.axles.length) / 1000 + (t.physics.load?.massT ?? 0);
    const load = t.load ?? r.load;
    for (const [k, v] of [['Class', `${classes[rank[car.class]]?.name ?? car.class} · tier ${car.number ?? '-'}`], ['Drive', `${car.drive} · ${car.wheelType} tires`], ['Load', load ? `${load.name} · ${load.massT} t` : 'none'], ['Gross weight', `${mass.toFixed(1)} t`]]) spec.append(el('dt', null, k), el('dd', null, v));
  }
  // tuning: one bar per knob, 0 (stock) to 100 in steps of 25, filling from orange to green
  function renderTuning() {
    const box = $('tuneList'), t = tuneOf(car.id); box.innerHTML = '';
    for (const knob of KNOBS) {
      const level = clampLevel(t[knob.id]), row = el('div', 'tune' + (level ? ' changed' : ''));
      const name = el('span', 'tname'); name.append(el('b', null, knob.label), el('small', null, knob.hint));
      const bar = el('div', 'tbar'), fill = el('i');
      fill.style.width = `${level}%`; fill.style.background = levelColor(level); bar.append(fill);
      for (let s = STEP; s < MAX_LEVEL; s += STEP) { const tick = el('span', 'ttick'); tick.style.left = `${s}%`; bar.append(tick); }
      bar.setAttribute('role', 'meter'); bar.setAttribute('aria-valuemin', '0'); bar.setAttribute('aria-valuemax', String(MAX_LEVEL)); bar.setAttribute('aria-valuenow', String(level)); bar.setAttribute('aria-label', knob.label);
      const set = v => { const n = clampLevel(v); if (n) t[knob.id] = n; else delete t[knob.id]; saveTuning(tuning); renderTuning(); renderDetail(); };
      // tapping the bar jumps to that step
      bar.addEventListener('click', e => { const r = bar.getBoundingClientRect(); set(Math.ceil((e.clientX - r.left) / r.width * MAX_LEVEL / STEP) * STEP); });
      const minus = el('button', 'tstep', '−'), plus = el('button', 'tstep', '+');
      minus.disabled = level <= 0; plus.disabled = level >= MAX_LEVEL;
      minus.setAttribute('aria-label', `Lower ${knob.label}`); plus.setAttribute('aria-label', `Raise ${knob.label}`);
      minus.addEventListener('click', () => set(level - STEP));
      plus.addEventListener('click', () => set(level + STEP));
      row.append(name, minus, bar, el('span', 'tval', String(level)), plus);
      box.append(row);
    }
    $('tuneReset').hidden = !Object.keys(t).length;
  }
  $('tuneReset').addEventListener('click', () => { tuning[car.id] = {}; saveTuning(tuning); render(); });
  // UPGRADE opens the car's details and tuning over the garage, like the sound panel; Done closes it
  const upgrading = on => { $('upgradeOv').hidden = !on; };
  $('upgradeBtn').addEventListener('click', () => upgrading(true));
  $('upgradeDone').addEventListener('click', () => upgrading(false));

  // the showroom arrows step through every playable car, switching class tab as needed
  const step = d => { const i = order.indexOf(car); car = order[(i + d + order.length) % order.length]; cls = car.class; render(); };
  $('gPrev').addEventListener('click', () => step(-1));
  $('gNext').addEventListener('click', () => step(1));
  const scrollStrip = d => $('garageList').scrollBy({ left: d * $('garageList').clientWidth * 0.8, behavior: 'smooth' });
  $('gStripPrev').addEventListener('click', () => scrollStrip(-1));
  $('gStripNext').addEventListener('click', () => scrollStrip(1));

  function render() { renderSeasons(); renderClasses(); renderList(); renderDetail(); renderTuning(); }
  render();

  $('startBtn').addEventListener('click', () => onStart({ car: tuned() }, false));
  $('startFs').addEventListener('click', () => onStart({ car: tuned() }, true));

  return {
    show() { $('garage').hidden = false; upgrading(false); render(); },
    hide() { $('garage').hidden = true; upgrading(false); },
    select(carId) { car = playable.get(carId) ?? car; cls = car.class; render(); return { car: tuned() }; },   // tests and quick starts
    tune(carId, knob, k) { tuneOf(carId)[knob] = clampLevel(k); saveTuning(tuning); render(); },
    get selection() { return { car: tuned() }; },
  };
}
