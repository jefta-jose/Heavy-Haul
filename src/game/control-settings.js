import { bindModalFocus } from './modal-focus.js';
const KEY = 'hh_controls_v1';
export function createControlSettings({ onClose } = {}) {
  const $ = id => document.getElementById(id), root = document.documentElement;
  const defaults = { size: 'standard', layout: 'standard', dash: 'digital', coach: 'on' };
  const allowed = { size: ['standard', 'large'], layout: ['standard', 'left'], dash: ['digital', 'analog'], coach: ['on', 'off'] };
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY)) ?? {}; } catch {}
  const values = Object.fromEntries(Object.entries(defaults).map(([k, v]) => [k, allowed[k].includes(saved[k]) ? saved[k] : v]));
  function apply() {
    for (const k of Object.keys(values)) root.dataset[`control${k[0].toUpperCase()}${k.slice(1)}`] = values[k];
    try { localStorage.setItem(KEY, JSON.stringify(values)); } catch {}
  }
  for (const k of Object.keys(values)) {
    const input = $('control' + k[0].toUpperCase() + k.slice(1)); input.value = values[k];
    input.addEventListener('change', () => { if (allowed[k].includes(input.value)) values[k] = input.value; apply(); });
  }
  apply();
  let previous;
  function close() { $('controlsOv').hidden = true; onClose?.(); previous?.focus(); }
  $('controlsDone').addEventListener('click', close);
  bindModalFocus($('controlsOv'), close);
  return { open() { previous = document.activeElement; $('controlsOv').hidden = false; $('controlSize').focus(); }, get isOpen() { return !$('controlsOv').hidden; } };
}
