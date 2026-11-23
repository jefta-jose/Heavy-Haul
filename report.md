# Overnight report (2026-11-24)

Everything below is pushed to `main`. One thing could not be checked here: this machine has no Android SDK, so the new
Android pieces (asset pack, billing plugin, Play Games sign-in, new icons) have not been compiled. GitHub builds the test APK
on every push (`android.yml`). Check that run first: if it fails, the log will name the file.

## What changed

| # | Item | Result |
|---|---|---|
| 1 | Revert car sounds, keep season sounds | Done. The load groups, landing thump, chickens, timber, bulk and the per-truck pitch are gone, with their clips and 16 recordings. Every map's ambience, thunder and Cinder Caldera stay. |
| 2 | Delete Interior Express 19 and other trucks with unrealistic front wheels | Done, 3 trucks deleted, 269 left, `npm run rebalance` re-spread ranks and prices. See "Wheels" below. |
| 3 | Cooler missions covering all trucks and maps | Done. Featured story contracts on every map, and a signature haul for every truck. See below. |
| 4 | Sweep the whole game | Done. Fixes listed below. |
| 5 | Google payments and sign-in, Google only | Done in code, not yet switched on (needs Play Console setup, steps below). |
| 6 | Remote asset storage | Dropped at your request. The assets stay in the app, but the app was too big for Play, see "Size". |
| 7 | Phone garage HUD | Smaller-icon HUD (not a full page). The bottom bar is a centred row of compact tiles, with one wide PLAY. |
| 8 | Your logo | Used as it is, the full square image with no cuts: the Android launcher icon (round icon in a circle), the garage top-bar logo, the Play Store 512 px icon, and the 1024×500 feature graphic (the full image centred on a blurred copy of itself, because Google requires that size). Master in `assets/brand/heavy-haul-logo.png`. |
| 9 | Deployment workflow | `google-play.yml` updated: asset pack, a bundle-size check, a production payments gate, and the Play Games id. |

### Wheels
I drew where the game puts every tyre over each truck's painted wheels (all 269, on contact sheets) and measured the gap.
- **Interior Express 19:** I couldn't find a visible defect: its game tyres sit on its painted ones, and its front overhang is
  normal (1.15 tyre widths, median 0.89). I deleted it as you asked. If what you saw happens while driving (for example on a
  crest), tell me where and I'll look at that.
- **Mesa Coyote 8 and Pine Badger 9:** deleted. They were the only two trucks clearly off: their tyres are drawn 22–27% of a
  radius too low or too large for their arches.
- **All the others:** no truck has a wheel misplaced forwards or backwards (every horizontal offset is under 0.1 of a radius).

### Missions
- **Featured contracts:** every map has two hand-written contracts, each with a client, a story and themed rules (for example
  "Before the Flood" on Monsoon Canopy). One is always on offer for the chosen map, paying 1.5× XP plus 6K–14K coins.
- **Signature hauls:** every truck has a job of its own on a home map: its own load, for a named client, with a one-line story.
  - Homes follow what the truck carries and its biomes: logs go to Copper Ridge, ore and rock to Slatecut Quarry, and so on.
  - All 269 trucks are spread over all 8 maps (28–43 each). Free starters always land on free maps.
  - The first completion pays 5K–60K coins, depending on the truck's price.
  - The Missions card says where the chosen truck's haul is and counts how many are done ("0 of 269").
- **Data:** contracts and stories are in `assets/missions/missions.json` (`featured`, `signature`). Edit them there, no code needed.

### Sweep: found and fixed
- **App too big for Google Play:** the packaged game is 283 MB, and a bundle's base module is capped at 200 MB, so the next
  upload would have been rejected. Fixed with Play Asset Delivery: see "Size".
- **Missions card:** too narrow on desktop, stories ran under the CHOOSE label, notes landed in odd grid cells, and it was cut
  off on short phones. It's now two columns, wraps, and scrolls.
- **Bog contracts:** they still said "without being towed", left over from the removed tow trucks.
- **Phone garage HUD:** stretched bars. Now compact.
- **No page errors** came up on any garage page or while driving, at 1440×810, 844×390, 667×320 and 390×844 (`node tools/shots.mjs pages`).

Not changed:
- A few loading-screen photos show tow or breakdown trucks, which the game no longer has. Swap them in `assets/loaders` if they bother you.
- Some loading-screen facts name real trucks (Volvo FH16, BelAZ). They're trivia, not art.

## Size (Google Play)
- **Base module, about 38 MB:** the app keeps code, HUD, audio and loader photos.
- **`gamedata` asset pack, about 245 MB:** an install-time asset pack. Google Play installs it together with the app, so
  players download one thing and the game reads the files exactly as before.
- **How it's built:** the release workflow runs `tools/android-asset-pack.mjs` after `cap sync`, and builds with
  `HAUL_ASSET_PACK=1`, which switches the pack on in Gradle. Test APKs (`android.yml`) are unchanged and carry everything.
- **Guard:** the workflow fails with the module sizes if the base ever creeps over 195 MB.

