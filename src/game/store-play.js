// Google Play Billing for the garage shop, through cordova-plugin-purchase (CdvPurchase, Play Billing Library 9) in the
// Android app. Same interface as the test store in store.js: priceText(product), buy(product), plus init(products) and
// onGrant(fn) for purchases that finish later (a slow payment method, or the app closed mid-purchase).
//
// Flow, per Google's rules:
//   1. order: Google's purchase sheet opens; cancelling resolves { ok: false, cancelled: true }.
//   2. approved: with PLAY_VERIFY_URL set, the purchase token is sent to our verifier (functions/verify-purchase, which
//      asks the Google Play Developer API) and only a verified purchase is granted; without one it is granted on the
//      device (fine for internal testing, not for production: see report.md).
//   3. grant once per transaction id (shop.js keeps them in hh_grants), then finish(): Google consumes a consumable
//      (coins, ranks, bundles) so it can be bought again, and acknowledges a truck (kept, restored on reinstall).
//      A purchase that is never acknowledged is refunded by Google after three days.
//   4. trucks bought with money come back: at start-up every truck Google says this account owns is granted again (a
//      reinstall, a new phone), and buying one Google already counts as owned gives it instead of failing.
// Abuse: every order carries this install's id (Google keeps it obfuscated with the purchase); the verifier refuses a
// purchase token presented by another install, and a coin pack's token once it has been consumed, so a copied token pays nothing.
import { PLAY_VERIFY_URL } from '../game-config.js';

// a random id for this install, sent (obfuscated) with every order; never the player's name or email
function installId() {
  try {
    let id = localStorage.getItem('hh_install');
    if (!id) { id = Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join(''); localStorage.setItem('hh_install', id); }
    return id;
  } catch (e) { return undefined; }
}

export function playBillingAvailable() {
  return typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform?.() && !!window.CdvPurchase?.store;
}

export function createPlayStore() {
  const { store, ProductType, Platform, ErrorCode, LogLevel } = window.CdvPurchase;
  const waiting = new Map();   // product id -> resolve() of the buy() in progress
  let grantLater = null, ready = null;
  const fallback = product => `$${Number(product.price ?? 0).toFixed(2)}`;

  // a purchase Google approved: given to the buy() waiting for it, or to onGrant when nothing waits (finished later)
  function deliver(productId, transactionId) {
    const resolve = waiting.get(productId);
    if (resolve) { waiting.delete(productId); resolve({ ok: true, transactionId }); return; }
    grantLater?.(productId, transactionId);
  }

  return {
    test: false,
    // register every product the shop sells, then connect to Google Play; safe to call once at start-up
    init(products) {
      ready ??= (async () => {
        store.verbosity = LogLevel.WARNING;
        if (PLAY_VERIFY_URL) store.validator = PLAY_VERIFY_URL;
        store.applicationUsername = installId;
        store.register(products.map(p => ({ id: p.id, type: p.kind === 'truck' ? ProductType.NON_CONSUMABLE : ProductType.CONSUMABLE, platform: Platform.GOOGLE_PLAY })));
        store.when()
          .approved(tx => {
            if (PLAY_VERIFY_URL) { tx.verify(); return; }
            for (const p of tx.products) deliver(p.id, tx.transactionId);
            tx.finish();
          })
          .verified(receipt => {
            for (const tx of receipt.sourceReceipt?.transactions ?? []) for (const p of tx.products) deliver(p.id, tx.transactionId);
            receipt.finish();
          })
          .unverified(result => {
            const id = result?.receipt?.transactions?.[0]?.products?.[0]?.id, resolve = id && waiting.get(id);
            if (resolve) { waiting.delete(id); resolve({ ok: false, pending: true, error: 'Google Play has not confirmed this purchase yet. If you were charged, it arrives by itself once confirmed; nothing is charged twice.' }); }
          })
          .pending(tx => {
            for (const p of tx.products) { const resolve = waiting.get(p.id); if (resolve) { waiting.delete(p.id); resolve({ ok: false, pending: true, error: 'Payment pending: it arrives when Google Play confirms it.' }); } }
          });
        const errors = await store.initialize([Platform.GOOGLE_PLAY]);
        if (errors?.length) console.warn('Google Play Billing:', errors.map(e => e.message).join('; '));
        // trucks this Google account already owns (bought before a reinstall or on another phone) come back
        for (const p of products) if (p.kind === 'truck' && store.owned(p.id)) deliver(p.id, `owned:${p.id}`);
      })();
      return ready;
    },
    onGrant(fn) { grantLater = fn; },
    priceText: product => store.get(product.id, Platform.GOOGLE_PLAY)?.pricing?.price ?? fallback(product),
    async buy(product) {
      await ready;
      const item = store.get(product.id, Platform.GOOGLE_PLAY), offer = item?.getOffer();
      if (!offer) return { ok: false, error: 'This item is not on sale in Google Play yet.' };
      if (waiting.has(product.id)) return { ok: false, error: 'This purchase is already in progress.' };
      return new Promise(resolve => {
        waiting.set(product.id, resolve);
        offer.order().then(error => {
          if (!error || !waiting.has(product.id)) return;
          waiting.delete(product.id);
          // Google says it is already owned (a truck bought before): give it, nothing is charged
          if (product.kind === 'truck' && store.owned(product.id)) { resolve({ ok: true, transactionId: `owned:${product.id}` }); return; }
          resolve(error.code === ErrorCode.PAYMENT_CANCELLED ? { ok: false, cancelled: true } : { ok: false, error: error.message || 'The purchase did not go through.' });
        });
      });
    },
  };
}
