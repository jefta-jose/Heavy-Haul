// The loading screens: a painted background and a progress bar, shown at launch, after tapping DRIVE
// and on the way back to the garage. The launch one is in the page itself, so it paints before any
// script runs and crawls on its own (CSS) until main.js reports real progress. Its art comes in
// through CSS variables that tools/build.js writes (assets/loaders/loaders.json).

const LABELS = { launch: 'Loading', drive: 'Heading out', garage: 'Back to the garage' };
const FADE_MS = 300;

export function createLoader() {
  const el = document.getElementById('loader'), label = document.getElementById('loaderLabel'), pct = document.getElementById('loaderPct');
  let p = 0, shownAt = performance.now(), token = 0;

  // decode the backgrounds for the taps to come, so they show at once
  const kept = [];
  for (const kind of ['drive', 'garage']) {
    const url = getComputedStyle(document.documentElement).getPropertyValue(`--loader-${kind}`).match(/url\("?(.*?)"?\)/)?.[1];
    if (url) { const img = new Image(); img.src = url; img.decode?.().catch(() => {}); kept.push(img); }
  }

  const write = () => { el.style.setProperty('--p', p.toFixed(3)); pct.textContent = `${Math.round(p * 100)}%`; };
  return {
    kept,
    get visible() { return !el.hidden; },
    // progress only moves forward; the first real value takes over from the launch crawl
    set(v) { el.classList.remove('crawl'); p = Math.max(p, Math.min(1, v)); write(); },
    show(kind) {
      token++; shownAt = performance.now(); p = 0;
      el.dataset.kind = kind; label.textContent = LABELS[kind] ?? LABELS.launch;
      el.classList.remove('crawl', 'out'); el.classList.add('snap'); el.hidden = false; write();
      void el.offsetWidth;   // the bar jumps to empty, with no transition
      el.classList.remove('snap');
    },
    // resolves once the screen is really on display, so heavy work can start behind it
    painted: () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))),
    // fills the bar and fades out, after the screen has been up long enough not to blink
    async hide(minMs = 900) {
      const mine = ++token;
      this.set(1);
      const wait = Math.max(350, minMs - (performance.now() - shownAt));
      await new Promise(r => setTimeout(r, wait));
      if (mine !== token) return;
      el.classList.add('out');
      await new Promise(r => setTimeout(r, FADE_MS));
      if (mine === token) el.hidden = true;
    },
  };
}
