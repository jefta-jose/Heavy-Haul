// The garage shop's catalogue and grants (src/game/shop.js): every purchase gives what it says, once, and a truck bought there
// is owned whatever its rank.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { content } from './helpers.js';
import { createProgress } from '../src/game/progress.js';
import { createShop } from '../src/game/shop.js';
import { RANK_XP, FREE_SEASONS, SEASON_PRICE } from '../src/game-config.js';
import { createSeasonPass } from '../src/game/season-pass.js';

const memory = () => ({ v: {}, getItem(k) { return this.v[k] ?? null; }, setItem(k, v) { this.v[k] = v; } });
function setup() {
  const storage = memory(), progress = createProgress(content.roster.cars, memory()), wallet = { coins: 0, add(n) { this.coins += n; } };
  let n = 0; const store = { test: true, priceText: o => `$${o.price}`, buy: async () => ({ ok: true, transactionId: `t${n++}` }) };
  return { progress, wallet, shop: createShop({ content, progress, wallet, store, storage }) };
}

test('a truck bought in the shop is owned at once, whatever its rank', async () => {
  const { progress, shop } = setup();
  const top = shop.offers('trucks', 'heavy').at(-1);
  assert(progress.rank < progress.unlockRank(top.truck), 'it is far above the player\'s rank');
  assert(!progress.owns(top.truck));
  const res = await shop.buy(top);
  assert(res.ok && progress.owns(top.truck), 'owned and drivable');
  assert(shop.done(top), 'its card now says owned');
  assert.equal((await shop.buy(top)).ok, false, 'not sold twice');
});

test('coins, ranks and bundles give what they say, and a transaction is granted only once', async () => {
  const { progress, wallet, shop } = setup();
  const coins = shop.offers('coins')[2];
  await shop.buy(coins); assert.equal(wallet.coins, coins.gives.coins);
  assert.equal(shop.grant(coins, 't0'), null, 'the same transaction again gives nothing');
  assert.equal(wallet.coins, coins.gives.coins);
  const plus5 = shop.offers('ranks').find(o => o.ranks === 5);
  await shop.buy(plus5); assert.equal(progress.rank, 6); assert.equal(progress.xp, RANK_XP[5]);
  assert.deepEqual(shop.offers('ranks').map(o => o.ranks), [2, 4, 5, 8], 'only +2, +4, +5 and +8');
  assert.deepEqual(shop.offers('ranks').map(o => o.price), [10, 20, 30, 40], '$10, $20, $30 and $40');
  progress.reachRank(34);
  assert(shop.done(shop.offers('ranks').find(o => o.ranks === 8)), 'at rank 34, +8 cannot be bought');
  assert(!shop.done(shop.offers('ranks').find(o => o.ranks === 5)), 'but +5 still can');
  await shop.buy(shop.offers('ranks').find(o => o.ranks === 4)); await shop.buy(shop.offers('ranks').find(o => o.ranks === 2));
  assert.equal(progress.rank, progress.maxRank);
  assert(shop.offers('ranks').every(o => shop.done(o)), 'at the top rank no rank pack is for sale');
  const next = shop.offers('featured').find(o => o.id === 'bundle_next_five');
  const ids = next.gives.trucks; assert.equal(ids.length, content.roster.classes.length, 'one truck from every class');
  await shop.buy(next); assert(ids.every(id => progress.owns(id)));
  const fleet = shop.offers('featured').find(o => o.id === 'bundle_everything');
  await shop.buy(fleet); assert(content.cars.every(c => progress.owns(c.id)), 'the whole fleet');
  assert(shop.offers('featured').filter(o => !o.gives.coins && !o.gives.maps.length && o.id !== 'bundle_everything').every(o => shop.done(o)), 'every truck bundle is owned');
});

test('one-time packs sell once, the map pack opens every paid map, and coin packs give more per dollar as they grow', async () => {
  const owned = new Set(), pass = { ids: ['map-a', 'map-b'], owns: id => owned.has(id), grant: id => owned.add(id) };
  const storage = { s: {}, getItem(k) { return this.s[k] ?? null; }, setItem(k, v) { this.s[k] = v; } };
  let n = 0; const fakeStore = { test: true, priceText: o => `$${o.price}`, buy: async () => ({ ok: true, transactionId: `x${n++}` }) };
  const coins = { n: 0, add(c) { this.n += c; }, spend() { return false; }, get coins() { return this.n; } };
  const progress = createProgress(content.roster.cars, { v: null, getItem() { return this.v; }, setItem(k, v) { this.v = v; } });
  const shop = createShop({ content, progress, wallet: coins, store: fakeStore, storage, maps: pass });
  const find = id => shop.offers('featured').find(o => o.id === id);
  const rookie = find('bundle_rookie');
  assert(rookie.price < 1 && rookie.gives.coins > 0 && rookie.gives.trucks.length === 1, 'a cheap rookie pack: coins and a Scout');
  assert((await shop.buy(rookie)).ok); assert(progress.owns(rookie.gives.trucks[0]));
  assert(shop.done(find('bundle_rookie')), 'and only once');
  const starter = find('bundle_starter');
  await shop.buy(starter); assert(shop.done(find('bundle_starter')), 'the starter boost is once only too');
  await shop.buy(find('bundle_all_maps'));
  assert(owned.has('map-a') && owned.has('map-b') && shop.done(find('bundle_all_maps')), 'every map, then nothing left to sell');
  const packs = shop.offers('coins'), perDollar = packs.map(o => o.gives.coins / o.price);
  assert(perDollar.every((v, i) => i === 0 || v > perDollar[i - 1]), 'each bigger coin pack is better value');
  assert(starter.gives.coins / starter.price > perDollar.at(-1), 'the one-time starter boost beats every coin pack');
  for (const o of [...packs, ...shop.offers('featured')]) assert([0.99, 1.99, 2.99, 4.99, 9.99, 12.99, 14.99, 19.99, 49.99].includes(o.price), `${o.id} uses a standard price point: ${o.price}`);
});

