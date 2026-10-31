// Performance recorder for phones, where DevTools is hard to reach. Pause → "Record performance"
// times every frame of the next 30 s of driving: the gap since the previous frame, physics, drawing
// (the JavaScript that issues it), HUD and audio, with the quality level and where the truck is. Three
// frames are also drawn layer by layer with a GPU flush after each layer, which shows what each layer
// costs to paint on this phone (those frames are left out of the frame statistics). The report adds
// the device, screen, GPU and build, and is saved as JSON: in the Android app to Documents/HeavyHaul
// and offered to the share sheet, in a browser as a download (and on the clipboard).

const SECONDS = 30, LAYER_FRAMES_AT = [8, 16, 24];

const pct = (sorted, p) => sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] : 0;
const avg = a => a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0;
const r1 = v => Math.round(v * 10) / 10;

function gpuInfo() {
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    if (!gl) return { webgl: false };
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const info = { webgl: true, vendor: gl.getParameter(ext ? ext.UNMASKED_VENDOR_WEBGL : gl.VENDOR), renderer: gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER) };
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return info;
  } catch (e) { return { webgl: false, error: String(e) }; }
}

export function createPerfLog({ view, sim, content, getState }) {
  let rec = null, report = null;

  function start() {
    rec = { started: new Date().toISOString(), t: 0, frames: [], layers: [], pendingLayers: [...LAYER_FRAMES_AT] };
  }

  // one frame's timings from main.js; returns true when this frame should be drawn layer by layer
  function frame(f) {
    if (!rec || getState() !== 'play') return false;
    rec.t += f.dt;
    const st = sim.st;
    rec.frames.push({
      t: r1(rec.t), gap: r1(f.gap), phys: r1(f.phys), steps: f.steps, draw: r1(f.draw), hud: r1(f.hud), audio: r1(f.audio),
      q: view.quality, x: Math.round(sim.truck.getPosition().x), kmh: Math.round(Math.abs(st.speed) * 3.6), surf: st.surf, veh: sim.vehicles.length, layered: f.layered || undefined,
    });
    if (f.layers) rec.layers.push({ t: r1(rec.t), ms: Object.fromEntries(Object.entries(f.layers).map(([k, v]) => [k, r1(v)])) });
    if (rec.t >= SECONDS) { finish(); return false; }
    if (rec.pendingLayers.length && rec.t >= rec.pendingLayers[0]) { rec.pendingLayers.shift(); return true; }
    return false;
  }

  function finish() {
    if (!rec) return null;
    const all = rec.frames, frames = all.filter(f => !f.layered), gaps = frames.map(f => f.gap).sort((a, b) => a - b);
    const js = frames.map(f => f.phys + f.draw + f.hud + f.audio);
    const median = pct(gaps, 0.5);
    report = {
      app: 'Heavy Haul', kind: 'performance-log', recorded: rec.started, seconds: r1(rec.t),
      device: {
        userAgent: navigator.userAgent, platform: navigator.platform, cores: navigator.hardwareConcurrency, memoryGB: navigator.deviceMemory,
        screen: `${screen.width}x${screen.height}`, devicePixelRatio: devicePixelRatio, viewport: `${innerWidth}x${innerHeight}`,
        canvas: `${view.canvas.width}x${view.canvas.height}`, drawPixelRatio: r1(view.DPR * 100) / 100, quality: view.quality,
        nativeApp: !!window.Capacitor?.isNativePlatform?.(), gpu: gpuInfo(),
      },
      game: { season: content.season.id, car: sim.main.car.id, zoom: view.zoom, ppm: Math.round(view.ppm) },
      summary: {
        frames: frames.length, fps: r1(1000 / Math.max(1, avg(frames.map(f => f.gap)))), displayHz: median ? Math.round(1000 / median) : null,
        gapMs: { p50: median, p90: pct(gaps, 0.9), p99: pct(gaps, 0.99), max: gaps[gaps.length - 1] ?? 0 },
        slowFrames: { over20ms: frames.filter(f => f.gap > 20).length, over33ms: frames.filter(f => f.gap > 33).length, over50ms: frames.filter(f => f.gap > 50).length },
        avgMs: { physics: r1(avg(frames.map(f => f.phys))), draw: r1(avg(frames.map(f => f.draw))), hud: r1(avg(frames.map(f => f.hud))), audio: r1(avg(frames.map(f => f.audio))), javascript: r1(avg(js)) },
        // what is left of the frame gap after our JavaScript: painting on the GPU, compositing and waiting
        avgGpuAndWaitMs: r1(avg(frames.map((f, i) => Math.max(0, f.gap - js[i])))),
        physicsStepsPerFrame: r1(avg(frames.map(f => f.steps))),
        qualityAtEnd: view.quality,
      },
      layerFrames: rec.layers,
      frames: all,
    };
    rec = null;
    return report;
  }

  async function save() {
    if (!report) return { ok: false, reason: 'No recording yet' };
    const text = JSON.stringify(report), name = `heavy-haul-perf-${report.recorded.replace(/[:.]/g, '-').slice(0, 19)}.json`;
    const P = window.Capacitor?.isNativePlatform?.() ? window.Capacitor.Plugins : null;
    if (P?.Filesystem) {
      let saved = null;
      try { saved = (await P.Filesystem.writeFile({ path: `HeavyHaul/${name}`, data: text, directory: 'DOCUMENTS', encoding: 'utf8', recursive: true })).uri; } catch (e) {}
      try {
        const { uri } = await P.Filesystem.writeFile({ path: name, data: text, directory: 'CACHE', encoding: 'utf8' });
        if (P.Share) await P.Share.share({ title: 'Heavy Haul performance log', files: [uri] });
      } catch (e) {}
      return { ok: true, where: saved ? 'Documents/HeavyHaul' : 'the share sheet' };
    }
    // browser: download the file and put it on the clipboard too
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    try { await navigator.clipboard.writeText(text); } catch (e) {}
    return { ok: true, where: 'Downloads (and the clipboard)' };
  }

  return {
    start, frame, finish, save,
    get recording() { return !!rec; },
    get remaining() { return rec ? Math.max(0, Math.ceil(SECONDS - rec.t)) : 0; },
    get report() { return report; },
  };
}
