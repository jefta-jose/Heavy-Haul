// Audition the real game sound: renders each engine class through the game's own Web Audio code
// (src/audio/engine.js and the seamless loop player) offline in Chromium, for a full drive: start,
// idle, pull away, cruise, ease off, idle, shut down. Also renders the beds (tires, water, mud,
// ambience) through the loop player for 40 s each, so any audible repetition shows up.
//   npm run audio:preview -> output/audio/engine-<class>.wav, bed-<name>.wav, index.html, report.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, readSoundBank } from './lib/content.js';

export function measure(x) {
  let ss = 0, peak = 0, nan = false;
  for (const v of x) { if (!Number.isFinite(v)) nan = true; ss += v * v; peak = Math.max(peak, Math.abs(v)); }
  return { rms: Math.sqrt(ss / Math.max(1, x.length)), peak, nan };
}

function wav(file, samples, sr) {
  const b = Buffer.alloc(44 + samples.length * 2);
  b.write('RIFF'); b.writeUInt32LE(b.length - 8, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28);
  b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((v, i) => b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), 44 + i * 2));
  fs.writeFileSync(file, b);
}

// the drive each engine plays: [seconds, engine state, revs 0..1, throttle]
export const DRIVE = [[2.2, 'cranking', 0, 0], [3, 'on', 0, 0], [5, 'on', 0.75, 1], [5, 'on', 0.5, 0.45], [3, 'on', 0.45, 0], [3, 'on', 0, 0], [3.5, 'off', 0, 0]];

