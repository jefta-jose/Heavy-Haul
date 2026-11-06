// The player's rank, XP and owned trucks, saved on this device. XP adds up to a rank (RANK_XP); reaching a rank opens one more
// truck in every class (its unlockRank in cars.json), which then has to be bought for its price. Each class's weakest truck,
// unlockRank 1, is owned from the start.
import { RANK_XP, XP_BY_CLASS, STARTING_RANK } from '../game-config.js';

const KEY = 'hh_progress';
const MAX_RANK = RANK_XP.length;

// the rank a total of XP reaches, and how far it is through to the next
export function rankFor(xp) { let r = 1; while (r < MAX_RANK && xp >= RANK_XP[r]) r++; return r; }
function rankProgress(xp) {
  const rank = rankFor(xp), from = RANK_XP[rank - 1], to = RANK_XP[rank] ?? from;
  return { rank, xp: Math.floor(xp), from, to, share: rank >= MAX_RANK ? 1 : (xp - from) / (to - from) };
}
// XP for something done in a truck of this class
export const classXp = (n, cls) => n * (XP_BY_CLASS[cls] ?? 1);

export function createProgress(roster, store = typeof localStorage === 'undefined' ? null : localStorage) {
  const byId = new Map(roster.map(r => [r.id, r]));
  let state = { xp: 0, owned: [] };
  try { const saved = JSON.parse(store?.getItem(KEY)); if (saved) state = { xp: Math.max(0, +saved.xp || 0), owned: [...new Set(saved.owned ?? [])].filter(id => byId.has(id)) }; } catch (e) {}
  state.xp = Math.max(state.xp, RANK_XP[Math.min(Math.max(1, STARTING_RANK), MAX_RANK) - 1] ?? 0);   // the testing floor
  const save = () => { try { store?.setItem(KEY, JSON.stringify({ xp: Math.floor(state.xp), owned: state.owned })); } catch (e) {} };
  const rankOf = id => byId.get(id)?.unlockRank ?? 1;
  const p = {
    get xp() { return Math.floor(state.xp); },
    get rank() { return rankFor(state.xp); },
    get progress() { return rankProgress(state.xp); },
    unlockRank: rankOf,
    price: id => (rankOf(id) <= 1 ? 0 : byId.get(id)?.price ?? 0),
    // open: its rank is reached, so it can be bought; owned: bought, or a free starter
    isOpen: id => rankOf(id) <= rankFor(state.xp),
    owns: id => rankOf(id) <= 1 || state.owned.includes(id),
    // adds XP and returns the ranks newly reached, with the trucks each one opens
    addXp(n, now = true) {
      const before = rankFor(state.xp); state.xp += Math.max(0, n); const after = rankFor(state.xp);
      if (now || after > before) save();
      const ups = [];
      for (let r = before + 1; r <= after; r++) ups.push({ rank: r, opens: roster.filter(c => c.unlockRank === r) });
      return ups;
    },
    save,
    // buy an open truck with the wallet; false when it is locked, owned already or too dear
    buy(id, wallet) {
      if (p.owns(id) || !p.isOpen(id) || !wallet.spend(p.price(id))) return false;
      state.owned.push(id); save(); return true;
    },
  };
  return p;
}
