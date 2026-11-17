import { formatCoins } from './format.js';
// The garage (2026-11-18, after Hill Climb Racing's menu): one dark stage with three cards and a bar of big buttons.
//   Home: the season on the left, the truck in the middle (the last one picked, always), the mission on the right;
//         the bar holds SEASONS, VEHICLE, MISSIONS, UPGRADE and PLAY.
//   The bar never changes; SEASONS and VEHICLE open their page on the stage, and any other button closes it again.
//   Seasons: every map as a card; swiping (or tapping a side card) moves to the next, and the middle one is the map at once
//            (planned maps show locked and are skipped over for PLAY).
//   Vehicle: the class tabs appear at the top; the class's trucks as cards, swiped left and right. An owned truck in the middle
//            is the one PLAY drives; for an open one PLAY becomes BUY with its price, a locked one shows the rank it needs.
//            SELL under the numbers gives back what an owned truck cost.
//   Upgrade: a card over the home screen, one tile per tuning knob with its level and the price of the next step, and the powers.
// Every car carries its own load (part of its art and weight). Each car can be tuned (tuning.js): the run uses the tuned copy,
// saved per car. Trucks open by rank (progress.js); each class's weakest truck is free. Picking a map is instant: the map itself is
// swapped behind the drive loading screen (main.js).

import { deriveSpecs } from '../../tools/lib/specs.js';
import { wallet } from './wallet.js';
import { KNOBS, POWERS, upgradeCost, STEP, MAX_LEVEL, applyTuning, withPower, clampLevel, loadTuning, saveTuning, validLevels, loadPowers, savePowers } from './tuning.js';

const $ = id => document.getElementById(id);
// a car's whole weight on the road: empty, wheels and load
const grossTonnes = c => (c.physics.mass + c.physics.wheelMass * c.rig.axles.length) / 1000 + (c.physics.load?.massT ?? 0);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const SWIPE_PX = 40;   // a horizontal drag this long on the stage moves one card

