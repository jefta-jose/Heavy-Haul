// Repeatable listening/response review: npm's audio preview helper uses the same
// runtime as the game. These checks test control response, not subjective realism.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { renderPreviews } from './audio-preview.js';

const drive = [[2,'cranking',0,0],[1,'on',0,0],[3,'on',0.3,0.25,0.35],[3,'on',0.3,1,0.35],[3,'on',0.3,1,1],[3,'on',0.3,0,0],[4,'on',[0.1,0.85],0.8,0.6],[5,'on',0.65,0.8,0.6],[2,'on',0.35,0.8,0.6],[2,'off',0,0]];
const reports = await renderPreviews({ classes: ['highway','heavy-duty','offroad','heavy'], beds: [], tag: 'response', drive });
const checks = [];
for (const report of reports) {
  const wav = fs.readFileSync(new URL(`../output/audio/${report.file}`, import.meta.url));
  const sr = wav.readUInt32LE(24), count = (wav.length - 44) / 2;
  const sample = i => wav.readInt16LE(44 + i * 2) / 32768;
  const rms = (a,b) => {
    let sum = 0;
    const lo = Math.round(a * sr), hi = Math.min(count, Math.round(b * sr));
    for (let i = lo; i < hi; i++) sum += sample(i) ** 2;
    return Math.sqrt(sum / (hi - lo));
  };
  const row = { engine: report.name, lightPedalRms: rms(3.4,5.9), fullPedalRms: rms(6.4,8.9), uphillRms: rms(9.4,11.9), liftRms: rms(12.4,14.9), shutdownTailRms: rms(27.3,27.9), peakAmplitude: Math.max(...report.parts.map(p => p.peak)) };
  assert(row.fullPedalRms > row.lightPedalRms * 1.2, `${row.engine}: pedal response at identical RPM`);
  assert(row.uphillRms > row.fullPedalRms * 1.05, `${row.engine}: load response at identical RPM/pedal`);
  assert(row.liftRms < row.fullPedalRms * 0.8, `${row.engine}: lift-off unloads`);
  assert(row.shutdownTailRms < 0.001, `${row.engine}: shutdown reaches silence`);
  assert(row.peakAmplitude < 0.99, `${row.engine}: no clipping`);
  checks.push(row);
}
fs.writeFileSync(new URL('../output/audio/response-checks.json', import.meta.url), JSON.stringify(checks,null,2)+'\n');
console.log('All four diesel engines passed the controlled pedal/load checks. Listening review: output/audio/response-index.html');
