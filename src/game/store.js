// The payment store behind the garage shop: one small interface, so the shop never changes with the store behind it.
//   priceText(product)  the price to show (Google Play's localized string in the app)
//   buy(product)        resolves { ok, transactionId } or { ok: false, cancelled | pending | error }
//   init(products)      registers what the shop sells (Google Play only)
//   onGrant(fn)         purchases that finish later: fn(productId, transactionId)
// While SHOP_TEST_PURCHASES is on every purchase succeeds at once and nothing is charged. With it off, the Android app
// sells through Google Play Billing (store-play.js); a browser build has no store and says so.
import { SHOP_TEST_PURCHASES } from '../game-config.js';
import { createPlayStore, playBillingAvailable } from './store-play.js';

export function createStore() {
  if (!SHOP_TEST_PURCHASES) {
    if (playBillingAvailable()) return createPlayStore();
    return { test: false, init: async () => {}, onGrant() {}, priceText: product => `$${product.price.toFixed(2)}`, buy: async () => ({ ok: false, error: 'Purchases work in the Android app from Google Play.' }) };
  }
  return createTestStore();
}

function createTestStore() {
  let n = 0;
  return {
    test: SHOP_TEST_PURCHASES,
    init: async () => {}, onGrant() {},
    priceText: product => `$${product.price.toFixed(2)}`,
    async buy() {
      if (!SHOP_TEST_PURCHASES) return { ok: false, error: 'The shop opens soon.' };
      return { ok: true, transactionId: `test-${Date.now().toString(36)}-${(n++).toString(36)}` };
    },
  };
}
