// Google Play Games leaderboards and achievements (PlayGamesPlugin.java). The game keeps its own counters (hh_stats, part of
// the cloud save) and hands Play the totals whenever it can: an incremental achievement gets its steps set to the counter,
// a one-step one is unlocked once the counter reaches it. So nothing is lost while signed out or offline; the next sync
// catches up. Ids are in PLAY_ACHIEVEMENTS and PLAY_LEADERBOARDS (game-config.js); an empty id is skipped.
//   count(stat, n)   adds to a counter; set(stat, v) keeps the larger; addClass(cls) counts a class delivered with
//   submitTime(map, seconds)   the run's delivery time on that map's leaderboard (Play keeps the player's best)
//   sync()           sends every counter (after a run and when signed in)
//   showLeaderboards(), showAchievements()   Google's own screens
import { PLAY_ACHIEVEMENTS, PLAY_LEADERBOARDS } from '../game-config.js';

const KEY = 'hh_stats';

export function createAchievements({ plugin = typeof window === 'undefined' ? null : window.Capacitor?.Plugins?.PlayGames, signedIn = () => false, store = typeof localStorage === 'undefined' ? null : localStorage } = {}) {
  let stats = {};
  try { stats = JSON.parse(store?.getItem(KEY)) ?? {}; } catch (e) {}
  const save = () => { try { store?.setItem(KEY, JSON.stringify(stats)); } catch (e) {} };
  const value = stat => stat === 'classes' ? (stats.classes ?? []).length : Math.floor(stats[stat] ?? 0);
  const usable = () => !!plugin?.unlockAchievement && signedIn();
  const quiet = p => p?.catch?.(e => console.warn('Play Games:', e));
  const api = {
    get stats() { return stats; },
    value,
    count(stat, n = 1) { stats[stat] = (stats[stat] ?? 0) + n; save(); },
    set(stat, v) { if (v > (stats[stat] ?? 0)) { stats[stat] = v; save(); } },
    addClass(cls) { const list = stats.classes ?? []; if (cls && !list.includes(cls)) { stats.classes = [...list, cls]; save(); } },
    submitTime(map, seconds) {
      const id = PLAY_LEADERBOARDS[map];
      if (id && usable()) quiet(plugin.submitScore({ id, score: Math.round(seconds * 1000) }));
    },
    sync() {
      if (!usable()) return;
      for (const a of PLAY_ACHIEVEMENTS) {
        if (!a.id) continue;
        const v = Math.min(value(a.stat), a.of);
        if (a.of > 1) { if (v > 0) quiet(plugin.setAchievementSteps({ id: a.id, steps: v })); }
        else if (v >= 1) quiet(plugin.unlockAchievement({ id: a.id }));
      }
    },
    get available() { return usable(); },
    showLeaderboards: () => usable() && quiet(plugin.showLeaderboards()),
    showAchievements: () => usable() && quiet(plugin.showAchievements()),
  };
  return api;
}
