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
  assert(shop.offers('featured').filter(o => o.id !== 'bundle_starter' && o.id !== 'bundle_everything').every(o => shop.done(o)), 'every truck bundle is owned');
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
  const listeners = {}, products = new Map(), finished = [];
  let next = null;
  const when = { approved(f) { listeners.approved = f; return when; }, verified(f) { listeners.verified = f; return when; }, unverified(f) { return when; }, pending(f) { return when; } };
  globalThis.window = { Capacitor: { isNativePlatform: () => true }, CdvPurchase: {
    ProductType: { CONSUMABLE: 'consumable', NON_CONSUMABLE: 'non consumable' }, Platform: { GOOGLE_PLAY: 'android-playstore' }, ErrorCode: { PAYMENT_CANCELLED: 6777006 }, LogLevel: { WARNING: 1 },
    store: {
      register(list) { for (const p of list) products.set(p.id, { ...p, pricing: { price: 'KES 390' }, getOffer: () => ({ order: async () => next(p.id) }) }); },
      when: () => when, initialize: async () => [], get: id => products.get(id),
    } } };
  const { createPlayStore, playBillingAvailable } = await import('../src/game/store-play.js');
  assert(playBillingAvailable());
  const store = createPlayStore(), late = [];
  store.onGrant((id, tx) => late.push([id, tx]));
  await store.init([{ id: 'coins_50000', kind: 'coins', price: 0.99 }, { id: 'truck_x', kind: 'truck', price: 2.99 }]);
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
  delete globalThis.window;
});
