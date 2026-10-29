// The garage: pick a vehicle from the roster, grouped by class from weakest to strongest. Every car
// carries its own load (part of its art and weight), so the pick is the job: small loads on scouts,
// huge ones on the heavy haulers. Planned vehicles show locked. Each car can be tuned (tuning.js):
// the run uses the tuned copy, and the settings are saved per car.

import { KNOBS, STEP, MAX_LEVEL, applyTuning, clampLevel, tunedStat, levelColor, loadTuning, saveTuning, validLevels } from './tuning.js';

const $ = id => document.getElementById(id);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

export function createGarage({ content, onStart }) {
  const classes = content.roster.classes, rank = Object.fromEntries(classes.map((c, i) => [c.id, i]));
  const rosterOf = id => content.roster.cars.find(c => c.id === id);
  const playable = new Map(content.cars.map(c => [c.id, c]));
  let car = playable.get(content.defaultCar) ?? content.cars[0];
  const tuning = loadTuning();
  // saved levels are trimmed to the five knobs when read
  const tuneOf = id => (tuning[id] = validLevels(playable.get(id) ?? car, tuning[id] ?? {}));
  const tuned = () => applyTuning(car, tuning[car.id]);
  $('garage').style.backgroundImage = content.hud['garage-background'] ? `linear-gradient(rgba(6,12,20,.55),rgba(6,12,20,.75)),url(${content.hud['garage-background']})` : '';

  function renderList() {
    const list = $('garageList'); list.innerHTML = '';
    for (const cls of classes) {
      const sec = el('section', 'gclass'); sec.append(el('h4', null, cls.name));
      const row = el('div', 'gtiles');
      for (const r of content.roster.cars.filter(c => c.class === cls.id).sort((a, b) => a.tier - b.tier)) {
        const p = playable.get(r.id), b = el('button', 'gtile' + (p ? '' : ' locked') + (car && r.id === car.id ? ' on' : ''));
        b.append(el('b', null, r.name), el('span', null, `${r.load?.name ?? ''} · ${r.load?.massT ?? 0} t`));
        if (p) b.addEventListener('click', () => { car = p; render(); });
        else { b.disabled = true; b.title = 'Not in the garage yet'; }
        row.append(b);
      }
      sec.append(row); list.append(sec);
    }
  }

  function renderDetail() {
    const r = rosterOf(car.id) ?? {};
    $('garageArt').style.backgroundImage = `url(${car.artUri.master})`;
    $('gName').textContent = `${car.name}${car.number ? ' ' + car.number : ''}`;
    $('gDesc').textContent = car.description;
    const stats = $('gStats'); stats.innerHTML = '';
    // stat bars grow with the tuning tied to them, and turn from orange to green
    const levels = tuning[car.id] ?? {};
    for (const [label, key] of [['Power', 'power'], ['Speed', 'speed'], ['Grip', 'grip'], ['Capacity', 'capacity']]) {
      const base = r.stats?.[key] ?? car.stats?.[key] ?? 50, v = tunedStat(base, levels, key);
      const row = el('div'), bar = el('i'), fill = el('b'), knob = KNOBS.find(k => k.stat === key);
      fill.style.width = `${v}%`; fill.style.background = levelColor(knob ? levels[knob.id] : 0);
      bar.append(fill); row.append(el('span', null, label), bar); stats.append(row);
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

  function render() { renderList(); renderDetail(); renderTuning(); }
  render();

  $('startBtn').addEventListener('click', () => onStart({ car: tuned() }, false));
  $('startFs').addEventListener('click', () => onStart({ car: tuned() }, true));

  return {
    show() { $('garage').hidden = false; render(); },
    hide() { $('garage').hidden = true; },
    select(carId) { car = playable.get(carId) ?? car; render(); return { car: tuned() }; },   // tests and quick starts
    tune(carId, knob, k) { tuneOf(carId)[knob] = clampLevel(k); saveTuning(tuning); render(); },
    get selection() { return { car: tuned() }; },
  };
}
