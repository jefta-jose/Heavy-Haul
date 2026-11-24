// Refunds: a purchase Google refunded or charged back is taken back in the game (user, 2026-11-24), so a refund can't keep
// the coins, ranks, trucks or maps it paid for. Google lists voided orders only to the developer (the Voided Purchases API),
// so the game asks our server (functions/verify-purchase, entry point `voided`) which of its own recent order ids were voided,
// and shop.revoke() takes each one back once. Off until PLAY_REFUNDS_URL is set; asks at most once every REFUND_CHECK_HOURS.
import { PLAY_REFUNDS_URL, REFUND_CHECK_HOURS } from '../game-config.js';

const KEY = 'hh_refund_check';

export async function checkRefunds(shop, { url = PLAY_REFUNDS_URL, storage = typeof localStorage === 'undefined' ? null : localStorage, fetchFn = typeof fetch === 'undefined' ? null : fetch, now = Date.now } = {}) {
  if (!url || !fetchFn || !shop?.refundable) return [];
  let last = 0; try { last = +storage?.getItem(KEY) || 0; } catch (e) {}
  if (now() - last < REFUND_CHECK_HOURS * 36e5) return [];
  const orders = shop.refundable().filter(id => !id.startsWith('test-') && !id.startsWith('owned:'));
  if (!orders.length) return [];
  try {
    const res = await fetchFn(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orders }) });
    if (!res.ok) return [];
    const voided = (await res.json())?.voided;
    try { storage?.setItem(KEY, String(now())); } catch (e) {}
    if (!Array.isArray(voided)) return [];
    return voided.filter(id => orders.includes(id)).map(id => shop.revoke(id)).filter(Boolean);
  } catch (e) { console.warn('Refund check failed:', e); return []; }
}
