// The garage: a workshop with the chosen vehicle parked big on the turntable. Top to bottom: the
// season row, the class tabs (weakest to strongest), a strip with that class's vehicles, the vehicle,
// then its nameplate on the floor, a gauge pod per tuning knob, and the Drive / Sound buttons. Every car carries
// its own load (part of its art and weight), so the pick is the job. Planned vehicles and seasons show locked. Each car can be tuned
// (tuning.js): the run uses the tuned copy, and the settings are saved per car.

import { KNOBS, STEP, MAX_LEVEL, applyTuning, clampLevel, tunedStat, levelColor, loadTuning, saveTuning, validLevels } from './tuning.js';

const $ = id => document.getElementById(id);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

export function createGarage({ content, onSelect, onStart }) {
  const classes = content.roster.classes, rank = Object.fromEntries(classes.map((c, i) => [c.id, i]));
  const rosterOf = id => content.roster.cars.find(c => c.id === id);
  const playable = new Map(content.cars.map(c => [c.id, c]));
  // the playable cars in roster order (class, then tier): the showroom arrows step through these
  const order = [...content.cars].sort((a, b) => (rosterOf(a.id)?.order ?? 0) - (rosterOf(b.id)?.order ?? 0));
  let car = playable.get(content.defaultCar) ?? order[0], cls = car.class;
  const tuning = loadTuning();
  // saved levels are trimmed to the four knobs when read
  const tuneOf = id => (tuning[id] = validLevels(playable.get(id) ?? car, tuning[id] ?? {}));
  const tuned = () => applyTuning(car, tuning[car.id]);
  const bg = content.hud['garage-background'];
  if (bg) $('garage').style.setProperty('--garage-bg', `url(${bg})`);
  const icon = id => $('classIcons').content.querySelector(`[data-icon="class-${id}"] svg`)?.cloneNode(true);
  const gIcon = id => $('garageIcons').content.querySelector(`[data-icon="garage-${id}"] svg`)?.cloneNode(true) ?? '';

  // seasons: the one being played, the other open ones (tap to switch), and the planned ones locked
  function renderSeasons() {
    const box = $('gSeasons'); box.innerHTML = '';
    for (const s of content.seasons ?? [{ id: content.season.id, name: content.season.name, status: 'playable' }]) {
      const on = s.id === content.season.id, b = el('button', 'g-season' + (on ? ' on' : '') + (s.status === 'playable' ? '' : ' locked'));
      b.dataset.season = s.id;
      if (on && content.seasonArt?.backdrop) b.style.setProperty('--thumb', `url(${content.seasonArt.backdrop})`);
      b.append(el('b', null, s.name));
      if (s.status !== 'playable') { b.disabled = true; b.title = 'Coming soon'; }
      // another open season: remember it on this device and restart the game in it
      else if (!on) b.addEventListener('click', () => { try { localStorage.setItem('haul.season', s.id); } catch (e) {} location.reload(); });
      b.setAttribute('aria-pressed', String(on));
      box.append(b);
    }
  }

  // class tabs: icon (when its art exists) and name
  function renderClasses() {
    const box = $('gClasses'); box.innerHTML = '';
    for (const c of classes) {
      const ready = content.cars.filter(x => x.class === c.id).length;
      const b = el('button', 'g-class' + (c.id === cls ? ' on' : '') + (ready ? '' : ' empty'));
      const ic = icon(c.id); if (ic) b.append(ic);
      b.append(el('b', null, c.name));
      if (c.tagline) b.title = c.tagline;
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
      else thumb.append(gIcon('lock'), 'Coming soon');
      b.append(thumb, el('b', null, r.name));
      if (p) b.addEventListener('click', () => { car = p; render(); });
      else { b.disabled = true; b.title = `${r.name}: not in the garage yet`; }
      list.append(b);
    }
    list.querySelector('.gtile.on')?.scrollIntoView?.({ block: 'nearest', inline: 'center' });
  }

  // a stat with the tuning tied to it, out of 10
  const statOf = key => { const r = rosterOf(car.id) ?? {}; return tunedStat(r.stats?.[key] ?? car.stats?.[key] ?? 50, tuning[car.id] ?? {}, key) / 10; };

  // the nameplate: name, class and tier, and the facts the pods do not show
  function renderDetail() {
    const r = rosterOf(car.id) ?? {};
    $('garageArt').src = car.artUri.master; $('garageArt').alt = car.name;
    $('garageArt').style.setProperty('--len', r.lengthM ?? 6);   // parked to scale
    $('gName').textContent = `${car.name}${car.number ? ' ' + car.number : ''}`;
    $('gBadge').textContent = `${classes[rank[car.class]]?.name ?? car.class} · tier ${car.number ?? '-'}`;
    const spec = $('gSpec'); spec.innerHTML = '';
    const t = tuned(), mass = (t.physics.mass + t.physics.wheelMass * t.rig.axles.length) / 1000 + (t.physics.load?.massT ?? 0);
    const load = t.load ?? r.load;
    for (const [k, ic, v] of [['Drive', 'drive', `${car.drive} · ${car.wheelType} tires`], ['Load', 'load', load ? `${load.name} · ${load.massT} t` : 'No load'], ['Gross weight', 'weight', `${mass.toFixed(1)} t gross`], ['Capacity', 'capacity', `Capacity ${statOf('capacity').toFixed(1)}`]]) {
      const dt = el('dt'); dt.append(gIcon(ic)); dt.title = k; dt.setAttribute('aria-label', k);
      spec.append(dt, el('dd', null, v));
    }
  }

  // half-dial segment i of n, as a path around the centre (50, 52) with radius 42
  const arcPath = (i, n) => {
    const at = f => { const a = Math.PI * (1 - f); return `${(50 + 42 * Math.cos(a)).toFixed(2)} ${(52 - 42 * Math.sin(a)).toFixed(2)}`; };
    return `M${at((i + 0.03) / n)}A42 42 0 0 1 ${at((i + 0.97) / n)}`;
  };
  // tuning: one gauge pod per knob, 0 (stock) to 100 in steps of 25, lighting from orange to green.
  // A pod also reads out the stat the knob moves, so each number appears once.
  function renderTuning() {
    const box = $('tuneList'), t = tuneOf(car.id), n = MAX_LEVEL / STEP; box.innerHTML = '';
    for (const knob of KNOBS) {
      const level = clampLevel(t[knob.id]), row = el('div', 'tune' + (level ? ' changed' : ''));
      const name = el('span', 'tname'); name.append(gIcon(knob.id), el('b', null, knob.label)); name.title = knob.hint;
      const set = v => { const c = clampLevel(v); if (c) t[knob.id] = c; else delete t[knob.id]; saveTuning(tuning); renderTuning(); renderDetail(); };
      const bar = el('div', 'tbar'), svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 100 58');
      for (let i = 0; i < n; i++) {
        const seg = document.createElementNS('http://www.w3.org/2000/svg', 'path'), lit = (i + 1) * STEP <= level;
        seg.setAttribute('d', arcPath(i, n)); seg.setAttribute('class', 'tseg');
        if (lit) seg.style.stroke = levelColor(level);
        // tapping a segment jumps to that step
        seg.addEventListener('click', () => set((i + 1) * STEP));
        svg.append(seg);
      }
      bar.append(svg, el('span', 'tval', String(level)));
      bar.setAttribute('role', 'meter'); bar.setAttribute('aria-valuemin', '0'); bar.setAttribute('aria-valuemax', String(MAX_LEVEL)); bar.setAttribute('aria-valuenow', String(level)); bar.setAttribute('aria-label', knob.label);
      const minus = el('button', 'tstep', '−'), plus = el('button', 'tstep', '+');
      minus.disabled = level <= 0; plus.disabled = level >= MAX_LEVEL;
      minus.setAttribute('aria-label', `Lower ${knob.label}`); plus.setAttribute('aria-label', `Raise ${knob.label}`);
      minus.addEventListener('click', () => set(level - STEP));
      plus.addEventListener('click', () => set(level + STEP));
      const dial = el('div', 'tdial'); dial.append(minus, bar, plus);
      const read = { power: 'Power', speed: 'Top speed', grip: 'Traction' }[knob.stat];
      row.append(name, dial, el('small', 'tread', read ? `${read} ${statOf(knob.stat).toFixed(1)}` : (level ? 'Tuned' : 'Stock')));
      box.append(row);
    }
    $('tuneReset').hidden = !Object.keys(t).length;
  }
  $('tuneReset').addEventListener('click', () => { tuning[car.id] = {}; saveTuning(tuning); render(); });
  const scrollStrip = d => $('garageList').scrollBy({ left: d * $('garageList').clientWidth * 0.8, behavior: 'smooth' });
  $('gStripPrev').addEventListener('click', () => scrollStrip(-1));
  $('gStripNext').addEventListener('click', () => scrollStrip(1));

  function render() { renderSeasons(); renderClasses(); renderList(); renderDetail(); renderTuning(); onSelect(car); }
  render();

  $('startBtn').addEventListener('click', () => onStart({ car: tuned() }));

  return {
    show() { $('garage').hidden = false; render(); },
    hide() { $('garage').hidden = true; },
    select(carId) { car = playable.get(carId) ?? car; cls = car.class; render(); return { car: tuned() }; },   // tests and quick starts
    tune(carId, knob, k) { tuneOf(carId)[knob] = clampLevel(k); saveTuning(tuning); render(); },
    get selection() { return { car: tuned() }; },
  };
}
