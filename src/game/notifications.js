// Reminders on the phone (Android app only, @capacitor/local-notifications): friendly random messages from
// assets/notifications/messages.json, filled in with the player's truck and map.
//
// Asking: the game asks first in its own words ("Allow / Not now") after a finished run, and only an Allow shows Android's
// own permission prompt, so a player who isn't interested never sees the system dialog. "Not now" is respected: one more
// ask at most, NOTIFY_ASK_AGAIN_DAYS later.
// Scheduling: whenever the game goes to the background, the old reminders are cancelled and up to NOTIFY_DAYS.length new
// ones are scheduled for those days, in the early evening, so a player who plays every day never gets one. Inexact alarms
// only (a reminder can be a few minutes late), so the app needs no exact-alarm permission.
import { NOTIFY_DAYS, NOTIFY_HOURS, NOTIFY_ASK_AGAIN_DAYS } from '../game-config.js';

const KEY = 'hh_notify', CHANNEL = 'reminders', BASE_ID = 7100;
const DAY = 864e5;

export function createNotifications({ data = {}, context = () => ({}), plugin = typeof window === 'undefined' ? null : window.Capacitor?.Plugins?.LocalNotifications, now = () => Date.now(), random = Math.random } = {}) {
  let state = { asks: 0, lastAsk: 0, answer: null };
  try { state = { ...state, ...JSON.parse(localStorage.getItem(KEY)) }; } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} };
  const messages = data.messages ?? [], clients = data.clients ?? ['the depot'];
  const pick = list => list[Math.floor(random() * list.length)];

  // one message, filled in; never the same one twice in a batch
  function compose(used) {
    const ctx = context(), pool = messages.filter((m, i) => !used.has(i) && (ctx.truck || !/\{truck\}/.test(m.title + m.body)));
    if (!pool.length) return null;
    const m = pick(pool); used.add(messages.indexOf(m));
    const fill = t => t.replace(/\{truck\}/g, ctx.truck ?? 'truck').replace(/\{map\}/g, ctx.map ?? 'the trail').replace(/\{client\}/g, pick(clients));
    return { title: fill(m.title), body: fill(m.body) };
  }
  // early evening, NOTIFY_HOURS, on the day `days` from now
  function at(days) {
    const d = new Date(now() + days * DAY), [lo, hi] = NOTIFY_HOURS;
    d.setHours(lo + Math.floor(random() * (hi - lo)), Math.floor(random() * 60), 0, 0);
    return d;
  }

  const api = {
    get available() { return !!plugin; },
    // at start-up: the phone's real permission wins over the saved answer (a reinstall, or a switch flipped in Android's
    // settings): granted counts as allowed, and an 'allowed' Android no longer grants is asked again
    async sync() {
      if (!plugin) return;
      try {
        const granted = (await plugin.checkPermissions()).display === 'granted';
        if (granted && state.answer !== 'allowed' && state.answer !== 'off') { state.answer = 'allowed'; save(); }
        else if (!granted && state.answer === 'allowed') { state = { asks: 0, lastAsk: 0, answer: null }; save(); }
      } catch (e) {}
    },
    get answer() { return state.answer; },
    // the settings switch: on once allowed, off when the player turned reminders off in the game
    get enabled() { return state.answer === 'allowed'; },
    async setEnabled(on) {
      if (!plugin) return false;
      if (!on) {
        state.answer = 'off'; save();
        try { const pending = (await plugin.getPending()).notifications ?? []; if (pending.length) await plugin.cancel({ notifications: pending.map(n => ({ id: n.id })) }); } catch (e) {}
        return false;
      }
      let granted = false;
      try { granted = (await plugin.checkPermissions()).display === 'granted' || (await plugin.requestPermissions()).display === 'granted'; } catch (e) {}
      state.answer = granted ? 'allowed' : 'denied'; save();
      if (granted) await api.schedule();
      return granted;
    },
    // should the game ask now? never off the phone, never once allowed or once refused twice
    shouldAsk() {
      if (!plugin || state.answer === 'allowed' || state.answer === 'off' || state.asks >= 2) return false;
      return state.asks === 0 || now() - state.lastAsk > NOTIFY_ASK_AGAIN_DAYS * DAY;
    },
    // the player's answer to the game's own question; an Allow shows Android's prompt
    async answered(allow) {
      state.asks++; state.lastAsk = now();
      if (!allow) { state.answer = 'later'; save(); return false; }
      let granted = false;
      try { granted = (await plugin.requestPermissions()).display === 'granted'; } catch (e) {}
      state.answer = granted ? 'allowed' : 'denied'; save();
      if (granted) await api.schedule();
      return granted;
    },
    // replace the pending reminders with fresh ones; nothing happens without permission
    async schedule() {
      if (!plugin || state.answer === 'off') return 0;
      try {
        if ((await plugin.checkPermissions()).display !== 'granted') return 0;
        const pending = (await plugin.getPending()).notifications ?? [];
        if (pending.length) await plugin.cancel({ notifications: pending.map(n => ({ id: n.id })) });
        await plugin.createChannel?.({ id: CHANNEL, name: 'Reminders', description: 'Now and then, a nudge back to the trail', importance: 3 }).catch(() => {});
        const used = new Set(), list = [];
        NOTIFY_DAYS.forEach((days, i) => { const m = compose(used); if (m) list.push({ id: BASE_ID + i, ...m, channelId: CHANNEL, smallIcon: 'ic_stat_notify', iconColor: '#F2C21A', schedule: { at: at(days), allowWhileIdle: false, isExactNotification: false } }); });
        if (list.length) await plugin.schedule({ notifications: list });
        return list.length;
      } catch (e) { console.warn('Reminders could not be scheduled:', e); return 0; }
    },
  };
  return api;
}
