// Who is playing: the player's Google account through Google Play Games Services (android PlayGamesPlugin.java), the
// only sign-in the game has. At start-up it signs in automatically, as Google asks of games (no form, no password: the
// account already on the phone). A player who declined can sign in from the garage chip. In a browser, or before the
// Play Games project id is set, there is no account and the game plays as a guest on this device.
//   init()      resolves the player { id, name } or null; called once at start-up
//   signIn()    asks Google again (from the chip)
//   player      the signed-in player, or null
//   onChange(fn)
const KEY = 'hh_player';

export function createAccount(plugin = typeof window === 'undefined' ? null : window.Capacitor?.Plugins?.PlayGames) {
  let player = null, available = false;
  const listeners = [];
  try { player = JSON.parse(localStorage.getItem(KEY)) ?? null; } catch (e) {}
  function set(res) {
    available = !!res?.available;
    player = res?.signedIn && res.playerId ? { id: res.playerId, name: res.displayName || 'Player' } : null;
    try { player ? localStorage.setItem(KEY, JSON.stringify(player)) : localStorage.removeItem(KEY); } catch (e) {}
    for (const fn of listeners) fn(player);
    return player;
  }
  const call = async name => { try { return set(await plugin[name]()); } catch (e) { console.warn(`Play Games ${name} failed:`, e); return set(null); } };
  return {
    get player() { return player; },
    get available() { return available; },
    onChange(fn) { listeners.push(fn); },
    async init() {
      if (!plugin) return set(null);
      const now = await call('status');
      return now ?? (available ? call('signIn') : null);
    },
    signIn: () => plugin ? call('signIn') : Promise.resolve(null),
  };
}
