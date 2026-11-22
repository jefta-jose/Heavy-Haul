// The payment store behind the garage shop: one small interface for the test store today and Google Play (RevenueCat or the
// Play Billing Library, docs/payments-plan.md) later, so the shop never changes when real payments arrive.
//   priceText(product)  the price to show (later: the localized string Google Play returns)
//   buy(product)        resolves { ok, transactionId } or { ok: false, cancelled | pending | error }
// While SHOP_TEST_PURCHASES is on every purchase succeeds at once and nothing is charged.
import { SHOP_TEST_PURCHASES } from '../game-config.js';

export function createStore() {
  let n = 0;
  return {
    test: SHOP_TEST_PURCHASES,
    priceText: product => `$${product.price.toFixed(2)}`,
    async buy() {
      if (!SHOP_TEST_PURCHASES) return { ok: false, error: 'The shop opens soon.' };
      return { ok: true, transactionId: `test-${Date.now().toString(36)}-${(n++).toString(36)}` };
    },
  };
}
