// Coming back every day: the first time the garage opens on a new day the player gets that day's coins (STREAK_COINS, day 1
// to 7). Coming back the next day moves the streak on; missing a day starts it again at day 1; after day 7 it starts over.
// Saved on this device and in the cloud save (hh_streak: { last: 'YYYY-MM-DD', day }).
import { STREAK_COINS } from '../game-config.js';

const KEY = 'hh_streak';
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dayBefore = key => { const [y, m, d] = key.split('-').map(Number); return dayKey(new Date(y, m - 1, d - 1)); };

export function createStreak(store = typeof localStorage === 'undefined' ? null : localStorage, today = () => dayKey()) {
  let state = { last: null, day: 0 };
  try { const s = JSON.parse(store?.getItem(KEY)); if (s) state = { last: s.last ?? null, day: +s.day || 0 }; } catch (e) {}
  return {
    // today's reward if it has not been taken: { day (1 to 7), coins, days: STREAK_COINS } or null
    due() {
      const now = today(); if (state.last === now) return null;
      const day = state.last === dayBefore(now) ? state.day % STREAK_COINS.length + 1 : 1;
      return { day, coins: STREAK_COINS[day - 1], days: STREAK_COINS };
    },
    // takes today's reward; returns the coins to add (0 if it was already taken)
    claim() {
      const d = this.due(); if (!d) return 0;
      state = { last: today(), day: d.day };
      try { store?.setItem(KEY, JSON.stringify(state)); } catch (e) {}
      return d.coins;
    },
  };
}