test('every product id is one Google Play accepts, and none repeats', () => {
  const { shop } = setup();
  const ids = [...shop.offers('featured'), ...shop.offers('coins'), ...shop.offers('ranks'), ...content.roster.classes.flatMap(k => shop.offers('trucks', k.id))].map(o => o.id);
  for (const id of ids) assert.match(id, /^[a-z0-9][a-z0-9_.]*$/, id);
  assert.equal(new Set(ids).size, ids.length);
});

test('two maps are free and every other one is bought once for 100K coins', () => {
  const dir = 'assets/seasons', playable = fs.readdirSync(dir).filter(id => fs.existsSync(`${dir}/${id}/season.json`) && JSON.parse(fs.readFileSync(`${dir}/${id}/season.json`, 'utf8')).status === 'playable'), store = memory();
  const pass = createSeasonPass(store), wallet = { coins: 150000, spend(n) { if (this.coins < n) return false; this.coins -= n; return true; } };
  assert.equal(FREE_SEASONS.length, 2); assert.equal(SEASON_PRICE, 100000);
  for (const id of FREE_SEASONS) assert(playable.includes(id) && pass.owns(id) && pass.price(id) === 0, `${id} is free`);
  const paid = playable.filter(id => !FREE_SEASONS.includes(id));
  assert(paid.length && paid.every(id => !pass.owns(id) && pass.price(id) === 100000), 'the rest cost 100K');
  assert(pass.buy(paid[0], wallet)); assert.equal(wallet.coins, 50000); assert(pass.owns(paid[0]));
  assert.equal(pass.buy(paid[0], wallet), false, 'not twice'); assert.equal(pass.buy(paid[1], wallet), false, 'not without the coins');
  assert(createSeasonPass(store).owns(paid[0]), 'saved');
});

test('Google Play Games: signs in at start-up, a decline leaves a guest who can sign in later, and no plugin means a guest', async () => {
  const { createAccount } = await import('../src/game/account.js');
  globalThis.localStorage ??= { s: {}, getItem(k) { return this.s[k] ?? null; }, setItem(k, v) { this.s[k] = v; }, removeItem(k) { delete this.s[k]; } };
  let accept = false;
  const plugin = { status: async () => ({ available: true, signedIn: false }), signIn: async () => accept ? { available: true, signedIn: true, playerId: 'p1', displayName: 'Driver' } : { available: true, signedIn: false } };
  const a = createAccount(plugin), seen = [];
  a.onChange(p => seen.push(p?.name ?? null));
  assert.equal(await a.init(), null, 'declined at start-up');
  assert(a.available && !a.player);
  accept = true;
  assert.deepEqual(await a.signIn(), { id: 'p1', name: 'Driver' }, 'signs in from the chip');
  assert.equal(seen.at(-1), 'Driver');
  const guest = createAccount(null);
  assert.equal(await guest.init(), null); assert.equal(guest.available, false, 'a browser has no account');
});

