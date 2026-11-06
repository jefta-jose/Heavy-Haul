// Fixed fresh-player fixtures, independent of the developer's editable starting values.
// These overrides exist only in test bundles; the store gate reads the real config.
import { build } from 'esbuild';
import fs from 'node:fs';
import { ROOT } from '../tools/lib/content.js';

export async function releaseCode(entry, format = 'esm', { rank = 1, coins = 20000 } = {}) {
  const result = await build({
    entryPoints: [`${ROOT}/${entry}`], bundle: true, write: false, format, target: 'es2020',
    plugins: [{ name: 'release-economy-test', setup(b) {
      b.onLoad({ filter: /game-config\.js$/ }, ({ path }) => {
        let contents = fs.readFileSync(path, 'utf8');
        for (const [key, value] of Object.entries({ STARTING_RANK: rank, STARTING_COINS: coins })) {
          const declaration = new RegExp(`export const ${key} = [^;\\n]+;`);
          if (!declaration.test(contents)) throw new Error(`Missing fixture setting ${key}`);
          contents = contents.replace(declaration, `export const ${key} = ${JSON.stringify(value)};`);
        }
        return { contents, loader: 'js' };
      });
      b.onResolve({ filter: /^virtual:content$/ }, () => ({ path: 'content', namespace: 'test-content' }));
      b.onLoad({ filter: /.*/, namespace: 'test-content' }, () => ({ contents: "export default JSON.parse(document.getElementById('haul-content').textContent);", loader: 'js' }));
    } }],
  });
  return result.outputFiles[0].text;
}
