import { formatCoins } from './format.js';
// The garage: a dark warehouse bay with the chosen truck parked on the floor and its name at its wheels. Across the top the picking
// goes from wide to narrow: the seasons, the classes, then the class's trucks; previous and next buttons stand either side of the truck. A bar along the floor
// shows the truck's numbers and upgrade levels and ends in Drive; the Upgrades card pops up with a row per tuning knob. Every car carries
// its own load (part of its art and weight), so the pick is the job. Planned vehicles and seasons show locked. Each car can be tuned
// (tuning.js): the run uses the tuned copy, and the settings are saved per car. Trucks open by rank (progress.js): a locked one
// shows the rank it needs, an open one its price, and Drive becomes Buy until it is owned; each class's weakest truck is free. The Powers card picks one power at a time per car, kept until that car gets another.

import { deriveSpecs } from '../../tools/lib/specs.js';
import { wallet } from './wallet.js';
import { KNOBS, POWERS, upgradeCost, STEP, MAX_LEVEL, applyTuning, withPower, clampLevel, loadTuning, saveTuning, validLevels, loadPowers, savePowers } from './tuning.js';

const $ = id => document.getElementById(id);
// a car's whole weight on the road: empty, wheels and load
const grossTonnes = c => (c.physics.mass + c.physics.wheelMass * c.rig.axles.length) / 1000 + (c.physics.load?.massT ?? 0);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
// what a step of each knob adds, as read from the tuned car: real numbers where the car has them, else against stock
// How much of a car's picture is truck: art comes with empty canvas around it, different on every car. Measured from the
// picture itself, so a new car needs no numbers to sit on the turntable and fit the screen.
const inks = new Map();
function inkOf(img, id) {
  if (inks.has(id)) return inks.get(id);
  const aspect = img.naturalHeight / img.naturalWidth, w = 160, h = Math.max(1, Math.round(w * aspect));
  let top = 0, bottom = h;
  try {
    const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
    const g = canvas.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, w, h);
    const a = g.getImageData(0, 0, w, h).data, solid = y => { for (let x = 0; x < w; x++) if (a[(y * w + x) * 4 + 3] > 128) return true; return false; };
    while (top < h - 1 && !solid(top)) top++;
    while (bottom > top + 1 && !solid(bottom - 1)) bottom--;
  } catch (e) {}   // unreadable: the whole picture counts as truck
  const ink = { aspect, height: (bottom - top) / h, below: (h - bottom) / h };
  inks.set(id, ink);
  return ink;
}