## Payments and sign-in (Google only)
- **Billing:** `cordova-plugin-purchase` 13.20.0 (Google Play Billing Library 9), wrapped in `src/game/store-play.js` behind
  the shop's existing interface.
  - Trucks are non-consumable (kept, restored on reinstall); coins, ranks and bundles are consumable.
  - Every purchase is granted once and then finished, as Google requires: unfinished purchases are refunded after 3 days.
  - Pending payments and purchases interrupted by closing the app arrive later.
- **Verifier:** `functions/verify-purchase` is a Google Cloud Function that asks the Google Play Developer API whether each
  purchase token is real, paid and for this app. Without it, a rooted phone could fake purchases. It is written, not deployed.
- **Switch:** nothing changes until `SHOP_TEST_PURCHASES` is set to `false`. Until then purchases stay free, which suits testing.
- **Production gate:** the release workflow refuses the production track while purchases are free or the verifier URL is empty.
- **Sign-in:** Google Play Games Services v2, through a small plugin inside the app (`PlayGamesPlugin.java`) rather than an
  npm package. The only ready-made plugin needs Capacitor 5 and the game is on 8.
  - Players are signed in with their Google account automatically at start-up, with no form and no password.
  - The garage top bar shows their name, or "Sign in" if they declined.
  - It stays off until the Play Games project id is set, so builds without it still run and players are simply guests.
- **Tests:** they drive both against fakes of Google's interfaces: sign-in, declined sign-in, purchase, cancel, and a late purchase.

## Shop prices (researched 2026-11-24)
Read from the App Store listings of Hill Climb Racing 1 and 2, CSR 2, Asphalt Legends and Clash Royale:
- **Price points:** they all use the standard points: $0.99, 1.99, 2.99, 4.99, 9.99, 14.99, then $19.99 to $22.99 at the top.
- **Starter packs:** cheap ($0.99 to $3.99), one-time, and the best value in the shop.
- **Coin value:** bigger packs give a lot more per dollar. Hill Climb Racing goes from 75k to 200k coins per dollar.
- **Passes:** almost all of them sell a pass or subscription at $4.99 to $14.99.

What changed in ours (numbers in `SHOP_*`, `src/game-config.js`):
- **Coin packs:** $0.99 / 1.99 / 4.99 / 9.99 / 19.99 / 49.99 for 25K / 60K / 175K / 400K / 1M / 3M coins. That's 25K to 60K
  coins per dollar; the old ladder had an off-pattern $2.49.
- **New Rookie pack, $0.99, once only:** 50K coins plus your next Scout truck.
- **Starter boost, $2.99, now once only:** 300K coins instead of 100K, about 100K per dollar, the best deal in the shop.
- **New Every map, $4.99:** every paid map at once (each is 100K coins otherwise).
- **The whole fleet:** now also includes every map.
- **Unchanged:** single trucks ($0.99 to $3.99 by rank) and class packs were already in line.

Not changed, worth deciding:
- **Rank packs** stay at your $10 / $20 / $30 / $40. $30 and $40 are above anything these games sell (their top packs are
  about $20); $4.99 to $19.99 would fit the market better.
- **A pass:** a monthly "Haul Pass" at $4.99 to $9.99 (daily coins, a pass-only truck) is what every one of these games
  sells. It needs subscription billing, which isn't built.

## Money: how double charges and abuse are prevented
- **Charged twice:** Google charges once per order. The game won't start a second order for an item while one is open: the
  buy button locks, and the store refuses a second order for the same product.
- **Paid twice:** each Google transaction id is granted once (`hh_grants`), so a purchase Google reports again (after a
  restart, or a retry) pays nothing extra.
- **Paid, never given:** the purchase is granted first and finished (consumed or acknowledged) with Google after. If the app
  dies in between, Google reports it again at the next start and the grant is deduplicated. A purchase that is never
  finished is refunded by Google after 3 days.
- **Slow payments:** pending payments, and purchases waiting for verification, arrive on their own once Google confirms them.
- **Restore:** trucks bought with money come back at every start if Google says this account owns them (a reinstall, a new
  phone). Buying a truck Google already counts as owned gives it, with nothing charged.
- **Copied purchase tokens:** every order carries this install's random id, which Google stores in obfuscated form. The
  verifier refuses a token presented by a different install, and a coin, rank or bundle token once it has been consumed.
- **Fake purchases:** in production every purchase is checked with Google's Play Developer API (`functions/verify-purchase`),
  and the release workflow won't ship to production without it.
- **Coins inside the game:** spending checks the balance first. Selling an upgrade refunds exactly its cost (checked for every
  class, knob and level), so there's no coin farm. Maps and trucks can't be bought twice.
- **Still open:** refunds. If a player gets a refund from Google after spending the coins, the coins stay. Catching that needs
  Google's Voided Purchases API plus a server-side economy. Worth doing if fraud ever shows up in Play Console's order reports.

## Security and design notes
- **Secrets:** signing keys and the Play service account live only in GitHub secrets. The workflow decodes the keystore to
  the runner's temp folder and deletes it afterwards. Nothing secret is in the repo.
