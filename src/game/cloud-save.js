// Cloud save: the player's progress follows their Google account (Google Play Games Saved Games, PlayGamesPlugin.java),
// so deleting the app, clearing its data or moving to a new phone keeps rank, coins, trucks, maps and upgrades.
// The phone keeps its own copy in localStorage as before; this module copies the progress keys to and from the cloud.
//
//   restore()  at start-up, once signed in: if the cloud save is ahead of this phone (more XP, or the same XP written
//              later by another phone), it is written over the local keys and the game reloads; resolves true then
//   save(now)  uploads the local keys (throttled; `now` skips the throttle: the game going to the background)
//   wipe()     empties the cloud copy (the garage's RESET)
//
// Which copy wins: XP only ever grows, so the save with more XP is the one played further. A tie goes to the later write.
// Android's own backup is off (AndroidManifest.xml): it restored days-old snapshots on reinstall, which is what this replaces.
const KEYS = ['hh_progress', 'hh_wallet', 'hh_seasons', 'hh_tuning_levels', 'hh_powers', 'hh_missions', 'hh_once', 'hh_grants', 'hh_grant_log', 'hh_streak', 'hh_stats', 'haul.car', 'haul.season'];
const AT = 'hh_cloud_at';          // savedAt of the cloud copy this phone last wrote or took
const THROTTLE_MS = 30000;

export function createCloudSave({ plugin = typeof window === 'undefined' ? null : window.Capacitor?.Plugins?.PlayGames, storage = typeof localStorage === 'undefined' ? null : localStorage, signedIn = () => false, describe = () => 'Heavy Haul progress', reload = () => location.reload(), now = () => Date.now() } = {}) {
  let lastSave = 0, busy = null;
  const get = k => { try { return storage?.getItem(k) ?? null; } catch (e) { return null; } };
  const xpOf = raw => { try { return Math.max(0, +JSON.parse(raw)?.xp || 0); } catch (e) { return 0; } };
  const usable = () => !!plugin?.loadSave && signedIn();

  const api = {
    get available() { return usable(); },
    async restore() {
      if (!usable()) return false;
      let cloud = null;
      try {
        const res = await plugin.loadSave();
        if (!res?.available || !res.data) return false;
        cloud = JSON.parse(res.data);
      } catch (e) { console.warn('Cloud save could not be read:', e); return false; }
      if (!cloud?.data || typeof cloud.data !== 'object') return false;
      const cloudXp = xpOf(cloud.data.hh_progress), localXp = xpOf(get('hh_progress')), localAt = +get(AT) || 0;
      const ahead = typeof cloud.data.hh_progress === 'string' && (cloudXp > localXp || (cloudXp === localXp && +cloud.savedAt > localAt));
      if (!ahead) return false;
      try {
        for (const k of KEYS) {
          const v = cloud.data[k];
          if (typeof v === 'string') storage.setItem(k, v); else storage.removeItem(k);
        }
        storage.setItem(AT, String(+cloud.savedAt || 0));
      } catch (e) { console.warn('Cloud save could not be applied:', e); return false; }
      reload();
      return true;
    },
    // the garage's RESET: the cloud copy is emptied too, or the next start would bring the old progress back
    wipe() { return api.save(true, true); },
    async save(force = false, empty = false) {
      if (!usable() || (busy && !empty)) return false;
      if (!force && now() - lastSave < THROTTLE_MS) return false;
      lastSave = now();
      const savedAt = now(), data = {};
      if (!empty) for (const k of KEYS) { const v = get(k); if (v !== null) data[k] = v; }
      busy = (async () => {
        try {
          const res = await plugin.writeSave({ data: JSON.stringify({ v: 1, savedAt, data }), description: describe() });
          if (res?.saved) { try { storage.setItem(AT, String(savedAt)); } catch (e) {} return true; }
        } catch (e) { console.warn('Cloud save could not be written:', e); }
        return false;
      })();
      try { return await busy; } finally { busy = null; }
    },
  };
  return api;
}
