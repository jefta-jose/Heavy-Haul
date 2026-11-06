# Starting economy and Google Play releases

The user knowingly changes `STARTING_RANK` and `STARTING_COINS` in `src/game-config.js` to test
different player experiences. There is no test-mode flag or automatic reset. The user will manually
restore **rank 1** and **20,000 coins** before deploying to production. Local builds and the debug
APK workflow allow any testing values.

To test a fresh player after changing these numbers, clear the app's data or the browser's game saves
(`hh_wallet`, `hh_progress`, `hh_tuning_levels`, `hh_powers`, `hh_missions`). Existing saved coins
are retained, and the starting-rank floor never reduces previously earned XP.

`npm run check:release` reads the real configuration and fails if either production value is wrong.
The Google Play workflow runs this gate before building or using release credentials; it does not
replace values in the build. Test fixtures can use other values without weakening this store check.

## One-time setup

Create the Play Console app for `com.heavyhaul.game`, enroll in Play App Signing and configure its
upload key. Complete the account, listing and first-release requirements in Play Console. Grant a
Google service account permission to release this app and enable its Android Publisher API access.
The upload key is separate from the debug key used for tester APKs.

Add these GitHub Actions repository secrets:

| Secret | Value |
|---|---|
| `ANDROID_RELEASE_KEYSTORE_BASE64` | Base64-encoded upload keystore (`.jks` or `.keystore`). |
| `ANDROID_RELEASE_STORE_PASSWORD` | Keystore password. |
| `ANDROID_RELEASE_KEY_ALIAS` | Upload-key alias. |
| `ANDROID_RELEASE_KEY_PASSWORD` | Upload-key password. |
| `PLAY_SERVICE_ACCOUNT_JSON` | Service-account JSON key with Play Console access to this app. |

Release signing reads these credentials from the environment; no key or password belongs in the
repository. Missing credentials fail a release build instead of producing an unsigned bundle.

## Deploy

1. Manually set `STARTING_RANK = 1` and `STARTING_COINS = 20000`; commit and push the release code.
2. In GitHub Actions, choose **Google Play release → Run workflow** and select the release branch.
3. Enter a unique, increasing version code and the player-facing version name. Choose the track
   (`internal` by default; select `production` for the store release) and release status. Use `draft`
   when Play Console setup or review must be completed there before publishing.
4. The workflow validates the actual starting values, builds and verifies a signed AAB, saves it as
   an Actions artifact and uploads it to the selected Play track. Google Play's review and account
   requirements still apply before a production release becomes available to players.

Only `workflow_dispatch` starts this workflow. Pushing to `main` continues to build and publish the
existing `latest-build` debug APK through `android.yml`; it never triggers a Play Store deployment.

Implementation references: [Android upload-key signing](https://developer.android.com/studio/publish/app-signing)
and [Google Play upload action](https://github.com/r0adkll/upload-google-play).
