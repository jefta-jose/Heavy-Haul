// The garage shop's catalogue and what a purchase gives (the cards are drawn by garage.js). Four tabs:
//   featured  bundles: a starter boost, the next truck in every class, the top truck of every class, a whole class, everything
//   trucks    any single truck, owned at once whatever its rank. Google Play sells it as one of a few price tiers
//             (`truck_tier_<n>`, SHOP_TRUCK_PRICES; user, 2026-11-24: one product per truck was ~270 to manage): the truck
//             being bought is remembered (hh_truck_orders) so a purchase that finishes later still gives the right one
//   coins     coin packs          ranks  rank packs, +2 / +4 / +5 / +8 (XP up to the rank), the dearest things here and the only source of ranks
// Every number is in src/game-config.js (SHOP_*). A purchase goes through the store (store.js) and is granted once per
// transaction id (kept in hh_grants), so a purchase reported twice by a real store later can never pay twice. What each
// purchase gave is logged (hh_grant_log), so a purchase Google later refunds can be taken back (`revoke`, refunds.js).
import {
  SHOP_COIN_PACKS, SHOP_RANK_PACKS, SHOP_TRUCK_PRICES, SHOP_CLASS_PACK_PRICE, SHOP_NEXT_FIVE_PRICE, SHOP_TOP_FIVE_PRICE,
  SHOP_STARTER_BUNDLE, SHOP_EVERYTHING, SHOP_ROOKIE_PACK, SHOP_MAPS_PACK_PRICE,
} from '../game-config.js';
import { createStore } from './store.js';
import { formatCoins } from './format.js';

const GRANTS = 'hh_grants', ONCE = 'hh_once', LOG = 'hh_grant_log', ORDERS = 'hh_truck_orders';   // ONCE: the one-time offers already bought
const productId = s => s.toLowerCase().replace(/[^a-z0-9_.]/g, '_');   // Google Play product ids: lowercase, digits, _ and .