export function createGarage({ content, progress, missions, onSelect, onStart, onBuy, onSell, onSeason }) {
  const classes = content.roster.classes, rank = Object.fromEntries(classes.map((c, i) => [c.id, i]));
  const rosterOf = id => content.roster.cars.find(c => c.id === id);
  const playable = new Map(content.cars.map(c => [c.id, c]));
  const unlockOf = id => rosterOf(id)?.unlockRank ?? rosterOf(id)?.tier ?? 0;
  const orderOf = id => rosterOf(id)?.order ?? 0;
  const order = [...content.cars].sort((a, b) => rank[a.class] - rank[b.class] || unlockOf(a.id) - unlockOf(b.id) || orderOf(a.id) - orderOf(b.id));
  const owns = id => progress?.owns(id) ?? true, isOpen = id => progress?.isOpen(id) ?? true;
  const nameOf = c => `${c.name}${c.number ? ' ' + c.number : ''}`;
  // the truck PLAY drives: the last one picked, kept on this device
  let saved = null; try { saved = localStorage.getItem('haul.car'); } catch (e) {}
  let car = [saved, content.defaultCar].map(id => playable.get(id)).find(c => c && owns(c.id)) || order.find(c => owns(c.id)) || order[0];
  const tuning = loadTuning();
  const tuneOf = id => (tuning[id] = validLevels(playable.get(id) ?? car, tuning[id] ?? {}));
  const powers = loadPowers();
  const tunedOf = c => withPower(applyTuning(c, tuning[c.id]), powers[c.id]);
  // all the screen art, for the style sheet
  for (const [id, uri] of Object.entries(content.hud)) document.documentElement.style.setProperty(`--hud-${id}`, `url("${uri}")`);
  const icon = id => $('classIcons').content.querySelector(`[data-icon="class-${id}"] svg`)?.cloneNode(true);
  const gIcon = id => $('garageIcons').content.querySelector(`[data-icon="garage-${id}"] svg`)?.cloneNode(true) ?? '';

  // ---------- seasons: every map, its card picture (its own card art if it has one, else its panorama) ----------
  const seasonList = (content.seasons ?? [{ id: content.season.id, name: content.season.name, status: 'playable' }]);
  const seasonPic = id => {
    const s = content.playableSeasons?.find(x => x.season.id === id);
    const path = s && (s.art.card ?? s.art.backdrop);
    return path ? content.seasonAssets?.[path] : null;
  };
  const hasCardArt = id => !!content.playableSeasons?.find(x => x.season.id === id)?.art.card;
  let seasonId = content.season.id;   // the map PLAY drives on (main.js swaps the world behind the drive loader)

  // ---------- pages ----------
  let page = 'home', browse = car, cls = car.class, seasonAt = 0;
  const classCars = c => order.filter(x => x.class === c);
  const garageEl = $('garage');
  function go(next) {
    if (next === page && next !== 'home') next = 'home';   // the page's own button closes it
    page = next; garageEl.dataset.page = page;
    browse = car; cls = car.class;   // a truck only looked at (not owned) is let go
    if (page === 'seasons') seasonAt = Math.max(0, seasonList.findIndex(s => s.id === seasonId));
    for (const [id, p] of [['hcSeasons', 'seasons'], ['hcVehicle', 'vehicle']]) $(id).classList.toggle('on', page === p);
    render();
  }

  // one stage card: a label over a framed picture; `kind` picks how the picture fills the frame
  function card(where, { label, sub, pic, kind, locked, onClick, cardArt }) {
    const b = el('button', `hc-card ${where}${locked ? ' locked' : ''}`);
    b.append(el('span', 'hc-label', label ?? ''));
    const frame = el('span', `hc-frame ${kind}`);
    if (pic && kind === 'car') { const img = el('img'); img.src = pic; img.alt = ''; img.draggable = false; frame.append(img); }
    else if (pic) frame.style.backgroundImage = `url("${pic}")`;
    if (kind === 'scene' && cardArt) frame.classList.add('card-art');
    if (locked) { const lock = el('span', 'hc-lock'); lock.append(gIcon('lock'), el('b', null, locked)); frame.append(lock); }
    if (sub) frame.append(el('span', 'hc-sub', sub));
    b.append(frame);
    if (onClick) b.addEventListener('click', onClick); else b.tabIndex = -1;
    return b;
  }
  const carTag = c => !owns(c.id) ? (isOpen(c.id) ? null : `Rank ${unlockOf(c.id)}`) : null;
  const carSub = c => owns(c.id) ? `${classes[rank[c.class]]?.name ?? ''} · ${c.drive ?? ''}` : isOpen(c.id) ? `${formatCoins(progress.price(c.id))} coins` : 'Locked';

  function renderStage() {
    const box = $('hcCards'); box.replaceChildren();
    if (page === 'home') {
      const s = seasonList.find(x => x.id === seasonId), m = missions?.active;
      $('hcTitle').textContent = nameOf(car);
      box.append(
        card('side left', { label: 'Season', sub: s?.name, pic: seasonPic(seasonId), kind: 'scene', cardArt: hasCardArt(seasonId), onClick: () => go('seasons') }),
        card('main', { label: '', sub: carSub(car), pic: car.artUri.master, kind: 'car', onClick: () => go('vehicle') }),
        card('side right', { label: 'Mission', sub: m ? m.title : 'None chosen', kind: 'mission', onClick: openMissions }),
      );
      const frame = box.querySelector('.right .hc-frame'); frame.prepend(gIcon('mission'));
      if (m) frame.append(el('span', 'hc-stars', '★'.repeat(missions.starsFor?.(m) ?? 1)));
    } else if (page === 'seasons') {
      const n = seasonList.length, at = i => seasonList[(i + n) % n];
      const s = at(seasonAt), open = s.status === 'playable';
      $('hcTitle').textContent = s.name;
      const sCard = (where, x, d) => card(where, { label: where === 'main' ? '' : x.name, sub: where === 'main' && x.id === seasonId ? 'Selected' : null, pic: seasonPic(x.id), kind: 'scene', cardArt: hasCardArt(x.id), locked: x.status === 'playable' ? null : 'Coming later', onClick: d ? () => stepSeason(d) : null });
      if (n > 1) box.append(sCard('side left', at(seasonAt - 1), -1));
      box.append(sCard('main', s, 0));
      if (n > 1) box.append(sCard('side right', at(seasonAt + 1), 1));
    } else {
      const list = classCars(cls), n = list.length;
      if (!list.includes(browse)) browse = list[0];
      const i = list.indexOf(browse), at = k => list[(k + n) % n];
      $('hcTitle').textContent = browse ? nameOf(browse) : 'No trucks yet';
      if (browse) {
        const vCard = (where, c, d) => card(where, { label: where === 'main' ? '' : nameOf(c), sub: carSub(c), pic: c.artUri.master, kind: 'car', locked: carTag(c), onClick: d ? () => stepCar(d) : null });
        if (n > 1) box.append(vCard('side left', at(i - 1), -1));
        box.append(vCard('main', browse, 0));
        if (n > 1) box.append(vCard('side right', at(i + 1), 1));
      }
    }
    renderSpec();
  }
  // the numbers under the middle card: the truck's live specs, or nothing for a map
  function renderSpec() {
    const spec = $('gSpec'); spec.replaceChildren();
    const c = page === 'vehicle' ? browse : page === 'home' ? car : null;
    spec.hidden = !c; if (!c) return;
    const t = tunedOf(c), live = deriveSpecs(t), load = t.load ?? rosterOf(c.id)?.load;
    for (const [k, v] of [['Power', `${live.powerKw} kW`], ['Top speed', `${live.topSpeedKmh} km/h`], ['Gross', `${grossTonnes(t).toFixed(1)} t`], ...(load ? [['Load', load.name]] : [])]) {
      const cell = el('div', 'g-cell'); cell.append(el('dt', null, k), el('dd', null, v)); spec.append(cell);
    }
  }

  // ---------- moving through the cards: tap a side card, swipe, or the arrow keys ----------
  // the map in the middle is the map at once; a planned one is only shown
  function stepSeason(d) {
    const n = seasonList.length; seasonAt = (seasonAt + d + n) % n;
    const s = seasonList[seasonAt];
    if (s.status === 'playable' && s.id !== seasonId) { seasonId = s.id; onSeason?.(s.id); }
    renderStage();
  }
  // an owned truck in the middle is the one PLAY drives
  function stepCar(d) { const list = classCars(cls), n = list.length; if (!n) return; showCar(list[(list.indexOf(browse) + d + n) % n]); }
  function showCar(c) { browse = c; if (owns(c.id) && c.id !== car.id) choose(c); render(); }
  const stepPage = d => page === 'seasons' ? stepSeason(d) : page === 'vehicle' ? stepCar(d) : null;
  {
    let x0 = null;
    $('hcStage').addEventListener('pointerdown', e => { x0 = e.clientX; });
    $('hcStage').addEventListener('pointerup', e => {
      if (x0 == null) return; const dx = e.clientX - x0; x0 = null;
      if (Math.abs(dx) > SWIPE_PX) { stepPage(dx < 0 ? 1 : -1); swallowClick(); }
    });
    // a swipe must not also count as a tap on the card under the finger
    const swallowClick = () => { const stop = ev => { ev.stopPropagation(); ev.preventDefault(); }; window.addEventListener('click', stop, { capture: true, once: true }); setTimeout(() => window.removeEventListener('click', stop, { capture: true }), 400); };
    window.addEventListener('keydown', e => {
      if (garageEl.hidden || document.querySelector('.garage .overlay:not([hidden])')) return;
      if (e.key === 'ArrowLeft') stepPage(-1); else if (e.key === 'ArrowRight') stepPage(1);
      else if (e.key === 'Escape' && page !== 'home') go('home');
    });
  }

  // ---------- the bar ----------
  $('hcSeasons').addEventListener('click', () => go('seasons'));
  $('hcVehicle').addEventListener('click', () => go('vehicle'));
  function renderClasses() {
    const box = $('gClasses'); box.replaceChildren();
    for (const c of classes) {
      const ready = classCars(c.id).length;
      const b = el('button', 'g-class' + (c.id === cls ? ' on' : '') + (ready ? '' : ' empty'));
      const ic = icon(c.id); if (ic) b.append(ic);
      b.append(el('b', null, c.name));
      b.setAttribute('aria-pressed', String(c.id === cls));
      if (!ready) b.disabled = true;
      b.addEventListener('click', () => { cls = c.id; const list = classCars(cls); showCar(list.find(x => x.id === car.id) ?? list.find(x => owns(x.id)) ?? list[0]); });
      box.append(b);
    }
  }
  // PLAY drives the truck in the middle; on the Vehicle page an open truck not owned turns it into BUY with the price, and a
  // locked one into the rank it needs. SELL under the numbers, for an owned truck that is not a free starter.
  function renderPlay() {
    const btn = $('startBtn'), c = page === 'vehicle' ? browse : car; btn.replaceChildren(); btn.className = 'hc-btn go';
    const mine = owns(c.id), open = isOpen(c.id);
    btn.disabled = !mine && !open;
    if (mine) btn.append(el('span', null, 'Play'));
    else if (open) { const price = progress.price(c.id); btn.classList.add('buy'); btn.classList.toggle('poor', wallet.coins < price); btn.append(el('span', null, 'Buy'), el('i', 'coinic'), el('b', null, formatCoins(price))); }
    else { btn.classList.add('locked'); btn.append(gIcon('lock'), el('span', null, `Rank ${unlockOf(c.id)}`)); }
    const canSell = page === 'vehicle' && mine && unlockOf(c.id) > 1;
    $('gMenuSell').hidden = !canSell;
    $('gSellFor').textContent = canSell ? formatCoins(sellValue(c)) : '';
  }
  $('startBtn').addEventListener('click', () => {
    const c = page === 'vehicle' ? browse : car;
    if (owns(c.id)) { onStart({ car: tunedOf(c) }); return; }
    if (!isOpen(c.id)) return;
    if (progress.buy(c.id, wallet)) { onBuy?.(); choose(c); render(); return; }
    shake($('gCoinsBox'));   // not enough coins
  });
  function choose(c) { car = c; try { localStorage.setItem('haul.car', c.id); } catch (e) {} onSelect(car); }
  const shake = box => { box.classList.remove('short'); void box.offsetWidth; box.classList.add('short'); };

  // ---------- upgrades: a tile per knob with its icon, its level and the price of the next step; the powers below ----------
  function renderTuning() {
    const box = $('tuneList'), carId = car.id, t = tuneOf(carId), n = MAX_LEVEL / STEP; box.replaceChildren();
    for (const knob of KNOBS) {
      const level = clampLevel(t[knob.id]), tile = el('div', 'tune' + (level ? ' changed' : ''));
      const set = v => {
        // read the current state at purchase time; never charge through a retired button
        if (car.id !== carId || !owns(carId) || !tile.isConnected) return;
        const current = tuneOf(carId), from = clampLevel(current[knob.id]);
        if (from !== level) return;
        const c = clampLevel(v), cost = upgradeCost(car, from, c);
        if (cost > 0 && !wallet.spend(cost)) return;
        if (cost < 0) wallet.add(-cost);
        if (c) current[knob.id] = c; else delete current[knob.id];
        saveTuning(tuning); if (cost > 0) onBuy?.(); renderTuning(); renderStage();
      };
      const pic = el('i', 'tpic'); pic.append(gIcon(knob.id));
      const name = el('b', 'tname', knob.label); name.title = knob.hint;
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
        else { buy.setAttribute('aria-disabled', 'true'); buy.addEventListener('click', () => shake($('tuneCoins').parentElement)); }
      }
      tile.append(pic, name, el('span', 'tlevel', `Level ${level / STEP} / ${n}`), bar, buy);
      tile.classList.toggle('full', full);
      if (level > 0) {
        const minus = el('button', 'tstep tminus', '−'); minus.setAttribute('aria-label', `Lower ${knob.label}`);
        minus.addEventListener('click', () => set(level - STEP)); tile.append(minus);
      }
      box.append(tile);
    }
    $('tuneReset').hidden = !Object.keys(t).length;
    $('tuneCoins').textContent = formatCoins(wallet.coins);
    $('tuneFor').textContent = nameOf(car);
    renderPowers();
  }
  $('tuneReset').addEventListener('click', () => {
    const t = tuneOf(car.id); for (const knob of KNOBS) wallet.add(-upgradeCost(car, clampLevel(t[knob.id]), 0));
    tuning[car.id] = {}; saveTuning(tuning); renderTuning(); render();
  });
  const tuneOv = $('tuneOv');
  $('gMenuTune').addEventListener('click', () => { go('home'); if (!owns(car.id)) return; renderTuning(); tuneOv.hidden = false; });
  $('tuneDone').addEventListener('click', () => { tuneOv.hidden = true; render(); });

  // powers: one at a time for this truck, kept until another is picked; tapping the one that is on turns it off
  function renderPowers() {
    const box = $('powerList'); box.replaceChildren();
    for (const power of POWERS) {
      const on = power.id === powers[car.id], b = el('button', 'power' + (on ? ' on' : ''));
      const pic = el('i', 'tpic'); pic.append(gIcon(power.id));
      const text = el('span', 'ptext'); text.append(el('b', null, power.label), el('small', null, power.what));
      b.append(pic, text, el('span', 'pstate', on ? 'On' : 'Choose'));
      b.setAttribute('aria-pressed', String(on));
      b.addEventListener('click', () => { if (on) delete powers[car.id]; else powers[car.id] = power.id; savePowers(powers); renderPowers(); });
      box.append(b);
    }
  }

  // ---------- missions: a row per offer with its XP; one can be chosen, and tapping it again puts it down ----------
  function renderMissions() {
    if (!missions) return;
    const box = $('missionList'); box.replaceChildren();
    const active = missions.active;
    for (const m of missions.offers) {
      const on = active?.id === m.id, b = el('button', 'power' + (on ? ' on' : ''));
      const pic = el('i', 'tpic'); pic.append(gIcon('mission'));
      const stars = missions.starsFor?.(m) ?? 1, title = el('b', null, m.title);
      title.append(el('em', 'mstars', '★'.repeat(stars) + '☆'.repeat(3 - stars)));
      const text = el('span', 'ptext'); text.append(title, el('small', null, `${m.text}  ·  +${missions.xpFor(m).toLocaleString('en-US')} XP`));
      b.append(pic, text, el('span', 'pstate', on ? 'On' : 'Choose'));
      b.setAttribute('aria-pressed', String(on));
      b.addEventListener('click', () => { missions.choose(m.id); renderMissions(); });
      box.append(b);
    }
  }
  const missionsOv = $('missionsOv');
  function openMissions() { renderMissions(); missionsOv.hidden = false; }
  $('gMenuMissions').addEventListener('click', () => { go('home'); openMissions(); });
  $('missionsDone').addEventListener('click', () => { missionsOv.hidden = true; render(); });

  // ---------- selling: everything spent on the truck comes back; the free starter of each class cannot be sold ----------
  const upgradesSpent = c => KNOBS.reduce((s, k) => s + upgradeCost(c, 0, clampLevel(tuneOf(c.id)[k.id])), 0);
  const sellValue = c => progress.price(c.id) + upgradesSpent(c);
  const sellOv = $('sellOv');
  $('gMenuSell').addEventListener('click', () => {
    const c = browse, v = sellValue(c), up = upgradesSpent(c);
    $('sellFor').textContent = nameOf(c);
    $('sellText').textContent = 'You get back everything you spent on this truck. You can buy it again later.';
    const spec = $('sellSpec'); spec.replaceChildren();
    for (const [k, val] of [['Price paid', formatCoins(progress.price(c.id))], ['Upgrades', formatCoins(up)], ['You get', formatCoins(v)]]) { const cell = el('div', 'g-cell'); cell.append(el('dt', null, k), el('dd', null, val)); spec.append(cell); }
    $('sellConfirm').textContent = `Sell for ${formatCoins(v)}`;
    sellOv.hidden = false;
  });
  $('sellCancel').addEventListener('click', () => { sellOv.hidden = true; });
  $('sellConfirm').addEventListener('click', () => {
    const c = browse, v = sellValue(c);
    if (progress.sell(c.id, wallet, v)) {
      delete tuning[c.id]; saveTuning(tuning); delete powers[c.id]; savePowers(powers); onSell?.();
      if (c.id === car.id) choose(classCars(c.class).find(x => owns(x.id)) ?? order.find(x => owns(x.id)));
    }
    sellOv.hidden = true; render();
  });

  // ---------- PLAY, and the player's rank and coins ----------
  function renderTop() {
    $('gCoins').textContent = formatCoins(wallet.coins);
    $('gMenuTune').disabled = !owns(car.id);
    if (progress) {
      const pr = progress.progress;
      $('gRankNum').textContent = `Rank ${pr.rank}`;
      $('gRankFill').style.width = `${(pr.share * 100).toFixed(1)}%`;
      $('gRankXp').textContent = pr.rank >= 20 ? `${pr.xp.toLocaleString('en-US')} XP · top rank` : `${pr.xp.toLocaleString('en-US')} / ${pr.to.toLocaleString('en-US')} XP`;
    }
  }
  function render() { garageEl.dataset.page = page; renderTop(); if (page === 'vehicle') renderClasses(); renderStage(); renderPlay(); }
  garageEl.dataset.page = page;
  render(); onSelect(car);

  return {
    show() { garageEl.hidden = false; go('home'); },
    // after a map switch elsewhere (a test, the stored season at launch)
    seasonChanged() { seasonId = content.season.id; render(); },
    hide() { garageEl.hidden = true; },
    // tests and quick starts: drive this truck
    select(carId) { const c = playable.get(carId); if (c) { car = c; browse = c; cls = c.class; onSelect(car); } render(); return { car: tunedOf(car) }; },
    tune(carId, knob, k) { tuneOf(carId)[knob] = clampLevel(k); saveTuning(tuning); render(); },
    get selection() { return { car: tunedOf(car) }; },
    get seasonId() { return seasonId; },
  };
}
