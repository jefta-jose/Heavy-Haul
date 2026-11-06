// Store-only gate. Local/debug builds deliberately allow arbitrary starting values.
import { STARTING_RANK, STARTING_COINS } from '../src/game-config.js';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export function assertReleaseEconomy({ rank, coins }) {
  const errors = [];
  if (rank !== 1) errors.push(`STARTING_RANK must be 1 (currently ${rank})`);
  if (coins !== 20000) errors.push(`STARTING_COINS must be 20000 (currently ${coins})`);
  if (errors.length) throw new Error(`Google Play release blocked: ${errors.join('; ')}. Reset these values manually in src/game-config.js before deploying.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    assertReleaseEconomy({ rank: STARTING_RANK, coins: STARTING_COINS });
    console.log('Google Play economy verified: starting rank 1, starting coins 20000.');
  } catch (error) {
    console.error(error.message); process.exitCode = 1;
  }
}
