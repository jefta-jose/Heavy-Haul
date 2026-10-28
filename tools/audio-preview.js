// Audition the actual recorded engine graph: crank, idle, rev, lift, hard pull and shutdown.
// npm run audio:preview -> output/audio/recorded-<car>.wav and index.html
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadContent, ROOT } from './lib/content.js';
import { engineProfile } from '../src/audio/engine-dsp.js';

export function measure(x) {
  let ss = 0, peak = 0, nan = false;
  for (const v of x) { if (!Number.isFinite(v)) nan = true; ss += v * v; peak = Math.max(peak, Math.abs(v)); }
  return { rms: Math.sqrt(ss / Math.max(1, x.length)), peak, nan };
}

export function readWav(file) {
  const b = fs.readFileSync(file);
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WAVE') throw new Error(`Not WAV: ${file}`);
  let sr, channels, bits, encoding, data;
  for (let p = 12; p + 8 <= b.length;) {
    const id = b.toString('ascii', p, p + 4), n = b.readUInt32LE(p + 4), start = p + 8;
    if (id === 'fmt ') { encoding = b.readUInt16LE(start); channels = b.readUInt16LE(start + 2); sr = b.readUInt32LE(start + 4); bits = b.readUInt16LE(start + 14); }
    if (id === 'data') data = b.subarray(start, start + n);
    p = start + n + n % 2;
  }
  if (encoding !== 1 || channels !== 1 || bits !== 16 || !data) throw new Error(`Expected mono PCM16: ${file}`);
  return { sr, samples: Float32Array.from({ length: data.length / 2 }, (_, i) => data.readInt16LE(i * 2) / 32768) };
}

function wav(file, samples, sr) {
  const b = Buffer.alloc(44 + samples.length * 2);
  b.write('RIFF'); b.writeUInt32LE(b.length - 8, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28);
  b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((v, i) => b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), 44 + i * 2));
  fs.writeFileSync(file, b);
}

export async function renderPreviews() {
  const { chromium } = await import('playwright'), esbuild = await import('esbuild');
  const content = loadContent(), manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/audio/audio.json')));
  const bundled = await esbuild.build({ stdin: { contents: "export { createRecordedEngine } from './src/audio/engine-dsp.js';", resolveDir: ROOT }, bundle: true, write: false, format: 'iife', globalName: 'RecordedAudio' });
  const outDir = path.join(ROOT, 'output/audio'); fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ args: ['--no-sandbox'] }), reports = [];
  try {
    const page = await browser.newPage(); await page.addScriptTag({ content: bundled.outputFiles[0].text });
    for (const car of [...content.cars, ...content.service].filter(c => !process.env.HAUL_CAR || c.id === process.env.HAUL_CAR)) {
      const profile = engineProfile(car), clips = {};
      for (const role of ['idle', 'drive', 'start']) {
        const key = `${profile.recording}-${role}`;
        clips[key] = fs.readFileSync(path.join(ROOT, 'assets/audio', manifest.clips[key].file)).toString('base64');
      }
      const rendered = await page.evaluate(async ({ car, clips, profile }) => {
        const sr = 44100, dc = car.drivetrain;
        const stages = [
          [profile.crankS, { engine: 'cranking', rpm: 190, throttle: 0 }],
          [2, { engine: 'on', rpm: dc.idleRpm, throttle: 0 }],
          [3, { engine: 'on', rpm: dc.governedRpm, throttle: 1 }],
          [1.5, { engine: 'on', rpm: dc.idleRpm + 300, throttle: 0 }],
          [2, { engine: 'on', rpm: dc.idleRpm + 250, throttle: 1 }],
          [1.5, { engine: 'off', rpm: 0, throttle: 0 }],
        ];
        const duration = stages.reduce((n, s) => n + s[0], 0), ac = new OfflineAudioContext(1, Math.ceil(duration * sr), sr), bank = {};
        for (const [key, raw] of Object.entries(clips)) bank[key] = await ac.decodeAudioData(Uint8Array.from(atob(raw), c => c.charCodeAt(0)).buffer);
        const voice = RecordedAudio.createRecordedEngine(ac, bank, car, ac.destination); voice.out.gain.value = 0.85;
        voice.set(stages[0][1]); let elapsed = stages[0][0]; const boundaries = [0, elapsed], scheduled = [];
        for (const [duration, state] of stages.slice(1)) {
          scheduled.push(ac.suspend(elapsed).then(() => { voice.set(state); return ac.resume(); }));
          elapsed += duration; boundaries.push(elapsed);
        }
        const result = await ac.startRendering(); await Promise.all(scheduled);
        return { samples: Array.from(result.getChannelData(0)), boundaries, sr };
      }, { car, clips, profile });
      const samples = Float32Array.from(rendered.samples), file = `recorded-${car.id}.wav`;
      wav(path.join(outDir, file), samples, rendered.sr);
      const parts = rendered.boundaries.slice(1).map((end, i) => measure(samples.subarray(Math.round(rendered.boundaries[i] * rendered.sr), Math.round(end * rendered.sr))));
      if (parts.some(p => p.nan || p.peak >= 0.98) || parts[1].rms < 0.015 || parts[2].rms <= parts[1].rms || measure(samples.subarray(samples.length - rendered.sr / 2)).rms > 0.001) throw new Error(`Bad recorded engine output: ${car.id}`);
      reports.push({ car: car.id, source: profile.recording, file, parts });
      console.log(`${car.id}: idle ${parts[1].rms.toFixed(3)}, loaded ${parts[2].rms.toFixed(3)}, peak ${measure(samples).peak.toFixed(3)}, shutdown silent`);
    }
    fs.writeFileSync(path.join(outDir, 'recorded-report.json'), JSON.stringify(reports, null, 2) + '\n');
    fs.writeFileSync(path.join(outDir, 'index.html'), '<!doctype html><meta name="viewport" content="width=device-width"><title>Recorded truck engines</title><style>body{background:#17211e;color:#eee;font:18px system-ui;max-width:800px;margin:40px auto;padding:20px}audio{width:100%}section{margin:28px 0}</style><h1>Recorded truck engines</h1><p>Each preview: starter → idle → rev/load → lift → hard pull → shutdown. Six distinct CC0 field recordings; see assets/audio/README.md for sources.</p>' + reports.map(r => `<section><h2>${r.car}</h2><audio controls preload="none" src="${r.file}"></audio></section>`).join(''));
    return reports;
  } finally { await browser.close(); }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) await renderPreviews();