export async function renderPreviews({ classes, beds = ['gravel', 'dirt', 'rocks', 'mud', 'wade', 'water-churn', 'forest', 'frogs'], seconds = 40, drive = DRIVE, tag = 'engine' } = {}) {
  const { chromium } = await import('playwright'), esbuild = await import('esbuild');
  const bank = readSoundBank();
  classes ??= Object.keys(bank.engines);
  const bundled = await esbuild.build({ stdin: { contents: "export { createEngineVoice } from './src/audio/engine.js'; export { createLoopPlayer } from './src/audio/loop-player.js';", resolveDir: ROOT }, bundle: true, write: false, format: 'iife', globalName: 'HaulAudio' });
  const outDir = path.join(ROOT, 'output/audio'); fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] }), report = [];
  const clipData = names => Object.fromEntries(names.map(n => [n, fs.readFileSync(path.join(ROOT, 'assets/audio', bank.clips[n].file)).toString('base64')]));
  try {
    const page = await browser.newPage(); await page.addScriptTag({ content: bundled.outputFiles[0].text });
    const render = (fn, arg) => page.evaluate(fn, arg).then(r => ({ ...r, samples: Float32Array.from(r.samples) }));
    for (const cls of classes) {
      const pack = bank.engines[cls], names = [...Object.values(pack.layers), ...(pack.atlas ? [pack.atlas.clip] : [])];
      const r = await render(async ({ cls, bank, clips, drive }) => {
        const sr = 44100, total = drive.reduce((n, s) => n + s[0], 0), ac = new OfflineAudioContext(1, Math.ceil(total * sr), sr), buffers = {};
        for (const [k, raw] of Object.entries(clips)) buffers[k] = await ac.decodeAudioData(Uint8Array.from(atob(raw), c => c.charCodeAt(0)).buffer);
        const car = { audio: { engine: cls }, drivetrain: { idleRpm: 750, governedRpm: 2300 } };
        const voice = HaulAudio.createEngineVoice(ac, buffers, car, bank, ac.destination); voice.setLevel(0.9);
        // drive the voice every 50 ms, as the game does every frame
        const bounds = [0]; for (const [secs] of drive) bounds.push(bounds.at(-1) + secs);
        const steps = [];
        for (let i = 0; i * 0.05 < total - 0.05; i++) {
          const at = i * 0.05, k = bounds.findIndex(b => b > at) - 1, [duration, engine, revs, throttle, load] = drive[Math.max(0, k)];
          const rev = Array.isArray(revs) ? revs[0] + (revs[1] - revs[0]) * (at - bounds[Math.max(0, k)]) / duration : revs;
          steps.push([Math.round(at * sr / 128) * 128 / sr, { engine, rpm: engine === 'on' ? 750 + rev * 1550 : engine === 'cranking' ? 180 : 0, throttle }, load]);
        }
        const done = steps.map(([at, st, load]) => ac.suspend(at).then(() => { voice.set(st, { load }); voice.update(); ac.resume(); }));
        const out = await ac.startRendering(); await Promise.all(done);
        return { samples: Array.from(out.getChannelData(0)), bounds, sr };
      }, { cls, bank, clips: clipData(names), drive });
      wav(path.join(outDir, `${tag}-${cls}.wav`), r.samples, r.sr);
      const parts = r.bounds.slice(1).map((end, i) => measure(r.samples.subarray(Math.round(r.bounds[i] * r.sr), Math.round(end * r.sr))));
      report.push({ kind: 'engine', name: cls, file: `${tag}-${cls}.wav`, parts, bounds: r.bounds, drive });
      console.log(`${tag} ${cls.padEnd(11)} phase RMS ${parts.map(p => p.rms.toFixed(3)).join(' / ')} peak ${Math.max(...parts.map(p => p.peak)).toFixed(2)}`);
    }
    for (const name of beds) {
      const r = await render(async ({ name, clips, seconds }) => {
        const sr = 44100, ac = new OfflineAudioContext(1, seconds * sr, sr);
        const b = await ac.decodeAudioData(Uint8Array.from(atob(clips[name]), c => c.charCodeAt(0)).buffer);
        const p = HaulAudio.createLoopPlayer(ac, b, ac.destination, { grain: [2.5, 5], fade: 0.8 }); p.setGain(0.8, 0.01);
        const done = []; for (let i = 0; i * 0.05 < seconds - 0.05; i++) done.push(ac.suspend(Math.round(i * 0.05 * sr / 128) * 128 / sr).then(() => { p.update(); ac.resume(); }));
        const out = await ac.startRendering(); await Promise.all(done);
        return { samples: Array.from(out.getChannelData(0)), sr };
      }, { name, clips: clipData([name]), seconds });
      wav(path.join(outDir, `bed-${name}.wav`), r.samples, r.sr);
      // evenness: loudness of each second (a loop point or gap shows up as a dip)
      const secs = Array.from({ length: seconds - 1 }, (_, i) => measure(r.samples.subarray((i + 1) * r.sr, (i + 2) * r.sr)).rms);
      const m = measure(r.samples.subarray(r.sr)), spread = Math.min(...secs) / Math.max(...secs);
      report.push({ kind: 'bed', name, file: `bed-${name}.wav`, rms: m.rms, peak: m.peak, minOverMax: spread });
      console.log(`bed ${name.padEnd(12)} rms ${m.rms.toFixed(3)} peak ${m.peak.toFixed(2)} quietest/loudest second ${spread.toFixed(2)}`);
    }
    fs.writeFileSync(path.join(outDir, tag === 'engine' ? 'report.json' : `${tag}-report.json`), JSON.stringify(report, null, 2) + '\n');
    fs.writeFileSync(path.join(outDir, tag === 'engine' ? 'index.html' : `${tag}-index.html`), '<!doctype html><meta name="viewport" content="width=device-width"><title>Heavy Haul sound previews</title><style>body{background:#17211e;color:#eee;font:17px system-ui;max-width:820px;margin:40px auto;padding:20px}audio{width:100%}section{margin:22px 0}</style><h1>Heavy Haul sound previews</h1><p>' + (tag === 'engine' ? 'Start, idle, pull away, cruise, ease off, idle, shut down.' : '0–2s start; 2–3 idle; 3–6 light pedal; 6–9 full pedal at the SAME RPM; 9–12 uphill load at the SAME RPM and pedal; 12–15 lift off; 15–19 RPM rise; 19–24 steady pedal; 24–26 downshift; 26–28 stop.') + '</p>' + report.map(r => `<section><h2>${r.kind} · ${r.name}</h2><audio controls preload="none" src="${r.file}"></audio></section>`).join(''));
    return report;
  } finally { await browser.close(); }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) await renderPreviews();
