// The loading screens, shown at launch, after tapping DRIVE and on the way back to the garage: painted slides that pan and
// cross-fade, a fact under them, and a truck's wheel grinding along a mud rut as the progress bar. The launch one is in the page
// itself, so it paints before any script runs and crawls on its own (CSS) until main.js reports real progress. The art comes in
// through CSS variables that tools/build.js writes (assets/loaders/loaders.json). The screen stays up long enough for its
// fact to be read; once loading is done a tap skips the rest.
import { LOADER_MIN_MS, LOADER_SLIDE_MS } from '../game-config.js';

const LABELS = { launch: 'Loading', drive: 'Heading out', garage: 'Back to the garage' };
const FADE_MS = 300;
const FIRST = { launch: 'launch', drive: 'drive', garage: 'garage' }, SLIDES = ['winch', 'fuel', 'bog', 'drive', 'launch', 'garage'];

export function createLoader({ tips = [] } = {}) {
  const el = document.getElementById('loader'), label = document.getElementById('loaderLabel'), pct = document.getElementById('loaderPct');
  const fact = document.getElementById('loaderFact'), wheel = document.getElementById('loaderWheel'), layers = [...el.querySelectorAll('.loader-slide')];
  let p = 0, shownAt = performance.now(), token = 0, front = 0, current = 'launch', facts = [], timer = 0;
  const rootVar = k => getComputedStyle(document.documentElement).getPropertyValue(`--loader-${k}`);
  const slides = SLIDES.filter(k => rootVar(k));
  const shuffled = list => { const a = [...list]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // decode the slides for the moments to come, so they show at once
  const kept = [];
  for (const k of slides) {
    const url = rootVar(k).match(/url\("?(.*?)"?\)/)?.[1];
    if (url) { const img = new Image(); img.src = url; img.decode?.().catch(() => {}); kept.push(img); }
  }

  function showFact(next) {
    if (!next) return;
    const [head, text] = next;
    fact.innerHTML = ''; fact.append(Object.assign(document.createElement('small'), { textContent: head }), Object.assign(document.createElement('p'), { textContent: text }));
    fact.style.animation = 'none'; void fact.offsetWidth; fact.style.animation = '';
  }
  function showSlide(key) {
    current = key; front = 1 - front;
    const on = layers[front], off = layers[1 - front];
    on.style.backgroundImage = `var(--loader-${key})`;
    on.classList.toggle('alt', Math.random() < 0.5);
    on.classList.add('on'); off.classList.remove('on');
  }
  // on to the next slide and fact while the screen stays up, never the same slide twice running
  let queue = [], tipQueue = [];
  function advance() {
    if (!queue.length) queue = shuffled(slides.filter(k => k !== current));
    showSlide(queue.pop());
    if (!facts.length && !tipQueue.length) tipQueue = shuffled(tips.map(t => ['Haul note', t]));
    showFact(facts.shift() ?? tipQueue.pop());
  }
  function play() { clearInterval(timer); timer = setInterval(advance, LOADER_SLIDE_MS); }
  // the launch screen is already up: it gets its first tip as soon as there is a script to give it one
  if (!el.hidden) { tipQueue = shuffled(tips.map(t => ['Haul note', t])); showFact(tipQueue.pop()); play(); }

  const write = () => { el.style.setProperty('--p', p.toFixed(3)); pct.textContent = `${Math.round(p * 100)}%`; };
  return {
    kept,
    get visible() { return !el.hidden; },
    // progress only moves forward; the first real value takes over from the launch crawl
    set(v) { el.classList.remove('crawl'); p = Math.max(p, Math.min(1, v)); write(); },
    // facts: [[heading, text], ...] to show before the driving tips; wheel: the picture of the truck's own wheel
    show(kind, { facts: first = [], wheel: wheelUri } = {}) {
      token++; shownAt = performance.now(); p = 0;
      el.dataset.kind = kind; label.textContent = LABELS[kind] ?? LABELS.launch;
      wheel.style.backgroundImage = wheelUri ? `url("${wheelUri}")` : '';
      el.classList.remove('crawl', 'done'); el.classList.add('snap', 'out'); el.hidden = false; write();
      void el.offsetWidth;   // the bar jumps to empty with no transition, and the screen fades in over what was showing
      el.classList.remove('snap', 'out');
      facts = [...first]; queue = [];
      layers.forEach(l => l.classList.remove('on')); showSlide(FIRST[kind] ?? FIRST.launch);
      if (!facts.length && !tipQueue.length) tipQueue = shuffled(tips.map(t => ['Haul note', t]));
      showFact(facts.shift() ?? tipQueue.pop());
      play();
    },
    // resolves once the screen has faded in, so heavy work can start behind it
    painted: () => new Promise(r => setTimeout(() => requestAnimationFrame(() => requestAnimationFrame(r)), FADE_MS)),
    // fills the rut, waits until the fact has been up long enough (or a tap says enough), and fades out
    async hide(minMs = LOADER_MIN_MS) {
      const mine = ++token;
      this.set(1); el.classList.add('done');
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