- **Purchases:** grants are idempotent per Google transaction id (`hh_grants`). The verifier checks product ids against a
  strict pattern and only talks to Google with the function's own service identity, so no key file exists anywhere.
- **Saves:** progress (coins, XP, trucks) is still stored on the phone, so a rooted player can edit it.
  - That's acceptable for a single-player game.
  - If you add anything competitive, move the economy to Play Games Saved Games or a server.
  - Saved Games would also give cloud saves across phones. It's the natural next step after sign-in.
- **Release gates:** the production economy (rank 1, 20,000 coins) is checked in CI. Free purchases and a missing verifier
  can't reach the production track. The bundle size is checked before upload.
- **Dependencies:** every new dependency is pinned to an exact version at least about two weeks old, with no install scripts
  (`cordova-plugin-purchase` 13.20.0, `play-services-games-v2` 21.0.0, `googleapis` 189.0.0 in the function only).

## Deploy to the Play Store for testing: what you do

1. **Play Console:** create a developer account (one-off fee) and an app called **Heavy Haul** with package `com.heavyhaul.game`.
   Accept Play App Signing (the default).
2. **Upload key:** run `keytool -genkeypair -v -keystore heavy-haul-upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000`
   and keep the file and passwords safe. In GitHub, go to repo **Settings > Secrets and variables > Actions** and add:
   - `ANDROID_RELEASE_KEYSTORE_BASE64`: the output of `base64 -w0 heavy-haul-upload.jks`
   - `ANDROID_RELEASE_STORE_PASSWORD`, `ANDROID_RELEASE_KEY_ALIAS` (`upload`), `ANDROID_RELEASE_KEY_PASSWORD`
3. **Service account for uploads:**
   - In Google Cloud Console, create a project, enable the **Google Play Android Developer API**, create a service account
     and download its JSON key.
   - In Play Console > **Users and permissions**, invite the service account's email with release permissions for the app.
   - Add the JSON as the secret `PLAY_SERVICE_ACCOUNT_JSON`.
4. **First upload (by hand, Google requires it for a new app):**
   - In GitHub **Actions > Google Play release**, run the workflow with version_code `1`, track `internal` and status `draft`.
   - Download the `heavy-haul-1` artifact (`app-release.aab`).
   - In Play Console, go to **Testing > Internal testing > Create release**, upload that `.aab`, and add your testers' emails.
   - Every later release can go straight from the workflow. Raise version_code each time.
5. **Store listing:**
   - Icon: `assets/brand/play-store/icon-512.png`
   - Feature graphic: `assets/brand/play-store/feature-graphic-1024x500.png`
   - Screenshots: `node tools/shots.mjs pages` writes them to `output/sweep/`
   - Also fill in the privacy policy URL (required with sign-in and purchases), Data safety, the content rating questionnaire,
     target audience, and the ads declaration (no ads).
6. **Testers:** share the internal-testing opt-in link. They install from the Play Store like any app.

Later, when you want real purchases and sign-in on the test track:

7. **Play Games sign-in:**
   - In Play Console > **Play Games Services > Setup and management**, create the game and link the app.
   - Add Android credentials using the SHA-1 of the app signing key (Play Console > App integrity) and of your upload key.
   - Copy the **project id** into a GitHub repo **variable** (not a secret) named `PLAY_GAMES_APP_ID`.
   - Add testers under Play Games Services > Testers.
8. **Products:** `node tools/play-products.mjs` writes `output/play-products.csv` (287 products: id, kind, title, price).
   - Create them under **Monetize > Products > In-app products**: trucks as one-time products, the rest as consumables.
   - Set up a payments profile, and add license testers so test purchases cost nothing.
   - 280 single-truck products is a lot to manage. Consider selling trucks in a few price tiers.
9. **Verifier:**
   - Give a service account "View financial data" in Play Console.
   - Deploy `functions/verify-purchase` with the `gcloud` command in its header.
   - Put the function's URL in `PLAY_VERIFY_URL` and set `SHOP_TEST_PURCHASES = false` in `src/game-config.js`.

## Checks run
- `npm test`: 155 of 158 pass. Two fail, "brisk take-off then a smooth climb" and "AWD and DIFF clearly change progress in
  deep mud". Both already failed on `main` before tonight (checked by stashing all changes), so they come from earlier driving
  tuning, which I left alone. 1 test is skipped.
- `npm run test:route`: passes. A fully upgraded truck drives the whole trail.
- `npm run test:browser`: 5 of 5 pass. It drives the real game in Chrome: garage, shop, upgrades, every truck on the map.
- Screenshots of every garage page and driving, at four screen sizes: no page errors.
- New tests cover missions (featured contracts, signature hauls on every map, free starters on free maps, the coin bonus paid
  once), Play Billing (purchase, cancel, late purchase, kept trucks) and Play Games sign-in.
- Not run: any Android build (no SDK here). The asset-pack split itself was tested on a real copy of the app: base 38 MB,
  pack 245 MB, and it restores cleanly.
