// Which maps the player owns (user, 2026-11-22): FREE_SEASONS are everyone's, every other map is bought once in the garage's
// Seasons page for SEASON_PRICE coins. Saved on this device (hh_seasons).
import { FREE_SEASONS, SEASON_PRICE } from '../game-config.js';

export function createSeasonPass(store = typeof localStorage === 'undefined' ? null : localStorage) {
  const KEY = 'hh_seasons';
  let bought = [];
  try { const saved = JSON.parse(store?.getItem(KEY)); if (Array.isArray(saved)) bought = saved.filter(id => typeof id === 'string'); } catch (e) {}
  const save = () => { try { store?.setItem(KEY, JSON.stringify(bought)); } catch (e) {} };
  const pass = {
    owns: id => FREE_SEASONS.includes(id) || bought.includes(id),
    price: id => (pass.owns(id) ? 0 : SEASON_PRICE),
    // spends the coins and keeps the map; false if owned already or the wallet is short
    buy(id, wallet) {
      if (pass.owns(id) || !wallet.spend(SEASON_PRICE)) return false;
      bought.push(id); save(); return true;
    },
    // given outright (the shop, later)
    grant(id) { if (!pass.owns(id)) { bought.push(id); save(); } },
    // a refunded purchase (shop.js revoke)
    revoke(id) { if (bought.includes(id)) { bought = bought.filter(x => x !== id); save(); } },
  };
  return pass;
}
export const seasonPass = createSeasonPass();
