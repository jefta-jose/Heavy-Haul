// Builds the whole game into one self-contained HTML file: source modules bundled with esbuild,
// every playable car, service vehicle, trailer and load plus the season (JSON + artwork) embedded,
// HUD icons inlined. The content (tens of MB of data URIs) goes into its own JSON block on the page,
// not through esbuild, so a rebuild only bundles the code and takes well under a second.
//   node tools/build.js            -> dist/heavy-haul.html and dist/heavy-haul.artifact.html
//   node tools/build.js --app      -> dist/app/: index.html plus the art, sound and fonts as files,
//                                     the web root the Android app (Capacitor) ships
//   HAUL_CAR=<id> picks the garage's default car; HAUL_SEASON=<id> the season.
import fs from 'node:fs';
import path from 'node:path';
import * as esbuild from 'esbuild';
import { ROOT, loadContentWithArt } from './lib/content.js';

const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

async function page(content) {
  const virtualContent = {
    name: 'virtual-content',
    setup(b) {
      b.onResolve({ filter: /^virtual:content$/ }, () => ({ path: 'content', namespace: 'virtual' }));
      b.onLoad({ filter: /.*/, namespace: 'virtual' }, () => ({
        contents: "export default JSON.parse(document.getElementById('haul-content').textContent);",
        loader: 'js',
      }));
    },
  };
  const out = await esbuild.build({
    entryPoints: [path.join(ROOT, 'src/main.js')], bundle: true, write: false, format: 'iife',
    target: 'es2020', minify: true, legalComments: 'none', plugins: [virtualContent], logLevel: 'silent',
  });
  const js = out.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
  // JSON with every '<' escaped can sit safely inside a script element
  const data = JSON.stringify(content).replace(/</g, '\\u003c');
  let html = read('src/index.html')
    .replace('/*CSS*/', () => read('src/styles/game.css'))
    .replace(/<!--icon:([a-z-]+)-->/g, (_, name) => read(`assets/hud/icons/${name}.svg`).trim())
    // every icon whose name starts with the prefix, each in a <span data-icon>; missing ones are simply absent
    .replace(/<!--icons:([a-z-]+)-->/g, (_, prefix) => fs.readdirSync(path.join(ROOT, 'assets/hud/icons')).filter(f => f.startsWith(prefix) && f.endsWith('.svg'))
      .map(f => `<span data-icon="${f.slice(0, -4)}">${read(`assets/hud/icons/${f}`).trim()}</span>`).join(''))
    .replace('<script>/*JS*/</script>', () => `<script type="application/json" id="haul-content">${data}</script>\n<script>${js}</script>`);
  return { html, doc: `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>\n${html}\n</body></html>\n` };
}

export async function build() {
  const content = loadContentWithArt();
  const { html, doc } = await page(content);
  fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'dist/heavy-haul.html'), doc);
  fs.writeFileSync(path.join(ROOT, 'dist/heavy-haul.artifact.html'), html);
  return { mb: (doc.length / 1e6).toFixed(2), cars: content.cars.length, season: content.season.id };
}

// The app's web root: every image and clip copied as a file under its assets/ path and referenced
// relatively, and the fonts bundled instead of linked, so the installed game works offline.
export async function buildApp() {
  const out = path.join(ROOT, 'dist/app');
  fs.rmSync(out, { recursive: true, force: true });
  const copy = f => { fs.mkdirSync(path.dirname(path.join(out, f)), { recursive: true }); fs.copyFileSync(path.join(ROOT, f), path.join(out, f)); };
  const content = loadContentWithArt({ asset: f => { copy(f); return f; } });
  for (const f of fs.readdirSync(path.join(ROOT, 'assets/fonts'))) copy(`assets/fonts/${f}`);
  let { doc } = await page(content);
  doc = doc.replace(/<link rel="preconnect"[^>]*>\n<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>/, '<link rel="stylesheet" href="assets/fonts/fonts.css">');
  if (doc.includes('fonts.googleapis.com')) throw new Error('App build: the Google Fonts link in src/index.html changed; update buildApp');
  fs.writeFileSync(path.join(out, 'index.html'), doc);
  let bytes = 0;
  const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) e.isDirectory() ? walk(path.join(d, e.name)) : bytes += fs.statSync(path.join(d, e.name)).size; };
  walk(out);
  return { mb: (bytes / 1e6).toFixed(2), cars: content.cars.length, season: content.season.id };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.join(ROOT, 'tools/build.js')) {
  const app = process.argv.includes('--app');
  const r = await (app ? buildApp() : build());
  console.log(`Built ${app ? 'dist/app/' : 'dist/heavy-haul.html'} (${r.mb} MB) · ${r.cars} playable cars · season ${r.season}`);
}
