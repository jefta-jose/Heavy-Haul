// Dev server: rebuilds when src/ or assets/ change and reloads the open page.
//   npm run dev   then open http://localhost:5173 (on a phone, use your computer's LAN IP)
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { ROOT } from './lib/content.js';

const PORT = +process.env.PORT || 5173;
let version = Date.now(), building = Promise.resolve();

async function rebuild(why) {
  try {
    const { build } = await import(`./build.js?t=${Date.now()}`);
    const r = await build(); version = Date.now();
    console.log(`[${new Date().toLocaleTimeString()}] rebuilt (${r.mb} MB)${why ? ' - ' + why : ''}`);
  } catch (e) { console.error('Build failed:', e.message); }
}
building = rebuild();

// Runtime art is the WebP/JSON under assets; PNG masters and notes do not trigger rebuilds.
const relevant = f => !f || /\.(js|css|html|json|webp|svg)$/.test(f);
let timer = null;
for (const dir of ['src', 'assets']) {
  fs.watch(path.join(ROOT, dir), { recursive: true }, (_, file) => {
    if (!relevant(file)) return;
    clearTimeout(timer); timer = setTimeout(() => { building = building.then(() => rebuild(file)); }, 150);
  });
}

// the page polls /__version and reloads itself after a rebuild
const RELOAD = `<script>(()=>{let v=null;setInterval(async()=>{try{const n=await (await fetch('/__version')).text();if(v&&n!==v)location.reload();v=n;}catch(e){}},800)})();</script>`;

http.createServer((req, res) => {
  if (req.url === '/__version') { res.end(String(version)); return; }
  fs.readFile(path.join(ROOT, 'dist/heavy-haul.html'), 'utf8', (err, html) => {
    if (err) { res.writeHead(500); res.end('Build the game first: npm run build'); return; }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(html.replace('</body>', RELOAD + '</body>'));
  });
}).listen(PORT, '0.0.0.0', () => console.log(`Heavy Haul running at http://localhost:${PORT}`));
