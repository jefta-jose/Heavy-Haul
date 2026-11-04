// Builds the whole game into one self-contained HTML file: source modules bundled with esbuild,
// every playable car, service vehicle, trailer and load plus the season (JSON + artwork) embedded,
// HUD icons inlined. The content (tens of MB of data URIs) goes into its own JSON block on the page,
// not through esbuild, so a rebuild only bundles the code and takes well under a second.
// The app build keeps the art and audio as separate files beside the page, so a phone only reads and
// decodes what it shows or plays instead of parsing every asset as text at startup.
//   node tools/build.js            -> dist/heavy-haul.html and dist/heavy-haul.artifact.html
//   node tools/build.js --app      -> www/index.html and www/assets/ (the Capacitor web bundle)
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
  // the loading screens' art goes in the page's CSS, ahead of the content, so it paints first
  const { loaders, fonts, ...rest } = content;
  // the display font comes with the game, so it shows offline and on the first paint
  const fontFaces = Object.entries(fonts).map(([key, uri]) => `@font-face { font-family: "Barlow Condensed"; font-weight: ${parseInt(key)}; font-style: ${key.endsWith('i') ? 'italic' : 'normal'}; font-display: block; src: url("${uri}") format("woff2"); }\n`).join('');
  const loaderArt = `:root { ${Object.entries(loaders).map(([k, uri]) => `--loader-${k}: url("${uri}");`).join(' ')} }\n`;
  // JSON with every '<' escaped can sit safely inside a script element
  const data = JSON.stringify(rest).replace(/</g, '\\u003c');
  let html = read('src/index.html')
    .replace('/*CSS*/', () => fontFaces + loaderArt + read('src/styles/game.css'))
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

export async function buildApp() {
  const files = new Set();
  const content = loadContentWithArt({ asset: f => { const file = path.posix.normalize(f); files.add(file); return file; } });
  const { doc } = await page(content);
  const www = path.join(ROOT, 'www');
  fs.rmSync(www, { recursive: true, force: true });
  let bytes = 0;
  for (const f of files) {
    fs.mkdirSync(path.dirname(path.join(www, f)), { recursive: true });
    fs.copyFileSync(path.join(ROOT, f), path.join(www, f));
    bytes += fs.statSync(path.join(ROOT, f)).size;
  }
  fs.writeFileSync(path.join(www, 'index.html'), doc);
  return { mb: (doc.length / 1e6).toFixed(2), files: files.size, assetsMb: (bytes / 1e6).toFixed(1), cars: content.cars.length, season: content.season.id };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.join(ROOT, 'tools/build.js')) {
  if (process.argv.includes('--app')) {
    const r = await buildApp();
    console.log(`Built www/index.html (${r.mb} MB) + ${r.files} asset files (${r.assetsMb} MB) · ${r.cars} playable cars · season ${r.season}`);
  } else {
    const r = await build();
    console.log(`Built dist/heavy-haul.html (${r.mb} MB) · ${r.cars} playable cars · season ${r.season}`);
  }
}
