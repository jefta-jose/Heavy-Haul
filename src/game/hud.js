// Everything drawn in HTML over the canvas: fuel, distance, coins, surface chip, the load chip,
// the vehicle card, toasts, analog gauges, drive and service buttons, and the message overlays.

const $ = id => document.getElementById(id);

export function createHud({ sim, season }) {
  const els = {};
  for (const id of ['fuelFill', 'fuelTxt', 'distTxt', 'coinTxt', 'surfChip', 'loadChip', 'toast', 'mapcard', 'gauges', 'gas', 'brake', 'winch', 'engineBtn', 'handbrakeBtn', 'awdBtn', 'diffBtn', 'fsBtn', 'pauseBtn', 'fuelCallBtn', 'repairCallBtn', 'switchBtn', 'actionBtn', 'msgOv', 'msgEyebrow', 'msgTitle', 'msgText', 'msgSpec', 'msgBtns']) els[id] = $(id);
  const gx = els.gauges.getContext('2d');
  const trail = season.trail;
  let toastT = 0, hudT = 0, gaugeT = 0;

  // the vehicle card and chips follow the vehicle being driven (car.json text)
  function setCar(car) {
    document.title = `Heavy Haul · ${car.name} ${car.number ?? ''}`.trim();
    $('cardTitle').textContent = `${car.number ? car.number + '. ' : ''}${car.name}`;
    $('cardTagline').textContent = car.tagline;
    $('cardStats').innerHTML = '';
    for (const [label, key] of [['Power', 'power'], ['Grip', 'grip'], ['Durability', 'durability'], ['Fuel efficiency', 'fuelEfficiency']]) {
      const row = document.createElement('div'), name = document.createElement('span'), bar = document.createElement('i'), fill = document.createElement('b');
      name.textContent = label; fill.style.width = `${car.stats[key]}%`; bar.append(fill); row.append(name, bar); $('cardStats').append(row);
    }
    $('cardBiomes').textContent = car.biomes.join('  ·  ');
    els.loadChip.textContent = car.load ? `${car.name} · ${car.load.name} ${car.load.massT} t` : `${car.name} ${car.number ?? ''} · ${car.drive}`;
  }

  function toast(msg, secs = 2.5) { els.toast.textContent = msg; els.toast.classList.add('on'); toastT = secs; }

  function resizeGauges(DPR) { els.gauges.width = Math.round(els.gauges.clientWidth * DPR); els.gauges.height = Math.round(els.gauges.clientHeight * DPR); }
  function dial(cx, cy, r, val, max, label, ticks, redFrom, center) {
    gx.fillStyle = '#121519'; gx.beginPath(); gx.arc(cx, cy, r, 0, 7); gx.fill();
    gx.lineWidth = r * 0.07; gx.strokeStyle = '#3f454c'; gx.stroke();
    const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25;
    gx.lineWidth = r * 0.08; gx.strokeStyle = '#d6312f'; gx.beginPath(); gx.arc(cx, cy, r * 0.82, a0 + (a1 - a0) * redFrom, a1); gx.stroke();
    gx.fillStyle = '#e7ecf0'; gx.font = `600 ${Math.round(r * 0.2)}px Barlow Condensed, Arial Narrow, sans-serif`; gx.textAlign = 'center'; gx.textBaseline = 'middle';
    for (let i = 0; i <= ticks; i++) {
      const a = a0 + (a1 - a0) * i / ticks, c = Math.cos(a), s = Math.sin(a);
      gx.strokeStyle = '#e7ecf0'; gx.lineWidth = r * 0.04; gx.beginPath(); gx.moveTo(cx + c * r * 0.88, cy + s * r * 0.88); gx.lineTo(cx + c * r * 0.72, cy + s * r * 0.72); gx.stroke();
      gx.fillText(String(Math.round(max * i / ticks)), cx + c * r * 0.55, cy + s * r * 0.55);
    }
    const a = a0 + (a1 - a0) * Math.min(1, Math.max(0, val / max));
    gx.strokeStyle = '#ff3b2f'; gx.lineWidth = r * 0.06; gx.beginPath(); gx.moveTo(cx, cy); gx.lineTo(cx + Math.cos(a) * r * 0.78, cy + Math.sin(a) * r * 0.78); gx.stroke();
    gx.fillStyle = '#2b2f34'; gx.beginPath(); gx.arc(cx, cy, r * 0.1, 0, 7); gx.fill();
    gx.fillStyle = '#fff'; gx.font = `700 ${Math.round(r * 0.34)}px Barlow Condensed, Arial Narrow, sans-serif`; gx.fillText(center, cx, cy + r * 0.62);
    gx.fillStyle = '#9aa6b1'; gx.font = `600 ${Math.round(r * 0.15)}px Barlow Condensed, Arial Narrow, sans-serif`; gx.fillText(label, cx, cy + r * 0.3);
  }
  function drawGauges() {
    const w = els.gauges.width, h = els.gauges.height; gx.clearRect(0, 0, w, h);
    const r = Math.min(w / 4.3, h / 2.1), kmh = Math.abs(sim.st.speed * 3.6);
    dial(w / 2 - r * 1.07, h / 2 + r * 0.05, r, sim.st.rpm / 1000, 3, 'RPM ×1000', 3, 0.8, sim.ctl.gear);
    dial(w / 2 + r * 1.07, h / 2 + r * 0.05, r, kmh, 40, 'km/h', 4, 0.75, String(Math.round(kmh)));
  }

  function update(dt, { coins }) {
    if (toastT > 0) { toastT -= dt; if (toastT <= 0) els.toast.classList.remove('on'); }
    gaugeT += dt; if (gaugeT > 1 / 30) { gaugeT = 0; drawGauges(); }   // gauges at 30 Hz
    hudT += dt; if (hudT < 0.1) return; hudT = 0;
    const f = sim.st.fuel, cap = sim.car.drivetrain.fuelLitres ?? 100;
    els.fuelFill.style.width = f + '%';
    els.fuelFill.style.background = f < 20 ? 'var(--danger)' : f < 45 ? 'var(--gold)' : 'var(--fuel)';
    els.fuelTxt.textContent = `${Math.round(f * cap / 100)}/${cap}L`;
    const left = Math.max(0, trail.depot - sim.main.parts.truck.getPosition().x);
    els.distTxt.textContent = left >= 1000 ? `${(left / 1000).toFixed(2)} km` : `${Math.round(left)} m`;
    els.coinTxt.textContent = coins.toLocaleString('en-US');
    const s = sim.st.surf;
    const bog = sim.terrain.mudAt(sim.truck.getPosition().x).heavy > 0.4;
    const bridge = s === 'wood' && sim.terrain.bridgeAt(sim.truck.getPosition().x);
    els.surfChip.textContent = bridge ? bridge.missingBoard != null ? 'Broken bridge' : bridge.style === 'steel' ? 'Steel bridge' : 'Timber bridge' : s === 'wood' ? 'Log crossing' : bog ? 'Deep bog' : sim.st.inWater > 0.3 ? 'River crossing' : sim.surfaces[s].label;
    els.surfChip.classList.toggle('bog', bog); els.surfChip.classList.toggle('bridge', !!bridge);
    els.surfChip.classList.toggle('warn', s === 'mud' || sim.st.inWater > 0.3);
    // the winch belongs to service trucks: pulses when a vehicle is within hook reach, lit while hooked
    els.winch.hidden = sim.active.role !== 'service';
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

  return {
    els, toast, update, resizeGauges, showPedals, showGear, showHandbrake, showMode, nudge, showMessage, hideMessage,
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
