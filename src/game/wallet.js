// The player's coins, saved on this device and shared by the road and the garage.
import { STARTING_COINS } from '../game-config.js';

const KEY = 'hh_wallet';
let coins = STARTING_COINS;
try {
  const raw = localStorage.getItem(KEY), saved = Number(raw);
  if (raw !== null && Number.isFinite(saved) && saved >= 0) coins = saved;
} catch (e) {}
const save = () => { try { localStorage.setItem(KEY, String(Math.floor(coins))); } catch (e) {} };

export const wallet = {
  get coins() { return Math.floor(coins); },
  // fractions are kept, so a coin per two metres adds up; saved now and then, and always with `now`
  add(n, now = true) { coins += n; if (now) save(); },
  save,
  spend(n) { if (coins < n) return false; coins -= n; save(); return true; },
};
