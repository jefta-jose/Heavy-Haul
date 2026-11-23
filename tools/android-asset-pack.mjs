// Store builds only: moves the heavy art (assets/cars, assets/seasons) out of the app's base module into the
// install-time asset pack android/gamedata, at the same paths under public/, so the bundle's base stays under Google
// Play's 200 MB limit. Play installs the pack with the app and its files join the app's assets, so the game reads them
// exactly as before. Run after `npx cap sync android`; `--restore` moves them back (for a local debug APK).
//   node tools/android-asset-pack.mjs [--restore]
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib/content.js';

const BASE = path.join(ROOT, 'android/app/src/main/assets/public');
const PACK = path.join(ROOT, 'android/gamedata/src/main/assets/public');
const HEAVY = ['assets/cars', 'assets/seasons'];
const BASE_LIMIT_MB = 150;   // Play's limit is 200 MB for the whole base module (code and resources too): keep a margin

const size = dir => !fs.existsSync(dir) ? 0 : fs.statSync(dir).isFile() ? fs.statSync(dir).size : fs.readdirSync(dir).reduce((s, f) => s + size(path.join(dir, f)), 0);
const move = (from, to) => { if (!fs.existsSync(from)) return; fs.rmSync(to, { recursive: true, force: true }); fs.mkdirSync(path.dirname(to), { recursive: true }); fs.renameSync(from, to); };

const restore = process.argv.includes('--restore');
if (!fs.existsSync(BASE)) throw new Error(`${BASE} is missing: run npm run android:sync first`);
for (const rel of HEAVY) restore ? move(path.join(PACK, rel), path.join(BASE, rel)) : move(path.join(BASE, rel), path.join(PACK, rel));
const mb = n => (n / 1e6).toFixed(1);
console.log(`base module assets ${mb(size(BASE))} MB, gamedata pack ${mb(size(PACK))} MB`);
if (!restore && size(BASE) / 1e6 > BASE_LIMIT_MB) { console.error(`The base module's assets are over ${BASE_LIMIT_MB} MB: move more into the pack.`); process.exit(1); }
