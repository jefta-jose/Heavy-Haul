// Purchase verifier for Google Play Billing (src/game/store-play.js sends every approved purchase here when PLAY_VERIFY_URL is set).
// A Google Cloud Function (2nd gen): it asks the Google Play Developer API whether the purchase token is real, paid, for this
// app and this product, and only then answers ok, so a rooted phone cannot fake a purchase. It runs as a service account
// that has "View financial data" in Play Console (Users and permissions), which Google Cloud supplies to the function; no
// key file is stored anywhere. Deploy (from this folder):
//   gcloud functions deploy verify-purchase --gen2 --runtime=nodejs22 --region=europe-west1 --trigger-http --allow-unauthenticated \
//     --entry-point=verify --service-account=play-verifier@<project>.iam.gserviceaccount.com --set-env-vars=PACKAGE_NAME=com.heavyhaul.game
// then put its URL in PLAY_VERIFY_URL (src/game-config.js). The request shape is cordova-plugin-purchase's validator protocol.
//
// The same file holds the refund check (entry point `voided`, src/game/refunds.js): deploy it as a second function with
//   gcloud functions deploy voided-purchases --gen2 --runtime=nodejs22 --region=europe-west1 --trigger-http --allow-unauthenticated \
//     --entry-point=voided --service-account=play-verifier@<project>.iam.gserviceaccount.com --set-env-vars=PACKAGE_NAME=com.heavyhaul.game
// and put its URL in PLAY_REFUNDS_URL. The game sends its own recent order ids; the answer is the ones Google voided
// (refunds and chargebacks of the last 30 days, from the Voided Purchases API). Nothing about the player is sent or kept.
import { google } from 'googleapis';
import functions from '@google-cloud/functions-framework';

const PACKAGE = process.env.PACKAGE_NAME ?? 'com.heavyhaul.game';
const publisher = google.androidpublisher({ version: 'v3', auth: new google.auth.GoogleAuth({ scopes: ['https://www.googleapis.com/auth/androidpublisher'] }) });

functions.http('verify', async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  const productId = String(req.body?.id ?? ''), tx = req.body?.transaction ?? {};
  const token = String(tx.purchaseToken ?? tx.id ?? '');
  if (!/^[a-z0-9_.]{1,140}$/.test(productId) || !token || token.length > 4096) return res.status(400).json({ ok: false, data: { code: 6778003 }, error: { message: 'Bad request' } });
  try {
    const { data } = await publisher.purchases.products.get({ packageName: PACKAGE, productId, token });
    const refuse = message => res.json({ ok: false, data: { code: 6778003 }, error: { message } });
    // purchaseState 0 = purchased; 1 = cancelled; 2 = pending. A refunded purchase is cancelled.
    if (data.purchaseState !== 0) return refuse(`Purchase state ${data.purchaseState}`);
    // the install that ordered it (the game sends its id with every order; Google keeps it obfuscated): a token copied to
    // another phone is refused
    const asker = req.body?.additionalData?.obfuscatedUsername;
    if (data.obfuscatedExternalAccountId && asker && data.obfuscatedExternalAccountId !== asker) return refuse('Purchase belongs to another install');
    // every product pays once: once the game has consumed it, the same token is refused
    if (data.consumptionState === 1) return refuse('Already used');
    res.json({ ok: true, data: { id: productId, latest_receipt: true, transaction: tx, collection: [{ id: productId, transactionId: data.orderId, purchaseDate: data.purchaseTimeMillis }] } });
  } catch (e) {
    // a token Google does not know (forged, or for another app) is a 4xx from Google: refuse it
    const status = e?.code ?? e?.response?.status ?? 500;
    res.status(status >= 400 && status < 500 ? 200 : 500).json({ ok: false, data: { code: 6778003 }, error: { message: 'Not a valid purchase' } });
  }
});

// Voided orders, fetched from Google at most every 10 minutes and shared by every request in that time (the API's daily
// quota is far below one call per player).
let voidedCache = { at: 0, ids: new Set() };
async function voidedOrders() {
  if (Date.now() - voidedCache.at < 10 * 60e3) return voidedCache.ids;
  const ids = new Set();
  let token;
  do {
    const { data } = await publisher.purchases.voidedpurchases.list({ packageName: PACKAGE, maxResults: 1000, token });
    for (const v of data.voidedPurchases ?? []) if (v.orderId) ids.add(v.orderId);
    token = data.tokenPagination?.nextPageToken;
  } while (token);
  voidedCache = { at: Date.now(), ids };
  return ids;
}

functions.http('voided', async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ voided: [] });
  const orders = Array.isArray(req.body?.orders) ? req.body.orders.filter(id => typeof id === 'string' && /^GPA\.[0-9-]{1,40}$/.test(id)).slice(0, 500) : [];
  if (!orders.length) return res.json({ voided: [] });
  try {
    const ids = await voidedOrders();
    res.json({ voided: orders.filter(id => ids.has(id)) });
  } catch (e) {
    res.status(500).json({ voided: [] });
  }
});
