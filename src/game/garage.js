import { formatCoins } from './format.js';
// The garage ("Basecamp", 2026-11-18): the map being played, blurred, is the room. The buttons stand in a slanted rail down the left
// (SEASONS, TRUCKS, MISSIONS, UPGRADE), PLAY sits in the bottom right corner, and every page has the same arrangement: its title top
// left, a row of cards with the middle one large, the numbers under it. All of it is laid out in game.css.
//   Trucks: the page the garage opens on, always (user, 2026-11-19), and the one any other page closes back to. The class tabs at
//           the top; the class's trucks as cards, swiped left and right. An owned truck in the middle is the one PLAY drives; for
//           an open one PLAY becomes BUY with its price, a locked one shows the rank it needs. A truck once bought is
//           kept: there is no selling (user, 2026-11-22); only upgrades can be reset for their coins back.
//   Seasons: every map as a card, the owned ones first; swiping (or tapping a side card) moves to the next, and an owned one in
//            the middle is the map at once. Two maps are free; on any other PLAY becomes BUY with its price in coins (season-pass.js).
//            Planned maps show locked and are skipped over for PLAY. The room behind changes with it.
//   Shop: a sheet too (SHOP, or a tap on the coins): bundles, single trucks, coins and ranks (shop.js), bought through the
//         store (store.js; free while testing). A truck bought there is owned whatever its rank.
//   Upgrade and Missions: sheets over the stage (sheet()), four tall cards in a row: one per tuning knob with its level and the
//            price of the next step and the powers under them, or the missions on offer.
// Every car carries its own load (part of its art and weight). Each car can be tuned (tuning.js): the run uses the tuned copy,
// saved per car. Trucks open by rank (progress.js); each class's weakest truck is free. Picking a map is instant: the map itself is
// swapped behind the drive loading screen (main.js).

import { deriveSpecs } from '../../tools/lib/specs.js';
import { wallet } from './wallet.js';
import { createShop } from './shop.js';
import { seasonPass } from './season-pass.js';
import { FREE_SEASONS } from '../game-config.js';
import { KNOBS, POWERS, upgradeCost, STEP, MAX_LEVEL, applyTuning, withPower, clampLevel, loadTuning, saveTuning, validLevels, loadPowers, savePowers } from './tuning.js';

const $ = id => document.getElementById(id);
// a car's whole weight on the road: empty, wheels and load
const grossTonnes = c => (c.physics.mass + c.physics.wheelMass * c.rig.axles.length) / 1000 + (c.physics.load?.massT ?? 0);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