test('Google Play Billing: a purchase is granted once Google approves it, a cancel grants nothing, and one finished later still arrives', async () => {
  const listeners = {}, products = new Map(), finished = [], owned = new Set(['truck_old']);
  globalThis.localStorage ??= { s: {}, getItem(k) { return this.s[k] ?? null; }, setItem(k, v) { this.s[k] = v; }, removeItem(k) { delete this.s[k]; } };
  let next = null;
  const when = { approved(f) { listeners.approved = f; return when; }, verified(f) { listeners.verified = f; return when; }, unverified(f) { return when; }, pending(f) { return when; } };
  globalThis.window = { Capacitor: { isNativePlatform: () => true }, CdvPurchase: {
    ProductType: { CONSUMABLE: 'consumable', NON_CONSUMABLE: 'non consumable' }, Platform: { GOOGLE_PLAY: 'android-playstore' }, ErrorCode: { PAYMENT_CANCELLED: 6777006 }, LogLevel: { WARNING: 1 },
    store: {
      register(list) { for (const p of list) products.set(p.id, { ...p, pricing: { price: 'KES 390' }, getOffer: () => ({ order: async () => next(p.id) }) }); },
      when: () => when, initialize: async () => [], get: id => products.get(id), owned: id => owned.has(id),
    } } };
  const { createPlayStore, playBillingAvailable } = await import('../src/game/store-play.js');
  assert(playBillingAvailable());
  const store = createPlayStore(), late = [];
  store.onGrant((id, tx) => late.push([id, tx]));
  await store.init([{ id: 'coins_50000', kind: 'coins', price: 0.99 }, { id: 'truck_x', kind: 'truck', price: 2.99 }, { id: 'truck_old', kind: 'truck', price: 2.99 }]);
  assert.deepEqual(late, [['truck_old', 'owned:truck_old']], 'a truck this Google account already owns comes back at start-up (reinstall, new phone)');
  late.length = 0;
  const install = window.CdvPurchase.store.applicationUsername();
  assert(/^[0-9a-f]{32}$/.test(install) && install === window.CdvPurchase.store.applicationUsername(), 'every order carries this install\'s own random id');
  assert.equal(products.get('truck_x').type, 'non consumable', 'a truck is kept for good');
  assert.equal(store.priceText({ id: 'coins_50000', price: 0.99 }), 'KES 390', "Google Play's local price");
  const approve = (id, txId) => listeners.approved({ products: [{ id }], transactionId: txId, finish: () => finished.push(txId) });
  next = id => { setTimeout(() => approve(id, 'GPA.1')); return undefined; };
  assert.deepEqual(await store.buy({ id: 'coins_50000' }), { ok: true, transactionId: 'GPA.1' });
  assert.deepEqual(finished, ['GPA.1'], 'consumed or acknowledged with Google');
  next = async () => ({ code: 6777006 });
  assert.deepEqual(await store.buy({ id: 'coins_50000' }), { ok: false, cancelled: true });
  approve('truck_x', 'GPA.2');
  assert.deepEqual(late, [['truck_x', 'GPA.2']], 'a purchase from before a restart is handed to the shop');
  owned.add('truck_x'); next = async () => ({ code: 6777003 });
  assert.deepEqual(await store.buy({ id: 'truck_x', kind: 'truck' }), { ok: true, transactionId: 'owned:truck_x' }, 'buying a truck Google already counts as owned gives it, nothing charged');
  next = id => new Promise(() => {});
  const first = store.buy({ id: 'coins_50000' });
  assert.equal((await store.buy({ id: 'coins_50000' })).ok, false, 'a second tap while the first purchase is open starts nothing');
  void first;
  delete globalThis.window;
});

test('reminders: asked in the game first, Not now respected with one more ask later, then fresh random messages each time the game is left', async () => {
  const { createNotifications } = await import('../src/game/notifications.js');
  globalThis.localStorage ??= { s: {}, getItem(k) { return this.s[k] ?? null; }, setItem(k, v) { this.s[k] = v; }, removeItem(k) { delete this.s[k]; } };
  localStorage.removeItem('hh_notify');
  const data = JSON.parse(fs.readFileSync(new URL('../assets/notifications/messages.json', import.meta.url)));
  let granted = 'prompt', pending = [], prompts = 0, t = Date.parse('2026-12-01T10:00:00');
  const plugin = {
    requestPermissions: async () => { prompts++; granted = 'granted'; return { display: granted }; },
    checkPermissions: async () => ({ display: granted }),
    getPending: async () => ({ notifications: pending }), cancel: async ({ notifications }) => { pending = pending.filter(p => !notifications.some(n => n.id === p.id)); },
    createChannel: async () => {}, schedule: async ({ notifications }) => { pending.push(...notifications); return { notifications }; },
  };
  const n = createNotifications({ data, plugin, context: () => ({ truck: 'Ridge Pup', map: 'Blackwater Swamp' }), now: () => t });
  assert(n.shouldAsk(), 'asks the first time');
  assert.equal(await n.answered(false), false); assert.equal(prompts, 0, 'Not now never shows Android\'s prompt');
  assert(!n.shouldAsk(), 'and does not ask again straight away');
  t += 4 * 864e5; assert(n.shouldAsk(), 'one more ask a few days later');
  assert.equal(await n.answered(true), true); assert.equal(prompts, 1);
  assert.equal(pending.length, 3, 'three reminders scheduled');
  for (const p of pending) {
    const h = p.schedule.at.getHours();
    assert(h >= 17 && h < 20 && p.schedule.isExactNotification === false, 'early evening, inexact');
    assert(!/\{/.test(p.title + p.body), `filled in: ${p.body}`);
  }
  assert.equal(new Set(pending.map(p => p.body)).size, 3, 'three different messages');
  await n.schedule(); assert.equal(pending.length, 3, 'leaving again replaces them, never piles up');
  assert(!n.shouldAsk(), 'never asked again once allowed');
  const off = createNotifications({ data, plugin: null }); assert.equal(off.shouldAsk(), false, 'no asking in a browser'); assert.equal(await off.schedule(), 0);
});
