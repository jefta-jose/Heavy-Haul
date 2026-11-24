import { formatCoins } from './format.js';
// Everything drawn in HTML over the canvas: the depot sign, coins, surface chip, toasts, the gauges (revs, speed, fuel), drive buttons, and the message
// overlays. Kept lean on purpose (2026-11-06): no status panel, no trail map, no park or engine buttons.

const $ = id => document.getElementById(id);

export function createHud({ sim, season }) {
  const els = {};
  for (const id of ['powerBtn', 'distTxt', 'coinTxt', 'surfChip', 'surfTxt', 'damageFill', 'depotSign', 'distUnit', 'toast', 'gauges', 'gas', 'brake', 'awdBtn', 'diffBtn', 'fsBtn', 'pauseBtn', 'actionBtn', 'msgOv', 'msgEyebrow', 'msgTitle', 'msgText', 'msgSpec', 'msgBtns']) els[id] = $(id);
  const gx = els.gauges.getContext('2d');
  const trail = season.trail;
  let toastT = 0, hudT = 0, gaugeT = 0;

  const km = m => m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;

  // the vehicle card and chips follow the vehicle being driven (car.json text)
  function setCar(car) {
    document.title = `Heavy Haul · ${car.name} ${car.number ?? ''}`.trim();
  }

  // hints sit centred just under the depot sign, wherever the layout puts it
  const FILLING = 'Fueling and healing...';
  function toast(msg, secs = 2.5) {
    const sign = els.depotSign.getBoundingClientRect(), hud = els.toast.offsetParent?.getBoundingClientRect();
    if (hud && sign.height) els.toast.style.top = `${Math.round(sign.bottom - hud.top + 8)}px`;
    els.toast.textContent = msg; els.toast.classList.add('on'); toastT = secs; }
  // a teaching hint: shown the first HINT_TIMES times on this device, then the sound and the
  // button lights say it on their own
  const HINT_TIMES = 3;
  function hint(key, msg, secs) {
    let seen = 0;
    try { seen = Number(localStorage.getItem(`haul.hint.${key}`)) || 0; localStorage.setItem(`haul.hint.${key}`, String(seen + 1)); } catch (e) {}
    if (seen < HINT_TIMES) toast(msg, secs);
  }

  function resizeGauges(DPR) { els.gauges.width = Math.round(els.gauges.clientWidth * DPR); els.gauges.height = Math.round(els.gauges.clientHeight * DPR); }
  // analog dials (Basecamp theme, 2026-11-18): a dark glass face with a thin ring in the dial's colour, minor and major ticks,
  // a lit arc that follows the value, a red zone, a white needle glowing orange, and a readout in the middle (the gear, or the speed)
  const A0 = Math.PI * 0.75, A1 = Math.PI * 2.25, FONT = 'Barlow Condensed, Arial Narrow, sans-serif';
  // the case every dial shares: a dark glass disc, a thin ring in the dial's colour with a brighter arc along its top, and a deep face
  function bezel(cx, cy, r, accent) {
    gx.save(); gx.shadowColor = 'rgba(0,0,0,0.55)'; gx.shadowBlur = r * 0.16;
    gx.fillStyle = 'rgba(6,9,13,0.86)'; gx.beginPath(); gx.arc(cx, cy, r, 0, 7); gx.fill(); gx.restore();
    gx.strokeStyle = 'rgba(255,255,255,0.12)'; gx.lineWidth = Math.max(1, r * 0.015); gx.beginPath(); gx.arc(cx, cy, r * 0.965, 0, 7); gx.stroke();
    gx.save(); gx.strokeStyle = accent; gx.lineWidth = r * 0.035; gx.lineCap = 'round'; gx.shadowColor = accent; gx.shadowBlur = r * 0.12;
    gx.beginPath(); gx.arc(cx, cy, r * 0.965, Math.PI * 1.2, Math.PI * 1.8); gx.stroke(); gx.restore();
    const g = gx.createRadialGradient(cx, cy - r * 0.2, r * 0.05, cx, cy, r * 0.9);
    g.addColorStop(0, '#1c232c'); g.addColorStop(0.75, '#0b0f14'); g.addColorStop(1, '#05070a');
    gx.fillStyle = g; gx.beginPath(); gx.arc(cx, cy, r * 0.92, 0, 7); gx.fill();
    return g;
  }
  // no glare on the glass: the Basecamp dials are flat and dark
  function glass() {}
  function dial(cx, cy, r, val, max, { label, majors, minors = 2, redFrom, readout, unit, lit, badge, pop = 0, small = false }) {
    const t = Math.min(1, Math.max(0, val / max)), at = A0 + (A1 - A0) * t;
    let g = bezel(cx, cy, r, lit[1]);
    // track, lit arc and red zone
    gx.lineCap = 'butt'; gx.lineWidth = r * 0.075;
    gx.strokeStyle = 'rgba(255,255,255,0.08)'; gx.beginPath(); gx.arc(cx, cy, r * 0.78, A0, A1); gx.stroke();
    g = gx.createLinearGradient(cx - r, cy, cx + r, cy); g.addColorStop(0, lit[0]); g.addColorStop(1, lit[1]);
    gx.strokeStyle = g; gx.beginPath(); gx.arc(cx, cy, r * 0.78, A0, Math.max(A0 + 0.001, at)); gx.stroke();
    gx.strokeStyle = '#e0312b'; gx.lineWidth = r * 0.05; gx.beginPath(); gx.arc(cx, cy, r * 0.86, A0 + (A1 - A0) * redFrom, A1); gx.stroke();
    // ticks and numbers
    gx.textAlign = 'center'; gx.textBaseline = 'middle'; gx.font = `700 ${Math.round(r * (small ? 0.21 : 0.16))}px ${FONT}`;
    const n = majors * minors;
    for (let i = 0; i <= n; i++) {
      const a = A0 + (A1 - A0) * i / n, c = Math.cos(a), s = Math.sin(a), major = i % minors === 0;
      gx.strokeStyle = i / n >= redFrom ? '#ff6b5a' : major ? '#eef2f5' : 'rgba(238,242,245,0.45)';
      gx.lineWidth = r * (major ? 0.04 : 0.022);
      gx.beginPath(); gx.moveTo(cx + c * r * 0.9, cy + s * r * 0.9); gx.lineTo(cx + c * r * (major ? 0.68 : 0.74), cy + s * r * (major ? 0.68 : 0.74)); gx.stroke();
      if (major) { gx.fillStyle = i / n >= redFrom ? '#ff8a7c' : '#dfe6ec'; gx.fillText(String(Math.round(max * i / n)), cx + c * r * 0.53, cy + s * r * 0.53); }
    }
    // labels and readout
    // below the hub: the big readout, then its label (between the 0 and the top of the scale)
    if (badge) {   // the gear: a bright badge that pops on every shift, with its name under it
      const b = r * ((small ? 0.25 : 0.2) + 0.07 * pop), by = cy + r * 0.44;
      gx.save(); gx.shadowColor = badge; gx.shadowBlur = r * (0.14 + 0.3 * pop); gx.fillStyle = badge;
      gx.beginPath(); gx.roundRect(cx - b * 1.15, by - b, b * 2.3, b * 2, r * 0.07); gx.fill(); gx.restore();
      gx.fillStyle = '#10140f'; gx.font = `800 ${Math.round(b * 1.6)}px ${FONT}`; gx.fillText(readout, cx, by + r * 0.015);
      gx.fillStyle = badge; gx.font = `700 ${Math.round(r * (small ? 0.16 : 0.135))}px ${FONT}`; gx.fillText(unit, cx, cy + r * 0.77);
    } else {
      gx.fillStyle = '#fff'; gx.font = `700 ${Math.round(r * 0.34)}px ${FONT}`; gx.fillText(readout, cx, cy + r * 0.44);
      gx.fillStyle = '#8f9ba6'; gx.font = `600 ${Math.round(r * 0.12)}px ${FONT}`; gx.fillText(unit ?? label, cx, cy + r * 0.74);
    }
    // needle with a soft glow, and the hub
    const c = Math.cos(at), s = Math.sin(at), px = -s, py = c;
    gx.save(); gx.shadowColor = 'rgba(255,107,31,0.95)'; gx.shadowBlur = r * 0.16;
    gx.fillStyle = '#ffffff'; gx.beginPath();
    gx.moveTo(cx + c * r * 0.84, cy + s * r * 0.84);
    gx.lineTo(cx + px * r * 0.045 - c * r * 0.14, cy + py * r * 0.045 - s * r * 0.14);
    gx.lineTo(cx - px * r * 0.045 - c * r * 0.14, cy - py * r * 0.045 - s * r * 0.14); gx.closePath(); gx.fill(); gx.restore();
    g = gx.createRadialGradient(cx - r * 0.03, cy - r * 0.03, 0, cx, cy, r * 0.11); g.addColorStop(0, '#ff9a3c'); g.addColorStop(1, '#a8360a');
    gx.fillStyle = g; gx.beginPath(); gx.arc(cx, cy, r * 0.1, 0, 7); gx.fill();
    glass(cx, cy, r);
  }
  // the fuel dial: E to F, a red fifth at the bottom of the tank, and its label.
  // Its needle eases toward the real level so it slides (down as you burn, up as you fill) instead of jumping.
  // At a station a bold green border slowly fades in and out around the dial until the tank is full.
  function fuelDial(cx, cy, r, t, beating = false) {
    bezel(cx, cy, r, '#62d24b');
    const B0 = Math.PI * 0.8, B1 = Math.PI * 2.2, at = B0 + (B1 - B0) * t;
    gx.lineCap = 'butt'; gx.lineWidth = r * 0.1;
    gx.strokeStyle = 'rgba(255,255,255,0.08)'; gx.beginPath(); gx.arc(cx, cy, r * 0.74, B0, B1); gx.stroke();
    gx.strokeStyle = t < 0.2 ? '#e0312b' : t < 0.45 ? '#f2b705' : '#62d24b';
    gx.beginPath(); gx.arc(cx, cy, r * 0.74, B0, Math.max(B0 + 0.001, at)); gx.stroke();
    gx.strokeStyle = '#e0312b'; gx.lineWidth = r * 0.07; gx.beginPath(); gx.arc(cx, cy, r * 0.88, B0, B0 + (B1 - B0) * 0.2); gx.stroke();
    for (let i = 0; i <= 4; i++) {
      const a = B0 + (B1 - B0) * i / 4, c = Math.cos(a), s = Math.sin(a);
      gx.strokeStyle = i === 0 ? '#ff6b5a' : '#eef2f5'; gx.lineWidth = r * 0.05;
      gx.beginPath(); gx.moveTo(cx + c * r * 0.92, cy + s * r * 0.92); gx.lineTo(cx + c * r * 0.66, cy + s * r * 0.66); gx.stroke();
    }
    gx.textAlign = 'center'; gx.textBaseline = 'middle'; gx.font = `800 ${Math.round(r * 0.26)}px ${FONT}`;
    gx.fillStyle = '#ff8a7c'; gx.fillText('E', cx + Math.cos(B0) * r * 0.46, cy + Math.sin(B0) * r * 0.46);
    gx.fillStyle = '#dfe6ec'; gx.fillText('F', cx + Math.cos(B1) * r * 0.46, cy + Math.sin(B1) * r * 0.46);
    gx.fillStyle = t < 0.2 ? '#ff8a7c' : '#8f9ba6'; gx.font = `700 ${Math.round(r * 0.19)}px ${FONT}`; gx.fillText('FUEL', cx, cy + r * 0.56);
    const c = Math.cos(at), s = Math.sin(at), px = -s, py = c;
    gx.save(); gx.shadowColor = 'rgba(255,107,31,0.95)'; gx.shadowBlur = r * 0.16; gx.fillStyle = '#ffffff'; gx.beginPath();
    gx.moveTo(cx + c * r * 0.8, cy + s * r * 0.8);
    gx.lineTo(cx + px * r * 0.06 - c * r * 0.14, cy + py * r * 0.06 - s * r * 0.14);
    gx.lineTo(cx - px * r * 0.06 - c * r * 0.14, cy - py * r * 0.06 - s * r * 0.14); gx.closePath(); gx.fill(); gx.restore();
    const hg = gx.createRadialGradient(cx - r * 0.04, cy - r * 0.04, 0, cx, cy, r * 0.14); hg.addColorStop(0, '#ff9a3c'); hg.addColorStop(1, '#a8360a');
    gx.fillStyle = hg; gx.beginPath(); gx.arc(cx, cy, r * 0.13, 0, 7); gx.fill();
    glass(cx, cy, r);
    if (beating) {
      const k = heartbeat();
      gx.save(); gx.globalAlpha = k; gx.shadowColor = 'rgba(98,230,60,0.9)'; gx.shadowBlur = r * 0.25;
      gx.strokeStyle = '#7dff5a'; gx.lineWidth = r * 0.1; gx.beginPath(); gx.arc(cx, cy, r * 0.97, 0, 7); gx.stroke(); gx.restore();
    }
  }
  // a slow, smooth breath from faint to full and back, the same rhythm as the damage bar's border (heal-beat in game.css)
  function heartbeat() { return 0.2 + 0.8 * (0.5 - 0.5 * Math.cos(performance.now() / 1800 * 2 * Math.PI)); }
  let shownFuel = null, gaugeDt = 0;
  const GEAR_LOOK = { L: { color: '#f2b705', name: 'SHORT' }, H: { color: '#62d24b', name: 'LONG' }, R: { color: '#ff5a48', name: 'REVERSE' } };
  let shownGear = null, gearPop = 0;
  function drawGauges() {
    const w = els.gauges.width, h = els.gauges.height; gx.clearRect(0, 0, w, h);
    // fuel on the left, the big speedometer in the middle, the revs with the gear on the right;
    // the two small dials are the same size and sit level with the bottom of the speedometer
    const r = Math.min(w / 4.8, h / 2.02), rs = r * 0.66, gap = r * 0.08, x0 = (w - 4.8 * r) / 2, cy = h / 2, cys = cy + r - rs;
    const kmh = Math.abs(sim.st.speed * 3.6), gov = (sim.car.drivetrain.governedRpm ?? 2300) / 1000;
    const rpm = (sim.st.soundRpm ?? sim.st.rpm) / 1000;   // the revs you hear, when the sound is running
    const gear = sim.ctl.gear, look = GEAR_LOOK[gear] ?? GEAR_LOOK.H;
    if (gear !== shownGear) { shownGear = gear; gearPop = 1; }
    gearPop = Math.max(0, gearPop - 1 / 12);
    const fuel = Math.max(0, Math.min(1, sim.st.fuel / 100));
    shownFuel = shownFuel == null ? fuel : shownFuel + (fuel - shownFuel) * Math.min(1, gaugeDt * 4);
    const m = sim.main.st;
    fuelDial(x0 + rs, cys, rs, shownFuel, m.filling && m.fuel < 100);
    dial(x0 + 2 * rs + gap + r, cy, r, kmh, 360, { label: 'km/h', majors: 6, minors: 3, redFrom: 300 / 360, readout: String(Math.round(kmh)), unit: 'km/h', lit: ['#ffb347', '#ff6b1f'] });
    dial(x0 + 2 * rs + 2 * gap + 2 * r + rs, cys, rs, rpm, 3, { label: 'RPM ×1000', majors: 3, minors: 2, redFrom: gov / 3, readout: gear, unit: look.name, badge: look.color, pop: gearPop, lit: ['#ffd04a', '#ff3b2f'], small: true });
  }

  // the truck's power, top right, with its state: ready, running or recharging. The ones you start yourself get a button too
  const POWER_HUD = { invincible: { name: 'Invincible', color: '#b45cff', button: 'SHIELD' }, nitro: { name: 'Nitro', color: '#2f9dff', button: 'NITRO' } };
  const powerIcon = kind => document.getElementById('garageIcons').content.querySelector(`[data-icon="garage-${kind}"] svg`)?.cloneNode(true);
  let shownPower = null, powerText = null;
  function showPower() {
    const kind = sim.main.car.power ?? null, st = sim.main.st, box = document.getElementById('powers'), btn = els.powerBtn, look = POWER_HUD[kind];
    if (kind !== shownPower) {
      shownPower = kind; powerText = null; box.innerHTML = ''; btn.hidden = !look?.button;
      if (look) {
        const chip = document.createElement('div'); chip.className = 'powerchip'; chip.id = 'powerChip';
        const icon = powerIcon(kind); if (icon) chip.append(icon);
        chip.append(document.createElement('span')); box.append(chip);
        const holder = document.getElementById('powerBtnIcon'); holder.innerHTML = ''; if (look.button && icon) holder.append(powerIcon(kind));
      }
    }
    btn.disabled = sim.active !== sim.main;
    if (!look) return;
    const running = st.powerT > 0, cooling = st.powerCoolT > 0, secs = Math.ceil(running ? st.powerT : st.powerCoolT);
    // nitro's instant brake: armed by a boost until a hard brake uses it, and lit while it is stopping the truck
    const brakeNote = st.brakeT > 0 ? ' · <b>Instant brake!</b>' : st.brakeArmed ? ' · <i>Instant brake armed</i>' : '';
    const text = (running ? `<i>${look.name}:</i> ${secs} s` : cooling ? `<i>Recharging:</i> ${secs} s` : `<i>${look.name}:</i> ready`) + brakeNote;
    if (text !== powerText) {
      powerText = text; box.querySelector('span').innerHTML = text;
      box.firstChild.style.setProperty('--c', running ? look.color : cooling ? '#8f98a2' : '#3bdc6e');
      document.getElementById('powerBtnTxt').textContent = running || cooling ? `${secs} s` : look.button ?? '';
      btn.classList.toggle('active', running); btn.classList.toggle('cooling', cooling);
    }
  }

  // the chosen mission under the power chip: its name, and how it is going when there is something to count;
  // null hides it. A broken one glows red, then slides out to the right (failMission).
  let missionText = null, missionOutT = null;
  function showMission(t) {
    const box = document.getElementById('missionChip'), text = t ? (t.shown ? `<b>${t.mission.title}:</b> ${t.shown}` : `<b>${t.mission.title}</b>`) : null;
    if (!t) { clearTimeout(missionOutT); box.classList.remove('failed', 'out'); }
    if (text === missionText) return;
    missionText = text; box.hidden = !text; if (text) box.querySelector('span').innerHTML = text;
  }
  function failMission(t) {
    const box = document.getElementById('missionChip');
    showMission({ ...t, shown: '' }); box.classList.add('failed');
    clearTimeout(missionOutT);
    missionOutT = setTimeout(() => { box.classList.add('out'); missionOutT = setTimeout(() => { box.hidden = true; box.classList.remove('failed', 'out'); missionText = null; }, 700); }, 1400);
  }

  // DOM properties retain their last value, so stationary HUD values need no writes.
  const setText = (el, value) => { if (el.textContent !== value) el.textContent = value; };
  function update(dt, { coins, run, playing = true }) {
    showPower();
    if (toastT > 0) { toastT -= dt; if (toastT <= 0) els.toast.classList.remove('on'); }
    gaugeT += dt; if (gaugeT > 1 / 30) { gaugeDt = gaugeT; gaugeT = 0; drawGauges(); }   // gauges at 30 Hz
    hudT += dt; if (hudT < 0.1) return; const step = hudT; hudT = 0;
    const mx = sim.main.parts.truck.getPosition().x;
    const damageWidth = `${sim.main.st.damage ?? 0}%`;
    if (els.damageFill.style.width !== damageWidth) els.damageFill.style.width = damageWidth;
    els.damageFill.parentElement.parentElement.classList.toggle('healing', !!sim.main.st.filling && sim.main.st.damage > 0);   // its border beats green while a station repairs it
    // the depot sign: kilometres to two places, metres for the last kilometre, green for the last 300 m
    const left = Math.max(0, trail.depot - mx), far = left >= 1000;
    setText(els.distTxt, far ? (left / 1000).toFixed(2) : String(Math.round(left)));
    setText(els.distUnit, far ? 'km' : 'm');
    els.depotSign.classList.toggle('near', left < 300);
    setText(els.coinTxt, formatCoins(coins));
    const s = sim.st.surf;
    const bog = sim.terrain.mudAt(sim.truck.getPosition().x).heavy > 0.4;
    setText(els.surfTxt, s === 'wood' ? 'Log crossing' : bog ? 'Deep bog' : sim.surfaces[s].label);
    const surface = s === 'wood' ? 'wood' : bog ? 'bog' : s;
    if (els.surfChip.dataset.surf !== surface) els.surfChip.dataset.surf = surface;
    els.surfChip.classList.toggle('bog', bog);
    els.surfChip.classList.toggle('warn', s === 'mud');
  }
  function showPedals({ gas, brake }) {
    els.gas.classList.toggle('down', gas); els.brake.classList.toggle('down', brake);
  }
  function showHandbrake() {}   // no PARK button any more; kept so callers need not care
  // a bonus floats up off the coin counter, which gives a little pop
  function coinBonus(n) {
    const pill = els.coinTxt.parentElement; pill.classList.remove('pop'); void pill.offsetWidth; pill.classList.add('pop');
    const coin = pill.querySelector('.coinic'); coin.classList.remove('flip'); void coin.offsetWidth; coin.classList.add('flip');
    const f = document.createElement('span'); f.className = 'coinfloat'; f.textContent = `+${formatCoins(Math.round(n))}`; pill.append(f);
    f.addEventListener('animationend', () => f.remove());
  }
  function showGear(g) { for (const b of document.querySelectorAll('.gear button')) b.classList.toggle('on', b.dataset.g === g); }
  function showMode(key, on) { const b = key === 'awd' ? els.awdBtn : els.diffBtn; b.setAttribute('aria-pressed', String(on)); b.classList.remove('nudge'); }
  function nudge(key, on) { (key === 'awd' ? els.awdBtn : els.diffBtn).classList.toggle('nudge', on); }

  // the picture beside a message: 'win' or 'wreck'
  function showMessageArt(art) {
    const box = document.getElementById('msgArt');
    box.hidden = !art; box.className = 'msgart' + (art ? ` ${art}` : ''); document.getElementById('msgCard').classList.toggle('hasart', !!art);
  }
  function showMessage(eyebrow, title, text, spec, buttons, art) {
    showMessageArt(art);
    els.msgEyebrow.textContent = eyebrow; els.msgTitle.textContent = title; els.msgText.textContent = text;
    els.msgSpec.innerHTML = '';
    for (const [k, v] of spec) { const dt = document.createElement('dt'); dt.textContent = k; const dd = document.createElement('dd'); dd.textContent = v; els.msgSpec.append(dt, dd); }
    els.msgBtns.innerHTML = '';
    for (const [label, fn, primary, disabled] of buttons) { const b = document.createElement('button'); b.className = 'btn' + (primary ? ' primary' : ''); b.textContent = label; if (disabled) b.disabled = true; b.addEventListener('click', fn); els.msgBtns.append(b); }
    els.msgOv.hidden = false;
  }
  const hideMessage = () => { els.msgOv.hidden = true; };

  const switchOv = $('switchOv');
  let switchFade = 0;
  const calloutBox = $('callout'), ghostChip = $('ghostChip');
  // how far the ghost of the best run is ahead (or behind), in metres; null hides it
  function showGhost(gap) {
    ghostChip.hidden = gap == null; if (gap == null) return;
    const m = Math.round(Math.abs(gap));
    ghostChip.classList.toggle('ahead', gap < 0);
    ghostChip.firstElementChild.textContent = m < 2 ? 'Neck and neck with your best' : gap > 0 ? `Best run ${m} m ahead` : `${m} m ahead of your best`;
  }

  return {
    els, toast, hint, update, resizeGauges, showPedals, showGear, showHandbrake, showMode, nudge, showMessage, hideMessage,
    coinBonus, showMission, failMission,
    resetTrip() { calloutBox.replaceChildren(); showGhost(null); },
    // a big word in the middle of the screen for a moment: a bog cleared, a jump, a crushing streak ('gold' for the best ones)
    callout(text, sub = '', gold = false) {
      const e = document.createElement('span'); e.className = 'co' + (gold ? ' gold' : ''); e.textContent = text;
      if (sub) { const s = document.createElement('small'); s.textContent = sub; e.append(s); }
      calloutBox.replaceChildren(e); e.addEventListener('animationend', () => e.remove());
    },
    showGhost,
    // what the lean HUD leaves out, for the pause menu: the truck, its cargo, fuel and the next station
    pauseSpec() {
      const car = sim.main.car, mx = sim.main.parts.truck.getPosition().x;
      const next = (trail.stations ?? []).find(st => st.x > mx - 8);
      return [['Vehicle', `${car.name}${car.number ? ' ' + car.number : ''}`], ['Cargo', car.load ? `${car.load.name} · ${car.load.massT} t` : 'Empty'],
        ['Fuel', `${Math.round(sim.main.st.fuel)}%`], ['Damage', `${Math.round(sim.main.st.damage ?? 0)}%`],
        ['Next station', next ? km(Math.max(0, next.x - mx)) : 'none ahead'], ['Coins', els.coinTxt.textContent]];
    },
    setCar,
    get toastActive() { return toastT > 0; },
    setCardVisible() {},   // the vehicle card at the start of a run was removed (2026-11-06)
    showAction(label, busy = false) {
      els.actionBtn.hidden = !label; els.actionBtn.disabled = busy;
      els.actionBtn.setAttribute('aria-busy', String(busy));
      if (label) els.actionBtn.textContent = label;
    },
    // at a station: a plain hint in the toast spot that stays up while the truck fills, then fades
    showFilling(on) {
      if (!on) return;
      if (toastT > 0 && els.toast.textContent === FILLING) toastT = 0.4; else toast(FILLING, 0.4);
    },
    // while a map change settles: a full-screen wait over everything, so repeated taps land on nothing
    busy(on, label = 'Loading') {
      clearTimeout(switchFade);
      if (on) {
        $('switchLabel').textContent = label;
        switchOv.hidden = false; void switchOv.offsetWidth; switchOv.classList.add('on');
      } else {
        switchOv.classList.remove('on');
        switchFade = setTimeout(() => { switchOv.hidden = true; }, 180);
      }
    },
  };
}
