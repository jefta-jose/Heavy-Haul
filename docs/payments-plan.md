# Plan: Google Play payments

How to add in-app purchases to the Android app (`com.heavyhaul.game`, Capacitor, `android/`). This is a plan to follow when payments are
scheduled. Nothing here is built yet. Read [bug-log.md](bug-log.md) ("Open: worth fixing before payments") and
[google-play-release.md](google-play-release.md) first.

## 1. What we sell

**Update 2026-11-22:** the shop is built (`src/game/shop.js`, the SHOP sheet in the garage) and sells more than coins, by the user's
decision: coin packs, rank packs, single trucks (owned whatever their rank) and bundles. Its catalogue and placeholder prices are
`SHOP_*` in `src/game-config.js`, and product ids come from `shop.offers()` (Play-safe, unique, checked by `tests/shop.test.js`). Purchases
go through `src/game/store.js`, a test store that grants at once while `SHOP_TEST_PURCHASES` is true; wiring real payments means
replacing that store's `buy()` and `priceText()` and setting the flag false. Grants are already idempotent per transaction id
(`hh_grants`). Single trucks are one product each (about 270), so consider grouping them into a few price-tier products if that is
too many for Play Console. The table below is the original coins-only starting point.

Starting point; the user decides the final list and prices.

| Product | Type | Gives | Notes |
|---|---|---|---|
| `coins_small` / `coins_medium` / `coins_large` / `coins_huge` | Consumable | Coins (amounts in `src/game-config.js`) | Bigger packs give more coins per dollar. |
| `remove_ads` | Non-consumable | No interstitial ads, ever | Rewarded ads stay available, as the player's choice. Restored on reinstall. |
| `starter_pack` (optional) | Non-consumable, one per player | Coins plus one rank-2 truck of the player's choice | Shown only in the first days or until rank 3. |

Rules:
- (Superseded on 2026-11-22: ranks and trucks are sold too.) No exclusive trucks: Every truck stays reachable by playing, so the free game is complete and balance by
  formula (`CLASS_LADDER`) still holds.
- The store shows the prices Google Play returns (localized, with tax). Never hard-code a price string.
- Product IDs and coin amounts live in `src/game-config.js` (`STORE_PRODUCTS`), one per line, like every other tuning number.
- The one-file web build and the browser have no store: the shop hides itself unless `window.Capacitor?.isNativePlatform?.()` is true.

## 2. Approach

**Recommended: RevenueCat (`@revenuecat/purchases-capacitor`).** It wraps the Play Billing Library, checks every purchase with Google on its
servers, acknowledges and consumes purchases, restores them, and reports refunds. There is no backend for us to run, and it is free below a revenue
threshold (check current pricing). It also covers iOS later.

**Alternative: our own verification.** Use a Capacitor billing plugin (`cordova-plugin-purchase` / CdvPurchase, or a small custom plugin around the
Play Billing Library) plus a small server, such as a Cloud Function, that verifies each purchase token with the Google Play Developer API
(`purchases.products.get`) using the service account from the release setup. Choose this only to avoid a third party. It means running and
securing a server.

Do not ship client-only validation. A rooted device can fake it, and Google refunds purchases that are not acknowledged within 3 days.

Whichever is chosen, keep the Play Billing Library at the version Google Play currently requires (check its deprecation timeline before each
release).

## 3. Fix first (prerequisites from the bug log)

1. **One save record for the economy.** Replace the separate `hh_wallet` and `hh_progress` keys, and the purchase part of `hh_tuning_levels`, with one
   `hh_ledger` record: `{ v, coins, xp, owned, tuning, powers, grants }`. Every change is written in one `setItem`, so buying, selling or a store grant can
   never half-apply. `src/game/ledger.js` owns it. `wallet.js` and `progress.js` become thin views over it. Migrate the old keys once on first load, then
   delete them.
2. **Store the price paid** per truck in `owned` (`{ id, paid }`), so selling refunds what was spent and a rebalance never changes it.
3. **Grants are idempotent.** `grants` records each purchase's order/transaction id. Granting the same purchase twice (app killed and reopened,
   restore run twice) is a no-op.

## 4. Code layout

```
src/game/ledger.js      one save record (coins, xp, owned, tuning, powers, grants), atomic writes, migration
src/game/store.js       platform-neutral store: products(), buy(id), restore(), onGrant(fn); a no-op stub off-device
src/game/store-rc.js    RevenueCat adapter (or store-play.js for our own plugin + server)
src/game/shop.js        the coin shop sheet in the garage
src/game-config.js      STORE_PRODUCTS: id, type, coins, display order
```

`store.js` interface:
- `init()`: configure the SDK with the public Android API key (it is public, not a secret). Then process any purchases left unfinished, for example
  an app killed mid-purchase.
- `products()`: id, localized title, price string and type, from Play. An empty list hides the shop.
- `buy(id)`: starts Google's purchase sheet and resolves `{ ok, cancelled, pending, error }`. "Pending" purchases (slow payment methods) are
  granted later through `onGrant`, never at once.
