# Heavy Haul: deployment, step by step

From your computer to the Google Play Store. Parts 1 and 2 are for testing and work today. Parts 3 to 7 are one-time
setup in Google's consoles; do them in order. Part 8 is every release after that. Part 9 lists the errors you are most
likely to meet and what each one means.

Package name: `com.heavyhaul.game`. Everything secret (keys, passwords, service accounts) lives only in GitHub secrets,
never in the repo. Google renames Play Console menus now and then: when a path below doesn't match, use the search box at
the top of Play Console with the last word of the path.

**Where you are today (2026-11-25):** Parts 1 and 2 work. GitHub has only the `ANDROID_DEBUG_KEYSTORE` secret, so you start
at Part 3.

## 0. What you need once

- **Node 22** (`node -v`) and npm, for Part 1 and a few helper scripts.
- **Java** for `keytool` (Part 3). On Ubuntu / WSL:

  ```bash
  sudo apt install openjdk-21-jdk-headless
  ```

- **GitHub CLI** (`gh`), signed in to the repo, so secrets can be added from the terminal. Check with `gh secret list`.
- **gcloud CLI** for the purchase verifier (Part 6 only): `https://cloud.google.com/sdk/docs/install`, then `gcloud init`.
- A **Google account** for Play Console, a payment card for the one-off developer fee, and an ID for Google's identity
  check (it can take a few days).

Nothing is built on your computer for Play: GitHub Actions builds, signs and uploads the app.

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
  once with no charge (the shop says "Test mode: purchases are free"). Leave it on until Part 6.
- **A fresh player:** Settings (the gear in the garage) > Reset saved game > Delete everything, or clear the site's data in the browser.
- **Checks:** `npm test` (rules and physics), `npm run test:route` (a fully upgraded truck drives the trail),
  `npm run test:browser` (drives the real game in Chrome; first time only: `npx playwright install chromium`).
  `npm run check` runs all three (about 20 minutes).
- **Every truck on every map:** `node tools/stuck-sweep.mjs <map id> trail` reports trucks that get stuck.

## 2. Test on your phone (no Play Store needed)

Every push to `main` builds a test APK on GitHub (`.github/workflows/android.yml`, about 10 minutes):

1. On the phone, open `https://github.com/jefta-jose/Heavy-Haul/releases/download/latest-build/heavy-haul.apk`.
2. Install it (allow "install unknown apps" for the browser the first time).
3. Updates install over the old one and keep your progress. That works because every build is signed with the same
   debug key, the `ANDROID_DEBUG_KEYSTORE` secret (already set). If that secret is ever lost, uninstall before installing.

A phone that has the Play Store version installed can't install this APK over it (different signing keys): uninstall one
to try the other.

**Starting over on the phone:** the game's Settings (gear icon) > Reset saved game > Delete everything. That also empties
the Google cloud save. Or Android's Settings > Apps > Heavy Haul > Storage > Clear storage (the cloud save then comes back
at the next start, by design).

**Why it used to come back at rank 35 with 40M coins:** Android's own backup (`allowBackup`) was on. Google backs up app
data to your Google account about once a day and restores that copy whenever the app is installed again, so a backup taken
while you were testing at rank 35 came back after every reinstall. Backup is now off (`AndroidManifest.xml`), so a
reinstall starts clean. To also remove the old copy from Google's servers (optional): on the phone, Settings > Google >
Backup (or the Google One app > Backup) > App data, or delete the device backup at `drive.google.com` > Storage > Backups.
Then uninstall the game and install the new APK.

