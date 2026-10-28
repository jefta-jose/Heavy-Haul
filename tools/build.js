// Builds the whole game into one self-contained HTML file: source modules bundled with esbuild,
// every playable car, service vehicle, trailer and load plus the season (JSON + artwork) embedded,
// HUD icons inlined. The content (tens of MB of data URIs) goes into its own JSON block on the page,
// not through esbuild, so a rebuild only bundles the code and takes well under a second.
//   node tools/build.js            -> dist/heavy-haul.html and dist/heavy-haul.artifact.html
//   HAUL_CAR=<id> picks the garage's default car; HAUL_SEASON=<id> the season.
import fs from 'node:fs';
import path from 'node:path';
import * as esbuild from 'esbuild';
import { ROOT, loadContentWithArt } from './lib/content.js';

const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

export async function build() {
  const content = loadContentWithArt();
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
    .replace('<script>/*JS*/</script>', () => `<script type="application/json" id="haul-content">${data}</script>\n<script>${js}</script>`);
  const page = `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>\n${html}\n</body></html>\n`;
  fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'dist/heavy-haul.html'), page);
  fs.writeFileSync(path.join(ROOT, 'dist/heavy-haul.artifact.html'), html);
  return { mb: (page.length / 1e6).toFixed(2), cars: content.cars.length, season: content.season.id };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.join(ROOT, 'tools/build.js')) {
  const r = await build();
  console.log(`Built dist/heavy-haul.html (${r.mb} MB) · ${r.cars} playable cars · season ${r.season}`);
}
