// Everything drawn in HTML over the canvas: the status panel (fuel, fuel use, cargo), the trail
// progress map (checkpoints, mud pits, bridges, depot, the trucks), the trip line,
// coins, surface chip, the vehicle card, toasts, the gauges, drive and service buttons, and the
// message overlays.

const $ = id => document.getElementById(id);

export function createHud({ sim, season }) {
  const els = {};
  for (const id of ['fuelFill', 'fuelTxt', 'useTxt', 'avgTxt', 'track', 'trackDone', 'drivenTxt', 'nextTxt', 'distTxt', 'coinTxt', 'surfChip', 'loadChip', 'toast', 'mapcard', 'gauges', 'gas', 'brake', 'winch', 'engineBtn', 'handbrakeBtn', 'awdBtn', 'diffBtn', 'fsBtn', 'pauseBtn', 'fuelCallBtn', 'breakdownCallBtn', 'switchBtn', 'actionBtn', 'msgOv', 'msgEyebrow', 'msgTitle', 'msgText', 'msgSpec', 'msgBtns']) els[id] = $(id);
  const gx = els.gauges.getContext('2d');
  const trail = season.trail;
  let toastT = 0, hudT = 0, gaugeT = 0;

  // ---------- trail progress map: start to depot, built once from the season ----------
  const span = trail.depot - trail.start, frac = x => Math.max(0, Math.min(1, (x - trail.start) / span));
  const mark = (cls, x, title, w) => {
    const m = document.createElement('i'); m.className = `mk ${cls}`; m.style.left = `${frac(x) * 100}%`;
    if (w) m.style.width = `${Math.max(0.6, w / span * 100)}%`;
    if (title) m.title = title; els.track.append(m); return m;
  };
  for (const x of trail.heavyMud ?? []) mark('pit', x - 10, 'Deep mud', 20);
  for (const b of trail.bridges ?? []) mark('bridge', b.x0, 'Bridge', b.x1 - b.x0);
  const checkpoints = trail.checkpoints.filter(c => c > trail.start && c < trail.depot).map(c => ({ x: c, el: mark('cp', c, `Checkpoint · ${Math.round(c)} m`) }));
  mark('depot', trail.depot, `Depot · ${Math.round(trail.depot)} m`);
  const vehMarks = new Map();   // vehicle -> marker, rebuilt as service trucks are called
  function vehicleMarker(v) {
    let m = vehMarks.get(v);
    if (!m) { m = mark(v.role === 'main' ? 'me' : `svc ${v.car.role}`, trail.start, v.car.name); vehMarks.set(v, m); }
    return m;
  }

  // ---------- fuel use: litres per km while moving, litres per hour while standing ----------
  const use = { samples: [], t: 0 };
  function sampleUse(dt) {
    const main = sim.main, cap = main.car.drivetrain.fuelLitres ?? 100;
    use.t += dt; use.samples.push({ t: use.t, x: main.parts.truck.getPosition().x, l: main.st.fuel * cap / 100 });
    while (use.samples.length > 2 && use.t - use.samples[0].t > 3) use.samples.shift();
    const a = use.samples[0], b = use.samples.at(-1), dl = Math.max(0, a.l - b.l), dx = Math.abs(b.x - a.x), dtw = b.t - a.t;
    if (dtw < 0.5) return null;
    return dx > 3 ? { perKm: dl / (dx / 1000) } : { perHour: dl / dtw * 3600 };
  }
  const km = m => m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;

  // the vehicle card and chips follow the vehicle being driven (car.json text)
  function setCar(car) {
    document.title = `Heavy Haul · ${car.name} ${car.number ?? ''}`.trim();
    $('cardTitle').textContent = `${car.number ? car.number + '. ' : ''}${car.name}`;
    $('carName').textContent = `${car.name}${car.number ? ' ' + car.number : ''}`;
    $('cardTagline').textContent = car.tagline;
    $('cardStats').innerHTML = '';
    // the cargo row names the load and its weight
    for (const [label, key] of [['Power', 'power'], ['Grip', 'grip'], ['Fuel efficiency', 'fuelEfficiency']]) {
      const row = document.createElement('div'), name = document.createElement('span'), bar = document.createElement('i'), fill = document.createElement('b');
      name.textContent = label; fill.style.width = `${car.stats[key]}%`; bar.append(fill); row.append(name, bar); $('cardStats').append(row);
    }
    $('cardBiomes').textContent = car.biomes.join('  ·  ');
    els.loadChip.textContent = car.load ? `${car.load.name} · ${car.load.massT} t` : car.role ? (car.role === 'fuel' ? 'Fuel for your truck' : 'Recovery winch') : 'Empty';
  }

  function toast(msg, secs = 2.5) { els.toast.textContent = msg; els.toast.classList.add('on'); toastT = secs; }

  function resizeGauges(DPR) { els.gauges.width = Math.round(els.gauges.clientWidth * DPR); els.gauges.height = Math.round(els.gauges.clientHeight * DPR); }
  // analog dials: metal bezel, dark face, minor and major ticks, a lit arc that follows the value,
  // a red zone, a tapered needle, and a readout in the middle (the gear, or the digital speed)
  const A0 = Math.PI * 0.75, A1 = Math.PI * 2.25, FONT = 'Barlow Condensed, Arial Narrow, sans-serif';
  function dial(cx, cy, r, val, max, { label, majors, minors = 2, redFrom, readout, unit, lit }) {
    const t = Math.min(1, Math.max(0, val / max)), at = A0 + (A1 - A0) * t;
    // bezel and face
    let g = gx.createLinearGradient(cx, cy - r, cx, cy + r);
    g.addColorStop(0, '#5d656d'); g.addColorStop(0.5, '#23282d'); g.addColorStop(1, '#4a5157');
    gx.fillStyle = g; gx.beginPath(); gx.arc(cx, cy, r, 0, 7); gx.fill();
    g = gx.createRadialGradient(cx, cy - r * 0.3, r * 0.1, cx, cy, r * 0.92);
    g.addColorStop(0, '#1f252b'); g.addColorStop(1, '#0b0e11');
    gx.fillStyle = g; gx.beginPath(); gx.arc(cx, cy, r * 0.92, 0, 7); gx.fill();
    // track, lit arc and red zone
    gx.lineCap = 'butt'; gx.lineWidth = r * 0.075;
    gx.strokeStyle = 'rgba(255,255,255,0.08)'; gx.beginPath(); gx.arc(cx, cy, r * 0.78, A0, A1); gx.stroke();
    g = gx.createLinearGradient(cx - r, cy, cx + r, cy); g.addColorStop(0, lit[0]); g.addColorStop(1, lit[1]);
    gx.strokeStyle = g; gx.beginPath(); gx.arc(cx, cy, r * 0.78, A0, Math.max(A0 + 0.001, at)); gx.stroke();
    gx.strokeStyle = '#e0312b'; gx.lineWidth = r * 0.05; gx.beginPath(); gx.arc(cx, cy, r * 0.86, A0 + (A1 - A0) * redFrom, A1); gx.stroke();
    // ticks and numbers
    gx.textAlign = 'center'; gx.textBaseline = 'middle'; gx.font = `700 ${Math.round(r * 0.16)}px ${FONT}`;
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
    gx.fillStyle = '#fff'; gx.font = `700 ${Math.round(r * 0.34)}px ${FONT}`; gx.fillText(readout, cx, cy + r * 0.44);
    gx.fillStyle = '#8f9ba6'; gx.font = `600 ${Math.round(r * 0.12)}px ${FONT}`; gx.fillText(unit ?? label, cx, cy + r * 0.74);
    // needle with a soft glow, and the hub
    const c = Math.cos(at), s = Math.sin(at), px = -s, py = c;
    gx.save(); gx.shadowColor = 'rgba(255,60,40,0.7)'; gx.shadowBlur = r * 0.12;
    gx.fillStyle = '#ff3b2f'; gx.beginPath();
    gx.moveTo(cx + c * r * 0.84, cy + s * r * 0.84);
    gx.lineTo(cx + px * r * 0.045 - c * r * 0.14, cy + py * r * 0.045 - s * r * 0.14);
    gx.lineTo(cx - px * r * 0.045 - c * r * 0.14, cy - py * r * 0.045 - s * r * 0.14); gx.closePath(); gx.fill(); gx.restore();
    g = gx.createRadialGradient(cx - r * 0.03, cy - r * 0.03, 0, cx, cy, r * 0.11); g.addColorStop(0, '#8a939b'); g.addColorStop(1, '#22272c');
    gx.fillStyle = g; gx.beginPath(); gx.arc(cx, cy, r * 0.1, 0, 7); gx.fill();
  }
  function drawGauges() {
    const w = els.gauges.width, h = els.gauges.height; gx.clearRect(0, 0, w, h);
    const r = Math.min(w / 4.25, h / 2.02), kmh = Math.abs(sim.st.speed * 3.6), gov = (sim.car.drivetrain.governedRpm ?? 2300) / 1000;
    dial(w / 2 - r * 1.06, h / 2, r, sim.st.rpm / 1000, 3, { label: 'RPM ×1000', majors: 3, minors: 5, redFrom: gov / 3, readout: sim.ctl.gear, lit: ['#f2b705', '#ff7a1a'] });
    dial(w / 2 + r * 1.06, h / 2, r, kmh, 60, { label: 'km/h', majors: 6, minors: 2, redFrom: 50 / 60, readout: String(Math.round(kmh)), unit: 'km/h', lit: ['#2fb3ff', '#62d24b'] });
  }

  function update(dt, { coins, run }) {
    if (toastT > 0) { toastT -= dt; if (toastT <= 0) els.toast.classList.remove('on'); }
    gaugeT += dt; if (gaugeT > 1 / 30) { gaugeT = 0; drawGauges(); }   // gauges at 30 Hz
    hudT += dt; if (hudT < 0.1) return; const step = hudT; hudT = 0;
    const f = sim.st.fuel, cap = sim.car.drivetrain.fuelLitres ?? 100, unlimited = sim.active.role === 'service';
    els.fuelFill.style.width = (unlimited ? 100 : f) + '%';
    els.fuelFill.style.background = unlimited || f >= 45 ? 'var(--fuel)' : f < 20 ? 'var(--danger)' : 'var(--gold)';
    els.fuelTxt.textContent = unlimited ? 'Unlimited' : `${Math.round(f * cap / 100)} / ${cap} L`;
    // fuel use of the main truck (service trucks burn nothing), and the run's average
    const u = sampleUse(step), mainCap = sim.main.car.drivetrain.fuelLitres ?? 100;
    if (unlimited) { els.useTxt.textContent = 'none'; els.avgTxt.textContent = 'service truck'; }
    else {
      els.useTxt.textContent = !u ? '–' : u.perKm != null ? `${u.perKm.toFixed(1)} L/km` : `${u.perHour.toFixed(1)} L/h`;
      const litres = (run?.fuelUsed ?? 0) * mainCap / 100, dist = (run?.odometer ?? 0) / 1000;
      els.avgTxt.textContent = dist > 0.05 ? `avg ${(litres / dist).toFixed(1)} L/km` : '';
    }
    // trail progress: markers, the filled part, checkpoints passed, and the trip line
    const mx = sim.main.parts.truck.getPosition().x, left = Math.max(0, trail.depot - mx);
    els.trackDone.style.width = `${frac(mx) * 100}%`;
    for (const v of sim.vehicles) { const m = vehicleMarker(v); m.style.left = `${frac(v.parts.truck.getPosition().x) * 100}%`; m.classList.toggle('active', v === sim.active); }
    for (const [v, m] of vehMarks) if (!sim.vehicles.includes(v)) { m.remove(); vehMarks.delete(v); }
    for (const c of checkpoints) c.el.classList.toggle('passed', (run?.checkpoint ?? trail.start) >= c.x);
    els.distTxt.textContent = km(left);
    els.drivenTxt.textContent = `${km(run?.odometer ?? 0)} driven`;
    const ahead = [...checkpoints.map(c => [c.x, 'Checkpoint']), [trail.depot, 'Depot']].filter(([x]) => x > mx + 2).sort((a, b) => a[0] - b[0])[0];
    els.nextTxt.textContent = ahead ? `${ahead[1]} in ${km(ahead[0] - mx)}` : 'At the depot';
    els.coinTxt.textContent = coins.toLocaleString('en-US');
    const s = sim.st.surf;
    const bog = sim.terrain.mudAt(sim.truck.getPosition().x).heavy > 0.4;
    const bridge = s === 'wood' && sim.terrain.bridgeAt(sim.truck.getPosition().x);
    els.surfChip.textContent = bridge ? bridge.missingBoard != null ? 'Broken bridge' : bridge.style === 'steel' ? 'Steel bridge' : 'Timber bridge' : s === 'wood' ? 'Log crossing' : bog ? 'Deep bog' : sim.st.inWater > 0.3 ? 'River crossing' : sim.surfaces[s].label;
    els.surfChip.classList.toggle('bog', bog); els.surfChip.classList.toggle('bridge', !!bridge);
    els.surfChip.classList.toggle('warn', s === 'mud' || sim.st.inWater > 0.3);
    // the winch belongs to service trucks: pulses when a vehicle is within hook reach, lit while hooked
    els.winch.hidden = !sim.canWinch();
    const hooked = !!sim.cable(), near = !hooked && sim.nearestHook()?.d <= sim.winchReach;
    els.winch.classList.toggle('ready', near); els.winch.classList.toggle('down', hooked);
    els.winch.setAttribute('aria-pressed', String(hooked));
    const eng = sim.st.engine;
    els.engineBtn.classList.toggle('on', eng === 'on'); els.engineBtn.classList.toggle('cranking', eng === 'cranking');
    els.engineBtn.setAttribute('aria-pressed', String(eng !== 'off'));
  }
  function showPedals({ gas, brake }) {
    els.gas.classList.toggle('down', gas); els.brake.classList.toggle('down', brake);
  }
  function showHandbrake(on) { els.handbrakeBtn.classList.toggle('down', on); els.handbrakeBtn.setAttribute('aria-pressed', String(on)); }
  function showGear(g) { for (const b of document.querySelectorAll('.gear button')) b.classList.toggle('on', b.dataset.g === g); }
  function showMode(key, on) { const b = key === 'awd' ? els.awdBtn : els.diffBtn; b.setAttribute('aria-pressed', String(on)); b.classList.remove('nudge'); }
  function nudge(key, on) { (key === 'awd' ? els.awdBtn : els.diffBtn).classList.toggle('nudge', on); }

  function showMessage(eyebrow, title, text, spec, buttons) {
    els.msgEyebrow.textContent = eyebrow; els.msgTitle.textContent = title; els.msgText.textContent = text;
    els.msgSpec.innerHTML = '';
    for (const [k, v] of spec) { const dt = document.createElement('dt'); dt.textContent = k; const dd = document.createElement('dd'); dd.textContent = v; els.msgSpec.append(dt, dd); }
    els.msgBtns.innerHTML = '';
    for (const [label, fn, primary, disabled] of buttons) { const b = document.createElement('button'); b.className = 'btn' + (primary ? ' primary' : ''); b.textContent = label; if (disabled) b.disabled = true; b.addEventListener('click', fn); els.msgBtns.append(b); }
    els.msgOv.hidden = false;
  }
  const hideMessage = () => { els.msgOv.hidden = true; };

  // after a service truck is called its button switches to it: a green dot and a new label. A class
  // with no truck of that role yet gets a greyed-out button (still tappable, to say so).
  const available = {};
  function showCalled(role, on, ok = available[role], what = role === 'fuel' ? 'fuel truck' : 'breakdown truck') {
    const b = role === 'fuel' ? els.fuelCallBtn : els.breakdownCallBtn;
    available[role] = ok;
    b.classList.toggle('called', on); b.classList.toggle('unavailable', !ok);
    b.title = !ok ? `No ${what} yet` : on ? `Switch to the ${what}` : `Call the ${what}`; b.setAttribute('aria-label', b.title);
  }

  return {
    els, toast, update, resizeGauges, showPedals, showGear, showHandbrake, showMode, nudge, showMessage, hideMessage,
    showCalled,
    // a new run: forget the fuel-use window and the vehicle markers
    resetTrip() { use.samples.length = 0; for (const m of vehMarks.values()) m.remove(); vehMarks.clear(); },
    setCar,
    get toastActive() { return toastT > 0; },
    setCardVisible(on) { els.mapcard.style.opacity = on ? 1 : 0; },
    showAction(label, busy = false) {
      els.actionBtn.hidden = !label; els.actionBtn.disabled = busy;
      els.actionBtn.setAttribute('aria-busy', String(busy));
      if (label) els.actionBtn.textContent = label;
    },
    showSwitch(on) { els.switchBtn.hidden = !on; },
    highlightSwitch(on) {
      els.switchBtn.classList.toggle('service-ready', on);
      els.switchBtn.setAttribute('aria-label', on ? 'Service complete. Switch back to your truck' : 'Switch vehicle');
      els.switchBtn.title = on ? 'Service complete: return to your truck (V)' : 'Switch vehicle (V)';
    },
  };
}
