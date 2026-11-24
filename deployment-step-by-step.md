# Heavy Haul: deployment, step by step

From your computer to the Google Play Store. Parts 1 and 2 are for testing and work today. Parts 3 to 7 are one-time
setup in Google's consoles; do them in order. Part 8 is every release after that.

Package name: `com.heavyhaul.game`. Everything secret (keys, passwords, service accounts) lives only in GitHub secrets.

---

## 1. Test on your computer

```bash
npm install
```

```bash
npm run dev
```

- Opens on `http://localhost:5173` and rebuilds on save. On a phone on the same Wi-Fi: `http://<your computer's IP>:5173`.
- **Test economy:** edit `STARTING_RANK` and `STARTING_COINS` in `src/game-config.js` as you like. Put them back to
  **1** and **20000** before a Play release (the release workflow refuses anything else).
- **Purchases are free while testing:** `SHOP_TEST_PURCHASES = true` in `src/game-config.js` makes every BUY succeed at
  once with no charge. Leave it on until Part 6 is done.
- **A fresh player:** Settings (the gear in the garage) > Reset saved game > Delete everything, or clear the site's data in the browser.
- **Checks:** `npm test` (rules and physics), `npm run test:route` (a fully upgraded truck drives the trail),
  `npm run test:browser` (drives the real game in Chrome). `npm run check` runs all three.
- **Every truck on every map:** `node tools/stuck-sweep.mjs <map id> trail` reports trucks that get stuck.

## 2. Test on your phone (no Play Store needed)

Every push to `main` builds a test APK on GitHub (`.github/workflows/android.yml`):

1. On the phone, open `https://github.com/jefta-jose/Heavy-Haul/releases/download/latest-build/heavy-haul.apk`.
2. Install it (allow "install unknown apps" for the browser the first time).
3. Updates install over the old one and keep your progress.

**Starting over on the phone:** the game's Settings (gear icon) > Reset saved game > Delete everything. That also empties
the Google cloud save. Or Android's Settings > Apps > Heavy Haul > Storage > Clear storage (the cloud save then comes back
at the next start, by design).

**Why it used to come back at rank 35 with 40M coins:** Android's own backup (`allowBackup`) was on. Google backs up app
data to your Google account about once a day and restores that copy whenever the app is installed again, so a backup taken
while you were testing at rank 35 came back after every reinstall. Backup is now off (`AndroidManifest.xml`), so from the
next build a reinstall starts clean. To also remove the old copy from Google's servers (optional): on the phone, Settings >
Google > Backup (or the Google One app > Backup) > App data, or delete the device backup at `drive.google.com` > Storage >
Backups. Then uninstall the game and install the new APK.

**Reminders (notifications):** these work in the test APK too; they don't need the Play Store.
- The game asks "Get a nudge now and then?" in the garage after you finish (or fail) a run. Allow shows Android's own prompt.
- Reminders come 1, 3 and 7 days after you leave the game, in the early evening (17:00–20:00). Nothing arrives right
  after closing the game, and nothing arrives on a day you played.
- Saying "Not now" twice stops the question. A reinstall asks again. If you've turned notifications off for the app in
  Android's settings, the game asks again after your next run.
- Players can switch reminders on and off any time in the game's Settings (the row only shows in the Android app).
- Quick test: allow, then set the phone's clock a day ahead and leave the game in the background.

## 3. Play Console: the app

1. Create a developer account at `play.google.com/console` (one-off fee, identity check).
2. **Create app:** name **Heavy Haul**, game, free (with in-app purchases). Accept Play App Signing (the default).
3. **Upload key** (on your computer, once, keep the file and passwords safe forever):

   ```bash
   keytool -genkeypair -v -keystore heavy-haul-upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
   ```

4. In GitHub: repo **Settings > Secrets and variables > Actions > New repository secret**, add:

   | Secret | Value |
   |---|---|
   | `ANDROID_RELEASE_KEYSTORE_BASE64` | output of `base64 -w0 heavy-haul-upload.jks` |
   | `ANDROID_RELEASE_STORE_PASSWORD` | keystore password |
   | `ANDROID_RELEASE_KEY_ALIAS` | `upload` |
   | `ANDROID_RELEASE_KEY_PASSWORD` | key password |

5. **Service account for uploads:** in Google Cloud Console create a project, enable the **Google Play Android Developer
   API**, create a service account and download its JSON key. In Play Console > **Users and permissions**, invite the
   service account's email with release permissions for Heavy Haul. Add the JSON as the secret `PLAY_SERVICE_ACCOUNT_JSON`.

## 4. First upload (by hand, Google requires it once)

1. Check `src/game-config.js`: `STARTING_RANK = 1`, `STARTING_COINS = 20000`. Commit and push.
2. GitHub **Actions > Google Play release > Run workflow**: version_code `1`, track `internal`, status `draft`.
3. Download the `heavy-haul-1` artifact (`app-release.aab`).
4. Play Console > **Testing > Internal testing > Create release**, upload the `.aab`, add your testers' emails, roll out.
5. Testers join from the opt-in link and install from the Play Store.

The game is split for Play's size limit: about 38 MB base plus a 245 MB install-time asset pack (`gamedata`). Players
download it as one install. The workflow fails if the base ever passes 195 MB.

## 5. Sign-in and cloud save (Google Play Games)

This is what ties progress to the player's Google account instead of the phone: rank, coins, trucks, maps, upgrades,
missions and purchases go up to Google whenever the game is left and after each run, and come back on a reinstall or a
new phone (`src/game/cloud-save.js`, `PlayGamesPlugin.java`). The save with more XP wins; Reset saved game empties the
cloud copy too. Until this part is done, players are guests and progress stays on the phone.

1. Play Console > **Grow users > Play Games Services > Setup and management > Configuration**: create the game and link it
   to Heavy Haul.
