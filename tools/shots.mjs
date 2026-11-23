// Screenshots of the real game for review (a manual sweep, not a test): builds the app, serves it, owns every truck.
//   node tools/shots.mjs cars <id> <id> ...   each truck driving a few metres in, at phone size
//   node tools/shots.mjs pages                every garage page and the driving HUD at phone and desktop sizes
// Writes output/sweep/*.png and prints any page errors.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { chromium } from 'playwright';
import { buildApp } from './build.js';
import { ROOT } from './lib/content.js';

const OUT = path.join(ROOT, 'output/sweep'); fs.mkdirSync(OUT, { recursive: true });
const [mode = 'pages', ...ids] = process.argv.slice(2);
await buildApp();
const www = path.join(ROOT, 'www');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.mp3': 'audio/mpeg', '.webp': 'image/webp', '.png': 'image/png', '.json': 'application/json', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let file = path.join(www, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (file.endsWith(path.sep) || !path.extname(file)) file = path.join(file, 'index.html');
  fs.readFile(file, (e, body) => {
    if (e) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream' }); res.end(body);
  });
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/`;
const roster = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/cars/cars.json'), 'utf8')).cars.map(c => c.id);
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const errors = [];
async function open(viewport, touch = true) {
  const page = await browser.newPage({ viewport, hasTouch: touch, isMobile: touch && viewport.width < 1000 });
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(owned => { localStorage.setItem('hh_progress', JSON.stringify({ xp: 75000, owned })); localStorage.setItem('hh_wallet', '5000000'); }, roster);
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await page.goto(url); await page.waitForFunction(() => window.__haul && document.querySelector('#loader.done'), null, { timeout: 120000 });
  await dismissLoader(page);
  return page;
}
async function dismissLoader(page) { await page.locator('#loader').click({ timeout: 5000 }).catch(() => {}); await page.waitForFunction(() => !__haul.loader.visible, null, { timeout: 30000 }).catch(() => {}); await page.waitForTimeout(300); }
const shot = (page, name) => page.screenshot({ path: path.join(OUT, `${name}.png`) });
try {
  if (mode === 'drive') {
    // one truck driven along the trail: a frame every `every` seconds
    const [id, secs = '40', every = '2'] = ids, page = await open({ width: 844, height: 390 });
    await page.evaluate(id => { __haul.garage.select(id); __haul.startRun(__haul.garage.selection); }, id);
    await page.waitForFunction(() => __haul.renderer.ready && Object.values(__haul.renderer.assetStatus()).every(Boolean), null, { timeout: 60000 });
    await dismissLoader(page);
    await page.evaluate(() => { const s = __haul.sim; s.respawn(30); for (let i = 0; i < 360; i++) s.step(1 / 120); Object.assign(s.ctl, { gear: 'L', awd: true, diff: true, gas: 1 }); });
    for (let t = 0; t < +secs; t += +every) {
      await page.evaluate(n => { const s = __haul.sim; s.ctl.gas = 1; for (let i = 0; i < n; i++) { s.step(1 / 120); if (i % 2) __haul.renderer.draw(1 / 60, true); } }, Math.round(+every * 120));
      await shot(page, `drive-${id}-${String(t).padStart(3, '0')}`);
    }
  } else if (mode === 'cars') {
    const page = await open({ width: 844, height: 390 });
    for (const id of ids) {
      await page.evaluate(id => { __haul.garage.select(id); __haul.startRun(__haul.garage.selection); }, id);
      await page.waitForFunction(() => __haul.renderer.ready && Object.values(__haul.renderer.assetStatus()).every(Boolean), null, { timeout: 60000 });
      await dismissLoader(page);
      await page.evaluate(() => { const s = __haul.sim; s.respawn(40); for (let i = 0; i < 240; i++) s.step(1 / 120); __haul.snap(); for (let f = 0; f < 6; f++) __haul.renderer.draw(1 / 60, true); });
      await page.waitForTimeout(150); await shot(page, `car-${id}`);
    }
  } else {
    for (const [tag, vp] of [['phone', { width: 844, height: 390 }], ['small', { width: 667, height: 320 }], ['portrait', { width: 390, height: 844 }], ['desktop', { width: 1440, height: 810 }]]) {
      const page = await open(vp, tag !== 'desktop');
      await page.waitForTimeout(600); await shot(page, `${tag}-garage`);
      for (const btn of await page.$$eval('.hc-bar button, .hc-bar [role=button]', els => els.map(e => e.id).filter(Boolean))) {
        await page.click(`#${btn}`).catch(() => {}); await page.waitForTimeout(500); await shot(page, `${tag}-garage-${btn}`);
        await page.keyboard.press('Escape').catch(() => {}); await page.evaluate(() => document.querySelectorAll('.sheet .close, [data-close], .x-close').forEach(b => b.click())); await page.waitForTimeout(250);
      }
      await page.goto(url); await page.waitForFunction(() => document.querySelector('#loader.done')); await dismissLoader(page);
      await page.click('#startBtn').catch(() => {}); await page.waitForFunction(() => __haul.session.state === 'play', null, { timeout: 60000 }).catch(() => {});
      await page.waitForTimeout(2500); await shot(page, `${tag}-drive`);
      await page.close();
    }
  }
} finally { await browser.close(); server.close(); }
console.log(errors.length ? `page errors:\n${[...new Set(errors)].join('\n')}` : 'no page errors');