export function createGarage({ content, progress, missions, onSelect, onStart, onBuy }) {
  const classes = content.roster.classes, rank = Object.fromEntries(classes.map((c, i) => [c.id, i]));
  const rosterOf = id => content.roster.cars.find(c => c.id === id);
  const playable = new Map(content.cars.map(c => [c.id, c]));
  // the playable cars in unlock order (class, then the rank that opens them): the showroom arrows step through these
  const unlockOf = id => rosterOf(id)?.unlockRank ?? rosterOf(id)?.tier ?? 0;
  const order = [...content.cars].sort((a, b) => rank[a.class] - rank[b.class] || unlockOf(a.id) - unlockOf(b.id));
  const owns = id => progress?.owns(id) ?? true, isOpen = id => progress?.isOpen(id) ?? true;
  let car = (owns(content.defaultCar) && playable.get(content.defaultCar)) || order.find(c => owns(c.id)) || order[0], cls = car.class;
  const tuning = loadTuning();
  // saved levels are trimmed to the four knobs when read
  const tuneOf = id => (tuning[id] = validLevels(playable.get(id) ?? car, tuning[id] ?? {}));
  const powers = loadPowers();
  const tuned = () => withPower(applyTuning(car, tuning[car.id]), powers[car.id]);
  // all the screen art, for the style sheet
  for (const [id, uri] of Object.entries(content.hud)) document.documentElement.style.setProperty(`--hud-${id}`, `url("${uri}")`);
  const icon = id => $('classIcons').content.querySelector(`[data-icon="class-${id}"] svg`)?.cloneNode(true);
  const gIcon = id => $('garageIcons').content.querySelector(`[data-icon="garage-${id}"] svg`)?.cloneNode(true) ?? '';

  // seasons: the one being played, the other open ones (tap to switch), and the planned ones locked
  function renderSeasons() {
    const box = $('gSeasons'); box.innerHTML = '';
    for (const s of content.seasons ?? [{ id: content.season.id, name: content.season.name, status: 'playable' }]) {
      const on = s.id === content.season.id, open = s.status === 'playable', b = el('button', 'g-season' + (on ? ' on' : '') + (open ? '' : ' locked'));
      b.dataset.season = s.id;
      if (!open) { b.append(gIcon('lock')); b.disabled = true; b.title = `${s.name}: coming later`; }
      b.append(el('b', null, s.name));
      // another open season: remember it on this device and restart the game in it
      if (open && !on) b.addEventListener('click', () => { try { localStorage.setItem('haul.season', s.id); } catch (e) {} location.reload(); });
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
        if (first && car.class !== cls) pick(first); else render();
      });
      box.append(b);
    }
  }

  // the class's vehicles: playable ones with their art, planned ones locked
  function renderList() {
    const list = $('garageList'); list.innerHTML = '';
    for (const r of content.roster.cars.filter(c => c.class === cls).sort((a, b) => unlockOf(a.id) - unlockOf(b.id))) {
      const p = playable.get(r.id), open = p && isOpen(r.id), mine = p && owns(r.id);
      const b = el('button', 'gtile' + (p ? '' : ' locked') + (p && !open ? ' ranked' : '') + (r.id === car.id ? ' on' : ''));
      const thumb = el('span', 'gthumb');
      if (p) { const img = el('img'); img.src = p.artUri.master; img.alt = ''; img.loading = 'lazy'; thumb.append(img); }
      else thumb.append(gIcon('lock'));
      b.append(thumb, el('b', null, r.name));
      // what it takes: the rank that opens it, then its price, and nothing once it is owned
      if (p && !open) { const tag = el('span', 'gtag lock'); tag.append(gIcon('lock'), el('span', null, `Rank ${unlockOf(r.id)}`)); b.append(tag); b.title = `${r.name}: requires rank ${unlockOf(r.id)}`; }
      else if (p && !mine) { const tag = el('span', 'gtag price'); tag.append(el('i', 'coinic'), el('span', null, formatCoins(progress.price(r.id)))); b.append(tag); }
      if (p) b.addEventListener('click', () => pick(p));
      else { b.disabled = true; b.title = `${r.name}: not in the garage yet`; }
      list.append(b);
    }
    // centre the chosen tile in the row only: scrollIntoView would also scroll every box around it, the whole game included
    const on = list.querySelector('.gtile.on');
    if (on) { const a = on.getBoundingClientRect(), b = list.getBoundingClientRect(); list.scrollLeft += a.left + a.width / 2 - b.left - b.width / 2; }
  }

  // the truck: parked, named, and a spec sheet of live numbers, so an upgrade shows up at once
  let enterBack = false;
  function renderDetail() {
    const r = rosterOf(car.id) ?? {};
    const art = $('garageArt');
    if (art.dataset.car !== car.id) {   // the new truck rolls in, seated by where its picture actually has truck
      const id = car.id, back = enterBack; art.dataset.car = id; art.alt = car.name;
      art.onload = () => {
        if (art.dataset.car !== id) return;
        const ink = inkOf(art, id), show = $('gShow');
        show.style.setProperty('--ar', ink.aspect.toFixed(4)); show.style.setProperty('--ink-h', ink.height.toFixed(4)); show.style.setProperty('--ink-b', ink.below.toFixed(4));
        art.classList.remove('enter', 'back'); void art.offsetWidth; art.classList.add('enter'); art.classList.toggle('back', back);
      };
      art.src = car.artUri.master;
    }
    $('gName').textContent = `${car.name}${car.number ? ' ' + car.number : ''}`;
    const t = tuned(), live = deriveSpecs(t), load = t.load ?? r.load;
    $('gBadge').textContent = `${classes[rank[car.class]]?.name ?? car.class} · rank ${unlockOf(car.id)}${load ? ` · ${load.name}` : ''}`;
    renderDrive();
    const spec = $('gSpec'), before = Object.fromEntries([...spec.querySelectorAll('dd')].map(d => [d.dataset.k, d.textContent])), same = spec.dataset.car === car.id;
    spec.dataset.car = car.id; spec.innerHTML = '';
    for (const [k, v] of [['Power', `${live.powerKw} kW`], ['Torque', `${live.torqueNm} Nm`], ['Top speed', `${live.topSpeedKmh} km/h`], ['Length', `${r.lengthM ?? live.lengthM} m`], ['Gross', `${grossTonnes(t).toFixed(1)} t`], ['Drive', car.drive]]) {
      const dd = el('dd', null, v); dd.dataset.k = k;
      if (same && before[k] && before[k] !== v) { dd.classList.add('up'); requestAnimationFrame(() => requestAnimationFrame(() => dd.classList.remove('up'))); }
      const cell = el('div', 'g-cell'); cell.append(el('dt', null, k), dd); spec.append(cell);
    }
  }

  // upgrades: a row per knob with its icon, four level segments and a button that buys the next step.
  // Selling a step back refunds it.
  function renderTuning() {
    const box = $('tuneList'), t = tuneOf(car.id), n = MAX_LEVEL / STEP; box.innerHTML = '';
    for (const knob of KNOBS) {
      const level = clampLevel(t[knob.id]), row = el('div', 'tune' + (level ? ' changed' : ''));
      const set = v => {
        const c = clampLevel(v), cost = upgradeCost(car, level, c);
        if (cost > 0 && !wallet.spend(cost)) return;
        if (cost < 0) wallet.add(-cost);
        if (c) t[knob.id] = c; else delete t[knob.id];
        saveTuning(tuning); if (cost > 0) onBuy?.(); renderTuning(); renderDetail();
      };
      const pic = el('i', 'tpic'); pic.append(gIcon(knob.id));
      const name = el('span', 'tname'); name.append(el('b', null, knob.label)); name.title = knob.hint;
      if (level > 0) {
        const minus = el('button', 'tstep tminus', '−'); minus.setAttribute('aria-label', `Lower ${knob.label}`);
        minus.addEventListener('click', () => set(level - STEP)); name.append(minus);
      }
      const bar = el('div', 'tbar');
      for (let i = 0; i < n; i++) bar.append(el('i', 'pip' + ((i + 1) * STEP <= level ? ' on' : '')));
      bar.setAttribute('role', 'meter'); bar.setAttribute('aria-valuemin', '0'); bar.setAttribute('aria-valuemax', String(MAX_LEVEL)); bar.setAttribute('aria-valuenow', String(level)); bar.setAttribute('aria-label', knob.label);
      const full = level >= MAX_LEVEL, price = full ? 0 : upgradeCost(car, level, level + STEP), canBuy = wallet.coins >= price;
      const buy = el('button', 'tstep tbuy' + (full ? ' max' : canBuy ? '' : ' poor'));
      buy.setAttribute('aria-label', `Raise ${knob.label}`);
      if (full) { buy.append(el('span', null, 'Max')); buy.disabled = true; }
      else {
        buy.append(el('i', 'coinic'), el('span', null, formatCoins(price)));
        if (canBuy) buy.addEventListener('click', () => set(level + STEP));
        else { buy.setAttribute('aria-disabled', 'true'); buy.addEventListener('click', () => { const c = $('tuneCoins').parentElement; c.classList.remove('short'); void c.offsetWidth; c.classList.add('short'); }); }
      }
      row.append(pic, name, bar, buy);
      box.append(row);
    }
    // the levels again on the bar, so a truck's upgrades show without opening the panel
    const levels = $('gLevels'); levels.innerHTML = '';
    for (const knob of KNOBS) {
      const row = el('span', 'glv'), level = clampLevel(t[knob.id]); row.title = knob.label; row.append(gIcon(knob.id));
      for (let i = 0; i < n; i++) row.append(el('i', 'pip' + ((i + 1) * STEP <= level ? ' on' : '')));
      levels.append(row);
    }
    $('tuneReset').hidden = !Object.keys(t).length;
    $('gCoins').textContent = formatCoins(wallet.coins);
    $('tuneCoins').textContent = $('gCoins').textContent;
    $('tuneFor').textContent = `${car.name}${car.number ? ' ' + car.number : ''}`;
  }
  // back to stock, with everything refunded
  $('tuneReset').addEventListener('click', () => {
    const t = tuneOf(car.id); for (const knob of KNOBS) wallet.add(-upgradeCost(car, clampLevel(t[knob.id]), 0));
    tuning[car.id] = {}; saveTuning(tuning); render();
  });
  // the Upgrades card pops up over the garage, as Sound does, and the truck stays where it is
  const tuneOv = $('tuneOv');
  $('gMenuTune').addEventListener('click', () => { tuneOv.hidden = false; });
  $('gLevels').addEventListener('click', () => { tuneOv.hidden = false; });
  $('tuneDone').addEventListener('click', () => { tuneOv.hidden = true; });

  // powers: a row per power, and only one is on for this truck. It stays on until another is picked; tapping the one that is on turns it off.
  function renderPowers() {
    const box = $('powerList'); box.innerHTML = '';
    for (const power of POWERS) {
      const on = power.id === powers[car.id], b = el('button', 'power' + (on ? ' on' : ''));
      const pic = el('i', 'tpic'); pic.append(gIcon(power.id));
      const text = el('span', 'ptext'); text.append(el('b', null, power.label), el('small', null, power.what));
      b.append(pic, text, el('span', 'pstate', on ? 'On' : 'Choose'));
      b.setAttribute('aria-pressed', String(on));
      b.addEventListener('click', () => { if (on) delete powers[car.id]; else powers[car.id] = power.id; savePowers(powers); renderPowers(); renderDetail(); });
      box.append(b);
    }
    $('gPowerOn').textContent = POWERS.find(p => p.id === powers[car.id])?.label ?? 'None';
    $('powersFor').textContent = `${car.name}${car.number ? ' ' + car.number : ''}`;
  }
  const powersOv = $('powersOv');
  $('gMenuPowers').addEventListener('click', () => { powersOv.hidden = false; });
  $('powersDone').addEventListener('click', () => { powersOv.hidden = true; });

  // missions: a row per offer with its XP; one can be chosen, and tapping it again puts it down
  function renderMissions() {
    if (!missions) return;
    const box = $('missionList'); box.innerHTML = '';
    const active = missions.active;
    for (const m of missions.offers) {
      const on = active?.id === m.id, b = el('button', 'power' + (on ? ' on' : ''));
      const pic = el('i', 'tpic'); pic.append(gIcon('mission'));
      const text = el('span', 'ptext'); text.append(el('b', null, m.title), el('small', null, `${m.text}  ·  +${missions.xpFor(m).toLocaleString('en-US')} XP`));
      b.append(pic, text, el('span', 'pstate', on ? 'On' : 'Choose'));
      b.setAttribute('aria-pressed', String(on));
      b.addEventListener('click', () => { missions.choose(m.id); renderMissions(); });
      box.append(b);
    }
    $('gMissionOn').textContent = active?.title ?? 'None';
  }
  const missionsOv = $('missionsOv');
  $('gMenuMissions').addEventListener('click', () => { renderMissions(); missionsOv.hidden = false; });
  $('missionsDone').addEventListener('click', () => { missionsOv.hidden = true; });

  // previous and next: through the chosen class's playable trucks, and round again
  function pick(next, back = false) { enterBack = back; car = next; cls = next.class; render(); }
  function step(d) {
    const all = order.filter(x => x.class === cls);
    if (all.length) pick(all[(Math.max(all.indexOf(car), d < 0 ? 0 : -1) + d + all.length) % all.length], d < 0);
  }
  $('gPrev').addEventListener('click', () => step(-1));
  $('gNext').addEventListener('click', () => step(1));
  // the arrows on the row only scroll the list: the truck changes when one is tapped
  const scrollRow = d => $('garageList').scrollBy({ left: d * $('garageList').clientWidth * 0.8 });
  $('gRowPrev').addEventListener('click', () => scrollRow(-1));
  $('gRowNext').addEventListener('click', () => scrollRow(1));
  $('gStencil').textContent = content.season.name.split(' ')[0];
  // dust hanging in the lamplight: a few specks, placed once
  for (let i = 0; i < 16; i++) {
    const d = el('i'); d.style.cssText = `left:${20 + Math.random() * 70}%;top:${25 + Math.random() * 55}%;--t:${16 + Math.random() * 18}s;--d:${-Math.random() * 30}s;--dx:${(Math.random() - 0.5) * 70}px`;
    $('gDust').append(d);
  }

  // Drive, or Buy with its price for an open truck not owned yet, or the rank a locked one needs; and the player's rank
  function renderDrive() {
    const btn = $('startBtn'), mine = owns(car.id), open = isOpen(car.id);
    btn.classList.toggle('buy', !mine && open); btn.classList.toggle('locked', !open); btn.disabled = !open;
    btn.innerHTML = '';
    if (mine) btn.append(el('span', null, 'Drive'));
    else if (open) { const price = progress.price(car.id); btn.append(el('span', 'gbuy', 'Buy'), el('i', 'coinic'), el('b', null, formatCoins(price))); btn.classList.toggle('poor', wallet.coins < price); }
    else { btn.append(gIcon('lock'), el('span', 'gneed', `Requires rank ${unlockOf(car.id)}`)); }
    for (const id of ['gMenuTune', 'gMenuPowers', 'gLevels']) $(id).disabled = !mine;
    if (progress) {
      const pr = progress.progress;
      $('gRankNum').textContent = `Rank ${pr.rank}`;
      $('gRankFill').style.width = `${(pr.share * 100).toFixed(1)}%`;
      $('gRankXp').textContent = pr.rank >= 20 ? `${pr.xp.toLocaleString('en-US')} XP · top rank` : `${pr.xp.toLocaleString('en-US')} / ${pr.to.toLocaleString('en-US')} XP`;
    }
  }
  function render() { renderSeasons(); renderClasses(); renderList(); renderDetail(); renderTuning(); renderPowers(); renderMissions(); onSelect(car); }
  render();

  $('startBtn').addEventListener('click', () => {
    if (owns(car.id)) { onStart({ car: tuned() }); return; }
    if (!isOpen(car.id)) return;
    if (progress.buy(car.id, wallet)) { onBuy?.(); render(); return; }
    const c = $('gCoinsBox'); c.classList.remove('short'); void c.offsetWidth; c.classList.add('short');   // not enough coins
  });

  return {
    show() { $('garage').hidden = false; render(); },
    hide() { $('garage').hidden = true; },
    select(carId) { car = playable.get(carId) ?? car; cls = car.class; render(); return { car: tuned() }; },   // tests and quick starts
    tune(carId, knob, k) { tuneOf(carId)[knob] = clampLevel(k); saveTuning(tuning); render(); },
    get selection() { return { car: tuned() }; },
  };
}