export function createShop({ content, progress, wallet, store = createStore(), storage = typeof localStorage === 'undefined' ? null : localStorage, onLateGrant = null, maps = null }) {
  const read = (k, d) => { try { return JSON.parse(storage?.getItem(k)) ?? d; } catch (e) { return d; } };
  const write = (k, v) => { try { storage?.setItem(k, JSON.stringify(v)); } catch (e) {} };
  // maps: { ids: every paid map, owns(id), grant(id) } (season-pass.js); without it no map offers are made
  const classes = content.roster.classes;
  const art = new Map(content.cars.map(c => [c.id, c]));
  const classAt = id => classes.findIndex(x => x.id === id);
  // the trucks the shop can sell: playable ones, weakest to strongest within each class
  const trucks = content.roster.cars.filter(c => art.has(c.id)).sort((a, b) => classAt(a.class) - classAt(b.class) || a.unlockRank - b.unlockRank || a.order - b.order);
  const ofClass = cls => trucks.filter(c => c.class === cls);
  const nameOf = c => `${c.name}${c.number ? ' ' + c.number : ''}`;
  const pic = id => art.get(id)?.artUri?.master;
  const tierOf = c => { const i = SHOP_TRUCK_PRICES.findIndex(([r]) => c.unlockRank <= r); return i < 0 ? SHOP_TRUCK_PRICES.length - 1 : i; };
  const truckPrice = c => SHOP_TRUCK_PRICES[tierOf(c)][1];
  const tierId = c => `truck_tier_${tierOf(c) + 1}`;
  const missing = ids => ids.filter(id => !progress.owns(id));
  const rankAfter = ranks => Math.min(progress.maxRank, progress.rank + ranks);
  // a rank pack is only sold whole: +8 at rank 34 would pass the top rank, so it cannot be bought
  const fitsRanks = ranks => ranks == null || progress.rank + ranks <= progress.maxRank;
  const s = n => (n === 1 ? '' : 's');

  // an offer: { id, kind, title, sub, price, tag, gives: { coins, ranks, trucks }, pics }; `done` says it has nothing left to give
  const offer = o => ({ tag: '', pics: [], ...o, gives: { coins: 0, ranks: null, trucks: [], maps: [], ...o.gives } });
  const onceBought = () => { try { return JSON.parse(storage?.getItem(ONCE)) ?? []; } catch (e) { return []; } };
  const mapsMissing = ids => ids.filter(id => !maps?.owns(id));
  const done = o => (o.once && onceBought().includes(o.id)) || (o.gives.ranks != null && !fitsRanks(o.gives.ranks))
    || (!o.gives.coins && o.gives.ranks == null && !missing(o.gives.trucks).length && !mapsMissing(o.gives.maps).length);

  function featured() {
    const next = classes.map(k => ofClass(k.id).find(c => !progress.owns(c.id))).filter(Boolean);
    const top = classes.map(k => ofClass(k.id).at(-1)).filter(Boolean);
    const [coins, price] = SHOP_STARTER_BUNDLE, [allCoins, allPrice] = SHOP_EVERYTHING, [rookieCoins, rookiePrice] = SHOP_ROOKIE_PACK;
    const scout = ofClass(classes[0].id).find(c => !progress.owns(c.id)), paidMaps = maps?.ids ?? [];
    return [
      offer({ id: 'bundle_rookie', kind: 'bundle', once: true, title: 'Rookie pack', sub: `${formatCoins(rookieCoins)} coins${scout ? ` + ${nameOf(scout)}` : ''} · once`, price: rookiePrice, tag: 'Best deal', gives: { coins: rookieCoins, trucks: scout ? [scout.id] : [] }, pics: scout ? [pic(scout.id)] : [] }),
      offer({ id: 'bundle_starter', kind: 'bundle', once: true, title: 'Starter boost', sub: `${formatCoins(coins)} coins · once`, price, tag: 'New driver', gives: { coins } }),
      ...(paidMaps.length ? [offer({ id: 'bundle_all_maps', kind: 'bundle', title: 'Every map', sub: `All ${paidMaps.length} maps you don't have yet, open at once`, price: SHOP_MAPS_PACK_PRICE, gives: { maps: paidMaps } })] : []),
      offer({ id: 'bundle_next_five', kind: 'bundle', title: 'Next in every class', sub: next.length ? `${next.length} truck${s(next.length)}: ${next.map(nameOf).join(', ')}` : 'You own every class', price: SHOP_NEXT_FIVE_PRICE, gives: { trucks: next.map(c => c.id) }, pics: next.map(c => pic(c.id)) }),
      offer({ id: 'bundle_top_five', kind: 'bundle', title: 'Top of every class', sub: `The strongest truck of each class: ${top.map(nameOf).join(', ')}`, price: SHOP_TOP_FIVE_PRICE, tag: 'Popular', gives: { trucks: top.map(c => c.id) }, pics: top.map(c => pic(c.id)) }),
      ...classes.map(k => {
        const list = ofClass(k.id);
        return offer({ id: productId(`bundle_class_${k.id}`), kind: 'bundle', title: `Every ${k.name.replace(/s$/, '')} truck`, sub: `All ${list.length} trucks of the class`, price: SHOP_CLASS_PACK_PRICE, gives: { trucks: list.map(c => c.id) }, pics: [list.at(-1), list[Math.floor(list.length / 2)], list[0]].filter(Boolean).map(c => pic(c.id)) });
      }),
      offer({ id: 'bundle_everything', kind: 'bundle', title: 'The whole fleet', sub: `All ${trucks.length} trucks, every map and ${formatCoins(allCoins)} coins`, price: allPrice, tag: 'Best value', gives: { coins: allCoins, trucks: trucks.map(c => c.id), maps: paidMaps }, pics: top.slice(0, 3).map(c => pic(c.id)) }),
    ];
  }
  const truckOffers = cls => ofClass(cls).map(c => offer({ id: tierId(c), kind: 'truck', truck: c.id, title: nameOf(c), sub: `Rank ${c.unlockRank} · yours at once`, price: truckPrice(c), gives: { trucks: [c.id] }, pics: [pic(c.id)] }));
  const coinOffers = () => SHOP_COIN_PACKS.map(([coins, price, tag], i) => offer({ id: productId(`coins_${coins}`), kind: 'coins', size: i, title: `${formatCoins(coins)} coins`, sub: 'For trucks and upgrades', price, tag, gives: { coins } }));
  const rankOffers = () => SHOP_RANK_PACKS.map(([ranks, price, tag]) => offer({ id: `rank_up_${ranks}`, kind: 'rank', ranks, title: `+${ranks} rank${s(ranks)}`, sub: fitsRanks(ranks) ? `Straight to rank ${rankAfter(ranks)}` : `Only ${progress.maxRank - progress.rank} rank${s(progress.maxRank - progress.rank)} left to the top`, price, tag, gives: { ranks } }));

  function loadGrants() { try { return JSON.parse(storage?.getItem(GRANTS)) ?? []; } catch (e) { return []; } }
  // gives what the offer holds, once per transaction; returns what changed, or null for a transaction already granted
  function grant(o, transactionId) {
    const grants = loadGrants();
    if (grants.includes(transactionId)) return null;
    const got = { coins: o.gives.coins, ups: [], trucks: [], maps: [] };
    if (got.coins) wallet.add(got.coins);
    got.maps = mapsMissing(o.gives.maps); for (const id of got.maps) maps.grant(id);
    if (o.once) write(ONCE, [...new Set([...onceBought(), o.id])]);
    const xp0 = progress.xp;
    if (o.gives.ranks != null) got.ups = progress.reachRank(rankAfter(o.gives.ranks));
    if (o.gives.trucks.length) got.trucks = progress.grant(o.gives.trucks);
    write(GRANTS, [...grants, transactionId].slice(-500));
    // what this purchase gave, for taking it back if Google refunds it (test purchases are not logged)
    if (!store.test) write(LOG, { ...read(LOG, {}), [transactionId]: { id: o.id, at: Date.now(), coins: got.coins, xp: progress.xp - xp0, trucks: got.trucks, maps: got.maps } });
    return got;
  }
  // a purchase Google refunded or charged back (refunds.js): its coins, XP, trucks and maps are taken back, once.
  // Coins already spent can only go down to zero; a truck already driven is still taken.
  function revoke(transactionId) {
    const log = read(LOG, {}), g = log[transactionId];
    if (!g) return null;
    if (g.coins) wallet.take?.(g.coins);
    if (g.xp) progress.takeXp?.(g.xp);
    if (g.trucks?.length) progress.revoke?.(g.trucks);
    for (const id of g.maps ?? []) maps?.revoke?.(id);
    if (g.id) write(ONCE, onceBought().filter(x => x !== g.id));
    delete log[transactionId]; write(LOG, log);
    return g;
  }
  // the orders a refund check asks Google about: purchases from the last 60 days (Google keeps refunds for 30)
  const refundable = () => Object.entries(read(LOG, {})).filter(([, g]) => Date.now() - (g.at ?? 0) < 60 * 864e5).map(([tx]) => tx);

  // every product the shop sells, for Google Play to register (trucks are kept for good, everything else can be bought again)
  const catalogue = () => [...featured(), ...classes.flatMap(k => truckOffers(k.id)), ...coinOffers(), ...rankOffers()];
  // a tier product stands for the truck that was being bought (remembered at order time), else the first not owned at that tier
  const truckFor = id => {
    const pick = read(ORDERS, {})[id], list = trucks.filter(c => tierId(c) === id);
    return list.find(c => c.id === pick) ?? list.find(c => !progress.owns(c.id)) ?? null;
  };
  const byId = id => {
    if (id.startsWith('truck_tier_')) { const c = truckFor(id); return c && truckOffers(c.class).find(o => o.truck === c.id); }
    return catalogue().find(o => o.id === id);
  };
  // a purchase Google finished later (pending payment, app closed mid-purchase): granted once, like any other
  store.onGrant?.((productId, transactionId) => { const o = byId(productId); if (o) { const got = grant(o, transactionId); if (got) onLateGrant?.(o, got); } });
  // Google Play registers each product once: the truck tiers stand in for every truck
  const products = () => [...new Map(catalogue().map(o => [o.id, o])).values()];
  const ready = store.init?.(products()) ?? Promise.resolve();

  return {
    ready,
    catalogue, products, revoke, refundable,
    tabs: [['featured', 'Featured'], ['trucks', 'Trucks'], ['coins', 'Coins'], ['ranks', 'Ranks']],
    offers(tab, cls = classes[0].id) { return tab === 'trucks' ? truckOffers(cls) : tab === 'coins' ? coinOffers() : tab === 'ranks' ? rankOffers() : featured(); },
    done,
    priceText: o => store.priceText(o),
    test: store.test,
    // how many trucks a bundle still adds (a bundle owned in part)
    newTrucks: o => missing(o.gives.trucks).length,
    async buy(o) {
      if (done(o)) return { ok: false, error: 'Nothing left to give' };
      if (o.kind === 'truck') write(ORDERS, { ...read(ORDERS, {}), [o.id]: o.truck });   // which truck this tier purchase is for
      const res = await store.buy(o);
      if (!res.ok) return res;
      return { ok: true, got: grant(o, res.transactionId) };
    },
    grant,
  };
}
