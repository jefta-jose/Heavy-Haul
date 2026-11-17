export function bindModalFocus(overlay, close) {
  document.addEventListener('keydown', event => {
    if (overlay.hidden || !overlay.getClientRects().length) return;
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); return; }
    if (event.key !== 'Tab') return;
    const items = [...overlay.querySelectorAll('button:not(:disabled), input, select, [tabindex="0"]')].filter(el => el.getClientRects().length);
    if (!items.length) return;
    const first = items[0], last = items.at(-1);
    if (!overlay.contains(document.activeElement) || event.shiftKey && document.activeElement === first || !event.shiftKey && document.activeElement === last) {
      event.preventDefault(); (event.shiftKey ? last : first).focus();
    }
  });
}
