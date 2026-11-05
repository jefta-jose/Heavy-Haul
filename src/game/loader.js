// The loading screens, shown at launch, after tapping DRIVE and on the way back to the garage. A painted how-to-play slide
// pans slowly and cross-fades to the next, with its title and a short list of facts over the dark foot. At the bottom left
// the truck's own wheel spins on a mound of mud, throwing it back. There is no progress bar. The launch screen is in the
// page itself, so it paints before any script runs. The art comes in through CSS variables that tools/build.js writes, and
// the slides' titles and facts come from assets/loaders/loaders.json. The screen stays up long enough to read; once loading
// is done a tap skips the rest.
import { LOADER_MIN_MS_LAUNCH, LOADER_MIN_MS_DRIVE, LOADER_MIN_MS_GARAGE, LOADER_SLIDE_MS } from '../game-config.js';

const LABELS = { launch: 'Loading', drive: 'Heading out', garage: 'Back to the garage' };
const MIN_MS = { launch: LOADER_MIN_MS_LAUNCH, drive: LOADER_MIN_MS_DRIVE, garage: LOADER_MIN_MS_GARAGE };
const FADE_MS = 300;

export function createLoader({ first = {}, slides: text = {} } = {}) {
  const el = document.getElementById('loader'), label = document.getElementById('loaderLabel');
  const title = document.getElementById('loaderTitle'), list = document.getElementById('loaderFacts'), wheel = document.getElementById('loaderWheel');
  const layers = [...el.querySelectorAll('.loader-slide')];
  let shownAt = performance.now(), token = 0, front = 0, current = null, kind = 'launch', timer = 0, extra = null;
  const rootVar = k => getComputedStyle(document.documentElement).getPropertyValue(`--loader-${k}`);
  const slides = Object.keys(text).filter(k => rootVar(k));
  const shuffled = items => { const a = [...items]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // decode the slides for the moments to come, so they show at once
  const kept = [];
  for (const k of slides) {
    const url = rootVar(k).match(/url\("?(.*?)"?\)/)?.[1];
    if (url) { const img = new Image(); img.src = url; img.decode?.().catch(() => {}); kept.push(img); }
  }

  // a fact is a sentence, or [lead, sentence] for the run's own facts
  function showFacts(head, facts) {
    title.textContent = head ?? '';
    list.innerHTML = '';
    for (const f of facts ?? []) {
      const li = document.createElement('li');
      if (Array.isArray(f)) li.append(Object.assign(document.createElement('b'), { textContent: f[0] }), ` ${f[1]}`);
      else li.textContent = f;
      list.append(li);
    }
    const box = list.parentElement; box.style.animation = 'none'; void box.offsetWidth; box.style.animation = '';
  }
  function showSlide(key) {
    if (!key) return;
    current = key; front = 1 - front;
    const on = layers[front], off = layers[1 - front];
    on.style.backgroundImage = `var(--loader-${key})`;
    on.classList.toggle('alt', Math.random() < 0.5);
    on.classList.add('on'); off.classList.remove('on');
  }
  // a slide with its own facts; the run's facts go first after DRIVE, over that moment's slide
  function panel(key) {
    showSlide(key);
    if (extra) { showFacts(extra.title, extra.facts); extra = null; }
    else showFacts(text[key]?.title, text[key]?.facts);
  }
  // on to the next slide while the screen stays up, never the same one twice running
  let queue = [];
  function advance() {
    if (!queue.length) queue = shuffled(slides.filter(k => k !== current));
    panel(queue.pop());
  }
  function play() { clearInterval(timer); timer = setInterval(advance, LOADER_SLIDE_MS); }
  const start = k => { queue = []; layers.forEach(l => l.classList.remove('on')); panel(slides.includes(first[k]) ? first[k] : slides[0]); play(); };
  // the launch screen is already up with its first slide: it gets its facts as soon as there is a script to give them
  if (!el.hidden) { current = first.launch; showFacts(text[current]?.title, text[current]?.facts); play(); }

  return {
    kept,
    get visible() { return !el.hidden; },
    // kept for the callers' progress steps; the screen shows no bar
    set() {},
    // facts: [[lead, text], ...] about this run, shown first; wheel: the picture of the truck's own wheel
    show(k, { facts = [], wheel: wheelUri } = {}) {
      token++; shownAt = performance.now(); kind = k;
      el.dataset.kind = k; label.textContent = LABELS[k] ?? LABELS.launch;
      wheel.style.backgroundImage = wheelUri ? `url("${wheelUri}")` : '';
      el.classList.remove('done'); el.classList.add('out'); el.hidden = false;
      void el.offsetWidth;   // the screen fades in over what was showing
      el.classList.remove('out');
      extra = facts.length ? { title: 'Your run', facts } : null;
      start(k);
    },
    // resolves once the screen has faded in, so heavy work can start behind it
    painted: () => new Promise(r => setTimeout(() => requestAnimationFrame(() => requestAnimationFrame(r)), FADE_MS)),
    // waits until the facts have been up long enough (or a tap says enough), and fades out
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