2. **Turn on Saved Games** in the Play Games configuration (Game details / properties). Cloud save needs it.
3. **Credentials:** add an Android credential with the SHA-1 of the **app signing key** (Play Console > Test and release >
   App integrity) and another with the SHA-1 of your **upload key**
   (`keytool -list -v -keystore heavy-haul-upload.jks -alias upload`).
4. Copy the **project id** (a number) into a GitHub repo **variable** (not a secret) named `PLAY_GAMES_APP_ID`.
5. Add your testers under Play Games Services > **Testers**, then **publish** the Play Games configuration (testers work
   before that; everyone else needs it published).
6. Upload a new build (Part 8). On a tester's phone the game signs in at start-up; the garage top bar shows their name.

Test it: play a little, leave the game, uninstall, reinstall from Play: the progress comes back.

**Leaderboards and achievements** (`src/game/achievements.js`; Settings shows both buttons once a player is signed in):

7. Play Games Services > **Leaderboards**: make one per map, "Fastest delivery: <map name>", score format **Time**
   (milliseconds), ordering **smaller is better**. Paste each id into `PLAY_LEADERBOARDS` in `src/game-config.js`.
8. Play Games Services > **Achievements**: make one for each entry of `PLAY_ACHIEVEMENTS` in `src/game-config.js` (name and
   goal are there). One whose `of` is above 1 is **incremental** with exactly `of` steps. Paste each id into its `id`. Each
   needs a 512 × 512 icon. Empty ids are skipped, so the game works before this is done; counters made before then are
   sent at the next sign-in.
9. Publish the Play Games configuration again.

## 6. Real payments

1. Play Console > **Monetize > Payments profile**: set it up (bank details, tax).
2. **Products:** run `node tools/play-products.mjs`; it writes `output/play-products.csv` (21 products: id, title, price).
   Create them under **Monetize > Products > In-app products**, all as **consumable**, with exactly those ids. The shop has
   three tabs: Featured (bundles: Rookie, Starter, Every map, Next / Top of every class, the five class packs, the whole
   fleet), Coins and Ranks. No single trucks are sold for money: players buy those with coins in the garage. Rank packs are
   $4.99 / $9.99 / $11.99 / $19.99 (`SHOP_RANK_PACKS`).
3. **License testers:** Play Console > Settings > License testing: add testers so their purchases cost nothing.
4. **Purchase verifier** (stops fake purchases on rooted phones): give a service account "View financial data" in Play
   Console, deploy `functions/verify-purchase` with the first `gcloud` command in its header, and put the function's URL in
   `PLAY_VERIFY_URL` in `src/game-config.js`.
5. **Refund check** (takes back what a refunded or charged-back purchase gave): deploy the same folder again with the
   second `gcloud` command in its header (entry point `voided`, same service account) and put that URL in
   `PLAY_REFUNDS_URL`. The game asks it about its own recent orders at most every 12 hours; Google keeps refunds for 30 days.
6. Set `SHOP_TEST_PURCHASES = false` in `src/game-config.js`, commit, release to internal testing and buy one of each kind
   with a license tester: a coin pack, a truck, a bundle. Reinstall: everything comes back from the cloud save. Refund one
   test order in Play Console (Order management): within 12 hours of the next start, the game takes it back.

The production track refuses to build while purchases are free, or `PLAY_VERIFY_URL` or `PLAY_REFUNDS_URL` is empty.

## 7. Store listing and policies

All required before the first public release (Play Console > **Grow users > Store presence** and **Policy > App content**):

- **Icon:** `assets/brand/play-store/icon-512.png`. **Feature graphic:** `assets/brand/play-store/feature-graphic-1024x500.png`.
- **Screenshots:** `node tools/shots.mjs maps output/store` makes phone and landscape shots of every map;
  `node tools/shots.mjs pages` shoots every garage page into `output/sweep/`.
- **Short and full description**, category **Racing** or **Simulation**, contact email.
- **Privacy policy URL:** `https://jefta-jose.github.io/Heavy-Haul/privacy-policy.html`. The page is `site/privacy-policy.html`
  and the game links it from Settings. Publish it once: GitHub repo **Settings > Pages > Source: GitHub Actions**, then
  Actions > **Site** > Run workflow (it also runs whenever `site/` changes). Open the URL to check it before pasting it
  into Play Console. Make sure the developer contact email on the Play listing is one you're happy to show.
- **Data safety form:** no data collected by the developer; purchase history handled by Google Play; game progress stored
  in Google Play Games Saved Games; data is encrypted in transit; users can delete it (Settings > Reset saved game, or
  uninstall).
- **Content rating questionnaire** (no violence, no gambling: expect Everyone / PEGI 3), **target audience** (13+ avoids
  the Families policy), **ads: no**, **in-app purchases: yes**.
- **Countries** and **pricing**: free, with the in-app products from Part 6.

## 8. Every release after that

1. `src/game-config.js`: `STARTING_RANK = 1`, `STARTING_COINS = 20000`, `SHOP_TEST_PURCHASES = false`, and
   `PLAY_VERIFY_URL` and `PLAY_REFUNDS_URL` set (production only). Run `npm run check`. Commit and push.
2. GitHub **Actions > Google Play release > Run workflow**: a version_code higher than the last one, a version name
   (`1.0.0`), the track (`internal`, then `production` when it's ready) and the status (`completed` publishes it,
   `draft` waits for you in Play Console).
3. The workflow checks the economy and payments gates, builds and signs the bundle, checks its size, and uploads it.
4. In Play Console, promote internal > closed > production when you're happy. New personal developer accounts must run
   a closed test with at least 12 testers for 14 days before production access is granted.

After you change the numbers back for testing, remember Part 1: put them back before the next release.