- `restore()`: re-reads owned non-consumables (`remove_ads`, `starter_pack`). Runs at launch and from a "Restore purchases" button.
- `onGrant(fn)`: called once per verified purchase, with `{ productId, transactionId }`.

Grant flow, always in this order:
1. Verified purchase arrives.
2. `ledger.grant(transactionId, () => { coins += pack.coins })`: one atomic write, skipped if `transactionId` is already in `grants`.
3. Tell the SDK the purchase is finished (consume for coins, acknowledge for non-consumables). RevenueCat does this itself.
4. Garage refreshes coins, plays `ui-buy`, shows a short "+N coins" toast.

If the app dies between 2 and 3, the purchase comes back at the next `init()`, and step 2 skips it because the id is already recorded.

## 5. Garage UI

The garage layout is settled (commit 1c8adbb, CLAUDE.md). **Do not add a bottom-bar button or restyle anything without the user's
approval and references.** Proposed entry points that leave the layout alone:
- Tapping the coin box in the centred top bar opens the shop as a card over the garage (`sheet('shop')`, like UPGRADE and MISSIONS).
- When BUY or an upgrade fails for lack of coins (the current `shake`), also offer "Get coins".
- The pause menu has nothing to buy, and nothing to buy shows during a run.

The shop card lists the packs, each with its coin amount, a coin icon and the Play price. Below them: "Remove ads" (shows "Owned" once bought),
"Restore purchases", and a small line linking the privacy policy. Test it at 1440×810, 844×390, 667×320 and 390×844.

States to handle: loading products, store unavailable (offline or no Play account) shown as one quiet line, cancelled (no message),
pending ("Waiting for payment"), error (Google's message, short), success (toast).

## 6. Ads interplay

- `remove_ads` is an entitlement checked through `store.owns('remove_ads')`, cached in the ledger for offline launches but always refreshed from
  `restore()`.
- A rewarded "double pay" credits through `ledger` directly, not `session.earn`, because `canProgress()` blocks earning while towed (see bug log).
- If the game is enrolled in Designed for Families, both ads and purchases have extra rules (certified ad SDKs only, no misleading purchase
  prompts). Decide the target audience in Play Console before building either.

## 7. Play Console setup (user does this; it needs their accounts)

1. Set up a payments (merchant) profile, tax and bank details in Play Console.
2. Add the billing permission: the RevenueCat or billing plugin adds `com.android.vending.BILLING` to the manifest. Upload one AAB containing it
   to the internal track, or Play will not allow creating products.
3. Create the products in **Monetize → Products → In-app products** with the exact IDs from `STORE_PRODUCTS`. Set prices; Play converts them per
   country.
4. RevenueCat route: create the project and the Android app, link it with the Play service account (RevenueCat's guide lists the roles), import the
   products, and create an offering and an entitlement `no_ads`. Put the **public** Android SDK key in `src/game-config.js` (or a build env var).
   No secret goes in the repo.
5. Add the license testers (their Google accounts) in **Setup → License testing**. They buy with test cards and are never charged.
6. Update the store listing ("Contains in-app purchases" is shown automatically), the **Data safety** form and the privacy policy for purchase
   data.

## 8. Testing

- Unit (`tests/`): ledger atomic writes and migration from the old keys; `grant` is idempotent; refunds on sell use `paid`; the store stub
  hides the shop off-device.
- Browser (`tests/browser.test.js`): with a fake store adapter injected, coin box → shop opens, buying a pack adds coins once, a duplicate grant
  is ignored, a reload keeps everything, and layouts fit at the four viewport sizes.
- On device (internal track, license tester):
  - Buy each pack and check the coins arrive.
  - Kill the app during the purchase sheet, reopen, and check the coins arrive exactly once.
  - Buy with the "slow test card": the purchase shows as pending, then is granted.
  - Cancel: nothing changes.
  - Airplane mode: the shop says it is unavailable and nothing breaks.
  - Buy `remove_ads`, clear app data, reinstall, Restore: ads stay off.
  - Refund a test order in Play Console and check what RevenueCat reports. Coins already spent are not clawed back; decide if that is acceptable.
- Run `npm run check` before calling it done.

## 9. Release gate

Extend `npm run check:release` (run by the Google Play workflow) to also fail when:
- `STORE_PRODUCTS` is missing, has duplicate IDs, or still contains Google's static test IDs (`android.test.*`);
- the RevenueCat key is a sandbox or debug key, or is empty;
- the starting values are not rank 1 and 20,000 coins (already checked).

## 10. Order of work

1. Ledger, price paid, and idempotent grants (section 3), with tests. Useful even without payments.
2. `store.js` stub plus the shop card behind the native check. Get the user's approval of the shop entry point.
3. Play Console setup and an internal-track AAB with the billing permission (user).
4. RevenueCat adapter and products; on-device tests with license testers.
5. `remove_ads` with the ads work; restore flow.
6. Release-gate checks, Data safety and privacy policy, then a staged production rollout (start at a small percentage).
