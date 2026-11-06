// Exercise the release economy without changing the checked-in local test mode.
import { build } from 'esbuild';
import fs from 'node:fs';
import { ROOT } from '../tools/lib/content.js';

export async function releaseCode(entry, format = 'esm') {
  const result = await build({
    entryPoints: [`${ROOT}/${entry}`], bundle: true, write: false, format, target: 'es2020',
    plugins: [{ name: 'release-economy-test', setup(b) {
      b.onLoad({ filter: /game-config\.js$/ }, ({ path }) => ({ contents: fs.readFileSync(path, 'utf8').replace('export const TEST_MODE = true;', 'export const TEST_MODE = false;'), loader: 'js' }));
      b.onResolve({ filter: /^virtual:content$/ }, () => ({ path: 'content', namespace: 'test-content' }));
      b.onLoad({ filter: /.*/, namespace: 'test-content' }, () => ({ contents: "export default JSON.parse(document.getElementById('haul-content').textContent);", loader: 'js' }));
    } }],
  });
  return result.outputFiles[0].text;
}
