import test from 'node:test';
import assert from 'node:assert/strict';
import { assertReleaseEconomy } from '../tools/check-release-economy.js';
import { releaseCode } from './release-build.js';

test('Google Play accepts only rank 1 and exactly 20,000 starting coins', () => {
  assert.doesNotThrow(() => assertReleaseEconomy({ rank: 1, coins: 20000 }));
  for (const rank of [0, 2, 20, 1.5, '1', NaN]) assert.throws(() => assertReleaseEconomy({ rank, coins: 20000 }), /STARTING_RANK must be 1/);
  for (const coins of [0, 19999, 20001, 20000000, '20000', NaN]) assert.throws(() => assertReleaseEconomy({ rank: 1, coins }), /STARTING_COINS must be 20000/);
  assert.throws(() => assertReleaseEconomy({ rank: 20, coins: 20000000 }), /STARTING_RANK.*STARTING_COINS.*manually/);
});

test('editable starting values support different fresh-player scenarios without a mode flag', async () => {
  for (const [rank, coins] of [[1, 20000], [5, 500], [20, 20000000]]) {
    const code = await releaseCode('src/game-config.js', 'esm', { rank, coins });
    const config = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
    assert.equal(config.STARTING_RANK, rank); assert.equal(config.STARTING_COINS, coins);
    const progressCode = await releaseCode('src/game/progress.js', 'esm', { rank, coins });
    const { createProgress } = await import(`data:text/javascript;base64,${Buffer.from(progressCode).toString('base64')}`);
    assert.equal(createProgress([], null).rank, rank, 'fresh progress uses the configured rank');
  }
});

test('store command fails on either wrong value and never rewrites configuration', async () => {
  const fs = await import('node:fs/promises'), os = await import('node:os'), path = await import('node:path');
  const { spawnSync } = await import('node:child_process');
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'heavy-haul-store-gate-'));
  try {
    await fs.mkdir(path.join(dir, 'src')); await fs.mkdir(path.join(dir, 'tools'));
    await fs.writeFile(path.join(dir, 'package.json'), '{"type":"module"}');
    await fs.copyFile(new URL('../tools/check-release-economy.js', import.meta.url), path.join(dir, 'tools/check-release-economy.js'));
    const file = path.join(dir, 'src/game-config.js');
    for (const [rank, coins, exit] of [[1, 20000, 0], [20, 20000, 1], [1, 20000000, 1], [20, 20000000, 1]]) {
      const config = `export const STARTING_RANK = ${rank};\nexport const STARTING_COINS = ${coins};\n`;
      await fs.writeFile(file, config);
      const result = spawnSync(process.execPath, [path.join(dir, 'tools/check-release-economy.js')], { encoding: 'utf8' });
      assert.equal(result.status, exit, result.stderr);
      if (exit) assert.match(result.stderr, /Google Play release blocked/);
      else assert.match(result.stdout, /economy verified/);
      assert.equal(await fs.readFile(file, 'utf8'), config, 'CI does not silently repair forgotten values');
    }
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});