**Reminders (notifications):** these work in the test APK too; they don't need the Play Store.
- The game asks "Get a nudge now and then?" in the garage after you finish (or fail) a run. Allow shows Android's own
  notifications prompt (not "Alarms & reminders": the game doesn't ask for exact alarms).
- Reminders come 1, 3 and 7 days after you leave the game, in the early evening (17:00–20:00). Nothing arrives right
  after closing the game, and nothing arrives on a day you played.
- Saying "Not now" twice stops the question. A reinstall asks again. If you've turned notifications off for the app in
  Android's settings, the game asks again after your next run.
- Players can switch reminders on and off any time in the game's Settings (the row only shows in the Android app).
- Quick test: allow, then set the phone's clock a day ahead and leave the game in the background.

## 3. Play Console and GitHub: one-time setup

1. **Developer account:** `play.google.com/console`, pay the one-off fee and finish the identity check. Choose a
   **personal** account unless you have a registered company (an organisation account needs a D-U-N-S number).
2. **Create app:** Home > Create app. Name **Heavy Haul**, default language, **Game**, **Free**, tick the declarations.
   (Free is permanent; in-app purchases are still allowed.)
3. **Upload key** (on your computer, once). It asks for a password (use the same one twice when asked for the key
   password) and your name; the answers to the name questions don't matter:

   ```bash
   keytool -genkeypair -v -keystore heavy-haul-upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
   ```

   Keep `heavy-haul-upload.jks` and its password somewhere safe outside the repo (a password manager and a USB stick).
   Never commit it. If it is lost, Play Console can reset the upload key (Test and release > App integrity > Request upload
   key reset), but that takes days.
4. **Signing secrets in GitHub** (from the folder that holds the `.jks`; each `gh secret set` asks for the value when no
   `--body` is given, so passwords stay out of your shell history):

   ```bash
   base64 -w0 heavy-haul-upload.jks | gh secret set ANDROID_RELEASE_KEYSTORE_BASE64 --repo jefta-jose/Heavy-Haul
   ```

   ```bash
   gh secret set ANDROID_RELEASE_STORE_PASSWORD --repo jefta-jose/Heavy-Haul
   ```

   ```bash
   gh secret set ANDROID_RELEASE_KEY_ALIAS --repo jefta-jose/Heavy-Haul --body upload
   ```

   ```bash
   gh secret set ANDROID_RELEASE_KEY_PASSWORD --repo jefta-jose/Heavy-Haul
   ```

   (Or in the browser: repo **Settings > Secrets and variables > Actions > New repository secret**, same four names.)
5. **Service account, so GitHub can upload to Play:**
   1. `console.cloud.google.com` > project picker > **New project** (call it `heavy-haul`).
   2. **APIs & Services > Library**, search **Google Play Android Developer API**, **Enable**.
   3. **IAM & Admin > Service accounts > Create service account**, name it `play-upload`, skip the optional role steps.
   4. Open it > **Keys > Add key > Create new key > JSON**. A `.json` file downloads. Treat it like a password.
   5. Play Console (the account level, not inside the app) > **Users and permissions > Invite new users**: paste the
      service account's email (`play-upload@heavy-haul….iam.gserviceaccount.com`), **App permissions > Add app > Heavy
      Haul**, tick **Release apps to testing tracks** and **Release to production, exclude devices, and use Play App
      Signing**, then **Invite user**. No email confirmation is needed for a service account.
   6. Put the JSON in GitHub, then delete the downloaded file:

      ```bash
      gh secret set PLAY_SERVICE_ACCOUNT_JSON --repo jefta-jose/Heavy-Haul < ~/Downloads/heavy-haul-*.json
      ```

   New permissions can take up to a day to reach Google's API; until then uploads fail with "The caller does not have
   permission".

`gh secret list` should now show six secrets: the debug keystore, four signing secrets and the service account.

## 4. First upload (by hand, Google requires it once)

1. Check `src/game-config.js`: `STARTING_RANK = 1`, `STARTING_COINS = 20000`. Commit and push.
2. GitHub **Actions > Google Play release > Run workflow**: version_code `1`, version_name `1.0.0`, track `internal`,
   release_status `draft`. It takes about 15 minutes.
3. **The run ends red at its last step, "Deploy to Google Play". That is expected the first time:** Google refuses API
   uploads until one bundle has been uploaded by hand. Every step before it is green and the signed bundle is saved.
4. Open the run and download the `heavy-haul-1` artifact at the bottom of its summary page. Unzip it to get
   `app-release.aab`.
5. Play Console > Heavy Haul > **Test and release > Testing > Internal testing**:
   1. **Testers** tab > **Create email list**, add your testers' Google emails (up to 100), save, tick the list.
   2. **Create new release**, accept Play App Signing if asked, upload `app-release.aab`, release name `1.0.0`,
      **Next > Save and publish** (internal releases are not reviewed; they are ready in minutes).
   3. Back on the Testers tab, **Copy link**. Each tester opens it on their phone (signed in with the listed email),
      accepts, then installs Heavy Haul from the Play Store.

From now on the workflow uploads by itself (Part 8). The bundle is about 38 MB of app plus a 245 MB install-time asset
pack (`gamedata`, the truck and map art); players download both as one install. The workflow fails if the app part ever
passes 195 MB (Play's limit is 200 MB).

## 5. Sign-in and cloud save (Google Play Games)

This is what ties progress to the player's Google account instead of the phone: rank, coins, trucks, maps, upgrades,
missions and purchases go up to Google whenever the game is left and after each run, and come back on a reinstall or a
new phone (`src/game/cloud-save.js`, `PlayGamesPlugin.java`). The save with more XP wins; Reset saved game empties the
cloud copy too. Until this part is done, players are guests and progress stays on the phone.

1. Play Console > Heavy Haul > **Grow users > Play Games Services > Setup and management > Configuration**: **No, my game
   doesn't use Google APIs** > create the Play Games project, linked to Heavy Haul. If it asks to use a Cloud project, pick
   the `heavy-haul` project from Part 3.
2. **Properties** (or Game details): fill in the display name and description, and **turn on Saved Games**. Cloud save
   needs it.
3. **Credentials > Add credential > Android**. If it first asks for an **OAuth consent screen**, follow its link: user type
   **External**, app name Heavy Haul, your email as support and developer contact, save (no scopes to add), then come back.
   Add three Android credentials, each with package `com.heavyhaul.game` and one SHA-1:
   - the **app signing key**: Play Console > Test and release > **App integrity** > App signing > SHA-1 certificate
     fingerprint (this one makes sign-in work in the Play Store version);
   - your **upload key**: `keytool -list -v -keystore heavy-haul-upload.jks -alias upload`;
   - optional, the **debug key**, so sign-in also works in the test APK from Part 2: GitHub > Actions > the latest
     **Android** run > the **Shared debug key** step prints a line starting `SHA1:`.
4. Copy the **Project ID** (a long number, top of the Configuration page) into a GitHub **variable** (not a secret):

   ```bash
   gh variable set PLAY_GAMES_APP_ID --repo jefta-jose/Heavy-Haul --body <project id>
   ```

5. **Testers** (in Play Games Services): add the same emails as the internal test. Then **Review and publish** the Play
   Games configuration (testers can sign in before that; everyone else needs it published).
6. Release a new build (Part 8). On a tester's phone the game signs in at start-up; the garage top bar shows their name.

Test it: play a little, leave the game, uninstall, reinstall from Play: the progress comes back.

**Leaderboards and achievements** (`src/game/achievements.js`; Settings shows both buttons once a player is signed in).
Optional: the game works without them, and you can add them after launch.

7. Play Games Services > **Leaderboards**: make one per map, "Fastest delivery: <map name>", score format **Time**
   (milliseconds), ordering **smaller is better**. Paste each id into `PLAY_LEADERBOARDS` in `src/game-config.js`.
8. Play Games Services > **Achievements**: make one for each entry of `PLAY_ACHIEVEMENTS` in `src/game-config.js` (name and
   goal are there). One whose `of` is above 1 is **incremental** with exactly `of` steps. Paste each id into its `id`. Each
   needs a 512 × 512 icon. Empty ids are skipped; counters made before an id is filled in are sent at the next sign-in.
9. Publish the Play Games configuration again, then release a build with the new ids.

## 6. Real payments

The products page only opens after a bundle has been uploaded (Part 4).

1. Play Console > **Monetize with Play > Payments profile** (older consoles: Setup > Payments profile): set it up (bank
   details, tax info). Products can't be activated until it is verified.
2. **Products:** run `node tools/play-products.mjs`; it writes `output/play-products.csv` (21 products: id, title,
   description, price in US dollars). Create each under **Monetize with Play > Products > One-time products** (older
   consoles: In-app products) with exactly that **product id**, title and description, set the price in USD and let Play
   convert the other countries, and **Activate** it. Every product is consumable (the game consumes it after granting;
   there's nothing to tick for that in a one-time product). The shop has three tabs: Featured (Rookie pack, Starter boost,
   Every map, Next in every class, Top of every class, the five "Every <class> truck" packs, The whole fleet), Coins (six
   packs) and Ranks ($4.99 / $9.99 / $11.99 / $19.99, `SHOP_RANK_PACKS`). No single trucks are sold for money: players buy
   those with coins in the garage. A product id can never be reused, even after deleting it.
3. **License testers:** Play Console (account level) > **Settings > License testing**: add the testers' emails so their
   purchases use test cards and cost nothing.
4. **Purchase verifier** (stops fake purchases on rooted phones). In the `heavy-haul` Cloud project:
   1. **Billing** must be linked to the project (Cloud Functions needs it; this traffic stays inside the free tier).
   2. **IAM & Admin > Service accounts > Create service account** named exactly `play-verifier`, no roles.
   3. Play Console > **Users and permissions > Invite new users**: its email, App permissions > Heavy Haul >
      **View financial data, orders, and cancellation survey responses**. Invite.
   4. In a terminal:

      ```bash
      gcloud config set project heavy-haul
      ```

      ```bash
      gcloud services enable cloudfunctions.googleapis.com cloudbuild.googleapis.com run.googleapis.com artifactregistry.googleapis.com androidpublisher.googleapis.com
      ```

      ```bash
      cd functions/verify-purchase
      ```

   5. Run the **first** `gcloud functions deploy` command from the header of `functions/verify-purchase/index.js`, with
      `<project>` replaced by your project id (shown by `gcloud config get project`; it may be `heavy-haul-123456`
      rather than `heavy-haul`). It prints a `url:` at the end: put it in `PLAY_VERIFY_URL` in `src/game-config.js`.
5. **Refund check** (takes back what a refunded or charged-back purchase gave): from the same folder, run the **second**
   `gcloud functions deploy` command in that header (entry point `voided`, same service account) and put its URL in
   `PLAY_REFUNDS_URL`. The game asks it about its own recent orders at most every 12 hours; Google keeps refunds for 30 days.
6. Set `SHOP_TEST_PURCHASES = false` in `src/game-config.js`, commit, release to internal testing (Part 8) and buy one of
   each kind with a license tester: a coin pack, a rank pack, a bundle. Reinstall: everything comes back from the cloud
   save. Refund one test order in Play Console (**Order management**): within 12 hours of the next start, the game takes it
   back.

The production track refuses to build while purchases are free, or `PLAY_VERIFY_URL` or `PLAY_REFUNDS_URL` is empty.
Internal and closed tracks may keep free test purchases.

## 7. Store listing and policies

All required before any track other than internal testing. Play Console's **Dashboard** lists every task still open
under "Set up your app"; work down it until all are ticked.

**Main store listing** (Grow users > Store presence > Main store listing):

- **App name** Heavy Haul, a **short description** (80 characters) and a **full description** (4000).
- **Icon:** `assets/brand/play-store/icon-512.png`. **Feature graphic:** `assets/brand/play-store/feature-graphic-1024x500.png`.
- **Screenshots:** `node tools/shots.mjs maps output/store` makes phone and landscape shots of every map (2 to 8 phone
  screenshots are needed; the landscape ones also cover the tablet slots). `node tools/shots.mjs pages` shoots every garage
  page into `output/sweep/`.
- **Store settings:** category **Racing** (or Simulation), tags, and a contact email you're happy to show publicly.

**App content** (Policy and programs > App content), one form each:

- **Privacy policy:** `https://jefta-jose.github.io/Heavy-Haul/privacy-policy.html`. The page is `site/privacy-policy.html`
  and the game links it from Settings. Publish it once: GitHub repo **Settings > Pages > Source: GitHub Actions**, then
  Actions > **Site** > Run workflow (it also runs whenever `site/` changes). Open the URL to check it before pasting it.
- **App access:** all functionality is available without special access (no login needed).
- **Ads:** no ads.
- **Content rating:** start the questionnaire, category **Game**; answer no to violence, fear, gambling, user interaction
  and so on; yes to "digital purchases". Expect Everyone / PEGI 3.
- **Target audience:** 13 and over (choosing under 13 brings in the Families policy and its extra rules). Not designed for
  children.
- **Data safety:** no data collected or shared by the developer. Purchases are handled by Google Play. Game progress is
  stored in Google Play Games Saved Games. Data is encrypted in transit; users can delete it (Settings > Reset saved game,
  or uninstall).
- **Advertising ID:** no, the app doesn't use it.
- **Government apps, financial features, health, news:** none / no.
- **Countries and pricing** (Test and release > Production > Countries / regions): pick where it is sold; the app is free,
  with the products from Part 6.

## 8. Every release after that

1. `src/game-config.js`: `STARTING_RANK = 1`, `STARTING_COINS = 20000`, and for production also
   `SHOP_TEST_PURCHASES = false` with `PLAY_VERIFY_URL` and `PLAY_REFUNDS_URL` set. Run `npm run check`. Commit and push.
2. GitHub **Actions > Google Play release > Run workflow**:
   - **version_code:** one higher than the last one uploaded (Play Console > Test and release > App bundle explorer shows
     them). It can never go back down or repeat.
   - **version_name:** what players see, such as `1.0.1`.
   - **track:** `internal` (your testers, instant), `alpha` (closed testing), `beta` (open testing), `production`.
   - **release_status:** `completed` publishes it on that track; `draft` uploads it and waits for you in Play Console.
3. The workflow checks the economy and payments gates, builds and signs the bundle, checks its size, and uploads it.
4. **Getting to production the first time:** a new personal developer account must run a **closed test** with at least
   **12 testers opted in for 14 days in a row** before Play lets it publish to production:
   1. Release to track `alpha` (Part 8, step 2). Play Console > Test and release > Testing > **Closed testing**: add a
      tester email list with at least 12 people (more is safer, in case some drop out), and share the opt-in link.
      Closed releases are reviewed by Google (a few hours to a few days).
   2. Keep them opted in for 14 days; they don't need to play every day, but staying installed and opening it helps.
   3. Dashboard > **Apply for production** and answer the questions about the test.
   4. Once approved, release to track `production`. The first production release is reviewed too.
5. Later releases go straight to the track you choose; you can also promote a tested release in Play Console
   (the release's **Promote release** button) instead of building again.

After you change the numbers back for testing, remember Part 1: put them back before the next release.

## 9. When something fails

| Where | Message | What it means |
| --- | --- | --- |
| Workflow, "Require production starting economy" | STARTING_RANK / STARTING_COINS | Put them back to 1 and 20000, commit, run again. |
| Workflow, "Require real payments" | SHOP_TEST_PURCHASES, PLAY_VERIFY_URL or PLAY_REFUNDS_URL | Production only: finish Part 6. |
| Workflow, "Validate release inputs and secrets" | Missing release secret | One of the five secrets in Part 3 is missing or misnamed (`gh secret list`). |
| Workflow, "Deploy to Google Play" | Package not found | The first bundle hasn't been uploaded by hand yet (Part 4). |
| Workflow, "Deploy to Google Play" | The caller does not have permission | The service account isn't invited to Heavy Haul with release permissions, or the invite is under a day old. |
| Workflow, "Deploy to Google Play" | Version code 1 has already been used | Run again with a higher version_code. |
| Workflow, "Deploy to Google Play" | Only releases with status draft may be created on draft app | The app has never been reviewed: run with release_status `draft`, then roll out from Play Console. |
| Play Console upload | signed with the wrong key | The bundle wasn't built with `heavy-haul-upload.jks`; check the four signing secrets. |
| Phone | Game signs in as a guest | `PLAY_GAMES_APP_ID` not set when that build was made, the SHA-1 credentials (Part 5, step 3) don't match, or the tester isn't listed under Play Games testers. |
| Phone | Purchase fails "item unavailable" | The product isn't activated, the id doesn't match the CSV, or the phone's Google account isn't a tester of a track the build is on. |
