# Bug log

Pre-release sweep before adding ads and Google Play payments (2026-11-19).

## Fixed

| # | Bug | Cause | Fix |
|---|-----|-------|-----|
| 1 | Coins and XP lost after pause → garage → reopen | Rewards were written only every 2 s while driving; pause, garage, restart and closing the app did not write. Saves also floored fractions, so every reload lost up to one coin and one XP. | `session.persist()` on pause, garage, restart, fail, delivery, `visibilitychange` (hidden) and `pagehide`; wallet and progress store fractions (`src/game/session.js`, `wallet.js`, `progress.js`, `main.js`). |
| 2 | A contract from one map stays active on another (four cameras on a three-camera map) | Contracts are sized to the trail, but a map switch kept the chosen one. A map picked in the garage only loads at PLAY, so offers were drawn for the old trail. | Contracts record their `map`. Picking a map draws offers for that map straight away. Each map keeps its own offers and chosen contract, so browsing maps never loses one. A saved contract that does not fit the trail (camera or bog count, checkpoint) is dropped (`missions.mapChanged`, `src/main.js` `missionSeason`). |
| 3 | Run clock runs behind the "Tap to continue" screen | `goRun()` set state `play` before the loader lifted. | While the drive loader covers the screen, the truck settles and the starter cranks, but the clock, rewards, cameras and pedals wait (`frame()` in `src/main.js`). |
| 4 | Lifting one of two fingers releases the gas | Each pedal tracked a single `pointerId`. | Each pedal tracks every pointer and uses the deepest one (`src/game/input.js`). |
| 5 | Keys or pedals stay held after switching apps mid-press (found in sweep) | A missed `keyup` or `pointerup` while the window was blurred. | `blur` releases keys and both pedals. |
| 6 | PLAY or the garage could freeze for good if anything threw while loading (found in sweep) | `loading` was only reset on the happy path. | `driveOff` and `backToGarage` always reset it and lift the loader. |

Tests: `tests/audio.test.js` (two fingers, blur) and `tests/tuning.test.js` (map switch, misfit saves). An end-to-end probe replayed all four
reported repros in the built app; all pass.

## Open: worth fixing before payments

- **The economy is plain `localStorage`** (`hh_wallet`, `hh_progress`): anyone can edit it. That is fine for coins earned in play, but anything bought
  with real money (coin packs, ad removal) needs Play Billing purchase tokens checked and acknowledged. Restore entitlements from Play
  (`queryPurchases`), not from local storage, or clearing app data loses a paid ad removal.
- **Buying a truck is two writes** (`wallet.spend` then `progress` owned list). If the app is killed between them, the coins are gone and no truck is
  owned. Selling has the same gap (refund, then tuning cleared). Save the wallet, owned list and tuning as one record, or add a recovery step,
  before coins can be bought.
- **Sell and upgrade refunds use today's prices**, not what was paid (`sellValue`, `tuneReset` in `src/game/garage.js`). After `npm run rebalance`
  changes prices in an update, players gain or lose coins on resale. Store the price paid per truck if that matters.
- **Rewarded ads will need a run-safe hook:** `canProgress()` blocks earning while towed or driving a service truck. A "watch an ad for double pay"
  should credit through `wallet.add` + `session.persist()` and never through `api.earn`, or a towed finish pays nothing.

## Open: pre-existing test failures (balance, left for the user)

`npm test`: 166 pass, 3 fail, 1 skip. These failures were there before this sweep, and balance is set by formula (`CLASS_LADDER`), so they were
not tuned here:

- `vehicle.test.js:51` brisk take-off: expects about 15 km/h after 2 s, gets 21.2.
- `vehicle.test.js:68` AWD/DIFF in deep mud: "stuck without AWD or DIFF" travels 50.9 m (the test's start spot now sits on a highway).
- `vehicle.test.js:147` service truck strongest in class: Bog Wrecker out-pulled by the Icefield Ram.

`npm run test:route` passes, and `npm run test:browser` passes 5/5.