export function createGarage({ content, progress, missions, onSelect, onStart, onBuy, onSeason }) {
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
  const ownsSeason = s => s.status === 'playable' && seasonPass.owns(s.id);
  // owned maps first, then the ones to buy, then the planned ones, each group in the season order the build gives
  const seasonRank = s => ownsSeason(s) ? 0 : s.status === 'playable' ? 1 : 2;
  const allSeasons = (content.seasons ?? [{ id: content.season.id, name: content.season.name, status: 'playable' }]);
  let seasonList = [...allSeasons].sort((a, b) => seasonRank(a) - seasonRank(b));
  const sortSeasons = () => { seasonList = [...allSeasons].sort((a, b) => seasonRank(a) - seasonRank(b)); };
  const seasonPic = id => {
    const s = content.playableSeasons?.find(x => x.season.id === id);
    const path = s && (s.art.card ?? s.art.backdrop);
    return path ? content.seasonAssets?.[path] : null;
  };
  const hasCardArt = id => !!content.playableSeasons?.find(x => x.season.id === id)?.art.card;
  let seasonId = content.season.id;   // the map PLAY drives on (main.js swaps the world behind the drive loader)

  // ---------- pages ----------
  let page = 'vehicle', browse = car, cls = car.class, seasonAt = 0;
  // a class's trucks, the owned ones first (a rank 17 truck bought in the shop comes before a rank 2 one not yet bought), each
  // group weakest to strongest
  const classCars = c => order.filter(x => x.class === c).sort((a, b) => owns(b.id) - owns(a.id));
  const garageEl = $('garage');
  // Shop, Missions and Upgrade are pages (user, 2026-11-24): their cards live in the stage, in the same space as the Trucks
  // and Seasons cards, so the bottom bar is never covered and always moves between pages
  for (const id of ['tuneOv', 'missionsOv', 'shopOv']) $('hcStage').append($(id));
  // the stage's title, also written huge behind the truck (the stage's data-name, drawn by game.css)
  const setTitle = t => { $('hcTitle').textContent = t; $('hcStage').dataset.name = t; };
  // the room: the map PLAY drives on (or the one in the middle while browsing maps), blurred behind everything
  let sceneFor = null;
  const setScene = id => { if (id === sceneFor) return; sceneFor = id; const pic = seasonPic(id); garageEl.style.setProperty('--g-scene', pic ? `url("${pic}")` : 'none'); };
  // UPGRADE and MISSIONS open a sheet over the stage (laid out like a page by game.css); its rail button lights while it is open,
  // tapping it again closes it, and opening any other page closes it too
  function sheet(name) {
    for (const [id, ov, btn] of [['upgrade', 'tuneOv', 'gMenuTune'], ['missions', 'missionsOv', 'gMenuMissions'], ['shop', 'shopOv', 'gMenuShop']]) {
      $(ov).hidden = name !== id; $(btn).classList.toggle('on', name === id);
    }
    if (name) garageEl.dataset.sheet = name; else delete garageEl.dataset.sheet;
    if (name) requestAnimationFrame(() => decks[name]?.refresh());
    $('hcVehicle').classList.toggle('on', !name && page === 'vehicle');   // only the open sheet's button is lit
    renderPlay();   // PLAY offers what the open page's middle card needs, or plays again once it is closed
  }
  function go(next) {
    if (garageEl.dataset.sheet) sheet(null);
    if (next === page) next = 'vehicle';   // a page's own button closes it, back to the trucks
    page = next; garageEl.dataset.page = page;
    browse = car; cls = car.class;   // a truck only looked at (not owned) is let go
    if (page === 'seasons') seasonAt = Math.max(0, seasonList.findIndex(s => s.id === seasonId));
    render();
  }

  // one stage card: a label over a framed picture; `kind` picks how the picture fills the frame
  function card(where, { label, sub, pic, kind, locked, onClick, cardArt }) {
    const b = el('button', `hc-card ${where}${locked ? ' locked' : ''}`);
    b.append(el('span', 'hc-label', label ?? ''));
    const frame = el('span', `hc-frame ${kind}`);
    // a truck stands in its own box, so its lit floor line sits right under its wheels whatever its shape
    if (pic && kind === 'car') { const img = el('img'), stand = el('span', 'hc-truck'); img.src = pic; img.alt = ''; img.draggable = false; stand.append(img); frame.append(stand); }
    else if (pic) frame.style.backgroundImage = `url("${pic}")`;
    if (kind === 'scene' && cardArt) frame.classList.add('card-art');
    if (locked) { const lock = el('span', 'hc-lock'); lock.append(gIcon('lock'), el('b', null, locked)); frame.append(lock); }
    if (sub) frame.append(el('span', 'hc-sub', sub));
    b.append(frame);
    if (onClick) b.addEventListener('click', onClick); else b.tabIndex = -1;
    return b;
  }
  // a page card (Upgrade, Powers, Missions, Shop): the Trucks card's rectangle and label, `body` centred in its frame, `sub`
  // along its foot, `tag` a ribbon at its top left, `badge` a corner marker (On, Chosen, Owned)
  function pageCard({ label, sub, body, kind, tag, badge, on, onClick }) {
    const b = el('button', `hc-card slide pagecard${on ? ' on' : ''}`);
    b.append(el('span', 'hc-label', label ?? ''));
    const frame = el('span', `hc-frame page ${kind}`);
    if (tag) frame.append(el('span', 'stag', tag));
    if (badge) frame.append(el('span', 'pc-badge', badge));
    const inner = el('span', 'pc-body'); for (const x of [body].flat()) if (x) inner.append(x); frame.append(inner);
    if (sub) frame.append(el('span', 'hc-sub', sub));
    b.append(frame);
    // only the card in the middle does anything when tapped (the deck turns a tap on a side card into a slide)
    if (onClick) b.addEventListener('click', onClick); else b.tabIndex = -1;
    return b;
  }
  const carTag = c => !owns(c.id) ? (isOpen(c.id) ? null : `Rank ${unlockOf(c.id)}`) : null;
  const carSub = c => owns(c.id) ? `${classes[rank[c.class]]?.name ?? ''} · ${c.drive ?? ''}` : isOpen(c.id) ? `${formatCoins(progress.price(c.id))} coins` : 'Locked';

  // rebuild: false keeps the sliding row as it is (a swipe landing); true redraws its cards (a purchase, a new class)
  function renderStage(rebuild = true) {
    const box = $('hcCards');
    if (page === 'seasons') {
      const n = seasonList.length;
      deck.set({
        key: 'seasons', items: seasonList, at: seasonAt, rebuild,
        make: x => card('slide', { label: x.name, pic: seasonPic(x.id), kind: 'scene', cardArt: hasCardArt(x.id), locked: x.status !== 'playable' ? 'Coming later' : ownsSeason(x) ? null : `${formatCoins(seasonPass.price(x.id))} coins` }),
        near: i => { setTitle(seasonList[i].name); if (seasonList[i].status === 'playable') setScene(seasonList[i].id); nearItem = seasonList[i]; renderPlay(); },
        land: landSeason,
      });
      setTitle(seasonList[seasonAt]?.name ?? '');
      if (!n) deck.clear();
    } else {
      const list = classCars(cls);
      if (!list.includes(browse)) browse = list[0];
      setTitle(browse ? nameOf(browse) : 'No trucks yet');
      if (browse) deck.set({
        key: `vehicle:${cls}`, items: list, at: list.indexOf(browse), rebuild,
        make: c => card('slide', { label: nameOf(c), sub: carSub(c), pic: c.artUri.master, kind: 'car', locked: carTag(c) }),
        near: i => { setTitle(nameOf(list[i])); nearItem = list[i]; renderPlay(); },
        land: i => landCar(list[i]),
      });
      else deck.clear();
    }
    renderSpec();
  }
  // the numbers under the middle card: the truck's live specs, or nothing for a map
  function renderSpec() {
    const spec = $('gSpec'); spec.replaceChildren();
    const c = page === 'vehicle' ? browse : null;
    spec.hidden = !c; if (!c) return;
    const t = tunedOf(c), live = deriveSpecs(t), load = t.load ?? rosterOf(c.id)?.load;
    for (const [k, v] of [['Power', `${live.powerKw} kW`], ['Top speed', `${live.topSpeedKmh} km/h`], ['Gross', `${grossTonnes(t).toFixed(1)} t`], ...(load ? [['Load', load.name]] : [])]) {
      const cell = el('div', 'g-cell'); cell.append(el('dt', null, k), el('dd', null, v)); spec.append(cell);
    }
  }

  // ---------- moving through the cards: drag (the row follows the finger and a flick carries on), tap a side card, or the arrows ----------
  // the map that lands in the middle is the map at once; a planned one is only shown
  function landSeason(i) {
    nearItem = null; seasonAt = i; const s = seasonList[i];
    if (ownsSeason(s) && s.id !== seasonId) { seasonId = s.id; onSeason?.(s.id); }
    renderSpec(); renderPlay();
  }
  // an owned truck that lands in the middle is the one PLAY drives
  function landCar(c) { nearItem = null; browse = c; if (owns(c.id) && c.id !== car.id) choose(c); setTitle(nameOf(c)); renderTop(); renderSpec(); renderPlay(); }
  function showCar(c) { browse = c; if (owns(c.id) && c.id !== car.id) choose(c); render(); }
  const stepPage = d => deck.go(d);

  // the sliding row: every card sits at a float position, the middle one at 0; side cards shrink, tilt and dim.
  // Trucks and Seasons use it, and so do Shop, Missions and Upgrade (user, 2026-11-24: "just like the cars and the seasons
  // have slidable cards implement that for the other sections"). `wrap` rows go round (Trucks, Seasons); the pages' rows
  // stop at their ends and keep every card in the page. `size` gives the middle card's size and how small the side ones are.
  // `circle` rows (the pages) go round too, but draw each of their cards once, at its nearest place to the middle, so there
  // are always cards to the left and right of the middle one and never the same card twice.
  function makeDeck(box, { stage = box, track = null, wrap: wraps = true, circle = false, guard = () => true, size }) {
    const slots = new Map();   // index (unbounded when the row wraps) -> card element
    let cfg = null, key = null, pos = 0, vel = 0, target = null, raf = 0, last = 0, near = null;
    let m = { step1: 1, step2: 1, side: .55 };
    const n = () => cfg?.items.length ?? 0, wrap = k => wraps ? ((k % n()) + n()) % n() : Math.max(0, Math.min(n() - 1, k));
    function measure() {
      const W = box.clientWidth || 1, H = box.clientHeight || 1, { w, h, side, gap } = size(W, H), sw = w * side;
      m = { step1: w / 2 + gap + sw / 2, step2: sw + gap, side };
      box.style.setProperty('--w', `${w}px`); box.style.setProperty('--h', `${h}px`);
    }
    // a card d places from the middle: moved out, tilted, shrunk and dimmed
    function pose(e, d) {
      const ad = Math.abs(d), a = Math.min(ad, 1), sc = 1 - (1 - m.side) * a, sign = Math.sign(d);
      const x = sign * (a * m.step1 + Math.max(ad - 1, 0) * m.step2);
      e.style.transform = `translate3d(${x.toFixed(1)}px, 0, 0) rotateY(${(-sign * a * 16).toFixed(2)}deg) scale(${sc.toFixed(4)})`;
      e.style.opacity = ad <= 1.5 ? 1 : Math.max(0, 1 - (ad - 1.5) / 1.1);
      e.style.zIndex = String(100 - Math.round(ad * 10));
      e.style.setProperty('--a', a.toFixed(3)); e.style.setProperty('--s', sc.toFixed(4));
      e.classList.toggle('mid', ad < 0.5);
      e.style.visibility = ad > 2.6 ? 'hidden' : '';
    }
    // how far card i is from the middle, the short way round
    const offset = i => { const c = n(); let d = (((i - pos) % c) + c) % c; if (d > c / 2) d -= c; return d; };
    function draw() {
      if (!cfg) return;
      const count = n(), reach = count > 1 ? 3 : 0, base = Math.round(pos), keep = new Set();
      if (circle) {
        for (let i = 0; i < count; i++) {
          const d = offset(i); keep.add(i);
          let e = slots.get(i);
          if (!e) {
            e = cfg.make(cfg.items[i]); e.dataset.k = i; e.tabIndex = -1;
            // a side card only comes to the middle: its buttons do nothing until it is there
            e.addEventListener('click', ev => { const dd = offset(i); if (Math.abs(dd) >= 0.5) { ev.stopPropagation(); ev.preventDefault(); to(Math.round(target ?? pos) + Math.round(dd)); } }, true);
            slots.set(i, e); box.append(e);
          }
          pose(e, d);
        }
      } else
      // a row that wraps draws the cards near the middle; a page's row draws all of its cards
      for (let k = wraps ? base - reach : 0; k <= (wraps ? base + reach : count - 1); k++) {
        const d = k - pos, ad = Math.abs(d);
        if (wraps && ad > 2.6) continue;
        keep.add(k);
        let e = slots.get(k);
        if (!e) {
          e = cfg.make(cfg.items[wrap(k)]); e.dataset.k = k; e.tabIndex = -1;
          // a side card only comes to the middle: its buttons do nothing until it is there
          e.addEventListener('click', ev => { if (k !== Math.round(target ?? pos)) { ev.stopPropagation(); ev.preventDefault(); to(k); } }, true);
          slots.set(k, e); box.append(e);
        }
        pose(e, d);
      }
      for (const [k, e] of slots) if (!keep.has(k)) { e.remove(); slots.delete(k); }
      const thumb = track?.firstElementChild;
      if (thumb && count > 1) { thumb.style.width = `${100 / count}%`; thumb.style.transform = `translateX(${(((pos % count) + count) % count * 100).toFixed(1)}%)`; }
      const at = count ? wrap(base) : null;
      if (at !== near) { near = at; if (at != null) cfg.near?.(at); }
    }
    // a critically damped spring: no bounce, and a flick's speed carries straight into it
    function tick(t) {
      const dt = Math.min(32, t - (last || t)); last = t;
      if (target != null) {
        const w = 0.018, acc = w * w * (target - pos) - 2 * w * vel;
        vel += acc * dt; pos += vel * dt;
        if (Math.abs(target - pos) < 0.0015 && Math.abs(vel) < 0.0002) {
          pos = target; vel = 0; const k = target; target = null; raf = 0; last = 0; draw(); cfg?.land?.(wrap(k)); return;
        }
      }
      draw(); raf = requestAnimationFrame(tick);
    }
    const run = () => { if (!raf) { last = 0; raf = requestAnimationFrame(tick); } };
    function to(k) { if (n() < 2) return; target = wraps ? k : Math.max(0, Math.min(n() - 1, k)); run(); }
    // dragging
    let drag = null;
    stage.addEventListener('pointerdown', e => {
      if (!cfg || n() < 2 || e.button > 0 || !guard(e)) return;
      drag = { id: e.pointerId, x0: e.clientX, pos0: pos, moving: false, pts: [[e.timeStamp, e.clientX]] };
    });
    stage.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x0;
      if (!drag.moving) {
        if (Math.abs(dx) < 6) return;
        drag.moving = true; drag.x0 = e.clientX; drag.pos0 = pos; target = null; vel = 0;
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
        try { stage.setPointerCapture(e.pointerId); } catch (err) {}
      }
      pos = drag.pos0 - (e.clientX - drag.x0) / m.step1;
      if (!wraps) pos = Math.max(-0.35, Math.min(n() - 0.65, pos));
      drag.pts.push([e.timeStamp, e.clientX]); if (drag.pts.length > 8) drag.pts.shift();
      draw();
    });
    const release = e => {
      if (!drag || e.pointerId !== drag.id) return;
      const d = drag; drag = null;
      if (!d.moving) return;
      swallowClick();
      // finger speed over the last ~90 ms, in cards per ms
      const now = e.timeStamp, recent = d.pts.filter(p => now - p[0] < 90), p0 = recent[0] ?? d.pts[0];
      const v = now > p0[0] ? -(e.clientX - p0[1]) / (now - p0[0]) / m.step1 : 0;
      const fling = v * 260 * (1 + Math.abs(v) * 160);
      let k = Math.round(pos + Math.max(-14, Math.min(14, fling)));
      const start = Math.round(d.pos0);
      if (k === start && Math.abs(pos - d.pos0) > 0.12) k += Math.sign(pos - d.pos0);   // a short drag still moves one card
      vel = v; to(k);
    };
    stage.addEventListener('pointerup', release);
    stage.addEventListener('pointercancel', release);
    // a drag must not also count as a tap on the card under the finger
    const swallowClick = () => { const stop = ev => { ev.stopPropagation(); ev.preventDefault(); }; window.addEventListener('click', stop, { capture: true, once: true }); setTimeout(() => window.removeEventListener('click', stop, { capture: true }), 400); };
    window.addEventListener('resize', () => { if (cfg && box.clientWidth) { measure(); draw(); } });
    // a card still sliding to the middle counts as picked: leaving the page or pressing PLAY mid-slide used to drop the pick
    // (the title and scene had already changed, but `land` never ran, so the map did not switch)
    function settle() {
      if (target == null || !cfg) return;
      if (raf) cancelAnimationFrame(raf); raf = 0; last = 0;
      const k = target, c = cfg; pos = k; vel = 0; target = null; draw(); c.land?.(wrap(k));
    }
    return {
      settle,
      set(next) {
        if (next.key !== key) settle();
        const same = next.key === key && cfg;
        cfg = next; box.classList.add('deck'); if (track) track.hidden = n() < 2;
        if (same && !next.rebuild) return;
        if (!same || target == null) { if (raf) cancelAnimationFrame(raf); raf = 0; target = null; vel = 0; pos = Math.max(0, next.at); }
        key = next.key; near = null;
        box.replaceChildren(); slots.clear();
        measure(); draw();
      },
      clear() {
        settle();
        if (raf) cancelAnimationFrame(raf); raf = 0; cfg = null; key = null; target = null; vel = 0; drag = null;
        slots.clear(); box.classList.remove('deck'); if (track) track.hidden = true;
      },
      go(d) { if (n() > 1) to(Math.round(target ?? pos) + d); },
      // the card in the middle (or on its way there), to keep it there when the row is redrawn
      get at() { return cfg ? wrap(Math.round(target ?? pos)) : 0; },
      // after the page opens: its real size is known only once it is shown
      refresh() { if (cfg && box.clientWidth) { measure(); draw(); } },
    };
  }
  function deckSize(W, H) {
    const tall = W < H * 1.3, w = tall ? W * 0.8 : Math.min(W * 0.44, H * 1.6), h = Math.min(H - 30, w * (tall ? 0.78 : 0.76));   // room for the label above and the specs below
    return { w, h, side: tall ? 0.62 : 0.56, gap: Math.max(10, W * 0.02) };
  }
  const deck = makeDeck($('hcCards'), {
    stage: $('hcStage'), track: $('hcTrack'),
    // a swipe on the Shop, Missions or Upgrade page moves that page, never the hidden truck or map row behind it
    guard: e => !garageEl.dataset.sheet && !e.target.closest('.g-classes, .hc-under, .hc-stage > .overlay'),   // not '.overlay': the garage itself is one
    size: deckSize,
  });
  // the pages' rows slide like Trucks and Seasons, one card in the middle and cards either side, but their cards are sized
  // for what is on them (user, 2026-11-24: the truck size was too big for an upgrade, a tiny one made no sense): an upright
  // card (width:height = 1:ratio) most of the row's height, never taller than `maxH`, never wider than most of a phone
  // (2026-11-24) the pages' cards are the Trucks and Seasons card: the same rectangle, its name over it, what it is in the
  // frame. The PLAY button does what the middle card offers (pageMid, pageAction).
  const pageDeck = id => makeDeck($(id), { circle: true, size: deckSize });
  const decks = { upgrade: pageDeck('tuneList'), missions: pageDeck('missionList'), shop: pageDeck('shopGrid') };
  const pageMid = { upgrade: null, missions: null, shop: null };   // the item in the middle of each page's row
  const midOf = (name, items) => i => { pageMid[name] = items[i]; renderPlay(); };
  {
    window.addEventListener('keydown', e => {
      if (garageEl.hidden || document.querySelector('.garage .overlay:not([hidden])')) return;
      if (e.key === 'ArrowLeft') stepPage(-1); else if (e.key === 'ArrowRight') stepPage(1);
      else if (e.key === 'Escape' && page !== 'vehicle') go('vehicle');
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
  // locked one into the rank it needs.
  // PLAY says what the card in the middle needs the moment it gets there (user, 2026-11-24: it used to wait for the slide to
  // come to rest, about 3 s). `nearItem` is that card while a slide is under way; landing clears it.
  let nearItem = null;
  const seasonToBuy = () => { const s = page === 'seasons' ? (seasonList.includes(nearItem) ? nearItem : seasonList[seasonAt]) : null; return s && s.status === 'playable' && !ownsSeason(s) ? s : null; };
  // On Upgrade, Powers, Missions and Shop the PLAY button does what the middle card offers (user, 2026-11-24: thumbs reach the
  // bar, not the middle of the screen): UPGRADE with the next step's price (tap again for the next), EQUIP, CHOOSE, or BUY
  // with the price. Once there is nothing left to do it is PLAY again, but only after PLAY_LOCK_MS, so a player tapping
  // UPGRADE quickly never starts a run by accident with the tap after the last step.
  const PLAY_LOCK_MS = 700;
  let playLockUntil = 0, playLockT = 0;
  function lockPlay() { playLockUntil = performance.now() + PLAY_LOCK_MS; clearTimeout(playLockT); playLockT = setTimeout(renderPlay, PLAY_LOCK_MS + 20); }
  function pageAction() {
    const sheetName = garageEl.dataset.sheet; if (!sheetName) return null;
    const x = pageMid[sheetName]; if (!x) return null;
    if (sheetName === 'upgrade' && x.knob) {
      const level = clampLevel(tuneOf(car.id)[x.knob.id]); if (level >= MAX_LEVEL) return null;
      const price = upgradeCost(car, level, level + STEP);
      return { label: '', coins: price, poor: wallet.coins < price, run: () => { if (setLevel(x.knob, level + STEP)) lockPlay(); else shake($('tuneCoins').parentElement); } };
    }
    if (sheetName === 'upgrade' && x.power) return powers[car.id] === x.power.id ? null : { label: 'Equip', run: () => { equip(x.power); lockPlay(); } };
    if (sheetName === 'missions') return missions?.active?.id === x.id ? null : { label: 'Choose', run: () => { pickMission(x); lockPlay(); } };
    if (sheetName === 'shop') return shop.done(x) ? null : { label: '', text: buying ? '…' : shop.priceText(x), busy: buying, run: () => buyOffer(x) };
    return null;
  }
  function renderPlay() {
    const act = pageAction();
    if (act) {
      const btn = $('startBtn'); btn.replaceChildren(); btn.className = 'hc-btn go buy'; btn.disabled = !!act.busy;
      btn.classList.toggle('poor', !!act.poor);
      if (act.label) btn.append(el('span', null, act.label));   // buying shows only the price (user, 2026-11-24)
      if (act.coins != null) btn.append(el('i', 'coinic'), el('b', null, formatCoins(act.coins)));
      else if (act.text) btn.append(el('b', null, act.text));
      return;
    }
    renderPlayButton();
    if (performance.now() < playLockUntil) { $('startBtn').disabled = true; $('startBtn').classList.add('cooling'); }
  }
  function renderPlayButton() {
    const near = page === 'vehicle' && nearItem && !seasonList.includes(nearItem) ? nearItem : null;
    const btn = $('startBtn'), c = page === 'vehicle' ? (near ?? browse) : car; btn.replaceChildren(); btn.className = 'hc-btn go';
    const map = seasonToBuy();
    if (map) { const price = seasonPass.price(map.id); btn.disabled = false; btn.classList.add('buy'); btn.classList.toggle('poor', wallet.coins < price); btn.append(el('i', 'coinic'), el('b', null, formatCoins(price))); return; }
    const mine = owns(c.id), open = isOpen(c.id);
    btn.disabled = !mine && !open;
    if (mine) btn.append(el('span', null, 'Play'));
    else if (open) { const price = progress.price(c.id); btn.classList.add('buy'); btn.classList.toggle('poor', wallet.coins < price); btn.append(el('i', 'coinic'), el('b', null, formatCoins(price))); }
    else { btn.classList.add('locked'); btn.append(gIcon('lock'), el('span', null, `Rank ${unlockOf(c.id)}`)); }
  }
  $('startBtn').addEventListener('click', () => {
    const sheetName = garageEl.dataset.sheet;
    if (sheetName) { decks[sheetName]?.settle(); const act = pageAction(); if (act) { act.run(); renderPlay(); return; } }
    if (performance.now() < playLockUntil) return;   // the tap after the last upgrade step does not start a run
    deck.settle();
    const map = seasonToBuy();
    if (map) {
      if (!seasonPass.buy(map.id, wallet)) { shake($('gCoinsBox')); return; }   // not enough coins
      onBuy?.(); seasonId = map.id; onSeason?.(map.id); sortSeasons(); seasonAt = seasonList.indexOf(map); render(); return;
    }
    const c = page === 'vehicle' ? browse : car;
    if (owns(c.id)) { onStart({ car: tunedOf(c) }); return; }
    if (!isOpen(c.id)) return;
    if (progress.buy(c.id, wallet)) { onBuy?.(); choose(c); render(); return; }
    shake($('gCoinsBox'));   // not enough coins
  });
  function choose(c) { car = c; try { localStorage.setItem('haul.car', c.id); } catch (e) {} onSelect(car); }
  const shake = box => { box.classList.remove('short'); void box.offsetWidth; box.classList.add('short'); };

  // ---------- upgrades: a tile per knob with its icon, its level and the price of the next step; the powers below ----------
  // one upgrade: its icon, level and pips; PLAY buys the next step (upgradeStep), the small − sells one back
  function tuneTile(knob) {
    const t = tuneOf(car.id), n = MAX_LEVEL / STEP, level = clampLevel(t[knob.id]), full = level >= MAX_LEVEL;
    const bar = el('span', 'tbar');
    for (let i = 0; i < n; i++) bar.append(el('i', 'pip' + ((i + 1) * STEP <= level ? ' on' : '')));
    const pic = el('i', 'tpic'); pic.append(gIcon(knob.id));
    const card = pageCard({ label: knob.label, kind: 'pc-tune', body: [pic, bar], sub: full ? 'Max' : `Level ${level / STEP} / ${n}`, badge: full ? 'Max' : null, on: full });
    if (level > 0) {
      const minus = el('span', 'pc-minus', '−'); minus.setAttribute('role', 'button'); minus.setAttribute('aria-label', `Lower ${knob.label}`);
      minus.addEventListener('click', e => { if (!card.classList.contains('mid')) return; e.stopPropagation(); setLevel(knob, level - STEP); });
      card.querySelector('.hc-frame').append(minus);
    }
    return card;
  }
  // set a knob's level on the chosen truck, paying or refunding the difference; false when the coins are short
  function setLevel(knob, to) {
    const current = tuneOf(car.id), from = clampLevel(current[knob.id]), c = clampLevel(to), cost = upgradeCost(car, from, c);
    if (c === from) return false;
    if (cost > 0 && !wallet.spend(cost)) return false;
    if (cost < 0) wallet.add(-cost);
    if (c) current[knob.id] = c; else delete current[knob.id];
    saveTuning(tuning); if (cost > 0) onBuy?.(); renderTuning(); renderTop(); renderSpec();
    return true;
  }
  // The Upgrade page has two tabs, like the classes on the Trucks page (user, 2026-11-24): Upgrades (the four knobs, bought
  // with coins) and Powers (one at a time, free to pick). It opens on Upgrades; a purchase or a pick keeps the tab and card.
  let tuneTab = 'upgrades';
  const TUNE_TABS = [['upgrades', 'Upgrades', 'speed'], ['powers', 'Powers', 'power']];
  function renderTuneTabs() {
    const box = $('tuneTabs'); box.replaceChildren();
    for (const [id, label, ic] of TUNE_TABS) {
      const b = el('button', 'g-class' + (id === tuneTab ? ' on' : ''));
      const svg = gIcon(ic); if (svg) b.append(svg);
      b.append(el('b', null, label));
      b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(id === tuneTab));
      b.addEventListener('click', () => { if (id !== tuneTab) { tuneTab = id; renderTuning(); } });
      box.append(b);
    }
  }
  function renderTuning() {
    const t = tuneOf(car.id), key = `upgrade:${car.id}:${tuneTab}`;
    renderTuneTabs();
    // Engine (or the first power) starts in the middle; after a purchase the same card stays there
    const items = tuneTab === 'powers' ? POWERS.map(power => ({ power })) : KNOBS.map(knob => ({ knob }));
    decks.upgrade.set({ key, rebuild: true, at: decks.upgrade.key === key ? decks.upgrade.at : 0, items,
      make: x => x.knob ? tuneTile(x.knob) : powerCard(x.power), near: midOf('upgrade', items) });
    decks.upgrade.key = key;
    $('tuneReset').disabled = !Object.keys(t).length;   // greyed out while the truck is stock
    $('tuneReset').style.visibility = tuneTab === 'powers' ? 'hidden' : '';   // it resets upgrades only
    $('tuneCoins').textContent = formatCoins(wallet.coins);
    $('tuneFor').textContent = nameOf(car);
  }
  $('tuneReset').addEventListener('click', () => {
    const t = tuneOf(car.id); for (const knob of KNOBS) wallet.add(-upgradeCost(car, clampLevel(t[knob.id]), 0));
    tuning[car.id] = {}; saveTuning(tuning); renderTuning(); render();
  });
  // only a truck the player owns can be upgraded: the button is off while an unbought one is in view
  const inView = () => page === 'vehicle' ? browse : car;
  $('gMenuTune').addEventListener('click', () => {
    if (!owns(inView().id)) { shake($('gMenuTune')); return; }
    if (garageEl.dataset.sheet === 'upgrade') { sheet(null); render(); return; }
    go('vehicle'); if (!owns(car.id)) return; tuneTab = 'upgrades'; renderTuning(); sheet('upgrade');
  });
  $('tuneDone').addEventListener('click', () => { sheet(null); render(); });

  // powers: one at a time for this truck, kept until another is picked; tapping the one that is on turns it off
  function powerCard(power) {
    const on = power.id === powers[car.id], pic = el('i', 'tpic'); pic.append(gIcon(power.id));
    return pageCard({ label: power.label, kind: 'pc-power', body: [pic, el('small', 'pc-text', power.short ?? power.what)], badge: on ? 'On' : null, on,
      // tapping the one that is on takes it off; PLAY puts one on
      onClick: e => { if (!e.currentTarget.classList.contains('mid') || !on) return; delete powers[car.id]; savePowers(powers); renderTuning(); renderPlay(); } });
  }
  const equip = power => { powers[car.id] = power.id; savePowers(powers); renderTuning(); };

  // ---------- missions: a row per offer with its XP; one can be chosen, and tapping it again puts it down ----------
  function renderMissions() {
    if (!missions) return;
    const active = missions.active, cards = [];
    const row = (m, tag) => {
      const on = active?.id === m.id, stars = missions.starsFor?.(m) ?? 1, need = missions.needsFor?.(m);
      const pay = `+${missions.xpFor(m).toLocaleString('en-US')} XP${m.coins ? ` · +${formatCoins(m.coins)} coins` : ''}`;
      const body = [el('em', 'mstars', '★'.repeat(stars) + '☆'.repeat(3 - stars)), el('b', 'pc-goal', m.text)];
      if (m.story) body.push(el('i', 'pc-story', m.story));
      if (need) body.push(el('span', 'mneed', need.rank ? `Rank ${need.rank}: ${nameOf(need.car)}` : `Buy the ${nameOf(need.buy)}`));
      return pageCard({ label: m.title, kind: 'pc-mission', body, sub: pay, on, badge: on ? 'Chosen' : null,
        tag: tag === 'sig' ? 'Signature' : m.daily ? 'Daily' : m.weekly ? 'Weekly' : m.featured ? 'Featured' : null,
        // tapping the chosen one puts it down; PLAY chooses
        onClick: e => { if (e.currentTarget.classList.contains('mid') && on) pickMission(m); } });
    };    // the chosen truck's signature haul, when this is its home map; only missions are shown, no hints about other maps
    // (user, 2026-11-24)
    const sig = car && missions.signatureFor?.(car);
    if (sig) cards.push(() => row(sig, 'sig'));
    const offers = missions.offers.filter(m => m.id !== sig?.id);
    for (const m of offers) cards.push(() => row(m, m.daily || m.weekly ? 'feat challenge' : m.featured ? 'feat' : ''));
    // the chosen mission (else the first) starts in the middle; after a choice the same card stays there
    const key = `missions:${car.id}:${offers.map(m => m.id).join(',')}`, first = cards.length - offers.length;
    const chosen = offers.findIndex(m => m.id === active?.id);
    const items = [...(sig ? [sig] : []), ...offers];
    decks.missions.set({ key, rebuild: true, items: cards, make: f => f(), near: midOf('missions', items),
      at: decks.missions.key === key ? decks.missions.at : chosen >= 0 ? first + chosen : Math.min(first, cards.length - 1) });
    decks.missions.key = key;
  }
  // choose a mission (or put the chosen one down); a mission for one truck or class picks that truck
  function pickMission(m) {
    missions.choose(m.id, car);
    const on = missions.active?.id === m.id, want = on && m.car ? playable.get(m.car) : null;
    if (want && want.id !== car.id) { cls = want.class; browse = want; if (owns(want.id)) choose(want); }
    else if (on && m.class && car.class !== m.class) { const mine = classCars(m.class).filter(c => owns(c.id)).at(-1); if (mine) { cls = m.class; browse = mine; choose(mine); } }
    nearItem = null; renderMissions(); renderTop(); renderPlay();
  }
  function openMissions() { go('vehicle'); renderMissions(); sheet('missions'); }
  $('gMenuMissions').addEventListener('click', () => { if (garageEl.dataset.sheet === 'missions') { sheet(null); render(); } else openMissions(); });
  $('missionsDone').addEventListener('click', () => { sheet(null); render(); });

  // ---------- the shop: tabs, then a card per offer with its picture, what it gives and its price ----------
  // a Google Play purchase that finished later (pending payment, app closed mid-purchase) shows up at once
  const shop = createShop({ content, progress, wallet, onLateGrant: () => { onBuy?.(); render(); },
    maps: { ids: seasonList.filter(s => s.status === 'playable' && !FREE_SEASONS.includes(s.id)).map(s => s.id), owns: id => seasonPass.owns(id), grant: id => seasonPass.grant(id), revoke: id => seasonPass.revoke(id) } });
  let shopTab = 'featured';
  function renderShop() {
    $('shopCoins').textContent = formatCoins(wallet.coins);
    $('shopTest').hidden = !shop.test;
    const tabs = $('shopTabs'); tabs.replaceChildren();
    for (const [id, label] of shop.tabs) {
      const b = el('button', 'shop-tab' + (id === shopTab ? ' on' : ''), label); b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(id === shopTab));
      b.addEventListener('click', () => { shopTab = id; renderShop(); }); tabs.append(b);
    }
    const list = shop.offers(shopTab), key = `shop:${shopTab}`;
    $('shopGrid').dataset.tab = shopTab;
    // the first offer still for sale starts in the middle; after a purchase the same card stays there
    decks.shop.set({ key, rebuild: true, items: list, make: offerCard, near: midOf('shop', list),
      at: decks.shop.key === key ? decks.shop.at : Math.max(0, list.findIndex(o => !shop.done(o))) });
    decks.shop.key = key;
  }
  // the arrow keys move the open page's cards
  window.addEventListener('keydown', e => {
    const d = !garageEl.hidden && decks[garageEl.dataset.sheet]; if (!d) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { d.go(e.key === 'ArrowRight' ? 1 : -1); e.preventDefault(); }
  });
  // A coin pack's picture: a heap of coins that fills the frame, more rows and a wider heap for a bigger pack (2 rows for
  // the smallest, 7 for the biggest). Drawn as an SVG so it scales with the card; a soft gold glow under it.
  function coinPile(size) {
    const NS = 'http://www.w3.org/2000/svg', W = 160, H = 100, rows = 2 + size, fill = 0.6 + 0.065 * size;
    const r = Math.min(W * fill / (2 + 1.64 * (rows - 1)), H * 0.9 / (2 + 1.1 * (rows - 1)));
    const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('class', 'coinpile');
    const base = (H + 2 * r + (rows - 1) * r * 1.1) / 2 + 2;   // the heap's foot, so it sits centred in the picture
    const glow = document.createElementNS(NS, 'ellipse');
    Object.entries({ cx: W / 2, cy: base - r * 0.55, rx: r * (rows + 0.8), ry: r * 0.7, fill: 'rgba(242,194,26,0.22)' }).forEach(([k, v]) => glow.setAttribute(k, v));
    svg.append(glow);
    let n = 17 + size * 31; const rnd = () => { n = (n * 1664525 + 1013904223) >>> 0; return n / 4294967296; };
    for (let row = rows - 1; row >= 0; row--) {   // the top row first, so the lower, nearer coins overlap it
      const count = rows - row, y = base - r - row * r * 1.1 - 2;
      for (let i = 0; i < count; i++) {
        const x = W / 2 + (i - (count - 1) / 2) * r * 1.64 + (rnd() - 0.5) * r * 0.25, c = document.createElementNS(NS, 'image');
        c.setAttribute('href', content.hud['g2-coin']);
        const k = r * (0.94 + rnd() * 0.12);
        Object.entries({ x: x - k, y: y - k + (rnd() - 0.5) * r * 0.15, width: 2 * k, height: 2 * k }).forEach(([a, v]) => c.setAttribute(a, v.toFixed(2)));
        svg.append(c);
      }
    }
    return svg;
  }
  // an offer: its picture in the frame, what it gives along the foot; PLAY buys it (buyOffer)
  function offerCard(o) {
    const finished = shop.done(o), art = el('span', `sart pics${Math.min(3, o.pics.length)}`);
    if (o.pics.length) for (const p of o.pics.slice(0, 3)) { const img = el('img'); img.src = p; img.alt = ''; img.draggable = false; img.loading = 'lazy'; art.append(img); }
    else if (o.kind === 'coins') { art.classList.add('coins', `size${o.size}`); art.append(coinPile(o.size)); }
    else { const g = gIcon(o.kind === 'rank' ? 'rank' : o.kind === 'bundle' ? 'bundle' : 'cash'); art.append(g); if (o.kind === 'rank') art.append(el('b', 'srank', `+${o.ranks}`)); }
    const card = pageCard({ label: o.title, kind: `pc-offer pc-${o.kind}`, body: art, sub: o.sub, tag: o.tag || null,
      badge: finished ? (o.kind === 'rank' ? (progress.rank >= progress.maxRank ? 'Top rank' : `Max +${progress.maxRank - progress.rank}`) : 'Owned') : null });
    if (finished) card.classList.add('owned');
    return card;
  }
  let buying = false;
  async function buyOffer(o) {
    if (buying || shop.done(o)) return;
    buying = true; renderPlay();
    const res = await shop.buy(o);
    buying = false;
    if (!res.ok) { if (res.error) $('shopNote').textContent = res.error; renderPlay(); return; }
    onBuy?.(); lockPlay();
    const got = res.got ?? { coins: 0, ups: [], trucks: [] };
    $('shopNote').textContent = [got.coins ? `+${formatCoins(got.coins)} coins` : '', got.ups.length ? `Rank ${got.ups.at(-1).rank}` : '', got.trucks.length ? `+${got.trucks.length} truck${got.trucks.length === 1 ? '' : 's'}` : '', got.maps?.length ? `+${got.maps.length} map${got.maps.length === 1 ? '' : 's'}` : ''].filter(Boolean).join('  ·  ') || 'Bought';
    if (got.trucks.length === 1 && playable.has(got.trucks[0])) { const c = playable.get(got.trucks[0]); choose(c); browse = c; cls = c.class; }
    renderTop(); if (garageEl.dataset.sheet === 'shop') renderShop(); renderPlay();
  }
  function openShop(tab) { go('vehicle'); if (tab) shopTab = tab; $('shopNote').textContent = 'Bundles, coins and ranks'; renderShop(); sheet('shop'); }
  $('gMenuShop').addEventListener('click', () => { if (garageEl.dataset.sheet === 'shop') { sheet(null); render(); } else openShop(); });
  $('gCoinsBox').addEventListener('click', () => openShop('coins'));
  $('shopDone').addEventListener('click', () => { sheet(null); render(); });

  // ---------- PLAY, and the player's rank and coins ----------
  function renderTop() {
    $('gCoins').textContent = formatCoins(wallet.coins);
    $('gMenuTune').disabled = !owns(inView().id);
    if (progress) {
      const pr = progress.progress;
      $('gRankNum').textContent = `Rank ${pr.rank}`;
      $('gRankFill').style.width = `${(pr.share * 100).toFixed(1)}%`;
      $('gRankXp').textContent = pr.top ? `${pr.xp.toLocaleString('en-US')} XP · top rank` : `${pr.xp.toLocaleString('en-US')} / ${pr.to.toLocaleString('en-US')} XP`;
    }
  }
  function render() {
    garageEl.dataset.page = page;
    for (const [id, p] of [['hcSeasons', 'seasons'], ['hcVehicle', 'vehicle']]) $(id).classList.toggle('on', page === p);
    if (page !== 'seasons') setScene(seasonId); renderTop(); if (page === 'vehicle') renderClasses(); renderStage(); renderPlay(); }
  garageEl.dataset.page = page;
  render(); onSelect(car);

  return {
    show() { garageEl.hidden = false; go('vehicle'); },
    // after a map switch elsewhere (a test, the stored season at launch)
    seasonChanged() { seasonId = content.season.id; render(); },
    hide() { garageEl.hidden = true; },
    // tests and quick starts: drive this truck
    select(carId) { const c = playable.get(carId); if (c) { car = c; browse = c; cls = c.class; onSelect(car); } render(); return { car: tunedOf(car) }; },
    tune(carId, knob, k) { tuneOf(carId)[knob] = clampLevel(k); saveTuning(tuning); render(); },
    get selection() { return { car: tunedOf(car) }; },
    openShop, shop,
    // a class's trucks in the order the Trucks page shows them
    trucksOf: c => classCars(c).map(x => x.id),
    get seasonId() { return seasonId; },
    // Android's back button in the garage: closes an open card, then a page, back to the trucks; false when there is nothing to close
    back() {
      if (garageEl.hidden) return false;
      if (garageEl.dataset.sheet) { sheet(null); render(); return true; }
      if (page !== 'vehicle') { go('vehicle'); return true; }
      return false;
    },
  };
}
