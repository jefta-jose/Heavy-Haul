// The loading screens, shown at launch, after tapping DRIVE and on the way back to the garage, in the style of a big truck
// game: a full-screen photo of heavy trucks at work that drifts slowly and cross-fades to the next, the place's name at the top
// left, one fact about trucks at the bottom left, and a tire spinning at the bottom right. The tire is an inline SVG spun by CSS, so it is
// always perfectly round. The launch screen is in the page itself, so it paints before any script runs. Photos come in through
// CSS variables that tools/build.js writes, and the facts from assets/loaders/truck-facts.json. The screen stays up long enough to
// read; once loading is done a tap skips the rest.
import { LOADER_MIN_MS_LAUNCH, LOADER_MIN_MS_DRIVE, LOADER_MIN_MS_GARAGE, LOADER_SLIDE_MS } from '../game-config.js';

const LABELS = { launch: 'Loading', drive: 'Heading out', garage: 'Back to the garage' };
const MIN_MS = { launch: LOADER_MIN_MS_LAUNCH, drive: LOADER_MIN_MS_DRIVE, garage: LOADER_MIN_MS_GARAGE };
const FADE_MS = 300;

export function createLoader({ photos = [], facts = [] } = {}, { title = 'Heavy Haul', subtitle = '' } = {}) {
  const $ = id => document.getElementById(id), el = $('loader'), label = $('loaderLabel'), fact = $('loaderFact');
  const layers = [...el.querySelectorAll('.loader-slide')];
  let shownAt = performance.now(), token = 0, front = 0, kind = 'launch', timer = 0;
  const rootVar = k => getComputedStyle(document.documentElement).getPropertyValue(`--loader-${k}`).trim();
  const shots = photos.filter(k => rootVar(k));
  if (!shots.length && rootVar('fallback')) shots.push('fallback');   // no photos yet: the season's panorama stands in
  const shuffled = items => { const a = [...items]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  // two shuffled decks, refilled when empty, never repeating the last one shown
  const deck = items => { let left = [], last = null; return () => { if (!items.length) return null; if (!left.length) left = shuffled(items.length > 1 ? items.filter(i => i !== last) : items); return (last = left.pop()); }; };
  const nextShot = deck(shots), nextFact = deck(facts);

  // decode the photos for the moments to come, so they show at once
  const kept = [];
  for (const k of shots) {
    const url = rootVar(k).match(/url\("?(.*?)"?\)/)?.[1];
    if (url) { const img = new Image(); img.src = url; img.decode?.().catch(() => {}); kept.push(img); }
  }

  function place(head, sub) { $('loaderTitle').textContent = head; $('loaderSub').textContent = sub ?? ''; }
  function showFact() { fact.textContent = nextFact() ?? ''; fact.style.animation = 'none'; void fact.offsetWidth; fact.style.animation = ''; }
  function showShot() {
    const key = nextShot(); if (!key) return;
    front = 1 - front;
    const on = layers[front], off = layers[1 - front];
    on.style.backgroundImage = `var(--loader-${key})`;
    on.classList.toggle('alt', Math.random() < 0.5);
    on.classList.add('on'); off.classList.remove('on');
  }
  const advance = () => { showShot(); showFact(); };
  function play() { clearInterval(timer); timer = setInterval(advance, LOADER_SLIDE_MS); }

  // the launch screen is already up: it gets its words, and a photo of its own, as soon as there is a script
  place(title, subtitle);
  if (!el.hidden) { advance(); play(); }

  return {
    kept,
    get visible() { return !el.hidden; },
    // sub: a line under the place's name, such as the truck and the trail after DRIVE
    show(k, { sub = subtitle } = {}) {
      token++; shownAt = performance.now(); kind = k;
      el.dataset.kind = k; label.textContent = LABELS[k] ?? LABELS.launch;
      place(title, sub);
      el.classList.remove('done'); el.classList.add('out'); el.hidden = false;
      void el.offsetWidth;   // the screen fades in over what was showing
      el.classList.remove('out');
      layers.forEach(l => l.classList.remove('on'));
      advance(); play();
    },
    // resolves once the screen has faded in, so heavy work can start behind it
    painted: () => new Promise(r => setTimeout(() => requestAnimationFrame(() => requestAnimationFrame(r)), FADE_MS)),
    // waits until the fact has been up long enough (or a tap says enough), and fades out
    async hide(minMs = MIN_MS[kind] ?? LOADER_MIN_MS_LAUNCH) {
      const mine = ++token;
      el.classList.add('done');
      const wait = Math.max(350, minMs - (performance.now() - shownAt));
      label.textContent = 'Tap to continue';
      await new Promise(r => {
        const done = () => { clearTimeout(t); el.removeEventListener('pointerdown', done); r(); };
        const t = setTimeout(done, wait); el.addEventListener('pointerdown', done);
      });
      if (mine !== token) return;
      el.classList.add('out');
      await new Promise(r => setTimeout(r, FADE_MS));
      if (mine === token) { el.hidden = true; clearInterval(timer); }
    },
  };
}
